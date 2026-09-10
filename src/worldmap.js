/* Weltkarte: die Übersicht über alle Welten – gezeichnet in derselben 2,5D-Sicht wie das Spiel.

   Die Projektion ist dieselbe wie im Renderer: Blick schräg von oben auf eine um 45° gedrehte Welt.
   Eine Kachel in x-Richtung geht auf dem Schirm nach rechts unten, eine in y-Richtung nach links
   unten, Höhe geht gerade nach oben. Jede Welt liegt darum als schwebende Scheibe da, genau wie
   eine Bahn im Spiel: Deckfläche im Karomuster, darunter zwei sichtbare Seitenflächen – die linke
   hell, die rechte im Schatten.

   Die Reise geht von links (heller Tag im Märchenland) nach rechts (Nacht im Schattenreich).
   Jede Welt ist von Anfang an anwählbar; die Stufe steht nur als Hinweis am Ort.

   Die Orte liegen in Prozent der Kartenfläche (spots), die Zeichnung nutzt denselben Maßstab
   (viewBox 100 × 62, preserveAspectRatio="none"), damit Marke und Untergrund zusammenpassen. */
const WorldMap = (() => {
  /* x, y in Prozent der Karte; icon = Zeichen der Marke, col = Farbe des Rings.
     Wer hier fehlt, steht nicht auf der Karte: Das Kolosseum ist die Turnierwelt und wird nur
     über den Turnier-Knopf im Startbildschirm betreten, nicht über einen Ort auf der Reise. */
  const spots = {
    normal: { x: 12, y: 52, icon: '🏰', col: '#ffd166' },
    pro: { x: 43, y: 50, icon: '⚙️', col: '#e0a05a' },
    sea: { x: 27, y: 82, icon: '🌊', col: '#7fd8ff' },
    jungle: { x: 59, y: 82, icon: '🗿', col: '#9ee06f' },
    storm: { x: 75, y: 44, icon: '⛈️', col: '#8fb8ff' },
    shadow: { x: 88, y: 74, icon: '🔮', col: '#c58bff' },
    clock: { x: 61, y: 31, icon: '🕰️', col: '#ffc46b' },
  };

  /* ---------- Projektion wie im Spiel ---------- */
  const K = 1.35;                 // Kantenlänge einer Kachel auf der Karte
  const TILT = 0.72;              // Neigung: 1 = senkrecht von oben, kleiner = flacher
  const ZF = 0.92;                // Maßstab der Höhe
  const H = K * Math.SQRT1_2;     // halbe Kachelbreite auf dem Schirm
  const V = H * TILT;             // halbe Kachelhöhe auf dem Schirm
  /* (a, b) = Kachelversatz zur Mitte der Scheibe, z = Höhe darüber */
  const P = (cx, cy, a, b, z = 0) => [cx + (a - b) * H, cy + (a + b) * V - z * K * ZF];
  const pts = list => list.map(p => `${p[0].toFixed(2)},${p[1].toFixed(2)}`).join(' ');
  const poly = (list, fill, extra = '') => `<polygon points="${pts(list)}" fill="${fill}"${extra}/>`;

  /* Schwebende Scheibe: Karodeck oben, darunter die beiden sichtbaren Seitenflächen.
     w × d Kacheln groß, h Kacheln dick. */
  function slab(cx, cy, w, d, h, top, top2, left, right, rim = 'rgba(255,255,255,0.25)') {
    const A = P(cx, cy, -w / 2, -d / 2), B = P(cx, cy, w / 2, -d / 2),
      C = P(cx, cy, w / 2, d / 2), D = P(cx, cy, -w / 2, d / 2);
    const Bd = P(cx, cy, w / 2, -d / 2, -h), Cd = P(cx, cy, w / 2, d / 2, -h), Dd = P(cx, cy, -w / 2, d / 2, -h);
    // Karomuster auf der Deckfläche
    let checks = '';
    for (let i = 0; i < w; i++) for (let j = 0; j < d; j++) {
      if ((i + j) % 2) continue;
      const a = -w / 2 + i, b = -d / 2 + j;
      checks += poly([P(cx, cy, a, b), P(cx, cy, a + 1, b), P(cx, cy, a + 1, b + 1), P(cx, cy, a, b + 1)], top2);
    }
    return `<g>
      ${poly([B, C, Cd, Bd], right)}
      ${poly([D, C, Cd, Dd], left)}
      ${poly([A, B, C, D], top)}
      ${checks}
      <polyline points="${pts([A, B, C, D, A])}" fill="none" stroke="${rim}" stroke-width="0.16"/>
      <polyline points="${pts([D, C, B])}" fill="none" stroke="rgba(0,0,0,0.28)" stroke-width="0.2"/>
    </g>`;
  }
  /* Klotz auf der Scheibe: quadratischer Grundriss, Deckel und zwei Seiten – wie ein Block im Spiel */
  function box(cx, cy, a, b, w, d, z0, h, top, left, right) {
    const T = (da, db, z) => P(cx, cy, a + da, b + db, z);
    const A = T(-w / 2, -d / 2, z0 + h), B = T(w / 2, -d / 2, z0 + h),
      C = T(w / 2, d / 2, z0 + h), D = T(-w / 2, d / 2, z0 + h);
    const Bd = T(w / 2, -d / 2, z0), Cd = T(w / 2, d / 2, z0), Dd = T(-w / 2, d / 2, z0);
    return poly([B, C, Cd, Bd], right) + poly([D, C, Cd, Dd], left) + poly([A, B, C, D], top);
  }
  /* Kegeldach oder Baumkrone: Spitze über der Grundfläche, linke Hälfte im Licht */
  function cone(cx, cy, a, b, r, z0, h, lit, dark) {
    const tip = P(cx, cy, a, b, z0 + h);
    const l = P(cx, cy, a - r, b + r, z0), rr = P(cx, cy, a + r, b - r, z0);
    const f = P(cx, cy, a + r, b + r, z0), k = P(cx, cy, a - r, b - r, z0);
    return poly([l, k, tip], lit) + poly([k, rr, tip], lit) + poly([rr, f, tip], dark) + poly([f, l, tip], dark);
  }
  /* Schatten, den etwas auf die Deckfläche wirft */
  const shade = (cx, cy, a, b, r) =>
    poly([P(cx, cy, a - r, b), P(cx, cy, a, b - r), P(cx, cy, a + r, b), P(cx, cy, a, b + r)], 'rgba(0,0,0,0.22)');
  /* Baum im Spielstil: Schatten, Stamm, zwei Kronen */
  const tree = (cx, cy, a, b, s = 1, lit = '#6cbf5a', dark = '#2f7a3e') =>
    `<g>${shade(cx, cy, a + 0.2, b + 0.2, 0.5 * s)}
      ${box(cx, cy, a, b, 0.16 * s, 0.16 * s, 0, 0.4 * s, '#7a5230', '#5f3f24', '#452c17')}
      ${cone(cx, cy, a, b, 0.62 * s, 0.3 * s, 1.5 * s, lit, dark)}
      ${cone(cx, cy, a, b, 0.44 * s, 1.1 * s, 1.1 * s, lit, dark)}</g>`;
  /* Fahne auf einer Stange */
  const flag = (cx, cy, a, b, z, hgt, col) => {
    const foot = P(cx, cy, a, b, z), top = P(cx, cy, a, b, z + hgt);
    const tip = [top[0] + 1.5, top[1] + 0.45], mid = [top[0], top[1] + 0.9];
    return `<line x1="${foot[0].toFixed(2)}" y1="${foot[1].toFixed(2)}" x2="${top[0].toFixed(2)}" y2="${top[1].toFixed(2)}" stroke="#e8e2d4" stroke-width="0.16"/>
      <polygon class="art-flag" points="${top[0].toFixed(2)},${top[1].toFixed(2)} ${tip[0].toFixed(2)},${tip[1].toFixed(2)} ${mid[0].toFixed(2)},${mid[1].toFixed(2)}" fill="${col}"/>`;
  };

  /* par: 'none' für die Karte selbst (Prozent = Koordinate), 'xMidYMid slice' für den Knopf im Titelbild */
  function svg(cls = 'atlas-bg', par = 'none') {
    // Mitte jeder Scheibe auf der Karte – die Ortsschilder sitzen an ihrer Vorderkante
    const W = {
      storm: [76, 20], pro: [43, 23], normal: [14, 25], shadow: [87, 39], sea: [27, 44], jungle: [59, 44], clock: [61, 12],
    };
    const stars = [];
    for (let i = 0; i < 28; i++) {
      const x = 54 + ((i * 37) % 45), y = 2 + ((i * 17) % 26), r = 0.15 + ((i * 7) % 3) * 0.11;
      stars.push(`<circle class="twinkle ${i % 3 ? 't' + (i % 3 + 1) : ''}" cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.4 + (i % 4) * 0.15}"/>`);
    }
    const rays = [];
    for (let i = 0; i < 8; i++) {
      const a = 0.34 + i * 0.33, w = 0.05 + (i % 3) * 0.018, L = 34 + (i % 4) * 8;
      rays.push(`<path d="M12 6 L${(12 + Math.cos(a - w) * L).toFixed(1)} ${(6 + Math.sin(a - w) * L).toFixed(1)} L${(12 + Math.cos(a + w) * L).toFixed(1)} ${(6 + Math.sin(a + w) * L).toFixed(1)} Z" fill="#fff4c8" opacity="${(0.04 + (i % 3) * 0.016).toFixed(3)}"/>`);
    }
    const motes = [];
    for (let i = 0; i < 24; i++) {
      const x = 3 + ((i * 61) % 95), y = 8 + ((i * 29) % 48), r = (0.13 + ((i * 5) % 3) * 0.06).toFixed(2);
      motes.push(`<circle class="twinkle ${i % 3 ? 't' + (i % 3 + 1) : ''}" cx="${x}" cy="${y}" r="${r}" fill="${x < 48 ? '#ffe9a8' : '#bcd4ff'}" opacity="${(0.28 + (i % 4) * 0.1).toFixed(2)}"/>`);
    }
    // Reiseweg: von Vorderkante zu Vorderkante, hinter den Scheiben durch
    const front = id => { const [x, y] = W[id]; return [x, y + 5.4]; };
    const route = ['normal', 'sea', 'pro', 'jungle', 'clock', 'storm', 'shadow'].map(id => front(id).map(v => v.toFixed(1)).join(' ')).join(' L ');

    return `<svg class="${cls}" viewBox="0 0 100 62" preserveAspectRatio="${par}" aria-hidden="true">
      <defs>
        <linearGradient id="atSky" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#63b6f0"/><stop offset="0.22" stop-color="#b8e2ff"/><stop offset="0.44" stop-color="#f0a95f"/>
          <stop offset="0.6" stop-color="#8a4a5e"/><stop offset="0.78" stop-color="#241a42"/><stop offset="1" stop-color="#07050f"/></linearGradient>
        <linearGradient id="atFar" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#9fc4ea"/><stop offset="0.3" stop-color="#c0aa92"/><stop offset="0.6" stop-color="#7a6a8e"/><stop offset="1" stop-color="#1a1436"/></linearGradient>
        <radialGradient id="atSun" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="rgba(255,246,205,0.85)"/><stop offset="1" stop-color="rgba(255,224,138,0)"/></radialGradient>
        <radialGradient id="atMoon" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0.3" stop-color="rgba(210,80,80,0.5)"/><stop offset="1" stop-color="rgba(200,60,60,0)"/></radialGradient>
        <radialGradient id="atGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="rgba(255,224,138,0.7)"/><stop offset="1" stop-color="rgba(255,224,138,0)"/></radialGradient>
        <radialGradient id="atMagic" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="rgba(170,100,255,0.5)"/><stop offset="1" stop-color="rgba(170,100,255,0)"/></radialGradient>
        <radialGradient id="atVig" cx="0.5" cy="0.5" r="0.74">
          <stop offset="0.55" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.48)"/></radialGradient>
        <filter id="atSoft" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.85"/></filter>
        <filter id="atNear" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="0.35"/></filter>
        <filter id="atDeep" x="-30%" y="-30%" width="170%" height="180%">
          <feDropShadow dx="1" dy="1.8" stdDeviation="1" flood-color="#0a0818" flood-opacity="0.5"/></filter>
      </defs>

      <rect width="100" height="62" fill="url(#atSky)"/>
      ${stars.join('')}
      <g>${rays.join('')}</g>
      <circle cx="12" cy="6" r="12" fill="url(#atSun)"/><circle cx="12" cy="6" r="3.4" fill="#fff8d8"/>
      <circle cx="88" cy="6" r="10" fill="url(#atMoon)"/><circle cx="88" cy="6" r="3" fill="#c8434c"/>
      <!-- ferner Gebirgszug als Rückwand, weich und hell wie in der Ferne -->
      <g filter="url(#atNear)" opacity="0.95">
        <path d="M0 24 L7 15 L13 21 L20 12 L27 22 L34 14 L42 23 L50 11 L58 21 L66 13 L74 22 L82 12 L90 21 L100 15 L100 34 L0 34 Z" fill="url(#atFar)"/>
        <path d="M7 15 L9.6 18.9 L4.4 18.9 Z M20 12 L23 16.5 L17 16.5 Z M50 11 L53.2 15.8 L46.8 15.8 Z M82 12 L85 16.5 L79 16.5 Z"
          fill="rgba(255,255,255,0.5)"/>
        <path d="M0 24 L7 15 L13 21 L20 12 L27 22 L34 14 L42 23 L50 11 L58 21 L66 13 L74 22 L82 12 L90 21 L100 15"
          fill="none" stroke="rgba(255,255,255,0.22)" stroke-width="0.25"/></g>
      <g filter="url(#atSoft)" opacity="0.35">
        <path d="M0 27 L10 20 L18 26 L28 19 L38 27 L48 18 L58 26 L68 19 L78 27 L88 19 L100 25 L100 36 L0 36 Z" fill="url(#atFar)"/></g>
      <g filter="url(#atSoft)" opacity="0.28">
        <g class="drift"><ellipse cx="30" cy="17" rx="13" ry="2.1" fill="#fff"/></g>
        <g class="drift d2"><ellipse cx="66" cy="14" rx="11" ry="1.8" fill="#e0d2f0"/></g></g>

      <!-- Reiseweg zwischen den Welten -->
      <path d="M ${route}" fill="none" stroke="rgba(18,12,36,0.4)" stroke-width="1.3" stroke-linecap="round" stroke-dasharray="1.5 2.4"/>
      <path d="M ${route}" fill="none" stroke="rgba(255,240,180,0.95)" stroke-width="0.6" stroke-linecap="round" stroke-dasharray="1.5 2.4"/>

      <!-- ===== Sturmhimmel: dunkle Feste über den Wolken ===== -->
      <g filter="url(#atDeep)">
        ${slab(...W.storm, 8, 8, 2.6, '#4a6a62', '#3f5c56', '#2a3f42', '#16242c')}
        ${(() => { const [x, y] = W.storm; return `
          ${shade(x, y, 0.4, 0.4, 1.6)}
          ${box(x, y, -1.6, -1.6, 1.3, 1.3, 0, 2.6, '#39406e', '#2a3058', '#1a1e3e')}
          ${cone(x, y, -1.6, -1.6, 0.95, 2.6, 1.9, '#2a3058', '#171b3e')}
          ${box(x, y, 0.6, 0.2, 1.7, 1.7, 0, 3.6, '#3f4878', '#2f3660', '#1d2246')}
          ${cone(x, y, 0.6, 0.2, 1.25, 3.6, 2.4, '#2f3660', '#171b3e')}
          ${box(x, y, 2.4, 1.6, 1.2, 1.2, 0, 2.2, '#39406e', '#2a3058', '#1a1e3e')}
          ${cone(x, y, 2.4, 1.6, 0.9, 2.2, 1.6, '#2a3058', '#171b3e')}
          <g fill="#8fd8ff">${[[-1.6, -1.6, 1.5], [0.6, 0.2, 2.3], [2.4, 1.6, 1.2]].map(([a, b, z]) => {
            const p = P(x, y, a - 0.55, b + 0.55, z);
            return `<rect x="${(p[0] - 0.22).toFixed(2)}" y="${(p[1] - 0.5).toFixed(2)}" width="0.44" height="0.7" rx="0.2"/>`;
          }).join('')}</g>
          ${flag(x, y, 0.6, 0.2, 6, 1.5, '#7f8fd6')}
          ${tree(x, y, -2.8, 1.8, 0.8, '#4a7a62', '#25443c')}${tree(x, y, 2.6, -2.4, 0.7, '#4a7a62', '#25443c')}`; })()}
      </g>
      <polyline class="twinkle" points="70.5,5 68.6,10 71.2,10.5 68,17" fill="none" stroke="#fff6a8" stroke-width="0.6" stroke-linejoin="round"/>
      <polyline class="twinkle t2" points="81.5,8 80,11.4 81.9,11.8 79.6,16" fill="none" stroke="#dff0ff" stroke-width="0.4" stroke-linejoin="round"/>

      <!-- ===== Tüftlerreich: Werkstatt, Mühle und Zahnrad ===== -->
      <g filter="url(#atDeep)">
        ${slab(...W.pro, 8, 8, 2.6, '#7fae5c', '#6ea24f', '#6a4a30', '#3a2718')}
        ${(() => { const [x, y] = W.pro; return `
          ${shade(x, y, 0.2, 0.4, 1.7)}
          ${box(x, y, -0.4, -0.4, 2.6, 2.2, 0, 1.9, '#a5764a', '#8a5f3a', '#5a3f26')}
          ${box(x, y, -0.4, -0.4, 2.9, 2.5, 1.9, 0.25, '#6b4728', '#54371e', '#3a2515')}
          ${cone(x, y, -0.4, -0.4, 1.5, 2.15, 1.3, '#8a5f3a', '#4b3020')}
          <g fill="#ffcf6b">${[[-1.1, 0.6], [0.3, 0.9]].map(([a, b]) => { const p = P(x, y, a, b, 0.9);
            return `<rect x="${(p[0] - 0.3).toFixed(2)}" y="${(p[1] - 0.5).toFixed(2)}" width="0.6" height="0.6"/>`; }).join('')}</g>
          ${box(x, y, 1.1, -1.4, 0.5, 0.5, 1.9, 1.6, '#7a5136', '#5f3d26', '#42291a')}
          ${box(x, y, -2.6, 1.4, 0.9, 0.9, 0, 2.2, '#c9b087', '#a8926c', '#6f5f45')}
          ${cone(x, y, -2.6, 1.4, 0.75, 2.2, 1.1, '#8a5a3a', '#57381f')}
          ${(() => { const c = P(x, y, -2.6, 1.4, 2.5); return `<g class="mill-blades" stroke="#5a3a1e" stroke-width="0.16" fill="rgba(245,238,215,0.94)">
            <path d="M${c[0].toFixed(2)} ${c[1].toFixed(2)} l0 -1.5 l0.5 0.12 l-0.35 1.38 Z"/>
            <path d="M${c[0].toFixed(2)} ${c[1].toFixed(2)} l1.5 0 l-0.12 0.5 l-1.38 -0.35 Z"/>
            <path d="M${c[0].toFixed(2)} ${c[1].toFixed(2)} l0 1.5 l-0.5 -0.12 l0.35 -1.38 Z"/>
            <path d="M${c[0].toFixed(2)} ${c[1].toFixed(2)} l-1.5 0 l0.12 -0.5 l1.38 0.35 Z"/></g>`; })()}
          ${(() => { const c = P(x, y, 2.4, 2.2, 0.4); return `<g class="mill-blades" fill="none" stroke="#d9a24e" stroke-width="0.24" stroke-linecap="round">
            <circle cx="${c[0].toFixed(2)}" cy="${c[1].toFixed(2)}" r="0.85"/>
            ${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4;
              return `<path d="M${(c[0] + Math.cos(a) * 0.85).toFixed(2)} ${(c[1] + Math.sin(a) * 0.85 * TILT).toFixed(2)} L${(c[0] + Math.cos(a) * 1.25).toFixed(2)} ${(c[1] + Math.sin(a) * 1.25 * TILT).toFixed(2)}"/>`; }).join('')}</g>`; })()}
          ${tree(x, y, 2.8, -2.6, 0.85)}${tree(x, y, -3, -2.2, 0.75)}`; })()}
      </g>

      <!-- ===== Uhrwerkstadt: Turmuhr über den Dächern ===== -->
      <g filter="url(#atDeep)">
        ${slab(...W.clock, 8, 8, 2.6, '#6f7488', '#656a7e', '#3e4258', '#242838')}
        ${(() => { const [x, y] = W.clock; return `
          ${shade(x, y, 0.3, 0.5, 1.8)}
          <!-- Der Turm: Schaft, Zifferblatt, Grünspandach -->
          ${box(x, y, -0.3, -0.3, 1.9, 1.9, 0, 3.4, '#525872', '#3d4258', '#2a2e40')}
          ${(() => { const c = P(x, y, -0.3, -0.3, 2.6); return `
            <circle cx="${c[0].toFixed(2)}" cy="${c[1].toFixed(2)}" r="0.95" fill="#8a6624"/>
            <circle cx="${c[0].toFixed(2)}" cy="${c[1].toFixed(2)}" r="0.78" fill="#ffdf9c"/>
            <line x1="${c[0].toFixed(2)}" y1="${c[1].toFixed(2)}" x2="${c[0].toFixed(2)}" y2="${(c[1] - 0.5).toFixed(2)}" stroke="#3a2a12" stroke-width="0.14"/>
            <line x1="${c[0].toFixed(2)}" y1="${c[1].toFixed(2)}" x2="${(c[0] + 0.42).toFixed(2)}" y2="${(c[1] + 0.2).toFixed(2)}" stroke="#3a2a12" stroke-width="0.12"/>`; })()}
          ${cone(x, y, -0.3, -0.3, 1.15, 3.4, 1.5, '#5ec9ac', '#2f7a68')}
          <!-- Dächer ringsum, Kupfer auf Stein -->
          ${box(x, y, 2.1, 0.6, 1.5, 1.5, 0, 1.5, '#4a4f66', '#373b4e', '#252838')}
          ${cone(x, y, 2.1, 0.6, 0.95, 1.5, 0.9, '#4fb59b', '#276b5c')}
          ${box(x, y, -2.4, 1.2, 1.3, 1.3, 0, 1.1, '#4a4f66', '#373b4e', '#252838')}
          ${cone(x, y, -2.4, 1.2, 0.85, 1.1, 0.8, '#4fb59b', '#276b5c')}
          ${box(x, y, 0.9, 2.6, 1.1, 1.1, 0, 0.9, '#4a4f66', '#373b4e', '#252838')}
          <!-- Gaslaternen als warme Punkte -->
          <g fill="#ffc46b">${[[-1.9, -1.9], [2.9, -1.4], [-0.6, 2.9]].map(([a, b]) => { const p = P(x, y, a, b, 0.7);
            return `<circle cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="0.22"/>`; }).join('')}</g>
          <!-- ein Zahnrad an der Flanke, das sich dreht -->
          ${(() => { const c = P(x, y, 3.1, -2.4, 0.5); return `<g class="mill-blades" fill="none" stroke="#d9a24e" stroke-width="0.2" stroke-linecap="round">
            <circle cx="${c[0].toFixed(2)}" cy="${c[1].toFixed(2)}" r="0.7"/>
            ${Array.from({ length: 8 }, (_, i) => { const a = i * Math.PI / 4;
              return `<path d="M${(c[0] + Math.cos(a) * 0.7).toFixed(2)} ${(c[1] + Math.sin(a) * 0.7 * TILT).toFixed(2)} L${(c[0] + Math.cos(a) * 1.05).toFixed(2)} ${(c[1] + Math.sin(a) * 1.05 * TILT).toFixed(2)}"/>`; }).join('')}</g>`; })()}`; })()}
      </g>

      <!-- ===== Märchenland: Burg auf grüner Scheibe ===== -->
      <g filter="url(#atDeep)">
        ${slab(...W.normal, 9, 9, 2.8, '#8ed36a', '#7cc25c', '#6a4a30', '#3a2718')}
        ${(() => { const [x, y] = W.normal; return `
          ${shade(x, y, 0.2, 0.3, 2)}
          ${box(x, y, -1.5, 0.4, 1.2, 1.2, 0, 3, '#f6f1e6', '#ddd5c6', '#9c9385')}
          ${cone(x, y, -1.5, 0.4, 0.9, 3, 1.8, '#e06a5a', '#8e3232')}
          ${box(x, y, 0.6, -0.9, 1.2, 1.2, 0, 2.6, '#f6f1e6', '#ddd5c6', '#9c9385')}
          ${cone(x, y, 0.6, -0.9, 0.9, 2.6, 1.6, '#e06a5a', '#8e3232')}
          ${box(x, y, -0.4, -0.2, 1.6, 1.6, 0, 4.2, '#f6f1e6', '#ddd5c6', '#9c9385')}
          ${cone(x, y, -0.4, -0.2, 1.2, 4.2, 2.3, '#e06a5a', '#8e3232')}
          ${box(x, y, 0.9, 1.2, 2.6, 0.5, 0, 1.2, '#efe9dc', '#d6cfc0', '#96907f')}
          <g fill="#ffd166">${[[-1.5, 0.4, 1.9], [0.6, -0.9, 1.6], [-0.4, -0.2, 2.9]].map(([a, b, z]) => {
            const p = P(x, y, a - 0.62, b + 0.62, z);
            return `<rect x="${(p[0] - 0.22).toFixed(2)}" y="${(p[1] - 0.5).toFixed(2)}" width="0.44" height="0.66" rx="0.2"/>`; }).join('')}</g>
          ${(() => { const p = P(x, y, 0.9, 1.4, 0); return `<rect x="${(p[0] - 0.28).toFixed(2)}" y="${(p[1] - 1.1).toFixed(2)}" width="0.56" height="1.1" rx="0.28" fill="#5a3a20"/>`; })()}
          ${flag(x, y, -0.4, -0.2, 6.5, 1.4, '#ff4f6d')}
          ${tree(x, y, -3.2, 2.4, 1)}${tree(x, y, 3.2, -2.6, 0.9)}${tree(x, y, 2.8, 2.8, 0.8)}${tree(x, y, -3.4, -1.4, 0.7)}
          ${box(x, y, 3, 0.6, 0.9, 0.9, 0, 0.8, '#e6dfd0', '#cfc7b6', '#8f8878')}
          ${cone(x, y, 3, 0.6, 0.8, 0.8, 0.7, '#c94a4a', '#7d2a2a')}`; })()}
      </g>

      <!-- ===== Schattenreich: finstere Feste ===== -->
      <g>
        <circle cx="${W.shadow[0]}" cy="${W.shadow[1] + 2}" r="15" fill="url(#atMagic)"/>
        <g filter="url(#atDeep)">
          ${slab(...W.shadow, 8, 8, 2.8, '#3f3459', '#362c4e', '#2a2140', '#120d24')}
          ${(() => { const [x, y] = W.shadow; return `
            ${shade(x, y, 0.2, 0.3, 1.8)}
            ${box(x, y, -1.5, 0.3, 1.2, 1.2, 0, 2.8, '#332a52', '#251e3e', '#150f2a')}
            ${cone(x, y, -1.5, 0.3, 0.9, 2.8, 2, '#241a3c', '#0f0a20')}
            ${box(x, y, 0.7, -0.9, 1.2, 1.2, 0, 2.4, '#332a52', '#251e3e', '#150f2a')}
            ${cone(x, y, 0.7, -0.9, 0.9, 2.4, 1.8, '#241a3c', '#0f0a20')}
            ${box(x, y, -0.4, -0.2, 1.7, 1.7, 0, 4, '#3a3060', '#2a2246', '#17102e')}
            ${cone(x, y, -0.4, -0.2, 1.25, 4, 2.6, '#241a3c', '#0f0a20')}
            <g fill="#c58bff">${[[-1.5, 0.3, 1.8], [0.7, -0.9, 1.5], [-0.4, -0.2, 2.7]].map(([a, b, z]) => {
              const p = P(x, y, a - 0.62, b + 0.62, z);
              return `<rect x="${(p[0] - 0.2).toFixed(2)}" y="${(p[1] - 0.5).toFixed(2)}" width="0.4" height="0.62" rx="0.2"/>`; }).join('')}</g>
            ${(() => { const p = P(x, y, -0.4, 0.9, 0); return `<rect x="${(p[0] - 0.3).toFixed(2)}" y="${(p[1] - 1.2).toFixed(2)}" width="0.6" height="1.2" rx="0.3" fill="#a86bff"/>`; })()}
            ${flag(x, y, -0.4, -0.2, 6.6, 1.3, '#8a3bff')}
            <g stroke="#2c2444" stroke-width="0.2" fill="none" stroke-linecap="round">
              ${[[-3, 2.2], [3, -2.4]].map(([a, b]) => { const f = P(x, y, a, b, 0), t = P(x, y, a, b, 1.4), l = P(x, y, a - 0.5, b, 1.1), r = P(x, y, a + 0.5, b, 1);
                return `<path d="M${f[0].toFixed(2)} ${f[1].toFixed(2)} L${t[0].toFixed(2)} ${t[1].toFixed(2)} M${t[0].toFixed(2)} ${(t[1] + 0.3).toFixed(2)} L${l[0].toFixed(2)} ${l[1].toFixed(2)} M${t[0].toFixed(2)} ${(t[1] + 0.5).toFixed(2)} L${r[0].toFixed(2)} ${r[1].toFixed(2)}"/>`; }).join('')}</g>
            ${[[2.6, 2.4], [-2.8, -2.2]].map(([a, b]) => cone(x, y, a, b, 0.34, 0, 1.1, '#a86bff', '#5a1fb0')).join('')}`; })()}
        </g>
        <g class="particles">
          <circle class="p" cx="${W.shadow[0] - 6}" cy="${W.shadow[1] + 6}" r="0.45" fill="#c58bff"/>
          <circle class="p p3" cx="${W.shadow[0] + 6}" cy="${W.shadow[1] + 7}" r="0.38" fill="#c58bff"/></g>
      </g>

      <!-- ===== Meereswelt: Wasserfläche mit Leuchtturm ===== -->
      <g filter="url(#atDeep)">
        ${slab(...W.sea, 9, 9, 2.4, '#3fa8d8', '#48b6e4', '#6a4a30', '#3a2718', 'rgba(255,255,255,0.45)')}
        ${(() => { const [x, y] = W.sea; return `
          <g stroke="rgba(255,255,255,0.5)" stroke-width="0.16" fill="none">
            ${[[-2.5, 1], [-1, 2.4], [1.4, -1.6]].map(([a, b]) => { const p = P(x, y, a, b, 0.02);
              return `<path d="M${(p[0] - 1.4).toFixed(2)} ${p[1].toFixed(2)} q0.7 -0.35 1.4 0 t1.4 0"/>`; }).join('')}</g>
          ${(() => { const p = P(x, y, 1.8, 1.6, 0); return `<ellipse cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" rx="1.15" ry="0.5" fill="#8a7864"/>`; })()}
          ${box(x, y, 1.8, 1.6, 0.7, 0.7, 0, 2.4, '#f6f2e8', '#e0dacc', '#a29b8c')}
          ${(() => { const p = P(x, y, 1.8, 1.6, 1.5); return `<rect x="${(p[0] - 0.5).toFixed(2)}" y="${(p[1] - 0.3).toFixed(2)}" width="1" height="0.36" fill="#d93b3b"/>`; })()}
          ${cone(x, y, 1.8, 1.6, 0.55, 2.4, 0.8, '#e0483c', '#8e2323')}
          ${(() => { const p = P(x, y, 1.8, 1.6, 2.3); return `<circle class="art-window" cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" r="0.3" fill="#ffe98a"/>`; })()}
          ${(() => { const h = P(x, y, -1.6, -0.4, 0), m = P(x, y, -1.6, -0.4, 2.2); return `
            <path d="M${(h[0] - 1).toFixed(2)} ${h[1].toFixed(2)} l2 0 l-0.4 -0.6 l-1.2 0 Z" fill="#7a5432"/>
            <line x1="${h[0].toFixed(2)}" y1="${(h[1] - 0.6).toFixed(2)}" x2="${m[0].toFixed(2)}" y2="${m[1].toFixed(2)}" stroke="#4a3320" stroke-width="0.14"/>
            <path d="M${m[0].toFixed(2)} ${m[1].toFixed(2)} l1.5 0.9 l-1.5 0.7 Z" fill="#f6f2e8"/>`; })()}
          ${[[-2.8, 2.6], [2.8, -2.4]].map(([a, b]) => { const p = P(x, y, a, b, 0);
            return `<ellipse cx="${p[0].toFixed(2)}" cy="${p[1].toFixed(2)}" rx="0.7" ry="0.3" fill="#6a5a4a"/>`; }).join('')}`; })()}
      </g>

      <!-- ===== Dschungeltempel: Stufenpyramide im Grün ===== -->
      <g filter="url(#atDeep)">
        ${slab(...W.jungle, 9, 9, 2.6, '#4f9c46', '#458c3f', '#6a4a30', '#33240f')}
        ${(() => { const [x, y] = W.jungle; return `
          ${shade(x, y, 0.3, 0.3, 2)}
          ${box(x, y, 0, 0, 3.4, 3.4, 0, 0.7, '#d8c8a2', '#b8a780', '#7e7052')}
          ${box(x, y, 0, 0, 2.5, 2.5, 0.7, 0.7, '#d8c8a2', '#b8a780', '#7e7052')}
          ${box(x, y, 0, 0, 1.7, 1.7, 1.4, 0.7, '#d8c8a2', '#b8a780', '#7e7052')}
          ${box(x, y, 0, 0, 1, 1, 2.1, 0.6, '#e0d2b0', '#c2b18a', '#867858')}
          ${(() => { const p = P(x, y, 0.35, 1.7, 0); return `<rect x="${(p[0] - 0.3).toFixed(2)}" y="${(p[1] - 1.2).toFixed(2)}" width="0.6" height="1.2" fill="#241f16"/>`; })()}
          ${(() => { const p = P(x, y, 0, 0, 2.7); return `<rect x="${(p[0] - 0.22).toFixed(2)}" y="${(p[1] - 0.4).toFixed(2)}" width="0.44" height="0.4" fill="#ffd166"/>`; })()}
          ${tree(x, y, -3, 1.6, 1, '#5fbe52', '#26662c')}${tree(x, y, 3, -1.4, 0.95, '#5fbe52', '#26662c')}
          ${tree(x, y, -1.8, 3.2, 0.85, '#5fbe52', '#26662c')}${tree(x, y, 3.2, 2.6, 0.8, '#5fbe52', '#26662c')}
          ${box(x, y, -3.2, -2.6, 0.5, 0.5, 0, 1.3, '#9a8f72', '#7e7359', '#57503c')}
          ${(() => { const p = P(x, y, -3.2, -2.6, 1.3); return `<g fill="#2f2a20"><circle cx="${(p[0] - 0.18).toFixed(2)}" cy="${(p[1] - 0.42).toFixed(2)}" r="0.1"/><circle cx="${(p[0] + 0.18).toFixed(2)}" cy="${(p[1] - 0.42).toFixed(2)}" r="0.1"/></g>`; })()}`; })()}
      </g>

      <g>${motes.join('')}</g>
      <g filter="url(#atNear)" opacity="0.2">
        <g class="drift"><ellipse cx="46" cy="38" rx="14" ry="1" fill="#dceafa"/></g>
        <g class="drift d2"><ellipse cx="72" cy="30" rx="11" ry="0.8" fill="#c8d8f0"/></g></g>
      <rect width="100" height="62" fill="url(#atVig)"/>
    </svg>`;
  }
  return { spots, svg };
})();
