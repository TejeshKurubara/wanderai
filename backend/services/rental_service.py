"""
WanderAI Car & Vehicle Rental Service
Provides inventory search, vehicle filtering, rate calculation,
and booking data generation for rental vehicles.
"""

from datetime import datetime, timedelta
import logging
import re
from services import currency_service

logger = logging.getLogger(__name__)

# Curated vehicle models library with high-resolution imagery and specs
VEHICLE_CATALOG = [
    # --- Economy / Compact ---
    {
        "id": "car-econ-1",
        "vehicle_name": "Volkswagen Golf or similar",
        "category": "Economy / Compact",
        "provider": "Hertz",
        "rating": 4.8,
        "review_count": 1240,
        "badge": "⚡ INSTANT CONFIRMATION",
        "image_url": "https://images.unsplash.com/photo-1541899481282-d53bffe3c35d?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 3200,
        "seats": 5,
        "bags": 2,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["5 Seats", "2 Large Bags", "Automatic", "Air Conditioning", "Free Cancellation", "Unlimited KM"],
        "cancellation_policy": "Free cancellation up to 48h before pickup",
    },
    {
        "id": "car-econ-2",
        "vehicle_name": "Hyundai i20 / Swift Hatchback",
        "category": "Economy / Compact",
        "provider": "Avis",
        "rating": 4.7,
        "review_count": 980,
        "badge": "BEST VALUE",
        "image_url": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 2650,
        "seats": 5,
        "bags": 2,
        "transmission": "Manual",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["5 Seats", "2 Bags", "Manual", "Air Conditioning", "Free Cancellation", "Unlimited KM"],
        "cancellation_policy": "Free cancellation up to 24h before pickup",
    },
    {
        "id": "car-econ-3",
        "vehicle_name": "Toyota Yaris Sedan",
        "category": "Economy / Compact",
        "provider": "Enterprise",
        "rating": 4.9,
        "review_count": 1850,
        "badge": "TOP RATED",
        "image_url": "https://images.unsplash.com/photo-1590362891988-f77804703088?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 3450,
        "seats": 5,
        "bags": 3,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["5 Seats", "3 Large Bags", "Automatic", "Air Conditioning", "Free Cancellation", "Unlimited KM"],
        "cancellation_policy": "Free cancellation anytime prior to pickup",
    },

    # --- SUV ---
    {
        "id": "car-suv-1",
        "vehicle_name": "Hyundai Tucson SUV or similar",
        "category": "SUV",
        "provider": "Sixt",
        "rating": 4.8,
        "review_count": 840,
        "badge": "POPULAR SUV",
        "image_url": "https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 4800,
        "seats": 5,
        "bags": 4,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["5 Seats", "4 Large Bags", "Automatic", "AWD System", "Apple CarPlay", "Unlimited KM"],
        "cancellation_policy": "Free cancellation up to 48h before pickup",
    },
    {
        "id": "car-suv-2",
        "vehicle_name": "Jeep Compass 4x4",
        "category": "SUV",
        "provider": "Enterprise",
        "rating": 4.8,
        "review_count": 1120,
        "badge": "ALL-TERRAIN",
        "image_url": "https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 5400,
        "seats": 5,
        "bags": 4,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["5 Seats", "4 Bags", "Automatic", "Trail Rated 4x4", "High Clearance", "Unlimited KM"],
        "cancellation_policy": "Free cancellation up to 48h before pickup",
    },
    {
        "id": "car-suv-3",
        "vehicle_name": "Toyota RAV4 Hybrid AWD",
        "category": "SUV",
        "provider": "Hertz",
        "rating": 4.9,
        "review_count": 1460,
        "badge": "ECO CHOICE",
        "image_url": "https://images.unsplash.com/photo-1583121274602-3e2820c69888?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 5200,
        "seats": 5,
        "bags": 4,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["5 Seats", "4 Bags", "Automatic", "Self-Charging Hybrid", "Panoramic Roof", "Unlimited KM"],
        "cancellation_policy": "Free cancellation up to 24h before pickup",
    },

    # --- Electric / Hybrid ---
    {
        "id": "car-ev-1",
        "vehicle_name": "Tesla Model 3 Long Range",
        "category": "Electric / Hybrid",
        "provider": "Sixt",
        "rating": 4.9,
        "review_count": 920,
        "badge": "⚡ ZERO EMISSION",
        "image_url": "https://images.unsplash.com/photo-1560958089-b8a1929cea89?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 5900,
        "seats": 5,
        "bags": 2,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["5 Seats", "2 Bags", "Automatic", "Supercharging Included", "Autopilot", "Zero Emissions"],
        "cancellation_policy": "Free cancellation up to 48h before pickup",
    },
    {
        "id": "car-ev-2",
        "vehicle_name": "Hyundai Ioniq 5 Electric Crossover",
        "category": "Electric / Hybrid",
        "provider": "Avis",
        "rating": 4.8,
        "review_count": 670,
        "badge": "⚡ FAST CHARGE",
        "image_url": "https://images.unsplash.com/photo-1617814076367-b759c7d7e738?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 5600,
        "seats": 5,
        "bags": 3,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["5 Seats", "3 Bags", "Automatic", "800V Ultra-Fast Charge", "Ultra Spacious", "Free Cancellation"],
        "cancellation_policy": "Free cancellation up to 48h before pickup",
    },

    # --- Luxury ---
    {
        "id": "car-lux-1",
        "vehicle_name": "Mercedes-Benz C-Class Executive",
        "category": "Luxury",
        "provider": "Sixt",
        "rating": 4.9,
        "review_count": 1150,
        "badge": "PREMIUM LUXURY",
        "image_url": "https://images.unsplash.com/photo-1618843479313-40f8afb4b4d8?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 8900,
        "seats": 5,
        "bags": 3,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["5 Seats", "3 Bags", "Automatic", "Leather Interior", "Burmester Surround Sound", "Chauffeur Ready"],
        "cancellation_policy": "Free cancellation up to 48h before pickup",
    },
    {
        "id": "car-lux-2",
        "vehicle_name": "BMW 5 Series M-Sport",
        "category": "Luxury",
        "provider": "Hertz",
        "rating": 4.9,
        "review_count": 780,
        "badge": "PERFORMANCE",
        "image_url": "https://images.unsplash.com/photo-1555215695-3004980ad54e?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 9600,
        "seats": 5,
        "bags": 3,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["5 Seats", "3 Bags", "Automatic", "Head-Up Display", "Adaptive Suspension", "Free Cancellation"],
        "cancellation_policy": "Free cancellation up to 48h before pickup",
    },

    # --- Van / Minivan ---
    {
        "id": "car-van-1",
        "vehicle_name": "Toyota Innova Crysta / Sienna",
        "category": "Van / Minivan",
        "provider": "Avis",
        "rating": 4.9,
        "review_count": 1320,
        "badge": "FAMILY & GROUP",
        "image_url": "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 5800,
        "seats": 7,
        "bags": 5,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["7 Seats", "5 Large Bags", "Automatic", "Rear AC Vents", "Captain Chairs", "Unlimited KM"],
        "cancellation_policy": "Free cancellation up to 48h before pickup",
    },
    {
        "id": "car-van-2",
        "vehicle_name": "Mercedes-Benz V-Class Luxury MPV",
        "category": "Van / Minivan",
        "provider": "Enterprise",
        "rating": 4.8,
        "review_count": 510,
        "badge": "LUXURY CARRIER",
        "image_url": "https://images.unsplash.com/photo-1570125909232-eb263c188f7e?auto=format&fit=crop&w=800&q=80",
        "base_inr_daily": 9200,
        "seats": 8,
        "bags": 6,
        "transmission": "Automatic",
        "air_conditioning": True,
        "unlimited_mileage": True,
        "spec_tags": ["8 Seats", "6 Large Bags", "Automatic", "Conference Seating", "Electric Sliding Doors", "Unlimited KM"],
        "cancellation_policy": "Free cancellation up to 72h before pickup",
    },
]


