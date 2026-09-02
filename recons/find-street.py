import requests
import json

lat, lon = 10.7824453, 106.6962896
radius = 150  # meters, adjust as needed

overpass_url = "https://overpass-api.de/api/interpreter"
query = f"""
[out:json][timeout:25];
way(around:{radius},{lat},{lon})["highway"];
out geom;
"""
headers = {
    'Accept': 'application/json',
    'User-Agent': 'MyStreetViewScript/1.0'
}

response = requests.post(overpass_url, data=query, headers=headers)
print("Status:", response.status_code)
print("Response preview:", response.text[:500])  # debug

if response.status_code != 200:
    print("Error from Overpass")
    exit()
data = response.json()

print(f"Found {len(data.get('elements', []))} road segments near your point.")

# Preview
for i, el in enumerate(data.get('elements', [])[:8]):
    tags = el.get('tags', {})
    name = tags.get('name') or tags.get('name:en') or "Unnamed"
    htype = tags.get('highway', 'unknown')
    length = len(el.get('geometry', []))
    print(f"{i+1}. {name} ({htype}) - {length} points")