# --- Imports ---
from flask import Blueprint, request
from utils.register_routes import register_blueprint_routes
from decorators import jwt_required, admin_required, json_response
from utils.validation import validate_object_id
from utils.audit import log_admin_action, SYSTEM_ACTION
from datetime import datetime, timezone
from globals import titles
from bson import ObjectId
import math

"""
This blueprint manages all operations related to streaming titles within the StreamVerse API.
It provides endpoints for creating, retrieving, updating, and deleting titles, as well as 
advanced query functionality including pagination, filtering, and sorting. Additional routes 
offer more advanced insights such as rating averages, different genres, and top-reviewed titles.
The blueprint also supports generating tailored recommendations for users based on whatever 
the user wants to filter by.
"""

# --- Define Titles Blueprint ---
titles_bp = Blueprint("titles_bp", __name__)

# --- Get All Titles ---
def show_all_titles():
    try:
        # Extract pagination parameters (Default 1 and 10)
        page_num = int(request.args.get("pn", 1))
        page_size = int(request.args.get("ps", 10))
        skip = (page_num - 1) * page_size

        # Filtering
        query = construct_filtered_query(request)    

        # Sorting
        sort_field = request.args.get("sort_by", "title")
        sort_order = request.args.get("sort_order", "desc")
        sort_direction = 1 if sort_order == "asc" else -1 
        
        # Instantiate an array to return the titles
        titles_to_return = []

        # Fetch titles from collection with applied filters and sorting, then convert ObjectId to JSON string
        titles_cursor = titles.find(query).sort(sort_field, sort_direction).skip(skip).limit(page_size)
        for title in titles_cursor:
            title["_id"] = str(title["_id"])
            for review in title["reviews"]:
                review["_id"] = str(review["_id"])
            # Append to array
            titles_to_return.append(title)
        
        # Count and store results
        total_titles_filtered = titles.count_documents(query)
        total_all_titles = titles.count_documents({})
        total_pages = math.ceil(total_titles_filtered / page_size)
        
        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "page": page_num,
            "page_size": page_size,
            "total_pages": total_pages,
            "total_all_titles": total_all_titles,
            "total_titles_filtered": total_titles_filtered,
            "sorting_direction": sort_order,
            "titles": titles_to_return
        }, 200

    except Exception as e:
        return {"error": f"An error occurred: {str(e)}"}, 500

# --- Get Single Title ---
def show_one_title(title_id):
    try:
        # Ensure Valid ObjectId
        if not validate_object_id(title_id):
            return {"error": "Invalid title ID format"}, 400
        
        # Attempt to find title by ObjectId
        title = titles.find_one({"_id": ObjectId(title_id)})
        if not title:
            return {"error": "No title found with that ID"}, 404
        
        # Convert ObjectId to JSON string
        title["_id"] = str(title["_id"])
        for review in title["reviews"]:
            review["_id"] = str(review["_id"])
        
        # Return the raw response data and status code to the json_response wrapper to be serialized
        return title, 200

    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Get All Titles ---
def get_all_titles():
    data_to_return = []
    for title in titles.find():
        title['_id'] = str(title['_id'])
        for review in title['reviews']:
            review['_id'] = str( review['_id'] )
        data_to_return.append(title)
    return data_to_return, 200 
    
# --- Create New Title ---
def add_title():
    try:
        # Get the username of the user creating the title
        username = request.user["username"]

        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}

        # Validate required fields
        required_fields = ["type", "title", "cast", "release_year", "rating", "genres", 
                           "description", "directors", "languages", "duration_in_mins",
                           "imdb_rating", "rotten_tomatoes_score"]
        missing = [field for field in required_fields if field not in data or not data[field]]
        if missing:
            return {"error": f"Missing required fields: {', '.join(missing)}"}, 400
        
        # Build the new title document
        new_title = {
            "type": data.get("type").strip(),
            "title": data.get("title").strip(),
            "cast": data.get("cast"),
            "release_year": int(data.get("release_year")),
            "rating": data.get("rating").strip(),
            "genres": data.get("genres"), 
            "description": data.get("description").strip(),
            "directors": data.get("directors",),
            "countries": data.get("countries", []),  
            "languages": data.get("languages"),
            "duration_in_mins": int(data.get("duration_in_mins")),
            "available_on": data.get("available_on", []),
            "filming_locations": data.get("filming_locations", []),
            "subtitles_available": data.get("subtitles_available", []),
            "imdb_rating": float(data.get("imdb_rating")),
            "rotten_tomatoes_score": float(data.get("rotten_tomatoes_score")),
            "recommendations": data.get("recommendations", []),
            "reviews": [], 
            "awards": [], 
            "added_by": username,
            "added_at": datetime.now(timezone.utc).isoformat()
        }
    
        # Insert into MongoDB
        result = titles.insert_one(new_title)
        if not result.acknowledged:
            return {"error": "Title could not be added. Contact an admin for further investigation."}, 500
        
        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "message": "Title added successfully",
            "id": str(result.inserted_id)
        }, 201
    
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500
    
