"""
Spark analytics — exposes methods to query aggregated streaming results
and run ad-hoc Spark SQL queries over detection history.
"""
import logging
from datetime import datetime

from spark.spark_session import get_spark, spark_available
from spark.streaming import get_user_results

logger = logging.getLogger(__name__)


class SparkAnalytics:
    """High-level interface to Spark aggregation results."""

    def status(self) -> str:
        """Return a human-readable Spark status string."""
        if spark_available():
            return "Running (local[*])"
        return "Fallback (Python)"

    def get_results(self, user_id: str) -> dict:
        """
        Return latest per-class aggregation results for a user.
        Result shape: {object_class: {count, avg_confidence, avg_fps}}
        """
        raw = get_user_results(user_id)
        # Convert to sorted list for charts
        items = [
            {
                "object_class": cls,
                "count": vals["count"],
                "avg_confidence": round(vals["avg_confidence"] * 100, 1),
                "avg_fps": vals["avg_fps"],
            }
            for cls, vals in raw.items()
        ]
        items.sort(key=lambda x: x["count"], reverse=True)
        return {
            "top_objects": items[:10],
            "total_classes": len(items),
            "timestamp": datetime.utcnow().isoformat(),
            "spark_mode": self.status(),
        }

    def run_sql_query(self, detections: list, sql: str) -> list:
        """
        Run an arbitrary Spark SQL query over a list of detection dicts.
        Used for report generation.
        """
        spark = get_spark()
        if spark is None or not detections:
            return []
        try:
            df = spark.createDataFrame(detections)
            df.createOrReplaceTempView("detections")
            result = spark.sql(sql)
            return [row.asDict() for row in result.collect()]
        except Exception as e:
            logger.error(f"Spark SQL error: {e}")
            return []
