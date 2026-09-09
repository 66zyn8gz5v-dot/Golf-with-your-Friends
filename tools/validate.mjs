/* Prüft alle Bahnen: Karte rechteckig, T und H vorhanden, Loch vom Abschlag erreichbar. */
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { console };
vm.createContext(ctx);
const GLOBAL = { courses_pro: 'PRO_COURSES', courses_sea: 'SEA_COURSES', courses_jungle: 'JUNGLE_COURSES', courses_storm: 'STORM_COURSES', courses_shadow: 'SHADOW_COURSES', courses_colosseum: 'COLOSSEUM_COURSES' };
const load = f => vm.runInContext(fs.readFileSync(new URL(`../src/${f}.js`, import.meta.url), 'utf8') + `\n;${GLOBAL[f] || f.toUpperCase()}`, ctx);
// Reihenfolge wie in index.html: courses_pro.js baut die Weltliste und braucht die anderen schon
const THEMES = load('themes'), COURSES = load('courses'), SEA = load('courses_sea'), JUNGLE = load('courses_jungle'), STORM = load('courses_storm'), SHADOW = load('courses_shadow'), COLOSSEUM = load('courses_colosseum'), PRO = load('courses_pro');
// A, B, C sind die Eingänge der Löwentore und begehbar; ihre Ausgänge (a, b, c) sind Mauer.
const FLOOR = new Set(['#', 's', 'i', 'w', 'l', 'T', 'H', 'o', 'A', 'B', 'C']);
const TOR_PAARE = ['A', 'B', 'C'];
let ok = true;
const withInner = (list, world) => list.flatMap(c => { const out = [{ ...c, world }]; let d = c.inner, n = 1; while (d) { out.push({ ...d, par: c.par, name: `${c.name} (innen${n > 1 ? ' ' + n : ''})`, world }); d = d.inner; n++; } return out; });
[...COURSES.map(c => ({ ...c, world: 'Märchenland' })), ...withInner(SEA, 'Meereswelt'), ...withInner(JUNGLE, 'Dschungel'), ...withInner(STORM, 'Sturmhimmel'), ...withInner(SHADOW, 'Schattenreich'), ...withInner(COLOSSEUM, 'Kolosseum'), ...PRO.flatMap(c => c.inner ? [{ ...c, world: 'Profi' }, { ...c.inner, par: c.par, name: `${c.name} (innen)`, world: 'Profi' }] : [{ ...c, world: 'Profi' }])].forEach((c, i) => {
  const rows = c.map, H = rows.length, W = rows[0].length;
  const problems = [];
  if (!THEMES[c.theme]) problems.push(`Theme ${c.theme} fehlt`);
  rows.forEach((r, y) => { if (r.length !== W) problems.push(`Zeile ${y} hat Länge ${r.length} statt ${W}`); });
  let tee, cup;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'T') tee = [x, y]; if (ch === 'H') cup = [x, y]; }));
  if (!cup) { const d = (c.obstacles || []).find(o => o.type === 'door'); if (d) cup = [Math.floor(d.x), Math.floor(d.y)]; }
  if (!tee) problems.push('kein T'); if (!cup) problems.push('kein H (oder Tür)');

  /* Löwentore: Großbuchstabe = Eingang, gleicher Kleinbuchstabe = Ausgang. Jedes Zeichen darf genau
     einmal auf der Karte stehen, ein Tor ohne Gegenstück ist eine Sackgasse, und ein Ausgang ohne
     Auswurfrichtung wüsste nicht, wohin er den Ball spuckt. */
  const torZaehler = {};
  rows.forEach(r => [...r].forEach(ch => { if ('ABCabc'.includes(ch)) torZaehler[ch] = (torZaehler[ch] || 0) + 1; }));
  for (const [ch, n] of Object.entries(torZaehler)) if (n > 1) problems.push(`Zeichen ${ch} steht ${n}-mal auf der Karte – jedes Löwentor-Zeichen darf nur einmal vorkommen`);
  for (const gross of TOR_PAARE) {
    const klein = gross.toLowerCase(), hatEin = !!torZaehler[gross], hatAus = !!torZaehler[klein];
    if (hatEin && !hatAus) problems.push(`Löwentor ${gross}: Eingang ohne Ausgang (${klein} fehlt auf der Karte)`);
    if (hatAus && !hatEin) problems.push(`Löwentor ${klein}: Ausgang ohne Eingang (${gross} fehlt auf der Karte)`);
    if (!hatEin && !hatAus) continue;
    const tor = (c.obstacles || []).find(o => o.type === 'liongate' && String(o.pair || '').toUpperCase() === gross);
    if (!tor) problems.push(`Löwentor ${gross}: kein Hindernis vom Typ liongate mit pair '${gross}' – der Ausgang hat keine Auswurfrichtung`);
    else if (typeof tor.angle !== 'number' || !isFinite(tor.angle)) problems.push(`Löwentor ${gross}: der Ausgang hat keine Auswurfrichtung (angle fehlt)`);
  }
  for (const o of (c.obstacles || []).filter(o => o.type === 'liongate')) {
    const g = String(o.pair || '').toUpperCase();
    if (!TOR_PAARE.includes(g)) problems.push(`Löwentor mit pair '${o.pair}' – erlaubt sind nur ${TOR_PAARE.join(', ')}`);
    else if (!torZaehler[g] && !torZaehler[g.toLowerCase()]) problems.push(`Löwentor ${g}: steht in der Hindernisliste, aber nicht auf der Karte`);
  }
  if (tee && cup) {
    const seen = new Set([tee.join()]), q = [tee];
    while (q.length) {
      const [x, y] = q.shift();
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        const ch = rows[ny][nx];
        if (!FLOOR.has(ch) || ch === 'w' || ch === 'l') continue;
        const k = `${nx},${ny}`; if (seen.has(k)) continue; seen.add(k); q.push([nx, ny]);
      }
    }
    // Portale verbinden Gebiete
    // Portale und Fähren verbinden Gebiete
    const portals = (c.obstacles || []).filter(o => o.type === 'portal')
      .concat((c.obstacles || []).filter(o => o.type === 'ferry').map(o => ({ x: o.x0, y: o.y0, tx: o.x1, ty: o.y1, twoWay: true })))
      .concat((c.obstacles || []).filter(o => o.type === 'ramp').map(o => { // Rampe: Landepunkt hinter dem Rampenende
        const a = (o.angle || 0) * Math.PI / 180, dx = Math.cos(a), dy = Math.sin(a), cx = o.x + o.w / 2, cy = o.y + o.h / 2;
        const half = Math.abs(dx) > 0.5 ? o.w / 2 : o.h / 2;
        return { x: cx, y: cy, tx: cx + dx * (half + (o.land || 1.7)), ty: cy + dy * (half + (o.land || 1.7)) };
      }))
      .concat((c.obstacles || []).filter(o => o.type === 'updraft').flatMap(o => { // Aufwind: trägt in Rollrichtung 'land' Kacheln weit (vier Hauptrichtungen)
        const cx = o.x + (o.w || 2) / 2, cy = o.y + (o.h || 2) / 2, L = o.land || 5;
        return [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => ({ x: cx, y: cy, tx: cx + dx * L, ty: cy + dy * L }));
      }))
      .concat((c.obstacles || []).filter(o => o.type === 'liongate').flatMap(o => { // Löwentor: vom Eingang vor den Ausgang
        const g = String(o.pair || '').toUpperCase(), k = g.toLowerCase();
        let ein = null, aus = null;
        rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === g) ein = [x + 0.5, y + 0.5]; if (ch === k) aus = [x + 0.5, y + 0.5]; }));
        if (!ein || !aus) return [];
        const a = ((o.angle || 0) * Math.PI) / 180;
        return [{ x: ein[0], y: ein[1], tx: aus[0] + Math.cos(a) * 0.95, ty: aus[1] + Math.sin(a) * 0.95 }];
      }))
      .concat((c.obstacles || []).filter(o => o.type === 'cannon').map(o => { // Kanone: Landepunkt in Grundrichtung
        const a = o.base || 0, R = 0.9 + (o.range || 9);
        return { x: o.x, y: o.y, tx: o.x + Math.cos(a) * R, ty: o.y + Math.sin(a) * R };
      }));
    let changed = true;
    while (changed) {
      changed = false;
      for (const p of portals) {
        const links = [[p.x, p.y, p.tx, p.ty]]; if (p.twoWay) links.push([p.tx, p.ty, p.x, p.y]);
        for (const [ax, ay, bx, by] of links) {
          if (seen.has(`${Math.floor(ax)},${Math.floor(ay)}`) && !seen.has(`${Math.floor(bx)},${Math.floor(by)}`)) {
            const q2 = [[Math.floor(bx), Math.floor(by)]]; seen.add(q2[0].join());
            while (q2.length) {
              const [x, y] = q2.shift();
              for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
                const nx = x + dx, ny = y + dy;
                if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
                const ch = rows[ny][nx];
                if (!FLOOR.has(ch) || ch === 'w' || ch === 'l') continue;
                const k = `${nx},${ny}`; if (seen.has(k)) continue; seen.add(k); q2.push([nx, ny]);
              }
            }
            changed = true;
          }
        }
      }
    }
    if (!seen.has(cup.join())) problems.push('Loch vom Abschlag nicht erreichbar');
    for (const o of c.obstacles || []) {
      const pts = o.type === 'portal' ? [[o.x, o.y], [o.tx, o.ty]] : ['bumper', 'rotor', 'switch', 'potion', 'turntable', 'magnet', 'cannon', 'cauldron', 'door', 'spikes', 'lightning', 'trapdoor', 'guillotine', 'eyetower'].includes(o.type) ? [[o.x, o.y]] : o.type === 'mover' && o.style !== 'shark' ? [[o.x0, o.y0], [o.x1, o.y1]] : []; // Haie schwimmen im Wasser neben der Bahn
      if (o.type === 'rotor' && o.style === 'darktentacle') pts.length = 0; // dunkle Tentakel kriechen von außen (aus dem Wrack) auf die Bahn
      for (const [px, py] of pts) {
        const ch = rows[Math.floor(py)] && rows[Math.floor(py)][Math.floor(px)];
        if (!FLOOR.has(ch)) problems.push(`${o.type} bei (${px},${py}) liegt nicht auf dem Fairway (${ch})`);
      }
    }
  }
  const status = problems.length ? 'FEHLER' : 'ok';
  console.log(`${c.world.padEnd(8)} ${c.name.padEnd(16)} ${W}x${H} Par ${c.par} ${status}${problems.length ? ': ' + problems.join('; ') : ''}`);
  if (problems.length) ok = false;
});
process.exit(ok ? 0 : 1);
