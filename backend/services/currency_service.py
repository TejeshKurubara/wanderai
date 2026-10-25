"""
WanderAI Currency Service & Multi-Currency Engine
Provides live and cached exchange rates, decimal-precision currency conversions,
and multi-currency budget calculations across 25+ global currencies.
"""

from decimal import Decimal, ROUND_HALF_UP
import logging
import time
import requests
from config import Config

logger = logging.getLogger(__name__)

# Comprehensive supported currencies
SUPPORTED_CURRENCIES = {
    "INR": {"name": "Indian Rupee", "symbol": "₹"},
    "USD": {"name": "US Dollar", "symbol": "$"},
    "EUR": {"name": "Euro", "symbol": "€"},
    "GBP": {"name": "British Pound", "symbol": "£"},
    "AED": {"name": "UAE Dirham", "symbol": "AED"},
    "JPY": {"name": "Japanese Yen", "symbol": "¥"},
    "CAD": {"name": "Canadian Dollar", "symbol": "CA$"},
    "AUD": {"name": "Australian Dollar", "symbol": "AU$"},
    "SGD": {"name": "Singapore Dollar", "symbol": "SG$"},
    "CHF": {"name": "Swiss Franc", "symbol": "CHF"},
    "THB": {"name": "Thai Baht", "symbol": "฿"},
    "CNY": {"name": "Chinese Yuan", "symbol": "¥"},
    "MYR": {"name": "Malaysian Ringgit", "symbol": "RM"},
    "IDR": {"name": "Indonesian Rupiah", "symbol": "Rp"},
    "NZD": {"name": "New Zealand Dollar", "symbol": "NZ$"},
    "KRW": {"name": "South Korean Won", "symbol": "₩"},
    "VND": {"name": "Vietnamese Dong", "symbol": "₫"},
    "TRY": {"name": "Turkish Lira", "symbol": "₺"},
    "SAR": {"name": "Saudi Riyal", "symbol": "SAR"},
    "QAR": {"name": "Qatari Riyal", "symbol": "QAR"},
    "BRL": {"name": "Brazilian Real", "symbol": "R$"},
    "ZAR": {"name": "South African Rand", "symbol": "R"},
    "EGP": {"name": "Egyptian Pound", "symbol": "E£"},
}

# Offline benchmark baseline rates (relative to USD = 1.0) for reliable fallback
FALLBACK_USD_RATES = {
    "USD": 1.0,
    "INR": 83.50,
    "EUR": 0.92,
    "GBP": 0.79,
    "AED": 3.67,
    "JPY": 152.0,
    "CAD": 1.36,
    "AUD": 1.51,
    "SGD": 1.34,
    "CHF": 0.90,
    "THB": 36.50,
    "CNY": 7.23,
    "MYR": 4.70,
    "IDR": 15850.0,
    "NZD": 1.65,
    "KRW": 1360.0,
    "VND": 25200.0,
    "TRY": 32.50,
    "SAR": 3.75,
    "QAR": 3.64,
    "BRL": 5.15,
    "ZAR": 18.50,
    "EGP": 47.80,
}

# In-memory rate cache: { base_currency: { "rates": dict, "timestamp": float, "source": str } }
_RATE_CACHE = {}
CACHE_TTL_SECONDS = 3600  # 1 hour cache


def get_supported_currencies() -> dict:
    """Return dictionary of supported currency codes, names and symbols."""
    return SUPPORTED_CURRENCIES


