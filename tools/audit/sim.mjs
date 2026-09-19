/* Headless-Simulationskern für die Bahnprüfung (node tools/audit/audit.mjs <welt|all> [Bahnname]).
   Lädt das Spiel ohne Browser und spielt einzelne Schläge inklusive Strafschlägen, Innen-Maps und Schaltern. */
/* Gemeinsamer Simulationskern für die Bahnprüfung: lädt das Spiel headless, spielt einzelne Schläge
   inklusive Strafschlägen, Innen-Maps (Tür/Haimagen) und Schaltern. */
import fs from 'node:fs'; import vm from 'node:vm'; import path from 'node:path'; import { fileURLToPath } from 'node:url';
const SRC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src');
const ctx = { console, performance: { now: () => 0 }, window: {} }; vm.createContext(ctx);
for (const f of ['themes', 'courses', 'courses_sea', 'courses_jungle', 'courses_storm', 'courses_shadow', 'courses_colosseum', 'courses_clock', 'courses_snow', 'courses_mine', 'courses_flut', 'courses_zauber', 'courses_pro', 'level', 'obstacles', 'obstacles_legend', 'obstacles_snow', 'obstacles_mine', 'obstacles_flut', 'obstacles_zauber', 'physics'])
  vm.runInContext(fs.readFileSync(path.join(SRC, `${f}.js`), 'utf8'), ctx);
export const G = vm.runInContext('({buildLevel, makeBall, stepPhysics, waechteAbrutschen, createObstacles, PRO_COURSES, COURSES, SEA_COURSES, JUNGLE_COURSES, STORM_COURSES, SHADOW_COURSES, COLOSSEUM_COURSES, WORLDS, BALL_R})', ctx);
export const WORLDS = G.WORLDS;
export const MAX_SHOT = 19, STEP = 1 / 240, DEFAULT_MAX = 15;

const LV = new Map();
export function getLevel(def) {
  let lv = LV.get(def);
  if (!lv) { lv = G.buildLevel(def); LV.set(def, lv); }
  return lv;
}
/* Die Maschinen des Zauberreichs merken sich etwas ÜBER den einzelnen Schlag hinaus: Die
   Rankenbrücke, wie lange sie noch trägt, und das Sternbild, welche Sterne schon brennen. Der Bot
   rechnet aber Dutzende Kandidatenschläge auf DEMSELBEN Level durch, bevor er den wirklichen
   ausführt – und was ein Kandidat angestoßen hat, stand danach für den wirklichen Schlag noch
   offen. Dann trug eine Ranke, die nie jemand angestoßen hatte, und ein Bannmal stand offen, das
   niemand vollendet hatte.

   Das war kein kleiner Meßfehler: Der Bot lochte die Erzmagierloge im Mittel mit zwei Schlägen bei
   Par 5 und hielt die Legenden-Welt damit für leichter als den Lehrlingsgarten. Gemessen hatte er
   eine Bahn, die es gar nicht gibt.

   Darum wird dieser Zustand wie 'switches' im Zustand mitgeführt: vor jedem Schlag gesetzt, nach
   jedem Schlag gelesen. Dann sieht der wirkliche Schlag genau das, was der Spieler auch sähe. */
function zauberLesen(lv) {
  return lv.obstacles.map(ob => ob.type === 'ranke' ? { bisT: ob.bisT, abT: ob.abT }
                            : ob.type === 'sternbild' ? { an: (ob.an || []).slice() }
                            : null);
}
function zauberSetzen(lv, stand) {
  lv.obstacles.forEach((ob, i) => {
    const z = stand && stand[i];
    if (ob.type === 'ranke') { ob.bisT = z ? z.bisT : -99; ob.abT = z ? z.abT : -99; }
    else if (ob.type === 'sternbild') ob.an = z ? z.an.slice() : (ob.sterne || []).map(() => false);
  });
}

