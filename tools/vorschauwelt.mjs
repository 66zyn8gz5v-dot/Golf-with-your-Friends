/* Prüft die Trennung „in der Vorschau da, im Spiel noch nicht".
 *
 *   node tools/vorschauwelt.mjs
 *
 * WARUM DAS EINE REGEL IST
 * Die Zwergenmine ist gebaut, aber sie soll noch nicht ins Spiel. Der nächstliegende Weg wäre, sie
 * für main herauszuschneiden – und genau daran geht so etwas kaputt: Zwei Stände von Hand
 * auseinanderzuhalten ist eine Dauerpflicht, und spätestens bei der dritten Auslieferung fehlt
 * irgendwo eine Zeile. Darum ist es *ein* Stand mit einem Schalter, so wie beim Boule-Modus:
 * 'nurVorschau' an der Welt, und die Oberfläche filtert.
 *
 * Geprüft wird beides, denn beide Richtungen können schiefgehen:
 *   - Die Welt darf im Spiel nirgends angeboten werden (Weltliste, Karte, Rekorde, Online, Hüte).
 *   - Sie muss in der Vorschau vollständig da sein – und die Prüfwerkzeuge müssen sie weiter sehen.
 *     Eine Welt, die keiner prüft, verfällt still.
 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lies = (f) => fs.readFileSync(path.join(WURZEL, f), 'utf8');

let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

/* ---------- Die Weltliste selbst ---------- */
const ctx = { console };
vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow',
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_pro'])
  vm.runInContext(lies(`src/${f}.js`), ctx);
const WORLDS = vm.runInContext('WORLDS', ctx);

const mine = WORLDS.find(w => w.id === 'mine');
pruef('die Prüfwerkzeuge sehen die Mine weiter', !!mine && mine.courses.length > 0,
      mine ? `${mine.courses.length} Bahnen` : 'fehlt ganz');
pruef('und sie ist als „nur Vorschau" gekennzeichnet', !!mine && mine.nurVorschau === true);
pruef('keine andere Welt trägt die Kennzeichnung',
      WORLDS.filter(w => w.nurVorschau).length === 1,
      WORLDS.filter(w => w.nurVorschau).map(w => w.name).join(', ') || 'keine');

/* ---------- Die Oberfläche ---------- */
const main = lies('src/main.js');
pruef('main.js filtert die Weltliste an einer Stelle', /const SPIELWELTEN = \(\) =>/.test(main));
/* Wer WORLDS noch von Hand durchgeht, umgeht den Filter. Erlaubt bleibt allein die Zeile, die
   SPIELWELTEN definiert – jede andere wäre eine Lücke, durch die die Welt doch auftaucht. */
const roh = main.split('\n')
  .map((z, i) => [i + 1, z])
  .filter(([, z]) => /\bWORLDS\b/.test(z) && !/const SPIELWELTEN/.test(z) && !/^\s*(\/\*|\*|\/\/)/.test(z));
pruef('und geht WORLDS sonst nirgends mehr von Hand durch', roh.length === 0,
      roh.map(([n, z]) => `Zeile ${n}: ${z.trim().slice(0, 60)}`).join(' | '));
pruef('die Hüte werden mitgefiltert', /const SPIELHUETE = \(\) =>/.test(main) && !/Hats\.LIST\.map/.test(main));

/* ---------- Die Weltkarte ---------- */
const karte = lies('src/worldmap.js');
pruef('die Karte kennt die Kennzeichnung', /nurVorschau: true/.test(karte));
pruef('und läßt Namen und Nadel im Spiel weg', /imSpiel && l\.nurVorschau/.test(karte));
/* Die Insel selbst bleibt liegen: Die Küste rechnet sich aus allen Landstücken, und ein Stück Land
   ohne Beschriftung verspricht nichts. */
pruef('die Insel bleibt auf der Karte', /LAND\.map\(gelaende\)/.test(karte) && !/LAND = LAND\.filter/.test(karte));
/* Ohne die Kennung VORSCHAU (Node beim Prüfen) darf nichts versteckt werden. */
pruef('ohne Kennung wird nichts versteckt', /typeof VORSCHAU !== 'undefined' && !VORSCHAU/.test(karte));

console.log(fehler ? `\n${fehler} Fehler\n` : '\nalles bestanden\n');
process.exit(fehler ? 1 : 0);
