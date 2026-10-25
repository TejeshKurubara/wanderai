"""Protected trip endpoints: /api/trips/*"""

import math
import re
from datetime import datetime

from flask import Blueprint, request

from models import trip_model
from models.trip_model import (
    push_itinerary_revision,
    undo_itinerary_revision,
    toggle_activity_completion,
    set_trip_display_currency,
)
from services import (
    image_service,
    route_optimizer,
    replanning_service,
    chat_companion_service,
    currency_service,
)
from services.gemini_service import GeminiServiceError, generate_itinerary
from utils import error_response, success_response
from utils.auth import get_current_user_id, token_required

trips_bp = Blueprint("trips", __name__, url_prefix="/api/trips")

MAX_DAYS = 30
MAX_TRAVELERS = 50
MAX_INTERESTS = 15


def _clean(value, max_len):
    """Collapse whitespace and strip control characters."""
    text = " ".join(str(value).split())
    text = re.sub(r"[\x00-\x1f\x7f]", "", text)
    return text[:max_len]


def _to_int(value):
    if isinstance(value, bool):
        return None
    if isinstance(value, int):
        return value
    if isinstance(value, float) and value.is_integer():
        return int(value)
    if isinstance(value, str) and value.strip().isdigit():
        return int(value.strip())
    return None


def _to_positive_number(value):
    if isinstance(value, bool):
        return None
    try:
        number = float(value)
    except (TypeError, ValueError):
        return None
    if not math.isfinite(number) or number <= 0 or number > 1e9:
        return None
    return number


def _to_date(value):
    if not isinstance(value, str):
        return None
    try:
        return datetime.strptime(value.strip(), "%Y-%m-%d").date()
    except ValueError:
        return None


