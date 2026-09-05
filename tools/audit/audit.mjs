import { periodOf } from './bots.mjs';
/* Bahnprüfung: node tools/audit/audit.mjs <weltId|all> [Bahnname-Präfix]  (GAMES=20, OUT=out)
   Statische Regeln (Engstellen, Zeitfenster, Kamera, Kehren) + Profi-Suche + Normalspieler.
   Aufruf: node audit.mjs <weltId|all> [Bahnname-Präfix]  → schreibt out/<welt>_<bahn>.json und Text nach stdout */
import fs from 'node:fs';
import { G, WORLDS, newState, shoot, distMap, progress, getLevel, maxStrokes, allHoles } from './sim.mjs';
const [wantWorld = 'all', wantHole = null] = process.argv.slice(2);
const GAMES = +(process.env.GAMES || 20);
const R = G.BALL_R;
const OUT = process.env.OUT || 'out'; fs.mkdirSync(OUT, { recursive: true });

const DYN = new Set(['mover', 'wave', 'sharkjump', 'spikes', 'rotor', 'gate', 'ferry', 'windmill', 'cannon', 'turntable', 'cauldron']);
function isDynamic(def) { return (def.obstacles || []).some(o => DYN.has(o.type) || (o.type === 'field' && o.gust)); }
function periodOf_unused(def) { let p = 0; for (const o of (def.obstacles || [])) { if (o.period) p = Math.max(p, o.period); if (o.type === 'ferry') p = Math.max(p, 2 * ((o.wait ?? 2.5) + (o.travel ?? 3))); if (o.type === 'rotor') p = Math.max(p, o.swing ? 2 * Math.PI / o.swing.speed : 2 * Math.PI / ((o.blades || 4) * Math.abs(o.speed || 1))); if (o.type === 'windmill') p = Math.max(p, 2 * Math.PI / ((o.blades || 4) * (o.speed || 1.2))); } return p || 6; }

