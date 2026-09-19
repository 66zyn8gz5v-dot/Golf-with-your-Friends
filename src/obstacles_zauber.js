/* Die Maschinen des Zauberreichs.

   Der Lehrlingsgarten ist die Normal-Stufe einer Welt, in der man Zaubern lernt. Seine beiden
   Maschinen sollen darum beide dasselbe beibringen: Im Zauberreich hängt nicht alles am Takt,
   sondern auch daran, was man selbst tut.

   Das ist der Unterschied zu allem, was das Spiel bisher hat. Fallgatter, Falltür, Stacheln,
   Fontäne, Wracktor - sie alle laufen im Takt, und die ganze Aufgabe heißt: den richtigen Moment
   abpassen. Das ist eine gute Aufgabe, aber es ist immer dieselbe. Hier entscheidet der Spieler,
   WANN etwas passiert: Er stößt die Blüte an, und von da an läuft die Uhr, die er selbst gestartet
   hat. */

/* ---------------------------------------------------------------------------
   Die Rankenbrücke
   ---------------------------------------------------------------------------
   Über der Lücke liegt nichts. Stößt der Ball die Blüte an, wächst eine Ranke hinüber und trägt
   RANKE_DAUER Sekunden lang - dann welkt sie, und wer noch darauf liegt, fällt.

   WARUM DIE BLÜTE UND NICHT EIN TAKT. Eine Brücke, die im Takt kommt und geht, ist die Falltür,
   nur andersherum; die gibt es schon. Der Reiz entsteht erst dadurch, daß der Spieler die Uhr
   selbst startet: Er muß die Blüte treffen und dabei GENUG SCHWUNG BEHALTEN, um in der verbleibenden
   Zeit hinüberzukommen. Ein zu harter Schlag schießt über die Brücke hinaus, ein zu weicher
   erreicht sie nicht mehr rechtzeitig. Das ist eine Frage der Dosierung, und Dosierung ist das,
   was ein Lehrling übt.

   WIE DIE BRÜCKE TECHNISCH TRÄGT. Sie trägt gar nicht: Ihre Felder sind in der Karte ganz
   gewöhnlicher Boden, und die Ranke sorgt nur dafür, daß man dort NICHT hindurchfällt. Das ist
   dieselbe Umkehrung wie bei der Schneebrücke, die auch erst ein Loch wird, wenn sie bricht. Der
   Grund ist derselbe: Boden, der zur Laufzeit entsteht, müßte die ganze Wegfindung, die
   Bandenberechnung und die Kamera mitziehen. Boden, der zur Laufzeit WEGFÄLLT, kostet eine
   Abfrage. */
const RANKE_DAUER = 4.0;         // so lange trägt die Ranke nach dem Anstoßen
const RANKE_WACHSEN = 0.35;      // so schnell ist sie da - kurz, sonst ist die Zeit schon halb weg
const RANKE_WELKEN = 0.5;        // und so lange sieht man sie noch zerfallen, nachdem sie nicht mehr trägt
const RANKE_BLUETE = 0.6;        // so nah muß der Ball der Blüte kommen

class Rankenbruecke {
  /* x, y ist die linke obere Ecke der Brücke - wie bei der Schneebrücke, damit beide gleich
     gesetzt werden. 'bluete' ist der Ort der Blüte in Weltkoordinaten. */
  constructor(d) {
    Object.assign(this, { w: 3, h: 1, dauer: RANKE_DAUER, r: RANKE_BLUETE, ebene: 0 }, d);
    this.type = 'ranke';
    this.bluete = this.bluete || { x: this.x - 1.5, y: this.y + this.h / 2 };
    this.bisT = -99;             // bis dahin trägt sie
    this.abT = -99;              // wann sie zuletzt angestoßen wurde (fürs Wachsen)
    this.t = 0;
  }
  setup(level) { this.level = level; this.bisT = -99; this.abT = -99; }
  update(t) { this.t = t; }

  drauf(ball) {
    return Math.abs(ball.x - (this.x + this.w / 2)) <= this.w / 2
        && Math.abs(ball.y - (this.y + this.h / 2)) <= this.h / 2;
  }
  traegt(t) { return t <= this.bisT; }
  /* Wie weit die Ranke gewachsen ist: 0 nichts, 1 ganz. Nach dem Ende welkt sie sichtbar nach -
     das ist kein Schmuck, sondern die Ansage, daß es gleich vorbei ist. */
  stand(t) {
    if (t < this.abT) return 0;
    if (t <= this.bisT) return Math.min(1, (t - this.abT) / RANKE_WACHSEN);
    const nach = t - this.bisT;
    return nach < RANKE_WELKEN ? 1 - nach / RANKE_WELKEN : 0;
  }

  /* trigger läuft nach der Bewegung - da steht fest, wo der Ball diesen Schritt gelandet ist. */
  trigger(ball, t, events) {
    if (!this.level || ball.sunk) return;
    if ((ball.ebene || 0) !== (this.ebene || 0)) return;
    // Die Blüte: einmal anstoßen setzt die Uhr neu, auch wenn die Ranke schon steht
    if (Math.hypot(ball.x - this.bluete.x, ball.y - this.bluete.y) <= this.r + (ball.r || 0.22)) {
      if (t > this.bisT - this.dauer + 0.3) {          // nicht bei jedem Bildschritt neu zünden
        this.abT = t; this.bisT = t + this.dauer;
        events.push({ type: 'ranke', x: this.bluete.x, y: this.bluete.y });
      }
    }
    if (this.traegt(t) || ball.air) return;
    // Keine Ranke, kein Boden: dieselbe Regel wie an einer offenen Kante
    if (this.drauf(ball) && !ebeneFallen(this.level, ball, events)) events.push({ type: 'oob' });
  }
}

