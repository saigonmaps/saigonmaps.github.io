const CACHE_VERSION = "v2";
const CACHE_NAME = `saigon-static-${CACHE_VERSION}`;
const TILE_CACHE_NAME = `saigon-tiles-${CACHE_VERSION}`;

// Tiles refresh once per browser session (on reload/close-reopen)
// Set to null to use session-based, or milliseconds for time-based (e.g., 24*60*60*1000 for 24h)
const TILE_MAX_AGE_MS = null;

const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/favicon.ico",
  "/shared.js",
  "/shared.css",
  "/style.css",
  "/app.js",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.css",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.js",
];

const TILE_HOSTNAMES = [
  "api.maptiler.com",
  "r2.dev",
  "arcgisonline.com",
];

// --- 1. Install: Pre-cache static assets ---
self.addEventListener("install", (event) => {
  console.log(`[SW] Installing ${CACHE_VERSION}...`);
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(STATIC_ASSETS))
  );
  self.skipWaiting();
});

// --- 2. Activate: Clean old caches ---
self.addEventListener("activate", (event) => {
  console.log(`[SW] Activating ${CACHE_VERSION}...`);
  const currentCaches = [CACHE_NAME, TILE_CACHE_NAME];

  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names.map((name) => {
          if (!currentCaches.includes(name)) {
            console.log(`[SW] Deleting old cache: ${name}`);
            return caches.delete(name);
          }
        })
      )
    ).then(() => self.clients.claim())
  );
});

// --- 3. Fetch: Smart caching strategies ---
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  if (request.method !== "GET") return;
  if (url.pathname.startsWith("/villas/")) return;

  // Strategy A: Static assets - Cache-first
  if (
    STATIC_ASSETS.some((u) => url.pathname === u || url.pathname === "/") ||
    url.href.includes("unpkg.com")
  ) {
    event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
    return;
  }

  // Strategy B: Map tiles - Cache-first, refresh only when CACHE_VERSION bumps
  if (TILE_HOSTNAMES.some((h) => url.hostname.includes(h))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) return cached;
        return fetch(request, { cache: "no-cache" }).then((response) => {
          if (response.ok) {
            caches.open(TILE_CACHE_NAME).then((cache) => cache.put(request, response.clone()));
          }
          return response;
        });
      })
    );
    return;
  }

  // Strategy C: Everything else - Network-first
  event.respondWith(fetch(request));
});
