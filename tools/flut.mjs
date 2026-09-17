/* Prüft die Maschinen der versunkenen Stadt: das Flutbecken und das Pumpwerk.
 *
 *   node tools/flut.mjs
 *
 * WARUM HIER GERECHNET WIRD
 * Das Becken ist die erste Maschine im Spiel, die den Boden *wegnimmt*. Alles andere stellt sich in
 * den Weg, schiebt oder trägt – hier verschwindet, worauf man steht. Geht das schief, sieht man es
 * nicht als Fehler, sondern als Pech: Die Bahn ist plötzlich unspielbar, und niemand weiß, warum.
 *
 * DIE WICHTIGSTE PRÜFUNG IST DIE GEGEN DAS WARTEN.
 * In der ersten Fassung stieg das Wasser über die ganze Bahn. Das war gut gedacht und schlecht zu
 * spielen: Wer den Augenblick verpaßte, konnte nichts tun als zusehen. Jetzt ist es ein Becken an
 * einer Stelle, und dazu gehören zwei Zahlen, die hier festgehalten werden:
 *   - Auf jeder fertigen Bahn führt auch bei *vollem* Becken ein Weg zum Loch.
 *   - Ein Lauf dauert höchstens FLUT_GEDULD Sekunden.
 *
 * Dazu das, was man auch sagen würde, wenn man die Maschine erklärt: Sie läuft von außen nach innen
 * voll, außerhalb des Beckens bleibt alles trocken, Abschlag und Loch bleiben frei, sie läuft wieder
 * leer, das Pumpwerk hält sie leer, und beim nächsten Loch steht wieder die trockene Bahn da.
 */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const ctx = { console, performance: { now: () => 0 }, window: {} }; vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow',
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_flut', 'courses_pro', 'level',
                 'obstacles', 'obstacles_legend', 'obstacles_snow', 'obstacles_mine', 'obstacles_flut', 'physics'])
  vm.runInContext(fs.readFileSync(path.join(SRC, `${f}.js`), 'utf8'), ctx);
const G = vm.runInContext('({buildLevel, makeBall, stepPhysics, FLUT_START, FLUT_TAKT, FLUT_MAX, FLUT_HALT, FLUT_LEER, STROM_KRAFT, STROM_TEMPO, FRICTION})', ctx);
const GEDULD = 15;                      // muß zu FLUT_GEDULD in tools/flut.py passen

let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

/* Ein Platz mit Rand: außen Abgrund, innen zwölf mal fünf Felder Boden. Das Becken liegt mittendrin
   und läßt links und rechts Platz – da steht der Abschlag, da steht das Loch. */
const feld = (hindernisse) => ({
  name: 'Beckenprüfung', par: 3, theme: 'stollen',
  map: ['..............', '.T##########H.', '.############.', '.############.',
        '.############.', '.############.', '..............'],
  obstacles: hindernisse,
});
/* Becken über die Kacheln 4..9 / 2..5: vier Reihen hoch, also zwei Ringe tief. */
const beckenDef = (extra = {}) => Object.assign(
  { type: 'flut', x: 7, y: 4, w: 6, h: 4, start: 2, takt: 1, halt: 1, leer: 2 }, extra);
const bau = (extra = {}, mehr = []) => {
  const lv = G.buildLevel(feld([beckenDef(extra), ...mehr]));
  return { lv, f: lv.obstacles.find(o => o.type === 'flut') };
};
const kachel = (lv, x, y) => lv.untenFl.tiles[y][x];
const nass = (lv, x, y) => kachel(lv, x, y) === 'w';
const zaehleNass = (lv) => lv.untenFl.tiles.reduce((n, r) => n + r.filter(c => c === 'w').length, 0);

