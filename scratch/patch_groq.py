import re

with open('backend/services/gemini_service.py', 'r', encoding='utf-8') as f:
    code = f.read()

# 1. Update _get_groq_client to disable max_retries
code = code.replace(
    '_groq_client = Groq(api_key=Config.GROQ_API_KEY)',
    '_groq_client = Groq(api_key=Config.GROQ_API_KEY, max_retries=0)'
)

# 2. Update _generate_structured_data_groq
struct_func = """def _generate_structured_data_groq(prompt: str, system_instruction: str = "") -> dict:
    client = _get_groq_client()
    max_retries = 3
    backoff = [2, 4, 8]
    
    system_msg = system_instruction or "You are a helpful AI assistant."
    if "json" not in system_msg.lower() and "json" not in prompt.lower():
        system_msg += " You must respond with a valid JSON object."

    for attempt in range(max_retries + 1):
        try:
            response = client.chat.completions.create(
                model=Config.GROQ_MODEL,
                messages=[
                    {"role": "system", "content": system_msg},
                    {"role": "user", "content": prompt}
                ],
                response_format={"type": "json_object"},
                temperature=0.7,
            )
            break
        except groq.RateLimitError as exc:
            raw_msg = str(exc)
            safe_msg = raw_msg.replace(Config.GROQ_API_KEY, "[REDACTED]") if Config.GROQ_API_KEY else raw_msg
            logger.warning("Groq API rate limit (%s): %s", exc.__class__.__name__, safe_msg)
            
            if attempt < max_retries:
                retry_after = 3 # default short wait
                if hasattr(exc, 'response') and exc.response is not None:
                    header_val = exc.response.headers.get("retry-after")
                    if header_val and header_val.isdigit():
                        retry_after = min(int(header_val), 10) # cap to 10s
                import time
                time.sleep(retry_after)
                continue
            raise GeminiServiceError("The AI service is overloaded. Please try again later.", 503)
        except groq.APIStatusError as exc:
            raw_msg = str(exc)
            safe_msg = raw_msg.replace(Config.GROQ_API_KEY, "[REDACTED]") if Config.GROQ_API_KEY else raw_msg
            logger.error("Groq API error (%s): %s", exc.__class__.__name__, safe_msg)
            
            if attempt < max_retries and getattr(exc, "status_code", 500) in (500, 502, 503, 504):
                import time
                time.sleep(backoff[attempt])
                continue
            raise GeminiServiceError("The AI service failed. Please try again later.", 502)
        except Exception as exc:
            raw_msg = str(exc)
            safe_msg = raw_msg.replace(Config.GROQ_API_KEY, "[REDACTED]") if Config.GROQ_API_KEY else raw_msg
            logger.error("Unexpected Groq failure (%s): %s", exc.__class__.__name__, safe_msg)
            raise GeminiServiceError("Could not reach the AI service. Please try again later.", 502)

    text = getattr(response.choices[0].message, "content", None)
    if not text:
        raise GeminiServiceError("The AI service returned an empty response. Please try again.", 502)

    try:
        return _parse_json(text)
    except (ValueError, TypeError, KeyError):
        raise GeminiServiceError("The AI service returned an unexpected format. Please try again.", 502)"""

code = re.sub(
    r'def _generate_structured_data_groq.*?def _generate_structured_data_gemini',
    struct_func + '\n\ndef _generate_structured_data_gemini',
    code,
    flags=re.DOTALL
)

# 3. Update _generate_itinerary_groq
itin_func = """def _generate_itinerary_groq(params: dict) -> dict:
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
        except groq.RateLimitError as exc:
            raw_msg = str(exc)
            safe_msg = raw_msg.replace(Config.GROQ_API_KEY, "[REDACTED]") if Config.GROQ_API_KEY else raw_msg
            logger.warning("Groq API rate limit (%s): %s", exc.__class__.__name__, safe_msg)
            
            if attempt < max_retries:
                retry_after = 3 # default short wait
                if hasattr(exc, 'response') and exc.response is not None:
                    header_val = exc.response.headers.get("retry-after")
                    if header_val and header_val.isdigit():
                        retry_after = min(int(header_val), 10)
                logger.info("Retrying Groq API (attempt %d/%d) in %ds...", attempt + 1, max_retries, retry_after)
                import time
                time.sleep(retry_after)
                continue
            raise GeminiServiceError("The AI service is overloaded. Please try again later.", 503)
        except groq.APIStatusError as exc:
            raw_msg = str(exc)
            safe_msg = raw_msg.replace(Config.GROQ_API_KEY, "[REDACTED]") if Config.GROQ_API_KEY else raw_msg
            logger.error("Groq API error (%s): %s", exc.__class__.__name__, safe_msg)
            
            if attempt < max_retries and getattr(exc, "status_code", 500) in (500, 502, 503, 504):
                import time
                time.sleep(backoff[attempt])
                continue
            raise GeminiServiceError("The AI service failed. Please try again later.", 502)
        except Exception as exc:
            raw_msg = str(exc)
            safe_msg = raw_msg.replace(Config.GROQ_API_KEY, "[REDACTED]") if Config.GROQ_API_KEY else raw_msg
            logger.error("Unexpected Groq failure (%s): %s", exc.__class__.__name__, safe_msg)
            raise GeminiServiceError("Could not reach the AI service. Please try again later.", 502)

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
        )"""

code = re.sub(
    r'def _generate_itinerary_groq.*?def _generate_itinerary_gemini',
    itin_func + '\n\ndef _generate_itinerary_gemini',
    code,
    flags=re.DOTALL
)

with open('backend/services/gemini_service.py', 'w', encoding='utf-8') as f:
    f.write(code)
