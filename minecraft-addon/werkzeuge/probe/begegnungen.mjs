// Probe: Wal gegen Riesenkalmar.
import { gemerkt } from "@minecraft/server";
const b = await import("./begegnungen.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(!!ok); console.log(ok ? "ok  " : "FEHLER", was); }

function tier(typeId) {
    const t = { typeId, location: { x: 0, y: 30, z: 0 }, effekte: [], teilchen: [], toene: [],
        addEffect(n, d, o) { this.effekte.push([n, d, o?.amplifier]); } };
    t.dimension = { spawnParticle: (n) => t.teilchen.push(n), playSound: (n) => t.toene.push(n) };
    return t;
}
const treffer = gemerkt.ereignisse.entityHurt;
pruefe("das Skript hoert auf Treffer", treffer?.length === 1);
const wal = tier(b.WAL), kalmar = tier(b.KALMAR);
treffer[0]({ hurtEntity: kalmar, damageSource: { damagingEntity: wal } });
pruefe("der Wal rammt: Tinte und Flucht", kalmar.teilchen.includes("fynn:tintenwolke")
    && kalmar.effekte.some(([n]) => n === "speed"));
treffer[0]({ hurtEntity: wal, damageSource: { damagingEntity: kalmar } });
pruefe("der Kalmar umschlingt: der Wal wird langsam", wal.effekte.some(([n, , s]) => n === "slowness" && s === 3));
const spieler = tier("minecraft:player");
treffer[0]({ hurtEntity: kalmar, damageSource: { damagingEntity: spieler } });
pruefe("ein Spieler loest keine Tinte aus", kalmar.teilchen.length === 1);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