def _validate_trip_request(data: dict):
    """Return (clean_params, errors)."""
    errors = {}

    # Destination
    destination = data.get("destination")
    destination = _clean(destination, 100) if isinstance(destination, str) else ""
    if len(destination) < 2:
        errors["destination"] = "Destination is required (2-100 characters)."

    # Dates (optional)
    start_date = end_date = None
    raw_start, raw_end = data.get("start_date"), data.get("end_date")
    if raw_start not in (None, ""):
        start_date = _to_date(raw_start)
        if start_date is None:
            errors["start_date"] = "start_date must be in YYYY-MM-DD format."
    if raw_end not in (None, ""):
        end_date = _to_date(raw_end)
        if end_date is None:
            errors["end_date"] = "end_date must be in YYYY-MM-DD format."
        elif raw_start in (None, ""):
            errors["end_date"] = "start_date is required when end_date is provided."
    if start_date and end_date and end_date < start_date:
        errors["end_date"] = "end_date cannot be before start_date."

    # Days (required unless both dates are supplied)
    days = None
    if data.get("days") not in (None, ""):
        days = _to_int(data.get("days"))
        if days is None or not (1 <= days <= MAX_DAYS):
            errors["days"] = f"days must be a whole number between 1 and {MAX_DAYS}."
            days = None
    if days is None and "days" not in errors:
        if start_date and end_date:
            days = (end_date - start_date).days + 1
            if days > MAX_DAYS:
                errors["days"] = f"Trips are limited to {MAX_DAYS} days."
        else:
            errors["days"] = "days is required."
    elif days is not None and start_date and end_date:
        if (end_date - start_date).days + 1 != days:
            errors["days"] = "days does not match the selected travel dates."

    # Travelers
    travelers = 1
    if data.get("travelers") not in (None, ""):
        travelers = _to_int(data.get("travelers"))
        if travelers is None or not (1 <= travelers <= MAX_TRAVELERS):
            errors["travelers"] = f"travelers must be a whole number between 1 and {MAX_TRAVELERS}."

    # Budget (optional)
    budget = None
    if data.get("budget") not in (None, ""):
        budget = _to_positive_number(data.get("budget"))
        if budget is None:
            errors["budget"] = "budget must be a positive number."

    # Currency (optional)
    currency = "INR"
    if data.get("currency") not in (None, ""):
        raw_currency = data.get("currency")
        if isinstance(raw_currency, str) and re.fullmatch(r"[A-Za-z]{3}", raw_currency.strip()):
            currency = raw_currency.strip().upper()
        else:
            errors["currency"] = "currency must be a 3-letter code such as INR or USD."

    # Interests (optional)
    interests = []
    raw_interests = data.get("interests")
    if raw_interests not in (None, ""):
        if not isinstance(raw_interests, list) or len(raw_interests) > MAX_INTERESTS:
            errors["interests"] = f"interests must be a list of up to {MAX_INTERESTS} strings."
        else:
            seen = set()
            for item in raw_interests:
                if not isinstance(item, str):
                    errors["interests"] = "Each interest must be a string."
                    break
                cleaned = _clean(item, 50)
                if cleaned and cleaned.lower() not in seen:
                    seen.add(cleaned.lower())
                    interests.append(cleaned)

    # Title (optional)
    title = None
    if data.get("title") not in (None, ""):
        if isinstance(data.get("title"), str):
            title = _clean(data["title"], 120) or None
        else:
            errors["title"] = "title must be a string."

    # Origin (optional)
    origin = ""
    if data.get("origin") not in (None, ""):
        if isinstance(data.get("origin"), str):
            origin = _clean(data["origin"], 100)
        else:
            errors["origin"] = "origin must be a string."

    # Preferences & Accessibility (optional)
    transport_pref = _clean(data.get("transport_preference", ""), 50)
    accommodation_pref = _clean(data.get("accommodation_preference", ""), 50)
    food_pref = _clean(data.get("food_preference", ""), 50)
    accessibility = _clean(data.get("accessibility_requirements", ""), 200)

    # Intermediate destinations (optional)
    intermediate_destinations = []
    raw_intermediates = data.get("intermediate_destinations")
    if raw_intermediates and isinstance(raw_intermediates, list):
        for item in raw_intermediates[:5]:
            if isinstance(item, str):
                c = _clean(item, 80)
                if c:
                    intermediate_destinations.append(c)

    if errors:
        return None, errors

    return {
        "title": title,
        "destination": destination,
        "origin": origin,
        "days": days,
        "travelers": travelers,
        "budget": budget,
        "currency": currency,
        "start_date": start_date.isoformat() if start_date else None,
        "end_date": end_date.isoformat() if end_date else None,
        "interests": interests,
        "transport_preference": transport_pref,
        "accommodation_preference": accommodation_pref,
        "food_preference": food_pref,
        "accessibility_requirements": accessibility,
        "intermediate_destinations": intermediate_destinations,
    }, None


from agents import orchestrator
from services import image_service

@trips_bp.route("", methods=["POST"])
@token_required
def create_trip():
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be valid JSON.", 400)

    params, errors = _validate_trip_request(data)
    if errors:
        return error_response("Validation failed.", 400, errors)

    try:
        # Multi-agent orchestrator builds final validated itinerary
        itinerary = orchestrator.build_itinerary(params)
    except GeminiServiceError as exc:
        return error_response(exc.message, exc.status_code)

    params["itinerary"] = itinerary
    params["title"] = params["title"] or itinerary["overview"]["title"]

    # Pre-fetch and cache destination image URL for instant dashboard cards
    try:
        params["image_url"] = image_service.get_destination_image(params["destination"])
    except Exception:
        params["image_url"] = image_service.get_destination_image(params["destination"])

    trip = trip_model.create_trip(get_current_user_id(), params)
    return success_response("Trip created successfully.", {"trip": trip}, 201)


