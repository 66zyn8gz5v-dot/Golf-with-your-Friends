/* Weltkarte: die Übersicht über alle Welten. Ein gezeichneter Atlas, auf dem die Reise links im hellen
   Märchenland beginnt und rechts im nächtlichen Schattenreich endet – Himmel, Land und Meer wechseln
   dabei von Tag auf Nacht. Jede Welt ist ein Ort auf der Karte und von Anfang an anwählbar; nichts muss
   freigespielt werden. Die Stufe (Normal, Profi, Legende) steht nur als Hinweis am Ort.

   Die Orte liegen in Prozent der Kartenfläche (spots), die Zeichnung nutzt denselben Maßstab
   (viewBox 100 × 62, preserveAspectRatio="none"), damit Marke und Untergrund exakt zusammenpassen. */
const WorldMap = (() => {
  /* x, y in Prozent der Karte; icon = Zeichen der Marke, col = Farbe des Rings */
  const spots = {
    normal: { x: 12, y: 52, icon: '🌼', col: '#8fe07a' },
    sea: { x: 27, y: 82, icon: '🌊', col: '#7fd8ff' },
    pro: { x: 43, y: 50, icon: '⚙️', col: '#ff9c5a' },
    jungle: { x: 59, y: 82, icon: '🗿', col: '#b6ff6e' },
    storm: { x: 75, y: 44, icon: '⛈️', col: '#ffe45e' },
    shadow: { x: 88, y: 74, icon: '🌑', col: '#c58bff' },
  };
  const vb = (id, dy = 0) => `${spots[id].x} ${(spots[id].y * 0.62 + dy).toFixed(1)}`; // Prozent → Karten-Koordinate

  /* par: 'none' für die Karte selbst (Prozent = Koordinate), 'xMidYMid slice' für den Knopf im Titelbild */
  function svg(cls = 'atlas-bg', par = 'none') {
    const stars = [];
    for (let i = 0; i < 30; i++) {
      const x = 55 + ((i * 41) % 45), y = 1 + ((i * 19) % 17), r = 0.2 + ((i * 7) % 3) * 0.14;
      stars.push(`<circle class="twinkle ${i % 3 ? 't' + (i % 3 + 1) : ''}" cx="${x}" cy="${y}" r="${r}" fill="#fff" opacity="${0.5 + (i % 4) * 0.15}"/>`);
    }
    const route = ['normal', 'sea', 'pro', 'jungle', 'storm', 'shadow'].map(id => vb(id, -1.6)).join(' L ');
    return `<svg class="${cls}" viewBox="0 0 100 62" preserveAspectRatio="${par}" aria-hidden="true">
      <defs>
        <linearGradient id="atSky" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#5fb4f2"/><stop offset="0.24" stop-color="#bfe4ff"/><stop offset="0.44" stop-color="#f3ab63"/>
          <stop offset="0.6" stop-color="#8a4a5a"/><stop offset="0.78" stop-color="#241a42"/><stop offset="1" stop-color="#06040e"/>
        </linearGradient>
        <linearGradient id="atLand" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#59a044"/><stop offset="0.2" stop-color="#71b34c"/><stop offset="0.38" stop-color="#c8a35e"/>
          <stop offset="0.55" stop-color="#4a7a34"/><stop offset="0.74" stop-color="#42476a"/><stop offset="0.9" stop-color="#241b3c"/><stop offset="1" stop-color="#100a1c"/>
        </linearGradient>
        <linearGradient id="atRidge" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stop-color="#9fc4ea"/><stop offset="0.35" stop-color="#b09a86"/><stop offset="0.62" stop-color="#6a5a80"/><stop offset="1" stop-color="#191233"/>
        </linearGradient>
        <linearGradient id="atSea" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#63bce8"/><stop offset="1" stop-color="#10456e"/></linearGradient>
        <radialGradient id="atSun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fffbe0"/><stop offset="0.42" stop-color="#ffe08a"/><stop offset="1" stop-color="rgba(255,224,138,0)"/></radialGradient>
        <radialGradient id="atMoon" cx="0.5" cy="0.5" r="0.5"><stop offset="0.34" stop-color="#c8434c"/><stop offset="1" stop-color="rgba(184,50,60,0)"/></radialGradient>
        <radialGradient id="atVig" cx="0.5" cy="0.5" r="0.72"><stop offset="0.6" stop-color="rgba(0,0,0,0)"/><stop offset="1" stop-color="rgba(0,0,0,0.5)"/></radialGradient>
      </defs>
      <rect width="100" height="62" fill="url(#atSky)"/>
      ${stars.join('')}
      <circle cx="12" cy="7" r="11" fill="url(#atSun)"/><circle cx="12" cy="7" r="3.6" fill="#fff8d2"/>
      <circle cx="86" cy="6" r="10" fill="url(#atMoon)"/><circle cx="86" cy="6" r="3.2" fill="#c8434c"/>
      <!-- Gebirgszug als Rückwand der Karte -->
      <path d="M0 22 L6 15 L11 20 L17 12 L23 21 L30 14 L37 22 L45 11 L53 20 L60 13 L67 21 L74 12 L81 20 L88 14 L95 21 L100 16 L100 34 L0 34 Z" fill="url(#atRidge)"/>
      <path d="M17 12 L20 17 L14 17 Z M45 11 L48.5 17 L41.5 17 Z M74 12 L77.5 17.5 L70.5 17.5 Z" fill="rgba(255,255,255,0.5)"/>
      <!-- Landmasse mit heller Küstenlinie -->
      <path d="M0 24 Q9 20 19 23 Q30 26 40 22 Q52 18 63 23 Q74 27 84 22 Q93 18 100 22 L100 62 L0 62 Z" fill="url(#atLand)"/>
      <path d="M0 24 Q9 20 19 23 Q30 26 40 22 Q52 18 63 23 Q74 27 84 22 Q93 18 100 22" fill="none" stroke="rgba(255,255,255,0.3)" stroke-width="0.5"/>
      <!-- Meeresbucht im Südwesten -->
      <path d="M3 62 Q4 44 16 40 Q31 35 40 45 Q46 54 44 62 Z" fill="url(#atSea)"/>
      <path d="M3 62 Q4 44 16 40 Q31 35 40 45 Q46 54 44 62" fill="none" stroke="rgba(255,255,255,0.45)" stroke-width="0.5"/>
      <g stroke="rgba(255,255,255,0.55)" stroke-width="0.4" fill="none">
        <path d="M10 50 q2.5 -1.3 5 0 t5 0 t5 0"/><path d="M13 55 q2.5 -1.3 5 0 t5 0 t5 0"/><path d="M8 45 q2.5 -1.3 5 0 t5 0"/>
      </g>
      <!-- Märchenland: Burg auf grünem Hügel, Tannen daneben -->
      <path d="M1 30 Q9 21 18 30 Z" fill="#69b355"/>
      <g fill="#d6d0c6"><rect x="6.6" y="23.4" width="1.9" height="5.4"/><rect x="11.2" y="23.4" width="1.9" height="5.4"/><rect x="8.7" y="21.4" width="2.6" height="7.4"/></g>
      <path d="M6.2 23.4 L7.55 20.8 L8.9 23.4 Z M10.8 23.4 L12.15 20.8 L13.5 23.4 Z M8.3 21.4 L10 18.2 L11.7 21.4 Z" fill="#c94a4a"/>
      <rect x="9.8" y="16.6" width="0.3" height="1.8" fill="#3a2a1a"/><path class="art-flag" d="M10.1 16.6 L12.4 17.3 L10.1 18 Z" fill="#ff4f6d"/>
      <g class="sway" fill="#2f7a3e"><path d="M2.6 30 L3.9 26 L5.2 30 Z"/></g><g class="sway s2" fill="#2f7a3e"><path d="M14.8 30.4 L16 26.6 L17.2 30.4 Z"/></g>
      <!-- Tüftlerreich: Windmühle und Zahnrad vor dem rauchenden Berg -->
      <path d="M33 32 L42 17 L51 32 Z" fill="#6b5560"/><path d="M38 24.7 L42 17 L46 24.7 Z" fill="#a08a92"/>
      <ellipse cx="42" cy="17.6" rx="1.6" ry="0.5" fill="#ff8a3d"/>
      <path d="M42 16.8 q1.6 -2.4 0.2 -4.6 q-1.4 -2.2 0.8 -3.8" stroke="rgba(220,210,215,0.55)" stroke-width="0.5" fill="none"/>
      <g><rect x="29.2" y="25.6" width="2.6" height="6.4" fill="#d6c09a"/><path d="M28.6 25.6 L30.5 22.6 L32.4 25.6 Z" fill="#8a5a3a"/>
        <rect x="30" y="29" width="1" height="1.2" fill="#ffd166"/>
        <g class="mill-blades"><path d="M30.5 26.4 L30.5 21.9 M30.5 26.4 L35 26.4 M30.5 26.4 L30.5 30.9 M30.5 26.4 L26 26.4" stroke="#5a3a1e" stroke-width="0.45"/>
          <path d="M30.7 22.3 L31.8 22.6 L30.7 25.6 Z M34.6 26.6 L34.3 27.7 M34.6 26.6 L31.3 26.6 L34.6 27.7 Z M30.3 30.5 L29.2 30.2 L30.3 27.2 Z M26.4 26.2 L26.7 25.1 L30 26.2 Z" fill="rgba(245,235,210,0.9)"/></g></g>
      <g class="mill-blades" fill="none" stroke="#d9a24e" stroke-width="0.5" stroke-linecap="round">
        <circle cx="52.6" cy="26.4" r="1.35"/><path d="M53.95 26.40 L54.65 26.40 M53.55 27.35 L54.05 27.85 M52.60 27.75 L52.60 28.45 M51.65 27.35 L51.15 27.85 M51.25 26.40 L50.55 26.40 M51.65 25.45 L51.15 24.95 M52.60 25.05 L52.60 24.35 M53.55 25.45 L54.05 24.95"/>
        <circle cx="52.6" cy="26.4" r="0.4" fill="#d9a24e" stroke="none"/></g>
      <!-- Dschungel: Tempelstufen im Grün -->
      <ellipse cx="58" cy="44" rx="12" ry="6" fill="#2f6a2c" opacity="0.75"/>
      <path d="M52.5 43.6 L58 35.4 L63.5 43.6 Z" fill="#9a8a66"/><path d="M54.4 43.6 L58 38 L61.6 43.6 Z" fill="#b8a780"/>
      <rect x="56.9" y="40.2" width="2.2" height="3.4" fill="#3a3226"/>
      <g fill="#2f8a3a"><circle cx="49.5" cy="41.5" r="2.4"/><circle cx="66.5" cy="41.2" r="2.6"/><circle cx="47.4" cy="44.6" r="1.9"/><circle cx="68.6" cy="44.4" r="1.8"/></g>
      <!-- Sturmhimmel: schwebende Inseln mit Blitz -->
      <g fill="#3b3f5a"><path d="M69 24 h8.4 l-1.7 3 h-5 Z"/><path d="M79.6 19.6 h6 l-1.2 2.3 h-3.6 Z"/><path d="M71.6 16.4 h5.4 l-1.1 2 h-3.2 Z"/></g>
      <g fill="#6f7d63"><rect x="69" y="23" width="8.4" height="1.1"/><rect x="79.6" y="18.7" width="6" height="0.9"/><rect x="71.6" y="15.5" width="5.4" height="0.9"/></g>
      <g fill="#2f6b3a"><path d="M71.4 23 L72.4 20.6 L73.4 23 Z"/><path d="M81.2 18.7 L82 16.9 L82.8 18.7 Z"/></g>
      <polyline class="art-flash" points="80.6,12.4 78.8,15.8 81,16.3 78,20.6" fill="none" stroke="#fff6a8" stroke-width="0.6" stroke-linejoin="round"/>
      <!-- Schattenreich: Friedhofshügel unter dem Blutmond -->
      <path d="M77 42 Q88 32 100 40 L100 62 L77 62 Z" fill="#221833"/>
      <g fill="#5a5074"><rect x="83.4" y="37.4" width="1.8" height="3.2"/><circle cx="84.3" cy="37.4" r="0.9"/>
        <rect x="89.6" y="38.2" width="1.6" height="2.8"/><circle cx="90.4" cy="38.2" r="0.8"/>
        <rect x="94.4" y="39.2" width="0.6" height="2.6"/><rect x="93.3" y="39.9" width="2.8" height="0.6"/></g>
      <path d="M87 39.6 L87 34.4 M87 36.2 L85.2 34.8 M87 35.4 L88.9 33.8 M87 37.4 L85.6 36.6" stroke="#4a3f66" stroke-width="0.5" fill="none" stroke-linecap="round"/>
      <g class="particles"><circle class="p" cx="80" cy="44" r="0.6" fill="#c58bff"/><circle class="p p3" cx="96" cy="46" r="0.5" fill="#c58bff"/></g>
      <!-- Reiseweg zwischen den Orten -->
      <path d="M ${route}" fill="none" stroke="rgba(0,0,0,0.35)" stroke-width="1.5" stroke-linecap="round"/>
      <path d="M ${route}" fill="none" stroke="rgba(255,246,214,0.9)" stroke-width="0.75" stroke-linecap="round" stroke-dasharray="1.5 2.4"/>
      <rect width="100" height="62" fill="url(#atVig)"/>
    </svg>`;
  }
  return { spots, svg };
})();
