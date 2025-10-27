# --- Imports ---
from flask import request, jsonify, make_response
import jwt
from functools import wraps
from globals import SECRET_KEY, blacklist, users

# --- JWT REQUIRED WRAPPER ---
def jwt_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # --- Check for JWT ---
        token = request.headers.get("x-access-token")
        if not token:
            return make_response(jsonify({"error": "Missing JWT token"}), 401)

        # --- Check for API key ---
        api_key = request.headers.get("x-api-key")
        if not api_key:
            return make_response(jsonify({"error": "Missing API key"}), 401)

        # --- Check if token is blacklisted ---
        if blacklist.find_one({"token": token}):
            return make_response(jsonify({"error": "Token has been blacklisted"}), 401)

        try:
            # Decode the JWT
            decoded = jwt.decode(
                token, 
                SECRET_KEY, 
                algorithms=["HS256"])
            
            # Get the user from the decoded JWT
            username = decoded.get("user")

            # Find user and confirm API key matches the user who owns this token
            user = users.find_one({"username": username})
            if not user:
                return make_response(jsonify({"error": "User not found"}), 404)

            if user["api_key"] != api_key:
                return make_response(jsonify({"error": "Invalid API key"}), 403)
            
            if not user.get("active", True):
                return make_response(jsonify({"error": "Account is deactivated"}), 403)

            # If everything is authenticated, attach user info to the request context
            request.user = user

        # Exceptions
        except jwt.ExpiredSignatureError:
            return make_response(jsonify({"error": "JWT token expired"}), 401)
        except jwt.InvalidTokenError:
            return make_response(jsonify({"error": "Invalid JWT token"}), 401)
        except Exception as e:
            return make_response(jsonify({"error": f"Authentication error: {str(e)}"}), 500)

        return func(*args, **kwargs)
    return wrapper

# --- ADMIN REQUIRED WRAPPER ---
def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        #Get user attribute from request object
        user = getattr(request, "user", None)
        if not user or not user.get("admin"):
            return make_response(jsonify({"error": "Admin privileges required"}), 403)
        
        return func(*args, **kwargs)
    return wrapper
