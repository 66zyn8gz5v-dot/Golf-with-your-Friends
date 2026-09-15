/* Prüft Fantasy Golf 3D, ohne dass ein Browser dabei sein muss.
 *
 *   node tools/3d.mjs
 *
 * Geprüft wird viererlei, und jedes davon hat einen Anlass:
 *
 * 1. **Die Bahnen.** Karte rechteckig, Abschlag und Loch vorhanden, Loch vom Abschlag aus über
 *    begehbare Felder erreichbar. Dasselbe, was tools/validate.mjs für das 2,5D-Spiel tut.
 *
 * 2. **Die Dreiecke.** Jeder Grundkörper wird gebaut und nachgerechnet, ob alle seine Dreiecke
 *    nach außen zeigen. Der Grund: Ein verkehrt herum gebauter Körper ist nicht falsch
 *    beleuchtet, sondern unsichtbar – man sieht ihn im Spiel schlicht nicht und sucht den Fehler
 *    dann beim Licht. Hier fällt er in einer Zehntelsekunde auf.
 *
 * 3. **Das Gelände.** Höhen endlich, Abschlag flach genug zum Liegenbleiben, Loch nicht am Hang.
 *    Ein Loch, aus dem der Ball von selbst herausrollt, merkt man sonst erst beim Spielen – und
 *    dann hat man schon eine Viertelstunde lang gedacht, man könne nicht zielen.
 *
 * 4. **Die Spielbarkeit.** Ein einfacher Rechen-Golfer spielt jede Bahn: Er probiert bei jedem
 *    Schlag ein Raster aus Richtungen und Kräften durch, rechnet jeden davon zu Ende und nimmt
 *    den, der am nächsten ans Loch führt. Schafft er es nicht in fünfzehn Schlägen, stimmt mit
 *    der Bahn etwas nicht. Das ist die wichtigste der vier Prüfungen: Sie fängt genau die Fehler,
 *    die man beim Bauen einer Bahn wirklich macht – eine Mulde, aus der nichts mehr herauskommt,
 *    ein Loch hinter einer Wand, ein Hang, der jeden Ball ins Wasser trägt.
 *
 * 5. **Das Par.** Der gründliche Golfer sagt nur, ob eine Bahn überhaupt zu schaffen ist – er
 *    trifft jede Lücke, weil er dreihundertfünfzig Schläge durchrechnet und den besten nimmt.
 *    Also spielt noch ein zweiter: einer, der aufs Loch zielt und sich dabei um ein paar Grad
 *    und ein paar Prozent vertut, so wie ein Mensch. Zweihundert Runden davon geben einen
 *    ehrlichen Mittelwert, und daran lässt sich das Par messen: Es soll ungefähr dort liegen,
 *    wo dieser Spieler landet – ein gutes Par ist eines, das man mit einem guten Schlag erreicht
 *    und mit einem schlechten verfehlt.
 */
import fs from 'node:fs';
import vm from 'node:vm';

const ctx = { console, Math, Date, JSON, performance };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['mathe3d', 'bauen3d', 'deko3d', 'bahnen3d', 'welt3d', 'physik3d', 'karte3d']) {
  vm.runInContext(fs.readFileSync(new URL(`../src/3d/${f}.js`, import.meta.url), 'utf8'), ctx);
}
/* Die Module erklären ihre Namen mit 'const'. Solche Namen leben zwar für alle Skripte derselben
   Umgebung, hängen aber nicht am globalen Objekt – von außen kommt man nur heran, indem man sie
   in der Umgebung selbst ausliest. Genauso macht es tools/validate.mjs. */
const hole = name => vm.runInContext(name, ctx);
const [M3, Bauen, Deko3D, BAHNEN3D, Welt3D, Physik3D, Karte3D] =
  ['M3', 'Bauen', 'Deko3D', 'BAHNEN3D', 'Welt3D', 'Physik3D', 'Karte3D'].map(hole);

const fehler = [];
const zeile = [];
const melde = (bahn, text) => fehler.push(`${bahn}: ${text}`);

/* ---------- 1. Die Bahnen ---------- */
/* Wasser zählt hier NICHT als begehbar. Der Ball rollt; er kann einen Bach nicht überqueren,
   sondern versinkt darin. Eine Bahn, deren Loch nur über Wasser zu erreichen wäre, ist darum
   unspielbar – auch wenn man auf der Karte scheinbar durchkommt. Genau dieser Fehler ist beim
   Bauen von „Der Mühlbach" passiert: Die Landzunge in der Mitte war rundherum von Wasser umgeben
   und damit eine Insel. */
const BEGEHBAR = new Set(['#', ',', 's', 'o', 'T', 'H', 'r']);

