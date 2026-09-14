/* Die Weltkarte in drei Dimensionen: eine Insel im Meer, auf der die Welten als Landstriche
   liegen.

   Der Gedanke dahinter ist derselbe wie bei der gemalten Karte des 2,5D-Spiels: **Die Küste wird
   gerechnet, nicht gezeichnet.** Jede Welt ist ein Landstück mit Mitte, Reichweite und Gipfelhöhe.
   Alle Landstücke zusammen ergeben ein Höhenfeld; wo es über dem Meeresspiegel liegt, ist Land.
   Landstücke, die nah beieinander liegen, wachsen von selbst zu einem Festland zusammen; ein weit
   abseits gesetztes wird zur Insel.

   Der Gewinn ist derselbe: **Eine neue Welt braucht einen einzigen Eintrag.** Küste, Strand,
   Bergform, Bewuchs und die Stelle des Wegweisers folgen daraus. Neu gegenüber der flachen Karte
   ist die dritte Angabe – wie hoch der Landstrich aufragt. Damit wird aus dem Schneegebirge ein
   Gebirge und aus der Küste eine flache Düne, ohne dass jemand ein Gebirge modelliert.

   Die Beschriftungen sind bewusst kein Teil der 3D-Welt: Sie stehen als gewöhnliche Schaltflächen
   darüber und werden bei jedem Bild an die Stelle gerückt, an der ihr Landstrich gerade steht.
   Das gibt scharfe Schrift in jeder Größe, kostet nichts und macht das Antippen zum gelösten
   Problem – ein Knopf ist ein Knopf. */
