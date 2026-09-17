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
      /* Die Fontäne leuchtet auch. Der Spalt glimmt immer ein wenig - sonst fände man ihn im
         Dunkeln erst, wenn man drinsteht -, und beim Stoß reicht der Schein weit. Das ist der
         einzige Ort der Bahn, an dem man ausgerechnet dann am meisten sieht, wenn man nicht
         hindarf. */
      if (ob.type === 'lavafontaene') {
        lichter.push({ x: ob.x, y: ob.y, r: (ob.licht || 3.8) * (0.42 + 0.58 * (ob.hoch || 0)) });
        continue;
      }
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
     Die Lavafontäne
     ---------------------------------------------------------------------------
     Zwei Teile, wie bei der Sprengladung: Was auf dem Boden liegt, wird vor allen Körpern
     gezeichnet (drawFontaeneFloor), der Strahl selbst danach.

     Und wie bei der Sprengladung steht die Ansage auf dem Boden, nicht am Gerät: Der Ring zeigt,
     wie weit der Strahl reicht, und er füllt sich in den letzten Zehntelsekunden vor dem Stoß.
     Man muß also nicht den Takt zählen - man sieht ihn ablaufen. Bei einem Takt von zwei Sekunden
     ist das der Unterschied zwischen einer Aufgabe und einem Würfel. */
  drawFontaeneFloor(ctx, ob, t) {
    const s = this.scale, r = ob.r || 0.8;
    const droht = ob.state === 'droht', stoss = ob.state === 'stoss';
    const puls = droht ? ob.p : stoss ? 1 : 0.12;
    // Der Schein auf dem Gestein rings um den Spalt
    const [sx, sy] = this.proj(ob.x, ob.y, 0.01);
    const schein = ctx.createRadialGradient(sx, sy, 0, sx, sy, s * r * 2.6);
    schein.addColorStop(0, `rgba(255,150,50,${0.16 + 0.5 * puls})`);
    schein.addColorStop(1, 'rgba(255,120,30,0)');
    ctx.fillStyle = schein;
    ctx.beginPath(); ctx.ellipse(sx, sy, s * r * 2.6, s * r * 2.6 * this.cam.tilt, 0, 0, TAU); ctx.fill();
    /* Der Reichweitenring. Er steht immer da - auch in Ruhe -, denn wo die Fontäne trifft, muß man
       auch dann wissen, wenn sie gerade unten ist. Nur füllt er sich erst, wenn es soweit ist. */
    ctx.strokeStyle = `rgba(255,${Math.round(140 + 80 * puls)},60,${0.35 + 0.5 * puls})`;
    ctx.lineWidth = Math.max(1.5, s * (0.05 + 0.05 * puls));
    ctx.beginPath(); ctx.ellipse(sx, sy, s * r, s * r * this.cam.tilt, 0, 0, TAU); ctx.stroke();
    if (droht) {   // der Ring füllt sich von innen nach außen: fertig heißt Stoß
      ctx.fillStyle = `rgba(255,120,30,${0.18 + 0.3 * ob.p})`;
      ctx.beginPath(); ctx.ellipse(sx, sy, s * r * ob.p, s * r * ob.p * this.cam.tilt, 0, 0, TAU); ctx.fill();
    }
    // Der Spalt: ein dunkler Riß, in dem es glüht
    ctx.fillStyle = '#1a0f0a';
    ctx.beginPath(); ctx.ellipse(sx, sy, s * r * 0.52, s * r * 0.52 * this.cam.tilt, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = `rgba(255,${Math.round(120 + 90 * puls)},${Math.round(30 + 40 * puls)},${0.75 + 0.25 * puls})`;
    ctx.beginPath(); ctx.ellipse(sx, sy, s * r * (0.2 + 0.26 * puls), s * r * (0.2 + 0.26 * puls) * this.cam.tilt, 0, 0, TAU); ctx.fill();
  },

  /* Der Strahl. Er steht nur, solange er tödlich ist - genau das ist seine Aufgabe als Bild:
     Was man sieht, ist was gilt. Dazwischen brodelt es nur im Spalt. */
  drawLavafontaene(ctx, ob, t) {
    const s = this.scale, r = ob.r || 0.8;
    if (ob.hoch > 0.004) {
      const h = (ob.hoehe || 3.4) * ob.hoch;
      /* Ein Kegelstumpf statt eines Rechtecks: Der Strahl wird nach oben dünner, und weil er in
         Weltkoordinaten steht, dreht er sich mit der Kamera mit. */
      /* Der Strahl ist schlank. Ein breiter Kegel sah aus wie ein Sandhaufen - was ihn zum Strahl
         macht, ist das Verhältnis: dünn und hoch, nicht dick und kurz. */
      this.frustum(ctx, this.circlePoly(ob.x, ob.y, r * 0.44, 10), this.circlePoly(ob.x, ob.y, r * 0.14, 10),
                   0, h, '#ff9a24', '#d83c08', { ohneDeckel: true });
      // Der Kern: schmal und fast weiß. Eine Säule aus einer Farbe sähe aus wie Pappe.
      this.frustum(ctx, this.circlePoly(ob.x, ob.y, r * 0.17, 8), this.circlePoly(ob.x, ob.y, r * 0.05, 8),
                   0.02, h * 0.7, '#fff3cf', '#ffca62', { ohneDeckel: true });
      // Ein Kranz am Fuß: dort, wo der Strahl aus dem Spalt bricht, spritzt es zur Seite
      const [bx, by] = this.proj(ob.x, ob.y, 0.05);
      const fuss = ctx.createRadialGradient(bx, by, 0, bx, by, s * r * 1.1);
      fuss.addColorStop(0, 'rgba(255,240,190,0.85)');
      fuss.addColorStop(0.5, 'rgba(255,140,40,0.5)');
      fuss.addColorStop(1, 'rgba(255,110,20,0)');
      ctx.fillStyle = fuss;
      ctx.beginPath(); ctx.ellipse(bx, by, s * r * 1.1, s * r * 1.1 * this.cam.tilt, 0, 0, TAU); ctx.fill();
      // Spritzer, die der Strahl oben abwirft
      ctx.save();
      for (let i = 0; i < 7; i++) {
        const u = ((t * 1.7 + i / 7) % 1);
        const w = i * 0.9 + t * 0.6;
        const [px, py] = this.proj(ob.x + Math.cos(w) * r * u * 1.5, ob.y + Math.sin(w) * r * u * 1.5, h * (0.75 + 0.5 * u) - u * u * 1.6);
        ctx.globalAlpha = 0.9 * (1 - u);
        ctx.fillStyle = u < 0.5 ? '#ffd27a' : '#f2701c';
        ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * (0.09 - 0.05 * u)), 0, TAU); ctx.fill();
      }
      ctx.restore();
      return;
    }
    // In Ruhe: ein paar Blasen im Spalt, damit er nicht tot aussieht
    if (!(this.scale > 20)) return;
    ctx.save();
    for (let i = 0; i < 3; i++) {
      const u = ((t * 0.8 + i / 3) % 1);
      const [px, py] = this.proj(ob.x + Math.sin(t * 1.3 + i * 2) * r * 0.25, ob.y, 0.02 + u * 0.3);
      ctx.globalAlpha = 0.5 * (1 - u);
      ctx.fillStyle = '#ffb347';
      ctx.beginPath(); ctx.arc(px, py, Math.max(1, s * 0.06 * (1 - u * 0.5)), 0, TAU); ctx.fill();
    }
    ctx.restore();
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
    const eisen = '#4a4038', eisenDunkel = '#2a2018';
    const glut = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(t * 2.3));      // das Feuer atmet
    /* Nah lohnt sich die feine Arbeit, aus der Übersicht nicht: Dort lägen Fugen und Nieten so eng,
       daß sie zu einem grauen Schleier verschmieren. Darum hängt alles Kleinteilige am Maßstab. */
    const fein = s > 24;

    /* ---- Die Vorderseite ----
       Alles Aufgesetzte - Fugen, Anker, Ruß, Feuer, Klappe - sitzt auf der Seite, die zur Kamera
       zeigt; auf der abgewandten sähe man es durch den Ofen hindurch. 'an' rechnet einen Punkt
       dieser Fläche: u ist der seitliche Abstand von der Mitte, z die Höhe. */
    const g = ob.gap / 2 + 0.05, dd = ob.depth / 2;
    const faceN = ax ? [0, 1] : [1, 0];
    const seite = (faceN[0] * this.cam.sin + faceN[1] * this.cam.cos) > 0 ? 1 : -1;
    const w2 = ob.gap / 2 + 0.08, oben = 1.05, rad = Math.min(w2, 0.3);
    const aussen = ob.w / 2 + (ob.overlap ?? 0.7);                 // so weit reicht das Mauerwerk
    const fx = ax ? ob.x : ob.x + seite * dd, fy = ax ? ob.y + seite * dd : ob.y;
    const an = (u, z) => ax ? this.proj(fx + u, fy, z) : this.proj(fx, fy + u, z);
    const strich = (u0, z0, u1, z1) => {
      const a = an(u0, z0), b = an(u1, z1);
      ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke();
    };
    const flaeche = (punkte) => {
      ctx.beginPath();
      punkte.forEach((q, i) => i ? ctx.lineTo(q[0], q[1]) : ctx.moveTo(q[0], q[1]));
      ctx.closePath();
    };

    // ---- Der Baukörper: zwei Wangen und der Sturz darüber ----
    for (const b of ob.blocks) this.prism(ctx, b, 0, ob.height, stein, steinSeite, { outline: '#2a1a12' });
    const sturz = ax ? [[ob.x - g, ob.y - dd], [ob.x + g, ob.y - dd], [ob.x + g, ob.y + dd], [ob.x - g, ob.y + dd]]
                     : [[ob.x - dd, ob.y - g], [ob.x + dd, ob.y - g], [ob.x + dd, ob.y + g], [ob.x - dd, ob.y + g]];
    this.prism(ctx, sturz, 1.05, ob.height - 1.05, stein, steinSeite, { outline: '#2a1a12' });

    /* ---- Mauerwerk ----
       Ohne Fugen war der Ofen ein glatter Kasten mit einem Loch darin. Gemauert wird er erst durch
       die Lagen. Die Stoßfugen stehen je Lage um einen halben Stein versetzt - zwei Fugen genau
       übereinander gibt es an keiner Mauer, die hält, und genau daran erkennt das Auge Mauerwerk. */
    const lage = 0.26, steinBreit = 0.62;
    ctx.save();
    ctx.lineWidth = Math.max(1, s * 0.02);
    ctx.strokeStyle = 'rgba(40,26,18,0.5)';
    for (let i = 1; i * lage < ob.height - 0.04; i++) {
      const z = i * lage;
      if (z < oben) { strich(-aussen, z, -w2, z); strich(w2, z, aussen, z); }
      else strich(-aussen, z, aussen, z);
      if (!fein) continue;
      const vers = (i % 2) * steinBreit / 2;
      for (let u = -aussen + vers + 0.16; u < aussen - 0.06; u += steinBreit) {
        if (z <= oben + 0.01 && Math.abs(u) < w2 + 0.07) continue;   // dort ist das Maul, kein Stein
        strich(u, z, u, z - lage);
      }
    }
    ctx.restore();

    /* Zugeisen. Ein Ofen treibt sich mit der Hitze selbst auseinander; was ihn zusammenhält, sind
       durchgesteckte Anker mit einer Platte davor. Sie sagen nebenbei, was hinter der Wand steht:
       kein Vorratskeller, sondern Feuer. */
    if (fein) {
      ctx.save();
      ctx.strokeStyle = eisenDunkel; ctx.fillStyle = eisenDunkel;
      ctx.lineWidth = Math.max(1.4, s * 0.042);
      for (const u of [-(aussen + w2) / 2, (aussen + w2) / 2]) {
        strich(u - 0.12, 0.79, u + 0.12, 1.05);
        strich(u - 0.12, 1.05, u + 0.12, 0.79);
        const p = an(u, 0.92);
        ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(1.3, s * 0.04), 0, TAU); ctx.fill();
      }
      ctx.restore();
    }

    /* ---- Die Esse ----
       Statt des Spitzdachs der Mühle ein gemauerter Schlot. Zwischen Dach und Schlot sitzt jetzt
       ein Rauchfang: Vorher wuchs die Esse wie ein Pfahl aus einer glatten Platte - der Trichter
       macht aus zwei Körpern erst einen Bau. Die Eisenringe darum sind dasselbe Handwerk wie die
       Anker unten; ein gemauerter Schlot ohne Bänder fällt beim ersten Zug auseinander. */
    const eb = 0.42, quad = (r) => [[ob.x - r, ob.y - r], [ob.x + r, ob.y - r], [ob.x + r, ob.y + r], [ob.x - r, ob.y + r]];
    this.frustum(ctx, quad(0.62), quad(eb), ob.height - 0.02, ob.height + 0.2, esse, '#241a15', { ohneDeckel: true });
    const schlot = quad(eb);
    this.prism(ctx, schlot, ob.height + 0.2, 1.05, esse, '#241a15', { outline: '#140e0a' });
    for (const zr of [0.36, 0.86]) this.prism(ctx, quad(eb * 1.1), ob.height + 0.2 + zr, 0.08, eisenDunkel, '#1d1510');
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
    /* Funken. Aus einer Esse steigt nicht nur Rauch, und der Unterschied ist der zwischen einem
       Schornstein und einem Feuer: Funken steigen schneller, flackern und verlöschen unterwegs. */
    if (fein) for (let i = 0; i < 7; i++) {
      const u = ((t * 0.85 + i / 7) % 1);
      const [px, py] = this.proj(ob.x + Math.sin(t * 2.1 + i * 1.7) * u * 0.42,
                                 ob.y + Math.cos(t * 1.6 + i) * u * 0.32, ob.height + 1.2 + u * 1.8);
      ctx.globalAlpha = 0.9 * (1 - u) * (1 - u);
      ctx.fillStyle = u < 0.5 ? '#ffd27a' : '#e8873a';
      ctx.beginPath(); ctx.arc(px, py, Math.max(0.8, s * 0.033), 0, TAU); ctx.fill();
    }
    ctx.restore();

    /* Ruß über dem Maul. Wo jahrelang Feuer herausschlägt, ist der Stein schwarz. Der dunkle Keil
       kostet nichts und sagt von weitem, welche Seite die Vorderseite ist. */
    const r0 = an(0, oben), r1 = an(0, ob.height + 0.06);
    const russ = ctx.createLinearGradient(r0[0], r0[1], r1[0], r1[1]);
    russ.addColorStop(0, 'rgba(16,10,8,0.62)'); russ.addColorStop(1, 'rgba(16,10,8,0)');
    ctx.fillStyle = russ;
    flaeche([an(-w2 - 0.06, oben), an(w2 + 0.06, oben), an(w2 + 0.44, ob.height + 0.06), an(-w2 - 0.44, ob.height + 0.06)]);
    ctx.fill();

    /* Das Maul - nur auf der Seite, die zur Kamera zeigt. Offen ist es ein Blick ins Feuer, zu ist
       es eine glühende Eisenklappe: Beides sagt von weitem, ob man gerade darf. */
    const bogen = () => {
      ctx.beginPath();
      let p = an(-w2, 0); ctx.moveTo(p[0], p[1]);
      p = an(-w2, oben - rad); ctx.lineTo(p[0], p[1]);
      for (let k = 0; k <= 10; k++) { const a = Math.PI - (k / 10) * Math.PI; p = an(Math.cos(a) * w2, oben - rad + Math.sin(a) * rad); ctx.lineTo(p[0], p[1]); }
      p = an(w2, 0); ctx.lineTo(p[0], p[1]); ctx.closePath();
    };
    // Der Stein rings um das Maul nimmt die Farbe des Feuers an, bevor das Maul selbst gezeichnet wird
    const wg = an(0, 0.45), wr = s * (w2 + 0.95);
    const warm = ctx.createRadialGradient(wg[0], wg[1], 0, wg[0], wg[1], wr);
    warm.addColorStop(0, `rgba(255,140,50,${0.15 + 0.1 * glut})`);
    warm.addColorStop(1, 'rgba(255,140,50,0)');
    ctx.fillStyle = warm; ctx.beginPath(); ctx.arc(wg[0], wg[1], wr, 0, TAU); ctx.fill();

    // Im Maul brennt immer das Feuer - ob man durchkommt, sagt die Klappe darüber.
    ctx.fillStyle = '#120a06'; bogen(); ctx.fill();
    ctx.save(); bogen(); ctx.clip();
    /* Vier Lagen, von hinten nach vorn: der Schein aus der Tiefe, darauf das Kohlenbett, darin
       die Brocken, davor die Flammenzungen. Vorher waren es sechs pulsende Kreise - das war Glut,
       aber kein Feuer. Und runde Brocken mit glühendem Rand sahen aus wie Brote im Backofen; die
       Kohle ist darum kantig und *dunkel*, hell ist der Streifen, der zwischen ihr durchsieht. */
    const kg = an(0, 0.12), kr = s * (w2 + 0.45);
    const kern = ctx.createRadialGradient(kg[0], kg[1], 0, kg[0], kg[1], kr);
    kern.addColorStop(0, `rgba(255,214,130,${0.5 + 0.3 * glut})`);
    kern.addColorStop(0.45, `rgba(255,120,30,${0.28 + 0.2 * glut})`);
    kern.addColorStop(1, 'rgba(120,20,0,0)');
    ctx.fillStyle = kern; ctx.beginPath(); ctx.arc(kg[0], kg[1], kr, 0, TAU); ctx.fill();
    const bu = an(0, 0), bo = an(0, 0.32);
    const bett = ctx.createLinearGradient(bu[0], bu[1], bo[0], bo[1]);
    bett.addColorStop(0, `rgba(255,${Math.round(165 + 45 * glut)},70,0.88)`);
    bett.addColorStop(0.45, `rgba(240,95,20,${0.6 + 0.2 * glut})`);
    bett.addColorStop(1, 'rgba(150,35,0,0)');
    ctx.fillStyle = bett;
    flaeche([an(-w2, 0), an(w2, 0), an(w2, 0.32), an(-w2, 0.32)]); ctx.fill();
    ctx.fillStyle = '#20120b';
    for (let i = 0; i < 9; i++) {
      const u0 = -w2 + i * (2 * w2) / 9 + 0.016, u1 = u0 + (2 * w2) / 9 - 0.032;
      const h = 0.05 + 0.08 * (0.5 + 0.5 * Math.sin(i * 2.7));
      flaeche([an(u0, 0), an(u1, 0), an(u1, h * 0.75), an((u0 + u1) / 2, h), an(u0, h * 0.6)]);
      ctx.fill();
    }
    for (let i = 0; i < 5; i++) {
      const u = -w2 * 0.78 + i * (1.56 * w2) / 4;
      const h = 0.34 + 0.3 * (0.5 + 0.5 * Math.sin(t * 5.1 + i * 2.3));
      const f0 = an(u - 0.11, 0.05), f1 = an(u + 0.11, 0.05);
      const spitze = an(u + 0.07 * Math.sin(t * 3.1 + i * 1.9), h);
      const c0 = an(u - 0.14, h * 0.55), c1 = an(u + 0.14, h * 0.55);
      ctx.fillStyle = `rgba(255,${Math.round(135 + 60 * glut)},45,0.45)`;
      ctx.beginPath(); ctx.moveTo(f0[0], f0[1]);
      ctx.quadraticCurveTo(c0[0], c0[1], spitze[0], spitze[1]);
      ctx.quadraticCurveTo(c1[0], c1[1], f1[0], f1[1]);
      ctx.closePath(); ctx.fill();
    }
    ctx.restore();
    ctx.strokeStyle = '#6d4a38'; ctx.lineWidth = Math.max(1, s * 0.04); bogen(); ctx.stroke();
    // Der Schein, den das Maul auf den Boden davor wirft
    const [sx, sy] = an(0, 0.02);
    const schein = ctx.createRadialGradient(sx, sy, 0, sx, sy, s * 1.5);
    schein.addColorStop(0, `rgba(255,150,50,${0.2 + 0.12 * glut})`);
    schein.addColorStop(1, 'rgba(255,150,50,0)');
    ctx.fillStyle = schein; ctx.beginPath(); ctx.arc(sx, sy, s * 1.5, 0, TAU); ctx.fill();

    /* Führungsschienen und Schieberkasten. Ohne sie kam die Klappe aus dem Nichts und verschwand
       ins Nichts; jetzt sieht man, woran sie läuft und wo sie steckt, wenn sie oben ist. */
    ctx.save();
    ctx.strokeStyle = eisenDunkel; ctx.lineWidth = Math.max(1.5, s * 0.05);
    strich(-w2 - 0.06, 0, -w2 - 0.06, oben + 0.3);
    strich(w2 + 0.06, 0, w2 + 0.06, oben + 0.3);
    const kx = w2 + 0.17;
    ctx.fillStyle = eisen;
    flaeche([an(-kx, oben + 0.32), an(kx, oben + 0.32), an(kx, oben - 0.03), an(-kx, oben - 0.03)]);
    ctx.fill();
    ctx.lineWidth = Math.max(1, s * 0.028); ctx.stroke();
    if (fein) {
      ctx.fillStyle = '#6a5c4e';
      for (let i = 0; i < 5; i++) {
        const p = an(-kx + 0.09 + i * (2 * kx - 0.18) / 4, oben + 0.15);
        ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(1, s * 0.028), 0, TAU); ctx.fill();
      }
    }
    ctx.restore();

    /* Die Ofenklappe. Vor ihr drehte sich hier ein Schaufelrad - und damit sah der Ofen doch wieder
       aus wie eine Mühle, nur in Eisen. Jetzt macht das, was sperrt, auch sichtbar zu: eine
       eiserne Klappe fährt im Takt aus dem Sturz herunter über das Maul.

       Ihr Stand wird nicht neu erfunden, sondern aus demselben Winkel gelesen, aus dem das
       Hindernis 'blocked' rechnet (obstacles.js, Windmill.update): Der Abstand des nächsten
       Blattes vom untersten Punkt sagt, wie weit die Klappe unten ist. Bei SPERRT ist sie ganz zu,
       und das ist derselbe Wert, bei dem das Hindernis sperrt. So zeigt das Bild nicht *ungefähr*,
       sondern *genau*, was gilt.

       FAHRWEG ist das Stück davor, auf dem sie fährt. Zuerst standen dort 0,45 - das sah richtig
       aus, war aber falsch gemessen: Der Winkel kommt über den ganzen Umlauf nie weiter als 0,785
       vom untersten Punkt weg. Mit 0,45 stand die Klappe also nur in einem Wimpernschlag ganz
       oben, und der Weg wirkte versperrt, während er in Wahrheit die meiste Zeit offen war. Der
       kurze Fahrweg gibt dem offenen Maul seine Zeit zurück. */
    const SPERRT = 0.30, FAHRWEG = 0.22;
    const schritt = TAU / (ob.blades || 4);
    const roh = ((ob.angle + Math.PI / 2) % schritt + schritt) % schritt;
    const naehe = Math.min(roh, schritt - roh);
    const zu = Math.max(0, Math.min(1, (SPERRT + FAHRWEG - naehe) / FAHRWEG));
    if (zu > 0.003) {
      const unten = oben * (1 - zu);
      ctx.save(); bogen(); ctx.clip();
      ctx.fillStyle = eisen;
      flaeche([an(-w2, oben), an(w2, oben), an(w2, unten), an(-w2, unten)]);
      ctx.fill();
      /* Beschläge quer über die Klappe, dazu die Nieten darin. Eine glatte Platte sah aus wie ein
         Schatten im Maul; erst das Beschlagene macht sie zu einem Stück Eisen. */
      ctx.strokeStyle = eisenDunkel; ctx.lineWidth = Math.max(1.5, s * 0.05);
      ctx.fillStyle = '#6a5c4e';
      for (const q of [0.3, 0.7]) {
        const z = oben - (oben - unten) * q;
        strich(-w2, z, w2, z);
        if (!fein) continue;
        for (let i = 0; i < 4; i++) {
          const p = an(-w2 + 0.12 + i * (2 * w2 - 0.24) / 3, z);
          ctx.beginPath(); ctx.arc(p[0], p[1], Math.max(1, s * 0.026), 0, TAU); ctx.fill();
        }
      }
      // Die Unterkante steht im Feuer und glüht
      ctx.strokeStyle = `rgba(${Math.round(200 + 55 * glut)},${Math.round(90 + 60 * glut)},40,${0.55 + 0.35 * glut})`;
      ctx.lineWidth = Math.max(2, s * 0.09);
      strich(-w2, unten, w2, unten);
      ctx.restore();
    }
  },
});
