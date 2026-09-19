/* Prüft, wohin der Ball nach einem Strafschlag zurückgelegt wird.
 *
 *   node tools/ruhepunkt.mjs      (ein Webserver auf 127.0.0.1:8765 muß laufen)
 *
 * WARUM DIESE PRÜFUNG. Fynn hat am 19. September auf „Die erste Blüte" eine Endlosschleife
 * gefunden: Der Ball blieb auf der Rankenbrücke liegen, die Ranke welkte, er fiel – und wurde
 * genau dort wieder abgelegt, wo er heruntergefallen war. Nächster Sturz, nächster Strafschlag,
 * und so weiter bis zum Schlaglimit.
 *
 * Es ist derselbe Fehler, den es vorher schon zweimal gab: im Wasser (seit dem Gießlöffel kann
 * Boden zu Wasser werden) und in der Strömung (sie trägt auch einen liegenden Ball). Dreimal
 * derselbe Fehler heißt: Es braucht eine Prüfung, die ihn festhält, und nicht nur eine weitere
 * Zeile in main.js.
 *
 * Geprüft wird darum das Versprechen selbst, und zwar im echten Spiel:
 *   - Ein Ball, der auf der Rankenbrücke liegenbleibt, FÄLLT (das ist die Aufgabe der Maschine).
 *   - Und danach liegt er NICHT wieder auf der Brücke, sondern auf Boden, der trägt.
 *   - Und das Ganze geht nicht in eine Schleife: Ein Sturz kostet genau einen Strafschlag.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';

const ADRESSE = process.env.GOLF_URL || 'http://127.0.0.1:8765/index.html';
let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

const browser = await chromium.launch();
const seite = await browser.newPage({ viewport: { width: 1100, height: 760 } });
seite.on('pageerror', e => { console.log('Absturz im Browser: ' + e.message); fehler++; });
await seite.goto(ADRESSE, { waitUntil: 'networkidle' });
await seite.waitForFunction(() => typeof window.__golfDebug !== 'undefined', null, { timeout: 20000 });

/* „Die erste Blüte": Lücke von x 14 bis 18, Blüte davor bei 10,5. Der Ball wird von Hand auf die
   Brücke gesetzt und die Ranke von Hand gezündet – so steht der Fall fest und hängt nicht daran,
   ob ein Schlag zufällig genau richtig dosiert war. */
const ergebnis = await seite.evaluate(async () => {
  const D = window.__golfDebug;
  D.welt('lehrling'); D.starte(1); D.openHole(1);
  // Die Bahn kommt mit einer Einführung – erst danach liegt ein Ball da
  for (let i = 0; i < 80 && !(D.state.ball && D.state.level); i++) await new Promise(r => setTimeout(r, 100));
  const st = D.state, lv = st.level, b = st.ball;
  if (!b || !lv) return { grund: 'auf der Bahn liegt kein Ball' };
  const ranke = lv.obstacles.find(o => o.type === 'ranke');
  if (!ranke) return { grund: 'auf dieser Bahn steht keine Rankenbrücke' };

  // Der Ball liegt mitten auf der Brücke, die Ranke trägt gerade noch
  const mx = ranke.x + ranke.w / 2, my = ranke.y + ranke.h / 2;
  b.x = mx; b.y = my; b.vx = 0; b.vy = 0; b.z = 0;
  b.restX = mx; b.restY = my; b.shotX = 4.5; b.shotY = 6.5;
  ranke.abT = st.t; ranke.bisT = st.t + 0.4;   // sie trägt noch kurz und welkt dann
  st.phase = 'rolling';
  const schlaegeVorher = st.strokes;

  // Warten, bis der Sturz, der Strafschlag und das Zurücklegen durch sind (0,9 s Verzögerung)
  await new Promise(r => setTimeout(r, 2600));
  const drauf = (x, y) => Math.abs(x - mx) <= ranke.w / 2 && Math.abs(y - my) <= ranke.h / 2;
  const erst = { x: st.ball.x, y: st.ball.y, drauf: drauf(st.ball.x, st.ball.y), schlaege: st.strokes - schlaegeVorher };

  // Und noch zwei Sekunden zusehen: Wenn er falsch liegt, fällt er in dieser Zeit wieder
  await new Promise(r => setTimeout(r, 2200));
  const dann = { x: st.ball.x, y: st.ball.y, drauf: drauf(st.ball.x, st.ball.y), schlaege: st.strokes - schlaegeVorher };
  const boden = lv.charAtEbene(st.ball.ebene || 0, st.ball.x, st.ball.y);
  return { erst, dann, boden };
});

if (ergebnis.grund) { console.log('FEHLER  ' + ergebnis.grund); fehler++; }
else {
  console.log('\nDer Ruhepunkt nach einem Sturz von der Rankenbrücke');
  pruef('der Ball fällt, wenn die Ranke unter ihm welkt', ergebnis.erst.schlaege >= 1,
        `${ergebnis.erst.schlaege} Strafschlag(e)`);
  pruef('er wird NICHT wieder auf die Brücke gelegt', !ergebnis.erst.drauf,
        `liegt bei ${ergebnis.erst.x.toFixed(1)}/${ergebnis.erst.y.toFixed(1)}`);
  pruef('und zwar auf tragendem Boden', '#silTH'.includes(ergebnis.boden), `dort steht '${ergebnis.boden}'`);
  pruef('ein Sturz kostet genau einen Strafschlag, nicht zwei', ergebnis.dann.schlaege === ergebnis.erst.schlaege,
        `nach vier Sekunden: ${ergebnis.dann.schlaege}`);
  pruef('und er liegt danach immer noch dort', !ergebnis.dann.drauf,
        `${ergebnis.dann.x.toFixed(1)}/${ergebnis.dann.y.toFixed(1)}`);
}

await browser.close();
console.log(fehler ? `\n${fehler} Fehler` : '\nalles bestanden');
process.exit(fehler ? 1 : 0);
