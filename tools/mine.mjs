/* Prüft die beiden Maschinen der Zwergenmine – Sprengladung und Kippbühne.
 *
 *   node tools/mine.mjs
 *
 * Beide sind Kräfte, keine Strafen: Was sie tun, sieht man nur am Tempo des Balls. Genau deshalb
 * wird hier gerechnet und nicht hingeschaut. Geprüft wird jeweils die Regel, die man auch sagen
 * würde, wenn man das Spiel erklärt:
 *
 *   Sprengladung: Sie wirft nach außen, umso weiter, je näher man liegt; jenseits ihrer Reichweite
 *                 tut sie nichts; sie zieht keinen Strafschlag nach sich; und sie wirft auch einen
 *                 Ball, der schon liegt.
 *   Kippbühne:    Über die Mitte hinaus wirft sie nach vorn, davor schickt sie zurück, in der
 *                 Totzone bleibt sie waagerecht – und ohne Ball kehrt sie in die Waage zurück.
 *                 Und das alles auch auf Stollenboden, nicht nur auf dem Eis der Prüffläche: Auf
 *                 Eis beweist man die Mechanik, auf Stein die Wirklichkeit.
 */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const ctx = { console, performance: { now: () => 0 }, window: {} }; vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow',
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_pro', 'level',
                 'obstacles', 'obstacles_legend', 'obstacles_snow', 'obstacles_mine', 'physics'])
  vm.runInContext(fs.readFileSync(path.join(SRC, `${f}.js`), 'utf8'), ctx);
const G = vm.runInContext('({buildLevel, makeBall, stepPhysics, SPRENG_TAKT, SPRENG_STOSS, SPRENG_WEITE, KIPP_MITTE})', ctx);
const STEP = 1 / 240;

let fehler = 0;
const pruef = (name, ok, zusatz = '') => { console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++; };

/* Eine ebene Eisfläche: fast keine Reibung, damit man den Stoß misst und nicht die Bremsung. */
const feld = (hindernisse) => ({
  name: 'Minenprüfung', par: 3, theme: 'stollen',
  map: ['......................', '.TiiiiiiiiiiiiiiiiiiH.',
        ...Array.from({ length: 13 }, () => '.iiiiiiiiiiiiiiiiiiii.'), '......................'],
  obstacles: hindernisse,
});
const ball = (x, y) => G.makeBall(x, y, '#fff');
/* Ein Lauf über 'sek' Sekunden. 'zielen' = false heißt: der Ball liegt und wartet – dann wirken
   nur Kräfte, die auch einen ruhenden Ball angehen (alwaysForce). */
const lauf = (lv, b, sek, t0 = 0, zielen = true) => {
  let t = t0;
  for (let i = 0; i < Math.round(sek / STEP); i++) { G.stepPhysics(lv, b, STEP, t, zielen); t += STEP; }
  return t;
};

console.log('\n--- Die Sprengladung ---');
{
  // Der Knall liegt am Anfang jedes Takts. Mit phase 0 zündet sie bei t = 0, 7.5, 15 ...
  const bau = () => G.buildLevel(feld([{ type: 'sprengladung', x: 11, y: 7.5, phase: 0 }]));
  const wurf = (dx) => {
    const lv = bau(), b = ball(11 + dx, 7.5);
    lauf(lv, b, 0.5, 0, false);            // über den Knall hinweg, ohne zu zielen
    return { v: Math.hypot(b.vx, b.vy), x: b.x, y: b.y };
  };
  const nah = wurf(0.6), mittel = wurf(1.8), fern = wurf(3.0), weg = wurf(4.0);
  pruef('nah am Zünder wirft es am weitesten', nah.v > mittel.v && mittel.v > fern.v,
    `${nah.v.toFixed(2)} > ${mittel.v.toFixed(2)} > ${fern.v.toFixed(2)} Kacheln/s`);
  pruef('jenseits der Reichweite passiert nichts', weg.v < 1e-9, `Tempo ${weg.v.toFixed(6)}`);
  pruef('geworfen wird nach außen', nah.x > 11 + 0.6, `von 11,60 auf ${nah.x.toFixed(2)}`);
  // Sie wirft auch einen Ball, der ruhig daliegt: das ist ihr eigentlicher Sinn
  {
    const lv = bau(), b = ball(11.8, 7.5);
    lauf(lv, b, 0.5, 0, false);
    pruef('auch ein liegender Ball wird geworfen', Math.hypot(b.vx, b.vy) > 1, `Tempo ${Math.hypot(b.vx, b.vy).toFixed(2)}`);
  }
  // Kein Strafschlag, kein Aus: die Ladung meldet nur ihren Knall
  {
    const lv = bau(), b = ball(11.8, 7.5);
    let arten = new Set();
    let t = G.SPRENG_TAKT - 0.1;      // kurz vor dem zweiten Knall einsteigen
    for (let i = 0; i < Math.round(0.5 / STEP); i++) { for (const e of G.stepPhysics(lv, b, STEP, t, false)) arten.add(e.type); t += STEP; }
    pruef('sie kostet keinen Schlag', !arten.has('oob') && !arten.has('spiked') && !arten.has('zapped'), [...arten].join(', ') || 'nichts gemeldet');
    pruef('der Knall wird einmal gemeldet', arten.has('spreng'), [...arten].join(', '));
  }
  // Zwischen zwei Knallen ist Ruhe
  {
    const lv = bau(), b = ball(11.8, 7.5);
    lauf(lv, b, 1.2, 1.0, false);          // mitten im Takt, weit weg vom Knall
    pruef('zwischen zwei Knallen ist Ruhe', Math.hypot(b.vx, b.vy) < 1e-9, `Tempo ${Math.hypot(b.vx, b.vy).toFixed(6)}`);
  }
}

