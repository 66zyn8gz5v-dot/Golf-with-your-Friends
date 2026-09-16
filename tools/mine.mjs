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

console.log(`\n${fehler ? fehler + ' FEHLER' : 'alles bestanden'}`);
process.exit(fehler ? 1 : 0);
