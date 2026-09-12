/* Prüft den Stoß zwischen mehreren Bällen – und vor allem, dass sich für einen einzelnen Ball
 * nichts geändert hat.
 *
 *   node tools/stoss.mjs
 *
 * Der letzte Abschnitt ist der wichtigste: Alle heutigen Spielarten bewegen genau einen Ball, und
 * dort darf der Umbau nicht das Geringste ändern. Ein um 1e-15 verschobener Aufprall führt nach
 * zwei Sekunden in eine andere Ecke der Bahn – das lässt sich nicht durch Hinsehen ausschließen,
 * also wird jede Bahn einmal durchgespielt und Schritt für Schritt verglichen.
 */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'src');
const ctx = { console, performance: { now: () => 0 }, window: {} }; vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow',
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_pro', 'level',
                 'obstacles', 'obstacles_legend', 'obstacles_snow', 'physics'])
  vm.runInContext(fs.readFileSync(path.join(SRC, `${f}.js`), 'utf8'), ctx);
const G = vm.runInContext('({buildLevel, makeBall, stepPhysics, stepBaelle, ballStoss, WORLDS})', ctx);
const STEP = 1 / 240, MAX_SHOT = 19;

let fehler = 0;
const pruef = (name, ok, zusatz = '') => { console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++; };
const nah = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

/* Eine leere Eisbahn: kein Hindernis, fast keine Reibung. So sieht man den Stoß und nicht die Bremsung. */
const EIS = {
  name: 'Stoßprüfung', par: 3, theme: 'meadow',
  map: ['....................', '.TiiiiiiiiiiiiiiiiH.',
        ...Array.from({ length: 9 }, () => '.iiiiiiiiiiiiiiiiii.'), '....................'],
  obstacles: [],
};
const ball = (x, y, vx = 0, vy = 0, r) => { const b = G.makeBall(x, y, '#fff'); b.vx = vx; b.vy = vy; if (r) b.r = r; return b; };
const lauf = (baelle, schritte, lv = G.buildLevel(EIS)) => { let t = 0; for (let i = 0; i < schritte; i++) { G.stepBaelle(lv, baelle, STEP, t, true); t += STEP; } return lv; };

console.log('\n--- Der Impuls ---');
{
  const a = ball(5, 5, 4, 0), b = ball(5.4, 5, 0, 0);
  const masse = x => x.r ** 3;
  const p0 = masse(a) * a.vx + masse(b) * b.vx;
  const e0 = 0.5 * masse(a) * a.vx ** 2;
  G.ballStoss(a, b, []);
  pruef('Impuls bleibt erhalten', nah(masse(a) * a.vx + masse(b) * b.vx, p0, 1e-12));
  pruef('Energie wird nicht gewonnen', 0.5 * masse(a) * a.vx ** 2 + 0.5 * masse(b) * b.vx ** 2 <= e0 + 1e-12);
  pruef('quer zur Stoßlinie ändert sich nichts', nah(a.vy, 0) && nah(b.vy, 0));
  pruef('sie überlappen danach nicht mehr', Math.hypot(b.x - a.x, b.y - a.y) >= a.r + b.r - 1e-12);
}

console.log('\n--- Stoß auf der Bahn ---');
{
  const a = ball(4, 5.5, 6, 0), b = ball(9, 5.5);
  const lv = G.buildLevel(EIS);
  let t = 0, beim = null;
  for (let i = 0; i < 400 && !beim; i++) {
    const ev = G.stepBaelle(lv, [a, b], STEP, t, true); t += STEP;
    if (ev.some(e => e.some(x => x.type === 'ballStoss'))) beim = { a: a.vx, b: b.vx };
  }
  pruef('der Stoß wird gemeldet', !!beim);
  pruef('der ruhende Ball läuft los', beim && beim.b > 0.5, beim && `vx ${beim.b.toFixed(3)}`);
  pruef('der stoßende rollt langsamer weiter', beim && beim.a > 0.01 && beim.a < 6, beim && `vx ${beim.a.toFixed(3)}`);
}
{
  const a = ball(4, 5.5, 5, 0), b = ball(9, 5.5, -5, 0);
  lauf([a, b], 200);
  pruef('frontal: beide kehren um', a.vx < 0 && b.vx > 0, `${a.vx.toFixed(2)} / ${b.vx.toFixed(2)}`);
}
{
  const a = ball(4, 5.5, 9, 0), b = ball(9, 5.5);
  lauf([a, b], 900);
  pruef('nach dem Stoß gilt die Mauer weiter', b.x > 1 && b.x < 19 && b.vx < 0, `x ${b.x.toFixed(2)}, vx ${b.vx.toFixed(2)}`);
}
{
  const a = ball(3, 5.5, 8, 0), b = ball(8, 5.5), c = ball(8.7, 5.5);
  lauf([a, b, c], 500);
  pruef('eine Kette aus drei Bällen löst sich auf', c.x > 8.9
    && Math.hypot(b.x - a.x, b.y - a.y) > 0.59 && Math.hypot(c.x - b.x, c.y - b.y) > 0.59);
}
{
  const a = ball(5, 5.5, 5, 0), b = ball(5.4, 5.5); b.air = true; b.z = 1.4;
  lauf([a, b], 1);
  pruef('ein fliegender Ball wird nicht angestoßen', nah(b.vx, 0) && nah(b.vy, 0));
}
{
  const a = ball(5, 5.5, 5, 0), b = ball(5.4, 5.5); b.ebene = 1;
  lauf([a, b], 1);
  pruef('Bälle auf verschiedenen Ebenen stoßen nicht', nah(b.vx, 0));
}
{
  const gross = ball(5, 5.5, 5, 0), klein = ball(5.35, 5.5, 0, 0, 0.15);
  G.ballStoss(gross, klein, []);
  pruef('der kleinere Ball wird stärker weggestoßen', Math.abs(klein.vx) > Math.abs(gross.vx));
}

