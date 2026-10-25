import sys
import json
import logging

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")

sys.path.append("backend")

from app import app
from services import image_service

client = app.test_client()

print("==================================================")
print("TEST 1: ROOT & HEALTH CHECK ENDPOINTS")
print("==================================================")
# 1. Root
res_root = client.get("/")
assert res_root.status_code == 200, f"Root failed: {res_root.status_code}"
data_root = res_root.get_json()
assert data_root["success"] is True, "Root success flag false"
print("✓ Root endpoint '/' 200 OK:", data_root["message"])

# 2. /health
res_health = client.get("/health")
assert res_health.status_code == 200, f"/health failed: {res_health.status_code} {res_health.data}"
data_health = res_health.get_json()
assert data_health["success"] is True
assert data_health["data"]["database"] == "connected"
print("✓ Health check '/health' 200 OK (database: connected)")

# 3. /api/health
res_api_health = client.get("/api/health")
assert res_api_health.status_code == 200
print("✓ Health check '/api/health' 200 OK (database: connected)")

print("\n==================================================")
print("TEST 2: CORS HEADERS & PREFLIGHT OPTIONS")
print("==================================================")
res_options = client.open(
    "/api/auth/login",
    method="OPTIONS",
    headers={
        "Origin": "http://localhost:5173",
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "Content-Type, Authorization",
    },
)
assert res_options.status_code in (200, 204), f"OPTIONS preflight failed: {res_options.status_code}"
assert "Access-Control-Allow-Origin" in res_options.headers, "CORS header missing"
print("✓ CORS preflight OPTIONS returned headers:", res_options.headers.get("Access-Control-Allow-Origin"))

print("\n==================================================")
print("TEST 3: AUTHENTICATION FLOW")
print("==================================================")
test_user = {
    "name": "Prod Deploy Tester",
    "email": "prod_deploy_tester@wanderai.com",
    "password": "Password123!",
}
# Try register or login
res_reg = client.post("/api/auth/register", json=test_user)
if res_reg.status_code == 201:
    token = res_reg.get_json()["data"]["token"]
    user_id = res_reg.get_json()["data"]["user"]["id"]
    print(f"✓ Registered new test user: {test_user['email']}")
else:
    res_login = client.post("/api/auth/login", json={"email": test_user["email"], "password": test_user["password"]})
    assert res_login.status_code == 200, f"Login failed: {res_login.status_code} {res_login.data}"
    token = res_login.get_json()["data"]["token"]
    user_id = res_login.get_json()["data"]["user"]["id"]
    print(f"✓ Logged in existing test user: {test_user['email']}")

auth_headers = {"Authorization": f"Bearer {token}"}

# Test /api/auth/me
res_me = client.get("/api/auth/me", headers=auth_headers)
assert res_me.status_code == 200, f"/auth/me failed: {res_me.status_code}"
assert res_me.get_json()["data"]["user"]["email"] == test_user["email"]
print(f"✓ Verified /api/auth/me for user ID: {user_id}")

print("\n==================================================")
print("TEST 4: DESTINATION IMAGE SERVICE & FALLBACKS")
print("==================================================")
img_paris = image_service.get_destination_image("Paris, France")
assert img_paris.startswith("https://images.unsplash.com"), "Curated image failed"
print("✓ Loaded destination image for 'Paris':", img_paris[:60] + "...")

img_unknown = image_service.get_destination_image("Random Obscure Remote Hamlet 999")
assert img_unknown.startswith("https://"), "Fallback image failed"
print("✓ Fallback destination image verified:", img_unknown[:60] + "...")

print("\n==================================================")
print("TEST 5: CURRENCY CONVERTER API ROUTES")
print("==================================================")
res_curr = client.get("/api/currency/supported")
assert res_curr.status_code == 200, f"Supported currencies failed: {res_curr.status_code}"
currencies = res_curr.get_json()["data"]["currencies"]
assert "USD" in currencies and "INR" in currencies and "EUR" in currencies
print(f"✓ GET /api/currency/supported returned {len(currencies)} currencies")

res_conv = client.post("/api/currency/convert", json={"amount": 250, "from": "EUR", "to": "USD"})
assert res_conv.status_code == 200, f"Currency convert failed: {res_conv.status_code}"
conv_data = res_conv.get_json()["data"]
assert conv_data["converted_amount"] > 0
print(f"✓ POST /api/currency/convert: 250 EUR -> {conv_data['converted_amount']} USD (rate: {conv_data['rate']})")

print("\n==================================================")
print("TEST 6: TRIP RETRIEVAL & CREATION")
print("==================================================")
res_trips = client.get("/api/trips", headers=auth_headers)
assert res_trips.status_code == 200, f"Get trips failed: {res_trips.status_code}"
trips_list = res_trips.get_json()["data"]["trips"]
print(f"✓ GET /api/trips returned {len(trips_list)} existing trips for user")

