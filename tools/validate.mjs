/* Prüft alle Bahnen: Karte rechteckig, T und H vorhanden, Loch vom Abschlag erreichbar. */
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { console };
vm.createContext(ctx);
const GLOBAL = { courses_pro: 'PRO_COURSES', courses_sea: 'SEA_COURSES', courses_jungle: 'JUNGLE_COURSES', courses_storm: 'STORM_COURSES', courses_shadow: 'SHADOW_COURSES', courses_colosseum: 'COLOSSEUM_COURSES', courses_clock: 'CLOCK_COURSES' };
const load = f => vm.runInContext(fs.readFileSync(new URL(`../src/${f}.js`, import.meta.url), 'utf8') + `\n;${GLOBAL[f] || f.toUpperCase()}`, ctx);
// Reihenfolge wie in index.html: courses_pro.js baut die Weltliste und braucht die anderen schon
const THEMES = load('themes'), COURSES = load('courses'), SEA = load('courses_sea'), JUNGLE = load('courses_jungle'), STORM = load('courses_storm'), SHADOW = load('courses_shadow'), COLOSSEUM = load('courses_colosseum'), CLOCK = load('courses_clock'), PRO = load('courses_pro');
// A, B, C sind die Eingänge der Löwentore und begehbar; ihre Ausgänge (a, b, c) sind Mauer.
const FLOOR = new Set(['#', 's', 'i', 'w', 'l', 'T', 'H', 'o', 'A', 'B', 'C']);
const TOR_PAARE = ['A', 'B', 'C'];
let ok = true;
const withInner = (list, world) => list.flatMap(c => { const out = [{ ...c, world }]; let d = c.inner, n = 1; while (d) { out.push({ ...d, par: c.par, name: `${c.name} (innen${n > 1 ? ' ' + n : ''})`, world }); d = d.inner; n++; } return out; });
[...COURSES.map(c => ({ ...c, world: 'Märchenland' })), ...withInner(SEA, 'Meereswelt'), ...withInner(JUNGLE, 'Dschungel'), ...withInner(STORM, 'Sturmhimmel'), ...withInner(SHADOW, 'Schattenreich'), ...withInner(COLOSSEUM, 'Kolosseum'), ...withInner(CLOCK, 'Uhrwerkstadt'), ...PRO.flatMap(c => c.inner ? [{ ...c, world: 'Profi' }, { ...c.inner, par: c.par, name: `${c.name} (innen)`, world: 'Profi' }] : [{ ...c, world: 'Profi' }])].forEach((c, i) => {
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
  /* Wanderndes Tor: eine Mauer mit gleitendem Durchlass. Ist der Spalt so breit wie die Mauer,
     sperrt nichts mehr; ist er zu schmal, kommt der Ball nie hindurch. Und die Mauer soll auf der
     Bahn stehen, nicht daneben. Geprüft wird die Mitte, denn die Enden liegen absichtlich auf den
     Kanten der Bahn – dort ist schon kein Fairway mehr. */
  for (const o of (c.obstacles || []).filter(o => o.type === 'wandergate')) {
    const len = Math.hypot((o.x1 ?? 0) - (o.x0 ?? 0), (o.y1 ?? 0) - (o.y0 ?? 0));
    const spalt = o.gap == null ? 1.7 : o.gap;
    if (!(len > 0)) { problems.push('wandergate ohne Länge (x0/y0 und x1/y1 gleich)'); continue; }
    if (spalt >= len - 0.05) problems.push(`wandergate: Durchlass ${spalt} ist so breit wie die Mauer (${len.toFixed(1)}) – da sperrt nichts mehr`);
    if (spalt < 1) problems.push(`wandergate: Durchlass ${spalt} ist zu schmal, da kommt kein Ball hindurch`);
    const mx = ((o.x0 ?? 0) + (o.x1 ?? 0)) / 2, my = ((o.y0 ?? 0) + (o.y1 ?? 0)) / 2;
    const ch = rows[Math.floor(my)] && rows[Math.floor(my)][Math.floor(mx)];
    if (!FLOOR.has(ch)) problems.push(`wandergate: Mitte bei (${mx},${my}) liegt nicht auf dem Fairway (${ch})`);
  }
  /* Die drei Maschinen der Uhrwerkstadt. Geprüft wird, was sonst still scheitert: ein Aufzug, der
     nirgendwohin trägt, ein Kolben ohne Hub, ein Zeiger ohne Länge – und ob Ein- und Ausstieg des
     Aufzugs überhaupt auf der Bahn liegen. Ein Aufzug, der neben die Bahn absetzt, wirft den Ball
     ins Nichts, und das sähe wie ein Fehler im Spiel aus statt wie einer in der Bahn. */
  for (const o of (c.obstacles || []).filter(o => o.type === 'gearlift')) {
    const r = o.r == null ? 1.6 : o.r, a = ((o.angle || 0) * Math.PI) / 180;
    if (!(r > 0.4)) { problems.push(`gearlift bei (${o.x},${o.y}): Rad zu klein (r ${r})`); continue; }
    // Die Lücke muss breiter sein als der Ball, sonst passt er nie hinein
    const zn = o.zaehne == null ? 8 : o.zaehne;
    if (!(zn >= 4 && zn <= 24)) problems.push(`gearlift bei (${o.x},${o.y}): zaehne ${zn} – sinnvoll sind 4 bis 24`);
    else { const luecke = (2 * Math.PI * r / zn) * 0.5; if (luecke < 0.7) problems.push(`gearlift bei (${o.x},${o.y}): Zahnlücke nur ${luecke.toFixed(2)} breit – der Ball (0,6) passt nicht hinein`); }
    if (o.speed != null && !(Math.abs(o.speed) > 0.05)) problems.push(`gearlift bei (${o.x},${o.y}): steht still (speed ${o.speed})`);
    for (const [name, sx, sy] of [['Einstieg', o.x - Math.cos(a) * r, o.y - Math.sin(a) * r], ['Ausstieg', o.x + Math.cos(a) * r, o.y + Math.sin(a) * r]]) {
      const ch = rows[Math.floor(sy)] && rows[Math.floor(sy)][Math.floor(sx)];
      if (!FLOOR.has(ch)) problems.push(`gearlift: ${name} bei (${sx.toFixed(1)},${sy.toFixed(1)}) liegt nicht auf dem Fairway (${ch})`);
    }
  }
  for (const o of (c.obstacles || []).filter(o => o.type === 'piston')) {
    const hub = o.hub == null ? 2.4 : o.hub, st = o.stoss == null ? 0.28 : o.stoss;
    if (!(hub > 0.3)) problems.push(`piston bei (${o.x},${o.y}): hub ${hub} – da schlägt nichts aus`);
    if (!(st > 0.05)) problems.push(`piston bei (${o.x},${o.y}): stoss ${st} ist zu kurz`);
    const p = o.period == null ? 4 : o.period;
    if (!(p > st * 3 + (o.halt == null ? 0.22 : o.halt))) problems.push(`piston bei (${o.x},${o.y}): period ${p} ist kürzer als ein ganzer Schlag – er käme nie zur Ruhe`);
  }
  for (const o of (c.obstacles || []).filter(o => o.type === 'hand')) {
    const len = o.len == null ? 3 : o.len, sch = o.schub == null ? 1.5 : o.schub;
    if (!(len > 0.8)) problems.push(`hand bei (${o.x},${o.y}): len ${len} ist zu kurz`);
    if (!(sch > 0.1)) problems.push(`hand bei (${o.x},${o.y}): schub ${sch} – der Ball käme nie wieder von der Stange`);
    if (o.speed != null && !(Math.abs(o.speed) > 0.05)) problems.push(`hand bei (${o.x},${o.y}): steht still (speed ${o.speed})`);
    const ch = rows[Math.floor(o.y)] && rows[Math.floor(o.y)][Math.floor(o.x)];
    if (!FLOOR.has(ch)) problems.push(`hand: Achse bei (${o.x},${o.y}) liegt nicht auf dem Fairway (${ch})`);
  }

  /* Feuerturm: das Bauwerk steht neben der Bahn, bestrichen wird ein Rechteck (zx,zy,zw,zh) auf der
     Bahn. Ein Bereich ohne Fairway darunter wird von niemandem gesehen; ein Turm mitten auf dem
     Fairway wäre eine Mauer im Weg. Der Abschlag darf nicht im Bereich liegen: Der Ball wird an
     seinen letzten Ruhepunkt zurückgesetzt und notfalls zum Abschlag – läge der im Bereich, käme er
     nie heraus. Und der Strahl muss schmaler sein als seine Laufstrecke, sonst steht er still und
     verriegelt den Bereich für immer. */
  for (const o of (c.obstacles || []).filter(o => o.type === 'firetower')) {
    const zx = o.zx ?? 0, zy = o.zy ?? 0, zw = o.zw ?? 8, zh = o.zh ?? 4;
    if (!(zw > 0) || !(zh > 0)) { problems.push('firetower: der bestrichene Bereich hat keine Größe (zw/zh)'); continue; }
    if (o.achse != null && o.achse !== 'x' && o.achse !== 'y') { problems.push(`firetower: achse '${o.achse}' – erlaubt sind nur 'x' und 'y'`); continue; }
    const achse = (o.achse === 'x' || o.achse === 'y') ? o.achse : (zw >= zh ? 'x' : 'y');
    const breit = o.breit ?? 1.8, laenge = achse === 'x' ? zw : zh;
    if (!(breit > 0)) problems.push(`firetower: Strahlbreite ${breit} muss größer als null sein`);
    else if (breit >= laenge - 0.05) problems.push(`firetower: Strahlbreite ${breit} füllt die Laufstrecke (${laenge}) – dann steht der Strahl still und sperrt den Bereich für immer`);
    if (o.tempo != null && !(o.tempo > 0)) problems.push(`firetower: tempo ${o.tempo} muss größer als null sein`);
    const imBereich = (x, y) => x >= zx && x < zx + zw && y >= zy && y < zy + zh;
    let boden = 0;
    for (let y = Math.floor(zy); y < zy + zh; y++) for (let x = Math.floor(zx); x < zx + zw; x++) if (FLOOR.has(rows[y] && rows[y][x])) boden++;
    if (!boden) problems.push(`firetower: der Bereich bei (${zx},${zy}) liegt nicht auf der Bahn – der Strahl streicht über nichts`);
    const tch = rows[Math.floor(o.y ?? 0)] && rows[Math.floor(o.y ?? 0)][Math.floor(o.x ?? 0)];
    if (FLOOR.has(tch)) problems.push(`firetower: der Turm steht bei (${o.x},${o.y}) mitten auf der Bahn – er gehört an den Rand`);
    if (tee && imBereich(tee[0] + 0.5, tee[1] + 0.5)) problems.push('firetower: der Abschlag liegt im bestrichenen Bereich – der Ball käme dort nie heraus');
    if (cup && imBereich(cup[0] + 0.5, cup[1] + 0.5)) problems.push('firetower: das Loch liegt im bestrichenen Bereich');
    if (o.phase != null && (typeof o.phase !== 'number' || !isFinite(o.phase) || o.phase < 0 || o.phase >= 1)) problems.push(`firetower: phase ${o.phase} muss zwischen 0 und 1 liegen (Anteil eines Durchlaufs)`);
  }
  /* Kaiserloge: die Tribüne steht am Bahnrand, ihre Falltür (lx,ly,lw,lh) liegt in der Bahn. Eine
     Luke ohne Fairway darunter tut nichts; eine Loge mitten auf der Bahn wäre eine Mauer im Weg.
     Abschlag und Loch dürfen nicht in der Luke liegen: Der Ball wird an seinen letzten Ruhepunkt
     zurückgesetzt – läge der in der Luke, fiele er beim nächsten Daumen wieder hinein. */
  for (const o of (c.obstacles || []).filter(o => o.type === 'imperialbox')) {
    const lx = o.lx ?? 0, ly = o.ly ?? 0, lw = o.lw ?? 2, lh = o.lh ?? 2;
    if (!(lw > 0) || !(lh > 0)) { problems.push('imperialbox: die Falltür hat keine Größe (lw/lh)'); continue; }
    const inLuke = (x, y) => x >= lx && x < lx + lw && y >= ly && y < ly + lh;
    let boden = 0;
    for (let y = Math.floor(ly); y < ly + lh; y++) for (let x = Math.floor(lx); x < lx + lw; x++) if (FLOOR.has(rows[y] && rows[y][x])) boden++;
    if (!boden) problems.push(`imperialbox: die Falltür bei (${lx},${ly}) liegt nicht auf der Bahn`);
    const lch = rows[Math.floor(o.y ?? 0)] && rows[Math.floor(o.y ?? 0)][Math.floor(o.x ?? 0)];
    if (FLOOR.has(lch)) problems.push(`imperialbox: die Loge steht bei (${o.x},${o.y}) mitten auf der Bahn – sie gehört an den Rand`);
    if (tee && inLuke(tee[0] + 0.5, tee[1] + 0.5)) problems.push('imperialbox: der Abschlag liegt in der Falltür');
    if (cup && inLuke(cup[0] + 0.5, cup[1] + 0.5)) problems.push('imperialbox: das Loch liegt in der Falltür');
    if (o.start != null && o.start !== 'hoch' && o.start !== 'runter') problems.push(`imperialbox: start '${o.start}' – erlaubt sind nur 'hoch' und 'runter'`);
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