for (const welt of BAHNEN3D.WELTEN) {
  if (welt.bald) continue;
  for (const [nr, b] of welt.bahnen.entries()) {
    const name = `${welt.name} ${nr + 1} „${b.name}"`;
    const H = b.karte.length, B = b.karte[0].length;
    b.karte.forEach((r, y) => { if (r.length !== B) melde(name, `Zeile ${y} ist ${r.length} lang statt ${B}`); });
    for (const r of b.karte) for (const ch of r) if (!Welt3D.ART[ch]) melde(name, `unbekanntes Zeichen '${ch}' in der Karte`);

    let abschlag = null, loch = null;
    b.karte.forEach((r, y) => [...r].forEach((ch, x) => {
      if (ch === 'T') { if (abschlag) melde(name, 'mehr als ein Abschlag'); abschlag = [x, y]; }
      if (ch === 'H') { if (loch) melde(name, 'mehr als ein Loch'); loch = [x, y]; }
    }));
    if (!abschlag) { melde(name, 'kein Abschlag (T)'); continue; }
    if (!loch) { melde(name, 'kein Loch (H)'); continue; }

    // Flutfüllung vom Abschlag aus – kommt sie am Loch an?
    const gesehen = new Set([abschlag.join(',')]);
    const rand = [abschlag];
    while (rand.length) {
      const [x, y] = rand.pop();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy, k = nx + ',' + ny;
        if (nx < 0 || ny < 0 || nx >= B || ny >= H || gesehen.has(k)) continue;
        if (!BEGEHBAR.has(b.karte[ny][nx])) continue;
        gesehen.add(k); rand.push([nx, ny]);
      }
    }
    if (!gesehen.has(loch.join(','))) melde(name, 'das Loch ist vom Abschlag aus nicht erreichbar');

    if (!b.par || b.par < 2 || b.par > 8) melde(name, `Par ${b.par} ist unglaubwürdig`);
    if (!b.intro) melde(name, 'kein Einleitungstext');
  }
}

/* ---------- 2. Die Dreiecke ---------- */
const fakeZeichner = { netz: (e, ix) => ({ e, ix }) };

/* Zwei Prüfungen, weil zwei verschiedene Dinge schiefgehen können.
 *
 * 'koerperPruefen' ist die scharfe: Sie gilt für einen einzelnen, geschlossenen Körper. Jedes
 * Dreieck muss vom Schwerpunkt aus nach außen zeigen. Das findet auch ein einziges verdrehtes
 * Dreieck unter zweihundert.
 *
 * 'bauwerkPruefen' ist die für Zusammengesetztes – eine Tanne aus vier Kegeln, ein Haus mit
 * Fenstern, eine Burg aus achtzig Teilen. Dort hilft der Schwerpunkt nicht: Die Innenseite einer
 * Fensterhöhle zeigt selbstverständlich zur Mitte des Hauses hin, und das ist richtig so. Geprüft
 * wird darum das Rauminhaltszeichen: Der aus allen Dreiecken gerechnete Rauminhalt ist positiv,
 * solange alle Körper richtig herum liegen, und wird negativ, sobald ein größerer verdreht ist.
 * Das ist gröber, aber es schlägt genau bei dem Fehler an, der beim Bauen wirklich passiert –
 * ein Körper, den man verkehrt herum zusammengesetzt hat und der deshalb im Spiel fehlt. */
function dreiecke(tu) {
  const b = Bauen.sammler();
  tu(b);
  const teile = b.rohfertig();
  const raus = [];
  for (const t of teile) for (let k = 0; k < t.ix.length; k += 3) {
    const p = j => { const o = t.ix[k + j] * 9; return [t.e[o], t.e[o + 1], t.e[o + 2]]; };
    raus.push([p(0), p(1), p(2)]);
  }
  return raus;
}
const flaechenNormale = ([a, c, d]) => {
  const ux = c[0] - a[0], uy = c[1] - a[1], uz = c[2] - a[2];
  const vx = d[0] - a[0], vy = d[1] - a[1], vz = d[2] - a[2];
  return [uy * vz - uz * vy, uz * vx - ux * vz, ux * vy - uy * vx];
};

