# --- Imports ---
from flask import Flask
from blueprints.audit.audit import audit_bp
from blueprints.auth.auth import auth_bp
from blueprints.reviews.reviews import reviews_bp
from blueprints.titles.titles import titles_bp

# Create Flask app instance
app = Flask(__name__)

# Blueprints
app.register_blueprint(audit_bp, url_prefix="/api/v1.0/audit")
app.register_blueprint(auth_bp, url_prefix="/api/v1.0/auth")
app.register_blueprint(reviews_bp, url_prefix="/api/v1.0/reviews")
app.register_blueprint(titles_bp, url_prefix="/api/v1.0/titles")

# --- MAIN ENTRY POINT ---
if __name__ == "__main__":
    # Enable Flask debug mode and start the local server
    app.run(debug=True)