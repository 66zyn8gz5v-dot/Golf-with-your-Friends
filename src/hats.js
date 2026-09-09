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

    globe(ctx, color, t, fein) {   // Märchenland: Schneekugel mit Burg, Wald und rieselndem Schnee
      glasKugel(ctx, '#cfe6ff', '#5f96cc');
      ctx.save(); kugelMaske(ctx);
      // Abendhimmel: oben tiefblau, unten hell – dagegen heben sich die Türme ab
      const himmel = ctx.createLinearGradient(0, -1, 0, 0.7);
      himmel.addColorStop(0, '#2b4b83'); himmel.addColorStop(0.55, '#77a9dd'); himmel.addColorStop(1, '#d6e8f7');
      ctx.fillStyle = himmel; ctx.fillRect(-1, -1, 2, 2);
      // Sterne, die langsam blinken: das Funkeln steckt in der Größe, nicht in der Deckkraft –
      // so lassen sich alle in einem Zug füllen (eine Füllung mit halber Deckkraft kostet auf
      // der Leinwand ein Vielfaches einer normalen).
      ctx.fillStyle = '#ffffff'; ctx.beginPath();
      for (let i = 0; fein && i < 6; i++) {
        const sx = -0.85 + streu(i, 1) * 1.7, sy = -0.92 + streu(i, 2) * 0.55;
        const gr = 0.014 + 0.026 * Math.abs(Math.sin(t * 1.3 + i * 1.7));
        ctx.moveTo(sx + gr, sy); ctx.arc(sx, sy, gr, 0, TAU2);
      }
      ctx.fill();
      // Sichelmond: voller Kreis, dem ein zweiter in Himmelsfarbe die Hälfte wegnimmt
      ctx.fillStyle = '#fff6cf'; ctx.beginPath(); ctx.arc(0.56, -0.60, 0.16, 0, TAU2); ctx.fill();
      ctx.fillStyle = himmel; ctx.beginPath(); ctx.arc(0.48, -0.66, 0.155, 0, TAU2); ctx.fill();
      // ferne Hügel unter Schnee
      ctx.fillStyle = '#a8c6de'; ctx.beginPath(); ctx.ellipse(-0.55, 0.72, 0.95, 0.46, 0, 0, TAU2); ctx.fill();
      ctx.fillStyle = '#bcd6ea'; ctx.beginPath(); ctx.ellipse(0.68, 0.74, 0.75, 0.36, 0, 0, TAU2); ctx.fill();
      burg(ctx, t, fein);
      // Tannen als dunkle Silhouetten am Rand, davor der Schnee
      for (const [tx, ty, ts] of [[-0.74, 0.62, 0.30], [-0.50, 0.70, 0.22], [0.64, 0.66, 0.26]]) tanne(ctx, tx, ty, ts, fein);
      ctx.fillStyle = '#f4f9ff'; ctx.beginPath(); ctx.ellipse(0, 1.02, 1.2, 0.42, 0, 0, TAU2); ctx.fill();
      // Flocken: jede mit eigener Größe, Fallzeit und seitlichem Wiegen, unten ausblendend
      // Flocken in zwei Gruppen: volle und verblassende. Zwei Füllungen statt vierzehn.
      for (const [von, bis, farbe] of [[0, 0.78, '#ffffff'], [0.78, 1, 'rgba(255,255,255,0.4)']]) {
        ctx.fillStyle = farbe; ctx.beginPath();
        for (let i = 0; i < (fein ? 14 : 6); i++) {
          const p = (t * (0.16 + streu(i, 4) * 0.16) + streu(i, 5)) % 1;
          if (p < von || p >= bis) continue;
          const gr = 0.03 + streu(i, 3) * 0.035;
          const x = -0.95 + streu(i, 6) * 1.9 + Math.sin(t * (0.8 + streu(i, 7)) + i) * 0.09;
          ctx.moveTo(x + gr, -1 + p * 2.1); ctx.arc(x, -1 + p * 2.1, gr, 0, TAU2);
        }
        ctx.fill();
      }
      ctx.restore(); glasLicht(ctx);
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
    },

    idolhead(ctx, color, t, fein) {   // Dschungeltempel: Götzenkopf aus Stein, von Ranken überwachsen
      const g = ctx.createRadialGradient(-0.35, -0.4, 0.1, 0, 0, 1);
      g.addColorStop(0, '#c0b79f'); g.addColorStop(0.55, '#8d8571'); g.addColorStop(1, '#514b3e');
      ctx.beginPath(); ctx.arc(0, 0, 1, 0, TAU2); ctx.fillStyle = g; ctx.fill();
      ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 0.07; ctx.stroke();
      ctx.save(); kugelMaske(ctx);
      // Kopfschmuck: breites Band mit Kerben und einem Jadestein in der Mitte
      ctx.fillStyle = '#6f6857'; ctx.fillRect(-1, -1, 2, 0.46);
      if (fein) { ctx.fillStyle = '#5b5546';
        for (let i = -4; i <= 4; i++) ctx.fillRect(i * 0.2 - 0.03, -0.72, 0.07, 0.18); }
      ctx.fillStyle = '#3f8f6a'; ctx.beginPath();
      ctx.moveTo(0, -0.78); ctx.lineTo(0.15, -0.6); ctx.lineTo(0, -0.42); ctx.lineTo(-0.15, -0.6); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath();
      ctx.moveTo(0, -0.74); ctx.lineTo(0.09, -0.61); ctx.lineTo(0, -0.55); ctx.closePath(); ctx.fill();
      // Ohrscheiben aus Gold
      ctx.fillStyle = '#c9a03c'; ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 0.05;
      for (const ox of [-0.86, 0.86]) { ctx.beginPath(); ctx.ellipse(ox, 0.12, 0.11, 0.19, 0, 0, TAU2); ctx.fill(); ctx.stroke(); }
      // Brauenwulst mit Schatten darunter – davon lebt das Gesicht
      ctx.fillStyle = '#7d7563';
      ctx.beginPath(); ctx.moveTo(-0.78, -0.5); ctx.quadraticCurveTo(0, -0.3, 0.78, -0.5);
      ctx.lineTo(0.78, -0.3); ctx.quadraticCurveTo(0, -0.1, -0.78, -0.3); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(30,26,18,0.35)';
      ctx.beginPath(); ctx.moveTo(-0.78, -0.3); ctx.quadraticCurveTo(0, -0.1, 0.78, -0.3);
      ctx.lineTo(0.78, -0.18); ctx.quadraticCurveTo(0, 0.02, -0.78, -0.18); ctx.closePath(); ctx.fill();
      // Nase mit Ring, Mund mit Zähnen
      ctx.fillStyle = '#4a4436';
      ctx.beginPath(); ctx.moveTo(0, -0.16); ctx.lineTo(-0.2, 0.3); ctx.lineTo(0.2, 0.3); ctx.closePath(); ctx.fill();
      ctx.strokeStyle = '#c9a03c'; ctx.lineWidth = 0.042;
      ctx.beginPath(); ctx.arc(0, 0.3, 0.075, 0.2, Math.PI - 0.2); ctx.stroke();
      ctx.fillStyle = '#2e2a20'; ctx.fillRect(-0.36, 0.52, 0.72, 0.17);
      ctx.fillStyle = '#cfc7ad';
      for (let i = 0; i < 4; i++) ctx.fillRect(-0.32 + i * 0.18, 0.52, 0.1, 0.08);
      // Risse und Meißelspuren
      if (fein) {
        ctx.strokeStyle = 'rgba(45,40,28,0.45)'; ctx.lineWidth = 0.045; ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-0.9, 0.42); ctx.lineTo(-0.62, 0.5); ctx.lineTo(-0.5, 0.76);
        ctx.moveTo(0.88, -0.1); ctx.lineTo(0.66, 0.16); ctx.lineTo(0.72, 0.44);
        ctx.stroke();
      }
      // Moos in zwei Grüntönen
      for (const [mc, flecken] of [['#3f8f5a', [[-0.72, 0.28, 0.24], [-0.12, 0.9, 0.3]]],
                                   ['#4fa066', [[0.7, -0.24, 0.2], [0.5, 0.82, 0.2]]]]) {
        ctx.fillStyle = mc; ctx.beginPath();
        for (const [mx, my, mr] of flecken) { ctx.moveTo(mx + mr, my); ctx.ellipse(mx, my, mr, mr * 0.55, 0, 0, TAU2); }
        ctx.fill();
      }
      // glühende Augen: langsamer Atem, dazu ab und zu ein helles Aufflackern
      const atem = 0.55 + 0.45 * Math.sin(t * 1.1);
      const flack = ((t * 0.37) % 1) < 0.09 ? 1 : 0;
      const gl = Math.min(1, atem + flack * 0.8);
      // beide Augen je Schicht in einem Zug – drei Füllungen statt sechs
      const augen = (fn) => { ctx.beginPath(); for (const ex of [-0.42, 0.42]) fn(ex); ctx.fill(); };
      ctx.fillStyle = `rgba(120,255,150,${(0.3 * gl).toFixed(2)})`;
      augen(ex => { ctx.moveTo(ex + 0.34, -0.22); ctx.arc(ex, -0.22, 0.34, 0, TAU2); });
      ctx.fillStyle = '#1d2b1e';
      augen(ex => { ctx.moveTo(ex + 0.19, -0.22); ctx.ellipse(ex, -0.22, 0.19, 0.14, 0, 0, TAU2); });
      ctx.fillStyle = `rgb(${Math.round(130 + 90 * gl)},255,${Math.round(140 + 80 * gl)})`;
      augen(ex => { ctx.moveTo(ex + 0.13, -0.22); ctx.ellipse(ex, -0.22, 0.13, 0.09, 0, 0, TAU2); });
      // Ranken, die von oben herabhängen und im Luftzug wiegen
      if (fein) {
      ctx.strokeStyle = '#2f7a44'; ctx.lineWidth = 0.055; ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const rx = i ? 0.8 : -0.8, sw = Math.sin(t * 1.2 + i * 1.4) * 0.11, len = 0.62 + i * 0.14;
        ctx.moveTo(rx, -0.98);
        ctx.quadraticCurveTo(rx + sw, -0.98 + len * 0.6, rx + sw * 1.6, -0.98 + len);
      }
      ctx.stroke();
      ctx.fillStyle = '#4fa057'; ctx.beginPath();
      for (let i = 0; i < 2; i++) {
        const rx = i ? 0.8 : -0.8, sw = Math.sin(t * 1.2 + i * 1.4) * 0.11, len = 0.62 + i * 0.14;
        for (let k = 1; k <= 2; k++) {
          const u = k / 2.6, lx = rx + sw * u * 1.6, ly = -0.98 + len * u;
          ctx.moveTo(lx + 0.19, ly); ctx.ellipse(lx + 0.09, ly, 0.1, 0.05, 0.5, 0, TAU2);
          ctx.moveTo(lx + 0.01, ly + 0.08); ctx.ellipse(lx - 0.09, ly + 0.08, 0.1, 0.05, -0.5, 0, TAU2);
        }
      }
      ctx.fill();
      }
      ctx.restore();
      steinRand(ctx);
      // Leuchtkäfer schwirren vor dem Kopf
      ctx.fillStyle = '#d8ff8a'; ctx.beginPath();
      for (let i = 0; fein && i < 3; i++) {
        const a = t * (0.5 + i * 0.2) + i * 2.1;
        const fx = Math.cos(a) * (0.75 + Math.sin(a * 1.7) * 0.2), fy = Math.sin(a * 1.3) * 0.7;
        const fr = 0.02 + 0.032 * Math.abs(Math.sin(t * 3 + i * 2));   // Glimmen über die Größe
        ctx.moveTo(fx + fr, fy); ctx.arc(fx, fy, fr, 0, TAU2);
      }
      ctx.fill();
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
  /* Burg in der Schneekugel: zwei Türme, Mauer mit Zinnen, leuchtende Fenster, wehende Fahne */
  function burg(ctx, t, fein) {
    const mauer = '#ded7c6', schatten = '#b5ae9d', dach = '#b8362c';
    ctx.fillStyle = mauer; ctx.fillRect(-0.12, 0.2, 0.3, 0.52);          // Mauer zwischen den Türmen
    ctx.fillStyle = schatten; ctx.fillRect(0.08, 0.2, 0.1, 0.52);
    ctx.fillStyle = mauer;
    for (let i = 0; fein && i < 3; i++) ctx.fillRect(-0.12 + i * 0.11, 0.12, 0.07, 0.1);   // Zinnen
    for (const [x, w, oben, dh] of [[-0.38, 0.26, -0.36, 0.34], [0.16, 0.2, -0.1, 0.26]]) {
      ctx.fillStyle = mauer; ctx.fillRect(x, oben, w, 0.72 - oben + 0.04);
      ctx.fillStyle = schatten; ctx.fillRect(x + w * 0.66, oben, w * 0.34, 0.72 - oben + 0.04);
      ctx.fillStyle = dach;                                                // Kegeldach
      ctx.beginPath(); ctx.moveTo(x - 0.04, oben); ctx.lineTo(x + w / 2, oben - dh); ctx.lineTo(x + w + 0.04, oben); ctx.closePath(); ctx.fill();
      if (fein) {   // Schnee auf dem Dach
        ctx.fillStyle = '#f2f8ff';
        ctx.beginPath(); ctx.moveTo(x + w / 2, oben - dh); ctx.lineTo(x + w * 0.78, oben - dh * 0.35);
        ctx.quadraticCurveTo(x + w / 2, oben - dh * 0.5, x + w * 0.22, oben - dh * 0.35); ctx.closePath(); ctx.fill();
      }
    }
    // Fenster: warmes Licht, das ruhig pulst
    ctx.fillStyle = `rgba(255,214,110,${0.65 + 0.35 * Math.sin(t * 1.7)})`;
    ctx.fillRect(-0.32, -0.16, 0.09, 0.13); ctx.fillRect(-0.32, 0.16, 0.09, 0.13); ctx.fillRect(0.2, 0.12, 0.08, 0.12);
    ctx.fillStyle = '#6b4a2a';                                             // Tor
    ctx.beginPath(); ctx.moveTo(-0.05, 0.72); ctx.lineTo(-0.05, 0.5);
    ctx.quadraticCurveTo(0.02, 0.42, 0.09, 0.5); ctx.lineTo(0.09, 0.72); ctx.closePath(); ctx.fill();
    // Fahnenmast mit wehender Fahne
    if (!fein) return;
    ctx.strokeStyle = '#7a6a52'; ctx.lineWidth = 0.025;
    ctx.beginPath(); ctx.moveTo(-0.25, -0.7); ctx.lineTo(-0.25, -0.92); ctx.stroke();
    ctx.fillStyle = '#ffd166';
    ctx.beginPath(); ctx.moveTo(-0.25, -0.92);
    ctx.quadraticCurveTo(-0.12, -0.88 + Math.sin(t * 4) * 0.03, -0.03 + Math.sin(t * 4) * 0.03, -0.86);
    ctx.lineTo(-0.25, -0.78); ctx.closePath(); ctx.fill();
  }
  /* Tanne als dunkle Silhouette: drei Zweigkränze und ein Stamm, oben eine Schneehaube */
  function tanne(ctx, x, y, s, fein) {
    ctx.fillStyle = '#33241a'; ctx.fillRect(x - s * 0.07, y, s * 0.14, s * 0.5);
    ctx.fillStyle = '#1f5233';
    for (let i = 0; i < 3; i++) {
      const yy = y - i * s * 0.5, w = s * (1 - i * 0.22);
      ctx.beginPath(); ctx.moveTo(x - w, yy); ctx.lineTo(x, yy - s * 0.95); ctx.lineTo(x + w, yy); ctx.closePath(); ctx.fill();
    }
    if (!fein) return;
    ctx.fillStyle = 'rgba(255,255,255,0.75)';
    ctx.beginPath(); ctx.moveTo(x - s * 0.3, y - s * 1.6); ctx.lineTo(x, y - s * 1.95); ctx.lineTo(x + s * 0.3, y - s * 1.6); ctx.closePath(); ctx.fill();
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
    d(ctx, color, t || 0, fein);
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
