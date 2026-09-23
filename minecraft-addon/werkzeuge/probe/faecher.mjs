// Der Ofen mit echten Faechern: Kohle ins Fach des Feuerkastens, Gold und
// Silber in den Tiegel - und dann zusehen, ob der Takt seine Arbeit tut.
import { gemerkt, system, welten, world, ItemStack } from "@minecraft/server";
await import("./main.js");

const FEUERKASTEN = "fynn:feuerkasten";
const TIEGEL = "fynn:schmelztiegel";
const toene = [];

function machFach(groesse) {
    const plaetze = new Array(groesse).fill(undefined);
    return {
        size: groesse,
        getItem: (i) => plaetze[i],
        setItem: (i, s) => { plaetze[i] = s; },
        inhalt: () => plaetze.map((s) => s ? `${s.amount} x ${s.typeId}` : "-"),
    };
}

function machBlock(typ, ort, fach, zustand = {}) {
    const block = {
        typeId: typ, location: ort,
        getComponent: (n) => (n === "minecraft:inventory" ? { container: fach } : undefined),
        permutation: {
            getState: (n) => zustand[n],
            getAllStates: () => zustand,
            withState: (n, v) => { zustand[n] = v; return block.permutation; },
        },
        setPermutation: () => {},
        center: () => ort,
    };
    block.dimension = {
        id: "minecraft:overworld",
        getBlock: () => block,
        spawnItem: () => {},
        playSound: (n) => toene.push(n),
    };
    block.above = () => tiegel;
    block.below = () => kasten;
    return block;
}

const kastenFach = machFach(1);
const tiegelFach = machFach(3);
const kasten = machBlock(FEUERKASTEN, { x: 0, y: 70, z: 0 }, kastenFach, { "fynn:brennt": false });
const tiegel = machBlock(TIEGEL, { x: 0, y: 71, z: 0 }, tiegelFach, { "fynn:brennt": false });

welten.set("minecraft:overworld", {
    getBlock: (o) => (o.y === 70 ? kasten : o.y === 71 ? tiegel : undefined),
});

// Beide Oefen anmelden, so wie es das Setzen tun wuerde.
for (const f of gemerkt.ereignisse["playerPlaceBlock"]) f({ block: kasten });
for (const f of gemerkt.ereignisse["playerPlaceBlock"]) f({ block: tiegel });

// Der Sekundentakt der Oefen ist der letzte, der angemeldet wurde.
const takte = gemerkt.takte.filter((t) => typeof t[0] === "function");
const ofenTakt = takte[takte.length - 1][0];
const lauf = (n = 1) => { for (let i = 0; i < n; i++) { ofenTakt(); system.currentTick += 20; } };

console.log("Fach des Feuerkastens:", kastenFach.inhalt());
kastenFach.setItem(0, new ItemStack("minecraft:coal", 3));
console.log("Kohle hineingelegt:   ", kastenFach.inhalt());

lauf();
console.log("nach einer Sekunde:   ", kastenFach.inhalt(), "| brennt:", kasten.permutation.getState("fynn:brennt"));

// Der Tiegel glueht jetzt, weil unten gefeuert wird.
tiegel.permutation.withState("fynn:brennt", true);
tiegelFach.setItem(0, new ItemStack("minecraft:gold_ingot", 2));
tiegelFach.setItem(1, new ItemStack("fynn:silberbarren", 2));
console.log("\nFach des Tiegels:     ", tiegelFach.inhalt());

lauf();
console.log("nach einer Sekunde:   ", tiegelFach.inhalt(), "| Toene:", toene.join(","));
lauf(7);
console.log("sieben Sekunden spaeter:", tiegelFach.inhalt());
lauf(8);
console.log("nochmal acht Sekunden: ", tiegelFach.inhalt());

const elektrum = tiegelFach.inhalt().join(" ").includes("fynn:elektrumbarren");
console.log("\nElektrum liegt im Fach:", elektrum ? "ja" : "NEIN - da stimmt etwas nicht");
if (!elektrum) process.exit(1);
