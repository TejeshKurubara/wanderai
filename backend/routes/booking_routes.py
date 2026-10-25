"""
Booking management and travel search routes for WanderAI.
Provides flight search, hotel search, multi-modal transport guidance,
and full booking reservation management.
"""

from flask import Blueprint, request
from models import trip_model, booking_model, expense_model
from services import flight_service, hotel_service, transport_service, rental_service, currency_service
from utils import error_response, success_response
from utils.auth import get_current_user_id, token_required
from datetime import datetime
import logging
import uuid

logger = logging.getLogger(__name__)

# Search & travel guidance blueprint: /api/*
travel_services_bp = Blueprint("travel_services", __name__, url_prefix="/api")

# Booking CRUD blueprint: /api/trips/<trip_id>/bookings
bookings_bp = Blueprint("bookings", __name__, url_prefix="/api/trips/<trip_id>/bookings")


# ============================================================================
# TRAVEL SEARCH & GUIDANCE ENDPOINTS
# ============================================================================

@travel_services_bp.route("/flights/search", methods=["GET"])
def search_flights():
    """
    Search for flights between origin and destination.
    Publicly accessible or authenticated.
    """
    origin = request.args.get("origin", "").strip()
    destination = request.args.get("destination", "").strip()
    departure_date = request.args.get("departure_date", "").strip()
    return_date = request.args.get("return_date", "").strip() or None
    try:
        passengers = int(request.args.get("passengers", 1))
    except (ValueError, TypeError):
        passengers = 1
    cabin_class = request.args.get("cabin_class", "economy").strip()
    currency = request.args.get("currency", "INR").strip()

    if not destination:
        return error_response("Destination is required for flight search.", 400)

    try:
        result = flight_service.search_flights(
            origin=origin,
            destination=destination,
            departure_date=departure_date,
            return_date=return_date,
            passengers=passengers,
            cabin_class=cabin_class,
            currency=currency,
        )
        return success_response("Flights retrieved successfully.", result)
    except Exception as exc:
        logger.error(f"Flight search error: {exc}", exc_info=True)
        return error_response("Failed to retrieve flights.", 500)


@travel_services_bp.route("/hotels/search", methods=["GET"])
def search_hotels():
    """
    Search for hotels in the destination city.
    """
    destination = request.args.get("destination", "").strip()
    check_in = request.args.get("check_in", "").strip()
    check_out = request.args.get("check_out", "").strip()
    try:
        guests = int(request.args.get("guests", 2))
    except (ValueError, TypeError):
        guests = 2
    try:
        min_stars = int(request.args.get("min_stars", 3))
    except (ValueError, TypeError):
        min_stars = 3
    currency = request.args.get("currency", "INR").strip()

    if not destination:
        return error_response("Destination is required for hotel search.", 400)

    try:
        result = hotel_service.search_hotels(
            destination=destination,
            check_in=check_in,
            check_out=check_out,
            guests=guests,
            min_stars=min_stars,
            currency=currency,
        )
        return success_response("Hotels retrieved successfully.", result)
    except Exception as exc:
        logger.error(f"Hotel search error: {exc}", exc_info=True)
        return error_response("Failed to retrieve hotels.", 500)


@travel_services_bp.route("/transport/routes", methods=["GET"])
def get_transport_routes():
    """
    Get multi-modal transport options (flight, train, bus, cab) from origin to destination.
    """
    origin = request.args.get("origin", "").strip()
    destination = request.args.get("destination", "").strip()
    date = request.args.get("date", "").strip()
    currency = request.args.get("currency", "INR").strip()

    if not destination:
        return error_response("Destination is required for route options.", 400)

    try:
        result = transport_service.get_multi_modal_route(
            origin=origin,
            destination=destination,
            date=date,
            currency=currency,
        )
        return success_response("Transport routes retrieved successfully.", result)
    except Exception as exc:
        logger.error(f"Transport routes error: {exc}", exc_info=True)
        return error_response("Failed to retrieve transport routes.", 500)


@travel_services_bp.route("/transport/city-guide", methods=["GET"])
def get_city_guide():
    """
    Get city transit options, passes, airport transfers, and local guidance.
    """
    destination = request.args.get("destination", "").strip()
    if not destination:
        return error_response("Destination is required.", 400)

    try:
        guide = transport_service.get_local_transport_guide(destination)
        return success_response("City transit guide retrieved successfully.", guide)
    except Exception as exc:
        logger.error(f"City guide error: {exc}", exc_info=True)
        return error_response("Failed to retrieve city transit guide.", 500)


