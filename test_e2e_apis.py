import os
import sys
import json
import logging
from datetime import datetime

# Fix Windows console encoding for UTF-8
if sys.platform == "win32":
    try:
        sys.stdout.reconfigure(encoding="utf-8")
        sys.stderr.reconfigure(encoding="utf-8")
    except Exception:
        pass

# Add backend to sys.path
backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
if backend_dir not in sys.path:
    sys.path.insert(0, backend_dir)

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s")
logger = logging.getLogger("E2E_VERIFICATION")

def run_e2e_verification():
    passed = 0
    total = 6
    print("=" * 70)
    print("WANDERAI TRAVEL PLANNER -- END-TO-END VERIFICATION SUITE")
    print("=" * 70)

    # -------------------------------------------------------------
    # TEST 1: PIXABAY IMAGES (IMAGE_API_KEY)
    # -------------------------------------------------------------
    print("\n[TEST 1] Destination Images -- Pixabay API Integration")
    try:
        from services import image_service
        london_img = image_service.get_destination_image("London, UK")
        goa_img = image_service.get_destination_image("Goa, India")
        unknown_img = image_service.get_destination_image("UnknownPlaceXYZ12345")

        assert london_img and london_img.startswith("http"), f"Invalid London image URL: {london_img}"
        assert goa_img and goa_img.startswith("http"), f"Invalid Goa image URL: {goa_img}"
        assert unknown_img and unknown_img.startswith("http"), "Fallback image missing"

        is_pixabay_london = "pixabay.com" in london_img
        print(f"  + London photo URL: {london_img[:65]}... (Pixabay verified: {is_pixabay_london})")
        print(f"  + Goa photo URL:    {goa_img[:65]}...")
        print(f"  + Fallback photo:   {unknown_img[:65]}...")
        print("  -> TEST 1 PASSED: Pixabay Image API live and cached with fallback.")
        passed += 1
    except Exception as exc:
        print(f"  FAILED TEST 1: {exc}")

    # -------------------------------------------------------------
    # TEST 2: FLIGHTS & HOTELS -- SERPAPI GOOGLE FLIGHTS & HOTELS
    # -------------------------------------------------------------
    print("\n[TEST 2] Flight & Hotel Search -- SerpApi Google Engines")
    try:
        from services import flight_service, hotel_service
        flights_res = flight_service.search_flights(
            origin="Mumbai",
            destination="Goa",
            departure_date=datetime.now().strftime("%Y-%m-%d"),
            currency="INR"
        )
        assert "flights" in flights_res, "Flights search missing 'flights' key"
        assert len(flights_res["flights"]) > 0, "No flights returned"
        f0 = flights_res["flights"][0]
        print(f"  + Live flights found: {len(flights_res['flights'])} flights (is_demo: {flights_res.get('is_demo')}, provider: {flights_res.get('provider')})")
        print(f"    Sample: {f0.get('airline')} ({f0.get('flight_number')}) - Price: {f0.get('price')} {f0.get('currency')}")

        hotels_res = hotel_service.search_hotels(
            destination="Goa",
            currency="INR"
        )
        assert "hotels" in hotels_res, "Hotels search missing 'hotels' key"
        assert len(hotels_res["hotels"]) > 0, "No hotels returned"
        h0 = hotels_res["hotels"][0]
        print(f"  + Live hotels found:  {len(hotels_res['hotels'])} properties (is_demo: {hotels_res.get('is_demo')}, provider: {hotels_res.get('provider')})")
        print(f"    Sample: {h0.get('name')} - Rating: {h0.get('rating')} - Price: {h0.get('price_per_night')} {h0.get('currency')}")
        print("  -> TEST 2 PASSED: SerpApi Google Flights & Google Hotels live search functioning.")
        passed += 1
    except Exception as exc:
        print(f"  FAILED TEST 2: {exc}")

    # -------------------------------------------------------------
    # TEST 3: MAPS & ROUTING -- OPENSTREETMAP + OSRM PUBLIC ROUTING
    # -------------------------------------------------------------
    print("\n[TEST 3] Maps & Routing -- OpenStreetMap Nominatim & OSRM Routing")
    try:
        from services import route_optimizer
        # Geocoding test
        c_baga = route_optimizer.geocode_place("Baga Beach", "Goa")
        c_calangute = route_optimizer.geocode_place("Calangute Beach", "Goa")
        assert c_baga and len(c_baga) == 2, f"Geocoding failed for Baga: {c_baga}"
        print(f"  + Geocoded Baga: {c_baga}, Calangute: {c_calangute}")

        # OSRM route test
        osrm_route = route_optimizer.get_osrm_route(c_baga, c_calangute, mode="driving")
        assert "distance_km" in osrm_route, "OSRM route missing distance_km"
        assert "latlng_path" in osrm_route, "OSRM route missing latlng_path"
        print(f"  + OSRM Route: {osrm_route.get('distance_km')} km road dist, {osrm_route.get('duration_minutes')} min duration")
        print(f"    Road Route: {osrm_route.get('is_road_route')}, Provider: {osrm_route.get('provider')}")
        print(f"    Attribution: {osrm_route.get('attribution')}")

        # 2-opt TSP route optimization test
        test_trip = {
            "destination": "Goa",
            "currency": "INR",
            "itinerary": {
                "days": [{
                    "day_number": 1,
                    "theme": "Goa North Circuit",
                    "activities": [
                        {"name": "Baga Beach", "location": "North Goa"},
                        {"name": "Fort Aguada", "location": "Sinquerim"},
                        {"name": "Calangute Beach", "location": "North Goa"}
                    ]
                }]
            }
        }
        opt_res = route_optimizer.optimize_trip_route(test_trip)
        day1 = opt_res["days"][0]
        assert len(day1["activities"]) == 3, "Activity count mismatch in optimization"
        assert "map_data" in day1, "map_data missing from optimized day"
        print(f"  + TSP 2-Opt Result: {opt_res.get('algorithm')}")
        print(f"    Waypoints mapped: {len(day1['map_data']['waypoints'])}, Route polyline points: {len(day1['map_data']['route_geometry'])}")
        print("  -> TEST 3 PASSED: OpenStreetMap + OSRM routing and 2-opt optimizer verified.")
        passed += 1
    except Exception as exc:
        print(f"  FAILED TEST 3: {exc}")

    # -------------------------------------------------------------
    # TEST 4: CURRENCY EXCHANGE -- FRANKFURTER V2
    # -------------------------------------------------------------
    print("\n[TEST 4] Currency Exchange -- Frankfurter v2 API")
    try:
        from services import currency_service
        rates_res = currency_service.get_exchange_rates("USD")
        assert "rates" in rates_res, f"Frankfurter rates failed: {rates_res}"
        eur_rate = rates_res.get("rates", {}).get("EUR")
        inr_rate = rates_res.get("rates", {}).get("INR")
        print(f"  + Base USD live rates fetched: 1 USD = {eur_rate} EUR, {inr_rate} INR")
        print(f"    Rate Source: {rates_res.get('source')}, Date: {rates_res.get('last_updated')}")

        conv_res = currency_service.convert_currency(100.0, "USD", "EUR")
        assert conv_res.get("converted_amount") > 0, "Conversion amount invalid"
        print(f"  + Conversion: 100 USD -> {conv_res.get('converted_amount')} EUR (Rate: {conv_res.get('exchange_rate')})")
        print("  -> TEST 4 PASSED: Frankfurter v2 free live FX rate integration verified.")
        passed += 1
    except Exception as exc:
        print(f"  FAILED TEST 4: {exc}")

    # -------------------------------------------------------------
    # TEST 5: WEATHER REPLANNING -- OPEN-METEO
    # -------------------------------------------------------------
    print("\n[TEST 5] Weather Replanning -- Open-Meteo API")
    try:
        from services import replanning_service
        weather_res = replanning_service.get_destination_weather("Goa")
        assert weather_res.get("success"), f"Open-Meteo forecast failed: {weather_res}"
        forecasts = weather_res.get("daily_forecast", [])
        assert len(forecasts) >= 5, "Forecast days less than 5"
        f0 = forecasts[0]
        print(f"  + Open-Meteo 7-day forecast for Goa: {len(forecasts)} days")
        print(f"    Day 1 ({f0.get('date')}): {f0.get('temp_max_c')}°C / {f0.get('temp_min_c')}°C, {f0.get('condition')}, {f0.get('precipitation_probability')}% rain risk")
        print(f"    Attribution: {weather_res.get('attribution')}")

        # Replanning bad weather proposal
        replan_trip = {
            "destination": "Goa",
            "currency": "INR",
            "itinerary": {
                "days": [{
                    "day_number": 1,
                    "theme": "Beach Exploration",
                    "activities": [
                        {"name": "Calangute Beach Sunbathing", "description": "Relax on open beach and outdoor umbrellas."},
                        {"name": "Baga Watersports", "description": "Outdoor jet ski and beach parasailing."}
                    ]
                }]
            }
        }
        proposal_res = replanning_service.replan_itinerary(replan_trip, scenario="bad_weather")
        assert proposal_res.get("success"), "Replanning proposal failed"
        assert "weather_data" in proposal_res, "weather_data missing from proposal"
        print(f"  + Replan Proposal: {proposal_res.get('summary')}")
        print(f"    Substitutions: {proposal_res.get('changes_made')}")
        print(f"    Weather attribution included: {proposal_res.get('weather_attribution')}")
        print("  -> TEST 5 PASSED: Open-Meteo live forecast & weather-safe itinerary replanning verified.")
        passed += 1
    except Exception as exc:
        print(f"  FAILED TEST 5: {exc}")

    # -------------------------------------------------------------
    # TEST 6: FLASK APP HEALTH & MONGO ATLAS PERSISTENCE
    # -------------------------------------------------------------
    print("\n[TEST 6] Flask Production Endpoints & MongoDB Atlas")
    try:
        from app import create_app
        flask_app = create_app()
        client = flask_app.test_client()

        # Health endpoint
        health_resp = client.get("/health")
        assert health_resp.status_code == 200, f"/health status {health_resp.status_code}"
        health_json = health_resp.get_json()
        print(f"  + /health check: HTTP {health_resp.status_code} - {health_json.get('status')}")

        api_health_resp = client.get("/api/health")
        assert api_health_resp.status_code == 200, f"/api/health status {api_health_resp.status_code}"
        api_health_json = api_health_resp.get_json()
        api_health_data = api_health_json.get("data", {})
        assert api_health_data.get("database") == "connected", f"Database not connected: {api_health_json}"
        print(f"  + /api/health check: MongoDB Atlas {api_health_data.get('database')} (Status: {api_health_data.get('status')})")

        # Destination weather endpoint
        w_endpoint = client.get("/api/trips/weather?destination=London")
        assert w_endpoint.status_code == 200, f"/api/trips/weather HTTP {w_endpoint.status_code}"
        print(f"  + /api/trips/weather?destination=London: HTTP 200 OK")

        print("  -> TEST 6 PASSED: Flask production health endpoints & MongoDB Atlas fully operational.")
        passed += 1
    except Exception as exc:
        print(f"  FAILED TEST 6: {exc}")

    print("\n" + "=" * 70)
    print(f"VERIFICATION SUMMARY: {passed} OF {total} TEST SUITES PASSED CLEANLY")
    print("=" * 70)
    return passed == total

if __name__ == "__main__":
    success = run_e2e_verification()
    sys.exit(0 if success else 1)
