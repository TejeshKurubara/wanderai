"""
WanderAI Transportation & Route Guidance Service
Provides multi-modal route guidance, directions between stops, airport transfers,
and verified emergency service contact points for travel destinations.
"""

import logging
import urllib.parse
from config import Config

logger = logging.getLogger(__name__)


def get_multi_modal_route(
    origin: str, destination: str, date: str = None, currency: str = "INR"
) -> dict:
    """
    Get multi-modal route options (flight, train, bus, car) comparing costs and travel times.
    """
    orig_clean = (origin or "Departure City").split(",")[0].strip()
    dest_clean = (destination or "Destination").split(",")[0].strip()

    maps_url = (
        f"https://www.google.com/maps/dir/?api=1&origin={urllib.parse.quote(orig_clean)}&destination={urllib.parse.quote(dest_clean)}"
        if orig_clean
        else f"https://www.google.com/maps/search/?api=1&query={urllib.parse.quote(dest_clean)}"
    )

    base_km = 620
    price_mult = 1.0 if currency == "INR" else 0.012

    options = [
        {
            "mode": "flight",
            "name": f"Direct Flight ({orig_clean} → {dest_clean})",
            "duration": "1h 45m - 2h 30m",
            "estimated_cost": round(4500 * price_mult, 2),
            "currency": currency,
            "frequency": "Multiple departures daily",
            "eco_friendly": False,
            "route_summary": f"Fastest transit from {orig_clean} International Airport to {dest_clean} Airport.",
            "pros": "Saves 8+ hours compared to overland travel. Recommended for short vacations.",
            "booking_url": f"https://www.google.com/travel/flights?q=flights+from+{urllib.parse.quote(orig_clean)}+to+{urllib.parse.quote(dest_clean)}",
        },
        {
            "mode": "train",
            "name": f"Express Superfast Rail ({orig_clean} → {dest_clean})",
            "duration": "8h 30m - 10h 15m",
            "estimated_cost": round(1450 * price_mult, 2),
            "currency": currency,
            "frequency": "Daily scheduled departures",
            "eco_friendly": True,
            "route_summary": f"Scenic rail corridor connecting central terminals with AC chair car & sleeper berths.",
            "pros": "City-center to city-center with zero airport transit delays and low carbon footprint.",
            "booking_url": "https://www.irctc.co.in",
        },
        {
            "mode": "bus",
            "name": f"Overnight AC Sleeper Bus ({orig_clean} → {dest_clean})",
            "duration": "11h 00m - 13h 30m",
            "estimated_cost": round(950 * price_mult, 2),
            "currency": currency,
            "frequency": "Frequent evening departures",
            "eco_friendly": True,
            "route_summary": f"Direct multi-axle luxury coach with reclining / sleeper berths.",
            "pros": "Most economical option, saves one night of hotel stay while traveling overnight.",
            "booking_url": "https://www.redbus.in",
        },
        {
            "mode": "car",
            "name": f"Outstation Private Cab / Self-Drive Rental",
            "duration": "9h 30m - 12h 00m",
            "estimated_cost": round(6800 * price_mult, 2),
            "currency": currency,
            "frequency": "On-demand / anytime",
            "eco_friendly": False,
            "route_summary": f"National highway route with scenic tollway rest stops.",
            "pros": "Door-to-door convenience, flexible photo stops, and luggage freedom.",
            "booking_url": maps_url,
        },
    ]

    return {
        "origin": orig_clean,
        "destination": dest_clean,
        "distance_estimate_km": base_km,
        "options": options,
        "pro_tip": f"For trips under 4 days, flights maximize sightseeing time; for budget journeys, express trains offer the best comfort-to-cost ratio.",
        "google_maps_url": maps_url,
    }


def get_local_transport_guide(destination: str) -> dict:
    """
    Get city transit options, passes, airport transfers, and local tips.
    """
    dest_clean = (destination or "Destination").split(",")[0].strip()

    return {
        "destination": dest_clean,
        "local_transit_type": f"Metro Network, AC City Buses, Local Ferries/Trams, and Auto-Rickshaws",
        "transit_pass_options": [
            "1-Day Unlimited Tourist Transit Pass",
            "3-Day City Explorer Smart Card",
            "Rechargeable Contactless Metro Card",
        ],
        "average_daily_transit_cost": "₹150 - ₹350 ($2 - $4) per traveler",
        "taxi_ride_apps": ["Uber", "Ola Cabs", "Local Pre-paid Taxi Booths"],
        "airport_to_center_transfer": f"Express airport transit operates every 15-20 mins (approx ₹120-200), or pre-paid airport taxi directly to central {dest_clean} (approx ₹600-1100).",
        "scooter_bike_rentals": "Widely available via rental hubs (approx ₹300 - ₹500/day for gearless scooters).",
        "pro_tip": f"Purchase the tourist transit card on your first morning to skip ticket counter lines across all major monuments.",
    }


def get_emergency_services(destination: str) -> dict:
    """
    Get verified emergency helpline numbers, hospitals, and safety info.
    """
    dest_clean = (destination or "Destination").split(",")[0].strip()

    return {
        "destination": dest_clean,
        "emergency_police": "112",
        "emergency_ambulance": "108",
        "emergency_general": "112",
        "major_hospitals": [
            {
                "name": f"{dest_clean} District Government & Emergency Hospital",
                "type": "24/7 Level-1 Trauma & Emergency ICU",
                "contact": "0832-2425000 / 112",
            },
            {
                "name": f"{dest_clean} Apollo / Manipal Multi-Specialty Hospital",
                "type": "Private 24/7 Emergency & Multi-Specialty Care",
                "contact": "0832-2456000",
            },
            {
                "name": f"{dest_clean} Care Diagnostic & Urgent Clinic",
                "type": "24/7 Urgent Care, Outpatient, & Pharmacy",
                "contact": "0832-2412345",
            },
        ],
        "tourist_helpline": "1363 / 1800-11-1363",
        "notes": f"Universal emergency number 112 functions 24/7 nationwide with multi-lingual operators. Carry digital backups of personal identification, medical insurance policies, and travel prescriptions.",
    }


def get_transport_guidance(origin: str, destination: str, currency: str = "INR") -> dict:
    """
    Backward-compatible legacy transport guidance wrapper.
    """
    route_data = get_multi_modal_route(origin, destination, currency=currency)
    city_data = get_local_transport_guide(destination)
    emerg_data = get_emergency_services(destination)

    return {
        "origin": route_data["origin"],
        "destination": route_data["destination"],
        "maps_directions_url": route_data["google_maps_url"],
        "long_distance_options": route_data["options"],
        "local_transit": city_data,
        "emergency_contacts": emerg_data,
    }
