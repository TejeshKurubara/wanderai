"""
Booking model for WanderAI.
Manages flight, hotel, transport, and activity reservations in MongoDB.
"""

from datetime import datetime
from bson import ObjectId
from models import get_db
import logging

logger = logging.getLogger(__name__)

# Valid booking statuses
# Important: Default is 'planned' or 'quoted'. It must never default to 'confirmed'.
VALID_STATUSES = {"planned", "quoted", "pending", "confirmed", "cancelled", "refunded"}
VALID_TYPES = {"flight", "hotel", "train", "bus", "car_rental", "rental_car", "activity", "other"}


def _serialize_booking(booking: dict) -> dict:
    """Convert Mongo document to JSON serializable dict."""
    if not booking:
        return {}
    booking_copy = dict(booking)
    if "_id" in booking_copy:
        booking_copy["_id"] = str(booking_copy["_id"])
        booking_copy["id"] = booking_copy["_id"]
    if "trip_id" in booking_copy and isinstance(booking_copy["trip_id"], ObjectId):
        booking_copy["trip_id"] = str(booking_copy["trip_id"])
    if "user_id" in booking_copy and isinstance(booking_copy["user_id"], ObjectId):
        booking_copy["user_id"] = str(booking_copy["user_id"])
    if isinstance(booking_copy.get("created_at"), datetime):
        booking_copy["created_at"] = booking_copy["created_at"].isoformat()
    if isinstance(booking_copy.get("updated_at"), datetime):
        booking_copy["updated_at"] = booking_copy["updated_at"].isoformat()
    return booking_copy


def create_booking(user_id: str, trip_id: str, data: dict) -> dict:
    """
    Create a new booking reservation.
    """
    db = get_db()
    if db is None:
        raise RuntimeError("Database connection not available")

    # Validate status
    status = data.get("status", "planned").lower()
    if status not in VALID_STATUSES:
        status = "planned"

    booking_type = (data.get("booking_type") or data.get("type") or "flight").lower()
    if booking_type not in VALID_TYPES:
        booking_type = "other"

    booking_doc = {
        "trip_id": ObjectId(trip_id) if ObjectId.is_valid(trip_id) else trip_id,
        "user_id": ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id,
        "booking_type": booking_type,
        "type": booking_type,
        "title": data.get("title", f"Reservation - {booking_type.capitalize()}"),
        "provider": data.get("provider", "Direct"),
        "reference_number": data.get("reference_number", ""),
        "status": status,
        "amount": float(data.get("amount", 0.0)),
        "currency": data.get("currency", "INR"),
        "start_date": data.get("start_date", ""),
        "end_date": data.get("end_date", ""),
        "details": data.get("details", {}),
        "booking_url": data.get("booking_url", ""),
        "notes": data.get("notes", ""),
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = db.bookings.insert_one(booking_doc)
    booking_doc["_id"] = result.inserted_id
    return _serialize_booking(booking_doc)


def get_bookings_by_trip(user_id: str, trip_id: str, booking_type: str = None) -> list:
    """
    Retrieve all bookings for a trip owned by the user.
    """
    db = get_db()
    if db is None:
        return []

    t_id = ObjectId(trip_id) if ObjectId.is_valid(trip_id) else trip_id
    u_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    query = {"trip_id": t_id, "user_id": u_id}
    if booking_type and booking_type in VALID_TYPES:
        query["booking_type"] = booking_type

    cursor = db.bookings.find(query).sort("created_at", -1)
    return [_serialize_booking(doc) for doc in cursor]


def get_booking_by_id(user_id: str, trip_id: str, booking_id: str) -> dict:
    """
    Get a single booking record.
    """
    db = get_db()
    if db is None:
        return {}

    b_id = ObjectId(booking_id) if ObjectId.is_valid(booking_id) else booking_id
    t_id = ObjectId(trip_id) if ObjectId.is_valid(trip_id) else trip_id
    u_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    doc = db.bookings.find_one({"_id": b_id, "trip_id": t_id, "user_id": u_id})
    return _serialize_booking(doc) if doc else {}


def update_booking(user_id: str, trip_id: str, booking_id: str, updates: dict) -> dict:
    """
    Update booking details.
    """
    db = get_db()
    if db is None:
        raise RuntimeError("Database connection not available")

    b_id = ObjectId(booking_id) if ObjectId.is_valid(booking_id) else booking_id
    t_id = ObjectId(trip_id) if ObjectId.is_valid(trip_id) else trip_id
    u_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    clean_updates = {}
    allowed_fields = [
        "title", "provider", "reference_number", "status", "amount",
        "currency", "start_date", "end_date", "details", "booking_url", "notes"
    ]
    for key in allowed_fields:
        if key in updates:
            if key == "amount":
                clean_updates[key] = float(updates[key])
            elif key == "status":
                st = str(updates[key]).lower()
                clean_updates[key] = st if st in VALID_STATUSES else "planned"
            else:
                clean_updates[key] = updates[key]

    clean_updates["updated_at"] = datetime.utcnow()

    res = db.bookings.find_one_and_update(
        {"_id": b_id, "trip_id": t_id, "user_id": u_id},
        {"$set": clean_updates},
        return_document=True
    )
    return _serialize_booking(res) if res else {}


def delete_booking(user_id: str, trip_id: str, booking_id: str) -> bool:
    """
    Delete a booking.
    """
    db = get_db()
    if db is None:
        return False

    b_id = ObjectId(booking_id) if ObjectId.is_valid(booking_id) else booking_id
    t_id = ObjectId(trip_id) if ObjectId.is_valid(trip_id) else trip_id
    u_id = ObjectId(user_id) if ObjectId.is_valid(user_id) else user_id

    res = db.bookings.delete_one({"_id": b_id, "trip_id": t_id, "user_id": u_id})
    return res.deleted_count > 0
