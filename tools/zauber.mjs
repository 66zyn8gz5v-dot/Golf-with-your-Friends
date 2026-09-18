/* Prüft die Maschinen des Zauberreichs.
 *
 *   node tools/zauber.mjs
 *
 * WARUM HIER GERECHNET WIRD. Beide Maschinen dieser Welt haben einen Zustand, der sich ändert, und
 * beide tun im falschen Zustand etwas anderes als im richtigen. So etwas sieht man beim Spielen
 * nicht als Fehler, sondern als Pech: Die Ranke trägt nicht, obwohl man die Blüte getroffen hat –
 * und man denkt, man sei zu langsam gewesen. Darum wird hier gemessen statt vermutet.
 *
 * Geprüft wird das, was man auch sagen würde, wenn man die Maschinen erklärt:
 *   - Über die Lücke kommt nur, wer vorher die Blüte anstößt.
 *   - Die Ranke trägt genau so lange, wie sie soll – nicht länger.
 *   - Wer in einen Hut rollt, kommt aus dem leuchtenden heraus; wer in den leuchtenden rollt,
 *     aus dem nächsten. Es gibt keine Sackgasse.
 *   - Das Leuchten wandert im Takt und ist vorher angekündigt.
 */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const ctx = { console, performance: { now: () => 0 }, window: {} }; vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow',
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_flut', 'courses_zauber', 'courses_pro', 'level',
                 'obstacles', 'obstacles_legend', 'obstacles_snow', 'obstacles_mine', 'obstacles_flut', 'obstacles_zauber', 'physics'])
  vm.runInContext(fs.readFileSync(path.join(SRC, `${f}.js`), 'utf8'), ctx);
const G = vm.runInContext('({buildLevel, makeBall, stepPhysics, RANKE_DAUER, HUT_TAKT, HUT_VORWARN})', ctx);

let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

/* Eine gerade Bahn, zwanzig Felder lang. Die Brücke liegt in der Mitte; ihre Felder sind ganz
   gewöhnlicher Boden – daß man dort hindurchfällt, ist allein Sache der Maschine. */
/* Der Gang ist absichtlich nur eine Kachel hoch: So kann der Ball die Lücke nicht seitlich
   umfahren, und was gemessen wird, ist wirklich die Brücke und nicht die Wegwahl. */
const BAHN = ['......................', '.T##################H.', '......................'];
const bau = (hindernisse) => G.buildLevel({ name: 'Zauberprobe', par: 3, theme: 'lehrlingsgarten', map: BAHN, obstacles: hindernisse });

/* Rollt den Ball von links nach rechts und sagt, was unterwegs passiert ist. */
function rolle(lv, tempo, sekunden = 8, startT = 0) {
  const b = G.makeBall(1.5, 1.5, '#fff', 'none');
  b.vx = tempo; b.vy = 0;
  const dt = 1 / 120;
  const gesehen = new Set();
  let t = startT;
  for (let i = 0; i < sekunden * 120; i++) {
    const ev = G.stepPhysics(lv, b, dt, t, true);
    for (const e of ev) gesehen.add(e.type);
    t += dt;
    if (gesehen.has('oob') || gesehen.has('sunk')) break;
  }
  return { b, gesehen, x: b.x, t };
}

