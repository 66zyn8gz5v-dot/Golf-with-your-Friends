// Der Feuerstab ohne Spiel: einmal schiessen, gleich noch einmal (muss
// gesperrt sein), und die Flammen einmal ticken lassen.
import { gemerkt, system, world } from "@minecraft/server";
await import("./main.js");

const gespawnt = [], partikel = [], toene = [];
let geschossen = null, besitzer = null;
const dimension = {
    spawnEntity: (typ, ort) => {
        gespawnt.push({ typ, ort });
        return { getComponent: (n) => n === "minecraft:projectile"
            ? { set owner(o) { besitzer = o; }, shoot: (v) => { geschossen = v; } } : undefined };
    },
    spawnParticle: (n, ort) => partikel.push({ n, ort }),
    playSound: (n) => toene.push(n),
};
const spieler = {
    id: "fynn", dimension,
    getViewDirection: () => ({ x: 0, y: 0, z: -1 }),      // Blick nach Norden
    getHeadLocation: () => ({ x: 10, y: 65.6, z: 10 }),
    getComponent: (n) => n === "minecraft:equippable"
        ? { getEquipment: () => ({ typeId: "fynn:feuerstab_2" }) } : undefined,
};
world.getAllPlayers = () => [spieler];

const benutzen = gemerkt.ereignisse["itemUse"];
const stab = { typeId: "fynn:feuerstab_2" };

system.currentTick = 100;
for (const f of benutzen) f({ itemStack: stab, source: spieler });
console.log("Schuss 1:", gespawnt.map((g) => g.typ).join(","), "| Flug:", JSON.stringify(geschossen),
            "| Besitzer:", besitzer?.id, "| Ton:", toene.join(","));
const start = gespawnt[0]?.ort;
console.log("  Start vor dem Kopf:", JSON.stringify(start));

system.currentTick = 105;
for (const f of benutzen) f({ itemStack: stab, source: spieler });
console.log("Schuss 2 nach 5 Ticks:", gespawnt.length === 1 ? "gesperrt" : "NICHT gesperrt");

system.currentTick = 130;
for (const f of benutzen) f({ itemStack: stab, source: spieler });
console.log("Schuss 3 nach 30 Ticks:", gespawnt.length === 2 ? "geht wieder" : "FEHLT");

for (const f of benutzen) f({ itemStack: { typeId: "minecraft:stick" }, source: spieler });
console.log("Mit einem Stock:", gespawnt.length === 2 ? "kein Schuss" : "FALSCH geschossen");

const vorher = partikel.length;
const flammen = gemerkt.takte.filter((t) => typeof t[0] === "function" && t[1] === 4).pop()[0];
flammen();
const f = partikel.at(-1);
console.log("Flammen am Stab:", partikel.length - vorher, "| bei", JSON.stringify(f?.ort));

// Blick nach Norden: rechts ist Osten, also groesseres x. Vorn ist kleineres z.
const gut = geschossen && geschossen.z < 0 && Math.abs(geschossen.x) < 1e-9
    && besitzer === spieler && start.z < 10 && gespawnt.length === 2
    && f && f.ort.x > 10 && f.ort.z < 10;
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
