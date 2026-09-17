/* Prüft die Weltregel der versunkenen Stadt: die Flut und das Pumpwerk.
 *
 *   node tools/flut.mjs
 *
 * WARUM HIER GERECHNET WIRD
 * Die Flut ist die erste Regel im Spiel, die den Boden während der Bahn *wegnimmt*. Alles andere
 * stellt sich in den Weg, schiebt oder trägt – hier verschwindet, worauf man steht. Wenn das
 * schiefgeht, sieht man es nicht als Fehler, sondern als Pech: Die Bahn ist plötzlich unspielbar,
 * und niemand weiß, warum.
 *
 * Geprüft wird darum das, was man auch sagen würde, wenn man die Regel erklärt:
 *   - Am Anfang ist alles trocken; die Ruhe vor dem ersten Steigen gehört dazu.
 *   - Sie frißt sich von außen nach innen, Ring für Ring, und folgt der Form der Bahn.
 *   - Abschlag und Loch bleiben trocken. Ein Loch unter Wasser wäre das Ende der Bahn.
 *   - Sie geht auch wieder zurück. Das ist die Regel, an der die ganze Welt hängt: Eine Flut, die
 *     nur steigt, zerlegt jede Bahn irgendwann in Inseln, und dann ist sie nicht mehr zu lösen.
 *   - Das Pumpwerk gibt Boden zurück – und nur für seine Dauer.
 *   - Beim nächsten Loch steht wieder die trockene Bahn da, nicht die abgesoffene der letzten Runde.
 */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const ctx = { console, performance: { now: () => 0 }, window: {} }; vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow',
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_flut', 'courses_pro', 'level',
                 'obstacles', 'obstacles_legend', 'obstacles_snow', 'obstacles_mine', 'obstacles_flut', 'physics'])
  vm.runInContext(fs.readFileSync(path.join(SRC, `${f}.js`), 'utf8'), ctx);
const G = vm.runInContext('({buildLevel, makeBall, stepPhysics, FLUT_START, FLUT_TAKT, FLUT_MAX, FLUT_HALT})', ctx);

let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

/* Ein Platz mit Rand: außen Abgrund, innen zehn mal sieben Felder Boden. Der Abschlag steht links,
   das Loch rechts – beide auf Boden, der sonst absaufen würde. */
const feld = (hindernisse) => ({
  name: 'Flutprüfung', par: 3, theme: 'stollen',
  map: ['............', '.T########H.', '.##########.', '.##########.',
        '.##########.', '.##########.', '............'],
  obstacles: hindernisse,
});
const flutDef = (extra = {}) => Object.assign({ type: 'flut', start: 4, takt: 2, max: 3 }, extra);
const bau = (extra = {}, mehr = []) => {
  const lv = G.buildLevel(feld([flutDef(extra), ...mehr]));
  return { lv, f: lv.obstacles.find(o => o.type === 'flut') };
};
const kachel = (lv, x, y) => lv.untenFl.tiles[y][x];
const nass = (lv, x, y) => kachel(lv, x, y) === 'w';
const zaehleNass = (lv) => lv.untenFl.tiles.reduce((n, r) => n + r.filter(c => c === 'w').length, 0);