const Karte3D = (() => {

  /* Wo die Welten liegen. 'r' ist die Reichweite im Höhenfeld, 'gipfel' die Höhe in der Mitte.
     Landstücke ohne 'id' tragen keine Welt – sie geben dem Festland nur seine Form. */
  const LAND = [
    { id: 'wiese', x: 0, z: 2, r: 15, gipfel: 2.6, biom: 'wiese' },
    { x: -8, z: -6, r: 10, gipfel: 2.0, biom: 'wiese' },
    { id: 'wald', x: -19, z: 10, r: 12, gipfel: 3.4, biom: 'wald' },
    { id: 'berg', x: 9, z: -19, r: 13, gipfel: 9.5, biom: 'berg' },
    { x: -2, z: -13, r: 9, gipfel: 3.2, biom: 'berg' },
    { id: 'kueste', x: 24, z: 6, r: 12, gipfel: 1.4, biom: 'kueste' },
    { x: 14, z: 3, r: 9, gipfel: 1.9, biom: 'wiese' },
    { id: 'wueste', x: -20, z: -14, r: 12, gipfel: 2.2, biom: 'wueste' },
    { id: 'vulkan', x: 6, z: 24, r: 12, gipfel: 6.4, biom: 'vulkan' },
    { x: -6, z: 17, r: 9, gipfel: 2.4, biom: 'wald' },
    // Schären: zu klein für eine Welt, groß genug fürs Auge
    { x: 33, z: -12, r: 4.5, gipfel: 1.4, biom: 'kueste' },
    { x: -33, z: 2, r: 4, gipfel: 1.6, biom: 'kueste' },
    { x: 20, z: 28, r: 5, gipfel: 2.2, biom: 'vulkan' },
    { x: -28, z: 24, r: 4.2, gipfel: 1.5, biom: 'wald' },
  ];

  const BIOM = {
    wiese: { gras: '#6fb63f', hoch: '#8ec95a', fels: '#9a9488', baum: 'laub' },
    wald: { gras: '#41893a', hoch: '#2f6b3a', fels: '#8a8478', baum: 'tanne' },
    berg: { gras: '#7d8f7a', hoch: '#f2f6fa', fels: '#9aa3ad', baum: 'tanne', schnee: 5.2 },
    kueste: { gras: '#8cc26a', hoch: '#a8d189', fels: '#b0a894', baum: 'laub' },
    wueste: { gras: '#ddc487', hoch: '#efdcab', fels: '#c0a878', baum: 'keiner' },
    vulkan: { gras: '#6b5a4a', hoch: '#3c332e', fels: '#4a413a', baum: 'keiner', glut: 4.6 },
  };

  const MEER = 0.0, STRAND = 0.55;
  const rausch = M3.rauschen(20260914);

  /* Das Höhenfeld. Jedes Landstück trägt eine Glocke bei, die an seiner Reichweite sauber auf
     null geht – und dahinter wirklich null bleibt. Eine Glocke ohne Ende summierte sich über
     vierzehn Landstücke so weit auf, dass die ganze Karte zu Land würde.

     Gefragt wird nicht an der Stelle selbst, sondern ein Stück daneben, und zwar umso weiter, je
     gröber das Rauschen ist. Dort, wo das Feld flach ist (tief im Land), ändert das nichts; dort,
     wo es steil abfällt (am Ufer), wandert die Küstenlinie dadurch weit. So entstehen Buchten und
     Landzungen aus runden Landstücken. */
  function hoehe(x, z) {
    const wx = x + rausch(x * 0.07, z * 0.07) * 3.6 + rausch(x * 0.21, z * 0.21) * 1.2;
    const wz = z + rausch(x * 0.07 + 31, z * 0.07 - 17) * 3.6 + rausch(x * 0.21 - 9, z * 0.21 + 5) * 1.2;
    let h = -1.1;
    for (const l of LAND) {
      const dx = wx - l.x, dz = wz - l.z, q = (dx * dx + dz * dz) / (l.r * l.r);
      if (q < 1) { const u = 1 - q; h += (l.gipfel + 1.1) * u * u * (0.6 + 0.4 * u); }
    }
    if (h > STRAND) h += rausch(x * 0.55, z * 0.55) * Math.min(1.4, h * 0.3);
    return h;
  }

  /* Welches Biom herrscht hier? Das nächstgelegene Landstück gewinnt – gewichtet mit seiner
     Reichweite, damit ein großes Gebirge auch über seine Mitte hinaus Gebirge bleibt. */
  function biomAn(x, z) {
    let bestes = LAND[0], bestWert = -1e9;
    for (const l of LAND) {
      const dx = x - l.x, dz = z - l.z;
      const w = 1 - Math.sqrt(dx * dx + dz * dz) / l.r;
      if (w > bestWert) { bestWert = w; bestes = l; }
    }
    return BIOM[bestes.biom];
  }

  function farbeAn(x, z, h) {
    const b = biomAn(x, z);
    if (h < STRAND) {
      /* Unter Wasser: von hellem Sand an der Wasserlinie zu dunklem Grund in der Tiefe. Das ist
         nicht nur hübscher – es ist nötig. Das Meer ist durchscheinend, und wo der Grund überall
         gleich hell wäre, läge über der Insel ein blasses Quadrat in der Größe des gerechneten
         Geländes, sichtbar abgesetzt gegen das dunkle Meer dahinter. */
      const tief = Bauen.mischen('#35697a', '#e8d9a8', M3.klemm((h + 1.2) / 1.2, 0, 1));
      return Bauen.mischen(tief, b.gras, M3.klemm((h - MEER) / STRAND, 0, 1));
    }
    if (b.schnee && h > b.schnee) return Bauen.mischen(b.fels, b.hoch, M3.klemm((h - b.schnee) / 2.2, 0, 1));
    if (b.glut && h > b.glut) return Bauen.mischen(b.hoch, '#ff6a2a', M3.klemm((h - b.glut) / 2.4, 0, 1) * 0.55);
    const steil = Math.abs(hoehe(x + 0.5, z) - hoehe(x - 0.5, z)) + Math.abs(hoehe(x, z + 0.5) - hoehe(x, z - 0.5));
    /* Steile Hänge sind Fels, flache sind bewachsen – dasselbe, was man aus dem Flugzeug sieht. */
    if (steil > 1.5) return Bauen.mischen(b.gras, b.fels, M3.klemm((steil - 1.5) / 1.6, 0, 1));
    return Bauen.mischen(b.gras, b.hoch, M3.klemm((h - STRAND) / 4.5, 0, 0.75));
  }

  const WEIT = 42;          // wie weit die Karte reicht, in jede Richtung

  /* Die Karte aufbauen. Zurück kommen die Zeichenstücke und die Stellen der Welten – die
     Beschriftungen werden darüber gelegt, nicht hineingebaut. */
  function bauen(zeichner) {
    const stuecke = [];

    /* --- Land --- */
    const B = Bauen.sammler();
    const S = 0.75;
    const n = Math.round(WEIT * 2 / S);
    const hh = new Float32Array((n + 1) * (n + 1));
    for (let j = 0; j <= n; j++) for (let i = 0; i <= n; i++) hh[j * (n + 1) + i] = hoehe(-WEIT + i * S, -WEIT + j * S);
    /* Unter dem Meeresspiegel wird der Boden mitgezeichnet, aber nur bis knapp darunter: Der
       Meeresgrund muss nur so weit reichen, dass durch das durchscheinende Wasser Sand schimmert
       und kein Loch. */
    const H = (i, j) => Math.max(hh[j * (n + 1) + i], -1.2);
    const p = (i, j) => [-WEIT + i * S, H(i, j), -WEIT + j * S];
    for (let j = 0; j < n; j++) for (let i = 0; i < n; i++) {
      const mx = -WEIT + (i + 0.5) * S, mz = -WEIT + (j + 0.5) * S;
      const mh = (H(i, j) + H(i + 1, j) + H(i + 1, j + 1) + H(i, j + 1)) / 4;
      const f = farbeAn(mx, mz, mh);
      const a = p(i, j), b = p(i + 1, j), c = p(i + 1, j + 1), d = p(i, j + 1);
      if (Math.abs(a[1] - c[1]) <= Math.abs(b[1] - d[1])) { B.dreieck(a, d, c, f); B.dreieck(a, c, b, f); }
      else { B.dreieck(a, d, b, f); B.dreieck(d, c, b, f); }
    }
    for (const netz of B.fertig(zeichner)) stuecke.push({ netz });

    /* --- Bewuchs, Felsen, Dörfer --- */
    const D = Bauen.sammler();
    const r = M3.zufall(48271);
    for (let z = -WEIT; z < WEIT; z += 1.6) for (let x = -WEIT; x < WEIT; x += 1.6) {
      const px = x + r() * 1.6, pz = z + r() * 1.6;
      const h = hoehe(px, pz);
      if (h < STRAND + 0.25) continue;
      const b = biomAn(px, pz);
      const wuerfel = r();
      if (b.schnee && h > b.schnee - 0.5) continue;      // über der Baumgrenze wächst nichts
      if (b.baum === 'keiner') { if (wuerfel < 0.10) D.stelle(px, h - 0.15, pz, 0, 1, s => Deko3D.fels(s, 0.3 + r() * 0.5, Math.round(px * 17 + pz * 7))); continue; }
      if (wuerfel < 0.44) {
        if (b.baum === 'tanne') D.stelle(px, h - 0.1, pz, 0, 1, s => Deko3D.tanne(s, 1.5 + r() * 1.4, Math.round(px * 53 + pz * 29)));
        else D.stelle(px, h - 0.1, pz, r() * 6, 1, s => Deko3D.laubbaum(s, 1.5 + r() * 1.3, Math.round(px * 71 + pz * 17)));
      } else if (wuerfel < 0.54) {
        D.stelle(px, h - 0.15, pz, 0, 1, s => Deko3D.fels(s, 0.25 + r() * 0.4, Math.round(px * 23 + pz * 41)));
      }
    }
    /* Ein paar Häuser in der Wiese – bewohntes Land sieht anders aus als leeres. */
    for (let i = 0; i < 14; i++) {
      const a = r() * M3.TAU3, d = 5 + r() * 9;
      const x = LAND[0].x + Math.cos(a) * d, z = LAND[0].z + Math.sin(a) * d;
      const h = hoehe(x, z);
      if (h < STRAND + 0.4) continue;
      D.stelle(x, h - 0.05, z, r() * 6, 0.75 + r() * 0.4, s => Deko3D.haus(s));
    }
    for (const netz of D.fertig(zeichner)) stuecke.push({ netz });

    /* --- Die Königsburg auf dem Grasland, Wegweiser für jede Welt --- */
    const M = Bauen.sammler();
    const marken = [];
    const burgOrt = LAND[0];
    const burgH = hoehe(burgOrt.x, burgOrt.z + 1);
    M.stelle(burgOrt.x, burgH - 0.3, burgOrt.z + 1, 0.4, 1, s => Deko3D.burg(s, 0.72));

    for (const l of LAND) {
      if (!l.id) continue;
      const welt = BAHNEN3D.WELTEN.find(w => w.id === l.id);
      if (!welt) continue;
      /* Der Wegweiser steht nicht genau in der Mitte des Landstrichs, sondern ein Stück davor –
         sonst verschwände er im Gebirge, dessen Welt er ankündigt. */
      const mx = l.x, mz = l.z + l.r * 0.34;
      const h = Math.max(hoehe(mx, mz), STRAND);
      M.stelle(mx, h, mz, 0, 1, s => {
        s.walze(0.5, 0.42, 0.35, 8, '#b3a992', '#ded6c4');
        Deko3D.mast(s, 3.2);
      });
      marken.push({ id: l.id, welt, x: mx, y: h + 3.2, z: mz });
    }
    for (const netz of M.fertig(zeichner)) stuecke.push({ netz });

    /* --- Meer ---
       Zwei Teile. Innen ein feines Gitter, das sich bewegt: Die Wellen entstehen im Schattierer aus
       einem Sinus über die Ecken, und der braucht Ecken – bei drei Einheiten Abstand ergibt das
       eine ruhige Dünung, bei zwanzig ein Zittern. Außen ein grober, unbewegter Rahmen, der bis
       weit hinter den Horizont reicht. Ohne ihn sieht man von der Weltkarte aus die Kante des
       Meeres als schräge Linie im Himmel stehen – ein Anblick, den man nicht wieder vergisst.

       Der innere Teil endet genau dort, wo auch der gerechnete Meeresgrund endet: Er ist
       durchscheinend und braucht etwas hinter sich. */
    const W = Bauen.sammler();
    const ws = 3, innen = WEIT;
    for (let z = -innen; z < innen; z += ws) for (let x = -innen; x < innen; x += ws) {
      W.viereck([x, MEER, z], [x + ws, MEER, z], [x + ws, MEER, z + ws], [x, MEER, z + ws], '#1f7fbf', [0, 1, 0]);
    }
    for (const netz of W.fertig(zeichner)) stuecke.push({ netz, durchsichtig: true, alpha: 0.82, welle: true, wirftSchatten: false });

    const WA = Bauen.sammler();
    const aussen = 330;
    /* Vier Bänder rings um das innere Meer – oben, unten, links, rechts. */
    const band = (x0, z0, x1, z1) => WA.viereck([x0, MEER - 0.02, z0], [x1, MEER - 0.02, z0],
      [x1, MEER - 0.02, z1], [x0, MEER - 0.02, z1], '#1b76b4', [0, 1, 0]);
    band(-aussen, -aussen, aussen, -innen);
    band(-aussen, innen, aussen, aussen);
    band(-aussen, -innen, -innen, innen);
    band(innen, -innen, aussen, innen);
    for (const netz of WA.fertig(zeichner)) stuecke.push({ netz, wirftSchatten: false });

    /* --- Himmel und Wolken --- */
    const HS = Bauen.sammler();
    Welt3D.himmelNetz(HS, { himmelOben: '#1f6fc0', himmelUnten: '#c6e8f8' });
    const himmel = HS.fertig(zeichner).map(netz => ({ netz, licht: false, wirftSchatten: false, himmel: true }));

    const WO = Bauen.sammler();
    for (let i = 0; i < 22; i++) {
      /* Die Wolken stehen im Ring um die Insel, nicht darüber: Von schräg oben sieht man sonst
         mehr Wolke als Land. */
      const a = r() * M3.TAU3, d = 38 + r() * 34;
      WO.stelle(Math.cos(a) * d, 8 + r() * 9, Math.sin(a) * d, r() * 6, 1.8 + r() * 2.2, s => Deko3D.wolke(s, 1, i * 5 + 1));
    }
    for (const netz of WO.fertig(zeichner)) stuecke.push({ netz, licht: false, wirftSchatten: false });

    return {
      stuecke, himmel, marken, hoehe,
      licht: {
        sonne: [0.40, 0.72, 0.57], sonnenFarbe: [1.06, 0.99, 0.84],
        himmel: [0.42, 0.48, 0.58], boden: [0.17, 0.21, 0.24],
        nebelFarbe: [0.74, 0.87, 0.97], nebel: [60, 165], schatten: 0.5,
      },
      schattenMitte: [0, 2, 2], schattenWeite: 46,
      weg() { for (const s of [...himmel, ...stuecke]) s.netz.weg(); },
    };
  }

  return { LAND, BIOM, bauen, hoehe, WEIT };
})();