/* ---------- Die Rankenbrücke ---------- */
console.log('\nDie Rankenbrücke');
{
  // Die Lücke liegt bei x 9..12, die Blüte davor bei x 6. Ohne Blüte kein Weg.
  const def = { type: 'ranke', x: 9, y: 1, w: 4, h: 1, dauer: 4, r: 0.6, bluete: { x: 6.5, y: 1.5 } };
  // Ohne Blüte: eine Bahn, auf der die Blüte weit ab vom Weg liegt
  const ohne = bau([Object.assign({}, def, { bluete: { x: 6.5, y: 20 } })]);
  const a = rolle(ohne, 12);
  pruef('ohne Blüte fällt der Ball in die Lücke', a.gesehen.has('oob'), `bis x=${a.x.toFixed(1)}`);

  const mit = bau([def]);
  const c = rolle(mit, 12);
  pruef('mit Blüte und genug Schwung trägt sie hinüber', !c.gesehen.has('oob') && c.gesehen.has('ranke'),
        `x=${c.x.toFixed(1)}, Ereignisse: ${[...c.gesehen].join(',') || 'keine'}`);

  /* Das ist die eigentliche Aufgabe der Maschine, und sie ist hier gemessen: Wer die Blüte trifft,
     aber zu sacht schlägt, bleibt AUF der Brücke liegen – und fällt, sobald die Ranke welkt. Ein
     zu harter Schlag schießt hinaus, ein zu weicher kommt nicht an. Dazwischen liegt das Fenster. */
  const knapp = bau([def]);
  const k = rolle(knapp, 9);
  pruef('wer zu sacht schlägt, bleibt liegen und fällt mit der Ranke',
        k.gesehen.has('ranke') && k.gesehen.has('oob') && k.x > 9 && k.x < 13.5, `liegengeblieben bei x=${k.x.toFixed(1)}`);

  // Die Uhr läuft: wer danach noch einmal darüber will, fällt wieder
  const r = mit.obstacles.find(o => o.type === 'ranke');
  pruef('sie trägt genau so lange wie angegeben',
        r.traegt(c.t) === (c.t <= r.bisT) && r.traegt(r.bisT + 0.01) === false,
        `bis t=${r.bisT.toFixed(2)}`);
  pruef('danach ist der Boden wieder weg', !r.traegt(r.bisT + 0.5));
  pruef('sie wächst sichtbar und welkt sichtbar',
        r.stand(r.abT) < 0.2 && r.stand(r.abT + 0.4) > 0.9 && r.stand(r.bisT + 0.25) < 0.9 && r.stand(r.bisT + 1) === 0);

  // Ein zu langsamer Ball stößt die Blüte an, kommt aber nicht mehr hinüber: die eigentliche Aufgabe
  const langsam = bau([Object.assign({}, def, { dauer: 0.8 })]);
  const d = rolle(langsam, 12);
  pruef('mit zu kurzer Ranke fällt er trotz Blüte', d.gesehen.has('oob'), `x=${d.x.toFixed(1)}`);
}

/* ---------- Die Zauberhüte ---------- */
console.log('\nDie Zauberhüte');
{
  const def = { type: 'zauberhut', takt: 2, r: 0.5, phase: 0, plaetze: [[6, 1.5], [12, 1.5], [18, 1.5]] };
  const lv = bau([def]);
  const h = lv.obstacles.find(o => o.type === 'zauberhut');
  pruef('drei Hüte stehen bereit', h.bereit && h.orte.length === 3);

  // Das Leuchten wandert im Takt
  const folge = [];
  for (let i = 0; i < 6; i++) { h.update(i * 2 + 0.1); folge.push(h.aktiv); }
  pruef('das Leuchten wandert im Takt reihum', folge.join(',') === '0,1,2,0,1,2', folge.join(','));

  // Vorwarnung: kurz vor dem Wechsel glimmt der nächste auf
  h.update(1.0); const frueh = h.gleich;
  h.update(1.95); const spaet = h.gleich;
  pruef('der nächste Hut glimmt vorher auf', frueh === 0 && spaet > 0.8, `${frueh} → ${spaet.toFixed(2)}`);

  // Wer in einen Hut rollt, kommt aus dem leuchtenden heraus
  h.update(0.5);                                   // Hut 0 leuchtet
  const b = G.makeBall(12, 1.5, '#fff', 'none');   // Ball in Hut 1
  b.vx = 4; b.portalCd = 0;
  const ev = [];
  h.teleport(b, 0.5, ev);
  pruef('aus einem dunklen Hut geht es zum leuchtenden',
        ev.length === 1 && Math.abs(b.x - 6) < 1.2, `x=${b.x.toFixed(2)}`);

  // Und wer in den leuchtenden rollt, kommt aus dem nächsten – keine Sackgasse
  const b2 = G.makeBall(6, 1.5, '#fff', 'none');
  b2.vx = 4; b2.portalCd = 0;
  const ev2 = [];
  h.teleport(b2, 0.5, ev2);
  pruef('aus dem leuchtenden Hut geht es zum nächsten – keine Sackgasse',
        ev2.length === 1 && Math.abs(b2.x - 12) < 1.2, `x=${b2.x.toFixed(2)}`);

  // Zweimal hintereinander springt er nicht: die Sperre nach dem Sprung gilt
  const ev3 = [];
  h.teleport(b2, 0.51, ev3);
  pruef('nach dem Sprung ist er kurz gesperrt', ev3.length === 0 && b2.portalCd > 0);

  // Ein Hut allein ist keine Maschine und darf nichts tun
  const einzeln = bau([{ type: 'zauberhut', plaetze: [[6, 1.5]] }]);
  const e = einzeln.obstacles.find(o => o.type === 'zauberhut');
  pruef('ein einzelner Hut bleibt wirkungslos statt abzustürzen', !e.bereit);
}

console.log(fehler ? `\n${fehler} Fehler` : '\nalles bestanden');
process.exit(fehler ? 1 : 0);
