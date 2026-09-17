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

  /* Eine Farbe aus der Palette mit Durchsichtigkeit. Steht hier, weil in dieser Welt fast jede
     Auflage sich nach der Palette richten muß – oben hell, unten dunkel. */
  rgbaVon(hex, a) {
    const n = parseInt(String(hex).replace('#', ''), 16);
    return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
  },

  /* ================= Die Wassersäule =================
     Diese Welt hat keinen Himmel. Was über der Bahn steht, ist Wasser, und wie es aussieht, hängt
     an einer einzigen Zahl: 'tiefe' aus der Palette, 0 dicht unter der Oberfläche, 1 auf dem Grund.
     Alles hier rechnet daraus – so wird aus vier Paletten ein Abstieg und nicht bloß vier Blautöne.

     Die Reihenfolge ist die eines Blicks nach oben: erst die Oberfläche (wenn man sie noch sieht),
     dann die Lichtbahnen, die von ihr herunterkommen, dann die Stadt als Schemen in der Ferne, und
     ganz vorn der Schwebstoff, der einem vor der Nase treibt. */
  drawMeer(ctx, t) {
    const th = this.theme, w = this.w, h = this.h;
    const tief = Math.max(0, Math.min(1, th.tiefe == null ? 0.5 : th.tiefe));
    const licht = Math.pow(1 - tief, 1.4);       // wieviel Sonne überhaupt noch herunterkommt
    ctx.save();

    /* Die Oberfläche, von unten gesehen. Sie rutscht mit der Tiefe aus dem Bild heraus: Auf dem
       Grund ist sie nicht mehr zu sehen, und genau das soll man merken. */
    if (tief < 0.55) {
      const y0 = h * (0.03 + tief * 0.55);
      const g = ctx.createLinearGradient(0, 0, 0, y0 + h * 0.16);
      g.addColorStop(0, `rgba(226,250,255,${0.55 * licht})`);
      g.addColorStop(1, 'rgba(226,250,255,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, w, y0 + h * 0.16);
      /* Das Kräuseln: die Unterseite der Wellen als helle Linie, die wandert. */
      ctx.strokeStyle = `rgba(255,255,255,${0.5 * licht})`;
      ctx.lineWidth = Math.max(1.5, h * 0.004);
      for (let k = 0; k < 3; k++) {
        ctx.beginPath();
        for (let x = 0; x <= w; x += 12) {
          const y = y0 + k * h * 0.018
            + Math.sin(x * 0.011 + t * 0.9 + k * 1.7) * h * 0.012
            + Math.sin(x * 0.027 - t * 1.4 + k) * h * 0.006;
          if (x === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.globalAlpha = 1 - k * 0.3; ctx.stroke();
      }
      ctx.globalAlpha = 1;
    }

    /* Lichtbahnen von oben. Sie stehen leicht schräg, wandern langsam und werden mit der Tiefe
       schmaler und blasser – unten kommt gar nichts mehr an. */
    if (licht > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 9; i++) {
        const x = w * (0.04 + i * 0.115) + Math.sin(t * 0.17 + i * 2.1) * w * 0.035;
        const br = w * (0.018 + 0.03 * ((i * 7) % 5) / 4) * (0.6 + 0.4 * licht);
        const lang = h * (0.5 + 0.45 * licht);
        const g = ctx.createLinearGradient(0, 0, 0, lang);
        const a = 0.10 * licht * (0.6 + 0.4 * Math.sin(t * 0.6 + i));
        g.addColorStop(0, `rgba(190,240,255,${a})`);
        g.addColorStop(1, 'rgba(190,240,255,0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.moveTo(x - br * 0.35, 0); ctx.lineTo(x + br * 0.35, 0);
        ctx.lineTo(x + br * 1.6 + lang * 0.16, lang); ctx.lineTo(x - br * 1.6 + lang * 0.16, lang);
        ctx.closePath(); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }

    /* Die versunkene Stadt als Schemen in der Ferne. Erst ab der Dämmerzone – oben ist das Wasser
       zu hell dafür, und ein Schemen, den man deutlich sieht, ist keiner. */
    if (tief > 0.4) {
      const hz = h * 0.56;
      ctx.fillStyle = `rgba(6,26,38,${0.20 + 0.3 * tief})`;
      for (let i = 0; i < 9; i++) {
        const x = w * (0.03 + i * 0.118) + Math.sin(i * 3.1) * w * 0.02;
        const bw = w * (0.035 + ((i * 5) % 4) * 0.012);
        const bh = h * (0.06 + ((i * 3) % 5) * 0.035);
        ctx.fillRect(x, hz - bh, bw, bh);
        if (i % 3 === 0) {                         // ein Turm mit Spitze: der Kirchturm der Stadt
          ctx.beginPath();
          ctx.moveTo(x, hz - bh); ctx.lineTo(x + bw / 2, hz - bh - h * 0.05); ctx.lineTo(x + bw, hz - bh);
          ctx.closePath(); ctx.fill();
        }
      }
    }

    /* Schwebstoff: was im Wasser hängt und mit ihm treibt. Je tiefer, desto mehr – oben ist es
       klar, unten steht alles voll aufgewirbeltem Grund. Er treibt langsam nach oben, damit man
       sieht, daß man unter Wasser ist und nicht in einem blauen Zimmer. */
    const koerner = Math.round(40 + 70 * tief);
    for (let i = 0; i < koerner; i++) {
      const sx = ((i * 0.6180339887) % 1) * w;
      const sy = (((i * 0.7548776662) % 1) * h - t * (4 + (i % 5)) % h + h) % h;
      const r = (0.6 + (i % 3) * 0.5) * (this.h / 800);
      ctx.fillStyle = `rgba(210,240,255,${0.05 + 0.12 * tief})`;
      ctx.beginPath(); ctx.arc(sx, sy + Math.sin(t * 0.7 + i) * 3, Math.max(0.6, r), 0, TAU); ctx.fill();
    }

    /* Und ganz unten das, was selber leuchtet – das einzige Licht auf dem Grund. */
    if (tief > 0.8) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) {
        const sx = ((i * 0.3819660113) % 1) * w;
        const sy = h * (0.25 + ((i * 0.6180339887) % 1) * 0.6) + Math.sin(t * 0.5 + i * 2) * h * 0.02;
        const puls = 0.35 + 0.65 * (0.5 + 0.5 * Math.sin(t * 1.3 + i * 1.9));
        const r = h * 0.035;
        const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r);
        g.addColorStop(0, `rgba(140,255,230,${0.30 * puls})`);
        g.addColorStop(1, 'rgba(140,255,230,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(sx, sy, r, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },

  /* ================= Der Schleier über der Szene =================
     Zwei Dinge, die *über* der Bahn liegen müssen und nicht dahinter:

     Das NETZ AUS SONNENLICHT. Wer schon einmal in flachem Wasser gestanden hat, kennt es: Die
     Wellen bündeln das Licht, und auf dem Grund wandert ein Netz aus hellen Linien. Es ist das
     Zeichen für „flach" schlechthin – und weil es mit der Tiefe verschwindet, ist sein Fehlen
     ebenso das Zeichen für „tief". Darum hängt es am Quadrat der Helligkeit: schon in der
     Dämmerzone ist es fast weg.

     Und der BLAUSCHLEIER. Wasser schluckt Rot zuerst; je weiter man hinuntersieht, desto mehr
     wird alles zu einem Blaugrün. Dazu ein dunkler Rand ringsum, der mit der Tiefe zunimmt – so
     rückt der Grund zusammen, ohne daß die Bahn selbst dunkler gezeichnet werden müßte. */
  drawTiefenschleier(ctx, state) {
    const th = this.theme;
    if (!th || !th.meerBg) return;
    const w = this.w, h = this.h, t = this.t || 0;
    const tief = Math.max(0, Math.min(1, th.tiefe == null ? 0.5 : th.tiefe));
    const licht = Math.pow(1 - tief, 2);
    ctx.save();
    if (licht > 0.03) {
      ctx.globalCompositeOperation = 'lighter';
      ctx.strokeStyle = `rgba(200,250,255,${0.055 * licht})`;
      ctx.lineWidth = Math.max(2, h * 0.012);
      for (let i = 0; i < 26; i++) {
        const ph = i * 1.7;
        const y = h * (0.05 + ((i * 0.6180339887) % 1) * 0.95) + Math.sin(t * 0.5 + ph) * h * 0.02;
        ctx.beginPath();
        for (let x = -40; x <= w + 40; x += 22) {
          const yy = y + Math.sin(x * 0.006 + t * 0.8 + ph) * h * 0.035
                       + Math.sin(x * 0.017 - t * 1.1 + ph * 0.5) * h * 0.014;
          if (x === -40) ctx.moveTo(x, yy); else ctx.lineTo(x, yy);
        }
        ctx.stroke();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    /* Der Blaustich: Wasser schluckt Rot zuerst. Er darf die Bahn nicht unlesbar machen – auf dem
       Grund wäre das schnell passiert, und anders als in der Zwergenmine gibt es hier keine Lampe,
       die man dagegen aufnimmt. Darum lieber etwas zu wenig als zu viel. */
    ctx.fillStyle = `rgba(12,74,104,${0.06 + 0.22 * tief})`;
    ctx.fillRect(0, 0, w, h);
    const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.30,
                                       w / 2, h / 2, Math.max(w, h) * 0.78);
    v.addColorStop(0, 'rgba(0,0,0,0)');
    v.addColorStop(1, `rgba(2,16,26,${0.12 + 0.34 * tief})`);
    ctx.fillStyle = v; ctx.fillRect(0, 0, w, h);
    ctx.restore();
  },

  drawFlutFloor(ctx, ob, t) {
    const lv = this.level;
    if (!lv || !ob.ringe) return;
    const fl = lv.flaechen ? (lv.flaechen[ob.ebene || 0] || lv.flaechen[0]) : null;
    if (!fl) return;
    const R = ob.ringe, H = R.length;
    const ring = (x, y) => ((R[y] || [])[x]) || 0;
    const imBecken = (x, y) => { const r = ring(x, y); return r > 0 && r < 9000; };

    ctx.save();
    /* 1. Das Becken selbst – auch wenn es trocken ist. Getönt wird mit der *Wasserfarbe der
          Palette*, nicht mit einem festen Blau: Auf dem hellen Sand der Wasserlinie muß der
          Schimmer dunkler sein, auf dem dunklen Meeresgrund heller. Ein fester Ton sähe oben gut
          aus und wäre unten unsichtbar – und ein unsichtbares Becken ist eine Falle ohne Ansage. */
    const wasser = this.rgbaVon(this.theme.water || '#3f8fd9', 0.26);
    for (let y = 0; y < H; y++) for (let x = 0; x < R[y].length; x++) {
      if (!imBecken(x, y) || fl.tiles[y][x] === 'w') continue;
      this.fillPoly(ctx, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], 0.010, wasser, false);
    }
    /* 2. Die Beckenkante: eine gemauerte Linie ringsum. Sie sagt, wie weit das Wasser höchstens
          kommt – wer außerhalb liegenbleibt, bleibt trocken, so lange er will. */
    ctx.strokeStyle = 'rgba(236,248,255,0.75)';
    ctx.lineWidth = Math.max(1.5, this.scale * 0.08);
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
