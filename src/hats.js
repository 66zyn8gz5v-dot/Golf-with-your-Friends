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
  function galea(ctx, gold, color, t) {
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
      federn.forEach(([p0, c1, c2, p3, w], i) => {
        // Die Spitzen wiegen sich, der Ansatz bleibt am Helm stehen – wie bei echten Federn
        const wieg = Math.sin((t || 0) * 1.6 + i * 0.7) * 0.07;
        plume(ctx, p0, c1, [c2[0] + wieg * 0.6, c2[1]], [p3[0] + wieg, p3[1]], w, fDunkel, fHell);
      });
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
    champion(ctx, color, t) { galea(ctx, true, color, t); },  // Championhelm: Gold mit Federkamm in Ballfarbe – der Siegerpreis

    /* ---------- Ganzkörper-Skins: Belohnung für den Besten einer Welt ----------
       Diese sechs ersetzen den Ball, statt auf ihm zu sitzen. Ihr Nullpunkt liegt darum in der
       Ballmitte, eine Einheit ist der Ballradius – die Kugel geht also von -1 bis +1. Alle bewegen
       sich nach der Spieluhr t: dieselbe Zahl auf jedem Gerät, also sehen beim Online-Spiel alle
       dasselbe. Gemeinsam ist ihnen die Glaskugel-Form, damit sie als eine Familie zu erkennen
       sind – der Inhalt macht die Welt. */

    /* Märchenland: weißes Porzellan mit blauem Rankenmuster, darüber die goldene Zackenkrone mit
       roten Steinen. Bewusst ruhig gehalten – das Stück lebt vom Kontrast aus kühlem Weiß, tiefem
       Kobaltblau und warmem Gold, nicht von vielen Einzelteilen. Bewegt wird nur, was sich an
       echtem Porzellan auch bewegen würde: der Glanz, wenn man es dreht. */
    royal(ctx, color, t, fein) {
      const g = ctx.createRadialGradient(-0.34, -0.4, 0.06, 0, 0, 1);
      g.addColorStop(0, '#ffffff'); g.addColorStop(0.5, '#f4f7fb'); g.addColorStop(1, '#c2cddd');
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU2); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.save(); kugelMaske(ctx);
      ranken(ctx, fein);
      ctx.restore();
      steinRand(ctx);
      glasur(ctx, t);
      return () => koenigskrone(ctx, t, fein);   // der Hut liegt über dem Reif in Spielerfarbe
    },

    aquarium(ctx, color, t, fein) {   // Meereswelt: rundes Becken mit Fischen, Pflanzen und Lichtstrahlen
      glasKugel(ctx, '#c8f0ff', '#3f9bd4');
      ctx.save(); kugelMaske(ctx);
      const wasser = ctx.createLinearGradient(0, -0.55, 0, 1.1);
      wasser.addColorStop(0, '#8fdcf5'); wasser.addColorStop(0.45, '#3fa3d8'); wasser.addColorStop(1, '#125e94');
      ctx.fillStyle = wasser; ctx.fillRect(-1, -0.8, 2, 1.9);
      // schmaler Luftraum über der Wasserlinie, die Linie selbst wellt sich
      ctx.fillStyle = '#e7f7ff'; ctx.fillRect(-1, -1, 2, 0.22);
      ctx.fillStyle = '#a8e4fb'; ctx.beginPath(); ctx.moveTo(-1, -0.78);
      for (let x = -1; x <= 1.02; x += 0.1) ctx.lineTo(x, -0.78 + Math.sin(x * 5 + t * 1.6) * 0.03);
      ctx.lineTo(1, -0.68); ctx.lineTo(-1, -0.68); ctx.closePath(); ctx.fill();
      // Lichtstrahlen von oben, die langsam wandern
      ctx.fillStyle = 'rgba(255,255,255,0.16)'; ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const x = -0.6 + i * 0.6 + Math.sin(t * 0.35 + i * 2) * 0.14;
        ctx.moveTo(x - 0.09, -0.72); ctx.lineTo(x + 0.09, -0.72);
        ctx.lineTo(x + 0.34, 1.1); ctx.lineTo(x - 0.2, 1.1); ctx.closePath();
      }
      ctx.fill();
      // Sandbank mit Kieseln, davor Muschel und Seestern
      ctx.fillStyle = '#e3cf96'; ctx.beginPath(); ctx.ellipse(0, 1.02, 1.1, 0.44, 0, 0, TAU2); ctx.fill();
      if (fein) {
        ctx.fillStyle = '#cbb47a'; ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const kx = -0.8 + streu(i, 8) * 1.6, ky = 0.68 + streu(i, 9) * 0.14, kr = 0.05 + streu(i, 10) * 0.04;
          ctx.moveTo(kx + kr, ky); ctx.ellipse(kx, ky, kr, 0.035, 0, 0, TAU2);
        }
        ctx.fill();
        muschel(ctx, 0.44, 0.70);
        seestern(ctx, -0.34, 0.8);
      }
      // zwei Pflanzenbüschel, jedes Blatt mit eigener Phase
      for (const [px, n, hh] of [[-0.72, 3, 0.62], [0.66, 3, 0.5]]) {
        ctx.strokeStyle = '#3f9f5a'; ctx.lineCap = 'round';
        for (let i = 0; i < n; i++) {
          const bx = px + (i - 1) * 0.11, h = hh * (0.7 + streu(i, 11) * 0.5);
          ctx.lineWidth = 0.085 - i * 0.012;
          ctx.strokeStyle = i === 1 ? '#4cb86a' : '#358a4c';
          ctx.beginPath(); ctx.moveTo(bx, 0.78);
          ctx.quadraticCurveTo(bx + Math.sin(t * 1.5 + i * 1.3 + px) * 0.2, 0.78 - h * 0.55, bx + Math.sin(t * 1.5 + i * 1.3 + px) * 0.12, 0.78 - h);
          ctx.stroke();
        }
      }
      // ein kleiner Schwarm zieht im Hintergrund vorbei
      const sp = (t * 0.13 + 0.2) % 1, sx = -1.3 + sp * 2.6, sy = -0.05 + Math.sin(t * 0.9) * 0.12;
      for (let i = 0; fein && i < 3; i++) {
        fisch(ctx, sx - (i % 2) * 0.16, sy + (i ? 0.09 : -0.09) + Math.sin(t * 3 + i) * 0.02,
          0.12, 1, '#4d87a0', t * 9 + i);
      }
      // drei große Fische auf gestreckten Bahnen, Schwanz im Takt, Nase voran
      for (let i = 0; i < 3; i++) {
        const p = (t * (0.19 + i * 0.05) + i * 0.37) % 1, a = p * TAU2;
        const rx = 0.56 - i * 0.1, ry = 0.34 - i * 0.07;
        const fx = Math.cos(a) * rx, fy = 0.2 + Math.sin(a) * ry;
        const d = Math.sin(a) >= 0 ? 1 : -1;   // Blickrichtung folgt der Bahn
        fisch(ctx, fx, fy, 0.32 - i * 0.05, -d, ['#ff8b3d', '#ffd166', '#ff5d8f'][i], t * (7 + i) + i);
      }
      // Blasen aus einer Stelle im Sand: steigen, wackeln und werden größer
      ctx.fillStyle = 'rgba(255,255,255,0.42)'; ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 0.02;
      ctx.beginPath();
      for (let i = 0; i < (fein ? 6 : 3); i++) {
        const p = (t * 0.4 + streu(i, 12)) % 1;
        const y = 0.72 - p * 1.25, r = (0.028 + streu(i, 13) * 0.03) * (0.6 + p * 0.7);
        const bx2 = 0.16 + Math.sin(t * 2.4 + i * 2) * 0.07;
        ctx.moveTo(bx2 + r, y); ctx.arc(bx2, y, r, 0, TAU2);
      }
      ctx.fill(); ctx.stroke();
      ctx.restore(); glasLicht(ctx);
      return () => schiffchen(ctx, t, fein);   // der Hut liegt über dem Reif in Spielerfarbe
    },

    cog(ctx, color, t, fein) {   // Tüftlerreich: Messingwerk, in dem Räder greifen und ein Kolben läuft
      glasKugel(ctx, '#f6e3b6', '#9c7130');
      ctx.save(); kugelMaske(ctx);
      // Grundplatte mit Schraffur und Nieten
      const platte = ctx.createLinearGradient(-1, -1, 1, 1);
      platte.addColorStop(0, '#4a3a24'); platte.addColorStop(1, '#241a10');
      ctx.fillStyle = platte; ctx.fillRect(-1, -1, 2, 2);
      if (fein) {
        ctx.strokeStyle = 'rgba(255,215,140,0.07)'; ctx.lineWidth = 0.05;
        ctx.beginPath();
        for (let i = -4; i <= 4; i++) { ctx.moveTo(-1, i * 0.28); ctx.lineTo(1, i * 0.28 + 0.6); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,220,150,0.16)'; ctx.beginPath();
        for (const [nx, ny] of [[-0.78, -0.72], [0.74, -0.7], [-0.8, 0.68], [0.76, 0.7]]) {
          ctx.moveTo(nx + 0.055, ny); ctx.arc(nx, ny, 0.055, 0, TAU2);
        }
        ctx.fill();
      }
      // Kolben im Zylinder rechts – die Kurbel sitzt auf dem großen Rad
      const AX = -0.34, AY = 0.16, zA = 12, MOD = 0.07, rA = MOD * zA / 2;
      const wA = t * 1.15;
      const kx = AX + Math.cos(wA) * 0.19, ky = AY + Math.sin(wA) * 0.19;   // Kurbelzapfen
      const KY = 0.6, L = 0.9;                                              // Kolbenachse und Pleuellänge
      const px = kx + Math.sqrt(Math.max(0.01, L * L - (KY - ky) * (KY - ky)));
      ctx.fillStyle = '#2b2218'; ctx.strokeStyle = '#b98f42'; ctx.lineWidth = 0.055;
      ctx.beginPath(); ctx.rect(0.18, KY - 0.2, 0.92, 0.4); ctx.fill(); ctx.stroke();
      ctx.strokeStyle = '#e0bb6a'; ctx.lineWidth = 0.075; ctx.lineCap = 'round';   // Pleuelstange
      ctx.beginPath(); ctx.moveTo(kx, ky); ctx.lineTo(px, KY); ctx.stroke();
      ctx.fillStyle = '#f0c76e'; ctx.strokeStyle = '#7a5620'; ctx.lineWidth = 0.045;
      ctx.beginPath(); ctx.rect(px - 0.1, KY - 0.16, 0.2, 0.32); ctx.fill(); ctx.stroke();
      // drei greifende Räder: Radius nach Zähnezahl, Winkel nach Eingriff
      const zB = 8, rB = MOD * zB / 2, p1 = -1.15;
      const BX = AX + Math.cos(p1) * (rA + rB), BY = AY + Math.sin(p1) * (rA + rB);
      const wB = eingriff(wA, zA, zB, p1);
      const zC = 6, rC = MOD * zC / 2, p2 = 0.2;
      const CX = BX + Math.cos(p2) * (rB + rC), CY = BY + Math.sin(p2) * (rB + rC);
      const wC = eingriff(wB, zB, zC, p2);
      zahnrad(ctx, AX, AY, rA, zA, wA, '#d9a441', '#7a5620', fein);
      zahnrad(ctx, BX, BY, rB, zB, wB, '#c9c2b4', '#615a4e', fein);
      zahnrad(ctx, CX, CY, rC, zC, wC, '#d9a441', '#7a5620', fein);
      ctx.fillStyle = '#e8c060'; ctx.beginPath(); ctx.arc(kx, ky, 0.06, 0, TAU2); ctx.fill();   // Zapfen
      // Dampf aus dem Röhrchen oben links
      ctx.fillStyle = '#2b2218'; ctx.strokeStyle = '#b98f42'; ctx.lineWidth = 0.04;
      ctx.beginPath(); ctx.rect(-0.78, -0.46, 0.16, 0.34); ctx.fill(); ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath();
      for (let i = 0; fein && i < 4; i++) {
        const p = (t * 0.55 + i * 0.25) % 1;
        const dx2 = -0.7 + Math.sin(p * 5) * 0.12, dy2 = -0.52 - p * 0.4, dr = (0.06 + p * 0.15) * (1 - p * 0.7);
        ctx.moveTo(dx2 + dr, dy2); ctx.arc(dx2, dy2, dr, 0, TAU2);
      }
      ctx.fill();
      ctx.restore(); glasLicht(ctx);
      return () => tueftlerZylinder(ctx, t, fein);   // der Hut kommt nach dem Reif, er sitzt obenauf
    },

    /* Dschungeltempel: ein dunkler Tempelstein mit eingemeißelten Glyphen, darüber die Federkrone
       des Tempelwächters in Türkis und Gold. Die Glyphen glimmen grün – schwach, wie etwas, das
       seit Jahrhunderten dort liegt, nicht wie eine Leuchtreklame. Eine Welle läuft langsam durch
       sie hindurch, so dass mal die eine, mal die andere heller steht.

       Reihenfolge: erst die Federn, dann der Stein, dann das Stirnband. So verschwinden die
       Federfüße hinter dem Stein und das Band liegt davor – es braucht keinen Halter. */
    feathercrown(ctx, color, t, fein) {
      federn(ctx, t, fein);

      const g = ctx.createRadialGradient(-0.36, -0.42, 0.08, 0, 0, 1);
      g.addColorStop(0, '#5c645b'); g.addColorStop(0.5, '#3b423c'); g.addColorStop(1, '#1b1f1b');
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU2); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07; ctx.stroke();

      if (fein) {   // Poren und Abplatzer, damit die Fläche nicht wie lackiert wirkt
        for (const [farbe, dreh] of [['rgba(0,0,0,0.22)', 40], ['rgba(255,255,255,0.07)', 43]]) {
          ctx.fillStyle = farbe; ctx.beginPath();
          for (let i = 0; i < 7; i++) {
            const px = -0.85 + streu(i, dreh) * 1.7, py = -0.85 + streu(i, dreh + 1) * 1.7;
            if (px * px + py * py > 0.78) continue;
            const pr = 0.03 + streu(i, dreh + 2) * 0.05;
            ctx.moveTo(px + pr, py); ctx.ellipse(px, py, pr, pr * 0.7, 0, 0, TAU2);
          }
          ctx.fill();
        }
      }

      /* Die Glyphen: eine breite Spalte in der Mitte, zwei schmalere daneben. Nach außen werden
         sie kleiner – so liest man die Wölbung des Steins. */
      const glyphen = fein
        ? [[0, -0.28, 0.19, 0], [0, 0.08, 0.19, 1], [0, 0.44, 0.19, 2],
           [-0.47, -0.12, 0.14, 3], [-0.47, 0.3, 0.14, 4],
           [0.47, -0.12, 0.14, 5], [0.47, 0.3, 0.14, 2]]
        : [[0, -0.28, 0.19, 0], [0, 0.08, 0.19, 1], [0, 0.44, 0.19, 2]];
      // Erst die Kerbe: dunkel und einen Hauch versetzt, das sieht nach Meißel aus
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      ctx.strokeStyle = 'rgba(8,12,8,0.7)'; ctx.lineWidth = 0.055;
      ctx.beginPath();
      for (const [gx, gy, gs, art] of glyphen) glyphePfad(ctx, art, gx, gy + 0.014, gs);
      ctx.stroke();
      // Dann das Glimmen, in drei Helligkeitsgruppen – drei Striche statt sieben
      const gruppen = [[], [], []];
      glyphen.forEach((gl, i) => {
        const h = Math.max(0, Math.sin(t * 0.85 - i * 0.6));
        gruppen[h < 0.25 ? 0 : h < 0.62 ? 1 : 2].push(gl);
      });
      if (fein && gruppen[2].length) {   // weicher Schein nur um die hellsten
        ctx.strokeStyle = 'rgba(126,255,168,0.11)'; ctx.lineWidth = 0.15;
        ctx.beginPath();
        for (const [gx, gy, gs, art] of gruppen[2]) glyphePfad(ctx, art, gx, gy, gs);
        ctx.stroke();
      }
      ctx.lineWidth = 0.04;
      for (let k = 0; k < 3; k++) {
        if (!gruppen[k].length) continue;
        ctx.strokeStyle = `rgba(126,255,168,${[0.16, 0.34, 0.6][k]})`;
        ctx.beginPath();
        for (const [gx, gy, gs, art] of gruppen[k]) glyphePfad(ctx, art, gx, gy, gs);
        ctx.stroke();
      }

      steinRand(ctx);
      ctx.fillStyle = 'rgba(255,255,255,0.1)';   // schwaches Licht oben links, sonst wirkt er flach
      ctx.beginPath(); ctx.ellipse(-0.38, -0.46, 0.3, 0.17, -0.6, 0, TAU2); ctx.fill();

      stirnband(ctx, fein);
    },

    thunder(ctx, color, t, fein) {   // Sturmhimmel: Wolkenkugel mit Regen, Blitz und einer Kuppe darunter
      // Ein Schlag alle 2,2 Sekunden; die Nummer des Schlags formt den Blitz, der Rest die Helligkeit
      const TAKT = 2.2, nr = Math.floor(t / TAKT), ph = (t % TAKT) / TAKT;
      const blitz = ph < 0.05 ? 1 : ph < 0.09 ? 0.45 : ph < 0.13 ? 0.8 : ph < 0.3 ? 0.8 * (1 - (ph - 0.13) / 0.17) : 0;
      const g = ctx.createRadialGradient(-0.3, -0.45, 0.1, 0, 0, 1);
      g.addColorStop(0, blitz ? '#8ba3d6' : '#3d4459'); g.addColorStop(0.55, '#262b3e'); g.addColorStop(1, '#11141f');
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU2); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.save(); kugelMaske(ctx);
      // Wolkenbänke: unten dunkel, oben hell, jede zieht mit eigenem Tempo durch
      const wolken = [];
      for (const [reihe, y, r, tempo] of [[0, -0.78, 0.24, 0.05], [1, -0.55, 0.3, 0.032]])
        for (let i = 0; i < 3; i++) wolken.push([((i * 0.9 + t * tempo + reihe * 0.45) % 2.7) - 1.35, y, r]);
      const alle = (fn) => { ctx.beginPath(); for (const w of wolken) fn(w[0], w[1], w[2]); ctx.fill(); };
      const kreis = (x, y, r) => { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, TAU2); };
      ctx.fillStyle = 'rgba(22,26,42,0.95)';   // dunkler Wolkenbauch
      alle((x, y, r) => { ctx.moveTo(x + r * 1.4, y + r * 0.45); ctx.ellipse(x, y + r * 0.45, r * 1.4, r * 0.55, 0, 0, TAU2); });
      ctx.fillStyle = `rgba(${blitz ? 175 : 108},${blitz ? 190 : 118},${blitz ? 225 : 148},0.92)`;
      alle((x, y, r) => { kreis(x, y, r); kreis(x + r * 0.72, y + r * 0.18, r * 0.7); kreis(x - r * 0.68, y + r * 0.22, r * 0.58); });
      if (fein) {   // beleuchtete Oberkante
        ctx.fillStyle = 'rgba(255,255,255,0.16)';
        alle((x, y, r) => kreis(x - r * 0.22, y - r * 0.32, r * 0.6));
      }
      // Der Dunst kommt erst nach den Wolken: so verlaufen ihre Bäuche nach unten ins Dunkle
      const dunst = ctx.createLinearGradient(0, -0.55, 0, 0.7);
      dunst.addColorStop(0, 'rgba(14,17,28,0)'); dunst.addColorStop(1, 'rgba(10,12,20,0.95)');
      ctx.fillStyle = dunst; ctx.fillRect(-1, -0.55, 2, 1.6);
      // Kuppe mit einzelnem Baum – damit der Blitz irgendwo einschlägt
      ctx.fillStyle = '#161a2a'; ctx.beginPath(); ctx.ellipse(0.1, 1.06, 1.1, 0.36, 0, 0, TAU2); ctx.fill();
      if (fein) {
        ctx.strokeStyle = '#161a2a'; ctx.lineWidth = 0.06; ctx.lineCap = 'round';
        ctx.beginPath(); ctx.moveTo(0.3, 0.86); ctx.lineTo(0.3, 0.58);
        ctx.moveTo(0.3, 0.7); ctx.lineTo(0.42, 0.58); ctx.moveTo(0.3, 0.66); ctx.lineTo(0.19, 0.54); ctx.stroke();
      }
      // Regen: schräge Striche verschiedener Länge, laufen umlaufend durch
      ctx.strokeStyle = 'rgba(200,225,255,0.8)'; ctx.lineWidth = 0.04;
      ctx.beginPath();
      for (let i = 0; i < (fein ? 16 : 8); i++) {
        const x = -1.1 + streu(i, 14) * 2.2, len = 0.16 + streu(i, 15) * 0.2;
        const y = -0.6 + (((t * (1.3 + streu(i, 16) * 0.7) + streu(i, 17)) % 1) * 1.9);
        ctx.moveTo(x, y); ctx.lineTo(x - 0.09, y + len);
      }
      ctx.stroke();
      if (blitz) {   // der Blitz selbst: gezackt, mit zwei Abzweigen, Form je Schlag verschieden
        ctx.fillStyle = `rgba(255,255,255,${(0.3 * blitz).toFixed(2)})`; ctx.fillRect(-1, -1, 2, 2);
        const pfad = [[-0.3 + streu(nr, 18) * 0.6, -0.95]];
        for (let i = 1; i <= 8; i++) {
          const vor = pfad[i - 1];
          pfad.push([vor[0] + (streu(nr, 18 + i) - 0.5) * 0.34, vor[1] + 0.25]);
        }
        ctx.strokeStyle = `rgba(170,200,255,${(0.55 * blitz).toFixed(2)})`; ctx.lineWidth = 0.2; ctx.lineJoin = 'round';
        ctx.beginPath(); pfad.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y)); ctx.stroke();
        ctx.strokeStyle = `rgba(255,255,255,${blitz.toFixed(2)})`; ctx.lineWidth = 0.075;
        ctx.beginPath(); pfad.forEach(([x, y], i) => i ? ctx.lineTo(x, y) : ctx.moveTo(x, y));
        for (const k of [3, 6]) {   // Abzweige seitlich weg
          const [ax, ay] = pfad[k];
          const bx = ax + (streu(nr, 30 + k) - 0.5) * 0.6;
          ctx.moveTo(ax, ay); ctx.lineTo(bx, ay + 0.18); ctx.lineTo(bx + (streu(nr, 40 + k) - 0.5) * 0.4, ay + 0.36);
        }
        ctx.stroke();
      }
      ctx.restore(); glasLicht(ctx);
      return () => wetterhahn(ctx, t, fein, blitz);   // der Hut liegt über dem Reif in Spielerfarbe
    },

    orb(ctx, color, t, fein) {   // Schattenreich: Kristallkugel mit Nebel, Funken und einem Auge, das blinzelt
      glasKugel(ctx, '#e2c8ff', '#5c34a0');
      ctx.save(); kugelMaske(ctx);
      const g = ctx.createRadialGradient(0, 0, 0.05, 0, 0, 1);
      g.addColorStop(0, '#5b2c86'); g.addColorStop(0.6, '#2c1450'); g.addColorStop(1, '#140a26');
      ctx.fillStyle = g; ctx.fillRect(-1, -1, 2, 2);
      // Nebelschwaden in drei Schichten, jede dreht anders herum
      for (const [gruppe, farbe] of [[0, 'rgba(150,90,255,0.16)'], [1, 'rgba(186,122,255,0.22)']]) {
        ctx.fillStyle = farbe; ctx.beginPath();
        for (let i = gruppe; i < 5; i += 2) {
          const a = t * (0.28 + (i % 3) * 0.12) * (i % 2 ? -1 : 1) + i * 1.3;
          const rr = 0.28 + (i % 3) * 0.16, ex = Math.cos(a) * rr, ey = Math.sin(a * 0.9) * rr * 0.8;
          ctx.moveTo(ex + 0.6, ey); ctx.ellipse(ex, ey, 0.6, 0.22, a, 0, TAU2);
        }
        ctx.fill();
      }
      // Funken, die aufblitzen und wieder vergehen
      ctx.fillStyle = '#ffe9ff'; ctx.beginPath();
      for (let i = 0; fein && i < 7; i++) {
        const f = Math.max(0, Math.sin(t * 1.8 + streu(i, 21) * 9));
        if (f < 0.05) continue;   // erloschene Funken kosten sonst nur Zeit
        const fx = -0.8 + streu(i, 19) * 1.6, fy = -0.8 + streu(i, 20) * 1.6, fr = 0.008 + f * f * 0.04;
        ctx.moveTo(fx + fr, fy); ctx.arc(fx, fy, fr, 0, TAU2);
      }
      ctx.fill();
      // das Auge: Iris dreht sich, Pupille weitet sich, Lider schlagen ab und zu zu
      const lid = augenlid(t);
      const bx = Math.sin(t * 0.6) * 0.18, by = Math.cos(t * 0.43) * 0.07;
      const weit = 0.15 + 0.045 * Math.sin(t * 0.9);
      ctx.fillStyle = '#ffeccd';
      ctx.beginPath(); ctx.ellipse(0, 0.02, 0.48, 0.32, 0, 0, TAU2); ctx.fill();
      // Iris mit Strahlen – sie wandert nur so weit, dass sie im Weißen bleibt
      ctx.fillStyle = '#8a3fe0'; ctx.beginPath(); ctx.arc(bx, 0.02 + by, 0.2, 0, TAU2); ctx.fill();
      ctx.strokeStyle = 'rgba(40,10,80,0.55)'; ctx.lineWidth = 0.022;
      ctx.beginPath();
      for (let i = 0; fein && i < 14; i++) {
        const a = (i / 14) * TAU2 + t * 0.35;
        ctx.moveTo(bx + Math.cos(a) * 0.07, 0.02 + by + Math.sin(a) * 0.07);
        ctx.lineTo(bx + Math.cos(a) * 0.19, 0.02 + by + Math.sin(a) * 0.19);
      }
      ctx.stroke();
      ctx.fillStyle = '#14061f'; ctx.beginPath(); ctx.ellipse(bx, 0.02 + by, weit * 0.5, weit, 0, 0, TAU2); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.beginPath(); ctx.arc(bx - 0.09, by - 0.06, 0.055, 0, TAU2); ctx.fill();
      if (lid > 0) {   // Lider von oben und unten – nur dafür lohnt das Beschneiden
        ctx.save();
        ctx.beginPath(); ctx.ellipse(0, 0.02, 0.48, 0.32, 0, 0, TAU2); ctx.clip();
        ctx.fillStyle = '#2a1244';
        ctx.fillRect(-0.5, -0.34, 1, 0.34 + lid * 0.36);
        ctx.fillRect(-0.5, 0.38 - lid * 0.36, 1, 0.34);
        ctx.restore();
      }
      ctx.strokeStyle = 'rgba(20,8,36,0.7)'; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.ellipse(0, 0.02, 0.48, 0.32, 0, 0, TAU2); ctx.stroke();
      ctx.restore(); glasLicht(ctx);
      return () => schattenhut(ctx, t, fein);   // der Hut liegt über dem Reif in Spielerfarbe
    },
  };

  /* ---------- Bausteine der Ganzkörper-Skins ---------- */

  /* Immer dieselbe Zahl zur selben Nummer: Streuung ohne Zufall. Zufall wäre hier falsch – alle
     Geräte sollen dasselbe sehen, und die Vorschau im Menü darf nicht flackern. */
  const streu = (i, n) => { const s = Math.sin(i * 127.1 + n * 311.7) * 43758.5453; return s - Math.floor(s); };

  /* Glaskugel als Hintergrund: heller Rand, damit die Kugel rund wirkt */
  function glasKugel(ctx, hell, dunkel) {
    const g = ctx.createRadialGradient(-0.35, -0.4, 0.1, 0, 0, 1);
    g.addColorStop(0, hell); g.addColorStop(1, dunkel);
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU2); ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07; ctx.stroke();
  }
  /* Alles Weitere bleibt in der Kugel */
  function kugelMaske(ctx) { ctx.beginPath(); ctx.arc(0, 0, 0.97, 0, TAU2); ctx.clip(); }
  /* Randabdunklung innen: erst damit sieht der Inhalt aus, als läge er wirklich in einer Kugel */
  function steinRand(ctx) {
    const r = ctx.createRadialGradient(0, 0, 0.5, 0, 0, 1);
    r.addColorStop(0, 'rgba(0,0,0,0)'); r.addColorStop(0.8, 'rgba(0,0,0,0.14)'); r.addColorStop(1, 'rgba(0,0,0,0.5)');
    ctx.fillStyle = r;
    ctx.beginPath(); ctx.arc(0, 0, 0.97, 0, TAU2); ctx.fill();
  }
  /* Glanzlicht, Randlicht von unten und ein zweiter kleiner Funke – das macht das Glas */
  function glasLicht(ctx) {
    steinRand(ctx);
    const unten = ctx.createRadialGradient(0.12, 0.78, 0.03, 0.12, 0.78, 0.62);
    unten.addColorStop(0, 'rgba(255,255,255,0.2)'); unten.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = unten;
    ctx.beginPath(); ctx.arc(0, 0, 0.97, 0, TAU2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.34)';
    ctx.beginPath(); ctx.ellipse(-0.42, -0.48, 0.26, 0.14, -0.6, 0, TAU2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); ctx.ellipse(-0.16, -0.7, 0.09, 0.05, -0.5, 0, TAU2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.lineWidth = 0.06;
    ctx.beginPath(); ctx.arc(0, 0, 0.94, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke();
    ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07;
    ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU2); ctx.stroke();
  }
  /* Lidschlag: alle paar Sekunden kurz zu (0 = offen, 1 = geschlossen) */
  function augenlid(t) {
    const p = (t % 4.3) / 4.3;
    return p > 0.94 ? 1 - Math.abs(p - 0.97) / 0.03 : 0;
  }
  /* Muschel und Seestern auf dem Sand */
  function muschel(ctx, x, y) {
    ctx.fillStyle = '#f0c6cf'; ctx.strokeStyle = 'rgba(120,70,80,0.5)'; ctx.lineWidth = 0.022;
    ctx.beginPath(); ctx.moveTo(x, y + 0.1);
    ctx.quadraticCurveTo(x - 0.19, y + 0.06, x - 0.14, y - 0.1);
    ctx.quadraticCurveTo(x, y - 0.16, x + 0.14, y - 0.1);
    ctx.quadraticCurveTo(x + 0.19, y + 0.06, x, y + 0.1); ctx.closePath(); ctx.fill();
    ctx.beginPath();
    for (const d of [-0.09, 0, 0.09]) { ctx.moveTo(x, y + 0.1); ctx.lineTo(x + d * 1.5, y - 0.12); }
    ctx.stroke();
  }
  function seestern(ctx, x, y) {
    ctx.save(); ctx.translate(x, y); ctx.scale(1, 0.55);
    ctx.fillStyle = '#e8843f'; ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * TAU2 - Math.PI / 2, r = i % 2 ? 0.06 : 0.16;
      const px = Math.cos(a) * r, py = Math.sin(a) * r;
      i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
    }
    ctx.closePath(); ctx.fill(); ctx.restore();
  }
  /* Ein Fisch: Tropfenkörper mit Streifen, Rücken- und Bauchflosse, der Schwanz schlägt im Takt.
     d = Blickrichtung (-1 links, 1 rechts), s = Phase des Schwanzschlags. */
  function fisch(ctx, x, y, gr, d, col, s) {
    ctx.save(); ctx.translate(x, y); ctx.scale(d * gr, gr);
    const dunkel = dim(col, 0.72), schlag = Math.sin(s) * 0.5;
    ctx.save(); ctx.translate(-0.5, 0); ctx.rotate(schlag);   // Schwanzflosse schwenkt am Stiel
    ctx.fillStyle = dunkel;
    ctx.beginPath(); ctx.moveTo(0.08, 0);
    ctx.quadraticCurveTo(-0.34, -0.14, -0.6, -0.44);
    ctx.quadraticCurveTo(-0.42, 0, -0.6, 0.44);
    ctx.quadraticCurveTo(-0.34, 0.14, 0.08, 0); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = dunkel;
    ctx.beginPath(); ctx.moveTo(-0.3, -0.2);                 // Rückenflosse
    ctx.quadraticCurveTo(-0.06, -0.6 - schlag * 0.06, 0.22, -0.22); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-0.12, 0.22);                // Bauchflosse
    ctx.quadraticCurveTo(0, 0.5, 0.24, 0.24); ctx.closePath(); ctx.fill();
    ctx.fillStyle = col;
    ctx.beginPath(); ctx.ellipse(0, 0, 0.62, 0.36, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.32)';                // heller Bauch
    ctx.beginPath(); ctx.ellipse(0.02, 0.15, 0.5, 0.17, 0, 0, TAU2); ctx.fill();
    ctx.fillStyle = dunkel;                                   // zwei Streifen
    for (const sx of [-0.16, 0.14]) { ctx.beginPath(); ctx.ellipse(sx, 0, 0.055, 0.3, 0, 0, TAU2); ctx.fill(); }
    ctx.fillStyle = dim(col, 0.88);   // Brustflosse: sie kippt gegenläufig, dafür genügt der Winkel
    ctx.beginPath(); ctx.ellipse(0.06, 0.17, 0.16, 0.075, 0.5 - schlag * 0.7, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#ffffff'; ctx.beginPath(); ctx.arc(0.34, -0.1, 0.12, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#20242e'; ctx.beginPath(); ctx.arc(0.37, -0.1, 0.06, 0, TAU2); ctx.fill();
    ctx.restore();
  }
  /* Winkel eines Rads, das in ein anderes greift: gegenläufig, im Verhältnis der Zähnezahlen, und
     um eine halbe Teilung versetzt – nur so steht Zahn in Lücke. phi ist der Winkel vom ersten
     Rad zum zweiten. */
  const eingriff = (wA, zA, zB, phi) => phi + Math.PI + (zA / zB) * (phi - wA) + Math.PI / zB;
  /* Ein Zahnrad mit z Zähnen, um w gedreht. Der Radius folgt der Zähnezahl (gleicher Modul),
     damit greifende Räder auch wirklich zusammenpassen. */
  function zahnrad(ctx, x, y, r, z, w, hell, dunkel, fein) {
    ctx.save(); ctx.translate(x, y); ctx.rotate(w);
    const kopf = r * 1.18, fuss = r * 0.92, halb = Math.PI / z;
    ctx.beginPath();
    for (let i = 0; i < z; i++) {
      const a = (i / z) * TAU2;
      const p = (rr, aa) => [Math.cos(a + aa) * rr, Math.sin(a + aa) * rr];
      const [x1, y1] = p(fuss, -halb * 0.92), [x2, y2] = p(kopf, -halb * 0.32);
      const [x3, y3] = p(kopf, halb * 0.32), [x4, y4] = p(fuss, halb * 0.92);
      if (i === 0) ctx.moveTo(x1, y1); else ctx.lineTo(x1, y1);
      ctx.lineTo(x2, y2); ctx.lineTo(x3, y3); ctx.lineTo(x4, y4);
    }
    ctx.closePath();
    ctx.fillStyle = hell; ctx.fill();
    ctx.strokeStyle = dunkel; ctx.lineWidth = r * 0.07; ctx.stroke();
    ctx.fillStyle = dunkel; ctx.beginPath(); ctx.arc(0, 0, r * 0.76, 0, TAU2); ctx.fill();
    // Speichen und Nabe in einem Pfad: eine Drehung von Hand ist viel billiger als
    // fünfmal save/rotate/restore auf der Leinwand.
    ctx.fillStyle = hell; ctx.beginPath();
    for (let i = 0; fein && i < 5; i++) {
      const a = (i / 5) * TAU2, co = Math.cos(a), si = Math.sin(a);
      const ecke = (px, py, erste) => {
        const qx = px * co - py * si, qy = px * si + py * co;
        erste ? ctx.moveTo(qx, qy) : ctx.lineTo(qx, qy);
      };
      ecke(-r * 0.1, -r * 0.72, true); ecke(r * 0.1, -r * 0.72); ecke(r * 0.15, -r * 0.18); ecke(-r * 0.15, -r * 0.18);
      ctx.closePath();
    }
    ctx.moveTo(r * 0.27, 0); ctx.arc(0, 0, r * 0.27, 0, TAU2);
    ctx.fill();
    ctx.fillStyle = dunkel; ctx.beginPath(); ctx.arc(0, 0, r * 0.12, 0, TAU2); ctx.fill();
    if (fein) {   // Glanz auf der oberen Hälfte
      ctx.fillStyle = 'rgba(255,255,255,0.16)';
      ctx.beginPath(); ctx.arc(0, 0, r * 0.76, Math.PI * 1.12, Math.PI * 1.82); ctx.closePath(); ctx.fill();
    }
    ctx.restore();
  }

  /* Ein Glyphenzeichen an (x, y) in der Größe s an den laufenden Pfad anhängen. Gezeichnet wird
     nur der Linienzug – gefüllt wird nichts, es sind Kerben im Stein. */
  function glyphePfad(ctx, art, x, y, s) {
    const m = (px, py) => ctx.moveTo(x + px * s, y + py * s);
    const l = (px, py) => ctx.lineTo(x + px * s, y + py * s);
    switch (art) {
      case 0:   // Stufenmuster
        m(-1, 0.8); l(-1, -0.1); l(-0.15, -0.1); l(-0.15, -0.8); l(1, -0.8); break;
      case 1:   // Balken mit zwei Punkten darüber – wie ein Zahlzeichen
        m(-1, 0.55); l(1, 0.55); m(-0.85, -0.45); l(-0.35, -0.45); m(0.15, -0.45); l(0.65, -0.45); break;
      case 2:   // Raute mit Kern
        m(0, -0.9); l(0.8, 0); l(0, 0.9); l(-0.8, 0); l(0, -0.9);
        m(0.3, 0); ctx.arc(x, y, 0.3 * s, 0, TAU2); break;
      case 3:   // Spirale
        for (let i = 0; i <= 13; i++) {
          const a = i * 0.58, rr = 0.1 + i * 0.065;
          i ? l(Math.cos(a) * rr, Math.sin(a) * rr) : m(Math.cos(a) * rr, Math.sin(a) * rr);
        }
        break;
      case 4:   // Zickzack
        m(-1, -0.55); l(-0.33, 0.25); l(0.33, -0.55); l(1, 0.25); break;
      default:  // Kreuz im Quadrat
        m(-0.8, -0.8); l(0.8, -0.8); l(0.8, 0.8); l(-0.8, 0.8); l(-0.8, -0.8);
        m(-0.8, -0.8); l(0.8, 0.8); m(0.8, -0.8); l(-0.8, 0.8);
    }
  }

  /* Das blaue Rankenmuster auf dem Porzellan: eine große Blüte in der Mitte, zwei Ranken, die
     sich nach oben außen schwingen und in kleinen Blüten enden, und ein doppeltes Randband unten.
     Alles in Kobaltblau, wie es auf altem Geschirr steht.

     Beim ersten Versuch bildeten Band und Ranken zusammen ein Gesicht – zwei Knospen als Augen,
     der Bogen als Mund. Darum liegt das Band jetzt eng am Rand und die Ranken schwingen nach
     oben statt zur Seite. */
  function ranken(ctx, fein) {
    const BLAU = '#26499a', HELL = '#4a80cf';
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    /* Eine Blüte mit n Blättern an den laufenden Pfad hängen. Die Blätter sind gedrehte Ellipsen –
       dafür braucht es keine Drehung der Leinwand, das spart je Blatt ein save/restore. */
    const bluete = (bx, by, r, n) => {
      for (let i = 0; i < n; i++) {
        const a = (i / n) * TAU2;
        const px = bx + Math.cos(a) * r * 0.9, py = by + Math.sin(a) * r * 0.9;
        ctx.moveTo(px + Math.cos(a) * r * 0.66, py + Math.sin(a) * r * 0.66);
        ctx.ellipse(px, py, r * 0.66, r * 0.4, a, 0, TAU2);
      }
    };
    // Die beiden Ranken – erst der Verlauf, dann hängen die Blätter daran
    const stengel = [];
    for (const seite of [-1, 1]) {
      ctx.strokeStyle = BLAU; ctx.lineWidth = 0.055;
      ctx.beginPath();
      ctx.moveTo(seite * 0.04, 0.1);
      ctx.bezierCurveTo(seite * 0.5, 0.02, seite * 0.72, -0.16, seite * 0.6, -0.46);
      ctx.stroke();
      stengel.push(seite);
    }
    // Blätter und die kleinen Blüten an den Rankenenden
    ctx.fillStyle = HELL; ctx.beginPath();
    for (const seite of stengel) {
      for (const [lx, ly, rx, ry, dr] of [[0.3, 0.1, 0.15, 0.07, 0.9], [0.58, -0.06, 0.15, 0.07, 0.2],
                                          [0.68, -0.3, 0.13, 0.06, -0.5]]) {
        const a = dr * seite;
        ctx.moveTo(seite * lx + Math.cos(a) * rx, ly + Math.sin(a) * rx);
        ctx.ellipse(seite * lx, ly, rx, ry, a, 0, TAU2);
      }
      bluete(seite * 0.58, -0.52, 0.15, 5);
    }
    bluete(0, 0.24, 0.24, 8);           // Hauptblüte
    ctx.fill();
    ctx.fillStyle = BLAU; ctx.beginPath();
    ctx.moveTo(0.1, 0.24); ctx.arc(0, 0.24, 0.1, 0, TAU2);
    for (const seite of stengel) { ctx.moveTo(seite * 0.58 + 0.05, -0.52); ctx.arc(seite * 0.58, -0.52, 0.05, 0, TAU2); }
    ctx.fill();

    // Doppeltes Randband unten, eng am Rand
    ctx.strokeStyle = BLAU; ctx.lineWidth = 0.032;
    ctx.beginPath();
    ctx.arc(0, 0, 0.92, 0.26, Math.PI - 0.26);
    ctx.moveTo(Math.cos(0.26) * 0.8, Math.sin(0.26) * 0.8);
    ctx.arc(0, 0, 0.8, 0.26, Math.PI - 0.26);
    ctx.stroke();
    if (!fein) return;
    ctx.fillStyle = BLAU; ctx.beginPath();      // Punkte zwischen den Bändern
    for (let i = 0; i < 8; i++) {
      const a = 0.36 + i * ((Math.PI - 0.72) / 7), r = 0.86;
      ctx.moveTo(Math.cos(a) * r + 0.033, Math.sin(a) * r);
      ctx.arc(Math.cos(a) * r, Math.sin(a) * r, 0.033, 0, TAU2);
    }
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,140,170,0.3)'; ctx.lineWidth = 0.018;   // feine Haarrisse in der Glasur
    ctx.beginPath();
    ctx.moveTo(-0.88, 0.02); ctx.lineTo(-0.66, 0.2); ctx.lineTo(-0.58, 0.5);
    ctx.moveTo(0.86, 0.24); ctx.lineTo(0.66, 0.44);
    ctx.stroke();
  }
  /* Glasur: ein weicher Lichtstreifen wandert langsam über das Porzellan, dazu das feste
     Glanzlicht oben links. Mehr Bewegung verträgt so ein Stück nicht. */
  function glasur(ctx, t) {
    const u = ((t * 0.13) % 1) * 2.8 - 1.4;
    const g = ctx.createLinearGradient(u - 0.45, -1, u + 0.45, 0.6);
    g.addColorStop(0, 'rgba(255,255,255,0)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.45)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath(); ctx.arc(0, 0, 0.97, 0, TAU2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath(); ctx.ellipse(-0.4, -0.46, 0.23, 0.13, -0.6, 0, TAU2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath(); ctx.ellipse(-0.15, -0.66, 0.08, 0.045, -0.5, 0, TAU2); ctx.fill();
  }
  /* Königskrone: fünf spitze Zacken aus Gold, im Reif drei rote Steine, auf der Mittelzacke ein
     vierter. Die Steine blitzen auf, und über das Gold wandert ein Lichtpunkt. */
  function koenigskrone(ctx, t, fein) {
    ctx.save(); ctx.translate(0, -0.74);
    const spitzen = [[-0.46, -0.42], [-0.23, -0.6], [0, -0.74], [0.23, -0.6], [0.46, -0.42]];
    const taeler = [-0.345, -0.115, 0.115, 0.345];
    const gold = ctx.createLinearGradient(-0.55, 0, 0.55, 0);
    gold.addColorStop(0, '#8a6118'); gold.addColorStop(0.36, '#ffe8a4');
    gold.addColorStop(0.62, '#e0b444'); gold.addColorStop(1, '#7d5714');
    ctx.beginPath();
    ctx.moveTo(-0.54, 0.12); ctx.lineTo(-0.54, -0.14);
    for (let i = 0; i < 5; i++) {
      ctx.lineTo(spitzen[i][0], spitzen[i][1]);
      if (i < 4) ctx.lineTo(taeler[i], -0.08);
    }
    ctx.lineTo(0.54, -0.14); ctx.lineTo(0.54, 0.12); ctx.closePath();
    ctx.fillStyle = gold; ctx.fill();
    ctx.strokeStyle = 'rgba(60,40,6,0.55)'; ctx.lineWidth = 0.048; ctx.stroke();
    ctx.fillStyle = '#a67c22'; ctx.fillRect(-0.54, 0, 1.08, 0.12);          // Reif unten
    ctx.fillStyle = '#d9ab3a'; ctx.fillRect(-0.54, -0.02, 1.08, 0.025);
    /* Die roten Steine: drei im Reif, einer auf der Mittelzacke. Das Blitzen steckt in der Größe,
       damit alle vier in einem Zug gefüllt werden können. */
    const steine = [[-0.29, 0.055], [0, 0.055], [0.29, 0.055], [0, -0.74]];
    ctx.fillStyle = '#c9203a'; ctx.beginPath();
    steine.forEach(([sx, sy], i) => {
      const gr = 0.052 + 0.016 * Math.abs(Math.sin(t * 1.7 + i * 1.6));
      ctx.moveTo(sx, sy - gr * 1.2); ctx.lineTo(sx + gr, sy);
      ctx.lineTo(sx, sy + gr * 1.2); ctx.lineTo(sx - gr, sy); ctx.closePath();
    });
    ctx.fill();
    if (!fein) { ctx.restore(); return; }
    ctx.fillStyle = 'rgba(255,190,200,0.85)'; ctx.beginPath();               // Glanz in den Steinen
    steine.forEach(([sx, sy], i) => {
      const f = Math.max(0, Math.sin(t * 1.7 + i * 1.6));
      const gr = 0.012 + f * f * 0.022;
      ctx.moveTo(sx - 0.014 + gr, sy - 0.022); ctx.arc(sx - 0.014, sy - 0.022, gr, 0, TAU2);
    });
    ctx.fill();
    const w = ((t * 0.32) % 1) * 1.08 - 0.54;                                // Lichtpunkt auf dem Gold
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.ellipse(w, -0.05, 0.045, 0.085, 0, 0, TAU2); ctx.fill();
    ctx.restore();
  }
  /* Schiffchen auf dem Aquarium: Es rollt und hebt sich, als läge es im Seegang, das Segel
     bauscht sich im Takt und der Wimpel flattert. Gezeichnet wird um den Kopfpunkt herum, das
     Rollen kommt aus einer Drehung um den Rumpf. */
  function schiffchen(ctx, t, fein) {
    ctx.save();
    ctx.translate(0, -0.76 + Math.sin(t * 1.1 + 0.6) * 0.035);
    ctx.rotate(Math.sin(t * 1.1) * 0.15);
    const bauch = Math.sin(t * 2.3) * 0.045;
    // Mast und Rah
    ctx.strokeStyle = '#6b4a2a'; ctx.lineWidth = 0.045; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-0.02, 0.02); ctx.lineTo(-0.02, -0.88); ctx.stroke();
    // Großsegel und Focksegel, beide gebaucht
    ctx.fillStyle = '#f6f1e4'; ctx.strokeStyle = 'rgba(90,70,40,0.5)'; ctx.lineWidth = 0.028;
    ctx.beginPath();
    ctx.moveTo(0.01, -0.82);
    ctx.quadraticCurveTo(0.42 + bauch, -0.5, 0.03, -0.1);
    ctx.quadraticCurveTo(0.16 + bauch * 0.5, -0.46, 0.01, -0.82);
    ctx.moveTo(-0.05, -0.78);
    ctx.quadraticCurveTo(-0.34 - bauch, -0.46, -0.07, -0.12);
    ctx.quadraticCurveTo(-0.16 - bauch * 0.5, -0.44, -0.05, -0.78);
    ctx.fill(); ctx.stroke();
    // Wimpel an der Mastspitze
    ctx.fillStyle = '#e04a5a'; ctx.beginPath();
    ctx.moveTo(-0.02, -0.88);
    ctx.quadraticCurveTo(0.1, -0.86 + Math.sin(t * 5) * 0.03, 0.22 + Math.sin(t * 5) * 0.04, -0.83);
    ctx.lineTo(-0.02, -0.78); ctx.closePath(); ctx.fill();
    // Rumpf
    const holz = ctx.createLinearGradient(0, -0.06, 0, 0.26);
    holz.addColorStop(0, '#8a5a30'); holz.addColorStop(1, '#4a2f18');
    ctx.beginPath();
    ctx.moveTo(-0.5, -0.04); ctx.lineTo(0.5, -0.04);
    ctx.quadraticCurveTo(0.36, 0.24, 0, 0.26); ctx.quadraticCurveTo(-0.36, 0.24, -0.5, -0.04);
    ctx.closePath();
    ctx.fillStyle = holz; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.05; ctx.stroke();
    ctx.fillStyle = '#c9452f'; ctx.fillRect(-0.48, -0.02, 0.96, 0.07);   // Zierstreifen
    if (fein) {   // Bullaugen
      ctx.fillStyle = '#ffd98a'; ctx.beginPath();
      for (const bx of [-0.26, 0, 0.26]) { ctx.moveTo(bx + 0.038, 0.11); ctx.arc(bx, 0.11, 0.038, 0, TAU2); }
      ctx.fill();
    }
    ctx.restore();
  }

  /* Wetterhahn auf der Gewitterkugel: Die Fahne dreht sich langsam – von vorn gesehen wird sie
     dabei schmal und breit, wie eine Fahne, die sich wegdreht. Schlägt drinnen der Blitz ein,
     sprüht es an der Spitze. */
  function wetterhahn(ctx, t, fein, blitz) {
    ctx.save(); ctx.translate(0, -0.78);
    ctx.strokeStyle = '#8d93a6'; ctx.lineWidth = 0.055; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, 0.08); ctx.lineTo(0, -0.5); ctx.stroke();    // Stange
    if (fein) {   // Himmelsrichtungen als kleines Kreuz
      ctx.lineWidth = 0.035;
      ctx.beginPath(); ctx.moveTo(-0.2, -0.26); ctx.lineTo(0.2, -0.26); ctx.stroke();
    }
    ctx.fillStyle = '#b9c0d2'; ctx.beginPath();                                  // Knauf
    ctx.arc(0, -0.5, 0.055, 0, TAU2); ctx.fill();
    /* Die Fahne dreht sich um die Stange. Von vorn sieht man davon nur die Stauchung: breit,
       wenn sie quer steht, schmal, wenn sie auf den Betrachter zeigt – und seitenverkehrt,
       sobald sie sich vorbeigedreht hat. Ein billiger Trick, der erstaunlich gut wirkt. */
    const dreh = Math.cos(t * 0.55);
    ctx.save(); ctx.translate(0, -0.6); ctx.scale(dreh * 0.9 + (dreh < 0 ? -0.1 : 0.1), 1);
    /* Ohne Kontur: Beim Wegdrehen würde sie mitgestaucht und in der Breite aufreißen. Die Form
       trägt sich allein, weil sie dunkel auf hellem Wolkengrund steht. */
    ctx.beginPath();
    ctx.moveTo(0.44, 0); ctx.lineTo(0.12, -0.15); ctx.lineTo(0.12, -0.045);     // Pfeilspitze
    ctx.lineTo(-0.18, -0.045); ctx.lineTo(-0.18, -0.17);                         // Schaft und Fahne
    ctx.lineTo(-0.46, 0); ctx.lineTo(-0.18, 0.17); ctx.lineTo(-0.18, 0.045);
    ctx.lineTo(0.12, 0.045); ctx.lineTo(0.12, 0.15); ctx.closePath();
    ctx.fillStyle = '#59617a'; ctx.fill();
    ctx.restore();
    if (blitz > 0) {   // Beim Einschlag sprüht es an der Spitze
      ctx.strokeStyle = `rgba(255,255,190,${blitz.toFixed(2)})`; ctx.lineWidth = 0.04;
      ctx.beginPath();
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.62;
        const l1 = 0.1, l2 = 0.22;
        ctx.moveTo(Math.cos(a) * l1, -0.5 + Math.sin(a) * l1);
        ctx.lineTo(Math.cos(a + 0.3) * l2, -0.5 + Math.sin(a + 0.3) * l2);
      }
      ctx.stroke();
      ctx.fillStyle = `rgba(255,255,255,${blitz.toFixed(2)})`;
      ctx.beginPath(); ctx.arc(0, -0.5, 0.07, 0, TAU2); ctx.fill();
    }
    ctx.restore();
  }

  /* Spitzhut der Kristallkugel: Die Spitze schwankt, auf dem Filz funkeln Sterne, an der Krempe
     sitzt eine Mondschnalle. */
  function schattenhut(ctx, t, fein) {
    ctx.save(); ctx.translate(0, -0.7);
    const schwank = Math.sin(t * 0.95) * 0.13;
    const filz = ctx.createLinearGradient(-0.4, 0, 0.4, -0.8);
    filz.addColorStop(0, '#241040'); filz.addColorStop(0.5, '#4b2478'); filz.addColorStop(1, '#1b0c31');
    ctx.beginPath();                                                             // Krempe
    ctx.ellipse(0, 0, 0.92, 0.23, 0, 0, TAU2);
    ctx.fillStyle = '#2c1450'; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.055; ctx.stroke();
    ctx.beginPath();                                                             // Kegel mit Knick
    ctx.moveTo(-0.4, -0.03);
    ctx.quadraticCurveTo(-0.3, -0.62, 0.06 + schwank, -1.12);
    ctx.quadraticCurveTo(0.02 + schwank * 0.5, -0.58, 0.4, -0.03);
    ctx.closePath();
    ctx.fillStyle = filz; ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1b0c31'; ctx.fillRect(-0.42, -0.2, 0.84, 0.14);            // Hutband
    ctx.fillStyle = '#ffd166'; ctx.beginPath();                                   // Mondschnalle
    ctx.arc(0, -0.13, 0.1, 0, TAU2); ctx.fill();
    ctx.fillStyle = '#1b0c31'; ctx.beginPath(); ctx.arc(0.035, -0.15, 0.082, 0, TAU2); ctx.fill();
    if (!fein) { ctx.restore(); return; }
    ctx.fillStyle = '#ffe9ff'; ctx.beginPath();                                   // funkelnde Sterne
    for (let i = 0; i < 4; i++) {
      const u = 0.2 + i * 0.19;
      const sx = -0.4 + (0.06 + schwank - (-0.4)) * u + (i % 2 ? 0.1 : -0.08);
      const sy = -0.03 + (-1.12 + 0.03) * u;
      const gr = 0.018 + 0.028 * Math.abs(Math.sin(t * 2.1 + i * 1.6));
      ctx.moveTo(sx + gr, sy); ctx.arc(sx, sy, gr, 0, TAU2);
    }
    ctx.fill();
    ctx.restore();
  }

  /* Zylinder des Tüftlers: Lederhut mit Messingband, Nieten, Schutzbrille und einem kleinen Rad,
     das mitläuft. Gezeichnet wird er um den Kopfpunkt (0, -0.72) herum – also genau dort, wo bei
     einem gewöhnlichen Hut der Nullpunkt liegt. So sitzt er auf der Zahnradkugel wie ein Hut auf
     einem Ball und nicht wie ein aufgemaltes Bild. */
  function tueftlerZylinder(ctx, t, fein) {
    /* Etwas höher angesetzt und keck verkantet: So gibt der Hut den Blick auf das Werk in der
       Kugel frei, statt ein Drittel davon zuzudecken – und schief getragen passt er zum Tüftler
       besser als kerzengerade. */
    ctx.save(); ctx.translate(0.05, -0.82); ctx.rotate(-0.13);
    const UNTEN = -0.04, OBEN = -0.78;                 // Höhe des Hutkopfs
    const halb = y => 0.53 + (UNTEN - y) / (UNTEN - OBEN) * 0.055;  // er weitet sich nach oben
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.06;

    // Krempe mit Messingkante
    ctx.beginPath(); ctx.ellipse(0, 0, 0.88, 0.24, 0, 0, TAU2);
    ctx.fillStyle = '#38281a'; ctx.fill(); ctx.stroke();
    if (fein) {
      ctx.strokeStyle = '#9c7124'; ctx.lineWidth = 0.045;
      ctx.beginPath(); ctx.ellipse(0, 0.015, 0.83, 0.215, 0, 0, TAU2); ctx.stroke();
    }

    // Hutkopf aus dunklem Leder
    const leder = ctx.createLinearGradient(-0.64, 0, 0.64, 0);
    leder.addColorStop(0, '#241a10'); leder.addColorStop(0.42, '#5c422a'); leder.addColorStop(1, '#1f160d');
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.06;
    ctx.beginPath();
    ctx.moveTo(-halb(UNTEN), UNTEN); ctx.lineTo(-halb(OBEN), OBEN);
    ctx.lineTo(halb(OBEN), OBEN); ctx.lineTo(halb(UNTEN), UNTEN); ctx.closePath();
    ctx.fillStyle = leder; ctx.fill(); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(0, OBEN, halb(OBEN), 0.155, 0, 0, TAU2);
    ctx.fillStyle = '#6d4f30'; ctx.fill();

    // Messingband, dem Kegel folgend
    const y1 = -0.13, y2 = -0.38, w1 = halb(y1), w2 = halb(y2);
    const messing = ctx.createLinearGradient(-0.62, 0, 0.62, 0);
    messing.addColorStop(0, '#7a5620'); messing.addColorStop(0.38, '#f2cd76'); messing.addColorStop(1, '#6e4d1c');
    ctx.beginPath();
    ctx.moveTo(-w1, y1); ctx.lineTo(w1, y1); ctx.lineTo(w2, y2); ctx.lineTo(-w2, y2); ctx.closePath();
    ctx.fillStyle = messing; ctx.fill();
    if (fein) {   // Nieten auf dem Band
      ctx.fillStyle = 'rgba(70,44,10,0.75)'; ctx.beginPath();
      for (let i = -2; i <= 2; i++) {
        const nx = i * 0.21;
        ctx.moveTo(nx + 0.032, -0.255); ctx.arc(nx, -0.255, 0.032, 0, TAU2);
      }
      ctx.fill();
    }

    // Kleines Rad an der Seite, läuft mit
    zahnrad(ctx, 0.31, -0.57, 0.15, 8, t * 1.6, '#d9a441', '#7a5620', fein);

    // Schutzbrille auf dem Band – das Erkennungszeichen des Tüftlers
    ctx.strokeStyle = '#4a3520'; ctx.lineWidth = 0.075;   // Riemen unter den Gläsern durch
    ctx.beginPath(); ctx.moveTo(-0.54, -0.24); ctx.lineTo(0.14, -0.24); ctx.stroke();
    const glaeser = [[-0.3, 0.175], [0.02, 0.155]];
    ctx.beginPath();
    for (const [gx, gr] of glaeser) { ctx.moveTo(gx + gr, -0.25); ctx.arc(gx, -0.25, gr, 0, TAU2); }
    ctx.fillStyle = '#f0c265'; ctx.fill();              // Bernsteinglas
    ctx.strokeStyle = '#9c7124'; ctx.lineWidth = 0.075; ctx.stroke();
    if (fein) {                                          // Glanz im Glas
      ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath();
      for (const [gx, gr] of glaeser) {
        ctx.moveTo(gx - gr * 0.3 + gr * 0.42, -0.25 - gr * 0.34);
        ctx.ellipse(gx - gr * 0.3, -0.25 - gr * 0.34, gr * 0.42, gr * 0.24, -0.6, 0, TAU2);
      }
      ctx.fill();
    }
    ctx.strokeStyle = 'rgba(0,0,0,0.45)'; ctx.lineWidth = 0.06;

    if (fein) {   // Schornstein auf dem Deckel, aus dem es dampft
      ctx.fillStyle = '#8a6420';
      ctx.beginPath(); ctx.moveTo(-0.34, OBEN - 0.02); ctx.lineTo(-0.3, OBEN - 0.24);
      ctx.lineTo(-0.16, OBEN - 0.24); ctx.lineTo(-0.12, OBEN - 0.02); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.3)'; ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const p = (t * 0.5 + i * 0.33) % 1;
        const sx = -0.23 + Math.sin(p * 5) * 0.1, sy = OBEN - 0.28 - p * 0.34, sr = (0.045 + p * 0.12) * (1 - p * 0.7);
        ctx.moveTo(sx + sr, sy); ctx.arc(sx, sy, sr, 0, TAU2);
      }
      ctx.fill();
    }
    ctx.restore();
  }
  /* Der Federfächer. Alle Federn liegen in einem Pfad und werden in einem Zug gefüllt, die
     goldenen Spitzen in einem zweiten, alle Fahnenstrahlen in einem dritten – neun Federn kosten
     so eine Handvoll Züge statt vierzig. Breit und leicht geschwungen, sonst sähen sie aus wie
     Spieße; das Vorbild ist der Kopfschmuck aus Quetzalfedern. */
  function federn(ctx, t, fein) {
    const n = fein ? 9 : 5;
    const fuss = [], spitz = [], breit = [];
    for (let i = 0; i < n; i++) {
      const u = (i / (n - 1)) * 2 - 1;                    // -1 ganz links, +1 ganz rechts
      const a = -Math.PI / 2 + u * 1.2;                   // Ansatzwinkel auf dem Kopf
      const lang = 0.95 - Math.abs(u) * 0.3;              // die mittlere Feder ist die längste
      const wieg = Math.sin(t * 1.4 + i * 0.7) * 0.08;    // die Spitzen wiegen sich im Luftzug
      fuss.push([Math.cos(a) * 0.74, Math.sin(a) * 0.74]);
      spitz.push([Math.cos(a) * (0.74 + lang) + u * 0.3 + wieg, Math.sin(a) * (0.74 + lang)]);
      breit.push(0.27 - Math.abs(u) * 0.06);
    }
    /* Ein Stück Federblatt als Linse aus zwei Bögen. Der Bauch sitzt nicht in der Mitte, sondern
       weiter oben – das gibt der Feder die Tropfenform statt einer Raute. */
    const blatt = (i, von, bis, schmal) => {
      const [bx, by] = fuss[i], [tx, ty] = spitz[i];
      const auf = (u2) => [bx + (tx - bx) * u2, by + (ty - by) * u2];
      const [ax, ay] = auf(von), [cx2, cy2] = auf(bis);
      const [hx, hy] = auf(von + (bis - von) * 0.62);      // Stelle des größten Bauchs
      const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
      const w = breit[i] * schmal;
      const nx = -dy / len * w, ny = dx / len * w;
      ctx.moveTo(ax, ay);
      ctx.quadraticCurveTo(hx + nx, hy + ny, cx2, cy2);
      ctx.quadraticCurveTo(hx - nx, hy - ny, ax, ay);
    };
    ctx.fillStyle = '#2fc3b8'; ctx.beginPath();
    for (let i = 0; i < n; i++) blatt(i, 0, 1, 1);
    ctx.fill();
    ctx.strokeStyle = 'rgba(8,44,44,0.5)'; ctx.lineWidth = 0.03; ctx.stroke();
    ctx.fillStyle = '#e8b93f'; ctx.beginPath();           // goldene Spitzen
    for (let i = 0; i < n; i++) blatt(i, 0.54, 1, 0.74);
    ctx.fill();
    if (!fein) return;
    // Kiel und Fahnenstrahlen: alles in einem Zug, damit der Fächer nicht nach Blech aussieht
    ctx.strokeStyle = 'rgba(14,92,92,0.55)'; ctx.lineWidth = 0.024;
    ctx.beginPath();
    for (let i = 0; i < n; i++) {
      const [bx, by] = fuss[i], [tx, ty] = spitz[i];
      const dx = tx - bx, dy = ty - by, len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len, ny = dx / len;
      ctx.moveTo(bx, by); ctx.lineTo(bx + dx * 0.9, by + dy * 0.9);
      for (let k = 1; k <= 4; k++) {
        const u2 = 0.16 + k * 0.15, w = breit[i] * (1 - Math.abs(u2 - 0.62) * 0.9);
        const px = bx + dx * u2, py = by + dy * u2;
        for (const seite of [1, -1]) {
          ctx.moveTo(px, py);
          ctx.lineTo(px + nx * w * 0.85 * seite + dx * 0.09, py + ny * w * 0.85 * seite + dy * 0.09);
        }
      }
    }
    ctx.stroke();
  }
  /* Goldenes Stirnband quer über den Stein, mit Türkiseinlagen */
  function stirnband(ctx, fein) {
    const VON = Math.PI * 1.08, BIS = Math.PI * 1.92;
    const g = ctx.createLinearGradient(-0.8, -0.9, 0.8, -0.5);
    g.addColorStop(0, '#9c721a'); g.addColorStop(0.45, '#f4d878'); g.addColorStop(1, '#9c721a');
    ctx.strokeStyle = g; ctx.lineWidth = 0.17; ctx.lineCap = 'butt';
    ctx.beginPath(); ctx.arc(0, 0, 0.82, VON, BIS); ctx.stroke();
    ctx.strokeStyle = 'rgba(50,34,6,0.5)'; ctx.lineWidth = 0.028;
    ctx.beginPath();
    ctx.arc(0, 0, 0.735, VON, BIS);
    ctx.moveTo(Math.cos(VON) * 0.905, Math.sin(VON) * 0.905); ctx.arc(0, 0, 0.905, VON, BIS);
    ctx.stroke();
    ctx.lineCap = 'round';
    if (!fein) return;
    ctx.fillStyle = '#2fc3b8'; ctx.beginPath();
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (1.17 + i * 0.165), ix = Math.cos(a) * 0.82, iy = Math.sin(a) * 0.82, s = 0.058;
      ctx.moveTo(ix, iy - s); ctx.lineTo(ix + s * 0.72, iy); ctx.lineTo(ix, iy + s); ctx.lineTo(ix - s * 0.72, iy);
    }
    ctx.fill();
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
    { id: 'royal', name: 'Königskrone', icon: '💎', welt: 'normal', voll: true },
    { id: 'aquarium', name: 'Aquarium', icon: '🐠', welt: 'sea', voll: true },
    { id: 'cog', name: 'Tüftlerzylinder', icon: '⚙️', welt: 'pro', voll: true },
    { id: 'feathercrown', name: 'Federkrone', icon: '🪶', welt: 'jungle', voll: true },
    { id: 'thunder', name: 'Gewitterkugel', icon: '⛈️', welt: 'storm', voll: true },
    { id: 'orb', name: 'Kristallkugel', icon: '🔮', welt: 'shadow', voll: true },
    { id: 'champion', name: 'Championhelm', icon: '🏅', welt: 'colosseum', art: 'rekord' },
  ];
  const byId = id => LIST.find(h => h.id === id);

  /* Hut auf einen Ball zeichnen: (cx, cy) ist die Ballmitte auf dem Schirm, r sein Radius.
     Ein Ganzkörper-Skin ersetzt den Ball, statt auf ihm zu sitzen – für ihn liegt der Nullpunkt
     darum in der Ballmitte und nicht auf dem Kopf. t ist die Spieluhr für die Bewegung. */
  /* Wie viele Bildpunkte der Ballradius wirklich hat. Die Leinwand ist meist schon vergrößert
     (Punktdichte des Geräts), darum wird der Maßstab aus ihr gelesen und nicht geraten. */
  function bildpunkte(ctx, r) {
    try { const m = ctx.getTransform(); return r * Math.max(Math.abs(m.a), Math.abs(m.d)); }
    catch (e) { return r; }
  }
  /* Ab dieser Größe lohnt sich die Feinarbeit. Darunter wäre eine Schneeflocke ein Bruchteil
     eines Bildpunkts: Sie zu zeichnen kostet Zeit und ändert am Bild nichts. */
  const FEIN_AB = 34;

  function draw(ctx, id, cx, cy, r, color, t) {
    const d = DEFS[id];
    if (!d || id === 'none' || r < 1) return;
    const fein = bildpunkte(ctx, r) >= FEIN_AB;
    ctx.save();
    if (voll(id)) ctx.translate(cx, cy); else ctx.translate(cx, cy - r * 0.72);
    ctx.scale(r, r);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 0.07; ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    /* Gibt eine Zeichenfunktion etwas zurück, wird das erst nach dem Reif gezeichnet. Das
       brauchen Skins, die einen Hut tragen: Sonst liefe der Reif quer über die Krempe. */
    const obenauf = d(ctx, color, t || 0, fein);
    if (voll(id)) {   // Reif in Spielerfarbe: sonst wüsste bei vier Spielern niemand, wem der Ball gehört
      ctx.strokeStyle = color || '#ffffff'; ctx.lineWidth = 0.07;
      ctx.beginPath(); ctx.arc(0, 0, 0.965, 0, TAU2); ctx.stroke();
    }
    if (typeof obenauf === 'function') obenauf();
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

  /* Ist dieser Hut schon zu haben?

     Die sechs Weltskins verdient man sich am eigenen Können: In der Summe der eigenen besten
     Einzelbahnen muss man unter dem Par der Welt bleiben, und jede Bahn braucht ein Ergebnis.
     Gezählt werden die besten Einzelbahnen – nicht eine Runde am Stück –, denn eine ganze Runde
     ohne Patzer wäre für die meisten unerreichbar, Bahn für Bahn dagegen ist es eine Übung, die
     man sich Stück für Stück vornehmen kann.

     Der Championhelm bleibt beim alten: Er gehört dem, der in seiner Welt den Kombi-Rundenrekord
     hält, und nur solange er ihn hält.

     Gezeichnet wird ein gesperrter Skin trotzdem: Kommt er über das Netz vom Ball eines
     Mitspielers, soll man ihn sehen, egal was auf dem eigenen Gerät steht.
     Best wird erst nach hats.js geladen, darum die Abfragen hier drin und nicht oben. */
  function freigeschaltet(id) {
    const h = byId(id);
    if (!h || !h.welt) return true;
    if (typeof Best === 'undefined') return false;
    if (h.art === 'rekord') {
      if (!Best.name) return false;
      const rekord = Best.of(h.welt).combo.round;
      return !!(rekord && rekord.n && rekord.n === Best.name);
    }
    return Best.fortschritt(h.welt).geschafft;
  }
  /* Wie man ihn bekommt – für den Hinweis am gesperrten Platz */
  function bedingung(id) {
    const h = byId(id);
    if (!h || !h.welt) return '';
    const w = (typeof WORLDS !== 'undefined' && WORLDS.find(x => x.id === h.welt)) || null;
    const name = w ? w.name : 'dieser Welt';
    if (h.art === 'rekord') return `Halte den Kombi-Rundenrekord: ${name}`;
    return `Spiele jede Bahn in ${name} und bleib in der Summe unter Par`;
  }
  /* Wie weit man ist – kurz genug für eine Meldung im Spiel */
  function stand(id) {
    const h = byId(id);
    if (!h || !h.welt || h.art === 'rekord' || typeof Best === 'undefined') return '';
    const f = Best.fortschritt(h.welt);
    if (f.offen.length) return `noch ${f.offen.length} ${f.offen.length === 1 ? 'Bahn' : 'Bahnen'} offen (${f.fertig} von ${f.gesamt})`;
    if (f.diff < 0) return `${-f.diff} unter Par – geschafft`;
    return `${f.schlaege} Schläge auf Par ${f.par} – ${f.diff === 0 ? 'ein Schlag fehlt' : `${f.diff + 1} Schläge fehlen`}`;
  }
  /* Welche Belohnung gehört zu dieser Welt? */
  const belohnung = weltId => LIST.find(h => h.welt === weltId) || null;

  return {
    LIST, draw, preview, freigeschaltet, bedingung, stand, belohnung, voll,
    has: id => Object.prototype.hasOwnProperty.call(DEFS, id),
    name: id => (byId(id) || LIST[0]).name,
    icon: id => (byId(id) || LIST[0]).icon,
  };
})();