/* ---------------------------------------------------------------------------
   Die Zauberhüte
   ---------------------------------------------------------------------------
   Zwei bis vier Hüte stehen auf der Bahn. Genau einer leuchtet. Wer in einen Hut rollt, kommt aus
   dem leuchtenden wieder heraus - und wer in den leuchtenden rollt, aus dem nächsten. Das Leuchten
   wandert im Takt weiter.

   WARUM NICHT EINFACH EIN PORTAL. Ein Portal hat einen festen Ausgang; man sieht vorher, wo man
   ankommt, und die Aufgabe ist, hineinzutreffen. Hier sieht man es auch - aber es ändert sich.
   Damit ist die Frage nicht mehr „treffe ich", sondern „treffe ich JETZT oder in zwei Sekunden",
   und das ist eine Entscheidung statt einer Fertigkeit.

   DAS LEUCHTEN IST DIE GANZE MASCHINE. Ein wanderndes Ziel, das man nicht sieht, wäre Willkür -
   dann bliebe nur Glück, und Glück ist in diesem Spiel nirgends die Aufgabe. Darum leuchtet der
   nächste Hut schon auf, bevor er dran ist (siehe 'gleich'), und der Zeichner macht daraus ein
   Aufglimmen. Man kann den Wechsel kommen sehen und den Schlag darauf legen. */
const HUT_TAKT = 2.6;            // Sekunden, die ein Hut leuchtet
const HUT_VORWARN = 0.7;         // so lange vorher glimmt der nächste schon auf
const HUT_MAUL = 0.42;           // so nah muß der Ball der Hutmitte kommen
const HUT_AUSWURF = 0.65;        // so weit vor dem Hut setzt er wieder auf

class Zauberhuete {
  /* 'plaetze' ist die Liste der Hüte: [[x, y], …], mindestens zwei. */
  constructor(d) {
    Object.assign(this, { takt: HUT_TAKT, phase: 0, r: HUT_MAUL, ebene: 0 }, d);
    this.type = 'zauberhut';
    const roh = Array.isArray(this.plaetze) ? this.plaetze : [];
    this.orte = roh.map(p => [+p[0], +p[1]]).filter(p => isFinite(p[0]) && isFinite(p[1]));
    /* Ort des Hindernisses: die Mitte aller Hüte. Die Sortierung nach Tiefe und das Wegschneiden
       am Bildrand brauchen einen - dasselbe macht das wandernde Loch. */
    if (this.orte.length) {
      this.x = this.orte.reduce((a, p) => a + p[0], 0) / this.orte.length;
      this.y = this.orte.reduce((a, p) => a + p[1], 0) / this.orte.length;
    } else { this.x = this.x || 0; this.y = this.y || 0; }
    this.bereit = this.orte.length >= 2;
    this.aktiv = 0; this.gleich = 0; this.wechselAt = -99;
    this.update(0);
  }
  setup(level) { this.level = level; }
  update(t) {
    this.t = t;
    if (!this.bereit) return;
    const n = this.orte.length;
    const lauf = t / this.takt + this.phase;
    const schritt = Math.floor(lauf);
    const neu = ((schritt % n) + n) % n;
    if (neu !== this.aktiv) { this.aktiv = neu; this.wechselAt = t; }
    this.naechste = (this.aktiv + 1) % n;
    // 0 .. 1: wie nah der Wechsel ist. Daraus macht der Zeichner das Aufglimmen des nächsten Huts.
    const rest = (1 - (lauf - schritt)) * this.takt;
    this.gleich = rest < HUT_VORWARN ? 1 - rest / HUT_VORWARN : 0;
  }
  /* In welchen Hut ist der Ball gerollt? -1, wenn in keinen. */
  imHut(ball) {
    for (let i = 0; i < this.orte.length; i++) {
      const [hx, hy] = this.orte[i];
      if (Math.hypot(ball.x - hx, ball.y - hy) <= this.r) return i;
    }
    return -1;
  }
  teleport(ball, t, events) {
    if (!this.bereit || ball.portalCd > 0 || ball.sunk) return;
    if ((ball.ebene || 0) !== (this.ebene || 0)) return;
    const rein = this.imHut(ball);
    if (rein < 0) return;
    /* Aus dem leuchtenden Hut geht es zum nächsten. Ohne diese Regel wäre der leuchtende Hut eine
       Sackgasse: Man rollte hinein und käme an derselben Stelle wieder heraus. */
    const raus = rein === this.aktiv ? this.naechste : this.aktiv;
    const [zx, zy] = this.orte[raus];
    const sp = Math.hypot(ball.vx, ball.vy);
    const ux = sp > 0.01 ? ball.vx / sp : 0, uy = sp > 0.01 ? ball.vy / sp : 0;
    ball.x = zx + ux * HUT_AUSWURF; ball.y = zy + uy * HUT_AUSWURF;
    ball.portalCd = 0.7; ball.z = 0.35; ball.vz = 2.5;
    events.push({ type: 'zauberhut', x: zx, y: zy, von: this.orte[rein] });
  }
}

