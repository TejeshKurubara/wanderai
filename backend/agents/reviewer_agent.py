import logging

logger = logging.getLogger(__name__)

def run(trip_params: dict, itinerary: dict) -> dict:
    """Deterministically validates the proposed itinerary using Python rules."""
    logger.info("[REVIEWER AGENT] Deterministically validating itinerary structure and constraints...")
    
    try:
        issues = []
        suggestions = []
        
        if not isinstance(itinerary, dict):
            return {
                "agent": "reviewer",
                "status": "success",
                "data": {
                    "approved": False,
                    "issues": [{
                        "type": "SCHEMA",
                        "severity": "high",
                        "description": "Itinerary must be a valid JSON dictionary."
                    }],
                    "suggestions": ["Regenerate itinerary with a valid dictionary schema."]
                }
            }

        # 1. Day count validation
        expected_days = max(int(trip_params.get("days") or 1), 1)
        days = itinerary.get("days")
        if not isinstance(days, list) or len(days) == 0:
            issues.append({
                "type": "DAY_COUNT",
                "severity": "high",
                "description": "Itinerary contains no days."
            })
        elif len(days) < expected_days:
            issues.append({
                "type": "DAY_COUNT",
                "severity": "high",
                "description": f"Itinerary has {len(days)} days, expected {expected_days}."
            })
        
        # 2. Daily schedule and pacing validation
        expected_currency = (trip_params.get("currency") or "INR").strip().upper()
        if isinstance(days, list):
            for idx, day in enumerate(days, start=1):
                if not isinstance(day, dict):
                    issues.append({
                        "type": "DAY_SCHEMA",
                        "severity": "high",
                        "description": f"Day {idx} entry is not a valid object."
                    })
                    continue
                
                activities = day.get("activities", [])
                if not isinstance(activities, list) or len(activities) == 0:
                    issues.append({
                        "type": "ACTIVITIES",
                        "severity": "high",
                        "description": f"Day {idx} has no planned activities."
                    })
                elif len(activities) > 6:
                    issues.append({
                        "type": "PACING",
                        "severity": "low",
                        "description": f"Day {idx} has {len(activities)} activities, which may cause fatigue."
                    })
                    suggestions.append(f"Consider reducing activities on Day {idx} for a more relaxed pace.")
                
                places = day.get("places_to_visit", [])
                if not isinstance(places, list) or len(places) == 0:
                    issues.append({
                        "type": "PLACES",
                        "severity": "medium",
                        "description": f"Day {idx} has no places to visit listed."
                    })

                # Check daily expense
                expense = day.get("estimated_daily_expense", {})
                if isinstance(expense, dict):
                    curr = (expense.get("currency") or "").strip().upper()
                    if curr and curr != expected_currency:
                        issues.append({
                            "type": "CURRENCY_MISMATCH",
                            "severity": "medium",
                            "description": f"Day {idx} currency ({curr}) does not match expected ({expected_currency})."
                        })

        # 3. Overview and Total Budget validation
        overview = itinerary.get("overview")
        if not isinstance(overview, dict):
            issues.append({
                "type": "OVERVIEW",
                "severity": "high",
                "description": "Missing overview block in itinerary."
            })
        else:
            total_cost_block = overview.get("estimated_total_cost", {})
            if isinstance(total_cost_block, dict):
                curr = (total_cost_block.get("currency") or "").strip().upper()
                if curr and curr != expected_currency:
                    issues.append({
                        "type": "CURRENCY_MISMATCH",
                        "severity": "medium",
                        "description": f"Total cost currency ({curr}) does not match expected ({expected_currency})."
                    })

        # Check approval status
        has_blocking_issues = any(i.get("severity") == "high" for i in issues)
        is_approved = not has_blocking_issues

        if is_approved:
            logger.info("[REVIEWER AGENT] Approved successfully (Warnings/Notes: %d)", len(issues))
            if not suggestions:
                suggestions.append("Itinerary is well-balanced, feasible, and matches all user constraints.")
        else:
            logger.warning("[REVIEWER AGENT] Rejected due to %d blocking issues", len([i for i in issues if i.get("severity") == "high"]))

        return {
            "agent": "reviewer",
            "status": "success",
            "data": {
                "approved": is_approved,
                "issues": issues,
                "suggestions": suggestions
            }
        }
    except Exception as exc:
        logger.error("[REVIEWER AGENT] Error during validation: %s", str(exc))
        return {"agent": "reviewer", "status": "error", "errors": [str(exc)]}