/* ---------- statische Prüfungen ---------- */
function staticChecks(def, label) {
  const lv = getLevel(def), W = lv.W, H = lv.H, notes = [];
  const tile = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '.' : lv.tiles[y][x];
  const free = (x, y) => { const c = tile(x, y); return lv.isFloorChar(c) && c !== 'w' && c !== 'l'; };
  const freeAt = (px, py) => free(Math.floor(px), Math.floor(py));
  // freie Breite durch einen Punkt entlang einer Achse (in Welt-Einheiten, Schrittweite 0.1)
  const extent = (px, py, ax, ay) => { let a = 0, b = 0; while (a < 40 && freeAt(px - ax * (a + 0.1), py - ay * (a + 0.1))) a += 0.1; while (b < 40 && freeAt(px + ax * (b + 0.1), py + ay * (b + 0.1))) b += 0.1; return { lo: a, hi: b, len: a + b }; };
  const corridor = (px, py) => { const ex = extent(px, py, 1, 0), ey = extent(px, py, 0, 1); return ex.len >= ey.len ? { along: 'x', width: ey.len, ext: ey, other: ex } : { along: 'y', width: ex.len, ext: ex, other: ey }; };
  for (const o of def.obstacles || []) {
    if (o.type === 'bumper' || (o.type === 'magnet')) {
      const r = o.type === 'bumper' ? (o.r ?? 0.6) : (o.core ?? 0.35);
      if (!freeAt(o.x, o.y)) continue;
      const c = corridor(o.x, o.y);
      const gap = Math.max(c.ext.lo, c.ext.hi) - r; // größere freie Seite neben dem Hindernis
      const gapBoth = c.width - 2 * r;
      if (gap < 2 * R + 0.15) notes.push(`BLOCKIERT: ${o.type} (${o.x},${o.y}) r=${r} in ${c.width.toFixed(1)} breitem Gang – freie Seite nur ${gap.toFixed(2)}`);
      else if (gapBoth < 1.2) notes.push(`eng: ${o.type} (${o.x},${o.y}) lässt in ${c.width.toFixed(1)} breitem Gang ${gap.toFixed(2)} Platz an der breiteren Seite`);
    }
    if (o.type === 'gate' && !o.linked) {
      const open = (o.open ?? 0.5) * (o.period ?? 5), closed = (o.period ?? 5) - open;
      if (open < 2) notes.push(`TOR zu kurz offen: (${o.x},${o.y}) offen ${open.toFixed(1)}s / zu ${closed.toFixed(1)}s`);
      else notes.push(`info Tor (${o.x},${o.y}): offen ${open.toFixed(1)}s, zu ${closed.toFixed(1)}s`);
    }
    if (o.type === 'gate' && o.linked) {
      const sw = (def.obstacles || []).find(s => s.type === 'switch' && s.target === o.linked);
      if (sw) { const dm = distMap(def); const dSw = dm.at(sw.x, sw.y), dG = dm.at(o.x + (o.w > o.h ? 0 : 0.6), o.y + (o.h > o.w ? 0 : 0.6)); const tiles = Math.abs(dSw - dG); const need = tiles / 5 + 5; notes.push(`${sw.duration < need ? 'SCHALTER zu kurz' : 'info Schalter'}: ${sw.duration}s für ~${tiles.toFixed(0)} Kacheln Weg (Richtwert ${need.toFixed(0)}s)`); }
    }
    if (o.type === 'spikes') { const down = (1 - (o.up ?? 0.45)) * (o.period ?? 4), up = (o.up ?? 0.45) * (o.period ?? 4); notes.push(`${down < 1.8 ? 'STACHEL zu kurz unten' : 'info Stachel'} (${o.x},${o.y}): unten ${down.toFixed(1)}s, oben ${up.toFixed(1)}s`); }
    if (o.type === 'sharkjump') { const safe = (1 - o.jump) * o.period, danger = o.jump * o.period; notes.push(`info ${o.style || 'Hai'} (${o.x},${o.y}): sicher ${safe.toFixed(1)}s, gefährlich ${danger.toFixed(1)}s je ${o.period}s`); }
    if (o.type === 'windmill') { const per = 2 * Math.PI / ((o.blades || 4) * (o.speed || 1.2)); notes.push(`info Mühle (${o.x},${o.y}): Tür ${(o.gap ?? 0.8).toFixed(2)} breit (Ball ${2 * R}), Flügel alle ${per.toFixed(1)}s, versperrt je ${(0.6 / (o.speed || 1.2)).toFixed(1)}s`); }
    if (o.type === 'mover' && o.style !== 'shark') {
      const L = Math.hypot(o.x1 - o.x0, o.y1 - o.y0), size = Math.max(o.w ?? 1, o.h ?? 1);
      const mx = (o.x0 + o.x1) / 2, my = (o.y0 + o.y1) / 2; if (!freeAt(mx, my)) { notes.push(`info Mover (${o.x0},${o.y0})→(${o.x1},${o.y1}) außerhalb der Bahn`); continue; }
      const horiz = Math.abs(o.x1 - o.x0) >= Math.abs(o.y1 - o.y0);
      const perp = horiz ? extent(mx, my, 0, 1).len : extent(mx, my, 1, 0).len; // Breite quer zur Fahrt
      const along = horiz ? extent(mx, my, 1, 0).len : extent(mx, my, 0, 1).len;
      const crosses = along <= L + size; // fährt über die ganze Länge des Gangs (quer zum Weg)
      const gap = perp - size;
      notes.push(`info Mover ${o.style} Weg ${L.toFixed(1)} Periode ${o.period ?? 6}s, Gang quer ${perp.toFixed(1)} → ${gap < 2 * R + 0.15 ? 'sperrt beim Vorbeifahren komplett' : `lässt ${gap.toFixed(1)} Platz`}${crosses ? ' (kreuzt den Weg)' : ' (fährt längs)'}`);
    }
    if (o.type === 'rotor') {
      const c = corridor(o.x, o.y);
      const per = o.swing ? 2 * Math.PI / o.swing.speed : 2 * Math.PI / ((o.blades ?? 4) * Math.abs(o.speed ?? 1));
      const reach = o.len ?? 3; const covers = reach + (o.thick ?? 0.16) >= Math.max(c.ext.lo, c.ext.hi) - 2 * R;
      notes.push(`info Rotor ${o.style} (${o.x},${o.y}) Arm ${reach} in Gang ${c.width.toFixed(1)}: ${covers ? 'reicht bis zur Wand (sperrt zeitweise)' : 'Lücke bleibt'}, ${o.swing ? 'Pendel' : 'Flügel'} alle ${per.toFixed(1)}s`);
    }
  }
  // Kamera-Zonen: Blickrichtung gegen Spielrichtung (BFS-Pfad) prüfen
  if (def.views) {
    const dm = distMap(def);
    for (const v of def.views) {
      const cx = v.x + v.w / 2, cy = v.y + v.h / 2;
      // Spielrichtung: Punkt auf der Bahn in der Zone mit kleinster Distanz vs. größter Distanz
      let best = null, worst = null;
      for (let y = Math.floor(v.y); y < v.y + v.h; y++) for (let x = Math.floor(v.x); x < v.x + v.w; x++) { const d = dm.at(x + 0.5, y + 0.5); if (!isFinite(d)) continue; if (!best || d < best.d) best = { x: x + 0.5, y: y + 0.5, d }; if (!worst || d > worst.d) worst = { x: x + 0.5, y: y + 0.5, d }; }
      if (!best || !worst || best === worst) { notes.push(`info Kamera-Zone (${v.x},${v.y}) ohne erkennbare Spielrichtung`); continue; }
      const pa = Math.atan2(best.y - worst.y, best.x - worst.x), la = Math.atan2(v.look.y - cy, v.look.x - cx);
      const diff = Math.abs(Math.atan2(Math.sin(pa - la), Math.cos(pa - la))) * 180 / Math.PI;
      notes.push(`${diff > 70 ? 'KAMERA gegen Spielrichtung' : 'info Kamera ok'}: Zone (${v.x},${v.y}) Blick weicht ${diff.toFixed(0)}° von der Spielrichtung ab`);
    }
  }
  // Kehren auf dem Spielweg (geradliniger BFS-Pfad) in schmalen Gängen ohne Schrägbande
  const walls = (def.obstacles || []).filter(o => o.type === 'wall' && Math.abs(o.x1 - o.x0) > 0.3 && Math.abs(o.y1 - o.y0) > 0.3);
  const path = distMap(def).path, corners = [];
  for (let i = 1; i + 1 < path.length; i++) {
    const [ax, ay] = path[i - 1], [bx, by] = path[i], [cx, cy] = path[i + 1];
    const d1 = [bx - ax, by - ay], d2 = [cx - bx, cy - by];
    if (Math.hypot(...d1) > 1.5 || Math.hypot(...d2) > 1.5) continue; // Sprungkante (Fähre, Portal …)
    if (d1[0] * d2[0] + d1[1] * d2[1] !== 0) continue; // keine 90°-Kehre
    const cw = Math.min(extent(bx + 0.5, by + 0.5, 1, 0).len, extent(bx + 0.5, by + 0.5, 0, 1).len);
    if (cw > 3.2) continue;
    const px = bx + 0.5 + 0.5 * (d1[0] - d2[0]), py = by + 0.5 + 0.5 * (d1[1] - d2[1]);
    if (corners.some(c => Math.hypot(c.x - px, c.y - py) < 1.5)) continue;
    const banked = walls.some(w => Math.hypot((w.x0 + w.x1) / 2 - px, (w.y0 + w.y1) / 2 - py) < 2.2);
    corners.push({ x: px, y: py, banked });
  }
  const unb = corners.filter(c => !c.banked);
  if (corners.length) notes.push(`${unb.length ? 'KEHREN ohne Bande' : 'info Kehren'}: ${corners.length} Kehren auf dem Weg, ${corners.length - unb.length} mit Schrägbande${unb.length ? ' – ohne: ' + unb.map(c => `(${c.x},${c.y})`).join(' ') : ''}`);
  return notes;
}

