# --- Imports ---
from flask import Blueprint, request
from datetime import datetime, timedelta, timezone
from globals import SECRET_KEY, TOKEN_EXPIRY, users, blacklist
from email_validator import validate_email, EmailNotValidError
from decorators import jwt_required, json_response
from utils.register_routes import register_blueprint_routes
from utils.extract_bearer_header import extract_bearer_from_auth_header
import bcrypt, jwt, uuid

"""
This blueprint manages user authentication and authorization within the StreamVerse API.
It allows users to register, log in, log out, and refresh access tokens while ensuring
secure handling of passwords, API keys, and JWTs, including token blacklisting.
"""

# --- Define Auth Blueprint ---
auth_bp = Blueprint("auth_bp", __name__)

# --- Register User ---
def register():
    try:
        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}

        # Validate required fields 
        required_fields = ["username", "fullname", "email", "password"]
        missing = [field for field in required_fields if not data.get(field) or not str(data.get(field)).strip()]
        if missing:
            return {"error": f"Missing or empty field(s): {', '.join(missing)}"}, 400

        # Normalize and validate input data
        username = data["username"].strip().lower()
        fullname = data["fullname"].strip()
        email = data["email"].strip().lower()
        password = data["password"].strip()
        validate_email(email)

        # Check for existing user
        existing_user = users.find_one(
            {"$or": [{"username": username}, {"email": email}]},
            {"username": 1, "email": 1, "_id": 0}
        )

        # Return response based on field already in use (if any)
        if existing_user:
            if existing_user.get("username") == username:
                return {"error": "Username already in use"}, 409
            if existing_user.get("email") == email:
                return {"error": "Email already in use"}, 409

        # Hash the password securely
        hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())

        # Build the user document
        new_user = {
            "username": username,
            "fullname": fullname,
            "email": email,
            "password": hashed_pw,
            "admin": False,  # always false by default
            "active": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        }

        # Insert into user collection
        users.insert_one(new_user)

        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "message": "User registered successfully",
            "username": username
        }, 201
        
    #Exceptions
    except EmailNotValidError as e:
        return {"error": f"Invalid email address: {str(e)}"}, 400
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500
    
# --- Login ---
def login():
    try:
        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}

        # Get credentials
        username = (data.get("username") or "").strip().lower()
        password = (data.get("password") or "").strip()

        # Validate required fields and collect missing ones
        missing = []
        if not username:
            missing.append("username")
        if not password:
            missing.append("password")
        if missing:
            return {"error": f"Missing required field(s): {', '.join(missing)}"}, 400
        
        # Check user exists
        user = users.find_one({"username": username})
        if not user:
            return {"error": "Invalid username"}, 401

        # Check password match
        if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
            return {"error": "Incorrect password"}, 401

        # Ensure user is active
        if not user.get("active", True):
            return {"error": "Account is deactivated. Contact an administrator for further information."}, 403
        
        # Determine if a user is an admin
        admin = user.get("admin", False)

        # Assign an issuer to the token
        issuer = request.url

        # Generate JWT access token
        access_token = generate_token(
            username, 
            admin, 
            "access",
            issuer,
            minutes=TOKEN_EXPIRY["access_minutes"]
        )

        # Generate JWT refresh token
        refresh_token = generate_token(
            username,
            admin,
            "refresh",
            issuer,
            days=TOKEN_EXPIRY["refresh_days"]
        )

        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "message": "Login successful",
            "access_token": access_token,
            "expiration": int((datetime.now(timezone.utc) + timedelta(minutes=30)).timestamp()),
            "refresh_token": refresh_token
        }, 200
    
    # General Exception
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Logout ---
def logout():
    try:
        # Get access token from auth header
        token = extract_bearer_from_auth_header(request)

        # Decode token and get JTI and username to blacklist
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        jti = decoded.get("jti")
        username = decoded.get("user")

        # Check if already blacklisted
        if blacklist.find_one({"jti": jti}):
            return {"message": "Token already blacklisted"}, 200
        
        # Record token invalidation in blacklist collection with timestamp and username
        blacklist.insert_one({
            "jti": jti,
            "username": username,
            "blacklisted_at": datetime.now(timezone.utc).isoformat()
        })

        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {"message": "Logout successful"}, 200
        
    # General Exception
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Refresh Token ---
def refresh_token():
    try:
        # Get refresh token from JSON data in the request body
        data = request.get_json()
        token = data.get("refresh_token")
        if not token:
            return {"error": "Please provided refresh token in body of rqeuest"}, 400

        # Decode token and ensure it is a refresh token
        decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
        if decoded.get("type") != "refresh":
            return {"error": "Invalid refresh token type"}, 401
        
        # Check for blacklisted token by jti 
        if blacklist.find_one({"jti": decoded["jti"]}):
            return {"error": "Refresh token has been blacklisted"}, 401
        
        # Issue new access token
        new_access_token = generate_token(
            decoded["user"],
            decoded.get("admin", False),
            "access",
            request.url,
            minutes=TOKEN_EXPIRY["access_minutes"]
        )

        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {"access_token": new_access_token}, 200
        
    # Exceptions
    except jwt.ExpiredSignatureError:
        return {"error": "Refresh token expired"}, 401
    except jwt.InvalidIssuerError:
        return {"error": "Invalid token issuer"}, 403
    except jwt.InvalidIssuedAtError:
        return {"error": "Invalid token issued-at time"}, 403
    except jwt.InvalidTokenError:
        return {"error": "Invalid refresh token"}, 401
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Helper: Generate Tokens ---
def generate_token(username, admin, token_type, issuer, **expiration):
    try:
        # Current UTC time
        now = datetime.now(timezone.utc)
    
        # JWT payload data
        payload = {
            "user": username,
            "admin": admin,
            "type": token_type,
            "iss": issuer,
            "nbf": now,
            "iat": now,
            "exp": now + timedelta(**expiration),
            "jti": str(uuid.uuid4())
        }
    
        # Encode payload into JWT using secret key and return token
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")  
        return token

    # General Exception
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Route Definitions ---
auth_routes = [
    ("/register", "register", ["POST"], [json_response]),
    ("/login", "login", ["POST"], [json_response]),
    ("/logout", "logout", ["POST"], [jwt_required, json_response]),
    ("/token/refresh", "refresh_token", ["POST"], [json_response]),
]

# --- Generate Routes ---
register_blueprint_routes(auth_bp, auth_routes, globals())