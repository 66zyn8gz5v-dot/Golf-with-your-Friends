/* Die Zauberkreise – Runenringe, die in den Boden geschnitten sind.

   DIE FARBE IST DIE BEDIENUNGSANLEITUNG. Jede andere Maschine des Spiels muß man einmal
   ausprobiert haben; diese hier sagt vorher, was sie tut. Grün schiebt, blau bremst, gold wirft,
   violett dreht, rot sperrt. Damit die fünf auch aus der Übersicht heraus auseinanderzuhalten
   sind, unterscheiden sie sich nicht nur in der Farbe, sondern auch im Siegel in der Mitte – wer
   die Bahn auf einem hellen iPad im Sonnenlicht ansieht, hat von den Farben allein wenig.

   ALLES LIEGT IN DER BODENEBENE. Der Kreis wird einmal in den Bildpunkt seiner Mitte verschoben
   und dann mit der Kameraneigung gestaucht; danach ist er ein ganz gewöhnlicher Kreis im
   Bildraum. Das ist derselbe Griff wie beim Bannsiegel der Loge – und der Grund, warum die Runen
   sich mitneigen, statt wie aufgeklebte Schilder dazustehen. */

const KREIS_FARBE = {
  schub:  [ 76, 224, 138],
  bremse: [ 79, 176, 255],
  sprung: [255, 209, 102],
  wirbel: [199, 125, 255],
  bann:   [255,  95,  95],
};

/* Sechs Runen aus geraden Strichen, jede in einem Kästchen von -1..1. Gerade Striche, weil die
   Vorlage aus Runen besteht und nicht aus Schnörkeln: Sie müssen auch bei zwei Bildpunkten
   Strichstärke noch verschieden aussehen. */
const KREIS_RUNEN = [
  [[[0, -1], [0, 1]], [[-0.7, -0.5], [0, 0]]],
  [[[-0.7, -1], [-0.7, 1]], [[-0.7, 0], [0.7, 0]]],
  [[[0, -1], [0, 1]], [[-0.6, 1], [0, 0.2]], [[0.6, 1], [0, 0.2]]],
  [[[-0.7, -1], [0.7, -1]], [[0, -1], [0, 1]]],
  [[[-0.6, -1], [0.6, 0]], [[-0.6, 1], [0.6, 0]]],
  [[[0, -1], [0, 1]], [[0, -0.3], [0.7, -0.9]], [[0, 0.4], [0.7, -0.2]]],
];