def search_rentals(
    location: str,
    pickup_date: str = None,
    dropoff_date: str = None,
    passengers: int = 1,
    category: str = None,
    transmission: str = None,
    currency: str = "INR",
) -> dict:
    """
    Search available rental vehicles for a given location, date range, passenger count,
    vehicle category, and transmission preference.
    """
    clean_loc = (location or "Destination").strip()
    city_name = clean_loc.split(",")[0].strip()

    # Parse and validate dates
    now = datetime.now()
    if not pickup_date or not re.match(r"^\d{4}-\d{2}-\d{2}$", pickup_date):
        p_dt = now + timedelta(days=7)
        pickup_date = p_dt.strftime("%Y-%m-%d")
    else:
        try:
            p_dt = datetime.strptime(pickup_date, "%Y-%m-%d")
        except ValueError:
            p_dt = now + timedelta(days=7)
            pickup_date = p_dt.strftime("%Y-%m-%d")

    if not dropoff_date or not re.match(r"^\d{4}-\d{2}-\d{2}$", dropoff_date):
        d_dt = p_dt + timedelta(days=3)
        dropoff_date = d_dt.strftime("%Y-%m-%d")
    else:
        try:
            d_dt = datetime.strptime(dropoff_date, "%Y-%m-%d")
        except ValueError:
            d_dt = p_dt + timedelta(days=3)
            dropoff_date = d_dt.strftime("%Y-%m-%d")

    # Calculate days count (minimum 1 day)
    rental_days = max(1, (d_dt - p_dt).days)

    target_currency = (currency or "INR").upper().strip()

    # Filter catalog
    clean_cat = (category or "").lower().strip()
    clean_trans = (transmission or "").lower().strip()

    filtered = []
    for item in VEHICLE_CATALOG:
        # Category filter
        if clean_cat and clean_cat not in ("all", "any"):
            cat_lower = item["category"].lower()
            if "compact" in clean_cat or "economy" in clean_cat:
                if "economy" not in cat_lower and "compact" not in cat_lower:
                    continue
            elif "suv" in clean_cat:
                if "suv" not in cat_lower:
                    continue
            elif "electric" in clean_cat or "hybrid" in clean_cat or "ev" in clean_cat:
                if "electric" not in cat_lower and "hybrid" not in cat_lower:
                    continue
            elif "luxury" in clean_cat:
                if "luxury" not in cat_lower:
                    continue
            elif "van" in clean_cat or "minivan" in clean_cat:
                if "van" not in cat_lower:
                    continue

        # Transmission filter
        if clean_trans and clean_trans not in ("all", "any"):
            if item["transmission"].lower() != clean_trans:
                continue

        # Passenger capacity check if travelers > 5
        if passengers and passengers > 5:
            if item["seats"] < passengers:
                continue

        # Convert currency
        base_daily = float(item["base_inr_daily"])
        if target_currency != "INR":
            conv = currency_service.convert_currency(base_daily, "INR", target_currency)
            daily_rate = round(conv["converted_amount"], 2)
        else:
            daily_rate = round(base_daily, 2)

        total_price = round(daily_rate * rental_days, 2)

        pickup_station = f"{city_name} International Airport Hub" if "Airport" not in city_name else city_name
        dropoff_station = f"{city_name} Center Hub / Airport Drop"

        vehicle = {
            "id": f"{item['id']}-{city_name.lower().replace(' ', '')}",
            "vehicle_name": item["vehicle_name"],
            "category": item["category"],
            "provider": item["provider"],
            "rating": item["rating"],
            "review_count": item["review_count"],
            "badge": item["badge"],
            "image_url": item["image_url"],
            "daily_rate": daily_rate,
            "total_price": total_price,
            "currency": target_currency,
            "seats": item["seats"],
            "bags": item["bags"],
            "transmission": item["transmission"],
            "air_conditioning": item["air_conditioning"],
            "unlimited_mileage": item["unlimited_mileage"],
            "cancellation_policy": item["cancellation_policy"],
            "spec_tags": item["spec_tags"],
            "pickup_location": pickup_station,
            "dropoff_location": dropoff_station,
            "pickup_date": pickup_date,
            "dropoff_date": dropoff_date,
            "days": rental_days,
            "is_demo_offer": True,
        }
        filtered.append(vehicle)

    return {
        "success": True,
        "rentals": filtered,
        "count": len(filtered),
        "days": rental_days,
        "pickup_date": pickup_date,
        "dropoff_date": dropoff_date,
        "location": city_name,
        "currency": target_currency,
        "is_demo": True,
    }