/* ---------------------------------------------------------------------------
   Der Mondzieher
   ---------------------------------------------------------------------------
   Die Maschine der Sternenwarte. Ein Mond auf einem Sockel, der seine Phase durchläuft: Bei
   Vollmond zieht er alles an, was in seiner Reichweite rollt, bei Neumond stößt er es weg, und
   dazwischen tut er fast nichts.

   WARUM NICHT EINFACH EIN MAGNET. Der Magnet zieht immer gleich stark und immer in dieselbe
   Richtung; man lernt ihn einmal und rechnet ihn danach mit. Hier ist die Stärke eine Frage des
   Zeitpunkts, und das Vorzeichen auch: Derselbe Schlag geht einmal daneben, weil er gezogen
   wurde, und einmal daneben, weil er gestoßen wurde. Das ist eine Profi-Aufgabe, keine
   Normal-Aufgabe – man muß zweimal hinsehen, bevor man schlägt.

   ZU SEHEN IST ES AM MOND SELBST, NICHT AN EINEM PFEIL. Die Scheibe steht über dem Sockel und
   zeigt ihre Phase: volle Scheibe heißt ziehen, dunkle Scheibe heißt stoßen, Halbmond heißt fast
   nichts. Das ist dieselbe Sprache, die jeder Kalender spricht, und sie braucht keine Legende.

   Und er greift nur einen ROLLENDEN Ball. Ein Mond, der einen liegenden Ball über die Bahn
   schöbe, nähme dem Spieler die Entscheidung wieder ab – dann wäre die Aufgabe nicht mehr „wann
   schlage ich", sondern „wo lande ich zufällig". */
const MOND_TAKT = 7.0;           // Sekunden für einen ganzen Mondlauf (Voll zu Voll)
const MOND_KRAFT = 9.0;          // Beschleunigung in Kachel/s² bei Vollmond, in der Mitte
const MOND_RUHE = 0.6;           // darunter gilt der Ball als liegend und wird nicht gegriffen

class Mondzieher {
  constructor(d) {
    Object.assign(this, { r: 3.4, kraft: MOND_KRAFT, takt: MOND_TAKT, phase: 0, core: 0.4, ebene: 0 }, d);
    this.type = 'mondzieher';
    this.p = 1;
    this.update(0);
  }
  setup(level) { this.level = level; }
  /* p: +1 Vollmond (zieht), -1 Neumond (stößt), 0 Halbmond (nichts). */
  update(t) {
    this.t = t;
    this.p = Math.cos(TAU * (t / this.takt + this.phase));
  }
  force(ball, dt) {
    if (ball.air || ball.rider || ball.sunk) return;
    if ((ball.ebene || 0) !== (this.ebene || 0)) return;
    const dx = this.x - ball.x, dy = this.y - ball.y, d = Math.hypot(dx, dy);
    if (d > this.r || d < 0.01) return;
    /* NUR EIN ROLLENDER BALL WIRD GEGRIFFEN. Die Kraft liegt über der Bodenreibung; ohne diese
       Schranke schöbe der Mond einen liegenden Ball von selbst über die Bahn, und der Spieler
       sähe zu, statt zu entscheiden. Der Griff setzt weich ein, damit er nicht sichtbar
       abschaltet, sobald der Ball langsam wird. */
    const v = Math.hypot(ball.vx, ball.vy);
    if (v <= MOND_RUHE) return;
    const greift = Math.min(1, (v - MOND_RUHE) / MOND_RUHE);
    const a = this.kraft * this.p * (1 - d / this.r) * 1.5 * greift;
    ball.vx += (dx / d) * a * dt; ball.vy += (dy / d) * a * dt;
  }
  /* Der Sockel ist fest – sonst stünde der Mond auf nichts und der Ball liefe hindurch. */
  circles(out) { out.push({ x: this.x, y: this.y, r: this.core, e: 0.55, kind: 'mond' }); }
}

/* ---------------------------------------------------------------------------
   Das Sternbild
   ---------------------------------------------------------------------------
   Auf der Bahn stehen mehrere Sterne. Wer über einen rollt, zündet ihn an. Sind alle an, geht das
   Sternentor auf – vorher steht dort eine Wand aus Licht, durch die nichts hindurchkommt.

   WARUM DAS EINE PROFI-AUFGABE IST UND KEINE NORMAL-AUFGABE. Alles andere im Spiel fragt „wohin
   schlage ich als nächstes". Das Sternbild fragt „in welcher REIHENFOLGE", und das muß man vor dem
   ersten Schlag entscheiden, nicht zwischendurch. Wer die Sterne in der falschen Reihenfolge
   nimmt, kommt an, hat aber keinen Schwung mehr für den nächsten – und muß noch einmal ansetzen.
   Genau das ist der Unterschied zwischen Normal und Profi: nicht schmalere Wege, sondern eine
   Entscheidung, die vorher fällt.

   DAS TOR IST EINE WAND, KEIN LOCH IM BODEN. Ein Boden, der zur Laufzeit entsteht, müßte die ganze
   Wegfindung mitziehen (siehe Rankenbrücke). Eine Wand dagegen kostet ein Mauerstück, das der
   Zeichner malt und die Physik abfragt – dieselbe Bauart wie beim Geländer, nur daß sie
   verschwindet, sobald das Bild vollständig ist.

   UND ES BLEIBT AN. Einmal gezündete Sterne gehen innerhalb einer Bahn nicht wieder aus. Sonst
   wäre die Aufgabe „alles in einem Schlag", und das ist kein Planen mehr, sondern Glück. Wer es in
   einem Schlag schafft, spart Schläge; wer zweimal ansetzt, kommt auch ans Ziel. */
