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

/* Welle: wandert wie ein Mover hin und her, ist aber keine Mauer – sie schiebt einen Ball,
   der auf ihr liegt, in ihrer Laufrichtung mit. Wer schneller ist als die Welle, rollt hindurch. */
class Wave extends Mover {
  constructor(d) { super(Object.assign({ w: 0.6, h: 3, period: 6, push: 16, style: 'wave', e: 0 }, d)); this.type = 'wave'; }
  segments() { /* keine Kollision */ }
  force(ball, dt) {
    if (ball.air || ball.rider) return;
    if (Math.abs(ball.x - this.x) > this.w / 2 + 0.3 || Math.abs(ball.y - this.y) > this.h / 2) return;
    const sp = Math.hypot(this.vx, this.vy); if (sp < 0.05) return;
    const ux = this.vx / sp, uy = this.vy / sp, along = ball.vx * ux + ball.vy * uy;
    if ((ball.x - this.x) * ux + (ball.y - this.y) * uy < -this.w / 2 + 0.05) return; // liegt hinter dem Kamm: nicht mehr schieben
    if (along < sp * 1.15) { ball.vx += ux * this.push * dt; ball.vy += uy * this.push * dt; }
  }
}

/* Springender Hai: taucht im Takt aus der Bucht auf und springt quer über die Lücke.
   Ein Ball, der während des Sprungs über die Bucht fliegt, wird gefressen (Strafschlag wie Wasser). */
class SharkJump {
  constructor(d) {
    Object.assign(this, { w: 4, h: 5, period: 4, jump: 0.4, phase: 0, axis: 'y', height: 1.7 }, d);
    this.type = 'sharkjump'; this.jumping = false; this.p = 0; this.px = this.x; this.py = this.y; this.z = 0;
  }
  update(t) {
    const u = (((t / this.period + this.phase) % 1) + 1) % 1;
    this.jumping = u < this.jump; this.p = this.jumping ? u / this.jump : 0;
    const span = (this.axis === 'y' ? this.h : this.w) / 2 + 0.9, s = -span + this.p * 2 * span;
    this.px = this.axis === 'y' ? this.x : this.x + s; this.py = this.axis === 'y' ? this.y + s : this.y;
    this.z = this.jumping ? this.height * 4 * this.p * (1 - this.p) : 0;
    this.dir = 1;
  }
  airTrigger(ball, t, events) {
    if (!this.jumping) return false;
    if (Math.abs(ball.x - this.x) > this.w / 2 || Math.abs(ball.y - this.y) > this.h / 2) return false;
    events.push({ type: 'shark', x: ball.x, y: ball.y }); return true;
  }
}

