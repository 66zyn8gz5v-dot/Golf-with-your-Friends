// Ruhm und Stufen, ohne Spiel.
import { gemerkt } from "@minecraft/server";
const r = await import("./ruhm.js");
const k = await import("./boss_kern.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

function spieler(id = "s") {
    const eig = new Map();
    const wirkungen = new Map();
    return {
        id, typeId: "minecraft:player", location: { x: 0, y: 64, z: 0 }, titel: [], leiste: [],
        getDynamicProperty: (n) => eig.get(n), setDynamicProperty: (n, v) => eig.set(n, v),
        getEffect: (n) => wirkungen.get(n),
        addEffect: (n, dauer, o) => wirkungen.set(n, { amplifier: o.amplifier, duration: dauer }),
        removeEffect: (n) => wirkungen.delete(n),
        wirkungen,
        dimension: { playSound() {} },
        onScreenDisplay: { setTitle(t, o) { this.titel = [t, o.subtitle]; }, setActionBar(t) { this.letzte = t; } },
    };
}

// ---- Die Kurve
pruefe("Stufe 1 bei 0 Ruhm", r.stufeAus(0).stufe === 1);
pruefe("45 Ruhm fuehren zu Stufe 2 (sechs Zombies)", r.stufeAus(44).stufe === 1 && r.stufeAus(45).stufe === 2);
let summe = 0;
for (let n = 1; n < r.HOECHSTE_STUFE; n++) summe += r.bisNaechste(n);
pruefe(`Stufe 30 nach ${summe} Ruhm, dann ist Schluss`, r.stufeAus(summe).stufe === 30 && r.stufeAus(summe * 3).stufe === 30);

// ---- Belohnungen
pruefe("Stufe 1: nichts", r.wirkungenFuer(1).length === 0);
const w12 = Object.fromEntries(r.wirkungenFuer(12));
pruefe("Stufe 12: Eile, +4 Herzen, Staerke I", w12.haste === 0 && w12.health_boost === 1 && w12.strength === 0);
const w30 = Object.fromEntries(r.wirkungenFuer(30));
pruefe("Stufe 30: +12 Herzen, Staerke II", w30.health_boost === 5 && w30.strength === 1);
pruefe("keine Wirkung, die eine Waffe gibt", [1, 5, 12, 30].every((s) => r.wirkungenFuer(s)
    .every(([id]) => !["resistance", "fire_resistance", "jump_boost", "speed"].includes(id))));

// ---- Ruhm durch Monster
const s = spieler();
const zombie = { typeId: "minecraft:zombie" };
for (const f of gemerkt.ereignisse["entityDie"] ?? []) f({ deadEntity: zombie, damageSource: { damagingEntity: s } });
pruefe(`Zombie besiegt: ${r.ruhmVon(s)} Ruhm`, r.ruhmVon(s) === 8);
const ohneSpieler = spieler("x");
for (const f of gemerkt.ereignisse["entityDie"] ?? []) f({ deadEntity: zombie, damageSource: { damagingEntity: zombie } });
pruefe("ein Zombie, den ein anderer Zombie erledigt: kein Ruhm fuer niemanden", r.ruhmVon(ohneSpieler) === 0);
pruefe("ein unbekanntes Monster zaehlt auch", r.ruhmFuerWesen({ typeId: "x:y",
    getComponent: (n) => (n === "minecraft:type_family" ? { hasTypeFamily: (f) => f === "monster" } : undefined) }) === 6);

// ---- Stufe erreicht
r.gibRuhm(s, 40);
pruefe(`Stufe 2: Titel "${s.onScreenDisplay.titel[0]}"`, r.stufeVon(s) === 2 && s.onScreenDisplay.titel[0].includes("Stufe 2"));
r.gibRuhm(s, 200);
pruefe(`Stufe ${r.stufeVon(s)}: Eile gewirkt, Belohnung im Untertitel`, s.wirkungen.get("haste")?.amplifier === 0
    && s.onScreenDisplay.titel[1].includes("Eile"));

// ---- Bosssieg
const vorher = r.ruhmVon(s);
k.merkeSiege([s], "fynn:frostmammut");
pruefe(`Frosthauer besiegt: +${r.ruhmVon(s) - vorher} Ruhm`, r.ruhmVon(s) - vorher === 400);
pruefe(`jetzt Stufe ${r.stufeVon(s)}, +2 Herzen`, r.stufeVon(s) >= 5 && s.wirkungen.get("health_boost")?.amplifier === 0);

// ---- Kraft-Bonus
const stark = spieler("stark");
stark.setDynamicProperty("fynn:ruhm", summe);
pruefe("Stufe 30: Kraft kommt 3 schneller", r.kraftBonus(stark) === 3 && r.kraftBonus(spieler("neu")) === 0);

// ---- Milch getrunken: die Wirkungen kommen wieder
s.wirkungen.clear();
r.wirken(s);
pruefe("nach der Milch: Eile und Herzen wieder da", s.wirkungen.has("haste") && s.wirkungen.has("health_boost"));

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
