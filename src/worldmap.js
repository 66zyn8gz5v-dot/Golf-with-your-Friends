/* Weltkarte: eine gezeichnete Landkarte, wie man sie vorn in ein Buch legt.

   Früher lag jede Welt als eigene schwebende Scheibe in der Luft, aufgereiht von links nach
   rechts. Das war übersichtlich, aber es war keine Welt – es waren acht Inseln ohne Zusammenhang,
   und mit jeder neuen wurde die Reihe länger, bis die Karte breiter war als der Schirm.

   Jetzt ist es eine Karte: ein Meer, ein Festland, ein paar Nebeninseln, und die Welten liegen
   als Landstriche darin – das Märchenland auf den Wiesen im Westen, der Schneeberg als Gebirge im
   Norden, der Dschungel im feuchten Süden, das Schattenreich im Moor am Ostrand.

   Der Kniff dabei: **Die Küste wird gerechnet, nicht gezeichnet.** Jede Welt ist ein Landstück mit
   Mittelpunkt und Halbmesser. Daraus entsteht ein Feld (je näher an einem Mittelpunkt, desto
   größer der Wert), und die Linie, an der das Feld den Wert 1 hat, ist die Küste. Landstücke, die
   nah beieinander liegen, wachsen dabei von selbst zu einem Festland zusammen; ein weit abseits
   gesetztes wird zu einer Nebeninsel.

   Das ist der ganze Sinn der Rechnerei: **Eine neue Welt braucht einen einzigen Eintrag in LAND.**
   Küste, Flachwasser, Strand, Färbung, Gelände und Beschriftung folgen daraus. Wer eine Welt
   anhängt, zeichnet keine Landkarte – er sagt, wo sie liegt und wie es dort aussieht. */
