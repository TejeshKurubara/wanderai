"""
Comprehensive Verification Test Suite for WanderAI 4 New Features:
1. Smart Route Optimization (2-opt TSP, distance matrices, conflict detection)
2. Automatic Replanning Engine (9 disruption scenarios, completed activity locks)
3. AI Travel Companion (Instant deterministic queries, grounded chat)
4. Currency Converter & Multi-Currency Budget Engine (live/benchmark rates, caching)
"""

import os
import sys

# Support UTF-8 output on Windows consoles
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

# Ensure backend directory is in path
backend_dir = r"c:\Users\Sumera Anjum\OneDrive\Desktop\Codomax-aiml-internship\module-5-ai-travel-itinerary\backend"
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

from services import currency_service, route_optimizer, replanning_service, chat_companion_service

def test_feature_4_currency():
    print("\n--- [TEST 1] Currency Service & Multi-Currency Engine ---")
    supported = currency_service.get_supported_currencies()
    assert len(supported) >= 20, f"Expected >= 20 currencies, got {len(supported)}"
    print(f"✓ Supported currencies: {len(supported)} currencies verified (e.g. INR, USD, EUR, GBP, AED, JPY)")

    rates_data = currency_service.get_exchange_rates("USD")
    rates = rates_data["rates"]
    assert "INR" in rates and "EUR" in rates and "GBP" in rates
    print(f"✓ Exchange rates for USD fetched successfully (1 USD = {rates['INR']} INR, Live: {rates_data['is_live']})")

    # Test conversion
    conv = currency_service.convert_currency(100.0, "USD", "INR")
    assert conv["converted_amount"] > 0
    print(f"✓ Conversion 100 USD -> {conv['converted_amount']} INR (rate: {conv['rate']})")

    # Test conversion INR -> EUR
    conv2 = currency_service.convert_currency(10000.0, "INR", "EUR")
    assert conv2["converted_amount"] > 0
    print(f"✓ Conversion 10,000 INR -> {conv2['converted_amount']} EUR (rate: {conv2['rate']})")

    # Test trip budget conversion
    sample_trip = {
        "budget": 50000,
        "currency": "INR",
        "itinerary": {"overview": {"title": "Sample Trip"}}
    }
    sample_expenses = [
        {"amount": 12000, "currency": "INR", "payment_status": "paid", "category": "accommodation"},
        {"amount": 3500, "currency": "INR", "payment_status": "paid", "category": "food"},
        {"amount": 5000, "currency": "INR", "payment_status": "pending", "category": "transport"}
    ]
    budget_proj = currency_service.convert_trip_budget(sample_trip, "USD", sample_expenses)
    assert budget_proj["converted_budget"] > 0
    assert budget_proj["converted_paid_expenses"] > 0
    print(f"✓ Trip Budget Projector: 50,000 INR = {budget_proj['converted_budget']} USD | Paid: {budget_proj['converted_paid_expenses']} USD | Remaining: {budget_proj['converted_remaining_budget']} USD")


def test_feature_1_route_optimization():
    print("\n--- [TEST 2] Smart Route Optimization (2-opt TSP) ---")
    mock_trip = {
        "destination": "Paris",
        "currency": "EUR",
        "itinerary": {
            "days": [
                {
                    "day_number": 1,
                    "date": "2026-06-01",
                    "theme": "Iconic Paris Landmarks",
                    "activities": [
                        {"name": "Eiffel Tower", "description": "Iconic iron tower", "time": "09:00 AM", "cost": 30},
                        {"name": "Louvre Museum", "description": "Historic art museum", "time": "11:30 AM", "cost": 22},
                        {"name": "Arc de Triomphe", "description": "Monument at Champs-Elysees", "time": "02:00 PM", "cost": 16},
                        {"name": "Notre Dame Cathedral", "description": "Medieval Catholic cathedral", "time": "04:30 PM", "cost": 10},
                        {"name": "Sacre-Coeur", "description": "Basilica on Montmartre hill", "time": "07:00 PM", "cost": 0}
                    ]
                }
            ]
        }
    }

    result = route_optimizer.optimize_trip_route(
        mock_trip,
        mode="auto",
        max_walking_km=2.0,
        target_day=1,
        starting_point="Le Marais Hotel"
    )

    metrics = result["summary_metrics"]
    print(f"✓ 2-Opt TSP Algorithm: {result['algorithm']}")
    print(f"✓ Original Distance: {metrics['original_distance_km']} km -> Optimized: {metrics['optimized_distance_km']} km")
    print(f"✓ Distance Saved: {metrics['distance_saved_km']} km ({metrics['distance_saved_percentage']}%)")
    print(f"✓ Original Travel Time: {metrics['original_travel_minutes']} min -> Optimized: {metrics['optimized_travel_minutes']} min")
    print(f"✓ Time Saved: {metrics['time_saved_minutes']} min ({metrics['time_saved_percentage']}%)")
    print(f"✓ Conflicts / Observations Detected: {len(result['conflicts'])}")
    for conf in result['conflicts']:
        print(f"   [Observation]: {conf['message']}")

    optimized_stops = result["days"][0]["activities"]
    assert len(optimized_stops) == 5
    print(f"✓ Reordered sequence: {' -> '.join([s['name'] for s in optimized_stops])}")


