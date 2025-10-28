# --- Imports ---
from pymongo import MongoClient
from flask import request

# --- CONSTS ---
SECRET_KEY = "streamverse_secret"
MONGO_URL = "mongodb://127.0.0.1:27017"
VALID_ISSUERS = [
    "http://localhost:5000/api/v1.0/streamverse/auth/login",
    "http://localhost:5000/api/v1.0/streamverse/auth/token/refresh"
]
TOKEN_EXPIRY = {
    "access_minutes": 30,   # Access tokens last 30 minutes
    "refresh_days": 7       # Refresh tokens last 7 days
}

# Connect to MongoDB running locally on default port 27017
client = MongoClient(MONGO_URL)

# Select the 'streamverseDB' database
db = client.streamverseDB

# Select the relevant collections from within the StreamVerse database
audit_logs = db.audit_logs
blacklist = db.blacklist
titles = db.titles
users = db.users