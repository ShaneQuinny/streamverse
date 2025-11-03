# --- Imports ---
from flask import Blueprint, request, make_response, jsonify
from decorators import jwt_required, admin_required
from utils.register_routes import register_blueprint_routes
from services.auth import AuthService

# --- Define Auth Blueprint and Service ---
auth_bp = Blueprint("auth_bp", __name__)
auth_service = AuthService()

# --- Register User ---
def register():
    # Get JSON data from the request body
    data = request.get_json(silent=True) or {}

    # Get and return data and status code from service class
    result, statusCode = auth_service.register(data)
    return make_response(jsonify(result), statusCode)
    
# --- Login ---
def login():
    # Get JSON data from the request body and API key in header
    data = request.get_json(silent=True) or {}
    api_key = request.headers.get("x-api-key")
    issuer = request.url

    # Get and return data and status code from service class
    result, statusCode = auth_service.login(data, api_key, issuer)
    return make_response(jsonify(result), statusCode)

# --- Logout ---
def logout():
    # Get access token from header
    token = request.headers.get("x-access-token")

    # Get and return data and status code from service class
    result, statusCode = auth_service.logout(token)
    return make_response(jsonify(result), statusCode)
    
# --- Get All Registered Users (ADMIN ONLY) ---
def get_all_users():
    # Pagination and filterparameters 
    pn = int(request.args.get("pn", 1))
    ps = int(request.args.get("ps", 10))
    status_filter = request.args.get("account_status", "all").lower()

    # Get and return data and status code from service class
    result, statusCode = auth_service.get_all_users(pn, ps, status_filter, request.user["username"])
    return make_response(jsonify(result), statusCode)

# --- Get Single Registered User (ADMIN ONLY) ---  
def get_user(username):
     # Get and return data and status code from service class
    result, statusCode = auth_service.get_user(username, request.user["username"])
    return make_response(jsonify(result), statusCode)

# --- Remove User (ADMIN ONLY) ---
def remove_user(username):
    # Get and return data and status code from service class
    result, statusCode = auth_service.remove_user(username, request.user["username"])
    return make_response(jsonify(result), statusCode)

# --- Reactivate User (ADMIN ONLY) ---
def reactivate_user(username):
    # Get JSON data from the request body
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "No reason provided")

    # Get and return data and status code from service class
    result, statusCode = auth_service.set_user_active_status(username, True, reason, request.user["username"])
    return make_response(jsonify(result), statusCode)

# --- Deactivate User (ADMIN ONLY) ---
def deactivate_user(username):
    # Get JSON data from the request body
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "No reason provided")

    # Get and return data and status code from service class
    result, statusCode = auth_service.set_user_active_status(username, False, reason, request.user["username"])
    return make_response(jsonify(result), statusCode)

# --- Refresh Token ---
def refresh_token():
    # Get refresh token from JSON data in the request body
    data = request.get_json()
    token = data.get("refresh_token")
    issuer = request.url

    # Get and return data and status code from service class
    result, statusCode = auth_service.refresh_token(token, issuer)
    return make_response(jsonify(result), statusCode)

# --- Route Definitions ---
auth_routes = [
    ("/register", "register", ["POST"], []),
    ("/login", "login", ["POST"], []),
    ("/logout", "logout", ["POST"], [jwt_required]),
    ("/users", "get_all_users", ["GET"], [jwt_required, admin_required]),
    ("/users/<string:username>", "get_user", ["GET"], [jwt_required, admin_required]),
    ("/users/<string:username>", "remove_user", ["DELETE"], [jwt_required, admin_required]),
    ("/users/<string:username>/reactivate", "reactivate_user", ["PATCH"], [jwt_required, admin_required]),
    ("/users/<string:username>/deactivate", "deactivate_user", ["PATCH"], [jwt_required, admin_required]),
    ("/token/refresh", "refresh_token", ["POST"], []),
]

# --- Generate Routes ---
register_blueprint_routes(auth_bp, auth_routes, globals())