@travel_services_bp.route("/transport/emergency", methods=["GET"])
def get_emergency_services():
    """
    Get emergency helpline numbers, major hospitals, and traveler safety info.
    """
    destination = request.args.get("destination", "").strip()
    if not destination:
        return error_response("Destination is required.", 400)

    try:
        services = transport_service.get_emergency_services(destination)
        return success_response("Emergency directory retrieved successfully.", services)
    except Exception as exc:
        logger.error(f"Emergency directory error: {exc}", exc_info=True)
        return error_response("Failed to retrieve emergency services.", 500)


@travel_services_bp.route("/rentals/search", methods=["GET"])
def search_rentals():
    """
    Search available rental vehicles for a given location, date range, passenger count,
    vehicle category, and transmission preference.
    """
    location = request.args.get("location", "").strip()
    pickup_date = request.args.get("pickup_date", "").strip()
    dropoff_date = request.args.get("dropoff_date", "").strip()
    category = request.args.get("category", "").strip()
    transmission = request.args.get("transmission", "").strip()
    currency = request.args.get("currency", "INR").strip()

    try:
        passengers = int(request.args.get("passengers", 1))
    except (ValueError, TypeError):
        passengers = 1

    if not location:
        return error_response("Location is required for vehicle rental search.", 400)

    try:
        result = rental_service.search_rentals(
            location=location,
            pickup_date=pickup_date or None,
            dropoff_date=dropoff_date or None,
            passengers=passengers,
            category=category or None,
            transmission=transmission or None,
            currency=currency,
        )
        return success_response("Rental vehicles fetched successfully.", result)
    except Exception as exc:
        logger.error(f"Rental vehicle search error: {exc}", exc_info=True)
        return error_response("Failed to search rental vehicles.", 500)


@travel_services_bp.route("/trips/<trip_id>/rentals/book", methods=["POST"])
@token_required
def book_rental_vehicle(trip_id):
    """
    Book a rental vehicle for a trip:
    - Validates user auth & trip ownership.
    - Saves reservation to the bookings collection with type: "rental_car".
    - Automatically logs a matching entry in the expenses collection under "Transportation" category.
    - Uses currency_service.py to auto-convert the rental cost to the trip's home currency.
    - Returns booking, expense, and updated budget analytics.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be valid JSON.", 400)

    vehicle_name = (data.get("vehicle_name") or data.get("title") or "Rental Vehicle").strip()
    provider = (data.get("provider") or "Direct Rental").strip()
    pickup_location = (data.get("pickup_location") or trip.get("destination") or "Airport Hub").strip()
    dropoff_location = (data.get("dropoff_location") or pickup_location).strip()
    pickup_date = (data.get("pickup_date") or data.get("start_date") or trip.get("start_date") or "").strip()
    dropoff_date = (data.get("dropoff_date") or data.get("end_date") or trip.get("end_date") or "").strip()
    category = (data.get("category") or "Economy / Compact").strip()
    transmission = (data.get("transmission") or "Automatic").strip()

    days = int(data.get("days") or 1)
    if days < 1:
        days = 1

    trip_currency = (trip.get("currency") or "INR").upper().strip()
    rental_currency = (data.get("currency") or trip_currency).upper().strip()

    try:
        raw_amount = float(data.get("total_price") or data.get("amount") or 0.0)
    except (ValueError, TypeError):
        raw_amount = 0.0

    # Auto-convert rental cost to trip's home currency if currencies differ
    if rental_currency != trip_currency and raw_amount > 0:
        conv = currency_service.convert_currency(raw_amount, rental_currency, trip_currency)
        converted_amount = round(conv["converted_amount"], 2)
    else:
        converted_amount = round(raw_amount, 2)

    ref_number = data.get("reference_number") or f"REN-{uuid.uuid4().hex[:8].upper()}"

    # 1. Create booking reservation with type: "rental_car"
    booking_payload = {
        "booking_type": "rental_car",
        "type": "rental_car",
        "title": f"Rental Car: {vehicle_name} ({provider})",
        "provider": provider,
        "reference_number": ref_number,
        "status": data.get("status", "confirmed").lower(),
        "amount": converted_amount,
        "currency": trip_currency,
        "start_date": pickup_date,
        "end_date": dropoff_date,
        "details": {
            "vehicle_name": vehicle_name,
            "category": category,
            "transmission": transmission,
            "pickup_location": pickup_location,
            "dropoff_location": dropoff_location,
            "pickup_date": pickup_date,
            "dropoff_date": dropoff_date,
            "days": days,
            "daily_rate": data.get("daily_rate"),
            "original_currency": rental_currency,
            "original_amount": raw_amount,
            "seats": data.get("seats"),
            "bags": data.get("bags"),
            "unlimited_mileage": data.get("unlimited_mileage", True),
            "spec_tags": data.get("spec_tags", []),
            "badge": data.get("badge", ""),
            "image_url": data.get("image_url", ""),
            "cancellation_policy": data.get("cancellation_policy", ""),
        },
        "booking_url": data.get("booking_url", ""),
        "notes": f"Pre-booked vehicle rental ({days} days) for {trip.get('destination', '')}.",
    }

    try:
        new_booking = booking_model.create_booking(user_id, trip_id, booking_payload)
    except Exception as exc:
        logger.error(f"Failed to create rental car booking: {exc}", exc_info=True)
        return error_response("Failed to save rental car booking.", 500)

    # 2. Automatically log a matching entry in expenses under "Transportation" category
    expense_payload = {
        "category": "transport",
        "amount": converted_amount,
        "currency": trip_currency,
        "date": pickup_date or datetime.now().strftime("%Y-%m-%d"),
        "payment_status": "paid",
        "description": f"Vehicle Rental: {vehicle_name} ({provider}) - {days} days",
        "booking_reference": ref_number,
    }

    try:
        new_expense = expense_model.create_expense(user_id, trip_id, expense_payload)
    except Exception as exc:
        logger.error(f"Failed to log rental car expense: {exc}", exc_info=True)
        new_expense = None

    # 3. Compute updated budget analytics
    all_expenses = expense_model.get_expenses_by_trip(user_id, trip_id)
    analytics = expense_model.compute_budget_analytics(all_expenses, trip)

    return success_response(
        "Vehicle rental confirmed and logged to expenses successfully.",
        {
            "booking": new_booking,
            "expense": new_expense,
            "analytics": analytics,
        },
        201,
    )


# ============================================================================
# TRIP BOOKING MANAGEMENT ENDPOINTS
# ============================================================================

@bookings_bp.route("", methods=["GET"])
@token_required
def list_bookings(trip_id):
    """
    List all saved bookings for a trip.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    booking_type = request.args.get("type", None)
    bookings = booking_model.get_bookings_by_trip(user_id, trip_id, booking_type=booking_type)
    return success_response(
        "Bookings retrieved successfully.",
        {"bookings": bookings, "count": len(bookings)}
    )


