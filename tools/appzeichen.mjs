/* Schreibt die App-Zeichen – icons/icon-192.png, icon-512.png, icon-maskable-512.png und
 * apple-touch-icon.png.
 *
 *   node tools/appzeichen.mjs
 *
 * Bis Fassung 141 waren die vier Zeichen Ausschnitte aus dem gemalten Titelbild. Das Titelbild ist
 * seit Fassung 139 nicht mehr im Spiel, und es passte auch vorher nicht: Das Spiel ist gezeichnet,
 * das Bild war gemalt. Die Weltkarte ist mit demselben Stift gemacht wie alles andere – also
 * bekommt das Zeichen ihren Stil.
 *
 * Es ist **kein Ausschnitt der Karte**. Ein Ausschnitt wäre bei 48 Bildpunkten ein Farbbrei: Die
 * Karte lebt von Beschriftung und hundert kleinen Zeichen, und nichts davon überlebt so klein.
 * Statt dessen ist hier eine eigene, winzige Karte gezeichnet – dieselben Farben, dieselbe
 * Küstenkante, dasselbe Gradnetz, aber nur *ein* Motiv: eine Insel mit der Fahne darauf.
 *
 * Die Farben stammen aus src/worldmap.js und stehen hier noch einmal, weil das Zeichen eine eigene
 * Zeichnung ist und keine Ausgabe der Karte. Wer dort die Meeresfarbe ändert, muss hier nachziehen
 * – dafür bleibt das Zeichen unabhängig davon, wie die Karte gerade geschnitten ist.
 */
import { chromium } from '/opt/node22/lib/node_modules/playwright/index.mjs';
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path';
import { fileURLToPath } from 'node:url';

const WURZEL = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const ZIEL = path.join(WURZEL, 'icons');

/* Die Geländezeichen kommen aus src/worldmap.js selbst. Nachgebaut waren sie hier schon einmal –
   und damit wären es zwei Wahrheiten gewesen: Wer dort einen Baum ändert, hätte hier einen alten
   stehen. (level.js wird nur wegen seededRandom gebraucht, das worldmap.js beim Laden erwartet.) */
const ctx = { console }; vm.createContext(ctx);
for (const f of ['level', 'worldmap'])
  vm.runInContext(fs.readFileSync(path.join(WURZEL, 'src', `${f}.js`), 'utf8'), ctx);
const WorldMap = vm.runInContext('WorldMap', ctx);

/* ---------- die Farben der Karte ---------- */
const MEER_OBEN = '#2d6f8e', MEER_MITTE = '#20566f', MEER_UNTEN = '#17415a';
const LAND_HELL = '#e8dcae', LAND_DUNKEL = '#d2c48c';
const SAUM = '#f0e6b8';          // der helle Strand innen an der Küste
const TINTE_LAND = '#4d4a2c';    // die Küstenlinie
const TINTE = '#38452f';         // der Umriss der Geländezeichen
const WIESE = '#9ccf6a';

/* ---------- die Insel ----------
   Sie wird gerechnet, nicht gezeichnet – mit derselben Rechnung wie das Festland der Karte:
   ein paar Landstücke, ein Feld daraus, und die Linie, auf der das Feld den Wasserstand hat, ist
   die Küste. Drei Lagen Rauschen verbiegen dabei nicht das Feld, sondern die Stelle, an der man
   es fragt; daher die Buchten und die zerfranste Kante.

   Von Hand gezeichnet war sie vorher zu glatt: ein Klecks mit einer Delle. Nachgeahmtes Rauschen
   wäre die zweite Wahrheit gewesen – wer an der Karte dreht, hätte das Zeichen nicht mitgedreht.

   Gerechnet wird in den Einheiten der Karte (ein Landstück hat dort r ≈ 13), sonst wäre das
   Rauschen im Verhältnis zur Insel zu fein und die Küste doch wieder glatt. Ins Bild kommt sie
   danach über eine Vergrößerung, die aus ihren eigenen Ausmaßen folgt. */
const LANDSTUECKE = [
  { x: 22, y: 20, r: 12.5 },     // der Hauptteil
  { x: 30, y: 26, r: 9.5 },      // die Schulter nach Südosten
  { x: 15, y: 27, r: 7.5 },      // die Landzunge nach Südwesten
];

/* Die größte der gerechneten Linien ist die Insel; kleinere sind abgesprengte Klippen, die bei
   dieser Bildgröße nur Krümel wären. */