function koerperPruefen(name, tu, innenGemeint = false) {
  const tris = dreiecke(tu);
  if (!tris.length) { melde(name, 'baut gar nichts'); return; }
  const mitte = [0, 0, 0];
  for (const t of tris) for (const p of t) { mitte[0] += p[0] / 3; mitte[1] += p[1] / 3; mitte[2] += p[2] / 3; }
  for (let i = 0; i < 3; i++) mitte[i] /= tris.length;
  let falsch = 0, entartet = 0;
  for (const t of tris) {
    const n = flaechenNormale(t);
    if (Math.hypot(...n) < 1e-9) { entartet++; continue; }
    const s = [0, 1, 2].map(i => (t[0][i] + t[1][i] + t[2][i]) / 3 - mitte[i]);
    const d = n[0] * s[0] + n[1] * s[1] + n[2] * s[2];
    if (innenGemeint ? d > 1e-9 : d < -1e-9) falsch++;
  }
  if (falsch) melde(name, `${falsch} von ${tris.length} Dreiecken zeigen nach ${innenGemeint ? 'außen' : 'innen'}`);
  zeile.push(`  ${name.padEnd(18)} ${String(tris.length).padStart(5)} Dreiecke${entartet ? ` (${entartet} ohne Fläche)` : ''}`);
}

function bauwerkPruefen(name, tu, vorzeichen = 1) {
  const tris = dreiecke(tu);
  if (!tris.length) { melde(name, 'baut gar nichts'); return; }
  let v = 0;
  for (const t of tris) { const n = flaechenNormale(t); v += (t[0][0] * n[0] + t[0][1] * n[1] + t[0][2] * n[2]) / 6; }
  /* Gemessen wird gegen die Größe des Stücks, nicht gegen eine feste Schranke: Ein Grasbüschel hat
     einen Rauminhalt von wenigen Zehntausendsteln und ist trotzdem richtig herum gebaut. Eine
     feste Untergrenze würde jedes kleine Ding für falsch erklären. */
  let lo = [1e9, 1e9, 1e9], hi = [-1e9, -1e9, -1e9];
  for (const t of tris) for (const e of t) for (let k = 0; k < 3; k++) { lo[k] = Math.min(lo[k], e[k]); hi[k] = Math.max(hi[k], e[k]); }
  const kasten = Math.max(1e-9, (hi[0] - lo[0]) * (hi[1] - lo[1]) * (hi[2] - lo[2]));
  if (!(v * vorzeichen > kasten * 0.004)) melde(name, `Rauminhalt ${v.toFixed(4)} bei einem Hüllkasten von ${kasten.toFixed(4)} – da liegt mindestens ein Körper verkehrt herum`);
  zeile.push(`  ${name.padEnd(18)} ${String(tris.length).padStart(5)} Dreiecke, Rauminhalt ${v.toFixed(2)}`);
}

koerperPruefen('Quader', b => b.kasten(1, 1, 1, '#888'));
koerperPruefen('Walze', b => b.walze(0.5, 0.5, 2, 12, '#888'));
koerperPruefen('Kegel', b => b.walze(0.6, 0, 1.5, 10, '#888'));
koerperPruefen('Kegelstumpf', b => b.walze(0.6, 0.3, 1.2, 10, '#888'));
koerperPruefen('Kugel', b => b.kugel(1, 8, 12, '#888'));
koerperPruefen('Beulenkugel', b => b.kugel(1, 7, 9, '#888', 0.25, 42));
koerperPruefen('Keil', b => b.keil(1, 0.2, 1, 2, '#888'));
koerperPruefen('Felsen', b => Deko3D.fels(b, 0.5, 3));
/* Das Loch ist kein Bauteil mehr, sondern wird aus dem Gelände geschnitten (Welt3D.lochNetz) –
   es braucht die Höhen der Bahn und lässt sich nicht für sich allein bauen. Geprüft wird es
   stattdessen weiter unten zusammen mit dem Gelände. */

/* Jede Baumart einzeln: Sie stehen zu Hunderten in der Landschaft, und eine nach innen gedrehte
   Fläche fällt dort nicht als Fehler auf, sondern nur als „irgendwie dunkel". */
for (const art of Object.keys(Deko3D.BAUMARTEN)) {
  const name = art[0].toUpperCase() + art.slice(1);
  bauwerkPruefen(name, b => Deko3D.baum(b, art, 2, 5));
}
for (const nadel of [true, false]) bauwerkPruefen('Fernbaum ' + (nadel ? 'Nadel' : 'Laub'), b => Deko3D.fernbaum(b, 2, nadel, 5));
/* Das Kleinzeug am Boden steht zu Tausenden herum – eine falsch gedrehte Fläche wäre dort kein
   Fehler, den man findet, sondern ein Flimmern, das man nicht erklären kann. */
