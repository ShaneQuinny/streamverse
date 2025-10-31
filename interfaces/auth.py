# --- Imports ---
from abc import ABC, abstractmethod

class IAuthService(ABC):
    """
    Interface for an Authentication Service that defines methods
    for user registration, authentication, and user management.
    """

    @abstractmethod
    def register(self, data):
        """
        Register a new user account.
        """
        pass

    @abstractmethod
    def login(self, data, api_key, issuer):
        """
        Authenticate a user and issue access tokens.
        """
        pass

    @abstractmethod
    def logout(self, token):
        """
        Log out a user by invalidating their active access token.
        """
        pass

    @abstractmethod
    def get_all_users(self, page_num, page_size, status_filter, current_admin):
        """
        Retrieve a paginated list of all users, optionally filtered by status.
        """
        pass

    @abstractmethod
    def remove_user(self, username, current_admin):
        """
        Permanently remove a user from the system.
        """
        pass

    @abstractmethod
    def set_user_active_status(self, username, active, reason, current_admin):
        """
        Activate or deactivate a user account.
        """
        pass

    @abstractmethod
    def refresh_token(self, refresh_token, issuer):
        """
        Generate a new access token using a valid refresh token.
        """
        pass