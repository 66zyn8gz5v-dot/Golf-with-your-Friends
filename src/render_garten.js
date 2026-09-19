/* Die eigene Optik des Lehrlingsgartens.

   Der Garten hatte bis hierher keine eigenen Bilder: Sein Prellklotz war ein Pilz aus dem
   Pilzhain, sein Windrad ein Hexenbesen, seine Mühle ein Müllerhaus aus der Elfenwiese. Das
   Verhalten war neu, das Bild geliehen – und geliehene Bilder erzählen die falsche Geschichte.
   In einem Garten, in dem Lehrlinge üben, steht kein Müllerhaus.

   Fünf Maschinen bekommen darum hier ihr eigenes Gesicht, und alle fünf kommen aus DEMSELBEN
   Garten: Springkraut, Rasensprenger, Bienenstock, Pollenstrudel und die Riesen-Sonnenblume.
   Was sie tun, bleibt Wort für Wort dasselbe – nur sieht man jetzt, WARUM sie es tun.

   Zwei Regeln gelten für alle:

   1. Was den Ball wirklich anfasst, wird auch gezeichnet. Die Arme des Sprengers sind da, wo die
      Stoßkanten liegen; der Korb des Bienenstocks steht auf dem Klotz, der sperrt. Ein Bild, das
      neben seiner Wirkung liegt, ist schlimmer als gar keins.
   2. Was aufrecht steht, wird im BILDRAUM gebaut und nimmt nur die Höhe aus der Projektion. Ein
      Kreis, den man in die Weltebene legt, kippt in der Schrägsicht um und liegt flach – dieselbe
      Falle wie beim Zauberhut und beim Wasserrad. */
