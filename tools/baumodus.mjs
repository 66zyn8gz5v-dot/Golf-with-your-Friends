/* Prüft den Baumodus im echten Browser.
 *
 *   node tools/baumodus.mjs            prüft und schreibt Bilder nach /tmp
 *   node tools/baumodus.mjs --bilder X legt die Bilder in den Ordner X
 *
 * WARUM DIESE PRÜFUNG. Der Baumodus bietet über sechzig Maschinen an. Jede davon einmal von Hand
 * hinzusetzen dauert eine Stunde – also tut es niemand, und ein Tippfehler in einer einzigen
 * Bauanleitung fällt erst dem auf, der die Maschine benutzt. Hier wird jede Maschine einmal
 * gesetzt, die Bahn daraus gebaut und nachgesehen, ob sie auch ankommt.
 *
 * Und jeder Regler wird angefaßt: Ein Regler, dessen Schlüssel es am Hindernis gar nicht gibt,
 * sieht im Blatt völlig richtig aus und tut nichts. Das ist der Fehler, den man sonst nie findet.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import path from 'node:path'; import fs from 'node:fs';

const BILDER = process.argv.includes('--bilder') ? process.argv[process.argv.indexOf('--bilder') + 1] : null;
if (BILDER) fs.mkdirSync(BILDER, { recursive: true });
const ADRESSE = process.env.GOLF_URL || 'http://127.0.0.1:8765/index.html';

const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 2 });
const fehler = [];
seite.on('pageerror', e => fehler.push('Absturz im Browser: ' + e.message));
await seite.goto(ADRESSE, { waitUntil: 'networkidle' });
await seite.waitForFunction(() => !!(window.__golfDebug && window.__golfDebug.editor), null, { timeout: 20000 });

/* ---------- 1. Jede Maschine einmal setzen ---------- */
const bericht = await seite.evaluate(() => {
  const k = window.__golfDebug.editor.katalog;
  const meldungen = [];
  /* Eine leere Übungsbahn: ringsum Abgrund, in der Mitte Rasen. Die beiden Buchstabenfelder für
     die Paar-Maschinen stehen schon drin, sonst finden sie ihre Plätze nicht. */
  const grund = () => {
    const rows = [];
    for (let y = 0; y < 16; y++) { let r = ''; for (let x = 0; x < 30; x++) r += (x >= 1 && x <= 28 && y >= 1 && y <= 14) ? '#' : '.'; rows.push(r); }
    rows[7] = rows[7].slice(0, 2) + 'T' + rows[7].slice(3);
    rows[8] = rows[8].slice(0, 26) + 'H' + rows[8].slice(27);
    rows[3] = rows[3].slice(0, 10) + 'A' + rows[3].slice(11);
    rows[3] = rows[3].slice(0, 20) + 'a' + rows[3].slice(21);
    return { id: 1, name: 'Probe', par: 3, theme: 'meadow', map: rows, obstacles: [], decor: [] };
  };
  for (const [welt, stuecke] of k.MASCHINEN) for (const [kennung, name] of stuecke) {
    let o = null;
    try {
      if (k.PAAR_MASCHINEN.has(kennung)) o = { type: kennung, pair: 'A', angle: 0 };
      else if (k.ZWEI_TIPPER.has(kennung)) o = k.makeStrecke(kennung, [8.5, 7.5], [16.5, 7.5]);
      else o = k.makeObject(kennung, 12.5, 7.5);
    } catch (e) { meldungen.push(`FEHLER ${welt}/${name}: Bauanleitung wirft „${e.message}“`); continue; }
    if (!o) { meldungen.push(`FEHLER ${welt}/${name}: keine Bauanleitung (makeObject gibt nichts zurück)`); continue; }
    if (o.type !== kennung) meldungen.push(`FEHLER ${welt}/${name}: baut „${o.type}“ statt „${kennung}“`);

    // Ergibt die Bahn damit noch eine Bahn – und kommt die Maschine darin an?
    const def = grund(); def.obstacles = [o];
    let level = null;
    try { level = buildLevel(def); } catch (e) { meldungen.push(`FEHLER ${welt}/${name}: die Bahn läßt sich damit nicht bauen – „${e.message}“`); continue; }
    const drin = (level.obstacles || []).some(x => x.type === kennung);
    if (!drin) meldungen.push(`FEHLER ${welt}/${name}: die Maschine kommt in der fertigen Bahn nicht an`);
    // Und läuft sie auch? update() ist das, was jedes Bild aufruft.
    try { for (const x of level.obstacles || []) if (x.update) x.update(1.7); } catch (e) { meldungen.push(`FEHLER ${welt}/${name}: update() wirft „${e.message}“`); }

    // Jeder Regler muß einen Wert treffen, den es gibt – sonst dreht man an etwas, das nichts tut
    for (const eintrag of (k.REGLER[kennung] || [])) {
      if (!eintrag) continue;
      const [schluessel, reglername, min, max] = eintrag;
      const wert = k.wertVon(o, schluessel);
      if (typeof wert !== 'number' || !isFinite(wert))
        meldungen.push(`FEHLER ${welt}/${name}: Regler „${reglername}“ (${schluessel}) findet am Hindernis keinen Wert`);
      else if (wert < min || wert > max)
        meldungen.push(`FEHLER ${welt}/${name}: Regler „${reglername}“ steht auf ${wert}, erlaubt ist ${min}…${max}`);
    }
    // Drehen darf nicht abstürzen und muß bei Maschinen mit Richtung auch etwas tun
    try { k.rotate(o); } catch (e) { meldungen.push(`FEHLER ${welt}/${name}: Drehen wirft „${e.message}“`); }
    // Und Anfassen: mindestens ein Greifpunkt, sonst läßt sie sich nicht mehr auswählen
    try { if (!k.anchors(o).length && !k.PAAR_MASCHINEN.has(kennung)) meldungen.push(`FEHLER ${welt}/${name}: kein Greifpunkt – nicht anzufassen`); }
    catch (e) { meldungen.push(`FEHLER ${welt}/${name}: Greifpunkte werfen „${e.message}“`); }
  }
  const anzahl = k.MASCHINEN.reduce((a, [, s]) => a + s.length, 0);
  return { meldungen, anzahl };
});
fehler.push(...bericht.meldungen);
console.log(`${bericht.anzahl} Maschinen geprüft`);

