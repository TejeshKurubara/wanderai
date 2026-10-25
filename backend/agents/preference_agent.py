import logging
import json
from services.gemini_service import generate_structured_data, GeminiServiceError

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = """You are the Preference Agent for a multi-agent travel planning system.
Evaluate candidate places against user interests. Return concise JSON:
{
  "agent": "preference",
  "status": "success",
  "ranked_places": [
    {
      "name": "Place Name",
      "score": 9.5,
      "reason": "Matches interest"
    }
  ]
}
Return valid JSON only. Keep reason under 5 words.
"""

def _deterministic_ranking(places: list, user_interests: list) -> list:
    """Fallback ranking based on tag and category matching if Groq is unavailable."""
    interests_lower = {i.lower().strip() for i in user_interests if i}
    ranked = []
    for p in places:
        name = p.get("name", "")
        cat = (p.get("category") or "").lower()
        tags = [t.lower() for t in p.get("interest_tags") or []]
        
        matches = [i for i in interests_lower if i in cat or any(i in t or t in i for t in tags)]
        if matches:
            score = min(8.0 + (len(matches) * 0.7), 9.9)
            reason = f"Matches user interest: {', '.join(matches[:2])}"
        else:
            score = 7.0
            reason = "Popular destination highlight."
            
        p_copy = dict(p)
        p_copy["score"] = round(score, 1)
        p_copy["match_reason"] = reason
        ranked.append(p_copy)
    ranked.sort(key=lambda x: x["score"], reverse=True)
    return ranked

def run(trip_params: dict, research_data: dict) -> dict:
    logger.info("[PREFERENCE AGENT] Ranking places using Groq...")
    places = research_data.get("places", [])
    if not places:
        return {"agent": "preference", "status": "error", "errors": ["No places provided by research agent."]}

    user_interests = trip_params.get("interests", [])
    places_summary = [{"name": p.get("name"), "category": p.get("category"), "tags": p.get("interest_tags")} for p in places]

    prompt = f"""
Interests: {', '.join(user_interests) or 'General sightseeing'}
Destination: {trip_params.get('destination')}

Candidate Places:
{json.dumps(places_summary)}

Rank each candidate place with score (1-10) and concise reason.
"""
    try:
        data = generate_structured_data(prompt, SYSTEM_PROMPT, provider="groq", max_tokens=450)
        
        # Merge scores back
        rankings = (
            data.get("ranked_places")
            or data.get("rankings")
            or data.get("places")
            or (data if isinstance(data, list) else [])
        )
        ranked_places_map = {item.get("name", ""): item for item in rankings if isinstance(item, dict)}
        
        merged_places = []
        for p in places:
            name = p.get("name", "")
            rank_info = ranked_places_map.get(name, {})
            p_copy = dict(p)
            p_copy["score"] = rank_info.get("score", 7.0)
            p_copy["match_reason"] = rank_info.get("reason", "Standard recommendation.")
            merged_places.append(p_copy)
            
        merged_places.sort(key=lambda x: x["score"], reverse=True)
        logger.info("[PREFERENCE AGENT] Completed via Groq (%d places ranked)", len(merged_places))
        return {
            "agent": "preference",
            "status": "success",
            "ranked_places": merged_places
        }
    except GeminiServiceError as exc:
        logger.warning("[PREFERENCE AGENT] Groq call failed (%s), using deterministic ranking fallback", exc.message)
        fallback_places = _deterministic_ranking(places, user_interests)
        return {
            "agent": "preference",
            "status": "success",
            "ranked_places": fallback_places
        }
