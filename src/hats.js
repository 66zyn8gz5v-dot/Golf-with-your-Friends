/* Hüte für die Golfbälle: jeder Spieler wählt vor dem Spiel einen Hut, der dann auf seinem Ball
   sitzt. Die Hüte werden direkt auf das Canvas gezeichnet – keine Bilder, damit die App klein und
   offline spielbar bleibt.

   Gezeichnet wird in „Hut-Einheiten“: der Nullpunkt liegt auf dem Kopf des Balls, eine Einheit
   entspricht dem Ballradius, y zeigt nach unten. So passt jeder Hut automatisch zu jedem Zoom
   und schrumpft mit, wenn der Ball ins Loch fällt. Die Hüte drehen sich nicht mit der Kamera –
   sie schauen den Spieler immer von vorne an, das liest sich in der Schrägsicht am besten. */
const Hats = (() => {
  const TAU2 = Math.PI * 2;
  const dim = (hex, f) => { // Farbe abdunkeln oder aufhellen
    const n = parseInt(hex.slice(1), 16), c = v => Math.max(0, Math.min(255, Math.round(v * f)));
    return `rgb(${c((n >> 16) & 255)},${c((n >> 8) & 255)},${c(n & 255)})`;
  };
  const fs = (ctx, col) => { ctx.fillStyle = col; ctx.fill(); ctx.stroke(); };
  /* Krempe als flache Ellipse */
  const brim = (ctx, w, h, col, y = 0) => { ctx.beginPath(); ctx.ellipse(0, y, w, h, 0, 0, TAU2); fs(ctx, col); };
  /* kleiner vierzackiger Funkelstern */
  function spark(ctx, x, y, r, col) {
    ctx.beginPath();
    ctx.moveTo(x, y - r); ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y);
    ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
    ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y);
    ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r);
    ctx.fillStyle = col; ctx.fill();
  }
  /* Federfarbe aus der Ballfarbe: der Federbusch nimmt die Farbe des Spielers an. Ein (fast) weißer
     Ball bekommt Rot, sonst ginge der Busch in der weißen Mittelfeder unter. */
  function plumeColors(color) {
    const n = parseInt((typeof color === 'string' && color[0] === '#' ? color : '#ffffff').slice(1), 16);
    const hell = Math.min((n >> 16) & 255, (n >> 8) & 255, n & 255) > 200;
    const base = hell ? '#e0483c' : color;
    return [dim(base, 0.6), dim(base, 1.15)];
  }
  /* Straußenfeder wie am Helm eines Feldherrn: der Kiel ist eine Bezierkurve, links und rechts
     liegt die Fahne an, deren Rand leicht wellt – nahe am Ansatz breit, zur Spitze auslaufend. */
  function plume(ctx, p0, c1, c2, p3, wMax, col, colTip) {
    const N = 30;
    const at = t => {
      const u = 1 - t, a = u * u * u, b = 3 * u * u * t, c = 3 * u * t * t, d = t * t * t;
      return [a * p0[0] + b * c1[0] + c * c2[0] + d * p3[0], a * p0[1] + b * c1[1] + c * c2[1] + d * p3[1]];
    };
    const wid = (t, s) => wMax * Math.pow(Math.sin(Math.PI * Math.pow(t, 0.55)), 0.55) * (1 + 0.055 * Math.sin(t * 62 + (s > 0 ? 0 : 1.7)) + 0.03 * Math.sin(t * 107));
    const side = s => {
      const pts = [];
      for (let i = 0; i <= N; i++) {
        const t = i / N, [x, y] = at(t);
        const [x1, y1] = at(Math.max(0, t - 0.02)), [x2, y2] = at(Math.min(1, t + 0.02));
        const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1, w = wid(t, s);
        pts.push([x - (dy / l) * w * s, y + (dx / l) * w * s]);
      }
      return pts;
    };
    ctx.beginPath();
    side(1).forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
    side(-1).reverse().forEach(([x, y]) => ctx.lineTo(x, y));
    ctx.closePath();
    const g = ctx.createLinearGradient(p0[0], p0[1], p3[0], p3[1]);
    g.addColorStop(0, col); g.addColorStop(1, colTip);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.22)'; ctx.lineWidth = 0.05; ctx.stroke();
    // Kiel, dazu feine Fahnenstrahlen, die schräg zur Spitze zeigen
    ctx.strokeStyle = 'rgba(0,0,0,0.2)'; ctx.lineWidth = 0.04;
    ctx.beginPath(); ctx.moveTo(p0[0], p0[1]); ctx.bezierCurveTo(c1[0], c1[1], c2[0], c2[1], p3[0], p3[1]); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.09)'; ctx.lineWidth = 0.018;
    ctx.beginPath();
    for (let i = 1; i < 22; i++) {
      const t = i / 22, [x, y] = at(t);
      const [x1, y1] = at(t - 0.02), [x2, y2] = at(Math.min(1, t + 0.02));
      const dx = x2 - x1, dy = y2 - y1, l = Math.hypot(dx, dy) || 1;
      for (const s of [1, -1]) {
        const w = wid(t, s);
        ctx.moveTo(x + (dx / l) * w * 0.25, y + (dy / l) * w * 0.25);
        ctx.lineTo(x - (dy / l) * w * 0.6 * s + (dx / l) * w * 1.6, y + (dx / l) * w * 0.6 * s + (dy / l) * w * 1.6);
      }
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07;
  }
  /* Jede Zeichenfunktion beginnt auf dem Ballkopf (0,0) und baut den Hut nach oben auf. */
  /* Legionärshelm und Championhelm sind ein Paar: dieselbe Grundform, einmal in Silber und einmal
     in Gold mit rotem Federkamm. Absichtlich wenige, große Formen – halbrunde Helmglocke, ein
     goldener Rand über der Stirn, der breite Nackenschirm nach hinten unten, zwei Wangenklappen und
     ein paar Nieten. Feine Verzierungen wären bei Ballgröße ohnehin nur Grieß.

     Gezeichnet wird von vorn, wie alle Hüte. Der Nackenschirm sitzt hinten und schaut darum links
     und rechts als Flügel unter der Glocke hervor – so liest man ihn in der Schrägsicht sofort. */
  function galea(ctx, gold, color) {
    // [dunkle Kante, Mitte, Glanz, Schatten, Rand] – von links nach rechts über die Glocke
    const metall = gold ? ['#8a6110', '#e0aa2e', '#fff0b8', '#c2891a', '#7a5410']
                        : ['#5c6371', '#aeb7c4', '#eef2f7', '#939bab', '#565d6b'];
    const zier = gold ? '#ffe08a' : '#ffd45e', zierRand = gold ? '#8a5f0c' : '#b8842a';
    const glocke = () => {
      const g = ctx.createLinearGradient(-1, 0, 1, 0);
      g.addColorStop(0, metall[0]); g.addColorStop(0.28, metall[1]); g.addColorStop(0.5, metall[2]);
      g.addColorStop(0.74, metall[3]); g.addColorStop(1, metall[4]);
      return g;
    };

    /* Federkamm: ein Fächer aus fünf Straußenfedern längs über der Glocke. Sie nehmen die Farbe des
       Balls an, genau wie der Busch am Ritterhelm – ein weißer Ball bekommt Rot, sonst ginge der
       Kamm auf dem hellen Helm unter. Zuerst gezeichnet, damit die Federfüße hinter der Helmglocke
       verschwinden – wie beim Ritterhelm braucht es dafür keinen extra Federhalter. */
    if (gold) {
      const [fDunkel, fHell] = plumeColors(color);
      const federn = [
        [[-0.10, -0.28], [-0.54, -0.66], [-0.96, -0.94], [-0.86, -1.40], 0.25],
        [[-0.05, -0.32], [-0.30, -0.84], [-0.48, -1.22], [-0.36, -1.62], 0.26],
        [[0.00, -0.34], [-0.02, -0.98], [0.07, -1.42], [0.02, -1.86], 0.28],
        [[0.05, -0.32], [0.32, -0.82], [0.52, -1.20], [0.40, -1.60], 0.26],
        [[0.10, -0.28], [0.56, -0.64], [0.98, -0.92], [0.90, -1.38], 0.25],
      ];
      for (const [p0, c1, c2, p3, w] of federn) plume(ctx, p0, c1, c2, p3, w, fDunkel, fHell);
    }

    // Nackenschirm: je ein Flügel links und rechts, nach hinten unten ausgestellt
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.56, 0.12);
      ctx.bezierCurveTo(s * 1.22, 0.20, s * 1.54, 0.60, s * 1.34, 1.02);
      ctx.bezierCurveTo(s * 1.12, 1.18, s * 0.82, 1.04, s * 0.68, 0.78);
      ctx.closePath();
      fs(ctx, metall[s < 0 ? 1 : 3]);
    }

    // Helmglocke über dem oberen Ballteil
    ctx.beginPath();
    ctx.moveTo(-0.96, 0.58);
    ctx.bezierCurveTo(-1.02, -0.04, -0.66, -0.54, 0, -0.54);
    ctx.bezierCurveTo(0.66, -0.54, 1.02, -0.04, 0.96, 0.58);
    ctx.bezierCurveTo(0.58, 0.74, -0.58, 0.74, -0.96, 0.58);
    ctx.closePath();
    fs(ctx, glocke());

    // Wangenklappen seitlich, hängen vor den Wangen herunter
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(s * 0.92, 0.44);
      ctx.bezierCurveTo(s * 1.02, 0.84, s * 0.92, 1.14, s * 0.64, 1.24);
      ctx.bezierCurveTo(s * 0.50, 1.10, s * 0.50, 0.78, s * 0.56, 0.48);
      ctx.closePath();
      fs(ctx, metall[s < 0 ? 1 : 3]);
    }

    // Goldener Rand über der Stirn
    ctx.beginPath();
    ctx.moveTo(-0.97, 0.28);
    ctx.bezierCurveTo(-0.58, 0.48, 0.58, 0.48, 0.97, 0.28);
    ctx.lineTo(0.97, 0.50);
    ctx.bezierCurveTo(0.58, 0.70, -0.58, 0.70, -0.97, 0.50);
    ctx.closePath();
    ctx.strokeStyle = zierRand; ctx.lineWidth = 0.05; fs(ctx, zier);
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07;

    // Nieten auf dem Rand
    ctx.fillStyle = zierRand;
    for (let i = 0; i < 5; i++) {
      const x = -0.68 + i * 0.34;
      ctx.beginPath(); ctx.arc(x, 0.44 + Math.cos(x * 1.6) * 0.05, 0.065, 0, TAU2); ctx.fill();
    }
  }

  const DEFS = {
    none() { /* barhäuptig */ },

    crown(ctx) { // Krone: Reif mit fünf Zacken und Edelsteinen
      const g = ctx.createLinearGradient(-0.8, 0, 0.8, 0);
      g.addColorStop(0, '#b8801f'); g.addColorStop(0.4, '#ffd75e'); g.addColorStop(0.7, '#f0b429'); g.addColorStop(1, '#a86f16');
      ctx.beginPath();
      ctx.moveTo(-0.8, 0.06); ctx.lineTo(-0.8, -0.3); ctx.lineTo(-0.68, -0.9); ctx.lineTo(-0.5, -0.42);
      ctx.lineTo(-0.34, -1.02); ctx.lineTo(-0.17, -0.46); ctx.lineTo(0, -1.14); ctx.lineTo(0.17, -0.46);
      ctx.lineTo(0.34, -1.02); ctx.lineTo(0.5, -0.42); ctx.lineTo(0.68, -0.9); ctx.lineTo(0.8, -0.3);
      ctx.lineTo(0.8, 0.06); ctx.closePath();
      fs(ctx, g);
      ctx.fillStyle = '#8a5a10'; ctx.fillRect(-0.8, -0.28, 1.6, 0.09); // Reif
      for (const [x, y, c] of [[-0.68, -0.84, '#4ec9e0'], [-0.34, -0.96, '#e8455f'], [0, -1.08, '#7fe07a'], [0.34, -0.96, '#e8455f'], [0.68, -0.84, '#4ec9e0']]) {
        ctx.beginPath(); ctx.arc(x, y, 0.11, 0, TAU2); ctx.fillStyle = c; ctx.fill();
      }
    },

    wizard(ctx) { // Zauberhut: breite Krempe, gebogene Spitze, Sterne
      brim(ctx, 1.1, 0.3, '#3d2568', -0.02);
      ctx.beginPath();
      ctx.moveTo(-0.58, -0.06);
      ctx.quadraticCurveTo(-0.5, -1.0, 0.34, -1.72); // linke Kante bis zur Spitze
      ctx.quadraticCurveTo(0.32, -1.1, 0.58, -0.06); // rechte Kante zurück
      ctx.closePath();
      const g = ctx.createLinearGradient(-0.6, 0, 0.6, -1.2);
      g.addColorStop(0, '#4a2f7a'); g.addColorStop(0.6, '#6b45ad'); g.addColorStop(1, '#3d2568');
      fs(ctx, g);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(-0.55, -0.34, 1.1, 0.18); // Hutband
      spark(ctx, -0.16, -0.62, 0.16, '#ffe98a'); spark(ctx, 0.1, -1.06, 0.13, '#fff6c8'); spark(ctx, 0.28, -1.42, 0.1, '#ffe98a');
    },

    pirate(ctx) { // Dreispitz mit Totenkopf
      ctx.beginPath();
      ctx.moveTo(-1.08, -0.3);
      ctx.quadraticCurveTo(-0.5, -1.06, 0, -1.0);
      ctx.quadraticCurveTo(0.5, -1.06, 1.08, -0.3);
      ctx.quadraticCurveTo(0.56, 0.2, 0, 0.22);
      ctx.quadraticCurveTo(-0.56, 0.2, -1.08, -0.3);
      ctx.closePath();
      const g = ctx.createLinearGradient(0, -1.0, 0, 0.2);
      g.addColorStop(0, '#33333f'); g.addColorStop(1, '#16161d');
      fs(ctx, g);
      ctx.fillStyle = '#f0ece2'; // Totenkopf
      ctx.beginPath(); ctx.arc(0, -0.5, 0.24, 0, TAU2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(0, -0.31, 0.13, 0.1, 0, 0, TAU2); ctx.fill();
      ctx.strokeStyle = '#f0ece2'; ctx.lineWidth = 0.1;
      ctx.beginPath(); ctx.moveTo(-0.42, -0.24); ctx.lineTo(0.42, -0.42); ctx.moveTo(-0.42, -0.42); ctx.lineTo(0.42, -0.24); ctx.stroke();
      ctx.fillStyle = '#16161d';
      ctx.beginPath(); ctx.arc(-0.09, -0.53, 0.06, 0, TAU2); ctx.arc(0.09, -0.53, 0.06, 0, TAU2); ctx.fill();
    },

    top(ctx) { // Zylinder mit rotem Band
      brim(ctx, 1.0, 0.27, '#25252e');
      ctx.beginPath(); ctx.moveTo(-0.58, -0.04); ctx.lineTo(-0.62, -1.08); ctx.lineTo(0.62, -1.08); ctx.lineTo(0.58, -0.04); ctx.closePath();
      const g = ctx.createLinearGradient(-0.62, 0, 0.62, 0);
      g.addColorStop(0, '#22222b'); g.addColorStop(0.4, '#43434f'); g.addColorStop(1, '#1d1d25');
      fs(ctx, g);
      ctx.beginPath(); ctx.ellipse(0, -1.08, 0.62, 0.17, 0, 0, TAU2); fs(ctx, '#4b4b58');
      ctx.fillStyle = '#c0392b'; ctx.fillRect(-0.6, -0.46, 1.2, 0.24);
      ctx.fillStyle = '#ffd166'; ctx.fillRect(-0.2, -0.46, 0.16, 0.24);
    },

    cap(ctx) { // Schirmmütze
      ctx.beginPath(); ctx.moveTo(0.12, 0.02); ctx.quadraticCurveTo(1.02, -0.14, 1.06, 0.1); ctx.quadraticCurveTo(0.66, 0.26, 0.12, 0.2); ctx.closePath();
      fs(ctx, '#a82f26'); // Schirm
      ctx.beginPath(); ctx.arc(0, 0.04, 0.74, Math.PI, TAU2); ctx.closePath();
      const g = ctx.createLinearGradient(-0.7, 0, 0.7, -0.6);
      g.addColorStop(0, '#b8362c'); g.addColorStop(0.5, '#e0483c'); g.addColorStop(1, '#8f281f');
      fs(ctx, g);
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.moveTo(0, -0.7); ctx.lineTo(0, 0.04); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.arc(0, -0.7, 0.1, 0, TAU2); fs(ctx, '#f4efe6'); // Knopf
    },

    viking(ctx) { // Wikingerhelm mit Hörnern
      const horn = d => {
        ctx.beginPath();
        ctx.moveTo(d * 0.62, -0.36);
        ctx.quadraticCurveTo(d * 1.42, -0.6, d * 1.3, -1.2);
        ctx.quadraticCurveTo(d * 1.02, -0.68, d * 0.56, -0.1);
        ctx.closePath();
        const g = ctx.createLinearGradient(d * 0.6, 0, d * 1.35, -1.1);
        g.addColorStop(0, '#c8bda2'); g.addColorStop(1, '#f4eede');
        fs(ctx, g);
      };
      horn(-1); horn(1);
      ctx.beginPath(); ctx.arc(0, 0.04, 0.72, Math.PI, TAU2); ctx.closePath();
      const g = ctx.createLinearGradient(-0.7, 0, 0.7, -0.6);
      g.addColorStop(0, '#767f8f'); g.addColorStop(0.45, '#b3bcc9'); g.addColorStop(1, '#6b7382');
      fs(ctx, g);
      ctx.beginPath(); ctx.rect(-0.73, -0.2, 1.46, 0.24); fs(ctx, '#c9a24e'); // Stirnband
      ctx.fillStyle = '#8a6a24';
      for (const x of [-0.5, -0.17, 0.17, 0.5]) { ctx.beginPath(); ctx.arc(x, -0.08, 0.06, 0, TAU2); ctx.fill(); }
      ctx.beginPath(); ctx.moveTo(-0.1, -0.02); ctx.lineTo(0.1, -0.02); ctx.lineTo(0.08, 0.32); ctx.lineTo(-0.08, 0.32); ctx.closePath();
      fs(ctx, '#9aa3b0'); // Nasenschutz
    },

    knight(ctx, color) { // Ritterhelm: legt sich um den ganzen Ball, als wäre er der Kopf
      // Federbusch wie bei den Feldherren: drei Straußenfedern fächern auf, die helle steht mittig.
      // Die beiden äußeren tragen die Farbe des Balls, die mittlere bleibt immer weiß.
      const [fDunkel, fHell] = plumeColors(color);
      plume(ctx, [-0.08, -0.3], [-0.55, -0.72], [-1.12, -0.94], [-1.02, -1.56], 0.32, fDunkel, fHell);
      plume(ctx, [0.08, -0.3], [0.56, -0.7], [1.14, -0.9], [1.04, -1.5], 0.32, fDunkel, fHell);
      plume(ctx, [0, -0.34], [-0.3, -1.06], [0.38, -1.5], [0.12, -2.08], 0.36, '#d8cfba', '#ffffff');
      // Helmglocke: umschließt den Ball bis kurz über den Boden, unten schaut ein Rest Ball heraus
      ctx.beginPath();
      ctx.moveTo(-1.06, 0.86);
      ctx.bezierCurveTo(-1.13, 0.14, -0.8, -0.4, 0, -0.4);
      ctx.bezierCurveTo(0.8, -0.4, 1.13, 0.14, 1.06, 0.86);
      ctx.bezierCurveTo(0.99, 1.24, 0.56, 1.4, 0, 1.4);
      ctx.bezierCurveTo(-0.56, 1.4, -0.99, 1.24, -1.06, 0.86);
      ctx.closePath();
      const g = ctx.createLinearGradient(-1.06, 0, 1.06, 0);
      g.addColorStop(0, '#5c6371'); g.addColorStop(0.26, '#aeb7c4'); g.addColorStop(0.46, '#e2e8f0');
      g.addColorStop(0.72, '#939bab'); g.addColorStop(1, '#565d6b');
      fs(ctx, g);
      // Kamm über die Mitte
      ctx.beginPath(); ctx.ellipse(0, 0.1, 0.16, 0.52, 0, 0, TAU2);
      ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.fill();
      // Sehschlitz mit Braue darüber
      ctx.fillStyle = '#1b2029';
      ctx.beginPath(); ctx.ellipse(0, 0.36, 0.74, 0.13, 0, 0, TAU2); ctx.fill();
      ctx.strokeStyle = 'rgba(255,255,255,0.45)'; ctx.lineWidth = 0.06;
      ctx.beginPath(); ctx.ellipse(0, 0.42, 0.8, 0.42, 0, Math.PI + 0.35, TAU2 - 0.35); ctx.stroke();
      // Luftschlitze im Visier
      ctx.fillStyle = '#232833';
      for (const [x, h] of [[-0.34, 0.3], [-0.12, 0.36], [0.12, 0.36], [0.34, 0.3]]) {
        ctx.beginPath(); ctx.ellipse(x, 0.82, 0.055, h / 2, 0, 0, TAU2); ctx.fill();
      }
      // Nietenreihe am unteren Rand
      ctx.fillStyle = 'rgba(60,66,78,0.9)';
      for (let i = -2; i <= 2; i++) {
        const a = i * 0.5;
        ctx.beginPath(); ctx.arc(Math.sin(a) * 0.86, 1.16 - (1 - Math.cos(a)) * 0.85, 0.055, 0, TAU2); ctx.fill();
      }
      // goldene Fassung, aus der die Federn wachsen
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.ellipse(0, -0.32, 0.22, 0.12, 0, 0, TAU2); fs(ctx, '#e0b84a');
    },

    legion(ctx) { galea(ctx, false); },   // Legionärshelm: Silber mit Gold – für die Teilnahme
    champion(ctx, color) { galea(ctx, true, color); },  // Championhelm: Gold mit Federkamm in Ballfarbe – der Siegerpreis

    /* ---------- Ganzkörper-Skins: Belohnung für den Besten einer Welt ----------
       Diese sechs ersetzen den Ball, statt auf ihm zu sitzen. Ihr Nullpunkt liegt darum in der
       Ballmitte, eine Einheit ist der Ballradius – die Kugel geht also von -1 bis +1. Alle bewegen
       sich nach der Spieluhr t: dieselbe Zahl auf jedem Gerät, also sehen beim Online-Spiel alle
       dasselbe. Gemeinsam ist ihnen die Glaskugel-Form, damit sie als eine Familie zu erkennen
       sind – der Inhalt macht die Welt. */

    globe(ctx, color, t) {   // Märchenland: Schneekugel mit Burg und Flocken
      glasKugel(ctx, '#bcdcff', '#6fa8dd');
      ctx.save(); kugelMaske(ctx);
      ctx.fillStyle = '#7ec27a'; ctx.beginPath(); ctx.ellipse(0, 0.72, 1.1, 0.42, 0, 0, TAU2); ctx.fill();
      ctx.fillStyle = '#d9d2c4';                                  // Burgturm
      ctx.fillRect(-0.30, -0.42, 0.24, 1.0); ctx.fillRect(0.08, -0.20, 0.20, 0.78);
      ctx.fillStyle = '#c0392c';                                  // Kegeldächer
      ctx.beginPath(); ctx.moveTo(-0.34, -0.42); ctx.lineTo(-0.18, -0.80); ctx.lineTo(-0.02, -0.42); ctx.closePath(); ctx.fill();
      ctx.beginPath(); ctx.moveTo(0.04, -0.20); ctx.lineTo(0.18, -0.52); ctx.lineTo(0.32, -0.20); ctx.closePath(); ctx.fill();
      ctx.fillStyle = '#ffd166'; ctx.fillRect(-0.24, -0.10, 0.10, 0.14); ctx.fillRect(0.13, 0.06, 0.09, 0.12);
      ctx.fillStyle = 'rgba(255,255,255,0.95)';                   // rieselnde Flocken
      for (let i = 0; i < 9; i++) {
        const x = -0.85 + ((i * 0.239) % 1.7);
        const y = -0.9 + (((t * 0.35 + i * 0.31) % 1) * 1.9);
        ctx.beginPath(); ctx.arc(x + Math.sin(t + i) * 0.05, y, 0.055, 0, TAU2); ctx.fill();
      }
      ctx.restore(); glasLicht(ctx);
    },

    aquarium(ctx, color, t) {   // Meereswelt: rundes Aquarium, in dem Fische schwimmen
      glasKugel(ctx, '#bfeaff', '#4aa3d8');
      ctx.save(); kugelMaske(ctx);
      const wasser = ctx.createLinearGradient(0, -0.5, 0, 1);      // Wasser bis knapp unter den Rand
      wasser.addColorStop(0, '#6fd0f0'); wasser.addColorStop(1, '#1f7ab8');
      ctx.fillStyle = wasser; ctx.fillRect(-1, -0.45, 2, 1.6);
      ctx.fillStyle = '#d9c48a'; ctx.beginPath(); ctx.ellipse(0, 1.05, 1, 0.42, 0, 0, TAU2); ctx.fill();  // Sand
      ctx.strokeStyle = '#3f9f5a'; ctx.lineWidth = 0.1; ctx.lineCap = 'round';   // Wasserpflanzen
      for (const [px, h] of [[-0.6, 0.5], [0.62, 0.38]]) {
        ctx.beginPath(); ctx.moveTo(px, 0.82);
        ctx.quadraticCurveTo(px + Math.sin(t * 1.6 + px) * 0.16, 0.82 - h * 0.6, px, 0.82 - h); ctx.stroke();
      }
      for (let i = 0; i < 3; i++) {   // Fische auf gestreckten Kreisbahnen, mit der Nase voran
        const p = (t * (0.26 + i * 0.05) + i * 0.37) % 1, a = p * TAU2;
        const fx = Math.cos(a) * (0.5 - i * 0.09), fy = 0.18 + Math.sin(a) * (0.3 - i * 0.06);
        fisch(ctx, fx, fy, 0.3 - i * 0.05, Math.cos(a) >= 0 ? -1 : 1, ['#ff8b3d', '#ffd166', '#ff5d8f'][i]);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.7)';   // aufsteigende Blasen
      for (let i = 0; i < 5; i++) {
        const p = ((t * 0.45 + i * 0.2) % 1);
        ctx.beginPath(); ctx.arc(-0.42 + i * 0.2 + Math.sin(t * 2 + i) * 0.05, 1.0 - p * 1.45, 0.045 + (i % 2) * 0.02, 0, TAU2); ctx.fill();
      }
      ctx.restore(); glasLicht(ctx);
    },

    cog(ctx, color, t) {   // Tüftlerreich: Messingkugel, in der Zahnräder mahlen
      glasKugel(ctx, '#f0dcae', '#a87c38');
      ctx.save(); kugelMaske(ctx);
      ctx.fillStyle = '#4a3a24'; ctx.fillRect(-1, -1, 2, 2);
      zahnrad(ctx, -0.22, -0.10, 0.52, 9, t * 1.1, '#d9a441', '#8a6420');
      zahnrad(ctx, 0.42, 0.34, 0.34, 7, -t * 1.45 + 0.3, '#c9c2b4', '#6d6558');
      zahnrad(ctx, 0.34, -0.46, 0.24, 6, t * 1.9, '#d9a441', '#8a6420');
      ctx.restore(); glasLicht(ctx);
    },

    idolhead(ctx, color, t) {   // Dschungeltempel: steinerner Götzenkopf mit glühenden Augen
      const g = ctx.createRadialGradient(-0.35, -0.4, 0.1, 0, 0, 1);
      g.addColorStop(0, '#b9b09a'); g.addColorStop(0.6, '#8d8571'); g.addColorStop(1, '#5c5546');
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU2); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.save(); kugelMaske(ctx);
      ctx.fillStyle = '#6f6857'; ctx.fillRect(-1, -1, 2, 0.42);            // Stirnband
      ctx.fillStyle = '#3f8f5a';                                            // Moos in den Fugen
      for (const [mx, my, mr] of [[-0.7, 0.35, 0.22], [0.66, 0.1, 0.18], [-0.1, 0.86, 0.26]]) {
        ctx.beginPath(); ctx.ellipse(mx, my, mr, mr * 0.6, 0, 0, TAU2); ctx.fill();
      }
      ctx.strokeStyle = 'rgba(50,44,32,0.5)'; ctx.lineWidth = 0.06;         // Meißelspuren
      for (const y of [-0.72, 0.5]) { ctx.beginPath(); ctx.moveTo(-0.8, y); ctx.lineTo(0.8, y + 0.08); ctx.stroke(); }
      ctx.fillStyle = '#4a4436';                                            // breite Nase und Mund
      ctx.beginPath(); ctx.moveTo(0, -0.12); ctx.lineTo(-0.18, 0.3); ctx.lineTo(0.18, 0.3); ctx.closePath(); ctx.fill();
      ctx.fillRect(-0.34, 0.5, 0.68, 0.13);
      const gl = 0.55 + 0.45 * Math.abs(Math.sin(t * 1.3));                 // glühende Augen
      for (const ex of [-0.42, 0.42]) {
        ctx.fillStyle = `rgba(120,255,140,${0.35 * gl})`;
        ctx.beginPath(); ctx.arc(ex, -0.24, 0.3, 0, TAU2); ctx.fill();
        ctx.fillStyle = `rgb(${Math.round(150 + 60 * gl)},255,${Math.round(150 + 60 * gl)})`;
        ctx.beginPath(); ctx.ellipse(ex, -0.24, 0.15, 0.11, 0, 0, TAU2); ctx.fill();
      }
      ctx.restore();
    },

    thunder(ctx, color, t) {   // Sturmhimmel: dunkle Wolkenkugel, in der es blitzt
      const zuck = ((t * 0.9) % 1) < 0.12 ? 1 : ((t * 0.9 + 0.45) % 1) < 0.06 ? 0.6 : 0;
      const g = ctx.createRadialGradient(-0.3, -0.4, 0.1, 0, 0, 1);
      g.addColorStop(0, zuck ? '#8fa6d8' : '#5a627e'); g.addColorStop(0.6, '#3c4258'); g.addColorStop(1, '#20243a');
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU2); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.save(); kugelMaske(ctx);
      ctx.fillStyle = 'rgba(255,255,255,0.14)';    // Wolkenballen
      for (const [cx2, cy2, cr] of [[-0.45, -0.3, 0.42], [0.2, -0.5, 0.36], [0.45, 0.1, 0.4], [-0.2, 0.35, 0.45]]) {
        ctx.beginPath(); ctx.arc(cx2 + Math.sin(t * 0.5 + cx2) * 0.06, cy2, cr, 0, TAU2); ctx.fill();
      }
      if (zuck) {                                   // Blitz quer durch die Kugel
        ctx.globalAlpha = zuck;
        ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.fillRect(-1, -1, 2, 2);
        ctx.strokeStyle = '#fff27a'; ctx.lineWidth = 0.13; ctx.lineJoin = 'miter';
        ctx.beginPath(); ctx.moveTo(-0.2, -0.85); ctx.lineTo(0.12, -0.2); ctx.lineTo(-0.14, -0.1);
        ctx.lineTo(0.24, 0.8); ctx.stroke();
        ctx.globalAlpha = 1; ctx.lineJoin = 'round';
      }
      ctx.fillStyle = 'rgba(180,210,255,0.7)';      // Regen
      for (let i = 0; i < 7; i++) {
        const x = -0.8 + i * 0.24, y = -0.2 + (((t * 1.6 + i * 0.27) % 1) * 1.4);
        ctx.fillRect(x, y, 0.05, 0.2);
      }
      ctx.restore(); glasLicht(ctx);
    },

    orb(ctx, color, t) {   // Schattenreich: Kristallkugel mit wabernden Schwaden und einem Auge
      glasKugel(ctx, '#d9bcff', '#6a3fa8');
      ctx.save(); kugelMaske(ctx);
      const g = ctx.createRadialGradient(0, 0, 0.1, 0, 0, 1);
      g.addColorStop(0, '#4a2470'); g.addColorStop(1, '#1a0d2e');
      ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2);
      ctx.fillStyle = 'rgba(180,120,255,0.3)';      // ziehende Schwaden
      for (let i = 0; i < 4; i++) {
        const a = t * 0.5 + i * 1.6;
        ctx.beginPath(); ctx.ellipse(Math.cos(a) * 0.35, Math.sin(a * 0.8) * 0.32, 0.55, 0.24, a, 0, TAU2); ctx.fill();
      }
      const bl = 0.5 + 0.5 * Math.sin(t * 2.2);     // das Auge blickt umher
      const bx = Math.sin(t * 0.7) * 0.22, by = Math.cos(t * 0.5) * 0.12;
      ctx.fillStyle = '#ffeccd'; ctx.beginPath(); ctx.ellipse(0, 0.02, 0.46, 0.3, 0, 0, TAU2); ctx.fill();
      ctx.fillStyle = '#7a2fd0'; ctx.beginPath(); ctx.arc(bx, 0.02 + by, 0.2, 0, TAU2); ctx.fill();
      ctx.fillStyle = '#14061f'; ctx.beginPath(); ctx.ellipse(bx, 0.02 + by, 0.07, 0.16, 0, 0, TAU2); ctx.fill();
      ctx.fillStyle = `rgba(255,255,255,${0.5 + 0.4 * bl})`; ctx.beginPath(); ctx.arc(bx - 0.09, by - 0.06, 0.05, 0, TAU2); ctx.fill();
      ctx.restore(); glasLicht(ctx);
    },
  };

  /* ---------- Bausteine der Ganzkörper-Skins ---------- */
  /* Glaskugel als Hintergrund: heller Rand, damit die Kugel rund wirkt */
  function glasKugel(ctx, hell, dunkel) {
    const g = ctx.createRadialGradient(-0.35, -0.4, 0.1, 0, 0, 1);
    g.addColorStop(0, hell); g.addColorStop(1, dunkel);
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07; ctx.stroke();
  }
  /* Alles Weitere bleibt in der Kugel */
  function kugelMaske(ctx) { ctx.beginPath(); ctx.arc(0, 0, 0.97, 0, TAU2); ctx.clip(); }
  /* Glanzlicht und Rand obendrauf – erst damit sieht die Kugel nach Glas aus */
  function glasLicht(ctx) {
    ctx.fillStyle = 'rgba(255,255,255,0.45)';
    ctx.beginPath(); ctx.ellipse(-0.38, -0.44, 0.3, 0.18, -0.6, 0, TAU2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.arc(0, 0, 0.94, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU2); ctx.stroke();
  }
  /* Ein Fisch: Tropfenkörper mit Schwanzflosse, d = Blickrichtung (-1 links, 1 rechts) */
  function fisch(ctx, x, y, gr, d, col) {
    ctx.save(); ctx.translate(x, y); ctx.scale(d * gr, gr);
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, 0.62, 0.36, 0, 0, TAU2); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.5, 0); ctx.lineTo(-1.05, -0.42); ctx.lineTo(-1.05, 0.42); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.arc(0.32, -0.09, 0.12, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#20242e'; ctx.beginPath(); ctx.arc(0.35, -0.09, 0.06, 0, TAU2); ctx.fill();
    ctx.restore();
  }
  /* Ein Zahnrad mit z Zähnen, um w gedreht */
  function zahnrad(ctx, x, y, r, z, w, hell, dunkel) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(w);
    ctx.fillStyle = dunkel;
    for (let i = 0; i < z; i++) {
      const a = (i / z) * TAU2;
      ctx.save(); ctx.rotate(a); ctx.fillRect(-r * 0.16, -r * 1.22, r * 0.32, r * 0.4); ctx.restore();
    }
    ctx.fillStyle = hell; ctx.beginPath(); ctx.arc(0, 0, r * 0.88, 0, TAU2); ctx.fill();
    ctx.fillStyle = dunkel; ctx.beginPath(); ctx.arc(0, 0, r * 0.28, 0, TAU2); ctx.fill();
    ctx.strokeStyle = dunkel; ctx.lineWidth = r * 0.1;
    for (let i = 0; i < 4; i++) {
      const a = (i / 4) * TAU2;
      ctx.beginPath(); ctx.moveTo(Math.cos(a) * r * 0.3, Math.sin(a) * r * 0.3);
      ctx.lineTo(Math.cos(a) * r * 0.8, Math.sin(a) * r * 0.8); ctx.stroke();
    }
    ctx.restore();
  }

  /* Reihenfolge und Namen für das Menü */
  const LIST = [
    { id: 'none', name: 'Ohne', icon: '⚪' },
    { id: 'crown', name: 'Krone', icon: '👑' },
    { id: 'wizard', name: 'Zauberhut', icon: '🧙' },
    { id: 'pirate', name: 'Piratenhut', icon: '🏴‍☠️' },
    { id: 'top', name: 'Zylinder', icon: '🎩' },
    { id: 'cap', name: 'Kappe', icon: '🧢' },
    { id: 'viking', name: 'Wikingerhelm', icon: '🐂' },
    { id: 'knight', name: 'Ritterhelm', icon: '⚔️' },
    { id: 'legion', name: 'Legionärshelm', icon: '🪖' },
    /* Belohnungen: Wer in einer Welt den Rundenrekord der Kombi-Wertung hält, darf ihren Skin
       tragen. Verliert er ihn wieder, ist auch der Skin wieder weg – die Auszeichnung gilt für
       den aktuellen Bestand, nicht für die Ewigkeit. */
    { id: 'globe', name: 'Märchenkugel', icon: '🏰', welt: 'normal', voll: true },
    { id: 'aquarium', name: 'Aquarium', icon: '🐠', welt: 'sea', voll: true },
    { id: 'cog', name: 'Zahnradkugel', icon: '⚙️', welt: 'pro', voll: true },
    { id: 'idolhead', name: 'Götzenkopf', icon: '🗿', welt: 'jungle', voll: true },
    { id: 'thunder', name: 'Gewitterkugel', icon: '⛈️', welt: 'storm', voll: true },
    { id: 'orb', name: 'Kristallkugel', icon: '🔮', welt: 'shadow', voll: true },
    { id: 'champion', name: 'Championhelm', icon: '🏅', welt: 'colosseum' },
  ];
  const byId = id => LIST.find(h => h.id === id);

  /* Hut auf einen Ball zeichnen: (cx, cy) ist die Ballmitte auf dem Schirm, r sein Radius.
     Ein Ganzkörper-Skin ersetzt den Ball, statt auf ihm zu sitzen – für ihn liegt der Nullpunkt
     darum in der Ballmitte und nicht auf dem Kopf. t ist die Spieluhr für die Bewegung. */
  function draw(ctx, id, cx, cy, r, color, t) {
    const d = DEFS[id];
    if (!d || id === 'none' || r < 1) return;
    ctx.save();
    if (voll(id)) ctx.translate(cx, cy); else ctx.translate(cx, cy - r * 0.72);
    ctx.scale(r, r);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 0.07; ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    d(ctx, color, t || 0);
    if (voll(id)) {   // Reif in Spielerfarbe: sonst wüsste bei vier Spielern niemand, wem der Ball gehört
      ctx.strokeStyle = color || '#ffffff'; ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.arc(0, 0, 0.965, 0, TAU2); ctx.stroke();
    }
    ctx.restore();
  }

  /* Vorschaubild fürs Menü: Ball in Spielerfarbe mit dem Hut darauf */
  function preview(cv, id, color) {
    const ctx = cv.getContext('2d');
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth || 64, h = cv.clientHeight || 64;
    cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    const r = w * 0.21, cx = w / 2, cy = h * 0.76; // etwas kleiner, damit auch der hohe Federbusch ins Bild passt
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 1.05, r * 1.05, r * 0.3, 0, 0, TAU2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
    if (!voll(id)) {   // ein Ganzkörper-Skin bringt seine eigene Kugel mit
      const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, dim(color, 0.55));
      ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU2);
      ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    }
    draw(ctx, id, cx, cy, r, color, 0);
  }

  /* Ganzkörper-Skin: ersetzt den Ball, statt auf ihm zu sitzen */
  const voll = id => { const h = byId(id); return !!(h && h.voll); };

  /* Ist dieser Hut schon zu haben? Ein Skin gehört dem, der in seiner Welt den Rundenrekord der
     Kombi-Wertung hält – und nur solange er ihn hält. Gezeichnet wird ein gesperrter Skin
     trotzdem: Kommt er über das Netz vom Ball eines Mitspielers, soll man ihn sehen, egal was auf
     dem eigenen Gerät in der Rangliste steht.
     Best wird erst nach hats.js geladen, darum die Abfrage hier drin und nicht oben. */
  function freigeschaltet(id) {
    const h = byId(id);
    if (!h || !h.welt) return true;
    if (typeof Best === 'undefined' || !Best.name) return false;
    const rekord = Best.of(h.welt).combo.round;
    return !!(rekord && rekord.n && rekord.n === Best.name);
  }
  /* Wie man ihn bekommt – für den Hinweis am gesperrten Platz */
  function bedingung(id) {
    const h = byId(id);
    if (!h || !h.welt) return '';
    const w = (typeof WORLDS !== 'undefined' && WORLDS.find(x => x.id === h.welt)) || null;
    return `Halte den Kombi-Rundenrekord: ${w ? w.name : 'dieser Welt'}`;
  }

  return {
    LIST, draw, preview, freigeschaltet, bedingung, voll,
    has: id => Object.prototype.hasOwnProperty.call(DEFS, id),
    name: id => (byId(id) || LIST[0]).name,
    icon: id => (byId(id) || LIST[0]).icon,
  };
})();