console.log('\n--- Die Flut ---');
{
  const { lv, f } = bau();
  pruef('die Flut wird gebaut', !!f && typeof f.update === 'function');
  f.update(0);
  pruef('am Anfang ist alles trocken', zaehleNass(lv) === 0, `${zaehleNass(lv)} nasse Felder`);
  f.update(3.9);
  pruef('und bleibt es, solange die Ruhe dauert', zaehleNass(lv) === 0, `${zaehleNass(lv)} nasse Felder`);

  /* Erste Stufe: alles, was an den Abgrund grenzt. Das sind die Randfelder – nicht die Mitte. */
  f.update(4.1);
  const randNass = nass(lv, 1, 2) && nass(lv, 10, 5);
  const mitteTrocken = !nass(lv, 5, 3);
  pruef('die erste Stufe frißt den Rand', randNass && mitteTrocken,
        `Rand ${randNass ? 'nass' : 'trocken'}, Mitte ${mitteTrocken ? 'trocken' : 'nass'}`);

  f.update(6.1);
  pruef('die zweite Stufe geht einen Ring weiter', nass(lv, 2, 3), `Feld (2,3) ${kachel(lv, 2, 3)}`);
  const vorher = zaehleNass(lv);
  f.update(8.1);
  pruef('und die dritte noch einen', zaehleNass(lv) > vorher, `${vorher} → ${zaehleNass(lv)}`);
  const beiMax = zaehleNass(lv);
  f.update(40);
  pruef('weiter als bis zur Höchststufe steigt sie nicht', zaehleNass(lv) === beiMax, `${beiMax} → ${zaehleNass(lv)}`);

  /* Abschlag und Loch: die Insel, auf die man sich retten kann. */
  const tee = [Math.floor(lv.tee.x), Math.floor(lv.tee.y)], loch = [Math.floor(lv.cup.x), Math.floor(lv.cup.y)];
  pruef('der Abschlag bleibt trocken', !nass(lv, tee[0], tee[1]), `(${tee}) = ${kachel(lv, tee[0], tee[1])}`);
  pruef('und das Loch auch', !nass(lv, loch[0], loch[1]), `(${loch}) = ${kachel(lv, loch[0], loch[1])}`);
}

console.log('\n--- Das Pumpwerk ---');
{
  const { lv, f } = bau({}, [{ type: 'pumpwerk', x: 3.5, y: 2.5, stufen: 2, dauer: 5 }]);
  const p = lv.obstacles.find(o => o.type === 'pumpwerk');
  pruef('das Pumpwerk wird gebaut', !!p && typeof p.trigger === 'function');
  f.update(8.1);                                  // dritte Stufe, alles nass, was absaufen kann
  const vollNass = zaehleNass(lv);
  // Ball auf die Platte legen und einen Schritt rechnen
  const b = G.makeBall(3.5, 2.5, '#fff');
  const ev = G.stepPhysics(lv, b, 1 / 240, 8.1, true);
  pruef('es meldet sich, wenn der Ball darüber rollt', ev.some(e => e.type === 'pumpe'));
  f.update(8.2);
  const zurueck = zaehleNass(lv);
  pruef('und drückt die Flut zurück', zurueck < vollNass, `${vollNass} → ${zurueck} nasse Felder`);
  f.update(8.1 + 5.5);                            // nach Ablauf der Dauer
  pruef('danach kommt sie wieder', zaehleNass(lv) >= vollNass, `${zurueck} → ${zaehleNass(lv)}`);
}

