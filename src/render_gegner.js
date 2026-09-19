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

  /* ================= Die Große Armillarsphäre (Sternenwarte) =================
     Sie füllt die ganze Bahn, und sonst steht nichts darauf. Das ist Fynns Entscheidung und die
     richtige: Ein Endgegner, vor dem noch drei andere Maschinen stehen, ist die vierte Aufgabe
     einer Bahn. Einer, der die Bahn IST, ist ein Endgegner.

     JEDER RING HAT SEINE EIGENE WIRKUNG, und sie gilt im Band von ihm bis zum nächsten Ring nach
     innen. Man wechselt die Regel also genau dann, wenn man durch eine Gasse gekommen ist - und
     weil jedes Band die Farbe seiner Wirkung trägt, sieht man vorher, worauf man sich einläßt.
     Die Farben sind dieselben wie bei den Zauberkreisen; wer die kennt, muß hier nichts Neues
     lernen.

     UND SIE LIEGT AUF EINEM GROSSEN BANNKREIS. Der Kreis ist nicht Zierde: Er zieht die Grenze,
     ab der die Sphäre gilt, und er sagt mit seinem Durchmesser, daß dieses Ding die Bahn ist und
     nicht ein Gegenstand darauf. */
  armillarFarbe(wirkung) {
    return ({ schub: [76, 224, 138], bremse: [79, 176, 255], wirbel: [199, 125, 255],
              zug: [255, 209, 102] })[wirkung] || null;
  },

  drawArmillarFloor(ctx, ob, t) {
    const s = this.scale;
    const [cx, cy] = this.proj(ob.x, ob.y, 0.004);
    const gross = Math.max(...ob.ringe.map(r => r.r));
    const R = gross * s * 1.16;
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt);

    /* Der große Bannkreis, auf dem alles steht.

       ER MUSS ZU SEHEN SEIN. In der ersten Fassung war er eine feine Gravur: dünne Linien in
       halbdurchsichtigem Gold auf dunkelblauem Stein, und die vier Ringe warfen ihre Schatten
       darüber. Fynn: „Der magische Zirkel soll besser sichtbar sein." Jetzt liegt unter den Linien
       ein eigener Schein, die Linien selbst sind kräftiger und doppelt gezogen, und alles atmet
       langsam – ein Zirkel, der nicht leuchtet, ist eine Gravur und kein Zauber. */
    const puls = 0.78 + 0.22 * Math.sin(t * 0.9);

    // Der Schein unter allem. Er liegt weit über den äußersten Ring hinaus, damit man den Zirkel
    // auch dort noch sieht, wo die Sphäre ihn nicht mehr überdeckt.
    const hof = ctx.createRadialGradient(0, 0, R * 0.15, 0, 0, R * 1.1);
    hof.addColorStop(0, `rgba(150,180,255,${(0.16 * puls).toFixed(3)})`);
    hof.addColorStop(0.72, `rgba(180,170,255,${(0.20 * puls).toFixed(3)})`);
    hof.addColorStop(0.93, `rgba(255,225,150,${(0.30 * puls).toFixed(3)})`);
    hof.addColorStop(1, 'rgba(255,225,150,0)');
    ctx.fillStyle = hof; ctx.beginPath(); ctx.arc(0, 0, R * 1.1, 0, TAU); ctx.fill();

    /* Die Rillen. Jede wird dreimal gezogen: erst ein breiter weicher Schein, dann die dunkle
       Rille, dann das Gold darin. Der Schein ist das, was sie über den Schatten der Ringe hebt. */
    const rille = (rr, dick) => {
      ctx.strokeStyle = `rgba(255,232,170,${(0.28 * puls).toFixed(3)})`;
      ctx.lineWidth = Math.max(4, s * (dick + 0.22));
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
      ctx.strokeStyle = 'rgba(10,10,26,0.75)';
      ctx.lineWidth = Math.max(2, s * (dick + 0.05));
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
      ctx.strokeStyle = `rgba(255,236,178,${(0.85 * puls + 0.15).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.6, s * dick);
      ctx.beginPath(); ctx.arc(0, 0, rr, 0, TAU); ctx.stroke();
    };
    rille(R, 0.11);
    rille(R * 0.9, 0.07);
    rille(R * 0.2, 0.09);

    /* Der Runenkranz zwischen den beiden äußeren Rillen. Er dreht sich langsam – das ist der
       Unterschied zwischen einem Muster und einem Zauber, der arbeitet. */
    ctx.lineCap = 'round';
    const anzahl = 40;
    for (let k = 0; k < anzahl; k++) {
      const a = (k / anzahl) * TAU + t * 0.035;
      ctx.save();
      ctx.translate(Math.cos(a) * R * 0.95, Math.sin(a) * R * 0.95);
      ctx.rotate(a + Math.PI / 2);
      const g = R * 0.032;
      const rune = k % 4;
      const zeichne = () => {
        ctx.beginPath();
        ctx.moveTo(0, -g); ctx.lineTo(0, g);
        if (rune === 0) { ctx.moveTo(-g * 0.75, -g * 0.45); ctx.lineTo(0, 0); }
        else if (rune === 1) { ctx.moveTo(-g * 0.75, 0); ctx.lineTo(g * 0.75, 0); }
        else if (rune === 2) { ctx.moveTo(-g * 0.65, g); ctx.lineTo(0, g * 0.2); ctx.moveTo(g * 0.65, g); ctx.lineTo(0, g * 0.2); }
        else { ctx.moveTo(-g * 0.75, -g); ctx.lineTo(g * 0.75, -g); }
        ctx.stroke();
      };
      ctx.strokeStyle = `rgba(255,232,170,${(0.3 * puls).toFixed(3)})`;
      ctx.lineWidth = Math.max(3, s * 0.13); zeichne();
      ctx.strokeStyle = `rgba(255,244,205,${(0.9 * puls).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.4, s * 0.05); zeichne();
      ctx.restore();
    }

    // Zwölf Speichen nach außen, damit der Kreis eine Teilung hat – und an jeder ein Sternpunkt
    for (let k = 0; k < 12; k++) {
      const a = (k / 12) * TAU;
      ctx.strokeStyle = `rgba(255,232,170,${(0.45 * puls).toFixed(3)})`;
      ctx.lineWidth = Math.max(1.4, s * 0.05);
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * R * 0.2, Math.sin(a) * R * 0.2);
      ctx.lineTo(Math.cos(a) * R * 0.9, Math.sin(a) * R * 0.9);
      ctx.stroke();
      const fx = Math.cos(a) * R * 0.9, fy = Math.sin(a) * R * 0.9;
      const fk = ctx.createRadialGradient(fx, fy, 0, fx, fy, s * 0.5);
      fk.addColorStop(0, `rgba(255,248,215,${(0.85 * puls).toFixed(3)})`);
      fk.addColorStop(1, 'rgba(255,230,160,0)');
      ctx.fillStyle = fk; ctx.beginPath(); ctx.arc(fx, fy, s * 0.5, 0, TAU); ctx.fill();
    }

    /* Die Bänder der Wirkungen. Jedes liegt zwischen seinem Ring und dem nächsten nach innen und
       trägt dessen Farbe – schwach, damit der Boden nicht zum Teppich wird, aber deutlich genug,
       daß man die Grenze sieht, bevor man sie überrollt. */
    const sortiert = ob.ringe.slice().sort((a, b) => b.r - a.r);
    for (let k = 0; k < sortiert.length; k++) {
      const f = this.armillarFarbe(sortiert[k].wirkung);
      if (!f) continue;
      const aussen = sortiert[k].r * s, innen = (sortiert[k + 1] ? sortiert[k + 1].r : 0) * s;
      ctx.beginPath();
      ctx.arc(0, 0, aussen, 0, TAU);
      ctx.arc(0, 0, innen, 0, TAU, true);
      ctx.fillStyle = `rgba(${f[0]},${f[1]},${f[2]},0.24)`; ctx.fill('evenodd');
      ctx.strokeStyle = `rgba(${f[0]},${f[1]},${f[2]},0.6)`; ctx.lineWidth = Math.max(1.5, s * 0.06);
      ctx.beginPath(); ctx.arc(0, 0, innen, 0, TAU); ctx.stroke();
    }
    ctx.restore();
  },

  drawArmillar(ctx, ob, t) {
    const s = this.scale;
    this.isoEllipse(ctx, ob.x, ob.y, 0.003, Math.max(...ob.ringe.map(r => r.r)) * 1.05, 'rgba(0,0,0,0.22)');
    /* Von innen nach außen zeichnen, damit der äußere Ring den inneren verdeckt und nicht
       umgekehrt – sonst stünde die Sphäre auf dem Kopf. */
    const sortiert = ob.ringe.map((r, i) => [r, ob.stand[i]]).sort((a, b) => a[0].r - b[0].r);
    sortiert.forEach(([ring, stand], nr) => {
      const n = 26, aussen = [], innen = [];
      const a0 = stand + ring.gasse / 2, a1 = stand + TAU - ring.gasse / 2;
      for (let k = 0; k <= n; k++) {
        const a = a0 + (a1 - a0) * (k / n);
        aussen.push([ob.x + Math.cos(a) * (ring.r + ob.dicke), ob.y + Math.sin(a) * (ring.r + ob.dicke)]);
        innen.push([ob.x + Math.cos(a) * (ring.r - ob.dicke), ob.y + Math.sin(a) * (ring.r - ob.dicke)]);
      }
      /* NIEDRIG HALTEN. Bei 0,8 bis 1,7 warfen die vier Ringe so lange Schatten, daß dazwischen
         schwarze Bänder lagen und die Farben der Wirkungen darin untergingen. Der Schatten ist
         richtig gerechnet – er war nur wichtiger als das, was er verdeckte. */
      const hoch = 0.5 + nr * 0.14;          // außen etwas höher: die Sphäre bekommt eine Schale
      /* Der Ring trägt die Farbe seiner Wirkung – als Messing mit einem Stich, nicht als Anstrich.
         Ein grellbunter Ring sähe aus wie Spielzeug; das hier ist ein Instrument. */
      const f = this.armillarFarbe(ring.wirkung);
      const misch = (a, b, u) => Math.round(a + (b - a) * u);
      const deck = f ? `rgb(${misch(226, f[0], 0.42)},${misch(192, f[1], 0.42)},${misch(114, f[2], 0.42)})` : '#e2c072';
      const seite = f ? `rgb(${misch(138, f[0], 0.32)},${misch(106, f[1], 0.32)},${misch(36, f[2], 0.32)})` : '#8a6a24';
      this.prism(ctx, aussen.concat(innen.reverse()), 0, hoch, deck, seite, { outline: '#4a3810' });
      // Die beiden Gassenkanten bekommen einen hellen Pfosten – daran sieht man, wo die Lücke ist
      for (const a of [a0, a1]) {
        const px = ob.x + Math.cos(a) * ring.r, py = ob.y + Math.sin(a) * ring.r;
        this.prism(ctx, this.circlePoly(px, py, ob.dicke * 1.3, 6), 0, hoch + 0.45, '#fff0b8', '#a8842a', { outline: '#4a3810' });
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