console.log('\n--- Die Kippbühne ---');
{
  // Bühne von x = 9 bis x = 15 (Mitte 12), Achse längs x
  const bau = () => G.buildLevel(feld([{ type: 'kippbuehne', x: 9, y: 6.8, w: 6, h: 1.4, angle: 0 }]));
  /* Gemessen wird der Weg: Der Ball wird losgelassen und rollt, wohin die Bohle ihn schickt.
     Ein einzelner Rechenschritt sagt nichts – bei 240 Schritten je Sekunde ist jeder für sich
     winzig, erst die Summe ergibt die Bewegung, die man am Bildschirm sieht. */
  const loslassen = (x, sek = 1.6) => {
    const lv = bau(), b = ball(x, 7.5);
    lauf(lv, b, sek, 0, false);
    return b.x - x;
  };
  const vorn = loslassen(14.0), hinten = loslassen(10.0), mitte = loslassen(12.0), daneben = loslassen(17.5);
  pruef('hinter der Mitte wirft sie vorwärts', vorn > 0.8, `${vorn.toFixed(2)} Kacheln weiter`);
  pruef('vor der Mitte schickt sie zurück', hinten < -0.8, `${hinten.toFixed(2)} Kacheln zurück`);
  pruef('in der Totzone bleibt sie waagerecht', Math.abs(mitte) < 1e-9, `${mitte.toFixed(6)} Kacheln`);
  pruef('neben der Bühne passiert nichts', Math.abs(daneben) < 1e-9, `${daneben.toFixed(6)} Kacheln`);
  // Ohne Ball geht sie in die Waage zurück
  {
    const lv = bau(), b = ball(14, 7.5), k = lv.obstacles.find(o => o.type === 'kippbuehne');
    let t = 0;
    for (let i = 0; i < Math.round(1.2 / STEP); i++) { b.x = 14; b.y = 7.5; b.vx = 0; b.vy = 0; G.stepPhysics(lv, b, STEP, t, false); t += STEP; }
    const geneigt = k.neigung;
    b.x = 30; b.y = 30;                        // Ball weg von der Bühne
    t = lauf(lv, b, 2.5, t, false);
    pruef('ohne Ball kehrt sie in die Waage zurück', Math.abs(geneigt) > 0.3 && Math.abs(k.neigung) < 0.05,
      `geneigt ${geneigt.toFixed(2)} → ${k.neigung.toFixed(3)}`);
  }
}

/* ---------- Die Kippbühne auf dem Boden, auf dem sie wirklich liegt ----------
 *
 * Der Abschnitt darüber misst auf Eis – mit Absicht: Dort sieht man den Stoß und nicht die
 * Bremsung. Genau daran ist der Fehler aus Fassung 160 vorbeigelaufen, und es lohnt sich, ihn
 * aufzuschreiben, weil die Lehre allgemein ist:
 *
 *   Eine Prüfung auf einem Sonderboden beweist die Mechanik, nicht die Wirklichkeit.
 *
 * In der Mine liegt die Bohle auf Stollenboden ('#'), und der bremst mit 4,2 Kacheln/s². Die
 * Physik zieht die Bremsung im selben Schritt ab, in dem die Bohle schiebt, und kappt das Tempo
 * bei null: Eine Bohle, die mit weniger als 4,2 schiebt, bewegt einen liegenden Ball nicht
 * langsam, sondern gar nicht. Auf Eis (0,75) fiel das nie auf.
 *
 * Darum hier dasselbe noch einmal auf Stein – und mit einem ruhenden Ball, denn das ist der Fall,
 * den Fynn gemeldet hat: „man kann auf ihr liegen, ohne daß was passiert".
 */
