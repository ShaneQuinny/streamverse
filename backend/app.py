# --- Imports ---
from flask import Flask
from globals import API_VERSION
from blueprints.audit.audit import audit_bp
from blueprints.auth.auth import auth_bp
from blueprints.titles.titles import titles_bp
from blueprints.reviews.reviews import reviews_bp
from blueprints.health.health import health_bp
from blueprints.users.users import users_bp

# Create Flask app instance
app = Flask(__name__)

# Define base API prefix
API_PREFIX = f"/api/v{API_VERSION}"

# Register Blueprints
app.register_blueprint(audit_bp, url_prefix=f"{API_PREFIX}/audit")
app.register_blueprint(auth_bp, url_prefix=f"{API_PREFIX}/auth")
app.register_blueprint(health_bp, url_prefix=f"{API_PREFIX}/health")
app.register_blueprint(reviews_bp, url_prefix=f"{API_PREFIX}/titles")
app.register_blueprint(titles_bp, url_prefix=f"{API_PREFIX}/titles")
app.register_blueprint(users_bp, url_prefix=f"{API_PREFIX}/users")

# --- MAIN ENTRY POINT ---
if __name__ == "__main__":
    # Enable Flask debug mode and start the local server
    app.run(debug=True)