const STERN_NAH = 0.5;           // so nah muß der Ball einem Stern kommen

class Sternbild {
  constructor(d) {
    Object.assign(this, { r: STERN_NAH, sterne: [], tor: null, ebene: 0 }, d);
    this.type = 'sternbild';
    this.an = this.sterne.map(() => false);
    this.zuletzt = -99;          // wann zuletzt einer ansprang – der Zeichner macht daraus ein Aufblitzen
    this.offenT = -99;           // wann das Tor aufging
    this.t = 0;
  }
  setup(level) { this.level = level; this.an = this.sterne.map(() => false); this.zuletzt = -99; this.offenT = -99; }
  update(t) { this.t = t; }
  get fertig() { return this.sterne.length > 0 && this.an.every(Boolean); }

  trigger(ball, t, events) {
    if (ball.sunk || ball.air) return;
    if ((ball.ebene || 0) !== (this.ebene || 0)) return;
    const nah = this.r + (ball.r || 0.22);
    for (let i = 0; i < this.sterne.length; i++) {
      if (this.an[i]) continue;
      const s = this.sterne[i];
      if (Math.hypot(ball.x - s[0], ball.y - s[1]) > nah) continue;
      this.an[i] = true; this.zuletzt = t;
      const fertig = this.fertig;
      if (fertig) this.offenT = t;
      events.push({ type: 'sternbild', x: s[0], y: s[1], fertig });
    }
  }
  /* Solange das Bild unvollständig ist, steht im Tor eine Wand. Danach nicht mehr – und weil die
     Mauerstücke in jedem Bild neu eingesammelt werden, kostet das Aufgehen keine Umrechnung. */
  segments(out) {
    if (!this.tor || this.fertig) return;
    out.push({ ax: this.tor.x0, ay: this.tor.y0, bx: this.tor.x1, by: this.tor.y1, e: 0.72, kind: 'sternentor' });
  }
}

/* ---------------------------------------------------------------------------
   Der Zauberspiegel
   ---------------------------------------------------------------------------
   Die Maschine der Erzmagierloge. Ein hoher Spiegel steht quer im Raum. Wer hineinrollt, kommt auf
   der anderen Seite wieder heraus – aber SEITENVERKEHRT: Wer links hineingeht, kommt rechts
   heraus, und was sich nach links bewegte, bewegt sich danach nach rechts.

   WARUM NICHT EINFACH EIN PORTAL. Ein Portal hat einen festen Ausgang; man zielt darauf, und man
   weiß vorher, wo man landet. Hier gibt es keinen festen Ausgang: DER SPIELER WÄHLT IHN MIT SEINEM
   SCHLAG. Wer weiter links auftrifft, kommt weiter rechts heraus – stufenlos, über die ganze
   Breite des Spiegels. Das ist keine Frage des Treffens mehr und keine des Zeitpunkts, sondern
   eine des Rechnens, und dafür ist die Legenden-Stufe da.

   DAS SPIEGELBILD IST DIE ANSAGE. Solange der Ball auf dieser Seite liegt oder rollt, steht sein
   Bild drüben – an genau der Stelle, an der er herauskäme, und es bewegt sich mit. Man muß nichts
   ausrechnen; man sieht es. Das ist dieselbe Regel wie überall in dieser Welt: Was die Maschine
   tut, steht auf dem Boden, nicht in einer Legende am Bildrand.

   UND ER GREIFT NUR EINEN BALL, DER AUF IHN ZUROLLT. Wer sich vom Spiegel entfernt, wird nicht
   noch einmal hindurchgezogen – sonst hinge man zwischen beiden Seiten fest und käme nie los. */
const SPIEGEL_NAH = 0.34;        // so nah muß der Ball der Spiegelfläche kommen
const SPIEGEL_AUSWURF = 0.55;    // so weit hinter dem Spiegel setzt er wieder auf

class Zauberspiegel {
  /* Der Spiegel steht auf der Strecke (x0,y0)–(x1,y1) – dieselbe Schreibweise wie das Geländer
     und das wandernde Tor, damit man ihn im Baumodus an beiden Enden anfaßt. */
  constructor(d) {
    Object.assign(this, { x0: 0, y0: 0, x1: 4, y1: 0, ebene: 0 }, d);
    this.type = 'zauberspiegel';
    this.x = (this.x0 + this.x1) / 2; this.y = (this.y0 + this.y1) / 2;
    const dx = this.x1 - this.x0, dy = this.y1 - this.y0;
    this.laenge = Math.hypot(dx, dy) || 1;
    this.ux = dx / this.laenge; this.uy = dy / this.laenge;   // entlang des Spiegels
    this.nx = -this.uy; this.ny = this.ux;                    // quer dazu
    this.t = 0; this.blitzAt = -99; this.blitzU = 0;
  }
  setup(level) { this.level = level; this.blitzAt = -99; }
  update(t) { this.t = t; }