const WorldMap = (() => {
  const BREITE = 100, HOEHE = 62;

  /* Ein Landstück. 'biom' bestimmt die Färbung und die Geländezeichen, 'marke' und 'farbe' den
     anklickbaren Ort. Landstücke ohne 'id' tragen keine Welt – sie geben dem Festland nur seine
     Form: eine Landzunge, eine Bucht, ein Bergrücken. Ohne sie wäre die Insel eine Kette von
     Kreisen, mit ihnen bekommt sie eine Küste, die man sich merken kann. */
  const LAND = [
    // ---- Festland, von West nach Ost. 'r' ist die Reichweite im Feld, die sichtbare Küste liegt
    //      bei etwa 0,78 davon – zwei Landstücke wachsen also zusammen, wenn ihr Abstand kleiner
    //      ist als 0,78 mal die Summe ihrer Reichweiten.
    { id: 'normal', name: 'Märchenland', x: 27, y: 28, r: 15, biom: 'wiese', marke: '🏰', farbe: '#ffd166' },
    { x: 37, y: 36, r: 11, biom: 'wiese' },                     // Hügelland zwischen Wiese und Süden
    { id: 'pro', name: 'Tüftlerreich', x: 45, y: 22, r: 13, biom: 'werkland', marke: '⚙️', farbe: '#e0a05a' },
    // 'nameAn' setzt die Beschriftung an eine freie Stelle: Der Schneeberg liegt zwischen drei
    // Marken, sein Name stünde sonst unter zweien davon.
    { id: 'snow', name: 'Schneeberg', x: 60, y: 14, r: 14, biom: 'gebirge', marke: '🏔️', farbe: '#bfe6ff', nameAn: [52, 9] },
    { id: 'clock', name: 'Uhrwerkstadt', x: 75, y: 21, r: 13, biom: 'stadt', marke: '🕰️', farbe: '#ffc46b' },
    { x: 66, y: 30, r: 10, biom: 'werkland' },                  // Talsenke unter dem Gebirge
    { id: 'storm', name: 'Sturmhimmel', x: 84, y: 38, r: 13, biom: 'sturm', marke: '⛈️', farbe: '#8fb8ff' },
    { x: 47, y: 41, r: 10, biom: 'dschungel' },                 // Landbrücke in den Süden
    { id: 'jungle', name: 'Dschungeltempel', x: 57, y: 45, r: 14, biom: 'dschungel', marke: '🗿', farbe: '#9ee06f' },
    { id: 'shadow', name: 'Schattenreich', x: 80, y: 49, r: 13, biom: 'moor', marke: '🔮', farbe: '#c58bff' },
    // ---- Nebeninsel im Südwesten: weit genug weg, damit sie eine eigene Insel bleibt
    { id: 'sea', name: 'Meereswelt', x: 14, y: 50, r: 11, biom: 'kueste', marke: '🌊', farbe: '#7fd8ff' },
    // ---- Schären: zu klein für eine Welt, groß genug fürs Auge. Sie brechen die leere See auf
    //      und zeigen, dass die Küste gerechnet wird – auch ein Punkt mit r=4 bekommt ein Ufer.
    { x: 19, y: 12, r: 4.2, biom: 'kueste' }, { x: 8, y: 34, r: 3.4, biom: 'kueste' },
    { x: 33, y: 56, r: 4.6, biom: 'kueste' }, { x: 95, y: 27, r: 3.8, biom: 'kueste' },
    { x: 68, y: 57, r: 3.6, biom: 'kueste' }, { x: 88, y: 10, r: 3.1, biom: 'kueste' },
  ];


  /* ---------- Küste ----------
     Jedes Landstück trägt ein Feld bei, das in seiner Mitte 1 ist und am Halbmesser auf 0 fällt
     – und dahinter wirklich 0 bleibt. Genau das ist der Punkt: Ein Feld, das nie ganz endet (etwa
     1/Abstand²), summiert sich über elf Landstücke so weit auf, dass die ganze Karte zu Land wird;
     das war der erste Versuch. Mit endlicher Reichweite wirkt jedes Landstück nur in seiner
     Umgebung, und ob zwei zusammenwachsen, entscheidet allein ihr Abstand.

     WASSER ist die Höhe der Küstenlinie im Feld. Kleiner heißt: Das Land reicht weiter hinaus und
     Nachbarn wachsen leichter zusammen. */
  const WASSER = 0.06;

  /* ---------- Unruhe ----------
     Runde Landstücke geben eine runde Küste – acht Kugeln, aneinandergeklebt. Eine Karte lebt
     aber von Buchten, Landzungen und Halbinseln. Der Kniff: Nicht das Feld wird verbogen, sondern
     der Ort, an dem man es fragt. Ein Punkt am Ufer erkundigt sich ein paar Einheiten weiter
     drüben – wo das Feld flach und hoch ist (tief im Land) ändert das nichts, wo es steil abfällt
     (am Ufer) wandert die Küstenlinie dadurch weit. Drei Lagen: die grobe schlägt Buchten, die
     mittlere Landzungen, die feine zerfranst die Kante.

     Die grobe Lage ist absichtlich kräftig gewählt. Sie schneidet einen Kanal quer durchs
     Festland: Der Osten – Uhrwerkstadt, Sturmhimmel, Schattenreich – wird dadurch fast zu einer
     eigenen Insel, nur durch eine schmale Landenge gehalten. Ein schwächeres Rauschen gibt eine
     glattere, aber langweiligere Küste; dieser Kanal ist das, was die Karte unverwechselbar
     macht. Wer an den Zahlen dreht, dreht daran mit. */
  const rauschTafel = (() => {
    const r = seededRandom(70314), t = new Float32Array(2048);
    for (let i = 0; i < t.length; i++) t[i] = r() * 2 - 1;
    return t;
  })();
  const knoten = (i, j) => rauschTafel[(((i * 73856093) ^ (j * 19349663)) >>> 0) % 2048];
  function rausch(x, y) {
    const i = Math.floor(x), j = Math.floor(y), fx = x - i, fy = y - j;
    const sx = fx * fx * (3 - 2 * fx), sy = fy * fy * (3 - 2 * fy);   // weich ein- und ausblenden
    const a = knoten(i, j) + (knoten(i + 1, j) - knoten(i, j)) * sx;
    const b = knoten(i, j + 1) + (knoten(i + 1, j + 1) - knoten(i, j + 1)) * sx;
    return a + (b - a) * sy;
  }
  const versatz = (x, y, o) =>
    rausch(x * 0.105 + o, y * 0.105 - o) * 2.9 +
    rausch(x * 0.29 - o, y * 0.29 + o) * 1.15 +
    rausch(x * 0.83 + o, y * 0.83 + o) * 0.4;

  const feld = (x, y) => {
    const wx = x + versatz(x, y, 0), wy = y + versatz(x, y, 37.4);
    let s = 0;
    for (const l of LAND) {
      const dx = wx - l.x, dy = wy - l.y, q = (dx * dx + dy * dy) / (l.r * l.r);
      if (q < 1) { const u = 1 - q; s += u * u * u; }
    }
    return s;
  };

  /* Marching Squares: Das Gitter wird Zelle für Zelle abgelaufen; je nachdem, welche Ecken über
     dem Wasser liegen, entsteht ein Stück Küstenlinie. Der Schnittpunkt wird zwischen den Ecken
     linear eingepasst, sonst sähe die Küste aus wie eine Treppe. */
  function kuestenLinien() {
    const S = 0.42, NX = Math.ceil(BREITE / S) + 2, NY = Math.ceil(HOEHE / S) + 2;
    const OX = -3, OY = -3;                     // etwas über den Rand hinaus rechnen
    const w = [];
    for (let j = 0; j < NY; j++) { w[j] = []; for (let i = 0; i < NX; i++) w[j][i] = feld(OX + i * S, OY + j * S); }
    const mitte = (xa, ya, va, xb, yb, vb) => { const t = (WASSER - va) / (vb - va); return [xa + (xb - xa) * t, ya + (yb - ya) * t]; };
    const stuecke = [];
    for (let j = 0; j < NY - 1; j++) for (let i = 0; i < NX - 1; i++) {
      const x0 = OX + i * S, y0 = OY + j * S, x1 = x0 + S, y1 = y0 + S;
      const a = w[j][i], b = w[j][i + 1], c = w[j + 1][i + 1], d = w[j + 1][i];
      const k = (a > WASSER ? 8 : 0) | (b > WASSER ? 4 : 0) | (c > WASSER ? 2 : 0) | (d > WASSER ? 1 : 0);
      if (k === 0 || k === 15) continue;
      const O = () => mitte(x0, y0, a, x1, y0, b), R = () => mitte(x1, y0, b, x1, y1, c);
      const U = () => mitte(x1, y1, c, x0, y1, d), L = () => mitte(x0, y1, d, x0, y0, a);
      const paare = { 1: [[L, U]], 2: [[U, R]], 3: [[L, R]], 4: [[O, R]], 5: [[L, O], [U, R]], 6: [[O, U]], 7: [[L, O]],
                      8: [[O, L]], 9: [[O, U]], 10: [[O, R], [U, L]], 11: [[O, R]], 12: [[R, L]], 13: [[R, U]], 14: [[U, L]] }[k];
      for (const [p, q] of paare) stuecke.push([p(), q()]);
    }
    /* Stücke zu geschlossenen Ringen zusammenfügen. Die Schnittpunkte zweier Nachbarzellen sind
       derselbe Punkt, also findet jedes Ende sein Gegenstück über einen gerundeten Schlüssel.
       Gesucht wird ungerichtet – ob ein Stück an diesem Punkt anfängt oder aufhört, ist egal.
       Das war beim ersten Versuch anders, und weil die Stücke nicht alle gleich herum laufen,
       zerfiel die Küste in Fetzen. */
    const schl = p => `${p[0].toFixed(3)},${p[1].toFixed(3)}`;
    const an = new Map();
    for (const st of stuecke) for (const p of st) {
      const k = schl(p); if (!an.has(k)) an.set(k, []); an.get(k).push(st);
    }
    const offen = new Set(stuecke), ringe = [];
    for (const start of stuecke) {
      if (!offen.has(start)) continue;
      offen.delete(start);
      const ring = [start[0], start[1]];
      let ende = start[1];
      for (;;) {
        const naechst = (an.get(schl(ende)) || []).find(st => offen.has(st));
        if (!naechst) break;
        offen.delete(naechst);
        ende = schl(naechst[0]) === schl(ende) ? naechst[1] : naechst[0];
        ring.push(ende);
      }
      // Winzlinge sind Rechenrauschen an Sattelpunkten, keine Inseln
      if (ring.length > 14) ringe.push(ring);
    }
    // Einmal glätten, nicht zweimal: Beim zweiten Mal verschwinden genau die kleinen Kerben und
    // Landzungen wieder, für die das Rauschen da ist.
    return ringe.map(weich);
  }

  /* Chaikin: Jede Ecke wird durch zwei Punkte auf ihren Schenkeln ersetzt – aus dem Zackenzug des
     Gitters wird eine gezogene Linie, ohne dass die Form dabei rund wird. */
  function weich(ring) {
    const n = ring.length, out = [];
    for (let i = 0; i < n; i++) {
      const a = ring[i], b = ring[(i + 1) % n];
      out.push([a[0] * 0.75 + b[0] * 0.25, a[1] * 0.75 + b[1] * 0.25]);
      out.push([a[0] * 0.25 + b[0] * 0.75, a[1] * 0.25 + b[1] * 0.75]);
    }
    return out;
  }

  const pfad = ring => 'M' + ring.map(p => `${p[0].toFixed(2)} ${p[1].toFixed(2)}`).join(' L') + ' Z';

  /* Ein Ring ist ein Binnensee, wenn er in einem größeren liegt. Marching Squares kennt den
     Unterschied nicht – für das Verfahren ist die Uferlinie eines Sees dasselbe wie eine Küste. */
  function punktInRing(p, ring) {
    let drin = false;
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const a = ring[i], b = ring[j];
      if ((a[1] > p[1]) !== (b[1] > p[1]) && p[0] < ((b[0] - a[0]) * (p[1] - a[1])) / (b[1] - a[1]) + a[0]) drin = !drin;
    }
    return drin;
  }
  const flaeche = r => Math.abs(r.reduce((s, p, i) => { const q = r[(i + 1) % r.length]; return s + p[0] * q[1] - q[0] * p[1]; }, 0) / 2);

  /* Die Karte wird einmal gerechnet und dann behalten: Sie hängt nur an LAND, und das ändert sich
     nur, wenn jemand eine Welt anhängt. */
  let _karte = null;
  function karte() {
    if (_karte) return _karte;
    const ringe = kuestenLinien().sort((a, b) => flaeche(b) - flaeche(a));
    const inseln = [], seen = [];
    for (const r of ringe) (inseln.some(g => punktInRing(r[0], g)) ? seen : inseln).push(r);
    return (_karte = { inseln, seen });
  }

  /* ---------- Gelände ----------
     Je Biom: Welche Zeichen stehen dort und wie dicht. Die Plätze zieht ein Zufall mit festem
     Startwert – dieselbe Karte sieht auf jedem Gerät gleich aus – und jeder Platz muss weit genug
     im Land liegen, sonst stünde ein Baum mit den Füßen im Wasser. */
  const BIOME = {
    wiese:     { land: '#9ccf6a', zeichen: ['baum', 'baum', 'busch', 'huegel', 'baum', 'baum', 'busch'], dichte: 34 },
    werkland:  { land: '#c2b163', zeichen: ['haus', 'muehle', 'baum', 'huegel', 'busch', 'haus'], dichte: 26 },
    gebirge:   { land: '#b9c2cc', zeichen: ['berg', 'berg', 'gipfel', 'tanne', 'fels', 'tanne'], dichte: 26 },
    stadt:     { land: '#cbb88a', zeichen: ['haus', 'turm', 'haus', 'haus', 'busch', 'haus'], dichte: 32 },
    sturm:     { land: '#8fa3b8', zeichen: ['klippe', 'tanne', 'fels', 'wolke', 'tanne', 'klippe'], dichte: 26 },
    dschungel: { land: '#6ab455', zeichen: ['palme', 'baum', 'baum', 'tempel', 'baum', 'palme', 'busch'], dichte: 36 },
    moor:      { land: '#7d7a95', zeichen: ['totbaum', 'grab', 'totbaum', 'schilf', 'ruine', 'totbaum'], dichte: 28 },
    kueste:    { land: '#d8c98f', zeichen: ['palme', 'duene', 'palme', 'busch', 'duene', 'fels'], dichte: 22 },
  };

  /* ---------- Zeichenstift ----------
     Die Zeichen stehen in der Landschaft, sie liegen nicht darin: Jeder Baum, jeder Berg, jedes
     Haus wird von der Seite gezeigt, mit dem Fuß auf dem Punkt und dem Wipfel darüber – so, wie
     man eine Landkarte von Hand zeichnet. (Vorher waren es Kreise von oben; ein Baum sah aus wie
     eine Kugel auf einem Stock, ein Hügel wie ein Fleck.)

     Jedes Zeichen hat darum dreierlei: einen Umriss in Tinte, eine helle Sonnenseite und eine
     schraffierte Schattenseite. Das kostet ein paar Striche mehr, macht aber den Unterschied
     zwischen einer Karte und einem Grundriss. */
  const TINTE = '#38452f', STEIN = '#3f4a58';
  const TAU = Math.PI * 2;

  /* Ein gelappter Umriss: n Bogen um einen Mittelpunkt, jeder nach außen gewölbt. Daraus werden
     Laubkronen, Büsche und Wolken – lauter Dinge, die keine Kreise sind. */
  function lappen(x, y, r, n, bauch, ph, hoch = 0.82) {
    const pt = i => { const w = ph + i / n * TAU; return [x + Math.cos(w) * r, y + Math.sin(w) * r * hoch]; };
    let d = '';
    for (let i = 0; i < n; i++) {
      const p0 = pt(i), p1 = pt(i + 1), wm = ph + (i + 0.5) / n * TAU;
      const c = [x + Math.cos(wm) * r * bauch, y + Math.sin(wm) * r * hoch * bauch];
      d += (i ? '' : `M${p0[0].toFixed(2)} ${p0[1].toFixed(2)}`) +
        `Q${c[0].toFixed(2)} ${c[1].toFixed(2)} ${p1[0].toFixed(2)} ${p1[1].toFixed(2)}`;
    }
    return d + 'Z';
  }

  /* Schraffur: ein paar kurze Parallelstriche. Auf einer gestochenen Karte ist das die ganze
     Beleuchtung – eine Bergflanke wird nicht dunkler gefärbt, sie wird schraffiert. */
  const schraffur = (x, y, dx, dy, n, len, ink, breite) => {
    let d = '';
    for (let i = 0; i < n; i++)
      d += `M${(x + dx * i).toFixed(2)} ${(y + dy * i).toFixed(2)} l${(len * 0.5).toFixed(2)} ${len.toFixed(2)}`;
    return `<path d="${d}" stroke="${ink}" stroke-width="${breite.toFixed(3)}" fill="none" stroke-linecap="round" opacity="0.55"/>`;
  };

  const Z = {
    // Laubbaum: Stamm mit Wurzelanlauf, gelappte Krone, Schattenseite schraffiert
    baum: (x, y, s) => {
      const k = y - 1.5 * s, r = 1.15 * s;
      return `<path d="M${x - 0.32 * s} ${y} q${0.32 * s} ${-0.2 * s} ${0.32 * s} ${-1.05 * s} q0 ${-0.85 * s} ${0.32 * s} ${-1.05 * s}" fill="none" stroke="#6a4a2a" stroke-width="${0.26 * s}" stroke-linecap="round"/>
        <path d="${lappen(x, k, r, 7, 1.48, 0.6)}" fill="#79b65e" stroke="${TINTE}" stroke-width="${0.13 * s}" stroke-linejoin="round"/>
        <path d="${lappen(x - 0.22 * s, k - 0.26 * s, r * 0.55, 5, 1.5, 1.9)}" fill="#9ed37c" stroke="none"/>
        ${schraffur(x + 0.18 * s, k + 0.18 * s, 0.22 * s, -0.16 * s, 3, 0.34 * s, TINTE, 0.1 * s)}`;
    },
    // Nadelbaum: eine Zackenlinie, kein Stapel Dreiecke
    tanne: (x, y, s) => {
      const h = 3.1 * s, n = 4, li = [], re = [];
      for (let i = 1; i <= n; i++) {
        const t = i / n, yy = y - h + h * t, w = 1.02 * s * t;
        li.push([x - w * 0.42, yy - 0.26 * s], [x - w, yy]);
        re.push([x + w * 0.42, yy - 0.26 * s], [x + w, yy]);
      }
      const st = q => `L${q[0].toFixed(2)} ${q[1].toFixed(2)}`;
      const d = `M${x} ${(y - h).toFixed(2)}` + li.map(st).join('') +
        `L${(x - 0.15 * s).toFixed(2)} ${y}L${(x + 0.15 * s).toFixed(2)} ${y}` + re.reverse().map(st).join('') + 'Z';
      return `<path d="${d}" fill="#3c7a45" stroke="${TINTE}" stroke-width="${0.12 * s}" stroke-linejoin="round"/>
        <path d="M${x} ${(y - h + 0.2 * s).toFixed(2)} v${(h - 0.4 * s).toFixed(2)}" stroke="#2b5c33" stroke-width="${0.11 * s}" opacity="0.6"/>`;
    },
    busch: (x, y, s) => `<path d="${lappen(x, y - 0.45 * s, 0.72 * s, 5, 1.5, 0.3, 0.7)}" fill="#5f9e4e" stroke="${TINTE}" stroke-width="${0.11 * s}"/>
      <path d="M${x - 0.8 * s} ${y} h${1.6 * s}" stroke="${TINTE}" stroke-width="${0.1 * s}" opacity="0.4" stroke-linecap="round"/>`,
    // Hügel: zwei Kuppen hintereinander, die vordere mit schraffiertem Fuß
    huegel: (x, y, s) => `<path d="M${x - 0.4 * s} ${y} q${1.3 * s} ${-1.5 * s} ${2.6 * s} 0" fill="#a8c47c" stroke="${TINTE}" stroke-width="${0.11 * s}" stroke-linejoin="round"/>
      <path d="M${x - 2.2 * s} ${y} q${1.5 * s} ${-1.8 * s} ${3 * s} 0" fill="#bad48d" stroke="${TINTE}" stroke-width="${0.12 * s}" stroke-linejoin="round"/>
      ${schraffur(x - 0.5 * s, y - 0.3 * s, 0.3 * s, 0.08 * s, 3, 0.28 * s, TINTE, 0.09 * s)}`,
    // Gebirge: ein Rücken aus drei Zacken, nicht ein einzelnes Dreieck
    berg: (x, y, s) => {
      const H = 3.1 * s;
      const d = `M${x - 2.6 * s} ${y} L${x - 1.45 * s} ${y - H * 0.62} L${x - 0.75 * s} ${y - H * 0.33}
        L${x} ${y - H} L${x + 0.85 * s} ${y - H * 0.42} L${x + 1.4 * s} ${y - H * 0.68} L${x + 2.6 * s} ${y} Z`;
      return `<path d="${d}" fill="#9aa7b6" stroke="${STEIN}" stroke-width="${0.14 * s}" stroke-linejoin="round"/>
        <path d="M${x - 0.62 * s} ${y - H * 0.6} L${x} ${y - H} L${x + 0.55 * s} ${y - H * 0.62} L${x + 0.2 * s} ${y - H * 0.7} L${x - 0.16 * s} ${y - H * 0.62} Z" fill="#f6faff"/>
        <path d="M${x - 1.1 * s} ${y - H * 0.42} L${x - 1.45 * s} ${y - H * 0.62} L${x - 1.78 * s} ${y - H * 0.4} Z" fill="#eef4fb"/>
        <path d="M${x} ${y - H} L${x + 2.6 * s} ${y} L${x + 0.9 * s} ${y} Z" fill="${STEIN}" opacity="0.22"/>
        ${schraffur(x + 0.5 * s, y - H * 0.34, 0.26 * s, -0.16 * s, 4, 0.4 * s, STEIN, 0.1 * s)}`;
    },
    gipfel: (x, y, s) => {
      const H = 4.3 * s;
      return `<path d="M${x - 1.7 * s} ${y} L${x - 0.35 * s} ${y - H * 0.78} L${x} ${y - H} L${x + 0.6 * s} ${y - H * 0.6} L${x + 1.7 * s} ${y} Z"
          fill="#a4b1c0" stroke="${STEIN}" stroke-width="${0.14 * s}" stroke-linejoin="round"/>
        <path d="M${x - 0.62 * s} ${y - H * 0.52} L${x - 0.35 * s} ${y - H * 0.78} L${x} ${y - H} L${x + 0.32 * s} ${y - H * 0.78} L${x + 0.1 * s} ${y - H * 0.6} L${x - 0.2 * s} ${y - H * 0.66} Z" fill="#ffffff"/>
        <path d="M${x} ${y - H} L${x + 1.7 * s} ${y} L${x + 0.5 * s} ${y} Z" fill="${STEIN}" opacity="0.24"/>
        ${schraffur(x + 0.2 * s, y - H * 0.3, 0.24 * s, -0.12 * s, 3, 0.34 * s, STEIN, 0.1 * s)}`;
    },
    fels: (x, y, s) => `<path d="M${x - 1.2 * s} ${y} L${x - 0.9 * s} ${y - 1.1 * s} L${x - 0.1 * s} ${y - 1.5 * s} L${x + 0.8 * s} ${y - 0.9 * s} L${x + 1.2 * s} ${y} Z"
        fill="#95a0ad" stroke="${STEIN}" stroke-width="${0.13 * s}" stroke-linejoin="round"/>
      <path d="M${x - 0.1 * s} ${y - 1.5 * s} L${x + 1.2 * s} ${y} L${x + 0.35 * s} ${y} Z" fill="${STEIN}" opacity="0.22"/>`,
    klippe: (x, y, s) => `<path d="M${x - 1.8 * s} ${y} L${x - 1.5 * s} ${y - 2.3 * s} L${x - 0.3 * s} ${y - 1.8 * s} L${x + 0.5 * s} ${y - 2.7 * s} L${x + 1.2 * s} ${y - 2.1 * s} L${x + 1.8 * s} ${y} Z"
        fill="#7d8ea1" stroke="${STEIN}" stroke-width="${0.14 * s}" stroke-linejoin="round"/>
      <path d="M${x + 0.5 * s} ${y - 2.7 * s} L${x + 1.8 * s} ${y} L${x + 0.55 * s} ${y} Z" fill="${STEIN}" opacity="0.3"/>
      <g stroke="${STEIN}" stroke-width="${0.1 * s}" opacity="0.5">
        <path d="M${x - 0.9 * s} ${y - 1.8 * s} v${1.6 * s}"/><path d="M${x - 0.1 * s} ${y - 1.6 * s} v${1.4 * s}"/><path d="M${x + 0.8 * s} ${y - 1.9 * s} v${1.7 * s}"/></g>`,
    // Sturmgebiet: nicht die Wolke von oben, sondern Windschnörkel wie auf alten Seekarten
    wolke: (x, y, s) => `<g fill="none" stroke="#e6eefb" stroke-width="${0.16 * s}" stroke-linecap="round" opacity="0.8">
      <path d="M${x - 2.2 * s} ${y - 2 * s} q${1.4 * s} ${-0.9 * s} ${2.8 * s} 0 q${0.7 * s} ${0.45 * s} ${1.1 * s} ${-0.15 * s} a${0.42 * s} ${0.42 * s} 0 1 0 ${-0.5 * s} ${-0.55 * s}"/>
      <path d="M${x - 1.9 * s} ${y - 1.1 * s} q${1.2 * s} ${-0.7 * s} ${2.4 * s} 0"/></g>`,
    palme: (x, y, s) => `<path d="M${x} ${y} q${-0.5 * s} ${-1.3 * s} ${0.3 * s} ${-2.5 * s}" stroke="#8a6a3a" stroke-width="${0.28 * s}" fill="none" stroke-linecap="round"/>
      <g stroke="#6b5230" stroke-width="${0.09 * s}" opacity="0.7"><path d="M${x - 0.24 * s} ${y - 0.9 * s} h${0.4 * s}"/><path d="M${x - 0.1 * s} ${y - 1.7 * s} h${0.4 * s}"/></g>
      <g fill="#3f8f42" stroke="${TINTE}" stroke-width="${0.08 * s}">${[[-1.6, -0.2], [-1.0, -1.1], [0.2, -1.4], [1.0, -1.0], [1.6, -0.1]].map(([u, v]) =>
        `<path d="M${x + 0.3 * s} ${y - 2.5 * s} q${u * s} ${v * s} ${u * 1.45 * s} ${(v + 0.95) * s} q${-u * 0.35 * s} ${-0.85 * s} ${-u * 1.45 * s} ${-(v + 0.95) * s} Z"/>`).join('')}</g>`,
    duene: (x, y, s) => `<path d="M${x - 1.9 * s} ${y} q${1.9 * s} ${-1.2 * s} ${3.8 * s} 0 Z" fill="#e2cd93" stroke="#b89a56" stroke-width="${0.11 * s}"/>
      <path d="M${x - 1.1 * s} ${y - 0.45 * s} q${1.1 * s} ${-0.5 * s} ${2.1 * s} ${0.1 * s}" fill="none" stroke="#b89a56" stroke-width="${0.09 * s}" opacity="0.8"/>`,
    schilf: (x, y, s) => `<g stroke="#6f7a52" stroke-width="${0.11 * s}" fill="none" stroke-linecap="round">
      <path d="M${x - 0.4 * s} ${y} q${-0.1 * s} ${-0.9 * s} ${0.1 * s} ${-1.5 * s}"/><path d="M${x + 0.1 * s} ${y} v${-1.7 * s}"/><path d="M${x + 0.55 * s} ${y} q${0.15 * s} ${-0.8 * s} ${-0.02 * s} ${-1.3 * s}"/></g>
      <g fill="#7d6a3e"><ellipse cx="${x - 0.3 * s}" cy="${y - 1.6 * s}" rx="${0.11 * s}" ry="${0.26 * s}"/><ellipse cx="${x + 0.1 * s}" cy="${y - 1.8 * s}" rx="${0.11 * s}" ry="${0.28 * s}"/></g>`,
    anker: (x, y, s) => `<g stroke="#4a4a58" stroke-width="${0.24 * s}" fill="none" stroke-linecap="round">
      <path d="M${x} ${y - 2 * s} v${1.9 * s}"/><path d="M${x - 0.8 * s} ${y - 1.5 * s} h${1.6 * s}"/>
      <path d="M${x - 1.1 * s} ${y - 0.6 * s} q${1.1 * s} ${1.1 * s} ${2.2 * s} 0"/></g>`,
    // Haus von der Seite: Giebel, Tür, Schornstein
    haus: (x, y, s) => `<rect x="${x - 0.82 * s}" y="${y - 1.25 * s}" width="${1.64 * s}" height="${1.25 * s}" fill="#efe6ca" stroke="${TINTE}" stroke-width="${0.11 * s}"/>
      <path d="M${x + 0.35 * s} ${y - 2.05 * s} v${-0.6 * s} h${0.3 * s} v${0.78 * s} Z" fill="#9a8a6e" stroke="${TINTE}" stroke-width="${0.09 * s}"/>
      <path d="M${x - 1.15 * s} ${y - 1.25 * s} L${x} ${y - 2.35 * s} L${x + 1.15 * s} ${y - 1.25 * s} Z" fill="#b8543f" stroke="${TINTE}" stroke-width="${0.11 * s}" stroke-linejoin="round"/>
      <rect x="${x - 0.2 * s}" y="${y - 0.72 * s}" width="${0.4 * s}" height="${0.72 * s}" fill="#5a4630"/>`,
    turm: (x, y, s) => `<path d="M${x - 0.62 * s} ${y} v${-2.6 * s} h${1.24 * s} v${2.6 * s} Z" fill="#e7dcbd" stroke="${TINTE}" stroke-width="${0.11 * s}"/>
      <path d="M${x - 0.78 * s} ${y - 2.6 * s} h${0.3 * s} v${-0.32 * s} h${0.28 * s} v${0.32 * s} h${0.28 * s} v${-0.32 * s} h${0.28 * s} v${0.32 * s} h${0.3 * s}" fill="none" stroke="${TINTE}" stroke-width="${0.11 * s}"/>
      <path d="M${x - 0.78 * s} ${y - 2.6 * s} L${x} ${y - 4.3 * s} L${x + 0.78 * s} ${y - 2.6 * s} Z" fill="#7a6ca8" stroke="${TINTE}" stroke-width="${0.1 * s}" stroke-linejoin="round"/>
      <path d="M${x} ${y - 4.3 * s} l${1 * s} ${0.35 * s} l${-1 * s} ${0.35 * s} Z" fill="#c0524a"/>
      <rect x="${x - 0.16 * s}" y="${y - 1.9 * s}" width="${0.32 * s}" height="${0.48 * s}" fill="#4a3c2a"/>`,
    muehle: (x, y, s) => `<path d="M${x - 0.85 * s} ${y} L${x - 0.5 * s} ${y - 2.2 * s} L${x + 0.5 * s} ${y - 2.2 * s} L${x + 0.85 * s} ${y} Z" fill="#e7dcbd" stroke="${TINTE}" stroke-width="${0.11 * s}" stroke-linejoin="round"/>
      <path d="M${x - 0.6 * s} ${y - 2.2 * s} q${0.6 * s} ${-0.5 * s} ${1.2 * s} 0 Z" fill="#8d6a45" stroke="${TINTE}" stroke-width="${0.1 * s}"/>
      <g stroke="#6b5433" stroke-width="${0.2 * s}" stroke-linecap="round"><path d="M${x} ${y - 2.5 * s} l${1.5 * s} ${-1 * s}"/><path d="M${x} ${y - 2.5 * s} l${-1.5 * s} ${1 * s}"/>
      <path d="M${x} ${y - 2.5 * s} l${1 * s} ${1.5 * s}"/><path d="M${x} ${y - 2.5 * s} l${-1 * s} ${-1.5 * s}"/></g>`,
    tempel: (x, y, s) => `<path d="M${x - 2.1 * s} ${y} L${x - 1.35 * s} ${y - 2.7 * s} L${x + 1.35 * s} ${y - 2.7 * s} L${x + 2.1 * s} ${y} Z" fill="#ded0aa" stroke="${TINTE}" stroke-width="${0.12 * s}" stroke-linejoin="round"/>
      <g stroke="${TINTE}" stroke-width="${0.09 * s}" opacity="0.55"><path d="M${x - 1.75 * s} ${y - 1.35 * s} h${3.5 * s}"/><path d="M${x - 1.55 * s} ${y - 2.05 * s} h${3.1 * s}"/></g>
      <path d="M${x - 0.42 * s} ${y} v${-1.3 * s} h${0.84 * s} v${1.3 * s} Z" fill="#3a3020"/>
      <path d="M${x + 1.35 * s} ${y - 2.7 * s} L${x + 2.1 * s} ${y} L${x + 0.9 * s} ${y} Z" fill="${TINTE}" opacity="0.18"/>`,
    totbaum: (x, y, s) => `<g stroke="#4a4258" stroke-width="${0.22 * s}" fill="none" stroke-linecap="round">
      <path d="M${x} ${y} v${-2.3 * s}"/><path d="M${x} ${y - 1.3 * s} q${-0.5 * s} ${-0.3 * s} ${-1 * s} ${-0.9 * s}"/>
      <path d="M${x} ${y - 1.75 * s} q${0.5 * s} ${-0.25 * s} ${0.9 * s} ${-0.95 * s}"/><path d="M${x} ${y - 2.3 * s} l${-0.5 * s} ${-0.6 * s}"/><path d="M${x} ${y - 2.3 * s} l${0.45 * s} ${-0.5 * s}"/></g>`,
    grab: (x, y, s) => `<path d="M${x - 0.58 * s} ${y} v${-1.1 * s} a${0.58 * s} ${0.58 * s} 0 0 1 ${1.16 * s} 0 v${1.1 * s} Z" fill="#b4adc6" stroke="#4a4258" stroke-width="${0.1 * s}"/>
      <path d="M${x - 0.26 * s} ${y - 1.25 * s} h${0.52 * s} M${x} ${y - 1.5 * s} v${0.75 * s}" stroke="#4a4258" stroke-width="${0.1 * s}"/>
      <path d="M${x + 0.75 * s} ${y} v${-0.75 * s} a${0.36 * s} ${0.36 * s} 0 0 1 ${0.72 * s} 0 v${0.75 * s} Z" fill="#9a94ae" stroke="#4a4258" stroke-width="${0.09 * s}"/>`,
    ruine: (x, y, s) => `<g fill="#b8b0c4" stroke="#4a4258" stroke-width="${0.11 * s}" stroke-linejoin="round">
      <path d="M${x - 1.3 * s} ${y} v${-1.9 * s} l${0.3 * s} ${0.45 * s} v${-0.7 * s} h${0.55 * s} v${2.15 * s} Z"/>
      <path d="M${x + 0.5 * s} ${y} v${-2.4 * s} h${0.6 * s} l${0.2 * s} ${0.5 * s} v${1.9 * s} Z"/></g>
      <path d="M${x - 0.45 * s} ${y - 2.1 * s} q${0.9 * s} ${-0.7 * s} ${1.05 * s} ${0.1 * s}" fill="none" stroke="#4a4258" stroke-width="${0.12 * s}"/>`,
  };

  /* Geländezeichen eines Landstücks: Plätze im Kreis ziehen, die zu nah am Wasser oder zu nah
     beieinander liegen verwerfen, dann von hinten nach vorn zeichnen – sonst steht ein ferner Berg
     vor einem nahen Baum. */
  function gelaende(l) {
    const B = BIOME[l.biom];
    if (!B) return '';
    const rnd = seededRandom(Math.round(l.x * 131 + l.y * 977 + l.r * 17));
    const gesetzt = [], teile = [];
    for (let i = 0; i < B.dichte * 14 && gesetzt.length < B.dichte; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * l.r * 0.82;
      const x = l.x + Math.cos(a) * d, y = l.y + Math.sin(a) * d;
      if (feld(x, y) < WASSER * 1.4) continue;                       // zu dicht am Ufer
      if (gesetzt.some(g => Math.hypot(g[0] - x, g[1] - y) < 2.1)) continue;
      gesetzt.push([x, y, B.zeichen[Math.floor(rnd() * B.zeichen.length)], 0.82 + rnd() * 0.5]);
    }
    gesetzt.sort((a, b) => a[1] - b[1]);
    for (const [x, y, art, s] of gesetzt) teile.push(Z[art](+x.toFixed(2), +y.toFixed(2), +s.toFixed(2)));
    return teile.join('');
  }

  /* ---------- Flüsse ----------
     Ein Fluss läuft vom Gebirge bergab und hört auf, wo er das Meer erreicht. „Bergab“ heißt hier:
     dorthin, wo das Feld kleiner wird – der Fluss sucht sich seinen Weg aus derselben Landschaft,
     aus der auch die Küste kommt. */
  function fluss(x, y, richtung, schritte = 60) {
    const p = [[x, y]];
    let a = richtung;
    for (let i = 0; i < schritte; i++) {
      // in drei Richtungen schnuppern und die nehmen, wo es am stärksten bergab geht
      let best = a, bw = Infinity;
      for (const da of [-0.5, -0.22, 0, 0.22, 0.5]) {
        const w = feld(x + Math.cos(a + da) * 1.6, y + Math.sin(a + da) * 1.6);
        if (w < bw) { bw = w; best = a + da; }
      }
      a = a * 0.65 + best * 0.35;
      x += Math.cos(a) * 1.6; y += Math.sin(a) * 1.6;
      p.push([x, y]);
      if (feld(x, y) < WASSER) break;
    }
    return 'M' + p.map(q => `${q[0].toFixed(2)} ${q[1].toFixed(2)}`).join(' L');
  }

  /* ---------- Öffentliches ---------- */
  const welten = LAND.filter(l => l.id);
  const spots = {};
  for (const l of welten) spots[l.id] = { x: l.x, y: +(l.y / HOEHE * 100).toFixed(2), icon: l.marke, col: l.farbe };

  /* Die Reise in der Reihenfolge der Welten. Ein Stück, das über Wasser führt, wird zur Seeroute –
     das entscheidet die Karte selbst, nicht eine Liste: Sie tastet die Strecke ab. */
  const REISE = ['normal', 'sea', 'pro', 'snow', 'jungle', 'storm', 'shadow', 'clock'];
  function wege() {
    const land = [], see = [];
    for (let i = 0; i < REISE.length - 1; i++) {
      const a = LAND.find(l => l.id === REISE[i]), b = LAND.find(l => l.id === REISE[i + 1]);
      if (!a || !b) continue;
      let ueberWasser = false;
      for (let t = 0.1; t < 0.95; t += 0.05)
        if (feld(a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t) < WASSER) { ueberWasser = true; break; }
      // leichter Bogen, damit die Straße nicht schnurgerade läuft
      const mx = (a.x + b.x) / 2 + (b.y - a.y) * 0.09, my = (a.y + b.y) / 2 - (b.x - a.x) * 0.09;
      (ueberWasser ? see : land).push(`M${a.x} ${a.y} Q${mx.toFixed(1)} ${my.toFixed(1)} ${b.x} ${b.y}`);
    }
    return { land, see };
  }

  function svg(cls = 'atlas-bg', par = 'none') {
    const { inseln, seen } = karte();
    const kuesten = inseln.map(pfad).join(' ');
    const seenPfad = seen.map(pfad).join(' ');
    const w = wege();
    const rnd = seededRandom(20260912);

    // Wellenstriche auf dem Meer, nur dort, wo wirklich Wasser ist
    const wellen = [];
    for (let i = 0; i < 260; i++) {
      const x = rnd() * BREITE, y = rnd() * HOEHE;
      if (feld(x, y) > WASSER * 0.55) continue;
      const s = 0.7 + rnd() * 0.9;
      wellen.push(`<path d="M${x.toFixed(1)} ${y.toFixed(1)} q${(s / 2).toFixed(2)} -0.5 ${s.toFixed(2)} 0"/>`);
    }
    // Gradnetz über die ganze Karte, alle zehn Einheiten
    let gradnetz = '';
    for (let x = 10; x < BREITE; x += 10) gradnetz += `<path d="M${x} 0 v${HOEHE}"/>`;
    for (let y = 10; y < HOEHE; y += 10) gradnetz += `<path d="M0 ${y} h${BREITE}"/>`;

    // Schiffe auf See
    const schiffe = [[9, 20], [92, 12], [34, 57], [70, 60]].map(([x, y]) =>
      `<g opacity="0.8"><path d="M${x - 1.3} ${y} q${1.3} 1 ${2.6} 0 Z" fill="#7a5a3a"/>
        <path d="M${x} ${y - 0.2} v-2.2" stroke="#7a5a3a" stroke-width="0.18"/>
        <path d="M${x + 0.06} ${y - 2.3} l1.5 1 l-1.5 0.6 Z" fill="#f2ead6"/></g>`).join('');

    return `<svg class="${cls}" viewBox="0 0 ${BREITE} ${HOEHE}" preserveAspectRatio="${par}" aria-hidden="true">
      <defs>
        <linearGradient id="wmMeer" x1="0" y1="0" x2="0.4" y2="1">
          <stop offset="0" stop-color="#2d6f8e"/><stop offset="0.5" stop-color="#20566f"/><stop offset="1" stop-color="#17415a"/></linearGradient>
        <linearGradient id="wmLand" x1="0" y1="0" x2="0.3" y2="1">
          <stop offset="0" stop-color="#e8dcae"/><stop offset="1" stop-color="#d2c48c"/></linearGradient>
        <radialGradient id="wmVig" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.6" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(10,20,30,0.5)"/></radialGradient>
        <filter id="wmWeich" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.6"/></filter>
        <filter id="wmTief" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="0.5" dy="0.9" stdDeviation="0.7" flood-color="#0b2230" flood-opacity="0.45"/></filter>
        <clipPath id="wmLandClip"><path d="${kuesten}" fill-rule="evenodd"/></clipPath>
        ${welten.map(l => `<radialGradient id="wmB${l.id}" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="${BIOME[l.biom].land}" stop-opacity="0.72"/>
          <stop offset="1" stop-color="${BIOME[l.biom].land}" stop-opacity="0"/></radialGradient>`).join('')}
      </defs>

      <rect width="${BREITE}" height="${HOEHE}" fill="url(#wmMeer)"/>
      <g stroke="rgba(210,232,242,0.1)" stroke-width="0.12" fill="none">${gradnetz}</g>
      <g stroke="rgba(190,225,240,0.42)" stroke-width="0.13" fill="none" stroke-linecap="round">${wellen.join('')}</g>

      <!-- Flachwasser: dieselbe Küste sechsmal gestrichelt, jedes Mal schmaler. Weil breite
           Striche unter schmalen liegen, entstehen daraus Stufen – die Tiefenlinien einer Seekarte,
           nicht ein weicher Schein. -->
      <g fill="none" stroke-linejoin="round" stroke="rgba(176,222,238,0.15)">
        ${[8.4, 6.6, 5, 3.6, 2.4, 1.4].map(b => `<path d="${kuesten}" stroke-width="${b}"/>`).join('')}
      </g>
      ${schiffe}

      <!-- Land -->
      <g filter="url(#wmTief)"><path d="${kuesten}" fill="url(#wmLand)" fill-rule="evenodd"/></g>
      <g clip-path="url(#wmLandClip)">
        ${welten.map(l => `<circle cx="${l.x}" cy="${l.y}" r="${(l.r * 0.95).toFixed(1)}" fill="url(#wmB${l.id})"/>`).join('')}
        <path d="${kuesten}" fill="none" stroke="#f0e6b8" stroke-width="1.7" opacity="0.85"/>
        <path d="${kuesten}" fill="none" stroke="rgba(150,140,80,0.2)" stroke-width="3.6"/>
        ${gradnetz ? `<g stroke="rgba(90,78,44,0.13)" stroke-width="0.12" fill="none">${gradnetz}</g>` : ''}
      </g>
      <path d="${kuesten}" fill="none" stroke="#4d4a2c" stroke-width="0.4" fill-rule="evenodd"/>

      <!-- Binnenseen -->
      ${seenPfad ? `<path d="${seenPfad}" fill="#2f7f9a"/><path d="${seenPfad}" fill="none" stroke="#3f5a48" stroke-width="0.28"/>` : ''}

      <!-- Flüsse: aus dem Gebirge hinunter -->
      <g fill="none" stroke="#4f97b4" stroke-width="0.5" stroke-linecap="round" opacity="0.9">
        <path d="${fluss(58, 18, 1.9)}"/><path d="${fluss(64, 17, 2.6)}"/><path d="${fluss(30, 33, 1.4)}"/></g>

      <!-- Reisewege -->
      <g fill="none" stroke-linecap="round">
        ${w.land.map(d => `<path d="${d}" stroke="rgba(60,42,22,0.45)" stroke-width="1.3"/>`).join('')}
        ${w.land.map(d => `<path d="${d}" stroke="#f7ecd0" stroke-width="0.5" stroke-dasharray="1.5 1.1"/>`).join('')}
        ${w.see.map(d => `<path d="${d}" stroke="rgba(235,248,255,0.7)" stroke-width="0.42" stroke-dasharray="0.5 1.4"/>`).join('')}
      </g>

      <!-- Gelände -->
      <g clip-path="url(#wmLandClip)">${LAND.map(gelaende).join('')}</g>

      <!-- Namen -->
      <g class="wm-name" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-style="italic">
        ${welten.map(l => `<text x="${l.nameAn ? l.nameAn[0] : l.x}" y="${l.nameAn ? l.nameAn[1] : (l.y + l.r * 0.62).toFixed(1)}" font-size="2.5"
          stroke="rgba(255,250,230,0.85)" stroke-width="0.9" paint-order="stroke" fill="#3a3524" letter-spacing="0.35">${l.name}</text>`).join('')}
      </g>

      <!-- Windrose auf freiem Meer -->
      <g transform="translate(93,9)" opacity="0.85">
        <circle r="4.2" fill="rgba(245,238,214,0.16)" stroke="rgba(245,238,214,0.5)" stroke-width="0.2"/>
        <path d="M0 -4 L1 0 L0 4 L-1 0 Z" fill="#f2ead2"/><path d="M-4 0 L0 -1 L4 0 L0 1 Z" fill="rgba(242,234,210,0.6)"/>
        <text y="-4.6" text-anchor="middle" font-size="1.8" fill="#f2ead2" font-family="Georgia, serif">N</text>
      </g>
      <rect width="${BREITE}" height="${HOEHE}" fill="url(#wmVig)"/>
    </svg>`;
  }

  return { spots, svg, BREITE, LAND };
})();
