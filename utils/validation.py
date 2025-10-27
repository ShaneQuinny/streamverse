# --- Imports ---
from bson import ObjectId

# --- Validate Object ID ---
def validate_object_id(id):
    return ObjectId.is_valid(id)