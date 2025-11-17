StreamVerse API Documentation
The StreamVerse API is a full-featured RESTful web service built using Flask and MongoDB, designed for managing and exploring a dynamic library of movies and TV series.
It implements secure JWT-based authentication, supports role-based access control (Admin / Registered User / Public), and provides extensive CRUD functionality with advanced search, analytics, and audit tracking features.

Purpose
StreamVerse allows users to:
- Browse and filter a collection of movies and shows
- Submit and manage reviews
- Retrieve tailored recommendations
- Track platform availability (Netflix, Prime, etc.)
- Support administrative features for full dataset control
It is designed as a high-functionality API, demonstrating complex data operations, secure design, and API scalability.

Authentication
StreamVerse uses a JWT + API key dual-layer security model for all protected endpoints.
Public Endpoints: Accessible to everyone (no token required).
Registered User Endpoints: Require a valid Bearer: JWT access_token.
Admin Endpoints: Restricted to administrator accounts with elevated privileges.

All tokens include claims for:
user – the username of the authenticated account
admin – Boolean indicating elevated permissions
type – Token type (access or refresh)
iss, iat, exp – Standard JWT claims
jti: Unique JWT Identifier

Access tokens expire after 30 minutes, while refresh tokens remain valid for 7 days.

Core Features
- Modular Blueprint Architecture: Each functional area (Auth, Titles, Reviews, Users, Audit, Health) is encapsulated for maintainability.
- Role-based Authorization: Distinct control for Admins and Registered Users.
- MongoDB Aggregations: Used for analytics endpoints like stats/ratings and stats/genres.
- Audit Logging: Every admin action (e.g., delete, update, deactivate) is logged automatically for auditing purpose.
- Comprehensive Validation: Input validation for ObjectIds, JSON payloads, and field constraints.
- Pagination, Filtering & Sorting: Available across all list-based endpoints for scalability.
- Error Handling: Unified, descriptive error messages and status codes for consistent client interaction.

Folder Breakdown

- Authentication
Handles user registration, login, logout, and token refresh.
Everyone / Registered User / Admin
- User Management (Admin Only)
Admin-exclusive controls for viewing, updating, activating/deactivating, and deleting users.
Admin
- Titles
Main dataset endpoints for CRUD operations, stats, and recommendations.
Everyone / Registered User / Admin
- Reviews
Manages user-generated reviews for each title, with restricted admin deletion.
Everyone / Registered User / Admin
- Audit
Tracks and analyzes all admin activity within the API (view, filter, prune).
Admin
- HealthCheck
Monitors API uptime, version, and database connection.
Everyone

Example Usage Flow
1. Register a new user via POST /auth/register.
2. Login to obtain both access and refresh tokens.
3. Use the Bearer: JWT access_token header to:
4. Browse titles and reviews.
5. Create or update reviews.
6. Retrieve recommendations.

Admins can:
1. Manage users (/users endpoints).
2. View or prune audit logs.
3. Remove inappropriate content.
4. Monitor system health at /health to confirm uptime and database connectivity.

Developer Notes
All timestamps are returned in UTC ISO 8601 format.
All IDs are MongoDB ObjectIds, represented as strings in JSON.
Each request response follows a consistent schema: { "message": "...", "data": {...} } where applicable.


Authored by
Shane Quinn
Coursework: CW1