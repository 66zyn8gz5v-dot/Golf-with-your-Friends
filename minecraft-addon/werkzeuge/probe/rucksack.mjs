// Rucksack: abstellen, aufheben, nur ein voller, verschachteln, Elch - ohne Spiel.
import { gemerkt, system, world, ItemStack } from "@minecraft/server";
const r = await import("./rucksack.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

// --- Eine kleine Welt: Bloecke sind Luft, ausser dem Boden bei y = 63.
const wesen = [];
const gespawnt = [];
const gefallen = [];
const strukturen = new Map();
const dimension = {
    heightRange: { min: -64, max: 320 },
    getBlock: ({ y }) => ({ isAir: y > 63, typeId: y > 63 ? "minecraft:air" : "minecraft:grass_block",
                            getComponent: () => undefined }),
    spawnEntity(typ, ort) { const w = neuesWesen(typ, ort); gespawnt.push(typ); return w; },
    spawnItem(stapel) { gefallen.push(stapel); },
    getEntities({ type, location, maxDistance }) {
        return wesen.filter((w) => w.gueltig && (!type || w.typeId === type) && (!location ||
            Math.hypot(w.location.x - location.x, w.location.y - location.y, w.location.z - location.z) <= maxDistance));
    },
    getPlayers: () => [],
    playSound() { },
};
function neuesWesen(typ, ort, plaetze = []) {
    const inhalt = [...plaetze];
    while (inhalt.length < 27) inhalt.push(undefined);
    const w = {
        id: `w${wesen.length}`, typeId: typ, location: { ...ort }, dimension, gueltig: true, inhalt,
        getComponent: (n) => (n === "minecraft:inventory" ? { container: {
            size: 27, get emptySlotsCount() { return inhalt.filter((x) => !x).length; },
            getItem: (i) => inhalt[i], setItem: (i, s) => { inhalt[i] = s; } } } : undefined),
        teleport(o) { this.location = { ...o }; },
        remove() { this.gueltig = false; },
        setRotation() { },
    };
    wesen.push(w);
    return w;
}
world.structureManager = {
    get: (n) => strukturen.get(n),
    createFromWorld(n, dim, von) {
        const drin = wesen.filter((w) => w.gueltig && Math.floor(w.location.x) === von.x
            && Math.floor(w.location.y) === von.y && Math.floor(w.location.z) === von.z);
        strukturen.set(n, drin.map((w) => ({ typ: w.typeId, inhalt: [...w.inhalt], versatz: {
            x: w.location.x - von.x, y: w.location.y - von.y, z: w.location.z - von.z } })));
        return {};
    },
    place(n, dim, ort) {
        for (const w of strukturen.get(n)) {
            neuesWesen(w.typ, { x: ort.x + w.versatz.x, y: ort.y + w.versatz.y, z: ort.z + w.versatz.z }, w.inhalt);
        }
    },
    delete: (n) => strukturen.delete(n),
};
const eigenschaften = new Map();
world.getDynamicProperty = (k) => eigenschaften.get(k);
world.setDynamicProperty = (k, v) => (v === undefined ? eigenschaften.delete(k) : eigenschaften.set(k, v));

function spieler(taschen = []) {
    const plaetze = [...taschen];
    while (plaetze.length < 36) plaetze.push(undefined);
    return {
        id: "fynn", typeId: "minecraft:player", location: { x: 3.2, y: 64, z: 0.7 }, dimension, isSneaking: false,
        selectedSlotIndex: 0, plaetze, hinweise: [], animationen: [],
        onScreenDisplay: { setActionBar(t) { } },
        playAnimation(n) { this.animationen.push(n); },
        getComponent: (n) => (n === "minecraft:inventory" ? { container: {
            size: 36, getItem: (i) => plaetze[i], setItem: (i, s) => { plaetze[i] = s; },
            addItem: (s) => { const i = plaetze.findIndex((x) => !x); if (i < 0) return s; plaetze[i] = s; return undefined; },
        } } : undefined),
    };
}
const boden = { location: { x: 5, y: 63, z: 5 }, typeId: "minecraft:grass_block", getComponent: () => undefined };
// runTimeout merkt sich nur "spaeter" - fuer die Probe fuehren wir es sofort aus.
system.runTimeout = (f) => f();

// --- Leeren Rucksack abstellen und wieder aufheben
let s = spieler([r.rucksackStapel()]);
pruefe("abstellen auf Gras", r.abstellen(s, boden, "Up") === true);
pruefe("steht einen Block hoeher, mittig", wesen.at(-1).location.y === 64 && wesen.at(-1).location.x === 5.5);
pruefe("aus der Hand verschwunden", !s.plaetze[0]);
pruefe("leer aufheben", r.aufheben(s, wesen.at(-1)) === true && s.plaetze[0]?.typeId === r.RUCKSACK);
pruefe("leerer Rucksack ist nicht voll", !r.istVoll(s.plaetze[0]));

// --- Etwas hineinlegen, aufheben, woanders abstellen: alles wieder da
r.abstellen(s, boden, "Up");
let abgestellt = wesen.at(-1);
const diamant = new ItemStack("minecraft:diamond", 5);
abgestellt.inhalt[3] = diamant;
abgestellt.inhalt[9] = new ItemStack("minecraft:bread", 12);
pruefe("voll aufheben", r.aufheben(s, abgestellt) === true);
pruefe("das Wesen ist weg", !abgestellt.gueltig);
pruefe("der Gegenstand ist voll, mit Beschriftung",
       r.istVoll(s.plaetze[0]) && s.plaetze[0].getLore()[0].includes("2 Stapel"));
const woanders = { location: { x: -20, y: 63, z: 8 }, typeId: "minecraft:grass_block", getComponent: () => undefined };
pruefe("woanders abstellen", r.abstellen(s, woanders, "Up") === true);
abgestellt = wesen.at(-1);
pruefe("mit demselben Inhalt", abgestellt.inhalt[3] === diamant && abgestellt.inhalt[9]?.typeId === "minecraft:bread");
pruefe("an der neuen Stelle", abgestellt.location.x === -19.5 && abgestellt.location.y === 64);
pruefe("die Struktur ist wieder geloescht", strukturen.size === 0);

// --- Abstellen ueber die eigene Komponente (onUseOn), wie im Spiel
const komponenten = {};
for (const f of gemerkt.ereignisse["system.startup"] ?? []) {
    f({ itemComponentRegistry: { registerCustomComponent: (n, d) => { komponenten[n] = d; } },
        blockComponentRegistry: { registerCustomComponent() { } } });
}
pruefe("Komponente fynn:rucksack angemeldet", typeof komponenten["fynn:rucksack"]?.onUseOn === "function");
const s4 = spieler([r.rucksackStapel()]);
const vorher = wesen.length;
system.currentTick = 500;
komponenten["fynn:rucksack"].onUseOn({ source: s4, block: boden, blockFace: "Up" });
pruefe("Antippen mit dem Rucksack stellt ihn ab", wesen.length === vorher + 1 && !s4.plaetze[0]);
s4.plaetze[0] = r.rucksackStapel();
const truhe = { location: { x: 8, y: 63, z: 8 }, typeId: "minecraft:chest", getComponent: (n) => (n === "minecraft:inventory" ? {} : undefined) };
system.currentTick = 520;
komponenten["fynn:rucksack"].onUseOn({ source: s4, block: truhe, blockFace: "Up" });
pruefe("auf einer Truhe (nicht geduckt): die Truhe geht auf, kein Abstellen", s4.plaetze[0]?.typeId === r.RUCKSACK);
const antippen = gemerkt.ereignisse["vorher.playerInteractWithBlock"][0];
const doppelt = { cancel: false, itemStack: s4.plaetze[0], isFirstEvent: true, player: s4, block: boden, blockFace: "Up" };
system.currentTick = 540;
komponenten["fynn:rucksack"].onUseOn({ source: s4, block: boden, blockFace: "Up" });
const nachEinem = wesen.length;
s4.plaetze[0] = r.rucksackStapel();
antippen(doppelt);
pruefe("beide Wege im selben Augenblick: nur einmal abgestellt", wesen.length === nachEinem && s4.plaetze[0]);

// --- Nur ein voller Rucksack
r.aufheben(s, abgestellt);
const zweiter = neuesWesen(r.ABGESTELLT, { x: 0.5, y: 64, z: 0.5 }, [new ItemStack("minecraft:stone", 64)]);
pruefe("schon einen vollen: der zweite volle bleibt stehen", r.aufheben(s, zweiter) === false && zweiter.gueltig);
const s2 = spieler([r.rucksackStapel("fynn:a", 3), r.rucksackStapel("fynn:b", 1), r.rucksackStapel()]);
gefallen.length = 0;
pruefe("zwei volle im Inventar: einer faellt herunter", r.nurEinVoller(s2) === 1 && gefallen.length === 1);
pruefe("der leere darf bleiben", s2.plaetze[2]?.typeId === r.RUCKSACK);
pruefe("leerer Rucksack im Rucksack bleibt, voller fliegt raus", (() => {
    const w = neuesWesen(r.ABGESTELLT, { x: 9.5, y: 64, z: 9.5 }, [r.rucksackStapel(), r.rucksackStapel("fynn:c", 2)]);
    const heraus = r.volleHeraus(w);
    return heraus === 1 && w.inhalt[0]?.typeId === r.RUCKSACK && !w.inhalt[1];
})());

// --- Auf dem Ruecken zeigen
const s3 = spieler([undefined, r.rucksackStapel()]);
pruefe("Rucksack im Inventar: auf den Ruecken", r.zeigeRuecken(s3, 7) && s3.animationen.at(-1) === "animation.fynn.rucksack_an");
pruefe("nichts geaendert: kein neues Signal", r.zeigeRuecken(s3, 8) === false);
s3.plaetze[1] = undefined;
pruefe("weggelegt: vom Ruecken", r.zeigeRuecken(s3, 9) && s3.animationen.at(-1) === "animation.fynn.rucksack_ab");

// --- Am Elch
function elch(zahm) {
    return { id: "elch1", typeId: r.ELCH, location: { x: 0, y: 64, z: 0 }, dimension, eig: {},
             getComponent: (n) => (n === "minecraft:is_tamed" && zahm ? {} : undefined),
             setProperty(k, v) { this.eig[k] = v; } };
}
const reiter = spieler([r.rucksackStapel("fynn:x", 4)]);
pruefe("wilder Elch nimmt keinen", r.anElch(reiter, elch(false)) === false && reiter.plaetze[0]);
const e1 = elch(true);
pruefe("zahmer Elch: festgemacht", r.anElch(reiter, e1) === true && e1.eig["fynn:taschen"] === 1 && !reiter.plaetze[0]);
reiter.plaetze[0] = r.rucksackStapel();
r.anElch(reiter, e1);
reiter.plaetze[0] = r.rucksackStapel();
pruefe("mehr als zwei gehen nicht", r.anElch(reiter, e1) === false && e1.eig["fynn:taschen"] === 2);
reiter.plaetze[0] = undefined;
r.vomElch(reiter, e1);
r.vomElch(reiter, e1);
const zurueck = reiter.plaetze.filter((x) => x);
pruefe("abnehmen: der volle kommt mit Inhalt zurueck",
       zurueck.some((x) => x.getDynamicProperty("fynn:inhalt") === "fynn:x") && e1.eig["fynn:taschen"] === 0);
reiter.plaetze.fill(undefined);
reiter.plaetze[0] = r.rucksackStapel("fynn:y", 7);
r.anElch(reiter, e1);
gefallen.length = 0;
gemerkt.ereignisse["entityDie"].at(-1)({ deadEntity: e1 });
pruefe("Elch stirbt: sein Rucksack faellt, mit Inhalt",
       gefallen.length === 1 && gefallen[0].getDynamicProperty("fynn:inhalt") === "fynn:y");

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
