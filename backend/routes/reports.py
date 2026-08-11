"""
Reports routes — generate CSV, Excel, and PDF reports from detection data.
"""
import os
from flask import Blueprint, request, jsonify, send_file, current_app
from flask_jwt_extended import jwt_required, get_jwt_identity
from bson import ObjectId
from datetime import datetime

from database.connection import get_collection
from models.report import create_report
from services.report_service import ReportService

reports_bp = Blueprint("reports", __name__)


@reports_bp.route("/generate", methods=["POST"])
@jwt_required()
def generate_report():
    """POST /api/reports/generate — generate a report and return download URL."""
    user_id = get_jwt_identity()
    data = request.get_json()
    report_type = data.get("type", "csv")   # csv | excel | pdf
    filters = data.get("filters", {})

    reports_folder = current_app.config["REPORTS_FOLDER"]
    service = ReportService(user_id=user_id, reports_folder=reports_folder)

    try:
        file_path, filename = service.generate(report_type, filters)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

    # Save report metadata
    reports_col = get_collection("reports")
    report_doc = create_report(user_id, report_type, file_path, filters)
    result = reports_col.insert_one(report_doc)

    return jsonify({
        "message": f"{report_type.upper()} report generated",
        "report_id": str(result.inserted_id),
        "filename": filename,
        "download_url": f"/api/reports/download/{str(result.inserted_id)}",
    }), 200


@reports_bp.route("/download/<report_id>", methods=["GET"])
@jwt_required()
def download_report(report_id):
    """GET /api/reports/download/<id> — download a generated report file."""
    user_id = get_jwt_identity()
    report = get_collection("reports").find_one({
        "_id": ObjectId(report_id), "user_id": user_id
    })
    if not report:
        return jsonify({"error": "Report not found"}), 404

    file_path = report["file_path"]
    if not os.path.exists(file_path):
        return jsonify({"error": "Report file no longer exists"}), 404

    mime_map = {
        "csv": "text/csv",
        "excel": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "pdf": "application/pdf",
    }
    mime = mime_map.get(report["report_type"], "application/octet-stream")
    return send_file(file_path, mimetype=mime, as_attachment=True,
                     download_name=os.path.basename(file_path))


@reports_bp.route("/list", methods=["GET"])
@jwt_required()
def list_reports():
    """GET /api/reports/list — list all generated reports."""
    user_id = get_jwt_identity()
    reports = list(get_collection("reports").find({"user_id": user_id}).sort("created_at", -1).limit(50))
    return jsonify({"reports": [
        {
            "id": str(r["_id"]),
            "type": r["report_type"],
            "created_at": r["created_at"].isoformat(),
            "download_url": f"/api/reports/download/{str(r['_id'])}",
        }
        for r in reports
    ]}), 200
