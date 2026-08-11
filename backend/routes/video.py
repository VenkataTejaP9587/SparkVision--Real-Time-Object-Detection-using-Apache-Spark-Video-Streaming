"""
Video routes — Upload, list, delete, and stream video metadata.
"""
import os
import uuid
from flask import Blueprint, request, jsonify, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from werkzeug.utils import secure_filename
from bson import ObjectId
from datetime import datetime

from database.connection import get_collection
from models.video import create_video, serialize_video

video_bp = Blueprint("video", __name__)

ALLOWED_EXTENSIONS = {"mp4", "avi", "mov", "mkv", "webm", "flv"}


def allowed_file(filename):
    return "." in filename and filename.rsplit(".", 1)[1].lower() in ALLOWED_EXTENSIONS


@video_bp.route("/upload", methods=["POST"])
@jwt_required()
def upload_video():
    """POST /api/videos/upload — upload a video for object detection."""
    user_id = get_jwt_identity()

    if "video" not in request.files:
        return jsonify({"error": "No video file provided"}), 400

    file = request.files["video"]
    if file.filename == "" or not allowed_file(file.filename):
        return jsonify({"error": "Invalid file type. Allowed: mp4, avi, mov, mkv, webm, flv"}), 400

    # Generate unique filename
    ext = secure_filename(file.filename).rsplit(".", 1)[1].lower()
    unique_name = f"{uuid.uuid4().hex}.{ext}"
    upload_folder = current_app.config["UPLOAD_FOLDER"]
    file_path = os.path.join(upload_folder, unique_name)
    file.save(file_path)

    file_size = os.path.getsize(file_path)
    videos = get_collection("videos")

    video_doc = create_video(
        user_id=user_id,
        filename=unique_name,
        original_name=secure_filename(file.filename),
        file_path=file_path,
        file_size=file_size,
    )
    result = videos.insert_one(video_doc)
    video_doc["_id"] = result.inserted_id

    # Update user stats
    get_collection("users").update_one(
        {"_id": ObjectId(user_id)},
        {"$inc": {"stats.total_videos": 1}}
    )

    return jsonify({
        "message": "Video uploaded successfully",
        "video": serialize_video(video_doc),
    }), 201


@video_bp.route("/", methods=["GET"])
@jwt_required()
def list_videos():
    """GET /api/videos/ — list all videos for current user."""
    user_id = get_jwt_identity()
    page = int(request.args.get("page", 1))
    per_page = int(request.args.get("per_page", 10))
    skip = (page - 1) * per_page

    videos_col = get_collection("videos")
    cursor = videos_col.find({"user_id": user_id}).sort("created_at", -1).skip(skip).limit(per_page)
    total = videos_col.count_documents({"user_id": user_id})
    videos = [serialize_video(v) for v in cursor]

    return jsonify({"videos": videos, "total": total, "page": page, "per_page": per_page}), 200


@video_bp.route("/<video_id>", methods=["GET"])
@jwt_required()
def get_video(video_id):
    """GET /api/videos/<id> — get a single video's metadata."""
    user_id = get_jwt_identity()
    video = get_collection("videos").find_one({
        "_id": ObjectId(video_id), "user_id": user_id
    })
    if not video:
        return jsonify({"error": "Video not found"}), 404
    return jsonify({"video": serialize_video(video)}), 200


@video_bp.route("/<video_id>", methods=["DELETE"])
@jwt_required()
def delete_video(video_id):
    """DELETE /api/videos/<id> — delete a video and its detection records."""
    user_id = get_jwt_identity()
    video = get_collection("videos").find_one({
        "_id": ObjectId(video_id), "user_id": user_id
    })
    if not video:
        return jsonify({"error": "Video not found"}), 404

    # Remove the file from disk
    try:
        if os.path.exists(video["file_path"]):
            os.remove(video["file_path"])
    except OSError:
        pass

    get_collection("videos").delete_one({"_id": ObjectId(video_id)})
    get_collection("detections").delete_many({"video_id": video_id})

    return jsonify({"message": "Video deleted"}), 200