# --- Edit Existing Title ---
def edit_title(title_id):
    try:
        # Get JSON data from the request body
        data = request.get_json(silent=True) or {}

        # Get the username of the user creating the title
        username = request.user["username"]

        # Ensure Valid ObjectId
        if not validate_object_id(title_id):
            return {"error": "Invalid title ID format"}, 400
        
        # Find existing title
        title = titles.find_one({"_id": ObjectId(title_id)})
        if not title:
            return {"error": "No title found with that ID"}, 404
        
        # Validate required fields to be updated
        required_fields = ["type", "title", "cast", "release_year", "rating", "genres", 
                           "description", "directors", "languages", "duration_in_mins",
                           "imdb_rating", "rotten_tomatoes_score"]
        missing = [field for field in required_fields if field not in data or not data[field]]
        if missing:
            return {"error": f"Missing required fields: {', '.join(missing)}"}, 400
        
        # Add last updated by and last updated at metadata
        data["last_updated_by"] = username
        data["last_updated_at"] = datetime.now(timezone.utc).isoformat()
        
        # Update the title document ensure all changes were applied to user document
        result = titles.update_one({"_id": ObjectId(title_id)}, {"$set": data})
        if result.matched_count == 0:
            return {"message": "No updates were applied. Contact an admin for further investigation."}, 500

        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {
            "message": "Title updated successfully",
            "id": title_id
        }, 200
            
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Delete Title ---
def delete_title(title_id):
    try:
        # Get the current admin username
        current_admin = request.user["username"]

        # Ensure Valid ObjectId
        if not validate_object_id(title_id):
            return {"error": "Invalid title ID format"}, 400
        
        # Attempt to find document by ObjectId
        title = titles.find_one({"_id": ObjectId(title_id)})
        if not title:
            return {"error": "No title found with that ID"}, 404
        
        # Ensure title was deleted
        result = titles.delete_one({"_id": ObjectId(title_id)})
        if result.deleted_count == 0:
            return {"error": "Deletion failed unexpectedly. Investigate database collection for further information."}, 500
        
        # Log delete action for auditing purposes
        log_admin_action(current_admin, "delete_title", SYSTEM_ACTION, 
            {"action": f"deleted title '{title.get('title')}' from 'titles' collection"})
        
        # Return the raw response data and status code to the json_response wrapper to be serialized
        return {}, 204

    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Get Rating Stats ---
def get_rating_stats():
    try:  
        # Calculate average IMDb and Rotten Tomatoes ratings across all titles in the collection
        pipeline = [
            {"$group": {
                "_id": 0,
                "avg_imdb_rating": {"$avg": "$imdb_rating"},
                "avg_rotten_tomatoes": {"$avg": "$rotten_tomatoes_score"},
                "count": {"$sum": 1}
            }}
        ]

        # Execute aggregation pipeline and return the result to be serialized 
        result = list(titles.aggregate(pipeline))
        return {"rating_stats": result}, 200
    
    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Get Titles by Genre Count ---
