/* Prüft die Maschinen des Schneebergs – Seilbahn, Schneebrücke, Lawine, Windfahne.
 *
 *   node tools/schnee.mjs
 *
 * Der Anlass war ein Fehler, den man nur sah und nicht ausrechnete: Auf „Der Gipfel" schwebte der
 * Ball in der oberen Gondel eine ganze Etage über der Kabine. Der Grund war eine Verwechslung von
 * zwei Höhenmaßen – die Gondel rechnet vom Grund der Bahn, der Ball von seiner eigenen Etage aus.
 * Genau das wird hier nachgerechnet, und zwar für jede Seilbahn jeder Bahn: Was man sieht, muss
 * aus Zahlen folgen, sonst merkt es beim nächsten Mal wieder niemand.
 */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(WURZEL, 'src');
const ctx = { console, performance: { now: () => 0 }, window: {} }; vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow',
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_pro', 'level',
                 'obstacles', 'obstacles_legend', 'obstacles_snow', 'obstacles_mine', 'physics'])
  vm.runInContext(fs.readFileSync(path.join(SRC, `${f}.js`), 'utf8'), ctx);
const G = vm.runInContext('({buildLevel, makeBall, stepPhysics, SNOW_COURSES})', ctx);
const STEP = 1 / 240;

let fehler = 0;
const pruef = (name, ok, zusatz = '') => { console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++; };

console.log('\n--- Die Seilbahn: der Ball sitzt in der Kabine ---');
{
  /* Der Zeichner setzt den Ball auf ball.ebene * ebeneZ + ball.z. Die Kabine reicht bis hoehe().
     Beides muss gleich sein, solange er mitfährt – sonst schwebt er über oder steckt in ihr. */
  let geprueft = 0, schlimmster = 0, wo = '';
  for (const bahn of G.SNOW_COURSES) {
    const lifte = (bahn.obstacles || []).filter(o => o.type === 'seilbahn');
    if (!lifte.length) continue;
    for (const def of lifte) {
      const lv = G.buildLevel(bahn);
      const ob = lv.obstacles.find(o => o.type === 'seilbahn' && o.x0 === def.x0 && o.y0 === def.y0);
      const b = G.makeBall(ob.x0, ob.y0, '#fff');
      b.ebene = ob.ebene; lv.setzeEbene(ob.ebene);
      let t = 0, gemessen = 0;
      for (let i = 0; i < Math.round(20 / STEP); i++) {
        G.stepPhysics(lv, b, STEP, t, false); t += STEP;
        if (b.rider !== ob) continue;
        const abstand = Math.abs((b.z + (b.ebene || 0) * lv.ebeneZ) - ob.hoehe());
        if (abstand > schlimmster) { schlimmster = abstand; wo = `${bahn.name} (${ob.ebene}->${ob.ziel})`; }
        gemessen++;
      }
      pruef(`${bahn.name}: Lift ${ob.ebene}->${ob.ziel} nimmt den Ball mit`, gemessen > 0, `${gemessen} Schritte mitgefahren`);
      geprueft++;
    }
  }
  pruef(`auf allen ${geprueft} Seilbahnen sitzt der Ball auf der Kabine`, schlimmster < 1e-9,
    schlimmster < 1e-9 ? 'größter Abstand 0,00 Kacheln' : `${schlimmster.toFixed(2)} Kacheln daneben bei ${wo}`);
}

console.log('\n--- Die Seilbahn: oben steigt man eine Etage höher aus ---');
{
  const bahn = G.SNOW_COURSES.find(c => (c.obstacles || []).some(o => o.type === 'seilbahn' && o.ziel > (o.ebene || 0)));
  const def = bahn.obstacles.find(o => o.type === 'seilbahn' && o.ziel > (o.ebene || 0));
  const lv = G.buildLevel(bahn);
  const ob = lv.obstacles.find(o => o.type === 'seilbahn' && o.x0 === def.x0 && o.y0 === def.y0);
  const b = G.makeBall(ob.x0, ob.y0, '#fff');
  b.ebene = ob.ebene; lv.setzeEbene(ob.ebene);
  let t = 0, oben = false, warDrin = false;
  for (let i = 0; i < Math.round(30 / STEP); i++) {
    G.stepPhysics(lv, b, STEP, t, false); t += STEP;
    if (b.rider === ob) warDrin = true;
    else if (warDrin && (b.ebene || 0) === ob.ziel) { oben = true; break; }
  }
  pruef(`${bahn.name}: nach der Fahrt steht der Ball auf Ebene ${ob.ziel}`, oben, `Ebene ${b.ebene}`);
  pruef('und er liegt dabei wieder auf dem Boden, nicht in der Luft', Math.abs(b.z) < 1e-9, `z = ${b.z.toFixed(2)}`);
}

