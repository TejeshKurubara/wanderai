"""
WanderAI Contextual Travel Companion Service
Provides grounded conversational assistance within trip details.
Combines zero-latency deterministic extraction for budget, bookings, and next stops
with LLM intelligence for recommendations and travel advice.
"""

import logging
import re
from datetime import datetime, timezone
from config import Config
from bson import ObjectId
from models import get_db, trip_model, expense_model, booking_model
from services import currency_service, gemini_service

logger = logging.getLogger(__name__)


def _messages_col():
    try:
        db = get_db()
        return db["companion_messages"] if db is not None else None
    except Exception:
        return None


def get_conversation_history(user_id: str, trip_id: str, limit: int = 50) -> list:
    """Retrieve message history for a user and trip."""
    col = _messages_col()
    if col is None:
        return []
    try:
        cursor = col.find(
            {"trip_id": str(trip_id), "user_id": str(user_id)}
        ).sort("created_at", 1).limit(limit)

        messages = []
        for doc in cursor:
            messages.append({
                "id": str(doc["_id"]),
                "role": doc.get("role", "assistant"),
                "content": doc.get("content", ""),
                "created_at": doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else doc.get("created_at"),
                "is_deterministic": doc.get("is_deterministic", False),
            })
        return messages
    except Exception as exc:
        logger.warning(f"Error fetching companion history: {exc}")
        return []


def save_message(user_id: str, trip_id: str, role: str, content: str, is_deterministic: bool = False) -> dict:
    """Save user or companion message to MongoDB."""
    doc = {
        "user_id": str(user_id),
        "trip_id": str(trip_id),
        "role": role,
        "content": content,
        "is_deterministic": is_deterministic,
        "created_at": datetime.now(timezone.utc),
    }
    col = _messages_col()
    if col is not None:
        try:
            res = col.insert_one(doc)
            doc["id"] = str(res.inserted_id)
            doc["_id"] = str(res.inserted_id)
        except Exception as exc:
            logger.warning(f"Failed to persist companion message: {exc}")
    doc["created_at"] = doc["created_at"].isoformat() if isinstance(doc.get("created_at"), datetime) else str(doc.get("created_at"))
    return doc


def clear_conversation(user_id: str, trip_id: str) -> bool:
    """Clear message history for a trip."""
    col = _messages_col()
    if col is None:
        return True
    try:
        res = col.delete_many({"trip_id": str(trip_id), "user_id": str(user_id)})
        return res.deleted_count >= 0
    except Exception as exc:
        logger.warning(f"Failed to clear companion conversation: {exc}")
        return True


def get_companion_history(user_id: str, trip_id: str, limit: int = 50) -> list:
    return get_conversation_history(user_id, trip_id, limit=limit)


def clear_companion_history(user_id: str, trip_id: str) -> bool:
    return clear_conversation(user_id, trip_id)


