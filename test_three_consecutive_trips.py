import requests
import json
import time

url = "http://127.0.0.1:5000/api"

# 1. Authenticate
auth_data = {"email": "consecutive_tester@example.com", "password": "password123", "name": "Consecutive Tester"}
res = requests.post(f"{url}/auth/register", json=auth_data)
if res.status_code != 201:
    res = requests.post(f"{url}/auth/login", json=auth_data)

assert res.status_code == 200 or res.status_code == 201, f"Auth failed with status {res.status_code}: {res.text}"
token = res.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}
print("Authenticated successfully. Token acquired.\n")

# 2. Define 3 diverse trips
trips_to_generate = [
    {
        "destination": "Tokyo, Japan",
        "days": 3,
        "travelers": 2,
        "budget": 150000,
        "currency": "JPY",
        "interests": ["Culture", "Food & Dining"]
    },
    {
        "destination": "Paris, France",
        "days": 2,
        "travelers": 1,
        "budget": 600,
        "currency": "EUR",
        "interests": ["Art & Museums", "History"]
    },
    {
        "destination": "New York, USA",
        "days": 4,
        "travelers": 3,
        "budget": 3000,
        "currency": "USD",
        "interests": ["Broadway & Theater", "Architecture", "Food & Dining"]
    }
]

created_trips = []

for idx, trip_input in enumerate(trips_to_generate, start=1):
    print(f"==================================================")
    print(f"RUNNING CONSECUTIVE TRIP {idx}/{len(trips_to_generate)}: {trip_input['destination']} ({trip_input['days']} days)")
    print(f"==================================================")
    start_time = time.time()
    
    res = requests.post(f"{url}/trips", json=trip_input, headers=headers)
    duration = time.time() - start_time
    
    print(f"Response status: {res.status_code} in {duration:.2f}s")
    if res.status_code != 201:
        print("ERROR RESPONSE:", res.text)
        assert False, f"Trip {idx} failed with status {res.status_code}"
        
    res_data = res.json()
    assert res_data.get("success") is True, f"Trip {idx} success flag is False"
    trip = res_data["data"]["trip"]
    trip_id = trip["id"]
    print(f"Trip ID: {trip_id}")
    
    # Verify days count
    days = trip["itinerary"].get("days", [])
    print(f"Days generated: {len(days)} (expected {trip_input['days']})")
    assert len(days) == trip_input["days"], f"Day count mismatch for trip {idx}: expected {trip_input['days']}, got {len(days)}"
    
    # Verify activities & expense data for each day
    for d in days:
        acts = d.get("activities", [])
        assert len(acts) >= 1, f"Day {d.get('day')} has no activities"
        assert d.get("places_to_visit"), f"Day {d.get('day')} has no places to visit"
        assert d.get("food_recommendations"), f"Day {d.get('day')} has no food recommendations"
        expense = d.get("estimated_daily_expense", {})
        assert expense.get("currency") == trip_input["currency"], f"Currency mismatch on day {d.get('day')}"
        assert expense.get("amount") is not None, f"Amount missing on day {d.get('day')}"
        
    # Verify persistence via GET /api/trips/<trip_id>
    get_res = requests.post(f"{url}/trips", json=trip_input, headers=headers) if False else requests.get(f"{url}/trips/{trip_id}", headers=headers)
    assert get_res.status_code == 200, f"Failed to fetch persisted trip {trip_id}"
    persisted_trip = get_res.json()["data"]["trip"]
    assert persisted_trip["id"] == trip_id, f"Persisted trip ID mismatch"
    print(f"Trip verified & persisted in MongoDB Atlas!")
    print(f">>> TRIP {idx} SUCCESSFUL!\n")
    created_trips.append(trip_id)

print(f"==================================================")
print(f"ALL {len(trips_to_generate)} CONSECUTIVE TRIPS SUCCEEDED AND PERSISTED!")
print(f"Created trip IDs: {created_trips}")
print(f"==================================================")
