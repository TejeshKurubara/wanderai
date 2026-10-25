"""Trip data operations (collection: trips). Every query supports owner and collaborators."""

from datetime import datetime, timezone
import secrets
import string
from models import get_db, to_object_id
from services.image_service import get_destination_image


def _trips():
    return get_db()["trips"]


def ensure_indexes():
    _trips().create_index([("user_id", 1), ("created_at", -1)])
    _trips().create_index([("collaborators.user_id", 1)])
    _trips().create_index("invite_code")


def generate_invite_code(length: int = 6) -> str:
    """Generate a random 6-character uppercase alphanumeric code."""
    clean_chars = "23456789ABCDEFGHJKLMNPQRSTUVWXYZ"
    return "".join(secrets.choice(clean_chars) for _ in range(length))


def serialize_trip(trip: dict, include_itinerary: bool = True) -> dict:
    created_at = trip.get("created_at")
    destination = trip.get("destination", "")
    image_url = trip.get("image_url") or get_destination_image(destination)
    
    # Calculate overview estimated total cost if available
    itinerary = trip.get("itinerary", {})
    estimated_total = None
    if isinstance(itinerary, dict):
        overview = itinerary.get("overview", {})
        if isinstance(overview, dict):
            cost_obj = overview.get("estimated_total_cost", {})
            if isinstance(cost_obj, dict):
                estimated_total = cost_obj.get("amount")

    owner_id_str = str(trip.get("owner_id") or trip.get("user_id") or "")
    invite_code = trip.get("invite_code")
    if not invite_code and "_id" in trip:
        invite_code = generate_invite_code()
        try:
            _trips().update_one({"_id": trip["_id"]}, {"$set": {"invite_code": invite_code}})
        except Exception:
            pass

    collaborators_raw = trip.get("collaborators", [])
    serialized_collabs = []
    for c in collaborators_raw:
        c_uid = str(c.get("user_id") or "")
        joined = c.get("joined_at")
        serialized_collabs.append({
            "user_id": c_uid,
            "name": c.get("name", "Collaborator"),
            "email": c.get("email", ""),
            "role": c.get("role", "editor"),
            "joined_at": joined.isoformat() if isinstance(joined, datetime) else joined,
        })

    data = {
        "id": str(trip["_id"]),
        "user_id": owner_id_str,
        "owner_id": owner_id_str,
        "collaborators": serialized_collabs,
        "invite_code": invite_code,
        "title": trip.get("title", ""),
        "destination": destination,
        "origin": trip.get("origin", ""),
        "days": trip.get("days"),
        "travelers": trip.get("travelers", 1),
        "budget": trip.get("budget"),
        "estimated_total_cost": estimated_total or trip.get("budget"),
        "currency": trip.get("currency", "INR"),
        "start_date": trip.get("start_date"),
        "end_date": trip.get("end_date"),
        "interests": trip.get("interests", []),
        "intermediate_destinations": trip.get("intermediate_destinations", []),
        "transport_preference": trip.get("transport_preference", "Any"),
        "accommodation_preference": trip.get("accommodation_preference", "Mid-range"),
        "food_preference": trip.get("food_preference", "Any"),
        "accessibility_requirements": trip.get("accessibility_requirements", "None"),
        "booking_status": trip.get("booking_status", "planned"),
        "image_url": image_url,
        "display_currency": trip.get("display_currency") or trip.get("currency", "INR"),
        "completed_activities": trip.get("completed_activities", []),
        "has_revision_history": bool(trip.get("itinerary_history")),
        "history_count": len(trip.get("itinerary_history", [])),
        "created_at": created_at.isoformat() if created_at else None,
    }
    
    if include_itinerary:
        data["itinerary"] = itinerary
    else:
        # Lightweight summary representation for high-speed dashboard loading
        overview_info = itinerary.get("overview", {}) if isinstance(itinerary, dict) else {}
        data["overview"] = overview_info
        
    return data


