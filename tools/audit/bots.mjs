/* Normalspieler-Modell: plant mit dem Distanzfeld, wartet bei Bedarf auf einen besseren Moment,
   bevorzugt robuste Schläge (Nachbarn im Winkel/Kraft mitbewertet) und führt mit Streuung aus. */
import { newState, shoot, distMap, progress, activeMap } from './sim.mjs';
let seed = 12345; export function setSeed(s) { seed = s >>> 0; }
const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
const gauss = () => { let u = 0, v = 0; while (u === 0) u = rnd(); while (v === 0) v = rnd(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); };
export function periodOf(def) { let p = 0; for (const o of (def.obstacles || [])) { if (o.period) p = Math.max(p, o.period); if (o.type === 'ferry') p = Math.max(p, 2 * ((o.wait ?? 2.5) + (o.travel ?? 3))); if (o.type === 'rotor') p = Math.max(p, o.swing ? 2 * Math.PI / o.swing.speed : 2 * Math.PI / ((o.blades || 4) * Math.abs(o.speed || 1))); if (o.type === 'windmill') p = Math.max(p, 2 * Math.PI / ((o.blades || 4) * (o.speed || 1.2))); } return p || 6; }
export function intendedDir(st) {
  const dm = distMap(st.def), lv = dm.lv, b = st.ball, am = activeMap(st), goal = am.goal;
  let tx = Math.floor(b.x), ty = Math.floor(b.y);
  const inside = tx >= 0 && ty >= 0 && tx < lv.W && ty < lv.H;
  const d0 = inside ? am.d[ty][tx] : Infinity, eu = Math.hypot(goal.x - b.x, goal.y - b.y);
  if (!isFinite(d0) || (d0 < 5 && eu < d0 + 1.5)) return Math.atan2(goal.y - b.y, goal.x - b.x); // freie Sicht aufs Ziel
  let px = tx, py = ty;
  for (let i = 0; i < 4; i++) {
    let bx = px, by = py, bd = am.d[py][px];
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, 1], [1, -1], [-1, -1]]) { const nx = px + ox, ny = py + oy; if (nx < 0 || ny < 0 || nx >= lv.W || ny >= lv.H) continue; const d = am.d[ny][nx]; if (d < bd) { bd = d; bx = nx; by = ny; } }
    if (bx === px && by === py) break;
    if (Math.abs(bx - px) > 1 || Math.abs(by - py) > 1) break; // Sprungkante (Fähre, Portal): nicht darüber hinaus zielen
    px = bx; py = by;
  }
  if (px === tx && py === ty) return Math.atan2(goal.y - b.y, goal.x - b.x);
  return Math.atan2(py + 0.5 - b.y, px + 0.5 - b.x);
}
const POW = [0.1, 0.15, 0.2, 0.3, 0.42, 0.55, 0.7, 0.85, 1.0];
/* geschätzte Restkosten in Schlägen: eingelocht 0, sonst 1 + Restweg/6, Strafschlag +1 */
function scoreOf(r, k, p) { if (r.last === 'sunk') return 0.02 * Math.abs(k) + 0.05 * p; if (r.last === 'max') return 10; return 1 + progress(r) / 6 + 0.03 * p + (['water', 'lava', 'oob', 'shark'].includes(r.last) ? 1 : 0); }
export function normalGame(hole, verbose = false) {
  let st = newState(hole);
  const per = Math.max(periodOf(hole), hole.inner ? periodOf(hole.inner) : 0);
  const events = [];
  while (!st.done) {
    const base = intendedDir(st), here = progress(st);
    const w0 = rnd() * per; let bestC = null, cands = [];
    for (let wi = 0; wi < 6; wi++) { // bei Bedarf auf einen besseren Moment warten (z. B. Fähre, Tor)
      const wait = w0 + wi * per / 6; cands = [];
      const angles = []; for (let k = -6; k <= 6; k++) angles.push([base + k * (10 * Math.PI / 180), k]);
      // Lücken sehen: Enden naher Mauerstücke als zusätzliche Zielpunkte (z. B. Spalt in der Hexenhütte)
      for (const o of st.def.obstacles || []) if (o.type === 'wall') for (const [ex, ey] of [[o.x0, o.y0], [o.x1, o.y1]]) {
        const dx = ex - st.ball.x, dy = ey - st.ball.y, d = Math.hypot(dx, dy); if (d > 5 || d < 0.3) continue;
        const a = Math.atan2(dy, dx); for (const da of [-4, 0, 4]) angles.push([a + da * Math.PI / 180, 3]);
      }
      for (const [ang, k] of angles) for (const p of POW) {
        const r = shoot(st, ang, p, wait);
        cands.push({ ang, p, k, wait, score: scoreOf(r, k, p), res: r.last, at: [+r.ball.x.toFixed(1), +r.ball.y.toFixed(1)] });
      }
      cands.sort((a, b) => a.score - b.score);
      if (cands[0].score < 1 + (here - 1.5) / 6 || cands[0].res === 'sunk') break;
    }
    // Robustheit: die sechs besten Kandidaten mit leicht abweichender Ausführung nachbewerten
    for (const c of cands.slice(0, 6)) {
      let sum = c.score;
      for (const [da, dp] of [[3, 0], [-3, 0], [0, 0.06], [0, -0.06]]) { const r = shoot(st, c.ang + da * Math.PI / 180, Math.min(1, Math.max(0.05, c.p * (1 + dp))), c.wait); sum += scoreOf(r, c.k, c.p); }
      c.robust = sum / 5;
    }
    bestC = cands.slice(0, 6).sort((a, b) => a.robust - b.robust)[0];
    const r = shoot(st, bestC.ang + gauss() * 3 * Math.PI / 180, Math.min(1, Math.max(0.05, bestC.p * (1 + gauss() * 0.06))), Math.max(0, bestC.wait + gauss() * 0.35));
    if (verbose) console.log(`#${r.strokes} von (${st.ball.x.toFixed(1)},${st.ball.y.toFixed(1)}) Richtung ${(base * 180 / Math.PI).toFixed(0)}° Plan ${(bestC.ang * 180 / Math.PI).toFixed(0)}° p${bestC.p} wait ${bestC.wait.toFixed(1)} → geplant ${bestC.res}@${bestC.at} score ${bestC.score.toFixed(1)}/${bestC.robust.toFixed(1)} | tatsächlich ${r.last} @ (${r.ball.x.toFixed(1)},${r.ball.y.toFixed(1)}) prog ${progress(r).toFixed(1)}`);
    events.push(r.last); st = r;
    if (st.strokes > 40) break;
  }
  return { strokes: st.strokes, events, finished: st.last === 'sunk' };
}
