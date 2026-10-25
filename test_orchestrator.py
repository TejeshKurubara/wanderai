import sys
import logging
sys.path.append('backend')
from config import Config
from agents.orchestrator import build_itinerary

logging.basicConfig(level=logging.INFO)

trip_params = {
    "destination": "London, UK",
    "days": 3,
    "travelers": 2,
    "budget": 200000,
    "currency": "INR",
    "interests": ["History", "Food & Dining"]
}

try:
    result = build_itinerary(trip_params)
    print("SUCCESS!")
    print(result)
except Exception as e:
    import traceback
    traceback.print_exc()
