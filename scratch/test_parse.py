import sys
sys.path.append('backend')
from services.gemini_service import _parse_json
text = '''Here is your itinerary:
```json
{
  "days": [
     {"day": 1, "title": "Day 1"}
  ]
}
```
Have a great trip!
'''
try:
    print(_parse_json(text))
except Exception as e:
    import traceback
    traceback.print_exc()
