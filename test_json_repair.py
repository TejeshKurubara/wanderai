import re
import json

def repair_and_parse_json(text: str) -> dict:
    if not text or not text.strip():
        raise ValueError("Empty text")

    # 1. Extract markdown code block if present
    match = re.search(r"```(?:json)?\s*(.*?)\s*```", text, re.IGNORECASE | re.DOTALL)
    extracted = match.group(1).strip() if match else text.strip()

    # 2. Try direct parse
    try:
        data = json.loads(extracted)
        if isinstance(data, (dict, list)):
            return data
    except json.JSONDecodeError:
        pass

    # 3. Clean up common JSON issues: trailing commas before } or ]
    cleaned = re.sub(r",\s*([\]}])", r"\1", extracted)
    try:
        data = json.loads(cleaned)
        if isinstance(data, (dict, list)):
            return data
    except json.JSONDecodeError:
        pass

    # 4. Handle truncated JSON array / object
    # Find the outermost start brace or bracket
    first_brace = cleaned.find("{")
    first_bracket = cleaned.find("[")
    
    start = -1
    if first_brace != -1 and first_bracket != -1:
        start = min(first_brace, first_bracket)
    elif first_brace != -1:
        start = first_brace
    elif first_bracket != -1:
        start = first_bracket

    if start == -1:
        raise ValueError("No JSON container found")

    content = cleaned[start:]

    # Search backwards for the last valid complete object boundary '}'
    last_brace_idx = content.rfind("}")
    while last_brace_idx > 0:
        truncated_slice = content[:last_brace_idx + 1]
        
        # Count open brackets and braces to close them properly
        open_braces = 0
        open_brackets = 0
        in_string = False
        escape = False

        for char in truncated_slice:
            if char == '"' and not escape:
                in_string = not in_string
            elif not in_string:
                if char == '{':
                    open_braces += 1
                elif char == '}':
                    open_braces -= 1
                elif char == '[':
                    open_brackets += 1
                elif char == ']':
                    open_brackets -= 1
            if char == '\\' and not escape:
                escape = True
            else:
                escape = False

        # Attempt to close open structures
        closing = ""
        closing += "]" * max(0, open_brackets)
        closing += "}" * max(0, open_braces)

        candidate = truncated_slice + closing
        candidate_clean = re.sub(r",\s*([\]}])", r"\1", candidate)
        try:
            data = json.loads(candidate_clean)
            if isinstance(data, (dict, list)):
                return data
        except json.JSONDecodeError:
            pass
        
        # Try finding previous '}'
        last_brace_idx = content.rfind("}", 0, last_brace_idx)

    raise ValueError("Could not parse or repair JSON")

# Test cases
test_cases = [
    # 1. Normal
    '{"agent": "research", "status": "success", "places": [{"name": "Tower"}]}',
    # 2. Markdown fenced with trailing comma
    '```json\n{"agent": "research", "places": [{"name": "Tower", "city": "London",},]}\n```',
    # 3. Truncated mid-stream (similar to the user log char 3544!)
    '{\n  "agent": "research",\n  "status": "success",\n  "places": [\n    {"name": "Tower", "city": "London"},\n    {"name": "Museum", "city": "London"},\n    {"name": "Cutoff", "city": '
]

for i, tc in enumerate(test_cases, 1):
    try:
        res = repair_and_parse_json(tc)
        print(f"Test {i} SUCCESS:", res)
    except Exception as e:
        print(f"Test {i} FAILED:", e)
