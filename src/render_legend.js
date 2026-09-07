/* Zeichnung der Stufe „Legende“: Hintergründe (Sturmhimmel, Sturmfestung, Schattenreich, Thronsaal),
   neue Hindernisse (Blitz, Aufwind, Falltür, Schattenzone) und neue Stile (Ballon, Luftschiff, Geist,
   Fledermaus, Gewitterwolke, Propeller, Sense, Blitzkugel, Grabstein, Schattenauge, Seelenlicht, Steintore) */
Object.assign(Renderer.prototype, {
  hashL(i, k) { return Math.abs(Math.sin(i * 127.1 + k * 311.7) * 43758.5453) % 1; },

  /* ---------- Hintergründe ---------- */
  drawStorm(ctx, t) {
    const w = this.w, h = this.h, hash = this.hashL;
    // Wolkenmeer unter den Inseln: drei graue Schichten
    const layers = [['#15182e', 0.55, 16], ['#1f2340', 0.62, 13], ['#2b3052', 0.7, 11]];
    layers.forEach(([col, base, n], li) => {
      ctx.fillStyle = col; ctx.beginPath();
      for (let i = 0; i <= n; i++) { const x = ((i / n) * (w + 200) + t * (4 + li * 3)) % (w + 200) - 100, r = w * (0.06 + hash(i, li) * 0.06), y = h * base - r * 0.3; ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU); }
      ctx.rect(0, h * base, w, h); ctx.fill();
    });
    // Regen: schräge Striche
    ctx.strokeStyle = 'rgba(190,205,255,0.28)'; ctx.lineWidth = 1;
    for (let i = 0; i < 60; i++) {
      const x = (hash(i, 7) * w + t * 60) % (w + 80) - 40, y = (hash(i, 8) * h + t * 420 * (0.7 + hash(i, 9) * 0.6)) % (h + 60) - 30;
      ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 6, y + 18); ctx.stroke();
    }
    // Blitz am Horizont: alle paar Sekunden ein kurzer Aufhellungsschlag mit Zickzack
    const cyc = Math.floor(t / 4.7), ph = t - cyc * 4.7;
    if (ph < 0.22 && hash(cyc, 3) > 0.35) {
      const a = (0.22 - ph) / 0.22;
      ctx.fillStyle = `rgba(220,230,255,${0.16 * a})`; ctx.fillRect(0, 0, w, h);
      const x0 = w * (0.15 + hash(cyc, 4) * 0.7); ctx.strokeStyle = `rgba(255,255,220,${0.9 * a})`; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(x0, 0);
      let x = x0, y = 0; for (let k = 0; k < 7; k++) { x += (hash(cyc, 10 + k) - 0.5) * 60; y += h * 0.07; ctx.lineTo(x, y); }
      ctx.stroke();
    }
  },
  drawFortress(ctx, t) {
    const w = this.w, h = this.h, hash = this.hashL;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#0b0d1e'); g.addColorStop(0.55, '#2a2d4a'); g.addColorStop(1, '#14162a'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    const bh = Math.max(36, h * 0.065), bw = bh * 2.2; ctx.lineWidth = 1.5;
    for (let r = 0; r < h / bh + 1; r++) for (let c = -1; c < w / bw + 1; c++) { const x = c * bw + (r % 2 ? bw / 2 : 0), y = r * bh; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.strokeRect(x, y, bw, bh); }
    // Bogenfenster mit Blitzschein
    const cyc = Math.floor(t / 3.9), flash = (t - cyc * 3.9) < 0.18 && hash(cyc, 2) > 0.4;
    for (const fx of [0.18, 0.5, 0.82]) {
      const x = fx * w, y = h * 0.2, rw = w * 0.05, rh = h * 0.22;
      ctx.fillStyle = flash ? '#e8f0ff' : '#1a2350'; ctx.beginPath(); ctx.moveTo(x - rw, y + rh); ctx.lineTo(x - rw, y); ctx.arc(x, y, rw, Math.PI, 0); ctx.lineTo(x + rw, y + rh); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#0a0c18'; ctx.lineWidth = 3; ctx.stroke();
      if (!flash) { ctx.fillStyle = 'rgba(120,170,255,0.25)'; ctx.beginPath(); ctx.arc(x, y + rh * 0.3, rw * 0.4, 0, TAU); ctx.fill(); }
      ctx.fillStyle = '#5a2a7a'; ctx.fillRect(x - rw * 1.9, y - rh * 0.3, rw * 0.6, rh * 0.9); ctx.beginPath(); ctx.moveTo(x - rw * 1.9, y + rh * 0.6); ctx.lineTo(x - rw * 1.6, y + rh * 0.8); ctx.lineTo(x - rw * 1.3, y + rh * 0.6); ctx.fill(); // Banner
      ctx.fillStyle = '#ffe45e'; ctx.beginPath(); ctx.arc(x - rw * 1.6, y + rh * 0.1, rw * 0.15, 0, TAU); ctx.fill();
    }
    for (const [fx, fy, ph] of [[0.08, 0.5, 0], [0.92, 0.5, 2]]) { const gl = 0.8 + 0.2 * Math.sin(t * 6 + ph); const rg = ctx.createRadialGradient(fx * w, fy * h, 0, fx * w, fy * h, w * 0.25); rg.addColorStop(0, `rgba(90,170,255,${0.2 * gl})`); rg.addColorStop(1, 'rgba(90,170,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h); }
  },
  drawShadow(ctx, t) {
    const w = this.w, h = this.h, hash = this.hashL;
    // blutroter Mond mit Hof
    const mx = w * 0.72, my = h * 0.16, mr = Math.min(w, h) * 0.09;
    const halo = ctx.createRadialGradient(mx, my, mr * 0.8, mx, my, mr * 3); halo.addColorStop(0, 'rgba(180,40,60,0.35)'); halo.addColorStop(1, 'rgba(180,40,60,0)'); ctx.fillStyle = halo; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#b8323c'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(mx + (hash(i, 1) - 0.5) * mr * 1.2, my + (hash(i, 2) - 0.5) * mr * 1.2, mr * (0.08 + hash(i, 3) * 0.14), 0, TAU); ctx.fill(); }
    // Hügel mit Grabsteinen und toten Bäumen als Silhouetten
    const layers = [['#0e0a18', 0.5], ['#160f26', 0.58]];
    layers.forEach(([col, base], li) => {
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, h);
      for (let i = 0; i <= 12; i++) { const x = (i / 12) * w, y = h * base + Math.sin(i * 1.3 + li) * h * 0.03; ctx.lineTo(x, y); }
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      for (let i = 0; i < 9; i++) { const x = (hash(i, 20 + li) * w), y = h * base + Math.sin((x / w) * 12 * 1.3 + li) * h * 0.03, sz = h * (0.02 + hash(i, 30 + li) * 0.02);
        if (hash(i, 40 + li) > 0.5) { ctx.fillRect(x - sz * 0.35, y - sz, sz * 0.7, sz); ctx.beginPath(); ctx.arc(x, y - sz, sz * 0.35, Math.PI, 0); ctx.fill(); }
        else { ctx.strokeStyle = col; ctx.lineWidth = sz * 0.15; ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - sz * 2.2); ctx.moveTo(x, y - sz * 1.3); ctx.lineTo(x - sz * 0.8, y - sz * 2); ctx.moveTo(x, y - sz * 1.7); ctx.lineTo(x + sz * 0.7, y - sz * 2.4); ctx.stroke(); } }
    });
    // Irrlichter
    for (let i = 0; i < 6; i++) { const x = (hash(i, 50) * w + Math.sin(t * 0.5 + i) * 40) % w, y = h * (0.3 + hash(i, 51) * 0.3) + Math.cos(t * 0.7 + i * 2) * 15, a = 0.3 + 0.4 * Math.abs(Math.sin(t * 1.3 + i)); const rg = ctx.createRadialGradient(x, y, 0, x, y, 14); rg.addColorStop(0, `rgba(180,120,255,${a})`); rg.addColorStop(1, 'rgba(180,120,255,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(x, y, 14, 0, TAU); ctx.fill(); }
  },
  drawThrone(ctx, t) {
    const w = this.w, h = this.h;
    const g = ctx.createLinearGradient(0, 0, 0, h); g.addColorStop(0, '#05030a'); g.addColorStop(0.5, '#1c1330'); g.addColorStop(1, '#0a0614'); ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    for (let i = 0; i < 7; i++) { // Säulen
      const x = w * (0.06 + i * 0.147), cw = w * 0.028;
      const cg = ctx.createLinearGradient(x - cw, 0, x + cw, 0); cg.addColorStop(0, '#1a1428'); cg.addColorStop(0.5, '#3a3050'); cg.addColorStop(1, '#141020'); ctx.fillStyle = cg; ctx.fillRect(x - cw, 0, cw * 2, h * 0.7);
      ctx.fillStyle = '#2a2240'; ctx.fillRect(x - cw * 1.4, h * 0.62, cw * 2.8, h * 0.05);
    }
    // der Thron in der Mitte
    const tx = w * 0.5, ty = h * 0.58, tw = w * 0.07, th2 = h * 0.28;
    ctx.fillStyle = '#0b0712'; ctx.beginPath(); ctx.moveTo(tx - tw, ty); ctx.lineTo(tx - tw, ty - th2 * 0.6); ctx.lineTo(tx - tw * 0.6, ty - th2); ctx.lineTo(tx, ty - th2 * 0.8); ctx.lineTo(tx + tw * 0.6, ty - th2); ctx.lineTo(tx + tw, ty - th2 * 0.6); ctx.lineTo(tx + tw, ty); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6a4aa0'; ctx.lineWidth = 2; ctx.stroke();
    ctx.fillStyle = `rgba(197,139,255,${0.6 + 0.3 * Math.sin(t * 2)})`; ctx.beginPath(); ctx.arc(tx, ty - th2 * 0.55, tw * 0.18, 0, TAU); ctx.fill(); // Schattenkrone
    for (const [fx, ph] of [[0.2, 0], [0.8, 2], [0.5, 4]]) { const gl = 0.8 + 0.2 * Math.sin(t * 7 + ph) * Math.sin(t * 3.1 + ph); const rg = ctx.createRadialGradient(fx * w, h * 0.35, 0, fx * w, h * 0.35, w * 0.22); rg.addColorStop(0, `rgba(170,90,255,${0.2 * gl})`); rg.addColorStop(1, 'rgba(170,90,255,0)'); ctx.fillStyle = rg; ctx.fillRect(0, 0, w, h); }
  },

  /* ---------- Bodenhindernisse ---------- */
  drawLightningFloor(ctx, ob, t) {
    const s = this.scale, poly = [[ob.x - ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y + ob.h / 2], [ob.x - ob.w / 2, ob.y + ob.h / 2]];
    // verbrannte Platte mit Metallnägeln (Blitzableiter-Feld)
    this.fillPoly(ctx, poly, 0.004, 'rgba(30,30,40,0.35)', false);
    ctx.strokeStyle = 'rgba(255,228,94,0.45)'; ctx.lineWidth = Math.max(1, s * 0.04); this.pathPoly(ctx, poly, 0.005); ctx.stroke();
    if (ob.state === 'warn') { // Knistern: pulsierender gelber Ring, Funken am Boden
      const a = 0.15 + 0.45 * ob.p * (0.6 + 0.4 * Math.sin(t * 30));
      this.fillPoly(ctx, poly, 0.006, `rgba(255,228,94,${a})`, false);
      ctx.strokeStyle = `rgba(255,255,200,${0.4 + 0.6 * ob.p})`; ctx.lineWidth = Math.max(1, s * 0.05);
      for (let i = 0; i < 5; i++) { const px = ob.x + (this.hashL(i, Math.floor(t * 20)) - 0.5) * ob.w, py = ob.y + (this.hashL(i, Math.floor(t * 20) + 9) - 0.5) * ob.h; const [a0, a1] = this.proj(px, py, 0.01), [b0, b1] = this.proj(px + 0.2, py - 0.1, 0.25); ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke(); }
    } else if (ob.state === 'strike') {
      this.fillPoly(ctx, poly, 0.006, `rgba(255,255,230,${0.9 - 0.6 * ob.p})`, false);
    }
  },
  drawLightningBolt(ctx, ob, t) {
    if (ob.state !== 'strike') return;
    const s = this.scale, k = Math.floor(t * 40);
    const [gx, gy] = this.proj(ob.x, ob.y, 0), [tx, ty] = this.proj(ob.x, ob.y, 9);
    ctx.lineCap = 'round';
    for (const [lw, col] of [[Math.max(4, s * 0.22), 'rgba(255,240,150,0.45)'], [Math.max(2, s * 0.08), '#ffffff']]) {
      ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); ctx.moveTo(tx, ty);
      let x = tx, y = ty; for (let i = 1; i <= 6; i++) { const u = i / 6; x = tx + (gx - tx) * u + (this.hashL(i, k) - 0.5) * s * 1.2 * (1 - u * 0.7); y = ty + (gy - ty) * u; ctx.lineTo(x, y); }
      ctx.lineTo(gx, gy); ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,255,255,${0.8 - 0.7 * ob.p})`; ctx.beginPath(); ctx.arc(gx, gy, s * (0.5 + ob.p * 0.6), 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,255,255,${0.14 * (1 - ob.p)})`; ctx.fillRect(0, 0, this.w, this.h); // kurzer Bildblitz
  },
  drawUpdraft(ctx, ob, t) {
    const s = this.scale, poly = [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h]];
    this.fillPoly(ctx, poly, 0.004, 'rgba(160,220,255,0.2)', false);
    ctx.strokeStyle = 'rgba(200,240,255,0.7)'; ctx.lineWidth = Math.max(1.5, s * 0.05); this.pathPoly(ctx, poly, 0.005); ctx.stroke();
    // aufsteigende Federn/Wirbel
    for (let i = 0; i < 8; i++) {
      const life = (t * 0.6 + this.hashL(i, 1)) % 1, px = ob.x + 0.2 + this.hashL(i, 2) * (ob.w - 0.4) + Math.sin(t * 3 + i) * 0.15, py = ob.y + 0.2 + this.hashL(i, 3) * (ob.h - 0.4);
      const [ax, ay] = this.proj(px, py, life * 2.2);
      ctx.globalAlpha = 1 - life; ctx.strokeStyle = '#e6f6ff'; ctx.lineWidth = Math.max(1.5, s * 0.06);
      ctx.beginPath(); ctx.moveTo(ax - s * 0.12, ay + s * 0.12); ctx.lineTo(ax, ay - s * 0.1); ctx.lineTo(ax + s * 0.12, ay + s * 0.12); ctx.stroke();
    }
    ctx.globalAlpha = 1;
  },
  drawTrapdoor(ctx, ob, t) {
    const s = this.scale, hw = ob.w / 2, hh = ob.h / 2, g = ob.gap;
    // Schacht darunter (immer sichtbar, sobald die Klappe aufgeht)
    if (g > 0.02) {
      const pit = [[ob.x - hw, ob.y - hh], [ob.x + hw, ob.y - hh], [ob.x + hw, ob.y + hh], [ob.x - hw, ob.y + hh]];
      this.fillPoly(ctx, pit, 0.004, '#05030a', false);
      const [cx, cy] = this.proj(ob.x, ob.y, 0.005); const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * hw); rg.addColorStop(0, `rgba(140,60,255,${0.35 * g})`); rg.addColorStop(1, 'rgba(140,60,255,0)'); ctx.fillStyle = rg; this.pathPoly(ctx, pit, 0.006); ctx.fill();
    }
    // zwei Klappenhälften, die zur Seite wegschwenken (verkürzt gezeichnet)
    const open = g * (hw - 0.05);
    for (const side of [-1, 1]) {
      const inner = ob.x + side * open, outer = ob.x + side * hw;
      const half = [[Math.min(inner, outer), ob.y - hh], [Math.max(inner, outer), ob.y - hh], [Math.max(inner, outer), ob.y + hh], [Math.min(inner, outer), ob.y + hh]];
      if (Math.abs(outer - inner) < 0.03) continue;
      this.fillPoly(ctx, half, 0.007, '#3a3446', false);
      ctx.strokeStyle = '#191622'; ctx.lineWidth = Math.max(1, s * 0.04); this.pathPoly(ctx, half, 0.008); ctx.stroke();
      ctx.fillStyle = '#8a8298'; for (let k = 0; k < 3; k++) { const [nx, ny] = this.proj(outer - side * 0.12, ob.y - hh + (k + 0.5) * ob.h / 3, 0.01); ctx.beginPath(); ctx.arc(nx, ny, Math.max(1, s * 0.035), 0, TAU); ctx.fill(); } // Nieten
    }
    ctx.strokeStyle = 'rgba(197,139,255,0.5)'; ctx.lineWidth = Math.max(1, s * 0.04); const frame = [[ob.x - hw, ob.y - hh], [ob.x + hw, ob.y - hh], [ob.x + hw, ob.y + hh], [ob.x - hw, ob.y + hh]]; this.pathPoly(ctx, frame, 0.009); ctx.stroke();
  },
  drawDarkZone(ctx, ob, t) {
    const s = this.scale, poly = [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h]];
    this.fillPoly(ctx, poly, 0.004, 'rgba(5,3,12,0.82)', false);
    ctx.strokeStyle = 'rgba(120,70,200,0.35)'; ctx.lineWidth = Math.max(1, s * 0.04); this.pathPoly(ctx, poly, 0.005); ctx.stroke();
    for (let i = 0; i < 6; i++) { // wabernde Schattenschlieren
      const px = ob.x + 0.3 + ((this.hashL(i, 4) * (ob.w - 0.6) + t * 0.3 * (1 + i * 0.2)) % (ob.w - 0.6)), py = ob.y + 0.3 + this.hashL(i, 5) * (ob.h - 0.6);
      const [ax, ay] = this.proj(px, py, 0.02); const rg = ctx.createRadialGradient(ax, ay, 0, ax, ay, s * 0.6); rg.addColorStop(0, 'rgba(60,20,110,0.5)'); rg.addColorStop(1, 'rgba(60,20,110,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(ax, ay, s * 0.6, s * 0.3, 0, 0, TAU); ctx.fill();
    }
  },

  /* ---------- Fähren und Mover ---------- */
  drawBalloon(ctx, ob, t) {
    const s = this.scale, bob = 0.06 * Math.sin(t * 1.4 + ob.x), L = ob.w * 0.5, Wd = ob.h * 0.5;
    const basket = [[ob.x - L, ob.y - Wd], [ob.x + L, ob.y - Wd], [ob.x + L, ob.y + Wd], [ob.x - L, ob.y + Wd]];
    this.prism(ctx, basket, bob, 0.55, '#b58a4a', '#6b4a22', { outline: '#3a2810' });
    ctx.strokeStyle = '#d9c39a'; ctx.lineWidth = Math.max(1, s * 0.035); // Seile
    const [bx, by] = this.proj(ob.x, ob.y, bob + 3.6);
    for (const [cx, cy] of basket) { const [px, py] = this.proj(cx, cy, bob + 0.55); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(bx, by + s * 0.6); ctx.stroke(); }
    const r = s * Math.max(ob.w, ob.h) * 0.75; // Ballonhülle mit Streifen
    const g = ctx.createRadialGradient(bx - r * 0.3, by - r * 0.3, r * 0.1, bx, by, r); g.addColorStop(0, '#ffd28a'); g.addColorStop(0.5, '#e05a5a'); g.addColorStop(1, '#7a1e2a');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(bx, by, r, r * 1.15, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,240,200,0.5)'; ctx.lineWidth = 1.5; for (const k of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.ellipse(bx + k * r, by, r * 0.28, r * 1.15, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = '#7a1e2a'; ctx.beginPath(); ctx.moveTo(bx - r * 0.25, by + r * 1.05); ctx.lineTo(bx + r * 0.25, by + r * 1.05); ctx.lineTo(bx, by + r * 1.35); ctx.closePath(); ctx.fill();
    if (ob.docked) { const [lx, ly] = this.proj(ob.x, ob.y, bob + 1.0); ctx.fillStyle = `rgba(120,255,120,${0.6 + 0.4 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.arc(lx, ly, s * 0.1, 0, TAU); ctx.fill(); }
  },
  drawAirship(ctx, ob, t) {
    const s = this.scale, d = ob.dir || 1, bob = 0.05 * Math.sin(t * 1.2 + ob.x), L = ob.w * 0.6, Wd = ob.h * 0.45;
    const hull = [[ob.x - L, ob.y - Wd * 0.6], [ob.x - L * 0.7, ob.y - Wd], [ob.x + L * 0.8, ob.y - Wd], [ob.x + L * 1.1, ob.y], [ob.x + L * 0.8, ob.y + Wd], [ob.x - L * 0.7, ob.y + Wd], [ob.x - L, ob.y + Wd * 0.6]];
    this.prism(ctx, hull, bob, 0.6, '#6b4a2a', '#3a2814', { outline: '#1e1408' });
    this.fillPoly(ctx, [[ob.x - L * 0.9, ob.y - Wd * 0.7], [ob.x + L * 0.9, ob.y - Wd * 0.7], [ob.x + L * 0.9, ob.y + Wd * 0.7], [ob.x - L * 0.9, ob.y + Wd * 0.7]], bob + 0.61, '#a87f52', false);
    ctx.strokeStyle = '#3a2814'; ctx.lineWidth = Math.max(1, s * 0.04); // Halteseile
    const [ex, ey] = this.proj(ob.x, ob.y, bob + 3.1);
    for (const k of [-0.7, 0.7]) { const [px, py] = this.proj(ob.x + k * L, ob.y, bob + 0.6), [qx, qy] = this.proj(ob.x + k * L * 0.9, ob.y, bob + 2.4); ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(qx, qy); ctx.stroke(); }
    const rx = s * L * 1.7, ry = s * Wd * 1.6; // Gashülle
    const g = ctx.createLinearGradient(ex, ey - ry, ex, ey + ry); g.addColorStop(0, '#d9d2c2'); g.addColorStop(0.6, '#9a8f7a'); g.addColorStop(1, '#5a5244');
    ctx.fillStyle = g; ctx.beginPath(); ctx.ellipse(ex, ey, rx, ry, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(40,30,20,0.5)'; ctx.lineWidth = 1.5; for (let k = -2; k <= 2; k++) { ctx.beginPath(); ctx.ellipse(ex + k * rx * 0.33, ey, rx * 0.12, ry, 0, 0, TAU); ctx.stroke(); }
    ctx.fillStyle = '#7a2e3a'; ctx.beginPath(); ctx.moveTo(ex - d * rx * 0.95, ey - ry * 0.1); ctx.lineTo(ex - d * rx * 1.3, ey - ry * 0.7); ctx.lineTo(ex - d * rx * 1.1, ey + ry * 0.1); ctx.closePath(); ctx.fill(); // Leitwerk
    const pa = t * 14; ctx.strokeStyle = '#2a2a30'; ctx.lineWidth = Math.max(1.5, s * 0.05); const [px, py] = this.proj(ob.x - d * L * 1.05, ob.y, bob + 0.5); // Heckpropeller
    for (let k = 0; k < 3; k++) { const a = pa + k * TAU / 3; ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(px + Math.cos(a) * s * 0.35, py + Math.sin(a) * s * 0.35 * 0.6); ctx.stroke(); }
    if (ob.docked) { const [lx, ly] = this.proj(ob.x - L * 0.8, ob.y, bob + 1.2); ctx.fillStyle = `rgba(120,255,120,${0.6 + 0.4 * Math.sin(t * 6)})`; ctx.beginPath(); ctx.arc(lx, ly, s * 0.12, 0, TAU); ctx.fill(); }
  },
  drawGhost(ctx, ob, t) {
    const s = this.scale, bob = 0.25 + 0.12 * Math.sin(t * 2.5 + ob.x), [bx, by] = this.proj(ob.x, ob.y, bob), r = s * Math.max(ob.w, ob.h) * 0.55;
    ctx.globalAlpha = 0.8;
    const g = ctx.createLinearGradient(bx, by - r * 1.6, bx, by + r * 0.4); g.addColorStop(0, '#f2f6ff'); g.addColorStop(1, 'rgba(160,190,255,0.2)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by - r * 0.9, r * 0.75, Math.PI, 0);
    for (let k = 0; k < 4; k++) { const x1 = bx + r * 0.75 - (k + 0.5) * r * 0.375, y1 = by + r * 0.35 + Math.sin(t * 6 + k) * r * 0.1; ctx.quadraticCurveTo(x1 + r * 0.19, y1 + r * 0.25, x1 - r * 0.19, y1); }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#1a1030'; for (const k of [-0.3, 0.3]) { ctx.beginPath(); ctx.ellipse(bx + k * r, by - r * 0.95, r * 0.13, r * 0.2, 0, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(bx, by - r * 0.55, r * 0.14, r * 0.22, 0, 0, TAU); ctx.fill();
    ctx.globalAlpha = 1;
  },
  drawBat(ctx, ob, t) {
    const s = this.scale, d = ob.dir || 1, [bx, by] = this.proj(ob.x, ob.y, 0.6 + 0.1 * Math.sin(t * 5)), r = s * Math.max(ob.w, ob.h) * 0.5, fl = Math.sin(t * 16 + ob.x) * r * 0.5;
    ctx.fillStyle = '#2a1e3a'; ctx.beginPath(); ctx.ellipse(bx, by, r * 0.45, r * 0.3, 0, 0, TAU); ctx.fill();
    for (const side of [-1, 1]) { ctx.beginPath(); ctx.moveTo(bx + side * r * 0.3, by); ctx.quadraticCurveTo(bx + side * r * 1.1, by - r * 0.6 - fl, bx + side * r * 1.5, by - fl); ctx.quadraticCurveTo(bx + side * r * 1.0, by + r * 0.25 - fl * 0.3, bx + side * r * 0.3, by + r * 0.2); ctx.closePath(); ctx.fill(); }
    ctx.fillStyle = '#ff5f7a'; for (const k of [-0.15, 0.15]) { ctx.beginPath(); ctx.arc(bx + k * r + d * r * 0.1, by - r * 0.08, r * 0.07, 0, TAU); ctx.fill(); }
  },
  drawStormCloud(ctx, ob, t) {
    const s = this.scale, [cx, cy] = this.proj(ob.x, ob.y, 0.4), r = s * Math.max(ob.w, ob.h) * 0.6;
    ctx.fillStyle = '#3a3f5c'; ctx.beginPath(); ctx.ellipse(cx, cy, r * 1.1, r * 0.45, 0, 0, TAU); ctx.ellipse(cx - r * 0.5, cy - r * 0.15, r * 0.6, r * 0.4, 0, 0, TAU); ctx.ellipse(cx + r * 0.45, cy - r * 0.2, r * 0.7, r * 0.45, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#5a6080'; ctx.beginPath(); ctx.ellipse(cx - r * 0.3, cy - r * 0.35, r * 0.5, r * 0.25, 0, 0, TAU); ctx.fill();
    if (Math.sin(t * 9 + ob.x) > 0.7) { ctx.strokeStyle = '#fff6a8'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath(); ctx.moveTo(cx, cy + r * 0.2); ctx.lineTo(cx - r * 0.15, cy + r * 0.6); ctx.lineTo(cx + r * 0.05, cy + r * 0.6); ctx.lineTo(cx - r * 0.1, cy + r * 1.0); ctx.stroke(); }
  },

  /* ---------- Rotoren, Bumper, Magnete ---------- */
  drawPropeller(ctx, ob, t) {
    const s = this.scale, hub = this.circlePoly(ob.x, ob.y, ob.hubR, 8);
    this.prism(ctx, hub, 0, ob.height + 0.3, '#c8ccdd', '#5e6278', { outline: '#2a2c3a' });
    for (let i = 0; i < ob.blades; i++) {
      const a = ob.bladeAngle(i), ca = Math.cos(a), sa = Math.sin(a), tk = ob.thick;
      const p = [[ob.x - sa * tk, ob.y + ca * tk], [ob.x + ca * ob.len - sa * tk * 0.5, ob.y + sa * ob.len + ca * tk * 0.5], [ob.x + ca * ob.len + sa * tk * 0.5, ob.y + sa * ob.len - ca * tk * 0.5], [ob.x + sa * tk, ob.y - ca * tk]];
      this.prism(ctx, p, ob.height * 0.5, 0.12, '#e6e9f5', '#8a8ea6', { outline: '#3a3c4a' });
    }
  },
  drawScythe(ctx, ob, t) {
    const s = this.scale;
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.hubR, 8), 0, 0.9, '#3a3050', '#1a1428', { outline: '#0a0810' });
    for (let i = 0; i < ob.blades; i++) {
      const a = ob.bladeAngle(i), ca = Math.cos(a), sa = Math.sin(a), tk = ob.thick;
      const p = [[ob.x - sa * tk, ob.y + ca * tk], [ob.x + ca * ob.len * 0.7 - sa * tk, ob.y + sa * ob.len * 0.7 + ca * tk], [ob.x + ca * ob.len * 0.7 + sa * tk, ob.y + sa * ob.len * 0.7 - ca * tk], [ob.x + sa * tk, ob.y - ca * tk]];
      this.prism(ctx, p, 0.35, 0.12, '#5a4a30', '#2a2214'); // Stiel
      const ex = ob.x + ca * ob.len * 0.7, ey = ob.y + sa * ob.len * 0.7; // gebogene Klinge
      const pts = []; for (let k = 0; k <= 6; k++) { const u = k / 6, ang = a - 0.9 + u * 1.2, rr = ob.len * (0.3 + 0.05 * Math.sin(u * Math.PI)); pts.push(this.proj(ex + Math.cos(ang) * rr, ey + Math.sin(ang) * rr, 0.42)); }
      ctx.fillStyle = '#d8d8e6'; ctx.strokeStyle = '#2a2a34'; ctx.lineWidth = 1.5; ctx.beginPath(); const [e0, e1] = this.proj(ex, ey, 0.42); ctx.moveTo(e0, e1); pts.forEach(q => ctx.lineTo(q[0], q[1])); ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  },
  drawOrb(ctx, ob, t, sc) {
    const s = this.scale, [px, py] = this.proj(ob.x, ob.y, 0), r = s * ob.r;
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.r * 0.6, 8), 0, 0.5, '#7a7f99', '#3e4159', { outline: '#1c1f33' });
    const [cx, cy] = this.proj(ob.x, ob.y, 0.5 + ob.r), rr = r * 0.95 * sc, gl = 0.75 + 0.25 * Math.sin(t * 9 + ob.x);
    const g = ctx.createRadialGradient(cx - rr * 0.3, cy - rr * 0.3, rr * 0.1, cx, cy, rr); g.addColorStop(0, '#ffffff'); g.addColorStop(0.4, '#fff27a'); g.addColorStop(1, '#a88a10');
    ctx.fillStyle = `rgba(255,240,120,${0.25 * gl})`; ctx.beginPath(); ctx.arc(cx, cy, rr * 1.8, 0, TAU); ctx.fill();
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.9)'; ctx.lineWidth = 1.5; for (let k = 0; k < 3; k++) { const a = t * 7 + k * 2.1; ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + Math.cos(a) * rr * 0.8, cy + Math.sin(a) * rr * 0.8); ctx.lineTo(cx + Math.cos(a + 0.4) * rr * 1.3, cy + Math.sin(a + 0.4) * rr * 1.3); ctx.stroke(); }
  },
  drawEye(ctx, ob, t, sc) {
    const s = this.scale, [cx, cy] = this.proj(ob.x, ob.y, ob.r), rr = s * ob.r * sc;
    this.isoEllipse(ctx, ob.x, ob.y, 0, ob.r * 0.9, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = '#e8e2f2'; ctx.beginPath(); ctx.arc(cx, cy, rr, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6a2a8a'; ctx.lineWidth = 1.5; for (let k = 0; k < 5; k++) { const a = k * 1.3; ctx.beginPath(); ctx.moveTo(cx + Math.cos(a) * rr * 0.5, cy + Math.sin(a) * rr * 0.5); ctx.lineTo(cx + Math.cos(a + 0.3) * rr * 0.95, cy + Math.sin(a + 0.3) * rr * 0.95); ctx.stroke(); }
    const look = 0.3 + 0.1 * Math.sin(t * 1.3), ax = Math.cos(t * 0.7) * rr * look, ay = Math.sin(t * 0.9) * rr * look * 0.6;
    ctx.fillStyle = '#8a3bff'; ctx.beginPath(); ctx.arc(cx + ax, cy + ay, rr * 0.45, 0, TAU); ctx.fill();
    ctx.fillStyle = '#05030a'; ctx.beginPath(); ctx.ellipse(cx + ax, cy + ay, rr * 0.12, rr * 0.32, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(cx - rr * 0.3, cy - rr * 0.35, rr * 0.12, 0, TAU); ctx.fill();
  },
  drawSoulLight(ctx, ob, t) {
    const s = this.scale, [cx, cy] = this.proj(ob.x, ob.y, 0.7 + 0.15 * Math.sin(t * 2)), rr = s * ob.core * 2.2;
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, rr * 2.2); g.addColorStop(0, 'rgba(210,170,255,0.6)'); g.addColorStop(1, 'rgba(120,60,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, rr * 2.2, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f0e4ff'; ctx.beginPath(); ctx.arc(cx, cy, rr * 0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a1040'; for (const k of [-0.25, 0.25]) { ctx.beginPath(); ctx.ellipse(cx + k * rr, cy - rr * 0.05, rr * 0.1, rr * 0.18, 0, 0, TAU); ctx.fill(); }
    for (let i = 0; i < 5; i++) { const a = t * 1.5 + i * 1.257, r2 = ob.core + 0.4, z = 0.5 + 0.3 * Math.sin(t * 2 + i * 2); const [px, py] = this.proj(ob.x + Math.cos(a) * r2, ob.y + Math.sin(a) * r2, z); ctx.fillStyle = 'rgba(220,190,255,0.8)'; ctx.beginPath(); ctx.arc(px, py, s * 0.05, 0, TAU); ctx.fill(); }
  },

  /* ---------- Steintore (Sturmfestung, Gruft) ---------- */
  drawStoneGate(ctx, ob, t) {
    const s = this.scale, px = ob.px, py = ob.py, Wd = ob.gw || 3.2, D = 1.2, H = 2.8, crypt = ob.style === 'crypt';
    const top = crypt ? ['#5a5074', '#25203a'] : ['#8c90ad', '#454864'], line = crypt ? '#0a0810' : '#1c1f33', lintel = crypt ? ['#6a5f88', '#332c48'] : ['#a0a4c0', '#5a5e7c'];
    this.prism(ctx, [[px - Wd / 2 - 0.5, py - D], [px - Wd / 2 + 0.3, py - D], [px - Wd / 2 + 0.3, py + D], [px - Wd / 2 - 0.5, py + D]], 0, H, top[0], top[1], { outline: line });
    this.prism(ctx, [[px + Wd / 2 - 0.3, py - D], [px + Wd / 2 + 0.5, py - D], [px + Wd / 2 + 0.5, py + D], [px + Wd / 2 - 0.3, py + D]], 0, H, top[0], top[1], { outline: line });
    this.prism(ctx, [[px - Wd / 2 - 0.7, py - D - 0.1], [px + Wd / 2 + 0.7, py - D - 0.1], [px + Wd / 2 + 0.7, py + D + 0.1], [px - Wd / 2 - 0.7, py + D + 0.1]], H, 0.7, lintel[0], lintel[1], { outline: line });
    if (!crypt) for (let k = 0; k < 5; k++) { const bx = px - Wd / 2 - 0.7 + k * (Wd + 1.4) / 4.5; this.prism(ctx, [[bx, py - D - 0.1], [bx + 0.4, py - D - 0.1], [bx + 0.4, py + D + 0.1], [bx, py + D + 0.1]], H + 0.7, 0.45, lintel[0], lintel[1]); } // Zinnen
    else this.prism(ctx, [[px - 0.6, py - D], [px + 0.6, py - D], [px + 0.6, py + D], [px - 0.6, py + D]], H + 0.7, 0.6, '#3a3050', '#1a1428'); // Giebelstein
    this.prism(ctx, [[px - Wd / 2 + 0.3, py - D], [px + Wd / 2 - 0.3, py - D], [px + Wd / 2 - 0.3, py + D * 0.4], [px - Wd / 2 + 0.3, py + D * 0.4]], 0, H, top[1], shade(top[1], 0.7));
    const fy = py + D * 0.4, o = [[px - 0.8, fy, 0], [px - 0.8, fy, 1.7], [px, fy, 2.25], [px + 0.8, fy, 1.7], [px + 0.8, fy, 0]];
    ctx.fillStyle = '#04030a'; ctx.beginPath(); o.forEach((q, i) => { const r = this.proj(q[0], q[1], q[2] + 0.01); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); }); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = crypt ? '#c58bff' : '#7fd8ff'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.stroke();
    if (crypt) { const [kx, ky] = this.proj(px, fy - 0.05, H + 0.35); this.spriteSkull(ctx, kx, ky + s * 0.2, s * 0.9); }
    else { ctx.fillStyle = 'rgba(255,228,94,0.85)'; const [gx, gy] = this.proj(px, fy - 0.05, H + 0.35); ctx.beginPath(); ctx.moveTo(gx - s * 0.1, gy - s * 0.25); ctx.lineTo(gx + s * 0.08, gy - s * 0.02); ctx.lineTo(gx - s * 0.02, gy - s * 0.02); ctx.lineTo(gx + s * 0.1, gy + s * 0.25); ctx.lineTo(gx - s * 0.08, gy); ctx.lineTo(gx + s * 0.02, gy); ctx.closePath(); ctx.fill(); }
    for (const side of [-1, 1]) { const [bx, by] = this.proj(px + side * (Wd / 2 + 0.1), fy + 0.2, 0); this.spriteBrazierColored(ctx, bx, by, s * 0.9, t, crypt ? ['#a24bff', '#e0b8ff', '170,90,255'] : ['#4fc3ff', '#b7ecff', '80,190,255']); }
  },

  /* ---------- Dekos ---------- */
  spriteGhostLight(ctx, sx, sy, s, d, t) {
    const yy = sy - s * (0.9 + 0.15 * Math.sin(t * 1.7 + sx)), a = 0.5 + 0.4 * Math.abs(Math.sin(t * 1.1 + (d.seed || 0) * 6));
    const g = ctx.createRadialGradient(sx, yy, 0, sx, yy, s * 0.7); g.addColorStop(0, `rgba(190,140,255,${a})`); g.addColorStop(1, 'rgba(190,140,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, yy, s * 0.7, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(240,225,255,${a})`; ctx.beginPath(); ctx.arc(sx, yy, s * 0.12, 0, TAU); ctx.fill();
  },
  spriteCloudDark(ctx, sx, sy, s, t) {
    const yy = sy + Math.sin(t * 0.8 + sx) * s * 0.1;
    ctx.fillStyle = 'rgba(70,76,110,0.9)';
    ctx.beginPath(); ctx.ellipse(sx, yy, s * 1.1, s * 0.4, 0, 0, TAU); ctx.ellipse(sx - s * 0.5, yy - s * 0.1, s * 0.6, s * 0.35, 0, 0, TAU); ctx.ellipse(sx + s * 0.45, yy - s * 0.15, s * 0.7, s * 0.4, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(120,128,165,0.6)'; ctx.beginPath(); ctx.ellipse(sx - s * 0.2, yy - s * 0.25, s * 0.55, s * 0.22, 0, 0, TAU); ctx.fill();
  },
  spriteLightningRod(ctx, sx, sy, s, t) {
    this.shadow(ctx, sx, sy, s * 0.35);
    ctx.fillStyle = '#4e526d'; ctx.beginPath(); ctx.moveTo(sx - s * 0.25, sy); ctx.lineTo(sx + s * 0.25, sy); ctx.lineTo(sx + s * 0.1, sy - s * 1.6); ctx.lineTo(sx - s * 0.1, sy - s * 1.6); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#c8ccdd'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath(); ctx.moveTo(sx, sy - s * 1.6); ctx.lineTo(sx, sy - s * 2.3); ctx.stroke();
    const gl = Math.sin(t * 5 + sx) > 0.6; ctx.fillStyle = gl ? '#fff6a8' : '#8a8ea6'; ctx.beginPath(); ctx.arc(sx, sy - s * 2.35, s * (gl ? 0.13 : 0.08), 0, TAU); ctx.fill();
  },
  spriteWindsock(ctx, sx, sy, s, d, t) {
    ctx.strokeStyle = '#8a8ea6'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - s * 1.5); ctx.stroke();
    const fl = Math.sin(t * 4 + sx) * s * 0.1, dir = (d.seed || 0.5) > 0.5 ? 1 : -1;
    ctx.fillStyle = '#ff7a3a'; ctx.beginPath(); ctx.moveTo(sx, sy - s * 1.5); ctx.lineTo(sx + dir * s * 0.9, sy - s * 1.35 + fl); ctx.lineTo(sx + dir * s * 0.9, sy - s * 1.15 + fl); ctx.lineTo(sx, sy - s * 1.2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.fillRect(sx + dir * s * 0.3, sy - s * 1.45 + fl * 0.4, dir * s * 0.18, s * 0.28);
  },
  spriteBanner(ctx, sx, sy, s, d, t) {
    ctx.strokeStyle = '#3a3c4a'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - s * 1.8); ctx.stroke();
    const sw = Math.sin(t * 2 + sx) * s * 0.06;
    ctx.fillStyle = (d.seed || 0) > 0.5 ? '#5a2a7a' : '#2a3a8a'; ctx.beginPath(); ctx.moveTo(sx, sy - s * 1.8); ctx.lineTo(sx + s * 0.55 + sw, sy - s * 1.7); ctx.lineTo(sx + s * 0.55 + sw, sy - s * 0.9); ctx.lineTo(sx + s * 0.28, sy - s * 1.05); ctx.lineTo(sx, sy - s * 0.95); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe45e'; ctx.beginPath(); ctx.arc(sx + s * 0.27 + sw * 0.5, sy - s * 1.35, s * 0.1, 0, TAU); ctx.fill();
  },
  spriteBrazierColored(ctx, sx, sy, s, t, cols) {
    ctx.fillStyle = '#2a2a34'; ctx.fillRect(sx - s * 0.06, sy - s * 0.5, s * 0.12, s * 0.5);
    ctx.beginPath(); ctx.ellipse(sx, sy - s * 0.5, s * 0.28, s * 0.12, 0, 0, TAU); ctx.fill();
    const f = 0.8 + 0.2 * Math.sin(t * 11 + sx);
    ctx.fillStyle = `rgba(${cols[2]},0.25)`; ctx.beginPath(); ctx.arc(sx, sy - s * 0.7, s * 0.5 * f, 0, TAU); ctx.fill();
    ctx.fillStyle = cols[0]; ctx.beginPath(); ctx.moveTo(sx - s * 0.2, sy - s * 0.5); ctx.quadraticCurveTo(sx - s * 0.1, sy - s * 0.9 * f, sx, sy - s * 1.05 * f); ctx.quadraticCurveTo(sx + s * 0.1, sy - s * 0.85 * f, sx + s * 0.2, sy - s * 0.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = cols[1]; ctx.beginPath(); ctx.moveTo(sx - s * 0.1, sy - s * 0.5); ctx.quadraticCurveTo(sx, sy - s * 0.75 * f, sx + s * 0.1, sy - s * 0.5); ctx.closePath(); ctx.fill();
  },
  spritePillar(ctx, sx, sy, s, d) {
    const w = s * 0.28, h = s * 2.0;
    this.shadow(ctx, sx, sy, w * 1.4);
    ctx.fillStyle = '#4a4060'; ctx.fillRect(sx - w, sy - h, w, h); ctx.fillStyle = '#2a2438'; ctx.fillRect(sx, sy - h, w, h);
    ctx.fillStyle = '#5e5474'; ctx.fillRect(sx - w * 1.3, sy - h, w * 2.6, s * 0.16); ctx.fillRect(sx - w * 1.3, sy - s * 0.16, w * 2.6, s * 0.16);
    ctx.fillStyle = 'rgba(197,139,255,0.35)'; ctx.fillRect(sx - w * 0.15, sy - h * 0.8, w * 0.3, h * 0.6);
  },
  /* ---------- Schattenreich, zweiter Ausbau: Fallbeil, Augenturm, Ritterstatue, Raben ---------- */
  /* Fallbeil: zwei dunkle Holzpfosten mit Querbalken, dazwischen hängt die schräge Stahlklinge unter dem
     Gewichtsblock an einem Seil. Kurz vor dem Fall zittert sie, beim Aufschlag stieben Funken. */
  drawGuillotineFloor(ctx, ob, t) {
    const s = this.scale, hw = ob.w / 2 + 0.25, hh = ob.h / 2, rect = [[ob.x - hw, ob.y - hh], [ob.x + hw, ob.y - hh], [ob.x + hw, ob.y + hh], [ob.x - hw, ob.y + hh]];
    this.fillPoly(ctx, rect, 0.004, ob.closed ? 'rgba(20,10,20,0.55)' : `rgba(120,20,40,${0.12 + 0.25 * ob.warn})`, false);
    ctx.strokeStyle = ob.warn > 0 ? `rgba(255,60,80,${0.35 + 0.6 * ob.warn * (0.6 + 0.4 * Math.sin(t * 30))})` : 'rgba(150,40,60,0.45)'; ctx.lineWidth = Math.max(1, s * 0.05);
    this.pathPoly(ctx, rect, 0.005); ctx.stroke();
    if (ob.closed) { // Blutspur unter der Klinge
      ctx.fillStyle = 'rgba(150,20,40,0.5)'; for (let k = 0; k < 4; k++) { const [bx, by] = this.proj(ob.x + (k % 2 ? 0.2 : -0.2), ob.y - hh + (k + 0.5) * ob.h / 4, 0.006); ctx.beginPath(); ctx.ellipse(bx, by, s * 0.12, s * 0.07, 0, 0, TAU); ctx.fill(); }
    }
  },
  pushGuillotine(items, ctx, ob, t) {
    const vert = ob.w < ob.h, pw = 0.32, top = ob.liftH + ob.bladeH + 0.55;
    const ends = vert ? [[ob.x, ob.y - ob.h / 2 - pw / 2], [ob.x, ob.y + ob.h / 2 + pw / 2]] : [[ob.x - ob.w / 2 - pw / 2, ob.y], [ob.x + ob.w / 2 + pw / 2, ob.y]];
    for (const [px, py] of ends) items.push({ x: px, y: py, draw: () => {
      this.prism(ctx, [[px - pw / 2, py - pw / 2], [px + pw / 2, py - pw / 2], [px + pw / 2, py + pw / 2], [px - pw / 2, py + pw / 2]], 0, top, '#3a2a20', '#1e140e', { outline: '#0a0604' });
      const [kx, ky] = this.proj(px, py + pw / 2, top - 0.3); this.spriteSkull(ctx, kx, ky, this.scale * 0.55); // Schädel am Pfosten
    } });
    items.push({ x: ob.x, y: ob.y, bias: 0.05, draw: () => this.drawGuillotineBlade(ctx, ob, t, vert, pw, top, ends) });
  },
  drawGuillotineBlade(ctx, ob, t, vert, pw, top, ends) {
    const s = this.scale, L = vert ? ob.h : ob.w;
    const A = vert ? [ob.x, ob.y - L / 2 + 0.05] : [ob.x - L / 2 + 0.05, ob.y], B = vert ? [ob.x, ob.y + L / 2 - 0.05] : [ob.x + L / 2 - 0.05, ob.y];
    const beam = vert ? [[ob.x - 0.25, ends[0][1] - pw / 2], [ob.x + 0.25, ends[0][1] - pw / 2], [ob.x + 0.25, ends[1][1] + pw / 2], [ob.x - 0.25, ends[1][1] + pw / 2]] : [[ends[0][0] - pw / 2, ob.y - 0.25], [ends[1][0] + pw / 2, ob.y - 0.25], [ends[1][0] + pw / 2, ob.y + 0.25], [ends[0][0] - pw / 2, ob.y + 0.25]];
    const shake = ob.warn > 0 ? Math.sin(t * 40) * 0.03 * ob.warn : 0, z0 = ob.lift * ob.liftH + shake;
    const P = (q, z) => this.proj(q[0], q[1], z);
    // Klinge: senkrechte Platte, Schneide schräg
    const p0 = P(A, z0), p1 = P(B, z0 + ob.bladeH * 0.55), p2 = P(B, z0 + ob.bladeH), p3 = P(A, z0 + ob.bladeH);
    const g = ctx.createLinearGradient(p0[0], p0[1], p3[0], p3[1]); g.addColorStop(0, '#f0f2f8'); g.addColorStop(0.35, '#9aa0b4'); g.addColorStop(1, '#5a6074');
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p2[0], p2[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#1a1c24'; ctx.lineWidth = 1; ctx.stroke();
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); // Schneide blitzt
    if (ob.closed) { ctx.strokeStyle = 'rgba(150,20,40,0.8)'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); }
    // Gewichtsblock über der Klinge
    const blk = vert ? [[ob.x - 0.28, A[1]], [ob.x + 0.28, A[1]], [ob.x + 0.28, B[1]], [ob.x - 0.28, B[1]]] : [[A[0], ob.y - 0.28], [B[0], ob.y - 0.28], [B[0], ob.y + 0.28], [A[0], ob.y + 0.28]];
    this.prism(ctx, blk, z0 + ob.bladeH, 0.4, '#4a3428', '#2a1c12', { outline: '#0a0604' });
    // Seil zum Querbalken
    const [r0, r1] = this.proj(ob.x, ob.y, z0 + ob.bladeH + 0.4), [r2, r3] = this.proj(ob.x, ob.y, top);
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = Math.max(1, s * 0.035); ctx.beginPath(); ctx.moveTo(r0, r1); ctx.lineTo(r2, r3); ctx.stroke();
    // Querbalken oben
    this.prism(ctx, beam, top, 0.3, '#3a2a20', '#1e140e', { outline: '#0a0604' });
    // Funken beim Aufschlag
    const dtS = t - ob.slamAt;
    if (dtS >= 0 && dtS < 0.35) { ctx.fillStyle = `rgba(255,220,120,${1 - dtS / 0.35})`; for (let k = 0; k < 8; k++) { const u = k / 8, q = P([A[0] + (B[0] - A[0]) * u, A[1] + (B[1] - A[1]) * u], 0.05 + dtS * 3 * (0.4 + (k % 3) * 0.3)); ctx.beginPath(); ctx.arc(q[0] + (k % 2 ? 1 : -1) * dtS * s * 2, q[1], Math.max(1, s * 0.05), 0, TAU); ctx.fill(); } }
  },

  /* Augenturm: Lichtkegel auf dem Boden (durch Blöcke abgeschattet), darüber der Turm mit Zinnen und das
     brennende Auge, das sich langsam dreht. Sieht es den Ball, flackert der Kegel rot. */
  drawEyeBeam(ctx, ob, t) {
    const s = this.scale, n = 22, pts = [];
    const lv = this.level, tiles = lv.tiles;
    for (let i = 0; i <= n; i++) {
      const a = ob.dir - ob.fov / 2 + ob.fov * i / n; let R = ob.r;
      for (; R < ob.range; R += 0.2) { const c = lv.charAt(ob.x + Math.cos(a) * R, ob.y + Math.sin(a) * R); if (c === 'x') break; }
      pts.push([ob.x + Math.cos(a) * R, ob.y + Math.sin(a) * R]);
    }
    const poly = [[ob.x + Math.cos(ob.dir - ob.fov / 2) * ob.r, ob.y + Math.sin(ob.dir - ob.fov / 2) * ob.r], ...pts, [ob.x + Math.cos(ob.dir + ob.fov / 2) * ob.r, ob.y + Math.sin(ob.dir + ob.fov / 2) * ob.r]];
    const [cx, cy] = this.proj(ob.x, ob.y, 0.006), [ex, ey] = this.proj(ob.x + Math.cos(ob.dir) * ob.range, ob.y + Math.sin(ob.dir) * ob.range, 0.006);
    const rg = ctx.createRadialGradient(cx, cy, s * ob.r, cx, cy, Math.hypot(ex - cx, ey - cy));
    const fl = 0.85 + 0.15 * Math.sin(t * 9) + 0.1 * Math.sin(t * 23), al = ob.alert;
    rg.addColorStop(0, `rgba(${255},${Math.round(170 - 110 * al)},${Math.round(60 - 40 * al)},${0.55 * fl})`); rg.addColorStop(1, `rgba(255,${Math.round(120 - 80 * al)},30,0)`);
    ctx.fillStyle = rg; this.pathPoly(ctx, poly, 0.006); ctx.fill();
    ctx.strokeStyle = `rgba(255,${Math.round(200 - 140 * al)},90,${0.5 * fl})`; ctx.lineWidth = Math.max(1, s * 0.04); this.pathPoly(ctx, poly, 0.007); ctx.stroke();
    void tiles;
  },
  drawEyeTower(ctx, ob, t) {
    const s = this.scale, r = ob.r, H = ob.height;
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, r * 1.5, 'rgba(0,0,0,0.3)');
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 1.25, 12), 0, 0.45, '#4a4060', '#1e1830', { outline: '#0a0810' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r, 12), 0.45, H - 0.45, '#3a3050', '#1a1428', { outline: '#0a0810' });
    // Fugen und glühende Fenster
    ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 1;
    for (const z of [1.2, 2.0, 2.8]) { const q0 = this.proj(ob.x - r, ob.y, z), q1 = this.proj(ob.x + r, ob.y, z); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
    const fl = 0.7 + 0.3 * Math.sin(t * 7);
    for (let k = 0; k < 3; k++) { const a = this.cam.th + Math.PI + (k - 1) * 1.1, wx = ob.x + Math.cos(a) * r * 0.98, wy = ob.y + Math.sin(a) * r * 0.98; const [q0, q1] = this.proj(wx, wy, 1.5 + (k % 2) * 0.8); ctx.fillStyle = `rgba(255,150,40,${0.8 * fl})`; ctx.beginPath(); ctx.moveTo(q0 - s * 0.08, q1); ctx.lineTo(q0, q1 - s * 0.25); ctx.lineTo(q0 + s * 0.08, q1); ctx.closePath(); ctx.fill(); }
    // Zinnenkranz
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 1.18, 12), H, 0.3, '#4a4060', '#1e1830', { outline: '#0a0810' });
    for (let k = 0; k < 8; k++) { const a = k * TAU / 8 + 0.2; this.prism(ctx, this.circlePoly(ob.x + Math.cos(a) * r * 1.05, ob.y + Math.sin(a) * r * 1.05, 0.16, 4, a), H + 0.3, 0.32, '#5a5074', '#25203a'); }
    // Das brennende Auge auf dem Turm
    const ez = H + 1.15, [ex, ey] = this.proj(ob.x, ob.y, ez), R = s * r * 0.62;
    const glow = ctx.createRadialGradient(ex, ey, R * 0.5, ex, ey, R * 3.2); glow.addColorStop(0, `rgba(255,140,40,${0.45 + 0.3 * ob.alert})`); glow.addColorStop(1, 'rgba(255,90,20,0)'); ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(ex, ey, R * 3.2, 0, TAU); ctx.fill();
    for (let k = 0; k < 9; k++) { // Flammenkranz
      const a = k * TAU / 9 + t * 0.6, ff = 0.7 + 0.3 * Math.sin(t * 11 + k * 2.1), fx = ex + Math.cos(a) * R * 0.95, fy = ey + Math.sin(a) * R * 0.5 - R * 0.1;
      ctx.fillStyle = k % 2 ? `rgba(255,200,60,${0.85 * ff})` : `rgba(255,110,30,${0.9 * ff})`;
      ctx.beginPath(); ctx.moveTo(fx - R * 0.28, fy + R * 0.2); ctx.quadraticCurveTo(fx + Math.sin(t * 9 + k) * R * 0.25, fy - R * (0.9 + 0.5 * ff), fx + R * 0.28, fy + R * 0.2); ctx.closePath(); ctx.fill();
    }
    const eg = ctx.createRadialGradient(ex - R * 0.3, ey - R * 0.3, R * 0.1, ex, ey, R); eg.addColorStop(0, '#fff4d0'); eg.addColorStop(0.5, '#ffb347'); eg.addColorStop(1, '#a33a10');
    ctx.fillStyle = eg; ctx.beginPath(); ctx.ellipse(ex, ey, R, R * 0.8, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3a1008'; ctx.lineWidth = Math.max(1, s * 0.05); ctx.stroke();
    // Pupille schaut in Blickrichtung
    const [dx0, dy0] = this.proj(ob.x + Math.cos(ob.dir) * 0.4, ob.y + Math.sin(ob.dir) * 0.4, ez), vx = dx0 - ex, vy = dy0 - ey, vl = Math.hypot(vx, vy) || 1, pk = R * 0.45;
    const px = ex + vx / vl * pk * Math.min(1, vl / (s * 0.4)), py = ey + vy / vl * pk * 0.8 * Math.min(1, vl / (s * 0.4));
    ctx.fillStyle = '#1a0408'; ctx.beginPath(); ctx.ellipse(px, py, R * 0.16, R * 0.5, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,60,30,${0.5 + 0.5 * ob.alert})`; ctx.beginPath(); ctx.ellipse(px, py, R * 0.08, R * 0.3, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(ex - R * 0.35, ey - R * 0.35, R * 0.12, 0, TAU); ctx.fill();
  },

  /* Verfluchte Ritterstatue: steinerner Sockel, Rüstung, Helm mit Federbusch. Das Schwert liegt tief über
     dem Boden; im Takt erwacht die Statue (Augen glühen) und schlägt blitzschnell zu. */
  drawKnightStatue(ctx, ob, t) {
    const s = this.scale, x = ob.x, y = ob.y, awake = ob.awake ? 1 : (ob.wakeIn || 0);
    const sq = (cx, cy, w) => [[cx - w / 2, cy - w / 2], [cx + w / 2, cy - w / 2], [cx + w / 2, cy + w / 2], [cx - w / 2, cy + w / 2]];
    this.isoEllipse(ctx, x, y, 0.004, 0.9, 'rgba(0,0,0,0.3)');
    // Schwert (liegt auf Ballhöhe)
    const a = ob.bladeAngle(0), ca = Math.cos(a), sa = Math.sin(a), tk = ob.thick * 0.7, L = ob.len;
    const bl = [[x + ca * 0.5 - sa * tk, y + sa * 0.5 + ca * tk], [x + ca * L - sa * tk * 0.3, y + sa * L + ca * tk * 0.3], [x + ca * (L + 0.25), y + sa * (L + 0.25)], [x + ca * L + sa * tk * 0.3, y + sa * L - ca * tk * 0.3], [x + ca * 0.5 + sa * tk, y + sa * 0.5 - ca * tk]];
    this.prism(ctx, bl, 0.2, 0.14, awake > 0.5 ? '#ffe8f0' : '#d8dce8', '#6a7084', { outline: '#20242c' });
    this.prism(ctx, [[x + ca * 0.45 - sa * 0.3, y + sa * 0.45 + ca * 0.3], [x + ca * 0.55 - sa * 0.3, y + sa * 0.55 + ca * 0.3], [x + ca * 0.55 + sa * 0.3, y + sa * 0.55 - ca * 0.3], [x + ca * 0.45 + sa * 0.3, y + sa * 0.45 - ca * 0.3]], 0.15, 0.24, '#c9a15a', '#7a5a2a'); // Parierstange
    if (awake > 0.5) { ctx.strokeStyle = `rgba(255,80,120,${0.6 * awake})`; ctx.lineWidth = Math.max(2, s * 0.1); const q0 = this.proj(x + ca * 0.5, y + sa * 0.5, 0.3), q1 = this.proj(x + ca * L, y + sa * L, 0.3); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
    // Sockel, Beine, Rumpf
    this.prism(ctx, sq(x, y, 1.1), 0, 0.45, '#6a6280', '#332c48', { outline: '#14101e' });
    this.prism(ctx, sq(x, y, 0.62), 0.45, 0.75, '#8a90a8', '#3e4458', { outline: '#1c202c' });
    this.prism(ctx, sq(x, y, 0.82), 1.2, 0.95, '#a0a6bc', '#4a5068', { outline: '#1c202c' });
    // Schulterplatten und Arm zum Schwert
    for (const side of [-1, 1]) this.prism(ctx, this.circlePoly(x - sa * side * 0.5, y + ca * side * 0.5, 0.2, 6), 1.95, 0.25, '#b0b6cc', '#4a5068');
    const [h0, h1] = this.proj(x - sa * 0.5, y + ca * 0.5, 1.95), [h2, h3] = this.proj(x + ca * 0.5, y + sa * 0.5, 0.4);
    ctx.strokeStyle = '#7a8098'; ctx.lineWidth = Math.max(2, s * 0.14); ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(h0, h1); ctx.lineTo(h2, h3); ctx.stroke();
    // Wappenrock mit Totenkopf
    const [cx, cy] = this.proj(x, y + 0.42, 1.7); ctx.fillStyle = '#3a1f4d'; ctx.fillRect(cx - s * 0.2, cy - s * 0.25, s * 0.4, s * 0.5); this.spriteSkull(ctx, cx, cy + s * 0.12, s * 0.45);
    // Helm mit Visier und Federbusch
    this.prism(ctx, this.circlePoly(x, y, 0.3, 8), 2.15, 0.55, '#b0b6cc', '#4a5068', { outline: '#1c202c' });
    const [vx, vy] = this.proj(x, y + 0.3, 2.45);
    ctx.fillStyle = '#0a0810'; ctx.fillRect(vx - s * 0.22, vy - s * 0.05, s * 0.44, s * 0.09);
    if (awake > 0) { ctx.fillStyle = `rgba(255,40,60,${awake})`; for (const k of [-0.1, 0.1]) { ctx.beginPath(); ctx.arc(vx + k * s, vy, s * 0.035 + awake * s * 0.02, 0, TAU); ctx.fill(); } const gl = ctx.createRadialGradient(vx, vy, 0, vx, vy, s * 0.5); gl.addColorStop(0, `rgba(255,40,60,${0.35 * awake})`); gl.addColorStop(1, 'rgba(255,40,60,0)'); ctx.fillStyle = gl; ctx.beginPath(); ctx.arc(vx, vy, s * 0.5, 0, TAU); ctx.fill(); }
    const [px, py] = this.proj(x, y, 2.75); ctx.strokeStyle = '#8a3bff'; ctx.lineWidth = Math.max(2, s * 0.09); ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + s * 0.1, py - s * 0.5, px - s * 0.25 + Math.sin(t * 3) * s * 0.05, py - s * 0.55); ctx.stroke();
  },

  /* Rabenschwarm: eine Reihe schwarzer Vögel fliegt dicht über den Boden – wie eine Welle nimmt sie den Ball mit.
     Jeder Rabe in Seitenansicht wie eine Krähe im Flug: gestreckter Rumpf mit Glanz, Kopf mit Schnabel, Schwanzfächer,
     beide Flügel hochgestellt und nach hinten gefegt mit gespreizten Fingerfedern; der ferne Flügel liegt hinter dem Rumpf. */
  drawRavens(ctx, ob, t) {
    const s = this.scale, along = ob.h >= ob.w, L = along ? ob.h : ob.w, n = Math.max(3, Math.round(L / 0.8));
    const sp = Math.hypot(ob.vx, ob.vy), ux = sp > 0.05 ? ob.vx / sp : 1, uy = sp > 0.05 ? ob.vy / sp : 0;
    const [d0, d1] = this.proj(ob.x + ux, ob.y + uy, 0), [c0, c1] = this.proj(ob.x, ob.y, 0), sdx = d0 - c0, sdy = d1 - c1, sl = Math.hypot(sdx, sdy) || 1, fdx = sdx / sl, fdy = sdy / sl;
    const birds = [];
    for (let i = 0; i < n; i++) { const u = (i + 0.5) / n, off = (i % 2 ? 0.28 : -0.18); birds.push({ x: along ? ob.x + off : ob.x - ob.w / 2 + u * ob.w, y: along ? ob.y - ob.h / 2 + u * ob.h : ob.y + off, z: 0.5 + 0.2 * Math.sin(t * 3.2 + i * 1.9), i }); }
    birds.sort((p, q) => this.depth(p.x, p.y) - this.depth(q.x, q.y));
    // Windspur hinter dem Schwarm
    ctx.strokeStyle = 'rgba(180,160,220,0.25)'; ctx.lineWidth = Math.max(1, s * 0.04);
    for (const b of birds) { const [q0, q1] = this.proj(b.x - ux * 0.3, b.y - uy * 0.3, 0.02), [q2, q3] = this.proj(b.x - ux * 1.4, b.y - uy * 1.4, 0.02); ctx.beginPath(); ctx.moveTo(q0, q1); ctx.lineTo(q2, q3); ctx.stroke(); }
    const facing = fdx >= 0 ? 1 : -1, tilt = Math.max(-0.5, Math.min(0.5, Math.atan2(fdy, Math.abs(fdx) + 0.35)));
    for (const b of birds) {
      this.isoEllipse(ctx, b.x, b.y, 0.005, 0.45, 'rgba(0,0,0,0.25)', 0.22);
      const [bx, by] = this.proj(b.x, b.y, b.z), r = s * 0.5, flap = Math.sin(t * 11 + b.i * 1.3);
      ctx.save(); ctx.translate(bx, by); ctx.scale(facing, 1); ctx.rotate(tilt); ctx.lineJoin = 'round';
      // Flügel: Spannweite entlang wx, Hinterkante nach +wy; um den Schulterpunkt gedreht (hoch und nach hinten), Schlag ±
      const wing = (sx, sy, scale, ang, top, dark, edge) => {
        ctx.save(); ctx.translate(sx * r, sy * r); ctx.rotate(ang); ctx.scale(scale * r, scale * r);
        const g = ctx.createLinearGradient(0, 0, 1.2, 0.6); g.addColorStop(0, top); g.addColorStop(1, dark);
        ctx.fillStyle = g; ctx.strokeStyle = edge; ctx.lineWidth = 0.035;
        ctx.beginPath(); ctx.moveTo(0, 0.05); ctx.quadraticCurveTo(0.6, -0.12, 1.25, -0.02); ctx.lineTo(1.35, 0.12); // Vorderkante
        // fünf Fingerfedern am Ende, die sich nach hinten spreizen
        for (let k = 0; k < 5; k++) { const bxk = 1.3 - k * 0.14, byk = 0.14 + k * 0.17, a = 0.15 + k * 0.28, len = 0.5 - k * 0.04; ctx.lineTo(bxk + Math.cos(a) * len, byk + Math.sin(a) * len); ctx.lineTo(bxk - 0.06, byk + 0.1); }
        ctx.quadraticCurveTo(0.35, 0.75, 0.05, 0.45); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.02; // Federlinien
        for (let k = 1; k <= 3; k++) { ctx.beginPath(); ctx.moveTo(0.25 * k, 0.02); ctx.lineTo(0.2 * k + 0.35, 0.55 - k * 0.05); ctx.stroke(); }
        ctx.restore();
      };
      const angNear = -1.95 + 0.42 * flap, angFar = -1.8 + 0.42 * Math.sin(t * 11 + b.i * 1.3 + 0.35);
      wing(-0.05, -0.05, 0.86, angFar, '#1a1626', '#08060c', 'rgba(60,50,90,0.6)'); // ferner Flügel hinter dem Rumpf
      // Schwanzfächer
      ctx.fillStyle = '#14101c'; ctx.strokeStyle = 'rgba(80,70,120,0.5)'; ctx.lineWidth = Math.max(0.8, r * 0.03);
      for (const [tx, ty] of [[-1.0, 0.22], [-1.05, 0.36], [-0.95, 0.5]]) { ctx.beginPath(); ctx.moveTo(-0.42 * r, 0.02 * r); ctx.lineTo(tx * r, (ty - 0.07) * r); ctx.lineTo((tx + 0.02) * r, (ty + 0.07) * r); ctx.lineTo(-0.4 * r, 0.14 * r); ctx.closePath(); ctx.fill(); ctx.stroke(); }
      // Rumpf mit Glanz (Kugelgefühl), Kopf, Schnabel, Auge
      const bg = ctx.createRadialGradient(-0.05 * r, -0.12 * r, 0.05 * r, 0, 0.05 * r, 0.62 * r); bg.addColorStop(0, '#3a3250'); bg.addColorStop(0.55, '#16121f'); bg.addColorStop(1, '#07060a');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.ellipse(0, 0.05 * r, 0.58 * r, 0.24 * r, 0.08, 0, TAU); ctx.fill();
      const hg = ctx.createRadialGradient(0.52 * r, -0.2 * r, 0.03 * r, 0.56 * r, -0.12 * r, 0.22 * r); hg.addColorStop(0, '#3a3250'); hg.addColorStop(1, '#0a0810');
      ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(0.56 * r, -0.12 * r, 0.19 * r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2e2e38'; ctx.beginPath(); ctx.moveTo(0.7 * r, -0.2 * r); ctx.lineTo(1.02 * r, -0.07 * r); ctx.lineTo(0.7 * r, 0.0); ctx.closePath(); ctx.fill(); // Schnabel
      ctx.strokeStyle = 'rgba(150,150,170,0.6)'; ctx.lineWidth = Math.max(0.8, r * 0.025); ctx.beginPath(); ctx.moveTo(0.7 * r, -0.19 * r); ctx.lineTo(1.0 * r, -0.08 * r); ctx.stroke();
      ctx.fillStyle = '#e0dce8'; ctx.beginPath(); ctx.arc(0.6 * r, -0.16 * r, 0.035 * r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff4a4a'; ctx.beginPath(); ctx.arc(0.6 * r, -0.16 * r, 0.02 * r, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(160,140,220,0.35)'; ctx.lineWidth = Math.max(1, r * 0.04); ctx.beginPath(); ctx.moveTo(-0.45 * r, -0.12 * r); ctx.quadraticCurveTo(0.05 * r, -0.28 * r, 0.42 * r, -0.2 * r); ctx.stroke(); // Glanz auf dem Rücken
      wing(0.08, -0.1, 1.0, angNear, '#2a2440', '#0c0a14', 'rgba(150,130,210,0.55)'); // naher Flügel vor dem Rumpf
      ctx.restore();
    }
  },
  /* Luke: offene Bodenklappe mit Leiter, aus der violettes Licht dringt – der Ausgang aus dem Totenschiff */
  drawHatch(ctx, ob, t) {
    const s = this.scale, r = ob.r || 0.9, rect = [[ob.x - r, ob.y - r * 0.8], [ob.x + r, ob.y - r * 0.8], [ob.x + r, ob.y + r * 0.8], [ob.x - r, ob.y + r * 0.8]];
    this.prism(ctx, rect, 0, 0.12, '#4a3a2c', '#2a1c12', { outline: '#0a0604' });
    const hole = [[ob.x - r * 0.8, ob.y - r * 0.6], [ob.x + r * 0.8, ob.y - r * 0.6], [ob.x + r * 0.8, ob.y + r * 0.6], [ob.x - r * 0.8, ob.y + r * 0.6]];
    this.fillPoly(ctx, hole, 0.125, '#04030a', false);
    const [cx, cy] = this.proj(ob.x, ob.y, 0.13), gl = 0.6 + 0.4 * Math.sin(t * 2.2);
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * r * 1.6); rg.addColorStop(0, `rgba(197,139,255,${0.45 * gl})`); rg.addColorStop(1, 'rgba(197,139,255,0)'); ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(cx, cy, s * r * 1.6, 0, TAU); ctx.fill();
    // aufgeklappter Deckel
    this.prism(ctx, [[ob.x - r * 0.8, ob.y - r * 0.75], [ob.x + r * 0.8, ob.y - r * 0.75], [ob.x + r * 0.8, ob.y - r * 0.6], [ob.x - r * 0.8, ob.y - r * 0.6]], 0.12, 1.1, '#5a4634', '#2a1c12', { outline: '#0a0604' });
    // Leiter ins Dunkel
    ctx.strokeStyle = '#8a7a5a'; ctx.lineWidth = Math.max(1, s * 0.05);
    for (const k of [-0.3, 0.3]) { const q0 = this.proj(ob.x + k * r, ob.y + r * 0.5, 0.15), q1 = this.proj(ob.x + k * r, ob.y + r * 0.1, -0.5); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
    for (let i = 0; i < 3; i++) { const u = i / 3; const q0 = this.proj(ob.x - 0.3 * r, ob.y + r * (0.5 - 0.4 * u), 0.15 - 0.65 * u), q1 = this.proj(ob.x + 0.3 * r, ob.y + r * (0.5 - 0.4 * u), 0.15 - 0.65 * u); ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke(); }
    const [lx, ly] = this.proj(ob.x + r * 0.9, ob.y - r * 0.7, 0); this.spriteLantern(ctx, lx, ly, s * 0.8, t);
  },
  /* Schattenfeuer: die violette Glut des Schattenreichs. Durchgang 0: dunkler Grund, der über alle Kacheln
     gleichmäßig wogt. Durchgang 1 (nach allen Grundflächen): wabernde Glutkerne, die über die Kachelränder
     hinausleuchten, züngelnde Flammen, aufsteigende Funken und ein Lichtsaum auf den Nachbarkacheln. */
  drawShadowFire(ctx, x, y, t, lv, pass) {
    const s = this.scale, hash = this.hashL, poly = [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]];
    const wave = 0.5 + 0.5 * Math.sin(t * 1.2 + (x + y) * 0.35) * Math.cos(t * 0.7 + (x - y) * 0.25), glow = 0.65 + 0.35 * Math.sin(t * 2.4 + (x + y) * 0.5);
    if (pass === 0) { this.fillPoly(ctx, poly, -0.12, `rgb(${Math.round(30 + 14 * wave)},${Math.round(8 + 8 * wave)},${Math.round(64 + 26 * wave)})`); return; }
    const [cx, cy] = this.proj(x + 0.5 + 0.15 * Math.sin(t * 1.1 + x * 1.7 + y * 2.3), y + 0.5 + 0.15 * Math.cos(t * 0.9 + x * 2.3 + y * 1.7), -0.11);
    const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * 1.1); // Glutkern, reicht über den Kachelrand
    rg.addColorStop(0, `rgba(225,165,255,${0.5 * glow})`); rg.addColorStop(0.35, `rgba(150,70,255,${0.42 * glow})`); rg.addColorStop(1, 'rgba(90,30,180,0)');
    ctx.fillStyle = rg; ctx.beginPath(); ctx.ellipse(cx, cy, s * 1.1, s * 1.1 * this.cam.tilt, 0, 0, TAU); ctx.fill();
    ctx.lineCap = 'round'; // züngelnde Flammen
    for (let k = 0; k < 2; k++) {
      const u = (t * 0.35 + hash(x + k * 7, y)) % 1, fx = x + 0.2 + hash(x, y + k * 3) * 0.6, fy = y + 0.85 - u * 0.7;
      ctx.strokeStyle = `rgba(200,150,255,${0.5 * (1 - u) * glow})`; ctx.lineWidth = Math.max(1, s * 0.045);
      const p0 = this.proj(fx - 0.1, fy + 0.1, -0.1), p1 = this.proj(fx + 0.1 * Math.sin(t * 5 + k), fy - 0.05, -0.05), p2 = this.proj(fx + 0.12, fy - 0.2, -0.02 + u * 0.3);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.quadraticCurveTo(p1[0], p1[1], p2[0], p2[1]); ctx.stroke();
    }
    for (let k = 0; k < 2; k++) { // aufsteigende Funken
      const u = (t * (0.28 + 0.12 * hash(x, y + 5 + k)) + hash(x + 3 * k, y)) % 1, px = x + 0.2 + hash(x + k, y + 9) * 0.6 + Math.sin(t * 2 + u * 9) * 0.08, py = y + 0.2 + hash(x + 5, y + k) * 0.6;
      const [ex, ey] = this.proj(px, py, -0.1 + u * 1.4);
      ctx.fillStyle = `rgba(${u < 0.5 ? 240 : 190},${u < 0.5 ? 200 : 130},255,${0.9 * (1 - u)})`; ctx.beginPath(); ctx.arc(ex, ey, Math.max(1, s * (0.05 - u * 0.025)), 0, TAU); ctx.fill();
    }
    ctx.fillStyle = `rgba(160,90,255,${0.14 * glow})`; // Lichtsaum auf angrenzenden Bodenkacheln
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const c = lv.charAt(x + dx + 0.5, y + dy + 0.5); if (!lv.isFloorChar(c) || c === 'l' || c === 'w') continue;
      const rim = dx ? [[x + (dx > 0 ? 1 : 0), y], [x + (dx > 0 ? 1.3 : -0.3), y], [x + (dx > 0 ? 1.3 : -0.3), y + 1], [x + (dx > 0 ? 1 : 0), y + 1]] : [[x, y + (dy > 0 ? 1 : 0)], [x + 1, y + (dy > 0 ? 1 : 0)], [x + 1, y + (dy > 0 ? 1.3 : -0.3)], [x, y + (dy > 0 ? 1.3 : -0.3)]];
      this.pathPoly(ctx, rim, 0.003); ctx.fill();
    }
  },
  /* ---------- Räumliche Dekos: Bäume, Tannen, tote Bäume, Grabsteine, Grabkreuze ----------
     Alle stehen als Körper im Raum: Bildschirmvektoren der Welt-Achsen aus der Kamera, Höhe entlang der Bildhochachse. */
  /* Bildschirmfeste Achsen für Platten: leichte Gierung yaw gegenüber der Kamera, damit immer die Front und eine Kante sichtbar sind,
     egal wie die Kamera gedreht ist (sonst stünde die Platte bei 90° genau in Blickrichtung und wäre nur ein Strich) */
  axes3(yaw = 0.32) { const c = this.cam, z = c.zoom, k = z * (c.zf ?? CAM_ZF), cs = Math.cos(yaw), sn = Math.sin(yaw); return { ex: [cs * z, sn * z * c.tilt], ey: [-sn * z, cs * z * c.tilt], up: k }; },
  /* Senkrechte Platte (Breite w entlang Welt-x, Dicke th entlang Welt-y, Höhe h in Welt-Einheiten) am Bodenpunkt (sx, sy).
     shape(ctx) zeichnet die Form im Einheitsrahmen (u von -0.5..0.5, v von 0..1). Die Kamera-abgewandte Seite wird dunkel
     gezeichnet, dann die Kante als Stapel, zuletzt die sichtbare Front mit Verlauf. tilt = Neigung (Scherung) */
  slab3(ctx, sx, sy, w, th, h, shape, cols, tilt = 0, deco = null) {
    const { ex, ey, up } = this.axes3(), T = [ex[0] * w, ex[1] * w], N = [ey[0] * th, ey[1] * th];
    const frontSign = ey[1] >= 0 ? 1 : -1; // welche Seite zeigt zur Kamera (die Seite, deren Normale bildschirmabwärts zeigt)
    const draw = (ox, oy, fill, withDeco) => {
      ctx.save(); ctx.translate(sx + ox, sy + oy); ctx.transform(T[0], T[1], tilt * up * 0.3, -h * up, 0, 0);
      ctx.beginPath(); shape(ctx); ctx.fillStyle = fill; ctx.fill();
      if (withDeco && deco) deco(ctx);
      ctx.restore();
    };
    const steps = Math.max(3, Math.round(Math.hypot(N[0], N[1]) / 1.5));
    draw(-frontSign * N[0] / 2, -frontSign * N[1] / 2, cols.back, false);
    for (let k = 1; k < steps; k++) { const u = -0.5 + k / steps; draw(frontSign * N[0] * u, frontSign * N[1] * u, cols.side, false); }
    const fx = frontSign * N[0] / 2, fy = frontSign * N[1] / 2;
    const g = ctx.createLinearGradient(sx + fx - Math.abs(T[0]) / 2, 0, sx + fx + Math.abs(T[0]) / 2, 0); g.addColorStop(0, cols.light); g.addColorStop(1, cols.front);
    draw(fx, fy, g, true);
  },
  /* Flacher Sockel unter Grabstein/Kreuz: kleine Platte, auf der das Denkmal steht */
  plinth3(ctx, sx, sy, w, th, h, cols) { this.slab3(ctx, sx, sy, w, th, h, c => { c.rect(-0.5, 0, 1, 1); }, cols); },
  spriteGravestone(ctx, sx, sy, s, d) {
    const k = s / this.scale, seed = d.seed ?? 0.3, tilt = (seed - 0.5) * 0.45, up = this.axes3().up;
    this.shadow(ctx, sx + s * 0.28, sy + s * 0.06, s * 0.5);
    this.plinth3(ctx, sx, sy, 0.86 * k, 0.5 * k, 0.12 * k, { light: '#6e6788', front: '#4c4664', side: '#332e48', back: '#262236' });
    const top = seed > 0.6 ? c => { c.moveTo(-0.5, 0); c.lineTo(-0.5, 0.7); c.lineTo(-0.5, 0.86); c.lineTo(-0.3, 0.86); c.lineTo(-0.3, 1); c.lineTo(0.3, 1); c.lineTo(0.3, 0.86); c.lineTo(0.5, 0.86); c.lineTo(0.5, 0); c.closePath(); } // eckiger Stein mit Absatz
      : c => { c.moveTo(-0.5, 0); c.lineTo(-0.5, 0.62); c.arc(0, 0.62, 0.5, Math.PI, 0, true); c.lineTo(0.5, 0); c.closePath(); }; // runder Stein (Rahmen ist y-gespiegelt, daher gegen den Uhrzeigersinn)
    const deco = c => {
      c.lineWidth = 0.045; c.strokeStyle = 'rgba(20,16,34,0.75)'; c.beginPath(); // Inschrift
      for (let i = 0; i < 4; i++) { const y = 0.78 - i * 0.14, w = 0.3 - (i % 2) * 0.08; c.moveTo(-w, y); c.lineTo(w * (i === 0 ? 0.6 : 1), y); }
      c.stroke();
      c.strokeStyle = 'rgba(255,255,255,0.22)'; c.lineWidth = 0.035; c.beginPath(); c.moveTo(-0.42, 0.04); c.lineTo(-0.42, 0.62); c.stroke(); // Lichtkante links
      if (seed < 0.5) { c.strokeStyle = "rgba(12,8,20,0.8)"; c.lineWidth = 0.02; c.beginPath(); c.moveTo(0.38, 1.0); c.lineTo(0.31, 0.86); c.lineTo(0.35, 0.74); c.stroke(); } // Riss
      c.fillStyle = 'rgba(60,120,70,0.5)'; c.beginPath(); c.ellipse(0.25, 0.1, 0.24, 0.1, 0, 0, Math.PI * 2); c.ellipse(-0.35, 0.06, 0.12, 0.06, 0, 0, Math.PI * 2); c.fill(); // Moos
    };
    ctx.save(); ctx.translate(0, -0.12 * k * up); // steht auf dem Sockel
    this.slab3(ctx, sx, sy, 0.66 * k, 0.28 * k, 0.8 * k, top, { light: '#a49cbe', front: '#66607f', side: '#3e3856', back: '#2c2740' }, tilt, deco);
    ctx.restore();
  },
  spriteGraveCross(ctx, sx, sy, s, d) {
    const k = s / this.scale, tilt = ((d.seed ?? 0.5) - 0.5) * 0.3, up = this.axes3().up;
    this.shadow(ctx, sx + s * 0.25, sy + s * 0.05, s * 0.36);
    this.plinth3(ctx, sx, sy, 0.6 * k, 0.42 * k, 0.12 * k, { light: '#6e6788', front: '#4c4664', side: '#332e48', back: '#262236' });
    const shape = c => { c.moveTo(-0.15, 0); c.lineTo(-0.15, 0.56); c.lineTo(-0.5, 0.56); c.lineTo(-0.5, 0.76); c.lineTo(-0.15, 0.76); c.lineTo(-0.15, 1); c.lineTo(0.15, 1); c.lineTo(0.15, 0.76); c.lineTo(0.5, 0.76); c.lineTo(0.5, 0.56); c.lineTo(0.15, 0.56); c.lineTo(0.15, 0); c.closePath(); };
    const deco = c => { c.strokeStyle = 'rgba(255,255,255,0.2)'; c.lineWidth = 0.035; c.beginPath(); c.moveTo(-0.1, 0.04); c.lineTo(-0.1, 0.55); c.moveTo(-0.45, 0.6); c.lineTo(-0.45, 0.73); c.stroke();
      c.fillStyle = 'rgba(60,120,70,0.5)'; c.beginPath(); c.ellipse(0.05, 0.06, 0.13, 0.06, 0, 0, Math.PI * 2); c.fill(); };
    ctx.save(); ctx.translate(0, -0.12 * k * up);
    this.slab3(ctx, sx, sy, 0.76 * k, 0.24 * k, 1.0 * k, shape, { light: '#948caa', front: '#5c5776', side: '#38334e', back: '#272238' }, tilt, deco);
    ctx.restore();
  },
  /* Kugelkrone: Kugel mit Lichtkante oben links und Schattenkern unten rechts */
  ball3(ctx, cx, cy, r, light, mid, dark) {
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r * 1.05);
    g.addColorStop(0, light); g.addColorStop(0.55, mid); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
  },
  /* Kegel mit Schattenseite und gewölbter Unterkante */
  cone3(ctx, cx, baseY, w, h, light, dark, snow) {
    const t = this.cam.tilt, ry = w * 0.32 * t;
    ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(cx, baseY, w, ry, 0, 0, TAU); ctx.fill(); // Unterseite
    const g = ctx.createLinearGradient(cx - w, 0, cx + w, 0); g.addColorStop(0, light); g.addColorStop(0.45, light); g.addColorStop(0.6, dark); g.addColorStop(1, dark);
    ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(cx - w, baseY); ctx.lineTo(cx, baseY - h); ctx.lineTo(cx + w, baseY); ctx.ellipse(cx, baseY, w, ry, 0, 0, Math.PI, false); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(cx - w * 0.8, baseY - h * 0.05); ctx.lineTo(cx - w * 0.05, baseY - h * 0.95); ctx.stroke(); // Lichtkante
    if (snow) { ctx.fillStyle = '#f4faff'; ctx.beginPath(); ctx.moveTo(cx - w * 0.55, baseY - h * 0.4); ctx.quadraticCurveTo(cx, baseY - h * 0.25, cx + w * 0.55, baseY - h * 0.4); ctx.lineTo(cx, baseY - h); ctx.closePath(); ctx.fill(); }
  },
  spriteTree(ctx, sx, sy, s, d, t) {
    const k = s / this.scale;
    this.shadow(ctx, sx + s * 0.3, sy + s * 0.05, s * 0.65);
    this.slab3(ctx, sx, sy, 0.22 * k, 0.22 * k, 1.05 * k, c => { c.rect(-0.5, 0, 1, 1); }, { light: '#8a5c33', front: '#6b4423', side: '#4a2e14', back: '#3a2410' });
    const cols = d.glow ? [['#8fe0e0', '#3fb3b0', '#1f6a70'], ['#6fd0d0', '#2e8f9a', '#164a55']] : [['#8fe07a', '#3f9a4e', '#1f5a2c'], ['#63c261', '#2f7a3e', '#163f20']];
    const blobs = [[0.25, -1.75, 0.48, 1], [-0.2, -1.72, 0.5, 1], [0.4, -1.2, 0.52, 0], [-0.38, -1.15, 0.5, 0], [0, -1.35, 0.72, 0], [-0.1, -1.85, 0.34, 1]];
    for (const [ox, oy, r, li] of blobs) this.ball3(ctx, sx + ox * s, sy + oy * s, r * s, cols[li][0], cols[li][1], cols[li][2]);
    if (d.glow) for (let i = 0; i < 4; i++) { const a = t * 1.5 + i * 1.6; ctx.fillStyle = 'rgba(255,255,180,0.9)'; ctx.beginPath(); ctx.arc(sx + Math.cos(a) * s * 0.7, sy - s * 1.3 + Math.sin(a * 1.3) * s * 0.4, s * 0.06, 0, TAU); ctx.fill(); }
  },
  spritePine(ctx, sx, sy, s, c1, c2, snow = false) {
    const k = s / this.scale;
    this.shadow(ctx, sx + s * 0.25, sy + s * 0.04, s * 0.5);
    this.slab3(ctx, sx, sy, 0.18 * k, 0.18 * k, 0.5 * k, c => { c.rect(-0.5, 0, 1, 1); }, { light: '#7a5230', front: '#5a3a1e', side: '#3e2712', back: '#2e1c0c' });
    for (let i = 0; i < 3; i++) { const w = s * (0.75 - i * 0.18), y0 = sy - s * (0.45 + i * 0.55); this.cone3(ctx, sx, y0, w, s * 0.8, i % 2 ? c1 : shade(c1, 1.15), shade(c2, 0.8), snow); }
  },
  spriteDeadTree(ctx, sx, sy, s, col = '#2a2030', embers = false) {
    this.shadow(ctx, sx + s * 0.2, sy + s * 0.03, s * 0.4);
    const light = shade(col, 1.9), dark = shade(col, 0.6);
    const limb = (x0, y0, x1, y1, w0, w1) => { // sich verjüngender Ast mit Licht- und Schattenseite
      const dx = x1 - x0, dy = y1 - y0, L = Math.hypot(dx, dy) || 1, nx = -dy / L, ny = dx / L;
      const g = ctx.createLinearGradient(x0 + nx * w0, y0 + ny * w0, x0 - nx * w0, y0 - ny * w0); g.addColorStop(0, light); g.addColorStop(0.5, col); g.addColorStop(1, dark);
      ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0 + nx * w0, y0 + ny * w0); ctx.lineTo(x1 + nx * w1, y1 + ny * w1); ctx.lineTo(x1 - nx * w1, y1 - ny * w1); ctx.lineTo(x0 - nx * w0, y0 - ny * w0); ctx.closePath(); ctx.fill();
      ctx.fillStyle = dark; ctx.beginPath(); ctx.ellipse(x0, y0, w0, w0 * 0.45, 0, 0, TAU); ctx.fill();
    };
    limb(sx, sy, sx + s * 0.1, sy - s * 1.2, s * 0.13, s * 0.06);
    limb(sx + s * 0.05, sy - s * 0.7, sx - s * 0.5, sy - s * 1.3, s * 0.06, s * 0.025);
    limb(sx + s * 0.08, sy - s * 0.95, sx + s * 0.55, sy - s * 1.5, s * 0.055, s * 0.025);
    limb(sx + s * 0.1, sy - s * 1.2, sx - s * 0.1, sy - s * 1.7, s * 0.05, s * 0.02);
    limb(sx - s * 0.3, sy - s * 1.05, sx - s * 0.62, sy - s * 1.0, s * 0.035, s * 0.015);
    if (embers) { ctx.fillStyle = 'rgba(255,120,40,0.85)'; for (const [ox, oy] of [[-0.5, -1.3], [0.55, -1.5], [-0.1, -1.7]]) { ctx.beginPath(); ctx.arc(sx + ox * s, sy + oy * s, s * 0.05, 0, TAU); ctx.fill(); } }
  },
});
