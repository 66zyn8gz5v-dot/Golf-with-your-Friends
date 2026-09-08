/* Hindernisse der Stufe „Legende“ (Sturmhimmel, Schattenreich):
   Blitzschlag, Aufwind, Falltür. Schattenzone ist ein field mit style 'dark' (nur Optik). */

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
