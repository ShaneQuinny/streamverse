# --- Imports ---
from flask import Blueprint, request, make_response, jsonify
from globals import users, blacklist, SECRET_KEY
from decorators import jwt_required, admin_required
from utils.audit import log_admin_action
from utils.register_routes import register_blueprint_routes
from datetime import datetime, timedelta, timezone
from email_validator import validate_email, EmailNotValidError
import secrets
import jwt
import bcrypt

# --- Define Auth Blueprint ---
auth_bp = Blueprint("auth_bp", __name__)

# --- Route Definitions ---
auth_routes = [
    ("/register", "register", ["POST"], []),
    ("/login", "login", ["POST"], []),
    ("/logout", "logout", ["POST"], [jwt_required]),
    ("/users", "get_all_users", ["GET"], [jwt_required, admin_required]),
    ("/users/<string:username>", "remove_user", ["DELETE"], [jwt_required, admin_required]),
    ("/users/<string:username>/reactivate", "reactivate_user", ["PATCH"], [jwt_required, admin_required]),
    ("/users/<string:username>/deactivate", "deactivate_user", ["PATCH"], [jwt_required, admin_required]),
    ("/token/refresh", "refresh_token", ["POST"], []),
]

# --- Register User ---
def register():
    try:
        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}

        # Validate required fields 
        required_fields = ["username", "fullname", "email", "password"]
        missing = [f for f in required_fields if not data.get(f) or not str(data.get(f)).strip()]
        if missing:
            return make_response(jsonify({"error": f"Missing or empty field(s): {', '.join(missing)}"}), 400)

        # Normalize input data
        username = data["username"].strip().lower()
        fullname = data["fullname"].strip()
        email = data["email"].strip().lower()
        password = data["password"].strip()

        # Validate email format 
        validate_email(email)

        # Check for existing user
        existing_user = users.find_one(
            {"$or": [{"username": username}, {"email": email}]},
            {"username": 1, "email": 1, "_id": 0}
        )

        # Return response based on field already in use
        if existing_user:
            if existing_user.get("username") == username:
                return make_response(jsonify({"error": "Username already in use"}), 409)
        if existing_user.get("email") == email:
            return make_response(jsonify({"error": "Email already in use"}), 409)

        # Hash the password securely
        hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        # Generate a unique API key for the user
        api_key = secrets.token_hex(24)

        # Build the user document
        new_user = {
            "username": username,
            "fullname": fullname,
            "email": email,
            "password": hashed_pw,
            "admin": False,  # always false by default
            "api_key": api_key,
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        # Insert into MongoDB
        users.insert_one(new_user)

        return make_response(
            jsonify({
                "message": "User registered successfully",
                "username": username,
                "api_key": api_key,
                "info": "Take a note of your unique API KEY, as this will be required when making future requests"
            }), 201
        )
    
    #Exceptions
    except EmailNotValidError as e:
        return make_response(jsonify({"error": f"Invalid email address: {str(e)}"}), 400)

    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)
    
# --- Login  ---
def login():
    try:
        # Get and validate credentials
        data = request.get_json(silent=True) or {}
        username = (data.get("username") or "").strip().lower()
        password = (data.get("password") or "").strip()
        api_key = (request.headers.get("x-api-key") or "").strip()

        # Validate required fields and collect missing ones
        missing = []
        if not username:
            missing.append("username")
        if not password:
            missing.append("password")
        if not api_key:
            missing.append("x-api-key header")
        if missing:
            return make_response(jsonify({"error": f"Missing required field(s): {', '.join(missing)}"}), 400)

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

        # Generate JWT access token
        access_token = jwt.encode({
            "user": username,
            "admin": user.get("admin", False),
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30)
        }, SECRET_KEY, algorithm="HS256")

        # Generate JWT refresh token
        refresh_token = jwt.encode({
                    "user": username,
                    "admin": user.get("admin", False),
                    "type": "refresh",
                    "exp": datetime.now(timezone.utc) + timedelta(days=7)
                }, SECRET_KEY, algorithm="HS256")

        return make_response(
            jsonify({
                "message": "Login successful",
                "access_token": access_token,
                "expiration": int((datetime.now(timezone.utc) + timedelta(minutes=30)).timestamp()),
                "refresh_token": refresh_token
            }), 200
        )

    # General Exception
    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)

# --- Logout ---
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
            "blacklisted_at": datetime.now(timezone.utc).isoformat()
        })

        return make_response(jsonify({"message": "Logout successful"}), 200)

    # General Exception
    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)
    
