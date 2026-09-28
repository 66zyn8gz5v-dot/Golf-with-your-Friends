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

// --- Hai: Anlauf mit Beschleunigung
function hai(ziel) {
    const h = { id: "hai1", location: { x: 0, y: 50, z: 0 }, isInWater: true, isValid: true, target: ziel,
        eig: {}, schuebe: [], dimension: { spawnParticle() { }, playSound() { } },
        setProperty(k, v) { this.eig[k] = v; }, getVelocity: () => ({ x: 0, y: 0, z: 0 }),
        applyImpulse(i) { this.schuebe.push(Math.hypot(i.x, i.y, i.z)); } };
    return h;
}
const beute = { location: { x: 10, y: 50, z: 0 }, isValid: true };
const h1 = hai(beute);
pruefe("Ziel in 10 Bloecken: Anlauf", t.haiTakt(h1, 100) === "los" && h1.eig["fynn:sturm"] === true);
for (let i = 1; i <= 6; i++) t.haiTakt(h1, 100 + i);
pruefe(`er wird schneller (${h1.schuebe.map((x) => x.toFixed(3)).join(" < ")})`,
    h1.schuebe.length === 6 && h1.schuebe.every((x, i) => i === 0 || x > h1.schuebe[i - 1]));
beute.location = { x: 1, y: 50, z: 0 };
pruefe("angekommen: Sturm vorbei, Maul zu", t.haiTakt(h1, 107) === "ende" && h1.eig["fynn:sturm"] === false);
pruefe("gleich danach: Pause", t.haiTakt(h1, 110) === "pause");
const h2 = hai({ location: { x: 2, y: 50, z: 0 }, isValid: true });
h2.id = "hai2";
pruefe("Ziel zu nah: kein Anlauf, er beisst einfach", t.haiTakt(h2, 100) === "wartet");
const h3 = hai(beute);
h3.id = "hai3"; h3.isInWater = false;
pruefe("an Land: kein Anlauf", t.haiTakt(h3, 100) === "an_land");

// --- Braunbaer: Aufgaben und die Baerenmutter
function baerBei(bloecke, id = "baer1") {
    const b = { id, location: { x: 0.5, y: 64, z: 0.5 }, isValid: true, eig: {}, wirkungen: [], toene: [], gegenstaende: [],
        setProperty(k, v) { this.eig[k] = v; }, addEffect(n) { this.wirkungen.push(n); }, removeEffect() { },
        setRotation(r) { this.blick = r.y; }, triggerEvent(n) { this.ereignis = n; },
        getComponent: () => undefined };
    b.dimension = {
        getBlock: ({ x, y, z }) => {
            const typ = bloecke[`${x},${y},${z}`];
            return typ ? { typeId: typ, location: { x, y, z }, permutation: { withState: (n, w) => ({ n, w }) },
                setPermutation(p) { b.gesetzt = p; } } : { typeId: "minecraft:air", location: { x, y, z } };
        },
        playSound: (n) => b.toene.push(n), spawnParticle() { },
        spawnItem: (i) => b.gegenstaende.push(i.typeId),
    };
    return b;
}
const imWald = baerBei({ "1,65,0": "minecraft:bee_nest", "-1,64,1": "minecraft:sweet_berry_bush", "0,63,2": "minecraft:water" });
pruefe("am Bienennest: Honig geht vor Beeren und Wasser", t.aufgabeAm(imWald).art === "honig");
pruefe("Aufgabe beginnt: aufgerichtet (fynn:tun 1), steht still", t.beginneAufgabe(imWald, 1000) === "honig"
    && imWald.eig["fynn:tun"] === 1 && imWald.wirkungen.includes("slowness"));
pruefe("waehrenddessen summen die Bienen", t.aufgabeTakt(imWald, 1040) === "honig" && imWald.toene.includes("mob.bee.aggressive"));
pruefe("fertig: Nest leer, gefressen", t.aufgabeTakt(imWald, 1085) === "fertig:honig" && imWald.gesetzt?.n === "honey_level"
    && imWald.eig["fynn:tun"] === 0 && imWald.toene.includes("random.eat"));
const amFluss = baerBei({ "1,63,1": "minecraft:water" }, "baer2");
pruefe("am Wasser: angeln (fynn:tun 3)", t.beginneAufgabe(amFluss, 2000) === "angeln" && amFluss.eig["fynn:tun"] === 3);
pruefe("ein Lachs fliegt ans Ufer", t.aufgabeTakt(amFluss, 2125, () => 0.1) === "fertig:angeln:lachs_am_ufer"
    && amFluss.gegenstaende.includes("minecraft:salmon"));
pruefe("nichts in der Naehe: keine Aufgabe", t.beginneAufgabe(baerBei({}, "baer3"), 100) === null);

const mama = baerBei({}, "mama");
const wanderer = { location: { x: 10, y: 64, z: 0.5 } };
pruefe("ohne Junge: ruhig, auch wenn jemand kommt", t.mutterTakt(mama, 100, [wanderer], false) === "ruhig");
pruefe("mit Jungen, Spieler in 10 Bloecken: sie warnt (aufgerichtet, bruellt)", t.mutterTakt(mama, 100, [wanderer], true) === "warnt"
    && mama.eig["fynn:tun"] === 4 && mama.toene.includes("mob.polarbear.warning"));
pruefe("er bleibt auf Abstand: sie beobachtet nur", t.mutterTakt(mama, 120, [wanderer], true) === "beobachtet" && !mama.ereignis);
wanderer.location = { x: 5, y: 64, z: 0.5 };
pruefe("er kommt naeher als sieben Bloecke: Angriff", t.mutterTakt(mama, 140, [wanderer], true) === "greift an"
    && mama.ereignis === "fynn:baerenmutter");

// --- Walsprung
const platsch = [];
function springwal() {
    return { id: "wal1", location: { x: 0, y: 58, z: 0 }, isInWater: true, isValid: true, eig: {}, schub: null,
        getComponent: () => undefined, getViewDirection: () => ({ x: 0, y: 0, z: 1 }),
        setProperty(k, v) { this.eig[k] = v; }, applyImpulse(i) { this.schub = i; },
        dimension: { getBlock: ({ y }) => (y >= 60 ? { isAir: true, typeId: "minecraft:air" } : { isAir: false, typeId: "minecraft:water" }),
            playSound: (n) => platsch.push(n), spawnParticle() { }, getEntities: () => [] } };
}
const w1 = springwal();
pruefe("dicht unter der Oberflaeche, Glueck: er springt", t.walTakt(w1, 100, () => 0.001) === "springt"
    && w1.eig["fynn:sprung"] === true && w1.schub.y > 1);
w1.isInWater = false;
pruefe("in der Luft", t.walTakt(w1, 110) === "fliegt");
w1.isInWater = true;
pruefe("zurueck im Wasser: es klatscht", t.walTakt(w1, 150) === "klatscht" && platsch.includes("random.splash")
    && w1.eig["fynn:sprung"] === false);
pruefe("danach eine lange Pause", t.walTakt(w1, 200, () => 0.001) === "schwimmt");
const tief = springwal();
tief.id = "wal2";
tief.dimension.getBlock = () => ({ isAir: false, typeId: "minecraft:water" });
pruefe("tief unten: kein Sprung", t.walTakt(tief, 100, () => 0.001) === "schwimmt");

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
