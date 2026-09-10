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

/* Feuerturm: ein hohes Bauwerk am Bahnrand mit einer brennenden Schale obenauf. Aus ihr fährt ein
   Feuerstrahl auf die Bahn, der langsam über einen festgelegten Bereich streicht und wieder
   zurück – wie ein Scheinwerfer. Er brennt ununterbrochen; gefährlich ist nicht ein Zeitpunkt,
   sondern ein Ort. Wer im Strahl liegt, rollt oder fliegt, wird zurück an seinen letzten Ruhepunkt
   gelegt – aber ohne Strafschlag. Der Turm kostet Weg und Zeit, nicht die Wertung.

   Geprüft wird bei jedem Physikschritt, nicht nur einmal: Der Ball kann in den stehenden Strahl
   hineinrollen, und der Strahl kann über einen ruhenden Ball hinwegstreichen. Beides muss zählen.

   Weil der Strahl immer sichtbar über den Boden wandert, braucht er keine Vorwarnung mehr – man
   sieht jederzeit, wo er steht und wohin er geht, und wartet den Moment zum Durchschlüpfen ab.

   Am Hindernis stehen der Platz des Turms (x, y) und der bestrichene Bereich (zx, zy, zw, zh) als
   Rechteck von der linken oberen Ecke aus – wie bei Aufwind und Kraftfeld. 'achse' sagt, in welche
   Richtung der Strahl wandert ('x' oder 'y'; ohne Angabe über die längere Seite), 'breit' wie breit
   er ist und 'tempo', wie schnell er streicht. Der Grundwert fürs Tempo steht hier als Konstante,
   damit alle Türme einer Arena von sich aus im selben Tritt streichen. */
const FEUERTURM_TEMPO = 1.8;      // Kacheln je Sekunde, mit denen der Strahl über die Bahn streicht
const FEUERTURM_BREITE = 1.8;     // Standardbreite des Strahls in Kacheln

class FireTower {
  constructor(d) {
    Object.assign(this, { r: 0.75, height: 3.4, zx: 0, zy: 0, zw: 8, zh: 4,
      breit: FEUERTURM_BREITE, tempo: FEUERTURM_TEMPO, phase: 0 }, d);
    this.type = 'firetower';
    if (this.achse !== 'x' && this.achse !== 'y') this.achse = this.zw >= this.zh ? 'x' : 'y';
    // Der Strahl bleibt mit seiner ganzen Breite im Bereich: seine Mitte läuft nur zwischen von und bis
    const laenge = this.achse === 'x' ? this.zw : this.zh, start = this.achse === 'x' ? this.zx : this.zy;
    this.von = start + this.breit / 2; this.bis = start + laenge - this.breit / 2;
    this.mitte = (this.von + this.bis) / 2;
    this.richtung = 0;
    this.zmx = this.zx + this.zw / 2; this.zmy = this.zy + this.zh / 2;   // Mitte des Bereichs
  }

  update(t) {
    const weg = this.bis - this.von;
    if (weg <= 0.001) { this.mitte = (this.von + this.bis) / 2; this.richtung = 0; return; }
    /* Dreieckschwingung: gleichmäßig hin, gleichmäßig zurück. An den Umkehrpunkten abzubremsen
       würde den Strahl dort kleben lassen – gerade am Rand soll er zügig wenden. */
    const dauer = (2 * weg) / this.tempo;
    const u = ((((t / dauer + this.phase) % 1) + 1) % 1);
    const k = u < 0.5 ? u * 2 : 2 - u * 2;
    this.mitte = this.von + weg * k;
    this.richtung = u < 0.5 ? 1 : -1;
  }

  /* Liegt dieser Punkt im bestrichenen Bereich? Denselben Namen tragen alle Hindernisse, die den
     Ball ohne Strafschlag zurückwerfen – main.js prüft damit, ob der Ruhepunkt selbst darin liegt.
     Absichtlich der ganze Bereich und nicht nur der Strahl: Ein Ruhepunkt im Bereich wäre früher
     oder später wieder im Strahl, der Ball käme nie heraus. */
  trifft(px, py) { return px >= this.zx && px <= this.zx + this.zw && py >= this.zy && py <= this.zy + this.zh; }

