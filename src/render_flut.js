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

  /* ================= Die Strömung =================
     Eine Strömung muß man sehen, *bevor* man hineinspielt, und man muß ihre Richtung sehen. Beides
     zusammen macht eine einzige Zeichnung: Striche, die mit der Strömung laufen. Sie wandern im
     Bild – Stillstand wäre hier eine Lüge, denn eine Strömung, die stillsteht, gibt es nicht –,
     und ihre Spitze läuft vorweg, so wie eine Welle spitz auf ihre Laufrichtung zeigt.

     Wie stark sie zieht, sagt die Dichte der Striche und ihr Tempo, nicht ihre Farbe. Eine
     Dünung (puls > 0) schwillt dabei sichtbar an und ab: Wenn sie gerade nicht zieht, sind die
     Striche blaß, und das ist der Augenblick zum Durchspielen. */
  drawStroemungFloor(ctx, ob, t) {
    const s = this.scale;
    const k = ob.k == null ? 1 : ob.k;
    const dx = ob.dx, dy = ob.dy;
    const qx = -dy, qy = dx;                       // quer zur Strömung
    const laenge = Math.abs(dx) > 0.5 ? ob.w : ob.h;
    const breite = Math.abs(dx) > 0.5 ? ob.h : ob.w;
    ctx.save();
    /* Das Band selbst, damit die Grenze klar ist: Wer daneben liegt, liegt ruhig. */
    const ecken = [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([a, b]) =>
      [ob.x + (dx * a * laenge + qx * b * breite) / 2, ob.y + (dy * a * laenge + qy * b * breite) / 2]);
    this.fillPoly(ctx, ecken, 0.009, this.rgbaVon(this.theme.accent || '#8fd8ff', 0.14), false);

    /* Wenige, große Striche statt vieler kleiner. Der erste Versuch setzte rund hundert winzige
       Marken ins Band; aus zwei Metern Abstand war das ein Raster und keine Strömung. */
    const reihen = Math.max(2, Math.round(breite * 0.62));
    const proReihe = Math.max(3, Math.round(laenge * 0.42));
    ctx.lineCap = 'round';
    for (let r = 0; r < reihen; r++) {
      const q = ((r + 0.5) / reihen - 0.5) * breite;
      for (let i = 0; i < proReihe; i++) {
        /* Der Versatz je Reihe bricht das Gittermuster auf – sonst sieht es aus wie ein Zaun. */
        const u = (((i + r * 0.37) / proReihe + t * (0.22 + 0.12 * k)) % 1) * laenge - laenge / 2;
        const l = laenge / proReihe * 0.52;
        const a0 = [ob.x + dx * u + qx * q, ob.y + dy * u + qy * q];
        const a1 = [a0[0] + dx * l, a0[1] + dy * l];
        const p0 = this.proj(a0[0], a0[1], 0.012), p1 = this.proj(a1[0], a1[1], 0.012);
        ctx.strokeStyle = `rgba(232,250,255,${(0.34 + 0.46 * k) * (0.6 + 0.4 * Math.sin(i * 1.7 + r))})`;
        ctx.lineWidth = Math.max(2, s * 0.1);
        ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
        // die Spitze läuft vorweg: so zeigt der Strich, wohin es geht
        const sp = this.proj(a1[0] + dx * l * 0.5, a1[1] + dy * l * 0.5, 0.012);
        const fl = this.proj(a1[0] + qx * l * 0.26, a1[1] + qy * l * 0.26, 0.012);
        const fr = this.proj(a1[0] - qx * l * 0.26, a1[1] - qy * l * 0.26, 0.012);
        ctx.fillStyle = `rgba(232,250,255,${0.38 + 0.5 * k})`;
        ctx.beginPath(); ctx.moveTo(sp[0], sp[1]); ctx.lineTo(fl[0], fl[1]); ctx.lineTo(fr[0], fr[1]);
        ctx.closePath(); ctx.fill();
      }
    }
    ctx.restore();
  },

  /* ================= Der Strudel =================
     Ringe, die sich drehen, und zwar außen langsamer als innen – daran erkennt man von weitem, daß
     es sich wirklich dreht und nicht bloß rund ist. Die Mitte bleibt hell: Sie ist kein Loch, und
     sie soll auch nicht wie eines aussehen, sonst zielt jemand hinein und wundert sich. */
  drawStrudelFloor(ctx, ob, t) {
    const R = ob.r || 2.4, dreh = ob.dreh || 1;
    ctx.save();
    for (let ring = 4; ring >= 1; ring--) {
      const rr = R * (ring / 4);
      const u = 1 - ring / 5;                      // innen schneller
      ctx.strokeStyle = `rgba(214,244,255,${0.10 + 0.16 * u})`;
      ctx.lineWidth = Math.max(1.2, this.scale * (0.05 + 0.03 * u));
      for (let arm = 0; arm < 3; arm++) {
        const a0 = t * dreh * (0.6 + 1.5 * u) + (arm * TAU) / 3;
        ctx.beginPath();
        for (let i = 0; i <= 14; i++) {
          const a = a0 + (i / 14) * (TAU * 0.42);
          const rad = rr * (1 - (i / 14) * 0.16);
          const [px, py] = this.proj(ob.x + Math.cos(a) * rad, ob.y + Math.sin(a) * rad, 0.011);
          if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }
    // Die helle Mitte: der Wendepunkt, an dem es wieder herausdrückt
    const [cx, cy] = this.proj(ob.x, ob.y, 0.012);
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, this.scale * R * 0.4);
    g.addColorStop(0, 'rgba(232,250,255,0.28)');
    g.addColorStop(1, 'rgba(232,250,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(cx, cy, this.scale * R * 0.4, this.scale * R * 0.4 * this.cam.tilt, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },

  /* ================= Der Schwarze Raucher =================
     Auf dem Boden der Ring, der sagt, wie weit er greift – und wie nah der nächste Ausbruch ist.
     Das ist dieselbe Ansage wie beim Ring der Lavafontäne, und sie steht aus demselben Grund auf
     dem Boden und nicht am Gerät: Man zielt auf den Boden, nicht auf den Schlot. */
  drawRaucherFloor(ctx, ob, t) {
    const [sx, sy] = this.proj(ob.x, ob.y, 0.011);
    const R = this.scale * (ob.r || 1);
    const a = ob.ansage || 0;
    ctx.save();
    ctx.strokeStyle = `rgba(255,190,140,${0.18 + 0.6 * a})`;
    ctx.lineWidth = Math.max(1.5, this.scale * (0.05 + 0.06 * a));
    ctx.beginPath(); ctx.ellipse(sx, sy, R, R * this.cam.tilt, 0, 0, TAU); ctx.stroke();
    if (ob.bricht) {
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, R * 1.3);
      g.addColorStop(0, 'rgba(255,220,180,0.45)'); g.addColorStop(1, 'rgba(255,160,90,0)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.ellipse(sx, sy, R * 1.3, R * 1.3 * this.cam.tilt, 0, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  /* Der Schlot selbst: ein schiefer Turm aus verbackenen Mineralien, und darüber die Wolke.
     Zwischen den Ausbrüchen steigt nur ein Faden; vor dem Ausbruch schwillt er an, und im Stoß
     schießt die Fahne heraus. Wie stark, sagt die Höhe – nicht die Farbe. */
  drawRaucher(ctx, ob, t) {
    const s = this.scale;
    const [sx, sy] = this.proj(ob.x, ob.y, 0);
    const a = ob.ansage || 0;
    const stoss = ob.bricht ? Math.sin(Math.min(1, ob.p) * Math.PI) : 0;
    ctx.save();
    // Schlot
    const hoehe = s * 1.5;
    const schlot = ctx.createLinearGradient(sx, sy, sx, sy - hoehe);
    schlot.addColorStop(0, '#2a2420'); schlot.addColorStop(0.6, '#3e332c'); schlot.addColorStop(1, '#1d1815');
    ctx.fillStyle = schlot;
    ctx.beginPath();
    ctx.moveTo(sx - s * 0.62, sy);
    ctx.quadraticCurveTo(sx - s * 0.34, sy - hoehe * 0.6, sx - s * 0.22, sy - hoehe);
    ctx.lineTo(sx + s * 0.2, sy - hoehe);
    ctx.quadraticCurveTo(sx + s * 0.4, sy - hoehe * 0.55, sx + s * 0.66, sy);
    ctx.closePath(); ctx.fill();
    // Krusten
    ctx.strokeStyle = 'rgba(200,170,140,0.22)'; ctx.lineWidth = Math.max(1, s * 0.035);
    for (let i = 1; i <= 3; i++) {
      const y = sy - hoehe * (i / 4);
      ctx.beginPath(); ctx.moveTo(sx - s * (0.55 - i * 0.09), y); ctx.lineTo(sx + s * (0.58 - i * 0.1), y); ctx.stroke();
    }
    // Die Fahne
    const menge = Math.max(a * 0.45, stoss);
    if (menge > 0.02) {
      ctx.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 10; i++) {
        const u = i / 10;
        const hy = sy - hoehe - u * s * (1.2 + 6.5 * menge);
        const hx = sx + Math.sin(t * 2.1 + i * 0.8) * s * 0.3 * u;
        const r = s * (0.18 + 0.5 * u) * (0.5 + menge);
        ctx.fillStyle = `rgba(${40 + 120 * stoss | 0},${34 + 60 * stoss | 0},${30 + 30 * stoss | 0},${(0.3 - 0.24 * u) * (0.4 + menge)})`;
        ctx.beginPath(); ctx.arc(hx, hy, r, 0, TAU); ctx.fill();
      }
      ctx.globalCompositeOperation = 'source-over';
    }
    ctx.restore();
  },

  /* ================= Die Ankerkette =================
     Die Kette von der Aufhängung zum Anker ist das Wichtigste an der Zeichnung: An ihr liest man
     ab, wo der Anker gleich sein wird. Ein Anker ohne sichtbare Aufhängung hätte keine Bahn, die
     man vorhersehen könnte, und wäre damit Glückssache. */
  drawAnkerkette(ctx, ob, t) {
    const s = this.scale;
    const [ax, ay] = this.proj(ob.ax, ob.ay, 1.5);
    const [bx, by] = this.proj(ob.x, ob.y, ob.hoehe || 0.9);
    ctx.save();
    // Die Kette: Glied für Glied, damit sie schwer aussieht und nicht wie ein Faden
    const n = 12;
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const gx = ax + (bx - ax) * u, gy = ay + (by - ay) * u - Math.sin(u * Math.PI) * s * 0.12;
      ctx.strokeStyle = i % 2 ? 'rgba(150,158,160,0.85)' : 'rgba(96,104,108,0.85)';
      ctx.lineWidth = Math.max(1.5, s * 0.075);
      ctx.beginPath(); ctx.ellipse(gx, gy, s * 0.1, s * 0.055, Math.atan2(by - ay, bx - ax), 0, TAU); ctx.stroke();
    }
    // Die Aufhängung: ein Poller, an dem sie hängt
    ctx.fillStyle = '#4a545a';
    ctx.beginPath(); ctx.ellipse(ax, ay, s * 0.22, s * 0.3, 0, 0, TAU); ctx.fill();

    // Der Anker
    const gr = s * 0.55;
    ctx.translate(bx, by);
    ctx.strokeStyle = '#8d979b'; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.lineWidth = Math.max(2, s * 0.13);
    ctx.beginPath(); ctx.moveTo(0, -gr * 1.1); ctx.lineTo(0, gr * 0.75); ctx.stroke();       // Schaft
    ctx.lineWidth = Math.max(2, s * 0.1);
    ctx.beginPath(); ctx.moveTo(-gr * 0.6, -gr * 0.65); ctx.lineTo(gr * 0.6, -gr * 0.65); ctx.stroke();  // Stock
    ctx.lineWidth = Math.max(2, s * 0.12);
    ctx.beginPath();
    ctx.moveTo(-gr * 0.85, gr * 0.1);
    ctx.quadraticCurveTo(-gr * 0.7, gr * 0.85, 0, gr * 0.8);
    ctx.quadraticCurveTo(gr * 0.7, gr * 0.85, gr * 0.85, gr * 0.1);
    ctx.stroke();                                                                             // Arme
    ctx.fillStyle = '#b4bec2';
    for (const sx2 of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(sx2 * gr * 0.85, gr * 0.1);
      ctx.lineTo(sx2 * gr * 1.05, gr * 0.42);
      ctx.lineTo(sx2 * gr * 0.62, gr * 0.36);
      ctx.closePath(); ctx.fill();                                                            // Flunken
    }
    ctx.strokeStyle = '#6c7679'; ctx.lineWidth = Math.max(1.5, s * 0.08);
    ctx.beginPath(); ctx.arc(0, -gr * 1.15, gr * 0.22, 0, TAU); ctx.stroke();                  // Ring
    ctx.restore();
  },

  /* ================= Der Tangwald =================
     Halme, die im Wellengang stehen und sich neigen – und zwischen ihnen die Gasse, die mitwandert.
     Gezeichnet wird die Gasse nicht als Loch, sondern als Lücke zwischen den Halmen: Man sieht sie,
     weil dort nichts steht. Das ist wichtiger, als es klingt – ein gezeichneter Korridor sähe aus
     wie ein Weg mit Rand, und der Tang hat keinen Rand, er wird nur dünner.

     Die Halme stehen auf festen Plätzen (aus ihrem Zähler gerechnet, nicht gewürfelt), damit das
     Bild bei jedem Aufruf dasselbe ist. Ein Tangwald, der bei jedem Bild neu wächst, flimmert. */
  drawTangwald(ctx, ob, t) {
    const s = this.scale;
    const quer = ob.laengsY;
    const spanne = quer ? ob.h : ob.w;
    const dicke = quer ? ob.w : ob.h;
    const n = Math.max(10, Math.round(spanne * 5));
    ctx.save();
    ctx.lineCap = 'round';
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n - 0.5;                     // quer zum Streifen, -0,5 … 0,5
      const d = ob.dichte
        ? ob.dichte(quer ? ob.x : ob.x + u * spanne, quer ? ob.y + u * spanne : ob.y)
        : 1;
      if (d <= 0.02) continue;
      /* Zwei bis drei Halme je Platz, über die Dicke des Streifens verteilt. */
      for (let k = 0; k < 3; k++) {
        const laengs = ((i * 7 + k * 13) % 11) / 11 - 0.5;
        const px = quer ? ob.x + laengs * dicke : ob.x + u * spanne;
        const py = quer ? ob.y + u * spanne : ob.y + laengs * dicke;
        const hoch = (0.55 + 0.45 * ((i * 5 + k * 3) % 7) / 7) * d;
        const neigung = Math.sin(t * 1.6 + i * 0.7 + k) * 0.32;
        const [fx, fy] = this.proj(px, py, 0.01);
        const [tx, ty] = this.proj(px + neigung * 0.35, py, 0.01 + hoch * 1.5);
        const g = ctx.createLinearGradient(fx, fy, tx, ty);
        g.addColorStop(0, `rgba(36,74,50,${0.25 + 0.5 * d})`);
        g.addColorStop(1, `rgba(96,158,96,${0.15 + 0.45 * d})`);
        ctx.strokeStyle = g;
        ctx.lineWidth = Math.max(1.5, s * 0.09 * (0.6 + 0.4 * d));
        ctx.beginPath();
        ctx.moveTo(fx, fy);
        ctx.quadraticCurveTo((fx + tx) / 2 + neigung * s * 0.25, (fy + ty) / 2, tx, ty);
        ctx.stroke();
        // ein Blatt an der Spitze, damit es Tang ist und kein Gras
        ctx.fillStyle = `rgba(120,180,110,${0.2 + 0.4 * d})`;
        ctx.beginPath(); ctx.ellipse(tx, ty, s * 0.09, s * 0.05, neigung, 0, TAU); ctx.fill();
      }
    }
    ctx.restore();
  },

  /* ================= Die Riesenmuschel =================
     Zwei Schalen, die sich um ein Scharnier hinten öffnen – das Maul zeigt in die Richtung, in die
     sie den Ball wieder ausspuckt. Damit sagt die Zeichnung von selbst, wohin es geht, und niemand
     muß es ausprobieren.

     Die Rippen laufen vom Scharnier nach außen. Sie sind nicht nur Schmuck: An ihnen sieht man
     auch im Kleinen, wie weit sie schon offen steht, denn die beiden Fächer spreizen sich. */
  drawMuschel(ctx, ob, t) {
    const s = this.scale, R = s * (ob.r || 1.05);
    const [sx, sy] = this.proj(ob.x, ob.y, 0.05);
    // Blickrichtung am Bildschirm, nicht auf der Karte
    const [ax, ay] = this.proj(ob.x, ob.y, 0.05);
    const [bx, by] = this.proj(ob.x + ob.dx, ob.y + ob.dy, 0.05);
    const w = Math.atan2(by - ay, bx - ax);
    const p = ob.p || 0;
    const spalt = 0.16 + 0.78 * p;            // Öffnungswinkel je Schale

    ctx.save();
    ctx.translate(sx, sy); ctx.rotate(w);
    ctx.scale(1, this.cam.tilt + (1 - this.cam.tilt) * 0.35);   // flach liegend, aber nicht platt

    // Der dunkle Schlund – man muß sehen, daß da etwas hineinpaßt
    if (p > 0.05) {
      const g = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      g.addColorStop(0, `rgba(10,26,30,${0.55 + 0.4 * p})`);
      g.addColorStop(1, 'rgba(10,26,30,0.15)');
      ctx.fillStyle = g;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.92, 0, TAU); ctx.fill();
      // die Perle: der Grund, warum man hineinspielen will
      const puls = 0.75 + 0.25 * Math.sin(t * 2.2);
      const pg = ctx.createRadialGradient(-R * 0.1, 0, 0, -R * 0.1, 0, R * 0.42);
      pg.addColorStop(0, `rgba(255,255,255,${0.85 * p})`);
      pg.addColorStop(0.5, `rgba(200,240,255,${0.35 * p})`);
      pg.addColorStop(1, 'rgba(200,240,255,0)');
      ctx.fillStyle = pg;
      ctx.beginPath(); ctx.arc(-R * 0.1, 0, R * 0.42 * puls, 0, TAU); ctx.fill();
    }

    /* Die beiden Schalen. Das Scharnier liegt hinten (in -x), die Öffnung vorn – darum werden die
       Fächer um -R/2 gedreht und nicht um die Mitte. */
    for (const seite of [-1, 1]) {
      ctx.save();
      ctx.translate(-R * 0.55, 0);
      ctx.rotate(seite * spalt);
      /* Der Verlauf läuft der LÄNGE nach, vom Scharnier zum Rand. Beim ersten Versuch lief er quer
         dazu – dann lag fast die ganze Schale außerhalb und nahm die Endfarbe an, und statt einer
         hellen Muschel stand da ein brauner Fächer. */
      const schale = ctx.createLinearGradient(0, 0, R * 1.6, 0);
      schale.addColorStop(0, '#9d8c6e'); schale.addColorStop(0.45, '#dccfb0'); schale.addColorStop(1, '#f6eedc');
      ctx.fillStyle = schale;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.quadraticCurveTo(R * 0.7, seite * R * 0.12, R * 1.45, seite * R * 0.28);
      ctx.quadraticCurveTo(R * 1.66, seite * R * 0.72, R * 1.12, seite * R * 1.02);
      ctx.quadraticCurveTo(R * 0.52, seite * R * 0.72, 0, 0);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(86,70,48,0.6)'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.stroke();
      // Rippen vom Scharnier zum Rand – an ihnen sieht man auch im Kleinen, wie weit sie offen ist
      ctx.strokeStyle = 'rgba(120,100,70,0.45)'; ctx.lineWidth = Math.max(1, s * 0.03);
      for (let i = 1; i <= 5; i++) {
        const q = i / 6;
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(R * 0.62, seite * R * (0.12 + 0.6 * q) * 0.8,
                             R * 1.3 + R * 0.15 * (1 - q), seite * R * (0.28 + 0.74 * q));
        ctx.stroke();
      }
      ctx.restore();
    }
    // Das Scharnier selbst
    ctx.fillStyle = '#6b5b45';
    ctx.beginPath(); ctx.ellipse(-R * 0.55, 0, R * 0.16, R * 0.3, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },

  /* ================= Der Anglerfisch =================
     Zwei Zeichnungen, und die erste ist die wichtigere: der Schein seiner Laterne auf dem Grund.
     Ihn sieht man, bevor man den Fisch selbst erkennt – und genau darum geht es. Auf dem
     Meeresgrund ist er ohnehin das Hellste weit und breit.

     Der Fisch selbst ist von oben gesehen: ein plumper Leib, das Maul voraus, darüber die Angel
     mit dem Licht an der Spitze. Er schlägt mit dem Schwanz, und zwar schneller, während er
     schwimmt – ein Fisch, der sich gleichmäßig bewegt und dabei stillsteht, sieht aus wie gezogen. */
  drawAnglerScheinFloor(ctx, ob, t) {
    const [sx, sy] = this.proj(ob.x + ob.dx * 0.9, ob.y + ob.dy * 0.9, 0.011);
    const r = this.scale * (ob.licht || 3.6);
    const puls = 0.82 + 0.18 * Math.sin(t * 2.6);
    const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, r * puls);
    g.addColorStop(0, 'rgba(180,255,235,0.34)');
    g.addColorStop(0.45, 'rgba(120,220,220,0.14)');
    g.addColorStop(1, 'rgba(120,220,220,0)');
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.ellipse(sx, sy, r * puls, r * puls * this.cam.tilt, 0, 0, TAU); ctx.fill();
    ctx.restore();
  },

  drawAngler(ctx, ob, t) {
    const s = this.scale;
    const [sx, sy] = this.proj(ob.x, ob.y, 0.22);
    /* Der Fisch wird in seine Schwimmrichtung gedreht. In der schrägen Sicht des Spiels ist die
       Richtung am Bildschirm eine andere als auf der Karte – darum wird sie projiziert und nicht
       aus dx/dy geradeheraus genommen. */
    const [ax, ay] = this.proj(ob.x, ob.y, 0.22);
    const [bx, by] = this.proj(ob.x + ob.dx, ob.y + ob.dy, 0.22);
    const w = Math.atan2(by - ay, bx - ax);
    const L = s * 1.15, H = s * 0.62;
    const schlag = Math.sin(t * 7.5) * 0.45;
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(w);

    // Schatten auf dem Grund
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    ctx.beginPath(); ctx.ellipse(0, H * 0.55, L * 0.5, H * 0.3, 0, 0, TAU); ctx.fill();

    // Schwanzflosse – sie schlägt
    ctx.save();
    ctx.translate(-L * 0.42, 0); ctx.rotate(schlag);
    ctx.fillStyle = '#2d4c52';
    ctx.beginPath();
    ctx.moveTo(0, 0); ctx.lineTo(-L * 0.34, -H * 0.42); ctx.lineTo(-L * 0.22, 0);
    ctx.lineTo(-L * 0.34, H * 0.42); ctx.closePath(); ctx.fill();
    ctx.restore();

    // Leib: vorn dick, hinten schmal – ein Tiefseeangler ist ein Sack mit Maul
    const leib = ctx.createLinearGradient(0, -H * 0.5, 0, H * 0.5);
    leib.addColorStop(0, '#4a7178'); leib.addColorStop(0.55, '#33565d'); leib.addColorStop(1, '#1d3a41');
    ctx.fillStyle = leib;
    ctx.beginPath();
    ctx.moveTo(L * 0.5, 0);
    ctx.bezierCurveTo(L * 0.42, -H * 0.62, -L * 0.1, -H * 0.5, -L * 0.42, -H * 0.1);
    ctx.lineTo(-L * 0.42, H * 0.1);
    ctx.bezierCurveTo(-L * 0.1, H * 0.5, L * 0.42, H * 0.62, L * 0.5, 0);
    ctx.closePath(); ctx.fill();
    // Rückenflosse
    ctx.fillStyle = '#26454b';
    ctx.beginPath();
    ctx.moveTo(-L * 0.05, -H * 0.48); ctx.lineTo(-L * 0.2, -H * 0.78); ctx.lineTo(-L * 0.3, -H * 0.4);
    ctx.closePath(); ctx.fill();

    // Maul mit Zähnen – das Kennzeichen, an dem man ihn auch klein erkennt
    ctx.fillStyle = '#10262b';
    ctx.beginPath();
    ctx.moveTo(L * 0.5, 0); ctx.quadraticCurveTo(L * 0.2, H * 0.34, L * 0.02, H * 0.2);
    ctx.quadraticCurveTo(L * 0.22, H * 0.06, L * 0.5, 0); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#eaf6f2';
    for (let i = 0; i < 5; i++) {
      const u = 0.08 + i * 0.09;
      const zx = L * (0.5 - u * 1.0), zy = H * (0.06 + u * 0.55);
      ctx.beginPath(); ctx.moveTo(zx, zy); ctx.lineTo(zx + s * 0.055, zy - s * 0.12);
      ctx.lineTo(zx + s * 0.11, zy); ctx.closePath(); ctx.fill();
    }

    // Auge
    ctx.fillStyle = '#f2fbff';
    ctx.beginPath(); ctx.arc(L * 0.26, -H * 0.2, s * 0.09, 0, TAU); ctx.fill();
    ctx.fillStyle = '#08161a';
    ctx.beginPath(); ctx.arc(L * 0.28, -H * 0.2, s * 0.045, 0, TAU); ctx.fill();

    /* Die Angel: ein Stiel vom Kopf nach vorn, an seiner Spitze das Licht. Sie schwingt leicht –
       sonst sieht sie aus wie angeklebt. */
    const wippe = Math.sin(t * 3.1) * 0.12;
    ctx.save();
    ctx.translate(L * 0.3, -H * 0.36); ctx.rotate(-0.55 + wippe);
    ctx.strokeStyle = '#2b4a50'; ctx.lineWidth = Math.max(1.2, s * 0.05);
    ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(s * 0.35, -s * 0.28, s * 0.72, -s * 0.18);
    ctx.stroke();
    const lx = s * 0.72, ly = -s * 0.18;
    const gl = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 0.42);
    gl.addColorStop(0, 'rgba(210,255,240,0.95)'); gl.addColorStop(0.4, 'rgba(130,235,220,0.5)');
    gl.addColorStop(1, 'rgba(130,235,220,0)');
    ctx.fillStyle = gl;
    ctx.beginPath(); ctx.arc(lx, ly, s * 0.42, 0, TAU); ctx.fill();
    ctx.fillStyle = '#eafff8';
    ctx.beginPath(); ctx.arc(lx, ly, Math.max(1.5, s * 0.1), 0, TAU); ctx.fill();
    ctx.restore();
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
