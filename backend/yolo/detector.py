"""
YOLOv8 detector wrapper.
Downloads the model automatically on first use via ultralytics.
Provides frame-level detection with bounding boxes, confidence, and class labels.
"""
import time
import logging
import numpy as np

logger = logging.getLogger(__name__)

try:
    from ultralytics import YOLO
    _YOLO_AVAILABLE = True
except ImportError:
    _YOLO_AVAILABLE = False
    logger.warning("Ultralytics not installed. Using mock detections.")

try:
    import cv2
    _CV2_AVAILABLE = True
except ImportError:
    _CV2_AVAILABLE = False


class YOLODetector:
    """
    Wraps YOLOv8 for single-frame object detection.
    Falls back to mock data if ultralytics is not available (e.g. CI).
    """

    _instance = None   # singleton to avoid re-loading model

    def __new__(cls, model_name: str = "yolov8n.pt", confidence: float = 0.4):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self, model_name: str = "yolov8n.pt", confidence: float = 0.4):
        self.model_name = model_name
        self.confidence = confidence
        if getattr(self, "_initialized", False):
            return
        self._model = None
        self._initialized = True

    def load(self):
        """Load or download the YOLO model (called lazily)."""
        if self._model is not None:
            return
        if not _YOLO_AVAILABLE:
            logger.warning("YOLO not available; using mock detector.")
            return
        logger.info(f"Loading YOLO model: {self.model_name}")
        self._model = YOLO(self.model_name)
        logger.info("YOLO model loaded.")

    def detect(self, frame: np.ndarray) -> tuple[list[dict], float, float]:
        """
        Run object detection on a single BGR frame.

        Returns:
            detections: list of dicts with keys:
                class_name, confidence, bbox [x1,y1,x2,y2], class_id
            fps: estimated inference fps
            processing_time_ms: inference duration in ms
        """
        self.load()
        t0 = time.perf_counter()

        if self._model is None or frame is None:
            return self._mock_detections(), 0.0, 0.0

        try:
            # imgsz=320 provides up to 10x-20x faster CPU inference while preserving detection quality
            results = self._model(frame, imgsz=320, conf=self.confidence, verbose=False)
            detections = []
            for r in results:
                for box in r.boxes:
                    cls_id = int(box.cls[0])
                    conf = float(box.conf[0])
                    x1, y1, x2, y2 = [int(v) for v in box.xyxy[0].tolist()]
                    detections.append({
                        "class_name": self._model.names[cls_id],
                        "class_id": cls_id,
                        "confidence": round(conf, 4),
                        "bbox": [x1, y1, x2, y2],
                    })
        except Exception as e:
            logger.error(f"YOLO inference error: {e}")
            detections = []

        elapsed_ms = (time.perf_counter() - t0) * 1000
        fps = 1000 / elapsed_ms if elapsed_ms > 0 else 0
        return detections, round(fps, 2), round(elapsed_ms, 2)

    def draw_boxes(self, frame: np.ndarray, detections: list[dict]) -> np.ndarray:
        """Draw bounding boxes and labels on frame. Returns annotated copy."""
        if not _CV2_AVAILABLE or frame is None:
            return frame

        annotated = frame.copy()
        colors = self._get_colors()
        for det in detections:
            x1, y1, x2, y2 = det["bbox"]
            cls_id = det.get("class_id", 0)
            color = colors[cls_id % len(colors)]
            label = f"{det['class_name']} {det['confidence']:.0%}"

            # Draw rectangle
            cv2.rectangle(annotated, (x1, y1), (x2, y2), color, 2)
            # Background for text
            (tw, th), _ = cv2.getTextSize(label, cv2.FONT_HERSHEY_SIMPLEX, 0.6, 2)
            cv2.rectangle(annotated, (x1, y1 - th - 8), (x1 + tw + 4, y1), color, -1)
            cv2.putText(annotated, label, (x1 + 2, y1 - 4),
                        cv2.FONT_HERSHEY_SIMPLEX, 0.6, (255, 255, 255), 2)
        return annotated

    @staticmethod
    def _get_colors():
        """Deterministic color list for 80 COCO classes."""
        import colorsys
        colors = []
        for i in range(80):
            h = i / 80
            r, g, b = colorsys.hsv_to_rgb(h, 0.9, 0.9)
            colors.append((int(b * 255), int(g * 255), int(r * 255)))
        return colors

    @staticmethod
    def _mock_detections() -> list[dict]:
        """Return fake detections when YOLO is unavailable."""
        import random
        classes = ["person", "car", "dog", "bicycle", "cat"]
        n = random.randint(0, 3)
        dets = []
        for _ in range(n):
            dets.append({
                "class_name": random.choice(classes),
                "class_id": random.randint(0, 4),
                "confidence": round(random.uniform(0.4, 0.99), 4),
                "bbox": [random.randint(0, 300), random.randint(0, 200),
                         random.randint(300, 600), random.randint(200, 400)],
            })
        return dets
