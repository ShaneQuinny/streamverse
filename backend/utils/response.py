# --- Imports ---
from flask import jsonify, make_response

# --- Shared API Response ---
def api_response(data=None, status_code=200, success=None):
    # If no data is present for request body (e.g. 201 created response) store an empty body
    if data is None:
        data = {}

    # Return a success message determined by status code
    if success is None:
        success = 200 <= status_code < 400

    # Construct the request body based on if it was a successful request or not
    response_body = {
        "success": success,
        "data": data if success else {},
        "errors": data if not success else {}
    }

    # Make and return the response with the constructed body and status code
    return make_response(jsonify(response_body), status_code)
