/* Die eigene Optik der Erzmagierloge.

   Die dritte und letzte Welt des Zauberreichs, und die letzte, die noch geliehene Bilder trug:
   ein Kristall aus dem Märchenland als Prellklotz und als Windrad, die Grubenlampe der Zwergenmine,
   Blitz und Aufwind des Sturmhimmels, das Pendel und das wandernde Loch der Uhrwerkstadt.

   DIE HANDSCHRIFT DER LOGE: SCHWARZER MARMOR, GOLD UND VIOLETTES BANNFEUER. Der Garten wächst,
   die Sternenwarte misst – hier wird GEBANNT. Alles, was auf diesen Bahnen steht, ist ein
   gefesselter Zauber: in Stein geschnitten, mit Gold ausgelegt, und was sich darin regt, brennt
   violett. Daran erkennt man auf einen Blick, in welcher Welt man ist, auch ohne den Titel.

   Und daraus folgt eine Regel, die für alle sieben gilt: WAS GLÜHT, IST GLEICH DRAN. Das Gold
   liegt still, solange die Maschine ruht, und leuchtet auf, bevor sie zuschlägt. Auf der Stufe
   Legende ist das kein Schmuck, sondern die einzige Vorwarnung, die es gibt. */
Object.assign(Renderer.prototype, {

  /* Ein Siegelkreis: Goldring, Speichen, Runenzacken. Der Baustein, aus dem hier fast alles
     besteht – einmal geschrieben, siebenmal benutzt. 'hell' geht von 0 (kalt) bis 1 (glüht). */
  bannsiegel(ctx, x, y, z, R, hell, dreh) {
    const s = this.scale;
    const [cx, cy] = this.proj(x, y, z);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt); ctx.rotate(dreh || 0);
    const gold = `rgba(${Math.round(190 + 60 * hell)},${Math.round(150 + 90 * hell)},${Math.round(70 + 150 * hell)},${0.45 + 0.55 * hell})`;
    ctx.strokeStyle = gold; ctx.lineWidth = Math.max(1.2, s * 0.045);
    ctx.beginPath(); ctx.arc(0, 0, R * s, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, R * s * 0.74, 0, TAU); ctx.stroke();
    ctx.lineWidth = Math.max(1, s * 0.03);
    for (let k = 0; k < 8; k++) {
      const a = k * (TAU / 8);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * s * 0.74, Math.sin(a) * R * s * 0.74);
      ctx.lineTo(Math.cos(a) * R * s, Math.sin(a) * R * s);
      ctx.stroke();
    }
    // Die Zacken nach außen: ein Siegel hat eine Kante, sonst ist es nur ein Ring
    ctx.fillStyle = gold;
    for (let k = 0; k < 4; k++) {
      const a = k * (TAU / 4) + Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a - 0.1) * R * s, Math.sin(a - 0.1) * R * s);
      ctx.lineTo(Math.cos(a) * R * s * 1.22, Math.sin(a) * R * s * 1.22);
      ctx.lineTo(Math.cos(a + 0.1) * R * s, Math.sin(a + 0.1) * R * s);
      ctx.closePath(); ctx.fill();
    }
    if (hell > 0.05) {
      ctx.fillStyle = `rgba(178,120,255,${0.14 * hell})`;
      ctx.beginPath(); ctx.arc(0, 0, R * s * 1.5, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  /* ================= Der Bannstein (Prellklotz) =================
     Ein Block aus schwarzem Marmor mit einer eingelegten Goldrune. Er tut nichts, bis ihn jemand
     anstößt – dann glüht die Rune auf und stößt zurück. Das ist die Loge in einem Gegenstand:
     Der Zauber sitzt im Stein und wartet. */
  drawBannsteinFloor(ctx, ob, t) {
    const alter = performance.now() / 1000 - ob.hitAt;
    const hell = Math.max(0, 1 - alter * 2.2);
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.r + 0.4, 'rgba(10,6,20,0.45)');
    this.bannsiegel(ctx, ob.x, ob.y, 0.006, ob.r + 0.3, 0.12 + 0.8 * hell, t * 0.2);
    if (alter < 0.6) {   // die Welle, die der Stoß auslöst
      const u = alter / 0.6;
      this.isoEllipse(ctx, ob.x, ob.y, 0.008, (ob.r + 0.3) * (1 + u * 1.1), `rgba(210,170,255,${0.4 * (1 - u)})`);
    }
  },

  drawBannstein(ctx, ob, t) {
    const s = this.scale;
    const alter = performance.now() / 1000 - ob.hitAt;
    const hell = Math.max(0, 1 - alter * 2.2);
    const H = ob.r * 1.5;
    // Der Block: ein Achteck aus Marmor, mit Sockel und goldener Deckleiste
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.r * 1.08, 8), 0, 0.16, '#3a3156', '#1b1530', { outline: '#0c0818' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.r * 0.92, 8), 0.16, H - 0.28, '#2e2748', '#151024', { outline: '#0c0818' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, ob.r * 1.0, 8), H - 0.12, 0.12,
      `rgba(${Math.round(190 + 60 * hell)},${Math.round(150 + 80 * hell)},${Math.round(80 + 120 * hell)},1)`, '#7a5c1c', { outline: '#3d2f0e' });
    // Die Rune auf der Deckfläche
    const [cx, cy] = this.proj(ob.x, ob.y, H);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt);
    const R = s * ob.r * 0.72;
    ctx.strokeStyle = `rgba(240,210,150,${0.35 + 0.65 * hell})`;
    ctx.lineWidth = Math.max(1.5, s * 0.055); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(-R * 0.6, R * 0.5); ctx.lineTo(0, -R * 0.65); ctx.lineTo(R * 0.6, R * 0.5);
    ctx.moveTo(-R * 0.34, R * 0.02); ctx.lineTo(R * 0.34, R * 0.02);
    ctx.stroke();
    if (hell > 0.03) {
      ctx.fillStyle = `rgba(200,150,255,${0.3 * hell})`;
      ctx.beginPath(); ctx.arc(0, 0, R * 1.8, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  /* ================= Das Bannlicht (Grubenlampe) =================
     In der Mine hängt an dieser Stelle eine Öllampe an einem Grubenholz. In der Gruft der Loge
     schwebt eine goldene Schale mit violettem Feuer – sie hängt an nichts und dreht sich langsam.

     WARUM DAS WICHTIGER IST ALS ES AUSSIEHT: Im Bannkreis ist es dunkel, und diese Lampen sind
     das Einzige, was man sieht. Sie sind keine Zierde, sondern die Karte. */
  drawBannlichtFloor(ctx, ob, t) {
    const fl = 0.9 + 0.1 * Math.sin(t * 2.6 + ob.x);
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.r * 0.92, `rgba(178,120,255,${0.075 * fl})`);
    this.isoEllipse(ctx, ob.x, ob.y, 0.005, ob.r * 0.55, `rgba(198,150,255,${0.07 * fl})`);
    // Der Siegelkreis am Fuß: so weit reicht das Licht, und das darf man wissen
    this.bannsiegel(ctx, ob.x, ob.y, 0.007, 0.62, 0.55 + 0.15 * Math.sin(t * 1.5), -t * 0.12);
  },

  drawBannlicht(ctx, ob, t) {
    const s = this.scale;
    const fl = 0.85 + 0.15 * Math.sin(t * 3.1 + ob.x) * Math.sin(t * 2.2 + ob.y);
    const schweben = 1.45 + 0.09 * Math.sin(t * 1.1 + ob.y);
    // Der Sockel bleibt am Boden: eine kurze Marmorstele, auf der nichts steht
    this.prism(ctx, this.circlePoly(ob.x, ob.y, 0.3, 8), 0, 0.14, '#3a3156', '#1b1530', { outline: '#0c0818' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, 0.19, 8), 0.14, 0.5, '#2e2748', '#151024', { outline: '#0c0818' });
    /* Die Schale schwebt darüber – dazwischen ist Luft, und genau die ist der Zauber. Drei
       Goldringe steigen aus dem Sockel zu ihr auf und zeigen, dass sie gehalten wird. */
    const [bx, by] = this.proj(ob.x, ob.y, 0.64);
    const [sx, sy] = this.proj(ob.x, ob.y, schweben);
    for (let k = 0; k < 3; k++) {
      const u = ((t * 0.35 + k / 3) % 1);
      const y = by + (sy - by) * u;
      ctx.strokeStyle = `rgba(226,196,255,${0.4 * (1 - Math.abs(u - 0.5) * 1.6)})`;
      ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath(); ctx.ellipse(bx, y, s * (0.1 + 0.16 * u), s * (0.1 + 0.16 * u) * this.cam.tilt, 0, 0, TAU); ctx.stroke();
    }
    // Die Schale selbst
    ctx.fillStyle = '#e8c36a';
    ctx.beginPath(); ctx.ellipse(sx, sy, s * 0.3, s * 0.13, 0, 0, Math.PI); ctx.fill();
    ctx.strokeStyle = '#7a5c1c'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    ctx.fillStyle = '#f4dda0';
    ctx.beginPath(); ctx.ellipse(sx, sy, s * 0.3, s * 0.1, 0, 0, TAU); ctx.fill();
    // Das Bannfeuer darin: violett, mit hellem Kern
    const h = s * (0.55 + 0.1 * Math.sin(t * 5 + ob.x));
    ctx.fillStyle = `rgba(178,120,255,${0.3 * fl})`;
    ctx.beginPath(); ctx.arc(sx, sy - h * 0.45, h * 1.05, 0, TAU); ctx.fill();
    const g = ctx.createLinearGradient(sx, sy, sx, sy - h);
    g.addColorStop(0, `rgba(226,196,255,${0.95 * fl})`);
    g.addColorStop(0.5, `rgba(178,120,255,${0.8 * fl})`);
    g.addColorStop(1, 'rgba(120,70,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(sx - s * 0.2, sy - s * 0.02);
    ctx.quadraticCurveTo(sx - s * 0.14, sy - h * 0.7, sx, sy - h);
    ctx.quadraticCurveTo(sx + s * 0.14, sy - h * 0.7, sx + s * 0.2, sy - s * 0.02);
    ctx.closePath(); ctx.fill();
  },

  /* ================= Der Bannschlag (Blitz) =================
     Kein Wetter, sondern ein Wächter: ein Siegel im Boden, das sich auflädt und dann eine Säule
     Bannfeuer nach oben schickt. Die Vorwarnung ist dieselbe wie beim Blitz – nur kommt sie hier
     von unten, und man sieht sie im Gold, nicht am Himmel. */
  drawBannschlagFloor(ctx, ob, t) {
    const s = this.scale;
    const poly = [[ob.x - ob.w / 2, ob.y - ob.h / 2], [ob.x + ob.w / 2, ob.y - ob.h / 2],
      [ob.x + ob.w / 2, ob.y + ob.h / 2], [ob.x - ob.w / 2, ob.y + ob.h / 2]];
    this.fillPoly(ctx, poly, 0.003, 'rgba(10,6,20,0.45)', false);
    ctx.strokeStyle = 'rgba(232,195,106,0.35)'; ctx.lineWidth = Math.max(1, s * 0.04);
    this.pathPoly(ctx, poly, 0.004); ctx.stroke();
    const hell = ob.state === 'strike' ? 1 : ob.state === 'warn' ? 0.15 + 0.8 * ob.p : 0.12;
    /* MEHRERE SIEGEL, nicht eines. Das Feld ist oft sechs Kacheln lang; ein einzelnes Siegel in
       seiner Mitte sagte nichts darüber, wie weit die Gefahr reicht. Eine Kette von Siegeln über
       die ganze Länge sagt es, und sie glühen alle zugleich – es ist ein Bann, nicht sechs. */
    const laengs = ob.h >= ob.w, lang = laengs ? ob.h : ob.w, quer = laengs ? ob.w : ob.h;
    const R = Math.min(quer * 0.44, 0.95);
    const n = Math.max(1, Math.round(lang / (R * 2.6)));
    for (let k = 0; k < n; k++) {
      const u = (k + 0.5) / n - 0.5;
      const px = ob.x + (laengs ? 0 : u * lang), py = ob.y + (laengs ? u * lang : 0);
      this.bannsiegel(ctx, px, py, 0.006, R, hell, t * 0.3 + k);
    }
    if (ob.state === 'warn') {   // das Knistern im Gold, kurz bevor es losgeht
      const a = 0.2 + 0.5 * ob.p * (0.6 + 0.4 * Math.sin(t * 28));
      this.fillPoly(ctx, poly, 0.007, `rgba(178,120,255,${a * 0.35})`, false);
    }
    if (ob.state === 'strike') {
      this.fillPoly(ctx, poly, 0.008, `rgba(226,196,255,${0.55 * (1 - ob.p)})`, false);
      for (let k = 0; k < n; k++) {
        const u = (k + 0.5) / n - 0.5;
        const [cx, cy] = this.proj(ob.x + (laengs ? 0 : u * lang), ob.y + (laengs ? u * lang : 0), 0.01);
        ctx.strokeStyle = `rgba(240,225,255,${0.7 * (1 - ob.p)})`; ctx.lineWidth = Math.max(2, s * 0.08);
        ctx.beginPath();
        ctx.ellipse(cx, cy, R * 1.2 * s * (1 + ob.p * 1.4), R * 1.2 * s * this.cam.tilt * (1 + ob.p * 1.4), 0, 0, TAU);
        ctx.stroke();
      }
    }
  },

  drawBannsaeule(ctx, ob, t) {
    if (ob.state !== 'strike') return;
    const s = this.scale, u = ob.p;
    /* Die Säule steht in der Mitte des Feldes und ist so breit wie das Feld schmal ist – sie soll
       decken, was sie trifft, und nicht einen Punkt markieren. */
    const [bx, by] = this.proj(ob.x, ob.y, 0);
    const [, oy] = this.proj(ob.x, ob.y, 5.2);
    const br = s * Math.min(ob.w, ob.h) * 0.42 * (1 - u * 0.45);
    /* Die Säule steht kurz und geht dann aus. Sie wird von unten nach oben heller: Der Zauber
       kommt aus dem Siegel, nicht aus dem Himmel – das ist der ganze Unterschied zum Blitz. */
    const g = ctx.createLinearGradient(bx, by, bx, oy);
    g.addColorStop(0, `rgba(240,228,255,${0.9 * (1 - u)})`);
    g.addColorStop(0.45, `rgba(178,120,255,${0.7 * (1 - u)})`);
    g.addColorStop(1, 'rgba(120,70,220,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.moveTo(bx - br, by); ctx.lineTo(bx - br * 0.35, oy);
    ctx.lineTo(bx + br * 0.35, oy); ctx.lineTo(bx + br, by);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(255,250,255,${0.8 * (1 - u)})`; ctx.lineWidth = Math.max(1.5, br * 0.3);
    ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(bx, oy * 0.5 + by * 0.5); ctx.stroke();
  },

  /* ================= Das Kettenlot (Pendel) =================
     Eine schwere Goldscheibe an einer Kette, die quer über den Weg schwingt. In der Sternenwarte
     hängt die Kugel an einem Draht und misst; hier hängt ein Siegel an einer Kette und räumt auf.
     Dieselbe Maschine, zwei Berufe. */
  drawKettenlotFloor(ctx, ob, t) {
    this.isoEllipse(ctx, ob.x, ob.y, 0.006, (ob.w || 1.2) * 0.45, 'rgba(0,0,0,0.35)');
    // Der Bogen, den es abfährt – auf Legende will man wissen, wie weit es reicht
    const s = this.scale, [ax, ay] = this.proj(ob.ax, ob.ay, 0.004);
    ctx.strokeStyle = 'rgba(232,195,106,0.22)'; ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.setLineDash([s * 0.2, s * 0.24]);
    ctx.beginPath();
    ctx.ellipse(ax, ay, ob.len * s, ob.len * s * this.cam.tilt, 0,
      ob.ruheR - ob.ampR, ob.ruheR + ob.ampR);
    ctx.stroke(); ctx.setLineDash([]);
  },

  drawKettenlot(ctx, ob, t) {
    const s = this.scale;
    const hoehe = ob.hoehe == null ? 0.8 : ob.hoehe;
    const [kx, ky] = this.proj(ob.x, ob.y, hoehe + 0.35);
    const [ax, ay] = this.proj(ob.ax, ob.ay, 4.4);
    // Die Kette: einzelne Glieder statt eines Strichs. Eine Kette hängt, ein Draht misst.
    const n = 12;
    ctx.strokeStyle = '#c8a24a'; ctx.lineWidth = Math.max(1.2, s * 0.04);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n;
      const px = ax + (kx - ax) * u, py = ay + (ky - ay) * u;
      ctx.beginPath();
      ctx.ellipse(px, py, s * 0.045, s * 0.075, Math.atan2(ky - ay, kx - ax) + Math.PI / 2, 0, TAU);
      ctx.stroke();
    }
    // Der Haken oben
    ctx.fillStyle = '#8a6a20'; ctx.beginPath(); ctx.arc(ax, ay, s * 0.1, 0, TAU); ctx.fill();
    /* Die Siegelscheibe. Sie steht hochkant im Bildraum – eine Scheibe, die man in die Weltebene
       legt, fällt in der Schrägsicht um und sieht aus wie eine Pfütze. */
    const R = s * (ob.w || 1.2) * 0.45;
    const g = ctx.createLinearGradient(kx - R, ky - R, kx + R, ky + R);
    g.addColorStop(0, '#f4dda0'); g.addColorStop(0.5, '#d8b054'); g.addColorStop(1, '#7a5c1c');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(kx, ky, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#3d2f0e'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.stroke();
    ctx.strokeStyle = 'rgba(60,44,12,0.7)'; ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath(); ctx.arc(kx, ky, R * 0.66, 0, TAU); ctx.stroke();
    for (let k = 0; k < 6; k++) {
      const a = k * (TAU / 6) + t * 0.2;
      ctx.beginPath();
      ctx.moveTo(kx + Math.cos(a) * R * 0.66, ky + Math.sin(a) * R * 0.66);
      ctx.lineTo(kx + Math.cos(a) * R * 0.94, ky + Math.sin(a) * R * 0.94);
      ctx.stroke();
    }
    // Wisch in Schwungrichtung, an den Umkehrpunkten weg
    const schwung = ob.schwung == null ? 1 : ob.schwung;
    if (schwung > 0.15) {
      const vx = -Math.sin(ob.angle) * ob.dir, vy = Math.cos(ob.angle) * ob.dir;
      const [wx, wy] = this.proj(ob.x - vx * 0.6 * schwung, ob.y - vy * 0.6 * schwung, hoehe + 0.35);
      ctx.strokeStyle = `rgba(226,196,255,${0.3 * schwung})`; ctx.lineWidth = R * 1.5; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(kx, ky); ctx.stroke();
    }
  },

  /* ================= Der Bannzeiger (Windrad) =================
     Ein steinerner Arm, der sich um eine Säule dreht und an seiner Spitze ein Siegel trägt. Er
     fegt den Weg frei wie jedes Windrad – aber er sieht aus wie der Zeiger eines Siegels, das
     jemand in den Boden der Loge geschnitten hat. */
  drawBannzeigerFloor(ctx, ob, t) {
    this.isoEllipse(ctx, ob.x, ob.y, 0.003, ob.len + 0.3, 'rgba(10,6,20,0.3)');
    this.bannsiegel(ctx, ob.x, ob.y, 0.005, ob.len * 0.82, 0.18, -t * 0.1);
  },

  drawBannzeiger(ctx, ob, t) {
    const s = this.scale;
    const hubR = Math.max(0.2, ob.hubR || 0.24);
    // Die Säule in der Mitte
    this.prism(ctx, this.circlePoly(ob.x, ob.y, hubR * 1.5, 8), 0, 0.16, '#3a3156', '#1b1530', { outline: '#0c0818' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, hubR, 8), 0.16, 0.7, '#2e2748', '#151024', { outline: '#0c0818' });
    this.isoEllipse(ctx, ob.x, ob.y, 0.88, hubR * 1.2, '#c8a24a');
    for (let i = 0; i < ob.blades; i++) {
      const a = ob.bladeAngle(i), ca = Math.cos(a), sa = Math.sin(a), tk = ob.thick;
      const arm = [[ob.x - sa * tk, ob.y + ca * tk], [ob.x + ca * ob.len - sa * tk, ob.y + sa * ob.len + ca * tk],
        [ob.x + ca * ob.len + sa * tk, ob.y + sa * ob.len - ca * tk], [ob.x + sa * tk, ob.y - ca * tk]];
      this.prism(ctx, arm, 0.3, 0.42, '#3a3156', '#1b1530', { outline: '#0c0818' });
      // Die Goldschiene auf dem Arm: sie macht aus dem Balken einen Zeiger
      const p0 = this.proj(ob.x + ca * hubR * 1.2, ob.y + sa * hubR * 1.2, 0.73);
      const p1 = this.proj(ob.x + ca * (ob.len - 0.12), ob.y + sa * (ob.len - 0.12), 0.73);
      ctx.strokeStyle = '#d8b054'; ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      // Das Siegel an der Spitze, aufrecht im Bildraum
      const [tx, ty] = this.proj(ob.x + ca * ob.len, ob.y + sa * ob.len, 0.78);
      const R = s * 0.26;
      ctx.fillStyle = '#e8c36a'; ctx.beginPath(); ctx.arc(tx, ty, R, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#3d2f0e'; ctx.lineWidth = Math.max(1, s * 0.035); ctx.stroke();
      ctx.fillStyle = `rgba(178,120,255,${0.3 + 0.2 * Math.sin(t * 3 + i)})`;
      ctx.beginPath(); ctx.arc(tx, ty, R * 1.7, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(60,44,12,0.8)'; ctx.lineWidth = Math.max(1, s * 0.03);
      ctx.beginPath(); ctx.moveTo(tx - R * 0.5, ty); ctx.lineTo(tx + R * 0.5, ty);
      ctx.moveTo(tx, ty - R * 0.5); ctx.lineTo(tx, ty + R * 0.5); ctx.stroke();
    }
  },

  /* ================= Der Bannschacht (Aufwind) =================
     Ein Schacht im Boden der Loge, aus dem Bannfeuer aufsteigt. Wer mit Schwung hineinfährt, wird
     hinausgeworfen – dieselbe Wirkung wie der Aufwind des Sturmhimmels, nur weiß man hier, WER
     einen wirft: der Kreis ringsum ist ein Siegel und keine Wetterlage. */
  drawBannschacht(ctx, ob, t) {
    const s = this.scale, cx = ob.x + ob.w / 2, cy = ob.y + ob.h / 2;
    const R = Math.min(ob.w, ob.h) * 0.42;
    const puls = 0.55 + 0.45 * Math.sin(t * 2.4);
    const boom = Math.max(0, 1 - (t - (ob.liftAt == null ? -10 : ob.liftAt)) / 0.6);
    const poly = [[ob.x, ob.y], [ob.x + ob.w, ob.y], [ob.x + ob.w, ob.y + ob.h], [ob.x, ob.y + ob.h]];
    this.fillPoly(ctx, poly, 0.003, 'rgba(8,5,16,0.85)', false);
    const [c0, c1] = this.proj(cx, cy, 0.004);
    const g = ctx.createRadialGradient(c0, c1, 0, c0, c1, s * R * 2.4);
    g.addColorStop(0, `rgba(226,196,255,${0.4 + 0.3 * puls + 0.4 * boom})`);
    g.addColorStop(0.5, `rgba(178,120,255,${0.2 + 0.15 * puls})`);
    g.addColorStop(1, 'rgba(120,70,220,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c0, c1, s * R * 2.4, 0, TAU); ctx.fill();
    this.bannsiegel(ctx, cx, cy, 0.007, R * 1.25, 0.4 + 0.3 * puls + 0.3 * boom, t * 0.25);
    /* Die Flammenzungen, die aus dem Schacht steigen. Sie laufen nach OBEN aus dem Bild heraus –
       das ist die ganze Ansage: Wer hier hineinfährt, geht denselben Weg. */
    for (let k = 0; k < 6; k++) {
      const u = ((t * 0.8 + k / 6) % 1);
      const a = k * (TAU / 6) + t * 0.4;
      const [px, py] = this.proj(cx + Math.cos(a) * R * 0.7 * (1 - u * 0.6), cy + Math.sin(a) * R * 0.7 * (1 - u * 0.6), 0.1 + u * 2.6);
      ctx.fillStyle = `rgba(${Math.round(200 + 40 * u)},${Math.round(160 + 40 * u)},255,${(1 - u) * (0.5 + 0.4 * boom)})`;
      ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * 0.09 * (1 - u * 0.5)), 0, TAU); ctx.fill();
    }
  },

  /* ================= Das Siegelloch (wanderndes Loch) =================
     Das Loch steht nicht fest: Es wandert zwischen mehreren Stellen, und nur an einer ist es
     offen. Vorher waren das Ziffern auf einem Zifferblatt – hier sind es Siegel im Marmor. Das
     geschlossene ist Gold auf Schwarz, das offene ein Schacht: Man sieht auf einen Blick, welches
     gerade zählt, und das ist auf Legende der Unterschied zwischen Schlag und Strafschlag. */
  drawSiegellochFloor(ctx, ob, t) {
    const s = this.scale;
    // Die Linie zwischen den Stellen: sie sagt, wohin das Loch als Nächstes geht
    ctx.strokeStyle = 'rgba(232,195,106,0.2)'; ctx.lineWidth = Math.max(1, s * 0.045);
    ctx.setLineDash([s * 0.22, s * 0.26]);
    ctx.beginPath();
    for (let i = 0; i <= ob.orte.length; i++) {
      const [px, py] = ob.orte[i % ob.orte.length];
      const p = this.proj(px, py, 0.005);
      i ? ctx.lineTo(p[0], p[1]) : ctx.moveTo(p[0], p[1]);
    }
    ctx.stroke(); ctx.setLineDash([]);
    for (let i = 0; i < ob.orte.length; i++) {
      const [px, py] = ob.orte[i];
      const an = i === ob.aktiv;
      if (an) {
        // Das offene Siegel: ein Schacht, und das Gold darum brennt
        this.bannsiegel(ctx, px, py, 0.008, 0.72, 0.9 + 0.1 * Math.sin(t * 4), t * 0.5);
        this.isoEllipse(ctx, px, py, 0.009, 0.46, 'rgba(6,4,14,0.95)');
        this.isoEllipse(ctx, px, py, 0.01, 0.3, 'rgba(120,70,220,0.35)');
      } else {
        // Die geschlossenen: Gold auf Schwarz, kalt
        this.bannsiegel(ctx, px, py, 0.006, 0.6, 0.14, -t * 0.08);
        this.isoEllipse(ctx, px, py, 0.007, 0.34, 'rgba(46,39,72,0.9)');
      }
    }
  },
});
