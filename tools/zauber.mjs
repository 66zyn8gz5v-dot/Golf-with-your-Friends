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
 *   - Der Mondzieher zieht bei voller Scheibe, stößt bei dunkler, läßt beim Halbmond in Ruhe –
 *     und einen liegenden Ball rührt er überhaupt nicht an.
 *   - Das Sternentor hält, solange ein Stern fehlt, und geht auf, sobald keiner mehr fehlt.
 *     Einmal gezündete Sterne bleiben an, auch über mehrere Schläge hinweg.
 *   - Der Zauberspiegel wirft seitenverkehrt aus: Wer links auftrifft, kommt rechts heraus.
 *     Und er greift nur einen Ball, der auf ihn zurollt.
 */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const ctx = { console, performance: { now: () => 0 }, window: {} }; vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow',
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_flut', 'courses_zauber', 'courses_pro', 'level',
                 'obstacles', 'obstacles_legend', 'obstacles_snow', 'obstacles_mine', 'obstacles_flut', 'obstacles_zauber', 'physics'])
  vm.runInContext(fs.readFileSync(path.join(SRC, `${f}.js`), 'utf8'), ctx);
const G = vm.runInContext('({buildLevel, makeBall, stepPhysics, RANKE_DAUER, HUT_TAKT, HUT_VORWARN, MOND_TAKT, MOND_RUHE})', ctx);

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

/* ---------- Der Mondzieher ---------- */
console.log('\nDer Mondzieher');
{
  /* Ein breites Feld statt des schmalen Gangs: Gemessen wird, wie weit der Mond den Ball QUER
     zu seiner Laufrichtung zieht – auf einer Bahn, die nur eine Kachel breit ist, könnte er das
     gar nicht zeigen, weil die Bande alles auffinge. */
  const FELD = ['.'.repeat(22)];
  for (let r = 1; r < 8; r++) FELD.push('.' + '#'.repeat(20) + '.');
  FELD.push('.'.repeat(22));
  FELD[4] = '.T' + '#'.repeat(19) + '.';                 // der Abschlag liegt auf der Spur
  FELD[7] = '.' + '#'.repeat(18) + 'H#.';                // das Loch weit ab davon, damit nichts einfällt
  const feld = (hindernisse) => G.buildLevel({ name: 'Mondprobe', par: 3, theme: 'sternenwarte', map: FELD, obstacles: hindernisse });

  /* Der Takt wird absichtlich riesig gewählt: Dann steht die Phase während des ganzen Laufs still,
     und was gemessen wird, ist die Kraft einer Phase und nicht der Wechsel zwischen zweien.
     phase 0 = Vollmond, 0.25 = Halbmond, 0.5 = Neumond. */
  const mond = (phase) => ({ type: 'mondzieher', x: 11, y: 2.5, r: 3.4, kraft: 9, takt: 1e6, core: 0.4, phase });

  // Der Ball läuft auf y = 4.5 entlang, der Mond steht bei y = 2.5 – also oberhalb der Spur.
  function quer(phase, tempo = 11) {
    const lv = feld([mond(phase)]);
    const b = G.makeBall(1.5, 4.5, '#fff', 'none');
    b.vx = tempo; b.vy = 0;
    const dt = 1 / 120; let t = 0, ab = 0;
    for (let i = 0; i < 300; i++) {
      G.stepPhysics(lv, b, dt, t, true); t += dt;
      if (Math.abs(b.y - 4.5) > Math.abs(ab)) ab = b.y - 4.5;
      if (b.x > 18) break;
    }
    return ab;                                     // negativ = zum Mond hin, positiv = von ihm weg
  }

  const voll = quer(0), halb = quer(0.25), neu = quer(0.5);
  pruef('die volle Scheibe zieht den Ball zu sich', voll < -0.35, `Abweichung ${voll.toFixed(2)} Kacheln`);
  pruef('die dunkle Scheibe stößt ihn weg', neu > 0.35, `Abweichung ${neu.toFixed(2)} Kacheln`);
  pruef('der Halbmond läßt ihn fast in Ruhe', Math.abs(halb) < 0.12, `Abweichung ${halb.toFixed(2)} Kacheln`);

  /* Der wichtigste Fall: Ein LIEGENDER Ball darf sich nicht bewegen. Die Kraft des Mondes liegt
     über der Bodenreibung – ohne die Schranke schöbe er den Ball von allein über die Bahn, und
     der Spieler sähe zu, statt zu entscheiden. */
  {
    const lv = feld([mond(0)]);
    const b = G.makeBall(9, 4.5, '#fff', 'none');  // in Reichweite, aber in Ruhe
    b.vx = 0; b.vy = 0;
    const dt = 1 / 120; let t = 0;
    for (let i = 0; i < 600; i++) { G.stepPhysics(lv, b, dt, t, true); t += dt; }
    const weg = Math.hypot(b.x - 9, b.y - 4.5);
    pruef('einen liegenden Ball rührt er nicht an', weg < 0.02, `bewegt um ${weg.toFixed(3)} Kacheln`);
  }

  // Die Phase läuft im Takt: voll, halb, dunkel, halb, voll
  {
    const lv = feld([{ type: 'mondzieher', x: 11, y: 2.5, takt: 8, phase: 0 }]);
    const m = lv.obstacles.find(o => o.type === 'mondzieher');
    const folge = [0, 2, 4, 6, 8].map(s => { m.update(s); return Math.round(m.p * 100) / 100; });
    pruef('die Scheibe läuft voll → halb → dunkel → halb → voll', folge.join(',') === '1,0,-1,0,1', folge.join(','));
  }

  // Der Sockel steht im Weg – sonst stünde der Mond auf nichts
  {
    const lv = feld([mond(0)]);
    const m = lv.obstacles.find(o => o.type === 'mondzieher');
    const out = []; m.circles(out);
    pruef('der Sockel ist fest', out.length === 1 && out[0].r > 0.2);
  }
}

