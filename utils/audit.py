# --- Imports ---
from globals import audit_logs
from datetime import datetime, timezone

# System Constant
SYSTEM_ACTION = "system"

# --- LOG ADMIN ACTIONS ---
def log_admin_action(admin_username, action, target_user, details=None):
    # Create log entry and insert into audit_logs collection
    entry = {
        "admin": admin_username,
        "action": action,
        "target_user": target_user,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    audit_logs.insert_one(entry)