const rankeDrauf = (o, x, y) => Math.abs(x - (o.x + o.w / 2)) <= o.w / 2 && Math.abs(y - (o.y + o.h / 2)) <= o.h / 2;
const aufRanke = (lv, b, x, y) => lv.obstacles.some(o => o.type === 'ranke' && (o.ebene || 0) === (b.ebene || 0) && rankeDrauf(o, x, y));
const aufTragenderRanke = (lv, b, t) => lv.obstacles.some(o => o.type === 'ranke' && (o.ebene || 0) === (b.ebene || 0)
  && rankeDrauf(o, b.x, b.y) && t <= (o.bisT == null ? -99 : o.bisT));

function resetLevel(lv, switches, schlagZahl) {
  lv.switches = Object.assign({}, switches);
  lv.schlagZahl = schlagZahl || 0;   // Daumenstand der Kaiserloge: sie zählt die Schläge der Bahn mit
  for (const ob of lv.obstacles) {
    if (ob.type === 'switch') ob.activeUntil = lv.switches[ob.target] || 0;
    if (ob.type === 'portal' || ob.type === 'potion') ob.lastUse = -10;
    if (ob.type === 'cannon' || ob.type === 'cauldron') ob.loaded = false;
    if (ob.type === 'aufzug' && ob.zurueck) ob.zurueck();   // Kabine steht zu jedem Schlag wieder unten
  }
}

export function newState(hole) {
  const lv = getLevel(hole);
  const b = G.makeBall(lv.tee.x, lv.tee.y, '#fff');
  /* Der Abschlag darf auf jeder Sohle liegen (level.js, 'teeEbene'). Ohne das startete der Ball in
     der Zwergenmine unter der Galerie im Nichts und war sofort aus – der Bot hat dort zehnmal
     hintereinander das Schlaglimit erreicht, ohne je einen Schlag zu spielen. */
  b.ebene = lv.teeEbene || 0;
  return { hole, def: hole, ball: b, t: 0, strokes: 0, schlagZahl: 0, switches: {}, inner: false, done: false, log: [] };
}
export function maxStrokes(hole) { return hole.maxStrokes || DEFAULT_MAX; }
export function cloneState(st) { return { ...st, ball: { ...st.ball, rider: null }, switches: { ...st.switches }, log: st.log.slice() }; }

/* Einen Schlag ausführen. Liefert einen neuen Zustand; st.last beschreibt das Ergebnis:
   'sunk' | 'rest' | 'water'|'lava'|'oob'|'shark' (Strafschlag) | 'enter' (Innen-Map betreten) | 'max' */