/* Führt ein trockener Weg vom Abschlag zum Loch, so wie die Bahn gerade dasteht? */
function wegDa(lv) {
  const T = lv.untenFl.tiles, H = T.length, W = T[0].length;
  const gut = (x, y) => x >= 0 && y >= 0 && x < W && y < H
    && lv.isFloorChar(T[y][x]) && T[y][x] !== 'w' && T[y][x] !== 'l';
  const start = [Math.floor(lv.tee.x), Math.floor(lv.tee.y)];
  const ziel = `${Math.floor(lv.cup.x)},${Math.floor(lv.cup.y)}`;
  const gesehen = new Set([start.join(',')]); const q = [start];
  for (let i = 0; i < q.length; i++) {
    const [x, y] = q[i];
    if (`${x},${y}` === ziel) return true;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy, k = `${nx},${ny}`;
      if (gesehen.has(k) || !gut(nx, ny)) continue;
      gesehen.add(k); q.push([nx, ny]);
    }
  }
  return false;
}

console.log('\n--- Das Becken ---');
{
  const { lv, f } = bau();
  pruef('das Becken wird gebaut', !!f && typeof f.update === 'function');
  f.update(0);
  pruef('am Anfang ist alles trocken', zaehleNass(lv) === 0, `${zaehleNass(lv)} nasse Felder`);
  f.update(1.9);
  pruef('und bleibt es, solange die Ruhe dauert', zaehleNass(lv) === 0, `${zaehleNass(lv)} nasse Felder`);

  /* Die Tiefe kommt aus der Form, nicht aus einer Zahl in der Bahn: vier Reihen hoch, also zwei
     Ringe. Daran hängt der ganze Takt – und damit, wie lange man wartet. */
  pruef('die Tiefe ergibt sich aus der Form', f.tiefe === 2 && f.max === 2, `Tiefe ${f.tiefe}, max ${f.max}`);

  /* Erste Stufe: der Beckenrand. Die Mitte bleibt noch. */
  f.update(2.1);
  pruef('die erste Stufe frißt den Beckenrand', nass(lv, 4, 2) && nass(lv, 9, 5), 'Ecken nass');
  pruef('und die Beckenmitte bleibt noch', !nass(lv, 6, 3), `Feld (6,3) ${kachel(lv, 6, 3)}`);
  f.update(3.1);
  pruef('die zweite Stufe nimmt auch die Mitte', nass(lv, 6, 3), `Feld (6,3) ${kachel(lv, 6, 3)}`);

  /* Die eigentliche Neuerung gegenüber der Weltregel: Außerhalb des Beckens passiert nichts. */
  const drumherum = [[1, 1], [2, 3], [3, 5], [10, 2], [12, 4], [12, 1]];
  const trockenDraussen = drumherum.every(([x, y]) => !nass(lv, x, y));
  pruef('außerhalb des Beckens bleibt alles trocken', trockenDraussen,
        drumherum.map(([x, y]) => kachel(lv, x, y)).join(''));
  pruef('und genau so viele Felder sind nass wie das Becken groß ist', zaehleNass(lv) === 6 * 4,
        `${zaehleNass(lv)} von ${6 * 4}`);

  /* Abschlag und Loch: sie liegen hier außerhalb, aber die Sicherung muß trotzdem stehen. */
  const tee = [Math.floor(lv.tee.x), Math.floor(lv.tee.y)], loch = [Math.floor(lv.cup.x), Math.floor(lv.cup.y)];
  pruef('der Abschlag bleibt trocken', !nass(lv, tee[0], tee[1]), `(${tee}) = ${kachel(lv, tee[0], tee[1])}`);
  pruef('und das Loch auch', !nass(lv, loch[0], loch[1]), `(${loch}) = ${kachel(lv, loch[0], loch[1])}`);
}