  /* Brennt es genau hier, jetzt? */
  imStrahl(px, py) {
    if (!this.trifft(px, py)) return false;
    return Math.abs((this.achse === 'x' ? px : py) - this.mitte) <= this.breit / 2;
  }

  /* Mitte des Strahls in Weltkoordinaten (Zielpunkt des Feuerbogens von der Schale herab) */
  get smx() { return this.achse === 'x' ? this.mitte : this.zmx; }
  get smy() { return this.achse === 'x' ? this.zmy : this.mitte; }

  trigger(ball, t, events) {
    if (ball.rider || !this.imStrahl(ball.x, ball.y)) return;
    events.push({ type: 'scorched', x: ball.x, y: ball.y, ob: this });
  }

  airTrigger(ball, t, events) {   // der Strahl erwischt auch einen fliegenden Ball
    if (!this.imStrahl(ball.x, ball.y)) return false;
    events.push({ type: 'scorched', x: ball.x, y: ball.y, ob: this }); return true;
  }

  circles(out) { out.push({ x: this.x, y: this.y, r: this.r, e: 0.5, kind: 'tower' }); }
}

/* Kaiserloge: eine überdachte Tribüne am Bahnrand mit einer großen Daumen-Anzeige. Nach jedem
   Schlag – gleich, welcher Spieler geschlagen hat – dreht der Kaiser den Daumen um. Bei „Daumen
   runter" klappt eine festgelegte Falltür in der Bahn auf, bei „hoch" ist sie zu. Wer in die
   offene Luke rollt, kommt an seinen letzten Ruhepunkt zurück – ohne Strafschlag.

   Gezählt wird das Ende eines Schlags, nicht sein Anfang (main.js zählt in level.schlagZahl mit).
   Das ist wichtig fürs Spielgefühl: So gilt der Daumenstand, den man beim Zielen sieht, für den
   ganzen Schlag. Würde er im Moment des Abschlags umspringen, könnte man nichts planen.

   Und weil die Zahl aus dem Spielstand kommt und nicht aus der Uhr, sehen beim Online-Spiel alle
   denselben Daumen: Jedes Gerät führt dieselben Schläge aus, und mit Ruhemeldung und Schlag wird
   der Zählerstand zur Sicherheit mitgeschickt.

   Am Hindernis stehen der Platz der Loge (x, y) samt Grundfläche (w, h) und die Luke als Rechteck
   von der linken oberen Ecke aus (lx, ly, lw, lh). 'start' sagt, wie der Daumen zu Beginn der Bahn
   steht: 'hoch' (Luke zu, Standard) oder 'runter' (Luke offen). */
const LOGE_SCHWENK = 0.28;        // Sekunden, in denen die Luke auf- bzw. zuschwenkt (nur Optik)

class ImperialBox {
  constructor(d) {
    Object.assign(this, { w: 3.4, h: 1.6, lx: 0, ly: 0, lw: 2, lh: 2, start: 'hoch' }, d);
    this.type = 'imperialbox';
    this.hoch = this.start !== 'runter';
    this.gap = this.hoch ? 0 : 1;   // 0 = Luke zu, 1 = ganz offen (nur zum Zeichnen)
    this.wechselT = -99;
    this.lmx = this.lx + this.lw / 2; this.lmy = this.ly + this.lh / 2;   // Mitte der Luke
  }

  update(t) {
    const n = (this.level && this.level.schlagZahl) || 0;
    const hoch = (n % 2 === 0) === (this.start !== 'runter');
    if (hoch !== this.hoch) { this.hoch = hoch; this.wechselT = t; }
    const u = Math.min(1, Math.max(0, (t - this.wechselT) / LOGE_SCHWENK));
    this.gap = hoch ? 1 - u : u;
  }

  trifft(px, py) { return px >= this.lx && px <= this.lx + this.lw && py >= this.ly && py <= this.ly + this.lh; }

  trigger(ball, t, events) {
    // Ein fliegender Ball setzt über die offene Luke hinweg – ein Loch im Boden fängt nur, was rollt
    if (this.hoch || ball.air || ball.rider || !this.trifft(ball.x, ball.y)) return;
    events.push({ type: 'dropped', x: ball.x, y: ball.y, ob: this });
  }
}

