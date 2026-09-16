/* Schreibt icons/weltkarte.svg – die Weltkarte als fertige Datei.
 *
 *   node tools/karte.mjs            schreibt die Datei neu
 *   node tools/karte.mjs --pruefen  sagt nur, ob sie noch stimmt (für die Auslieferung)
 *
 * Warum überhaupt eine Datei, wo die Karte doch gerechnet wird: Sie liegt inzwischen hinter jeder
 * Tafel – und hinter dem Ladebild. Das Ladebild steht aber im festen HTML und muss da sein, *bevor*
 * irgendein Skript gelaufen ist; genau dafür gibt es es. Eine Karte, die erst JavaScript baut, käme
 * dort immer zu spät. Als Datei geht sie überall, ohne Skript, und der Browser hebt sie auf.
 *
 * Die Gefahr dabei ist, dass die Datei altert: Wer eine Welt anhängt, ändert src/worldmap.js, und
 * die Datei zeigt weiter die alte Küste. Darum gibt es --pruefen, und darum ruft die
 * Auslieferungsprüfung das mit auf.
 */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = path.join(WURZEL, 'icons', 'weltkarte.svg');

const ctx = { console }; vm.createContext(ctx);
/* level.js nur wegen seededRandom: Die Karte streut Wellen, Gelände und Küstenrauschen mit
   festem Startwert, damit sie jedes Mal genau gleich aussieht – sonst wäre die Datei bei jedem
   Lauf anders und --pruefen könnte nichts vergleichen. */
for (const f of ['level', 'worldmap'])
  vm.runInContext(fs.readFileSync(path.join(WURZEL, 'src', `${f}.js`), 'utf8'), ctx);
const WorldMap = vm.runInContext('WorldMap', ctx);

/* Als eigenständige Datei braucht die Karte ihren Namensraum – im HTML steht er am <html>, hier
   nicht. Ohne ihn zeigt der Browser eine leere Fläche. 'slice' füllt und schneidet über, passend
   zu 'background-size: cover' im Stilblatt. */
const inhalt = WorldMap.svg('weltkarte-datei', 'xMidYMid slice')
  .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');

const alt = fs.existsSync(ZIEL) ? fs.readFileSync(ZIEL, 'utf8') : null;
if (process.argv.includes('--pruefen')) {
  if (alt === inhalt) { console.log(`ok – icons/weltkarte.svg ist auf dem Stand von src/worldmap.js (${(inhalt.length / 1024).toFixed(0)} kB)`); process.exit(0); }
  console.log(alt === null
    ? 'FEHLER – icons/weltkarte.svg fehlt. Einmal "node tools/karte.mjs" laufen lassen.'
    : 'FEHLER – icons/weltkarte.svg ist veraltet: src/worldmap.js hat sich geändert. "node tools/karte.mjs" laufen lassen.');
  process.exit(1);
}
fs.writeFileSync(ZIEL, inhalt);
console.log(`icons/weltkarte.svg geschrieben – ${(inhalt.length / 1024).toFixed(0)} kB`);