console.log('\n--- Der Takt: es läuft auch wieder leer ---');
{
  /* Die Prüfung, an der die ganze Welt hängt. Beim ersten Entwurf stieg das Wasser über die ganze
     Bahn und blieb lange oben; wer den Augenblick verpaßte, konnte nur zusehen. Darum steht hier
     Zahl für Zahl, daß ein Lauf wirklich einmal herumgeht – und wie lange er dauert. */
  const takt = 1, max = 2, halt = 1, leer = 2, start = 2;
  const { lv, f } = bau({ start, takt, halt, leer });
  const stufeBei = (t) => { f.update(t); return f.stufe; };
  const hoch = max * takt;
  pruef('ein Lauf ist Steigen + Vollstehen + Fallen + Leerstehen',
        f.zyklus() === 2 * hoch + halt + leer, `${f.zyklus()} s`);
  pruef('und er dauert nicht länger als die Geduld erlaubt', f.zyklus() <= GEDULD,
        `${f.zyklus()} s, erlaubt ${GEDULD} s`);
  /* Leer steht es länger als voll – das Leerstehen ist das Fenster zum Durchspielen. */
  pruef('leer steht es länger als voll', f.leer > f.halt, `${f.leer} s gegen ${f.halt} s`);

  pruef('Stufe für Stufe hinauf', [1, 2].every((n, i) => stufeBei(start + i * takt + 0.01) === n),
        [0, 1].map(i => stufeBei(start + i * takt + 0.01)).join(','));
  pruef('voll steht es still',
        stufeBei(start + hoch + 0.01) === max && stufeBei(start + hoch + halt - 0.01) === max);
  pruef('Stufe für Stufe hinunter',
        [1, 0].every((n, i) => stufeBei(start + hoch + halt + i * takt + 0.01) === n),
        [0, 1].map(i => stufeBei(start + hoch + halt + i * takt + 0.01)).join(','));
  pruef('leer steht es still und der Boden ist wieder da',
        stufeBei(start + 2 * hoch + halt + 0.01) === 0 && zaehleNass(lv) === 0,
        `${zaehleNass(lv)} nasse Felder`);
  pruef('und dann fängt es von vorn an', stufeBei(start + f.zyklus() + takt + 0.01) === 2,
        `Stufe ${f.stufe}`);

  /* Die Ansage gilt nur für steigendes Wasser: Zurückgehendes gibt Boden her und ist keine Gefahr. */
  f.update(start + takt + 0.01);
  pruef('beim Steigen ist die Ansage an', f.steigt === true);
  f.update(start + hoch + halt + takt + 0.01);
  pruef('beim Fallen ist sie aus', f.steigt === false);
  const zeichnung = fs.readFileSync(path.join(SRC, 'render_flut.js'), 'utf8');
  pruef('und die Zeichnung fragt danach', /if \(!ob\.steigt\)/.test(zeichnung));
  /* Und das Becken muß auch trocken zu sehen sein – sonst ist es eine Falle ohne Ansage. */
  pruef('das leere Becken wird trotzdem gezeichnet', /1\. Das Becken selbst/.test(zeichnung));
  pruef('mit einer Kante ringsum', /Die Beckenkante/.test(zeichnung));
}

console.log('\n--- Durchrollen: leer geht, voll nicht ---');
{
  /* Die Probe, die am nächsten an dem ist, was Fynn tut: einen Ball quer durchs Becken schicken.
     Sie hat schon einmal etwas gefunden, was keine Zahl zeigte – das Leerstehen war mit 3,2 s so
     kurz, daß der Ball unterwegs davon eingeholt wurde, obwohl beim Schlag alles frei war. Darum
     steht sie hier und nicht nur in der Browserprobe. */
  const rollen = (t0) => {
    const { lv, f } = bau();
    const b = G.makeBall(1.5, 3.5, '#fff');
    b.vx = 9; b.vy = 0;                       // quer über das Becken, von links nach rechts
    let t = t0, ertrunken = false;
    for (let i = 0; i < 240 * 4 && !ertrunken; i++) {
      t += 1 / 240;
      const ev = G.stepPhysics(lv, b, 1 / 240, t, true);
      if (ev.some(e => e.type === 'water')) ertrunken = true;
      if (Math.hypot(b.vx, b.vy) < 0.05) break;
    }
    return { ertrunken, x: +b.x.toFixed(1), stufe: f.stufe };
  };
  /* Takt der Prüfbahn: start 2, takt 1, max 2, halt 1, leer 2 → Lauf 7 s.
     Leer steht es von p = 5 bis 7, also von t = 7 bis 9. Voll von p = 2 bis 3, also t = 4 bis 5. */
  const leerLauf = rollen(7.2);
  pruef('durch das leere Becken rollt der Ball hindurch', !leerLauf.ertrunken && leerLauf.x > 9,
        `bis x = ${leerLauf.x}, Stufe beim Ankommen ${leerLauf.stufe}`);
  const vollLauf = rollen(4.1);
  pruef('durch das volle geht er unter', vollLauf.ertrunken,
        `bis x = ${vollLauf.x}, Stufe ${vollLauf.stufe}`);
}

