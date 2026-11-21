// Service worker: keeps the whole game shell available offline (required for
// WebAPK installability) while always preferring fresh code when online.

const CACHE = 'arcane-ascension-v5';

const SHELL = [
  './',
  './manifest.json',
  './css/style.css',
  './js/main.js',
  './js/game.js',
  './js/ui.js',
  './js/state.js',
  './js/save.js',
  './js/config.js',
  './js/util.js',
  './js/audio.js',
  './js/fx.js',
  './js/arena.js',
  './js/wizard.js',
  './js/enemies.js',
  './js/projectiles.js',
  './js/spells.js',
  './js/waves.js',
  './js/idle.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/maskable-512.png',
  './icons/apple-touch-icon.png',
  './icons/favicon-32.png',
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting())
      .catch((err) => {
        console.warn('Arcane Ascension: precache incomplete', err);
      })
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Network-first for navigation so a new build is picked up as soon as it is
// online; cache is the offline fallback.
function networkFirst(request, fallbackUrl) {
  return fetch(request)
    .then((res) => {
      if (res && res.ok) {
        const copy = res.clone();
        caches.open(CACHE).then((c) => c.put(fallbackUrl, copy)).catch(() => {});
      }
      return res;
    })
    .catch(() =>
      caches.match(fallbackUrl).then((hit) => hit || caches.match('./index.html'))
    );
}

// Stale-while-revalidate for static assets.
function cacheFirst(request) {
  return caches.match(request).then((hit) => {
    const network = fetch(request)
      .then((res) => {
        if (res && res.ok && res.type === 'basic') {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(request, copy)).catch(() => {});
        }
        return res;
      })
      .catch(() => hit);
    return hit || network;
  });
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return;

  if (req.mode === 'navigate') {
    event.respondWith(networkFirst(req, './index.html'));
    return;
  }

  event.respondWith(cacheFirst(req));
});
