# --- Imports ---
from flask import Blueprint, request
from utils.register_routes import register_blueprint_routes
from decorators import jwt_required, admin_required, json_response
from bson import ObjectId
from globals import titles
from utils.audit import log_admin_action
from utils.validation import validate_object_id
from datetime import datetime, timezone

"""
This blueprint manages all operations related to title reviews within the StreamVerse API.
It allows authenticated users to create, edit, and view reviews for individual titles,
while providing admins with the ability to delete reviews.
Endpoints include functionality for retrieving all reviews for a title, fetching a single review,
adding new user reviews, updating existing ones, and removing inappropriate or outdated reviews.
"""

# Define Titles Blueprint and Service
reviews_bp = Blueprint("reviews_bp", __name__)

# --- Get All Reviews For a Business ---
def show_all_reviews_for_title(title_id):
    try:     
        # Ensure Valid ObjectId
        if not validate_object_id(title_id):
            return {"error": "Invalid title ID format"}, 400
        
        # Attempt to find title by ObjectId
        title = titles.find_one({"_id": ObjectId(title_id)}, {"title": 1, "reviews": 1, "_id": 0})
        if not title:
            return {"error": "No title found with that ID"}, 404
        
        # Ensure title has reviews
        all_reviews_for_title = title.get("reviews", [])
        if not all_reviews_for_title:
            return {
                "message": f"The title '{title["title"]}' currently has no reviews.",
                "reviews": []
            }, 200

        # Initialize list to store formatted reviews
        reviews_to_return = []

        # Convert review ObjectIds to strings and append to array
        for review in title["reviews"]:
            review["_id"] = str(review["_id"])
            reviews_to_return.append(review)

        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "message": f"Reviews for title '{title["title"]}'",
            "reviews": reviews_to_return
        }, 200
        
    except Exception as e:
        return {"error": f"An error occurred: {str(e)}"}, 500

# --- Get Single Title Review ---
def fetch_one_review(title_id, review_id):
    # Get and return data and status code from service class
    try:
        # Validate title ID
        if not validate_object_id(title_id):
            return {"error": "Invalid title ID format"}, 400

        # Validate title review ID
        if not validate_object_id(review_id):
            return {"error": "Invalid title review ID format"}, 400
    
        # Attempt to find title by ObjectId
        title = titles.find_one({"_id": ObjectId(title_id)})
        if not title:
            return {"error": "No title found with ID"}, 404
    
        # Attempt to find and ensure review exists 
        titleReview = titles.find_one({"reviews._id": ObjectId(review_id)}, {"reviews.$": 1, "_id": 0})
        if not titleReview:
            return {"error": "No review found with ID"}, 404
        
        # Serialize review ID and return raw response and status code to be serialized by json_response wrapper
        review = titleReview["reviews"][0]
        review["_id"] = str(review["_id"])
        return review, 200

    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Create New Review For Title ---
