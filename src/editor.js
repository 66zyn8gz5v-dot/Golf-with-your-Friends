/* Baumodus: eigene Bahnen direkt im Spiel bauen. Kacheln malen, Abschlag und Loch setzen, Hindernisse
   platzieren, Welt und Par wählen, speichern (im Browser), testen, als Code exportieren und importieren.
   Wird von main.js mit den nötigen Spielfunktionen verdrahtet. */
const Editor = (deps) => {
  const { state, R, $, showMessage, startTest, showWorldSelect } = deps;
  const KEY = speicherSchluessel('custom');
  const TILES = [['#', 'Rasen'], ['s', 'Sand'], ['i', 'Eis'], ['w', 'Wasser'], ['l', 'Lava'], ['x', 'Block'], ['o', 'Klippe'], ['.', 'Leer']];
  const OBJECTS = [
    ['bumper', 'Pilz (Bumper)'], ['rotor', 'Windrad'], ['gate', 'Fallgatter'], ['mover', 'Lore'], ['wind', 'Windfeld'], ['ramp', 'Sprungrampe'],
    ['boost', 'Beschleuniger'], ['windmill', 'Windmühle'], ['cannon', 'Kanone'], ['magnet', 'Magnet'], ['turntable', 'Drehscheibe'], ['potion', 'Schrumpftrank'],
    ['ferry', 'Fähre'], ['rail', 'Schiene'], ['wave', 'Welle'], ['sharkjump', 'Hai (springt)'], ['spikes', 'Stacheln'],
    ['updraft', 'Aufwind'], ['lightning', 'Blitz'], ['guillotine', 'Fallbeil'], ['eyetower', 'Turm des Auges'], ['switch', 'Schalter'],
    // Die drei Maschinen der Uhrwerkstadt
    ['gearlift', 'Zahnradaufzug'], ['piston', 'Dampfkolben'], ['hand', 'Zeiger'],
    ['portal', 'Portal (2× tippen)'], ['wall', 'Bande (2× tippen)'],
  ];
  const THEME_LABELS = { meadow: 'Elfenwiese', mushroom: 'Pilzhain', forge: 'Zwergenschmiede', forest: 'Zauberwald', dragon: 'Drachenhöhle', ice: 'Eisgrotte', sky: 'Wolkenburg', clockwork: 'Uhrwerk', witch: 'Hexenwald', hut: 'Hexenhütte', reef: 'Korallenriff', volcano: 'Vulkan', palace: 'Wüstenpalast', harbor: 'Piratenbucht', desert: 'Wüste', tomb: 'Grabkammer', castle: 'Burgberg', deck: 'Piratendeck', wreck: 'Schiffswrack', belly: 'Haimagen', jungle: 'Dschungel', temple: 'Tempelhalle', storm: 'Sturmhimmel', fortress: 'Sturmfestung', shadow: 'Schattenreich', throne: 'Thronsaal', darksea: 'Totensee', ghostship: 'Totenschiff', clocktown: 'Uhrwerkstadt', boiler: 'Kesselhaus', escapement: 'Turmkammer' };
  const HINTS = {
    tile: 'Tippen oder ziehen, um Kacheln zu malen.', T: 'Tippen: Abschlag setzen.', H: 'Tippen: Loch setzen.',
    'h+': 'Ziehen hebt den Boden um eine Stufe. Der Ball rollt Hänge hinunter.',
    'h-': 'Ziehen senkt den Boden um eine Stufe.',
    h0: 'Ziehen setzt den Boden wieder auf ebene Höhe.',
    obj: 'Tippen: Objekt platzieren. Mit „Drehen“ Richtung ändern, mit „Löschen“ entfernen.',
    portal: 'Erst den Eingang, dann den Ausgang antippen.',
    ferry: 'Fähre über Wasser oder Abgrund. „Drehen“ kippt die Fahrtrichtung.',
    rail: 'Schiene: hält den Ball in der Spur. „Drehen“ kippt sie.',
    wave: 'Welle schiebt den Ball zur Seite. „Drehen“ kippt die Laufrichtung.',
    sharkjump: 'Springt aus dem Wasser und frisst den Ball. „Drehen“ wechselt die Richtung.',
    spikes: 'Stacheln fahren im Takt aus. Wer darauf liegt, zahlt einen Strafschlag.',
    updraft: 'Aufwind trägt einen schnellen Ball über die Lücke. Langsame fallen.',
    lightning: 'Blitz schlägt im Takt ein – erst das Warnzeichen, dann der Schlag.',
    guillotine: 'Fallbeil fällt im Takt. Nie darunter liegen bleiben.',
    eyetower: 'Der Blick wandert im Kreis. Wer darin liegen bleibt, fliegt zurück.',
    switch: 'Schalter öffnet ein Fallgatter mit demselben Ziel-Buchstaben („Drehen“ wechselt A/B).', wall: 'Erst den Anfang, dann das Ende der Bande antippen.',
    delete: 'Tippen: Objekt in der Nähe löschen.', rotate: 'Tippen: Objekt in der Nähe drehen (Richtung, Achse, Anziehen/Abstoßen).', pan: 'Ziehen: Ansicht verschieben.',
  };
  const ed = { def: null, tiles: [], tool: '#', obj: 'bumper', pending: null, hover: null, panX: 0, panY: 0, drag: null, panel: null, collapsed: false, view: 'top' };

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
    // Höhenraster: eine Ziffer je Kachel, 0 = ebener Boden. Es liegt genau über der Karte.
    ed.heights = ed.tiles.map((row, y) => row.map((c, x) => {
      const ch = ed.def.heights && ed.def.heights[y] && ed.def.heights[y][x];
      return (ch >= '0' && ch <= '9') ? +ch : 0;
    }));
    ed.pending = null; ed.hover = null; ed.panX = 0; ed.panY = 0; ed.drag = null;
    state.phase = 'edit'; state.mode = 'creative'; state.ball = null; state.aim = null; state.particles = []; state.editorReturn = false;
    state.camTheta = ed.view === 'top' ? 0 : Math.PI / 4; state.zoomFactor = 1;
    document.body.classList.remove('title', 'testing'); document.body.classList.add('creative', 'editing');
    deps.hideOverlay();
    rebuild();
    buildPanel(); syncPanel();
    R.target = cameraTarget(); R.snapCamera();
  }
  const hatHoehen = () => ed.heights && ed.heights.some(r => r.some(v => v > 0));
  function rebuild() {
    ed.def.map = ed.tiles.map(r => r.join(''));
    // Nur wenn wirklich Stufen gemalt sind, kommt das Raster in die Bahn – sonst bleibt sie schlank
    if (hatHoehen()) { ed.def.heights = ed.heights.map(r => r.join('')); ed.def.hStep = ed.def.hStep || 0.5; }
    else { delete ed.def.heights; delete ed.def.hStep; }
    ed.def.editing = true;
    state.level = buildLevel(ed.def); state.theme = THEMES[ed.def.theme] || THEMES.meadow;
    R.setLevel(state.level, state.theme);
  }
  /* Kamera: Draufsicht (Norden oben, quadratische Kacheln, nur ein Hauch Höhe) oder Schrägsicht;
     die Karte wird im Bereich neben dem Panel zentriert */
  function cameraTarget() {
    const lv = state.level, panel = ed.panel && !ed.collapsed ? 290 : 0, availW = R.w - panel - 30, availH = R.h - 80 - 76;
    if (ed.view === 'top') {
      const zoom = Math.min(availW / (lv.W + 1.5), availH / (lv.H + 1.5)) * state.zoomFactor;
      return { fx: lv.W / 2 + ed.panX, fy: lv.H / 2 + ed.panY, th: state.camTheta, zoom, tilt: 1, zf: 0.12, cx: 15 + availW / 2, cy: 80 + availH / 2 };
    }
    const o = R.overviewTarget();
    const span = (lv.W + lv.H + 4) * Math.SQRT1_2, zoom = Math.min(availW / span, availH / (span * R.tilt + 3)) * state.zoomFactor;
    return Object.assign(o, { th: state.camTheta, zoom, fx: o.fx + ed.panX, fy: o.fy + ed.panY, cx: 15 + availW / 2, cy: 80 + availH / 2 + zoom * 0.8, zf: CAM_ZF });
  }
  function setView(v) { ed.view = v; state.camTheta = v === 'top' ? 0 : Math.PI / 4; ed.panX = 0; ed.panY = 0; state.zoomFactor = 1; syncPanel(); }

  /* ---------- Kacheln ---------- */
  const W = () => ed.tiles[0].length, H = () => ed.tiles.length;
  function paint(tx, ty) {
    if (tx < 0 || ty < 0 || tx >= W() || ty >= H()) return;
    const t = ed.tool;
    if (t === 'h+' || t === 'h-' || t === 'h0') {
      const alt = ed.heights[ty][tx];
      const neu = t === 'h0' ? 0 : Math.max(0, Math.min(9, alt + (t === 'h+' ? 1 : -1)));
      if (neu === alt) return;
      ed.heights[ty][tx] = neu; rebuild(); return;
    }
    if (t === 'T' || t === 'H') { for (const r of ed.tiles) for (let x = 0; x < r.length; x++) if (r[x] === t) r[x] = '#'; ed.tiles[ty][tx] = t; }
    else if (ed.tiles[ty][tx] === t) return;
    else ed.tiles[ty][tx] = t;
    rebuild();
  }
  function resize(w, h) {
    w = Math.max(6, Math.min(48, w | 0)); h = Math.max(6, Math.min(36, h | 0));
    const rows = [];
    const hoehen = [];
    for (let y = 0; y < h; y++) {
      const src = ed.tiles[y] || [], hsrc = (ed.heights && ed.heights[y]) || [];
      const r = [], hr = [];
      for (let x = 0; x < w; x++) { r.push(src[x] || '.'); hr.push(hsrc[x] || 0); }
      rows.push(r); hoehen.push(hr);
    }
    ed.tiles = rows; ed.heights = hoehen; rebuild(); syncPanel();
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
      // Stufe „Legende“ – dieselben Werte wie in den gebauten Welten, damit es sich gleich anfühlt
      case 'ferry': return { type: 'ferry', x0: x - 3, y0: y, x1: x + 3, y1: y, w: 1.1, h: 1.1, wait: 1.5, travel: 2.4, style: 'cart' };
      case 'rail': return { type: 'rail', y, x0: Math.max(0, tx - 3), x1: tx + 4 };
      case 'wave': return { type: 'wave', x0: x - 3, y0: y, x1: x + 3, y1: y, w: 0.6, h: 3, period: 6.5, push: 16 };
      case 'sharkjump': return { type: 'sharkjump', x, y, w: 3, h: 4, period: 3.6, jump: 0.4, phase: 0, axis: 'y', height: 1.6 };
      case 'spikes': return { type: 'spikes', x: tx, y: ty, w: 1, h: 2, period: 4, up: 0.45, phase: 0 };
      case 'updraft': return { type: 'updraft', x: tx, y: ty, w: 2, h: 3, minSpeed: 2.5, land: 6, fly: 7 };
      case 'lightning': return { type: 'lightning', x, y, w: 2, h: 4, period: 4.5, phase: 0, warn: 1, strike: 0.35 };
      case 'guillotine': return { type: 'guillotine', x, y, w: 0.35, h: 2, period: 5, phase: 0, hold: 0.32 };
      case 'eyetower': return { type: 'eyetower', x, y, r: 1.1, range: 9, fov: 0.6, speed: 0.42, phase: 0 };
      case 'switch': return { type: 'switch', x, y, r: 0.55, duration: 14, target: 'A' };
      /* Uhrwerkstadt. Der Aufzug trägt in Richtung 'angle' – der Einstieg liegt r Kacheln davor,
         der Ausstieg r dahinter. Sinnvoll ist er da, wo hinter ihm eine Höhenstufe beginnt. */
      case 'gearlift': return { type: 'gearlift', x, y, r: 1.5, angle: 0, speed: 1.0472, eimer: 3, phase: 0 };
      case 'piston': return { type: 'piston', x, y, w: 1.2, h: 1.2, angle: 0, hub: 2.4, period: 4, phase: 0 };
      case 'hand': return { type: 'hand', x, y, len: 2.6, speed: 1.0472, schub: 1.5, phase: 0 };
      default: return null;
    }
  }
  function anchors(o) {
    if (o.type === 'field' || o.type === 'ramp' || o.type === 'boost') return [[o.x + o.w / 2, o.y + o.h / 2]];
    if (o.type === 'mover' || o.type === 'ferry' || o.type === 'wave') return [[o.x0, o.y0], [o.x1, o.y1], [(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2]];
    if (o.type === 'rail') return [[o.x0, o.y], [o.x1, o.y], [(o.x0 + o.x1) / 2, o.y]];
    if (o.type === 'spikes' || o.type === 'updraft') return [[o.x + o.w / 2, o.y + o.h / 2]];
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
      case 'cannon': o.base = Math.round(((o.base || 0) + Math.PI / 2) * 1000) / 1000; if (o.base > Math.PI * 2 - 0.01) { o.base = 0; o.style = o.style === 'ballista' ? 'catapult' : o.style === 'catapult' ? undefined : 'ballista'; } break;
      case 'magnet': o.strength = -o.strength; break;
      case 'turntable': o.exit = cyc(o.exit || 0); break;
      case 'rotor': o.speed = -o.speed; break;
      case 'portal': o.twoWay = !o.twoWay; break;
      // Fähre, Welle und Schiene kippen zwischen waagerecht und senkrecht
      case 'ferry': case 'wave': { const cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2, L = Math.hypot(o.x1 - o.x0, o.y1 - o.y0) / 2;
        if (o.y0 === o.y1) { o.x0 = o.x1 = cx; o.y0 = cy - L; o.y1 = cy + L; } else { o.y0 = o.y1 = cy; o.x0 = cx - L; o.x1 = cx + L; } break; }
      case 'rail': { const L = (o.x1 - o.x0) / 2, cx = (o.x0 + o.x1) / 2;
        if (o.x0 != null && o.y0 == null) { o.y0 = o.y - L; o.y1 = o.y + L; o.x = cx; delete o.x0; delete o.x1; }
        else { o.x0 = o.x - L; o.x1 = o.x + L; o.y = (o.y0 + o.y1) / 2; delete o.y0; delete o.y1; } break; }
      case 'sharkjump': o.axis = o.axis === 'x' ? 'y' : 'x'; break;
      case 'spikes': case 'updraft': case 'lightning': case 'guillotine': { const w = o.w; o.w = o.h; o.h = w; break; }
      case 'eyetower': o.phase = Math.round((((o.phase || 0) + Math.PI / 2) % (Math.PI * 2)) * 100) / 100; break;
      case 'switch': o.target = o.target === 'A' ? 'B' : 'A'; break;
      case 'gearlift': case 'piston': o.angle = cyc(o.angle || 0); break;
      case 'hand': o.speed = -o.speed; break;
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
    // Höhenstufen sichtbar machen: von oben sieht man sie sonst kaum. Je Kachel die Stufenzahl,
    // dazu eine Tönung – hell nach oben, dunkel nach unten.
    if (ed.heights && (hatHoehen() || ed.tool === 'h+' || ed.tool === 'h-' || ed.tool === 'h0')) {
      ctx.save();
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let y = 0; y < ed.heights.length; y++) for (let x = 0; x < ed.heights[y].length; x++) {
        const stufe = ed.heights[y][x];
        if (!stufe) continue;
        R.fillPoly(ctx, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], 0.03, `rgba(255,225,140,${Math.min(0.34, 0.09 * stufe)})`);
        const [sx, sy] = R.proj(x + 0.5, y + 0.5, 0.04);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(String(stufe), sx + 1, sy + 1);
        ctx.fillStyle = '#ffe9a8'; ctx.fillText(String(stufe), sx, sy);
      }
      ctx.restore();
    }
    if (ed.pending) { const [sx, sy] = R.proj(ed.pending.p[0], ed.pending.p[1], 0.05); ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(sx, sy, 6, 0, Math.PI * 2); ctx.fill(); }
  }

  /* ---------- Eigene Welt (Reihenfolge gespeicherter Bahnen) ---------- */
  const WKEY = speicherSchluessel('world');
  function loadWorld() { try { const v = JSON.parse(localStorage.getItem(WKEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveWorld(ids) { try { localStorage.setItem(WKEY, JSON.stringify(ids)); } catch (e) { /* kein Speicher */ } }
  function worldCourses() { const list = loadCustoms(); return loadWorld().map(id => list.find(c => c.id === id)).filter(Boolean); }
  function showWorldDialog(insertId) {
    const list = loadCustoms(), ids = loadWorld().filter(id => list.some(c => c.id === id));
    // Bahnnamen können aus einem geteilten Code stammen – hier entschärft anzeigen
    const name = id => { const c = list.find(x => x.id === id); return c ? `${Text.esc(c.name)} (Par ${+c.par || 0})` : '?'; };
    const cur = insertId != null ? ids.indexOf(insertId) : -1;
    const rows = ids.map((id, i) => `<div class="wl-row ${id === insertId ? 'me' : ''}"><span class="wl-num">${i + 1}</span><span class="wl-name">${name(id)}</span>
      <button class="cbtn small wl-up" data-i="${i}" title="nach oben">${Icons.svg('arrow_upward')}</button><button class="cbtn small wl-down" data-i="${i}" title="nach unten">${Icons.svg('arrow_downward')}</button><button class="cbtn small wl-out" data-i="${i}" title="aus der Welt nehmen">${Icons.svg('close')}</button></div>`).join('');
    const slots = insertId != null && cur < 0 ? `<p>„${name(insertId)}“ einsetzen als Bahn:</p><div class="wl-slots">${Array.from({ length: ids.length + 1 }, (_, k) => `<span class="btn small wl-slot" data-k="${k}">${k + 1}</span>`).join('')}</div>` : '';
    const info = insertId != null && cur >= 0 ? `<p class="sub">„${name(insertId)}“ ist Bahn ${cur + 1} der Welt. Mit den Pfeilen verschieben.</p>` : '';
    deps.overlay(`<div class="panel wl">
      <h2>${Icons.svg('language')} Eigene Welt</h2>
      <div class="sub">${ids.length ? `${ids.length} Bahn${ids.length > 1 ? 'en' : ''} in der Reihenfolge, in der sie gespielt werden` : 'Noch keine Bahn in der Welt'}</div>
      <div class="wl-list">${rows || ''}</div>
      ${slots}${info}
      <p style="margin-top:12px"><span class="btn ghost small" id="wl-back">${Icons.svg('arrow_back')} Zurück zum Editor</span> ${ids.length ? `<span class="btn small" id="wl-play">${Icons.svg('play_arrow')} Welt spielen</span>` : ''}</p>
    </div>`);
    const rerender = () => showWorldDialog(insertId);
    ui().querySelectorAll('.wl-slot').forEach(b => b.addEventListener('click', () => { ids.splice(+b.dataset.k, 0, insertId); saveWorld(ids); showMessage('In die Eigene Welt eingesetzt', 1200); rerender(); }));
    ui().querySelectorAll('.wl-up').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i; if (i > 0) { [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; saveWorld(ids); rerender(); } }));
    ui().querySelectorAll('.wl-down').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i; if (i < ids.length - 1) { [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; saveWorld(ids); rerender(); } }));
    ui().querySelectorAll('.wl-out').forEach(b => b.addEventListener('click', () => { ids.splice(+b.dataset.i, 1); saveWorld(ids); rerender(); }));
    $('wl-back').addEventListener('click', () => { deps.hideOverlay(); syncPanel(); });
    if (ids.length) $('wl-play').addEventListener('click', () => { deps.hideOverlay(); leave(); deps.playWorld(worldCourses()); });
  }
  const ui = () => $('overlay');

  /* ---------- Panel ---------- */
  const SWATCH = { '#': '#7cc94f', s: '#e9d68f', i: '#c8ecff', w: '#3f8fd9', l: '#ff5a1f', x: '#8b889d', o: '#4d8a34', '.': '#2a2440' };
  function buildPanel() {
    if (ed.panel) return;
    const p = document.createElement('div'); p.id = 'editor-panel'; ed.panel = p; document.body.appendChild(p);
    p.innerHTML = `
      <div class="ed-head"><b>${Icons.svg('construction')} Baumodus</b><span><button class="cbtn small" id="ed-view" title="Draufsicht / Schrägsicht">Schrägsicht</button><button class="cbtn small" id="ed-collapse" title="Panel einklappen, um frei zu bauen">${Icons.svg('chevron_right')}</button></span></div>
      <div class="ed-tabs"><button class="ed-tab sel" data-tab="build">Bauen</button><button class="ed-tab" data-tab="hole">Bahn</button><button class="ed-tab" data-tab="save">Speichern</button></div>
      <div class="ed-body">
        <div class="ed-page" data-page="build">
          <div class="ed-title">Boden malen</div>
          <div class="ed-grid ed-tiles">${TILES.map(([c, n]) => `<button class="cbtn small ed-tool" data-tool="${c}"><i style="background:${SWATCH[c]}"></i>${n}</button>`).join('')}</div>
          <div class="ed-title">Start und Ziel</div>
          <div class="ed-grid"><button class="cbtn small ed-tool" data-tool="T">${Icons.svg('sports_golf')} Abschlag</button><button class="cbtn small ed-tool" data-tool="H">${Icons.svg('golf_course')} Loch</button></div>
          <div class="ed-title">Hindernisse</div>
          <select id="ed-obj">${OBJECTS.map(([k, n]) => `<option value="${k}">${n}</option>`).join('')}</select>
          <div class="ed-grid"><button class="cbtn small ed-tool" data-tool="obj">Setzen</button><button class="cbtn small ed-tool" data-tool="rotate">Drehen</button><button class="cbtn small ed-tool" data-tool="delete">Löschen</button></div>
          <div class="ed-title">Höhenstufen</div>
          <div class="ed-grid"><button class="cbtn small ed-tool" data-tool="h+">${Icons.svg('arrow_upward')} Höher</button><button class="cbtn small ed-tool" data-tool="h-">${Icons.svg('arrow_downward')} Tiefer</button></div>
          <div class="ed-grid"><button class="cbtn small ed-tool" data-tool="h0">${Icons.svg('close')} Stufe weg</button><button class="cbtn small" id="ed-hstep">Stufenhöhe 0,5</button></div>
          <div class="ed-title">Ansicht</div>
          <div class="ed-grid"><button class="cbtn small ed-tool" data-tool="pan">${Icons.svg('open_with')} Verschieben</button></div>
          <div class="ed-hint" id="ed-hint"></div>
        </div>
        <div class="ed-page" data-page="hole" hidden>
          <label>Name<input id="ed-name" maxlength="24"></label>
          <label>Par<input id="ed-par" type="number" min="1" max="12"></label>
          <label>Welt<select id="ed-theme">${Object.keys(THEMES).map(k => `<option value="${k}">${THEME_LABELS[k] || k}</option>`).join('')}</select></label>
          <label>Größe<span class="ed-size"><input id="ed-w" type="number" min="6" max="48"> × <input id="ed-h" type="number" min="6" max="36"> <button class="cbtn small" id="ed-resize">OK</button></span></label>
          <div class="ed-hint">Größe: Breite × Höhe in Kacheln. Beim Verkleinern wird rechts und unten abgeschnitten.</div>
        </div>
        <div class="ed-page" data-page="save" hidden>
          <div class="ed-grid"><button class="cbtn small" id="ed-save">${Icons.svg('save')} Speichern</button><button class="cbtn small" id="ed-new">${Icons.svg('add')} Neue Bahn</button><button class="cbtn small" id="ed-world">${Icons.svg('language')} Eigene Welt</button></div>
          <div class="ed-title">Gespeicherte Bahnen</div>
          <select id="ed-list"></select>
          <div class="ed-grid"><button class="cbtn small" id="ed-load">Laden</button><button class="cbtn small" id="ed-del">Löschen</button></div>
          <div class="ed-title">Bahn-Code (weitergeben)</div>
          <textarea id="ed-code" rows="3" spellcheck="false" placeholder="Code hier einfügen …"></textarea>
          <div class="ed-grid"><button class="cbtn small" id="ed-export">Exportieren</button><button class="cbtn small" id="ed-import">Importieren</button></div>
          <div class="ed-title">Weitergeben</div>
          <div class="ed-grid"><button class="cbtn small" id="ed-share">${Icons.svg('public')} Teilen</button><button class="cbtn small" id="ed-link">${Icons.svg('language')} Link kopieren</button></div>
          <div class="ed-hint" id="ed-share-hint"></div>
          <div class="ed-grid" style="margin-top:10px"><button class="cbtn small" id="ed-back">${Icons.svg('arrow_back')} Zurück zum Menü</button></div>
        </div>
      </div>
      <div class="ed-foot"><button class="cbtn small ed-go" id="ed-test">${Icons.svg('play_arrow')} Testen</button><button class="cbtn small ed-done" id="ed-done">${Icons.svg('check')} Fertig</button></div>`;
    p.querySelectorAll('.ed-tab').forEach(b => b.addEventListener('click', () => { p.querySelectorAll('.ed-tab').forEach(x => x.classList.toggle('sel', x === b)); p.querySelectorAll('.ed-page').forEach(x => { x.hidden = x.dataset.page !== b.dataset.tab; }); }));
    p.querySelectorAll('.ed-tool').forEach(b => b.addEventListener('click', () => { ed.tool = b.dataset.tool; ed.pending = null; syncPanel(); }));
    $('ed-obj').addEventListener('change', e => { ed.obj = e.target.value; ed.tool = 'obj'; ed.pending = null; syncPanel(); });
    $('ed-collapse').addEventListener('click', () => { ed.collapsed = !ed.collapsed; p.classList.toggle('collapsed', ed.collapsed); $('ed-collapse').innerHTML = ed.collapsed ? Icons.svg('construction') + ' Werkzeuge' : Icons.svg('chevron_right'); });
    $('ed-view').addEventListener('click', () => setView(ed.view === 'top' ? 'iso' : 'top'));
    // Wie hoch eine Stufe ist: flach, mittel oder steil
    $('ed-hstep').addEventListener('click', () => {
      const stufen = [0.3, 0.5, 0.8], jetzt = ed.def.hStep || 0.5;
      ed.def.hStep = stufen[(stufen.indexOf(jetzt) + 1) % stufen.length] || 0.5;
      rebuild(); syncPanel();
    });
    $('ed-name').addEventListener('input', e => { ed.def.name = Text.label(e.target.value) || 'Meine Bahn'; });
    $('ed-par').addEventListener('change', e => { ed.def.par = Math.max(1, Math.min(12, +e.target.value || 3)); });
    $('ed-theme').addEventListener('change', e => { ed.def.theme = e.target.value; rebuild(); });
    $('ed-resize').addEventListener('click', () => resize(+$('ed-w').value, +$('ed-h').value));
    $('ed-test').addEventListener('click', test);
    $('ed-done').addEventListener('click', () => { if (!hasTeeAndCup()) { showMessage('Erst Abschlag und Loch setzen', 1600); return; } persist(); syncPanel(); showWorldDialog(ed.def.id); });
    $('ed-world').addEventListener('click', () => showWorldDialog(null));
    $('ed-save').addEventListener('click', () => { persist(); syncPanel(); showMessage('Bahn gespeichert', 1200); });
    $('ed-new').addEventListener('click', () => open(null));
    $('ed-back').addEventListener('click', () => { persist(); leave(); showWorldSelect(); });
    $('ed-load').addEventListener('click', () => { const id = +$('ed-list').value; const c = loadCustoms().find(x => x.id === id); if (c) open(c); });
    $('ed-del').addEventListener('click', () => { const id = +$('ed-list').value; saveCustoms(loadCustoms().filter(x => x.id !== id)); saveWorld(loadWorld().filter(x => x !== id)); syncPanel(); showMessage('Bahn gelöscht', 1000); });
    $('ed-export').addEventListener('click', () => { $('ed-code').value = JSON.stringify(cleanDef(ed.def)); $('ed-code').select(); showMessage('Code im Feld – markieren und kopieren', 1600); });
    $('ed-import').addEventListener('click', () => {
      let roh = null;
      try { roh = JSON.parse($('ed-code').value); } catch (e) { showMessage('Code nicht lesbar', 1400); return; }
      // Fremder Code geht durch dieselbe Prüfung wie Werkstatt und Link
      const bahn = Share.pruefe(roh);
      if (!bahn) { showMessage(Share.grund || 'Code nicht lesbar', 1800); return; }
      open(bahn); showMessage('Bahn übernommen', 1200);
    });
    /* Teilen: die gespeicherte Bahn den anderen anbieten oder wieder zurückziehen */
    $('ed-share').addEventListener('click', () => {
      const gespeichert = loadCustoms().some(c => c.id === ed.def.id);
      if (!gespeichert) { showMessage('Erst speichern, dann teilen', 1800); return; }
      const raus = Share.istGeteilt(ed.def.id)
        ? Share.ziehZurueck(ed.def.id, loadCustoms(), Best.name)
        : Share.teile(ed.def.id, loadCustoms(), Best.name);
      if (raus.voll) { showMessage(`Mehr als ${Share.EIGENE_MAX} Bahnen gehen nicht – erst eine zurückziehen`, 2400); return; }
      showMessage(Share.istGeteilt(ed.def.id) ? 'Geteilt – deine Freunde sehen die Bahn jetzt' : 'Nicht mehr geteilt', 2000);
      syncPanel();
    });
    /* Link: die aktuelle Bahn als Adresse in die Zwischenablage */
    $('ed-link').addEventListener('click', async () => {
      try {
        const link = await Share.link(ed.def);
        let kopiert = false;
        try { await navigator.clipboard.writeText(link); kopiert = true; } catch (e) { /* ohne Erlaubnis geht es nicht */ }
        if (!kopiert) { $('ed-code').value = link; showMessage('Link steht im Code-Feld – von dort kopieren', 2600); }
        else showMessage('Link kopiert – einfach verschicken', 2000);
      } catch (e) { showMessage('Der Link ließ sich nicht bauen', 1800); }
    });
    for (const id of ['ed-name', 'ed-par', 'ed-w', 'ed-h', 'ed-code']) $(id).addEventListener('keydown', e => e.stopPropagation());
  }
  function syncPanel() {
    if (!ed.panel) return;
    ed.panel.querySelectorAll('.ed-tool').forEach(b => b.classList.toggle('sel', b.dataset.tool === ed.tool));
    $('ed-view').textContent = ed.view === 'top' ? 'Schrägsicht' : 'Draufsicht';
    const hs = $('ed-hstep');
    if (hs) hs.textContent = `Stufenhöhe ${String(ed.def.hStep || 0.5).replace('.', ',')}`;
    $('ed-obj').value = ed.obj;
    $('ed-name').value = ed.def.name; $('ed-par').value = ed.def.par; $('ed-theme').value = ed.def.theme; $('ed-w').value = W(); $('ed-h').value = H();
    const t = ed.tool;
    $('ed-hint').textContent = t === 'obj' ? (HINTS[ed.obj] || HINTS.obj) : (HINTS[t] || HINTS.tile);
    const list = loadCustoms(), sel = $('ed-list'), world = loadWorld();
    // Aus Bausteinen bauen: der Bahnname kann aus einem geteilten Code stammen
    if (!list.length) { sel.replaceChildren(new Option('– noch keine –', '')); }
    else sel.replaceChildren(...list.map(c => new Option(`${Text.label(c.name)} (Par ${+c.par || 0})${world.includes(c.id) ? ' · in Welt' : ''}`, c.id)));
    if (list.some(c => c.id === ed.def.id)) sel.value = String(ed.def.id);
    const k = world.indexOf(ed.def.id);
    $('ed-done').innerHTML = Icons.svg('check') + (k >= 0 ? ` Fertig · Bahn ${k + 1}` : ' Fertig');
    const geteilt = Share.istGeteilt(ed.def.id), gespeichert = list.some(c => c.id === ed.def.id);
    const sb = $('ed-share');
    if (sb) {
      sb.innerHTML = Icons.svg('public') + (geteilt ? ' Nicht mehr teilen' : ' Teilen');
      sb.classList.toggle('sel', geteilt);
      $('ed-share-hint').textContent = !gespeichert ? 'Zum Teilen die Bahn erst speichern.'
        : geteilt ? 'Deine Freunde sehen diese Bahn in ihrer Liste.'
        : 'Teilen legt die Bahn für alle ab, die das Spiel haben.';
    }
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
  /* Eine fremde Bahn (aus einem Link oder von einem Freund) unter die eigenen legen */
  function uebernimm(def) {
    const list = loadCustoms();
    const kopie = Object.assign({}, def, { id: Date.now() + Math.floor(Math.random() * 1000) });
    delete kopie.von; delete kopie.quelle;
    list.push(kopie); saveCustoms(list);
    return kopie;
  }

  return { open, uebernimm, loadCustoms, worldCourses, cameraTarget, drawOverlay, pointer, returnFromTest, get active() { return state.phase === 'edit'; } };
};
