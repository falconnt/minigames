// Service worker: maakt de app installeerbaar (PWA) en offline bruikbaar.
// Verhoog CACHE bij elke release zodat oude bestanden worden opgeruimd.

const CACHE = 'minigames-v8';

// Kern van de app-shell; relatieve paden werken zowel lokaal (/) als op
// GitHub Pages (/minigames/). Games worden runtime gecachet bij eerste gebruik.
const APP_SHELL = [
  './',
  './index.html',
  './css/style.css',
  './js/main.js',
  './js/registry.js',
  './js/storage.js',
  './js/theme.js',
  './js/cloud.js',
  './js/cloud-config.js',
  './js/cloud-key.js',
  './js/sync.js',
  './manifest.webmanifest',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-maskable-512.png',
];

self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE).then((c) => c.addAll(APP_SHELL)).then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Cache-first met netwerk-fallback; nieuwe bestanden worden bijgecachet.
// Bij een mislukte navigatie valt hij terug op de app-shell (index.html).
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;

  e.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req)
        .then((res) => {
          if (res && res.status === 200) {
            const copy = res.clone();
            caches.open(CACHE).then((c) => c.put(req, copy));
          }
          return res;
        })
        .catch(() => cached || (req.mode === 'navigate' ? caches.match('./index.html') : undefined));
      return cached || network;
    })
  );
});