/* ---------- Die drei Maschinen der Uhrwerkstadt ----------
   Alles andere in dieser Welt ist eine bekannte Mechanik mit neuem Gesicht. Diese drei sind wirklich
   neu, weil sie etwas können, das es im Spiel noch nicht gab: eine Höhenstufe hinauftragen, im Takt
   hart zuschlagen, und einen Ball mit wachsendem Radius nach außen schleudern.

   Alle drei laufen auf der Spieluhr t – dieselbe Zahl auf jedem Gerät. Damit sehen beim Spiel
   gegeneinander alle denselben Ballweg, ohne dass etwas übertragen werden müsste. */

/* Zahnradaufzug: ein großes Zahnrad, das zum Teil im Boden steckt und vor einer geraden Wand
   steht – der Kante einer Höhenstufe. Es dreht sich unablässig.

   Der Weg des Balles: Er rollt an die Stelle, wo der Kranz auf der Spielerseite aus dem Boden
   kommt. Trifft er dort eine Zahnlücke, liegt er darin; das Rad trägt ihn die Außenflanke hinauf
   bis über den Scheitel – und dort oben wirft es ihn nach vorn über die Wand auf die obere Stufe.
   Trifft er einen Zahn, ist das Rad an dieser Stelle eine Wand, und der herabkommende Zahn schiebt
   ihn wieder von sich weg; er kommt erst mit der nächsten Lücke mit.

   Die Zeichnung benutzt genau dieselben Formeln (laengs/hoehe) und schneidet den Kranz am Boden ab.
   Damit sitzt der Ball sichtbar in seiner Lücke, und was unter dem Boden liegt, sieht man nicht.

   Warum das nicht die Fähre schon konnte: Die Fähre schiebt waagerecht. Eine Höhenstufe hinauf kam
   man bisher nur über eine Rampe, und die verlangt Anlauf – auf engen Bahnen ist dafür kein Platz.

   x, y ist die Achse des Rades (in der Aufsicht), angle zeigt über die Wand hinweg. */
