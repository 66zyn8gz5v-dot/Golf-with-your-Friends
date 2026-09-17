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

  /* Und jetzt der Fall, um den es wirklich geht: WÄHREND MAN ZIELT. main.js ruft stepPhysics in
     der Zielphase mit allowForces = false auf – dann greift nur, was 'alwaysForce' trägt. Die
     Probe oben lief in der Rollphase und hätte diesen Unterschied nicht gesehen: Nähme man das
     Kennzeichen weg, bliebe sie grün und die Strömung ließe einen trotzdem in Ruhe zielen. */
  const zielen = (() => {
    const lv = bahn([strom()]);
    const b = G.makeBall(8.5, 1.5, '#fff');
    for (let i = 0; i < 240; i++) G.stepPhysics(lv, b, 1 / 240, i / 240, false);   // Zielphase!
    return +b.y.toFixed(2);
  })();
  pruef('sie trägt auch, während man noch zielt', zielen > 2.4,
        `nach 1 s Zielen von y = 1.5 nach y = ${zielen}`);

  /* Wer aus der Strömung gespült wird, darf nicht mitten in ihr zurückgelegt werden – sonst
     treibt er sofort wieder ab und bekommt den nächsten Strafschlag, bis das Limit erreicht ist.
     Geprüft am Quelltext von main.js; das Verhalten prüft die Browserprobe. */
  const haupt2 = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8');
  pruef('main.js kennt den Sog', /const imSog = /.test(haupt2));
  pruef('und legt niemanden darin ab', /ruhigerBoden\(lv, e, x, y\)\) return \{ x, y, e \}/.test(haupt2));
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

  /* Die Dünung: wenn sie gerade nicht zieht, ist Ruhe – das ist das Zeitfenster. Und genau so
     wichtig: Die Ruhe darf nur ein Fenster sein, nicht der Normalzustand. Der erste Entwurf stand
     die halbe Zeit still; im Browser sah das aus, als sei die Maschine kaputt. */
  const Stroemung = vm.runInContext('Stroemung', ctx);
  const duenung = new Stroemung(strom({ puls: 1.0 }));
  let ruhig = 0, voll = 0;
  const N = 2000, periode = 2 * Math.PI;      // puls = 1 → eine Welle dauert 2π Sekunden
  for (let i = 0; i < N; i++) {
    duenung.update((i / N) * periode);
    if (duenung.k < 0.05) ruhig++;
    if (duenung.k > 0.95) voll++;
  }
  pruef('eine Dünung hat einen Augenblick Ruhe', ruhig > N * 0.1,
        `${Math.round(100 * ruhig / N)} % der Welle`);
  pruef('und steht die meiste Zeit NICHT still', ruhig < N * 0.4,
        `${Math.round(100 * ruhig / N)} % Ruhe, ${Math.round(100 * voll / N)} % volle Kraft`);
  pruef('und zieht einen guten Teil der Welle voll', voll > N * 0.2,
        `${Math.round(100 * voll / N)} % volle Kraft`);

  /* Und die Probe, die der Grund für all das war: Auch bei HALBER Welle muß ein liegender Ball
     abtreiben. Skalierte die Dünung die Kraft statt des Zieltempos, läge sie hier bei 13 × 0,4 =
     5,2 – knapp über der Reibung 4,2 – und der Ball kröche; bei 0,3 stünde er ganz still. Genau
     das ist im Browser passiert, während alle Zahlen oben grün waren. */
  const halbeWelle = (() => {
    const lv = bahn([strom({ puls: 1.0 })]);
    const st = lv.obstacles.find(o => o.type === 'stroemung');
    const b = G.makeBall(8.5, 1.5, '#fff');
    /* Einen Zeitpunkt suchen, an dem die Welle wirklich halb steht, und ihn festhalten – so hängt
       die Prüfung nicht daran, wo der Zufall der Uhr gerade hinfällt. */
    let t0 = 0;
    for (let i = 0; i < 2000; i++) { st.update(i / 200); if (st.k > 0.35 && st.k < 0.5) { t0 = i / 200; break; } }
    for (let i = 0; i < 240; i++) { st.update(t0); G.stepPhysics(lv, b, 1 / 240, t0, false, false); }
    return { k: +st.k.toFixed(2), y: +b.y.toFixed(2) };
  })();
  pruef('auch bei halber Welle treibt ein liegender Ball ab', halbeWelle.y > 2.4,
        `bei Stärke ${halbeWelle.k}: nach 1 s von y = 1.5 nach y = ${halbeWelle.y}`);
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

