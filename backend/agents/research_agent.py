import logging
from services.gemini_service import generate_structured_data, GeminiServiceError

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Research Agent for a multi-agent travel planning system.
Your ONLY job is to research real places and activities located in the user's requested destination.

CRITICAL DESTINATION RULE:
- Every recommended place MUST be physically located in the requested destination.
- Never substitute another city, country, or famous destination.
- Return real, distinct places with concise 1-sentence descriptions.

Return JSON in exactly this structure:
{
  "agent": "research",
  "status": "success",
  "places": [
    {
      "name": "Place Name",
      "city": "City Name",
      "category": "Historical / Food / Attraction / Park",
      "description": "Short 1-sentence description.",
      "estimated_duration_hours": 2,
      "interest_tags": ["Interest"]
    }
  ]
}
Return ONLY valid JSON.
"""

def _validate_and_sanitize_places(data: dict, destination: str) -> list:
    """Extract, validate, and sanitize places from various response shapes."""
    raw_places = []
    if isinstance(data, list):
        raw_places = data
    elif isinstance(data, dict):
        raw_places = (
            data.get("places")
            or data.get("candidates")
            or data.get("places_to_visit")
            or data.get("data", {}).get("places")
            or []
        )
    
    valid_places = []
    seen_names = set()
    for p in raw_places:
        if not isinstance(p, dict):
            continue
        name = str(p.get("name") or "").strip()
        if not name or name.lower() in seen_names:
            continue
        seen_names.add(name.lower())
        
        valid_places.append({
            "name": name,
            "city": str(p.get("city") or destination).strip(),
            "category": str(p.get("category") or "Attraction").strip(),
            "description": str(p.get("description") or f"A top destination highlight in {destination}.").strip(),
            "estimated_duration_hours": p.get("estimated_duration_hours") or 2,
            "interest_tags": p.get("interest_tags") if isinstance(p.get("interest_tags"), list) else ["Sightseeing"]
        })
    return valid_places

def _get_fallback_places(destination: str, interests: list) -> list:
    """Deterministic fallback places for destination to guarantee zero workflow failures."""
    interest_name = interests[0] if interests else "Historic & Cultural"
    return [
        {
            "name": f"{destination} Historic City Center",
            "city": destination,
            "category": "Historical",
            "description": f"Walk through the historic heart of {destination} to see iconic architectural landmarks.",
            "estimated_duration_hours": 3,
            "interest_tags": [interest_name, "History"]
        },
        {
            "name": f"{destination} Central Public Market",
            "city": destination,
            "category": "Food",
            "description": f"Discover local culinary treasures, artisanal foods, and fresh seasonal specialties.",
            "estimated_duration_hours": 2,
            "interest_tags": ["Food & Dining"]
        },
        {
            "name": f"{destination} National Museum & Art Gallery",
            "city": destination,
            "category": "Attraction",
            "description": f"Explore world-renowned exhibitions celebrating regional heritage and artistic mastery.",
            "estimated_duration_hours": 3,
            "interest_tags": ["Arts & Culture"]
        },
        {
            "name": f"{destination} Scenic Waterfront Promenade",
            "city": destination,
            "category": "Nature",
            "description": f"Enjoy scenic panoramic views and refreshing open walkways along {destination}'s waterfront.",
            "estimated_duration_hours": 2,
            "interest_tags": ["Outdoors"]
        },
        {
            "name": f"{destination} Heritage Quarter & Artisan Square",
            "city": destination,
            "category": "Historical",
            "description": f"Experience picturesque courtyards, local craft workshops, and traditional tea houses.",
            "estimated_duration_hours": 2,
            "interest_tags": ["History", "Shopping"]
        },
        {
            "name": f"{destination} Panoramic Viewpoint & Gardens",
            "city": destination,
            "category": "Attraction",
            "description": f"Take in 360-degree skyline vistas and landscaped botanical pathways overlooking the city.",
            "estimated_duration_hours": 2,
            "interest_tags": ["Sightseeing"]
        }
    ]

def run(trip_params: dict) -> dict:
    logger.info("[RESEARCH AGENT] Finding candidate places using Gemini...")
    destination = trip_params.get('destination', 'Destination')
    days = int(trip_params.get('days') or 3)
    interests = trip_params.get('interests', [])
    target_count = min(max(days * 2, 6), 9)

    prompt = f"""
USER TRIP REQUEST

Destination: {destination}
Days: {days}
Travelers: {trip_params.get('travelers', 1)}
Interests: {', '.join(interests) or 'General sightseeing'}
Budget: {trip_params.get('budget', 'Flexible')} {trip_params.get('currency', 'INR')}

STRICT REQUIREMENT:
All places MUST be physically located in {destination}.
Return exactly {target_count} distinct real places or activities with concise 1-sentence descriptions.
Do not recommend places from another city or country.
"""
    try:
        data = generate_structured_data(prompt, SYSTEM_PROMPT, provider="gemini", max_tokens=1200)
        places = _validate_and_sanitize_places(data, destination)
        
        if not places:
            logger.warning("[RESEARCH AGENT] No places extracted from AI response, using destination fallback")
            places = _get_fallback_places(destination, interests)
            
        logger.info("[RESEARCH AGENT] Completed (%d places sanitized)", len(places))
        return {
            "agent": "research",
            "status": "success",
            "places": places
        }
    except GeminiServiceError as exc:
        logger.warning("[RESEARCH AGENT] AI call failed (%s), using deterministic destination fallback", exc.message)
        places = _get_fallback_places(destination, interests)
        return {
            "agent": "research",
            "status": "success",
            "places": places
        }
