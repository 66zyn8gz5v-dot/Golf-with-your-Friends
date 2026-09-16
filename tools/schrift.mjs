/* Prüft, wie viele Schriftarten das Spiel benutzt.
 *
 *   node tools/schrift.mjs
 *
 * WARUM DAS EINE REGEL IST
 * Es waren drei Zierschriften-Auftritte nebeneinander: „Cinzel Decorative" für die Titel,
 * „MedievalSharp" für die beiden großen Knöpfe – und dieselbe Stelle sah je nach Bildschirm anders
 * aus. Auf dem iPad fällt das sofort auf, weil Titel und Knöpfe untereinander stehen. Seit
 * Fassung 148 gilt: **eine Zierschrift, eine Leseschrift.**
 *
 *   MedievalSharp   alles, was schmückt: Titel, Ladebild, die großen Knöpfe, die Schlusstafel
 *   Trebuchet MS    alles, was man liest: Fließtext, Knöpfe, Zahlen
 *   monospace       nur der Bahn-Text im Editor und die Entwicklerausgabe – das ist keine Zierde,
 *                   sondern eine Notwendigkeit: Dort muss jede Spalte untereinander stehen
 *
 * Die Weltkarte zählt ausdrücklich nicht mit. Ihre Beschriftung ist Georgia kursiv, und das ist
 * nicht Oberfläche, sondern Teil der gezeichneten Karte – so, wie die Schrift auf einem alten
 * Atlas zum Blatt gehört.
 */
import fs from 'node:fs'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const lies = (f) => fs.readFileSync(path.join(WURZEL, f), 'utf8');

let fehler = 0;
const pruef = (name, ok, zusatz = '') => {
  console.log(`${ok ? '  ok  ' : 'FEHLER'}  ${name}${zusatz ? ' – ' + zusatz : ''}`); if (!ok) fehler++;
};

/* Aus einer Datei alle font-family-Angaben holen und auf die *erste* Familie eindampfen – die
   späteren sind Ersatz für den Fall, dass die erste fehlt, und keine eigene Schriftart. */
const familien = (css) => {
  const aus = new Map();
  for (const m of css.matchAll(/font-family:\s*([^;}]+)/g)) {
    const erste = m[1].split(',')[0].trim().replace(/^["']|["']$/g, '');
    aus.set(erste, (aus.get(erste) || 0) + 1);
  }
  return aus;
};

const ERLAUBT = new Set(['MedievalSharp', 'Trebuchet MS', 'monospace', 'ui-monospace', 'system-ui', 'inherit']);

for (const datei of ['style.css', 'src/3d/stil3d.css']) {
  const gefunden = familien(lies(datei));
  const fremd = [...gefunden.keys()].filter(f => !ERLAUBT.has(f));
  pruef(`${datei}: keine Schrift außer der Reihe`, fremd.length === 0,
        fremd.length ? fremd.join(', ') : [...gefunden.keys()].join(', '));
  const zier = [...gefunden.keys()].filter(f => f === 'MedievalSharp');
  pruef(`${datei}: genau eine Zierschrift`, zier.length <= 1, zier.join(', ') || 'keine');
}

/* Und nachgeladen werden darf auch nur diese eine. Jede weitere Familie in der Adresse ist eine
   Schrift, die geholt wird, bevor überhaupt etwas zu sehen ist. */
for (const [datei, wo] of [['src/main.js', '2,5D-Spiel'], ['src/3d/start3d.js', '3D-Spiel']]) {
  const treffer = [...lies(datei).matchAll(/fonts\.googleapis\.com\/css2\?([^']+)/g)];
  pruef(`${wo}: die Zierschrift wird nachgeladen`, treffer.length === 1, `${treffer.length} Aufrufe`);
  for (const t of treffer) {
    const fam = [...t[1].matchAll(/family=([^&:]+)/g)].map(m => decodeURIComponent(m[1]).replace(/\+/g, ' '));
    pruef(`${wo}: und zwar genau eine`, fam.length === 1 && fam[0] === 'MedievalSharp', fam.join(', '));
  }
}

/* UND DIE FARBE DAZU
 * Titel, Ladebild und die beiden großen Knöpfe tragen dieselben Wörter durch das Spiel. Sie
 * standen dreimal mit eigener Farbe da – Goldverlauf oben, Creme auf den Knöpfen. Jetzt gibt es
 * einen Namen dafür (--zier) und drei Stellen, die ihn benutzen. Geprüft wird beides: dass es
 * den Namen gibt und dass keine der drei Stellen wieder eine eigene Farbe hinschreibt. */
{
  const css = lies('style.css');
  pruef('die Zierfarbe hat einen Namen', /--zier:\s*#[0-9a-f]{3,8}/i.test(css));
  const stellen = [
    ['der Titel', /\.screen\.title \.panel h1 \{[^}]*\}/],
    ['das Ladebild', /#lade \.lb-titel \{[^}]*\}/],
    ['die großen Knöpfe', /\.mode-label \{[^}]*\}/],
  ];
  /* Ein Wähler kann mehrfach vorkommen – der Titel hat einen Block für die Bewegung und einen
     für das Aussehen. Also alle zusammennehmen, sonst prüfte man den falschen. */
  for (const [was, muster] of stellen) {
    const block = [...css.matchAll(new RegExp(muster.source, 'g'))].map(m => m[0]).join('\n');
    const eigen = /color:\s*(#|rgb|linear-gradient)/.test(block);
    pruef(`${was} nimmt die Zierfarbe`, block.includes('var(--zier)') && !eigen,
          eigen ? 'schreibt eine eigene Farbe hin' : '');
  }
  pruef('und keiner schneidet mehr einen Verlauf in die Schrift',
        !/-webkit-background-clip:\s*text/.test(css));
}

/* Die Karte bleibt, wie sie ist – das ist keine Ausnahme aus Bequemlichkeit, sondern der Grund,
   warum sie so aussieht, wie sie aussieht. Geprüft wird nur, dass sie sich nicht unbemerkt ändert. */
pruef('die Weltkarte beschriftet weiter in Georgia kursiv',
      /font-family="Georgia, 'Times New Roman', serif" font-style="italic"/.test(lies('src/worldmap.js')));

console.log(`\n${fehler ? fehler + ' FEHLER' : 'alles bestanden'}`);
process.exit(fehler ? 1 : 0);
