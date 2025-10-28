# --- Imports ---
from flask import Flask
from blueprints.audit.audit import audit_bp
from blueprints.auth.auth import auth_bp
from blueprints.titles.titles import titles_bp
from blueprints.reviews.reviews import reviews_bp

# Create Flask app instance
app = Flask(__name__)

# Define base API prefix
API_PREFIX = "/api/v1.0/streamverse"

# Blueprints
app.register_blueprint(audit_bp, url_prefix=f"{API_PREFIX}/audit")
app.register_blueprint(auth_bp, url_prefix=f"{API_PREFIX}/auth")
app.register_blueprint(titles_bp, url_prefix=f"{API_PREFIX}/titles")
app.register_blueprint(reviews_bp, url_prefix=f"{API_PREFIX}/reviews")

# --- MAIN ENTRY POINT ---
if __name__ == "__main__":
    # Enable Flask debug mode and start the local server
    app.run(debug=True)