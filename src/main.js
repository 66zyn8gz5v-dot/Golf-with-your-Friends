/* Spielablauf: Titel → 9 Bahnen (Hotseat für 1–4 Spieler) → Endergebnis. */
(() => {
  const STEP = 1 / 240;
  const MAX_SHOT = 19;       // Ballgeschwindigkeit bei voller Kraft
  const MAX_DRAG = 4.2;      // Zieh-Länge (Weltkoordinaten) für volle Kraft
  const DEFAULT_MAX_STROKES = 15; // danach wird die Bahn automatisch beendet (pro Bahn per maxStrokes überschreibbar)
  const maxStrokes = () => state.mode === 'creative' ? Infinity : (state.courses[state.holeIdx].maxStrokes || DEFAULT_MAX_STROKES);
  const PLAYER_COLORS = ['#ffffff', '#5ce07a', '#4dd4ff', '#ffe066'];
  const PLAYER_NAMES = ['Spieler 1', 'Spieler 2', 'Spieler 3', 'Spieler 4'];
  /* Hut je Spieler: die Wahl merkt sich der Browser, damit sie beim nächsten Mal wieder dasteht */
  const DEFAULT_HATS = ['crown', 'pirate', 'wizard', 'viking'];
  /* Die Vorschau ist der Prüfstand: dort lassen sich auch noch nicht verdiente Belohnungen
     aufsetzen, damit man sie ansehen kann. Im Spiel gilt die Sperre.
     Dasselbe gilt für die Einzeldatei zum Weitergeben – sie ist zum Ansehen gebaut und setzt
     dafür PRUEFSTAND; auf der echten Seite gibt es diese Kennung nicht. */
  const TEST_FREI = (typeof VORSCHAU !== 'undefined' && VORSCHAU)
    || (typeof PRUEFSTAND !== 'undefined' && PRUEFSTAND);
  const playerHats = DEFAULT_HATS.slice();
  try {
    const saved = JSON.parse(localStorage.getItem(speicherSchluessel('hats')) || 'null');
    if (Array.isArray(saved)) saved.forEach((h, i) => { if (i < 4 && typeof h === 'string' && Hats.has(h)) playerHats[i] = h; });
  } catch (e) { /* kein Speicher, dann bleiben die Vorgaben */ }
  /* Der Turnierhelm wechselt nach dem Schlußpfiff den Besitzer. Ein Hut, der einem nicht (mehr)
     zusteht, wird darum beim Spielstart stillschweigend gegen den Vorgabehut getauscht – sonst
     trüge der Vorbesitzer den Preis weiter. Auf dem Prüfstand bleibt alles erlaubt. */
  const hutOderErsatz = (id, i) => (TEST_FREI || Hats.freigeschaltet(id)) ? id : DEFAULT_HATS[i % DEFAULT_HATS.length];

  function setHat(i, id) {
    playerHats[i] = id;
    if (state.players[i]) state.players[i].hat = id;
    if (state.ball && state.curPlayer === i) state.ball.hat = id;
    try { localStorage.setItem(speicherSchluessel('hats'), JSON.stringify(playerHats)); } catch (e) { /* kein Speicher */ }
  }

  const canvas = document.getElementById('game');
  const R = new Renderer(canvas);
  const $ = id => document.getElementById(id);
  const ui = {
    hole: $('hud-hole'), name: $('hud-name'), player: $('hud-player'), strokes: $('hud-strokes'),
    power: $('power'), powerFill: $('power-fill'), board: $('scoreboard'), msg: $('message'), overlay: $('overlay'), hint: $('hint'), best: $('hud-best'), time: $('hud-time'),
  };

  const state = {
    phase: 'title', players: [], holeIdx: 0, level: null, theme: null, t: 0, ball: null, aim: null,
    particles: [], curPlayer: 0, strokes: 0, restTimer: 0, slowTimer: 0, lastBounceSfx: 0,
    camMode: 'overview', camTheta: Math.PI / 4, zoomFactor: 1,
    controlMode: 'sling', // 'sling' = Schleuder (vom Ball wegziehen), 'push' = Schieben (in Schussrichtung ziehen)
    mode: 'normal',       // 'normal' = Wettkampf, 'creative' = Kreativ (Bahnen frei wählen und überspringen, kein Schlaglimit)
    world: WORLDS[0], courses: WORLDS[0].courses,
  };
  try { const m = localStorage.getItem(speicherSchluessel('control')); if (m === 'sling' || m === 'push') state.controlMode = m; } catch (e) { /* kein Speicher verfügbar */ }
  function setControlMode(m) {
    state.controlMode = m;
    try { localStorage.setItem(speicherSchluessel('control'), m); } catch (e) { /* ignorieren */ }
    syncHint();
  }
  /* Hinweiszeile unten links: im Netzspiel steht dort, wer gerade dran ist */
  function syncHint() {
    const base = state.controlMode === 'push' ? 'In Schussrichtung ziehen & loslassen' : 'Vom Ball wegziehen & loslassen';
    ui.hint.textContent = (online && online.started && !myTurn())
      ? `${seatName(online.players[state.curPlayer], state.curPlayer)} ist dran …`
      : base;
  }
  let playerCount = 1, gameMode = 'normal', msgTimer = null, waitTimer = null;

  /* ---------- Uhr ----------
     Gemessen wird die Zeit, die jemand für seine Bahn braucht: von dem Moment, in dem sein Ball
     auf dem Abschlag liegt, bis zum Einlochen. Im Menü und wenn die Seite in den Hintergrund
     wandert, steht die Uhr still – niemand soll dafür bestraft werden, dass das Telefon klingelt. */
  const clock = { start: 0, acc: 0, running: false, active: false };
  const now = () => (window.performance && performance.now) ? performance.now() : Date.now();
  function clockStart() { clock.acc = 0; clock.start = now(); clock.running = true; clock.active = true; }
  function clockPause() { if (clock.running) { clock.acc += now() - clock.start; clock.running = false; } }
  function clockResume() { if (clock.active && !clock.running) { clock.start = now(); clock.running = true; } }
  const clockRead = () => Math.round(clock.acc + (clock.running ? now() - clock.start : 0));
  function clockStop() { clockPause(); clock.active = false; return Math.round(clock.acc); }

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
    // Rekordzeile: der beste Wert des Freundeskreises auf dieser Bahn
    const w = def && state.world && state.world.id !== 'custom' ? Best.of(state.world.id) : null;
    const recS = w ? w.strokes.holes[def.name] : null, recT = w ? w.time.holes[def.name] : null;
    ui.best.textContent = [recS ? `🏆 ${recS.s} · ${recS.n}` : '', recT ? `⏱ ${Best.formatTime(recT.s)} · ${recT.n}` : ''].filter(Boolean).join('   ');
    const p = state.players[state.curPlayer];
    ui.player.textContent = p ? p.name : '–';
    syncClock();
    const parJetzt = def ? Best.par(weltId(), def) : 0;
    ui.strokes.textContent = def ? (state.mode === 'creative' ? `Kreativ · Schläge: ${state.strokes} · Par ${parJetzt}` : `Schläge: ${state.strokes} / ${maxStrokes()} · Par ${parJetzt}`) : '';
    // Namen kommen im Netzspiel von fremden Geräten: die Zeile wird gebaut, nicht aus Text geklebt
    ui.board.replaceChildren(...state.players.map((pl, i) => {
      const row = document.createElement('div');
      row.className = 'row' + (i === state.curPlayer ? ' active' : '');
      const dot = document.createElement('span');
      dot.className = 'dot'; dot.style.background = pl.color;
      row.appendChild(dot);
      if (pl.hat && pl.hat !== 'none') {
        const hut = document.createElement('span');
        hut.className = 'hat-icon'; hut.title = Hats.name(pl.hat); hut.textContent = Hats.icon(pl.hat);
        row.appendChild(hut);
      }
      row.appendChild(document.createTextNode(pl.name));
      const score = document.createElement('span');
      score.className = 'score'; score.textContent = pl.scores.reduce((a, b) => a + b, 0);
      row.appendChild(score);
      return row;
    }));
  }
  /* Zeitanzeige im Kopf – nur im Wettkampf, im Kreativmodus wird nichts gewertet */
  let clockShown = '';
  function syncClock() {
    const zeigen = clock.active && state.mode !== 'creative' && !state.editorReturn;
    const txt = zeigen ? Best.formatTime(clockRead()) : '';
    if (txt !== clockShown) { clockShown = txt; ui.time.textContent = txt; }
  }
  /* Welcher Bildschirm zeigt gerade etwas vom Turnier? Wechselt das Turnier den Zustand –
     etwa vom Laufen ins Beendetsein –, wird genau dieser neu gezeichnet. Jeder Bildschirm setzt
     den Merker nach seinem overlay() selbst; overlay() löscht ihn vorher. */
  let turnierSchirm = null;
  function overlay(html, cls) { clockPause(); turnierSchirm = null; ui.overlay.innerHTML = html; ui.overlay.className = 'screen visible' + (cls ? ' ' + cls : ''); }
  function hideOverlay() { ui.overlay.className = 'screen'; ui.overlay.innerHTML = ''; clockResume(); }

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
  /* Welt hinter dem Turnier-Knopf im Startbildschirm */
  const TURNIER_WELT = 'colosseum';
  function showTitle() {
    state.phase = 'title'; state.editorReturn = false; Music.set('title');
    document.body.classList.add('title');
    document.body.classList.remove('creative', 'editing', 'testing');
    /* Die beiden großen Knöpfe zeigen je eine Szene als Hintergrund. Damit die Beschriftung darauf
       lesbar bleibt, liegt ein Schleier dazwischen, der nach rechts hin dunkler wird – vorher stand
       das Wort „Weltkarte" mitten in den Ortsnamen der Karte. Die zweite Zeile sagt, was einen
       dahinter erwartet; das spart den Erklärsatz darunter. */
    overlay(`<div class="panel">
      <h1><span class="h1-ball">⛳</span> Fantasy Golf</h1>
      <div class="sub">Golf with your Friends · Minigolf in 2,5D</div>
      <div class="modes">
        <span class="btn mode" id="to-map">${WorldMap.svg('mode-scene', 'xMidYMid slice')}<span class="mode-schleier"></span>
          <span class="mode-label">Weltkarte<small>${WORLDS.length} Welten · ${TOTAL_HOLES} Bahnen · alle offen</small></span></span>
        <span class="btn mode" id="to-build">${SCENE_CREATIVE}<span class="mode-schleier"></span>
          <span class="mode-label long">Bauen &amp; Eigene Welt<small>Eigene Bahnen bauen und verschicken</small></span></span>
      </div>
      <div class="atlas-extra"><span class="btn small ghost" id="to-turnier">${Icons.svg('golf_course')} Turnier</span>
        <span class="btn small ghost" id="to-online">${Icons.svg('public')} Online spielen</span>
        <span class="btn small ghost" id="to-best">${Icons.svg('emoji_events')} Rangliste</span></div>
      ${turnierBand()}
      <div class="legend">Die Stufe an jedem Ort sagt nur, was dich erwartet – gespielt werden kann jede Welt sofort.
        <span class="version">${typeof VORSCHAU !== 'undefined' && VORSCHAU ? 'Vorschau · ' : ''}Fassung ${typeof APP_VERSION !== 'undefined' ? APP_VERSION : '?'}</span></div>
    </div>`, 'title');
    turnierSchirm = showTitle;
    // Der Turnier-Knopf führt auf den Turnierbildschirm: dort stehen Stand, Restlaufzeit und
    // Rangliste, und von dort geht es in die Arena.
    $('to-turnier').addEventListener('click', () => { Sfx.unlock(); Music.start(); showTurnier(); });
    $('to-online').addEventListener('click', () => { Sfx.unlock(); Music.start(); showOnline(); });
    $('to-best').addEventListener('click', () => { Sfx.unlock(); Music.start(); showBestList(); });
    $('to-map').addEventListener('click', () => { Sfx.unlock(); Music.start(); showMap(); });
    $('to-build').addEventListener('click', () => { Sfx.unlock(); Music.start(); showBuild(); });
  }

  /* Weltkarte: alle Welten auf einen Blick, jede sofort spielbar */
  const MODE_NAME = { normal: 'Normal', pro: 'Profi', legend: 'Legende' };
  function showMap() {
    state.phase = 'title'; state.editorReturn = false; Music.set('title');
    document.body.classList.add('title');
    document.body.classList.remove('creative', 'editing', 'testing');
    // Nur Welten mit einem Ort auf der Karte: Das Kolosseum ist die Turnierwelt und wird über den
    // Turnier-Knopf im Startbildschirm betreten, nicht über die Reise
    const kartenWelten = WORLDS.filter(w => WorldMap.spots[w.id]);
    const marks = kartenWelten.map(w => {
      const sp = WorldMap.spots[w.id];
      const m = worldMode(w);
      // sp.x steht in Karteneinheiten (0 … WorldMap.BREITE), die Marke braucht Prozent der Karte
      const links = (sp.x / WorldMap.BREITE * 100).toFixed(2);
      return `<button class="spot" style="left:${links}%;top:${sp.y}%;--pin:${sp.col}" data-world="${w.id}" title="${Text.esc(w.name)}">
        <span class="spot-pin">${sp.icon}</span>
        <span class="spot-label"><b>${Text.esc(w.name)}</b><i>${MODE_ICON[m]} ${MODE_NAME[m]} · ${w.courses.length} Bahnen</i></span></button>`;
    }).join('');
    overlay(`<div class="panel atlas-panel">
      <div class="panel-head"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span><h2>${Icons.svg('map')} Weltkarte</h2></div>
      <div class="sub">Tippe einen Ort an – alle ${kartenWelten.length} Welten sind von Anfang an offen.
        Sie liegen als Landstriche auf der Karte: <b>gestrichelte Wege</b> verbinden sie, über Wasser geht es per Schiff.</div>
      <!-- Die Karte ist BREITE Einheiten breit, der Kasten so breit wie die Tafel. Bei BREITE = 100
           passt sie ganz hinein; wird sie einmal breiter, schiebt der Kasten waagerecht. -->
      <div class="atlas-schiebe"><div class="atlas" style="aspect-ratio:${WorldMap.BREITE} / 62;width:${WorldMap.BREITE}%">${WorldMap.svg()}${marks}</div></div>
      ${turnierBand()}
      <div class="atlas-extra"><span class="btn small ghost" id="to-build2">${Icons.svg('construction')} Bauen &amp; Eigene Welt</span></div>
    </div>`, 'title');
    turnierSchirm = showMap;
    ui.overlay.querySelectorAll('.spot').forEach(b => b.addEventListener('click', () => { Sfx.unlock(); setWorld(b.dataset.world); showSetup(); }));
    $('to-build2').addEventListener('click', showBuild);
    $('back').addEventListener('click', showTitle);
  }

  /* Jemand hat eine Bahn als Link geschickt */
  function zeigeGeteilteBahn(bahn) {
    state.phase = 'title'; document.body.classList.add('title');
    overlay(`<div class="panel">
      <div class="panel-head"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span><h2>${Icons.svg('language')} Geteilte Bahn</h2></div>
      <div class="sub"><b>${Text.esc(bahn.name)}</b> · Par ${bahn.par} · ${bahn.map[0].length} × ${bahn.map.length} Kacheln</div>
      <p><span class="btn" id="gb-play">${Icons.svg('play_arrow')} Jetzt spielen</span></p>
      <p><span class="btn small ghost" id="gb-save">${Icons.svg('save')} Zu meinen Bahnen</span>
        <span class="btn small ghost" id="gb-edit">${Icons.svg('construction')} Im Editor öffnen</span></p>
      <div class="legend">Die Bahn kam über einen Link. Sie wurde geprüft, bevor sie hier steht.</div>
    </div>`, 'title');
    $('back').addEventListener('click', showTitle);
    $('gb-play').addEventListener('click', () => {
      Sfx.unlock(); state.mode = 'creative'; state.editorReturn = false;
      setCustomWorld([bahn], bahn.name);
      document.body.classList.remove('editing', 'testing');
      startGame(1, 0);
    });
    $('gb-save').addEventListener('click', () => { Sfx.unlock(); editor.uebernimm(bahn); showMessage('Zu deinen Bahnen gelegt', 1800); showBuild(); });
    $('gb-edit').addEventListener('click', () => { Sfx.unlock(); setControlMode('sling'); editor.open(Object.assign({}, bahn, { id: Date.now() })); });
  }

  /* Bauen und eigene Welt */
  function showBuild() {
    state.phase = 'title'; document.body.classList.add('title'); document.body.classList.remove('creative', 'editing', 'testing');
    const own = editor.worldCourses();
    overlay(`<div class="panel">
      <div class="panel-head"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span><h2>${Icons.svg('construction')} Bauen &amp; Eigene Welt</h2></div>
      <div class="sub">Baue eigene Bahnen und stelle daraus eine eigene Welt zusammen.</div>
      <div class="modes">
        <span class="btn mode build" id="build"><span class="mode-label">${Icons.svg('construction')} Bahn bauen</span></span>
        ${own.length ? `<span class="btn mode own" id="own-play"><span class="mode-label">${Icons.svg('language')} Eigene Welt (${own.length} Bahn${own.length > 1 ? 'en' : ''})</span></span>` : ''}
      </div>
      ${own.length ? '' : '<div class="legend">Noch keine eigene Bahn gebaut. Im Editor wird sie mit „Fertig“ in die Eigene Welt eingesetzt.</div>'}
      <div id="freundesbahnen"></div>
      <p><span class="btn ghost small back2">${Icons.svg('arrow_back')} Zurück</span></p>
    </div>`, 'title');
    zeigeFreundesbahnen();
    Share.onChange(zeigeFreundesbahnen);
    $('build').addEventListener('click', () => { Sfx.unlock(); setControlMode('sling'); editor.open(null); });
    if (own.length) $('own-play').addEventListener('click', () => { Sfx.unlock(); setControlMode('sling'); playWorld(own); });
    ui.overlay.querySelectorAll('#back, .back2').forEach(b => b.addEventListener('click', showMap));
  }

  /* Bahnen, die andere geteilt haben: laden zum Bearbeiten oder gleich einmal probespielen */
  function zeigeFreundesbahnen() {
    const box = $('freundesbahnen');
    if (!box) return;
    const liste = Share.liste;
    if (!liste.length) {
      box.innerHTML = `<div class="legend">Noch keine Bahnen von Freunden da. Wer im Editor auf „Teilen“ tippt, erscheint hier –
        das braucht eine Verbindung.</div>`;
      return;
    }
    box.innerHTML = `<div class="sub" style="margin-top:14px"><b>Bahnen von Freunden</b> · ${liste.length}</div>
      <div class="wl-list">${liste.map((b, i) => `<div class="wl-row">
        <span class="wl-num">${holeIcon(b)}</span>
        <span class="wl-name">${Text.esc(b.name)} <i>Par ${b.par} · von ${Text.esc(b.von)}</i></span>
        <button class="cbtn small fb-play" data-i="${i}" title="einmal spielen">${Icons.svg('play_arrow')}</button>
        <button class="cbtn small fb-load" data-i="${i}" title="in den Editor laden">${Icons.svg('construction')}</button>
      </div>`).join('')}</div>`;
    box.querySelectorAll('.fb-play').forEach(b => b.addEventListener('click', () => {
      const bahn = Share.liste[+b.dataset.i]; if (!bahn) return;
      Sfx.unlock(); state.mode = 'creative'; state.editorReturn = false;
      setCustomWorld([bahn], 'Bahn von ' + bahn.von);
      document.body.classList.remove('editing', 'testing');
      startGame(1, 0);
    }));
    box.querySelectorAll('.fb-load').forEach(b => b.addEventListener('click', () => {
      const bahn = Share.liste[+b.dataset.i]; if (!bahn) return;
      Sfx.unlock(); setControlMode('sling');
      editor.open(Object.assign({}, bahn, { id: Date.now(), name: bahn.name }));
      showMessage('Bahn geladen – mit „Speichern“ behältst du sie', 2400);
    }));
  }

  /* Uhrwerkstadt: Dächer in der Dämmerung, davor der Turm mit dem beleuchteten Zifferblatt.
     Die Zeiger stehen still – ein Bild, kein Uhrwerk; bewegt wird nur der Dampf über den Dächern. */
  const SCENE_CLOCK = `<svg class="mode-scene" viewBox="0 0 300 72" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
            <defs>
              <linearGradient id="skyU" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0d1526"/><stop offset="0.55" stop-color="#2c3a5c"/><stop offset="1" stop-color="#6b6a72"/></linearGradient>
              <linearGradient id="turmU" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#20263a"/><stop offset="0.5" stop-color="#39415c"/><stop offset="1" stop-color="#1a2032"/></linearGradient>
              <radialGradient id="blattU" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff4d0"/><stop offset="0.75" stop-color="#ffcf7a"/><stop offset="1" stop-color="#c98a30"/></radialGradient>
              <filter id="softU" x="-30%" y="-30%" width="160%" height="180%"><feGaussianBlur stdDeviation="2"/></filter>
            </defs>
            <rect width="300" height="72" fill="url(#skyU)"/>
            <g fill="#e8eeff" opacity="0.55"><circle cx="34" cy="12" r="0.9"/><circle cx="88" cy="7" r="0.7"/><circle cx="146" cy="15" r="0.8"/><circle cx="212" cy="9" r="0.7"/><circle cx="268" cy="17" r="0.9"/></g>
            <g class="drift" opacity="0.35" filter="url(#softU)"><ellipse cx="60" cy="26" rx="22" ry="6" fill="#9fb0cc"/><ellipse cx="236" cy="20" rx="26" ry="6" fill="#9fb0cc"/></g>
            <path d="M0 58 L14 58 L14 44 L26 44 L26 58 L44 58 L44 38 L58 38 L58 58 L76 58 L76 48 L90 48 L90 58 L300 58 V72 H0 Z" fill="#161c2c"/>
            <path d="M214 58 L214 40 L226 40 L226 58 L246 58 L246 46 L258 46 L258 58 L276 58 L276 36 L290 36 L290 58 L300 58 V72 H214 Z" fill="#1b2234"/>
            <g fill="#4fb59b" opacity="0.85"><path d="M44 38 L51 32 L58 38 Z"/><path d="M276 36 L283 30 L290 36 Z"/><path d="M14 44 L20 39 L26 44 Z"/></g>
            <rect x="132" y="10" width="36" height="62" fill="url(#turmU)"/>
            <path d="M128 12 L150 0 L172 12 Z" fill="#4fb59b"/>
            <circle cx="150" cy="30" r="13" fill="#8a6624"/>
            <circle cx="150" cy="30" r="11" fill="url(#blattU)"/>
            <g stroke="#3a2a12" stroke-linecap="round"><line x1="150" y1="30" x2="150" y2="22" stroke-width="1.6"/><line x1="150" y1="30" x2="156" y2="33" stroke-width="1.4"/></g>
            <g fill="#ffc46b" opacity="0.9"><rect x="139" y="48" width="4" height="6"/><rect x="157" y="48" width="4" height="6"/><rect x="20" y="50" width="3" height="5"/><rect x="49" y="44" width="3" height="5"/><rect x="251" y="52" width="3" height="5"/><rect x="281" y="42" width="3" height="5"/></g>
            <g class="drift" opacity="0.28" filter="url(#softU)"><ellipse cx="104" cy="46" rx="12" ry="7" fill="#e6eefc"/><ellipse cx="196" cy="50" rx="10" ry="6" fill="#e6eefc"/></g>
            <g stroke="#c9903f" stroke-width="1.2" fill="none" opacity="0.75"><circle cx="100" cy="62" r="6"/><circle cx="204" cy="64" r="5"/></g>
          </svg>`;

  const sceneFor = id => ({ normal: SCENE_NORMAL, sea: SCENE_SEA, pro: SCENE_PRO, jungle: SCENE_JUNGLE, storm: SCENE_STORM, shadow: SCENE_SHADOW, clock: SCENE_CLOCK })[id] || SCENE_NORMAL;
  const MODE_ICON = { normal: '🏆', pro: '🔥', legend: '⚡' };
  const worldMode = w => (w && w.mode) || 'normal';
  function setWorld(id) { state.world = WORLDS.find(w => w.id === id) || WORLDS[0]; state.courses = state.world.courses; Music.set(state.world.id); }

  /* Bahnen zählen: die Innenräume gehören dazu (Hexenküche innen, Pyramide innen, Schiffswrack innen …),
     und ein Innenraum kann selbst wieder einen haben – darum rekursiv. */
  const countHoles = list => list.reduce((n, c) => n + 1 + (c.inner ? countHoles([c.inner]) : 0), 0);
  const TOTAL_HOLES = WORLDS.reduce((n, w) => n + countHoles(w.courses), 0);

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

  /* ---------- Turnier ----------
     Ein Wettbewerb auf Zeit in der Arena. Was hier steht, ist nur die Anzeige – wann es läuft,
     was angenommen wird und wer vorn liegt, entscheidet src/turnier.js. */

  /* Das Band, das auf Startbildschirm und Weltkarte über den Stand des Turniers informiert.
     Vor dem Start steht dort das Startdatum, während der Laufzeit die Restzeit, danach der Hinweis
     auf das Ende. Die Restzeit trägt eine Klasse, an der die Uhr sie jede Sekunde nachträgt. */
  function turnierBand() {
    const z = Turnier.zustand();
    if (z === 'vor') return `<div class="turnier-band vor">${Icons.svg('golf_course')}
      <span><b>Turnier im Kolosseum</b> · Start am ${Text.esc(Turnier.startText)}</span></div>`;
    if (z === 'laeuft') return `<div class="turnier-band an">${Icons.svg('golf_course')}
      <span><b>Turnier läuft</b> · <span class="turnier-rest">${Text.esc(Turnier.restText())}</span></span></div>`;
    return `<div class="turnier-band aus">${Icons.svg('golf_course')}
      <span><b>Turnier beendet</b> · die Rangliste bleibt stehen</span></div>`;
  }

  /* Turnierbildschirm: Stand, Restlaufzeit, Rangliste und der Weg in die Arena */
  function showTurnier() {
    state.phase = 'title'; state.editorReturn = false; Music.set('title');
    document.body.classList.add('title');
    document.body.classList.remove('creative', 'editing', 'testing');
    const z = Turnier.zustand();
    const welt = WORLDS.find(w => w.id === Turnier.WELT) || WORLDS[0];
    const liste = Turnier.rangliste();
    const medaille = ['🥇', '🥈', '🥉'];
    const zeit = ms => Best.formatTime(ms);
    const kombi = s => String(s).replace('.', ',');

    const rundenZeilen = liste.runde.length
      ? liste.runde.slice(0, 20).map((r, i) => `<tr class="${r.ich ? 'me' : ''}">
          <td>${medaille[i] || (i + 1) + '.'}</td>
          <td>${Text.esc(r.n)}</td>
          <td class="num"><b>${kombi(r.s)}</b></td>
          <td class="num">${r.st}</td>
          <td class="num">${zeit(r.ms)}</td></tr>`).join('')
      : `<tr><td colspan="5" class="sub" style="text-align:center">Noch hat niemand eine ganze Runde eingereicht.</td></tr>`;

    const bahnZeilen = welt.courses.map((c, i) => {
      const b = liste.bahnen[c.name];
      return `<tr class="${b && b.ich ? 'me' : ''}"><td>${i + 1}</td><td>${holeIcon(c)} ${Text.esc(c.name)}</td>
        <td class="num">${Best.par(welt.id, c)}</td>
        <td class="num rec">${b ? `<b>${kombi(b.s)}</b><i>${Text.esc(b.n)}</i>` : '–'}</td>
        <td class="num">${b ? b.st : '–'}</td>
        <td class="num">${b ? zeit(b.ms) : '–'}</td></tr>`;
    }).join('');

    const kopf = z === 'vor'
      ? `<div class="turnier-kopf vor"><b>Das Turnier hat noch nicht begonnen.</b><br>
           Start am ${Text.esc(Turnier.startText)} · Ende am ${Text.esc(Turnier.endeText)}<br>
           Bis dahin kannst du die Arena üben – gewertet wird noch nichts.</div>`
      : z === 'laeuft'
        ? `<div class="turnier-kopf an"><b>Das Turnier läuft.</b>
           <span class="turnier-uhr turnier-rest">${Text.esc(Turnier.restText())}</span><br>
           Noch bis ${Text.esc(Turnier.endeText)}</div>`
        : `<div class="turnier-kopf aus"><b>Das Turnier ist beendet.</b><br>
           Gelaufen vom ${Text.esc(Turnier.startText)} bis ${Text.esc(Turnier.endeText)}.
           Die Rangliste bleibt stehen, neue Ergebnisse werden nicht mehr angenommen.</div>`;

    overlay(`<div class="panel wide">
      <div class="panel-head"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span>
        <h2>${Icons.svg('golf_course')} Turnier · ${Text.esc(welt.name)}</h2></div>
      ${kopf}
      <div class="sub">Gewertet wird die <b>Kombi-Wertung</b>: Schläge plus angefangene Minuten. Vier Schläge
        in 1:12 ergeben 4 + 1,2 = 5,2. Es zählt die <b>ganze Runde</b> über alle ${welt.courses.length} Bahnen;
        darunter stehen die besten Einzelbahnen. Gespielt wird im <b>Wettkampf</b> – im Kreativmodus zählt nichts.<br>
        Das Par jeder Bahn kommt aus der Rangliste: einen Schlag über dem besten Ergebnis, das je dort
        gespielt wurde.<br>
        <b>${Hats.name('champion')} als Siegerpreis:</b> Er geht nach dem Ende an den, der die Rundenwertung
        anführt. Solange das Turnier läuft, trägt ihn niemand.</div>
      ${!Best.name ? `<div class="sub warn-note">Ohne Namen wird nichts gewertet. Trag ihn in der
        <span class="btn ghost small" id="zur-liste">${Icons.svg('emoji_events')} Rangliste</span> ein.</div>` : ''}
      <div class="sub net-note" id="tstate">${Net.status === 'ready'
        ? `Verbunden · ${liste.runde.length} ${liste.runde.length === 1 ? 'Teilnehmer' : 'Teilnehmer'} im Feld`
        : 'Keine Verbindung – das Feld zeigt vorerst nur, was auf diesem Gerät liegt.'}</div>

      <div class="sub" style="margin-top:12px"><b>Ganze Runde</b> · Par ${Best.parSumme(welt.id, welt.courses)}</div>
      <div class="tabelle-schiebe"><table class="scores best-table turnier-tafel">
        <tr><th></th><th>Name</th><th class="num">${BEST_ICON.combo} Kombi</th><th class="num">${BEST_ICON.strokes}</th><th class="num">${BEST_ICON.time}</th></tr>
        ${rundenZeilen}
      </table></div>

      <div class="sub" style="margin-top:14px"><b>Beste Einzelbahnen</b></div>
      <div class="tabelle-schiebe"><table class="scores best-table turnier-tafel">
        <tr><th>#</th><th>Bahn</th><th class="num">Par</th><th class="num">${BEST_ICON.combo} Kombi</th><th class="num">${BEST_ICON.strokes}</th><th class="num">${BEST_ICON.time}</th></tr>
        ${bahnZeilen}
      </table></div>

      <p style="margin-top:14px"><span class="btn" id="t-los">${Icons.svg('golf_course')} ${z === 'laeuft' ? 'In die Arena' : 'Arena ansehen'}</span></p>
      <div class="legend">Auch das Turnier ist eine Anschreibetafel, kein Schiedsrichter: Jedes Gerät meldet sein
        Ergebnis selbst. Ergebnisse mit einem Zeitstempel außerhalb des Turnierfensters werden hier nicht angezeigt.
        Das Turnier hat einen eigenen Platz beim Vermittler – die dauerhafte Rangliste bleibt davon unberührt.</div>
    </div>`, 'title');
    turnierSchirm = showTurnier;
    $('back').addEventListener('click', showTitle);
    if ($('zur-liste')) $('zur-liste').addEventListener('click', () => showBestList(Turnier.WELT));
    $('t-los').addEventListener('click', () => {
      Sfx.unlock(); Music.start();
      gameMode = 'normal';            // im Turnier zählt nur der Wettkampf
      setWorld(Turnier.WELT); showSetup();
    });
  }

  /* Der eigene Weg zur Belohnung einer Welt – als Block unter der Rekordtafel.
     Sichtbar ist beides, was die Bedingung verlangt: wie viele Bahnen noch fehlen und wie die
     Summe der eigenen besten Bahnen zum Par steht. Ohne das bliebe die Bedingung eine Behauptung. */
  /* Ansage der frisch verdienten Belohnung – einmal, dann ist sie wieder weg */
  function lohnZeile() {
    if (!frischerLohn) return '';
    const l = frischerLohn; frischerLohn = null;
    return `<div class="sub lohn-frisch">${l.icon} <b>${Text.esc(l.name)} freigeschaltet!</b><br>
      Du findest ihn bei der Hutwahl vor dem Start.</div>`;
  }

  function belohnungsStand(w) {
    const lohn = Hats.belohnung(w.id);
    if (!lohn) return '';
    const frei = Hats.freigeschaltet(lohn.id);
    const kopf = `<span class="lohn-name">${lohn.icon} ${Text.esc(lohn.name)}</span>
      <span class="lohn-was">Belohnung dieser Welt</span>`;
    // Der Championhelm hängt am Turnier, nicht am Par – für ihn gibt es nichts zu zählen
    if (lohn.art === 'turnier') return `<div class="lohn ${frei ? 'auf' : ''}">${kopf}
      <div class="lohn-text">${frei ? 'Gewonnen – er gehört dir.' : Text.esc(Hats.bedingung(lohn.id))}${
        Hats.stand(lohn.id) ? `<br><i>${Text.esc(Hats.stand(lohn.id))}</i>` : ''}</div></div>`;

    const f = Best.fortschritt(w.id);
    const anteil = f.gesamt ? Math.round(f.fertig / f.gesamt * 100) : 0;
    const offenText = f.offen.length
      ? `Noch offen: ${f.offen.slice(0, 4).map(n => Text.esc(n)).join(', ')}${f.offen.length > 4 ? ` und ${f.offen.length - 4} weitere` : ''}`
      : 'Jede Bahn hat ein Ergebnis.';
    const summeText = f.fertig
      ? `Deine besten Bahnen zusammen: <b>${f.schlaege}</b> auf Par ${f.par}` +
        (f.offen.length ? ` <i>(erst ${f.fertig} von ${f.gesamt} Bahnen)</i>`
          : ` · <b class="${f.diff < 0 ? 'unter' : 'ueber'}">${f.diff === 0 ? 'genau Par' : (f.diff > 0 ? '+' : '') + f.diff}</b>`)
      : 'Noch kein eigenes Ergebnis in dieser Welt.';
    const ziel = frei
      ? 'Geschafft – der Skin ist deiner.'
      : f.offen.length
        ? `Für die Belohnung braucht jede Bahn ein Ergebnis, und die Summe muss unter Par ${f.par} liegen.`
        : `Es fehlen noch ${f.diff + 1} ${f.diff + 1 === 1 ? 'Schlag' : 'Schläge'} bis unter Par.`;
    /* Gerechnet wird allein die Summe – wer auf einer Bahn über Par bleibt, holt es auf einer
       anderen wieder herein. Das steht ausdrücklich da, sonst versucht man es Bahn für Bahn. */
    const regel = frei ? '' : `<br><i class="lohn-regel">Es zählt nur das Ergebnis insgesamt: Eine Bahn über
      Par macht nichts, wenn du auf einer anderen unter Par bleibst.</i>`;
    return `<div class="lohn ${frei ? 'auf' : ''}">${kopf}
      <div class="lohn-balken"><i style="width:${anteil}%"></i><span>${f.fertig} / ${f.gesamt} Bahnen</span></div>
      <div class="lohn-text">${offenText}<br>${summeText}<br>${ziel}${regel}</div></div>`;
  }

  /* Ranglisten-Bildschirm: Name, Gruppencode und die Rekorde aller Welten */
  function showBestList(worldId) {
    state.phase = 'title'; document.body.classList.add('title');
    document.body.classList.remove('creative', 'editing', 'testing');
    const wid = worldId || (state.world && state.world.id !== 'custom' ? state.world.id : WORLDS[0].id);
    const w = WORLDS.find(x => x.id === wid) || WORLDS[0];
    const rec = Best.of(w.id);
    const bestStatus = { status: st => { const el = $('bstate'); if (!el) return;
      el.textContent = st === 'ready' ? 'Verbunden – alle mit dem Spiel teilen sich diese Liste.'
        : st === 'error' ? 'Keine Verbindung – die Rekorde bleiben vorerst auf diesem Gerät.' : 'Verbinde …'; } };
    /* Der eigene Bestwert steht in jeder Zelle mit dabei – auch dann, wenn der Rekord einem
       selbst gehört. Sonst müßte man raten, wie weit man vom Bestwert entfernt ist. */
    const meinsZelle = (kind, mein, rekord) => mein > 0
      ? `<em class="mein${rekord > 0 && mein <= rekord ? ' gleich' : ''}" title="dein bester Wert"><span class="du">du</span> ${Text.esc(Best.formatWert(kind, mein))}</em>`
      : '<em class="mein leer" title="hier hast du noch kein Ergebnis"><span class="du">du</span> –</em>';
    /* Eine Zelle je Wertung: der Wert, darunter klein, wer ihn hält, darunter der eigene */
    // Am Eintrag steht, woher er kommt: gegeneinander gespielt oder allein am eigenen Gerät
    const zelle = (kind, r, mein) => `<td class="num rec">${r
      ? `<b>${Text.esc(Best.format(kind, r))}</b><i>${r.q === 'net' ? '<span class="q-net" title="in einer Runde gegeneinander erspielt">🌐</span> ' : ''}${Text.esc(r.n)}</i>`
      : '<b>–</b>'}${mein === false ? '' : meinsZelle(kind, mein, r && r.s)}</td>`;
    const rows = w.courses.map((c, i) => {
      const h = k => rec[k].holes[c.name];
      return `<tr><td>${i + 1}</td><td>${holeIcon(c)} ${Text.esc(c.name)}</td><td class="num">${Best.par(w.id, c)}</td>
        ${Best.KINDS.map(k => zelle(k, h(k), Best.eigenerWert(w.id, c.name, k))).join('')}</tr>`;
    }).join('');
    /* Gesamt: die besten Einzelbahnen zusammengezählt – erst die der Liste, daneben die eigenen.
       Fehlt noch eine Bahn, steht die Summe trotzdem da; dazu, über wie viele Bahnen sie geht. */
    // Steht die Summe über alle Bahnen, braucht es keinen Hinweis – sonst schon
    const wieViele = s => s.fertig < s.gesamt ? `<i>${s.fertig} von ${s.gesamt}</i>` : '';
    const gesamtZeile = Best.KINDS.map(k => {
      const alle = Best.rekordSumme(w.id, w.courses, k), mein = Best.eigenSumme(w.id, w.courses, k);
      const oben = alle.fertig
        ? `<b>${Text.esc(Best.formatWert(k, alle.wert))}</b>${wieViele(alle)}`
        : '<b>–</b>';
      const unten = mein.fertig
        ? `<em class="mein${alle.fertig === alle.gesamt && mein.fertig === mein.gesamt && mein.wert <= alle.wert ? ' gleich' : ''}" title="deine besten Bahnen zusammen"><span class="du">du</span> ${Text.esc(Best.formatWert(k, mein.wert))}${wieViele(mein)}</em>`
        : '<em class="mein leer" title="hier hast du noch kein Ergebnis"><span class="du">du</span> –</em>';
      return `<td class="num rec">${oben}${unten}</td>`;
    }).join('');
    // Für die ganze Runde am Stück führt das Gerät keinen eigenen Stand – da bleibt die Zeile leer
    const rundeZeile = Best.KINDS.map(k => zelle(k, rec[k].round, false)).join('');
    const parTotal = Best.parSumme(w.id, w.courses);
    overlay(`<div class="panel wide">
      <div class="panel-head"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span><h2>${Icons.svg('emoji_events')} Rangliste</h2></div>
      <div class="sub">Für jede Bahn zählen <b>alle drei Wertungen gleichzeitig</b> – Namen eintragen, losspielen,
        der Rest passiert von allein. Gewertet wird dein eigener Ball im Wettkampf.</div>
      <div class="sub warn-note">Diese Liste ist eine Anschreibetafel, kein Schiedsrichter: Jedes Gerät meldet sein
        Ergebnis selbst, niemand prüft es nach. <b>🌐</b> heißt „in einer Runde gegeneinander erspielt", da haben
        andere zugeschaut. Einträge ohne Zeichen sind allein am eigenen Gerät entstanden.</div>
      <p class="join-row"><label class="lbl">Dein Name<input id="bn" class="name-in" autocomplete="off" spellcheck="false" placeholder="z. B. Max" maxlength="${Text.NAME_MAX}" value="${Text.esc(Best.name)}"></label>
        <span class="btn small" id="bsave">Merken</span></p>
      ${speicherGeht() ? '' : '<div class="sub net-note">Dieser Browser darf hier nichts merken – der Name gilt nur, bis das Spiel geschlossen wird. Öffne das Spiel direkt im Browser, dann bleibt er.</div>'}
      <div class="sub net-note" id="bstate">${!Best.name ? 'Trag deinen Namen ein – ohne Namen wird nichts gewertet.'
        : Net.status === 'ready' ? 'Verbunden – alle mit dem Spiel teilen sich diese Liste.'
        : 'Keine Verbindung – die Rekorde bleiben vorerst auf diesem Gerät.'}</div>
      <div id="bw" class="ow">${WORLDS.filter(x => x.id !== 'custom').map(x => `<span class="btn ghost small ${x.id === w.id ? 'sel' : ''}" data-w="${x.id}">${MODE_ICON[worldMode(x)]} ${Text.esc(x.short)}</span>`).join('')}</div>
      <div class="sub" style="margin-top:10px"><b>${Text.esc(w.name)}</b> · Par ${parTotal}</div>
      ${belohnungsStand(w)}
      <div class="tabelle-schiebe"><table class="scores best-table">
        <tr><th>#</th><th>Bahn</th><th>Par</th>${Best.KINDS.map(k => `<th class="num">${BEST_ICON[k]} <span class="kopf-wort">${Best.KIND_NAME[k]}</span></th>`).join('')}</tr>
        ${rows}
        <tr class="gesamt"><td></td><td>Gesamt <i>beste Bahnen zusammen</i></td><td class="num">${parTotal}</td>${gesamtZeile}</tr>
        <tr class="ganze-runde"><td></td><td>Ganze Runde <i>an einem Stück</i></td><td></td>${rundeZeile}</tr>
      </table></div>
      <p style="margin-top:12px">${Best.binBesitzer
        ? `<span class="btn ghost small" id="brs">${Icons.svg('restart_alt')} Rangliste zurücksetzen</span>
           <span class="btn ghost small" id="bkey">${Icons.svg('save')} Schlüssel sichern</span>`
        : Best.gibtBesitzer
          ? `<span class="sub" style="display:block">Zurücksetzen kann nur, wer die Liste führt.
             <span class="btn ghost small" id="bkey">${Icons.svg('save')} Schlüssel einsetzen</span></span>`
          : `<span class="btn ghost small" id="bown">${Icons.svg('emoji_events')} Liste führen</span>`}</p>
      <div class="legend"><b>Grün darunter steht dein eigener Wert</b> – in jeder Zelle, auch wenn der
        Rekord dir selbst gehört. Er liegt nur auf diesem Gerät und wird nirgends geteilt. Steht er in
        Gold, ist er zugleich der Rekord.<br>
        <b>Gesamt</b> zählt die besten Einzelbahnen zusammen, jede Bahn ihr bester Versuch. Die
        <b>ganze Runde</b> darunter ist eine einzige Runde am Stück – dafür führt das Spiel keinen
        eigenen Stand.<br>
        <b>Par kommt aus dieser Liste:</b> Es liegt immer einen Schlag über dem besten
        Ergebnis, das je auf einer Bahn gespielt wurde. Hat sie noch niemand gespielt, gilt das gebaute Par.
        Wird ein Rekord verbessert, wird Par im selben Moment schärfer – für alle.<br>
        <b>${BEST_ICON.strokes} Schläge:</b> ${BEST_HELP.strokes}<br>
        <b>${BEST_ICON.time} Zeit:</b> ${BEST_HELP.time}<br>
        <b>${BEST_ICON.combo} Kombi:</b> ${BEST_HELP.combo}<br>
        Alle, die das Spiel haben, teilen sich diese Liste. Die Rekorde liegen beim Vermittler und
        zusätzlich hier im Browser – startet der Vermittler neu, können sie dort verloren gehen.</div>
    </div>`, 'title');
    $('back').addEventListener('click', showTitle);
    ui.overlay.querySelectorAll('#bw .btn').forEach(b => b.addEventListener('click', () => showBestList(b.dataset.w)));
    if ($('brs')) $('brs').addEventListener('click', () => fragenUndZuruecksetzen(w.id));
    if ($('bkey')) $('bkey').addEventListener('click', () => zeigeSchluessel(w.id));
    if ($('bown')) $('bown').addEventListener('click', () => werdeListenfuehrer(w.id));
    $('bn').addEventListener('keydown', e => { if (e.key === 'Enter') $('bsave').click(); });
    $('bsave').addEventListener('click', () => {
      Sfx.unlock();
      Best.setName($('bn').value);
      Best.start(bestStatus);
      showBestList(w.id);
    });
  }

  /* Die Liste führen: einmalig ein Schlüsselpaar anlegen. Der öffentliche Teil wird geteilt,
     der private bleibt hier – nur damit lässt sich später zurücksetzen. */
  function werdeListenfuehrer(weltId) {
    overlay(`<div class="panel">
      <div class="panel-head"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span><h2>${Icons.svg('emoji_events')} Liste führen</h2></div>
      <div class="sub">Noch führt niemand die Rangliste. Wer sie führt, darf sie zurücksetzen – sonst niemand.</div>
      <div class="sub warn-note">Dein Gerät legt dafür einen Schlüssel an. Der öffentliche Teil geht an alle,
        der geheime bleibt hier und wird nie verschickt. <b>Sichere ihn danach</b> – ohne ihn kann niemand mehr
        zurücksetzen, auch du nicht.</div>
      <p style="margin-top:14px"><span class="btn" id="lf-ja">Liste übernehmen</span></p>
      <div class="legend">Wer zuerst übernimmt, führt die Liste. Sag deinen Freunden Bescheid, damit
        es nicht jemand anderes tut.</div>
    </div>`, 'title');
    $('back').addEventListener('click', () => showBestList(weltId));
    $('lf-ja').addEventListener('click', async () => {
      Sfx.unlock();
      const raus = await Best.werdeBesitzer();
      if (!raus.ok) {
        showMessage(raus.grund === 'schonVergeben' ? 'Jemand anderes führt die Liste schon.'
          : raus.grund === 'keinKrypto' ? 'Dieser Browser kann keine Schlüssel anlegen.'
          : 'Das hat nicht geklappt.', 2600);
        showBestList(weltId); return;
      }
      zeigeSchluessel(weltId, true);
    });
  }

  /* Schlüssel sichern oder auf einem anderen Gerät einsetzen */
  function zeigeSchluessel(weltId, frisch) {
    const meiner = Best.schluesselText;
    overlay(`<div class="panel">
      <div class="panel-head"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span><h2>${Icons.svg('save')} Schlüssel</h2></div>
      ${frisch ? '<div class="sub">Du führst jetzt die Rangliste.</div>' : ''}
      ${meiner ? `<div class="sub">Das ist dein geheimer Schlüssel. Sichere ihn – etwa in einer Notiz –
          und setze ihn auf deinen anderen Geräten ein. Wer ihn hat, kann die Rangliste zurücksetzen.</div>
        <textarea id="kt" rows="4" spellcheck="false" readonly>${Text.esc(meiner)}</textarea>
        <p><span class="btn small" id="k-copy">Kopieren</span></p>`
        : `<div class="sub">Setze hier den Schlüssel ein, den du auf deinem anderen Gerät gesichert hast.</div>`}
      <div class="sub" style="margin-top:10px">${meiner ? 'Anderen Schlüssel einsetzen:' : ''}</div>
      <textarea id="kein" rows="3" spellcheck="false" placeholder="Schlüssel hier einfügen …"></textarea>
      <p><span class="btn small ghost" id="k-set">Einsetzen</span></p>
      <div class="legend">Der Schlüssel liegt nur in diesem Browser. Löschst du die Daten der Seite,
        ist er weg – dann kann niemand mehr zurücksetzen.</div>
    </div>`, 'title');
    $('back').addEventListener('click', () => showBestList(weltId));
    if ($('k-copy')) $('k-copy').addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(meiner); showMessage('Schlüssel kopiert', 1800); }
      catch (e) { $('kt').select(); showMessage('Markiert – jetzt kopieren', 2200); }
    });
    $('k-set').addEventListener('click', async () => {
      const raus = await Best.schluesselEinsetzen($('kein').value);
      showMessage(raus.ok ? 'Schlüssel eingesetzt – du kannst jetzt zurücksetzen'
        : raus.grund === 'passtNicht' ? 'Dieser Schlüssel gehört nicht zu dieser Rangliste.'
        : 'Der Schlüssel ist nicht lesbar.', 2800);
      if (raus.ok) showBestList(weltId);
    });
  }

  /* Zurücksetzen betrifft alle – darum wird deutlich gefragt, bevor etwas passiert */
  function fragenUndZuruecksetzen(weltId) {
    overlay(`<div class="panel">
      <h2>Rangliste zurücksetzen?</h2>
      <div class="sub">Alle Rekorde aller Welten werden gelöscht – <b>bei dir und bei allen anderen</b>.
        Das lässt sich nicht rückgängig machen.</div>
      <div class="sub warn-note">Nützlich, wenn jemand Ergebnisse eingetragen hat, die nicht stimmen.
        Danach fangen alle wieder bei null an.</div>
      <p style="margin-top:14px"><span class="btn ghost small" id="rs-nein">${Icons.svg('arrow_back')} Lieber nicht</span>
        <span class="btn" id="rs-ja">Zurücksetzen</span></p>
    </div>`, 'title');
    $('rs-nein').addEventListener('click', () => showBestList(weltId));
    $('rs-ja').addEventListener('click', async () => {
      Sfx.unlock();
      const raus = await Best.reset();
      showBestList(weltId);
      showMessage(!raus.ok ? 'Zurücksetzen kann nur, wer die Liste führt.'
        : raus.gesendet ? 'Rangliste zurückgesetzt – auch bei den anderen'
        : 'Auf diesem Gerät zurückgesetzt. Ohne Verbindung erfahren es die anderen erst später.', 3200);
    });
  }

  const BEST_ICON = { strokes: '🏆', time: '⏱', combo: '⚡' };
  function speicherGeht() {
    try { localStorage.setItem(speicherSchluessel('probe'), '1'); localStorage.removeItem(speicherSchluessel('probe')); return true; } catch (e) { return false; }
  }
  const BEST_HELP = {
    strokes: 'die Schläge einer Bahn, wie beim Golf üblich.',
    time: 'die Uhr läuft, sobald dein Ball auf dem Abschlag liegt, und stoppt beim Einlochen. Im Menü und wenn die Seite in den Hintergrund geht, steht sie still.',
    combo: 'gerechnet wie beim Speedgolf: <b>Schläge + Minuten</b>. Vier Schläge in 1:12 ergeben 4 + 1,2 = <b>5,2</b>. Wer trödelt, verliert – wer wild drauflos schlägt, aber auch.',
  };

  /* ---------- Rangliste ----------
     Gewertet wird der eigene Ball im Wettkampf: am Gerät Spieler 1, online der eigene Platz.
     Im Kreativmodus zählt nichts, weil man dort beliebig oft neu setzen darf. */
  const myIndex = () => (online && online.started) ? online.players.findIndex(p => p.id === Net.id) : 0;
  /* Gerade verdiente Belohnung – wird auf der nächsten Ergebnistafel angesagt und dann vergessen */
  let frischerLohn = null;
  function noteRecord(score, ms) {
    if (state.mode === 'creative' || state.editorReturn) return;
    if (!state.world || state.world.id === 'custom') return;
    if (state.curPlayer !== myIndex()) return;
    const def = state.courses[state.holeIdx];
    // Vorher merken, ob die Belohnung dieser Welt schon zu haben war – sonst fiele der Moment
    // des Freischaltens nicht auf
    const lohn = Hats.belohnung(state.world.id);
    const vorherFrei = lohn ? Hats.freigeschaltet(lohn.id) : true;
    const treffer = Best.hole(state.world.id, def.name, score, ms, (online && online.started) ? 'net' : 'lokal', state.mode);
    if (treffer.length) { Sfx.sink(); showMessage(`🏆 ${def.name}: ${recordText(treffer)}`, 2600); }
    if (lohn && !vorherFrei && Hats.freigeschaltet(lohn.id)) {
      /* Sofort melden, nicht verzögert: Gleich danach geht die Ergebnistafel auf, und über der
         schweigt showMessage. Die Tafel bekommt die Nachricht darum noch einmal als Zeile –
         so geht der Moment nicht unter, wenn man gerade woanders hinschaut. */
      Sfx.sink();
      showMessage(`${lohn.icon} ${lohn.name} freigeschaltet!`, 3400);
      frischerLohn = lohn;
    }
    // Läuft gerade das Turnier und sind wir in seiner Welt, zählt der Wert dort zusätzlich
    if (state.world.id === Turnier.WELT && Turnier.bahn(def.name, score, ms) && !treffer.length)
      showMessage(`⚔️ Turnier: ${def.name} verbessert`, 2200);
  }
  /* „Schläge 2 (vorher 3), Zeit 0:14,2" – aus den gefallenen Rekorden einer Runde */
  const recordText = treffer => treffer.map(h =>
    `${Best.KIND_NAME[h.kind]} ${Best.format(h.kind, h.rec)}${h.old ? ` (vorher ${Best.format(h.kind, h.old)})` : ''}`).join(', ');
  /* Ein anderes Gerät hat einen Rekord gemeldet */
  function recordFromFriend(worldId, news) {
    if (!news || !news.length) return;
    if (state.phase === 'title' || state.phase === 'edit') return;
    const w = WORLDS.find(x => x.id === worldId);
    for (const n of news.slice(0, 1)) {
      if (n.rec.n === Best.name) continue;   // der eigene Eintrag von einem anderen Gerät
      const wert = `${Best.KIND_NAME[n.kind] || 'Schläge'} ${Best.format(n.kind, n.rec)}`;
      showMessage(n.hole ? `🏆 ${n.rec.n}: ${n.hole} – ${wert}` : `🏆 ${n.rec.n}: ${w ? w.name : 'Welt'} gesamt – ${wert}`, 2600);
    }
    updateHud();
  }

  /* ---------- Online gegeneinander ----------
     Alle Geräte im Raum spielen dieselbe Welt reihum. Wer dran ist, ist für seinen Zug die
     verbindliche Quelle: er sagt den Schlag an, die anderen spielen ihn mit, und am Ende sagt er
     Ruheort, Schlagzahl und Ergebnis. So dürfen die Simulationen unterwegs ein wenig
     auseinanderlaufen, ohne dass die Punkte auseinanderlaufen. Zwischen den Bahnen gibt der
     Gastgeber den Takt vor, damit alle auf derselben Bahn stehen. */
  const ONLINE_MAX = 4;                 // so viele Geräte passen in einen Raum
  const BEAT = 4000, LOST = 22000;      // Lebenszeichen alle 4 s, nach 22 s gilt jemand als weg
  let online = null, beatT = null, watchT = null;
  const myTurn = () => !online || !online.started || ((online.players[state.curPlayer] || {}).id === Net.id);
  const netSend = m => { if (online) Net.send(m); };
  const onlineWorlds = () => WORLDS.filter(w => w.id !== 'custom');
  /* Namen aus dem Netz gehen in die Anzeige – gefiltert wird zentral in src/text.js */
  const seatName = (p, i) => (p && Text.name(p.nick)) || PLAYER_NAMES[i];

  /* Einstieg: Raum aufmachen oder einem Code beitreten */
  function showOnline(note) {
    leaveOnline();
    state.phase = 'title'; document.body.classList.add('title');
    document.body.classList.remove('creative', 'editing', 'testing');
    overlay(`<div class="panel">
      <div class="panel-head"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span><h2>${Icons.svg('public')} Online spielen</h2></div>
      <div class="sub">Einer macht einen Raum auf und sagt den Code durch, die anderen tippen ihn ein.
        Bis zu ${ONLINE_MAX} Geräte, gespielt wird reihum.</div>
      ${note ? `<div class="sub net-note">${Text.esc(note)}</div>` : ''}
      <p><span class="btn" id="host">Raum aufmachen</span></p>
      <p>oder Code eintippen:</p>
      <p class="join-row"><input id="code" class="code-in" maxlength="4" inputmode="numeric" pattern="[0-9]*" autocomplete="off" spellcheck="false" placeholder="1234">
        <span class="btn" id="join">Beitreten</span></p>
      <div class="legend">Dafür braucht ihr Internet. Jeder spielt mit seinem eigenen Hut, die Welt sucht der Gastgeber aus.</div>
    </div>`, 'title');
    $('back').addEventListener('click', showTitle);
    $('host').addEventListener('click', () => { Sfx.unlock(); Music.start(); enterRoom(Net.makeCode(), true); });
    const go = () => {
      const c = ($('code').value || '').replace(/[^0-9]/g, '');
      if (c.length === 4) { Sfx.unlock(); Music.start(); enterRoom(c, false); } else showOnline('Der Code besteht aus vier Ziffern.');
    };
    $('join').addEventListener('click', go);
    $('code').addEventListener('input', e => { e.target.value = e.target.value.replace(/[^0-9]/g, ''); });
    $('code').addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
  }

  function enterRoom(code, host) {
    online = { code, host, hostId: '', players: [], started: false, world: onlineWorlds()[0].id, seen: {}, note: 'Verbinde …' };
    const id = Net.join(code, { message: netMessage, status: netStatus });
    if (host) { online.hostId = id; online.players = [{ id, nick: Best.name, hat: hutOderErsatz(playerHats[0], 0) }]; }
    showLobby();
    clearInterval(beatT); clearInterval(watchT);
    beatT = setInterval(() => netSend({ t: 'alive' }), BEAT);
    watchT = setInterval(checkPeers, 5000);
  }
  function leaveOnline() {
    clearInterval(beatT); clearInterval(watchT); beatT = null; watchT = null;
    if (online) { netSend({ t: 'bye' }); Net.leaveRoom(); }
    online = null;                      // die Verbindung bleibt für die Rangliste bestehen
  }
  function onlineLost(text) { leaveOnline(); showOnline(text); }

  function netStatus(s, text) {
    if (!online) return;
    if (s === 'ready') {
      online.note = online.host ? '' : 'Suche den Raum …';
      if (online.host) sendRoster(); else netSend({ t: 'hello', hat: hutOderErsatz(playerHats[0], 0), nick: Best.name });
    } else if (s === 'connecting') online.note = 'Verbinde …';
    else if (s === 'retry') online.note = 'Die Verbindung wackelt, ich versuche es nochmal …';
    else if (s === 'error') { onlineLost(text || 'Die Verbindung ist fehlgeschlagen.'); return; }
    if (!online.started) showLobby();
  }
  function sendRoster() { if (online && online.host) netSend({ t: 'roster', players: online.players, w: online.world }); }

  /* ---------- Eingehende Nachrichten prüfen ----------

     Der Raum steht auf einem offenen Vermittler: wer den vierstelligen Code kennt (oder ihn
     durchprobiert), kann hineinschreiben. Darum wird jede Nachricht geprüft, bevor sie etwas
     bewegt – Aufbau, Datentypen, Wertebereiche und die Frage, ob der Absender das überhaupt
     sagen darf. Was nicht passt, fällt still weg; ein Fehler im Netz soll das Spiel der anderen
     nicht stören.

     Was das nicht kann: Es hält niemanden davon ab, für sich selbst zu schummeln (siehe
     README, Abschnitt „Was diese Prüfungen nicht leisten"). Es hält aber alles ab, was das
     Spiel der anderen kaputtmacht: unmögliche Werte, Züge für fremde Spieler, alte Nachrichten,
     Übernahme der Gastgeberrolle. */
  const istZahl = (v, min, max) => typeof v === 'number' && isFinite(v) && v >= min && v <= max;
  const istGanz = (v, min, max) => istZahl(v, min, max) && Number.isInteger(v);
  const istText = (v, max) => typeof v === 'string' && v.length <= max;
  /* Die mitgeschickte Uhr der Hindernisse darf fehlen – dann hat das andere Gerät eine ältere
     Fassung. Hier wird nur auf „Zahl und nicht negativ" geprüft, absichtlich großzügig: Ein Schlag
     darf nie daran scheitern, dass die Uhr seltsam aussieht. Ob sie brauchbar ist, entscheidet
     taktGleichziehen – im Zweifel wird der Schlag ganz normal gespielt, nur ohne Abgleich. */
  const istTakt = v => v == null || (typeof v === 'number' && isFinite(v) && v >= 0);
  const istZaehler = v => v == null || istGanz(v, 0, 99999);   // Schlagzähler der Bahn (Kaiserloge)
  /* Liegt der Punkt auf der Bahn? Etwas Luft, weil Bälle auch am Rand liegen dürfen. */
  const aufBahn = (x, y) => {
    const lv = state.level;
    return !!lv && istZahl(x, -2, lv.W + 2) && istZahl(y, -2, lv.H + 2);
  };
  /* Sitzplatz des Absenders – nur wer laut eigenem Spielstand dran ist, darf Züge ansagen */
  const platzVon = id => online ? online.players.findIndex(p => p.id === id) : -1;
  function istAmZug(m) {
    if (state.curPlayer !== m.pi) return false;
    if (platzVon(m.from) === state.curPlayer) return true;
    // Ausnahme: Ist jemand weggegangen, wertet der Gastgeber dessen Zug mit dem Schlaglimit
    const p = online.players[state.curPlayer];
    return istGastgeber(m) && !!p && !!p.gone;
  }
  /* Der Gastgeber steht nach dem ersten Roster fest; danach zählt nur noch seine Stimme */
  const istGastgeber = m => !!online.hostId && m.from === online.hostId;

  /* Eine Spielerliste aus dem Netz in eine ungefährliche Form bringen */
  function pruefeRoster(liste) {
    if (!Array.isArray(liste)) return null;
    const raus = [], gesehen = new Set();
    for (const p of liste.slice(0, ONLINE_MAX)) {
      if (!p || !istText(p.id, 40) || !p.id || gesehen.has(p.id)) return null;   // ohne Kennung geht nichts
      gesehen.add(p.id);
      raus.push({ id: p.id, nick: Text.name(p.nick), hat: Hats.has(p.hat) ? p.hat : 'none', gone: !!p.gone });
    }
    return raus.length ? raus : null;
  }
  /* Erlaubte Welt-Kennung (eigene Welten lassen sich online nicht spielen) */
  const pruefeWelt = id => onlineWorlds().some(w => w.id === id) ? id : null;

  /* Passt die Nachricht zu ihrem Typ? Gibt true zurück, wenn sie weiterverarbeitet werden darf. */
  function nachrichtOk(m) {
    if (!m || typeof m !== 'object' || !istText(m.t, 20) || !istText(m.from, 40) || !m.from) return false;
    switch (m.t) {
      case 'hello':  return istText(m.nick == null ? '' : m.nick, 200) && (m.hat == null || istText(m.hat, 40));
      case 'roster': return !online.hostId || istGastgeber(m);   // der erste Roster bestimmt den Gastgeber
      case 'start':  return istGastgeber(m);
      case 'next':   return istGastgeber(m) && istGanz(m.h, -1, state.courses.length - 1) && istTakt(m.st);
      // Läuft die Runde schon, kommt die Absage, bevor ein Roster den Gastgeber festgelegt hat
      case 'busy':   return (!online.hostId || istGastgeber(m)) && m.to === Net.id && istText(m.why == null ? '' : m.why, 200);
      case 'shot':   return istGanz(m.h, 0, state.courses.length - 1) && istGanz(m.pi, 0, ONLINE_MAX - 1) &&
                            istZahl(m.dx, -1.01, 1.01) && istZahl(m.dy, -1.01, 1.01) &&
                            Math.abs(Math.hypot(m.dx, m.dy) - 1) < 0.02 && istZahl(m.power, 0, 1) &&
                            istTakt(m.st) && istZaehler(m.sz) && istAmZug(m);
      case 'rest':   return istGanz(m.h, 0, state.courses.length - 1) && istGanz(m.pi, 0, ONLINE_MAX - 1) &&
                            aufBahn(m.x, m.y) && (m.e == null || istGanz(m.e, 0, 8)) &&
                            istGanz(m.s, 0, 999) && istTakt(m.st) && istZaehler(m.sz) && istAmZug(m);
      case 'done':   return istGanz(m.h, 0, state.courses.length - 1) && istGanz(m.pi, 0, ONLINE_MAX - 1) &&
                            istGanz(m.score, 1, 999) && (m.ms == null || istZahl(m.ms, 0, 24 * 3600 * 1000)) && istAmZug(m);
      case 'alive':  return true;
      case 'bye':    return true;
      default:       return false;                                // unbekannter Typ: weg damit
    }
  }

  function netMessage(m) {
    if (!online) return;
    if (!nachrichtOk(m)) return;
    online.seen[m.from] = Date.now();
    switch (m.t) {
      case 'hello':
        if (!online.host) break;
        if (online.started) { netSend({ t: 'busy', to: m.from, why: 'Die Runde läuft schon.' }); break; }
        {
          /* Eine zweite Anmeldung ist kein Fehler: So sagt ein Gast, dass er im Warteraum den Hut
             gewechselt hat. Wer schon sitzt, behält seinen Platz und bekommt nur Name und Hut neu. */
          const da = online.players.find(p => p.id === m.from);
          const hut = Hats.has(m.hat) ? m.hat : 'none';
          if (da) { da.nick = Text.name(m.nick); da.hat = hut; }
          else if (online.players.length < ONLINE_MAX) online.players.push({ id: m.from, nick: Text.name(m.nick), hat: hut });
        }
        sendRoster(); showLobby();
        break;
      case 'roster': {
        if (online.host) break;
        const liste = pruefeRoster(m.players);
        if (!liste) break;
        online.hostId = m.from; online.players = liste; online.world = pruefeWelt(m.w) || online.world;
        const drin = online.players.some(p => p.id === Net.id);
        online.note = drin ? '' : (online.players.length >= ONLINE_MAX ? 'Der Raum ist voll.' : 'Melde mich an …');
        if (!online.started) showLobby();
        break;
      }
      case 'busy':
        if (!online.host && m.to === Net.id) onlineLost(m.why || 'Der Raum nimmt gerade niemanden auf.');
        break;
      case 'start': {
        if (online.host || online.started) break;
        const liste = pruefeRoster(m.players);
        online.players = liste || online.players;
        online.world = pruefeWelt(m.w) || online.world;
        if (!online.players.length) break;
        startOnlineGame();
        break;
      }
      case 'shot':
        if (!myTurn() && state.ball && state.phase === 'aim' && m.h === state.holeIdx) {
          taktGleichziehen(m.st);          // erst den Takt der Hindernisse übernehmen
          schlagZahlSetzen(m.sz);          // und den Daumenstand der Kaiserloge
          shoot(m.dx, m.dy, m.power, true);
        }
        break;
      case 'rest':
        if (!myTurn() && state.ball && m.h === state.holeIdx) {
          taktGleichziehen(m.st);
          schlagZahlSetzen(m.sz);
          const b = state.ball;
          b.x = m.x; b.y = m.y; b.z = 0; b.vx = 0; b.vy = 0; b.vz = 0; b.air = false; b.rider = null;
          b.restX = m.x; b.restY = m.y;
          b.ebene = b.restEbene = (typeof m.e === 'number' && m.e >= 0 && m.e < (state.level.flaechen || [0]).length) ? m.e : 0;
          state.level.setzeEbene(b.ebene);
          state.strokes = m.s; state.phase = 'aim'; clearTimeout(waitTimer); faceCup(); updateHud();
        }
        break;
      case 'done':
        if (!myTurn() && m.h === state.holeIdx) {
          const b = state.ball;
          if (b && m.sunk && !b.sunk) { b.x = state.level.cup.x; b.y = state.level.cup.y; b.z = 0; b.vx = 0; b.vy = 0; b.sunk = true; b.sinkT = 0; Sfx.sink(); }
          state.strokes = m.score; clearTimeout(waitTimer); finishTurn(m.score, true, m.ms == null ? null : m.ms);
        }
        break;
      case 'next':
        if (online.host || !online.started) break;
        taktGleichziehen(m.st);
        clearTimeout(waitTimer); hideOverlay();
        if (m.h < 0) showFinal(); else loadHole(m.h);
        break;
      case 'bye':
        if (!online.host) { if (istGastgeber(m)) onlineLost('Der Gastgeber hat den Raum verlassen.'); break; }
        if (platzVon(m.from) < 0) break;                      // wer nicht im Raum ist, kann ihn nicht verlassen
        if (online.started) dropPlayer(m.from);
        else { online.players = online.players.filter(p => p.id !== m.from); sendRoster(); showLobby(); }
        break;
    }
  }

  /* Wer sich lange nicht meldet, gilt als weg */
  function checkPeers() {
    if (!online) return;
    const now = Date.now();
    if (!online.host) {
      // solange ich nicht in der Liste stehe, melde ich mich weiter an
      if (Net.status === 'ready' && !online.players.some(p => p.id === Net.id)) netSend({ t: 'hello', hat: hutOderErsatz(playerHats[0], 0), nick: Best.name });
      if (online.hostId && now - (online.seen[online.hostId] || now) > LOST) onlineLost('Der Gastgeber hat den Raum verlassen.');
      return;
    }
    for (const p of online.players.slice()) {
      if (p.id === Net.id || p.gone) continue;
      if (now - (online.seen[p.id] || now) < LOST) continue;
      if (online.started) dropPlayer(p.id);
      else { online.players = online.players.filter(x => x.id !== p.id); sendRoster(); showLobby(); }
    }
  }
  function dropPlayer(id) {
    const i = online.players.findIndex(p => p.id === id);
    if (i < 0 || online.players[i].gone) return;
    online.players[i].gone = true;
    if (state.players[i]) state.players[i].gone = true;
    showMessage(`${seatName(online.players[i], i)} ist weg`, 1600);
    if (state.curPlayer === i && state.phase !== 'summary' && state.phase !== 'final') skipGoneTurn();
  }
  /* Zug eines Weggegangenen: mit dem Schlaglimit werten und weiter */
  function skipGoneTurn() {
    if (!online || !online.host || !online.started) return;
    const p = online.players[state.curPlayer];
    if (!p || !p.gone || state.players[state.curPlayer].scores[state.holeIdx] != null) return;
    const sc = maxStrokes() === Infinity ? parHier() : maxStrokes();
    netSend({ t: 'done', h: state.holeIdx, pi: state.curPlayer, score: sc, sunk: false });
    finishTurn(sc, true);
  }

  /* Warteraum: Code, Sitzplätze und – beim Gastgeber – die Weltwahl */
  function showLobby() {
    if (!online || online.started) return;
    /* Steht die Hutwahl offen, bleibt sie offen: Sonst schöbe sich der Warteraum davor, sobald
       der Gastgeber die Liste neu schickt - und das tut er bei jedem Hutwechsel. */
    if (online.hutwahl) return;
    const ws = onlineWorlds();
    const meinPlatz = online.players.findIndex(p => p.id === Net.id);
    const seats = online.players.map((p, i) => `<div class="seat${p.id === Net.id ? ' me' : ''}">
        <canvas class="seat-ball" data-hat="${p.hat}" data-col="${PLAYER_COLORS[i]}"></canvas>
        <b>${Text.esc(seatName(p, i))}${p.id === online.hostId ? ' ' + Icons.svg('star') : ''}</b></div>`).join('');
    const free = Math.max(0, ONLINE_MAX - online.players.length);
    overlay(`<div class="panel">
      <div class="panel-head"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span><h2>${Icons.svg('public')} Warteraum</h2></div>
      <div class="sub">${online.host ? 'Sag diesen Code durch – wer beitritt, erscheint hier.'
        : online.players.some(p => p.id === Net.id) ? 'Du bist im Raum. Der Gastgeber startet.' : 'Ich klopfe an …'}</div>
      <div class="room-code">${online.code}</div>
      <div class="seats">${seats}${'<div class="seat empty">frei</div>'.repeat(free)}</div>
      ${meinPlatz >= 0 ? `<p class="mein-hut"><span class="btn ghost small" id="hutwahl">${Icons.svg('sports_golf')} Hut wechseln</span></p>` : ''}
      ${online.note ? `<div class="sub net-note">${Text.esc(online.note)}</div>` : ''}
      ${online.host
        ? `<p>Welt:</p><div id="ow" class="ow">${ws.map(w => `<span class="btn ghost small ${w.id === online.world ? 'sel' : ''}" data-w="${w.id}">${MODE_ICON[worldMode(w)]} ${Text.esc(w.name)}</span>`).join('')}</div>
           <p><span class="btn" id="go">Los geht's!</span></p>`
        : `<div class="sub">Welt: <b>${Text.esc((ws.find(w => w.id === online.world) || ws[0]).name)}</b></div>`}
      <div class="legend">Gespielt wird reihum: wer dran ist, zielt, die anderen schauen zu. Eigene Bahnen lassen sich online nicht spielen.</div>
    </div>`, 'title');
    ui.overlay.querySelectorAll('.seat-ball').forEach(cv => Hats.preview(cv, cv.dataset.hat, cv.dataset.col));
    $('back').addEventListener('click', () => showOnline());
    if ($('hutwahl')) $('hutwahl').addEventListener('click', () => { Sfx.unlock(); showLobbyHats(); });
    if (!online.host) return;
    ui.overlay.querySelectorAll('#ow .btn').forEach(b => b.addEventListener('click', () => { online.world = b.dataset.w; sendRoster(); showLobby(); }));
    $('go').addEventListener('click', () => {
      if (online.players.length < 2) { online.note = 'Es fehlt noch jemand im Raum.'; showLobby(); return; }
      Sfx.unlock();
      netSend({ t: 'start', players: online.players, w: online.world });
      startOnlineGame();
    });
  }
  /* Hutwahl im Warteraum. Bis hierher stand der Hut nur im Startbildschirm fest – wer sah, dass
     ein anderer denselben trägt, musste den Raum verlassen, um zu wechseln. Jetzt geht es hier.

     Der eigene Platz wird sofort umgestellt, damit der Wechsel unmittelbar zu sehen ist; verteilt
     wird er wie alles andere: Der Gastgeber schickt die Liste neu, ein Gast meldet sich einfach
     noch einmal an. Die Anmeldung trägt Name und Hut ohnehin schon bei sich. */
  function showLobbyHats() {
    if (!online || online.started) return;
    const i = online.players.findIndex(p => p.id === Net.id);
    if (i < 0) { showLobby(); return; }
    online.hutwahl = true;
    const col = PLAYER_COLORS[i];
    overlay(`<div class="panel">
      <div class="panel-head"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span><h2>${Icons.svg('sports_golf')} Dein Hut</h2></div>
      <div class="sub">Der Wechsel ist gleich bei allen im Raum zu sehen.</div>
      <div id="hats" class="hat-grid">${Hats.LIST.map(h => `<button type="button" class="hat" data-h="${h.id}" title="${Text.esc(h.name)}"><canvas></canvas><span>${Text.esc(h.name)}</span><i class="hat-lock">${Icons.svg('lock')}</i></button>`).join('')}</div>
      <p style="margin-top:14px"><span class="btn" id="fertig">Fertig</span></p>
    </div>`, 'title');
    const zeichne = () => {
      const jetzt = hutOderErsatz(playerHats[0], 0);
      ui.overlay.querySelectorAll('#hats .hat').forEach(b => {
        const frei = Hats.freigeschaltet(b.dataset.h);
        b.classList.toggle('sel', b.dataset.h === jetzt);
        b.classList.toggle('zu', !frei);
        b.classList.toggle('probe', !frei && TEST_FREI);
        const wie = Hats.stand(b.dataset.h);
        b.title = frei ? Hats.name(b.dataset.h)
          : `${Hats.name(b.dataset.h)} – ${Hats.bedingung(b.dataset.h)}${wie ? ' · ' + wie : ''}${TEST_FREI ? ' (hier zum Ausprobieren freigegeben)' : ''}`;
        Hats.preview(b.querySelector('canvas'), b.dataset.h, col);
      });
    };
    ui.overlay.querySelectorAll('#hats .hat').forEach(b => b.addEventListener('click', () => {
      Sfx.unlock();
      if (!Hats.freigeschaltet(b.dataset.h)) {
        const wie = Hats.stand(b.dataset.h);
        if (!TEST_FREI) { showMessage(`${Hats.name(b.dataset.h)}: ${Hats.bedingung(b.dataset.h)}${wie ? ' · ' + wie : ''}`, 3200); return; }
        showMessage(`${Hats.name(b.dataset.h)} – zum Ausprobieren freigegeben`, 2400);
      }
      setHat(0, b.dataset.h);
      meinHutMelden();
      zeichne();
    }));
    zeichne();
    for (const id of ['back', 'fertig']) $(id).addEventListener('click', () => { online.hutwahl = false; showLobby(); });
  }
  /* Den eigenen Hut im Raum bekanntgeben – als Gastgeber über die Liste, als Gast über die Anmeldung */
  function meinHutMelden() {
    if (!online || online.started) return;
    const hut = hutOderErsatz(playerHats[0], 0);
    const p = online.players.find(x => x.id === Net.id);
    if (p) p.hat = hut;
    if (online.host) sendRoster(); else netSend({ t: 'hello', hat: hut, nick: Best.name });
  }

  function startOnlineGame() {
    if (!online) return;
    online.started = true; online.hutwahl = false;
    setWorld(online.world);
    state.mode = 'normal';
    startGame(online.players.length, 0, online.players);
  }

  function showSetup() {
    overlay(`<div class="panel">
      <div class="panel-head"><span class="btn ghost small" id="back-top">${Icons.svg('arrow_back')} Zurück</span><h2>${MODE_ICON[worldMode(state.world)]} ${Text.esc(state.world.name)}</h2></div>
      <div class="sub">${MODE_NAME[worldMode(state.world)]} · ${state.courses.length} Bahnen</div>
      <p>Modus:</p>
      <div id="gm">
        <span class="btn ghost small ${gameMode === 'normal' ? 'sel' : ''}" data-g="normal">${Icons.svg('emoji_events')} Wettkampf</span>
        <span class="btn ghost small ${gameMode === 'creative' ? 'sel' : ''}" data-g="creative">${Icons.svg('construction')} Kreativ</span>
      </div>
      <div id="pc-row" ${gameMode === 'creative' ? 'hidden' : ''}>
        <p style="margin-top:10px">Spieler:</p>
        <div id="pc">${[1, 2, 3, 4].map(n => `<span class="btn ghost small ${n === playerCount ? 'sel' : ''}" data-n="${n}">${n}</span>`).join('')}</div>
      </div>
      <p style="margin-top:10px">Hut:</p>
      <div id="hat-who"></div>
      <div id="hats" class="hat-grid">${Hats.LIST.map(h => `<button type="button" class="hat" data-h="${h.id}" title="${Text.esc(h.name)}"><canvas></canvas><span>${Text.esc(h.name)}</span><i class="hat-lock">${Icons.svg('lock')}</i></button>`).join('')}</div>
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
      <p style="margin-top:14px"><span class="btn ghost small" id="back">${Icons.svg('arrow_back')} Zurück</span> <span class="btn" id="start">Los geht's!</span></p>
      <div class="legend">
        <b>Wettkampf:</b> alle Bahnen der Reihe nach, mit Schlaglimit und Ergebnistafel. <b>Kreativ:</b> allein, ohne Limit, mit den Bahn-Knöpfen (Tasten P / N) frei springen.<br>
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
        const frei = Hats.freigeschaltet(b.dataset.h);
        b.classList.toggle('sel', b.dataset.h === hutOderErsatz(playerHats[hatWho], hatWho));
        b.classList.toggle('zu', !frei);
        b.classList.toggle('probe', !frei && TEST_FREI); // Vorschau: Sperre zeigen, Skin trotzdem sehen
        // Gesperrt: der Platz bleibt sichtbar, damit man weiß, was es zu holen gibt
        const wie = Hats.stand(b.dataset.h);
        b.title = frei ? Hats.name(b.dataset.h)
          : `${Hats.name(b.dataset.h)} – ${Hats.bedingung(b.dataset.h)}${wie ? ' · ' + wie : ''}${TEST_FREI ? ' (hier zum Ausprobieren freigegeben)' : ''}`;
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
      Sfx.unlock();
      if (!Hats.freigeschaltet(b.dataset.h)) {
        // Auf dem Prüfstand darf man eine gesperrte Belohnung trotzdem aufsetzen – dort soll man
        // alles ansehen können. Im Spiel bleibt die Sperre: dort ist sie der halbe Reiz.
        const wie = Hats.stand(b.dataset.h);
        if (!TEST_FREI) { showMessage(`${Hats.name(b.dataset.h)}: ${Hats.bedingung(b.dataset.h)}${wie ? ' · ' + wie : ''}`, 3200); return; }
        showMessage(`${Hats.name(b.dataset.h)} – zum Ausprobieren freigegeben`, 2400);
      }
      setHat(hatWho, b.dataset.h); drawWho(); drawHats();
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
  const THEME_ICONS = { meadow: '🌼', mushroom: '🍄', forge: '⚒️', forest: '🌲', dragon: '🐉', ice: '❄️', sky: '☁️', witch: '🧙', castle: '🏰', harbor: '⚓', reef: '🐠', clockwork: '⚙️', palace: '🕌', desert: '🏜️', tomb: '⚱️', deck: '🏴‍☠️', wreck: '🚢', belly: '🦈', jungle: '🌴', temple: '🗿', hut: '🧪', storm: '⛈️', fortress: '🏯', shadow: '🌑', throne: '👑', darksea: '🌊', ghostship: '⚓', clocktown: '🕰️', boiler: '🔥', escapement: '⚙️' };
  const holeIcon = def => HOLE_ICONS[def.name] || THEME_ICONS[def.theme] || '⛳';
  const worldClass = () => 'world-' + ((state.world && state.world.id) || 'custom');
  /* Das geltende Par: Es steht nicht mehr fest in der Bahn, sondern kommt aus der Rangliste –
     immer einen Schlag über dem besten Ergebnis, das je auf ihr gespielt wurde. Entschieden wird
     das an einer Stelle, in Best.par; hier stehen nur die Kurzformen für die laufende Runde. */
  const weltId = () => (state.world && state.world.id) || '';
  const parHier = () => Best.par(weltId(), state.courses[state.holeIdx]);

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
    /* Blickzonen: liegt der Ball in einer Zone, schaut die Kamera auf deren Zielpunkt (z. B.
       Mühlentür, Fähre, der nächste Rohrmund), sonst aufs Loch. Eine Zone darf sich auf eine Ebene
       beschränken ('ebene'): Bei gestapelten Bahnen liegen Steg und Galerie im Bild übereinander,
       aber man will dort in ganz verschiedene Richtungen schauen. Ohne 'ebene' gilt die Zone
       weiterhin auf jeder Ebene. */
    const eb = b.ebene || 0;
    const zone = (state.level.def.views || []).find(v => (v.ebene == null || v.ebene === eb)
      && b.x >= v.x && b.x <= v.x + v.w && b.y >= v.y && b.y <= v.y + v.h);
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
  function startGame(n, first = 0, roster = null) {
    // roster: beim Netzspiel bringt jeder Spieler seinen eigenen Hut mit
    state.players = roster
      ? roster.map((p, i) => ({ name: seatName(p, i), color: PLAYER_COLORS[i], hat: p.hat, scores: [], times: [], gone: !!p.gone }))
      : Array.from({ length: n }, (_, i) => ({ name: PLAYER_NAMES[i], color: PLAYER_COLORS[i], hat: hutOderErsatz(playerHats[i], i), scores: [], times: [] }));
    state.holeIdx = first;
    document.body.classList.remove('title');
    document.body.classList.toggle('creative', state.mode === 'creative');
    hideOverlay();
    loadHole(first);
  }
  /* Aussteigen: raus aus der laufenden Runde, zurück dorthin, wo sie ausgesucht wurde.
     Wer aus Versehen in die falsche Welt gegangen ist, kommt so ohne Neuladen wieder heraus.
     Ist schon etwas gespielt, wird vorher gefragt – der Punktestand einer Runde kommt nicht zurück. */
  const leaveTarget = () => (state.world && state.world.id === 'custom' ? showBuild : showMap);
  const roundStarted = () => state.mode !== 'creative' &&
    (state.holeIdx > 0 || state.strokes > 0 || state.players.some(p => p.scores.some(v => v != null)));
  function leaveRound(force) {
    if (state.phase === 'title' || state.phase === 'edit' || !state.level) return;
    // Liegt schon eine Tafel obenauf (Bahn fertig, Endergebnis), hat die ihren eigenen Weg zurück
    if (!force && ui.overlay.classList.contains('visible')) return;
    if (state.editorReturn) { clearTimeout(waitTimer); hideOverlay(); editor.returnFromTest(); return; }
    if (!force && roundStarted()) { askLeave(); return; }
    clearTimeout(waitTimer); clearTimeout(msgTimer); ui.msg.classList.remove('visible');
    drag = null; state.aim = null;          // kein hängen gebliebener Zug, der später Berührungen schluckt
    leaveOnline();
    hideOverlay();
    leaveTarget()();
  }
  function askLeave() {
    overlay(`<div class="panel">
      <h2>Runde verlassen?</h2>
      <div class="sub">Zurück ${state.world && state.world.id === 'custom' ? 'zur Auswahl' : 'zur Weltkarte'} – der Punktestand dieser Runde geht dabei verloren.</div>
      <p style="margin-top:14px"><span class="btn ghost small" id="stay">${Icons.svg('arrow_back')} Weiterspielen</span> <span class="btn" id="leave-yes">Verlassen</span></p>
    </div>`);
    $('stay').addEventListener('click', hideOverlay);
    $('leave-yes').addEventListener('click', () => leaveRound(true));
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
    lv.setzeEbene(0);   // jeder Spieler beginnt unten, auch wenn der vorige oben aufgehört hat
    state.strokes = 0; state.phase = 'aim'; state.aim = null; state.restTimer = 0; state.slowTimer = 0; state.rollT = 0; state.stuckRef = null;
    faceCup(); setCamMode('follow');
    clockStart();
    if (state.players.length > 1) showMessage(`${p.name} ist dran`, 1300);
    updateHud(); syncHint();
    // Wer den Raum verlassen hat, bekommt seinen Zug vom Gastgeber mit dem Schlaglimit gewertet
    if (online && online.started && online.host && p.gone) setTimeout(skipGoneTurn, 700);
  }
  /* ---------- Gleicher Takt für alle ----------
     Alle beweglichen Sachen – Windmühlen, Fähren, Drehkreuze, Tore – richten sich nach state.t,
     der Uhr der Physik. Die läuft auf jedem Gerät ab dem eigenen Seitenaufruf, steht also überall
     anders. Rechnerisch ist die Physik immer gleich (kein Zufall), aber mit verschiedenem Takt
     fliegt derselbe Schlag woanders hin: Der Zuschauer sieht den Ball an einer Stelle abprallen,
     wo beim Schlagenden gerade nichts war. Gezählt wurde trotzdem richtig, weil das Ergebnis
     getrennt übertragen wird – nur zusehen war unbrauchbar.

     Darum schickt der Schlagende seine Uhr mit, und die anderen stellen ihre danach.
     Zeitmarken, die einen festen Zeitpunkt meinen (ein Schalter ist bis Sekunde 42 offen), werden
     um denselben Betrag verschoben – sonst wäre ein Tor plötzlich für immer offen oder zu. */
  function taktGleichziehen(fremd) {
    // Über eine Woche Laufzeit gibt es nicht – so eine Uhr wird nicht übernommen, gespielt wird trotzdem
    if (typeof fremd !== 'number' || !isFinite(fremd) || fremd < 0 || fremd > 7 * 86400) return;
    const d = fremd - state.t;
    if (!d) return;
    state.t = fremd;
    if (state.lastBounceSfx) state.lastBounceSfx += d;
    if (state.lastMoverHit) state.lastMoverHit += d;
    if (state.stuckRef) state.stuckRef.t += d;
    const b = state.ball;
    if (b) for (const k of ['shrinkUntil', 'fireAt', 'spitAt']) if (b[k]) b[k] += d;
    const lv = state.level;
    if (!lv) return;
    for (const k of Object.keys(lv.switches || {})) lv.switches[k] += d;
    for (const ob of lv.obstacles) for (const k of ['activeUntil', 'lastUse', 'firedAt', 'wechselT']) if (ob[k]) ob[k] += d;
    // Die Hindernisse sofort auf den neuen Takt stellen, damit der Schlag gleich richtig losgeht
    for (const ob of lv.obstacles) if (ob.update) ob.update(state.t);
  }

  function shoot(dx, dy, power, fromNet = false) {
    if (online && online.started && !fromNet && !myTurn()) return; // Zuschauer schlagen nicht
    if (online && online.started && !fromNet) netSend({ t: 'shot', h: state.holeIdx, pi: state.curPlayer, dx, dy, power, st: state.t, sz: schlagZahl() });
    const b = state.ball;
    b.restX = b.x; b.restY = b.y; b.shotX = b.x; b.shotY = b.y; // Schlagstart (für Aufspießen am Ruheplatz)
    b.restEbene = b.shotEbene = b.ebene || 0;   // ein Ruhepunkt ist Ort UND Ebene
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
  /* ---------- Schlagzähler der Bahn (Kaiserloge) ----------
     Der Daumen des Kaisers wechselt nach jedem Schlag, gleich welcher Spieler geschlagen hat.
     Gezählt wird das ENDE eines Schlags – so gilt der Stand, den man beim Zielen sieht, für den
     ganzen Schlag. Der Zähler hängt an der Bahn und fängt mit ihr wieder bei null an.
     Beim Online-Spiel läuft er von selbst gleich (jedes Gerät führt dieselben Schläge aus); mit
     jedem Schlag und jeder Ruhemeldung wird der Stand zur Sicherheit trotzdem mitgeschickt. */
  const schlagZahl = () => (state.level && state.level.schlagZahl) || 0;
  function schlagVorbei() { const lv = state.level; if (lv) lv.schlagZahl = (lv.schlagZahl || 0) + 1; }
  function schlagZahlSetzen(n) { if (state.level && typeof n === 'number') state.level.schlagZahl = n; }

  function ballAtRest() {
    const b = state.ball;
    b.vx = 0; b.vy = 0; b.restX = b.x; b.restY = b.y; b.restEbene = b.ebene || 0;
    schlagVorbei();
    faceCup();
    // Wer dran ist, sagt Ruheort und Schlagzahl an; die anderen uebernehmen sie
    if (online && online.started && myTurn()) netSend({ t: 'rest', h: state.holeIdx, pi: state.curPlayer, x: b.x, y: b.y, e: b.ebene || 0, s: state.strokes, st: state.t, sz: schlagZahl() });
    if (state.strokes >= maxStrokes()) { showMessage(`Maximale Schlagzahl (${maxStrokes()}) erreicht`, 1800); finishTurn(maxStrokes()); return; }
    state.phase = 'aim';
  }
  function finishTurn(score, fromNet = false, netMs = null) {
    const ms = clockStop();
    if (online && online.started) {
      if (!myTurn() && !fromNet) return;   // Zuschauer warten auf die Ansage des Schlagenden
      if (myTurn() && !fromNet) netSend({ t: 'done', h: state.holeIdx, pi: state.curPlayer, score, ms, sunk: !!(state.ball && state.ball.sunk) });
    }
    // Beim Zuschauen zählt die Zeit des Schlagenden, nicht die eigene Wartezeit
    const zeit = (fromNet && netMs != null) ? netMs : ms;
    state.players[state.curPlayer].scores[state.holeIdx] = score;
    state.players[state.curPlayer].times[state.holeIdx] = zeit;
    noteRecord(score, zeit);
    state.phase = 'wait'; state.aim = null; updateHud();
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      state.curPlayer++;
      if (state.curPlayer < state.players.length) beginTurn(); else showHoleDone();
    }, 1700);
  }
  /* Ein Ruhepunkt ist Ort UND Ebene – die zweite Sicherung dafür.
     Wird der Ball nach einem Strafschlag an seine Stelle zurückgelegt, aber stillschweigend auf
     die unterste Ebene gesetzt, steht er über dem Nichts: sofort wieder „aus", wieder
     zurückgelegt, und das ohne Ende. Über den Wolken lag jeder Ruhepunkt oben, darum fiel es dort
     auf. Liegt der gemerkte Punkt auf seiner Ebene doch nicht auf Boden, geht es zum Start des
     letzten Schlags zurück und notfalls an den Abschlag – ein Ball muss immer irgendwo liegen
     können. */
  function sichererRuhepunkt(b) {
    const lv = state.level;
    for (const [x, y, e] of [[b.restX, b.restY, b.restEbene || 0], [b.shotX, b.shotY, b.shotEbene || 0], [lv.tee.x, lv.tee.y, 0]]) {
      if (x == null || y == null) continue;
      if (lv.isFloorChar(lv.charAtEbene(e, x, y))) return { x, y, e };
    }
    return { x: lv.tee.x, y: lv.tee.y, e: 0 };
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
      b.z = 0; b.vz = 0; b.air = false; if (b.shotX != null) { b.restX = b.shotX; b.restY = b.shotY; b.restEbene = b.shotEbene || 0; }
    }
    else if (type === 'beheaded' || type === 'seen') { // zurück zum Schlagstart – aber nie wieder unter die Klinge oder in den Blick des Auges
      Sfx.lava(); burst(b.x, b.y, type === 'seen' ? '#ff9a3a' : '#ff4a4a', 26, true);
      b.z = 0; b.vz = 0; b.air = false;
      const lv = state.level; let rx = b.shotX != null ? b.shotX : b.restX, ry = b.shotX != null ? b.shotY : b.restY;
      b.restEbene = b.shotX != null ? (b.shotEbene || 0) : (b.restEbene || 0);
      if (type === 'seen') { if (lv.obstacles.some(o => o.type === 'eyetower' && Math.hypot(rx - o.x, ry - o.y) <= o.range + 0.5)) { rx = lv.tee.x; ry = lv.tee.y; b.restEbene = 0; label += ' Zurück zum Anfang.'; } }
      else for (const g of lv.obstacles) {
        if (g.type !== 'guillotine' || !g.under(rx, ry, 0.7)) continue;
        const vert = g.w < g.h, side = (vert ? Math.sign(lv.tee.x - g.x) : Math.sign(lv.tee.y - g.y)) || -1;
        for (const sd of [side, -side]) { const px = vert ? g.x + sd * (g.w / 2 + 0.9) : g.x, py = vert ? g.y : g.y + sd * (g.h / 2 + 0.9); if (lv.isFloorChar(lv.charAt(px, py))) { rx = px; ry = py; break; } }
      }
      b.restX = rx; b.restY = ry;
    }
    else { Sfx.oob(); burst(b.x, b.y, '#cccccc', 10); }
    state.strokes++;
    schlagVorbei();
    showMessage(`${label} · +1 Strafschlag`, 1700);
    state.phase = 'wait'; state.aim = null;
    const r = sichererRuhepunkt(b);
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      b.x = r.x; b.y = r.y; b.vx = 0; b.vy = 0; b.z = 0.6; b.vz = 0; b.portalCd = 0.5;
      b.ebene = b.restEbene = r.e;   // auf der Ebene weiterspielen, auf der der Ruhepunkt liegt
      b.restX = r.x; b.restY = r.y;
      state.level.setzeEbene(b.ebene);
      faceCup();
      if (state.strokes >= maxStrokes()) finishTurn(maxStrokes()); else state.phase = 'aim';
      updateHud();
    }, 900);
    updateHud();
  }
  /* Zurück an den letzten Ruhepunkt, aber OHNE Strafschlag. Feuerturm und Kaiserloge teilen sich
     das: Beide schlagen nach der Uhr bzw. nach dem Willen des Kaisers, nicht nach dem Können des
     Spielers – wer hineinläuft, verliert Zeit und Weg, nicht die Wertung.
     'art' entscheidet nur über Klang, Funken und Text. */
  function ohneStrafe(ob, art) {
    const b = state.ball, lv = state.level;
    if (art === 'feuer') { Sfx.lava(); burst(b.x, b.y, '#ffb347', 22, true); burst(b.x, b.y, '#ff5a2a', 12, true); }
    else { Sfx.oob(); burst(b.x, b.y, '#e6d5ab', 16, true); }
    b.z = 0; b.vz = 0; b.air = false;
    let rx = b.restX, ry = b.restY;
    // Ist der Ball in der Gefahrenfläche zur Ruhe gekommen, liegt sein Ruhepunkt selbst darin –
    // ihn dorthin zurückzulegen hieße, ihn gleich wieder zu erwischen. Dann geht es zum Start des
    // letzten Schlags zurück, notfalls zum Abschlag.
    if (ob && ob.trifft(rx, ry)) {
      if (b.shotX != null && !ob.trifft(b.shotX, b.shotY)) { rx = b.shotX; ry = b.shotY; b.restEbene = b.shotEbene || 0; }
      else { rx = lv.tee.x; ry = lv.tee.y; b.restEbene = 0; }
      b.restX = rx; b.restY = ry;
    }
    showMessage(art === 'feuer' ? 'Vom Feuerstoß erwischt! Zurück – ohne Strafschlag.'
                                : 'Daumen runter – durch die Falltür! Zurück, ohne Strafschlag.', 1700);
    schlagVorbei();
    state.phase = 'wait'; state.aim = null;
    b.restX = rx; b.restY = ry;
    const r = sichererRuhepunkt(b);
    clearTimeout(waitTimer);
    waitTimer = setTimeout(() => {
      b.x = r.x; b.y = r.y; b.vx = 0; b.vy = 0; b.z = 0.6; b.vz = 0; b.portalCd = 0.5;
      b.ebene = b.restEbene = r.e;   // auf der Ebene weiterspielen, auf der der Ruhepunkt liegt
      b.restX = r.x; b.restY = r.y;
      state.level.setzeEbene(b.ebene);
      faceCup();
      state.phase = 'aim';
      updateHud();
    }, 900);
    updateHud();
  }
  function sunk() {
    const par = parHier();
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
    const zeit = state.mode !== 'creative' && !state.editorReturn;   // im Kreativmodus wird nichts gestoppt
    const rows = state.players.map(p => {
      const total = p.scores.reduce((a, b) => a + b, 0);
      const hat = p.hat && p.hat !== 'none' ? `<span title="${Hats.name(p.hat)}">${Hats.icon(p.hat)}</span> ` : '';
      const ms = (p.times || [])[state.holeIdx];
      return `<tr><td><span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px"></span>${hat}${Text.esc(p.name)}</td><td class="num">${p.scores[state.holeIdx]}</td>${zeit ? `<td class="num">${ms ? Best.formatTime(ms) : '–'}</td>` : ''}<td class="num">${total}</td></tr>`;
    }).join('');
    overlay(`<div class="panel ${worldClass()}">
      <h2>${holeIcon(def)} Bahn ${state.holeIdx + 1}: ${Text.esc(def.name)}</h2>
      <div class="sub">Par ${Best.par(weltId(), def)}</div>
      ${lohnZeile()}
      <table class="scores"><tr><th>Spieler</th><th>Bahn</th>${zeit ? '<th>Zeit</th>' : ''}<th>Gesamt</th></tr>${rows}</table>
      ${!last ? `<div class="sub">Als Nächstes: <b>${Text.esc(state.courses[state.holeIdx + 1].name)}</b><br><i>${Text.esc(state.courses[state.holeIdx + 1].intro || '')}</i></div>` : ''}
      ${online && !online.host ? '<div class="sub">Der Gastgeber öffnet die nächste Bahn …</div>'
        : `<span class="btn" id="next">${state.editorReturn ? Icons.svg('construction') + ' Zurück zum Editor' : last ? 'Zum Endergebnis' : 'Nächste Bahn ' + Icons.svg('arrow_forward')}</span>`}
      ${state.editorReturn ? '' : `<p style="margin-top:12px"><span class="btn ghost small" id="leave-here">${Icons.svg('arrow_back')} ${state.world && state.world.id === 'custom' ? 'Zurück zur Auswahl' : 'Zurück zur Weltkarte'}</span></p>`}
    </div>`);
    if (!state.editorReturn) $('leave-here').addEventListener('click', () => leaveRound(true));
    const goOn = () => { hideOverlay(); if (state.editorReturn) editor.returnFromTest(); else if (last) { if (state.mode === 'creative') loadHole(0); else showFinal(); } else loadHole(state.holeIdx + 1); };
    // Im Netzspiel gibt der Gastgeber den Takt vor, damit alle auf derselben Bahn stehen
    if (!online || online.host) $('next').addEventListener('click', () => { if (online) netSend({ t: 'next', h: last ? -1 : state.holeIdx + 1, st: state.t }); goOn(); });
  }
  function showFinal() {
    state.phase = 'final'; clearTimeout(msgTimer); ui.msg.classList.remove('visible'); // keine Laufmeldung über der Tafel
    const parTotal = Best.parSumme(weltId(), state.courses);
    // eigene Runde in die Rangliste
    const gewertet = state.mode !== 'creative' && !state.editorReturn;
    const gesamtZeit = p => (p.times || []).reduce((a, b) => a + (b || 0), 0);
    let roundRec = [], turnierRunde = null;
    if (gewertet && state.world && state.world.id !== 'custom') {
      const meP = state.players[myIndex()];
      if (meP && meP.scores.length === state.courses.length && meP.scores.every(v => v != null)) {
        const summe = meP.scores.reduce((a, b) => a + b, 0);
        roundRec = Best.round(state.world.id, summe, gesamtZeit(meP), (online && online.started) ? 'net' : 'lokal', state.mode);
        // Die ganze Runde ist die Wertung des Turniers – aber nur in seiner Welt und im Fenster
        if (state.world.id === Turnier.WELT) turnierRunde = Turnier.runde(summe, gesamtZeit(meP));
      }
    }
    const ranked = state.players.map(p => ({ p, total: p.scores.reduce((a, b) => a + b, 0), ms: gesamtZeit(p) })).sort((a, b) => a.total - b.total);
    const medals = ['🥇', '🥈', '🥉', '4.'];
    const vsPar = d => d === 0 ? 'Par' : (d > 0 ? '+' : '') + d;
    const podium = ranked.map((r, i) => `<div class="pod ${i === 0 ? 'win' : ''}">
        <span class="pod-medal">${medals[i]}</span>
        <span class="pod-dot" style="background:${r.p.color}"></span>
        <span class="pod-name">${Text.esc(r.p.name)}</span>
        ${gewertet && r.ms ? `<span class="pod-time">${Best.formatTime(r.ms)} · Kombi ${String(Best.combo(r.total, r.ms)).replace('.', ',')}</span>` : ''}
        <span class="pod-total">${r.total}</span>
        <span class="pod-par ${r.total - parTotal < 0 ? 'under' : r.total - parTotal > 0 ? 'over' : ''}">${vsPar(r.total - parTotal)}</span>
      </div>`).join('');
    // je Bahn eine Karte: Nummer, Sinnbild, Name, Par und die Schläge aller Spieler (farbig nach Ergebnis)
    const kartenPar = state.courses.map(c => Best.par(weltId(), c));
    const cards = state.courses.map((c, i) => `<div class="hole-card">
        <div class="hc-top"><span class="hc-num">${i + 1}</span><span class="hc-icon">${holeIcon(c)}</span></div>
        <div class="hc-name">${Text.esc(c.name)}</div>
        <div class="hc-par">Par ${kartenPar[i]}</div>
        <div class="hc-scores">${state.players.map(p => `<span class="hc-score ${diffClass(p.scores[i], kartenPar[i])}" style="border-color:${p.color}" title="${Text.esc(p.name)}">${p.scores[i]}</span>`).join('')}</div>
      </div>`).join('');
    const best = state.players.length > 1 ? '' : (() => { // Solo: kleine Bilanz
      const p = state.players[0]; const n = k => p.scores.filter((s, i) => diffClass(s, kartenPar[i]) === k).length;
      const parts = [['ace', 'Hole-in-One'], ['eagle', 'Eagle'], ['birdie', 'Birdie'], ['par', 'Par'], ['bogey', 'Bogey'], ['worse', 'Schlechter']].filter(([k]) => n(k)).map(([k, l]) => `<span class="tally ${k}">${n(k)}× ${l}</span>`);
      return `<div class="tallies">${parts.join('')}</div>`;
    })();
    overlay(`<div class="panel final ${worldClass()}">
      <div class="final-banner">${sceneFor(state.world && state.world.id)}<div class="final-head"><h1>${Icons.svg('emoji_events')} Endergebnis</h1><div class="final-world">${state.world ? Text.esc(state.world.name) : ''} · ${state.courses.length} Bahnen · Par ${parTotal}</div></div></div>
      <div class="podium">${podium}</div>
      ${best}
      <div class="hole-cards">${cards}</div>
      <div class="final-legend"><span class="hc-score ace">1</span> Hole-in-One <span class="hc-score eagle">–2</span> Eagle <span class="hc-score birdie">–1</span> Birdie <span class="hc-score par">0</span> Par <span class="hc-score bogey">+1</span> Bogey <span class="hc-score worse">+2</span> mehr</div>
      ${lohnZeile()}
      ${roundRec.length ? `<div class="sub net-note">🏆 Neuer Rundenrekord für ${Text.esc(roundRec[0].rec.n)}: ${Text.esc(recordText(roundRec))}</div>` : ''}
      ${turnierRunde ? `<div class="sub net-note">⚔️ Im Turnier gewertet: Kombi ${Text.esc(String(turnierRunde.s).replace('.', ','))} · ${turnierRunde.st} Schläge in ${Text.esc(Best.formatTime(turnierRunde.ms))}</div>` : ''}
      <span class="btn" id="again">Nochmal spielen</span>
    </div>`);
    $('again').addEventListener('click', () => { hideOverlay(); leaveOnline(); showTitle(); });
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
      b.ebene = b.restEbene = 0; lv.setzeEbene(0);   // der Innenbereich ist eine eigene Bahn und fängt unten an
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
        case 'scorched': ohneStrafe(ev.ob, 'feuer'); return;
        case 'dropped': ohneStrafe(ev.ob, 'luke'); return;
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
    syncClock();
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
    if (online && online.started && !myTurn()) return;   // nur wer dran ist, darf zielen
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
  /* Tippt jemand gerade in ein Feld – Name, Raumcode, Bahnname, Bahn-Code –, dann gehören die
     Buchstaben dorthin und nicht in die Steuerung. Sonst schaltet das „f" in „Fynn" das Vollbild um
     (und in einem Rahmen ohne Vollbildrecht öffnet das sogar einen neuen Tab), das „n" springt zur
     nächsten Bahn und das „j" schaltet die Musik. */
  function tipptGerade() {
    const el = document.activeElement;
    if (!el || el === document.body) return false;
    const tag = (el.tagName || '').toLowerCase();
    return tag === 'input' || tag === 'textarea' || tag === 'select' || el.isContentEditable;
  }
  /* Doppelter Boden direkt an den Feldern: was dort getippt wird, steigt gar nicht erst zum Fenster
     hoch – unabhängig davon, wer sonst noch am Fenster horcht. */
  const istFeld = el => { const t = el && el.tagName ? el.tagName.toLowerCase() : ''; return t === 'input' || t === 'textarea' || t === 'select' || !!(el && el.isContentEditable); };
  for (const typ of ['keydown', 'keyup', 'keypress']) ui.overlay.addEventListener(typ, e => { if (istFeld(e.target)) e.stopPropagation(); });
  window.addEventListener('keydown', e => {
    if (tipptGerade()) return;
    // Esc bricht erst das Zielen ab; ohne Zug ist es der Weg aus der Runde heraus
    if (e.key === 'Escape') { if (drag) { drag = null; state.aim = null; } else leaveRound(false); }
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
    $('fs-btn').innerHTML = on ? Icons.svg('fullscreen_exit') + ' Vollbild aus' : Icons.svg('fullscreen') + ' Vollbild';
    R.resize();
  }
  document.addEventListener('fullscreenchange', syncFullscreen);
  document.addEventListener('webkitfullscreenchange', syncFullscreen);
  // Wandert die Seite in den Hintergrund (Anruf, anderer Tab), steht die Uhr still
  document.addEventListener('visibilitychange', () => { if (document.hidden) clockPause(); else if (!ui.overlay.classList.contains('visible')) clockResume(); });
  $('fs-btn').addEventListener('click', () => { Sfx.unlock(); toggleFullscreen(); });
  function toggleOverview() { if (state.ball) setCamMode(state.camMode === 'overview' ? 'follow' : 'overview'); }
  function syncMusicBtn() { $('music-btn').classList.toggle('sel', Music.on); $('music-btn').innerHTML = Icons.svg(Music.on ? 'music_note' : 'music_off'); $('music-btn').title = Music.on ? 'Musik aus (J)' : 'Musik an (J)'; }
  function toggleMusic() { Sfx.unlock(); Music.toggle(); syncMusicBtn(); showMessage(Music.on ? '♪ Musik an' : 'Musik aus', 1000); }
  function zoomBy(f) { state.zoomFactor = Math.max(0.5, Math.min(2.2, state.zoomFactor * f)); if (state.camMode === 'overview' && state.ball) setCamMode('follow'); }
  function rotateBy(a) { state.camTheta += a; if (state.camMode === 'overview' && state.ball) setCamMode('follow'); }
  $('cam-overview').addEventListener('click', toggleOverview);
  $('music-btn').addEventListener('click', toggleMusic);
  $('cr-prev').addEventListener('click', () => jumpHole(-1));
  $('cr-next').addEventListener('click', () => jumpHole(1));
  $('cr-reset').addEventListener('click', resetBall);
  $('cr-editor').addEventListener('click', () => { if (state.editorReturn) { clearTimeout(waitTimer); hideOverlay(); editor.returnFromTest(); } });
  $('leave-btn').addEventListener('click', () => leaveRound(false));
  $('cam-in').addEventListener('click', () => zoomBy(1.25));
  $('cam-out').addEventListener('click', () => zoomBy(0.8));
  $('cam-left').addEventListener('click', () => rotateBy(-Math.PI / 4));
  $('cam-right').addEventListener('click', () => rotateBy(Math.PI / 4));
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 0.9); }, { passive: false });
  window.addEventListener('resize', () => R.resize());
  /* Offline-Fähigkeit: nur wenn die Seite als eigene Web-App ausgeliefert wird (Manifest vorhanden, https oder localhost) */
  if ('serviceWorker' in navigator && document.querySelector('link[rel="manifest"]') && (location.protocol === 'https:' || location.hostname === 'localhost')) {
    navigator.serviceWorker.register('sw.js').catch(() => { /* ohne Service Worker läuft das Spiel trotzdem */ });
    // Hat eine neue Fassung die alte abgelöst, gilt sie erst nach dem nächsten Laden. Das machen wir
    // selbst – aber nur im Startbildschirm, nie mitten in einer Runde.
    const hatteVorher = !!navigator.serviceWorker.controller;
    let neuGeladen = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!hatteVorher || neuGeladen) return;
      neuGeladen = true;
      const jetzt = () => { if (state.phase === 'title' && !ui.overlay.querySelector('input:focus')) location.reload(); else setTimeout(jetzt, 3000); };
      jetzt();
    });
  }

  // Test-Hook (für automatisierte Prüfungen): aktuelle Bahn für alle Spieler beenden
  window.__golfDebug = {
    /* Bahn regulär mit dieser Schlagzahl abschließen – geht durch finishTurn, also mit Uhr und Rekorden */
    finishHole(strokes) {
      if (!state.level || state.phase === 'title' || !state.ball) return false;
      if (!state.players[state.curPlayer] || state.phase === 'summary' || state.phase === 'final') return false;
      clearTimeout(waitTimer);
      state.strokes = strokes;
      finishTurn(strokes);
      return true;
    },
    /* Direkt auf eine Bahn springen – nur fürs automatische Prüfen */
    openHole(i) {
      if (!state.courses || !state.courses[i]) return false;
      clearTimeout(waitTimer); loadHole(i); return true;
    },
    skipHole() {
      if (!state.level || state.phase === 'title') return false;
      clearTimeout(waitTimer);
      const par = parHier();
      for (let i = 0; i < state.players.length; i++) if (state.players[i].scores[state.holeIdx] == null) state.players[i].scores[state.holeIdx] = par;
      showHoleDone(); return true;
    },
    state, R,
  };

  Best.onChange(recordFromFriend);
  Best.start();                         // Rekorde im Hintergrund holen
  /* Turnierfeld im Hintergrund holen. Beim Verbinden kommen die aufbewahrten Einträge aller
     Teilnehmer auf einen Schlag herein – darum wird nicht bei jeder einzelnen Nachricht neu
     gezeichnet, sondern einmal, wenn der Schwall vorbei ist. */
  let turnierMalen = null;
  Turnier.onChange(() => {
    clearTimeout(turnierMalen);
    turnierMalen = setTimeout(() => { if (turnierSchirm) turnierSchirm(); }, 250);
  });
  Turnier.start();
  /* Was beim Schlußpfiff zu sagen ist: wer gewonnen hat und wer den Helm bekommt */
  function turnierEnde() {
    const sieger = Turnier.rangliste().runde[0];
    if (!sieger) return;
    const lohn = Hats.belohnung(Turnier.WELT);
    const meins = Best.name && sieger.n === Best.name;
    if (meins && lohn) frischerLohn = lohn;
    showMessage(meins
      ? `🏅 Turnier gewonnen! Der Championhelm gehört dir.`
      : `🏅 Turnier vorbei – ${sieger.n} gewinnt den Championhelm.`, 4200);
  }

  /* Die Uhr des Turniers: trägt die Restlaufzeit jede Sekunde nach und zeichnet den Bildschirm
     neu, sobald das Turnier beginnt oder endet – dann stimmt sonst alles darauf nicht mehr. */
  let letzterZustand = Turnier.zustand();
  setInterval(() => {
    const jetzt = Turnier.zustand();
    if (jetzt !== letzterZustand) {
      const vorher = letzterZustand; letzterZustand = jetzt;
      // Der Schlußpfiff vergibt den Championhelm – das soll man mitbekommen, auch ohne hinzusehen
      if (vorher === 'laeuft' && jetzt === 'vorbei') turnierEnde();
      if (turnierSchirm) turnierSchirm();
      return;
    }
    if (jetzt !== 'laeuft') return;
    const txt = Turnier.restText();
    document.querySelectorAll('.turnier-rest').forEach(el => { el.textContent = txt; });
  }, 1000);
  Share.start();                        // geteilte Bahnen der anderen mitbekommen
  // Die eigenen geteilten Bahnen erneut anbieten – der Vermittler kann sie zwischendurch verloren haben
  setTimeout(() => { if (Share.eigeneIds.length) Share.sende(editor.loadCustoms(), Best.name); }, 1800);
  // Steckt eine Bahn im Anhang der Adresse (geteilter Link)? Dann anbieten.
  Share.ausAdresse().then(bahn => {
    Share.adresseAufraeumen();
    if (bahn) zeigeGeteilteBahn(bahn);
    else if (location.search.includes('bahn=')) showMessage(Share.grund || 'Der Link ließ sich nicht lesen', 2600);
  }).catch(() => { /* kaputter Link, dann eben nicht */ });
  const editor = Editor({ state, R, $, showMessage, startTest, showWorldSelect, hideOverlay, overlay, playWorld });
  Icons.mount();                        // Platzhalter im festen HTML durch die Sinnbilder ersetzen
  // Vorschau deutlich kennzeichnen, damit sie nie mit dem Spiel der Freunde verwechselt wird
  if (typeof VORSCHAU !== 'undefined' && VORSCHAU) {
    document.body.classList.add('vorschau');
    const band = $('vorschau-band'); if (band) band.hidden = false;
    document.title = 'VORSCHAU · ' + document.title;
  }
  /* Das Ladebild wegnehmen. Es steht im festen HTML und läuft ohne JavaScript, damit sofort etwas
     zu sehen ist; hier endet es. Gewartet wird auf dreierlei:

     - der Startbildschirm ist gebaut (wir sind an dieser Stelle),
     - zwei Bilder sind gezeichnet (sonst blitzt kurz die leere Leinwand durch),
     - die Zierschrift ist da, sonst springt die Überschrift hinterher – aber höchstens 1,2 s,
       denn sie kommt von Google und muss nicht kommen.

     Dazu eine Mindeststandzeit. Auf einem schnellen Gerät ist das Spiel in 200 ms bereit, und ein
     Bild, das man nur als Zucken wahrnimmt, ist schlechter als gar keines. performance.now() zählt
     ab dem Seitenaufruf, misst also genau die Zeit, die der Betrachter schon gewartet hat. */
  /* Zierschrift nachladen, statt sie im Kopf der Seite zu verlinken – siehe die Begründung dort.
     'display=swap' steht schon in der Adresse: Der Text ist sofort da, in der Ersatzschrift, und
     wechselt, sobald die Zierschrift ankommt.
     Der Umweg über media='print' ist nötig: Der Browser hält das Zeichnen an, solange irgendein
     Stylesheet noch aussteht – auch ein nachträglich eingehängtes. Ein Blatt für den Drucker gilt
     für den Bildschirm nicht und hält darum nichts auf; sobald es da ist, wird es umgehängt. */
  (() => {
    const l = document.createElement('link');
    l.rel = 'stylesheet';
    l.media = 'print';
    l.addEventListener('load', () => { l.media = 'all'; });
    l.href = 'https://fonts.googleapis.com/css2?family=Cinzel+Decorative:wght@700;900&family=MedievalSharp&display=swap';
    document.head.appendChild(l);
  })();

  const LADE_MIN = 1700;
  function ladebildWeg() {
    const el = $('lade');
    if (!el) return;
    const schrift = document.fonts ? document.fonts.ready : Promise.resolve();
    Promise.race([schrift, new Promise(r => setTimeout(r, 1200))]).then(() => {
      setTimeout(() => {
        el.classList.add('weg');
        setTimeout(() => el.remove(), 700);
      }, Math.max(0, LADE_MIN - performance.now()));
    });
  }

  R.resize();
  setControlMode(state.controlMode);
  syncMusicBtn();
  showTitle();
  updateHud();
  requestAnimationFrame(frame);
  requestAnimationFrame(() => requestAnimationFrame(ladebildWeg));
})();
