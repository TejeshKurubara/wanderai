"""Authentication endpoints: /api/auth/*"""

import re

from flask import Blueprint, request

from models.user_model import (
    DuplicateEmailError,
    create_user,
    find_user_by_email,
    find_user_by_id,
    serialize_user,
    verify_password,
)
from utils import error_response, success_response
from utils.auth import generate_token, get_current_user_id, token_required

auth_bp = Blueprint("auth", __name__, url_prefix="/api/auth")

EMAIL_REGEX = re.compile(r"^[A-Za-z0-9._%+\-]+@[A-Za-z0-9.\-]+\.[A-Za-z]{2,}$")


def _json_body():
    data = request.get_json(silent=True)
    return data if isinstance(data, dict) else None


@auth_bp.route("/register", methods=["POST"])
def register():
    data = _json_body()
    if data is None:
        return error_response("Request body must be valid JSON.", 400)

    name = data.get("name")
    email = data.get("email")
    password = data.get("password")

    errors = {}
    if not isinstance(name, str) or not (2 <= len(name.strip()) <= 80):
        errors["name"] = "Name is required (2-80 characters)."
    if not isinstance(email, str) or len(email.strip()) > 254 or not EMAIL_REGEX.match(email.strip()):
        errors["email"] = "A valid email address is required."
    if (
        not isinstance(password, str)
        or not (8 <= len(password) <= 128)
        or not re.search(r"[A-Za-z]", password)
        or not re.search(r"\d", password)
    ):
        errors["password"] = "Password must be 8-128 characters and include a letter and a number."
    if errors:
        return error_response("Validation failed.", 400, errors)

    try:
        user = create_user(name, email, password)
    except DuplicateEmailError:
        return error_response("An account with this email already exists.", 409)

    token = generate_token(str(user["_id"]))
    return success_response(
        "Registration successful.",
        {"user": serialize_user(user), "token": token},
        201,
    )


@auth_bp.route("/login", methods=["POST"])
def login():
    data = _json_body()
    if data is None:
        return error_response("Request body must be valid JSON.", 400)

    email = data.get("email")
    password = data.get("password")
    if not isinstance(email, str) or not email.strip() or not isinstance(password, str) or not password:
        return error_response("Email and password are required.", 400)

    user = find_user_by_email(email)
    if user is None or not verify_password(user, password):
        return error_response("Invalid email or password.", 401)

    token = generate_token(str(user["_id"]))
    return success_response(
        "Login successful.",
        {"user": serialize_user(user), "token": token},
    )


@auth_bp.route("/me", methods=["GET"])
@token_required
def me():
    user = find_user_by_id(get_current_user_id())
    if user is None:
        return error_response("User no longer exists.", 401)
    return success_response("User fetched successfully.", {"user": serialize_user(user)})