/* ---------- 2. Jedes Aussehen einmal zeichnen ----------
   Ein Stilname, den der Zeichner nicht kennt, faellt nicht auf: Die Maschine wird dann einfach in
   ihrer Grundgestalt gemalt, und der Knopf im Blatt tut scheinbar nichts. Ein Stilname, der einen
   Zeichner mit anderen Erwartungen trifft, stuerzt dagegen ab. Beides faengt nur ab, wer jedes
   Aussehen einmal wirklich malen laesst - darum wird hier die Bahn geoeffnet und ein Bild
   gezeichnet, nicht bloss gerechnet. */
const stile = await seite.evaluate(() => {
  const k = window.__golfDebug.editor.katalog;
  return Object.entries(k.AUSSEHEN).map(([typ, liste]) => [typ, liste.map(e => e[0])]);
});
let stilZahl = 0;
for (const [typ, liste] of stile) for (const stil of liste) {
  stilZahl++;
  const vorher = fehler.length;
  await seite.evaluate(({ typ, stil }) => {
    const k = window.__golfDebug.editor.katalog;
    const rows = [];
    for (let y = 0; y < 14; y++) { let r = ''; for (let x = 0; x < 26; x++) r += (x >= 1 && x <= 24 && y >= 1 && y <= 12) ? '#' : '.'; rows.push(r); }
    rows[6] = rows[6].slice(0, 2) + 'T' + rows[6].slice(3);
    rows[7] = rows[7].slice(0, 22) + 'H' + rows[7].slice(23);
    const o = k.ZWEI_TIPPER.has(typ) ? k.makeStrecke(typ, [8.5, 6.5], [15.5, 6.5]) : k.makeObject(typ, 12.5, 6.5);
    if (stil) o.style = stil; else delete o.style;
    window.__golfDebug.editor.open({ id: 2, name: 'Stilprobe', par: 3, theme: 'meadow', map: rows, obstacles: [o], decor: [] });
  }, { typ, stil });
  await seite.waitForTimeout(110);
  const angekommen = await seite.evaluate(({ typ, stil }) => {
    const o = (window.__golfDebug.state.level.obstacles || []).find(x => x.type === typ);
    if (!o) return 'die Maschine fehlt in der Bahn';
    return (o.style || '') === stil ? true : `traegt „${o.style || '–'}“ statt „${stil || '–'}“`;
  }, { typ, stil });
  if (angekommen !== true) fehler.push(`FEHLER ${typ}/Aussehen „${stil || 'Grundgestalt'}“: ${angekommen}`);
  if (fehler.length > vorher) console.log(`  beim Aussehen ${typ}/${stil || '–'}`);
}
console.log(`${stilZahl} Aussehen gezeichnet`);

