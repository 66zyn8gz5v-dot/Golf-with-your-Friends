/* Service Worker: macht Fantasy Golf offline spielbar.
   Netz zuerst (damit Updates sofort ankommen), Cache als Ersatz ohne Verbindung. */
importScripts('./src/version.js');
/* Spiel und Vorschau liegen auf derselben Adresse und teilen sich den Cache-Speicher. Darum hat
   jede Ausgabe ihren eigenen Namen – und räumt beim Aktivieren nur ihre eigenen alten Stände weg,
   nicht die der anderen. Der Vorsatz „fantasygolf-v" von früher wird beim Spiel mit aufgeräumt. */
const MARKE = 'fg-' + APP_MARKE + '-v';
const VERSION = MARKE + APP_VERSION;
const meiner = k => k.startsWith(MARKE) || (!VORSCHAU && k.startsWith('fantasygolf-v'));
const APP_FILES = [
  './', './index.html', './style.css', './manifest.webmanifest',
  './src/version.js', './src/text.js', './src/themes.js', './src/courses.js', './src/courses_sea.js', './src/courses_jungle.js', './src/courses_storm.js', './src/courses_shadow.js', './src/courses_pro.js', './src/level.js', './src/obstacles.js', './src/obstacles_legend.js',
  './src/physics.js', './src/render.js', './src/render_legend.js', './src/icons.js', './src/hats.js', './src/net.js', './src/best.js', './src/sfx.js', './src/music.js', './src/worldmap.js', './src/title.js', './src/editor.js', './src/main.js',
  './icons/icon-192.png', './icons/icon-512.png', './icons/apple-touch-icon.png',
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(VERSION).then(c => c.addAll(APP_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== VERSION && meiner(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const isFont = url.hostname === 'fonts.googleapis.com' || url.hostname === 'fonts.gstatic.com';
  if (url.origin !== location.origin && !isFont) return;
  // Beim Server nachfragen statt den HTTP-Zwischenspeicher zu nehmen – sonst hält der Browser
  // eine alte Datei noch Minuten fest, obwohl längst eine neue Fassung da ist
  const frisch = req.mode === 'navigate' ? req : new Request(req, { cache: 'no-cache' });
  e.respondWith(
    fetch(frisch).then(res => {
      if (res && res.ok) { const copy = res.clone(); caches.open(VERSION).then(c => c.put(req, copy)); }
      return res;
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => hit || (req.mode === 'navigate' ? caches.match('./index.html') : undefined)))
  );
});
