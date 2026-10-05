/* Prüft den Abwechselnd-Modus: mehrere Bälle auf einer Bahn, reihum ein Schlag.
 *
 *   node tools/abwechselnd.mjs      (ein Webserver auf 127.0.0.1:8765 muß laufen)
 *
 * WARUM DIESE PRÜFUNG. Der Golf-Ablauf kannte zehn Fassungen lang genau einen Ball. Alles, was
 * ihn betrifft – Strafschlag, Schlaglimit, Einlochen, Zugwechsel –, war darauf gebaut, daß
 * state.ball der einzige ist. Der Abwechselnd-Modus bricht genau diese Annahme auf, und zwar an
 * sechs Stellen gleichzeitig. Jede davon kann unbemerkt zurückfallen, wenn jemand später am
 * Zugwechsel oder am Strafschlag arbeitet: Dann zählt ein Treffer plötzlich für den Falschen,
 * oder der Nächste schlägt in eine noch rollende Kugel.
 *
 * Geprüft werden darum die Versprechen des Modus im echten Spiel, nicht die Zeilen, die sie
 * erfüllen.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ADRESSE = process.env.GOLF_URL || 'http://127.0.0.1:8765/index.html';
let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1100, height: 900 } });
seite.on('pageerror', e => { console.log('Absturz im Browser: ' + e.message); fehler++; });
await seite.goto(ADRESSE);
await seite.waitForFunction(() => window.__golfDebug && window.__golfDebug.state);

const zielen = () => seite.waitForFunction(() => __golfDebug.state.phase === 'aim', { timeout: 30000 });
const stand = () => seite.evaluate(() => {
  const s = __golfDebug.state;
  return {
    phase: s.phase, cur: s.curPlayer, strokes: s.strokes,
    liegend: (s.liegendeBaelle || []).length,
    scores: s.players.map(p => p.scores[0]),
    baelle: (s.baelle || []).map(b => b ? { sp: b.spieler, s: b.schlaege, fertig: !!b.fertig, x: +b.x.toFixed(2), y: +b.y.toFixed(2) } : null),
  };
});

/* ---- Die Auswahl auf dem Startbildschirm ---- */
console.log('\nDie Reihenfolge in der Startaufstellung');
await seite.waitForTimeout(1400);
await seite.evaluate(() => document.querySelectorAll('#overlay .btn')[0].click());   // Weltkarte
await seite.waitForTimeout(900);
await seite.evaluate(() => {
  const e = document.querySelector('#overlay .spot[data-world="normal"]') || document.querySelector('#overlay .spot');
  e.dispatchEvent(new MouseEvent('click', { bubbles: true }));
});
await seite.waitForTimeout(900);
const schirm = await seite.evaluate(() => {
  const hol = () => document.getElementById('rf-row');
  const klick = (w, v) => { const e = [...document.querySelectorAll(w)].find(x => x.dataset.n === v || x.dataset.g === v); if (e) e.click(); };
  if (!hol()) return null;
  klick('#pc .btn', '1'); const allein = hol().hidden;
  klick('#pc .btn', '2'); const zweit = hol().hidden;
  klick('#gm .btn', 'creative'); const kreativ = hol().hidden;
  klick('#gm .btn', 'normal');
  const knoepfe = [...document.querySelectorAll('#rf .btn')].map(x => x.dataset.r);
  return { allein, zweit, kreativ, knoepfe };
});
pruef('es gibt eine Zeile „Reihenfolge"', !!schirm);
if (schirm) {
  pruef('mit beiden Möglichkeiten', schirm.knoepfe.join(',') === 'nach,wechsel', schirm.knoepfe.join(', '));
  pruef('allein ist sie versteckt', schirm.allein);
  pruef('zu zweit steht sie da', !schirm.zweit);
  pruef('im Kreativmodus ist sie wieder weg', schirm.kreativ);
}

