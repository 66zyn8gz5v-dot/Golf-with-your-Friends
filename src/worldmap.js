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
    { x: 37, y: 36, r: 11 },                                   // Hügelland zwischen Wiese und Süden
    { id: 'pro', name: 'Tüftlerreich', x: 45, y: 22, r: 13, biom: 'werkland', marke: '⚙️', farbe: '#e0a05a' },
    { id: 'snow', name: 'Schneeberg', x: 60, y: 14, r: 14, biom: 'gebirge', marke: '🏔️', farbe: '#bfe6ff' },
    { id: 'clock', name: 'Uhrwerkstadt', x: 75, y: 21, r: 13, biom: 'stadt', marke: '🕰️', farbe: '#ffc46b' },
    { x: 66, y: 30, r: 10 },                                   // Talsenke unter dem Gebirge
    { id: 'storm', name: 'Sturmhimmel', x: 84, y: 38, r: 13, biom: 'sturm', marke: '⛈️', farbe: '#8fb8ff' },
    { x: 47, y: 41, r: 10 },                                   // Landbrücke in den Süden
    { id: 'jungle', name: 'Dschungeltempel', x: 57, y: 45, r: 14, biom: 'dschungel', marke: '🗿', farbe: '#9ee06f' },
    { id: 'shadow', name: 'Schattenreich', x: 80, y: 49, r: 13, biom: 'moor', marke: '🔮', farbe: '#c58bff' },
    // ---- Nebeninsel im Südwesten: weit genug weg, damit sie eine eigene Insel bleibt
    { id: 'sea', name: 'Meereswelt', x: 14, y: 50, r: 11, biom: 'kueste', marke: '🌊', farbe: '#7fd8ff' },
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
  const feld = (x, y) => {
    let s = 0;
    for (const l of LAND) {
      const dx = x - l.x, dy = y - l.y, q = (dx * dx + dy * dy) / (l.r * l.r);
      if (q < 1) { const u = 1 - q; s += u * u * u; }
    }
    return s;
  };

  /* Marching Squares: Das Gitter wird Zelle für Zelle abgelaufen; je nachdem, welche Ecken über
     dem Wasser liegen, entsteht ein Stück Küstenlinie. Der Schnittpunkt wird zwischen den Ecken
     linear eingepasst, sonst sähe die Küste aus wie eine Treppe. */
  function kuestenLinien() {
    const S = 0.7, NX = Math.ceil(BREITE / S) + 2, NY = Math.ceil(HOEHE / S) + 2;
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
      if (ring.length > 12) ringe.push(ring);
    }
    return ringe.map(r => weich(weich(r)));
  }

  /* Chaikin: Jede Ecke wird durch zwei Punkte auf ihren Schenkeln ersetzt. Zweimal angewandt wird
     aus dem Zackenzug eine Küste, die aussieht, als hätte sie jemand gezogen. */
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
    wiese:     { land: '#9ccf6a', zeichen: ['baum', 'baum', 'busch', 'huegel', 'baum'], dichte: 18 },
    werkland:  { land: '#c2b163', zeichen: ['haus', 'muehle', 'baum', 'huegel'], dichte: 14 },
    gebirge:   { land: '#b9c2cc', zeichen: ['berg', 'berg', 'gipfel', 'tanne'], dichte: 15 },
    stadt:     { land: '#cbb88a', zeichen: ['haus', 'turm', 'haus', 'haus'], dichte: 17 },
    sturm:     { land: '#8fa3b8', zeichen: ['klippe', 'tanne', 'klippe', 'wolke'], dichte: 15 },
    dschungel: { land: '#6ab455', zeichen: ['palme', 'baum', 'baum', 'tempel', 'baum', 'palme'], dichte: 20 },
    moor:      { land: '#7d7a95', zeichen: ['totbaum', 'grab', 'totbaum', 'busch'], dichte: 16 },
    kueste:    { land: '#d8c98f', zeichen: ['palme', 'duene', 'palme', 'busch', 'duene'], dichte: 14 },
  };

  /* ---------- Zeichenstift ----------
     Alles bewusst klein und flach gehalten: Eine Landkarte zeigt an, was wo ist, sie malt es nicht
     aus. Ein Baum sind zwei Striche, ein Gebirge ein Dreieck mit Schneekappe. */
  const Z = {
    baum: (x, y, s) => `<path d="M${x} ${y} v${-1.1 * s}" stroke="#6b4a28" stroke-width="${0.3 * s}" stroke-linecap="round"/>
      <circle cx="${x}" cy="${y - 1.5 * s}" r="${1.05 * s}" fill="#3f7f39"/><circle cx="${x - 0.35 * s}" cy="${y - 1.75 * s}" r="${0.62 * s}" fill="#58a04c"/>`,
    tanne: (x, y, s) => `<path d="M${x} ${y} v${-0.8 * s}" stroke="#5a3f22" stroke-width="${0.26 * s}"/>
      <path d="M${x} ${y - 2.7 * s} L${x + 0.95 * s} ${y - 0.7 * s} L${x - 0.95 * s} ${y - 0.7 * s} Z" fill="#2f6a3c"/>
      <path d="M${x} ${y - 3.3 * s} L${x + 0.68 * s} ${y - 1.7 * s} L${x - 0.68 * s} ${y - 1.7 * s} Z" fill="#3d7f48"/>`,
    busch: (x, y, s) => `<circle cx="${x}" cy="${y - 0.4 * s}" r="${0.62 * s}" fill="#4f8f45"/><circle cx="${x + 0.5 * s}" cy="${y - 0.2 * s}" r="${0.44 * s}" fill="#3f7f39"/>`,
    huegel: (x, y, s) => `<path d="M${x - 1.6 * s} ${y} q${1.6 * s} ${-1.5 * s} ${3.2 * s} 0 Z" fill="rgba(90,130,60,0.5)"/>`,
    berg: (x, y, s) => `<path d="M${x - 2.1 * s} ${y} L${x} ${y - 3.2 * s} L${x + 2.1 * s} ${y} Z" fill="#8d99a8"/>
      <path d="M${x - 0.95 * s} ${y - 1.45 * s} L${x} ${y - 3.2 * s} L${x + 0.95 * s} ${y - 1.45 * s} L${x + 0.3 * s} ${y - 1.9 * s} L${x - 0.2 * s} ${y - 1.5 * s} Z" fill="#f2f7ff"/>
      <path d="M${x} ${y - 3.2 * s} L${x + 2.1 * s} ${y} L${x + 0.7 * s} ${y} Z" fill="rgba(40,52,68,0.28)"/>`,
    gipfel: (x, y, s) => `<path d="M${x - 1.5 * s} ${y} L${x} ${y - 4.2 * s} L${x + 1.5 * s} ${y} Z" fill="#9aa6b4"/>
      <path d="M${x - 0.72 * s} ${y - 2 * s} L${x} ${y - 4.2 * s} L${x + 0.72 * s} ${y - 2 * s} L${x + 0.2 * s} ${y - 2.5 * s} Z" fill="#ffffff"/>`,
    klippe: (x, y, s) => `<path d="M${x - 1.7 * s} ${y} L${x - 1.1 * s} ${y - 2.2 * s} L${x + 0.2 * s} ${y - 1.7 * s} L${x + 1.1 * s} ${y - 2.6 * s} L${x + 1.7 * s} ${y} Z" fill="#6f8296"/>
      <path d="M${x + 0.2 * s} ${y - 1.7 * s} L${x + 1.1 * s} ${y - 2.6 * s} L${x + 1.7 * s} ${y} Z" fill="rgba(30,40,55,0.3)"/>`,
    wolke: (x, y, s) => `<g opacity="0.75"><ellipse cx="${x}" cy="${y - 2.4 * s}" rx="${1.9 * s}" ry="${0.8 * s}" fill="#e8eefa"/>
      <ellipse cx="${x - 0.9 * s}" cy="${y - 2.8 * s}" rx="${1.1 * s}" ry="${0.62 * s}" fill="#f4f8ff"/></g>`,
    palme: (x, y, s) => `<path d="M${x} ${y} q${-0.4 * s} ${-1.4 * s} ${0.25 * s} ${-2.5 * s}" stroke="#8a6a3a" stroke-width="${0.3 * s}" fill="none" stroke-linecap="round"/>
      <g fill="#3f8f42">${[[-1.5, -0.3], [-0.9, -1.1], [0.9, -1.1], [1.5, -0.3]].map(([a, b]) =>
        `<path d="M${x + 0.25 * s} ${y - 2.5 * s} q${a * s} ${b * s} ${a * 1.5 * s} ${(b + 0.9) * s} q${-a * 0.4 * s} ${-0.8 * s} ${-a * 1.5 * s} ${-(b + 0.9) * s} Z"/>`).join('')}</g>`,
    duene: (x, y, s) => `<path d="M${x - 1.8 * s} ${y} q${1.8 * s} ${-1.1 * s} ${3.6 * s} 0" fill="none" stroke="#c9a85e" stroke-width="${0.3 * s}" stroke-linecap="round"/>`,
    anker: (x, y, s) => `<g stroke="#4a4a58" stroke-width="${0.26 * s}" fill="none" stroke-linecap="round">
      <path d="M${x} ${y - 2 * s} v${1.9 * s}"/><path d="M${x - 0.8 * s} ${y - 1.5 * s} h${1.6 * s}"/>
      <path d="M${x - 1.1 * s} ${y - 0.6 * s} q${1.1 * s} ${1.1 * s} ${2.2 * s} 0"/></g>`,
    haus: (x, y, s) => `<rect x="${x - 0.85 * s}" y="${y - 1.3 * s}" width="${1.7 * s}" height="${1.3 * s}" fill="#e6dcc2"/>
      <path d="M${x - 1.15 * s} ${y - 1.3 * s} L${x} ${y - 2.4 * s} L${x + 1.15 * s} ${y - 1.3 * s} Z" fill="#b4503f"/>`,
    turm: (x, y, s) => `<rect x="${x - 0.6 * s}" y="${y - 2.8 * s}" width="${1.2 * s}" height="${2.8 * s}" fill="#ded2b6"/>
      <path d="M${x - 0.9 * s} ${y - 2.8 * s} L${x} ${y - 4.4 * s} L${x + 0.9 * s} ${y - 2.8 * s} Z" fill="#7a6ca8"/>`,
    muehle: (x, y, s) => `<path d="M${x - 0.8 * s} ${y} L${x - 0.5 * s} ${y - 2.2 * s} L${x + 0.5 * s} ${y - 2.2 * s} L${x + 0.8 * s} ${y} Z" fill="#e0d4b4"/>
      <g stroke="#6b5433" stroke-width="${0.22 * s}" stroke-linecap="round"><path d="M${x} ${y - 2.4 * s} l${1.5 * s} ${-1 * s}"/><path d="M${x} ${y - 2.4 * s} l${-1.5 * s} ${1 * s}"/>
      <path d="M${x} ${y - 2.4 * s} l${1 * s} ${1.5 * s}"/><path d="M${x} ${y - 2.4 * s} l${-1 * s} ${-1.5 * s}"/></g>`,
    tempel: (x, y, s) => `<path d="M${x - 2 * s} ${y} L${x - 1.3 * s} ${y - 2.6 * s} L${x + 1.3 * s} ${y - 2.6 * s} L${x + 2 * s} ${y} Z" fill="#d8c8a2"/>
      <rect x="${x - 0.4 * s}" y="${y - 1.2 * s}" width="${0.8 * s}" height="${1.2 * s}" fill="#3a3020"/>`,
    totbaum: (x, y, s) => `<g stroke="#4a4258" stroke-width="${0.26 * s}" fill="none" stroke-linecap="round">
      <path d="M${x} ${y} v${-2.2 * s}"/><path d="M${x} ${y - 1.4 * s} l${-0.9 * s} ${-0.7 * s}"/><path d="M${x} ${y - 1.8 * s} l${0.8 * s} ${-0.8 * s}"/></g>`,
    grab: (x, y, s) => `<path d="M${x - 0.6 * s} ${y} v${-1.1 * s} a${0.6 * s} ${0.6 * s} 0 0 1 ${1.2 * s} 0 v${1.1 * s} Z" fill="#a9a2bc"/>`,
  };

  /* Geländezeichen eines Landstücks: Plätze im Kreis ziehen, die zu nah am Wasser oder zu nah
     beieinander liegen verwerfen, dann von hinten nach vorn zeichnen – sonst steht ein ferner Berg
     vor einem nahen Baum. */
  function gelaende(l) {
    const B = BIOME[l.biom];
    if (!B) return '';
    const rnd = seededRandom(Math.round(l.x * 131 + l.y * 977 + l.r * 17));
    const gesetzt = [], teile = [];
    for (let i = 0; i < B.dichte * 8 && gesetzt.length < B.dichte; i++) {
      const a = rnd() * Math.PI * 2, d = Math.sqrt(rnd()) * l.r * 0.66;
      const x = l.x + Math.cos(a) * d, y = l.y + Math.sin(a) * d;
      if (feld(x, y) < WASSER * 1.5) continue;                       // zu dicht am Ufer
      if (gesetzt.some(g => Math.hypot(g[0] - x, g[1] - y) < 2.5)) continue;
      gesetzt.push([x, y, B.zeichen[Math.floor(rnd() * B.zeichen.length)], 0.62 + rnd() * 0.34]);
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
          <stop offset="0" stop-color="#cfd79a"/><stop offset="1" stop-color="#a8bd78"/></linearGradient>
        <radialGradient id="wmVig" cx="0.5" cy="0.5" r="0.75">
          <stop offset="0.6" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(10,20,30,0.5)"/></radialGradient>
        <filter id="wmWeich" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.6"/></filter>
        <filter id="wmTief" x="-30%" y="-30%" width="170%" height="170%">
          <feDropShadow dx="0.5" dy="0.9" stdDeviation="0.7" flood-color="#0b2230" flood-opacity="0.45"/></filter>
        <clipPath id="wmLandClip"><path d="${kuesten}" fill-rule="evenodd"/></clipPath>
        ${welten.map(l => `<radialGradient id="wmB${l.id}" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="${BIOME[l.biom].land}" stop-opacity="0.95"/>
          <stop offset="1" stop-color="${BIOME[l.biom].land}" stop-opacity="0"/></radialGradient>`).join('')}
      </defs>

      <rect width="${BREITE}" height="${HOEHE}" fill="url(#wmMeer)"/>
      <g stroke="rgba(190,225,240,0.5)" stroke-width="0.13" fill="none" stroke-linecap="round">${wellen.join('')}</g>

      <!-- Flachwasser: dieselbe Küste mehrfach breit gestrichelt, von außen nach innen heller -->
      <g fill="none" stroke-linejoin="round">
        <path d="${kuesten}" stroke="rgba(140,205,225,0.16)" stroke-width="7"/>
        <path d="${kuesten}" stroke="rgba(160,220,235,0.2)" stroke-width="4.2"/>
        <path d="${kuesten}" stroke="rgba(190,235,245,0.26)" stroke-width="2"/>
      </g>
      ${schiffe}

      <!-- Land -->
      <g filter="url(#wmTief)"><path d="${kuesten}" fill="url(#wmLand)" fill-rule="evenodd"/></g>
      <g clip-path="url(#wmLandClip)">
        ${welten.map(l => `<circle cx="${l.x}" cy="${l.y}" r="${(l.r * 0.95).toFixed(1)}" fill="url(#wmB${l.id})"/>`).join('')}
        <path d="${kuesten}" fill="none" stroke="#e8dfae" stroke-width="1.6" opacity="0.8"/>
        <path d="${kuesten}" fill="none" stroke="rgba(120,150,90,0.25)" stroke-width="3.4"/>
      </g>
      <path d="${kuesten}" fill="none" stroke="#3f5a48" stroke-width="0.34" fill-rule="evenodd"/>

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
        ${welten.map(l => `<text x="${l.x}" y="${(l.y + l.r * 0.62).toFixed(1)}" font-size="2.5"
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