console.log('\n--- Was den Ball trägt, bleibt sichtbar ---');
{
  /* Die Regel „was vor dem Ball steht, wird durchsichtig" darf nie das Fahrzeug treffen, in dem er
     gerade sitzt: Sonst schwebt er sichtbar über einer blassen Kabine. Genau das war bei der
     Seilbahn der Fall, und zwar auf den Bahnen, wo sie *innerhalb* einer Etage fährt – nur dort
     steht sie in der gewöhnlichen Tiefensortierung. Aufzug und Zahnstange stehen immer zwischen
     zwei Etagen und werden darum ohnehin zuletzt gezeichnet; der Vermerk steht bei ihnen trotzdem,
     damit er nicht fehlt, wenn einer davon einmal auf einer einstöckigen Bahn landet. */
  const rend = fs.readFileSync(path.join(SRC, 'render.js'), 'utf8');
  for (const typ of ['seilbahn', 'aufzug', 'zahnstange']) {
    const zeile = rend.split('\n').find(l => l.includes('items.push') && l.includes(`draw${typ[0].toUpperCase()}${typ.slice(1)}`));
    pruef(`${typ}: als „nicht ausbleichen" eingetragen`, !!zeile && zeile.includes('noFade: true'),
      zeile ? zeile.trim().slice(0, 90) : 'Eintragung nicht gefunden');
  }
}

console.log('\n--- Die Schneebrücke trägt genau einen Schlag ---');
{
  const feld = {
    name: 'Brückenprüfung', par: 3, theme: 'glacier',
    map: ['..................', '.T##############H.', ...Array.from({ length: 5 }, () => '.################.'), '..................'],
    obstacles: [{ type: 'schneebruecke', x: 6, y: 1, w: 3, h: 5 }],
  };
  const lv = G.buildLevel(feld);
  const br = lv.obstacles.find(o => o.type === 'schneebruecke');
  const b = G.makeBall(3, 3.5, '#fff');
  lv.schlagZahl = 1;
  b.vx = 9;
  let t = 0;
  for (let i = 0; i < Math.round(3 / STEP); i++) { G.stepPhysics(lv, b, STEP, t, true); t += STEP; }
  pruef('nach dem Überqueren ist sie gebrochen', br.gebrochen, `x = ${b.x.toFixed(1)}`);
  lv.schlagZahl = 2;
  const b2 = G.makeBall(3, 3.5, '#fff'); b2.vx = 9;
  for (let i = 0; i < Math.round(0.2 / STEP); i++) { G.stepPhysics(lv, b2, STEP, t, true); t += STEP; }
  pruef('beim nächsten Schlag liegt sie wieder da', !br.gebrochen);
}

console.log('\n--- Die Windfahne ---');
{
  const feld = (mitFahne) => ({
    name: 'Windprüfung', par: 3, theme: 'glacier',
    map: ['....................', '.T################H.', ...Array.from({ length: 5 }, () => '.##################.'), '....................'],
    obstacles: mitFahne ? [{ type: 'windfahne', x: 5, y: 3.5, phase: 0 }] : [],
  });
  /* Gemessen wird der Unterschied zu einem Lauf ohne Fahne, nicht die Geschwindigkeit selbst:
     Reibung bremst den Ball ohnehin, und was übrig bleibt, sagt nichts über den Wind. */
  const lauf = (mitFahne, t0, sek) => {
    const lv = G.buildLevel(feld(mitFahne)), b = G.makeBall(4, 3.5, '#fff');
    b.vx = 3; b.vy = 0;
    let t = t0;
    for (let i = 0; i < Math.round(sek / STEP); i++) { G.stepPhysics(lv, b, STEP, t, true); t += STEP; }
    const wf = lv.obstacles.find(o => o.type === 'windfahne');
    return { x: b.x, y: b.y, dx: wf ? wf.dx : 0, dy: wf ? wf.dy : 0, staerke: wf ? wf.staerke : 0 };
  };
  const mit = lauf(true, 1.0, 0.8), ohne = lauf(false, 1.0, 0.8);
  const versatz = (mit.x - ohne.x) * mit.dx + (mit.y - ohne.y) * mit.dy;
  pruef('bei voller Stärke versetzt der Wind in seine Richtung', versatz > 0.2,
    `Wind (${mit.dx.toFixed(2)}, ${mit.dy.toFixed(2)}), versetzt um ${versatz.toFixed(2)} Kacheln`);

  /* Die Flaute liegt genau in der Mitte des Umschlagens: WIND_HALT + WIND_DREH/2 = 5,0 + 0,7. */
  const flaute = lauf(true, 5.7 - 0.8, 0.8);
  pruef('in der Flaute steht die Stärke auf null', flaute.staerke < 0.01, `Stärke ${flaute.staerke.toFixed(4)}`);

  const ruhig = (() => {
    const lv = G.buildLevel(feld(true)), b = G.makeBall(4, 3.5, '#fff');
    let t = 1.0;
    for (let i = 0; i < Math.round(0.8 / STEP); i++) { G.stepPhysics(lv, b, STEP, t, false); t += STEP; }
    return Math.hypot(b.vx, b.vy);
  })();
  pruef('ein liegender Ball wird nie vom Berg geweht', ruhig < 1e-9, `Tempo ${ruhig.toFixed(6)}`);
}