@trips_bp.route("", methods=["GET"])
@token_required
def list_trips():
    """
    Fetch user trips. Defaults to lightweight summary projection to ensure fast dashboard load,
    eliminating redundant megabyte payload transfer.
    Use ?full=true only if full day-by-day itineraries are explicitly requested.
    """
    user_id = get_current_user_id()
    include_full = request.args.get("full", "false").lower() == "true"
    if include_full:
        trips = trip_model.get_trips_by_user(user_id)
    else:
        trips = trip_model.get_trip_summaries_by_user(user_id)

    # Ensure every returned card has an image_url fallback
    for t in trips:
        if not t.get("image_url") and t.get("destination"):
            t["image_url"] = image_service.get_destination_image(t["destination"])

    return success_response("Trips fetched successfully.", {"trips": trips, "count": len(trips)})


@trips_bp.route("/<trip_id>", methods=["GET"])
@token_required
def get_trip(trip_id):
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found.", 404)
    if not trip.get("image_url") and trip.get("destination"):
        trip["image_url"] = image_service.get_destination_image(trip["destination"])
    return success_response("Trip fetched successfully.", {"trip": trip})


@trips_bp.route("/<trip_id>", methods=["PATCH", "PUT"])
@token_required
def update_trip(trip_id):
    """
    Update trip details (title, dates, budget, origin, preferences, notes).
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found.", 404)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be valid JSON.", 400)

    # Sanitize allowed update fields
    allowed_fields = [
        "title", "origin", "budget", "currency", "travelers", "start_date", "end_date",
        "transport_preference", "accommodation_preference", "food_preference",
        "accessibility_requirements", "notes", "booking_status", "interests"
    ]
    updates = {}
    for key in allowed_fields:
        if key in data:
            if key in ("budget", "travelers") and data[key] is not None:
                try:
                    updates[key] = float(data[key]) if key == "budget" else int(data[key])
                except (ValueError, TypeError):
                    continue
            elif key == "interests" and isinstance(data[key], list):
                updates[key] = [_clean(x, 50) for x in data[key] if isinstance(x, str)][:15]
            elif isinstance(data[key], str):
                updates[key] = _clean(data[key], 200)

    if not updates:
        return error_response("No valid fields provided to update.", 400)

    updated_trip = trip_model.update_trip(user_id, trip_id, updates)
    if not updated_trip:
        return error_response("Failed to update trip.", 500)

    return success_response("Trip updated successfully.", {"trip": updated_trip})


@trips_bp.route("/<trip_id>", methods=["DELETE"])
@token_required
def delete_trip(trip_id):
    if not trip_model.delete_trip(get_current_user_id(), trip_id):
        return error_response("Trip not found.", 404)
    return success_response("Trip deleted successfully.", {"id": trip_id})


# ==============================================================================
# FEATURE 1: ROUTE OPTIMIZATION (PREVIEW, APPLY, UNDO)
# ==============================================================================

@trips_bp.route("/<trip_id>/routes/optimize", methods=["POST"])
@token_required
def optimize_route(trip_id):
    """
    Generate an optimized route proposal using 2-opt TSP.
    This is preview-only and does NOT mutate the saved trip until explicitly applied.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found.", 404)

    data = request.get_json(silent=True) or {}
    mode = data.get("mode", "auto")
    max_walking_km = float(data.get("max_walking_km", 2.5))
    day_number = data.get("day_number")
    starting_point = data.get("starting_point")

    proposal = route_optimizer.optimize_trip_route(
        trip=trip,
        mode=mode,
        max_walking_km=max_walking_km,
        target_day=day_number,
        starting_point=starting_point,
    )

    return success_response(
        "Route optimization proposal generated.",
        {
            "proposal": proposal,
            "undo_available": trip.get("has_revision_history", False),
        },
    )