class GearLift {
  constructor(d) {
    Object.assign(this, { r: 1.8, angle: 0, speed: 1.0472, zaehne: 8, phase: 0, fang: 7, dicke: 0.55,
      wurf: 3, tief: 0.38 }, d);
    this.type = 'gearlift';
    const a = (this.angle * Math.PI) / 180;
    this.dx = Math.cos(a); this.dy = Math.sin(a);      // Richtung über die Wand
    this.qx = -this.dy; this.qy = this.dx;             // längs der Wand, also längs der Achse
    this.drehung = 0;
  }
  update(t) { this.drehung = t * this.speed + this.phase * TAU; }
  /* Ein Punkt auf dem Kranz. w = 0 ist der tiefste Punkt (im Boden), w = π der Scheitel; dazwischen
     schwingt der Kranz auf die Spielerseite aus, laengs wird also negativ. */
  zAchse() { return this.r * (1 - this.tief); }        // Höhe der Achse über dem Boden
  laengs(w) { return -this.r * Math.sin(w); }
  hoehe(w) { return this.zAchse() - this.r * Math.cos(w); }
  /* Wo der Kranz den Boden schneidet: dort kommt er auf der Spielerseite heraus, dort spielt man ein */
  wBoden() { return Math.acos(Math.max(-0.99, Math.min(0.99, this.zAchse() / this.r))); }
  ein() { const l = this.laengs(this.wBoden()); return [this.x + this.dx * l, this.y + this.dy * l]; }
  aus() { return [this.x + this.dx * 1.4, this.y + this.dy * 1.4]; }
  teilung() { return TAU / this.zaehne; }
  /* Steht gerade eine Zahnlücke am Einstieg? Die Lücken sitzen bei drehung + i·Teilung. */
  lueckeAmEinstieg() {
    const teil = this.teilung();
    const rest = ((((this.wBoden() - this.drehung) % teil) + teil) % teil) / teil;
    return Math.min(rest, 1 - rest) < 0.26;
  }
  ride(ball, t, events) {
    if (ball.rider === this) {
      const w = this.wBoden() + Math.abs(this.drehung - ball.liftD0);
      if (w < Math.PI) {
        const l = this.laengs(w);
        ball.x = this.x + this.dx * l; ball.y = this.y + this.dy * l;
        ball.z = this.hoehe(w);
        ball.vx = 0; ball.vy = 0; ball.vz = 0;
        return true;
      }
      // Am Scheitel nach vorn über die Wand geworfen; der Ball fliegt und landet auf der Stufe
      ball.rider = null; ball.rideCd = 1.2;
      ball.x = this.x + this.dx * 0.3; ball.y = this.y + this.dy * 0.3;
      ball.z = this.hoehe(Math.PI); ball.vz = 0.5; ball.air = true;
      ball.vx = this.dx * this.wurf; ball.vy = this.dy * this.wurf;
      events.push({ type: 'dropoff', x: ball.x, y: ball.y });
      return false;
    }
    if (ball.rideCd > 0 || ball.air) return false;
    const [ex, ey] = this.ein();
    const dx = ball.x - ex, dy = ball.y - ey;
    /* Nah genug an der Einstiegsstelle: quer zur Achse eng, längs der Achse so breit wie das Rad.
       Das Fenster reicht weiter als der Zahn, damit ein Ball, der vor einem Zahn liegt, von der
       nächsten Lücke noch erwischt wird, statt für immer davor zu warten. */
    if (Math.abs(dx * this.dx + dy * this.dy) > 0.55) return false;
    if (Math.abs(dx * this.qx + dy * this.qy) > this.dicke / 2 + ball.r) return false;
    if (Math.hypot(ball.vx, ball.vy) > this.fang) return false;
    if (!this.lueckeAmEinstieg()) return false;
    ball.rider = this; ball.liftD0 = this.drehung;
    ball.x = ex; ball.y = ey; ball.vx = 0; ball.vy = 0; ball.z = 0;
    events.push({ type: 'board', x: ex, y: ey });
    return true;
  }
  /* Solange am Einstieg ein Zahn steht, ist das Rad dort eine Wand – und keine ruhige: Ein Zahn,
     der von oben herunterkommt, streicht an dieser Stelle nach außen und schiebt einen Ball, der
     dort liegt, wieder von sich weg. */
  segments(out) {
    if (this.lueckeAmEinstieg()) return;
    const [ex, ey] = this.ein(), h = this.dicke / 2 + 0.1;
    const weg = this.r * Math.abs(this.speed) * 0.25;
    out.push({ ax: ex + this.qx * h, ay: ey + this.qy * h, bx: ex - this.qx * h, by: ey - this.qy * h,
      rad: 0.16, e: 0.55, kind: 'mover', vx: -this.dx * weg, vy: -this.dy * weg, owner: this });
  }
}

/* Dampfkolben: ein Stempel, der auf den Schlag aus der Mauer fährt und dazwischen selbst Mauer ist.
   Anders als das Dampfventil trifft er hart und nur einen schmalen Streifen – entweder man ist weg,
   oder man fliegt quer über die Bahn.

   Die Stoßgeschwindigkeit wird gerechnet, nicht aus der Bildfolge geschätzt: Beim Ausfahren legt er
   'hub' Kacheln in 'stoss' Sekunden zurück, beim Zurückziehen dieselbe Strecke in der doppelten
   Zeit. Damit bleibt der Stoß auf jedem Gerät gleich stark, egal wie flüssig es läuft. */
class Piston {
  constructor(d) {
    Object.assign(this, { w: 1.2, h: 1.2, angle: 0, hub: 2.4, period: 4, phase: 0, stoss: 0.28, halt: 0.22, e: 0.45 }, d);
    this.type = 'piston';
    const a = (this.angle * Math.PI) / 180;
    this.dx = Math.cos(a); this.dy = Math.sin(a);
    this.aus = 0; this.vx = 0; this.vy = 0; this.px = this.x; this.py = this.y;
  }
  update(t) {
    const s = ((((t / this.period + this.phase) % 1) + 1) % 1) * this.period;
    const rein = this.stoss * 2;
    let anteil = 0, tempo = 0;
    if (s < this.stoss) { anteil = s / this.stoss; tempo = this.hub / this.stoss; }
    else if (s < this.stoss + this.halt) { anteil = 1; tempo = 0; }
    else if (s < this.stoss + this.halt + rein) { anteil = 1 - (s - this.stoss - this.halt) / rein; tempo = -this.hub / rein; }
    this.aus = anteil * this.hub;
    this.px = this.x + this.dx * this.aus; this.py = this.y + this.dy * this.aus;
    this.vx = this.dx * tempo; this.vy = this.dy * tempo;
    this.schlaegt = tempo > 0;
  }
  poly() { return rectPoly(this.px, this.py, this.w, this.h); }
  segments(out) { polySegments(this.poly(), out, { vx: this.vx, vy: this.vy, e: this.e, kind: 'mover', owner: this }); }
}