function inselPfad() {
  const ringe = WorldMap.kueste(LANDSTUECKE, 46, 46);
  const punkte = ringe.map(d => d.slice(1, -2).split(' L').map(q => q.split(' ').map(Number)));
  punkte.sort((p, q) => q.length - p.length);
  const ring = punkte[0];
  const xs = ring.map(p => p[0]), ys = ring.map(p => p[1]);
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  /* Einpassen: Die Insel bekommt den Kasten von RAND bis 100-RAND und behält ihr Seitenverhältnis. */
  const RAND = 15;
  const f = Math.min((100 - 2 * RAND) / (x1 - x0), (100 - 2 * RAND) / (y1 - y0));
  const vx = (100 - (x1 - x0) * f) / 2 - x0 * f, vy = (100 - (y1 - y0) * f) / 2 - y0 * f;
  const um = p => [p[0] * f + vx, p[1] * f + vy];
  return {
    d: 'M' + ring.map(p => um(p).map(v => v.toFixed(2)).join(' ')).join(' L') + ' Z',
    mitte: um([(x0 + x1) / 2, (y0 + y1) / 2]),
  };
}
const { d: INSEL, mitte: INSELMITTE } = inselPfad();

/* Ein Geländezeichen der Karte, gesetzt in die Einheiten dieses Bildes. Auf der Karte ist ein Baum
   gut zwei Einheiten breit, hier soll er zehn sein – darum die Vergrößerung. Der Fuß des Zeichens
   steht auf (x, y), so wie auf der Karte auch. */
const SCHILD = 4.2;
const z = (art, x, y, s = 1) =>
  `<g transform="translate(${x} ${y}) scale(${SCHILD})">${WorldMap.zeichen[art](0, 0, s)}</g>`;

