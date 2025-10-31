# --- Imports ---
from datetime import datetime, timedelta, timezone
from bson import ObjectId
import math
from globals import audit_logs
from utils.validation import validate_object_id
from interfaces.audit import IAuditService

class AuditService(IAuditService):
    """
    Concrete implementation of the IAuditService interface.
    Handles operations related to audit log retrieval, statistics, and cleanup.
    """
    def __init__(self, collection=audit_logs):
        """
        Initialize the AuditService with the audit_logs collection in the StreamVerseDB.
        """
        self.collection = collection

    def get_all_logs(self, page_num=1, page_size=10):
        try:
            # Fetch logs from MongoDB with most recent first and convert ID to JSON
            skip = (page_num - 1) * page_size
            logs = list(self.collection.find().sort("timestamp", -1).skip(skip).limit(page_size))
            for log in logs:
                log["_id"] = str(log["_id"])
    
            # Pagination stats    
            total_docs = self.collection.count_documents({})
            total_pages = math.ceil(total_docs / page_size)
    
            # Return data back to blueprint
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
    
    def get_audit_log_by_id(self, log_id):
        try:
            # Validate ObjectId
            if not validate_object_id(log_id):
                return {"error": "Invalid audit log ID format"}, 400
            
            # Attempt to find audit log by ID
            audit_log = self.collection.find_one({"_id": ObjectId(log_id)})
            if not audit_log:
                return {"error": f"Audit log with ID '{log_id}' not found"}, 404
            
            # Convert audit log to JSON and return back to blueprint
            audit_log["_id"] = str(audit_log["_id"])
            return audit_log, 200
        
        # General Exception
        except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500

    def get_audit_stats(self):
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
            summary = list(self.collection.aggregate(pipeline))
            for doc in summary:
                doc["admin"] = doc.pop("_id")
    
            # Return data back to blueprint
            return {
                "total_admins": len(summary),
                "summary": summary
            }, 200
            
        # General Exception
        except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500

    def prune_old_audit_logs(self, days=90):
        try:
            # Calculate the cutoff date
            cutoff = datetime.now(timezone.utc) - timedelta(days=days)
    
            # Delete old audit records from the collection
            deleted = self.collection.delete_many({"timestamp": {"$lt": cutoff}})
    
            # Return data back to blueprint
            return {
                "message": f"Deleted {deleted.deleted_count} old audit logs",
                "cutoff_date": cutoff.isoformat()
            }, 200
        
        # General Exception
        except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500
