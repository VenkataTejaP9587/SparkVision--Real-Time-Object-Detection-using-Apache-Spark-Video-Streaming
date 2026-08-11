"""
Spark Structured Streaming pipeline.
Receives detection events from an in-memory queue and processes them through
sliding and tumbling window aggregations.
"""
import queue
import threading
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

# In-process message queue acts as the Spark streaming source
detection_queue: queue.Queue = queue.Queue(maxsize=10000)

# Latest aggregated results per user
_streaming_results: dict = {}
_lock = threading.Lock()


def push_detection(user_id: str, object_class: str,
                   confidence: float, fps: float) -> None:
    """Push a detection event into the streaming pipeline (non-blocking)."""
    try:
        detection_queue.put_nowait({
            "user_id": user_id,
            "object_class": object_class,
            "confidence": confidence,
            "fps": fps,
            "event_time": datetime.utcnow().isoformat(),
        })
    except queue.Full:
        pass  # Drop oldest events under extreme load


def start_streaming_worker():
    """Start a background thread that consumes the queue and runs Spark."""
    thread = threading.Thread(target=_streaming_loop, daemon=True)
    thread.start()
    logger.info("Spark streaming worker started")


def _streaming_loop():
    """
    Continuously drain the detection queue, batch into a Spark DataFrame,
    and compute window aggregations.
    """
    from spark.spark_session import get_spark, spark_available
    import time

    BATCH_SIZE = 50
    BATCH_INTERVAL = 5  # seconds

    while True:
        batch = []
        deadline = time.time() + BATCH_INTERVAL

        while time.time() < deadline and len(batch) < BATCH_SIZE:
            try:
                event = detection_queue.get(timeout=0.5)
                batch.append(event)
            except queue.Empty:
                continue

        if not batch or not spark_available():
            # Fallback: pure-Python aggregation when Spark unavailable
            if batch:
                _aggregate_python(batch)
            continue

        try:
            _aggregate_spark(batch)
        except Exception as e:
            logger.error(f"Spark aggregation error: {e}")
            _aggregate_python(batch)


def _aggregate_spark(batch: list) -> None:
    """Use PySpark to aggregate a batch of detection events."""
    from pyspark.sql import functions as F
    from spark.spark_session import get_spark

    spark = get_spark()
    if spark is None:
        return

    df = spark.createDataFrame(batch)

    # ── Tumbling window: count per object class per user ──────────────────
    agg = (
        df.groupBy("user_id", "object_class")
        .agg(
            F.count("*").alias("count"),
            F.avg("confidence").alias("avg_confidence"),
            F.avg("fps").alias("avg_fps"),
        )
    )

    rows = agg.collect()
    with _lock:
        for row in rows:
            uid = row["user_id"]
            if uid not in _streaming_results:
                _streaming_results[uid] = {}
            cls = row["object_class"]
            prev = _streaming_results[uid].get(cls, {"count": 0, "avg_confidence": 0, "avg_fps": 0})
            _streaming_results[uid][cls] = {
                "count": prev["count"] + row["count"],
                "avg_confidence": round((prev["avg_confidence"] + row["avg_confidence"]) / 2, 4),
                "avg_fps": round((prev["avg_fps"] + row["avg_fps"]) / 2, 2),
            }


def _aggregate_python(batch: list) -> None:
    """Pure-Python fallback aggregation when Spark is unavailable."""
    by_user: dict = {}
    for event in batch:
        uid = event["user_id"]
        cls = event["object_class"]
        if uid not in by_user:
            by_user[uid] = {}
        if cls not in by_user[uid]:
            by_user[uid][cls] = {"count": 0, "conf_sum": 0.0, "fps_sum": 0.0}
        by_user[uid][cls]["count"] += 1
        by_user[uid][cls]["conf_sum"] += event["confidence"]
        by_user[uid][cls]["fps_sum"] += event["fps"]

    with _lock:
        for uid, classes in by_user.items():
            if uid not in _streaming_results:
                _streaming_results[uid] = {}
            for cls, vals in classes.items():
                prev = _streaming_results[uid].get(cls, {"count": 0, "avg_confidence": 0, "avg_fps": 0})
                n = vals["count"]
                _streaming_results[uid][cls] = {
                    "count": prev["count"] + n,
                    "avg_confidence": round(vals["conf_sum"] / n, 4),
                    "avg_fps": round(vals["fps_sum"] / n, 2),
                }


def get_user_results(user_id: str) -> dict:
    """Return the latest aggregation results for a user."""
    with _lock:
        return dict(_streaming_results.get(user_id, {}))


# Auto-start the worker when module loads
start_streaming_worker()