  /* Wo liegt ein Punkt im Maß des Spiegels? u: 0 am Anfang, 1 am Ende. d: Abstand quer dazu,
     mit Vorzeichen – daran hängt, auf welcher Seite er steht. */
  lage(x, y) {
    const dx = x - this.x0, dy = y - this.y0;
    return { u: (dx * this.ux + dy * this.uy) / this.laenge, d: dx * this.nx + dy * this.ny };
  }
  /* Das Spiegelbild eines Punktes: seitenverkehrt entlang des Spiegels, und drüben.
     Der Zeichner malt damit den Geisterball; die Maschine setzt damit den Ball um. */
  bild(x, y) {
    const { u, d } = this.lage(x, y);
    const v = 1 - u;
    return { x: this.x0 + this.ux * this.laenge * v - this.nx * d,
             y: this.y0 + this.uy * this.laenge * v - this.ny * d, u: v, d: -d };
  }

  teleport(ball, t, events) {
    if (ball.portalCd > 0 || ball.sunk || ball.air) return;
    if ((ball.ebene || 0) !== (this.ebene || 0)) return;
    const { u, d } = this.lage(ball.x, ball.y);
    if (u < 0 || u > 1 || Math.abs(d) > SPIEGEL_NAH) return;
    const seite = d >= 0 ? 1 : -1;
    const vu = ball.vx * this.ux + ball.vy * this.uy;      // Anteil entlang des Spiegels
    const vn = ball.vx * this.nx + ball.vy * this.ny;      // Anteil quer dazu
    if (vn * seite >= 0) return;                            // er rollt gar nicht auf den Spiegel zu

    const v = 1 - u;                                        // seitenverkehrt: links wird rechts
    ball.x = this.x0 + this.ux * this.laenge * v - this.nx * seite * SPIEGEL_AUSWURF;
    ball.y = this.y0 + this.uy * this.laenge * v - this.ny * seite * SPIEGEL_AUSWURF;
    /* Die Geschwindigkeit wird ebenso gespiegelt: quer bleibt quer (er geht hindurch), längs
       kehrt sich um (ein Spiegelbild hebt die andere Hand). */
    ball.vx = -vu * this.ux + vn * this.nx;
    ball.vy = -vu * this.uy + vn * this.ny;
    ball.portalCd = 0.55; ball.z = 0.18; ball.vz = 1.4;
    this.blitzAt = t; this.blitzU = v;
    events.push({ type: 'zauberspiegel', x: ball.x, y: ball.y, u: v });
  }
}

/* ---------------------------------------------------------------------------
   Die Zauberkreise
   ---------------------------------------------------------------------------
   Ein Runenkreis, der in den Boden geschnitten ist und leuchtet. WAS er tut, sagt seine Farbe –
   und zwar bevor man hineinrollt, nicht danach. Das ist der ganze Sinn dieser Maschine: Bisher muß
   man jede Maschine des Spiels einmal ausprobiert haben, um zu wissen, was sie tut. Ein Kreis, der
   grün brennt, schiebt; einer, der blau brennt, bremst. Fünf Farben, fünf Wirkungen, und wer die
   fünf einmal kennt, liest jede Bahn auf einen Blick.

   JEDER KREIS KANN IM TAKT BRENNEN. Steht takt auf 0, brennt er immer. Sonst ist er die halbe
   Periode an und die halbe aus, und solange er aus ist, tut er gar nichts - dann liegt dort nur
   eine kalte Rille im Stein. Damit ist dieselbe Maschine einmal eine feste Regel und einmal eine
   Frage des Augenblicks, ohne daß es zwei Maschinen sein müßten.

   DER BANNKREIS IST DIE AUSNAHME. Seine Wirkung IST das Brennen: Solange er glüht, ist er eine
   Wand, die man nicht durchquert. Deshalb hat er als einziger Segmente - und deshalb ist ein
   Bannkreis ohne Takt sinnlos, denn er wäre eine Mauer, die nie aufgeht. */
const KREIS_WIRKUNGEN = ['schub', 'bremse', 'sprung', 'wirbel', 'bann'];

class Zauberkreis {
  constructor(d) {
    Object.assign(this, { r: 1.6, wirkung: 'schub', takt: 0, phase: 0, kraft: 0, weite: 4.2 }, d);
    if (!KREIS_WIRKUNGEN.includes(this.wirkung)) this.wirkung = 'schub';
    this.type = 'zauberkreis';
    /* Die Stärke steht je Wirkung woanders in der Einheit: Beschleunigung, Bremsanteil,
       Drehung im Bogenmaß. Wer nichts angibt, bekommt den Wert, mit dem die Bahnen gebaut sind. */
    /* Die Bremse frißt sich selbst: langsamer heißt länger drin heißt noch langsamer. Wer mit
       mittlerem Tempo hineinrollt, bleibt darin liegen; durch kommt nur, wer schnell genug ist.
       Das ist gewollt und steht so auch in der Anleitung - aber es ist keine Sackgasse: Aus dem
       Stand heraus schafft ein kräftiger Schlag den Kreis wieder. Von 3,4 auf 2,4 gesenkt, damit
       das auch mit einem mittleren Schlag gelingt. */
    if (!this.kraft) this.kraft = { schub: 26, bremse: 2.4, sprung: 0, wirbel: 2.6, bann: 0 }[this.wirkung];
    this.wach = 1; this.aus = false;
  }
  update(t) {
    if (!this.takt) { this.wach = 1; this.aus = false; return; }
    const u = (((t / this.takt + this.phase) % 1) + 1) % 1;
    /* Weich überblendet, damit man den Umschlag kommen sieht. Als „an" gilt er erst ab der Hälfte –
       sonst sperrte der Bannkreis schon, während er für das Auge noch dunkel ist. */
    const roh = u < 0.5 ? Math.min(1, u / 0.12) : Math.max(0, 1 - (u - 0.5) / 0.12);
    this.wach = roh; this.aus = roh < 0.5;
  }
  drin(px, py) { return Math.hypot(px - this.x, py - this.y) <= this.r; }

