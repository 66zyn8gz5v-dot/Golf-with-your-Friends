// Probe: Specht, Eichhoernchen, Singvogel, Schnecke - ohne Spiel.
import { gemerkt } from "@minecraft/server";
const k = await import("./kleintiere.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(!!ok); console.log(ok ? "ok  " : "FEHLER", was); }

// Eine kleine Welt: Bloecke nach Koordinaten, dazu die Wesen darin.
function welt(bloecke = {}) {
    const w = { bloecke, wesen: [], toene: [], teilchen: [], dinge: [] };
    w.dim = {
        getBlock: ({ x, y, z }) => {
            const schl = `${x},${y},${z}`;
            return { typeId: w.bloecke[schl] ?? (y < 64 ? "minecraft:dirt" : "minecraft:air"),
                     location: { x, y, z }, setType(t) { w.bloecke[schl] = t; } };
        },
        playSound: (n) => w.toene.push(n),
        spawnParticle: (n) => w.teilchen.push(n),
        spawnItem: (s, o) => w.dinge.push([s.typeId, s.amount, o]),
        getEntities: (f) => w.wesen.filter((e) => !f?.type || e.typeId === f.type)
            .filter((e) => !f?.families || f.families.some((fa) => (e.familien ?? []).includes(fa)))
            .filter((e) => !f?.location || Math.hypot(e.location.x - f.location.x, e.location.y - f.location.y,
                                                     e.location.z - f.location.z) <= f.maxDistance),
    };
    return w;
}
let nr = 0;
function tier(w, typeId, ort, extra = {}) {
    const t = { id: `t${++nr}`, typeId, location: { ...ort }, isValid: true, dimension: w.dim, eig: {}, ereignisse: [],
        dyn: {}, komp: {},
        triggerEvent(e) { this.ereignisse.push(e);
            if (e === "fynn:verstecken") this.eig["fynn:versteckt"] = true;
            if (e === "fynn:hervorkommen") this.eig["fynn:versteckt"] = false; },
        teleport(o) { this.location = { ...o }; },
        setProperty(n, v) { this.eig[n] = v; }, getProperty(n) { return this.eig[n]; },
        getDynamicProperty(n) { return this.dyn[n]; }, setDynamicProperty(n, v) { this.dyn[n] = v; },
        getComponent(n) { return this.komp[n]; }, ...extra };
    w.wesen.push(t);
    return t;
}
const nie = () => 0.99, immer = () => 0.0;

// --- Specht
{
    const w = welt({ "2,64,0": "minecraft:oak_log", "2,65,0": "minecraft:oak_log" });
    const s = tier(w, k.SPECHT, { x: 0.5, y: 64, z: 0.5 });
    pruefe("Specht: findet den Stamm neben sich", k.stammNeben(w.dim, s.location)?.x === 2);
    pruefe("Specht: haelt sich fest", k.beginneHacken(s, 100, immer) && s.eig["fynn:hackt"] === true
        && s.ereignisse.includes("fynn:festhalten"));
    pruefe("... an der Rinde, zum Stamm hin", Math.abs(s.location.x - (2.5 - 0.72)) < 1e-9 && Math.abs(s.location.z - 0.5) < 1e-9);
    k.hackTakt(100, immer);
    pruefe("... und haemmert", w.toene.includes("hit.wood"));
    k.hackTakt(100 + k.HACKEN.dauer[0] + 1, immer);
    pruefe("... nach einer Weile laesst er los und findet eine Larve",
        s.eig["fynn:hackt"] === false && s.ereignisse.includes("fynn:loslassen") && w.dinge.some(([n]) => n === k.LARVE));
    const w2 = welt();
    const s2 = tier(w2, k.SPECHT, { x: 0.5, y: 64, z: 0.5 });
    pruefe("Specht: ohne Baum kein Festhalten", !k.beginneHacken(s2, 1));
}

// --- Eichhoernchen: klettern
{
    const w = welt({ "0,64,2": "minecraft:birch_log", "0,65,2": "minecraft:birch_log", "0,66,2": "minecraft:birch_log" });
    const e = tier(w, k.EICHHOERNCHEN, { x: 0.5, y: 64, z: 0.5 });
    pruefe("Eichhoernchen: klettert los", k.beginneKlettern(e, 0, immer) && e.eig["fynn:klettert"] === true);
    let hoechstes = 0;
    for (let t = 2; t < 200; t += 2) { k.kletterTakt(t, immer); hoechstes = Math.max(hoechstes, e.location.y); }
    pruefe("... bis zur Krone hinauf", hoechstes >= 66);
    pruefe("... und wieder herunter, dann los", e.eig["fynn:klettert"] === false && e.location.y < 65);
}

// --- Eichhoernchen: fuettern und graben
{
    const w = welt({ "5,65,5": "minecraft:spruce_log" });
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) w.bloecke[`${x},63,${z}`] = "minecraft:grass_block";
    const e = tier(w, k.EICHHOERNCHEN, { x: 0.5, y: 64, z: 0.5 });
    k.gefuettert(e, 0, immer);
    k.nussTakt(10, immer);
    pruefe("Fuettern: erst ein Herz, noch keine Nuss", w.teilchen.includes("minecraft:heart_particle") && w.dinge.length === 0);
    k.nussTakt(100, immer);
    pruefe("... dann bringt es Nuesse", w.dinge.some(([n, a]) => n === k.NUSS && a >= 1));
    pruefe("Graben: meist nicht", k.grabTakt(e, 200, nie) === "ruht");
    pruefe("Graben: manchmal doch", k.grabTakt(e, 400, immer) === "graebt" && e.eig["fynn:graebt"] === true);
    pruefe("... und dann steht ein Setzling", k.grabTakt(e, 400 + k.GRABEN.dauer, immer) === "gepflanzt"
        && w.bloecke["0,64,0"]?.endsWith("_sapling") && e.eig["fynn:graebt"] === false);
    pruefe("... von der Baumart nebenan", w.bloecke["0,64,0"] === "minecraft:spruce_sapling");
    pruefe("Neben einem Setzling nicht noch einer", !k.freierPlatz(w.dim, { x: 1.5, y: 64, z: 0.5 }));
    e.dyn["fynn:vergraben"] = k.GRABEN.hoechstens;
    e.location = { x: 3.5, y: 64, z: 3.5 };
    pruefe("Jedes Eichhoernchen pflanzt hoechstens ein paar", k.grabTakt(e, 800, immer) === "ruht");
}

