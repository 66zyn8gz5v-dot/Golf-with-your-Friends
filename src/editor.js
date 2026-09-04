/* Baumodus: eigene Bahnen direkt im Spiel bauen. Kacheln malen, Abschlag und Loch setzen, Hindernisse
   platzieren, Welt und Par wählen, speichern (im Browser), testen, als Code exportieren und importieren.
   Wird von main.js mit den nötigen Spielfunktionen verdrahtet. */
const Editor = (deps) => {
  const { state, R, $, showMessage, startTest, showWorldSelect } = deps;
  const KEY = 'fantasygolf.custom';
  const TILES = [['#', 'Rasen'], ['s', 'Sand'], ['i', 'Eis'], ['w', 'Wasser'], ['l', 'Lava'], ['x', 'Block'], ['o', 'Klippe'], ['.', 'Leer']];
  const OBJECTS = [
    ['bumper', 'Pilz (Bumper)'], ['rotor', 'Windrad'], ['gate', 'Fallgatter'], ['mover', 'Lore'], ['wind', 'Windfeld'], ['ramp', 'Sprungrampe'],
    ['boost', 'Beschleuniger'], ['windmill', 'Windmühle'], ['cannon', 'Kanone'], ['magnet', 'Magnet'], ['turntable', 'Drehscheibe'], ['potion', 'Schrumpftrank'],
    ['portal', 'Portal (2× tippen)'], ['wall', 'Bande (2× tippen)'],
  ];
  const THEME_LABELS = { meadow: 'Elfenwiese', mushroom: 'Pilzhain', forge: 'Zwergenschmiede', forest: 'Zauberwald', dragon: 'Drachenhöhle', ice: 'Eisgrotte', sky: 'Wolkenburg', clockwork: 'Uhrwerk', witch: 'Hexenwald', hut: 'Hexenhütte', reef: 'Korallenriff', volcano: 'Vulkan', palace: 'Wüstenpalast', harbor: 'Piratenbucht', desert: 'Wüste', tomb: 'Grabkammer', castle: 'Burgberg' };
  const HINTS = {
    tile: 'Tippen oder ziehen, um Kacheln zu malen.', T: 'Tippen: Abschlag setzen.', H: 'Tippen: Loch setzen.',
    obj: 'Tippen: Objekt platzieren. Mit „Drehen“ Richtung ändern, mit „Löschen“ entfernen.',
    portal: 'Erst den Eingang, dann den Ausgang antippen.', wall: 'Erst den Anfang, dann das Ende der Bande antippen.',
    delete: 'Tippen: Objekt in der Nähe löschen.', rotate: 'Tippen: Objekt in der Nähe drehen (Richtung, Achse, Anziehen/Abstoßen).', pan: 'Ziehen: Ansicht verschieben.',
  };
  const ed = { def: null, tiles: [], tool: '#', obj: 'bumper', pending: null, hover: null, panX: 0, panY: 0, drag: null, panel: null, collapsed: false };

  /* ---------- Speicher ---------- */
  function loadCustoms() { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveCustoms(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function cleanDef(def) { const d = JSON.parse(JSON.stringify(def)); delete d.editing; return d; }
  function persist() {
    const list = loadCustoms(), d = cleanDef(ed.def), i = list.findIndex(c => c.id === d.id);
    if (i >= 0) list[i] = d; else list.push(d);
    if (!saveCustoms(list)) showMessage('Speichern nicht möglich (kein Browserspeicher)', 1800);
    return list;
  }
  function newDef() {
    const W = 20, H = 12, rows = [];
    for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) r += (x >= 2 && x <= 17 && y >= 4 && y <= 7) ? '#' : '.'; rows.push(r); }
    rows[5] = rows[5].slice(0, 3) + 'T' + rows[5].slice(4); rows[6] = rows[6].slice(0, 16) + 'H' + rows[6].slice(17);
    return { id: Date.now(), name: 'Meine Bahn', par: 3, theme: 'meadow', maxStrokes: 20, intro: 'Eine selbstgebaute Bahn.', map: rows, obstacles: [], decor: [], autoDecor: { density: 0.3, seed: (Date.now() % 977) + 1 } };
  }

  /* ---------- Öffnen / Aufbau ---------- */
  function open(def) {
    ed.def = def ? JSON.parse(JSON.stringify(def)) : newDef();
    if (!ed.def.id) ed.def.id = Date.now();
    ed.def.decor = ed.def.decor || []; ed.def.obstacles = ed.def.obstacles || []; ed.def.autoDecor = ed.def.autoDecor || { density: 0.3, seed: 7 };
    ed.tiles = ed.def.map.map(r => r.split(''));
    const W = Math.max(...ed.tiles.map(r => r.length)); for (const r of ed.tiles) while (r.length < W) r.push('.');
    ed.pending = null; ed.hover = null; ed.panX = 0; ed.panY = 0; ed.drag = null;
    state.phase = 'edit'; state.mode = 'creative'; state.ball = null; state.aim = null; state.particles = []; state.editorReturn = false;
    state.camTheta = Math.PI / 4; state.zoomFactor = 1;
    document.body.classList.remove('title', 'testing'); document.body.classList.add('creative', 'editing');
    deps.hideOverlay();
    rebuild();
    buildPanel(); syncPanel();
    R.target = cameraTarget(); R.snapCamera();
  }
  function rebuild() {
    ed.def.map = ed.tiles.map(r => r.join(''));
    ed.def.editing = true;
    state.level = buildLevel(ed.def); state.theme = THEMES[ed.def.theme] || THEMES.meadow;
    R.setLevel(state.level, state.theme);
  }
  function cameraTarget() {
    const o = R.overviewTarget();
    return Object.assign(o, { th: state.camTheta, zoom: o.zoom * state.zoomFactor, fx: o.fx + ed.panX, fy: o.fy + ed.panY });
  }

  /* ---------- Kacheln ---------- */
  const W = () => ed.tiles[0].length, H = () => ed.tiles.length;
  function paint(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= W() || ty >= H()) return;
    const t = ed.tool;
    if (t === 'T' || t === 'H') { for (const r of ed.tiles) for (let x = 0; x < r.length; x++) if (r[x] === t) r[x] = '#'; ed.tiles[ty][tx] = t; }
    else if (ed.tiles[ty][tx] === t) return;
    else ed.tiles[ty][tx] = t;
    rebuild();
  }
  function resize(w, h) {
    w = Math.max(6, Math.min(48, w | 0)); h = Math.max(6, Math.min(36, h | 0));
    const rows = [];
    for (let y = 0; y < h; y++) { const src = ed.tiles[y] || []; const r = []; for (let x = 0; x < w; x++) r.push(src[x] || '.'); rows.push(r); }
    ed.tiles = rows; rebuild(); syncPanel();
  }

  /* ---------- Objekte ---------- */
  const mid = v => Math.floor(v) + 0.5, half = v => Math.round(v * 2) / 2;
  function makeObject(kind, wx, wy) {
    const x = mid(wx), y = mid(wy), tx = Math.floor(wx), ty = Math.floor(wy);
    switch (kind) {
      case 'bumper': return { type: 'bumper', x, y, r: 0.5 };
      case 'rotor': return { type: 'rotor', x, y, blades: 3, len: 1.5, speed: 1.5 };
      case 'gate': return { type: 'gate', x, y, w: 2, h: 0.3, period: 6, open: 0.5, axis: 'x' };
      case 'mover': return { type: 'mover', x0: x - 3, y0: y, x1: x + 3, y1: y, w: 1, h: 1, period: 7, style: 'cart' };
      case 'wind': return { type: 'field', x: tx, y: ty, w: 2, h: 2, fx: 2.5, fy: 0, style: 'wind' };
      case 'ramp': return { type: 'ramp', x: tx, y: ty, w: 2, h: 2, angle: 0, minSpeed: 2.5, speed: 4.2, land: 1.7 };
      case 'boost': return { type: 'boost', x: tx, y: ty, w: 2, h: 2, angle: 0 };
      case 'windmill': return { type: 'windmill', x, y, axis: 'y', w: 3, depth: 1.2, gap: 0.8, speed: 1.2 };
      case 'cannon': return { type: 'cannon', x, y, base: 0, amp: 0.5, speed: 0.9, range: 8, catchR: 0.6, loadTime: 0.7 };
      case 'magnet': return { type: 'magnet', x, y, r: 3, strength: 8 };
      case 'turntable': return { type: 'turntable', x, y, r: 1.5, speed: 1.6, exit: 0 };
      case 'potion': return { type: 'potion', x, y };
      default: return null;
    }
  }
  function anchors(o) {
    if (o.type === 'field' || o.type === 'ramp' || o.type === 'boost') return [[o.x + o.w / 2, o.y + o.h / 2]];
    if (o.type === 'mover') return [[o.x0, o.y0], [o.x1, o.y1], [(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2]];
    if (o.type === 'wall') return [[o.x0, o.y0], [o.x1, o.y1], [(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2]];
    if (o.type === 'portal') return [[o.x, o.y], [o.tx, o.ty]];
    return [[o.x, o.y]];
  }
  function nearest(wx, wy) {
    let best = -1, bd = 1.1;
    ed.def.obstacles.forEach((o, i) => { for (const [ax, ay] of anchors(o)) { const d = Math.hypot(ax - wx, ay - wy); if (d < bd) { bd = d; best = i; } } });
    return best;
  }
  function rotate(o) {
    const cyc = a => (a + 90) % 360;
    switch (o.type) {
      case 'field': { const f = Math.hypot(o.fx, o.fy) || 2.5; const a = Math.atan2(o.fy, o.fx) + Math.PI / 2; o.fx = Math.round(Math.cos(a) * f * 100) / 100; o.fy = Math.round(Math.sin(a) * f * 100) / 100; break; }
      case 'ramp': o.angle = cyc(o.angle || 0); break;
      case 'boost': o.angle = cyc(o.angle || 0); break;
      case 'gate': { const w = o.w; o.w = o.h; o.h = w; o.axis = o.axis === 'x' ? 'y' : 'x'; break; }
      case 'windmill': o.axis = o.axis === 'x' ? 'y' : 'x'; break;
      case 'mover': { const cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2, L = Math.hypot(o.x1 - o.x0, o.y1 - o.y0) / 2; if (o.y0 === o.y1) { o.x0 = o.x1 = cx; o.y0 = cy - L; o.y1 = cy + L; } else { o.y0 = o.y1 = cy; o.x0 = cx - L; o.x1 = cx + L; } break; }
      case 'cannon': o.base = Math.round(((o.base || 0) + Math.PI / 2) * 1000) / 1000; if (o.base > Math.PI * 2 - 0.01) o.base = 0; break;
      case 'magnet': o.strength = -o.strength; break;
      case 'turntable': o.exit = cyc(o.exit || 0); break;
      case 'rotor': o.speed = -o.speed; break;
      case 'portal': o.twoWay = !o.twoWay; break;
      default: return false;
    }
    return true;
  }
  function tap(wx, wy) {
    const tool = ed.tool;
    if (tool === 'delete') { const i = nearest(wx, wy); if (i >= 0) { ed.def.obstacles.splice(i, 1); rebuild(); } else showMessage('Kein Objekt in der Nähe', 900); return; }
    if (tool === 'rotate') { const i = nearest(wx, wy); if (i >= 0 && rotate(ed.def.obstacles[i])) rebuild(); else showMessage('Nichts zum Drehen in der Nähe', 900); return; }
    if (tool !== 'obj') return;
    const kind = ed.obj;
    if (kind === 'portal' || kind === 'wall') {
      const p = kind === 'wall' ? [half(wx), half(wy)] : [mid(wx), mid(wy)];
      if (!ed.pending) { ed.pending = { kind, p }; showMessage(kind === 'wall' ? 'Jetzt das Ende der Bande antippen' : 'Jetzt den Ausgang antippen', 1200); return; }
      const a = ed.pending.p; ed.pending = null;
      if (Math.hypot(a[0] - p[0], a[1] - p[1]) < 0.4) return;
      ed.def.obstacles.push(kind === 'wall' ? { type: 'wall', x0: a[0], y0: a[1], x1: p[0], y1: p[1] } : { type: 'portal', x: a[0], y: a[1], tx: p[0], ty: p[1], color: '#4fd0ff', twoWay: true });
      rebuild(); return;
    }
    const o = makeObject(kind, wx, wy); if (!o) return;
    ed.def.obstacles.push(o); rebuild();
  }

  /* ---------- Eingabe ---------- */
  function pointer(kind, e, px, py) {
    const [wx, wy] = R.screenToWorld(px, py), tx = Math.floor(wx), ty = Math.floor(wy);
    if (kind === 'down') {
      if (ed.tool === 'pan') ed.drag = { mode: 'pan', start: [px, py], pan0: [ed.panX, ed.panY] };
      else if (ed.tool === 'obj' || ed.tool === 'delete' || ed.tool === 'rotate') ed.drag = { mode: 'tap', start: [px, py] };
      else { ed.drag = { mode: 'paint' }; paint(tx, ty); }
    } else if (kind === 'move') {
      ed.hover = [tx, ty];
      if (!ed.drag) return;
      if (ed.drag.mode === 'pan') { const [dx, dy] = R.unprojDelta(px - ed.drag.start[0], py - ed.drag.start[1]); ed.panX = ed.drag.pan0[0] - dx; ed.panY = ed.drag.pan0[1] - dy; }
      else if (ed.drag.mode === 'paint') paint(tx, ty);
    } else if (kind === 'up' || kind === 'cancel') {
      if (ed.drag && ed.drag.mode === 'tap' && kind === 'up' && Math.hypot(px - ed.drag.start[0], py - ed.drag.start[1]) < 10) tap(wx, wy);
      ed.drag = null;
    }
  }

  /* ---------- Overlay (Raster, Cursor, offener Punkt) ---------- */
  function drawOverlay(ctx) {
    const lv = state.level; if (!lv) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    for (let x = 0; x <= lv.W; x++) { const a = R.proj(x, 0, 0.01), b = R.proj(x, lv.H, 0.01); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (let y = 0; y <= lv.H; y++) { const a = R.proj(0, y, 0.01), b = R.proj(lv.W, y, 0.01); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,220,120,0.9)'; ctx.lineWidth = 2; R.pathPoly(ctx, [[0, 0], [lv.W, 0], [lv.W, lv.H], [0, lv.H]], 0.01); ctx.stroke();
    if (ed.hover) {
      const [x, y] = ed.hover;
      if (x >= 0 && y >= 0 && x < lv.W && y < lv.H) R.fillPoly(ctx, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], 0.02, ed.tool === 'delete' ? 'rgba(255,90,90,0.35)' : 'rgba(255,255,255,0.28)', false);
    }
    if (ed.pending) { const [sx, sy] = R.proj(ed.pending.p[0], ed.pending.p[1], 0.05); ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill(); }
  }

  /* ---------- Panel ---------- */
  function buildPanel() {
    if (ed.panel) return;
    const p = document.createElement('div'); p.id = 'editor-panel'; ed.panel = p; document.body.appendChild(p);
    p.innerHTML = `
      <div class="ed-head"><b>🛠 Baumodus</b><button class="cbtn small" id="ed-collapse" title="Panel ein-/ausklappen">▾</button></div>
      <div class="ed-body">
        <div class="ed-sec"><div class="ed-title">Kacheln</div><div class="ed-grid" id="ed-tiles">${TILES.map(([c, n]) => `<button class="cbtn small ed-tool" data-tool="${c}">${n}</button>`).join('')}</div></div>
        <div class="ed-sec"><div class="ed-title">Start und Ziel</div><div class="ed-grid"><button class="cbtn small ed-tool" data-tool="T">Abschlag</button><button class="cbtn small ed-tool" data-tool="H">Loch</button></div></div>
        <div class="ed-sec"><div class="ed-title">Objekte</div>
          <select id="ed-obj">${OBJECTS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
          <div class="ed-grid"><button class="cbtn small ed-tool" data-tool="obj">Setzen</button><button class="cbtn small ed-tool" data-tool="rotate">Drehen</button><button class="cbtn small ed-tool" data-tool="delete">Löschen</button><button class="cbtn small ed-tool" data-tool="pan">Verschieben</button></div>
        </div>
        <div class="ed-hint" id="ed-hint"></div>
        <div class="ed-sec"><div class="ed-title">Bahn</div>
          <label>Name <input id="ed-name" maxlength="24"></label>
          <label>Par <input id="ed-par" type="number" min="1" max="12"></label>
          <label>Welt <select id="ed-theme">${Object.keys(THEMES).map(k => `<option value="${k}">${THEME_LABELS[k] || k}</option>`).join('')}</select></label>
          <label>Größe <input id="ed-w" type="number" min="6" max="48" style="width:52px"> × <input id="ed-h" type="number" min="6" max="36" style="width:52px"> <button class="cbtn small" id="ed-resize">OK</button></label>
        </div>
        <div class="ed-sec ed-grid">
          <button class="cbtn small ed-go" id="ed-test">▶ Testen</button><button class="cbtn small" id="ed-save">Speichern</button>
          <button class="cbtn small" id="ed-new">Neue Bahn</button><button class="cbtn small" id="ed-back">◀ Zurück</button>
        </div>
        <div class="ed-sec"><div class="ed-title">Gespeicherte Bahnen</div>
          <select id="ed-list"></select>
          <div class="ed-grid"><button class="cbtn small" id="ed-load">Laden</button><button class="cbtn small" id="ed-del">Löschen</button></div>
        </div>
        <div class="ed-sec"><div class="ed-title">Code (Export / Import)</div>
          <textarea id="ed-code" rows="3" spellcheck="false"></textarea>
          <div class="ed-grid"><button class="cbtn small" id="ed-export">Exportieren</button><button class="cbtn small" id="ed-import">Importieren</button></div>
        </div>
      </div>`;
    p.querySelectorAll('.ed-tool').forEach(b => b.addEventListener('click', () => { ed.tool = b.dataset.tool; ed.pending = null; syncPanel(); }));
    $('ed-obj').addEventListener('change', e => { ed.obj = e.target.value; ed.tool = 'obj'; ed.pending = null; syncPanel(); });
    $('ed-collapse').addEventListener('click', () => { ed.collapsed = !ed.collapsed; p.classList.toggle('collapsed', ed.collapsed); $('ed-collapse').textContent = ed.collapsed ? '▸' : '▾'; });
    $('ed-name').addEventListener('input', e => { ed.def.name = e.target.value || 'Meine Bahn'; });
    $('ed-par').addEventListener('change', e => { ed.def.par = Math.max(1, Math.min(12, +e.target.value || 3)); });
    $('ed-theme').addEventListener('change', e => { ed.def.theme = e.target.value; rebuild(); });
    $('ed-resize').addEventListener('click', () => resize(+$('ed-w').value, +$('ed-h').value));
    $('ed-test').addEventListener('click', test);
    $('ed-save').addEventListener('click', () => { persist(); syncPanel(); showMessage('Bahn gespeichert', 1200); });
    $('ed-new').addEventListener('click', () => open(null));
    $('ed-back').addEventListener('click', () => { persist(); leave(); showWorldSelect(); });
    $('ed-load').addEventListener('click', () => { const id = +$('ed-list').value; const c = loadCustoms().find(x => x.id === id); if (c) open(c); });
    $('ed-del').addEventListener('click', () => { const id = +$('ed-list').value; const list = loadCustoms().filter(x => x.id !== id); saveCustoms(list); syncPanel(); showMessage('Bahn gelöscht', 1000); });
    $('ed-export').addEventListener('click', () => { $('ed-code').value = JSON.stringify(cleanDef(ed.def)); $('ed-code').select(); showMessage('Code im Feld – markieren und kopieren', 1600); });
    $('ed-import').addEventListener('click', () => {
      try {
        const d = JSON.parse($('ed-code').value);
        if (!Array.isArray(d.map) || !d.map.every(r => typeof r === 'string')) throw new Error('map');
        d.id = Date.now(); d.obstacles = Array.isArray(d.obstacles) ? d.obstacles : []; d.theme = THEMES[d.theme] ? d.theme : 'meadow'; d.par = +d.par || 3; d.name = String(d.name || 'Importierte Bahn').slice(0, 24);
        open(d); showMessage('Bahn importiert', 1200);
      } catch (e) { showMessage('Code nicht lesbar', 1400); }
    });
    for (const id of ['ed-name', 'ed-par', 'ed-w', 'ed-h', 'ed-code']) $(id).addEventListener('keydown', e => e.stopPropagation());
  }
  function syncPanel() {
    if (!ed.panel) return;
    ed.panel.querySelectorAll('.ed-tool').forEach(b => b.classList.toggle('sel', b.dataset.tool === ed.tool));
    $('ed-obj').value = ed.obj;
    $('ed-name').value = ed.def.name; $('ed-par').value = ed.def.par; $('ed-theme').value = ed.def.theme; $('ed-w').value = W(); $('ed-h').value = H();
    const t = ed.tool;
    $('ed-hint').textContent = t === 'obj' ? (HINTS[ed.obj] || HINTS.obj) : (HINTS[t] || HINTS.tile);
    const list = loadCustoms(), sel = $('ed-list');
    sel.innerHTML = list.length ? list.map(c => `<option value="${c.id}">${c.name} (Par ${c.par})</option>`).join('') : '<option value="">– noch keine –</option>';
    if (list.some(c => c.id === ed.def.id)) sel.value = String(ed.def.id);
  }
  function leave() { state.phase = 'title'; document.body.classList.remove('editing'); document.body.classList.add('title'); }

  /* ---------- Testen ---------- */
  function hasTeeAndCup() { let t = false, h = false; for (const r of ed.tiles) for (const c of r) { if (c === 'T') t = true; if (c === 'H') h = true; } return t && h; }
  function test() {
    if (!hasTeeAndCup()) { showMessage('Erst Abschlag und Loch setzen', 1600); return; }
    persist();
    document.body.classList.remove('editing');
    startTest(cleanDef(ed.def));
  }
  function returnFromTest() { open(ed.def); }

  return { open, loadCustoms, cameraTarget, drawOverlay, pointer, returnFromTest, get active() { return state.phase === 'edit'; } };
};