def get_titles_by_genre_count():
    try:
        # Extract pagination parameters (Default 1 and 10)
        page_num = int(request.args.get("pn", 1))
        page_size = int(request.args.get("ps", 10))
        skip = (page_num - 1) * page_size

        # Sorting (Default desc)
        sort_order = request.args.get("sort_order", "desc")
        sort_direction = 1 if sort_order == "asc" else -1 

        # Count how many titles belong to each genre within the collection
        pipeline = [
            {"$unwind": "$genres"},
            {"$group": {"_id": "$genres", "count": {"$sum": 1}}},
            {"$sort": {"count": sort_direction}}
        ]

        # Execute aggregation pipeline and store genre stats
        all_genres = list(titles.aggregate(pipeline))
        total_genres = len(all_genres)
        total_pages = math.ceil(total_genres / page_size)

        # Add pagination
        paginated_pipeline = pipeline + [
            {"$skip": skip},
            {"$limit": page_size}
        ]

        # Execute aggregation pipeline for paginated results and return to be serialized 
        result = list(titles.aggregate(paginated_pipeline))
        return {
            "page": page_num,
            "page_size": page_size,
            "total_pages": total_pages,
            "total_genres": total_genres,
            "sort_order": sort_order,
            "genre_count": result
        }, 200

    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500
    
# --- Get Top Reviewed Titles ---
def get_top_reviewed_titles():
    try:
        # Extract pagination parameters (Default 1 and 10)
        page_num = int(request.args.get("pn", 1))
        page_size = int(request.args.get("ps", 10))
        skip = (page_num - 1) * page_size

        # Sorting (Default desc)
        sort_order = request.args.get("sort_order", "desc")
        sort_direction = 1 if sort_order == "asc" else -1 

        # Count total number of documents that have reviews
        total_titles = titles.count_documents({"reviews": {"$exists": True}})
        total_pages = math.ceil(total_titles / page_size)

        # Find the top reviewed titles with the highest number of reviews with pagniation
        pipeline = [
            {"$project": {"_id": 1, "title": 1, "review_count": {"$size": "$reviews"}}},
            {"$sort": {"review_count": sort_direction}},
            {"$skip": skip},
            {"$limit": page_size}
        ]

        # Execute aggregation pipeline for paginated results and return to be serialized 
        result = list(titles.aggregate(pipeline))
        for doc in result:
            doc["_id"] = str(doc["_id"])

        return {
            "page": page_num,
            "page_size": page_size,
            "total_pages": total_pages,
            "total_titles": total_titles,
            "sorting_direction": sort_order,
            "top_reviewed_titles": result
        }, 200

    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500

# --- Get Tailored Recommendations For Titles ---
def get_tailored_recommendations(title_id):
    try:
        # Extract pagination parameters (Default 1 and 10)
        page_num = int(request.args.get("pn", 1))
        page_size = int(request.args.get("ps", 10))
        skip = (page_num - 1) * page_size

        # Sorting (Default imbd_rating and desc)
        sort_field = request.args.get("sort_by", "imdb_rating")
        sort_order = request.args.get("sort_order", "desc")
        sort_direction = 1 if sort_order == "asc" else -1 

        # Validate ID
        if not validate_object_id(title_id):
            return {"error": "Invalid title ID format"}, 400

        # Fetch the title to build tailored recommendations
        title = titles.find_one({"_id": ObjectId(title_id)})
        if not title:
            return {"error": "No title found with that ID"}, 404

        # Get recommendation stats
        genres = title.get("genres", [])
        cast = title.get("cast", [])
        imdb_score = title.get("imdb_rating", 0)
        rating = title.get("rating", "")

        # Construct query for get similar titles
        query = {
            "_id": {"$ne": ObjectId(title_id)}, 
            "$or": [
                {"genres": {"$in": genres}},    
                {"cast": {"$in": cast}}    
            ],
            "imdb_rating": {"$gte": imdb_score - 0.5, "$lte": imdb_score + 0.5},
            "rating": rating
        }

        # Fetch similar titles with the titles collection
        similar_titles = list(titles.find(query, {"_id": 0, "title": 1, "imdb_rating": 1, "genres": 1, "cast": 1})
                  .sort(sort_field, sort_direction)
                  .skip(skip)
                  .limit(page_size)
        )

        # Count and store results
        total_recommendations = titles.count_documents(query)
        total_pages = math.ceil(total_recommendations / page_size)

        # Include title recommendations suggested already
        standard_recommendations = title.get("recommendations", [])
        return {
            "page": page_num,
            "page_size": page_size,
            "total_pages": total_pages,
            "title": title["title"],
            "total_recommendations": total_recommendations,
            "tailored_recommendations": similar_titles,
            "user_recommendations": standard_recommendations,     
            "sorting_direction": sort_order,
        }, 200

    except Exception as e:
        return {"error": f"Server error: {str(e)}"}, 500
    
