# --- Imports ---
from datetime import datetime, timedelta, timezone
from email_validator import validate_email, EmailNotValidError
from globals import SECRET_KEY, TOKEN_EXPIRY, users, blacklist
from utils.audit import log_admin_action
from interfaces.auth import IAuthService
import bcrypt, jwt, secrets, uuid

class AuthService(IAuthService):
    """
    Concrete implementation of the IAuthService interface.
    Handles operations related to user registration, authentication, and user management.
    """
    def __init__(self, users_collection=users, blacklist_collection=blacklist):
        """
        Initialize the AuthService with the users and blacklist collection in the StreamVerseDB.
        """
        self.users = users_collection
        self.blacklist = blacklist_collection

    def register(self, data):
        try:
            # Validate required fields 
            required_fields = ["username", "fullname", "email", "password"]
            missing = [f for f in required_fields if not data.get(f) or not str(data.get(f)).strip()]
            if missing:
                return {"error": f"Missing or empty field(s): {', '.join(missing)}"}, 400
    
            # Normalize and validate input data
            username = data["username"].strip().lower()
            fullname = data["fullname"].strip()
            email = data["email"].strip().lower()
            password = data["password"].strip()
            validate_email(email)
    
            # Check for existing user
            existing_user = self.users.find_one(
                {"$or": [{"username": username}, {"email": email}]},
                {"username": 1, "email": 1, "_id": 0}
            )
    
            # Return response based on field already in use
            if existing_user:
                if existing_user.get("username") == username:
                    return {"error": "Username already in use"}, 409
                if existing_user.get("email") == email:
                    return {"error": "Email already in use"}, 409
    
            # Hash the password securely
            hashed_pw = bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt())
    
            # Generate a unique API key for the user
            api_key = secrets.token_hex(24)
    
            # Build the user document
            new_user = {
                "username": username,
                "fullname": fullname,
                "email": email,
                "password": hashed_pw,
                "admin": False,  # always false by default
                "api_key": api_key,
                "active": True,
                "created_at": datetime.now(timezone.utc).isoformat()
            }
    
            # Insert into user collection
            users.insert_one(new_user)
    
            # Return data back to blueprint
            return {
                "message": "User registered successfully",
                "username": username,
                "api_key": api_key,
                "info": "Take note of your unique API key for future requests."
            }, 201
        
        #Exceptions
        except EmailNotValidError as e:
            return {"error": f"Invalid email address: {str(e)}"}, 400
        except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500
        
    def login(self, data, api_key, issuer):
        try:
            # Get credentials
            username = (data.get("username") or "").strip().lower()
            password = (data.get("password") or "").strip()
    
            # Validate required fields and collect missing ones
            missing = []
            if not username:
                missing.append("username")
            if not password:
                missing.append("password")
            if not api_key:
                missing.append("x-api-key header")
            if missing:
                return {"error": f"Missing required field(s): {', '.join(missing)}"}, 400
            
            # Check user exists
            user = self.users.find_one({"username": username})
            if not user:
                return {"error": "Invalid username"}, 401
    
            # Check API key match
            if user["api_key"] != api_key:
                return {"error": "Invalid API key"}, 403
    
            # Check password match
            if not bcrypt.checkpw(password.encode("utf-8"), user["password"]):
                return {"error": "Incorrect password"}, 401
    
            # Ensure user is active
            if not user.get("active", True):
                return {"error": "Account is deactivated. Contact an administrator."}, 403
            
            # Determine if a user is an admin
            admin = user.get("admin", False)
    
            # Generate JWT access token
            access_token = self.generate_token(
                username, 
                admin, 
                "access",
                issuer,
                minutes=TOKEN_EXPIRY["access_minutes"]
            )
    
            # Generate JWT refresh token
            refresh_token = self.generate_token(
                username,
                admin,
                "refresh",
                issuer,
                days=TOKEN_EXPIRY["refresh_days"]
            )
    
            # Return data back to blueprint
            return {
                "message": "Login successful",
                "access_token": access_token,
                "expiration": int((datetime.now(timezone.utc) + timedelta(minutes=30)).timestamp()),
                "refresh_token": refresh_token
            }, 200
    
        # General Exception
        except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500
        
    def logout(self, token):
        try:
            # Decode token and get JTI and username to blacklist
            decoded = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
            jti = decoded.get("jti")
            username = decoded.get("user")
    
            # Check if already blacklisted
            if self.blacklist.find_one({"jti": jti}):
                return {"message": "Token already blacklisted"}, 200
            
            # Record token invalidation Iin blacklist collection with timestamp and user info
            self.blacklist.insert_one({
                "jti": jti,
                "username": username,
                "blacklisted_at": datetime.now(timezone.utc).isoformat()
            })
    
            # Return data back to blueprint
            return {"message": "Logout successful"}, 200
        
        # General Exception
        except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500
        
    def get_all_users(self, page_num, page_size, status_filter, current_admin):
        try:
            # Apply pagnination with active/inactive filtering
            skip = (page_num - 1) * page_size
            query = {}
            if status_filter == "active":
                query["active"] = True
            elif status_filter == "inactive":
                query["active"] = False
            
            # Fetch users (exclude sensitive fields)
            users_cursor = self.users.find(query, {"_id": 0, "password": 0}).sort("created_at", 1).skip(skip).limit(page_size)
        
            # Count and store results
            users_list = list(users_cursor)
            total_users = self.users.count_documents(query)
            total_all_users = self.users.count_documents({})
    
            # Log view all users action for auditing purposes and return data back to blueprint
            log_admin_action(current_admin, "view_all_users", "system")
            return {
                "page_num": page_num,
                "page_size": page_size,
                "total_filtered": total_users,
                "total_all": total_all_users,
                "status_filter": status_filter,
                "returned": len(users_list),
                "users": users_list
            }, 200
        
        # General Exception
        except Exception as e:
                return {"error": f"Server error: {str(e)}"}, 500
    
    def get_user(self, username, current_admin):
        try:
            # Attempt to find the user (exclude sensitive fields)
            user = self.users.find_one({"username": username}, {"_id": 0, "password": 0})
            if not user:
                return {"error": f"User '{username}' not found."}, 404
            
            # Log view all users action for auditing purposes and return data back to blueprint
            log_admin_action(current_admin, "get_user", "system", {"action": f"previewed user profile: {username}"})
            return {"user": user}, 200
        
        # General Exception
        except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500
        
    def remove_user(self, username, current_admin):
        try:
            # Prevent the ability for admins to delete themselves
            if current_admin == username:
                return {"error": "Admins cannot delete their own account."}, 400
            
            # Attempt to find the user
            user = self.users.find_one({"username": username})
            if not user:
                return {"error": f"User '{username}' not found."}, 404
            
            # Ensure user is set as deactive before deletion
            if user.get("active", True):
                return {"error": "User must be deactivated before deletion."}, 400
            
            # Delete the user document
            result = self.users.delete_one({"username": username})
            if result.deleted_count == 1:
                # Log delete action for auditing purposes and return data back to blueprint
                log_admin_action(current_admin, "delete_user", username)
                return {"message": f"User '{username}' deleted successfully."}, 200
            else:
                return {"error": "User deletion failed unexpectedly."}, 500
    
        # General Exception
        except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500
        
    def set_user_active_status(self, username, active, reason, current_admin):
        try:
            # Check if user exists
            user = self.users.find_one({"username": username})
            if not user:
                return {"error": "User not found"}, 404
    
            # Handle user active state
            if user.get("active", True) == active:
                state = "active" if active else "inactive"
                return {"message": f"User already {state}"}, 200
    
            # Prepare update operation
            if active:
                # Reactivate user
                update_fields = {"active": True}
                unset_fields = {"deactivated_at": "", "deactivation_reason": ""}
                update_query = {"$set": update_fields, "$unset": unset_fields}
                action = "reactivate_user"
                message = f"User '{username}' reactivated"
            else:
                # Deactivatie user
                update_fields = {
                    "active": False,
                    "deactivated_at": datetime.now(timezone.utc).isoformat(),
                    "deactivation_reason": reason,
                }
                update_query = {"$set": update_fields}
                action = "deactivate_user"
                message = f"User '{username}' deactivated"
    
            # Update user record
            result = self.users.update_one({"username": username}, update_query)
    
            if result.modified_count == 1:
                # Log the admin action for auditing
                log_admin_action(current_admin, action, username, {"reason": reason})
                response = {"message": message}
                if not active:
                    response["reason"] = reason
                return response, 200
            else:
                return {"error": "Failed to update user status unexpectedly."}, 500
    
        except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500
        
    def refresh_token(self, refresh_token, issuer):
        try:
            # Decode token and ensure it is a refresh token
            decoded = jwt.decode(refresh_token, SECRET_KEY, algorithms=["HS256"])
            if decoded.get("type") != "refresh":
                return {"message": "Invalid refresh token type"}, 401
            
            # Check for blacklisted token by jti 
            if self.blacklist.find_one({"jti": decoded["jti"]}):
                return {"error": "Refresh token has been blacklisted"}, 401
            
            # Issue new access token
            new_access_token = self.generate_token(
                decoded["user"],
                decoded.get("admin", False),
                "access",
                issuer,
                minutes=TOKEN_EXPIRY["access_minutes"]
            )
    
            # Return access token back to blueprint
            return {"access_token": new_access_token}, 200
        
        # Exceptions
        except jwt.ExpiredSignatureError:
            return {"message": "Refresh token expired"}, 401
        except jwt.InvalidTokenError:
            return {"message": "Invalid refresh token"}, 401
        except Exception as e:
            return {"error": f"Server error: {str(e)}"}, 500
    
    def generate_token(self, username, admin, token_type, issuer, **expiration):
        # Current UTC time
        now = datetime.now(timezone.utc)
    
        # JWT payload data
        payload = {
            "user": username,
            "admin": admin,
            "type": token_type,
            "iss": issuer,
            "nbf": now,
            "iat": now,
            "exp": now + timedelta(**expiration),
            "jti": str(uuid.uuid4())
        }
    
        # Encode payload into JWT using secret key and return token
        token = jwt.encode(payload, SECRET_KEY, algorithm="HS256")  
        return token