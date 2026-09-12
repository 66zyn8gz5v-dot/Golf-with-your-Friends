/* Zeichnung des Schneebergs: Windfahne, Lawine, Seilbahn, Schneebrücke.

   Leitgedanke ist überall derselbe wie beim Uhrenturm: Was wirkt, muss man sehen, und zwar
   *bevor* es wirkt. Der Wind ist unsichtbar – also zeigt ihn die Fahne, der Windsack und vor allem
   der treibende Schnee auf dem Boden. Die Lawine kommt nicht aus dem Nichts – also grollt und
   staubt es vorher an der Abrisskante. Die Schneebrücke sieht man knirschen, bevor sie bricht. */
Object.assign(Renderer.prototype, {

  /* ---------- Windfahne ---------- */
  /* Auf dem Boden: Schneefahnen, die über die ganze Bahn in Windrichtung treiben. Sie sind das
     eigentliche Messgerät – man liest die Richtung ab, ohne zur Fahne zu schauen, und in der
     Flaute stehen sie still. Dazu eine Windrose unter dem Mast mit der *nächsten* Richtung als
     blassem Pfeil: Wer wartet, weiß, worauf. */
  drawWindfahneFloor(ctx, ob, t) {
    const s = this.scale, lv = this.level;
    const st = ob.staerke, dx = ob.dx, dy = ob.dy;
    /* Der treibende Schnee auf dem Boden ist das eigentliche Messgerät: Man liest die Richtung ab,
       ohne zur Fahne zu schauen, und in der Flaute steht alles still. Wichtig ist der Kontrast –
       weiße Striche auf weißem Schnee sieht man nicht. Darum ist jede Fahne eine flache Rille:
       erst ein blaugrauer Schatten, darüber versetzt ein heller Kamm. So liest sie sich als
       Schneewehe und nicht als Kratzer. */
    if (st > 0.02) {
      ctx.save();
      ctx.lineCap = 'round';
      /* Über jede zweite Bahnkachel treibt eine Schneefahne. Verteilt wird über die Kacheln selbst
         und nicht über die Fläche ringsum – sonst landet der meiste Schnee neben der Bahn und man
         sieht kaum etwas. Jede Fahne wandert in Windrichtung durch ihre Kachel und springt am Ende
         zurück; weil jede ihren eigenen Startpunkt hat, sieht man kein Muster, sondern Treiben. */
      for (let y = 0; y < lv.H; y++) for (let x = 0; x < lv.W; x++) {
        if (!lv.isFloorChar(lv.charAt(x + 0.5, y + 0.5))) continue;
        const h1 = Math.abs(Math.sin(x * 127.1 + y * 311.7) * 43758.5453) % 1;
        if (h1 > 0.55) continue;                       // nur auf gut der Hälfte der Kacheln
        const h2 = Math.abs(Math.sin(x * 71.3 + y * 19.7 + 4.4) * 43758.5453) % 1;
        const lauf = ((h2 + t * (0.22 + h1 * 0.5) * (0.3 + st)) % 1) - 0.5;
        const mx = x + 0.5 + dx * lauf * 2.4 - dy * (h2 - 0.5) * 0.7;
        const my = y + 0.5 + dy * lauf * 2.4 + dx * (h2 - 0.5) * 0.7;
        if (!lv.isFloorChar(lv.charAt(mx, my))) continue;
        const lang = 0.8 + h1 * 2.2;
        const a = this.proj(mx, my, 0.012), b = this.proj(mx + dx * lang, my + dy * lang, 0.012);
        ctx.lineWidth = Math.max(1.5, s * 0.09);
        ctx.strokeStyle = `rgba(104,142,182,${(0.20 + h1 * 0.5) * st})`;
        ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        const a2 = this.proj(mx - dy * 0.13, my + dx * 0.13, 0.013);
        const b2 = this.proj(mx + dx * lang * 0.8 - dy * 0.13, my + dy * lang * 0.8 + dx * 0.13, 0.013);
        ctx.lineWidth = Math.max(1, s * 0.055);
        ctx.strokeStyle = `rgba(255,255,255,${(0.45 + h1 * 0.5) * st})`;
        ctx.beginPath(); ctx.moveTo(a2[0], a2[1]); ctx.lineTo(b2[0], b2[1]); ctx.stroke();
      }
      ctx.restore();
    }
    // Windrose unter dem Mast
    this.isoEllipse(ctx, ob.x, ob.y, 0.006, 1.5, 'rgba(255,255,255,0.16)');
    const pfeil = (rx, ry, laenge, breite, farbe) => {
      const p = [this.proj(ob.x + rx * laenge, ob.y + ry * laenge, 0.014),
                 this.proj(ob.x - ry * breite, ob.y + rx * breite, 0.014),
                 this.proj(ob.x + ry * breite, ob.y - rx * breite, 0.014)];
      ctx.fillStyle = farbe; ctx.beginPath();
      p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
      ctx.closePath(); ctx.fill();
    };
    const na = (WIND_RICHTUNGEN[ob.next] * Math.PI) / 180;
    pfeil(Math.cos(na), Math.sin(na), 1.35, 0.34, 'rgba(120,200,255,0.35)');      // die nächste Richtung
    pfeil(dx, dy, 1.35, 0.34, `rgba(255,255,255,${0.35 + 0.45 * ob.staerke})`);   // die jetzige
  },

  /* Der Mast: ein Rohr, oben die Fahne als Pfeil und ein Windsack, der sich im Wind strafft.
     Beide zeigen dasselbe – die Fahne die Richtung, der Sack die Stärke. */
  drawWindfahne(ctx, ob, t) {
    const s = this.scale, z = (ob.ebene || 0) * (this.level.ebeneZ || 2);
    const hoch = ob.hoehe;
    this.isoEllipse(ctx, ob.x, ob.y, z + 0.004, 0.42, 'rgba(0,0,0,0.22)');
    this.prism(ctx, this.circlePoly(ob.x, ob.y, 0.3, 8), z, 0.16, '#c9d8e8', '#6d8199', { outline: '#41505f' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, 0.1, 8), z + 0.16, hoch, '#d9e6f3', '#7b8fa5', { outline: '#41505f' });
    const oben = z + 0.16 + hoch;
    // Fahne: ein flacher Pfeil, der in Windrichtung steht
    const sp = this.proj(ob.x + ob.dx * 1.05, ob.y + ob.dy * 1.05, oben);
    const l1 = this.proj(ob.x - ob.dy * 0.3 - ob.dx * 0.2, ob.y + ob.dx * 0.3 - ob.dy * 0.2, oben);
    const l2 = this.proj(ob.x + ob.dy * 0.3 - ob.dx * 0.2, ob.y - ob.dx * 0.3 - ob.dy * 0.2, oben);
    ctx.fillStyle = '#ff6b5a'; ctx.beginPath();
    ctx.moveTo(sp[0], sp[1]); ctx.lineTo(l1[0], l1[1]); ctx.lineTo(l2[0], l2[1]); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#8c2f24'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    // Gegengewicht hinten, damit man die Achse sieht
    const hk = this.proj(ob.x - ob.dx * 0.75, ob.y - ob.dy * 0.75, oben);
    ctx.fillStyle = '#eef5fc'; ctx.beginPath(); ctx.arc(hk[0], hk[1], s * 0.09, 0, TAU); ctx.fill();
    // Windsack knapp darunter: drei Ringe, die sich mit der Stärke strecken
    const sz = oben - 0.55, laenge = 0.35 + ob.staerke * 0.85;
    for (let i = 0; i < 4; i++) {
      const u = i / 3;
      const p = this.proj(ob.x + ob.dx * laenge * u, ob.y + ob.dy * laenge * u, sz - (1 - ob.staerke) * u * 0.45);
      ctx.fillStyle = i % 2 ? 'rgba(255,255,255,0.92)' : 'rgba(255,107,90,0.92)';
      ctx.beginPath(); ctx.ellipse(p[0], p[1], s * (0.17 - u * 0.07), s * (0.17 - u * 0.07), 0, 0, TAU); ctx.fill();
    }
  },

  /* ---------- Lawine ---------- */
  /* Der Streifen bleibt blass sichtbar – das ist die Rinne, in der es herunterkommt. An der
     Abrisskante staubt es, solange die Warnung läuft; dann fährt die Front durch. Wo ein Block
     Deckung gibt, liegt ein heller Keil im Schnee: Dorthin muss man. */
  drawLawineFloor(ctx, ob, t) {
    const s = this.scale, lv = this.level;
    const eck = [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h]];
    this.fillPoly(ctx, eck, 0.006, 'rgba(190,225,255,0.10)', false);
    // Windschatten hinter den Blöcken im Streifen: der sichere Fleck
    for (let y = Math.floor(ob.y); y < ob.y + ob.h; y++) for (let x = Math.floor(ob.x); x < ob.x + ob.w; x++) {
      if (lv.charAt(x + 0.5, y + 0.5) !== 'x') continue;
      const keil = [[x + 0.5 - ob.dy * 0.5, y + 0.5 + ob.dx * 0.5],
                    [x + 0.5 + ob.dy * 0.5, y + 0.5 - ob.dx * 0.5],
                    [x + 0.5 + ob.dx * 3 + ob.dy * 0.9, y + 0.5 + ob.dy * 3 - ob.dx * 0.9],
                    [x + 0.5 + ob.dx * 3 - ob.dy * 0.9, y + 0.5 + ob.dy * 3 + ob.dx * 0.9]];
      this.fillPoly(ctx, keil, 0.008, 'rgba(255,255,255,0.18)', false);
    }
    // Abrisskante: die Seite, von der sie kommt
    const kx = ob.cx - ob.dx * (ob.laenge / 2 + 0.2), ky = ob.cy - ob.dy * (ob.laenge / 2 + 0.2);
    if (ob.warnt > 0) {
      const a = ob.warnt;
      for (let i = 0; i < 14; i++) {
        const h = Math.abs(Math.sin(i * 91.3 + 1.7) * 43758.5453) % 1;
        const quer = (h - 0.5) * (Math.abs(ob.dy) * ob.w + Math.abs(ob.dx) * ob.h) * 0.9;
        const px = kx - ob.dy * quer + ob.dx * a * 0.8, py = ky + ob.dx * quer + ob.dy * a * 0.8;
        const p = this.proj(px, py, 0.02 + h * 0.3);
        ctx.fillStyle = `rgba(255,255,255,${0.15 + 0.4 * a * (1 - h)})`;
        ctx.beginPath(); ctx.arc(p[0], p[1], s * (0.12 + h * 0.3) * (0.4 + a), 0, TAU); ctx.fill();
      }
    }
  },

  /* Die Front selbst: eine Wand aus Schneestaub, vorn hell und aufgeworfen, hinten auslaufend. */
  drawLawine(ctx, ob, t) {
    if (!ob.laeuft) return;
    const s = this.scale;
    const quer = (Math.abs(ob.dy) * ob.w + Math.abs(ob.dx) * ob.h) / 2;
    for (let i = 0; i < 34; i++) {
      const h = Math.abs(Math.sin(i * 127.1 + 4.2) * 43758.5453) % 1;
      const h2 = Math.abs(Math.sin(i * 311.7 + 9.1) * 43758.5453) % 1;
      const q = (h - 0.5) * 2 * quer;
      const tief = -h2 * 1.6;                       // hinter dem Kamm läuft sie aus
      const px = ob.fx + ob.dx * tief - ob.dy * q, py = ob.fy + ob.dy * tief + ob.dx * q;
      const z = 0.05 + h2 * 0.55 + Math.abs(Math.sin(t * 6 + i)) * 0.12;
      const p = this.proj(px, py, z);
      ctx.fillStyle = `rgba(255,255,255,${0.75 - h2 * 0.5})`;
      ctx.beginPath(); ctx.arc(p[0], p[1], s * (0.3 + h * 0.32) * (1 - h2 * 0.4), 0, TAU); ctx.fill();
    }
    // heller Kamm ganz vorn
    ctx.strokeStyle = 'rgba(255,255,255,0.85)'; ctx.lineWidth = Math.max(2, s * 0.1);
    const a = this.proj(ob.fx - ob.dy * quer, ob.fy + ob.dx * quer, 0.3);
    const b = this.proj(ob.fx + ob.dy * quer, ob.fy - ob.dx * quer, 0.3);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
  },

  /* ---------- Seilbahn ---------- */
  /* Zwei Masten, dazwischen das Tragseil, daran die Gondel. Das Seil läuft von der Tal- zur
     Bergstation und steigt dabei um die Ebenen, die die Bahn überwindet – man sieht also schon von
     unten, wohin sie führt. */
  drawSeilbahnFloor(ctx, ob, t) {
    for (const [px, py] of [[ob.x0, ob.y0], [ob.x1, ob.y1]]) {
      this.isoEllipse(ctx, px, py, 0.004, 0.8, 'rgba(190,230,255,0.3)');
      this.isoEllipse(ctx, px, py, 0.005, 0.62, 'rgba(0,0,0,0.16)');
    }
  },
  drawSeilbahn(ctx, ob, t) {
    const s = this.scale, z = this.level.ebeneZ || 2;
    const z0 = ob.ebene * z + 2.4, z1 = ob.ziel * z + 2.4;
    // Masten an beiden Stationen
    for (const [px, py, pz, eb] of [[ob.x0, ob.y0, z0, ob.ebene], [ob.x1, ob.y1, z1, ob.ziel]]) {
      const fuss = eb * z;
      this.prism(ctx, this.circlePoly(px, py, 0.26, 8), fuss, 0.18, '#c9d8e8', '#6d8199', { outline: '#3d4a58' });
      this.prism(ctx, this.circlePoly(px, py, 0.12, 8), fuss + 0.18, pz - fuss, '#dbe7f3', '#7b8fa5', { outline: '#3d4a58' });
      const k = this.proj(px, py, pz);
      ctx.fillStyle = '#8fa3b8'; ctx.fillRect(k[0] - s * 0.28, k[1] - s * 0.06, s * 0.56, s * 0.12);
    }
    // Tragseil
    const a = this.proj(ob.x0, ob.y0, z0), b = this.proj(ob.x1, ob.y1, z1);
    ctx.strokeStyle = 'rgba(60,72,86,0.9)'; ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    // Gondel: Aufhängung, Kabine, Fenster
    const gz = ob.hoehe ? ob.hoehe() - ob.tragHoehe : ob.ebene * z;
    const seil = ob.ebene * z + (ob.ziel - ob.ebene) * z * (ob.progress || 0) + 2.4;
    const auf = this.proj(ob.x, ob.y, seil), kab = this.proj(ob.x, ob.y, gz + 1.0);
    ctx.strokeStyle = '#4a5766'; ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath(); ctx.moveTo(auf[0], auf[1]); ctx.lineTo(kab[0], kab[1]); ctx.stroke();
    ctx.fillStyle = '#e8eef6'; ctx.beginPath(); ctx.arc(auf[0], auf[1], s * 0.1, 0, TAU); ctx.fill();
    const hw = ob.w / 2, hh = ob.h / 2;
    const kasten = [[ob.x - hw, ob.y - hh], [ob.x + hw, ob.y - hh], [ob.x + hw, ob.y + hh], [ob.x - hw, ob.y + hh]];
    this.prism(ctx, kasten, gz, 0.9, '#ff8a5a', '#b8482a', { outline: '#7a2d18' });
    this.fillPoly(ctx, [[ob.x - hw * 0.7, ob.y - hh * 0.7], [ob.x + hw * 0.7, ob.y - hh * 0.7],
                        [ob.x + hw * 0.7, ob.y + hh * 0.7], [ob.x - hw * 0.7, ob.y + hh * 0.7]], gz + 0.9, '#cfe6ff', false);
  },

  /* ---------- Schneebrücke ---------- */
  /* Heil ist sie eine Wächte mit sauberer Kante und ein paar Schneefähnchen. Gebrochen bleibt ein
     Loch mit gezacktem Rand, und der erste Augenblick danach staubt nach - so sieht man, was
     passiert ist, und nicht nur, dass etwas weg ist. */
  drawSchneebrueckeFloor(ctx, ob, t) {
    const s = this.scale, z = (ob.ebene || 0) * (this.level.ebeneZ || 2);
    const eck = [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h]];
    if (!ob.gebrochen) {
      this.fillPoly(ctx, eck, z + 0.012, 'rgba(255,255,255,0.85)', false);
      ctx.strokeStyle = 'rgba(150,190,225,0.9)'; ctx.lineWidth = Math.max(1.5, s * 0.06);
      const p = eck.map(q => this.proj(q[0], q[1], z + 0.013));
      ctx.beginPath(); p.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath(); ctx.stroke();
      // Knirschen, sobald der Ball darauf war: feine Risse
      if (ob.betreten) {
        ctx.strokeStyle = 'rgba(90,130,170,0.75)'; ctx.lineWidth = Math.max(1, s * 0.04);
        for (let i = 0; i < 5; i++) {
          const h = Math.abs(Math.sin(i * 77.3 + 1.1) * 43758.5453) % 1;
          const a = this.proj(ob.x + ob.w * h, ob.y, z + 0.014);
          const b = this.proj(ob.x + ob.w * (1 - h) * 0.9 + ob.w * 0.05, ob.y + ob.h, z + 0.014);
          ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
        }
      }
      return;
    }
    // gebrochen: dunkles Loch mit gezacktem Rand
    this.fillPoly(ctx, eck, z + 0.012, 'rgba(16,26,44,0.82)', false);
    ctx.strokeStyle = 'rgba(235,245,255,0.9)'; ctx.lineWidth = Math.max(1.5, s * 0.07);
    ctx.beginPath();
    for (let i = 0; i <= 16; i++) {
      const u = i / 16, h = Math.abs(Math.sin(i * 51.7 + 3.3) * 43758.5453) % 1;
      const r = 0.5 - h * 0.12;
      const a = u * TAU;
      const q = this.proj(ob.x + ob.w / 2 + Math.cos(a) * ob.w * r, ob.y + ob.h / 2 + Math.sin(a) * ob.h * r, z + 0.014);
      i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
    }
    ctx.closePath(); ctx.stroke();
    const seit = (ob.t || 0) - ob.brichtAt;
    if (seit >= 0 && seit < 0.9) {
      const a = 1 - seit / 0.9;
      for (let i = 0; i < 12; i++) {
        const h = Math.abs(Math.sin(i * 127.1 + 7.7) * 43758.5453) % 1;
        const p = this.proj(ob.x + ob.w * (0.2 + h * 0.6), ob.y + ob.h * (0.2 + ((h * 7) % 1) * 0.6), z + 0.1 + seit * 0.5);
        ctx.fillStyle = `rgba(255,255,255,${0.5 * a})`;
        ctx.beginPath(); ctx.arc(p[0], p[1], s * (0.1 + h * 0.2), 0, TAU); ctx.fill();
      }
    }
  },

  /* Ein verschneiter Felsbrocken statt eines Quaders. Er bleibt eine Kachel breit und eine Kachel
     hoch - was der Ball trifft, ist unverändert -, sieht aber aus wie das, was er im Spiel ist:
     Deckung. Gebaut aus zwei gekippten Prismen mit unterschiedlicher Grundform, damit keine zwei
     Brocken gleich aussehen, und obenauf eine Schneehaube. */
  drawSchneefels(ctx, b) {
    const h = (k) => Math.abs(Math.sin((b.x * 31.7 + b.y * 17.3 + k * 7.1)) * 43758.5453) % 1;
    const cx = b.x + 0.5, cy = b.y + 0.5;
    const kante = (r, dreh, n) => {
      const p = [];
      for (let i = 0; i < n; i++) {
        const a = dreh + (i * TAU) / n;
        const rr = r * (0.82 + h(i) * 0.34);
        p.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
      }
      return p;
    };
    const unten = kante(0.52, h(1) * TAU, 7);
    const oben = kante(0.38, h(2) * TAU, 6);
    this.isoEllipse(ctx, cx, cy, 0.004, 0.6, 'rgba(0,0,0,0.22)');
    this.prism(ctx, unten, 0, 0.62, '#9aa8ba', '#5d6a7c', { outline: '#3c4654' });
    this.prism(ctx, oben, 0.62, 0.3, '#aab8c8', '#66748a', { outline: '#3c4654' });
    // Schneehaube: etwas ueber die Kante hinaus, damit sie aufliegt statt eingelassen zu sein
    this.fillPoly(ctx, kante(0.42, h(3) * TAU, 7), 0.93, '#ffffff', false);
  },
});