console.log('\n--- Das Pumpwerk ---');
{
  const { lv, f } = bau({}, [{ type: 'pumpwerk', x: 2.5, y: 2.5, dauer: 5 }]);
  const p = lv.obstacles.find(o => o.type === 'pumpwerk');
  pruef('das Pumpwerk wird gebaut', !!p && typeof p.trigger === 'function');
  f.update(3.1);                                  // voll
  const vollNass = zaehleNass(lv);
  const b = G.makeBall(2.5, 2.5, '#fff');
  const ev = G.stepPhysics(lv, b, 1 / 240, 3.1, true);
  pruef('es meldet sich, wenn der Ball darüber rollt', ev.some(e => e.type === 'pumpe'));
  f.update(3.2);
  pruef('und hält das Becken leer', zaehleNass(lv) === 0, `${vollNass} → ${zaehleNass(lv)} nasse Felder`);
  /* Und danach nimmt der Takt seinen Lauf wieder auf. Der Zeitpunkt ist mit Bedacht gewählt: Der
     Druck endet bei 8,1 s, und der nächste Augenblick, in dem das Becken *voll* stehen muß, liegt
     eine Laufrunde später. Ein blind genommener Zeitpunkt träfe die Leerphase und bewiese nichts. */
  const vollWieder = 2 + f.zyklus() + f.max * f.takt + 0.5;   // 11,5 s
  f.update(vollWieder);
  pruef('danach läuft es wieder voll', zaehleNass(lv) === vollNass,
        `bei ${vollWieder} s: ${zaehleNass(lv)} von ${vollNass}`);
}

console.log('\n--- Beim nächsten Loch ---');
{
  /* Dieselbe Bahn ein zweites Mal aufbauen: Es muß wieder die trockene dastehen. Beim Gießlöffel
     war das derselbe Fallstrick – die zweite Runde fand sonst die Brücke der ersten vor. */
  const erste = bau();
  erste.f.update(3.1);
  pruef('die erste Runde läuft voll', zaehleNass(erste.lv) > 0, `${zaehleNass(erste.lv)} nasse Felder`);
  const zweite = bau();
  zweite.f.update(0);
  pruef('die zweite fängt trocken an', zaehleNass(zweite.lv) === 0, `${zaehleNass(zweite.lv)} nasse Felder`);
}

