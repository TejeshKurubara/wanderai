import os
import secrets

env_path = r"C:\Users\Sumera Anjum\OneDrive\Desktop\Codomax-aiml-internship\module-5-ai-travel-itinerary\backend\.env"

with open(env_path, "r", encoding="utf-8") as f:
    content = f.read()

content = content.replace("JWT_SECRET=", f"JWT_SECRET={secrets.token_hex(32)}")

with open(env_path, "w", encoding="utf-8") as f:
    f.write(content)

print("Updated .env")
