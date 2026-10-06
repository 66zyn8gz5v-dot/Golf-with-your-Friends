/* Prüft, was gegen den Stromverbrauch gebaut wurde.
 *
 *   node tools/strom.mjs      (ein Webserver auf 127.0.0.1:8765 muß laufen)
 *
 * WARUM DIESE PRÜFUNG. Fynn hat am 6. Oktober gemeldet, daß das Gerät beim Spielen zu viel Strom
 * zieht. Die Messung sagte, woran es lag: Das Spiel zeichnete sechzigmal in der Sekunde die ganze
 * Welt neu - jeden Baum, jeden Felsen, mit Verläufen und Dutzenden Pfaden -, auch wenn der Ball
 * still lag und jemand eine Minute lang überlegte. Auf dem Schneeberg entfielen vier Fünftel der
 * Last allein auf das Beiwerk.
 *
 * Dagegen stehen jetzt zwei Sachen, und beide sind unsichtbar: der Zeichentakt (nur so oft
 * zeichnen, wie das Auge es braucht) und das Beiwerk-Gedächtnis (einen Baum einmal malen, dann
 * stempeln). Unsichtbare Sachen verfallen unbemerkt - wer später am Zugwechsel oder an einer
 * Zeichnung arbeitet, nimmt sie versehentlich zurück, und niemand sieht es, weil das Bild
 * dasselbe bleibt. Nur der Akku weiß davon.
 *
 * Geprüft wird darum beides: daß gespart wird UND daß das Bild dabei dasselbe bleibt.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ADRESSE = process.env.GOLF_URL || 'http://127.0.0.1:8765/index.html';
let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

const browser = await chromium.launch();
async function seiteAuf() {
  const s = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  s.on('pageerror', e => { console.log('Absturz im Browser: ' + e.message); fehler++; });
  await s.addInitScript(() => {
    // Zählt, wie oft der Browser ein Bild angeboten und wie oft das Spiel wirklich gezeichnet hat
    const echt = window.requestAnimationFrame.bind(window);
    window.__zaehler = { takte: 0, bilder: 0 };
    window.requestAnimationFrame = fn => echt(t => { window.__zaehler.takte++; fn(t); });
  });
  await s.goto(ADRESSE);
  await s.waitForFunction(() => window.__golfDebug && window.__golfDebug.state);
  await s.evaluate(() => {
    const alt = Renderer.prototype.drawFrame;
    Renderer.prototype.drawFrame = function (st) { window.__zaehler.bilder++; window.__R = this; return alt.call(this, st); };
  });
  return s;
}
const starte = async (s, welt, bahn = 0) => {
  await s.evaluate(([w, h]) => { __golfDebug.welt(w); __golfDebug.starte(1, h); }, [welt, bahn]);
  await s.waitForFunction(() => __golfDebug.state.phase === 'aim', { timeout: 30000 });
};
const zaehlen = async (s, ms) => {
  await s.evaluate(() => { window.__zaehler.takte = 0; window.__zaehler.bilder = 0; });
  await s.waitForTimeout(ms);
  return s.evaluate(() => window.__zaehler);
};

/* ---------- Der Zeichentakt ---------- */
console.log('\nSo oft zeichnen, wie das Auge es braucht');
{
  const s = await seiteAuf();
  await starte(s, 'snow');
  const ziel = await zaehlen(s, 3000);
  pruef('beim Zielen wird nur etwa jedes zweite Bild gezeichnet',
        ziel.bilder < ziel.takte * 0.72 && ziel.bilder > ziel.takte * 0.3,
        `${ziel.bilder} von ${ziel.takte}`);
  // Rollen: der Ball bekommt Schwung und behält ihn
  await s.evaluate(() => { __golfDebug.schlag(1, 0, 0.9); });
  const roll = await zaehlen(s, 1200);
  pruef('während der Ball rollt, wird jedes Bild gezeichnet', roll.bilder > roll.takte * 0.9,
        `${roll.bilder} von ${roll.takte}`);
  await s.close();
}
{
  const s = await seiteAuf();
  await s.waitForTimeout(2500);   // der Startbildschirm, mit der Weltkarte als Hintergrund
  const titel = await zaehlen(s, 1500);
  pruef('auf dem Startbildschirm wird gar nicht gezeichnet', titel.bilder === 0,
        `${titel.bilder} von ${titel.takte}`);
  await s.close();
}

/* ---------- Das Beiwerk-Gedächtnis ---------- */
console.log('\nEinen Baum einmal malen, dann stempeln');
{
  const s = await seiteAuf();
  await starte(s, 'snow');
  await s.waitForTimeout(3500);
  const g = await s.evaluate(() => {
    const R = window.__R; let ok = 0, aus = 0, leer = 0, fest = 0;
    for (const e of R.beiwerk.values()) { if (e.aus) aus++; else if (e.leer) leer++; else ok++; }
    for (const d of R.level.decor) if (R.stempelbar(d)) fest++;
    return { ok, aus, leer, fest, mb: +(R.beiwerkBytes / 1048576).toFixed(2), steht: R.formSteht };
  });
  pruef('die Stempel werden wirklich benutzt', g.ok > 20, `${g.ok} gebacken, ${g.fest} stempelbar`);
  pruef('kein Stück ist am Rahmen abgeschnitten', g.aus === 0, `${g.aus} abgeschnitten`);
  pruef('das Gedächtnis bleibt klein', g.mb < 8, `${g.mb} MB`);
  await s.close();
}

