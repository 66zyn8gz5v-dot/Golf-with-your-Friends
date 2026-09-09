/* Hindernisse der Stufe „Legende“ (Sturmhimmel, Schattenreich, Kolosseum):
   Blitzschlag, Aufwind, Falltür, Fallbeil, Augenturm, Löwentor.
   Schattenzone ist ein field mit style 'dark' (nur Optik). */

/* Stellschrauben des Löwentors – bewusst hier oben, damit sie sich nachjustieren lassen,
   ohne im Code zu suchen. */
const LOEWENTOR_TEMPO = 4.5;      // ab diesem Tempo schluckt der Eingang; darunter ist er eine Wand
const LOEWENTOR_AUSWURF = 9.5;    // mit diesem Tempo kommt der Ball am Ausgang heraus (immer gleich)
const LOEWENTOR_SCHUB = 1.6;      // Tempo, mit dem ein steckengebliebener Ball herausgeschoben wird

/* Blitzschlag: eine Zone, über der im Takt ein Blitz einschlägt. Vorher knistert und leuchtet der Boden
   ('warn' Sekunden), dann schlägt der Blitz 'strike' Sekunden lang ein – wer dann in der Zone ist
   (rollend, liegend oder fliegend), wird getroffen: Strafschlag, zurück zum Schlagstart. */
class Lightning {
  constructor(d) { Object.assign(this, { w: 2, h: 2, period: 5, phase: 0, warn: 0.9, strike: 0.3 }, d); this.type = 'lightning'; this.state = 'idle'; this.p = 0; }
  update(t) {
    const u = ((((t / this.period + this.phase) % 1) + 1) % 1) * this.period;
    if (u < this.warn) { this.state = 'warn'; this.p = u / this.warn; }
    else if (u < this.warn + this.strike) { this.state = 'strike'; this.p = (u - this.warn) / this.strike; }
    else { this.state = 'idle'; this.p = 0; }
  }
  inside(px, py) { return Math.abs(px - this.x) <= this.w / 2 && Math.abs(py - this.y) <= this.h / 2; }
  trigger(ball, t, events) {
    if (this.state !== 'strike' || ball.rider || !this.inside(ball.x, ball.y)) return;
    events.push({ type: 'zapped', x: ball.x, y: ball.y });
  }
  airTrigger(ball, t, events) { // trifft auch fliegende Bälle
    if (this.state !== 'strike' || !this.inside(ball.x, ball.y)) return false;
    events.push({ type: 'zapped', x: ball.x, y: ball.y }); return true;
  }
}

/* Aufwind: ein Ball, der mit Schwung in die Zone rollt, wird in seiner Rollrichtung in die Luft gehoben
   und landet 'land' Kacheln weiter – egal wie schnell er war (Flugtempo 'fly'). Fliegt über Klippen und Mauern. */
