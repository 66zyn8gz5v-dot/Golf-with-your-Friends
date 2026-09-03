/* Dynamische und statische Hindernisse. Jedes Objekt kann anbieten:
   update(t), segments(out), circles(out), force(ball, dt), teleport(ball, t) */
const TAU = Math.PI * 2;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

function rectPoly(x, y, w, h) {
  return [[x - w / 2, y - h / 2], [x + w / 2, y - h / 2], [x + w / 2, y + h / 2], [x - w / 2, y + h / 2]];
}
function polySegments(poly, out, extra) {
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    out.push(Object.assign({ ax: a[0], ay: a[1], bx: b[0], by: b[1] }, extra));
  }
}

class Mover {
  constructor(d) {
    Object.assign(this, { w: 1, h: 1, period: 6, phase: 0, style: 'cart', e: 0.6, height: 0.9 }, d);
    this.type = 'mover'; this.x = this.x0; this.y = this.y0; this.vx = 0; this.vy = 0;
  }
  update(t) {
    const ph = TAU * (t / this.period + this.phase);
    const u = 0.5 - 0.5 * Math.cos(ph);
    const du = 0.5 * Math.sin(ph) * TAU / this.period;
    this.x = this.x0 + (this.x1 - this.x0) * u;
    this.y = this.y0 + (this.y1 - this.y0) * u;
    this.vx = (this.x1 - this.x0) * du;
    this.vy = (this.y1 - this.y0) * du;
    this.dir = Math.sign(this.vx || this.vy) || 1;
  }
  poly() { return rectPoly(this.x, this.y, this.w, this.h); }
  segments(out) { polySegments(this.poly(), out, { vx: this.vx, vy: this.vy, e: this.e, kind: 'mover' }); }
}

class Rotor {
  constructor(d) {
    Object.assign(this, { blades: 4, len: 3, speed: 1, phase: 0, thick: 0.16, hubR: 0.45, style: 'wood', height: 0.55 }, d);
    this.type = 'rotor'; this.angle = 0;
  }
  update(t) { this.angle = t * this.speed + this.phase; }
  bladeAngle(i) { return this.angle + (i * TAU) / this.blades; }
  segments(out) {
    for (let i = 0; i < this.blades; i++) {
      const a = this.bladeAngle(i);
      out.push({ ax: this.x, ay: this.y, bx: this.x + Math.cos(a) * this.len, by: this.y + Math.sin(a) * this.len,
        rad: this.thick, omega: this.speed, cx: this.x, cy: this.y, e: 0.9, kind: 'rotor' });
    }
  }
  circles(out) { out.push({ x: this.x, y: this.y, r: this.hubR, e: 0.6, kind: 'hub' }); }
}

class Gate {
  constructor(d) {
    Object.assign(this, { w: 1, h: 0.3, period: 5, open: 0.5, phase: 0, liftH: 1.3, barH: 0.9 }, d);
    this.type = 'gate'; this.lift = 0;
  }
  update(t) {
    const u = (((t / this.period + this.phase) % 1) + 1) % 1;
    const c = 1 - this.open, ramp = 0.1;
    let l;
    if (u < c) l = 0;
    else if (u < c + ramp) l = (u - c) / ramp;
    else if (u > 1 - ramp) l = (1 - u) / ramp;
    else l = 1;
    this.lift = l * l * (3 - 2 * l);
    this.closed = this.lift < 0.45;
  }
  segments(out) {
    if (!this.closed) return;
    polySegments(rectPoly(this.x, this.y, this.w, this.h), out, { e: 0.6, kind: 'gate' });
  }
}

class Bumper {
  constructor(d) {
    Object.assign(this, { r: 0.6, style: 'mushroom', kick: 7.5 }, d);
    this.type = 'bumper'; this.hitAt = -10;
  }
  circles(out) { out.push({ x: this.x, y: this.y, r: this.r, e: 1.05, kick: this.kick, kind: 'bumper', owner: this }); }
}

class Portal {
  constructor(d) {
    Object.assign(this, { r: 0.55, color: '#4fd0ff', entrance: true }, d);
    this.type = 'portal'; this.lastUse = -10;
  }
  teleport(ball, t, events) {
    if (!this.entrance || ball.portalCd > 0) return;
    const dx = ball.x - this.x, dy = ball.y - this.y;
    if (dx * dx + dy * dy > 0.38 * 0.38) return;
    const sp = Math.hypot(ball.vx, ball.vy);
    const dirx = sp > 0.01 ? ball.vx / sp : 0, diry = sp > 0.01 ? ball.vy / sp : 0;
    ball.x = this.tx + dirx * 0.65; ball.y = this.ty + diry * 0.65;
    ball.portalCd = 0.7; ball.z = 0.35; ball.vz = 2.5;
    this.lastUse = t;
    events.push({ type: 'portal', from: this, x: this.tx, y: this.ty, color: this.color });
  }
}

class Boost {
  constructor(d) {
    Object.assign(this, { w: 2, h: 1, angle: 0, acc: 28, max: 19 }, d);
    this.type = 'boost';
    const a = (this.angle * Math.PI) / 180;
    this.dx = Math.cos(a); this.dy = Math.sin(a);
  }
  inside(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
  force(ball, dt) {
    if (!this.inside(ball.x, ball.y)) return;
    ball.vx += this.dx * this.acc * dt; ball.vy += this.dy * this.acc * dt;
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp > this.max) { ball.vx *= this.max / sp; ball.vy *= this.max / sp; }
    ball.boosted = true;
  }
}

