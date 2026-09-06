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
  constructor(d) { Object.assign(this, { w: 2, h: 2, minSpeed: 2.5, land: 5, fly: 7 }, d); this.type = 'updraft'; }
  inside(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
  launch(ball, events) {
    if (ball.air || ball.rider || !this.inside(ball.x, ball.y)) return;
    const sp = Math.hypot(ball.vx, ball.vy); if (sp < this.minSpeed) return;
    const ux = ball.vx / sp, uy = ball.vy / sp, tFlight = this.land / this.fly;
    ball.vx = ux * this.fly; ball.vy = uy * this.fly;
    ball.vz = (12 * tFlight) / 2; ball.z = Math.max(ball.z, 0.01); ball.air = true;
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
