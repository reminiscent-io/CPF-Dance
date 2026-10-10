// v2 purged v1, which cached every GET response: API data, pages and
// private photo downloads from Supabase storage. v3 survives a broken
// CacheStorage: caches.open/match can reject (UnknownError) when the
// browser's storage is corrupt or full, and that must never fail a page load.
const CACHE_NAME = 'dance-schedule-v3';
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
    }).catch(() => {})
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

// CacheStorage calls reject outright when the browser's storage is broken,
// so every lookup falls back to undefined instead of throwing.
function cacheMatch(request) {
  return caches.match(request).catch(() => undefined);
}

function cachePut(request, response) {
  return caches.open(CACHE_NAME)
    .then(cache => cache.put(request, response))
    .catch(() => {});
}

function offlineResponse() {
  return cacheMatch(OFFLINE_URL).then(response =>
    response || new Response('You are offline.', {
      status: 503,
      headers: { 'Content-Type': 'text/plain; charset=utf-8' }
    })
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
    event.respondWith(fetch(request).catch(offlineResponse));
    return;
  }

  if (!isStaticAsset(url)) {
    return;
  }

  event.respondWith(
    fetch(request)
      .then(response => {
        if (response && response.status === 200) {
          event.waitUntil(cachePut(request, response.clone()));
        }
        return response;
      })
      .catch(() =>
        cacheMatch(request).then(response => response || Response.error())
      )
  );
});
