/* Spielablauf: Titel → 9 Bahnen (Hotseat für 1–4 Spieler) → Endergebnis. */
(() => {
  const STEP = 1 / 240;
  const MAX_SHOT = 19;       // Ballgeschwindigkeit bei voller Kraft
  const MAX_DRAG = 4.2;      // Zieh-Länge (Weltkoordinaten) für volle Kraft
  const DEFAULT_MAX_STROKES = 15; // danach wird die Bahn automatisch beendet (pro Bahn per maxStrokes überschreibbar)
  const maxStrokes = () => state.mode === 'creative' ? Infinity : (state.courses[state.holeIdx].maxStrokes || DEFAULT_MAX_STROKES);
  const PLAYER_COLORS = ['#ffffff', '#ff6b6b', '#4dd4ff', '#ffe066'];
  const PLAYER_NAMES = ['Spieler 1', 'Spieler 2', 'Spieler 3', 'Spieler 4'];
  /* Hut je Spieler: die Wahl merkt sich der Browser, damit sie beim nächsten Mal wieder dasteht */
  const DEFAULT_HATS = ['crown', 'pirate', 'wizard', 'party'];
  const playerHats = DEFAULT_HATS.slice();
  try {
    const saved = JSON.parse(localStorage.getItem('fantasygolf.hats') || 'null');
    if (Array.isArray(saved)) saved.forEach((h, i) => { if (i < 4 && typeof h === 'string' && Hats.has(h)) playerHats[i] = h; });
  } catch (e) { /* kein Speicher, dann bleiben die Vorgaben */ }
  function setHat(i, id) {
    playerHats[i] = id;
    if (state.players[i]) state.players[i].hat = id;
    if (state.ball && state.curPlayer === i) state.ball.hat = id;
    try { localStorage.setItem('fantasygolf.hats', JSON.stringify(playerHats)); } catch (e) { /* kein Speicher */ }
  }

  const canvas = document.getElementById('game');
  const R = new Renderer(canvas);
  const $ = id => document.getElementById(id);
  const ui = {
    hole: $('hud-hole'), name: $('hud-name'), player: $('hud-player'), strokes: $('hud-strokes'),
    power: $('power'), powerFill: $('power-fill'), board: $('scoreboard'), msg: $('message'), overlay: $('overlay'), hint: $('hint'),
  };

  const state = {
    phase: 'title', players: [], holeIdx: 0, level: null, theme: null, t: 0, ball: null, aim: null,
    particles: [], curPlayer: 0, strokes: 0, restTimer: 0, slowTimer: 0, lastBounceSfx: 0,
    camMode: 'overview', camTheta: Math.PI / 4, zoomFactor: 1,
    controlMode: 'sling', // 'sling' = Schleuder (vom Ball wegziehen), 'push' = Schieben (in Schussrichtung ziehen)
    mode: 'normal',       // 'normal' = Wettkampf, 'creative' = Kreativ (Bahnen frei wählen und überspringen, kein Schlaglimit)
    world: WORLDS[0], courses: WORLDS[0].courses,
  };
  try { const m = localStorage.getItem('fantasygolf.control'); if (m === 'sling' || m === 'push') state.controlMode = m; } catch (e) { /* kein Speicher verfügbar */ }
  function setControlMode(m) {
    state.controlMode = m;
    try { localStorage.setItem('fantasygolf.control', m); } catch (e) { /* ignorieren */ }
    ui.hint.textContent = m === 'push' ? 'In Schussrichtung ziehen & loslassen' : 'Vom Ball wegziehen & loslassen';
  }
  let playerCount = 1, gameMode = 'normal', msgTimer = null, waitTimer = null;

  /* ---------- UI ---------- */
  function showMessage(text, ms = 1600) {
    if (state.phase === 'summary' || state.phase === 'final') return; // keine Laufmeldung über den Ergebnistafeln
    ui.msg.textContent = text; ui.msg.classList.add('visible'); ui.msg.classList.toggle('small', text.length > 40);
    clearTimeout(msgTimer); msgTimer = setTimeout(() => ui.msg.classList.remove('visible'), ms);
  }
  function updateHud() {
    const def = state.courses[state.holeIdx];
    ui.hole.textContent = `${state.world.short} · Bahn ${state.holeIdx + 1} / ${state.courses.length}`;
    ui.name.textContent = def ? def.name : '–';
    const p = state.players[state.curPlayer];
    ui.player.textContent = p ? p.name : '–';
    ui.strokes.textContent = def ? (state.mode === 'creative' ? `Kreativ · Schläge: ${state.strokes} · Par ${def.par}` : `Schläge: ${state.strokes} / ${maxStrokes()} · Par ${def.par}`) : '';
    ui.board.innerHTML = state.players.map((pl, i) => {
      const total = pl.scores.reduce((a, b) => a + b, 0);
      const hat = pl.hat && pl.hat !== 'none' ? `<span class="hat-icon" title="${Hats.name(pl.hat)}">${Hats.icon(pl.hat)}</span>` : '';
      return `<div class="row ${i === state.curPlayer ? 'active' : ''}"><span class="dot" style="background:${pl.color}"></span>${hat}${pl.name}<span class="score">${total}</span></div>`;
    }).join('');
  }
  function overlay(html, cls) { ui.overlay.innerHTML = html; ui.overlay.className = 'screen visible' + (cls ? ' ' + cls : ''); }
  function hideOverlay() { ui.overlay.className = 'screen'; ui.overlay.innerHTML = ''; }

  const SCENE_NORMAL = `<svg class="mode-scene" viewBox="0 0 300 72" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="skyN" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f9de8"/><stop offset="1" stop-color="#d6ecff"/></linearGradient>
              <radialGradient id="sunN" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff8d0"/><stop offset="0.55" stop-color="#ffe98a"/><stop offset="1" stop-color="#ffd166"/></radialGradient>
              <radialGradient id="sunGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="rgba(255,240,170,0.6)"/><stop offset="1" stop-color="rgba(255,240,170,0)"/></radialGradient>
              <linearGradient id="hillFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#9ed982"/><stop offset="1" stop-color="#6fbd5c"/></linearGradient>
              <linearGradient id="hillNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7fcf52"/><stop offset="0.6" stop-color="#5aae42"/><stop offset="1" stop-color="#3f8f33"/></linearGradient>
              <linearGradient id="towerG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#8f897f"/><stop offset="0.45" stop-color="#e0dbd2"/><stop offset="1" stop-color="#9a948a"/></linearGradient>
              <linearGradient id="wallG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9c3b9"/><stop offset="1" stop-color="#a49e94"/></linearGradient>
              <linearGradient id="roofG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#7d2a2a"/><stop offset="0.5" stop-color="#c94a4a"/><stop offset="1" stop-color="#8e3232"/></linearGradient>
              <linearGradient id="firL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1f5a2c"/><stop offset="0.5" stop-color="#3f9a4e"/><stop offset="1" stop-color="#2a6e38"/></linearGradient>
              <filter id="soft" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>
            </defs>
            <rect width="300" height="72" fill="url(#skyN)"/>
            <circle cx="262" cy="16" r="22" fill="url(#sunGlow)"/><circle cx="262" cy="16" r="9" fill="url(#sunN)"/>
            <g class="drift" opacity="0.9"><ellipse cx="150" cy="16" rx="22" ry="6" fill="#ffffff"/><ellipse cx="138" cy="19" rx="12" ry="5" fill="#ffffff"/><ellipse cx="150" cy="19" rx="20" ry="3.5" fill="#dbe9f7"/></g>
            <g class="drift d2" opacity="0.8"><ellipse cx="220" cy="28" rx="16" ry="5" fill="#ffffff"/><ellipse cx="222" cy="30" rx="14" ry="2.5" fill="#dbe9f7"/></g>
            <path d="M0 58 Q40 40 90 52 T190 46 T300 52 V72 H0 Z" fill="#bfe3a8" opacity="0.8"/>
            <path d="M0 62 Q60 46 120 58 T240 54 T300 60 V72 H0 Z" fill="url(#hillFar)"/>
            <path d="M0 66 Q80 56 160 64 T300 62 V72 H0 Z" fill="url(#hillNear)"/>
            <path d="M0 66 Q80 56 160 64" stroke="#a6e07a" stroke-width="1.2" fill="none" opacity="0.7"/>
            <ellipse cx="62" cy="63" rx="34" ry="3.5" fill="rgba(0,0,0,0.22)" filter="url(#soft)"/>
            <ellipse cx="14" cy="64.5" rx="8" ry="2" fill="rgba(0,0,0,0.2)" filter="url(#soft)"/><ellipse cx="110" cy="62.5" rx="10" ry="2.2" fill="rgba(0,0,0,0.2)" filter="url(#soft)"/><ellipse cx="125" cy="63.5" rx="7" ry="1.8" fill="rgba(0,0,0,0.2)" filter="url(#soft)"/>
            <g class="sway"><path d="M6 64 L14 42 L22 64 Z" fill="url(#firL)"/><path d="M8 56 L14 44 L20 56 Z" fill="#4aa85a"/><path d="M14 42 L22 64 L14 64 Z" fill="rgba(0,0,0,0.18)"/></g>
            <rect x="40" y="40" width="44" height="22" fill="url(#wallG)"/><rect x="40" y="40" width="44" height="3" fill="#e6e1d8"/>
            <rect x="36" y="32" width="12" height="30" fill="url(#towerG)"/><rect x="76" y="32" width="12" height="30" fill="url(#towerG)"/>
            <rect x="54" y="24" width="16" height="38" fill="url(#towerG)"/>
            <path d="M34 32 L42 20 L50 32 Z M74 32 L82 20 L90 32 Z M52 24 L62 8 L72 24 Z" fill="url(#roofG)"/>
            <path d="M42 20 L50 32 L46 32 Z M82 20 L90 32 L86 32 Z M62 8 L72 24 L67 24 Z" fill="rgba(0,0,0,0.22)"/>
            <path d="M40 40 h3 v-4 h-3 z M46 40 h3 v-4 h-3 z M70 40 h3 v-4 h-3 z M77 40 h3 v-4 h-3 z" fill="#d9d4cb"/>
            <rect x="59" y="44" width="6" height="8" rx="1" fill="#ffd166" class="art-window"/><rect x="40" y="46" width="3" height="4" rx="0.8" fill="#ffd166" opacity="0.8"/><rect x="80" y="46" width="3" height="4" rx="0.8" fill="#ffd166" opacity="0.8"/>
            <path d="M57 54 a5 5 0 0 1 10 0 v8 h-10 z" fill="#2a1c12"/><path d="M58.5 55.5 a3.5 3.5 0 0 1 7 0 v6.5 h-7 z" fill="#4a3320"/>
            <rect x="61.5" y="0" width="1.2" height="9" fill="#3a2a1a"/>
            <path class="art-flag" d="M62.7 0 L74 3.5 L62.7 7 Z" fill="#ff4f6d"/>
            <g class="sway s2"><path d="M100 62 L110 34 L120 62 Z" fill="url(#firL)"/><path d="M103 52 L110 38 L117 52 Z" fill="#4aa85a"/><path d="M110 34 L120 62 L110 62 Z" fill="rgba(0,0,0,0.18)"/></g>
            <g class="sway s3"><path d="M118 63 L125 46 L132 63 Z" fill="url(#firL)"/><path d="M125 46 L132 63 L125 63 Z" fill="rgba(0,0,0,0.2)"/></g>
            <path d="M92 66 L98 62 L104 66 Z M110 68 L114 65 L118 68 Z" fill="#3f8a33"/>
          </svg>`;
  const SCENE_PRO = `<svg class="mode-scene" viewBox="0 0 300 72" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="skyP" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4a2a3a"/><stop offset="0.5" stop-color="#c8562e"/><stop offset="1" stop-color="#ffb46a"/></linearGradient>
              <radialGradient id="sunP" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff1c0"/><stop offset="1" stop-color="#ff9a3a"/></radialGradient>
              <linearGradient id="hillP1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6a4a6a"/><stop offset="1" stop-color="#3a2a44"/></linearGradient>
              <linearGradient id="hillP2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4f7a3a"/><stop offset="1" stop-color="#2a4a22"/></linearGradient>
              <linearGradient id="millG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#5a4030"/><stop offset="0.45" stop-color="#a07850"/><stop offset="1" stop-color="#5a4030"/></linearGradient>
              <filter id="softP" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>
            </defs>
            <rect width="300" height="72" fill="url(#skyP)"/>
            <circle cx="230" cy="40" r="14" fill="url(#sunP)"/>
            <g class="drift" opacity="0.6"><ellipse cx="120" cy="14" rx="26" ry="5" fill="#7a4a5a"/></g>
            <path d="M0 50 L30 34 L60 46 L95 26 L130 44 L170 30 L205 46 L240 36 L270 48 L300 40 V72 H0 Z" fill="url(#hillP1)"/>
            <path d="M0 64 Q80 54 160 62 T300 60 V72 H0 Z" fill="url(#hillP2)"/>
            <path d="M0 64 Q80 54 160 62" stroke="#7fb060" stroke-width="1" fill="none" opacity="0.5"/>
            <ellipse cx="62" cy="64" rx="18" ry="3" fill="rgba(0,0,0,0.3)" filter="url(#softP)"/>
            <path d="M52 62 L56 30 L68 30 L72 62 Z" fill="url(#millG)"/>
            <path d="M54 30 L62 22 L70 30 Z" fill="#3a2214"/>
            <rect x="60" y="46" width="4" height="6" fill="#ffd166" class="art-window"/><path d="M58 62 a4 4 0 0 1 8 0 v0 h-8 z" fill="#1a120e"/>
            <g class="mill-blades"><path d="M62 30 L62 8 M62 30 L84 30 M62 30 L62 52 M62 30 L40 30" stroke="#3a2214" stroke-width="1.6"/>
              <path d="M62 30 L64 10 L69 12 L64 30 Z M62 30 L82 28 L80 23 L62 28 Z M62 30 L60 50 L55 48 L60 30 Z M62 30 L42 32 L44 37 L62 32 Z" fill="rgba(245,235,210,0.85)" stroke="#3a2214" stroke-width="0.8"/></g>
            <circle cx="62" cy="30" r="1.8" fill="#1a120e"/>
            <g class="sway s2"><path d="M100 62 L108 40 L116 62 Z" fill="#2a4a22"/></g><g class="sway s3"><path d="M280 63 L287 46 L294 63 Z" fill="#2a4a22"/></g>
            <g class="twinkle"><path d="M150 12 l1 3 l3 1 l-3 1 l-1 3 l-1 -3 l-3 -1 l3 -1 z" fill="#fff"/></g>
          </svg>`;
  const SCENE_SEA = `<svg class="mode-scene" viewBox="0 0 300 72" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="skyS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f6fc4"/><stop offset="1" stop-color="#bfe6ff"/></linearGradient>
              <linearGradient id="seaS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3fa0d6"/><stop offset="1" stop-color="#155a8a"/></linearGradient>
              <linearGradient id="deepS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#135078"/><stop offset="1" stop-color="#062a45"/></linearGradient>
              <linearGradient id="hullS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7a5230"/><stop offset="1" stop-color="#3a2412"/></linearGradient>
              <linearGradient id="towerS" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#c9c3b9"/><stop offset="0.5" stop-color="#f4efe6"/><stop offset="1" stop-color="#a49e94"/></linearGradient>
              <radialGradient id="sunS" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff8d0"/><stop offset="1" stop-color="#ffd166"/></radialGradient>
              <filter id="softS" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>
            </defs>
            <rect width="300" height="72" fill="url(#skyS)"/>
            <circle cx="52" cy="14" r="9" fill="url(#sunS)"/>
            <g class="drift" opacity="0.85"><ellipse cx="180" cy="12" rx="20" ry="5" fill="#ffffff"/><ellipse cx="192" cy="15" rx="12" ry="3" fill="#e6f2ff"/></g>
            <rect x="0" y="34" width="300" height="38" fill="url(#seaS)"/>
            <path d="M0 52 Q30 48 60 52 T120 52 T180 52 T240 52 T300 52 V72 H0 Z" fill="url(#deepS)" opacity="0.9"/>
            <path d="M0 40 q10 -3 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="rgba(255,255,255,0.55)" stroke-width="1.2" fill="none"/>
            <path d="M0 47 q10 -3 20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0 t20 0" stroke="rgba(255,255,255,0.3)" stroke-width="1" fill="none"/>
            <ellipse cx="110" cy="44" rx="30" ry="3" fill="rgba(0,0,0,0.25)" filter="url(#softS)"/>
            <path d="M84 36 L136 36 L128 46 L92 46 Z" fill="url(#hullS)"/><rect x="88" y="33" width="44" height="3" fill="#a87f52"/>
            <rect x="108" y="10" width="2" height="24" fill="#3a2412"/>
            <path class="art-flag" d="M109 12 Q96 20 109 30 Z" fill="#f0e6d2" stroke="#3a2412" stroke-width="0.6"/>
            <path d="M110 10 L120 12.5 L110 15 Z" fill="#1a1a1a"/><circle cx="114" cy="12.5" r="1" fill="#fff"/>
            <path d="M232 46 L250 30 L268 46 Z" fill="#6a5a50"/><path d="M226 48 L244 36 L262 48 Z" fill="#8a7a6a"/>
            <rect x="246" y="14" width="8" height="24" fill="url(#towerS)"/><rect x="244" y="20" width="12" height="3" fill="#d93b3b"/><rect x="244" y="28" width="12" height="3" fill="#d93b3b"/>
            <rect x="245" y="10" width="10" height="5" fill="#3a3a44"/><rect x="247" y="11" width="6" height="3" fill="#ffd166" class="art-window"/>
            <path d="M247 12 L232 4 L232 20 Z" fill="rgba(255,240,170,0.35)"/>
            <g class="twinkle"><path d="M28 26 l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1 z" fill="#fff"/></g>
            <path d="M150 20 q3 -3 6 0 M156 20 q3 -3 6 0" stroke="#fff" stroke-width="1" fill="none"/><path d="M200 26 q3 -3 6 0 M206 26 q3 -3 6 0" stroke="#fff" stroke-width="1" fill="none"/>
            <ellipse cx="40" cy="60" rx="6" ry="2.5" fill="#ff7a3d" opacity="0.9"/><path d="M46 60 L52 56 L52 64 Z" fill="#ff7a3d" opacity="0.9"/><circle cx="37" cy="59.5" r="0.8" fill="#000"/>
            <ellipse cx="290" cy="64" rx="5" ry="2" fill="#ffe066" opacity="0.9"/><path d="M285 64 L280 61 L280 67 Z" fill="#ffe066" opacity="0.9"/>
          </svg>`;
  const SCENE_JUNGLE = `<svg class="mode-scene" viewBox="0 0 300 72" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="skyJ" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#173a22"/><stop offset="1" stop-color="#7fb85a"/></linearGradient>
              <linearGradient id="stoneJ" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#6a6a58"/><stop offset="0.5" stop-color="#a89a74"/><stop offset="1" stop-color="#6a6a58"/></linearGradient>
              <filter id="softJ" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>
            </defs>
            <rect width="300" height="72" fill="url(#skyJ)"/>
            <path d="M40 0 L52 0 L70 60 L58 60 Z" fill="rgba(255,240,170,0.18)"/><path d="M180 0 L190 0 L212 60 L200 60 Z" fill="rgba(255,240,170,0.14)"/>
            <g fill="#123a1e"><circle cx="20" cy="40" r="18"/><circle cx="60" cy="36" r="22"/><circle cx="250" cy="34" r="24"/><circle cx="290" cy="40" r="18"/></g>
            <path d="M120 60 L150 14 L180 60 Z" fill="#7a6a48"/><path d="M128 60 L150 22 L172 60 Z" fill="#8f8062"/>
            <rect x="140" y="30" width="20" height="10" fill="#5a4c34"/><rect x="144" y="40" width="12" height="20" fill="#2a2218"/>
            <path d="M136 44 h28 v3 h-28 z M132 52 h36 v3 h-36 z" fill="#6a5a3c"/>
            <g fill="#2f8a3a"><circle cx="40" cy="58" r="14"/><circle cx="90" cy="60" r="12"/><circle cx="215" cy="58" r="14"/><circle cx="270" cy="60" r="12"/></g>
            <path d="M0 66 Q60 58 150 64 T300 62 V72 H0 Z" fill="#3f7a2a"/>
            <g class="sway"><path d="M105 64 q-8 -18 2 -30 M105 64 q8 -18 -2 -30 M105 64 q-14 -10 -10 -26 M105 64 q14 -10 10 -26" stroke="#4aa84a" stroke-width="2" fill="none"/></g>
            <g class="sway s2"><path d="M232 66 q-8 -18 2 -30 M232 66 q8 -18 -2 -30 M232 66 q-14 -10 -10 -26 M232 66 q14 -10 10 -26" stroke="#4aa84a" stroke-width="2" fill="none"/></g>
            <rect x="70" y="46" width="8" height="14" fill="#8f8f7c"/><rect x="71" y="49" width="2" height="2" fill="#ffd166"/><rect x="75" y="49" width="2" height="2" fill="#ffd166"/>
            <ellipse cx="20" cy="14" rx="6" ry="2.5" fill="#ff4f4f"/><path d="M14 14 L8 9 M26 14 L32 9" stroke="#ff4f4f" stroke-width="2"/>
            <g class="twinkle"><path d="M150 26 l1 2 l2 1 l-2 1 l-1 2 l-1 -2 l-2 -1 l2 -1 z" fill="#ffd166"/></g>
          </svg>`;
  const SCENE_CREATIVE = `<svg class="mode-scene" viewBox="0 0 300 72" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="skyK" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d1238"/><stop offset="0.6" stop-color="#4a2f7a"/><stop offset="1" stop-color="#7a58b0"/></linearGradient>
              <radialGradient id="moonGlow" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="rgba(220,230,255,0.45)"/><stop offset="1" stop-color="rgba(220,230,255,0)"/></radialGradient>
              <linearGradient id="hillKFar" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#7cc3a4"/><stop offset="1" stop-color="#4f9a78"/></linearGradient>
              <linearGradient id="hillKNear" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6fbf95"/><stop offset="0.6" stop-color="#4d9573"/><stop offset="1" stop-color="#2f6a52"/></linearGradient>
              <radialGradient id="capR" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ff8a8c"/><stop offset="0.5" stop-color="#e0575a"/><stop offset="1" stop-color="#8e2f33"/></radialGradient>
              <radialGradient id="capP" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ef8fb8"/><stop offset="0.5" stop-color="#c94a7a"/><stop offset="1" stop-color="#7a2a4c"/></radialGradient>
              <radialGradient id="capY" cx="0.35" cy="0.3" r="0.8"><stop offset="0" stop-color="#ffd27a"/><stop offset="0.5" stop-color="#e7a53a"/><stop offset="1" stop-color="#9a6a1e"/></radialGradient>
              <linearGradient id="stemG" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#d9c9a5"/><stop offset="0.45" stop-color="#fbf1d8"/><stop offset="1" stop-color="#c9b58f"/></linearGradient>
              <linearGradient id="crystalG" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f3dcff"/><stop offset="0.5" stop-color="#c77dff"/><stop offset="1" stop-color="#6a2fb0"/></linearGradient>
              <linearGradient id="firK" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#1c4d33"/><stop offset="0.5" stop-color="#3f8f5a"/><stop offset="1" stop-color="#245a3a"/></linearGradient>
              <filter id="softK" x="-20%" y="-20%" width="140%" height="160%"><feGaussianBlur stdDeviation="1.2"/></filter>
              <filter id="glow" x="-100%" y="-100%" width="300%" height="300%"><feGaussianBlur stdDeviation="1.4"/></filter>
            </defs>
            <rect width="300" height="72" fill="url(#skyK)"/>
            <g fill="#fff"><circle class="twinkle" cx="130" cy="10" r="1"/><circle class="twinkle t2" cx="180" cy="20" r="1.2"/><circle class="twinkle t3" cx="230" cy="8" r="0.9"/><circle class="twinkle t2" cx="270" cy="26" r="1"/><circle class="twinkle t3" cx="150" cy="30" r="0.8"/><circle class="twinkle" cx="205" cy="34" r="0.7"/></g>
            <circle cx="255" cy="16" r="20" fill="url(#moonGlow)"/><circle cx="255" cy="16" r="8" fill="#f2f4ff"/><circle cx="259" cy="14" r="7" fill="#3a2a63"/>
            <path d="M0 56 Q50 44 110 52 T220 46 T300 50 V72 H0 Z" fill="#5c8fb0" opacity="0.5"/>
            <path d="M0 60 Q70 48 140 58 T300 56 V72 H0 Z" fill="url(#hillKFar)"/>
            <path d="M0 65 Q90 56 180 64 T300 62 V72 H0 Z" fill="url(#hillKNear)"/>
            <path d="M0 65 Q90 56 180 64" stroke="#9fe0c0" stroke-width="1.2" fill="none" opacity="0.6"/>
            <ellipse cx="50" cy="64" rx="18" ry="3" fill="rgba(0,0,0,0.3)" filter="url(#softK)"/><ellipse cx="71" cy="64.5" rx="10" ry="2" fill="rgba(0,0,0,0.3)" filter="url(#softK)"/>
            <ellipse cx="106" cy="63" rx="11" ry="2.2" fill="rgba(0,0,0,0.3)" filter="url(#softK)"/><ellipse cx="128" cy="64.5" rx="7" ry="1.6" fill="rgba(0,0,0,0.3)" filter="url(#softK)"/><ellipse cx="290" cy="64.5" rx="8" ry="1.8" fill="rgba(0,0,0,0.3)" filter="url(#softK)"/>
            <ellipse cx="22" cy="64.5" rx="9" ry="2" fill="rgba(0,0,0,0.3)" filter="url(#softK)"/>
            <g class="sway"><path d="M96 62 L106 32 L116 62 Z" fill="url(#firK)"/><path d="M99 52 L106 36 L113 52 Z" fill="#4aa86a"/><path d="M106 32 L116 62 L106 62 Z" fill="rgba(0,0,0,0.2)"/></g>
            <g class="sway s3"><path d="M282 64 L290 44 L298 64 Z" fill="url(#firK)"/><path d="M290 44 L298 64 L290 64 Z" fill="rgba(0,0,0,0.2)"/></g>
            <path d="M14 64 L20 44 L26 64 Z" fill="url(#crystalG)"/><path d="M14 64 L20 44 L21 60 Z" fill="rgba(255,255,255,0.35)"/><path d="M23 64 L27 52 L31 64 Z" fill="url(#crystalG)"/><path d="M20 44 L26 64 L22 64 Z" fill="rgba(60,10,110,0.35)"/>
            <ellipse cx="20" cy="50" rx="9" ry="9" fill="#c77dff" opacity="0.18" filter="url(#glow)"/>
            <g class="sway s2"><rect x="46" y="40" width="9" height="24" rx="3" fill="url(#stemG)"/><ellipse cx="50" cy="42" rx="14" ry="2.8" fill="#b0444a"/><path d="M36 42 a14 12 0 0 1 28 0 z" fill="url(#capR)"/><circle cx="43" cy="35" r="2.2" fill="#fff"/><circle cx="52" cy="31" r="2.6" fill="#fff"/><circle cx="58" cy="37" r="1.8" fill="#fff"/><path d="M40 36 a10 6 0 0 1 8 -5" stroke="rgba(255,255,255,0.35)" stroke-width="1.5" fill="none" stroke-linecap="round"/></g>
            <g class="sway s3"><rect x="68" y="50" width="6" height="14" rx="2" fill="url(#stemG)"/><ellipse cx="71" cy="51" rx="10" ry="2" fill="#8f2f57"/><path d="M61 51 a10 8 0 0 1 20 0 z" fill="url(#capP)"/><circle cx="67" cy="46" r="1.4" fill="#fff"/><circle cx="74" cy="47" r="1.6" fill="#fff"/></g>
            <g class="sway"><rect x="126" y="54" width="5" height="10" rx="2" fill="url(#stemG)"/><ellipse cx="128.5" cy="55" rx="8.5" ry="1.6" fill="#a3701f"/><path d="M120 55 a8.5 7 0 0 1 17 0 z" fill="url(#capY)"/></g>
            <g class="particles">
              <circle class="p" cx="40" cy="60" r="1.6" fill="#ff7fd8"/><circle class="p p2" cx="62" cy="64" r="1.3" fill="#7fe8ff"/><circle class="p p3" cx="84" cy="62" r="1.5" fill="#ffd166"/>
              <circle class="p p4" cx="110" cy="66" r="1.2" fill="#d8ff70"/><circle class="p p2" cx="22" cy="66" r="1.4" fill="#7fe8ff"/><circle class="p p5" cx="134" cy="60" r="1.3" fill="#ff7fd8"/>
              <circle class="p p3" cx="160" cy="64" r="1.1" fill="#ffd166"/><circle class="p p5" cx="200" cy="66" r="1.4" fill="#d8ff70"/><circle class="p p4" cx="240" cy="62" r="1.2" fill="#7fe8ff"/>
            </g>
          </svg>`;

  const SCENE_STORM = `<svg class="mode-scene" viewBox="0 0 300 72" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs><linearGradient id="skyS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#070a1e"/><stop offset="1" stop-color="#2a2f66"/></linearGradient>
              <linearGradient id="isleS" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#6f7d63"/><stop offset="0.3" stop-color="#3b3f5a"/><stop offset="1" stop-color="#1c1f33"/></linearGradient></defs>
            <rect width="300" height="72" fill="url(#skyS)"/>
            <g class="particles"><circle class="p" cx="24" cy="9" r="1.1" fill="#fff"/><circle class="p p3" cx="140" cy="7" r="1" fill="#fff"/><circle class="p p5" cx="262" cy="12" r="1.2" fill="#fff"/></g>
            <polyline points="196,0 190,16 199,18 186,38" fill="none" stroke="#fff6a8" stroke-width="2.2" stroke-linejoin="round" class="art-flash"/>
            <path d="M22 40 L78 40 L70 60 L32 62 Z" fill="url(#isleS)"/><rect x="26" y="34" width="48" height="6" fill="#6f7d63"/><rect x="40" y="22" width="3" height="12" fill="#4e526d"/><circle cx="41.5" cy="21" r="2" fill="#fff6a8"/>
            <path d="M120 44 L176 44 L168 62 L128 64 Z" fill="url(#isleS)"/><rect x="124" y="38" width="48" height="6" fill="#6f7d63"/>
            <ellipse cx="240" cy="28" rx="30" ry="10" fill="#9a8f7a"/><ellipse cx="240" cy="28" rx="30" ry="10" fill="none" stroke="#5a5244" stroke-width="1"/><rect x="226" y="38" width="28" height="7" rx="2" fill="#6b4a2a"/><line x1="232" y1="38" x2="230" y2="32" stroke="#3a2814"/><line x1="248" y1="38" x2="250" y2="32" stroke="#3a2814"/>
            <circle cx="100" cy="18" r="9" fill="#e05a5a"/><circle cx="100" cy="18" r="9" fill="none" stroke="#7a1e2a"/><rect x="97" y="30" width="6" height="5" fill="#b58a4a"/><line x1="94" y1="24" x2="97" y2="30" stroke="#d9c39a"/><line x1="106" y1="24" x2="103" y2="30" stroke="#d9c39a"/>
            <path d="M0 62 Q30 54 60 62 T120 62 T180 62 T240 62 T300 62 L300 72 L0 72 Z" fill="#15182e"/>
          </svg>`;
  const SCENE_SHADOW = `<svg class="mode-scene" viewBox="0 0 300 72" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs><linearGradient id="skyD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#04030a"/><stop offset="1" stop-color="#1c1030"/></linearGradient></defs>
            <rect width="300" height="72" fill="url(#skyD)"/>
            <circle cx="236" cy="18" r="13" fill="#b8323c"/><circle cx="231" cy="14" r="3" fill="rgba(0,0,0,0.25)"/><circle cx="241" cy="22" r="2" fill="rgba(0,0,0,0.25)"/>
            <path d="M0 50 Q40 40 80 50 T160 48 T240 52 T300 46 L300 72 L0 72 Z" fill="#0e0a18"/>
            <g fill="#1a1428"><rect x="40" y="40" width="9" height="14"/><circle cx="44.5" cy="40" r="4.5"/><rect x="72" y="44" width="8" height="12"/><circle cx="76" cy="44" r="4"/><rect x="118" y="42" width="3" height="14"/><rect x="112" y="46" width="15" height="3"/><rect x="180" y="43" width="9" height="13"/><circle cx="184.5" cy="43" r="4.5"/></g>
            <path d="M150 54 L150 26 M150 36 L140 28 M150 32 L160 24 M150 44 L142 40" stroke="#1a1428" stroke-width="3" fill="none" stroke-linecap="round"/>
            <g class="particles"><circle class="p" cx="60" cy="30" r="2.2" fill="#c58bff"/><circle class="p p2" cx="100" cy="36" r="1.8" fill="#c58bff"/><circle class="p p4" cx="205" cy="34" r="2" fill="#c58bff"/><circle class="p p3" cx="270" cy="40" r="1.6" fill="#c58bff"/></g>
            <path d="M92 52 a6 6 0 0 1 12 0 v8 l-2 -2 l-2 2 l-2 -2 l-2 2 l-2 -2 l-2 2 z" fill="rgba(230,235,255,0.85)"/><circle cx="96" cy="52" r="1.2" fill="#1a1030"/><circle cx="100" cy="52" r="1.2" fill="#1a1030"/>
          </svg>`;
  function showTitle() {
    state.phase = 'title'; state.editorReturn = false; Music.set('title');
    document.body.classList.add('title');
    document.body.classList.remove('creative', 'editing', 'testing');
    overlay(`<div class="panel">
      <h1>⛳ Fantasy Golf</h1>
      <div class="sub">Golf with your Friends · ${WORLDS.length} Welten, ${WORLDS.reduce((a, w) => a + w.courses.length, 0)} magische Bahnen in 2,5D</div>
      <div class="modes">
        <span class="btn mode" id="to-map">${WorldMap.svg('mode-scene', 'xMidYMid slice')}<span class="mode-label">Weltkarte</span></span>
        <span class="btn mode" id="to-build">${SCENE_CREATIVE}<span class="mode-label long">Bauen &amp; Eigene Welt</span></span>
      </div>
      <div class="legend">Alle Welten sind von Anfang an offen. Die Stufe an jedem Ort sagt nur, was dich erwartet.</div>
    </div>`, 'title');
    $('to-map').addEventListener('click', () => { Sfx.unlock(); Music.start(); showMap(); });
    $('to-build').addEventListener('click', () => { Sfx.unlock(); Music.start(); showBuild(); });
  }

  /* Weltkarte: alle Welten auf einen Blick, jede sofort spielbar */
  const MODE_NAME = { normal: 'Normal', pro: 'Profi', legend: 'Legende' };
  function showMap() {
    state.phase = 'title'; state.editorReturn = false; Music.set('title');
    document.body.classList.add('title');
    document.body.classList.remove('creative', 'editing', 'testing');
    const marks = WORLDS.map(w => {
      const sp = WorldMap.spots[w.id]; if (!sp) return '';
      const m = worldMode(w);
      return `<button class="spot" style="left:${sp.x}%;top:${sp.y}%;--pin:${sp.col}" data-world="${w.id}" title="${w.name}">
        <span class="spot-pin">${sp.icon}</span>
        <span class="spot-label"><b>${w.name}</b><i>${MODE_ICON[m]} ${MODE_NAME[m]} · ${w.courses.length} Bahnen</i></span></button>`;
    }).join('');
    overlay(`<div class="panel atlas-panel">
      <div class="panel-head"><span class="btn ghost small" id="back">◀ Zurück</span><h2>🗺 Weltkarte</h2></div>
      <div class="sub">Tippe einen Ort an – alle ${WORLDS.length} Welten sind von Anfang an offen.</div>
      <div class="atlas">${WorldMap.svg()}${marks}</div>
      <div class="atlas-extra"><span class="btn small ghost" id="to-build2">🛠 Bauen &amp; Eigene Welt</span></div>
    </div>`, 'title');
    ui.overlay.querySelectorAll('.spot').forEach(b => b.addEventListener('click', () => { Sfx.unlock(); setWorld(b.dataset.world); showSetup(); }));
    $('to-build2').addEventListener('click', showBuild);
    $('back').addEventListener('click', showTitle);
  }

  /* Bauen und eigene Welt */
  function showBuild() {
    state.phase = 'title'; document.body.classList.add('title'); document.body.classList.remove('creative', 'editing', 'testing');
    const own = editor.worldCourses();
    overlay(`<div class="panel">
      <div class="panel-head"><span class="btn ghost small" id="back">◀ Zurück</span><h2>🛠 Bauen &amp; Eigene Welt</h2></div>
      <div class="sub">Baue eigene Bahnen und stelle daraus eine eigene Welt zusammen.</div>
      <div class="modes">
        <span class="btn mode build" id="build"><span class="mode-label">🛠 Bahn bauen</span></span>
        ${own.length ? `<span class="btn mode own" id="own-play"><span class="mode-label">🌍 Eigene Welt (${own.length} Bahn${own.length > 1 ? 'en' : ''})</span></span>` : ''}
      </div>
      ${own.length ? '' : '<div class="legend">Noch keine eigene Bahn gebaut. Im Editor wird sie mit „Fertig“ in die Eigene Welt eingesetzt.</div>'}
      <p><span class="btn ghost small back2">◀ Zurück</span></p>
    </div>`, 'title');
    $('build').addEventListener('click', () => { Sfx.unlock(); setControlMode('sling'); editor.open(null); });
    if (own.length) $('own-play').addEventListener('click', () => { Sfx.unlock(); setControlMode('sling'); playWorld(own); });
    ui.overlay.querySelectorAll('#back, .back2').forEach(b => b.addEventListener('click', showMap));
  }

  const sceneFor = id => ({ normal: SCENE_NORMAL, sea: SCENE_SEA, pro: SCENE_PRO, jungle: SCENE_JUNGLE, storm: SCENE_STORM, shadow: SCENE_SHADOW })[id] || SCENE_NORMAL;
  const MODE_ICON = { normal: '🏆', pro: '🔥', legend: '⚡' };
  const worldMode = w => (w && w.mode) || 'normal';
  function setWorld(id) { state.world = WORLDS.find(w => w.id === id) || WORLDS[0]; state.courses = state.world.courses; Music.set(state.world.id); }

  const showWorldSelect = () => showMap(); // der Editor kehrt über diesen Weg ins Menü zurück
  function setCustomWorld(courses, name) { state.world = { id: 'custom', name, short: 'Eigene', courses }; state.courses = courses; Music.set('custom'); }
  function playWorld(courses) { state.mode = 'creative'; state.editorReturn = false; setCustomWorld(courses, 'Eigene Welt'); document.body.classList.remove('editing', 'testing'); startGame(1, 0); }
  /* Baumodus: eine Bahn probespielen, danach zurück in den Editor */
  function startTest(def) {
    state.mode = 'creative'; state.editorReturn = true;
    setCustomWorld([def], 'Test');
    document.body.classList.add('testing');
    startGame(1, 0);
  }

  function showSetup() {
    overlay(`<div class="panel">
      <div class="panel-head"><span class="btn ghost small" id="back-top">◀ Zurück</span><h2>${MODE_ICON[worldMode(state.world)]} ${state.world.name}</h2></div>
      <div class="sub">${MODE_NAME[worldMode(state.world)]} · ${state.courses.length} Bahnen</div>
      <p>Modus:</p>
      <div id="gm">
        <span class="btn ghost small ${gameMode === 'normal' ? 'sel' : ''}" data-g="normal">🏆 Wettkampf</span>
        <span class="btn ghost small ${gameMode === 'creative' ? 'sel' : ''}" data-g="creative">🛠 Kreativ</span>
      </div>
      <div id="pc-row" ${gameMode === 'creative' ? 'hidden' : ''}>
        <p style="margin-top:10px">Spieler:</p>
        <div id="pc">${[1, 2, 3, 4].map(n => `<span class="btn ghost small ${n === playerCount ? 'sel' : ''}" data-n="${n}">${n}</span>`).join('')}</div>
      </div>
      <p style="margin-top:10px">Hut:</p>
      <div id="hat-who"></div>
      <div id="hats" class="hat-grid">${Hats.LIST.map(h => `<button type="button" class="hat" data-h="${h.id}" title="${h.name}"><canvas></canvas><span>${h.name}</span></button>`).join('')}</div>
      <p style="margin-top:10px">Musik:</p>
      <div id="mu">
        <span class="btn ghost small ${Music.on ? 'sel' : ''}" data-v="1">An</span>
        <span class="btn ghost small ${Music.on ? '' : 'sel'}" data-v="0">Aus</span>
      </div>
      <p style="margin-top:10px">Steuerung:</p>
      <div id="cm">
        <span class="btn ghost small ${state.controlMode === 'sling' ? 'sel' : ''}" data-m="sling">Schleuder</span>
        <span class="btn ghost small ${state.controlMode === 'push' ? 'sel' : ''}" data-m="push">Schieben</span>
      </div>
      <p style="margin-top:14px"><span class="btn ghost small" id="back">◀ Zurück</span> <span class="btn" id="start">Los geht's!</span></p>
      <div class="legend">
        <b>Wettkampf:</b> alle Bahnen der Reihe nach, mit Schlaglimit und Ergebnistafel. <b>Kreativ:</b> allein, ohne Limit, mit „◀ Bahn“ / „Bahn ▶“ frei springen.<br>
        Aufsetzen, ziehen, loslassen. Weiter ziehen = mehr Kraft.
        <b>Schleuder:</b> vom Ball wegziehen, er fliegt in die Gegenrichtung. <b>Schieben:</b> dorthin ziehen, wo der Ball hin soll.
        Wasser, Lava und Abgrund kosten einen Strafschlag.
      </div>
    </div>`, 'title');
    /* Hutwahl: oben steht, für welchen Spieler gewählt wird, darunter die Hüte als Ballvorschau */
    let hatWho = 0;
    const hatCount = () => gameMode === 'creative' ? 1 : playerCount;
    function drawHats() {
      const col = PLAYER_COLORS[hatWho];
      ui.overlay.querySelectorAll('#hats .hat').forEach(b => {
        b.classList.toggle('sel', b.dataset.h === playerHats[hatWho]);
        Hats.preview(b.querySelector('canvas'), b.dataset.h, col);
      });
    }
    function drawWho() {
      const n = hatCount();
      if (hatWho >= n) hatWho = 0;
      const box = $('hat-who');
      box.hidden = n < 2;
      box.innerHTML = n < 2 ? '' : PLAYER_NAMES.slice(0, n).map((name, i) =>
        `<span class="btn ghost small hat-who ${i === hatWho ? 'sel' : ''}" data-i="${i}"><span class="dot" style="background:${PLAYER_COLORS[i]}"></span>${name}</span>`).join('');
      box.querySelectorAll('.hat-who').forEach(b => b.addEventListener('click', () => {
        hatWho = +b.dataset.i; drawWho(); drawHats();
      }));
    }
    ui.overlay.querySelectorAll('#hats .hat').forEach(b => b.addEventListener('click', () => {
      Sfx.unlock(); setHat(hatWho, b.dataset.h); drawWho(); drawHats();
    }));
    drawWho(); drawHats();
    ui.overlay.querySelectorAll('#pc .btn').forEach(b => b.addEventListener('click', () => {
      playerCount = +b.dataset.n;
      ui.overlay.querySelectorAll('#pc .btn').forEach(x => x.classList.toggle('sel', +x.dataset.n === playerCount));
      drawWho(); drawHats();
    }));
    ui.overlay.querySelectorAll('#cm .btn').forEach(b => b.addEventListener('click', () => {
      setControlMode(b.dataset.m);
      ui.overlay.querySelectorAll('#cm .btn').forEach(x => x.classList.toggle('sel', x.dataset.m === state.controlMode));
    }));
    ui.overlay.querySelectorAll('#mu .btn').forEach(b => b.addEventListener('click', () => {
      Sfx.unlock(); Music.setOn(b.dataset.v === '1'); syncMusicBtn();
      ui.overlay.querySelectorAll('#mu .btn').forEach(x => x.classList.toggle('sel', (x.dataset.v === '1') === Music.on));
    }));
    ui.overlay.querySelectorAll('#gm .btn').forEach(b => b.addEventListener('click', () => {
      gameMode = b.dataset.g;
      ui.overlay.querySelectorAll('#gm .btn').forEach(x => x.classList.toggle('sel', x.dataset.g === gameMode));
      $('pc-row').hidden = gameMode === 'creative';
      drawWho(); drawHats();
    }));
    for (const id of ['back', 'back-top']) $(id).addEventListener('click', showMap);
    $('start').addEventListener('click', () => { Sfx.unlock(); state.mode = gameMode; startGame(gameMode === 'creative' ? 1 : playerCount, 0); });
  }

  /* Endtafel: kleines Sinnbild je Bahn (nach Name, sonst nach Optik) */
  const HOLE_ICONS = { Elfenwiese: '🌼', Pilzhain: '🍄', Zwergenschmiede: '⚒️', Zauberwald: '🔮', Drachenhöhle: '🐉', Eisgrotte: '❄️', Wolkenburg: '☁️', Hexenturm: '🧙', Burgberg: '🏰',
    Strandbucht: '🏖️', Muschelriff: '🐚', Fischerpier: '🎣', Krakengrotte: '🐙', Piratendeck: '🏴‍☠️', Leuchtturmfelsen: '🗼', Schiffswrack: '🚢', Perlengrotte: '🦪', Sturmsee: '🌊', Haifischbucht: '🦈',
    Mühlenwiese: '🌾', Nebelmoor: '🌫️', Zwergenkanone: '💣', Korallenriff: '🪸', Uhrwerk: '⚙️', Piratenbucht: '⚓', Hexenküche: '🧪', Sultanspalast: '🕌', Pyramide: '🔺',
    Urwaldpfad: '🌿', Affenbrücke: '🐒', Krokodilfluss: '🐊', Stachelpfad: '🗡️', Felskugelschlucht: '🪨', Treibsandbecken: '⏳', Totemplatz: '🗿', Wasserfallterrassen: '💧', 'Der Tempel': '🏛️',
    Friedhofspforte: '🪦', Knochensteg: '🦴', Fallbeilgasse: '🔪', Rabenschlucht: '🐦‍⬛', Ritterhalle: '⚔️', Totenfähre: '⚰️', 'Turm des Auges': '👁️', Schattenschloss: '🏰', 'Gruft der Sensen': '🕯️', 'Herz der Finsternis': '🖤' };
  const THEME_ICONS = { meadow: '🌼', mushroom: '🍄', forge: '⚒️', forest: '🌲', dragon: '🐉', ice: '❄️', sky: '☁️', witch: '🧙', castle: '🏰', harbor: '⚓', reef: '🐠', clockwork: '⚙️', palace: '🕌', desert: '🏜️', tomb: '⚱️', deck: '🏴‍☠️', wreck: '🚢', belly: '🦈', jungle: '🌴', temple: '🗿', hut: '🧪', storm: '⛈️', fortress: '🏯', shadow: '🌑', throne: '👑', darksea: '🌊', ghostship: '⚓' };
  const holeIcon = def => HOLE_ICONS[def.name] || THEME_ICONS[def.theme] || '⛳';
  const worldClass = () => 'world-' + ((state.world && state.world.id) || 'custom');
  const diffClass = (strokes, par) => strokes === 1 ? 'ace' : strokes - par <= -2 ? 'eagle' : strokes - par === -1 ? 'birdie' : strokes === par ? 'par' : strokes - par === 1 ? 'bogey' : 'worse';

  function scoreName(strokes, par) {
    if (strokes === 1) return 'Hole-in-One!';
    const d = strokes - par;
    if (d <= -3) return 'Albatros!'; if (d === -2) return 'Eagle!'; if (d === -1) return 'Birdie!';
    if (d === 0) return 'Par'; if (d === 1) return 'Bogey'; if (d === 2) return 'Doppel-Bogey';
    return `+${d}`;
  }

  /* ---------- Kamera ---------- */
  function thetaTowards(fromX, fromY, toX, toY) { // Blickrichtung so, dass "to" oben im Bild liegt
    const dx = toX - fromX, dy = toY - fromY;
    return Math.hypot(dx, dy) < 0.01 ? state.camTheta : Math.atan2(-dx, -dy);
  }
  function faceCup() {
    const b = state.ball;
    // Blickzonen: liegt der Ball in einer Zone, schaut die Kamera auf deren Zielpunkt (z. B. Mühlentür, Fähre), sonst aufs Loch
    const zone = (state.level.def.views || []).find(v => b.x >= v.x && b.x <= v.x + v.w && b.y >= v.y && b.y <= v.y + v.h);
    const c = zone ? zone.look : (state.level.cup || state.level.goal);
    state.camTheta = thetaTowards(b.x, b.y, c.x, c.y);
  }
  function setCamMode(mode) {
    state.camMode = mode;
    $('cam-overview').classList.toggle('sel', mode === 'overview');
  }
  function updateCamera(dt) {
    if (!state.level) return;
    if (state.phase === 'edit') R.target = editor.cameraTarget();
    else if (state.camMode === 'overview' || !state.ball) R.target = R.overviewTarget();
    else R.target = R.followTarget(state.ball, state.camTheta, R.defaultZoom() * state.zoomFactor);
    R.updateCamera(dt);
  }

  /* ---------- Spielablauf ---------- */
  function startGame(n, first = 0) {
    state.players = Array.from({ length: n }, (_, i) => ({ name: PLAYER_NAMES[i], color: PLAYER_COLORS[i], hat: playerHats[i], scores: [] }));
    state.holeIdx = first;
    document.body.classList.remove('title');
    document.body.classList.toggle('creative', state.mode === 'creative');
    hideOverlay();
    loadHole(first);
  }
  /* Kreativmodus: Bahn wechseln oder Ball an den Abschlag setzen */
  function jumpHole(delta) {
    if (state.mode !== 'creative' || !state.level || state.phase === 'edit') return;
    clearTimeout(waitTimer); hideOverlay();
    loadHole((state.holeIdx + delta + state.courses.length) % state.courses.length);
  }
  function resetBall() {
    if (state.mode !== 'creative' || !state.ball || state.phase === 'edit') return;
    clearTimeout(waitTimer);
    state.strokes = 0; beginTurn();
  }
  function loadLevelPreview(i) {
    const def = state.courses[i];
    state.level = buildLevel(def); state.theme = THEMES[def.theme]; state.inner = false;
    R.setLevel(state.level, state.theme);
    state.ball = null; state.aim = null;
    setCamMode('overview'); R.target = R.overviewTarget(); R.snapCamera();
  }
  function loadHole(i) {
    state.holeIdx = i; state.phase = 'loading';
    loadLevelPreview(i);
    state.particles = [];
    state.curPlayer = 0;
    showMessage(`Bahn ${i + 1}: ${state.courses[i].name}`, 2200);
    setTimeout(beginTurn, 900);
  }
  function beginTurn() {
    if (state.inner) { // zurück in den Außenbereich der Bahn
      const def = state.courses[state.holeIdx];
      state.level = buildLevel(def); state.theme = THEMES[def.theme]; state.inner = false;
      R.setLevel(state.level, state.theme);
    }
    const p = state.players[state.curPlayer], lv = state.level;
    state.ball = makeBall(lv.tee.x, lv.tee.y, p.color, p.hat);
    state.strokes = 0; state.phase = 'aim'; state.aim = null; state.restTimer = 0; state.slowTimer = 0; state.rollT = 0; state.stuckRef = null;
    faceCup(); setCamMode('follow');
    if (state.players.length > 1) showMessage(`${p.name} ist dran`, 1300);
    updateHud();
  }
  function shoot(dx, dy, power) {
    const b = state.ball;
    b.restX = b.x; b.restY = b.y; b.shotX = b.x; b.shotY = b.y; // Schlagstart (für Aufspießen am Ruheplatz)
    b.vx = dx * power * MAX_SHOT; b.vy = dy * power * MAX_SHOT;
    state.strokes++; state.phase = 'rolling'; state.aim = null; state.restTimer = 0; state.slowTimer = 0; state.rollT = 0; state.stuckRef = null;
    Sfx.hit(power); updateHud();
  }
  /* Festgefahrener Ball: anhalten; liegt er in der Fahrspur eines bewegten Hindernisses, auf die nächste freie Kachel daneben setzen */
  function freeStuckBall() {
    const b = state.ball, lv = state.level;
    b.vx = 0; b.vy = 0; state.rollT = 0; state.stuckRef = null;
    const lanes = lv.obstacles.filter(o => o.type === 'mover').map(o => ({ x0: Math.min(o.x0, o.x1) - o.w / 2 - b.r, x1: Math.max(o.x0, o.x1) + o.w / 2 + b.r, y0: Math.min(o.y0, o.y1) - o.h / 2 - b.r, y1: Math.max(o.y0, o.y1) + o.h / 2 + b.r }));
    const inLane = (x, y) => lanes.some(l => x > l.x0 && x < l.x1 && y > l.y0 && y < l.y1);
    if (inLane(b.x, b.y)) {
      let best = null, bd = Infinity;
      for (let ty = 0; ty < lv.H; ty++) for (let tx = 0; tx < lv.W; tx++) {
        const c = lv.tiles[ty][tx]; if (!lv.isFloorChar(c) || c === 'w' || c === 'l' || c === 'o') continue;
        const cx = tx + 0.5, cy = ty + 0.5; if (inLane(cx, cy)) continue;
        const d = Math.hypot(cx - b.x, cy - b.y); if (d < bd) { bd = d; best = [cx, cy]; }
      }
      if (best && bd < 6) { b.x = best[0]; b.y = best[1]; b.z = 0.4; b.vz = 0; burst(b.x, b.y, '#ffffff', 8, true); showMessage('Der Ball wurde freigelegt', 1300); }
    }
    ballAtRest();
  }
  function ballAtRest() {
    const b = state.ball;
    b.vx = 0; b.vy = 0; b.restX = b.x; b.restY = b.y;
    faceCup();
    if (state.strokes >= maxStrokes()) { showMessage(`Maximale Schlagzahl (${maxStrokes()}) erreicht`, 1800); finishTurn(maxStrokes()); return; }
    state.phase = 'aim';
  }
  function finishTurn(score) {
    state.players[state.curPlayer].scores[state.holeIdx] = score;
    state.phase = 'wait'; state.aim = null; updateHud();
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      state.curPlayer++;
      if (state.curPlayer < state.players.length) beginTurn(); else showHoleDone();
    }, 1700);
  }
  function hazard(type) {
    const b = state.ball;
    const custom = state.level.def.hazardText && state.level.def.hazardText[type];
    let label = custom || (type === 'water' ? 'Platsch! Wasser' : type === 'lava' ? 'Zischhh! Lava' : type === 'shark' ? 'Vom Hai gefressen!' : type === 'spiked' ? 'Aufgespießt!' : type === 'zapped' ? 'Vom Blitz getroffen!' : type === 'fell' ? 'In die Tiefe gestürzt!' : type === 'beheaded' ? 'Vom Fallbeil geköpft!' : type === 'seen' ? 'Vom brennenden Auge erblickt!' : 'Aus! Abgrund');
    if (type === 'shark') { if (state.level.obstacles.some(o => o.type === 'sharkjump' && o.style === 'bat')) { Sfx.screech(); burst(b.x, b.y, '#6a4a9a', 26, true); } else { Sfx.water(); burst(b.x, b.y, '#ff5a5a', 22, true); } b.z = 0; b.vz = 0; b.air = false; }
    else if (type === 'water') { Sfx.water(); burst(b.x, b.y, '#9fd3ff', 18); }
    else if (type === 'lava') { Sfx.lava(); burst(b.x, b.y, '#ffb347', 18); }
    else if (type === 'spiked' || type === 'zapped' || type === 'fell') { // zurück zum Start des letzten Schlags
      if (type === 'zapped') { Sfx.thunder(); burst(b.x, b.y, '#fff27a', 34, true); burst(b.x, b.y, '#ffffff', 16, true); } else if (type === 'fell') { Sfx.oob(); burst(b.x, b.y, '#b56bff', 14, true); } else { Sfx.lava(); burst(b.x, b.y, '#e6e6e6', 18, true); }
      b.z = 0; b.vz = 0; b.air = false; if (b.shotX != null) { b.restX = b.shotX; b.restY = b.shotY; }
    }
    else if (type === 'beheaded' || type === 'seen') { // zurück zum Schlagstart – aber nie wieder unter die Klinge oder in den Blick des Auges
      Sfx.lava(); burst(b.x, b.y, type === 'seen' ? '#ff9a3a' : '#ff4a4a', 26, true);
      b.z = 0; b.vz = 0; b.air = false;
      const lv = state.level; let rx = b.shotX != null ? b.shotX : b.restX, ry = b.shotX != null ? b.shotY : b.restY;
      if (type === 'seen') { if (lv.obstacles.some(o => o.type === 'eyetower' && Math.hypot(rx - o.x, ry - o.y) <= o.range + 0.5)) { rx = lv.tee.x; ry = lv.tee.y; label += ' Zurück zum Anfang.'; } }
      else for (const g of lv.obstacles) {
        if (g.type !== 'guillotine' || !g.under(rx, ry, 0.7)) continue;
        const vert = g.w < g.h, side = (vert ? Math.sign(lv.tee.x - g.x) : Math.sign(lv.tee.y - g.y)) || -1;
        for (const sd of [side, -side]) { const px = vert ? g.x + sd * (g.w / 2 + 0.9) : g.x, py = vert ? g.y : g.y + sd * (g.h / 2 + 0.9); if (lv.isFloorChar(lv.charAt(px, py))) { rx = px; ry = py; break; } }
      }
      b.restX = rx; b.restY = ry;
    }
    else { Sfx.oob(); burst(b.x, b.y, '#cccccc', 10); }
    state.strokes++;
    showMessage(`${label} · +1 Strafschlag`, 1700);
    state.phase = 'wait'; state.aim = null;
    const rx = b.restX, ry = b.restY;
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      b.x = rx; b.y = ry; b.vx = 0; b.vy = 0; b.z = 0.6; b.vz = 0; b.portalCd = 0.5;
      faceCup();
      if (state.strokes >= maxStrokes()) finishTurn(maxStrokes()); else state.phase = 'aim';
      updateHud();
    }, 900);
    updateHud();
  }
  function sunk() {
    const par = state.courses[state.holeIdx].par;
    Sfx.sink();
    burst(state.level.cup.x, state.level.cup.y, state.theme.accent, 26, true);
    showMessage(`${scoreName(state.strokes, par)}  (${state.strokes} Schläge)`, 1800);
    const b = state.ball;
    b.vx = 0; b.vy = 0; b.x = state.level.cup.x; b.y = state.level.cup.y; b.z = 0; b.vz = 0;
    b.sunk = true; b.sinkT = 0; // Fall-Animation ins Loch, danach unsichtbar
    finishTurn(state.strokes);
  }
  function showHoleDone() {
    state.phase = 'summary'; clearTimeout(msgTimer); ui.msg.classList.remove('visible');
    const def = state.courses[state.holeIdx], last = state.holeIdx === state.courses.length - 1;
    const rows = state.players.map(p => {
      const total = p.scores.reduce((a, b) => a + b, 0);
      const hat = p.hat && p.hat !== 'none' ? `<span title="${Hats.name(p.hat)}">${Hats.icon(p.hat)}</span> ` : '';
      return `<tr><td><span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px"></span>${hat}${p.name}</td><td class="num">${p.scores[state.holeIdx]}</td><td class="num">${total}</td></tr>`;
    }).join('');
    overlay(`<div class="panel ${worldClass()}">
      <h2>${holeIcon(def)} Bahn ${state.holeIdx + 1}: ${def.name}</h2>
      <div class="sub">Par ${def.par}</div>
      <table class="scores"><tr><th>Spieler</th><th>Bahn</th><th>Gesamt</th></tr>${rows}</table>
      ${!last ? `<div class="sub">Als Nächstes: <b>${state.courses[state.holeIdx + 1].name}</b><br><i>${state.courses[state.holeIdx + 1].intro}</i></div>` : ''}
      <span class="btn" id="next">${state.editorReturn ? '🛠 Zurück zum Editor' : last ? 'Zum Endergebnis' : 'Nächste Bahn ▶'}</span>
    </div>`);
    $('next').addEventListener('click', () => { hideOverlay(); if (state.editorReturn) editor.returnFromTest(); else if (last) { if (state.mode === 'creative') loadHole(0); else showFinal(); } else loadHole(state.holeIdx + 1); });
  }
  function showFinal() {
    state.phase = 'final'; clearTimeout(msgTimer); ui.msg.classList.remove('visible'); // keine Laufmeldung über der Tafel
    const parTotal = state.courses.reduce((a, c) => a + c.par, 0);
    const ranked = state.players.map(p => ({ p, total: p.scores.reduce((a, b) => a + b, 0) })).sort((a, b) => a.total - b.total);
    const medals = ['🥇', '🥈', '🥉', '4.'];
    const vsPar = d => d === 0 ? 'Par' : (d > 0 ? '+' : '') + d;
    const podium = ranked.map((r, i) => `<div class="pod ${i === 0 ? 'win' : ''}">
        <span class="pod-medal">${medals[i]}</span>
        <span class="pod-dot" style="background:${r.p.color}"></span>
        <span class="pod-name">${r.p.name}</span>
        <span class="pod-total">${r.total}</span>
        <span class="pod-par ${r.total - parTotal < 0 ? 'under' : r.total - parTotal > 0 ? 'over' : ''}">${vsPar(r.total - parTotal)}</span>
      </div>`).join('');
    // je Bahn eine Karte: Nummer, Sinnbild, Name, Par und die Schläge aller Spieler (farbig nach Ergebnis)
    const cards = state.courses.map((c, i) => `<div class="hole-card">
        <div class="hc-top"><span class="hc-num">${i + 1}</span><span class="hc-icon">${holeIcon(c)}</span></div>
        <div class="hc-name">${c.name}</div>
        <div class="hc-par">Par ${c.par}</div>
        <div class="hc-scores">${state.players.map(p => `<span class="hc-score ${diffClass(p.scores[i], c.par)}" style="border-color:${p.color}" title="${p.name}">${p.scores[i]}</span>`).join('')}</div>
      </div>`).join('');
    const best = state.players.length > 1 ? '' : (() => { // Solo: kleine Bilanz
      const p = state.players[0]; const n = k => p.scores.filter((s, i) => diffClass(s, state.courses[i].par) === k).length;
      const parts = [['ace', 'Hole-in-One'], ['eagle', 'Eagle'], ['birdie', 'Birdie'], ['par', 'Par'], ['bogey', 'Bogey'], ['worse', 'Schlechter']].filter(([k]) => n(k)).map(([k, l]) => `<span class="tally ${k}">${n(k)}× ${l}</span>`);
      return `<div class="tallies">${parts.join('')}</div>`;
    })();
    overlay(`<div class="panel final ${worldClass()}">
      <div class="final-banner">${sceneFor(state.world && state.world.id)}<div class="final-head"><h1>🏆 Endergebnis</h1><div class="final-world">${state.world ? state.world.name : ''} · ${state.courses.length} Bahnen · Par ${parTotal}</div></div></div>
      <div class="podium">${podium}</div>
      ${best}
      <div class="hole-cards">${cards}</div>
      <div class="final-legend"><span class="hc-score ace">1</span> Hole-in-One <span class="hc-score eagle">–2</span> Eagle <span class="hc-score birdie">–1</span> Birdie <span class="hc-score par">0</span> Par <span class="hc-score bogey">+1</span> Bogey <span class="hc-score worse">+2</span> mehr</div>
      <span class="btn" id="again">Nochmal spielen</span>
    </div>`);
    $('again').addEventListener('click', () => { hideOverlay(); showTitle(); });
  }

  /* ---------- Partikel ---------- */
  function burst(x, y, color, n, up = false) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * TAU, sp = 1 + Math.random() * 3;
      state.particles.push({ x, y, z: 0.1, vx: Math.cos(a) * sp * (up ? 0.6 : 1), vy: Math.sin(a) * sp * (up ? 0.6 : 1), vz: 2 + Math.random() * (up ? 6 : 3),
        life: 0.7 + Math.random() * 0.5, max: 1.2, color, size: 0.05 + Math.random() * 0.06 });
    }
  }
  function updateParticles(dt) {
    for (const p of state.particles) {
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt; p.vz -= 9 * dt;
      if (p.z < 0) { p.z = 0; p.vz *= -0.3; p.vx *= 0.7; p.vy *= 0.7; }
      p.life -= dt;
    }
    state.particles = state.particles.filter(p => p.life > 0);
  }

  /* Tür erreicht: die Bahn wechselt in ihre Innen-Map (z. B. Hexenhütte), Schläge zählen weiter */
  function enterInner(msg) {
    const def = state.level.def.inner; // Innen-Maps können selbst wieder eine Innen-Map haben (Totenschiff → Totenufer)
    if (!def) return;
    Sfx.portal(); burst(state.ball.x, state.ball.y, msg ? '#ff5a5a' : '#a6ff5e', 16, true);
    state.phase = 'wait'; state.aim = null;
    state.ball.sunk = true; state.ball.sinkT = 0; // der Ball verschwindet im Tor, statt davor liegen zu bleiben
    showMessage(msg || `Hinein in die ${def.name} …`, msg ? 1900 : 1500);
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      state.level = buildLevel(def); state.theme = THEMES[def.theme]; state.inner = true;
      R.setLevel(state.level, state.theme);
      const b = state.ball, lv = state.level;
      b.x = lv.tee.x; b.y = lv.tee.y; b.vx = 0; b.vy = 0; b.z = 0; b.vz = 0; b.air = false; b.rider = null; b.sunk = false; b.sinkT = 0; b.entered = false; // die nächste Tür (z. B. die Luke) darf wieder auslösen
      b.restX = b.x; b.restY = b.y; b.portalCd = 0.5;
      state.particles = [];
      // Startblick: auf den ersten Aufgabenpunkt (z. B. Rampe/Hexentopf), sonst aufs Loch
      const look = def.look || lv.cup;
      state.camTheta = thetaTowards(b.x, b.y, look.x, look.y);
      setCamMode('follow'); updateCamera(0); R.snapCamera();
      state.phase = 'aim'; updateHud();
    }, 700);
  }

  /* ---------- Physik-Ereignisse ---------- */
  function handleEvents(events) {
    for (const ev of events) {
      if (state.phase !== 'aim' && state.phase !== 'rolling') return;
      switch (ev.type) {
        case 'bounce':
          if (ev.speed > 1.5 && state.t - state.lastBounceSfx > 0.06) {
            state.lastBounceSfx = state.t;
            if (ev.kind === 'bumper') Sfx.bumper(); else Sfx.bounce(ev.speed);
            if (ev.speed > 6) burst(ev.x, ev.y, 'rgba(255,255,255,0.8)', 3);
          }
          break;
        case 'portal': Sfx.portal(); burst(ev.x, ev.y, ev.color, 12, true); break;
        case 'board': Sfx.bounce(6); showMessage('Eingestiegen – gute Fahrt!', 1400); break;
        case 'jump': if (ev.updraft) { Sfx.whoosh(); burst(ev.x, ev.y, '#cdefff', 22, true); showMessage('Der Aufwind trägt dich!', 1100); } else { Sfx.portal(); showMessage('Sprung!', 900); } break;
        case 'land': Sfx.bounce(3); burst(ev.x, ev.y, 'rgba(255,255,255,0.7)', 6); break;
        case 'dropoff': Sfx.bounce(4); burst(ev.x, ev.y, '#ffd166', 8); break;
        case 'switch': Sfx.lever(); burst(ev.x, ev.y, '#9dffb5', 14); showMessage('Schalter gedrückt – das Zaubertor öffnet sich!', 1600); break;
        case 'shrink': Sfx.potion(); burst(ev.x, ev.y, '#d58cff', 16, true); showMessage('Schrumpftrank! Der Ball ist jetzt winzig.', 1600); break;
        case 'unshrink': showMessage('Der Trank lässt nach.', 1200); break;
        case 'curse': Sfx.potion(); burst(ev.x, ev.y, '#fff3d0', 18, true); showMessage(ev.label || 'Perlenfluch! Der Ball bleibt bis zum Loch träge.', 2000); break;
        case 'enter': enterInner(); return;
        case 'spit': Sfx.bumper(); burst(ev.x, ev.y, '#a6ff5e', 10); break;
        case 'spin': Sfx.bounce(5); showMessage('Das Zahnrad nimmt den Ball mit …', 1200); break;
        case 'spinout': Sfx.bumper(); burst(ev.x, ev.y, '#ffe9a8', 8); break;
        case 'load': if (ev.style === 'ballista') { Sfx.winch(); showMessage('Gespannt … der Basilisk zielt!', 900); } else { Sfx.bounce(5); showMessage('Geladen … Feuer frei!', 900); } break;
        case 'fire': if (ev.style === 'ballista') { Sfx.twang(); burst(ev.x, ev.y, '#e8e0ff', 20); showMessage('Abgeschossen!', 800); } else { Sfx.cannon(); burst(ev.x, ev.y, '#ffb347', 18); } break;
        case 'sunk': sunk(); return;
        case 'shark': { const inner = state.courses[state.holeIdx].inner; if (inner && inner.stomach && !state.inner) { const b = state.ball; b.z = 0; b.vz = 0; b.air = false; enterInner('Verschluckt! Ab in den Haimagen …'); } else hazard('shark'); return; }
        case 'water': case 'lava': case 'oob': case 'spiked': case 'zapped': case 'fell': case 'beheaded': case 'seen': hazard(ev.type); return;
      }
    }
  }

  /* ---------- Hauptschleife ---------- */
  let last = performance.now(), acc = 0;
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000); last = now; acc += dt;
    while (acc >= STEP) {
      acc -= STEP; if (!window.__golfDebug || !window.__golfDebug.freeze) state.t += STEP;
      const b = state.ball, lv = state.level;
      if (!lv) continue;
      if (b && (state.phase === 'aim' || state.phase === 'rolling')) {
        const ev = stepPhysics(lv, b, STEP, state.t, state.phase === 'rolling');
        handleEvents(ev);
        if (ev.some(e => e.type === 'contact' && e.kind === 'mover')) state.lastMoverHit = state.t;
        if (b.rider || b.air) { state.restTimer = 0; state.slowTimer = 0; state.rollT = 0; state.stuckRef = null; if (state.phase === 'aim') { state.phase = 'rolling'; state.aim = null; } }
        else if (state.phase === 'rolling') {
          const sp = Math.hypot(b.vx, b.vy);
          if (sp < 0.08) { state.restTimer += STEP; if (state.restTimer > 0.25) ballAtRest(); }
          else { state.restTimer = 0; }
          if (sp < 0.5 && !b.boosted) { state.slowTimer += STEP; if (state.slowTimer > 3) ballAtRest(); } else state.slowTimer = 0;
          // Notbremse: der Ball zappelt seit Sekunden auf der Stelle (eingeklemmt) oder wird seit langem von einem
          // bewegten Hindernis hin- und hergeschoben – anhalten und aus der Fahrspur nehmen
          state.rollT = (state.rollT || 0) + STEP;
          if (!state.stuckRef || Math.hypot(b.x - state.stuckRef.x, b.y - state.stuckRef.y) > 1) state.stuckRef = { x: b.x, y: b.y, t: state.t };
          if (state.phase === 'rolling' && (state.t - state.stuckRef.t > 4 || (state.rollT > 8 && state.t - (state.lastMoverHit || -99) < 2.5))) freeStuckBall();
        } else if (state.phase === 'aim') {
          if (Math.hypot(b.vx, b.vy) > 0.3) { state.phase = 'rolling'; state.aim = null; state.restTimer = 0; state.slowTimer = 0; }
        }
      } else {
        for (const ob of lv.obstacles) if (ob.update) ob.update(state.t);
        if (b && b.z > 0) { b.vz -= 12 * STEP; b.z = Math.max(0, b.z + b.vz * STEP); }
      }
    }
    updateParticles(dt);
    if (state.ball && state.ball.sunk) state.ball.sinkT += dt;
    updateCamera(dt);
    if (state.phase === 'title') TitleScene.draw(R.ctx, R.w, R.h, state.t); else { R.drawFrame(state); if (state.phase === 'edit') editor.drawOverlay(R.ctx); }
    ui.power.classList.toggle('visible', !!state.aim);
    if (state.aim) ui.powerFill.style.width = `${Math.round(state.aim.power * 100)}%`;
    requestAnimationFrame(frame);
  }

  /* ---------- Eingabe ---------- */
  let drag = null;
  function pointerPos(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  canvas.addEventListener('pointerdown', e => {
    if (state.phase === 'edit') { canvas.setPointerCapture(e.pointerId); const [x, y] = pointerPos(e); editor.pointer('down', e, x, y); return; }
    if (state.phase !== 'aim' || !state.ball) return;
    Sfx.unlock();
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, start: pointerPos(e) };
    state.aim = { dx: 0, dy: 0, power: 0 };
  });
  canvas.addEventListener('pointermove', e => {
    if (state.phase === 'edit') { const [x, y] = pointerPos(e); editor.pointer('move', e, x, y); return; }
    if (!drag || drag.id !== e.pointerId || state.phase !== 'aim') return;
    const [x, y] = pointerPos(e);
    const [wx, wy] = R.unprojDelta(x - drag.start[0], y - drag.start[1]);
    const len = Math.hypot(wx, wy);
    if (len < 0.05) { state.aim = { dx: 0, dy: 0, power: 0 }; return; }
    const sign = state.controlMode === 'push' ? 1 : -1;
    state.aim = { dx: sign * wx / len, dy: sign * wy / len, power: Math.min(1, len / MAX_DRAG) };
  });
  function endDrag(e, cancel) {
    if (state.phase === 'edit') { const [x, y] = pointerPos(e); editor.pointer(cancel ? 'cancel' : 'up', e, x, y); return; }
    if (!drag || drag.id !== e.pointerId) return;
    drag = null;
    if (!cancel && state.phase === 'aim' && state.aim && state.aim.power > 0.04) shoot(state.aim.dx, state.aim.dy, state.aim.power);
    else state.aim = null;
  }
  canvas.addEventListener('pointerup', e => endDrag(e, false));
  // Wischgesten des Browsers (Scrollen, Zurück, Neuladen) beim Zielen unterdrücken
  const block = e => { if (drag || e.target === canvas) e.preventDefault(); };
  document.addEventListener('touchstart', block, { passive: false });
  document.addEventListener('touchmove', block, { passive: false });
  document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });
  canvas.addEventListener('pointercancel', e => endDrag(e, true));
  window.addEventListener('keydown', e => {
    if (e.key === 'Escape' && drag) { drag = null; state.aim = null; }
    if (e.key === 'm' || e.key === 'M') toggleOverview();
    if (e.key === 'f' || e.key === 'F') toggleFullscreen();
    if (e.key === '+') zoomBy(1.25); if (e.key === '-') zoomBy(0.8);
    if (e.key === 'n' || e.key === 'N') jumpHole(1);
    if (e.key === 'p' || e.key === 'P') jumpHole(-1);
    if (e.key === 'r' || e.key === 'R') resetBall();
    if (e.key === 'j' || e.key === 'J') toggleMusic();
    if (e.key === 'q' || e.key === 'ArrowLeft') rotateBy(-Math.PI / 4);
    if (e.key === 'e' || e.key === 'ArrowRight') rotateBy(Math.PI / 4);
  });
  /* Vollbild: im eigenen Fenster per Fullscreen-API; in einem Rahmen ohne Vollbild-Recht wird das Spiel in einem eigenen Tab geöffnet */
  const fsEl = () => document.fullscreenElement || document.webkitFullscreenElement || null;
  const fsAllowed = () => (document.fullscreenEnabled ?? document.webkitFullscreenEnabled ?? true) && !!(document.documentElement.requestFullscreen || document.documentElement.webkitRequestFullscreen);
  function fsFallback() {
    let w = null; try { w = window.open(location.href, '_blank'); } catch (e) { /* blockiert */ }
    if (!w) showMessage('Vollbild geht hier nicht. Tippe oben rechts auf das Teilen-Symbol und öffne das Spiel im Browser. Dort klappt Vollbild.', 5000);
  }
  function toggleFullscreen() {
    const root = document.documentElement;
    if (fsEl()) { const ex = document.exitFullscreen || document.webkitExitFullscreen; if (ex) ex.call(document); return; }
    if (!fsAllowed()) { fsFallback(); return; }
    try {
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      const p = req.call(root, { navigationUI: 'hide' });
      if (p && p.catch) p.catch(fsFallback);
    } catch (e) { fsFallback(); }
  }
  function syncFullscreen() {
    const on = !!fsEl();
    document.body.classList.toggle('fullscreen', on);
    $('fs-btn').textContent = on ? '⛶ Vollbild aus' : '⛶ Vollbild';
    R.resize();
  }
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('webkitfullscreenchange', syncFullscreen);
  $('fs-btn').addEventListener('click', () => { Sfx.unlock(); toggleFullscreen(); });
  function toggleOverview() { if (state.ball) setCamMode(state.camMode === 'overview' ? 'follow' : 'overview'); }
  function syncMusicBtn() { $('music-btn').classList.toggle('sel', Music.on); $('music-btn').title = Music.on ? 'Musik aus (J)' : 'Musik an (J)'; }
  function toggleMusic() { Sfx.unlock(); Music.toggle(); syncMusicBtn(); showMessage(Music.on ? '♪ Musik an' : 'Musik aus', 1000); }
  function zoomBy(f) { state.zoomFactor = Math.max(0.5, Math.min(2.2, state.zoomFactor * f)); if (state.camMode === 'overview' && state.ball) setCamMode('follow'); }
  function rotateBy(a) { state.camTheta += a; if (state.camMode === 'overview' && state.ball) setCamMode('follow'); }
  $('cam-overview').addEventListener('click', toggleOverview);
  $('music-btn').addEventListener('click', toggleMusic);
  $('cr-prev').addEventListener('click', () => jumpHole(-1));
  $('cr-next').addEventListener('click', () => jumpHole(1));
  $('cr-reset').addEventListener('click', resetBall);
  $('cr-editor').addEventListener('click', () => { if (state.editorReturn) { clearTimeout(waitTimer); hideOverlay(); editor.returnFromTest(); } });
  $('cam-in').addEventListener('click', () => zoomBy(1.25));
  $('cam-out').addEventListener('click', () => zoomBy(0.8));
  $('cam-left').addEventListener('click', () => rotateBy(-Math.PI / 4));
  $('cam-right').addEventListener('click', () => rotateBy(Math.PI / 4));
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 0.9); }, { passive: false });
  window.addEventListener('resize', () => R.resize());
  /* Offline-Fähigkeit: nur wenn die Seite als eigene Web-App ausgeliefert wird (Manifest vorhanden, https oder localhost) */
  if ('serviceWorker' in navigator && document.querySelector('link[rel="manifest"]') && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Service Worker läuft das Spiel trotzdem */ });
  }

  // Test-Hook (für automatisierte Prüfungen): aktuelle Bahn für alle Spieler beenden
  window.__golfDebug = {
    skipHole() {
      if (!state.level || state.phase === 'title') return false;
      clearTimeout(waitTimer);
      const par = state.courses[state.holeIdx].par;
      for (let i = 0; i < state.players.length; i++) if (state.players[i].scores[state.holeIdx] == null) state.players[i].scores[state.holeIdx] = par;
      showHoleDone(); return true;
    },
    state, R,
  };

  const editor = Editor({ state, R, $, showMessage, startTest, showWorldSelect, hideOverlay, overlay, playWorld });
  R.resize();
  setControlMode(state.controlMode);
  syncMusicBtn();
  showTitle();
  updateHud();
  requestAnimationFrame(frame);
})();
