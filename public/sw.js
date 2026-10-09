// v2 purges v1, which cached every GET response: API data, pages and
// private photo downloads from Supabase storage.
const CACHE_NAME = 'dance-schedule-v2';
const OFFLINE_URL = '/offline.html';

// Install event
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.add(OFFLINE_URL))
      .catch(() => {
        // Cache open failed, continue without caching
      })
  );
  self.skipWaiting();
});

// Activate event
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// Only public static files belong in the cache. Pages, /api responses and
// anything from another origin (Supabase, Stripe) pass straight through.
function isStaticAsset(url) {
  return (
    url.pathname.startsWith('/_next/static/') ||
    url.pathname.startsWith('/fonts/') ||
    url.pathname.startsWith('/images/') ||
    /^\/(icon-[\w-]+\.png|favicon\.ico|manifest\.json)$/.test(url.pathname)
  );
}

// Fetch event - Network first, fall back to cache
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') {
    return;
  }

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === 'navigate') {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match(OFFLINE_URL).then(response => response || Response.error())
      )
    );
    return;
  }

  if (!isStaticAsset(url)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          const responseClone = response.clone();
          caches.open(CACHE_NAME).then(cache => {
            cache.put(request, responseClone);
          });
        }
        return response;
      })
      .catch(() =>
        caches.match(request).then(response => response || Response.error())
      )
  );
});