/* Zeiger: ein Uhrzeiger, der sich dreht. Wer langsam an ihn stößt, wird mitgenommen und dabei nach
   außen geschoben; am Ende der Stange fliegt er tangential davon. Wer mit Schwung kommt, prallt an
   der Stange ab wie an einem Drehkreuz.

   Der Unterschied zum Drehteller: Der wirft immer an derselben Stelle und immer gleich weit aus.
   Hier entscheidet der Spieler beides selbst – wo er den Zeiger trifft, bestimmt, wie lange er
   mitfährt, und daraus folgen Richtung und Weite. Nah an der Achse getroffen heißt: lange Fahrt,
   weiter Wurf. */
class Hand {
  constructor(d) {
    Object.assign(this, { len: 3, speed: 1.0472, phase: 0, thick: 0.18, schub: 1.5, fang: 5, hubR: 0.4, e: 0.85 }, d);
    this.type = 'hand'; this.angle = this.phase; this.omega = this.speed;
  }
  update(t) { this.angle = t * this.speed + this.phase; this.omega = this.speed; }
  spitze() { return [this.x + Math.cos(this.angle) * this.len, this.y + Math.sin(this.angle) * this.len]; }
  ride(ball, t, events) {
    if (ball.rider === this) {
      ball.handR += this.schub * Math.max(0, t - ball.handT); ball.handT = t;
      if (ball.handR >= this.len) {
        const a = this.angle, tang = this.omega * this.len;
        ball.rider = null; ball.rideCd = 1.2;
        ball.x = this.x + Math.cos(a) * (this.len + 0.25); ball.y = this.y + Math.sin(a) * (this.len + 0.25);
        ball.vx = -Math.sin(a) * tang + Math.cos(a) * this.schub * 2.2;
        ball.vy = Math.cos(a) * tang + Math.sin(a) * this.schub * 2.2;
        ball.z = 0; ball.vz = 0;
        events.push({ type: 'spinout', x: ball.x, y: ball.y });
        return false;
      }
      ball.x = this.x + Math.cos(this.angle) * ball.handR;
      ball.y = this.y + Math.sin(this.angle) * ball.handR;
      ball.vx = -Math.sin(this.angle) * this.omega * ball.handR;
      ball.vy = Math.cos(this.angle) * this.omega * ball.handR;
      ball.z = 0.05; ball.vz = 0;
      return true;
    }
    if (ball.rideCd > 0 || ball.air) return false;
    if (Math.hypot(ball.vx, ball.vy) > this.fang) return false;   // mit Schwung prallt man ab
    const dx = ball.x - this.x, dy = ball.y - this.y, d = Math.hypot(dx, dy);
    if (d < this.hubR || d > this.len) return false;
    // Abstand von der Stange: Winkelabweichung mal Radius
    const ab = Math.atan2(dy, dx) - this.angle;
    const quer = Math.abs(Math.atan2(Math.sin(ab), Math.cos(ab))) * d;
    if (quer > this.thick + ball.r + 0.2) return false;
    ball.rider = this; ball.handR = d; ball.handT = t;
    events.push({ type: 'spin', x: ball.x, y: ball.y });
    return true;
  }
  segments(out) {
    const [bx, by] = this.spitze();
    out.push({ ax: this.x, ay: this.y, bx, by, rad: this.thick, omega: this.omega,
      cx: this.x, cy: this.y, e: this.e, kind: 'rotor' });
  }
  circles(out) { out.push({ x: this.x, y: this.y, r: this.hubR, e: 0.6, kind: 'hub' }); }
}

/* ---------------------------------------------------------------------------
   Drei Maschinen aus bewährten Verhalten. Neu ist nur die Optik und die Bahn,
   auf der sie sich bewegen – wie sie sich anfühlen, kennt der Spieler schon.
   --------------------------------------------------------------------------- */

