/* Wandelt eine ASCII-Karte in Kacheln, Kollisions-Segmente, Mauerstücke und Blöcke um. */
const FLOOR_CHARS = new Set(['#', 's', 'i', 'w', 'l', 'T', 'H', 'o']); // o = Fairway ohne Randmauer (Klippe)
const WALL_T = 0.38;       // Dicke der Randmauern (nach außen)
const WALL_CHUNK = 4;      // längere Mauern werden fürs Sortieren zerteilt

function seededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

function buildLevel(def) {
  const rows = def.map;
  const H = rows.length;
  const W = Math.max(...rows.map(r => r.length));
  const tiles = rows.map(r => r.padEnd(W, '.').split(''));
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '.' : tiles[y][x];
  const isFloor = (x, y) => FLOOR_CHARS.has(at(x, y));

  let tee = null, cup = null;
  const blocks = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = tiles[y][x];
    if (c === 'T') tee = { x: x + 0.5, y: y + 0.5 };
    if (c === 'H') cup = { x: x + 0.5, y: y + 0.5 };
    if (c === 'x') blocks.push({ x, y });
  }
  let goal = cup;
  if (!cup) { // Bahnabschnitt ohne Loch: die Tür (Hexenhütte) ist das Ziel
    const door = (def.obstacles || []).find(o => o.type === 'door');
    if (door) goal = { x: door.x, y: door.y };
  }
  if (!tee || !goal) {
    if (!def.editing) throw new Error(`Bahn "${def.name}": Abschlag (T) oder Loch (H) fehlt`);
    tee = tee || { x: -100, y: -100 }; goal = goal || tee; // Baumodus: noch unfertige Bahn darstellen
  }

  const segs = [];   // Kollision
  const walls = [];  // Darstellung (Rechtecke in Weltkoordinaten)

  // Kanten entlang der x-Achse (Linien y = k)
  for (let k = 0; k <= H; k++) {
    for (const side of ['top', 'bottom']) {
      const floorRow = side === 'top' ? k : k - 1;
      const outRow = side === 'top' ? k - 1 : k;
      const test = xx => isFloor(xx, floorRow) && !isFloor(xx, outRow) && at(xx, floorRow) !== 'o';
      const kind = xx => at(xx, outRow) === 'x' ? 'x' : 'w';
      let x = 0;
      while (x < W) {
        if (!test(x)) { x++; continue; }
        const x0 = x, kd = kind(x);
        while (x < W && test(x) && kind(x) === kd) x++;
        const x1 = x;
        segs.push({ ax: x0, ay: k, bx: x1, by: k });
        if (kd === 'w') {
          let rx0 = x0, rx1 = x1;
          if (!isFloor(x0 - 1, floorRow)) rx0 -= WALL_T;
          if (!isFloor(x1, floorRow)) rx1 += WALL_T;
          const ry = side === 'top' ? k - WALL_T : k;
          pushWallChunks(walls, rx0, ry, rx1 - rx0, WALL_T);
        }
      }
    }
  }
  // Kanten entlang der y-Achse (Linien x = k)
  for (let k = 0; k <= W; k++) {
    for (const side of ['left', 'right']) {
      const floorCol = side === 'left' ? k : k - 1;
      const outCol = side === 'left' ? k - 1 : k;
      const test = yy => isFloor(floorCol, yy) && !isFloor(outCol, yy) && at(floorCol, yy) !== 'o';
      const kind = yy => at(outCol, yy) === 'x' ? 'x' : 'w';
      let y = 0;
      while (y < H) {
        if (!test(y)) { y++; continue; }
        const y0 = y, kd = kind(y);
        while (y < H && test(y) && kind(y) === kd) y++;
        const y1 = y;
        segs.push({ ax: k, ay: y0, bx: k, by: y1 });
        if (kd === 'w') {
          let ry0 = y0, ry1 = y1;
          if (!isFloor(floorCol, y0 - 1)) ry0 -= WALL_T;
          if (!isFloor(floorCol, y1)) ry1 += WALL_T;
          const rx = side === 'left' ? k - WALL_T : k;
          pushWallChunks(walls, rx, ry0, WALL_T, ry1 - ry0);
        }
      }
    }
  }

  const obstacles = createObstacles(def.obstacles || []);
  const decor = buildDecor(def, tiles, W, H, isFloor);

  // Höhenstufen (optional): def.heights ist ein Ziffernraster wie die Karte, def.hStep die Höhe je Stufe.
  // Steigungsfelder (field mit rise) verbinden zwei Stufen als schräge Ebene.
  const hStep = def.hStep || 0.5, hasHeights = !!def.heights;
  const hgrid = tiles.map((row, y) => row.map((c, x) => { const ch = def.heights && def.heights[y] && def.heights[y][x]; return ch >= '0' && ch <= '9' ? +ch : 0; }));
  const slopes = obstacles.filter(o => o.type === 'field' && o.rise);
  const cellH = (tx, ty) => (tx < 0 || ty < 0 || tx >= W || ty >= H) ? 0 : hgrid[ty][tx] * hStep;
  const slopeAt = (x, y) => slopes.find(f => x >= f.x && x <= f.x + f.w && y >= f.y && y <= f.y + f.h);
  const floorHeight = (x, y, tx, ty) => { // Höhe eines Punktes innerhalb einer Bodenkachel (mit Rampen-Interpolation)
    const f = slopeAt(x, y);
    if (!f) return cellH(tx, ty);
    const L = Math.hypot(f.fx, f.fy) || 1, dx = f.fx / L, dy = f.fy / L; // (fx,fy) zeigt bergab
    const cx = f.x + f.w / 2, cy = f.y + f.h / 2, half = Math.abs(dx) > 0.5 ? f.w / 2 : f.h / 2;
    const u = Math.max(0, Math.min(1, 0.5 - ((x - cx) * dx + (y - cy) * dy) / (2 * half)));
    return f.base * hStep + f.rise * hStep * u;
  };
  const heightAt = (x, y) => {
    if (!hasHeights) return 0;
    const tx = Math.floor(x), ty = Math.floor(y);
    if (isFloor(tx, ty)) return floorHeight(x, y, tx, ty);
    // Leere Kachel: Höhe der nächstgelegenen Bodenkachel (erst orthogonal, dann diagonal)
    let best = null, bd = Infinity;
    for (const [ox, oy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = tx + ox, ny = ty + oy; if (!isFloor(nx, ny)) continue;
      const px = Math.min(nx + 0.999, Math.max(nx + 0.001, x)), py = Math.min(ny + 0.999, Math.max(ny + 0.001, y));
      const d = Math.hypot(px - x, py - y); if (d < bd) { bd = d; best = floorHeight(px, py, nx, ny); }
    }
    if (best !== null) return best;
    let m = 0; for (const [ox, oy] of [[1, 1], [-1, 1], [1, -1], [-1, -1]]) if (isFloor(tx + ox, ty + oy)) m = Math.max(m, cellH(tx + ox, ty + oy));
    return m;
  };

  const level = {
    def, W, H, tiles, tee, cup, goal, blocks, segs, walls, obstacles, decor, switches: {},
    hasHeights, hStep, heightAt, cellH, slopeAt,
    charAt(x, y) { return at(Math.floor(x), Math.floor(y)); },
    isFloorChar(c) { return FLOOR_CHARS.has(c); },
  };
  for (const ob of obstacles) ob.level = level;
  return level;
}

