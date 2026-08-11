"""
Flask application entry point.
Initializes Flask, Socket.IO, JWT, CORS, and registers all blueprints.
"""
import os
from flask import Flask
from flask_cors import CORS
from flask_socketio import SocketIO
from flask_jwt_extended import JWTManager

from config import Config
from database.connection import init_db
from routes.auth import auth_bp
from routes.video import video_bp
from routes.detection import detection_bp
from routes.analytics import analytics_bp
from routes.history import history_bp
from routes.reports import reports_bp

# ─── App Factory ──────────────────────────────────────────────────────────────

app = Flask(__name__)
app.config.from_object(Config)

# Ensure upload/report directories exist
os.makedirs(app.config["UPLOAD_FOLDER"], exist_ok=True)
os.makedirs(app.config["REPORTS_FOLDER"], exist_ok=True)

# ─── Extensions ───────────────────────────────────────────────────────────────

CORS(app, resources={r"/api/*": {"origins": "*"},
                     r"/socket.io/*": {"origins": "*"}},
     supports_credentials=True)

socketio = SocketIO(
    app,
    cors_allowed_origins="*",
    async_mode=Config.SOCKETIO_ASYNC_MODE,
    logger=False,
    engineio_logger=False,
    max_http_buffer_size=10_000_000,  # 10 MB for base64 frames
)

jwt = JWTManager(app)

# ─── Database ─────────────────────────────────────────────────────────────────

init_db(app)

# ─── Blueprints ───────────────────────────────────────────────────────────────

app.register_blueprint(auth_bp,      url_prefix="/api/auth")
app.register_blueprint(video_bp,     url_prefix="/api/videos")
app.register_blueprint(detection_bp, url_prefix="/api/detection")
app.register_blueprint(analytics_bp, url_prefix="/api/analytics")
app.register_blueprint(history_bp,   url_prefix="/api/history")
app.register_blueprint(reports_bp,   url_prefix="/api/reports")

# ─── Socket.IO Events ─────────────────────────────────────────────────────────

from services.stream_service import register_socket_events
register_socket_events(socketio)

# ─── Health Check ─────────────────────────────────────────────────────────────

@app.route("/api/health")
def health():
    return {"status": "ok", "service": "BDA Backend"}, 200


# ─── Entry Point ──────────────────────────────────────────────────────────────

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    socketio.run(app, host="0.0.0.0", port=port, debug=Config.DEBUG, use_reloader=False, allow_unsafe_werkzeug=True)
