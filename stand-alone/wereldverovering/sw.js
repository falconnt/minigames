// Service worker voor Wereldverovering (stand-alone app, eigen scope).
// Verhoog CACHE_VERSION met de hand bij elke inhoudelijke wijziging.
const CACHE_VERSION = 'v2';
const CACHE = 'wereldverovering-' + CACHE_VERSION;

const APP_SHELL = [
  './',
  './index.html',
  './css/base.css',
  './css/hud.css',
  './css/panel.css',
  './css/screens.css',
  './js/main.js',
  './js/constants.js',
  './js/world-data.js',
  './js/geo.js',
  './js/state.js',
  './js/setup.js',
  './js/combat.js',
  './js/view.js',
  './js/render.js',
  './js/input.js',
  './js/ui.js',
  './js/pwa.js',
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
