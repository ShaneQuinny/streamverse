# --- Imports ---
from pymongo import MongoClient
from bson import ObjectId

# --- CONSTS ---
SECRET_KEY = "streamverse_secret"
MONGO_URL = "mongodb://127.0.0.1:27017"

# --- VALIDATE OBJECTID FORMAT ---
def validate_object_id(id):
    return ObjectId.is_valid(id)

# Connect to MongoDB running locally on default port 27017
client = MongoClient(MONGO_URL)

# Select the 'streamverseDB' database
db = client.streamverseDB

# Select the relevant collections from within the StreamVerse database
titles = db.titles
users = db.users
blacklist = db.blacklist
audit_log = db.audit_log

# --- Helper Method ---
def validate_object_id(id):
    return ObjectId.is_valid(id)