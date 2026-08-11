"""
Analytics routes — real-time dashboard cards and Spark aggregation results.
"""
from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity
from datetime import datetime, timedelta
from bson import ObjectId

from database.connection import get_collection
from spark.analytics import SparkAnalytics

analytics_bp = Blueprint("analytics", __name__)
_spark_analytics = SparkAnalytics()


def _seed_demo_detections_if_empty(user_id: str):
    """Auto-seed sample detection records for a user if their dataset is empty."""
    detections_col = get_collection("detections")
    videos_col = get_collection("videos")
    if detections_col.count_documents({"user_id": user_id}) == 0:
        video_id = "demo_vid_01"
        if videos_col.count_documents({"user_id": user_id}) == 0:
            from models.video import create_video
            demo_vid = create_video(
                user_id=user_id,
                filename="surveillance_demo.mp4",
                original_name="surveillance_demo.mp4",
                file_path="uploads/demo.mp4",
                file_size=12400000,
                duration=45.0,
            )
            v_res = videos_col.insert_one(demo_vid)
            video_id = str(v_res.inserted_id)

        from models.detection import create_detection
        now = datetime.utcnow()
        demo_data = [
            ("person",  0.88, [120, 80, 210, 240], 28.5, 32.0, now - timedelta(minutes=45)),
            ("person",  0.94, [130, 82, 215, 242], 29.0, 31.0, now - timedelta(minutes=30)),
            ("person",  0.91, [140, 85, 220, 245], 28.2, 33.5, now - timedelta(minutes=15)),
            ("person",  0.95, [150, 90, 225, 248], 30.0, 25.0, now - timedelta(minutes=5)),
            ("car",     0.84, [300, 200, 520, 380], 28.5, 34.0, now - timedelta(hours=2)),
            ("car",     0.79, [310, 205, 525, 385], 27.8, 35.2, now - timedelta(hours=1)),
            ("car",     0.86, [315, 210, 530, 390], 28.4, 33.0, now - timedelta(minutes=10)),
            ("truck",   0.72, [400, 150, 680, 420], 26.5, 41.0, now - timedelta(hours=3)),
            ("bicycle", 0.68, [80,  180, 160, 260], 29.1, 28.0, now - timedelta(hours=4)),
            ("dog",     0.62, [220, 310, 280, 390], 29.5, 26.5, now - timedelta(hours=5)),
        ]
        docs = []
        for idx, (cls, conf, bbox, fps, proc_ms, dt) in enumerate(demo_data, 1):
            d = create_detection(user_id, video_id, idx, idx * 2.5, cls, conf, bbox, fps, proc_ms, "batch_demo", "video")
            d["created_at"] = dt
            docs.append(d)
        detections_col.insert_many(docs)


@analytics_bp.route("/dashboard", methods=["GET"])
@jwt_required()
def dashboard_stats():
    """GET /api/analytics/dashboard — return all dashboard card values."""
    user_id = get_jwt_identity()
    _seed_demo_detections_if_empty(user_id)
    detections_col = get_collection("detections")
    videos_col = get_collection("videos")

    # Today's range
    today_start = datetime.utcnow().replace(hour=0, minute=0, second=0, microsecond=0)

    total_videos = videos_col.count_documents({"user_id": user_id})
    total_detections = detections_col.count_documents({"user_id": user_id})
    today_detections = detections_col.count_documents({
        "user_id": user_id,
        "created_at": {"$gte": today_start}
    })

    # Most detected object
    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$object_class", "count": {"$sum": 1}}},
        {"$sort": {"count": -1}},
        {"$limit": 1},
    ]
    most_detected = list(detections_col.aggregate(pipeline))
    most_detected_obj = most_detected[0]["_id"] if most_detected else "N/A"

    # Average confidence calculation
    conf_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "avg_conf": {"$avg": "$confidence"}}},
    ]
    conf_result = list(detections_col.aggregate(conf_pipeline))
    raw_conf = conf_result[0]["avg_conf"] if conf_result else 0
    # Normalize confidence to percentage (0 - 100%)
    avg_confidence = raw_conf * 100 if raw_conf <= 1.0 else raw_conf

    # Average FPS
    fps_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "avg_fps": {"$avg": "$fps"}}},
    ]
    fps_result = list(detections_col.aggregate(fps_pipeline))
    avg_fps = fps_result[0]["avg_fps"] if fps_result else 0

    # Average processing latency
    lat_pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": None, "avg_lat": {"$avg": "$processing_time_ms"}}},
    ]
    lat_result = list(detections_col.aggregate(lat_pipeline))
    avg_latency = lat_result[0]["avg_lat"] if lat_result else 0

    return jsonify({
        "total_videos": total_videos,
        "total_detections": total_detections,
        "today_detections": today_detections,
        "most_detected_object": most_detected_obj,
        "avg_confidence": round(avg_confidence, 1),
        "avg_fps": round(avg_fps, 1),
        "spark_status": _spark_analytics.status(),
        "avg_latency_ms": round(avg_latency, 1),
    }), 200