Object.assign(Renderer.prototype, {

  /* Das Siegel in der Mitte. Es sagt dasselbe wie die Farbe, nur in Form – Pfeile nach außen für
     den Schub, Bögen nach innen für die Bremse, und so fort. */
  kreisSiegel(ctx, wirkung, R, t, strich) {
    ctx.lineWidth = strich; ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (wirkung === 'schub') {           // drei Winkel nach außen: es geht weiter
      for (let k = 0; k < 3; k++) {
        const d = (k - 1) * R * 0.34 + ((t * 1.2) % 1) * R * 0.1;
        ctx.beginPath();
        ctx.moveTo(d - R * 0.2, -R * 0.42); ctx.lineTo(d + R * 0.22, 0); ctx.lineTo(d - R * 0.2, R * 0.42);
        ctx.stroke();
      }
    } else if (wirkung === 'bremse') {   // Bögen, die sich schließen, und ein Riegel davor
      for (let k = 1; k <= 3; k++) {
        ctx.beginPath(); ctx.arc(R * 0.42, 0, R * 0.22 * k, Math.PI * 0.62, Math.PI * 1.38); ctx.stroke();
      }
      ctx.beginPath(); ctx.moveTo(-R * 0.5, -R * 0.4); ctx.lineTo(-R * 0.5, R * 0.4); ctx.stroke();
    } else if (wirkung === 'sprung') {   // ein Pfeil, der aus einer Schale steigt
      ctx.beginPath(); ctx.arc(0, R * 0.3, R * 0.45, Math.PI * 0.1, Math.PI * 0.9); ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, R * 0.42); ctx.lineTo(0, -R * 0.5);
      ctx.moveTo(-R * 0.26, -R * 0.2); ctx.lineTo(0, -R * 0.52); ctx.lineTo(R * 0.26, -R * 0.2);
      ctx.stroke();
    } else if (wirkung === 'wirbel') {   // eine Spirale, die sich dreht
      ctx.beginPath();
      for (let i = 0; i <= 60; i++) {
        const u = i / 60, a = u * TAU * 1.6 + t * 1.1, rr = R * 0.12 + u * R * 0.44;
        const px = Math.cos(a) * rr, py = Math.sin(a) * rr;
        i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
      }
      ctx.stroke();
    } else {                             // Bann: ein Knoten aus zwei Quadraten
      for (const dreh of [0, Math.PI / 4]) {
        ctx.save(); ctx.rotate(dreh);
        ctx.beginPath(); ctx.rect(-R * 0.36, -R * 0.36, R * 0.72, R * 0.72); ctx.stroke();
        ctx.restore();
      }
    }
  },

  drawZauberkreisFloor(ctx, ob, t) {
    const s = this.scale, R = ob.r * s;
    const [f0, f1, f2] = KREIS_FARBE[ob.wirkung] || KREIS_FARBE.schub;
    const hell = ob.wach == null ? 1 : ob.wach;
    const licht = (a) => `rgba(${f0},${f1},${f2},${a})`;
    const [cx, cy] = this.proj(ob.x, ob.y, 0.005);

    ctx.save();
    ctx.translate(cx, cy); ctx.scale(1, this.cam.tilt);

    // Der Hof. Er liegt unter allem, damit die Linien darauf stehen und nicht darin ertrinken.
    if (hell > 0.03) {
      const hof = ctx.createRadialGradient(0, 0, R * 0.2, 0, 0, R * 1.35);
      hof.addColorStop(0, licht(0.30 * hell)); hof.addColorStop(0.75, licht(0.16 * hell));
      hof.addColorStop(1, licht(0));
      ctx.fillStyle = hof; ctx.beginPath(); ctx.arc(0, 0, R * 1.35, 0, TAU); ctx.fill();
    }
    // Die Rille: erst dunkel geschnitten, dann das Licht hinein. Ohne den dunklen Grund sieht der
    // Kreis aufgemalt aus statt eingeschnitten – und ein erloschener Kreis wäre unsichtbar.
    const rille = (r, dick) => {
      ctx.strokeStyle = 'rgba(12,10,24,0.55)'; ctx.lineWidth = dick + Math.max(1, s * 0.035);
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
      ctx.strokeStyle = licht(0.25 + 0.65 * hell); ctx.lineWidth = dick;
      ctx.beginPath(); ctx.arc(0, 0, r, 0, TAU); ctx.stroke();
    };
    const dick = Math.max(1.4, s * 0.05);
    rille(R, dick);
    rille(R * 0.88, Math.max(1, s * 0.035));
    rille(R * 0.56, dick);

    /* Die Runen im Ring. Welche wo steht, hängt an der Lage des Kreises – so trägt jeder Kreis
       eine eigene Inschrift, und sie bleibt bei jedem Hinsehen dieselbe. */
    const anzahl = Math.max(8, Math.round(ob.r * 6));
    const saat = Math.floor(Math.abs(ob.x * 73.1 + ob.y * 31.7));
    const gr = R * 0.11;
    ctx.strokeStyle = licht(0.3 + 0.6 * hell);
    ctx.lineWidth = Math.max(1, s * 0.032); ctx.lineCap = 'round';
    for (let k = 0; k < anzahl; k++) {
      const a = (k / anzahl) * TAU;
      const rune = KREIS_RUNEN[(saat + k * 5) % KREIS_RUNEN.length];
      ctx.save();
      ctx.translate(Math.cos(a) * R * 0.72, Math.sin(a) * R * 0.72);
      ctx.rotate(a + Math.PI / 2);        // die Runen stehen auf dem Ring, nicht kreuz und quer
      for (const strich of rune) {
        ctx.beginPath();
        ctx.moveTo(strich[0][0] * gr, strich[0][1] * gr);
        ctx.lineTo(strich[1][0] * gr, strich[1][1] * gr);
        ctx.stroke();
      }
      ctx.restore();
    }

    // Das Siegel. Es glüht etwas stärker als der Ring – dort schaut man zuerst hin.
    ctx.strokeStyle = licht(0.35 + 0.65 * hell);
    this.kreisSiegel(ctx, ob.wirkung, R * 0.5, t, Math.max(1.4, s * 0.055));

    /* Der Bannkreis zeigt außerdem, daß er gerade WAND ist: ein zweiter Ring, der aufläuft. Bei
       ihm hängt nicht die Stärke der Wirkung am Licht, sondern ob es sie überhaupt gibt. */
    if (ob.wirkung === 'bann' && hell > 0.5) {
      ctx.strokeStyle = licht(0.5 * (hell - 0.5) * 2);
      ctx.lineWidth = Math.max(2, s * 0.12);
      ctx.setLineDash([R * 0.25, R * 0.18]);
      ctx.lineDashOffset = -((t * 1.4) % 1) * R * 0.43;
      ctx.beginPath(); ctx.arc(0, 0, R * 0.96, 0, TAU); ctx.stroke();
      ctx.setLineDash([]);
    }
    ctx.restore();
  },
});