def add_new_review(title_id):
    try:
        # Get the username of the user creating the review
        username = request.user["username"]

        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}

        # Validate title ID
        if not validate_object_id(title_id):
            return {"error": "Invalid title ID format"}, 400
        
        # Validate required fields      
        required = ["comment", "rating"]
        missing = [field for field in required if field not in data or not data[field]]
        if missing:
            return {"error": f"Missing fields: {', '.join(missing)}"}, 400
        
        # Build new review document
        new_review = {
            "_id": ObjectId(),
            "username": username,
            "comment": data["comment"].strip(),
            "rating": float(data["rating"]),
            "date": datetime.now(timezone.utc).isoformat()
        }

        # Push the review into the title reviews array
        result = titles.update_one({"_id": ObjectId(title_id)}, {"$push": {"reviews": new_review}})
        if result.matched_count == 0:
            return {"error": "Review could not be added. Contact an admin for further investigation."}, 500
        
        # Return raw response and status code to be serialized by json_response wrapper
        return {
            "message": "Review added",
            "id": str(new_review["_id"])
        }, 201
        
    # General Exception
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Update Existing Review For Title ---
def edit_review(title_id, review_id):
    try:    
        # Get the username of the user updating the review
        username = request.user["username"]

        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}
        
        # Ensure Valid ObjectId
        if not validate_object_id(title_id):
            return {"error": "Invalid title ID format"}, 400
        
        # Validate title review ID
        if not validate_object_id(review_id):
            return {"error": "Invalid title review ID format"}, 400
        
        # Attempt to find title by ObjectId
        title = titles.find_one({"_id": ObjectId(title_id)}, {"_id": 1, "title": 1})
        if not title:
            return {"error": "No title found with ID"}, 404
        
        # Attempt to find and ensure review exists 
        titleReview = titles.find_one({"reviews._id": ObjectId(review_id)}, {"reviews.$": 1, "_id": 0})
        if not titleReview:
            return {"error": "No review found with ID"}, 404
        
        # Validate required fields      
        required = ["comment", "rating"]
        missing = [field for field in required if field not in data or not data[field]]
        if missing:
            return {"error": f"Missing fields: {', '.join(missing)}"}, 400
        
        # Build an updated review document with new values
        edited_review = {
            "reviews.$.username": username,
            "reviews.$.comment": data["comment"].strip(),
            "reviews.$.rating": float(data["rating"]),
            "reviews.$.last_updated_by": username,
            "reviews.$.last_updated_at": datetime.now(timezone.utc).isoformat()
        }
        
        # Apply the updates to the review and ensure that the review was successfully updated
        result = titles.update_one({"_id": ObjectId(title_id), "reviews._id": ObjectId(review_id)}, {"$set": edited_review})
        if result.matched_count == 0:
            return {"error": "Review could not be updated. Contact an admin for further investigation."}, 500
        
        # Return raw response and status code to be serialized by json_response wrapper
        return {
            "message": f"Review updated for title '{title["title"]}'",
            "id": review_id
        }, 200
        
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Delete Review For Title ---
def delete_review(title_id, review_id):
    try:
        # Get the current admin username
        current_admin = request.user["username"]

        # Validate title ID
        if not validate_object_id(title_id):
            return {"error": "Invalid title ID format"}, 400

        # Validate title review ID
        if not validate_object_id(review_id):
            return {"error": "Invalid title review ID format"}, 400
        
        # Attempt to find title by ObjectId
        title = titles.find_one({"_id": ObjectId(title_id)}, {"_id": 1, "title": 1})
        if not title:
            return {"error": "No title found with ID"}, 404
        
        # Attempt to find and ensure review exists 
        titleReview = titles.find_one({"reviews._id": ObjectId(review_id)}, {"reviews.$": 1, "_id": 0})
        if not titleReview:
            return {"error": "No review found with ID"}, 404
        
        # Remove the review from the title and ensure that the review was successfully deleted
        result = titles.update_one({"_id": ObjectId(title_id)},{"$pull": {"reviews": {"_id": ObjectId(review_id)}}})
        if result.modified_count == 0:
            return {"error": "Review could not be deleted. Investigate database collection for further information."}, 500
        
        # Log delete action for auditing purposes and return raw response and status code to be serialized by json_response wrapper
        log_admin_action(current_admin, "delete_review", review_id,
            {"action": f"deleted review '{review_id}' ID for title '{title["title"]}'"})            
        return {}, 204
            
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Route Definitions ---
reviews_routes = [
    ("/<string:title_id>/reviews", "show_all_reviews_for_title", ["GET"], [json_response]),
    ("/<string:title_id>/reviews/<string:review_id>", "fetch_one_review", ["GET"], [json_response]),
    ("/<string:title_id>/reviews", "add_new_review", ["POST"], [jwt_required, json_response]),
    ("/<string:title_id>/reviews/<string:review_id>", "edit_review", ["PUT"], [jwt_required, json_response]),
    ("/<string:title_id>/reviews/<string:review_id>", "delete_review", ["DELETE"], [jwt_required, admin_required, json_response])
]

# --- Generate Routes ---
register_blueprint_routes(reviews_bp, reviews_routes, globals())