@analytics_bp.route("/top-objects", methods=["GET"])
@jwt_required()
def top_objects():
    """GET /api/analytics/top-objects — top N detected object classes."""
    user_id = get_jwt_identity()
    _seed_demo_detections_if_empty(user_id)
    limit = int(request.args.get("limit", 10))
    detections_col = get_collection("detections")

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$group": {"_id": "$object_class", "count": {"$sum": 1},
                    "avg_confidence": {"$avg": "$confidence"}}},
        {"$sort": {"count": -1}},
        {"$limit": limit},
    ]
    results = list(detections_col.aggregate(pipeline))
    out_data = []
    for r in results:
        raw_c = r.get("avg_confidence", 0)
        c_pct = raw_c * 100 if raw_c <= 1.0 else raw_c
        out_data.append({
            "object": r.get("_id", "Unknown"),
            "count": r.get("count", 0),
            "avg_confidence": round(c_pct, 1)
        })
    return jsonify({"data": out_data}), 200


@analytics_bp.route("/timeline", methods=["GET"])
@jwt_required()
def detection_timeline():
    """GET /api/analytics/timeline — hourly detection counts for the last 24h."""
    user_id = get_jwt_identity()
    now = datetime.utcnow()
    since = now - timedelta(hours=24)
    detections_col = get_collection("detections")

    pipeline = [
        {"$match": {"user_id": user_id, "created_at": {"$gte": since}}},
        {"$group": {
            "_id": {
                "hour": {"$hour": "$created_at"},
                "day": {"$dayOfMonth": "$created_at"},
            },
            "count": {"$sum": 1},
        }},
        {"$sort": {"_id.day": 1, "_id.hour": 1}},
    ]
    results = list(detections_col.aggregate(pipeline))
    
    counts_by_key = {}
    for r in results:
        if isinstance(r.get("_id"), dict):
            k = (r["_id"].get("day"), r["_id"].get("hour"))
            counts_by_key[k] = r.get("count", 0)

    # Build full 24h timeline
    data = []
    for i in range(24):
        dt = now - timedelta(hours=23 - i)
        k = (dt.day, dt.hour)
        cnt = counts_by_key.get(k, 0)
        data.append({"hour": dt.strftime("%H:00"), "count": cnt})

    return jsonify({"data": data}), 200


@analytics_bp.route("/confidence-distribution", methods=["GET"])
@jwt_required()
def confidence_distribution():
    """GET /api/analytics/confidence-distribution — bucket confidences into ranges."""
    user_id = get_jwt_identity()
    detections_col = get_collection("detections")

    pipeline = [
        {"$match": {"user_id": user_id}},
        {"$bucket": {
            "groupBy": "$confidence",
            "boundaries": [0, 0.5, 0.6, 0.7, 0.8, 0.9, 1.01],
            "default": "Other",
            "output": {"count": {"$sum": 1}},
        }},
    ]
    try:
        results = list(detections_col.aggregate(pipeline))
    except Exception:
        results = []

    bucket_map = {r["_id"]: r["count"] for r in results if "_id" in r}
    boundaries = [0, 0.5, 0.6, 0.7, 0.8, 0.9]
    labels = ["0-50%", "50-60%", "60-70%", "70-80%", "80-90%", "90-100%"]
    data = []
    for i, label in enumerate(labels):
        b_key = boundaries[i]
        cnt = bucket_map.get(b_key, 0)
        data.append({"range": label, "count": cnt})

    return jsonify({"data": data}), 200


@analytics_bp.route("/spark-results", methods=["GET"])
@jwt_required()
def spark_results():
    """GET /api/analytics/spark-results — aggregated Spark streaming results."""
    user_id = get_jwt_identity()
    data = _spark_analytics.get_results(user_id)
    return jsonify({"data": data}), 200
