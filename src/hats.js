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
  /* eine Blüte aus fünf Blättern mit gelber Mitte */
  function bloom(ctx, x, y, r, col) {
    ctx.fillStyle = col;
    for (let i = 0; i < 5; i++) {
      const a = i * TAU2 / 5 - Math.PI / 2;
      ctx.beginPath(); ctx.ellipse(x + Math.cos(a) * r * 0.62, y + Math.sin(a) * r * 0.62, r * 0.5, r * 0.38, a, 0, TAU2); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(x, y, r * 0.34, 0, TAU2); ctx.fillStyle = '#ffd45e'; ctx.fill();
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

    party(ctx) { // Partyhut mit Streifen und Bommel
      ctx.save();
      ctx.beginPath(); ctx.moveTo(-0.64, 0.1); ctx.lineTo(0, -1.5); ctx.lineTo(0.64, 0.1); ctx.closePath();
      ctx.save(); ctx.clip();
      ctx.fillStyle = '#ffd166'; ctx.fillRect(-0.7, -1.6, 1.4, 1.8);
      const cols = ['#e8455f', '#4ec9e0', '#7fe07a'];
      for (let i = 0; i < 6; i++) { ctx.fillStyle = cols[i % 3]; ctx.save(); ctx.translate(0, 0.1 - i * 0.28); ctx.rotate(-0.35); ctx.fillRect(-1, -0.12, 2, 0.14); ctx.restore(); }
      ctx.restore();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.restore();
      ctx.beginPath(); ctx.arc(0, -1.56, 0.22, 0, TAU2); fs(ctx, '#ff5d8f');
    },

    straw(ctx) { // Strohhut mit Band
      brim(ctx, 1.22, 0.34, '#d9b872', 0.02);
      ctx.beginPath(); ctx.ellipse(0, 0.02, 0.62, 0.62, 0, Math.PI, TAU2); ctx.closePath();
      const g = ctx.createLinearGradient(-0.6, 0, 0.6, -0.6);
      g.addColorStop(0, '#d3ab63'); g.addColorStop(0.45, '#f0d79a'); g.addColorStop(1, '#c39c56');
      fs(ctx, g);
      ctx.save();
      ctx.beginPath(); ctx.ellipse(0, 0.02, 0.62, 0.62, 0, Math.PI, TAU2); ctx.clip();
      ctx.fillStyle = '#3f8f5a'; ctx.fillRect(-0.7, -0.24, 1.4, 0.22);
      ctx.restore();
      ctx.strokeStyle = 'rgba(120,90,40,0.45)'; ctx.lineWidth = 0.04;
      for (const y of [-0.36, -0.5]) { ctx.beginPath(); ctx.ellipse(0, 0.02, 0.6, 0.6, 0, Math.PI + 0.5 + y * 0.4, TAU2 - 0.5 - y * 0.4); ctx.stroke(); }
    },

    horns(ctx) { // Teufelshörner
      const horn = d => {
        ctx.beginPath();
        ctx.moveTo(d * 0.16, 0.04);
        ctx.quadraticCurveTo(d * 0.72, -0.28, d * 0.66, -0.98);
        ctx.quadraticCurveTo(d * 0.42, -0.44, d * 0.04, -0.06);
        ctx.closePath();
        const g = ctx.createLinearGradient(0, 0, d * 0.7, -0.9);
        g.addColorStop(0, '#8e1f1a'); g.addColorStop(1, '#e0503f');
        fs(ctx, g);
      };
      horn(-1); horn(1);
    },

    flower(ctx) { // Blumenkranz
      ctx.strokeStyle = '#3f8f5a'; ctx.lineWidth = 0.14;
      ctx.beginPath(); ctx.ellipse(0, 0.02, 0.82, 0.5, 0, Math.PI + 0.25, TAU2 - 0.25); ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07;
      const cols = ['#ff8ec4', '#fff2a8', '#a8d8ff', '#ffb36b', '#ff8ec4'];
      for (let i = 0; i < 5; i++) {
        const a = Math.PI + 0.32 + i * (Math.PI - 0.64) / 4;
        bloom(ctx, Math.cos(a) * 0.82, 0.02 + Math.sin(a) * 0.5, 0.24, cols[i]);
      }
    },

    legion(ctx) { galea(ctx, false); },   // Legionärshelm: Silber mit Gold – für die Teilnahme
    champion(ctx, color) { galea(ctx, true, color); },  // Championhelm: Gold mit Federkamm in Ballfarbe – der Siegerpreis
  };

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
    { id: 'party', name: 'Partyhut', icon: '🎉' },
    { id: 'straw', name: 'Strohhut', icon: '👒' },
    { id: 'horns', name: 'Teufelshörner', icon: '😈' },
    { id: 'flower', name: 'Blumenkranz', icon: '🌸' },
    { id: 'legion', name: 'Legionärshelm', icon: '🪖' },
    /* Gesperrt: den Championhelm gibt es schon, er ist nur noch nicht zu sehen. Freigeschaltet wird
       bisher nichts – wie man ihn gewinnt, kommt später. Hier steht nur die Sperre. */
    { id: 'champion', name: 'Championhelm', icon: '🏅', locked: true },
  ];
  const byId = id => LIST.find(h => h.id === id);

  /* Hut auf einen Ball zeichnen: (cx, cy) ist die Ballmitte auf dem Schirm, r sein Radius */
  function draw(ctx, id, cx, cy, r, color) {
    const d = DEFS[id];
    if (!d || id === 'none' || r < 1) return;
    ctx.save();
    ctx.translate(cx, cy - r * 0.72);
    ctx.scale(r, r);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 0.07; ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    d(ctx, color);
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
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, dim(color, 0.55));
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU2);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    draw(ctx, id, cx, cy, r, color);
  }

  /* Ist dieser Hut schon zu haben? Die eine Stelle, an der später die Freischaltung beantwortet
     wird – bis dahin bleibt ein gesperrter Hut gesperrt. Gezeichnet wird er trotzdem: Kommt der
     Hut eines Mitspielers übers Netz, soll er zu sehen sein, egal was hier steht. */
  const freigeschaltet = id => { const h = byId(id); return !h || !h.locked; };
  /* Nur die Hüte, die in der Auswahl auftauchen dürfen */
  const sichtbar = () => LIST.filter(h => freigeschaltet(h.id));

  return {
    LIST, draw, preview, freigeschaltet, sichtbar,
    has: id => Object.prototype.hasOwnProperty.call(DEFS, id),
    name: id => (byId(id) || LIST[0]).name,
    icon: id => (byId(id) || LIST[0]).icon,
  };
})();
