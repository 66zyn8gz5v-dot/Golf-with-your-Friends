/* Aus einer Bahnbeschreibung wird eine Landschaft.

   Hier läuft alles zusammen: das Textfeld mit den Spielfeldern, die Hügelliste, die Bauteile aus
   deko3d.js und der Zeichner. Heraus kommt ein Gebilde, das zwei Dinge kann – sich zeichnen und
   Fragen beantworten: Wie hoch ist der Boden hier? Wie ist er geneigt? Was für ein Untergrund ist
   das? Die Kugelrechnung in physik3d.js fragt nur diese drei Dinge; sie weiß nichts von Karten
   und Hügeln, und genau deshalb bleibt sie kurz.

   ---- Wie die Landschaft entsteht ----

   **Die Höhe ist eine Formel, keine Tabelle.** Grundhöhe, plus für jeden Hügel eine Glocke, plus
   ein feines Rauschen, minus zwei Absenkungen: eine am Rand der Bahn (damit die Spielfläche als
   Terrasse in der Wiese liegt und nicht als aufgeklebtes Rechteck) und eine im Wasser (damit der
   Bach ein Bett hat). Eine Formel hat einen großen Vorteil gegenüber einer Tabelle: Man kann sie
   an jeder beliebigen Stelle fragen, nicht nur an den Gitterpunkten – und der Ball rollt nun
   einmal nicht auf Gitterpunkten.

   **Die beiden Absenkungen kommen aus einem Abstandsfeld.** Für jedes Feld wird einmal
   ausgerechnet, wie weit es von der nächsten Spielfläche entfernt ist (und wie weit vom nächsten
   trockenen Feld). Dazwischen wird weich abgelesen. Das ist derselbe Gedanke wie bei der
   gerechneten Küste der 2,5D-Weltkarte: Man sagt, wo etwas liegt, und die Form folgt daraus.

   **Felsen sind keine Höhe, sondern Klötze.** Ein Fels im Höhenfeld wäre eine senkrechte Wand in
   einer Formel – dort ist die Neigung unendlich, und die Kugelrechnung bekäme Unsinn zu essen.
   Darum steht jeder Fels als eigener Klotz daneben, und der Ball prallt an seinen vier Seiten ab
   wie an einer Bande. Das rollt sauber und sieht genauso aus. */
