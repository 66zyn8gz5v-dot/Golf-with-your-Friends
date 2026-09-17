/* Prüft das Netzspiel mit zwei echten Browsern – gegen den eigenen Vermittler.
 *
 *   node tools/online.mjs
 *
 * WARUM MIT BROWSERN UND NICHT MIT NACHRICHTEN
 * Der Netzteil ist keine Rechnung, die man nachrechnen kann; er ist ein Ablauf zwischen zwei
 * Geräten – anmelden, warten, starten, verlieren, wiederkommen. Einzelne Nachrichten zu prüfen
 * hieße, die Prüfung genau so zu schreiben, wie der Code gerade ist; sie würde jeden Umbau
 * überleben und nie etwas finden. Darum laufen hier zwei richtige Browserfenster gegen einen
 * richtigen Vermittler, und geprüft wird, was auf dem Bildschirm steht.
 *
 * Vermittler und Webserver startet diese Datei selbst (tools/vermittler.mjs), es braucht also
 * weder Internet noch Handarbeit. Fehlt Playwright, sagt sie das und endet ohne Fehler: Auf einem
 * Rechner ohne Browser ist „nicht geprüft" die ehrliche Antwort, nicht „bestanden".
 *
 * DER FALL, UM DEN ES GEHT
 * Fynns Handy sperrt sich mitten in der Runde, die Seite lädt neu, er tippt den Code wieder ein.
 * Bis Fassung 163 war er dann ein Fremder – der MQTT-Name wird bei jedem Seitenaufruf neu
 * gewürfelt – und bekam „Die Runde läuft schon". Seit Fassung 164 trägt der Sitz eine eigene
 * Kennung, die im Browser liegenbleibt; daran erkennt der Gastgeber ihn wieder.
 */
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

let chromium = null;
try { ({ chromium } = await import('/opt/node22/lib/node_modules/playwright/index.mjs')); }
catch (e) { try { ({ chromium } = await import('playwright')); } catch (e2) { /* nicht da */ } }
if (!chromium) {
  console.log('Playwright ist hier nicht installiert – das Netzspiel wurde NICHT geprüft.');
  process.exit(0);
}

/* ---------- Webserver für das Spiel ---------- */
const TYPEN = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json',
                '.webmanifest': 'application/manifest+json', '.svg': 'image/svg+xml', '.jpg': 'image/jpeg', '.png': 'image/png' };
const web = http.createServer((req, res) => {
  const rein = decodeURIComponent((req.url || '/').split('?')[0]);
  const datei = path.join(WURZEL, rein === '/' ? 'index.html' : rein.replace(/^\/+/, ''));
  if (!datei.startsWith(WURZEL)) { res.writeHead(403); res.end(); return; }
  fs.readFile(datei, (err, buf) => {
    if (err) { res.writeHead(404); res.end('weg'); return; }
    res.writeHead(200, { 'Content-Type': TYPEN[path.extname(datei)] || 'application/octet-stream' });
    res.end(buf);
  });
});
await new Promise(r => web.listen(0, r));
const WEB = `http://localhost:${web.address().port}`;

/* ---------- Vermittler ---------- */
/* Der Port ist nicht frei wählbar: In der Sicherheitsregel der Seite (Content-Security-Policy in
   index.html) steht, wohin der Browser überhaupt eine Verbindung aufbauen darf, und dort ist genau
   ws://localhost:9001 eingetragen. Ein anderer Port sähe aus wie ein Vermittler, der nicht
   antwortet – der Browser würde die Verbindung gar nicht erst versuchen. */
const PORT_V = 9001;
const schlaf = ms => new Promise(r => setTimeout(r, ms));
/* Dieselbe Frist wie im Spiel (LOST in main.js): So lange darf jemand schweigen, bevor er als weg
   gilt. Die Prüfung muß sie abwarten – vorher ist noch gar nichts entschieden. */
const LOST_MS = 22000;
/* Warten, bis er wirklich horcht, und nicht einfach eine Zahl hoffen: Ein Vermittler, der noch
   nicht steht, sieht für den Browser genauso aus wie einer, den es nicht gibt – und die Prüfung
   meldete dann einen Fehler im Spiel, wo keiner ist. */
