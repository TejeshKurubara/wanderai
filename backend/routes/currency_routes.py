"""
Currency converter and multi-currency budget endpoints for WanderAI.
"""

from flask import Blueprint, request
from services import currency_service
from models import trip_model, expense_model
from utils import error_response, success_response
from utils.auth import get_current_user_id, token_required
import logging

logger = logging.getLogger(__name__)

currency_bp = Blueprint("currency", __name__, url_prefix="/api/currency")


@currency_bp.route("/supported", methods=["GET"])
def get_supported_currencies():
    """Return dictionary of supported currency codes, names, and symbols."""
    currencies = currency_service.get_supported_currencies()
    return success_response("Supported currencies fetched.", {"currencies": currencies})


@currency_bp.route("/rates", methods=["GET"])
def get_rates():
    """
    Get current exchange rates for base currency.
    Query param: ?base=USD
    """
    base = request.args.get("base", "USD").strip().upper()
    try:
        data = currency_service.get_exchange_rates(base)
        return success_response(f"Exchange rates for {base} retrieved.", data)
    except Exception as exc:
        logger.error("Failed to fetch exchange rates: %s", exc)
        return error_response("Failed to fetch exchange rates.", 500)


@currency_bp.route("/convert", methods=["POST"])
def convert():
    """
    Convert an amount from one currency to another.
    Body: { amount: 1500, from_currency: "INR", to_currency: "USD", manual_rate?: 0.012 }
    """
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be valid JSON.", 400)

    try:
        amount = float(data.get("amount", 0.0))
    except (ValueError, TypeError):
        return error_response("Amount must be a numeric value.", 400)

    from_curr = data.get("from_currency") or data.get("from") or "INR"
    to_curr = data.get("to_currency") or data.get("to") or "USD"
    manual_rate = data.get("manual_rate")

    try:
        result = currency_service.convert_currency(
            amount=amount,
            from_currency=from_curr,
            to_currency=to_curr,
            manual_rate=float(manual_rate) if manual_rate is not None else None,
        )
        return success_response("Currency converted successfully.", result)
    except Exception as exc:
        logger.error("Currency conversion error: %s", exc)
        return error_response("Failed to convert currency.", 500)


@currency_bp.route("/trip/<trip_id>/budget", methods=["GET"])
@token_required
def get_trip_multi_currency_budget(trip_id):
    """
    Calculate and project trip budget and expense analytics in a user-chosen target currency,
    without overwriting or modifying original financial records in MongoDB.
    Query param: ?target_currency=EUR
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if not trip:
        return error_response("Trip not found.", 404)

    target_currency = request.args.get("target_currency", trip.get("currency", "INR")).strip().upper()
    trip_currency = trip.get("currency", "INR")

    expenses = expense_model.get_expenses_by_trip(user_id, trip_id)
    raw_analytics = expense_model.compute_budget_analytics(expenses, trip)

    # Conversion details
    rate_info = currency_service.convert_currency(1.0, trip_currency, target_currency)
    rate = rate_info["exchange_rate"]

    def _conv(val):
        return round(float(val) * rate, 2)

    converted_analytics = {
        "original_currency": trip_currency,
        "target_currency": target_currency,
        "exchange_rate_used": rate,
        "rate_source": rate_info["rate_source"],
        "rate_timestamp": rate_info["rate_timestamp"],
        "is_demo_rate": rate_info["is_demo"],
        "total_budget": _conv(raw_analytics["total_budget"]),
        "actual_paid_expenses": _conv(raw_analytics["actual_paid_expenses"]),
        "remaining_budget": _conv(raw_analytics["remaining_budget"]),
        "exact_remaining": _conv(raw_analytics["exact_remaining"]),
        "budget_used_percentage": raw_analytics["budget_used_percentage"],
        "pending_commitments": _conv(raw_analytics["pending_commitments"]),
        "potential_remaining_budget": _conv(raw_analytics["potential_remaining_budget"]),
        "refunded_amount": _conv(raw_analytics["refunded_amount"]),
        "is_over_budget": raw_analytics["is_over_budget"],
        "overrun_amount": _conv(raw_analytics["overrun_amount"]),
        "category_spending": {k: _conv(v) for k, v in raw_analytics.get("category_spending", {}).items()},
        "expense_count": raw_analytics["expense_count"],
    }

    return success_response(
        f"Trip budget analytics converted to {target_currency}.",
        {"converted_budget": converted_analytics, "original_budget": raw_analytics}
    )
