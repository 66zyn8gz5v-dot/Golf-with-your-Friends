/* Die Maschinen des Schneebergs.

   Jede Welt stellt eine Frage. Das Märchenland fragt *wie fest*, der Uhrenturm fragt *wann* – der
   Schneeberg fragt **wohin**. Der Wind versetzt hier jeden Schlag, und er ist ablesbar: Die
   Windfahne zeigt, woher er gleich kommt. Wer geradeaus zielt, kommt nicht an; wer danebenzielt,
   schon. Alles andere in dieser Datei arbeitet dieser Frage zu.

   Vier Maschinen:
   - Die WINDFAHNE dreht den Wind im Takt und sagt die nächste Richtung vorher an.
   - Die LAWINE fegt im Takt den Hang herunter. Hinter einem Felsblock ist man sicher.
   - Die SEILBAHN trägt über die Schlucht – und, wenn man will, eine Wolkenetage höher.
   - Die SCHNEEBRÜCKE trägt genau einen Schlag lang und bricht dann ein.

   Alle Stellschrauben stehen bewusst oben, damit sie sich nachjustieren lassen, ohne im Code zu
   suchen. */

/* ---------------------------------------------------------------------------
   Windfahne
   --------------------------------------------------------------------------- */
/* Der Wind steht nicht fest, er dreht. Vier Richtungen der Reihe nach, jede WIND_HALT Sekunden
   lang, dazwischen WIND_DREH Sekunden Flaute, in der die Fahne umschlägt. Die Flaute ist wichtig:
   Sie ist der Moment, in dem ein gerader Schlag ankommt, und sie macht aus dem Wind ein Rätsel mit
   Lösung statt einer Schikane.

   Der Wind wirkt auf der ganzen Bahn, nicht in einem Feld. Das ist der Unterschied zum
   Wind-'field' der anderen Welten: Dort ist Wind eine Stelle, hier ist er das Wetter. Er greift
   nur einen rollenden Ball an (die Physik ruft force() beim Zielen nicht auf) – ein liegender Ball
   wird also nie vom Berg geweht, und das soll auch so sein. */
const WIND_HALT = 5.0;           // Sekunden, die eine Richtung steht
const WIND_DREH = 1.4;           // Sekunden Flaute beim Umschlagen
const WIND_KRAFT = 2.6;          // Beschleunigung in Kacheln/s² bei voller Stärke
const WIND_RICHTUNGEN = [0, 90, 180, 270];   // Ost, Süd, West, Nord - immer dieselbe Reihenfolge

class WindVane {
  constructor(d) {
    Object.assign(this, { kraft: WIND_KRAFT, phase: 0, hoehe: 2.6 }, d);
    this.type = 'windfahne';
    this.alwaysForce = false;      // nur ein rollender Ball wird versetzt
    this.update(0);
  }
  update(t) {
    const zyklus = WIND_HALT + WIND_DREH;
    const gesamt = t / zyklus + this.phase;
    const schritt = Math.floor(gesamt);
    const u = (gesamt - schritt) * zyklus;         // 0 .. zyklus
    const n = WIND_RICHTUNGEN.length;
    this.i = ((schritt % n) + n) % n;
    this.next = (this.i + 1) % n;
    /* Stärke: volle Kraft, solange die Richtung steht; in der Flaute geht sie auf null und wieder
       hoch. Der Zeiger dreht in derselben Zeit, damit Bild und Wirkung zusammenpassen. */
    if (u < WIND_HALT) { this.staerke = 1; this.dreht = 0; this.rest = WIND_HALT - u; }
    else { const q = (u - WIND_HALT) / WIND_DREH; this.staerke = Math.abs(Math.cos(q * Math.PI)); this.dreht = q; this.rest = 0; }
    const a0 = (WIND_RICHTUNGEN[this.i] * Math.PI) / 180;
    const a1 = (WIND_RICHTUNGEN[this.next] * Math.PI) / 180;
    // kürzester Weg von a0 nach a1, damit die Fahne nicht einmal ganz herumfährt
    let diff = a1 - a0; while (diff > Math.PI) diff -= 2 * Math.PI; while (diff < -Math.PI) diff += 2 * Math.PI;
    this.winkel = a0 + diff * this.dreht;
    this.dx = Math.cos(this.winkel); this.dy = Math.sin(this.winkel);
  }
  force(ball, dt) {
    if (ball.air || ball.rider || this.staerke <= 0.01) return;
    ball.vx += this.dx * this.kraft * this.staerke * dt;
    ball.vy += this.dy * this.kraft * this.staerke * dt;
  }
}

/* ---------------------------------------------------------------------------
   Lawine
   --------------------------------------------------------------------------- */
