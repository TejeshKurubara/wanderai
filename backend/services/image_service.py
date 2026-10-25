"""
WanderAI Destination Image Service
Provides high-resolution, destination-specific images with provider integration,
caching, curated global defaults, and resilient multi-tier fallbacks.
"""

import os
import re
import logging
import requests
from config import Config

logger = logging.getLogger(__name__)

# In-memory URL cache to avoid redundant API or network calls
_IMAGE_CACHE: dict = {}

# High-resolution curated photos for prominent world and Indian destinations
CURATED_DESTINATION_IMAGES = {
    "london": "https://images.unsplash.com/photo-1513635269975-59663e0ac1ad?auto=format&fit=crop&w=1200&q=80",
    "goa": "https://images.unsplash.com/photo-1512343879784-a960bf40e7f2?auto=format&fit=crop&w=1200&q=80",
    "canada": "https://images.unsplash.com/photo-1503614472-8c93d56e92ce?auto=format&fit=crop&w=1200&q=80",
    "paris": "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?auto=format&fit=crop&w=1200&q=80",
    "tokyo": "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?auto=format&fit=crop&w=1200&q=80",
    "kyoto": "https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?auto=format&fit=crop&w=1200&q=80",
    "new york": "https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?auto=format&fit=crop&w=1200&q=80",
    "rome": "https://images.unsplash.com/photo-1552832230-c0197dd311b5?auto=format&fit=crop&w=1200&q=80",
    "florence": "https://images.unsplash.com/photo-1543429776-2782fc8e1acd?auto=format&fit=crop&w=1200&q=80",
    "bali": "https://images.unsplash.com/photo-1537996194471-e657df975ab4?auto=format&fit=crop&w=1200&q=80",
    "dubai": "https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=80",
    "singapore": "https://images.unsplash.com/photo-1525625293386-3f8f99389edd?auto=format&fit=crop&w=1200&q=80",
    "barcelona": "https://images.unsplash.com/photo-1583422409516-2895a77efded?auto=format&fit=crop&w=1200&q=80",
    "amsterdam": "https://images.unsplash.com/photo-1512470876302-972faa2aa9a4?auto=format&fit=crop&w=1200&q=80",
    "sydney": "https://images.unsplash.com/photo-1506973035872-a4ec16b8e8d9?auto=format&fit=crop&w=1200&q=80",
    "switzerland": "https://images.unsplash.com/photo-1530122037265-a5f1f91d3b99?auto=format&fit=crop&w=1200&q=80",
    "jaipur": "https://images.unsplash.com/photo-1599661046289-e31897846e41?auto=format&fit=crop&w=1200&q=80",
    "mumbai": "https://images.unsplash.com/photo-1570168007204-dfb528c6958f?auto=format&fit=crop&w=1200&q=80",
    "delhi": "https://images.unsplash.com/photo-1587474260584-136574528ed5?auto=format&fit=crop&w=1200&q=80",
    "kerala": "https://images.unsplash.com/photo-1602216056096-3b40cc0c9944?auto=format&fit=crop&w=1200&q=80",
    "manali": "https://images.unsplash.com/photo-1626621341517-bbf3d9990a23?auto=format&fit=crop&w=1200&q=80",
    "ladakh": "https://images.unsplash.com/photo-1581793745862-99fde7fa73d2?auto=format&fit=crop&w=1200&q=80",
    "agra": "https://images.unsplash.com/photo-1564507592333-c60657eea523?auto=format&fit=crop&w=1200&q=80",
    "maldives": "https://images.unsplash.com/photo-1514282401047-d79a71a590e8?auto=format&fit=crop&w=1200&q=80",
    "santorini": "https://images.unsplash.com/photo-1570077188670-e3a8d69ac5ff?auto=format&fit=crop&w=1200&q=80",
    "bangkok": "https://images.unsplash.com/photo-1508009603885-50cf7c579365?auto=format&fit=crop&w=1200&q=80",
    "berlin": "https://images.unsplash.com/photo-1560969184-10fe8719e047?auto=format&fit=crop&w=1200&q=80",
    "vienna": "https://images.unsplash.com/photo-1516550893923-42d28e5677af?auto=format&fit=crop&w=1200&q=80",
    "prague": "https://images.unsplash.com/photo-1541849546-216549ae216d?auto=format&fit=crop&w=1200&q=80",
    "venice": "https://images.unsplash.com/photo-1514890547357-a9ee288728e0?auto=format&fit=crop&w=1200&q=80",
    "istanbul": "https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?auto=format&fit=crop&w=1200&q=80",
    "cairo": "https://images.unsplash.com/photo-1572252009286-268acec5ca0a?auto=format&fit=crop&w=1200&q=80",
    "seoul": "https://images.unsplash.com/photo-1538485399081-7191377e8241?auto=format&fit=crop&w=1200&q=80",
}

