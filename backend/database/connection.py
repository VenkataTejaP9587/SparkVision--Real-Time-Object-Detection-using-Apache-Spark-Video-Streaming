"""
MongoDB Atlas connection via PyMongo.
Uses a module-level singleton so the connection is reused across requests.
"""
from datetime import datetime
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
import logging

logger = logging.getLogger(__name__)

_client: MongoClient = None
_db = None


class InMemoryCollection:
    """Mock MongoDB collection for offline / fallback mode."""
    def __init__(self, name):
        self.name = name
        self._data = []

    def create_index(self, *args, **kwargs):
        pass

    def insert_one(self, doc):
        doc = dict(doc)
        if "_id" not in doc:
            from bson import ObjectId
            doc["_id"] = ObjectId()
        self._data.append(doc)
        class Res:
            inserted_id = doc["_id"]
        return Res()

    def insert_many(self, docs):
        res_ids = []
        for d in docs:
            r = self.insert_one(d)
            res_ids.append(r.inserted_id)
        class Res:
            inserted_ids = res_ids
        return Res()

    def _matches(self, doc, filter):
        if not filter:
            return True
        for k, v in filter.items():
            if k == "_id":
                if str(doc.get("_id")) != str(v):
                    return False
            elif isinstance(v, dict):
                d_val = doc.get(k)
                if d_val is None:
                    return False
                if "$gte" in v:
                    target = v["$gte"]
                    if isinstance(target, datetime) and isinstance(d_val, str):
                        try:
                            d_val = datetime.fromisoformat(d_val.replace("Z", "+00:00"))
                        except Exception:
                            pass
                    if isinstance(target, datetime) and hasattr(d_val, "tzinfo") and d_val.tzinfo:
                        d_val = d_val.replace(tzinfo=None)
                    if d_val < target:
                        return False
                if "$lte" in v:
                    target = v["$lte"]
                    if isinstance(target, datetime) and isinstance(d_val, str):
                        try:
                            d_val = datetime.fromisoformat(d_val.replace("Z", "+00:00"))
                        except Exception:
                            pass
                    if isinstance(target, datetime) and hasattr(d_val, "tzinfo") and d_val.tzinfo:
                        d_val = d_val.replace(tzinfo=None)
                    if d_val > target:
                        return False
            elif str(doc.get(k)) != str(v) and doc.get(k) != v:
                return False
        return True

    def find_one(self, filter=None, *args, **kwargs):
        for doc in self._data:
            if self._matches(doc, filter):
                return doc
        return None

    def find(self, filter=None, *args, **kwargs):
        matching = [doc for doc in self._data if self._matches(doc, filter)]
        class Cursor:
            def __init__(self, items):
                self.items = items
            def sort(self, *a, **kw):
                return self
            def skip(self, *a, **kw):
                return self
            def limit(self, *a, **kw):
                return self
            def __iter__(self):
                return iter(self.items)
            def __len__(self):
                return len(self.items)
        return Cursor(matching)

    def count_documents(self, filter=None):
        return len([doc for doc in self._data if self._matches(doc, filter)])

    def aggregate(self, pipeline):
        docs = [dict(d) for d in self._data]
        for stage in pipeline:
            if "$match" in stage:
                match_spec = stage["$match"]
                filtered = []
                for d in docs:
                    match = True
                    for k, v in match_spec.items():
                        if k == "created_at" and isinstance(v, dict) and "$gte" in v:
                            d_val = d.get(k)
                            if not d_val or d_val < v["$gte"]:
                                match = False
                                break
                        elif not self._matches(d, {k: v}):
                            match = False
                            break
                    if match:
                        filtered.append(d)
                docs = filtered

            elif "$group" in stage:
                group_spec = stage["$group"]
                group_id_expr = group_spec.get("_id")
                groups = {}

                for d in docs:
                    if group_id_expr is None:
                        gid = None
                    elif isinstance(group_id_expr, str) and group_id_expr.startswith("$"):
                        gid = d.get(group_id_expr[1:])
                    elif isinstance(group_id_expr, dict):
                        gid_dict = {}
                        for gk, gv in group_id_expr.items():
                            if isinstance(gv, dict) and "$hour" in gv:
                                f = gv["$hour"][1:]
                                dt = d.get(f)
                                gid_dict[gk] = dt.hour if hasattr(dt, 'hour') else 0
                            elif isinstance(gv, dict) and "$dayOfMonth" in gv:
                                f = gv["$dayOfMonth"][1:]
                                dt = d.get(f)
                                gid_dict[gk] = dt.day if hasattr(dt, 'day') else 0
                            else:
                                gid_dict[gk] = None
                        gid = tuple(sorted(gid_dict.items()))
                    else:
                        gid = str(group_id_expr)

                    if gid not in groups:
                        groups[gid] = []
                    groups[gid].append(d)

                out_docs = []
                for gid, group_docs in groups.items():
                    res_doc = {}
                    if isinstance(gid, tuple):
                        res_doc["_id"] = dict(gid)
                    else:
                        res_doc["_id"] = gid

                    for k, expr in group_spec.items():
                        if k == "_id":
                            continue
                        if isinstance(expr, dict):
                            if "$sum" in expr:
                                s_val = expr["$sum"]
                                if isinstance(s_val, (int, float)):
                                    res_doc[k] = len(group_docs) * s_val
                                elif isinstance(s_val, str) and s_val.startswith("$"):
                                    field = s_val[1:]
                                    res_doc[k] = sum(d.get(field, 0) for d in group_docs)
                            elif "$avg" in expr:
                                s_val = expr["$avg"]
                                if isinstance(s_val, str) and s_val.startswith("$"):
                                    field = s_val[1:]
                                    vals = [d.get(field) for d in group_docs if d.get(field) is not None]
                                    res_doc[k] = sum(vals) / len(vals) if vals else 0
                    out_docs.append(res_doc)
                docs = out_docs

            elif "$bucket" in stage:
                spec = stage["$bucket"]
                group_by = spec["groupBy"][1:] if spec["groupBy"].startswith("$") else spec["groupBy"]
                boundaries = spec["boundaries"]
                buckets = {i: [] for i in range(len(boundaries) - 1)}

                for d in docs:
                    val = d.get(group_by, 0)
                    for i in range(len(boundaries) - 1):
                        if boundaries[i] <= val < boundaries[i + 1]:
                            buckets[i].append(d)
                            break

                out_docs = []
                for i, b_docs in buckets.items():
                    out_docs.append({
                        "_id": boundaries[i],
                        "count": len(b_docs)
                    })
                docs = out_docs

            elif "$sort" in stage:
                sort_spec = stage["$sort"]
                for k, order in reversed(list(sort_spec.items())):
                    reverse = (order == -1)
                    docs.sort(key=lambda d: (d.get(k) is None, d.get(k)), reverse=reverse)

            elif "$limit" in stage:
                limit = stage["$limit"]
                docs = docs[:limit]

        return docs

    def update_one(self, filter, update, *args, **kwargs):
        doc = self.find_one(filter)
        if doc:
            if "$set" in update:
                for k, v in update["$set"].items():
                    doc[k] = v
            if "$inc" in update:
                for k, v in update["$inc"].items():
                    if "." in k:
                        parts = k.split(".")
                        curr = doc
                        for p in parts[:-1]:
                            curr = curr.setdefault(p, {})
                        curr[parts[-1]] = curr.get(parts[-1], 0) + v
                    else:
                        doc[k] = doc.get(k, 0) + v

    def delete_one(self, filter):
        doc = self.find_one(filter)
        if doc:
            self._data.remove(doc)
            class Res:
                deleted_count = 1
            return Res()
        class Res:
            deleted_count = 0
        return Res()

    def delete_many(self, filter):
        to_remove = [doc for doc in self._data if self._matches(doc, filter)]
        for d in to_remove:
            self._data.remove(d)
        class Res:
            deleted_count = len(to_remove)
        return Res()