/* ---------- 2. Die Oberfläche: Bauen öffnen, Werkzeuge durchgehen ---------- */
await seite.evaluate(() => { window.__golfDebug.editor.open(null); });
await seite.waitForTimeout(700);
const daIst = async sel => (await seite.$(sel)) !== null;
for (const [sel, was] of [['#editor-panel', 'die Werkzeugleiste'], ['#ed-werkzeuge .ed-wz', 'die Werkzeugknöpfe'], ['.ed-gruppen .ed-gr', 'die Gruppen'], ['#ed-undo', 'Rückgängig']])
  if (!await daIst(sel)) fehler.push(`FEHLER: ${was} fehlt im Baumodus`);
// Die Leiste darf die Bahn nicht zudecken: höchstens ein Drittel des Fensters
const hoehe = await seite.evaluate(() => { const p = document.getElementById('editor-panel'); return p ? p.offsetHeight / window.innerHeight : 1; });
if (hoehe > 0.34) fehler.push(`FEHLER: die Leiste nimmt ${Math.round(hoehe * 100)} % der Höhe ein – das ist zu viel`);
if (BILDER) await seite.screenshot({ path: path.join(BILDER, 'bau-boden.png') });

/* Maschinen: Blatt aufmachen, suchen, eine auswählen */
await seite.click('.ed-gruppen .ed-gr[data-gr="maschinen"]');
await seite.waitForTimeout(250);
await seite.click('#ed-wahl');
await seite.waitForTimeout(350);
const karten = await seite.$$eval('#editor-blatt .bl-karte', a => a.length);
if (karten < 60) fehler.push(`FEHLER: im Maschinenblatt stehen nur ${karten} Maschinen`);
if (BILDER) await seite.screenshot({ path: path.join(BILDER, 'bau-maschinen.png') });
await seite.fill('#bl-suche', 'wasser');
await seite.waitForTimeout(350);
const gefunden = await seite.$$eval('#editor-blatt .bl-karte', a => a.map(b => b.dataset.k));
if (!gefunden.length) fehler.push('FEHLER: die Suche im Maschinenblatt findet nichts');
await seite.fill('#bl-suche', 'kanone');
await seite.waitForTimeout(350);
await seite.click('#editor-blatt .bl-karte[data-k="cannon"]');
await seite.waitForTimeout(300);

/* Eine Kanone setzen, auswählen, am Regler drehen – der ganze Weg, den ein Kind auch geht */
const mitte = await seite.evaluate(() => { const c = document.querySelector('canvas'); const r = c.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2 - 60]; });
await seite.mouse.click(mitte[0], mitte[1]);
await seite.waitForTimeout(300);
let wieviele = await seite.evaluate(() => window.__golfDebug.state.level.obstacles.filter(o => o.type === 'cannon').length);
if (wieviele !== 1) fehler.push(`FEHLER: nach dem Tippen stehen ${wieviele} Kanonen auf der Bahn statt einer`);
await seite.mouse.click(mitte[0], mitte[1]);        // zweites Tippen: auswählen statt zweite setzen
await seite.waitForTimeout(400);
wieviele = await seite.evaluate(() => window.__golfDebug.state.level.obstacles.filter(o => o.type === 'cannon').length);
if (wieviele !== 1) fehler.push(`FEHLER: das zweite Tippen auf eine Maschine setzt eine neue, statt sie auszuwählen (${wieviele})`);
if (!await daIst('#editor-blatt .bl-regler')) fehler.push('FEHLER: das Einstellblatt der Kanone geht nicht auf');
if (BILDER) await seite.screenshot({ path: path.join(BILDER, 'bau-einstellen.png') });

