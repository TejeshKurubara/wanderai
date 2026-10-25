import sys
import logging
sys.path.append('backend')

from config import Config
from agents import research_agent, preference_agent, budget_agent, logistics_agent, reviewer_agent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

trip_params = {
    "destination": "London, UK",
    "days": 3,
    "travelers": 2,
    "budget": 200000,
    "currency": "INR",
    "interests": ["History", "Food & Dining"]
}

print("=== 1. TESTING BUDGET AGENT ===")
budget_res = budget_agent.run(trip_params)
print("Budget status:", budget_res.get("status"))
print("Budget data:", budget_res.get("data"))
assert budget_res.get("status") == "success", "Budget agent failed"
assert budget_res["data"]["currency"] == "INR", "Currency mismatch in budget agent"
alloc = budget_res["data"]["allocation"]
assert sum(alloc.values()) == budget_res["data"]["total_budget"], "Budget allocation doesn't sum to total"
print(">>> Budget Agent PASSED!\n")

print("=== 2. TESTING RESEARCH AGENT (Gemini) ===")
research_res = research_agent.run(trip_params)
print("Research status:", research_res.get("status"))
print("Places found:", len(research_res.get("places", [])))
assert research_res.get("status") == "success", "Research agent failed"
assert len(research_res.get("places", [])) > 0, "No places returned by research agent"
print(">>> Research Agent PASSED!\n")

print("=== 3. TESTING PREFERENCE AGENT (Groq) ===")
pref_res = preference_agent.run(trip_params, research_res)
print("Preference status:", pref_res.get("status"))
print("Ranked places:", len(pref_res.get("ranked_places", [])))
assert pref_res.get("status") == "success", "Preference agent failed"
assert len(pref_res.get("ranked_places", [])) > 0, "No ranked places returned"
print("Top ranked place:", pref_res["ranked_places"][0]["name"], "Score:", pref_res["ranked_places"][0].get("score"))
print(">>> Preference Agent PASSED!\n")

print("=== 4. TESTING LOGISTICS AGENT (Python Scheduling) ===")
logistics_res = logistics_agent.run(trip_params, pref_res["ranked_places"], budget_res["data"])
print("Logistics status:", logistics_res.get("status"))
assert logistics_res.get("status") == "success", "Logistics agent failed"
itinerary = logistics_res["itinerary"]
assert len(itinerary.get("days", [])) == 3, f"Expected 3 days, got {len(itinerary.get('days', []))}"
print("Logistics days generated:", len(itinerary["days"]))
print(">>> Logistics Agent PASSED!\n")

print("=== 5. TESTING REVIEWER AGENT (Deterministic Python) ===")
review_res = reviewer_agent.run(trip_params, itinerary)
print("Reviewer status:", review_res.get("status"))
print("Reviewer data:", review_res.get("data"))
assert review_res.get("status") == "success", "Reviewer agent failed"
assert review_res["data"]["approved"] == True, "Reviewer did not approve valid itinerary"
print(">>> Reviewer Agent PASSED!\n")

print("ALL 5 INDEPENDENT AGENT TESTS PASSED SUCCESSFULLY!")
