/* Prüft die Hüte und Skins.
 *
 *   node tools/huete.mjs
 *
 * WARUM DAS EINE PRÜFUNG BRAUCHT
 * Ein Hut fällt nicht auf, wenn er kaputtgeht. Er wird nur in einem Menü und auf einem Ball
 * gezeichnet, und wenn dabei etwas wirft, sieht man einen leeren Kreis - kein Fehler, keine
 * Meldung, nur ein Ball ohne Hut. Darum wird hier jeder Hut *wirklich gezeichnet*, auf eine
 * Leinwand, die nur mitzählt: einmal groß (mit Feinarbeit) und einmal klein (ohne). Ein Tippfehler
 * in einer Hilfsfunktion fliegt so sofort auf, und zwar bei allen Hüten, nicht nur beim neuen.
 *
 * Dazu die Regeln, die sich nicht von selbst halten:
 *   - Jeder Eintrag in der Liste muß auch eine Zeichnung haben (und umgekehrt fällt ein Hut ohne
 *     Listeneintrag niemandem auf - er ist dann einfach nicht zu haben).
 *   - Jede Welt hat genau eine Belohnung. Zwei wären ein Streit, keine wäre ein leeres Versprechen
 *     auf dem Weltbildschirm.
 *   - Der Gartenzwerg ist der Spezialskin: ein Ganzkörper-Skin, der an keiner Welt hängt und
 *     darum von Anfang an zu haben ist. Ein Spaß, den man erst freispielen muß, ist keiner.
 */
import fs from 'node:fs'; import path from 'node:path'; import vm from 'node:vm';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lies = (f) => fs.readFileSync(path.join(WURZEL, f), 'utf8');

let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

const ctx = { console };
vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow',
                 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_pro', 'hats'])
  vm.runInContext(lies(`src/${f}.js`), ctx);
const WORLDS = vm.runInContext('WORLDS', ctx);
const Hats = vm.runInContext('Hats', ctx);

/* ---------- Die Liste ---------- */
console.log('\n--- Die Liste ---');
const ids = Hats.LIST.map(h => h.id);
pruef('die Liste ist nicht leer', ids.length > 5, `${ids.length} Einträge`);
const doppelt = ids.filter((id, i) => ids.indexOf(id) !== i);
pruef('kein Hut steht zweimal drin', doppelt.length === 0, doppelt.join(', '));
const ohneBild = ids.filter(id => !Hats.has(id));
pruef('jeder Eintrag hat eine Zeichnung', ohneBild.length === 0, ohneBild.join(', '));
const ohneName = Hats.LIST.filter(h => !h.name || !h.name.trim());
pruef('jeder Eintrag hat einen Namen', ohneName.length === 0, ohneName.map(h => h.id).join(', '));

/* ---------- Belohnungen ---------- */
console.log('\n--- Belohnungen ---');
for (const w of WORLDS) {
  const lohn = Hats.belohnung(w.id);
  pruef(`${w.name} hat genau eine Belohnung`,
        !!lohn && Hats.LIST.filter(h => h.welt === w.id).length === 1,
        lohn ? lohn.name : 'keine');
}
const fremd = Hats.LIST.filter(h => h.welt && !WORLDS.some(w => w.id === h.welt));
pruef('keine Belohnung hängt an einer Welt, die es nicht gibt', fremd.length === 0,
      fremd.map(h => `${h.id}→${h.welt}`).join(', '));

/* ---------- Der Spezialskin ---------- */
console.log('\n--- Der Gartenzwerg ---');
const zwerg = Hats.LIST.find(h => h.id === 'gartenzwerg');
pruef('es gibt ihn', !!zwerg);
pruef('er ist ein Ganzkörper-Skin', Hats.voll('gartenzwerg'));
pruef('er hängt an keiner Welt', !!zwerg && !zwerg.welt);
/* Das ist der eigentliche Punkt: Er ist von Anfang an da. Bekäme er still eine Bedingung, wäre aus
   dem Spaß eine weitere Hausaufgabe geworden, und niemandem fiele es auf. */