/* Schwingdauer des Pendels: eine volle Schwingung hin und zurück, in Sekunden.
   Bewusst eine Konstante und keine Angabe je Bahn – alle Pendel einer Bahn sollen
   im selben Takt gehen, nur ihre Phase darf sich unterscheiden. */
const PENDEL_TAKT = 3.4;

/* Zahnradfeld: eine Reihe ineinandergreifender Zahnräder, die im Boden liegen. Wer hineinrollt,
   wird von den Zähnen gefasst und ans andere Ende getragen – dasselbe Verhalten wie die Lore,
   nur ohne Wagen: Der Ball liegt zwischen den Zähnen und wird von ihnen weitergereicht.

   Die Räder drehen sich genau so weit, wie der Ball wandert (Umfang = Weg), und abwechselnd
   in die andere Richtung – so greifen sie ineinander, statt gegeneinander zu laufen. Steht das
   Feld an einer Station, stehen auch die Räder still; das ist der Moment zum Einsteigen. */
class GearField extends Ferry {
  constructor(d) {
    super(Object.assign({ w: 1.5, h: 1.5, wait: 2.2, travel: 3.2, r: 0.9, zaehne: 10 }, d));
    this.type = 'gearfield';
    this.tragHoehe = 0.18;                 // kein Wagen: der Ball liegt fast auf dem Boden
    this.raeder = [];
    const n = Math.max(2, Math.round(this.len / (this.r * 1.72)) + 1);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1);
      this.raeder.push({ x: this.x0 + (this.x1 - this.x0) * u, y: this.y0 + (this.y1 - this.y0) * u, dreh: i % 2 ? -1 : 1 });
    }
    this.winkel = 0;
  }
  update(t) { super.update(t); this.winkel = (this.progress * this.len) / this.r; }
}

/* Pendel: ein schwerer Körper an einer Stange, der quer über die Bahn schwingt. Er verhält sich
   wie der Ritter – ein bewegliches Hindernis, das den Ball wegstößt und ihm dabei seinen eigenen
   Schwung mitgibt. Die Stange hängt hoch über dem Boden und trifft nichts; nur die Linse unten
   räumt den Weg.

   x/y ist die Aufhängung und bleibt stehen, ruhe die Richtung der Ruhelage in Grad (90 = nach
   unten auf dem Bildschirm), amp der Ausschlag nach jeder Seite in Grad, len die Pendellänge. */
class Pendulum {
  constructor(d) {
    Object.assign(this, { len: 3.2, amp: 55, ruhe: 90, phase: 0, w: 1.2, h: 1.2, e: 0.7, hoehe: 0.8 }, d);
    this.type = 'pendulum';
    this.ax = this.x; this.ay = this.y;                 // Aufhängung
    this.ampR = (this.amp * Math.PI) / 180;
    this.ruheR = (this.ruhe * Math.PI) / 180;
    this.omega = TAU / PENDEL_TAKT;
    this.update(0);
  }
  update(t) {
    const w = this.omega * t + this.phase * TAU;
    this.angle = this.ruheR + this.ampR * Math.sin(w);
    const dw = this.ampR * this.omega * Math.cos(w);    // Winkelgeschwindigkeit
    this.x = this.ax + Math.cos(this.angle) * this.len;
    this.y = this.ay + Math.sin(this.angle) * this.len;
    this.vx = -Math.sin(this.angle) * this.len * dw;
    this.vy = Math.cos(this.angle) * this.len * dw;
    this.dir = Math.sign(dw) || 1;
    this.schwung = Math.abs(dw) / (this.ampR * this.omega || 1);   // 0 an den Umkehrpunkten, 1 in der Mitte
  }
  poly() { return rectPoly(this.x, this.y, this.w, this.h); }
  segments(out) { polySegments(this.poly(), out, { vx: this.vx, vy: this.vy, e: this.e, kind: 'mover', owner: this }); }
}

/* Federwerk: eine aufgezogene Spiralfeder, die in den Boden eingelassen ist. Wer hineinrollt,
   wird eingespannt; die Feder zieht sich zusammen und schnellt den Ball dann davon – dasselbe
   Verhalten wie die Kanone, nur schwenkt hier kein Rohr, sondern der Federarm. */
