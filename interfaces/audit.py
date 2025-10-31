# --- Imports ---
from abc import ABC, abstractmethod

class IAuditService(ABC):
    """
    Interface for an Audit Service that provides methods to manage and retrieve audit logs.
    """

    @abstractmethod
    def get_all_logs(self, page_num: int, page_size: int):
        """
        Retrieve a paginated list of all audit logs.
        """
        pass

    @abstractmethod
    def get_audit_log_by_id(self, log_id: str):
        """
        Retrieve a single audit log entry by its unique identifier.
        """
        pass

    @abstractmethod
    def get_audit_stats(self):
        """
        Retrieve summary statistics or aggregated data about audit logs.
        """
        pass

    @abstractmethod
    def prune_old_audit_logs(self, days: int):
        """
        Delete audit logs older than the specified number of days.
        """
        pass