const Welt3D = (() => {

  /* ---------- Untergründe ----------
     Zwei Zahlen bremsen den Ball, und beide braucht es:

     'zaeh' wirkt mit der Geschwindigkeit – ein schneller Ball verliert viel, ein langsamer wenig.
     Das gibt den langen, weich auslaufenden Roll, den man vom Golf kennt.

     'reibung' wirkt gleichmäßig, egal wie schnell. Sie bringt den Ball am Ende wirklich zum
     Stehen – mit 'zaeh' allein würde er unendlich lange immer langsamer werden.

     'haft' ist die Haftreibung: Bis zu diesem Wert hält ein liegender Ball einem Hang stand. Sie
     ist deutlich größer als 'reibung', und genau so ist es auch in Wirklichkeit – ein Ball, der
     auf einem geneigten Grün liegt, bleibt liegen, obwohl er, einmal angestoßen, denselben Hang
     hinunterrollt. Ohne sie ist die steilste bespielbare Bahn eine mit sechs Prozent Gefälle:
     Alles darüber schiebt jeden liegenden Ball wieder nach unten, und eine Bahn, die bergauf zur
     Burg führt, wird unspielbar. Genau das ist bei „Zum Burgtor" passiert, mit sechzehn Prozent.

     Auf Fairway hält die Haftreibung bis zu rund achtzehn Prozent Gefälle – steil genug für
     eine Bahn, die sichtbar bergauf führt, flach genug, dass eine Mulde um das Loch den Ball
     trotzdem hineinzieht (dort ist es steiler).

     Geeicht ist es so: **Voller Schlag auf ebenem Fairway = gut 27 Felder.** Das ist etwas mehr
     als die längste Bahn, man kann also immer übers Ziel hinausschlagen. Ein halber Schlag kommt
     rund elf Felder weit – der Kraftbalken ist damit auf seiner ganzen Länge brauchbar und nicht
     nur im ersten Viertel. */
  const ART = {
    '#': { name: 'Fairway', zaeh: 0.38, reibung: 0.40, haft: 1.25, gemaeht: 1, farbe: '#79c247', farbe2: '#6bb33d' },
    'T': { name: 'Abschlag', zaeh: 0.38, reibung: 0.40, haft: 1.25, gemaeht: 1, farbe: '#8ed158', farbe2: '#80c34c' },
    'H': { name: 'Grün', zaeh: 0.33, reibung: 0.34, haft: 1.05, gemaeht: 0.5, farbe: '#8ad455', farbe2: '#7cc849' },
    ',': { name: 'Rough', zaeh: 1.5, reibung: 1.6, haft: 2.4, farbe: '#4e8f33', farbe2: '#447f2c', rau: 0.055 },
    's': { name: 'Sand', zaeh: 3.0, reibung: 5.0, haft: 4.5, farbe: '#e6d3a0', farbe2: '#d8c28c', rau: 0.02 },
    'w': { name: 'Wasser', zaeh: 1.2, reibung: 1.2, haft: 1.2, wasser: true, farbe: '#3a7a52', farbe2: '#33694a' },
    'x': { name: 'Fels', zaeh: 0.6, reibung: 0.6, haft: 1.2, wand: true, farbe: '#6f9a45', farbe2: '#638c3e' },
    'o': { name: 'Kante', zaeh: 0.38, reibung: 0.40, haft: 1.25, gemaeht: 1, offen: true, farbe: '#79c247', farbe2: '#6bb33d' },
    /* Die Rampe ist gebautes Holz, kein Gras: Sie rollt schneller als das Fairway und hält
       weniger – wer oben nicht ankommt, kommt zurück. Ihre Höhe steht nicht hier, sondern in
       'gelaende.rampen'; dieses Zeichen sagt nur, wo die Bretter liegen. */
    'r': { name: 'Rampe', zaeh: 0.3, reibung: 0.3, haft: 1.6, farbe: '#a9793f', farbe2: '#9a6c37' },
    '.': { name: 'Wiese', zaeh: 1.8, reibung: 2.2, haft: 2.8, aus: true, farbe: '#5fa03a', farbe2: '#549132' },
  };
  const artVon = ch => ART[ch] || ART['.'];

  /* ---------- Abstandsfeld ----------
     Zwei Durchgänge über das Gitter, vorwärts und rückwärts; jede Zelle nimmt den kleinsten Wert
     ihrer schon fertigen Nachbarn plus deren Abstand. Das ist die übliche Näherung und für
     unsere Zwecke genau genug – auf den Zehntelfeld kommt es nicht an, weil der Wert ohnehin nur
     eine weiche Böschung steuert. */
  function abstandsFeld(drin, breite, tiefe, rand) {
    const B = breite + rand * 2, T = tiefe + rand * 2, GROSS = 1e6;
    const d = new Float32Array(B * T).fill(GROSS);
    const bei = (i, j) => d[j * B + i];
    for (let j = 0; j < T; j++) for (let i = 0; i < B; i++) if (drin(i - rand, j - rand)) d[j * B + i] = 0;
    const S = Math.SQRT2;
    for (let j = 0; j < T; j++) for (let i = 0; i < B; i++) {
      let v = bei(i, j);
      if (i > 0) v = Math.min(v, bei(i - 1, j) + 1);
      if (j > 0) v = Math.min(v, bei(i, j - 1) + 1);
      if (i > 0 && j > 0) v = Math.min(v, bei(i - 1, j - 1) + S);
      if (i < B - 1 && j > 0) v = Math.min(v, bei(i + 1, j - 1) + S);
      d[j * B + i] = v;
    }
    for (let j = T - 1; j >= 0; j--) for (let i = B - 1; i >= 0; i--) {
      let v = bei(i, j);
      if (i < B - 1) v = Math.min(v, bei(i + 1, j) + 1);
      if (j < T - 1) v = Math.min(v, bei(i, j + 1) + 1);
      if (i < B - 1 && j < T - 1) v = Math.min(v, bei(i + 1, j + 1) + S);
      if (i > 0 && j < T - 1) v = Math.min(v, bei(i - 1, j + 1) + S);
      d[j * B + i] = v;
    }
    /* Abgelesen wird an beliebiger Stelle, weich zwischen den Feldmitten. Außerhalb des gerechneten
       Bereichs gilt der Randwert – dort ist ohnehin längst alles weit weg. */
    const klemm = (v, a, b) => v < a ? a : v > b ? b : v;
    return (x, z) => {
      const fx = klemm(x + rand - 0.5, 0, B - 1.001), fz = klemm(z + rand - 0.5, 0, T - 1.001);
      const i = Math.floor(fx), j = Math.floor(fz), ux = fx - i, uz = fz - j;
      const a = bei(i, j) + (bei(i + 1, j) - bei(i, j)) * ux;
      const b = bei(i, j + 1) + (bei(i + 1, j + 1) - bei(i, j + 1)) * ux;
      return a + (b - a) * uz;
    };
  }

  /* ---------- Das Gelände einer Bahn ----------
     Nur Zahlen, keine Dreiecke. Diesen Teil braucht auch das Prüfskript, das ohne Browser
     nachrechnet, ob jede Bahn spielbar ist. */
  function gelaende(bahn) {
    const karte = bahn.karte, T = karte.length, B = karte[0].length;
    const g = bahn.gelaende || {};
    const huegel = g.huegel || [], grund = g.grund || 0, welle = g.welle || 0;
    /* Rampen: ein Podest mit einer Auffahrt an einer Seite. Es steht nicht als Klotz in der
       Landschaft, sondern ist ein Summand in der Höhenformel – und deshalb muss die Kugelrechnung
       davon nichts wissen. Sie fragt nach Höhe und Neigung, bekommt beides, und der Ball rollt
       hinauf, bleibt oben liegen oder rollt zurück, ganz von selbst.

       Genau das ist der Grund, warum die Ränder weich sind und nicht senkrecht: Eine senkrechte
       Wand hat an ihrer Kante unendliche Neigung, und die Kugelrechnung bekäme Unsinn zu essen.
       Die Abbruchkanten sind darum steil (gut siebzig Prozent), aber endlich – hinunter rollt der
       Ball, hinauf kommt er dort nicht. */
    const rampen = (g.rampen || []).map(rp => {
      const w = rp.dreh || 0;
      return { c: Math.cos(w), si: Math.sin(w), x: rp.x, z: rp.z,
        lang: rp.lang, breit: rp.breit, hoch: rp.hoch, auf: rp.auffahrt === undefined ? 2.5 : rp.auffahrt };
    });
    const rausch = M3.rauschen(9001 + (bahn.name || '').length * 37);

    /* Die Abfrage steht bewusst verneint (!(ix >= 0) statt ix < 0): So fällt auch eine Stelle
       heraus, die gar keine Zahl ist. Das kann nach einem Rechenfehler anderswo passieren, und
       dann soll die Bahn leer aussehen und nicht die ganze Seite stehen bleiben. */
    const zeichen = (ix, iz) => (!(ix >= 0) || !(iz >= 0) || ix >= B || iz >= T) ? '.' : karte[iz][ix];
    const zeichenAn = (x, z) => zeichen(Math.floor(x), Math.floor(z));

    const spielbar = (ix, iz) => { const c = zeichen(ix, iz); return c !== '.' && c !== 'x'; };
    const trocken = (ix, iz) => zeichen(ix, iz) !== 'w';

    const RAND = 22;
    const zumRand = abstandsFeld(spielbar, B, T, RAND);
    const zumUfer = abstandsFeld(trocken, B, T, 2);

    /* Böschung: Hinter der Bahn fällt der Boden ein Stück ab. Früher war das ein tiefer Absatz –
       die Bahn lag wie eine Torte in der Landschaft. Seit sie von Banden eingefasst ist, braucht
       es das nicht mehr: Die Bande sagt, wo die Bahn aufhört, und die Wiese daneben darf fast
       gleich hoch liegen. Ein kleiner Absatz bleibt, damit der Balken einen Fuß hat. */
    const SENKE = 0.45, WASSERTIEFE = 0.5;
    const s = M3.weich;
    const stufe = (v, a, b) => s(M3.klemm((v - a) / (b - a), 0, 1));

    function hoehe(x, z) {
      let y = grund;
      for (const h of huegel) {
        const dx = x - h.x, dz = z - h.z, q = (dx * dx + dz * dz) / (h.r * h.r);
        if (q < 1) { const u = 1 - q; y += h.h * u * u; }
      }
      for (const rp of rampen) {
        const dx = x - rp.x, dz = z - rp.z;
        const u = dx * rp.si + dz * rp.c, v = dx * rp.c - dz * rp.si;
        const rauf = stufe(u, -rp.lang / 2 - rp.auf, -rp.lang / 2);
        const runter = 1 - stufe(u, rp.lang / 2, rp.lang / 2 + 0.8);
        const seite = 1 - stufe(Math.abs(v), rp.breit / 2, rp.breit / 2 + 0.7);
        y += rp.hoch * rauf * runter * seite;
      }
      if (welle) y += welle * (rausch(x * 0.33, z * 0.33) + rausch(x * 0.9, z * 0.9) * 0.4);
      y -= SENKE * stufe(zumRand(x, z), 0.35, 1.8);
      y -= WASSERTIEFE * stufe(zumUfer(x, z), 0.0, 1.3);
      return y;
    }

    /* Die Neigung wird gemessen, nicht hergeleitet: vier Stützstellen ringsum, daraus der
       Gradient. Das ist unempfindlich dagegen, dass oben Glocken, Rauschen und zwei Abstandsfelder
       zusammenkommen – eine abgeleitete Formel müsste bei jeder Änderung mit nachgezogen werden,
       diese hier nicht. */
    const EPS = 0.06;
    function neigung(x, z, raus) {
      const hx = (hoehe(x + EPS, z) - hoehe(x - EPS, z)) / (2 * EPS);
      const hz = (hoehe(x, z + EPS) - hoehe(x, z - EPS)) / (2 * EPS);
      const l = Math.hypot(hx, 1, hz);
      raus[0] = -hx / l; raus[1] = 1 / l; raus[2] = -hz / l;
      return raus;
    }

    /* ---------- Was den Ball aufhält ----------

       Zweierlei, und beides wird gleich gerechnet – als Rechteck von oben gesehen, an dem der Ball
       abprallt wie an einer Bande:

       **Felsnadeln** ('x') stehen mitten in der Bahn und sind mannshoch. Über sie hinweg kommt
       nur, wer springt.

       **Die Banden** sind der Rand der Bahn selbst. Jedes Feld außerhalb, das an die Spielfläche
       stößt, wird zum Block – und weil der Ball ohnehin nie hineinkommt, ist die Innenkante dieses
       Blocks genau die Bandenlinie. Das ist der ganze Trick: Man braucht keine eigene Rechnung für
       dünne Balken, sondern setzt einen dicken Klotz dahinter, von dem man nur die Vorderseite
       sieht. Gezeichnet wird ein Balken (siehe bandenNetz), gerechnet wird ein Rechteck.

       Die Bande ist niedrig. Ein rollender Ball prallt ab, ein springender fliegt darüber – so
       wie es auf einem richtigen Minigolfplatz auch ist. Wer die Bande nicht will, schreibt 'o'
       statt '#': Dort ist die Bahn offen und der Ball fällt hinaus. */
    const BANDE_HOCH = 0.34;
    const felsen = [];
    for (let iz = 0; iz < T; iz++) for (let ix = 0; ix < B; ix++) if (zeichen(ix, iz) === 'x') {
      felsen.push({ x0: ix, z0: iz, x1: ix + 1, z1: iz + 1, oben: hoehe(ix + 0.5, iz + 0.5) + 0.95 });
    }

    /* Die Kanten der Bahn: je ein Eintrag für jede Feldseite, an der Spielfläche auf Nichts stößt.
       Daraus entstehen unten sowohl die Klötze für die Rechnung als auch die Balken fürs Auge. */
    const SEITEN = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    const kanten = [];
    for (let iz = -1; iz <= T; iz++) for (let ix = -1; ix <= B; ix++) {
      const c = zeichen(ix, iz);
      if (c === '.' || c === 'o' || c === 'x') continue;          // nur von der Spielfläche aus
      for (const [dx, dz] of SEITEN) {
        if (zeichen(ix + dx, iz + dz) !== '.') continue;
        kanten.push({ ix, iz, dx, dz, y: hoehe(ix + 0.5, iz + 0.5) });
      }
    }

    /* Aus jedem Nachbarfeld, das mindestens eine Kante trägt, wird ein Block. Mehrere Kanten am
       selben Feld ergeben denselben Block – darum die Sammlung über den Schlüssel. */
    const banden = new Map();
    for (const k of kanten) {
      const bx = k.ix + k.dx, bz = k.iz + k.dz, schluessel = bx + ':' + bz;
      const vorher = banden.get(schluessel);
      const oben = k.y + BANDE_HOCH;
      if (!vorher) banden.set(schluessel, { x0: bx, z0: bz, x1: bx + 1, z1: bz + 1, oben, bande: true });
      else if (oben > vorher.oben) vorher.oben = oben;
    }
    /* Eine Liste für die Kugelrechnung: Felsnadeln und Banden zusammen. */
    const wand = [...felsen, ...banden.values()];

    const finde = ch => {
      for (let iz = 0; iz < T; iz++) { const ix = karte[iz].indexOf(ch); if (ix >= 0) return [ix + 0.5, iz + 0.5]; }
      return null;
    };

    return { bahn, B, T, zeichen, zeichenAn, art: (x, z) => artVon(zeichenAn(x, z)),
      hoehe, neigung, felsen, wand, kanten, BANDE_HOCH, zumRand, RAND,
      abschlag: finde('T'), lochFeld: finde('H') };
  }

  /* ---------- Die Landschaft als Dreiecke ---------- */

  /* Das Gelände wird in halben Feldern vergittert – fein genug, dass Hügel rund aussehen, grob
     genug, dass ein Telefon es zweimal je Bild zeichnen kann (einmal für den Schatten). Die Farbe
     kommt vom Feld, in dem die Mitte des Vierecks liegt; das Rauschen darauf nimmt der Wiese das
     Gleichmäßige, das sie sonst wie Filz aussehen lässt. */
  /* Wie groß das Stück Wiese ist, das um das Loch herum ausgespart und durch einen eigenen
     Flicken ersetzt wird: drei mal drei Maschen des feinen Gitters. */
  const LOCH_FELD = 0.75;

  /* 'wahl' teilt den Boden in zwei Hälften: 'innen' ist die Spielfläche, 'aussen' alles andere.
     Gebraucht wird das für das gemalte Grasbild – es liegt nur auf der Wiese draußen. Auf einer
     gemähten Spielfläche hätte es nichts verloren: Die soll gleichmäßig aussehen, und ein Rasen,
     durch den Grashalme gemalt sind, ist kein Rasen mehr. Ohne Angabe kommt alles in ein Gitter,
     so wie es die Prüfwerkzeuge erwarten. */
  function gelaendeNetz(B, gl, aussenRand, wahl) {
    gitter(B, gl, 0.5, -aussenRand, gl.B + aussenRand, -aussenRand, gl.T + aussenRand, null, gl.lochFeld, wahl);
    /* Und weit draußen dasselbe noch einmal, grob: bis zu den fernen Hügeln. Ohne das hört der
       Boden ein Stück vor dem Horizont auf, und in den Ecken des Bildes schaut der Himmel unter
       der Landschaft hervor. Zwei Einheiten Schrittweite reichen dort – im Nebel und aus vierzig
       Feldern Entfernung sieht niemand den Unterschied, aber jeder sieht das Loch. */
    const innen = [-aussenRand, gl.B + aussenRand, -aussenRand, gl.T + aussenRand];
    const weit = Math.max(gl.B, gl.T) * 0.5 + 52;
    const mx = gl.B / 2, mz = gl.T / 2;
    if (wahl !== 'innen') gitter(B, gl, 2, mx - weit, mx + weit, mz - weit, mz + weit, innen, null, wahl);
  }

  /* Ein Stück Gelände als Gitter. 'aussparen' lässt einen Bereich frei – so kann das grobe
     Gitter um das feine herumgelegt werden, ohne es zu überdecken. */
  function gitter(B, gl, S, xa, xb, za, zb, aussparen, loch, wahl) {
    const x0 = Math.floor(xa / S) * S, x1 = Math.ceil(xb / S) * S;
    const z0 = Math.floor(za / S) * S, z1 = Math.ceil(zb / S) * S;
    const nx = Math.round((x1 - x0) / S), nz = Math.round((z1 - z0) / S);
    const rausch = M3.rauschen(4242);

    /* Höhen und Normalen einmal vorrechnen: Jeder Gitterpunkt gehört zu vier Vierecken, und
       hoehe() ist wegen der Hügelschleife und zweier Abstandsfelder nicht geschenkt. */
    const hh = new Float32Array((nx + 1) * (nz + 1));
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) hh[j * (nx + 1) + i] = gl.hoehe(x0 + i * S, z0 + j * S);
    const H = (i, j) => hh[j * (nx + 1) + i];

    const p = (i, j) => [x0 + i * S, H(i, j), z0 + j * S];
    for (let j = 0; j < nz; j++) for (let i = 0; i < nx; i++) {
      const mx = x0 + (i + 0.5) * S, mz = z0 + (j + 0.5) * S;
      if (aussparen && mx > aussparen[0] && mx < aussparen[1] && mz > aussparen[2] && mz < aussparen[3]) continue;
      /* Um das Loch herum bleibt die Wiese weg – dort kommt ein eigener Flicken hin, der eine
         runde Öffnung hat. Ohne das liegt die Wiese als geschlossene Decke über dem Becher, und
         vom Loch ist nichts zu sehen als der Fahnenmast, der im Gras steckt. */
      if (loch && Math.abs(mx - loch[0]) < LOCH_FELD && Math.abs(mz - loch[1]) < LOCH_FELD) continue;
      if (wahl) {
        /* Die Grenze liegt auf halbem Feld: Bis dorthin reicht die Masche, die zur Spielfläche
           gehört. Eine Masche, die genau auf der Kante liegt, kommt nach innen – sonst bliebe
           zwischen Bahn und Wiese ein Streifen ohne Boden. */
        const drin = gl.zumRand(mx, mz) < 0.5;
        if ((wahl === 'innen') !== drin) continue;
      }
      const a = gl.art(mx, mz);
      /* Unter Wasser liegt Bachgrund, kein Gras – die Farbe dafür steckt schon in ART['w'].

         Auf den gemähten Flächen laufen Mähstreifen quer zur Bahn: zwei Felder hell, zwei Felder
         dunkel. Vorher wechselte die Farbe von Viereck zu Viereck, und das ergab ein Schachbrett,
         das über die ganze Wiese schrie. Streifen dagegen erklären sich von selbst – jeder hat so
         etwas schon auf einem Rasen gesehen – und sie zeigen nebenbei, wo die kurz geschnittene
         Fläche aufhört. */
      let f = Bauen.farbe(a.gemaeht && Math.floor(mz / 2) % 2 === 0 ? a.farbe2 : a.farbe);
      /* Die Körnung der Farbe richtet sich nach der Maschenweite. Auf dem groben Gitter weit
         draußen würde dasselbe feine Rauschen zu einem Schachbrett aus zwei Meter großen Feldern
         – man sieht dann nicht mehr die Wiese, sondern das Gitter. */
      const koernung = 0.5 / S;
      /* Drei Lagen Rauschen: eine grobe für Flecken, eine mittlere für die Struktur und eine
         feine, die von Masche zu Masche springt. Die feine ist es, die aus einer glatten Fläche
         eine gesprenkelte macht – der Boden unter dem Gras soll nicht wie gestrichen aussehen.

         Auf dem Grün bleibt alles drei- bis viermal schwächer. Dort SOLL es gestrichen aussehen:
         Eine gemähte Spielfläche ist gleichmäßig, und eine gesprenkelte sähe aus wie ein Fehler. */
      const stark = a.gemaeht ? 0.25 : 1;
      const v = 1 + rausch(mx * 0.7 * koernung, mz * 0.7 * koernung) * 0.11 * stark
                  + rausch(mx * 2.3 * koernung, mz * 2.3 * koernung) * 0.07 * stark
                  + rausch(mx * 6.1 * koernung, mz * 6.1 * koernung) * 0.05 * stark;
      f = [f[0] * v, f[1] * v, f[2] * v];
      /* Das Viereck wird über die kürzere Diagonale geteilt. Über die falsche geteilt bekommt ein
         Hügelkamm eine Delle und eine Mulde einen Grat – auf einer Golfbahn sieht man das sofort,
         weil der Ball dort abknickt. */
      const A = p(i, j), Bp = p(i + 1, j), C = p(i + 1, j + 1), D = p(i, j + 1);
      if (Math.abs(A[1] - C[1]) <= Math.abs(Bp[1] - D[1])) { B.dreieck(A, D, C, f); B.dreieck(A, C, Bp, f); }
      else { B.dreieck(A, D, Bp, f); B.dreieck(D, C, Bp, f); }
    }
  }

  /* Die Wasserfläche liegt als eigene, durchscheinende Decke über dem Bachbett – ein Feld mehr
     nach außen, damit sie unter dem Ufer verschwindet statt an ihm abzubrechen. */
  function wasserNetz(B, gl) {
    const S = 0.5;
    const felder = [];
    for (let iz = -1; iz <= gl.T; iz++) for (let ix = -1; ix <= gl.B; ix++) {
      if (gl.zeichen(ix, iz) === 'w') felder.push([ix, iz]);
    }
    if (!felder.length) return false;
    /* Der Spiegel liegt auf der Höhe der Uferkante – gerechnet als die Höhe, die das Gelände ohne
       die Wasserabsenkung hätte. Näherungsweise ist das die Höhe am Ufer; genommen wird der
       höchste Randwert ringsum, damit nirgends trockener Bachgrund stehen bleibt. */
    let spiegel = -1e9;
    for (const [ix, iz] of felder) for (const [dx, dz] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      if (gl.zeichen(ix + dx, iz + dz) !== 'w') spiegel = Math.max(spiegel, gl.hoehe(ix + 0.5 + dx * 0.9, iz + 0.5 + dz * 0.9));
    }
    if (spiegel < -1e8) spiegel = 0;
    spiegel -= 0.10;
    const drin = new Set(felder.map(([a, b]) => a + ':' + b));
    for (const [ix, iz] of felder) {
      for (let j = 0; j < 1 / S; j++) for (let i = 0; i < 1 / S; i++) {
        const ax = ix + i * S, az = iz + j * S;
        // Über den Rand hinaus verbreitern, wo das Nachbarfeld kein Wasser ist
        const w0 = drin.has((ix - 1) + ':' + iz) || i > 0 ? 0 : -0.35;
        const w1 = drin.has((ix + 1) + ':' + iz) || i < 1 / S - 1 ? 0 : 0.35;
        const t0 = drin.has(ix + ':' + (iz - 1)) || j > 0 ? 0 : -0.35;
        const t1 = drin.has(ix + ':' + (iz + 1)) || j < 1 / S - 1 ? 0 : 0.35;
        B.viereck([ax + w0, spiegel, az + t0], [ax + S + w1, spiegel, az + t0],
          [ax + S + w1, spiegel, az + S + t1], [ax + w0, spiegel, az + S + t1], '#2f86c4', [0, 1, 0]);
      }
    }
    return spiegel;
  }

  /* ---------- Was herumsteht ---------- */

  /* Ein Fels ist zum Abprallen da, also muss sein Fuß genau das Feld ausfüllen, das die
     Kugelrechnung als Wand kennt – sonst prallt der Ball an Luft ab oder rollt in den Stein.
     Darum bleibt im Kern ein Klotz. Damit er nicht wie ein Betonblock aussieht, wird er nach oben
     schmaler, bekommt eine warme Steinfarbe und wird von Brocken und Grasbüscheln überwachsen,
     die seine Kanten verdecken. Die Brocken sitzen nur oben; unten bleibt die Bande senkrecht. */
  function felsenNetz(B, gl) {
    for (const f of gl.felsen) {
      const mx = (f.x0 + f.x1) / 2, mz = (f.z0 + f.z1) / 2;
      const saat = Math.round(Math.abs(mx) * 131 + Math.abs(mz) * 17);
      const r = M3.zufall(saat + 5);
      const unten = gl.hoehe(mx, mz) - 0.5;
      const hoch = f.oben - unten;
      // Der Kern: unten feldfüllend, oben eingezogen
      B.mit(M3.verschieben(mx, unten, mz), b => {
        const u = 0.49, o = 0.33 + r() * 0.06;
        for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const qx = -az, qz = ax;
          b.viereck([ax * u - qx * u, 0, az * u - qz * u], [ax * u + qx * u, 0, az * u + qz * u],
            [ax * o + qx * o, hoch, az * o + qz * o], [ax * o - qx * o, hoch, az * o - qz * o],
            '#9b9184', [ax, 0.25, az]);
        }
        b.viereck([-o, hoch, -o], [o, hoch, -o], [o, hoch, o], [-o, hoch, o], '#aaa193', [0, 1, 0]);
      });
      // Brocken auf der Krone und am Fuß, die die Kanten brechen
      for (let i = 0; i < 3; i++) {
        const a = r() * M3.TAU3, d = 0.28 + r() * 0.2;
        B.stelle(mx + Math.cos(a) * d, f.oben - 0.12 - r() * 0.1, mz + Math.sin(a) * d, 0, 1,
          b => Deko3D.fels(b, 0.20 + r() * 0.18, saat + i * 7));
      }
      B.stelle(mx, f.oben - 0.05, mz, r() * 6, 1, b => Deko3D.fels(b, 0.30 + r() * 0.1, saat + 41));
      for (let i = 0; i < 4; i++) {
        const a = (i + r() * 0.6) / 4 * M3.TAU3, d = 0.46;
        B.stelle(mx + Math.cos(a) * d, gl.hoehe(mx + Math.cos(a) * d, mz + Math.sin(a) * d) - 0.04,
          mz + Math.sin(a) * d, 0, 1, b => Deko3D.busch(b, 0.12 + r() * 0.07, '#4e8f33', saat + i * 13));
      }
    }
  }

  /* ---------- Das Loch ----------
     Drei Teile: der Flicken Wiese mit der runden Öffnung, der Becher darunter und der helle Rand
     obenauf. Der Becher zeigt nach innen – man schaut ja hinein –, und weil Rückseiten nicht
     gezeichnet werden, müsste man sonst durch den Boden auf die Landschaft dahinter sehen.

     Der Flicken ersetzt genau die neun Maschen, die gelaendeNetz ausgespart hat. Gebaut wird er
     in Ringen um das Loch herum: innen der Kreis, außen das Quadrat, dazwischen drei Lagen. Die
     Höhe wird für jeden Punkt beim Gelände erfragt, damit der Flicken die Mulde mitmacht, in der
     das Loch liegt. */
  function lochNetz(B, gl) {
    const [hx, hz] = gl.lochFeld;
    const R = Physik3D.LOCH_R + 0.015;       // ein Hauch weiter als der Becher, sonst klemmt der Rand
    const K = 20, TIEF = Physik3D.LOCH_TIEF, LAGEN = 3;
    /* Der Boden des Bechers ist heller als seine Wand, und das hat einen Grund: Dort unten liegt
       am Ende der Ball, und ein weißer Ball auf schwarzem Grund im Schatten ist nicht zu erkennen.
       Die Wand bleibt dunkel – an ihr liest man die Tiefe. */
    const GRUEN = ART['H'].farbe, DUNKEL = '#221d15', BODEN = '#4a4133', KRAGEN = '#e9e4d4';

    const aufQuadrat = w => {
      const c = Math.cos(w), sn = Math.sin(w);
      const t = LOCH_FELD / Math.max(Math.abs(c), Math.abs(sn));
      return [hx + c * t, hz + sn * t];
    };
    const amKreis = w => [hx + Math.cos(w) * R, hz + Math.sin(w) * R];
    const misch = (a, b, u) => [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u];
    const hoch = p => [p[0], gl.hoehe(p[0], p[1]), p[1]];

    for (let i = 0; i < K; i++) {
      const w0 = i / K * M3.TAU3, w1 = (i + 1) / K * M3.TAU3;
      const k0 = amKreis(w0), k1 = amKreis(w1), q0 = aufQuadrat(w0), q1 = aufQuadrat(w1);
      /* Der Flicken Wiese. Die innerste Lage ist schmal und ein wenig heller – das ausgetretene
         Gras rings um ein Loch. Ohne diesen Ring verschwindet die Öffnung aus ein paar Feldern
         Entfernung im Grün; mit ihm sieht man von Weitem, wo man hin will. */
      const RAND = 0.09 / LOCH_FELD;
      B.viereck(hoch(misch(k0, q0, 0)), hoch(misch(k1, q1, 0)),
        hoch(misch(k1, q1, RAND)), hoch(misch(k0, q0, RAND)), '#a8dd6a', [0, 1, 0]);
      for (let l = 0; l < LAGEN; l++) {
        const ua = RAND + (1 - RAND) * l / LAGEN, ub = RAND + (1 - RAND) * (l + 1) / LAGEN;
        B.viereck(hoch(misch(k0, q0, ua)), hoch(misch(k1, q1, ua)),
          hoch(misch(k1, q1, ub)), hoch(misch(k0, q0, ub)), GRUEN, [0, 1, 0]);
      }
      // Der Becher: Wand nach innen gerichtet, oben ein heller Kragen wie bei einem echten Loch
      const y0 = gl.hoehe(k0[0], k0[1]), y1 = gl.hoehe(k1[0], k1[1]);
      const nachInnen = [hx * 2 - k0[0] - k1[0], 0, hz * 2 - k0[1] - k1[1]];
      const KRAGEN_TIEF = 0.11;
      B.viereck([k0[0], y0, k0[1]], [k1[0], y1, k1[1]],
        [k1[0], y1 - KRAGEN_TIEF, k1[1]], [k0[0], y0 - KRAGEN_TIEF, k0[1]], KRAGEN, nachInnen);
      B.viereck([k0[0], y0 - KRAGEN_TIEF, k0[1]], [k1[0], y1 - KRAGEN_TIEF, k1[1]],
        [k1[0], y1 - TIEF, k1[1]], [k0[0], y0 - TIEF, k0[1]], DUNKEL, nachInnen);
      const tiefe = Math.min(y0, y1) - TIEF;
      B.flaeche([[hx, tiefe, hz], [k0[0], tiefe, k0[1]], [k1[0], tiefe, k1[1]]], BODEN, [0, 1, 0]);
    }
  }

  /* ---------- Die Banden ----------
     Für jede Kante ein Balken, dazu Pfosten dort, wo eine Reihe von Balken endet oder um die Ecke
     geht. Das ist kein Zierrat: Ohne die Pfosten stoßen an jeder Ecke zwei Balken stumpf
     aneinander, und man sieht durch die Fuge hindurch.

     Der Balken sitzt mit seiner Innenseite genau auf der Bandenlinie – dort, wo die Kugelrechnung
     den Ball anhalten lässt. Läge er mittig auf der Linie, prallte der Ball sichtbar in der Luft
     ab; läge er ganz außen, führe er sichtbar in das Holz hinein. */
  function bandenNetz(B, gl) {
    const DICK = 0.30, HOCH = gl.BANDE_HOCH, TIEF = 0.10;     // TIEF: so weit steckt er im Boden
    const HOLZ = '#8a5f38', HOLZ_OBEN = '#b1865a', HOLZ_TIEF = '#6a4526';
    /* Trägt das Nachbarfeld dieselbe Kante? Dann läuft der Balken dort weiter und braucht hier
       keinen Pfosten. */
    const kantenSatz = new Set(gl.kanten.map(k => `${k.ix}:${k.iz}:${k.dx}:${k.dz}`));
    const laeuftWeiter = (k, qx, qz) => kantenSatz.has(`${k.ix + qx}:${k.iz + qz}:${k.dx}:${k.dz}`);

    for (const k of gl.kanten) {
      // Mitte der Kante und ihre Richtung: quer zur Feldseite
      const mx = k.ix + 0.5 + k.dx * (0.5 + DICK / 2);
      const mz = k.iz + 0.5 + k.dz * (0.5 + DICK / 2);
      const laengs = k.dx ? 0 : Math.PI / 2;                   // Balken liegt quer zur Seitenrichtung
      /* Der Balken ist nicht ein Brett, sondern zwei übereinander – mit einer dunklen Fuge
         dazwischen und einer schmalen Deckleiste obenauf. Genau so ist die Bande auf Fynns
         Vorbildfoto gebaut, und es ist der Unterschied zwischen „Holzfarbene Mauer" und „Holz".

         Die Fuge ist eingerückt, nicht aufgesetzt: ein dünnes dunkles Brettchen, das schmaler ist
         als der Balken. Aufgesetzt sähe es aus wie ein Gürtel. */
      const bretterFarbe = Bauen.stufe(HOLZ, 0.94 + ((k.ix * 7 + k.iz * 3) % 5) * 0.03);
      B.stelle(mx, k.y - TIEF, mz, laengs, 1, b => {
        const unten = (HOCH + TIEF) * 0.56;
        b.kasten(DICK, unten, 1.0, bretterFarbe, HOLZ_TIEF);
        b.mit(M3.verschieben(0, unten, 0),
          c => c.kasten(DICK * 0.97, (HOCH + TIEF) - unten - 0.03, 1.0, bretterFarbe, HOLZ_TIEF));
        /* Deckleiste: ein Stück breiter als der Balken, damit die Oberkante eine Linie bekommt.
           Der Ball prallt an der senkrechten Fläche darunter ab – die Leiste ist reine Optik und
           steht in der Kugelrechnung nicht. */
        b.mit(M3.verschieben(0, (HOCH + TIEF) - 0.03, 0),
          c => c.kasten(DICK * 1.1, 0.03, 1.0, HOLZ_OBEN, HOLZ_OBEN));
      });
      /* Pfosten – abgesägte Stämme wie auf dem Vorbild. Sie stehen an jedem Ende einer Reihe
         (dort stoßen sonst zwei Balken stumpf aneinander und man sieht durch die Fuge) und
         zusätzlich alle drei Felder. Das zweite ist reine Optik, aber es ist die Optik, die aus
         einer langen Latte eine Bande macht. */
      const quer = k.dx ? [[0, -1], [0, 1]] : [[-1, 0], [1, 0]];
      for (const [qx, qz] of quer) {
        const ende = !laeuftWeiter(k, qx, qz);
        const regel = (qx > 0 || qz > 0) && (k.ix + k.iz) % 3 === 0;
        if (!ende && !regel) continue;
        B.stelle(mx + qx * 0.5, k.y - TIEF - 0.05, mz + qz * 0.5, 0, 1, b => {
          const h = HOCH + TIEF + 0.10;
          b.walze(DICK * 0.66, DICK * 0.62, h, 8, HOLZ, null);
          /* Eine abgesetzte Kuppe: Ein glatt abgeschnittener Pfosten sieht aus wie ein Rohr, ein
             angefaster wie ein gesägter Stamm. */
          b.mit(M3.verschieben(0, h, 0), c => c.walze(DICK * 0.62, DICK * 0.46, DICK * 0.2, 8, HOLZ, HOLZ_OBEN));
        });
      }
    }
  }

  /* Die Burg auf ihrem Felsen. Sie liegt immer außerhalb der Bahn und ist nie zu erreichen –
     sie ist Orientierung und Versprechen, nicht Hindernis. Zurück kommen die Stellen ihrer
     Fahnen, damit die wehen können. */
  function burgNetz(B, gl, burg) {
    if (!burg) return [];
    const fussHoehe = gl.hoehe(burg.x, burg.z);
    const bergH = burg.berg === undefined ? 3 : burg.berg;
    const g = burg.g || 1;
    /* Steht die Burg auf einem Berg oder auf der Wiese? Beides kommt vor, und beides soll
       vorkommen: Aus der Ferne ist die Burg auf dem Kegel das Wahrzeichen der ganzen Welt, aber
       eine Bahn, die am Burgtor endet, braucht die Burg auf Augenhöhe. Steht sie dort oben, sieht
       man vom Spielfeld aus nur die Felswand.

       Unter einem halben Meter Berg wird deshalb gar keiner gebaut, sondern nur eine flache
       Grasterrasse mit einer Böschung aus Steinen – gerade genug, dass die Burg einen Fuß hat. */
    const berg = bergH > 0.5;
    if (berg) {
      /* Der Burgberg ist ein Kegelstumpf, der tief genug im Boden steckt, dass auch am Hang keine
         Fuge bleibt – oben grün, unter der Krone Fels. Zwei aufeinandergestapelte Scheiben (der
         erste Versuch) sahen aus wie eine Torte; ein Kegel, dessen Wand nach oben einzieht, sieht
         aus wie ein Berg. */
      B.stelle(burg.x, fussHoehe - 2.2, burg.z, 0, 1, b => {
        b.walze(6.6 * g, 4.4 * g, bergH * 0.62 + 2.2, 13, '#69933f', '#7cae4b');
        b.mit(M3.verschieben(0, bergH * 0.62 + 2.2, 0), c => {
          c.walze(4.4 * g, 3.9 * g, bergH * 0.26, 13, '#9a9488', '#a8a296');
          c.mit(M3.verschieben(0, bergH * 0.26, 0), d => d.walze(3.9 * g, 3.7 * g, bergH * 0.12, 13, '#7cae4b', '#88bb53'));
        });
      });
      /* Felsbrocken am Übergang von Grün zu Fels – sie verstecken die Kante zwischen den Walzen. */
      const rb = M3.zufall(919);
      for (let i = 0; i < 14; i++) {
        const a = rb() * M3.TAU3, d = (4.3 + rb() * 0.5) * g;
        B.stelle(burg.x + Math.cos(a) * d, fussHoehe - 2.2 + bergH * 0.62 + 2.2 - 0.3 + rb() * 0.5,
          burg.z + Math.sin(a) * d, 0, 1, b => Deko3D.fels(b, (0.35 + rb() * 0.4) * g, i * 11 + 3));
      }
    } else {
      // Flache Terrasse: eine kaum merkliche Stufe, damit die Mauer nicht im Gras schwimmt
      B.stelle(burg.x, fussHoehe - 1.0, burg.z, 0, 1,
        b => b.walze(4.6 * g, 4.2 * g, 1.0 + bergH, 13, '#69933f', '#7cae4b'));
      const rb = M3.zufall(919);
      for (let i = 0; i < 10; i++) {
        const a = rb() * M3.TAU3, d = (4.1 + rb() * 0.4) * g;
        B.stelle(burg.x + Math.cos(a) * d, fussHoehe + bergH - 0.25, burg.z + Math.sin(a) * d, 0, 1,
          b => Deko3D.fels(b, (0.2 + rb() * 0.25) * g, i * 11 + 3));
      }
    }
    let fahnen = [];
    B.stelle(burg.x, fussHoehe + bergH, burg.z, burg.dreh === undefined ? 0.35 : burg.dreh, 1,
      b => { fahnen = Deko3D.burg(b, g).fahnen; });
    /* Bewuchs am Fuß. Auf dem Berg ist es Nadelwald, wie auf den gemalten Vorlagen; auf der Wiese
       sind es Laubbäume in Gruppen – ein Tannenkranz um eine ebenerdige Burg sähe aus wie eine
       Verteidigungsanlage aus Bürsten. */
    const r = M3.zufall(555);
    for (let i = 0; i < (berg ? 26 : 14); i++) {
      const a = r() * M3.TAU3, d = (berg ? 4.4 + r() * 1.8 : 5.0 + r() * 2.2) * g;
      const x = burg.x + Math.cos(a) * d, z = burg.z + Math.sin(a) * d;
      const y = berg ? fussHoehe - 0.6 + Math.max(0, bergH * 0.22 * (1 - d / (6.5 * g))) : gl.hoehe(x, z);
      const art = berg ? (r() < 0.25 ? 'kiefer' : 'tanne') : (r() < 0.4 ? 'eiche' : 'laubbaum');
      B.stelle(x, y, z, r() * 6, 1, b => Deko3D.baum(b, art, 5 + r() * 4, i * 3 + 1));
    }
    /* Von der Burgmitte aus in Weltkoordinaten umrechnen – die Fahnen kommen in Burgkoordinaten
       zurück, gedreht um denselben Winkel wie die Burg. */
    const w = burg.dreh === undefined ? 0.35 : burg.dreh, c = Math.cos(w), s = Math.sin(w);
    return fahnen.map(f => ({
      x: burg.x + f.x * c + f.z * s,
      z: burg.z - f.x * s + f.z * c,
      y: fussHoehe + bergH + f.y, h: f.h, farbe: f.farbe,
    }));
  }

  /* ---------- Maßstab der Bauwerke ----------

     Was in der Bahnbeschreibung als 'g' steht, ist nicht die Größe in Feldern, sondern ein
     Verhältnis: „etwas größer als das Übliche". Wie groß das Übliche ist, steht hier – an einer
     Stelle, für alle neun Bahnen.

     Der Grund für diese Trennung ist ein handfester: Als die Welt größer wurde, mussten alle
     Bauwerke mitwachsen. Stünden die Maße in den Bahnen, wären das siebzig Zahlen gewesen, jede
     einzeln nachzuziehen und jede eine Gelegenheit, eine zu vergessen. So war es eine Tabelle.

     'fuss' ist der Platz, den ein Bauwerk am Boden braucht, in Feldern. Daraus entsteht zweierlei:
     der Abstand zur Spielfläche (kein Haus steht auf der Bahn) und die Lichtung im Wald ringsum. */
  const DEKO = {
    haus:       { mal: 3.6, fuss: 0.80 },
    scheune:    { mal: 3.0, fuss: 1.70 },
    muehle:     { mal: 3.2, fuss: 1.50 },
    brunnen:    { mal: 2.4, fuss: 0.60 },
    heuhaufen:  { mal: 2.4, fuss: 0.90 },
    karren:     { mal: 2.2, fuss: 0.80 },
    zelt:       { mal: 2.6, fuss: 1.20 },
    zaun:       { mal: 2.2, fuss: 0 },
    mauer:      { mal: 2.2, fuss: 0 },
    felsgruppe: { mal: 2.2, fuss: 1.10 },
    bruecke:    { mal: 1.3, fuss: 0 },
    baum:       { mal: 2.8, fuss: 0.32 },
    obstbaum:   { mal: 2.8, fuss: 0.32 },
    mast:       { mal: 1.8, fuss: 0.15 },
  };
  const dekoMal = t => (DEKO[t] || { mal: 1 }).mal;
  /* Der Fuß gilt für das fertige Stück, also nach 'mal'. Das war anfangs anders gemeint und ging
     prompt schief: Die Mühle wurde mit dem Dreieinhalbfachen gebaut, aber nur mit dem Einfachen
     weggeschoben – und stand mit ihren Flügeln über der Bahn. Jetzt gilt für beides dieselbe
     Rechnung. Beim Baum ist 'g' die Höhe, und der Fuß ist ein Drittel davon: So breit ist eine
     Krone ungefähr. */
  const dekoFuss = (t, g = 1) => (DEKO[t] || { fuss: 0 }).fuss * g * dekoMal(t);

  /* Ein Bauwerk von der Spielfläche wegschieben, bis sein Fuß frei steht. Geschoben wird entlang
     des Anstiegs des Abstandsfeldes, also immer geradewegs von der Bahn fort.

     Das ist bequemer, als es klingt: Beim Bauen einer Bahn setzt man ein Haus dorthin, wo es gut
     aussieht, und muss nicht nachrechnen, ob seine Ecke die Bande berührt. Und als die Bauwerke
     dreimal so groß wurden, rutschte alles von selbst an die richtige Stelle, statt in siebzig
     Zeilen nachgebessert zu werden. */
  function wegVomFeld(gl, x, z, fuss) {
    if (!fuss) return [x, z];
    let px = x, pz = z;
    for (let i = 0; i < 60 && gl.zumRand(px, pz) < fuss; i++) {
      const e = 0.4;
      const gx = gl.zumRand(px + e, pz) - gl.zumRand(px - e, pz);
      const gz = gl.zumRand(px, pz + e) - gl.zumRand(px, pz - e);
      const l = Math.hypot(gx, gz);
      if (l < 1e-6) break;
      px += gx / l * 0.25; pz += gz / l * 0.25;
    }
    return [px, pz];
  }

  /* Wo die Bauwerke am Ende wirklich stehen. Zwei Kräfte wirken auf jedes: weg von der
     Spielfläche und weg von den anderen. Das Zweite kam dazu, als die Bauwerke dreimal so groß
     wurden – vorher stand ein Brunnen zwei Felder neben einem Haus und störte niemanden, jetzt
     steckte er darin.

     Gerechnet wird einmal je Bahn und dann gemerkt: Die Deko fragt danach, und der Bewuchs fragt
     noch einmal, um seine Lichtungen an dieselbe Stelle zu legen. Zweimal zu rechnen hieße, dass
     die Lichtung auch nur ein Rundungsfehler neben dem Haus liegen könnte. */
  function dekoOrte(gl) {
    if (gl.__orte) return gl.__orte;
    const raus = [];
    for (const d of gl.bahn.deko || []) {
      const fuss = dekoFuss(d.t, d.g || 1);
      let [x, z] = wegVomFeld(gl, d.x, d.z, fuss);
      for (let i = 0; i < 24 && fuss > 0; i++) {
        let stoss = null;
        for (const a of raus) {
          if (!a.fuss) continue;
          const dx = x - a.x, dz = z - a.z, weit = Math.hypot(dx, dz), soll = (fuss + a.fuss) * 0.8;
          if (weit < soll) { stoss = [dx / (weit || 1), dz / (weit || 1), soll - weit]; break; }
        }
        if (!stoss) break;
        x += stoss[0] * Math.min(0.5, stoss[2]);
        z += stoss[1] * Math.min(0.5, stoss[2]);
        [x, z] = wegVomFeld(gl, x, z, fuss);
      }
      raus.push({ x, z, fuss });
    }
    gl.__orte = raus;
    return raus;
  }
  const dekoOrt = (gl, d) => {
    const i = (gl.bahn.deko || []).indexOf(d);
    const o = dekoOrte(gl)[i];
    return o ? [o.x, o.z] : [d.x, d.z];
  };

  /* Alles, was in der Bahnbeschreibung unter 'deko' steht. */
  function dekoNetz(B, gl, beweglich) {
    const orte = dekoOrte(gl);
    for (const eintrag of gl.bahn.deko || []) {
      const y = (x, z) => gl.hoehe(x, z);
      const mal = dekoMal(eintrag.t);
      if (eintrag.t === 'zaun') { Deko3D.zaun(B, eintrag.von[0], eintrag.von[1], eintrag.nach[0], eintrag.nach[1], y, (eintrag.h || 0.42) * mal); continue; }
      if (eintrag.t === 'mauer') { Deko3D.steinmauer(B, eintrag.von[0], eintrag.von[1], eintrag.nach[0], eintrag.nach[1], y, (eintrag.h || 0.38) * mal); continue; }
      /* Der Maßstab kommt aus der Tabelle, der Ort aus der Bahn – und der Ort wird noch ein Stück
         von der Spielfläche weggeschoben, falls das Bauwerk größer ist als der Platz daneben. */
      const ort = orte[gl.bahn.deko.indexOf(eintrag)];
      const dx = ort.x, dz = ort.z;
      const d = { ...eintrag, x: dx, z: dz, g: (eintrag.g || 1) * mal };
      const h = y(d.x, d.z);
      switch (d.t) {
        case 'muehle': {
          let nabe = null;
          B.stelle(d.x, h, d.z, d.dreh || 0, 1, b => { nabe = Deko3D.muehle(b, d.g).nabe; });
          const w = d.dreh || 0, c = Math.cos(w), si = Math.sin(w);
          beweglich.muehlen.push({ x: d.x + nabe[0] * c + nabe[2] * si, y: h + nabe[1], z: d.z - nabe[0] * si + nabe[2] * c,
            dreh: w, g: d.g, tempo: 0.55 + d.g * 0.04 });
          break;
        }
        case 'haus': B.stelle(d.x, h, d.z, d.dreh || 0, d.g, b => Deko3D.haus(b, 1, 0.8, 0.8, d.dach)); break;
        case 'scheune': B.stelle(d.x, h, d.z, d.dreh || 0, 1, b => Deko3D.scheune(b, d.g, d.dach)); break;
        case 'brunnen': B.stelle(d.x, h, d.z, d.dreh || 0, 1, b => Deko3D.brunnen(b, d.g)); break;
        case 'heuhaufen': B.stelle(d.x, h, d.z, d.dreh || 0, 1, b => Deko3D.heuhaufen(b, d.g, Math.round(d.x * 17 + d.z * 5))); break;
        case 'karren': B.stelle(d.x, h, d.z, d.dreh || 0, 1, b => Deko3D.karren(b, d.g)); break;
        case 'baum': B.stelle(d.x, h, d.z, d.dreh || 0, 1, b => Deko3D.baum(b, d.art || 'laubbaum', d.g, Math.round(d.x * 29 + d.z * 11))); break;
        case 'obstbaum': B.stelle(d.x, h, d.z, d.dreh || 0, 1, b => Deko3D.obstbaum(b, d.g, Math.round(d.x * 29 + d.z * 11))); break;
        case 'zelt': {
          /* Auf jedem Zelt weht ein Wimpel – deshalb kommt die Spitze zurück und wandert in die
             Liste der Fahnen, die im beweglichen Gitter gezeichnet werden. */
          let spitze = 1.5;
          B.stelle(d.x, h, d.z, d.dreh || 0, 1, b => { spitze = Deko3D.zelt(b, d.g, d.farbe, Math.round(d.x * 13 + d.z * 7)).spitze; });
          beweglich.fahnen.push({ x: d.x, y: h + spitze + 0.02, z: d.z, h: 0.26 * d.g, farbe: d.farbe || '#c8503f' });
          break;
        }
        case 'felsgruppe': B.stelle(d.x, h, d.z, 0, 1, b => Deko3D.felsgruppe(b, d.g * 0.6, Math.round(d.x * 13 + d.z * 7))); break;
        case 'bruecke': bruecke(B, gl, d); break;
        case 'mast': {
          const hoch = (d.h || 1.4) * mal;
          B.stelle(d.x, h, d.z, 0, 1, b => Deko3D.mast(b, hoch));
          beweglich.fahnen.push({ x: d.x, y: h + hoch, z: d.z, h: hoch * 0.42, farbe: d.farbe || '#b63a30' });
          break;
        }
        default: break;
      }
    }
  }

  /* Eine Steinbrücke über den Bach. Sie ist reine Zier: Der Ball läuft unter ihr durch, nicht
     über sie. Über sie zu laufen hieße, eine zweite Spielebene zu führen – das kann das 2,5D-Spiel
     mit seinen Türmen, und es kommt hier später dazu, aber nicht in der ersten Fassung. */
  function bruecke(B, gl, d) {
    const g = d.g || 1, w = d.dreh || 0;
    const h = gl.hoehe(d.x, d.z) + 0.55 * g;
    B.stelle(d.x, h, d.z, w, g, b => {
      for (const sx of [-1, 1]) b.mit(M3.verschieben(sx * 1.1, -0.9, 0), c => c.kasten(0.5, 1.1, 1.5, '#b3a992', '#ded6c4'));
      b.kasten(3.0, 0.22, 1.4, '#c9c1ae', '#ded6c4');
      for (const sx of [-1, 1]) b.mit(M3.verschieben(0, 0.22, sx * 0.62), c => c.kasten(3.0, 0.3, 0.16, '#b3a992', '#ded6c4'));
      // Der Bogen als Reihe schmaler Klötze – von der Seite ein Halbkreis
      for (let i = 0; i < 7; i++) {
        const a = Math.PI * (i + 0.5) / 7;
        b.mit(M3.mult(M3.verschieben(-Math.cos(a) * 0.92, -0.9 + Math.sin(a) * 0.62, 0), M3.drehenZ(-a + Math.PI / 2)),
          c => c.kasten(0.3, 0.18, 1.4, '#c9c1ae', '#ded6c4'));
      }
    });
  }

  /* Welcher Baum wächst hier? Die Mischung wandert mit dem Abstand zur Bahn, und das hat einen
     Grund im Bild, nicht in der Botanik: Direkt am Saum sieht man einzelne Bäume ganz, dort lohnen
     sich die kenntlichen Formen – Birke, Tropfenkrone, Pappel. Weiter draußen verschmilzt alles zu
     einer Wand, und eine Wand aus Nadelbäumen liest sich besser als eine aus Kugeln.

     Die Eiche bleibt überall selten. Sie ist der größte und breiteste Baum; mehrere nebeneinander
     wirken nicht nach Wald, sondern nach Wiederholung. Einzeln ist sie ein Merkzeichen. */
  const BAUM_NAH =  { laubbaum: 0.30, tropfenbaum: 0.22, pappel: 0.17, tanne: 0.14, birke: 0.09, kiefer: 0.06, eiche: 0.02 };
  const BAUM_FERN = { tanne: 0.42, kiefer: 0.23, laubbaum: 0.15, pappel: 0.11, tropfenbaum: 0.06, birke: 0.02, eiche: 0.01 };
  /* Wuchshöhen: Untergrenze und Spanne, in Feldern. Ein Feld ist ungefähr ein Meter, und damit
     sind das Bäume von fünf bis zehn Metern – so groß, wie ein Baum neben einer Minigolfbahn
     wirklich ist.

     Vorher standen hier anderthalb bis dreieinhalb Meter. Das sah für sich genommen ordentlich
     aus, aber es gab der Welt keinen Maßstab: Neben einer Bahn, die sechs Felder breit ist, ist
     ein Baum von zwei Metern ein Busch, und ein Haus von einem Meter ein Spielzeug. Wer später
     eine Bahn durch eine Scheune führen will, braucht eine Scheune, durch die eine Bahn passt –
     und dann muss alles andere mitwachsen.

     Die Pappel ist schlank und darf deshalb am höchsten werden, die Eiche bleibt niedriger und
     wird dafür breit. */
  const BAUM_HOCH = { tanne: [5.5, 4.0], kiefer: [7.0, 3.0], pappel: [7.0, 3.5], tropfenbaum: [4.0, 2.0],
    birke: [5.0, 2.5], laubbaum: [4.5, 4.0], eiche: [5.5, 2.5] };

  /* Ab hier wird gespart, und beide Grenzen sind aus dem Bild abgelesen und nicht geraten:
     Jenseits von NAH_KRAM ist ein Busch oder ein Grasbüschel keine drei Bildpunkte mehr groß,
     jenseits von FERN_BAUM ist von einem Baum nur noch der Umriss zu sehen. */
  const NAH_KRAM = 13, FERN_BAUM = 20;
  /* Der Saum entlang der Bahn, in dem kein Baum wächst. Er ist mit den Bäumen mitgewachsen: Eine
     Tanne von zwei Metern durfte drei Felder neben der Bahn stehen, eine von acht nicht mehr –
     sie stünde beim Zielen mitten im Bild. Büsche, Gras und Steine dürfen weiter dicht heran. */
  const SAUM = 4.5;

  function baumArt(wurf, tiefe) {
    let summe = 0;
    for (const art in BAUM_NAH) summe += M3.misch(BAUM_NAH[art], BAUM_FERN[art], tiefe);
    let schwelle = wurf * summe;
    for (const art in BAUM_NAH) {
      schwelle -= M3.misch(BAUM_NAH[art], BAUM_FERN[art], tiefe);
      if (schwelle <= 0) return art;
    }
    return 'laubbaum';
  }

  /* Bäume, Büsche, Blumen und Steine, verteilt nach Zufall mit festem Startwert.

     Zwei Regeln halten die Bahn spielbar: Auf der Spielfläche wächst nur Kleinkram (Blumen,
     Grasbüschel), und Bäume halten mindestens ein Feld Abstand zum Rand. Sonst steht irgendwann
     eine Eiche im Anspiel, und niemand versteht, warum der Ball nicht durchkommt. */
  function streuenNetz(B, gl, aussenRand) {
    const a = gl.bahn.autoDeko || {};
    const dichte = a.dichte === undefined ? 0.5 : a.dichte;
    const r = M3.zufall((a.saat || 1) * 7717 + 3);
    const burg = gl.bahn.burg;
    const weitVonBurg = (x, z) => !burg || Math.hypot(x - burg.x, z - burg.z) > 7.5 * (burg.g || 1);
    /* Um jedes Gebäude bleibt eine Lichtung frei. Ohne das wächst der Wald den Häusern bis an die
       Wand, und aus einem Dorf wird eine Ansammlung von Dächern zwischen Tannen – man sieht dann
       nicht mehr, dass dort jemand wohnt. Ein Hof ist eine Lichtung mit Gebäuden darauf, und
       genau das ist hier gemeint. */
    /* Die Lichtung um ein Bauwerk ist anderthalbmal sein Fuß. Beide Maße kommen jetzt aus derselben
       Tabelle – vorher stand die Lichtung für sich, und als die Häuser dreimal so groß wurden, wäre
       sie stehen geblieben und der Wald hätte mitten in der Scheune gestanden. */
    const lichtungen = dekoOrte(gl).filter(o => o.fuss > 0).map(o => ({ x: o.x, z: o.z, r: o.fuss * 1.5 }));
    const imFreien = (x, z) => !lichtungen.some(l => Math.hypot(x - l.x, z - l.z) < l.r);

    for (let z = -aussenRand; z < gl.T + aussenRand; z += 1) for (let x = -aussenRand; x < gl.B + aussenRand; x += 1) {
      const px = x + r(), pz = z + r();
      const abstand = gl.zumRand(px, pz);
      const wuerfel = r();
      if (abstand < 0.1) {
        /* Auf der Spielfläche wächst nur, was der Ball nicht merkt: ein Grasbüschel oder eine
           Blume, und auch die nur im Rough. Sie stehen ein paar Zentimeter hoch und zählen für
           die Kugelrechnung nicht – der Ball rollt hindurch. */
        if (gl.art(px, pz).name === 'Rough') {
          /* Zwei Griffe je Feld statt einem: Das Rough ist im Spiel die Strafe für den schlechten
             Schlag, und es muss von Weitem als hohes Gras zu erkennen sein. Ein Büschel alle zwei
             Felder reicht dafür nicht. */
          for (let k = 0; k < 2; k++) {
            if (r() > dichte * 0.85) continue;
            const qx = x + r(), qz = z + r();
            if (gl.zumRand(qx, qz) > 0.1 || gl.art(qx, qz).name !== 'Rough') continue;
            const saat = Math.round(qx * 91 + qz * 13) + k;
            if (r() < 0.22) B.stelle(qx, gl.hoehe(qx, qz), qz, r() * 6, 0.8 + r() * 0.5, b => Deko3D.blume(b, 1.6, saat));
            else B.stelle(qx, gl.hoehe(qx, qz), qz, r() * 6, 0.75 + r() * 0.5,
              b => Deko3D.grasbueschel(b, 1.0, r() < 0.5 ? '#5fa03a' : '#6fb045', saat));
          }
        }
        continue;
      }
      if (!weitVonBurg(px, pz)) continue;
      const y = gl.hoehe(px, pz);
      /* Je weiter draußen, desto dichter der Wald: Innen bleibt der Blick frei, außen schließt
         sich die Landschaft. Das ist billiger als eine Kulisse und wirkt dreimal so tief.

         Seit die Bäume fünf bis zehn Meter hoch sind, stehen nur noch halb so viele: Ein
         ausgewachsener Wald hat weniger Stämme als ein Dickicht, weil jeder mehr Platz nimmt.
         Dichter gesetzt wäre es eine grüne Wand und kostete das Doppelte an Dreiecken.

         Zwei Sperrbezirke halten Bäume weg, und beide sind Notwendigkeiten, keine Schönheitsregeln:

         **Der Saum entlang der Bahn.** Die Bahnen sind schmal; die Kamera steht beim Zielen
         dahinter und damit oft neben der Bande. Eine Tanne zwei Felder daneben stünde mitten im
         Bild. Büsche, Steine und Blumen dürfen dort bleiben – über die schaut man hinweg.

         **Der Platz hinter dem Abschlag.** Dort steht die Kamera beim allerersten Schlag, weit
         außerhalb der Bahn, und sie steht dort jedes Mal. Ein Baum an dieser Stelle verdeckt nicht
         irgendeinen Schlag, sondern immer denselben. */
      const zumAbschlag = gl.abschlag ? Math.hypot(px - gl.abschlag[0], pz - gl.abschlag[1]) : 99;
      const waldNeigung = M3.klemm((abstand - SAUM) / 9, 0, 1);
      if (abstand > SAUM && zumAbschlag > 12 && imFreien(px, pz) && wuerfel < dichte * (0.08 + waldNeigung * 0.34)) {
        const art = baumArt(r(), waldNeigung);
        const [tief, spanne] = BAUM_HOCH[art];
        /* Jeder fünfte Baum ist ein Jungbaum. Ein Wald, in dem alle Wipfel auf derselben Höhe
           enden, sieht aus wie eine Hecke; ein paar halbhohe darunter machen daraus einen
           Bestand, der schon eine Weile dort steht. */
        const jung = r() < 0.22 ? 0.45 + r() * 0.2 : 1;
        const hoch = (tief + r() * spanne) * jung;
        const saat = Math.round(px * 53 + pz * 29);
        if (abstand > FERN_BAUM) B.stelle(px, y, pz, r() * 6, 1,
          b => Deko3D.fernbaum(b, hoch, art === 'tanne' || art === 'kiefer' || art === 'pappel', saat));
        else B.stelle(px, y, pz, r() * 6, 1, b => Deko3D.baum(b, art, hoch, saat));
      } else if (abstand > NAH_KRAM) {
        /* Weit draußen nichts als Bäume: Ein Busch von dreißig Feldern Entfernung ist ein
           grüner Punkt im Gras und kostet trotzdem neunzig Dreiecke. */
      /* Am Bahnrand wächst Gras, nicht Gebüsch. Das ist keine Kleinigkeit: Als die Büsche mit der
         Welt mitwuchsen, standen sie plötzlich als geschlossene Hecke links und rechts der Bahn und
         verdeckten alles dahinter – Häuser, Bäume, Burg. Auf Fynns Vorbild ist der Rand einer
         Minigolfbahn ein Grassaum, und Büsche stehen weiter hinten unter den Bäumen. */
      } else if (wuerfel < dichte * 0.42) {
        B.stelle(px, y, pz, r() * 6, 0.9 + r() * 0.7,
          b => Deko3D.grasbueschel(b, 1.5, r() < 0.5 ? '#4f8f35' : '#62a63d', Math.round(px * 17 + pz * 53)));
      } else if (abstand > 2.4 && wuerfel < dichte * 0.6) {
        B.stelle(px, y, pz, r() * 6, 1, b => Deko3D.busch(b, 0.3 + r() * 0.45, r() < 0.5 ? '#4f8f35' : '#3f8a2d', Math.round(px * 37 + pz * 91)));
      } else if (wuerfel < dichte * 0.72) {
        B.stelle(px, y, pz, r() * 6, 0.9 + r() * 0.6, b => Deko3D.blume(b, 2.2, Math.round(px * 59 + pz * 11)));
      } else if (wuerfel < dichte * 0.84) {
        B.stelle(px, y - 0.1, pz, 0, 1, b => Deko3D.fels(b, 0.3 + r() * 0.45, Math.round(px * 23 + pz * 41)));
      } else if (abstand > 4 && wuerfel < dichte * 0.88) {
        /* Totholz nur tief im Wald: Am gepflegten Bahnrand läge es falsch. */
        if (r() < 0.5) B.stelle(px, y, pz, 0, 0.8 + r() * 0.5, b => Deko3D.stumpf(b, 2.2, Math.round(px * 83 + pz * 7)));
        else B.stelle(px, y + 0.09, pz, 0, 0.8 + r() * 0.6, b => Deko3D.totholz(b, 2.4, Math.round(px * 29 + pz * 67)));
      }
      /* Und unabhängig davon noch einmal Kleinzeug an anderer Stelle im selben Feld. Ein Feld ist
         einen Meter groß; wenn darin höchstens ein Ding stehen darf, bleibt der Boden zwischen den
         Büschen kahl, und gerade den sieht man beim Zielen aus nächster Nähe. */
      if (abstand < NAH_KRAM && r() < 0.42) {
        const qx = x + r(), qz = z + r();
        if (gl.zumRand(qx, qz) > 0.25 && weitVonBurg(qx, qz)) {
          const qy = gl.hoehe(qx, qz), saat = Math.round(qx * 43 + qz * 79);
          const w = r();
          if (w < 0.6) B.stelle(qx, qy, qz, r() * 6, 0.8 + r() * 0.7, b => Deko3D.grasbueschel(b, 1.4, r() < 0.5 ? '#4f8f35' : '#62a63d', saat));
          else if (w < 0.85) B.stelle(qx, qy, qz, r() * 6, 0.8 + r() * 0.5, b => Deko3D.blume(b, 2, saat));
          else B.stelle(qx, qy - 0.05, qz, r() * 6, 1, b => Deko3D.fels(b, 0.14 + r() * 0.16, saat));
        }
      }
    }
  }

  /* ---------- Der Grasteppich ----------

     Der Weg hierher ging über vier Anläufe, und jeder hat etwas gelernt:

     1. Einzelne Büschel aus Kegeln – „mehr decken und nicht so einzelne Sträucher".
     2. Einzelne Halme als flache Dreiecke, dicht gestreut – „zu stachelig": Einzeln stehende
        Dreiecke geben der Wiese eine Kontur aus lauter Spitzen.
     3. Halme in Horsten, oben stumpf – besser, aber immer noch kantig: Ein Dreieck hat keine
        weiche Kante, und fünfzehn Halme aus Dreiecken kosten hundertfünfzig.
     4. Und schließlich Fynns Fingerzeig auf ein fertiges Spiel: „So wie hier, also nur
        zweieinhalb D."

     **Ein Büschel ist ein gekreuztes Paar bemalter Karten.** Vier Dreiecke zeigen fünfzehn
     gemalte Halme mit Bogen, Verlauf und weicher Spitze – als Geometrie kostete dasselbe das
     Zehnfache und sähe trotzdem kantiger aus. Das Bild dazu wird beim Start gemalt (gl3d.js).

     Dazu liegt auf dem Boden selbst ein zweites gemaltes Bild, eine kachelbare Grasfläche. Die
     Karten geben der Wiese den Umriss, wenn man flach darüberschaut; das Bodenbild gibt ihr die
     Feinheit, wenn man von oben daraufsieht. Beides zusammen ist die Wiese.

     Zwei Regeln halten das Gras vom Holz fern: Es beginnt erst hinter der Bande (die Spielfläche
     reicht bis 0,5, der Balken bis 0,85 – gewachsen wird ab 0,95), und dicht dahinter bleiben die
     Karten niedrig. Und Schatten wirft der Teppich keinen: Der Schattendurchgang rechnet jedes
     Dreieck ein zweites Mal, und der Schatten eines Grashalms ist auf dem Schattenbild schmaler
     als ein Bildpunkt. */
  /* Ein Grasbüschel als gekreuztes Kartenpaar.

     Fynn hat auf ein Bild aus einem fertigen Spiel gezeigt und gesagt: „So wie hier, also nur
     zweieinhalb D." Genau das ist es. Ein Büschel ist keine Ansammlung von Halmen aus Dreiecken,
     sondern zwei flache, aufrecht stehende Karten, auf die ein Büschel gemalt ist – gekreuzt, damit
     es aus jeder Richtung eines ist und nicht von der Seite verschwindet.

     Der Gewinn ist der Grund, warum das jedes Spiel so macht: Vier Dreiecke zeigen fünfzehn
     gemalte Halme, jeder mit Bogen, Verlauf und weicher Spitze. Dieselben fünfzehn Halme als
     Geometrie kosteten das Zehnfache und sähen trotzdem kantiger aus, weil ein Dreieck keine
     weiche Kante hat. Das war der ganze Weg von „zu stachelig" bis hierher.

     Wo sonst die Farbe einer Ecke steht, steht bei den Karten die Stelle im gemalten Bild (x, y)
     und die Helligkeit dieses Büschels (z). Der Schattierer weiß das, weil das Stück als Gras
     gekennzeichnet ist. So braucht keine Ecke eine vierte Angabe, und kein Puffer muss breiter
     werden. */
  function grasKarte(B, px, pz, y, breit, hoch, w, feld, schein, r) {
    const fest = [0, 1, 0];
    /* Der Wind greift oben an; unten steht die Karte im Boden. */
    const kraft = hoch * (0.14 + r() * 0.12);
    const nx = Math.cos(w + Math.PI * 0.5), nz = Math.sin(w + Math.PI * 0.5);
    const wiegen = [nx * kraft, 1, nz * kraft];
    const qx = Math.cos(w) * breit * 0.5, qz = Math.sin(w) * breit * 0.5;
    /* Die vier Felder des Bildes liegen als Zweiertafel nebeneinander; 'feld' wählt eines aus.
       Ein Hauch Rand verhindert, dass beim Verkleinern Farbe aus dem Nachbarfeld hereinblutet. */
    const u0 = (feld % 2) * 0.5 + 0.008, v0 = Math.floor(feld / 2) * 0.5 + 0.008;
    const u1 = u0 + 0.484, v1 = v0 + 0.484;
    const lu = [u0, v1, schein], ru = [u1, v1, schein];     // unten links/rechts
    const lo = [u0, v0, schein], ro = [u1, v0, schein];     // oben links/rechts
    const A = [px - qx, y, pz - qz], Bp = [px + qx, y, pz + qz];
    const C = [px + qx, y + hoch, pz + qz], D = [px - qx, y + hoch, pz - qz];
    B.dreieckBunt(A, Bp, C, fest, fest, wiegen, lu, ru, ro);
    B.dreieckBunt(A, C, D, fest, wiegen, wiegen, lu, ro, lo);
  }

  const GRAS_AB = 0.95;            // hinter der Bande fängt die Wiese an
  const GRAS_VOLL = 7, GRAS_WEIT = 17, GRAS_HORSTE = 7;

  function grasNetz(B, gl, aussenRand) {
    const a = gl.bahn.autoDeko || {};
    const r = M3.zufall((a.saat || 1) * 9091 + 7);
    for (let z = -aussenRand; z < gl.T + aussenRand; z += 1) for (let x = -aussenRand; x < gl.B + aussenRand; x += 1) {
      const dicht = M3.klemm(1 - (gl.zumRand(x + 0.5, z + 0.5) - GRAS_VOLL) / (GRAS_WEIT - GRAS_VOLL), 0, 1);
      if (dicht <= 0) continue;
      const wieViele = GRAS_HORSTE * dicht;
      for (let k = 0; k < GRAS_HORSTE; k++) {
        if (k >= wieViele) break;
        const px = x + r(), pz = z + r();
        const rand = gl.zumRand(px, pz);
        if (rand < GRAS_AB) continue;
        const art = gl.art(px, pz);
        if (art.wasser || art.name === 'Sand') continue;
        const y = gl.hoehe(px, pz);
        /* Dicht an der Bande bleibt das Büschel niedrig, damit keines über den Balken ragt. */
        const hoch = (0.3 + r() * 0.26) * Math.min(1, 0.45 + rand * 0.3);
        const breit = hoch * (1.05 + r() * 0.5);
        const w = r() * M3.TAU3;
        const feld = Math.floor(r() * 4);
        const schein = 0.72 + r() * 0.5;
        grasKarte(B, px, pz, y, breit, hoch, w, feld, schein, r);
        /* Die zweite Karte quer dazu. Ohne sie wird das Büschel beim Drehen der Kamera zu einem
           Strich – der bekannte Preis flacher Karten, und mit zwei Dreiecken bezahlt. */
        grasKarte(B, px, pz, y, breit * (0.8 + r() * 0.3), hoch * (0.85 + r() * 0.25),
          w + Math.PI * 0.5, Math.floor(r() * 4), schein * 0.94, r);
      }
    }
  }

  /* Das Ufer bepflanzen. Gegangen wird über jedes Landfeld, das an ein Wasserfeld grenzt; dort
     kommen Schilf und Kiesel hin. Der Ball rollt durch beides hindurch – sie stehen ein paar
     Zentimeter neben der Kante und zählen für die Kugelrechnung nicht. */
  function uferNetz(B, gl) {
    const r = M3.zufall(1543);
    for (let iz = -1; iz <= gl.T; iz++) for (let ix = -1; ix <= gl.B; ix++) {
      if (gl.zeichen(ix, iz) === 'w') continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (gl.zeichen(ix + dx, iz + dz) !== 'w') continue;
        for (let k = 0; k < 3; k++) {
          /* Auf die dem Wasser zugewandte Hälfte des Feldes setzen, quer dazu gestreut. */
          const x = ix + (dx ? 0.5 + dx * (0.2 + r() * 0.3) : r()), zz = iz + (dz ? 0.5 + dz * (0.2 + r() * 0.3) : r());
          const y = gl.hoehe(x, zz);
          if (r() < 0.62) B.stelle(x, y - 0.04, zz, 0, 1, b => Deko3D.schilf(b, 0.8 + r() * 0.7, Math.round(x * 71 + zz * 29) + k));
          else B.stelle(x, y - 0.06, zz, 0, 1, b => Deko3D.fels(b, 0.08 + r() * 0.09, Math.round(x * 37 + zz * 13) + k));
        }
        break;      // ein Ufer je Feld genügt
      }
    }
  }

  /* Die Kulisse am Horizont. Ohne sie endet die Wiese in einer geraden Kante gegen den Himmel,
     und die Welt sieht aus wie eine Tischplatte.

     Welche Kulisse, sagt die Welt selbst – und das ist keine Kleinigkeit, sondern der Unterschied
     zwischen zwei Landschaften: Im Grasland stehen weiche, weit auseinanderliegende Hügel mit
     Wald darauf. Berge gehören in die Welt „Wolkengipfel" und nirgendwo sonst; ein Gebirgszug
     hinter einer Kuhweide sagt dem Auge „Alpen", und dann ist es eben keine Wiese mehr.

     Gemeinsam ist beiden der Aufbau in Reihen: Je weiter hinten, desto höher, blasser und blauer.
     So entsteht Luftperspektive – dieselbe, die auf jedem gemalten Bild die Ferne macht. */
  const KULISSEN = {
    /* Sanfte Kuppen, nichts Spitzes. Die Kuppe ist eine flachgedrückte Kugel, deren untere Hälfte
       im Boden steckt: eine Form ohne Kante und ohne Spitze, und genau das macht einen Hügel. */
    huegel: [
      { saat: 6173, n: 22, d: 1.12, h: [7, 6], breit: 2.2, fuss: '#63954b', spitze: '#77aa57', wald: 0.5 },
      { saat: 9241, n: 18, d: 1.45, h: [10, 8], breit: 2.2, fuss: '#5f8f57', spitze: '#7ba86c', wald: 0.3 },
      { saat: 4517, n: 16, d: 1.9, h: [14, 9], breit: 2.2, fuss: '#6d9070', spitze: '#8fae8c', wald: 0 },
    ],
    berge: [
      { saat: 6173, n: 30, d: 0.86, h: [4, 7], fuss: '#5c8b47', spitze: '#6d9c52' },
      { saat: 9241, n: 26, d: 1.22, h: [8, 11], fuss: '#5b8560', spitze: '#78a37e' },
      { saat: 4517, n: 22, d: 1.62, h: [15, 15], fuss: '#6f8d94', spitze: '#cfdce1', fels: '#8fa2ab' },
    ],
  };

  function fernNetz(B, gl, welt) {
    const mx = gl.B / 2, mz = gl.T / 2;
    const grund = gl.hoehe(mx, mz);
    const weite = Math.max(gl.B, gl.T) * 0.5 + 34;
    const reihen = KULISSEN[(welt && welt.ferne) || 'berge'] || KULISSEN.berge;
    for (const reihe of reihen) {
      const r = M3.zufall(reihe.saat);
      for (let i = 0; i < reihe.n; i++) {
        const a = (i + r() * 0.85) / reihe.n * M3.TAU3;
        const d = weite * reihe.d * (0.9 + r() * 0.3);
        const h = reihe.h[0] + r() * reihe.h[1];
        const x = mx + Math.cos(a) * d, z = mz + Math.sin(a) * d;
        if (reihe.breit === undefined) {
          B.stelle(x, grund - 3 - reihe.d * 2, z, r() * 6, 1, b => {
            b.walze(h * (0.9 + r() * 0.7), h * 0.12, h + 3, 7, reihe.fuss, null, 0, reihe.spitze);
            /* Ein Felskragen auf zwei Dritteln der Höhe: Darüber liegt der helle Gipfel, darunter
               das bewachsene Fußstück. Die Grenze ist das, was einen Berg von einem Hügel trennt. */
            if (reihe.fels) b.mit(M3.verschieben(0, (h + 3) * 0.66, 0),
              c => c.walze(h * 0.32, h * 0.16, (h + 3) * 0.2, 7, reihe.fels, null, 0, reihe.spitze));
          });
          continue;
        }
        /* Der Halbmesser wird begrenzt, und zwar an seinem eigenen Abstand: Eine Kuppe darf nie so
           breit werden, dass ihr naher Rand die Bahn erreicht. Genau das war passiert, als die
           Kuppen mit der Welt mitwuchsen – die hinterste Reihe hatte neunzig Felder Halbmesser bei
           siebenundachtzig Feldern Abstand und lag damit als dunkle Fläche über der halben
           Landschaft. Von der Bahn aus sah man davon nichts, in der Übersicht die Hälfte des
           Bildes. */
        const rr = Math.min(h * reihe.breit * (0.8 + r() * 0.5), d * 0.42);
        B.stelle(x, grund - h * 0.55, z, r() * 6, 1, b => {
          b.mit(M3.skalieren(1, (h + h * 0.55) / rr, 1),
            c => c.kugel(rr, 4, 9, reihe.fuss, 0.07, i * 17 + 5, reihe.spitze));
        });
        /* Ein paar Bäume auf der Kuppe. Ein nackter grüner Buckel sieht aus wie ein Golfplatz;
           erst der Bewuchs macht daraus Landschaft. */
        if (reihe.wald) for (let k = 0; k < 7; k++) {
          if (r() > reihe.wald) continue;
          const wa = r() * M3.TAU3, wd = rr * (0.15 + r() * 0.5);
          const wy = grund + h * Math.sqrt(Math.max(0, 1 - (wd / rr) ** 2)) - 0.3;
          B.stelle(x + Math.cos(wa) * wd, wy, z + Math.sin(wa) * wd, r() * 6, 1,
            b => Deko3D.fernbaum(b, 4.5 + r() * 4, r() < 0.55, i * 31 + k));
        }
      }
    }
  }

  /* Der Himmel: eine Halbkugel, deren Ecken schon die fertige Farbe tragen, und ein paar Wolken
     weit draußen. Beides bekommt kein Licht und wirft keinen Schatten. Weil die Halbkugel mit der
     Kamera mitwandert, reicht ein kleiner Halbmesser – sie ist immer gleich weit weg. */
  function himmelNetz(B, welt) {
    const oben = Bauen.farbe(welt.himmelOben || '#2f7fc8'), unten = Bauen.farbe(welt.himmelUnten || '#bfe3f5');
    /* Viele schmale Ringe. Der Himmel ist ein Farbverlauf, und ein Verlauf aus zehn Stufen sieht
       man als Streifen – gerade an einem großen, ruhigen Himmel fällt das sofort auf. Zwanzig
       Ringe kosten achthundert Dreiecke, also nichts, und der Verlauf ist glatt. */
    const R = 1, ringe = 20, kanten = 22;
    const punkt = (i, j) => {
      const t = i / ringe * (Math.PI * 0.54), a = j / kanten * M3.TAU3;
      const st = Math.sin(t);
      return [st * Math.cos(a) * R, Math.cos(t) * R * 0.62 - 0.12, st * Math.sin(a) * R];
    };
    for (let i = 0; i < ringe; i++) for (let j = 0; j < kanten; j++) {
      /* Die Farbe wird in der Mitte des jeweiligen Dreiecks genommen, nicht an seiner Oberkante –
         sonst liegt der Verlauf um einen halben Ring daneben. */
      const f0 = Bauen.mischen(unten, oben, M3.weich(1 - (i + 0.33) / ringe) ** 0.8);
      const f1 = Bauen.mischen(unten, oben, M3.weich(1 - (i + 0.67) / ringe) ** 0.8);
      const a = punkt(i, j), b = punkt(i, j + 1), c = punkt(i + 1, j + 1), d = punkt(i + 1, j);
      /* Von innen gesehen – die Kamera steht in der Kuppel. Darum die umgekehrte Windung. */
      B.dreieck(a, d, c, f0); B.dreieck(a, c, b, f1);
    }
  }

  function wolkenNetz(B, gl) {
    const r = M3.zufall(31337);
    const mx = gl.B / 2, mz = gl.T / 2;
    for (let i = 0; i < 16; i++) {
      /* Weit draußen und hoch oben. Näher gesetzt hängen sie aus der Übersicht heraus mitten
         über der Bahn und verdecken sie. */
      const a = r() * M3.TAU3, d = 40 + r() * 42;
      B.stelle(mx + Math.cos(a) * d, 22 + r() * 13, mz + Math.sin(a) * d, r() * 6, 2.2 + r() * 3,
        b => Deko3D.wolke(b, 1, i * 7 + 2));
    }
  }

  /* ---------- Der Zielpfeil ----------
     Er liegt nicht auf einer Höhe, sondern **auf dem Boden** – wie eine aufgemalte Linie, die
     jeder Kuppe und jeder Mulde folgt.

     Vorher war er eine einzige flache Scheibe auf Ballhöhe, gedreht und in die Länge gezogen.
     Auf ebener Bahn sah das gut aus; sobald es vor dem Ball anstieg, verschwand die vordere
     Hälfte im Hang – und ausgerechnet dort, wo der Hang etwas mit dem Schlag macht, sah man am
     wenigsten. Dazu zog das Langziehen die Spitze mit in die Länge: Bei vollem Schlag war aus dem
     Pfeil ein Speer geworden.

     Jetzt besteht er aus einer Kette von Abschnitten. Jeder fragt das Gelände nach seiner Höhe,
     und die Spitze hat ihre eigene, feste Länge. Die Zahl der Abschnitte bleibt immer gleich –
     nur so lässt sich das Gitter einmal anlegen und danach bei jedem Bild nur noch neu füllen. */
  const PFEIL_SCHAFT = 14;                 // Abschnitte im geraden Teil
  const PFEIL_STATIONEN = PFEIL_SCHAFT + 5;
  const PFEIL_ECKEN = (PFEIL_STATIONEN - 1) * 6;
  const PFEIL_KOPF = 0.6;                  // Länge der Spitze in Feldern
  const PFEIL_BREIT = 0.075, PFEIL_KOPF_BREIT = 0.21, PFEIL_HOCH = 0.05, PFEIL_START = 0.16;

  function pfeilNeu() {
    const e = new Float32Array(PFEIL_ECKEN * 9);
    const ix = new Uint16Array(PFEIL_ECKEN);
    for (let i = 0; i < PFEIL_ECKEN; i++) { ix[i] = i; e[i * 9 + 4] = 1; }   // Normale zeigt nach oben
    return { e, ix };
  }

  /* Füllt die Ecken neu. 'laenge' ist die Gesamtlänge ab dem Ball. */
  function pfeilFrisch(e, gl, x, z, dx, dz, laenge) {
    const kopf = Math.min(PFEIL_KOPF, laenge * 0.45);
    const schaftEnde = Math.max(0.05, laenge - kopf);
    const px = dz, pz = -dx;                                  // quer zur Richtung
    const hell = Bauen.farbe('#fdfbf2'), spitz = Bauen.farbe('#ffd04a');

    const station = i => {
      let d, halb, f;
      if (i <= PFEIL_SCHAFT) { d = schaftEnde * (i / PFEIL_SCHAFT); halb = PFEIL_BREIT; f = hell; }
      else {
        const k = i - PFEIL_SCHAFT - 1;                       // 0 … 3 über die Spitze
        d = schaftEnde + kopf * (k / 4);
        halb = PFEIL_KOPF_BREIT * (1 - k / 4);
        f = spitz;
      }
      return { d: d + PFEIL_START, halb, f };
    };
    const punkt = (st, seite, raus) => {
      const ax = x + dx * st.d + px * st.halb * seite;
      const az = z + dz * st.d + pz * st.halb * seite;
      raus[0] = ax; raus[1] = gl.hoehe(ax, az) + PFEIL_HOCH; raus[2] = az;
      return raus;
    };
    const A = [0, 0, 0], Bp = [0, 0, 0], C = [0, 0, 0], D = [0, 0, 0];
    let v = 0;
    const setze = (p, f) => { const o = v * 9; e[o] = p[0]; e[o + 1] = p[1]; e[o + 2] = p[2];
      e[o + 6] = f[0]; e[o + 7] = f[1]; e[o + 8] = f[2]; v++; };
    for (let i = 0; i < PFEIL_STATIONEN - 1; i++) {
      const s0 = station(i), s1 = station(i + 1);
      punkt(s0, -1, A); punkt(s1, -1, D); punkt(s1, 1, C); punkt(s0, 1, Bp);
      const f = s1.f;
      setze(A, f); setze(D, f); setze(C, f);
      setze(A, f); setze(C, f); setze(Bp, f);
    }
    return e;
  }

  /* ---------- Das bewegliche Beiwerk ----------
     Ball, Fahnentücher und Mühlenflügel. Sie bekommen je ein kleines eigenes Gitter, das mit einer
     Lage verschoben und gedreht wird – das Tuch wird zusätzlich bei jedem Bild neu gerechnet. */

  const TUCH_LAENGS = 7, TUCH_QUER = 3;
  /* Jede Masche wird viermal gebaut: zwei Dreiecke vorn, zwei hinten. Ein Tuch hat zwei Seiten,
     und beide sollen zu sehen sein – die Rückseite bekommt einen dunkleren Ton, sonst wirkt die
     Fahne beim Umschlagen wie aus Papier. */
  const TUCH_ECKEN = TUCH_LAENGS * TUCH_QUER * 12;

  /* Ein Tuch entsteht einmal und wird danach nur noch nachgerechnet. Das ist kein vorgezogenes
     Sparen: Bei sechs Fahnen und sechzig Bildern wären es sonst über tausend neu erzeugte Felder
     je Sekunde, und die Aufräumarbeit dafür sieht man als Ruckeln. */
  function tuchNeu(farbe) {
    const e = new Float32Array(TUCH_ECKEN * 9);
    const ix = new Uint16Array(TUCH_ECKEN);
    for (let i = 0; i < TUCH_ECKEN; i++) ix[i] = i;
    const v = Bauen.farbe(farbe), h = Bauen.stufe(farbe, 0.74);
    for (let z = 0; z < TUCH_ECKEN; z++) {
      const c = (z % 12) < 6 ? v : h;
      e[z * 9 + 6] = c[0]; e[z * 9 + 7] = c[1]; e[z * 9 + 8] = c[2];
    }
    return { e, ix };
  }

  /* Die Welle läuft vom Mast zur Spitze und wird dabei größer – am Mast ist das Tuch
     festgebunden, am freien Ende schlägt es aus. Die Normalen werden je Dreieck aus den drei
     Ecken gerechnet; ein Tuch ist flächig, kein runder Körper. */
  function tuchFrisch(e, laenge, hoehe, zeit, phase) {
    const punkt = (i, j, raus) => {
      const u = i / TUCH_LAENGS, v = j / TUCH_QUER;
      const w = Math.sin(u * 5.2 - zeit * 6 + phase) * u * 0.26 + Math.sin(u * 2.4 - zeit * 3.4 + phase) * u * 0.14;
      raus[0] = u * laenge; raus[1] = -v * hoehe + w * 0.5 * (0.4 + v); raus[2] = w;
      return raus;
    };
    const a = [0, 0, 0], b = [0, 0, 0], c = [0, 0, 0], d = [0, 0, 0];
    let z = 0;
    const dreieck = (p0, p1, p2) => {
      const ux = p1[0] - p0[0], uy = p1[1] - p0[1], uz = p1[2] - p0[2];
      const vx = p2[0] - p0[0], vy = p2[1] - p0[1], vz = p2[2] - p0[2];
      let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
      const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
      for (const p of [p0, p1, p2]) {
        const o = z * 9;
        e[o] = p[0]; e[o + 1] = p[1]; e[o + 2] = p[2];
        e[o + 3] = nx; e[o + 4] = ny; e[o + 5] = nz;
        z++;
      }
    };
    for (let i = 0; i < TUCH_LAENGS; i++) for (let j = 0; j < TUCH_QUER; j++) {
      punkt(i, j, a); punkt(i + 1, j, b); punkt(i + 1, j + 1, c); punkt(i, j + 1, d);
      dreieck(a, b, c); dreieck(a, c, d);
      dreieck(a, c, b); dreieck(a, d, c);
    }
    return e;
  }

  return { ART, artVon, gelaende, gelaendeNetz, lochNetz, wasserNetz, felsenNetz, bandenNetz, burgNetz, dekoNetz,
    dekoOrt, dekoOrte, dekoFuss,
    streuenNetz, grasNetz, uferNetz, fernNetz, himmelNetz, wolkenNetz, tuchNeu, tuchFrisch,
    pfeilNeu, pfeilFrisch };
})();
