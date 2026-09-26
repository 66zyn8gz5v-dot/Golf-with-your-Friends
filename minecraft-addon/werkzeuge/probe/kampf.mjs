// Wirbelschlag, Schattensprung und die gesperrte Zweithand, ohne Spiel.
import { gemerkt, system, world } from "@minecraft/server";
await import("./main.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

// Spaeter Geplantes sammeln und von Hand ausfuehren.
const spaeter = [];
system.runTimeout = (f) => spaeter.push(f);
const abarbeiten = () => { while (spaeter.length) spaeter.shift()(); };

const toene = [], partikel = [], fallen = [];
let umgebung = [], strahl = [];
const dimension = {
    getEntities: (o) => umgebung.filter((e) => !o.excludeTypes?.includes(e.typeId)),
    getEntitiesFromRay: (_, __, o) => strahl.filter((t) => !o.excludeTypes?.includes(t.entity.typeId)),
    spawnParticle: (n) => partikel.push(n),
    playSound: (n) => toene.push(n),
    spawnItem: (i) => fallen.push(i),
};
function wesen(id, typeId, ort, blick = { x: 0, y: 0, z: 1 }) {
    return {
        id, typeId, location: ort, isValid: true, schaden: 0, stoss: null,
        getViewDirection: () => blick,
        applyDamage(n) { this.schaden += n; },
        applyKnockback(h, v) { this.stoss = { h, v }; },
    };
}

const eigenschaften = new Map([["fynn:rolle", "ritter"], ["fynn:kraft", 100]]);
const leiste = [];
let zweithand = null;
const eingesammelt = [];
const spieler = {
    ...wesen("fynn", "minecraft:player", { x: 0, y: 64, z: 0 }, { x: 0, y: 0, z: 1 }),
    dimension, isSneaking: false, inHand: "minecraft:iron_sword", gesprungen: null,
    getHeadLocation: () => ({ x: 0, y: 65.6, z: 0 }),
    getDynamicProperty: (k) => eigenschaften.get(k),
    setDynamicProperty: (k, v) => eigenschaften.set(k, v),
    addEffect() {}, removeEffect() {},
    onScreenDisplay: { setActionBar: (t) => leiste.push(t.replace(/§./g, "")), setTitle() {} },
    tryTeleport(ort, o) { this.gesprungen = { ort, o }; return true; },
    getComponent(n) {
        if (n === "minecraft:equippable") return {
            getEquipment: (slot) => (slot === "Mainhand" ? { typeId: this.inHand } : zweithand),
            setEquipment: (slot, item) => { if (slot === "Offhand") zweithand = item ?? null; },
        };
        if (n === "minecraft:inventory") return { container: { addItem: (i) => { eingesammelt.push(i); } } };
    },
};
world.getAllPlayers = () => [spieler];

const jedenTick = gemerkt.takte.filter((t) => t[1] === 1).map((t) => t[0]);
const halbSekunde = gemerkt.takte.filter((t) => t[1] === 10).map((t) => t[0]);
// Kraft auffuellen, wie es das Spiel tut: die Runde der Rollen laufen lassen.
const rollenRunde = gemerkt.takte.filter((t) => t[1] === 5).map((t) => t[0]);
const auffuellen = () => { for (let i = 0; i < 250; i++) for (const f of rollenRunde) f(); };
function tick(n = 1) { for (let i = 0; i < n; i++) { system.currentTick += 1; for (const f of jedenTick) f(); } }
system.currentTick = 100;

// --- Ritter: Wirbelschlag
const zombie = wesen("z1", "minecraft:zombie", { x: 2, y: 64, z: 0 });
const skelett = wesen("s1", "minecraft:skeleton", { x: 0, y: 64, z: -3 });
const freund = wesen("p2", "minecraft:player", { x: 1, y: 64, z: 1 });
umgebung = [spieler, zombie, skelett, freund];

spieler.isSneaking = true; tick(10); spieler.isSneaking = false; tick(1);
pruefe("kurz geduckt: kein Wirbel", zombie.schaden === 0);

spieler.isSneaking = true; tick(20);
pruefe("voll geladen: Klang und Hinweis", toene.includes("random.orb") && leiste.at(-1).includes("Wirbelschlag bereit"));
spieler.isSneaking = false; tick(1);
pruefe(`Wirbel trifft Zombie und Skelett (${zombie.schaden}, ${skelett.schaden})`, zombie.schaden === 7 && skelett.schaden === 7);
pruefe("den Mitspieler nicht, sich selbst auch nicht", freund.schaden === 0 && spieler.schaden === 0);
pruefe(`Zombie fliegt nach aussen (x ${zombie.stoss?.h.x.toFixed(1)})`, zombie.stoss?.h.x > 0);
pruefe("Skelett fliegt nach Norden", skelett.stoss?.h.z < 0);
pruefe(`kostet 40 Ausdauer (100 -> ${eigenschaften.get("fynn:kraft")})`, eigenschaften.get("fynn:kraft") === 60);
pruefe("Funkenring", partikel.filter((p) => p === "minecraft:critical_hit_emitter").length === 16);

// --- Ohne die Rolle laedt nichts, und es kommt auch kein Hinweis.
eigenschaften.set("fynn:rolle", "magier");
const hinweiseVorher = leiste.filter((z) => z.includes("bereit") || z.includes("nur ein")).length;
zombie.schaden = 0; system.currentTick += 40;
spieler.isSneaking = true; tick(30); spieler.isSneaking = false; tick(1);
pruefe("Magier mit Schwert: kein Wirbel", zombie.schaden === 0);
pruefe("und kein Hinweis beim Ducken",
       leiste.filter((z) => z.includes("bereit") || z.includes("nur ein")).length === hinweiseVorher);

// --- Assassine: Schattensprung hinter den Zombie
eigenschaften.set("fynn:rolle", "assassine");
spieler.inHand = "fynn:stahldolche";
const ziel = wesen("z2", "minecraft:zombie", { x: 0, y: 64, z: 6 }, { x: 0, y: 0, z: -1 });  // schaut uns an
strahl = [{ entity: ziel, distance: 6 }];
system.currentTick += 40;
spieler.isSneaking = true; tick(15); spieler.isSneaking = false; tick(1);
const sprung = spieler.gesprungen;
pruefe(`springt hinter das Ziel (z ${sprung?.ort.z.toFixed(1)})`, sprung && sprung.ort.z > 6.5 && sprung.o.checkForBlocks);
pruefe("und schaut es an", sprung?.o.facingLocation.z === 6);
pruefe("der Stich kommt erst nach der Ankunft", ziel.schaden === 0 && spaeter.length === 1);
abarbeiten();
pruefe(`Hinterhalt: ${ziel.schaden} Schaden`, ziel.schaden === 10);
pruefe("Rauch und Portalklang", partikel.includes("minecraft:basic_smoke_particle") && toene.includes("mob.endermen.portal"));

// Wand hinter dem Ziel: stehen bleiben, halber Schaden.
spieler.tryTeleport = () => false;
auffuellen();
ziel.schaden = 0; system.currentTick += 40;
spieler.isSneaking = true; tick(15); spieler.isSneaking = false; tick(1); abarbeiten();
pruefe(`Wand dahinter: von vorn, ${ziel.schaden} Schaden`, ziel.schaden === 5);

// Kein Ziel: kurzer Satz nach vorn.
strahl = []; spieler.stoss = null; system.currentTick += 40;
auffuellen();
spieler.isSneaking = true; tick(15); spieler.isSneaking = false; tick(1);
pruefe("ohne Ziel: Satz nach vorn", spieler.stoss?.h.z > 1);
// Noch einer, dann sind nur 30 uebrig.
system.currentTick += 40;
spieler.isSneaking = true; tick(15); spieler.isSneaking = false; tick(1);

// Zu wenig Schatten: Hinweis, kein Sprung.
spieler.stoss = null; system.currentTick += 40;
spieler.isSneaking = true; tick(15);
pruefe("zu wenig Kraft: Hinweis", leiste.at(-1).includes("Zu wenig Schatten"));
spieler.isSneaking = false; tick(1);
pruefe("und kein Sprung", spieler.stoss === null);

// --- Zweithand
zweithand = { typeId: "minecraft:shield" };
for (const f of halbSekunde) f();
pruefe("Schild aus der Zweithand ins Inventar", zweithand === null && eingesammelt[0]?.typeId === "minecraft:shield");
pruefe("mit Hinweis", leiste.at(-1).includes("beide Hände"));
spieler.inHand = "minecraft:iron_sword";
zweithand = { typeId: "minecraft:shield" };
for (const f of halbSekunde) f();
pruefe("mit dem Schwert bleibt der Schild", zweithand?.typeId === "minecraft:shield");

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