bauwerkPruefen('Blumen', b => Deko3D.blume(b, 1, 5));
bauwerkPruefen('Grasbüschel', b => Deko3D.grasbueschel(b, 1, '#5fa03a', 5));
bauwerkPruefen('Baumstumpf', b => Deko3D.stumpf(b, 1, 5));
bauwerkPruefen('Totholz', b => Deko3D.totholz(b, 1, 5));
bauwerkPruefen('Busch', b => Deko3D.busch(b, 0.3, '#4f8f35', 5));
bauwerkPruefen('Felsgruppe', b => Deko3D.felsgruppe(b, 0.7, 9));
bauwerkPruefen('Haus', b => Deko3D.haus(b));
bauwerkPruefen('Turm', b => Deko3D.turm(b, 0.5, 3));
bauwerkPruefen('Mühle', b => Deko3D.muehle(b));
bauwerkPruefen('Mühlenflügel', b => Deko3D.muehlenfluegel(b));
bauwerkPruefen('Wolke', b => Deko3D.wolke(b, 1, 4));
bauwerkPruefen('Burg', b => Deko3D.burg(b, 1));
bauwerkPruefen('Brücke', b => { const gl = Welt3D.gelaende(BAHNEN3D.WIESE.bahnen[0]); Welt3D.dekoNetz(b, gl, { fahnen: [], muehlen: [] }); });

/* ---------- 3. Das Gelände ---------- */
const gelaende = [];
for (const welt of BAHNEN3D.WELTEN) {
  if (welt.bald) continue;
  for (const [nr, b] of welt.bahnen.entries()) {
    const name = `${welt.name} ${nr + 1} „${b.name}"`;
    const gl = Welt3D.gelaende(b);
    gelaende.push({ name, gl, bahn: b, welt, nr });
    let schlimmste = 0;
    for (let z = -2; z < gl.T + 2; z += 0.5) for (let x = -2; x < gl.B + 2; x += 0.5) {
      const h = gl.hoehe(x, z);
      if (!Number.isFinite(h)) { melde(name, `die Höhe bei ${x}/${z} ist keine Zahl`); z = 1e9; break; }
      if (Math.abs(h) > 40) melde(name, `die Höhe bei ${x}/${z} ist ${h.toFixed(1)} – das ist keine Wiese mehr`);
    }
    const n = [0, 0, 0];
    const neigungBei = (x, z) => { gl.neigung(x, z, n); return Math.hypot(n[0], n[2]) / Math.max(n[1], 1e-6); };
    const amAbschlag = neigungBei(gl.abschlag[0], gl.abschlag[1]);
    const amLoch = neigungBei(gl.lochFeld[0], gl.lochFeld[1]);
    if (amAbschlag > 0.16) melde(name, `der Abschlag hängt mit ${(amAbschlag * 100).toFixed(0)} % – dort bleibt kein Ball liegen`);
    if (amLoch > 0.20) melde(name, `das Loch liegt an einem Hang von ${(amLoch * 100).toFixed(0)} % – der Ball rollt heraus`);
    schlimmste = Math.max(amAbschlag, amLoch);

    /* Bleibt ein abgelegter Ball auf dem Abschlag wirklich liegen? Die Neigung allein sagt es
       nicht sicher, weil auch die Reibung des Untergrunds mitspielt. Also wird es ausprobiert. */
    const probe = Physik3D.ball(gl, gl.abschlag[0], gl.abschlag[1]);
    probe.ruht = false;
    for (let i = 0; i < 600; i++) Physik3D.bewegen(probe, gl, null, 1 / 60);
    const gelaufen = Math.hypot(probe.x - gl.abschlag[0], probe.z - gl.abschlag[1]);
    if (gelaufen > 0.5) melde(name, `ein abgelegter Ball rollt vom Abschlag ${gelaufen.toFixed(2)} Felder weg`);
    /* Ist über dem Loch wirklich ein Loch? Der Boden wird gebaut und nachgesehen, ob eines seiner
       Dreiecke über der Mitte des Bechers liegt. Genau das war der Fehler, den Fynn gesehen hat:
       Der Becher war da, aber die Wiese lag als geschlossene Decke darüber, und zu sehen war nur
       ein Fahnenmast, der im Gras steckt. */
    {
      const boden = Bauen.sammler();
      Welt3D.gelaendeNetz(boden, gl, 4);
      const [hx, hz] = gl.lochFeld;
      let drueber = 0;
      for (const t of boden.rohfertig()) {
        for (let k = 0; k < t.ix.length; k += 3) {
          const p = j => { const o = t.ix[k + j] * 9; return [t.e[o], t.e[o + 2]]; };
          const a = p(0), c = p(1), d = p(2);
          if (Math.min(a[0], c[0], d[0]) > hx || Math.max(a[0], c[0], d[0]) < hx) continue;
          if (Math.min(a[1], c[1], d[1]) > hz || Math.max(a[1], c[1], d[1]) < hz) continue;
          const kreuz = (u, v, w) => (v[0] - u[0]) * (w[1] - u[1]) - (v[1] - u[1]) * (w[0] - u[0]);
          const s1 = kreuz(a, c, [hx, hz]), s2 = kreuz(c, d, [hx, hz]), s3 = kreuz(d, a, [hx, hz]);
          if ((s1 >= 0 && s2 >= 0 && s3 >= 0) || (s1 <= 0 && s2 <= 0 && s3 <= 0)) drueber++;
        }
      }
      if (drueber) melde(name, `über dem Loch liegen ${drueber} Bodendreiecke – da ist kein Loch, sondern nur eine Fahne im Gras`);
    }

    /* Fällt ein Ball, der dicht am Becher liegen bleibt, auch wirklich hinein? Das war Fynns
       zweiter Befund am Loch: Der Ball blieb davor stehen. Schuld war die Haftreibung – die Mulde
       am Loch hat gut fünfzehn Prozent Gefälle, und genau so viel hält das Grün fest. Der Sog des
       Bechers gab dem Ball in jedem Rechenschritt Geschwindigkeit, und die Haftreibung nahm sie
       ihm im nächsten wieder weg.

       Geprüft wird ringsum, weil das Gefälle nicht in jeder Richtung gleich ist: Ein Ball, der
       oberhalb des Lochs liegt, hat es leichter als einer unterhalb. */
    {
      const [hx, hz] = gl.lochFeld;
      let stehen = 0, weiteste = 0;
      for (let i = 0; i < 12; i++) for (const d of [0.3, 0.45, 0.6]) {
        const w = i / 12 * Math.PI * 2;
        const x = hx + Math.cos(w) * d, z = hz + Math.sin(w) * d;
        if (!gl.art(x, z).gemaeht) continue;         // nur, wo wirklich Grün liegt
        const kugel = Physik3D.ball(gl, x, z);
        kugel.ruht = false;
        for (let k = 0; k < 600 && !kugel.ruht; k++) Physik3D.bewegen(kugel, gl, gl.lochFeld, 1 / 60);
        if (!kugel.ein) { stehen++; weiteste = Math.max(weiteste, d); }
      }
      if (stehen) melde(name, `${stehen} abgelegte Bälle dicht am Loch (bis ${weiteste.toFixed(2)} Felder) fallen nicht hinein, sondern bleiben davor stehen`);
    }

    zeile.push(`  ${name.padEnd(34)} ${gl.B}x${gl.T} Par ${b.par}  Hang am Loch ${(amLoch * 100).toFixed(0)} %  Felsnadeln ${gl.felsen.length}, Banden ${gl.wand.length - gl.felsen.length}`);
  }
}

