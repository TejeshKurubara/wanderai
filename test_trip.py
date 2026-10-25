import requests, os

url = "http://127.0.0.1:5000/api"

auth_data = {"email": "testagent@example.com", "password": "password123", "name": "Agent Test"}
res = requests.post(f"{url}/auth/register", json=auth_data)
if res.status_code != 201:
    res = requests.post(f"{url}/auth/login", json=auth_data)
    
token = res.json()["data"]["token"]
headers = {"Authorization": f"Bearer {token}"}

print("Authenticated.")

trip_data = {
    "destination": "London, UK",
    "days": 3,
    "travelers": 2,
    "budget": 200000,
    "currency": "INR",
    "interests": ["History", "Food & Dining"]
}

print("Creating trip...")
res = requests.post(f"{url}/trips", json=trip_data, headers=headers)
print("Status:", res.status_code)
print(res.json())