function pushWallChunks(walls, x, y, w, h) {
  if (w > h) {
    const n = Math.max(1, Math.ceil(w / WALL_CHUNK));
    for (let i = 0; i < n; i++) {
      const cx = x + (w * i) / n, cw = w / n;
      walls.push({ x: cx, y, w: cw, h });
    }
  } else {
    const n = Math.max(1, Math.ceil(h / WALL_CHUNK));
    for (let i = 0; i < n; i++) {
      const cy = y + (h * i) / n, ch = h / n;
      walls.push({ x, y: cy, w, h: ch });
    }
  }
}

/* Deko: explizite Objekte plus automatisch verstreute Objekte auf leeren Kacheln
   (innerhalb der Karte und in einem Ring von 2 Kacheln außen herum). */
function buildDecor(def, tiles, W, H, isFloor) {
  const theme = THEMES[def.theme];
  const out = [];
  for (const d of def.decor || []) out.push(Object.assign({ s: 1, z: 0 }, d));
  const auto = def.autoDecor;
  if (auto && theme.autoDecor.length) {
    const rnd = seededRandom(auto.seed || 1);
    const density = auto.density ?? 0.3;
    for (let y = -2; y < H + 2; y++) for (let x = -2; x < W + 2; x++) {
      if (isFloor(x, y)) continue;
      if (rnd() > density) continue;
      // Objekte "vor" dem Fairway (größeres x+y) würden es verdecken → dort nichts platzieren
      let blocked = false;
      for (let i = 0; i <= 2 && !blocked; i++) for (let j = 0; j <= 2; j++) if (isFloor(x - i, y - j)) { blocked = true; break; }
      if (blocked) continue;
      const t = theme.autoDecor[Math.floor(rnd() * theme.autoDecor.length)];
      if (t === 'cloud') { // Wolken sind breit: mindestens zwei Kacheln Abstand zur Bahn
        let near = false;
        for (let i = -2; i <= 2 && !near; i++) for (let j = -2; j <= 2; j++) if (isFloor(x + i, y + j)) { near = true; break; }
        if (near) continue;
      }
      const px = x + 0.25 + rnd() * 0.5, py = y + 0.25 + rnd() * 0.5;
      // Abstand zu Abschlag/Loch-Sicht: nichts direkt vor dem Loch (nur Optik)
      out.push({ t, x: px, y: py, s: 0.75 + rnd() * 0.6, z: 0, seed: rnd() });
    }
  }
  return out;
}
