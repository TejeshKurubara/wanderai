import os
import glob

base_dir = r"C:\Users\Sumera Anjum\OneDrive\Desktop\Codomax-aiml-internship\module-5-ai-travel-itinerary"

def strip_bom(filepath):
    try:
        with open(filepath, 'rb') as f:
            raw = f.read()
        if raw.startswith(b'\xef\xbb\xbf'):
            raw = raw[3:]
            with open(filepath, 'wb') as f:
                f.write(raw)
    except Exception as e:
        pass

for root, _, files in os.walk(base_dir):
    if "node_modules" in root: continue
    for file in files:
        if file.endswith(('.json', '.js', '.ts', '.tsx', '.html', '.css')):
            strip_bom(os.path.join(root, file))

print("Stripped BOM")