console.log('\n--- Die Kippbühne auf Stein ---');
{
  const stein = (hindernisse) => ({
    name: 'Bohle auf Stein', par: 3, theme: 'stollen',
    map: ['......................', '.T##################H.',
          ...Array.from({ length: 13 }, () => '.####################.'), '......................'],
    obstacles: hindernisse,
  });
  const bau = () => G.buildLevel(stein([{ type: 'kippbuehne', x: 8, y: 6.8, w: 8, h: 1.4, angle: 0 }]));
  /* Der Ball wird hingelegt und nicht angestoßen – 'zielen' = false, also genau die Lage zwischen
     zwei Schlägen. Gemessen wird, wie weit er von selbst wandert. */
  const liegen = (u, sek = 3) => {
    const lv = bau(), k = lv.obstacles.find(o => o.type === 'kippbuehne');
    const x0 = k.cx + u * k.halb, b = ball(x0, k.cy);
    lauf(lv, b, sek, 0, false);
    return b.x - x0;
  };
  const mitte = liegen(0), knappVor = liegen(-0.2), knappNach = liegen(0.2);
  pruef('in der Totzone darf man liegenbleiben',
        Math.abs(mitte) < 0.02 && Math.abs(knappVor) < 0.02 && Math.abs(knappNach) < 0.02,
        `${mitte.toFixed(3)} / ${knappVor.toFixed(3)} / ${knappNach.toFixed(3)} Kacheln`);
  /* Und außerhalb: Sie muß den liegenden Ball WEGSCHIEBEN. Das ist der eigentliche Wächter gegen
     den Fehler – vorher stand hier überall 0,000. */
  for (const u of [0.35, 0.5, 0.7]) {
    const weg = liegen(u);
    pruef(`bei u = ${u} rutscht der liegende Ball nach vorn`, weg > 1.0, `${weg.toFixed(2)} Kacheln`);
  }
  for (const u of [-0.35, -0.5, -0.7]) {
    const weg = liegen(u);
    pruef(`bei u = ${u} rutscht er zurück`, weg < -1.0, `${weg.toFixed(2)} Kacheln`);
  }
  /* Der Grund in einer Zahl. Wer KIPP_KRAFT oder KIPP_MIN später herunterdreht, ohne an die
     Reibung zu denken, baut den Fehler wieder ein – und merkt es hier. Weich geholt, damit ein
     alter Stand ohne KIPP_MIN einen benannten Fehler gibt statt eines Absturzes. */
  const zahl = (name) => { try { return vm.runInContext(name, ctx); } catch (e) { return undefined; } };
  const kraft = zahl('KIPP_KRAFT'), min = zahl('KIPP_MIN'), reib = (zahl('FRICTION') || {})['#'];
  pruef('der Schub gleich hinter der Totzone schlägt die Reibung',
        typeof kraft === 'number' && typeof min === 'number' && typeof reib === 'number' && kraft * min > reib,
        `${kraft} × ${min} = ${(kraft * min || 0).toFixed(1)} gegen ${reib}`);
}

console.log('\n--- Die Bruchwand ---');
{
  /* Eine Wand quer im Gang, dahinter das Loch. Ohne Sprengung kommt der Ball nicht durch – mit
     einer schon, und dann für den Rest der Bahn. */
  const feldB = (hindernisse) => ({
    name: 'Bruchprüfung', par: 3, theme: 'stollen',
    map: ['......................', '.Tiiiiiiiiiiiiiiiiii H'.replace(' ', 'i'),
          ...Array.from({ length: 5 }, () => '.iiiiiiiiiiiiiiiiiiii.'), '......................'],
    obstacles: hindernisse,
  });
  const wand = () => ({ type: 'bruchwand', x: 11, y: 3.5, w: 1.4, h: 8 });

  // 1. Ohne Ladung bleibt sie stehen und hält den Ball auf
  {
    const lv = G.buildLevel(feldB([wand()]));
    const b = ball(4, 1.5); b.vx = 12;
    lauf(lv, b, 2.5);
    const w = lv.obstacles.find(o => o.type === 'bruchwand');
    pruef('ohne Sprengung steht sie', !w.weg);
    pruef('und der Ball kommt nicht vorbei', b.x < 11, `steht bei x = ${b.x.toFixed(1)}`);
  }

  // 2. Eine Ladung daneben bricht sie – und sie bleibt offen
  {
    const lv = G.buildLevel(feldB([wand(), { type: 'sprengladung', x: 11, y: 6.5, phase: 0 }]));
    const w = lv.obstacles.find(o => o.type === 'bruchwand');
    const b = ball(4, 1.5);
    const t1 = lauf(lv, b, 0.4, 0, false);          // über den Knall bei t = 0 hinweg
    pruef('eine Zündung daneben bricht sie', w.weg);
    const t2 = lauf(lv, b, 3, t1, false);
    pruef('und sie bleibt offen', w.weg);
    const b2 = ball(4, 1.5); b2.vx = 12;
    lauf(lv, b2, 2.5, t2);
    pruef('danach rollt der Ball hindurch', b2.x > 13, `bis x = ${b2.x.toFixed(1)}`);
  }

  // 3. Eine Ladung außer Reichweite lässt sie stehen
  {
    const lv = G.buildLevel(feldB([wand(), { type: 'sprengladung', x: 19, y: 3.5, phase: 0 }]));
    const w = lv.obstacles.find(o => o.type === 'bruchwand');
    lauf(lv, ball(4, 1.5), 0.6, 0, false);
    pruef('eine Zündung außer Reichweite lässt sie stehen', !w.weg);
  }

  // 4. Beim nächsten Loch steht sie wieder
  {
    const def = feldB([wand(), { type: 'sprengladung', x: 11, y: 6.5, phase: 0 }]);
    const lv1 = G.buildLevel(def);
    lauf(lv1, ball(4, 1.5), 0.4, 0, false);
    pruef('nach der Sprengung ist sie weg', lv1.obstacles.find(o => o.type === 'bruchwand').weg);
    const lv2 = G.buildLevel(def);
    pruef('beim nächsten Aufbau steht sie wieder', !lv2.obstacles.find(o => o.type === 'bruchwand').weg);
  }
}