console.log('\n--- Der Schwarze Raucher ---');
{
  const bahn = (hind) => G.buildLevel({
    name: 'Raucherprüfung', par: 3, theme: 'meeresgrund',
    map: ['................', '.T############H.', '.##############.', '.##############.',
          '.##############.', '.##############.', '................'],
    obstacles: hind,
  });
  const lv = bahn([{ type: 'raucher', x: 5, y: 3.5, r: 1, takt: 4, stoss: 0.5, warn: 1.2, angle: 0, weite: 6, tempo: 7.5 }]);
  const r = lv.obstacles.find(o => o.type === 'raucher');
  pruef('der Schwarze Raucher wird gebaut', !!r && typeof r.launch === 'function');

  /* Er nimmt auch einen, der einfach nur daliegt – das ist sein Unterschied zum Aufwind, der einen
     Ball mit Schwung braucht. Damit ist er eine Fähre mit Fahrplan und kein Beschleuniger. */
  const b = G.makeBall(5, 3.5, '#fff');
  r.update(0.1);
  const ev = G.stepPhysics(lv, b, 1 / 240, 0.1, false);
  pruef('er wirft auch einen Ball, der nur daliegt', ev.some(e => e.type === 'raucher') && b.air,
        `in der Luft: ${b.air}`);
  pruef('und zwar in seine Richtung', b.vx > 7 && Math.abs(b.vy) < 0.3,
        `Tempo (${b.vx.toFixed(1)}, ${b.vy.toFixed(1)})`);

  /* Zwischen den Ausbrüchen darf er nichts tun – sonst wäre er kein Takt, sondern ein Dauerwurf. */
  const ruhig = bahn([{ type: 'raucher', x: 5, y: 3.5, r: 1, takt: 4, stoss: 0.5, angle: 0 }]);
  const r2 = ruhig.obstacles.find(o => o.type === 'raucher');
  const c = G.makeBall(5, 3.5, '#fff');
  r2.update(2.0);                                  // mitten zwischen zwei Ausbrüchen
  const ev2 = G.stepPhysics(ruhig, c, 1 / 240, 2.0, false);
  pruef('zwischen den Ausbrüchen liegt man ruhig', !ev2.some(e => e.type === 'raucher') && !c.air);

  /* Die Ansage geht dem Ausbruch voraus. Eine Maschine, die man erst merkt, wenn sie zuschlägt,
     ist eine Falle - dieselbe Regel wie beim Ring der Lavafontäne. */
  r2.update(4 - 0.1); const kurzDavor = r2.ansage;
  r2.update(2.0); const mittendrin = r2.ansage;
  pruef('kurz vorher sieht man ihn kommen', kurzDavor > 0.85 && mittendrin < 0.05,
        `kurz davor ${kurzDavor.toFixed(2)}, dazwischen ${mittendrin.toFixed(2)}`);

  /* Und er wirft WEIT. Das ist der Sinn: Wer fliegt, sieht weder Mauern noch Becken noch die
     Ränder der Stege – der Raucher ist der einzige Weg in dieser Welt, etwas zu überspringen.
     Geprüft wird die Weite, denn die ist die Zahl, an der eine Bahn geplant wird. */
  const weit = bahn([{ type: 'raucher', x: 3, y: 3.5, r: 1, takt: 4, stoss: 0.5, angle: 0, weite: 7, tempo: 7.5 }]);
  const wr = weit.obstacles.find(o => o.type === 'raucher');
  const d = G.makeBall(3, 3.5, '#fff');
  let flog = false;
  for (let i = 0; i < 240 * 2; i++) {
    const t = 0.1 + i / 240;
    wr.update(t);
    G.stepPhysics(weit, d, 1 / 240, t, true, false);
    if (d.air) flog = true;
    if (flog && !d.air) break;
  }
  pruef('und er wirft etwa so weit, wie an ihm steht', Math.abs(d.x - (3 + 7)) < 1.6,
        `landet bei x = ${d.x.toFixed(1)}, erwartet rund ${3 + 7}`);
}

