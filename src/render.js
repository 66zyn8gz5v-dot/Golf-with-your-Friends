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
    // Kacheln
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      const c = tiles[y][x];
      if (c === '.' || c === 'x' || c === 'w' || c === 'l') continue;
      const [tsx, tsy] = this.proj(x + 0.5, y + 0.5);
      if (!this.onScreen(tsx, tsy, cull)) continue;
      const poly = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
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
    this.drawCupHole(ctx);
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
    items.push({ x: lv.cup.x, y: lv.cup.y, bias: 0.01, draw: () => this.drawFlag(ctx, t) });
    // Der Ball wird zum Schluss gezeichnet, damit er nie hinter Bäumen oder Mauern verschwindet
    for (const it of items) { it.k = this.depth(it.x, it.y) + (it.bias || 0); const p = this.proj(it.x, it.y); it.sx = p[0]; it.sy = p[1]; }
    items.sort((a, b) => a.k - b.k);
    const b = state.ball, bp = b ? this.proj(b.x, b.y, 0) : null, bk = b ? this.depth(b.x, b.y) : 0;
    const cullM = this.scale * 3.5, fadeW = this.scale * 2.2, fadeH = this.scale * 3.2;
    for (const it of items) {
      if (!this.onScreen(it.sx, it.sy, cullM)) continue;
      // Objekte, die vor dem Ball stehen und ihn verdecken würden, fast durchsichtig zeichnen
      const fade = bp && !it.ball && it.k > bk + 0.3 && Math.abs(it.sx - bp[0]) < fadeW && it.sy > bp[1] - this.scale * 0.4 && it.sy < bp[1] + fadeH;
      if (fade) ctx.globalAlpha = 0.22;
      it.draw();
      if (fade) ctx.globalAlpha = 1;
    }
    if (b) this.drawBall(ctx, b);

    // Partikel
    for (const p of state.particles) {
      const [sx, sy] = this.proj(p.x, p.y, p.z);
      ctx.globalAlpha = Math.max(0, p.life / p.max);
      ctx.fillStyle = p.color; ctx.beginPath(); ctx.arc(sx, sy, p.size * this.scale, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
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
    let r = BALL_R * s, z = b.z + 0.3;
    if (b.sunk) { // in das Loch fallen: kleiner werden, absinken, dann weg
      const p = Math.min(1, b.sinkT / 0.35);
      if (p >= 1) return;
      r *= 1 - p * 0.8; z = 0.3 - p * 0.6;
    } else this.isoEllipse(ctx, b.x, b.y, 0, 0.3 * (1 - b.z * 0.2), 'rgba(0,0,0,0.3)');
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
    if (ob.type === 'boost' || ob.type === 'field') {
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
    }
  }

  pushObstacle(items, ctx, ob, t) {
    const th = this.theme;
    if (ob.type === 'ramp') {
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
      items.push({ x: ob.x, y: ob.y, bias: 0.3, draw: () => this.drawMover(ctx, ob, t) });
    } else if (ob.type === 'rotor') {
      const hub = this.circlePoly(ob.x, ob.y, ob.hubR, 8);
      items.push({ x: ob.x, y: ob.y, draw: () => {
        this.prism(ctx, hub, 0, ob.height + 0.25, th.rotor.top, th.rotor.side);
        for (let i = 0; i < ob.blades; i++) {
          const a = ob.bladeAngle(i), ca = Math.cos(a), sa = Math.sin(a), tk = ob.thick;
          const p = [[ob.x - sa * tk, ob.y + ca * tk], [ob.x + ca * ob.len - sa * tk, ob.y + sa * ob.len + ca * tk],
            [ob.x + ca * ob.len + sa * tk, ob.y + sa * ob.len - ca * tk], [ob.x + sa * tk, ob.y - ca * tk]];
          if (ob.style === 'crystal') { ctx.globalAlpha = 0.85; this.prism(ctx, p, 0.05, ob.height, '#eaf8ff', '#7fc0f0'); ctx.globalAlpha = 1; }
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
    }
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
      this.prism(ctx, poly, 0.1, 1.0, '#3d9a4a', '#215a2a', { outline: '#123a18' });
      // Kopf in Bewegungsrichtung
      const hx = ob.x + ob.dir * (ob.w / 2 + 0.35), hy = ob.y;
      const head = this.circlePoly(hx, hy, 0.45, 8);
      this.prism(ctx, head, 0.5, 0.7, '#4fb35a', '#215a2a');
      const [ex, ey] = this.proj(hx, hy - 0.2, 1.05);
      ctx.fillStyle = '#ffd12a'; ctx.beginPath(); ctx.arc(ex, ey, s * 0.09, 0, TAU); ctx.fill();
      ctx.fillStyle = '#000'; ctx.beginPath(); ctx.arc(ex, ey, s * 0.04, 0, TAU); ctx.fill();
      // Zacken
      for (let i = 0; i < 4; i++) {
        const zx = ob.x - ob.w / 2 + (i + 0.5) * (ob.w / 4);
        const [a0, a1] = this.proj(zx, ob.y, 1.1), [b0, b1] = this.proj(zx, ob.y, 1.45);
        ctx.strokeStyle = '#e8b04a'; ctx.lineWidth = Math.max(2, s * 0.09); ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
      }
      // Feuerhauch
      const fl = 0.4 + 0.3 * Math.sin(t * 9);
      for (let i = 0; i < 3; i++) {
        const [fx, fy] = this.proj(hx + ob.dir * (0.5 + i * 0.3 * fl), hy + (i - 1) * 0.15, 0.75 + Math.sin(t * 7 + i) * 0.08);
        ctx.fillStyle = i === 0 ? '#fff1a0' : i === 1 ? '#ff9a2a' : '#ff5a1f'; ctx.globalAlpha = 0.9 - i * 0.25;
        ctx.beginPath(); ctx.arc(fx, fy, s * (0.16 - i * 0.03), 0, TAU); ctx.fill();
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
      default: break;
    }
  }
  shadow(ctx, sx, sy, r) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.5, 0, 0, TAU); ctx.fill(); }
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
  spriteDeadTree(ctx, sx, sy, s) {
    this.shadow(ctx, sx, sy, s * 0.4);
    ctx.strokeStyle = '#2a2030'; ctx.lineCap = 'round'; ctx.lineWidth = s * 0.16;
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