/* Eine Schneefront, die im Takt durch ihren Streifen fährt und mitnimmt, was offen liegt. Sie ist
   keine Mauer und keine Strafe: Wer erwischt wird, verliert Weg, nicht einen Schlag. Das passt zum
   Ton der Welt – der Berg ist groß, nicht böse.

   Das Besondere ist der Schutz. Hinter einem Felsblock ('x' in der Karte) geht die Lawine vorbei,
   und zwar genau in dessen Windschatten: Vom Ball aus wird bis LAWINE_SCHUTZ Kacheln gegen die
   Laufrichtung geschaut; steht dort ein Block, passiert nichts. Damit ist zum ersten Mal eine
   Maschine da, vor der man sich *versteckt*, statt sie zu umgehen – und die Felsen auf der Karte
   sind nicht mehr Deko, sondern Deckung. */
const LAWINE_TAKT = 9.0;         // Sekunden von einer Lawine zur nächsten
const LAWINE_FAHRT = 2.2;        // so lange braucht die Front durch ihren Streifen
const LAWINE_WARNUNG = 1.6;      // so lange vorher grollt und staubt es
const LAWINE_BREITE = 1.6;       // Tiefe der Front in Laufrichtung
const LAWINE_SCHUB = 26;         // Beschleunigung, mit der sie mitreißt
const LAWINE_SCHUTZ = 3.2;       // so weit reicht der Windschatten hinter einem Block

class Avalanche {
  constructor(d) {
    Object.assign(this, { w: 6, h: 6, angle: 90, phase: 0, ebene: 0 }, d);
    this.type = 'lawine';
    const a = (this.angle * Math.PI) / 180;
    this.dx = Math.cos(a); this.dy = Math.sin(a);
    // Länge des Streifens in Laufrichtung: die Front startet davor und endet dahinter
    this.laenge = Math.abs(this.dx) * this.w + Math.abs(this.dy) * this.h;
    this.cx = this.x + this.w / 2; this.cy = this.y + this.h / 2;
    this.alwaysForce = true;       // sie reißt auch einen liegenden Ball mit
    this.update(0);
  }
  setup(level) { this.level = level; }
  update(t) {
    const u = ((((t / LAWINE_TAKT + this.phase) % 1) + 1) % 1) * LAWINE_TAKT;
    this.warnt = u > LAWINE_TAKT - LAWINE_WARNUNG ? (u - (LAWINE_TAKT - LAWINE_WARNUNG)) / LAWINE_WARNUNG : 0;
    if (u < LAWINE_FAHRT) {
      this.laeuft = true;
      this.p = u / LAWINE_FAHRT;                       // 0 = ganz vorn, 1 = durch
      const s = (this.p - 0.5) * (this.laenge + 2 * LAWINE_BREITE);
      this.fx = this.cx + this.dx * s; this.fy = this.cy + this.dy * s;
    } else { this.laeuft = false; this.p = 1; }
  }
  imStreifen(px, py) {
    return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h;
  }
  /* Steht zwischen dem Ball und der heranrollenden Front ein Block? Dann ist er gedeckt. */
  gedeckt(px, py) {
    if (!this.level) return false;
    for (let d = 0.6; d <= LAWINE_SCHUTZ; d += 0.5) {
      const c = this.level.charAt(px - this.dx * d, py - this.dy * d);
      if (c === 'x') return true;
    }
    return false;
  }
  force(ball, dt) {
    if (!this.laeuft || ball.air || ball.rider) return;
    if ((ball.ebene || 0) !== (this.ebene || 0)) return;
    if (!this.imStreifen(ball.x, ball.y)) return;
    // vor der Front (in Laufrichtung gesehen hinter ihrem Kamm) wird geschoben
    const s = (ball.x - this.fx) * this.dx + (ball.y - this.fy) * this.dy;
    if (s < -LAWINE_BREITE || s > LAWINE_BREITE * 0.4) return;
    if (this.gedeckt(ball.x, ball.y)) { ball.imSchutz = true; return; }
    ball.imSchutz = false;
    ball.vx += this.dx * LAWINE_SCHUB * dt; ball.vy += this.dy * LAWINE_SCHUB * dt;
  }
}

/* ---------------------------------------------------------------------------
   Seilbahn
   --------------------------------------------------------------------------- */
/* Die Gondel am Stahlseil. Verhalten wie die Fähre – sie wartet an der Station, fährt hinüber,
   wartet, kommt zurück –, aber mit einem Zusatz, den der Berg braucht: Sie darf die Ebene
   wechseln. Steht 'ziel' dabei, liegt die Bergstation eine oder mehrere Wolkenetagen höher, und
   der Ball steigt oben auf der neuen Ebene aus. Damit ist sie zugleich Brücke und Aufstieg, und
   das ist genau das, was eine Bergbahn tut. */