  segments(out) {
    if (this.wirkung !== 'bann' || this.aus) return;
    const n = 16, poly = [];
    for (let i = 0; i < n; i++) {
      const a = (i / n) * TAU;
      poly.push([this.x + Math.cos(a) * this.r, this.y + Math.sin(a) * this.r]);
    }
    polySegments(poly, out, { e: 0.75, kind: 'bannkreis' });
  }

  /* Der Sprungkreis wirft, sobald der Ball ihn mit genug Tempo überrollt. Er behält seine
     Richtung – der Kreis entscheidet nur, WIE WEIT er fliegt, nicht wohin. Ein Kreis, der auch die
     Richtung vorgäbe, wäre eine Kanone, und die gibt es schon. */
  launch(ball, events) {
    if (this.wirkung !== 'sprung' || this.aus || ball.air) return;
    if (!this.drin(ball.x, ball.y)) return;
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp < 2.2) return;                       // wer hier ausrollt, bleibt liegen
    const flug = this.weite / sp;
    ball.vz = (12 * flug) / 2; ball.z = Math.max(ball.z, 0.01); ball.air = true;
    events.push({ type: 'jump', x: ball.x, y: ball.y });
  }

  force(ball, dt) {
    if (this.aus || ball.air || !this.drin(ball.x, ball.y)) return;
    const sp = Math.hypot(ball.vx, ball.vy);
    if (this.wirkung === 'schub') {
      if (sp < 0.4) return;                     // ein liegender Ball hat keine Richtung zum Schieben
      const k = this.kraft * dt;
      ball.vx += (ball.vx / sp) * k; ball.vy += (ball.vy / sp) * k;
      const neu = Math.hypot(ball.vx, ball.vy);
      if (neu > 19) { ball.vx *= 19 / neu; ball.vy *= 19 / neu; }
      ball.boosted = true;
    } else if (this.wirkung === 'bremse') {
      const f = Math.max(0, 1 - this.kraft * dt);
      ball.vx *= f; ball.vy *= f;
    } else if (this.wirkung === 'wirbel') {
      if (sp < 0.3) return;
      const w = this.kraft * dt;
      const c = Math.cos(w), s = Math.sin(w);
      const vx = ball.vx * c - ball.vy * s, vy = ball.vx * s + ball.vy * c;
      ball.vx = vx; ball.vy = vy;
    }
  }
}

/* ---------------------------------------------------------------------------
   DIE DREI ENDGEGNER DES ZAUBERREICHS
   ---------------------------------------------------------------------------
   Jede der drei Welten bekommt eine zehnte Bahn, und auf ihr steht eine Maschine, die größer ist
   als alles andere darin. Sie sind mit Absicht auf DREI VERSCHIEDENE ARTEN schwer – ein Endgegner,
   der dieselbe Frage stellt wie der vorige, ist kein Endgegner, sondern eine große Kopie.

     Riesenblüte     (Garten, Normal)   schwer durch TAKT      – man muß den Augenblick treffen
     Armillarsphäre  (Warte, Profi)     schwer durch ABLESEN   – drei Uhren gleichzeitig
     Bannwächter     (Loge, Legende)    schwer durch REAKTION  – er sieht zu, wo man steht

   Alle drei liegen mit dem Loch in ihrer MITTE. Das ist keine Zierde: Eine große Maschine, an der
   man vorbeispielt, ist ein Umweg; eine, durch die man hindurch muß, ist ein Gegner. */

/* --- Die Riesenblüte -------------------------------------------------------
   Sechs Blütenblätter, die sich im Takt öffnen und schließen. Offen stehen zwischen ihnen Lücken,
   durch die man in den Kelch kommt; geschlossen ist der Ring eine Mauer. Und beim Schließen kommt
   der Pollenstoß: Wer dann noch drin ist und nicht im Loch, fliegt wieder hinaus.

   WARUM DER STOSS UND NICHT NUR DAS ZUGEHEN. Ohne ihn wäre die geschlossene Blüte ein bequemer
   Warteraum - man rollt hinein, verpaßt das Loch, und spielt in Ruhe weiter, bis sie wieder
   aufgeht. Der Stoß macht aus dem Kelch einen Ort, an dem man nicht bleiben kann. */
