"""
Street View scraper — intercepts real Google Maps network traffic to get panoids.

Strategy:
  1. Sample points along the LineString.
  2. For each point open the Street View embed URL in Playwright.
  3. Intercept XHR/fetch responses — panoids appear in the
     'SingleImageSearch' or 'photo' API calls Google makes internally.
  4. Compute bearing toward building, download thumbnail.
"""

import asyncio
import re
import requests
from math import radians, sin, cos, atan2, degrees
from playwright.async_api import async_playwright

# ── config ────────────────────────────────────────────────────────────────────
BUILDING = (10.7771596, 106.7018338)      # (lat, lon) target building

LINESTRING = [                             # [lon, lat] pairs
    [106.7354139, 10.7591967],
    [106.7357826, 10.7589446],
]

SAMPLE_INTERVAL_M = 12
IMAGE_W, IMAGE_H  = 800, 600
PITCH             = -5
OUTPUT_PREFIX     = "pano"
PAGE_WAIT_MS      = 7000
HEADLESS          = True      # set False to watch the browser
# ─────────────────────────────────────────────────────────────────────────────


def sample_line(coords, interval_m=SAMPLE_INTERVAL_M):
    samples = []
    for i in range(len(coords) - 1):
        lon1, lat1 = coords[i]
        lon2, lat2 = coords[i + 1]
        dist = ((lon2 - lon1)**2 + (lat2 - lat1)**2)**0.5 * 111_320
        steps = max(1, int(dist / interval_m))
        for s in range(steps + 1):
            t = s / steps
            samples.append((lat1 + t*(lat2-lat1), lon1 + t*(lon2-lon1)))
    seen, out = set(), []
    for pt in samples:
        key = (round(pt[0], 7), round(pt[1], 7))
        if key not in seen:
            seen.add(key); out.append(pt)
    return out


def bearing(lat1, lon1, lat2, lon2):
    y = sin(radians(lon2-lon1)) * cos(radians(lat2))
    x = (cos(radians(lat1))*sin(radians(lat2))
         - sin(radians(lat1))*cos(radians(lat2))*cos(radians(lon2-lon1)))
    return (degrees(atan2(y, x)) + 360) % 360


# ── panoid extraction from raw bytes ─────────────────────────────────────────

PANOID_RE = [
    rb'"(AF1Qip[A-Za-z0-9_-]{30,})"',           # photosphere IDs
    rb'"panoId"\s*:\s*"([A-Za-z0-9_-]{20,})"',  # cbk JSON
    rb'!1s([A-Za-z0-9_-]{20,})!2e',             # protobuf inline
    rb'\["([A-Za-z0-9_-]{22})"',                # array-style
]

def extract_panoid_bytes(body: bytes):
    for pat in PANOID_RE:
        hits = re.findall(pat, body)
        af1 = [h for h in hits if h.startswith(b"AF1Qip")]
        if af1:
            return af1[0].decode()
        if hits:
            return hits[0].decode()
    return None

def extract_panoid_url(url: str):
    for pat in [r'panoid=([A-Za-z0-9_-]{20,})',
                r'!1s([A-Za-z0-9_-]{20,})!2e',
                r'1s(AF1Qip[A-Za-z0-9_-]{20,})']:
        m = re.search(pat, url)
        if m:
            return m.group(1)
    return None


# ── thumbnail ─────────────────────────────────────────────────────────────────

def download_thumbnail(panoid, yaw, index):
    url = (
        "https://streetviewpixels-pa.googleapis.com/v1/thumbnail"
        f"?cb_client=maps_sv.tactile&w={IMAGE_W}&h={IMAGE_H}"
        f"&panoid={panoid}&yaw={yaw:.1f}&pitch={PITCH}"
    )
    r = requests.get(url, timeout=15, headers={"User-Agent": "Mozilla/5.0"})
    if r.status_code != 200 or len(r.content) < 5_000:
        return None
    fname = f"{OUTPUT_PREFIX}_{index:02d}_{panoid[:8]}.jpg"
    with open(fname, "wb") as f:
        f.write(r.content)
    return fname


# ── main ──────────────────────────────────────────────────────────────────────

async def main():
    samples = sample_line(LINESTRING)
    print(f"Sampled {len(samples)} points\n")
    saved = skipped = 0

    async with async_playwright() as pw:
        browser = await pw.chromium.launch(headless=HEADLESS)
        context = await browser.new_context(
            viewport={"width": 1280, "height": 800},
            user_agent=(
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/124.0.0.0 Safari/537.36"
            ),
        )
        page = await context.new_page()

        for i, (lat, lon) in enumerate(samples, 1):
            print(f"{i:2d}. ({lat:.7f}, {lon:.7f})", end="  ", flush=True)

            intercepted: list[tuple[str, bytes]] = []

            async def on_response(resp, _intercepted=intercepted):
                u = resp.url
                if any(k in u for k in [
                    "SingleImageSearch", "cbk?", "photo?",
                    "streetview", "photometa", "GetMetadata",
                    "maps/api/js", "TileService",
                ]):
                    try:
                        b = await resp.body()
                        _intercepted.append((u, b))
                    except Exception:
                        pass

            page.on("response", on_response)

            # The embed ?api=1&map_action=pano URL reliably enters SV mode
            sv_url = (
                f"https://www.google.com/maps/@?api=1&map_action=pano"
                f"&viewpoint={lat},{lon}"
            )

            panoid = None
            try:
                await page.goto(sv_url, wait_until="domcontentloaded", timeout=30_000)
                await page.wait_for_timeout(PAGE_WAIT_MS)

                # 1) from final URL
                panoid = extract_panoid_url(page.url)

                # 2) scan XHR bodies
                if not panoid:
                    for (u, b) in intercepted:
                        panoid = extract_panoid_bytes(b)
                        if panoid:
                            break

                # 3) scan page HTML source
                if not panoid:
                    html = await page.content()
                    panoid = extract_panoid_bytes(html.encode())

            except Exception as e:
                print(f"✗ page error: {e}")
                skipped += 1
                page.remove_listener("response", on_response)
                continue

            page.remove_listener("response", on_response)

            if not panoid:
                print(f"✗ no panoid  ({len(intercepted)} XHRs, URL: {page.url[:80]})")
                skipped += 1
                continue

            yaw   = bearing(lat, lon, *BUILDING)
            fname = download_thumbnail(panoid, yaw, i)
            if fname:
                print(f"✓ {fname}  yaw={yaw:.1f}°")
                saved += 1
            else:
                print(f"✗ thumbnail failed  ({panoid[:12]}…)")
                skipped += 1

        await browser.close()

    print(f"\nDone — {saved} saved, {skipped} skipped.")


asyncio.run(main())