@trips_bp.route("/<trip_id>/routes/apply-optimization", methods=["POST"])
@token_required
def apply_route_optimization(trip_id):
    """
    Apply previewed route optimization changes to the trip itinerary.
    Pushes current version to history snapshot for 1-click undo.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found.", 404)

    data = request.get_json(silent=True) or {}
    optimized_days = data.get("optimized_days")
    if not isinstance(optimized_days, list):
        return error_response("optimized_days list is required.", 400)

    itinerary = trip.get("itinerary", {})
    new_itinerary = dict(itinerary)
    new_itinerary["days"] = optimized_days

    change_summary = data.get("change_summary", "Smart Route Optimization (2-opt TSP)")
    updated_trip = trip_model.push_itinerary_revision(user_id, trip_id, new_itinerary, change_reason=change_summary)
    if not updated_trip:
        return error_response("Failed to update trip with optimized route.", 500)

    return success_response("Optimized route applied and saved.", {"trip": updated_trip})


@trips_bp.route("/<trip_id>/routes/undo-optimization", methods=["POST"])
@token_required
def undo_route_optimization(trip_id):
    """
    Revert to the previous itinerary version before route optimization.
    """
    user_id = get_current_user_id()
    updated_trip = trip_model.undo_itinerary_revision(user_id, trip_id)
    if not updated_trip:
        return error_response("No previous itinerary revision found to revert.", 400)

    return success_response("Itinerary reverted to previous version successfully.", {"trip": updated_trip})


# ==============================================================================
# FEATURE 2: AUTOMATIC REPLANNING (PREVIEW, APPLY, UNDO)
# ==============================================================================

@trips_bp.route("/<trip_id>/replan/preview", methods=["POST"])
@token_required
def preview_replanning(trip_id):
    """
    Generate an automatic replanning proposal based on disruptions or traveler adjustments.
    Preview-only; leaves original itinerary untouched until approved.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found.", 404)

    data = request.get_json(silent=True) or {}
    scenario = data.get("scenario")
    if not scenario:
        return error_response("Replanning scenario is required.", 400)

    details = data.get("details", {})
    day_offset = data.get("day_offset", 0)

    proposal = replanning_service.replan_itinerary(
        trip=trip,
        scenario=scenario,
        details=details,
        day_offset=day_offset,
    )

    return success_response(
        "Replanning proposal generated.",
        {
            "proposal": proposal,
            "undo_available": trip.get("has_revision_history", False),
        },
    )


@trips_bp.route("/<trip_id>/replan/apply", methods=["POST"])
@token_required
def apply_replanning(trip_id):
    """
    Apply previewed replanning changes to the trip itinerary.
    Pushes current version to history snapshot for 1-click undo.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found.", 404)

    data = request.get_json(silent=True) or {}
    new_itinerary = data.get("new_itinerary")
    if not isinstance(new_itinerary, dict):
        return error_response("new_itinerary object is required.", 400)

    scenario_name = data.get("scenario", "Custom Replanning")
    updated_trip = trip_model.push_itinerary_revision(
        user_id,
        trip_id,
        new_itinerary,
        change_reason=f"Auto Replan: {scenario_name}",
    )
    if not updated_trip:
        return error_response("Failed to save replanned itinerary.", 500)

    return success_response("Replanned itinerary applied and saved.", {"trip": updated_trip})


@trips_bp.route("/<trip_id>/replan/undo", methods=["POST"])
@token_required
def undo_replanning(trip_id):
    """
    Revert to the previous itinerary version before replanning.
    """
    user_id = get_current_user_id()
    updated_trip = trip_model.undo_itinerary_revision(user_id, trip_id)
    if not updated_trip:
        return error_response("No previous itinerary revision found to revert.", 400)

    return success_response("Itinerary reverted to previous version successfully.", {"trip": updated_trip})


# ==============================================================================
# WEATHER FORECAST (OPEN-METEO)
# ==============================================================================

@trips_bp.route("/<trip_id>/weather", methods=["GET"])
@token_required
def get_trip_weather(trip_id):
    """
    Fetch live 7-day weather forecast from Open-Meteo for the destination of a specific trip.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found.", 404)

    dest = trip.get("destination", "")
    weather_info = replanning_service.get_destination_weather(dest)
    return success_response("Weather forecast fetched successfully.", {"weather": weather_info})


