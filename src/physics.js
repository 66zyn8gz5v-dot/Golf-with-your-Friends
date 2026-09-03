/* Ballphysik: Reibung nach Untergrund, Kollision mit Segmenten (auch bewegten) und Kreisen. */
const BALL_R = 0.3;
const MAX_SPEED = 21;
const FRICTION = { '#': 4.2, T: 4.2, H: 4.2, o: 4.2, s: 20, i: 0.75, w: 4, l: 4 }; // Bremsung je Untergrund, pro Bahn per friction überschreibbar

function makeBall(x, y, color) {
  return { x, y, z: 0, vx: 0, vy: 0, vz: 0, portalCd: 0, rideCd: 0, rider: null, air: false, restX: x, restY: y, color, boosted: false };
}

function collideSeg(ball, s, events) {
  const rad = BALL_R + (s.rad || 0);
  const ex = s.bx - s.ax, ey = s.by - s.ay;
  const L2 = ex * ex + ey * ey || 1e-9;
  const u = clamp(((ball.x - s.ax) * ex + (ball.y - s.ay) * ey) / L2, 0, 1);
  const px = s.ax + ex * u, py = s.ay + ey * u;
  let dx = ball.x - px, dy = ball.y - py;
  const d = Math.hypot(dx, dy);
  if (d >= rad) return false;
  let nx, ny;
  if (d < 1e-6) { const L = Math.sqrt(L2); nx = -ey / L; ny = ex / L; }
  else { nx = dx / d; ny = dy / d; }
  ball.x += nx * (rad - d); ball.y += ny * (rad - d);
  let svx = s.vx || 0, svy = s.vy || 0;
  if (s.omega) { svx += -s.omega * (py - s.cy); svy += s.omega * (px - s.cx); }
  const rvx = ball.vx - svx, rvy = ball.vy - svy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    const e = s.e ?? 0.72;
    ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny;
    if (s.kind === 'rotor' || s.kind === 'mover') { // Schwung mitgeben
      ball.vx += svx * 0.3; ball.vy += svy * 0.3;
    }
    events.push({ type: 'bounce', speed: -vn, kind: s.kind || 'wall', x: px, y: py });
  }
  return true;
}

function collideCircle(ball, c, events) {
  const rad = BALL_R + c.r;
  let dx = ball.x - c.x, dy = ball.y - c.y;
  const d = Math.hypot(dx, dy);
  if (d >= rad) return false;
  const nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0;
  ball.x += nx * (rad - d); ball.y += ny * (rad - d);
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    const e = c.e ?? 0.8;
    let out = -vn * e;
    if (c.kick) out = Math.max(out, c.kick);
    ball.vx += (out - vn) * nx; ball.vy += (out - vn) * ny;
    if (c.owner) c.owner.hitAt = performance.now() / 1000;
    events.push({ type: 'bounce', speed: out, kind: c.kind || 'circle', x: ball.x, y: ball.y });
  }
  return true;
}

/* Ein Physik-Schritt. allowForces: Windfelder/Beschleuniger nur, wenn der Ball "im Spiel" ist. */
function stepPhysics(level, ball, dt, t, allowForces) {
  const events = [];
  for (const ob of level.obstacles) if (ob.update) ob.update(t);

  // Fähren: mitfahren (dann keine weitere Physik) oder einsteigen
  ball.rideCd = Math.max(0, (ball.rideCd || 0) - dt);
  if (ball.rider) { if (ball.rider.ride(ball, t, events)) return events; }
  else for (const ob of level.obstacles) if (ob.type === 'ferry' && ob.ride(ball, t, events)) return events;

  // Sprungschanzen und Flugphase: in der Luft gibt es keine Reibung, keine Mauern, keine Hindernisse
  for (const ob of level.obstacles) if (ob.type === 'ramp') ob.launch(ball, events);
  if (ball.air) {
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.vz -= 12 * dt; ball.z += ball.vz * dt;
    if (ball.z <= 0) {
      ball.z = 0; ball.vz = 0; ball.air = false;
      ball.vx *= 0.6; ball.vy *= 0.6;
      events.push({ type: 'land', x: ball.x, y: ball.y });
    } else return events;
  }

  ball.boosted = false;
  if (allowForces) for (const ob of level.obstacles) if (ob.force) ob.force(ball, dt);

  const c = level.charAt(ball.x, ball.y);
  let sp = Math.hypot(ball.vx, ball.vy);
  if (sp > 0) {
    const fr = level.def.friction && level.def.friction[c];
    const dec = (fr ?? FRICTION[c] ?? 4) * dt;
    let ns = Math.max(0, sp - dec) * (1 - 0.06 * dt);
    if (ns > MAX_SPEED) ns = MAX_SPEED;
    ball.vx *= ns / sp; ball.vy *= ns / sp;
  }
  ball.x += ball.vx * dt; ball.y += ball.vy * dt;

  // Sprung-Optik (z beeinflusst die Bahn nicht)
  if (ball.z > 0 || ball.vz !== 0) {
    ball.vz -= 12 * dt; ball.z += ball.vz * dt;
    if (ball.z <= 0) { ball.z = 0; ball.vz = 0; }
  }

  const dyn = [], circles = [];
  for (const ob of level.obstacles) {
    if (ob.segments) ob.segments(dyn);
    if (ob.circles) ob.circles(circles);
  }
  for (let iter = 0; iter < 2; iter++) {
    for (const s of level.segs) collideSeg(ball, s, events);
    for (const s of dyn) collideSeg(ball, s, events);
    for (const cc of circles) collideCircle(ball, cc, events);
  }

  ball.portalCd = Math.max(0, ball.portalCd - dt);
  for (const ob of level.obstacles) if (ob.teleport) ob.teleport(ball, t, events);

  // Loch
  const cdx = ball.x - level.cup.x, cdy = ball.y - level.cup.y;
  const cd = Math.hypot(cdx, cdy);
  sp = Math.hypot(ball.vx, ball.vy);
  if (cd < 0.62 && sp < 7.5 && sp > 0.01) { // leichte Anziehung am Lochrand
    ball.vx -= (cdx / cd) * 9 * dt; ball.vy -= (cdy / cd) * 9 * dt;
  }
  if (cd < 0.42 && sp < 7.5) { events.push({ type: 'sunk' }); return events; }

  // Hindernisse / Aus
  const c2 = level.charAt(ball.x, ball.y);
  if (!level.isFloorChar(c2)) events.push({ type: 'oob' });
  else if (c2 === 'w') events.push({ type: 'water' });
  else if (c2 === 'l') events.push({ type: 'lava' });
  return events;
}