class Updraft {
  constructor(d) { Object.assign(this, { w: 2, h: 2, minSpeed: 2.5, land: 5, fly: 7 }, d); this.type = 'updraft'; this.liftAt = -10; }
  inside(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
  launch(ball, events, t) {
    if (ball.air || ball.rider || !this.inside(ball.x, ball.y)) return;
    const sp = Math.hypot(ball.vx, ball.vy); if (sp < this.minSpeed) return;
    const ux = ball.vx / sp, uy = ball.vy / sp, tFlight = this.land / this.fly;
    ball.vx = ux * this.fly; ball.vy = uy * this.fly;
    ball.vz = (12 * tFlight) / 2; ball.z = Math.max(ball.z, 0.01); ball.air = true;
    this.liftAt = t;
    events.push({ type: 'jump', x: ball.x, y: ball.y, updraft: true });
  }
}

/* Falltür: eine Bodenplatte, die im Takt aufklappt ('open' Anteil der 'period'). Ein Ball, der über die
   offene Falltür rollt oder darauf liegt, stürzt in die Tiefe: Strafschlag, zurück zum Schlagstart. */
class Trapdoor {
  constructor(d) { Object.assign(this, { w: 1.4, h: 1.4, period: 5, open: 0.4, phase: 0 }, d); this.type = 'trapdoor'; this.gap = 0; this.isOpen = false; }
  update(t) {
    const u = (((t / this.period + this.phase) % 1) + 1) % 1, ramp = 0.08;
    const g = u < this.open ? Math.min(1, u / ramp) : Math.max(0, 1 - (u - this.open) / ramp);
    this.gap = g; this.isOpen = g > 0.5;
  }
  trigger(ball, t, events) {
    if (!this.isOpen || ball.air || ball.rider) return;
    if (Math.abs(ball.x - this.x) > this.w / 2 - 0.1 || Math.abs(ball.y - this.y) > this.h / 2 - 0.1) return;
    events.push({ type: 'fell', x: ball.x, y: ball.y });
  }
}

/* Fallbeil: ein Gerüst wie ein Schafott quer über den Weg. Die Klinge hängt oben, wird im Takt langsam
   hochgezogen – und knallt dann schlagartig herunter ('hold' Anteil der Periode bleibt sie unten).
   Unten ist sie eine Mauer. Wer im Moment des Aufschlags unter der Klinge liegt oder rollt, wird
   geköpft: Strafschlag, zurück zum Schlagstart (außerhalb des Beils). Mit 'linked' hängt die Klinge
   an einem Schalter: solange er aktiv ist, hebt sie sich langsam – läuft er ab, fällt sie sofort. */
class Guillotine {
  constructor(d) { Object.assign(this, { w: 0.35, h: 3, period: 5, phase: 0, hold: 0.32, rise: 0.28, drop: 0.09, liftH: 2.3, bladeH: 0.85 }, d); this.type = 'guillotine'; this.lift = 1; this.closed = false; this.wasClosed = false; this.warn = 0; this.slamAt = -10; }
  update(t) {
    this.wasClosed = this.closed;
    let l;
    if (this.linked) {
      const until = (this.level && this.level.switches[this.linked]) || 0;
      if (until > t) { l = Math.min(1, this.lift + 0.0035); this.warn = Math.max(0, 1 - (until - t) / 1.5); }
      else { l = Math.max(0, this.lift - 0.09); this.warn = 0; }
    } else {
      const u = (((t / this.period + this.phase) % 1) + 1) % 1, dropT = this.drop / this.period; // Fallen dauert 'drop' Sekunden
      if (u < this.hold) l = 0;
      else if (u < this.hold + this.rise) { const k = (u - this.hold) / this.rise; l = k * k * (3 - 2 * k); }
      else if (u < 1 - dropT) l = 1;
      else { const k = (u - (1 - dropT)) / dropT; l = 1 - k * k; }
      this.warn = u > 1 - dropT - 0.9 / this.period && u < 1 - dropT ? 1 - (1 - dropT - u) * this.period / 0.9 : 0; // Zittern kurz vor dem Fall
    }
    this.lift = l; this.closed = l < 0.3;
    if (this.closed && !this.wasClosed) this.slamAt = t;
  }
  segments(out) {
    if (!this.closed) return;
    polySegments(rectPoly(this.x, this.y, this.w, this.h), out, { e: 0.5, kind: 'gate' });
  }
  under(px, py, margin) { return Math.abs(px - this.x) <= this.w / 2 + (margin || 0) && Math.abs(py - this.y) <= this.h / 2 + 0.05; }
  trigger(ball, t, events) {
    if (!this.closed || this.wasClosed || ball.air || ball.rider) return;
    if (!this.under(ball.x, ball.y, ball.r + 0.05)) return;
    events.push({ type: 'beheaded', x: ball.x, y: ball.y, owner: this });
  }
}

/* Augenturm: ein Turm, auf dem ein brennendes Auge sitzt und sich langsam umsieht. Sein Blick ist ein
   Lichtkegel auf dem Boden (Öffnung 'fov', Reichweite 'range'). Wer im Kegel liegen bleibt oder darin
   landet (langsamer als 'still' für länger als 'dwell' Sekunden), wird erblickt: Strafschlag, zurück.
   Blöcke ('x') und Mauern im Kegel spenden Deckung. Ein schnell durchrollender Ball ist sicher. */
class EyeTower {
  constructor(d) { Object.assign(this, { r: 1.1, range: 9, fov: 0.6, speed: 0.4, phase: 0, dwell: 0.55, still: 1.6, height: 3.4 }, d); this.type = 'eyetower'; this.dir = this.phase; this.seenT = 0; this.alert = 0; this.lastT = null; }
  update(t) {
    this.dir = this.swing ? this.phase + this.swing.amp * Math.sin(t * this.speed) : t * this.speed + this.phase;
    this.dt = this.lastT == null ? 0 : Math.min(0.05, Math.max(0, t - this.lastT)); this.lastT = t;
  }
  circles(out) { out.push({ x: this.x, y: this.y, r: this.r, e: 0.5, kind: 'tower' }); }
  covered(px, py) { // liegt ein Block zwischen Turm und Punkt?
    const lv = this.level; if (!lv) return false;
    const d = Math.hypot(px - this.x, py - this.y), n = Math.ceil(d * 3);
    for (let k = 1; k < n; k++) { const u = k / n, c = lv.charAt(this.x + (px - this.x) * u, this.y + (py - this.y) * u); if (c === 'x') return true; }
    return false;
  }
  inBeam(px, py) {
    const dx = px - this.x, dy = py - this.y, d = Math.hypot(dx, dy);
    if (d > this.range || d < this.r) return false;
    let a = Math.atan2(dy, dx) - this.dir; a = Math.atan2(Math.sin(a), Math.cos(a));
    if (Math.abs(a) > this.fov / 2) return false;
    return !this.covered(px, py);
  }
  trigger(ball, t, events) {
    if (ball.air || ball.rider || !this.inBeam(ball.x, ball.y)) { this.seenT = 0; this.alert = Math.max(0, this.alert - (this.dt || 0) * 2); return; }
    this.alert = Math.min(1, this.alert + (this.dt || 0) * 3);
    if (Math.hypot(ball.vx, ball.vy) > this.still) { this.seenT = 0; return; }
    this.seenT += this.dt || 0;
    if (this.seenT < this.dwell) return;
    this.seenT = 0; events.push({ type: 'seen', x: ball.x, y: ball.y, owner: this });
  }
}

/* Löwentor: ein Torbogen in der Arenamauer, im Schlussstein ein Löwenkopf. Die Tore stehen paarweise.
   Wo sie stehen, sagt nicht das Hindernis, sondern die Karte: Der Großbuchstabe ist der Eingang, der
   gleiche Kleinbuchstabe der Ausgang (A/a, B/b, C/c). Mehrere Paare je Bahn sind erlaubt.

   Geschluckt wird nur, wer Schwung hat. Unter LOEWENTOR_TEMPO sperrt der Torbogen und der Ball prallt
   ab wie an einer Wand; ab LOEWENTOR_TEMPO verschwindet er im Tor und kommt am Ausgang wieder heraus –
   immer mit LOEWENTOR_AUSWURF in die Richtung, die am Hindernis als 'angle' (Grad) steht, ganz gleich
   wie schnell er hineingerollt ist. So bleibt der Auswurf berechenbar und die Bahn planbar.

   Von außen ist der Ausgang eine massive Wand: Sein Feld ist in der Karte kein Boden, die Arenamauer
   schließt ihn also von selbst – da kommt niemand hinein. */
class LionGate {
  constructor(d) {
    Object.assign(this, { pair: 'A', angle: 0 }, d);
    this.type = 'liongate';
    const a = (this.angle * Math.PI) / 180;
    this.dx = Math.cos(a); this.dy = Math.sin(a);
    this.alwaysForce = true;          // siehe force(): dort wird nur das Balltempo abgelesen
    this.offen = false; this.sperrt = false; this.bereit = false;
    this.schluckAt = -10; this.speiAt = -10;
    this.anfahrtX = 0; this.anfahrtY = 0;
  }

