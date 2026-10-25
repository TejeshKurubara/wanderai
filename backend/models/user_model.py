"""User data operations (collection: users)."""

from datetime import datetime, timezone

from pymongo.errors import DuplicateKeyError
from werkzeug.security import check_password_hash, generate_password_hash

from models import get_db, to_object_id


class DuplicateEmailError(Exception):
    """Raised when registering an email that already exists."""


def _users():
    return get_db()["users"]


def ensure_indexes():
    _users().create_index("email", unique=True)


def normalize_email(email: str) -> str:
    return (email or "").strip().lower()


def create_user(name: str, email: str, password: str) -> dict:
    """Create a user with a hashed password. Raises DuplicateEmailError."""
    email = normalize_email(email)
    if _users().find_one({"email": email}, {"_id": 1}):
        raise DuplicateEmailError()

    now = datetime.now(timezone.utc)
    document = {
        "name": name.strip(),
        "email": email,
        "password_hash": generate_password_hash(password),
        "created_at": now,
        "updated_at": now,
    }
    try:
        result = _users().insert_one(document)
    except DuplicateKeyError:  # race condition / unique index
        raise DuplicateEmailError()

    document["_id"] = result.inserted_id
    return document


def find_user_by_email(email: str):
    return _users().find_one({"email": normalize_email(email)})


def find_user_by_id(user_id: str):
    oid = to_object_id(user_id)
    if oid is None:
        return None
    return _users().find_one({"_id": oid})


def verify_password(user: dict, password: str) -> bool:
    return check_password_hash(user.get("password_hash", ""), password)


def serialize_user(user: dict) -> dict:
    """Public representation of a user. Never includes the password hash."""
    created_at = user.get("created_at")
    return {
        "id": str(user["_id"]),
        "name": user.get("name", ""),
        "email": user.get("email", ""),
        "created_at": created_at.isoformat() if created_at else None,
    }