def answer_trip_query(user_id: str, trip_or_id, user_message: str) -> dict:
    """
    Answers a query contextualized with the user's saved trip, itinerary,
    expenses, bookings, and preferences.
    """
    msg_clean = user_message.strip()
    msg_lower = msg_clean.lower()

    if isinstance(trip_or_id, dict):
        trip = trip_or_id
        trip_id = str(trip.get("id") or trip.get("_id") or "")
    else:
        trip_id = str(trip_or_id)
        trip = trip_model.get_trip_by_id(user_id, trip_id)

    if not trip:
        return {"response": "I could not locate this trip in your account.", "is_deterministic": True}

    destination = trip.get("destination", "your destination")
    currency = trip.get("currency", "INR")
    total_budget = float(trip.get("budget") or 0.0)

    try:
        expenses = expense_model.get_expenses_by_trip(user_id, trip_id) if trip_id else []
    except Exception:
        expenses = []

    try:
        analytics = expense_model.compute_budget_analytics(expenses, trip)
    except Exception:
        analytics = {
            "total_budget": total_budget,
            "actual_paid_expenses": 0.0,
            "remaining_budget": total_budget,
            "budget_used_percentage": 0.0,
            "is_over_budget": False,
            "overrun_amount": 0.0,
            "expense_count": 0,
            "pending_commitments": 0.0,
        }

    try:
        bookings = booking_model.get_bookings_by_trip(user_id, trip_id) if trip_id else []
    except Exception:
        bookings = []

    # 1. Deterministic Financial Answers
    if any(q in msg_lower for q in ["how much have i spent", "total spent", "expenses so far", "what did i spend"]):
        actual_paid = analytics["actual_paid_expenses"]
        rem = analytics["remaining_budget"]
        pct = analytics["budget_used_percentage"]
        return {
            "response": f"📊 **Expense Summary for {destination}**:\n"
                        f"- Total Paid So Far: **{currency} {actual_paid:,.2f}** ({pct}% of budget)\n"
                        f"- Remaining Budget: **{currency} {rem:,.2f}**\n"
                        f"- Total Logged Expenses: {analytics['expense_count']} records\n"
                        f"- Pending Commitments: {currency} {analytics['pending_commitments']:,.2f}",
            "is_deterministic": True,
            "intent": "expenses",
        }

    if any(q in msg_lower for q in ["remaining budget", "how much money left", "funds left", "balance"]):
        rem = analytics["remaining_budget"]
        is_over = analytics["is_over_budget"]
        overrun = analytics["overrun_amount"]

        if is_over:
            reply = f"⚠️ You are currently **over budget** by **{currency} {overrun:,.2f}**! Consider checking the Budget & Expenses tab to trim upcoming discretionary spending."
        else:
            reply = f"💰 You have **{currency} {rem:,.2f}** remaining in your allocated budget of {currency} {total_budget:,.2f} ({100 - analytics['budget_used_percentage']:.1f}% available)."
        return {"response": reply, "is_deterministic": True, "intent": "budget_remaining"}

    # 2. Deterministic Bookings Answers
    if any(q in msg_lower for q in ["pending bookings", "which bookings are pending", "unconfirmed reservations", "my bookings"]):
        if not bookings:
            return {
                "response": f"You currently have no saved reservations for {destination}. You can browse and save flights or hotels under the Flights and Hotels tabs.",
                "is_deterministic": True,
                "intent": "bookings",
            }
        planned = [b for b in bookings if b.get("status") in ("planned", "quoted", "pending")]
        confirmed = [b for b in bookings if b.get("status") == "confirmed"]

        resp_lines = [f"📋 **Reservation Status for {destination}**:"]
        if confirmed:
            resp_lines.append(f"\n✅ **Confirmed ({len(confirmed)})**:")
            for b in confirmed[:4]:
                resp_lines.append(f"- {b.get('title')} ({b.get('provider')})")
        if planned:
            resp_lines.append(f"\n⏳ **Pending / Planned ({len(planned)})**:")
            for b in planned[:4]:
                resp_lines.append(f"- {b.get('title')} — Status: *{b.get('status').capitalize()}* ({currency} {b.get('amount'):,.2f})")
        else:
            resp_lines.append("\nAll your current reservations are confirmed!")

        return {"response": "\n".join(resp_lines), "is_deterministic": True, "intent": "bookings"}

    # 3. Deterministic Schedule & Next stop
    if any(q in msg_lower for q in ["what should i visit next", "next place", "what's next", "where next"]):
        days = trip.get("itinerary", {}).get("days", [])
        if days and len(days) > 0:
            first_day = days[0]
            acts = first_day.get("activities", [])
            if acts:
                act = acts[0]
                name = act.get("name") or act.get("title") or "First Destination"
                desc = act.get("description", "Enjoy your upcoming exploration.")
                return {
                    "response": f"📍 **Next Recommendation**: **{name}**\n\n"
                                f"🕒 Suggested Time: {act.get('time', 'Morning')}\n"
                                f"📝 {desc}\n\n"
                                f"💡 *Pro-Tip: Check the 'Route Optimization' tab to view verified travel times and stop sequences.*",
                    "is_deterministic": True,
                    "intent": "next_stop",
                }

    # 3b. Deterministic Car & Vehicle Rental Answers
    rental_bookings = [
        b for b in bookings
        if str(b.get("booking_type", "")).lower() in ("rental_car", "car_rental")
        or "rental" in str(b.get("title", "")).lower()
        or b.get("details", {}).get("vehicle_name")
    ]

    # Pickup question: "Where do I pick up the rental car?"
    if any(q in msg_lower for q in [
        "pick up the rental car", "pickup the rental car", "where do i pick up",
        "where is the rental car", "pick up location", "pickup location",
        "where to collect the car", "collect the car", "car pickup", "vehicle pickup"
    ]):
        if rental_bookings:
            b = rental_bookings[0]
            details = b.get("details", {})
            car_title = details.get("vehicle_name") or b.get("title", "Rental Vehicle")
            provider = b.get("provider", "Direct Rental")
            pickup_loc = details.get("pickup_location") or f"{destination} Main Transportation Hub"
            start_date = b.get("start_date") or details.get("pickup_date") or "your scheduled arrival date"
            ref_no = b.get("reference_number")

            ref_line = f"\n- **Confirmation Number**: `{ref_no}`" if ref_no else ""
            return {
                "response": f"🚗 **Rental Car Pick-Up Information**:\n"
                            f"- **Vehicle**: **{car_title}**\n"
                            f"- **Rental Provider**: {provider}\n"
                            f"- **Pick-Up Location**: 📍 **{pickup_loc}**\n"
                            f"- **Pick-Up Date**: {start_date}{ref_line}\n\n"
                            f"💡 *Pro-Tip: Please bring your valid driver's license, passport or photo ID, and the credit card used for the security deposit.*",
                "is_deterministic": True,
                "intent": "rental_pickup",
            }
        else:
            return {
                "response": f"You haven't reserved a rental car for {destination} yet. You can browse and pre-book vehicles anytime under the **'🚗 Vehicle Rentals'** tab.",
                "is_deterministic": True,
                "intent": "rental_pickup_empty",
            }

    # Drop-off deadline question: "When is the vehicle drop-off deadline?"
    if any(q in msg_lower for q in [
        "drop-off deadline", "dropoff deadline", "drop off deadline", "vehicle drop-off",
        "when is the vehicle drop", "return the rental car", "when to return the car",
        "car return deadline", "vehicle return", "return deadline"
    ]):
        if rental_bookings:
            b = rental_bookings[0]
            details = b.get("details", {})
            car_title = details.get("vehicle_name") or b.get("title", "Rental Vehicle")
            provider = b.get("provider", "Direct Rental")
            dropoff_loc = details.get("dropoff_location") or details.get("pickup_location") or f"{destination} Airport Hub"
            end_date = b.get("end_date") or details.get("dropoff_date") or "the final day of your rental reservation"

            return {
                "response": f"🚗 **Rental Vehicle Drop-Off Details**:\n"
                            f"- **Vehicle**: **{car_title}** ({provider})\n"
                            f"- **Drop-Off Deadline**: ⏰ **{end_date}** (before standard return cutoff time)\n"
                            f"- **Return Station**: 📍 **{dropoff_loc}**\n\n"
                            f"💡 *Pro-Tip: Allow 20-30 minutes for vehicle walk-around inspection and ensure the fuel tank matches your rental policy (Full-to-Full) to avoid extra fees.*",
                "is_deterministic": True,
                "intent": "rental_dropoff",
            }
        else:
            return {
                "response": f"There are no active rental vehicle reservations on file for this trip. You can find available cars under the **'🚗 Vehicle Rentals'** tab.",
                "is_deterministic": True,
                "intent": "rental_dropoff_empty",
            }

    # General rental car inquiry
    if any(q in msg_lower for q in ["my rental car", "rental car details", "booked vehicle", "hired car"]):
        if rental_bookings:
            lines = ["🚗 **Your Booked Vehicle Rentals**:"]
            for b in rental_bookings:
                d = b.get("details", {})
                title = d.get("vehicle_name") or b.get("title")
                prov = b.get("provider", "Direct")
                dates = f"{b.get('start_date', 'N/A')} → {b.get('end_date', 'N/A')}"
                lines.append(f"- **{title}** ({prov}) | Dates: {dates} | Status: *{b.get('status', 'confirmed').capitalize()}*")
            return {"response": "\n".join(lines), "is_deterministic": True, "intent": "rental_list"}

    # Day schedule query: e.g. "schedule for day 1"
    day_match = re.search(r"day\s*(\d+)", msg_lower)
    if day_match and any(k in msg_lower for k in ["schedule", "plan", "activities", "what am i doing"]):
        day_num = int(day_match.group(1))
        days = trip.get("itinerary", {}).get("days", [])
        matched_day = next((d for d in days if d.get("day_number") == day_num), None)
        if matched_day:
            acts = matched_day.get("activities", [])
            acts_lines = [f"- **{a.get('name') or a.get('title')}** ({a.get('time', 'Flexible')}) — {a.get('description', '')[:70]}..." for a in acts]
            return {
                "response": f"📅 **Schedule for Day {day_num} ({matched_day.get('theme', 'Exploration')})**:\n" + "\n".join(acts_lines),
                "is_deterministic": True,
                "intent": "day_schedule",
            }

    # 4. Deterministic Currency Conversion
    convert_match = re.search(r"convert\s+(\d+(?:\.\d+)?)\s*([a-zA-Z]{3})?\s*(?:to|into|in)\s*([a-zA-Z]{3})", msg_lower)
    if convert_match:
        val = float(convert_match.group(1))
        f_curr = convert_match.group(2).upper() if convert_match.group(2) else currency
        t_curr = convert_match.group(3).upper()
        res = currency_service.convert_currency(val, f_curr, t_curr)
        rate_src = "Live Exchange API" if res.get("is_live") else "Benchmark Rate"
        return {
            "response": f"💱 **Currency Conversion**:\n"
                        f"**{f_curr} {val:,.2f}** = **{t_curr} {res['converted_amount']:,.2f}**\n"
                        f"Rate: 1 {f_curr} = {res['rate']} {t_curr} *(Source: {rate_src})*",
            "is_deterministic": True,
            "intent": "currency_conversion",
        }

    # 5. Contextual AI Query Generation (Gemini with Groq fallback)
    itinerary_days = trip.get("itinerary", {}).get("days", [])
    days_summary = []
    for d in itinerary_days[:4]:
        acts_str = ", ".join([a.get("name") or a.get("title") or "" for a in d.get("activities", [])[:3]])
        days_summary.append(f"Day {d.get('day_number', 1)}: {acts_str}")
    itinerary_text = " | ".join(days_summary)

    rentals_summary = [
        f"{b.get('title')} (Pick-up: {b.get('details', {}).get('pickup_location', 'Hub')}, Return: {b.get('details', {}).get('dropoff_location', 'Hub')}, Dates: {b.get('start_date')} to {b.get('end_date')})"
        for b in rental_bookings
    ]
    rentals_text = "; ".join(rentals_summary) if rentals_summary else "No vehicle rentals booked yet"

    prompt = (
        f"You are WanderAI Travel Companion, an intelligent concierge assisting a traveler in {destination}.\n\n"
        f"TRIP CONTEXT:\n"
        f"- Destination: {destination}\n"
        f"- Days: {trip.get('days')} days\n"
        f"- Travelers: {trip.get('travelers', 1)}\n"
        f"- Budget: {currency} {total_budget:,.2f} (Paid so far: {currency} {analytics['actual_paid_expenses']:,.2f}, Remaining: {currency} {analytics['remaining_budget']:,.2f})\n"
        f"- Saved Bookings: {len(bookings)} bookings saved\n"
        f"- Booked Rental Vehicles: {rentals_text}\n"
        f"- Current Itinerary: {itinerary_text}\n"
        f"- Traveler Preferences: Transport={trip.get('transport_preference')}, Food={trip.get('food_preference')}, Accessibility={trip.get('accessibility_requirements')}\n\n"
        f"USER QUESTION: {msg_clean}\n\n"
        f"INSTRUCTIONS:\n"
        f"1. Answer concisely, practically, and empathetically using the real trip context above.\n"
        f"2. Never fabricate live traffic or invent fake booking reference numbers.\n"
        f"3. Provide actionable suggestions with brief tips."
    )

    try:
        raw_ai_response = gemini_service.call_ai_text(prompt, max_tokens=600)
        return {"response": raw_ai_response.strip(), "is_deterministic": False, "intent": "ai_advice"}
    except Exception as exc:
        logger.warning("[COMPANION SERVICE] AI call failed, providing rule-based guidance: %s", exc)
        return {
            "response": f"I am your local concierge for {destination}! You have {trip.get('days')} days planned with a remaining budget of {currency} {analytics['remaining_budget']:,.2f}. For dining, attractions, and routes, check the tabs above or ask for remaining budget, pending bookings, or currency conversion.",
            "is_deterministic": True,
            "intent": "guidance_fallback",
        }


def process_companion_chat(user_id: str, trip_or_id, message: str) -> dict:
    """Process incoming chat, persists user and assistant messages to MongoDB, and returns reply."""
    if isinstance(trip_or_id, dict):
        trip = trip_or_id
        trip_id = str(trip.get("id") or trip.get("_id") or "")
    else:
        trip_id = str(trip_or_id)
        trip = trip_model.get_trip_by_id(user_id, trip_id)

    if trip_id:
        save_message(user_id, trip_id, role="user", content=message)

    result = answer_trip_query(user_id, trip or trip_id, message)
    reply_text = result.get("response", "")
    is_det = result.get("is_deterministic", False)

    if trip_id:
        save_message(user_id, trip_id, role="assistant", content=reply_text, is_deterministic=is_det)

    return {
        "message": reply_text,
        "is_deterministic": is_det,
        "intent": result.get("intent", "query"),
        "trip_id": trip_id,
    }