# Default scenic fallback travel cover photo
DEFAULT_TRAVEL_IMAGE = "https://images.unsplash.com/photo-1488646953014-85cb44e25828?auto=format&fit=crop&w=1200&q=80"


def _clean_destination_key(destination: str) -> str:
    """Normalize destination query (e.g., 'London, UK' -> 'london')."""
    if not destination:
        return ""
    # Extract primary city/place name before comma
    primary = destination.split(",")[0].strip().lower()
    return re.sub(r"[^a-z0-9\s]", "", primary)


def get_destination_image(destination: str) -> str:
    """
    Get a high-resolution, destination-specific image URL.
    Checks:
    1. Memory cache
    2. Live Image API (Unsplash/Pexels if key configured)
    3. Curated destination library
    4. Keyword-based Unsplash search CDN
    5. Universal travel fallback image
    """
    if not destination or not destination.strip():
        return DEFAULT_TRAVEL_IMAGE

    primary = destination.split(",")[0].strip()
    clean_key = _clean_destination_key(destination)
    if clean_key in _IMAGE_CACHE:
        return _IMAGE_CACHE[clean_key]

    # If Pixabay API key is configured (IMAGE_API_KEY or PIXABAY_API_KEY)
    pixabay_key = getattr(Config, "IMAGE_API_KEY", "") or getattr(Config, "PIXABAY_API_KEY", "")
    if pixabay_key:
        try:
            # Query Pixabay with destination keyword
            clean_query = primary if primary else clean_key
            resp = requests.get(
                "https://pixabay.com/api/",
                params={
                    "key": pixabay_key,
                    "q": clean_query,
                    "image_type": "photo",
                    "orientation": "horizontal",
                    "category": "travel",
                    "safesearch": "true",
                    "per_page": 3,
                },
                timeout=4,
            )
            if resp.status_code == 200:
                hits = resp.json().get("hits", [])
                # If no hits in 'travel' category, retry query without category constraint
                if not hits:
                    resp_broad = requests.get(
                        "https://pixabay.com/api/",
                        params={
                            "key": pixabay_key,
                            "q": clean_query,
                            "image_type": "photo",
                            "orientation": "horizontal",
                            "safesearch": "true",
                            "per_page": 3,
                        },
                        timeout=4,
                    )
                    if resp_broad.status_code == 200:
                        hits = resp_broad.json().get("hits", [])

                if hits and isinstance(hits, list):
                    first_hit = hits[0]
                    img_url = (
                        first_hit.get("largeImageURL")
                        or first_hit.get("webformatURL")
                    )
                    if img_url:
                        _IMAGE_CACHE[clean_key] = img_url
                        return img_url
            elif resp.status_code == 429:
                logger.warning("[IMAGE SERVICE] Pixabay rate limit reached, utilizing curated cache.")
            else:
                logger.warning("[IMAGE SERVICE] Pixabay returned HTTP %s", resp.status_code)
        except Exception as exc:
            logger.warning("[IMAGE SERVICE] Live Pixabay lookup failed: %s", exc.__class__.__name__)

    # Fallback 1: Curated high-resolution destination library
    for key, url in CURATED_DESTINATION_IMAGES.items():
        if key in clean_key or clean_key in key:
            _IMAGE_CACHE[clean_key] = url
            return url

    # Fallback 2: Universal travel fallback photo
    _IMAGE_CACHE[clean_key] = DEFAULT_TRAVEL_IMAGE
    return DEFAULT_TRAVEL_IMAGE
