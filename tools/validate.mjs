/* Prüft alle Bahnen: Karte rechteckig, T und H vorhanden, Loch vom Abschlag erreichbar. */
import fs from 'node:fs';
import vm from 'node:vm';
const ctx = { console };
vm.createContext(ctx);
const load = f => vm.runInContext(fs.readFileSync(new URL(`../src/${f}.js`, import.meta.url), 'utf8') + `\n;${f.toUpperCase()}`, ctx);
const THEMES = load('themes'), COURSES = load('courses');
const FLOOR = new Set(['#', 's', 'i', 'w', 'l', 'T', 'H', 'o']);
let ok = true;
COURSES.forEach((c, i) => {
  const rows = c.map, H = rows.length, W = rows[0].length;
  const problems = [];
  if (!THEMES[c.theme]) problems.push(`Theme ${c.theme} fehlt`);
  rows.forEach((r, y) => { if (r.length !== W) problems.push(`Zeile ${y} hat Länge ${r.length} statt ${W}`); });
  let tee, cup;
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (ch === 'T') tee = [x, y]; if (ch === 'H') cup = [x, y]; }));
  if (!tee) problems.push('kein T'); if (!cup) problems.push('kein H');
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
      .concat((c.obstacles || []).filter(o => o.type === 'ferry').map(o => ({ x: o.x0, y: o.y0, tx: o.x1, ty: o.y1, twoWay: true })));
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
      const pts = o.type === 'portal' ? [[o.x, o.y], [o.tx, o.ty]] : o.type === 'bumper' || o.type === 'rotor' ? [[o.x, o.y]] : o.type === 'mover' ? [[o.x0, o.y0], [o.x1, o.y1]] : [];
      for (const [px, py] of pts) {
        const ch = rows[Math.floor(py)] && rows[Math.floor(py)][Math.floor(px)];
        if (!FLOOR.has(ch)) problems.push(`${o.type} bei (${px},${py}) liegt nicht auf dem Fairway (${ch})`);
      }
    }
  }
  const status = problems.length ? 'FEHLER' : 'ok';
  console.log(`${i + 1}. ${c.name.padEnd(16)} ${W}x${H} Par ${c.par} ${status}${problems.length ? ': ' + problems.join('; ') : ''}`);
  if (problems.length) ok = false;
});
process.exit(ok ? 0 : 1);
