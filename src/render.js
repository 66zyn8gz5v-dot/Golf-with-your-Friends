/* 2,5D-Darstellung auf Canvas mit frei drehbarer Kamera (Schrägsicht von oben, hinter dem Ball).
   Welt: x/y in Kacheln, z nach oben. Die Kamera hat Fokus, Drehwinkel, Zoom und Neigung. */
const CAM_TILT = 0.62;   // Neigung: 1 = senkrecht von oben, kleiner = flacher
const CAM_ZF = 0.9;      // Skalierung der Höhe

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return `rgb(${c(r)},${c(g)},${c(b)})`;
}
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function polyArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; }
  return a / 2;
}

class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.level = null; this.theme = null; this.w = 1; this.h = 1; this.dpr = 1;
    // aktuelle Kamera und Zielwerte (werden weich angenähert)
    this.cam = { fx: 0, fy: 0, th: Math.PI / 4, zoom: 40, tilt: CAM_TILT, cx: 0, cy: 0 };
    this.target = { fx: 0, fy: 0, th: Math.PI / 4, zoom: 40, tilt: CAM_TILT, cx: 0, cy: 0 };
    this.scale = 40;
    this.updateTrig();
  }
  updateTrig() { const c = this.cam; c.sin = Math.sin(c.th); c.cos = Math.cos(c.th); this.scale = c.zoom; }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  setLevel(level, theme) { this.level = level; this.theme = theme; }
  /* Zoomstufe für die Verfolger-Kamera, abhängig von der Bildschirmgröße */
  defaultZoom() { return Math.max(30, Math.min(60, Math.min(this.w / 12, this.h / 14))); }
  /* Übersicht: ganze Bahn im Bild */
  overviewTarget() {
    const { W, H } = this.level, padTop = 78, padBot = 70;
    const span = (W + H + 4) * Math.SQRT1_2;
    const zoom = Math.min((this.w - 30) / span, (this.h - padTop - padBot) / (span * CAM_TILT + 3));
    return { fx: W / 2, fy: H / 2, th: Math.PI / 4, zoom, tilt: CAM_TILT, cx: this.w / 2, cy: padTop + (this.h - padTop - padBot) / 2 + zoom * 0.8 };
  }
  /* Verfolger-Kamera: Ball unten im Bild, Blick in Richtung th */
  followTarget(ball, th, zoom) {
    const ahead = 2.0;
    return { fx: ball.x - Math.sin(th) * ahead, fy: ball.y - Math.cos(th) * ahead, th, zoom, tilt: CAM_TILT, cx: this.w / 2, cy: this.h * 0.55 };
  }
  snapCamera() { Object.assign(this.cam, this.target); this.updateTrig(); }
  updateCamera(dt) {
    const c = this.cam, tg = this.target, k = Math.min(1, dt * 4);
    c.fx += (tg.fx - c.fx) * k; c.fy += (tg.fy - c.fy) * k;
    c.zoom += (tg.zoom - c.zoom) * k; c.cx += (tg.cx - c.cx) * k; c.cy += (tg.cy - c.cy) * k;
    let d = tg.th - c.th; d = ((d + Math.PI) % TAU + TAU) % TAU - Math.PI;
    c.th += d * Math.min(1, dt * 3);
    this.updateTrig();
  }
  proj(x, y, z = 0) {
    if (!this.flat && this.level && this.level.hasHeights) z += this.level.heightAt(x, y);
    return this.projRaw(x, y, z);
  }
  projRaw(x, y, z = 0) {
    const c = this.cam, dx = x - c.fx, dy = y - c.fy;
    const rx = dx * c.cos - dy * c.sin, ry = dx * c.sin + dy * c.cos;
    return [c.cx + rx * c.zoom, c.cy + ry * c.zoom * c.tilt - z * c.zoom * CAM_ZF];
  }
  depth(x, y) { const c = this.cam; return (x - c.fx) * c.sin + (y - c.fy) * c.cos; }
  unprojDelta(dx, dy) {
    const c = this.cam, rx = dx / c.zoom, ry = dy / (c.zoom * c.tilt);
    return [rx * c.cos + ry * c.sin, -rx * c.sin + ry * c.cos];
  }
  screenToWorld(sx, sy) { const [x, y] = this.unprojDelta(sx - this.cam.cx, sy - this.cam.cy); return [x + this.cam.fx, y + this.cam.fy]; }
  onScreen(sx, sy, m) { return sx > -m && sx < this.w + m && sy > -m && sy < this.h + m; }

  /* ---------- Grundformen ---------- */
  pathPoly(ctx, poly, z = 0) {
    ctx.beginPath();
    poly.forEach((p, i) => { const [sx, sy] = this.proj(p[0], p[1], z); i ? ctx.lineTo(sx, sy) : ctx.moveTo(sx, sy); });
    ctx.closePath();
  }
  fillPoly(ctx, poly, z, color, seam = true) {
    this.pathPoly(ctx, poly, z);
    ctx.fillStyle = color; ctx.fill();
    if (seam) { ctx.strokeStyle = color; ctx.lineWidth = 1; ctx.stroke(); }
  }
  isoEllipse(ctx, x, y, z, r, color, ry = null) {
    const [sx, sy] = this.proj(x, y, z);
    ctx.beginPath();
    ctx.ellipse(sx, sy, r * this.scale, (ry ?? r) * this.scale * this.cam.tilt, 0, 0, TAU);
    ctx.fillStyle = color; ctx.fill();
  }
  prism(ctx, poly, z0, h, top, side, opts = {}) {
    const n = poly.length, orient = polyArea(poly) > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = poly[i], b = poly[(i + 1) % n];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      let nx = ey * orient, ny = -ex * orient;
      const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      if (nx * this.cam.sin + ny * this.cam.cos <= 0.001) continue;
      const light = 0.68 + 0.32 * (0.5 + 0.5 * (nx * 0.85 - ny * 0.53));
      const p0 = this.proj(a[0], a[1], z0), p1 = this.proj(b[0], b[1], z0);
      const p2 = this.proj(b[0], b[1], z0 + h), p3 = this.proj(a[0], a[1], z0 + h);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath();
      ctx.fillStyle = shade(side, light); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.8; ctx.stroke();
    }
    this.pathPoly(ctx, poly, z0 + h);
    ctx.fillStyle = top; ctx.fill();
    if (opts.outline) { ctx.strokeStyle = opts.outline; ctx.lineWidth = 1; ctx.stroke(); }
    else { ctx.strokeStyle = top; ctx.lineWidth = 0.8; ctx.stroke(); }
  }
  circlePoly(x, y, r, n = 10, a0 = 0) {
    const p = [];
    for (let i = 0; i < n; i++) { const a = a0 + (i * TAU) / n; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    return p;
  }

  /* ---------- Boden ---------- */
  drawFloor(ctx) {
    const { W, H, tiles } = this.level, th = this.theme;
    const cull = this.scale * 1.5;
    // Erdscholle
    const m = 1.4;
    const slab = [[-m, -m], [W + m, -m], [W + m, H + m], [-m, H + m]];
    if (th.floating) {
      // Schwebende Inseln: jede Fairway-Kachel bekommt einen Fels-Sockel
      const order = [];
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (this.level.isFloorChar(tiles[y][x])) order.push([x, y]);
      order.sort((a, b) => this.depth(a[0] + 0.5, a[1] + 0.5) - this.depth(b[0] + 0.5, b[1] + 0.5));
      for (const [x, y] of order) {
        const [sx, sy] = this.proj(x + 0.5, y + 0.5);
        if (this.onScreen(sx, sy, cull * 2)) this.prism(ctx, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], -1.3, 1.3, th.ground, th.groundEdge);
      }
    } else this.prism(ctx, slab, -1.0, 1.0, th.ground, th.groundEdge);
    if (th.sea) { // Wellenkämme auf dem Meer (die Scholle ist das Wasser)
      const t = this.level.t || 0;
      ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, this.scale * 0.04); ctx.lineCap = 'round';
      for (let i = 0; i < 70; i++) {
        const wx = ((i * 7.31) % (W + 2.8)) - 1.4, wy = (((i * 3.17) + this.seaT * 0.35) % (H + 2.8)) - 1.4;
        if (this.level.isFloorChar(this.level.charAt(wx, wy))) continue;
        const [a0, a1] = this.projRaw(wx - 0.3, wy, 0.01), [b0, b1] = this.projRaw(wx, wy - 0.08, 0.01), [c0, c1] = this.projRaw(wx + 0.3, wy, 0.01);
        ctx.globalAlpha = 0.4 + 0.4 * Math.sin(this.seaT * 1.5 + i);
        ctx.beginPath(); ctx.moveTo(a0, a1); ctx.quadraticCurveTo(b0, b1, c0, c1); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }
    // Kacheln (mit Höhenstufen: von hinten nach vorn, jede mit ihren Klippenwänden)
    const cells = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) cells.push([x, y]);
    if (this.level.hasHeights) cells.sort((a, b) => this.depth(a[0] + 0.5, a[1] + 0.5) - this.depth(b[0] + 0.5, b[1] + 0.5));
    for (const [x, y] of cells) {
      const c = tiles[y][x];
      if (c === '.' || c === 'x' || c === 'w' || c === 'l') continue;
      const [tsx, tsy] = this.proj(x + 0.5, y + 0.5);
      if (!this.onScreen(tsx, tsy, cull)) continue;
      const poly = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
      if (this.level.hasHeights) this.drawCliffs(ctx, x, y);
      let col;
      if (c === 's') col = th.sand; else if (c === 'i') col = th.ice; else col = th.floor[(x + y) & 1];
      this.fillPoly(ctx, poly, 0, col);
      if (c === 's') {
        ctx.fillStyle = 'rgba(120,90,30,0.25)';
        for (let k = 0; k < 4; k++) { const [sx, sy] = this.proj(x + 0.2 + ((k * 37) % 6) / 10, y + 0.2 + ((k * 53) % 6) / 10); ctx.beginPath(); ctx.arc(sx, sy, this.scale * 0.03, 0, TAU); ctx.fill(); }
      } else if (c === 'i') {
        ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 1;
        const [a0, a1] = this.proj(x + 0.15, y + 0.75), [b0, b1] = this.proj(x + 0.6, y + 0.3);
        ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
      } else if (th.floor[0] !== th.snow && ((x * 7 + y * 13) % 5 === 0)) {
        ctx.fillStyle = 'rgba(0,0,0,0.07)';
        const [sx, sy] = this.proj(x + 0.5, y + 0.5); ctx.beginPath(); ctx.arc(sx, sy, this.scale * 0.05, 0, TAU); ctx.fill();
      }
    }
    // Abschlag-Matte
    const t = this.level.tee;
    this.isoEllipse(ctx, t.x, t.y, 0, 0.5, 'rgba(0,0,0,0.18)');
    this.isoEllipse(ctx, t.x, t.y, 0.01, 0.42, th.accent);
    this.isoEllipse(ctx, t.x, t.y, 0.02, 0.3, shade(th.accent, 0.8));
  }

  /* Klippenwände einer erhöhten Kachel zu tieferen oder leeren Nachbarn */
  drawCliffs(ctx, x, y) {
    const lv = this.level, th = this.theme, e = 0.002;
    const isFloor = (tx, ty) => lv.isFloorChar(lv.charAt(tx + 0.5, ty + 0.5)) && lv.charAt(tx + 0.5, ty + 0.5) !== 'x';
    const edges = [[[x, y], [x + 1, y], 0, -1], [[x + 1, y], [x + 1, y + 1], 1, 0], [[x + 1, y + 1], [x, y + 1], 0, 1], [[x, y + 1], [x, y], -1, 0]];
    for (const [a, b, nx, ny] of edges) {
      if (nx * this.cam.sin + ny * this.cam.cos <= 0.001) continue; // von der Kamera abgewandt
      const nb = isFloor(x + nx, y + ny);
      const ins = p => [p[0] + (x + 0.5 - p[0]) * e * 8, p[1] + (y + 0.5 - p[1]) * e * 8];
      const ia = ins(a), ib = ins(b);
      const za = lv.heightAt(ia[0], ia[1]), zb = lv.heightAt(ib[0], ib[1]);
      let zlA = 0, zlB = 0;
      if (nb) { const oa = [a[0] + nx * e * 8, a[1] + ny * e * 8], ob = [b[0] + nx * e * 8, b[1] + ny * e * 8]; zlA = lv.heightAt(oa[0], oa[1]); zlB = lv.heightAt(ob[0], ob[1]); }
      if (za - zlA < 0.02 && zb - zlB < 0.02) continue;
      const light = 0.62 + 0.38 * (0.5 + 0.5 * (nx * 0.85 - ny * 0.53));
      const p0 = this.projRaw(a[0], a[1], zlA), p1 = this.projRaw(b[0], b[1], zlB), p2 = this.projRaw(b[0], b[1], zb), p3 = this.projRaw(a[0], a[1], za);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath();
      ctx.fillStyle = shade(th.cliff || th.groundEdge, light); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.8; ctx.stroke();
      // Fugen
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
      const n = Math.max(1, Math.round((Math.max(za - zlA, zb - zlB)) / 0.25));
      for (let k = 1; k < n; k++) { const u = k / n; const q0 = this.projRaw(a[0], a[1], zlA + (za - zlA) * u), q1 = this.projRaw(b[0], b[1], zlB + (zb - zlB) * u); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
    }
  }

  /* ---------- Frame ---------- */
  drawFrame(state) {
    const ctx = this.ctx, th = this.theme, lv = this.level, t = state.t;
    if (!lv) return;
    // Himmel
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
    if (th.stars) this.drawStars(ctx, t);
    if (th.clouds) this.drawSkyClouds(ctx, t);
    if (th.gears) this.drawSkyGears(ctx, t);
    if (th.planks) this.drawPlanks(ctx, t);
    this.seaT = t;
    if (th.rays) this.drawRays(ctx, t);
    if (th.sea) this.drawSea(ctx, t);
    if (th.volcano) this.drawVolcano(ctx, t);
    if (th.dunes) this.drawDunes(ctx, t);

    this.drawFloor(ctx);

    // animierte Flüssigkeiten
    for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
      const c = lv.tiles[y][x];
      if (c !== 'w' && c !== 'l') continue;
      const [lsx, lsy] = this.proj(x + 0.5, y + 0.5);
      if (!this.onScreen(lsx, lsy, this.scale * 1.5)) continue;
      const poly = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
      const base = c === 'w' ? th.water : th.lava;
      const pulse = 0.5 + 0.5 * Math.sin(t * (c === 'w' ? 2 : 1.3) + x * 1.7 + y * 2.3);
      this.fillPoly(ctx, poly, -0.12, shade(base, 0.85 + 0.2 * pulse));
      ctx.strokeStyle = c === 'w' ? 'rgba(255,255,255,0.5)' : 'rgba(255,240,150,0.7)'; ctx.lineWidth = 1.2;
      const off = ((t * 0.4 + x * 0.3) % 1);
      const [a0, a1] = this.proj(x + 0.15, y + 0.2 + off * 0.6, -0.12), [b0, b1] = this.proj(x + 0.55, y + 0.2 + off * 0.6, -0.12);
      ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
    }

    // Boden-Overlays
    for (const ob of lv.obstacles) this.drawObstacleFloor(ctx, ob, t);
    if (lv.cup) this.drawCupHole(ctx);
    if (state.aim) this.drawAim(ctx, state.ball, state.aim);

    // sortierte 3D-Objekte
    const items = [];
    const wall = th.wall;
    for (const wr of lv.walls) {
      const poly = [[wr.x, wr.y], [wr.x + wr.w, wr.y], [wr.x + wr.w, wr.y + wr.h], [wr.x, wr.y + wr.h]];
      items.push({ x: wr.x + wr.w / 2, y: wr.y + wr.h / 2, draw: () => this.drawWall(ctx, poly, wall) });
    }
    for (const b of lv.blocks) {
      const poly = [[b.x, b.y], [b.x + 1, b.y], [b.x + 1, b.y + 1], [b.x, b.y + 1]];
      items.push({ x: b.x + 0.5, y: b.y + 0.5, draw: () => this.prism(ctx, poly, 0, 1.0, th.block.top, th.block.side, { outline: shade(th.block.side, 0.7) }) });
    }
    for (const d of lv.decor) items.push({ x: d.x, y: d.y, draw: () => this.drawDecor(ctx, d, t) });
    for (const ob of lv.obstacles) this.pushObstacle(items, ctx, ob, t);
    if (lv.cup) items.push({ x: lv.cup.x, y: lv.cup.y, bias: 0.01, draw: () => this.drawFlag(ctx, t) });
    // Der Ball wird zum Schluss gezeichnet, damit er nie hinter Bäumen oder Mauern verschwindet
    for (const it of items) { it.k = this.depth(it.x, it.y) + (it.bias || 0); const p = this.proj(it.x, it.y); it.sx = p[0]; it.sy = p[1]; }
    items.sort((a, b) => a.k - b.k);
    const b = state.ball, bp = b ? this.proj(b.x, b.y, 0) : null, bk = b ? this.depth(b.x, b.y) : 0;
    const cullM = this.scale * 3.5, fadeW = this.scale * 2.2, fadeH = this.scale * 3.2;
    for (const it of items) {
      if (!this.onScreen(it.sx, it.sy, cullM)) continue;
      // Objekte, die vor dem Ball stehen und ihn verdecken würden, fast durchsichtig zeichnen
      const fade = bp && !it.ball && !it.noFade && it.k > bk + 0.3 && Math.abs(it.sx - bp[0]) < fadeW && it.sy > bp[1] - this.scale * 0.4 && it.sy < bp[1] + fadeH;
      if (fade) ctx.globalAlpha = 0.22;
      it.draw();
      if (fade) ctx.globalAlpha = 1;
    }
    if (b) { this.flat = !!(b.rider && b.rider.type === 'ferry' && b.rider.flat); this.drawBall(ctx, b); this.flat = false; }

    // Atmosphäre (dezent, über der Szene, unter den Effektpartikeln)
    this.drawAtmosphere(ctx, lv.def.atmo || th.atmo || 'none', t);

    // Partikel
    for (const p of state.particles) {
      const [sx, sy] = this.proj(p.x, p.y, p.z);
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(sx, sy, p.size * this.scale, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  /* Stimmungseffekte in Bildschirmkoordinaten: Nebel, Glühwürmchen, Funken, Schnee, Blütenstaub */
  drawAtmosphere(ctx, kind, t) {
    if (kind === 'none') return;
    const w = this.w, h = this.h;
    const hash = (i, k) => (Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1 + (Math.sin(i * 127.1 + k * 311.7) * 43758.5453 < 0 ? 1 : 0);
    if (kind === 'fog' || kind === 'mist') {
      const n = kind === 'fog' ? 10 : 6, a = kind === 'fog' ? 0.13 : 0.08;
      for (let i = 0; i < n; i++) {
        const sp = 8 + hash(i, 1) * 10, x = ((hash(i, 2) * (w + 600) + t * sp) % (w + 600)) - 300;
        const y = h * (0.35 + hash(i, 3) * 0.6) + Math.sin(t * 0.3 + i) * 12;
        const rx = w * (0.25 + hash(i, 4) * 0.35), ry = h * (0.04 + hash(i, 5) * 0.05);
        const g = ctx.createRadialGradient(x, y, 0, x, y, rx);
        g.addColorStop(0, `rgba(225,235,240,${a})`); g.addColorStop(1, 'rgba(225,235,240,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(x, y, rx, ry, 0, 0, TAU); ctx.fill();
      }
    } else if (kind === 'fireflies' || kind === 'spores') {
      const col = kind === 'fireflies' ? '255,240,150' : '230,180,255', n = 28;
      for (let i = 0; i < n; i++) {
        const x = (hash(i, 1) * w + Math.sin(t * 0.4 + i) * 30) % w, y = (hash(i, 2) * h + Math.cos(t * 0.3 + i * 2) * 20 + (kind === 'spores' ? (t * 6 + i * 40) % h : 0)) % h;
        const a = 0.25 + 0.55 * Math.abs(Math.sin(t * 1.5 + i * 1.7));
        ctx.fillStyle = `rgba(${col},${a * 0.25})`; ctx.beginPath(); ctx.arc(x, y, 6, 0, TAU); ctx.fill();
        ctx.fillStyle = `rgba(${col},${a})`; ctx.beginPath(); ctx.arc(x, y, 1.8, 0, TAU); ctx.fill();
      }
    } else if (kind === 'embers') {
      for (let i = 0; i < 26; i++) {
        const life = ((t * (0.12 + hash(i, 1) * 0.1) + hash(i, 2)) % 1);
        const x = hash(i, 3) * w + Math.sin(t * 0.8 + i) * 25, y = h - life * h * 0.9;
        ctx.fillStyle = `rgba(255,${120 + hash(i, 4) * 80 | 0},40,${(1 - life) * 0.7})`;
        ctx.beginPath(); ctx.arc(x, y, 1.5 + hash(i, 5) * 1.5, 0, TAU); ctx.fill();
      }
    } else if (kind === 'snow') {
      for (let i = 0; i < 60; i++) {
        const sp = 18 + hash(i, 1) * 22, x = (hash(i, 2) * w + Math.sin(t * 0.7 + i) * 18 + t * 6) % w, y = (hash(i, 3) * h + t * sp) % h;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + hash(i, 4) * 0.45})`; ctx.beginPath(); ctx.arc(x, y, 1.2 + hash(i, 5) * 1.8, 0, TAU); ctx.fill();
      }
    } else if (kind === 'sparks') {
      for (let i = 0; i < 18; i++) {
        const life = ((t * (0.08 + hash(i, 1) * 0.08) + hash(i, 2)) % 1);
        const x = hash(i, 3) * w + Math.sin(t * 0.6 + i) * 20, y = h - life * h;
        ctx.fillStyle = `rgba(255,${200 + hash(i, 4) * 40 | 0},140,${(1 - life) * 0.6})`;
        ctx.beginPath(); ctx.arc(x, y, 1.2 + hash(i, 5) * 1.2, 0, TAU); ctx.fill();
      }
    } else if (kind === 'bubbles') {
      ctx.lineWidth = 1.2;
      for (let i = 0; i < 30; i++) {
        const life = ((t * (0.06 + hash(i, 1) * 0.06) + hash(i, 2)) % 1);
        const x = hash(i, 3) * w + Math.sin(t * 1.5 + i) * 8, y = h - life * h * 1.1, r = 2 + hash(i, 4) * 4;
        ctx.strokeStyle = `rgba(220,245,255,${0.6 * (1 - life)})`; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.stroke();
        ctx.fillStyle = `rgba(255,255,255,${0.5 * (1 - life)})`; ctx.beginPath(); ctx.arc(x - r * 0.3, y - r * 0.3, r * 0.3, 0, TAU); ctx.fill();
      }
    } else if (kind === 'ash') {
      for (let i = 0; i < 45; i++) {
        const sp = 8 + hash(i, 1) * 12, x = (hash(i, 2) * w + Math.sin(t * 0.5 + i) * 25 + t * 4) % w, y = (hash(i, 3) * h + t * sp) % h;
        const ember = i % 9 === 0;
        ctx.fillStyle = ember ? `rgba(255,${120 + hash(i, 4) * 60 | 0},40,${0.5 + 0.4 * Math.abs(Math.sin(t * 5 + i))})` : `rgba(190,180,185,${0.25 + hash(i, 4) * 0.35})`;
        ctx.beginPath(); ctx.arc(x, y, 1.2 + hash(i, 5) * 1.6, 0, TAU); ctx.fill();
      }
    } else if (kind === 'sand' || kind === 'spray') {
      const sc = kind === 'spray' ? '235,245,255' : '255,225,170';
      ctx.lineCap = 'round'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 26; i++) {
        const sp = 60 + hash(i, 1) * 80, x = (hash(i, 2) * w + t * sp) % (w + 60) - 30, y = h * (0.3 + hash(i, 3) * 0.7) + Math.sin(t * 0.8 + i) * 10;
        ctx.strokeStyle = `rgba(${sc},${0.18 + hash(i, 4) * 0.2})`; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 14 + hash(i, 5) * 20, y - 1); ctx.stroke();
      }
    } else if (kind === 'pollen') {
      for (let i = 0; i < 30; i++) {
        const x = (hash(i, 1) * w + t * (6 + hash(i, 2) * 8) + Math.sin(t * 0.5 + i) * 15) % w, y = (hash(i, 3) * h + Math.sin(t * 0.6 + i * 1.3) * 25) % h;
        ctx.fillStyle = `rgba(255,250,200,${0.25 + 0.35 * Math.abs(Math.sin(t + i))})`; ctx.beginPath(); ctx.arc(x, y, 1.5, 0, TAU); ctx.fill();
      }
    }
  }

  drawStars(ctx, t) {
    ctx.fillStyle = '#fff';
    for (let i = 0; i < 70; i++) {
      const x = ((i * 977) % 1000) / 1000 * this.w, y = ((i * 613) % 1000) / 1000 * this.h * 0.6;
      const a = 0.4 + 0.6 * Math.abs(Math.sin(t * 0.8 + i));
      ctx.globalAlpha = a; ctx.beginPath(); ctx.arc(x, y, 1 + (i % 3) * 0.5, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
  /* Zahnrad-Umriss in Bildschirmkoordinaten (Mittelpunkt x,y, Radius r) */
  gearPath(ctx, x, y, r, teeth, angle) {
    const inner = r * 0.82, n = teeth * 4;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const k = i % 4, rr = k === 0 || k === 3 ? inner : r;
      const a = angle + (i / n) * TAU + (k === 1 || k === 2 ? 0 : 0);
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.closePath();
  }
  drawSkyGears(ctx, t) {
    const w = this.w, h = this.h;
    const gears = [[0.12, 0.22, 0.17, 12, 0.15], [0.3, 0.08, 0.1, 9, -0.22], [0.82, 0.18, 0.2, 14, -0.12], [0.62, 0.05, 0.09, 8, 0.28], [0.95, 0.55, 0.13, 10, 0.18], [0.05, 0.7, 0.11, 9, -0.2]];
    for (const [gx, gy, gr, teeth, sp] of gears) {
      const r = gr * Math.min(w, h) * 1.4, x = gx * w, y = gy * h;
      ctx.fillStyle = 'rgba(190,140,70,0.13)'; this.gearPath(ctx, x, y, r, teeth, t * sp); ctx.fill();
      ctx.fillStyle = 'rgba(20,16,12,0.5)'; ctx.beginPath(); ctx.arc(x, y, r * 0.18, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(190,140,70,0.16)'; ctx.lineWidth = Math.max(2, r * 0.06);
      for (let i = 0; i < 5; i++) { const a = t * sp + (i * TAU) / 5; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2); ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72); ctx.stroke(); }
    }
  }
  /* Küste: Horizont, ferne Segel und Möwen */
  drawSea(ctx, t) {
    const w = this.w, h = this.h, hz = h * 0.42;
    const g = ctx.createLinearGradient(0, hz, 0, h);
    g.addColorStop(0, '#3a8fb8'); g.addColorStop(1, '#1f5f85'); ctx.fillStyle = g; ctx.fillRect(0, hz, w, h - hz);
    ctx.fillStyle = 'rgba(255,220,170,0.35)'; ctx.fillRect(0, hz, w, 2);
    for (let i = 0; i < 4; i++) { // ferne Segel
      const x = ((i * 0.27 + t * 0.006 * (i % 2 ? 1 : -1)) % 1 + 1) % 1 * w, y = hz + 6 + i * 3, s = 10 + i * 3;
      ctx.fillStyle = 'rgba(30,45,70,0.7)'; ctx.fillRect(x - s * 0.6, y - 2, s * 1.2, 3);
      ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x, y - s * 1.6); ctx.lineTo(x + s * 0.7, y - 3); ctx.closePath(); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 6; i++) { // Möwen
      const x = ((i * 0.19 + t * 0.02) % 1) * w, y = h * (0.1 + (i * 0.07) % 0.25) + Math.sin(t + i) * 6, s = 7 + (i % 3) * 3, fl = Math.sin(t * 5 + i) * s * 0.5;
      ctx.beginPath(); ctx.moveTo(x - s, y + fl); ctx.quadraticCurveTo(x - s * 0.4, y - fl * 0.3, x, y); ctx.quadraticCurveTo(x + s * 0.4, y - fl * 0.3, x + s, y + fl); ctx.stroke();
    }
  }
  /* Meeresgrund: Lichtstrahlen von oben und ein paar Fische im Hintergrund */
  drawRays(ctx, t) {
    const w = this.w, h = this.h;
    for (let i = 0; i < 7; i++) {
      const x = w * (0.1 + i * 0.13) + Math.sin(t * 0.3 + i) * w * 0.03, sw = w * 0.05;
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.8);
      g.addColorStop(0, `rgba(180,230,255,${0.14 + 0.06 * Math.sin(t * 0.7 + i * 2)})`); g.addColorStop(1, 'rgba(180,230,255,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - sw * 0.4, 0); ctx.lineTo(x + sw * 0.4, 0); ctx.lineTo(x + sw * 1.6 + w * 0.04, h * 0.8); ctx.lineTo(x - sw * 1.6 + w * 0.04, h * 0.8); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = 'rgba(10,40,70,0.55)';
    for (let i = 0; i < 6; i++) {
      const dir = i % 2 ? 1 : -1, sp = 18 + i * 6, x = ((i * 173 + t * sp * dir) % (w + 80) + w + 80) % (w + 80) - 40, y = h * (0.08 + (i * 0.11) % 0.45) + Math.sin(t * 1.2 + i) * 6, s = 10 + (i % 3) * 4;
      ctx.beginPath(); ctx.ellipse(x, y, s, s * 0.45, 0, 0, TAU); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x - dir * s * 0.8, y); ctx.lineTo(x - dir * s * 1.5, y - s * 0.5); ctx.lineTo(x - dir * s * 1.5, y + s * 0.5); ctx.closePath(); ctx.fill();
    }
  }
  /* Vulkan am Horizont mit glühendem Krater und Rauchsäule */
  drawVolcano(ctx, t) {
    const w = this.w, h = this.h, vx = w * 0.68, top = h * 0.14, base = h * 0.62;
    let g = ctx.createRadialGradient(vx, top, 0, vx, top, w * 0.3);
    g.addColorStop(0, 'rgba(255,120,40,0.45)'); g.addColorStop(1, 'rgba(255,120,40,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#1c1014';
    ctx.beginPath(); ctx.moveTo(vx - w * 0.45, base); ctx.lineTo(vx - w * 0.05, top); ctx.lineTo(vx + w * 0.05, top); ctx.lineTo(vx + w * 0.42, base); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2a181c'; ctx.beginPath(); ctx.moveTo(vx - w * 0.05, top); ctx.lineTo(vx + w * 0.05, top); ctx.lineTo(vx + w * 0.42, base); ctx.lineTo(vx + w * 0.05, base); ctx.closePath(); ctx.fill();
    // Kraterglut und Lavarinnen
    const gl = 0.8 + 0.2 * Math.sin(t * 2.5);
    ctx.fillStyle = `rgba(255,140,40,${0.9 * gl})`; ctx.beginPath(); ctx.ellipse(vx, top, w * 0.05, h * 0.012, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,110,30,${0.55 * gl})`; ctx.lineWidth = Math.max(1.5, w * 0.0025); ctx.lineCap = 'round';
    for (const [dx, len, wob] of [[-0.015, 0.12, 1], [0.02, 0.16, -1], [0.0, 0.09, 1]]) {
      ctx.beginPath(); ctx.moveTo(vx + w * dx, top + h * 0.008);
      for (let k = 1; k <= 6; k++) { const u = k / 6; ctx.lineTo(vx + w * dx * (1 + u * 5) + Math.sin(u * 9 + k) * w * 0.006 * wob, top + h * len * u); }
      ctx.stroke();
    }
    // Rauch
    for (let i = 0; i < 7; i++) {
      const u = (t * 0.12 + i * 0.14) % 1;
      ctx.fillStyle = `rgba(70,50,55,${0.5 * (1 - u)})`; ctx.beginPath(); ctx.arc(vx + Math.sin(u * 5 + i) * w * 0.03 + u * w * 0.08, top - u * h * 0.3, w * (0.015 + u * 0.05), 0, TAU); ctx.fill();
    }
    // ferne Hügel
    ctx.fillStyle = '#120a0c'; ctx.beginPath(); ctx.moveTo(0, h * 0.66);
    for (const [x, y] of [[0.08, 0.55], [0.2, 0.6], [0.32, 0.52], [0.45, 0.6], [0.9, 0.58], [1, 0.5]]) ctx.lineTo(x * w, y * h);
    ctx.lineTo(w, h * 0.66); ctx.closePath(); ctx.fill();
  }
  /* Wüste: große Sonne und Dünen am Horizont */
  drawDunes(ctx, t) {
    const w = this.w, h = this.h, sx = w * 0.72, sy = h * 0.2, sr = h * 0.08;
    const g = ctx.createRadialGradient(sx, sy, sr * 0.5, sx, sy, sr * 4);
    g.addColorStop(0, 'rgba(255,240,190,0.7)'); g.addColorStop(1, 'rgba(255,240,190,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff2c4'; ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
    const cols = ['#e6a860', '#d18c48', '#b8743a'];
    for (let L = 0; L < 3; L++) {
      ctx.fillStyle = cols[L]; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, h * (0.36 + L * 0.09) + Math.sin(x * 0.004 + L * 2 + t * 0.02) * h * 0.04 + Math.sin(x * 0.011 + L) * h * 0.015);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
  }
  /* Innenraum: Bretterwand mit Kerzen- und Hexenschein */
  drawPlanks(ctx, t) {
    const w = this.w, h = this.h, bw = 56;
    for (let x = 0, i = 0; x < w; x += bw, i++) {
      ctx.fillStyle = i % 2 ? 'rgba(0,0,0,0.14)' : 'rgba(255,220,160,0.04)'; ctx.fillRect(x, 0, bw, h);
      ctx.fillStyle = 'rgba(0,0,0,0.4)'; ctx.fillRect(x, 0, 2, h);
    }
    const gl = 0.85 + 0.15 * Math.sin(t * 3);
    let g = ctx.createRadialGradient(w * 0.82, h * 0.2, 0, w * 0.82, h * 0.2, w * 0.35);
    g.addColorStop(0, `rgba(255,190,90,${0.2 * gl})`); g.addColorStop(1, 'rgba(255,190,90,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    g = ctx.createRadialGradient(w * 0.15, h * 0.75, 0, w * 0.15, h * 0.75, w * 0.3);
    g.addColorStop(0, 'rgba(120,255,90,0.12)'); g.addColorStop(1, 'rgba(120,255,90,0)'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
  }
  drawSkyClouds(ctx, t) {
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    for (let i = 0; i < 9; i++) {
      const x = ((((i * 331) % 1000) / 1000) * (this.w + 300) + t * (6 + i * 2)) % (this.w + 300) - 150;
      const y = (((i * 577) % 1000) / 1000) * this.h * 0.9;
      const s = 30 + (i % 4) * 14;
      ctx.beginPath(); ctx.ellipse(x, y, s * 1.6, s * 0.55, 0, 0, TAU); ctx.ellipse(x - s * 0.6, y + s * 0.1, s * 0.9, s * 0.45, 0, 0, TAU); ctx.ellipse(x + s * 0.7, y + s * 0.05, s, s * 0.5, 0, 0, TAU); ctx.fill();
    }
  }

  drawWall(ctx, poly, wall) {
    if (wall.style === 'hedge') {
      this.prism(ctx, poly, 0, 0.55, wall.top, wall.side);
      // Blätter-Knubbel auf der Oberseite
      const cx = (poly[0][0] + poly[2][0]) / 2, cy = (poly[0][1] + poly[2][1]) / 2;
      const w = poly[2][0] - poly[0][0], h = poly[2][1] - poly[0][1];
      const along = w > h, len = Math.max(w, h), n = Math.max(1, Math.round(len / 0.7));
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n;
        const px = along ? poly[0][0] + u * w : cx, py = along ? cy : poly[0][1] + u * h;
        this.isoEllipse(ctx, px, py, 0.55, 0.22, shade(wall.top, 1.08 - (i % 2) * 0.12));
      }
    } else if (wall.style === 'ice') {
      ctx.globalAlpha = 0.85; this.prism(ctx, poly, 0, 0.6, wall.top, wall.side); ctx.globalAlpha = 1;
    } else if (wall.style === 'brass') {
      this.prism(ctx, poly, 0, 0.55, wall.top, wall.side, { outline: shade(wall.side, 0.7) });
      // Nieten auf der Oberseite
      const w = poly[2][0] - poly[0][0], h = poly[2][1] - poly[0][1], along = w > h, len = Math.max(w, h), n = Math.max(1, Math.round(len / 0.5));
      ctx.fillStyle = shade(wall.side, 0.9);
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, px = along ? poly[0][0] + u * w : (poly[0][0] + poly[2][0]) / 2, py = along ? (poly[0][1] + poly[2][1]) / 2 : poly[0][1] + u * h;
        const [sx, sy] = this.proj(px, py, 0.56); ctx.beginPath(); ctx.arc(sx, sy, Math.max(1, this.scale * 0.035), 0, TAU); ctx.fill();
      }
    } else if (wall.style === 'gold') {
      this.prism(ctx, poly, 0, 0.5, wall.top, wall.side, { outline: shade(wall.side, 0.8) });
    } else {
      this.prism(ctx, poly, 0, 0.6, wall.top, wall.side, { outline: shade(wall.side, 0.75) });
    }
  }

  drawCupHole(ctx) {
    const c = this.level.cup;
    this.isoEllipse(ctx, c.x, c.y, 0.005, 0.5, 'rgba(255,255,255,0.35)');
    this.isoEllipse(ctx, c.x, c.y, 0.01, 0.42, '#0e0b16');
    this.isoEllipse(ctx, c.x, c.y - 0.05, 0.012, 0.32, '#241c35');
  }
  drawFlag(ctx, t) {
    const c = this.level.cup, th = this.theme, s = this.scale;
    const [bx, by] = this.proj(c.x, c.y, 0), [tx, ty] = this.proj(c.x, c.y, 1.7);
    ctx.strokeStyle = '#f4efe6'; ctx.lineWidth = Math.max(1.5, s * 0.06);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    const wave = Math.sin(t * 4) * 0.08;
    ctx.fillStyle = th.flag;
    ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + s * 0.75, ty + s * (0.28 + wave)); ctx.lineTo(tx, ty + s * 0.55); ctx.closePath(); ctx.fill();
    ctx.fillStyle = th.accent; ctx.beginPath(); ctx.arc(tx, ty, s * 0.07, 0, TAU); ctx.fill();
  }
  drawBall(ctx, b) {
    const s = this.scale;
    const br = b.r || BALL_R;
    let r = br * s, z = b.z + br;
    if (b.sunk) { // in das Loch fallen: kleiner werden, absinken, dann weg
      const p = Math.min(1, b.sinkT / 0.35);
      if (p >= 1) return;
      r *= 1 - p * 0.8; z = 0.3 - p * 0.6;
    } else this.isoEllipse(ctx, b.x, b.y, 0, br * Math.max(0.15, 1 - b.z * 0.2), 'rgba(0,0,0,0.3)');
    const [sx, sy] = this.proj(b.x, b.y, z);
    const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, b.color); g.addColorStop(1, shade(b.color, 0.55));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
  }
  drawAim(ctx, ball, aim) {
    const { dx, dy, power } = aim;
    if (power <= 0.01) return;
    const len = 1.2 + power * 6.5;
    const col = power < 0.5 ? `rgb(${Math.round(120 + power * 2 * 135)},230,90)` : `rgb(255,${Math.round(230 - (power - 0.5) * 2 * 160)},70)`;
    ctx.fillStyle = col; ctx.strokeStyle = col;
    const step = 0.45;
    for (let d = 0.5; d < len; d += step) {
      const [sx, sy] = this.proj(ball.x + dx * d, ball.y + dy * d, 0.02);
      ctx.globalAlpha = 0.9 - (d / len) * 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, this.scale * 0.08, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pfeilspitze
    const [hx, hy] = this.proj(ball.x + dx * len, ball.y + dy * len, 0.02);
    const [lx, ly] = this.proj(ball.x + dx * (len - 0.5) - dy * 0.3, ball.y + dy * (len - 0.5) + dx * 0.3, 0.02);
    const [rx, ry] = this.proj(ball.x + dx * (len - 0.5) + dy * 0.3, ball.y + dy * (len - 0.5) - dx * 0.3, 0.02);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(lx, ly); ctx.lineTo(rx, ry); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    const [bx, by] = this.proj(ball.x, ball.y, 0.01);
    ctx.beginPath(); ctx.ellipse(bx, by, 0.5 * this.scale, 0.5 * this.scale * this.cam.tilt, 0, 0, TAU); ctx.stroke();
  }

  /* ---------- Hindernisse ---------- */
  drawObstacleFloor(ctx, ob, t) {
    const s = this.scale;
    if (ob.type === 'boost' || (ob.type === 'field' && ob.style === 'wind')) { this.drawWind(ctx, ob, t); return; }
    if (ob.type === 'field') {
      const poly = [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h]];
      const isBoost = ob.type === 'boost';
      const dx = isBoost ? ob.dx : ob.fx, dy = isBoost ? ob.dy : ob.fy;
      const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const slope = ob.style === 'slope';
      this.fillPoly(ctx, poly, 0.005, isBoost ? 'rgba(255,220,90,0.28)' : slope ? 'rgba(90,60,20,0.22)' : 'rgba(200,230,255,0.22)', false);
      ctx.strokeStyle = isBoost ? 'rgba(255,240,160,0.9)' : slope ? 'rgba(80,50,20,0.75)' : 'rgba(230,245,255,0.7)'; ctx.lineWidth = Math.max(1.5, s * 0.06);
      const cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2;
      const span = Math.abs(ux) > Math.abs(uy) ? ob.w : ob.h;
      const n = Math.max(2, Math.round(span / 0.9));
      const speed = isBoost ? 2.2 : 1.2;
      for (let i = 0; i < n; i++) {
        const u = ((i + (t * speed) % 1) / n) - 0.5;
        const px = cx + ux * u * span, py = cy + uy * u * span;
        // Chevron quer zur Richtung
        const wdt = (Math.abs(ux) > Math.abs(uy) ? ob.h : ob.w) * 0.3;
        const [a0, a1] = this.proj(px - ux * 0.25 - uy * wdt, py - uy * 0.25 + ux * wdt, 0.01);
        const [b0, b1] = this.proj(px + ux * 0.2, py + uy * 0.2, 0.01);
        const [c0, c1] = this.proj(px - ux * 0.25 + uy * wdt, py - uy * 0.25 - ux * wdt, 0.01);
        ctx.globalAlpha = 0.35 + 0.65 * (1 - Math.abs(u) * 2);
        ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.lineTo(c0, c1); ctx.stroke();
      }
      ctx.globalAlpha = 1;
    } else if (ob.type === 'portal') {
      const pulse = 0.85 + 0.15 * Math.sin(t * 3 + ob.x);
      this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.r * 1.15 * pulse, rgba(ob.color, 0.25));
      this.isoEllipse(ctx, ob.x, ob.y, 0.006, ob.r * pulse, ob.entrance ? rgba(ob.color, 0.75) : rgba(ob.color, 0.4));
      this.isoEllipse(ctx, ob.x, ob.y, 0.008, ob.r * 0.55, ob.entrance ? '#100a1e' : rgba(ob.color, 0.2));
      const [sx, sy] = this.proj(ob.x, ob.y, 0.01);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 3; i++) {
        const a = t * 2 + (i * TAU) / 3;
        ctx.beginPath(); ctx.ellipse(sx, sy, ob.r * 0.8 * s, ob.r * 0.8 * s * this.cam.tilt, 0, a, a + 1.2); ctx.stroke();
      }
    } else if (ob.type === 'rail') {
      ctx.strokeStyle = 'rgba(40,30,25,0.8)'; ctx.lineWidth = Math.max(1, s * 0.05);
      const horiz = ob.x0 !== undefined;
      for (const off of [-0.25, 0.25]) {
        const [a0, a1] = horiz ? this.proj(ob.x0, ob.y + off, 0.01) : this.proj(ob.x + off, ob.y0, 0.01);
        const [b0, b1] = horiz ? this.proj(ob.x1, ob.y + off, 0.01) : this.proj(ob.x + off, ob.y1, 0.01);
        ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
      }
      const from = horiz ? ob.x0 : ob.y0, to = horiz ? ob.x1 : ob.y1;
      for (let k = from + 0.3; k < to; k += 0.6) {
        const [a0, a1] = horiz ? this.proj(k, ob.y - 0.35, 0.01) : this.proj(ob.x - 0.35, k, 0.01);
        const [b0, b1] = horiz ? this.proj(k, ob.y + 0.35, 0.01) : this.proj(ob.x + 0.35, k, 0.01);
        ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
      }
    } else if (ob.type === 'ferry') {
      // Stationen markieren
      for (const [px, py] of [[ob.x0, ob.y0], [ob.x1, ob.y1]]) {
        this.isoEllipse(ctx, px, py, 0.004, 0.75, 'rgba(255,200,90,0.28)');
        this.isoEllipse(ctx, px, py, 0.005, 0.6, 'rgba(0,0,0,0.15)');
      }
    } else if (ob.type === 'bumper') {
      this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.r + 0.12, 'rgba(255,255,255,0.22)');
      this.isoEllipse(ctx, ob.x, ob.y, 0.005, ob.r, 'rgba(0,0,0,0.18)');
    } else if (ob.type === 'rotor') {
      this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.len + 0.2, 'rgba(0,0,0,0.08)');
    } else if (ob.type === 'gate') {
      const poly = [[ob.x - ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y + ob.h / 2], [ob.x - ob.w / 2, ob.y + ob.h / 2]];
      this.fillPoly(ctx, poly, 0.005, ob.closed ? 'rgba(255,80,80,0.35)' : 'rgba(120,255,120,0.25)', false);
    } else if (ob.type === 'windmill') {
      const ax = ob.axis === 'x', g = ob.gap / 2, dd = ob.depth / 2 + 0.35;
      const poly = ax ? [[ob.x - g, ob.y - dd], [ob.x + g, ob.y - dd], [ob.x + g, ob.y + dd], [ob.x - g, ob.y + dd]] : [[ob.x - dd, ob.y - g], [ob.x + dd, ob.y - g], [ob.x + dd, ob.y + g], [ob.x - dd, ob.y + g]];
      this.fillPoly(ctx, poly, 0.005, ob.blocked ? 'rgba(255,80,70,0.4)' : 'rgba(120,255,140,0.3)', false);
    } else if (ob.type === 'switch') {
      const active = ob.activeUntil > t, left = active ? ob.activeUntil - t : 0;
      const pulse = active ? 0.85 + 0.15 * Math.sin(t * 6) : 1;
      this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.r + 0.2, 'rgba(40,30,20,0.45)');
      this.isoEllipse(ctx, ob.x, ob.y, 0.006, ob.r * pulse, active ? 'rgba(120,255,160,0.9)' : 'rgba(150,140,120,0.9)');
      this.isoEllipse(ctx, ob.x, ob.y, 0.008, ob.r * 0.55 * pulse, active ? 'rgba(220,255,230,0.95)' : 'rgba(90,80,65,0.9)');
      const [sx, sy] = this.proj(ob.x, ob.y, 0.01);
      ctx.strokeStyle = active ? '#1c5a2a' : '#e8dcc0'; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); ctx.moveTo(sx - s * 0.15, sy + s * 0.08); ctx.lineTo(sx, sy - s * 0.12); ctx.lineTo(sx + s * 0.15, sy + s * 0.08);
      ctx.moveTo(sx - s * 0.08, sy + s * 0.02); ctx.lineTo(sx + s * 0.08, sy + s * 0.02); ctx.stroke();
      if (active) { // Restzeit als Ring
        const frac = Math.min(1, left / ob.duration);
        ctx.strokeStyle = 'rgba(160,255,190,0.9)'; ctx.lineWidth = Math.max(2, s * 0.08);
        ctx.beginPath(); ctx.ellipse(sx, sy, (ob.r + 0.12) * s, (ob.r + 0.12) * s * this.cam.tilt, 0, -Math.PI / 2, -Math.PI / 2 + TAU * frac); ctx.stroke();
      }
    } else if (ob.type === 'potion') {
      const pulse = 0.9 + 0.1 * Math.sin(t * 4 + ob.x);
      this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.r * 1.3 * pulse, 'rgba(190,90,255,0.22)');
      this.isoEllipse(ctx, ob.x, ob.y, 0.006, ob.r * 0.8, 'rgba(120,40,180,0.35)');
    } else if (ob.type === 'turntable') {
      const th = this.theme;
      this.isoEllipse(ctx, ob.x, ob.y, 0.003, ob.r + 0.25, 'rgba(30,25,40,0.5)');
      const [cx, cy] = this.proj(ob.x, ob.y, 0.008);
      ctx.save(); ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt);
      ctx.fillStyle = shade(th.rotor.side, 0.8); this.gearPath(ctx, 0, s * 0.1 / this.cam.tilt, (ob.r + 0.12) * s, 16, ob.angle); ctx.fill();
      ctx.fillStyle = shade(th.rotor.side, 1.15); this.gearPath(ctx, 0, 0, (ob.r + 0.12) * s, 16, ob.angle); ctx.fill();
      ctx.restore();
      this.isoEllipse(ctx, ob.x, ob.y, 0.006, ob.r * 0.9, th.rotor.top);
      ctx.strokeStyle = 'rgba(60,45,40,0.75)'; ctx.lineWidth = Math.max(1.5, s * 0.07);
      for (let i = 0; i < 6; i++) {
        const a = ob.angle + (i * TAU) / 6;
        const [ex, ey] = this.proj(ob.x + Math.cos(a) * ob.r * 0.9, ob.y + Math.sin(a) * ob.r * 0.9, 0.008);
        ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(ex, ey); ctx.stroke();
      }
      ctx.beginPath(); ctx.ellipse(cx, cy, ob.r * 0.9 * s, ob.r * 0.9 * s * this.cam.tilt, 0, 0, TAU); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(cx, cy, ob.r * 0.5 * s, ob.r * 0.5 * s * this.cam.tilt, 0, 0, TAU); ctx.stroke();
      this.isoEllipse(ctx, ob.x, ob.y, 0.01, 0.22, '#5a4a40');
      // Auswurfrinne: zwei kurze Schienen am Rand in Richtung exit
      const ex = Math.cos(ob.exitA), ey = Math.sin(ob.exitA), px = -ey, py = ex;
      ctx.strokeStyle = 'rgba(255,230,160,0.9)'; ctx.lineWidth = Math.max(2, s * 0.09);
      for (const side of [-0.32, 0.32]) {
        const a0 = this.proj(ob.x + ex * (ob.r - 0.5) + px * side, ob.y + ey * (ob.r - 0.5) + py * side, 0.014);
        const a1 = this.proj(ob.x + ex * (ob.r + 0.45) + px * side, ob.y + ey * (ob.r + 0.45) + py * side, 0.014);
        ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
      }
      // Laufrichtungs-Pfeile zwischen den Speichen
      ctx.fillStyle = 'rgba(255,230,160,0.85)';
      const d = Math.sign(ob.speed) || 1, rr = ob.r * 0.7;
      for (let i = 0; i < 3; i++) {
        const a = ob.angle + (i * TAU) / 3 + TAU / 12;
        const p1 = this.proj(ob.x + Math.cos(a + 0.28 * d) * rr, ob.y + Math.sin(a + 0.28 * d) * rr, 0.012);
        const p2 = this.proj(ob.x + Math.cos(a) * (rr + 0.16), ob.y + Math.sin(a) * (rr + 0.16), 0.012);
        const p3 = this.proj(ob.x + Math.cos(a) * (rr - 0.16), ob.y + Math.sin(a) * (rr - 0.16), 0.012);
        ctx.beginPath(); ctx.moveTo(p2[0], p2[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath(); ctx.fill();
      }
    } else if (ob.type === 'magnet') {
      const kind = ob.slow ? 'slow' : ob.strength > 0 ? 'attract' : 'repel';
      const col = ob.style === 'coral' ? (kind === 'attract' ? '255,110,110' : kind === 'repel' ? '110,230,130' : '110,180,255') : (kind === 'attract' ? '120,220,255' : '255,120,200');
      this.isoEllipse(ctx, ob.x, ob.y, 0.003, ob.r, `rgba(${col},0.07)`);
      const [cx, cy] = this.proj(ob.x, ob.y, 0.006);
      ctx.lineWidth = Math.max(1, s * 0.05);
      for (let i = 0; i < 4; i++) {
        let u = (t * 0.45 + i / 4) % 1; if (kind === 'attract') u = 1 - u;
        if (kind === 'slow') u = (i + 1) / 5; // Bremsfeld: stehende Ringe, die nur pulsieren
        const rr = ob.core + (ob.r - ob.core) * u;
        ctx.strokeStyle = `rgba(${col},${kind === 'slow' ? 0.2 + 0.15 * Math.sin(t * 2 + i) : 0.45 * (1 - u) + 0.08})`;
        ctx.beginPath(); ctx.ellipse(cx, cy, rr * s, rr * s * this.cam.tilt, 0, 0, TAU); ctx.stroke();
      }
    } else if (ob.type === 'cannon') {
      this.isoEllipse(ctx, ob.x, ob.y, 0.004, 0.75, 'rgba(0,0,0,0.25)');
      // Ziellinie und Landepunkt in aktueller Rohrrichtung
      const dx = Math.cos(ob.angle), dy = Math.sin(ob.angle), R = 0.9 + ob.range;
      ctx.fillStyle = 'rgba(255,210,120,0.55)';
      for (let d = 1.6; d < R - 0.5; d += 0.7) { const [px, py] = this.proj(ob.x + dx * d, ob.y + dy * d, 0.01); ctx.beginPath(); ctx.arc(px, py, s * 0.05, 0, TAU); ctx.fill(); }
      this.isoEllipse(ctx, ob.x + dx * R, ob.y + dy * R, 0.006, 0.45, 'rgba(255,210,120,0.3)');
      this.isoEllipse(ctx, ob.x + dx * R, ob.y + dy * R, 0.008, 0.2, 'rgba(255,240,200,0.55)');
    }
  }

  /* Wind: treibende Schlieren und kleine Böen in Windrichtung, kein Rechteck, keine Pfeile */
  drawWind(ctx, ob, t) {
    const s = this.scale;
    const dx = ob.type === 'boost' ? ob.dx : ob.fx, dy = ob.type === 'boost' ? ob.dy : ob.fy;
    const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L, px = -uy, py = ux;
    const cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2;
    const along = Math.abs(ux) > Math.abs(uy) ? ob.w : ob.h, across = Math.abs(ux) > Math.abs(uy) ? ob.h : ob.w;
    const n = Math.max(4, Math.round(ob.w * ob.h * 1.6)), speed = ob.type === 'boost' ? 0.55 : 0.35;
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const lat = ((i * 0.618) % 1 - 0.5) * (across - 0.4);
      const u = ((t * speed + i * 0.173 + (i % 3) * 0.29) % 1);
      const a = Math.sin(u * Math.PI);
      const bx = cx + ux * ((u - 0.5) * along) + px * lat, by = cy + uy * ((u - 0.5) * along) + py * lat;
      const len = 0.7 + (i % 3) * 0.25, wave = Math.sin(t * 3 + i) * 0.12;
      const p0 = this.proj(bx - ux * len / 2, by - uy * len / 2, 0.05);
      const p1 = this.proj(bx + px * wave, by + py * wave, 0.08);
      const p2 = this.proj(bx + ux * len / 2, by + uy * len / 2, 0.05);
      ctx.strokeStyle = `rgba(255,255,255,${0.75 * a})`; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); ctx.stroke();
      if (i % 4 === 0) { // kleine Böe
        ctx.fillStyle = `rgba(255,255,255,${0.35 * a})`;
        ctx.beginPath(); ctx.arc(p2[0], p2[1], s * 0.08, 0, TAU); ctx.fill();
      }
    }
  }

  pushObstacle(items, ctx, ob, t) {
    const th = this.theme;
    if (ob.type === 'windmill') {
      items.push({ x: ob.x, y: ob.y, bias: 0.4, draw: () => this.drawWindmill(ctx, ob, t) });
    } else if (ob.type === 'ramp') {
      items.push({ x: ob.x + ob.w / 2, y: ob.y + ob.h / 2, draw: () => this.drawRamp(ctx, ob, t) });
    } else if (ob.type === 'wall') {
      const L = Math.hypot(ob.x1 - ob.x0, ob.y1 - ob.y0) || 1, ux = (ob.x1 - ob.x0) / L, uy = (ob.y1 - ob.y0) / L;
      const nx = -uy * ob.t / 2, ny = ux * ob.t / 2, n = Math.max(1, Math.ceil(L / 3));
      for (let i = 0; i < n; i++) {
        const a = i / n, b = (i + 1) / n;
        const p0 = [ob.x0 + (ob.x1 - ob.x0) * a, ob.y0 + (ob.y1 - ob.y0) * a], p1 = [ob.x0 + (ob.x1 - ob.x0) * b, ob.y0 + (ob.y1 - ob.y0) * b];
        const poly = [[p0[0] + nx, p0[1] + ny], [p1[0] + nx, p1[1] + ny], [p1[0] - nx, p1[1] - ny], [p0[0] - nx, p0[1] - ny]];
        items.push({ x: (p0[0] + p1[0]) / 2, y: (p0[1] + p1[1]) / 2, draw: () => this.prism(ctx, poly, 0, ob.h, th.wall.top, th.wall.side, { outline: shade(th.wall.side, 0.75) }) });
      }
    } else if (ob.type === 'mover' || ob.type === 'ferry') {
      items.push({ x: ob.x, y: ob.y, bias: 0.3, draw: () => { this.flat = ob.type === 'ferry' && ob.flat; this.drawMover(ctx, ob, t); this.flat = false; } });
    } else if (ob.type === 'rotor') {
      const hub = this.circlePoly(ob.x, ob.y, ob.hubR, 8);
      items.push({ x: ob.x, y: ob.y, draw: () => {
        this.prism(ctx, hub, 0, ob.height + 0.25, th.rotor.top, th.rotor.side);
        for (let i = 0; i < ob.blades; i++) {
          const a = ob.bladeAngle(i), ca = Math.cos(a), sa = Math.sin(a), tk = ob.thick;
          const p = [[ob.x - sa * tk, ob.y + ca * tk], [ob.x + ca * ob.len - sa * tk, ob.y + sa * ob.len + ca * tk],
            [ob.x + ca * ob.len + sa * tk, ob.y + sa * ob.len - ca * tk], [ob.x + sa * tk, ob.y - ca * tk]];
          if (ob.style === 'crystal') { ctx.globalAlpha = 0.85; this.prism(ctx, p, 0.05, ob.height, '#eaf8ff', '#7fc0f0'); ctx.globalAlpha = 1; }
          else if (ob.style === 'log') { this.prism(ctx, p, 0.15, 0.45, '#a8763f', '#5c4520'); }
          else if (ob.style === 'broom') { this.prism(ctx, p, 0.1, 0.35, '#c9a15a', '#7a5a2a'); const [ex, ey] = this.proj(ob.x + ca * ob.len, ob.y + sa * ob.len, 0.3); ctx.fillStyle = '#e0c070'; ctx.beginPath(); ctx.arc(ex, ey, this.scale * 0.22, 0, TAU); ctx.fill(); }
          else this.prism(ctx, p, 0.05, ob.height, th.rotor.top, th.rotor.side);
        }
      } });
    } else if (ob.type === 'gate') {
      const postH = ob.liftH + ob.barH + 0.2, pw = 0.28;
      const horizontal = ob.w >= ob.h;
      const ends = horizontal ? [[ob.x - ob.w / 2 - pw / 2, ob.y], [ob.x + ob.w / 2 + pw / 2, ob.y]] : [[ob.x, ob.y - ob.h / 2 - pw / 2], [ob.x, ob.y + ob.h / 2 + pw / 2]];
      for (const [px, py] of ends) {
        const poly = [[px - pw / 2, py - pw / 2], [px + pw / 2, py - pw / 2], [px + pw / 2, py + pw / 2], [px - pw / 2, py + pw / 2]];
        items.push({ x: px, y: py, draw: () => this.prism(ctx, poly, 0, postH, th.block.top, th.block.side) });
      }
      const bar = [[ob.x - ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y + ob.h / 2], [ob.x - ob.w / 2, ob.y + ob.h / 2]];
      items.push({ x: ob.x, y: ob.y, bias: 0.05, draw: () => {
        const z0 = ob.lift * ob.liftH;
        this.prism(ctx, bar, z0, ob.barH, '#7a5a3a', '#4a3320', { outline: '#2a1a10' });
        // Gitterstäbe
        ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = Math.max(1, this.scale * 0.05);
        const n = Math.round(ob.w / 0.3);
        for (let i = 1; i < n; i++) {
          const u = ob.x - ob.w / 2 + (i / n) * ob.w;
          const [a0, a1] = this.proj(u, ob.y + ob.h / 2, z0 + 0.05), [b0, b1] = this.proj(u, ob.y + ob.h / 2, z0 + ob.barH - 0.05);
          ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
        }
      } });
    } else if (ob.type === 'bumper') {
      items.push({ x: ob.x, y: ob.y, draw: () => {
        const now = performance.now() / 1000, sq = Math.max(0, 1 - (now - ob.hitAt) * 4);
        const sc = 1 + sq * 0.25;
        if (ob.style === 'crystal') this.spriteCrystal(ctx, ob.x, ob.y, 0, ob.r * 1.6 * sc, '#cfeeff', '#5b90c6');
        else if (ob.style === 'rock') { const [rx, ry] = this.proj(ob.x, ob.y, 0); this.spriteRock(ctx, rx, ry, this.scale * ob.r * 2.1 * sc, '#9a948a', '#5f5a52'); }
        else this.spriteMushroom(ctx, ob.x, ob.y, 0, ob.r * 1.7 * sc, '#e63b5a', true);
      } });
    } else if (ob.type === 'portal') {
      items.push({ x: ob.x, y: ob.y, draw: () => {
        const s = this.scale, [sx, sy] = this.proj(ob.x, ob.y, 0);
        ctx.strokeStyle = rgba(ob.color, ob.entrance ? 0.9 : 0.5); ctx.lineWidth = Math.max(2, s * 0.08);
        ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.9, s * ob.r * 1.0, s * 1.0, 0, 0, TAU); ctx.stroke();
        ctx.fillStyle = rgba(ob.color, 0.18); ctx.fill();
        for (let i = 0; i < 6; i++) {
          const a = t * 3 + i * 1.05, z = 0.2 + (i % 3) * 0.5;
          const [px, py] = this.proj(ob.x + Math.cos(a) * ob.r * 0.7, ob.y + Math.sin(a) * ob.r * 0.7, z);
          ctx.fillStyle = '#ffffff'; ctx.globalAlpha = 0.7; ctx.beginPath(); ctx.arc(px, py, s * 0.05, 0, TAU); ctx.fill();
        }
        ctx.globalAlpha = 1;
      } });
    } else if (ob.type === 'magnet') {
      items.push({ x: ob.x, y: ob.y, draw: () => {
        const kind = ob.slow ? 'slow' : ob.strength > 0 ? 'attract' : 'repel', s = this.scale;
        if (ob.style === 'coral') {
          const cols = kind === 'attract' ? ['#ff6a6a', '#a8202a'] : kind === 'repel' ? ['#6fe07a', '#1f7a30'] : ['#6fb0ff', '#1f4a9a'];
          const [sx, sy] = this.proj(ob.x, ob.y, 0);
          this.spriteCoralBig(ctx, sx, sy, s * ob.core * 4.2, cols[0], cols[1], t);
          return;
        }
        const attract = kind === 'attract';
        this.spriteCrystal(ctx, ob.x, ob.y, 0, ob.core * 3.4, attract ? '#cfeeff' : '#ffd0ee', attract ? '#4a8ad0' : '#c04a90');
        ctx.fillStyle = attract ? 'rgba(200,240,255,0.85)' : 'rgba(255,200,240,0.85)';
        for (let i = 0; i < 5; i++) { // schwebende Funken
          const a = t * 1.5 + i * 1.257, rr = ob.core + 0.35 + 0.15 * Math.sin(t * 3 + i), z = 0.6 + 0.25 * Math.sin(t * 2 + i * 2);
          const [px, py] = this.proj(ob.x + Math.cos(a) * rr, ob.y + Math.sin(a) * rr, z);
          ctx.beginPath(); ctx.arc(px, py, s * 0.05, 0, TAU); ctx.fill();
        }
      } });
    } else if (ob.type === 'potion') {
      items.push({ x: ob.x, y: ob.y, draw: () => this.spritePotion(ctx, ob, t) });
    } else if (ob.type === 'cannon') {
      items.push({ x: ob.x, y: ob.y, bias: 0.2, draw: () => this.drawCannon(ctx, ob, t) });
    } else if (ob.type === 'door') {
      items.push({ x: ob.x, y: ob.y, bias: 0.15, noFade: true, draw: () => { const [sx, sy] = this.proj(ob.x, ob.y + 0.35, 0); this.spriteHut(ctx, sx, sy, this.scale * ob.s, t); } });
    } else if (ob.type === 'cauldron') {
      items.push({ x: ob.x, y: ob.y, draw: () => this.drawCauldronPot(ctx, ob, t) });
    }
  }

  /* Hexentopf: großer Kessel über einem Feuer, grün blubbernder Sud */
  drawCauldronPot(ctx, ob, t) {
    const s = this.scale, r = ob.r, f = 0.8 + 0.2 * Math.sin(t * 11);
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, r * 1.15, 'rgba(0,0,0,0.3)');
    const [fx, fy] = this.proj(ob.x, ob.y, 0.05);
    ctx.fillStyle = 'rgba(255,140,40,0.35)'; ctx.beginPath(); ctx.ellipse(fx, fy, r * s, r * 0.4 * s * f, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff7a1f';
    for (let i = 0; i < 5; i++) { const a = i * 1.26 + t * 0.5, px = fx + Math.cos(a) * r * 0.55 * s, ff = 0.7 + 0.3 * Math.sin(t * 9 + i * 2); ctx.beginPath(); ctx.moveTo(px - s * 0.1, fy); ctx.quadraticCurveTo(px, fy - s * 0.45 * ff, px + s * 0.1, fy); ctx.fill(); }
    for (let i = 0; i < 3; i++) { const a = i * 2.09 + 0.5; this.prism(ctx, this.circlePoly(ob.x + Math.cos(a) * r * 0.7, ob.y + Math.sin(a) * r * 0.7, 0.08, 5), 0, 0.25, '#2a2a30', '#111116'); }
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r, 14), 0.2, 0.65, '#3b3b45', '#1a1a20');
    this.isoEllipse(ctx, ob.x, ob.y, 0.86, r * 1.08, '#4e4e5a');
    this.isoEllipse(ctx, ob.x, ob.y, 0.88, r * 0.88, '#7dff4a');
    this.isoEllipse(ctx, ob.x, ob.y, 0.885, r * 0.6, '#a8ff7a');
    for (let i = 0; i < 4; i++) { // Blasen und Dampf
      const u = (t * 0.6 + i * 0.25) % 1, a = i * 1.7 + t * 0.3;
      const [bx, by] = this.proj(ob.x + Math.cos(a) * r * 0.45, ob.y + Math.sin(a) * r * 0.45, 0.9 + u * 0.9);
      ctx.fillStyle = `rgba(190,255,150,${0.55 * (1 - u)})`; ctx.beginPath(); ctx.arc(bx, by, s * (0.05 + u * 0.14), 0, TAU); ctx.fill();
    }
    if (ob.loaded) { const [px, py] = this.proj(ob.x, ob.y, 1.0); ctx.fillStyle = `rgba(230,255,200,${0.3 + 0.2 * Math.sin(t * 12)})`; ctx.beginPath(); ctx.arc(px, py, s * r * 0.9, 0, TAU); ctx.fill(); }
  }

  /* Schrumpftrank: schwebende Flasche mit blubberndem Inhalt */
  spritePotion(ctx, ob, t) {
    const s = this.scale, bob = 0.05 * Math.sin(t * 3 + ob.x);
    const [bx, by] = this.proj(ob.x, ob.y, 0.25 + bob);
    const h = s * 0.55, w = s * 0.36;
    ctx.fillStyle = 'rgba(210,240,255,0.55)'; ctx.strokeStyle = 'rgba(40,20,60,0.7)'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(bx - w * 0.18, by - h); ctx.lineTo(bx - w * 0.18, by - h * 0.65);
    ctx.quadraticCurveTo(bx - w * 0.6, by - h * 0.5, bx - w * 0.5, by - h * 0.15);
    ctx.quadraticCurveTo(bx, by + h * 0.15, bx + w * 0.5, by - h * 0.15);
    ctx.quadraticCurveTo(bx + w * 0.6, by - h * 0.5, bx + w * 0.18, by - h * 0.65); ctx.lineTo(bx + w * 0.18, by - h); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.save(); ctx.clip();
    ctx.fillStyle = '#b04ee6'; ctx.fillRect(bx - w, by - h * 0.45, w * 2, h);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    for (let i = 0; i < 3; i++) { const u = (t * 0.6 + i * 0.33) % 1; ctx.beginPath(); ctx.arc(bx + (i - 1) * w * 0.2, by - h * 0.4 * u - h * 0.05, s * 0.03, 0, TAU); ctx.fill(); }
    ctx.restore();
    ctx.fillStyle = '#9a6b3a'; ctx.fillRect(bx - w * 0.2, by - h * 1.12, w * 0.4, h * 0.16);
    ctx.fillStyle = 'rgba(255,230,255,0.9)';
    for (let i = 0; i < 3; i++) {
      const a = t * 2 + i * 2.1;
      const [px, py] = this.proj(ob.x + Math.cos(a) * 0.4, ob.y + Math.sin(a) * 0.4, 0.5 + 0.2 * Math.sin(t * 3 + i));
      ctx.beginPath(); ctx.arc(px, py, s * 0.04, 0, TAU); ctx.fill();
    }
  }

  /* Kanone: Steinsockel, schwenkendes Rohr, Lunte (glüht, wenn geladen) */
  drawCannon(ctx, ob, t) {
    const s = this.scale;
    this.prism(ctx, this.circlePoly(ob.x, ob.y, 0.7, 8), 0, 0.3, '#7a6a58', '#4e4236', { outline: '#2e251d' });
    const dx = Math.cos(ob.angle), dy = Math.sin(ob.angle), nx = -dy * 0.32, ny = dx * 0.32;
    const bx = ob.x - dx * 0.55, by = ob.y - dy * 0.55, mx = ob.x + dx * 1.15, my = ob.y + dy * 1.15;
    const poly = [[bx + nx, by + ny], [mx + nx, my + ny], [mx - nx, my - ny], [bx - nx, by - ny]];
    this.prism(ctx, poly, 0.3, 0.55, '#4a4a55', '#2a2a32', { outline: '#15151a' });
    const [ux, uy] = this.proj(mx, my, 0.575);
    ctx.fillStyle = '#111'; ctx.beginPath(); ctx.ellipse(ux, uy, s * 0.27, s * 0.2 * (0.6 + 0.4 * this.cam.tilt), 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#8a8a99'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.stroke();
    const [fx, fy] = this.proj(bx, by, 0.9);
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath(); ctx.moveTo(fx, fy - s * 0.05); ctx.quadraticCurveTo(fx + s * 0.12, fy - s * 0.25, fx + s * 0.05, fy - s * 0.35); ctx.stroke();
    if (ob.loaded) {
      const f = 0.7 + 0.3 * Math.sin(t * 30);
      ctx.fillStyle = `rgba(255,${Math.round(150 + 80 * f)},60,${f})`;
      ctx.beginPath(); ctx.arc(fx + s * 0.05, fy - s * 0.35, s * 0.08 * f, 0, TAU); ctx.fill();
    }
  }

  /* Windmühle: zwei Turmhälften mit Durchgang, Dach, Fenster, Tür und drehenden Flügeln */
  drawWindmill(ctx, ob, t) {
    const s = this.scale, th = this.theme, ax = ob.axis === 'x';
    const wallTop = '#e8dfcf', wallSide = '#a8998a', roof = '#7a4a2a';
    for (const b of ob.blocks) this.prism(ctx, b, 0, ob.height, wallTop, wallSide, { outline: '#6b5a4a' });
    // Brücke über dem Durchgang und Dach
    const g = ob.gap / 2 + 0.05, dd = ob.depth / 2;
    const bridge = ax ? [[ob.x - g, ob.y - dd], [ob.x + g, ob.y - dd], [ob.x + g, ob.y + dd], [ob.x - g, ob.y + dd]] : [[ob.x - dd, ob.y - g], [ob.x + dd, ob.y - g], [ob.x + dd, ob.y + g], [ob.x - dd, ob.y + g]];
    this.prism(ctx, bridge, 1.05, ob.height - 1.05, wallTop, wallSide, { outline: '#6b5a4a' });
    const rw = ob.w / 2 + ob.overlap + 0.15, rd = ob.depth / 2 + 0.15;
    const roofBase = ax ? [[ob.x - rw, ob.y - rd], [ob.x + rw, ob.y - rd], [ob.x + rw, ob.y + rd], [ob.x - rw, ob.y + rd]] : [[ob.x - rd, ob.y - rw], [ob.x + rd, ob.y - rw], [ob.x + rd, ob.y + rw], [ob.x - rd, ob.y + rw]];
    this.prism(ctx, roofBase, ob.height, 0.3, roof, '#4a2c18');
    // Spitzdach als Pyramide
    const apex = this.proj(ob.x, ob.y, ob.height + 1.1);
    const corners = roofBase.map(p => this.proj(p[0], p[1], ob.height + 0.3));
    for (let i = 0; i < 4; i++) {
      const a = corners[i], b = corners[(i + 1) % 4];
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(apex[0], apex[1]); ctx.closePath();
      ctx.fillStyle = i % 2 ? '#8e5a34' : '#6e4224'; ctx.fill(); ctx.strokeStyle = '#3a2214'; ctx.lineWidth = 0.8; ctx.stroke();
    }
    // Türbogen nur auf der Seite, die zur Kamera zeigt (kein Blick durch das Gebäude).
    // Die Öffnung wird exakt in Durchgangsbreite (plus Überlappung) auf die Gebäudefront gezeichnet.
    const faceN = ax ? [0, 1] : [1, 0];
    const camSide = (faceN[0] * this.cam.sin + faceN[1] * this.cam.cos) > 0 ? 1 : -1;
    {
      const side = camSide, w2 = ob.gap / 2 + 0.08, top = 1.05, rad = Math.min(w2, 0.32);
      const fx = ax ? ob.x : ob.x + side * dd, fy = ax ? ob.y + side * dd : ob.y;
      const at = (u, z) => ax ? this.proj(fx + u, fy, z) : this.proj(fx, fy + u, z); // u = seitlicher Versatz auf der Front
      // erst die ganze Öffnung in Mauerfarbe schließen, dann den Bogen darauf
      const nx = ax ? 0 : side, ny = ax ? side : 0;
      const light = 0.68 + 0.32 * (0.5 + 0.5 * (nx * 0.85 - ny * 0.53));
      ctx.fillStyle = shade(wallSide, light); ctx.beginPath();
      for (const [u, z] of [[-w2, 0], [-w2, top + 0.02], [w2, top + 0.02], [w2, 0]]) { const q = at(u, z); ctx.lineTo(q[0], q[1]); }
      ctx.closePath(); ctx.fill();
      const arch = () => {
        ctx.beginPath();
        let p = at(-w2, 0); ctx.moveTo(p[0], p[1]);
        p = at(-w2, top - rad); ctx.lineTo(p[0], p[1]);
        for (let k = 0; k <= 10; k++) { const a = Math.PI - (k / 10) * Math.PI; p = at(Math.cos(a) * w2, top - rad + Math.sin(a) * rad); ctx.lineTo(p[0], p[1]); }
        p = at(w2, 0); ctx.lineTo(p[0], p[1]); ctx.closePath();
      };
      if (ob.blocked) { // geschlossenes Holztor mit Brettern und Eisenband
        ctx.fillStyle = '#8a5a30'; arch(); ctx.fill();
        ctx.save(); arch(); ctx.clip();
        ctx.strokeStyle = 'rgba(40,20,8,0.6)'; ctx.lineWidth = Math.max(1, s * 0.03);
        for (let k = -3; k <= 3; k++) { const u = (k / 3.5) * w2; const q0 = at(u, 0), q1 = at(u, top); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
        ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = Math.max(2, s * 0.07);
        for (const z of [0.3, 0.72]) { const q0 = at(-w2, z), q1 = at(w2, z); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
        ctx.restore();
        ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = Math.max(1.5, s * 0.05); arch(); ctx.stroke();
      } else { // offener Durchgang
        ctx.fillStyle = '#150e0b'; arch(); ctx.fill();
        ctx.strokeStyle = '#6b5a4a'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.stroke();
      }
      // Laterne über der Tür: rot = zu, grün = offen
      const [lx, ly] = at(0, top + 0.28), lc = ob.blocked ? '255,80,70' : '120,255,140', pulse = 0.75 + 0.25 * Math.sin(t * 5);
      ctx.fillStyle = `rgba(${lc},${0.22 * pulse})`; ctx.beginPath(); ctx.arc(lx, ly, s * 0.36, 0, TAU); ctx.fill();
      ctx.fillStyle = `rgb(${lc})`; ctx.beginPath(); ctx.arc(lx, ly, s * 0.11, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2a30'; ctx.fillRect(lx - s * 0.05, ly - s * 0.2, s * 0.1, s * 0.09);
    }
    // Fenster
    for (const b of ob.blocks) {
      const mx = (b[0][0] + b[2][0]) / 2, my = (b[0][1] + b[2][1]) / 2;
      for (const z of [0.5, 1.15]) {
        const [wx, wy] = this.proj(ax ? mx : ob.x + dd + 0.01, ax ? ob.y + dd + 0.01 : my, z);
        ctx.fillStyle = '#ffd166'; ctx.fillRect(wx - s * 0.08, wy - s * 0.12, s * 0.16, s * 0.24);
      }
    }
    // Flügel: senkrechte Ebene an der Vorderseite, Drehung um die Nabe
    const hubX = ax ? ob.x : ob.x + dd + 0.08, hubY = ax ? ob.y + dd + 0.08 : ob.y, hubZ = ob.height - 0.15;
    const [hx, hy] = this.proj(hubX, hubY, hubZ);
    ctx.lineCap = 'round';
    for (let i = 0; i < ob.blades; i++) {
      const a = ob.angle + (i * TAU) / ob.blades, ca = Math.cos(a), sa = Math.sin(a);
      const tipX = hubX + (ax ? ca * ob.len : 0), tipY = hubY + (ax ? 0 : ca * ob.len), tipZ = hubZ + sa * ob.len;
      const [tx, ty] = this.proj(tipX, tipY, tipZ);
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      // Segeltuch als Rechteck neben dem Balken
      const px = ax ? -sa * 0.28 : 0, py = ax ? 0 : -sa * 0.28, pz = ca * 0.28;
      const q = [this.proj(hubX + (tipX - hubX) * 0.3, hubY + (tipY - hubY) * 0.3, hubZ + (tipZ - hubZ) * 0.3), this.proj(tipX, tipY, tipZ),
        this.proj(tipX + px, tipY + py, tipZ + pz), this.proj(hubX + (tipX - hubX) * 0.3 + px, hubY + (tipY - hubY) * 0.3 + py, hubZ + (tipZ - hubZ) * 0.3 + pz)];
      ctx.beginPath(); q.forEach((pp, k) => k ? ctx.lineTo(pp[0], pp[1]) : ctx.moveTo(pp[0], pp[1])); ctx.closePath();
      ctx.fillStyle = 'rgba(245,235,210,0.9)'; ctx.fill(); ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = 1; ctx.stroke();
    }
    ctx.fillStyle = '#3a2214'; ctx.beginPath(); ctx.arc(hx, hy, s * 0.12, 0, TAU); ctx.fill();
  }

  /* Rampe: schräge Fläche, an der Eintrittskante flach, an der Austrittskante hoch */
  drawRamp(ctx, ob, t) {
    const th = this.theme, s = this.scale;
    const x0 = ob.x, y0 = ob.y, x1 = ob.x + ob.w, y1 = ob.y + ob.h;
    const corners = [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    // Höhe je Ecke: 0 an der Eintrittsseite, ob.height an der Austrittsseite
    const cx = (x0 + x1) / 2, cy = (y0 + y1) / 2, half = Math.abs(ob.dx) > 0.5 ? ob.w / 2 : ob.h / 2;
    const zAt = (px, py) => ob.height * Math.max(0, Math.min(1, (((px - cx) * ob.dx + (py - cy) * ob.dy) + half) / (2 * half)));
    const top = corners.map(([px, py]) => [px, py, zAt(px, py)]);
    const P = v => this.proj(v[0], v[1], v[2]);
    // Seitenflächen (senkrechte Dreiecke/Vierecke unter den Kanten), nur die zur Kamera zeigenden
    for (let i = 0; i < 4; i++) {
      const a = top[i], b = top[(i + 1) % 4];
      if (a[2] < 0.01 && b[2] < 0.01) continue;
      const ex = b[0] - a[0], ey = b[1] - a[1];
      let nx = ey, ny = -ex; const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      if (nx * this.cam.sin + ny * this.cam.cos <= 0.001) continue;
      const light = 0.68 + 0.32 * (0.5 + 0.5 * (nx * 0.85 - ny * 0.53));
      const p0 = P([a[0], a[1], 0]), p1 = P([b[0], b[1], 0]), p2 = P(b), p3 = P(a);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath();
      ctx.fillStyle = shade(th.rotor.side, light); ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.8; ctx.stroke();
    }
    // schräge Oberseite mit Brettern
    ctx.beginPath(); top.forEach((v, i) => { const p = P(v); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath();
    ctx.fillStyle = th.rotor.top; ctx.fill(); ctx.strokeStyle = shade(th.rotor.side, 0.7); ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = Math.max(1, s * 0.03);
    const n = 5;
    for (let i = 1; i < n; i++) {
      const u = i / n;
      const a = Math.abs(ob.dx) > 0.5 ? [x0 + u * ob.w, y0] : [x0, y0 + u * ob.h], b = Math.abs(ob.dx) > 0.5 ? [x0 + u * ob.w, y1] : [x1, y0 + u * ob.h];
      const pa = P([a[0], a[1], zAt(a[0], a[1])]), pb = P([b[0], b[1], zAt(b[0], b[1])]);
      ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
    }
    // Richtungspfeil, leicht pulsierend
    const pulse = 0.5 + 0.5 * Math.sin(t * 4);
    const ax = cx - ob.dx * half * 0.5, ay = cy - ob.dy * half * 0.5, bx = cx + ob.dx * half * 0.6, by = cy + ob.dy * half * 0.6;
    const pa = P([ax, ay, zAt(ax, ay) + 0.02]), pb = P([bx, by, zAt(bx, by) + 0.02]);
    const wl = P([bx - ob.dx * 0.5 - ob.dy * 0.35, by - ob.dy * 0.5 + ob.dx * 0.35, zAt(bx, by) + 0.02]), wr = P([bx - ob.dx * 0.5 + ob.dy * 0.35, by - ob.dy * 0.5 - ob.dx * 0.35, zAt(bx, by) + 0.02]);
    ctx.strokeStyle = `rgba(255,240,160,${0.55 + 0.45 * pulse})`; ctx.lineWidth = Math.max(2, s * 0.08); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.moveTo(wl[0], wl[1]); ctx.lineTo(pb[0], pb[1]); ctx.lineTo(wr[0], wr[1]); ctx.stroke();
  }

  drawMover(ctx, ob, t) {
    const th = this.theme, s = this.scale, poly = ob.poly();
    this.isoEllipse(ctx, ob.x, ob.y, 0, Math.max(ob.w, ob.h) * 0.5, 'rgba(0,0,0,0.2)');
    if (ob.style === 'dragon') {
      const d = ob.dir, w = ob.w, h = ob.h, cx = ob.x, cy = ob.y;
      const rect = (x, y, ww, hh) => [[x - ww / 2, y - hh / 2], [x + ww / 2, y - hh / 2], [x + ww / 2, y + hh / 2], [x - ww / 2, y + hh / 2]];
      const green = ['#4fb35a', '#215a2a'], dark = ['#2f7a38', '#173f1c'], belly = '#d9c27a';
      // Schwanz: spitz zulaufend nach hinten, pendelt leicht
      const tw = Math.sin(t * 2.5) * 0.15;
      const tailBase = cx - d * w / 2, tail = [[tailBase, cy - 0.35], [tailBase, cy + 0.35], [tailBase - d * 0.9, cy + tw + 0.12], [tailBase - d * 1.25, cy + tw], [tailBase - d * 0.9, cy + tw - 0.12]];
      this.prism(ctx, tail, 0.15, 0.4, green[0], green[1]);
      // Beine
      for (const [lx, ly] of [[cx - d * w * 0.3, cy - h / 2 + 0.15], [cx + d * w * 0.25, cy - h / 2 + 0.15], [cx - d * w * 0.3, cy + h / 2 - 0.15], [cx + d * w * 0.25, cy + h / 2 - 0.15]])
        this.prism(ctx, rect(lx, ly, 0.35, 0.3), 0, 0.35, dark[0], dark[1]);
      // Körper mit hellem Bauchstreifen
      this.prism(ctx, rect(cx, cy, w, h), 0.25, 0.85, green[0], green[1], { outline: '#123a18' });
      this.fillPoly(ctx, rect(cx, cy, w * 0.9, h * 0.35), 1.105, belly, false);
      // Flügel: zwei Flächen, die auf und ab schlagen
      const flap = 0.35 + 0.3 * Math.sin(t * 5);
      for (const side of [-1, 1]) {
        const y0 = cy + side * h * 0.25, y1 = cy + side * (h / 2 + 0.9), y2 = cy + side * (h / 2 + 0.5);
        const wing = [[cx - d * 0.2, y0, 1.1], [cx - d * 0.9, y1, 1.1 + flap], [cx + d * 0.1, y1, 1.1 + flap * 1.2], [cx + d * 0.6, y2, 1.1 + flap * 0.6]];
        ctx.beginPath(); wing.forEach((p, i) => { const q = this.proj(p[0], p[1], p[2]); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath();
        ctx.fillStyle = side < 0 ? '#8e3a44' : '#a8454f'; ctx.fill(); ctx.strokeStyle = '#4a1a22'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.stroke();
        for (const p of wing.slice(1, 3)) { const q0 = this.proj(wing[0][0], wing[0][1], wing[0][2]), q1 = this.proj(p[0], p[1], p[2]); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
      }
      // Rückenzacken
      for (let i = 0; i < 4; i++) {
        const zx = cx - w / 2 + (i + 0.5) * (w / 4);
        const [a0, a1] = this.proj(zx - 0.12, cy, 1.1), [b0, b1] = this.proj(zx + 0.12, cy, 1.1), [c0, c1] = this.proj(zx, cy, 1.45);
        ctx.fillStyle = '#e8b04a'; ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(c0, c1); ctx.lineTo(b0, b1); ctx.closePath(); ctx.fill();
      }
      // Hals und Kopf mit Schnauze
      const hx = cx + d * (w / 2 + 0.3), hy = cy;
      this.prism(ctx, rect(cx + d * w / 2, cy, 0.5, 0.6), 0.5, 0.7, green[0], green[1]);
      this.prism(ctx, this.circlePoly(hx, hy, 0.45, 8), 0.6, 0.7, green[0], green[1], { outline: '#123a18' });
      this.prism(ctx, rect(hx + d * 0.55, hy, 0.5, 0.5), 0.65, 0.4, green[0], green[1]);
      // Hörner
      for (const side of [-1, 1]) {
        const [q0x, q0y] = this.proj(hx - d * 0.15, hy + side * 0.25, 1.3), [q1x, q1y] = this.proj(hx - d * 0.45, hy + side * 0.35, 1.75);
        ctx.strokeStyle = '#e9d9b8'; ctx.lineWidth = Math.max(2, s * 0.09); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q0x, q0y); ctx.lineTo(q1x, q1y); ctx.stroke();
      }
      // Augen auf beiden Seiten
      for (const side of [-1, 1]) {
        const [ex, ey] = this.proj(hx + d * 0.15, hy + side * 0.42, 1.12);
        ctx.fillStyle = '#ffd12a'; ctx.beginPath(); ctx.arc(ex, ey, s * 0.09, 0, TAU); ctx.fill();
        ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.03, s * 0.07, 0, 0, TAU); ctx.fill();
      }
      // Zähne an der Schnauze
      const [z0x, z0y] = this.proj(hx + d * 0.8, hy - 0.2, 0.68), [z1x, z1y] = this.proj(hx + d * 0.8, hy + 0.2, 0.68);
      ctx.strokeStyle = '#f4efe6'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.setLineDash([s * 0.06, s * 0.06]); ctx.beginPath(); ctx.moveTo(z0x, z0y); ctx.lineTo(z1x, z1y); ctx.stroke(); ctx.setLineDash([]);
      // Feuerhauch
      const fl = 0.4 + 0.3 * Math.sin(t * 9);
      for (let i = 0; i < 4; i++) {
        const [fx, fy] = this.proj(hx + d * (0.95 + i * 0.32 * fl), hy + (i % 2 ? 0.1 : -0.1) * i * 0.5, 0.8 + Math.sin(t * 7 + i) * 0.08);
        ctx.fillStyle = i === 0 ? '#fff1a0' : i === 1 ? '#ffc23a' : i === 2 ? '#ff8a2a' : '#ff5a1f'; ctx.globalAlpha = 0.9 - i * 0.2;
        ctx.beginPath(); ctx.arc(fx, fy, s * (0.17 - i * 0.03), 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    } else if (ob.style === 'cauldron') {
      const body = this.circlePoly(ob.x, ob.y, ob.w * 0.48, 10);
      this.prism(ctx, body, 0.05, 0.75, '#3b3b45', '#1a1a20', { outline: '#0a0a0e' });
      this.isoEllipse(ctx, ob.x, ob.y, 0.8, ob.w * 0.38, '#7dff4a');
      for (let i = 0; i < 3; i++) {
        const a = t * 4 + i * 2.1, [bx, by] = this.proj(ob.x + Math.cos(a) * 0.2, ob.y + Math.sin(a) * 0.2, 0.9 + ((t * 0.8 + i * 0.33) % 1) * 0.6);
        ctx.fillStyle = 'rgba(160,255,120,0.7)'; ctx.beginPath(); ctx.arc(bx, by, s * 0.07, 0, TAU); ctx.fill();
      }
    } else if (ob.style === 'snake') {
      // Comic-Panzerschlange: Schlauchkörper mit überlappenden Sechseck-Schuppen, Edelsteinen und Glubschaugen
      const len = ob.w * 0.95, dir = ob.dir, amp = ob.h * 0.28;
      const bodyEnd = 0.84, n = 46;
      const pt = u => ({ x: ob.x - dir * len / 2 + dir * u * len, y: ob.y + Math.sin(t * 7 - u * 6) * amp * (0.35 + 0.65 * (1 - u)) });
      const rad = u => 0.09 + 0.2 * Math.sin(Math.pow(Math.min(1, u / bodyEnd), 0.6) * Math.PI * 0.85 + 0.15);
      const G1 = '#b8f57a', G2 = '#5ccf4a', G3 = '#2e9a3a', G4 = '#1b5e26';
      for (let i = 0; i <= n; i++) { const u = (i / n) * bodyEnd, p = pt(u); this.isoEllipse(ctx, p.x, p.y, 0, rad(u) * 1.15, 'rgba(0,0,0,0.12)'); }
      // Grundkörper
      for (let i = 0; i <= n; i++) {
        const u = (i / n) * bodyEnd, p = pt(u), r = rad(u), [sx, sy] = this.proj(p.x, p.y, r), R = r * s;
        const g = ctx.createRadialGradient(sx - R * 0.3, sy - R * 0.45, R * 0.1, sx, sy, R);
        g.addColorStop(0, G2); g.addColorStop(0.7, G3); g.addColorStop(1, G4);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.fill();
      }
      // Sechseck-Schuppen vom Schwanz zum Kopf, spätere überlappen frühere
      const hexScale = (sx, sy, R, ax, ay, light) => {
        // ax/ay: Richtung zum Schwanz (Bildschirm), Spitze zeigt dorthin
        const px = -ay, py = ax;
        const pts = [[ax * 1.15, ay * 1.15], [ax * 0.4 + px * 0.85, ay * 0.4 + py * 0.85], [-ax * 0.7 + px * 0.8, -ay * 0.7 + py * 0.8],
          [-ax * 1.0, -ay * 1.0], [-ax * 0.7 - px * 0.8, -ay * 0.7 - py * 0.8], [ax * 0.4 - px * 0.85, ay * 0.4 - py * 0.85]];
        ctx.beginPath(); pts.forEach((q, k) => { const X = sx + q[0] * R, Y = sy + q[1] * R; k ? ctx.lineTo(X, Y) : ctx.moveTo(X, Y); }); ctx.closePath();
        const g = ctx.createLinearGradient(sx, sy - R, sx, sy + R);
        g.addColorStop(0, light ? G1 : G2); g.addColorStop(0.55, G2); g.addColorStop(1, G3);
        ctx.fillStyle = g; ctx.fill(); ctx.strokeStyle = G4; ctx.lineWidth = Math.max(1, s * 0.035); ctx.stroke();
        // Facette oben
        ctx.beginPath(); ctx.moveTo(sx - ax * 1.0 * R, sy - ay * 1.0 * R); ctx.lineTo(sx + (-ax * 0.7 + px * 0.8) * R, sy + (-ay * 0.7 + py * 0.8) * R); ctx.lineTo(sx + (ax * 0.4 + px * 0.85) * R * 0.5, sy + (ay * 0.4 + py * 0.85) * R * 0.5); ctx.closePath();
        ctx.fillStyle = 'rgba(255,255,255,0.18)'; ctx.fill();
      };
      const K = 14;
      for (let i = 0; i <= K; i++) {
        const u = 0.06 + (i / K) * (bodyEnd - 0.06), p = pt(u), r = rad(u), pb = pt(Math.max(0, u - 0.05));
        const [sx, sy] = this.proj(p.x, p.y, r * 1.05), [bx, by] = this.proj(pb.x, pb.y, r * 1.05);
        let ax = bx - sx, ay = by - sy; const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L;
        const px = -ay, py = ax, R = r * s * 0.95;
        // zwei Reihen: links/rechts versetzt, dazwischen Mittelschuppe
        hexScale(sx + px * R * 0.55, sy + py * R * 0.55 + R * 0.15, R * 0.75, ax, ay, false);
        hexScale(sx - px * R * 0.55, sy - py * R * 0.55 + R * 0.15, R * 0.75, ax, ay, false);
        hexScale(sx, sy - R * 0.25, R * 0.8, ax, ay, true);
        if (i % 2 === 1 && i < K) { // gelber Edelstein zwischen den Reihen
          const gx = sx + ax * R * 0.9, gy = sy + ay * R * 0.9 - R * 0.05, gr = R * 0.22;
          ctx.fillStyle = '#ffe14a'; ctx.beginPath(); ctx.moveTo(gx, gy - gr); ctx.lineTo(gx + gr, gy); ctx.lineTo(gx, gy + gr); ctx.lineTo(gx - gr, gy); ctx.closePath(); ctx.fill();
          ctx.strokeStyle = '#8a6a10'; ctx.lineWidth = Math.max(0.8, s * 0.025); ctx.stroke();
          ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(gx - gr * 0.25, gy - gr * 0.3, gr * 0.25, 0, TAU); ctx.fill();
        }
      }
      // Kopf: gestreckte Kapsel in Körperbreite, vorne abgerundet, mit Schuppen bedeckt
      const hp = pt(bodyEnd), headLen = 0.95, HRw = 0.3;
      const hr = v => HRw * (v < 0.4 ? 1 : Math.sqrt(Math.max(0, 1 - Math.pow((v - 0.4) / 0.6, 2))));
      const hpt = v => ({ x: hp.x + dir * v * headLen, y: hp.y + Math.sin(t * 7 - bodyEnd * 6) * amp * 0.3 * (1 - v) });
      for (let k = 0; k <= 24; k++) { const v = k / 24, q = hpt(v); this.isoEllipse(ctx, q.x, q.y, 0, hr(v) * 1.15 + 0.02, 'rgba(0,0,0,0.12)'); }
      for (let k = 0; k <= 24; k++) {
        const v = k / 24, q = hpt(v), r = Math.max(0.02, hr(v)), [sx, sy] = this.proj(q.x, q.y, r), R = r * s;
        const g = ctx.createRadialGradient(sx - R * 0.3, sy - R * 0.45, R * 0.1, sx, sy, R);
        g.addColorStop(0, G2); g.addColorStop(0.7, G3); g.addColorStop(1, G4);
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, R, 0, TAU); ctx.fill();
      }
      // Kopfschuppen (größere Platten), Spitze zum Schwanz
      for (let k = 0; k < 4; k++) {
        const v = 0.08 + k * 0.2, q = hpt(v), qb = hpt(Math.max(0, v - 0.1)), r = hr(v);
        const [sx, sy] = this.proj(q.x, q.y, r * 1.05), [bx, by] = this.proj(qb.x, qb.y, r * 1.05);
        let ax = bx - sx, ay = by - sy; const L = Math.hypot(ax, ay) || 1; ax /= L; ay /= L;
        const px = -ay, py = ax, R = r * s * 0.95;
        if (k < 3) { hexScale(sx + px * R * 0.55, sy + py * R * 0.55 + R * 0.15, R * 0.75, ax, ay, false); hexScale(sx - px * R * 0.55, sy - py * R * 0.55 + R * 0.15, R * 0.75, ax, ay, false); }
        hexScale(sx, sy - R * 0.25, R * (k === 3 ? 0.6 : 0.8), ax, ay, true);
      }
      // Nasenlöcher vorn
      const tip = hpt(0.9), [nx0, ny0] = this.proj(tip.x, tip.y, hr(0.9) * 1.4);
      ctx.fillStyle = G4; for (const side of [-1, 1]) { ctx.beginPath(); ctx.arc(nx0 + side * s * 0.07, ny0, s * 0.028, 0, TAU); ctx.fill(); }
      // Glubschaugen: zwei weiße Kugeln nebeneinander vorn oben auf dem Kopf
      const ev = hpt(0.55), ER = 0.2 * s;
      for (const side of [-1, 1]) {
        const [ex, ey] = this.proj(ev.x, ev.y + side * 0.17, hr(0.55) + 0.14);
        ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(ex, ey + ER * 0.85, ER * 0.9, ER * 0.3, 0, 0, TAU); ctx.fill();
        const eg = ctx.createRadialGradient(ex - ER * 0.3, ey - ER * 0.35, ER * 0.1, ex, ey, ER);
        eg.addColorStop(0, '#ffffff'); eg.addColorStop(0.8, '#f0f0f4'); eg.addColorStop(1, '#c4c4d0');
        ctx.fillStyle = eg; ctx.beginPath(); ctx.arc(ex, ey, ER, 0, TAU); ctx.fill();
        ctx.strokeStyle = G4; ctx.lineWidth = Math.max(1, s * 0.035); ctx.stroke();
        const [fx0, fy0] = this.proj(ev.x + dir * 0.12, ev.y + side * 0.17, hr(0.55) + 0.14);
        const lookX = (fx0 - ex) * 0.7 + Math.sin(t * 1.3) * ER * 0.1, lookY = (fy0 - ey) * 0.7 + ER * 0.05;
        ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex + lookX, ey + lookY, ER * 0.52, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + lookX - ER * 0.18, ey + lookY - ER * 0.2, ER * 0.16, 0, TAU); ctx.fill();
      }
      const hx = hp.x + dir * headLen * 0.55, hz = hr(0.55);
      // Zunge
      const flick = (t * 2.5) % 1;
      if (flick < 0.35) {
        const L = 0.45 * Math.sin((flick / 0.35) * Math.PI);
        const tx0 = hp.x + dir * headLen * 0.98, ty0 = hp.y, tz = 0.12;
        const [t0x, t0y] = this.proj(tx0, ty0, tz), [t1x, t1y] = this.proj(tx0 + dir * L, ty0, tz);
        const [taX, taY] = this.proj(tx0 + dir * (L + 0.12), ty0 - 0.08, tz), [tbX, tbY] = this.proj(tx0 + dir * (L + 0.12), ty0 + 0.08, tz);
        ctx.strokeStyle = '#e0304a'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(t0x, t0y); ctx.lineTo(t1x, t1y); ctx.lineTo(taX, taY); ctx.moveTo(t1x, t1y); ctx.lineTo(tbX, tbY); ctx.stroke();
      }
    } else if (ob.style === 'guard') { // Palastwache: Gewand, Schärpe, Turban mit Edelstein, Krummsäbel
      const body = this.circlePoly(ob.x, ob.y, ob.w * 0.42, 8);
      this.prism(ctx, body, 0.05, 0.7, '#f3e6c4', '#c9a15a', { outline: '#8a6a3a' });
      this.fillPoly(ctx, this.circlePoly(ob.x, ob.y, ob.w * 0.43, 8), 0.45, '#2fb8c9', false);
      const [hx, hy] = this.proj(ob.x, ob.y, 0.95);
      ctx.fillStyle = '#c98a5a'; ctx.beginPath(); ctx.arc(hx, hy, s * 0.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff4dc'; ctx.beginPath(); ctx.ellipse(hx, hy - s * 0.14, s * 0.27, s * 0.18, 0, Math.PI, TAU); ctx.fill();
      ctx.fillStyle = '#d93b3b'; ctx.fillRect(hx - s * 0.27, hy - s * 0.16, s * 0.54, s * 0.06);
      ctx.fillStyle = '#2fb8c9'; ctx.beginPath(); ctx.arc(hx, hy - s * 0.2, s * 0.05, 0, TAU); ctx.fill();
      ctx.fillStyle = '#3a2a1a'; ctx.fillRect(hx - s * 0.12, hy + s * 0.02, s * 0.24, s * 0.05);
      const [sx0, sy0] = this.proj(ob.x + ob.dir * 0.05, ob.y + 0.4, 0.5);
      ctx.strokeStyle = '#dfe6ee'; ctx.lineWidth = Math.max(2, s * 0.07); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(sx0, sy0); ctx.quadraticCurveTo(sx0 + s * 0.25, sy0 - s * 0.25, sx0 + s * 0.2 + Math.sin(t * 6) * s * 0.03, sy0 - s * 0.55); ctx.stroke();
      ctx.fillStyle = '#c9a15a'; ctx.beginPath(); ctx.arc(sx0, sy0, s * 0.05, 0, TAU); ctx.fill();
    } else if (ob.style === 'knight') {
      const body = this.circlePoly(ob.x, ob.y, ob.w * 0.42, 8);
      this.prism(ctx, body, 0.05, 0.7, '#d9dde6', '#7f8694', { outline: '#4a505c' });
      const [hx, hy] = this.proj(ob.x, ob.y, 0.95);
      ctx.fillStyle = '#c9ced8'; ctx.beginPath(); ctx.arc(hx, hy, s * 0.24, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a2f3a'; ctx.fillRect(hx - s * 0.16, hy - s * 0.02, s * 0.32, s * 0.07);
      ctx.strokeStyle = '#d93b3b'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(hx, hy - s * 0.22); ctx.quadraticCurveTo(hx - s * 0.2, hy - s * 0.5, hx - s * 0.35 + Math.sin(t * 8) * s * 0.03, hy - s * 0.3); ctx.stroke();
      const [shx, shy] = this.proj(ob.x + ob.dir * 0.05, ob.y + 0.35, 0.45);
      ctx.fillStyle = '#d93b3b'; ctx.beginPath(); ctx.arc(shx, shy, s * 0.17, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#ffd166'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.beginPath(); ctx.moveTo(shx - s * 0.1, shy); ctx.lineTo(shx + s * 0.1, shy); ctx.moveTo(shx, shy - s * 0.1); ctx.lineTo(shx, shy + s * 0.1); ctx.stroke();
    } else if (ob.style === 'cloud') {
      this.isoEllipse(ctx, ob.x, ob.y, 0.2, ob.w * 0.6, '#ffffff');
    } else if (ob.style === 'boat') { // Ruderboot
      const d = ob.dir || 1, L = ob.w * 0.75, Wd = ob.h * 0.42, bob = 0.04 * Math.sin(t * 2.2 + ob.x);
      const hull = [[ob.x - L, ob.y - Wd * 0.4], [ob.x - L * 0.6, ob.y - Wd], [ob.x + L * 0.6, ob.y - Wd], [ob.x + L, ob.y - Wd * 0.4], [ob.x + L, ob.y + Wd * 0.4], [ob.x + L * 0.6, ob.y + Wd], [ob.x - L * 0.6, ob.y + Wd], [ob.x - L, ob.y + Wd * 0.4]];
      this.prism(ctx, hull, bob, 0.45, '#8a5a30', '#4a2e14', { outline: '#2a1a0c' });
      this.fillPoly(ctx, [[ob.x - L * 0.85, ob.y - Wd * 0.7], [ob.x + L * 0.85, ob.y - Wd * 0.7], [ob.x + L * 0.85, ob.y + Wd * 0.7], [ob.x - L * 0.85, ob.y + Wd * 0.7]], bob + 0.46, '#c9a15a', false);
      for (const k of [-0.35, 0.35]) this.fillPoly(ctx, [[ob.x + k * L - 0.08, ob.y - Wd * 0.7], [ob.x + k * L + 0.08, ob.y - Wd * 0.7], [ob.x + k * L + 0.08, ob.y + Wd * 0.7], [ob.x + k * L - 0.08, ob.y + Wd * 0.7]], bob + 0.5, '#6b4423', false);
      ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = Math.max(1.5, s * 0.05); // Ruder
      for (const side of [-1, 1]) { const [o0, o1] = this.proj(ob.x, ob.y + side * Wd * 0.8, bob + 0.5), [p0, p1] = this.proj(ob.x - d * 0.5 * Math.cos(t * 3), ob.y + side * (Wd + 0.6), bob + 0.15); ctx.beginPath(); ctx.moveTo(o0, o1); ctx.lineTo(p0, p1); ctx.stroke(); }
      if (ob.docked) { const [lx, ly] = this.proj(ob.x, ob.y, bob + 1.1); ctx.fillStyle = `rgba(120,255,120,${0.6 + 0.4 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.arc(lx, ly, s * 0.1, 0, TAU); ctx.fill(); }
    } else if (ob.style === 'ship') { // Piratenschiff mit Mast, Segel und Flagge
      const d = ob.dir || 1, L = ob.w * 0.7, Wd = ob.h * 0.45, bob = 0.05 * Math.sin(t * 1.6 + ob.x);
      const hull = [[ob.x - L, ob.y - Wd * 0.5], [ob.x - L * 0.7, ob.y - Wd], [ob.x + L * 0.7, ob.y - Wd], [ob.x + L * 1.15, ob.y], [ob.x + L * 0.7, ob.y + Wd], [ob.x - L * 0.7, ob.y + Wd], [ob.x - L, ob.y + Wd * 0.5]];
      this.prism(ctx, hull, bob, 0.7, '#6b4423', '#3a2412', { outline: '#1e1208' });
      this.fillPoly(ctx, [[ob.x - L * 0.9, ob.y - Wd * 0.75], [ob.x + L * 0.9, ob.y - Wd * 0.75], [ob.x + L * 0.9, ob.y + Wd * 0.75], [ob.x - L * 0.9, ob.y + Wd * 0.75]], bob + 0.71, '#a87f52', false);
      const [hx, hy] = this.proj(ob.x + 0.1, ob.y, bob + 0.7), [tx, ty] = this.proj(ob.x + 0.1, ob.y, bob + 3.0);
      ctx.strokeStyle = '#3a2412'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      const sw = Math.sin(t * 2) * s * 0.08; // Segel
      ctx.fillStyle = '#f0e6d2'; ctx.beginPath(); ctx.moveTo(hx - s * 0.05, hy - s * 0.55 * CAM_ZF * 2); ctx.quadraticCurveTo(hx - d * s * 0.9 + sw, (hy + ty) / 2, hx - s * 0.05, ty + s * 0.25); ctx.lineTo(hx + s * 0.05, ty + s * 0.25); ctx.quadraticCurveTo(hx - d * s * 0.75 + sw, (hy + ty) / 2, hx + s * 0.05, hy - s * 0.55 * CAM_ZF * 2); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3a2412'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.moveTo(tx, ty); ctx.lineTo(tx + d * s * 0.5, ty + s * 0.12 + sw * 0.5); ctx.lineTo(tx, ty + s * 0.25); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(tx + d * s * 0.18, ty + s * 0.12, s * 0.035, 0, TAU); ctx.fill();
      if (ob.docked) { const [lx, ly] = this.proj(ob.x - L * 0.8, ob.y, bob + 1.3); ctx.fillStyle = `rgba(120,255,120,${0.6 + 0.4 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.arc(lx, ly, s * 0.12, 0, TAU); ctx.fill(); }
    } else if (ob.style === 'cannonball') { // rollende Kanonenkugel
      const r = ob.w * 0.5, [cx, cy] = this.proj(ob.x, ob.y, r);
      const g = ctx.createRadialGradient(cx - r * s * 0.35, cy - r * s * 0.4, r * s * 0.1, cx, cy, r * s);
      g.addColorStop(0, '#6a6a72'); g.addColorStop(1, '#141418');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r * s * 0.9, t * 6 * (ob.dir || 1), t * 6 * (ob.dir || 1) + 1.2); ctx.stroke();
    } else { // Lore
      this.prism(ctx, poly, 0.15, 0.75, th.mover.top, th.mover.side, { outline: shade(th.mover.side, 0.6) });
      this.isoEllipse(ctx, ob.x, ob.y, 0.91, ob.w * 0.38, '#4a4a55');
      if (ob.type !== 'ferry') {
        this.isoEllipse(ctx, ob.x - 0.08, ob.y - 0.08, 0.93, ob.w * 0.22, '#ffd166');
        this.isoEllipse(ctx, ob.x + 0.12, ob.y + 0.1, 0.93, ob.w * 0.12, '#ffe9a8');
      } else if (ob.docked) { // Wartesignal: Laterne leuchtet
        const [lx, ly] = this.proj(ob.x, ob.y, 1.25);
        ctx.fillStyle = `rgba(120,255,120,${0.6 + 0.4 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.arc(lx, ly, s * 0.12, 0, TAU); ctx.fill();
      }
      const [wx, wy] = this.proj(ob.x, ob.y, 0.08);
      ctx.fillStyle = '#222'; ctx.beginPath(); ctx.arc(wx - s * 0.3, wy, s * 0.11, 0, TAU); ctx.arc(wx + s * 0.3, wy, s * 0.11, 0, TAU); ctx.fill();
    }
  }

  /* ---------- Deko-Sprites (Bildschirmkoordinaten, verankert am Bodenpunkt) ---------- */
  drawDecor(ctx, d, t) {
    const s = this.scale * d.s;
    const [sx, sy] = this.proj(d.x, d.y, d.z || 0);
    switch (d.t) {
      case 'tree': this.spriteTree(ctx, sx, sy, s, d, t); break;
      case 'pine': this.spritePine(ctx, sx, sy, s, '#2f7a3e', '#1f5a2c'); break;
      case 'pineSnow': this.spritePine(ctx, sx, sy, s, '#3f8a5e', '#2a6a44', true); break;
      case 'deadTree': this.spriteDeadTree(ctx, sx, sy, s); break;
      case 'mushroom': this.spriteMushroom(ctx, d.x, d.y, d.z || 0, 0.55 * d.s, d.seed > 0.5 ? '#e0575a' : '#e7a53a'); break;
      case 'mushroomBig': this.spriteMushroom(ctx, d.x, d.y, d.z || 0, 1.3 * d.s, '#c94a7a', true); break;
      case 'flowerbush': this.spriteFlowers(ctx, sx, sy, s, d); break;
      case 'rock': this.spriteRock(ctx, sx, sy, s, '#8f8b97', '#5d5966'); break;
      case 'rockSnow': this.spriteRock(ctx, sx, sy, s, '#9fb5cc', '#5f7a99', true); break;
      case 'crystal': this.spriteCrystal(ctx, d.x, d.y, d.z || 0, 0.9 * d.s, '#e0b8ff', '#8a4fd0'); break;
      case 'crystalBlue': this.spriteCrystal(ctx, d.x, d.y, d.z || 0, 0.9 * d.s, '#cfeeff', '#5b90c6'); break;
      case 'crystalOrange': this.spriteCrystal(ctx, d.x, d.y, d.z || 0, 0.8 * d.s, '#ffd39a', '#d06a1a'); break;
      case 'lantern': this.spriteLantern(ctx, sx, sy, s, t); break;
      case 'tower': this.spriteTower(ctx, sx, sy, s, d); break;
      case 'cloud': this.spriteCloud(ctx, sx, sy, s, t); break;
      case 'stalagmite': this.spriteStalagmite(ctx, sx, sy, s); break;
      case 'bones': this.spriteBones(ctx, sx, sy, s); break;
      case 'anvil': this.spriteAnvil(ctx, sx, sy, s); break;
      case 'brazier': this.spriteBrazier(ctx, sx, sy, s, t); break;
      case 'gold': this.spriteGold(ctx, sx, sy, s, t); break;
      case 'pumpkin': this.spritePumpkin(ctx, sx, sy, s, t); break;
      case 'cauldron': this.spriteCauldron(ctx, d, s, t); break;
      case 'gear': this.spriteGear(ctx, sx, sy, s, d, t); break;
      case 'candle': this.spriteCandle(ctx, sx, sy, s, t); break;
      case 'coral': this.spriteCoral(ctx, sx, sy, s, d); break;
      case 'lighthouse': this.spriteLighthouse(ctx, sx, sy, s, t); break;
      case 'barrel': this.spriteBarrel(ctx, sx, sy, s); break;
      case 'crate': this.spriteCrate(ctx, sx, sy, s); break;
      case 'bollard': this.spriteBollard(ctx, sx, sy, s, d, t); break;
      case 'anchor': this.spriteAnchor(ctx, sx, sy, s); break;
      case 'buoy': this.spriteBuoy(ctx, sx, sy, s, t); break;
      case 'seaweed': this.spriteSeaweed(ctx, sx, sy, s, d, t); break;
      case 'shell': this.spriteShell(ctx, sx, sy, s, d); break;
      case 'starfish': this.spriteStarfish(ctx, sx, sy, s, d); break;
      case 'chest': this.spriteChest(ctx, sx, sy, s, t); break;
      case 'basalt': this.spriteBasalt(ctx, sx, sy, s, d); break;
      case 'obsidian': this.spriteCrystal(ctx, d.x, d.y, d.z || 0, 0.8 * d.s, '#6a4a8a', '#1e1428'); break;
      case 'burntTree': this.spriteDeadTree(ctx, sx, sy, s, '#120c0e', true); break;
      case 'vent': this.spriteVent(ctx, sx, sy, s, t); break;
      case 'palm': this.spritePalm(ctx, sx, sy, s, d, t); break;
      case 'cactus': this.spriteCactus(ctx, sx, sy, s, d); break;
      case 'urn': this.spriteUrn(ctx, sx, sy, s, d); break;
      case 'skull': this.spriteSkull(ctx, sx, sy, s); break;
      case 'shelf': this.spriteShelf(ctx, sx, sy, s, d); break;
      case 'bottle': this.spriteBottle(ctx, sx, sy, s, d); break;
      case 'broom': this.spriteBroom(ctx, sx, sy, s, d); break;
      case 'hut': this.spriteHut(ctx, sx, sy, s, t); break;
      case 'gearFlat': this.spriteGearFlat(ctx, d, s, t); break;
      case 'pipe': this.spritePipe(ctx, sx, sy, s, d, t); break;
      case 'clock': this.spriteClock(ctx, sx, sy, s, t); break;
      default: break;
    }
  }
  shadow(ctx, sx, sy, r) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.5, 0, 0, TAU); ctx.fill(); }
  /* Meeresgrund */
  spriteCoral(ctx, sx, sy, s, d) {
    const seed = d.seed || 0, col = seed > 0.66 ? '#ff8a6a' : seed > 0.33 ? '#ef6f9a' : '#ffb15a';
    this.shadow(ctx, sx, sy, s * 0.4);
    ctx.strokeStyle = col; ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI / 2 + (i - 2) * 0.42 + (seed - 0.5) * 0.3, L = s * (0.55 + ((i * 7 + seed * 10) % 3) * 0.15);
      ctx.lineWidth = Math.max(2, s * 0.11); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * L, sy + Math.sin(a) * L); ctx.stroke();
      ctx.lineWidth = Math.max(1.5, s * 0.08); ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * L * 0.6, sy + Math.sin(a) * L * 0.6); ctx.lineTo(sx + Math.cos(a + 0.6) * L * 0.95, sy + Math.sin(a + 0.6) * L * 0.95); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(sx + (i - 1.5) * s * 0.2, sy - s * 0.5 - (i % 2) * s * 0.2, s * 0.04, 0, TAU); ctx.fill(); }
  }
  /* Hafen */
  spriteLighthouse(ctx, sx, sy, s, t) {
    const w = s * 0.4, hgt = s * 2.6;
    this.shadow(ctx, sx, sy, w * 1.3);
    for (let i = 0; i < 6; i++) { const y0 = sy - hgt * (i + 1) / 6, ww = w * (1 - i * 0.05); ctx.fillStyle = i % 2 ? '#d93b3b' : '#f4efe6'; ctx.fillRect(sx - ww, y0, 2 * ww, hgt / 6 + 1); }
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(sx, sy - hgt, w * 0.75, hgt);
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(sx - w * 0.95, sy - hgt - s * 0.08, w * 1.9, s * 0.1);
    const beam = (t * 1.2) % TAU, gl = 0.5 + 0.5 * Math.cos(beam);
    ctx.fillStyle = `rgba(255,240,170,${0.25 + 0.5 * gl})`; ctx.beginPath(); ctx.arc(sx, sy - hgt - s * 0.3, s * 0.55 * (0.6 + gl * 0.6), 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffe9a8'; ctx.fillRect(sx - w * 0.55, sy - hgt - s * 0.5, w * 1.1, s * 0.42);
    ctx.fillStyle = '#3a3a44'; ctx.beginPath(); ctx.moveTo(sx - w * 0.8, sy - hgt - s * 0.5); ctx.lineTo(sx + w * 0.8, sy - hgt - s * 0.5); ctx.lineTo(sx, sy - hgt - s * 0.85); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,240,170,${0.12 * gl})`; ctx.beginPath(); ctx.moveTo(sx, sy - hgt - s * 0.3); ctx.lineTo(sx + Math.cos(beam) * s * 3, sy - hgt - s * 0.3 + Math.sin(beam) * s * 0.9 - s * 0.35); ctx.lineTo(sx + Math.cos(beam) * s * 3, sy - hgt - s * 0.3 + Math.sin(beam) * s * 0.9 + s * 0.35); ctx.closePath(); ctx.fill();
  }
  spriteBarrel(ctx, sx, sy, s) {
    this.shadow(ctx, sx, sy, s * 0.3);
    ctx.fillStyle = '#8a5a30'; ctx.beginPath(); ctx.moveTo(sx - s * 0.22, sy); ctx.quadraticCurveTo(sx - s * 0.3, sy - s * 0.3, sx - s * 0.22, sy - s * 0.6); ctx.lineTo(sx + s * 0.22, sy - s * 0.6); ctx.quadraticCurveTo(sx + s * 0.3, sy - s * 0.3, sx + s * 0.22, sy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#a87f52'; ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.6, s * 0.22, s * 0.08, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(sx - s * 0.27, sy - s * 0.45, s * 0.54, s * 0.05); ctx.fillRect(sx - s * 0.27, sy - s * 0.2, s * 0.54, s * 0.05);
  }
  spriteCrate(ctx, sx, sy, s) {
    this.shadow(ctx, sx, sy, s * 0.32);
    ctx.fillStyle = '#b48a5a'; ctx.fillRect(sx - s * 0.25, sy - s * 0.5, s * 0.5, s * 0.5);
    ctx.fillStyle = '#8a6a44'; ctx.fillRect(sx + s * 0.05, sy - s * 0.5, s * 0.2, s * 0.5);
    ctx.strokeStyle = '#5a4028'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.strokeRect(sx - s * 0.25, sy - s * 0.5, s * 0.5, s * 0.5);
    ctx.beginPath(); ctx.moveTo(sx - s * 0.25, sy - s * 0.5); ctx.lineTo(sx + s * 0.25, sy); ctx.stroke();
  }
  spriteBollard(ctx, sx, sy, s, d, t) {
    ctx.fillStyle = '#4a4a52'; ctx.fillRect(sx - s * 0.08, sy - s * 0.4, s * 0.16, s * 0.4);
    ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.4, s * 0.11, s * 0.05, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#c9a15a'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.beginPath(); ctx.moveTo(sx + s * 0.08, sy - s * 0.3); ctx.quadraticCurveTo(sx + s * 0.4, sy - s * 0.05 + Math.sin(t + sx) * s * 0.03, sx + s * 0.7, sy - s * 0.02); ctx.stroke();
  }
  spriteBuoy(ctx, sx, sy, s, t) {
    const bob = Math.sin(t * 1.8 + sx) * s * 0.05, y = sy + bob;
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.ellipse(sx, y, s * 0.32, s * 0.12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#d93b3b'; ctx.beginPath(); ctx.moveTo(sx - s * 0.2, y); ctx.lineTo(sx + s * 0.2, y); ctx.lineTo(sx + s * 0.1, y - s * 0.4); ctx.lineTo(sx - s * 0.1, y - s * 0.4); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f4efe6'; ctx.fillRect(sx - s * 0.15, y - s * 0.24, s * 0.3, s * 0.08);
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(sx - s * 0.03, y - s * 0.6, s * 0.06, s * 0.2);
    ctx.fillStyle = `rgba(255,220,100,${0.6 + 0.4 * Math.sin(t * 4 + sx)})`; ctx.beginPath(); ctx.arc(sx, y - s * 0.62, s * 0.05, 0, TAU); ctx.fill();
  }
  spriteAnchor(ctx, sx, sy, s) {
    ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy - s * 0.15); ctx.lineTo(sx, sy - s * 0.75); ctx.moveTo(sx - s * 0.2, sy - s * 0.6); ctx.lineTo(sx + s * 0.2, sy - s * 0.6); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy - s * 0.25, s * 0.3, 0.2, Math.PI - 0.2); ctx.stroke();
    ctx.beginPath(); ctx.arc(sx, sy - s * 0.82, s * 0.07, 0, TAU); ctx.stroke();
  }

  /* Große Zauberkoralle (Anzieh-, Abstoß- oder Bremskoralle): dicke Äste, leuchtende Spitzen */
  spriteCoralBig(ctx, sx, sy, s, c1, c2, t) {
    this.shadow(ctx, sx, sy, s * 0.5);
    const gl = 0.7 + 0.3 * Math.sin(t * 2.5 + sx);
    ctx.fillStyle = `rgba(${hexToRgb(c1).join(',')},${0.16 * gl})`; ctx.beginPath(); ctx.arc(sx, sy - s * 0.55, s * 0.9, 0, TAU); ctx.fill();
    ctx.lineCap = 'round';
    const arms = [[-0.9, 0.8, 0.1], [-0.45, 1.05, -0.2], [0.05, 1.2, 0.15], [0.5, 1.0, -0.15], [0.95, 0.75, 0.2]];
    for (const [ang, L, bend] of arms) {
      const a = -Math.PI / 2 + ang * 0.75, ex = sx + Math.cos(a) * L * s, ey = sy + Math.sin(a) * L * s;
      const cxp = sx + Math.cos(a) * L * s * 0.5 + bend * s, cyp = sy + Math.sin(a) * L * s * 0.5;
      ctx.strokeStyle = c2; ctx.lineWidth = Math.max(3, s * 0.2); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(cxp, cyp, ex, ey); ctx.stroke();
      ctx.strokeStyle = c1; ctx.lineWidth = Math.max(2, s * 0.12); ctx.beginPath(); ctx.moveTo(sx - s * 0.03, sy); ctx.quadraticCurveTo(cxp - s * 0.04, cyp, ex - s * 0.03, ey); ctx.stroke();
      // Seitenzweig und leuchtende Spitze
      ctx.strokeStyle = c1; ctx.lineWidth = Math.max(1.5, s * 0.08);
      ctx.beginPath(); ctx.moveTo(cxp, cyp); ctx.lineTo(cxp + Math.cos(a - 0.7) * s * 0.3, cyp + Math.sin(a - 0.7) * s * 0.3); ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${0.55 * gl})`; ctx.beginPath(); ctx.arc(ex, ey, s * 0.07, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(sx, sy, s * 0.35, s * 0.14, 0, 0, TAU); ctx.fill();
  }
  spriteSeaweed(ctx, sx, sy, s, d, t) {
    ctx.lineCap = 'round';
    for (let i = -1; i <= 1; i++) {
      const sw = Math.sin(t * 1.3 + i + (d.seed || 0) * 6) * s * 0.25, L = s * (0.9 + Math.abs(i) * -0.2);
      ctx.strokeStyle = i ? '#2f8f5a' : '#3fb06a'; ctx.lineWidth = Math.max(2, s * 0.1);
      ctx.beginPath(); ctx.moveTo(sx + i * s * 0.15, sy); ctx.quadraticCurveTo(sx + i * s * 0.25 - sw, sy - L * 0.55, sx + i * s * 0.1 + sw, sy - L); ctx.stroke();
    }
  }
  spriteShell(ctx, sx, sy, s, d) {
    const col = (d.seed || 0) > 0.5 ? '#f7dcc8' : '#ffe9b8';
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.arc(sx, sy, s * 0.32, Math.PI * 1.1, Math.PI * 1.9); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(160,100,80,0.5)'; ctx.lineWidth = 1;
    for (let i = 0; i < 5; i++) { const a = Math.PI * (1.15 + i * 0.175); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + Math.cos(a) * s * 0.3, sy + Math.sin(a) * s * 0.3); ctx.stroke(); }
  }
  spriteStarfish(ctx, sx, sy, s, d) {
    ctx.fillStyle = (d.seed || 0) > 0.5 ? '#ff7a3d' : '#ff5f8a'; ctx.beginPath();
    for (let i = 0; i < 10; i++) { const a = (i * Math.PI) / 5 + (d.seed || 0), r = i % 2 ? s * 0.12 : s * 0.3; const px = sx + Math.cos(a) * r, py = sy - s * 0.05 + Math.sin(a) * r * 0.5; i ? ctx.lineTo(px, py) : ctx.moveTo(px, py); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.4)'; for (let i = 0; i < 5; i++) { const a = (i * TAU) / 5 + (d.seed || 0); ctx.beginPath(); ctx.arc(sx + Math.cos(a) * s * 0.15, sy - s * 0.05 + Math.sin(a) * s * 0.075, s * 0.025, 0, TAU); ctx.fill(); }
  }
  spriteChest(ctx, sx, sy, s, t) {
    this.shadow(ctx, sx, sy, s * 0.5);
    const gl = 0.6 + 0.4 * Math.sin(t * 3);
    ctx.fillStyle = `rgba(255,220,120,${0.25 * gl})`; ctx.beginPath(); ctx.arc(sx, sy - s * 0.45, s * 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = '#6b4423'; ctx.fillRect(sx - s * 0.45, sy - s * 0.45, s * 0.9, s * 0.45);
    ctx.fillStyle = '#8a5a2a'; ctx.beginPath(); ctx.moveTo(sx - s * 0.45, sy - s * 0.45); ctx.lineTo(sx - s * 0.5, sy - s * 0.85); ctx.lineTo(sx + s * 0.4, sy - s * 0.85); ctx.lineTo(sx + s * 0.45, sy - s * 0.45); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.47, s * 0.4, s * 0.1, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c9a15a'; ctx.fillRect(sx - s * 0.45, sy - s * 0.3, s * 0.9, s * 0.05); ctx.fillRect(sx - s * 0.06, sy - s * 0.4, s * 0.12, s * 0.15);
  }
  /* Vulkan */
  spriteBasalt(ctx, sx, sy, s, d) {
    this.shadow(ctx, sx, sy, s * 0.5);
    const hs = [0.7, 1.0, 0.55], seed = d.seed || 0;
    for (let i = 0; i < 3; i++) {
      const x = sx + (i - 1) * s * 0.3, hh = s * hs[(i + Math.floor(seed * 3)) % 3], w = s * 0.17;
      ctx.fillStyle = '#2e2a30'; ctx.fillRect(x - w, sy - hh, 2 * w, hh);
      ctx.fillStyle = '#3d383e'; ctx.fillRect(x - w, sy - hh, w * 0.9, hh);
      ctx.fillStyle = '#5a545c'; ctx.beginPath(); ctx.moveTo(x - w, sy - hh); ctx.lineTo(x, sy - hh - w * 0.5); ctx.lineTo(x + w, sy - hh); ctx.lineTo(x, sy - hh + w * 0.5); ctx.closePath(); ctx.fill();
    }
  }
  spriteVent(ctx, sx, sy, s, t) {
    const gl = 0.7 + 0.3 * Math.sin(t * 6 + sx);
    ctx.fillStyle = `rgba(255,110,30,${0.25 * gl})`; ctx.beginPath(); ctx.ellipse(sx, sy, s * 0.5, s * 0.22, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,150,50,${gl})`; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx - s * 0.35, sy + s * 0.05); ctx.lineTo(sx - s * 0.1, sy - s * 0.05); ctx.lineTo(sx + s * 0.1, sy + s * 0.04); ctx.lineTo(sx + s * 0.38, sy - s * 0.03); ctx.stroke();
    for (let i = 0; i < 3; i++) { const u = (t * 0.4 + i * 0.33) % 1; ctx.fillStyle = `rgba(120,100,110,${0.4 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(u * 5 + i) * s * 0.12, sy - s * 0.1 - u * s * 0.9, s * (0.06 + u * 0.18), 0, TAU); ctx.fill(); }
  }
  /* Wüste */
  spritePalm(ctx, sx, sy, s, d, t) {
    this.shadow(ctx, sx, sy, s * 0.5);
    const lean = ((d.seed || 0) - 0.5) * s * 0.6, top = sy - s * 1.6;
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = Math.max(2, s * 0.13); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.quadraticCurveTo(sx + lean * 0.3, sy - s * 0.9, sx + lean, top); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 1; for (let i = 1; i < 6; i++) { const u = i / 6, x = sx + lean * u * u * 0.9 + lean * 0.1 * u, y = sy - (sy - top) * u; ctx.beginPath(); ctx.moveTo(x - s * 0.07, y); ctx.lineTo(x + s * 0.07, y); ctx.stroke(); }
    const tx = sx + lean, sw = Math.sin(t * 1.4 + (d.seed || 0) * 6) * s * 0.06;
    for (let i = 0; i < 7; i++) {
      const a = -Math.PI * 0.95 + (i / 6) * Math.PI * 0.9, L = s * 0.75;
      ctx.strokeStyle = i % 2 ? '#3f9a4e' : '#2f7a3e'; ctx.lineWidth = Math.max(2, s * 0.1);
      ctx.beginPath(); ctx.moveTo(tx, top); ctx.quadraticCurveTo(tx + Math.cos(a) * L * 0.6 + sw, top + Math.sin(a) * L * 0.6 - s * 0.15, tx + Math.cos(a) * L + sw, top + Math.sin(a) * L * 0.5 + s * 0.3); ctx.stroke();
    }
    ctx.fillStyle = '#c9862a'; for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(tx + (i - 1) * s * 0.08, top + s * 0.08, s * 0.05, 0, TAU); ctx.fill(); }
  }
  spriteCactus(ctx, sx, sy, s, d) {
    this.shadow(ctx, sx, sy, s * 0.3);
    const h = s * (0.8 + (d.seed || 0) * 0.4), w = s * 0.14;
    ctx.fillStyle = '#3f8f3a'; ctx.beginPath(); ctx.roundRect(sx - w, sy - h, 2 * w, h, w); ctx.fill();
    ctx.beginPath(); ctx.roundRect(sx - w * 3, sy - h * 0.7, w * 1.4, h * 0.35, w * 0.7); ctx.fill(); ctx.fillRect(sx - w * 3, sy - h * 0.45, w * 2.2, w * 1.3);
    ctx.beginPath(); ctx.roundRect(sx + w * 1.6, sy - h * 0.85, w * 1.4, h * 0.4, w * 0.7); ctx.fill(); ctx.fillRect(sx + w * 0.8, sy - h * 0.55, w * 2.2, w * 1.3);
    ctx.fillStyle = 'rgba(255,255,255,0.5)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(sx + (i % 2 ? -1 : 1) * w * 0.5, sy - h * (0.15 + i * 0.16), s * 0.02, 0, TAU); ctx.fill(); }
    if ((d.seed || 0) > 0.6) { ctx.fillStyle = '#ff5f8a'; ctx.beginPath(); ctx.arc(sx, sy - h - s * 0.02, s * 0.07, 0, TAU); ctx.fill(); }
  }
  spriteUrn(ctx, sx, sy, s, d) {
    this.shadow(ctx, sx, sy, s * 0.3);
    ctx.fillStyle = '#b8683a'; ctx.beginPath(); ctx.moveTo(sx - s * 0.18, sy); ctx.quadraticCurveTo(sx - s * 0.4, sy - s * 0.35, sx - s * 0.16, sy - s * 0.6); ctx.lineTo(sx - s * 0.2, sy - s * 0.68); ctx.lineTo(sx + s * 0.2, sy - s * 0.68); ctx.lineTo(sx + s * 0.16, sy - s * 0.6); ctx.quadraticCurveTo(sx + s * 0.4, sy - s * 0.35, sx + s * 0.18, sy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#e0a060'; ctx.beginPath(); ctx.moveTo(sx - s * 0.18, sy); ctx.quadraticCurveTo(sx - s * 0.4, sy - s * 0.35, sx - s * 0.16, sy - s * 0.6); ctx.lineTo(sx - s * 0.05, sy - s * 0.6); ctx.quadraticCurveTo(sx - s * 0.2, sy - s * 0.35, sx - s * 0.05, sy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#2fb8c9'; ctx.fillRect(sx - s * 0.3, sy - s * 0.42, s * 0.6, s * 0.06);
  }

  /* Hexenhütte: schiefe Bretterhütte mit Schindeldach, Schornstein, leuchtendem Fenster und Tür */
  spriteHut(ctx, sx, sy, s, t) {
    const w = s * 0.62, h = s * 0.62, gl = 0.85 + 0.15 * Math.sin(t * 4);
    this.shadow(ctx, sx, sy, w * 1.2);
    ctx.fillStyle = '#4a3322'; ctx.fillRect(sx - w, sy - h, 2 * w, h);
    ctx.fillStyle = '#5a4030'; ctx.fillRect(sx - w, sy - h, w * 0.5, h);
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1;
    for (let k = 1; k < 6; k++) { const yy = sy - h + (k / 6) * h; ctx.beginPath(); ctx.moveTo(sx - w, yy); ctx.lineTo(sx + w, yy); ctx.stroke(); }
    // schiefes Schindeldach: hoher, leicht gekrümmter Hexenhut-Giebel
    const ax = sx - w * 0.15, ay = sy - h - s * 0.95, eL = sx - w * 1.3, eR = sx + w * 1.25, ey = sy - h + s * 0.06;
    ctx.fillStyle = '#2e1f3f'; ctx.beginPath(); ctx.moveTo(eL, ey); ctx.quadraticCurveTo(sx - w * 0.9, ay + s * 0.35, ax, ay); ctx.quadraticCurveTo(sx + w * 0.55, ay + s * 0.3, eR, ey - s * 0.06); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#4a3466'; ctx.beginPath(); ctx.moveTo(eL, ey); ctx.quadraticCurveTo(sx - w * 0.9, ay + s * 0.35, ax, ay); ctx.lineTo(ax + w * 0.1, ay + s * 0.25); ctx.quadraticCurveTo(sx - w * 0.6, ey - s * 0.25, eL + w * 0.15, ey); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.lineWidth = 1;
    for (let k = 1; k < 4; k++) { const u = k / 4, yy = ey - (ey - ay) * u; const half = (eR - eL) / 2 * (1 - u * 0.85); ctx.beginPath(); ctx.moveTo(ax - half, yy); ctx.lineTo(ax + half, yy); ctx.stroke(); }
    ctx.fillStyle = '#1e1430'; ctx.fillRect(eL - s * 0.04, ey - s * 0.04, eR - eL + s * 0.08, s * 0.08);
    // Schornstein mit grünem Rauch
    ctx.fillStyle = '#5a4a48'; ctx.fillRect(sx + w * 0.62, sy - h - s * 0.55, s * 0.16, s * 0.42);
    for (let i = 0; i < 3; i++) { const u = (t * 0.35 + i * 0.33) % 1; ctx.fillStyle = `rgba(150,255,120,${0.35 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx + w * 0.7 + Math.sin(u * 5 + i) * s * 0.1, sy - h - s * 0.55 - u * s * 0.6, s * (0.06 + u * 0.16), 0, TAU); ctx.fill(); }
    // Fenster
    ctx.fillStyle = `rgba(255,220,110,${0.25 * gl})`; ctx.beginPath(); ctx.arc(sx - w * 0.55, sy - h * 0.62, s * 0.26, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd86a'; ctx.fillRect(sx - w * 0.72, sy - h * 0.8, w * 0.34, h * 0.32);
    ctx.fillStyle = '#4a3322'; ctx.fillRect(sx - w * 0.57, sy - h * 0.8, w * 0.04, h * 0.32); ctx.fillRect(sx - w * 0.72, sy - h * 0.66, w * 0.34, h * 0.04);
    // Tür mit warmem Schein
    ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.moveTo(sx - w * 0.22, sy); ctx.lineTo(sx - w * 0.22, sy - h * 0.55); ctx.arc(sx, sy - h * 0.55, w * 0.22, Math.PI, 0); ctx.lineTo(sx + w * 0.22, sy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,170,60,${0.4 * gl})`; ctx.beginPath(); ctx.ellipse(sx, sy - h * 0.28, w * 0.16, h * 0.28, 0, 0, TAU); ctx.fill();
    // Laterne neben der Tür
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(sx + w * 0.45, sy - h * 0.7, s * 0.05, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,200,90,${0.2 * gl})`; ctx.beginPath(); ctx.arc(sx + w * 0.45, sy - h * 0.7, s * 0.16, 0, TAU); ctx.fill();
  }
  spriteCandle(ctx, sx, sy, s, t) {
    const f = 0.8 + 0.2 * Math.sin(t * 9 + sx);
    ctx.fillStyle = `rgba(255,200,90,${0.15 * f})`; ctx.beginPath(); ctx.arc(sx, sy - s * 0.42, s * 0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f1e6c8'; ctx.fillRect(sx - s * 0.06, sy - s * 0.32, s * 0.12, s * 0.32);
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.4, s * 0.04, s * 0.09 * f, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.38, s * 0.02, s * 0.05 * f, 0, 0, TAU); ctx.fill();
  }
  spriteSkull(ctx, sx, sy, s) {
    this.shadow(ctx, sx, sy, s * 0.22);
    ctx.fillStyle = '#e8e2d2'; ctx.beginPath(); ctx.arc(sx, sy - s * 0.22, s * 0.18, 0, TAU); ctx.fill(); ctx.fillRect(sx - s * 0.1, sy - s * 0.15, s * 0.2, s * 0.13);
    ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(sx - s * 0.07, sy - s * 0.24, s * 0.05, 0, TAU); ctx.arc(sx + s * 0.07, sy - s * 0.24, s * 0.05, 0, TAU); ctx.fill();
    ctx.fillRect(sx - s * 0.015, sy - s * 0.17, s * 0.03, s * 0.04);
  }
  spriteBottle(ctx, sx, sy, s, d) {
    const cols = ['#b04ee6', '#4fd0ff', '#a6ff5e', '#ff7a3d'], c = cols[Math.floor((d.seed || 0) * 4) % 4];
    ctx.fillStyle = c; ctx.fillRect(sx - s * 0.08, sy - s * 0.3, s * 0.16, s * 0.3); ctx.fillRect(sx - s * 0.04, sy - s * 0.42, s * 0.08, s * 0.14);
    ctx.fillStyle = '#9a6b3a'; ctx.fillRect(sx - s * 0.04, sy - s * 0.46, s * 0.08, s * 0.05);
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(sx - s * 0.06, sy - s * 0.28, s * 0.04, s * 0.22);
  }
  spriteShelf(ctx, sx, sy, s, d) {
    this.shadow(ctx, sx, sy, s * 0.5);
    ctx.fillStyle = '#3e2a16'; ctx.fillRect(sx - s * 0.5, sy - s * 1.2, s * 0.08, s * 1.2); ctx.fillRect(sx + s * 0.42, sy - s * 1.2, s * 0.08, s * 1.2);
    ctx.fillStyle = '#6a4a2a';
    for (const yy of [0.45, 0.85, 1.2]) ctx.fillRect(sx - s * 0.5, sy - s * yy, s, s * 0.06);
    const cols = ['#b04ee6', '#4fd0ff', '#a6ff5e', '#ff7a3d', '#ffd166'];
    for (let k = 0; k < 6; k++) {
      const row = k < 3 ? 0.85 : 1.2, x = sx - s * 0.32 + (k % 3) * s * 0.3;
      ctx.fillStyle = cols[(k + Math.floor((d.seed || 0) * 5)) % 5]; ctx.fillRect(x - s * 0.06, sy - s * row - s * 0.22, s * 0.12, s * 0.22); ctx.fillRect(x - s * 0.03, sy - s * row - s * 0.3, s * 0.06, s * 0.1);
    }
    ctx.fillStyle = '#e8e2d2'; ctx.beginPath(); ctx.arc(sx + s * 0.25, sy - s * 0.55, s * 0.09, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(sx - s * 0.4, sy - s * 0.62, s * 0.2, s * 0.16);
  }
  spriteBroom(ctx, sx, sy, s, d) {
    const lean = ((d.seed || 0) > 0.5 ? 1 : -1) * s * 0.25;
    ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath(); ctx.moveTo(sx, sy - s * 0.1); ctx.lineTo(sx + lean, sy - s * 1.25); ctx.stroke();
    ctx.fillStyle = '#c9a15a'; ctx.beginPath(); ctx.moveTo(sx - s * 0.16, sy); ctx.lineTo(sx + s * 0.16, sy); ctx.lineTo(sx + s * 0.06, sy - s * 0.4); ctx.lineTo(sx - s * 0.06, sy - s * 0.4); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8a6a2a'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(sx - s * 0.06, sy - s * 0.4); ctx.lineTo(sx + s * 0.06, sy - s * 0.4); ctx.stroke();
  }

  /* Stehendes Messing-Zahnrad auf einer Achse */
  spriteGear(ctx, sx, sy, s, d, t) {
    const r = s * 0.55, teeth = 8 + Math.floor((d.seed || 0) * 5), sp = ((d.seed || 0) > 0.5 ? 1 : -1) * (0.5 + (d.seed || 0));
    this.shadow(ctx, sx, sy, r * 0.9);
    ctx.fillStyle = '#3a3036'; ctx.fillRect(sx - s * 0.07, sy - s * 0.75, s * 0.14, s * 0.75);
    const cy = sy - s * 0.75 - r * 0.6;
    const g = ctx.createRadialGradient(sx - r * 0.3, cy - r * 0.3, r * 0.1, sx, cy, r);
    g.addColorStop(0, '#e6bd6a'); g.addColorStop(1, '#8a5f22');
    ctx.fillStyle = g; this.gearPath(ctx, sx, cy, r, teeth, t * sp); ctx.fill();
    ctx.strokeStyle = '#4a3212'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    ctx.fillStyle = '#2a2026'; ctx.beginPath(); ctx.arc(sx, cy, r * 0.18, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6a4a1a'; ctx.lineWidth = Math.max(1, r * 0.1);
    for (let i = 0; i < 4; i++) { const a = t * sp + (i * TAU) / 4; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * r * 0.22, cy + Math.sin(a) * r * 0.22); ctx.lineTo(sx + Math.cos(a) * r * 0.7, cy + Math.sin(a) * r * 0.7); ctx.stroke(); }
  }
  /* Liegendes Zahnrad im Boden (dreht sich langsam) */
  spriteGearFlat(ctx, d, s, t) {
    const [sx, sy] = this.proj(d.x, d.y, (d.z || 0) + 0.02), r = s * 0.7, teeth = 10 + Math.floor((d.seed || 0) * 6);
    const sp = d.speed ?? (((d.seed || 0) > 0.5 ? 1 : -1) * (0.25 + (d.seed || 0) * 0.4));
    ctx.save(); ctx.translate(sx, sy); ctx.scale(1, this.cam.tilt);
    ctx.fillStyle = '#4a3a20'; this.gearPath(ctx, 0, r * 0.12 / this.cam.tilt, r, teeth, t * sp); ctx.fill();
    ctx.fillStyle = '#b8873a'; this.gearPath(ctx, 0, 0, r, teeth, t * sp); ctx.fill();
    ctx.strokeStyle = '#5a3f18'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    ctx.fillStyle = '#2a2026'; ctx.beginPath(); ctx.arc(0, 0, r * 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a5522'; ctx.lineWidth = Math.max(1, r * 0.09);
    for (let i = 0; i < 5; i++) { const a = t * sp + (i * TAU) / 5; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.25, Math.sin(a) * r * 0.25); ctx.lineTo(Math.cos(a) * r * 0.7, Math.sin(a) * r * 0.7); ctx.stroke(); }
    ctx.restore();
  }
  /* Dampfrohr mit Ventil und Dampfwölkchen */
  spritePipe(ctx, sx, sy, s, d, t) {
    this.shadow(ctx, sx, sy, s * 0.3);
    ctx.fillStyle = '#8a6a34'; ctx.fillRect(sx - s * 0.12, sy - s * 1.3, s * 0.24, s * 1.3);
    ctx.fillStyle = '#c99a4a'; ctx.fillRect(sx - s * 0.12, sy - s * 1.3, s * 0.08, s * 1.3);
    ctx.fillStyle = '#5a4020'; ctx.fillRect(sx - s * 0.18, sy - s * 0.9, s * 0.36, s * 0.1); ctx.fillRect(sx - s * 0.18, sy - s * 1.32, s * 0.36, s * 0.1);
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(sx + s * 0.2, sy - s * 0.6, s * 0.1, 0, TAU); ctx.fill();
    for (let i = 0; i < 3; i++) { // Dampf
      const u = ((t * 0.5 + i * 0.33 + (d.seed || 0)) % 1);
      ctx.fillStyle = `rgba(240,240,240,${0.35 * (1 - u)})`; ctx.beginPath(); ctx.arc(sx + Math.sin(u * 6 + i) * s * 0.15, sy - s * 1.35 - u * s * 0.8, s * (0.08 + u * 0.18), 0, TAU); ctx.fill();
    }
  }
  /* Große Turmuhr auf einem Pfosten */
  spriteClock(ctx, sx, sy, s, t) {
    const r = s * 0.6, cy = sy - s * 1.4;
    this.shadow(ctx, sx, sy, r * 0.8);
    ctx.fillStyle = '#3a3036'; ctx.fillRect(sx - s * 0.08, sy - s * 1.4, s * 0.16, s * 1.4);
    ctx.fillStyle = '#8a5f22'; ctx.beginPath(); ctx.arc(sx, cy, r * 1.12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f3e6c4'; ctx.beginPath(); ctx.arc(sx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a2a10'; ctx.lineWidth = Math.max(1, s * 0.04);
    for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82); ctx.lineTo(sx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95); ctx.stroke(); }
    const am = t * 0.5 - Math.PI / 2, ah = t * 0.5 / 12 - Math.PI / 2;
    ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx + Math.cos(ah) * r * 0.5, cy + Math.sin(ah) * r * 0.5); ctx.stroke();
    ctx.lineWidth = Math.max(1, s * 0.04); ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx + Math.cos(am) * r * 0.78, cy + Math.sin(am) * r * 0.78); ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(sx, cy, r * 0.07, 0, TAU); ctx.fill();
  }
  spriteTree(ctx, sx, sy, s, d, t) {
    this.shadow(ctx, sx, sy, s * 0.6);
    ctx.fillStyle = '#6b4423'; ctx.fillRect(sx - s * 0.1, sy - s * 1.0, s * 0.2, s * 1.0);
    const cols = d.glow ? ['#2e8f9a', '#3fb3b0', '#6fe0d0'] : ['#2f7a3e', '#3f9a4e', '#63c261'];
    const blobs = [[0, -1.35, 0.72], [-0.38, -1.15, 0.5], [0.4, -1.2, 0.52], [-0.2, -1.75, 0.5], [0.25, -1.8, 0.48]];
    blobs.forEach((b, i) => { ctx.fillStyle = cols[Math.min(2, Math.floor(i / 2))]; ctx.beginPath(); ctx.arc(sx + b[0] * s, sy + b[1] * s, b[2] * s, 0, TAU); ctx.fill(); });
    ctx.fillStyle = '#9ee06f'; ctx.beginPath(); ctx.arc(sx - s * 0.1, sy - s * 1.8, s * 0.3, 0, TAU); ctx.fill();
    if (d.glow) { // Feen-Lichter
      for (let i = 0; i < 4; i++) {
        const a = t * 1.5 + i * 1.6;
        ctx.fillStyle = 'rgba(255,255,180,0.9)'; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * s * 0.7, sy - s * 1.3 + Math.sin(a * 1.3) * s * 0.4, s * 0.06, 0, TAU); ctx.fill();
      }
    }
  }
  spritePine(ctx, sx, sy, s, c1, c2, snow = false) {
    this.shadow(ctx, sx, sy, s * 0.5);
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(sx - s * 0.08, sy - s * 0.5, s * 0.16, s * 0.5);
    for (let i = 0; i < 3; i++) {
      const w = s * (0.75 - i * 0.18), y0 = sy - s * (0.45 + i * 0.55), h = s * 0.8;
      ctx.fillStyle = i % 2 ? c1 : c2; ctx.beginPath(); ctx.moveTo(sx - w, y0); ctx.lineTo(sx + w, y0); ctx.lineTo(sx, y0 - h); ctx.closePath(); ctx.fill();
      if (snow) { ctx.fillStyle = '#f4faff'; ctx.beginPath(); ctx.moveTo(sx - w * 0.6, y0 - h * 0.35); ctx.lineTo(sx + w * 0.6, y0 - h * 0.35); ctx.lineTo(sx, y0 - h); ctx.closePath(); ctx.fill(); }
    }
  }
  spriteDeadTree(ctx, sx, sy, s, col = '#2a2030', embers = false) {
    this.shadow(ctx, sx, sy, s * 0.4);
    if (embers) { ctx.fillStyle = 'rgba(255,120,40,0.85)'; for (const [ox, oy] of [[-0.5, -1.3], [0.55, -1.5], [-0.1, -1.7]]) { ctx.beginPath(); ctx.arc(sx + ox * s, sy + oy * s, s * 0.05, 0, TAU); ctx.fill(); } }
    ctx.strokeStyle = col; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.16;
    ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx + s * 0.1, sy - s * 1.2); ctx.stroke();
    ctx.lineWidth = s * 0.09;
    ctx.beginPath(); ctx.moveTo(sx + s * 0.05, sy - s * 0.7); ctx.lineTo(sx - s * 0.5, sy - s * 1.3); ctx.moveTo(sx + s * 0.08, sy - s * 0.95); ctx.lineTo(sx + s * 0.55, sy - s * 1.5); ctx.moveTo(sx + s * 0.1, sy - s * 1.2); ctx.lineTo(sx - s * 0.1, sy - s * 1.7); ctx.stroke();
  }
  spriteMushroom(ctx, x, y, z, size, capCol, spots = false) {
    const s = this.scale * size, [sx, sy] = this.proj(x, y, z);
    this.shadow(ctx, sx, sy, s * 0.55);
    ctx.fillStyle = '#f3e6c8'; ctx.fillRect(sx - s * 0.18, sy - s * 0.55, s * 0.36, s * 0.55);
    ctx.fillStyle = shade(capCol, 0.75); ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.5, s * 0.62, s * 0.24, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = capCol; ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.62, s * 0.62, s * 0.4, 0, Math.PI, TAU); ctx.fill();
    if (spots) { ctx.fillStyle = 'rgba(255,255,255,0.85)'; [[-0.3, -0.75, 0.1], [0.2, -0.9, 0.08], [0.35, -0.68, 0.07]].forEach(p => { ctx.beginPath(); ctx.arc(sx + p[0] * s, sy + p[1] * s, p[2] * s, 0, TAU); ctx.fill(); }); }
  }
  spriteFlowers(ctx, sx, sy, s, d) {
    ctx.fillStyle = '#5fae4a'; ctx.beginPath(); ctx.ellipse(sx, sy, s * 0.45, s * 0.22, 0, 0, TAU); ctx.fill();
    const cols = ['#ff6b9d', '#ffd166', '#ffffff', '#c77dff'];
    for (let i = 0; i < 5; i++) { ctx.fillStyle = cols[(i + Math.floor((d.seed || 0) * 4)) % 4]; ctx.beginPath(); ctx.arc(sx + ((i * 0.37) % 1 - 0.5) * s * 0.7, sy - s * 0.05 - ((i * 0.61) % 1) * s * 0.2, s * 0.06, 0, TAU); ctx.fill(); }
  }
  spriteRock(ctx, sx, sy, s, c1, c2, snow = false) {
    this.shadow(ctx, sx, sy, s * 0.45);
    ctx.fillStyle = c2; ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.2, s * 0.45, s * 0.3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = c1; ctx.beginPath(); ctx.ellipse(sx - s * 0.1, sy - s * 0.3, s * 0.3, s * 0.2, -0.3, 0, TAU); ctx.fill();
    if (snow) { ctx.fillStyle = '#f4faff'; ctx.beginPath(); ctx.ellipse(sx - s * 0.05, sy - s * 0.4, s * 0.25, s * 0.1, -0.2, 0, TAU); ctx.fill(); }
  }
  spriteCrystal(ctx, x, y, z, size, c1, c2) {
    const s = this.scale * size, [sx, sy] = this.proj(x, y, z);
    this.shadow(ctx, sx, sy, s * 0.4);
    const shards = [[0, 1.3, 0.22], [-0.3, 0.8, 0.16], [0.32, 0.9, 0.15]];
    for (const [ox, h, w] of shards) {
      const bx = sx + ox * s;
      ctx.fillStyle = c2; ctx.beginPath(); ctx.moveTo(bx - w * s, sy); ctx.lineTo(bx, sy - h * s); ctx.lineTo(bx + w * s, sy); ctx.closePath(); ctx.fill();
      ctx.fillStyle = c1; ctx.beginPath(); ctx.moveTo(bx - w * s, sy); ctx.lineTo(bx, sy - h * s); ctx.lineTo(bx - w * 0.15 * s, sy - h * 0.1 * s); ctx.closePath(); ctx.fill();
    }
    ctx.fillStyle = rgba(c1, 0.12); ctx.beginPath(); ctx.arc(sx, sy - s * 0.6, s * 0.8, 0, TAU); ctx.fill();
  }
  spriteLantern(ctx, sx, sy, s, t) {
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = s * 0.08; ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - s * 1.2); ctx.stroke();
    const gl = 0.8 + 0.2 * Math.sin(t * 5 + sx);
    ctx.fillStyle = `rgba(255,200,90,${0.18 * gl})`; ctx.beginPath(); ctx.arc(sx, sy - s * 1.25, s * 0.55, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(sx, sy - s * 1.25, s * 0.16 * gl, 0, TAU); ctx.fill();
    ctx.fillStyle = '#3a2a1a'; ctx.fillRect(sx - s * 0.12, sy - s * 1.5, s * 0.24, s * 0.06);
  }
  spriteTower(ctx, sx, sy, s, d) {
    const w = s * 0.55, h = s * 1.7;
    this.shadow(ctx, sx, sy, w * 1.1);
    ctx.fillStyle = '#cfcad8'; ctx.fillRect(sx - w, sy - h, w, h);
    ctx.fillStyle = '#8e889c'; ctx.fillRect(sx, sy - h, w, h);
    if (d.dome) { // Zwiebelkuppel (Wüstenpalast)
      ctx.fillStyle = d.dome; ctx.beginPath(); ctx.moveTo(sx - w * 1.1, sy - h); ctx.quadraticCurveTo(sx - w * 1.3, sy - h - s * 0.8, sx, sy - h - s * 1.15); ctx.quadraticCurveTo(sx + w * 1.3, sy - h - s * 0.8, sx + w * 1.1, sy - h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.moveTo(sx - w * 0.9, sy - h); ctx.quadraticCurveTo(sx - w * 1.0, sy - h - s * 0.7, sx - w * 0.1, sy - h - s * 1.05); ctx.lineTo(sx - w * 0.3, sy - h); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd166'; ctx.fillRect(sx - s * 0.03, sy - h - s * 1.45, s * 0.06, s * 0.35); ctx.beginPath(); ctx.arc(sx, sy - h - s * 1.5, s * 0.08, 0, TAU); ctx.fill();
      ctx.fillStyle = '#e8d3a8'; ctx.fillRect(sx - w, sy - h, 2 * w, h);
      ctx.fillStyle = '#b8894a'; ctx.fillRect(sx, sy - h, w, h);
      ctx.fillStyle = '#2a4a6a'; ctx.beginPath(); ctx.moveTo(sx - w * 0.25, sy - h * 0.4); ctx.lineTo(sx - w * 0.25, sy - h * 0.62); ctx.arc(sx, sy - h * 0.62, w * 0.25, Math.PI, 0); ctx.lineTo(sx + w * 0.25, sy - h * 0.4); ctx.closePath(); ctx.fill();
      return;
    }
    ctx.fillStyle = d.roof || '#c94a5a'; ctx.beginPath(); ctx.moveTo(sx - w * 1.2, sy - h); ctx.lineTo(sx + w * 1.2, sy - h); ctx.lineTo(sx, sy - h - s * 1.1); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.fillRect(sx - w * 0.25, sy - h * 0.62, w * 0.5, h * 0.22);
    if (d.witch) { ctx.fillStyle = '#a6ff5e'; ctx.beginPath(); ctx.arc(sx, sy - h - s * 1.25, s * 0.14, 0, TAU); ctx.fill(); }
    ctx.fillStyle = '#ff4f6d'; ctx.fillRect(sx, sy - h - s * 1.5, s * 0.03, s * 0.45); ctx.beginPath(); ctx.moveTo(sx, sy - h - s * 1.5); ctx.lineTo(sx + s * 0.3, sy - h - s * 1.4); ctx.lineTo(sx, sy - h - s * 1.28); ctx.fill();
  }
  spriteCloud(ctx, sx, sy, s, t) {
    const yy = sy + Math.sin(t + sx) * s * 0.08;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath(); ctx.ellipse(sx, yy, s * 1.1, s * 0.4, 0, 0, TAU); ctx.ellipse(sx - s * 0.5, yy - s * 0.1, s * 0.6, s * 0.35, 0, 0, TAU); ctx.ellipse(sx + s * 0.45, yy - s * 0.15, s * 0.7, s * 0.4, 0, 0, TAU); ctx.fill();
  }
  spriteStalagmite(ctx, sx, sy, s) {
    this.shadow(ctx, sx, sy, s * 0.35);
    ctx.fillStyle = '#6a5040'; ctx.beginPath(); ctx.moveTo(sx - s * 0.3, sy); ctx.lineTo(sx + s * 0.3, sy); ctx.lineTo(sx + s * 0.05, sy - s * 1.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#8c6e58'; ctx.beginPath(); ctx.moveTo(sx - s * 0.3, sy); ctx.lineTo(sx - s * 0.02, sy - s * 0.2); ctx.lineTo(sx + s * 0.05, sy - s * 1.2); ctx.closePath(); ctx.fill();
  }
  spriteBones(ctx, sx, sy, s) {
    ctx.fillStyle = '#efe8d8'; ctx.beginPath(); ctx.arc(sx, sy - s * 0.15, s * 0.18, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(sx - s * 0.06, sy - s * 0.17, s * 0.04, 0, TAU); ctx.arc(sx + s * 0.06, sy - s * 0.17, s * 0.04, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#efe8d8'; ctx.lineWidth = s * 0.06; ctx.beginPath(); ctx.moveTo(sx + s * 0.25, sy); ctx.lineTo(sx + s * 0.6, sy - s * 0.12); ctx.stroke();
  }
  spriteAnvil(ctx, sx, sy, s) {
    this.shadow(ctx, sx, sy, s * 0.45);
    ctx.fillStyle = '#2a2a30'; ctx.fillRect(sx - s * 0.2, sy - s * 0.35, s * 0.4, s * 0.35);
    ctx.fillStyle = '#4a4a55'; ctx.beginPath(); ctx.moveTo(sx - s * 0.5, sy - s * 0.55); ctx.lineTo(sx + s * 0.45, sy - s * 0.55); ctx.lineTo(sx + s * 0.3, sy - s * 0.33); ctx.lineTo(sx - s * 0.25, sy - s * 0.33); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6b6b78'; ctx.fillRect(sx - s * 0.5, sy - s * 0.62, s * 0.95, s * 0.08);
  }
  spriteBrazier(ctx, sx, sy, s, t) {
    ctx.fillStyle = '#3a3a44'; ctx.fillRect(sx - s * 0.06, sy - s * 0.5, s * 0.12, s * 0.5);
    ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.5, s * 0.28, s * 0.12, 0, 0, TAU); ctx.fill();
    const f = 0.8 + 0.2 * Math.sin(t * 11 + sx);
    ctx.fillStyle = 'rgba(255,140,40,0.25)'; ctx.beginPath(); ctx.arc(sx, sy - s * 0.7, s * 0.5 * f, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff7a1f'; ctx.beginPath(); ctx.moveTo(sx - s * 0.2, sy - s * 0.5); ctx.quadraticCurveTo(sx - s * 0.1, sy - s * 0.9 * f, sx, sy - s * 1.05 * f); ctx.quadraticCurveTo(sx + s * 0.1, sy - s * 0.85 * f, sx + s * 0.2, sy - s * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe07a'; ctx.beginPath(); ctx.moveTo(sx - s * 0.1, sy - s * 0.5); ctx.quadraticCurveTo(sx, sy - s * 0.75 * f, sx + s * 0.1, sy - s * 0.5); ctx.closePath(); ctx.fill();
  }
  spriteGold(ctx, sx, sy, s, t) {
    ctx.fillStyle = '#e0a52a'; ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.12, s * 0.45, s * 0.22, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd75e'; ctx.beginPath(); ctx.ellipse(sx - s * 0.05, sy - s * 0.22, s * 0.3, s * 0.15, 0, 0, TAU); ctx.fill();
    const sp = (t * 2) % 1; ctx.fillStyle = `rgba(255,255,255,${1 - sp})`; ctx.beginPath(); ctx.arc(sx + s * 0.15, sy - s * 0.3, s * 0.05 + sp * s * 0.04, 0, TAU); ctx.fill();
  }
  spritePumpkin(ctx, sx, sy, s, t) {
    this.shadow(ctx, sx, sy, s * 0.4);
    ctx.fillStyle = '#e8701a'; ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.25, s * 0.4, s * 0.3, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#b8500a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.25, s * 0.15, s * 0.3, 0, 0, TAU); ctx.stroke();
    const gl = 0.6 + 0.4 * Math.abs(Math.sin(t * 3 + sx));
    ctx.fillStyle = `rgba(255,230,120,${gl})`;
    ctx.beginPath(); ctx.moveTo(sx - s * 0.2, sy - s * 0.3); ctx.lineTo(sx - s * 0.08, sy - s * 0.22); ctx.lineTo(sx - s * 0.22, sy - s * 0.18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx + s * 0.2, sy - s * 0.3); ctx.lineTo(sx + s * 0.08, sy - s * 0.22); ctx.lineTo(sx + s * 0.22, sy - s * 0.18); ctx.fill();
    ctx.beginPath(); ctx.moveTo(sx - s * 0.18, sy - s * 0.1); ctx.lineTo(sx, sy - s * 0.02); ctx.lineTo(sx + s * 0.18, sy - s * 0.1); ctx.lineTo(sx, sy - s * 0.14); ctx.fill();
    ctx.fillStyle = '#3a6a2a'; ctx.fillRect(sx - s * 0.04, sy - s * 0.65, s * 0.08, s * 0.15);
  }
  spriteCauldron(ctx, d, s, t) {
    const body = this.circlePoly(d.x, d.y, 0.45 * d.s, 10);
    this.prism(ctx, body, 0, 0.6 * d.s, '#3b3b45', '#1a1a20');
    this.isoEllipse(ctx, d.x, d.y, 0.62 * d.s, 0.36 * d.s, '#7dff4a');
    const [bx, by] = this.proj(d.x, d.y, 0.7 * d.s + ((t * 0.7) % 1) * 0.5);
    ctx.fillStyle = 'rgba(160,255,120,0.6)'; ctx.beginPath(); ctx.arc(bx, by, s * 0.08, 0, TAU); ctx.fill();
  }
}
