/* Zeichnung der versunkenen Stadt: das Flutbecken und das Pumpwerk.

   ZWEI DINGE MÜSSEN ZU SEHEN SEIN, UND KEINES DAVON IST DAS WASSER.
   Das gestiegene Wasser zeichnet das Spiel von selbst – aus einer Bodenkachel ist eine
   Wasserkachel geworden, und Wasser kann es schon.

   Zu sehen sein muß erstens, **wo das Becken liegt, solange es leer ist**. Ein Becken, das trocken
   aussieht wie der übrige Boden, ist eine Falle ohne Ansage: Man rollt hinein, weil man nicht
   wußte, daß da eines war. Darum liegt auf jeder Beckenkachel ein feuchter Schimmer, und außen
   herum läuft eine Kante – dasselbe, was einen Brunnen im Hof von seinem Pflaster unterscheidet.

   Und zweitens, **welche Felder als nächstes drankommen**. Auf denen liegt ein Schimmer, der in den
   Sekunden davor anschwillt, mit einer hellen Schaumkante zur trockenen Seite hin. Dieselbe Regel
   wie beim Ring der Lavafontäne und bei der Lunte der Sprengladung: Die Ansage steht auf dem Boden,
   nicht am Gerät. Angesagt wird nur steigendes Wasser; zurückgehendes gibt Boden her. */
Object.assign(Renderer.prototype, {

  drawFlutFloor(ctx, ob, t) {
    const lv = this.level;
    if (!lv || !ob.ringe) return;
    const fl = lv.flaechen ? (lv.flaechen[ob.ebene || 0] || lv.flaechen[0]) : null;
    if (!fl) return;
    const R = ob.ringe, H = R.length;
    const ring = (x, y) => ((R[y] || [])[x]) || 0;
    const imBecken = (x, y) => { const r = ring(x, y); return r > 0 && r < 9000; };

    ctx.save();
    /* 1. Das Becken selbst – auch wenn es trocken ist. Feuchter Stein, damit man sieht, wo man
          gleich nicht mehr stehen kann. */
    for (let y = 0; y < H; y++) for (let x = 0; x < R[y].length; x++) {
      if (!imBecken(x, y) || fl.tiles[y][x] === 'w') continue;
      this.fillPoly(ctx, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], 0.010,
                    'rgba(40,80,105,0.20)', false);
    }
    /* 2. Die Beckenkante: eine gemauerte Linie ringsum. Sie sagt, wie weit das Wasser höchstens
          kommt – wer außerhalb liegenbleibt, bleibt trocken, so lange er will. */
    ctx.strokeStyle = 'rgba(232,240,246,0.55)';
    ctx.lineWidth = Math.max(1.5, this.scale * 0.075);
    ctx.lineCap = 'round';
    for (let y = 0; y < H; y++) for (let x = 0; x < R[y].length; x++) {
      if (!imBecken(x, y)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (imBecken(x + dx, y + dy)) continue;           // nur nach außen hin
        const a = dx ? [x + (dx > 0 ? 1 : 0), y] : [x, y + (dy > 0 ? 1 : 0)];
        const b = dx ? [a[0], y + 1] : [x + 1, a[1]];
        const p0 = this.proj(a[0], a[1], 0.014), p1 = this.proj(b[0], b[1], 0.014);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      }
    }

    /* 3. Die Ansage. Nur steigendes Wasser wird angekündigt – fällt es, wird Boden frei, und ein
          Schimmer darauf hieße das Gegenteil von dem, was passiert. */
    if (!ob.steigt) { ctx.restore(); return; }
    const naechst = (ob.stufe || 0) + 1;
    if (naechst > (ob.max || 0)) { ctx.restore(); return; }
    /* Wie weit ist die nächste Stufe? 0 = gerade gestiegen, 1 = gleich soweit. Die Anzeige wächst
       erst spät merklich an: Eine Warnung, die die ganze Zeit gleich aussieht, ist keine. */
    const rest = ob.naechsteIn ? ob.naechsteIn() : Infinity;
    if (!isFinite(rest)) { ctx.restore(); return; }
    const u = Math.max(0, Math.min(1, 1 - rest / (ob.takt || 1.8)));
    const staerke = u * u;
    for (let y = 0; y < H; y++) for (let x = 0; x < R[y].length; x++) {
      if (ring(x, y) !== naechst || fl.tiles[y][x] === 'w') continue;
      this.fillPoly(ctx, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], 0.011,
                    `rgba(70,140,190,${0.12 + 0.5 * staerke})`, false);
    }
    /* Die Schaumkante: dort, wo das Wasser gleich hinkommt, steht eine helle Linie. Sie macht aus
       dem Schimmer eine Kante – man sieht, wo der trockene Rest aufhört. */
    ctx.strokeStyle = `rgba(210,240,255,${0.25 + 0.55 * staerke})`;
    ctx.lineWidth = Math.max(1, this.scale * 0.05);
    for (let y = 0; y < H; y++) for (let x = 0; x < R[y].length; x++) {
      if (ring(x, y) !== naechst || fl.tiles[y][x] === 'w') continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const r = ring(x + dx, y + dy);
        if (!r || r <= naechst || r > 9000) continue;     // nur zur noch trockenen Beckenseite hin
        const a = dx ? [x + (dx > 0 ? 1 : 0), y] : [x, y + (dy > 0 ? 1 : 0)];
        const b = dx ? [a[0], y + 1] : [x + 1, a[1]];
        const p0 = this.proj(a[0], a[1], 0.012), p1 = this.proj(b[0], b[1], 0.012);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      }
    }
    ctx.restore();
  },

  /* Das Pumpwerk: ein eiserner Rost im Boden mit einem Rad darüber. Läuft es, dreht sich das Rad
     und es sprudelt – so sieht man von weitem, ob die Flut gerade gehalten wird. */
  drawPumpwerkFloor(ctx, ob, t) {
    const s = this.scale, r = ob.r || 0.6;
    const [sx, sy] = this.proj(ob.x, ob.y, 0.012);
    ctx.save();
    // Der Rost
    ctx.fillStyle = ob.an ? '#4d7fa6' : '#3f4a52';
    ctx.beginPath(); ctx.ellipse(sx, sy, s * r, s * r * this.cam.tilt, 0, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#242c33'; ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.stroke();
    ctx.strokeStyle = 'rgba(20,26,32,0.8)'; ctx.lineWidth = Math.max(1, s * 0.05);
    for (let i = -2; i <= 2; i++) {
      const u = (i / 3) * r;
      const a = this.proj(ob.x + u, ob.y - r * 0.8, 0.013), b = this.proj(ob.x + u, ob.y + r * 0.8, 0.013);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    if (ob.an) {   // Sprudel, solange es drückt
      for (let i = 0; i < 6; i++) {
        const u = ((t * 1.3 + i / 6) % 1);
        const w = i * 1.1 + t * 0.7;
        const [px, py] = this.proj(ob.x + Math.cos(w) * r * 0.7 * u, ob.y + Math.sin(w) * r * 0.7 * u, 0.05 + u * 0.5);
        ctx.globalAlpha = 0.7 * (1 - u);
        ctx.fillStyle = '#cfeaff';
        ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * 0.07 * (1 - u * 0.4)), 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  },
});