/* ---------- Das Sternbild ---------- */
console.log('\nDas Sternbild');
{
  /* Derselbe schmale Gang wie bei der Ranke: Das Tor steht quer darin, und weil es links und
     rechts an die Bande stößt, kann man es nicht umfahren. Was gemessen wird, ist das Tor. */
  const stern = (sterne, tor) => bau([{ type: 'sternbild', r: 0.5, sterne, tor }]);
  const TOR = { x0: 14, y0: 0.9, x1: 14, y1: 2.1 };

  // Ein Stern liegt seitlich außerhalb des Gangs – den kann der Ball nicht erreichen
  {
    const lv = stern([[6, 1.5], [9, 1.5], [6, 20]], TOR);
    const a = rolle(lv, 14);
    pruef('solange ein Stern fehlt, hält das Tor', a.x < 14, `bis x=${a.x.toFixed(1)}`);
    const sb = lv.obstacles.find(o => o.type === 'sternbild');
    pruef('die erreichten Sterne sind an, der unerreichbare nicht',
          sb.an[0] && sb.an[1] && !sb.an[2] && !sb.fertig, sb.an.join(','));
  }

  // Alle drei im Gang: der Ball zündet sie der Reihe nach und rollt durch
  {
    const lv = stern([[5, 1.5], [8, 1.5], [11, 1.5]], TOR);
    const a = rolle(lv, 14);
    const sb = lv.obstacles.find(o => o.type === 'sternbild');
    pruef('sind alle an, geht das Tor auf', sb.fertig && a.x > 15, `bis x=${a.x.toFixed(1)}`);
  }

  /* Über mehrere Schläge hinweg: Erst ein sachter Schlag, der nur die ersten beiden erreicht,
     dann ein zweiter. Das Bild darf zwischendurch nicht verlöschen – sonst wäre die Aufgabe
     „alles in einem Schlag", und das ist Glück, kein Planen. */
  {
    const lv = stern([[5, 1.5], [8, 1.5], [11, 1.5]], TOR);
    rolle(lv, 6.5);
    const sb = lv.obstacles.find(o => o.type === 'sternbild');
    const nachEins = sb.an.filter(Boolean).length;
    const b = G.makeBall(1.5, 1.5, '#fff', 'none');
    b.vx = 14; b.vy = 0;
    const dt = 1 / 120; let t = 8;
    for (let i = 0; i < 8 * 120; i++) { G.stepPhysics(lv, b, dt, t, true); t += dt; if (b.x > 17) break; }
    pruef('gezündete Sterne bleiben über den nächsten Schlag hinweg an',
          nachEins >= 1 && nachEins < 3 && sb.fertig && b.x > 15, `erst ${nachEins} von 3, dann alle`);
  }

  // Ein Stern zündet nur einmal – sonst hinge an ihm ein Dauerfeuer von Ereignissen
  {
    const lv = stern([[5, 1.5], [8, 1.5], [11, 1.5]], TOR);
    const b = G.makeBall(1.5, 1.5, '#fff', 'none');
    b.vx = 14; b.vy = 0;
    const dt = 1 / 120; let t = 0, zaehl = 0;
    for (let i = 0; i < 8 * 120; i++) {
      for (const e of G.stepPhysics(lv, b, dt, t, true)) if (e.type === 'sternbild') zaehl++;
      t += dt; if (b.x > 17) break;
    }
    pruef('jeder Stern meldet sich genau einmal', zaehl === 3, `${zaehl} Meldungen`);
  }

  // Nach dem Aufgehen steht kein Mauerstück mehr im Weg
  {
    const lv = stern([[5, 1.5], [8, 1.5], [11, 1.5]], TOR);
    const sb = lv.obstacles.find(o => o.type === 'sternbild');
    const zu = []; sb.segments(zu);
    sb.an = [true, true, true];
    const auf = []; sb.segments(auf);
    pruef('das Tor ist erst eine Wand und dann keine mehr', zu.length === 1 && auf.length === 0);
  }
}

