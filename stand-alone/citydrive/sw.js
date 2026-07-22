// Service worker voor City Drive (stand-alone app, eigen scope).
// Maakt de game installeerbaar (PWA) en offline speelbaar.
//
// Deze map valt buiten de deploy-versiestempel van de Minigames-app, dus
// verhoog CACHE_VERSION met de hand bij elke inhoudelijke wijziging zodat
// oude bestanden worden opgeruimd en updates gegarandeerd doorkomen.
const CACHE_VERSION = 'v16';
const CACHE = 'citydrive-' + CACHE_VERSION;

// App-shell: alles wat nodig is om offline te spelen. Relatieve paden, dus
// werkt zowel lokaal als op GitHub Pages onder /stand-alone/citydrive/.
const APP_SHELL = [
  './',
  './index.html',
  './css/base.css',
  './css/hud.css',
  './css/map.css',
  './css/garage.css',
  './js/main.js',
  './js/constants.js',
  './js/cars.js',
  './js/state.js',
  './js/world.js',
  './js/draw-car.js',
  './js/fx.js',
  './js/input.js',
  './js/audio.js',
  './js/economy.js',
  './js/daynight.js',
  './js/boost.js',
  './js/combo.js',
  './js/physics.js',
  './js/render.js',
  './js/particles.js',
  './js/citymap.js',
  './js/garage.js',
  './js/map.js',
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