/* ------------------------------------------------------------------------------------------- *
 * Der Gießlöffel: aus Glut wird Boden
 *
 * Er ist das einzige Hindernis im Spiel, das die Bahn *aufbaut*. Geprüft wird genau das, in der
 * Reihenfolge, in der man es auch erzählen würde: Am Anfang ist die Rinne Glut. Jeder Guss füllt
 * ein Feld weiter. Beim Guss glüht die ganze gefüllte Rinne, weil das Erz darüber hinwegläuft –
 * und sie kühlt von hinten nach vorn ab, damit man der Abkühlung hinterherlaufen kann. Und beim
 * nächsten Loch steht wieder Glut da, nicht die Brücke der letzten Runde.
 */
{
  const rinne = { x: 4, y: 3, len: 4, dx: 1, dy: 0 };
  const feldG = (extra = {}) => ({
    name: 'Gießprüfung', par: 3, theme: 'schmelze',
    map: ['..........................', '.T........................',
          ...Array.from({ length: 4 }, () => '.########################.'),
          '.........................H', '..........................'],
    obstacles: [{ type: 'giessloeffel', x: 3.5, y: 3.5, takt: 4, kipp: 1, glut: 2, rinne, ...extra }],
  });
  /* Die Karte von Hand mit Glut versehen – fuell gibt es hier nicht, und die Rinne muss auf Glut
     stehen, sonst prüfte man etwas anderes als im Spiel. */
  const mitGlut = (def) => {
    def.map = def.map.map((r, y) => y !== rinne.y ? r
      : r.slice(0, rinne.x) + 'l'.repeat(rinne.len) + r.slice(rinne.x + rinne.len));
    return def;
  };
  const kachel = (lv, i) => lv.untenFl.tiles[rinne.y][rinne.x + i];
  const reihe = (lv) => Array.from({ length: rinne.len }, (_, i) => kachel(lv, i)).join('');

  {
    const lv = G.buildLevel(mitGlut(feldG()));
    const g = lv.obstacles.find(o => o.type === 'giessloeffel');
    g.update(0);
    pruef('am Anfang ist die Rinne Glut', reihe(lv) === 'llll', reihe(lv));

    // Vier Takte laufen lassen und nach jedem Guss im kalten Fenster nachsehen
    const stand = [];
    for (let k = 1; k <= 4; k++) {
      for (let t = (k - 1) * 4; t < k * 4; t += 0.05) g.update(t);
      g.update(k * 4 - 0.1);           // kurz vor dem nächsten Kippen: alles erkaltet
      stand.push(reihe(lv));
    }
    pruef('jeder Guss füllt ein Feld weiter', stand.join(' ') === '#lll ##ll ###l ####', stand.join(' '));
    pruef('nach dem letzten Guss trägt die ganze Rinne', reihe(lv) === '####');
  }

  {
    // Beim Guss glüht die ganze gefüllte Rinne – das Erz läuft ja darüber hinweg
    const lv = G.buildLevel(mitGlut(feldG()));
    const g = lv.obstacles.find(o => o.type === 'giessloeffel');
    /* Gegossen wird am *Ende* des Kippens, also bei t = 1, 5, 9, 13 – nicht bei Vielfachen des
       Takts. Bei 11,9 s sind drei Güsse durch und alles ist erkaltet. */
    for (let t = 0; t < 12; t += 0.05) g.update(t);      // drei Güsse
    g.update(11.9); const kalt = reihe(lv);
    for (let t = 12.9; t < 13.2; t += 0.02) g.update(t); // mitten im vierten Guss
    pruef('vor dem Guss ist das Gefüllte Boden', kalt === '###l', kalt);
    pruef('beim Guss glüht die ganze Rinne wieder', reihe(lv) === 'llll', reihe(lv));
    // Und sie kühlt von hinten nach vorn ab
    let hinten = -1, vorn = -1;
    for (let t = 13.2; t < 18; t += 0.05) {
      g.update(t);
      if (hinten < 0 && kachel(lv, 0) === '#') hinten = t;
      if (vorn < 0 && kachel(lv, 2) === '#') vorn = t;
    }
    pruef('sie kühlt von hinten nach vorn ab', hinten > 0 && vorn > hinten,
          `hinten bei ${hinten.toFixed(2)}s, vorn bei ${vorn.toFixed(2)}s`);
  }

  {
    // Wer beim Guss auf der Rinne liegt, liegt in der Glut
    const def = mitGlut(feldG());
    const lv = G.buildLevel(def);
    const g = lv.obstacles.find(o => o.type === 'giessloeffel');
    for (let t = 0; t < 8; t += 0.05) g.update(t);
    g.update(7.9);
    pruef('nach zwei Güssen liegen zwei Felder', reihe(lv) === '##ll', reihe(lv));
    const b = ball(rinne.x + 0.5, rinne.y + 0.5);       // auf dem ersten, erkalteten Feld
    let ev = [], getroffen = false;
    for (let t = 8.6; t < 9.6; t += 1 / 240) {
      for (const o of lv.obstacles) if (o.update) o.update(t);
      ev = G.stepPhysics(lv, b, 1 / 240, t, false);
      if (ev.some(e => e.type === 'lava')) { getroffen = true; break; }
    }
    pruef('der nächste Guss erwischt, wer auf der Rinne wartet', getroffen);
  }

  {
    // Beim nächsten Loch steht wieder Glut da
    const def = mitGlut(feldG());
    const lv1 = G.buildLevel(def);
    const g1 = lv1.obstacles.find(o => o.type === 'giessloeffel');
    for (let t = 0; t < 20; t += 0.05) g1.update(t);
    pruef('nach dem Durchlauf ist die Brücke fertig', g1.gefuellt === rinne.len, `${g1.gefuellt} Felder`);
    const lv2 = G.buildLevel(def);
    pruef('beim nächsten Aufbau steht wieder Glut da', reihe(lv2) === 'llll', reihe(lv2));
  }
}