/* ---------- Und das Bild bleibt dasselbe ---------- */
console.log('\nUnd das Bild bleibt dasselbe');
async function schuss(welt, bahn, stempel) {
  const s = await browser.newPage({ viewport: { width: 1000, height: 700 } });
  await s.goto(ADRESSE);
  await s.waitForFunction(() => window.__golfDebug && window.__golfDebug.state);
  if (!stempel) await s.evaluate(() => { Renderer.prototype.stempelbar = () => false; });
  await s.evaluate(([w, h]) => { __golfDebug.welt(w); __golfDebug.starte(1, h); }, [welt, bahn]);
  await s.waitForFunction(() => __golfDebug.state.phase === 'aim', { timeout: 30000 });
  await s.evaluate(() => { const e = document.getElementById('cam-overview'); if (e) e.click(); });
  await s.waitForTimeout(2600);
  await s.evaluate(() => { __golfDebug.freeze = true; __golfDebug.state.t = 12.0; });
  await s.waitForTimeout(900);
  const b = await s.screenshot();
  await s.close();
  return 'data:image/png;base64,' + b.toString('base64');
}
for (const [welt, bahn] of [['snow', 0], ['normal', 0], ['flut', 0]]) {
  const [a, c] = [await schuss(welt, bahn, false), await schuss(welt, bahn, true)];
  const s = await browser.newPage();
  const d = await s.evaluate(async ([x, y]) => {
    const lade = q => new Promise(r => { const i = new Image(); i.onload = () => r(i); i.src = q; });
    const [A, B] = await Promise.all([lade(x), lade(y)]);
    const f = im => { const c = document.createElement('canvas'); c.width = im.width; c.height = im.height; c.getContext('2d').drawImage(im, 0, 0); return c.getContext('2d').getImageData(0, 0, im.width, im.height).data; };
    const da = f(A), db = f(B); let n = 0;
    for (let i = 0; i < da.length; i += 4)
      if (Math.max(Math.abs(da[i] - db[i]), Math.abs(da[i + 1] - db[i + 1]), Math.abs(da[i + 2] - db[i + 2])) > 8) n++;
    return +(100 * n / (da.length / 4)).toFixed(2);
  }, [a, c]);
  await s.close();
  /* Gleich heißt hier nicht Punkt für Punkt gleich: Ein Stempel wird auf ganze Bildpunkte
     gesetzt, und ein um einen halben Punkt verschobener Baumrand ist eine andere Zahl, aber
     dasselbe Bild. Weicht mehr als jeder vierzigste Punkt ab, stimmt etwas nicht. */
  pruef(`${welt}: gestempelt sieht aus wie gemalt`, d < 2.5, `${d}% der Punkte weichen ab`);
}

/* ---------- Der Schalter für die Schärfe ---------- */
console.log('\nDie Schärfe läßt sich umstellen');
{
  /* Zwei Bildpunkte je Maßpunkt - wie auf dem iPad. Auf einem gewöhnlichen Bildschirm wäre an der
     Schärfe nichts zu messen: Dort ist schon „fein" nur ein Punkt. */
  const s = await browser.newPage({ viewport: { width: 1000, height: 700 }, deviceScaleFactor: 2 });
  await s.goto(ADRESSE);
  await s.waitForFunction(() => window.__golfDebug && window.__golfDebug.state);
  await s.evaluate(() => { const a = Renderer.prototype.drawFrame; Renderer.prototype.drawFrame = function (st) { window.__R = this; return a.call(this, st); }; });
  await s.evaluate(() => { __golfDebug.welt('altplatz'); __golfDebug.starte(1, 0); });
  await s.waitForFunction(() => __golfDebug.state.phase === 'aim', { timeout: 30000 });
  const fein = await s.evaluate(() => ({ dpr: window.__R.dpr, b: window.__R.cv.width }));
  pruef('„fein" nutzt den ganzen Bildschirm', fein.dpr === 2 && fein.b === 2000, `dpr ${fein.dpr}, ${fein.b} Punkte breit`);
  await s.evaluate(() => window.__R.setzeSchaerfe('sparsam'));
  await s.waitForTimeout(300);
  const sparsam = await s.evaluate(() => ({ dpr: window.__R.dpr, b: window.__R.cv.width }));
  pruef('„sparsam" zeichnet auf höchstens 1,25 Punkten', sparsam.dpr <= 1.25, `${fein.dpr} → ${sparsam.dpr}`);
  pruef('und die Leinwand wird wirklich kleiner', sparsam.b === Math.round(1000 * sparsam.dpr) && sparsam.b < fein.b,
        `${fein.b} → ${sparsam.b} Punkte breit, das sind ${(100 * (sparsam.b ** 2) / (fein.b ** 2)).toFixed(0)}% der Fläche`);
  await s.evaluate(() => window.__R.setzeSchaerfe('fein'));
  await s.waitForTimeout(300);
  pruef('und zurück geht es auch', await s.evaluate(() => window.__R.dpr === 2));
  await s.close();
}

await browser.close();
console.log(fehler ? `\n${fehler} Fehler` : '\nalles bestanden');
process.exit(fehler ? 1 : 0);