# --- Helper: Get filtering options and construct the query
def construct_filtered_query(request):
    # Extract filters
    type_filter = request.args.get("type", "all")
    cast_filter = request.args.get("cast", "all")
    release_year_filter = request.args.get("release_year", "all")
    rating_filter = request.args.get("rating", "all")
    genre_filter = request.args.get("genre", "all")
    director_filter = request.args.get("director", "all")
    country_filter = request.args.get("country", "all")
    duration_filter = request.args.get("duration", "all")
    available_on_filter = request.args.get("available_on", "all")
    imdb_rating_filter = request.args.get("imdb_rating", "all")
    rotten_tomatoes_score_filter = request.args.get("rotten_tomatoes_score", "all")
    language_filter = request.args.get("languages", "all")
    subtitles_available_filter = request.args.get("subtitles_available", "all")

    # Build query
    query = {}

    if type_filter.lower() != "all":
        query["type"] = type_filter
    if rating_filter.lower() != "all":
        query["rating"] = rating_filter.upper()
    if cast_filter.lower() != "all":
        query["cast"] = {"$in": [cast_filter]}
    if genre_filter.lower() != "all":
        query["genres"] = {"$in": [genre_filter]}
    if director_filter.lower() != "all":
        query["directors"] = {"$in": [director_filter]}
    if country_filter.lower() != "all":
        query["countries"] = {"$in": [country_filter]}
    if language_filter.lower() != "all":
        query["languages"] = {"$in": [language_filter]}
    if subtitles_available_filter.lower() != "all":
        query["subtitles_available"] = {"$in": [subtitles_available_filter]}
    if available_on_filter.lower() != "all":
        query["available_on"] = {"$elemMatch": {"platform": available_on_filter}}
    if release_year_filter.lower() != "all":
        if release_year_filter.startswith(">"):
            query["release_year"] = {"$gt": int(release_year_filter[1:])}
        elif release_year_filter.startswith("<"):
            query["release_year"] = {"$lt": int(release_year_filter[1:])}
        else:
            query["release_year"] = int(release_year_filter)
    if duration_filter.lower() != "all":
        if duration_filter.startswith(">"):
            query["duration_in_mins"] = {"$gt": int(duration_filter[1:])}
        elif duration_filter.startswith("<"):
            query["duration_in_mins"] = {"$lt": int(duration_filter[1:])}
        else:
            query["duration_in_mins"] = int(duration_filter)
    if imdb_rating_filter.lower() != "all":
        query["imdb_rating"] = {"$gte": float(imdb_rating_filter)}
    if rotten_tomatoes_score_filter.lower() != "all":
        query["rotten_tomatoes_score"] = {"$gte": float(rotten_tomatoes_score_filter)}

    # Return constructed query
    return query

    
# --- Route Definitions ---
titles_routes = [
    ("", "show_all_titles", ["GET"], [json_response]),
    ("/<string:title_id>", "show_one_title", ["GET"], [json_response]),
    ("/all", "get_all_titles", ["GET"], [json_response]),
    ("", "add_title", ["POST"], [jwt_required, json_response]),
    ("/<string:title_id>", "edit_title", ["PUT"], [jwt_required, json_response]),
    ("/<string:title_id>", "delete_title", ["DELETE"], [jwt_required, admin_required, json_response]),
    ("/stats/ratings", "get_rating_stats", ["GET"], [json_response]),
    ("/stats/genres", "get_titles_by_genre_count", ["GET"], [json_response]),
    ("/stats/top-reviewed", "get_top_reviewed_titles", ["GET"], [json_response]),
    ("/<string:title_id>/recommendations", "get_tailored_recommendations", ["GET"], [json_response])
]

# --- Generate Routes ---
register_blueprint_routes(titles_bp, titles_routes, globals())