console.log('\n--- Die Ankerkette ---');
{
  const lv = G.buildLevel({
    name: 'Ankerprüfung', par: 3, theme: 'daemmerzone',
    map: ['................', '.T############H.', '.##############.', '.##############.',
          '.##############.', '.##############.', '................'],
    obstacles: [{ type: 'ankerkette', x: 8, y: 0.5, len: 3, amp: 48, takt: 5.2 }],
  });
  const k = lv.obstacles.find(o => o.type === 'ankerkette');
  pruef('die Ankerkette wird gebaut', !!k && typeof k.segments === 'function');

  /* Sie hängt an einer Aufhängung und schwingt um sie – der Anker bewegt sich, die Aufhängung
     nicht. Ohne das hätte man keine Bahn, die man ablesen könnte. */
  const orte = [];
  for (let i = 0; i < 60; i++) { k.update(i * 0.1); orte.push([k.x, k.y, k.ax, k.ay]); }
  const wandert = Math.max(...orte.map(o => o[0])) - Math.min(...orte.map(o => o[0]));
  const haengtFest = orte.every(o => o[2] === orte[0][2] && o[3] === orte[0][3]);
  pruef('der Anker schwingt', wandert > 2, `${wandert.toFixed(1)} Kacheln weit`);
  pruef('und die Aufhängung bleibt stehen', haengtFest);
  pruef('er bleibt am Ende der Kette', orte.every(o => Math.abs(Math.hypot(o[0] - o[2], o[1] - o[3]) - k.len) < 1e-9),
        `Kettenlänge ${k.len}`);

  /* Langsam ist hier kein Geschmack: Auf einem drei Kacheln schmalen Steg über offenem Wasser
     reicht ein Stoß, um jemanden hinunterzuschicken. Ein schnelles Pendel wäre dort ein Würfel. */
  const pendel = fs.readFileSync(path.join(SRC, 'obstacles_legend.js'), 'utf8');
  const pTakt = parseFloat((pendel.match(/const PENDEL_TAKT = ([\d.]+)/) || [])[1]);
  pruef('sie schwingt langsamer als das Pendel der Uhrwerkstadt', k.takt > pTakt,
        `${k.takt} s gegen ${pTakt} s`);

  /* Und sie stößt: Ein Ball, den der Anker trifft, fliegt weg. Geprüft mit echter Physik. */
  const b = G.makeBall(8, 3.5, '#fff');
  let getroffen = false;
  for (let i = 0; i < 240 * 6 && !getroffen; i++) {
    const t = i / 240;
    G.stepPhysics(lv, b, 1 / 240, t, true);
    if (Math.hypot(b.vx, b.vy) > 1.5) getroffen = true;
  }
  pruef('sie stößt einen Ball, der im Weg liegt', getroffen,
        `Tempo ${Math.hypot(b.vx, b.vy).toFixed(2)}`);
}

console.log('\n--- Der Tangwald ---');
{
  const bahn = (hind) => G.buildLevel({
    name: 'Tangprüfung', par: 3, theme: 'flachwasser',
    map: ['................', '.T############H.', '.##############.', '.##############.',
          '.##############.', '.##############.', '................'],
    obstacles: hind,
  });
  const lv = bahn([{ type: 'tangwald', x: 8, y: 3.5, w: 3, h: 6, takt: 4 }]);
  const w = lv.obstacles.find(o => o.type === 'tangwald');
  pruef('der Tangwald wird gebaut', !!w && typeof w.force === 'function');

  /* Er ist keine Mauer: Er hat keine Kreise und keine Kanten, an denen etwas abprallen könnte.
     Das ist sein ganzer Sinn – ein Hindernis, das den Schwung nimmt und nicht den Weg. */
  pruef('er ist keine Mauer', typeof w.circles !== 'function' && typeof w.segments !== 'function');

  /* Die Gasse wandert. Ohne das wäre er eine Bremszone und keine Maschine. */
  const orte = [];
  for (let i = 0; i < 40; i++) { w.update(i * 0.1); orte.push(w.mitte); }
  pruef('die Gasse wandert', Math.max(...orte) - Math.min(...orte) > 0.4,
        `zwischen ${Math.min(...orte).toFixed(2)} und ${Math.max(...orte).toFixed(2)}`);

  /* Und jetzt die Probe, um die es geht: Wer die Gasse trifft, kommt durch; wer danebenhält,
     bleibt stecken. Gemessen mit echter Physik, beide Male von derselben Stelle mit demselben
     Schlag – nur die Höhe ist anders. */
  const durch = (y) => {
    const lv2 = bahn([{ type: 'tangwald', x: 8, y: 3.5, w: 3, h: 6, takt: 4, phase: 0 }]);
    const tw = lv2.obstacles.find(o => o.type === 'tangwald');
    tw.update(0);                     // Gasse steht in der Mitte (sin 0 = 0)
    const b = G.makeBall(4, y, '#fff');
    b.vx = 9; b.vy = 0;
    for (let i = 0; i < 240 * 3; i++) { tw.update(0); G.stepPhysics(lv2, b, 1 / 240, 0, true); if (Math.hypot(b.vx, b.vy) < 0.05) break; }
    return +b.x.toFixed(2);
  };
  const inDerGasse = durch(3.5);      // mitte = 0 → Gasse liegt bei y = 3,5
  const daneben = durch(5.4);
  pruef('wer die Gasse trifft, rollt hindurch', inDerGasse > 11,
        `bis x = ${inDerGasse}`);
  pruef('wer danebenhält, bleibt stecken', daneben < inDerGasse - 2,
        `bis x = ${daneben} statt ${inDerGasse}`);
  /* Und er prallt nicht ab: Der Streifen geht von x = 6,5 bis 9,5; an einer Mauer bliebe der Ball
     davor liegen. Daß er MITTEN im Tang zur Ruhe kommt, ist kein Mangel, sondern die Ansage –
     von dort hat man keinen guten Schlag mehr. */
  pruef('aber er prallt nicht ab, er steckt darin', daneben > 7 && daneben < 9.5,
        `liegt bei x = ${daneben}; der Tang reicht von 6.5 bis 9.5`);

  /* Auch ein liegender Ball steckt im Tang. Das ist kein Schaden, sondern die Ansage: Von hier
     hast du keinen guten Schlag mehr. */
  pruef('er greift auch einen ruhenden Ball', w.alwaysForce === true);
}

