"""
Detection service — runs YOLOv8 on every frame of an uploaded video,
persists results to MongoDB, pushes events into Spark streaming,
and emits Socket.IO events for live frontend updates.
"""
import time
import base64
import logging
import threading
from datetime import datetime

from config import Config
from database.connection import get_collection
from models.detection import create_detection
from yolo.detector import YOLODetector
from spark.streaming import push_detection

logger = logging.getLogger(__name__)

# Global stop events keyed by video_id
_stop_events: dict[str, threading.Event] = {}

try:
    import cv2
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False


class DetectionService:
    """
    Runs the full YOLOv8 detection pipeline for a single video file.
    Designed to run in a background daemon thread.
    """

    def __init__(self, video_id: str, user_id: str, file_path: str, socketio=None):
        self.video_id = video_id
        self.user_id = user_id
        self.file_path = file_path
        self.socketio = socketio
        self.detector = YOLODetector(
            model_name=Config.YOLO_MODEL,
            confidence=Config.CONFIDENCE_THRESHOLD,
        )
        stop_event = threading.Event()
        _stop_events[video_id] = stop_event
        self._stop_event = stop_event

    @classmethod
    def stop(cls, video_id: str):
        """Signal a running detection to stop."""
        if video_id in _stop_events:
            _stop_events[video_id].set()

    def run(self):
        """Main detection loop — processes frames and emits Socket.IO events."""
        socketio = self.socketio

        videos_col = get_collection("videos")
        detections_col = get_collection("detections")

        cap = None
        if _CV2_AVAILABLE:
            cap = cv2.VideoCapture(self.file_path)

        if cap is None or (cap is not None and not cap.isOpened()):
            logger.error(f"Cannot open video: {self.file_path}")
            videos_col.update_one(
                {"_id": __import__("bson").ObjectId(self.video_id)},
                {"$set": {"status": "error"}}
            )
            return

        total_frames = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
        video_fps = cap.get(cv2.CAP_PROP_FPS) or 25
        width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
        height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))

        videos_col.update_one(
            {"_id": __import__("bson").ObjectId(self.video_id)},
            {"$set": {
                "total_frames": total_frames,
                "fps": round(video_fps, 2),
                "resolution": f"{width}x{height}",
                "status": "processing",
            }}
        )

        frame_number = 0
        total_detections = 0
        frame_skip = Config.FRAME_SKIP

        while cap.isOpened() and not self._stop_event.is_set():
            ret, frame = cap.read()
            if not ret:
                break

            frame_number += 1
            # Skip frames for performance
            if frame_number % frame_skip != 0:
                continue

            timestamp = frame_number / video_fps
            detections, fps, proc_ms = self.detector.detect(frame)

            # Draw annotated frame for streaming
            annotated = self.detector.draw_boxes(frame, detections)
            _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
            frame_b64 = base64.b64encode(buffer).decode("utf-8")

            detection_docs = []
            for det in detections:
                doc = create_detection(
                    user_id=self.user_id,
                    video_id=self.video_id,
                    frame_number=frame_number,
                    timestamp=timestamp,
                    object_class=det["class_name"],
                    confidence=det["confidence"],
                    bbox=det["bbox"],
                    fps=fps,
                    processing_time_ms=proc_ms,
                    spark_batch_id="batch_" + str(int(time.time())),
                    source="video",
                )
                detection_docs.append(doc)
                # Push to Spark streaming pipeline
                push_detection(
                    user_id=self.user_id,
                    object_class=det["class_name"],
                    confidence=det["confidence"],
                    fps=fps,
                )
                total_detections += 1

            if detection_docs:
                detections_col.insert_many(detection_docs)

            progress_pct = round((frame_number / total_frames) * 100, 1) if total_frames > 0 else 0

            # Update DB periodically (every 10 frames) so status polling stays in sync
            if frame_number % (frame_skip * 5) == 0:
                videos_col.update_one(
                    {"_id": __import__("bson").ObjectId(self.video_id)},
                    {"$set": {"processed_frames": frame_number}}
                )

            # Emit to connected Socket.IO clients
            event_payload = {
                "video_id": self.video_id,
                "frame_number": frame_number,
                "total_frames": total_frames,
                "progress_pct": progress_pct,
                "timestamp": timestamp,
                "fps": fps,
                "processing_time_ms": proc_ms,
                "detections": detections,
                "frame": frame_b64,
            }
            socketio.emit("detection_frame", event_payload, room=self.user_id)
            socketio.emit("detection_frame", event_payload)  # global fallback

        cap.release()

        final_status = "done" if not self._stop_event.is_set() else "stopped"
        videos_col.update_one(
            {"_id": __import__("bson").ObjectId(self.video_id)},
            {"$set": {
                "status": final_status,
                "processed_frames": frame_number,
                "total_detections": total_detections,
                "updated_at": datetime.utcnow(),
            }}
        )

        # Update user stats
        get_collection("users").update_one(
            {"_id": __import__("bson").ObjectId(self.user_id)},
            {"$inc": {"stats.total_detections": total_detections}}
        )

        socketio.emit("detection_complete", {
            "video_id": self.video_id,
            "status": final_status,
            "total_detections": total_detections,
            "processed_frames": frame_number,
        }, room=self.user_id)

        logger.info(f"Detection complete for {self.video_id}: "
                    f"{total_detections} detections in {frame_number} frames")