  /* Plätze aus der Karte holen. Nebenbei wird für beide Tore gemerkt, zu welcher Seite sie offen
     stehen – das ist die Blickrichtung des Löwen und die Notrichtung fürs Herausschieben. */
  setup(level) {
    const gross = this.pair.toUpperCase(), klein = this.pair.toLowerCase();
    for (let y = 0; y < level.H; y++) for (let x = 0; x < level.W; x++) {
      const c = level.tiles[y][x];
      if (c === gross) { this.x = x + 0.5; this.y = y + 0.5; }
      else if (c === klein) { this.ax = x + 0.5; this.ay = y + 0.5; }
    }
    this.bereit = this.x != null && this.ax != null;
    if (!this.bereit) return;
    const offeneSeite = (cx, cy) => {
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const c = level.charAt(cx + ox, cy + oy);
        if (level.isFloorChar(c) && c !== gross && c !== klein) return [ox, oy];
      }
      return [0, 0];
    };
    [this.mundX, this.mundY] = offeneSeite(this.x, this.y);
    [this.ausMundX, this.ausMundY] = offeneSeite(this.ax, this.ay);
  }

  imEingang(px, py) { return Math.abs(px - this.x) < 0.5 && Math.abs(py - this.y) < 0.5; }

  /* Berührt der Ball gerade die Toröffnung? Gemessen wird an der Kante des Torfeldes, nicht an
     seiner Mitte – sonst müsste der Ball nach der Berührung noch eine halbe Kachel weiterrollen und
     würde dabei abbremsen, und der Schwellwert wäre in Wahrheit höher als er dasteht. */
  beruehrtOeffnung(ball) {
    const mx = this.mundX, my = this.mundY;
    if (!mx && !my) return false;
    const kx = this.x + mx * 0.5, ky = this.y + my * 0.5;
    const vor = (ball.x - kx) * mx + (ball.y - ky) * my;      // > 0: noch vor dem Tor
    if (vor > ball.r || vor < -1) return false;
    return Math.abs((ball.x - kx) * -my + (ball.y - ky) * mx) < 0.5;
  }

