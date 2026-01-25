// Використовуємо відносні шляхи для GitHub Pages
const BASE = self.location.pathname.replace(/\/[^/]*$/, '/') || './';
const CACHE = "schedule-v1";

const ASSETS = [
  './',
  './index.html',
  './404.html',
  './styles/styles.css',
  './js/app.js',
  './data/schedule.js',
  './manifest.json',
  './icons/192.png',
  './icons/512.png'
];

self.addEventListener("install", (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener("activate", (e) => {
  e.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", (e) => {
  e.respondWith(
    fetch(e.request).catch(async () => {
      // для навігації — повертаємо index.html
      if (e.request.mode === "navigate") {
        const cached = await caches.match('./index.html');
        if (cached) return cached;
        return caches.match('index.html');
      }
      // для ресурсів — пробуємо з кешу
      const url = new URL(e.request.url);
      const cached = await caches.match(url.pathname);
      if (cached) return cached;
      // Спробуємо з відносним шляхом
      return caches.match(url.pathname.replace(/^.*\//, './'));
    })
  );
});
