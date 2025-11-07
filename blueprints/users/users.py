# --- Imports ---
from flask import Blueprint, request
from decorators import jwt_required, admin_required, json_response
from globals import users
from utils.register_routes import register_blueprint_routes
from utils.audit import log_admin_action, SYSTEM_ACTION
from datetime import datetime, timezone
import bcrypt, math

"""
This blueprint manages all user admin operations within the StreamVerse API.
It allows admins to view, update, deactivate, reactivate, reset passwords,
and permanently remove user accounts, with full auditing of every admin action.
"""

# --- Define Users Blueprint ---
users_bp = Blueprint("users_bp", __name__)

# --- Get All Registered Users ---
def get_all_users():
    try:
        # Get the current admin username
        current_admin = request.user["username"]

        # Extract pagination parameters (Default 1 and 10)
        page_num = int(request.args.get("pn", 1))
        page_size = int(request.args.get("ps", 10))
        skip = (page_num - 1) * page_size

        # Filtering
        status_filter = request.args.get("account_status", "all").lower()
        user_role_filter = request.args.get("user_role", "all").lower()

        # Sorting
        sort_by = request.args.get("sort_by", "created_at")      
        sort_order = request.args.get("sort_order", "desc").lower()
        sort_direction = 1 if sort_order == "asc" else -1 

        # Construct the query with active/inactive filtering
        query = {}
        if status_filter in ("active", "inactive"):
            query["active"] = (status_filter == "active")

        # Filter by user role
        if user_role_filter != "all":
            if user_role_filter == "admin":
                query["admin"] = True
            else:
                query["admin"] = False
        
        
        # Fetch users (exclude sensitive fields) with pagination and filtering
        users_cursor = list(users.find(query, {"_id": 0, "password": 0}).sort(sort_by, sort_direction).skip(skip).limit(page_size))
    
        # Count and store results
        total_users_filtered = users.count_documents(query)
        total_all_users = users.count_documents({})
        total_pages = math.ceil(total_users_filtered / page_size)

        # Log view all users action for auditing purposes
        log_admin_action(current_admin, "view_all_users", SYSTEM_ACTION)

        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "page_num": page_num,
            "page_size": page_size,
            "total_pages": total_pages,
            "total_users": total_all_users,
            "total_filtered": total_users_filtered,
            "sorting_direction": sort_order,
            "users": users_cursor
        }, 200
        
    except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500

# --- Get Single Registered User ---  
def get_user(username):
    try:
        # Get the current admin username
        current_admin = request.user["username"]

        # Attempt to find the user (exclude sensitive fields)
        user = users.find_one({"username": username}, {"_id": 0, "password": 0})
        if not user:
            return {"error": f"User '{username}' not found."}, 404
        
        # Log get user action for auditing purposes
        log_admin_action(current_admin, "get_user", SYSTEM_ACTION, {"action": f"previewed user profile: {username}"})

        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {"user": user}, 200
        
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500       

# --- Update User Details ---
def update_user_details(username):
    try:
        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}

        # Get the current admin username
        current_admin = request.user["username"]

        # Attempt to find the user
        user = users.find_one({"username": username})
        if not user:
            return {"error": f"User '{username}' not found."}, 404
        
        # Build an updated review document with new values
        update_fields = {}

        # Handle username update and ensure the username isn't already taken
        if "username" in data:
            new_username = data["username"].strip().lower()
            if users.find_one({"username": new_username}):
                return {"message": "Username already exists"}, 409
            # Update username field with the new username if it has passed the check
            update_fields["username"] = new_username

        # Only update fields that are present in the request body
        if "email" in data:
            update_fields["email"] = data["email"]
        if "fullname" in data:
            update_fields["fullname"] = data["fullname"]
        if "admin" in data:
            update_fields["admin"] = bool(data["admin"])

        # Validate that there fields to be updated in the request body
        if not update_fields:
            return {"message": "No valid fields to update"}, 400
        
        # Get the current time for last updated at time
        now = datetime.now(timezone.utc).isoformat()

        # Add user updated at field for tracking change history 
        update_fields["last_updated_at"] = now
        
        # Update the user document and ensure all changes were applied
        result = users.update_one({"username": username}, {"$set": update_fields})
        if result.modified_count == 0:
            return {"message": f"No changes applied for user '{username}'. Contact admin for further investigation."}, 500
        
        # Store updated fields
        changed_fields = list(update_fields.keys())

        # Log get user action for auditing purposes
        log_admin_action(current_admin, "update_user", username, {"action": f"Updated user details. Fields updated: {changed_fields}."})
        
        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "message": f"User '{username}' updated successfully.",
            "changed_fields": changed_fields,
            "updated_at": now,
            "updated_username": new_username
        }, 200

    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Reset User Password ---
