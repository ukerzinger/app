const CACHE_NAME = 'journey-of-money-v12-pwa-4';
const APP_SHELL = [
  "./",
  "./index.html",
  "./freedom.html",
  "./manifest.webmanifest",
  "./readability.css",
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

function withReadability(response){
  if (!response) return response;
  return response.text().then(html => {
    if (!html.includes('readability.css')) {
      html = html.replace('</head>', '<link rel="stylesheet" href="./readability.css?v=4"></head>');
    }
    const headers = new Headers(response.headers);
    headers.delete('content-length');
    headers.set('content-type','text/html; charset=utf-8');
    return new Response(html, {
      status: response.status,
      statusText: response.statusText,
      headers
    });
  });
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;

  const url = new URL(req.url);

  if (url.origin === self.location.origin) {
    const scopeRoot = new URL('./', self.registration.scope).pathname;
    const indexPath = new URL('./index.html', self.registration.scope).pathname;

    // Main app document: network-first and inject the readability stylesheet.
    if (req.mode === 'navigate' && (url.pathname === scopeRoot || url.pathname === indexPath)) {
      event.respondWith(
        fetch(req)
          .then(response => {
            const copy = response.clone();
            caches.open(CACHE_NAME).then(cache => cache.put('./index.html', copy));
            return withReadability(response);
          })
          .catch(() => caches.match('./index.html').then(withReadability))
      );
      return;
    }

    // Chapter artwork should refresh immediately when replaced.
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

    event.respondWith(
      caches.match(req).then(cached => cached || fetch(req).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(req, copy));
        return response;
      }).catch(() => caches.match('./index.html').then(withReadability)))
    );
    return;
  }

  event.respondWith(fetch(req).catch(() => new Response(
    '<!doctype html><meta charset="utf-8"><title>Offline</title><body style="font-family:system-ui;padding:28px"><h2>Gerade offline</h2><p>Dieser externe Link braucht eine Internetverbindung.</p></body>',
    {headers:{'Content-Type':'text/html; charset=utf-8'}}
  )));
});
