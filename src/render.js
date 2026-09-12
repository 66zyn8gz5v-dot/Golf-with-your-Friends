/* 2,5D-Darstellung auf Canvas mit frei drehbarer Kamera (Schrägsicht von oben, hinter dem Ball).
   Welt: x/y in Kacheln, z nach oben. Die Kamera hat Fokus, Drehwinkel, Zoom und Neigung. */
const CAM_TILT = 0.62;      // Neigung im Hochformat: 1 = senkrecht von oben, kleiner = flacher
const CAM_TILT_WIDE = 0.80; // Neigung auf breiten Bildschirmen (Tablet quer, Laptop)
const CAM_ZF = 0.9;      // Skalierung der Höhe

/* Die Tiefe der Bahn läuft immer über die Höhe des Bildes. Im Hochformat ist dafür viel Platz,
   quer auf dem Tablet dagegen wenig – mit der flachen Neigung des Hochformats wirkt das Feld dort
   platt gedrückt. Darum wird die Sicht mit wachsender Bildbreite Schritt für Schritt steiler. */
function camTiltFor(w, h) {
  const k = Math.max(0, Math.min(1, (w / Math.max(1, h) - 0.85) / 0.55));
  return CAM_TILT + (CAM_TILT_WIDE - CAM_TILT) * k;
}

function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
/* Aufhellen oder Abdunkeln. Das Ergebnis ist wieder eine Hex-Farbe, nicht 'rgb(...)' - und das ist
   kein Schönheitsgrund: prism, frustum und walze dunkeln die Farbe, die sie bekommen, selbst noch
   einmal ab. Gab shade 'rgb(...)' zurück, las hexToRgb daraus NaN und der ganze Körper wurde
   schwarz. Ein geschachteltes shade(shade(c, 0.8), 0.6) muss funktionieren. */
function shade(hex, f) {
  const [r, g, b] = hexToRgb(hex);
  const c = v => Math.max(0, Math.min(255, Math.round(v * f)));
  return '#' + [c(r), c(g), c(b)].map(v => v.toString(16).padStart(2, '0')).join('');
}
function rgba(hex, a) { const [r, g, b] = hexToRgb(hex); return `rgba(${r},${g},${b},${a})`; }
function convexHull(pts) { // Andrew's monotone chain
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]), cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], up = [];
  for (const q of p) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], q) <= 0) up.pop(); up.push(q); }
  return lo.slice(0, -1).concat(up.slice(0, -1));
}
function polyArea(p) {
  let a = 0;
  for (let i = 0; i < p.length; i++) { const q = p[i], r = p[(i + 1) % p.length]; a += q[0] * r[1] - r[0] * q[1]; }
  return a / 2;
}

/* Fahnen je Thema: Haupt- und Zweitfarbe des Tuchs, Muster, Wappen, Stangen- und Spitzenfarbe */
const FLAG_DESIGNS = {
  meadow:    { main: '#e63b5a', second: '#ffd166', pattern: 'band', emblem: 'crown', emblemColor: '#ffd166', emblemDark: '#8a5a10' },
  mushroom:  { main: '#c94a7a', second: '#ffd166', pattern: 'checker', emblem: 'mushroom', emblemColor: '#e0575a', emblemDark: '#7a2a30' },
  forge:     { main: '#b8843f', second: '#3d3a45', pattern: 'edge', emblem: 'hammer', emblemColor: '#c9c9d2', emblemDark: '#3a3a44', finial: '#ffb347' },
  forest:    { main: '#1f6a3a', second: '#7fe8ff', pattern: 'diag', emblem: 'star', emblemColor: '#fff7b0', emblemDark: '#2b6d43' },
  dragon:    { main: '#7a1f1f', second: '#ff7a3d', pattern: 'chevron', emblem: 'flame', emblemColor: '#ff9a2a', emblemDark: '#7a1f1f', finial: '#ff7a3d' },
  ice:       { main: '#5b90c6', second: '#dff3ff', pattern: 'stripes', emblem: 'snowflake', emblemColor: '#ffffff', emblemDark: '#5b90c6', finial: '#cfeeff', pole: '#cfeeff' },
  sky:       { main: '#3d7ad6', second: '#ffe08a', pattern: 'edge', emblem: 'cloud', emblemColor: '#ffffff', emblemDark: '#8fb8ff' },
  clockwork: { main: '#8a3a2a', second: '#d1a04e', pattern: 'band', emblem: 'gear', emblemColor: '#ffcc66', emblemDark: '#6e4a1c', finial: '#ffcc66', pole: '#c08a3e' },
  witch:     { main: '#3a1f4d', second: '#a6ff5e', pattern: 'diag', emblem: 'moon', emblemColor: '#f4efd0', emblemDark: '#3a1f4d', finial: '#a6ff5e' },
  hut:       { main: '#3a1f4d', second: '#a6ff5e', pattern: 'diag', emblem: 'moon', emblemColor: '#f4efd0', emblemDark: '#3a1f4d', finial: '#a6ff5e' },
  castle:    { main: '#3d7ad6', second: '#ffd166', pattern: 'stripes', emblem: 'crown', emblemColor: '#ffd166', emblemDark: '#8a5a10' },
  reef:      { main: '#ff7fa8', second: '#7fd6c8', pattern: 'band', emblem: 'wave', emblemColor: '#ffffff', emblemDark: '#3a8a80', finial: '#7fd6c8' },
  volcano:   { main: '#2a2226', second: '#ff6a1f', pattern: 'chevron', emblem: 'flame', emblemColor: '#ffb347', emblemDark: '#8a2a10', finial: '#ff8a3d' },
  palace:    { main: '#2fb8c9', second: '#ffd166', pattern: 'edge', emblem: 'moon', emblemColor: '#ffd166', emblemDark: '#8a6a34' },
  harbor:    { main: '#d93b3b', second: '#f4efe6', pattern: 'stripes', emblem: 'anchor', emblemColor: '#f4efe6', emblemDark: '#3a3a44', pole: '#c9a15a' },
  desert:    { main: '#c8552a', second: '#ffd166', pattern: 'band', emblem: 'sun', emblemColor: '#ffe08a', emblemDark: '#8a5a10' },
  tomb:      { main: '#2fb8c9', second: '#e0b84a', pattern: 'edge', emblem: 'eye', emblemColor: '#ffd166', emblemDark: '#1e3a6a', finial: '#e0b84a' },
  deck:      { main: '#1a1a1a', second: '#f4efe6', pattern: 'edge', emblem: 'skull', emblemColor: '#f4efe6', emblemDark: '#1a1a1a', pole: '#c9a15a' },
  wreck:     { main: '#3a2618', second: '#7fd6c8', pattern: 'band', emblem: 'anchor', emblemColor: '#c9a15a', emblemDark: '#3a2618', finial: '#7fd6c8' },
  belly:     { main: '#7a2a34', second: '#a6ff5e', pattern: 'chevron', emblem: 'skull', emblemColor: '#f4ede0', emblemDark: '#5a1a22', finial: '#a6ff5e' },
  jungle:    { main: '#2f8a3a', second: '#ffd166', pattern: 'diag', emblem: 'leaf', emblemColor: '#9ee06f', emblemDark: '#1f5a2c' },
  temple:    { main: '#8a6a2a', second: '#ffd166', pattern: 'edge', emblem: 'sun', emblemColor: '#ffd166', emblemDark: '#5a4c34' },
  storm:     { main: '#2a2f66', second: '#ffe45e', pattern: 'chevron', emblem: 'lightning', emblemColor: '#fff6a8', emblemDark: '#8a7a10', finial: '#ffe45e', pole: '#c8ccdd' },
  fortress:  { main: '#23264a', second: '#7fd8ff', pattern: 'edge', emblem: 'lightning', emblemColor: '#fff6a8', emblemDark: '#8a7a10', finial: '#7fd8ff', pole: '#c8ccdd' },
  shadow:    { main: '#3a2a5e', second: '#c58bff', pattern: 'diag', emblem: 'skull', emblemColor: '#e8e2f2', emblemDark: '#1c1030', finial: '#c58bff', pole: '#b8b0d0' },
  throne:    { main: '#1c1330', second: '#8a3bff', pattern: 'band', emblem: 'crown', emblemColor: '#c58bff', emblemDark: '#3a1f4d', finial: '#c58bff', pole: '#b8b0d0' },
  darksea:   { main: '#0c1424', second: '#c58bff', pattern: 'chevron', emblem: 'skull', emblemColor: '#e8e2f2', emblemDark: '#1c1030', finial: '#c58bff', pole: '#5a5068' },
  ghostship: { main: '#1a1020', second: '#8a3bff', pattern: 'stripes', emblem: 'anchor', emblemColor: '#c58bff', emblemDark: '#0a0610', finial: '#c58bff', pole: '#5a4030' },
};

class Renderer {
  constructor(canvas) {
    this.cv = canvas; this.ctx = canvas.getContext('2d');
    this.level = null; this.theme = null; this.w = 1; this.h = 1; this.dpr = 1; this.tilt = CAM_TILT;
    // aktuelle Kamera und Zielwerte (werden weich angenähert)
    this.cam = { fx: 0, fy: 0, th: Math.PI / 4, zoom: 40, tilt: this.tilt, zf: CAM_ZF, cx: 0, cy: 0 };
    this.target = { fx: 0, fy: 0, th: Math.PI / 4, zoom: 40, tilt: this.tilt, zf: CAM_ZF, cx: 0, cy: 0 };
    this.scale = 40;
    this.updateTrig();
  }
  updateTrig() { const c = this.cam; c.sin = Math.sin(c.th); c.cos = Math.cos(c.th); this.scale = c.zoom; }
  resize() {
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.w = window.innerWidth; this.h = window.innerHeight;
    this.tilt = camTiltFor(this.w, this.h); // Neigung an das Seitenverhältnis anpassen
    this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }
  setLevel(level, theme) { this.level = level; this.theme = theme; }
  /* Zoomstufe für die Verfolger-Kamera, abhängig von der Bildschirmgröße */
  defaultZoom() { const c = Math.sqrt(this.tilt / CAM_TILT); return Math.max(30, Math.min(60, Math.min(this.w / 12, this.h / (14 * c)))); }
  /* Übersicht: ganze Bahn im Bild */
  overviewTarget() {
    const { W, H } = this.level, padTop = 78, padBot = 70;
    const span = (W + H + 4) * Math.SQRT1_2;
    const zoom = Math.min((this.w - 30) / span, (this.h - padTop - padBot) / (span * this.tilt + 3));
    return { fx: W / 2, fy: H / 2, th: Math.PI / 4, zoom, tilt: this.tilt, cx: this.w / 2, cy: padTop + (this.h - padTop - padBot) / 2 + zoom * 0.8 };
  }
  /* Verfolger-Kamera: Ball unten im Bild, Blick in Richtung th */
  followTarget(ball, th, zoom) {
    const ahead = 2.0;
    return { fx: ball.x - Math.sin(th) * ahead, fy: ball.y - Math.cos(th) * ahead, th, zoom, tilt: this.tilt, cx: this.w / 2, cy: this.h * 0.55 };
  }
  snapCamera() { Object.assign(this.cam, { tilt: this.tilt, zf: CAM_ZF }, this.target); this.updateTrig(); }
  updateCamera(dt) {
    const c = this.cam, tg = this.target, k = Math.min(1, dt * 4);
    c.fx += (tg.fx - c.fx) * k; c.fy += (tg.fy - c.fy) * k;
    c.zoom += (tg.zoom - c.zoom) * k; c.cx += (tg.cx - c.cx) * k; c.cy += (tg.cy - c.cy) * k;
    c.tilt += ((tg.tilt ?? this.tilt) - c.tilt) * k; c.zf += ((tg.zf ?? CAM_ZF) - c.zf) * k; // Neigung und Höhenmaß (Draufsicht im Baumodus)
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
    return [c.cx + rx * c.zoom, c.cy + ry * c.zoom * c.tilt - z * c.zoom * (c.zf ?? CAM_ZF)];
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
  /* Kegelstumpf: dasselbe wie prism, aber Boden- und Deckfläche dürfen verschieden groß sein.
     Damit lassen sich verjüngte Körper bauen – der Bauch eines Kruges, der Schaft eines Obelisken,
     die Schale eines Feuerkorbs. 'unten' und 'oben' müssen gleich viele Punkte haben. */
  frustum(ctx, unten, oben, z0, z1, top, side, opts = {}) {
    const n = unten.length, orient = polyArea(unten) > 0 ? 1 : -1;
    for (let i = 0; i < n; i++) {
      const a = unten[i], b = unten[(i + 1) % n], c = oben[(i + 1) % n], d = oben[i];
      const ex = b[0] - a[0], ey = b[1] - a[1];
      let nx = ey * orient, ny = -ex * orient;
      const L = Math.hypot(nx, ny) || 1; nx /= L; ny /= L;
      if (nx * this.cam.sin + ny * this.cam.cos <= 0.001) continue;   // von der Kamera abgewandt
      const light = 0.68 + 0.32 * (0.5 + 0.5 * (nx * 0.85 - ny * 0.53));
      const p0 = this.proj(a[0], a[1], z0), p1 = this.proj(b[0], b[1], z0);
      const p2 = this.proj(c[0], c[1], z1), p3 = this.proj(d[0], d[1], z1);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath();
      ctx.fillStyle = shade(side, light); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.8; ctx.stroke();
    }
    this.pathPoly(ctx, oben, z1);
    ctx.fillStyle = top; ctx.fill();
    ctx.strokeStyle = opts.outline || top; ctx.lineWidth = opts.outline ? 1 : 0.8; ctx.stroke();
  }
  circlePoly(x, y, r, n = 10, a0 = 0) {
    const p = [];
    for (let i = 0; i < n; i++) { const a = a0 + (i * TAU) / n; p.push([x + Math.cos(a) * r, y + Math.sin(a) * r]); }
    return p;
  }

  /* ---------- Bausteine für räumliche Deko ----------
     Die Maschinen standen von Anfang an im Raum – gebaut aus prism, frustum und walze in
     Weltkoordinaten, also drehen sie sich mit der Kamera und werfen ihre Seiten dorthin, wo das
     Licht sie hinwirft. Die Deko daneben war flach: ein paar Ellipsen am Bildschirmpunkt. Solange
     man nicht dreht, fällt das kaum auf; dreht man, bleibt ein Felsblock eine Scheibe, die sich
     mitdreht, und der ganze Raum wird wieder zum Bild.

     Diese vier Bausteine schließen die Lücke. Sie bauen wie die Maschinen in Weltkoordinaten,
     sind aber auf das gemacht, was Deko braucht: rund, unregelmäßig, schnell hingeschrieben.
     Alle Maße sind Kacheln, nicht Pixel. */

  /* Kegel: Baumkrone, Stalagmit, Kristallspitze. Die Spitze ist ein winziger Kreis statt eines
     Punktes – sonst hätte der Deckel keine Fläche und der Umriss flackerte beim Drehen. */
  kegel(ctx, x, y, z0, r, h, top, side, n = 9) {
    this.frustum(ctx, this.circlePoly(x, y, r, n), this.circlePoly(x, y, r * 0.04, n), z0, z0 + h, top, side);
  }

  /* Säule: Zylinder oder Kegelstumpf. Stamm, Mast, Poller, Krug, Fass. */
  saeule(ctx, x, y, z0, r0, r1, h, top, side, n = 10) {
    this.frustum(ctx, this.circlePoly(x, y, r0, n), this.circlePoly(x, y, r1, n), z0, z0 + h, top, side);
  }

  /* Brocken: ein Fels. Ein regelmäßiger Zylinder sähe aus wie ein Hutschachtel-Deckel, darum wird
     der Umriss aus dem Startwert 'seed' verzogen – jeder Fels bekommt so seine eigene Form und
     behält sie, weil die Deko ihren Startwert mitbringt. Oben sitzt eine flachere Kappe, damit er
     sich rundet statt abgeschnitten dazustehen. */
  brocken(ctx, x, y, z0, r, h, top, side, seed = 0.5, n = 9) {
    const zack = (rr, f) => {
      const p = [];
      for (let i = 0; i < n; i++) {
        const a = (i * TAU) / n + seed * 2.3;
        // zwei Sinusse mit ungleichem Takt: das ergibt eine unregelmäßige, aber ruhige Kontur
        const k = 1 + 0.26 * Math.sin(i * 2.1 + seed * 9) + 0.14 * Math.sin(i * 3.7 + seed * 4);
        p.push([x + Math.cos(a) * rr * k * f, y + Math.sin(a) * rr * k * f]);
      }
      return p;
    };
    this.frustum(ctx, zack(r, 1), zack(r, 0.74), z0, z0 + h * 0.62, shade(top, 0.98), side);
    this.frustum(ctx, zack(r, 0.74), zack(r, 0.3), z0 + h * 0.62, z0 + h, top, side);
  }

  /* Kugel: Beere, Perle, Schädel, Kürbis. Eine Kugel sieht aus jeder Richtung gleich aus – sie
     darf also eine schattierte Scheibe bleiben. Räumlich wird sie trotzdem: Mittelpunkt und
     Halbmesser kommen aus der Welt, nicht vom Bildschirm, also sitzt sie beim Drehen richtig und
     wächst und schrumpft mit dem Zoom wie alles andere. */
  kugel(ctx, x, y, z, r, light, mid, dark) {
    const [sx, sy] = this.proj(x, y, z), rs = r * this.scale;
    const g = ctx.createRadialGradient(sx - rs * 0.35, sy - rs * 0.4, rs * 0.1, sx, sy, rs * 1.05);
    g.addColorStop(0, light); g.addColorStop(0.55, mid); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, rs, 0, TAU); ctx.fill();
  }

  /* Der Schatten einer Deko: eine Ellipse auf dem Boden, nicht am Bildschirmpunkt. */
  bodenSchatten(ctx, x, y, r, a = 0.22) {
    this.isoEllipse(ctx, x + r * 0.25, y + r * 0.25, 0.004, r, `rgba(0,0,0,${a})`);
  }

  /* Ein gebogener Ast, Wedel oder Halm: er läuft vom Fuß in die Richtung (dx, dy) nach außen und
     steigt dabei erst und sinkt dann. Gebaut aus kurzen Walzen – jede einzelne liegt waagerecht,
     zusammen ergeben sie den Bogen. Der Gewinn gegenüber einem gezeichneten Strich: Ein Wedel, der
     nach Norden zeigt, zeigt auch nach dem Drehen der Kamera nach Norden. */
  ast(ctx, x0, y0, z0, dx, dy, L, steig, senk, r, top, side, n = 4) {
    const P = u => [x0 + dx * L * u, y0 + dy * L * u, z0 + steig * u - senk * u * u];
    for (let i = 0; i < n; i++) {
      const a = P(i / n), b = P((i + 1) / n);
      this.walze(ctx, a[0], a[1], b[0], b[1], (a[2] + b[2]) / 2, r * (1 - (i / n) * 0.55), top, side, { n: 7 });
    }
  }

