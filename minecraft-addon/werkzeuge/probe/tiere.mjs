// Talismane, Jagdhorn, Essen, Beute, Kalmar und Wal - ohne Spiel.
import { gemerkt, system, world } from "@minecraft/server";
const t = await import("./tiere.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

function spielerMit(leiste, zweithand = null, imWasser = false) {
    return {
        id: "fynn", typeId: "minecraft:player", isInWater: imWasser, location: { x: 0, y: 64, z: 0 },
        wirkungen: [], leisteText: [],
        addEffect(n, d, o) { this.wirkungen.push([n, d, o?.amplifier ?? 0]); },
        onScreenDisplay: { setActionBar(x) { } },
        getComponent(n) {
            if (n === "minecraft:inventory") return { container: { size: 36, getItem: (i) => leiste[i] ? { typeId: leiste[i] } : undefined } };
            if (n === "minecraft:equippable") return { getEquipment: () => (zweithand ? { typeId: zweithand } : undefined) };
        },
    };
}

// --- Talismane
const talismanTakt = gemerkt.takte.filter((x) => x[1] === 40).map((x) => x[0]);
let s = spielerMit(["minecraft:stone_sword", "fynn:baerentalisman"], "fynn:elchtalisman");
world.getAllPlayers = () => [s];
for (const f of talismanTakt) f();
pruefe("Baerentalisman in der Leiste: Staerke", s.wirkungen.some((w) => w[0] === "strength"));
pruefe("Elchtalisman in der Zweithand: Sprungkraft 2", s.wirkungen.some((w) => w[0] === "jump_boost" && w[2] === 1));
s = spielerMit([, , , , , , , , , "fynn:tigertalisman"]);
world.getAllPlayers = () => [s];
for (const f of talismanTakt) f();
pruefe("Talisman im Rucksack (nicht Leiste): wirkt nicht", s.wirkungen.length === 0);
s = spielerMit(["fynn:haitalisman"]);
world.getAllPlayers = () => [s];
for (const f of talismanTakt) f();
pruefe("Haitalisman an Land: nichts", s.wirkungen.length === 0);
s.isInWater = true;
for (const f of talismanTakt) f();
pruefe("Haitalisman im Wasser: Unterwasserkraft", s.wirkungen.some((w) => w[0] === "conduit_power"));

// --- Ganze Ruestung
const baer = ["fynn:baerenkapuze", "fynn:baerenfellmantel", "fynn:baerenfellhose", "fynn:baerenfellstiefel"];
const traeger = spielerMit([]);
traeger.getComponent = (n) => n === "minecraft:equippable" ? { getEquipment: (platz) =>
    ({ typeId: baer[["Head", "Chest", "Legs", "Feet"].indexOf(platz)] }) } : { container: { getItem: () => undefined } };
world.getAllPlayers = () => [traeger];
for (const f of talismanTakt) f();
pruefe("ganze Baerenfellruestung: Staerke", traeger.wirkungen.some((w) => w[0] === "strength"));
const halb = spielerMit([]);
halb.getComponent = (n) => n === "minecraft:equippable" ? { getEquipment: (platz) =>
    (platz === "Head" ? { typeId: baer[0] } : undefined) } : { container: { getItem: () => undefined } };
world.getAllPlayers = () => [halb];
for (const f of talismanTakt) f();
pruefe("nur die Kapuze: keine Kraft", !halb.wirkungen.some((w) => w[0] === "strength"));

// --- Jagdhorn
const mitjaeger = spielerMit([]);
const blaeser = spielerMit([]);
const toene = [];
blaeser.dimension = { playSound: (n) => toene.push(n), getPlayers: () => [blaeser, mitjaeger] };
system.currentTick = 5000;
pruefe("Horn blasen", t.jagdhorn(blaeser) === true);
pruefe("alle in der Naehe: Tempo und Staerke", mitjaeger.wirkungen.some((w) => w[0] === "speed")
       && mitjaeger.wirkungen.some((w) => w[0] === "strength") && toene.length === 1);
system.currentTick = 5100;
pruefe("gleich noch einmal: das Horn braucht Ruhe", t.jagdhorn(blaeser) === false);
system.currentTick = 6300;
pruefe("nach einer Minute wieder", t.jagdhorn(blaeser) === true);

// --- Essen
const essen = gemerkt.ereignisse["itemCompleteUse"][0];
const esser = spielerMit([]);
essen({ itemStack: { typeId: "fynn:trank_der_tiefe" }, source: esser });
pruefe("Trank der Tiefe: Nachtsicht und Wasseratmung, 5 Minuten",
       esser.wirkungen.some((w) => w[0] === "night_vision" && w[1] === 6000)
       && esser.wirkungen.some((w) => w[0] === "water_breathing"));
const alt = Math.random;
Math.random = () => 0.1;
essen({ itemStack: { typeId: "fynn:baerenfleisch" }, source: esser });
pruefe("rohes Baerenfleisch mit Pech: Hunger", esser.wirkungen.some((w) => w[0] === "hunger"));
Math.random = alt;

// --- Beute
function tier(typeId, variante = 0, baby = false) {
    return { typeId, getComponent: (n) => (n === "minecraft:variant" ? { value: variante }
                                           : n === "minecraft:is_baby" && baby ? {} : undefined) };
}
const jaeger = spielerMit([]);
const kettenjaeger = spielerMit(["fynn:jaegerkette"]);
pruefe("Elchbulle, Glueck: Geweih", t.beuteNachTod(tier("fynn:elch", 0), jaeger, () => 0.1).includes("fynn:elchgeweih"));
pruefe("Elchkuh: nie ein Geweih", t.beuteNachTod(tier("fynn:elch", 1), jaeger, () => 0.0).length === 0);
pruefe("Elchkalb: nichts", t.beuteNachTod(tier("fynn:elch", 0, true), jaeger, () => 0.0).length === 0);
pruefe("Tiger ohne Kette: nichts extra", t.beuteNachTod(tier("fynn:tiger"), jaeger, () => 0.0).length === 0);
const extra = t.beuteNachTod(tier("fynn:tiger"), kettenjaeger, () => 0.1);
pruefe(`Tiger mit Jaegerkette: Seltenes (${extra})`, extra.length === 1 && t.SELTEN["fynn:tiger"].includes(extra[0]));
pruefe("Jaegerkette, Pech: nichts", t.beuteNachTod(tier("fynn:tiger"), kettenjaeger, () => 0.9).length === 0);
for (const [tierName, liste] of Object.entries(t.SELTEN)) {
    if (!liste.every((n) => n.startsWith("fynn:"))) pruefe(`${tierName}: Liste`, false);
}

// --- Riesenkalmar
const verletzt = gemerkt.ereignisse["entityHurt"][0];
const taucher = spielerMit([]);
const kalmar = { typeId: "fynn:riesenkalmar", location: { x: 0, y: 20, z: 0 }, dimension: { spawnParticle() { } } };
verletzt({ hurtEntity: kalmar, damageSource: { damagingEntity: taucher } });
pruefe("Kalmar getroffen: Tinte, blind", taucher.wirkungen.some((w) => w[0] === "blindness"));
const treffer = gemerkt.ereignisse["entityHitEntity"][0];
const opfer = spielerMit([]);
treffer({ damagingEntity: kalmar, hitEntity: opfer });
pruefe("Kalmar packt zu: langsam", opfer.wirkungen.some((w) => w[0] === "slowness"));

// --- Wal
const teilchen = [];
function wal(obenLuft, untenWasser) {
    return { location: { x: 0, y: 60, z: 0 }, dimension: {
        getBlock: ({ y }) => (y > 61.5 ? { isAir: obenLuft, typeId: obenLuft ? "minecraft:air" : "minecraft:water" }
                                      : { isAir: false, typeId: untenWasser ? "minecraft:water" : "minecraft:stone" }),
        spawnParticle: (n) => teilchen.push(n), playSound() { },
    } };
}
pruefe("Wal an der Oberflaeche: Fontaene", t.blaestAus(wal(true, true)) && teilchen.includes("fynn:walfontaene"));
pruefe("Wal tief unten: keine", !t.blaestAus(wal(false, true)));

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