/* ---- Reihum ein Schlag ---- */
console.log('\nReihum ein Schlag, drei Spieler');
await seite.evaluate(() => { __golfDebug.welt('normal'); __golfDebug.starte(3, 0, 'wechsel'); });
await zielen();
const folge = [];
for (let i = 0; i < 6; i++) {
  await zielen();
  folge.push((await stand()).cur);
  await seite.evaluate(() => {
    const s = __golfDebug.state, lv = s.level;
    __golfDebug.schlag(lv.cup.x - s.ball.x, lv.cup.y - s.ball.y, 0.4);
  });
  await seite.waitForTimeout(250);
}
await zielen();
const nachSechs = await stand();
pruef('der Zug wandert nach jedem Schlag weiter', folge.join('') === '012012', folge.join('→'));
pruef('alle drei Bälle liegen auf der Bahn', nachSechs.baelle.filter(Boolean).length === 3);
pruef('jeder hat zwei Schläge auf seinem Ball', nachSechs.baelle.every(b => b.s === 2),
      nachSechs.baelle.map(b => b.s).join('/'));
pruef('und die anderen beiden sind sichtbar', nachSechs.liegend === 2, String(nachSechs.liegend));

/* ---- Ein fremder Ball wird eingelocht ---- */
console.log('\nEin fremder Ball, ins Loch geschoben');
await seite.evaluate(() => { __golfDebug.welt('normal'); __golfDebug.starte(2, 0, 'wechsel'); });
await zielen();
for (let i = 0; i < 2; i++) { await zielen(); await seite.evaluate(() => __golfDebug.schlag(1, 0, 0.3)); await seite.waitForTimeout(250); }
await zielen();
const vorStoss = await seite.evaluate(() => {
  const s = __golfDebug.state, cup = s.level.cup;
  const mein = s.baelle[s.curPlayer], fremd = s.baelle[1 - s.curPlayer];
  fremd.x = fremd.restX = cup.x - 1.0; fremd.y = fremd.restY = cup.y; fremd.vx = fremd.vy = 0;
  mein.x = mein.restX = cup.x - 2.4; mein.y = mein.restY = cup.y; mein.vx = mein.vy = 0;
  const vorher = fremd.schlaege, wer = fremd.spieler;
  __golfDebug.schlag(1, 0, 0.22);
  return { vorher, wer };
});
await seite.waitForTimeout(4000);
const nachStoss = await stand();
const getroffen = nachStoss.baelle.find(b => b && b.sp === vorStoss.wer);
pruef('er ist eingelocht und vom Platz', !!getroffen && getroffen.fertig);
pruef('gewertet wird für seinen Besitzer', nachStoss.scores[vorStoss.wer] === vorStoss.vorher,
      `${nachStoss.scores[vorStoss.wer]} statt ${vorStoss.vorher}`);
pruef('der Stoß des anderen ist kein Schlag für ihn', getroffen && getroffen.s === vorStoss.vorher);

/* ---- Ein fremder Ball fliegt von der Bahn ---- */
console.log('\nEin fremder Ball, ins Wasser geschoben');
await seite.evaluate(() => { __golfDebug.welt('sea'); __golfDebug.starte(2, 0, 'wechsel'); });
await zielen();
for (let i = 0; i < 2; i++) { await zielen(); await seite.evaluate(() => __golfDebug.schlag(1, 0, 0.25)); await seite.waitForTimeout(250); }
await zielen();
const vorWasser = await seite.evaluate(() => {
  const s = __golfDebug.state, lv = s.level;
  let w = null;
  for (let y = 0; y < lv.H && !w; y++) for (let x = 0; x < lv.W; x++) if (lv.tiles[y][x] === 'w') { w = [x + 0.5, y + 0.5]; break; }
  if (!w) return null;
  const mein = s.baelle[s.curPlayer], fremd = s.baelle[1 - s.curPlayer];
  fremd.x = fremd.restX = w[0] - 1.2; fremd.y = fremd.restY = w[1]; fremd.vx = fremd.vy = 0; fremd.restEbene = 0;
  mein.x = mein.restX = w[0] - 2.6; mein.y = mein.restY = w[1]; mein.vx = mein.vy = 0;
  const ruhe = [+fremd.x.toFixed(2), +fremd.y.toFixed(2)], schlaege = fremd.schlaege, wer = fremd.spieler;
  __golfDebug.schlag(1, 0, 0.3);
  return { ruhe, schlaege, wer };
});
if (!vorWasser) pruef('die Meereswelt hat eine Wasserkachel', false);
else {
  await seite.waitForTimeout(4000);
  const nachWasser = await stand();
  const zurueck = nachWasser.baelle.find(b => b && b.sp === vorWasser.wer);
  pruef('er liegt wieder an seinem Ruhepunkt', !!zurueck && Math.hypot(zurueck.x - vorWasser.ruhe[0], zurueck.y - vorWasser.ruhe[1]) < 0.3,
        zurueck ? `${zurueck.x}/${zurueck.y} statt ${vorWasser.ruhe.join('/')}` : 'kein Ball');
  pruef('und zahlt keinen Strafschlag', !!zurueck && zurueck.s === vorWasser.schlaege,
        zurueck ? `${zurueck.s} statt ${vorWasser.schlaege}` : '');
  pruef('er ist auch nicht fertig', !!zurueck && !zurueck.fertig);
}