@trips_bp.route("/weather", methods=["GET"])
def get_destination_weather_route():
    """
    Fetch live 7-day weather forecast from Open-Meteo for any destination name.
    """
    destination = request.args.get("destination", "").strip()
    if not destination:
        return error_response("destination query parameter is required.", 400)

    weather_info = replanning_service.get_destination_weather(destination)
    return success_response("Weather forecast fetched successfully.", {"weather": weather_info})


# ==============================================================================
# ACTIVITY COMPLETION TRACKING
# ==============================================================================

@trips_bp.route("/<trip_id>/activities/toggle-completion", methods=["POST"])
@token_required
def toggle_activity(trip_id):
    """
    Mark an activity as completed or uncompleted.
    Completed activities are protected from being shifted or discarded during replanning.
    """
    user_id = get_current_user_id()
    data = request.get_json(silent=True) or {}
    activity_name = data.get("activity_name", "").strip()
    completed = bool(data.get("completed", True))

    if not activity_name:
        return error_response("activity_name is required.", 400)

    updated_trip = trip_model.toggle_activity_completion(user_id, trip_id, activity_name, completed)
    if not updated_trip:
        return error_response("Trip not found or update failed.", 404)

    return success_response("Activity status updated.", {"trip": updated_trip})


# ==============================================================================
# FEATURE 3: AI TRAVEL COMPANION (CHAT, HISTORY, CLEAR)
# ==============================================================================

@trips_bp.route("/<trip_id>/companion/chat", methods=["POST"])
@token_required
def companion_chat(trip_id):
    """
    Context-aware travel companion assistant.
    Provides instant deterministic financial/booking answers and grounded recommendations.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found.", 404)

    data = request.get_json(silent=True) or {}
    message = (data.get("message") or "").strip()
    if not message:
        return error_response("Message cannot be empty.", 400)

    result = chat_companion_service.process_companion_chat(user_id, trip, message)
    return success_response("Companion response generated.", result)


@trips_bp.route("/<trip_id>/companion/history", methods=["GET"])
@token_required
def get_companion_chat_history(trip_id):
    """
    Retrieve stored chat conversation history for this trip.
    """
    user_id = get_current_user_id()
    limit = int(request.args.get("limit", 50))
    history = chat_companion_service.get_companion_history(user_id, trip_id, limit=limit)
    return success_response("Companion history fetched.", {"history": history, "count": len(history)})


@trips_bp.route("/<trip_id>/companion/history", methods=["DELETE"])
@token_required
def clear_companion_chat_history(trip_id):
    """
    Clear stored companion conversation history for this trip.
    """
    user_id = get_current_user_id()
    chat_companion_service.clear_companion_history(user_id, trip_id)
    return success_response("Companion conversation history cleared.", {"cleared": True})


# ==============================================================================
# FEATURE 4: MULTI-CURRENCY DISPLAY PREFERENCE
# ==============================================================================

@trips_bp.route("/<trip_id>/display-currency", methods=["POST", "PUT"])
@token_required
def update_display_currency(trip_id):
    """
    Switch active display currency for the trip.
    Does not mutate underlying expense amounts or original booking prices.
    """
    user_id = get_current_user_id()
    data = request.get_json(silent=True) or {}
    currency_code = data.get("currency", "").strip().upper()

    if not currency_code or len(currency_code) != 3:
        return error_response("A valid 3-letter currency code is required (e.g. USD, EUR, INR).", 400)

    updated_trip = trip_model.set_trip_display_currency(user_id, trip_id, currency_code)
    if not updated_trip:
        return error_response("Trip not found or update failed.", 404)

    return success_response("Display currency updated successfully.", {"trip": updated_trip})


# ==============================================================================
# FEATURE SET 1: GROUP COLLABORATION & INVITES
# ==============================================================================

@trips_bp.route("/<trip_id>/collaborators/invite", methods=["POST"])
@token_required
def invite_trip_collaborators(trip_id):
    """
    Generate or regenerate a 6-character alphanumeric invite code & shareable link.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    code = trip_model.generate_trip_invite_code(user_id, trip_id)
    if not code:
        return error_response("Failed to generate invite code.", 500)

    return success_response(
        "Invite code generated successfully.",
        {
            "invite_code": code,
            "share_url": f"/join?code={code}",
        }
    )