// --- Singvogel
{
    const w = welt();
    let gezaehmt = null;
    const vogel = tier(w, k.SINGVOGEL, { x: 0, y: 64, z: 0 });
    vogel.komp["minecraft:tameable"] = { tame(s) { gezaehmt = s; vogel.komp["minecraft:is_tamed"] = {}; }, tamedToPlayerId: "fynn" };
    vogel.komp["minecraft:variant"] = { value: 1 };
    const larven = { typeId: k.LARVE, amount: 3 };
    const spieler = { id: "fynn", typeId: "minecraft:player", selectedSlotIndex: 0, getGameMode: () => "Survival",
        leiste: null, onScreenDisplay: { setActionBar(x) { spieler.leiste = x; } },
        getComponent: () => ({ container: { getItem: () => larven, setItem: (i, d) => { larven.amount = d?.amount ?? 0; } } }) };
    pruefe("Larve: der Vogel wird sicher zahm", k.larveFuettern(vogel, spieler) && gezaehmt === spieler
        && vogel.ereignisse.includes("fynn:gezaehmt"));
    pruefe("... und die Larve ist verbraucht", larven.amount === 2);
    pruefe("Ohne Monster: kein Alarm", k.warnTakt(vogel, 20) === undefined);
    tier(w, "minecraft:zombie", { x: 6, y: 64, z: 0 }, { familien: ["monster", "zombie"] });
    pruefe("Ein Zombie kommt: der Vogel warnt", k.warnTakt(vogel, 40) === "minecraft:zombie" && vogel.eig["fynn:warnt"] === true
        && w.toene.includes("mob.parrot.idle"));
    pruefe("... dann erst einmal Ruhe", k.warnTakt(vogel, 60) === undefined);
    k.warnTakt(vogel, 40 + k.WARNEN.dauer);
    pruefe("... und er plustert sich wieder ab", vogel.eig["fynn:warnt"] === false);
    pruefe("Der Name nach der Art", k.vogelName(vogel) === "Blaumeise");
    const wild = tier(w, k.SINGVOGEL, { x: 30, y: 64, z: 0 });
    pruefe("Ein wilder Vogel warnt nicht", k.warnTakt(wild, 100) === undefined);
}

// --- Schnecke
{
    const w = welt();
    const s = tier(w, k.SCHNECKE, { x: 0, y: 64, z: 0 });
    pruefe("Schnecke allein: kriecht", k.schneckenTakt(s, 0) === "kriecht");
    const leise = tier(w, "minecraft:player", { x: 2, y: 64, z: 0 }, { isSneaking: true });
    pruefe("Wer schleicht, stoert sie nicht", k.schneckenTakt(s, 10) === "kriecht");
    leise.isSneaking = false;
    pruefe("Wer laeuft, vor dem versteckt sie sich", k.schneckenTakt(s, 20) === "versteckt sich" && s.eig["fynn:versteckt"]);
    leise.location = { x: 20, y: 64, z: 0 };
    pruefe("Kurz danach bleibt sie noch drin", k.schneckenTakt(s, 40) === "bleibt drin");
    pruefe("Nach drei Sekunden Ruhe kommt sie heraus", k.schneckenTakt(s, 90) === "kommt heraus" && !s.eig["fynn:versteckt"]);
}

pruefe("Das Skript hoert auf Ankommen und Anfassen",
    gemerkt.ereignisse.dataDrivenEntityTrigger?.length === 1 && gemerkt.ereignisse.playerInteractWithEntity?.length === 1);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
