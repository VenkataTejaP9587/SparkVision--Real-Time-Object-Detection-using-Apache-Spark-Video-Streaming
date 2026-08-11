"""
Report generation service.
Produces CSV, Excel (xlsx), and PDF reports from detection data.
"""
import os
import uuid
import logging
from datetime import datetime

logger = logging.getLogger(__name__)

try:
    import pandas as pd
    _PANDAS = True
except ImportError:
    _PANDAS = False

try:
    from reportlab.lib.pagesizes import letter, landscape
    from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
    from reportlab.lib.styles import getSampleStyleSheet
    from reportlab.lib import colors
    _REPORTLAB = True
except ImportError:
    _REPORTLAB = False


class ReportService:
    """Generates reports from detection records stored in MongoDB."""

    def __init__(self, user_id: str, reports_folder: str):
        self.user_id = user_id
        self.reports_folder = reports_folder

    def _fetch_records(self, filters: dict) -> list:
        from database.connection import get_collection
        from models.detection import serialize_detection

        query = {"user_id": self.user_id}
        if filters.get("video_id"):
            query["video_id"] = filters["video_id"]
        if filters.get("object_class"):
            query["object_class"] = filters["object_class"]

        col = get_collection("detections")
        records = list(col.find(query).sort("created_at", -1).limit(5000))
        return [serialize_detection(r) for r in records]

    def generate(self, report_type: str, filters: dict) -> tuple[str, str]:
        """Generate a report and return (file_path, filename)."""
        records = self._fetch_records(filters)
        ts = datetime.utcnow().strftime("%Y%m%d_%H%M%S")

        if report_type == "csv":
            return self._generate_csv(records, ts)
        elif report_type == "excel":
            return self._generate_excel(records, ts)
        elif report_type == "pdf":
            return self._generate_pdf(records, ts)
        else:
            raise ValueError(f"Unknown report type: {report_type}")

    def _generate_csv(self, records: list, ts: str) -> tuple[str, str]:
        filename = f"report_{ts}.csv"
        path = os.path.join(self.reports_folder, filename)
        if not _PANDAS:
            raise RuntimeError("pandas not installed")
        df = pd.DataFrame(records)
        df.to_csv(path, index=False)
        return path, filename

    def _generate_excel(self, records: list, ts: str) -> tuple[str, str]:
        filename = f"report_{ts}.xlsx"
        path = os.path.join(self.reports_folder, filename)
        if not _PANDAS:
            raise RuntimeError("pandas not installed")
        df = pd.DataFrame(records)

        with pd.ExcelWriter(path, engine="openpyxl") as writer:
            df.to_excel(writer, sheet_name="Detections", index=False)
            # Summary sheet
            if not df.empty and "object_class" in df.columns:
                summary = (
                    df.groupby("object_class")
                    .agg(count=("object_class", "count"),
                         avg_confidence=("confidence", "mean"))
                    .reset_index()
                )
                summary.to_excel(writer, sheet_name="Summary", index=False)

        return path, filename

    def _generate_pdf(self, records: list, ts: str) -> tuple[str, str]:
        filename = f"report_{ts}.pdf"
        path = os.path.join(self.reports_folder, filename)

        if not _REPORTLAB:
            raise RuntimeError("reportlab not installed")

        doc = SimpleDocTemplate(path, pagesize=landscape(letter))
        styles = getSampleStyleSheet()
        elements = []

        # Title
        elements.append(Paragraph("Object Detection Report", styles["Title"]))
        elements.append(Paragraph(
            f"Generated: {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}  |  "
            f"Total Records: {len(records)}",
            styles["Normal"]
        ))
        elements.append(Spacer(1, 12))

        # Table
        headers = ["Frame", "Timestamp", "Object", "Confidence", "FPS", "Source", "Date"]
        data = [headers]
        for r in records[:500]:  # Cap at 500 rows in PDF
            data.append([
                str(r.get("frame_number", "")),
                f"{r.get('timestamp', 0):.2f}s",
                r.get("object_class", ""),
                f"{r.get('confidence', 0) * 100:.1f}%",
                f"{r.get('fps', 0):.1f}",
                r.get("source", ""),
                r.get("created_at", "")[:10],
            ])

        table = Table(data, repeatRows=1)
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e3a5f")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f0f4ff")]),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ]))
        elements.append(table)
        doc.build(elements)
        return path, filename
