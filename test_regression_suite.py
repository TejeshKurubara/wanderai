import sys
import os
import json
import logging
sys.path.append('backend')

from config import Config
from services import gemini_service
from agents import research_agent

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")

print("==================================================")
print("REGRESSION TEST 1: GEMINI RESEARCH WITH CONFIGURED MODEL")
print("==================================================")
trip_params_gemini = {
    "destination": "Kyoto, Japan",
    "days": 3,
    "travelers": 2,
    "budget": 250000,
    "currency": "JPY",
    "interests": ["Temples", "Japanese Cuisine"]
}
res_gemini = research_agent.run(trip_params_gemini)
print("Gemini Research Status:", res_gemini.get("status"))
print("Places returned:", len(res_gemini.get("places", [])))
assert res_gemini.get("status") == "success", "Gemini research failed"
assert len(res_gemini.get("places", [])) >= 3, "Insufficient places returned by Gemini"
print("Sample place:", res_gemini["places"][0]["name"])
print(">>> Regression Test 1 PASSED!\n")

print("==================================================")
print("REGRESSION TEST 2: GROQ RESEARCH FALLBACK")
print("==================================================")
# Test directly calling Groq with compact research schema
prompt_groq = """
USER TRIP REQUEST
Destination: Florence, Italy
Days: 2
Travelers: 2
Interests: Art & Architecture, Wine
Budget: 500 EUR

Return exactly 6 distinct real places with 1-sentence descriptions.
"""
data_groq = gemini_service.generate_structured_data(
    prompt_groq, 
    research_agent.SYSTEM_PROMPT, 
    provider="groq", 
    max_tokens=450,
    allow_fallback=False
)
print("Groq Response type:", type(data_groq))
sanitized_groq = research_agent._validate_and_sanitize_places(data_groq, "Florence, Italy")
print("Groq places returned:", len(sanitized_groq))
assert len(sanitized_groq) >= 3, "Groq fallback returned insufficient places"
print("Sample Groq place:", sanitized_groq[0]["name"])
print(">>> Regression Test 2 PASSED!\n")

print("==================================================")
print("REGRESSION TEST 3: MALFORMED & TRUNCATED JSON HANDLING")
print("==================================================")
# Case A: Truncated JSON mid-stream (the exact failure mode reported by user)
truncated_sample = '''{
  "agent": "research",
  "status": "success",
  "places": [
    {
      "name": "Colosseum",
      "city": "Rome",
      "category": "Historical",
      "description": "Iconic ancient amphitheater in central Rome.",
      "estimated_duration_hours": 3,
      "interest_tags": ["History"]
    },
    {
      "name": "Pantheon",
      "city": "Rome",
      "category": "Historical",
      "description": "Former Roman temple, now a church.",
      "estimated_duration_hours": 2,
      "interest_tags": ["Architecture"]
    },
    {
      "name": "Trevi Fountain",
      "city": "Rome",
      "category": "Attraction",
      "description": "Famed Baroque fountain.",
      "estimated_duration_hours": 1,
      "interest_tags": ["Sightseeing"]
    },
    {
      "name": "Vatican Museums",
      "city": "Rome",
      "category"''' # Intentionally truncated mid-key

salvaged = gemini_service._parse_json(truncated_sample)
print("Salvaged keys:", list(salvaged.keys()))
places = salvaged.get("places", [])
print("Salvaged complete places count:", len(places))
assert len(places) == 3, f"Expected 3 salvaged places, got {len(places)}"
assert places[0]["name"] == "Colosseum"
assert places[2]["name"] == "Trevi Fountain"

# Case B: Trailing comma in objects and arrays
trailing_comma_sample = '''{
  "agent": "research",
  "places": [
    {"name": "Place 1", "city": "City",},
    {"name": "Place 2", "city": "City",},
  ],
}'''
parsed_trailing = gemini_service._parse_json(trailing_comma_sample)
assert len(parsed_trailing["places"]) == 2, "Trailing comma test failed"
print("Trailing commas handled successfully.")

# Case C: Markdown fenced block
fenced_sample = '```json\n{"status": "success", "valid": true}\n```'
parsed_fenced = gemini_service._parse_json(fenced_sample)
assert parsed_fenced.get("valid") is True, "Markdown fence test failed"
print("Markdown fence handled successfully.")

print(">>> Regression Test 3 PASSED!\n")
print("ALL 3 REGRESSION TESTS PASSED CLEANLY!")
