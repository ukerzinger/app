const CACHE_NAME = 'journey-of-money-v12-pwa-2';
const APP_SHELL = [
  "./",
  "./index.html",
  "./freedom.html",
  "./manifest.webmanifest",
  "./icons/icon-96.png",
  "./icons/icon-192.png",
  "./icons/icon-512.png",
  "./icons/icon-maskable-512.png",
  "./icons/apple-touch-icon.png",
  "./chapter_images/basics.png",
  "./chapter_images/consumption.png",
  "./chapter_images/credit.png",
  "./chapter_images/danger.png",
  "./chapter_images/firstlife.png",
  "./chapter_images/freedom.png",
  "./chapter_images/invest.png",
  "./chapter_images/protect.png"
];

self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL))
  );
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys => Promise.all(
      keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    // Chapter images: network first so newly uploaded artwork appears immediately.
    if (url.pathname.includes('/chapter_images/')) {
      event.respondWith(
        fetch(req).then(response => {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
          return response;
        }).catch(() => caches.match(req))
      );
      return;
    }

    // Other same-origin app assets: cache first, then network.
    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return response;
      }).catch(() => caches.match('./index.html')))
    );
    return;
  }

  // External links remain network-first.
  event.respondWith(fetch(req).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;padding:28px"><h2>Gerade offline</h2><p>Dieser externe Link braucht eine Internetverbindung.</p></body>',
    {headers:{'Content-Type':'text/html; charset=utf-8'}}
  )));
});