  /* force ist der einzige Haken, der den Ball noch vor der Kollisionsrechnung zu sehen bekommt.
     Darum wird hier nichts geschoben, sondern nur abgelesen und entschieden, ob das Tor in diesem
     Schritt sperrt (siehe segments). Nebenbei merkt sich das Tor, aus welcher Richtung der Ball
     anrollt – das braucht der Notausgang weiter unten. */
  force(ball) {
    if (!this.bereit) return;
    const sp = Math.hypot(ball.vx, ball.vy);
    const drin = this.imEingang(ball.x, ball.y);
    this.offen = sp >= LOEWENTOR_TEMPO;
    // Gesperrt wird nur gegen einen Ball, der von außen kommt. Liegt er schon im Torbogen, bleibt die
    // Öffnung frei – sonst wäre er eingesperrt und der Notausgang könnte ihn nicht herausschieben.
    this.sperrt = !this.offen && !drin;
    if (sp > 0.2 && !drin) { this.anfahrtX = ball.vx / sp; this.anfahrtY = ball.vy / sp; }
  }

  /* Die Sperre ist eine Wand quer vor der Toröffnung, genau auf der Kante des Torfeldes. So prallt
     ein zu langsamer Ball davor ab, statt in den Bogen hineingeschoben zu werden. */
  segments(out) {
    if (!this.bereit || !this.sperrt) return;
    const mx = this.mundX, my = this.mundY;
    if (!mx && !my) return;
    const kx = this.x + mx * 0.5, ky = this.y + my * 0.5;   // Mitte der Öffnung
    const qx = -my * 0.5, qy = mx * 0.5;                    // quer dazu, halbe Kachel
    out.push({ ax: kx - qx, ay: ky - qy, bx: kx + qx, by: ky + qy, e: 0.55, kind: 'liongate', owner: this });
  }

  teleport(ball, t, events) {
    if (!this.bereit || ball.air || ball.rider || ball.portalCd > 0) return;
    // 'offen' ist das Tempo vom Anfang dieses Schritts – dieselbe Zahl, nach der oben die Sperre
    // gesetzt wurde. So entscheiden Sperre und Tor immer gleich, ohne Grenzfall dazwischen.
    if (!this.offen) return;
    if (!this.imEingang(ball.x, ball.y) && !this.beruehrtOeffnung(ball)) return;
    // Vor dem Ausgang absetzen, nicht darin: sein Feld ist Mauer, dort hätte der Ball keinen Boden
    ball.x = this.ax + this.dx * 0.95; ball.y = this.ay + this.dy * 0.95;
    ball.vx = this.dx * LOEWENTOR_AUSWURF; ball.vy = this.dy * LOEWENTOR_AUSWURF;
    ball.z = 0; ball.vz = 0; ball.air = false;
    ball.portalCd = 0.6;
    this.schluckAt = t; this.speiAt = t;
    events.push({ type: 'liongate', x: ball.x, y: ball.y, owner: this });
  }

