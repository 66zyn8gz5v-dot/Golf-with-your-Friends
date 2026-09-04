/* Service Worker: macht Fantasy Golf offline spielbar.
   Netz zuerst (damit Updates sofort ankommen), Cache als Ersatz ohne Verbindung. */
const VERSION = 'fantasygolf-v1';
const APP_FILES = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './src/themes.js', './src/courses.js', './src/courses_pro.js', './src/level.js', './src/obstacles.js',
  './src/physics.js', './src/render.js', './src/sfx.js', './src/title.js', './src/editor.js', './src/main.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;
  e.respondWith(
    fetch(req).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
