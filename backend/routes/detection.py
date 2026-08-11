"""
Detection routes — start/stop object detection on uploaded videos.
Detection is done in a background thread; progress is emitted via Socket.IO.
"""
import threading
from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId

from database.connection import get_collection
from models.video import serialize_video
from services.detection_service import DetectionService

detection_bp = Blueprint("detection", __name__)

# Global active detection jobs {video_id: thread}
_active_jobs: dict = {}


@detection_bp.route("/start/<video_id>", methods=["POST"])
@jwt_required()
def start_detection(video_id):
    """POST /api/detection/start/<video_id> — begin YOLOv8 detection on a video."""
    user_id = get_jwt_identity()
    video = get_collection("videos").find_one({
        "_id": ObjectId(video_id), "user_id": user_id
    })
    if not video:
        return jsonify({"error": "Video not found"}), 404
    if video["status"] == "processing":
        return jsonify({"error": "Detection already running"}), 409

    # Mark as processing
    get_collection("videos").update_one(
        {"_id": ObjectId(video_id)},
        {"$set": {"status": "processing"}}
    )

    # Spin up background detection thread
    from flask import current_app
    sio = current_app.extensions.get("socketio")
    service = DetectionService(video_id=video_id, user_id=user_id,
                               file_path=video["file_path"], socketio=sio)
    thread = threading.Thread(target=service.run, daemon=True)
    _active_jobs[video_id] = thread
    thread.start()

    return jsonify({"message": "Detection started", "video_id": video_id}), 200


@detection_bp.route("/stop/<video_id>", methods=["POST"])
@jwt_required()
def stop_detection(video_id):
    """POST /api/detection/stop/<video_id> — stop an active detection job."""
    if video_id in _active_jobs:
        # Signal stop (DetectionService checks a stop event)
        DetectionService.stop(video_id)
        _active_jobs.pop(video_id, None)

    get_collection("videos").update_one(
        {"_id": ObjectId(video_id)},
        {"$set": {"status": "stopped"}}
    )
    return jsonify({"message": "Detection stopped"}), 200


@detection_bp.route("/status/<video_id>", methods=["GET"])
@jwt_required()
def detection_status(video_id):
    """GET /api/detection/status/<video_id> — poll detection progress."""
    user_id = get_jwt_identity()
    video = get_collection("videos").find_one({
        "_id": ObjectId(video_id), "user_id": user_id
    })
    if not video:
        return jsonify({"error": "Video not found"}), 404
    return jsonify({"status": serialize_video(video)}), 200
