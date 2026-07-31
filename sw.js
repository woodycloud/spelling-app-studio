const CACHE_NAME = 'spellquest-v3';
const PRECACHE_URLS = [
  './',
  './index.html',
  './manifest.json',
  './grammar-quiz-bank.js',
  './data/unit1_lesson1.csv',
  './data/school_unit1.csv'
];

// Install: precache key core assets safely
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('[SW] Precaching core application assets');
        return Promise.allSettled(
          PRECACHE_URLS.map(url => cache.add(url).catch(err => console.warn('[SW] Precache warning for', url, err)))
        );
      })
      .then(() => self.skipWaiting())
  );
});

// Activate: clean up legacy caches and immediately claim clients
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('[SW] Purging legacy cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    }).then(() => self.clients.claim())
  );
});

// Fetch: Intercept network requests with resilient caching strategies
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  // 1. Navigation / HTML Document -> Network-First strategy with Cache fallback
  if (req.mode === 'navigate' || url.pathname.endsWith('index.html') || url.pathname === '/') {
    event.respondWith(
      fetch(req)
        .then(networkRes => {
          if (networkRes && networkRes.status === 200) {
            const cacheCopy = networkRes.clone();
            caches.open(CACHE_NAME).then(cache => cache.put(req, cacheCopy));
          }
          return networkRes;
        })
        .catch(() => {
          return caches.match('./index.html') || caches.match('/') || caches.match(req);
        })
    );
    return;
  }

  // 2. Static Assets, Audio, CSVs & External Libraries -> Cache-First with Network fallback & dynamic caching
  event.respondWith(
    caches.match(req).then(cachedRes => {
      if (cachedRes) {
        // Asynchronously revalidate cache in background for same-origin resources
        if (url.origin === self.location.origin) {
          fetch(req).then(networkRes => {
            if (networkRes && networkRes.status === 200) {
              caches.open(CACHE_NAME).then(cache => cache.put(req, networkRes));
            }
          }).catch(() => {});
        }
        return cachedRes;
      }

      return fetch(req).then(networkRes => {
        if (networkRes && (networkRes.status === 200 || networkRes.type === 'opaque' || networkRes.type === 'cors' || networkRes.type === 'basic')) {
          const cacheCopy = networkRes.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, cacheCopy));
        }
        return networkRes;
      }).catch(err => {
        console.warn('[SW] Offline fetch fallback for:', req.url);
      });
    })
  );
});