class InMemoryDB:
    def __init__(self):
        self._collections = {}

    def __getitem__(self, name):
        if name not in self._collections:
            self._collections[name] = InMemoryCollection(name)
        return self._collections[name]


def init_db(app):
    """Initialize MongoDB connection using app config, with fallback."""
    global _client, _db
    try:
        uri = app.config["MONGO_URI"]
        if "placeholder" in uri:
            logger.warning("⚠️ Using in-memory database fallback (placeholder MONGO_URI set in .env)")
            _db = InMemoryDB()
            return

        _client = MongoClient(
            uri,
            serverSelectionTimeoutMS=3000,
            connectTimeoutMS=5000,
        )
        _client.admin.command("ping")
        _db = _client[app.config["DB_NAME"]]
        _db.users.create_index("email", unique=True)
        _db.detections.create_index([("user_id", 1), ("timestamp", -1)])
        _db.detections.create_index("video_id")
        _db.videos.create_index([("user_id", 1), ("created_at", -1)])

        logger.info("✅ MongoDB Atlas connected successfully")
    except Exception as e:
        logger.error(f"⚠️ MongoDB connection fallback active: {e}")
        _db = InMemoryDB()


def get_db():
    """Return the active database instance."""
    global _db
    if _db is None:
        _db = InMemoryDB()
    return _db


def get_collection(name: str):
    """Shorthand to get a named collection."""
    return get_db()[name]