Object.assign(Renderer.prototype, {

  /* ================= Das Springkraut (Prellklotz) =================
     Ein Kraut mit einer prallen Samenkapsel. Wer sie anstößt, dem platzt sie ins Gesicht und
     schleudert die Samen davon – genau das tut der Prellklotz mit dem Ball. Die Kapsel ist
     darum nicht Zierde, sondern die Erklärung: Man sieht vorher, dass da etwas unter Spannung
     steht, und hinterher, dass es sich entladen hat. */
  drawSpringkrautFloor(ctx, ob, t) {
    const alter = performance.now() / 1000 - ob.hitAt;
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.r + 0.34, 'rgba(38,84,34,0.30)');
    this.isoEllipse(ctx, ob.x, ob.y, 0.005, ob.r + 0.08, 'rgba(20,48,20,0.30)');
    if (alter < 0.7) {   // der Abdruck des Platzens: ein Ring, der nach außen läuft
      const u = alter / 0.7;
      this.isoEllipse(ctx, ob.x, ob.y, 0.006, (ob.r + 0.1) * (1 + u * 0.8), `rgba(214,240,150,${0.35 * (1 - u)})`);
    }
  },

  drawSpringkraut(ctx, ob, t) {
    const s = this.scale;
    const alter = performance.now() / 1000 - ob.hitAt;
    const stauch = Math.max(0, 1 - alter * 3.2);          // 1 = eben getroffen, 0 = wieder prall
    const [cx, cy] = this.proj(ob.x, ob.y, 0);
    const [, obenPx] = this.proj(ob.x, ob.y, ob.r * 2.1);
    const hPx = Math.max(s * 0.5, cy - obenPx);
    const bPx = ob.r * s;
    const wiegen = Math.sin(t * 1.4 + ob.x * 0.7) * 0.09;

    // Fünf Blätter, gefächert. Sie sitzen tief und breit – damit steht das Kraut fest im Bild.
    const blatt = (dx, dy, breit, hell, dunkel) => {
      const bx = cx, by = cy - hPx * 0.05;
      const ex = bx + (dx + wiegen * dy) * bPx * 1.45, ey = by + dy * hPx * 0.7;
      const mx = (bx + ex) / 2, my = (by + ey) / 2;
      let nx = -(ey - by), ny = ex - bx; const nl = Math.hypot(nx, ny) || 1;
      nx = (nx / nl) * breit * bPx; ny = (ny / nl) * breit * bPx;
      ctx.beginPath(); ctx.moveTo(bx, by);
      ctx.quadraticCurveTo(mx + nx, my + ny, ex, ey);
      ctx.quadraticCurveTo(mx - nx, my - ny, bx, by);
      ctx.closePath();
      const g = ctx.createLinearGradient(bx, by, ex, ey);
      g.addColorStop(0, dunkel); g.addColorStop(1, hell);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(18,44,16,0.7)'; ctx.lineWidth = Math.max(1, s * 0.022); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(bx, by); ctx.lineTo(ex, ey);   // Mittelrippe
      ctx.strokeStyle = 'rgba(190,230,150,0.45)'; ctx.stroke();
    };
    for (const [dx, dy] of [[-1.0, -0.12], [1.0, -0.12], [-0.62, -0.62], [0.62, -0.62]])
      blatt(dx, dy, 0.3, '#7fc24a', '#33702c');

    // Der Stengel
    const podX = cx + wiegen * bPx * 0.8, podY = cy - hPx * 0.86;
    ctx.strokeStyle = '#3d7a2e'; ctx.lineWidth = Math.max(1.5, s * 0.055); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy - hPx * 0.05); ctx.quadraticCurveTo(cx, cy - hPx * 0.5, podX, podY + hPx * 0.2); ctx.stroke();

    const pr = bPx * 0.46, ph = hPx * 0.34;
    const kapselFarbe = () => {
      const g = ctx.createLinearGradient(podX - pr, podY - ph, podX + pr, podY + ph);
      g.addColorStop(0, '#cfe86a'); g.addColorStop(0.55, '#8dbd3c'); g.addColorStop(1, '#4d8424');
      return g;
    };
    if (alter < 0.45) {
      /* Geplatzt: die Kapsel rollt sich in zwei Hälften auf. Das ist genau die Bewegung, die das
         echte Springkraut macht, und sie dauert so kurz wie der Stoß selbst. */
      const oeffnung = Math.min(1, alter * 6) * 1.15;
      for (const sd of [-1, 1]) {
        ctx.save(); ctx.translate(podX, podY - ph); ctx.rotate(sd * oeffnung);
        ctx.beginPath(); ctx.moveTo(0, 0);
        ctx.quadraticCurveTo(sd * pr * 1.5, ph * 0.9, 0, ph * 2.0);
        ctx.quadraticCurveTo(sd * pr * 0.4, ph * 1.0, 0, 0);
        ctx.closePath();
        ctx.fillStyle = kapselFarbe(); ctx.fill();
        ctx.strokeStyle = 'rgba(24,52,16,0.75)'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
        ctx.restore();
      }
    } else {
      // Prall und geschlossen, mit drei Längsrippen – daran sieht man die Spannung
      ctx.beginPath(); ctx.ellipse(podX, podY, pr * (1 + stauch * 0.2), ph * (1.18 - stauch * 0.2), 0, 0, TAU);
      ctx.fillStyle = kapselFarbe(); ctx.fill();
      ctx.strokeStyle = 'rgba(24,52,16,0.8)'; ctx.lineWidth = Math.max(1.2, s * 0.035); ctx.stroke();
      ctx.strokeStyle = 'rgba(30,64,20,0.45)'; ctx.lineWidth = Math.max(1, s * 0.022);
      for (const u of [-0.45, 0, 0.45]) {
        ctx.beginPath();
        ctx.moveTo(podX + u * pr, podY - ph * 1.1);
        ctx.quadraticCurveTo(podX + u * pr * 1.5, podY, podX + u * pr, podY + ph * 1.1);
        ctx.stroke();
      }
      ctx.strokeStyle = '#6d4a20'; ctx.lineWidth = Math.max(1.2, s * 0.032);
      ctx.beginPath(); ctx.moveTo(podX, podY - ph * 1.15);
      ctx.quadraticCurveTo(podX + pr * 0.5, podY - ph * 1.7, podX + pr * 0.1, podY - ph * 1.9); ctx.stroke();
    }

    if (alter < 0.8) {   // die davonfliegenden Samen
      const u = alter / 0.8;
      ctx.fillStyle = `rgba(108,74,32,${1 - u})`;
      for (let i = 0; i < 8; i++) {
        const a = i * (TAU / 8) + ob.x;
        const weit = u * s * 2.4;
        const px = podX + Math.cos(a) * weit;
        const py = podY + Math.sin(a) * weit * 0.55 - u * s * 1.1 + u * u * s * 2.2;
        ctx.beginPath(); ctx.ellipse(px, py, s * 0.055, s * 0.04, a, 0, TAU); ctx.fill();
      }
    }
  },

  /* ================= Der Rasensprenger (Windrad) =================
     Ein Messinghahn mit zwei oder drei Armen, der sich vom eigenen Wasserstrahl dreht. Der Arm
     ist die Stoßkante – er liegt genau da, wo vorher der Besenstiel lag –, und der Strahl hinter
     der Düse sagt, in welche Richtung er sich dreht. Das konnte der Besen nicht: An einem Besen
     sieht man die Drehrichtung erst, wenn er einen trifft. */
  drawSprengerFloor(ctx, ob, t) {
    const s = this.scale, R = ob.len + 0.25;
    this.isoEllipse(ctx, ob.x, ob.y, 0.003, R, 'rgba(36,92,56,0.24)');     // nasser Rasen, dunkler
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, R * 0.62, 'rgba(48,120,74,0.18)');
    ctx.fillStyle = 'rgba(190,235,255,0.35)';
    for (let i = 0; i < 14; i++) {   // Tropfen im Gras, feststehend – sie sind gefallen, nicht in der Luft
      const a = i * 2.39996 + ob.x, rr = R * Math.sqrt(((i * 7) % 13) / 13);
      const [px, py] = this.proj(ob.x + Math.cos(a) * rr, ob.y + Math.sin(a) * rr, 0.006);
      ctx.beginPath(); ctx.arc(px, py, s * 0.035, 0, TAU); ctx.fill();
    }
  },

  drawRasensprenger(ctx, ob, t) {
    const s = this.scale;
    const hubR = Math.max(0.18, ob.hubR || 0.2);
    const dreh = Math.sign(ob.speed) || 1;
    // Der Hahn: Sockel, Säule, Kappe
    this.prism(ctx, this.circlePoly(ob.x, ob.y, hubR * 1.5, 10), 0, 0.1, '#c8b48a', '#7a6a48', { outline: '#4e4228' });
    this.prism(ctx, this.circlePoly(ob.x, ob.y, hubR, 10), 0.1, 0.46, '#e8c979', '#93712c', { outline: '#5a4418' });
    this.isoEllipse(ctx, ob.x, ob.y, 0.57, hubR * 1.25, '#f6e2a4');

    for (let i = 0; i < ob.blades; i++) {
      const a = ob.bladeAngle(i), ca = Math.cos(a), sa = Math.sin(a), tk = ob.thick;
      const arm = [[ob.x - sa * tk, ob.y + ca * tk], [ob.x + ca * ob.len - sa * tk, ob.y + sa * ob.len + ca * tk],
        [ob.x + ca * ob.len + sa * tk, ob.y + sa * ob.len - ca * tk], [ob.x + sa * tk, ob.y - ca * tk]];
      this.prism(ctx, arm, 0.16, Math.max(0.26, (ob.height || 0.5) * 0.55), '#e0c070', '#8d6a26', { outline: '#54400f' });
      // Die Düse am Ende, schräg nach oben
      const dx = ob.x + ca * ob.len, dy = ob.y + sa * ob.len;
      this.prism(ctx, this.circlePoly(dx, dy, tk * 1.7, 8), 0.16, 0.34, '#cfe9ff', '#5c86b0', { outline: '#2f4d6e' });
      /* Der Strahl läuft dem Arm HINTERHER: Wasser verlässt die Düse und bleibt hinter der
         Drehung zurück. Läuft er voraus, sieht der Sprenger aus, als drehte er sich falsch herum. */
      for (let k = 1; k <= 9; k++) {
        const u = k / 9;
        const aa = a - dreh * u * 1.0;
        const rr = ob.len * (1 + u * 0.6);
        const z = Math.max(0.03, 0.55 + Math.sin(u * Math.PI) * 0.45 - u * 0.5);
        const [px, py] = this.proj(ob.x + Math.cos(aa) * rr, ob.y + Math.sin(aa) * rr, z);
        ctx.fillStyle = `rgba(198,238,255,${0.6 * (1 - u * 0.85)})`;
        ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * (0.075 - u * 0.035)), 0, TAU); ctx.fill();
      }
    }
  },

  /* ================= Der Bienenstock (Mühle) =================
     Dieselbe Maschine wie die Windmühle: eine Sperre quer über den Weg mit einem Durchgang, der
     sich im Takt schließt. Nur steht hier kein Müllerhaus, sondern EIN Bienenstock.

     EINER, NICHT VIELE. Zuerst waren es zwei Stände mit einer Reihe einzelner Körbe darauf, und
     dazwischen ein Holzbalken über dem Durchgang. Das las sich als Regal mit Körben: drei Dinge,
     die zufällig nebeneinanderstehen, und der Durchgang war die Lücke zwischen ihnen. Jetzt ist es
     ein einziger Stock, der die ganze Sperre füllt – ein gewachsener Strohhaufen, geflochten aus
     Wülsten, die von unten nach oben schmaler werden.

     UND DER DURCHGANG IST IM STOCK, NICHT ZWISCHEN ZWEIEN. Er ist ein Tunnel, den die Bienen
     durch ihr eigenes Nest gelassen haben: ein Bogen mitten im Stroh, der sich mit einer Wabe
     schließt. Damit ist die Maschine EIN Ding mit EINER Öffnung, und nicht zwei Dinge mit einem
     Zwischenraum – man sieht auf einen Blick, was hier sperrt und wo es aufgeht.

     Die Ampel am Boden bleibt: Sie gehört nicht zur Optik der alten Welt, sondern zur Regel
     dieser Maschine – man muß von oben sehen können, ob gerade zu ist. */
  drawBienenstock(ctx, ob, t) {
    const s = this.scale, ax = ob.axis === 'x';
    const dd = ob.depth / 2;
    /* Die Achse, längs der die Sperre läuft, und wie weit sie reicht. Das ist genau die Strecke,
       die die Klötze abdecken (w/2 + overlap) – das Bild ist damit so breit wie die Wirkung. */
    const ux = ax ? 1 : 0, uy = ax ? 0 : 1;
    const halb = ob.w / 2 + (ob.overlap == null ? 0.7 : ob.overlap);
    const hoehe = ob.height + 0.95;

    // Der Sockel: ein flacher Erdwall unter dem Stroh, damit der Stock nicht auf dem Rasen schwebt
    const sockel = [
      [ob.x + ux * halb + (ax ? 0 : dd), ob.y + uy * halb + (ax ? dd : 0)],
      [ob.x - ux * halb + (ax ? 0 : dd), ob.y - uy * halb + (ax ? dd : 0)],
      [ob.x - ux * halb - (ax ? 0 : dd), ob.y - uy * halb - (ax ? dd : 0)],
      [ob.x + ux * halb - (ax ? 0 : dd), ob.y + uy * halb - (ax ? dd : 0)],
    ];
    this.prism(ctx, sockel, 0, 0.14, '#8a6438', '#5a4022', { outline: '#3a2812' });

    /* Der Stock selbst: Strohwülste übereinander, jeder etwas kürzer als der darunter. Gezeichnet
       wird jeder als dicker Strich von einem Ende zum anderen – die Schrägsicht besorgt dabei die
       Richtung von selbst, und runde Enden machen aus dem Strich einen Wulst.
       Von OBEN nach UNTEN, damit der untere Wulst die Unterkante des oberen deckt. */
    const bahnen = 8;   // weniger, dafuer dickere Wuelste: Stroh ist geflochten, nicht geriffelt
    const [, obenPx] = this.proj(ob.x, ob.y, hoehe);
    const [, untenPx] = this.proj(ob.x, ob.y, 0.14);
    const hPx = Math.max(s * 0.6, untenPx - obenPx);
    const dick = (hPx / bahnen) * 1.9;

    /* Erst die Enden aller Wülste ausrechnen, dann daraus die Silhouette bauen. Die braucht man
       zweimal: um die Fugen zwischen den Wülsten zu schließen und um Licht und Schatten INNERHALB
       des Stocks zu malen, ohne dass etwas über die Kante läuft.

       DAS WAR DER GRUND, WARUM DER STOCK FLACH AUSSAH. Jeder Wulst war ein Strich in einer Farbe,
       und ein Strich in einer Farbe ist ein Band, kein Rohr. Ein geflochtener Strohwulst ist rund:
       unten im Schatten, oben ein Glanz, und zu den Enden hin dunkler, weil er sich dort wegdreht. */
    const kanten = [];
    for (let r = 0; r <= bahnen; r++) {
      const u = r / bahnen;
      /* Stark verjuengt: Mit wenig Verjuengung lag dort eine gerollte Matte. Ein Nest ist oben
         schmal und unten breit - erst dadurch wird aus der Sperre ein Haufen. */
      const schrumpf = Math.sqrt(Math.max(0.05, 1 - u * u * 0.94));
      const h = halb * schrumpf;
      const z = 0.14 + u * (hoehe - 0.14);
      kanten.push([this.proj(ob.x - ux * h, ob.y - uy * h, z), this.proj(ob.x + ux * h, ob.y + uy * h, z)]);
    }
    const umriss = () => {
      ctx.beginPath();
      ctx.moveTo(kanten[0][0][0], kanten[0][0][1]);
      for (let r = 1; r <= bahnen; r++) ctx.lineTo(kanten[r][0][0], kanten[r][0][1]);
      for (let r = bahnen; r >= 0; r--) ctx.lineTo(kanten[r][1][0], kanten[r][1][1]);
      ctx.closePath();
    };
    umriss(); ctx.fillStyle = '#c89a4a'; ctx.fill();

    ctx.lineCap = 'round';
    for (let r = bahnen; r >= 0; r--) {
      const [p0, p1] = kanten[r];
      // Der Wulst in drei Lagen: dunkle Unterseite, Filz, Glanz obendrauf - das macht ihn rund
      ctx.strokeStyle = 'rgba(86,56,16,0.9)'; ctx.lineWidth = dick + Math.max(2, s * 0.05);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      ctx.strokeStyle = r % 2 ? '#c99c48' : '#dcb267'; ctx.lineWidth = dick;
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.lineTo(p1[0], p1[1]); ctx.stroke();
      ctx.strokeStyle = r % 2 ? '#e7c483' : '#f6dda6'; ctx.lineWidth = dick * 0.42;
      ctx.beginPath();
      ctx.moveTo(p0[0], p0[1] - dick * 0.24); ctx.lineTo(p1[0], p1[1] - dick * 0.24); ctx.stroke();
    }

    /* Licht und Schatten über den ganzen Stock, beschnitten am Umriß. Ohne das bleibt er eine
       Reihe gleich heller Rohre; erst die Wölbung von einem Ende zum anderen macht daraus einen
       Körper, um den man herumgehen könnte. */
    ctx.save(); umriss(); ctx.clip();
    const e0 = this.proj(ob.x - ux * halb, ob.y - uy * halb, 0.14);
    const e1 = this.proj(ob.x + ux * halb, ob.y + uy * halb, 0.14);
    const lg = ctx.createLinearGradient(e0[0], e0[1], e1[0], e1[1]);
    lg.addColorStop(0, 'rgba(70,44,10,0.55)');
    lg.addColorStop(0.28, 'rgba(70,44,10,0)');
    lg.addColorStop(0.72, 'rgba(70,44,10,0)');
    lg.addColorStop(1, 'rgba(70,44,10,0.55)');
    umriss(); ctx.fillStyle = lg; ctx.fill();
    const hg = ctx.createLinearGradient(0, obenPx, 0, untenPx);
    hg.addColorStop(0, 'rgba(255,240,200,0.3)');
    hg.addColorStop(0.45, 'rgba(255,240,200,0)');
    hg.addColorStop(1, 'rgba(50,30,6,0.35)');
    umriss(); ctx.fillStyle = hg; ctx.fill();
    ctx.restore();
    umriss(); ctx.strokeStyle = 'rgba(70,44,10,0.75)'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.stroke();

    /* Der Tunnel durch den Stock. Gezeichnet wird nur die Seite, die zur Kamera zeigt – sonst
       sähe man durch das Nest hindurch. */
    const faceN = ax ? [0, 1] : [1, 0];
    const side = (faceN[0] * this.cam.sin + faceN[1] * this.cam.cos) > 0 ? 1 : -1;
    const w2 = ob.gap / 2 + 0.12, top = 1.2, rad = Math.min(w2, 0.5);
    const fx = ax ? ob.x : ob.x + side * dd, fy = ax ? ob.y + side * dd : ob.y;
    const at = (u, z) => (ax ? this.proj(fx + u, fy, z) : this.proj(fx, fy + u, z));
    const bogen = () => {
      ctx.beginPath();
      let p = at(-w2, 0.1); ctx.moveTo(p[0], p[1]);
      p = at(-w2, top - rad); ctx.lineTo(p[0], p[1]);
      for (let k = 0; k <= 12; k++) {
        const a = Math.PI - (k / 12) * Math.PI;
        p = at(Math.cos(a) * w2, top - rad + Math.sin(a) * rad); ctx.lineTo(p[0], p[1]);
      }
      p = at(w2, 0.1); ctx.lineTo(p[0], p[1]); ctx.closePath();
    };
    // Ein Kranz aus dunklerem Stroh um den Eingang: so ist der Tunnel gefloch­ten und nicht gestanzt
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    bogen(); ctx.strokeStyle = '#b98a42'; ctx.lineWidth = Math.max(3, s * 0.16); ctx.stroke();
    ctx.restore();

    if (ob.blocked) {
      // Die Wabe schiebt sich in den Tunnel: Bernstein mit Sechsecken, und Honig tropft
      ctx.fillStyle = '#e8a52c'; bogen(); ctx.fill();
      ctx.save(); bogen(); ctx.clip();
      ctx.strokeStyle = 'rgba(120,72,10,0.7)'; ctx.lineWidth = Math.max(1, s * 0.03);
      const zelle = w2 / 3;
      for (let r = 0; r < 7; r++) for (let c = -3; c <= 3; c++) {
        const u = c * zelle * 1.5 + (r % 2 ? zelle * 0.75 : 0), z = 0.1 + r * zelle * 0.9;
        if (z > top) continue;
        ctx.beginPath();
        for (let k = 0; k < 6; k++) {
          const a = k * (TAU / 6) + Math.PI / 6;
          const q = at(u + Math.cos(a) * zelle * 0.52, z + Math.sin(a) * zelle * 0.52);
          k ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]);
        }
        ctx.closePath(); ctx.stroke();
      }
      ctx.fillStyle = 'rgba(255,214,120,0.5)';
      for (let k = -2; k <= 2; k++) { const q = at(k * w2 * 0.4, top * 0.9); ctx.beginPath(); ctx.arc(q[0], q[1], s * 0.05, 0, TAU); ctx.fill(); }
      ctx.restore();
      ctx.strokeStyle = '#7a4a10'; ctx.lineWidth = Math.max(1.5, s * 0.05); bogen(); ctx.stroke();
    } else {
      ctx.fillStyle = '#1a1206'; bogen(); ctx.fill();
      ctx.strokeStyle = '#6b5a2a'; ctx.lineWidth = Math.max(1, s * 0.04); bogen(); ctx.stroke();
    }

    // Fluglöcher im Stroh, links und rechts vom Tunnel, jedes mit seinem Anflugbrett
    for (const sd of [-1, 1]) {
      const fu = sd * (w2 + halb) / 2;
      const [lx, ly] = at(fu, 0.55);
      ctx.fillStyle = '#2a1a08';
      ctx.beginPath(); ctx.ellipse(lx, ly, s * 0.13, s * 0.08, 0, 0, TAU); ctx.fill();
      ctx.fillStyle = '#b98a42';
      ctx.fillRect(lx - s * 0.17, ly + s * 0.05, s * 0.34, Math.max(1.5, s * 0.05));
    }

    // Die Ansage über dem Tunnel: bernstein = zu, grün = frei
    const [lx, ly] = at(0, top + 0.3), lc = ob.blocked ? '255,170,40' : '120,255,140';
    const pulse = 0.75 + 0.25 * Math.sin(t * 5);
    ctx.fillStyle = `rgba(${lc},${0.2 * pulse})`; ctx.beginPath(); ctx.arc(lx, ly, s * 0.34, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgb(${lc})`; ctx.beginPath(); ctx.arc(lx, ly, s * 0.1, 0, TAU); ctx.fill();

    /* Bienen. Bei geschlossener Wabe sind es mehr und sie bleiben vor dem Tunnel – das erklärt,
       warum gerade niemand durchkommt. */
    const n = ob.blocked ? 7 : 4;
    for (let i = 0; i < n; i++) {
      const a = t * (1.6 + (i % 3) * 0.4) + i * 1.1;
      const rr = (ob.blocked ? 0.5 : 1.0) + 0.3 * Math.sin(t * 2 + i);
      const bz = 0.7 + 0.5 * Math.sin(t * 1.7 + i * 2);
      const [px, py] = this.proj(ob.x + Math.cos(a) * rr * (ax ? 1.4 : 0.6), ob.y + Math.sin(a) * rr * (ax ? 0.6 : 1.4), bz);
      ctx.fillStyle = '#f0c73c'; ctx.beginPath(); ctx.ellipse(px, py, s * 0.07, s * 0.05, a, 0, TAU); ctx.fill();
      ctx.fillStyle = '#2a1e08';
      ctx.beginPath(); ctx.ellipse(px + Math.cos(a) * s * 0.03, py + Math.sin(a) * s * 0.03, s * 0.025, s * 0.045, a, 0, TAU); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.65)';   // Flügelschlag, zu schnell für ein Bild: ein heller Fleck
      ctx.beginPath(); ctx.ellipse(px, py - s * 0.05, s * 0.055, s * 0.025, 0, 0, TAU); ctx.fill();
    }
  },


  /* ================= Der Pollenstrudel (Magnet) =================
     Eine Pusteblume, die atmet. Zieht sie, fliegen die Schirmchen nach INNEN und sie zieht sich
     zusammen; stößt sie, bläst sie aus. Der alte Kristall konnte das nicht sagen: Er sah beim
     Ziehen genauso aus wie beim Stoßen, und nur die Ringe am Boden verrieten den Unterschied. */
  drawPollenFloor(ctx, ob, t) {
    const s = this.scale;
    const zieht = !ob.slow && ob.strength > 0, bremst = !!ob.slow;
    const col = bremst ? '196,224,150' : '255,214,90';
    this.isoEllipse(ctx, ob.x, ob.y, 0.003, ob.r, `rgba(${col},0.08)`);
    const [cx, cy] = this.proj(ob.x, ob.y, 0.006);
    ctx.strokeStyle = `rgba(${col},0.3)`; ctx.lineWidth = Math.max(1, s * 0.04);
    ctx.beginPath(); ctx.ellipse(cx, cy, ob.r * s, ob.r * s * this.cam.tilt, 0, 0, TAU); ctx.stroke();
    /* Die Pollen laufen auf einer Spirale, nicht auf Ringen: Ein Ring sagt nur „hier ist etwas",
       eine Spirale sagt, wohin. Der goldene Winkel verteilt sie dabei gleichmäßig, ohne dass
       Speichen entstehen. */
    for (let i = 0; i < 30; i++) {
      let u = (t * 0.32 + i / 30) % 1;
      if (zieht) u = 1 - u;
      if (bremst) u = ((i % 6) + 1) / 7;
      const rr = ob.core + (ob.r - ob.core) * u;
      const a = i * 2.39996 + (zieht ? -1 : 1) * t * 0.6;
      const [px, py] = this.proj(ob.x + Math.cos(a) * rr, ob.y + Math.sin(a) * rr, 0.01);
      ctx.fillStyle = `rgba(${col},${0.25 + 0.5 * (1 - Math.abs(u - 0.5) * 1.6)})`;
      ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * 0.045), 0, TAU); ctx.fill();
    }
  },

  drawPollenstrudel(ctx, ob, t) {
    const s = this.scale;
    const zieht = !ob.slow && ob.strength > 0, bremst = !!ob.slow;
    const [cx, cy] = this.proj(ob.x, ob.y, 0);
    const [, obenPx] = this.proj(ob.x, ob.y, ob.core * 1.4 + 1.0);
    const hPx = Math.max(s * 0.6, cy - obenPx);
    const wiegen = Math.sin(t * 1.1 + ob.x) * s * 0.06;
    const kx = cx + wiegen, ky = cy - hPx;
    // Stiel und zwei Blätter
    ctx.strokeStyle = '#3f7c2e'; ctx.lineWidth = Math.max(1.5, s * 0.055); ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.quadraticCurveTo(cx, cy - hPx * 0.5, kx, ky); ctx.stroke();
    ctx.fillStyle = '#4e9435';
    for (const sd of [-1, 1]) {
      ctx.beginPath(); ctx.moveTo(cx, cy - hPx * 0.08);
      ctx.quadraticCurveTo(cx + sd * s * 0.35, cy - hPx * 0.3, cx + sd * s * 0.5, cy - hPx * 0.06);
      ctx.quadraticCurveTo(cx + sd * s * 0.3, cy - hPx * 0.04, cx, cy - hPx * 0.08);
      ctx.closePath(); ctx.fill();
    }
    // Die Kugel aus Schirmchen. Sie atmet: beim Ziehen zieht sie sich zusammen, beim Stoßen bläst sie aus.
    const atem = bremst ? 1 : zieht ? 1 - 0.1 * (0.5 + 0.5 * Math.sin(t * 2.2)) : 1 + 0.12 * (0.5 + 0.5 * Math.sin(t * 2.2));
    const kr = s * (ob.core * 1.0 + 0.3) * atem;
    const glut = ctx.createRadialGradient(kx, ky, 0, kx, ky, kr * 1.5);
    glut.addColorStop(0, bremst ? 'rgba(200,230,160,0.5)' : 'rgba(255,230,140,0.5)');
    glut.addColorStop(1, 'rgba(255,230,140,0)');
    ctx.fillStyle = glut; ctx.beginPath(); ctx.arc(kx, ky, kr * 1.5, 0, TAU); ctx.fill();
    ctx.strokeStyle = bremst ? 'rgba(226,240,200,0.85)' : 'rgba(255,248,214,0.85)';
    ctx.lineWidth = Math.max(1, s * 0.02);
    for (let i = 0; i < 30; i++) {
      const a = i * 2.39996 + (zieht ? -1 : 1) * t * 0.5;
      const lang = kr * (0.72 + 0.28 * (((i * 7) % 5) / 5));
      const ex = kx + Math.cos(a) * lang, ey = ky + Math.sin(a) * lang * 0.9;
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(ex, ey); ctx.stroke();
      ctx.fillStyle = bremst ? '#dcecc0' : '#fff3c8';
      ctx.beginPath(); ctx.arc(ex, ey, Math.max(1, s * 0.03), 0, TAU); ctx.fill();
    }
    ctx.fillStyle = '#8a6a2a'; ctx.beginPath(); ctx.arc(kx, ky, Math.max(1.5, s * 0.06), 0, TAU); ctx.fill();
    // Einzelne Schirmchen, die schon unterwegs sind – nach innen oder nach außen, je nach Sog
    for (let i = 0; i < 5; i++) {
      let u = (t * 0.5 + i / 5) % 1; if (zieht) u = 1 - u;
      const a = i * 1.257 + t * 0.4;
      const rr = ob.core + (ob.r - ob.core) * u * 0.7;
      const [px, py] = this.proj(ob.x + Math.cos(a) * rr, ob.y + Math.sin(a) * rr, 0.5 + 0.4 * Math.sin(t * 2 + i));
      ctx.fillStyle = `rgba(255,248,214,${0.8 * (1 - u)})`;
      ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * 0.05), 0, TAU); ctx.fill();
    }
  },

  /* ================= Die Riesen-Sonnenblume (Drehscheibe) =================
     Der Ball rollt auf den Blütenboden, wird herumgetragen und an einer Stelle wieder
     ausgespuckt. Als Zahnrad war das eine Maschine; als Blütenkorb ist es dasselbe Gerät, nur im
     Garten gewachsen. Die Kerne im Korb liegen in der echten Spirale der Sonnenblume – und weil
     sie sich mitdrehen, sieht man die Drehung auch dann, wenn kein Ball darauf liegt. */
  drawSonnenblumeFloor(ctx, ob, t) {
    const s = this.scale, R = ob.r * s;
    const [cx, cy] = this.proj(ob.x, ob.y, 0.008);
    this.isoEllipse(ctx, ob.x, ob.y, 0.003, ob.r + 0.3, 'rgba(24,48,20,0.42)');
    ctx.save(); ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt);

    const blatt = (a, r0, r1, w) => {
      const ca = Math.cos(a), sa = Math.sin(a), px = -sa, py = ca;
      ctx.beginPath();
      ctx.moveTo(ca * r0 - px * w * 0.45, sa * r0 - py * w * 0.45);
      ctx.quadraticCurveTo(ca * r1 * 0.82 - px * w, sa * r1 * 0.82 - py * w, ca * r1, sa * r1);
      ctx.quadraticCurveTo(ca * r1 * 0.82 + px * w, sa * r1 * 0.82 + py * w, ca * r0 + px * w * 0.45, sa * r0 + py * w * 0.45);
      ctx.closePath();
    };
    // Zwei Kränze Blütenblätter, gegeneinander versetzt – ein Kranz allein sieht aus wie ein Zahnrad
    for (const [n, r0, r1, w, fuell, rand, ver] of [
      [16, R * 0.84, R * 1.34, R * 0.16, '#e8951a', '#a35c07', 0.5],
      [16, R * 0.8, R * 1.18, R * 0.15, '#ffd24a', '#c8790c', 0],
    ]) {
      ctx.fillStyle = fuell; ctx.strokeStyle = rand; ctx.lineWidth = Math.max(1, s * 0.025);
      for (let i = 0; i < n; i++) { blatt(ob.angle + (i + ver) * (TAU / n), r0, r1, w); ctx.fill(); ctx.stroke(); }
    }
    // Der Blütenboden, auf dem der Ball fährt
    const g = ctx.createRadialGradient(-R * 0.3, -R * 0.3, R * 0.05, 0, 0, R * 0.92);
    g.addColorStop(0, '#8a6030'); g.addColorStop(0.6, '#5c3d1c'); g.addColorStop(1, '#3a2510');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, R * 0.88, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#2a1a0a'; ctx.lineWidth = Math.max(1.5, s * 0.05); ctx.stroke();
    // Die Kerne in der Spirale der Sonnenblume
    for (let i = 1; i <= 96; i++) {
      const rr = R * 0.82 * Math.sqrt(i / 96), a = i * 2.39996 + ob.angle;
      ctx.fillStyle = i % 2 ? 'rgba(42,26,10,0.9)' : 'rgba(112,78,38,0.85)';
      ctx.beginPath(); ctx.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, R * 0.05, R * 0.032, a, 0, TAU); ctx.fill();
    }
    ctx.restore();

    /* Die Auswurfstelle: zwei Blätter als Rinne, dort wo der Ball die Blüte verlässt. Ohne sie
       wäre die einzige Frage der Bahn – „wo komme ich wieder raus?" – nicht zu beantworten. */
    const ex = Math.cos(ob.exitA), ey = Math.sin(ob.exitA), nx = -ey, ny = ex;
    ctx.fillStyle = '#2f6b24'; ctx.strokeStyle = '#a8e07a'; ctx.lineWidth = Math.max(1.5, s * 0.045);
    for (const sd of [-1, 1]) {
      // Sie müssen ÜBER den Blütenblättern hinausragen, sonst liegen sie darunter und niemand sieht sie
      const p0 = this.proj(ob.x + ex * (ob.r * 1.1) + nx * sd * 0.34, ob.y + ey * (ob.r * 1.1) + ny * sd * 0.34, 0.014);
      const p1 = this.proj(ob.x + ex * (ob.r + 1.05) + nx * sd * 0.4, ob.y + ey * (ob.r + 1.05) + ny * sd * 0.4, 0.014);
      const p2 = this.proj(ob.x + ex * (ob.r + 0.5) + nx * sd * 1.05, ob.y + ey * (ob.r + 0.5) + ny * sd * 1.05, 0.014);
      ctx.beginPath(); ctx.moveTo(p0[0], p0[1]);
      ctx.quadraticCurveTo(p2[0], p2[1], p1[0], p1[1]);
      ctx.quadraticCurveTo((p0[0] + p1[0]) / 2, (p0[1] + p1[1]) / 2, p0[0], p0[1]);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
    // Laufrichtung: drei Pollenkörner, die dem Korb voraus fliegen
    const d = Math.sign(ob.speed) || 1;
    ctx.fillStyle = 'rgba(255,236,150,0.9)';
    for (let i = 0; i < 3; i++) {
      const a = ob.angle + i * (TAU / 3) + TAU / 12;
      const p1 = this.proj(ob.x + Math.cos(a + 0.26 * d) * ob.r * 0.66, ob.y + Math.sin(a + 0.26 * d) * ob.r * 0.66, 0.012);
      const p2 = this.proj(ob.x + Math.cos(a) * (ob.r * 0.66 + 0.16), ob.y + Math.sin(a) * (ob.r * 0.66 + 0.16), 0.012);
      const p3 = this.proj(ob.x + Math.cos(a) * (ob.r * 0.66 - 0.16), ob.y + Math.sin(a) * (ob.r * 0.66 - 0.16), 0.012);
      ctx.beginPath(); ctx.moveTo(p2[0], p2[1]); ctx.lineTo(p1[0], p1[1]); ctx.lineTo(p3[0], p3[1]); ctx.closePath(); ctx.fill();
    }
  },

  /* ================= Die Maulwurfshügel =================
     Dieselbe Maschine wie die Zauberhüte, in der Sprache eines Gartens: Man rollt in einen Hügel
     und kommt aus dem heraus, in dem der Maulwurf gerade steckt.

     WARUM NICHT DIE HÜTE. Ein Hutständer mitten im Beet war eine Maschine, die nur deshalb im
     Garten stand, weil die Welt zufällig zum Zauberreich gehört – man sah ihr an, daß sie von
     woanders herkam. Ein Maulwurfshügel gehört dorthin, wo Erde ist, und er erklärt sich von
     selbst: Wo der Maulwurf gerade herausschaut, kommt auch der Ball heraus.

     DER ZUSTAND STEHT AM MAULWURF. Beim aktiven Hügel schaut er heraus; beim nächsten, der gleich
     dran ist, wackelt die Erde und es rieseln Krümel. Das ist dieselbe Ansage wie das Glimmen der
     Hüte, nur muß sie hier niemand erst lernen. */
  drawMaulwurfFloor(ctx, ob, t) {
    if (!ob.bereit) return;
    const s = this.scale;
    for (let i = 0; i < ob.orte.length; i++) {
      const [hx, hy] = ob.orte[i];
      const an = i === ob.aktiv, gleich = i === ob.naechste ? ob.gleich : 0;
      const hell = an ? 1 : gleich;
      // Die aufgeworfene Erde ringsum – sie liegt flach und gehört zum Boden
      this.isoEllipse(ctx, hx, hy, 0.003, ob.r * 2.6, 'rgba(58,40,22,0.30)');
      this.isoEllipse(ctx, hx, hy, 0.004, ob.r * 2.0, 'rgba(78,54,28,0.42)');
      if (hell < 0.02) continue;
      // Frisch geworfene Krümel: Sie rieseln, kurz bevor er durchbricht
      ctx.fillStyle = `rgba(96,66,34,${0.35 + 0.5 * hell})`;
      for (let k = 0; k < 7; k++) {
        const a = t * 0.8 + k * (TAU / 7), rr = ob.r * (2.0 + 0.5 * Math.sin(t * 2.4 + k));
        const [sx, sy] = this.proj(hx + Math.cos(a) * rr, hy + Math.sin(a) * rr, 0.008);
        ctx.beginPath(); ctx.arc(sx, sy, s * 0.06 * (0.5 + hell), 0, TAU); ctx.fill();
      }
    }
  },

  drawMaulwurfshuegel(ctx, ob, t) {
    if (!ob.bereit) return;
    const s = this.scale;
    for (let i = 0; i < ob.orte.length; i++) {
      const [hx, hy] = ob.orte[i];
      const an = i === ob.aktiv, gleich = i === ob.naechste ? ob.gleich : 0;
      const hell = an ? 1 : gleich;
      const R = ob.r * 2.3;
      /* Der Hügel. Er zittert, wenn der Maulwurf gleich kommt – eine Kuppe, die sich um ein paar
         Hundertstel hebt und senkt, reicht dafür völlig und fällt sofort ins Auge. */
      const zitter = gleich > 0.02 ? Math.sin(t * 22) * 0.05 * gleich : 0;
      const hoch = 0.5 + zitter;
      this.isoEllipse(ctx, hx, hy, 0.005, R * 1.05, 'rgba(0,0,0,0.22)');
      for (const [f, z, deck, seite] of [[1.0, 0, '#6b4a24', '#3a2712'], [0.72, hoch * 0.52, '#7c5628', '#432d14']]) {
        this.prism(ctx, this.circlePoly(hx, hy, R * f, 12), z, hoch * 0.55, deck, seite, { outline: '#241708' });
      }
      // Das Loch oben in der Kuppe – dort verschwindet der Ball
      this.isoEllipse(ctx, hx, hy, hoch * 1.07 + 0.01, ob.r * 1.15, '#1c1208');
      this.isoEllipse(ctx, hx, hy, hoch * 1.07 + 0.02, ob.r * 0.82, '#0d0804');

      /* Der Maulwurf. Er kommt heraus, wenn dieser Hügel dran ist, und ist sonst nicht zu sehen.
         Wie weit er heraus ist, ist zugleich die Anzeige: halb heraus heißt „gleich", ganz heraus
         heißt „jetzt". */
      const raus = an ? 1 : gleich * 0.45;
      if (raus < 0.05) continue;
      const kopfZ = hoch * 1.07 + 0.1 + raus * 0.34;
      const [kx, ky] = this.proj(hx, hy, kopfZ);
      const kr = s * ob.r * 0.9;
      ctx.beginPath(); ctx.ellipse(kx, ky, kr, kr * 0.92, 0, 0, TAU);
      ctx.fillStyle = '#4a4148'; ctx.fill();
      ctx.strokeStyle = '#241f24'; ctx.lineWidth = Math.max(1, s * 0.04); ctx.stroke();
      // Schnauze, Nase, zwei Augenschlitze – mehr braucht ein Maulwurf nicht
      ctx.beginPath(); ctx.ellipse(kx, ky + kr * 0.38, kr * 0.52, kr * 0.4, 0, 0, TAU);
      ctx.fillStyle = '#5c525a'; ctx.fill();
      ctx.fillStyle = '#e88fa6';
      ctx.beginPath(); ctx.ellipse(kx, ky + kr * 0.62, kr * 0.2, kr * 0.15, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = '#1a151a'; ctx.lineWidth = Math.max(1, s * 0.035); ctx.lineCap = 'round';
      for (const sd of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(kx + sd * kr * 0.46, ky - kr * 0.12);
        ctx.lineTo(kx + sd * kr * 0.2, ky - kr * 0.12);
        ctx.stroke();
      }
      // Die beiden Grabschaufeln, wenn er ganz heraus ist
      if (raus > 0.8) {
        ctx.fillStyle = '#d6b98a';
        for (const sd of [-1, 1]) {
          ctx.beginPath();
          ctx.ellipse(kx + sd * kr * 1.05, ky + kr * 0.5, kr * 0.38, kr * 0.28, sd * 0.4, 0, TAU);
          ctx.fill();
          ctx.strokeStyle = '#8a7250'; ctx.lineWidth = Math.max(1, s * 0.03); ctx.stroke();
        }
      }
    }
  },

});
