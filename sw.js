const CACHE = 'epubfinder-v2';
const FILES = [
  './',
  './index.html',
  './config.js',
  './books.json',
  './manifest.webmanifest',
  './icon-192.png',
  './icon-512.png',
  './icon-maskable-512.png'
];

self.addEventListener('install', e => {
  e.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    await Promise.all(FILES.map(async f => {
      try { await cache.add(new Request(f, { cache: 'reload' })); } catch (err) {}
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', e => {
  e.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)));
    await self.clients.claim();
  })());
});

// Pages and the book list: try the network first so new books show up,
// and fall back to the saved copy when offline. Everything else: saved copy first.
self.addEventListener('fetch', e => {
  const req = e.request;
  const url = new URL(req.url);
  if (req.method !== 'GET' || url.origin !== self.location.origin) return;
  if (url.pathname.includes('/books/')) return; // EPUB files go straight to the network
  const fresh = req.mode === 'navigate' || url.pathname.endsWith('/books.json');
  e.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const hit = await cache.match(req, { ignoreSearch: true });
    const net = () => fetch(req).then(res => { if (res && res.ok) cache.put(req, res.clone()); return res; });
    if (fresh) {
      try { return await net(); } catch (err) {}
      return hit || (await cache.match('./index.html')) || Response.error();
    }
    if (hit) { e.waitUntil(net().catch(() => {})); return hit; }
    try { return await net(); } catch (err) { return Response.error(); }
  })());
});
