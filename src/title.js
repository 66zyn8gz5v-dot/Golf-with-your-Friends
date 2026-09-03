/* Animierte Szene für den Startbildschirm: Wiesen, Burgberg mit Tannen, Burg, Bauernhaus, Schafe,
   Tag-Nacht-Wechsel mit Sonne, Mond, Sternen und Glühwürmchen, Vögel, ein Drache – und ein Ball,
   der in Endlosschleife eingelocht wird. Seitenansicht, alles relativ zur Bildgröße. */
const TitleScene = (() => {
  const rnd = seededRandom(4711);
  const clouds = Array.from({ length: 9 }, () => ({ x: rnd(), y: 0.04 + rnd() * 0.28, s: 0.5 + rnd() * 0.9, v: 0.006 + rnd() * 0.012, a: 0.65 + rnd() * 0.3 }));
  const birds = Array.from({ length: 6 }, () => ({ x: rnd(), y: 0.12 + rnd() * 0.25, v: 0.03 + rnd() * 0.03, f: 4 + rnd() * 3, p: rnd() * 6 }));
  const stars = Array.from({ length: 90 }, () => ({ x: rnd(), y: rnd() * 0.55, s: 0.5 + rnd(), p: rnd() * 6 }));
  const flowers = Array.from({ length: 70 }, () => ({ x: rnd(), d: rnd(), c: ['#ff6b9d', '#ffd166', '#ffffff', '#c77dff', '#ff8c42'][Math.floor(rnd() * 5)] }));
  const slopeFirs = Array.from({ length: 46 }, () => ({ u: rnd(), side: rnd() < 0.5 ? -1 : 1, j: rnd(), k: rnd() }));
  const meadowFirs = Array.from({ length: 14 }, () => ({ x: rnd(), s: 0.6 + rnd() * 0.8, layer: Math.floor(rnd() * 2) }));
  const sheep = Array.from({ length: 5 }, (_, i) => ({ x: 0.08 + i * 0.09 + rnd() * 0.04, p: rnd() * 6, v: 0.004 + rnd() * 0.004, s: 0.8 + rnd() * 0.4 }));
  const flies = Array.from({ length: 26 }, () => ({ x: rnd(), y: rnd(), p: rnd() * 6, v: 0.6 + rnd() }));
  let sparks = [], lastBallPhase = 0, windows = [];

  const DAY = 110; // Sekunden für einen ganzen Tag
  const lerp = (a, b, u) => a + (b - a) * u;
  const mix = (c1, c2, u) => { const a = hexToRgb(c1), b = hexToRgb(c2); return `rgb(${Math.round(lerp(a[0], b[0], u))},${Math.round(lerp(a[1], b[1], u))},${Math.round(lerp(a[2], b[2], u))})`; };
  const smooth = u => u * u * (3 - 2 * u);

  // Hügel-Oberflächen (y in Pixeln)
  const hill = (layer, x, w, h) => {
    const k = [0.0071, 0.0052, 0.0038][layer], base = [0.70, 0.78, 0.86][layer], amp = [0.035, 0.045, 0.05][layer];
    return h * (base + amp * Math.sin(x * k * (1000 / w) + layer * 1.7) + amp * 0.5 * Math.sin(x * k * 2.3 * (1000 / w) + layer));
  };

  function fir(ctx, x, y, s, dark) {
    ctx.fillStyle = '#5a3a1e'; ctx.fillRect(x - s * 0.06, y - s * 0.25, s * 0.12, s * 0.25);
    for (let i = 0; i < 3; i++) {
      const w = s * (0.42 - i * 0.1), y0 = y - s * (0.2 + i * 0.28), hh = s * 0.45;
      ctx.fillStyle = (i % 2 === 0) !== dark ? '#2f6b3a' : '#255a30';
      ctx.beginPath(); ctx.moveTo(x - w, y0); ctx.lineTo(x + w, y0); ctx.lineTo(x, y0 - hh); ctx.closePath(); ctx.fill();
    }
  }
  function flag(ctx, fx, fy, w, t, col) {
    ctx.strokeStyle = '#3a2a1a'; ctx.lineWidth = Math.max(1, w * 0.05); ctx.beginPath(); ctx.moveTo(fx, fy); ctx.lineTo(fx, fy - w * 0.9); ctx.stroke();
    ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(fx, fy - w * 0.9);
    for (let i = 1; i <= 6; i++) { const u = i / 6; ctx.lineTo(fx + u * w * 0.9, fy - w * 0.9 + Math.sin(t * 6 - u * 4) * w * 0.08 * u + u * w * 0.05); }
    ctx.lineTo(fx + w * 0.9, fy - w * 0.9 + w * 0.32 + Math.sin(t * 6 - 4) * w * 0.08); ctx.lineTo(fx, fy - w * 0.45); ctx.closePath(); ctx.fill();
  }
  function tower(ctx, x, top, w, hgt, t, flagCol) {
    ctx.fillStyle = '#cfc9bf'; ctx.fillRect(x - w / 2, top, w / 2, hgt);
    ctx.fillStyle = '#9a948a'; ctx.fillRect(x, top, w / 2, hgt);
    ctx.fillStyle = '#b8b2a8';
    for (let i = 0; i < 4; i++) ctx.fillRect(x - w / 2 + (i * w) / 4, top - w * 0.12, w / 8, w * 0.12);
    ctx.fillStyle = '#a63d3d'; ctx.beginPath(); ctx.moveTo(x - w * 0.72, top); ctx.lineTo(x + w * 0.72, top); ctx.lineTo(x, top - w * 1.5); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#c95050'; ctx.beginPath(); ctx.moveTo(x - w * 0.72, top); ctx.lineTo(x, top); ctx.lineTo(x, top - w * 1.5); ctx.closePath(); ctx.fill();
    windows.push({ x: x - w * 0.1, y: top + hgt * 0.35, w: w * 0.2, h: w * 0.3 });
    flag(ctx, x, top - w * 1.5, w, t, flagCol);
  }
  function sheepSprite(ctx, x, y, s, t, i) {
    const nod = Math.max(0, Math.sin(t * 1.6 + i * 2)) * s * 0.25;
    ctx.fillStyle = '#2a2a30';
    for (const lx of [-0.35, -0.15, 0.15, 0.35]) ctx.fillRect(x + lx * s, y - s * 0.35, s * 0.08, s * 0.35);
    ctx.fillStyle = '#f4f1ea'; ctx.beginPath(); ctx.ellipse(x, y - s * 0.55, s * 0.55, s * 0.36, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(x - s * 0.25, y - s * 0.75, s * 0.2, 0, TAU); ctx.arc(x + s * 0.2, y - s * 0.8, s * 0.22, 0, TAU); ctx.fill();
    ctx.fillStyle = '#2a2a30'; ctx.beginPath(); ctx.ellipse(x + s * 0.6, y - s * 0.55 + nod, s * 0.2, s * 0.15, 0.3, 0, TAU); ctx.fill();
  }
  function dragon(ctx, x, y, s, t) {
    const flap = Math.sin(t * 5) * s * 0.9;
    ctx.fillStyle = '#5a1f2a';
    // Flügel
    ctx.beginPath(); ctx.moveTo(x - s * 0.2, y); ctx.lineTo(x - s * 1.4, y - flap); ctx.lineTo(x - s * 1.7, y - flap * 0.4 + s * 0.2); ctx.lineTo(x - s * 0.8, y + s * 0.15); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + s * 0.2, y); ctx.lineTo(x + s * 1.2, y - flap); ctx.lineTo(x + s * 1.5, y - flap * 0.4 + s * 0.2); ctx.lineTo(x + s * 0.6, y + s * 0.15); ctx.closePath(); ctx.fill();
    // Körper, Hals, Kopf, Schwanz
    ctx.fillStyle = '#6e2634';
    ctx.beginPath(); ctx.ellipse(x, y + s * 0.1, s * 0.9, s * 0.3, 0, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x - s * 0.8, y); ctx.quadraticCurveTo(x - s * 1.4, y - s * 0.5, x - s * 1.7, y - s * 0.55); ctx.lineTo(x - s * 1.6, y - s * 0.25); ctx.quadraticCurveTo(x - s * 1.2, y - s * 0.1, x - s * 0.7, y + s * 0.25); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(x + s * 0.8, y); ctx.quadraticCurveTo(x + s * 1.6, y + s * 0.2 + Math.sin(t * 3) * s * 0.2, x + s * 2.2, y - s * 0.1); ctx.lineTo(x + s * 2.1, y + s * 0.15); ctx.quadraticCurveTo(x + s * 1.5, y + s * 0.45, x + s * 0.7, y + s * 0.3); ctx.closePath(); ctx.fill();
    // Feuer
    const f = (t * 1.5) % 1;
    if (f < 0.4) { ctx.fillStyle = `rgba(255,150,40,${0.9 - f * 2})`; ctx.beginPath(); ctx.ellipse(x - s * (1.9 + f * 1.2), y - s * 0.4, s * (0.2 + f * 0.6), s * (0.12 + f * 0.25), 0, 0, TAU); ctx.fill(); }
  }
  function cottage(ctx, x, y, s, t) {
    ctx.fillStyle = '#e8dcc0'; ctx.fillRect(x - s * 0.6, y - s * 0.75, s * 1.2, s * 0.75);
    ctx.fillStyle = '#6b4a2a'; for (let i = 0; i < 4; i++) ctx.fillRect(x - s * 0.6 + i * s * 0.4 - s * 0.02, y - s * 0.75, s * 0.04, s * 0.75);
    ctx.fillStyle = '#8a4a3a'; ctx.beginPath(); ctx.moveTo(x - s * 0.75, y - s * 0.72); ctx.lineTo(x + s * 0.75, y - s * 0.72); ctx.lineTo(x + s * 0.2, y - s * 1.3); ctx.lineTo(x - s * 0.2, y - s * 1.3); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#5a3a2a'; ctx.fillRect(x - s * 0.12, y - s * 0.42, s * 0.24, s * 0.42);
    ctx.fillStyle = '#7a6a60'; ctx.fillRect(x + s * 0.3, y - s * 1.35, s * 0.14, s * 0.5);
    windows.push({ x: x - s * 0.5, y: y - s * 0.55, w: s * 0.2, h: s * 0.2 }, { x: x + s * 0.3, y: y - s * 0.55, w: s * 0.2, h: s * 0.2 });
    // Rauch
    for (let i = 0; i < 5; i++) {
      const u = ((t * 0.25 + i * 0.2) % 1);
      ctx.fillStyle = `rgba(230,230,235,${0.55 * (1 - u)})`;
      ctx.beginPath(); ctx.arc(x + s * 0.37 + Math.sin(u * 6 + i) * s * 0.15 + u * s * 0.5, y - s * 1.4 - u * s * 1.2, s * (0.08 + u * 0.22), 0, TAU); ctx.fill();
    }
  }
  function fence(ctx, x0, x1, w, h) {
    ctx.strokeStyle = '#8a6a3a'; ctx.lineWidth = Math.max(1.5, h * 0.004); ctx.lineCap = 'round';
    const n = Math.round((x1 - x0) / (h * 0.06));
    const pts = [];
    for (let i = 0; i <= n; i++) { const x = x0 + ((x1 - x0) * i) / n, y = hill(2, x, w, h) + h * 0.01; pts.push([x, y]); ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x, y - h * 0.045); ctx.stroke(); }
    for (const dy of [0.018, 0.036]) { ctx.beginPath(); pts.forEach((p, i) => i ? ctx.lineTo(p[0], p[1] - h * dy) : ctx.moveTo(p[0], p[1] - h * dy)); ctx.stroke(); }
  }

  function draw(ctx, w, h, t) {
    windows = [];
    // Tageszeit: 0 = Sonnenaufgang … 0.5 = Sonnenuntergang … 1 = nächster Morgen
    const day = ((t / DAY + 0.2) % 1 + 1) % 1; // Start am Vormittag
    const sunP = day / 0.55, moonP = (day - 0.55) / 0.45;
    let light = day < 0.05 ? smooth(day / 0.05) : day < 0.5 ? 1 : day < 0.58 ? 1 - smooth((day - 0.5) / 0.08) : day < 0.93 ? 0 : smooth((day - 0.93) / 0.07);
    const dusk = day < 0.12 ? 1 - Math.abs(day - 0.04) / 0.08 : day > 0.46 && day < 0.62 ? 1 - Math.abs(day - 0.54) / 0.08 : 0;
    const night = 1 - light;
    // Himmel
    const g = ctx.createLinearGradient(0, 0, 0, h * 0.75);
    g.addColorStop(0, mix('#5fa8f0', '#0a1430', night));
    g.addColorStop(1, mix(mix('#dff0ff', '#ffb070', Math.max(0, dusk) * 0.8), '#2a3f6b', night));
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    // Sterne
    if (night > 0.02) {
      for (const s of stars) { ctx.globalAlpha = night * (0.5 + 0.5 * Math.abs(Math.sin(t * 1.3 + s.p))); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(s.x * w, s.y * h, s.s * h * 0.0025, 0, TAU); ctx.fill(); }
      ctx.globalAlpha = 1;
    }
    // Sonne / Mond auf einem Bogen
    const arc = p => [w * (0.08 + 0.84 * p), h * 0.62 - Math.sin(p * Math.PI) * h * 0.5];
    if (sunP >= 0 && sunP <= 1) {
      const [sx, sy] = arc(sunP), sr = h * 0.06;
      const sg = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 4);
      sg.addColorStop(0, `rgba(255,${230 - dusk * 90},${170 - dusk * 120},0.55)`); sg.addColorStop(1, 'rgba(255,240,180,0)');
      ctx.fillStyle = sg; ctx.fillRect(sx - sr * 4, sy - sr * 4, sr * 8, sr * 8);
      ctx.save(); ctx.translate(sx, sy); ctx.rotate(t * 0.05); ctx.fillStyle = 'rgba(255,245,200,0.18)';
      for (let i = 0; i < 12; i++) { ctx.rotate(Math.PI / 6); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(sr * 3.2, -sr * 0.35); ctx.lineTo(sr * 3.2, sr * 0.35); ctx.closePath(); ctx.fill(); }
      ctx.restore();
      ctx.fillStyle = mix('#fff3b0', '#ff9a4a', dusk); ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
    }
    if (moonP >= 0 && moonP <= 1) {
      const [mx, my] = arc(moonP), mr = h * 0.045;
      ctx.fillStyle = 'rgba(220,230,255,0.15)'; ctx.beginPath(); ctx.arc(mx, my, mr * 2.2, 0, TAU); ctx.fill();
      ctx.fillStyle = '#f2f4ff'; ctx.beginPath(); ctx.arc(mx, my, mr, 0, TAU); ctx.fill();
      ctx.fillStyle = mix('#5fa8f0', '#0a1430', night); ctx.beginPath(); ctx.arc(mx + mr * 0.45, my - mr * 0.25, mr * 0.85, 0, TAU); ctx.fill();
    }
    // Wolken
    for (const c of clouds) {
      const cx = ((c.x + t * c.v) % 1.25) * w * 1.25 - w * 0.12, cy = c.y * h, s = c.s * h * 0.045;
      ctx.fillStyle = `rgba(${255 - night * 150},${255 - night * 150},${255 - night * 120},${c.a * (1 - night * 0.3)})`;
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 2.2, s * 0.8, 0, 0, TAU); ctx.ellipse(cx - s * 1.2, cy + s * 0.2, s * 1.2, s * 0.7, 0, 0, TAU); ctx.ellipse(cx + s * 1.1, cy + s * 0.1, s * 1.5, s * 0.85, 0, 0, TAU); ctx.ellipse(cx, cy - s * 0.5, s * 1.3, s * 0.9, 0, 0, TAU); ctx.fill();
    }
    // Vögel (tagsüber)
    if (light > 0.3) {
      ctx.strokeStyle = `rgba(43,58,74,${light})`; ctx.lineWidth = Math.max(1, h * 0.002);
      for (const b of birds) {
        const bx = ((b.x + t * b.v) % 1.1) * w * 1.1 - w * 0.05, by = b.y * h + Math.sin(t + b.p) * h * 0.01, s = h * 0.012;
        const fl = Math.sin(t * b.f + b.p) * s * 0.6;
        ctx.beginPath(); ctx.moveTo(bx - s, by + fl); ctx.quadraticCurveTo(bx - s * 0.4, by - fl * 0.3, bx, by); ctx.quadraticCurveTo(bx + s * 0.4, by - fl * 0.3, bx + s, by + fl); ctx.stroke();
      }
    }
    // Drache: alle 28 s ein Flug von rechts nach links
    const dc = (t % 28) / 28;
    if (dc < 0.45) { const u = dc / 0.45; dragon(ctx, w * (1.1 - u * 1.25), h * (0.2 + Math.sin(u * 7) * 0.03 + u * 0.06), h * 0.035, t); }
    // Ferne Berge
    ctx.fillStyle = mix('#9dbbe0', '#1c2a4a', night);
    ctx.beginPath(); ctx.moveTo(0, h * 0.66);
    const fm = [[0.05, 0.5], [0.15, 0.42], [0.25, 0.52], [0.36, 0.44], [0.5, 0.5], [0.62, 0.4], [0.72, 0.5], [0.85, 0.43], [0.95, 0.52], [1, 0.5]];
    for (const [x, y] of fm) ctx.lineTo(x * w, y * h);
    ctx.lineTo(w, h * 0.66); ctx.closePath(); ctx.fill();
    // Burgberg
    const px = w * 0.5, peakY = h * 0.27, baseY = h * 0.72, half = w * 0.42;
    const mount = [[px - half, baseY], [px - half * 0.75, h * 0.6], [px - half * 0.55, h * 0.5], [px - half * 0.4, h * 0.41], [px - half * 0.22, peakY + h * 0.05], [px - half * 0.14, peakY],
      [px + half * 0.14, peakY], [px + half * 0.25, peakY + h * 0.06], [px + half * 0.45, h * 0.44], [px + half * 0.6, h * 0.53], [px + half * 0.8, h * 0.62], [px + half, baseY]];
    const mg = ctx.createLinearGradient(0, peakY, 0, baseY);
    mg.addColorStop(0, '#8a9a86'); mg.addColorStop(0.45, '#5f8a4c'); mg.addColorStop(1, '#4b8a3c');
    ctx.fillStyle = mg; ctx.beginPath(); mount.forEach((p, i) => i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1])); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.beginPath(); ctx.moveTo(px + half * 0.14, peakY);
    for (const p of mount.slice(7)) ctx.lineTo(p[0], p[1]); ctx.lineTo(px + half * 0.3, baseY); ctx.closePath(); ctx.fill();
    // Weg zur Burg
    ctx.strokeStyle = '#d9c9a0'; ctx.lineCap = 'round'; ctx.lineWidth = h * 0.012;
    ctx.beginPath(); ctx.moveTo(w * 0.62, h * 0.74); ctx.quadraticCurveTo(w * 0.3, h * 0.62, w * 0.55, h * 0.52); ctx.quadraticCurveTo(w * 0.72, h * 0.45, w * 0.52, h * 0.36); ctx.quadraticCurveTo(w * 0.47, h * 0.33, px, peakY + h * 0.02); ctx.stroke();
    // Tannen am Hang
    for (const f of slopeFirs) {
      const u = 0.12 + f.u * 0.85, y = peakY + (baseY - peakY) * u;
      const edge = f.side < 0 ? px - half * (0.14 + 0.86 * u) : px + half * (0.14 + 0.86 * u);
      const x = f.side < 0 ? edge + (px - edge) * (0.05 + f.j * 0.5) : edge - (edge - px) * (0.05 + f.j * 0.5);
      fir(ctx, x, y, h * (0.03 + u * 0.06) * (0.8 + f.k * 0.4), f.k > 0.5);
    }
    // Burg auf dem Gipfel
    const cw = w * 0.16, ctop = peakY - h * 0.02;
    ctx.fillStyle = '#b8b2a8'; ctx.fillRect(px - cw / 2, ctop, cw, h * 0.07);
    ctx.fillStyle = '#8f8980'; ctx.fillRect(px - cw / 2, ctop + h * 0.03, cw, h * 0.04);
    ctx.fillStyle = '#b8b2a8';
    for (let i = 0; i < 9; i++) ctx.fillRect(px - cw / 2 + (i * cw) / 9, ctop - h * 0.012, cw / 18, h * 0.012);
    ctx.fillStyle = '#3a2a1a'; ctx.beginPath(); ctx.arc(px, ctop + h * 0.07, cw * 0.09, Math.PI, TAU); ctx.lineTo(px + cw * 0.09, ctop + h * 0.07); ctx.closePath(); ctx.fill();
    tower(ctx, px - cw * 0.42, ctop - h * 0.05, cw * 0.16, h * 0.12, t, '#3d7ad6');
    tower(ctx, px + cw * 0.42, ctop - h * 0.05, cw * 0.16, h * 0.12, t, '#3d7ad6');
    tower(ctx, px, ctop - h * 0.11, cw * 0.24, h * 0.18, t, '#ff4f6d');
    // Wiesen (3 Ebenen)
    const layers = ['#67b84f', '#55a542', '#3f8f33'];
    for (let L = 0; L < 3; L++) {
      ctx.fillStyle = layers[L]; ctx.beginPath(); ctx.moveTo(0, h);
      for (let x = 0; x <= w; x += 8) ctx.lineTo(x, hill(L, x, w, h));
      ctx.lineTo(w, h); ctx.closePath(); ctx.fill();
      if (L === 0) { // Windmühle auf dem hinteren Hügel
        const mx = w * 0.17, my = hill(0, mx, w, h), ms = h * 0.07;
        ctx.fillStyle = '#c9b48a'; ctx.beginPath(); ctx.moveTo(mx - ms * 0.35, my); ctx.lineTo(mx + ms * 0.35, my); ctx.lineTo(mx + ms * 0.22, my - ms); ctx.lineTo(mx - ms * 0.22, my - ms); ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#8a5a3a'; ctx.beginPath(); ctx.moveTo(mx - ms * 0.3, my - ms); ctx.lineTo(mx + ms * 0.3, my - ms); ctx.lineTo(mx, my - ms * 1.3); ctx.closePath(); ctx.fill();
        ctx.save(); ctx.translate(mx, my - ms * 0.95); ctx.rotate(t * 0.9); ctx.strokeStyle = '#5a3a1e'; ctx.lineWidth = Math.max(1, ms * 0.05);
        for (let i = 0; i < 4; i++) { ctx.rotate(Math.PI / 2); ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(ms * 0.9, 0); ctx.stroke(); ctx.fillStyle = 'rgba(240,230,200,0.9)'; ctx.fillRect(ms * 0.2, -ms * 0.16, ms * 0.7, ms * 0.16); }
        ctx.restore();
      }
      if (L === 1) cottage(ctx, w * 0.86, hill(1, w * 0.86, w, h) + 1, h * 0.075, t);
      for (const f of meadowFirs) if (f.layer === L) fir(ctx, f.x * w, hill(L, f.x * w, w, h) + 1, h * 0.05 * f.s, f.s > 1);
    }
    // Schafe auf der mittleren Wiese
    for (let i = 0; i < sheep.length; i++) {
      const s = sheep[i], x = (s.x + Math.sin(t * s.v * 10 + s.p) * 0.03) * w;
      sheepSprite(ctx, x, hill(1, x, w, h) + h * 0.004, h * 0.028 * s.s, t, i);
    }
    // Zaun und Blumen auf der vordersten Wiese
    fence(ctx, w * 0.02, w * 0.34, w, h);
    for (const f of flowers) { const fx = f.x * w, fy = hill(2, fx, w, h) + f.d * (h - hill(2, fx, w, h)) * 0.9; ctx.fillStyle = f.c; ctx.beginPath(); ctx.arc(fx, fy, h * 0.004, 0, TAU); ctx.fill(); }
    // Loch mit Fahne und rollender Ball (Schleife alle 6 s)
    const hx = w * 0.7, hy = hill(2, hx, w, h);
    ctx.fillStyle = '#1a1410'; ctx.beginPath(); ctx.ellipse(hx, hy, h * 0.014, h * 0.005, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#f4efe6'; ctx.lineWidth = Math.max(1.5, h * 0.003); ctx.beginPath(); ctx.moveTo(hx, hy); ctx.lineTo(hx, hy - h * 0.09); ctx.stroke();
    ctx.fillStyle = '#ff4f6d'; ctx.beginPath(); ctx.moveTo(hx, hy - h * 0.09); ctx.lineTo(hx + h * 0.045, hy - h * 0.075 + Math.sin(t * 5) * h * 0.005); ctx.lineTo(hx, hy - h * 0.06); ctx.closePath(); ctx.fill();
    const cyc = (t % 6) / 6;
    if (cyc < 0.62) {
      const u = cyc / 0.62, e = 1 - Math.pow(1 - u, 2);
      const bx = -w * 0.03 + (hx + w * 0.03) * e, bounce = Math.abs(Math.sin(u * Math.PI * 3)) * (1 - u) * h * 0.05;
      const by = hill(2, bx, w, h) - h * 0.012 - bounce;
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(bx, hill(2, bx, w, h), h * 0.012, h * 0.004, 0, 0, TAU); ctx.fill();
      const bg = ctx.createRadialGradient(bx - h * 0.004, by - h * 0.004, h * 0.002, bx, by, h * 0.012);
      bg.addColorStop(0, '#ffffff'); bg.addColorStop(1, '#c8c8d0');
      ctx.fillStyle = bg; ctx.beginPath(); ctx.arc(bx, by, h * 0.012, 0, TAU); ctx.fill();
    } else if (cyc < 0.7) {
      const u = (cyc - 0.62) / 0.08, r = h * 0.012 * (1 - u);
      ctx.fillStyle = '#e8e8f0'; ctx.beginPath(); ctx.arc(hx, hy - r + u * h * 0.01, r, 0, TAU); ctx.fill();
      if (lastBallPhase !== Math.floor(t / 6)) { lastBallPhase = Math.floor(t / 6); for (let i = 0; i < 18; i++) sparks.push({ x: hx, y: hy, vx: (rnd() - 0.5) * h * 0.25, vy: -h * (0.1 + rnd() * 0.25), life: 1, c: ['#ffd166', '#ff6b9d', '#7fe8ff', '#ffffff'][i % 4] }); }
    }
    // Nacht: Abdunkeln, dann Lichter darüber
    if (night > 0.01) { ctx.fillStyle = `rgba(10,16,48,${night * 0.55})`; ctx.fillRect(0, 0, w, h); }
    for (const win of windows) {
      const glow = 0.5 + 0.5 * night + 0.15 * Math.sin(t * 2.3 + win.x);
      if (night > 0.05) { ctx.fillStyle = `rgba(255,200,90,${night * 0.25})`; ctx.beginPath(); ctx.arc(win.x + win.w / 2, win.y + win.h / 2, win.w * 1.8, 0, TAU); ctx.fill(); }
      ctx.fillStyle = `rgba(255,214,102,${Math.min(1, glow)})`; ctx.fillRect(win.x, win.y, win.w, win.h);
    }
    if (night > 0.05) { // Glühwürmchen über der Wiese
      for (const f of flies) {
        const fx = (f.x + Math.sin(t * 0.3 * f.v + f.p) * 0.04) * w, fy = hill(1, fx, w, h) + Math.sin(t * 0.5 * f.v + f.p * 2) * h * 0.04 - h * 0.02;
        ctx.globalAlpha = night * (0.3 + 0.7 * Math.abs(Math.sin(t * 2 * f.v + f.p)));
        ctx.fillStyle = '#d8ff70'; ctx.beginPath(); ctx.arc(fx, fy, h * 0.003, 0, TAU); ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    const dt = 1 / 60;
    for (const s of sparks) { s.x += s.vx * dt; s.y += s.vy * dt; s.vy += h * 0.4 * dt; s.life -= dt * 0.9; ctx.globalAlpha = Math.max(0, s.life); ctx.fillStyle = s.c; ctx.beginPath(); ctx.arc(s.x, s.y, h * 0.004, 0, TAU); ctx.fill(); }
    ctx.globalAlpha = 1; sparks = sparks.filter(s => s.life > 0);
  }
  return { draw };
})();