pruef('und ist darum sofort zu haben', Hats.freigeschaltet('gartenzwerg'));
/* Umgekehrt genauso wichtig: Die Weltskins bleiben Auszeichnungen. Ein zweiter freier
   Ganzkörper-Skin wäre nicht schlimm - ein Weltskin ohne Welt schon. */
const freiVoll = Hats.LIST.filter(h => h.voll && !h.welt).map(h => h.id);
pruef('die Belohnungsskins hängen weiter alle an ihrer Welt', freiVoll.length === 1 && freiVoll[0] === 'gartenzwerg',
      freiVoll.join(', '));
const quelle = lies('src/hats.js');
const von = quelle.indexOf('gartenzwerg(ctx, color, t, fein) {');
const leib = von < 0 ? '' : quelle.slice(von, quelle.indexOf('\n    },', von));
for (const [was, muster] of [['eine Zipfelmütze', /zipfelmuetze\(ctx, t, fein\)/],
                             ['einen Bart', /Bart/], ['eine Knollennase', /Knollennase|Nase/],
                             ['eine Jacke mit Gürtel', /Gürtel/], ['rote Wangen', /Wangen/],
                             ['buschige Brauen', /Brauen/]])
  pruef(`er hat ${was}`, muster.test(leib));
/* Die Mütze gehört *über* den Reif in Spielerfarbe. Käme sie als gewöhnliche Zeichnung, liefe der
   Reif quer über die Mütze - bei vier Spielern sähe der Zwerg aus wie durchgestrichen. */
pruef('und die Mütze liegt über dem Spielerreif', /return \(\) => zipfelmuetze/.test(leib));

/* ---------- Jeder Hut wird wirklich gezeichnet ---------- */
console.log('\n--- Gezeichnet wird jeder ---');
/* Eine Leinwand, die nichts malt und nur mitzählt. Alles, was der Zeichner nicht kennt, ist ein
   Nichtstuer - so muß diese Datei nicht jede Canvas-Funktion nachbauen, sondern nur die beiden,
   deren Rückgabe gebraucht wird. */
function leinwand(dichte) {
  const zaehler = { fill: 0, stroke: 0 };
  const verlauf = { addColorStop() {} };
  const abgelegt = {};
  const c = new Proxy({}, {
    get(_, k) {
      if (k === 'fill') return () => { zaehler.fill++; };
      if (k === 'stroke') return () => { zaehler.stroke++; };
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createPattern') return () => verlauf;
      if (k === 'getTransform') return () => ({ a: dichte, b: 0, c: 0, d: dichte });
      if (k === 'measureText') return () => ({ width: 1 });
      if (k in abgelegt) return abgelegt[k];
      return () => {};
    },
    set(_, k, v) { abgelegt[k] = v; return true; },
  });
  return { c, zaehler };
}
for (const h of Hats.LIST) {
  if (h.id === 'none') continue;
  const ergebnis = [];
  for (const [wie, r, dichte] of [['groß', 40, 3], ['klein', 9, 1]]) {
    const { c, zaehler } = leinwand(dichte);
    try {
      // zwei Zeitpunkte, damit auch beides drankommt, was blinzelt oder schwingt
      Hats.draw(c, h.id, 100, 100, r, '#f2c14e', 0);
      Hats.draw(c, h.id, 100, 100, r, '#f2c14e', 4.27);
      if (!zaehler.fill && !zaehler.stroke) ergebnis.push(`${wie}: malt nichts`);
    } catch (e) { ergebnis.push(`${wie}: ${e.message}`); }
  }
  pruef(`${h.name} wird gezeichnet`, ergebnis.length === 0, ergebnis.join(' | '));
}

console.log(`\n${fehler ? fehler + ' FEHLER' : 'alles bestanden'}`);
process.exit(fehler ? 1 : 0);
