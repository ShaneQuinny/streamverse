# --- Imports ---
from flask import request, jsonify, make_response
import jwt
from functools import wraps
from globals import SECRET_KEY, VALID_ISSUERS, blacklist, users
from datetime import datetime, timezone
from utils.response import api_response

# --- JWT Required Wrapper ---
def jwt_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Check for JWT in request headers
        token = request.headers.get("x-access-token")
        if not token:
            return make_response(jsonify({"error": "Missing JWT token"}), 401)

        # Check for API key in request headers
        api_key = request.headers.get("x-api-key")
        if not api_key:
            return make_response(jsonify({"error": "Missing API key"}), 401)

        try:
            # Decode the JWT
            decoded = jwt.decode(
                token, 
                SECRET_KEY, 
                algorithms=["HS256"])
            
            # Check for blacklisted token by jti 
            if blacklist.find_one({"jti": decoded["jti"]}):
                return make_response(jsonify({"error": "Token has been blacklisted"}), 401)
            
            # Allow only access tokens
            if decoded.get("type") != "access":
                return make_response(jsonify({"error": "Invalid token type"}), 403)
            
            # Ensure token is valid for use
            now = datetime.now(timezone.utc)
            if decoded.get("nbf") and now < datetime.fromtimestamp(decoded["nbf"], timezone.utc):
                return make_response(jsonify({"error": "Token not yet valid"}), 401)
            
            # Verify issuer
            if decoded.get("iss") not in VALID_ISSUERS:
                return make_response(jsonify({
                    "error": f"Invalid token issuer: {decoded.get('iss')}"}), 403)

            # Get the user from the decoded JWT
            username = decoded.get("user")

            # Find user and confirm API key matches the user who owns this token
            user = users.find_one({"username": username})
            if not user:
                return make_response(jsonify({"error": "User not found"}), 404)

            # Ensure user has correct API key
            if user["api_key"] != api_key:
                return make_response(jsonify({"error": "Invalid API key"}), 403)
            
            # Ensure user is active
            if not user.get("active", True):
                return make_response(jsonify({"error": "Account is deactivated"}), 403)

            # If everything is authenticated, attach user info to the request context
            request.user = user
            request.jwt_id = decoded["jti"]

        # Exceptions
        except jwt.ExpiredSignatureError:
            return make_response(jsonify({"error": "JWT token expired"}), 401)
        except jwt.InvalidTokenError:
            return make_response(jsonify({"error": "Invalid JWT token"}), 401)
        except Exception as e:
            return make_response(jsonify({"error": f"Authentication error: {str(e)}"}), 500)

        return func(*args, **kwargs)
    return wrapper

# --- Admin Required Wrapper ---
def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Get user attribute from request object (change?)
        user = getattr(request, "user", None)
        if not user or not user.get("admin"):
            return make_response(jsonify({"error": "Admin privileges required"}), 403)
        
        return func(*args, **kwargs)
    return wrapper

# --- Json Response Wrapper ---
def json_response(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Get the result and status code from function and return a json response
        result, status_code = func(*args, **kwargs)
        return api_response(result, status_code)
    return wrapper