console.log('\n--- Die Riesenmuschel ---');
{
  const bahn = (hind) => G.buildLevel({
    name: 'Muschelprüfung', par: 3, theme: 'daemmerzone',
    map: ['................', '.T############H.', '.##############.', '.##############.',
          '.##############.', '.##############.', '................'],
    obstacles: hind,
  });
  const lv = bahn([{ type: 'muschel', x: 8, y: 3.5, r: 1.05, takt: 4, offen: 0.5, halt: 1, angle: 0 }]);
  const m = lv.obstacles.find(o => o.type === 'muschel');
  pruef('die Riesenmuschel wird gebaut', !!m && typeof m.ride === 'function');

  /* Sie ist zwei Dinge, und welches, entscheidet der Takt. Geprüft wird beides an derselben
     Muschel – sonst könnte man aus Versehen zwei Maschinen bauen, die nie dasselbe Ding sind. */
  const kreise = (t) => { m.update(t); const out = []; m.circles(out); return out.length; };
  pruef('geschlossen ist sie eine Mauer', kreise(4 * 0.75) === 1, `bei p = ${m.p.toFixed(2)}`);
  pruef('offen ist sie keine Mauer', kreise(4 * 0.25) === 0, `bei p = ${m.p.toFixed(2)}`);

  /* Verschlucken und wieder ausspucken – und zwar in ihre Blickrichtung, damit die Zeichnung nicht
     lügt. */
  m.update(1.0);                                   // mitten in der offenen Zeit
  const b = G.makeBall(8, 3.5, '#fff');
  const ev = G.stepPhysics(lv, b, 1 / 240, 1.0, true);
  pruef('sie verschluckt einen Ball, der hineinrollt', !!b.rider && ev.some(e => e.type === 'muschel'));
  pruef('und hält ihn fest', Math.abs(b.x - 8) < 0.01 && Math.hypot(b.vx, b.vy) < 0.01);
  /* Während sie hält, darf sie keine Mauer sein – sonst stieße der Ball gegen sein eigenes
     Gefängnis, und das sähe aus wie ein Fehler, weil es einer wäre. */
  m.update(4 * 0.75);
  const out = []; m.circles(out);
  pruef('während sie hält, ist sie keine Mauer', out.length === 0);

  let raus = null;
  for (let i = 0; i < 240 * 3 && !raus; i++) {
    const t = 1.0 + i / 240;
    const e2 = G.stepPhysics(lv, b, 1 / 240, t, true);
    if (e2.some(x => x.type === 'muschel' && x.aus)) raus = { t, vx: b.vx, vy: b.vy, x: b.x };
  }
  pruef('und gibt ihn nach kurzer Zeit wieder her', !!raus,
        raus ? `nach ${(raus.t - 1.0).toFixed(2)} s` : 'gar nicht');
  pruef('und zwar in ihre Blickrichtung', !!raus && raus.vx > 5 && Math.abs(raus.vy) < 0.5,
        raus ? `Tempo (${raus.vx.toFixed(1)}, ${raus.vy.toFixed(1)})` : '');
  /* Sie schiebt, sie schießt nicht: Ein Ball, der fliegt, käme über alles hinweg, was diese Welt
     ausmacht – über Becken, Strömung und die Ränder der Stege. */
  pruef('sie schiebt am Boden, sie schießt nicht in die Luft', !b.air && b.z < 0.01,
        `z = ${b.z.toFixed(2)}, in der Luft: ${b.air}`);
}

