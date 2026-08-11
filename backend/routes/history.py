"""
History routes — paginated detection history with search, filter, delete, and CSV export.
"""
from flask import Blueprint, request, jsonify, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
import io
import csv

from database.connection import get_collection
from models.detection import serialize_detection

history_bp = Blueprint("history", __name__)


@history_bp.route("/", methods=["GET"])
@jwt_required()
def get_history():
    """GET /api/history/ — paginated detection history with optional filters."""
    user_id = get_jwt_identity()
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 20))
    search = request.args.get("search", "")
    object_class = request.args.get("object_class", "")
    video_id = request.args.get("video_id", "")
    skip = (page - 1) * per_page

    query = {"user_id": user_id}
    if search:
        query["object_class"] = {"$regex": search, "$options": "i"}
    if object_class:
        query["object_class"] = object_class
    if video_id:
        query["video_id"] = video_id

    col = get_collection("detections")
    cursor = col.find(query).sort("created_at", -1).skip(skip).limit(per_page)
    total = col.count_documents(query)
    records = [serialize_detection(d) for d in cursor]

    return jsonify({
        "records": records,
        "total": total,
        "page": page,
        "per_page": per_page,
        "pages": (total + per_page - 1) // per_page,
    }), 200


@history_bp.route("/<detection_id>", methods=["DELETE"])
@jwt_required()
def delete_detection(detection_id):
    """DELETE /api/history/<id> — remove a single detection record."""
    user_id = get_jwt_identity()
    result = get_collection("detections").delete_one({
        "_id": ObjectId(detection_id), "user_id": user_id
    })
    if result.deleted_count == 0:
        return jsonify({"error": "Record not found"}), 404
    return jsonify({"message": "Record deleted"}), 200


@history_bp.route("/export/csv", methods=["GET"])
@jwt_required()
def export_csv():
    """GET /api/history/export/csv — stream a CSV of all detection records."""
    user_id = get_jwt_identity()
    col = get_collection("detections")
    records = list(col.find({"user_id": user_id}).sort("created_at", -1))

    output = io.StringIO()
    fieldnames = ["id", "video_id", "frame_number", "timestamp", "object_class",
                  "confidence", "bbox", "fps", "processing_time_ms",
                  "spark_batch_id", "source", "created_at"]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()
    for r in records:
        row = serialize_detection(r)
        writer.writerow({k: row.get(k, "") for k in fieldnames})

    output.seek(0)
    return send_file(
        io.BytesIO(output.getvalue().encode()),
        mimetype="text/csv",
        as_attachment=True,
        download_name="detections.csv",
    )