@trips_bp.route("/join", methods=["POST"])
@token_required
def join_trip_route():
    """
    Join a shared trip via 6-character invite code.
    Grants the authenticated user collaborator editor access.
    """
    user_id = get_current_user_id()
    data = request.get_json(silent=True) or {}
    invite_code = (data.get("invite_code") or data.get("code") or "").strip().upper()

    if not invite_code:
        return error_response("Invite code is required.", 400)

    trip, message = trip_model.join_trip_by_code(user_id, invite_code)
    if not trip:
        return error_response(message, 404)

    return success_response(message, {"trip": trip})


@trips_bp.route("/<trip_id>/collaborators", methods=["GET"])
@token_required
def get_trip_collaborators_route(trip_id):
    """
    Fetch the list of trip collaborators along with the owner and invite code.
    """
    user_id = get_current_user_id()
    data = trip_model.get_trip_collaborators(user_id, trip_id)
    if data is None:
        return error_response("Trip not found or unauthorized.", 404)

    return success_response("Collaborators retrieved successfully.", data)


@trips_bp.route("/<trip_id>/collaborators/<target_user_id>", methods=["DELETE"])
@token_required
def remove_trip_collaborator_route(trip_id, target_user_id):
    """
    Owner revokes collaborator access from a trip.
    """
    owner_id = get_current_user_id()
    success = trip_model.remove_trip_collaborator(owner_id, trip_id, target_user_id)
    if not success:
        return error_response("Failed to remove collaborator. Only trip owners can revoke access.", 403)

    return success_response("Collaborator access revoked successfully.")


# ==============================================================================
# FEATURE SET 2: CALENDAR EXPORT (.ICS)
# ==============================================================================