/* ---------- 4. Die Spielbarkeit ---------- */

/* Ein Schlag wird vollständig durchgerechnet: Der Ball rollt, bis er ruht oder bis die Geduld
   zu Ende ist. Zurück kommt, wo er liegen geblieben ist und was unterwegs passiert ist. */
function schlagRechnen(gl, loch, startX, startZ, winkel, kraft) {
  const b = Physik3D.ball(gl, startX, startZ);
  Physik3D.schlag(b, Math.sin(winkel), Math.cos(winkel), kraft);
  let t = 0;
  while (!b.ruht && t < 30) { Physik3D.bewegen(b, gl, loch, 1 / 120); t += 1 / 120; }
  return b;
}

for (const { name, gl, bahn } of gelaende) {
  const loch = gl.lochFeld;
  let x = gl.abschlag[0], z = gl.abschlag[1];
  let schlaege = 0, drin = false, letzterOrt = [x, z];
  const spur = [];

  while (schlaege < 15 && !drin) {
    const zumLoch = Math.atan2(loch[0] - x, loch[1] - z);
    let bestes = null;
    /* Ein Raster aus 35 Richtungen (gut 70 Grad nach jeder Seite) und 10 Kräften. Das ist kein
       kluger Golfer, aber ein gründlicher – und genau das soll er sein: Findet er keinen Weg,
       findet ihn auch niemand. */
    for (let w = -17; w <= 17; w++) for (let k = 1; k <= 10; k++) {
      const winkel = zumLoch + w * 0.075;
      const kraft = k / 10;
      const b = schlagRechnen(gl, loch, x, z, winkel, kraft);
      if (b.ein) { bestes = { b, winkel, kraft, d: -1 }; w = 99; break; }
      if (b.wasser || gl.art(b.x, b.z).aus) continue;
      const d = Math.hypot(b.x - loch[0], b.z - loch[1]);
      if (!bestes || d < bestes.d) bestes = { b, winkel, kraft, d };
    }
    schlaege++;
    if (!bestes) {
      /* Jeder mögliche Schlag endet im Wasser oder im Aus – das ist eine kaputte Bahn. */
      melde(name, `nach ${schlaege - 1} Schlägen führt kein einziger Schlag mehr auf spielbaren Grund`);
      break;
    }
    if (bestes.b.ein) { drin = true; spur.push(`${schlaege}. eingelocht`); break; }
    const fortschritt = Math.hypot(x - loch[0], z - loch[1]) - bestes.d;
    x = bestes.b.x; z = bestes.b.z;
    spur.push(`${schlaege}. ${bestes.d.toFixed(1)} Felder`);
    /* Zwei Schläge nacheinander ohne jeden Fortschritt heißt: Der Ball steckt fest. */
    if (fortschritt < 0.02 && schlaege > 2 && Math.hypot(x - letzterOrt[0], z - letzterOrt[1]) < 0.05) {
      melde(name, `der Ball kommt bei ${x.toFixed(1)}/${z.toFixed(1)} nicht mehr weiter`);
      break;
    }
    letzterOrt = [x, z];
  }
  if (!drin) melde(name, `in 15 Schlägen nicht eingelocht (${spur.slice(-4).join(', ')})`);
  else zeile.push(`  ${name.padEnd(34)} eingelocht in ${schlaege} (Par ${bahn.par}): ${spur.join(', ')}`);
}

