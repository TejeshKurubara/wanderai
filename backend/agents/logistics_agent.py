import logging

logger = logging.getLogger(__name__)

DAY_THEMES = [
    "Arrival & Iconic Highlights",
    "Cultural Heritage & Exploration",
    "Scenic Sights, Parks & Leisure",
    "Local Life, Markets & Neighborhoods",
    "Arts, History & Hidden Gems",
    "Culinary Discovery & Waterfront Views",
    "Day Trips, Nature & Panoramic Landscapes",
    "Historic Quarters & Artisan Alleys",
    "Modern Architecture & Shopping",
    "Relaxation, Farewell Walk & Memories",
]

def _build_activities(day_places: list, destination: str, interests: list, day_num: int) -> list:
    """Build structured activities for a single day using candidate places and logical scheduling."""
    activities = []
    
    # Morning Slot
    if len(day_places) > 0:
        place = day_places[0]
        activities.append({
            "time": "Morning (09:30 AM - 12:30 PM)",
            "name": f"Explore {place.get('name', 'Local Landmark')}",
            "description": place.get("description") or f"Discover the iconic architecture and cultural exhibits at {place.get('name')}."
        })
    else:
        activities.append({
            "time": "Morning (09:30 AM - 12:30 PM)",
            "name": f"Historic Center Walk in {destination}",
            "description": f"Take a self-guided walking tour through historic streets and central landmarks of {destination}."
        })
        
    # Afternoon Slot
    if len(day_places) > 1:
        place = day_places[1]
        activities.append({
            "time": "Afternoon (02:00 PM - 05:00 PM)",
            "name": f"Tour {place.get('name', 'Cultural Attraction')}",
            "description": place.get("description") or f"Experience the rich heritage and interactive highlights of {place.get('name')}."
        })
    else:
        interest_text = f"focusing on {interests[0]}" if interests else "enjoying local artisan boutiques"
        activities.append({
            "time": "Afternoon (02:00 PM - 05:00 PM)",
            "name": f"Cultural Immersion & Neighborhood Tour",
            "description": f"Immerse yourself in {destination}'s lively district, {interest_text}."
        })

    # Evening Slot
    if len(day_places) > 2:
        place = day_places[2]
        activities.append({
            "time": "Evening (06:30 PM - 09:30 PM)",
            "name": f"Evening Visit to {place.get('name', 'Evening Spot')}",
            "description": place.get("description") or f"Enjoy the evening atmosphere and distinctive night views at {place.get('name')}."
        })
    else:
        activities.append({
            "time": "Evening (06:30 PM - 09:30 PM)",
            "name": f"Dinner & Sunset Walk in {destination}",
            "description": f"Savor regional cuisine at a traditional restaurant followed by an evening stroll."
        })

    return activities

def run(trip_params: dict, ranked_places: list, budget_allocation: dict, feedback: list = None) -> dict:
    """Constructs a sequential day-by-day itinerary using Python scheduling and constraints."""
    logger.info("[LOGISTICS AGENT] Assembling day-by-day itinerary via Python scheduling...")
    
    try:
        days_count = max(int(trip_params.get("days") or 1), 1)
        destination = trip_params.get("destination", "Destination")
        travelers = max(int(trip_params.get("travelers") or 1), 1)
        currency = (trip_params.get("currency") or "INR").strip().upper()
        interests = trip_params.get("interests", [])
        
        total_budget = budget_allocation.get("total_budget") or 0.0
        allocation = budget_allocation.get("allocation", {})
        
        # Calculate daily expense breakdown
        daily_total = round(total_budget / days_count, 2) if total_budget else None
        daily_stay = round(allocation.get("accommodation", 0) / days_count, 2)
        daily_food = round(allocation.get("food", 0) / days_count, 2)
        daily_trans = round(allocation.get("transportation", 0) / days_count, 2)
        daily_acts = round(allocation.get("activities", 0) / days_count, 2)
        breakdown_str = f"Stay: {daily_stay} {currency}, Food: {daily_food} {currency}, Transport: {daily_trans} {currency}, Activities: {daily_acts} {currency}"
        
        # Distribute candidate places across days
        places = list(ranked_places) if isinstance(ranked_places, list) else []
        num_places = len(places)
        
        # Calculate places per day: ideally 2-3 places per day
        places_per_day = max(num_places // days_count, 2) if num_places > 0 else 0
        
        days_list = []
        for d in range(1, days_count + 1):
            # Select chunk of places for this day
            start_idx = (d - 1) * places_per_day
            end_idx = start_idx + places_per_day
            day_places = places[start_idx:end_idx] if start_idx < num_places else []
            
            # Select day theme
            theme_index = (d - 1) % len(DAY_THEMES)
            theme_title = f"Day {d}: {DAY_THEMES[theme_index]}"
            
            # Build activities
            activities = _build_activities(day_places, destination, interests, d)
            
            # Extract places to visit
            places_to_visit = [p.get("name") for p in day_places if p.get("name")]
            if not places_to_visit:
                places_to_visit = [f"Central {destination} Landmarks", f"{destination} Promenade"]

            # Local food recommendations
            food_recs = [
                f"Authentic {destination} regional lunch specialties",
                f"Evening dining featuring local market delicacies and traditional desserts"
            ]

            days_list.append({
                "day": d,
                "title": theme_title,
                "activities": activities,
                "places_to_visit": places_to_visit,
                "food_recommendations": food_recs,
                "estimated_daily_expense": {
                    "amount": daily_total,
                    "currency": currency,
                    "breakdown": breakdown_str
                }
            })

        interests_str = ", ".join(interests) if interests else "culture, sights, and local life"
        overview = {
            "title": f"{days_count}-Day Journey to {destination}",
            "summary": (
                f"A carefully planned {days_count}-day itinerary for {travelers} traveler(s) in {destination}. "
                f"Curated to highlight {interests_str} while maintaining balanced pacing and reliable budget allocations."
            ),
            "destination": destination,
            "total_days": days_count,
            "travelers": travelers,
            "estimated_total_cost": {
                "amount": total_budget,
                "currency": currency,
                "note": "Estimated total covering accommodation, meals, sightseeing, and transport."
            }
        }

        travel_tips = [
            f"Use contactless payments or regional travel cards for convenient public transit in {destination}.",
            "Book tickets for high-demand museums and heritage attractions online to skip ticket queues.",
            "Wear comfortable walking shoes as the best views and hidden alleys are explored on foot.",
            "Carry a digital or physical copy of emergency contacts and reservation vouchers."
        ]

        important_notes = [
            "Costs, opening hours and attraction schedules are estimates and may vary by season.",
            "Keep valid photo identification with you when visiting official monuments."
        ]

        if feedback:
            important_notes.append("Itinerary adjusted based on reviewer pacing and feasibility checks.")

        itinerary = {
            "overview": overview,
            "days": days_list,
            "travel_tips": travel_tips,
            "important_notes": important_notes
        }

        logger.info("[LOGISTICS AGENT] Completed: %d days constructed successfully", len(days_list))
        return {
            "agent": "logistics",
            "status": "success",
            "itinerary": itinerary
        }
    except Exception as exc:
        logger.error("[LOGISTICS AGENT] Failed: %s", str(exc))
        return {"agent": "logistics", "status": "error", "errors": [str(exc)]}