class Riesenbluete {
  constructor(d) {
    Object.assign(this, { r: 4.2, blaetter: 6, takt: 8.0, phase: 0, kraft: 26, dicke: 0.38 }, d);
    this.type = 'riesenbluete';
    this.alwaysForce = true;      // auch einen liegenden Ball wirft der Stoß hinaus
    this.offen = 0; this.stoss = 0; this.warnung = 0;
  }
  update(t) {
    const u = (((t / this.takt + this.phase) % 1) + 1) % 1;
    const auf = 0.11;                       // wie lange das Öffnen und das Schließen dauern
    let o;
    if (u < 0.40) o = 0;
    else if (u < 0.40 + auf) o = (u - 0.40) / auf;
    else if (u < 0.86) o = 1;
    else if (u < 0.86 + auf) o = 1 - (u - 0.86) / auf;
    else o = 0;
    this.offen = o * o * (3 - 2 * o);
    /* Der Stoß liegt GENAU auf dem Schließen und dauert etwas länger als dieses – sonst wäre er
       vorbei, bevor die Blätter zu sind, und man käme im letzten Augenblick doch noch hinaus. */
    this.stoss = (u >= 0.86 && u < 0.86 + auf * 1.8) ? 1 - (u - 0.86) / (auf * 1.8) : 0;
    // Die Vorwarnung: die letzte Sekunde, bevor es zugeht. Sie steht in der Zeichnung als Glühen.
    const bisZu = ((0.86 - u) % 1 + 1) % 1;
    this.warnung = this.offen > 0.5 ? Math.max(0, 1 - (bisZu * this.takt) / 1.2) : 0;
  }
  /* Die Blätter als Bogenstücke. Offen bleibt zwischen ihnen eine Lücke, geschlossen schließt der
     Ring lückenlos - dieselbe Rechnung, die auch die Zeichnung benutzt, damit Bild und Sperre
     nicht auseinanderlaufen. */
  bogen(k) {
    const teil = TAU / this.blaetter;
    const lueck = teil * 0.46 * this.offen;
    return [k * teil + lueck / 2, (k + 1) * teil - lueck / 2];
  }
  segments(out) {
    const n = 5;
    for (let k = 0; k < this.blaetter; k++) {
      const [a0, a1] = this.bogen(k);
      const aussen = [], innen = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * (i / n);
        aussen.push([this.x + Math.cos(a) * (this.r + this.dicke), this.y + Math.sin(a) * (this.r + this.dicke)]);
        innen.push([this.x + Math.cos(a) * (this.r - this.dicke), this.y + Math.sin(a) * (this.r - this.dicke)]);
      }
      polySegments(aussen.concat(innen.reverse()), out, { e: 0.55, kind: 'bluete' });
    }
  }
  force(ball, dt) {
    if (this.stoss <= 0 || ball.sunk) return;
    let dx = ball.x - this.x, dy = ball.y - this.y;
    let d = Math.hypot(dx, dy);
    if (d > this.r) return;
    if (d < 0.25) { dx = 1; dy = 0; d = 1; }     // genau in der Mitte gibt es keine Richtung
    const k = this.kraft * this.stoss * dt;
    ball.vx += (dx / d) * k; ball.vy += (dy / d) * k;
  }
}

/* --- Die Große Armillarsphäre ---------------------------------------------
   Drei Messingringe um das Loch, jeder mit EINER Lücke, jeder mit eigener Geschwindigkeit und
   eigener Richtung. Hinein kommt, wer die Lücken übereinander erwischt - oder wer in mehreren
   Schlägen von Ring zu Ring geht und zwischen zweien wartet.

   DIE RINGE LAUFEN VERSCHIEDEN SCHNELL UND GEGENEINANDER. Liefen sie gleich, stünde die Gasse
   immer an derselben Stelle und die Sphäre wäre ein Tor mit drei Rahmen. */
class Armillarsphaere {
  constructor(d) {
    Object.assign(this, { ringe: [], dicke: 0.3 }, d);
    this.type = 'armillar';
    this.stand = this.ringe.map(() => 0);
    /* Die Ringe von außen nach innen. Jeder trägt eine Wirkung, und die gilt in dem BAND von
       seinem Radius bis zum nächsten Ring einwärts - man wechselt die Regel also genau dann, wenn
       man durch eine Gasse gekommen ist. Der innerste Ring bleibt ohne Wirkung: Dort liegt das
       Loch, und ein Wirbel am Loch wäre kein Rätsel mehr, sondern Willkür. */
    this.sortiert = this.ringe.map((r, i) => ({ ring: r, i })).sort((a, b) => b.ring.r - a.ring.r);
    this.alwaysForce = true;
  }
  update(t) { this.stand = this.ringe.map(r => (r.phase || 0) * TAU + t * r.tempo); }

  /* In welchem Band liegt ein Punkt? Gibt den Ring zurück, dessen Wirkung dort gilt. */
  band(px, py) {
    const d = Math.hypot(px - this.x, py - this.y);
    for (const { ring } of this.sortiert) if (d <= ring.r) var treffer = ring;
    return treffer;      // der kleinste Ring, der den Punkt noch umschließt
  }

