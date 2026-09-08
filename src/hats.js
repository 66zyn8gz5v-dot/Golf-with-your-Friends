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

    knight(ctx) { // Ritterhelm mit Federbusch
      ctx.beginPath(); // Federbusch
      ctx.moveTo(0.06, -0.8);
      ctx.quadraticCurveTo(0.68, -1.5, 0.2, -1.96);
      ctx.quadraticCurveTo(0.06, -1.52, -0.36, -1.16);
      ctx.quadraticCurveTo(-0.22, -0.86, 0.06, -0.8);
      ctx.closePath();
      const gp = ctx.createLinearGradient(-0.2, -0.9, 0.3, -1.8);
      gp.addColorStop(0, '#9e2b2b'); gp.addColorStop(1, '#e8544c');
      fs(ctx, gp);
      ctx.beginPath();
      ctx.moveTo(-0.7, 0.28); ctx.lineTo(-0.72, -0.44);
      ctx.quadraticCurveTo(-0.62, -0.98, 0, -0.98);
      ctx.quadraticCurveTo(0.62, -0.98, 0.72, -0.44);
      ctx.lineTo(0.7, 0.28); ctx.closePath();
      const g = ctx.createLinearGradient(-0.7, 0, 0.7, -0.5);
      g.addColorStop(0, '#79808d'); g.addColorStop(0.42, '#c2c9d4'); g.addColorStop(1, '#6d747f');
      fs(ctx, g);
      ctx.fillStyle = '#232833';
      ctx.fillRect(-0.56, -0.42, 1.12, 0.15); // Sehschlitz
      ctx.fillRect(-0.1, -0.15, 0.2, 0.34);   // Luftschlitz
      ctx.strokeStyle = 'rgba(255,255,255,0.4)'; ctx.lineWidth = 0.05;
      ctx.beginPath(); ctx.moveTo(-0.34, -0.72); ctx.quadraticCurveTo(-0.2, -0.86, 0.02, -0.86); ctx.stroke();
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
  ];
  const byId = id => LIST.find(h => h.id === id);

  /* Hut auf einen Ball zeichnen: (cx, cy) ist die Ballmitte auf dem Schirm, r sein Radius */
  function draw(ctx, id, cx, cy, r) {
    const d = DEFS[id];
    if (!d || id === 'none' || r < 1) return;
    ctx.save();
    ctx.translate(cx, cy - r * 0.72);
    ctx.scale(r, r);
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.lineWidth = 0.07; ctx.strokeStyle = 'rgba(0,0,0,0.4)';
    d(ctx);
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
    const r = w * 0.24, cx = w / 2, cy = h * 0.74;
    ctx.beginPath(); ctx.ellipse(cx, cy + r * 1.05, r * 1.05, r * 0.3, 0, 0, TAU2);
    ctx.fillStyle = 'rgba(0,0,0,0.28)'; ctx.fill();
    const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.35, color); g.addColorStop(1, dim(color, 0.55));
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU2);
    ctx.fillStyle = g; ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.35)'; ctx.lineWidth = 1; ctx.stroke();
    draw(ctx, id, cx, cy, r);
  }

  return {
    LIST, draw, preview,
    has: id => Object.prototype.hasOwnProperty.call(DEFS, id),
    name: id => (byId(id) || LIST[0]).name,
    icon: id => (byId(id) || LIST[0]).icon,
  };
})();
