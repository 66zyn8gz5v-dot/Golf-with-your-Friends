/* Wandelt eine ASCII-Karte in Kacheln, Kollisions-Segmente, Mauerstücke und Blöcke um. */
/* o = Fairway ohne Randmauer (Klippe).
   A, B, C sind die Eingänge der Löwentore: begehbarer Boden, damit ein Ball mit Schwung hineinrollen
   kann. Ihre Ausgänge (a, b, c) stehen bewusst NICHT hier – als Nicht-Boden zieht die Arenamauer von
   selbst eine Wand davor, und genau das soll ein Ausgang von außen sein: massiv. */
const FLOOR_CHARS = new Set(['#', 's', 'i', 'w', 'l', 'T', 'H', 'o', 'A', 'B', 'C']);
const WALL_T = 0.38;       // Dicke der Randmauern (nach außen)
/* Die Uhrenturm-Welt spielt auf zwei Ebenen. Das ist keine Höhenphysik, sondern ein Umschalter:
   Der Ball ist immer auf genau einer Fläche und kollidiert nur mit deren Wänden. Es dürfen mehr
   als zwei sein; sie stapeln sich der Reihe nach. EBENE_Z ist nur fürs Auge – so hoch liegt jede
   Ebene über der darunter. Eine Bahn darf das mit `ebeneZ` überschreiben: Der Rohrturm stapelt
   seine drei Etagen weiter auseinander, damit man sieht, dass zwischen ihnen nichts ist außer dem
   Rohr. Auf die Physik hat das keinen Einfluss – nur darauf, wie hoch gezeichnet wird. */
const EBENE_Z = 2.0;
const EBENE_Z_MAX = 6;
const WALL_CHUNK = 4;      // längere Mauern werden fürs Sortieren zerteilt

function seededRandom(seed) {
  let s = seed >>> 0 || 1;
  return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
}

/* Eine Spielfläche: aus einem ASCII-Raster werden Kacheln, Kollisions-Segmente, Mauerstücke und
   Blöcke. Eine Bahn hat mindestens eine solche Fläche (die untere) und kann eine zweite haben
   (die obere, def.oben). Beide sind gleich groß und liegen deckungsgleich übereinander. */
function bauFlaeche(rows, W, H, def) {
  const tiles = rows.map(r => r.padEnd(W, '.').split(''));
  const at = (x, y) => (x < 0 || y < 0 || x >= W || y >= H) ? '.' : tiles[y][x];
  const isFloor = (x, y) => FLOOR_CHARS.has(at(x, y));

  let tee = null, cup = null;
  const blocks = [];
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = tiles[y][x];
    if (c === 'T') tee = { x: x + 0.5, y: y + 0.5 };
    if (c === 'H') cup = { x: x + 0.5, y: y + 0.5, r: def.cupR || 0.42, pull: def.cupPull || 0.62 }; // cupR/cupPull: größeres Loch (Schattenreich)
    if (c === 'x') blocks.push({ x, y });
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
  return { tiles, at, isFloor, segs, walls, blocks, tee, cup };
}

