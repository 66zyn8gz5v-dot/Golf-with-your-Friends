/* Prüft die Trennung „in der Vorschau da, im Spiel noch nicht".
 *
 *   node tools/vorschauwelt.mjs
 *
 * WARUM DAS EINE REGEL IST
 * Die Zwergenmine war gebaut, sollte aber noch nicht ins Spiel. Der nächstliegende Weg wäre
 * gewesen, sie für main herauszuschneiden – und genau daran geht so etwas kaputt: Zwei Stände von
 * Hand auseinanderzuhalten ist eine Dauerpflicht, und spätestens bei der dritten Auslieferung
 * fehlt irgendwo eine Zeile. Darum war es *ein* Stand mit einem Schalter, so wie beim Boule-Modus:
 * 'nurVorschau' an der Welt, und die Oberfläche filtert.
 *
 * SEIT FASSUNG 163 IST DIE MINE IM SPIEL, und keine Welt trägt die Kennzeichnung mehr. Die Prüfung
 * bleibt trotzdem stehen, und zwar aus zwei Gründen:
 *   - Der Schalter ist der Weg, den auch die nächste Welt gehen wird. Eine Mechanik, die nur
 *     einmal benutzt und dann nicht mehr geprüft wird, ist beim nächsten Mal kaputt.
 *   - Sie hält jetzt das Gegenteil fest: Was fertig ist, muß auch wirklich angeboten werden. Eine
 *     vergessene Kennzeichnung wäre eine Welt, die niemand findet – und niemand vermißt, weil
 *     niemand weiß, daß es sie gibt.
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
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_flut', 'courses_zauber', 'courses_pro'])
  vm.runInContext(lies(`src/${f}.js`), ctx);
const WORLDS = vm.runInContext('WORLDS', ctx);

const mine = WORLDS.find(w => w.id === 'mine');
pruef('die Prüfwerkzeuge sehen die Mine weiter', !!mine && mine.courses.length > 0,
      mine ? `${mine.courses.length} Bahnen` : 'fehlt ganz');
pruef('und sie ist nicht mehr als „nur Vorschau" gekennzeichnet', !!mine && !mine.nurVorschau);
const flut = WORLDS.find(w => w.id === 'flut');
pruef('die Flut steht in der Weltliste', !!flut && flut.courses.length > 0,
      flut ? `${flut.courses.length} Bahnen` : 'fehlt ganz');
pruef('und ist als „nur Vorschau" gekennzeichnet', !!flut && flut.nurVorschau === true);
/* Die Regel dahinter, als Zahl: Im Spiel steht genau eine Welt weniger als in der Liste. Wäre die
   Kennzeichnung weg, stünden beide Zahlen gleich – und die Flut wäre unbemerkt im Spiel. */
const versteckt = WORLDS.filter(w => w.nurVorschau);
pruef('und sie ist die einzige mit dieser Kennzeichnung', versteckt.length === 1,
      versteckt.map(w => w.name).join(', ') || 'keine');
pruef('das Spiel bietet eine Welt weniger an',
      WORLDS.filter(w => !w.nurVorschau).length === WORLDS.length - 1,
      `${WORLDS.length} Welten, davon ${WORLDS.length - 1} im Spiel`);

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
/* Nicht jede Welt hat ein eigenes Landstück (das Kolosseum etwa hat keines). Geprüft wird darum
   nur, was auf der Karte überhaupt vorkommt. */
const LANDNAMEN = new Set([...karte.matchAll(/id: '[a-z]+', name: '([^']+)'/g)].map(m => m[1]));
/* Die Karte muß den Schalter weiter kennen, auch wenn ihn gerade niemand benutzt – sonst fehlt er,
   wenn die nächste Welt ihn braucht. Geprüft wird darum die Regel, nicht die Marke an der Mine. */
pruef('die Karte kennt die Kennzeichnung', /l\.nurVorschau/.test(karte));
pruef('und läßt Namen und Nadel im Spiel weg', /imSpiel && l\.nurVorschau/.test(karte));
/* Die Insel selbst bleibt liegen: Die Küste rechnet sich aus allen Landstücken, und ein Stück Land
   ohne Beschriftung verspricht nichts. */
pruef('die Insel bleibt auf der Karte', /LAND\.map\(gelaende\)/.test(karte) && !/LAND = LAND\.filter/.test(karte));
/* Ohne die Kennung VORSCHAU (Node beim Prüfen) darf nichts versteckt werden. */
pruef('ohne Kennung wird nichts versteckt', /typeof VORSCHAU !== 'undefined' && !VORSCHAU/.test(karte));

/* ---------- Die fertige Kartendatei ----------
   icons/weltkarte.svg liegt hinter dem Ladebild und hinter jeder Tafel, in beiden Ständen – es ist
   dieselbe Datei. Sie muß darum die Sicht des *Spiels* zeigen, sonst steht die Welt zwar nicht in
   der Weltliste, aber groß auf dem Hintergrund. Das ist die Lücke, die dieser Abschnitt zuhält. */
const kartenwerkzeug = lies('tools/karte.mjs');
pruef('tools/karte.mjs zeichnet die Karte aus Sicht des Spiels',
      /VORSCHAU:\s*false/.test(kartenwerkzeug));
pruef('und setzt dabei nicht den Prüfstand-Schalter', !/PRUEFSTAND:\s*true/.test(kartenwerkzeug));
const svg = lies('icons/weltkarte.svg');
for (const w of versteckt)
  pruef(`„${w.name}" steht nicht in icons/weltkarte.svg`, !svg.includes(w.name));
for (const w of WORLDS.filter(x => !x.nurVorschau && LANDNAMEN.has(x.name)))
  pruef(`„${w.name}" steht dagegen darin`, svg.includes(w.name));

console.log(fehler ? `\n${fehler} Fehler\n` : '\nalles bestanden\n');
process.exit(fehler ? 1 : 0);