/* ---------- 5. Das Par ----------

   Der zweite Golfer soll einen Menschen abbilden – und ein Mensch zielt nicht stur aufs Loch.
   Er sieht, wo die Bahn hinführt, spielt bis zur Ecke und von dort weiter. Der erste Versuch
   zielte immer geradeaus zum Loch; auf einer geraden Bahn ging das gut, auf einer mit Knick
   schlug er zweihundert Runden lang gegen dieselbe Bande und brauchte zwanzig Schläge. Gemessen
   wurde damit nicht die Bahn, sondern die Dummheit des Golfers.

   Jetzt bekommt er einen Wegweiser: Von jedem Feld aus ist bekannt, wie weit es über trockenen
   Grund bis zum Loch ist (eine Flutfüllung vom Loch aus). Daraus folgt eine Spur, und der Golfer
   zielt auf den **weitesten Punkt dieser Spur, den er in gerader Linie erreichen kann** – genau
   das, was man vor dem Schlag mit den Augen macht. Erst wenn das Loch selbst frei liegt, zielt er
   darauf. Über die Bande um die Ecke spielen kann er nicht; er ist damit eher zu schlecht als zu
   gut, und das ist die richtige Seite zum Irren. */
function wegFeld(gl, loch) {
  const B = gl.B, T = gl.T, GROSS = 1e9;
  const d = new Float32Array(B * T).fill(GROSS);
  const trocken = (ix, iz) => { const c = gl.zeichen(ix, iz); return c !== '.' && c !== 'x' && c !== 'w'; };
  const start = [Math.floor(loch[0]), Math.floor(loch[1])];
  d[start[1] * B + start[0]] = 0;
  const rand = [start];
  while (rand.length) {
    const [x, z] = rand.shift();
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, nz = z + dz;
      if (nx < 0 || nz < 0 || nx >= B || nz >= T || !trocken(nx, nz)) continue;
      if (d[nz * B + nx] <= d[z * B + x] + 1) continue;
      d[nz * B + nx] = d[z * B + x] + 1;
      rand.push([nx, nz]);
    }
  }
  return (ix, iz) => (ix < 0 || iz < 0 || ix >= B || iz >= T) ? GROSS : d[iz * B + ix];
}

/* Liegt zwischen zwei Punkten nur spielbarer Grund? Abgetastet in Fünftelfeldern – feiner müsste
   man nur, wenn Banden dünner wären als ein Feld, und das sind sie nicht. */
function freieSicht(gl, ax, az, bx, bz) {
  const n = Math.max(2, Math.ceil(Math.hypot(bx - ax, bz - az) * 5));
  for (let i = 1; i <= n; i++) {
    const u = i / n, c = gl.zeichenAn(ax + (bx - ax) * u, az + (bz - az) * u);
    if (c === '.' || c === 'x' || c === 'w') return false;
  }
  return true;
}

