/* Headless-Simulationskern für die Bahnprüfung (node tools/audit/audit.mjs <welt|all> [Bahnname]).
   Lädt das Spiel ohne Browser und spielt einzelne Schläge inklusive Strafschlägen, Innen-Maps und Schaltern. */
/* Gemeinsamer Simulationskern für die Bahnprüfung: lädt das Spiel headless, spielt einzelne Schläge
   inklusive Strafschlägen, Innen-Maps (Tür/Haimagen) und Schaltern. */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const ctx = { console, performance: { now: () => 0 }, window: {} }; vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_pro', 'level', 'obstacles', 'physics'])
  vm.runInContext(fs.readFileSync(path.join(SRC, `${f}.js`), 'utf8'), ctx);
export const G = vm.runInContext('({buildLevel, makeBall, stepPhysics, createObstacles, PRO_COURSES, COURSES, SEA_COURSES, JUNGLE_COURSES, WORLDS, BALL_R})', ctx);
export const WORLDS = G.WORLDS;
export const MAX_SHOT = 19, STEP = 1 / 240, DEFAULT_MAX = 15;

const LV = new Map();
export function getLevel(def) {
  let lv = LV.get(def);
  if (!lv) { lv = G.buildLevel(def); LV.set(def, lv); }
  return lv;
}
function resetLevel(lv, switches) {
  lv.switches = Object.assign({}, switches);
  for (const ob of lv.obstacles) {
    if (ob.type === 'switch') ob.activeUntil = lv.switches[ob.target] || 0;
    if (ob.type === 'portal' || ob.type === 'potion') ob.lastUse = -10;
    if (ob.type === 'cannon' || ob.type === 'cauldron') ob.loaded = false;
  }
}

export function newState(hole) {
  const lv = getLevel(hole);
  const b = G.makeBall(lv.tee.x, lv.tee.y, '#fff');
  return { hole, def: hole, ball: b, t: 0, strokes: 0, switches: {}, inner: false, done: false, log: [] };
}
export function maxStrokes(hole) { return hole.maxStrokes || DEFAULT_MAX; }
export function cloneState(st) { return { ...st, ball: { ...st.ball, rider: null }, switches: { ...st.switches }, log: st.log.slice() }; }

/* Einen Schlag ausführen. Liefert einen neuen Zustand; st.last beschreibt das Ergebnis:
   'sunk' | 'rest' | 'water'|'lava'|'oob'|'shark' (Strafschlag) | 'enter' (Innen-Map betreten) | 'max' */
export function shoot(st0, ang, pow, wait = 0, wantTrace = false) {
  const st = cloneState(st0);
  const lv = getLevel(st.def);
  resetLevel(lv, st.switches);
  const b = st.ball;
  st.t += wait;
  b.restX = b.x; b.restY = b.y; b.air = false; b.z = 0; b.vz = 0; b.rider = null;
  b.vx = Math.cos(ang) * pow * MAX_SHOT; b.vy = Math.sin(ang) * pow * MAX_SHOT;
  st.strokes++;
  let t = st.t, restT = 0, slowT = 0, trace = [];
  const maxT = 26;
  for (let i = 0; i < 240 * maxT; i++) {
    const ev = G.stepPhysics(lv, b, STEP, t, true); t += STEP;
    if (wantTrace && i % 12 === 0) trace.push([+b.x.toFixed(2), +b.y.toFixed(2), b.air ? 1 : 0]);
    let out = null;
    for (const e of ev) {
      if (e.type === 'sunk') { out = 'sunk'; break; }
      if (e.type === 'switch') st.switches = Object.assign({}, lv.switches);
      if (e.type === 'enter') { out = 'enter'; break; }
      if (e.type === 'shark') { out = (st.hole.inner && st.hole.inner.stomach && !st.inner) ? 'stomach' : 'shark'; break; }
      if (e.type === 'water' || e.type === 'lava' || e.type === 'oob' || e.type === 'spiked') { out = e.type; break; }
    }
    if (out) {
      st.t = t; st.trace = trace;
      if (out === 'sunk') { st.done = true; st.last = 'sunk'; return st; }
      if (out === 'enter' || out === 'stomach') {
        const inner = st.hole.inner; st.def = inner; st.inner = true;
        const ilv = getLevel(inner);
        Object.assign(b, { x: ilv.tee.x, y: ilv.tee.y, vx: 0, vy: 0, z: 0, vz: 0, air: false, rider: null, entered: false, portalCd: 0.5 });
        b.restX = b.x; b.restY = b.y;
        st.switches = {}; st.t += 0.7; st.last = out; st.log.push(out);
        return st;
      }
      // Strafschlag: zurück zur Ruheposition
      st.strokes++; st.log.push(out);
      Object.assign(b, { x: b.restX, y: b.restY, vx: 0, vy: 0, z: 0, vz: 0, air: false, rider: null, portalCd: 0.5 });
      st.t += 0.9; st.last = out;
      if (st.strokes >= maxStrokes(st.hole)) { st.done = true; st.last = 'max'; st.strokes = maxStrokes(st.hole); }
      return st;
    }
    if (b.rider || b.air) { restT = 0; slowT = 0; continue; }
    const sp = Math.hypot(b.vx, b.vy);
    if (sp < 0.08) { restT += STEP; if (restT > 0.25) break; } else restT = 0;
    if (sp < 0.5 && !b.boosted) { slowT += STEP; if (slowT > 3) break; } else slowT = 0;
  }
  b.vx = 0; b.vy = 0; b.rider = null; b.air = false; b.z = 0;
  st.t = t + 0.3; st.trace = trace; st.last = 'rest';
  if (st.strokes >= maxStrokes(st.hole)) { st.done = true; st.last = 'max'; }
  return st;
}

