# --- Imports ---
from flask import Blueprint, request
from decorators import jwt_required, admin_required, json_response
from utils.validation import validate_object_id
from utils.register_routes import register_blueprint_routes
from globals import audit_logs
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import math

"""
This blueprint manages all audit log operations within the StreamVerse API.
It allows administrators to view, analyze, and prune audit records generated
from admin actions throughout the system.
"""

# --- Define Audit Blueprint ---
audit_bp = Blueprint("audit_bp", __name__)

# --- View All Audit Logs ---
def view_audit_logs():
    try:
        # Extract pagination parameters (Default 1 and 10)
        page_num = int(request.args.get("pn", 1))
        page_size = int(request.args.get("ps", 10))
        skip = (page_num - 1) * page_size

        # Fetch logs from MongoDB with most recent first and convert ID to JSON string
        logs = list(audit_logs.find().sort("timestamp", -1).skip(skip).limit(page_size))
        for log in logs:
            log["_id"] = str(log["_id"])
    
        # Pagination stats    
        total_docs = audit_logs.count_documents({})
        total_pages = math.ceil(total_docs / page_size)
    
        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "page_num": page_num,
            "page_size": page_size,
            "total_audit_logs": total_docs,
            "total_pages": total_pages,
            "audit_logs": logs
        }, 200

    # General Exception
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- GET SINGLE AUDIT LOG BY ID ---
def get_audit_log(log_id):
    try:
        # Validate ObjectId
        if not validate_object_id(log_id):
            return {"error": "Invalid audit log ID format"}, 400
       
        # Attempt to find audit log by ID
        audit_log = audit_logs.find_one({"_id": ObjectId(log_id)})
        if not audit_log:
            return {"error": f"Audit log with ID '{log_id}' not found"}, 404
        
        # Return the raw response data (with ObjectId converted to string) and status code to the json_response wrapper to be serialized
        audit_log["_id"] = str(audit_log["_id"])
        return audit_log, 200
        
    # General Exception
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- View Audit Statistics ---
def view_audit_stats():
    try:
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
        auditStats = list(audit_logs.aggregate(pipeline))

        # Remove the ID field from the admin as it is not needed
        for doc in auditStats:
            doc["admin"] = doc.pop("_id")
    
        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "total_admins": len(auditStats),
            "summary": auditStats
        }, 200
            
    # General Exception
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Prune (Delete) Old Audit Logs ---
def prune_audit_logs():
    try: 
        # Extract and determine cutoff timestamp (Default 90 days)
        days = int(request.args.get("days", 90))

        # Calculate the cutoff date
        cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
        # Delete old audit records from the collection
        deleted = audit_logs.delete_many({"timestamp": {"$lt": cutoff}})
    
        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "message": f"Deleted {deleted.deleted_count} old audit logs",
            "cutoff_date": cutoff.isoformat()
        }, 200
        
    # General Exception
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Route Definitions ---
audit_routes = [
    ("/", "view_audit_logs", ["GET"], [jwt_required, admin_required, json_response]),
    ("/<string:log_id>", "get_audit_log", ["GET"], [jwt_required, admin_required, json_response]),
    ("/stats", "view_audit_stats", ["GET"], [jwt_required, admin_required, json_response]),
    ("/prune", "prune_audit_logs", ["DELETE"], [jwt_required, admin_required, json_response]),
]

# --- Generate Routes ---
register_blueprint_routes(audit_bp, audit_routes, globals())