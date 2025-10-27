from globals import audit_log
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
    audit_log.insert_one(entry)