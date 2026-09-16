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
  './src/version.js', './src/text.js', './src/themes.js', './src/courses.js', './src/courses_sea.js', './src/courses_jungle.js', './src/courses_storm.js', './src/courses_shadow.js', './src/courses_colosseum.js', './src/courses_clock.js', './src/courses_snow.js', './src/courses_mine.js', './src/courses_boule.js', './src/courses_pro.js', './src/level.js', './src/obstacles.js', './src/obstacles_legend.js', './src/obstacles_snow.js', './src/obstacles_mine.js',
  './src/physics.js', './src/render.js', './src/render_legend.js', './src/render_snow.js', './src/render_mine.js', './src/icons.js', './src/hats.js', './src/net.js', './src/best.js', './src/turnier.js', './src/share.js', './src/sfx.js', './src/music.js', './src/worldmap.js', './src/title.js', './src/editor.js', './src/main.js',
  /* Fantasy Golf 3D ist eine eigene Seite unter ./src/3d/ mit eigenem Stilblatt und eigenem
     Manifest. Sie teilt sich mit dem 2,5D-Spiel diesen Speicher – eine Fassung, ein Aufräumen. */
  './src/3d/', './src/3d/index.html', './src/3d/stil3d.css', './src/3d/manifest3d.webmanifest', './src/3d/start3d.js',
  './src/3d/mathe3d.js', './src/3d/gl3d.js', './src/3d/bauen3d.js', './src/3d/deko3d.js', './src/3d/bahnen3d.js',
  './src/3d/welt3d.js', './src/3d/physik3d.js', './src/3d/karte3d.js', './src/3d/spiel3d.js',
  './src/3d/gras.jpg',
  './icons/icon-192.png', './icons/apple-touch-icon.png',
  /* icon-512 und icon-maskable-512 fehlen hier mit Absicht: Seit sie das gemalte Wappen
     tragen, wiegt jedes gut 700 kB, und gebraucht werden sie nur beim Einrichten auf dem
     Startbildschirm – nicht beim Spielen. Der fetch-Griff unten legt jede geholte Datei
     ohnehin ab, sie liegen also nach dem ersten Gebrauch im Speicher. */
  './icons/titelbild.jpg', './icons/titelbild-hoch.jpg', './icons/weltkarte.svg',
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
    }).catch(() => caches.match(req, { ignoreSearch: true }).then(hit => {
      if (hit || req.mode !== 'navigate') return hit;
      /* Ohne Netz und ohne passenden Eintrag: die Startseite derjenigen Anwendung ausliefern, zu
         der die Adresse gehört. Früher stand hier immer './index.html' – wer offline die 3D-Seite
         öffnete, landete damit im 2,5D-Spiel. */
      return caches.match(url.pathname.includes('/src/3d/') ? './src/3d/index.html' : './index.html');
    }))
  );
});