  /* Notausgang: Der Ball ist im Torbogen zur Ruhe gekommen, ohne je schnell genug gewesen zu sein –
     etwa von einem Streitwagen hineingeschoben oder von oben hineingefallen. Damit er dort nicht
     liegen bleibt, schiebt ihn das Tor sanft entgegen seiner Anfahrt wieder heraus; weiß es die
     nicht, nimmt es die offene Seite des Torbogens. */
  trigger(ball, t, events) {
    if (!this.bereit || ball.air || ball.rider) return;
    if (!this.imEingang(ball.x, ball.y)) return;
    if (Math.hypot(ball.vx, ball.vy) > 0.6) return;
    let rx = -this.anfahrtX, ry = -this.anfahrtY;
    if (Math.hypot(rx, ry) < 0.1) { rx = this.mundX; ry = this.mundY; }
    const L = Math.hypot(rx, ry); if (L < 0.1) return;
    ball.vx = (rx / L) * LOEWENTOR_SCHUB; ball.vy = (ry / L) * LOEWENTOR_SCHUB;
  }
}

/* Wanderndes Tor: eine Mauer quer über den Weg, in der ein schmaler Durchlass steckt. Der Durchlass
   gleitet langsam an der Mauer entlang, kehrt am Ende um und kommt wieder zurück. Die Mauer selbst
   ist massiv – hindurch geht es nur durch den Spalt, und der ist selten dort, wo man ihn braucht.

   Gemauert wird wie beim festen Mauerstück von (x0,y0) nach (x1,y1), waagerecht oder senkrecht.
   Nicht die Umlaufzeit steht am Hindernis, sondern das Tempo als Konstante: So gleitet der Spalt an
   einer langen Mauer genauso schnell wie an einer kurzen, und eine längere Mauer wird von allein
   schwerer statt nur langsamer. */
const WANDERTOR_TEMPO = 1.15;     // Kacheln je Sekunde, mit denen der Durchlass wandert
const WANDERTOR_SPALT = 1.7;      // Standardbreite des Durchlasses in Kacheln

class WanderGate {
  constructor(d) {
    Object.assign(this, { gap: WANDERTOR_SPALT, t: 0.26, h: 0.75, phase: 0 }, d);
    this.type = 'wandergate';
    const dx = this.x1 - this.x0, dy = this.y1 - this.y0;
    this.len = Math.hypot(dx, dy) || 1;
    this.ux = dx / this.len; this.uy = dy / this.len;          // Richtung der Mauer
    // Der Spalt läuft zwischen seinen beiden Endlagen; die Umlaufzeit folgt aus Weg und Tempo
    this.weg = Math.max(0, this.len - this.gap);
    this.period = this.weg > 0 ? (2 * this.weg) / WANDERTOR_TEMPO : 1;
    this.mitte = this.gap / 2;                                  // Abstand des Spalts vom Maueranfang
  }

  update(t) {
    // Dreieckschwingung: gleichmäßig hin, gleichmäßig zurück – kein Beschleunigen an den Enden,
    // sonst wäre das Tor an den Umkehrpunkten kaum zu erwischen.
    const u = (((t / this.period + this.phase) % 1) + 1) % 1;
    const k = u < 0.5 ? u * 2 : 2 - u * 2;
    this.mitte = this.gap / 2 + k * this.weg;
    this.gx = this.x0 + this.ux * this.mitte;                   // Mitte des Durchlasses
    this.gy = this.y0 + this.uy * this.mitte;
  }

  /* Die Mauer in zwei Stücken: vom Anfang bis zum Spalt und vom Spalt bis zum Ende. Ist ein Stück
     kürzer als nichts (Spalt ganz am Rand), fällt es weg. */
  stuecke() {
    const a = this.mitte - this.gap / 2, b = this.mitte + this.gap / 2;
    const punkt = s => [this.x0 + this.ux * s, this.y0 + this.uy * s];
    const out = [];
    if (a > 0.01) out.push([punkt(0), punkt(a)]);
    if (b < this.len - 0.01) out.push([punkt(b), punkt(this.len)]);
    return out;
  }

  segments(out) {
    for (const [p, q] of this.stuecke()) out.push({ ax: p[0], ay: p[1], bx: q[0], by: q[1], e: 0.72, kind: 'wall' });
  }
}
