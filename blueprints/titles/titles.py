# --- Imports ---
from flask import Blueprint, request, jsonify, make_response
from bson import ObjectId
from globals import titles, validate_object_id

# --- Define Titles Blueprint ---
titles_bp = Blueprint("titles_bp", __name__)

# --- GET ALL TITLES ---
@titles_bp.route("/api/v1.0/titles", methods=["GET"])
def show_all_titles():
    try:
        # Pagination
        page_num = int(request.args.get("pn", 1))
        page_size = int(request.args.get("ps", 10))
        skip = (page_num - 1) * page_size

        # Optional sorting
        sort_field = request.args.get("sort", "title")
        sort_order = request.args.get("order", "asc")
        sort_direction = 1 if sort_order.lower() == "asc" else -1

        # Optional filtering (e.g. ?genre=Drama)
        query = {}
        if request.args.get("genre"):
            query["genres"] = {"$regex": request.args.get("genre"), "$options": "i"}
        if request.args.get("type"):
            query["type"] = request.args.get("type")

        # Fetch results
        cursor = titles.find(query).sort(sort_field, sort_direction).skip(skip).limit(page_size)
        results = []
        for title in cursor:
            title["_id"] = str(title["_id"])
            for review in title.get("reviews", []):
                if isinstance(review.get("_id"), ObjectId):
                    review["_id"] = str(review["_id"])
            results.append(title)

        # Meta info for pagination
        total_docs = titles.count_documents(query)
        total_pages = (total_docs + page_size - 1) // page_size

        response = {
            "page": page_num,
            "page_size": page_size,
            "total_titles": total_docs,
            "total_pages": total_pages,
            "titles": results
        }

        return make_response(jsonify(response), 200)

    except Exception as e:
        return make_response(jsonify({"error": f"An error occurred: {str(e)}"}), 500)

# --- GET TITLE BY ID ---
@titles_bp.route("/api/v1.0/titles/<string:id>", methods=["GET"])
def show_one_title(id):
    try:
        # Validate ObjectId format early
        if not validate_object_id(id):
            return make_response(jsonify({"error": "Invalid title ID format"}), 400)

        # Optional field projection for selective retrieval
        projection = None
        if fields := request.args.get("fields"):
            projection = {f.strip(): 1 for f in fields.split(",")}
            projection["_id"] = 1  # Always include _id

        # Attempt to find document by ObjectId
        title = titles.find_one({"_id": ObjectId(id)}, projection)

        # Handle "not found" case gracefully
        if not title:
            return make_response(jsonify({"error": "No title found with that ID"}), 404)

        # Convert ObjectId fields for JSON serialization
        title["_id"] = str(title["_id"])
        for review in title.get("reviews", []):
            if isinstance(review.get("_id"), ObjectId):
                review["_id"] = str(review["_id"])

        # Add computed metadata, e.g. average review rating
        if title.get("reviews"):
            ratings = [r.get("rating") for r in title["reviews"] if isinstance(r.get("rating"), (int, float))]
            if ratings:
                title["average_review_rating"] = round(sum(ratings) / len(ratings), 1)

        # Return the result
        return make_response(jsonify(title), 200)

    except Exception as e:
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)
    
# --- CREATE NEW TITLE ---
@titles_bp.route("/api/v1.0/titles", methods=["POST"])
def add_title():
    try:
        # Accept either JSON or form data
        data = request.get_json(silent=True) or request.form

        # Validate required fields
        required_fields = ["title", "type", "year", "genres"]
        missing = [f for f in required_fields if f not in data or not data[f]]
        if missing:
            return make_response(jsonify({"error": f"Missing required fields: {', '.join(missing)}"}), 400)

        # Build the new title document
        new_title = {
            "title": data["title"].strip(),
            "type": data["type"].strip(),  # Movie / TV Show
            "year": int(data["year"]),
            "genres": [g.strip() for g in data.get("genres", "").split(",") if g.strip()],
            "countries": [c.strip() for c in data.get("countries", "").split(",") if c.strip()],
            "languages": [l.strip() for l in data.get("languages", "").split(",") if l.strip()],
            "available_on": [p.strip() for p in data.get("available_on", "").split(",") if p.strip()],
            "cast": [c.strip() for c in data.get("cast", "").split(",") if c.strip()],
            "directors": [d.strip() for d in data.get("directors", "").split(",") if d.strip()],
            "ratings": {
                "imdb": float(data.get("imdb", 0)),
                "rotten_tomatoes": float(data.get("rotten_tomatoes", 0))
            },
            "duration_in_mins": int(data.get("runtime_minutes", 0)),
            "maturity_rating": data.get("maturity_rating", "Unrated"),
            "subtitles": [s.strip() for s in data.get("subtitles", "").split(",") if s.strip()],
            "filming_locations": data.get("filming_locations"),  
            "reviews": [],
        }

        # Insert into MongoDB
        result = titles.insert_one(new_title)

        # Construct the resource link
        new_title_link = f"http://localhost:5000/api/v1.0/titles/{result.inserted_id}"

        # Return a successful response
        return make_response(jsonify({
            "message": "Title added successfully",
            "id": str(result.inserted_id),
            "url": new_title_link
        }), 201)

    except ValueError:
        # Handles invalid integer/float parsing
        return make_response(jsonify({"error": "Invalid numeric field format"}), 400)

    except Exception as e:
        # Handles general server errors gracefully
        return make_response(jsonify({"error": f"Server error: {str(e)}"}), 500)