export function shoot(st0, ang, pow, wait = 0, wantTrace = false) {
  const st = cloneState(st0);
  const lv = getLevel(st.def);
  resetLevel(lv, st.switches, st.schlagZahl);
  zauberSetzen(lv, st.zauber);
  const b = st.ball;
  st.t += wait;
  b.restX = b.x; b.restY = b.y; b.air = false; b.z = 0; b.vz = 0; b.rider = null;
  b.vx = Math.cos(ang) * pow * MAX_SHOT; b.vy = Math.sin(ang) * pow * MAX_SHOT;
  st.strokes++;
  // Der Zähler der Kaiserloge zählt das Ende eines Schlags; die Bahn liest ihn erst beim nächsten
  st.schlagZahl = (st.schlagZahl || 0) + 1;
  let t = st.t, restT = 0, slowT = 0, wartet = false, trace = [];
  const maxT = 26;
  const WARTEN = ['aufzug', 'zahnstange', 'turbine', 'luke', 'seilbahn'];   // Maschinen, die einen ruhenden Ball noch holen
  for (let i = 0; i < 240 * maxT; i++) {
    const ev = G.stepPhysics(lv, b, STEP, t, true); t += STEP;
    if (wantTrace && i % 12 === 0) trace.push([+b.x.toFixed(2), +b.y.toFixed(2), b.air ? 1 : 0]);
    let out = null, ausOb = null;
    for (const e of ev) {
      if (e.type === 'sunk') { out = 'sunk'; break; }
      if (e.type === 'switch') st.switches = Object.assign({}, lv.switches);
      if (e.type === 'enter') { out = 'enter'; break; }
      if (e.type === 'shark') { out = (st.hole.inner && st.hole.inner.stomach && !st.inner) ? 'stomach' : 'shark'; break; }
      if (e.type === 'water' || e.type === 'lava' || e.type === 'oob' || e.type === 'spiked' || e.type === 'zapped' || e.type === 'fell') { out = e.type; break; }
      // Feuerturm und Kaiserloge werfen zurück, aber ohne Strafschlag
      if (e.type === 'scorched' || e.type === 'dropped') { out = e.type; ausOb = e.ob; break; }
    }
    if (out) {
      st.t = t; st.trace = trace; st.zauber = zauberLesen(lv);
      if (out === 'sunk') { st.done = true; st.last = 'sunk'; return st; }
      if (out === 'enter' || out === 'stomach') {
        const inner = st.hole.inner; st.def = inner; st.inner = true;
        const ilv = getLevel(inner);
        Object.assign(b, { x: ilv.tee.x, y: ilv.tee.y, vx: 0, vy: 0, z: 0, vz: 0, air: false, rider: null, entered: false, portalCd: 0.5 });
        b.restX = b.x; b.restY = b.y;
        st.switches = {}; st.t += 0.7; st.last = out; st.log.push(out);
        return st;
      }
      if (out === 'scorched' || out === 'dropped') {
        // Ohne Strafschlag zurück an den Ruhepunkt; lag der selbst in der Gefahrenfläche, weiter
        // zurück zum Schlagstart – genau wie im Spiel, sonst käme der Ball dort nie heraus.
        let rx = b.restX, ry = b.restY;
        if (ausOb && ausOb.trifft(rx, ry)) { rx = lv.tee.x; ry = lv.tee.y; }
        Object.assign(b, { x: rx, y: ry, vx: 0, vy: 0, z: 0, vz: 0, air: false, rider: null, portalCd: 0.5 });
        b.restX = rx; b.restY = ry;
        st.t += 0.9; st.last = out; st.log.push(out);
        if (st.strokes >= maxStrokes(st.hole)) { st.done = true; st.last = 'max'; st.strokes = maxStrokes(st.hole); }
        return st;
      }
      /* Strafschlag: zurück zur Ruheposition – aber NIE auf eine Rankenbrücke. Dort fiele der Ball
         sofort wieder, bekäme den nächsten Strafschlag und läge wieder da, bis das Schlaglimit
         erreicht ist. Genau diese Schleife hat Fynn am 19. September im Spiel gefunden; sie steht
         dort in main.js (sichererRuhepunkt), und ohne dieselbe Regel hier hielte der Bot jede
         Rankenbahn für unlösbar. */
      st.strokes++; st.log.push(out);
      let zx = b.restX, zy = b.restY;
      if (aufRanke(lv, b, zx, zy)) { zx = lv.tee.x; zy = lv.tee.y; }
      Object.assign(b, { x: zx, y: zy, vx: 0, vy: 0, z: 0, vz: 0, air: false, rider: null, portalCd: 0.5 });
      b.restX = zx; b.restY = zy;
      st.t += 0.9; st.last = out;
      if (st.strokes >= maxStrokes(st.hole)) { st.done = true; st.last = 'max'; st.strokes = maxStrokes(st.hole); }
      return st;
    }
    if (b.rider || b.air) { restT = 0; slowT = 0; continue; }
    const sp = Math.hypot(b.vx, b.vy);
    /* Liegenbleiben heißt nicht immer, dass der Schlag zu Ende ist. Im Spiel läuft die Physik auch
       beim Zielen weiter (main.js ruft stepPhysics in 'aim' wie in 'rolling'), und genau darauf
       bauen die Aufzüge des Uhrenturms: Wer in der Aufzugkabine liegenbleibt, wird hochgefahren,
       wer auf der Zahnstange wartet, beim nächsten Losfahren. Bräche hier bei
       Ruhe sofort ab, wären diese Bahnen für den Bot unlösbar, obwohl sie es im Spiel nicht sind.
       Also wird bei Ruhe auf einem Aufzug oder einer Luke noch so lange weitergerechnet, wie der
       langsamste von ihnen für einen Umlauf braucht. */
    if (sp < 0.08 || (sp < 0.5 && !b.boosted)) {
      const eb = b.ebene || 0;
      if (!wartet) wartet = lv.obstacles.some(o => WARTEN.includes(o.type) && (o.ebene || 0) === eb
        && Math.abs(o.x - b.x) < 1.4 && Math.abs(o.y - b.y) < 1.4);
    } else wartet = false;
    /* Auf einer tragenden Ranke ist der Schlag noch nicht zu Ende: Sie welkt gleich, und dann
       fällt der Ball. Bräche hier ab, hielte der Bot einen Ball für in Sicherheit, der es nicht
       ist – und stünde beim nächsten Schlag mitten über der Lücke. */
    if (sp < 0.08 && aufTragenderRanke(lv, b, t)) { restT = 0; continue; }
    if (sp < 0.08) { restT += STEP; if (restT > (wartet ? 6 : 0.25)) break; } else restT = 0;
    if (sp < 0.5 && !b.boosted) { slowT += STEP; if (slowT > (wartet ? 8 : 3)) break; } else slowT = 0;
  }
  b.vx = 0; b.vy = 0; b.rider = null; b.air = false; b.z = 0;
  // Wie im Spiel (main.js, ballAtRest): von der Wächte rutscht der Ball herunter
  G.waechteAbrutschen(lv, b);
  st.t = t + 0.3; st.trace = trace; st.last = 'rest'; st.zauber = zauberLesen(lv);
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
  /* Ebenen: Der Uhrenturm stapelt Spielflächen übereinander, und das Loch kann auf jeder davon
     liegen. Die Distanzkarte wird darum nicht für eine Fläche gerechnet, sondern für alle, mit
     Kanten dazwischen – sonst stünde der Bot vor einem Loch, das für ihn gar nicht existiert,
     und spielte blind bis zum Schlaglimit. */
  const flaechen = (lv.flaechen && lv.flaechen.length) ? lv.flaechen : [{ tiles: lv.tiles }];
  const E = flaechen.length;
  const chAuf = (n, x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '.' : flaechen[n].tiles[y][x];
  const walkE = (n, x, y) => {
    const c = chAuf(n, x, y);
    if (!(lv.isFloorChar(c) && c !== 'w' && c !== 'l')) return false;
    if (!solids.length || n > 0) return true;                 // Mühlen stehen nur unten
    for (const fx of [0.2, 0.5, 0.8]) for (const fy of [0.2, 0.5, 0.8]) { const cx = x + fx, cy = y + fy; if (!solids.some(b => cx > b.x0 && cx < b.x1 && cy > b.y0 && cy < b.y1)) return true; }
    return false;
  };
  const walk = (x, y) => walkE(0, x, y);
  const edgeOpen = (x, y, nx, ny) => { // Kante zwischen Nachbarkacheln (orthogonal) frei?
    if (!walls.length) return true;
    let ax, ay, bx, by;
    if (nx !== x) { ax = bx = Math.max(x, nx); ay = y; by = y + 1; } else { ay = by = Math.max(y, ny); ax = x; bx = x + 1; }
    for (const w of walls) if (segCover(w, ax, ay, bx, by) > 0.85) return false;
    return true;
  };
  // Verbindungen: [ax, ay, an, bx, by, bn] heißt "von A auf Ebene an kommt man nach B auf Ebene bn"
  const links = [];
  const eb = o => o.ebene || 0;
  for (const o of def.obstacles || []) {
    const n = eb(o);
    if (o.type === 'portal') { links.push([o.x, o.y, n, o.tx, o.ty, n]); if (o.twoWay) links.push([o.tx, o.ty, n, o.x, o.y, n]); }
    if (o.type === 'ferry') { links.push([o.x0, o.y0, n, o.x1, o.y1, n]); links.push([o.x1, o.y1, n, o.x0, o.y0, n]); }
    // Seilbahn: wie die Fähre, darf dabei aber die Ebene wechseln
    if (o.type === 'seilbahn') { const zl = o.ziel == null ? n : o.ziel; links.push([o.x0, o.y0, n, o.x1, o.y1, zl]); links.push([o.x1, o.y1, zl, o.x0, o.y0, n]); }
    if (o.type === 'gearfield') { links.push([o.x0, o.y0, n, o.x1, o.y1, n]); links.push([o.x1, o.y1, n, o.x0, o.y0, n]); }
    if (o.type === 'ramp') { const a = (o.angle ?? 90) * Math.PI / 180, cx = o.x + (o.w || 2) / 2, cy = o.y + (o.h || 2) / 2, half = Math.abs(Math.cos(a)) > 0.5 ? (o.w || 2) / 2 : (o.h || 2) / 2; const L = half + (o.land ?? 1.7); links.push([cx, cy, n, cx + Math.cos(a) * L, cy + Math.sin(a) * L, n]); }
    if (o.type === 'updraft') { const cx = o.x + (o.w || 2) / 2, cy = o.y + (o.h || 2) / 2; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) links.push([cx, cy, n, cx + dx * (o.land ?? 5), cy + dy * (o.land ?? 5), n]); }
    if (o.type === 'cannon' || o.type === 'springwork') { const R = (o.range || 9) * 0.9; links.push([o.x, o.y, n, o.x + Math.cos(o.base || 0) * R, o.y + Math.sin(o.base || 0) * R, n]); }
    // Aufzüge des Uhrenturms: eine Etage höher, an derselben Stelle
    if (o.type === 'turbine' || o.type === 'aufzug' || o.type === 'zahnstange') { if (n + 1 < E) links.push([o.x, o.y, n, o.x, o.y, n + 1]); }
    // Kupferrohr: Mund auf seiner Ebene, Auswurf auf der Zielebene
    if (o.type === 'liongate' || o.type === 'copperpipe') {
      const g = String(o.pair || '').toUpperCase(), kl = g.toLowerCase(), ziel = o.ziel == null ? n : o.ziel;
      let ein = null, aus = null;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) { if (chAuf(n, x, y) === g) ein = [x + 0.5, y + 0.5]; if (ziel < E && chAuf(ziel, x, y) === kl) aus = [x + 0.5, y + 0.5]; }
      if (ein && aus) { const a = ((o.angle || 0) * Math.PI) / 180; links.push([ein[0], ein[1], n, aus[0] + Math.cos(a) * 0.95, aus[1] + Math.sin(a) * 0.95, ziel]); }
    }
    // Luke: von ihrer Ebene auf die nächste darunter, auf der Boden ist
    if (o.type === 'luke' && n >= 1) { for (let m = n - 1; m >= 0; m--) if (walkE(m, Math.floor(o.x), Math.floor(o.y))) { links.push([o.x, o.y, n, o.x, o.y, m]); break; } }
  }
  // Offene Kanten ('o'): dort baut level.js keine Bande, dort geht es hinunter
  for (let n = 1; n < E; n++) for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    if (chAuf(n, x, y) !== 'o') continue;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= W || ny >= H || walkE(n, nx, ny)) continue;
      for (let m = n - 1; m >= 0; m--) if (walkE(m, nx, ny)) { links.push([x + 0.5, y + 0.5, n, nx + 0.5, ny + 0.5, m]); break; }
    }
  }
  const tgt = lv.goal, tgtE = lv.cupEbene || 0;
  const run = (diag, sx = tgt.x, sy = tgt.y, sn = tgtE) => {
    const d = Array.from({ length: E }, () => Array.from({ length: H }, () => new Array(W).fill(Infinity)));
    const par = Array.from({ length: E }, () => Array.from({ length: H }, () => new Array(W).fill(null)));
    const q = [];
    const push = (n, x, y, v, from) => { if (n < 0 || n >= E || !walkE(n, x, y) || d[n][y][x] <= v) return; d[n][y][x] = v; par[n][y][x] = from; q.push([n, x, y]); };
    push(sn, Math.floor(sx), Math.floor(sy), 0, null);
    while (q.length) {
      const [n, x, y] = q.shift(); const v = d[n][y][x];
      for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (edgeOpen(x, y, x + ox, y + oy)) push(n, x + ox, y + oy, v + 1, [n, x, y]);
      if (diag) for (const [ox, oy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) if (walkE(n, x + ox, y) && walkE(n, x, y + oy) && edgeOpen(x, y, x + ox, y) && edgeOpen(x + ox, y, x + ox, y + oy)) push(n, x + ox, y + oy, v + 1.414, [n, x, y]);
      for (const [ax, ay, an, bx, by, bn] of links) { if (bn !== n) continue; const bxT = Math.floor(bx), byT = Math.floor(by); if (Math.abs(bxT - x) <= 1 && Math.abs(byT - y) <= 1) push(an, Math.floor(ax), Math.floor(ay), v + 1.5, [n, x, y]); }
    }
    return { d, par };
  };
  const { d } = run(true);
  const straight = run(false);
  // Karte mit geschlossenen Schalter-Toren: wer das Ziel auch so erreicht, braucht den Schalter nicht (mehr)
  const gates = (def.obstacles || []).filter(o => o.type === 'gate' && o.linked);
  let dClosed = d;
  if (gates.length) {
    const saved = walls.slice();
    for (const g of gates) walls.push(g.w >= g.h ? { x0: g.x - g.w / 2, y0: g.y, x1: g.x + g.w / 2, y1: g.y } : { x0: g.x, y0: g.y - g.h / 2, x1: g.x, y1: g.y + g.h / 2 });
    dClosed = run(true).d;
    walls.length = 0; walls.push(...saved);
  }
  // Pfad vom Abschlag zum Ziel (geradlinig)
  const path = []; let cn = 0, cx = Math.floor(lv.tee.x), cy = Math.floor(lv.tee.y);
  for (let i = 0; i < 2000 && cx !== null; i++) { path.push([cx, cy]); const pr = straight.par[cn] && straight.par[cn][cy] && straight.par[cn][cy][cx]; if (!pr) break; [cn, cx, cy] = pr; }
  // Schalter-Rätsel: für jedes verknüpfte Tor die Distanzkarte zur Druckplatte plus Weg Platte→Ziel
  const linked = [];
  for (const g of (def.obstacles || []).filter(o => o.type === 'gate' && o.linked)) {
    const sw = (def.obstacles || []).find(o => o.type === 'switch' && o.target === g.linked); if (!sw) continue;
    const m = run(true, sw.x, sw.y, 0).d, sx = Math.floor(sw.x), sy = Math.floor(sw.y);
    linked.push({ id: g.linked, sw: { x: sw.x, y: sw.y }, dSw: m, swToGoal: d[0][sy][sx] });
  }
  /* Die Rankenbrücke ist dasselbe Rätsel wie das Schalter-Tor, nur mit einer Blüte statt einer
     Druckplatte: Solange sie nicht trägt, führt über die Lücke kein Weg, und das nächste Ziel ist
     nicht das Loch, sondern die Blüte. Ohne dieses Wissen lief der Bot immer wieder geradeaus
     gegen dieselbe Lücke, fiel hinein und erreichte das Schlaglimit – er hätte jede Bahn mit einer
     Ranke für unspielbar erklärt, obwohl jeder Spieler auf einen Blick sieht, was zu tun ist.
     Gerechnet wird zweierlei: die Karte zum Loch OHNE die Lücke (wer sie auch so erreicht, braucht
     die Ranke nicht mehr) und die Karte zur Blüte. */
  const ranken = [];
  for (const o of (def.obstacles || []).filter(o => o.type === 'ranke' && o.bluete)) {
    const bl = { x: o.bluete.x, y: o.bluete.y }, n0 = o.ebene || 0;
    const saved = walls.slice();
    walls.push({ x0: o.x, y0: o.y, x1: o.x + o.w, y1: o.y },
               { x0: o.x, y0: o.y + o.h, x1: o.x + o.w, y1: o.y + o.h },
               { x0: o.x, y0: o.y, x1: o.x, y1: o.y + o.h },
               { x0: o.x + o.w, y0: o.y, x1: o.x + o.w, y1: o.y + o.h });
    const dOhne = run(true).d;
    const dBl = run(true, bl.x, bl.y, n0).d;
    walls.length = 0; walls.push(...saved);
    const bx = Math.floor(bl.x), by = Math.floor(bl.y);
    ranken.push({ ob: o, bl, dOhne, dBl, blToGoal: d[n0][by] && isFinite(d[n0][by][bx]) ? d[n0][by][bx] : 20 });
  }
  const puzzle = { shrink: (def.obstacles || []).some(o => o.type === 'cauldron' || o.type === 'potion'), linked, ranken };
  const res = { dE: d, d: d[0], dClosedE: dClosed, dClosed: dClosed[0], walk, lv, path, puzzle, ebenen: E,
    at(x, y, n = 0) { const tx = Math.floor(x), ty = Math.floor(y); if (tx < 0 || ty < 0 || tx >= W || ty >= H) return Infinity; return d[n][ty][tx]; } };
  DIST.set(def, res); return res;
}
/* Fortschrittsmaß eines Zustands: BFS-Distanz zum Ziel + Feinanteil; Innen-Map zählt als "näher";
   Rätselwissen: ungeschrumpft vor einem Spalt bzw. Tor ohne aktiven Schalter gilt als weiter weg */
