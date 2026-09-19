/* Die eigene Optik der Sternenwarte.

   Dieselbe Geschichte wie im Lehrlingsgarten, eine Welt weiter oben: Sechs Maschinen liehen sich
   hier ihr Bild aus älteren Welten – der Prellklotz einen Kristall aus dem Märchenland, das
   Fernrohr das Auge des Schattenreichs, Pendel, Zahnradfeld und Wandertor die Uhrwerkstadt, der
   Nebelwirbel den Strudel der Flut. Jetzt sind es sechs Instrumente einer Sternwarte.

   DIE WELT HAT EINE HANDSCHRIFT: Messing, Nachtblau und Sternenlicht. Was aus Menschenhand kommt,
   ist gedrechseltes Messing mit Gradteilung; was vom Himmel kommt, leuchtet. Genau daran
   unterscheidet man auf dieser Terrasse ein Gerät von einer Erscheinung – der Tubus, das Pendel,
   die Schiene und die Kulisse sind Instrumente, Meteorit und Spiralnebel sind es nicht.

   Und es gilt, was im Garten gilt: Was den Ball anfasst, wird auch gezeichnet, und was aufrecht
   steht, wird im BILDRAUM gebaut und nimmt nur die Höhe aus der Projektion. */
Object.assign(Renderer.prototype, {

  /* Eine feste Zufallszahl aus dem Ort. Ein Meteorit, der bei jedem Bild anders zersplittert,
     flackert; einer, der seinen Ort als Keim nimmt, steht still und sieht trotzdem nicht aus wie
     sein Nachbar. */
  warteKeim(ob) { const v = Math.sin(ob.x * 12.9898 + ob.y * 78.233) * 43758.5453; return v - Math.floor(v); },

  /* ================= Der Meteorit (Prellklotz) =================
     Ein Bruchstück, das hier heruntergekommen ist und halb in der Terrasse steckt. In seinen
     Rissen glüht es noch – und beim Treffer schlagen die Funken genau dort heraus. Damit erklärt
     der Stein, was er tut: Er gibt zurück, was in ihm steckt. */
  drawMeteoritFloor(ctx, ob, t) {
    const alter = performance.now() / 1000 - ob.hitAt;
    // Der Einschlag: eine versengte Mulde, dunkler als der Boden, mit hellem Rand
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.r + 0.5, 'rgba(18,14,34,0.45)');
    this.isoEllipse(ctx, ob.x, ob.y, 0.005, ob.r + 0.22, 'rgba(58,44,80,0.5)');
    if (alter < 0.7) {
      const u = alter / 0.7;
      this.isoEllipse(ctx, ob.x, ob.y, 0.006, (ob.r + 0.2) * (1 + u * 0.9), `rgba(255,190,90,${0.4 * (1 - u)})`);
    }
  },

  drawMeteorit(ctx, ob, t) {
    const s = this.scale;
    const alter = performance.now() / 1000 - ob.hitAt;
    const gluehen = Math.min(1, Math.max(0, 1 - alter * 1.6));
    const keim = this.warteKeim(ob);
    const [cx, cy] = this.proj(ob.x, ob.y, 0);
    const [, obenPx] = this.proj(ob.x, ob.y, ob.r * 1.9);
    const hPx = Math.max(s * 0.4, cy - obenPx);
    const bPx = ob.r * s * 1.05;

    // Ein paar Splitter ringsum: der Stein ist nicht allein heruntergekommen
    ctx.fillStyle = '#3a3050';
    for (let i = 0; i < 4; i++) {
      const a = keim * 6.28 + i * 1.7, rr = ob.r * (1.2 + 0.35 * ((i * 7 % 5) / 5));
      const [px, py] = this.proj(ob.x + Math.cos(a) * rr, ob.y + Math.sin(a) * rr, 0.02);
      ctx.beginPath();
      ctx.moveTo(px - s * 0.09, py); ctx.lineTo(px, py - s * 0.07);
      ctx.lineTo(px + s * 0.1, py + s * 0.02); ctx.lineTo(px, py + s * 0.05);
      ctx.closePath(); ctx.fill();
    }

    /* Der Brocken, im Bildraum aus neun Ecken gebaut. Ein Kreis wäre ein Ball, ein Rechteck eine
       Kiste – ein Stein ist beides nicht, und darum bekommt jede Ecke ihren eigenen Halbmesser. */
    const ecken = [];
    for (let i = 0; i < 9; i++) {
      const a = -Math.PI / 2 + (i / 9) * TAU;
      const zack = 0.72 + 0.34 * ((Math.sin(i * 12.3 + keim * 30) + 1) / 2);
      ecken.push([cx + Math.cos(a) * bPx * zack, cy - hPx * 0.42 + Math.sin(a) * hPx * 0.62 * zack]);
    }
    const form = () => {
      ctx.beginPath();
      ctx.moveTo(ecken[0][0], ecken[0][1]);
      for (let i = 1; i < ecken.length; i++) ctx.lineTo(ecken[i][0], ecken[i][1]);
      ctx.closePath();
    };
    const g = ctx.createLinearGradient(cx - bPx, cy - hPx, cx + bPx, cy);
    g.addColorStop(0, '#5e5280'); g.addColorStop(0.5, '#3c3358'); g.addColorStop(1, '#221c38');
    form(); ctx.fillStyle = g; ctx.fill();

    ctx.save(); form(); ctx.clip();
    // Facetten: zwei helle Bruchflächen oben, eine dunkle unten. Ein Stein ohne Bruchflächen ist ein Kiesel.
    ctx.fillStyle = 'rgba(150,134,200,0.3)';
    ctx.beginPath();
    ctx.moveTo(ecken[7][0], ecken[7][1]); ctx.lineTo(ecken[0][0], ecken[0][1]);
    ctx.lineTo(ecken[1][0], ecken[1][1]); ctx.lineTo(cx - bPx * 0.1, cy - hPx * 0.42);
    ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(10,8,22,0.4)';
    ctx.beginPath();
    ctx.moveTo(ecken[3][0], ecken[3][1]); ctx.lineTo(ecken[4][0], ecken[4][1]);
    ctx.lineTo(ecken[5][0], ecken[5][1]); ctx.lineTo(cx, cy - hPx * 0.3);
    ctx.closePath(); ctx.fill();

    /* Die Risse. Sie glühen immer ein wenig und beim Treffer hell auf – das ist die ganze Ansage
       des Prellklotzes: Da steckt etwas drin, das gleich herauskommt. */
    const hitze = 0.35 + 0.15 * Math.sin(t * 2 + keim * 6) + gluehen * 0.65;
    ctx.lineCap = 'round';
    for (const [x0, y0, x1, y1, x2, y2] of [
      [-0.7, -0.1, -0.1, -0.5, 0.5, -0.2],
      [-0.2, 0.4, 0.1, -0.15, 0.7, -0.45],
      [0.1, 0.5, 0.3, 0.05, 0.2, -0.6],
    ]) {
      const P = (ux, uy) => [cx + ux * bPx, cy - hPx * 0.42 + uy * hPx * 0.62];
      const a = P(x0, y0), b = P(x1, y1), c = P(x2, y2);
      ctx.strokeStyle = `rgba(255,150,50,${0.25 * hitze})`; ctx.lineWidth = Math.max(3, s * 0.13);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
      ctx.strokeStyle = `rgba(255,225,150,${0.5 + 0.5 * hitze})`; ctx.lineWidth = Math.max(1.2, s * 0.045);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.lineTo(c[0], c[1]); ctx.stroke();
    }
    ctx.restore();
    form(); ctx.strokeStyle = 'rgba(12,8,24,0.75)'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.stroke();

    if (alter < 0.7) {   // beim Treffer springen Funken aus den Rissen
      const u = alter / 0.7;
      for (let i = 0; i < 9; i++) {
        const a = i * (TAU / 9) + keim * 6;
        const weit = u * s * 2.2;
        const px = cx + Math.cos(a) * weit, py = cy - hPx * 0.42 + Math.sin(a) * weit * 0.6 - u * s + u * u * s * 2;
        ctx.fillStyle = `rgba(255,${Math.round(200 - 80 * u)},110,${1 - u})`;
        ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * 0.055 * (1 - u * 0.5)), 0, TAU); ctx.fill();
      }
    }
  },

  /* ================= Der große Tubus (Fernrohr) =================
     Statt eines brennenden Auges auf einem Wehrturm steht hier ein Messingfernrohr auf einer
     Gabelmontierung. Es schwenkt, und sein Licht fällt als Kegel auf die Terrasse – dieselbe
     Wirkung, aber man sieht jetzt, WOHER sie kommt und dass sie von einem Gerät kommt.

     Der Strahl am Boden bleibt, wie er war: Er ist die eigentliche Ansage, und er hing schon
     immer an dieser Stelle. */
  drawTubus(ctx, ob, t) {
    const s = this.scale, r = ob.r;
    const wach = ob.alert || 0;
    const ca = Math.cos(ob.dir), sa = Math.sin(ob.dir);

    this.isoEllipse(ctx, ob.x, ob.y, 0.004, r * 1.6, 'rgba(0,0,0,0.3)');
    // Der Sockel: drei Stufen aus Stein, damit das Gerät nicht auf dem Boden klebt
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 1.3, 10), 0, 0.22, '#5a5476', '#2a2640', { outline: '#14111f' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 1.05, 10), 0.22, 0.26, '#4e4868', '#231f36', { outline: '#14111f' });
    // Die Säule und die Gabel, in die der Tubus eingehängt ist
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 0.42, 8), 0.48, 0.9, '#c8a24a', '#6d5320', { outline: '#3d2f10' });
    const gabelH = 1.38;
    for (const sd of [-1, 1]) {
      const gx = ob.x - sa * sd * r * 0.62, gy = ob.y + ca * sd * r * 0.62;
      this.prism(ctx, this.circlePoly(gx, gy, r * 0.16, 6), 1.28, 0.55, '#d8b054', '#7a5c24', { outline: '#3d2f10' });
    }

    /* Der Tubus. Er wird als dicker Strich vom hinteren Ende zum vorderen gezeichnet – die
       Schrägsicht besorgt die Richtung von selbst, und weil beide Enden ihre eigene Höhe haben,
       neigt er sich sichtbar zur Terrasse hinunter. */
    const hinten = this.proj(ob.x - ca * r * 0.75, ob.y - sa * r * 0.75, gabelH + 0.5);
    const vorn = this.proj(ob.x + ca * r * 1.7, ob.y + sa * r * 1.7, gabelH - 0.25);
    const dick = Math.max(4, s * r * 0.44);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#4a3a12'; ctx.lineWidth = dick + Math.max(2, s * 0.07);
    ctx.beginPath(); ctx.moveTo(hinten[0], hinten[1]); ctx.lineTo(vorn[0], vorn[1]); ctx.stroke();
    const tg = ctx.createLinearGradient(hinten[0], hinten[1] - dick / 2, hinten[0], hinten[1] + dick / 2);
    tg.addColorStop(0, '#f0d488'); tg.addColorStop(0.45, '#c8a24a'); tg.addColorStop(1, '#7a5c24');
    ctx.strokeStyle = tg; ctx.lineWidth = dick;
    ctx.beginPath(); ctx.moveTo(hinten[0], hinten[1]); ctx.lineTo(vorn[0], vorn[1]); ctx.stroke();
    // Zwei Ringe auf dem Rohr: daran sieht man, dass es ein Rohr ist und keine Stange
    ctx.strokeStyle = 'rgba(70,52,16,0.7)'; ctx.lineWidth = Math.max(1.5, s * 0.05);
    for (const u of [0.34, 0.66]) {
      const mx = hinten[0] + (vorn[0] - hinten[0]) * u, my = hinten[1] + (vorn[1] - hinten[1]) * u;
      const nx = -(vorn[1] - hinten[1]), ny = vorn[0] - hinten[0];
      const nl = Math.hypot(nx, ny) || 1;
      ctx.beginPath();
      ctx.moveTo(mx + (nx / nl) * dick * 0.5, my + (ny / nl) * dick * 0.5);
      ctx.lineTo(mx - (nx / nl) * dick * 0.5, my - (ny / nl) * dick * 0.5);
      ctx.stroke();
    }
    // Die Öffnung vorn – sie leuchtet stärker, je näher das Gerät daran ist, jemanden zu fassen
    const fl = 0.75 + 0.25 * Math.sin(t * 6);
    ctx.fillStyle = `rgba(255,${Math.round(210 - 90 * wach)},${Math.round(130 - 90 * wach)},${(0.35 + 0.5 * wach) * fl})`;
    ctx.beginPath(); ctx.arc(vorn[0], vorn[1], dick * (0.9 + 0.5 * wach), 0, TAU); ctx.fill();
    ctx.fillStyle = '#efe0b4';
    ctx.beginPath(); ctx.arc(vorn[0], vorn[1], dick * 0.46, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#7a5c24'; ctx.lineWidth = Math.max(1.2, s * 0.04); ctx.stroke();
    // Das Sucherfernrohr obendrauf: der kleine Zusatz, an dem man ein echtes Gerät erkennt
    const s0 = this.proj(ob.x - ca * r * 0.3, ob.y - sa * r * 0.3, gabelH + 0.85);
    const s1 = this.proj(ob.x + ca * r * 0.8, ob.y + sa * r * 0.8, gabelH + 0.6);
    ctx.strokeStyle = '#d8b054'; ctx.lineWidth = Math.max(2, dick * 0.28);
    ctx.beginPath(); ctx.moveTo(s0[0], s0[1]); ctx.lineTo(s1[0], s1[1]); ctx.stroke();
  },

  /* ================= Das Foucault-Pendel =================
     Eine Kugel an einem langen Draht, und darunter der Kreis mit der Gradteilung, an dem man
     abliest, wo sie gerade steht. Das echte Foucault-Pendel wandert im Lauf des Tages um diesen
     Kreis herum – hier ist es der Beweis, dass die Terrasse zu einer Sternwarte gehört und nicht
     zu einer Uhr. */
  drawFoucaultFloor(ctx, ob, t) {
    const s = this.scale;
    const [ax, ay] = [ob.ax, ob.ay];
    // Der Teilkreis unter dem Pendel: so weit, wie die Kugel reicht
    const [cx, cy] = this.proj(ax, ay, 0.004);
    ctx.strokeStyle = 'rgba(200,162,74,0.35)'; ctx.lineWidth = Math.max(1, s * 0.035);
    ctx.beginPath(); ctx.ellipse(cx, cy, ob.len * s, ob.len * s * this.cam.tilt, 0, 0, TAU); ctx.stroke();
    /* Die Stifte am Rand – beim echten Pendel wirft es sie der Reihe nach um. Die beiden an den
       Umkehrpunkten liegen, die anderen stehen: Daran sieht man von oben, wie weit es ausschlägt. */
    const um = [ob.ruheR - ob.ampR, ob.ruheR + ob.ampR];
    for (let i = 0; i < 24; i++) {
      const a = (i / 24) * TAU;
      const nah = um.some(u => Math.abs(Math.atan2(Math.sin(a - u), Math.cos(a - u))) < 0.16);
      const [px, py] = this.proj(ax + Math.cos(a) * ob.len, ay + Math.sin(a) * ob.len, 0.006);
      ctx.fillStyle = nah ? 'rgba(255,224,150,0.9)' : 'rgba(150,140,190,0.45)';
      ctx.beginPath();
      ctx.ellipse(px, py, s * (nah ? 0.07 : 0.045), s * (nah ? 0.05 : 0.03), 0, 0, TAU);
      ctx.fill();
    }
    // Der Schatten der Kugel: er sagt, wo sie JETZT steht
    this.isoEllipse(ctx, ob.x, ob.y, 0.008, ob.w * 0.42, 'rgba(0,0,0,0.3)');
  },

  drawFoucault(ctx, ob, t) {
    const s = this.scale;
    const hoehe = ob.hoehe == null ? 0.8 : ob.hoehe;
    const AUF = 4.6;                                   // so hoch hängt der Draht
    const [kx, ky] = this.proj(ob.x, ob.y, hoehe + 0.4);
    const [ax, ay] = this.proj(ob.ax, ob.ay, AUF);
    // Der Draht. Dünn und hell – ein dicker Draht sähe aus wie eine Stange, und eine Stange schiebt.
    ctx.strokeStyle = 'rgba(226,216,255,0.5)'; ctx.lineWidth = Math.max(1, s * 0.025);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(kx, ky); ctx.stroke();
    // Die Aufhängung oben: ein Messingauge, das im Dunkeln hängt
    ctx.fillStyle = '#c8a24a'; ctx.beginPath(); ctx.arc(ax, ay, s * 0.09, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#6d5320'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();

    /* Die Linse: eine Messingkugel mit einer Spitze nach unten. Die Spitze ist nicht Zierde –
       an ihr liest man ab, welchen Stift das Pendel als Nächstes umwirft. */
    const R = s * ob.w * 0.44;
    const g = ctx.createRadialGradient(kx - R * 0.4, ky - R * 0.45, R * 0.1, kx, ky, R * 1.2);
    g.addColorStop(0, '#ffeeb8'); g.addColorStop(0.45, '#d8b054'); g.addColorStop(1, '#6d5320');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(kx, ky, R, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(46,34,10,0.8)'; ctx.lineWidth = Math.max(1.2, s * 0.04); ctx.stroke();
    ctx.fillStyle = 'rgba(255,248,214,0.75)';
    ctx.beginPath(); ctx.ellipse(kx - R * 0.35, ky - R * 0.4, R * 0.3, R * 0.2, -0.6, 0, TAU); ctx.fill();
    ctx.fillStyle = '#c8a24a';
    ctx.beginPath();
    ctx.moveTo(kx - R * 0.3, ky + R * 0.75); ctx.lineTo(kx, ky + R * 1.75);
    ctx.lineTo(kx + R * 0.3, ky + R * 0.75); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(46,34,10,0.7)'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    // Ein heller Wisch in Schwungrichtung: an den Umkehrpunkten verschwindet er
    const schwung = ob.schwung == null ? 1 : ob.schwung;
    if (schwung > 0.15) {
      const vx = -Math.sin(ob.angle) * ob.dir, vy = Math.cos(ob.angle) * ob.dir;
      const [wx, wy] = this.proj(ob.x - vx * 0.55 * schwung, ob.y - vy * 0.55 * schwung, hoehe + 0.4);
      ctx.strokeStyle = `rgba(255,236,180,${0.3 * schwung})`; ctx.lineWidth = R * 1.3; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(kx, ky); ctx.stroke();
    }
  },

  /* ================= Die Meridianschiene (Zahnradfeld) =================
     Ein Messingband mit Gradteilung, auf dem ein Schlitten läuft. Er nimmt mit, was auf ihm
     liegt – dieselbe Wirkung wie das Zahnradfeld, nur sieht man hier die STRECKE: Die Schiene
     liegt fest am Boden, und man erkennt vor dem Schlag, wie weit der Schlitten fährt. */
  drawMeridianFloor(ctx, ob, t) {
    const s = this.scale;
    const dx = ob.x1 - ob.x0, dy = ob.y1 - ob.y0, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const br = 0.62;
    const poly = [
      [ob.x0 + nx * br - ux * br, ob.y0 + ny * br - uy * br],
      [ob.x1 + nx * br + ux * br, ob.y1 + ny * br + uy * br],
      [ob.x1 - nx * br + ux * br, ob.y1 - ny * br + uy * br],
      [ob.x0 - nx * br - ux * br, ob.y0 - ny * br - uy * br],
    ];
    this.fillPoly(ctx, poly, 0.004, 'rgba(120,96,40,0.38)', false);
    ctx.strokeStyle = 'rgba(216,176,84,0.6)'; ctx.lineWidth = Math.max(1.2, s * 0.04);
    this.pathPoly(ctx, poly, 0.006); ctx.stroke();
    /* Die Gradteilung: alle halbe Kachel ein Strich, jeder vierte lang. Sie ist der Grund, warum
       hier eine Schiene liegt und keine Leiste – man kann etwas an ihr ablesen. */
    ctx.strokeStyle = 'rgba(240,212,136,0.55)';
    for (let k = 0; k * 0.5 <= L; k++) {
      const d = k * 0.5, lang = k % 4 === 0 ? 0.5 : 0.28;
      const bx = ob.x0 + ux * d, by = ob.y0 + uy * d;
      const p0 = this.proj(bx + nx * br * 0.95, by + ny * br * 0.95, 0.008);
      const p1 = this.proj(bx + nx * br * (0.95 - lang), by + ny * br * (0.95 - lang), 0.008);
      ctx.lineWidth = Math.max(1, s * (k % 4 === 0 ? 0.04 : 0.025));
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    }
    // Die beiden Endanschläge
    for (const [ex, ey] of [[ob.x0, ob.y0], [ob.x1, ob.y1]]) {
      this.isoEllipse(ctx, ex, ey, 0.01, 0.3, 'rgba(240,212,136,0.5)');
      this.isoEllipse(ctx, ex, ey, 0.012, 0.16, 'rgba(60,44,14,0.8)');
    }
  },

  drawMeridian(ctx, ob, t) {
    const s = this.scale;
    const dx = ob.x1 - ob.x0, dy = ob.y1 - ob.y0, L = Math.hypot(dx, dy) || 1;
    const ux = dx / L, uy = dy / L, nx = -uy, ny = ux;
    const w = (ob.w || 1.5) / 2, h = (ob.h || 1.5) / 2;
    const quer = Math.max(w, h) * 0.86, laengs = Math.max(w, h) * 0.7;
    const platte = [
      [ob.x + nx * quer + ux * laengs, ob.y + ny * quer + uy * laengs],
      [ob.x - nx * quer + ux * laengs, ob.y - ny * quer + uy * laengs],
      [ob.x - nx * quer - ux * laengs, ob.y - ny * quer - uy * laengs],
      [ob.x + nx * quer - ux * laengs, ob.y + ny * quer - uy * laengs],
    ];
    // Die Rollen unter dem Schlitten, an beiden Enden
    for (const sd of [-1, 1]) {
      const rx = ob.x + ux * sd * laengs * 0.72, ry = ob.y + uy * sd * laengs * 0.72;
      this.prism(ctx, this.circlePoly(rx, ry, 0.19, 8), 0.02, 0.16, '#8a6c2c', '#4a3712', { outline: '#2c2008' });
    }
    // Der Schlitten selbst: die Fläche, auf der der Ball sitzt (tragHoehe 0,37)
    this.prism(ctx, platte, 0.18, (ob.tragHoehe || 0.37) - 0.18, '#d8b054', '#7a5c24', { outline: '#3d2f10' });
    /* Der Stern auf dem Deckel. Er dreht sich mit der Fahrt (ob.winkel) – ohne ihn sähe der
       Schlitten im Stillstand genauso aus wie in voller Fahrt. */
    const [cx, cy] = this.proj(ob.x, ob.y, (ob.tragHoehe || 0.37) + 0.005);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt);
    const R = s * quer * 0.72;
    ctx.fillStyle = 'rgba(60,44,14,0.5)';
    ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    ctx.fillStyle = '#f4e2ac';
    ctx.beginPath();
    for (let k = 0; k < 16; k++) {
      const a = -Math.PI / 2 + k * (Math.PI / 8) + (ob.winkel || 0);
      const rr = k % 2 ? R * 0.32 : R * 0.82;
      const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
      k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(60,44,14,0.7)'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
    ctx.restore();
  },

  /* ================= Der Spiralnebel (Nebelwirbel) =================
     Kein Wasserstrudel, sondern ein Nebel: zwei Arme aus Sternenstaub, die sich drehen, und
     Sterne, die nach innen wandern. Die Richtung der Arme sagt, wohin es zieht, und je näher die
     Sterne dem Kern kommen, desto schneller laufen sie – daran liest man die Stärke ab. */
  drawSpiralnebelFloor(ctx, ob, t) {
    const s = this.scale, R = ob.r || 2.4, dreh = ob.dreh || 1;
    const [cx, cy] = this.proj(ob.x, ob.y, 0.008);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt);
    // Der Nebel selbst: ein weicher Fleck, der nach außen ausläuft
    const g = ctx.createRadialGradient(0, 0, R * s * 0.06, 0, 0, R * s);
    g.addColorStop(0, 'rgba(226,214,255,0.5)');
    g.addColorStop(0.35, 'rgba(150,120,235,0.26)');
    g.addColorStop(1, 'rgba(90,70,180,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * s, 0, TAU); ctx.fill();
    /* Zwei Arme. Zwei, nicht drei: Ein Spiralnebel hat zwei, und man erkennt an zweien besser,
       in welche Richtung sich das Ganze dreht. */
    for (let arm = 0; arm < 2; arm++) {
      ctx.beginPath();
      for (let i = 0; i <= 28; i++) {
        const u = i / 28;
        const rad = R * s * (0.1 + u * 0.92);
        const a = arm * Math.PI + t * dreh * 0.5 + u * 2.6 * dreh;
        const px = Math.cos(a) * rad, py = Math.sin(a) * rad;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.strokeStyle = 'rgba(214,200,255,0.3)';
      ctx.lineWidth = Math.max(2, s * 0.22); ctx.lineCap = 'round'; ctx.stroke();
      ctx.strokeStyle = 'rgba(248,244,255,0.5)';
      ctx.lineWidth = Math.max(1, s * 0.07); ctx.stroke();
    }
    // Der Kern
    ctx.fillStyle = 'rgba(255,250,230,0.85)';
    ctx.beginPath(); ctx.arc(0, 0, Math.max(2, s * 0.16), 0, TAU); ctx.fill();
    ctx.restore();
    /* Sterne, die nach innen wandern – innen schneller. Sie sind das, was der Spieler wirklich
       abliest: Der Sog ist dort am stärksten, wo sie am schnellsten laufen. */
    for (let i = 0; i < 22; i++) {
      const u = 1 - ((t * 0.3 + i / 22) % 1);
      const rad = R * (0.08 + u * u * 0.92);
      const a = i * 2.39996 + t * dreh * (0.5 + 0.9 * (1 - u));
      const [px, py] = this.proj(ob.x + Math.cos(a) * rad, ob.y + Math.sin(a) * rad, 0.012);
      ctx.fillStyle = `rgba(255,252,240,${0.35 + 0.55 * (1 - u)})`;
      ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * (0.03 + 0.03 * (1 - u))), 0, TAU); ctx.fill();
    }
  },

  /* ================= Die Planetariumskulisse (Wandelgang) =================
     Zwei Messingblenden, die gegeneinander fahren; der Spalt dazwischen wandert. Vorher war es
     eine Mauer mit einem Loch und zwei goldenen Pfosten – jetzt ist es ein Gerät, und man sieht
     an der Führungsschiene am Boden, wie weit es fahren kann. */
  drawKulisseFloor(ctx, ob, t) {
    const s = this.scale;
    const nx = -ob.uy * (ob.t + 0.5) / 2, ny = ob.ux * (ob.t + 0.5) / 2;
    const poly = [
      [ob.x0 + nx, ob.y0 + ny], [ob.x1 + nx, ob.y1 + ny],
      [ob.x1 - nx, ob.y1 - ny], [ob.x0 - nx, ob.y0 - ny],
    ];
    this.fillPoly(ctx, poly, 0.003, 'rgba(120,96,40,0.3)', false);
    ctx.strokeStyle = 'rgba(216,176,84,0.45)'; ctx.lineWidth = Math.max(1, s * 0.035);
    this.pathPoly(ctx, poly, 0.005); ctx.stroke();
    // Der helle Fleck im Spalt: hier kommt man gerade hindurch
    const g = ob.gap / 2;
    const durch = [
      [ob.gx + ob.ux * g + nx, ob.gy + ob.uy * g + ny], [ob.gx - ob.ux * g + nx, ob.gy - ob.uy * g + ny],
      [ob.gx - ob.ux * g - nx, ob.gy - ob.uy * g - ny], [ob.gx + ob.ux * g - nx, ob.gy + ob.uy * g - ny],
    ];
    this.fillPoly(ctx, durch, 0.006, 'rgba(180,255,210,0.28)', false);
  },

  /* Ein Stück Blende. Gezeichnet wird es wie eine Mauer, aber in Messing und mit senkrechten
     Rillen – und die Kante zum Spalt hin bekommt eine helle Lippe, damit man sieht, wo sie
     aufhört und der Weg anfängt. */
  drawKulisseStueck(ctx, poly, ob, kante) {
    const s = this.scale;
    this.prism(ctx, poly, 0, ob.h, '#c8a24a', '#6d5320', { outline: '#3a2c0e' });
    this.prism(ctx, poly, ob.h, 0.12, '#f0d488', '#8a6c2c', { outline: '#3a2c0e' });
    if (kante) {
      const [kx, ky] = this.proj(kante[0], kante[1], 0);
      const [, ko] = this.proj(kante[0], kante[1], ob.h + 0.12);
      ctx.strokeStyle = 'rgba(255,238,180,0.85)'; ctx.lineWidth = Math.max(2, s * 0.07); ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(kx, ko); ctx.stroke();
    }
  },
});