/* ---------- Der Zauberspiegel ---------- */
console.log('\nDer Zauberspiegel');
{
  /* Ein breites Feld, und mittendrin steht der Spiegel senkrecht von (10,2) bis (10,8). Der Ball
     läuft waagerecht darauf zu: Nur so läßt sich messen, wie weit er beim Durchgang QUER
     versetzt wird - und genau das ist die ganze Maschine. */
  const FELD = ['.'.repeat(22)];
  for (let r = 1; r < 10; r++) FELD.push('.' + '#'.repeat(20) + '.');
  FELD.push('.'.repeat(22));
  FELD[1] = '.T' + '#'.repeat(19) + '.';
  FELD[9] = '.' + '#'.repeat(18) + 'H#.';
  const feld = (h) => G.buildLevel({ name: 'Spiegelprobe', par: 3, theme: 'lehrlingsgarten', map: FELD, obstacles: h });
  const SPIEGEL = { type: 'zauberspiegel', x0: 10, y0: 2, x1: 10, y1: 8 };

  /* Ein einzelner Durchgang, von Hand ausgelöst: So steht fest, wo der Ball auftrifft, und das
     Ergebnis hängt nicht daran, ob ein Schlag zufällig genau die richtige Höhe hatte. */
  function durch(y, vx, vy = 0) {
    const lv = feld([Object.assign({}, SPIEGEL)]);
    const sp = lv.obstacles.find(o => o.type === 'zauberspiegel');
    const b = G.makeBall(9.9, y, '#fff', 'none');
    b.vx = vx; b.vy = vy; b.portalCd = 0;
    const ev = [];
    sp.teleport(b, 0, ev);
    return { b, ev, sp };
  }

  const oben = durch(4, 12);
  pruef('wer oben auftrifft, kommt unten heraus',
        oben.ev.length === 1 && Math.abs(oben.b.y - 6) < 0.2, `y 4 → ${oben.b.y.toFixed(2)}`);
  const unten = durch(6, 12);
  pruef('und wer unten auftrifft, kommt oben heraus',
        unten.ev.length === 1 && Math.abs(unten.b.y - 4) < 0.2, `y 6 → ${unten.b.y.toFixed(2)}`);
  pruef('er kommt auf der anderen Seite heraus', oben.b.x > 10.2, `x=${oben.b.x.toFixed(2)}`);
  pruef('und rollt dort weiter, statt stehenzubleiben', oben.b.vx > 10, `vx=${oben.b.vx.toFixed(1)}`);

  // Die Mitte ist der einzige Punkt, der auf sich selbst abbildet - das Maß auf dem Boden zeigt sie
  const mitte = durch(5, 12);
  pruef('die Mitte des Spiegels bildet auf sich selbst ab', Math.abs(mitte.b.y - 5) < 0.2,
        `y 5 → ${mitte.b.y.toFixed(2)}`);

  /* Seitenverkehrt heißt auch: Was sich nach unten bewegte, bewegt sich danach nach oben. Ohne das
     wäre es kein Spiegel, sondern ein Loch mit versetztem Ausgang. */
  const schraeg = durch(4, 12, 4);
  pruef('die Bewegung längs des Spiegels kehrt sich um', schraeg.b.vy < -3,
        `vy 4 → ${schraeg.b.vy.toFixed(1)}`);

  // Ein Ball, der sich entfernt, wird nicht noch einmal hindurchgezogen
  const weg = durch(4, -12);
  pruef('wer sich vom Spiegel entfernt, wird nicht gegriffen', weg.ev.length === 0);

  // Und nach dem Durchgang ist er kurz gesperrt, sonst ginge es sofort wieder zurück
  {
    const a = durch(4, 12);
    const ev2 = [];
    a.sp.teleport(a.b, 0.01, ev2);
    pruef('nach dem Durchgang ist er kurz gesperrt', ev2.length === 0 && a.b.portalCd > 0);
  }

  /* Und das Bild, das der Zeichner malt, ist dasselbe, das die Maschine rechnet. Stünde der
     Geisterball woanders, als der Ball herauskommt, wäre die Ansage eine Lüge. */
  {
    const lv = feld([Object.assign({}, SPIEGEL)]);
    const sp = lv.obstacles.find(o => o.type === 'zauberspiegel');
    const g = sp.bild(9.0, 4.0);
    pruef('der Geisterball steht dort, wo der Ball herauskäme',
          Math.abs(g.y - 6) < 0.05 && g.x > 10, `Bild von 9,0/4,0 liegt bei ${g.x.toFixed(1)}/${g.y.toFixed(1)}`);
  }
}

