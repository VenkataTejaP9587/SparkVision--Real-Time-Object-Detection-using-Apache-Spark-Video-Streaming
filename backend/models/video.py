"""
Video model — schema helpers for uploaded video documents.
"""
from datetime import datetime


def create_video(user_id: str, filename: str, original_name: str,
                 file_path: str, file_size: int, duration: float = 0) -> dict:
    """Build a video metadata document."""
    return {
        "user_id": user_id,
        "filename": filename,
        "original_name": original_name,
        "file_path": file_path,
        "file_size": file_size,
        "duration": duration,
        "status": "uploaded",    # uploaded | processing | done | error
        "total_frames": 0,
        "processed_frames": 0,
        "total_detections": 0,
        "fps": 0,
        "resolution": "",
        "spark_job_id": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }


def serialize_video(video: dict) -> dict:
    """Return JSON-serializable video dict."""
    return {
        "id": str(video["_id"]),
        "user_id": str(video.get("user_id", "")),
        "filename": video.get("filename", ""),
        "original_name": video.get("original_name", ""),
        "file_size": video.get("file_size", 0),
        "duration": video.get("duration", 0),
        "status": video.get("status", "uploaded"),
        "total_frames": video.get("total_frames", 0),
        "processed_frames": video.get("processed_frames", 0),
        "total_detections": video.get("total_detections", 0),
        "fps": video.get("fps", 0),
        "resolution": video.get("resolution", ""),
        "spark_job_id": video.get("spark_job_id", ""),
        "created_at": video.get("created_at", datetime.utcnow()).isoformat(),
        "updated_at": video.get("updated_at", datetime.utcnow()).isoformat(),
    }
