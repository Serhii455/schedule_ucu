const CACHE_NAME = 'uku-schedule-v1';
const ASSETS = [
  '/',
  '/index.html',
  '/styles/styles.css',
  '/js/app.js',
  '/data/schedule.js'
];

// Встановлення та кешування ресурсів
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS))
  );
});

// Робота в офлайні
self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((response) => response || fetch(e.request))
  );
});