class SpringWork extends Cannon {
  constructor(d) {
    super(Object.assign({ amp: 0.45, speed: 0.9, range: 8, loadTime: 0.9, catchR: 0.7, flySpeed: 8 }, d));
    this.type = 'springwork'; this.style = 'feder';
  }
}

/* ---------------------------------------------------------------------------
   Kupferrohre und Hemmung – die zweite Lieferung für den Uhrenturm.
   --------------------------------------------------------------------------- */

/* Kupferrohr: die Rohrpost der Stadt. Verhalten ist Zeichen für Zeichen das des Löwentors – zwei
   Plätze auf der Karte als Groß- und Kleinbuchstabe eines Paares, der Eingang schluckt nur ab
   LOEWENTOR_TEMPO, wirft mit LOEWENTOR_AUSWURF in Richtung 'angle' wieder aus, ist von außen eine
   Wand, wenn der Ball zu langsam ankommt, und schiebt einen im Rohrmund liegengebliebenen Ball
   sanft entgegen seiner Anfahrt wieder heraus.

   Darum erbt es dieses Verhalten, statt es abzuschreiben: Wenn am Tempo, am Auswurf oder am
   Notausgang je etwas geändert wird, soll sich das Rohr genauso ändern. Neu ist allein das
   Gesicht – Kupfer statt Löwenmaul. */
class CopperPipe extends LionGate {
  constructor(d) { super(d); this.type = 'copperpipe'; }
}

/* Hemmung: zwei Sperrklinken nebeneinander in einem Durchlass. Immer ist genau eine Seite frei,
   die andere gesperrt; alle HEMMUNG_TAKT Sekunden springt es um. Beim Umschlagen sind für einen
   Augenblick beide Klinken unten – so wie in einer echten Hemmung die eine erst fasst, wenn die
   andere losgelassen hat. Wer den Umschlag mitnimmt, prallt ab.

   Der Takt steht als Konstante hier oben und nicht in den Bahndaten: Alle Hemmungen einer Bahn
   sollen gleich gehen, damit man einmal mitzählt und es danach für die ganze Bahn weiß. Was sich
   je Hemmung unterscheiden darf, ist die Phase – mit phase 0.5 startet die andere Seite offen. */
const HEMMUNG_TAKT = 2.6;        // Sekunden, die eine Seite offen steht
const HEMMUNG_UMSCHLAG = 0.35;   // Sekunden, in denen beide Klinken unten sind

class Escapement {
  constructor(d) {
    Object.assign(this, { w: 3, h: 0.45, phase: 0, e: 0.55, hoehe: 0.8 }, d);
    this.type = 'escapement';
    this.laengs = this.w >= this.h;          // true: die Klinken stehen in x nebeneinander
    this.update(0);
  }
  update(t) {
    const zyklus = 2 * HEMMUNG_TAKT;
    const s = ((((t / zyklus + this.phase) % 1) + 1) % 1) * zyklus;
    /* Wie weit ist eine Klinke gehoben? 0 = unten und sperrt, 1 = ganz zurückgezogen.
       Am Anfang und am Ende ihres Fensters braucht sie HEMMUNG_UMSCHLAG Sekunden dafür. */
    const hebe = (von, bis) => {
      if (s < von || s >= bis) return 0;
      const k = Math.min(1, (s - von) / HEMMUNG_UMSCHLAG, (bis - s) / HEMMUNG_UMSCHLAG);
      return k * k * (3 - 2 * k);
    };
    this.aufA = hebe(0, HEMMUNG_TAKT);
    this.aufB = hebe(HEMMUNG_TAKT, zyklus);
    this.zuA = this.aufA < 0.5; this.zuB = this.aufB < 0.5;
    this.anker = this.aufB - this.aufA;      // -1 .. 1, zeigt zur offenen Seite (fürs Zeichnen)
  }
  /* Mitte und Maße einer der beiden Hälften. sd = -1 ist Klinke A, +1 ist Klinke B. */
  haelfte(sd) {
    const halb = (this.laengs ? this.w : this.h) / 2, dick = this.laengs ? this.h : this.w;
    const cx = this.x + (this.laengs ? (sd * halb) / 2 : 0);
    const cy = this.y + (this.laengs ? 0 : (sd * halb) / 2);
    return { cx, cy, laenge: halb, dick };
  }
  segments(out) {
    for (const [zu, sd] of [[this.zuA, -1], [this.zuB, 1]]) {
      if (!zu) continue;
      const { cx, cy, laenge, dick } = this.haelfte(sd);
      polySegments(rectPoly(cx, cy, this.laengs ? laenge : dick, this.laengs ? dick : laenge),
        out, { e: this.e, kind: 'gate', owner: this });
    }
  }
}

