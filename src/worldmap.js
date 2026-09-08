/* Weltkarte: die Übersicht über alle Welten. Jede Welt schwebt als eigene Insel im Himmel – links das
   helle Märchenland, rechts das nächtliche Schattenreich. In der Mitte liegt auf einem Sockel ein
   goldener Ball, von dem goldene Wege zu allen Inseln führen. Jede Welt ist von Anfang an anwählbar.

   Für die Tiefe sorgt durchgehend dieselbe Lichtannahme: die Sonne steht links oben. Jede Fläche hat
   deshalb eine helle und eine abgewandte Seite, unter dem Gras liegt eine Erdkante, der Fels darunter
   bekommt Schichten und Zacken, und alles wirft einen Schatten. Weiter hinten liegende Inseln
   verblassen leicht im Dunst.

   Die Orte liegen in Prozent der Kartenfläche (spots), die Zeichnung nutzt denselben Maßstab
   (viewBox 100 × 66, preserveAspectRatio="none"), damit Marke und Untergrund exakt zusammenpassen. */
const WorldMap = (() => {
  /* x, y in Prozent der Karte; icon = Zeichen der Marke, col = Farbe des Rings */
  const spots = {
    normal: { x: 20, y: 40, icon: '🏰', col: '#ffd166' },
    pro: { x: 18, y: 66, icon: '⚙️', col: '#e0a05a' },
    sea: { x: 26, y: 89, icon: '🌊', col: '#7fd8ff' },
    jungle: { x: 58, y: 89, icon: '🗿', col: '#9ee06f' },
    storm: { x: 80, y: 36, icon: '⛈️', col: '#8fb8ff' },
    shadow: { x: 84, y: 66, icon: '🔮', col: '#c58bff' },
  };

  /* Schwebende Insel in drei Lagen: Grasdecke, Erdkante, Felskörper mit Zacken.
     top/soil/rock sind Füllungen, dark die abgewandte Seite. */
  function isle(cx, cy, rx, depth, top, soil, rock, dark, flat = 0.26) {
    const ry = rx * flat, tip = cx + rx * 0.06;
    const spur = (x, y, w, h) => `<path d="M ${x - w} ${y} Q ${x} ${y + h * 0.55} ${x + w * 0.2} ${y + h} Q ${x + w * 0.5} ${y + h * 0.5} ${x + w} ${y} Z" fill="${dark}" opacity="0.85"/>`;
    return `<g>
      <!-- Felskörper: helle Flanke links, abgewandte Seite rechts -->
      <path d="M ${cx - rx} ${cy} Q ${cx - rx * 0.92} ${cy + depth * 0.5} ${cx - rx * 0.22} ${cy + depth * 0.84}
               L ${tip} ${cy + depth} Q ${cx + rx * 0.78} ${cy + depth * 0.44} ${cx + rx} ${cy} Z" fill="${rock}"/>
      <path d="M ${cx + rx * 0.06} ${cy + ry * 0.5} Q ${cx + rx * 0.5} ${cy + depth * 0.5} ${tip} ${cy + depth}
               Q ${cx + rx * 0.82} ${cy + depth * 0.4} ${cx + rx} ${cy} Z" fill="${dark}" opacity="0.55"/>
      <!-- Gesteinsschichten -->
      <g stroke="rgba(0,0,0,0.16)" stroke-width="0.22" fill="none">
        <path d="M ${cx - rx * 0.82} ${cy + depth * 0.26} q ${rx * 0.8} ${depth * 0.12} ${rx * 1.6} ${-depth * 0.02}"/>
        <path d="M ${cx - rx * 0.6} ${cy + depth * 0.5} q ${rx * 0.6} ${depth * 0.12} ${rx * 1.15} ${-depth * 0.04}"/></g>
      ${spur(cx - rx * 0.66, cy + depth * 0.34, rx * 0.13, depth * 0.36)}
      ${spur(cx + rx * 0.52, cy + depth * 0.3, rx * 0.12, depth * 0.3)}
      <!-- Erdkante unter dem Gras: sie gibt der Decke ihre Dicke -->
      <ellipse cx="${cx}" cy="${cy + ry * 0.42}" rx="${rx * 0.985}" ry="${ry}" fill="${soil}"/>
      <ellipse cx="${cx}" cy="${cy + ry * 0.42}" rx="${rx * 0.985}" ry="${ry}" fill="rgba(0,0,0,0.25)"
        style="clip-path:none" opacity="0.35"/>
      <!-- Kontaktschatten: dort, wo die Decke auf dem Fels aufliegt -->
      <ellipse cx="${cx}" cy="${cy + ry * 0.75}" rx="${rx * 0.92}" ry="${ry * 0.7}" fill="rgba(0,0,0,0.3)" filter="url(#atSoft)"/>
      <!-- Grasdecke, von links oben beleuchtet -->
      <ellipse cx="${cx}" cy="${cy}" rx="${rx}" ry="${ry}" fill="${top}"/>
      <ellipse cx="${cx - rx * 0.3}" cy="${cy - ry * 0.3}" rx="${rx * 0.5}" ry="${ry * 0.5}" fill="rgba(255,248,210,0.18)" filter="url(#atSoft)"/>
      <path d="M ${cx - rx * 0.95} ${cy - ry * 0.1} a ${rx} ${ry} 0 0 1 ${rx * 1.25} ${-ry * 0.82}" fill="none" stroke="rgba(255,246,205,0.55)" stroke-width="0.32"/>
      <path d="M ${cx - rx} ${cy} a ${rx} ${ry} 0 0 0 ${rx * 2} 0" fill="none" stroke="rgba(0,0,0,0.3)" stroke-width="0.4"/>
    </g>`;
  }
  /* Schatten, den ein Gebäude auf den Boden wirft (Licht von links oben) */
  const cast = (x, y, rx, ry = rx * 0.32) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="rgba(0,0,0,0.3)"/>`;
  /* kleiner Brocken, der frei unter einer Insel schwebt */
  const chip = (x, y, s, rock, dark) =>
    `<g><path d="M ${x - s} ${y} Q ${x - s * 0.5} ${y + s * 1.5} ${x + s * 0.1} ${y + s * 1.9} Q ${x + s * 0.8} ${y + s} ${x + s} ${y} Z" fill="${rock}"/>
      <path d="M ${x + s * 0.1} ${y} Q ${x + s * 0.5} ${y + s} ${x + s * 0.1} ${y + s * 1.9} Q ${x + s * 0.85} ${y + s} ${x + s} ${y} Z" fill="${dark}" opacity="0.6"/>
      <ellipse cx="${x}" cy="${y}" rx="${s}" ry="${s * 0.3}" fill="${rock}" opacity="0.9"/></g>`;
  const fall = (x, y, w, h, col = '#cfeeff') =>
    `<g><path d="M ${x - w / 2} ${y} q ${w * 0.15} ${h * 0.5} ${-w * 0.12} ${h} l ${w * 1.24} 0 q ${-w * 0.27} ${-h * 0.5} ${-w * 0.12} ${-h} Z" fill="${col}" opacity="0.7"/>
      <path d="M ${x - w * 0.12} ${y} q ${w * 0.08} ${h * 0.5} ${-w * 0.05} ${h * 0.96}" stroke="rgba(255,255,255,0.75)" stroke-width="${w * 0.22}" fill="none"/>
      <ellipse cx="${x}" cy="${y}" rx="${w * 0.75}" ry="${w * 0.28}" fill="${col}" opacity="0.85"/></g>`;
  const tree = (x, y, s, col = '#3f8f47', dark = '#255f30', lit = '#6cbc63') =>
    `<g>${cast(x + s * 0.5, y + s * 0.12, s * 1.05, s * 0.3)}
      <g class="sway"><path d="M ${x - s} ${y} L ${x} ${y - s * 2.3} L ${x + s} ${y} Z" fill="${col}"/>
        <path d="M ${x - s} ${y} L ${x} ${y - s * 2.3} L ${x} ${y} Z" fill="${lit}" opacity="0.55"/>
        <path d="M ${x + s * 0.15} ${y} L ${x} ${y - s * 2.3} L ${x + s} ${y} Z" fill="${dark}" opacity="0.7"/></g></g>`;

  /* par: 'none' für die Karte selbst (Prozent = Koordinate), 'xMidYMid slice' für den Knopf im Titelbild */
  function svg(cls = 'atlas-bg', par = 'none') {
    const clouds = [];
    for (let i = 0; i < 9; i++) {
      const x = 4 + ((i * 37) % 92), y = 6 + ((i * 23) % 44), s = 3 + ((i * 5) % 4);
      clouds.push(`<g class="drift ${i % 2 ? 'd2' : ''}" opacity="${0.1 + (i % 3) * 0.05}">
        <ellipse cx="${x}" cy="${y}" rx="${s * 2.2}" ry="${s * 0.7}" fill="#fff"/>
        <ellipse cx="${x - s}" cy="${y + 0.4}" rx="${s * 1.2}" ry="${s * 0.5}" fill="#fff"/>
        <ellipse cx="${x + s * 1.1}" cy="${y + 0.5}" rx="${s * 1.1}" ry="${s * 0.45}" fill="#fff"/></g>`);
    }
    const stars = [];
    for (let i = 0; i < 26; i++) {
      const x = 58 + ((i * 43) % 41), y = 2 + ((i * 17) % 30), r = 0.16 + ((i * 7) % 3) * 0.12;
      stars.push(`<circle class="twinkle ${i % 3 ? 't' + (i % 3 + 1) : ''}" cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.4 + (i % 4) * 0.15}"/>`);
    }
    const ways = [[26, 24], [24, 42], [34, 51], [56, 50], [73, 24], [75, 40]]
      .map(([x, y]) => `M 50 33 Q ${(50 + x) / 2} ${(33 + y) / 2 - 2.5} ${x} ${y}`).join(' ');

    return `<svg class="${cls}" viewBox="0 0 100 66" preserveAspectRatio="${par}" aria-hidden="true">
      <defs>
        <linearGradient id="atSky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#26599f"/><stop offset="0.32" stop-color="#4e94d6"/>
          <stop offset="0.66" stop-color="#8cc4e8"/><stop offset="1" stop-color="#6ea4c8"/></linearGradient>
        <linearGradient id="atDusk" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0.4" stop-color="rgba(24,14,48,0)"/><stop offset="0.72" stop-color="rgba(30,16,58,0.55)"/>
          <stop offset="1" stop-color="rgba(14,7,30,0.92)"/></linearGradient>
        <linearGradient id="atFar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(120,168,150,0.5)"/><stop offset="1" stop-color="rgba(38,84,72,0.8)"/></linearGradient>
        <!-- Fels: helle Kante oben, satter Kern, dunkler Fuß -->
        <linearGradient id="atRock" x1="0.15" y1="0" x2="0.75" y2="1">
          <stop offset="0" stop-color="#a3805c"/><stop offset="0.3" stop-color="#7a5a3c"/>
          <stop offset="0.7" stop-color="#4c3626"/><stop offset="1" stop-color="#2a1c14"/></linearGradient>
        <linearGradient id="atRockD" x1="0.15" y1="0" x2="0.75" y2="1">
          <stop offset="0" stop-color="#514a72"/><stop offset="0.35" stop-color="#332d52"/>
          <stop offset="1" stop-color="#100c22"/></linearGradient>
        <linearGradient id="atSoil" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#8e6a44"/><stop offset="1" stop-color="#5a3f28"/></linearGradient>
        <linearGradient id="atSoilD" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="#463c62"/><stop offset="1" stop-color="#241d3e"/></linearGradient>
        <!-- Grasdecke: Licht von links oben -->
        <radialGradient id="atGrass" cx="0.34" cy="0.28" r="0.85">
          <stop offset="0" stop-color="#a6e07a"/><stop offset="0.5" stop-color="#6fb857"/><stop offset="1" stop-color="#3d7a3c"/></radialGradient>
        <radialGradient id="atGrassJ" cx="0.34" cy="0.28" r="0.85">
          <stop offset="0" stop-color="#79c95f"/><stop offset="0.5" stop-color="#468f3f"/><stop offset="1" stop-color="#255c2c"/></radialGradient>
        <radialGradient id="atGrassS" cx="0.34" cy="0.28" r="0.85">
          <stop offset="0" stop-color="#5d7f78"/><stop offset="0.5" stop-color="#3b5a56"/><stop offset="1" stop-color="#1e3336"/></radialGradient>
        <radialGradient id="atGrassX" cx="0.34" cy="0.28" r="0.85">
          <stop offset="0" stop-color="#584a76"/><stop offset="0.5" stop-color="#392f56"/><stop offset="1" stop-color="#1d1636"/></radialGradient>
        <radialGradient id="atWater" cx="0.36" cy="0.3" r="0.85">
          <stop offset="0" stop-color="#8fe0f6"/><stop offset="0.45" stop-color="#41a5d8"/><stop offset="1" stop-color="#155c92"/></radialGradient>
        <!-- Baustoffe -->
        <linearGradient id="atWall" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#f6f1e6"/><stop offset="0.45" stop-color="#ddd5c6"/><stop offset="1" stop-color="#9c9385"/></linearGradient>
        <linearGradient id="atRoof" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#e06a5a"/><stop offset="0.4" stop-color="#c94a4a"/><stop offset="1" stop-color="#7d2a2a"/></linearGradient>
        <linearGradient id="atWood" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#a5764a"/><stop offset="0.45" stop-color="#8a5f3a"/><stop offset="1" stop-color="#553a24"/></linearGradient>
        <linearGradient id="atWood2" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#a5764a"/><stop offset="0.45" stop-color="#8a5f3a"/><stop offset="1" stop-color="#553a24"/></linearGradient>
        <linearGradient id="atDark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#3c4470"/><stop offset="0.45" stop-color="#262c52"/><stop offset="1" stop-color="#12142c"/></linearGradient>
        <linearGradient id="atVoid" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#33245c"/><stop offset="0.45" stop-color="#1f1440"/><stop offset="1" stop-color="#0c0720"/></linearGradient>
        <linearGradient id="atStone" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#d8c8a2"/><stop offset="0.45" stop-color="#b8a780"/><stop offset="1" stop-color="#7e7052"/></linearGradient>
        <radialGradient id="atBall" cx="0.34" cy="0.3" r="0.78">
          <stop offset="0" stop-color="#fffdf0"/><stop offset="0.35" stop-color="#ffdf7a"/>
          <stop offset="0.75" stop-color="#e0a52a"/><stop offset="1" stop-color="#8a5c10"/></radialGradient>
        <radialGradient id="atGlow" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="rgba(255,224,138,0.8)"/><stop offset="1" stop-color="rgba(255,224,138,0)"/></radialGradient>
        <radialGradient id="atMagic" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stop-color="rgba(170,100,255,0.55)"/><stop offset="1" stop-color="rgba(170,100,255,0)"/></radialGradient>
        <linearGradient id="atHaze" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="rgba(150,190,230,0.2)"/><stop offset="0.45" stop-color="rgba(150,190,230,0.08)"/>
          <stop offset="0.75" stop-color="rgba(150,190,230,0)"/></linearGradient>
        <radialGradient id="atVig" cx="0.5" cy="0.5" r="0.74">
          <stop offset="0.55" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.5)"/></radialGradient>
        <filter id="atShade" x="-40%" y="-40%" width="180%" height="200%">
          <feDropShadow dx="0.5" dy="0.7" stdDeviation="0.45" flood-color="#0a0812" flood-opacity="0.5"/></filter>
        <filter id="atDof" x="-15%" y="-15%" width="130%" height="130%">
          <feGaussianBlur stdDeviation="0.3"/></filter>
        <filter id="atSoft" x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="0.9"/></filter>
        <filter id="atDeep" x="-30%" y="-30%" width="160%" height="180%">
          <feDropShadow dx="1.2" dy="2" stdDeviation="1.1" flood-color="#0a0818" flood-opacity="0.55"/></filter>
      </defs>

      <rect width="100" height="66" fill="url(#atSky)"/>
      ${stars.join('')}
      <circle cx="14" cy="8" r="11" fill="url(#atGlow)"/>
      <g filter="url(#atSoft)">${clouds.join('')}</g>
      <!-- ferne Landschaft tief unter den Inseln, weich gezeichnet -->
      <g filter="url(#atSoft)" opacity="0.9">
        <path d="M0 48 q10 -7 20 -2 q12 6 22 0 q12 -7 24 -1 q14 7 24 -1 q6 -5 10 -1 L100 66 L0 66 Z" fill="url(#atFar)"/>
        <path d="M0 56 q14 -5 26 -1 q14 5 26 0 q14 -5 26 0 q12 4 22 -1 L100 66 L0 66 Z" fill="rgba(22,54,48,0.55)"/></g>
      <rect width="100" height="66" fill="url(#atDusk)"/>

      <!-- goldene Wege, sie laufen unter den Inseln durch -->
      <path d="${ways}" fill="none" stroke="rgba(18,12,36,0.4)" stroke-width="1.1" stroke-linecap="round" stroke-dasharray="1.6 2.6"/>
      <path d="${ways}" fill="none" stroke="rgba(255,240,180,0.95)" stroke-width="0.62" stroke-linecap="round" stroke-dasharray="1.6 2.6"/>

      <!-- ============ Sturmhimmel (am weitesten hinten) ============ -->
      <g opacity="0.95" transform="translate(11.34 2.66) scale(0.86)" filter="url(#atDof)">
        <g opacity="0.6">
          <path d="M87.6 10.4 Q93 8.6 98.4 10.4 Q97 17 94.6 21 Q93.4 23.4 92.6 25.4 Q91.6 23 90.6 20.4 Q88.6 16.4 87.6 10.4 Z"
            fill="rgba(190,208,240,0.3)" filter="url(#atSoft)"/>
          <g stroke="rgba(226,238,255,0.75)" stroke-width="0.32" fill="none" stroke-linecap="round">
            <path d="M88.2 11 q5.2 -2.2 9.6 0"/><path d="M89 13.6 q4 -1.8 7.6 0"/>
            <path d="M89.9 16.4 q3.1 -1.5 5.8 0"/><path d="M90.9 19.2 q2.1 -1.1 3.8 0"/>
            <path d="M91.8 21.9 q1.2 -0.7 2.1 0"/></g></g>
        <g filter="url(#atDeep)">${isle(81, 19, 12, 8, 'url(#atGrassS)', 'url(#atSoilD)', 'url(#atRockD)', '#0a0818', 0.17)}</g>
        ${chip(70.5, 24.6, 1.5, 'url(#atRockD)', '#0a0818')}${chip(90.8, 26.4, 1.2, 'url(#atRockD)', '#0a0818')}
        <g filter="url(#atShade)">
          ${cast(81.4, 18.9, 6.2, 1.7)}
          <g fill="url(#atDark)">
            <rect x="76.6" y="12.6" width="2.2" height="6.2"/><rect x="82.4" y="12.2" width="2.2" height="6.6"/>
            <rect x="79" y="9.8" width="3.2" height="9"/></g>
          <path d="M76.2 12.6 L77.7 9 L79.2 12.6 Z M82 12.2 L83.5 8.4 L85 12.2 Z M78.6 9.8 L80.6 5.4 L82.6 9.8 Z" fill="#171b3e"/>
          <path d="M77.7 9 L79.2 12.6 L77.7 12.6 Z M83.5 8.4 L85 12.2 L83.5 12.2 Z M80.6 5.4 L82.6 9.8 L80.6 9.8 Z" fill="#0d1029" opacity="0.8"/>
          <g fill="#8fd8ff" opacity="0.95"><rect x="77.2" y="14.4" width="0.7" height="1"/><rect x="83" y="14" width="0.7" height="1"/><rect x="80.2" y="11.8" width="0.9" height="1.3"/></g>
        </g>
        <polyline class="twinkle" points="88.4,6.6 86.4,10.6 89,11 85.8,16.4" fill="none" stroke="#fff6a8" stroke-width="0.7" stroke-linejoin="round"/>
        <polyline class="twinkle t2" points="73.4,8.6 71.9,11.6 73.8,11.9 71.6,15.6" fill="none" stroke="#dff0ff" stroke-width="0.45" stroke-linejoin="round"/>
        <ellipse cx="82" cy="16" rx="22" ry="14" fill="rgba(150,180,220,0.1)" filter="url(#atSoft)"/>
      </g>

      <!-- ============ Märchenland (oben links) ============ -->
      <g transform="translate(1.44 1.56) scale(0.92)">
        <g opacity="0.55">
          <path d="M4 15 a 15 15 0 0 1 24 -3" fill="none" stroke="#ff8098" stroke-width="0.7"/>
          <path d="M4.6 16.2 a 15 15 0 0 1 23.2 -3" fill="none" stroke="#ffd678" stroke-width="0.7"/>
          <path d="M5.2 17.4 a 15 15 0 0 1 22.4 -3" fill="none" stroke="#8cdc96" stroke-width="0.7"/></g>
        <g filter="url(#atDeep)">${isle(18, 19.5, 13, 9, 'url(#atGrass)', 'url(#atSoil)', 'url(#atRock)', '#241a12', 0.19)}</g>
        ${chip(8.6, 25.4, 1.4, 'url(#atRock)', '#241a12')}${chip(28.2, 24.6, 1.1, 'url(#atRock)', '#241a12')}
        ${fall(11.2, 20.1, 1.8, 8)}
        <g filter="url(#atShade)">
          ${cast(18.6, 19.4, 6.4, 1.8)}
          <g fill="url(#atWall)">
            <rect x="13.4" y="12.10" width="2.1" height="7.2"/><rect x="18.8" y="11.70" width="2.1" height="7.6"/>
            <rect x="15.6" y="9.10" width="3" height="10.2"/><rect x="16.9" y="15.90" width="4.6" height="3.4"/></g>
          <path d="M13 12.1 L14.45 8.9 L15.9 12.1 Z M18.4 11.7 L19.85 8.3 L21.3 11.7 Z M15.1 9.1 L17.1 5.1 L19.1 9.1 Z" fill="url(#atRoof)"/>
          <path d="M14.45 8.9 L15.9 12.1 L14.45 12.1 Z M19.85 8.3 L21.3 11.7 L19.85 11.7 Z M17.1 5.1 L19.1 9.1 L17.1 9.1 Z" fill="#7d2a2a" opacity="0.75"/>
          <g fill="#ffd166"><rect x="14.1" y="13.90" width="0.7" height="1"/><rect x="19.5" y="13.50" width="0.7" height="1"/><rect x="16.7" y="11.10" width="0.8" height="1.2"/>
            <rect x="18.6" y="16.90" width="1.1" height="2.4" fill="#8a5a30"/></g>
          <rect x="17" y="3.10" width="0.24" height="2.2" fill="#4a3a2a"/>
          <path class="art-flag" d="M17.24 3.1 L19.4 3.8 L17.24 4.5 Z" fill="#ff4f6d"/>
        </g>
        <g filter="url(#atShade)">
          <rect x="23.2" y="15.90" width="2.4" height="3.4" fill="url(#atWood2)"/>
          <path d="M22.7 15.9 L24.4 13.7 L26.1 15.9 Z" fill="#8a5a3a"/>
          <path d="M24.4 13.7 L26.1 15.9 L24.4 15.9 Z" fill="#5a3a24" opacity="0.8"/>
          <g class="mill-blades">
            <path d="M24.4 14.7 L24.4 11.9 M24.4 14.7 L27.2 14.7 M24.4 14.7 L24.4 17.5 M24.4 14.7 L21.6 14.7" stroke="#5a3a1e" stroke-width="0.28"/>
            <path d="M24.55 12.1 L25.3 12.3 L24.55 14.5 Z M27 14.85 L26.8 15.6 L24.6 14.85 Z M24.25 17.3 L23.5 17.1 L24.25 14.9 Z M21.8 14.55 L22 13.8 L24.2 14.55 Z" fill="rgba(245,238,215,0.94)"/></g>
        </g>
        ${tree(9.8, 19.3, 1.2)}${tree(27.2, 18.9, 1.05)}${tree(12.4, 20.9, 0.85)}
      </g>

      <!-- Dunst und Wolken zwischen den Ebenen – sie trennen hinten von vorne -->
      <rect width="100" height="40" fill="url(#atHaze)"/>
      <g filter="url(#atSoft)" opacity="0.32">
        <g class="drift"><ellipse cx="34" cy="30" rx="13" ry="2.2" fill="#dbeaf8"/><ellipse cx="28" cy="31" rx="7" ry="1.5" fill="#dbeaf8"/></g>
        <g class="drift d2"><ellipse cx="72" cy="33" rx="11" ry="2" fill="#cfe0f2"/><ellipse cx="79" cy="34" rx="6" ry="1.3" fill="#cfe0f2"/></g>
      </g>

      <!-- ============ Schattenreich (rechts) ============ -->
      <g transform="translate(-4.25 -2.15) scale(1.05)">
        <circle cx="86" cy="42" r="16" fill="url(#atMagic)"/>
        <g filter="url(#atDeep)">${isle(85, 43, 13, 11.5, 'url(#atGrassX)', 'url(#atSoilD)', 'url(#atRockD)', '#0a0716', 0.31)}</g>
        ${chip(75.4, 49.6, 1.4, 'url(#atRockD)', '#0a0716')}${chip(94.4, 50.4, 1.2, 'url(#atRockD)', '#0a0716')}
        <g filter="url(#atShade)">
          ${cast(85.4, 42.9, 6.6, 1.8)}
          <g fill="url(#atVoid)">
            <rect x="80.4" y="36" width="2.4" height="7"/><rect x="87" y="35.6" width="2.4" height="7.4"/>
            <rect x="83.2" y="33" width="3.6" height="10"/></g>
          <path d="M80 36 L81.6 32 L83.2 36 Z M86.6 35.6 L88.2 31.4 L89.8 35.6 Z M82.8 33 L85 28.2 L87.2 33 Z" fill="#1a1130"/>
          <path d="M81.6 32 L83.2 36 L81.6 36 Z M88.2 31.4 L89.8 35.6 L88.2 35.6 Z M85 28.2 L87.2 33 L85 33 Z" fill="#0c0820" opacity="0.85"/>
          <path d="M84.2 39 q0.8 -1.7 1.6 0 v4 h-1.6 Z" fill="#a86bff"/>
          <path d="M84.2 39 q0.8 -1.7 1.6 0 v4 h-1.6 Z" fill="url(#atGlow)" opacity="0.5"/>
          <g fill="#c58bff" opacity="0.95"><rect x="81.1" y="37.6" width="0.7" height="1"/><rect x="87.7" y="37.2" width="0.7" height="1"/></g>
          <path d="M85 27.4 L85 24.6" stroke="#4a3a6a" stroke-width="0.3"/>
          <path class="art-flag" d="M85.1 24.6 L87.2 25.3 L85.1 26 Z" fill="#8a3bff"/>
        </g>
        <g stroke="#2c2444" stroke-width="0.42" fill="none" stroke-linecap="round">
          <path d="M77.6 42.8 L77.6 38.6 M77.6 40.4 L76 39 M77.6 39.6 L79.3 38.2"/>
          <path d="M92.4 43.2 L92.4 39.4 M92.4 41.2 L91 40 M92.4 40.4 L93.9 39.2"/></g>
        <g><path d="M79.6 43.4 l0.95 -2.6 l0.95 2.6 Z" fill="#8a3bff" opacity="0.85"/>
          <path d="M80.55 40.8 l0.95 2.6 l-0.95 0 Z" fill="#5a1fb0" opacity="0.9"/>
          <path d="M90 43.6 l0.85 -2.2 l0.85 2.2 Z" fill="#8a3bff" opacity="0.85"/></g>
        <g class="particles"><circle class="p" cx="80" cy="45" r="0.5" fill="#c58bff"/>
          <circle class="p p3" cx="90.5" cy="45.5" r="0.42" fill="#c58bff"/>
          <circle class="p p2" cx="85.5" cy="46" r="0.34" fill="#e0b8ff"/></g>
      </g>

      <!-- ============ Tüftlerreich (links) ============ -->
      <g transform="translate(-0.60 0.60) scale(1.04)">
        <g filter="url(#atDeep)">${isle(15, 42, 12, 11, 'url(#atGrass)', 'url(#atSoil)', 'url(#atRock)', '#241a12', 0.3)}</g>
        ${chip(6.2, 48.4, 1.3, 'url(#atRock)', '#241a12')}${chip(23.8, 47.6, 1.1, 'url(#atRock)', '#241a12')}
        ${fall(8.6, 42.6, 1.5, 7.5, '#bfe4f5')}
        <g filter="url(#atShade)">
          ${cast(15.4, 41.9, 6, 1.7)}
          <rect x="10.2" y="34.6" width="9" height="7.2" fill="url(#atWood2)"/>
          <path d="M9.4 34.6 L14.7 31.9 L20 34.6 Z" fill="#6b4728"/>
          <path d="M14.7 31.9 L20 34.6 L14.7 34.6 Z" fill="#452c17" opacity="0.85"/>
          <g fill="#ffcf6b"><rect x="11.4" y="36.6" width="1.6" height="1.8"/><rect x="14.2" y="36.6" width="1.6" height="1.8"/><rect x="17" y="36.6" width="1.4" height="1.8"/></g>
          <rect x="17.6" y="31" width="1.8" height="3.8" fill="#6d4a30"/>
          <rect x="18.8" y="31" width="0.6" height="3.8" fill="#3f2a1a" opacity="0.8"/>
        </g>
        <path d="M18.5 30.8 q1.5 -2.2 0.2 -4.2 q-1.3 -2 0.7 -3.4" stroke="rgba(232,228,222,0.5)" stroke-width="0.5" fill="none"/>
        <g class="mill-blades" stroke="#c9a15a" stroke-width="0.45" fill="none">
          <circle cx="9.6" cy="38.6" r="2.6"/><circle cx="9.6" cy="38.6" r="1"/>
          <path d="M9.6 36 L9.6 41.2 M7 38.6 L12.2 38.6 M7.8 36.8 L11.4 40.4 M11.4 36.8 L7.8 40.4"/></g>
        <g filter="url(#atShade)">
          <path d="M20.4 41.6 L20.4 34 L24.6 32" stroke="#6a4a30" stroke-width="0.55" fill="none"/>
          <path d="M24.6 32 L24.6 34.2" stroke="rgba(255,255,255,0.45)" stroke-width="0.22"/>
          <rect x="23.9" y="34.2" width="1.4" height="1.2" fill="#8a6a3a"/></g>
        <g class="mill-blades" fill="none" stroke="#d9a24e" stroke-width="0.42" stroke-linecap="round">
          <circle cx="4.8" cy="36.4" r="1.5"/>
          <path d="M6.3 36.4 L7.1 36.4 M5.85 37.45 L6.4 38 M4.8 37.9 L4.8 38.7 M3.75 37.45 L3.2 38 M3.3 36.4 L2.5 36.4 M3.75 35.35 L3.2 34.8 M4.8 34.9 L4.8 34.1 M5.85 35.35 L6.4 34.8"/></g>
        ${tree(23.4, 41.4, 0.95, '#357a41')}
      </g>

      <!-- ============ Dschungeltempel (vorne Mitte) ============ -->
      <g transform="translate(-4.64 -4.40) scale(1.08)">
        <g filter="url(#atDeep)">${isle(58, 55, 13, 12, 'url(#atGrassJ)', 'url(#atSoil)', 'url(#atRock)', '#1d2c19', 0.37)}</g>
        ${chip(48.6, 61.2, 1.3, 'url(#atRock)', '#1d2c19')}${chip(67.4, 61.6, 1.1, 'url(#atRock)', '#1d2c19')}
        ${fall(52.2, 55.6, 1.6, 7)}
        <g filter="url(#atShade)">
          ${cast(58.6, 54.9, 5.6, 1.6)}
          <g fill="url(#atStone)">
            <rect x="54.2" y="52.6" width="8" height="1.9"/><rect x="55.2" y="50.8" width="6" height="1.8"/>
            <rect x="56.2" y="49" width="4" height="1.8"/><rect x="57" y="47.6" width="2.4" height="1.4"/></g>
          <g fill="#6d6146" opacity="0.85">
            <rect x="60.6" y="52.6" width="1.6" height="1.9"/><rect x="59.8" y="50.8" width="1.4" height="1.8"/>
            <rect x="59" y="49" width="1.2" height="1.8"/><rect x="58.6" y="47.6" width="0.8" height="1.4"/></g>
          <g fill="rgba(255,255,255,0.3)"><rect x="54.2" y="52.6" width="8" height="0.3"/><rect x="55.2" y="50.8" width="6" height="0.28"/><rect x="56.2" y="49" width="4" height="0.26"/></g>
          <rect x="57.5" y="51" width="1.4" height="3.5" fill="#241f16"/>
          <rect x="57.5" y="50.6" width="1.4" height="0.5" fill="#ffd166"/>
        </g>
        <g class="sway"><path d="M64.6 54.4 L64.6 50.2" stroke="#7a5a30" stroke-width="0.45"/>
          <g fill="#2f8a3a"><ellipse cx="62.8" cy="49.9" rx="2.4" ry="0.7" transform="rotate(-18 62.8 49.9)"/>
            <ellipse cx="66.4" cy="49.9" rx="2.4" ry="0.7" transform="rotate(18 66.4 49.9)"/>
            <ellipse cx="64.6" cy="48.8" rx="0.75" ry="1.9"/></g>
          <g fill="#1f6b2a" opacity="0.6"><ellipse cx="66.4" cy="50.1" rx="2.2" ry="0.4" transform="rotate(18 66.4 50.1)"/></g></g>
        <g class="sway s2"><path d="M51.8 54 L51.8 50.6" stroke="#7a5a30" stroke-width="0.4"/>
          <g fill="#3f9a44"><ellipse cx="50.3" cy="50.3" rx="2" ry="0.62" transform="rotate(-20 50.3 50.3)"/>
            <ellipse cx="53.3" cy="50.3" rx="2" ry="0.62" transform="rotate(20 53.3 50.3)"/></g></g>
        <g fill="#2b6a2e"><circle cx="48.4" cy="54.4" r="2"/><circle cx="67.9" cy="54.2" r="1.8"/><circle cx="46.6" cy="56" r="1.35"/></g>
        <g fill="#4f9c46" opacity="0.7"><circle cx="47.9" cy="53.9" r="1.2"/><circle cx="67.4" cy="53.7" r="1.1"/></g>
        <circle cx="66.4" cy="51.2" r="0.52" fill="#ff5d5d"/><circle cx="66.55" cy="51.05" r="0.16" fill="#fff"/>
      </g>

      <!-- ============ Meereswelt (ganz vorne) ============ -->
      <g transform="translate(-2.80 -5.50) scale(1.1)">
        <g filter="url(#atDeep)">${isle(28, 55, 14, 11, 'url(#atWater)', 'url(#atSoil)', 'url(#atRock)', '#1a2c3a', 0.38)}</g>
        ${chip(18.4, 61.4, 1.3, 'url(#atRock)', '#1a2c3a')}${chip(38.2, 61, 1.1, 'url(#atRock)', '#1a2c3a')}
        <g stroke="rgba(255,255,255,0.5)" stroke-width="0.28" fill="none">
          <path d="M20 55.4 q2 -1.1 4 0 t4 0 t4 0"/><path d="M23 57 q2 -1.1 4 0 t4 0"/><path d="M31.5 53.8 q2 -1.1 4 0 t3 0"/></g>
        <g filter="url(#atShade)">
          <path d="M25.6 53.6 h4.4 l-0.8 -1.7 h-2.8 Z" fill="#7a5432"/>
          <path d="M28.4 51.9 h0.8 l0.8 1.7 h-1.2 Z" fill="#4e3520"/>
          <path d="M27.8 52 L27.8 47.2" stroke="#4a3320" stroke-width="0.3"/>
          <path d="M27.8 47.4 L31.2 49.4 L27.8 50.9 Z" fill="#f6f2e8"/>
          <path d="M27.8 49.4 L31.2 49.4 L27.8 50.9 Z" fill="#d9d2c2" opacity="0.9"/>
          <path d="M27.8 50.3 L24.6 51.7 L27.8 52.1 Z" fill="#e6dece"/></g>
        <g filter="url(#atShade)">
          <ellipse cx="35.6" cy="54" rx="2.7" ry="0.95" fill="#6a5a4a"/>
          <ellipse cx="35.6" cy="53.7" rx="2.4" ry="0.8" fill="#8a7864"/>
          <rect x="34.9" y="48.9" width="1.5" height="5" fill="#f4f0e6"/>
          <rect x="35.75" y="48.9" width="0.65" height="5" fill="#c8c0b0" opacity="0.8"/>
          <rect x="34.9" y="50.5" width="1.5" height="0.9" fill="#d93b3b"/>
          <rect x="34.9" y="52.1" width="1.5" height="0.9" fill="#d93b3b"/>
          <path d="M34.4 48.9 L35.65 47.2 L36.9 48.9 Z" fill="#c33"/>
          <path d="M35.65 47.2 L36.9 48.9 L35.65 48.9 Z" fill="#8e2323" opacity="0.85"/>
          <circle class="art-window" cx="35.65" cy="48.5" r="0.52" fill="#ffe98a"/></g>
        <g><path d="M21.4 54.6 q-1.5 -3.2 0.4 -4.7 q1 1.9 0.4 4.7 Z" fill="#b455a8"/>
          <path d="M21.8 49.9 q1 1.9 0.4 4.7 l-0.6 0 q0.5 -2.6 -0.2 -4.4 Z" fill="#7d2f74" opacity="0.85"/>
          <path d="M23.4 55 q-0.65 -3.6 1.5 -4.7 q0.55 2.4 -0.45 4.7 Z" fill="#b455a8"/>
          <path d="M24.9 50.3 q0.55 2.4 -0.45 4.7 l-0.5 0 q0.85 -2.4 0.4 -4.5 Z" fill="#7d2f74" opacity="0.85"/></g>
        <circle cx="21.6" cy="51.1" r="0.3" fill="#ffd9f2"/><circle cx="24.5" cy="51.3" r="0.26" fill="#ffd9f2"/>
      </g>

      <!-- ============ Mitte: goldener Ball auf dem Sockel ============ -->
      <g>
        <circle cx="50" cy="31" r="10" fill="url(#atGlow)"/>
        <g filter="url(#atDeep)">${isle(50, 34, 6.6, 6.5, 'url(#atGrass)', 'url(#atSoil)', 'url(#atRock)', '#241a12', 0.27)}</g>
        ${chip(45.4, 38.6, 0.9, 'url(#atRock)', '#241a12')}
        <g filter="url(#atShade)">
          <ellipse cx="50" cy="33.4" rx="3.7" ry="1.15" fill="#a89e8c"/>
          <ellipse cx="50" cy="33" rx="3.7" ry="1.15" fill="#cfc6b4"/>
          <ellipse cx="50" cy="32.3" rx="2.6" ry="0.82" fill="#eae2d2"/>
          <ellipse cx="50" cy="32.1" rx="2.6" ry="0.82" fill="#f6f0e2"/></g>
        <ellipse cx="50" cy="31.9" rx="2" ry="0.5" fill="rgba(0,0,0,0.28)"/>
        <circle cx="50" cy="30.3" r="2.6" fill="url(#atBall)"/>
        <ellipse cx="49" cy="29.1" rx="0.85" ry="0.6" fill="rgba(255,255,255,0.9)" transform="rotate(-25 49 29.1)"/>
      </g>

      <!-- vorderste Wolkenschicht: schiebt alles dahinter in die Ferne -->
      <g filter="url(#atSoft)" opacity="0.3">
        <g class="drift d2"><ellipse cx="16" cy="63" rx="20" ry="3.2" fill="#e8f2fb"/><ellipse cx="30" cy="64.5" rx="12" ry="2.2" fill="#e8f2fb"/></g>
        <g class="drift"><ellipse cx="88" cy="60" rx="16" ry="2.6" fill="#dbe8f6"/></g>
      </g>
      <rect width="100" height="66" fill="url(#atVig)"/>
    </svg>`;
  }
  return { spots, svg };
})();
