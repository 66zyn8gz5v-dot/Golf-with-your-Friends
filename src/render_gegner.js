/* Die drei Endgegner des Zauberreichs.

   SIE MÜSSEN AUS DER ÜBERSICHT HERAUS ZU ERKENNEN SEIN. Eine Bahn, auf der ein Endgegner steht,
   soll man beim ersten Blick von den neun anderen unterscheiden können – und zwar nicht am Namen,
   sondern daran, daß dort etwas steht, das viel größer ist als alles, was man bisher gesehen hat.
   Deshalb sind alle drei um ein Vielfaches größer gezeichnet als die gewöhnlichen Maschinen und
   tragen jeweils eine Farbe, die es sonst in ihrer Welt nicht gibt.

   UND SIE ZEIGEN IHREN ZUSTAND, BEVOR ER EINTRITT. Das ist bei einem Gegner wichtiger als bei
   allem anderen: Wer verliert, soll wissen, warum – und beim nächsten Mal sehen, was er hätte
   anders machen können. Die Blüte glüht, bevor sie zuschlägt; die Sphäre zeigt ihre Gassen; der
   Wächter läßt das Siegel unter seinem Arm aufglühen, ehe er schlägt. */

Object.assign(Renderer.prototype, {

  /* ================= Die Riesenblüte (Lehrlingsgarten) ================= */
  drawRiesenblueteFloor(ctx, ob, t) {
    const s = this.scale;
    const [cx, cy] = this.proj(ob.x, ob.y, 0.004);
    const warn = ob.warnung || 0;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt);
    const R = ob.r * s;
    // Der Kelchboden: ein warmer Teller, der zum Rand hin dunkler wird
    const boden = ctx.createRadialGradient(0, 0, R * 0.1, 0, 0, R);
    boden.addColorStop(0, '#f6e6a8'); boden.addColorStop(0.7, '#e0b95e'); boden.addColorStop(1, '#a97d2c');
    ctx.fillStyle = boden; ctx.beginPath(); ctx.arc(0, 0, R * 0.97, 0, TAU); ctx.fill();
    // Die Samenspirale – sie macht aus dem Teller eine Blüte
    ctx.fillStyle = 'rgba(96,62,16,0.5)';
    for (let i = 0; i < 90; i++) {
      const a = i * 2.399963, rr = R * 0.93 * Math.sqrt(i / 90);
      ctx.beginPath(); ctx.arc(Math.cos(a) * rr, Math.sin(a) * rr, Math.max(1, s * 0.055), 0, TAU); ctx.fill();
    }
    /* Die Vorwarnung: In der letzten Sekunde, bevor die Blätter zugehen, glüht der Kelch auf und
       pulst schneller. Ohne sie wäre der Pollenstoß eine Gemeinheit statt einer Aufgabe. */
    if (warn > 0.01) {
      const puls = 0.5 + 0.5 * Math.sin(t * (6 + 14 * warn));
      const hof = ctx.createRadialGradient(0, 0, 0, 0, 0, R);
      hof.addColorStop(0, `rgba(255,${Math.round(210 - 90 * warn)},90,${0.45 * warn * puls})`);
      hof.addColorStop(1, 'rgba(255,170,60,0)');
      ctx.fillStyle = hof; ctx.beginPath(); ctx.arc(0, 0, R, 0, TAU); ctx.fill();
    }
    ctx.restore();
  },

  drawRiesenbluete(ctx, ob, t) {
    const s = this.scale;
    const warn = ob.warnung || 0, stoss = ob.stoss || 0;
    this.isoEllipse(ctx, ob.x, ob.y, 0.003, ob.r * 1.15, 'rgba(0,0,0,0.26)');
    /* Die Blätter stehen hoch, wenn die Blüte zu ist, und legen sich flach, wenn sie offen ist.
       Damit sagt die Höhe dasselbe wie die Lücke – man liest den Zustand auch dann noch ab, wenn
       die Blüte am Bildrand klein geworden ist. */
    const hoch = 0.35 + 1.75 * (1 - ob.offen);
    for (let k = 0; k < ob.blaetter; k++) {
      const [a0, a1] = ob.bogen(k);
      const n = 6, aussen = [], innen = [];
      for (let i = 0; i <= n; i++) {
        const a = a0 + (a1 - a0) * (i / n);
        // Das Blatt ist in der Mitte breiter als an den Enden – so wird aus dem Bogenstück ein Blatt
        const bauch = ob.dicke * (0.55 + 0.85 * Math.sin(Math.PI * (i / n)));
        aussen.push([ob.x + Math.cos(a) * (ob.r + bauch), ob.y + Math.sin(a) * (ob.r + bauch)]);
        innen.push([ob.x + Math.cos(a) * (ob.r - bauch), ob.y + Math.sin(a) * (ob.r - bauch)]);
      }
      const poly = aussen.concat(innen.reverse());
      const warm = warn > 0.01 || stoss > 0.01;
      const deck = warm ? '#ffd27a' : '#f3a0c8';
      const seite = warm ? '#c9821f' : '#b4507e';
      this.prism(ctx, poly, 0, hoch, deck, seite, { outline: '#6d2b4c' });
      /* Die Spitze. Ohne sie war der geschlossene Ring ein Kübel und keine Blüte – der Umriß muß
         nach außen auslaufen, sonst liest man einen Zylinder. Offen legt sie sich weiter nach
         außen, geschlossen richtet sie sich auf: Auch die Silhouette sagt dann, was gerade gilt. */
      const amS = (a0 + a1) / 2;
      const weit = ob.r + ob.dicke * (1.6 + 2.2 * ob.offen);
      const spitze = this.proj(ob.x + Math.cos(amS) * weit, ob.y + Math.sin(amS) * weit, hoch * (0.95 - 0.5 * ob.offen));
      const lS = this.proj(aussen[1][0], aussen[1][1], hoch);
      const rS = this.proj(aussen[n - 1][0], aussen[n - 1][1], hoch);
      ctx.beginPath();
      ctx.moveTo(lS[0], lS[1]); ctx.lineTo(spitze[0], spitze[1]); ctx.lineTo(rS[0], rS[1]); ctx.closePath();
      ctx.fillStyle = deck; ctx.fill();
      ctx.strokeStyle = '#6d2b4c'; ctx.lineWidth = Math.max(1, s * 0.035); ctx.stroke();
      // Die Mittelrippe: ein heller Strich über den Scheitel des Blattes
      const am = (a0 + a1) / 2;
      const p0 = this.proj(ob.x + Math.cos(am) * (ob.r - ob.dicke), ob.y + Math.sin(am) * (ob.r - ob.dicke), hoch);
      const p1 = this.proj(ob.x + Math.cos(am) * (ob.r + ob.dicke * 1.4), ob.y + Math.sin(am) * (ob.r + ob.dicke * 1.4), hoch);
      ctx.strokeStyle = 'rgba(255,240,245,0.6)'; ctx.lineWidth = Math.max(1, s * 0.05);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
    }
    // Der Pollenstoß: Wolken, die vom Kelch nach außen treiben
    if (stoss > 0.01) {
      for (let i = 0; i < 18; i++) {
        const a = (i / 18) * TAU + t * 0.6;
        const d = ob.r * (0.3 + (1 - stoss) * 1.0);
        const p = this.proj(ob.x + Math.cos(a) * d, ob.y + Math.sin(a) * d, 0.5 + (1 - stoss) * 0.9);
        ctx.fillStyle = `rgba(255,228,140,${(0.55 * stoss).toFixed(3)})`;
        ctx.beginPath(); ctx.arc(p[0], p[1], s * (0.18 + 0.4 * (1 - stoss)), 0, TAU); ctx.fill();
      }
    }
  },

  /* ================= Die Große Armillarsphäre (Sternenwarte) ================= */
  drawArmillarFloor(ctx, ob, t) {
    const s = this.scale;
    const [cx, cy] = this.proj(ob.x, ob.y, 0.004);
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt);
    const gross = Math.max(...ob.ringe.map(r => r.r)) * s;
    // Die Platte, auf der die Sphäre steht, mit einer Gradteilung am Rand
    const p = ctx.createRadialGradient(0, 0, 0, 0, 0, gross * 1.12);
    p.addColorStop(0, 'rgba(120,150,210,0.30)'); p.addColorStop(1, 'rgba(60,72,120,0.05)');
    ctx.fillStyle = p; ctx.beginPath(); ctx.arc(0, 0, gross * 1.12, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(216,176,84,0.45)'; ctx.lineWidth = Math.max(1, s * 0.03);
    for (let k = 0; k < 36; k++) {
      const a = (k / 36) * TAU, lang = k % 3 === 0 ? 0.1 : 0.05;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * gross * 1.12, Math.sin(a) * gross * 1.12);
      ctx.lineTo(Math.cos(a) * gross * (1.12 - lang), Math.sin(a) * gross * (1.12 - lang));
      ctx.stroke();
    }
    ctx.restore();
  },

  drawArmillar(ctx, ob, t) {
    const s = this.scale;
    this.isoEllipse(ctx, ob.x, ob.y, 0.003, Math.max(...ob.ringe.map(r => r.r)) * 1.1, 'rgba(0,0,0,0.24)');
    /* Von innen nach außen zeichnen, damit der äußere Ring den inneren verdeckt und nicht
       umgekehrt – sonst stünde die Sphäre auf dem Kopf. */
    const sortiert = ob.ringe.map((r, i) => [r, ob.stand[i]]).sort((a, b) => a[0].r - b[0].r);
    sortiert.forEach(([ring, stand], nr) => {
      const n = 22, aussen = [], innen = [];
      const a0 = stand + ring.gasse / 2, a1 = stand + TAU - ring.gasse / 2;
      for (let k = 0; k <= n; k++) {
        const a = a0 + (a1 - a0) * (k / n);
        aussen.push([ob.x + Math.cos(a) * (ring.r + ob.dicke), ob.y + Math.sin(a) * (ring.r + ob.dicke)]);
        innen.push([ob.x + Math.cos(a) * (ring.r - ob.dicke), ob.y + Math.sin(a) * (ring.r - ob.dicke)]);
      }
      const hoch = 0.75 + nr * 0.35;          // außen höher: die Sphäre bekommt eine Schale
      this.prism(ctx, aussen.concat(innen.reverse()), 0, hoch, '#e2c072', '#8a6a24', { outline: '#4a3810' });
      // Die beiden Gassenkanten bekommen einen hellen Pfosten – daran sieht man, wo die Lücke ist
      for (const a of [a0, a1]) {
        const px = ob.x + Math.cos(a) * ring.r, py = ob.y + Math.sin(a) * ring.r;
        this.prism(ctx, this.circlePoly(px, py, ob.dicke * 1.25, 6), 0, hoch + 0.3, '#fff0b8', '#a8842a', { outline: '#4a3810' });
      }
    });
  },

  /* ================= Der Bannwächter (Erzmagierloge) ================= */
  drawBannwaechterFloor(ctx, ob, t) {
    const s = this.scale;
    const gl = ob.gluehen || 0;
    if (gl <= 0.01) return;
    /* Der Keil, in den er gleich schlägt. Er steht als Fläche auf dem Boden und wird heller, je
       näher der Schlag kommt - und weiß, wenn er trifft. Das ist die einzige Vorwarnung; sie muß
       darum aus jedem Blickwinkel lesbar sein, auch schräg von hinten. */
    const treffer = ob.zustand === 'schlaegt';
    ctx.beginPath();
    const p0 = this.proj(ob.x, ob.y, 0.006);
    ctx.moveTo(p0[0], p0[1]);
    for (let i = 0; i <= 12; i++) {
      const a = ob.winkel - ob.keil + (2 * ob.keil) * (i / 12);
      const p = this.proj(ob.x + Math.cos(a) * ob.weite, ob.y + Math.sin(a) * ob.weite, 0.006);
      ctx.lineTo(p[0], p[1]);
    }
    ctx.closePath();
    ctx.fillStyle = treffer ? 'rgba(255,240,255,0.55)' : `rgba(178,110,255,${(0.14 + 0.3 * gl).toFixed(3)})`;
    ctx.fill();
    ctx.strokeStyle = treffer ? 'rgba(255,255,255,0.9)' : `rgba(214,160,255,${(0.35 + 0.5 * gl).toFixed(3)})`;
    ctx.lineWidth = Math.max(1.5, s * 0.06); ctx.stroke();
    // Drei Siegel im Keil, die von innen nach außen zünden
    for (let i = 1; i <= 3; i++) {
      const d = ob.weite * (i / 3.4);
      this.bannsiegel(ctx, ob.x + Math.cos(ob.winkel) * d, ob.y + Math.sin(ob.winkel) * d, 0.008,
        0.55, treffer ? 1 : gl * 0.8, t * 0.4 + i);
    }
  },

  drawBannwaechter(ctx, ob, t) {
    const s = this.scale, r = ob.r;
    const gl = ob.gluehen || 0;
    const treffer = ob.zustand === 'schlaegt';
    const ca = Math.cos(ob.winkel), sa = Math.sin(ob.winkel);

    this.isoEllipse(ctx, ob.x, ob.y, 0.004, r * 2.0, 'rgba(0,0,0,0.34)');
    this.bannsiegel(ctx, ob.x, ob.y, 0.006, r * 1.8, 0.2 + 0.7 * gl, t * 0.14);
    // Der Unterbau: drei Stufen schwarzer Marmor. Er ist absichtlich breit - der Wächter soll
    // schwer aussehen, nicht behende.
/* ER MUSS HOCH SEIN. In der ersten Fassung reichte er bis z = 3,6 und sah aus wie ein
       vergoldeter Geschützturm – in dieser Schrägsicht staucht die Höhe, und was am Boden breit
       ist, wirkt dann gedrungen. Jetzt ist der Sockel schmaler als vorher und der Leib doppelt so
       hoch; erst dadurch steht dort jemand und nicht etwas. */
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 1.5, 12), 0, 0.5, '#2e2740', '#15111f', { outline: '#0a0813' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 1.15, 12), 0.5, 0.45, '#382f4e', '#1a1527', { outline: '#0a0813' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 1.25, 8), 0.95, 0.17, '#d8b054', '#7a5c24', { outline: '#3d2f10' });
    // Der Leib: eine sich verjüngende Säule aus zwei Stücken
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 0.8, 10), 1.12, 2.5, '#453a5e', '#201a30', { outline: '#0a0813' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 0.62, 10), 3.62, 1.4, '#4e4269', '#241d36', { outline: '#0a0813' });
    // Die Schultern, aus denen der Arm kommt
    this.prism(ctx, this.circlePoly(ob.x, ob.y, r * 0.95, 8), 5.02, 0.36, '#d8b054', '#7a5c24', { outline: '#3d2f10' });

    /* Der Arm. Er ist ein langer Goldbalken, der in die Richtung zeigt, in die der Wächter
       gleich schlägt - und zwar SICHTBAR über die halbe Keillänge hinaus. Ein Arm, der nur am
       Körper klebt, sagt einem nichts; dieser hier zeigt hin. */
    const laenge = Math.min(ob.weite * 0.55, 6.5);
    const a0 = this.proj(ob.x, ob.y, 5.2);
    const a1 = this.proj(ob.x + ca * laenge, ob.y + sa * laenge, 3.4);
    ctx.lineCap = 'round';
    ctx.strokeStyle = '#3d2f10'; ctx.lineWidth = Math.max(5, s * 0.34);
    ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
    const g = ctx.createLinearGradient(a0[0], a0[1] - s * 0.15, a0[0], a0[1] + s * 0.15);
    g.addColorStop(0, '#f6ce78'); g.addColorStop(0.5, '#d8b054'); g.addColorStop(1, '#7a5c24');
    ctx.strokeStyle = g; ctx.lineWidth = Math.max(4, s * 0.27);
    ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
    // Die Faust am Ende, in der das Bannfeuer sitzt
    const feuer = treffer ? 1 : gl;
    const hof = ctx.createRadialGradient(a1[0], a1[1], 0, a1[0], a1[1], s * (0.5 + 0.7 * feuer));
    hof.addColorStop(0, `rgba(${Math.round(214 + 41 * feuer)},${Math.round(160 + 80 * feuer)},255,${0.4 + 0.6 * feuer})`);
    hof.addColorStop(1, 'rgba(150,90,220,0)');
    ctx.fillStyle = hof; ctx.beginPath(); ctx.arc(a1[0], a1[1], s * (0.5 + 0.7 * feuer), 0, TAU); ctx.fill();
    ctx.fillStyle = '#e0bb62'; ctx.beginPath(); ctx.arc(a1[0], a1[1], s * 0.2, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#4a3a12'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.stroke();

    /* Der Kopf: eine Maske aus Gold mit einem Auge, das dasselbe Bannfeuer trägt wie die Faust.
       Er ist das, woran man von weitem erkennt, daß dort jemand steht und nicht etwas. */
    const [kx, ky] = this.proj(ob.x, ob.y, 6.1);
    const kr = s * r * 0.72;
    ctx.beginPath(); ctx.ellipse(kx, ky, kr * 0.82, kr, 0, 0, TAU);
    ctx.fillStyle = '#c8a24a'; ctx.fill();
    ctx.strokeStyle = '#4a3a12'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(kx, ky - kr * 0.1, kr * 0.42, kr * 0.3, 0, 0, TAU);
    ctx.fillStyle = `rgba(${Math.round(190 + 65 * feuer)},${Math.round(120 + 110 * feuer)},255,${0.7 + 0.3 * feuer})`;
    ctx.fill();
    ctx.strokeStyle = '#3a2c0c'; ctx.lineWidth = Math.max(1, s * 0.035); ctx.stroke();
  },
});