/* ---------------------------------------------------------------------------
   Zeigerarm und Zifferblatt – die dritte Lieferung für den Uhrenturm.
   --------------------------------------------------------------------------- */

/* Zeigerarm: ein großer Uhrzeiger, der über eine runde Fläche streicht. Er ist massiv und nimmt
   den Ball vor sich her mit – nicht wie das Pendel, das ihn wegschlägt, sondern langsam und
   stetig, weil er langsam geht. Getroffen wird der Ball mit der Bahngeschwindigkeit an der Stelle,
   an der er die Stange berührt: weit außen schneller, nah an der Nabe fast gar nicht.

   Die Umlaufdauer steht als Konstante hier und nicht in den Bahndaten – alle Zeigerarme einer Bahn
   sollen gleich gehen. Je Arm unterscheiden sich Länge, Ort und Phase. */
const ZEIGERARM_UMLAUF = 12;     // Sekunden für eine volle Runde, immer im Uhrzeigersinn

class SweepHand {
  constructor(d) {
    Object.assign(this, { r: 4.5, thick: 0.24, phase: 0, e: 0.45, hoehe: 0.5, nabe: 0.55 }, d);
    this.type = 'sweephand';
    this.omega = TAU / ZEIGERARM_UMLAUF;
    this.update(0);
  }
  update(t) { this.angle = this.phase * TAU + t * this.omega; }
  spitze() { return [this.x + Math.cos(this.angle) * this.r, this.y + Math.sin(this.angle) * this.r]; }
  segments(out) {
    const [bx, by] = this.spitze();
    out.push({ ax: this.x, ay: this.y, bx, by, rad: this.thick, omega: this.omega,
      cx: this.x, cy: this.y, e: this.e, kind: 'rotor' });
  }
  circles(out) { out.push({ x: this.x, y: this.y, r: this.nabe, e: 0.6, kind: 'hub' }); }
}

/* Zifferblatt: das Loch liegt nicht fest, sondern springt alle ZIFFERBLATT_TAKT Sekunden auf die
   nächste Stundenmarke – immer im Uhrzeigersinn, immer eine Marke weiter. Damit ist es kein
   Glücksspiel: Die nächste Stelle ist von Anfang an zu sehen, und man kann den Schlag so legen,
   dass der Ball dort ankommt, wenn das Loch dort ist.

   Das Hindernis verschiebt das Loch der Bahn selbst (level.cup). Auf der Karte steht das 'H'
   trotzdem – auf der ersten Marke, damit die Bahn auch ohne laufende Uhr stimmt und die
   Bahnprüfung ihren Weg zum Loch findet. */
const ZIFFERBLATT_TAKT = 10;     // Sekunden, die das Loch auf einer Marke bleibt

class Dial {
  constructor(d) {
    Object.assign(this, { r: 6, marken: 12, phase: 0 }, d);
    this.type = 'dial';
    this.i = 0; this.next = 1; this.rest = ZIFFERBLATT_TAKT;
  }
  setup(level) { this.level = level; }
  /* Marke 0 steht oben (12 Uhr); weiter geht es im Uhrzeigersinn. */
  markePos(i) {
    const a = -Math.PI / 2 + (i * TAU) / this.marken;
    return [this.x + Math.cos(a) * this.r, this.y + Math.sin(a) * this.r];
  }
  update(t) {
    const schritt = Math.floor(t / ZIFFERBLATT_TAKT + this.phase);
    this.i = ((schritt % this.marken) + this.marken) % this.marken;
    this.next = (this.i + 1) % this.marken;
    this.rest = ZIFFERBLATT_TAKT * (1 - ((t / ZIFFERBLATT_TAKT + this.phase) - schritt));
    if (!this.level || !this.level.cup) return;
    const [px, py] = this.markePos(this.i);
    this.level.cup.x = px; this.level.cup.y = py;
  }
}
