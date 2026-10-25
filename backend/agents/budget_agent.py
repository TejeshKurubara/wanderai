import logging

logger = logging.getLogger(__name__)

# Daily baseline rates per person per day when budget is unspecified
CURRENCY_DAILY_BASELINES = {
    "INR": 5000.0,
    "USD": 150.0,
    "EUR": 140.0,
    "GBP": 120.0,
    "JPY": 20000.0,
    "AUD": 200.0,
    "CAD": 200.0,
    "SGD": 220.0,
    "AED": 550.0,
}

def run(trip_params: dict) -> dict:
    """Calculate and allocate travel budget deterministically using Python."""
    logger.info("[BUDGET AGENT] Calculating budget allocation via deterministic Python...")
    
    try:
        currency = (trip_params.get("currency") or "INR").strip().upper()
        days = max(int(trip_params.get("days") or 1), 1)
        travelers = max(int(trip_params.get("travelers") or 1), 1)
        user_budget = trip_params.get("budget")

        if user_budget is not None and float(user_budget) > 0:
            total_budget = round(float(user_budget), 2)
        else:
            daily_rate = CURRENCY_DAILY_BASELINES.get(currency, 5000.0 if currency == "INR" else 150.0)
            total_budget = round(float(daily_rate * travelers * days), 2)

        # Standard travel allocation breakdown:
        # Accommodation: 40%, Food: 20%, Transportation: 15%, Activities: 15%, Miscellaneous: 10%
        accommodation = round(total_budget * 0.40, 2)
        food = round(total_budget * 0.20, 2)
        transportation = round(total_budget * 0.15, 2)
        activities = round(total_budget * 0.15, 2)
        
        # Remainder ensures exact mathematical summation with zero rounding drift
        miscellaneous = round(total_budget - (accommodation + food + transportation + activities), 2)
        if miscellaneous < 0:
            miscellaneous = 0.0
            activities = round(total_budget - (accommodation + food + transportation), 2)

        result = {
            "agent": "budget",
            "status": "success",
            "data": {
                "total_budget": total_budget,
                "currency": currency,
                "allocation": {
                    "accommodation": accommodation,
                    "food": food,
                    "transportation": transportation,
                    "activities": activities,
                    "miscellaneous": miscellaneous,
                }
            }
        }
        logger.info("[BUDGET AGENT] Completed: %s %s allocated", total_budget, currency)
        return result
    except Exception as exc:
        logger.error("[BUDGET AGENT] Failed: %s", str(exc))
        return {"agent": "budget", "status": "error", "errors": [str(exc)]}