  /* Ein Zahnrad als Weltpolygon: abwechselnd Fuß- und Kopfkreis, vier Punkte je Zahn. Weil es in
     der Bodenebene liegt, macht die Projektion von selbst eine Ellipse daraus. */
  zahnPoly(x, y, r, zn, winkel) {
    const p = [], ri = r * 0.78, schritt = TAU / zn;
    for (let i = 0; i < zn; i++) {
      for (const [u, rr] of [[0, ri], [0.16, r], [0.34, r], [0.5, ri]]) {
        const a = winkel + (i + u) * schritt;
        p.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr]);
      }
    }
    return p;
  }

  /* Liegendes Zahnrad als Körper statt als Scheibe: Der Zahnkranz ist ein prism über zahnPoly,
     also bekommt jeder einzelne Zahn seine eigene Seitenfläche. Von schräg vorn sieht man dadurch
     echte Zähne mit Tiefe – eine flache Scheibe mit Zacken sieht von dort aus wie Papier.
     Darüber sitzt die Nabe als kurze Säule, auf der Deckfläche liegen die Speichen. */
  zahnrad(ctx, x, y, z0, r, hoehe, zn, winkel, top, side, opts = {}) {
    this.prism(ctx, this.zahnPoly(x, y, r, zn, winkel), z0, hoehe, top, side, opts);
    const oben = z0 + hoehe;
    // Speichen: sie machen die Drehung sichtbar, ohne dass es mehr Körper braucht
    const [cx, cy] = this.proj(x, y, oben + 0.001);
    ctx.strokeStyle = shade(side, 1.15); ctx.lineWidth = Math.max(1.5, this.scale * r * 0.11);
    ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = winkel + (i * TAU) / 4;
      const [px, py] = this.proj(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, oben + 0.001);
      ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(px, py); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    this.prism(ctx, this.circlePoly(x, y, r * 0.26, 10), z0, hoehe * 1.6, shade(top, 1.08), side);
    this.isoEllipse(ctx, x, y, z0 + hoehe * 1.6 + 0.002, r * 0.1, shade(side, 0.7));
  }

  /* Stehendes Zahnrad im Bildraum (Deko auf einem Pfosten). Es steht senkrecht vor der Kamera,
     und eine senkrechte Scheibe legt diese Projektion immer schief – darum wird die Tiefe hier
     nicht gerechnet, sondern gemalt: dieselbe Zahnform mehrfach gegeneinander versetzt, von
     hinten dunkel nach vorn hell. Das liest sich als Rad mit Dicke und bleibt aus jeder
     Kamerarichtung richtig. */
  zahnradScheibe(ctx, cx, cy, r, zn, winkel, tiefe, hell, dunkel) {
    const n = 5;
    for (let i = n; i >= 1; i--) {
      const u = i / n;
      ctx.fillStyle = shade(dunkel, 0.55 + 0.45 * (1 - u));
      this.gearPath(ctx, cx + tiefe * u, cy + tiefe * u * 0.45, r, zn, winkel); ctx.fill();
    }
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, hell); g.addColorStop(1, dunkel);
    ctx.fillStyle = g; this.gearPath(ctx, cx, cy, r, zn, winkel); ctx.fill();
    ctx.strokeStyle = shade(dunkel, 0.5); ctx.lineWidth = Math.max(1, r * 0.06); ctx.stroke();
    // Speichen und Nabe
    ctx.strokeStyle = shade(dunkel, 0.75); ctx.lineWidth = Math.max(1.5, r * 0.13); ctx.lineCap = 'round';
    for (let i = 0; i < 4; i++) {
      const a = winkel + (i * TAU) / 4;
      ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * r * 0.2, cy + Math.sin(a) * r * 0.2);
      ctx.lineTo(cx + Math.cos(a) * r * 0.66, cy + Math.sin(a) * r * 0.66); ctx.stroke();
    }
    ctx.lineCap = 'butt';
    ctx.fillStyle = shade(dunkel, 0.45); ctx.beginPath(); ctx.arc(cx, cy, r * 0.2, 0, TAU); ctx.fill();
    ctx.fillStyle = shade(hell, 1.0); ctx.beginPath(); ctx.arc(cx - r * 0.03, cy - r * 0.03, r * 0.09, 0, TAU); ctx.fill();
  }

  /* Liegende Walze: ein runder Körper, dessen Achse waagerecht in der Höhe z von A nach B läuft.
     prism und frustum stellen Körper aufrecht – für Rohre, Kolbenstangen und Stempel braucht es
     die liegende Form. Gezeichnet wird wie bei prism: erst der abgewandte Deckel, dann die
     Mantelstreifen, deren Normale zur Kamera zeigt, zuletzt der nahe Deckel.
     Die Blickrichtung dieser Projektion ist (sin, cos, tilt/zf) – daran hängt, was sichtbar ist. */
  walze(ctx, ax, ay, bx, by, z, r, top, side, opts = {}) {
    const n = opts.n || 14, c = this.cam, hoch = c.tilt / (c.zf ?? CAM_ZF);
    let ux = bx - ax, uy = by - ay;
    const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
    const qx = -uy, qy = ux;                                   // quer zur Achse, waagerecht
    const ring = (px, py) => {
      const pts = [];
      for (let i = 0; i < n; i++) {
        const w = (i * TAU) / n, co = Math.cos(w), si = Math.sin(w);
        pts.push(this.proj(px + qx * co * r, py + qy * co * r, z + si * r));
      }
      return pts;
    };
    const A = ring(ax, ay), B = ring(bx, by);
    const nahB = (bx - ax) * c.sin + (by - ay) * c.cos < 0;    // welches Ende liegt vorn?
    const [fern, nah] = nahB ? [A, B] : [B, A];
    const deckel = (pts, farbe) => {
      ctx.beginPath(); pts.forEach((p, i) => (i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]))); ctx.closePath();
      ctx.fillStyle = farbe; ctx.fill();
      ctx.strokeStyle = opts.outline || farbe; ctx.lineWidth = opts.outline ? 1 : 0.8; ctx.stroke();
    };
    deckel(fern, shade(side, 0.72));
    for (let i = 0; i < n; i++) {
      const w = ((i + 0.5) * TAU) / n, co = Math.cos(w), si = Math.sin(w);
      const nx = qx * co, ny = qy * co;
      if (nx * c.sin + ny * c.cos + si * hoch <= 0.001) continue;
      const j = (i + 1) % n;
      ctx.beginPath();
      ctx.moveTo(A[i][0], A[i][1]); ctx.lineTo(A[j][0], A[j][1]);
      ctx.lineTo(B[j][0], B[j][1]); ctx.lineTo(B[i][0], B[i][1]); ctx.closePath();
      ctx.fillStyle = shade(side, 0.6 + 0.4 * (0.5 + 0.5 * (nx * 0.6 - ny * 0.38 + si * 0.66)));
      ctx.fill(); ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 0.8; ctx.stroke();
    }
    if (!opts.offen) deckel(nah, top);
    return nah;
  }

  drawCroc(ctx, ob, t) {
    const s = this.scale;
    if (!ob.jumping) { // nur Augen und Schnauzenspitze über Wasser, treibt langsam
      const a = t * 0.6, fx = ob.x + Math.cos(a) * ob.w * 0.2, fy = ob.y + Math.sin(a * 1.3) * ob.h * 0.2;
      this.isoEllipse(ctx, fx, fy, -0.05, 1.3, 'rgba(20,50,30,0.5)', 0.5);
      for (const side of [-0.28, 0.28]) { const [ex, ey] = this.proj(fx, fy + side, 0.12); ctx.fillStyle = '#4f8a3a'; ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.13, s * 0.09, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#ffd12a'; ctx.beginPath(); ctx.ellipse(ex, ey - s * 0.02, s * 0.07, s * 0.05, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ex, ey - s * 0.02, s * 0.02, s * 0.045, 0, 0, TAU); ctx.fill(); }
      const [nx, ny] = this.proj(fx + 0.9, fy, 0.08); ctx.fillStyle = '#4f8a3a'; ctx.beginPath(); ctx.ellipse(nx, ny, s * 0.16, s * 0.07, 0, 0, TAU); ctx.fill();
      return;
    }
    const vert = ob.axis === 'y', p = ob.p, z = ob.z * 0.55, tilt = (0.5 - p) * 0.7, px = ob.px, py = ob.py;
    const ax = vert ? 0 : 1, ay = vert ? 1 : 0, sx = vert ? 1 : 0, sy = vert ? 0 : 1;
    const W = (u, v) => [px + ax * u + sx * v, py + ay * u + sy * v], zAt = u => z + tilt * u, above = zz => Math.max(0, zz);
    const faces = (nx, ny) => nx * this.cam.sin + ny * this.cam.cos > 0.05;
    const seg = (u0, u1, wd, z0, h, top, side, opts) => { let zb = zAt((u0 + u1) / 2) + z0; const zt = zb + h; if (zt <= 0.03) return; if (zb < 0) zb = 0; this.prism(ctx, [W(u0, -wd / 2), W(u1, -wd / 2), W(u1, wd / 2), W(u0, wd / 2)], zb, zt - zb, top, side, opts); };
    const green = ['#5a9a3a', '#2e5a22'], dark = ['#3f7a2a', '#1f3f16'], belly = '#c9d58a';
    this.isoEllipse(ctx, px, py, 0.004, 2.2, `rgba(0,0,0,${0.25 * Math.max(0, 1 - z / ob.height)})`, 0.7);
    seg(-2.6, -1.4, 0.45, 0.1, 0.35, dark[0], dark[1]);                                  // Schwanz
    seg(-1.4, 0.6, 1.1, 0.0, 0.6, green[0], green[1], { outline: '#1a3a12' });            // Rumpf
    for (const side of [-1, 1]) for (const u of [-1.0, 0.3]) if (zAt(u) + 0.25 > 0) this.prism(ctx, [W(u - 0.25, side * 0.55), W(u + 0.25, side * 0.55), W(u + 0.25, side * 0.95), W(u - 0.25, side * 0.95)], above(zAt(u) - 0.05), 0.3, dark[0], dark[1]); // Beine
    if (zAt(-0.4) + 0.62 > 0) { ctx.fillStyle = '#2f6a22'; for (let k = 0; k < 5; k++) { const [rx, ry] = this.proj(...W(-1.2 + k * 0.45, 0), zAt(-1.2 + k * 0.45) + 0.62); ctx.beginPath(); ctx.moveTo(rx - s * 0.08, ry); ctx.lineTo(rx, ry - s * 0.16); ctx.lineTo(rx + s * 0.08, ry); ctx.closePath(); ctx.fill(); } } // Rückenzacken
    seg(0.6, 1.4, 0.9, 0.05, 0.55, green[0], green[1], { outline: '#1a3a12' });            // Kopf
    seg(1.4, 2.6, 0.7, 0.05, 0.22, green[0], green[1]);                                    // Unterkiefer
    // Oberkiefer: aufgeklappt, als schräge Platte mit Zähnen
    const open = 0.55 + 0.35 * Math.sin(p * Math.PI);
    const jaw = [[W(1.4, -0.36), zAt(1.4) + 0.5], [W(2.6, -0.3), zAt(2.6) + 0.5 + open], [W(2.6, 0.3), zAt(2.6) + 0.5 + open], [W(1.4, 0.36), zAt(1.4) + 0.5]];
    if (jaw.some(q => q[1] > 0.03)) {
      ctx.fillStyle = green[0]; ctx.beginPath(); jaw.forEach((q, i) => { const r = this.proj(q[0][0], q[0][1], above(q[1])); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); }); ctx.closePath(); ctx.fill(); ctx.strokeStyle = '#1a3a12'; ctx.lineWidth = 1; ctx.stroke();
      ctx.fillStyle = '#c93a3a'; const mouth = [[W(1.45, -0.3), zAt(1.45) + 0.27], [W(2.55, -0.25), zAt(2.55) + 0.28], [W(2.55, 0.25), zAt(2.55) + 0.28], [W(1.45, 0.3), zAt(1.45) + 0.27]];
      ctx.beginPath(); mouth.forEach((q, i) => { const r = this.proj(q[0][0], q[0][1], above(q[1])); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); }); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#fff'; for (let k = 0; k < 6; k++) { const u = 1.55 + k * 0.18; for (const side of [-1, 1]) { const zb = zAt(u) + 0.27, zt = zb + 0.16; const a0 = this.proj(...W(u - 0.05, side * 0.28), zb), a1 = this.proj(...W(u + 0.05, side * 0.28), zb), a2 = this.proj(...W(u, side * 0.26), zt); ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.closePath(); ctx.fill(); } }
    }
    for (const side of [-1, 1]) { // Augen oben auf dem Kopf
      if (zAt(1.1) + 0.6 < 0) continue;
      const [ex, ey] = this.proj(...W(1.1, side * 0.3), zAt(1.1) + 0.68);
      ctx.fillStyle = '#ffd12a'; ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.1, s * 0.08, 0, 0, TAU); ctx.fill(); ctx.fillStyle = '#000'; ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.025, s * 0.065, 0, 0, TAU); ctx.fill();
    }
    if (p < 0.2 || p > 0.8) { const q = p < 0.2 ? 1 - p / 0.2 : (p - 0.8) / 0.2, [bx, by] = this.proj(px, py, 0.05); ctx.fillStyle = `rgba(255,255,255,${0.7 * q})`; for (let i = 0; i < 7; i++) { const a = i * 0.9, rr = s * (0.3 + 0.5 * q); ctx.beginPath(); ctx.arc(bx + Math.cos(a) * rr, by + Math.sin(a) * rr * 0.5 - s * 0.3 * q, s * 0.07, 0, TAU); ctx.fill(); } }
  }
  drawSpikes(ctx, ob, t) {
    const s = this.scale, H = ob.height * ob.lift;
    if (H < 0.02) return;
    const pts = [];
    for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) pts.push([ob.x - ob.w / 2 + (i + 0.5) * ob.w / 3, ob.y - ob.h / 2 + (j + 0.5) * ob.h / 3]);
    pts.sort((a, b) => this.depth(a[0], a[1]) - this.depth(b[0], b[1]));
    for (const [px, py] of pts) {
      const r = 0.12, base = [this.proj(px - r, py, 0), this.proj(px + r, py, 0), this.proj(px, py + r, 0), this.proj(px, py - r, 0)], tip = this.proj(px, py, H);
      ctx.fillStyle = '#8a8a92'; ctx.beginPath(); ctx.moveTo(base[0][0], base[0][1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(base[2][0], base[2][1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#c9c9d2'; ctx.beginPath(); ctx.moveTo(base[2][0], base[2][1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(base[1][0], base[1][1]); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#3a3a44'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(base[0][0], base[0][1]); ctx.lineTo(tip[0], tip[1]); ctx.lineTo(base[1][0], base[1][1]); ctx.stroke();
      if (ob.lift > 0.9) { ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.beginPath(); ctx.arc(tip[0], tip[1], Math.max(1, s * 0.03), 0, TAU); ctx.fill(); }
    }
  }
  drawTempleGate(ctx, ob, t) {
    const s = this.scale, px = ob.px, py = ob.py, Wd = ob.gw || 3.2, D = 1.2, H = 2.6;
    const top = ['#9a8a66', '#5a4c34'];
    this.prism(ctx, [[px - Wd / 2 - 0.5, py - D], [px - Wd / 2 + 0.3, py - D], [px - Wd / 2 + 0.3, py + D], [px - Wd / 2 - 0.5, py + D]], 0, H, top[0], top[1], { outline: '#2a2218' });
    this.prism(ctx, [[px + Wd / 2 - 0.3, py - D], [px + Wd / 2 + 0.5, py - D], [px + Wd / 2 + 0.5, py + D], [px + Wd / 2 - 0.3, py + D]], 0, H, top[0], top[1], { outline: '#2a2218' });
    this.prism(ctx, [[px - Wd / 2 - 0.7, py - D - 0.1], [px + Wd / 2 + 0.7, py - D - 0.1], [px + Wd / 2 + 0.7, py + D + 0.1], [px - Wd / 2 - 0.7, py + D + 0.1]], H, 0.7, '#a89a74', '#6a5a3c', { outline: '#2a2218' }); // Sturz
    this.prism(ctx, [[px - Wd / 2 - 0.2, py - D + 0.2], [px + Wd / 2 + 0.2, py - D + 0.2], [px + Wd / 2 + 0.2, py + D - 0.2], [px - Wd / 2 - 0.2, py + D - 0.2]], H + 0.7, 0.5, '#8a7a56', '#4a3e28'); // Aufsatz
    // Rückwand zwischen den Pfeilern, davor der dunkle Eingang mit Glyphenrahmen
    this.prism(ctx, [[px - Wd / 2 + 0.3, py - D], [px + Wd / 2 - 0.3, py - D], [px + Wd / 2 - 0.3, py + D * 0.4], [px - Wd / 2 + 0.3, py + D * 0.4]], 0, H, '#7a6a4a', '#3f3524');
    const fy = py + D * 0.4, o = [[px - 0.75, fy, 0], [px - 0.75, fy, 1.6], [px, fy, 2.05], [px + 0.75, fy, 1.6], [px + 0.75, fy, 0]];
    ctx.fillStyle = '#07050a'; ctx.beginPath(); o.forEach((q, i) => { const r = this.proj(q[0], q[1], q[2] + 0.01); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); }); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c9a15a'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.stroke();
    ctx.fillStyle = 'rgba(255,209,102,0.7)'; // Glyphen auf dem Sturz
    for (let k = 0; k < 5; k++) { const [gx, gy] = this.proj(px - Wd / 2 + (k + 0.5) * Wd / 5, fy - 0.05, H + 0.35); ctx.beginPath(); if (k % 2) { ctx.arc(gx, gy, s * 0.08, 0, TAU); } else { ctx.moveTo(gx - s * 0.08, gy + s * 0.08); ctx.lineTo(gx, gy - s * 0.1); ctx.lineTo(gx + s * 0.08, gy + s * 0.08); ctx.closePath(); } ctx.fill(); }
    for (const side of [-1, 1]) this.spriteBrazier(ctx, { x: px + side * (Wd / 2 + 0.1), y: fy + 0.2, s: 0.9 }, t); // Feuerschalen
    ctx.fillStyle = 'rgba(60,110,50,0.55)'; for (let k = 0; k < 4; k++) { const [mx, my] = this.proj(px - Wd / 2 - 0.3 + k * (Wd / 3), fy, H + 0.7 - (k % 2) * 0.4); ctx.beginPath(); ctx.ellipse(mx, my, s * 0.22, s * 0.09, 0, 0, TAU); ctx.fill(); } // Moos
  }
  drawVineRotor(ctx, ob, t) {
    const s = this.scale, [hx, hy] = this.proj(ob.x, ob.y, ob.height + 1.4);
    ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = Math.max(2, s * 0.1); ctx.lineCap = 'round'; // Ast oben
    const [b0, b1] = this.proj(ob.x - 0.8, ob.y, ob.height + 1.45), [b2, b3] = this.proj(ob.x + 0.8, ob.y, ob.height + 1.35); ctx.beginPath(); ctx.moveTo(b0, b1); ctx.lineTo(b2, b3); ctx.stroke();
    for (let i = 0; i < ob.blades; i++) {
      const a = ob.bladeAngle(i), ex = ob.x + Math.cos(a) * ob.len, ey = ob.y + Math.sin(a) * ob.len;
      this.isoEllipse(ctx, ex, ey, 0.004, 0.35, 'rgba(0,0,0,0.18)');
      const [tx, ty] = this.proj(ex, ey, ob.height * 0.5);
      ctx.strokeStyle = '#3f7a2a'; ctx.lineWidth = Math.max(3, s * 0.12); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.strokeStyle = '#6fbf4a'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(tx, ty); ctx.stroke();
      ctx.fillStyle = '#3fa848'; // Blätter entlang des Seils und Büschel am Ende
      for (let k = 1; k <= 4; k++) { const u = k / 5, px = hx + (tx - hx) * u, py = hy + (ty - hy) * u; ctx.beginPath(); ctx.ellipse(px + (k % 2 ? s * 0.12 : -s * 0.12), py, s * 0.12, s * 0.06, k % 2 ? 0.7 : -0.7, 0, TAU); ctx.fill(); }
      for (let k = 0; k < 5; k++) { ctx.fillStyle = k % 2 ? '#2f8a3a' : '#4aa84a'; ctx.beginPath(); ctx.ellipse(tx + Math.cos(k * 1.26) * s * 0.18, ty + Math.sin(k * 1.26) * s * 0.12, s * 0.2, s * 0.1, k * 0.6, 0, TAU); ctx.fill(); }
    }
  }
  drawWhirl(ctx, ob, t) {
    const s = this.scale, [cx, cy] = this.proj(ob.x, ob.y, 0.006);
    const pal = ob.style === 'tornado' ? ['rgba(200,210,240,0.25)', '#2a2f4a', '230,235,255'] : ob.style === 'void' ? ['rgba(150,90,255,0.25)', '#120a24', '210,170,255'] : ['rgba(120,200,240,0.25)', '#0b3a55', '230,245,255'];
    this.isoEllipse(ctx, ob.x, ob.y, 0.003, ob.r + 0.3, pal[0]);
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.r + 0.1, pal[1]);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt);
    for (let arm = 0; arm < 3; arm++) { // drei Spiralarme
      ctx.strokeStyle = `rgba(${pal[2]},${0.55 + 0.25 * Math.sin(t * 4 + arm)})`; ctx.lineWidth = Math.max(1.5, s * 0.07); ctx.lineCap = 'round';
      ctx.beginPath();
      for (let k = 0; k <= 24; k++) { const u = k / 24, a = ob.angle * 1.4 + arm * TAU / 3 + u * 3.2, rr = (0.15 + u * 0.8) * ob.r * s; k ? ctx.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : ctx.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
      ctx.stroke();
    }
    for (let i = 0; i < 8; i++) { // Gischtflocken am Rand
      const a = -ob.angle * 1.4 + i * 0.785, rr = ob.r * s * (0.92 + 0.06 * Math.sin(t * 5 + i));
      ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, s * 0.05, 0, TAU); ctx.fill();
    }
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, ob.r * s * 0.45); g.addColorStop(0, '#02101c'); g.addColorStop(1, 'rgba(11,58,85,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, ob.r * s * 0.45, 0, TAU); ctx.fill();
    ctx.restore();
    const ex = Math.cos(ob.exitA), ey = Math.sin(ob.exitA), px = -ey, py = ex; // Auswurfrinne
    ctx.strokeStyle = 'rgba(255,240,200,0.9)'; ctx.lineWidth = Math.max(2, s * 0.09);
    for (const side of [-0.32, 0.32]) {
      const a0 = this.proj(ob.x + ex * (ob.r - 0.4) + px * side, ob.y + ey * (ob.r - 0.4) + py * side, 0.014);
      const a1 = this.proj(ob.x + ex * (ob.r + 0.45) + px * side, ob.y + ey * (ob.r + 0.45) + py * side, 0.014);
      ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
    }
  }
  drawWreck(ctx, ob, t) {
    const s = this.scale, px = ob.px, py = ob.py, L = 3.4, Wd = 1.45;
    const hull = [[px - L, py - Wd * 0.5], [px - L * 0.7, py - Wd], [px + L * 0.7, py - Wd], [px + L * 1.15, py], [px + L * 0.7, py + Wd], [px - L * 0.7, py + Wd], [px - L, py + Wd * 0.5]];
    this.isoEllipse(ctx, px, py, 0.003, L * 1.1, 'rgba(0,0,0,0.2)', Wd * 1.1);
    this.prism(ctx, hull, 0, 1.4, '#5a4030', '#2e1c0e', { outline: '#140c06' });
    ctx.strokeStyle = 'rgba(20,12,6,0.5)'; ctx.lineWidth = 1; // Deckplanken und Plankenlinien vorn
    for (let k = -0.8; k <= 0.8; k += 0.4) { const a = this.proj(px - L * 0.65, py + k * Wd, 1.41), b = this.proj(px + L * 0.75, py + k * Wd, 1.41); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (const z of [0.35, 0.7, 1.05]) { const a = this.proj(px - L * 0.7, py + Wd, z), b = this.proj(px + L * 0.7, py + Wd, z); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    // Leck: dunkle Öffnung an der Vorderseite über der Tür
    const dx = ob.x, gap = Math.max(0.62, ob.r * 0.95);
    const o = [[dx - gap, py + Wd, 0], [dx - gap * 0.7, py + Wd, 0.95], [dx, py + Wd, 1.15], [dx + gap * 0.7, py + Wd, 0.95], [dx + gap, py + Wd, 0]];
    ctx.fillStyle = '#03070c'; ctx.beginPath(); o.forEach((q, i) => { const pp = this.proj(q[0], q[1], q[2] + 0.01); i ? ctx.lineTo(pp[0], pp[1]) : ctx.moveTo(pp[0], pp[1]); }); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6a4a2a'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.stroke(); // gesplitterte Planken
    for (let i = 0; i < 3; i++) { const q = this.proj(dx - gap * 0.6 + i * gap * 0.6, py + Wd, 0.95 + (i === 1 ? 0.2 : 0)), r = this.proj(dx - gap * 0.6 + i * gap * 0.6 + 0.12, py + Wd, 0.6); ctx.beginPath(); ctx.moveTo(q[0], q[1]); ctx.lineTo(r[0], r[1]); ctx.stroke(); }
    // Maststumpf mit Fetzen Segel, schief
    const [m0, m1] = this.proj(px + 0.4, py - 0.2, 1.4), [m2, m3] = this.proj(px + 1.0, py - 0.4, 3.4);
    ctx.strokeStyle = '#2a1a0c'; ctx.lineWidth = Math.max(2, s * 0.09); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(m0, m1); ctx.lineTo(m2, m3); ctx.stroke();
    const sw = Math.sin(t * 1.2) * s * 0.1;
    ctx.fillStyle = 'rgba(200,190,170,0.7)'; ctx.beginPath(); ctx.moveTo(m2, m3 + s * 0.2); ctx.quadraticCurveTo(m2 - s * 0.7 + sw, m3 + s * 0.6, m2 - s * 0.4, m3 + s * 1.3); ctx.lineTo(m2 - s * 0.05, m3 + s * 1.0); ctx.closePath(); ctx.fill();
    // Seepocken und Tang am Rumpf, aufsteigende Blasen aus dem Leck
    ctx.fillStyle = 'rgba(230,220,200,0.6)'; for (let i = 0; i < 6; i++) { const q = this.proj(px - L * 0.6 + i * 0.55, py + Wd, 0.2 + (i % 2) * 0.25); ctx.beginPath(); ctx.arc(q[0], q[1], s * 0.05, 0, TAU); ctx.fill(); }
    const [w0, w1] = this.proj(px - L * 0.85, py + Wd * 0.7, 0); this.spriteSeaweed(ctx, w0, w1, s * 1.1, { seed: 0.4 }, t);
    ctx.strokeStyle = 'rgba(220,245,255,0.6)'; ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) { const u = (t * 0.35 + i * 0.25) % 1, q = this.proj(dx + Math.sin(t + i) * 0.15, py + Wd - 0.1, 0.4 + u * 2.2); ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.arc(q[0], q[1], s * (0.04 + i * 0.012), 0, TAU); ctx.stroke(); }
    ctx.globalAlpha = 1;
  }
  drawCatapult(ctx, ob, t) {
    const s = this.scale, dx = Math.cos(ob.angle), dy = Math.sin(ob.angle), nx = -dy, ny = dx;
    const rect = (px, py, w, h) => [[px - dx * w / 2 - nx * h / 2, py - dy * w / 2 - ny * h / 2], [px + dx * w / 2 - nx * h / 2, py + dy * w / 2 - ny * h / 2], [px + dx * w / 2 + nx * h / 2, py + dy * w / 2 + ny * h / 2], [px - dx * w / 2 + nx * h / 2, py - dy * w / 2 + ny * h / 2]];
    // Sockel und zwei Balken quer zur Wurfrichtung
    this.prism(ctx, rect(ob.x, ob.y, 1.5, 1.2), 0, 0.2, '#8a6a3a', '#4a3418', { outline: '#2a1c0c' });
    for (const side of [-0.42, 0.42]) this.prism(ctx, rect(ob.x + nx * side, ob.y + ny * side, 0.18, 0.18), 0.2, 0.75, '#a8804a', '#5a3e1c');
    // Wurfarm: in Ruhe steil nach hinten, beim Abschuss klappt er nach vorn
    const ph = t - ob.firedAt, fwd = ph < 0 ? 0 : ph < 0.3 ? ph / 0.3 : ph < 1.1 ? 1 - (ph - 0.3) / 0.8 : 0;
    const restX = ob.x - dx * 0.35, restY = ob.y - dy * 0.35, restZ = 1.05, fireX = ob.x + dx * 0.95, fireY = ob.y + dy * 0.95, fireZ = 1.3;
    const tipX = restX + (fireX - restX) * fwd, tipY = restY + (fireY - restY) * fwd, tipZ = restZ + (fireZ - restZ) * fwd;
    const pivot = this.proj(ob.x, ob.y, 0.95), tip = this.proj(tipX, tipY, tipZ);
    const cwX = ob.x - (tipX - ob.x) * 0.5, cwY = ob.y - (tipY - ob.y) * 0.5, cwZ = 0.95 - (tipZ - 0.95) * 0.5, cw = this.proj(cwX, cwY, cwZ);
    ctx.lineCap = 'round'; ctx.strokeStyle = '#6b4a22'; ctx.lineWidth = Math.max(3, s * 0.11);
    ctx.beginPath(); ctx.moveTo(cw[0], cw[1]); ctx.lineTo(tip[0], tip[1]); ctx.stroke();
    ctx.fillStyle = '#4a4a52'; ctx.beginPath(); ctx.arc(cw[0], cw[1], s * 0.16, 0, TAU); ctx.fill(); // Gegengewicht
    ctx.fillStyle = '#3a2a14'; ctx.beginPath(); ctx.arc(pivot[0], pivot[1], s * 0.07, 0, TAU); ctx.fill();
    ctx.fillStyle = '#8a6a3a'; ctx.beginPath(); ctx.ellipse(tip[0], tip[1] + s * 0.02, s * 0.2, s * 0.1, 0, 0, TAU); ctx.fill(); // Schale
    ctx.strokeStyle = '#3a2a14'; ctx.lineWidth = 1; ctx.stroke();
    if (ob.loaded) { const f = 0.6 + 0.4 * Math.sin(t * 14); ctx.strokeStyle = `rgba(255,220,120,${f})`; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.beginPath(); ctx.ellipse(tip[0], tip[1], s * 0.3, s * 0.16, 0, 0, TAU); ctx.stroke(); }
  }
  drawPyramid(ctx, ob, t) {
    const s = this.scale, cx = ob.px, cy = ob.py, B = ob.base;
    const tiers = [[B, 1.3], [B * 0.76, 1.2], [B * 0.53, 1.1], [B * 0.31, 1.0]];
    let z = 0;
    for (const [w, hh] of tiers) {
      const half = w / 2, poly = [[cx - half, cy - half], [cx + half, cy - half], [cx + half, cy + half], [cx - half, cy + half]];
      this.prism(ctx, poly, z, hh, '#e3c48f', '#a37a3e', { outline: '#7a5a2a' });
      // Fugen auf den sichtbaren Seiten
      ctx.strokeStyle = 'rgba(60,40,10,0.25)'; ctx.lineWidth = 1;
      for (const [ax, ay, bx, by, nx, ny] of [[cx - half, cy + half, cx + half, cy + half, 0, 1], [cx + half, cy - half, cx + half, cy + half, 1, 0], [cx - half, cy - half, cx + half, cy - half, 0, -1], [cx - half, cy - half, cx - half, cy + half, -1, 0]]) {
        if (nx * this.cam.sin + ny * this.cam.cos <= 0.001) continue;
        for (let k = 1; k < 3; k++) { const zz = z + hh * k / 3; const p0 = this.proj(ax, ay, zz), p1 = this.proj(bx, by, zz); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }
      }
      z += hh;
    }
    // goldene Spitze
    const capHalf = B * 0.11, cap = [[cx - capHalf, cy - capHalf], [cx + capHalf, cy - capHalf], [cx + capHalf, cy + capHalf], [cx - capHalf, cy + capHalf]];
    const apex = this.proj(cx, cy, z + 1.0), corners = cap.map(p => this.proj(p[0], p[1], z));
    for (let i = 0; i < 4; i++) { const a = corners[i], b = corners[(i + 1) % 4]; ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(apex[0], apex[1]); ctx.closePath(); ctx.fillStyle = i % 2 ? '#e0b84a' : '#b8892a'; ctx.fill(); ctx.strokeStyle = '#7a5a10'; ctx.lineWidth = 0.8; ctx.stroke(); }
    const gl = 0.7 + 0.3 * Math.sin(t * 2);
    ctx.fillStyle = `rgba(255,230,140,${0.35 * gl})`; ctx.beginPath(); ctx.arc(apex[0], apex[1], s * 0.5 * gl, 0, TAU); ctx.fill();
    // Torhaus an der Nordseite: Vorbau mit Pfeilern, Gesims, Hieroglyphenband, dunklem Tor mit Treppe und Fackeln
    const fy = cy - B / 2, gx0 = ob.x - 1.9, gx1 = ob.x + 1.9, gd = 1.3;
    this.fillPoly(ctx, [[ob.x - 1.2, fy - 1.0], [ob.x + 1.2, fy - 1.0], [ob.x + 1.2, fy], [ob.x - 1.2, fy]], 0.01, 'rgba(90,60,20,0.22)', false); // Schwelle
    this.prism(ctx, [[gx0, fy], [gx1, fy], [gx1, fy + gd], [gx0, fy + gd]], 0, 2.1, '#e3c48f', '#a37a3e', { outline: '#7a5a2a' });
    for (const px of [gx0 + 0.35, gx1 - 0.35]) this.prism(ctx, [[px - 0.3, fy - 0.35], [px + 0.3, fy - 0.35], [px + 0.3, fy + 0.25], [px - 0.3, fy + 0.25]], 0, 2.35, '#d9b979', '#8a6a34', { outline: '#5a4420' });
    this.prism(ctx, [[gx0 - 0.15, fy - 0.45], [gx1 + 0.15, fy - 0.45], [gx1 + 0.15, fy + gd], [gx0 - 0.15, fy + gd]], 2.1, 0.3, '#c9a468', '#7a5a2a', { outline: '#5a4420' });
    if (-this.cam.cos > 0.001) { // Frontseite zeigt zur Kamera
      const ff = fy - 0.02, w2 = 0.95, top = 1.6, P = (u, zz) => this.proj(ob.x + u, ff, zz);
      // Hieroglyphenband über dem Tor
      const b0 = P(-1.25, 1.72), b1 = P(1.25, 1.72), b2 = P(1.25, 2.02), b3 = P(-1.25, 2.02);
      ctx.fillStyle = 'rgba(60,40,10,0.35)'; ctx.beginPath(); ctx.moveTo(b0[0], b0[1]); ctx.lineTo(b1[0], b1[1]); ctx.lineTo(b2[0], b2[1]); ctx.lineTo(b3[0], b3[1]); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd166';
      for (let k = 0; k < 7; k++) { const q = P(-1.05 + k * 0.35, 1.87); const r = s * 0.05; if (k % 3 === 0) ctx.fillRect(q[0] - r * 0.5, q[1] - r * 1.4, r, r * 2.8); else if (k % 3 === 1) { ctx.beginPath(); ctx.arc(q[0], q[1], r, 0, TAU); ctx.fill(); } else { ctx.beginPath(); ctx.moveTo(q[0] - r, q[1] + r); ctx.lineTo(q[0], q[1] - r * 1.3); ctx.lineTo(q[0] + r, q[1] + r); ctx.closePath(); ctx.fill(); } }
      // Tor: dunkle Öffnung, nach oben leicht verjüngt, innen eine Treppe hinab
      const gate = [[-w2, 0], [-w2 * 0.78, top], [w2 * 0.78, top], [w2, 0]];
      ctx.fillStyle = '#120a04'; ctx.beginPath(); gate.forEach(([u, zz], i) => { const q = P(u, zz); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.fill();
      for (let k = 0; k < 4; k++) { const zz = 0.12 + k * 0.16, a = P(-w2 * (1 - zz / top * 0.22), zz), c = P(w2 * (1 - zz / top * 0.22), zz); ctx.strokeStyle = `rgba(200,160,90,${0.35 - k * 0.07})`; ctx.lineWidth = Math.max(1, s * 0.03); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(c[0], c[1]); ctx.stroke(); }
      ctx.strokeStyle = '#7a5a2a'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath(); gate.forEach(([u, zz], i) => { const q = P(u, zz); i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); }); ctx.closePath(); ctx.stroke();
      // Fackeln an den Pfeilern
      for (const side of [-1, 1]) {
        const [tx, ty] = this.proj(ob.x + side * 1.55, fy - 0.37, 1.5), f = 0.8 + 0.2 * Math.sin(t * 9 + side);
        ctx.fillStyle = '#5a3a1a'; ctx.fillRect(tx - s * 0.035, ty, s * 0.07, s * 0.32);
        ctx.fillStyle = `rgba(255,150,40,${0.3 * f})`; ctx.beginPath(); ctx.arc(tx, ty - s * 0.06, s * 0.34 * f, 0, TAU); ctx.fill();
        ctx.fillStyle = '#ff9a2a'; ctx.beginPath(); ctx.ellipse(tx, ty - s * 0.1, s * 0.07, s * 0.15 * f, 0, 0, TAU); ctx.fill();
        ctx.fillStyle = '#fff1a0'; ctx.beginPath(); ctx.ellipse(tx, ty - s * 0.07, s * 0.03, s * 0.07 * f, 0, 0, TAU); ctx.fill();
      }
    }
  }
  drawBelly(ctx, t) {
    const w = this.w, h = this.h, pulse = 1 + 0.02 * Math.sin(t * 1.6);
    ctx.lineCap = 'round';
    for (let i = 0; i < 9; i++) { // Rippen: helle Bögen von oben, schwingen leicht mit dem Puls
      const x = w * (0.05 + i * 0.115), rw = w * 0.07 * pulse, rh = h * (0.55 + 0.05 * Math.sin(i * 1.3));
      ctx.strokeStyle = `rgba(244,237,224,${0.22 + 0.06 * Math.sin(t * 1.6 + i)})`; ctx.lineWidth = Math.max(4, w * 0.012);
      ctx.beginPath(); ctx.moveTo(x - rw, 0); ctx.quadraticCurveTo(x + rw * 0.4, rh * 0.5, x - rw * 0.2, rh); ctx.stroke();
    }
    for (let i = 0; i < 14; i++) { // Magenwand: weiche Wölbungen
      const x = ((i * 0.173) % 1) * w, y = h * (0.35 + (i * 0.11) % 0.5), r = w * (0.05 + (i % 3) * 0.02) * pulse;
      const g = ctx.createRadialGradient(x, y, 0, x, y, r); g.addColorStop(0, 'rgba(150,40,55,0.35)'); g.addColorStop(1, 'rgba(150,40,55,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, r, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = 'rgba(159,224,74,0.08)'; ctx.fillRect(0, h * 0.7, w, h * 0.3); // Säuredunst unten
  }
  drawJungle(ctx, t) {
    const w = this.w, h = this.h, hash = (i, k) => Math.abs(Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1;
    for (let i = 0; i < 6; i++) { // goldene Lichtstrahlen durchs Blätterdach
      const x = w * (0.1 + i * 0.16) + Math.sin(t * 0.25 + i) * w * 0.02, sw = w * 0.04;
      const g = ctx.createLinearGradient(0, 0, 0, h * 0.7); g.addColorStop(0, `rgba(255,240,170,${0.16 + 0.05 * Math.sin(t * 0.6 + i)})`); g.addColorStop(1, 'rgba(255,240,170,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x - sw, 0); ctx.lineTo(x + sw, 0); ctx.lineTo(x + sw * 2.5 + w * 0.05, h * 0.7); ctx.lineTo(x - sw * 2.5 + w * 0.05, h * 0.7); ctx.closePath(); ctx.fill();
    }
    // drei Blätterschichten am Horizont, hinten dunkel, vorn heller
    const layers = [['#123a1e', 0.36, 22], ['#1d5a2c', 0.42, 18], ['#2a7a38', 0.47, 14]];
    layers.forEach(([col, base, n], li) => {
      ctx.fillStyle = col; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const x = (i / n) * w, r = w * (0.05 + hash(i, li) * 0.05), y = h * base - r * 0.4 + Math.sin(t * 0.4 + i + li) * 2; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
      ctx.rect(0, h * base, w, h * 0.3); ctx.fill();
    });
    ctx.lineCap = 'round'; // hängende Lianen von oben
    for (let i = 0; i < 7; i++) {
      const x = w * (0.04 + i * 0.15) + hash(i, 9) * w * 0.05, L = h * (0.18 + hash(i, 3) * 0.2), sw = Math.sin(t * 0.8 + i) * w * 0.01;
      ctx.strokeStyle = 'rgba(30,70,35,0.9)'; ctx.lineWidth = Math.max(2, w * 0.004);
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x + sw * 2, L * 0.6, x + sw, L); ctx.stroke();
      ctx.fillStyle = '#2f8a3a'; for (let k = 1; k <= 3; k++) { const u = k / 3.5; ctx.beginPath(); ctx.ellipse(x + sw * u * 1.5 + (k % 2 ? 6 : -6), L * u, 7, 3.5, k % 2 ? 0.6 : -0.6, 0, TAU); ctx.fill(); }
    }
    for (let i = 0; i < 3; i++) { // Papageien ziehen vorbei
      const x = ((i * 0.33 + t * 0.03) % 1) * w, y = h * (0.08 + i * 0.06) + Math.sin(t * 2 + i) * 5, fl = Math.sin(t * 8 + i) * 5;
      ctx.fillStyle = i ? '#ff4f4f' : '#2f9ae0'; ctx.beginPath(); ctx.ellipse(x, y, 7, 3, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = ctx.fillStyle; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 8, y - 4 - fl); ctx.moveTo(x + 4, y); ctx.lineTo(x + 8, y - 4 - fl); ctx.stroke();
    }
  }
  drawKraken(ctx, ob, t) {
    const s = this.scale, segs = [], dark = ob.style === 'darktentacle'; // dunkle Tentakel: aus dem Rumpf des Totenschiffs, ohne Kopf
    for (let i = 0; i < ob.blades; i++) {
      const a = ob.bladeAngle(i), ca = Math.cos(a), sa = Math.sin(a), n = 9;
      for (let k = 1; k <= n; k++) {
        const u = k / n, wave = Math.sin(t * 3 + u * 5 + i) * 0.18 * u;
        const px = ob.x + ca * ob.len * u - sa * wave, py = ob.y + sa * ob.len * u + ca * wave;
        segs.push({ px, py, r: ob.thick * (1.35 - u * 0.95) + 0.05, z: ob.height * 0.5 + 0.08 * Math.sin(t * 2 + u * 4 + i), u, k: this.depth(px, py) });
      }
    }
    segs.sort((p, q) => p.k - q.k);
    for (const sg of segs) {
      this.isoEllipse(ctx, sg.px, sg.py, 0.005, sg.r * 1.1, 'rgba(0,0,0,0.14)');
      const [cx, cy] = this.proj(sg.px, sg.py, sg.z), R = sg.r * s;
      const g = ctx.createRadialGradient(cx - R * 0.35, cy - R * 0.4, R * 0.1, cx, cy, R);
      if (dark) { g.addColorStop(0, '#4a2a5a'); g.addColorStop(1, '#0c0612'); } else { g.addColorStop(0, '#d98ad0'); g.addColorStop(1, '#6a2a78'); }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
      if (sg.u > 0.15) { ctx.fillStyle = dark ? `rgba(197,139,255,${0.45 + 0.35 * Math.sin(t * 4 + sg.u * 9)})` : 'rgba(255,220,240,0.7)'; ctx.beginPath(); ctx.arc(cx, cy + R * 0.45, R * 0.28, 0, TAU); ctx.fill(); } // Saugnapf
    }
    if (dark) { // statt Kopf: ein finsteres Loch, aus dem die Arme kriechen
      this.isoEllipse(ctx, ob.x, ob.y, 0.01, ob.hubR * 1.4, '#04030a');
      const [hx, hy] = this.proj(ob.x, ob.y, 0.012); const rg = ctx.createRadialGradient(hx, hy, 0, hx, hy, ob.hubR * 2.2 * s); rg.addColorStop(0, 'rgba(140,60,255,0.35)'); rg.addColorStop(1, 'rgba(140,60,255,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(hx, hy, ob.hubR * 2.2 * s, 0, TAU); ctx.fill();
      return;
    }
    // Kopf: Kuppel mit Augen, die dem Ball nachschauen
    const hr = ob.hubR, [hx, hy] = this.proj(ob.x, ob.y, ob.height * 0.5 + 0.1), HR = hr * s;
    this.isoEllipse(ctx, ob.x, ob.y, 0.006, hr * 1.15, 'rgba(0,0,0,0.2)');
    const g = ctx.createRadialGradient(hx - HR * 0.35, hy - HR * 0.6, HR * 0.1, hx, hy - HR * 0.2, HR * 1.25);
    g.addColorStop(0, '#e29ad8'); g.addColorStop(0.6, '#9a48a8'); g.addColorStop(1, '#4a1a58');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(hx, hy - HR * 0.35, HR * 1.05, HR * 1.2, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.18)'; for (let i = 0; i < 5; i++) { const a = t * 0.8 + i * 1.26; ctx.beginPath(); ctx.arc(hx + Math.cos(a) * HR * 0.55, hy - HR * 0.4 + Math.sin(a) * HR * 0.5, HR * 0.13, 0, TAU); ctx.fill(); }
    const b = this.ballPos, look = b ? Math.atan2(b[1] - hy, b[0] - hx) : t;
    for (const side of [-1, 1]) {
      const ex = hx + side * HR * 0.45, ey = hy - HR * 0.1;
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.ellipse(ex, ey, HR * 0.26, HR * 0.3, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#1a0a20'; ctx.beginPath(); ctx.arc(ex + Math.cos(look) * HR * 0.09, ey + Math.sin(look) * HR * 0.09, HR * 0.14, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex + Math.cos(look) * HR * 0.09 - HR * 0.05, ey + Math.sin(look) * HR * 0.09 - HR * 0.06, HR * 0.045, 0, TAU); ctx.fill();
    }
  }
  drawSharkJump(ctx, ob, t) {
    const s = this.scale;
    if (!ob.jumping) { // Flosse zieht Kreise in der Bucht
      const a = t * 1.4, fx = ob.x + Math.cos(a) * ob.w * 0.25, fy = ob.y + Math.sin(a) * ob.h * 0.25, d = Math.sin(a) >= 0 ? -1 : 1;
      this.isoEllipse(ctx, fx, fy, -0.05, 1.4, 'rgba(20,40,60,0.45)', 0.6);
      const fin = [[fx + d * 0.2, fy, 0.06], [fx - d * 0.25, fy, 0.95], [fx - d * 0.85, fy, 0.06]];
      ctx.fillStyle = '#5d6b78'; ctx.beginPath(); fin.forEach((q, i) => { const pp = this.proj(q[0], q[1], q[2]); i ? ctx.lineTo(pp[0], pp[1]) : ctx.moveTo(pp[0], pp[1]); }); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = Math.max(1, s * 0.04);
      const [w0, w1] = this.proj(fx - d * 0.3, fy, 0.01), [w2, w3] = this.proj(fx - d * 1.1, fy + 0.25, 0.01); ctx.beginPath(); ctx.moveTo(w0, w1); ctx.lineTo(w2, w3); ctx.stroke();
      return;
    }
    // Comic-Hai aus Blöcken wie der Drache: Schwanz, Rumpf, Kopf, Schnauze entlang der Sprungachse, Neigung folgt dem Bogen
    const vert = ob.axis === 'y', p = ob.p, z = ob.z, tilt = (0.5 - p) * 1.1, px = ob.px, py = ob.py;
    const ax = vert ? 0 : 1, ay = vert ? 1 : 0, sx = vert ? 1 : 0, sy = vert ? 0 : 1; // Achse (Sprungrichtung) und Seite
    const W = (u, v) => [px + ax * u + sx * v, py + ay * u + sy * v]; // Weltpunkt: u entlang der Achse, v seitlich
    const zAt = u => z + tilt * u;
    // Alles unter der Wasseroberfläche (z < 0) wird weggeschnitten: beim Auftauchen erscheint erst die Nase, beim Eintauchen verschwindet der Schwanz zuletzt
    const seg = (u0, u1, wd, z0, h, top, side, opts) => { let zb = zAt((u0 + u1) / 2) + z0; const zt = zb + h; if (zt <= 0.03) return; if (zb < 0) zb = 0; this.prism(ctx, [W(u0, -wd / 2), W(u1, -wd / 2), W(u1, wd / 2), W(u0, wd / 2)], zb, zt - zb, top, side, opts); };
    const above = zz => Math.max(0, zz);
    const faces = (nx, ny) => nx * this.cam.sin + ny * this.cam.cos > 0.05; // zeigt diese Seite zur Kamera? (wie bei den Blockseiten)
    const grey = ['#7d8fa0', '#3f4d5a'], dark = ['#5c6c7a', '#2e3a44'], belly = '#e6edf2';
    this.isoEllipse(ctx, px, py, 0.004, 1.9, `rgba(0,0,0,${0.28 * Math.max(0, 1 - z / (ob.height * 1.3))})`, 0.8);
    seg(-2.1, -1.3, 0.55, 0.25, 0.5, grey[0], grey[1]);                                  // Schwanzwurzel
    seg(-1.3, 0.5, 1.15, 0.05, 1.0, grey[0], grey[1], { outline: '#25303a' });             // Rumpf
    if (zAt(-0.4) + 1.06 > 0) this.fillPoly(ctx, [W(-1.2, -0.5), W(0.4, -0.5), W(0.4, 0.5), W(-1.2, 0.5)], zAt(-0.4) + 1.06, '#93a4b3', false); // heller Rücken
    seg(0.5, 1.5, 0.95, 0.15, 0.8, grey[0], grey[1], { outline: '#25303a' });              // Kopf
    seg(1.5, 2.0, 0.6, 0.35, 0.45, dark[0], dark[1]);                                       // Schnauze
    // Bauchstreifen an den Flanken
    for (const side of [-1, 1]) { if (!faces(sx * side, sy * side)) continue; if (zAt(-1.2) + 0.15 < 0 && zAt(1.4) + 0.2 < 0) continue; const q0 = this.proj(...W(-1.2, side * 0.58), above(zAt(-1.2) + 0.15)), q1 = this.proj(...W(1.4, side * 0.48), above(zAt(1.4) + 0.2)); ctx.strokeStyle = 'rgba(230,237,242,0.75)'; ctx.lineWidth = Math.max(1.5, s * 0.07); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
    // Rückenflosse: senkrechte Dreiecksplatte
    const tri = (pts, col, edge) => { if (pts.every(q => q[1] <= 0.03)) return; ctx.fillStyle = col; ctx.beginPath(); pts.forEach((q, i) => { const r = this.proj(q[0][0], q[0][1], above(q[1])); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); }); ctx.closePath(); ctx.fill(); if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke(); } };
    for (const off of [-0.06, 0.06]) tri([[W(-0.5, off), zAt(-0.5) + 1.0], [W(-0.35, off), zAt(-0.35) + 1.9], [W(0.45, off), zAt(0.45) + 1.0]], off < 0 ? dark[1] : dark[0], '#25303a');
    // Schwanzflosse: Sichel senkrecht am Ende
    for (const off of [-0.05, 0.05]) tri([[W(-2.1, off), zAt(-2.1) + 0.5], [W(-2.7, off), zAt(-2.7) + 1.35], [W(-2.45, off), zAt(-2.45) + 0.5], [W(-2.6, off), zAt(-2.6) - 0.1]], off < 0 ? dark[1] : dark[0], '#25303a');
    // Brustflossen: flache Platten schräg nach außen
    if (zAt(-0.4) + 0.3 > 0) for (const side of [-1, 1]) this.prism(ctx, [W(0.1, side * 0.55), W(-0.6, side * 1.35), W(-0.95, side * 1.2), W(-0.7, side * 0.55)], zAt(-0.4) + 0.3, 0.1, dark[0], dark[1]);
    // Kiemen
    ctx.strokeStyle = '#2e3a44'; ctx.lineWidth = Math.max(1, s * 0.04);
    for (const side of [-1, 1]) for (let k = 0; k < 3; k++) { if (!faces(sx * side, sy * side)) continue; const u = 0.55 + k * 0.18; if (zAt(u) + 0.8 < 0.03) continue; const q0 = this.proj(...W(u, side * 0.48), above(zAt(u) + 0.35)), q1 = this.proj(...W(u, side * 0.48), zAt(u) + 0.8); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
    // Augen auf beiden Seiten des Kopfs, Blick nach vorn
    if (zAt(1.25) + 0.6 > 0) for (const side of [-1, 1]) {
      if (!faces(sx * side, sy * side)) continue; // nur das Auge auf der sichtbaren Seite
      const [ex, ey] = this.proj(...W(1.25, side * 0.5), zAt(1.25) + 0.7);
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, s * 0.13, 0, TAU); ctx.fill();
      ctx.fillStyle = '#111'; ctx.beginPath(); ctx.arc(ex + s * 0.03 * (vert ? 0 : 1), ey - s * 0.02, s * 0.065, 0, TAU); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex - s * 0.02, ey - s * 0.05, s * 0.025, 0, TAU); ctx.fill();
    }
    // Maul mit Zähnen an der Schnauze
    const m0 = this.proj(...W(2.02, -0.3), zAt(2.0) + 0.35), m1 = this.proj(...W(2.02, 0.3), zAt(2.0) + 0.35);
    if (zAt(2.0) + 0.24 > 0 && faces(ax, ay)) { // Maul nur, wenn die Schnauze zur Kamera zeigt
    ctx.strokeStyle = '#8a1a24'; ctx.lineWidth = Math.max(2, s * 0.09); ctx.beginPath(); ctx.moveTo(m0[0], m0[1]); ctx.lineTo(m1[0], m1[1]); ctx.stroke();
    ctx.fillStyle = '#fff'; for (let k = 0; k < 5; k++) { const v = -0.26 + k * 0.13, a0 = this.proj(...W(2.03, v - 0.05), zAt(2.0) + 0.37), a1 = this.proj(...W(2.03, v + 0.05), zAt(2.0) + 0.37), a2 = this.proj(...W(2.03, v), zAt(2.0) + 0.24); ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.lineTo(a2[0], a2[1]); ctx.closePath(); ctx.fill(); }
    }
    if (p < 0.2 || p > 0.8) { // Gischt beim Auftauchen und Eintauchen
      const q = p < 0.2 ? 1 - p / 0.2 : (p - 0.8) / 0.2, [bx, by] = this.proj(ob.px, ob.py, 0.05);
      ctx.fillStyle = `rgba(255,255,255,${0.8 * q})`;
      for (let i = 0; i < 7; i++) { const a = i * 0.9, rr = s * (0.3 + 0.5 * q); ctx.beginPath(); ctx.arc(bx + Math.cos(a) * rr, by + Math.sin(a) * rr * 0.5 - s * 0.3 * q, s * 0.07, 0, TAU); ctx.fill(); }
    }
  }
  drawTemple(ctx, t) {
    const w = this.w, h = this.h, hash = (i, k) => Math.abs(Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#1a1408'); g.addColorStop(0.5, '#3a2f16'); g.addColorStop(1, '#1a1408'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const bh = Math.max(40, h * 0.07), bw = bh * 2.4; ctx.lineWidth = 2; // Quader mit Moosfugen
    for (let r = 0; r < h / bh + 1; r++) for (let c = -1; c < w / bw + 1; c++) {
      const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh;
      ctx.strokeStyle = 'rgba(0,0,0,0.3)'; ctx.strokeRect(x, y, bw, bh);
      if (hash(r, c) > 0.7) { ctx.fillStyle = 'rgba(60,110,50,0.35)'; ctx.fillRect(x + 2, y + bh - 6, bw * hash(c, r) * 0.6, 4); }
    }
    ctx.fillStyle = 'rgba(255,200,110,0.14)'; // Glyphenbänder
    for (const band of [0.2, 0.6]) {
      const y = h * band; ctx.fillRect(0, y - bh * 0.3, w, bh * 0.6);
      for (let i = 0; i < 36; i++) { const x = (i / 36) * w + bh * 0.2, k = Math.floor(hash(i, band * 10) * 4), sz = bh * 0.18; ctx.fillStyle = 'rgba(40,24,8,0.6)';
        if (k === 0) { ctx.beginPath(); ctx.moveTo(x, y + sz); ctx.lineTo(x + sz * 0.6, y - sz); ctx.lineTo(x + sz * 1.2, y + sz); ctx.closePath(); ctx.fill(); }
        else if (k === 1) { ctx.beginPath(); ctx.arc(x + sz * 0.5, y, sz * 0.6, 0, TAU); ctx.fill(); ctx.fillStyle = 'rgba(255,200,110,0.3)'; ctx.beginPath(); ctx.arc(x + sz * 0.5, y, sz * 0.25, 0, TAU); ctx.fill(); }
        else if (k === 2) ctx.fillRect(x, y - sz * 0.8, sz * 1.1, sz * 1.6);
        else { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + sz * 0.6, y - sz); ctx.lineTo(x + sz * 1.2, y); ctx.lineTo(x + sz * 0.6, y + sz); ctx.closePath(); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,200,110,0.14)'; }
    }
    for (const [fx, fy, ph] of [[0.1, 0.35, 0], [0.5, 0.22, 2], [0.9, 0.38, 4]]) { // Fackelschein
      const gl = 0.8 + 0.2 * Math.sin(t * 7 + ph) * Math.sin(t * 3.3 + ph);
      const rg = ctx.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, w * 0.3); rg.addColorStop(0, `rgba(255,170,70,${0.22 * gl})`); rg.addColorStop(1, 'rgba(255,170,70,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
    }
  }
  /* ---------- Boden ---------- */
  drawFloor(ctx) {
    // Gezeichnet wird immer die untere Ebene; die obere kommt als eigene, angehobene Scholle dazu
    const { W, H } = this.level, tiles = this.level.untenFl.tiles, th = this.theme;
    const cull = this.scale * 1.5;
    // Erdscholle. In den Uhrwerk-Welten reicht sie weiter: Dort liegt das Räderwerk rings um die
    // Bahn, und auf einer knappen Scholle stünde es halb in der Luft.
    const m = th.gears ? 3.6 : 1.4;
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
    if (th.gears) this.drawGroundGears(ctx, this.t || 0);
    if (th.sea) { // Wellenkämme auf dem Meer (die Scholle ist das Wasser)
      const t = this.level.t || 0;
      ctx.strokeStyle = th.darkSea ? 'rgba(170,140,220,0.3)' : 'rgba(255,255,255,0.35)'; ctx.lineWidth = Math.max(1, this.scale * 0.04); ctx.lineCap = 'round';
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
      if (th.plankFloor && c !== 's' && c !== 'i') { // Planken: zwei Fugen längs, ein versetzter Stoß
        ctx.strokeStyle = 'rgba(40,20,5,0.3)'; ctx.lineWidth = 1;
        for (const k of [0.34, 0.67]) { const [a0, a1] = this.proj(x, y + k), [b0, b1] = this.proj(x + 1, y + k); ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke(); }
        const off = 0.2 + ((x * 3 + y * 5) % 3) * 0.28, [c0, c1] = this.proj(x + off, y + 0.34), [d0, d1] = this.proj(x + off, y + 0.67);
        ctx.beginPath(); ctx.moveTo(c0, c1); ctx.lineTo(d0, d1); ctx.stroke();
      }
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
    this.t = t;   // Spieluhr merken: drawBall und die Ball-Skins brauchen sie für ihre Bewegung
    // Himmel
    const g = ctx.createLinearGradient(0, 0, 0, this.h);
    g.addColorStop(0, th.sky[0]); g.addColorStop(1, th.sky[1]);
    ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h);
    if (th.stars) this.drawStars(ctx, t);
    if (th.clouds) this.drawSkyClouds(ctx, t);
    if (th.gears) this.drawSkyGears(ctx, t);
    if (th.planks) this.drawPlanks(ctx, t);
    if (th.tomb) this.drawTomb(ctx, t);
    if (th.belly) this.drawBelly(ctx, t);
    if (th.jungleBg) this.drawJungle(ctx, t);
    if (th.temple) this.drawTemple(ctx, t);
    if (th.stormBg) this.drawStorm(ctx, t);
    if (th.fortress) this.drawFortress(ctx, t);
    if (th.shadowBg) this.drawShadow(ctx, t);
    if (th.throne) this.drawThrone(ctx, t);
    this.seaT = t;
    if (th.rays) this.drawRays(ctx, t);
    if (th.sea) this.drawSea(ctx, t);
    if (th.volcano) this.drawVolcano(ctx, t);
    if (th.dunes) this.drawDunes(ctx, t);

    this.drawFloor(ctx);

    // animierte Flüssigkeiten
    const fires = [];
    for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
      const c = lv.untenFl.tiles[y][x];
      if (c !== 'w' && c !== 'l') continue;
      const [lsx, lsy] = this.proj(x + 0.5, y + 0.5);
      if (!this.onScreen(lsx, lsy, this.scale * 1.5)) continue;
      const poly = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
      if (c === 'l' && th.shadowFire) { fires.push([x, y]); this.drawShadowFire(ctx, x, y, t, lv, 0); continue; }
      const base = c === 'w' ? th.water : th.lava;
      const pulse = 0.5 + 0.5 * Math.sin(t * (c === 'w' ? 2 : 1.3) + x * 1.7 + y * 2.3);
      this.fillPoly(ctx, poly, -0.12, shade(base, 0.85 + 0.2 * pulse));
      ctx.strokeStyle = c === 'w' ? 'rgba(255,255,255,0.5)' : 'rgba(255,240,150,0.7)'; ctx.lineWidth = 1.2;
      const off = ((t * 0.4 + x * 0.3) % 1);
      const [a0, a1] = this.proj(x + 0.15, y + 0.2 + off * 0.6, -0.12), [b0, b1] = this.proj(x + 0.55, y + 0.2 + off * 0.6, -0.12);
      ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
    }

    for (const [fx, fy] of fires) this.drawShadowFire(ctx, fx, fy, t, lv, 1); // Glut, Flammen und Funken über den fertigen Grund
    if (state.phase !== 'edit') this.drawCastShadows(ctx);
    // Boden-Overlays
    for (const ob of lv.obstacles) this.drawObstacleFloor(ctx, ob, t);
    // Loch und Fahne der oberen Ebene kommen erst nach der Scholle, sonst lägen sie darunter
    if (lv.cup && !lv.cupEbene) this.drawCupHole(ctx);

    // sortierte 3D-Objekte
    const items = [];
    const wall = th.wall;
    for (const wr of lv.untenFl.walls) {
      const poly = [[wr.x, wr.y], [wr.x + wr.w, wr.y], [wr.x + wr.w, wr.y + wr.h], [wr.x, wr.y + wr.h]];
      items.push({ x: wr.x + wr.w / 2, y: wr.y + wr.h / 2, draw: () => this.drawWall(ctx, poly, wall) });
    }
    for (const b of lv.untenFl.blocks) {
      const poly = [[b.x, b.y], [b.x + 1, b.y], [b.x + 1, b.y + 1], [b.x, b.y + 1]];
      // Am Berg sind Blöcke keine Kisten, sondern verschneite Felsbrocken - und weil man sich
      // hinter ihnen vor der Lawine versteckt, müssen sie auch danach aussehen.
      if (th.blockStil === 'fels') { items.push({ x: b.x + 0.5, y: b.y + 0.5, draw: () => this.drawSchneefels(ctx, b) }); continue; }
      items.push({ x: b.x + 0.5, y: b.y + 0.5, draw: () => this.prism(ctx, poly, 0, 1.0, th.block.top, th.block.side, { outline: shade(th.block.side, 0.7) }) });
    }
    for (const d of lv.decor) items.push({ x: d.x, y: d.y, draw: () => this.drawDecor(ctx, d, t) });
    for (const ob of lv.obstacles) this.pushObstacle(items, ctx, ob, t);
    if (lv.cup && !lv.cupEbene) items.push({ x: lv.cup.x, y: lv.cup.y, bias: 0.01, draw: () => this.drawFlag(ctx, t) });
    // Der Ball wird zum Schluss gezeichnet, damit er nie hinter Bäumen oder Mauern verschwindet
    for (const it of items) { it.k = this.depth(it.x, it.y) + (it.bias || 0); const p = this.proj(it.x, it.y); it.sx = p[0]; it.sy = p[1]; }
    items.sort((a, b) => a.k - b.k);
    const b = state.ball;
    /* Im Kupferrohr steckt der Ball und ist von außen nicht zu sehen – so wie eine Rohrpostbüchse
       auch nicht durch das Kupfer scheint. Sichtbar ist dann nur der helle Schein, der in der
       Leitung mitläuft (Renderer.drawPipeLauf). Und weil er nicht zu sehen ist, darf auch nichts
       für ihn durchsichtig werden: Sonst risse ausgerechnet die Leitung ein Loch um ihn herum. */
    /* Der Wind des Schneebergs gilt für die ganze Bahn, nicht nur für die Fahne. Damit ihn auch
       das Schneetreiben am Himmel und die Windsäcke am Rand zeigen können, wird er hier einmal je
       Bild festgehalten – sonst wüsste nur das Hindernis selbst davon, und der Wind wäre ein
       Zeiger statt Wetter. */
    const wf = lv.obstacles.find(o => o.type === 'windfahne');
    this.wind = wf ? { dx: wf.dx, dy: wf.dy, staerke: wf.staerke } : null;
    const imRohr = !!(b && b.rider && b.rider.type === 'copperpipe');
    const bp = b && !imRohr ? this.proj(b.x, b.y, 0) : null, bk = b ? this.depth(b.x, b.y) : 0;
    this.ballPos = bp;
    const cullM = this.scale * 3.5, fadeW = this.scale * 2.2, fadeH = this.scale * 3.2;
    for (const it of items) {
      if (!this.onScreen(it.sx, it.sy, cullM)) continue;
      // Objekte, die vor dem Ball stehen und ihn verdecken würden, fast durchsichtig zeichnen
      const fade = bp && !it.ball && !it.noFade && it.k > bk + 0.3 && Math.abs(it.sx - bp[0]) < fadeW && it.sy > bp[1] - this.scale * 0.4 && it.sy < bp[1] + fadeH;
      if (fade) ctx.globalAlpha = 0.22;
      it.draw();
      if (fade) ctx.globalAlpha = 1;
    }
    this.drawEbeneOben(ctx, t);   // die zweite Spielebene über allem, was unten steht
    this.drawSpannendeMaschinen(ctx, t);   // Seilbahn, Aufzug, Zahnstange stehen zwischen den Ebenen
    if (lv.cup && lv.cupEbene) { this.drawCupHole(ctx); this.drawFlag(ctx, t); }
    if (b && !imRohr) { this.flat = !!(b.rider && b.rider.type === 'ferry' && b.rider.flat); this.drawBall(ctx, b); this.flat = false; }
    /* Die Zielhilfe ganz zum Schluss, nach Ball und Schollen. Sie lag früher beim Boden, also unter
       allem, was danach kommt: Stand der Ball auf einer oberen Ebene, malte deren Scholle den Pfeil
       zu, und auch unten verdeckte ihn jedes Hindernis, das davor gezeichnet wurde. Man konnte dann
       ganz normal aufladen und schießen, sah nur nicht, wohin - und das ist schlimmer als gar keine
       Hilfe, weil man den Fehler bei sich sucht. */
    if (state.aim) this.drawAim(ctx, state.ball, state.aim);

    if (state.phase !== 'edit') this.drawDepthCues(ctx);
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

  /* Räumliche Tiefe: Schlagschatten von Randmauern, Blöcken und Banden auf den Boden (Licht von Nordwesten),
     nur auf Bodenkacheln – nie in den Abgrund oder aufs Wasser hinaus. */
  drawCastShadows(ctx) {
    const lv = this.level, th = this.theme, LX = 0.42, LY = 0.3; // Schattenversatz je Höheneinheit (Weltkoordinaten)
    const boxes = [];
    for (const w of lv.untenFl.walls) boxes.push([w.x, w.y, w.x + w.w, w.y + w.h, th.wall.style === 'hedge' ? 0.55 : 0.6]);
    for (const b of lv.untenFl.blocks) boxes.push([b.x, b.y, b.x + 1, b.y + 1, 1.0]);
    for (const o of lv.obstacles) {
      if (o.type === 'wall') { const nx = -(o.y1 - o.y0), ny = o.x1 - o.x0, L = Math.hypot(nx, ny) || 1, tx = nx / L * o.t / 2, ty = ny / L * o.t / 2; boxes.push({ poly: [[o.x0 + tx, o.y0 + ty], [o.x1 + tx, o.y1 + ty], [o.x1 - tx, o.y1 - ty], [o.x0 - tx, o.y0 - ty]], h: o.h }); }
      else if (o.type === 'eyetower') boxes.push([o.x - o.r, o.y - o.r, o.x + o.r, o.y + o.r, o.height]);
      else if (o.type === 'guillotine') { const vert = o.w < o.h, pw = 0.32, top = o.liftH + o.bladeH + 0.55; for (const [px, py] of vert ? [[o.x, o.y - o.h / 2 - pw / 2], [o.x, o.y + o.h / 2 + pw / 2]] : [[o.x - o.w / 2 - pw / 2, o.y], [o.x + o.w / 2 + pw / 2, o.y]]) boxes.push([px - pw / 2, py - pw / 2, px + pw / 2, py + pw / 2, top]); }
    }
    if (!boxes.length) return;
    ctx.save();
    ctx.beginPath(); // Schatten nur auf Bodenkacheln
    for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
      const c = lv.untenFl.tiles[y][x]; if (!lv.isFloorChar(c) || c === 'w' || c === 'l') continue;
      const [tsx, tsy] = this.proj(x + 0.5, y + 0.5); if (!this.onScreen(tsx, tsy, this.scale * 2)) continue;
      const p0 = this.proj(x, y, 0.002), p1 = this.proj(x + 1, y, 0.002), p2 = this.proj(x + 1, y + 1, 0.002), p3 = this.proj(x, y + 1, 0.002);
      ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath();
    }
    ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    for (const b of boxes) {
      let hull;
      if (Array.isArray(b)) { const [x0, y0, x1, y1, h] = b, ox = LX * h, oy = LY * h; hull = [[x0, y0], [x1, y0], [x1 + ox, y0 + oy], [x1 + ox, y1 + oy], [x0 + ox, y1 + oy], [x0, y1]]; }
      else { const ox = LX * b.h, oy = LY * b.h, pts = b.poly.concat(b.poly.map(p => [p[0] + ox, p[1] + oy])); hull = convexHull(pts); }
      const [cx, cy] = this.proj(hull[0][0], hull[0][1]); if (!this.onScreen(cx, cy, this.scale * 4)) continue;
      this.pathPoly(ctx, hull, 0.003); ctx.fill();
    }
    ctx.restore();
  }
  /* Tiefendunst zum Horizont (weit entfernte Teile der Bahn verschwimmen in der Himmelsfarbe) und eine leichte Randabdunklung */
  drawDepthCues(ctx) {
    const w = this.w, h = this.h, th = this.theme;
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.55);
    g.addColorStop(0, rgba(th.sky[1].startsWith('#') ? th.sky[1] : '#000000', 0.26)); g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h * 0.55);
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.45, w / 2, h / 2, Math.hypot(w, h) * 0.62);
    v.addColorStop(0, 'rgba(0,0,0,0)'); v.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
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
      /* Gibt es auf der Bahn eine Windfahne, weht der Schnee in ihre Richtung und flaut mit ihr ab
         – so sieht man den Wind auch dann, wenn man gerade nicht zur Fahne schaut. Ohne Fahne
         fällt er wie eh und je. */
      const wnd = this.wind, seit = wnd ? wnd.dx * 260 * wnd.staerke : 6;
      for (let i = 0; i < 60; i++) {
        const sp = (18 + hash(i, 1) * 22) * (wnd ? 0.5 + 0.5 * Math.abs(wnd.dy) * wnd.staerke + 0.4 : 1);
        const x = (((hash(i, 2) * (w + 300) + t * seit) % (w + 300)) + w + 300) % (w + 300) - 150;
        const y = (hash(i, 3) * h + t * sp + Math.sin(t * 0.7 + i) * 10) % h;
        ctx.fillStyle = `rgba(255,255,255,${0.35 + hash(i, 4) * 0.45})`;
        ctx.beginPath(); ctx.arc(x, y, 1.2 + hash(i, 5) * 1.8, 0, TAU); ctx.fill();
      }
    } else if (kind === 'blizzard') {
      /* Schneetreiben statt Schneefall: Am Berg fällt der Schnee nicht, er wird geweht. Darum
         laufen die Flocken hier flach von links nach rechts statt von oben nach unten, in Böen
         (der langsame Sinus), und ein paar lange Schlieren zeigen die Richtung. */
      const wnd = this.wind;
      const boe = wnd ? 0.25 + 1.15 * wnd.staerke : 0.75 + 0.45 * Math.sin(t * 0.45) + 0.2 * Math.sin(t * 1.7);
      const quer = wnd ? wnd.dx : 1, laengs = wnd ? wnd.dy : 0.12;
      for (let i = 0; i < 70; i++) {
        const sp = (150 + hash(i, 1) * 210) * boe;
        const x = ((((hash(i, 2) * (w + 400) + t * sp * quer) % (w + 400)) + w + 400) % (w + 400)) - 200;
        const y = (((hash(i, 3) * h + t * (14 + hash(i, 6) * 16 + sp * 0.55 * laengs) + Math.sin(t * 1.3 + i) * 9) % h) + h) % h;
        const lang = hash(i, 7) > 0.72;
        ctx.fillStyle = `rgba(255,255,255,${0.3 + hash(i, 4) * 0.45})`;
        if (lang) {
          const l = 9 + hash(i, 5) * 14;
          ctx.save(); ctx.translate(x, y); ctx.rotate(Math.atan2(laengs * 0.5, quer)); ctx.fillRect(0, 0, l, 1.2); ctx.restore();
        }
        else { ctx.beginPath(); ctx.arc(x, y, 1 + hash(i, 5) * 1.6, 0, TAU); ctx.fill(); }
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
  /* Räderwerk hinter der Welt: drei Ebenen ineinandergreifender Räder, dazu Wellen und Träger.
     Die Räder sind keine Scheiben mehr, sondern haben Dicke – jedes wird mehrfach gegeneinander
     versetzt gezeichnet, von hinten dunkel nach vorn hell. Je weiter hinten eine Ebene liegt,
     desto blasser und langsamer ist sie; das gibt dem Hintergrund Tiefe, ohne dass er die Bahn
     überstrahlt. Alles läuft nach der Spieluhr t, also auf jedem Gerät gleich. */
  drawSkyGears(ctx, t) {
    const w = this.w, h = this.h, m = Math.min(w, h);
    /* [x, y, Radius, Zähne, Tempo] je Anteil der Bildfläche, in drei Ebenen: hinten groß, blass
       und langsam, vorn kleiner, kräftiger und schneller. Die Paare stehen so, dass ihre Kränze
       einander berühren – ein Räderwerk, kein Haufen Räder.
       Tiefe kostet hier Fläche, und Fläche ist auf dem Hintergrund teuer: Darum bekommt jedes Rad
       genau einen versetzten Körper und darüber die helle Stirnfläche, nicht eine ganze Staffel. */
    const ebenen = [
      [0.05, 0.06, '150,110,60', [[0.1, 0.12, 0.26, 16, 0.06], [0.4, 0.03, 0.2, 13, -0.08], [0.82, 0.1, 0.3, 18, -0.05]]],
      [0.09, 0.1, '186,140,72', [[0.03, 0.44, 0.16, 11, -0.13], [0.32, 0.21, 0.13, 10, 0.16], [0.93, 0.42, 0.15, 11, -0.15]]],
      [0.15, 0.14, '214,166,86', [[0.19, 0.05, 0.09, 8, 0.3], [0.63, 0.12, 0.08, 9, 0.26]]],
    ];
    // Wellen und Träger zuerst, damit die Räder darauf zu sitzen scheinen
    ctx.strokeStyle = 'rgba(150,110,60,0.09)'; ctx.lineWidth = Math.max(2, m * 0.012);
    for (const [x0, y0, x1, y1] of [[0.1, 0.12, 0.4, 0.03], [0.4, 0.03, 0.82, 0.1], [0.03, 0.44, 0.32, 0.21]]) {
      ctx.beginPath(); ctx.moveTo(x0 * w, y0 * h); ctx.lineTo(x1 * w, y1 * h); ctx.stroke();
    }
    ctx.fillStyle = 'rgba(120,88,48,0.06)';
    for (const gx of [0.24, 0.58, 0.88]) ctx.fillRect(gx * w - m * 0.015, 0, m * 0.03, h * 0.5);
    for (const [tiefe, kraft, farbe, raeder] of ebenen) {
      for (const [gx, gy, gr, zn, sp] of raeder) {
        const r = gr * m * 1.4, x = gx * w, y = gy * h, wk = t * sp;
        if (x + r < 0 || x - r > w || y - r > h) continue;
        const tf = r * tiefe;
        ctx.fillStyle = `rgba(${farbe},${(kraft * 0.55).toFixed(3)})`;      // Körper, nach hinten versetzt
        this.gearPath(ctx, x + tf, y + tf * 0.5, r, zn, wk); ctx.fill();
        ctx.fillStyle = `rgba(${farbe},${kraft.toFixed(3)})`;               // Stirnfläche
        this.gearPath(ctx, x, y, r, zn, wk); ctx.fill();
        ctx.fillStyle = 'rgba(20,16,12,0.4)'; ctx.beginPath(); ctx.arc(x, y, r * 0.17, 0, TAU); ctx.fill();
        if (kraft < 0.09) continue;                                         // ferne Ebene: keine Speichen
        ctx.strokeStyle = `rgba(${farbe},${(kraft * 1.3).toFixed(3)})`;
        ctx.lineWidth = Math.max(2, r * 0.07); ctx.lineCap = 'round';
        for (let i = 0; i < 5; i++) {
          const a = wk + (i * TAU) / 5;
          ctx.beginPath();
          ctx.moveTo(x + Math.cos(a) * r * 0.2, y + Math.sin(a) * r * 0.2);
          ctx.lineTo(x + Math.cos(a) * r * 0.72, y + Math.sin(a) * r * 0.72);
          ctx.stroke();
        }
        ctx.lineCap = 'butt';
      }
    }
  }

  /* Das Räderwerk rings um die Bahn: große Zahnräder, die halb in der Erdscholle stecken und sich
     langsam drehen. Sie liegen bewusst außerhalb der Bahn – der Ball berührt sie nie, sie sollen
     nur zeigen, dass die Bahn in einer Maschine liegt und nicht auf einer Wiese. Platz und Größe
     folgen aus der Kartengröße, nicht aus Zufall: dieselbe Bahn sieht auf jedem Gerät gleich aus. */
  drawGroundGears(ctx, t) {
    const { W, H } = this.level, th = this.theme;
    const rand = 2.0;                                   // so weit außerhalb der Karte
    const stellen = [
      [-rand, H * 0.24, 1.7, 11, 0.22], [-rand * 0.7, H * 0.72, 1.2, 9, -0.3],
      [W + rand, H * 0.34, 1.9, 12, -0.2], [W + rand * 0.7, H * 0.78, 1.3, 10, 0.28],
      [W * 0.24, -rand, 1.5, 10, -0.26], [W * 0.62, -rand * 0.75, 1.1, 9, 0.33],
      [W * 0.34, H + rand * 0.8, 1.4, 10, 0.24], [W * 0.74, H + rand, 1.8, 12, -0.18],
    ];
    for (const [x, y, r, zn, sp] of stellen) {
      const [sx, sy] = this.projRaw(x, y, 0);
      if (!this.onScreen(sx, sy, this.scale * (r + 2))) continue;
      // Die Räder stecken im Boden: unten in der Scholle, oben ragt der Kranz heraus
      this.zahnrad(ctx, x, y, -0.5, r, 0.62, zn, t * sp, th.mover.top, th.mover.side,
        { outline: shade(th.mover.side, 0.6) });
    }
  }
  /* Küste: Horizont, ferne Segel und Möwen */
  drawSea(ctx, t) {
    const w = this.w, h = this.h, hz = h * 0.42;
    if (this.theme.darkSea) { this.drawDarkSea(ctx, t, hz); return; }
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
  /* Totensee: schwarzes Wasser, Nebelbank, Geisterschiffe mit violetten Laternen am Horizont */
  drawDarkSea(ctx, t, hz) {
    const w = this.w, h = this.h;
    const g = ctx.createLinearGradient(0, hz, 0, h); g.addColorStop(0, '#141a2e'); g.addColorStop(1, '#04060c'); ctx.fillStyle = g; ctx.fillRect(0, hz, w, h - hz);
    ctx.fillStyle = 'rgba(180,60,80,0.35)'; ctx.fillRect(0, hz, w, 2);
    const mx = w * 0.72; const mg = ctx.createLinearGradient(0, hz, 0, h * 0.7); mg.addColorStop(0, 'rgba(184,50,60,0.25)'); mg.addColorStop(1, 'rgba(184,50,60,0)'); ctx.fillStyle = mg; ctx.fillRect(mx - w * 0.06, hz, w * 0.12, h * 0.28); // Mondspiegelung
    for (let i = 0; i < 3; i++) { // Geisterschiffe
      const x = ((i * 0.31 + 0.1 + t * 0.004 * (i % 2 ? 1 : -1)) % 1 + 1) % 1 * w, y = hz + 5 + i * 4, s = 14 + i * 4, d = i % 2 ? 1 : -1;
      ctx.fillStyle = 'rgba(8,8,18,0.9)'; ctx.beginPath(); ctx.moveTo(x - s * 0.9, y - 2); ctx.lineTo(x + s * 0.9, y - 2); ctx.lineTo(x + s * 0.7, y + 3); ctx.lineTo(x - s * 0.7, y + 3); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(x, y - 2); ctx.lineTo(x, y - s * 1.9); ctx.lineTo(x + d * s * 0.8, y - 3); ctx.closePath(); ctx.fill(); ctx.fillRect(x - 1, y - s * 1.9, 2, s * 1.9);
      ctx.fillStyle = 'rgba(180,40,60,0.25)'; ctx.beginPath(); ctx.moveTo(x + d * 1, y - 3); ctx.lineTo(x + d * 1, y - s * 1.6); ctx.lineTo(x + d * s * 0.6, y - 4); ctx.closePath(); ctx.fill(); // zerfetztes Segel
      const la = 0.6 + 0.4 * Math.sin(t * 3 + i * 2); const lg = ctx.createRadialGradient(x - d * s * 0.6, y - 4, 0, x - d * s * 0.6, y - 4, s * 0.6); lg.addColorStop(0, `rgba(197,139,255,${0.8 * la})`); lg.addColorStop(1, 'rgba(197,139,255,0)'); ctx.fillStyle = lg; ctx.beginPath(); ctx.arc(x - d * s * 0.6, y - 4, s * 0.6, 0, TAU); ctx.fill();
    }
    for (let i = 0; i < 5; i++) { // Nebelbänke
      const x = ((i * 0.23 + t * 0.005) % 1) * w, y = hz + 12 + (i % 3) * 8, fw = w * 0.22, fh = 9 + (i % 2) * 4;
      const fg = ctx.createRadialGradient(x, y, 0, x, y, fw); fg.addColorStop(0, 'rgba(120,110,160,0.22)'); fg.addColorStop(1, 'rgba(120,110,160,0)'); ctx.fillStyle = fg; ctx.beginPath(); ctx.ellipse(x, y, fw, fh, 0, 0, TAU); ctx.fill();
    }
    ctx.strokeStyle = 'rgba(20,16,30,0.9)'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 5; i++) { // Raben statt Möwen
      const x = ((i * 0.21 + t * 0.015) % 1) * w, y = h * (0.08 + (i * 0.06) % 0.22) + Math.sin(t + i) * 5, s = 6 + (i % 3) * 3, fl = Math.sin(t * 6 + i) * s * 0.5;
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
      if (L === 1 && this.theme.pyramids) { // ferne Pyramiden zwischen den Dünenreihen
        ctx.fillStyle = '#b86a3a';
        for (const [px, pw, ph] of [[0.18, 0.13, 0.19], [0.36, 0.08, 0.12], [0.86, 0.1, 0.15]]) {
          const bx = px * w, by = h * 0.43, bw = pw * w, bh = ph * h;
          ctx.beginPath(); ctx.moveTo(bx - bw, by); ctx.lineTo(bx, by - bh); ctx.lineTo(bx + bw, by); ctx.closePath(); ctx.fill();
          ctx.fillStyle = '#8e4e2a'; ctx.beginPath(); ctx.moveTo(bx, by - bh); ctx.lineTo(bx + bw, by); ctx.lineTo(bx + bw * 0.15, by); ctx.closePath(); ctx.fill(); ctx.fillStyle = '#b86a3a';
        }
      }
      ctx.fillStyle = cols[L]; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 12) ctx.lineTo(x, h * (0.36 + L * 0.09) + Math.sin(x * 0.004 + L * 2 + t * 0.02) * h * 0.04 + Math.sin(x * 0.011 + L) * h * 0.015);
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
    }
  }
  /* Grabkammer: Sandsteinwand mit Hieroglyphen-Reihen und flackerndem Fackelschein */
  drawTomb(ctx, t) {
    const w = this.w, h = this.h, hash = (i, k) => Math.abs(Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1;
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#2a1c0e'); g.addColorStop(0.5, '#4a3418'); g.addColorStop(1, '#2a1c0e'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Steinquader
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 2;
    const bh = Math.max(40, h * 0.07), bw = bh * 2.2;
    for (let row = 0, y = 0; y < h; y += bh, row++) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke(); for (let x = (row % 2) * bw / 2; x < w; x += bw) { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y + bh); ctx.stroke(); } }
    // Hieroglyphen-Bänder
    ctx.fillStyle = 'rgba(255,200,110,0.16)';
    for (const band of [0.14, 0.5, 0.86]) {
      const y = h * band; ctx.fillRect(0, y - bh * 0.32, w, bh * 0.64);
      for (let i = 0; i < 40; i++) {
        const x = (i / 40) * w + bh * 0.2, k = Math.floor(hash(i, band * 10) * 4), sz = bh * 0.2;
        ctx.fillStyle = 'rgba(40,24,8,0.55)';
        if (k === 0) ctx.fillRect(x, y - sz, sz * 0.6, sz * 2);
        else if (k === 1) { ctx.beginPath(); ctx.arc(x + sz * 0.4, y, sz * 0.55, 0, TAU); ctx.fill(); }
        else if (k === 2) { ctx.beginPath(); ctx.moveTo(x, y + sz); ctx.lineTo(x + sz * 0.5, y - sz); ctx.lineTo(x + sz, y + sz); ctx.closePath(); ctx.fill(); }
        else { ctx.beginPath(); ctx.ellipse(x + sz * 0.5, y, sz * 0.9, sz * 0.4, 0, 0, TAU); ctx.fill(); }
        ctx.fillStyle = 'rgba(255,200,110,0.16)';
      }
    }
    // Fackelschein
    for (const [fx, fy, ph] of [[0.12, 0.3, 0], [0.5, 0.18, 2], [0.88, 0.32, 4]]) {
      const gl = 0.8 + 0.2 * Math.sin(t * 7 + ph) * Math.sin(t * 3.3 + ph);
      const rg = ctx.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, w * 0.28);
      rg.addColorStop(0, `rgba(255,170,70,${0.22 * gl})`); rg.addColorStop(1, 'rgba(255,170,70,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h);
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
    const c = this.level.cup, k = (c.r || 0.42) / 0.42; // größere Löcher (Schattenreich) auch größer zeichnen
    const e = (this.level.cupEbene || 0) * (this.level.ebeneZ || 0);   // das Loch liegt auf seiner Ebene
    this.isoEllipse(ctx, c.x, c.y, e + 0.005, 0.5 * k, 'rgba(255,255,255,0.35)');
    this.isoEllipse(ctx, c.x, c.y, e + 0.01, 0.42 * k, '#0e0b16');
    this.isoEllipse(ctx, c.x, c.y - 0.05 * k, e + 0.012, 0.32 * k, '#241c35');
  }
  /* Fahne am Loch: Stange mit Messingspitze und Fuß am Lochrand, wehendes Tuch mit Falten – Farben, Muster und
     Wappen kommen aus FLAG_DESIGNS je Thema (Krone fürs Märchenland, Anker am Meer, Totenkopf im Schattenreich …) */
  drawFlag(ctx, t) {
    const c = this.level.cup, th = this.theme, s = this.scale, d = FLAG_DESIGNS[this.level.def.theme] || { main: th.flag, second: th.accent, emblem: 'star', pattern: 'band' };
    const flag = d.main, dark = shade(flag, 0.6), light = shade(flag, 1.25), sec = d.second, emCol = d.emblemColor || sec;
    const e = (this.level.cupEbene || 0) * (this.level.ebeneZ || 0);
    const [bx, by] = this.proj(c.x, c.y, e), [tx, ty] = this.proj(c.x, c.y, e + 1.9);
    const H = by - ty, top = ty + H * 0.06, w = s * 0.95, h = s * 0.5, ph = t * 3.2 + c.x;
    const wv = u => Math.sin(ph - u * 4.5) * s * 0.07 * u; // Wellenversatz entlang des Tuchs (am Stock 0)
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.beginPath(); ctx.ellipse(bx + w * 0.45, by + s * 0.05, w * 0.42, s * 0.09, 0, 0, TAU); ctx.fill(); // Schatten des Tuchs
    ctx.fillStyle = '#2a2430'; ctx.beginPath(); ctx.ellipse(bx, by, s * 0.13, s * 0.06, 0, 0, TAU); ctx.fill(); // Fuß
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#1e1a24'; ctx.lineWidth = Math.max(2.5, s * 0.1); ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(tx, ty); ctx.stroke();
    ctx.strokeStyle = d.pole || '#f4efe6'; ctx.lineWidth = Math.max(1.2, s * 0.05); ctx.beginPath(); ctx.moveTo(bx - s * 0.015, by); ctx.lineTo(tx - s * 0.015, ty); ctx.stroke();
    const edge = (y0, y1) => { const pts = []; for (let k = 0; k <= 8; k++) { const u = k / 8; pts.push([tx + w * u, y0 + (y1 - y0) * u + wv(u)]); } return pts; };
    const topE = edge(top, top + h * 0.18), botE = edge(top + h, top + h * 0.82);
    const path = () => {
      ctx.beginPath(); ctx.moveTo(topE[0][0], topE[0][1]);
      for (let k = 1; k < topE.length; k++) ctx.lineTo(topE[k][0], topE[k][1]);
      const tipT = topE[8], tipB = botE[8]; ctx.lineTo(tipT[0] - w * 0.16, (tipT[1] + tipB[1]) / 2); ctx.lineTo(tipB[0], tipB[1]); // Schwalbenschwanz
      for (let k = botE.length - 2; k >= 0; k--) ctx.lineTo(botE[k][0], botE[k][1]);
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(tx, top, tx + w, top + h); g.addColorStop(0, light); g.addColorStop(0.45, flag); g.addColorStop(1, dark);
    path(); ctx.fillStyle = g; ctx.fill();
    ctx.save(); path(); ctx.clip();
    // Muster in der Zweitfarbe (folgt der Welle)
    const py = (u, v) => { const yt = top + h * 0.18 * u + wv(u), yb = top + h - h * 0.18 * u + wv(u); return yt + (yb - yt) * v; };
    ctx.fillStyle = sec;
    if (d.pattern === 'band') { ctx.beginPath(); for (let k = 0; k <= 8; k++) { const u = k / 8; const q = [tx + w * u, py(u, 0.4)]; k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } for (let k = 8; k >= 0; k--) { const u = k / 8; ctx.lineTo(tx + w * u, py(u, 0.6)); } ctx.closePath(); ctx.fill(); }
    else if (d.pattern === 'stripes') { for (const [a, b] of [[0.12, 0.28], [0.44, 0.56], [0.72, 0.88]]) { ctx.beginPath(); for (let k = 0; k <= 8; k++) { const u = k / 8; const q = [tx + w * u, py(u, a)]; k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } for (let k = 8; k >= 0; k--) { const u = k / 8; ctx.lineTo(tx + w * u, py(u, b)); } ctx.closePath(); ctx.fill(); } }
    else if (d.pattern === 'chevron') { ctx.beginPath(); ctx.moveTo(tx, py(0, 0)); ctx.lineTo(tx + w * 0.32, py(0.32, 0.5)); ctx.lineTo(tx, py(0, 1)); ctx.closePath(); ctx.fill(); }
    else if (d.pattern === 'checker') { for (let i = 0; i < 6; i++) for (let j = 0; j < 3; j++) { if ((i + j) % 2) continue; const u0 = i / 6, u1 = (i + 1) / 6, v0 = j / 3, v1 = (j + 1) / 3; ctx.beginPath(); ctx.moveTo(tx + w * u0, py(u0, v0)); ctx.lineTo(tx + w * u1, py(u1, v0)); ctx.lineTo(tx + w * u1, py(u1, v1)); ctx.lineTo(tx + w * u0, py(u0, v1)); ctx.closePath(); ctx.fill(); } }
    else if (d.pattern === 'diag') { ctx.globalAlpha = 0.85; for (const k0 of [-0.35, 0.25]) { ctx.beginPath(); ctx.moveTo(tx + w * Math.max(0, k0), py(Math.max(0, k0), Math.max(0, -k0 * 2))); ctx.lineTo(tx + w * Math.min(1, k0 + 0.5), py(Math.min(1, k0 + 0.5), 1)); ctx.lineTo(tx + w * Math.min(1, k0 + 0.65), py(Math.min(1, k0 + 0.65), 1)); ctx.lineTo(tx + w * Math.max(0, k0 + 0.15), py(Math.max(0, k0 + 0.15), Math.max(0, -(k0 + 0.15) * 2))); ctx.closePath(); ctx.fill(); } ctx.globalAlpha = 1; }
    else if (d.pattern === 'edge') { ctx.beginPath(); for (let k = 0; k <= 8; k++) { const u = k / 8; const q = [tx + w * u, py(u, 0)]; k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } for (let k = 8; k >= 0; k--) { const u = k / 8; ctx.lineTo(tx + w * u, py(u, 0.16)); } ctx.closePath(); ctx.fill(); ctx.beginPath(); for (let k = 0; k <= 8; k++) { const u = k / 8; const q = [tx + w * u, py(u, 0.84)]; k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]); } for (let k = 8; k >= 0; k--) { const u = k / 8; ctx.lineTo(tx + w * u, py(u, 1)); } ctx.closePath(); ctx.fill(); }
    // Falten: helle und dunkle Streifen, die mit der Welle wandern
    for (let k = 1; k <= 3; k++) { const u = k / 4, x = tx + w * u, sway = Math.cos(ph - u * 4.5); ctx.fillStyle = sway > 0 ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.16)'; ctx.fillRect(x - w * 0.07, top - s * 0.2, w * 0.14, h + s * 0.4); }
    ctx.restore();
    path(); ctx.strokeStyle = d.border || shade(flag, 0.45); ctx.lineWidth = Math.max(1, s * 0.035); ctx.stroke(); // Bordüre
    this.flagEmblem(ctx, d.emblem, tx + w * 0.4, py(0.4, 0.5), s * 0.13, emCol, d.emblemDark || shade(emCol, 0.5), t); // Wappen
    // Messingspitze mit Glanz
    const kg = ctx.createRadialGradient(tx - s * 0.03, ty - s * 0.04, s * 0.02, tx, ty, s * 0.1);
    kg.addColorStop(0, '#fff3c4'); kg.addColorStop(0.6, d.finial || '#ffd166'); kg.addColorStop(1, shade(d.finial || '#ffd166', 0.5));
    ctx.fillStyle = kg; ctx.beginPath(); ctx.arc(tx, ty, s * 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(d.finial || '#ffd166', 0.25 + 0.2 * Math.sin(t * 2.5)); ctx.beginPath(); ctx.arc(tx, ty, s * 0.2, 0, TAU); ctx.fill();
  }
  /* Kleine Wappen fürs Fahnentuch (Bildschirmkoordinaten, r = halbe Größe) */
  flagEmblem(ctx, kind, x, y, r, col, dark, t) {
    ctx.save(); ctx.translate(x, y); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.fillStyle = col; ctx.strokeStyle = dark; ctx.lineWidth = Math.max(1, r * 0.14);
    const P = pts => { ctx.beginPath(); pts.forEach((q, i) => i ? ctx.lineTo(q[0] * r, q[1] * r) : ctx.moveTo(q[0] * r, q[1] * r)); ctx.closePath(); };
    switch (kind) {
      case 'crown': P([[-1, 0.8], [-1, -0.3], [-0.5, 0.2], [0, -0.9], [0.5, 0.2], [1, -0.3], [1, 0.8]]); ctx.fill(); ctx.stroke(); ctx.fillStyle = dark; for (const k of [-0.6, 0, 0.6]) { ctx.beginPath(); ctx.arc(k * r, r * 0.45, r * 0.13, 0, TAU); ctx.fill(); } break;
      case 'anchor': ctx.lineWidth = Math.max(1.5, r * 0.28); ctx.strokeStyle = col; ctx.beginPath(); ctx.arc(0, -0.7 * r, r * 0.22, 0, TAU); ctx.stroke(); ctx.beginPath(); ctx.moveTo(0, -0.48 * r); ctx.lineTo(0, r); ctx.moveTo(-0.55 * r, -0.2 * r); ctx.lineTo(0.55 * r, -0.2 * r); ctx.stroke(); ctx.beginPath(); ctx.arc(0, 0.25 * r, r * 0.75, 0.35, Math.PI - 0.35); ctx.stroke(); break;
      case 'skull': ctx.beginPath(); ctx.arc(0, -0.15 * r, r * 0.7, 0, TAU); ctx.fill(); ctx.fillRect(-0.4 * r, 0.2 * r, 0.8 * r, 0.6 * r); ctx.fillStyle = dark; for (const k of [-0.28, 0.28]) { ctx.beginPath(); ctx.arc(k * r, -0.2 * r, r * 0.2, 0, TAU); ctx.fill(); } ctx.fillRect(-0.06 * r, 0.1 * r, 0.12 * r, 0.22 * r); for (const k of [-0.25, 0.05]) ctx.fillRect(k * r, 0.5 * r, 0.08 * r, 0.3 * r); break;
      case 'lightning': P([[0.1, -1], [-0.6, 0.1], [-0.05, 0.1], [-0.3, 1], [0.6, -0.2], [0.05, -0.2]]); ctx.fill(); ctx.stroke(); break;
      case 'flame': ctx.beginPath(); ctx.moveTo(0, r); ctx.quadraticCurveTo(-1.0 * r, 0.2 * r, -0.2 * r, -0.5 * r); ctx.quadraticCurveTo(0, -0.9 * r, 0.1 * r, -1.0 * r); ctx.quadraticCurveTo(0.2 * r, -0.4 * r, 0.5 * r, -0.3 * r); ctx.quadraticCurveTo(1.0 * r, 0.3 * r, 0, r); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.moveTo(0, 0.7 * r); ctx.quadraticCurveTo(-0.35 * r, 0.2 * r, 0, -0.2 * r); ctx.quadraticCurveTo(0.35 * r, 0.2 * r, 0, 0.7 * r); ctx.fill(); break;
      case 'snowflake': ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, r * 0.16); for (let i = 0; i < 3; i++) { const a = i * Math.PI / 3, dx = Math.cos(a), dy = Math.sin(a); ctx.beginPath(); ctx.moveTo(-dx * r, -dy * r); ctx.lineTo(dx * r, dy * r); ctx.stroke(); for (const sg of [-1, 1]) for (const k of [0.55]) { ctx.beginPath(); ctx.moveTo(dx * k * r * sg, dy * k * r * sg); ctx.lineTo((dx * k + Math.cos(a + 0.6) * 0.3) * r * sg, (dy * k + Math.sin(a + 0.6) * 0.3) * r * sg); ctx.moveTo(dx * k * r * sg, dy * k * r * sg); ctx.lineTo((dx * k + Math.cos(a - 0.6) * 0.3) * r * sg, (dy * k + Math.sin(a - 0.6) * 0.3) * r * sg); ctx.stroke(); } } break;
      case 'gear': this.gearPath(ctx, 0, 0, r, 8, t * 0.8); ctx.fill(); ctx.stroke(); ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, 0, r * 0.3, 0, TAU); ctx.fill(); break;
      case 'moon': ctx.beginPath(); ctx.arc(0, 0, r * 0.9, 0, TAU); ctx.fill(); ctx.stroke(); ctx.globalCompositeOperation = 'destination-out'; ctx.beginPath(); ctx.arc(0.45 * r, -0.25 * r, r * 0.75, 0, TAU); ctx.fill(); ctx.globalCompositeOperation = 'source-over'; break;
      case 'sun': ctx.strokeStyle = col; ctx.lineWidth = Math.max(1, r * 0.16); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4; ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r); ctx.stroke(); } ctx.beginPath(); ctx.arc(0, 0, r * 0.42, 0, TAU); ctx.fill(); ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.stroke(); break;
      case 'leaf': ctx.beginPath(); ctx.ellipse(0, 0, r * 0.55, r, -0.6, 0, TAU); ctx.fill(); ctx.stroke(); ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-0.5 * r, 0.75 * r); ctx.lineTo(0.5 * r, -0.75 * r); ctx.stroke(); break;
      case 'mushroom': ctx.fillStyle = '#f3e6c8'; ctx.fillRect(-0.28 * r, 0, 0.56 * r, r); ctx.fillStyle = col; ctx.beginPath(); ctx.arc(0, 0.05 * r, r, Math.PI, TAU); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.fillStyle = '#ffffff'; for (const [a, b] of [[-0.45, -0.4], [0.3, -0.6], [0.55, -0.15]]) { ctx.beginPath(); ctx.arc(a * r, b * r, r * 0.16, 0, TAU); ctx.fill(); } break;
      case 'wave': ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, r * 0.24); for (const yy of [-0.35, 0.35]) { ctx.beginPath(); ctx.moveTo(-r, yy * r); ctx.quadraticCurveTo(-0.5 * r, (yy - 0.6) * r, 0, yy * r); ctx.quadraticCurveTo(0.5 * r, (yy + 0.6) * r, r, yy * r); ctx.stroke(); } break;
      case 'cloud': ctx.beginPath(); ctx.arc(-0.45 * r, 0.1 * r, r * 0.45, 0, TAU); ctx.arc(0.05 * r, -0.2 * r, r * 0.6, 0, TAU); ctx.arc(0.55 * r, 0.15 * r, r * 0.45, 0, TAU); ctx.fill(); ctx.stroke(); break;
      case 'hammer': ctx.strokeStyle = '#8a5a30'; ctx.lineWidth = Math.max(1.5, r * 0.22); ctx.beginPath(); ctx.moveTo(-0.6 * r, 0.9 * r); ctx.lineTo(0.4 * r, -0.4 * r); ctx.stroke(); ctx.save(); ctx.translate(0.45 * r, -0.5 * r); ctx.rotate(0.65); ctx.fillStyle = col; ctx.fillRect(-0.55 * r, -0.32 * r, 1.1 * r, 0.64 * r); ctx.strokeStyle = dark; ctx.lineWidth = 1; ctx.strokeRect(-0.55 * r, -0.32 * r, 1.1 * r, 0.64 * r); ctx.restore(); break;
      case 'eye': ctx.beginPath(); ctx.moveTo(-r, 0); ctx.quadraticCurveTo(0, -0.9 * r, r, 0); ctx.quadraticCurveTo(0, 0.9 * r, -r, 0); ctx.fill(); ctx.stroke(); ctx.fillStyle = dark; ctx.beginPath(); ctx.arc(0, 0, r * 0.35, 0, TAU); ctx.fill(); break;
      default: { const pts = []; for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? 0.45 : 1; pts.push([Math.cos(a) * rr, Math.sin(a) * rr]); } P(pts); ctx.fill(); ctx.stroke(); }
    }
    ctx.restore();
  }
  drawBall(ctx, b) {
    const s = this.scale;
    const br = b.r || BALL_R;
    // Auf der oberen Ebene liegt der Ball eine Etage höher – sonst klebte er am unteren Boden
    const ebZ = (b.ebene || 0) * (this.level.ebeneZ || 0);
    const dark = !b.sunk && this.level.obstacles.some(o => o.type === 'field' && o.style === 'dark' && o.inside(b.x, b.y));
    if (dark) ctx.globalAlpha = 0.14;
    let r = br * s, z = b.z + br;
    if (b.sunk) { // in das Loch fallen: kleiner werden, absinken, dann weg
      const p = Math.min(1, b.sinkT / 0.35);
      if (p >= 1) return;
      r *= 1 - p * 0.8; z = 0.3 - p * 0.6;
    } else this.isoEllipse(ctx, b.x, b.y, ebZ, br * Math.max(0.15, 1 - b.z * 0.2), 'rgba(0,0,0,0.3)');
    const [sx, sy] = this.proj(b.x, b.y, z + ebZ);
    const g = ctx.createRadialGradient(sx - r * 0.35, sy - r * 0.4, r * 0.1, sx, sy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, b.color); g.addColorStop(1, shade(b.color, 0.55));
    if (b.curse && !b.sunk) { // Perlenfluch: perlmuttfarbener Schimmer um den Ball
      const gl = 0.5 + 0.3 * Math.sin((this.t || 0) * 4);
      ctx.fillStyle = `rgba(255,240,205,${0.28 * gl})`; ctx.beginPath(); ctx.arc(sx, sy, r * 2.1, 0, TAU); ctx.fill();
      ctx.strokeStyle = `rgba(255,255,255,${0.6 * gl})`; ctx.lineWidth = Math.max(1, s * 0.03); ctx.beginPath(); ctx.arc(sx, sy, r * 1.5, 0, TAU); ctx.stroke();
    }
    // Ein Ganzkörper-Skin bringt seine eigene Kugel mit – dann entfällt der gewöhnliche Ball
    const skin = b.hat && typeof Hats !== 'undefined' && Hats.voll(b.hat);
    if (!skin) {
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    }
    if (b.hat && typeof Hats !== 'undefined') Hats.draw(ctx, b.hat, sx, sy, r, b.color, this.t || 0); // gewählter Hut
    if (dark) ctx.globalAlpha = 1;
  }
  drawAim(ctx, ball, aim) {
    const { dx, dy, power } = aim;
    if (power <= 0.01) return;
    const e = (ball.ebene || 0) * (this.level.ebeneZ || 0);   // die Ziellinie liegt auf der Ebene des Balls
    const len = 1.2 + power * 6.5;
    const col = power < 0.5 ? `rgb(${Math.round(120 + power * 2 * 135)},230,90)` : `rgb(255,${Math.round(230 - (power - 0.5) * 2 * 160)},70)`;
    ctx.fillStyle = col; ctx.strokeStyle = col;
    const step = 0.45;
    for (let d = 0.5; d < len; d += step) {
      const [sx, sy] = this.proj(ball.x + dx * d, ball.y + dy * d, e + 0.02);
      ctx.globalAlpha = 0.9 - (d / len) * 0.5;
      ctx.beginPath(); ctx.arc(sx, sy, this.scale * 0.08, 0, TAU); ctx.fill();
    }
    ctx.globalAlpha = 1;
    // Pfeilspitze
    const [hx, hy] = this.proj(ball.x + dx * len, ball.y + dy * len, e + 0.02);
    const [lx, ly] = this.proj(ball.x + dx * (len - 0.5) - dy * 0.3, ball.y + dy * (len - 0.5) + dx * 0.3, e + 0.02);
    const [rx, ry] = this.proj(ball.x + dx * (len - 0.5) + dy * 0.3, ball.y + dy * (len - 0.5) - dx * 0.3, e + 0.02);
    ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(lx, ly); ctx.lineTo(rx, ry); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.7)';
    const [bx, by] = this.proj(ball.x, ball.y, e + 0.01);
    ctx.beginPath(); ctx.ellipse(bx, by, 0.5 * this.scale, 0.5 * this.scale * this.cam.tilt, 0, 0, TAU); ctx.stroke();
  }

  /* Pendel: ein Rotor mit einer einzigen Stange, die im Takt hin und her schwingt (rotor.swing).
     Gezeichnet werden die Aufhängung, die Messingstange und die schwere Linse am Ende. Die Linse
     sitzt genau am Stangenende, denn dort endet auch der Balken, an dem der Ball abprallt – was man
     sieht, muss das sein, was trifft. */
  drawPendel(ctx, ob, t) {
    const s = this.scale, th = this.theme;
    const a = ob.bladeAngle(0), ca = Math.cos(a), sa = Math.sin(a);
    const ex = ob.x + ca * ob.len, ey = ob.y + sa * ob.len;
    // Stange als flaches Prisma, damit sie sich in die Schrägsicht einfügt
    const tk = ob.thick * 0.7;
    const stange = [[ob.x - sa * tk, ob.y + ca * tk], [ex - sa * tk, ey + ca * tk], [ex + sa * tk, ey - ca * tk], [ob.x + sa * tk, ob.y - ca * tk]];
    this.prism(ctx, stange, 0.55, 0.1, th.rotor.top, th.rotor.side);
    // Aufhängung: ein Bock über dem Drehpunkt
    const hub = this.circlePoly(ob.x, ob.y, ob.hubR * 0.8, 8);
    this.prism(ctx, hub, 0, 0.85, th.rotor.top, th.rotor.side);
    // Linse: eine schwere Messingscheibe am Stangenende, hochkant
    const [lx, ly] = this.proj(ex, ey, 0.62);
    const r = s * Math.max(0.34, ob.thick * 2.4);
    const g = ctx.createRadialGradient(lx - r * 0.3, ly - r * 0.35, r * 0.1, lx, ly, r);
    g.addColorStop(0, '#ffe9b0'); g.addColorStop(0.55, th.rotor.top); g.addColorStop(1, th.rotor.side);
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(lx, ly, r, r * 0.92, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,26,8,0.55)'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    // Der Glanzpunkt wandert mit der Schwingung – daran sieht man die Richtung auf einen Blick
    ctx.fillStyle = 'rgba(255,255,235,0.75)';
    ctx.beginPath(); ctx.ellipse(lx - r * 0.32 * Math.sign(ob.omega || 1), ly - r * 0.3, r * 0.24, r * 0.16, 0, 0, TAU); ctx.fill();
  }

  /* Dampfventil: ein Feld mit gust – die Kraft schwillt im Takt an und ab (ob.k von 0 bis 1).
     Gezeichnet wird eine Düse an der windzugewandten Kante und davor Dampfschwaden, die mit dem
     Stoß wachsen. Bei k = 0 bleibt nur ein Rest Schwaden stehen: Man soll sehen, wo es gleich
     bläst, auch wenn es gerade nicht bläst. */
  drawSteam(ctx, ob, t) {
    const s = this.scale;
    const L = Math.hypot(ob.fx, ob.fy) || 1, ux = ob.fx / L, uy = ob.fy / L, px = -uy, py = ux;
    const cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2;
    const laengs = Math.abs(ux) > Math.abs(uy) ? ob.w : ob.h;
    const quer = Math.abs(ux) > Math.abs(uy) ? ob.h : ob.w;
    const k = ob.k ?? 1;
    // Düse: ein kurzes Rohr am Anfang des Feldes
    const dx = cx - ux * laengs / 2, dy = cy - uy * laengs / 2;
    const duese = [[dx - px * quer * 0.3 - ux * 0.28, dy - py * quer * 0.3 - uy * 0.28],
      [dx + px * quer * 0.3 - ux * 0.28, dy + py * quer * 0.3 - uy * 0.28],
      [dx + px * quer * 0.3, dy + py * quer * 0.3], [dx - px * quer * 0.3, dy - py * quer * 0.3]];
    this.prism(ctx, duese, 0, 0.34, '#c08a3e', '#6e4a1c');
    // Schwaden: Ballen, die aus der Düse wachsen und mit der Entfernung verwehen
    const n = Math.max(5, Math.round(laengs * 2.2));
    for (let i = 0; i < n; i++) {
      const u = (((t * 0.75 + i / n) % 1) + 1) % 1;         // 0 an der Düse, 1 am Ende
      const lat = ((i * 0.618) % 1 - 0.5) * quer * 0.7;
      const bx = dx + ux * u * laengs + px * lat, by = dy + uy * u * laengs + py * lat;
      const [sx, sy] = this.proj(bx, by, 0.12 + u * 0.22);
      const gross = s * (0.2 + u * 0.62) * (0.5 + 0.5 * k);
      const deck = (0.9 - 0.72 * u) * (0.3 + 0.7 * k);
      ctx.fillStyle = `rgba(246,250,255,${deck.toFixed(3)})`;
      ctx.beginPath(); ctx.arc(sx, sy, gross, 0, TAU); ctx.fill();
    }
    // Beim vollen Stoß ein heller Kern direkt vor der Düse
    if (k > 0.35) {
      const [kx, ky] = this.proj(dx + ux * 0.35, dy + uy * 0.35, 0.16);
      ctx.fillStyle = `rgba(255,255,255,${(0.85 * (k - 0.35) / 0.65).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(kx, ky, s * 0.32, 0, TAU); ctx.fill();
    }
  }

  /* ---------- Hindernisse ---------- */
  /* Eine Maschine „spannt Ebenen", wenn sie von einer Etage zur nächsten reicht: Seilbahn mit
     'ziel', Aufzug und Zahnstange. Solche Körper dürfen nicht in die normale Tiefensortierung –
     die Schollen und Wolkenbänke werden danach gezeichnet und übermalten sie. Am schlimmsten auf
     einer Wolke: Die wird voll deckend gezeichnet, wenn der Ball darauf steht, und dann ist die
     Gondel, mit der man gekommen ist, spurlos weg. Also kommen sie nach den Ebenen dran. */
  spanntEbenen(ob) {
    const lv = this.level;
    if (!lv || !lv.flaechen || lv.flaechen.length < 2) return false;
    if (ob.type === 'seilbahn') return ob.ziel != null && ob.ziel !== (ob.ebene || 0);
    return ob.type === 'aufzug' || ob.type === 'zahnstange';
  }
  drawSpannendeMaschinen(ctx, t) {
    const lv = this.level;
    if (!lv || !lv.flaechen || lv.flaechen.length < 2) return;
    const dran = lv.obstacles.filter(o => this.spanntEbenen(o));
    // von unten nach oben, damit eine höher endende Maschine vor einer tieferen steht
    dran.sort((a, b) => ((a.ziel != null ? a.ziel : (a.ebene || 0)) - (b.ziel != null ? b.ziel : (b.ebene || 0))));
    for (const ob of dran) {
      if (ob.type === 'seilbahn') this.drawSeilbahn(ctx, ob, t);
      else if (ob.type === 'aufzug') this.drawAufzug(ctx, ob, t);
      else if (ob.type === 'zahnstange') this.drawZahnstange(ctx, ob, t);
    }
  }
  drawObstacleFloor(ctx, ob, t) {
    const s = this.scale;
    if (ob.type === 'lightning') { this.drawLightningFloor(ctx, ob, t); return; }
    if (ob.type === 'updraft') { this.drawUpdraft(ctx, ob, t); return; }
    if (ob.type === 'trapdoor') { this.drawTrapdoor(ctx, ob, t); return; }
    if (ob.type === 'guillotine') { this.drawGuillotineFloor(ctx, ob, t); return; }
    if (ob.type === 'eyetower') { this.drawEyeBeam(ctx, ob, t); return; }
    if (ob.type === 'firetower') { this.drawFireSweep(ctx, ob, t); return; }
    if (ob.type === 'imperialbox') { this.drawLogeLuke(ctx, ob, t); return; }
    if (ob.type === 'gearlift') { this.drawGearLiftFloor(ctx, ob, t); return; }
    if (ob.type === 'piston') { this.drawPistonFloor(ctx, ob, t); return; }
    if (ob.type === 'hand') { this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.len + 0.2, 'rgba(0,0,0,0.1)'); return; }
    if (ob.type === 'pendulum') { this.drawPendulumFloor(ctx, ob, t); return; }
    if (ob.type === 'springwork') { this.drawSpringWorkFloor(ctx, ob, t); return; }
    if (ob.type === 'escapement') { this.drawEscapementFloor(ctx, ob, t); return; }
    if (ob.type === 'sweephand') { this.drawSweepHandFloor(ctx, ob, t); return; }
    if (ob.type === 'handclock') { this.drawHandClockFloor(ctx, ob, t); return; }
    if (ob.type === 'turbine') { this.drawTurbineFloor(ctx, ob, t); return; }
    if (ob.type === 'luke') { if (!(ob.ebene || 0)) this.drawLuke(ctx, ob, 0); return; }   // höhere Ebenen zeichnet zeichneEbene
    if (ob.type === 'windfahne') { this.drawWindfahneFloor(ctx, ob, t); return; }
    if (ob.type === 'lawine') { this.drawLawineFloor(ctx, ob, t); return; }
    if (ob.type === 'seilbahn') { this.drawSeilbahnFloor(ctx, ob, t); return; }
    if (ob.type === 'schneebruecke') { this.drawSchneebrueckeFloor(ctx, ob, t); return; }
    if (ob.type === 'dial' || ob.type === 'wanderloch') { this.drawWanderlochFloor(ctx, ob, t); return; }
    if (ob.type === 'field' && ob.style === 'steam') { this.drawSteam(ctx, ob, t); return; }
    if (ob.type === 'field' && ob.style === 'dark') { this.drawDarkZone(ctx, ob, t); return; }
    if (ob.type === 'boost' || (ob.type === 'field' && (ob.style === 'wind' || ob.style === 'current'))) { this.drawWind(ctx, ob, t); return; }
    if (ob.type === 'field') {
      const poly = [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h]];
      const isBoost = ob.type === 'boost';
      const dx = isBoost ? ob.dx : ob.fx, dy = isBoost ? ob.dy : ob.fy;
      const L = Math.hypot(dx, dy) || 1, ux = dx / L, uy = dy / L;
      const slope = ob.style === 'slope';
      /* Eine Schräge ist sonst erdbraun – auf einem Schneeberg sähe das aus wie ein Feldweg.
         Wo die Palette es sagt ('hangStil'), wird sie zur Schneerinne: blaugraue Mulde, heller
         Kamm. Dieselbe Sprache wie die Windfahnen auf dem Boden. */
      const schneehang = slope && this.theme.hangStil === 'schnee';
      this.fillPoly(ctx, poly, 0.005, isBoost ? 'rgba(255,220,90,0.28)'
        : schneehang ? 'rgba(126,162,204,0.26)' : slope ? 'rgba(90,60,20,0.22)' : 'rgba(200,230,255,0.22)', false);
      ctx.strokeStyle = isBoost ? 'rgba(255,240,160,0.9)'
        : schneehang ? 'rgba(255,255,255,0.85)' : slope ? 'rgba(80,50,20,0.75)' : 'rgba(230,245,255,0.7)';
      ctx.lineWidth = Math.max(1.5, s * 0.06);
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
    } else if (ob.type === 'wandergate') {
      // Der Durchlass wird auf dem Boden hell markiert – man soll von weitem sehen, wo er gerade steht
      const q = ob.gap / 2, nx = -ob.uy * 0.45, ny = ob.ux * 0.45;
      const poly = [[ob.gx - ob.ux * q + nx, ob.gy - ob.uy * q + ny], [ob.gx + ob.ux * q + nx, ob.gy + ob.uy * q + ny],
        [ob.gx + ob.ux * q - nx, ob.gy + ob.uy * q - ny], [ob.gx - ob.ux * q - nx, ob.gy - ob.uy * q - ny]];
      this.fillPoly(ctx, poly, 0.006, 'rgba(255,214,110,0.28)', false);
    } else if (ob.type === 'rail') {
      const horiz = ob.x0 !== undefined;
      const laengs = (off, z) => horiz
        ? [this.proj(ob.x0, ob.y + off, z), this.proj(ob.x1, ob.y + off, z)]
        : [this.proj(ob.x + off, ob.y0, z), this.proj(ob.x + off, ob.y1, z)];
      if (this.theme.rails === 'groove') {
        /* Im Kolosseum fährt der Streitwagen nicht auf Eisen: In den Sandboden sind zwei flache
           Rillen eingelassen. Gezeichnet werden sie als helle Spur mit einem dünnen Schattenstrich
           an der Oberkante – das liest sich als Vertiefung. Keine Schwellen, die gehören zur Lore. */
        for (const off of [-0.24, 0.24]) {
          const [a, b] = laengs(off, 0.012);
          ctx.strokeStyle = 'rgba(255,244,214,0.65)'; ctx.lineWidth = Math.max(2, s * 0.13);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
          const [c, d] = laengs(off - 0.05, 0.013);
          ctx.strokeStyle = 'rgba(120,96,56,0.30)'; ctx.lineWidth = Math.max(1, s * 0.05);
          ctx.beginPath(); ctx.moveTo(c[0], c[1]); ctx.lineTo(d[0], d[1]); ctx.stroke();
        }
      } else {
        ctx.strokeStyle = 'rgba(40,30,25,0.8)'; ctx.lineWidth = Math.max(1, s * 0.05);
        for (const off of [-0.25, 0.25]) {
          const [a, b] = laengs(off, 0.01);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
        const from = horiz ? ob.x0 : ob.y0, to = horiz ? ob.x1 : ob.y1;
        for (let k = from + 0.3; k < to; k += 0.6) {   // Schwellen
          const [a0, a1] = horiz ? this.proj(k, ob.y - 0.35, 0.01) : this.proj(ob.x - 0.35, k, 0.01);
          const [b0, b1] = horiz ? this.proj(k, ob.y + 0.35, 0.01) : this.proj(ob.x + 0.35, k, 0.01);
          ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
        }
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
      if (ob.swing) { // Pendel/Weiche: nur den Schwenkbereich als Fächer markieren
        const [cx, cy] = this.proj(ob.x, ob.y, 0.004);
        ctx.fillStyle = 'rgba(0,0,0,0.1)'; ctx.beginPath(); ctx.moveTo(cx, cy);
        for (let k = 0; k <= 12; k++) { const a = ob.phase - ob.swing.amp + (k / 12) * 2 * ob.swing.amp; const [px, py] = this.proj(ob.x + Math.cos(a) * (ob.len + 0.2), ob.y + Math.sin(a) * (ob.len + 0.2), 0.004); ctx.lineTo(px, py); }
        ctx.closePath(); ctx.fill();
      } else this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.len + 0.2, 'rgba(0,0,0,0.08)');
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
      if (ob.style === 'whirl' || ob.style === 'tornado' || ob.style === 'void') { this.drawWhirl(ctx, ob, t); return; }
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
      const col = ob.style === 'pearl' ? '255,240,190' : ob.style === 'coral' ? (kind === 'attract' ? '255,110,110' : kind === 'repel' ? '110,230,130' : '110,180,255') : (kind === 'attract' ? '120,220,255' : '255,120,200');
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
    } else if (ob.type === 'spikes') { // Steinplatte mit Löchern, rot glimmend kurz vor dem Ausfahren
      const poly = [[ob.x - ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y + ob.h / 2], [ob.x - ob.w / 2, ob.y + ob.h / 2]];
      this.fillPoly(ctx, poly, 0.004, ob.blocking ? 'rgba(120,30,20,0.45)' : 'rgba(40,30,20,0.35)', false);
      ctx.fillStyle = '#1a120c';
      for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) { const [hx, hy] = this.proj(ob.x - ob.w / 2 + (i + 0.5) * ob.w / 3, ob.y - ob.h / 2 + (j + 0.5) * ob.h / 3, 0.006); ctx.beginPath(); ctx.ellipse(hx, hy, s * 0.06, s * 0.06 * this.cam.tilt, 0, 0, TAU); ctx.fill(); }
    } else if (ob.type === 'sharkjump') { // Warnschimmer über der Bucht, solange der Hai in der Luft ist
      if (ob.jumping) { const a = 0.18 * Math.sin(ob.p * Math.PI); this.fillPoly(ctx, [[ob.x - ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y + ob.h / 2], [ob.x - ob.w / 2, ob.y + ob.h / 2]], -0.1, `rgba(255,60,60,${a})`, false); }
    } else if (ob.type === 'cannon') {
      this.isoEllipse(ctx, ob.x, ob.y, 0.004, 0.75, 'rgba(0,0,0,0.25)');
      // Ziellinie und Landepunkt in aktueller Rohrrichtung
      const dx = Math.cos(ob.angle), dy = Math.sin(ob.angle), R = 0.9 + ob.range;
      const bas = ob.style === 'ballista';
      ctx.fillStyle = bas ? 'rgba(200,130,255,0.55)' : 'rgba(255,210,120,0.55)';
      for (let d = 1.6; d < R - 0.5; d += 0.7) { const [px, py] = this.proj(ob.x + dx * d, ob.y + dy * d, 0.01); ctx.beginPath(); ctx.arc(px, py, s * 0.05, 0, TAU); ctx.fill(); }
      this.isoEllipse(ctx, ob.x + dx * R, ob.y + dy * R, 0.006, 0.45, bas ? 'rgba(200,130,255,0.3)' : 'rgba(255,210,120,0.3)');
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
    const current = ob.style === 'current', col = current ? '170,225,255' : '255,255,255';
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
      const gk = ob.k ?? 1; if (gk < 0.05) continue;
      ctx.strokeStyle = `rgba(${col},${0.75 * a * gk})`; ctx.lineWidth = Math.max(1, s * 0.05 * (0.6 + 0.8 * gk));
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); ctx.stroke();
      if (current && i % 2 === 0) { // Luftblase, die mit der Strömung treibt
        ctx.strokeStyle = `rgba(${col},${0.6 * a})`; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(p2[0], p2[1] - s * 0.15 * u, s * (0.05 + (i % 3) * 0.02), 0, TAU); ctx.stroke();
      } else if (i % 4 === 0) { // kleine Böe
        ctx.fillStyle = `rgba(${col},${0.35 * a})`;
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
    } else if (ob.type === 'wandergate') {
      /* Zwei Mauerstücke, dazwischen der wandernde Durchlass. Die Stücke werden wie feste Mauern in
         Häppchen zerlegt, damit die Sortierung nach Tiefe stimmt; an den Spaltkanten steht je ein
         goldener Pfosten, damit man das Tor als Tor erkennt und nicht als Bruchstelle. */
      const nx = -ob.uy * ob.t / 2, ny = ob.ux * ob.t / 2;
      for (const [p, q] of ob.stuecke()) {
        const L = Math.hypot(q[0] - p[0], q[1] - p[1]), n = Math.max(1, Math.ceil(L / 3));
        for (let i = 0; i < n; i++) {
          const a = i / n, b = (i + 1) / n;
          const p0 = [p[0] + (q[0] - p[0]) * a, p[1] + (q[1] - p[1]) * a];
          const p1 = [p[0] + (q[0] - p[0]) * b, p[1] + (q[1] - p[1]) * b];
          const poly = [[p0[0] + nx, p0[1] + ny], [p1[0] + nx, p1[1] + ny], [p1[0] - nx, p1[1] - ny], [p0[0] - nx, p0[1] - ny]];
          items.push({ x: (p0[0] + p1[0]) / 2, y: (p0[1] + p1[1]) / 2, draw: () => {
            // Etwas dunkler als die Arenamauer und mit roter Deckleiste – sonst geht die Sperre im
            // hellen Sandstein ringsum unter und man sieht nicht, wo der Weg zu ist.
            this.prism(ctx, poly, 0, ob.h, th.block.top, th.block.side, { outline: shade(th.block.side, 0.7) });
            this.prism(ctx, poly, ob.h, 0.12, '#c0392c', '#7a1e17');
          } });
        }
      }
      for (const sd of [-1, 1]) {   // Torpfosten an den Kanten des Durchlasses
        const px = ob.gx + ob.ux * sd * ob.gap / 2, py = ob.gy + ob.uy * sd * ob.gap / 2;
        const poly = [[px - 0.16, py - 0.16], [px + 0.16, py - 0.16], [px + 0.16, py + 0.16], [px - 0.16, py + 0.16]];
        items.push({ x: px, y: py, bias: 0.1, draw: () => {
          // prism nimmt die Seitenfarbe als Hex und hellt sie selbst je nach Wandrichtung auf –
          // ein fertiges rgb(...) kann sie nicht lesen und würde schwarz.
          this.prism(ctx, poly, 0, ob.h + 0.35, '#ffd45e', '#a8842a', { outline: '#6d5418' });
          const [tx, ty] = this.proj(px, py, ob.h + 0.45);
          ctx.fillStyle = '#fff0b8'; ctx.beginPath(); ctx.arc(tx, ty, this.scale * 0.09, 0, TAU); ctx.fill();
        } });
      }
    } else if (ob.type === 'mover' || ob.type === 'ferry' || ob.type === 'wave') {
      items.push({ x: ob.x, y: ob.y, bias: 0.3, draw: () => { this.flat = ob.type === 'ferry' && ob.flat; this.drawMover(ctx, ob, t); this.flat = false; } });
    } else if (ob.type === 'rotor') {
      const hub = this.circlePoly(ob.x, ob.y, ob.hubR, 8);
      items.push({ x: ob.x, y: ob.y, draw: () => {
        if (ob.style === 'tentacle' || ob.style === 'darktentacle') { this.drawKraken(ctx, ob, t); return; }
        if (ob.style === 'knight') { this.drawKnightStatue(ctx, ob, t); return; }
        if (ob.style === 'vine') { this.drawVineRotor(ctx, ob, t); return; }
        if (ob.style === 'propeller') { this.drawPropeller(ctx, ob, t); return; }
        if (ob.style === 'scythe') { this.drawScythe(ctx, ob, t); return; }
        if (ob.style === 'pendel') { this.drawPendel(ctx, ob, t); return; }
        this.prism(ctx, hub, 0, ob.height + 0.25, th.rotor.top, th.rotor.side);
        for (let i = 0; i < ob.blades; i++) {
          const a = ob.bladeAngle(i), ca = Math.cos(a), sa = Math.sin(a), tk = ob.thick;
          const p = [[ob.x - sa * tk, ob.y + ca * tk], [ob.x + ca * ob.len - sa * tk, ob.y + sa * ob.len + ca * tk],
            [ob.x + ca * ob.len + sa * tk, ob.y + sa * ob.len - ca * tk], [ob.x + sa * tk, ob.y - ca * tk]];
          if (ob.style === 'crystal') { ctx.globalAlpha = 0.85; this.prism(ctx, p, 0.05, ob.height, '#eaf8ff', '#7fc0f0'); ctx.globalAlpha = 1; }
          else if (ob.style === 'log') { this.prism(ctx, p, 0.15, 0.45, '#a8763f', '#5c4520'); }
          else if (ob.style === 'stone') { this.prism(ctx, p, 0, 0.8, '#d9b979', '#8a6a34', { outline: '#5a4420' }); }
          else if (ob.style === 'broom') { this.prism(ctx, p, 0.1, 0.35, '#c9a15a', '#7a5a2a'); const [ex, ey] = this.proj(ob.x + ca * ob.len, ob.y + sa * ob.len, 0.3); ctx.fillStyle = '#e0c070'; ctx.beginPath(); ctx.arc(ex, ey, this.scale * 0.22, 0, TAU); ctx.fill(); }
          else this.prism(ctx, p, 0.05, ob.height, th.rotor.top, th.rotor.side);
        }
      } });
    } else if (ob.type === 'guillotine') {
      this.pushGuillotine(items, ctx, ob, t);
    } else if (ob.type === 'eyetower') {
      items.push({ x: ob.x, y: ob.y, bias: 0.2, draw: () => this.drawEyeTower(ctx, ob, t) });
    } else if (ob.type === 'copperpipe') {
      // Rohrmund und Rohrende stehen an verschiedenen Stellen der Karte – jeder wird für sich einsortiert
      if (ob.x != null) items.push({ x: ob.x, y: ob.y, bias: 0.2, draw: () => this.drawCopperPipe(ctx, ob, t, false) });
      if (ob.ax != null) items.push({ x: ob.ax, y: ob.ay, bias: 0.2, draw: () => this.drawCopperPipe(ctx, ob, t, true) });
      // Die Leitung dazwischen: Lauf für Lauf, damit sie sich richtig mit Mauern überdeckt
      if (ob.bereit && ob.stuecke) {
        for (const u of ob.stuetzen) {
          const [px, py] = ob.punkt(u);
          items.push({ x: px, y: py, bias: 0.4, draw: () => this.drawPipeStuetze(ctx, ob, u) });
        }
        ob.stuecke.forEach((st, k) => {
          const [px, py] = ob.punkt((st.u0 + st.u1) / 2);
          items.push({ x: px, y: py, bias: 0.45, draw: () => this.drawPipeLauf(ctx, ob, k, t) });
        });
      }
    } else if (ob.type === 'gearfield') {
      items.push({ x: (ob.x0 + ob.x1) / 2, y: (ob.y0 + ob.y1) / 2, bias: -0.2, draw: () => this.drawGearField(ctx, ob, t) });
    } else if (ob.type === 'sweephand') {
      items.push({ x: ob.x, y: ob.y, bias: 0.3, draw: () => this.drawSweepHand(ctx, ob, t) });
    } else if (ob.type === 'handclock') {
      items.push({ x: ob.x, y: ob.y, bias: 0.3, draw: () => this.drawHandClock(ctx, ob, t) });
    } else if (ob.type === 'aufzug') {
      if (this.spanntEbenen(ob)) return;
      items.push({ x: ob.x, y: ob.y, bias: 0.4, draw: () => this.drawAufzug(ctx, ob, t) });
    } else if (ob.type === 'windfahne') {
      items.push({ x: ob.x, y: ob.y, bias: 0.4, draw: () => this.drawWindfahne(ctx, ob, t) });
    } else if (ob.type === 'lawine') {
      items.push({ x: ob.fx || ob.cx, y: ob.fy || ob.cy, bias: 0.5, noFade: true, draw: () => this.drawLawine(ctx, ob, t) });
    } else if (ob.type === 'seilbahn') {
      if (this.spanntEbenen(ob)) return;
      items.push({ x: ob.x, y: ob.y, bias: 0.45, draw: () => this.drawSeilbahn(ctx, ob, t) });
    } else if (ob.type === 'zahnstange') {
      if (this.spanntEbenen(ob)) return;
      items.push({ x: ob.x, y: ob.y, bias: 0.4, draw: () => this.drawZahnstange(ctx, ob, t) });
    } else if (ob.type === 'escapement') {
      items.push({ x: ob.x, y: ob.y, bias: 0.25, draw: () => this.drawEscapement(ctx, ob, t) });
    } else if (ob.type === 'pendulum') {
      items.push({ x: ob.x, y: ob.y, bias: 0.3, draw: () => this.drawPendulum(ctx, ob, t) });
    } else if (ob.type === 'springwork') {
      items.push({ x: ob.x, y: ob.y, bias: 0.2, draw: () => this.drawSpringWork(ctx, ob, t) });
    } else if (ob.type === 'gearlift') {
      items.push({ x: ob.x, y: ob.y, bias: 0.3, draw: () => this.drawGearLift(ctx, ob, t) });
    } else if (ob.type === 'piston') {
      items.push({ x: ob.px, y: ob.py, bias: 0.3, draw: () => this.drawPiston(ctx, ob, t) });
    } else if (ob.type === 'hand') {
      items.push({ x: ob.x, y: ob.y, bias: 0.25, draw: () => this.drawHand(ctx, ob, t) });
    } else if (ob.type === 'firetower') {
      items.push({ x: ob.x, y: ob.y, bias: 0.2, draw: () => this.drawFireTower(ctx, ob, t) });
    } else if (ob.type === 'imperialbox') {
      // Tribüne und schwebende Daumenmarke stehen an verschiedenen Stellen – jede wird für sich einsortiert
      items.push({ x: ob.x, y: ob.y, bias: 0.2, draw: () => this.drawImperialBox(ctx, ob, t) });
      items.push({ x: ob.lmx, y: ob.lmy, bias: 0.3, draw: () => this.drawLogeMarke(ctx, ob, t) });
    } else if (ob.type === 'liongate') {
      // Eingang und Ausgang stehen an verschiedenen Stellen der Karte – jeder wird für sich einsortiert
      if (ob.x != null) items.push({ x: ob.x, y: ob.y, bias: 0.2, draw: () => this.drawLionGate(ctx, ob, t, false) });
      if (ob.ax != null) items.push({ x: ob.ax, y: ob.ay, bias: 0.2, draw: () => this.drawLionGate(ctx, ob, t, true) });
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
        else if (ob.style === 'rock') this.spriteRock(ctx, { x: ob.x, y: ob.y, z: 0, s: ob.r * 2.1 * sc, seed: ((ob.x * 7 + ob.y * 13) % 10) / 10 }, '#9a948a', '#5f5a52');
        else if (ob.style === 'coral') this.spriteCoral(ctx, { x: ob.x, y: ob.y, z: 0, s: ob.r * 2.6 * sc, seed: ((ob.x * 7 + ob.y * 13) % 10) / 10 });
        else if (ob.style === 'idol') this.spriteIdol(ctx, { x: ob.x, y: ob.y, z: 0, s: ob.r * 2.2 * sc, seed: 0.5 }, t);
        else if (ob.style === 'orb') this.drawOrb(ctx, ob, t, sc);
        else if (ob.style === 'grave') { const [rx, ry] = this.proj(ob.x, ob.y + 0.2, 0); this.spriteGravestone(ctx, rx, ry, this.scale * ob.r * 2.4 * sc, { seed: 0.3 }); }
        else if (ob.style === 'eye') this.drawEye(ctx, ob, t, sc);
        else if (ob.style === 'feder') this.spriteFeder(ctx, ob, sq);
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
        if (ob.style === 'pearl') { this.spritePearl(ctx, { x: ob.x, y: ob.y, z: 0, s: ob.core * 3.4, seed: 0.4 }, t, true); return; }
        if (ob.style === 'coral') {
          const cols = kind === 'attract' ? ['#ff6a6a', '#a8202a'] : kind === 'repel' ? ['#6fe07a', '#1f7a30'] : ['#6fb0ff', '#1f4a9a'];
          const [sx, sy] = this.proj(ob.x, ob.y, 0);
          this.spriteCoralBig(ctx, sx, sy, s * ob.core * 4.2, cols[0], cols[1], t);
          return;
        }
        const attract = kind === 'attract';
        if (ob.style === 'soul') { this.drawSoulLight(ctx, ob, t); return; }
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
      items.push({ x: ob.x, y: ob.y, bias: 0.2, draw: () => ob.style === 'catapult' ? this.drawCatapult(ctx, ob, t) : ob.style === 'ballista' ? this.drawBallista(ctx, ob, t) : this.drawCannon(ctx, ob, t) });
    } else if (ob.type === 'door') {
      if (ob.style === 'pyramid') items.push({ x: ob.px, y: ob.py, noFade: true, draw: () => this.drawPyramid(ctx, ob, t) });
      else if (ob.style === 'wreck') items.push({ x: ob.px, y: ob.py, noFade: true, draw: () => this.drawWreck(ctx, ob, t) });
      else if (ob.style === 'temple') items.push({ x: ob.px, y: ob.py, noFade: true, draw: () => this.drawTempleGate(ctx, ob, t) });
      else if (ob.style === 'fortress' || ob.style === 'crypt') items.push({ x: ob.px, y: ob.py, noFade: true, draw: () => this.drawStoneGate(ctx, ob, t) });
      else if (ob.style === 'hatch') items.push({ x: ob.x, y: ob.y, bias: 0.1, noFade: true, draw: () => this.drawHatch(ctx, ob, t) });
      else if (ob.style === 'castle') items.push({ x: ob.px, y: ob.py, noFade: true, draw: () => this.drawCastleGate(ctx, ob, t) });
      else items.push({ x: ob.x, y: ob.y, bias: 0.15, noFade: true, draw: () => this.spriteHut(ctx, { x: ob.x, y: ob.y + 0.35, z: 0, s: ob.s }, t) });
    } else if (ob.type === 'cauldron') {
      items.push({ x: ob.x, y: ob.y, draw: () => this.drawCauldronPot(ctx, ob, t) });
    } else if (ob.type === 'sharkjump') {
      items.push({ x: ob.px, y: ob.py, bias: 0.3, noFade: true, draw: () => ob.style === 'croc' ? this.drawCroc(ctx, ob, t) : ob.style === 'bat' ? this.drawBatSwoop(ctx, ob, t) : this.drawSharkJump(ctx, ob, t) });
    } else if (ob.type === 'spikes') {
      items.push({ x: ob.x, y: ob.y, draw: () => this.drawSpikes(ctx, ob, t) });
    } else if (ob.type === 'lightning') {
      items.push({ x: ob.x, y: ob.y, bias: 0.3, noFade: true, draw: () => this.drawLightningBolt(ctx, ob, t) });
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
    } else if (ob.style === 'knight' || ob.style === 'gladiator') {
      /* Ein und dieselbe Figur, zweimal angezogen: Der Ritter aus dem Märchenland ist grauer Stahl
         mit rotem Wappenschild, der Gladiator des Kolosseums trägt Sandfarben und Rot – Helm mit
         rotem Kamm, dazu der Rundschild an der Seite. Am Verhalten ändert das nichts, es ist
         dieselbe Lore auf derselben Strecke, nur anders gezeichnet. */
      const glad = ob.style === 'gladiator';
      const koerper = glad ? ['#c0392c', '#7a1e17', '#4a1210'] : ['#d9dde6', '#7f8694', '#4a505c'];
      const helm = glad ? '#e3d2a9' : '#c9ced8', schlitz = glad ? '#5a4520' : '#2a2f3a';
      const schild = glad ? '#e3d2a9' : '#d93b3b', schildZier = glad ? '#c0392c' : '#ffd166';
      const body = this.circlePoly(ob.x, ob.y, ob.w * 0.42, 8);
      this.prism(ctx, body, 0.05, 0.7, koerper[0], koerper[1], { outline: koerper[2] });
      const [hx, hy] = this.proj(ob.x, ob.y, 0.95);
      ctx.fillStyle = helm; ctx.beginPath(); ctx.arc(hx, hy, s * 0.24, 0, TAU); ctx.fill();
      ctx.fillStyle = schlitz; ctx.fillRect(hx - s * 0.16, hy - s * 0.02, s * 0.32, s * 0.07);
      ctx.strokeStyle = '#d93b3b'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.lineCap = 'round';
      if (glad) { // Helmkamm: eine Bürste quer über den Helm, statt der wehenden Ritterfeder
        ctx.lineWidth = Math.max(3, s * 0.13);
        ctx.beginPath(); ctx.moveTo(hx - s * 0.2, hy - s * 0.16); ctx.quadraticCurveTo(hx, hy - s * 0.42, hx + s * 0.2, hy - s * 0.16); ctx.stroke();
      } else {
        ctx.beginPath(); ctx.moveTo(hx, hy - s * 0.22); ctx.quadraticCurveTo(hx - s * 0.2, hy - s * 0.5, hx - s * 0.35 + Math.sin(t * 8) * s * 0.03, hy - s * 0.3); ctx.stroke();
      }
      const [shx, shy] = this.proj(ob.x + ob.dir * 0.05, ob.y + 0.35, 0.45);
      ctx.fillStyle = schild; ctx.beginPath(); ctx.arc(shx, shy, s * 0.17, 0, TAU); ctx.fill();
      ctx.strokeStyle = schildZier; ctx.lineWidth = Math.max(1, s * 0.04);
      if (glad) { // Rundschild: Buckel in der Mitte und ein Ring darum
        ctx.beginPath(); ctx.arc(shx, shy, s * 0.11, 0, TAU); ctx.stroke();
        ctx.fillStyle = schildZier; ctx.beginPath(); ctx.arc(shx, shy, s * 0.05, 0, TAU); ctx.fill();
      } else {
        ctx.beginPath(); ctx.moveTo(shx - s * 0.1, shy); ctx.lineTo(shx + s * 0.1, shy); ctx.moveTo(shx, shy - s * 0.1); ctx.lineTo(shx, shy + s * 0.1); ctx.stroke();
      }
    } else if (ob.style === 'balloon') { this.drawBalloon(ctx, ob, t); return;
    } else if (ob.style === 'airship') { this.drawAirship(ctx, ob, t); return;
    } else if (ob.style === 'ghost') { this.drawGhost(ctx, ob, t); return;
    } else if (ob.style === 'bat') { this.drawBat(ctx, ob, t); return;
    } else if (ob.style === 'ravens') { this.drawRavens(ctx, ob, t); return;
    } else if (ob.style === 'stormcloud') { this.drawStormCloud(ctx, ob, t); return;
    } else if (ob.style === 'cloud') {
      this.isoEllipse(ctx, ob.x, ob.y, 0.2, ob.w * 0.6, '#ffffff');
    } else if (ob.style === 'coffin') { // Totenfähre: ein Sarg als Floß, violette Laterne am Bug
      const L = ob.w * 0.8, Wd = ob.h * 0.42, bob = 0.04 * Math.sin(t * 1.8 + ob.x);
      const hull = [[ob.x - L, ob.y - Wd * 0.55], [ob.x - L * 0.55, ob.y - Wd], [ob.x + L * 0.7, ob.y - Wd], [ob.x + L, ob.y - Wd * 0.5], [ob.x + L, ob.y + Wd * 0.5], [ob.x + L * 0.7, ob.y + Wd], [ob.x - L * 0.55, ob.y + Wd], [ob.x - L, ob.y + Wd * 0.55]];
      this.prism(ctx, hull, bob, 0.42, '#3a2a48', '#1c1428', { outline: '#0c0812' });
      this.fillPoly(ctx, hull.map(([px, py]) => [ob.x + (px - ob.x) * 0.82, ob.y + (py - ob.y) * 0.8]), bob + 0.43, '#2a1e3a', false);
      ctx.strokeStyle = '#6a5a8a'; ctx.lineWidth = Math.max(1, s * 0.035); // Beschlag als Kreuz auf dem Deckel
      const [c0, c1] = this.proj(ob.x - L * 0.15, ob.y, bob + 0.45), [c2, c3] = this.proj(ob.x + L * 0.45, ob.y, bob + 0.45), [c4, c5] = this.proj(ob.x + L * 0.05, ob.y - Wd * 0.55, bob + 0.45), [c6, c7] = this.proj(ob.x + L * 0.05, ob.y + Wd * 0.55, bob + 0.45);
      ctx.beginPath(); ctx.moveTo(c0, c1); ctx.lineTo(c2, c3); ctx.moveTo(c4, c5); ctx.lineTo(c6, c7); ctx.stroke();
      const [lx, ly] = this.proj(ob.x + L * 0.85, ob.y, bob + 1.0), gl = 0.6 + 0.3 * Math.sin(t * 5 + ob.x);
      ctx.strokeStyle = '#2a2238'; ctx.lineWidth = Math.max(1.5, s * 0.05); const [p0, p1] = this.proj(ob.x + L * 0.85, ob.y, bob + 0.45); ctx.beginPath(); ctx.moveTo(p0, p1); ctx.lineTo(lx, ly); ctx.stroke();
      const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 0.45); g.addColorStop(0, `rgba(200,130,255,${0.7 * gl})`); g.addColorStop(1, 'rgba(160,80,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, s * 0.45, 0, TAU); ctx.fill();
      ctx.fillStyle = ob.docked ? '#c9a0ff' : '#8a3bff'; ctx.beginPath(); ctx.arc(lx, ly, s * 0.09, 0, TAU); ctx.fill();
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
    } else if (ob.style === 'barrel') { // rollendes Fass, liegend, mit zwei Reifen
      const r = ob.w * 0.5, along = Math.abs(ob.x1 - ob.x0) >= Math.abs(ob.y1 - ob.y0);
      const body = along ? [[ob.x - r, ob.y - r * 0.8], [ob.x + r, ob.y - r * 0.8], [ob.x + r, ob.y + r * 0.8], [ob.x - r, ob.y + r * 0.8]] : [[ob.x - r * 0.8, ob.y - r], [ob.x + r * 0.8, ob.y - r], [ob.x + r * 0.8, ob.y + r], [ob.x - r * 0.8, ob.y + r]];
      this.prism(ctx, body, 0, r * 1.7, '#a8783f', '#5c3f1c', { outline: '#3a2610' });
      ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = Math.max(1.5, s * 0.06);
      for (const k of [-0.45, 0.45]) { // Reifen quer zur Rollrichtung
        const [a0, a1] = along ? this.proj(ob.x + k * r, ob.y - r * 0.8, r * 1.72) : this.proj(ob.x - r * 0.8, ob.y + k * r, r * 1.72);
        const [b0, b1] = along ? this.proj(ob.x + k * r, ob.y + r * 0.8, r * 1.72) : this.proj(ob.x + r * 0.8, ob.y + k * r, r * 1.72);
        ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
      }
      const roll = (t * 5 * (ob.dir || 1)) % 1; // wandernder Glanzstreifen zeigt das Rollen
      const [g0, g1] = along ? this.proj(ob.x - r + roll * 2 * r, ob.y - r * 0.7, r * 1.72) : this.proj(ob.x - r * 0.7, ob.y - r + roll * 2 * r, r * 1.72);
      const [g2, g3] = along ? this.proj(ob.x - r + roll * 2 * r, ob.y + r * 0.7, r * 1.72) : this.proj(ob.x + r * 0.7, ob.y - r + roll * 2 * r, r * 1.72);
      ctx.strokeStyle = 'rgba(255,230,180,0.35)'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.beginPath(); ctx.moveTo(g0, g1); ctx.lineTo(g2, g3); ctx.stroke();
    } else if (ob.style === 'shark') { // Hai: dunkler Schatten unter Wasser, Rückenflosse und Schwanz über der Oberfläche
      const d = ob.dir || 1, L = ob.w * 0.5, bob = 0.03 * Math.sin(t * 2 + ob.x);
      this.isoEllipse(ctx, ob.x, ob.y, -0.05, L, 'rgba(20,40,60,0.55)', ob.h * 0.35);
      this.isoEllipse(ctx, ob.x + d * L * 0.9, ob.y, -0.05, L * 0.35, 'rgba(20,40,60,0.5)', ob.h * 0.2);
      const fin = [[ob.x + d * 0.1, ob.y, 0.08 + bob], [ob.x - d * 0.15, ob.y, 0.62 + bob], [ob.x - d * 0.5, ob.y, 0.08 + bob]];
      ctx.fillStyle = '#5d6b78'; ctx.beginPath(); fin.forEach((q, i) => { const pp = this.proj(q[0], q[1], q[2]); i ? ctx.lineTo(pp[0], pp[1]) : ctx.moveTo(pp[0], pp[1]); }); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#2f3a44'; ctx.lineWidth = 1; ctx.stroke();
      const tail = [[ob.x - d * L * 0.95, ob.y, 0.05 + bob], [ob.x - d * L * 1.15, ob.y, 0.42 + bob], [ob.x - d * L * 1.25, ob.y, 0.05 + bob]];
      ctx.fillStyle = '#5d6b78'; ctx.beginPath(); tail.forEach((q, i) => { const pp = this.proj(q[0], q[1], q[2]); i ? ctx.lineTo(pp[0], pp[1]) : ctx.moveTo(pp[0], pp[1]); }); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = Math.max(1, s * 0.04); // Kielwasser
      for (const side of [-0.25, 0.25]) { const [w0, w1] = this.proj(ob.x - d * 0.3, ob.y + side, 0.01), [w2, w3] = this.proj(ob.x - d * (1.2 + 0.3 * Math.sin(t * 3)), ob.y + side * 2.2, 0.01); ctx.beginPath(); ctx.moveTo(w0, w1); ctx.lineTo(w2, w3); ctx.stroke(); }
    } else if (ob.style === 'wave') { // Welle: durchscheinender Wasserkamm mit Gischt, rollt quer über die Planken
      const crest = 0.85 + 0.1 * Math.sin(t * 4);
      ctx.globalAlpha = 0.7; this.prism(ctx, poly, 0, crest, '#8fd4f5', '#2a7fa8'); ctx.globalAlpha = 1;
      const along = ob.w >= ob.h; // Gischt entlang der Kammlinie
      for (let i = 0; i < 7; i++) {
        const u = (i + 0.5) / 7, fx = along ? ob.x - ob.w / 2 + u * ob.w : ob.x, fy = along ? ob.y : ob.y - ob.h / 2 + u * ob.h;
        const [px, py] = this.proj(fx, fy, crest + 0.1 + 0.12 * Math.sin(t * 6 + i * 1.7));
        ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.beginPath(); ctx.arc(px, py, s * (0.09 + (i % 3) * 0.03), 0, TAU); ctx.fill();
      }
      const [q0, q1] = this.proj(poly[3][0], poly[3][1], crest), [q2, q3] = this.proj(poly[2][0], poly[2][1], crest);
      ctx.strokeStyle = 'rgba(255,255,255,0.8)'; ctx.lineWidth = Math.max(2, s * 0.08); ctx.beginPath(); ctx.moveTo(q0, q1); ctx.lineTo(q2, q3); ctx.stroke();
    } else if (ob.style === 'cannonball' || ob.style === 'boulder' || ob.style === 'coconut') { // rollende Kanonenkugel / Felsbrocken / Kokosnuss
      const r = ob.w * 0.5, [cx, cy] = this.proj(ob.x, ob.y, r), rock = ob.style === 'boulder', nut = ob.style === 'coconut';
      const g = ctx.createRadialGradient(cx - r * s * 0.35, cy - r * s * 0.4, r * s * 0.1, cx, cy, r * s);
      g.addColorStop(0, nut ? '#9a6a3a' : rock ? '#a8926e' : '#6a6a72'); g.addColorStop(1, nut ? '#3a2210' : rock ? '#3a2e20' : '#141418');
      if (nut) { ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, TAU); ctx.fill(); ctx.fillStyle = '#2a180a'; for (const [ox, oy] of [[-0.25, -0.2], [0.2, -0.25], [0, 0.15]]) { ctx.beginPath(); ctx.arc(cx + ox * r * s, cy + oy * r * s, r * s * 0.12, 0, TAU); ctx.fill(); } }
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r * s, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, r * s * 0.9, t * 6 * (ob.dir || 1), t * 6 * (ob.dir || 1) + 1.2); ctx.stroke();
    } else if (ob.style === 'chariot') { this.drawChariot(ctx, ob, t); return; // Streitwagen: nur eine andere Zeichnung derselben Lore
    } else if (ob.style === 'stone') { // Schiebestein aus Sandstein mit eingemeißeltem Auge
      this.prism(ctx, poly, 0, 0.9, '#d9b979', '#8a6a34', { outline: '#5a4420' });
      const [ex, ey] = this.proj(ob.x, ob.y, 0.91);
      ctx.strokeStyle = 'rgba(60,40,10,0.55)'; ctx.lineWidth = Math.max(1, s * 0.04);
      ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.32, s * 0.16 * this.cam.tilt, 0, 0, TAU); ctx.stroke();
      ctx.fillStyle = 'rgba(60,40,10,0.55)'; ctx.beginPath(); ctx.ellipse(ex, ey, s * 0.1, s * 0.1 * this.cam.tilt, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.18)'; ctx.lineWidth = 1;
      for (const z of [0.3, 0.6]) { const p0 = this.proj(poly[3][0], poly[3][1], z), p1 = this.proj(poly[2][0], poly[2][1], z); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }
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
      case 'tree': this.spriteTree(ctx, d, t); break;
      case 'pine': this.spritePine(ctx, d, '#2f7a3e', '#1f5a2c'); break;
      case 'pineSnow': this.spritePine(ctx, d, '#3f8a5e', '#2a6a44', true); break;
      case 'deadTree': this.spriteDeadTree(ctx, d); break;
      case 'mushroom': this.spriteMushroom(ctx, d.x, d.y, d.z || 0, 0.55 * d.s, d.seed > 0.5 ? '#e0575a' : '#e7a53a'); break;
      case 'mushroomBig': this.spriteMushroom(ctx, d.x, d.y, d.z || 0, 1.3 * d.s, '#c94a7a', true); break;
      case 'flowerbush': this.spriteFlowers(ctx, d); break;
      case 'rock': this.spriteRock(ctx, d, '#8f8b97', '#5d5966'); break;
      case 'rockSnow': this.spriteRock(ctx, d, '#9fb5cc', '#5f7a99', true); break;
      case 'crystal': this.spriteCrystal(ctx, d.x, d.y, d.z || 0, 0.9 * d.s, '#e0b8ff', '#8a4fd0'); break;
      case 'crystalBlue': this.spriteCrystal(ctx, d.x, d.y, d.z || 0, 0.9 * d.s, '#cfeeff', '#5b90c6'); break;
      case 'crystalOrange': this.spriteCrystal(ctx, d.x, d.y, d.z || 0, 0.8 * d.s, '#ffd39a', '#d06a1a'); break;
      case 'lantern': this.spriteLantern(ctx, d, t); break;
      case 'tower': this.spriteTower(ctx, d); break;
      case 'cloud': this.spriteCloud(ctx, d, t); break;
      case 'stalagmite': this.spriteStalagmite(ctx, d); break;
      case 'bones': this.spriteBones(ctx, d); break;
      case 'anvil': this.spriteAnvil(ctx, d); break;
      case 'brazier': this.spriteBrazier(ctx, d, t); break;
      case 'gold': this.spriteGold(ctx, d, t); break;
      case 'pumpkin': this.spritePumpkin(ctx, d, t); break;
      case 'cauldron': this.spriteCauldron(ctx, d, s, t); break;
      case 'gear': this.spriteGear(ctx, d, t); break;
      case 'candle': this.spriteCandle(ctx, d, t); break;
      case 'coral': this.spriteCoral(ctx, d); break;
      case 'fish': this.spriteFish(ctx, d, t); break;
      case 'fern': this.spriteFern(ctx, d, t); break;
      case 'jungleTree': this.spriteJungleTree(ctx, d, t); break;
      case 'idol': this.spriteIdol(ctx, d, t); break;
      case 'totem': this.spriteTotem(ctx, d, t); break;
      case 'monkey': this.spriteMonkey(ctx, d, t); break;
      case 'ropepost': this.spriteRopepost(ctx, d); break;
      case 'jelly': this.spriteJelly(ctx, d, t); break;
      case 'mast': this.spriteMast(ctx, d, t); break;
      case 'pearl': this.spritePearl(ctx, Object.assign({}, d, { s: d.s * 0.7 }), t, false); break;
      case 'lighthouse': this.spriteLighthouse(ctx, d, t); break;
      case 'barrel': this.spriteBarrel(ctx, d); break;
      case 'crate': this.spriteCrate(ctx, d); break;
      case 'bollard': this.spriteBollard(ctx, d, t); break;
      case 'anchor': this.spriteAnchor(ctx, d); break;
      case 'buoy': this.spriteBuoy(ctx, d, t); break;
      case 'seaweed': this.spriteSeaweed(ctx, d, t); break;
      case 'shell': this.spriteShell(ctx, d); break;
      case 'starfish': this.spriteStarfish(ctx, d); break;
      case 'chest': this.spriteChest(ctx, d, t); break;
      case 'basalt': this.spriteBasalt(ctx, d); break;
      case 'obsidian': this.spriteCrystal(ctx, d.x, d.y, d.z || 0, 0.8 * d.s, '#6a4a8a', '#1e1428'); break;
      case 'burntTree': this.spriteDeadTree(ctx, d, '#120c0e', true); break;
      case 'vent': this.spriteVent(ctx, d, t); break;
      case 'palm': this.spritePalm(ctx, d, t); break;
      case 'cactus': this.spriteCactus(ctx, d); break;
      case 'urn': this.spriteUrn(ctx, d); break;
      case 'skull': this.spriteSkull(ctx, d); break;
      case 'shelf': this.spriteShelf(ctx, d); break;
      case 'bottle': this.spriteBottle(ctx, d); break;
      case 'broom': this.spriteBroom(ctx, d); break;
      case 'hut': this.spriteHut(ctx, d, t); break;
      case 'gearFlat': this.spriteGearFlat(ctx, d, s, t); break;
      case 'pipe': this.spritePipe(ctx, d, t); break;
      case 'clock': this.spriteClock(ctx, d, t); break;
      case 'bell': this.spriteBell(ctx, d, t); break;
      case 'weight': this.spriteWeight(ctx, d, t); break;
      case 'obelisk': this.spriteObelisk(ctx, d); break;
      case 'sarcophagus': this.spriteSarcophagus(ctx, d, t); break;
      case 'gravestone': this.spriteGravestone(ctx, sx, sy, s, d); break;
      case 'gravecross': this.spriteGraveCross(ctx, sx, sy, s, d); break;
      case 'ghostlight': this.spriteGhostLight(ctx, d, t); break;
      case 'cloudDark': this.spriteCloudDark(ctx, d, t); break;
      case 'lightningrod': this.spriteLightningRod(ctx, d, t); break;
      case 'windsock': this.spriteWindsock(ctx, sx, sy, s, Object.assign({ welt: [d.x, d.y, d.z || 0] }, d), t); break;
      case 'banner': this.spriteBanner(ctx, d, t); break;
      case 'bannerRed': this.spriteBanner(ctx, d, t, '#c0392c'); break;
      case 'brazierBlue': this.spriteBrazier(ctx, d, t, ['#4fc3ff', '#b7ecff', '80,190,255']); break;
      case 'torchPurple': this.spriteBrazier(ctx, d, t, ['#a24bff', '#e0b8ff', '170,90,255']); break;
      // Säulen werden in Weltkoordinaten gebaut, nicht am Bildschirmpunkt – sie bekommen darum d statt sx/sy
      case 'pillar': this.spritePillar(ctx, d); break;
      // helle Arena-Ausführung fürs Kolosseum
      case 'pillarLight': this.spritePillar(ctx, d, ['#f2e5c4', '#b59b6c', '#f8efd6', '#8a7040']); break;
      case 'urnDark': this.spriteUrn(ctx, Object.assign({}, d, { dark: true })); break;
      default: break;
    }
  }
  /* Spannfeder statt Pilz: eine Messingspirale auf einem Teller. Beim Treffer staucht sie sich
     zusammen und federt zurück – dieselbe Zahl (sq), die den Pilz aufblähen lässt, drückt sie
     zusammen. So sieht man die Wirkung dort, wo sie herkommt. */
  spriteFeder(ctx, ob, sq) {
    const s = this.scale, [sx, sy] = this.proj(ob.x, ob.y, 0);
    const r = s * ob.r * 1.15, hoch = s * ob.r * 1.9 * (1 - sq * 0.45);
    this.shadow(ctx, sx, sy, r * 0.95);
    // Teller unten
    ctx.fillStyle = '#6e4a1c'; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.5, 0, 0, TAU); ctx.fill();
    // Windungen von unten nach oben, jede etwas kleiner
    const n = 5;
    ctx.lineWidth = Math.max(1.5, s * 0.08);
    for (let i = 0; i < n; i++) {
      const u = i / (n - 1), y = sy - hoch * u, rr = r * (1 - u * 0.22);
      ctx.strokeStyle = i % 2 ? '#8a6624' : '#e0b45c';
      ctx.beginPath(); ctx.ellipse(sx, y, rr, rr * 0.5, 0, 0, TAU); ctx.stroke();
    }
    // Kappe
    ctx.fillStyle = '#e0b45c'; ctx.beginPath(); ctx.ellipse(sx, sy - hoch, r * 0.82, r * 0.42, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,246,214,0.55)'; ctx.beginPath(); ctx.ellipse(sx - r * 0.25, sy - hoch - r * 0.05, r * 0.26, r * 0.13, 0, 0, TAU); ctx.fill();
  }

  shadow(ctx, sx, sy, r) { ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(sx, sy, r, r * 0.5, 0, 0, TAU); ctx.fill(); }
  /* Meeresgrund */
  /* Koralle: Äste, die im Kreis nach oben und außen wachsen. */
  spriteCoral(ctx, d) {
    const k = d.s, z = d.z || 0, seed = d.seed || 0;
    const col = seed > 0.66 ? '#ff8a6a' : seed > 0.33 ? '#ef6f9a' : '#ffb15a';
    this.bodenSchatten(ctx, d.x, d.y, k * 0.4, 0.18);
    for (let i = 0; i < 5; i++) {
      const a = seed * 6 + (i * TAU) / 5, L = k * (0.4 + ((i * 7 + seed * 10) % 3) * 0.12);
      this.ast(ctx, d.x, d.y, z, Math.cos(a), Math.sin(a), L, k * 0.8, k * 0.16, k * 0.09, shade(col, 1.1), shade(col, 0.72), 3);
      const bx = d.x + Math.cos(a) * L * 0.6, by = d.y + Math.sin(a) * L * 0.6;
      this.ast(ctx, bx, by, z + k * 0.45, Math.cos(a + 0.9), Math.sin(a + 0.9), L * 0.55, k * 0.35, k * 0.08, k * 0.06, shade(col, 1.1), shade(col, 0.72), 2);
    }
  }
  /* Hafen */
  /* Leuchtturm: ein Turm aus Ringen mit roten und weißen Bändern, Galerie, Laterne und Dach –
     und ein Lichtkegel, der herumläuft. Das Licht bleibt flach, es ist Schein, kein Körper. */
  spriteLighthouse(ctx, d, t) {
    const k = d.s, z = d.z || 0, H = k * 2.6;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.55);
    for (let i = 0; i < 6; i++) {
      const r0 = k * 0.4 * (1 - i * 0.05), r1 = k * 0.4 * (1 - (i + 1) * 0.05);
      this.saeule(ctx, d.x, d.y, z + H * i / 6, r0, r1, H / 6, i % 2 ? '#e04040' : '#f4efe6', i % 2 ? '#a82a2a' : '#cfc6b8', 10);
    }
    this.saeule(ctx, d.x, d.y, z + H, k * 0.46, k * 0.46, k * 0.06, '#4a4a55', '#2f2f38', 10);
    this.saeule(ctx, d.x, d.y, z + H + k * 0.06, k * 0.24, k * 0.24, k * 0.42, '#ffe9a8', '#d8c078', 9);
    this.kegel(ctx, d.x, d.y, z + H + k * 0.48, k * 0.34, k * 0.34, '#4a4a55', '#2f2f38', 9);
    const beam = (t * 1.2) % TAU, gl = 0.5 + 0.5 * Math.cos(beam), sc = this.scale * k;
    const [lx, ly] = this.proj(d.x, d.y, z + H + k * 0.28);
    ctx.fillStyle = `rgba(255,240,170,${0.25 + 0.5 * gl})`; ctx.beginPath(); ctx.arc(lx, ly, sc * 0.55 * (0.6 + gl * 0.6), 0, TAU); ctx.fill();
    const [bx, by] = this.proj(d.x + Math.cos(beam) * k * 3, d.y + Math.sin(beam) * k * 3, z + H + k * 0.28);
    ctx.fillStyle = `rgba(255,240,170,${0.12 * gl})`;
    ctx.beginPath(); ctx.moveTo(lx, ly); ctx.lineTo(bx, by - sc * 0.35); ctx.lineTo(bx, by + sc * 0.35); ctx.closePath(); ctx.fill();
  }
  spriteBollard(ctx, d, t) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 6;
    this.saeule(ctx, d.x, d.y, z, k * 0.1, k * 0.12, k * 0.4, '#5e5e68', '#3a3a42', 8);
    this.ast(ctx, d.x, d.y, z + k * 0.32, Math.cos(a), Math.sin(a), k * 0.7, 0, k * 0.3 + Math.sin(t + d.x) * k * 0.03, k * 0.03, '#d8b878', '#9a7a3a', 3);
  }
  /* Fisch: Körper als Kugel, Flosse und Schwanz als flache Weltdreiecke quer zur Schwimmrichtung.
     Er schwimmt jetzt wirklich im Raum über dem Grund – vorher lag er auf dem Bild. */
  spriteFish(ctx, d, t) {
    const k = d.s, seed = d.seed || 0, ph = t * 0.9 + seed * 6.3;
    const a = seed * 6, co = Math.cos(a), si = Math.sin(a), sw = Math.sin(ph);
    const x = d.x + co * sw * k * 0.5, y = d.y + si * sw * k * 0.5;
    const z = (d.z || 0) + k * (0.7 + 0.15 * Math.sin(t * 2 + seed * 9));
    const dir = Math.cos(ph) >= 0 ? 1 : -1, L = k * 0.32, Hh = k * 0.17;
    const cols = seed < 0.33 ? ['#ff8a3d', '#c25a1a'] : seed < 0.66 ? ['#ffd23d', '#c29a1a'] : ['#5fb8ff', '#2a6fc0'];
    this.isoEllipse(ctx, d.x, d.y, 0.008, L * 0.9, 'rgba(0,0,0,0.15)');
    const flap = Math.sin(t * 8 + seed * 5) * 0.3;
    const schwanz = [[-1.35 * dir, -(0.9 + flap)], [-1.35 * dir, (0.9 - flap)], [-0.8 * dir, 0]]
      .map(([u, v]) => [x + (u * L * co - v * Hh * si), y + (u * L * si + v * Hh * co)]);
    this.fillPoly(ctx, schwanz, z, cols[1]);
    this.kugel(ctx, x, y, z, L * 0.62, '#ffffff', cols[0], cols[1]);
    const [ax, ay] = this.proj(x + co * L * 0.55 * dir, y + si * L * 0.55 * dir, z + Hh * 0.2), sc = this.scale * k;
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ax, ay, sc * 0.05, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(ax, ay, sc * 0.025, 0, TAU); ctx.fill();
  }
  /* Qualle: Schirm als Kugel, Tentakel als hängende Fäden an Weltpunkten. Der Schirm ist durch-
     scheinend – darum bleibt er ein Farbverlauf und wird kein Körper mit Kanten. */
  spriteJelly(ctx, d, t) {
    const k = d.s, seed = d.seed || 0, r = k * 0.3;
    const z = (d.z || 0) + k * (1.1 + 0.25 * Math.sin(t * 1.1 + seed * 7));
    const col = seed > 0.5 ? '255,140,200' : '190,150,255';
    this.isoEllipse(ctx, d.x, d.y, z, r * 1.8, `rgba(${col},0.18)`);
    ctx.strokeStyle = `rgba(${col},0.7)`; ctx.lineWidth = Math.max(1, this.scale * k * 0.03); ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const a = seed * 6 + (i * TAU) / 5, wv = Math.sin(t * 2.5 + i + seed * 5) * r * 0.3;
      const px = d.x + Math.cos(a) * r * 0.35, py = d.y + Math.sin(a) * r * 0.35;
      const [o0, o1] = this.proj(px, py, z - r * 0.2), [u0, u1] = this.proj(px + wv, py + wv, z - r * 1.5);
      ctx.beginPath(); ctx.moveTo(o0, o1); ctx.quadraticCurveTo(o0 + wv * 6, (o1 + u1) / 2, u0, u1); ctx.stroke();
    }
    this.kugel(ctx, d.x, d.y, z, r * (1 + 0.08 * Math.sin(t * 3 + seed * 4)), 'rgba(255,255,255,0.9)', `rgba(${col},0.75)`, `rgba(${col},0.4)`);
  }
  spriteMast(ctx, d, t) {
    const k = d.s, z = d.z || 0, H = k * 3.2, a = (d.seed || 0) * 6;
    const co = Math.cos(a), si = Math.sin(a), sw = Math.sin(t * 1.5 + (d.seed || 0) * 6) * 0.12;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.3);
    this.saeule(ctx, d.x, d.y, z, k * 0.1, k * 0.06, H, '#5a3a1e', '#3a2412', 8);
    const rz = z + H * 0.38;
    this.walze(ctx, d.x - co * k * 0.95, d.y - si * k * 0.95, d.x + co * k * 0.95, d.y + si * k * 0.95, rz + k * 1.35, k * 0.05, '#5a3a1e', '#3a2412', { n: 8 });
    const bauch = 0.12 + sw * 0.3;
    const poly = [[-0.9, -bauch], [0.9, -bauch], [0.9, bauch], [-0.9, bauch]]
      .map(([u, v]) => [d.x + (u * co - v * si) * k, d.y + (u * si + v * co) * k]);
    this.prism(ctx, poly, rz, k * 1.35, '#f7efdc', '#d8cbb0');
    this.saeule(ctx, d.x, d.y, z + H * 0.86, k * 0.22, k * 0.22, k * 0.2, '#6b4423', '#3a2412', 8);
    const [fx, fy] = this.proj(d.x, d.y, z + H), sc = this.scale * k;
    ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + sc * 0.5, fy + sc * 0.12); ctx.lineTo(fx, fy + sc * 0.26); ctx.fill();
  }
  /* Perlmuschel: zwei Schalen als flache Körper, die Perle als Kugel dazwischen. */
  spritePearl(ctx, d, t, big) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 6, gl = 0.6 + 0.4 * Math.sin(t * 2 + d.x * 0.01);
    const faecher = (rr, w0, w1) => { const q = [[d.x, d.y]]; for (let i = 0; i <= 6; i++) { const w = a + w0 + (i / 6) * (w1 - w0); q.push([d.x + Math.cos(w) * rr, d.y + Math.sin(w) * rr]); } return q; };
    this.bodenSchatten(ctx, d.x, d.y, k * 0.5);
    this.isoEllipse(ctx, d.x, d.y, z + k * 0.3, k * (big ? 1.1 : 0.7), `rgba(255,245,210,${(big ? 0.28 : 0.14) * gl})`);
    this.prism(ctx, faecher(k * 0.52, -1.5, 0), z, k * 0.12, '#f2d9c4', '#c9a68c');          // untere Schale
    this.kugel(ctx, d.x, d.y, z + k * 0.24, k * 0.22, '#ffffff', '#f6ecdc', '#c9b8a4');      // die Perle
    this.prism(ctx, faecher(k * 0.5, 0.4, 1.9), z + k * 0.26, k * 0.1, '#f7e4d2', '#cfae94'); // obere Schale
  }
  spriteFern(ctx, d, t) {
    const k = d.s, z = d.z || 0, seed = d.seed || 0, sw = Math.sin(t * 1.2 + seed * 7) * 0.12;
    for (let i = 0; i < 6; i++) {
      const a = seed * 5 + (i * TAU) / 6 + sw, L = k * (0.52 + 0.18 * Math.abs(Math.sin(i * 1.7 + seed * 5)));
      this.ast(ctx, d.x, d.y, z + k * 0.06, Math.cos(a), Math.sin(a), L, k * 0.55, k * 0.42,
               k * 0.05, i % 2 ? '#4fb85a' : '#3fa848', '#2f8a3a', 3);
    }
  }
  /* Dschungelbaum: hoher Stamm mit Brettwurzeln, breite Kugelkrone, Lianen. */
  spriteJungleTree(ctx, d, t) {
    const k = d.s, z = d.z || 0, seed = d.seed || 0;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.8);
    for (let i = 0; i < 3; i++) {   // Brettwurzeln
      const a = seed * 4 + (i * TAU) / 3;
      this.ast(ctx, d.x, d.y, z + k * 0.1, Math.cos(a), Math.sin(a), k * 0.42, 0, k * 0.1, k * 0.1, '#5a3a1e', '#3f2814', 2);
    }
    this.saeule(ctx, d.x, d.y, z, k * 0.24, k * 0.14, k * 2.1, '#6b4423', '#3f2814', 8);
    const cols = [['#7fd86a', '#4aa84a', '#1f6a2c'], ['#6ac85a', '#2f8a3a', '#1a5a26']];
    const blobs = [[0, 0, 2.5, 1.0, 0], [-0.7, 0.3, 2.2, 0.7, 1], [0.75, -0.28, 2.25, 0.72, 1],
                   [-0.3, -0.6, 2.95, 0.62, 0], [0.36, 0.6, 3.0, 0.58, 0], [-1.05, -0.3, 2.6, 0.44, 1], [1.1, 0.3, 2.7, 0.44, 1]];
    blobs.map(b => ({ b, tiefe: this.depth(d.x + b[0] * k, d.y + b[1] * k) }))
      .sort((a, b) => a.tiefe - b.tiefe)
      .forEach(({ b }) => this.kugel(ctx, d.x + b[0] * k, d.y + b[1] * k, z + b[2] * k, b[3] * k, ...cols[b[4]]));
    for (let i = 0; i < 3; i++) {   // Lianen hängen senkrecht herunter
      const a = seed * 6 + i * 2.1, rx = d.x + Math.cos(a) * k * 0.7, ry = d.y + Math.sin(a) * k * 0.7;
      const L = k * (0.9 + i * 0.25), oben = z + k * 2.1, sw = Math.sin(t + i + seed * 4) * k * 0.08;
      const [ax, ay] = this.proj(rx, ry, oben), [bx, by] = this.proj(rx + sw, ry + sw, oben - L);
      ctx.strokeStyle = '#2a5a24'; ctx.lineWidth = Math.max(1, this.scale * k * 0.04); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.quadraticCurveTo(ax + sw * 8, (ay + by) / 2, bx, by); ctx.stroke();
    }
    if (seed > 0.6) for (let i = 0; i < 4; i++) {
      const a = i * 1.7 + seed;
      this.kugel(ctx, d.x + Math.cos(a) * k * 0.9, d.y + Math.sin(a) * k * 0.9, z + k * (2.5 + Math.sin(i * 2.3) * 0.4), k * 0.09, '#ffb8cc', '#ff5f8a', '#c03a66');
    }
  }
  /* Steinkopf: Sockel und Kopf als Quader, das Gesicht auf der Seite, die zur Kamera zeigt –
     dreht man herum, sieht man den Hinterkopf, und das ist auch richtig so. */
  spriteIdol(ctx, d, t) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 3, co = Math.cos(a), si = Math.sin(a);
    const kasten = (w, h) => [[-w, -h], [w, -h], [w, h], [-w, h]].map(([u, v]) => [d.x + u * co - v * si, d.y + u * si + v * co]);
    this.bodenSchatten(ctx, d.x, d.y, k * 0.5);
    this.prism(ctx, kasten(k * 0.42, k * 0.3), z, k * 0.25, '#8f8f7c', '#6a6a5a');
    this.frustum(ctx, kasten(k * 0.35, k * 0.26), kasten(k * 0.3, k * 0.24), z + k * 0.25, z + k * 1.05, '#9c9c88', '#70705f');
    this.prism(ctx, kasten(k * 0.36, k * 0.27), z + k * 1.05, k * 0.14, '#7a7a68', '#565648');
    // Gesicht auf der Kameraseite
    const c = this.cam, vx = d.x - c.sin * k * 0.27, vy = d.y - c.cos * k * 0.27, sc = this.scale * k;
    const gl = 0.5 + 0.5 * Math.sin(t * 2 + d.x);
    for (const vz of [-1, 1]) {
      const [ex, ey] = this.proj(vx + c.cos * k * 0.16 * vz, vy - c.sin * k * 0.16 * vz, z + k * 0.82);
      ctx.fillStyle = '#2a2a24'; ctx.fillRect(ex - sc * 0.08, ey - sc * 0.05, sc * 0.16, sc * 0.1);
      ctx.fillStyle = `rgba(255,209,102,${0.5 + 0.5 * gl})`; ctx.fillRect(ex - sc * 0.06, ey - sc * 0.035, sc * 0.12, sc * 0.07);
    }
    const [mx, my] = this.proj(vx, vy, z + k * 0.5);
    ctx.fillStyle = '#2a2a24'; ctx.fillRect(mx - sc * 0.2, my - sc * 0.04, sc * 0.4, sc * 0.08);
    const [nx2, ny2] = this.proj(vx, vy, z + k * 0.66);
    ctx.fillRect(nx2 - sc * 0.06, ny2 - sc * 0.11, sc * 0.12, sc * 0.22);
  }
  /* Totempfahl: vier bemalte Blöcke übereinander, oben die Flügel. Die Gesichter schauen zur
     Kamera, der Pfahl selbst ist ein Körper. */
  spriteTotem(ctx, d, t) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 3, co = Math.cos(a), si = Math.sin(a);
    const cols = ['#c94a3a', '#e8a63a', '#3a8fb0', '#6a9a3a'];
    const kasten = (w, h) => [[-w, -h], [w, -h], [w, h], [-w, h]].map(([u, v]) => [d.x + u * co - v * si, d.y + u * si + v * co]);
    this.bodenSchatten(ctx, d.x, d.y, k * 0.45);
    const c = this.cam, sc = this.scale * k;
    for (let m = 0; m < 4; m++) {
      const col = cols[(m + Math.floor((d.seed || 0) * 4)) % 4], z0 = z + k * 0.5 * m;
      this.prism(ctx, kasten(k * 0.3, k * 0.26), z0, k * 0.5, col, shade(col, 0.72));
      const vx = d.x - c.sin * k * 0.27, vy = d.y - c.cos * k * 0.27;
      for (const vz of [-1, 1]) {
        const [ex, ey] = this.proj(vx + c.cos * k * 0.14 * vz, vy - c.sin * k * 0.14 * vz, z0 + k * 0.33);
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(ex, ey, sc * 0.07, 0, TAU); ctx.fill();
        ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(ex, ey, sc * 0.035, 0, TAU); ctx.fill();
      }
      const [mx, my] = this.proj(vx, vy, z0 + k * 0.14);
      ctx.fillStyle = '#1a1a1a'; ctx.fillRect(mx - sc * 0.12, my - sc * 0.025, sc * 0.24, sc * 0.05);
    }
    for (const vz of [-1, 1]) this.ast(ctx, d.x, d.y, z + k * 2.05, co * vz, si * vz, k * 0.5, k * 0.28, k * 0.05, k * 0.05, '#e8a63a', '#b07a1a', 2);
  }
  /* Affe auf einem Ast: Ast als Walze, Körper und Kopf als Kugeln, Gesicht zur Kamera. */
  spriteMonkey(ctx, d, t) {
    const k = d.s, z = (d.z || 0) + k * 0.9, seed = d.seed || 0, c = this.cam;
    const a = seed * 6, co = Math.cos(a), si = Math.sin(a), sc = this.scale * k;
    this.walze(ctx, d.x - co * k * 0.7, d.y - si * k * 0.7, d.x + co * k * 0.7, d.y + si * k * 0.7, z, k * 0.07, '#7a4a2a', '#5a3a1e', { n: 7 });
    this.kugel(ctx, d.x, d.y, z + k * 0.28, k * 0.28, '#a06a44', '#7a4a2a', '#4a2a12');
    this.kugel(ctx, d.x - c.sin * k * 0.18, d.y - c.cos * k * 0.18, z + k * 0.26, k * 0.16, '#eecfae', '#d9b48a', '#a88a62');
    this.kugel(ctx, d.x, d.y, z + k * 0.7, k * 0.22, '#a06a44', '#7a4a2a', '#4a2a12');
    for (const vz of [-1, 1]) this.kugel(ctx, d.x + c.cos * k * 0.22 * vz, d.y - c.sin * k * 0.22 * vz, z + k * 0.76, k * 0.08, '#a06a44', '#7a4a2a', '#4a2a12');
    const vx = d.x - c.sin * k * 0.16, vy = d.y - c.cos * k * 0.16;
    this.kugel(ctx, vx, vy, z + k * 0.68, k * 0.13, '#f4dcc0', '#d9b48a', '#a88a62');
    for (const vz of [-1, 1]) {
      const [ex, ey] = this.proj(vx + c.cos * k * 0.06 * vz, vy - c.sin * k * 0.06 * vz, z + k * 0.74);
      ctx.fillStyle = '#1a1a1a'; ctx.beginPath(); ctx.arc(ex, ey, sc * 0.03, 0, TAU); ctx.fill();
    }
    const arm = Math.sin(t * 4 + seed * 6);
    this.ast(ctx, d.x, d.y, z + k * 0.2, co, si, k * 0.5, k * 0.5 + arm * k * 0.1, k * 0.1, k * 0.05, '#8a5a34', '#5a3a1e', 3);
  }
  spriteRopepost(ctx, d) {
    const k = d.s, z = d.z || 0;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.2, 0.18);
    this.saeule(ctx, d.x, d.y, z, k * 0.09, k * 0.08, k * 0.9, '#8a6a3a', '#5a3a1e', 8);
    for (const zz of [0.55, 0.75]) this.saeule(ctx, d.x, d.y, z + k * zz, k * 0.12, k * 0.12, k * 0.05, '#d8b878', '#9a7a3a', 9);
  }
  /* Boje: Kegelstumpf mit Band, Stange und Licht – sie schaukelt auf der Welle. */
  spriteBuoy(ctx, d, t) {
    const k = d.s, z = (d.z || 0) + Math.sin(t * 1.8 + d.x) * k * 0.05;
    this.isoEllipse(ctx, d.x, d.y, z + 0.01, k * 0.3, 'rgba(255,255,255,0.3)');
    this.frustum(ctx, this.circlePoly(d.x, d.y, k * 0.2, 8), this.circlePoly(d.x, d.y, k * 0.1, 8), z, z + k * 0.4, '#e05050', '#a82a2a');
    this.saeule(ctx, d.x, d.y, z + k * 0.16, k * 0.155, k * 0.135, k * 0.08, '#f4efe6', '#cfc6b8', 8);
    this.saeule(ctx, d.x, d.y, z + k * 0.4, k * 0.03, k * 0.03, k * 0.2, '#4a4a55', '#2f2f38', 6);
    this.kugel(ctx, d.x, d.y, z + k * 0.62, k * 0.05, '#fff6c8', '#ffdc64', '#c9a15a');
  }
  /* Anker: Schaft und Stock als Walzen, die Arme als Bögen. */
  spriteAnchor(ctx, d) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 6, co = Math.cos(a), si = Math.sin(a);
    this.bodenSchatten(ctx, d.x, d.y, k * 0.3, 0.18);
    for (let i = 0; i < 5; i++) {
      const zz = z + k * (0.1 + i * 0.14);
      this.walze(ctx, d.x - co * k * 0.03, d.y - si * k * 0.03, d.x + co * k * 0.03, d.y + si * k * 0.03, zz, k * 0.045, '#5e5e68', '#3a3a44', { n: 6 });
    }
    this.walze(ctx, d.x - co * k * 0.22, d.y - si * k * 0.22, d.x + co * k * 0.22, d.y + si * k * 0.22, z + k * 0.62, k * 0.04, '#5e5e68', '#3a3a44', { n: 6 });
    for (const vz of [-1, 1]) this.ast(ctx, d.x, d.y, z + k * 0.1, co * vz, si * vz, k * 0.3, k * 0.22, -k * 0.02, k * 0.045, '#5e5e68', '#3a3a44', 3);
    this.saeule(ctx, d.x, d.y, z + k * 0.78, k * 0.07, k * 0.07, k * 0.04, '#5e5e68', '#3a3a44', 8);
  }
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
  /* Seegras: drei Halme, die sich in der Strömung biegen – als Walzenkette, damit sie beim Drehen
     nicht platt werden. */
  spriteSeaweed(ctx, d, t) {
    const k = d.s, z = d.z || 0, seed = d.seed || 0;
    for (let i = -1; i <= 1; i++) {
      const sw = Math.sin(t * 1.3 + i + seed * 6) * 0.3, a = seed * 5 + i * 2.1;
      const bx = d.x + Math.cos(a) * k * 0.14, by = d.y + Math.sin(a) * k * 0.14;
      const L = k * (0.85 - Math.abs(i) * 0.18), n = 4;
      for (let j = 0; j < n; j++) {
        const u0 = j / n, u1 = (j + 1) / n;
        const kx = u => bx + Math.cos(a + sw) * k * 0.3 * u * u, ky = u => by + Math.sin(a + sw) * k * 0.3 * u * u;
        this.walze(ctx, kx(u0), ky(u0), kx(u1), ky(u1), z + L * (u0 + u1) / 2, k * 0.06 * (1 - u0 * 0.4),
                   i ? '#3fb06a' : '#55c67e', '#22754a', { n: 6 });
      }
    }
  }
  /* Muschel: eine flache Schale mit Rippen, als Weltpolygon auf dem Boden. */
  spriteShell(ctx, d) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 6, col = (d.seed || 0) > 0.5 ? '#f7dcc8' : '#ffe9b8';
    const faecher = (rr) => { const q = [[d.x, d.y]]; for (let i = 0; i <= 6; i++) { const w = a - 0.8 + (i / 6) * 1.6; q.push([d.x + Math.cos(w) * rr, d.y + Math.sin(w) * rr]); } return q; };
    this.prism(ctx, faecher(k * 0.32), z, k * 0.1, col, shade(col, 0.78));
    ctx.strokeStyle = 'rgba(160,100,80,0.5)'; ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const w = a - 0.7 + (i / 4) * 1.4;
      const [ax, ay] = this.proj(d.x, d.y, z + k * 0.1), [bx, by] = this.proj(d.x + Math.cos(w) * k * 0.3, d.y + Math.sin(w) * k * 0.3, z + k * 0.1);
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    }
  }
  /* Seestern: liegt flach auf dem Grund. Sein Umriss ist ein Weltpolygon knapp über dem Boden –
     dadurch verzerrt ihn die Projektion richtig, statt ihn als Stern aufs Bild zu kleben. */
  spriteStarfish(ctx, d) {
    const k = d.s, z = (d.z || 0) + 0.012, a0 = (d.seed || 0) * 6, q = [];
    for (let i = 0; i < 10; i++) { const a = a0 + (i * Math.PI) / 5, r = i % 2 ? k * 0.12 : k * 0.3; q.push([d.x + Math.cos(a) * r, d.y + Math.sin(a) * r]); }
    this.fillPoly(ctx, q, z, (d.seed || 0) > 0.5 ? '#ff7a3d' : '#ff5f8a');
    for (let i = 0; i < 5; i++) {
      const a = a0 + (i * TAU) / 5;
      this.isoEllipse(ctx, d.x + Math.cos(a) * k * 0.15, d.y + Math.sin(a) * k * 0.15, z + 0.004, k * 0.025, 'rgba(255,255,255,0.4)');
    }
  }
  /* Truhe: Kasten mit gewölbtem Deckel und Beschlägen. */
  spriteChest(ctx, d, t) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 3, co = Math.cos(a), si = Math.sin(a);
    const kasten = (w, h) => [[-w, -h], [w, -h], [w, h], [-w, h]].map(([u, v]) => [d.x + u * co - v * si, d.y + u * si + v * co]);
    this.bodenSchatten(ctx, d.x, d.y, k * 0.5);
    const gl = 0.6 + 0.4 * Math.sin(t * 3);
    this.isoEllipse(ctx, d.x, d.y, z + k * 0.46, k * 0.7, `rgba(255,220,120,${0.22 * gl})`);
    this.prism(ctx, kasten(k * 0.45, k * 0.3), z, k * 0.42, '#8a5a2a', '#6b4423');
    this.frustum(ctx, kasten(k * 0.45, k * 0.3), kasten(k * 0.38, k * 0.16), z + k * 0.42, z + k * 0.62, '#a06a34', '#7a4a20');
    this.saeule(ctx, d.x, d.y, z + k * 0.42, k * 0.06, k * 0.06, k * 0.12, '#ffd166', '#c9a15a', 6);
  }
  spriteBasalt(ctx, d) {
    const k = d.s, z = d.z || 0, hs = [0.75, 1.05, 0.58], seed = d.seed || 0;
    const orte = [[-0.3, 0.12], [0.04, -0.16], [0.3, 0.2]];
    orte.map((o, i) => ({ o, h: hs[(i + Math.floor(seed * 3)) % 3], tiefe: this.depth(d.x + o[0] * k, d.y + o[1] * k) }))
      .sort((a, b) => a.tiefe - b.tiefe)
      .forEach(({ o, h }) => {
        const poly = this.circlePoly(d.x + o[0] * k, d.y + o[1] * k, k * 0.19, 6, seed * 2);
        this.prism(ctx, poly, z, k * h, '#5a545c', '#2e2a30');
      });
  }
  /* Schlot: glühender Riss im Boden mit aufsteigendem Rauch. Der Riss liegt in der Bodenebene,
     der Rauch steigt als Dunstflecken – Glut und Rauch sind Licht und Dunst, keine Körper. */
  spriteVent(ctx, d, t) {
    const k = d.s, z = d.z || 0, gl = 0.7 + 0.3 * Math.sin(t * 6 + d.x);
    this.isoEllipse(ctx, d.x, d.y, z + 0.006, k * 0.5, `rgba(255,110,30,${0.25 * gl})`);
    this.isoEllipse(ctx, d.x, d.y, z + 0.01, k * 0.18, `rgba(255,170,60,${gl})`);
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.4 + i * 0.33) % 1, rr = k * (0.06 + u * 0.18);
      this.isoEllipse(ctx, d.x + Math.sin(u * 5 + i) * k * 0.12, d.y, z + k * (0.1 + u * 0.9), rr, `rgba(120,100,110,${0.4 * (1 - u)})`, rr / this.cam.tilt);
    }
  }
  spritePalm(ctx, d, t) {
    const k = d.s, z = d.z || 0, seed = d.seed || 0;
    const neigA = seed * 6, neig = (seed - 0.5) * 0.5 * k;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.5);
    const n = 6, hoch = k * 1.7;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const px = u => d.x + Math.cos(neigA) * neig * u * u, py = u => d.y + Math.sin(neigA) * neig * u * u;
      this.saeule(ctx, px((u0 + u1) / 2), py((u0 + u1) / 2), z + hoch * u0, k * (0.14 - u0 * 0.05), k * (0.14 - u1 * 0.05),
                  hoch / n, '#a07c46', '#7a5a2e', 8);
    }
    const tx = d.x + Math.cos(neigA) * neig, ty = d.y + Math.sin(neigA) * neig;
    const sw = Math.sin(t * 1.4 + seed * 6) * 0.1;
    for (let i = 0; i < 7; i++) {
      const a = seed * 4 + (i * TAU) / 7 + sw;
      this.ast(ctx, tx, ty, z + hoch, Math.cos(a), Math.sin(a), k * 0.78, k * 0.28, k * 0.62,
               k * 0.07, i % 2 ? '#4fb85a' : '#3f9a4e', '#2f7a3e', 4);
    }
    for (let i = 0; i < 3; i++) {   // Kokosnüsse
      const a = seed * 3 + i * 2.1;
      this.kugel(ctx, tx + Math.cos(a) * k * 0.1, ty + Math.sin(a) * k * 0.1, z + hoch - k * 0.06, k * 0.06, '#e0b070', '#c9862a', '#8a5a1a');
    }
  }
  /* Kaktus: Säule mit zwei Armen. Die Arme stehen in Weltrichtungen, also zeigt der eine beim
     Drehen wirklich nach vorn und der andere nach hinten. */
  spriteCactus(ctx, d) {
    const k = d.s, z = d.z || 0, seed = d.seed || 0, h = k * (0.85 + seed * 0.4), r = k * 0.14;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.28, 0.2);
    this.saeule(ctx, d.x, d.y, z, r, r * 0.9, h, '#4fa84a', '#2f7a34', 9);
    this.kugel(ctx, d.x, d.y, z + h, r * 0.9, '#7fd06a', '#4fa84a', '#2f7a34');
    for (const [ri, hh, L] of [[seed * 6, 0.48, 0.36], [seed * 6 + 2.6, 0.62, 0.32]]) {
      const dx = Math.cos(ri), dy = Math.sin(ri);
      this.ast(ctx, d.x, d.y, z + h * hh, dx, dy, k * L, 0, 0, r * 0.7, '#4fa84a', '#2f7a34', 2);
      const ax = d.x + dx * k * L, ay = d.y + dy * k * L;
      this.saeule(ctx, ax, ay, z + h * hh - r * 0.3, r * 0.7, r * 0.6, h * 0.34, '#4fa84a', '#2f7a34', 8);
      this.kugel(ctx, ax, ay, z + h * hh + h * 0.34, r * 0.6, '#7fd06a', '#4fa84a', '#2f7a34');
    }
    if (seed > 0.6) this.kugel(ctx, d.x, d.y, z + h + r * 0.9, k * 0.07, '#ffb8cc', '#ff5f8a', '#c03a66');
  }
  /* Krug: gebrannter Ton als echter Körper – Fuß, bauchiger Leib, Hals und Rand als gestapelte
     Kegelstümpfe. Der farbige Ring sitzt als flacher Reif etwas weiter außen auf dem Bauch. */
  spriteUrn(ctx, d) {
    const g = d.s || 1, x = d.x, y = d.y, dunkel = !!d.dark;
    const deck = dunkel ? '#7a5a6e' : '#e0a060', seite = dunkel ? '#432f42' : '#b8683a';
    const reif = dunkel ? '#8a6cff' : '#2fb8c9';
    const K = r => this.circlePoly(x, y, r * g, 10);
    this.isoEllipse(ctx, x, y, 0.003, 0.42 * g, 'rgba(0,0,0,0.22)');
    this.frustum(ctx, K(0.19), K(0.24), 0, 0.08 * g, deck, seite);          // Fuß
    this.frustum(ctx, K(0.24), K(0.40), 0.08 * g, 0.28 * g, deck, seite);   // Bauch, ausladend
    // Zierreif: nur die Seiten sind farbig. Die Deckfläche bleibt Ton – ein farbiger Deckel würde
    // von oben gesehen den halben Krug überdecken, denn frustum füllt seine Deckfläche immer.
    this.frustum(ctx, K(0.40), K(0.40), 0.28 * g, 0.36 * g, deck, reif);    // Zierreif
    this.frustum(ctx, K(0.40), K(0.26), 0.36 * g, 0.60 * g, deck, seite);   // Schulter
    this.frustum(ctx, K(0.26), K(0.22), 0.60 * g, 0.68 * g, deck, seite);   // Hals
    this.frustum(ctx, K(0.22), K(0.28), 0.68 * g, 0.74 * g, deck, seite);   // Rand
  }

  /* Obelisk: schlanke, spitz zulaufende Steinsäule mit goldener Spitze */
  spriteObelisk(ctx, d) {
    const g = d.s || 1, x = d.x, y = d.y;
    const Q = r => [[x - r * g, y - r * g], [x + r * g, y - r * g], [x + r * g, y + r * g], [x - r * g, y + r * g]];
    this.isoEllipse(ctx, x, y, 0.003, 0.46 * g, 'rgba(0,0,0,0.24)');
    this.frustum(ctx, Q(0.34), Q(0.31), 0, 0.20 * g, '#d9b979', '#8a6a34', { outline: '#5a4420' });   // Sockel
    this.frustum(ctx, Q(0.23), Q(0.11), 0.20 * g, 2.06 * g, '#e6cf95', '#a8874a', { outline: '#5a4420' }); // Schaft, verjüngt
    this.frustum(ctx, Q(0.11), Q(0.012), 2.06 * g, 2.34 * g, '#ffd166', '#c99a2a', { outline: '#5a4420' }); // goldene Spitze
    // Eingemeißelte Zeichen auf der Vorderseite
    ctx.fillStyle = 'rgba(60,40,12,0.42)';
    for (let i = 0; i < 5; i++) {
      const z = (0.55 + i * 0.3) * g, r = (0.22 - i * 0.024) * g;
      const [px, py] = this.proj(x, y + r * 0.9, z);
      ctx.beginPath(); ctx.ellipse(px, py, this.scale * 0.035 * g, this.scale * (i % 2 ? 0.03 : 0.055) * g, 0, 0, TAU); ctx.fill();
    }
  }
  /* Sarkophag: goldener Kasten mit blauen Streifen und Pharaonenmaske */
  /* Sarkophag: Kasten mit schräg zulaufendem Deckel, Maske auf der Kameraseite. */
  spriteSarcophagus(ctx, d, t) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 3, co = Math.cos(a), si = Math.sin(a), c = this.cam;
    const kasten = (w, h) => [[-w, -h], [w, -h], [w, h], [-w, h]].map(([u, v]) => [d.x + u * co - v * si, d.y + u * si + v * co]);
    this.bodenSchatten(ctx, d.x, d.y, k * 0.55);
    this.prism(ctx, kasten(k * 0.42, k * 0.3), z, k * 0.5, '#a8862e', '#7a5c1e');
    this.frustum(ctx, kasten(k * 0.42, k * 0.3), kasten(k * 0.34, k * 0.22), z + k * 0.5, z + k * 1.05, '#e0b84a', '#a8862e');
    const vx = d.x - c.sin * k * 0.24, vy = d.y - c.cos * k * 0.24, sc = this.scale * k;
    const [mx, my] = this.proj(vx, vy, z + k * 0.82);
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.ellipse(mx, my, sc * 0.14, sc * 0.17, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#1e3a6a'; ctx.fillRect(mx - sc * 0.2, my - sc * 0.19, sc * 0.4, sc * 0.07);
    ctx.fillStyle = '#2a1a08'; ctx.beginPath(); ctx.arc(mx - sc * 0.05, my - sc * 0.02, sc * 0.02, 0, TAU); ctx.arc(mx + sc * 0.05, my - sc * 0.02, sc * 0.02, 0, TAU); ctx.fill();
  }
  /* Hexenhütte: Bohlenwand als achteckiger Körper, darüber ein hoher Kegel als Hut. Tür, Fenster
     und der Schein darin liegen auf der Seite, die zur Kamera zeigt. */
  spriteHut(ctx, d, t) {
    const k = d.s, z = d.z || 0, gl = 0.85 + 0.15 * Math.sin(t * 4), c = this.cam, sc = this.scale * k;
    const acht = rr => this.circlePoly(d.x, d.y, rr, 8, 0.4);
    this.bodenSchatten(ctx, d.x, d.y, k * 0.75);
    this.frustum(ctx, acht(k * 0.62), acht(k * 0.58), z, z + k * 0.62, '#5a4030', '#3a2a1c');
    this.kegel(ctx, d.x, d.y, z + k * 0.62, k * 0.95, k * 1.15, '#4a3466', '#2e1f3f', 8);
    // Rauch aus dem Schornstein
    for (let i = 0; i < 3; i++) {
      const u = (t * 0.35 + i * 0.33) % 1, rr = k * (0.06 + u * 0.16);
      this.isoEllipse(ctx, d.x + k * 0.35 + Math.sin(u * 5 + i) * k * 0.1, d.y, z + k * (1.3 + u * 0.6), rr, `rgba(150,255,120,${0.35 * (1 - u)})`, rr / this.cam.tilt);
    }
    const vx = d.x - c.sin * k * 0.56, vy = d.y - c.cos * k * 0.56;
    const [tx, ty] = this.proj(vx, vy, z);
    ctx.fillStyle = '#1a1010'; ctx.beginPath();
    ctx.moveTo(tx - sc * 0.14, ty); ctx.lineTo(tx - sc * 0.14, ty - sc * 0.34); ctx.arc(tx, ty - sc * 0.34, sc * 0.14, Math.PI, 0); ctx.lineTo(tx + sc * 0.14, ty); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(255,170,60,${0.4 * gl})`; ctx.beginPath(); ctx.ellipse(tx, ty - sc * 0.2, sc * 0.1, sc * 0.18, 0, 0, TAU); ctx.fill();
    const [wx, wy] = this.proj(vx + c.cos * k * 0.32, vy - c.sin * k * 0.32, z + k * 0.42);
    ctx.fillStyle = `rgba(255,220,110,${0.25 * gl})`; ctx.beginPath(); ctx.arc(wx, wy, sc * 0.26, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd86a'; ctx.fillRect(wx - sc * 0.11, wy - sc * 0.11, sc * 0.22, sc * 0.22);
    ctx.fillStyle = '#4a3322'; ctx.fillRect(wx - sc * 0.015, wy - sc * 0.11, sc * 0.03, sc * 0.22); ctx.fillRect(wx - sc * 0.11, wy - sc * 0.015, sc * 0.22, sc * 0.03);
  }
  spriteCandle(ctx, d, t) {
    const k = d.s, z = d.z || 0, f = 0.8 + 0.2 * Math.sin(t * 9 + d.x);
    this.saeule(ctx, d.x, d.y, z, k * 0.07, k * 0.06, k * 0.32, '#f7efd8', '#d6c9a8', 7);
    const [fx, fy] = this.proj(d.x, d.y, z + k * 0.34), sc = this.scale * k;
    ctx.fillStyle = `rgba(255,200,90,${0.15 * f})`; ctx.beginPath(); ctx.arc(fx, fy - sc * 0.06, sc * 0.35, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffb347'; ctx.beginPath(); ctx.ellipse(fx, fy - sc * 0.07, sc * 0.04, sc * 0.09 * f, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#fff3b0'; ctx.beginPath(); ctx.ellipse(fx, fy - sc * 0.05, sc * 0.02, sc * 0.05 * f, 0, 0, TAU); ctx.fill();
  }
  /* Schädel: Hirnschale als Kugel, Kiefer als kleiner Kasten, Augen als dunkle Flecken auf der
     Seite, die zur Kamera zeigt. */
  spriteSkull(ctx, d) {
    const k = d.s, z = d.z || 0, c = this.cam;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.2, 0.2);
    this.saeule(ctx, d.x, d.y, z, k * 0.12, k * 0.1, k * 0.12, '#e8e2d2', '#bdb6a4', 7);
    this.kugel(ctx, d.x, d.y, z + k * 0.24, k * 0.18, '#fffaf0', '#e8e2d2', '#b0a894');
    const vx = d.x - c.sin * k * 0.16, vy = d.y - c.cos * k * 0.16;
    for (const vz of [-1, 1]) {
      const [ex, ey] = this.proj(vx + c.cos * k * 0.07 * vz, vy - c.sin * k * 0.07 * vz, z + k * 0.26);
      ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(ex, ey, this.scale * k * 0.05, 0, TAU); ctx.fill();
    }
    const [nx2, ny2] = this.proj(vx, vy, z + k * 0.17);
    ctx.fillStyle = '#1a1010'; ctx.beginPath(); ctx.arc(nx2, ny2, this.scale * k * 0.025, 0, TAU); ctx.fill();
  }
  /* Flasche: Bauch, Hals und Korken als drei Säulen. */
  spriteBottle(ctx, d) {
    const k = d.s, z = d.z || 0;
    const cols = ['#b04ee6', '#4fd0ff', '#a6ff5e', '#ff7a3d'], c = cols[Math.floor((d.seed || 0) * 4) % 4];
    this.saeule(ctx, d.x, d.y, z, k * 0.09, k * 0.08, k * 0.3, c, shade(c, 0.7), 8);
    this.saeule(ctx, d.x, d.y, z + k * 0.3, k * 0.04, k * 0.04, k * 0.12, shade(c, 1.15), shade(c, 0.8), 6);
    this.saeule(ctx, d.x, d.y, z + k * 0.42, k * 0.045, k * 0.045, k * 0.05, '#c99a5a', '#9a6b3a', 6);
  }
  /* Regal: zwei Ständer, drei Bretter, Fläschchen darauf – alles als Quader und Säulen, damit man
     von der Seite auch wirklich die Seite sieht. */
  spriteShelf(ctx, d) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 3, co = Math.cos(a), si = Math.sin(a);
    const ort = (u, v) => [d.x + (u * co - v * si) * k, d.y + (u * si + v * co) * k];
    const kasten = (u0, v0, u1, v1) => [[u0, v0], [u1, v0], [u1, v1], [u0, v1]].map(([u, v]) => ort(u, v));
    this.bodenSchatten(ctx, d.x, d.y, k * 0.5);
    for (const u of [-0.46, 0.46]) this.prism(ctx, kasten(u - 0.04, -0.12, u + 0.04, 0.12), z, k * 1.2, '#5a3e22', '#3e2a16');
    for (const zz of [0.45, 0.85, 1.2]) this.prism(ctx, kasten(-0.5, -0.14, 0.5, 0.14), z + k * zz, k * 0.06, '#8a6436', '#6a4a2a');
    const cols = ['#b04ee6', '#4fd0ff', '#a6ff5e', '#ff7a3d', '#ffd166'];
    for (let m = 0; m < 6; m++) {
      const zz = m < 3 ? 0.51 : 0.91, u = -0.32 + (m % 3) * 0.3, c = cols[(m + Math.floor((d.seed || 0) * 5)) % 5];
      const [px, py] = ort(u, 0);
      this.saeule(ctx, px, py, z + k * zz, k * 0.055, k * 0.05, k * 0.2, c, shade(c, 0.7), 6);
    }
  }
  /* Besen: Stiel als schräge Säulenkette, Reisig als Kegelstumpf. */
  spriteBroom(ctx, d) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 6, lean = 0.22;
    const n = 4;
    for (let i = 0; i < n; i++) {
      const u0 = i / n, u1 = (i + 1) / n;
      const px = u => d.x + Math.cos(a) * lean * k * u, py = u => d.y + Math.sin(a) * lean * k * u;
      this.saeule(ctx, px((u0 + u1) / 2), py((u0 + u1) / 2), z + k * (0.35 + 0.9 * u0), k * 0.035, k * 0.035, k * 0.9 / n, '#8a6a3a', '#5a3a1e', 6);
    }
    this.frustum(ctx, this.circlePoly(d.x, d.y, k * 0.16, 8), this.circlePoly(d.x, d.y, k * 0.06, 8), z, z + k * 0.4, '#d8b878', '#9a7a3a');
  }
  /* Zahnrad auf einer Welle: Fuß und Welle sind Körper, das Rad selbst bleibt eine Scheibe zur
     Kamera – ein Zahnrad von der Kante gesehen wäre ein Strich, und darum geht es hier nicht. */
  spriteGear(ctx, d, t) {
    const k = d.s, z = d.z || 0, teeth = 8 + Math.floor((d.seed || 0) * 5);
    const sp = ((d.seed || 0) > 0.5 ? 1 : -1) * (0.5 + (d.seed || 0));
    this.bodenSchatten(ctx, d.x, d.y, k * 0.34);
    this.saeule(ctx, d.x, d.y, z, k * 0.22, k * 0.2, k * 0.1, '#3a3036', '#2e262c', 9);
    this.saeule(ctx, d.x, d.y, z + k * 0.1, k * 0.09, k * 0.08, k * 0.68, '#6b5c64', '#3a3036', 7);
    const r = this.scale * k * 0.55, [cx, cy] = this.proj(d.x, d.y, z + k * 0.78 + k * 0.33);
    this.zahnradScheibe(ctx, cx, cy, r, teeth, t * sp, r * 0.22, '#f0cd7d', '#8a5f22');
  }
  spriteGearFlat(ctx, d, s, t) {
    const r = (d.s || 1) * 0.7, zn = 9 + Math.floor((d.seed || 0) * 4);
    const sp = d.speed ?? (((d.seed || 0) > 0.5 ? 1 : -1) * (0.25 + (d.seed || 0) * 0.4));
    const [sx, sy] = this.proj(d.x, d.y, (d.z || 0) + 0.02);
    if (!this.onScreen(sx, sy, this.scale * (r + 2))) return;
    this.isoEllipse(ctx, d.x, d.y, (d.z || 0) + 0.004, r * 1.1, 'rgba(0,0,0,0.28)');
    this.zahnrad(ctx, d.x, d.y, (d.z || 0) + 0.01, r, r * 0.3, zn, t * sp, '#c9963f', '#6e4a18',
      { outline: '#3a2610' });
  }
  /* Dampfrohr mit Ventil und Dampfwölkchen */
  /* Große Turmuhr auf einem Pfosten */
  /* Glocke im Turmstuhl: hängt an einem Joch und schaukelt langsam. Der Klöppel hängt etwas
     nach, sonst sähe die Bewegung wie ein starres Bild aus, das man hin und her schiebt. */
  /* Glocke im Turmstuhl. Der Stuhl ist gebaut: zwei Pfosten in Weltkoordinaten, darüber das Joch
     und zwei Streben, die ihn aussteifen. Die Glocke selbst bleibt eine Zeichnung im Bildschirm-
     raum – sie hängt und schwingt um eine waagerechte Achse, und ein Körper, den man so kippt,
     läge in dieser Projektion schief (siehe *Was die Projektion mit stehenden Scheiben macht*). */
  spriteBell(ctx, d, t) {
    const g = d.s || 1, x = d.x, y = d.y, s = this.scale * g;
    const seed = d.seed ?? 0.3;
    const a = Math.sin(t * 0.9 + seed * 6.283) * 0.16;
    const H = 1.55 * g, r = s * 0.52;
    /* Der Stuhl muss die Glocke auf dem Bildschirm links und rechts einfassen, und die Glocke ist
       eine Zeichnung im Bildschirmraum. Ein Versatz entlang (cos, -sin) verschiebt in dieser
       Projektion genau waagerecht und sonst gar nicht – damit stehen die Pfosten als echte Körper
       in der Welt und trotzdem da, wo sie hingehören. */
    const [ex, ey] = [this.cam.cos, -this.cam.sin];
    const W = (a, b2) => [x + (ex * a - ey * b2) * g, y + (ey * a + ex * b2) * g];
    this.isoEllipse(ctx, x, y, 0.003, 0.62 * g, 'rgba(0,0,0,0.22)');
    // Turmstuhl: zwei Pfosten mit Fuß, darüber das Joch, dazu zwei Streben
    const pf = (ox) => {
      const m = W(ox, 0);
      this.prism(ctx, this.circlePoly(m[0], m[1], 0.2 * g, 8), 0, 0.1 * g, '#5a4634', '#2a2016', { outline: '#160f08' });
      this.prism(ctx, [W(ox - 0.09, -0.09), W(ox + 0.09, -0.09), W(ox + 0.09, 0.09), W(ox - 0.09, 0.09)],
        0.1 * g, H - 0.1 * g, '#5a4634', '#33261a', { outline: '#160f08' });
    };
    pf(-0.62); pf(0.62);
    this.prism(ctx, [W(-0.78, -0.11), W(0.78, -0.11), W(0.78, 0.11), W(-0.78, 0.11)],
      H, 0.17 * g, '#6b5340', '#33261a', { outline: '#160f08' });
    for (const ox of [-0.62, 0.62]) {                          // Streben
      const a0 = W(ox, 0), a1 = W(ox * 0.32, 0);
      const p0 = this.proj(a0[0], a0[1], H * 0.62), p1 = this.proj(a1[0], a1[1], H);
      ctx.strokeStyle = '#4a3a2a'; ctx.lineWidth = Math.max(1.2, s * 0.06);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    }
    const [sx, sy] = this.proj(x, y, 0);
    const jochY = this.proj(x, y, H)[1];
    ctx.save();
    ctx.translate(sx, jochY + s * 0.05); ctx.rotate(a);
    // Glockenmantel
    const mantel = ctx.createLinearGradient(-r, 0, r, 0);
    mantel.addColorStop(0, '#8a6624'); mantel.addColorStop(0.45, '#e0b45c'); mantel.addColorStop(1, '#7a5a22');
    ctx.fillStyle = mantel;
    ctx.beginPath();
    ctx.moveTo(-r * 0.22, 0); ctx.lineTo(r * 0.22, 0);
    ctx.quadraticCurveTo(r * 0.42, s * 0.55, r, s * 0.95);
    ctx.lineTo(-r, s * 0.95);
    ctx.quadraticCurveTo(-r * 0.42, s * 0.55, -r * 0.22, 0);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#6d4d18'; ctx.fillRect(-r, s * 0.95, r * 2, s * 0.14);
    ctx.fillStyle = 'rgba(255,246,214,0.4)';
    ctx.beginPath(); ctx.ellipse(-r * 0.42, s * 0.6, r * 0.12, s * 0.34, 0.12, 0, TAU); ctx.fill();
    // Klöppel, der der Glocke nachhängt
    const kl = Math.sin(t * 0.9 + seed * 6.283 - 0.5) * 0.3;
    ctx.strokeStyle = '#3a2f22'; ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath(); ctx.moveTo(0, s * 0.15); ctx.lineTo(Math.sin(kl) * r * 0.5, s * 0.9); ctx.stroke();
    ctx.fillStyle = '#5a4a34';
    ctx.beginPath(); ctx.arc(Math.sin(kl) * r * 0.5, s * 0.95, s * 0.11, 0, TAU); ctx.fill();
    ctx.restore();
  }

  /* Gewicht an der Kette: der Antrieb jeder Turmuhr. Es sinkt ganz langsam und springt dann
     wieder hoch – so, wie man es beim Aufziehen sieht. */
  /* Gewicht an der Kette: ein Messingzylinder, der langsam sinkt und oben wieder aufgezogen wird.
     Zylinder und Kettenglieder liegen jetzt im Raum, die Kette hängt senkrecht über dem Gewicht. */
  spriteWeight(ctx, d, t) {
    const k = d.s, z = d.z || 0, seed = d.seed ?? 0.5;
    const u = (((t / 22 + seed) % 1) + 1) % 1;
    const fall = k * 1.05 * (u < 0.94 ? u / 0.94 : (1 - (u - 0.94) / 0.06));
    const kopf = z + k * 1.85 - fall;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.26);
    const [o0, o1] = this.proj(d.x, d.y, z + k * 2.6), [u0, u1] = this.proj(d.x, d.y, kopf + k * 0.62);
    ctx.strokeStyle = '#6b6660'; ctx.lineWidth = Math.max(1, this.scale * k * 0.05);
    ctx.beginPath(); ctx.moveTo(o0, o1); ctx.lineTo(u0, u1); ctx.stroke();
    for (let i = 0; i < 5; i++) {
      const zz = z + k * 2.6 + (kopf + k * 0.62 - (z + k * 2.6)) * (i + 0.5) / 5;
      this.isoEllipse(ctx, d.x, d.y, zz, k * 0.07, '#6b6660');
    }
    this.saeule(ctx, d.x, d.y, kopf, k * 0.3, k * 0.3, k * 0.62, '#e0b45c', '#8a6624', 10);
  }
  spriteClock(ctx, d, t) {
    const g = d.s || 1, x = d.x, y = d.y, s = this.scale * g;
    const K = (rr, n) => this.circlePoly(x, y, rr * g, n || 10);
    this.isoEllipse(ctx, x, y, 0.003, 0.34 * g, 'rgba(0,0,0,0.22)');
    this.frustum(ctx, K(0.3), K(0.16), 0, 0.14 * g, '#4a4048', '#282028', { outline: '#14101a' });
    this.prism(ctx, K(0.11), 0.14 * g, 1.26 * g, '#544a54', '#2e2830', { outline: '#14101a' });
    this.prism(ctx, K(0.17, 12), 1.2 * g, 0.1 * g, '#6b5f6b', '#2e2830');
    const [sx, sy] = this.proj(x, y, 0);
    const r = s * 0.6, cy = this.proj(x, y, 1.4 * g)[1];
    for (let i = 4; i >= 1; i--) {                             // gemalte Tiefe des Gehäuses
      const k = i / 4;
      ctx.fillStyle = `rgb(${Math.round(70 + 68 * (1 - k))},${Math.round(48 + 47 * (1 - k))},${Math.round(18 + 16 * (1 - k))})`;
      ctx.beginPath(); ctx.arc(sx + k * s * 0.09, cy + k * s * 0.07, r * 1.12, 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#8a5f22'; ctx.beginPath(); ctx.arc(sx, cy, r * 1.12, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f3e6c4'; ctx.beginPath(); ctx.arc(sx, cy, r, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a2a10'; ctx.lineWidth = Math.max(1, s * 0.04);
    for (let i = 0; i < 12; i++) { const a = (i * TAU) / 12; ctx.beginPath(); ctx.moveTo(sx + Math.cos(a) * r * 0.82, cy + Math.sin(a) * r * 0.82); ctx.lineTo(sx + Math.cos(a) * r * 0.95, cy + Math.sin(a) * r * 0.95); ctx.stroke(); }
    const am = t * 0.5 - Math.PI / 2, ah = t * 0.5 / 12 - Math.PI / 2;
    ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx + Math.cos(ah) * r * 0.5, cy + Math.sin(ah) * r * 0.5); ctx.stroke();
    ctx.lineWidth = Math.max(1, s * 0.04); ctx.beginPath(); ctx.moveTo(sx, cy); ctx.lineTo(sx + Math.cos(am) * r * 0.78, cy + Math.sin(am) * r * 0.78); ctx.stroke();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(sx, cy, r * 0.07, 0, TAU); ctx.fill();
  }
  spriteMushroom(ctx, x, y, z, size, capCol, spots = false) {
    this.bodenSchatten(ctx, x, y, size * 0.45, 0.2);
    this.saeule(ctx, x, y, z, size * 0.17, size * 0.14, size * 0.52, '#f3e6c8', '#d6c49c', 8);
    this.frustum(ctx, this.circlePoly(x, y, size * 0.6, 10), this.circlePoly(x, y, size * 0.44, 10),
                 z + size * 0.42, z + size * 0.62, shade(capCol, 1.05), shade(capCol, 0.8));
    this.frustum(ctx, this.circlePoly(x, y, size * 0.44, 10), this.circlePoly(x, y, size * 0.1, 10),
                 z + size * 0.62, z + size * 0.8, capCol, shade(capCol, 0.85));
    if (spots) for (const [a, rr, pr] of [[0.6, 0.3, 0.09], [2.4, 0.36, 0.075], [4.5, 0.26, 0.065]]) {
      this.isoEllipse(ctx, x + Math.cos(a) * size * rr, y + Math.sin(a) * size * rr, z + size * 0.81, size * pr, 'rgba(255,255,255,0.85)');
    }
  }
  /* Blumenbusch: ein flacher Blattballen mit Blüten darauf – die Blüten sitzen an Weltpunkten
     rundherum, nicht nebeneinander auf dem Bildschirm. */
  /* Blumenbusch: ein flaches Blattpolster mit Blüten darauf. Die Blüten waren zuerst kleine
     Kugeln mit weißem Glanzpunkt – und sahen damit aus wie Golfbälle, die im Gras liegen. Auf
     einer Minigolfbahn ist das kein Schönheitsfehler, sondern eine falsche Ansage: Man sucht nach
     einem zweiten Ball. Jetzt liegen sie flach in der Bodenebene, als Teller mit dunklerem Herz –
     von schräg oben sieht eine Blüte genau so aus, und rund ist daran nichts mehr. */
  spriteFlowers(ctx, d) {
    const k = d.s, z = d.z || 0, seed = d.seed || 0;
    this.frustum(ctx, this.circlePoly(d.x, d.y, k * 0.44, 9), this.circlePoly(d.x, d.y, k * 0.3, 9),
                 z, z + k * 0.18, '#6fc257', '#468a3c');
    const cols = ['#ff6b9d', '#ffd166', '#c77dff', '#ff9a3a'];
    for (let i = 0; i < 5; i++) {
      const a = seed * 6 + i * 1.27, rr = k * 0.3 * (0.35 + ((i * 7) % 3) * 0.3);
      const bx = d.x + Math.cos(a) * rr, by = d.y + Math.sin(a) * rr;
      const col = cols[(i + Math.floor(seed * 4)) % 4];
      this.isoEllipse(ctx, bx, by, z + k * 0.19, k * 0.085, col);
      this.isoEllipse(ctx, bx, by, z + k * 0.2, k * 0.03, shade(col, 0.55));
    }
  }
  spriteRock(ctx, d, c1, c2, snow = false) {
    const k = d.s, z = d.z || 0;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.48);
    this.brocken(ctx, d.x, d.y, z, k * 0.44, k * 0.52, c1, c2, d.seed ?? 0.4);
    if (snow) this.isoEllipse(ctx, d.x, d.y, z + k * 0.53, k * 0.2, '#f4faff');
  }
  /* Kristall: drei Splitter als schlanke Kegel statt als Dreiecke. Ein Dreieck hat keine Seite,
     die sich beim Drehen zeigen könnte – ein Kegel schon, und weil er sechseckig gebaut ist, sieht
     man die Facetten. */
  spriteCrystal(ctx, x, y, z, size, c1, c2) {
    this.bodenSchatten(ctx, x, y, size * 0.4, 0.18);
    const splitter = [[0, 0, 1.25, 0.2], [-0.28, 0.12, 0.78, 0.14], [0.3, -0.1, 0.88, 0.13]];
    splitter.map(v => ({ v, tiefe: this.depth(x + v[0] * size, y + v[1] * size) }))
      .sort((a, b) => a.tiefe - b.tiefe)
      .forEach(({ v: [ox, oy, h, w] }) =>
        this.frustum(ctx, this.circlePoly(x + ox * size, y + oy * size, w * size, 6),
                     this.circlePoly(x + ox * size, y + oy * size, w * size * 0.18, 6),
                     z, z + h * size, c1, c2));
  }
  /* Turm: achteckiger Schaft mit Kegeldach oder Zwiebelkuppel. Vorher zwei Rechtecke nebeneinander,
     die beim Drehen stehenblieben – jetzt ein Körper, dessen Seiten das Licht verschieden nehmen. */
  spriteTower(ctx, d) {
    const k = d.s, z = d.z || 0, r = k * 0.55, h = k * 1.7;
    this.bodenSchatten(ctx, d.x, d.y, r * 1.1);
    const acht = (rr) => this.circlePoly(d.x, d.y, rr, 8, 0.4);
    if (d.dome) {
      this.frustum(ctx, acht(r), acht(r * 0.95), z, z + h, '#e8d3a8', '#b8894a');
      this.frustum(ctx, acht(r * 1.1), acht(r * 1.2), z + h, z + h + k * 0.4, d.dome, shade(d.dome, 0.7));
      this.frustum(ctx, acht(r * 1.2), acht(r * 0.1), z + h + k * 0.4, z + h + k * 1.15, d.dome, shade(d.dome, 0.7));
      this.saeule(ctx, d.x, d.y, z + h + k * 1.1, k * 0.03, k * 0.03, k * 0.35, '#ffd166', '#c9a15a', 6);
      this.kugel(ctx, d.x, d.y, z + h + k * 1.5, k * 0.08, '#fff0b8', '#ffd166', '#c9a15a');
    } else {
      this.frustum(ctx, acht(r), acht(r * 0.92), z, z + h, '#cfcad8', '#8e889c');
      this.kegel(ctx, d.x, d.y, z + h, r * 1.2, k * 1.1, d.roof || '#c94a5a', shade(d.roof || '#c94a5a', 0.72), 8);
      if (d.witch) this.kugel(ctx, d.x, d.y, z + h + k * 1.25, k * 0.14, '#e0ffc8', '#a6ff5e', '#5a9a2a');
      const [fx, fy] = this.proj(d.x, d.y, z + h + k * 1.5), sc = this.scale * k;
      ctx.fillStyle = '#ff4f6d'; ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx + sc * 0.3, fy + sc * 0.1); ctx.lineTo(fx, fy + sc * 0.22); ctx.fill();
    }
    // Fenster auf der Seite, die zur Kamera zeigt
    const [wx, wy] = this.proj(d.x - this.cam.sin * r * 0.9, d.y - this.cam.cos * r * 0.9, z + h * 0.5), sc = this.scale * k;
    ctx.fillStyle = d.dome ? '#2a4a6a' : '#ffd166';
    ctx.fillRect(wx - sc * 0.14, wy - sc * 0.2, sc * 0.28, sc * 0.4);
  }
  spriteCloud(ctx, d, t) {
    const k = d.s, z = (d.z || 0) + k * 0.5 + Math.sin(t + d.x) * k * 0.08;
    const ballen = [[0, 0, 0, 0.62], [-0.55, 0.16, -0.06, 0.42], [0.5, -0.14, -0.04, 0.46],
                    [0.12, 0.5, -0.08, 0.36], [-0.14, -0.48, -0.06, 0.34]];
    ballen.map(b => ({ b, tiefe: this.depth(d.x + b[0] * k, d.y + b[1] * k) }))
      .sort((a, b) => a.tiefe - b.tiefe)
      .forEach(({ b }) => this.kugel(ctx, d.x + b[0] * k, d.y + b[1] * k, z + b[2] * k, b[3] * k,
                                     '#ffffff', 'rgba(250,252,255,0.95)', 'rgba(214,228,244,0.92)'));
  }
  /* Tropfstein: ein schiefer Kegel. Die Spitze sitzt versetzt über dem Fuß, sonst sähe er aus
     wie ein Partyhut. */
  spriteStalagmite(ctx, d) {
    const k = d.s, z = d.z || 0, kipp = ((d.seed ?? 0.5) - 0.5) * 0.3;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.34, 0.2);
    this.frustum(ctx, this.circlePoly(d.x, d.y, k * 0.3, 8),
                 this.circlePoly(d.x + kipp * k, d.y + kipp * k * 0.6, k * 0.05, 8),
                 z, z + k * 1.2, '#8c6e58', '#6a5040');
  }
  /* Knochen: ein Schädel auf dem Boden und ein Röhrenknochen daneben – beide als Körper, damit
     sie beim Drehen liegen bleiben statt sich mitzudrehen. */
  spriteBones(ctx, d) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 6;
    this.kugel(ctx, d.x, d.y, z + k * 0.16, k * 0.17, '#fffaf0', '#efe8d8', '#b8ae98');
    for (const vz of [-1, 1]) {
      const [ex, ey] = this.proj(d.x + Math.cos(a + 1.6) * k * 0.06 * vz - Math.sin(a) * 0.0, d.y + Math.sin(a + 1.6) * k * 0.06 * vz, z + k * 0.2);
      ctx.fillStyle = '#2a1a10'; ctx.beginPath(); ctx.arc(ex, ey, this.scale * k * 0.04, 0, TAU); ctx.fill();
    }
    const bx = d.x + Math.cos(a) * k * 0.42, by = d.y + Math.sin(a) * k * 0.42;
    this.walze(ctx, bx, by, bx + Math.cos(a + 0.4) * k * 0.4, by + Math.sin(a + 0.4) * k * 0.4, z + k * 0.05, k * 0.05, '#efe8d8', '#cfc6b0', { n: 7 });
  }
  /* Amboss: Fuß, Block und Bahn als Quader, dazu das Horn als Kegelstumpf. */
  spriteAnvil(ctx, d) {
    const k = d.s, z = d.z || 0, a = (d.seed || 0) * 3;
    const kasten = (cx, cy, w, h, wink) => {
      const co = Math.cos(wink), si = Math.sin(wink);
      return [[-w, -h], [w, -h], [w, h], [-w, h]].map(([u, v]) => [cx + u * co - v * si, cy + u * si + v * co]);
    };
    this.bodenSchatten(ctx, d.x, d.y, k * 0.45);
    this.prism(ctx, kasten(d.x, d.y, k * 0.22, k * 0.16, a), z, k * 0.34, '#3a3a44', '#2a2a30');
    this.prism(ctx, kasten(d.x, d.y, k * 0.16, k * 0.12, a), z + k * 0.34, k * 0.2, '#4a4a55', '#33333c');
    this.prism(ctx, kasten(d.x, d.y, k * 0.4, k * 0.16, a), z + k * 0.54, k * 0.12, '#7b7b88', '#55555f');
    this.frustum(ctx, this.circlePoly(d.x + Math.cos(a) * k * 0.4, d.y + Math.sin(a) * k * 0.4, k * 0.1, 7),
                 this.circlePoly(d.x + Math.cos(a) * k * 0.62, d.y + Math.sin(a) * k * 0.62, k * 0.04, 7),
                 z + k * 0.56, z + k * 0.62, '#7b7b88', '#55555f');
  }
  spritePipe(ctx, d, t) {
    const g = d.s || 1, x = d.x, y = d.y, s = this.scale * g;
    const K = (r, n) => this.circlePoly(x, y, r * g, n || 10);
    this.isoEllipse(ctx, x, y, 0.003, 0.34 * g, 'rgba(0,0,0,0.22)');
    this.frustum(ctx, K(0.3), K(0.22), 0, 0.1 * g, '#5a4020', '#33230f', { outline: '#1d1408' });      // Fuß
    this.prism(ctx, K(0.21), 0.1 * g, 1.0 * g, '#c99a4a', '#8a6a34', { outline: '#3a2a12' });            // Schaft
    for (const h of [0.34, 0.82]) {                                                                      // Flansche
      this.prism(ctx, K(0.27, 12), h * g, 0.08 * g, '#e0b45c', '#6b4a1e', { outline: '#2a1d0a' });
      for (let i = 0; i < 6; i++) {                                                                     // Nieten darauf
        const a = (i * TAU) / 6 + 0.3;
        const p = this.proj(x + Math.cos(a) * 0.23 * g, y + Math.sin(a) * 0.23 * g, (h + 0.08) * g);
        ctx.fillStyle = '#7d5a20'; ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(0.8, s * 0.022), 0, TAU); ctx.fill();
      }
    }
    // Bogen oben: ein kurzes liegendes Stück, das zur Seite zeigt
    this.walze(ctx, x, y, x + 0.44 * g, y, 1.06 * g, 0.16 * g, '#c99a4a', '#8a6a34', { n: 8, outline: '#3a2a12' });
    this.prism(ctx, K(0.24, 12), 0.92 * g, 0.1 * g, '#e0b45c', '#6b4a1e');
    // Handrad: eine kleine stehende Scheibe mit Speichen, im Bildschirmraum (senkrechte Scheiben
    // legt die Projektion immer schief, siehe Renderer.zahnradScheibe)
    const [vx, vy] = this.proj(x - 0.3 * g, y, 0.58 * g);
    ctx.fillStyle = '#7d2418'; ctx.beginPath(); ctx.arc(vx, vy, s * 0.13, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c0392b'; ctx.beginPath(); ctx.arc(vx - s * 0.015, vy - s * 0.015, s * 0.1, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a1a10'; ctx.beginPath(); ctx.arc(vx, vy, s * 0.035, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7d2418'; ctx.lineWidth = Math.max(1, s * 0.03);
    for (let i = 0; i < 3; i++) {
      const a = i * (Math.PI / 3) + t * 0.2;
      ctx.beginPath(); ctx.moveTo(vx - Math.cos(a) * s * 0.1, vy - Math.sin(a) * s * 0.1);
      ctx.lineTo(vx + Math.cos(a) * s * 0.1, vy + Math.sin(a) * s * 0.1); ctx.stroke();
    }
    for (let i = 0; i < 3; i++) {                                                                       // Dampf
      const u = ((t * 0.5 + i * 0.33 + (d.seed || 0)) % 1);
      const p = this.proj(x + 0.44 * g + Math.sin(u * 6 + i) * 0.12 * g, y, (1.2 + u * 0.8) * g);
      ctx.fillStyle = `rgba(240,244,250,${(0.32 * (1 - u)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(p[0], p[1], s * (0.1 + u * 0.22), 0, TAU); ctx.fill();
    }
  }

  /* Fass: drei Ringe übereinander geben den Bauch, zwei dunkle Reifen halten ihn zusammen, und
     obendrauf liegt der Deckel mit seinen Dauben. */
  spriteBarrel(ctx, d) {
    const g = d.s || 1, x = d.x, y = d.y, s = this.scale * g;
    const K = r => this.circlePoly(x, y, r * g, 12);
    const H = 0.62 * g, holz = ['#a87f52', '#6b4526'], eisen = ['#4a4a54', '#2a2a32'];
    this.isoEllipse(ctx, x, y, 0.003, 0.34 * g, 'rgba(0,0,0,0.22)');
    this.frustum(ctx, K(0.24), K(0.31), 0, H * 0.34, holz[0], holz[1], { outline: '#3a2410' });
    this.frustum(ctx, K(0.31), K(0.31), H * 0.34, H * 0.66, holz[0], holz[1], { outline: '#3a2410' });
    this.frustum(ctx, K(0.31), K(0.24), H * 0.66, H, holz[0], holz[1], { outline: '#3a2410' });
    for (const h of [0.26, 0.74]) this.prism(ctx, K(0.325), H * h, 0.06 * g, eisen[0], eisen[1]);
    this.prism(ctx, K(0.245), H, 0.03 * g, '#c19a68', '#6b4526', { outline: '#3a2410' });
    // Dauben auf dem Deckel
    ctx.strokeStyle = 'rgba(60,36,16,0.5)'; ctx.lineWidth = Math.max(1, s * 0.025);
    for (let i = -1; i <= 1; i++) {
      const a = this.proj(x + i * 0.11 * g, y - 0.22 * g, H + 0.03 * g), b = this.proj(x + i * 0.11 * g, y + 0.22 * g, H + 0.03 * g);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
  }

  /* Kiste: ein Kasten mit Latten an den Seiten, einer diagonalen Strebe auf dem Deckel und einer
     kleineren Kiste schräg obendrauf – zwei Körper stehen lebendiger als einer. */
  spriteCrate(ctx, d) {
    const g = d.s || 1, x = d.x, y = d.y, s = this.scale * g;
    const box = (cx, cy, w, z0, h, dreh) => {
      const c = Math.cos(dreh), si = Math.sin(dreh), q = w / 2;
      const p = [[-q, -q], [q, -q], [q, q], [-q, q]].map(([a, b]) => [cx + a * c - b * si, cy + a * si + b * c]);
      this.prism(ctx, p, z0, h, '#b48a5a', '#7a5734', { outline: '#43301a' });
      return p;
    };
    this.isoEllipse(ctx, x, y, 0.003, 0.38 * g, 'rgba(0,0,0,0.22)');
    const unten = box(x, y, 0.62 * g, 0, 0.52 * g, 0.18);
    // Latten auf dem Deckel: zwei quer, eine diagonal
    ctx.strokeStyle = '#7a5734'; ctx.lineWidth = Math.max(1.2, s * 0.05);
    const kante = (i, j, u0, u1) => {
      const a = unten[i], b = unten[j];
      const p0 = this.proj(a[0] + (b[0] - a[0]) * u0, a[1] + (b[1] - a[1]) * u0, 0.52 * g + 0.004);
      const p1 = this.proj(a[0] + (b[0] - a[0]) * u1, a[1] + (b[1] - a[1]) * u1, 0.52 * g + 0.004);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    };
    kante(0, 2, 0, 1); kante(0, 1, 0.5, 0.5); kante(1, 2, 0.5, 0.5);
    box(x + 0.14 * g, y + 0.1 * g, 0.4 * g, 0.52 * g, 0.34 * g, -0.45);
  }

  /* Laterne: Pfosten mit Fuß, darauf der Käfig aus zwei Kegelstümpfen, dazwischen das Licht.
     Das Leuchten selbst bleibt flach – Licht hat keine Seiten, die man schattieren könnte. */
  spriteLantern(ctx, d, t) {
    const g = d.s || 1, x = d.x, y = d.y, s = this.scale * g;
    const K = (r, n) => this.circlePoly(x, y, r * g, n || 8);
    const gl = 0.8 + 0.2 * Math.sin(t * 5 + x * 3);
    this.isoEllipse(ctx, x, y, 0.003, 0.3 * g, 'rgba(0,0,0,0.22)');
    this.frustum(ctx, K(0.26), K(0.14), 0, 0.12 * g, '#4a3a26', '#2a2016', { outline: '#181008' });   // Fuß
    this.prism(ctx, K(0.07), 0.12 * g, 0.95 * g, '#5a452c', '#33260f', { outline: '#181008' });        // Pfosten
    this.frustum(ctx, K(0.1), K(0.2), 1.07 * g, 1.18 * g, '#6b5334', '#33260f', { outline: '#181008' }); // Träger
    // Käfig: unten ein kleiner Kranz, oben das Dach
    this.prism(ctx, K(0.2, 6), 1.18 * g, 0.05 * g, '#7a613c', '#3a2c18');
    this.frustum(ctx, K(0.2, 6), K(0.24, 6), 1.5 * g, 1.62 * g, '#7a613c', '#3a2c18', { outline: '#181008' });
    this.frustum(ctx, K(0.24, 6), K(0.04, 6), 1.62 * g, 1.86 * g, '#8a6f46', '#3a2c18', { outline: '#181008' });
    // Streben des Käfigs
    ctx.strokeStyle = '#3a2c18'; ctx.lineWidth = Math.max(1, s * 0.035);
    for (let i = 0; i < 4; i++) {
      const a = (i * TAU) / 4 + 0.4;
      const p0 = this.proj(x + Math.cos(a) * 0.18 * g, y + Math.sin(a) * 0.18 * g, 1.23 * g);
      const p1 = this.proj(x + Math.cos(a) * 0.18 * g, y + Math.sin(a) * 0.18 * g, 1.5 * g);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    }
    // Licht
    const [lx, ly] = this.proj(x, y, 1.36 * g);
    const gr = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 0.95);
    gr.addColorStop(0, `rgba(255,214,120,${(0.45 * gl).toFixed(3)})`); gr.addColorStop(1, 'rgba(255,190,80,0)');
    ctx.fillStyle = gr; ctx.beginPath(); ctx.arc(lx, ly, s * 0.95, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(lx, ly, s * 0.13 * gl, 0, TAU); ctx.fill();
  }
  spriteBrazier(ctx, d, t, cols) {
    const c = cols || ['#ff7a1f', '#ffe07a', '255,140,40'];
    const g = d.s || 1, x = d.x, y = d.y, s = this.scale * g;
    const K = r => this.circlePoly(x, y, r * g, 8);
    this.isoEllipse(ctx, x, y, 0.003, 0.3 * g, 'rgba(0,0,0,0.22)');
    this.frustum(ctx, K(0.15), K(0.07), 0, 0.46 * g, '#4a4a56', '#2a2a34', { outline: '#16161c' });   // Fuß
    this.frustum(ctx, K(0.09), K(0.28), 0.46 * g, 0.62 * g, '#3a3a44', '#22222a', { outline: '#16161c' }); // Schale
    // Flamme: im Bildschirmraum, denn Feuer hat keine Seiten, die man schattieren könnte
    const [fx, fy] = this.proj(x, y, 0.62 * g);
    const f = 0.8 + 0.2 * Math.sin(t * 11 + x * 3);
    ctx.fillStyle = `rgba(${c[2]},0.25)`; ctx.beginPath(); ctx.arc(fx, fy - s * 0.2, s * 0.5 * f, 0, TAU); ctx.fill();
    ctx.fillStyle = c[0]; ctx.beginPath(); ctx.moveTo(fx - s * 0.2, fy);
    ctx.quadraticCurveTo(fx - s * 0.1, fy - s * 0.4 * f, fx, fy - s * 0.55 * f);
    ctx.quadraticCurveTo(fx + s * 0.1, fy - s * 0.35 * f, fx + s * 0.2, fy); ctx.closePath(); ctx.fill();
    ctx.fillStyle = c[1]; ctx.beginPath(); ctx.moveTo(fx - s * 0.1, fy);
    ctx.quadraticCurveTo(fx, fy - s * 0.25 * f, fx + s * 0.1, fy); ctx.closePath(); ctx.fill();
  }
  /* Goldhaufen: ein flacher Brocken in Gold, darauf ein paar Münzen als liegende Scheiben. */
  spriteGold(ctx, d, t) {
    const k = d.s, z = d.z || 0, seed = d.seed || 0;
    this.brocken(ctx, d.x, d.y, z, k * 0.42, k * 0.26, '#ffd75e', '#c98a1a', seed);
    for (let i = 0; i < 4; i++) {
      const a = seed * 6 + i * 1.6, rr = k * 0.28 * ((i % 2) ? 0.5 : 0.9);
      this.isoEllipse(ctx, d.x + Math.cos(a) * rr, d.y + Math.sin(a) * rr, z + k * 0.27, k * 0.09, '#ffe89a');
    }
    const sp = (t * 2) % 1;
    const [gx, gy] = this.proj(d.x + k * 0.15, d.y, z + k * 0.32);
    ctx.fillStyle = `rgba(255,255,255,${1 - sp})`; ctx.beginPath(); ctx.arc(gx, gy, this.scale * k * (0.05 + sp * 0.04), 0, TAU); ctx.fill();
  }
  /* Kürbis: zwei Kegelstümpfe Rücken an Rücken ergeben den Bauch, dazu Rippen und Stiel. Das
     leuchtende Gesicht bleibt zur Kamera gedreht – es ist Licht, keine Fläche. */
  spritePumpkin(ctx, d, t) {
    const k = d.s, z = d.z || 0;
    this.bodenSchatten(ctx, d.x, d.y, k * 0.4);
    const unten = this.circlePoly(d.x, d.y, k * 0.2, 10), mitte = this.circlePoly(d.x, d.y, k * 0.42, 10), oben = this.circlePoly(d.x, d.y, k * 0.22, 10);
    this.frustum(ctx, unten, mitte, z, z + k * 0.26, '#f08a2a', '#c05a0a');
    this.frustum(ctx, mitte, oben, z + k * 0.26, z + k * 0.5, '#e8701a', '#c05a0a');
    this.saeule(ctx, d.x, d.y, z + k * 0.5, k * 0.05, k * 0.04, k * 0.16, '#4f8a36', '#3a6a2a', 6);
    const gl = 0.6 + 0.4 * Math.abs(Math.sin(t * 3 + d.x));
    const [fx, fy] = this.proj(d.x, d.y, z + k * 0.3), r = this.scale * k;
    ctx.fillStyle = `rgba(255,230,120,${gl})`;
    for (const vz of [-1, 1]) { ctx.beginPath(); ctx.moveTo(fx + vz * r * 0.2, fy - r * 0.06); ctx.lineTo(fx + vz * r * 0.08, fy + r * 0.02); ctx.lineTo(fx + vz * r * 0.22, fy + r * 0.06); ctx.fill(); }
    ctx.beginPath(); ctx.moveTo(fx - r * 0.18, fy + r * 0.14); ctx.lineTo(fx, fy + r * 0.22); ctx.lineTo(fx + r * 0.18, fy + r * 0.14); ctx.lineTo(fx, fy + r * 0.1); ctx.fill();
  }
  spriteCauldron(ctx, d, s, t) {
    const body = this.circlePoly(d.x, d.y, 0.45 * d.s, 10);
    this.prism(ctx, body, 0, 0.6 * d.s, '#3b3b45', '#1a1a20');
    this.isoEllipse(ctx, d.x, d.y, 0.62 * d.s, 0.36 * d.s, '#7dff4a');
    const [bx, by] = this.proj(d.x, d.y, 0.7 * d.s + ((t * 0.7) % 1) * 0.5);
    ctx.fillStyle = 'rgba(160,255,120,0.6)'; ctx.beginPath(); ctx.arc(bx, by, s * 0.08, 0, TAU); ctx.fill();
  }
}
