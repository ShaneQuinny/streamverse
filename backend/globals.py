# --- Imports ---
from pymongo import MongoClient

# --- CONSTS ---
SECRET_KEY = "9d2a4a1a5f8444a3bb6a18e79b676af0d0738f15e7a66dfb2cd7a7d65b60cccb" # Generated from: https://jwtsecrets.com/
MONGO_URL = "mongodb://127.0.0.1:27017"
TOKEN_EXPIRY = {
    "access_minutes": 30,   # Access tokens last 30 minutes
    "refresh_days": 7       # Refresh tokens last 7 days
}
API_VERSION = "1.0"

# Connect to MongoDB running locally on default port 27017
client = MongoClient(MONGO_URL)

# Select the 'streamverseDB' database
db = client.streamverseDB

# Select the relevant collections from within the StreamVerse database
audit_logs = db.audit_logs
blacklist = db.blacklist
titles = db.titles
users = db.users