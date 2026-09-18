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
