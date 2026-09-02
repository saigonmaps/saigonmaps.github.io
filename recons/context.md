🧠 MASTER BRIEF — Street View → Building (C) Multi-View System
🎯 Goal

Given:

A, B = Street View panoramas (from URLs)
C = a building (GeoJSON point or polygon)

👉 Build a system that:

Finds ALL Street View panoramas around C
Filters panoramas that are actually looking at C
Generates aligned Street View URLs pointing toward C
Produces a dataset of multi-view images of the same building
📍 Your concrete example: A and B are both point towards Notre Dame Cathedral of Saigon
in the same street next to it:
A (from URL 1: https://www.google.com/maps/@10.7794264,106.6990008,3a,75y,349.91h,99.58t/data=!3m7!1e1!3m5!1s8ZyWVZhOoPX46Sh1LrIvyA!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D-9.584299302765217%26panoid%3D8ZyWVZhOoPX46Sh1LrIvyA%26yaw%3D349.9143215266798!7i16384!8i8192?entry=ttu&g_ep=EgoyMDI2MDQyOC4wIKXMDSoASAFQAw%3D%3D)
Lat/Lng: 10.7794264, 106.6990008
Heading: ~9.8° (north)
Observation: not pointing exactly at C (church), slightly off
B (from URL 2: https://www.google.com/maps/@10.7796698,106.698721,3a,75y,56.6h,105.16t/data=!3m7!1e1!3m5!1skXDjKy8Fm31wibq50wW8EA!2e0!6shttps:%2F%2Fstreetviewpixels-pa.googleapis.com%2Fv1%2Fthumbnail%3Fcb_client%3Dmaps_sv.tactile%26w%3D900%26h%3D600%26pitch%3D-15.157713120061132%26panoid%3DkXDjKy8Fm31wibq50wW8EA%26yaw%3D56.597767478086276!7i16384!8i8192?entry=ttu&g_ep=EgoyMDI2MDQyOC4wIKXMDSoASAFQAw%3D%3D)
Lat/Lng: 10.7799362, 106.6984456
Heading: ~70.2° (ENE)
Relationship:
A → B ≈ 80m
B is northwest of A
C (target building)
Either:
Point (centroid)
OR Polygon (building footprint — preferred)

Example:

{
"type": "Polygon",
"coordinates": [...]
}
🧱 What you already discovered (core primitives)

You’ve basically reverse-engineered:

From Street View URL:
panoId
lat/lng
heading (yaw)
pitch
FOV
image API endpoint

👉 This gives you a camera pose approximation.

🔥 Core idea (your system)

Treat each Street View pano as a camera in space, and C as a 3D object, then find all cameras whose viewing direction intersects C.

🧭 SYSTEM PIPELINE
STEP 1 — Get candidate panoramas near C
✅ CLEAN WAY (recommended)

Use Street View metadata API:

https://maps.googleapis.com/maps/api/streetview/metadata?location=C&radius=R
Start at C
radius: 50–300m

Then:

Expand using pano neighbors (graph traversal)
🔥 ADVANCED WAY (what you're hinting at)

Start from known pano (A or B):

A → fetch pano metadata → get linked panoIds → BFS crawl

Loop:

queue = [A]
while queue not empty:
pano = pop()
neighbors = fetch(pano)
keep if near C

👉 This reconstructs the Street View graph locally

STEP 2 — Compute geometry relative to C

For each pano P:

2.1 Distance
If C is point:
d(P,C)
If polygon:
d = min distance to building edges
2.2 Bearing
bearing_PC = direction from P → C
2.3 Compare with camera heading
Δθ = |heading_P - bearing_PC|
✅ Filter rule
d < 100m
AND
Δθ < 30°–45°

👉 This removes:

cameras behind building
cameras facing wrong direction
STEP 3 — (ADVANCED) Ray ↔ Polygon intersection

Instead of centroid approximation:

Ray(P, heading_P) ∩ Polygon(C)

If intersects:
👉 camera is truly looking at building

This is the most accurate test

STEP 4 — Generate aligned Street View URLs

For each valid pano:

heading = bearing(P → C)
pitch ≈ small negative (look slightly up/down)

Construct:

https://www.google.com/maps/@LAT,LNG,3a,90y,HEADINGh,PITCHt/data=!3m7!1e1!3m5!1sPANOID...

👉 Now every image is:

centered on C
comparable across views
🧠 WHAT THIS GIVES YOU

A structured dataset:

[
{
"panoId": "...",
"lat": ...,
"lng": ...,
"distance_to_C": ...,
"bearing_to_C": ...,
"aligned_heading": ...,
"url": "..."
}
]
🎯 WHAT YOU CAN DO NEXT
✅ 1. Multi-view overlap (your original goal)
Same building
Different angles
Same alignment target

👉 Enables:

feature matching
image stitching
NeRF / Gaussian splatting
✅ 2. Visibility scoring

Rank panoramas by:

score =
close distance +
small angle difference +
intersection confidence
✅ 3. Facade detection

Using bearings:

north-facing facade
west-facing facade
✅ 4. Camera graph

Nodes:

panorama

Edges:

neighbor pano / spatial distance

👉 You reconstruct the street topology

⚠️ LIMITATIONS (be realistic)
Not all panos face the building even if close
Occlusion (trees, trucks, etc.)
Heading may not be perfect
API limits / scraping constraints
⚡ CLEAN vs ADVANCED SUMMARY
Part CLEAN WAY ADVANCED WAY
Get panos API metadata Graph crawl (panoId BFS)
Geometry centroid + bearing ray ↔ polygon
Accuracy medium high
Complexity low high
Control limited full
🧩 FINAL MENTAL MODEL

You are building:

Street View = camera network
Building C = spatial target
Your system = query + filter + align

👉 In CV terms:

Cameras = known poses (approx)
Object = known geometry
Goal = multi-view consistency
