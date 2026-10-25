
import os

from dotenv import load_dotenv

# Loads backend/.env (if present) into the process environment regardless of current working directory.
_basedir = os.path.abspath(os.path.dirname(__file__))
load_dotenv(os.path.join(_basedir, ".env"))
load_dotenv()


def _get_bool(name: str, default: bool = False) -> bool:
    return os.getenv(name, str(default)).strip().lower() in ("1", "true", "yes", "on")


def _get_int(name: str, default: int) -> int:
    try:
        return int(os.getenv(name, default))
    except (TypeError, ValueError):
        return default


def _get_cors_origins() -> list:
    """Read allowed frontend origins from CORS_ORIGINS env var, ensuring localhost remains available for dev."""
    default_dev = ["http://localhost:5173", "http://127.0.0.1:5173", "http://localhost:3000", "http://127.0.0.1:3000"]
    raw = os.getenv("CORS_ORIGINS", "")
    origins = []
    if raw.strip():
        for item in raw.split(","):
            cleaned = item.strip().rstrip("/")
            if cleaned and cleaned not in origins:
                origins.append(cleaned)
    for dev_origin in default_dev:
        if dev_origin not in origins:
            origins.append(dev_origin)
    return origins


class Config:
    # Flask
    FLASK_ENV = os.getenv("FLASK_ENV", "production")
    DEBUG = _get_bool("FLASK_DEBUG", False)
    HOST = os.getenv("HOST", "0.0.0.0" if os.getenv("RENDER") or os.getenv("FLASK_ENV") == "production" else "127.0.0.1")
    PORT = _get_int("PORT", 5000)
    MAX_CONTENT_LENGTH = 1 * 1024 * 1024  # reject request bodies > 1 MB

    # MongoDB
    MONGO_URI = os.getenv("MONGO_URI", "").strip()
    DB_NAME = os.getenv("DB_NAME", "travel_itinerary_db").strip()

    # JWT
    JWT_SECRET = os.getenv("JWT_SECRET", "").strip()
    JWT_ALGORITHM = "HS256"
    JWT_EXPIRY_HOURS = _get_int("JWT_EXPIRY_HOURS", 24)

    # AI Provider
    AI_PROVIDER = os.getenv("AI_PROVIDER", "gemini").strip().lower()

    # Gemini
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "").strip()
    GEMINI_MODEL = os.getenv("GEMINI_MODEL", "gemini-3.6-flash").strip()
    GEMINI_TIMEOUT_SECONDS = _get_int("GEMINI_TIMEOUT_SECONDS", 90)

    # Groq
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "").strip()
    GROQ_MODEL = os.getenv("GROQ_MODEL", "llama3-8b-8192").strip()

    # Destination Images (Pixabay API)
    IMAGE_API_KEY = os.getenv("IMAGE_API_KEY", "").strip() or os.getenv("PIXABAY_API_KEY", "").strip()
    PIXABAY_API_KEY = IMAGE_API_KEY

    # Flights & Hotels (SerpApi Google Flights & Google Hotels)
    FLIGHT_API_KEY = os.getenv("FLIGHT_API_KEY", "").strip()
    FLIGHT_API_SECRET = os.getenv("FLIGHT_API_SECRET", "").strip()
    HOTEL_API_KEY = os.getenv("HOTEL_API_KEY", "").strip() or FLIGHT_API_KEY
    SERPAPI_API_KEY = FLIGHT_API_KEY or HOTEL_API_KEY
    MAPS_API_KEY = os.getenv("MAPS_API_KEY", "").strip()
    CURRENCY_API_KEY = os.getenv("CURRENCY_API_KEY", "").strip()
    WEATHER_API_KEY = os.getenv("WEATHER_API_KEY", "").strip()

    # CORS (comma separated list of allowed frontend origins)
    CORS_ORIGINS = _get_cors_origins()

    @classmethod
    def fatal_problems(cls) -> list:
        """Problems that must stop the app from starting."""
        problems = []
        if len(cls.JWT_SECRET) < 32:
            problems.append(
                "JWT_SECRET is missing or shorter than 32 characters. Generate one with: "
                'python -c "import secrets; print(secrets.token_hex(32))"'
            )
        return problems

    @classmethod
    def warnings(cls) -> list:
        """Problems the app can start with, but features will not work."""
        warnings = []
        if not cls.MONGO_URI:
            warnings.append("MONGO_URI is not set - database features will be unavailable.")
        if not cls.GEMINI_API_KEY:
            warnings.append("GEMINI_API_KEY is not set - itinerary generation will be unavailable.")
        return warnings