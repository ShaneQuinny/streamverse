# --- Imports ---
from flask import Blueprint, request, make_response, jsonify
from decorators import jwt_required, admin_required
from utils.register_routes import register_blueprint_routes
from services.audit import AuditService

# --- Define Audit Blueprint and Service ---
audit_bp = Blueprint("audit_bp", __name__)
audit_service = AuditService()

# --- View All Audit Logs ---
def view_audit_logs():
    # Extract pagination parameters (Default 1 and 10)
    page_num = int(request.args.get("pn", 1))
    page_size = int(request.args.get("ps", 10))

    # Get and return data and status code from service class
    result, statusCode = audit_service.get_all_logs(page_num, page_size)
    return make_response(jsonify(result), statusCode)

# --- GET SINGLE AUDIT LOG BY ID ---
def get_audit_log(log_id):
    # Get and return data and status code from service class
    result, statusCode = audit_service.get_audit_log_by_id(log_id)
    return make_response(jsonify(result), statusCode)

# --- View Audit Statistics ---
def view_audit_stats():
    # Get and return data and status code from service class
    result, statusCode = audit_service.get_audit_stats()
    return make_response(jsonify(result), statusCode)

# --- DELETE OLD AUDIT LOGS ---
def prune_audit_logs():
    # Extract and determine cutoff timestamp (Default 90 days)
    days = int(request.args.get("days", 90))

    # Get and return data and status code from service class
    result, statusCode = audit_service.prune_audit_logs(days)
    return make_response(jsonify(result), statusCode)

# --- Route Definitions ---
audit_routes = [
    ("/", "view_audit_logs", ["GET"], [jwt_required, admin_required]),
    ("/<string:log_id>", "get_audit_log", ["GET"], [jwt_required, admin_required]),
    ("/stats", "view_audit_stats", ["GET"], [jwt_required, admin_required]),
    ("/prune", "prune_audit_logs", ["DELETE"], [jwt_required, admin_required]),
]

# --- Generate Routes ---
register_blueprint_routes(audit_bp, audit_routes, globals())