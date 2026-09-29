// Probe: der Sandwurm und der Sandklopfer - ohne Spiel.
import { gemerkt } from "@minecraft/server";
const w = await import("./sandwurm.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(!!ok); console.log(ok ? "ok  " : "FEHLER", was); }

function welt() {
    const d = { wesen: [], toene: [], teilchen: [], neu: [] };
    d.dim = {
        id: "minecraft:overworld",
        getBlock: ({ y }) => ({ typeId: y < 64 ? "minecraft:sand" : "minecraft:air" }),
        playSound: (n) => d.toene.push(n),
        spawnParticle: (n) => d.teilchen.push(n),
        spawnEntity: (typ, ort) => { d.neu.push([typ, ort]); },
        getEntities: (q) => d.wesen.filter((e) => (!q?.type || e.typeId === q.type) && (!q?.location
            || Math.hypot(e.location.x - q.location.x, e.location.z - q.location.z) <= q.maxDistance)),
    };
    return d;
}
let nr = 0;
function wesen(d, typeId, ort, extra = {}) {
    const e = { id: `e${++nr}`, typeId, location: { ...ort }, isValid: true, dimension: d.dim, eig: {}, ereignisse: [],
        schaden: [], stoesse: [], schuebe: [],
        triggerEvent(n) { this.ereignisse.push(n); }, getProperty(n) { return this.eig[n]; },
        teleport(o) { this.location = { ...o }; },
        applyDamage(m) { this.schaden.push(m); }, applyKnockback(a, b) { this.stoesse.push([a, b]); },
        applyImpulse(i) { this.schuebe.push(i); },
        onScreenDisplay: { leiste: "", setActionBar(t) { this.leiste = t; } },
        getComponent: () => ({ container: { getItem: () => undefined, setItem() {} },
                               getEquipment: () => undefined }),
        getGameMode: () => "Survival", ...extra };
    d.wesen.push(e);
    return e;
}

{
    const d = welt();
    const wurm = wesen(d, w.WURM, { x: 0, y: 64, z: 0 }, { eig: { "fynn:unten": true } });
    const leise = wesen(d, "minecraft:player", { x: 2, y: 64, z: 0 }, { isSneaking: true });
    pruefe("Unter dem Sand: Staub und Beben", w.wurmTakt(wurm, [leise], 0) === "unten"
        && d.teilchen.includes("fynn:sandstaub") && leise.onScreenDisplay.leiste.includes("bebt"));
    pruefe("Wer schleicht, den hoert er nicht", !w.hoert(leise) && w.wurmTakt(wurm, [leise], 5) === "unten");
    const laut = wesen(d, "minecraft:player", { x: 10, y: 64, z: 3 }, { isSneaking: false });
    pruefe("Wer zu weit weg ist, bleibt verschont", w.wurmTakt(wurm, [laut], 10) === "unten");
    laut.location = { x: 2.5, y: 64, z: 1 };
    pruefe("Wer laut ist und nah: Er bricht hervor", w.wurmTakt(wurm, [laut], 15) === "taucht auf"
        && wurm.ereignisse.includes("fynn:auftauchen"));
    pruefe("... direkt unter ihm", wurm.location.x === 2.5 && wurm.location.z === 1);
    pruefe("... beisst zu und schleudert hoch", laut.schaden[0] === w.BISS && laut.stoesse.length === 1);
    pruefe("... und bruellt", d.toene.includes("mob.ravager.roar"));
    let t = 15 + w.ZEIT.auf;
    pruefe("Nach dem Auftauchen steht er", w.wurmTakt(wurm, [laut], t) === "oben" && wurm.ereignisse.includes("fynn:steht"));
    pruefe("... eine Weile", w.wurmTakt(wurm, [laut], t + 50) === "oben");
    t += w.ZEIT.oben[1];
    pruefe("Dann taucht er ab", w.wurmTakt(wurm, [laut], t) === "taucht ab" && wurm.ereignisse.includes("fynn:abtauchen"));
    t += w.ZEIT.ab;
    pruefe("... und ist wieder unter dem Sand", w.wurmTakt(wurm, [laut], t) === "versunken"
        && wurm.ereignisse.includes("fynn:versunken"));
    pruefe("Gleich danach greift er nicht wieder an", w.wurmTakt(wurm, [laut], t + 5) === "unten");
    pruefe("... erst nach einer Pause", w.wurmTakt(wurm, [laut], t + w.ZEIT.pause) === "taucht auf");
}

{
    const d = welt();
    const s = wesen(d, "minecraft:player", { x: 0, y: 64, z: 0 });
    const kreativ = wesen(d, "minecraft:player", { x: 0, y: 64, z: 0 }, { getGameMode: () => "Creative" });
    pruefe("Im Kreativmodus hoert er niemanden", !w.hoert(kreativ));
    pruefe("Der Klopfer setzt sich auf Sand", w.klopferSetzen(s, 1000));
    const fern = wesen(d, w.WURM, { x: 40, y: 64, z: 0 }, { eig: { "fynn:unten": true } });
    w.klopfTakt(1000);
    pruefe("... er klopft", d.toene.includes("note.bd"));
    pruefe("... und zieht Wuermer zu sich", fern.schuebe.length === 1 && fern.schuebe[0].x < 0);
    fern.location = { x: 2, y: 64, z: 0 };
    w.klopfTakt(1005);
    pruefe("Erreicht ihn einer, bricht er dort hervor", fern.ereignisse.includes("fynn:auftauchen"));
    const d2 = welt();
    const s2 = wesen(d2, "minecraft:player", { x: 100, y: 64, z: 0 });
    w.klopferSetzen(s2, 2000);
    w.klopfTakt(2000 + w.KLOPFEN.locken - 5);
    pruefe("Ohne Wurm in der Naehe: erst nichts", d2.neu.length === 0);
    w.klopfTakt(2000 + w.KLOPFEN.locken);
    pruefe("... dann lockt er einen an", d2.neu.length === 1 && d2.neu[0][0] === w.WURM);
    w.klopfTakt(2000 + w.KLOPFEN.locken + 100);
    pruefe("... aber nur einen", d2.neu.length === 1);
    const luft = { ...welt(), };
    luft.dim.getBlock = () => ({ typeId: "minecraft:grass_block" });
    const s3 = wesen(luft, "minecraft:player", { x: 0, y: 64, z: 0 });
    pruefe("Auf Gras wirkt er nicht", !w.klopferSetzen(s3, 3000));
}

pruefe("Das Skript hoert auf den Klopfer", gemerkt.ereignisse.itemUse?.length >= 1);
const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