# --- Get All Registered Users ---
def get_all_users():
 # Pagination parameters 
    page_num = int(request.args.get("pn", 1))
    page_size = int(request.args.get("ps", 10))
    skip = (page_num - 1) * page_size

    # Filter parameter
    status_filter = request.args.get("account_status", "all").lower()
    query = {}

    # Apply active/inactive filtering
    if status_filter == "active":
        query["active"] = True
    elif status_filter == "inactive":
        query["active"] = False
    # if "all" no query condition added

    # Fetch users (exclude sensitive fields)
    users_cursor = users.find(query, {"_id": 0, "password": 0}) \
                        .sort("created_at", 1) \
                        .skip(skip) \
                        .limit(page_size)

    # Count and store results
    users_list = list(users_cursor)
    total_users = users.count_documents(query)
    total_all_users = users.count_documents({})

     # Log reactivate action for auditing purposes
    log_admin_action(
        request.user["username"],
        "view_all_users",
        "system"
    )

    return make_response(jsonify({
        "page_num": page_num,
        "page_size": page_size,
        "total_filtered": total_users,
        "total_all": total_all_users,
        "status_filter": status_filter,
        "returned": len(users_list),
        "users": users_list
    }), 200)

# --- Remove User (ADMIN ONLY) ---
def remove_user(username):
    try:
        # Prevent the ability for admins to delete themselves
        current_user = request.user.get("username")
        if current_user == username:
            return make_response(jsonify({"error": "Admins cannot delete their own account."}), 400)

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
            # Log delete action for auditing purposes
            log_admin_action(
                request.user["username"],
                "delete_user",
                username
            )                 
            return make_response(jsonify({"message": f"User '{username}' deleted successfully."}), 200)
        else:
            return make_response(jsonify({"error": "User deletion failed unexpectedly."}), 500)

    # General Exception
    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)

# --- Reactivate User (ADMIN ONLY) ---
def reactivate_user(username):
    try:
        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}
        reason = data.get("reason", "No reason provided")
    
        # Check user exists
        user = users.find_one({"username": username})
        if not user:
            return make_response(jsonify({"error": "User not found"}), 404)
    
        # Check if the user is already active
        if user.get("active", True):
            return make_response(jsonify({"message": "User already active"}), 200)
    
        # Reactivate the user and clear deactivation fields
        users.update_one(
            {"username": username},
            {"$set": {"active": True}, "$unset": {"deactivated_at": "", "deactivation_reason": ""}}
        )
    
        # Log reactivate action for auditing purposes
        log_admin_action(
            request.user["username"],
            "reactivate_user",
            username,
            {"reason": reason}
        )
    
        return make_response(jsonify({"message": f"User '{username}' reactivated"}), 200)
    
    # General Exception
    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)

# --- Deactivate User (ADMIN ONLY) ---
def deactivate_user(username):
    try:
        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}
        reason = data.get("reason", "No reason provided")
    
        # Check user exists
        user = users.find_one({"username": username})
        if not user:
            return make_response(jsonify({"error": "User not found"}), 404)
    
        # Check if the user is already inactive
        if not user.get("active", True):
            return make_response(jsonify({"message": "User already inactive"}), 200)
    
        # Deactivate the user and record timestamp and reason for deactivation
        users.update_one(
            {"username": username},
            {"$set": {"active": False, "deactivated_at": datetime.now(timezone.utc).isoformat(), "deactivation_reason": reason}}
        )
    
        # Log deactivate action for auditing purposes
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

    # General Exception
    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)

# --- Refresh Token ---
def refresh_token():
    # Get refresh token from JSON data in the request body
    data = request.get_json()
    refresh_token = data.get("refresh_token")
    if not refresh_token:
        return make_response(jsonify({"message": "Refresh token missing"}), 401)

    try:
        # Decode token and ensure it is a refresh token
        decoded = jwt.decode(refresh_token, SECRET_KEY, algorithms=["HS256"])
        if decoded.get("type") != "refresh":
            return make_response(jsonify({"message": "Invalid refresh token type"}), 401)

        # Issue new access token
        new_access_token = jwt.encode({
            "user": decoded["user"],
            "admin": decoded.get("admin", False),
            "type": "access",
            "exp": datetime.now(timezone.utc) + timedelta(minutes=30)
        }, SECRET_KEY, algorithm="HS256")

        return make_response(jsonify({"access_token": new_access_token}), 200)

    # Exceptions
    except jwt.ExpiredSignatureError:
        return make_response(jsonify({"message": "Refresh token expired"}), 401)
    except jwt.InvalidTokenError:
        return make_response(jsonify({"message": "Invalid refresh token"}), 401)

# --- Generate Routes ---
register_blueprint_routes(auth_bp, auth_routes, globals())