console.log('\n--- Die Tide: sie geht auch wieder ---');
{
  /* Die wichtigste Prüfung dieser Datei. Beim ersten Entwurf stieg die Flut nur, und die Probebahn
     zerfiel bei voller Stufe in zwei Inseln: Abschlag hier, Loch dort, dazwischen Wasser. Über
     Wasser rollen heißt versinken – die Bahn war ab da nicht mehr zu gewinnen, nur noch zu Ende zu
     zählen. Darum steht hier Zahl für Zahl, daß ein voller Tidenlauf wirklich einmal herum geht. */
  const takt = 2, max = 3, halt = 5, start = 4;
  const { lv, f } = bau({ start, takt, max, halt });
  const stufeBei = (t) => { f.update(t); return f.stufe; };
  const hoch = max * takt;                       // 6 s steigen, dann 5 s oben, dann 6 s fallen, 5 s unten
  pruef('ein Tidenlauf ist so lang wie zweimal Steigen plus zweimal Stehen',
        f.zyklus() === 2 * hoch + 2 * halt, `${f.zyklus()} s`);

  const lauf = [];
  for (let t = start; t < start + f.zyklus(); t += takt / 2) lauf.push(stufeBei(t + 0.01));
  pruef('sie steigt bis zur Höchststufe', Math.max(...lauf) === max, `höchste Stufe ${Math.max(...lauf)}`);
  pruef('und kommt wieder auf null herunter', Math.min(...lauf.slice(2)) === 0,
        `niedrigste Stufe nach dem Steigen ${Math.min(...lauf.slice(2))}`);

  // Steigen und Fallen einzeln nachgehen, damit ein Fehler sagt, *wo* es klemmt.
  pruef('Stufe für Stufe hinauf',
        [1, 2, 3].every((n, i) => stufeBei(start + i * takt + 0.01) === n),
        [0, 1, 2].map(i => stufeBei(start + i * takt + 0.01)).join(','));
  pruef('oben steht sie still',
        stufeBei(start + hoch + 0.01) === max && stufeBei(start + hoch + halt - 0.01) === max);
  pruef('Stufe für Stufe hinunter',
        [2, 1, 0].every((n, i) => stufeBei(start + hoch + halt + i * takt + 0.01) === n),
        [0, 1, 2].map(i => stufeBei(start + hoch + halt + i * takt + 0.01)).join(','));
  pruef('unten steht sie still und alles ist wieder trocken',
        stufeBei(start + 2 * hoch + halt + 0.01) === 0 && zaehleNass(lv) === 0,
        `${zaehleNass(lv)} nasse Felder`);

  /* Und die Runde danach fängt genauso an – sonst wäre es keine Tide, sondern ein einmaliger Lauf. */
  pruef('und dann fängt sie von vorn an',
        stufeBei(start + f.zyklus() + takt + 0.01) === 2,
        `Stufe ${f.stufe}`);

  /* Die Ansage gilt nur für steigendes Wasser: Zurückgehendes gibt Boden her und ist keine Gefahr.
     Die Zeichnung hängt daran (src/render_flut.js prüft ob.steigt). */
  f.update(start + takt + 0.01);
  pruef('beim Steigen ist die Ansage an', f.steigt === true);
  f.update(start + hoch + halt + takt + 0.01);
  pruef('beim Fallen ist sie aus', f.steigt === false);
  const zeichnung = fs.readFileSync(path.join(SRC, 'render_flut.js'), 'utf8');
  pruef('und die Zeichnung fragt danach', /if \(!ob\.steigt\) return;/.test(zeichnung));
}

console.log('\n--- Beim nächsten Loch ---');
{
  /* Dieselbe Bahn ein zweites Mal aufbauen: Es muß wieder die trockene dastehen. Beim Gießlöffel
     war das derselbe Fallstrick – die zweite Runde fand sonst die Brücke der ersten vor. */
  const erste = bau();
  erste.f.update(40);
  pruef('die erste Runde säuft ab', zaehleNass(erste.lv) > 0, `${zaehleNass(erste.lv)} nasse Felder`);
  const zweite = bau();
  zweite.f.update(0);
  pruef('die zweite fängt trocken an', zaehleNass(zweite.lv) === 0, `${zaehleNass(zweite.lv)} nasse Felder`);
}

