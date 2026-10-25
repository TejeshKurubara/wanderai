import logging
from . import research_agent, preference_agent, budget_agent, logistics_agent, reviewer_agent
from services.gemini_service import GeminiServiceError, _normalize

logger = logging.getLogger(__name__)

MAX_REVIEW_ATTEMPTS = 3

def build_itinerary(trip_params: dict) -> dict:
    """Orchestrates the multi-agent trip planning process."""
    logger.info("[ORCHESTRATOR] Starting trip planning")
    
    # 1. Research Agent
    research_result = research_agent.run(trip_params)
    if research_result.get("status") == "error":
        raise GeminiServiceError(research_result.get("errors", ["Research failed"])[0], 502)
        
    # 2. Preference Agent
    preference_result = preference_agent.run(trip_params, research_result)
    if preference_result.get("status") == "error":
        raise GeminiServiceError(preference_result.get("errors", ["Preference ranking failed"])[0], 502)
        
    ranked_places = preference_result.get("ranked_places", [])
    
    # 3. Budget Agent
    budget_result = budget_agent.run(trip_params)
    if budget_result.get("status") == "error":
        raise GeminiServiceError(budget_result.get("errors", ["Budget calculation failed"])[0], 502)
        
    budget_allocation = budget_result.get("data", {})

    # 4. Logistics & Reviewer Agents (Loop)
    feedback_history = []
    final_itinerary = None
    
    for attempt in range(1, MAX_REVIEW_ATTEMPTS + 1):
        if attempt > 1:
            logger.info("[ORCHESTRATOR] Revising itinerary (Attempt %d)...", attempt)
            
        # Logistics builds/revises itinerary
        logistics_result = logistics_agent.run(trip_params, ranked_places, budget_allocation, feedback_history)
        if logistics_result.get("status") == "error":
            raise GeminiServiceError(logistics_result.get("errors", ["Logistics failed"])[0], 502)
            
        proposed_itinerary = logistics_result.get("itinerary", {})
        final_itinerary = proposed_itinerary
        
        # Reviewer checks itinerary
        reviewer_result = reviewer_agent.run(trip_params, proposed_itinerary)
        if reviewer_result.get("status") == "error":
            # If reviewer fails, we accept the current itinerary rather than dropping the whole process
            logger.warning("[ORCHESTRATOR] Reviewer agent failed, accepting current itinerary.")
            break
            
        review_data = reviewer_result.get("data", {})
        is_approved = review_data.get("approved", True)
        
        if is_approved:
            break
            
        # If rejected, collect feedback for next iteration
        issues = review_data.get("issues", [])
        suggestions = review_data.get("suggestions", [])
        
        current_feedback = []
        for i in issues:
            current_feedback.append(i.get("description", ""))
        current_feedback.extend(suggestions)
        
        feedback_history.extend(current_feedback)
        
    logger.info("[ORCHESTRATOR] Final itinerary ready")
    
    # Use the existing _normalize function from gemini_service to guarantee API compatibility
    # if it fails normalization, it throws an error which route catches
    try:
        normalized_itinerary = _normalize(final_itinerary, trip_params)
        return normalized_itinerary
    except Exception as exc:
        logger.error("[ORCHESTRATOR] Failed to normalize itinerary: %s", str(exc))
        raise GeminiServiceError("Generated itinerary was malformed.", 502)