function buildLevel(def) {
  const rows = def.map;
  const H = rows.length;
  const W = Math.max(...rows.map(r => r.length));
  const unten = bauFlaeche(rows, W, H, def);
  /* Weitere Ebenen (optional). Jede ist dieselbe Fläche noch einmal, eine Etage höher – der Ball
     ist immer auf genau einer und stößt sich nur an deren Wänden. 'ebenen' ist die Liste der
     Ebenen über der untersten; 'oben' ist die Kurzform für genau eine. */
  const obenRohe = Array.isArray(def.ebenen) ? def.ebenen : (def.oben ? [def.oben] : []);
  const flaechen = [unten, ...obenRohe.map(r => bauFlaeche(r, W, H, def))];
  const tiles = unten.tiles;
  const at = unten.at, isFloor = unten.isFloor;
  const blocks = unten.blocks;
  const tee = unten.tee;
  // Das Loch liegt auf genau einer Ebene und ist nur von dort zu erreichen.
  const cupEbene = Math.max(0, flaechen.findIndex(f => f.cup));
  const cup = flaechen[cupEbene] ? flaechen[cupEbene].cup : null;

  let goal = cup;
  if (!cup) { // Bahnabschnitt ohne Loch: die Tür (Hexenhütte) ist das Ziel
    const door = (def.obstacles || []).find(o => o.type === 'door');
    if (door) goal = { x: door.x, y: door.y };
  }
  let tee2 = tee;
  if (!tee2 || !goal) {
    if (!def.editing) throw new Error(`Bahn "${def.name}": Abschlag (T) oder Loch (H) fehlt`);
    tee2 = tee2 || { x: -100, y: -100 }; goal = goal || tee2; // Baumodus: noch unfertige Bahn darstellen
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

  /* Das Level trägt immer die Felder der Ebene, auf der der Ball gerade ist: tiles, segs, walls,
     blocks. Die Physik liest sie in jedem Schritt neu, also genügt es, sie beim Ebenenwechsel
     umzuhängen – kein zweiter Satz Regeln, keine Sonderfälle in der Physik. */
  const level = {
    def, W, H, tiles: unten.tiles, tee: tee2, cup, goal, blocks: unten.blocks,
    segs: unten.segs, walls: unten.walls, obstacles, decor, switches: {},
    flaechen, ebene: 0, cupEbene, untenFl: unten,
    ebeneZ: Math.min(EBENE_Z_MAX, Math.max(1, +def.ebeneZ || EBENE_Z)),
    schlagZahl: 0,   // Schläge auf dieser Bahn (die Kaiserloge dreht danach den Daumen)
    hasHeights, hStep, heightAt, cellH, slopeAt,
    /* Umschalten zwischen unterer und oberer Ebene. Mehr ist ein Ebenenwechsel nicht: Der Ball
       behält Ort und Tempo, nur die Fläche unter ihm ist eine andere. */
    setzeEbene(n) {
      const fl = this.flaechen[n] || this.flaechen[0];
      this.ebene = this.flaechen[n] ? n : 0;
      this.tiles = fl.tiles; this.segs = fl.segs; this.walls = fl.walls; this.blocks = fl.blocks;
      this.aktiv = fl;
    },
    charAt(x, y) { return this.aktiv.at(Math.floor(x), Math.floor(y)); },
    /* Die Kachel einer bestimmten Ebene – die Turbine muss wissen, ob oben überhaupt Boden ist. */
    charAtEbene(n, x, y) { const fl = this.flaechen[n]; return fl ? fl.at(Math.floor(x), Math.floor(y)) : '.'; },
    isFloorChar(c) { return FLOOR_CHARS.has(c); },
  };
  level.aktiv = unten;
  for (const ob of obstacles) ob.level = level;
  // Manche Hindernisse holen sich ihre Plätze aus der Karte statt aus der Hindernisliste (Löwentor)
  for (const ob of obstacles) if (ob.setup) ob.setup(level);
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

/* Abstand eines Punktes zu einer Strecke – für die Freihaltezonen der Deko. */
function abstandStrecke(px, py, f) {
  const dx = f.x1 - f.x0, dy = f.y1 - f.y0, L = dx * dx + dy * dy;
  let u = L ? ((px - f.x0) * dx + (py - f.y0) * dy) / L : 0;
  u = Math.max(0, Math.min(1, u));
  return Math.hypot(px - (f.x0 + dx * u), py - (f.y0 + dy * u));
}

/* Deko: explizite Objekte plus automatisch verstreute Objekte auf leeren Kacheln
   (innerhalb der Karte und in einem Ring von 2 Kacheln außen herum). */
function buildDecor(def, tiles, W, H, isFloor) {
  const theme = THEMES[def.theme];
  const out = [];
  for (const d of def.decor || []) out.push(Object.assign({ s: 1, z: 0 }, d));
  /* Freihalten, wo eine Maschine über den Fairway hinausgreift. Das Zahnradfeld trägt quer über
     eine Lücke, Feder und Kanone werfen darüber hinweg – und genau dort ist kein Boden, also
     streut die Zufallsdeko sonst mitten hinein. Dann verschwindet die Strecke im Gerümpel und
     man sieht nicht mehr, wohin der Weg führt. */
  const frei = [];
  for (const o of def.obstacles || []) {
    if (o.type === 'gearfield') frei.push({ x0: o.x0, y0: o.y0, x1: o.x1, y1: o.y1, r: 1.9 });
    if (o.type === 'springwork' || o.type === 'cannon') {
      const a = o.base || 0, R = 0.9 + (o.range || 9);
      frei.push({ x0: o.x, y0: o.y, x1: o.x + Math.cos(a) * R, y1: o.y + Math.sin(a) * R, r: 1.4 });
    }
  }
  const imWeg = (px, py) => frei.some(f => abstandStrecke(px, py, f) < f.r);
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
      const gr = 0.75 + rnd() * 0.6, sd = rnd();   // erst ziehen, dann verwerfen: sonst
      if (imWeg(px, py)) continue;                 // verschöbe sich die ganze Streuung
      out.push({ t, x: px, y: py, s: gr, z: 0, seed: sd });
    }
  }
  return out;
}