class Rotor {
  constructor(d) {
    Object.assign(this, { blades: 4, len: 3, speed: 1, phase: 0, thick: 0.16, hubR: 0.45, style: 'wood', height: 0.55 }, d);
    this.type = 'rotor'; this.angle = 0; this.omega = this.speed;
  }
  update(t) {
    if (this.swing) { // Pendel: schwingt hin und her statt zu rotieren
      this.angle = this.phase + this.swing.amp * Math.sin(t * this.swing.speed);
      this.omega = this.swing.amp * this.swing.speed * Math.cos(t * this.swing.speed);
    } else { this.angle = t * this.speed + this.phase; this.omega = this.speed; }
  }
  bladeAngle(i) { return this.angle + (i * TAU) / this.blades; }
  segments(out) {
    for (let i = 0; i < this.blades; i++) {
      const a = this.bladeAngle(i);
      out.push({ ax: this.x, ay: this.y, bx: this.x + Math.cos(a) * this.len, by: this.y + Math.sin(a) * this.len,
        rad: this.thick, omega: this.omega, cx: this.x, cy: this.y, e: this.e ?? 0.9, kind: 'rotor' });
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
    if (this.linked) { // Zaubertor: nur offen, solange der zugehörige Schalter aktiv ist
      const until = (this.level && this.level.switches[this.linked]) || 0;
      const target = until > t ? 1 : 0;
      this.lift += (target - this.lift) * 0.12; if (Math.abs(target - this.lift) < 0.01) this.lift = target;
      this.closed = this.lift < 0.45; return;
    }
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
  constructor(d) { Object.assign(this, { w: 2, h: 2, fx: 0, fy: 0, style: 'wind', phase: 0 }, d); this.type = 'field'; this.k = 1; }
  inside(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
  /* gust > 0: Windstöße statt Dauerwind – die Kraft schwillt im Takt an und ab (gust = Winkelgeschwindigkeit) */
  update(t) { this.k = this.gust ? Math.pow(Math.max(0, Math.sin(t * this.gust + this.phase)), 2) : 1; }
  force(ball, dt) {
    if (!this.inside(ball.x, ball.y)) return;
    ball.vx += this.fx * this.k * dt; ball.vy += this.fy * this.k * dt;
  }
}

class Rail { constructor(d) { Object.assign(this, d); this.type = 'rail'; } }

/* Sprungschanze: Ball, der mit Schwung in Rampenrichtung auffährt, fliegt in festem Bogen
   über alles hinweg und landet 'land' Kacheln hinter dem Rampenende. */
class Ramp {
  constructor(d) {
    Object.assign(this, { w: 2, h: 2, angle: 90, minSpeed: 2.5, speed: 4.2, land: 1.7, height: 0.7 }, d);
    this.type = 'ramp';
    const a = (this.angle * Math.PI) / 180; this.dx = Math.cos(a); this.dy = Math.sin(a);
  }
  inside(px, py) { return px >= this.x && px <= this.x + this.w && py >= this.y && py <= this.y + this.h; }
  /* Abstand vom Ball bis zur Rampenkante (Ende) entlang der Richtung */
  toEnd(px, py) {
    const cx = this.x + this.w / 2, cy = this.y + this.h / 2;
    const half = Math.abs(this.dx) > 0.5 ? this.w / 2 : this.h / 2;
    return half - ((px - cx) * this.dx + (py - cy) * this.dy);
  }
  launch(ball, events) {
    if (ball.air || !this.inside(ball.x, ball.y)) return;
    const sp = Math.hypot(ball.vx, ball.vy);
    if (sp < this.minSpeed) return;
    if ((ball.vx * this.dx + ball.vy * this.dy) < 0.6 * sp) return; // nur bergauf
    const dist = this.toEnd(ball.x, ball.y) + this.land;
    const tFlight = dist / this.speed;
    ball.vx = this.dx * this.speed; ball.vy = this.dy * this.speed;
    ball.vz = (12 * tFlight) / 2; ball.z = Math.max(ball.z, 0.01); ball.air = true;
    events.push({ type: 'jump', x: ball.x, y: ball.y });
  }
}

/* Windmühle: ein Gebäude quer zum Weg mit schmalem Durchgang in der Mitte. Die Flügel drehen sich
   in einer senkrechten Ebene vor dem Durchgang; zeigt ein Flügel nach unten, ist die Tür versperrt. */
class Windmill {
  constructor(d) {
    Object.assign(this, { w: 3, depth: 1.2, gap: 0.8, speed: 1.2, phase: 0, axis: 'y', blades: 4, len: 1.3, height: 1.7, overlap: 0.7 }, d);
    this.type = 'windmill'; this.angle = 0; this.blocked = false;
    // axis: Richtung, in der sich das Gebäude erstreckt ('y' = quer zu einem Weg entlang x)
    // overlap: die Gebäudehälften reichen in die Randmauern hinein, damit keine Lücke bleibt
    const ax = this.axis === 'x';
    const bw = (this.w - this.gap) / 2 + this.overlap, off = this.gap / 2 + bw / 2;
    this.blocks = ax
      ? [rectPoly(this.x - off, this.y, bw, this.depth), rectPoly(this.x + off, this.y, bw, this.depth)]
      : [rectPoly(this.x, this.y - off, this.depth, bw), rectPoly(this.x, this.y + off, this.depth, bw)];
    // Türsegmente (beide Seiten des Durchgangs), nur aktiv wenn versperrt
    const g = this.gap / 2, dd = this.depth / 2;
    this.doors = ax
      ? [{ ax: this.x - g, ay: this.y - dd, bx: this.x + g, by: this.y - dd }, { ax: this.x - g, ay: this.y + dd, bx: this.x + g, by: this.y + dd }]
      : [{ ax: this.x - dd, ay: this.y - g, bx: this.x - dd, by: this.y + g }, { ax: this.x + dd, ay: this.y - g, bx: this.x + dd, by: this.y + g }];
  }
  update(t) {
    this.angle = t * this.speed + this.phase;
    const step = TAU / this.blades;
    const rel = ((this.angle + Math.PI / 2) % step + step) % step; // 0 = ein Flügel zeigt nach unten
    this.blocked = rel < 0.3 || rel > step - 0.3;
  }
  segments(out) {
    for (const b of this.blocks) polySegments(b, out, { e: 0.6, kind: 'wall' });
    if (this.blocked) for (const d of this.doors) out.push(Object.assign({ e: 0.5, kind: 'gate' }, d));
  }
}

/* Schalter: Druckplatte, die ein verknüpftes Zaubertor für 'duration' Sekunden öffnet */
class Switch {
  constructor(d) { Object.assign(this, { r: 0.5, duration: 12, target: 'A' }, d); this.type = 'switch'; this.activeUntil = 0; }
  trigger(ball, t, events) {
    if (Math.hypot(ball.x - this.x, ball.y - this.y) > this.r) return;
    if (this.activeUntil > t + this.duration - 0.5) return; // gerade erst ausgelöst
    this.activeUntil = t + this.duration; this.level.switches[this.target] = this.activeUntil;
    events.push({ type: 'switch', x: this.x, y: this.y });
  }
}

/* Schrumpftrank: der Ball wird für 'duration' Sekunden auf 'scale' verkleinert */
class Potion {
  constructor(d) { Object.assign(this, { r: 0.45, duration: 12, scale: 0.55 }, d); this.type = 'potion'; this.lastUse = -10; }
  trigger(ball, t, events) {
    if (t - this.lastUse < 1.5 || Math.hypot(ball.x - this.x, ball.y - this.y) > this.r) return;
    this.lastUse = t; ball.shrinkUntil = t + this.duration; ball.r = BALL_R * this.scale;
    events.push({ type: 'shrink', x: this.x, y: this.y });
  }
}

/* Drehscheibe: ein großes Zahnrad im Boden. Ein langsamer Ball wird eingefangen, fährt auf der
   Scheibe mit und wird an der Auswurfrinne (Weltwinkel 'exit', Grad) nach außen geschleudert.
   Schnelle Bälle (über captureSpeed) rollen einfach darüber hinweg. */
class Turntable {
  constructor(d) {
    Object.assign(this, { r: 1.3, speed: 2, exit: 0, captureSpeed: 7, eject: 4.5 }, d);
    this.type = 'turntable'; this.angle = 0; this.exitA = (this.exit * Math.PI) / 180;
  }
  update(t) { this.angle = t * this.speed; }
  ride(ball, t, events) {
    if (ball.rider === this) {
      const prev = ball.rideAng; ball.rideAng = ball.rideAng0 + this.speed * (t - ball.rideT0);
      // Auswurf, sobald der Ball den Rinnenwinkel passiert
      const norm = a => Math.atan2(Math.sin(a), Math.cos(a));
      const dPrev = norm(prev - this.exitA), dNow = norm(ball.rideAng - this.exitA);
      const crossed = this.speed > 0 ? (dPrev < 0 && dNow >= 0) : (dPrev > 0 && dNow <= 0);
      if (crossed) {
        const ex = Math.cos(this.exitA), ey = Math.sin(this.exitA);
        ball.rider = null; ball.rideCd = 1.5;
        ball.x = this.x + ex * (this.r + 0.2); ball.y = this.y + ey * (this.r + 0.2);
        ball.vx = ex * this.eject; ball.vy = ey * this.eject; ball.z = 0;
        events.push({ type: 'spinout', x: ball.x, y: ball.y });
        return false;
      }
      ball.x = this.x + Math.cos(ball.rideAng) * ball.rideR; ball.y = this.y + Math.sin(ball.rideAng) * ball.rideR;
      ball.vx = -Math.sin(ball.rideAng) * this.speed * ball.rideR; ball.vy = Math.cos(ball.rideAng) * this.speed * ball.rideR;
      ball.z = 0.05;
      return true;
    }
    if (ball.rideCd > 0 || ball.air) return false;
    const dx = ball.x - this.x, dy = ball.y - this.y, d = Math.hypot(dx, dy);
    if (d > this.r - 0.1 || Math.hypot(ball.vx, ball.vy) > this.captureSpeed) return false;
    ball.rider = this; ball.rideAng = ball.rideAng0 = Math.atan2(dy, dx); ball.rideT0 = t; ball.rideR = Math.max(0.5, Math.min(this.r - 0.35, d));
    events.push({ type: 'spin', x: ball.x, y: ball.y });
    return true;
  }
}

/* Kristall-Magnet: zieht den Ball an (strength > 0) oder stößt ihn ab (strength < 0) */
class Magnet {
  constructor(d) { Object.assign(this, { r: 3, strength: 6, core: 0.35, slow: 0 }, d); this.type = 'magnet'; }
  force(ball, dt) {
    const dx = this.x - ball.x, dy = this.y - ball.y, d = Math.hypot(dx, dy);
    if (d > this.r || d < 0.01) return;
    if (this.slow) { // Bremskoralle: zieht Tempo aus dem Ball, je näher desto stärker
      const k = Math.max(0, 1 - this.slow * (1 - d / this.r) * dt);
      ball.vx *= k; ball.vy *= k; return;
    }
    const a = this.strength * (1 - d / this.r) * 1.5;
    ball.vx += (dx / d) * a * dt; ball.vy += (dy / d) * a * dt;
  }
  circles(out) { out.push({ x: this.x, y: this.y, r: this.core, e: 0.5, kind: 'crystal', curse: this.curse }); }
}

/* Kanone: schwenkt hin und her; ein hineinrollender Ball wird geladen und nach kurzer Zeit
   in Rohrrichtung abgefeuert, Flugweite 'range' */
class Cannon {
  constructor(d) {
    Object.assign(this, { amp: 0.35, speed: 1.0, phase: 0, base: 0, range: 9, loadTime: 0.7, catchR: 0.6, flySpeed: 8 }, d);
    this.type = 'cannon'; this.angle = this.base; this.loaded = false; this.firedAt = -10;
  }
  update(t) { this.angle = this.base + this.amp * Math.sin(t * this.speed + this.phase); }
  ride(ball, t, events) {
    if (ball.rider === this) {
      ball.x = this.x; ball.y = this.y; ball.vx = 0; ball.vy = 0; ball.z = 0.7; ball.vz = 0;
      if (t >= ball.fireAt) {
        const dx = Math.cos(this.angle), dy = Math.sin(this.angle);
        ball.rider = null; ball.rideCd = 2; this.loaded = false; this.firedAt = t;
        ball.x = this.x + dx * 1.2; ball.y = this.y + dy * 1.2;
        ball.vx = dx * this.flySpeed; ball.vy = dy * this.flySpeed;
        const tFlight = this.range / this.flySpeed; ball.vz = (12 * tFlight) / 2; ball.z = 0.7; ball.air = true;
        events.push({ type: 'fire', x: ball.x, y: ball.y });
        return false;
      }
      return true;
    }
    if (ball.rideCd > 0 || ball.air) return false;
    if (Math.hypot(ball.x - this.x, ball.y - this.y) < this.catchR) {
      ball.rider = this; ball.fireAt = t + this.loadTime; this.loaded = true;
      ball.x = this.x; ball.y = this.y; ball.vx = 0; ball.vy = 0; ball.z = 0.55;
      events.push({ type: 'load', x: this.x, y: this.y });
      return true;
    }
    return false;
  }
}

/* Tür in die Hexenhütte: rollt der Ball hinein, wechselt die Bahn in ihre Innen-Map */
class Door {
  constructor(d) { Object.assign(this, { r: 0.55, s: 2.4 }, d); this.type = 'door'; }
  trigger(ball, t, events) {
    if (ball.air || ball.rider || ball.entered) return;
    if (Math.hypot(ball.x - this.x, ball.y - this.y) > this.r) return;
    ball.entered = true; events.push({ type: 'enter', x: this.x, y: this.y });
  }
}

/* Hexentopf: ein großer Kessel. Am Boden prallt der Ball ab – nur wer aus der Luft hineintrifft,
   wird geschrumpft, kurz im Sud gehalten und dann zur Seite 'exit' (Grad) wieder ausgespuckt. */
class Cauldron {
  constructor(d) {
    Object.assign(this, { r: 0.75, duration: 20, scale: 0.45, exit: 0, hold: 0.8, spit: 2.5 }, d);
    this.type = 'cauldron'; this.exitA = (this.exit * Math.PI) / 180; this.loaded = false;
  }
  circles(out) { out.push({ x: this.x, y: this.y, r: this.r, e: 0.5, kind: 'cauldron' }); }
  catch(ball, t, events) { // direkt nach einer Landung aus der Luft
    if (Math.hypot(ball.x - this.x, ball.y - this.y) > this.r * 0.9) return false;
    ball.rider = this; ball.spitAt = t + this.hold; this.loaded = true;
    ball.shrinkUntil = t + this.duration; ball.r = BALL_R * this.scale;
    ball.x = this.x; ball.y = this.y; ball.z = 0.95; ball.vx = 0; ball.vy = 0; ball.vz = 0;
    events.push({ type: 'shrink', x: this.x, y: this.y });
    return true;
  }
  ride(ball, t, events) {
    if (ball.rider !== this) return false;
    if (t >= ball.spitAt) {
      const ex = Math.cos(this.exitA), ey = Math.sin(this.exitA);
      ball.rider = null; this.loaded = false; ball.rideCd = 1;
      ball.x = this.x + ex * (this.r + 0.45); ball.y = this.y + ey * (this.r + 0.45);
      ball.vx = ex * this.spit; ball.vy = ey * this.spit; ball.z = 0.5; ball.vz = 1.5;
      events.push({ type: 'spit', x: ball.x, y: ball.y });
      return false;
    }
    ball.x = this.x; ball.y = this.y; ball.z = 0.95 + 0.05 * Math.sin(t * 8); ball.vx = 0; ball.vy = 0;
    return true;
  }
}

/* Geländer: gerades Mauerstück von (x0,y0) nach (x1,y1) */
class Wall {
  constructor(d) {
    Object.assign(this, { t: 0.22, h: 0.5, extend: 0.3 }, d); this.type = 'wall';
    // Enden etwas verlängern, damit das Mauerstück bündig in angrenzende Wände läuft
    const L = Math.hypot(this.x1 - this.x0, this.y1 - this.y0) || 1, ux = (this.x1 - this.x0) / L, uy = (this.y1 - this.y0) / L;
    this.ex0 = this.x0 - ux * this.extend; this.ey0 = this.y0 - uy * this.extend;
    this.ex1 = this.x1 + ux * this.extend; this.ey1 = this.y1 + uy * this.extend;
  }
  segments(out) { out.push({ ax: this.ex0, ay: this.ey0, bx: this.ex1, by: this.ey1, e: 0.72, kind: 'wall' }); }
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
      case 'wave': out.push(new Wave(d)); break;
    case 'sharkjump': out.push(new SharkJump(d)); break;
    case 'mover': out.push(new Mover(d)); break;
      case 'rotor': out.push(new Rotor(d)); break;
      case 'gate': out.push(new Gate(d)); break;
      case 'bumper': out.push(new Bumper(d)); break;
      case 'boost': out.push(new Boost(d)); break;
      case 'field': out.push(new Field(d)); break;
      case 'rail': out.push(new Rail(d)); break;
      case 'ferry': out.push(new Ferry(d)); break;
      case 'wall': out.push(new Wall(d)); break;
      case 'ramp': out.push(new Ramp(d)); break;
      case 'windmill': out.push(new Windmill(d)); break;
      case 'switch': out.push(new Switch(d)); break;
      case 'door': out.push(new Door(d)); break;
      case 'cauldron': out.push(new Cauldron(d)); break;
      case 'potion': out.push(new Potion(d)); break;
      case 'turntable': out.push(new Turntable(d)); break;
      case 'magnet': out.push(new Magnet(d)); break;
      case 'cannon': out.push(new Cannon(d)); break;
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