class Field {
  constructor(d) { Object.assign(this, { w: 2, h: 2, fx: 0, fy: 0, style: 'wind' }, d); this.type = 'field'; }
  inside(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
  force(ball, dt) {
    if (!this.inside(ball.x, ball.y)) return;
    ball.vx += this.fx * dt; ball.vy += this.fy * dt;
  }
}

class Rail { constructor(d) { Object.assign(this, d); this.type = 'rail'; } }

/* Geländer: gerades Mauerstück von (x0,y0) nach (x1,y1) */
class Wall {
  constructor(d) { Object.assign(this, { t: 0.22, h: 0.5 }, d); this.type = 'wall'; }
  segments(out) { out.push({ ax: this.x0, ay: this.y0, bx: this.x1, by: this.y1, e: 0.72, kind: 'wall' }); }
}

/* Fähre: pendelt zwischen zwei Stationen, wartet dort, nimmt den Ball mit und setzt ihn
   an der nächsten Station wieder ab. Keine Kollision – der Ball rollt hinein. */
class Ferry {
  constructor(d) {
    Object.assign(this, { w: 1.1, h: 1.1, wait: 2.5, travel: 3, phase: 0, style: 'cart' }, d);
    this.type = 'ferry'; this.x = this.x0; this.y = this.y0; this.docked = true; this.station = 'A'; this.dir = 1;
    this.len = Math.hypot(this.x1 - this.x0, this.y1 - this.y0) || 1;
    this.ux = (this.x1 - this.x0) / this.len; this.uy = (this.y1 - this.y0) / this.len;
  }
  update(t) {
    const cycle = 2 * (this.wait + this.travel);
    const u = (((t + this.phase * cycle) % cycle) + cycle) % cycle;
    let p, dir;
    if (u < this.wait) { p = 0; this.docked = true; this.station = 'A'; dir = 1; }
    else if (u < this.wait + this.travel) { const q = (u - this.wait) / this.travel; p = q * q * (3 - 2 * q); this.docked = false; this.station = null; dir = 1; }
    else if (u < 2 * this.wait + this.travel) { p = 1; this.docked = true; this.station = 'B'; dir = -1; }
    else { const q = (u - 2 * this.wait - this.travel) / this.travel; p = 1 - q * q * (3 - 2 * q); this.docked = false; this.station = null; dir = -1; }
    this.x = this.x0 + (this.x1 - this.x0) * p; this.y = this.y0 + (this.y1 - this.y0) * p;
    this.dir = dir; this.progress = p;
  }
  poly() { return rectPoly(this.x, this.y, this.w, this.h); }
  /* Ein- und Aussteigen; liefert true, wenn der Ball gerade mitfährt */
  ride(ball, t, events) {
    if (ball.rider === this) {
      ball.x = this.x; ball.y = this.y; ball.vx = 0; ball.vy = 0; ball.z = 0.7; ball.vz = 0;
      if (this.docked && this.station !== ball.boardStation) {
        // Absetzen jenseits der Station in Fahrtrichtung
        const d = this.station === 'B' ? 1 : -1;
        ball.rider = null; ball.rideCd = 1.5;
        ball.x = this.x + this.ux * d * (this.w / 2 + 0.6); ball.y = this.y + this.uy * d * (this.h / 2 + 0.6);
        ball.vx = this.ux * d * 2.2; ball.vy = this.uy * d * 2.2; ball.z = 0.7; ball.vz = 1;
        events.push({ type: 'dropoff', x: ball.x, y: ball.y });
        return false;
      }
      return true;
    }
    if (ball.rideCd > 0) return false;
    const dx = ball.x - this.x, dy = ball.y - this.y;
    if (Math.abs(dx) < this.w / 2 + 0.15 && Math.abs(dy) < this.h / 2 + 0.15) {
      ball.rider = this; ball.boardStation = this.docked ? this.station : 'transit';
      ball.x = this.x; ball.y = this.y; ball.vx = 0; ball.vy = 0; ball.z = 0.7;
      events.push({ type: 'board', x: this.x, y: this.y });
      return true;
    }
    return false;
  }
}

function createObstacles(defs) {
  const out = [];
  for (const d of defs) {
    switch (d.type) {
      case 'mover': out.push(new Mover(d)); break;
      case 'rotor': out.push(new Rotor(d)); break;
      case 'gate': out.push(new Gate(d)); break;
      case 'bumper': out.push(new Bumper(d)); break;
      case 'boost': out.push(new Boost(d)); break;
      case 'field': out.push(new Field(d)); break;
      case 'rail': out.push(new Rail(d)); break;
      case 'ferry': out.push(new Ferry(d)); break;
      case 'wall': out.push(new Wall(d)); break;
      case 'portal': {
        const a = new Portal({ x: d.x, y: d.y, tx: d.tx, ty: d.ty, color: d.color, entrance: true });
        const b = new Portal({ x: d.tx, y: d.ty, tx: d.x, ty: d.y, color: d.color, entrance: !!d.twoWay, exit: true });
        out.push(a, b); break;
      }
      default: console.warn('Unbekanntes Hindernis', d.type);
    }
  }
  return out;
}