console.log('\n--- Die Bahnen der Welt ---');
{
  /* tools/flut.py rechnet dieselben Ringnummern noch einmal in Python, um eine Bahn schon beim
     Bauen beurteilen zu können. Zwei Rechnungen, die dasselbe tun sollen, laufen mit der Zeit
     auseinander – darum wird hier nicht der Quelltext verglichen, sondern das Ergebnis: Was die
     laufende Maschine auf den fertigen Bahnen anrichtet, muß zu dem passen, was flut.py
     versprochen hat. */
  const BAHNEN = vm.runInContext('FLUT_COURSES', ctx);
  pruef('es gibt Bahnen in der Welt', BAHNEN.length > 0, `${BAHNEN.length} Bahnen`);
  for (const def of BAHNEN) {
    const lv = G.buildLevel(def);
    const f = lv.obstacles.find(o => o.type === 'flut');
    if (!f) { pruef(`„${def.name}" hat eine Flut`, false); continue; }
    f.update(0);
    /* „Trocken" heißt nicht „kein Wasser auf der Bahn": Der Kai hat ein Hafenbecken, das von Anfang
       an dasteht. Verglichen wird darum mit dem Wasser, das in der Karte selbst steht. */
    const urNass = def.map.reduce((n, z) => n + [...z].filter(c => c === 'w').length, 0);
    const trockenAnfang = lv.untenFl.tiles.reduce((n, r) => n + r.filter(c => c !== 'w' && lv.isFloorChar(c)).length, 0);
    pruef(`„${def.name}" fängt trocken an`, zaehleNass(lv) === urNass,
          `${zaehleNass(lv)} nasse Felder, in der Karte stehen ${urNass}`);
    // Auf die Höchststufe fahren, ohne auf den Takt der Bahn angewiesen zu sein
    f.update(f.start + f.max * f.takt + 0.01);
    pruef(`… erreicht die Höchststufe`, f.stufe === f.max, `Stufe ${f.stufe} von ${f.max}`);
    const trockenEnde = lv.untenFl.tiles.reduce((n, r) => n + r.filter(c => c !== 'w' && lv.isFloorChar(c)).length, 0);
    pruef(`… und nimmt dabei mehr als die Hälfte des Bodens`,
          trockenEnde <= trockenAnfang * 0.45,
          `${trockenAnfang} → ${trockenEnde} (${Math.round(100 * trockenEnde / trockenAnfang)} %)`);
    const tee = [Math.floor(lv.tee.x), Math.floor(lv.tee.y)], loch = [Math.floor(lv.cup.x), Math.floor(lv.cup.y)];
    pruef(`… Abschlag und Loch bleiben trocken`,
          !nass(lv, tee[0], tee[1]) && !nass(lv, loch[0], loch[1]),
          `Abschlag ${kachel(lv, tee[0], tee[1])}, Loch ${kachel(lv, loch[0], loch[1])}`);
    // Und am Ende der Tide steht die Bahn wieder da, wie sie war
    f.update(f.start + f.zyklus() - 0.01);
    pruef(`… und nach der Tide ist sie wieder ganz`, zaehleNass(lv) === urNass,
          `${zaehleNass(lv)} nasse Felder, in der Karte stehen ${urNass}`);
  }
}

console.log('\n--- Der Rückweg nach dem Ertrinken ---');
{
  /* Die gefährlichste Stelle der ganzen Regel, und sie steht nicht hier, sondern in main.js:
     Wer ertrinkt, wird an seinen Ruhepunkt zurückgelegt. Ist der inzwischen selbst Wasser, ertrinkt
     er dort sofort wieder – und noch einmal, bis das Schlaglimit erreicht ist. 'isFloorChar' hilft
     dagegen nicht, denn Wasser *ist* Boden für die Physik.
     Geprüft wird darum am Quelltext, daß nach trockenem Boden gesucht wird und nicht nur nach
     Boden. Verhalten prüft die Browserprobe der Welt. */
  const haupt = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8');
  pruef('main.js kennt trockenen Boden', /const trockenerBoden = /.test(haupt));
  pruef('und sucht den Ruhepunkt danach aus', /trockenerBoden\(lv, e, x, y\)\) return \{ x, y, e \}/.test(haupt));
  pruef('und sucht ringsum weiter, wenn nichts Gemerktes trocken ist', /for \(let r = 0\.8; r <= 12; r \+= 0\.8\)/.test(haupt));
}

console.log(`\n${fehler ? fehler + ' FEHLER' : 'alles bestanden'}`);
process.exit(fehler ? 1 : 0);