/* Der Punkt, auf den gezielt wird: der weiteste auf der Spur, der in gerader Linie erreichbar ist. */
function zielPunkt(gl, weg, loch, x, z) {
  if (freieSicht(gl, x, z, loch[0], loch[1])) return loch;
  let ix = Math.floor(x), iz = Math.floor(z), bestes = null;
  for (let schritt = 0; schritt < 80; schritt++) {
    let weiter = null, klein = weg(ix, iz);
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const w = weg(ix + dx, iz + dz);
      if (w < klein) { klein = w; weiter = [ix + dx, iz + dz]; }
    }
    if (!weiter) break;
    [ix, iz] = weiter;
    const px = ix + 0.5, pz = iz + 0.5;
    if (!freieSicht(gl, x, z, px, pz)) break;
    bestes = [px, pz];
    if (klein === 0) break;
  }
  return bestes || loch;
}

/* ---------- Wie fest muss man schlagen? ----------
   Nicht geschätzt, sondern gemessen: Auf einer eigens dafür gebauten, ebenen Bahn wird für zwanzig
   Kraftstufen ausgerechnet, wie weit der Ball rollt. Daraus lässt sich zu jeder Entfernung die
   nötige Kraft ablesen.

   Der erste Versuch stand hier als Formel – die Weite wachse mit dem Quadrat der Kraft, also sei
   die Kraft die Wurzel der Weite. Das ist die Schulphysik eines Balls, der nur von gleichmäßiger
   Reibung gebremst wird; unser Ball wird zusätzlich mit der Geschwindigkeit gebremst, und damit
   stimmt die Formel nicht. Bei kurzen Schlägen schlug der Prüfgolfer dadurch fast doppelt so weit
   wie beabsichtigt, prallte hinten an die Bande und lief zurück – zehn Schläge für eine Bahn, die
   in vier zu schaffen ist. Gemessen statt geglaubt, und das Problem war weg. */
const eichung = (() => {
  const eben = { name: 'Eichung', par: 3, gelaende: { grund: 0, welle: 0, huegel: [] },
    karte: Array.from({ length: 5 }, (_, i) => (i === 2 ? 'T' + '#'.repeat(58) + 'H' : '#'.repeat(60))) };
  const gl = Welt3D.gelaende(eben);
  const punkte = [];
  for (let i = 1; i <= 20; i++) {
    const k = i / 20;
    const b = Physik3D.ball(gl, 1.5, 2.5);
    Physik3D.schlag(b, 1, 0, k);
    let t = 0;
    while (!b.ruht && t < 40) { Physik3D.bewegen(b, gl, null, 1 / 120); t += 1 / 120; }
    punkte.push({ k, weite: b.x - 1.5 });
  }
  zeile.push(`  Eichung: halbe Kraft ${punkte[9].weite.toFixed(1)} Felder, volle Kraft ${punkte[19].weite.toFixed(1)} Felder`);
  return punkte;
})();

/* Die Kraft für eine gewünschte Weite – zwischen den gemessenen Stufen geradlinig eingepasst. */
function kraftFuer(weite) {
  if (weite <= eichung[0].weite) return eichung[0].k * Math.max(0.2, weite / eichung[0].weite);
  for (let i = 1; i < eichung.length; i++) {
    if (weite <= eichung[i].weite) {
      const a = eichung[i - 1], b = eichung[i];
      return a.k + (b.k - a.k) * (weite - a.weite) / (b.weite - a.weite);
    }
  }
  return 1;
}

/* Eine Runde dieses Spielers. Wasser und Aus kosten ihn einen Strafschlag, genau wie im Spiel.
   Mit SPUR=<Bahnnummer> schreibt das Skript für die ersten Runden auf, was er tut – die einzige
   Art, einer Zahl wie „im Mittel zwölf Schläge" anzusehen, woran sie liegt. */
function zufallsRunde(gl, loch, weg, wuerfel, spur) {
  let x = gl.abschlag[0], z = gl.abschlag[1], schlaege = 0, letzterOrt = [x, z];
  while (schlaege < 20) {
    const ziel = zielPunkt(gl, weg, loch, x, z);
    const d = Math.hypot(ziel[0] - x, ziel[1] - z);
    const winkel = Math.atan2(ziel[0] - x, ziel[1] - z) + (wuerfel() - 0.5) * 0.20;
    /* Die Kraft kommt aus der Eichkurve. Gezielt wird ein Stück hinter das Ziel: Wer genau auf
       das Loch dosiert, bleibt bei jedem zu schwachen Schlag davor liegen – und das Loch nimmt
       den Ball ohnehin nur an, wenn er noch rollt. Dazu ein Fehler von gut einem Zehntel, so weit
       vertut man sich beim Ziehen. */
    const kraft = Math.min(1, kraftFuer(d * 1.15 + 0.7) * (0.93 + wuerfel() * 0.2));
    const b = schlagRechnen(gl, loch, x, z, winkel, kraft);
    schlaege++;
    const art = gl.art(b.x, b.z);
    if (spur) spur.push(b.ein ? 'EIN'
      : `${(b.wasser ? 'Wasser' : art.aus ? 'Aus' : art.name[0])} (${b.x.toFixed(1)},${b.z.toFixed(1)})` +
        ` [Ziel ${ziel[0].toFixed(0)},${ziel[1].toFixed(0)} d=${d.toFixed(1)} k=${kraft.toFixed(2)}]`);
    if (b.ein) return schlaege;
    if (b.wasser || art.aus) {
      schlaege++; [x, z] = Physik3D.sicherOrt(b, gl); letzterOrt = [x, z];
      if (spur) spur[spur.length - 1] += ` ->abgelegt(${x.toFixed(1)},${z.toFixed(1)})`;
      continue;
    }
    letzterOrt = [x, z]; x = b.x; z = b.z;
  }
  return 20;
}

