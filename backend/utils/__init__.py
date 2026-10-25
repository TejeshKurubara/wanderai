from flask import jsonify

def success_response(message: str, data: dict = None, status_code: int = 200):
    """Generate a standard JSON success response."""
    response = {"success": True, "message": message}
    if data is not None:
        response["data"] = data
    return jsonify(response), status_code

def error_response(message: str, status_code: int = 400, errors: dict = None):
    """Generate a standard JSON error response."""
    response = {"success": False, "message": message}
    if errors is not None:
        response["errors"] = errors
    return jsonify(response), status_code