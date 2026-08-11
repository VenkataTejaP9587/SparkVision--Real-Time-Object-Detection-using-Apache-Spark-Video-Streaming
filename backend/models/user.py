"""
User model — schema helpers for MongoDB user documents.
"""
from datetime import datetime
import bcrypt


def create_user(username: str, email: str, password: str) -> dict:
    """Build a new user document with hashed password."""
    hashed = bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()
    return {
        "username": username,
        "email": email.lower(),
        "password": hashed,
        "role": "user",
        "avatar": "",
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
        "settings": {
            "notifications": True,
            "theme": "dark",
            "confidence_threshold": 0.4,
            "frame_skip": 2,
        },
        "stats": {
            "total_videos": 0,
            "total_detections": 0,
            "last_active": datetime.utcnow(),
        }
    }


def verify_password(plain: str, hashed: str) -> bool:
    """Check plain text password against stored hash."""
    return bcrypt.checkpw(plain.encode(), hashed.encode())


def serialize_user(user: dict) -> dict:
    """Return a safe user dict (no password) for JWT payload / API responses."""
    return {
        "id": str(user["_id"]),
        "username": user["username"],
        "email": user["email"],
        "role": user.get("role", "user"),
        "avatar": user.get("avatar", ""),
        "settings": user.get("settings", {}),
        "stats": user.get("stats", {}),
        "created_at": user.get("created_at", datetime.utcnow()).isoformat(),
    }
