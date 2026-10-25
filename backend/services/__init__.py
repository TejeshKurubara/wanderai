"""Database connection management. Model modules import get_db from here.

Submodules (user_model, trip_model) are intentionally NOT imported at the top of
this file, which keeps the package free of circular imports.
"""

import logging

from bson import ObjectId
from pymongo import MongoClient
from pymongo.errors import PyMongoError

from config import Config

logger = logging.getLogger(__name__)

_client = None


class DatabaseError(Exception):
    """Raised when the database is not configured or cannot be used."""


def get_client() -> MongoClient:
    global _client
    if _client is None:
        if not Config.MONGO_URI:
            raise DatabaseError("Database is not configured.")
        _client = MongoClient(
            Config.MONGO_URI,
            serverSelectionTimeoutMS=5000,
            tz_aware=True,
        )
    return _client


def get_db():
    return get_client()[Config.DB_NAME]


def to_object_id(value):
    """Convert a string to ObjectId, or return None if it is not a valid id."""
    if isinstance(value, ObjectId):
        return value
    if isinstance(value, str) and ObjectId.is_valid(value):
        return ObjectId(value)
    return None


def init_db() -> bool:
    """Check the connection and create indexes. Never raises; returns success."""
    try:
        get_client().admin.command("ping")

        # Imported here (not at module top) to avoid circular imports.
        from models.trip_model import ensure_indexes as ensure_trip_indexes
        from models.user_model import ensure_indexes as ensure_user_indexes

        ensure_user_indexes()
        ensure_trip_indexes()
        logger.info("MongoDB connected and indexes ensured.")
        return True
    except (DatabaseError, PyMongoError) as exc:
        logger.error(
            "MongoDB initialisation failed (%s). Check MONGO_URI and network access.",
            exc.__class__.__name__,
        )
        return False