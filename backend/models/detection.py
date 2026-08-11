"""
Detection model — schema helpers for individual frame detection events.
Each document represents one detection in one frame of a video or webcam stream.
"""
from datetime import datetime


def create_detection(
    user_id: str,
    video_id: str,
    frame_number: int,
    timestamp: float,
    object_class: str,
    confidence: float,
    bbox: list,
    fps: float,
    processing_time_ms: float,
    spark_batch_id: str = "",
    source: str = "video",  # "video" | "webcam"
) -> dict:
    """Build a detection event document."""
    return {
        "user_id": user_id,
        "video_id": video_id,
        "frame_number": frame_number,
        "timestamp": timestamp,
        "object_class": object_class,
        "confidence": round(confidence, 4),
        "bbox": bbox,              # [x1, y1, x2, y2]
        "fps": round(fps, 2),
        "processing_time_ms": round(processing_time_ms, 2),
        "spark_batch_id": spark_batch_id,
        "source": source,
        "created_at": datetime.utcnow(),
    }


def serialize_detection(det: dict) -> dict:
    """Convert MongoDB detection doc to JSON-serializable dict."""
    return {
        "id": str(det["_id"]),
        "user_id": str(det.get("user_id", "")),
        "video_id": str(det.get("video_id", "")),
        "frame_number": det.get("frame_number", 0),
        "timestamp": det.get("timestamp", 0),
        "object_class": det.get("object_class", ""),
        "confidence": det.get("confidence", 0),
        "bbox": det.get("bbox", []),
        "fps": det.get("fps", 0),
        "processing_time_ms": det.get("processing_time_ms", 0),
        "spark_batch_id": det.get("spark_batch_id", ""),
        "source": det.get("source", "video"),
        "created_at": det.get("created_at", datetime.utcnow()).isoformat(),
    }
