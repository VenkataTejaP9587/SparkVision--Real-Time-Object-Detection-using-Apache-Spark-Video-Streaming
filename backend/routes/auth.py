"""
Authentication routes — Register, Login, Refresh, Profile.
Uses JWT for stateless auth suitable for cloud deployment.
"""
from flask import Blueprint, request, jsonify
from flask_jwt_extended import (
    create_access_token, jwt_required, get_jwt_identity
)
from bson import ObjectId
from datetime import datetime

from database.connection import get_collection
from models.user import create_user, verify_password, serialize_user

auth_bp = Blueprint("auth", __name__)


@auth_bp.route("/register", methods=["POST"])
def register():
    """POST /api/auth/register — create a new user account."""
    data = request.get_json()
    username = data.get("username", "").strip()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    # Basic validation
    if not username or not email or not password:
        return jsonify({"error": "All fields are required"}), 400
    if len(password) < 6:
        return jsonify({"error": "Password must be at least 6 characters"}), 400

    users = get_collection("users")

    # Duplicate check
    if users.find_one({"email": email}):
        return jsonify({"error": "Email already registered"}), 409

    user_doc = create_user(username, email, password)
    result = users.insert_one(user_doc)
    user_doc["_id"] = result.inserted_id

    # Issue JWT
    token = create_access_token(identity=str(result.inserted_id))
    return jsonify({
        "message": "Registration successful",
        "token": token,
        "user": serialize_user(user_doc),
    }), 201


@auth_bp.route("/login", methods=["POST"])
def login():
    """POST /api/auth/login — authenticate and return JWT."""
    data = request.get_json()
    email = data.get("email", "").strip().lower()
    password = data.get("password", "")

    if not email or not password:
        return jsonify({"error": "Email and password required"}), 400

    users = get_collection("users")
    user = users.find_one({"email": email})

    # Auto-provision demo user account if demo login requested
    if not user and email == "demo@sparkvision.ai":
        user_doc = create_user("Demo User", "demo@sparkvision.ai", "demo123")
        res = users.insert_one(user_doc)
        user_doc["_id"] = res.inserted_id
        user = user_doc

    if not user or not verify_password(password, user["password"]):
        return jsonify({"error": "Invalid email or password"}), 401

    # Update last active
    users.update_one(
        {"_id": user["_id"]},
        {"$set": {"stats.last_active": datetime.utcnow()}}
    )

    token = create_access_token(identity=str(user["_id"]))
    return jsonify({
        "message": "Login successful",
        "token": token,
        "user": serialize_user(user),
    }), 200


@auth_bp.route("/profile", methods=["GET"])
@jwt_required()
def profile():
    """GET /api/auth/profile — return the current user's profile."""
    user_id = get_jwt_identity()
    users = get_collection("users")
    user = users.find_one({"_id": ObjectId(user_id)})
    if not user:
        return jsonify({"error": "User not found"}), 404
    return jsonify({"user": serialize_user(user)}), 200


@auth_bp.route("/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """PUT /api/auth/profile — update username or settings."""
    user_id = get_jwt_identity()
    data = request.get_json()
    users = get_collection("users")

    update_fields = {"updated_at": datetime.utcnow()}
    if "username" in data:
        update_fields["username"] = data["username"]
    if "settings" in data:
        update_fields["settings"] = data["settings"]
    if "avatar" in data:
        update_fields["avatar"] = data["avatar"]

    users.update_one({"_id": ObjectId(user_id)}, {"$set": update_fields})
    user = users.find_one({"_id": ObjectId(user_id)})
    return jsonify({"message": "Profile updated", "user": serialize_user(user)}), 200