def create_trip(user_id: str, trip_data: dict) -> dict:
    """Save a trip for a user and return its serialized form."""
    destination = trip_data.get("destination", "")
    image_url = trip_data.get("image_url") or get_destination_image(destination)
    owner_oid = to_object_id(user_id)
    invite_code = generate_invite_code()

    document = {
        "user_id": owner_oid,
        "owner_id": owner_oid,
        "collaborators": [],
        "invite_code": invite_code,
        "title": trip_data.get("title"),
        "destination": destination,
        "origin": trip_data.get("origin", ""),
        "days": trip_data.get("days"),
        "travelers": trip_data.get("travelers", 1),
        "budget": trip_data.get("budget"),
        "currency": trip_data.get("currency", "INR"),
        "start_date": trip_data.get("start_date"),
        "end_date": trip_data.get("end_date"),
        "interests": trip_data.get("interests", []),
        "intermediate_destinations": trip_data.get("intermediate_destinations", []),
        "transport_preference": trip_data.get("transport_preference", "Any"),
        "accommodation_preference": trip_data.get("accommodation_preference", "Mid-range"),
        "food_preference": trip_data.get("food_preference", "Any"),
        "accessibility_requirements": trip_data.get("accessibility_requirements", "None"),
        "booking_status": trip_data.get("booking_status", "planned"),
        "image_url": image_url,
        "itinerary": trip_data.get("itinerary", {}),
        "created_at": datetime.now(timezone.utc),
    }
    result = _trips().insert_one(document)
    document["_id"] = result.inserted_id
    return serialize_trip(document)


def get_trips_by_user(user_id: str) -> list:
    """Full trip objects for trips owned by or shared with the user."""
    owner = to_object_id(user_id)
    if owner is None:
        return []
    query = {
        "$or": [
            {"user_id": owner},
            {"owner_id": owner},
            {"collaborators.user_id": owner},
        ]
    }
    cursor = _trips().find(query).sort("created_at", -1)
    return [serialize_trip(trip, include_itinerary=True) for trip in cursor]


def get_trip_summaries_by_user(user_id: str) -> list:
    """Lightweight trip summaries optimized for instant dashboard loading."""
    owner = to_object_id(user_id)
    if owner is None:
        return []
    projection = {
        "itinerary.days": 0
    }
    query = {
        "$or": [
            {"user_id": owner},
            {"owner_id": owner},
            {"collaborators.user_id": owner},
        ]
    }
    cursor = _trips().find(query, projection).sort("created_at", -1)
    return [serialize_trip(trip, include_itinerary=False) for trip in cursor]


def get_trip_by_id(user_id: str, trip_id: str):
    """Return the trip if user is the owner or a collaborator; otherwise None."""
    owner, oid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or oid is None:
        return None
    query = {
        "_id": oid,
        "$or": [
            {"user_id": owner},
            {"owner_id": owner},
            {"collaborators.user_id": owner},
        ]
    }
    trip = _trips().find_one(query)
    return serialize_trip(trip, include_itinerary=True) if trip else None


def update_trip(user_id: str, trip_id: str, updates: dict):
    """Update allowed fields of a trip (if user is owner or editor)."""
    owner, oid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or oid is None:
        return None
    
    trip = _trips().find_one({
        "_id": oid,
        "$or": [
            {"user_id": owner},
            {"owner_id": owner},
            {"collaborators": {"$elemMatch": {"user_id": owner, "role": "editor"}}},
        ]
    })
    if not trip:
        return None

    allowed_fields = {
        "title", "origin", "destination", "budget", "currency", 
        "start_date", "end_date", "travelers", "days", "interests",
        "booking_status", "transport_preference", "accommodation_preference",
        "food_preference", "accessibility_requirements", "image_url",
        "display_currency"
    }
    clean_updates = {k: v for k, v in updates.items() if k in allowed_fields}
    
    if "destination" in clean_updates and "image_url" not in clean_updates:
        clean_updates["image_url"] = get_destination_image(clean_updates["destination"])
        
    if clean_updates:
        clean_updates["updated_at"] = datetime.now(timezone.utc)
        _trips().update_one({"_id": oid}, {"$set": clean_updates})
        
    return get_trip_by_id(user_id, trip_id)


