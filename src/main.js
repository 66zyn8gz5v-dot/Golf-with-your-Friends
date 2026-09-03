/* Spielablauf: Titel → 9 Bahnen (Hotseat für 1–4 Spieler) → Endergebnis. */
(() => {
  const STEP = 1 / 240;
  const MAX_SHOT = 19;       // Ballgeschwindigkeit bei voller Kraft
  const MAX_DRAG = 4.2;      // Zieh-Länge (Weltkoordinaten) für volle Kraft
  const DEFAULT_MAX_STROKES = 15; // danach wird die Bahn automatisch beendet (pro Bahn per maxStrokes überschreibbar)
  const maxStrokes = () => state.mode === 'creative' ? Infinity : (COURSES[state.holeIdx].maxStrokes || DEFAULT_MAX_STROKES);
  const PLAYER_COLORS = ['#ffffff', '#ff6b6b', '#4dd4ff', '#ffe066'];
  const PLAYER_NAMES = ['Spieler 1', 'Spieler 2', 'Spieler 3', 'Spieler 4'];

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
  };
  try { const m = localStorage.getItem('fantasygolf.control'); if (m === 'sling' || m === 'push') state.controlMode = m; } catch (e) { /* kein Speicher verfügbar */ }
  function setControlMode(m) {
    state.controlMode = m;
    try { localStorage.setItem('fantasygolf.control', m); } catch (e) { /* ignorieren */ }
    ui.hint.textContent = m === 'push' ? 'In Schussrichtung ziehen & loslassen' : 'Vom Ball wegziehen & loslassen';
  }
  let playerCount = 1, msgTimer = null, waitTimer = null;

  /* ---------- UI ---------- */
  function showMessage(text, ms = 1600) {
    ui.msg.textContent = text; ui.msg.classList.add('visible');
    clearTimeout(msgTimer); msgTimer = setTimeout(() => ui.msg.classList.remove('visible'), ms);
  }
  function updateHud() {
    const def = COURSES[state.holeIdx];
    ui.hole.textContent = `Bahn ${state.holeIdx + 1} / ${COURSES.length}`;
    ui.name.textContent = def ? def.name : '–';
    const p = state.players[state.curPlayer];
    ui.player.textContent = p ? p.name : '–';
    ui.strokes.textContent = def ? (state.mode === 'creative' ? `Kreativ · Schläge: ${state.strokes} · Par ${def.par}` : `Schläge: ${state.strokes} / ${maxStrokes()} · Par ${def.par}`) : '';
    ui.board.innerHTML = state.players.map((pl, i) => {
      const total = pl.scores.reduce((a, b) => a + b, 0);
      return `<div class="row ${i === state.curPlayer ? 'active' : ''}"><span class="dot" style="background:${pl.color}"></span>${pl.name}<span class="score">${total}</span></div>`;
    }).join('');
  }
  function overlay(html, cls) { ui.overlay.innerHTML = html; ui.overlay.className = 'screen visible' + (cls ? ' ' + cls : ''); }
  function hideOverlay() { ui.overlay.className = 'screen'; ui.overlay.innerHTML = ''; }

  function showTitle() {
    state.phase = 'title';
    document.body.classList.add('title');
    document.body.classList.remove('creative');
    overlay(`<div class="panel">
      <h1>⛳ Fantasy Golf</h1>
      <div class="sub">Golf with your Friends · ${COURSES.length} magische Bahnen in 2,5D</div>
      <p>Modus wählen:</p>
      <div class="modes">
        <span class="btn mode" data-mode="normal"><b>Normal</b><small>Alle ${COURSES.length} Bahnen der Reihe nach, mit Schlaglimit und Wertung</small></span>
        <span class="btn mode" data-mode="creative"><b>Kreativ</b><small>Startet sofort: ein Spieler, Schleuder, im Spiel frei zwischen den Bahnen springen, kein Schlaglimit</small></span>
      </div>
      <div class="legend" style="text-align:center">Weitere Welten folgen hier.</div>
    </div>`, 'title');
    ui.overlay.querySelectorAll('.mode').forEach(b => b.addEventListener('click', () => {
      state.mode = b.dataset.mode;
      if (state.mode === 'creative') { // sofort los: ein Spieler, Schleuder, Bahn 1
        Sfx.unlock(); setControlMode('sling'); startGame(1, 0);
      } else showSetup();
    }));
  }

  function showSetup() {
    overlay(`<div class="panel">
      <h2>🏆 Normales Spiel</h2>
      <p>Spieler:</p>
      <div id="pc">${[1, 2, 3, 4].map(n => `<span class="btn ghost small ${n === playerCount ? 'sel' : ''}" data-n="${n}">${n}</span>`).join('')}</div>
      <p style="margin-top:10px">Steuerung:</p>
      <div id="cm">
        <span class="btn ghost small ${state.controlMode === 'sling' ? 'sel' : ''}" data-m="sling">Schleuder</span>
        <span class="btn ghost small ${state.controlMode === 'push' ? 'sel' : ''}" data-m="push">Schieben</span>
      </div>
      <p style="margin-top:14px"><span class="btn ghost small" id="back">◀ Zurück</span> <span class="btn" id="start">Los geht's!</span></p>
      <div class="legend">
        Aufsetzen, ziehen, loslassen. Weiter ziehen = mehr Kraft.
        <b>Schleuder:</b> vom Ball wegziehen, er fliegt in die Gegenrichtung. <b>Schieben:</b> dorthin ziehen, wo der Ball hin soll.
        Wasser, Lava und Abgrund kosten einen Strafschlag.
      </div>
    </div>`, 'title');
    ui.overlay.querySelectorAll('#pc .btn').forEach(b => b.addEventListener('click', () => {
      playerCount = +b.dataset.n;
      ui.overlay.querySelectorAll('#pc .btn').forEach(x => x.classList.toggle('sel', +x.dataset.n === playerCount));
    }));
    ui.overlay.querySelectorAll('#cm .btn').forEach(b => b.addEventListener('click', () => {
      setControlMode(b.dataset.m);
      ui.overlay.querySelectorAll('#cm .btn').forEach(x => x.classList.toggle('sel', x.dataset.m === state.controlMode));
    }));
    $('back').addEventListener('click', showTitle);
    $('start').addEventListener('click', () => { Sfx.unlock(); startGame(playerCount, 0); });
  }

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
    const b = state.ball, c = state.level.cup;
    state.camTheta = thetaTowards(b.x, b.y, c.x, c.y);
  }
  function setCamMode(mode) {
    state.camMode = mode;
    $('cam-overview').classList.toggle('sel', mode === 'overview');
  }
  function updateCamera(dt) {
    if (!state.level) return;
    if (state.camMode === 'overview' || !state.ball) R.target = R.overviewTarget();
    else R.target = R.followTarget(state.ball, state.camTheta, R.defaultZoom() * state.zoomFactor);
    R.updateCamera(dt);
  }

  /* ---------- Spielablauf ---------- */
  function startGame(n, first = 0) {
    state.players = Array.from({ length: n }, (_, i) => ({ name: PLAYER_NAMES[i], color: PLAYER_COLORS[i], scores: [] }));
    state.holeIdx = first;
    document.body.classList.remove('title');
    document.body.classList.toggle('creative', state.mode === 'creative');
    hideOverlay();
    loadHole(first);
  }
  /* Kreativmodus: Bahn wechseln oder Ball an den Abschlag setzen */
  function jumpHole(delta) {
    if (state.mode !== 'creative' || !state.level) return;
    clearTimeout(waitTimer); hideOverlay();
    loadHole((state.holeIdx + delta + COURSES.length) % COURSES.length);
  }
  function resetBall() {
    if (state.mode !== 'creative' || !state.ball) return;
    clearTimeout(waitTimer);
    state.strokes = 0; beginTurn();
  }
  function loadLevelPreview(i) {
    const def = COURSES[i];
    state.level = buildLevel(def); state.theme = THEMES[def.theme];
    R.setLevel(state.level, state.theme);
    state.ball = null; state.aim = null;
    setCamMode('overview'); R.target = R.overviewTarget(); R.snapCamera();
  }
  function loadHole(i) {
    state.holeIdx = i; state.phase = 'loading';
    loadLevelPreview(i);
    state.particles = [];
    state.curPlayer = 0;
    showMessage(`Bahn ${i + 1}: ${COURSES[i].name}`, 2200);
    setTimeout(beginTurn, 900);
  }
  function beginTurn() {
    const p = state.players[state.curPlayer], lv = state.level;
    state.ball = makeBall(lv.tee.x, lv.tee.y, p.color);
    state.strokes = 0; state.phase = 'aim'; state.aim = null; state.restTimer = 0; state.slowTimer = 0;
    faceCup(); setCamMode('follow');
    if (state.players.length > 1) showMessage(`${p.name} ist dran`, 1300);
    updateHud();
  }
  function shoot(dx, dy, power) {
    const b = state.ball;
    b.restX = b.x; b.restY = b.y;
    b.vx = dx * power * MAX_SHOT; b.vy = dy * power * MAX_SHOT;
    state.strokes++; state.phase = 'rolling'; state.aim = null; state.restTimer = 0; state.slowTimer = 0;
    Sfx.hit(power); updateHud();
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
    const label = type === 'water' ? 'Platsch! Wasser' : type === 'lava' ? 'Zischhh! Lava' : 'Aus! Abgrund';
    if (type === 'water') { Sfx.water(); burst(b.x, b.y, '#9fd3ff', 18); }
    else if (type === 'lava') { Sfx.lava(); burst(b.x, b.y, '#ffb347', 18); }
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
    const par = COURSES[state.holeIdx].par;
    Sfx.sink();
    burst(state.level.cup.x, state.level.cup.y, state.theme.accent, 26, true);
    showMessage(`${scoreName(state.strokes, par)}  (${state.strokes} Schläge)`, 1800);
    const b = state.ball;
    b.vx = 0; b.vy = 0; b.x = state.level.cup.x; b.y = state.level.cup.y; b.z = 0; b.vz = 0;
    b.sunk = true; b.sinkT = 0; // Fall-Animation ins Loch, danach unsichtbar
    finishTurn(state.strokes);
  }
  function showHoleDone() {
    state.phase = 'summary';
    const def = COURSES[state.holeIdx], last = state.holeIdx === COURSES.length - 1;
    const rows = state.players.map(p => {
      const total = p.scores.reduce((a, b) => a + b, 0);
      return `<tr><td><span class="dot" style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${p.color};margin-right:6px"></span>${p.name}</td><td class="num">${p.scores[state.holeIdx]}</td><td class="num">${total}</td></tr>`;
    }).join('');
    overlay(`<div class="panel">
      <h2>Bahn ${state.holeIdx + 1}: ${def.name}</h2>
      <div class="sub">Par ${def.par}</div>
      <table class="scores"><tr><th>Spieler</th><th>Bahn</th><th>Gesamt</th></tr>${rows}</table>
      ${!last ? `<div class="sub">Als Nächstes: <b>${COURSES[state.holeIdx + 1].name}</b><br><i>${COURSES[state.holeIdx + 1].intro}</i></div>` : ''}
      <span class="btn" id="next">${last ? 'Zum Endergebnis' : 'Nächste Bahn ▶'}</span>
    </div>`);
    $('next').addEventListener('click', () => { hideOverlay(); if (last) { if (state.mode === 'creative') loadHole(0); else showFinal(); } else loadHole(state.holeIdx + 1); });
  }
  function showFinal() {
    state.phase = 'final';
    const parTotal = COURSES.reduce((a, c) => a + c.par, 0);
    const ranked = state.players.map(p => ({ p, total: p.scores.reduce((a, b) => a + b, 0) })).sort((a, b) => a.total - b.total);
    const medals = ['🥇', '🥈', '🥉', '4.'];
    const rows = ranked.map((r, i) => `<tr><td class="medal">${medals[i]}</td><td>${r.p.name}</td><td class="num">${r.total}</td><td class="num">${r.total - parTotal >= 0 ? '+' : ''}${r.total - parTotal}</td></tr>`).join('');
    const holes = `<tr><th></th>${COURSES.map((c, i) => `<th>${i + 1}</th>`).join('')}</tr>` +
      state.players.map(p => `<tr><td>${p.name}</td>${p.scores.map(s => `<td class="num">${s}</td>`).join('')}</tr>`).join('');
    overlay(`<div class="panel">
      <h1>🏆 Endergebnis</h1>
      <div class="sub">Gesamt-Par: ${parTotal}</div>
      <table class="scores"><tr><th></th><th>Spieler</th><th>Schläge</th><th>zu Par</th></tr>${rows}</table>
      <table class="scores" style="font-size:13px">${holes}</table>
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
        case 'dropoff': Sfx.bounce(4); burst(ev.x, ev.y, '#ffd166', 8); break;
        case 'sunk': sunk(); return;
        case 'water': case 'lava': case 'oob': hazard(ev.type); return;
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
        if (b.rider) { state.restTimer = 0; state.slowTimer = 0; if (state.phase === 'aim') { state.phase = 'rolling'; state.aim = null; } }
        else if (state.phase === 'rolling') {
          const sp = Math.hypot(b.vx, b.vy);
          if (sp < 0.08) { state.restTimer += STEP; if (state.restTimer > 0.25) ballAtRest(); }
          else { state.restTimer = 0; }
          if (sp < 0.5 && !b.boosted) { state.slowTimer += STEP; if (state.slowTimer > 3) ballAtRest(); } else state.slowTimer = 0;
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
    if (state.phase === 'title') TitleScene.draw(R.ctx, R.w, R.h, state.t); else R.drawFrame(state);
    ui.power.classList.toggle('visible', !!state.aim);
    if (state.aim) ui.powerFill.style.width = `${Math.round(state.aim.power * 100)}%`;
    requestAnimationFrame(frame);
  }

  /* ---------- Eingabe ---------- */
  let drag = null;
  function pointerPos(e) { const r = canvas.getBoundingClientRect(); return [e.clientX - r.left, e.clientY - r.top]; }
  canvas.addEventListener('pointerdown', e => {
    if (state.phase !== 'aim' || !state.ball) return;
    Sfx.unlock();
    canvas.setPointerCapture(e.pointerId);
    drag = { id: e.pointerId, start: pointerPos(e) };
    state.aim = { dx: 0, dy: 0, power: 0 };
  });
  canvas.addEventListener('pointermove', e => {
    if (!drag || drag.id !== e.pointerId || state.phase !== 'aim') return;
    const [x, y] = pointerPos(e);
    const [wx, wy] = R.unprojDelta(x - drag.start[0], y - drag.start[1]);
    const len = Math.hypot(wx, wy);
    if (len < 0.05) { state.aim = { dx: 0, dy: 0, power: 0 }; return; }
    const sign = state.controlMode === 'push' ? 1 : -1;
    state.aim = { dx: sign * wx / len, dy: sign * wy / len, power: Math.min(1, len / MAX_DRAG) };
  });
  function endDrag(e, cancel) {
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
    if (e.key === '+') zoomBy(1.25); if (e.key === '-') zoomBy(0.8);
    if (e.key === 'n' || e.key === 'N') jumpHole(1);
    if (e.key === 'p' || e.key === 'P') jumpHole(-1);
    if (e.key === 'r' || e.key === 'R') resetBall();
    if (e.key === 'q' || e.key === 'ArrowLeft') rotateBy(-Math.PI / 4);
    if (e.key === 'e' || e.key === 'ArrowRight') rotateBy(Math.PI / 4);
  });
  function toggleOverview() { if (state.ball) setCamMode(state.camMode === 'overview' ? 'follow' : 'overview'); }
  function zoomBy(f) { state.zoomFactor = Math.max(0.5, Math.min(2.2, state.zoomFactor * f)); if (state.camMode === 'overview' && state.ball) setCamMode('follow'); }
  function rotateBy(a) { state.camTheta += a; if (state.camMode === 'overview' && state.ball) setCamMode('follow'); }
  $('cam-overview').addEventListener('click', toggleOverview);
  $('cr-prev').addEventListener('click', () => jumpHole(-1));
  $('cr-next').addEventListener('click', () => jumpHole(1));
  $('cr-reset').addEventListener('click', resetBall);
  $('cam-in').addEventListener('click', () => zoomBy(1.25));
  $('cam-out').addEventListener('click', () => zoomBy(0.8));
  $('cam-left').addEventListener('click', () => rotateBy(-Math.PI / 4));
  $('cam-right').addEventListener('click', () => rotateBy(Math.PI / 4));
  canvas.addEventListener('wheel', e => { e.preventDefault(); zoomBy(e.deltaY < 0 ? 1.1 : 0.9); }, { passive: false });
  window.addEventListener('resize', () => R.resize());

  // Test-Hook (für automatisierte Prüfungen): aktuelle Bahn für alle Spieler beenden
  window.__golfDebug = {
    skipHole() {
      if (!state.level || state.phase === 'title') return false;
      clearTimeout(waitTimer);
      const par = COURSES[state.holeIdx].par;
      for (let i = 0; i < state.players.length; i++) if (state.players[i].scores[state.holeIdx] == null) state.players[i].scores[state.holeIdx] = par;
      showHoleDone(); return true;
    },
    state,
  };

  R.resize();
  setControlMode(state.controlMode);
  showTitle();
  updateHud();
  requestAnimationFrame(frame);
})();