async function stehtVermittler(versuche = 40) {
  for (let i = 0; i < versuche; i++) {
    const da = await new Promise(r => {
      const req = http.get({ host: 'localhost', port: PORT_V, path: '/' }, res => { res.resume(); r(true); });
      req.on('error', () => r(false));
      req.setTimeout(400, () => { req.destroy(); r(false); });
    });
    if (da) return true;
    await schlaf(150);
  }
  return false;
}
/* Läuft schon einer (etwa von Hand gestartet), wird er benutzt; sonst starten wir einen eigenen
   und räumen ihn am Ende wieder weg. */
let vermittler = null;
if (!await stehtVermittler(3)) {
  vermittler = spawn(process.execPath, [path.join(WURZEL, 'tools', 'vermittler.mjs'), String(PORT_V)], { stdio: ['ignore', 'ignore', 'inherit'] });
  if (!await stehtVermittler(40)) { console.log('FEHLER  der Vermittler startet nicht'); vermittler.kill(); web.close(); process.exit(1); }
}

const browser = await chromium.launch();
const jsFehler = [];
/* Jeder Spieler bekommt ein eigenes Browserprofil – sonst teilten sie sich den Speicher und damit
   die Sitzkennung, und der ganze Versuch wäre wertlos. */
const geraet = async (name) => {
  const c = await browser.newContext({ viewport: { width: 900, height: 860 } });
  const p = await c.newPage();
  p.on('pageerror', e => jsFehler.push(`${name}: ${e.message}`));
  await p.addInitScript(v => { try { localStorage.setItem('fantasygolf.broker', v); } catch (e) {} }, `ws://localhost:${PORT_V}`);
  await p.goto(`${WEB}/index.html`, { waitUntil: 'load' });
  await p.waitForSelector('#to-online', { timeout: 20000 });
  return { c, p };
};