/* ------------------------------------------------------------------------------------------- *
 * DER SCHNEEBALL: die Weltregel des Berges
 *
 * Wer über Schnee rollt, setzt Schnee an und passt irgendwann nicht mehr ins Loch; auf Eis
 * streift er ihn ab, Wasser nimmt ihn auf einen Schlag. Das ist die Regel, die aus vier Paletten
 * vier Abschnitte gemacht hat – vorher galt auf allen zwölf Bahnen dasselbe.
 *
 * Geprüft wird sie an einer gebauten Fläche, nicht an einer Bahn: So steht in der Prüfung, was
 * die Regel tun *soll*, und nicht, was eine bestimmte Bahn gerade zulässt.
 */
{
  const feld = (zeile) => ({
    name: 'Schneeprüfung', par: 3, theme: 'snowfoot', schnee: 0.0045,
    map: ['..........................', '.T' + zeile + 'H.', '..........................'],
  });
  /* Geschlagen wird mehrfach, so wie im Spiel: Ein Schlag trägt gut neun Felder weit, dick wird
     der Ball erst nach zwölf. Ein einzelner Schlag könnte die Regel also gar nicht auslösen – und
     genau daran ist diese Prüfung beim ersten Versuch gescheitert. */
  const lauf = (def, schlaege, vx = 9, hin = false) => {
    const lv = G.buildLevel(def);
    const b = G.makeBall(2.5, 1.5, '#fff');
    let t = 0;
    for (let s = 0; s < schlaege; s++) {
      b.vx = vx * (hin || s % 2 === 0 ? 1 : -1);   // hin und her, damit die Fläche reicht
      for (let i = 0; i < Math.round(4 / STEP); i++) {
        G.stepPhysics(lv, b, STEP, t, false); t += STEP;
        if (Math.hypot(b.vx, b.vy) < 0.05) break;
      }
    }
    return b;
  };
  const R = 0.3, LOCH = R * 1.22;

  const imSchnee = lauf(feld('#'.repeat(23)), 6);
  pruef('im Schnee wird der Ball dicker', imSchnee.r > LOCH, `r = ${imSchnee.r.toFixed(3)}`);

  const aufEis = lauf(feld('i'.repeat(23)), 6);
  pruef('auf Eis bleibt er dünn', Math.abs(aufEis.r - R) < 1e-9, `r = ${aufEis.r.toFixed(3)}`);

  // Erst durch den Schnee, dann über das Eis: was er angesetzt hat, streift er wieder ab
  // Immer nach rechts: erst vierzehn Felder Schnee (dick), dann neun Felder Eis (wieder dünn)
  const gemischt = lauf(feld('#'.repeat(14) + 'i'.repeat(9)), 5, 9, true);
  pruef('das Eis streift den Schnee wieder ab', gemischt.r <= LOCH, `r = ${gemischt.r.toFixed(3)}`);

  // Ein liegender Ball setzt nichts an - gewachsen wird nach Weg, nicht nach Zeit
  const liegt = lauf(feld('#'.repeat(23)), 6, 0);
  pruef('ein liegender Ball setzt nichts an', Math.abs(liegt.r - R) < 1e-9, `r = ${liegt.r.toFixed(3)}`);

  // Und ohne die Regel rührt sich gar nichts – andere Welten bleiben unberührt
  const ohne = feld('#'.repeat(23)); delete ohne.schnee;
  pruef('ohne def.schnee gilt die Regel nicht', Math.abs(lauf(ohne, 6).r - R) < 1e-9);

  /* Und die Bahnen selbst: Jede Schneebahn muss Eis oder Wasser haben. Dass es auch *erreichbar*
     ist, prüft tools/validate.mjs – dort stehen Seilbahnen und Etagen schon fertig da. */
  const bahnen = vm.runInContext('SNOW_COURSES', ctx);
  const ohneEis = bahnen.filter(c => c.schnee && !c.map.some(r => /[iw]/.test(r)));
  pruef('jede Schneebahn hat Eis oder Wasser', ohneEis.length === 0,
        ohneEis.length ? ohneEis.map(c => c.name).join(', ') : `${bahnen.filter(c => c.schnee).length} Bahnen`);

  /* Die Eintönigkeit, wegen der das alles hier steht: Vorher stand auf *jeder* Bahn eine
     Windfahne und auf zehn von zwölf eine Lawine. Eine Welt, in der jede Bahn dieselbe Maschine
     trägt, hat keine zwölf Bahnen, sondern eine. */
  const mit = (typ) => bahnen.filter(c => (c.obstacles || []).some(o => o.type === typ)).length;
  pruef('nicht jede Bahn hat eine Windfahne', mit('windfahne') < bahnen.length, `${mit('windfahne')}/${bahnen.length}`);
  pruef('und nicht jede eine Lawine', mit('lawine') <= bahnen.length * 0.6, `${mit('lawine')}/${bahnen.length}`);
}

console.log(fehler ? `\n${fehler} Fehler\n` : '\nalles bestanden\n');
process.exit(fehler ? 1 : 0);