console.log('\n--- Maschinen laufen einmal je Schritt, nicht einmal je Ball ---');
{
  /* Stacheln und Fallbeil merken sich, ob sie im Bild davor schon zu waren – daran hängt der
     Strafschlag. Ein Tor am Schalter schiebt sein Blatt Schritt für Schritt weiter. */
  const BAHN = {
    name: 'Maschinen', par: 3, theme: 'meadow',
    map: ['........................', '.T####################H.', '.######################.',
          '.######################.', '.######################.', '........................'],
    obstacles: [{ type: 'spikes', x: 8, y: 2.5, w: 4, h: 3, period: 3, up: 0.4 },
                { type: 'gate', x: 16, y: 2.5, w: 0.4, h: 3, linked: 'a' }],
  };
  const tor = lv => lv.obstacles.find(o => o.type === 'gate');
  const spiel = proBall => {
    const lv = G.buildLevel(BAHN); lv.switches = { a: 999 };
    const bs = [G.makeBall(7.2, 2.5, '#fff'), G.makeBall(8.8, 2.5, '#fff')];
    const zahl = [0, 0], weg = []; let t = 0;
    for (let i = 0; i < 900; i++) {
      if (proBall) bs.forEach((b, k) => { for (const e of G.stepPhysics(lv, b, STEP, t, true)) if (e.type === 'spiked') zahl[k]++; });
      else G.stepBaelle(lv, bs, STEP, t, true).forEach((ev, k) => { for (const e of ev) if (e.type === 'spiked') zahl[k]++; });
      if (i < 40) weg.push(tor(lv).lift.toFixed(9));
      t += STEP;
    }
    return { zahl, weg: weg.join(' ') };
  };
  const richtig = spiel(false), falsch = spiel(true);
  pruef('beide Bälle werden gleich oft aufgespießt', richtig.zahl[0] > 0 && richtig.zahl[0] === richtig.zahl[1],
        `${richtig.zahl[0]} und ${richtig.zahl[1]}`);
  pruef('die Gegenprobe fällt auf (sonst prüft das hier nichts)', falsch.zahl[1] !== richtig.zahl[1],
        `je Ball gerechnet bekäme der zweite ${falsch.zahl[1]} statt ${richtig.zahl[1]}`);
  pruef('das Torblatt läuft nicht doppelt so schnell', falsch.weg !== richtig.weg);
}

console.log('\n--- Ein einzelner Ball: nichts hat sich geändert ---');
{
  let bahnen = 0, schuesse = 0, schritte = 0, abweichung = null;
  for (const w of G.WORLDS) {
    for (const def of w.courses) {
      bahnen++;
      for (let k = 0; k < 8 && !abweichung; k++) {
        for (const pow of [0.4, 0.85]) {
          const lvA = G.buildLevel(def), lvB = G.buildLevel(def);
          const a = G.makeBall(lvA.tee.x, lvA.tee.y, '#fff'), b = G.makeBall(lvB.tee.x, lvB.tee.y, '#fff');
          const ang = k * Math.PI / 4;
          a.vx = b.vx = Math.cos(ang) * pow * MAX_SHOT; a.vy = b.vy = Math.sin(ang) * pow * MAX_SHOT;
          schuesse++;
          let t = 0;
          for (let i = 0; i < 1400; i++) {
            const evA = G.stepPhysics(lvA, a, STEP, t, true);
            const evB = G.stepBaelle(lvB, [b], STEP, t, true)[0];
            t += STEP; schritte++;
            const zA = [a.x, a.y, a.z, a.vx, a.vy, a.vz, a.ebene | 0, a.air ? 1 : 0, a.r, evA.map(e => e.type).join(',')].join('|');
            const zB = [b.x, b.y, b.z, b.vx, b.vy, b.vz, b.ebene | 0, b.air ? 1 : 0, b.r, evB.map(e => e.type).join(',')].join('|');
            if (zA !== zB) { abweichung = `${w.name}/${def.name} Winkel ${k} Kraft ${pow} Schritt ${i}:\n    einzeln ${zA}\n    Liste   ${zB}`; break; }
            if (evA.some(e => ['sunk', 'oob', 'water', 'lava', 'spiked', 'zapped', 'fell'].includes(e.type))) break;
          }
          if (abweichung) break;
        }
      }
    }
  }
  pruef(`${bahnen} Bahnen, ${schuesse} Schläge, ${schritte.toLocaleString('de-DE')} Schritte – jede Stelle gleich`,
        !abweichung, abweichung || '');
}

console.log(`\n${fehler ? fehler + ' FEHLER' : 'alles bestanden'}`);
process.exit(fehler ? 1 : 0);