try {
  const A = await geraet('Gastgeber'), B = await geraet('Gast');

  /* ---------- Raum aufmachen und beitreten ---------- */
  await A.p.click('#to-online'); await B.p.click('#to-online');
  await A.p.waitForSelector('#host', { timeout: 15000 });
  await B.p.waitForSelector('#code', { timeout: 15000 });
  await A.p.click('#host');
  await A.p.waitForSelector('.room-code', { timeout: 15000 });
  const code = (await A.p.textContent('.room-code')).trim();
  pruef('der Gastgeber bekommt einen vierstelligen Code', /^\d{4}$/.test(code), code);
  await B.p.fill('#code', code); await B.p.click('#join');
  const sitzt = await A.p.waitForFunction(() => document.querySelectorAll('.seat:not(.empty)').length === 2, null, { timeout: 25000 })
    .then(() => true).catch(() => false);
  pruef('der Gast sitzt im Warteraum', sitzt,
        sitzt ? '' : 'beim Gast steht: ' + (await B.p.evaluate(() => document.body.innerText.slice(0, 200).replace(/\s+/g, ' '))));
  if (!sitzt) throw new Error('ohne zweiten Sitz hat der Rest keinen Sinn');

  /* ---------- Runde starten ---------- */
  await A.p.click('#go');
  for (const g of [A, B]) await g.p.waitForFunction(() => window.__golfDebug && window.__golfDebug.state.phase === 'aim', null, { timeout: 25000 });
  pruef('beide sind in der Runde', true);

  // Dem Gast einen Punktestand geben, damit sich prüfen lässt, ob er ihn zurückbekommt
  await A.p.evaluate(() => { window.__golfDebug.state.players[1].scores[0] = 4; });

  /* ---------- Der Gast fliegt raus: die Seite lädt neu ---------- */
  const sitzVorher = await B.p.evaluate(() => { try { return localStorage.getItem('fantasygolf.sitz'); } catch (e) { return null; } });
  pruef('der Gast hat eine Sitzkennung im Browser', !!sitzVorher, sitzVorher || 'keine');
  await B.p.reload({ waitUntil: 'load' });
  await B.p.waitForSelector('#to-online', { timeout: 20000 });
  const sitzNachher = await B.p.evaluate(() => { try { return localStorage.getItem('fantasygolf.sitz'); } catch (e) { return null; } });
  pruef('und sie übersteht das Neuladen', !!sitzNachher && sitzNachher === sitzVorher);

  /* ---------- Und kommt zurück ---------- */
  await B.p.click('#to-online');
  await B.p.waitForSelector('#code', { timeout: 15000 });
  await B.p.fill('#code', code); await B.p.click('#join');
  const zurueck = await B.p.waitForFunction(
    () => window.__golfDebug && window.__golfDebug.state.phase !== 'title' && document.body.classList.contains('title') === false,
    null, { timeout: 25000 }).then(() => true).catch(() => false);
  pruef('er ist wieder in der laufenden Runde', zurueck);

  if (zurueck) {
    const stand = await B.p.evaluate(() => {
      const s = window.__golfDebug.state;
      return { bahn: s.holeIdx, spieler: s.players.length, punkt: s.players[1] && s.players[1].scores[0], name: s.players.map(p => p.name) };
    });
    pruef('auf derselben Bahn', stand.bahn === 0, `Bahn ${stand.bahn + 1}`);
    pruef('mit beiden Spielern', stand.spieler === 2, `${stand.spieler}`);
    pruef('und mit seinem Punktestand', stand.punkt === 4, `${stand.punkt}`);
    const sitze = await A.p.evaluate(() => window.__golfDebug.state.players.filter(p => !p.gone).length);
    pruef('beim Gastgeber gilt niemand mehr als weg', sitze === 2, `${sitze} von 2`);
  }

  /* ---------- Ein fremdes Gerät bleibt draußen ---------- */
  const C = await geraet('Fremder');
  await C.p.click('#to-online');
  await C.p.waitForSelector('#code', { timeout: 15000 });
  await C.p.fill('#code', code); await C.p.click('#join');
  const abgewiesen = await C.p.waitForFunction(
    () => document.body.innerText.includes('Die Runde läuft schon'), null, { timeout: 20000 }).then(() => true).catch(() => false);
  pruef('ein fremdes Gerät kommt nicht mitten hinein', abgewiesen);

  /* ---------- Der Gastgeber fällt aus ----------
     Nicht höflich verabschieden, sondern verschwinden – so, wie ein Handy ausgeht. Die anderen
     merken es erst nach gut zwanzig Sekunden, darum ist dieser Teil der langsame. */
  await A.c.close();
  /* Erst warten, dann fragen. Die erste Fassung dieser Prüfung fragte sofort – und bekam natürlich
     „alles gut", weil die zwanzig Sekunden noch gar nicht um waren. Sie hätte nie etwas gefunden:
     Auf dem Stand ohne Übergabe war sie ebenso grün. Eine Prüfung, die zu früh hinsieht, prüft
     nichts. */
  await schlaf(LOST_MS + 8000);
  const drin = await B.p.evaluate(() => ({
    phase: window.__golfDebug.state.phase,
    raus: document.body.innerText.includes('Der Gastgeber hat den Raum verlassen'),
    bahn: window.__golfDebug.state.holeIdx,
  }));
  pruef('der Raum läuft weiter, wenn der Gastgeber ausfällt', drin.phase !== 'title' && !drin.raus,
        `Zustand ${drin.phase}${drin.raus ? ', hinausgeworfen' : ''}`);
  pruef('und der Übriggebliebene steht noch auf seiner Bahn', drin.bahn === 0, `Bahn ${drin.bahn + 1}`);

  pruef('keine Fehler in den Browsern', jsFehler.length === 0, jsFehler.join(' | '));
} finally {
  await browser.close();
  if (vermittler) vermittler.kill();
  web.close();
}

console.log(`\n${fehler ? fehler + ' FEHLER' : 'alles bestanden'}`);
process.exit(fehler ? 1 : 0);