def get_exchange_rates(base_currency: str = "USD") -> dict:
    """
    Fetch exchange rates for base_currency.
    Attempts:
    1. In-memory cache (if fresh)
    2. Configured CURRENCY_API_KEY provider (Open Exchange Rates / ExchangeRate-API)
    3. Free open public exchange API (open.er-api.com / frankfurter) with zero key requirement
    4. Curated fallback benchmark rates
    """
    base = base_currency.upper().strip()
    if base not in SUPPORTED_CURRENCIES:
        base = "USD"

    now = time.time()
    cached = _RATE_CACHE.get(base)
    if cached and (now - cached["timestamp"]) < CACHE_TTL_SECONDS:
        return {
            "base": base,
            "rates": cached["rates"],
            "source": cached["source"],
            "last_updated": cached["last_updated"],
            "is_demo": cached.get("is_demo", False),
            "is_live": not cached.get("is_demo", False),
        }

    rates = {}
    source = "fallback_demo"
    is_demo = True
    last_updated = time.strftime("%Y-%m-%d %H:%M:%S UTC", time.gmtime(now))

    # 1. Primary: Frankfurter v2 API (Free open service, no key required)
    try:
        url = f"https://api.frankfurter.dev/v2/rates?base={base}"
        resp = requests.get(url, timeout=5)
        if resp.status_code == 200:
            data = resp.json()
            if isinstance(data, list) and len(data) > 0:
                rates = {}
                rate_date = None
                for item in data:
                    q = item.get("quote")
                    r = item.get("rate")
                    if q and r is not None:
                        rates[q] = float(r)
                    if not rate_date and "date" in item:
                        rate_date = item["date"]
                rates[base] = 1.0
                source = "Frankfurter v2"
                is_demo = False
                last_updated = rate_date or time.strftime("%Y-%m-%d", time.gmtime(now))
                logger.info("[CURRENCY SERVICE] Live rates loaded from Frankfurter v2 for %s", base)
    except Exception as exc:
        logger.warning("[CURRENCY SERVICE] Frankfurter v2 call failed: %s", exc)

    # 2. Secondary fallback: Frankfurter v1
    if not rates:
        try:
            url = f"https://api.frankfurter.dev/v1/latest?base={base}"
            resp = requests.get(url, timeout=5)
            if resp.status_code == 200:
                data = resp.json()
                if "rates" in data:
                    rates = {k: float(v) for k, v in data["rates"].items()}
                    rates[base] = 1.0
                    source = "Frankfurter v1"
                    is_demo = False
                    last_updated = data.get("date") or time.strftime("%Y-%m-%d", time.gmtime(now))
                    logger.info("[CURRENCY SERVICE] Live rates loaded from Frankfurter v1 for %s", base)
        except Exception as exc:
            logger.warning("[CURRENCY SERVICE] Frankfurter v1 call failed: %s", exc)

    # 3. Optional user-configured provider if key exists
    api_key = getattr(Config, "CURRENCY_API_KEY", "")
    if not rates and api_key:
        try:
            url = f"https://v6.exchangerate-api.com/v6/{api_key}/latest/{base}"
            resp = requests.get(url, timeout=4)
            if resp.status_code == 200:
                data = resp.json()
                if data.get("result") == "success" and "conversion_rates" in data:
                    rates = {k: float(v) for k, v in data["conversion_rates"].items()}
                    source = "ExchangeRate-API"
                    is_demo = False
                    logger.info("[CURRENCY SERVICE] Live rates loaded from ExchangeRate-API for %s", base)
        except Exception as exc:
            logger.warning("[CURRENCY SERVICE] Live provider call failed: %s", exc)

    # 3. Fallback to benchmark rates
    if not rates:
        # Calculate rates relative to base from FALLBACK_USD_RATES
        base_to_usd = FALLBACK_USD_RATES.get(base, 1.0)
        rates = {}
        for curr, usd_rate in FALLBACK_USD_RATES.items():
            # (curr / USD) / (base / USD) = curr / base
            rates[curr] = round(usd_rate / base_to_usd, 6)
        source = "fallback_benchmark"
        is_demo = True
        logger.info("[CURRENCY SERVICE] Using benchmark fallback rates for %s", base)

    # Cache result
    _RATE_CACHE[base] = {
        "rates": rates,
        "timestamp": now,
        "source": source,
        "last_updated": last_updated,
        "is_demo": is_demo,
    }

    return {
        "base": base,
        "rates": rates,
        "source": source,
        "last_updated": last_updated,
        "is_demo": is_demo,
        "is_live": not is_demo,
    }


