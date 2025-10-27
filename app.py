# --- Imports ---
from flask import Flask
from blueprints.audit.audit import audit_bp
from blueprints.auth.auth import auth_bp
from blueprints.reviews.reviews import reviews_bp
from blueprints.titles.titles import titles_bp

# Create Flask app instance
app = Flask(__name__)

# Blueprints
app.register_blueprint(audit_bp)
app.register_blueprint(auth_bp)
app.register_blueprint(reviews_bp)
app.register_blueprint(titles_bp)

# --- MAIN ENTRY POINT ---
if __name__ == "__main__":
    # Enable Flask debug mode and start the local server
    app.run(debug=True)