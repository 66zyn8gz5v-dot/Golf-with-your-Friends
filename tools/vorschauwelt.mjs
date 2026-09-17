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
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_pro'])
  vm.runInContext(lies(`src/${f}.js`), ctx);
const WORLDS = vm.runInContext('WORLDS', ctx);

const mine = WORLDS.find(w => w.id === 'mine');
pruef('die Prüfwerkzeuge sehen die Mine weiter', !!mine && mine.courses.length > 0,
      mine ? `${mine.courses.length} Bahnen` : 'fehlt ganz');
pruef('und sie ist nicht mehr als „nur Vorschau" gekennzeichnet', !!mine && !mine.nurVorschau);
const versteckt = WORLDS.filter(w => w.nurVorschau);
pruef('zurzeit trägt keine Welt die Kennzeichnung', versteckt.length === 0,
      versteckt.map(w => w.name).join(', ') || 'keine');
/* Die Regel dahinter, als Zahl: Was im Spiel angeboten wird, ist die ganze Liste. Bliebe irgendwo
   eine Kennzeichnung hängen, stünde hier eine Welt weniger. */
pruef('das Spiel bietet alle Welten an',
      WORLDS.filter(w => !w.nurVorschau).length === WORLDS.length,
      `${WORLDS.length} Welten`);

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
/* Die Karte muß den Schalter weiter kennen, auch wenn ihn gerade niemand benutzt – sonst fehlt er,
   wenn die nächste Welt ihn braucht. Geprüft wird darum die Regel, nicht die Marke an der Mine. */
pruef('die Karte kennt die Kennzeichnung', /l\.nurVorschau/.test(karte));
pruef('und läßt Namen und Nadel im Spiel weg', /imSpiel && l\.nurVorschau/.test(karte));
/* Die Insel selbst bleibt liegen: Die Küste rechnet sich aus allen Landstücken, und ein Stück Land
   ohne Beschriftung verspricht nichts. */
pruef('die Insel bleibt auf der Karte', /LAND\.map\(gelaende\)/.test(karte) && !/LAND = LAND\.filter/.test(karte));
/* Ohne die Kennung VORSCHAU (Node beim Prüfen) darf nichts versteckt werden. */
pruef('ohne Kennung wird nichts versteckt', /typeof VORSCHAU !== 'undefined' && !VORSCHAU/.test(karte));

console.log(fehler ? `\n${fehler} Fehler\n` : '\nalles bestanden\n');
process.exit(fehler ? 1 : 0);
