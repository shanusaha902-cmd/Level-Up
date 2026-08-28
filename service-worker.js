// service-worker.js
// Caches the application shell so LEVEL UP works fully offline after
// first load. All app data lives in IndexedDB (not touched here), so
// core functionality never depends on a network request.
//
// Paths are relative and resolved against the service worker's own
// location, so this works correctly whether the app is hosted at a
// domain root or in a GitHub Pages subpath (e.g. /level-up/).

const CACHE_NAME = 'level-up-v2';

const SHELL_PATHS = [
  './',
  './index.html',
  './manifest.json',
  './css/style.css',
  './js/date-utils.js',
  './js/db.js',
  './js/habits.js',
  './js/tasks.js',
  './js/completions.js',
  './js/xp.js',
  './js/streaks.js',
  './js/render.js',
  './js/habit-form.js',
  './js/backup.js',
  './js/main.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME);
      const urls = SHELL_PATHS.map((p) => new URL(p, self.location).href);
      await cache.addAll(urls);
      // Activate this version immediately rather than waiting for old
      // tabs to close, so users get the new shell on next reload.
      self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys();
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      );
      await self.clients.claim();
    })()
  );
});

self.addEventListener('fetch', (event) => {
  // Only handle GET requests for our own origin; let everything else
  // (if it ever occurs) pass through to the network normally.
  if (event.request.method !== 'GET') return;

  event.respondWith(
    (async () => {
      const cached = await caches.match(event.request, { ignoreSearch: true });
      if (cached) return cached;

      try {
        const networkResponse = await fetch(event.request);
        // Opportunistically cache newly-seen same-origin shell assets.
        if (
          networkResponse &&
          networkResponse.ok &&
          new URL(event.request.url).origin === self.location.origin
        ) {
          const cache = await caches.open(CACHE_NAME);
          cache.put(event.request, networkResponse.clone());
        }
        return networkResponse;
      } catch (err) {
        // Offline and not cached (e.g. first-ever visit had no network).
        // For navigations, fall back to the cached shell page.
        if (event.request.mode === 'navigate') {
          const shell = await caches.match(new URL('./index.html', self.location).href);
          if (shell) return shell;
        }
        throw err;
      }
    })()
  );
});