/* BFS-Distanzkarte (in Kacheln) vom Loch/Ziel aus über begehbare Kacheln,
   mit Extra-Kanten für Portale, Fähren, Rampen, Kanonen; Mauerstücke (wall) sperren Kachelkanten,
   die sie (fast) vollständig abdecken. Zusätzlich: geradliniger Pfad vom Abschlag (ohne Diagonalen). */
const DIST = new Map();
function segCover(w, ax, ay, bx, by) { // Anteil der Kante (ax,ay)-(bx,by), der vom Hindernis-Rechteck w überdeckt wird
  const wx0 = Math.min(w.x0, w.x1), wx1 = Math.max(w.x0, w.x1), wy0 = Math.min(w.y0, w.y1), wy1 = Math.max(w.y0, w.y1);
  if (ax === bx) { if (ax < wx0 - 0.2 || ax > wx1 + 0.2) return 0; const lo = Math.max(wy0, Math.min(ay, by)), hi = Math.min(wy1, Math.max(ay, by)); return Math.max(0, hi - lo); }
  if (ay < wy0 - 0.2 || ay > wy1 + 0.2) return 0; const lo = Math.max(wx0, Math.min(ax, bx)), hi = Math.min(wx1, Math.max(ax, bx)); return Math.max(0, hi - lo);
}
function blockers(def) { // Mauerstücke und Mühlengebäude als Rechtecke
  const out = [];
  for (const o of def.obstacles || []) {
    if (o.type === 'wall') out.push({ x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1 });
    if (o.type === 'windmill') {
      const w = o.w ?? 3, depth = o.depth ?? 1.2, gap = o.gap ?? 0.8, overlap = o.overlap ?? 0.7, bw = (w - gap) / 2 + overlap, off = gap / 2 + bw / 2;
      if (o.axis === 'x') { for (const s of [-1, 1]) out.push({ solid: true, x0: o.x + s * off - bw / 2, x1: o.x + s * off + bw / 2, y0: o.y - depth / 2, y1: o.y + depth / 2 }); }
      else { for (const s of [-1, 1]) out.push({ solid: true, y0: o.y + s * off - bw / 2, y1: o.y + s * off + bw / 2, x0: o.x - depth / 2, x1: o.x + depth / 2 }); }
    }
  }
  return out;
}
export function distMap(def) {
  if (DIST.has(def)) return DIST.get(def);
  const lv = getLevel(def), W = lv.W, H = lv.H;
  const walls = blockers(def), solids = walls.filter(w => w.solid);
  const walk = (x, y) => { if (x < 0 || y < 0 || x >= W || y >= H) return false; const c = lv.tiles[y][x]; if (!(lv.isFloorChar(c) && c !== 'w' && c !== 'l')) return false; if (!solids.length) return true; for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.2, 0.5, 0.8]) { const cx = x + fx, cy = y + fy; if (!solids.some(b => cx > b.x0 && cx < b.x1 && cy > b.y0 && cy < b.y1)) return true; } return false; };
  const edgeOpen = (x, y, nx, ny) => { // Kante zwischen Nachbarkacheln (orthogonal) frei?
    if (!walls.length) return true;
    let ax, ay, bx, by;
    if (nx !== x) { ax = bx = Math.max(x, nx); ay = y; by = y + 1; } else { ay = by = Math.max(y, ny); ax = x; bx = x + 1; }
    for (const w of walls) if (segCover(w, ax, ay, bx, by) > 0.85) return false;
    return true;
  };
  const links = [];
  for (const o of def.obstacles || []) {
    if (o.type === 'portal') { links.push([o.x, o.y, o.tx, o.ty]); if (o.twoWay) links.push([o.tx, o.ty, o.x, o.y]); }
    if (o.type === 'ferry') { links.push([o.x0, o.y0, o.x1, o.y1]); links.push([o.x1, o.y1, o.x0, o.y0]); }
    if (o.type === 'ramp') { const a = (o.angle ?? 90) * Math.PI / 180, cx = o.x + (o.w || 2) / 2, cy = o.y + (o.h || 2) / 2, half = Math.abs(Math.cos(a)) > 0.5 ? (o.w || 2) / 2 : (o.h || 2) / 2; const L = half + (o.land ?? 1.7); links.push([cx, cy, cx + Math.cos(a) * L, cy + Math.sin(a) * L]); }
    if (o.type === 'cannon') { links.push([o.x, o.y, o.x + Math.cos(o.base || 0) * (o.range || 9) * 0.9, o.y + Math.sin(o.base || 0) * (o.range || 9) * 0.9]); }
  }
  const tgt = lv.goal;
  const run = (diag, sx = tgt.x, sy = tgt.y) => {
    const d = Array.from({ length: H }, () => new Array(W).fill(Infinity));
    const par = Array.from({ length: H }, () => new Array(W).fill(null));
    const q = [];
    const push = (x, y, v, from) => { if (!walk(x, y) || d[y][x] <= v) return; d[y][x] = v; par[y][x] = from; q.push([x, y]); };
    push(Math.floor(sx), Math.floor(sy), 0, null);
    while (q.length) {
      const [x, y] = q.shift(); const v = d[y][x];
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (edgeOpen(x, y, x + ox, y + oy)) push(x + ox, y + oy, v + 1, [x, y]);
      if (diag) for (const [ox, oy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) if (walk(x + ox, y) && walk(x, y + oy) && edgeOpen(x, y, x + ox, y) && edgeOpen(x + ox, y, x + ox, y + oy)) push(x + ox, y + oy, v + 1.414, [x, y]);
      for (const [ax, ay, bx, by] of links) { const bxT = Math.floor(bx), byT = Math.floor(by); if (Math.abs(bxT - x) <= 1 && Math.abs(byT - y) <= 1) push(Math.floor(ax), Math.floor(ay), v + 1.5, [x, y]); }
    }
    return { d, par };
  };
  const { d } = run(true);
  const straight = run(false);
  // Pfad vom Abschlag zum Ziel (geradlinig)
  const path = []; let cx = Math.floor(lv.tee.x), cy = Math.floor(lv.tee.y);
  for (let i = 0; i < 2000 && cx !== null; i++) { path.push([cx, cy]); const p = straight.par[cy] && straight.par[cy][cx]; if (!p) break; [cx, cy] = p; }
  // Schalter-Rätsel: für jedes verknüpfte Tor die Distanzkarte zur Druckplatte plus Weg Platte→Ziel
  const linked = [];
  for (const g of (def.obstacles || []).filter(o => o.type === 'gate' && o.linked)) {
    const sw = (def.obstacles || []).find(o => o.type === 'switch' && o.target === g.linked); if (!sw) continue;
    const m = run(true, sw.x, sw.y).d, sx = Math.floor(sw.x), sy = Math.floor(sw.y);
    linked.push({ id: g.linked, sw: { x: sw.x, y: sw.y }, dSw: m, swToGoal: d[sy][sx] });
  }
  const puzzle = { shrink: (def.obstacles || []).some(o => o.type === 'cauldron' || o.type === 'potion'), linked };
  const res = { d, walk, lv, path, puzzle, at(x, y) { const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return Infinity; return d[ty][tx]; } };
  DIST.set(def, res); return res;
}
/* Fortschrittsmaß eines Zustands: BFS-Distanz zum Ziel + Feinanteil; Innen-Map zählt als "näher";
   Rätselwissen: ungeschrumpft vor einem Spalt bzw. Tor ohne aktiven Schalter gilt als weiter weg */