/* ------------------------------------------------------------------------------------------- *
 * Das Fass steht im Raum, nicht auf dem Bildschirm
 *
 * Der Vorgänger an dieser Stelle war ein Trapez, das am Bildschirmpunkt gemalt wurde: ein paar
 * fillRect und ein Farbverlauf quer über die Breite. Von vorn sah das aus wie ein Körper – bis man
 * die Kamera drehte, dann drehte sich der Aufkleber mit und der Raum wurde wieder zum Bild. Gebaut
 * wird das Fass wie die Maschinen: aus saeule, in Kacheln und in Weltkoordinaten.
 *
 * Nachweisbar ist das am Quelltext, nicht am Rechnen – gezeichnet wird auf einer Leinwand, die es
 * hier nicht gibt. Darum wird hier gelesen: die räumlichen Bausteine müssen vorkommen, und die
 * Bildschirmbefehle dürfen es nicht. */
{
  const quelle = fs.readFileSync(path.join(SRC, 'render_mine.js'), 'utf8');
  const i = quelle.indexOf('drawFass(ctx, ob, sq) {');
  const koerper = i < 0 ? '' : quelle.slice(i, quelle.indexOf('\n  },', i));
  pruef('drawFass gibt es', i >= 0);
  for (const baustein of ['this.saeule(', 'this.isoEllipse('])
    pruef(`baut mit ${baustein.slice(5, -1)}`, koerper.includes(baustein));
  for (const flach of ['fillRect', 'strokeRect', 'createLinearGradient', 'this.proj('])
    pruef(`malt nicht mit ${flach}`, !koerper.includes(flach));
  /* Und jeder Prellklotz der Welt muss einen Stil tragen, den der Zeichner auch kennt. Beim
     Umbenennen von 'stempel' auf 'fass' wäre sonst still ein Pilz übriggeblieben: Der Zeichner
     fällt am Ende der Kette auf den Fliegenpilz zurück, ohne sich zu beschweren. */
  const zeichner = fs.readFileSync(path.join(SRC, 'render.js'), 'utf8');
  const bekannt = new Set([...zeichner.matchAll(/ob\.style === '([a-z]+)'/g)].map(m => m[1]));
  const klotz = vm.runInContext("MINE_COURSES.flatMap(c => (c.obstacles||[]).filter(o => o.type === 'bumper'))", ctx);
  const fremd = klotz.filter(o => !bekannt.has(o.style));
  pruef('jeder Prellklotz trägt einen Stil, den der Zeichner kennt', fremd.length === 0,
        fremd.length ? fremd.map(o => o.style).join(', ') : `${klotz.length} Stück`);
  pruef('keiner steht mehr auf dem alten „stempel"', !klotz.some(o => o.style === 'stempel'));
}

