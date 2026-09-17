/* Zeichnung der Zwergenmine: Dunkelheit, Grubenlampe, Sprengladung, Kippbühne.

   Leitgedanke wie in den anderen Welten: Was wirkt, muss man sehen, und zwar *bevor* es wirkt.
   Bei der Sprengladung heißt das zweierlei – man muss sehen, wie lange die Lunte noch brennt, und
   man muss sehen, wie weit der Druck reicht. Beides steht darum auf dem Boden, nicht am Fass: Der
   Kreis auf dem Gestein ist die eigentliche Ansage, das Fass ist nur das Bild dazu.

   Bei der Kippbühne ist die Neigung selbst die Ansage. Sie wird nicht angedeutet, sondern
   gezeichnet: Die Bohle steht wirklich schief, und zwar in genau dem Maß, in dem sie auch schiebt. */
Object.assign(Renderer.prototype, {

  /* ---------- Dunkelheit ---------- */
  /* Der Schleier über einer dunklen Bahn. Gezeichnet wird er auf einer zweiten, unsichtbaren
     Leinwand: erst überall dunkel, dann wird an jedem Licht ein Loch *hineingewischt* – mit einem
     Farbverlauf, der nach außen hin dichter wird ('destination-out' löscht so viel, wie der
     Verlauf deckt). Danach kommt das Ganze in einem Zug auf das Bild.

     Vorher lagen dafür fünf Lagen mit je einem harten Loch übereinander. Das ergab genau fünf
     sichtbare Ringe: Um Ball und Laterne stand eine Zielscheibe statt eines Lichtscheins. Mit dem
     Verlauf gibt es keine Stufen mehr, und überlappende Lichter addieren sich von selbst richtig,
     statt sich gegenseitig aufzuhellen.

     Aufgehellt wird um den Ball und um jede Grubenlampe. Der Ball ist immer dabei – wer gar nichts
     sieht, spielt nicht, sondern rät. */
  drawDunkelheit(ctx, state) {
    const lv = this.level, staerke = lv && lv.def ? lv.def.dunkel : 0;
    if (!staerke) return;
    const lichter = [];
    const b = state.ball;
    if (b && !b.sunk) lichter.push({ x: b.x, y: b.y, r: lv.def.lampe || 3.0 });
    for (const ob of lv.obstacles) {
      if ((ob.ebene || 0) !== (lv.ebene || 0)) continue;
      if (ob.type === 'grubenlampe') { lichter.push({ x: ob.x, y: ob.y, r: ob.r }); continue; }
      /* Der Schmelzofen brennt, also leuchtet er auch. Ein Feuer, das Licht malt und keins gibt,
         wäre Kulisse; so ist der Ofen zugleich die Lampe seines Abschnitts. */
      if (ob.type === 'windmill' && ob.style === 'ofen') lichter.push({ x: ob.x, y: ob.y, r: ob.licht || 4.4 });
    }
    /* Die zweite Leinwand wird einmal angelegt und danach nur noch neu bemalt – ein neues
       Canvas je Bild wäre bei sechzig Bildern in der Sekunde Arbeit für nichts. */
    const px = Math.round(this.w * this.dpr), py = Math.round(this.h * this.dpr);
    if (!this.dunkelBild || this.dunkelBild.width !== px || this.dunkelBild.height !== py) {
      this.dunkelBild = document.createElement('canvas');
      this.dunkelBild.width = px; this.dunkelBild.height = py;
      this.dunkelCtx = this.dunkelBild.getContext('2d');
    }
    /* Die zweite Leinwand hat so viele Bildpunkte wie die echte, rechnet aber in denselben
       Einheiten – sonst wäre der Schleier auf einem feinen Schirm weichgezogen. */
    const d = this.dunkelCtx;
    d.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    d.globalCompositeOperation = 'source-over';
    d.clearRect(0, 0, this.w, this.h);
    d.fillStyle = `rgba(6,4,10,${staerke})`;
    d.fillRect(0, 0, this.w, this.h);
    d.globalCompositeOperation = 'destination-out';
    for (const l of lichter) {
      const [sx, sy] = this.proj(l.x, l.y, 0);
      const r = l.r * this.scale;
      /* Der Kern ist voll frei, nach außen geht das Licht weich aus. Der Boden ist schräg gesehen,
         darum wird der Kreis in der Höhe gestaucht – sonst läge ein runder Fleck auf einem
         schrägen Boden. */
      d.save();
      d.translate(sx, sy); d.scale(1, this.cam.tilt); d.translate(-sx, -sy);
      const g = d.createRadialGradient(sx, sy, 0, sx, sy, r);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.45, 'rgba(0,0,0,0.92)');
      g.addColorStop(0.78, 'rgba(0,0,0,0.45)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      d.fillStyle = g;
      d.beginPath(); d.arc(sx, sy, r, 0, TAU); d.fill();
      d.restore();
    }
    d.globalCompositeOperation = 'source-over';
    ctx.drawImage(this.dunkelBild, 0, 0, this.w, this.h);
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
  /* ---------- Bruchwand ----------
     Solange sie steht, ist sie ein Pfeiler stehengebliebenen Felses quer im Gang – mit einem
     gebohrten Loch darin und einem Kreidezeichen daneben. Beides sagt dasselbe: **Hier wird
     gesprengt.** Ohne diese Ansage wäre die Wand nur eine Wand, und dass man vor ihr warten muss,
     erführe man erst durch Zufall.

     Gesprengt bleibt ein flacher Schutthaufen liegen, über den man rollt. Weggezaubert wird sie
     nicht: Ein Pfeiler, der spurlos verschwindet, sieht aus wie ein Fehler; ein Haufen Bruchstein
     erzählt, was passiert ist.

     Auf dem Boden liegt beides – das ist der Unterschied zum Block. Eine Wand, die nur in der
     Höhe steht, deckt bei dieser Kameraneigung den Gang dahinter zu. */
  drawBruchwandFloor(ctx, ob, t) {
    const z = 0;   // die Ebene steckt jetzt im Versatz der Leinwand (Renderer.zeichneEbenenDinge)
    const hw = ob.w / 2, hh = ob.h / 2;
    const eck = [[ob.x - hw, ob.y - hh], [ob.x + hw, ob.y - hh], [ob.x + hw, ob.y + hh], [ob.x - hw, ob.y + hh]];
    if (!ob.weg) return;
    // Gesprengt: Bruchstein auf dem Gang, ein paar Brocken darin
    this.fillPoly(ctx, eck, z + 0.01, 'rgba(70,62,52,0.55)', false);
    for (let i = 0; i < 9; i++) {
      const h1 = Math.abs(Math.sin(i * 91.7 + ob.x * 3.1) * 43758.5453) % 1;
      const h2 = Math.abs(Math.sin(i * 47.3 + ob.y * 7.7) * 43758.5453) % 1;
      const px = ob.x - hw + h1 * ob.w, py = ob.y - hh + h2 * ob.h;
      this.isoEllipse(ctx, px, py, z + 0.02, 0.1 + h1 * 0.16, i % 2 ? '#6b6154' : '#565046');
    }
  },
  drawBruchwand(ctx, ob, t) {
    const s = this.scale, z = 0;   // die Ebene steckt jetzt im Versatz der Leinwand (Renderer.zeichneEbenenDinge)
    const hw = ob.w / 2, hh = ob.h / 2;
    const eck = [[ob.x - hw, ob.y - hh], [ob.x + hw, ob.y - hh], [ob.x + hw, ob.y + hh], [ob.x - hw, ob.y + hh]];
    const staub = ob.staub ? ob.staub() : 0;
    if (!ob.weg) {
      /* Der Pfeiler. Etwas niedriger als eine Mauer, damit man über ihn hinweg sieht, wohin der
         Gang führt – man soll ja wissen, wofür sich das Warten lohnt. */
      this.prism(ctx, eck, z, 1.15, '#6e6659', '#3a342c', { outline: '#1d1915' });
      // Bohrloch mit Lunte-Öse und Kreidekreuz: die Ansage, dass hier gesprengt wird
      const [bx, by] = this.proj(ob.x, ob.y, z + 1.16);
      ctx.fillStyle = '#241f19';
      ctx.beginPath(); ctx.ellipse(bx, by, s * 0.13, s * 0.13 * this.cam.tilt, 0, 0, TAU); ctx.fill();
      ctx.strokeStyle = 'rgba(240,226,200,0.75)'; ctx.lineWidth = Math.max(1.5, s * 0.055);
      ctx.lineCap = 'round';
      const k = s * 0.3;
      ctx.beginPath();
      ctx.moveTo(bx - k, by - k * this.cam.tilt); ctx.lineTo(bx + k, by + k * this.cam.tilt);
      ctx.moveTo(bx + k, by - k * this.cam.tilt); ctx.lineTo(bx - k, by + k * this.cam.tilt);
      ctx.stroke();
      return;
    }
    if (staub > 0) {
      // Der Staub nach dem Bruch: Brocken, die auseinanderfliegen und ausblassen
      for (let i = 0; i < 14; i++) {
        const h = Math.abs(Math.sin(i * 127.1 + ob.x * 11.3) * 43758.5453) % 1;
        const a = (i / 14) * TAU + h;
        const d = (1 - staub) * (0.6 + h * 1.6);
        const p = this.proj(ob.x + Math.cos(a) * d, ob.y + Math.sin(a) * d, z + 0.2 + staub * 0.9);
        ctx.fillStyle = `rgba(190,176,152,${0.55 * staub})`;
        ctx.beginPath(); ctx.arc(p[0], p[1], s * (0.09 + h * 0.18), 0, TAU); ctx.fill();
      }
    }
  },

  /* ---------- Das Fass ----------
     Der Prellklotz der Mine. Vorher stand hier ein Fliegenpilz – geborgt aus der Waldwelt und im
     Stollen fehl am Platz. Ein eisenbeschlagenes Fass ist Bergwerksgerät, und es ist rund: Ein
     Prellklotz wird aus jeder Richtung getroffen, also darf er keine Vorderseite haben. Ein Hunt
     hätte eine – und auf der Lorensohle fahren schon welche.

     Gebaut aus zwei Kegelstümpfen, die sich in der Mitte zum Bauch weiten; die drei Eisenbänder
     sitzen dort, wo die beiden Hälften aneinanderstoßen, und verdecken die Naht. Beim Treffer
     staucht das Fass sich – dieselbe Zahl (sq), die den Pilz aufgebläht hat, drückt es zusammen
     und macht es dabei breiter. */
  drawFass(ctx, ob, sq) {
    const r = ob.r;
    const dick = 1 + sq * 0.16;
    const hoch = r * 1.9 * (1 - sq * 0.22);
    const bauch = r * 0.94 * dick;          // die weiteste Stelle – genau die trifft der Ball
    const ende = r * 0.68 * dick;           // Boden und Deckel
    const mitte = hoch * 0.46;
    // Der Halbmesser an einer beliebigen Höhe, damit die Bänder der Wölbung folgen
    const weite = (z) => z < mitte
      ? ende + (bauch - ende) * (z / mitte)
      : bauch + (ende - bauch) * ((z - mitte) / (hoch - mitte));
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, r * 1.06, 'rgba(0,0,0,0.32)');
    this.saeule(ctx, ob.x, ob.y, 0, ende, bauch, mitte, '#8a6134', '#6b4a2a', 12);
    this.saeule(ctx, ob.x, ob.y, mitte, bauch, ende, hoch - mitte, '#b08653', '#7d5730', 12);
    // Drei Bänder: zwei an den Enden, eins über der Naht der beiden Hälften
    for (const z of [hoch * 0.17, mitte, hoch * 0.84]) {
      const band = r * 0.15;
      this.reifen(ctx, ob.x, ob.y, z - band / 2, weite(z) * 1.04, band, '#5d646d');
    }
    /* Der Deckel als eingelassenes Rund. Er ist nur eine Spur dunkler als der Rand – ein deutlich
       dunkleres Loch sähe aus wie ein offenes Fass, und in ein offenes Fass fiele der Ball. */
    this.isoEllipse(ctx, ob.x, ob.y, hoch + 0.002, ende * 0.78, '#9a7241');
  },

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

  /* ---------- Der Gießlöffel ----------
     Die Pfanne hängt an einem Bock über dem Rand der Rinne und kippt im Takt nach vorn. Beim
     Kippen läuft ein Faden Erz heraus – der ist die Vorwarnung, und man liest an ihm ab, wann der
     Guss kommt, ohne eine Uhr zu brauchen. */
  drawGiessloeffel(ctx, ob, t) {
    const r = 0.62, neig = ob.state === 'kippen' ? Math.sin((ob.p || 0) * Math.PI * 0.5) : 0;
    const dx = (ob.rinne && ob.rinne.dx) || 0, dy = (ob.rinne && ob.rinne.dy) || 0;
    const zAchse = 1.15;
    this.isoEllipse(ctx, ob.x, ob.y, 0.004, r * 1.1, 'rgba(0,0,0,0.34)');
    // Der Bock: zwei Ständer und die Achse dazwischen
    for (const q of [-1, 1]) {
      this.saeule(ctx, ob.x - dy * q * r * 0.9, ob.y + dx * q * r * 0.9, 0, 0.14, 0.11, zAchse, '#6d747d', '#434951', 7);
    }
    /* Die Pfanne kippt um die Achse: Sie rückt zur Rinne hin und sinkt dabei ab – mehr Drehung
       braucht es nicht, um sie kippen zu sehen, und mehr ginge in dieser Abbildung auch nicht,
       weil sie keine Neigung um eine waagerechte Achse kennt. */
    const px = ob.x + dx * neig * 0.52, py = ob.y + dy * neig * 0.52;
    const pz = zAchse - neig * 0.34;
    this.saeule(ctx, px, py, pz - 0.42, r * 0.82, r, 0.42, '#7a5f42', '#4a3a28', 12);
    this.reifen(ctx, px, py, pz - 0.12, r * 1.03, 0.1, '#5d646d');
    // Das Erz in der Pfanne, hell und flach – es leuchtet den Bock von unten an
    this.isoEllipse(ctx, px, py, pz - 0.04, r * 0.8, '#ffb347');
    this.isoEllipse(ctx, px, py, pz - 0.03, r * 0.5, '#fff0c0');
    /* Der Faden beim Kippen: ein schmaler Streifen vom Pfannenrand hinunter in die Rinne. */
    if (neig > 0.15) {
      const [a0, a1] = this.proj(px + dx * r * 0.9, py + dy * r * 0.9, pz - 0.1);
      const [b0, b1] = this.proj(px + dx * (r * 0.9 + 0.5), py + dy * (r * 0.9 + 0.5), 0.05);
      ctx.strokeStyle = 'rgba(255,170,60,0.85)';
      ctx.lineWidth = Math.max(1.5, this.scale * 0.07 * neig);
      ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
    }
  },

  /* Die Rinne im Boden: Was erkaltet ist, ist dunkles Erz mit einer Naht an der Bruchstelle; das
     zuletzt gegossene Feld glüht aus. Gezeichnet wird über den Belag, den die Karte schon gelegt
     hat – die Kachel selbst steht dort je nach Stand auf Glut oder auf Boden. */
  drawGussFloor(ctx, ob, t) {
    const felder = ob.felder ? ob.felder() : [];
    for (let i = 0; i < felder.length; i++) {
      const [fx, fy] = felder[i];
      if (i >= ob.gefuellt) continue;                       // noch nicht gegossen: die Glut der Karte steht
      const h = ob.hitze ? ob.hitze(i) : 0;
      const poly = [[fx, fy], [fx + 1, fy], [fx + 1, fy + 1], [fx, fy + 1]];
      // Erkaltetes Erz: dunkel, körnig, mit einem letzten Schimmer in den Fugen
      this.fillPoly(ctx, poly, 0.012, h > 0 ? mixHex('#3a2f28', '#ffb03a', h) : '#3a2f28');
      ctx.save();
      this.pathPoly(ctx, poly, 0.013); ctx.clip();
      ctx.strokeStyle = h > 0 ? `rgba(255,196,110,${0.5 + h * 0.45})` : 'rgba(196,110,60,0.35)';
      ctx.lineWidth = Math.max(1, this.scale * 0.035);
      for (let k = 0; k < 3; k++) {
        const u = 0.25 + k * 0.25;
        const [a0, a1] = this.proj(fx + u, fy + 0.08, 0.014), [b0, b1] = this.proj(fx + u - 0.16, fy + 0.92, 0.014);
        ctx.beginPath(); ctx.moveTo(a0, a1); ctx.lineTo(b0, b1); ctx.stroke();
      }
      ctx.restore();
    }
  },

  /* ---------------------------------------------------------------------------
     Der Schmelzofen
     ---------------------------------------------------------------------------
     Es ist dieselbe Maschine wie die Windmühle im Märchenland: ein Haus quer über dem Weg, ein
     Durchgang in der Mitte, der im Takt zugeht. Nur wäre ein Windrad sechshundert Meter unter Tage
     Unsinn - hier weht nichts.

     Also dieselbe Frage (*wann* gehe ich durch?), nur in der Sprache der Schmiede: Der Bau ist ein
     Schmelzofen aus Schamottsteinen, im Maul brennt das Feuer, oben raucht die Esse - und was den
     Weg sperrt, ist die eiserne Ofenklappe, die aus dem Sturz herunterfährt.

     Zuerst stand hier ein Schaufelrad vor dem Maul, die Flügel der Mühle in Eisen. Das war der
     Fehler: Damit war es doch wieder eine Mühle, nur anders bemalt. Ein Ofen hat kein Rad, er hat
     eine Klappe. Und die ist ehrlicher, denn sie *ist* das, was sperrt - man sieht nicht ein Rad
     und muß sich denken, wann es zu ist, sondern sieht die Klappe fallen.

     Neu zu bauen war daran nichts: Die Windmühle kann das alles schon. Ein Stil ist billiger als
     ein Hindernis, und er hält die Regel gleich - wer die Mühle kennt, kennt den Ofen. */
  drawSchmelzofen(ctx, ob, t) {
    const s = this.scale, ax = ob.axis === 'x';
    const stein = '#6d4a38', steinSeite = '#4a2f22', esse = '#3a2a22';
    const glut = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2.3));      // das Feuer atmet
    for (const b of ob.blocks) this.prism(ctx, b, 0, ob.height, stein, steinSeite, { outline: '#2a1a12' });
    // Sturz über dem Maul
    const g = ob.gap / 2 + 0.05, dd = ob.depth / 2;
    const sturz = ax ? [[ob.x - g, ob.y - dd], [ob.x + g, ob.y - dd], [ob.x + g, ob.y + dd], [ob.x - g, ob.y + dd]]
                     : [[ob.x - dd, ob.y - g], [ob.x + dd, ob.y - g], [ob.x + dd, ob.y + g], [ob.x - dd, ob.y + g]];
    this.prism(ctx, sturz, 1.05, ob.height - 1.05, stein, steinSeite, { outline: '#2a1a12' });
    // Statt des Spitzdachs die Esse: ein gemauerter Schlot, aus dem Rauch steigt
    const eb = 0.42;
    const schlot = [[ob.x - eb, ob.y - eb], [ob.x + eb, ob.y - eb], [ob.x + eb, ob.y + eb], [ob.x - eb, ob.y + eb]];
    this.prism(ctx, schlot, ob.height, 1.25, esse, '#241a15', { outline: '#140e0a' });
    this.fillPoly(ctx, schlot, ob.height + 1.25, '#1a1210');
    /* Ein glühender Rand oben auf der Esse. Ohne ihn war der Schlot von oben nur ein schwarzer
       Kasten - man sah einen Klotz, keinen Kamin. Das Feuer steht unten, also glimmt sein Rand. */
    const kb = eb * 0.82;
    this.fillPoly(ctx, [[ob.x - kb, ob.y - kb], [ob.x + kb, ob.y - kb], [ob.x + kb, ob.y + kb], [ob.x - kb, ob.y + kb]],
      ob.height + 1.26, `rgb(${Math.round(110 + 70 * glut)},${Math.round(40 + 35 * glut)},22)`);
    ctx.save();
    for (let i = 0; i < 5; i++) {
      const u = ((t * 0.34 + i / 5) % 1);
      const [px, py] = this.proj(ob.x + Math.sin(t * 0.8 + i) * u * 0.5, ob.y, ob.height + 1.25 + u * 2.2);
      ctx.globalAlpha = 0.3 * (1 - u);
      ctx.fillStyle = '#9a8d84';
      ctx.beginPath(); ctx.arc(px, py, s * (0.12 + u * 0.4), 0, TAU); ctx.fill();
    }
    ctx.restore();
    /* Das Maul - nur auf der Seite, die zur Kamera zeigt, sonst sähe man durch den Ofen hindurch.
       Offen ist es ein Blick ins Feuer, zu ist es eine glühende Eisenklappe: Beides sagt von weitem,
       ob man gerade darf. */
    const faceN = ax ? [0, 1] : [1, 0];
    const seite = (faceN[0] * this.cam.sin + faceN[1] * this.cam.cos) > 0 ? 1 : -1;
    const w2 = ob.gap / 2 + 0.08, oben = 1.05, rad = Math.min(w2, 0.3);
    const fx = ax ? ob.x : ob.x + seite * dd, fy = ax ? ob.y + seite * dd : ob.y;
    const an = (u, z) => ax ? this.proj(fx + u, fy, z) : this.proj(fx, fy + u, z);
    const bogen = () => {
      ctx.beginPath();
      let p = an(-w2, 0); ctx.moveTo(p[0], p[1]);
      p = an(-w2, oben - rad); ctx.lineTo(p[0], p[1]);
      for (let k = 0; k <= 10; k++) { const a = Math.PI - (k / 10) * Math.PI; p = an(Math.cos(a) * w2, oben - rad + Math.sin(a) * rad); ctx.lineTo(p[0], p[1]); }
      p = an(w2, 0); ctx.lineTo(p[0], p[1]); ctx.closePath();
    };
    // Im Maul brennt immer das Feuer - ob man durchkommt, sagt die Klappe darüber.
    ctx.fillStyle = '#120a06'; bogen(); ctx.fill();
    ctx.save(); bogen(); ctx.clip();
    for (let i = 0; i < 6; i++) {
      const u = -w2 + (i + 0.5) * (2 * w2) / 6;
      const [qx, qy] = an(u, 0.12 + 0.1 * Math.sin(t * 3 + i));
      ctx.fillStyle = `rgba(255,${Math.round(120 + 70 * glut)},40,${0.5 + 0.35 * glut})`;
      ctx.beginPath(); ctx.arc(qx, qy, s * (0.16 + 0.06 * Math.sin(t * 4 + i * 2)), 0, TAU); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#6d4a38'; ctx.lineWidth = Math.max(1, s * 0.04); bogen(); ctx.stroke();
    // Der Schein, den das Maul auf den Boden davor wirft
    const [sx, sy] = an(0, 0.02);
    const schein = ctx.createRadialGradient(sx, sy, 0, sx, sy, s * 1.5);
    schein.addColorStop(0, `rgba(255,150,50,${0.2 + 0.12 * glut})`);
    schein.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = schein; ctx.beginPath(); ctx.arc(sx, sy, s * 1.5, 0, TAU); ctx.fill();
    /* Die Ofenklappe. Vor ihr drehte sich hier ein Schaufelrad - und damit sah der Ofen doch wieder
       aus wie eine Mühle, nur in Eisen. Jetzt macht das, was sperrt, auch sichtbar zu: eine
       eiserne Klappe fährt im Takt aus dem Sturz herunter über das Maul.

       Ihr Stand wird nicht neu erfunden, sondern aus demselben Winkel gelesen, aus dem das
       Hindernis 'blocked' rechnet (obstacles.js, Windmill.update): Der Abstand des nächsten
       Blattes vom untersten Punkt sagt, wie weit die Klappe unten ist. Bei 0,30 sperrt sie - und
       genau dort ist sie ganz zu. So zeigt das Bild nicht *ungefähr*, sondern *genau*, was gilt. */
    const schritt = TAU / (ob.blades || 4);
    const roh = ((ob.angle + Math.PI / 2) % schritt + schritt) % schritt;
    const naehe = Math.min(roh, schritt - roh);
    const zu = Math.max(0, Math.min(1, (0.75 - naehe) / 0.45));
    if (zu > 0.003) {
      const unten = oben * (1 - zu);
      ctx.save(); bogen(); ctx.clip();
      const platte = [an(-w2, oben), an(w2, oben), an(w2, unten), an(-w2, unten)];
      ctx.beginPath(); platte.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1])); ctx.closePath();
      ctx.fillStyle = '#4a4038'; ctx.fill();
      // Beschläge quer über die Klappe
      ctx.strokeStyle = '#2a2018'; ctx.lineWidth = Math.max(1.5, s * 0.05);
      for (const q of [0.3, 0.7]) {
        const z = oben - (oben - unten) * q;
        const a0 = an(-w2, z), a1 = an(w2, z);
        ctx.beginPath(); ctx.moveTo(a0[0], a0[1]); ctx.lineTo(a1[0], a1[1]); ctx.stroke();
      }
      // Die Unterkante steht im Feuer und glüht
      const k0 = an(-w2, unten), k1 = an(w2, unten);
      ctx.strokeStyle = `rgba(${Math.round(200 + 55 * glut)},${Math.round(90 + 60 * glut)},40,${0.55 + 0.35 * glut})`;
      ctx.lineWidth = Math.max(2, s * 0.09);
      ctx.beginPath(); ctx.moveTo(k0[0], k0[1]); ctx.lineTo(k1[0], k1[1]); ctx.stroke();
      ctx.restore();
    }
  },
});