def reset_user_password(username):
    try:
        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}

        # Get the current admin username
        current_admin = request.user["username"]

        # Get the new password and confirmed password from the request body
        new_pw = data.get("new_password")
        confirm_pw = data.get("confirm_password")

        # Validate required fields and collect missing ones
        missing = []
        if not new_pw:
            missing.append("new_password")
        if not confirm_pw:
            missing.append("confirm_password")
        if missing:
            return {"error": f"Missing required field(s): {', '.join(missing)}"}, 400

        # Ensure passwords match
        if new_pw != confirm_pw:
            return {"message": "New passwords do not match"}, 400

        # Check user exists
        user = users.find_one({"username": username})
        if not user:
            return {"message": f"User '{username}' not found"}, 404

        # Hash the new password securely
        hashed_pw = bcrypt.hashpw(new_pw.encode("utf-8"), bcrypt.gensalt())

        # Get the current time for update metadata
        now = datetime.now(timezone.utc).isoformat()

        # Update the user document with the new password and other metadata
        result = users.update_one(
            {"username": username},
            {
                "$set": {
                    "password": hashed_pw,
                    "password_last_changed_at": now,
                    "last_updated_at": now
                }
            }
        )

        # Ensure all changes were applied to user document
        if result.modified_count == 0:
            return {"message": f"Updated password was not applied for user '{username}'. Contact admin for further investigation."}, 500
        
        # Log get user action for auditing purposes
        log_admin_action(current_admin, "reset_user_password", username, {"action": f"Reset user '{username}' password."})

        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "message": f"Password for user '{username}' reset successfully",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }, 200

    except Exception as e:
        return {"message": f"Server error: {str(e)}"}, 500

# --- Remove User ---
def remove_user(username):
    try:
        # Get the current admin username
        current_admin = request.user["username"]

        # Prevent the ability for admins to delete themselves
        if current_admin == username:
            return {"error": "Admins cannot delete their own account."}, 400
        
        # Attempt to find the user
        user = users.find_one({"username": username})
        if not user:
            return {"error": f"User '{username}' not found."}, 404
        
        # Delete the user document and ensure all user was successfully deleted
        result = users.delete_one({"username": username})
        if result.deleted_count == 0:
            return {"error": f"Failed to delete user '{username}'. Contact admin for further investigation."}, 500
            
        # Log delete action for auditing purposes 
        log_admin_action(current_admin, "delete_user", username, {"action": f"User '{username}' permanently deleted."})
        
        # Return No Content status code to the json_response wrapper to be serialized
        return {}, 204
    
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Reactivate User ---
def reactivate_user(username):
    # Get JSON data from the request body
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "No reason provided")

    # Get the current admin username
    current_admin = request.user["username"]

    # Return the raw response data and status code to the json_response wrapper to be serialized
    return set_user_active_status(username, True, reason, current_admin)

# --- Deactivate User ---
def deactivate_user(username):
    # Get JSON data from the request body
    data = request.get_json(silent=True) or {}
    reason = data.get("reason", "No reason provided")

    # Get the current admin username
    current_admin = request.user["username"]

    # Return the raw response data and status code to the json_response wrapper to be serialized
    return set_user_active_status(username, False, reason, current_admin)

# --- Helper: Set the user active status ---
def set_user_active_status(username, active, reason, current_admin):
    try:
        # Check if user exists
        user = users.find_one({"username": username})
        if not user:
            return {"error": f"User '{username}' not found."}, 404

        # Handle user active state
        if user.get("active", True) == active:
            state = "active" if active else "inactive"
            return {"message": f"User already {state}"}, 200

        # Update user depending of active status
        if active:
            # Reactivate the user
            update_fields = {"active": True}
            unset_fields = {"deactivated_at": "", "deactivation_reason": ""}

            # Construct the update query, action and message 
            update_query = {"$set": update_fields, "$unset": unset_fields}
            action = "reactivate_user"
            message = f"User '{username}' reactivated"
        else:
            # Deactivate the user
            update_fields = {
                "active": False,
                "deactivated_at": datetime.now(timezone.utc).isoformat(),
                "deactivation_reason": reason,
            }

            # Construct the update query, action and message 
            update_query = {"$set": update_fields}
            action = "deactivate_user"
            message = f"User '{username}' deactivated"

        # Update the user document and ensure all changes were applied
        result = users.update_one({"username": username}, update_query)
        if result.modified_count == 0:
            return {"message": f"No changes applied for user '{username}'. Contact admin for further investigation."}, 500

        # Log reactivation/deactivation action for auditing purposes
        log_admin_action(current_admin, action, username, {"reason": reason})
        
        # Construct the response body including the reason if the user is being deactivated
        response = {"message": message}
        if not active:
            response["reason"] = reason

        # Return the raw response data and status code to the json_response wrapper to be serialized
        return response, 200
    
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Route Definitions ---
users_routes = [
    ("/", "get_all_users", ["GET"], [jwt_required, admin_required, json_response]),
    ("/<string:username>", "get_user", ["GET"], [jwt_required, admin_required, json_response]),
    ("/<string:username>", "update_user_details", ["PATCH"], [jwt_required, admin_required, json_response]),
    ("/<string:username>/resetpassword", "reset_user_password", ["PUT"], [jwt_required, admin_required, json_response]),
    ("/<string:username>", "remove_user", ["DELETE"], [jwt_required, admin_required, json_response]),
    ("/<string:username>/reactivate", "reactivate_user", ["PATCH"], [jwt_required, admin_required, json_response]),
    ("/<string:username>/deactivate", "deactivate_user", ["PATCH"], [jwt_required, admin_required, json_response]),
]

# --- Generate Routes ---
register_blueprint_routes(users_bp, users_routes, globals())