console.log('\n--- Die Strömung ---');
{
  /* Eine leere Bahn, quer darüber ein Strömungsband. Gerechnet wird mit der echten Physik: Was
     hier steht, ist das, was der Ball wirklich tut, nicht was die Formel verspricht. */
  const bahn = (hind) => G.buildLevel({
    name: 'Strömungsprüfung', par: 3, theme: 'stollen',
    map: ['................', '.T############H.', '.##############.', '.##############.',
          '.##############.', '.##############.', '................'],
    obstacles: hind,
  });
  const strom = (extra = {}) => Object.assign({ type: 'stroemung', x: 8, y: 3.5, w: 6, h: 5, angle: 90 }, extra);

  /* Die Zahl, an der alles hängt: Unter der Reibung bewegt eine Kraft einen liegenden Ball GAR
     NICHT (Math.max(0, sp - dec) frißt sie auf). Dieselbe Falle hat die Kippbühne zu Fall gebracht. */
  pruef('die Strömung ist stärker als die Reibung auf Stein',
        G.STROM_KRAFT > G.FRICTION['#'] * 1.5,
        `${G.STROM_KRAFT} gegen ${G.FRICTION['#']}`);

  /* Und die Probe dazu, in Bewegung: ein Ball, der im Band zur Ruhe kommt, darf nicht liegen
     bleiben. Das ist der ganze Unterschied zum Wind – im Wind darf man in Ruhe zielen. */
  const treiben = (hind, x, y, sek) => {
    const lv = bahn(hind);
    const b = G.makeBall(x, y, '#fff');
    for (let i = 0; i < 240 * sek; i++) G.stepPhysics(lv, b, 1 / 240, i / 240, true);
    return { x: +b.x.toFixed(2), y: +b.y.toFixed(2), v: +Math.hypot(b.vx, b.vy).toFixed(2) };
  };
  const drin = treiben([strom()], 8.5, 1.5, 1.5);
  pruef('ein liegender Ball im Band treibt ab', drin.y > 2.4,
        `von y = 1.5 nach y = ${drin.y}`);
  const daneben = treiben([strom()], 2.5, 1.5, 1.5);
  pruef('und einer daneben bleibt liegen', Math.abs(daneben.y - 1.5) < 0.05 && daneben.v < 0.05,
        `y = ${daneben.y}, Tempo ${daneben.v}`);

  /* Sie darf nicht ins Unendliche beschleunigen – sonst ist sie keine Strömung, sondern eine
     Kanone. Geprüft an einem langen Band, damit wirklich Zeit zum Beschleunigen ist. */
  const langes = { type: 'stroemung', x: 8, y: 3.5, w: 12, h: 5, angle: 0, tempo: 5 };
  const lv = bahn([langes]);
  const b = G.makeBall(2.5, 3.5, '#fff');
  let schnellstes = 0;
  for (let i = 0; i < 240 * 4; i++) {
    G.stepPhysics(lv, b, 1 / 240, i / 240, true);
    schnellstes = Math.max(schnellstes, Math.hypot(b.vx, b.vy));
  }
  pruef('sie zieht nur bis auf ihr eigenes Tempo', schnellstes <= 5 + 0.3,
        `schnellstes ${schnellstes.toFixed(2)}, erlaubt ${langes.tempo}`);

  /* Die Dünung: wenn sie gerade nicht zieht, ist Ruhe – das ist das Zeitfenster. */
  const duenung = new (vm.runInContext('Stroemung', ctx))(strom({ puls: 1.0 }));
  duenung.update(0);        // sin(0) = 0 → keine Kraft
  const still = duenung.k;
  duenung.update(Math.PI / 2);
  pruef('eine Dünung hat einen Augenblick Ruhe', still < 0.02 && duenung.k > 0.95,
        `Ruhe ${still.toFixed(2)}, voll ${duenung.k.toFixed(2)}`);
}

console.log('\n--- Der Strudel ---');
{
  const lv = G.buildLevel({
    name: 'Strudelprüfung', par: 3, theme: 'stollen',
    map: ['................', '.T############H.', '.##############.', '.##############.',
          '.##############.', '.##############.', '................'],
    obstacles: [{ type: 'strudel', x: 8, y: 3.5, r: 2.4 }],
  });
  const p = lv.obstacles.find(o => o.type === 'strudel');
  pruef('der Strudel wird gebaut', !!p && typeof p.force === 'function');

  /* Die wichtigste Eigenschaft ist eine, die er *nicht* hat: Er fängt nicht ein. Ein Trichter würde
     den Ball in der Mitte halten, bis die Notbremse des Spiels ihn nach vier Sekunden herausnimmt –
     eine Maschine, aus der einen die Notbremse befreien muß, ist kaputt. */
  const b = G.makeBall(8.1, 3.6, '#fff');       // fast genau in der Mitte, ohne Schwung
  let raus = false;
  for (let i = 0; i < 240 * 3.5 && !raus; i++) {
    G.stepPhysics(lv, b, 1 / 240, i / 240, true);
    if (Math.hypot(b.x - 8, b.y - 3.5) > p.r) raus = true;
  }
  pruef('er hält den Ball nicht in der Mitte fest', raus,
        `nach 3,5 s noch bei Abstand ${Math.hypot(b.x - 8, b.y - 3.5).toFixed(2)} von ${p.r}`);

  /* Und er lenkt wirklich ab: Ein Ball, der geradeaus hindurchfährt, kommt woanders heraus. */
  const c = G.makeBall(2.5, 3.5, '#fff');
  c.vx = 6; c.vy = 0;
  for (let i = 0; i < 240 * 2; i++) G.stepPhysics(lv, c, 1 / 240, i / 240, true);
  pruef('er lenkt einen durchfahrenden Ball ab', Math.abs(c.y - 3.5) > 0.6,
        `aus y = 3.5 wird y = ${c.y.toFixed(2)}`);
}