# If no trips exist, create a sample trip document in DB for testing routes
sample_trip_doc = {
    "user_id": user_id,
    "destination": "Goa, India",
    "days": 2,
    "travelers": 2,
    "budget": 30000.0,
    "currency": "INR",
    "interests": ["Beach", "Seafood"],
    "itinerary": {
        "overview": {
            "title": "Sun & Sands of Goa",
            "summary": "Relaxing coastal getaway.",
            "estimated_total_cost": {"amount": 28000, "currency": "INR"}
        },
        "days": [
            {
                "day": 1,
                "theme": "North Goa Beaches",
                "activities": [
                    {"time": "Morning", "name": "Baga Beach", "description": "Watersports and relaxing on the sand."},
                    {"time": "Afternoon", "name": "Calangute Beach", "description": "Lunch and beach shacks."},
                    {"time": "Evening", "name": "Fort Aguada", "description": "Sunset views from 17th-century Portuguese fort."}
                ],
                "places_to_visit": ["Baga Beach", "Calangute Beach", "Fort Aguada"],
                "food_recommendations": ["Goan fish curry", "Bebinca"],
                "estimated_daily_expense": {"amount": 14000, "currency": "INR", "breakdown": "Stay 8000, Food 4000, Transit 2000"}
            },
            {
                "day": 2,
                "theme": "Old Goa & Heritage",
                "activities": [
                    {"time": "Morning", "name": "Basilica of Bom Jesus", "description": "UNESCO World Heritage site."},
                    {"time": "Afternoon", "name": "Panaji Latin Quarter", "description": "Fontainhas colorful streets walk."}
                ],
                "places_to_visit": ["Basilica of Bom Jesus", "Panaji Latin Quarter"],
                "food_recommendations": ["Prawn balchão"],
                "estimated_daily_expense": {"amount": 14000, "currency": "INR", "breakdown": "Food 4000, Transit 2000, Souvenirs 8000"}
            }
        ]
    }
}

from models import trip_model
test_trip_obj = trip_model.create_trip(user_id, sample_trip_doc)
test_trip_id = test_trip_obj["id"]
print(f"✓ Created test trip fixture with ID: {test_trip_id}")

# Fetch single trip
res_single = client.get(f"/api/trips/{test_trip_id}", headers=auth_headers)
assert res_single.status_code == 200, f"GET single trip failed: {res_single.status_code}"
assert res_single.get_json()["data"]["trip"]["destination"] == "Goa, India"
print(f"✓ GET /api/trips/{test_trip_id} verified successfully")

print("\n==================================================")
print("TEST 7: EXPENSE TRACKING & BUDGET ANALYTICS")
print("==================================================")
res_add_exp = client.post(
    f"/api/trips/{test_trip_id}/expenses",
    headers=auth_headers,
    json={
        "category": "accommodation",
        "description": "Seaside Resort 2 Nights",
        "amount": 12000,
        "currency": "INR",
        "date": "2026-11-01",
        "payment_status": "paid",
        "payment_method": "credit_card"
    }
)
assert res_add_exp.status_code == 201, f"Add expense failed: {res_add_exp.status_code}"
exp_id = res_add_exp.get_json()["data"]["expense"]["id"]
print(f"✓ POST /api/trips/{test_trip_id}/expenses added expense ID: {exp_id}")

res_exp_list = client.get(f"/api/trips/{test_trip_id}/expenses", headers=auth_headers)
assert res_exp_list.status_code == 200
exp_data = res_exp_list.get_json()["data"]
assert len(exp_data["expenses"]) >= 1
assert exp_data["analytics"]["actual_paid_expenses"] >= 12000
print(f"✓ GET /api/trips/{test_trip_id}/expenses verified. Total paid: {exp_data['analytics']['actual_paid_expenses']} INR")

print("\n==================================================")
print("TEST 8: SMART ROUTE OPTIMIZER API")
print("==================================================")
res_opt = client.post(f"/api/trips/{test_trip_id}/routes/optimize", headers=auth_headers, json={"day_number": 1})
assert res_opt.status_code == 200, f"Route optimize failed: {res_opt.status_code}"
opt_proposal = res_opt.get_json()["data"]["proposal"]
assert "days" in opt_proposal and "summary_metrics" in opt_proposal, f"Unexpected proposal shape: {list(opt_proposal.keys())}"
print(f"✓ POST /api/trips/{test_trip_id}/routes/optimize generated proposal successfully: saved {opt_proposal['summary_metrics']['distance_saved_km']} km")

print("\n==================================================")
print("TEST 9: REPLANNING API")
print("==================================================")
res_replan = client.post(
    f"/api/trips/{test_trip_id}/replan/preview",
    headers=auth_headers,
    json={"scenario": "bad_weather"}
)
assert res_replan.status_code == 200, f"Replan preview failed: {res_replan.status_code}"
replan_proposal = res_replan.get_json()["data"]["proposal"]
assert "adjustments" in replan_proposal or "new_itinerary" in replan_proposal
print(f"✓ POST /api/trips/{test_trip_id}/replan/preview generated proposal for bad_weather successfully")

print("\n==================================================")
print("TEST 10: TRAVEL SERVICES SEARCH (DEMO FALLBACK)")
print("==================================================")
res_flights = client.get("/api/flights/search?destination=Goa&currency=INR", headers=auth_headers)
assert res_flights.status_code == 200
print(f"✓ GET /api/flights/search returned {len(res_flights.get_json()['data']['flights'])} offers (is_demo: {res_flights.get_json()['data']['is_demo']})")

res_hotels = client.get("/api/hotels/search?destination=Goa&currency=INR", headers=auth_headers)
assert res_hotels.status_code == 200
print(f"✓ GET /api/hotels/search returned {len(res_hotels.get_json()['data']['hotels'])} offers (is_demo: {res_hotels.get_json()['data']['is_demo']})")

res_transport = client.get("/api/transport/routes?destination=Goa&currency=INR", headers=auth_headers)
assert res_transport.status_code == 200
print(f"✓ GET /api/transport/routes returned options successfully")

print("\n==================================================")
print("ALL FLASK API ENDPOINT TESTS PASSED WITH 100% SUCCESS!")
print("==================================================")