/* ---- Der eigene Strafschlag ---- */
console.log('\nDer eigene Ball im Wasser');
await seite.evaluate(() => { __golfDebug.welt('sea'); __golfDebug.starte(2, 0, 'wechsel'); });
await zielen();
for (let i = 0; i < 2; i++) { await zielen(); await seite.evaluate(() => __golfDebug.schlag(1, 0, 0.25)); await seite.waitForTimeout(250); }
await zielen();
const vorEigen = await seite.evaluate(() => {
  const s = __golfDebug.state, lv = s.level;
  let w = null;
  for (let y = 0; y < lv.H && !w; y++) for (let x = 0; x < lv.W; x++) if (lv.tiles[y][x] === 'w') { w = [x + 0.5, y + 0.5]; break; }
  const mein = s.baelle[s.curPlayer];
  mein.x = mein.restX = w[0] - 1.6; mein.y = mein.restY = w[1]; mein.vx = mein.vy = 0;
  const wer = s.curPlayer, schlaege = mein.schlaege;
  __golfDebug.schlag(1, 0, 0.3);
  return { wer, schlaege };
});
await seite.waitForTimeout(4500);
const nachEigen = await stand();
const eigener = nachEigen.baelle.find(b => b && b.sp === vorEigen.wer);
pruef('er zahlt Schlag und Strafschlag', !!eigener && eigener.s === vorEigen.schlaege + 2,
      eigener ? `${eigener.s} statt ${vorEigen.schlaege + 2}` : '');
pruef('und danach ist der Nächste dran, nicht noch einmal er', nachEigen.cur !== vorEigen.wer,
      `Spieler ${nachEigen.cur + 1}`);

/* ---- Die Bahn endet erst, wenn niemand mehr dran ist ---- */
console.log('\nDas Ende der Bahn');
await seite.evaluate(() => { __golfDebug.welt('normal'); __golfDebug.starte(2, 0, 'wechsel'); });
await zielen();
await seite.evaluate(() => __golfDebug.schlag(1, 0, 0.3));
await zielen();
await seite.evaluate(() => __golfDebug.schlag(1, 0, 0.3));
await zielen();
// Spieler 1 vorzeitig fertig – die Bahn darf deswegen nicht enden
await seite.evaluate(() => __golfDebug.finishHole(4));
await seite.waitForTimeout(2600);
const einerWeg = await stand();
pruef('ein fertiger Spieler beendet die Bahn nicht', einerWeg.phase !== 'summary', einerWeg.phase);
pruef('sein Ball ist vom Platz', (einerWeg.baelle[0] || {}).fertig === true);
pruef('und der andere ist dran', einerWeg.cur === 1, `Spieler ${einerWeg.cur + 1}`);
await zielen();
await seite.evaluate(() => __golfDebug.finishHole(5));
await seite.waitForTimeout(2600);
const beideWeg = await stand();
pruef('mit dem letzten Spieler kommt die Tafel', beideWeg.phase === 'summary', beideWeg.phase);
pruef('und beide Ergebnisse stehen darauf', beideWeg.scores[0] === 4 && beideWeg.scores[1] === 5,
      beideWeg.scores.join(' / '));

await browser.close();
console.log(fehler ? `\n${fehler} Fehler` : '\nalles bestanden');
process.exit(fehler ? 1 : 0);
