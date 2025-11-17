# --- Imports ---
from utils.response import api_response

# --- Get the Bearer token from Authorization Header of Request ---
def extract_bearer_from_auth_header(request):
    # Get Authorization Header
    auth_header = request.headers.get("Authorization")
    if not auth_header:
        return api_response({"error": "Missing Authorization header"}, 401)
    
    # Ensure bearer is in correct format
    if not auth_header.startswith("Bearer "):
        return api_response({"error": "Invalid Authorization header format. Expected 'Bearer <token>'"}, 401)
    
    # Extract token value after "Bearer "
    token = auth_header.split(" ")[1].strip()

    return token