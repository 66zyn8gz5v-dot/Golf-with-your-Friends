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
    '#': { name: 'Fairway', zaeh: 0.38, reibung: 0.40, haft: 1.25, gemaeht: 1, farbe: '#7cc84a', farbe2: '#5da635' },
    'T': { name: 'Abschlag', zaeh: 0.38, reibung: 0.40, haft: 1.25, gemaeht: 1, farbe: '#90d45c', farbe2: '#70b843' },
    'H': { name: 'Grün', zaeh: 0.33, reibung: 0.34, haft: 1.05, gemaeht: 0.5, farbe: '#8cd657', farbe2: '#6fbe42' },
    ',': { name: 'Rough', zaeh: 1.5, reibung: 1.6, haft: 2.4, farbe: '#4e8f33', farbe2: '#447f2c', rau: 0.055 },
    's': { name: 'Sand', zaeh: 3.0, reibung: 5.0, haft: 4.5, farbe: '#e6d3a0', farbe2: '#d8c28c', rau: 0.02 },
    'w': { name: 'Wasser', zaeh: 1.2, reibung: 1.2, haft: 1.2, wasser: true, farbe: '#3a7a52', farbe2: '#33694a' },
    'x': { name: 'Fels', zaeh: 0.6, reibung: 0.6, haft: 1.2, wand: true, farbe: '#6f9a45', farbe2: '#638c3e' },
    'o': { name: 'Kante', zaeh: 0.38, reibung: 0.40, haft: 1.25, gemaeht: 1, offen: true, farbe: '#7cc84a', farbe2: '#5da635' },
    /* Die Rampe ist gebautes Holz, kein Gras: Sie rollt schneller als das Fairway und hält
       weniger – wer oben nicht ankommt, kommt zurück. Ihre Höhe steht nicht hier, sondern in
       'gelaende.rampen'; dieses Zeichen sagt nur, wo die Bretter liegen. */
    'r': { name: 'Rampe', zaeh: 0.3, reibung: 0.3, haft: 1.6, farbe: '#a9793f', farbe2: '#9a6c37' },
    /* Die Brücke steht in keiner Karte. Sie kommt aus 'gelaende.bruecken', und die Kugelrechnung
       bekommt sie überall dort zu sehen, wo Bretter über dem Wasser liegen: Dort gilt nicht die
       Kachel darunter – sonst ertränke ein Ball, der trocken über dem Bach rollt. */
    'b': { name: 'Brücke', zaeh: 0.32, reibung: 0.34, haft: 1.5, farbe: '#b8a684', farbe2: '#a89774' },
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
    /* Brücken. Anders als eine Rampe ist eine Brücke kein Summand in der Höhenformel, sondern
       eine zweite Ebene: Unter ihr bleibt der Graben ein Graben, über ihr liegen Bretter. Deshalb
       gibt es ab hier zwei Höhen – 'boden' für alles, was gezeichnet wird, und 'hoehe' für den
       Ball. Überall sonst sind beide gleich; nur auf den paar Feldern einer Brücke gehen sie
       auseinander.

       Sie stehen absichtlich nur längs oder quer, nie schräg: Die Kugelrechnung kennt als Wand
       ausschließlich achsenparallele Rechtecke (siehe 'wand' weiter unten), und ein schräges
       Geländer wäre eine neue Rechnung für ein einziges Bauwerk. 'dreh' ist darum keine freie
       Zahl, sondern eine Vierteldrehung: 0 heißt, man fährt in z-Richtung darüber. */
    const bruecken = (g.bruecken || []).map(br => {
      const quer = Math.abs(Math.round((br.dreh || 0) / (Math.PI / 2))) % 2 === 1;
      const lang = br.lang === undefined ? 4.5 : br.lang;
      const breit = br.breit === undefined ? 1.8 : br.breit;
      const wange = br.wange === undefined ? 0.22 : br.wange;
      /* 'scheitel' hebt die Fahrbahn über das Ufer. Bündig war der erste Versuch, und er war
         spielerisch tadellos und optisch nichts: ein Holzweg im Rasen. Eine Brücke muss man von
         der Bahn aus als Bauwerk erkennen, sonst zielt niemand darauf.

         'auffahrt' ist die Strecke an jedem Ende, über die sie sich hebt. Sie darf nicht kurz
         sein: Höhe durch Strecke ist die Steigung, und wo die über ein Fünftel geht, kommt ein
         Ball mit wenig Schwung nicht hinauf, sondern zurück. */
      return { x: br.x, z: br.z, quer, lang, breit, wange,
        scheitel: br.scheitel === undefined ? 0.2 : br.scheitel,
        auffahrt: br.auffahrt === undefined ? 1.2 : br.auffahrt,
        halbX: (quer ? lang : breit) / 2, halbZ: (quer ? breit : lang) / 2 };
    });

    /* Röhren: liegende hohle Baumstämme quer über die Bahn. Anders als eine Brücke brauchen sie
       keine zweite Ebene – der Ball bleibt die ganze Zeit auf dem Boden, er läuft nur durch etwas
       hindurch statt darüber. Deshalb sind sie nichts weiter als zwei Klötze mit einer Lücke
       dazwischen, und die Kugelrechnung muss gar nicht wissen, dass es eine Röhre ist.

       Wie die Brücken stehen sie nur längs oder quer, weil die Kugelrechnung als Wand
       ausschließlich achsenparallele Rechtecke kennt. */
    const roehren = (rr => rr.map(ro => {
      const quer = Math.abs(Math.round((ro.dreh || 0) / (Math.PI / 2))) % 2 === 1;
      return { x: ro.x, z: ro.z, quer,
        lang: ro.lang === undefined ? 3 : ro.lang,
        weite: ro.weite === undefined ? 0.8 : ro.weite,
        dick: ro.dick === undefined ? 0.62 : ro.dick };
    }))(g.roehren || []);

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
    /* Wie weit die Uferböschung ins Trockene reicht. Schmaler zu machen war ein Versuch, das
       Zurückrollen ins Wasser zu beheben, und er ging nach hinten los: Eine scharfe Kante liest
       sich für die Platzsuche nach einem Bad als „hier ist es eben und trocken", und der Ball
       wurde danach noch dichter ans Wasser gelegt. Der Trichter bleibt; geholfen hat stattdessen,
       den Ablageplatz selbst strenger zu prüfen (siehe sicherOrt in physik3d.js). */
    const SENKE = 0.45, WASSERTIEFE = 0.5, UFER_BREIT = 1.3;
    const s = M3.weich;
    const stufe = (v, a, b) => s(M3.klemm((v - a) / (b - a), 0, 1));

    function boden(x, z) {
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
      y -= WASSERTIEFE * stufe(zumUfer(x, z), 0.0, UFER_BREIT);
      return y;
    }

    /* Das Ufer an dieser Stelle: der Boden, aber ohne den Abzug fürs Wasser. Der Abzug wird hier
       wieder hinzugerechnet und nicht etwa weggelassen, damit beides dieselbe Formel bleibt –
       ändert sich die Wassertiefe, ändert sich die Fahrbahn von selbst mit. */
    const ufer = (x, z) => boden(x, z) + WASSERTIEFE * stufe(zumUfer(x, z), 0.0, UFER_BREIT);
    /* Die Scheitelhöhe einer Brücke: das Ufer an ihrer Mitte, plus ihr Scheitel. */
    const fahrbahn = br => ufer(br.x, br.z) + br.scheitel;

    /* Wie viel Brücke liegt hier? 1 auf den Brettern, 0 daneben – für die Höhe.

       Der Abfall beginnt erst an der AUSSENkante des Geländers und nicht an der Fahrbahnkante.
       Das ist wichtig: Eine senkrechte Kante hätte unendliche Neigung, und die Kugelrechnung
       bekäme Unsinn zu essen – dieselbe Überlegung wie bei den Rampen. Läge der Abfall aber unter
       der Fahrbahn, hinge der Ball dort an einer Schräge und würde ans Geländer gedrückt. So ist
       die Fahrbahn über ihre ganze Breite eben, und die Böschung versteckt sich unter dem
       Geländer, wo kein Ball je hinkommt. */
    const KANTE = 0.3;
    /* Quer ist die Grenze scharf (sie liegt unter dem Geländer), längs sanft (das ist die
       Auffahrt). Beides mit derselben Weichheit zu machen, war der Fehler des ersten Versuchs:
       Dann ist entweder die Auffahrt eine Stufe oder die Fahrbahn eine Dachrinne. */
    function deckungVon(br, x, z) {
      const q = Math.abs(br.quer ? z - br.z : x - br.x) - br.wange;
      const l = Math.abs(br.quer ? x - br.x : z - br.z);
      const hq = br.quer ? br.halbZ : br.halbX, hl = br.quer ? br.halbX : br.halbZ;
      return (1 - stufe(q, hq, hq + KANTE)) * (1 - stufe(l, hl - br.auffahrt, hl));
    }

    /* Steht der Ball auf den Brettern? Hier wird hart gefragt und nicht weich: Ein Ball ist
       entweder auf der Brücke oder daneben im Wasser; halb nass gibt es nicht. Die Grenze ist die
       Innenkante des Geländers, genau die Linie, an der der Ball abprallt. */
    const aufBruecke = (x, z) => bruecken.some(br =>
      Math.abs(x - br.x) <= br.halbX && Math.abs(z - br.z) <= br.halbZ);

    /* Die Höhe, auf der der Ball liegt. Ohne Brücken ist das der Boden – und weil 'bruecken' fast
       immer leer ist, kostet die Abfrage auch fast nichts. */
    /* Die Höhe, auf der der Ball liegt: der Boden, und über einer Brücke deren Fahrbahn. Genommen
       wird der höhere Wert – eine Brücke hebt den Weg, sie senkt ihn nie. Ohne Brücken ist es der
       Boden selbst, und weil 'bruecken' fast immer leer ist, kostet das auch nichts. */
    const hoehe = bruecken.length
      ? (x, z) => {
        let y = boden(x, z);
        for (const br of bruecken) {
          const d = deckungVon(br, x, z);
          if (d > 0) y = Math.max(y, M3.misch(boden(x, z), ufer(x, z) + br.scheitel, d));
        }
        return y;
      }
      : boden;

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
      felsen.push({ x0: ix, z0: iz, x1: ix + 1, z1: iz + 1, oben: boden(ix + 0.5, iz + 0.5) + 0.95 });
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
        kanten.push({ ix, iz, dx, dz, y: boden(ix + 0.5, iz + 0.5) });
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
    /* Die Geländer. Zwei Blöcke je Brücke, links und rechts der Fahrbahn, gerechnet wie eine
       Bande: Ein rollender Ball prallt ab, ein springender fliegt darüber und landet im Bach.
       Sie sind der einzige Grund, warum eine Brücke spielbar ist – ohne sie führte sie über einen
       Balken ohne Rand, und jeder zweite Ball fiele seitlich hinunter. */
    const gelaender = [];
    for (const br of bruecken) {
      /* Die Oberkante wird am Scheitel gemessen, nicht an der Auffahrt: Ein Geländer, das an
         seinem niedrigsten Punkt gemessen ist, lässt einen schnellen Ball oben darüber. */
      const oben = fahrbahn(br) + BANDE_HOCH;
      /* Die Geländer sind ein Stück länger als die Bretter: An der Auffahrt soll der Ball schon
         geführt werden, bevor unter ihm das Wasser anfängt. */
      const lx = br.halbX + (br.quer ? 0.5 : 0), lz = br.halbZ + (br.quer ? 0 : 0.5);
      for (const seite of [-1, 1]) {
        if (br.quer) gelaender.push({ x0: br.x - lx, x1: br.x + lx,
          z0: br.z + seite * br.halbZ - (seite < 0 ? br.wange : 0), z1: br.z + seite * br.halbZ + (seite > 0 ? br.wange : 0),
          oben, bande: true });
        else gelaender.push({ z0: br.z - lz, z1: br.z + lz,
          x0: br.x + seite * br.halbX - (seite < 0 ? br.wange : 0), x1: br.x + seite * br.halbX + (seite > 0 ? br.wange : 0),
          oben, bande: true });
      }
    }

    /* Die Röhren, als Sperren gerechnet: links und rechts der Öffnung je ein Klotz, der bis weit
       über die Bahn hinausreicht. Die Innenkanten dieser beiden Klötze SIND die Röhrenöffnung –
       derselbe Trick wie bei den Banden, wo man nur die Vorderseite eines dicken Klotzes sieht.

       Die Oberkante liegt am Scheitel des Stamms: Ein rollender Ball prallt ab, ein springender
       fliegt darüber. Das ist bei einem Stamm von zwei Dritteln Feld Höhe die Ausnahme, aber es
       ist dieselbe Regel wie überall sonst, und darum muss sie niemand eigens lernen. */
    const roehrenWand = [];
    for (const ro of roehren) {
      const oben = boden(ro.x, ro.z) + ro.dick * 2;
      const halbLang = ro.lang / 2, halbWeit = ro.weite / 2;
      /* Die Sperre reicht genau bis zur Rinde und keinen Finger weiter. Im ersten Versuch stand
         hier eine Zahl von dreißig Feldern, damit die Röhre „die ganze Bahn sperrt" – dann sieht
         man einen schmalen Stamm und läuft rechts daneben gegen eine unsichtbare Wand. Ein
         liegender Stamm ist von oben gesehen ein Rechteck, und genau das ist er hier auch. */
      for (const seite of [-1, 1]) {
        const a = halbWeit, b = ro.dick;
        if (ro.quer) roehrenWand.push({ x0: ro.x - halbLang, x1: ro.x + halbLang,
          z0: ro.z + (seite < 0 ? -b : a), z1: ro.z + (seite < 0 ? -a : b), oben });
        else roehrenWand.push({ z0: ro.z - halbLang, z1: ro.z + halbLang,
          x0: ro.x + (seite < 0 ? -b : a), x1: ro.x + (seite < 0 ? -a : b), oben });
      }
    }

    /* Eine Liste für die Kugelrechnung: Felsnadeln, Banden, Brückengeländer und Röhren zusammen. */
    const wand = [...felsen, ...banden.values(), ...gelaender, ...roehrenWand];

    const finde = ch => {
      for (let iz = 0; iz < T; iz++) { const ix = karte[iz].indexOf(ch); if (ix >= 0) return [ix + 0.5, iz + 0.5]; }
      return null;
    };

    /* Wo Bretter liegen, gilt das Brett und nicht die Kachel darunter – sonst ertränke ein Ball,
       der trocken über dem Bach rollt. */
    const art = bruecken.length
      ? (x, z) => (aufBruecke(x, z) ? ART['b'] : artVon(zeichenAn(x, z)))
      : (x, z) => artVon(zeichenAn(x, z));

    return { bahn, B, T, zeichen, zeichenAn, art,
      hoehe, boden, neigung, felsen, wand, kanten, bruecken, roehren, fahrbahn, aufBruecke, BANDE_HOCH, zumRand, RAND,
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
    for (let j = 0; j <= nz; j++) for (let i = 0; i <= nx; i++) hh[j * (nx + 1) + i] = gl.boden(x0 + i * S, z0 + j * S);
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

         Auf den gemähten Flächen liegt ein Karomuster: ein Feld hell, ein Feld dunkel, wie auf
         einem gemähten Minigolfrasen. Hier standen einmal Mähstreifen, weil ein früherer Versuch
         mit Karos „über die ganze Wiese schrie" – der wechselte die Farbe aber von Masche zu
         Masche, also alle halben Felder, und das ist kein Rasenmuster mehr, sondern ein Flimmern.
         Ein ganzes Feld je Karo ist ruhig genug und sagt sofort: Hier wird gespielt, dort nicht. */
      const karo = Math.abs(Math.floor(mx) + Math.floor(mz)) % 2 === 0;
      let f = Bauen.farbe(a.gemaeht && karo ? a.farbe2 : a.farbe);
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
      if (gl.zeichen(ix + dx, iz + dz) !== 'w') spiegel = Math.max(spiegel, gl.boden(ix + 0.5 + dx * 0.9, iz + 0.5 + dz * 0.9));
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
      const unten = gl.boden(mx, mz) - 0.5;
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
    zwerg:      { mal: 1.6, fuss: 0.25 },
    pilze:      { mal: 1.6, fuss: 0 },
    schild:     { mal: 1.5, fuss: 0.45 },
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
        case 'zwerg': {
          /* Der Zwerg schaut zur Bahn. Ohne das steht er irgendwo herum; mit Blick auf die Bahn
             gehört er dazu. Die Richtung kommt aus dem Abstandsfeld – dessen Anstieg zeigt von der
             Bahn fort, also schaut er dorthin zurück. */
          const e = 0.3, gx = gl.zumRand(d.x + e, d.z) - gl.zumRand(d.x - e, d.z);
          const gz = gl.zumRand(d.x, d.z + e) - gl.zumRand(d.x, d.z - e);
          const hin = (d.dreh !== undefined) ? d.dreh : Math.atan2(-gx, -gz);
          B.stelle(d.x, h, d.z, hin, 1, b => Deko3D.gartenzwerg(b, d.g, Math.round(d.x * 53 + d.z * 19)));
          break;
        }
        case 'pilze': B.stelle(d.x, h, d.z, d.dreh || 0, 1, b => Deko3D.fliegenpilz(b, d.g, Math.round(d.x * 41 + d.z * 23))); break;
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

  /* ---------- Die begehbaren Brücken ----------

     Gezeichnet wird aus genau denselben Zahlen, aus denen gerechnet wird: 'gl.bruecken' sagt, wo
     die Fahrbahn liegt und wie breit sie ist, 'gl.fahrbahn' sagt, wie hoch. Das ist keine
     Bequemlichkeit, sondern die Bedingung dafür, dass die Brücke überhaupt spielbar ist – ein
     Geländer, das woanders steht als der Klotz in der Kugelrechnung, lässt den Ball an Luft
     abprallen oder durch Holz rollen.

     Holz und nicht Stein: Die Banden dieser Bahnen sind Holzbalken, und eine Steinbrücke
     dazwischen sähe aus wie von einer anderen Bahn geliehen. */
  function brueckenNetz(B, gl) {
    for (const br of gl.bruecken) {
      const dreh = br.quer ? Math.PI / 2 : 0;
      /* Gerechnet wird in Fahrtrichtung: 't' läuft von einem Ende zum anderen, 'ort' macht daraus
         eine Stelle auf der Bahn. So gibt es die Geometrie nur einmal, längs wie quer. */
      const hl = (br.quer ? br.halbX : br.halbZ), hb = br.breit / 2, w = br.wange;
      const ort = t => br.quer ? [br.x + t, br.z] : [br.x, br.z + t];
      /* Jedes Stück sitzt auf der Höhe, die die Kugelrechnung an dieser Stelle liefert – deshalb
         folgen Bretter und Geländer der Auffahrt ganz von selbst, und ein Ball rollt nie über ein
         Brett, das woanders liegt als seine Fahrbahn. */
      const y = t => { const [px, pz] = ort(t); return gl.hoehe(px, pz); };

      const bretter = Math.max(8, Math.round(br.lang / 0.32));
      const dick = br.lang / bretter;
      const zt = M3.zufall(Math.round(br.x * 71 + br.z * 29) + 3);
      for (let i = 0; i < bretter; i++) {
        const t = -hl + (i + 0.5) * dick;
        const [px, pz] = ort(t);
        /* Jedes Brett eine Spur anders getönt – aber nur eine Spur. Beim ersten Versuch war der
           Unterschied dreimal so groß, und die Brücke sah aus wie eine Treppe. */
        const ton = Bauen.stufe('#a8834f', 0.92 + zt() * 0.17);
        B.stelle(px, y(t) - 0.055, pz, dreh, 1,
          c => c.kasten(br.breit + w * 2, 0.11, dick * 0.88, ton, Bauen.stufe(ton, 1.1)));
      }

      /* Zwei Längsträger unter den Brettern, auf denen sie sichtbar aufliegen – in Stücken, damit
         sie der Wölbung folgen. */
      for (let i = 0; i < bretter; i++) {
        const t = -hl + (i + 0.5) * dick;
        const [px, pz] = ort(t);
        for (const sx of [-1, 1]) B.stelle(px, y(t) - 0.2, pz, dreh, 1,
          c => c.mit(M3.verschieben(sx * (hb - 0.02), 0, 0), d => d.kasten(0.16, 0.2, dick, '#6d5433', '#856741')));
      }

      /* Vier Pfähle im Bach. Der erste Versuch hatte an beiden Enden einen massiven Klotz, und der
         sah von vorn aus wie eine Steinplatte im Rasen: Er verdeckte das Wasser, das die Brücke
         doch gerade überspannen soll. Pfähle lassen den Bach darunter durchlaufen, und erst
         dadurch sieht man überhaupt, dass hier etwas überbrückt wird. */
      for (const st of [-0.38, 0.38]) {
        const t = st * br.lang, [px, pz] = ort(t), py = y(t);
        for (const sx of [-1, 1]) B.stelle(px, py - 1.4, pz, dreh, 1,
          c => c.mit(M3.verschieben(sx * (hb - 0.02), 0, 0), d => d.walze(0.085, 0.1, 1.1, 6, '#6d5433', null)));
        /* Ein Querriegel unter den Pfahlköpfen – er hält sie sichtbar zusammen und nimmt der
           Brücke das Gestelzte. */
        B.stelle(px, py - 0.36, pz, dreh, 1, c => c.kasten(br.breit + w, 0.11, 0.13, '#5d4830', '#6d5433'));
      }

      /* Das Geländer. Es steht genau auf der Linie, an der der Ball abprallt: innen bei hb, außen
         bei hb + w – dieselben Zahlen wie im Klotz der Kugelrechnung. Der Handlauf läuft in
         Stücken von Pfosten zu Pfosten und folgt damit der Wölbung. */
      const pfosten = Math.max(4, Math.round(br.lang / 0.85));
      for (let i = 0; i <= pfosten; i++) {
        const t = -hl + i * (br.lang / pfosten), [px, pz] = ort(t);
        for (const sx of [-1, 1]) B.stelle(px, y(t), pz, dreh, 1,
          c => c.mit(M3.verschieben(sx * (hb + w / 2), 0.2, 0), d => d.kasten(w * 0.75, 0.5, w * 0.75, '#6d5433', '#8a6b43')));
      }
      for (let i = 0; i < pfosten; i++) {
        const t0 = -hl + i * (br.lang / pfosten), t1 = t0 + br.lang / pfosten;
        const tm = (t0 + t1) / 2, [px, pz] = ort(tm);
        const lang = br.lang / pfosten;
        /* Handlauf oben und ein Riegel darunter – zwei Linien lesen sich aus der Ferne besser als
           eine, und dazwischen sieht man den Bach durchscheinen. */
        for (const sx of [-1, 1]) B.stelle(px, y(tm), pz, dreh, 1, c => {
          c.mit(M3.verschieben(sx * (hb + w / 2), 0.4, 0), d => d.kasten(w * 1.2, 0.11, lang, '#7d6039', '#9a7a4b'));
          c.mit(M3.verschieben(sx * (hb + w / 2), 0.19, 0), d => d.kasten(w * 0.65, 0.08, lang, '#6d5433', '#856741'));
        });
      }
    }
  }

  /* Die Röhren zeichnen – aus denselben Zahlen, aus denen gerechnet wird. */
  function roehrenNetz(B, gl) {
    for (const ro of gl.roehren) {
      B.stelle(ro.x, gl.boden(ro.x, ro.z), ro.z, ro.quer ? Math.PI / 2 : 0, 1,
        b => Deko3D.stammroehre(b, ro.lang, ro.dick, Math.round(ro.x * 61 + ro.z * 17)));
    }
  }

  /* Eine Steinbrücke als Zier – sie steht dort, wo der Bach neben der Bahn vorbeiläuft, und über
     sie führt kein Weg, weil hinter ihr das Aus beginnt. Wer eine Brücke will, über die gespielt
     wird, schreibt sie nach 'gelaende.bruecken'; dann wird sie gerechnet und nicht nur gemalt. */
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
             Felder reicht dafür nicht.

             Hier stehen die Büschel aus Dreiecken weiterhin, und das ist kein Widerspruch zu der
             Stelle weiter unten: Das Rough liegt auf der Spielfläche, und die trägt das gemalte
             Gras nicht. Hier ist ein Büschel keine Verdopplung, sondern das Einzige, was sagt:
             „Hier wächst es hoch, hier bleibt dein Ball liegen." */
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
      /* Hier standen Grasbüschel aus Dreiecken – der häufigste Bewuchs am Bahnrand überhaupt. Seit
         das gemalte Gras auf dem Boden liegt, sind sie weg: „Die 3D-Gräser dazwischen stören."
         Auf einem Boden, der Gras schon zeigt, steht ein aufrechtes Büschel als Fremdkörper darin.
         Was bleibt, sind Dinge, die ein Bild nicht sein kann – Büsche, Blumen, Steine, Totholz. */
      } else if (abstand > 2.0 && wuerfel < dichte * 0.5) {
        B.stelle(px, y, pz, r() * 6, 1, b => Deko3D.busch(b, 0.3 + r() * 0.45, r() < 0.5 ? '#4f8f35' : '#3f8a2d', Math.round(px * 37 + pz * 91)));
      } else if (wuerfel < dichte * 0.68) {
        B.stelle(px, y, pz, r() * 6, 0.9 + r() * 0.6, b => Deko3D.blume(b, 2.2, Math.round(px * 59 + pz * 11)));
      } else if (wuerfel < dichte * 0.71) {
        /* Fliegenpilze wachsen im Halbschatten, also weiter draußen als die Blumen und lieber am
           Waldrand als am Bahnrand. Sie sind das auffälligste Kleinzeug, das wir haben – zu viele
           davon, und die Wiese sieht aus wie ein Märchenbuch. */
        if (abstand > 3) B.stelle(px, y, pz, r() * 6, 1, b => Deko3D.fliegenpilz(b, 1.5 + r() * 0.7, Math.round(px * 41 + pz * 23)));
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
      if (abstand < NAH_KRAM && r() < 0.3) {
        const qx = x + r(), qz = z + r();
        if (gl.zumRand(qx, qz) > 0.25 && weitVonBurg(qx, qz)) {
          const qy = gl.hoehe(qx, qz), saat = Math.round(qx * 43 + qz * 79);
          const w = r();
          if (w < 0.38) B.stelle(qx, qy, qz, r() * 6, 0.8 + r() * 0.5, b => Deko3D.blume(b, 2, saat));
          else B.stelle(qx, qy - 0.05, qz, r() * 6, 1, b => Deko3D.fels(b, 0.14 + r() * 0.16, saat));
        }
      }
    }
  }

  /* ---------- Warum hier kein Gras aus Dreiecken mehr steht ----------

     Es standen einmal welche, in fünf Anläufen: Büschel aus Kegeln, einzeln gestreute Dreiecke,
     Halme in Horsten, stumpfe Vierecke und zuletzt gekreuzte Karten mit Fynns gemaltem Gras
     darauf. Jeder Anlauf war besser als der vorige, und der letzte sah für sich genommen gut aus.

     Fynn hat ihn trotzdem abgeräumt: „Die 3D-Gräser dazwischen stören." Und er hat recht – auf
     einem Boden, der das gemalte Gras schon trägt, stehen aufrechte Büschel wie Fremdkörper
     darin. Zweimal Gras übereinander ist nicht doppelt so viel Gras, sondern ein Widerspruch: Das
     Bild zeigt eine geschlossene Fläche, die Karten behaupten einzelne Halme, und das Auge sieht
     beides zugleich.

     Die Wiese ist darum jetzt allein das gemalte Bild auf dem Boden (siehe gl3d.js). Das spart
     nebenbei dreißigtausend Dreiecke je Bahn und einen Texturzugriff je Bildpunkt. */

  /* Das Ufer bepflanzen. Gegangen wird über jedes Landfeld, das an ein Wasserfeld grenzt; dort
     kommen Schilf und Kiesel hin. Der Ball rollt durch beides hindurch – sie stehen ein paar
     Zentimeter neben der Kante und zählen für die Kugelrechnung nicht. */
  /* Gummienten auf dem Bach. Sie schwimmen, also sitzen sie auf dem Wasserspiegel und nicht auf
     dem Grund – deshalb bekommt diese Funktion die Höhe von wasserNetz gereicht, statt sie selbst
     auszurechnen. Zwei oder drei genügen; eine Herde Enten auf einem Minigolfteich ist ein Witz,
     der beim zweiten Mal nicht mehr zündet.

     Gesetzt wird nur auf Wasserfelder, die groß genug für einen Teich sind: In einer Rinne von
     einem Feld Breite sähe eine Ente aus wie hineingeklemmt. */
  function entenNetz(B, gl, spiegel) {
    if (spiegel === false) return;
    const felder = [];
    for (let iz = 0; iz < gl.T; iz++) for (let ix = 0; ix < gl.B; ix++) {
      if (gl.zeichen(ix, iz) !== 'w') continue;
      let ringsum = 0;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (gl.zeichen(ix + dx, iz + dz) === 'w') ringsum++;
      /* Zwei Wassernachbarn genügen. Drei zu verlangen war der erste Versuch, und damit bekam ein
         gerader Bach nie eine Ente – jedes seiner Felder hat nur zwei. */
      if (ringsum >= 2 && !gl.aufBruecke(ix + 0.5, iz + 0.5)) felder.push([ix, iz]);
    }
    if (!felder.length) return;
    const r = M3.zufall(gl.B * 313 + gl.T * 17 + 5);
    const wieViele = Math.min(3, 1 + Math.floor(felder.length / 4));
    for (let i = 0; i < wieViele; i++) {
      const [ix, iz] = felder[Math.floor(r() * felder.length)];
      const x = ix + 0.25 + r() * 0.5, z = iz + 0.25 + r() * 0.5;
      B.stelle(x, spiegel - 0.03, z, r() * M3.TAU3, 1, b => Deko3D.ente(b, 1, Math.round(x * 97 + z * 31)));
    }
  }

  /* Das Schild mit der Bahnnummer. Es steht seitlich hinter dem Abschlag, dort, wo es beim ersten
     Schlag im Bild ist, ohne die Bahn zu verdecken. Welche Seite, entscheidet der Platz: Es geht
     auf die Seite, die weiter von der Spielfläche weg ist. */
  function schildNetz(B, gl, nummer) {
    if (!gl.abschlag) return;
    const [ax, az] = gl.abschlag;
    /* Der Platz wird nicht rings um den Abschlag gesucht, sondern seitlich davon und ein Stück in
       SPIELRICHTUNG. Das ist der Unterschied zwischen einem Schild, das man sieht, und einem, das
       hinter der Kamera steht: Beim ersten Schlag steht die Kamera hinter dem Abschlag und schaut
       zum Loch – alles, was hinter dem Abschlag liegt, ist damit außerhalb des Bildes. Beim ersten
       Versuch stand es genau dort.

       Gesucht wird der Platz, der einem Wunschabstand von anderthalb Feldern neben der Bande am
       nächsten kommt: nah genug, um dazuzugehören, weit genug, um nicht im Weg zu stehen. */
    const WUNSCH = 1.5;
    const [lx, lz] = gl.lochFeld || [ax, az - 1];
    const l = Math.hypot(lx - ax, lz - az) || 1;
    const rx = (lx - ax) / l, rz = (lz - az) / l;        // Spielrichtung
    let bestes = null;
    for (const vor of [1.2, 2.2, 3.2]) {
      for (const d of [2.0, 2.6, 3.2, 3.8]) {
        for (const seite of [-1, 1]) {
          /* Quer zur Spielrichtung – nach links und nach rechts, die freiere Seite gewinnt. */
          const x = ax + rx * vor + rz * seite * d, z = az + rz * vor - rx * seite * d;
          const frei = gl.zumRand(x, z);
          if (frei < 0.7) continue;                      // noch auf der Bahn
          const fehler = Math.abs(frei - WUNSCH) + d * 0.1 + vor * 0.05;
          if (!bestes || fehler < bestes.fehler) bestes = { x, z, fehler };
        }
      }
    }
    if (!bestes) return;
    /* Das Schild schaut nicht zum Abschlag, sondern dorthin, wo beim ersten Schlag die KAMERA
       steht – ein gutes Stück dahinter. Das ist ein Unterschied von zwanzig Grad und entscheidet
       darüber, ob man die Nummer liest oder die Kante des Bretts sieht. */
    const kx = ax - rx * 5, kz = az - rz * 5;
    const hin = Math.atan2(kx - bestes.x, kz - bestes.z);
    B.stelle(bestes.x, gl.boden(bestes.x, bestes.z), bestes.z, hin, 1,
      b => Deko3D.bahnschild(b, nummer, 1.7));
  }

  function uferNetz(B, gl) {
    const r = M3.zufall(1543);
    for (let iz = -1; iz <= gl.T; iz++) for (let ix = -1; ix <= gl.B; ix++) {
      if (gl.zeichen(ix, iz) === 'w') continue;
      for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (gl.zeichen(ix + dx, iz + dz) !== 'w') continue;
        for (let k = 0; k < 3; k++) {
          /* Auf die dem Wasser zugewandte Hälfte des Feldes setzen, quer dazu gestreut. */
          const x = ix + (dx ? 0.5 + dx * (0.2 + r() * 0.3) : r()), zz = iz + (dz ? 0.5 + dz * (0.2 + r() * 0.3) : r());
          /* Nicht auf die Brücke. Schilf, das aus den Brettern wächst, liest sich nicht als Ufer,
             sondern als Fehler – und der Ball rollte mitten hindurch. */
          if (gl.aufBruecke(x, zz)) continue;
          const y = gl.boden(x, zz);
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

  return { ART, artVon, gelaende, gelaendeNetz, lochNetz, wasserNetz, entenNetz, schildNetz, felsenNetz, bandenNetz, brueckenNetz, roehrenNetz, burgNetz, dekoNetz,
    dekoOrt, dekoOrte, dekoFuss,
    streuenNetz, uferNetz, fernNetz, himmelNetz, wolkenNetz, tuchNeu, tuchFrisch,
    pfeilNeu, pfeilFrisch };
})();
