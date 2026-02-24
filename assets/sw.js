const CACHE_NAME = "criollotv-v1";
const STATIC_ASSETS = [
  "/",
  "/manifest.json"
];

// Instalación: cachear assets estáticos
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS);
    })
  );
  self.skipWaiting();
});

// Activación: limpiar caches viejos
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    })
  );
  self.clients.claim();
});

// Fetch: network-first, fallback a cache
self.addEventListener("fetch", (event) => {
  // No interceptar streams ni requests a YouTube
  const url = new URL(event.request.url);
  if (
    url.hostname.includes("youtube") ||
    url.hostname.includes("googlevideo") ||
    event.request.url.includes(".m3u8") ||
    event.request.url.includes(".ts")
  ) {
    return;
  }

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cachear respuestas exitosas de assets estáticos
        if (
          response.ok &&
          event.request.method === "GET" &&
          (event.request.url.includes(".png") ||
            event.request.url.includes(".webp") ||
            event.request.url.includes(".ico"))
        ) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, responseClone);
          });
        }
        return response;
      })
      .catch(() => {
        return caches.match(event.request);
      })
  );
});