@bookings_bp.route("", methods=["POST"])
@token_required
def create_trip_booking(trip_id):
    """
    Save a new booking (flight, hotel, transport, activity) for a trip.
    Note: Clicking a booking link or saving a reservation defaults to 'planned' or 'quoted',
    never automatically marking it as 'confirmed'.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be valid JSON.", 400)

    title = data.get("title", "").strip()
    if not title:
        return error_response("Booking title is required.", 400)

    try:
        new_booking = booking_model.create_booking(user_id, trip_id, data)
        return success_response("Booking created successfully.", {"booking": new_booking}, 201)
    except Exception as exc:
        logger.error(f"Failed to create booking: {exc}", exc_info=True)
        return error_response("Failed to create booking reservation.", 500)


@bookings_bp.route("/<booking_id>", methods=["GET"])
@token_required
def get_trip_booking(trip_id, booking_id):
    """
    Get a single booking by ID.
    """
    user_id = get_current_user_id()
    booking = booking_model.get_booking_by_id(user_id, trip_id, booking_id)
    if not booking:
        return error_response("Booking not found.", 404)
    return success_response("Booking retrieved successfully.", {"booking": booking})


@bookings_bp.route("/<booking_id>", methods=["PUT", "PATCH"])
@token_required
def update_trip_booking(trip_id, booking_id):
    """
    Update booking details or update reservation status (planned -> confirmed, etc.).
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        return error_response("Request body must be valid JSON.", 400)

    try:
        updated = booking_model.update_booking(user_id, trip_id, booking_id, data)
        if not updated:
            return error_response("Booking not found or could not be updated.", 404)
        return success_response("Booking updated successfully.", {"booking": updated})
    except Exception as exc:
        logger.error(f"Failed to update booking: {exc}", exc_info=True)
        return error_response("Failed to update booking.", 500)


@bookings_bp.route("/<booking_id>", methods=["DELETE"])
@token_required
def delete_trip_booking(trip_id, booking_id):
    """
    Delete a booking reservation.
    """
    user_id = get_current_user_id()
    trip = trip_model.get_trip_by_id(user_id, trip_id)
    if trip is None:
        return error_response("Trip not found or unauthorized.", 404)

    try:
        deleted = booking_model.delete_booking(user_id, trip_id, booking_id)
        if not deleted:
            return error_response("Booking not found.", 404)
        return success_response("Booking deleted successfully.")
    except Exception as exc:
        logger.error(f"Failed to delete booking: {exc}", exc_info=True)
        return error_response("Failed to delete booking.", 500)