/* aktive Zielkarte: normalerweise das Loch; ist ein Schalter-Tor noch zu, erst die Druckplatte */
export function activeMap(st) {
  const dm = distMap(st.def), lv = dm.lv;
  for (const L of dm.puzzle.linked) if (!(st.switches[L.id] > st.t)) return { d: L.dSw, goal: L.sw, extra: L.swToGoal + 1 };
  return { d: dm.d, goal: lv.goal, extra: 0 };
}
export function progress(st) {
  const dm = distMap(st.def), lv = dm.lv, b = st.ball, am = activeMap(st);
  const tx = Math.floor(b.x), ty = Math.floor(b.y);
  let v = (tx < 0 || ty < 0 || tx >= lv.W || ty >= lv.H) ? Infinity : am.d[ty][tx];
  if (!isFinite(v)) v = 60;
  v += am.extra + 0.5 * Math.hypot(b.x - am.goal.x, b.y - am.goal.y) / 10;
  if (st.hole.inner && !st.inner && !lv.cup) { // draußen ohne Loch: Weg durch die Innen-Map kommt noch dazu
    const inner = st.hole.inner, it = getLevel(inner).tee;
    v += progress({ def: inner, ball: { x: it.x, y: it.y, r: G.BALL_R }, switches: {}, t: 0, hole: st.hole, inner: true }) + 5;
  }
  if (dm.puzzle.shrink && b.r >= G.BALL_R - 0.01) v += 8;
  return v;
}
export function allHoles() {
  const out = [];
  for (const w of WORLDS) for (const c of w.courses) out.push({ world: w, hole: c });
  return out;
}