/* ---------- Profi-Suche (Strahlsuche) ---------- */
function expertSearch(hole, budgetShots = 14000) {
  const ANG = 24, POW = [0.22, 0.36, 0.5, 0.66, 0.82, 1.0];
  const dyn = isDynamic(hole) || (hole.inner && isDynamic(hole.inner));
  const per = Math.max(periodOf(hole), hole.inner ? periodOf(hole.inner) : 0);
  const TIMES = dyn ? [0, 1, 2, 3, 4, 5, 6].map(i => i * per / 7) : [0];
  let beam = [newState(hole)], best = null, shots = 0;
  const maxDepth = Math.min(maxStrokes(hole), hole.par + 4);
  for (let depth = 0; depth < maxDepth && !best && shots < budgetShots; depth++) {
    const next = [];
    for (const st of beam) for (let a = 0; a < ANG; a++) for (const p of POW) for (const w of TIMES) {
      const ang = a / ANG * Math.PI * 2;
      const r = shoot(st, ang, p, w); shots++;
      r.plan = (st.plan || []).concat([{ ang: +(ang * 180 / Math.PI).toFixed(0), p, w: +w.toFixed(1), res: r.last, at: [+r.ball.x.toFixed(1), +r.ball.y.toFixed(1)] }]);
      if (r.last === 'sunk') { if (!best || r.strokes < best.strokes) best = r; continue; }
      if (r.done) continue;
      r.score = progress(r) + (r.last !== 'rest' && r.last !== 'enter' && r.last !== 'stomach' ? 3 : 0);
      next.push(r);
    }
    next.sort((a, b) => a.score - b.score);
    beam = [];
    for (const n of next) { if (beam.some(b => b.def === n.def && Math.hypot(b.ball.x - n.ball.x, b.ball.y - n.ball.y) < 0.6)) continue; beam.push(n); if (beam.length >= 3) break; }
    if (!beam.length) break;
  }
  return { strokes: best ? best.strokes : null, plan: best ? best.plan : (beam[0] && beam[0].plan), shots };
}

