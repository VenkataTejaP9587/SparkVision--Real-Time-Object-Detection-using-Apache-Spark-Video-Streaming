"""
Report model — tracks generated CSV/Excel/PDF report metadata.
"""
from datetime import datetime


def create_report(user_id: str, report_type: str,
                  file_path: str, filters: dict = None) -> dict:
    """Build a report metadata document."""
    return {
        "user_id": user_id,
        "report_type": report_type,   # csv | excel | pdf
        "file_path": file_path,
        "filters": filters or {},
        "status": "generated",
        "created_at": datetime.utcnow(),
    }


def serialize_report(report: dict) -> dict:
    return {
        "id": str(report["_id"]),
        "user_id": str(report.get("user_id", "")),
        "report_type": report.get("report_type", ""),
        "filters": report.get("filters", {}),
        "status": report.get("status", ""),
        "created_at": report.get("created_at", datetime.utcnow()).isoformat(),
    }