function zeichen({ rand }) {
  /* 'rand' ist der Abstand, den das Motiv zum Bildrand hält. Beim maskable-Zeichen ist er groß:
     Android schneidet daraus einen Kreis, und was außerhalb der inneren 80 % liegt, ist weg. */
  const k = (100 - 2 * rand) / 100;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100" height="100">
  <defs>
    <linearGradient id="meer" x1="0" y1="0" x2="0.4" y2="1">
      <stop offset="0" stop-color="${MEER_OBEN}"/><stop offset="0.5" stop-color="${MEER_MITTE}"/>
      <stop offset="1" stop-color="${MEER_UNTEN}"/></linearGradient>
    <linearGradient id="land" x1="0" y1="0" x2="0.3" y2="1">
      <stop offset="0" stop-color="${LAND_HELL}"/><stop offset="1" stop-color="${LAND_DUNKEL}"/></linearGradient>
    <radialGradient id="wiese" cx="0.5" cy="0.45" r="0.55">
      <stop offset="0" stop-color="${WIESE}" stop-opacity="0.72"/>
      <stop offset="1" stop-color="${WIESE}" stop-opacity="0"/></radialGradient>
    <radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
      <stop offset="0.6" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(10,20,30,0.5)"/></radialGradient>
    <filter id="tief" x="-30%" y="-30%" width="170%" height="170%">
      <feDropShadow dx="0.6" dy="1.1" stdDeviation="0.9" flood-color="#0b2230" flood-opacity="0.5"/></filter>
    <clipPath id="landClip"><path d="${INSEL}"/></clipPath>
  </defs>

  <rect width="100" height="100" fill="url(#meer)"/>

  <g transform="translate(${rand} ${rand}) scale(${k})">
    <!-- Gradnetz und ein paar Wellenstriche: das Meer einer Seekarte, nicht blaue Farbe -->
    <g stroke="rgba(210,232,242,0.13)" stroke-width="0.5" fill="none">
      <path d="M0 25 H100 M0 50 H100 M0 75 H100 M25 0 V100 M50 0 V100 M75 0 V100"/>
    </g>
    <g stroke="rgba(190,225,240,0.45)" stroke-width="0.7" fill="none" stroke-linecap="round">
      <path d="M8 12 q2.5 -1.6 5 0 M84 20 q2.5 -1.6 5 0 M12 84 q2.5 -1.6 5 0
               M88 72 q2.5 -1.6 5 0 M30 92 q2.5 -1.6 5 0 M64 88 q2.5 -1.6 5 0"/>
    </g>

    <!-- Flachwasser: dieselbe Küste mehrmals gestrichelt, jedes Mal schmaler. Weil breite Striche
         unter schmalen liegen, entstehen Stufen – die Tiefenlinien einer Seekarte. -->
    <g fill="none" stroke="rgba(176,222,238,0.17)" stroke-linejoin="round">
      <path d="${INSEL}" stroke-width="11"/><path d="${INSEL}" stroke-width="8"/>
      <path d="${INSEL}" stroke-width="5.5"/><path d="${INSEL}" stroke-width="3.4"/>
      <path d="${INSEL}" stroke-width="1.8"/>
    </g>

    <!-- Land -->
    <g filter="url(#tief)"><path d="${INSEL}" fill="url(#land)"/></g>
    <g clip-path="url(#landClip)">
      <circle cx="54" cy="46" r="26" fill="url(#wiese)"/>
      <g stroke="rgba(90,78,44,0.14)" stroke-width="0.5" fill="none">
        <path d="M0 25 H100 M0 50 H100 M0 75 H100 M25 0 V100 M50 0 V100 M75 0 V100"/>
      </g>
      <!-- Der Strand liegt innen an der Küste: erst ein breiter, sehr blasser Streifen als
           Sandbank, darauf ein schmaler heller – zusammen ergibt das eine Kante mit Tiefe statt
           eines Rings. -->
      <path d="${INSEL}" fill="none" stroke="rgba(150,140,80,0.18)" stroke-width="7"/>
      <path d="${INSEL}" fill="none" stroke="${SAUM}" stroke-width="3" opacity="0.9"/>
      ${z('huegel', 66, 31, 0.95)}
      ${z('baum', 34, 36, 1.1)}
      ${z('baum', 46, 26, 0.9)}
      ${z('busch', 33, 54, 1.0)}
    </g>
    <path d="${INSEL}" fill="none" stroke="${TINTE_LAND}" stroke-width="1.1"/>

    <!-- Das Loch mit der Fahne: das eine Motiv, das aus der Karte ein Golfspiel macht.
         Rot auf Pergament ist der stärkste Gegensatz, den die Karte hergibt – darum trägt die
         Fahne das Zeichen und nicht der Ball. -->
    <g transform="translate(50 62)">
      <ellipse cx="0" cy="0" rx="4.6" ry="2.3" fill="#2b2a1c"/>
      <ellipse cx="0" cy="-0.5" rx="4.6" ry="2.3" fill="#16324a"/>
      <path d="M0 -1 v-26" stroke="#f4efe0" stroke-width="1.8" stroke-linecap="round"/>
      <path d="M0 -1 v-26" stroke="rgba(60,50,30,0.35)" stroke-width="0.6"/>
      <path d="M0.9 -26.5 L17 -22.2 L0.9 -17.6 Z" fill="#d6483c" stroke="#7d2018" stroke-width="0.9"
            stroke-linejoin="round"/>
      <path d="M7.4 -23.6 l0.75 1.9 l2 0.1 l-1.55 1.3 l0.55 1.95 l-1.75 -1.1 l-1.75 1.1
               l0.55 -1.95 l-1.55 -1.3 l2 -0.1 Z" fill="#ffd86b"/>
      <circle cx="-7.2" cy="-1.6" r="3.5" fill="#fffdf6" stroke="#8a8368" stroke-width="0.8"/>
      <circle cx="-8.3" cy="-2.7" r="1.3" fill="#ffffff" opacity="0.9"/>
    </g>

    <!-- Windrose: klein, oben links, wie auf der großen Karte -->
    <g transform="translate(13.5 14.5)" opacity="0.8">
      <circle r="7.5" fill="rgba(245,238,214,0.14)" stroke="rgba(245,238,214,0.45)" stroke-width="0.5"/>
      <path d="M0 -7.2 L1.8 0 L0 7.2 L-1.8 0 Z" fill="#f2ead2"/>
      <path d="M-7.2 0 L0 -1.8 L7.2 0 L0 1.8 Z" fill="rgba(242,234,210,0.6)"/>
    </g>
  </g>

  <rect width="100" height="100" fill="url(#vig)"/>
</svg>`;
}

/* [Dateiname, Kantenlänge, Rand des Motivs] */
const AUFTRAEGE = [
  ['icon-512.png', 512, 0],
  ['icon-192.png', 192, 0],
  ['apple-touch-icon.png', 180, 0],
  /* Android schneidet aus dem maskable-Zeichen einen Kreis; sicher ist nur die innere 80-%-Scheibe.
     Mit 11 % Rand liegt das Motiv auf 78 % der Kante und damit ganz darin. */
  ['icon-maskable-512.png', 512, 11],
];

const b = await chromium.launch();
for (const [name, kante, rand] of AUFTRAEGE) {
  const p = await b.newPage({ viewport: { width: kante, height: kante }, deviceScaleFactor: 1 });
  await p.setContent(`<!doctype html><meta charset="utf-8">
    <style>html,body{margin:0;padding:0;background:${MEER_UNTEN}}
    svg{display:block;width:${kante}px;height:${kante}px}</style>${zeichen({ rand })}`);
  await p.waitForTimeout(120);
  await p.screenshot({ path: path.join(ZIEL, name), omitBackground: false });
  await p.close();
  const kb = (fs.statSync(path.join(ZIEL, name)).size / 1024).toFixed(1);
  console.log(`${name.padEnd(24)} ${kante}×${kante}  ${kb} kB`);
}
await b.close();