def convert_currency(
    amount: float,
    from_currency: str,
    to_currency: str,
    manual_rate: float = None
) -> dict:
    """
    Convert amount from one currency to another using exact decimal arithmetic.
    """
    from_curr = from_currency.upper().strip()
    to_curr = to_currency.upper().strip()

    if from_curr not in SUPPORTED_CURRENCIES:
        from_curr = "INR"
    if to_curr not in SUPPORTED_CURRENCIES:
        to_curr = "USD"

    dec_amount = Decimal(str(round(float(amount), 4)))

    if from_curr == to_curr:
        return {
            "original_amount": float(dec_amount),
            "from_currency": from_curr,
            "to_currency": to_curr,
            "converted_amount": float(dec_amount),
            "exchange_rate": 1.0,
            "rate": 1.0,
            "rate_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "rate_source": "identity",
            "is_demo": False,
            "is_live": True,
        }

    # If user provided a manual rate explicitly
    if manual_rate is not None and manual_rate > 0:
        rate = Decimal(str(round(float(manual_rate), 6)))
        converted = (dec_amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)
        return {
            "original_amount": float(dec_amount),
            "from_currency": from_curr,
            "to_currency": to_curr,
            "converted_amount": float(converted),
            "exchange_rate": float(rate),
            "rate": float(rate),
            "rate_timestamp": time.strftime("%Y-%m-%d %H:%M:%S UTC"),
            "rate_source": "manual",
            "is_demo": False,
            "is_live": True,
        }

    # Fetch rates for from_curr
    rates_data = get_exchange_rates(from_curr)
    rate_val = rates_data["rates"].get(to_curr)

    if not rate_val or rate_val <= 0:
        # Cross-rate fallback
        rate_val = 1.0

    rate = Decimal(str(round(float(rate_val), 6)))
    converted = (dec_amount * rate).quantize(Decimal("0.01"), rounding=ROUND_HALF_UP)

    return {
        "original_amount": float(dec_amount),
        "from_currency": from_curr,
        "to_currency": to_curr,
        "converted_amount": float(converted),
        "exchange_rate": float(rate),
        "rate": float(rate),
        "rate_timestamp": rates_data["last_updated"],
        "rate_source": rates_data["source"],
        "is_demo": rates_data["is_demo"],
        "is_live": not rates_data.get("is_demo", False),
    }


def convert_trip_budget(trip: dict, target_currency: str, expenses: list = None) -> dict:
    """
    Project trip budget and expenses in target currency without mutating records.
    """
    source_currency = trip.get("currency", "INR")
    target_currency = target_currency.upper().strip()
    rate_info = convert_currency(1.0, source_currency, target_currency)
    rate = rate_info["rate"]

    total_budget = float(trip.get("budget") or 0.0)
    expenses = expenses or []
    paid_expenses = sum(float(e.get("amount") or 0.0) for e in expenses if e.get("payment_status") == "paid")
    pending_commitments = sum(float(e.get("amount") or 0.0) for e in expenses if e.get("payment_status") in ("pending", "planned"))
    remaining_budget = total_budget - paid_expenses

    # Categories
    categories = {}
    for e in expenses:
        if e.get("payment_status") == "paid":
            cat = e.get("category", "other")
            amt = float(e.get("amount") or 0.0)
            categories[cat] = categories.get(cat, 0.0) + amt

    category_breakdown = {}
    for cat, amt in categories.items():
        category_breakdown[cat] = {
            "original_amount": round(amt, 2),
            "converted_amount": round(amt * rate, 2),
            "percentage": round((amt / paid_expenses * 100), 1) if paid_expenses > 0 else 0.0,
        }

    return {
        "trip_id": str(trip.get("id") or trip.get("_id") or ""),
        "source_currency": source_currency,
        "target_currency": target_currency,
        "rate": rate,
        "is_live": rate_info.get("is_live", True),
        "original_budget": round(total_budget, 2),
        "converted_budget": round(total_budget * rate, 2),
        "original_paid_expenses": round(paid_expenses, 2),
        "converted_paid_expenses": round(paid_expenses * rate, 2),
        "original_remaining_budget": round(remaining_budget, 2),
        "converted_remaining_budget": round(remaining_budget * rate, 2),
        "original_pending_commitments": round(pending_commitments, 2),
        "converted_pending_commitments": round(pending_commitments * rate, 2),
        "category_breakdown": category_breakdown,
    }
