
from datetime import datetime, timedelta, timezone
from functools import wraps

import jwt
from flask import g, request

from config import Config
from utils import error_response


def generate_token(user_id: str) -> str:
    """Create a signed JWT for the given user id."""
    now = datetime.now(timezone.utc)
    payload = {
        "sub": str(user_id),
        "iat": now,
        "exp": now + timedelta(hours=Config.JWT_EXPIRY_HOURS),
    }
    return jwt.encode(payload, Config.JWT_SECRET, algorithm=Config.JWT_ALGORITHM)


def decode_token(token: str) -> dict:
    """Verify signature and expiry. Raises jwt.PyJWTError subclasses on failure."""
    return jwt.decode(
        token,
        Config.JWT_SECRET,
        algorithms=[Config.JWT_ALGORITHM],
        options={"require": ["exp", "sub"]},
    )


def _extract_bearer_token():
    """Return (token, error_message). Expects 'Authorization: Bearer <token>'."""
    header = request.headers.get("Authorization", "").strip()
    if not header:
        return None, "Authentication token is missing."
    parts = header.split()
    if len(parts) != 2 or parts[0].lower() != "bearer":
        return None, "Malformed Authorization header. Use: Bearer <token>."
    return parts[1], None


def token_required(view):
    """Decorator for protected routes. Sets g.user_id on success."""

    @wraps(view)
    def wrapper(*args, **kwargs):
        token, problem = _extract_bearer_token()
        if problem:
            return error_response(problem, 401)
        try:
            payload = decode_token(token)
        except jwt.ExpiredSignatureError:
            return error_response("Token has expired. Please log in again.", 401)
        except jwt.PyJWTError:
            return error_response("Invalid authentication token.", 401)

        g.user_id = payload["sub"]
        return view(*args, **kwargs)

    return wrapper


def get_current_user_id() -> str:
    """User id of the authenticated request (use inside @token_required routes)."""
    return g.user_id