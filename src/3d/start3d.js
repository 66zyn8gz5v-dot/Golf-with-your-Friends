/* Der Anlasser von Fantasy Golf 3D.

   Diese Datei gibt es nur, weil die Sicherheitsregeln der Seite kein Skript im HTML zulassen
   (script-src 'self'). Sie tut vier Dinge und sonst nichts:

   1. die 3D-Welt starten – ohne Rückweg, denn hier ist sie die ganze Anwendung und nicht ein
      Zimmer im Haus nebenan;
   2. das Ladebild wegnehmen, sobald wirklich etwas zu sehen ist;
   3. die Zierschrift nachladen;
   4. den Service Worker anmelden, damit das Spiel auch ohne Netz läuft.

   Der Service Worker liegt zwei Verzeichnisse höher und gilt damit für das ganze Haus – für das
   2,5D-Spiel und für diese Seite zusammen. Das ist Absicht: Es ist ein Speicher, eine Fassung,
   ein Aufräumen. Getrennt sind die beiden Spiele dort, wo es zählt – im Browser-Speicher und in
   ihren Rekorden. */
(() => {
  const LADE_MIN = 900;          // so lange bleibt das Ladebild mindestens stehen
  const gestartet = Date.now();

  function ladebildWeg() {
    const el = document.getElementById('lade3d');
    if (!el) return;
    /* Erst warten, bis die Zierschrift da ist (oder eine Sekunde vergangen) – sonst springt die
       Überschrift der Weltkarte sichtbar um, kaum dass das Ladebild weg ist. */
    const schrift = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([schrift, new Promise(r => setTimeout(r, 1000))]).then(() => {
      setTimeout(() => {
        el.classList.add('weg');
        setTimeout(() => el.remove(), 600);
      }, Math.max(0, LADE_MIN - (Date.now() - gestartet)));
    });
  }

  function zierschrift() {
    /* Als Blatt für den Drucker eingehängt: Ein solches hält den ersten Bildaufbau nicht auf.
       Sobald es geladen ist, wird es auf „für alles" umgestellt. */
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.media = 'print';
    l.addEventListener('load', () => { l.media = 'all'; });
    l.href = 'https://fonts.googleapis.com/css2?family=MedievalSharp&display=swap';
    document.head.appendChild(l);
  }

  function offline() {
    if (!('serviceWorker' in navigator)) return;
    if (location.protocol !== 'https:' && location.hostname !== 'localhost') return;
    navigator.serviceWorker.register('../../sw.js')
      .catch(() => { /* ohne Service Worker läuft das Spiel trotzdem, nur nicht offline */ });
  }

  function los() {
    zierschrift();
    offline();
    /* Ohne Rückruf: Von hier führt kein Weg zurück, weil es kein Davor gibt. Der Knopf oben links
       bleibt darum auf der Weltkarte verborgen und erscheint erst auf einer Bahn. */
    Golf3D.starten();
    if (Golf3D.fehler()) {
      /* Kein WebGL. Die Erklärung steht schon auf dem Schirm – dann soll wenigstens das Ladebild
         nicht darüber hängen bleiben. */
      const el = document.getElementById('lade3d');
      if (el) el.remove();
      return;
    }
    /* Zwei Bilder abwarten: Das erste baut die Welt auf, das zweite zeigt sie. Erst danach darf
       das Ladebild weichen, sonst blitzt für einen Augenblick eine leere Fläche auf. */
    requestAnimationFrame(() => requestAnimationFrame(ladebildWeg));
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', los);
  else los();
})();
