// Obst: ansetzen, reifen, ernten, abfallen - ohne Spiel.
import { gemerkt } from "@minecraft/server";
const o = await import("./obst.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

function perm(typ, zustaende = {}) {
    return {
        type: { id: typ }, zustaende,
        getState(k) { return this.zustaende[k]; },
        withState(k, v) { return perm(typ, { ...this.zustaende, [k]: v }); },
    };
}
// Eine kleine Welt aus Bloecken.
const welt = new Map();
const schluessel = (o) => `${o.x},${o.y},${o.z}`;
const gefallen = [];
const toene = [];
const dimension = {
    getBlock(ort) {
        const k = schluessel(ort);
        return blockBei(ort, k);
    },
    spawnItem(i) { gefallen.push(i.typeId); },
    playSound(n) { toene.push(n); },
};
function blockBei(ort, k) {
    const p = welt.get(k) ?? perm("minecraft:air");
    return {
        typeId: p.type.id, permutation: p, isAir: p.type.id === "minecraft:air", dimension,
        above: () => dimension.getBlock({ x: ort.x, y: ort.y + 1, z: ort.z }),
        center: () => ort,
        setPermutation(neu) {
            const typ = neu.typ ?? neu.type?.id;
            welt.set(k, neu.typ ? perm(typ, neu.zustaende ?? {}) : neu);
        },
    };
}
function setze(ort, p) { welt.set(schluessel(ort), p); }

// --- Welche Blaetter tragen was
pruefe("Eiche traegt Aepfel", o.obstFuer({ typeId: "minecraft:oak_leaves", permutation: perm("x", { persistent_bit: false }) }) === "apfel");
pruefe("selbst gesetztes Laub traegt nichts", o.obstFuer({ typeId: "minecraft:oak_leaves", permutation: perm("x", { persistent_bit: true }) }) === undefined);
pruefe("Fichte traegt nichts", o.obstFuer({ typeId: "minecraft:spruce_leaves", permutation: perm("x", {}) }) === undefined);

// --- Ansetzen unter einem Blatt
setze({ x: 0, y: 70, z: 0 }, perm("minecraft:dark_oak_leaves", { persistent_bit: false }));
const spieler = { location: { x: 0.5, y: 70, z: 0.5 }, dimension };
let n = 0;
const wuerfe = [0.5, 0.5, 0.5, 0.0];          // Mitte der Suche, dann Glueck
const gesetzt = o.suche(spieler, () => wuerfe[n++ % wuerfe.length]);
const frucht = welt.get("0,69,0");
pruefe(`Suche setzt eine Bluete unter die Schwarzeiche (${gesetzt})`,
       frucht?.getState?.("fynn:sorte") === "pflaume" && frucht.getState("fynn:reife") === 0);

// --- Reifen
const block = dimension.getBlock({ x: 0, y: 69, z: 0 });
o.wachse(block, () => 0.1);
o.wachse(dimension.getBlock({ x: 0, y: 69, z: 0 }), () => 0.1);
o.wachse(dimension.getBlock({ x: 0, y: 69, z: 0 }), () => 0.1);
pruefe("nach drei Schritten reif", welt.get("0,69,0").getState("fynn:reife") === 3);
o.wachse(dimension.getBlock({ x: 0, y: 69, z: 0 }), () => 0.1);
pruefe("reif bleibt reif", welt.get("0,69,0").getState("fynn:reife") === 3);

// --- Ernten
const leiste = [];
const pfluecker = { onScreenDisplay: { setActionBar: (t) => leiste.push(t) } };
pruefe("reife Pflaume pfluecken", o.ernte(dimension.getBlock({ x: 0, y: 69, z: 0 }), pfluecker)
       && gefallen.includes("fynn:pflaume"));
pruefe("danach waechst eine neue kleine nach", welt.get("0,69,0").getState("fynn:reife") === 1);
pruefe("unreif: nichts, nur ein Hinweis", !o.ernte(dimension.getBlock({ x: 0, y: 69, z: 0 }), pfluecker)
       && leiste.at(-1).includes("nicht reif"));
pruefe("das Laub ist noch da", welt.get("0,70,0").type.id === "minecraft:dark_oak_leaves");

// --- Laub weg: Frucht faellt
welt.set("0,69,0", perm("fynn:obst", { "fynn:sorte": "apfel", "fynn:reife": 3 }));
welt.delete("0,70,0");
gefallen.length = 0;
pruefe("ohne Laub faellt sie ab", o.wachse(dimension.getBlock({ x: 0, y: 69, z: 0 })) === "ab"
       && gefallen.includes("minecraft:apple"));

pruefe("Blockkomponente angemeldet", (gemerkt.ereignisse["system.startup"] ?? []).length > 0);
const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