/* aktive Zielkarte: normalerweise das Loch; ist ein Schalter-Tor noch zu, erst die Druckplatte */
export function activeMap(st) {
  const dm = distMap(st.def), lv = dm.lv;
  const n = Math.min(st.ball && st.ball.ebene || 0, dm.ebenen - 1);   // die Fläche, auf der der Ball steht
  for (const L of dm.puzzle.linked) if (!(st.switches[L.id] > st.t)) {
    const tx = Math.floor(st.ball.x), ty = Math.floor(st.ball.y), inside = tx >= 0 && ty >= 0 && tx < lv.W && ty < lv.H;
    if (inside && isFinite(dm.dClosedE[n][ty][tx])) return { d: dm.dClosedE[n], goal: lv.goal, extra: 0 }; // schon hinter dem Tor
    return { d: L.dSw[n] || L.dSw[0], goal: L.sw, extra: L.swToGoal + 1 };
  }
  for (const r of dm.puzzle.ranken) {
    if (st.t <= (r.ob.bisT == null ? -99 : r.ob.bisT)) continue;      // sie trägt gerade
    const tx = Math.floor(st.ball.x), ty = Math.floor(st.ball.y);
    if (tx < 0 || ty < 0 || tx >= lv.W || ty >= lv.H) continue;
    const ohne = r.dOhne[n] && r.dOhne[n][ty][tx];
    if (isFinite(ohne)) continue;                                      // das Loch geht auch ohne sie
    const zurBluete = r.dBl[n] && r.dBl[n][ty][tx];
    if (!isFinite(zurBluete)) continue;                                // die Blüte ist von hier nicht zu holen
    return { d: r.dBl[n], goal: r.bl, extra: r.blToGoal + 1 };
  }
  return { d: dm.dE[n], goal: lv.goal, extra: 0 };
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