  force(ball, dt) {
    if (ball.air || ball.sunk) return;
    const ring = this.band(ball.x, ball.y);
    if (!ring || !ring.wirkung) return;
    const sp = Math.hypot(ball.vx, ball.vy);
    if (ring.wirkung === 'schub') {
      if (sp < 0.4) return;
      const k = 22 * dt;
      ball.vx += (ball.vx / sp) * k; ball.vy += (ball.vy / sp) * k;
      const neu = Math.hypot(ball.vx, ball.vy);
      if (neu > 19) { ball.vx *= 19 / neu; ball.vy *= 19 / neu; }
      ball.boosted = true;
    } else if (ring.wirkung === 'bremse') {
      const f = Math.max(0, 1 - 2.2 * dt);
      ball.vx *= f; ball.vy *= f;
    } else if (ring.wirkung === 'wirbel') {
      if (sp < 0.3) return;
      const w = 2.0 * dt, c = Math.cos(w), si = Math.sin(w);
      const vx = ball.vx * c - ball.vy * si, vy = ball.vx * si + ball.vy * c;
      ball.vx = vx; ball.vy = vy;
    } else if (ring.wirkung === 'zug') {
      /* Der Sog nach innen. Es ist die einzige Wirkung, die dem Spieler HILFT – und sie steht mit
         Absicht im äußersten Band: Wer die erste Gasse trifft, wird belohnt. */
      const dx = this.x - ball.x, dy = this.y - ball.y;
      const d = Math.hypot(dx, dy) || 1;
      ball.vx += (dx / d) * 6 * dt; ball.vy += (dy / d) * 6 * dt;
    }
  }
  segments(out) {
    const n = 14;
    this.ringe.forEach((ring, i) => {
      const a0 = this.stand[i] + ring.gasse / 2;
      const a1 = this.stand[i] + TAU - ring.gasse / 2;
      const aussen = [], innen = [];
      for (let k = 0; k <= n; k++) {
        const a = a0 + (a1 - a0) * (k / n);
        aussen.push([this.x + Math.cos(a) * (ring.r + this.dicke), this.y + Math.sin(a) * (ring.r + this.dicke)]);
        innen.push([this.x + Math.cos(a) * (ring.r - this.dicke), this.y + Math.sin(a) * (ring.r - this.dicke)]);
      }
      polySegments(aussen.concat(innen.reverse()), out, { e: 0.6, kind: 'armillar' });
    });
  }
}

/* --- Der Bannwächter -------------------------------------------------------
   Der einzige Gegner im Spiel, der ZUSIEHT. Sein Arm dreht sich langsam dorthin, wo der Ball
   liegt; im Takt glüht dann das Siegel unter dem Arm auf, und wer im Keil steht, wenn es
   einschlägt, wird hinausgeworfen.

   WARUM ER LANGSAM DREHT. Ein Arm, der sofort auf den Ball zeigt, wäre nicht zu schlagen - man
   stünde immer im Keil. So aber schleppt er hinterher, und daraus entsteht die Aufgabe: sich
   bewegen, damit er hinter einem bleibt. Stehenbleiben ist die einzige Antwort, die immer falsch
   ist. */
class Bannwaechter {
  constructor(d) {
    Object.assign(this, { r: 1.6, weite: 11.0, keil: 0.42, takt: 5.0, phase: 0,
                          folgen: 1.1, warn: 1.2, schlag: 0.3, wucht: 15 }, d);
    this.type = 'bannwaechter';
    this.winkel = this.basis == null ? Math.PI : this.basis;
    this.zustand = 'ruht'; this.gluehen = 0; this.zielWinkel = this.winkel;
  }
  update(t) {
    const u = (((t / this.takt + this.phase) % 1) + 1) % 1;
    const wA = 1 - (this.warn + this.schlag) / this.takt;      // ab hier wird gewarnt
    const sA = 1 - this.schlag / this.takt;                    // ab hier schlägt er
    this.zustand = u < wA ? 'ruht' : u < sA ? 'warnt' : 'schlaegt';
    this.gluehen = this.zustand === 'ruht' ? 0
      : this.zustand === 'warnt' ? (u - wA) / (sA - wA) : 1;
    this.nachfuehren = this.zustand === 'ruht';
  }
  /* Der Arm folgt nur, solange der Wächter ruht. Während er warnt, steht er still – sonst zöge
     die Warnung mit dem Ball mit und wäre keine Warnung, sondern eine Verfolgung. */
  force(ball, dt) {
    if (!this.nachfuehren || ball.sunk) return;
    this.zielWinkel = Math.atan2(ball.y - this.y, ball.x - this.x);
    let d = this.zielWinkel - this.winkel;
    while (d > Math.PI) d -= TAU;
    while (d < -Math.PI) d += TAU;
    const schritt = this.folgen * dt;
    this.winkel += Math.abs(d) < schritt ? d : Math.sign(d) * schritt;
  }
  /* Der Schlag selbst. Er wirft hinaus, statt einen Strafschlag zu geben: Ein Strafschlag ist eine
     Zahl, ein Wurf ist zu sehen – und man verliert genau das, was man sich erspielt hat, nämlich
     den Weg. */
  ride(ball, t, events) {
    if (this.zustand !== 'schlaegt' || ball.air || ball.sunk) return false;
    if (this.getroffen === t) return false;
    const dx = ball.x - this.x, dy = ball.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > this.weite || d < 0.3) return false;
    let ab = Math.atan2(dy, dx) - this.winkel;
    while (ab > Math.PI) ab -= TAU;
    while (ab < -Math.PI) ab += TAU;
    if (Math.abs(ab) > this.keil) return false;
    ball.vx = (dx / d) * this.wucht; ball.vy = (dy / d) * this.wucht;
    ball.z = Math.max(ball.z, 0.02); ball.vz = 3.2; ball.air = true;
    this.getroffen = t;
    events.push({ type: 'zap', x: ball.x, y: ball.y });
    return false;
  }
}
