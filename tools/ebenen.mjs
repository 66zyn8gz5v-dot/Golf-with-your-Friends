/* Prüft, dass Hindernisse auf einer oberen Ebene auch dort gezeichnet werden.
 *
 *   node tools/ebenen.mjs
 *
 * WORUM ES GEHT
 * Mehrstöckige Bahnen zeichnen ihre Etagen als Schollen, und zwar nach allem, was unten steht –
 * sonst verdeckte eine untere Mauer die obere Etage. Ein Hindernis, das oben steht, wurde dabei
 * brav auf Höhe null gemalt und danach von der eigenen Scholle zugedeckt. Es war da, es stieß den
 * Ball, man sah es nur nicht. Auf der Kristallkammer waren das zwei Kristalle und ein Magnet.
 *
 * Der Zeichner stellt diese Stücke jetzt zurück und malt sie in zeichneEbene nach, mit der
 * Leinwand um die Höhe der Etage nach oben verschoben.
 *
 * Geprüft wird beides:
 *   1. Die Rechnung, auf der das Verschieben beruht – die Höhe wirkt in dieser Abbildung nur
 *      senkrecht und nur linear. Wäre das nicht so, säße jedes verschobene Stück daneben.
 *   2. Der Weg durch den Zeichner: zurückgestellt, in beiden Etagenzeichnungen nachgeholt,
 *      Boden-Überlagerungen nicht doppelt.
 * Dazu die Ansage, welche Hindernisse überhaupt betroffen sind – damit sichtbar bleibt, worum es
 * geht, wenn jemand später eine mehrstöckige Bahn baut.
 */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(WURZEL, 'src');
const lies = (f) => fs.readFileSync(path.join(SRC, f), 'utf8');

const ctx = { console, performance: { now: () => 0 }, window: {}, devicePixelRatio: 1,
              document: { createElement: () => ({ getContext: () => ({}) }) } };
vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow',
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_boule',
                 'courses_pro', 'level', 'obstacles', 'obstacles_legend', 'obstacles_snow', 'obstacles_mine',
                 'physics', 'render'])
  vm.runInContext(lies(`${f}.js`), ctx);

let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

/* ---------------------------------------------------------------------------------------------
 * 1. Die Höhe wirkt nur senkrecht und nur linear
 *
 * Darauf beruht der ganze Kniff: Statt jede Zeichnung um einen Höhenwert zu erweitern, wird die
 * Leinwand verschoben. Das stimmt nur, solange die Höhe die Waagerechte nicht anrührt und der
 * Ausschlag der Höhe proportional bleibt. */
{
  const projRaw = vm.runInContext('Renderer.prototype.projRaw', ctx);
  let quer = 0, krumm = 0;
  for (let i = 0; i < 400; i++) {
    const cam = { fx: i * 0.7 % 13, fy: i * 1.3 % 11, zoom: 20 + (i % 60), tilt: 0.45 + (i % 7) * 0.05,
                  zf: 0.5 + (i % 5) * 0.1, cx: 400, cy: 300, th: (i % 360) * Math.PI / 180 };
    cam.sin = Math.sin(cam.th); cam.cos = Math.cos(cam.th);
    const ich = { cam };
    const x = (i * 2.3) % 30, y = (i * 3.7) % 20, z = 0.5 + (i % 9) * 0.4;
    const a = projRaw.call(ich, x, y, 0), b = projRaw.call(ich, x, y, z), c = projRaw.call(ich, x, y, 2 * z);
    if (Math.abs(a[0] - b[0]) > 1e-9) quer++;                       // Höhe verschiebt nicht seitlich
    if (Math.abs((c[1] - b[1]) - (b[1] - a[1])) > 1e-9) krumm++;    // und zwar in gleichen Schritten
    if (Math.abs((a[1] - b[1]) - z * cam.zoom * cam.zf) > 1e-9) krumm++;
  }
  pruef('die Höhe verschiebt nichts zur Seite', quer === 0, `${400 - quer}/400 Proben`);
  pruef('und sie verschiebt in gleichen Schritten', krumm === 0, `${400 - krumm}/400 Proben`);
}

