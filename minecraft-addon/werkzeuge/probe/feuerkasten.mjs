// Der Feuerkasten ohne Fenster: Kohle in die Hand, antippen, brennt.
// Und wieder aus, wenn die Zeit um ist.
import { gemerkt, system } from "@minecraft/server";
await import("./main.js");

const FEUERKASTEN = "fynn:feuerkasten";
const TIEGEL = "fynn:schmelztiegel";
const toene = [];
let zustandKasten = { "fynn:brennt": "aus" };
let zustandTiegel = { "fynn:brennt": "aus" };

function macheBlock(typ, zustand, ort) {
    const block = {
        typeId: typ, location: ort,
        permutation: {
            getAllStates: () => zustand,
            getState: (n) => zustand[n],
            withState: (n, v) => { zustand[n] = v; return block.permutation; },
        },
        setPermutation: () => {},
    };
    block.dimension = {
        id: "minecraft:overworld",
        getBlock: () => block,
        playSound: (n) => toene.push(n),
    };
    return block;
}
const kasten = macheBlock(FEUERKASTEN, zustandKasten, { x: 0, y: 70, z: 0 });
const tiegel = macheBlock(TIEGEL, zustandTiegel, { x: 0, y: 71, z: 0 });
kasten.above = () => tiegel;

let hand = { typeId: "minecraft:coal", amount: 3, clone() { return { ...this }; } };
const balken = [];
const spieler = {
    getGameMode: () => "survival",
    onScreenDisplay: { setActionBar: (t) => balken.push(t.replace(/§./g, "")) },
    getComponent: (n) => (n === "minecraft:equippable" ? {
        getEquipmentSlot: () => ({ setItem: (s) => { hand = s ? { ...s } : null; } }),
    } : undefined),
};

const antippen = gemerkt.ereignisse["playerInteractWithBlock"];
const takt = gemerkt.takte.filter((t) => typeof t[0] === "function").pop()[0];

console.log("Zustand am Anfang:", zustandKasten["fynn:brennt"], "| Tiegel:", zustandTiegel["fynn:brennt"]);

console.log("\n>>> ohne Kohle antippen");
const leer = { typeId: "minecraft:stick", amount: 1 };
for (const f of antippen) f({ block: kasten, player: spieler, beforeItemStack: leer });
console.log("   Anzeige:", balken.at(-1));

console.log("\n>>> mit Kohle antippen");
for (const f of antippen) f({ block: kasten, player: spieler, beforeItemStack: hand });
console.log("   Anzeige:", balken.at(-1));
console.log("   Kasten:", zustandKasten["fynn:brennt"], "| Tiegel:", zustandTiegel["fynn:brennt"]);
console.log("   in der Hand:", JSON.stringify(hand));
console.log("   Töne:", toene.join(","));

console.log("\n>>> nachlegen, waehrend es brennt");
for (const f of antippen) f({ block: kasten, player: spieler, beforeItemStack: hand });
console.log("   Anzeige:", balken.at(-1), "(muss mehr als 60 sein)");

console.log("\n>>> die Zeit ablaufen lassen");
system.currentTick += 2600;
takt();
console.log("   Kasten:", zustandKasten["fynn:brennt"], "| Tiegel:", zustandTiegel["fynn:brennt"]);

const gut = zustandKasten["fynn:brennt"] === "aus" && zustandTiegel["fynn:brennt"] === "aus"
    && balken.some((b) => b.includes("120"));
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
