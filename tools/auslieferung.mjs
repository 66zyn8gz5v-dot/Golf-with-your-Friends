/* Prüft, ob alles, was die Seite braucht, auch ausgeliefert wird.
 *
 * Anlass: Das gemalte Titelbild lag in einem eigenen Ordner `bilder/`. Die Auslieferung nach
 * GitHub Pages kopiert aber nicht den ganzen Baum, sondern eine Liste – und in der stand `bilder`
 * nicht. Auf dem eigenen Rechner war alles in Ordnung, in der Vorschau malte Safari sein
 * Fragezeichen über den halben Schirm. Die Prüfung liest darum beides: Was verlangt index.html,
 * und was kopiert der Arbeitsablauf. Was nur auf einer Seite steht, ist ein Fehler.
 *
 *   node tools/auslieferung.mjs
 */
import { readFileSync, existsSync } from 'node:fs';
import { dirname, resolve, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const wurzel = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const lies = d => readFileSync(join(wurzel, d), 'utf8');
const fehler = [];

// 1. Was kopiert die Auslieferung? Die Zeile "cp -r ..." aus dem Arbeitsablauf.
const ablauf = lies('.github/workflows/pages.yml');
const cp = ablauf.match(/cp -r ([^\n]+)/);
if (!cp) fehler.push('In pages.yml steht keine "cp -r"-Zeile – kopiert die Auslieferung noch?');
const kopiert = new Set(
  (cp ? cp[1] : '').match(/"\$1"\/([A-Za-z0-9_.-]+)/g)?.map(t => t.replace('"$1"/', '')) ?? []
);

// 2. Was verlangt index.html an eigenen Dateien? (fremde Adressen gehen uns nichts an)
const html = lies('index.html');
const verlangt = new Set();
for (const m of html.matchAll(/(?:src|href)="(?!https?:|data:|#)([^"]+)"/g)) verlangt.add(m[1]);
// manifest und Service Worker hängen nicht im HTML, gehören aber dazu
verlangt.add('manifest.webmanifest');
verlangt.add('sw.js');

// 2b. Bilder, die nur im Stilblatt stehen. Genau hier lag die Lücke: Das Titelbild hing an einer
//     url(...) in style.css, im HTML stand es nirgends – gefunden wurde es nur, weil es zufällig
//     auch im Service Worker steht. Ein Bild ohne diesen Zufall wäre durchgerutscht.
for (const m of lies('style.css').matchAll(/url\(\s*['"]?(?!https?:|data:)([^)'"]+)['"]?\s*\)/g)) {
  verlangt.add(m[1].trim());
}

// 2c. Und die Zeichen aus dem Manifest. Auch die stehen nirgends im HTML – das Manifest ist die
//     einzige Stelle, an der etwa das maskable-Zeichen überhaupt vorkommt.
for (const z of JSON.parse(lies('manifest.webmanifest')).icons ?? []) {
  if (z.src && !/^(https?:|data:)/.test(z.src)) verlangt.add(z.src);
}

for (const datei of [...verlangt].sort()) {
  if (!existsSync(join(wurzel, datei))) { fehler.push(`gebraucht wird ${datei} – die Datei gibt es nicht`); continue; }
  const oben = datei.split('/')[0];
  if (!kopiert.has(oben)) fehler.push(`${datei} wird nicht ausgeliefert: "${oben}" fehlt in der cp-Zeile von pages.yml`);
}

// 3. Und was der Service Worker vorhält, muss es auch geben und ausgeliefert werden.
const sw = lies('sw.js');
for (const m of sw.matchAll(/'\.\/([^']+)'/g)) {
  const datei = m[1];
  if (!datei || datei.endsWith('/')) continue;
  if (!existsSync(join(wurzel, datei))) { fehler.push(`sw.js hält ${datei} vor – die Datei gibt es nicht`); continue; }
  const oben = datei.split('/')[0];
  if (!kopiert.has(oben)) fehler.push(`sw.js hält ${datei} vor, ausgeliefert wird "${oben}" aber nicht`);
}

if (fehler.length) { console.error(fehler.map(f => '  FEHLER ' + f).join('\n')); process.exit(1); }
console.log(`ok – ${verlangt.size} Dateien aus index.html, style.css und manifest.webmanifest, alle vorhanden und in der Auslieferung (kopiert: ${[...kopiert].join(', ')})`);