console.log('\n--- Der Anglerfisch ---');
{
  const lv = G.buildLevel({
    name: 'Anglerprüfung', par: 3, theme: 'meeresgrund',
    map: ['................', '.T############H.', '.##############.', '.##############.',
          '.##############.', '.##############.', '................'],
    obstacles: [{ type: 'angler', x0: 4, y0: 3.5, x1: 12, y1: 3.5, tempo: 2 }],
  });
  const a = lv.obstacles.find(o => o.type === 'angler');
  pruef('der Anglerfisch wird gebaut', !!a && typeof a.trigger === 'function');

  /* Er schwimmt gleichmäßig. Die Lore der Uhrwerkstadt fährt in einer Sinusschwingung – an den
     Enden langsam, in der Mitte schnell. Für einen Fisch wäre das falsch, und wichtiger: Man
     könnte sein Tempo nicht abschätzen. Geprüft wird darum, daß der Weg je Zeitschritt überall
     gleich lang ist, außer an den beiden Wendepunkten. */
  let langsamste = Infinity, schnellste = 0, links = 99, rechts = -99;
  let vx = a.x;
  for (let i = 1; i <= 800; i++) {
    a.update(i * 0.01);
    const d = Math.abs(a.x - vx) / 0.01; vx = a.x;
    links = Math.min(links, a.x); rechts = Math.max(rechts, a.x);
    if (i > 5 && Math.abs(a.x - 4) > 0.3 && Math.abs(a.x - 12) > 0.3) {
      langsamste = Math.min(langsamste, d); schnellste = Math.max(schnellste, d);
    }
  }
  pruef('er schwimmt gleichmäßig, nicht in einer Schwingung',
        schnellste - langsamste < 0.2, `zwischen ${langsamste.toFixed(2)} und ${schnellste.toFixed(2)} Kacheln/s`);
  pruef('und mit dem Tempo, das an ihm steht', Math.abs(schnellste - 2) < 0.15,
        `${schnellste.toFixed(2)} statt ${a.tempo}`);
  pruef('er fährt seine Strecke ganz ab', links < 4.2 && rechts > 11.8,
        `von ${links.toFixed(1)} bis ${rechts.toFixed(1)}`);

  /* Und die Strafe. Ein liegender Ball ist vor ihm nicht sicher – das ist der Punkt: Er ist das
     erste Hindernis dieser Welt, das einen sucht. */
  a.update(0);
  const b = G.makeBall(a.x, a.y, '#fff');
  const ev = G.stepPhysics(lv, b, 1 / 240, 0, false);
  pruef('er schnappt auch einen Ball, der nur daliegt', ev.some(e => e.type === 'angler'));
  const weit = G.makeBall(a.x + 3, a.y, '#fff');
  const ev2 = G.stepPhysics(lv, weit, 1 / 240, 0, false);
  pruef('und läßt in Ruhe, wer weit genug weg ist', !ev2.some(e => e.type === 'angler'));

  /* Wer über ihn hinwegfliegt, kommt davon. Das ist die Belohnung für einen Sprung und der
     einzige Weg, ihn zu überspielen – darum darf er ausdrücklich KEIN airTrigger haben. */
  pruef('wer über ihn hinwegfliegt, kommt davon', typeof a.airTrigger !== 'function');

  const haupt3 = fs.readFileSync(path.join(SRC, 'main.js'), 'utf8');
  pruef('ein Schlag zurück: main.js kennt den Angler', /case 'angler': hazard\('angler'\)/.test(haupt3));
  pruef('und legt ihn an den Anfang des letzten Schlags', /type === 'fell' \|\| type === 'angler'/.test(haupt3));
  pruef('und sagt, was passiert ist', /Vom Anglerfisch geschnappt/.test(haupt3));
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
