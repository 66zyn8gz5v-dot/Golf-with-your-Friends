// Die Erzpfeile ohne Spiel: Schuss aus dem Bogen, Bezahlen, Treffer, Spur.
import { gemerkt, system, world, ItemStack } from "@minecraft/server";
await import("./main.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }
const feuere = (name, e) => { for (const f of gemerkt.ereignisse[name] ?? []) f(e); };

const partikel = [], fallen = [];
const dimension = { spawnParticle: (n) => partikel.push(n), spawnItem: (i) => fallen.push(i) };
let zweithand = new ItemStack("fynn:silberpfeil", 3);
let bogen = { typeId: "minecraft:bow", getComponent: () => ({ getEnchantment: () => undefined }) };
const inventar = [];
const leiste = [];
let modus = "Survival";
const spieler = {
    id: "fynn", typeId: "minecraft:player", dimension, location: { x: 0, y: 64, z: 0 },
    getGameMode: () => modus,
    getDynamicProperty: () => undefined,
    onScreenDisplay: { setActionBar: (t) => leiste.push(t.replace(/§./g, "")) },
    getComponent(n) {
        if (n === "minecraft:equippable") return {
            getEquipment: (slot) => (slot === "Mainhand" ? bogen : zweithand),
            setEquipment: (slot, item) => { if (slot === "Offhand") zweithand = item ?? null; },
        };
        if (n === "minecraft:inventory") return { container: {
            size: inventar.length, getItem: (i) => inventar[i],
            addItem: (i) => { inventar.push(i); } } };
    },
};
world.getAllPlayers = () => [spieler];

let zaehler = 0;
function pfeil(besitzer = spieler) {
    const p = { id: "pf" + zaehler++, typeId: "minecraft:arrow", dimension, isValid: true,
        location: { x: 1, y: 65, z: 1 },
        getComponent: (n) => (n === "minecraft:projectile" ? { owner: besitzer } : undefined) };
    return p;
}
function wesen(typ, untot) {
    return { id: typ, typeId: typ, dimension, location: { x: 0, y: 64, z: 5 }, isValid: true,
        schaden: 0, wirkungen: [],
        matches: (o) => untot && o.families?.includes("undead"),
        applyDamage(n) { this.schaden += n; }, addEffect(id, d, o) { this.wirkungen.push(id); } };
}
system.currentTick = 50;

// Silberpfeil gegen einen Zombie.
const p1 = pfeil();
feuere("entitySpawn", { entity: p1 });
pruefe("ein Silberpfeil verbraucht (3 -> 2)", zweithand?.amount === 2);
pruefe("der gewoehnliche Pfeil kommt zurueck", inventar.length === 1 && inventar[0].typeId === "minecraft:arrow");
for (const [f, n] of gemerkt.takte) if (n === 2) f();
pruefe("Spur im Flug", partikel.includes("minecraft:endrod"));
const zombie = wesen("minecraft:zombie", true);
feuere("projectileHitEntity", { projectile: p1, getEntityHit: () => ({ entity: zombie }) });
pruefe(`gegen Untote: ${zombie.schaden} Schaden obendrauf`, zombie.schaden === 12);
const schwein = wesen("minecraft:pig", false);
const p2 = pfeil(); system.currentTick += 1;
feuere("entitySpawn", { entity: p2 });
feuere("projectileHitEntity", { projectile: p2, getEntityHit: () => ({ entity: schwein }) });
pruefe("gegen ein Schwein nichts extra", schwein.schaden === 0);

// Gold: schweben. Elektrum: gelaehmt. Eisen: mehr Schaden.
for (const [sorte, pruef, was] of [
    ["fynn:goldpfeil", (z) => z.wirkungen.includes("levitation"), "Gold: schwebt"],
    ["fynn:elektrumpfeil", (z) => z.wirkungen.includes("slowness") && z.schaden === 2, "Elektrum: gelaehmt"],
    ["fynn:eisenpfeil", (z) => z.schaden === 3, "Eisen: drei Schaden mehr"],
]) {
    zweithand = new ItemStack(sorte, 1);
    const p = pfeil(); const ziel = wesen("minecraft:husk", true); system.currentTick += 1;
    feuere("entitySpawn", { entity: p });
    feuere("projectileHitEntity", { projectile: p, getEntityHit: () => ({ entity: ziel }) });
    pruefe(was, pruef(ziel));
}
pruefe("der letzte Erzpfeil: Zweithand leer", zweithand === null);

// Armbrust mit Mehrfachschuss: drei Pfeile im selben Tick, einer bezahlt.
zweithand = new ItemStack("fynn:goldpfeil", 5);
bogen = { typeId: "minecraft:crossbow", getComponent: () => undefined };
system.currentTick += 1;
const vorher = inventar.length;
for (let i = 0; i < 3; i++) feuere("entitySpawn", { entity: pfeil() });
pruefe("Mehrfachschuss: ein Erzpfeil fuer drei", zweithand.amount === 4 && inventar.length === vorher + 1);

// Unendlichkeit: nichts zurueckgeben, Minecraft hat nichts genommen.
bogen = { typeId: "minecraft:bow", getComponent: () => ({ getEnchantment: (n) => (n === "infinity" ? { level: 1 } : undefined) }) };
system.currentTick += 1;
const vorher2 = inventar.length;
feuere("entitySpawn", { entity: pfeil() });
pruefe("Unendlichkeit: kein Pfeil zurueck", inventar.length === vorher2 && zweithand.amount === 3);

// Kreativ: nichts verbrauchen.
modus = "Creative"; system.currentTick += 1;
feuere("entitySpawn", { entity: pfeil() });
pruefe("Kreativ: Erzpfeile bleiben", zweithand.amount === 3);
modus = "Survival";

// Ohne Erzpfeile in der Zweithand: ein ganz normaler Pfeil.
zweithand = null; system.currentTick += 1;
const p9 = pfeil(); const ziel9 = wesen("minecraft:zombie", true);
feuere("entitySpawn", { entity: p9 });
feuere("projectileHitEntity", { projectile: p9, getEntityHit: () => ({ entity: ziel9 }) });
pruefe("ohne Erzpfeil keine Wirkung", ziel9.schaden === 0);

// Pfeil eines Skeletts: bleibt ein Skelettpfeil.
zweithand = new ItemStack("fynn:silberpfeil", 2);
feuere("entitySpawn", { entity: pfeil({ typeId: "minecraft:skeleton", id: "sk" }) });
pruefe("Skelettpfeile bleiben unberuehrt", zweithand.amount === 2);

// Hinweis, wenn kein gewoehnlicher Pfeil dabei ist.
inventar.length = 0;
for (const [f, n] of gemerkt.takte) if (n === 40) f();
pruefe("ohne normalen Pfeil: Hinweis", leiste.at(-1)?.includes("normalen Pfeil"));
inventar.push(new ItemStack("minecraft:arrow", 1)); leiste.length = 0;
for (const [f, n] of gemerkt.takte) if (n === 40) f();
pruefe("mit normalem Pfeil: kein Hinweis", !leiste.some((z) => z.includes("normalen Pfeil")));

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