/* ---------------------------------------------------------------------------------------------
 * 2. Der Weg durch den Zeichner */
{
  const r = lies('render.js'), rl = lies('render_legend.js');
  pruef('Stücke merken sich ihre Ebene', /items\[i\]\.ebene = e/.test(r));
  pruef('und werden beim Zeichnen unten zurückgestellt', /if \(it\.ebene\) continue;/.test(r));
  pruef('zeichneEbenenDinge gibt es', /zeichneEbenenDinge\(ctx, n, t\) \{/.test(r));
  pruef('es verschiebt die Leinwand statt neu zu rechnen', /ctx\.translate\(0, -dy\)/.test(r));
  const rufe = (rl.match(/this\.zeichneEbenenDinge\(/g) || []).length;
  pruef('beide Etagenzeichnungen holen es nach (Scholle und Wolke)', rufe === 2, `${rufe} Aufrufe`);
  pruef('Boden-Überlagerungen oberer Ebenen werden unten ausgelassen',
        /if \(!\(ob\.ebene \|\| 0\) \|\| this\.spanntEbenen\(ob\)\) this\.drawObstacleFloor/.test(r));
  /* Seilbahn, Aufzug und Zahnstange stehen zwischen zwei Etagen und werden eigens gezeichnet
     (drawSpannendeMaschinen). Sie dürfen hier nicht ein zweites Mal drankommen. */
  pruef('die Maschinen zwischen den Etagen bleiben ausgenommen',
        /\(ob\.ebene \|\| 0\) === n && !this\.spanntEbenen\(ob\)/.test(r));
  pruef('und das Kupferrohr ebenfalls', /ob\.type === 'copperpipe' \? 0 :/.test(r));

  /* Es gibt genau eine Regel, wo die Ebene eingerechnet wird: im Versatz der Leinwand. Wer sie
     zusätzlich selbst einrechnet, verdoppelt sie – sein Ding steht dann eine Etage zu hoch.
     Windfahne, Schneebrücke und Bruchwand haben das früher getan. */
  const rs = lies('render_snow.js'), rm = lies('render_mine.js');
  const doppelt = [];
  for (const [datei, text] of [['render_snow.js', rs], ['render_mine.js', rm], ['render.js', r]])
    for (const zeile of text.split('\n')) {
      if (!/\(ob\.ebene \|\| 0\) \* \(?this\.level\.ebeneZ/.test(zeile)) continue;
      if (/Seilbahn|seilbahn/.test(zeile)) continue;
      doppelt.push(`${datei}: ${zeile.trim().slice(0, 60)}`);
    }
  pruef('keine Zeichnung rechnet die Ebene ein zweites Mal ein', doppelt.length === 0, doppelt.join(' | '));
}

/* ---------------------------------------------------------------------------------------------
 * 3. Wen es betrifft */
{
  const listen = ['COURSES', 'SEA_COURSES', 'JUNGLE_COURSES', 'STORM_COURSES', 'SHADOW_COURSES',
                  'COLOSSEUM_COURSES', 'CLOCK_COURSES', 'SNOW_COURSES', 'MINE_COURSES', 'BOULE_COURSES',
                  'PRO_COURSES'];
  const EIGEN = new Set(['seilbahn', 'aufzug', 'zahnstange', 'luke']);   // haben ihren eigenen Weg
  let summe = 0, bahnen = 0;
  for (const name of listen) for (const c of vm.runInContext(name, ctx)) {
    const treffer = (c.obstacles || []).filter(o => (o.ebene || 0) > 0 && !EIGEN.has(o.type));
    if (!treffer.length) continue;
    bahnen++; summe += treffer.length;
    console.log(`        ${c.name}: ${treffer.length} auf einer oberen Ebene`);
  }
  pruef('es gibt überhaupt Hindernisse auf oberen Ebenen', summe > 0, `${summe} auf ${bahnen} Bahnen`);
}

/* ---------- Der Weg nach oben: die Turbine ----------
 * Sie war das Gegenstück zum Fehler oben: Nicht ein Hindernis, das man nicht sah, sondern ein
 * Aufstieg, den man nicht sah. Der Ball stand unten und im nächsten Bild oben - und weil über
 * einer Turbine geschlossener Boden liegen *muß* (sonst fiele der Ball sofort wieder herunter),
 * sah es aus, als käme man einfach durch die Decke. Jetzt trägt sie ihn sichtbar hinauf, und in
 * der Decke darüber liegt eine Luke, die der Stoß aufdrückt. */
{
  const ob = lies('obstacles_legend.js'), rl = lies('render_legend.js'), mj = lies('main.js');
  pruef('die Turbine trägt den Ball, statt ihn zu versetzen',
        /ride\(ball, t, events\)/.test(ob.slice(ob.indexOf('class Turbine'), ob.indexOf('class Turbine') + 2200))
        && !/trigger\(ball, t, events\)/.test(ob.slice(ob.indexOf('class Turbine'), ob.indexOf('class Turbine') + 2200)));
  pruef('unterwegs hängt er an ihr (ball.rider)', /ball\.rider = this;/.test(ob.slice(ob.indexOf('class Turbine'), ob.indexOf('class Turbine') + 2200)));
  pruef('und steigt dabei wirklich (ball.z wächst)', /ball\.z = u \* this\.level\.ebeneZ/.test(ob));
  pruef('über ihr muß Boden sein', /bodenDrueber\(ball\)/.test(ob));
  pruef('die Decke darüber bekommt eine Luke', /drawTurbinenluke\(ctx, ob, z, t\)/.test(rl));
  pruef('und die Luke wird beim Zeichnen der Etage darüber gerufen',
        /ob\.type === 'turbine' && \(ob\.ebene \|\| 0\) \+ 1 === n/.test(rl));
  pruef('sie sagt an, was geschieht', /case 'turbine':/.test(mj));
}

console.log(`\n${fehler ? fehler + ' FEHLER' : 'alles bestanden'}`);
process.exit(fehler ? 1 : 0);