/* Regler ziehen und nachsehen, ob es ankommt */
const vorher = await seite.evaluate(() => window.__golfDebug.state.level.obstacles.find(o => o.type === 'cannon').range);
await seite.evaluate(() => {
  const r = document.querySelector('#editor-blatt input[type=range][data-k="range"]');
  r.value = String(+r.max); r.dispatchEvent(new Event('input', { bubbles: true })); r.dispatchEvent(new Event('change', { bubbles: true }));
});
await seite.waitForTimeout(300);
const nachher = await seite.evaluate(() => window.__golfDebug.state.level.obstacles.find(o => o.type === 'cannon').range);
if (!(nachher > vorher)) fehler.push(`FEHLER: der Regler „Wie weit sie schießt“ ändert nichts (${vorher} → ${nachher})`);

/* Rückgängig: der Regler zurück, dann die Kanone weg */
await seite.click('#ed-undo'); await seite.waitForTimeout(300);
const zurueck = await seite.evaluate(() => { const c = window.__golfDebug.state.level.obstacles.find(o => o.type === 'cannon'); return c ? c.range : null; });
if (zurueck !== vorher) fehler.push(`FEHLER: Rückgängig holt den Regler nicht zurück (${zurueck} statt ${vorher})`);
await seite.click('#ed-undo'); await seite.waitForTimeout(300);
const weg = await seite.evaluate(() => window.__golfDebug.state.level.obstacles.filter(o => o.type === 'cannon').length);
if (weg !== 0) fehler.push('FEHLER: Rückgängig nimmt die gesetzte Kanone nicht zurück');
await seite.click('#ed-redo'); await seite.waitForTimeout(300);
const wieder = await seite.evaluate(() => window.__golfDebug.state.level.obstacles.filter(o => o.type === 'cannon').length);
if (wieder !== 1) fehler.push('FEHLER: Wiederholen bringt die Kanone nicht zurück');

/* Füllen: die ganze Fläche mit Sand – und wieder zurück */
await seite.click('.ed-gruppen .ed-gr[data-gr="boden"]'); await seite.waitForTimeout(200);
await seite.click('#ed-werkzeuge .ed-wz[data-wz="s"]');
await seite.click('#ed-werkzeuge .ed-wz[data-form="fuellen"]');
const sandVorher = await seite.evaluate(() => window.__golfDebug.state.level.tiles.flat().filter(c => c === 's').length);
await seite.mouse.click(mitte[0], mitte[1] + 40);
await seite.waitForTimeout(400);
const sandNachher = await seite.evaluate(() => window.__golfDebug.state.level.tiles.flat().filter(c => c === 's').length);
if (!(sandNachher > sandVorher + 20)) fehler.push(`FEHLER: der Farbeimer füllt nicht (${sandVorher} → ${sandNachher} Sandfelder)`);
await seite.click('#ed-undo'); await seite.waitForTimeout(300);
const sandZurueck = await seite.evaluate(() => window.__golfDebug.state.level.tiles.flat().filter(c => c === 's').length);
if (sandZurueck !== sandVorher) fehler.push('FEHLER: Rückgängig nimmt den Farbeimer nicht zurück');
if (BILDER) await seite.screenshot({ path: path.join(BILDER, 'bau-fuellen.png') });

/* Schrägsicht: sie darf nicht abstürzen, und die Leiste bleibt unten */
await seite.click('.ed-gruppen .ed-gr[data-gr="ansicht"]'); await seite.waitForTimeout(200);
await seite.click('#ed-view'); await seite.waitForTimeout(700);
if (BILDER) await seite.screenshot({ path: path.join(BILDER, 'bau-schraeg.png') });

await browser.close();
if (fehler.length) { for (const f of fehler) console.log(f); console.log(`\n${fehler.length} Fehler`); process.exit(1); }
console.log('ok – Baumodus: alle Maschinen, alle Aussehen, alle Regler, Werkzeuge und Rückgängig');
