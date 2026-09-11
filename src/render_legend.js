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
      ctx.fillStyle = `rgba(220,230,255,${0.3 * a})`; ctx.fillRect(0, 0, w, h);
      const x0 = w * (0.15 + hash(cyc, 4) * 0.7);
      const zig = [[x0, 0]]; let x = x0, y = 0;
      for (let k = 0; k < 8; k++) { x += (hash(cyc, 10 + k) - 0.5) * 70; y += h * 0.07; zig.push([x, y]); }
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      for (const [lw, col] of [[9, `rgba(255,240,170,${0.28 * a})`], [4, `rgba(255,250,210,${0.7 * a})`], [1.8, `rgba(255,255,255,${a})`]]) {
        ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); zig.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke();
      }
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
      this.fillPoly(ctx, poly, 0.006, `rgba(255,255,235,${0.95 - 0.5 * ob.p})`, false);
      ctx.strokeStyle = `rgba(255,240,140,${0.9 * (1 - ob.p)})`; ctx.lineWidth = Math.max(2, s * 0.1); this.pathPoly(ctx, poly, 0.007); ctx.stroke();
    }
  },
  drawLightningBolt(ctx, ob, t) {
    if (ob.state !== 'strike') return;
    const s = this.scale, k = Math.floor(t * 40), fade = 1 - ob.p * 0.5;
    const [gx, gy] = this.proj(ob.x, ob.y, 0), [tx, ty] = this.proj(ob.x, ob.y, 12);
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    // Zickzack einmal berechnen, damit alle Lagen und die Äste demselben Verlauf folgen
    const N = 9, main = [[tx, ty]];
    for (let i = 1; i <= N; i++) { const u = i / N; main.push([tx + (gx - tx) * u + (this.hashL(i, k) - 0.5) * s * 1.7 * (1 - u * 0.6), ty + (gy - ty) * u]); }
    main.push([gx, gy]);
    const branches = []; // Nebenäste zweigen im oberen Teil ab und laufen schräg aus
    for (let b = 0; b < 3; b++) {
      const base = main[2 + b * 2], dir = this.hashL(b, k) > 0.5 ? 1 : -1, n = 2 + Math.floor(this.hashL(b, k + 5) * 2), br = [base];
      for (let j = 1; j <= n; j++) br.push([base[0] + dir * j * s * (0.45 + this.hashL(b + j, k) * 0.5), base[1] + j * s * (0.4 + this.hashL(b, k + j) * 0.35)]);
      branches.push(br);
    }
    const stroke = (pts, lw, col) => { ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.stroke(); };
    // vier Lagen: breiter Schein, Glut, heller Mantel, gleißender Kern
    for (const [lw, col] of [[Math.max(10, s * 0.62), `rgba(255,220,90,${0.2 * fade})`], [Math.max(6, s * 0.34), `rgba(255,238,150,${0.45 * fade})`],
      [Math.max(3, s * 0.16), `rgba(255,252,215,${0.85 * fade})`], [Math.max(1.5, s * 0.07), `rgba(255,255,255,${fade})`]]) {
      stroke(main, lw, col);
      for (const br of branches) stroke(br, lw * 0.55, col);
    }
    // Einschlagstelle: Lichtkugel, Druckwelle über den Boden und wegspritzende Funken
    const g = ctx.createRadialGradient(gx, gy, 0, gx, gy, s * (1.2 + ob.p * 1.6));
    g.addColorStop(0, `rgba(255,255,255,${0.95 - 0.8 * ob.p})`); g.addColorStop(0.4, `rgba(255,235,120,${0.5 - 0.45 * ob.p})`); g.addColorStop(1, 'rgba(255,200,60,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, s * (1.2 + ob.p * 1.6), 0, TAU); ctx.fill();
    ctx.strokeStyle = `rgba(255,245,180,${0.8 * (1 - ob.p)})`; ctx.lineWidth = Math.max(1.5, s * 0.07);
    ctx.beginPath(); ctx.ellipse(gx, gy, s * (0.3 + ob.p * 2.2), s * (0.3 + ob.p * 2.2) * this.cam.tilt, 0, 0, TAU); ctx.stroke();
    ctx.strokeStyle = `rgba(255,255,220,${0.85 * (1 - ob.p)})`; ctx.lineWidth = Math.max(1.5, s * 0.05);
    for (let i = 0; i < 9; i++) {
      const a = i * 0.7 + this.hashL(i, k) * 0.6, r0 = s * (0.25 + ob.p * 0.9), r1 = r0 + s * (0.5 + this.hashL(i, k + 3) * 0.7);
      ctx.beginPath(); ctx.moveTo(gx + Math.cos(a) * r0, gy + Math.sin(a) * r0 * this.cam.tilt);
      ctx.lineTo(gx + Math.cos(a) * r1, gy + Math.sin(a) * r1 * this.cam.tilt - s * 0.5 * (1 - ob.p)); ctx.stroke();
    }
    ctx.fillStyle = `rgba(255,255,255,${0.3 * (1 - ob.p)})`; ctx.fillRect(0, 0, this.w, this.h); // Bildblitz
  },
  /* Aufwind: ein Schacht mit Metallrost, aus dem eine Böe schießt. Drei Luftsträhnen schrauben sich als Wirbel
     nach oben und verjüngen sich, Federn tanzen darin, Druckwellen laufen über den Boden und drei Pfeile zeigen
     die Richtung. Hebt der Wirbel gerade einen Ball, bläst er kurz auf und ein greller Ring springt nach außen. */
  drawUpdraft(ctx, ob, t) {
    const s = this.scale, cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2;
    const R = Math.min(ob.w, ob.h) * 0.42, H = 3.4, pulse = 0.55 + 0.45 * Math.sin(t * 2.4);
    const boom = Math.max(0, 1 - (t - (ob.liftAt ?? -10)) / 0.6); // kurz nach dem Abheben
    const poly = [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h]];
    const [c0, c1] = this.proj(cx, cy, 0.004);
    // Schacht: dunkler Grund, darüber der blaue Schein aus der Tiefe
    this.fillPoly(ctx, poly, 0.003, 'rgba(12,16,30,0.8)', false);
    const g = ctx.createRadialGradient(c0, c1, 0, c0, c1, s * R * 2.4);
    g.addColorStop(0, `rgba(205,245,255,${0.45 + 0.2 * pulse + 0.45 * boom})`);
    g.addColorStop(0.45, `rgba(110,190,255,${0.3 + 0.12 * pulse})`);
    g.addColorStop(1, 'rgba(70,140,255,0)');
    ctx.save(); this.pathPoly(ctx, poly, 0.004); ctx.clip(); ctx.fillStyle = g; ctx.fillRect(0, 0, this.w, this.h); ctx.restore();
    // Metallrost quer über den Schacht
    ctx.strokeStyle = 'rgba(38,46,70,0.92)'; ctx.lineWidth = Math.max(2, s * 0.09);
    const bars = Math.max(3, Math.round(ob.h / 0.42));
    for (let i = 1; i < bars; i++) {
      const y = ob.y + (i / bars) * ob.h, [a0, a1] = this.proj(ob.x, y, 0.006), [b0, b1] = this.proj(ob.x + ob.w, y, 0.006);
      ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
    }
    ctx.strokeStyle = `rgba(200,240,255,${0.7 + 0.3 * pulse})`; ctx.lineWidth = Math.max(2, s * 0.08); this.pathPoly(ctx, poly, 0.007); ctx.stroke();
    // Druckwellen über dem Rost
    for (let i = 0; i < 2; i++) {
      const u = (t * 0.85 + i * 0.5) % 1, rr = s * R * (0.3 + u * 1.6);
      ctx.strokeStyle = `rgba(185,238,255,${0.5 * (1 - u)})`; ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.beginPath(); ctx.ellipse(c0, c1, rr, rr * this.cam.tilt, 0, 0, TAU); ctx.stroke();
    }
    if (boom > 0) { // greller Ring beim Abheben
      const rr = s * R * (0.4 + (1 - boom) * 3.2);
      ctx.strokeStyle = `rgba(255,255,255,${0.85 * boom})`; ctx.lineWidth = Math.max(2, s * 0.1 * boom);
      ctx.beginPath(); ctx.ellipse(c0, c1, rr, rr * this.cam.tilt, 0, 0, TAU); ctx.stroke();
    }
    // Luftsäule: ein Trichter, der sich nach oben verjüngt – so ist die Böe auch von Weitem zu sehen
    const [bx, by] = this.proj(cx, cy, 0.02), [ux, uy] = this.proj(cx, cy, H);
    const rb = s * R * 1.1, rt = s * R * 0.45;
    const fg = ctx.createLinearGradient(0, by, 0, uy);
    fg.addColorStop(0, `rgba(175,232,255,${0.26 + 0.1 * pulse + 0.22 * boom})`);
    fg.addColorStop(0.55, `rgba(150,215,255,${0.12 + 0.06 * pulse})`);
    fg.addColorStop(1, 'rgba(160,220,255,0)');
    ctx.fillStyle = fg; ctx.beginPath();
    ctx.moveTo(bx - rb, by); ctx.quadraticCurveTo(bx - rb * 0.75, (by + uy) / 2, ux - rt, uy);
    ctx.lineTo(ux + rt, uy); ctx.quadraticCurveTo(bx + rb * 0.75, (by + uy) / 2, bx + rb, by); ctx.closePath(); ctx.fill();
    // Wirbel: drei Strähnen, die sich nach oben schrauben und dünner werden
    ctx.lineCap = 'round';
    const swirl = (u, k) => { const a = t * 2.6 + k * TAU / 3 + u * 5.4, r = R * (1 - u * 0.55) * (1 + 0.4 * boom); return this.proj(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 0.05 + u * H * (1 + 0.25 * boom)); };
    for (let k = 0; k < 3; k++) for (let j = 0; j < 24; j++) {
      const u0 = j / 24, p0 = swirl(u0, k), p1 = swirl((j + 1) / 24, k), fade = (1 - u0 * 0.75) * (0.65 + 0.35 * pulse) * (0.75 + 0.45 * boom);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]);
      ctx.strokeStyle = `rgba(140,205,255,${0.55 * fade})`; ctx.lineWidth = Math.max(2, s * 0.2 * (1 - u0 * 0.6)); ctx.stroke();
      ctx.strokeStyle = `rgba(240,252,255,${0.95 * fade})`; ctx.lineWidth = Math.max(1, s * 0.075 * (1 - u0 * 0.6)); ctx.stroke();
    }
    // Federn, die im Wirbel nach oben tanzen
    for (let i = 0; i < 10; i++) {
      const life = (t * (0.5 + this.hashL(i, 7) * 0.35) + this.hashL(i, 1)) % 1;
      const a = t * 3 + this.hashL(i, 2) * TAU + life * 4.5, r = R * (0.35 + this.hashL(i, 3) * 0.75) * (1 - life * 0.5);
      const [px, py] = this.proj(cx + Math.cos(a) * r, cy + Math.sin(a) * r * 0.9, 0.1 + life * H);
      ctx.globalAlpha = (1 - life) * (0.35 + 0.65 * Math.sin(life * Math.PI));
      ctx.strokeStyle = '#eaf8ff'; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); ctx.arc(px, py, s * (0.08 + this.hashL(i, 4) * 0.06), a, a + 2.4); ctx.stroke();
    }
    ctx.globalAlpha = 1;
    // drei Pfeile in der Mitte, die nach oben davonziehen (immer zur Kamera ausgerichtet)
    for (let i = 0; i < 3; i++) {
      const life = (t * 0.95 + i / 3) % 1, [m0, m1] = this.proj(cx, cy, 0.15 + life * H * 0.85), wd = s * 0.4 * (1 - life * 0.35);
      ctx.globalAlpha = (1 - life) * 0.9;
      ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = Math.max(2, s * 0.09 * (1 - life * 0.4));
      ctx.beginPath(); ctx.moveTo(m0 - wd, m1 + wd * 0.8); ctx.lineTo(m0, m1); ctx.lineTo(m0 + wd, m1 + wd * 0.8); ctx.stroke();
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
    for (const side of [-1, 1]) this.spriteBrazier(ctx, { x: px + side * (Wd / 2 + 0.1), y: fy + 0.2, s: 0.9 }, t, crypt ? ['#a24bff', '#e0b8ff', '170,90,255'] : ['#4fc3ff', '#b7ecff', '80,190,255']);
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
  /* tuch überschreibt die Farbe des Wimpels – das Kolosseum hängt rote Banner auf, sonst bleibt es
     bei den dunkelblau-violetten des Schattenreichs. */
  spriteBanner(ctx, sx, sy, s, d, t, tuch) {
    ctx.strokeStyle = tuch ? '#8a6a3a' : '#3a3c4a'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.beginPath(); ctx.moveTo(sx, sy); ctx.lineTo(sx, sy - s * 1.8); ctx.stroke();
    const sw = Math.sin(t * 2 + sx) * s * 0.06;
    ctx.fillStyle = tuch || ((d.seed || 0) > 0.5 ? '#5a2a7a' : '#2a3a8a'); ctx.beginPath(); ctx.moveTo(sx, sy - s * 1.8); ctx.lineTo(sx + s * 0.55 + sw, sy - s * 1.7); ctx.lineTo(sx + s * 0.55 + sw, sy - s * 0.9); ctx.lineTo(sx + s * 0.28, sy - s * 1.05); ctx.lineTo(sx, sy - s * 0.95); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#ffe45e'; ctx.beginPath(); ctx.arc(sx + s * 0.27 + sw * 0.5, sy - s * 1.35, s * 0.1, 0, TAU); ctx.fill();
  },
  /* Säule als echter Körper statt als flaches Bildchen: Sockel, Schaft und Kapitell sind drei
     Prismen in Weltkoordinaten. Damit steht sie in derselben Sicht wie Mauern und Türme, dreht
     sich mit der Kamera mit und bekommt ihre Schattenseite von selbst. Der Schaft hat acht Seiten
     – die einzeln schattierten Flächen lesen sich wie die Kanneluren einer echten Säule.
     cols: [Deck des Schafts, Schattenseite, Deck von Sockel und Kapitell, Umriss] – ohne
     Angabe die dunkle Säule des Schattenreichs, mit Angabe der helle Kalkstein der Arena. */
  spritePillar(ctx, d, cols) {
    const c = cols || ['#5e5474', '#2a2438', '#6e6488', '#14101e'];
    const g = d.s || 1, x = d.x, y = d.y;
    const hoch = 2.1 * g, rSchaft = 0.23 * g, rBreit = 0.33 * g;
    const sockel = 0.18 * g, kapitell = 0.19 * g;
    this.isoEllipse(ctx, x, y, 0.004, rBreit * 1.5, 'rgba(0,0,0,0.24)');
    this.prism(ctx, this.circlePoly(x, y, rBreit, 8, 0.39), 0, sockel, c[2], c[1], { outline: c[3] });
    this.prism(ctx, this.circlePoly(x, y, rSchaft, 8, 0.39), sockel, hoch, c[0], c[1], { outline: c[3] });
    this.prism(ctx, this.circlePoly(x, y, rBreit, 8, 0.39), sockel + hoch, kapitell, c[2], c[1], { outline: c[3] });
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
  /* Räumliche Riesenfledermaus im kantigen Stil des Krokodils: Rumpf, Kopf und Ohren als Quader, Flughäute als flache
     Dreiecksplatten zwischen Schulter und Fingerspitzen (die mit dem Flügelschlag steigen und sinken), Finger als Balken.
     Bodenpunkt (cx, cy), Höhe z, Flugrichtung (dx, dy); o.r = Größe, o.flap = Flügelschlag, o.spread = Spannweite, o.dive = Stoß */
  drawBigBat3(ctx, cx, cy, z, dx, dy, o) {
    const s = this.scale, nx = -dy, ny = dx, r = o.r || 1, flap = o.flap, sp = o.spread, dive = o.dive || 0;
    const G = (a, b) => [cx + (dx * a + nx * b) * r, cy + (dy * a + ny * b) * r];
    const W = (a, b, dz = 0) => [...G(a, b), z + dz * r];
    const P = v => this.proj(v[0], v[1], v[2]);
    const box = (a0, a1, b0, b1, z0, h, top, side, opts) => this.prism(ctx, [G(a0, b0), G(a1, b0), G(a1, b1), G(a0, b1)], z + z0 * r, h * r, top, side, opts);
    const plate = (pts, fill, edge) => { ctx.beginPath(); pts.forEach((q, i) => { const p = P(q); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); }); ctx.closePath(); ctx.fillStyle = fill; ctx.fill(); if (edge) { ctx.strokeStyle = edge; ctx.lineWidth = 1; ctx.stroke(); } };
    const bar = (v0, v1, wd, col) => { const p0 = P(v0), p1 = P(v1); ctx.strokeStyle = col; ctx.lineWidth = Math.max(1.5, s * wd * r); ctx.lineCap = 'butt'; ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke(); };
    const fur = ['#5a4a78', '#2a1e3a'], dark = ['#3e3056', '#1a1226'], skin = ['#4a3a66', '#3a2c52', '#2e2242'], line = '#120c1a';
    const wing = sd => { // Schulter, drei Fingerspitzen, Ansatz am Hinterleib; drei ebene Platten dazwischen, Finger als Balken
      const S = W(0.15, sd * 0.3, 0.32), T1 = W(0.5, sd * 1.8 * sp, 0.3 + flap * 0.7), T2 = W(-0.05, sd * 1.65 * sp, 0.2 + flap * 0.55), T3 = W(-0.5, sd * 1.15 * sp, 0.12 + flap * 0.35), R = W(-0.8, sd * 0.25, 0.15);
      plate([S, T1, T2], skin[0], line); plate([S, T2, T3], skin[1], line); plate([S, T3, R], skin[2], line);
      for (const T of [T1, T2, T3]) bar(S, T, 0.07, '#1a1226');
      bar(S, R, 0.06, '#1a1226');
      for (const T of [T1, T2, T3]) { const [tx, ty] = P(T); ctx.fillStyle = '#c8c0d8'; ctx.beginPath(); ctx.arc(tx, ty, Math.max(1.5, s * 0.045 * r), 0, TAU); ctx.fill(); } // Krallen an den Fingerspitzen
    };
    this.isoEllipse(ctx, cx, cy, 0.004, (0.5 + 0.9 * dive) * r, `rgba(0,0,0,${0.12 + 0.28 * dive})`, (0.5 + 0.9 * dive) * r * 0.6);
    const wings = [-1, 1].map(sd => ({ sd, k: this.depth(cx + nx * sd * r, cy + ny * sd * r) })).sort((u, v) => u.k - v.k);
    wing(wings[0].sd); // fernerer Flügel zuerst
    box(-0.95, -0.45, -0.14, 0.14, 0.1, 0.24, dark[0], dark[1]);                        // Schwanzstummel
    box(-0.5, 0.35, -0.3, 0.3, 0.0, 0.55, fur[0], fur[1], { outline: line });            // Rumpf
    box(-0.3, 0.2, -0.2, 0.2, 0.55, 0.12, '#6e5e8e', '#3c2e54');                         // Rückenkamm
    box(0.35, 0.95, -0.24, 0.24, 0.12, 0.46, fur[0], fur[1], { outline: line });         // Kopf
    box(0.95, 1.12, -0.14, 0.14, 0.2, 0.22, dark[0], dark[1]);                           // Schnauze
    for (const sd of [-1, 1]) box(0.45, 0.62, sd * 0.1, sd * 0.24, 0.58, 0.45, '#8a6a9a', '#3c2e54', { outline: line }); // Ohren
    for (const sd of [-1, 1]) { // rot glühende Augen an der Kopffront
      const [ex, ey] = P(W(0.96, sd * 0.12, 0.44)), g = ctx.createRadialGradient(ex, ey, 0, ex, ey, s * 0.16 * r);
      g.addColorStop(0, 'rgba(255,90,120,0.95)'); g.addColorStop(1, 'rgba(255,60,90,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(ex, ey, s * 0.16 * r, 0, TAU); ctx.fill();
      ctx.fillStyle = '#ff5f7a'; ctx.fillRect(ex - s * 0.045 * r, ey - s * 0.035 * r, s * 0.09 * r, s * 0.07 * r);
    }
    ctx.fillStyle = '#f4f0e0'; for (const sd of [-1, 1]) plate([W(1.12, sd * 0.1, 0.2), W(1.12, sd * 0.03, 0.2), W(1.12, sd * 0.065, 0.02)], '#f4f0e0'); // Fangzähne
    if (dive > 0.2) for (const sd of [-1, 1]) { bar(W(0.05, sd * 0.16, 0.0), W(0.15, sd * 0.22, -0.35 * dive), 0.06, '#c8c0d8'); bar(W(0.15, sd * 0.22, -0.35 * dive), W(0.05, sd * 0.28, -0.45 * dive), 0.05, '#c8c0d8'); } // Krallen beim Stoß
    wing(wings[1].sd); // näherer Flügel zuletzt
  },
  /* Riesenfledermaus (sharkjump-Stil 'bat'): hängt am Rand ihres Jagdgrunds, schießt im Takt von der Seite quer über die Lücke
     und packt alles, was gerade darüber fliegt (wie Hai und Krokodil) */
  drawBatSwoop(ctx, ob, t) {
    const s = this.scale, vert = ob.axis === 'y', span = (vert ? ob.h : ob.w) / 2 + 0.9, dx = vert ? 0 : 1, dy = vert ? 1 : 0;
    if (!ob.jumping) { // lauert am Startrand, hoch über dem Boden, mit leichtem Flattern
      const gx = vert ? ob.x : ob.x - span, gy = vert ? ob.y - span : ob.y, z = 2.3 + 0.15 * Math.sin(t * 3);
      this.drawBigBat3(ctx, gx, gy, z, dx, dy, { r: 0.8, flap: Math.sin(t * 7) * 0.35, spread: 0.75, dive: 0 });
      return;
    }
    // Sturzflug: kommt hoch vom Rand, taucht in der Mitte bis knapp über den Boden und steigt drüben wieder auf
    const p = ob.p, dip = 4 * p * (1 - p), z = 0.35 + 2.1 * (1 - dip), r = 0.9 + 0.35 * dip;
    if (dip > 0.5) { const [bx, by] = this.proj(ob.px, ob.py, z + 0.4); ctx.strokeStyle = `rgba(230,200,255,${0.5 * (dip - 0.5)})`; ctx.lineWidth = Math.max(1, s * 0.03); for (let i = 0; i < 3; i++) { const u = ((t * 2.5 + i / 3) % 1), rr = s * (0.6 + u * 1.5); ctx.globalAlpha = 1 - u; ctx.beginPath(); ctx.arc(bx, by, rr, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke(); } ctx.globalAlpha = 1; } // Kreischen
    this.drawBigBat3(ctx, ob.px, ob.py, z, dx, dy, { r, flap: Math.sin(t * 22) * 0.5 - 0.3 * dip, spread: 1.0 + 0.25 * dip, dive: dip });
    if (dip > 0.85) { const [gx, gy] = this.proj(ob.px, ob.py, 0.05), k = (dip - 0.85) / 0.15; ctx.fillStyle = `rgba(120,90,160,${0.5 * k})`; for (let i = 0; i < 8; i++) { const a = i * 0.8 + t, rr = s * (0.4 + 0.7 * k); ctx.beginPath(); ctx.ellipse(gx + Math.cos(a) * rr, gy + Math.sin(a) * rr * 0.5, s * 0.1, s * 0.05, a, 0, TAU); ctx.fill(); } } // Staub am Boden
  },
  /* Basilisk: die Riesenarmbrust des Schattenreichs (Kanonen-Stil 'ballista'). Schwerer Schaft auf einem Bock, zwei Bogenarme,
     Sehne mit Winde; rollt der Ball in die Rinne, wird die Sehne gespannt und schnellt vor. Der Schaft pendelt wie das Kanonenrohr. */
  drawBallista(ctx, ob, t) {
    const s = this.scale, dx = Math.cos(ob.angle), dy = Math.sin(ob.angle), nx = -dy, ny = dx;
    const W = (a, b) => [ob.x + dx * a + nx * b, ob.y + dy * a + ny * b];
    const quad = (a0, b0, a1, b1, wd) => [W(a0, b0 - wd / 2), W(a1, b1 - wd / 2), W(a1, b1 + wd / 2), W(a0, b0 + wd / 2)];
    const wood = ['#5a4470', '#2e2240'], iron = ['#6a6a80', '#2c2c3a'], line = '#150e1e';
    const since = t - (ob.firedAt ?? -10), snap = since < 0.25 ? 1 - since / 0.25 : 0;
    // Bock: Platte und zwei Stützböcke
    this.prism(ctx, this.circlePoly(ob.x, ob.y, 0.85, 8), 0, 0.22, wood[0], wood[1], { outline: line });
    for (const a of [-0.55, 0.45]) for (const b of [-0.45, 0.45]) this.prism(ctx, quad(a - 0.08, b, a + 0.08, b, 0.16), 0.22, 0.45, wood[0], wood[1]);
    // Schaft mit Rinne
    this.prism(ctx, quad(-1.0, 0, 1.45, 0, 0.36), 0.67, 0.2, wood[0], wood[1], { outline: line });
    this.prism(ctx, quad(-0.6, 0, 1.4, 0, 0.14), 0.87, 0.03, '#1a1224', '#1a1224');
    for (const a of [-0.7, 0.2, 1.1]) this.prism(ctx, quad(a - 0.04, 0, a + 0.04, 0, 0.4), 0.66, 0.23, iron[0], iron[1]); // Eisenbänder
    // Bogenarme: von der Schaftspitze schräg nach hinten außen
    for (const sd of [-1, 1]) {
      this.prism(ctx, [W(0.95, sd * 0.12), W(1.05, sd * 0.2), W(0.55, sd * 1.35), W(0.4, sd * 1.25)], 0.72, 0.14, '#7a5a3a', '#3e2a16', { outline: line });
      this.prism(ctx, this.circlePoly(...W(0.47, sd * 1.3), 0.09, 6), 0.7, 0.2, iron[0], iron[1]);
    }
    // Sehne: gespannt (geladen) läuft sie zum Nocken am Schaftende, sonst locker vorn; beim Schuss schnellt sie vor
    const nock = ob.loaded ? -0.55 : 0.75 + 0.5 * snap;
    const [l0, l1] = this.proj(...W(0.47, -1.3), 0.82), [r0, r1] = this.proj(...W(0.47, 1.3), 0.82), [m0, m1] = this.proj(...W(nock, 0), 0.86);
    ctx.strokeStyle = '#e8e0c8'; ctx.lineWidth = Math.max(1.5, s * 0.04); ctx.beginPath(); ctx.moveTo(l0, l1); ctx.lineTo(m0, m1); ctx.lineTo(r0, r1); ctx.stroke();
    // Winde am Schaftende
    this.prism(ctx, this.circlePoly(...W(-0.95, 0), 0.22, 8), 0.72, 0.16, iron[0], iron[1], { outline: line });
    const [wx, wy] = this.proj(...W(-0.95, 0), 0.9), spin = ob.loaded ? t * 6 : 0;
    ctx.strokeStyle = '#cfcfe0'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.beginPath(); for (let k = 0; k < 4; k++) { const a = spin + k * Math.PI / 2; ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * s * 0.2, wy + Math.sin(a) * s * 0.2 * this.cam.tilt); } ctx.stroke();
    // Basiliskenkopf als Zierde an der Schaftspitze
    const [bx, by] = this.proj(...W(1.5, 0), 0.85); ctx.fillStyle = '#3f7a4e'; ctx.beginPath(); ctx.ellipse(bx, by, s * 0.16, s * 0.12, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ff5a3a'; for (const sd of [-1, 1]) { ctx.beginPath(); ctx.arc(bx + sd * s * 0.07, by - s * 0.03, s * 0.03, 0, TAU); ctx.fill(); }
    if (ob.loaded) { // violette Rune glüht auf dem Schaft, solange gespannt wird
      const f = 0.6 + 0.4 * Math.sin(t * 14), [gx, gy] = this.proj(...W(0.1, 0), 0.9), g = ctx.createRadialGradient(gx, gy, 0, gx, gy, s * 0.7);
      g.addColorStop(0, `rgba(200,120,255,${0.45 * f})`); g.addColorStop(1, 'rgba(140,60,255,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(gx, gy, s * 0.7, 0, TAU); ctx.fill();
    }
    if (snap > 0) { ctx.fillStyle = `rgba(230,220,255,${0.6 * snap})`; const [fx, fy] = this.proj(...W(1.6, 0), 0.9); ctx.beginPath(); ctx.ellipse(fx, fy, s * 0.5 * (1.3 - snap), s * 0.25 * (1.3 - snap), 0, 0, TAU); ctx.fill(); }
  },
  /* Schwarzes Schloss: Torbau mit zwei Rundtürmen, Spitzdächern, Zinnen, glühenden Fenstern, Fallgitter halb im Bogen und
     Totenschädel über dem Tor. Die Front zeigt nach +y; die Tür-Auslösung liegt davor. */
  drawCastleGate(ctx, ob, t) {
    const s = this.scale, px = ob.px, py = ob.py, Wd = ob.gw || 3.6, D = 1.3, H = 3.4, top = '#4a4064', side = '#1c1830', line = '#07050c';
    const rect = (x0, y0, x1, y1) => [[x0, y0], [x1, y0], [x1, y1], [x0, y1]];
    const flick = k => 0.6 + 0.35 * Math.sin(t * 3.1 + k * 1.7);
    for (const sd of [-1, 1]) { // Rundtürme
      const tx = px + sd * (Wd / 2 + 1.05);
      this.prism(ctx, this.circlePoly(tx, py - 0.2, 1.0, 10), 0, H + 1.4, top, side, { outline: line });
      for (let k = 0; k < 10; k++) { const a = k / 10 * TAU; this.prism(ctx, this.circlePoly(tx + Math.cos(a) * 0.85, py - 0.2 + Math.sin(a) * 0.85, 0.15, 4), H + 1.4, 0.35, top, side); }
      const [ax, ay] = this.proj(tx, py - 0.2, H + 1.75); this.cone3(ctx, ax, ay, s * 1.05, s * 1.7, '#5a4a80', '#1e1430');
      ctx.strokeStyle = '#2a2040'; // Fahnenstange ctx.lineWidth = Math.max(1, s * 0.04); ctx.beginPath(); ctx.moveTo(ax, ay - s * 1.7); ctx.lineTo(ax, ay - s * 2.25); ctx.stroke();
      const wv = Math.sin(t * 5 + sd) * s * 0.08; ctx.fillStyle = '#3a1466'; ctx.beginPath(); ctx.moveTo(ax, ay - s * 2.25); ctx.lineTo(ax + s * 0.5, ay - s * 2.12 + wv); ctx.lineTo(ax, ay - s * 1.95); ctx.closePath(); ctx.fill();
      for (const z of [H * 0.35, H * 0.8]) { const [wx, wy] = this.proj(tx, py + 0.8, z); ctx.fillStyle = `rgba(210,130,255,${flick(z + sd)})`; ctx.beginPath(); ctx.moveTo(wx - s * 0.1, wy + s * 0.18); ctx.lineTo(wx - s * 0.1, wy - s * 0.1); ctx.quadraticCurveTo(wx, wy - s * 0.3, wx + s * 0.1, wy - s * 0.1); ctx.lineTo(wx + s * 0.1, wy + s * 0.18); ctx.closePath(); ctx.fill(); }
    }
    // Mauer mit Zinnen und Torbogen
    this.prism(ctx, rect(px - Wd / 2 - 0.4, py - D, px + Wd / 2 + 0.4, py + D), 0, H, top, side, { outline: line });
    for (let k = 0; k < 6; k++) { const bx = px - Wd / 2 - 0.4 + k * (Wd + 0.8 - 0.36) / 5; this.prism(ctx, rect(bx, py - D, bx + 0.36, py + D), H, 0.45, top, side); }
    const fy = py + D, o = [[px - 0.95, fy, 0], [px - 0.95, fy, 1.95], [px, fy, 2.6], [px + 0.95, fy, 1.95], [px + 0.95, fy, 0]];
    ctx.fillStyle = '#04030a'; ctx.beginPath(); o.forEach((q, i) => { const r = this.proj(q[0], q[1], q[2] + 0.01); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); }); ctx.closePath(); ctx.fill();
    const gg = ctx.createLinearGradient(...this.proj(px, fy, 0), ...this.proj(px, fy, 2.6)); gg.addColorStop(0, 'rgba(140,60,255,0.35)'); gg.addColorStop(1, 'rgba(140,60,255,0)'); ctx.fillStyle = gg; ctx.fill(); // Schein aus dem Inneren
    ctx.strokeStyle = '#a24bff'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.stroke();
    ctx.strokeStyle = '#2a2438'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.beginPath(); // halb hochgezogenes Fallgitter
    for (let k = -3; k <= 3; k++) { const [a0, a1] = this.proj(px + k * 0.27, fy, 2.6 - Math.abs(k) * 0.1), [b0, b1] = this.proj(px + k * 0.27, fy, 1.8); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); }
    const [q0, q1] = this.proj(px - 0.9, fy, 1.85), [q2, q3] = this.proj(px + 0.9, fy, 1.85); ctx.moveTo(q0, q1); ctx.lineTo(q2, q3); ctx.stroke();
    const [kx, ky] = this.proj(px, fy - 0.05, H + 0.3); this.spriteSkull(ctx, kx, ky + s * 0.2, s * 0.95);
    for (const sd of [-1, 1]) this.spriteBrazier(ctx, { x: px + sd * (Wd / 2 + 0.15), y: fy + 0.25, s: 0.9 }, t, ['#a24bff', '#e0b8ff', '170,90,255']);
  },

  /* ---------- Kolosseum ---------- */

  /* Löwentor: ein Torbogen in der Arenamauer, im Schlussstein ein Löwenkopf.
     ausgang = false zeichnet den Eingang (offener, dunkler Bogen), true den Ausgang (zugemauert,
     denn von außen ist er massiv). Beide sitzen auf ihrem Kartenfeld und schauen zu der Seite, an
     der die Arena offen ist. */
  drawLionGate(ctx, ob, t, ausgang) {
    const s = this.scale;
    const cx = ausgang ? ob.ax : ob.x, cy = ausgang ? ob.ay : ob.y;
    if (cx == null) return;
    let ux = ausgang ? ob.ausMundX : ob.mundX, uy = ausgang ? ob.ausMundY : ob.mundY;
    if (!ux && !uy) { ux = ob.dx; uy = ob.dy; }        // Notfall: die Auswurfrichtung
    const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
    const qx = -uy, qy = ux;                            // quer zur Toröffnung
    const HOEHE = 2.1, PFOSTEN = 0.24, TIEFE = 0.4;
    const stein = ['#f4e7c6', '#b79d6c'], kante = '#7d6740', gold = '#ffd45e';
    // Rechteck um (mx,my), halbQ quer zur Öffnung, halbU in Blickrichtung
    const feld = (mx, my, halbQ, halbU) => [
      [mx - qx * halbQ - ux * halbU, my - qy * halbQ - uy * halbU],
      [mx + qx * halbQ - ux * halbU, my + qy * halbQ - uy * halbU],
      [mx + qx * halbQ + ux * halbU, my + qy * halbQ + uy * halbU],
      [mx - qx * halbQ + ux * halbU, my - qy * halbQ + uy * halbU]];

    this.isoEllipse(ctx, cx, cy, 0, 0.6, 'rgba(0,0,0,0.18)');
    for (const seite of [-1, 1]) {                      // die beiden Pfosten
      const mx = cx + qx * seite * 0.48, my = cy + qy * seite * 0.48;
      this.prism(ctx, feld(mx, my, PFOSTEN, TIEFE), 0, HOEHE, stein[0], stein[1], { outline: kante });
    }
    this.prism(ctx, feld(cx, cy, 0.72, TIEFE), HOEHE, 0.4, stein[0], stein[1], { outline: kante }); // Sturz
    this.prism(ctx, feld(cx, cy, 0.86, TIEFE + 0.08), HOEHE + 0.4, 0.18, gold, '#a8842a');          // Goldband oben

    const fx = cx + ux * (TIEFE + 0.01), fy = cy + uy * (TIEFE + 0.01);   // Vorderkante des Tores
    const bogenPunkte = [];
    for (let i = 0; i <= 12; i++) {
      const a = Math.PI * (i / 12);
      bogenPunkte.push([fx + qx * Math.cos(a) * 0.46, fy + qy * Math.cos(a) * 0.46, 0.02 + Math.sin(a) * HOEHE * 0.82]);
    }
    const bogenPfad = () => { ctx.beginPath(); bogenPunkte.forEach((q, i) => { const r = this.proj(q[0], q[1], q[2]); i ? ctx.lineTo(r[0], r[1]) : ctx.moveTo(r[0], r[1]); }); ctx.closePath(); };

    if (ausgang) {                                      // zugemauert: hier kommt niemand hinein
      bogenPfad(); ctx.fillStyle = '#c9b384'; ctx.fill();
      ctx.strokeStyle = kante; ctx.lineWidth = Math.max(1, s * 0.05); ctx.stroke();
      ctx.strokeStyle = 'rgba(90,74,44,0.5)'; ctx.lineWidth = Math.max(1, s * 0.04);
      for (const z of [0.5, 1.05, 1.6]) {                // Fugen der Quader
        const [a0, a1] = this.proj(fx + qx * 0.44, fy + qy * 0.44, z), [b0, b1] = this.proj(fx - qx * 0.44, fy - qy * 0.44, z);
        ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
      }
      const spei = Math.max(0, 1 - (t - (ob.speiAt ?? -10)) * 3);   // kurzes Aufleuchten beim Ausspucken
      if (spei > 0) { bogenPfad(); ctx.fillStyle = `rgba(255,212,94,${0.75 * spei})`; ctx.fill(); }
    } else {
      bogenPfad(); ctx.fillStyle = '#241a0e'; ctx.fill();
      ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1.5, s * 0.055); ctx.stroke();
      const schluck = Math.max(0, 1 - (t - (ob.schluckAt ?? -10)) * 3);
      if (schluck > 0) { bogenPfad(); ctx.fillStyle = `rgba(255,180,60,${0.7 * schluck})`; ctx.fill(); }
    }
    const [kx, ky] = this.proj(cx, fy - uy * 0.02, HOEHE + 0.62);
    this.spriteLoewenkopf(ctx, kx, ky, s * 0.85, ausgang ? 0 : 1);
  },

  /* Löwenkopf im Schlussstein: goldene Mähne, dunkle Schnauze. wach = 1 blickt hell (Eingang),
     0 ist steinern (Ausgang). Bildschirmkoordinaten, verankert an der Kopfmitte. */
  spriteLoewenkopf(ctx, sx, sy, s, wach) {
    const gold = wach ? '#ffd45e' : '#c9b384', dunkel = wach ? '#b8842a' : '#93805a';
    ctx.fillStyle = dunkel;                              // Mähne als Zackenkranz
    ctx.beginPath();
    for (let i = 0; i < 14; i++) {
      const a = (i / 14) * TAU, r = s * (i % 2 ? 0.44 : 0.62);
      const px = sx + Math.cos(a) * r, py = sy + Math.sin(a) * r * 0.9;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = gold; ctx.beginPath(); ctx.ellipse(sx, sy, s * 0.36, s * 0.33, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = wach ? '#3a2408' : '#6a5a3a';        // Augen
    for (const seite of [-1, 1]) { ctx.beginPath(); ctx.ellipse(sx + seite * s * 0.15, sy - s * 0.06, s * 0.06, s * 0.05, 0, 0, TAU); ctx.fill(); }
    ctx.beginPath(); ctx.ellipse(sx, sy + s * 0.14, s * 0.13, s * 0.1, 0, 0, TAU); ctx.fill();  // Schnauze
    ctx.strokeStyle = wach ? '#3a2408' : '#6a5a3a'; ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath(); ctx.moveTo(sx, sy + s * 0.2); ctx.lineTo(sx, sy + s * 0.3); ctx.stroke();
  },

  /* Streitwagen: das ist die Lore aus der Zwergenschmiede, nur anders angezogen – ein zweirädriger
     Rennwagen mit Deichsel, goldenen Speichen und Standarte. Er fährt dieselbe feste Strecke, nimmt
     den Ball an der Station auf und trägt ihn mit; am Verhalten ändert die Zeichnung nichts.

     Die Räder drehen sich nach dem Fahrfortschritt der Fähre, nicht nach der Uhr: So stehen sie
     still, solange der Wagen an der Station wartet, und laufen genau dann, wenn er rollt. */
  drawChariot(ctx, ob, t) {
    const s = this.scale, d = ob.dir || 1, w = ob.w, h = ob.h, cx = ob.x, cy = ob.y;
    const holz = ['#c0392c', '#7a1e17'], gold = '#ffd45e';
    const feld = (x, y, ww, hh) => [[x - ww / 2, y - hh / 2], [x + ww / 2, y - hh / 2], [x + ww / 2, y + hh / 2], [x - ww / 2, y + hh / 2]];
    this.isoEllipse(ctx, cx, cy, 0, Math.max(w, h) * 0.52, 'rgba(0,0,0,0.22)');
    // Deichsel nach vorn
    this.prism(ctx, feld(cx + d * (w / 2 + 0.35), cy, 0.8, 0.12), 0.2, 0.1, '#8a6a3a', '#5a4420');
    // Wagenkorb: oben offen, damit der mitfahrende Ball über dem Rand steht
    this.prism(ctx, feld(cx, cy, w * 0.8, h * 0.8), 0.18, 0.5, holz[0], holz[1], { outline: '#4a1210' });
    this.fillPoly(ctx, feld(cx, cy, w * 0.62, h * 0.5), 0.69, gold, false);
    // Räder links und rechts
    const dreh = ob.progress != null ? ob.progress * 14 * d : t * 5 * d;
    for (const seite of [-1, 1]) {
      const rx = cx, ry = cy + seite * (h * 0.5 + 0.06);
      const [wx, wy] = this.proj(rx, ry, 0.34);
      ctx.strokeStyle = '#2a1a10'; ctx.lineWidth = Math.max(2, s * 0.07);
      ctx.beginPath(); ctx.arc(wx, wy, s * 0.34, 0, TAU); ctx.stroke();
      ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1, s * 0.04);
      for (let k = 0; k < 6; k++) {
        const a = dreh + (k / 6) * TAU;
        ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(wx + Math.cos(a) * s * 0.31, wy + Math.sin(a) * s * 0.31); ctx.stroke();
      }
    }
    // Standarte mit wehendem Wimpel
    const [m0, m1] = this.proj(cx - d * w * 0.3, cy, 0.68), [m2, m3] = this.proj(cx - d * w * 0.3, cy, 1.6);
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath(); ctx.moveTo(m0, m1); ctx.lineTo(m2, m3); ctx.stroke();
    const weh = 0.18 + 0.1 * Math.sin(t * 6);
    ctx.fillStyle = '#d4342c'; ctx.beginPath(); ctx.moveTo(m2, m3);
    ctx.lineTo(m2 + d * s * 0.5, m3 + s * weh); ctx.lineTo(m2, m3 + s * 0.32); ctx.closePath(); ctx.fill();
  },

  /* Feuerturm – der streichende Strahl am Boden. Zwei Dinge müssen ablesbar sein: wo der Strahl
     gerade brennt (grelles Band mit Flammen) und wie weit er überhaupt kommt (rußiger Bereich mit
     gestricheltem Rand). Nur mit beidem lässt sich vorausplanen – man sieht den Ort der Gefahr und
     den freien Rest. Ein Winkelpaar an der Vorderkante zeigt, wohin der Strahl gerade läuft. */
  drawFireSweep(ctx, ob, t) {
    const s = this.scale;
    const bereich = [[ob.zx, ob.zy], [ob.zx + ob.zw, ob.zy], [ob.zx + ob.zw, ob.zy + ob.zh], [ob.zx, ob.zy + ob.zh]];
    this.fillPoly(ctx, bereich, 0.004, 'rgba(70,40,25,0.14)', false);
    ctx.save();
    ctx.setLineDash([s * 0.3, s * 0.22]);
    ctx.strokeStyle = 'rgba(150,90,45,0.55)'; ctx.lineWidth = Math.max(1, s * 0.05);
    this.pathPoly(ctx, bereich, 0.005); ctx.stroke();
    ctx.restore();

    const laengs = ob.achse === 'x';
    const a0 = ob.mitte - ob.breit / 2, a1 = ob.mitte + ob.breit / 2;
    const band = (u0, u1) => laengs
      ? [[u0, ob.zy], [u1, ob.zy], [u1, ob.zy + ob.zh], [u0, ob.zy + ob.zh]]
      : [[ob.zx, u0], [ob.zx + ob.zw, u0], [ob.zx + ob.zw, u1], [ob.zx, u1]];
    const fl = 0.86 + 0.14 * Math.sin(t * 27);
    this.fillPoly(ctx, band(a0, a1), 0.006, `rgba(255,110,30,${0.62 * fl})`, false);
    this.fillPoly(ctx, band(ob.mitte - ob.breit * 0.22, ob.mitte + ob.breit * 0.22), 0.008, `rgba(255,230,150,${0.55 * fl})`, false);
    ctx.strokeStyle = `rgba(255,235,170,${0.85 * fl})`; ctx.lineWidth = Math.max(2, s * 0.09);
    this.pathPoly(ctx, band(a0, a1), 0.009); ctx.stroke();

    // Züngelnde Flammen im Band (fester Raster, damit alle Geräte dasselbe sehen)
    const quer = laengs ? ob.zh : ob.zw;
    const n = Math.max(4, Math.round(quer * 2));
    for (let k = 0; k < n; k++) {
      const v = (k + 0.5) / n, w = ((k * 0.6180339887) % 1);
      const fx = laengs ? a0 + ob.breit * w : ob.zx + ob.zw * v;
      const fy = laengs ? ob.zy + ob.zh * v : a0 + ob.breit * w;
      const hh = 0.35 + 0.3 * Math.abs(Math.sin(t * 13 + k * 1.7));
      const [b0, b1] = this.proj(fx, fy, 0.01), [t0, t1] = this.proj(fx, fy, hh);
      ctx.fillStyle = k % 3 ? 'rgba(255,170,50,0.75)' : 'rgba(255,240,190,0.8)';
      ctx.beginPath(); ctx.moveTo(b0 - s * 0.16, b1);
      ctx.quadraticCurveTo(t0 + Math.sin(t * 9 + k) * s * 0.12, t1, b0 + s * 0.16, b1);
      ctx.closePath(); ctx.fill();
    }

    // Laufrichtung: zwei ausgefüllte Pfeile vor der Vorderkante – so sieht man nicht nur, wo der
    // Strahl steht, sondern auch, welche Seite des Bereichs als nächste frei wird
    const spitzeAn = (ob.richtung > 0 ? a1 : a0) + ob.richtung * 0.92;
    const grenze = ob.richtung > 0 ? (laengs ? ob.zx + ob.zw : ob.zy + ob.zh) : (laengs ? ob.zx : ob.zy);
    // Am Umkehrpunkt bleibt kein Platz mehr für den Pfeil – dort zeigte er ohnehin aus dem Bereich heraus
    if (ob.richtung && (ob.richtung > 0 ? spitzeAn <= grenze : spitzeAn >= grenze)) {
      const kante = ob.richtung > 0 ? a1 : a0, d = ob.richtung;
      ctx.fillStyle = 'rgba(255,225,150,0.85)';
      for (const v of [0.3, 0.7]) {
        const cx = laengs ? kante + d * 0.5 : ob.zx + ob.zw * v;
        const cy = laengs ? ob.zy + ob.zh * v : kante + d * 0.5;
        const spitze = laengs ? [cx + d * 0.42, cy] : [cx, cy + d * 0.42];
        const p0 = laengs ? [cx, cy - 0.4] : [cx - 0.4, cy];
        const p1 = laengs ? [cx, cy + 0.4] : [cx + 0.4, cy];
        const A = this.proj(p0[0], p0[1], 0.011), B = this.proj(spitze[0], spitze[1], 0.011), C = this.proj(p1[0], p1[1], 0.011);
        ctx.beginPath(); ctx.moveTo(A[0], A[1]); ctx.lineTo(B[0], B[1]); ctx.lineTo(C[0], C[1]); ctx.closePath(); ctx.fill();
      }
    }
  },

  /* Feuerturm – das Bauwerk. Sandsteinschaft mit Fugen, goldener Kranz, darauf die brennende
     Schale. Sie brennt durchgehend, denn der Strahl geht nie aus – er wandert nur. Der Feuerbogen
     von der Schale zeigt immer auf die Mitte des Strahls und wandert mit ihm. */
  drawFireTower(ctx, ob, t) {
    const s = this.scale, r = ob.r, H = ob.height;
    const stein = ['#e6d5ab', '#a98f5f'], gold = ['#ffd45e', '#a8842a'];
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, r * 1.7, 'rgba(0,0,0,0.28)');
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 1.32, 8), 0, 0.5, stein[0], stein[1], { outline: '#6d5418' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r, 8), 0.5, H - 0.5, stein[0], stein[1], { outline: '#6d5418' });
    ctx.strokeStyle = 'rgba(110,84,24,0.30)'; ctx.lineWidth = 1;
    for (let z = 1.1; z < H - 0.2; z += 0.7) {   // waagerechte Fugen, sonst wirkt der Schaft wie eine Röhre
      const q0 = this.proj(ob.x - r, ob.y, z), q1 = this.proj(ob.x + r, ob.y, z);
      ctx.beginPath(); ctx.moveTo(q0[0], q0[1]); ctx.lineTo(q1[0], q1[1]); ctx.stroke();
    }
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 1.25, 8), H, 0.26, gold[0], gold[1], { outline: '#6d5418' });
    const bz = H + 0.26;
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 0.4, 8), bz, 0.22, gold[0], gold[1], { outline: '#6d5418' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 0.85, 10), bz + 0.22, 0.34, '#3a2a12', gold[1], { outline: '#6d5418' });

    const fz = bz + 0.56, [fx, fy] = this.proj(ob.x, ob.y, fz), R = s * r * 0.6;
    const glow = ctx.createRadialGradient(fx, fy, R * 0.3, fx, fy, R * 4.2);
    glow.addColorStop(0, 'rgba(255,180,70,0.4)'); glow.addColorStop(1, 'rgba(255,110,30,0)');
    ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(fx, fy, R * 4.2, 0, TAU); ctx.fill();
    for (let k = 0; k < 7; k++) {
      const ff = 0.7 + 0.3 * Math.sin(t * 12 + k * 2.1);
      const px = fx + (k / 6 - 0.5) * R * 1.3, py = fy - R * 0.1;
      ctx.fillStyle = k % 2 ? 'rgba(255,205,80,0.9)' : 'rgba(255,120,35,0.92)';
      ctx.beginPath(); ctx.moveTo(px - R * 0.3, py);
      ctx.quadraticCurveTo(px + Math.sin(t * 9 + k) * R * 0.3, py - R * (0.7 + 2.6 * ff), px + R * 0.3, py);
      ctx.closePath(); ctx.fill();
    }
    const [gx, gy] = this.proj(ob.smx, ob.smy, 0.05);   // Feuerbogen auf die Mitte des Strahls
    for (let k = 0; k < 10; k++) {
      const u = (k + 0.5) / 10;
      const mx = fx + (gx - fx) * u, my = fy + (gy - fy) * u - Math.sin(u * Math.PI) * s * 0.5;
      const w = s * (0.4 - 0.2 * u) * (0.8 + 0.2 * Math.sin(t * 25 + k));
      ctx.fillStyle = k % 2 ? 'rgba(255,150,40,0.72)' : 'rgba(255,235,170,0.68)';
      ctx.beginPath(); ctx.arc(mx, my, w, 0, TAU); ctx.fill();
    }
  },

  /* Kaiserloge – die Falltür am Boden. Zu: eine bündige Steinplatte mit goldenem Rahmen und einer
     Fuge in der Mitte. Offen: der dunkle Schacht darunter, die beiden Flügel zur Seite geschwenkt,
     der Rahmen glüht rot. Man soll auf einen Blick sehen, ob der Weg trägt. */
  drawLogeLuke(ctx, ob, t) {
    const s = this.scale, g = ob.gap;
    const x0 = ob.lx, y0 = ob.ly, x1 = ob.lx + ob.lw, y1 = ob.ly + ob.lh;
    const rechteck = (a, b, c, d) => [[a, b], [c, b], [c, d], [a, d]];
    const laengs = ob.lw >= ob.lh;   // Flügel schwenken zur langen Seite hin weg

    if (g > 0.02) {   // Schacht
      this.fillPoly(ctx, rechteck(x0, y0, x1, y1), 0.004, '#120b06', false);
      const [cx, cy] = this.proj(ob.lmx, ob.lmy, 0.005);
      const rg = ctx.createRadialGradient(cx, cy, 0, cx, cy, s * Math.max(ob.lw, ob.lh) * 0.5);
      rg.addColorStop(0, `rgba(212,52,44,${0.4 * g})`); rg.addColorStop(1, 'rgba(212,52,44,0)');
      ctx.fillStyle = rg; this.pathPoly(ctx, rechteck(x0, y0, x1, y1), 0.006); ctx.fill();
    }
    // Zwei Flügel, die um ihre äußere Kante wegklappen (verkürzt gezeichnet)
    const halb = (laengs ? ob.lw : ob.lh) / 2, weg = g * (halb - 0.03);
    for (const seite of [-1, 1]) {
      const mitte = laengs ? ob.lmx : ob.lmy;
      const innen = mitte + seite * weg, aussen = mitte + seite * halb;
      if (Math.abs(aussen - innen) < 0.03) continue;
      const a = Math.min(innen, aussen), b = Math.max(innen, aussen);
      const poly = laengs ? rechteck(a, y0, b, y1) : rechteck(x0, a, x1, b);
      this.fillPoly(ctx, poly, 0.007, '#dfcea4', false);
      ctx.strokeStyle = '#a8842a'; ctx.lineWidth = Math.max(1, s * 0.05); this.pathPoly(ctx, poly, 0.008); ctx.stroke();
      // Beschläge auf dem Flügel
      ctx.fillStyle = '#c9a95e';
      for (let k = 0; k < 3; k++) {
        const u = (k + 0.5) / 3;
        const px = laengs ? aussen - seite * 0.14 : x0 + ob.lw * u;
        const py = laengs ? y0 + ob.lh * u : aussen - seite * 0.14;
        const [nx, ny] = this.proj(px, py, 0.01);
        ctx.beginPath(); ctx.arc(nx, ny, Math.max(1, s * 0.04), 0, TAU); ctx.fill();
      }
    }
    // Rahmen: golden, wenn die Luke trägt – rot glühend, wenn sie offen steht
    ctx.strokeStyle = g > 0.5 ? `rgba(212,52,44,${0.55 + 0.35 * Math.sin(t * 6)})` : 'rgba(255,212,94,0.85)';
    ctx.lineWidth = Math.max(2, s * 0.09);
    this.pathPoly(ctx, rechteck(x0, y0, x1, y1), 0.009); ctx.stroke();
  },

  /* Die Daumenscheibe: eine goldgefasste Marke, auf der eine Faust den Daumen hoch oder runter
     hält. Sie wird im Bildschirmraum gezeichnet und schaut damit immer zum Betrachter – der
     Daumenstand muss aus jeder Kameradrehung ablesbar bleiben. Die Farbe sagt dasselbe noch
     einmal: heller Sandstein heißt „Weg frei", Rot heißt „Loch offen". */
  daumenScheibe(ctx, cx, cy, R, hoch) {
    ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.arc(cx, cy + R * 0.09, R * 1.02, 0, TAU); ctx.fill();
    ctx.fillStyle = '#a8842a'; ctx.beginPath(); ctx.arc(cx, cy, R, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffd45e'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.9, 0, TAU); ctx.fill();
    ctx.fillStyle = hoch ? '#f7edd0' : '#c0392c'; ctx.beginPath(); ctx.arc(cx, cy, R * 0.76, 0, TAU); ctx.fill();

    /* Gezeichnet wird immer „Daumen runter"; „hoch" ist dasselbe gespiegelt. In den Hilfskoordinaten
       zeigt +y in Daumenrichtung. Die Hand besteht aus drei klaren Blöcken – Manschette, Faust,
       Daumen –, denn feine Finger wären bei dieser Größe nur ein Fleck. Die Manschette gibt der
       Form ihr Oben und Unten: ohne sie liest sich die Faust in beide Richtungen gleich. */
    const k = R * 0.6;
    ctx.save(); ctx.translate(cx, cy + (hoch ? 1 : -1) * k * 0.075); ctx.scale(k, hoch ? -k : k);
    const eck = (x0, y0, x1, y1, r) => {
      const w = x1 - x0, h = y1 - y0;
      ctx.beginPath(); ctx.moveTo(x0 + r, y0);
      ctx.arcTo(x0 + w, y0, x0 + w, y0 + h, r); ctx.arcTo(x0 + w, y0 + h, x0, y0 + h, r);
      ctx.arcTo(x0, y0 + h, x0, y0, r); ctx.arcTo(x0, y0, x0 + w, y0, r); ctx.closePath(); ctx.fill();
    };
    ctx.fillStyle = hoch ? '#8a6428' : '#e8c9b4';
    eck(-0.68, -1.00, 0.68, -0.70, 0.1);                     // Manschette
    ctx.fillStyle = hoch ? '#6b4a1e' : '#fff3dc';
    eck(-0.62, -0.74, 0.62, 0.06, 0.24);                     // Faust
    eck(-0.58, -0.16, -0.06, 0.86, 0.24);                    // Daumen
    ctx.restore();
  },

  /* Kaiserloge – die Tribüne. Podest, vier Säulen, Dach mit goldenem Sims und rotem Sonnentuch;
     vorn hängt die Daumenscheibe. Die Vorderseite zeigt zur Falltür, damit Loge und Luke als
     zusammengehörig zu lesen sind. */
  drawImperialBox(ctx, ob, t) {
    const s = this.scale, w = ob.w, h = ob.h;
    const rechteck = (cx, cy, bw, bh) => [[cx - bw / 2, cy - bh / 2], [cx + bw / 2, cy - bh / 2], [cx + bw / 2, cy + bh / 2], [cx - bw / 2, cy + bh / 2]];
    const stein = ['#e6d5ab', '#a98f5f'], saeule = ['#f4ead0', '#c0aa78'], gold = ['#ffd45e', '#a8842a'];
    // Vorderseite: die Richtung zur Luke, auf die Hauptachse gerundet
    const dx = ob.lmx - ob.x, dy = ob.lmy - ob.y;
    const vx = Math.abs(dx) > Math.abs(dy) ? Math.sign(dx) || 1 : 0;
    const vy = vx ? 0 : (Math.sign(dy) || 1);

    this.isoEllipse(ctx, ob.x, ob.y, 0.004, Math.max(w, h) * 0.62, 'rgba(0,0,0,0.26)');
    this.prism(ctx, rechteck(ob.x, ob.y, w, h), 0, 0.62, stein[0], stein[1], { outline: '#6d5418' });          // Podest
    this.prism(ctx, rechteck(ob.x, ob.y, w - 0.4, h - 0.4), 0.62, 0.18, '#d8c393', '#a98f5f');                  // Sitzstufe
    const saeulenH = 1.7;
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) {                                                       // vier Säulen
      const px = ob.x + sx * (w / 2 - 0.28), py = ob.y + sy * (h / 2 - 0.24);
      this.prism(ctx, this.circlePoly(px, py, 0.17, 8), 0.8, saeulenH, saeule[0], saeule[1], { outline: '#8a7040' });
    }
    const dachZ = 0.8 + saeulenH;
    this.prism(ctx, rechteck(ob.x, ob.y, w + 0.34, h + 0.34), dachZ, 0.16, gold[0], gold[1], { outline: '#6d5418' });   // Sims
    this.prism(ctx, rechteck(ob.x, ob.y, w + 0.1, h + 0.1), dachZ + 0.16, 0.3, '#d4342c', '#8e211c', { outline: '#5a1512' }); // rotes Dach
    // Wimpel auf dem First
    for (const u of [-0.3, 0.3]) {
      const px = ob.x + (vy ? u * w : 0.0), py = ob.y + (vy ? 0 : u * h);
      const [m0, m1] = this.proj(px, py, dachZ + 0.46), [m2, m3] = this.proj(px, py, dachZ + 1.1);
      ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = Math.max(1.5, s * 0.045);
      ctx.beginPath(); ctx.moveTo(m0, m1); ctx.lineTo(m2, m3); ctx.stroke();
      const weh = 0.16 + 0.08 * Math.sin(t * 5 + u * 6);
      ctx.fillStyle = '#ffd45e'; ctx.beginPath(); ctx.moveTo(m2, m3);
      ctx.lineTo(m2 + s * 0.4, m3 + s * weh); ctx.lineTo(m2, m3 + s * 0.28); ctx.closePath(); ctx.fill();
    }
    // Daumenscheibe vorn an der Loge, gut über der Brüstung
    const fx = ob.x + vx * (w / 2 + 0.1), fy = ob.y + vy * (h / 2 + 0.1);
    const [px, py] = this.proj(fx, fy, 1.55);
    this.daumenScheibe(ctx, px, py, s * 0.52, ob.hoch);
  },

  /* Dieselbe Marke noch einmal klein über der Luke: Die Loge steht am Bahnrand und ist beim
     Zielen oft aus dem Bild – der Daumenstand muss aber immer zu sehen sein. */
  drawLogeMarke(ctx, ob, t) {
    const [px, py] = this.proj(ob.lmx, ob.lmy, 1.5 + 0.06 * Math.sin(t * 2));
    const s = this.scale;
    ctx.strokeStyle = 'rgba(110,84,24,0.35)'; ctx.lineWidth = Math.max(1, s * 0.03);
    const [b0, b1] = this.proj(ob.lmx, ob.lmy, 0.02);
    ctx.beginPath(); ctx.moveTo(px, py); ctx.lineTo(b0, b1); ctx.stroke();
    this.daumenScheibe(ctx, px, py, s * 0.34, ob.hoch);
  },

  /* ---------- Die drei Maschinen der Uhrwerkstadt ---------- */

  /* Zahnradaufzug: ein stehendes Rad vor der Stufe, mit Dicke. Gezeichnet wird in der Ebene aus
     Fahrtrichtung und Höhe; die Achse liegt quer dazu, also längs der Wand. Damit das Rad wie ein
     Körper aussieht und nicht wie eine aufgemalte Scheibe, entstehen drei Lagen: die hintere
     Wange, das Zahnband dazwischen (jeder Zahn bekommt seine eigene Seitenfläche) und die vordere
     Wange mit Speichen und Nabe. Der Zahn, der gerade unten steht, wird hell hervorgehoben – an ihm
     sieht man, ob gerade eine Lücke bereitsteht. */
  drawGearLift(ctx, ob, t) {
    const s = this.scale, halb = ob.dicke / 2;
    /* Punkt auf dem Rad – dieselben Formeln wie im Verhalten, damit der Ball sichtbar in seiner
       Lücke sitzt. w = 0 ist der tiefste Punkt (im Boden), w = π der Scheitel; f ist der
       Radienfaktor, seite -1 hinten … +1 vorn. */
    const zA = ob.zAchse();
    const pkt = (w, f, seite) => this.proj(
      ob.x + ob.dx * ob.laengs(w) * f + ob.qx * halb * seite,
      ob.y + ob.dy * ob.laengs(w) * f + ob.qy * halb * seite,
      zA + (ob.hoehe(w) - zA) * f);
    const zeichne = (pts, fill, stroke, regel) => {
      if (pts.length < 3) return;
      ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath();
      if (fill) { ctx.fillStyle = fill; ctx.fill(regel); }
      if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = Math.max(1, s * 0.04); ctx.stroke(); }
    };
    const messing = k => { const a = [0x4a, 0x34, 0x10], b = [0xff, 0xe3, 0xa8], m = Math.max(0, Math.min(1, k));
      return `rgb(${Math.round(a[0] + (b[0] - a[0]) * m)},${Math.round(a[1] + (b[1] - a[1]) * m)},${Math.round(a[2] + (b[2] - a[2]) * m)})`; };
    const licht = w => 0.3 + 0.6 * Math.max(0, Math.sin(w - 0.5));   // Licht auf die Spielerseite

    /* Zahnprofil über die volle Teilung: Fußkreis, Flanke hinauf, Kopf, Flanke hinab, Fußkreis.
       Die Lücken sitzen bei drehung + i·Teilung – dort liegt der Ball. Gezeichnet wird nur, was
       über dem Boden liegt: Der Rest steckt in der Erde, wie bei einem eingelassenen Rad. */
    const zn = ob.zaehne, teil = TAU / zn, KOPF = 1.06, FUSS = 0.84, BOHR = 0.44;
    const wB = ob.wBoden();
    const roh = [];
    for (let i = 0; i < zn * 2; i++) {          // zwei Umläufe, damit der sichtbare Bogen sicher drin ist
      const m = ob.drehung + i * teil;
      roh.push({ w: m, f: FUSS }, { w: m + teil * 0.30, f: FUSS }, { w: m + teil * 0.38, f: KOPF },
        { w: m + teil * 0.62, f: KOPF }, { w: m + teil * 0.70, f: FUSS });
    }
    // auf den sichtbaren Bogen wB … 2π-wB einkürzen und an den Enden genau auf den Boden setzen
    const norm = a => { let v = a % TAU; if (v < 0) v += TAU; return v; };
    const kontur = [{ w: wB, f: FUSS }];
    for (const k of roh) { const v = norm(k.w); if (v > wB + 0.001 && v < TAU - wB - 0.001) kontur.push({ w: v, f: k.f }); }
    kontur.sort((a, b) => a.w - b.w);
    kontur.push({ w: TAU - wB, f: FUSS });
    const kreis = (f, seite, n = 26) => { const p = []; for (let i = 0; i < n; i++) p.push(pkt((i / n) * TAU, f, seite)); return p; };

    // Wandpfeiler hinter dem Rad, an dem die Achse hängt
    const pf = [[ob.x + ob.dx * 0.34 - ob.qx * (halb + 0.5), ob.y + ob.dy * 0.34 - ob.qy * (halb + 0.5)],
      [ob.x + ob.dx * 0.34 + ob.qx * (halb + 0.5), ob.y + ob.dy * 0.34 + ob.qy * (halb + 0.5)],
      [ob.x + ob.dx * 0.66 + ob.qx * (halb + 0.5), ob.y + ob.dy * 0.66 + ob.qy * (halb + 0.5)],
      [ob.x + ob.dx * 0.66 - ob.qx * (halb + 0.5), ob.y + ob.dy * 0.66 - ob.qy * (halb + 0.5)]];
    this.prism(ctx, pf, 0, zA * 1.5, '#4c5169', '#343850', '#23273a', { outline: '#191d2c' });

    // 1) hintere Wange – der sichtbare Bogen, unten am Boden geschlossen
    zeichne(kontur.map(k => pkt(k.w, k.f, -1)), '#4a3410');
    // 2) Innenwand der Bohrung: das Band zwischen hinterem und vorderem Lochrand. Die vordere
    //    Wange deckt später die nahe Hälfte zu – übrig bleibt die ferne, und genau so schaut man
    //    durch ein Zahnrad hindurch.
    const bh = kreis(BOHR, -1), bv = kreis(BOHR, 1);
    for (let i = 0; i < bh.length; i++) {
      const j = (i + 1) % bh.length, w = (i / bh.length) * TAU;
      if (ob.hoehe(w) * BOHR + zA * (1 - BOHR) < 0.02) continue;      // steckt im Boden
      zeichne([bh[i], bh[j], bv[j], bv[i]], messing(licht(w) * 0.4));
    }
    // 3) Zahnband: jede Kante der Kontur bekommt ihre eigene Seitenfläche
    for (let i = 0; i + 1 < kontur.length; i++) {
      const a = kontur[i], b = kontur[i + 1];
      const wm = (a.w + b.w) / 2;
      const amEinstieg = Math.abs(wm - wB) < teil * 0.4 && a.f === KOPF;
      zeichne([pkt(a.w, a.f, -1), pkt(b.w, b.f, -1), pkt(b.w, b.f, 1), pkt(a.w, a.f, 1)],
        amEinstieg ? '#ffdf9c' : messing(licht(wm) * 0.85), 'rgba(40,26,8,0.45)');
    }
    // 4) vordere Wange als Ring: Zahnkontur außen, Loch innen (evenodd)
    ctx.beginPath();
    kontur.forEach((k, i) => { const p = pkt(k.w, k.f, 1); i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]); });
    ctx.closePath();
    ctx.moveTo(bv[0][0], bv[0][1]); for (let i = bv.length - 1; i > 0; i--) ctx.lineTo(bv[i][0], bv[i][1]);
    ctx.closePath();
    const g = ctx.createLinearGradient(...pkt(2.4, 1.0, 1), ...pkt(5.2, 1.0, 1));
    g.addColorStop(0, '#ffe3a8'); g.addColorStop(0.55, '#c9903f'); g.addColorStop(1, '#6b4d22');
    ctx.fillStyle = g; ctx.fill('evenodd');
    ctx.strokeStyle = '#3a2a12'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.stroke();
  },
  /* Boden: der Einstieg unten und der Absetzpunkt oben, damit man beides sieht, bevor man schlägt */
  drawGearLiftFloor(ctx, ob) {
    const [ex, ey] = ob.ein(), [ax, ay] = ob.aus();
    this.isoEllipse(ctx, ex, ey, 0.005, 0.5, ob.lueckeAmEinstieg() ? 'rgba(255,233,176,0.55)' : 'rgba(200,120,80,0.2)');
    this.isoEllipse(ctx, ax, ay, 0.005, 0.55, 'rgba(120,255,190,0.18)');
  },

  /* Dampfkolben: Zylinder in der Mauer, davor die Stange und der Stempelkopf. Beim Ausschlag steht
     eine Dampfwolke am Zylinder – so sieht man den Schlag auch dann, wenn der Kopf gerade verdeckt
     ist. */
  drawPiston(ctx, ob, t) {
    const s = this.scale;
    const ux = ob.dx, uy = ob.dy, qx = -uy, qy = ux;
    const laenge = Math.abs(ux) * ob.w + Math.abs(uy) * ob.h;    // entlang der Stossrichtung
    const quer = Math.abs(ux) * ob.h + Math.abs(uy) * ob.w;      // Breite quer dazu
    const r = quer / 2, z = r;                                   // die Walze liegt auf dem Boden
    // Rechteck quer zur Achse, um Laenge la und Breite br
    const kasten = (cx, cy, la, br) => [
      [cx - ux * la / 2 - qx * br / 2, cy - uy * la / 2 - qy * br / 2],
      [cx + ux * la / 2 - qx * br / 2, cy + uy * la / 2 - qy * br / 2],
      [cx + ux * la / 2 + qx * br / 2, cy + uy * la / 2 + qy * br / 2],
      [cx - ux * la / 2 + qx * br / 2, cy - uy * la / 2 + qy * br / 2]];
    // Scheibe senkrecht zur Achse - dafuer stehen quer-Richtung und Hoehe
    const scheibe = (cx, cy, rr, farbe) => {
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const w = (i * TAU) / 16;
        const pt = this.proj(cx + qx * Math.cos(w) * rr, cy + qy * Math.cos(w) * rr, z + Math.sin(w) * rr);
        i ? ctx.lineTo(pt[0], pt[1]) : ctx.moveTo(pt[0], pt[1]);
      }
      ctx.closePath(); ctx.fillStyle = farbe; ctx.fill();
    };
    // Gehaeuse: der Bock in der Wand, aus dem der Kolben faehrt
    const gx = ob.x - ux * (laenge / 2 + 0.6), gy = ob.y - uy * (laenge / 2 + 0.6);
    this.prism(ctx, kasten(gx, gy, 1.2, quer + 0.6), 0, 2 * r + 0.3, '#7a5a2a', '#4a3618', { outline: '#2e2210' });
    this.prism(ctx, kasten(gx, gy, 1.32, quer + 0.16), 0, 0.16, '#8e6a34', '#553d1c');   // Sockelplatte
    // Bohrung in der Stirnseite des Gehaeuses
    const bx = ob.x - ux * laenge / 2, by = ob.y - uy * laenge / 2;
    scheibe(bx + ux * 0.02, by + uy * 0.02, r * 1.05, '#241a0c');
    scheibe(bx + ux * 0.06, by + uy * 0.06, r * 0.92, '#120c05');
    // Kolbenstange
    const kr = ob.px - ux * laenge / 2, kry = ob.py - uy * laenge / 2;   // hinteres Ende des Stempels
    if (ob.aus > 0.02) this.walze(ctx, bx, by, kr, kry, z, r * 0.3, '#e3e8f2', '#9aa2b4', { n: 10 });
    // Stempel: runder Kopf auf der Stange
    const heiss = ob.schlaegt;
    this.walze(ctx, kr, kry, ob.px + ux * laenge / 2, ob.py + uy * laenge / 2, z, r,
      heiss ? '#ffdf9c' : '#c9903f', '#6e4a1c', { outline: '#3a2a10' });
    // Ringwulst kurz vor dem Stempelkopf
    scheibe(ob.px + ux * (laenge / 2 - 0.18), ob.py + uy * (laenge / 2 - 0.18), r * 1.08,
      heiss ? 'rgba(255,226,168,0.9)' : 'rgba(160,116,52,0.9)');
    scheibe(ob.px + ux * (laenge / 2 - 0.14), ob.py + uy * (laenge / 2 - 0.14), r * 0.98,
      heiss ? '#ffdf9c' : '#c9903f');
    // Dampf beim Ausschlag
    if (ob.aus > 0.05) {
      const n = 4;
      for (let i = 0; i < n; i++) {
        const u = ((t * 1.6 + i / n) % 1);
        const p = this.proj(ob.x - ob.dx * (0.4 + u * 0.5) + ob.dy * (i - 1.5) * 0.22,
          ob.y - ob.dy * (0.4 + u * 0.5) - ob.dx * (i - 1.5) * 0.22, 0.3 + u * 0.3);
        ctx.fillStyle = `rgba(246,250,255,${(0.45 * (1 - u) * Math.min(1, ob.aus / ob.hub + 0.3)).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p[0], p[1], s * (0.14 + u * 0.3), 0, TAU); ctx.fill();
      }
    }
  },
  /* Boden: der Streifen, den der Kolben bestreicht – kurz vor dem Schlag leuchtet er auf */
  drawPistonFloor(ctx, ob) {
    const bx = ob.dx * ob.hub, by = ob.dy * ob.hub;
    const qx = -ob.dy * ob.h / 2, qy = ob.dx * ob.w / 2;
    const poly = [[ob.x + qx, ob.y + qy], [ob.x + bx + qx, ob.y + by + qy],
      [ob.x + bx - qx, ob.y + by - qy], [ob.x - qx, ob.y - qy]];
    const warm = ob.aus > 0.05 ? 0.3 : 0.12;
    this.fillPoly(ctx, poly, 0.005, `rgba(255,180,90,${warm})`, false);
  },

  /* Zeiger: Stange mit Gegengewicht und einer Spitze wie ein Uhrzeiger. Der helle Streifen an der
     Stange läuft nach außen – er zeigt, wohin ein mitgenommener Ball geschoben wird. */
  drawHand(ctx, ob, t) {
    const s = this.scale, a = ob.angle, ca = Math.cos(a), sa = Math.sin(a), tk = ob.thick;
    const L = ob.len;
    // Punkt auf dem Zeiger: d entlang der Stange, q quer dazu
    const P = (d, q) => [ob.x + ca * d - sa * q, ob.y + sa * d + ca * q];
    // Halbprofil der Stange: sie wird nach aussen schmaler und laeuft in eine Spitze aus
    const profil = [[-1.0, tk * 1.1], [-0.2, tk * 1.7], [L * 0.45, tk * 1.2], [L - 0.55, tk * 0.85], [L, tk * 0.1]];
    const platte = (schrumpf, kuerzer) => {
      const p = [];
      for (const [d, q] of profil) p.push(P(d - kuerzer * (d / L), q * schrumpf));
      for (let i = profil.length - 1; i >= 0; i--) {
        const [d, q] = profil[i]; p.push(P(d - kuerzer * (d / L), -q * schrumpf));
      }
      return p;
    };
    // Gegengewicht: eine Trommel hinter der Achse
    const gw = P(-0.95, 0);
    this.prism(ctx, this.circlePoly(gw[0], gw[1], 0.36, 14), 0.04, 0.5, '#e0b45c', '#7d5a20', { outline: '#33240e' });
    // Die Stange als Koerper mit abgeschraegter Oberkante
    this.frustum(ctx, platte(1, 0), platte(0.52, 0.1), 0.05, 0.48, '#f0cd7d', '#8a6624', { outline: '#3a2a12' });
    // Spitze: heller Keil auf der Oberkante
    const sp = [P(L - 0.9, tk * 0.42), P(L - 0.1, tk * 0.05), P(L - 0.1, -tk * 0.05), P(L - 0.9, -tk * 0.42)];
    this.fillPoly(ctx, sp, 0.49, '#fff0c2', false);
    // wanderndes Glanzlicht auf der Oberkante: der Schub nach aussen
    const u = (t * 0.8) % 1, gl = P(0.5 + u * (L - 0.8), 0);
    const q = this.proj(gl[0], gl[1], 0.5);
    ctx.fillStyle = `rgba(255,255,235,${(0.7 * (1 - u)).toFixed(2)})`;
    ctx.beginPath(); ctx.arc(q[0], q[1], s * 0.12, 0, TAU); ctx.fill();
    // Achse: eine Saeule, auf der der Zeiger sitzt
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.hubR, 12), 0, 0.6, '#8a6624', '#4e3814', { outline: '#2a1d0a' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.hubR * 0.55, 10), 0.6, 0.14, '#ffdf9c', '#a8792c');
  },

  /* ---------------------------------------------------------------------------
     Zahnradfeld, Pendel und Federwerk. Alle drei liegen flach in der Welt oder
     hängen über ihr – nichts steht senkrecht vor der Kamera, denn die Projektion
     legt jede stehende Scheibe schief. Runde Teile liegen deshalb im Boden.
     --------------------------------------------------------------------------- */

  /* Zahnradfeld: die Räder liegen in einer Rinne im Boden und greifen ineinander. Sie sind Körper,
     keine Scheiben – jeder Zahn hat seine eigene Seitenfläche, sonst sähe das Feld von schräg vorn
     aus wie aufgemalt. Der helle Mitnehmer wandert mit dem Feld: Dort wird der Ball gefasst, dort
     setzt es ihn wieder ab. Gezeichnet wird von hinten nach vorn, damit sich die Räder richtig
     überdecken. */
  drawGearField(ctx, ob, t) {
    const s = this.scale, r = ob.r;
    const qx = -ob.uy * (r + 0.22), qy = ob.ux * (r + 0.22);
    const e0x = ob.x0 - ob.ux * (r + 0.22), e0y = ob.y0 - ob.uy * (r + 0.22);
    const e1x = ob.x1 + ob.ux * (r + 0.22), e1y = ob.y1 + ob.uy * (r + 0.22);
    /* Rinne, in der die Räder sitzen. Sie ist schmal und hell gehalten: Die Räder sind inzwischen
       Körper mit eigenen Seitenflächen, die brauchen keinen dunklen Grund mehr, um zu wirken. Ein
       breiter dunkler Streifen sah aus wie ein Schmutzfleck unter der Maschine. */
    const br = r * 0.92;
    this.fillPoly(ctx, [[e0x + ob.uy * -br, e0y + ob.ux * br], [e1x + ob.uy * -br, e1y + ob.ux * br],
      [e1x - ob.uy * -br, e1y - ob.ux * br], [e0x - ob.uy * -br, e0y - ob.ux * br]],
      0.004, 'rgba(40,28,14,0.28)', false);
    const reihe = ob.raeder.map((rad, i) => ({ rad, i })).sort((a, b) => this.depth(a.rad.x, a.rad.y) - this.depth(b.rad.x, b.rad.y));
    for (const { rad, i } of reihe) {
      const w = ob.winkel * rad.dreh + (i % 2 ? Math.PI / ob.zaehne : 0);
      this.zahnrad(ctx, rad.x, rad.y, 0.01, r, r * 0.34, ob.zaehne, w, '#d8a441', '#7a5418', { outline: '#3a2610' });
    }
    /* Der Käfer ist der Mitnehmer: Wo er steht, wird der Ball gefasst. Steht das Feld an einer
       Station, leuchtet der Boden unter ihm – das ist die Einladung zum Einsteigen. */
    if (ob.docked) {
      const puls = 0.55 + 0.45 * Math.sin(t * 5);
      this.isoEllipse(ctx, ob.x, ob.y, 0.008, 0.75, `rgba(255,226,150,${(0.22 * puls).toFixed(2)})`);
    }
    const vx = ob.ux * (ob.dir || 1), vy = ob.uy * (ob.dir || 1);
    this.drawKaefer(ctx, ob.x, ob.y, vx, vy, !ob.docked, t);
  },

  /* Aufziehkäfer: das Gefährt des Zahnradfelds. Ein Messingkäfer mit Grünspan-Panzer, der den
     Ball auf dem Rücken trägt und auf sechs Beinen über die Räder läuft. Er löst drei Dinge auf
     einmal: Man sieht, dass man mitfährt; man sieht von weitem, wo der Mitnehmer gerade steht;
     und die Welt bekommt eine Figur, so wie das Kolosseum seinen Gladiator hat.

     Er läuft nur, während das Feld fährt - steht es an einer Station, bleibt er stehen und zuckt
     nur mit den Fühlern. Genau dann darf man einsteigen, und das soll man ihm ansehen.
     ux/uy ist seine Blickrichtung, 'laufen' sagt, ob die Beine gehen. */
  drawKaefer(ctx, x, y, ux, uy, laufen, t) {
    const s = this.scale;
    const qx = -uy, qy = ux;                                   // quer zur Blickrichtung
    // Punkt im Käferkoordinatensystem: a nach vorn, b nach rechts, z hoch
    const P = (a, b, z) => this.proj(x + ux * a + qx * b, y + uy * a + qy * b, z);
    const W = (a, b) => [x + ux * a + qx * b, y + uy * a + qy * b];
    // Ellipse in Käferrichtung als Weltpolygon – daraus wird der Panzer ein Körper
    const oval = (la, br, n = 14) => {
      const p = [];
      for (let i = 0; i < n; i++) { const w = (i * TAU) / n; p.push(W(Math.cos(w) * la, Math.sin(w) * br)); }
      return p;
    };
    this.isoEllipse(ctx, x, y, 0.004, 0.78, 'rgba(0,0,0,0.26)');
    // Beine: drei je Seite, im Wechselschritt. Sie setzen auf dem Boden auf, damit der Käfer nicht
    // über den Rädern zu schweben scheint.
    ctx.strokeStyle = '#6b4a14'; ctx.lineWidth = Math.max(1.5, s * 0.055); ctx.lineCap = 'round';
    for (const seite of [-1, 1]) {
      for (let i = 0; i < 3; i++) {
        const a0 = -0.34 + i * 0.34;
        const schwung = laufen ? Math.sin(t * 9 + i * 2.1 + (seite > 0 ? Math.PI : 0)) * 0.15 : 0;
        const h = P(a0, seite * 0.32, 0.2);
        const k = P(a0 + schwung * 0.5, seite * 0.56, 0.26);
        const f = P(a0 + schwung, seite * 0.7, 0.005);
        ctx.beginPath(); ctx.moveTo(h[0], h[1]); ctx.lineTo(k[0], k[1]); ctx.lineTo(f[0], f[1]); ctx.stroke();
      }
    }
    ctx.lineCap = 'butt';
    // Kopf mit Fühlern und Augen
    const kopf = W(0.78, 0);
    this.prism(ctx, this.circlePoly(kopf[0], kopf[1], 0.22, 9), 0.05, 0.24, '#c9963f', '#7a5418', { outline: '#3a2610' });
    ctx.strokeStyle = '#8a6624'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.lineCap = 'round';
    for (const seite of [-1, 1]) {
      const zuck = Math.sin(t * (laufen ? 7 : 2.4) + seite) * 0.06;
      const a = P(0.82, seite * 0.09, 0.29), b = P(1.18 + zuck, seite * (0.32 + zuck), 0.46);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
      ctx.fillStyle = '#ffdf9c'; ctx.beginPath(); ctx.arc(b[0], b[1], s * 0.05, 0, TAU); ctx.fill();
    }
    ctx.lineCap = 'butt';
    for (const seite of [-1, 1]) {
      const e = P(0.9, seite * 0.11, 0.27);
      ctx.fillStyle = '#2a1d0a'; ctx.beginPath(); ctx.arc(e[0], e[1], s * 0.045, 0, TAU); ctx.fill();
    }
    // Panzer: Grünspan über Messing, mit Naht in der Mitte
    this.prism(ctx, oval(0.66, 0.5), 0.04, 0.26, '#3f9d86', '#1d5a4d', { outline: '#0d2f28' });
    this.prism(ctx, oval(0.5, 0.37), 0.3, 0.07, '#5cc0a6', '#256d5e');
    const n0 = P(-0.46, 0, 0.375), n1 = P(0.44, 0, 0.375);
    ctx.strokeStyle = 'rgba(18,58,50,0.7)'; ctx.lineWidth = Math.max(1, s * 0.045);
    ctx.beginPath(); ctx.moveTo(n0[0], n0[1]); ctx.lineTo(n1[0], n1[1]); ctx.stroke();
    // Aufziehschlüssel hinten auf dem Rücken: Stift und zwei Flügel, die sich langsam drehen
    const sch = W(-0.6, 0);
    this.prism(ctx, this.circlePoly(sch[0], sch[1], 0.07, 8), 0.2, 0.3, '#ffdf9c', '#a8792c');
    const [kx, ky] = this.proj(sch[0], sch[1], 0.53);
    const dreh = laufen ? t * 1.9 : t * 0.5;
    ctx.save(); ctx.translate(kx, ky); ctx.rotate(dreh);
    ctx.fillStyle = '#e0b45c'; ctx.strokeStyle = '#7d5a20'; ctx.lineWidth = Math.max(1, s * 0.03);
    for (const seite of [-1, 1]) {
      ctx.beginPath(); ctx.ellipse(seite * s * 0.14, 0, s * 0.13, s * 0.07, 0, 0, TAU);
      ctx.fill(); ctx.stroke();
    }
    ctx.fillStyle = '#ffdf9c'; ctx.beginPath(); ctx.arc(0, 0, s * 0.04, 0, TAU); ctx.fill();
    ctx.restore();
  },

  /* Pendel: die Linse hängt an einer Stange, die von oben herunterkommt – über dem Ball, nicht
     in seinem Weg. Auf dem Boden liegt der Bogen, den sie bestreicht, damit man die Schwingbahn
     schon von weitem sieht und nicht erst, wenn man darin liegt. */
  /* Der Bogen, den die Linse bestreicht. Gezeichnet werden zwei feine Schienen an seinen Rändern
     statt eines breiten weichen Streifens: Der sah auf dem Pflaster aus wie ein Wischer, und man
     konnte an ihm nicht ablesen, wie breit die Linse wirklich ist. Zwei Linien sagen genau das. */
  drawPendulumFloor(ctx, ob, t) {
    const s = this.scale, br = ob.w * 0.5;
    ctx.strokeStyle = 'rgba(255,214,110,0.3)'; ctx.lineWidth = Math.max(1, s * 0.045);
    const n = 20;
    for (const sd of [-1, 1]) {
      ctx.beginPath();
      for (let i = 0; i <= n; i++) {
        const a = ob.ruheR - ob.ampR + (2 * ob.ampR * i) / n;
        const [px, py] = this.proj(ob.ax + Math.cos(a) * (ob.len + sd * br), ob.ay + Math.sin(a) * (ob.len + sd * br), 0.004);
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    }
    this.isoEllipse(ctx, ob.x, ob.y, 0.006, br * 0.95, 'rgba(0,0,0,0.22)');
  },
  drawPendulum(ctx, ob, t) {
    const s = this.scale, r = ob.w * 0.45;
    // Stange: von der Aufhängung hoch oben herab zur Linse
    const [ax, ay] = this.proj(ob.ax, ob.ay, ob.hoehe + 1.6);
    const [bx, by] = this.proj(ob.x, ob.y, 0.75);
    ctx.strokeStyle = '#8a6624'; ctx.lineWidth = Math.max(2.5, s * 0.1); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.strokeStyle = '#e0b45c'; ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(bx, by); ctx.stroke();
    ctx.lineCap = 'butt';
    // Aufhängung: ein Lagerbock, der oben in der Luft hängt (die Bahn darunter bleibt frei)
    ctx.fillStyle = '#5a4520'; ctx.beginPath(); ctx.arc(ax, ay, s * 0.16, 0, TAU); ctx.fill();
    ctx.fillStyle = '#ffdf9c'; ctx.beginPath(); ctx.arc(ax, ay, s * 0.07, 0, TAU); ctx.fill();
    // Linse: der schwere Körper, der den Ball wegräumt
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r, 14), 0, 0.72, '#e8c774', '#8a6624', { outline: '#33240e' });
    this.isoEllipse(ctx, ob.x, ob.y, 0.735, r * 0.55, '#fff1c4');
    this.isoEllipse(ctx, ob.x, ob.y, 0.74, r * 0.22, '#a8792c');
  },

  /* Federwerk: eine Spiralfeder, die in den Boden eingelassen ist. Geladen zieht sie sich
     zusammen, nach dem Schuss schwingt sie kurz weit auf. Der Arm zeigt, wohin es geht. */
  drawSpringWorkFloor(ctx, ob, t) {
    const s = this.scale, dx = Math.cos(ob.angle), dy = Math.sin(ob.angle), R = 0.9 + ob.range;
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.catchR + 0.35, 'rgba(0,0,0,0.25)');
    ctx.fillStyle = 'rgba(255,210,120,0.55)';
    for (let d = 1.6; d < R - 0.5; d += 0.7) { const [px, py] = this.proj(ob.x + dx * d, ob.y + dy * d, 0.01); ctx.beginPath(); ctx.arc(px, py, s * 0.05, 0, TAU); ctx.fill(); }
    this.isoEllipse(ctx, ob.x + dx * R, ob.y + dy * R, 0.006, 0.45, 'rgba(255,210,120,0.3)');
    this.isoEllipse(ctx, ob.x + dx * R, ob.y + dy * R, 0.008, 0.2, 'rgba(255,240,200,0.55)');
  },
  drawSpringWork(ctx, ob, t) {
    const s = this.scale, r = ob.catchR + 0.45;
    // Topf im Boden
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r, 14), 0, 0.22, '#6e5220', '#3e2e11', { outline: '#241a09' });
    this.isoEllipse(ctx, ob.x, ob.y, 0.225, r * 0.86, '#241a09');
    // Spirale: eng, wenn gespannt – weit, kurz nach dem Schuss
    const nach = Math.max(0, 1 - (t - ob.firedAt) * 3);
    const eng = ob.loaded ? 1 : 0.55 + 0.45 * nach;
    const wind = 3.2, r0 = r * 0.14, r1 = r * 0.82 * (1 - 0.32 * eng);
    ctx.strokeStyle = ob.loaded ? '#ffe9b0' : '#d8a441';
    ctx.lineWidth = Math.max(2, s * 0.09); ctx.lineJoin = 'round';
    ctx.beginPath();
    const N = 90;
    for (let i = 0; i <= N; i++) {
      const u = i / N, a = ob.angle + u * TAU * wind, rr = r0 + (r1 - r0) * u;
      const [px, py] = this.proj(ob.x + Math.cos(a) * rr, ob.y + Math.sin(a) * rr, 0.24);
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.stroke();
    // Federarm am äußeren Ende: er zeigt die Schussrichtung
    const ex = ob.x + Math.cos(ob.angle) * r1, ey = ob.y + Math.sin(ob.angle) * r1;
    this.prism(ctx, this.circlePoly(ex, ey, 0.17, 8), 0.24, 0.26, '#ffdf9c', '#a8792c');
    // Achse in der Mitte
    this.prism(ctx, this.circlePoly(ob.x, ob.y, 0.16, 10), 0.22, 0.34, '#e8c774', '#8a6624', { outline: '#33240e' });
  },

  /* ---------------------------------------------------------------------------
     Kupferrohr und Hemmung.
     --------------------------------------------------------------------------- */

  /* Kupferrohr: ein liegendes Rohr, dessen Mund zur Bahn zeigt. Eingang und Ausgang werden
     getrennt einsortiert und beide von hier gezeichnet – 'ausgang' sagt, welcher gerade dran ist.
     Der Mund ist eine dunkle Scheibe in der Stirnfläche: So sieht man von jeder Kameradrehung aus,
     dass das Rohr offen ist und wohin es zeigt. */
  drawCopperPipe(ctx, ob, t, ausgang) {
    const s = this.scale;
    const cx = ausgang ? ob.ax : ob.x, cy = ausgang ? ob.ay : ob.y;
    if (cx == null) return;
    let ux = ausgang ? ob.ausMundX : ob.mundX, uy = ausgang ? ob.ausMundY : ob.mundY;
    if (!ux && !uy) { ux = ob.dx; uy = ob.dy; }          // Notfall: die Auswurfrichtung
    const L = Math.hypot(ux, uy) || 1; ux /= L; uy /= L;
    const qx = -uy, qy = ux;                              // quer zur Rohrachse, waagerecht
    const r = 0.42, z = r + 0.1;
    const kupfer = ['#e08b4c', '#8a4a1e'], dunkel = '#3a1c08';
    // Scheibe senkrecht zur Rohrachse (quer-Richtung und Höhe spannen sie auf)
    const scheibe = (mx, my, rr, farbe) => {
      ctx.beginPath();
      for (let i = 0; i <= 16; i++) {
        const w = (i * TAU) / 16;
        const p = this.proj(mx + qx * Math.cos(w) * rr, my + qy * Math.cos(w) * rr, z + Math.sin(w) * rr);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.closePath(); ctx.fillStyle = farbe; ctx.fill();
    };
    // Sockel, damit das Rohr nicht schwebt
    this.prism(ctx, [[cx - qx * 0.5 - ux * 0.45, cy - qy * 0.5 - uy * 0.45], [cx + qx * 0.5 - ux * 0.45, cy + qy * 0.5 - uy * 0.45],
      [cx + qx * 0.5 + ux * 0.4, cy + qy * 0.5 + uy * 0.4], [cx - qx * 0.5 + ux * 0.4, cy - qy * 0.5 + uy * 0.4]],
      0, 0.16, '#6b4a24', '#3e2a12', { outline: '#241708' });
    // Rohrkörper: von hinten aus dem Boden bis zum Mund an der Kachelkante
    const hx = cx - ux * 0.5, hy = cy - uy * 0.5, mx = cx + ux * 0.52, my = cy + uy * 0.52;
    this.walze(ctx, hx, hy, mx, my, z, r, kupfer[0], kupfer[1], { n: 14, outline: dunkel });
    // Nietenband kurz vor dem Mund
    const nx = cx + ux * 0.24, ny = cy + uy * 0.24;
    scheibe(nx, ny, r * 1.1, '#c9762f');
    scheibe(nx + ux * 0.05, ny + uy * 0.05, r * 0.98, '#f0a35e');
    for (let i = 0; i < 8; i++) {
      const w = (i * TAU) / 8 + 0.2;
      const p = this.proj(nx + ux * 0.06 + qx * Math.cos(w) * r * 1.04, ny + uy * 0.06 + qy * Math.cos(w) * r * 1.04, z + Math.sin(w) * r * 1.04);
      ctx.fillStyle = '#7d4416'; ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(1.2, s * 0.045), 0, TAU); ctx.fill();
    }
    // Der offene Mund
    scheibe(mx, my, r * 0.92, '#3a1c08');
    scheibe(mx + ux * 0.05, my + uy * 0.05, r * 0.74, '#180b03');
    // Dampfaustritt aus dem Ventil oben – kräftig, wenn das Rohr gerade geschluckt oder gespien hat
    const seit = t - (ausgang ? ob.speiAt : ob.schluckAt);
    const stoss = Math.max(0, 1 - seit / 0.9);
    const [vx, vy] = this.proj(cx - ux * 0.28, cy - uy * 0.28, z + r + 0.12);
    ctx.fillStyle = '#8a4a1e'; ctx.beginPath(); ctx.arc(vx, vy, s * 0.09, 0, TAU); ctx.fill();
    for (let i = 0; i < 4; i++) {
      const u = ((t * 0.9 + i / 4) % 1);
      const dicht = 0.12 + 0.5 * stoss;
      const p = this.proj(cx - ux * (0.28 + u * 0.25) + qx * (i - 1.5) * 0.1, cy - uy * (0.28 + u * 0.25) + qy * (i - 1.5) * 0.1, z + r + 0.15 + u * 0.7);
      ctx.fillStyle = `rgba(238,246,255,${(dicht * (1 - u)).toFixed(3)})`;
      ctx.beginPath(); ctx.arc(p[0], p[1], s * (0.1 + u * 0.26), 0, TAU); ctx.fill();
    }
  },

  /* Hemmung, Boden: die beiden Durchlässe. Der offene leuchtet, der gesperrte bleibt dunkel –
     man soll von weitem sehen, welche Seite gerade dran ist, nicht erst aus zwei Kacheln Abstand. */
  drawEscapementFloor(ctx, ob, t) {
    for (const [auf, sd] of [[ob.aufA, -1], [ob.aufB, 1]]) {
      const { cx, cy, laenge, dick } = ob.haelfte(sd);
      const poly = ob.laengs
        ? [[cx - laenge / 2, cy - dick], [cx + laenge / 2, cy - dick], [cx + laenge / 2, cy + dick], [cx - laenge / 2, cy + dick]]
        : [[cx - dick, cy - laenge / 2], [cx + dick, cy - laenge / 2], [cx + dick, cy + laenge / 2], [cx - dick, cy + laenge / 2]];
      const hell = auf * auf;
      this.fillPoly(ctx, poly, 0.005, `rgba(255,214,110,${(0.06 + 0.24 * hell).toFixed(3)})`, false);
    }
  },
  /* Hemmung: zwei Klinken, die aus den Pfosten fahren, dazwischen der Anker, der zur offenen Seite
     kippt. Eine Klinke, die halb draußen ist, sperrt noch – dieselbe Regel wie beim Fallgatter. */
  drawEscapement(ctx, ob, t) {
    const s = this.scale, H = ob.hoehe;
    const messing = ['#e0b45c', '#8a6624'], stahl = ['#c6ccda', '#5e6472'];
    for (const [auf, sd] of [[ob.aufA, -1], [ob.aufB, 1]]) {
      const { cx, cy, laenge, dick } = ob.haelfte(sd);
      // Pfosten am äußeren Ende, in dem die Klinke steckt
      const px = ob.x + (ob.laengs ? sd * laenge : 0), py = ob.y + (ob.laengs ? 0 : sd * laenge);
      this.prism(ctx, this.circlePoly(px, py, dick * 0.75, 8), 0, H + 0.3, messing[0], messing[1], { outline: '#33240e' });
      // Klinke: fährt vom Pfosten zur Mitte, je weiter 'auf', desto weiter zurückgezogen
      const raus = laenge * (1 - auf);
      if (raus > 0.05) {
        const ex = px - (ob.laengs ? sd * raus : 0), ey = py - (ob.laengs ? 0 : sd * raus);
        const mx = (px + ex) / 2, my = (py + ey) / 2;
        const poly = ob.laengs ? [[Math.min(px, ex), my - dick / 2], [Math.max(px, ex), my - dick / 2], [Math.max(px, ex), my + dick / 2], [Math.min(px, ex), my + dick / 2]]
          : [[mx - dick / 2, Math.min(py, ey)], [mx + dick / 2, Math.min(py, ey)], [mx + dick / 2, Math.max(py, ey)], [mx - dick / 2, Math.max(py, ey)]];
        this.prism(ctx, poly, 0.04, H, stahl[0], stahl[1], { outline: '#22262f' });
        // Zahn an der Spitze: daran erkennt man die Sperrklinke
        this.prism(ctx, this.circlePoly(ex, ey, dick * 0.55, 6), 0.04, H + 0.12,
          ob.zuA && sd < 0 || ob.zuB && sd > 0 ? '#ffdf9c' : '#9aa2b4', messing[1], { outline: '#33240e' });
      }
    }
    // Anker in der Mitte: er kippt zur offenen Seite und sagt, was als Nächstes kommt
    const k = ob.anker * 0.45;
    const ax = ob.x + (ob.laengs ? k * 0.5 : 0), ay = ob.y + (ob.laengs ? 0 : k * 0.5);
    this.prism(ctx, this.circlePoly(ob.x, ob.y, 0.2, 10), 0, H + 0.45, messing[0], messing[1], { outline: '#33240e' });
    const [c0, c1] = this.proj(ob.x, ob.y, H + 0.45), [a0, a1] = this.proj(ax, ay, H + 0.5);
    ctx.strokeStyle = '#ffdf9c'; ctx.lineWidth = Math.max(2, s * 0.09); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(c0, c1); ctx.lineTo(a0, a1); ctx.stroke(); ctx.lineCap = 'butt';
  },

  /* ---------------------------------------------------------------------------
     Zeigerarm und Zifferblatt.
     --------------------------------------------------------------------------- */

  /* Das Zifferblatt, auf dem beide arbeiten: ein Ring mit Stundenmarken, flach im Boden.
     'gross' macht die Marken kräftiger – das Zifferblatt braucht sie deutlicher als der Arm. */
  ziffernkreis(ctx, x, y, r, marken, gross) {
    const s = this.scale;
    this.isoEllipse(ctx, x, y, 0.002, r + 0.7, 'rgba(20,14,6,0.35)');
    this.isoEllipse(ctx, x, y, 0.003, r + 0.5, 'rgba(246,236,205,0.10)');
    ctx.strokeStyle = 'rgba(255,214,110,0.35)'; ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath();
    for (let i = 0; i <= 48; i++) {
      const a = (i * TAU) / 48;
      const p = this.proj(x + Math.cos(a) * r, y + Math.sin(a) * r, 0.006);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke();
    for (let i = 0; i < marken; i++) {
      const a = -Math.PI / 2 + (i * TAU) / marken, dick = i % 3 === 0 ? 1.6 : 1;
      const p0 = this.proj(x + Math.cos(a) * (r - 0.45), y + Math.sin(a) * (r - 0.45), 0.007);
      const p1 = this.proj(x + Math.cos(a) * (r + 0.35), y + Math.sin(a) * (r + 0.35), 0.007);
      ctx.strokeStyle = `rgba(255,232,170,${gross ? 0.7 : 0.45})`;
      ctx.lineWidth = Math.max(1.5, s * 0.06 * dick);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    }
  },

  drawSweepHandFloor(ctx, ob, t) { this.ziffernkreis(ctx, ob.x, ob.y, ob.r, 12, false); },
  /* Zeigerarm: eine lange Stange mit Gegengewicht, wie der Minutenzeiger einer Turmuhr. Sie hat
     Höhe, damit sie den Ball sichtbar vor sich herschiebt und nicht über ihn hinweggeht. */
  drawSweepHand(ctx, ob, t) {
    const s = this.scale, ca = Math.cos(ob.angle), sa = Math.sin(ob.angle), tk = ob.thick, L = ob.r;
    const P = (d, q) => [ob.x + ca * d - sa * q, ob.y + sa * d + ca * q];
    const profil = [[-1.2, tk * 1.0], [-0.2, tk * 1.6], [L * 0.5, tk * 1.15], [L - 0.6, tk * 0.8], [L, tk * 0.12]];
    const platte = (schrumpf, kuerzer) => {
      const p = [];
      for (const [d, q] of profil) p.push(P(d - kuerzer * (d / L), q * schrumpf));
      for (let i = profil.length - 1; i >= 0; i--) { const [d, q] = profil[i]; p.push(P(d - kuerzer * (d / L), -q * schrumpf)); }
      return p;
    };
    const gw = P(-1.15, 0);
    this.prism(ctx, this.circlePoly(gw[0], gw[1], 0.4, 14), 0.04, ob.hoehe * 0.9, '#e0b45c', '#7d5a20', { outline: '#33240e' });
    this.frustum(ctx, platte(1, 0), platte(0.5, 0.12), 0.05, ob.hoehe, '#f0cd7d', '#8a6624', { outline: '#3a2a12' });
    // heller Grat auf der Oberkante: er zeigt, wohin geschoben wird
    this.fillPoly(ctx, [P(L - 1.1, tk * 0.4), P(L - 0.15, tk * 0.06), P(L - 0.15, -tk * 0.06), P(L - 1.1, -tk * 0.4)], ob.hoehe + 0.01, '#fff0c2', false);
    // Nabe
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.nabe, 12), 0, ob.hoehe + 0.35, '#8a6624', '#4e3814', { outline: '#2a1d0a' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.nabe * 0.5, 10), ob.hoehe + 0.35, 0.12, '#ffdf9c', '#a8792c');
  },

  /* Zeigerwerk, Boden: das Zifferblatt und darauf die drei Wirkfelder. Die Felder müssen sichtbar
     sein, sonst wirkt die Bahn willkürlich – man soll den Zeiger kommen sehen und ihm ausweichen
     oder ihn mitnehmen. Die Farben sind die der Korallen: blau bremst, grün stößt, rot zieht. */
  ZEIGERWERK_FARBEN: { bremsen: '110,180,255', stossen: '110,230,130', ziehen: '255,110,110' },
  drawHandClockFloor(ctx, ob, t) {
    const s = this.scale;
    this.ziffernkreis(ctx, ob.x, ob.y, ob.r, 12, true);
    for (const z of ob.zeiger) {
      const col = this.ZEIGERWERK_FARBEN[z.wirkung];
      const ca = Math.cos(z.angle), sa = Math.sin(z.angle);
      const P = (d, q) => this.proj(ob.x + ca * d - sa * q, ob.y + sa * d + ca * q, 0.005);
      // Das Feld ist die Fläche im Abstand 'feld' um die Zeigerstrecke: ein Rechteck mit rundem Kopf.
      const rand = [];
      for (let i = 0; i <= 10; i++) { const a = -Math.PI / 2 + (i / 10) * Math.PI; rand.push(P(z.laenge + Math.cos(a) * z.feld, Math.sin(a) * z.feld)); }
      for (let i = 0; i <= 10; i++) { const a = Math.PI / 2 + (i / 10) * Math.PI; rand.push(P(Math.cos(a) * z.feld, Math.sin(a) * z.feld)); }
      ctx.fillStyle = `rgba(${col},0.12)`;
      ctx.beginPath(); rand.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
      // Ein wandernder Strich im Feld sagt, wohin es wirkt: nach außen beim Stoßen, zur Linie beim
      // Ziehen, und beim Bremsen stehende Querstriche, die nur pulsieren.
      ctx.lineWidth = Math.max(1, s * 0.045);
      for (let i = 0; i < 4; i++) {
        let u = (t * 0.5 + i / 4) % 1;
        if (z.wirkung === 'ziehen') u = 1 - u;
        if (z.wirkung === 'bremsen') u = (i + 1) / 5;
        const q = z.feld * (z.wirkung === 'bremsen' ? 1 : u);
        ctx.strokeStyle = `rgba(${col},${z.wirkung === 'bremsen' ? 0.18 + 0.14 * Math.sin(t * 2 + i) : 0.4 * (1 - u) + 0.08})`;
        for (const vz of [1, -1]) {
          const a = P(z.laenge * 0.18, vz * q), b = P(z.laenge * 0.92, vz * q);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
    }
  },
  /* Zeigerwerk, Körper: drei Zeiger auf einer Achse. Der kurze dicke unten, der lange dünne oben –
     so verdecken sie einander nicht, und man sieht auf einen Blick, welcher welcher ist. Farbig ist
     nur die Spitze: Das Messing bleibt Messing, die Wirkung steht vorn. */
  drawHandClock(ctx, ob, t) {
    const ZF = { bremsen: ['#7fb6ff', '#2b5c9e'], stossen: ['#8be6a4', '#256f3c'], ziehen: ['#ff9b9b', '#8f2b2b'] };
    const stufen = [{ z0: 0.22, h: 0.16, tk: 0.30 }, { z0: 0.44, h: 0.13, tk: 0.22 }, { z0: 0.63, h: 0.10, tk: 0.14 }];
    // Achse unter allem: ein Messingzylinder, auf dem die drei Zeiger sitzen
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.nabe, 14), 0, 0.22, '#8a6624', '#4e3814', { outline: '#2a1d0a' });
    for (let i = 0; i < ob.zeiger.length; i++) {
      const z = ob.zeiger[i], st = stufen[i], [hell, dunkel] = ZF[z.wirkung];
      const ca = Math.cos(z.angle), sa = Math.sin(z.angle), L = z.laenge;
      const P = (d, q) => [ob.x + ca * d - sa * q, ob.y + sa * d + ca * q];
      const platte = (k) => [P(-L * 0.14, st.tk * k), P(L * 0.55, st.tk * 0.85 * k), P(L, st.tk * 0.1 * k),
        P(L, -st.tk * 0.1 * k), P(L * 0.55, -st.tk * 0.85 * k), P(-L * 0.14, -st.tk * k)];
      this.prism(ctx, platte(1), st.z0, st.h, '#f0cd7d', '#8a6624', { outline: '#3a2a12' });
      // Spitze in der Farbe der Wirkung
      const sp = [P(L * 0.62, st.tk * 0.7), P(L, st.tk * 0.1), P(L, -st.tk * 0.1), P(L * 0.62, -st.tk * 0.7)];
      this.prism(ctx, sp, st.z0 + st.h, 0.05, hell, dunkel);
      // Nabenring dieses Zeigers, damit die Achse nicht nackt dasteht
      this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.nabe * (0.9 - i * 0.18), 12), st.z0, st.h, '#d8b263', '#6d4d18');
    }
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.nabe * 0.36, 10), 0.73, 0.14, '#ffdf9c', '#a8792c', { outline: '#2a1d0a' });
  },

  /* Wanderloch: alle Stellen, die nächste hell und mit schrumpfendem Ring. Der Ring ist die Uhr –
     ist er zu, springt das Loch dorthin. Man soll den Schlag planen können, nicht raten.
     Auf einem Kreis (dem Zifferblatt des Turms) kommt der Ziffernkreis dazu; bei frei gesetzten
     Stellen verbindet stattdessen eine feine Linie die Stellen in ihrer Reihenfolge – sonst müßte
     man erst zusehen, um zu wissen, wohin es überhaupt geht. */
  drawWanderlochFloor(ctx, ob, t) {
    const s = this.scale;
    if (ob.ring) this.ziffernkreis(ctx, ob.x, ob.y, ob.r, ob.marken, true);
    else {
      ctx.strokeStyle = 'rgba(255,214,110,0.22)'; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.setLineDash([s * 0.22, s * 0.22]);
      ctx.beginPath();
      for (let i = 0; i <= ob.orte.length; i++) {
        const [px, py] = ob.orte[i % ob.orte.length];
        const p = this.proj(px, py, 0.006);
        i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
      }
      ctx.stroke(); ctx.setLineDash([]);
    }
    for (let i = 0; i < ob.orte.length; i++) {
      const [px, py] = ob.orte[i];
      if (i === ob.i) continue;                              // dort steckt gerade das Loch
      const naechste = i === ob.next;
      this.isoEllipse(ctx, px, py, 0.008, naechste ? 0.55 : 0.34, naechste ? 'rgba(255,214,110,0.3)' : 'rgba(255,236,190,0.12)');
      this.isoEllipse(ctx, px, py, 0.01, naechste ? 0.3 : 0.16, naechste ? 'rgba(255,246,215,0.6)' : 'rgba(255,236,190,0.22)');
    }
    // Der schrumpfende Ring an der nächsten Stelle: so viel Zeit bleibt noch
    const [nx, ny] = ob.orte[ob.next];
    const [sx, sy] = this.proj(nx, ny, 0.012);
    const u = Math.max(0, Math.min(1, ob.rest / WANDERLOCH_TAKT));
    ctx.strokeStyle = 'rgba(255,226,150,0.85)'; ctx.lineWidth = Math.max(2, s * 0.07);
    ctx.beginPath();
    ctx.ellipse(sx, sy, 0.8 * s, 0.8 * s * this.cam.tilt, 0, -Math.PI / 2, -Math.PI / 2 + u * TAU);
    ctx.stroke();
  },
});
