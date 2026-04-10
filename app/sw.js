/**
 * SignalTrace Service Worker v1
 * Provides offline support and installability (PWA).
 */

const CACHE_NAME = 'signaltrace-v2';

const ASSETS = [
  './',
  './index.html',
  './manifest.json',
  './styles.css',
  './app.js',
  './data.js',
  './photos.js',
  './signals.js',
  './voice.js',
  './screens/dashboard.js',
  './screens/person.js',
  './screens/log.js',
  './screens/profile.js',
  './screens/onboarding.js',
  './screens/settings.js',
];

// Install: pre-cache all app shell assets
self.addEventListener('install', function(e) {
  e.waitUntil(
    caches.open(CACHE_NAME).then(function(cache) {
      return cache.addAll(ASSETS);
    }).then(function() {
      return self.skipWaiting();
    })
  );
});

// Activate: clean up old caches
self.addEventListener('activate', function(e) {
  e.waitUntil(
    caches.keys().then(function(keys) {
      return Promise.all(
        keys
          .filter(function(k) { return k !== CACHE_NAME; })
          .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      return self.clients.claim();
    })
  );
});

// Fetch: cache-first for app shell, network-first for everything else
self.addEventListener('fetch', function(e) {
  if (e.request.method !== 'GET') return;

  // Skip cross-origin requests (Google Fonts etc) — let them go through normally
  const url = new URL(e.request.url);
  if (url.origin !== self.location.origin) return;

  // Network-first for navigation requests — prevents serving stale HTML shell forever
  if (e.request.mode === 'navigate' ||
      (e.request.method === 'GET' && e.request.headers.get('accept') &&
       e.request.headers.get('accept').includes('text/html'))) {
    e.respondWith(
      fetch(e.request).catch(function() {
        return caches.match(e.request) || caches.match('./index.html');
      })
    );
    return;
  }

  e.respondWith(
    caches.match(e.request).then(function(cached) {
      if (cached) return cached;

      return fetch(e.request).then(function(res) {
        // Only cache valid same-origin responses
        if (!res || res.status !== 200 || res.type !== 'basic') return res;
        const clone = res.clone();
        caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, clone);
        });
        return res;
      }).catch(function() {
        // Offline fallback: return cached index.html for navigation requests
        if (e.request.mode === 'navigate') {
          return caches.match('./index.html');
        }
      });
    })
  );
});
