const CACHE_NAME = "saigon-main-map-cache-v3";
const urlsToCache = [
  "/",
  "/index.html",
  "/style.css",
  "/shared.css",
  "/app.js",
  "/shared.js",
  "/favicon.ico",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.css",
  "https://unpkg.com/maplibre-gl@^5.9.0/dist/maplibre-gl.js",
];

self.addEventListener("install", (event) => {
  console.log("Main Service Worker: Installing assets...");
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(urlsToCache).catch((error) => {
        console.error("Failed to pre-cache some assets:", error);
      });
    }),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  console.log("Main Service Worker: Activating and cleaning old caches...");
  const cacheWhitelist = [CACHE_NAME];

  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheWhitelist.indexOf(cacheName) === -1) {
            console.log(`Main Service Worker: Deleting old cache ${cacheName}`);
            return caches.delete(cacheName);
          }
        }),
      );
    }),
  );
  return self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  const requestUrl = new URL(event.request.url);

  if (
    requestUrl.hostname === "pub-866936cf194140d79d9f7a415b98d490.r2.dev" &&
    requestUrl.pathname.startsWith("/tiles/")
  ) {
    event.respondWith(
      caches.match(event.request).then((cachedResponse) => {
        if (cachedResponse) {
          return cachedResponse;
        }
        return fetch(event.request).then((networkResponse) => {
          if (networkResponse.ok) {
            const responseToCache = networkResponse.clone();
            caches.open(CACHE_NAME).then((cache) => {
              cache.put(event.request, responseToCache);
            });
          }
          return networkResponse;
        });
      }),
    );
    return;
  }

  event.respondWith(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.match(event.request).then((cachedResponse) => {
        const fetchPromise = fetch(event.request)
          .then((networkResponse) => {
            if (networkResponse.ok) {
              cache.put(event.request, networkResponse.clone());
            }
            return networkResponse;
          })
          .catch(() => cachedResponse);

        return cachedResponse || fetchPromise;
      });
    }),
  );
});
