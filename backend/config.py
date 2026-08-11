"""
Configuration module for the BDA backend.
Reads environment variables for cloud deployment.
"""
import os
from dotenv import load_dotenv

load_dotenv()


class Config:
    # Flask
    SECRET_KEY = os.getenv("SECRET_KEY", "bda-secret-key-change-in-production")
    DEBUG = os.getenv("FLASK_ENV", "development") == "development"

    # JWT
    JWT_SECRET_KEY = os.getenv("JWT_SECRET_KEY", "jwt-secret-bda-2024")
    JWT_ACCESS_TOKEN_EXPIRES = 86400  # 24 hours in seconds

    # MongoDB Atlas
    MONGO_URI = os.getenv(
        "MONGO_URI",
        "mongodb+srv://<user>:<password>@cluster0.mongodb.net/bda_db?retryWrites=true&w=majority"
    )
    DB_NAME = os.getenv("DB_NAME", "bda_db")

    # CORS
    FRONTEND_URL = os.getenv("FRONTEND_URL", "http://localhost:5173")

    # Upload
    UPLOAD_FOLDER = os.path.join(os.path.dirname(__file__), "uploads")
    REPORTS_FOLDER = os.path.join(os.path.dirname(__file__), "reports")
    MAX_CONTENT_LENGTH = 500 * 1024 * 1024  # 500 MB

    # YOLO
    YOLO_MODEL = os.getenv("YOLO_MODEL", "yolov8n.pt")  # nano = fast, small memory
    CONFIDENCE_THRESHOLD = float(os.getenv("CONFIDENCE_THRESHOLD", "0.4"))
    FRAME_SKIP = int(os.getenv("FRAME_SKIP", "2"))  # process every Nth frame

    # Spark
    SPARK_APP_NAME = "BDA_ObjectDetection"
    SPARK_MASTER = "local[*]"  # local mode for cloud containers

    # Socket.IO
    SOCKETIO_ASYNC_MODE = "threading"
