import sqlite3
import threading
from logger import Logger

DATABASE_NAME = "ai_sec_scanner"
SEEN_FILES_TABLE = "seen_files"
SEEN_FILES_ALIASES = "seen_files_aliases"
LOGS_TABLE = "logs"

"""seen_files table schema:
CREATE TABLE seen_files (
    file_hash TEXT PRIMARY KEY,
    verdict TEXT NOT NULL,
    raw_response TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
"""

class DatabaseManager:
    def __init__(self, db_name=DATABASE_NAME):
        self.db_name = db_name
        self.conn = sqlite3.connect(f"{self.db_name}.db", check_same_thread=False)
        self.conn.row_factory = sqlite3.Row
        self.cursor = self.conn.cursor()
        self._lock = threading.Lock()

    def setup_tables(self):
        """Sets up the database tables if they do not exist.

        Uses the manager's own long-lived connection (self.conn / self.cursor) so
        the tables are created in the exact same database file that save_record()
        and lookup_file_hash() read from and write to.
        """

        Logger.debug("Setting up database tables", Logger.INFO)

        with self._lock:
            # Enable foreign key enforcement (SQLite disables it by default).
            # This is a per-connection setting, so it must be applied on self.conn.
            self.cursor.execute("PRAGMA foreign_keys = ON;")
            Logger.debug(
                "Enabling foreign key enforcement", Logger.INFO, Logger.VERBOSE
            )
            self.cursor.execute(f"""
                CREATE TABLE IF NOT EXISTS {SEEN_FILES_TABLE} (
                    file_hash TEXT PRIMARY KEY,
                    verdict TEXT NOT NULL,
                    raw_response TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                );
            """)
            Logger.debug(
                "Created seen_files table or already exists",
                Logger.SUCCESS,
                Logger.VERBOSE,
            )
            self.conn.commit()

        Logger.debug("Database tables setup complete", Logger.SUCCESS)

    def lookup_file_hash(self, file_hash):
        """Looks up a file hash in the seen_files table. returns the row if found, else None."""
        with self._lock:
            self.cursor.execute(
                f"SELECT * FROM {SEEN_FILES_TABLE} WHERE file_hash = ?", (file_hash,)
            )
            return self.cursor.fetchone()

    def save_record(self, file_hash, verdict, raw_response):
        """Saves a record to the seen_files table."""
        with self._lock:
            self.cursor.execute(
                f"INSERT OR REPLACE INTO {SEEN_FILES_TABLE} (file_hash, verdict, raw_response) VALUES (?, ?, ?)",
                (file_hash, verdict, raw_response),
            )
            self.conn.commit()

    def close_connection(self):
        with self._lock:
            self.cursor.close()
            self.conn.close()
