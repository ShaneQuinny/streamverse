# --- Imports ---
from flask import Blueprint, request, make_response, jsonify
from globals import users, blacklist, SECRET_KEY
from decorators import jwt_required, admin_required
from datetime import datetime, timedelta, timezone
from utils.audit import log_admin_action
import secrets
import jwt
import bcrypt

# --- Define Auth Blueprint ---
auth_bp = Blueprint("auth_bp", __name__)

#
auth_routes = [
    "/register", "register", ["POST"],
    "/login", "login", ["POST"]
]

# --- REGISTER USER ---
@auth_bp.route("/api/v1.0/register", methods=["POST"])
def register_user():
    try:
        # Accept JSON or form-data
        data = request.get_json(silent=True) or request.form

        # Required fields
        required_fields = ["username", "fullname", "email", "password"]
        missing = [f for f in required_fields if f not in data or not data[f]]
        if missing:
            return make_response(
                jsonify({"error": f"Missing fields: {', '.join(missing)}"}), 400
            )

        username = data["username"].strip().lower()
        email = data["email"].strip().lower()

        # Check if user already exists
        if users.find_one({"$or": [{"username": username}, {"email": email}]}):
            return make_response(
                jsonify({"error": "Username or email already in use"}), 409
            )

        # Hash the password securely
        hashed_pw = bcrypt.hashpw(
            data["password"].encode("utf-8"), bcrypt.gensalt()
        )

        # Generate a unique API key for the user
        api_key = secrets.token_hex(24)  # 48-char unique key

        # Build the user document
        new_user = {
            "username": username,
            "fullname": data["fullname"].strip(),
            "email": email,
            "password": hashed_pw,
            "admin": False,  # always false by default
            "api_key": api_key,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        # Insert into MongoDB
        users.insert_one(new_user)

        # Return confirmation
        return make_response(
            jsonify({
                "message": "User registered successfully",
                "username": username,
                "api_key": api_key,
            }), 201
        )

    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)
    
# --- LOGIN USER ---
@auth_bp.route("/api/v1.0/login", methods=["POST"])
def login_user():
    try:
        # Get credentials
        data = request.get_json(silent=True) or request.form
        username = data.get("username", "").strip().lower()
        password = data.get("password", "")
        api_key = request.headers.get("x-api-key")

        # Validate presence
        if not username or not password or not api_key:
            return make_response(
                jsonify({"error": "Username, password, and API key required"}), 400
            )

        # Check user exists
        user = users.find_one({"username": username})
        if not user:
            return make_response(jsonify({"error": "Invalid username"}), 401)

        # Check API key match
        if user["api_key"] != api_key:
            return make_response(jsonify({"error": "Invalid API key"}), 403)

        # Check password match
        if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
            return make_response(jsonify({"error": "Incorrect password"}), 401)
        
        # Ensure user is active
        if not user.get("active", True):
            return make_response(jsonify({"error": "Account is deactivated. Contact an administrator."}), 403)

        # Generate JWT
        token = jwt.encode({
            "user": username,
            "admin": user.get("admin", False),
            "exp": datetime.now(timezone.utc) + timedelta(hours=2)
        }, SECRET_KEY, algorithm="HS256")

        return make_response(
            jsonify({
                "message": "Login successful",
                "token": token,
            }), 200
        )

    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)

# --- LOGOUT USER ---
@auth_bp.route("/api/v1.0/logout", methods=["POST"])
@jwt_required 
def logout():
    try:
        # Get access token from header
        token = request.headers.get("x-access-token")
        if not token:
            return make_response(jsonify({"error": "Missing JWT access token"}), 400)

        # Check if token already blacklisted
        if blacklist.find_one({"token": token}):
            return make_response(jsonify({"message": "Token already blacklisted"}), 200)

        # Record token invalidation with timestamp and user info
        user = getattr(request, "user", None)
        blacklist.insert_one({
            "token": token,
            "username": user.get("username"),
            "blacklisted_at": datetime.now(timezone.utc)
        })

        return make_response(jsonify({"message": "Logout successful"}), 200)

    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)

# --- DELETE USER (ADMIN ONLY) ---
@auth_bp.route("/api/v1.0/users/<string:username>", methods=["DELETE"])
@jwt_required
@admin_required
def remove_user(username):
    try:
        # Prevent the ability for admins to delete themselves
        current_user = request.user.get("username")
        if current_user == username:
            return make_response(jsonify({
                "error": "Admins cannot delete their own account."
            }), 400)

        # Attempt to find the user
        user = users.find_one({"username": username})
        if not user:
            return make_response(jsonify({"error": f"User '{username}' not found."}), 404)
        
        # Ensure user is set as deactive before deletion
        if user.get("active", True):
            return make_response(jsonify({"error": "User must be deactivated before deletion."}), 400)

        # Delete the user document
        result = users.delete_one({"username": username})
        if result.deleted_count == 1:

            #
            log_admin_action(
                request.user["username"],
                "delete_user",
                username
            )
                        
            return make_response(jsonify({"message": f"User '{username}' deleted successfully."}), 200)
        else:
            return make_response(jsonify({"error": "User deletion failed unexpectedly."}), 500)

    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)

# --- REACTIVATE USER (ADMIN ONLY) ---
@auth_bp.route("/api/v1.0/users/<string:username>/reactivate", methods=["PATCH"])
@jwt_required
@admin_required
def reactivate_user(username):
    #
    user = users.find_one({"username": username})
    if not user:
        return make_response(jsonify({"error": "User not found"}), 404)

    #
    if user.get("active", True):
        return make_response(jsonify({"message": "User already active"}), 200)

    #
    users.update_one(
        {"username": username},
        {"$set": {"active": True}, "$unset": {"deactivated_at": "", "deactivation_reason": ""}}
    )

    #
    log_admin_action(
        request.user["username"],
        "reactivate_user",
        username
    )

    return make_response(jsonify({"message": f"User '{username}' reactivated"}), 200)

# --- DEACTIVATE USER (ADMIN ONLY) ---
@auth_bp.route("/api/v1.0/users/<string:username>/deactivate", methods=["PATCH"])
@jwt_required
@admin_required
def deactivate_user(username):
    #
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "No reason provided")

    #
    user = users.find_one({"username": username})
    if not user:
        return make_response(jsonify({"error": "User not found"}), 404)

    #
    if not user.get("active", True):
        return make_response(jsonify({"message": "User already inactive"}), 200)

    #
    users.update_one(
        {"username": username},
        {"$set": {"active": False, "deactivated_at": datetime.now(timezone.utc).isoformat(), "deactivation_reason": reason}}
    )

    #
    log_admin_action(
        request.user["username"],
        "deactivate_user",
        username,
        {"reason": reason}
    )  

    return make_response(jsonify({
        "message": f"User '{username}' deactivated",
        "reason": reason
    }), 200)