def test_feature_2_replanning():
    print("\n--- [TEST 3] Automatic Replanning Engine ---")
    mock_trip = {
        "destination": "Goa",
        "currency": "INR",
        "budget": 25000,
        "completed_activities": ["Baga Beach Watersports"],
        "itinerary": {
            "days": [
                {
                    "day_number": 1,
                    "theme": "North Goa Beaches",
                    "activities": [
                        {"name": "Baga Beach Watersports", "description": "Jet ski & parasailing", "cost": 2500},
                        {"name": "Fort Aguada", "description": "17th century Portuguese fort", "cost": 300},
                        {"name": "Anjuna Flea Market", "description": "Shopping and beach cafes", "cost": 500}
                    ]
                },
                {
                    "day_number": 2,
                    "theme": "Old Goa & Heritage",
                    "activities": [
                        {"name": "Basilica of Bom Jesus", "description": "UNESCO heritage church", "cost": 100},
                        {"name": "Spice Plantation Tour", "description": "Tropical flora and lunch", "cost": 800}
                    ]
                }
            ]
        }
    }

    # Test bad weather replanning
    res_weather = replanning_service.replan_itinerary(
        mock_trip,
        scenario="bad_weather",
        details="Heavy monsoon rain all day",
        day_offset=0
    )
    print(f"✓ Weather Replan: {res_weather['summary']}")
    print(f"✓ Completed activities preserved: {res_weather['completed_activities_preserved']}")
    assert res_weather["completed_activities_preserved"] >= 1
    print(f"✓ Adjustments applied: {len(res_weather['changes_made'])} changes")
    for c in res_weather["changes_made"]:
        print(f"   • {c}")

    # Test budget cut replanning
    res_budget = replanning_service.replan_itinerary(
        mock_trip,
        scenario="budget_cut",
        details="Need to save 40% on activities",
        day_offset=1
    )
    print(f"✓ Budget Cut Replan: Cost delta = {res_budget['cost_delta']} INR")
    assert res_budget["cost_delta"] <= 0


def test_feature_3_chat_companion():
    print("\n--- [TEST 4] Context-Aware AI Travel Companion ---")
    mock_trip = {
        "id": "507f1f77bcf86cd799439011",
        "title": "Summer in London",
        "destination": "London",
        "currency": "GBP",
        "budget": 2000,
        "itinerary": {
            "days": [
                {
                    "day_number": 1,
                    "theme": "Royal London",
                    "activities": [
                        {"name": "Tower of London", "time": "09:30 AM", "cost": 35},
                        {"name": "Borough Market", "time": "01:00 PM", "cost": 20}
                    ]
                }
            ]
        }
    }

    # Test deterministic budget query
    budget_answer = chat_companion_service.process_companion_chat(
        "user_test_123",
        mock_trip,
        "What is my remaining budget?"
    )
    assert budget_answer["is_deterministic"] is True
    print(f"✓ Query: 'What is my remaining budget?'")
    print(f"✓ Deterministic Answer ({budget_answer['intent']}): {budget_answer['message']}")

    # Test schedule query
    schedule_answer = chat_companion_service.process_companion_chat(
        "user_test_123",
        mock_trip,
        "What is my schedule for Day 1?"
    )
    assert schedule_answer["is_deterministic"] is True
    print(f"✓ Query: 'What is my schedule for Day 1?'")
    print(f"✓ Deterministic Answer ({schedule_answer['intent']}): {schedule_answer['message']}")

    # Test currency query
    curr_answer = chat_companion_service.process_companion_chat(
        "user_test_123",
        mock_trip,
        "Convert 100 GBP to USD"
    )
    assert curr_answer["is_deterministic"] is True
    print(f"✓ Query: 'Convert 100 GBP to USD'")
    print(f"✓ Deterministic FX Answer: {curr_answer['message']}")

    # Test grounded fallback advice
    advice_answer = chat_companion_service.process_companion_chat(
        "user_test_123",
        mock_trip,
        "What should I pack for London weather?"
    )
    assert len(advice_answer["message"]) > 20
    print(f"✓ Query: 'What should I pack for London weather?'")
    print(f"✓ Grounded Advice Response: {advice_answer['message'][:120]}...")

if __name__ == "__main__":
    test_feature_4_currency()
    test_feature_1_route_optimization()
    test_feature_2_replanning()
    test_feature_3_chat_companion()
    print("\n=======================================================")
    print("ALL 4 FEATURE ENGINES PASSED VERIFICATION WITH 100% SUCCESS!")
    print("=======================================================")