@trips_bp.route("/<trip_id>/export/ics", methods=["GET"])
@token_required
def export_trip_calendar_ics(trip_id):
    """
    Export the full trip itinerary, schedule, and reservations to RFC 5545 .ics format.
    Compatible with Apple Calendar, Google Calendar, and Microsoft Outlook.
    """
    from flask import Response
    from models import booking_model
    from datetime import timezone
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    bookings = booking_model.get_bookings_by_trip(user_id, trip_id)

    lines = [
        "BEGIN:VCALENDAR",
        "VERSION:2.0",
        "PRODID:-//WanderAI//Travel Planner 2.0//EN",
        "CALSCALE:GREGORIAN",
        "METHOD:PUBLISH",
        f"X-WR-CALNAME:{trip.get('title') or 'Trip to ' + trip.get('destination', 'Travel')}",
        "X-WR-TIMEZONE:UTC",
    ]

    now_str = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")

    def _sanitize(text: str) -> str:
        if not text:
            return ""
        return str(text).replace("\\", "\\\\").replace(";", "\\;").replace(",", "\\,").replace("\n", "\\n")

    trip_start_date = None
    if trip.get("start_date"):
        try:
            trip_start_date = datetime.strptime(trip["start_date"], "%Y-%m-%d").date()
        except ValueError:
            trip_start_date = None

    # 1. Activities from itinerary
    itinerary = trip.get("itinerary", {})
    days = itinerary.get("days", []) if isinstance(itinerary, dict) else []

    for day_idx, day in enumerate(days):
        day_date = None
        if day.get("date"):
            try:
                day_date = datetime.strptime(day["date"], "%Y-%m-%d").date()
            except ValueError:
                pass
        if not day_date and trip_start_date:
            from datetime import timedelta
            day_date = trip_start_date + timedelta(days=day_idx)

        date_prefix = day_date.strftime("%Y%m%d") if day_date else None

        acts = day.get("activities", [])
        for act_idx, act in enumerate(acts):
            title = act.get("name") or act.get("title") or f"Activity {act_idx + 1}"
            desc = act.get("description", "")
            loc = act.get("location") or trip.get("destination", "")
            cost = act.get("cost")
            if cost:
                desc += f"\\nEstimated Cost: {cost}"
            tips = act.get("tips") or act.get("pro_tip")
            if tips:
                desc += f"\\nTips: {tips}"

            t_slot = str(act.get("time") or "").lower()
            if "morning" in t_slot or act_idx == 0:
                start_h, start_m, end_h, end_m = 9, 0, 12, 0
            elif "afternoon" in t_slot or act_idx == 1:
                start_h, start_m, end_h, end_m = 13, 0, 16, 0
            elif "evening" in t_slot or act_idx >= 2:
                start_h, start_m, end_h, end_m = 17, 30, 20, 30
            else:
                start_h, start_m, end_h, end_m = 10, 0, 13, 0

            uid = f"act-{trip_id}-{day_idx}-{act_idx}@wanderai.com"

            if date_prefix:
                dt_start = f"{date_prefix}T{start_h:02d}{start_m:02d}00Z"
                dt_end = f"{date_prefix}T{end_h:02d}{end_m:02d}00Z"
            else:
                dt_start = f"{now_str}"
                dt_end = f"{now_str}"

            lines.extend([
                "BEGIN:VEVENT",
                f"UID:{uid}",
                f"DTSTAMP:{now_str}",
                f"DTSTART:{dt_start}",
                f"DTEND:{dt_end}",
                f"SUMMARY:{_sanitize(title)}",
                f"DESCRIPTION:{_sanitize(desc)}",
                f"LOCATION:{_sanitize(loc)}",
                "STATUS:CONFIRMED",
                "END:VEVENT",
            ])

    # 2. Bookings (Hotels, Flights, Rental Cars)
    for b_idx, b in enumerate(bookings):
        b_type = b.get("booking_type") or b.get("type", "booking")
        b_title = b.get("title", "Reservation")
        b_prov = b.get("provider", "")
        b_ref = b.get("reference_number", "")
        b_start = b.get("start_date")
        b_end = b.get("end_date") or b_start

        if b_start:
            try:
                b_start_clean = b_start.replace("-", "")[:8]
                b_end_clean = b_end.replace("-", "")[:8] if b_end else b_start_clean
                uid = f"book-{trip_id}-{b_idx}@wanderai.com"
                summary = f"[{b_type.upper()}] {b_title}"
                desc = f"Provider: {b_prov}\\nConfirmation: {b_ref}\\nAmount: {b.get('currency', '')} {b.get('amount', 0)}"

                lines.extend([
                    "BEGIN:VEVENT",
                    f"UID:{uid}",
                    f"DTSTAMP:{now_str}",
                    f"DTSTART;VALUE=DATE:{b_start_clean}",
                    f"DTEND;VALUE=DATE:{b_end_clean}",
                    f"SUMMARY:{_sanitize(summary)}",
                    f"DESCRIPTION:{_sanitize(desc)}",
                    f"LOCATION:{_sanitize(trip.get('destination', ''))}",
                    "STATUS:CONFIRMED",
                    "END:VEVENT",
                ])
            except Exception:
                pass

    lines.append("END:VCALENDAR")
    ics_content = "\r\n".join(lines)

    clean_dest = re.sub(r'[^a-zA-Z0-9_-]', '_', trip.get('destination', 'trip'))
    filename = f"WanderAI_{clean_dest}.ics"

    return Response(
        ics_content,
        mimetype="text/calendar; charset=utf-8",
        headers={"Content-Disposition": f"attachment; filename=\"{filename}\""}
    )
