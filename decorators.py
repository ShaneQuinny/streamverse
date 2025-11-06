# --- Imports ---
from flask import request
import jwt
from functools import wraps
from globals import SECRET_KEY, blacklist, users
from datetime import datetime, timezone
from utils.response import api_response

# --- JWT Required Wrapper ---
def jwt_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Check for JWT in request headers
        token = request.headers.get("Bearer")
        if not token:
            return api_response({"error": "Missing JWT token"}, 401)

        try:
            # Decode the JWT
            decoded = jwt.decode(
                token, 
                SECRET_KEY, 
                algorithms=["HS256"])
            
            # Check for blacklisted token by jti 
            if blacklist.find_one({"jti": decoded["jti"]}):
                return api_response({"error": "Token has been blacklisted"}, 401)
            
            # Allow only access tokens
            if decoded.get("type") != "access":
                return api_response({"error": "Invalid token type"}, 403)
            
            # Ensure token is valid for use
            now = datetime.now(timezone.utc)
            if decoded.get("nbf") and now < datetime.fromtimestamp(decoded["nbf"], timezone.utc):
                return api_response({"error": "Token not yet valid"}, 401)

            # Get the user from the decoded JWT
            username = decoded.get("user")

            # Attempt to find user who owns this token
            user = users.find_one({"username": username})
            if not user:
                return api_response({"error": "User not found"}, 404)
            
            # Ensure user is active
            if not user.get("active", True):
                return api_response({"error": "Account is deactivated"}, 403)

            # If everything is authenticated, attach user info to the request context
            request.user = user
            request.jwt_id = decoded["jti"]

        # Exceptions
        except jwt.ExpiredSignatureError:
            return api_response({"error": "JWT token expired"}, 401)
        except jwt.InvalidIssuerError:
            return api_response({"error": "Invalid token issuer"}, 403)
        except jwt.InvalidIssuedAtError:
            return api_response({"error": "Invalid token issued-at time"}, 403)
        except jwt.InvalidTokenError:
            return api_response({"error": "Invalid token"}, 401)
        except Exception as e:
            return api_response({"error": f"Server error: {str(e)}"}, 500)

        return func(*args, **kwargs)
    return wrapper

# --- Admin Required Wrapper ---
def admin_required(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        try:
            # Get user attribute from request object
            user = getattr(request, "user", None)
            if not user or not user.get("admin"):
                return api_response({"error": "Admin privileges required"}, 403)

            return func(*args, **kwargs)
        
        # General Exception
        except Exception as e:
            return api_response({"error": f"Server error: {str(e)}"}, 500)
    return wrapper

# --- Json Response Wrapper ---
def json_response(func):
    @wraps(func)
    def wrapper(*args, **kwargs):
        # Get the result and status code from function and return a json response
        result, status_code = func(*args, **kwargs)
        return api_response(result, status_code)
    return wrapper