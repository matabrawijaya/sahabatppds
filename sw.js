// Naikkan versi ini setiap kali file portal diubah.
const CACHE = 'portal-v11';
const ASET = [
  './', './index.html', './style.css', './app.js', './iklan.js', './pemandangan.js', './config.js', './manifest.webmanifest',
  './pasang-iklan.html', './pasang-iklan.js',
  './icon-192.png', './icon-512.png', './favicon-48.png'
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASET)).then(() => self.skipWaiting()));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys()
      .then((k) => Promise.all(k.filter((x) => x !== CACHE).map((x) => caches.delete(x))))
      .then(() => self.clients.claim())
  );
});

// Hanya file portal sendiri (GET, asal yang sama). Permintaan ke Hub dan aplikasi tidak disentuh.
// Ambil dari internet dulu supaya selalu terbaru; pakai salinan bila offline.
self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== self.location.origin) return;
  e.respondWith(
    fetch(req)
      .then((res) => {
        if (res.ok) { const salin = res.clone(); caches.open(CACHE).then((c) => c.put(req, salin)); }
        return res;
      })
      .catch(() => caches.match(req, { ignoreSearch: true }).then((r) => r || caches.match('./index.html')))
  );
});
