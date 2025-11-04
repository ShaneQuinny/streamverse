# --- Imports ---
from flask import Blueprint
from utils.register_routes import register_blueprint_routes
from datetime import datetime, timezone
from globals import db, API_VERSION
from decorators import json_response

"""
This blueprint provides system health monitoring for the StreamVerse API.
It reports the current API version, uptime, and MongoDB connection status,
allowing quick verification of overall service availability.
"""

# --- Define Health Blueprint ---
health_bp = Blueprint("health_bp", __name__)

# --- Define the app start time ---
APP_START_TIME = datetime.now(timezone.utc)

# --- Health Check Endpoint ---
def health_check():
    try:
        # Check MongoDB Connection
        db_status = "Connected"
        try:
            db.list_collection_names()
        except Exception:
            db_status = "Disconnected"

        # Determine overall health status 
        overall_status = "Healthy" if db_status == "Connected" else "Unhealthy"

        # Calculate API uptime 
        current_time = datetime.now(timezone.utc)
        uptime_seconds = (current_time - APP_START_TIME).total_seconds()
        uptime_minutes = round(uptime_seconds / 60, 2)

        # Build health info
        health_info = {
            "status": overall_status,
            "api_version": API_VERSION,
            "database_status": db_status,
            "uptime": {
                "seconds": round(uptime_seconds, 2),
                "minutes": uptime_minutes
            },
            "timestamp_utc": current_time.isoformat()
        }

        # Return the raw health info data and status code to the json_response wrapper to be serialized
        if overall_status == "Healthy":
            return health_info, 200
        else:
            # If the the status is "Unhealthy" due to MongoDB connectivity, return health info and "Service Unavailable"
            return health_info, 503

    # General Exception
    except Exception as e:
        return {
                "status": "Unhealthy",
                "api_version": API_VERSION,
                "message": f"Health check failed: {str(e)}"
            }, 500

# --- Route Definitions ---
health_routes = [
    ("", "health_check", ["GET"], [json_response])
]

# --- Generate Routes ---
register_blueprint_routes(health_bp, health_routes, globals())