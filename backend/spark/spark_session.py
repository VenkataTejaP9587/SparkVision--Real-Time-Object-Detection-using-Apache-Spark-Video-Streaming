"""
PySpark session factory.
Uses local[*] mode so it works in any cloud container without a cluster.
"""
import logging
from config import Config

logger = logging.getLogger(__name__)

_spark = None
_spark_checked = False


def _java_installed() -> bool:
    import shutil, os
    return shutil.which("java") is not None or "JAVA_HOME" in os.environ


def get_spark():
    """Return a singleton SparkSession (lazy init)."""
    global _spark, _spark_checked
    if _spark_checked:
        return _spark

    _spark_checked = True
    if not _java_installed():
        logger.info("ℹ️ Java not found on host — using Python Streaming Aggregator fallback.")
        _spark = None
        return None

    try:
        from pyspark.sql import SparkSession
        _spark = (
            SparkSession.builder
            .appName(Config.SPARK_APP_NAME)
            .master(Config.SPARK_MASTER)
            .config("spark.sql.shuffle.partitions", "4")
            .config("spark.default.parallelism", "4")
            .config("spark.driver.memory", "512m")
            .config("spark.executor.memory", "512m")
            .config("spark.ui.enabled", "false")
            .config("spark.sql.streaming.forceDeleteTempCheckpointLocation", "true")
            .getOrCreate()
        )
        _spark.sparkContext.setLogLevel("ERROR")
        logger.info("✅ SparkSession initialized")
    except Exception as e:
        logger.warning(f"⚠️ Spark JVM init skipped (using Python Streaming Fallback): {e}")
        _spark = None

    return _spark


def spark_available() -> bool:
    """Check if Spark is running."""
    return get_spark() is not None
