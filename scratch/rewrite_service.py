import re

with open('backend/services/gemini_service.py', 'r', encoding='utf-8') as f:
    code = f.read()

imports = """
import groq
from groq import Groq
"""
code = code.replace('from config import Config', f'from config import Config\n{imports}')

clients = """
_gemini_client = None
_groq_client = None

def _get_gemini_client():
    global _gemini_client
    if _gemini_client is not None:
        return _gemini_client
    if not Config.GEMINI_API_KEY:
        raise GeminiServiceError(
            "The AI service is not configured. Please contact the administrator.", 503
        )
    try:
        _gemini_client = genai.Client(
            api_key=Config.GEMINI_API_KEY,
            http_options=types.HttpOptions(timeout=Config.GEMINI_TIMEOUT_SECONDS * 1000),
        )
    except Exception:
        logger.error("Failed to initialise the Gemini client.")
        raise GeminiServiceError("The AI service could not be initialised.", 503)
    return _gemini_client

def _get_groq_client():
    global _groq_client
    if _groq_client is not None:
        return _groq_client
    if not Config.GROQ_API_KEY:
        raise GeminiServiceError(
            "The AI service is not configured. Please contact the administrator.", 503
        )
    try:
        _groq_client = Groq(api_key=Config.GROQ_API_KEY)
    except Exception:
        logger.error("Failed to initialise the Groq client.")
        raise GeminiServiceError("The AI service could not be initialised.", 503)
    return _groq_client
"""

code = re.sub(r'_client = None.*?return _client\n', clients, code, flags=re.DOTALL)


structured_data_func = """def generate_structured_data(prompt: str, system_instruction: str = "") -> dict:
    \"\"\"Generate structured JSON data from AI with retries.\"\"\"
    logger.info("[AI SERVICE] Provider: %s", Config.AI_PROVIDER)
    if Config.AI_PROVIDER == "groq":
        return _generate_structured_data_groq(prompt, system_instruction)
    else:
        return _generate_structured_data_gemini(prompt, system_instruction)

def _generate_structured_data_groq(prompt: str, system_instruction: str = "") -> dict:
    client = _get_groq_client()
    max_retries = 3
    backoff = [2, 4, 8]
    
    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_instruction or "You are a helpful AI assistant. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            break
        except Exception as exc:
            raw_msg = str(exc)
            safe_msg = raw_msg.replace(Config.GROQ_API_KEY, "[REDACTED]") if Config.GROQ_API_KEY else raw_msg
            logger.error("Groq API error (%s): %s", exc.__class__.__name__, safe_msg)
            
            if attempt < max_retries:
                import time
                time.sleep(backoff[attempt])
                continue
            raise GeminiServiceError("The AI service failed. Please try again later.", 502)

    text = getattr(response.choices[0].message, "content", None)
    if not text:
        raise GeminiServiceError("The AI service returned an empty response. Please try again.", 502)

    try:
        return _parse_json(text)
    except (ValueError, TypeError, KeyError):
        raise GeminiServiceError("The AI service returned an unexpected format. Please try again.", 502)

def _generate_structured_data_gemini(prompt: str, system_instruction: str = "") -> dict:"""

code = code.replace('def generate_structured_data(prompt: str, system_instruction: str = "") -> dict:', structured_data_func)
code = code.replace('client = _get_client()', 'client = _get_gemini_client()', 2)

itinerary_func = """def generate_itinerary(params: dict) -> dict:
    \"\"\"Generate an itinerary.

    params: destination, days, travelers, currency, and optionally budget,
    start_date, end_date, interests. Raises GeminiServiceError on any failure.
    \"\"\"
    logger.info("[AI SERVICE] Provider: %s", Config.AI_PROVIDER)
    if Config.AI_PROVIDER == "groq":
        return _generate_itinerary_groq(params)
    else:
        return _generate_itinerary_gemini(params)

def _generate_itinerary_groq(params: dict) -> dict:
    client = _get_groq_client()
    max_retries = 3
    backoff = [2, 4, 8]
    
    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": SYSTEM_INSTRUCTION},
                    {"role": "user", "content": _build_prompt(params)}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            break
        except Exception as exc:
            raw_msg = str(exc)
            safe_msg = raw_msg.replace(Config.GROQ_API_KEY, "[REDACTED]") if Config.GROQ_API_KEY else raw_msg
            logger.error("Groq API error (%s): %s", exc.__class__.__name__, safe_msg)
            
            if attempt < max_retries:
                logger.info("Retrying Groq API (attempt %d/%d) in %ds...", attempt + 1, max_retries, backoff[attempt])
                import time
                time.sleep(backoff[attempt])
                continue
            raise GeminiServiceError("The AI service failed. Please try again later.", 502)

    text = getattr(response.choices[0].message, "content", None)
    if not text:
        logger.error("Groq returned an empty response.")
        raise GeminiServiceError(
            "The AI service returned an empty response. Please try again.", 502
        )

    try:
        return _normalize(_parse_json(text), params)
    except (ValueError, TypeError, KeyError):
        logger.error("Groq returned malformed itinerary data.")
        raise GeminiServiceError(
            "The AI service returned an unexpected response. Please try again.", 502
        )

def _generate_itinerary_gemini(params: dict) -> dict:"""

code = code.replace('def generate_itinerary(params: dict) -> dict:', itinerary_func)

with open('backend/services/gemini_service.py', 'w', encoding='utf-8') as f:
    f.write(code)
