/* Zeichnung der Maschinen des Zauberreichs.

   Beide Maschinen dieser Welt haben dasselbe Problem: Ihr Zustand ändert sich, und wenn man ihn
   nicht sieht, ist die Bahn Glückssache. Darum steht bei beiden die Ansage AUF DEM BODEN und nicht
   am Gerät – dieselbe Regel wie beim Ring der Lavafontäne und bei der Lunte der Sprengladung. Wer
   von schräg oben auf eine Bahn sieht, liest den Boden; was aufrecht steht, verdeckt sich selbst. */
Object.assign(Renderer.prototype, {

  /* ================= Die Rankenbrücke =================
     Auf dem Boden liegen drei Dinge: die Lücke, über die nichts führt; die Ranke, solange sie
     trägt; und die Blüte mit einem Ring, der sagt, daß sie bereit ist.

     DER BALKEN AM RAND IST DIE UHR. Ohne ihn müßte man mitzählen, wie lange die Ranke schon steht –
     und vier Sekunden im Kopf zu zählen, während der Ball rollt, kann niemand. Der Balken läuft
     sichtbar leer, und in der letzten Sekunde blinkt er. */
  drawRankeFloor(ctx, ob, t) {
    const s = this.scale;
    const p = ob.stand(t), traegt = ob.traegt(t);
    const x0 = ob.x, y0 = ob.y, x1 = ob.x + ob.w, y1 = ob.y + ob.h;
    const laengs = ob.w >= ob.h;                      // läuft die Brücke entlang x oder entlang y?

    /* Die Lücke: ein dunkler Schacht mit einer hellen Kante. Sie liegt IMMER da, auch wenn die
       Ranke trägt – sonst sähe die getragene Brücke aus wie gewöhnlicher Boden, und man vergäße,
       daß darunter nichts ist. */
    this.fillPoly(ctx, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 0.004, 'rgba(10,6,20,0.62)', false);
    ctx.strokeStyle = 'rgba(180,150,220,0.55)'; ctx.lineWidth = Math.max(1.5, s * 0.05);
    this.pathPoly(ctx, [[x0, y0], [x1, y0], [x1, y1], [x0, y1]], 0.006); ctx.stroke();

    /* Die Ranke wächst von der Blütenseite her. Welche Seite das ist, entscheidet der Abstand –
       sonst wüchse sie auf der Hälfte der Bahnen verkehrt herum los, und das sieht aus wie ein
       Fehler, obwohl es keiner ist. */
    if (p > 0.001) {
      const vonVorn = laengs ? (ob.bluete.x <= (x0 + x1) / 2) : (ob.bluete.y <= (y0 + y1) / 2);
      const a0 = laengs ? x0 : y0, a1 = laengs ? x1 : y1;
      const bis = vonVorn ? a0 + (a1 - a0) * p : a1 - (a1 - a0) * p;
      const lo = Math.min(vonVorn ? a0 : bis, vonVorn ? bis : a1);
      const hi = Math.max(vonVorn ? a0 : bis, vonVorn ? bis : a1);
      const poly = laengs ? [[lo, y0], [hi, y0], [hi, y1], [lo, y1]] : [[x0, lo], [x1, lo], [x1, hi], [x0, hi]];
      const welk = !traegt;                            // nach dem Ende wird sie braun, bevor sie ganz weg ist
      this.fillPoly(ctx, poly, 0.012, welk ? 'rgba(122,96,48,0.85)' : 'rgba(86,168,62,0.92)', false);
      // Blätter längs der Ranke: erst damit sieht man, daß da etwas Gewachsenes liegt und kein Brett
      ctx.fillStyle = welk ? '#8a6a34' : '#9fe06a';
      const n = Math.max(3, Math.round((hi - lo) * 2.2));
      for (let i = 0; i < n; i++) {
        const u = (i + 0.5) / n, q = lo + (hi - lo) * u;
        const quer = (i % 2 ? 0.28 : -0.28) * (laengs ? ob.h : ob.w);
        const bx = laengs ? q : (x0 + x1) / 2 + quer, by = laengs ? (y0 + y1) / 2 + quer : q;
        const [lx, ly] = this.proj(bx, by, 0.02);
        ctx.beginPath(); ctx.ellipse(lx, ly, s * 0.17, s * 0.1 * this.cam.tilt, i * 1.1, 0, TAU); ctx.fill();
      }
      /* Die Uhr: ein Balken neben der Ranke, der leerläuft. Blinkt in der letzten Sekunde. */
      if (traegt) {
        const rest = Math.max(0, (ob.bisT - t) / ob.dauer);
        const eilt = (ob.bisT - t) < 1;
        const bx0 = laengs ? x0 : x0 - 0.25, by0 = laengs ? y0 - 0.25 : y0;
        const bl = laengs ? ob.w : ob.h;
        const e0 = laengs ? [bx0, by0] : [bx0, by0], e1 = laengs ? [bx0 + bl * rest, by0] : [bx0, by0 + bl * rest];
        const pa = this.proj(e0[0], e0[1], 0.03), pb = this.proj(e1[0], e1[1], 0.03);
        ctx.strokeStyle = eilt && Math.sin(t * 14) > 0 ? '#ffd166' : 'rgba(159,224,106,0.95)';
        ctx.lineWidth = Math.max(2, s * 0.09); ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(pa[0], pa[1]); ctx.lineTo(pb[0], pb[1]); ctx.stroke();
      }
    }

    /* Die Blüte auf dem Boden: ein Ring, der atmet, solange sie bereit ist, und der beim Anstoßen
       einmal aufspringt. */
    const seit = t - ob.abT;
    const puls = seit >= 0 && seit < 0.5 ? 1 + (1 - seit / 0.5) * 0.8 : 1;
    this.isoEllipse(ctx, ob.bluete.x, ob.bluete.y, 0.004, ob.r * 1.55 * puls, 'rgba(199,125,255,0.30)');
    ctx.strokeStyle = 'rgba(255,209,102,0.85)'; ctx.lineWidth = Math.max(1.5, s * 0.05);
    const [cx, cy] = this.proj(ob.bluete.x, ob.bluete.y, 0.006);
    ctx.beginPath(); ctx.ellipse(cx, cy, ob.r * 1.15 * s, ob.r * 1.15 * s * this.cam.tilt, 0, 0, TAU); ctx.stroke();
  },

  /* Die Blüte, aufrecht: Stengel, Blätter, fünf Blütenblätter, leuchtende Mitte. */
  drawRanke(ctx, ob, t) {
    const s = this.scale, bx = ob.bluete.x, by = ob.bluete.y;
    const wiegen = Math.sin(t * 1.6 + bx) * 0.06;
    const [fx, fy] = this.proj(bx, by, 0);
    const [kx, ky] = this.proj(bx + wiegen, by, 0.62);
    ctx.strokeStyle = '#4f8f3a'; ctx.lineWidth = Math.max(2, s * 0.07); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(fx, fy); ctx.quadraticCurveTo((fx + kx) / 2 + s * 0.06, (fy + ky) / 2, kx, ky); ctx.stroke();
    ctx.fillStyle = '#5aa542';
    for (const seite of [-1, 1]) {
      const [lx, ly] = this.proj(bx + seite * 0.22, by, 0.3);
      ctx.beginPath(); ctx.ellipse(lx, ly, s * 0.16, s * 0.08, seite * 0.5, 0, TAU); ctx.fill();
    }
    /* Die Blütenblätter wechseln die Farbe, solange die Ranke steht – so sieht man am Ursprung,
       ob die Brücke gerade trägt, auch wenn man auf die Blüte schaut und nicht auf die Lücke. */
    const offen = ob.traegt(t);
    ctx.fillStyle = offen ? '#9fe06a' : '#e07fd8';
    for (let i = 0; i < 5; i++) {
      const a = t * 0.6 + i * (TAU / 5);
      ctx.beginPath();
      ctx.ellipse(kx + Math.cos(a) * s * 0.16, ky + Math.sin(a) * s * 0.16 * this.cam.tilt, s * 0.13, s * 0.09, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.arc(kx, ky, s * 0.1, 0, TAU); ctx.fill();
  },

  /* ================= Die Zauberhüte =================
     Auf dem Boden steht, welcher Hut gerade der Ausgang ist: ein Kreis aus Sternen unter ihm. Der
     nächste glimmt schon auf, bevor er dran ist – daran legt man den Schlag an. */
  drawZauberhutFloor(ctx, ob, t) {
    if (!ob.bereit) return;
    const s = this.scale;
    for (let i = 0; i < ob.orte.length; i++) {
      const [hx, hy] = ob.orte[i];
      const an = i === ob.aktiv, gleich = i === ob.naechste ? ob.gleich : 0;
      const hell = an ? 1 : gleich;
      this.isoEllipse(ctx, hx, hy, 0.004, ob.r * 2.1, `rgba(120,80,190,${0.18 + 0.3 * hell})`);
      if (hell < 0.02) continue;
      const [cx, cy] = this.proj(hx, hy, 0.006);
      ctx.strokeStyle = `rgba(255,225,150,${0.35 + 0.6 * hell})`;
      ctx.lineWidth = Math.max(1.5, s * 0.06);
      ctx.beginPath(); ctx.ellipse(cx, cy, ob.r * 1.9 * s, ob.r * 1.9 * s * this.cam.tilt, 0, 0, TAU); ctx.stroke();
      // Sterne, die im Kreis laufen – der Ausgang funkelt, der nächste glimmt nur
      ctx.fillStyle = `rgba(255,240,190,${0.5 + 0.5 * hell})`;
      for (let k = 0; k < 6; k++) {
        const a = t * 1.3 + k * (TAU / 6), rr = ob.r * (1.55 + 0.25 * Math.sin(t * 3 + k));
        const [sx, sy] = this.proj(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr, 0.01);
        ctx.beginPath(); ctx.arc(sx, sy, s * 0.05 * (0.6 + hell), 0, TAU); ctx.fill();
      }
    }
  },

  /* Die Hüte selbst: Krempe, Kegel, geknickte Spitze. Der leuchtende trägt einen Stern daran.

     DAS MASS DER ZEICHNUNG IST NICHT DAS MASS DER MASCHINE. Beim ersten Versuch war der Hut genau
     so breit wie sein Maul (0,42 Kacheln), und in der Schrägsicht wurde daraus ein dünner Dorn –
     derselbe Fehler wie beim Wasserrad: Was aus schmalen Teilen besteht, zerfällt in dieser Größe
     zu Gekrissel. Ein Zauberhut ist ein breiter Filzhut mit einer Krempe, unter die ein Ball paßt.
     Darum rechnet die Zeichnung mit einem eigenen, größeren Maß; gefangen wird weiter am Maul. */
  drawZauberhut(ctx, ob, t) {
    if (!ob.bereit) return;
    const s = this.scale;
    const R = Math.max(0.78, ob.r * 2.0);           // so groß ist der Hut fürs Auge
    /* Von hinten nach vorn: Zwei Hüte hintereinander würden sich sonst falsch überdecken. */
    const reihe = ob.orte.map((p, i) => ({ i, x: p[0], y: p[1] })).sort((a, b) => (a.x + a.y) - (b.x + b.y));
    for (const h of reihe) {
      const an = h.i === ob.aktiv, gleich = h.i === ob.naechste ? ob.gleich : 0;
      const hell = an ? 1 : gleich * 0.7;
      /* DER KEGEL WIRD IM BILDRAUM GEBAUT, NICHT IN DER WELTEBENE. Zuerst standen seine beiden
         Fußpunkte links und rechts auf DERSELBEN Weltkoordinate y – und in der Schrägsicht fallen
         die dann fast aufeinander: Aus dem Hut wurde ein Strich. Dieselbe Falle wie beim
         Wasserrad. Gerechnet wird darum nur die HÖHE aus der Projektion; Breite und Knick sind
         Bildpunkte, und damit steht der Hut immer aufrecht, egal wie die Kamera gedreht ist. */
      const hoch = 1.05 + 0.05 * Math.sin(t * 2 + h.i);
      const [cx, cy] = this.proj(h.x, h.y, 0.1);
      const [, oben] = this.proj(h.x, h.y, hoch * (R / 0.78));
      const hPx = Math.max(s * 0.6, cy - oben);              // so hoch ist der Hut in Bildpunkten
      const bPx = R * s * 0.82;                              // und so breit sein Fuß
      const knick = hPx * (0.26 + 0.03 * Math.sin(t * 1.3 + h.i));
      const spitze = [cx + knick, cy - hPx];

      // Schatten und Krempe. Die Krempe ist breit – daran erkennt man den Hut von oben.
      this.isoEllipse(ctx, h.x, h.y, 0.004, R * 1.15, 'rgba(0,0,0,0.28)');
      this.isoEllipse(ctx, h.x, h.y, 0.08, R * 1.1, an ? '#4a3480' : '#3a2a63');
      this.isoEllipse(ctx, h.x, h.y, 0.095, R * 0.95, an ? '#5c3fa8' : '#472f82');
      // Das Maul: der dunkle Ring in der Mitte, in den der Ball rollt
      this.isoEllipse(ctx, h.x, h.y, 0.1, ob.r * 1.05, '#150e2a');

      // Der Kegel, in Bildpunkten: zwei Bögen von den Fußpunkten zur Spitze
      const kg = ctx.createLinearGradient(cx - bPx, cy, spitze[0], spitze[1]);
      kg.addColorStop(0, an ? '#4a3384' : '#3a2766');
      kg.addColorStop(0.6, an ? '#6b4bb8' : '#503a8c');
      kg.addColorStop(1, an ? '#8a68d8' : '#5a3f9c');
      ctx.fillStyle = kg;
      ctx.beginPath();
      ctx.moveTo(cx - bPx, cy - hPx * 0.06);
      ctx.quadraticCurveTo(cx - bPx * 0.55, cy - hPx * 0.62, spitze[0], spitze[1]);
      ctx.quadraticCurveTo(cx + bPx * 0.72, cy - hPx * 0.52, cx + bPx, cy - hPx * 0.06);
      ctx.closePath(); ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();

      // Das Band über der Krempe – ebenfalls in Bildpunkten, damit es am Kegel anliegt
      ctx.strokeStyle = an ? '#ffd166' : '#a98a46'; ctx.lineWidth = Math.max(2, hPx * 0.13);
      ctx.beginPath();
      ctx.moveTo(cx - bPx * 0.86, cy - hPx * 0.13);
      ctx.quadraticCurveTo(cx, cy - hPx * 0.06, cx + bPx * 0.86, cy - hPx * 0.13);
      ctx.stroke();

      if (hell > 0.02) {   // der Stern an der Spitze: das Zeichen des Ausgangs
        ctx.save(); ctx.globalAlpha = 0.35 + 0.65 * hell;
        ctx.fillStyle = '#fff2b8';
        const r1 = s * 0.2, r2 = s * 0.085;
        ctx.beginPath();
        for (let k = 0; k < 10; k++) {
          const a = -Math.PI / 2 + k * (Math.PI / 5) + t * 0.6, rr = k % 2 ? r2 : r1;
          const px = spitze[0] + Math.cos(a) * rr, py = spitze[1] + Math.sin(a) * rr;
          k ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.closePath(); ctx.fill(); ctx.restore();
      }
    }
  },

  /* ================= Der Mondzieher =================
     Am Boden liegt der Kreis, in dem er greift, und darin laufen Funken. Sie laufen nach INNEN,
     solange der Mond zieht, und nach AUSSEN, solange er stößt; beim Halbmond stehen sie fast.
     Damit liest man Richtung und Stärke aus einer einzigen Bewegung ab, ohne einen Pfeil und ohne
     eine Zahl – und man liest sie am Boden, dort, wo der Ball gleich langläuft. */
  drawMondzieherFloor(ctx, ob, t) {
    const s = this.scale, p = ob.p;
    const zieht = p >= 0, kraft = Math.abs(p);

    // Der Rand des Griffs. Er ist immer gleich groß – nur seine Farbe sagt, was er gerade tut.
    this.isoEllipse(ctx, ob.x, ob.y, 0.003, ob.r, zieht ? 'rgba(90,110,190,0.14)' : 'rgba(150,90,190,0.14)');
    const [cx, cy] = this.proj(ob.x, ob.y, 0.005);
    ctx.strokeStyle = zieht ? `rgba(170,200,255,${0.25 + 0.4 * kraft})` : `rgba(226,160,255,${0.25 + 0.4 * kraft})`;
    ctx.lineWidth = Math.max(1.5, s * 0.05);
    ctx.beginPath(); ctx.ellipse(cx, cy, ob.r * s, ob.r * s * this.cam.tilt, 0, 0, TAU); ctx.stroke();

    /* Die Funken. Ihr Abstand zur Mitte läuft mit der Zeit – nach innen oder nach außen, je nach
       Vorzeichen. Sie laufen schneller, je stärker der Mond greift; beim Halbmond hängen sie
       nahezu still, und genau das ist der Augenblick, in dem man ungestört schlagen kann. */
    const lauf = (t * (0.25 + kraft * 0.75)) % 1;
    ctx.fillStyle = zieht ? `rgba(200,220,255,${0.25 + 0.55 * kraft})` : `rgba(240,190,255,${0.25 + 0.55 * kraft})`;
    for (let k = 0; k < 14; k++) {
      const a = k * (TAU / 14) + (k % 3) * 0.4;
      const u = ((k * 0.137 + (zieht ? -lauf : lauf)) % 1 + 1) % 1;   // 0 = Mitte, 1 = Rand
      const rr = ob.core + (ob.r - ob.core) * u;
      const [fx, fy] = this.proj(ob.x + Math.cos(a) * rr, ob.y + Math.sin(a) * rr, 0.008);
      // am Rand klein, in der Mitte groß: der Funke wächst auf dem Weg, den auch der Ball nähme
      const gr = s * 0.045 * (zieht ? (1.3 - u * 0.7) : (0.6 + u * 0.7));
      ctx.beginPath(); ctx.arc(fx, fy, gr, 0, TAU); ctx.fill();
    }
  },

  /* Der Mond selbst: ein Sockel und darüber die Scheibe, die ihre Phase zeigt.

     DIE SCHEIBE WIRD IM BILDRAUM GEBAUT, nur ihre Höhe kommt aus der Projektion – dieselbe Regel
     wie beim Zauberhut und beim Wasserrad. Ein Kreis, der in der Weltebene läge, sähe aus wie ein
     umgefallener Teller.

     VOLL HEISST ZIEHEN, DUNKEL HEISST STOSSEN. Das ist keine Erfindung dieses Spiels, sondern die
     Sprache jedes Kalenders, und deshalb braucht sie keine Legende am Rand. */
  drawMondzieher(ctx, ob, t) {
    const s = this.scale;
    const [fx, fy] = this.proj(ob.x, ob.y, 0);
    const [, oben] = this.proj(ob.x, ob.y, 1.5);
    const hPx = Math.max(s * 0.9, fy - oben);
    const rr = Math.max(s * 0.34, s * 0.5);              // Halbmesser der Scheibe in Bildpunkten
    const mx = fx, my = fy - hPx;

    // Sockel: erst er macht sichtbar, daß der Mond nicht frei schwebt, sondern im Weg steht
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.core * 1.5, 'rgba(0,0,0,0.3)');
    const sg = ctx.createLinearGradient(fx - ob.core * s, 0, fx + ob.core * s, 0);
    sg.addColorStop(0, '#2b2547'); sg.addColorStop(0.5, '#4a4270'); sg.addColorStop(1, '#241f3c');
    ctx.fillStyle = sg;
    ctx.beginPath();
    ctx.moveTo(fx - ob.core * s, fy);
    ctx.lineTo(fx - ob.core * s * 0.7, my + rr * 0.6);
    ctx.lineTo(fx + ob.core * s * 0.7, my + rr * 0.6);
    ctx.lineTo(fx + ob.core * s, fy);
    ctx.closePath(); ctx.fill();
    this.isoEllipse(ctx, ob.x, ob.y, 0.02, ob.core, '#554b82');

    const f = (ob.p + 1) / 2;                            // 0 = Neumond (stößt), 1 = Vollmond (zieht)

    // Der Schein um die Scheibe wächst mit der Phase – von weitem sieht man daran schon, was los ist
    const sch = ctx.createRadialGradient(mx, my, rr * 0.6, mx, my, rr * 2.4);
    sch.addColorStop(0, `rgba(200,215,255,${0.05 + 0.3 * f})`);
    sch.addColorStop(1, 'rgba(200,215,255,0)');
    ctx.fillStyle = sch;
    ctx.beginPath(); ctx.arc(mx, my, rr * 2.4, 0, TAU); ctx.fill();

    // Die dunkle Scheibe liegt immer da; darauf kommt das Licht
    ctx.fillStyle = '#2a2440';
    ctx.beginPath(); ctx.arc(mx, my, rr, 0, TAU); ctx.fill();

    const licht = '#e9eeff';
    ctx.save();
    ctx.beginPath(); ctx.arc(mx, my, rr, 0, TAU); ctx.clip();
    ctx.fillStyle = licht;
    ctx.beginPath(); ctx.arc(mx, my, rr, -Math.PI / 2, Math.PI / 2); ctx.closePath(); ctx.fill();
    /* Der Schatten läuft als Ellipse über die Scheibe: breiter als halb heißt zunehmend und hell,
       schmaler heißt abnehmend und dunkel. Ein einziger Wert, zwei Richtungen. */
    const k = 2 * f - 1;
    ctx.fillStyle = k >= 0 ? licht : '#2a2440';
    ctx.beginPath(); ctx.ellipse(mx, my, rr * Math.abs(k), rr, 0, 0, TAU); ctx.fill();
    // Krater, damit die helle Fläche nicht wie eine Lampe aussieht
    ctx.fillStyle = 'rgba(150,160,200,0.35)';
    for (const [ux, uy, ur] of [[-0.3, -0.25, 0.2], [0.25, 0.1, 0.15], [0.05, -0.45, 0.1], [-0.1, 0.4, 0.13]]) {
      ctx.beginPath(); ctx.arc(mx + ux * rr, my + uy * rr, ur * rr, 0, TAU); ctx.fill();
    }
    ctx.restore();

    ctx.strokeStyle = 'rgba(190,205,255,0.5)'; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath(); ctx.arc(mx, my, rr, 0, TAU); ctx.stroke();
  },
});