import { normalGame } from './bots.mjs';
/* ---------- Ablauf ---------- */
const holes = allHoles().filter(h => (wantWorld === 'all' || h.world.id === wantWorld) && (!wantHole || h.hole.name.startsWith(wantHole)));
for (const { world, hole } of holes) {
  const t0 = Date.now();
  const res = { world: world.name, name: hole.name, par: hole.par, maxStrokes: maxStrokes(hole), notes: staticChecks(hole, hole.name) };
  if (hole.inner) res.innerNotes = staticChecks(hole.inner, hole.inner.name);
  if (res.maxStrokes < 2.5 * hole.par) res.notes.push(`MAX-SCHLÄGE knapp: ${res.maxStrokes} bei Par ${hole.par}`);
  const ex = expertSearch(hole); res.expert = ex.strokes; res.expertPlan = ex.plan; res.expertShots = ex.shots;
  const games = []; for (let g = 0; g < GAMES; g++) games.push(normalGame(hole));
  const s = games.map(g => g.strokes).sort((a, b) => a - b);
  res.normal = { mean: +(s.reduce((a, b) => a + b, 0) / s.length).toFixed(2), median: s[Math.floor(s.length / 2)], min: s[0], max: s[s.length - 1], maxReached: games.filter(g => !g.finished).length,
    hazardsPerGame: +(games.reduce((a, g) => a + g.events.filter(e => ['water', 'lava', 'oob', 'shark', 'spiked'].includes(e)).length, 0) / games.length).toFixed(2),
    dist: s.reduce((m, v) => (m[v] = (m[v] || 0) + 1, m), {}) };
  res.seconds = Math.round((Date.now() - t0) / 1000);
  fs.writeFileSync(`${OUT}/${world.id}_${hole.name.replace(/[^\wäöüÄÖÜß]/g, '_')}.json`, JSON.stringify(res, null, 1));
  const n = res.normal;
  console.log(`\n=== ${world.name} · ${hole.name} · Par ${hole.par} (max ${res.maxStrokes}) · ${res.seconds}s`);
  console.log(`  Profi: ${ex.strokes ?? 'KEINE LÖSUNG in ' + (hole.par + 4)} Schläge · Normal: Ø ${n.mean}, Median ${n.median}, min ${n.min}, max ${n.max}, Limit erreicht ${n.maxReached}/${GAMES}, Hazards/Spiel ${n.hazardsPerGame}`);
  for (const t of res.notes) console.log('  - ' + t);
  if (res.innerNotes) for (const t of res.innerNotes) console.log('  - [innen] ' + t);
}
