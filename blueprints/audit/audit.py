# --- Imports ---
from flask import Blueprint, request, make_response, jsonify
from decorators import jwt_required, admin_required
from globals import audit_logs
from utils.register_routes import register_blueprint_routes
from utils.validation import validate_object_id
from bson import ObjectId
from datetime import datetime, timedelta, timezone

# --- Define Audit Blueprint ---
audit_bp = Blueprint("audit_bp", __name__)

# --- Route Definitions ---
audit_routes = [
    ("/", "view_audit_logs", ["GET"], [jwt_required, admin_required]),
    ("/<string:log_id>", "get_audit_log", ["GET"], [jwt_required, admin_required]),
    ("/stats", "view_audit_stats", ["GET"], [jwt_required, admin_required]),
    ("/prune", "prune_audit_logs", ["DELETE"], [jwt_required, admin_required]),
]

# --- View All Audit Logs ---
def view_audit_logs():
    # Extract pagination parameters (Default 1 and 10)
    page_num = int(request.args.get("pn", 1))
    page_size = int(request.args.get("ps", 10))
    skip = (page_num - 1) * page_size

    # Fetch logs from MongoDB with most recent first and convert ID to JSON
    logs = list(audit_logs.find().sort("timestamp", -1).skip(skip).limit(page_size))
    for log in logs:
        log["_id"] = str(log["_id"])

    return make_response(jsonify({
        "page_num": page_num,
        "page_size": page_size,
        "total": audit_logs.count_documents({}),
        "audit_logs": logs
    }), 200)

# ---GET SINGLE AUDIT LOG BY ID ---
def get_audit_log(log_id):
    # Validate ObjectId
    if not validate_object_id(log_id):
        return make_response(jsonify({"error": "Invalid audit log ID format"}), 400)
    
    # Attempt to find audit log by ID
    audit_log = audit_logs.find_one({"_id": ObjectId(log_id)})
    if not audit_log:
        return make_response(jsonify({"error": f"Audit log with ID '{log_id}' not found"}), 404)

    # Convert audit log to JSON
    audit_log["_id"] = str(audit_log["_id"])
    return make_response(jsonify(audit_log), 200)

# --- View Audit Statistics ---
def view_audit_stats():
    # Counts actions per admin and sorts admins by total actions.
    pipeline = [
        {
            "$group": {
                "_id": {
                    "admin": "$admin",
                    "action": "$action"
                },
                "count": {"$sum": 1}
            }
        },
        {
            "$group": {
                "_id": "$_id.admin",
                "actions": {"$push": {"action": "$_id.action", "count": "$count"}},
                "total_actions": {"$sum": "$count"}
            }
        },
        {"$sort": {"total_actions": -1}}
    ]

    # Execute aggregation pipeline
    summary = list(audit_logs.aggregate(pipeline))
    for doc in summary:
        doc["admin"] = doc.pop("_id")

    return make_response(jsonify({
        "total_admins": len(summary),
        "summary": summary
    }), 200)

# --- DELETE OLD AUDIT LOGS ---
def prune_audit_logs():
    # Extract and determine cutoff timestamp (Default 90 days)
    days = int(request.args.get("days", 90))
    cutoff = datetime.now(timezone.utc) - timedelta(days=days)

    # Delete old audit records from the collection
    deleted = audit_logs.delete_many({"timestamp": {"$lt": cutoff}})
    return make_response(jsonify({
        "message": f"Deleted {deleted.deleted_count} old audit logs",
        "cutoff_date": cutoff.isoformat()
    }), 200)

# --- Generate Routes ---
register_blueprint_routes(audit_bp, audit_routes, globals())