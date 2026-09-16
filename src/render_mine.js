/* Zeichnung der Zwergenmine: Dunkelheit, Grubenlampe, Sprengladung, Kippbühne.

   Leitgedanke wie in den anderen Welten: Was wirkt, muss man sehen, und zwar *bevor* es wirkt.
   Bei der Sprengladung heißt das zweierlei – man muss sehen, wie lange die Lunte noch brennt, und
   man muss sehen, wie weit der Druck reicht. Beides steht darum auf dem Boden, nicht am Fass: Der
   Kreis auf dem Gestein ist die eigentliche Ansage, das Fass ist nur das Bild dazu.

   Bei der Kippbühne ist die Neigung selbst die Ansage. Sie wird nicht angedeutet, sondern
   gezeichnet: Die Bohle steht wirklich schief, und zwar in genau dem Maß, in dem sie auch schiebt. */
Object.assign(Renderer.prototype, {

  /* ---------- Dunkelheit ---------- */
  /* Der Schleier über einer dunklen Bahn. Er wird nicht als ein weicher Verlauf gezeichnet,
     sondern als drei gestaffelte Lagen mit je einem Loch: Das kommt ohne zweite Leinwand aus
     (evenodd macht aus dem Kreis ein Loch im Rechteck) und ergibt trotzdem einen weichen Rand,
     weil die Löcher verschieden groß sind.

     Aufgehellt wird um den Ball und um jede Grubenlampe. Der Ball ist immer dabei – wer gar nichts
     sieht, spielt nicht, sondern rät. */
  drawDunkelheit(ctx, state) {
    const lv = this.level, staerke = lv && lv.def ? lv.def.dunkel : 0;
    if (!staerke) return;
    const lichter = [];
    const b = state.ball;
    if (b && !b.sunk) lichter.push({ x: b.x, y: b.y, r: lv.def.lampe || 3.0 });
    for (const ob of lv.obstacles) {
      if (ob.type !== 'grubenlampe' || (ob.ebene || 0) !== (lv.ebene || 0)) continue;
      lichter.push({ x: ob.x, y: ob.y, r: ob.r });
    }
    /* Fünf Lagen mit immer kleinerem Loch. Drei waren zu wenig – man sah die Ringe einzeln, und
       das Licht wirkte gestapelt statt gestreut. */
    const lagen = [1, 0.87, 0.73, 0.58, 0.42];
    ctx.save();
    for (const f of lagen) {
      ctx.beginPath();
      ctx.rect(0, 0, this.w, this.h);
      for (const l of lichter) {
        const [sx, sy] = this.proj(l.x, l.y, 0);
        const rx = l.r * f * this.scale;
        ctx.moveTo(sx + rx, sy);
        ctx.ellipse(sx, sy, rx, rx * this.cam.tilt, 0, 0, TAU);
      }
      ctx.fillStyle = `rgba(6,4,10,${staerke / lagen.length})`;
      ctx.fill('evenodd');
    }
    ctx.restore();
  },

  /* ---------- Grubenlampe ---------- */
  /* Auf dem Boden der Lichtkegel, damit man auch bei Tageslicht sieht, wie weit sie reicht. */
  drawGrubenlampeFloor(ctx, ob, t) {
    const fl = 0.9 + 0.1 * Math.sin(t * 2.6 + ob.x);
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, ob.r * 0.92, rgba(this.theme.accent, 0.07 * fl));
    this.isoEllipse(ctx, ob.x, ob.y, 0.005, ob.r * 0.55, rgba(this.theme.accent, 0.07 * fl));
  },
  drawGrubenlampe(ctx, ob, t) {
    const s = this.scale, fl = 0.88 + 0.12 * Math.sin(t * 2.6 + ob.x) * Math.sin(t * 1.7 + ob.y);
    // Pfosten aus Grubenholz mit Querarm
    this.saeule(ctx, ob.x, ob.y, 0, 0.1, 0.08, 1.05, '#4a3627', '#33251a', 6);
    const [ax, ay] = this.proj(ob.x, ob.y, 1.05), [bx, by] = this.proj(ob.x, ob.y, 0.98);
    ctx.strokeStyle = '#33251a'; ctx.lineWidth = Math.max(1, s * 0.05);
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ax + s * 0.22, ay - s * 0.02); ctx.stroke();
    // Laterne: Gehäuse, Glas, Schein
    const lx = ax + s * 0.22, ly = ay + s * 0.12;
    ctx.fillStyle = '#5b5a63';
    ctx.beginPath(); ctx.moveTo(lx - s * 0.11, ly - s * 0.1); ctx.lineTo(lx + s * 0.11, ly - s * 0.1);
    ctx.lineTo(lx + s * 0.08, ly + s * 0.12); ctx.lineTo(lx - s * 0.08, ly + s * 0.12); ctx.closePath(); ctx.fill();
    const g = ctx.createRadialGradient(lx, ly, 0, lx, ly, s * 0.5);
    g.addColorStop(0, rgba(this.theme.accent, 0.85 * fl)); g.addColorStop(0.35, rgba(this.theme.accent, 0.3 * fl)); g.addColorStop(1, rgba(this.theme.accent, 0));
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(lx, ly, s * 0.5, 0, TAU); ctx.fill();
    ctx.fillStyle = rgba(this.theme.accent, 0.95); ctx.beginPath(); ctx.arc(lx, ly, s * 0.07 * fl, 0, TAU); ctx.fill();
    // Dach über dem Glas, damit sie wie eine Lampe und nicht wie ein Feuer aussieht
    ctx.fillStyle = '#3f3e46';
    ctx.beginPath(); ctx.moveTo(lx - s * 0.14, ly - s * 0.1); ctx.lineTo(lx + s * 0.14, ly - s * 0.1); ctx.lineTo(lx, ly - s * 0.2); ctx.closePath(); ctx.fill();
  },

  /* ---------- Sprengladung ---------- */
  /* Der Kreis auf dem Gestein ist die Ansage: So weit reicht der Druck. Er füllt sich, während die
     Lunte brennt – wer den Kreis leer sieht, hat Zeit; wer ihn voll sieht, sollte nicht mehr
     darin liegen. Beim Knall läuft eine helle Welle nach außen. */
  drawSprengladungFloor(ctx, ob, t) {
    const R = ob.weite;
    // Umriss der Reichweite, immer sichtbar
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, R, 'rgba(255,90,40,0.07)');
    if (ob.lunte > 0) {
      const p = ob.lunte;
      this.isoEllipse(ctx, ob.x, ob.y, 0.005, R * (0.25 + 0.75 * p), `rgba(255,${Math.round(150 - 90 * p)},50,${0.1 + 0.22 * p})`);
    }
    if (ob.blitz > 0) {
      const q = 1 - ob.blitz;                       // 0 = gerade geknallt, 1 = verklungen
      this.isoEllipse(ctx, ob.x, ob.y, 0.006, R * (0.3 + 0.9 * q), `rgba(255,220,150,${0.5 * ob.blitz})`);
    }
  },
  drawSprengladung(ctx, ob, t) {
    const s = this.scale;
    // Pulverfass: dunkles Holz mit zwei Eisenbändern
    this.saeule(ctx, ob.x, ob.y, 0, 0.34, 0.3, 0.52, '#4a3a2a', '#2f241a', 10);
    ctx.strokeStyle = '#6a6a72'; ctx.lineWidth = Math.max(1, s * 0.035);
    for (const z of [0.16, 0.4]) {
      const [cx, cy] = this.proj(ob.x, ob.y, z);
      ctx.beginPath(); ctx.ellipse(cx, cy, s * 0.33, s * 0.33 * this.cam.tilt, 0, 0, TAU); ctx.stroke();
    }
    /* Die Lunte: Sie wird kürzer, je näher der Knall kommt, und ihr Ende glüht. Beides zusammen
       liest sich schneller als eine Zahl – man sieht aus dem Augenwinkel, wie viel Schnur noch da
       ist. */
    const [ox, oy] = this.proj(ob.x, ob.y, 0.52);
    const rest = 1 - ob.lunte;
    const L = s * 0.5 * Math.max(0.08, rest);
    ctx.strokeStyle = '#6b5a3a'; ctx.lineWidth = Math.max(1, s * 0.03);
    ctx.beginPath(); ctx.moveTo(ox, oy);
    ctx.quadraticCurveTo(ox + L * 0.5, oy - L * 0.8, ox + L * 0.2, oy - L);
    ctx.stroke();
    if (ob.lunte > 0) {
      const gl = 0.6 + 0.4 * Math.sin(t * 22);
      ctx.fillStyle = `rgba(255,${Math.round(190 - 60 * ob.lunte)},60,${gl})`;
      ctx.beginPath(); ctx.arc(ox + L * 0.2, oy - L, s * (0.05 + 0.03 * gl), 0, TAU); ctx.fill();
    }
    // Der Knall selbst: greller Ball, der in einem Wimpernschlag verglüht
    if (ob.blitz > 0) {
      const [bx, by] = this.proj(ob.x, ob.y, 0.4);
      const r = s * (0.3 + 1.5 * (1 - ob.blitz));
      const g = ctx.createRadialGradient(bx, by, 0, bx, by, r);
      g.addColorStop(0, `rgba(255,245,210,${0.9 * ob.blitz})`);
      g.addColorStop(0.4, `rgba(255,160,50,${0.6 * ob.blitz})`);
      g.addColorStop(1, 'rgba(255,120,30,0)');
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(bx, by, r, 0, TAU); ctx.fill();
    }
  },

  /* ---------- Kippbühne ---------- */
  /* Die Bohle wird wirklich schief gezeichnet: Beide Enden bekommen ihre eigene Höhe, und zwar
     genau nach dem Wert, mit dem die Bühne auch schiebt. Darunter der Bock, auf dem sie ruht –
     ohne ihn sähe die schwebende Planke nach Fehler aus. */
  drawKippbuehne(ctx, ob, t) {
    const n = ob.neigung || 0, hub = 0.22, dick = 0.13;
    const dx = ob.dx, dy = ob.dy, qx = -dy, qy = dx;
    const halb = ob.halb, breit = (Math.abs(qx) * ob.w + Math.abs(qy) * ob.h) / 2;
    const p = (u, v, z) => this.proj(ob.cx + dx * u + qx * v, ob.cy + dy * u + qy * v, z);
    const zA = 0.2 - n * hub, zB = 0.2 + n * hub;     // hinteres und vorderes Ende
    const zu = (u) => zA + (zB - zA) * ((u + halb) / (2 * halb));
    const quad = (pts, farbe, strich) => {
      ctx.beginPath(); pts.forEach((e, i) => (i ? ctx.lineTo(e[0], e[1]) : ctx.moveTo(e[0], e[1]))); ctx.closePath();
      ctx.fillStyle = farbe; ctx.fill();
      if (strich) { ctx.strokeStyle = strich; ctx.lineWidth = 1.2; ctx.stroke(); }
    };
    // Schatten und Bock: ohne sie schwebte die Bohle
    this.isoEllipse(ctx, ob.cx, ob.cy, 0.004, breit * 1.05, 'rgba(0,0,0,0.3)');
    this.saeule(ctx, ob.cx, ob.cy, 0, breit * 0.4, breit * 0.28, 0.2 - Math.abs(n) * 0.02, '#6b4a28', '#3a2818', 6);
    /* Die Bohle als Körper, nicht als Strich: zuerst die beiden sichtbaren Schmalseiten, dann die
       Deckfläche. Erst dadurch liest man die Neigung auch dann, wenn man von schräg oben schaut. */
    const oben = [p(-halb, -breit, zA), p(halb, -breit, zB), p(halb, breit, zB), p(-halb, breit, zA)];
    const unten = [p(-halb, -breit, zA - dick), p(halb, -breit, zB - dick), p(halb, breit, zB - dick), p(-halb, breit, zA - dick)];
    for (const [i, j] of [[0, 1], [1, 2], [2, 3], [3, 0]]) {
      const mx = (oben[i][0] + oben[j][0]) / 2;
      // nur die Kanten zeichnen, die zur Kamera zeigen - sonst malt man die Rückseite über die Front
      if (oben[i][1] + oben[j][1] < unten[i][1] + unten[j][1] - 0.5) continue;
      quad([oben[i], oben[j], unten[j], unten[i]], '#5e4022');
    }
    quad(oben, '#b98a52', '#3a2818');
    // Bohlen quer zur Achse: an ihrem Abstand liest man die Neigung ab
    ctx.strokeStyle = 'rgba(58,40,24,0.45)'; ctx.lineWidth = 1.2;
    const bohlen = Math.max(3, Math.round(halb * 2.2));
    for (let i = 1; i < bohlen; i++) {
      const u = -halb + (2 * halb * i) / bohlen;
      const a = p(u, -breit, zu(u)), b = p(u, breit, zu(u));
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
    /* Das angehobene Ende bekommt eine helle Kante, das abgesenkte eine dunkle. Damit sieht man
       auf einen Blick, wohin die Bühne gerade schiebt – auch aus der Ferne, wo der Höhenunterschied
       allein zu klein zum Ablesen wäre. */
    for (const [u, z, hell] of [[-halb, zA, n < 0], [halb, zB, n > 0]]) {
      const a = p(u, -breit, z), b = p(u, breit, z);
      ctx.strokeStyle = hell && Math.abs(n) > 0.08 ? 'rgba(255,225,170,0.9)' : '#4a3a2a';
      ctx.lineWidth = Math.max(1.5, this.scale * 0.05);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    }
  },
});