def push_itinerary_revision(user_id: str, trip_id: str, new_itinerary: dict, change_reason: str = "Optimization") -> dict | None:
    owner, oid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or oid is None:
        return None
    trip = _trips().find_one({
        "_id": oid,
        "$or": [
            {"user_id": owner},
            {"owner_id": owner},
            {"collaborators": {"$elemMatch": {"user_id": owner, "role": "editor"}}},
        ]
    })
    if not trip:
        return None
        
    current_itinerary = trip.get("itinerary", {})
    history = trip.get("itinerary_history", [])
    history.append({
        "itinerary": current_itinerary,
        "reason": change_reason,
        "saved_at": datetime.now(timezone.utc).isoformat()
    })
    if len(history) > 10:
        history = history[-10:]

    _trips().update_one(
        {"_id": oid},
        {
            "$set": {
                "itinerary": new_itinerary,
                "itinerary_history": history,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    return get_trip_by_id(user_id, trip_id)


def undo_itinerary_revision(user_id: str, trip_id: str) -> dict | None:
    owner, oid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or oid is None:
        return None
    trip = _trips().find_one({
        "_id": oid,
        "$or": [
            {"user_id": owner},
            {"owner_id": owner},
            {"collaborators": {"$elemMatch": {"user_id": owner, "role": "editor"}}},
        ]
    })
    if not trip:
        return None
        
    history = trip.get("itinerary_history", [])
    if not history:
        return None
        
    last_revision = history.pop()
    restored_itinerary = last_revision.get("itinerary", {})

    _trips().update_one(
        {"_id": oid},
        {
            "$set": {
                "itinerary": restored_itinerary,
                "itinerary_history": history,
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    return get_trip_by_id(user_id, trip_id)


def toggle_activity_completion(user_id: str, trip_id: str, activity_name: str, completed: bool = True) -> dict | None:
    owner, oid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or oid is None or not activity_name:
        return None

    query = {
        "_id": oid,
        "$or": [
            {"user_id": owner},
            {"owner_id": owner},
            {"collaborators.user_id": owner},
        ]
    }

    if completed:
        _trips().update_one(
            query,
            {
                "$addToSet": {"completed_activities": activity_name},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    else:
        _trips().update_one(
            query,
            {
                "$pull": {"completed_activities": activity_name},
                "$set": {"updated_at": datetime.now(timezone.utc)}
            }
        )
    return get_trip_by_id(user_id, trip_id)


def set_trip_display_currency(user_id: str, trip_id: str, currency_code: str) -> dict | None:
    owner, oid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or oid is None or not currency_code:
        return None
    _trips().update_one(
        {
            "_id": oid,
            "$or": [
                {"user_id": owner},
                {"owner_id": owner},
                {"collaborators.user_id": owner},
            ]
        },
        {
            "$set": {
                "display_currency": currency_code.upper().strip(),
                "updated_at": datetime.now(timezone.utc)
            }
        }
    )
    return get_trip_by_id(user_id, trip_id)


def delete_trip(user_id: str, trip_id: str) -> bool:
    """Delete the trip only if it belongs to the owner."""
    owner, oid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or oid is None:
        return False
    return _trips().delete_one({
        "_id": oid,
        "$or": [{"user_id": owner}, {"owner_id": owner}]
    }).deleted_count == 1


# --- Collaboration Features ---

def generate_trip_invite_code(user_id: str, trip_id: str) -> str | None:
    """Generate and save a fresh 6-char alphanumeric invite code for the trip."""
    owner, oid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or oid is None:
        return None
    trip = _trips().find_one({
        "_id": oid,
        "$or": [
            {"user_id": owner},
            {"owner_id": owner},
            {"collaborators": {"$elemMatch": {"user_id": owner, "role": "editor"}}},
        ]
    })
    if not trip:
        return None

    code = generate_invite_code()
    _trips().update_one({"_id": oid}, {"$set": {"invite_code": code}})
    return code


def join_trip_by_code(user_id: str, invite_code: str):
    """Join a trip using its 6-character alphanumeric invite code."""
    from models import user_model
    clean_code = (invite_code or "").strip().upper()
    if not clean_code or len(clean_code) < 4:
        return None, "Invalid invite code format."

    trip = _trips().find_one({"invite_code": clean_code})
    if not trip:
        return None, "Trip not found with the specified invite code."

    uid = to_object_id(user_id)
    if uid is None:
        return None, "Invalid user identifier."

    owner_id = trip.get("owner_id") or trip.get("user_id")
    if owner_id == uid:
        return serialize_trip(trip), "You are already the owner of this trip."

    # Check if already a collaborator
    existing_collabs = trip.get("collaborators", [])
    for c in existing_collabs:
        if c.get("user_id") == uid:
            return serialize_trip(trip), "You are already a collaborator on this trip."

    # Fetch joining user's profile
    user_doc = user_model.find_user_by_id(user_id)
    user_name = user_doc.get("name", "Fellow Traveler") if user_doc else "Fellow Traveler"
    user_email = user_doc.get("email", "") if user_doc else ""

    new_collaborator = {
        "user_id": uid,
        "name": user_name,
        "email": user_email,
        "role": "editor",
        "joined_at": datetime.now(timezone.utc),
    }

    _trips().update_one(
        {"_id": trip["_id"]},
        {"$push": {"collaborators": new_collaborator}}
    )

    updated_trip = _trips().find_one({"_id": trip["_id"]})
    return serialize_trip(updated_trip), "Successfully joined the trip!"


def get_trip_collaborators(user_id: str, trip_id: str) -> dict | None:
    """Get the owner and list of collaborators for a trip."""
    from models import user_model
    owner, oid = to_object_id(user_id), to_object_id(trip_id)
    if owner is None or oid is None:
        return None

    trip = _trips().find_one({
        "_id": oid,
        "$or": [
            {"user_id": owner},
            {"owner_id": owner},
            {"collaborators.user_id": owner},
        ]
    })
    if not trip:
        return None

    owner_uid = trip.get("owner_id") or trip.get("user_id")
    owner_user = user_model.find_user_by_id(str(owner_uid)) if owner_uid else None
    owner_data = {
        "user_id": str(owner_uid),
        "name": owner_user.get("name", "Trip Owner") if owner_user else "Trip Owner",
        "email": owner_user.get("email", "") if owner_user else "",
        "role": "owner",
    }

    collaborators = []
    for c in trip.get("collaborators", []):
        c_joined = c.get("joined_at")
        collaborators.append({
            "user_id": str(c.get("user_id")),
            "name": c.get("name", "Collaborator"),
            "email": c.get("email", ""),
            "role": c.get("role", "editor"),
            "joined_at": c_joined.isoformat() if isinstance(c_joined, datetime) else c_joined,
        })

    return {
        "owner": owner_data,
        "collaborators": collaborators,
        "invite_code": trip.get("invite_code") or "",
        "total_members": 1 + len(collaborators),
    }


def remove_trip_collaborator(owner_id: str, trip_id: str, target_user_id: str) -> bool:
    """Remove a collaborator from a trip (owner only)."""
    owner, oid, target = to_object_id(owner_id), to_object_id(trip_id), to_object_id(target_user_id)
    if owner is None or oid is None or target is None:
        return False

    trip = _trips().find_one({
        "_id": oid,
        "$or": [{"user_id": owner}, {"owner_id": owner}]
    })
    if not trip:
        return False

    res = _trips().update_one(
        {"_id": oid},
        {"$pull": {"collaborators": {"user_id": target}}}
    )
    return res.modified_count > 0