/* ---------- Die Lavafontäne ----------
 *
 * Sie ist die einzige Falle im Spiel außer dem springenden Hai, die einen *fliegenden* Ball holt.
 * Genau daran hängt die Bahn „Die zerbrochene Brücke": Wäre der Sprung immer sicher, gäbe es dort
 * nichts zu entscheiden. Darum wird hier nicht nachgelesen, ob der Haken dasteht, sondern mit der
 * echten Physik nachgespielt, was einem Ball in der Luft passiert.
 *
 * Und das Zweite: Tödlich ist allein der stehende Strahl. Die Vorwarnung muß folgenlos sein –
 * sonst wäre sie keine Warnung, sondern schon der Treffer.
 */
{
  const feldF = (extra = {}) => ({
    name: 'Fontänenprüfung', par: 3, theme: 'schmelze',
    map: ['..........................', '.T........................',
          ...Array.from({ length: 4 }, () => '.########################.'),
          '.........................H', '..........................'],
    obstacles: [{ type: 'lavafontaene', x: 8.5, y: 3.5, r: 0.8, takt: 2.1, droht: 0.5, oben: 0.55, ...extra }],
  });
  const lv = G.buildLevel(feldF());
  const f = lv.obstacles.find(o => o.type === 'lavafontaene');
  const gebaut = !!f && typeof f.update === 'function' && typeof f.airTrigger === 'function';
  pruef('die Fontäne wird gebaut', gebaut);
  /* Fehlt sie, fällt der Rest nicht mit einem Absturz aus, sondern mit Namen. Eine Prüfung, die
     beim ersten Fehler stirbt, sagt nur, *dass* etwas kaputt ist – nicht was alles. */
  if (!gebaut) for (const n of ['sie hat Ruhe, Vorwarnung und Stoß', 'der Takt ist kurz',
                                'der stehende Strahl verbrennt den Ball', 'die Vorwarnung tut nichts',
                                'der Strahl holt auch einen fliegenden Ball herunter',
                                'jenseits des Rings ist man sicher'])
    pruef(n, false, 'die Fontäne fehlt');
  if (gebaut) {

  /* Der Takt. „Recht schnell" ist keine Geschmacksfrage, sondern die Aufgabe: Bei einem langen
     Takt wartet man die Ruhe ab und spielt in aller Gemütlichkeit weiter. */
  const dauer = {};
  for (let t = 0; t < f.takt; t += 0.002) { f.update(t); dauer[f.state] = (dauer[f.state] || 0) + 0.002; }
  pruef('sie hat Ruhe, Vorwarnung und Stoß',
        dauer.ruhe > 0 && dauer.droht > 0 && dauer.stoss > 0,
        Object.entries(dauer).map(([k, v]) => `${k} ${v.toFixed(2)}s`).join(', '));
  pruef('der Takt ist kurz', f.takt <= 3.0, `${f.takt}s`);
  pruef('und die Ruhe kürzer als zwei Sekunden', (dauer.ruhe || 0) < 2.0, `${(dauer.ruhe || 0).toFixed(2)}s`);

  /* Wer im Strahl liegt, verbrennt – und nur dann. Gemessen wird mit der echten Physik: Der Ball
     liegt auf dem Spalt, und über einen ganzen Umlauf wird mitgeschrieben, wann ein Lava-Ereignis
     fällt. */
  const zeiten = { ruhe: 0, droht: 0, stoss: 0 };
  {
    const b = ball(8.5, 3.5);
    for (let t = 0; t < f.takt * 2; t += STEP) {
      b.x = 8.5; b.y = 3.5; b.vx = 0; b.vy = 0;
      const ev = G.stepPhysics(lv, b, STEP, t, true);
      if (ev.some(e => e.type === 'lava')) zeiten[f.state] = (zeiten[f.state] || 0) + 1;
    }
  }
  pruef('der stehende Strahl verbrennt den Ball', zeiten.stoss > 0, `${zeiten.stoss} Bildschritte`);
  pruef('die Vorwarnung tut nichts', zeiten.droht === 0, `${zeiten.droht} Treffer in der Vorwarnung`);
  pruef('und in Ruhe ist der Spalt harmlos', zeiten.ruhe === 0, `${zeiten.ruhe} Treffer in der Ruhe`);

  /* Der eigentliche Punkt: ein Ball in der Luft. Die Physik überspringt im Flug fast alles – ohne
     airTrigger flöge man ungestraft über jede Fontäne, und die zerbrochene Brücke wäre geschenkt. */
  const imFlug = (t0) => {
    const b = ball(8.5, 3.5);
    let getroffen = false;
    for (let t = t0, i = 0; i < 20; i++, t += STEP) {
      b.x = 8.5; b.y = 3.5; b.vx = 0; b.vy = 0;
      b.air = true; b.z = 2.0; b.vz = 0;                 // in der Luft festhalten
      const ev = G.stepPhysics(lv, b, STEP, t, true);
      if (ev.some(e => e.type === 'lava')) getroffen = true;
    }
    return getroffen;
  };
  // Ein Zeitpunkt mitten im Stoß und einer mitten in der Ruhe
  const imStoss = f.droht + f.oben / 2, inRuhe = f.droht + f.oben + (f.takt - f.droht - f.oben) / 2;
  pruef('der Strahl holt auch einen fliegenden Ball herunter', imFlug(imStoss), `bei t=${imStoss.toFixed(2)}s`);
  pruef('und wer im richtigen Augenblick springt, kommt durch', !imFlug(inRuhe), `bei t=${inRuhe.toFixed(2)}s`);

  /* Außerhalb der Reichweite tut sie nichts – sonst wäre der Ring auf dem Boden gelogen. */
  {
    const b = ball(8.5 + f.r + 0.8, 3.5);
    let getroffen = false;
    for (let t = 0; t < f.takt; t += STEP) {
      b.x = 8.5 + f.r + 0.8; b.y = 3.5; b.vx = 0; b.vy = 0;
      const ev = G.stepPhysics(lv, b, STEP, t, true);
      if (ev.some(e => e.type === 'lava')) getroffen = true;
    }
    pruef('jenseits des Rings ist man sicher', !getroffen);
  }

  }

  /* Die Bahn dazu. Der Sprung muß über die Fontäne führen – stünde sie neben dem Flugweg, wäre
     der Haken in der Luft ohne Wirkung und die Bahn eine gewöhnliche Rampe. */
  const bahn = vm.runInContext("MINE_COURSES.find(c => c.name === 'Die zerbrochene Brücke')", ctx);
  pruef('es gibt die zerbrochene Brücke', !!bahn);
  if (bahn) {
    const fs_ = (bahn.obstacles || []).filter(o => o.type === 'lavafontaene');
    const rampen = (bahn.obstacles || []).filter(o => o.type === 'ramp');
    pruef('sie hat Fontänen', fs_.length >= 1, `${fs_.length} Stück`);
    pruef('und eine Rampe', rampen.length === 1);
    if (rampen.length === 1 && fs_.length) {
      const rp = rampen[0];
      const a = (rp.angle ?? 90) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a);
      const halb = Math.abs(dx) > 0.5 ? rp.w / 2 : rp.h / 2;
      const mx = rp.x + rp.w / 2, my = rp.y + rp.h / 2;
      const lx = mx + dx * (halb + (rp.land ?? 1.7)), ly = my + dy * (halb + (rp.land ?? 1.7));
      // Liegt eine Fontäne zwischen Rampenkante und Aufsetzpunkt, und zwar auf dem Flugweg?
      const ueber = fs_.some(o => {
        const u = ((o.x - mx) * dx + (o.y - my) * dy);
        const quer = Math.abs((o.x - mx) * -dy + (o.y - my) * dx);
        return u > halb && u < (halb + (rp.land ?? 1.7)) && quer < o.r + 0.5;
      });
      pruef('und der Sprung führt über eine Fontäne hinweg', ueber,
            `Rampe (${mx},${my}) → (${lx.toFixed(1)},${ly.toFixed(1)})`);
    }
  }

  /* Gezeichnet werden muß sie auch – und zwar der Ring *immer*, nicht nur beim Stoß: Wo es gleich
     brennt, muß man auch dann sehen, wenn gerade nichts brennt. */
  const zeichner = fs.readFileSync(path.join(SRC, 'render_mine.js'), 'utf8');
  const haupt = fs.readFileSync(path.join(SRC, 'render.js'), 'utf8');
  for (const [was, muster] of [['den Boden der Fontäne', /drawFontaeneFloor\(ctx, ob, t\) \{/],
                               ['den Strahl', /drawLavafontaene\(ctx, ob, t\) \{/],
                               ['einen Reichweitenring', /Reichweitenring/],
                               ['Funken beim Stoß', /Spritzer/]])
    pruef(`der Zeichner hat ${was}`, muster.test(zeichner));
  pruef('und render.js ruft beides auf',
        /ob\.type === 'lavafontaene'\) \{ this\.drawFontaeneFloor/.test(haupt) && /drawLavafontaene\(ctx, ob, t\)/.test(haupt));
  pruef('die Fontäne zählt als Licht', /ob\.type === 'lavafontaene'\) \{\n\s*lichter\.push/.test(zeichner));
  const teilen = fs.readFileSync(path.join(SRC, 'share.js'), 'utf8');
  pruef('und geteilte Bahnen dürfen sie enthalten', /'lavafontaene'/.test(teilen));
}

/* ---------- Der Schmelzofen ----------
 * Es ist die Windmühle des Märchenlands, nur anders gezeichnet: ein Bau quer über dem Weg, ein
 * Maul in der Mitte, davor ein Rad, dessen Blätter den Weg im Takt versperren. Ein Windrad
 * sechshundert Meter unter Tage wäre Unsinn - also derselbe Bau, andere Sprache.
 *
 * Geprüft wird darum vor allem das eine: daß unter Tage keine Windmühle *als* Windmühle steht.
 * Ein vergessener Stil fiele sonst nicht auf - der Zeichner beschwert sich nicht, er malt ein
 * Segeltuch-Kreuz in den Berg. */
{
  const muehlen = vm.runInContext("MINE_COURSES.flatMap(c => (c.obstacles||[]).map(o => ({ bahn: c.name, o })).filter(z => z.o.type === 'windmill'))", ctx);
  pruef('die Mine hat einen Ofen', muehlen.length > 0, muehlen.map(z => z.bahn).join(', '));
  const alsMuehle = muehlen.filter(z => z.o.style !== 'ofen');
  pruef('und keine Windmühle unter Tage', alsMuehle.length === 0,
        alsMuehle.length ? alsMuehle.map(z => `${z.bahn}: ${z.o.style || 'ohne Stil'}`).join(', ') : `${muehlen.length} als Ofen`);
  /* Das Maul muß breiter sein als der Ball, sonst stünde dort eine Mauer statt eines Durchgangs. */
  const eng = muehlen.filter(z => (z.o.gap ?? 0.8) < 0.75);
  pruef('das Maul ist breiter als der Ball', eng.length === 0,
        eng.length ? eng.map(z => `${z.bahn}: ${z.o.gap}`).join(', ') : `${muehlen.map(z => z.o.gap).join(', ')}`);

  const zeichner2 = fs.readFileSync(path.join(SRC, 'render.js'), 'utf8');
  pruef('der Zeichner biegt beim Stil „ofen" ab', /ob\.style === 'ofen'/.test(zeichner2));
  const q = fs.readFileSync(path.join(SRC, 'render_mine.js'), 'utf8');
  const j = q.indexOf('drawSchmelzofen(ctx, ob, t) {');
  pruef('drawSchmelzofen gibt es', j >= 0);
  const leib = j < 0 ? '' : q.slice(j, q.indexOf('\n  },', j));
  /* Es soll ein Ofen sein und keine Mühle mit anderer Farbe: Esse, brennendes Maul, Ofenklappe. */
  for (const [was, muster] of [['eine Esse mit Rauch', /schlot/], ['ein brennendes Maul', /bogen\(\)/],
                               ['eine Ofenklappe', /Ofenklappe/], ['Glut, die atmet', /glut/]])
    pruef(`er hat ${was}`, muster.test(leib));
  pruef('und kein Segeltuch', !/245,235,210/.test(leib));
  /* Die Feinarbeit. Sie steht hier, weil sie sonst beim nächsten Umbau still verschwindet - und
     ohne sie ist der Ofen wieder der glatte Kasten mit einem Loch, den es in Fassung 156 gab. */
  for (const [was, muster] of [['gemauerte Lagen mit versetzten Stoßfugen', /steinBreit/],
                               ['Zugeisen in der Wand', /Zugeisen/],
                               ['einen Rauchfang unter der Esse', /this\.frustum\(ctx, quad\(/],
                               ['Eisenringe um die Esse', /for \(const zr of/],
                               ['Funken über der Esse', /Funken/],
                               ['Ruß über dem Maul', /russ\.addColorStop/],
                               ['ein Kohlenbett mit Brocken', /bett\.addColorStop/],
                               ['Flammenzungen', /quadraticCurveTo/],
                               ['einen Schieberkasten für die Klappe', /Schieberkasten/],
                               ['Nieten auf dem Eisen', /Nieten/]])
    pruef(`er hat ${was}`, muster.test(leib));
  /* Und das Kleinteilige hängt am Maßstab: Aus der Übersicht verschmieren Fugen und Nieten zu
     einem grauen Schleier - dort ist weniger mehr. */
  pruef('die Feinarbeit hängt am Maßstab',
        /const fein = s > \d+/.test(leib) && (leib.match(/\(fein\)|\(!fein\)/g) || []).length >= 4);
  /* Und vor allem: kein Rad. Ein Schaufelrad vor dem Maul waere die Muehle in Eisen - der Ofen
     soll mit dem sperren, was ein Ofen hat. */
  pruef('und kein Rad vor dem Maul', !/for \(let i = 0; i < ob\.blades/.test(leib));
  /* Die Klappe muß denselben Winkel lesen, aus dem das Hindernis 'blocked' rechnet. Malte sie nach
     eigener Uhr, zeigte das Bild etwas anderes an, als gilt - und das ist schlimmer als gar kein
     Bild: Man verließe sich darauf. */
  pruef('die Klappe liest den Winkel des Hindernisses', /ob\.angle/.test(leib) && /ob\.blades/.test(leib));
  pruef('sie misst den Abstand zum untersten Punkt', /const naehe = Math\.min\(roh, schritt - roh\)/.test(leib));
  const hind = fs.readFileSync(path.join(SRC, 'obstacles.js'), 'utf8');
  pruef('das Hindernis sperrt weiterhin bei 0,3', /rel < 0\.3 \|\| rel > step - 0\.3/.test(hind));
  /* Nicht nur „irgendein Wert steht da", sondern *derselbe*: Die Schwelle wird aus beiden Dateien
     gelesen und verglichen. Stünde in der Zeichnung eine andere, zeigte die Klappe „zu", wo man
     durchkommt - oder schlimmer „offen", wo man anstößt. */
  const sperrtHind = hind.match(/rel < (\d[\d.]*) \|\| rel > step - \1/);
  const sperrtBild = leib.match(/const SPERRT = (\d[\d.]*), FAHRWEG = (\d[\d.]*)/);
  pruef('und ist genau dann ganz zu, wenn das Hindernis sperrt',
        !!sperrtBild && !!sperrtHind && Number(sperrtBild[1]) === Number(sperrtHind[1]),
        sperrtBild && sperrtHind ? `Bild ${sperrtBild[1]} / Physik ${sperrtHind[1]}` : 'Schwelle nicht ablesbar');
  pruef('und fährt aus der Sperre heraus', /\(SPERRT \+ FAHRWEG - naehe\) \/ FAHRWEG/.test(leib));
  /* Und sie muß auch wirklich ganz oben ankommen. Der Winkel entfernt sich über den Umlauf nie
     weiter als einen halben Blattabstand vom untersten Punkt - bei vier Blättern 0,785. Reicht der
     Fahrweg darüber hinaus, steht die Klappe nie ganz offen: Der Weg sieht versperrt aus, obwohl
     er die meiste Zeit frei ist. Genau das war in Fassung 156 so. */
  if (sperrtBild) {
    const weitest = Math.PI / 4, offenAb = Number(sperrtBild[1]) + Number(sperrtBild[2]);
    pruef('und steht einen guten Teil des Umlaufs ganz offen', offenAb < weitest - 0.15,
          `ganz offen ab ${offenAb.toFixed(2)} von höchstens ${weitest.toFixed(3)}`);
  }
  /* Und er leuchtet: ein Feuer, das kein Licht gibt, wäre Kulisse. */
  pruef('der Ofen zählt als Licht', /ob\.style === 'ofen'\) lichter\.push/.test(q));
}

console.log(`\n${fehler ? fehler + ' FEHLER' : 'alles bestanden'}`);
process.exit(fehler ? 1 : 0);
