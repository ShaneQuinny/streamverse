from flask import Blueprint, request, make_response, jsonify
from decorators import jwt_required, admin_required
from globals import audit_log

audit_bp = Blueprint("audit_bp", __name__)

# --- View Audit Logs ---
@audit_bp.route("/api/v1.0/audit", methods=["GET"])
@jwt_required
@admin_required
def view_audit_logs():
    #
    page = int(request.args.get("page", 1))
    limit = int(request.args.get("limit", 20))
    skip = (page - 1) * limit

    #
    logs = list(audit_log.find().sort("timestamp", -1).skip(skip).limit(limit))
    for l in logs:
        l["_id"] = str(l["_id"])

    return make_response(jsonify({
        "page": page,
        "limit": limit,
        "total": audit_log.count_documents({}),
        "logs": logs
    }), 200)


# --- Audit Statistics ---
@audit_bp.route("/api/v1.0/audit/stats", methods=["GET"])
@jwt_required
@admin_required
def audit_stats():
    #
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
    #
    summary = list(audit_log.aggregate(pipeline))
    for doc in summary:
        doc["admin"] = doc.pop("_id")

    return make_response(jsonify({
        "total_admins": len(summary),
        "summary": summary
    }), 200)