class CableCar extends Ferry {
  constructor(d) {
    super(Object.assign({ w: 1.2, h: 1.2, wait: 2.6, travel: 3.4, tragHoehe: 0.9 }, d));
    this.type = 'seilbahn'; this.style = 'gondel';
    this.ebene = d.ebene || 0;
    this.ziel = d.ziel == null ? this.ebene : d.ziel;
  }
  /* Die Höhe der Gondel wächst mit dem Weg: Sie hängt am Seil zwischen Tal- und Bergstation. */
  hoehe() {
    const z = this.level ? this.level.ebeneZ : 2;
    return this.ebene * z + (this.ziel - this.ebene) * z * (this.progress || 0) + this.tragHoehe;
  }
  setup(level) { this.level = level; }
  ride(ball, t, events) {
    if (ball.rider !== this && (ball.ebene || 0) !== this.ebene) return false;   // nur an der Talstation einsteigen
    const drin = ball.rider === this;
    const vorher = this.station;
    const raus = Ferry.prototype.ride.call(this, ball, t, events);
    if (drin) {
      if (ball.rider === this) { ball.z = this.hoehe(); return true; }
      // Ausgestiegen: an der oberen Station gehört der Ball auf die obere Ebene
      const neu = vorher === 'B' ? this.ziel : this.ebene;
      if (this.level && neu !== (ball.ebene || 0)) { ball.ebene = neu; this.level.setzeEbene(neu); }
      ball.z = 0; ball.vz = 0;
      return false;
    }
    if (ball.rider === this) ball.z = this.hoehe();
    return raus;
  }
}

/* ---------------------------------------------------------------------------
   Schneebrücke
   --------------------------------------------------------------------------- */
/* Eine Schneewächte über der Rinne: Sie trägt genau einen Schlag lang. Wer sie überquert hat und
   im selben Schlag zurückrollt, findet nichts mehr vor und fällt. Beim nächsten Schlag liegt sie
   wieder da – der Berg schneit zu.

   Damit ist sie das Gegenstück zur Luke des Uhrenturms: Die Luke fragt *wann*, die Schneebrücke
   fragt, ob man den Weg wirklich zu Ende denkt. Sie ist keine Falle, sondern eine Einbahnstraße,
   und sie ist auch keine Strafe – wer durchbricht, fällt wie an einer offenen Kante eine Ebene
   tiefer, ohne Strafschlag (und nur da, wo es keine untere Ebene gibt, ist es ein Sturz ins Aus,
   genau wie sonst auch). */
const BRUECKE_KNACKEN = 0.35;    // so lange knirscht sie sichtbar, bevor sie bricht

class SnowBridge {
  constructor(d) {
    Object.assign(this, { w: 2, h: 2, ebene: 0 }, d);
    this.type = 'schneebruecke';
    this.gebrochen = false; this.betreten = false; this.brichtAt = -99; this.schlag = -1;
  }
  setup(level) { this.level = level; }
  drauf(ball) {
    return Math.abs(ball.x - (this.x + this.w / 2)) <= this.w / 2
        && Math.abs(ball.y - (this.y + this.h / 2)) <= this.h / 2;
  }
  update(t) { this.t = t; }
  /* trigger läuft nach der Bewegung – da steht fest, wo der Ball diesen Schritt gelandet ist. */
  trigger(ball, t, events) {
    if (!this.level) return;
    const schlag = this.level.schlagZahl || 0;
    if (schlag !== this.schlag) { this.schlag = schlag; this.gebrochen = false; this.betreten = false; }
    if ((ball.ebene || 0) !== (this.ebene || 0)) return;
    const drauf = this.drauf(ball);
    if (!this.gebrochen) {
      if (drauf) this.betreten = true;
      else if (this.betreten) { this.gebrochen = true; this.brichtAt = t; events.push({ type: 'bruch', x: this.x + this.w / 2, y: this.y + this.h / 2 }); }
      return;
    }
    /* Gebrochen: wer jetzt darüberrollt, fällt - dieselbe Regel wie an einer offenen Kante. Gibt
       es darunter eine Ebene, geht es dorthin, ohne Strafschlag. Gibt es keine, ist es ein Loch im
       Berg wie jedes andere, und dann gilt auch dieselbe Regel wie sonst: aus, mit Strafschlag.
       Genau dieser zweite Fall fehlte zuerst - auf einer Bahn ohne untere Ebene tat die gebrochene
       Brücke gar nichts, und man rollte gemütlich über das Loch hinweg. */
    if (drauf && !ball.air && !ebeneFallen(this.level, ball, events)) events.push({ type: 'oob' });
  }
}
