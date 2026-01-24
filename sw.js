const BASE = "/schedule/"; // <- твій repo
const CACHE = "schedule-v1";

const ASSETS = [
  `${BASE}`,
  `${BASE}index.html`,
  `${BASE}404.html`,
  `${BASE}styles/styles.css`,
  `${BASE}js/app.js`,
  `${BASE}data/schedule.js`,
  `${BASE}manifest.webmanifest`
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
        return caches.match(`${BASE}index.html`);
      }
      // для ресурсів — пробуємо з кешу
      return caches.match(new URL(e.request.url).pathname);
    })
  );
});