for (const { name, gl, bahn } of gelaende) {
  const wuerfel = M3.zufall(20260914);
  const weg = wegFeld(gl, gl.lochFeld);
  const RUNDEN = 200;
  let summe = 0, schlimmste = 0, imPar = 0;
  /* Mit SPUR=<Bahnnummer> werden die missratenen Runden dieser Bahn mitgeschrieben – die
     mittelmäßigen erklären nichts, die schlimmen erklären alles. */
  const spurFuer = process.env.SPUR !== undefined && gelaende.findIndex(g => g.name === name) === +process.env.SPUR;
  let gezeigt = 0;
  for (let i = 0; i < RUNDEN; i++) {
    const spur = spurFuer ? [] : null;
    const n = zufallsRunde(gl, gl.lochFeld, weg, wuerfel, spur);
    if (spur && n >= bahn.par + 6 && gezeigt++ < 3) console.log(`  SPUR ${i + 1} (${n} Schläge): ` + spur.join(' | '));
    summe += n; schlimmste = Math.max(schlimmste, n);
    if (n <= bahn.par) imPar++;
  }
  const mittel = summe / RUNDEN;
  zeile.push(`  ${name.padEnd(34)} Zufallsspieler: im Mittel ${mittel.toFixed(1)} Schläge, ` +
    `${Math.round(imPar / RUNDEN * 100)} % in Par ${bahn.par}, schlechteste Runde ${schlimmste}`);
  if (mittel > bahn.par + 2.5) melde(name, `Par ${bahn.par} ist zu knapp – ein Spieler mit kleinen Fehlern braucht im Mittel ${mittel.toFixed(1)} Schläge`);
  if (mittel < bahn.par - 1.2) melde(name, `Par ${bahn.par} ist zu großzügig – ein Spieler mit kleinen Fehlern braucht im Mittel nur ${mittel.toFixed(1)} Schläge`);
  if (schlimmste >= 20) melde(name, 'eine von zweihundert Runden kam in zwanzig Schlägen nicht ins Loch');
}

/* ---------- 6. Die Weltkarte ---------- */
for (const l of Karte3D.LAND) {
  if (!l.id) continue;
  if (!BAHNEN3D.WELTEN.some(w => w.id === l.id)) melde('Weltkarte', `der Landstrich '${l.id}' gehört zu keiner Welt`);
  if (!Karte3D.BIOM[l.biom]) melde('Weltkarte', `'${l.id}' hat das unbekannte Biom '${l.biom}'`);
}
for (const w of BAHNEN3D.WELTEN) {
  if (!Karte3D.LAND.some(l => l.id === w.id)) melde('Weltkarte', `die Welt '${w.id}' liegt auf keinem Landstrich`);
  if (!w.bald && (!w.bahnen || !w.bahnen.length)) melde('Weltkarte', `die Welt '${w.id}' gilt als offen, hat aber keine Bahnen`);
}
/* Jede Welt muss über Wasser liegen – ein Wegweiser im Meer wäre schlecht zu erreichen. */
for (const l of Karte3D.LAND) {
  if (!l.id) continue;
  const h = Karte3D.hoehe(l.x, l.z + l.r * 0.34);
  if (h < 0.2) melde('Weltkarte', `der Wegweiser von '${l.id}' stünde bei Höhe ${h.toFixed(2)} im Wasser`);
}

/* ---------- Ergebnis ---------- */
console.log(zeile.join('\n'));
if (fehler.length) {
  console.error('\n' + fehler.map(f => '  FEHLER ' + f).join('\n'));
  process.exit(1);
}
console.log(`\nok – ${gelaende.length} Bahnen, ${BAHNEN3D.WELTEN.length} Welten auf der Karte, alle Körper richtig herum.`);