console.log('\n--- Die Bahnen der Welt ---');
{
  /* Hier wird nicht der Quelltext verglichen, sondern das Ergebnis: Was die laufende Maschine auf
     den fertigen Bahnen anrichtet, muß zu dem passen, was tools/flut.py versprochen hat. */
  const BAHNEN = vm.runInContext('FLUT_COURSES', ctx);
  pruef('es gibt Bahnen in der Welt', BAHNEN.length > 0, `${BAHNEN.length} Bahnen`);
  for (const def of BAHNEN) {
    const lv = G.buildLevel(def);
    const becken = lv.obstacles.filter(o => o.type === 'flut');
    /* Nicht jede Bahn hat ein Becken – manche leben von Strömung und Strudel. Eine Maschine der
       Welt muß aber jede haben, sonst könnte sie in jeder anderen Welt genauso stehen. */
    const eigene = new Set(['flut', 'pumpwerk', 'stroemung', 'strudel']);
    pruef(`„${def.name}" trägt eine Maschine dieser Welt`,
          lv.obstacles.some(o => eigene.has(o.type)),
          lv.obstacles.map(o => o.type).join(' '));
    /* Und ein Weg zum Loch muß immer da sein – auch auf einer Bahn ohne Becken. */
    pruef(`… ein Weg führt zum Loch`, wegDa(lv));
    if (!becken.length) continue;
    const urNass = def.map.reduce((n, z) => n + [...z].filter(c => c === 'w').length, 0);
    for (const f of becken) f.update(0);
    pruef(`„${def.name}" fängt trocken an`, zaehleNass(lv) === urNass,
          `${zaehleNass(lv)} nasse Felder, in der Karte stehen ${urNass}`);

    /* Alle Becken randvoll – und jetzt die Regel, um die es geht. */
    for (const f of becken) f.update(f.start + f.max * f.takt + 0.01);
    pruef(`… alle Becken laufen voll`, becken.every(f => f.stufe === f.max),
          becken.map(f => `${f.stufe}/${f.max}`).join(' '));
    pruef(`… und trotzdem führt ein Weg zum Loch`, wegDa(lv),
          'sonst müßte man warten, bis das Becken leerläuft');
    const laeufe = becken.map(f => f.zyklus());
    pruef(`… der längste Lauf bleibt unter der Geduld`, Math.max(...laeufe) <= GEDULD,
          `${Math.max(...laeufe).toFixed(1)} s, erlaubt ${GEDULD} s`);
    const tee = [Math.floor(lv.tee.x), Math.floor(lv.tee.y)], loch = [Math.floor(lv.cup.x), Math.floor(lv.cup.y)];
    pruef(`… Abschlag und Loch bleiben trocken`,
          !nass(lv, tee[0], tee[1]) && !nass(lv, loch[0], loch[1]),
          `Abschlag ${kachel(lv, tee[0], tee[1])}, Loch ${kachel(lv, loch[0], loch[1])}`);
    /* Und am Ende des Laufs steht die Bahn wieder da, wie sie war. */
    for (const f of becken) f.update(f.start + f.zyklus() - 0.01);
    pruef(`… und nach dem Lauf ist sie wieder ganz`, zaehleNass(lv) === urNass,
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
