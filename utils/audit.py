from globals import audit_logs
from datetime import datetime, timezone

# --- LOG ADMIN ACTIONS ---
def log_admin_action(admin_username, action, target_user, details=None):
    entry = {
        "admin": admin_username,
        "action": action,
        "target_user": target_user,
        "details": details or {},
        "timestamp": datetime.now(timezone.utc).isoformat()
    }
    audit_logs.insert_one(entry)