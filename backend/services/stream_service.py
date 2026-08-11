"""
Socket.IO stream service.
Handles real-time webcam frame detection events from the browser.
"""
import base64
import logging
import numpy as np
import time

from flask_socketio import join_room, leave_room
from flask_jwt_extended import decode_token

import jwt
from config import Config

logger = logging.getLogger(__name__)

try:
    import cv2
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False

_busy_users: set[str] = set()


def _decode_user_id(token: str) -> str:
    if not token:
        return None
    try:
        decoded = jwt.decode(token, Config.JWT_SECRET_KEY, algorithms=["HS256"])
        return str(decoded.get("sub"))
    except Exception:
        try:
            from flask import current_app
            with current_app.app_context():
                from flask_jwt_extended import decode_token
                return str(decode_token(token).get("sub"))
        except Exception as e:
            logger.warning(f"Token decode error: {e}")
            return None


def register_socket_events(socketio):
    """Register all Socket.IO event handlers."""

    @socketio.on("connect")
    def handle_connect(auth):
        logger.info(f"Client connected: {auth}")

    @socketio.on("disconnect")
    def handle_disconnect():
        logger.info("Client disconnected")

    @socketio.on("join")
    def handle_join(data):
        """Client joins its user room to receive private events."""
        token = data.get("token", "")
        user_id = _decode_user_id(token)
        if user_id:
            join_room(user_id)
            socketio.emit("joined", {"room": user_id})
            logger.info(f"User {user_id} joined their room")
        else:
            logger.warning("Join failed: Invalid token")
            socketio.emit("error", {"message": "Authentication failed"})

    @socketio.on("leave")
    def handle_leave(data):
        token = data.get("token", "")
        user_id = _decode_user_id(token)
        if user_id:
            leave_room(user_id)

    @socketio.on("webcam_frame")
    def handle_webcam_frame(data):
        """
        Receive a base64-encoded JPEG frame from the browser webcam,
        run YOLO detection, and emit back the annotated frame + detections.
        """
        from yolo.detector import YOLODetector
        from spark.streaming import push_detection

        token = data.get("token", "")
        frame_b64 = data.get("frame", "")

        if not frame_b64:
            return

        user_id = _decode_user_id(token)
        if not user_id:
            return

        join_room(user_id)

        # Drop frame if processing is already in progress for this user
        if user_id in _busy_users:
            return

        _busy_users.add(user_id)
        try:
            # Decode frame
            if not _CV2_AVAILABLE:
                socketio.emit("webcam_result", {"error": "OpenCV not available"}, room=user_id)
                return

            try:
                img_data = base64.b64decode(frame_b64)
                np_arr = np.frombuffer(img_data, np.uint8)
                frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
            except Exception as e:
                logger.error(f"Frame decode error: {e}")
                return

            detector = YOLODetector(
                model_name=Config.YOLO_MODEL,
                confidence=Config.CONFIDENCE_THRESHOLD,
            )
            detections, fps, proc_ms = detector.detect(frame)
            annotated = detector.draw_boxes(frame, detections)

            _, buffer = cv2.imencode(".jpg", annotated, [cv2.IMWRITE_JPEG_QUALITY, 75])
            annotated_b64 = base64.b64encode(buffer).decode("utf-8")

            # Save live detections to database and Spark
            if detections:
                from database.connection import get_collection
                from models.detection import create_detection
                det_col = get_collection("detections")
                docs = []
                for det in detections:
                    push_detection(user_id, det["class_name"], det["confidence"], fps)
                    doc = create_detection(
                        user_id=user_id,
                        video_id="webcam_stream",
                        frame_number=0,
                        timestamp=time.time(),
                        object_class=det["class_name"],
                        confidence=det["confidence"],
                        bbox=det["bbox"],
                        fps=fps,
                        processing_time_ms=proc_ms,
                        source="webcam",
                    )
                    docs.append(doc)
                if docs:
                    det_col.insert_many(docs)

            socketio.emit("webcam_result", {
                "frame": annotated_b64,
                "detections": detections,
                "fps": fps,
                "processing_time_ms": proc_ms,
                "timestamp": time.time(),
            }, room=user_id)
        finally:
            _busy_users.discard(user_id)