/* ---------- Die Zauberkreise ----------
   Fünf Wirkungen, fünf Farben. Gemessen wird, was auf der Packung steht: Schub macht schneller,
   Bremse macht langsamer, Sprung hebt ab, Wirbel dreht die Richtung, Bann sperrt – aber nur,
   solange er brennt. Und ein erloschener Kreis darf GAR NICHTS tun; sonst wäre die Farbe eine
   Lüge, und genau darauf soll man sich hier verlassen können. */
console.log('\nDie Zauberkreise');
{
  /* Der Kreis liegt bei x 5,5 und damit dicht hinter dem Abschlag. Beim ersten Anlauf lag er bei
     9,5 – dort war der Ball schon ausgerollt, und alle fünf Proben liefen ins Leere, ohne daß es
     auffiel: Sie maßen einen Ball, der die Maschine nie erreicht hat. */
  const kreis = (wirkung, mehr = {}) => Object.assign({ type: 'zauberkreis', x: 5.5, y: 1.5, r: 1.6, wirkung }, mehr);
  const ohne = rolle(bau([]), 9, 1.0);

  /* Für den Wirbel braucht es eine breite Bahn. Im einkachligen Gang oben prallt der Ball sofort
     an die Bande zurück, sobald er quer läuft – gemessen würde dann die Bande, nicht der Kreis. */
  const BREIT = ['.........................', '.#######################.', '.#######################.',
                 '.T#####################H.', '.#######################.', '.#######################.',
                 '.........................'];
  const bauBreit = (h) => G.buildLevel({ name: 'Wirbelprobe', par: 3, theme: 'lehrlingsgarten', map: BREIT, obstacles: h });
  const rolleBreit = (lv, tempo, sekunden, startT = 0) => {
    const b = G.makeBall(1.5, 3.5, '#fff', 'none');
    b.vx = tempo; b.vy = 0;
    let t = startT;
    for (let i = 0; i < sekunden * 120; i++) { G.stepPhysics(lv, b, 1 / 120, t, true); t += 1 / 120; }
    return { b };
  };
  const tempo = (r) => Math.hypot(r.b.vx, r.b.vy);

  const schub = rolle(bau([kreis('schub')]), 9, 1.0);
  pruef('der Schubkreis macht schneller', tempo(schub) > tempo(ohne) + 1,
        `${tempo(ohne).toFixed(1)} ohne, ${tempo(schub).toFixed(1)} mit`);

  const bremse = rolle(bau([kreis('bremse')]), 9, 1.0);
  pruef('der Bremskreis macht langsamer', tempo(bremse) < tempo(ohne) - 1,
        `${tempo(ohne).toFixed(1)} ohne, ${tempo(bremse).toFixed(1)} mit`);

  const sprung = rolle(bau([kreis('sprung', { weite: 4.2 })]), 9, 1.0);
  pruef('der Sprungkreis wirft den Ball', sprung.gesehen.has('jump'));

  const wirbel = rolleBreit(bauBreit([{ type: 'zauberkreis', x: 5.5, y: 3.5, r: 1.6, wirkung: 'wirbel', kraft: 3.0 }]), 9, 1.0);
  pruef('der Wirbelkreis dreht die Richtung', Math.abs(wirbel.b.vy) > 1,
        `quer: ${wirbel.b.vy.toFixed(1)}`);

  // Der Bannkreis: brennt er, kommt niemand hindurch; ist er aus, merkt man nichts von ihm.
  const bann = kreis('bann', { takt: 6, phase: 0 });
  /* Startzeit 1,0 statt 0: Bei u = 0 blendet der Kreis gerade erst auf und ist noch dunkel – der
     Ball wäre hineingerollt, bevor die Wand steht, und säße dann darin fest, bis der Kreis wieder
     erlischt. Das ist im Spiel ein hübscher Zufall („gebannt"), aber es ist nicht das, was hier
     gemessen werden soll. */
  const zu = rolle(bau([bann]), 9, 1.0, 1.0);
  pruef('der brennende Bannkreis läßt niemanden durch', zu.b.x < 4.2,
        `bis x=${zu.b.x.toFixed(1)}`);
  const auf = rolle(bau([bann]), 9, 1.0, 3.6);           // t=3,6 liegt in der zweiten: er ist aus
  pruef('der erloschene Bannkreis sperrt nicht', auf.b.x > 7.5,
        `bis x=${auf.b.x.toFixed(1)}`);

  // Und ein erloschener Schubkreis muß WIRKUNGSLOS sein, nicht nur schwächer
  const ausSchub = rolle(bau([kreis('schub', { takt: 6, phase: 0 })]), 9, 1.0, 3.6);
  pruef('ein erloschener Kreis tut gar nichts', Math.abs(tempo(ausSchub) - tempo(ohne)) < 0.05,
        `${tempo(ohne).toFixed(2)} ohne, ${tempo(ausSchub).toFixed(2)} über dem dunklen Kreis`);
}

console.log(fehler ? `\n${fehler} Fehler` : '\nalles bestanden');
process.exit(fehler ? 1 : 0);
