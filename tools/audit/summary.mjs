import fs from 'node:fs';
const order = ['Märchenland', 'Meereswelt', 'Profi-Welt', 'Dschungeltempel'];
const byName = {};
for (const dir of ['out', 'out2']) if (fs.existsSync(dir)) for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.json'))) byName[f] = JSON.parse(fs.readFileSync(dir + '/' + f, 'utf8'));
const rows = Object.values(byName);
rows.sort((a, b) => order.indexOf(a.world) - order.indexOf(b.world));
const worldsOrder = {};
for (const w of ['normal','sea','pro','jungle']) worldsOrder[w] = 0;
console.log('Welt            Bahn                  Par Max  Profi  Normal Ø/Med/Max  Limit  Haz/Spiel  Flags');
for (const r of rows) {
  const n = r.normal, flags = [...r.notes, ...(r.innerNotes || []).map(t => '[innen] ' + t)].filter(t => /^(\[innen\] )?[A-ZÄÖÜ]{3,}/.test(t) && !/^(\[innen\] )?info/.test(t)).map(t => t.split(':')[0]);
  const bad = [];
  if (r.expert == null) bad.push('UNLÖSBAR?'); else if (r.expert > r.par) bad.push('Profi>Par');
  if (n.mean > r.par + 2.5) bad.push('zu schwer'); if (n.mean < r.par - 1) bad.push('zu leicht'); if (n.maxReached > 0) bad.push(`Limit ${n.maxReached}x`);
  console.log(`${r.world.padEnd(15)} ${r.name.padEnd(21)} ${String(r.par).padStart(3)} ${String(r.maxStrokes).padStart(3)}  ${String(r.expert ?? '-').padStart(5)}  ${String(n.mean).padStart(5)}/${String(n.median).padStart(2)}/${String(n.max).padStart(2)}   ${String(n.maxReached).padStart(3)}    ${String(n.hazardsPerGame).padStart(5)}    ${[...bad, ...flags].join(', ')}`);
}
