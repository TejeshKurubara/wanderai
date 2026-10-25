"""
Protected expense tracking and budget analytics endpoints: /api/trips/<trip_id>/expenses/*
"""

from flask import Blueprint, request
from models import trip_model, expense_model
from utils import error_response, success_response
from utils.auth import get_current_user_id, token_required

expenses_bp = Blueprint("expenses", __name__, url_prefix="/api/trips/<trip_id>/expenses")


@expenses_bp.route("", methods=["GET"])
@token_required
def list_expenses(trip_id):
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    expenses = expense_model.get_expenses_by_trip(user_id, trip_id)
    analytics = expense_model.get_trip_budget_analytics(user_id, trip_id, trip)
    return success_response(
        "Expenses fetched successfully.",
        {"expenses": expenses, "analytics": analytics, "count": len(expenses)},
    )


@expenses_bp.route("", methods=["POST"])
@token_required
def add_expense(trip_id):
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be valid JSON.", 400)

    try:
        amount = float(data.get("amount", 0))
        if amount <= 0:
            return error_response("Amount must be a positive number.", 400)
    except (TypeError, ValueError):
        return error_response("Amount must be a valid number.", 400)

    # Use trip currency if not provided
    if not data.get("currency"):
        data["currency"] = trip.get("currency", "INR")

    expense = expense_model.create_expense(user_id, trip_id, data)
    analytics = expense_model.get_trip_budget_analytics(user_id, trip_id, trip)
    return success_response("Expense added successfully.", {"expense": expense, "analytics": analytics}, 201)


@expenses_bp.route("/<expense_id>", methods=["PUT"])
@token_required
def update_expense_item(trip_id, expense_id):
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be valid JSON.", 400)

    updated = expense_model.update_expense(user_id, expense_id, data)
    if updated is None:
        return error_response("Expense not found or unauthorized.", 404)

    analytics = expense_model.get_trip_budget_analytics(user_id, trip_id, trip)
    return success_response("Expense updated successfully.", {"expense": updated, "analytics": analytics})


@expenses_bp.route("/<expense_id>", methods=["DELETE"])
@token_required
def delete_expense_item(trip_id, expense_id):
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    if not expense_model.delete_expense(user_id, expense_id):
        return error_response("Expense not found or unauthorized.", 404)

    analytics = expense_model.get_trip_budget_analytics(user_id, trip_id, trip)
    return success_response("Expense deleted successfully.", {"id": expense_id, "analytics": analytics})


@expenses_bp.route("/analytics", methods=["GET"])
@token_required
def get_analytics(trip_id):
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    analytics = expense_model.get_trip_budget_analytics(user_id, trip_id, trip)
    return success_response("Analytics calculated successfully.", {"analytics": analytics})


@expenses_bp.route("/settlement", methods=["GET"])
@token_required
def get_settlement(trip_id):
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    expenses = expense_model.get_expenses_by_trip(user_id, trip_id)
    settlement = expense_model.compute_trip_settlement(trip, expenses)
    return success_response("Settlement calculated successfully.", settlement)


@expenses_bp.route("/settle", methods=["POST"])
@token_required
def settle_debt_route(trip_id):
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be valid JSON.", 400)

    try:
        expense = expense_model.record_debt_settlement(user_id, trip_id, data)
        all_expenses = expense_model.get_expenses_by_trip(user_id, trip_id)
        settlement = expense_model.compute_trip_settlement(trip, all_expenses)
        analytics = expense_model.get_trip_budget_analytics(user_id, trip_id, trip)
        return success_response(
            "Debt settlement recorded successfully.",
            {"expense": expense, "settlement": settlement, "analytics": analytics},
            201,
        )
    except ValueError as exc:
        return error_response(str(exc), 400)
    except Exception as exc:
        return error_response("Failed to record debt settlement.", 500)
