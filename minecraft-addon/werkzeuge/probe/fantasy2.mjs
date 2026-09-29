// Probe: Glutskorpion, Kristallspinne, Irrlicht - ohne Spiel.
import { gemerkt } from "@minecraft/server";
const f = await import("./fantasy2.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(!!ok); console.log(ok ? "ok  " : "FEHLER", was); }

function welt(bloecke = {}) {
    const w = { bloecke, dinge: [], neu: [], toene: [], teilchen: [] };
    w.dim = {
        getBlock: ({ x, y, z }) => {
            const s = `${x},${y},${z}`;
            return { typeId: w.bloecke[s] ?? (y < 64 ? "minecraft:grass_block" : "minecraft:air"), location: { x, y, z },
                     setType(t) { w.bloecke[s] = t; }, setPermutation(p) { w.bloecke[s] = p.typ; } };
        },
        spawnItem: (st, o) => w.dinge.push([st.typeId, st.amount]),
        spawnEntity: (t) => w.neu.push(t),
        playSound: (n) => w.toene.push(n),
        spawnParticle: (n) => w.teilchen.push(n),
    };
    return w;
}
let nr = 0;
function wesen(w, typeId, ort, extra = {}) {
    return { id: `w${++nr}`, typeId, isValid: true, location: { ...ort }, dimension: w.dim, eig: {}, ereignisse: [],
        schuebe: [], brand: 0, getGameMode: () => "Survival",
        setOnFire(s) { this.brand = s; }, setProperty(n, v) { this.eig[n] = v; }, getProperty(n) { return this.eig[n]; },
        triggerEvent(n) { this.ereignisse.push(n); }, applyImpulse(i) { this.schuebe.push(i); },
        onScreenDisplay: { leiste: "", setActionBar(t) { this.leiste = t; } }, ...extra };
}

// Skorpion
{
    const w = welt();
    const s = wesen(w, "minecraft:player", { x: 0, y: 64, z: 0 });
    pruefe("Der Stich des Glutskorpions brennt", f.skorpionStich(s) && s.brand > 0);
}

// Spinne
{
    const w = welt();
    const s = wesen(w, "minecraft:player", { x: 5, y: 64, z: 0 });
    const sp = wesen(w, f.SPINNE, { x: 0, y: 64, z: 0 }, { target: undefined });
    pruefe("Ohne Ziel kein Netz", !f.netzTakt(sp, 0));
    sp.target = s;
    pruefe("Mit Ziel: ein Netz um die Fuesse", f.netzTakt(sp, 10) && w.bloecke["5,64,0"] === "minecraft:web"
        && sp.eig["fynn:spinnt"] === true);
    pruefe("... dann eine Pause", !f.netzTakt(sp, 20));
    f.netzTakt(sp, 10 + f.NETZ.dauer);
    pruefe("... und sie hoert auf zu spinnen", sp.eig["fynn:spinnt"] === false);
    f.netzeTakt(10 + f.NETZ.halten);
    pruefe("Das Netz vergeht nach ein paar Sekunden", w.bloecke["5,64,0"] === "minecraft:air");
    const kreativ = wesen(w, "minecraft:player", { x: 3, y: 64, z: 0 }, { getGameMode: () => "Creative" });
    const sp2 = wesen(w, f.SPINNE, { x: 0, y: 64, z: 0 }, { target: kreativ });
    pruefe("Im Kreativmodus kein Netz", !f.netzTakt(sp2, 0));
}

// Irrlicht
{
    const w = welt();
    const i = wesen(w, f.IRRLICHT, { x: 0, y: 65, z: 0 });
    pruefe("Allein wartet es", f.irrlichtTakt(i, []) === "wartet");
    const s = wesen(w, "minecraft:player", { x: 3, y: 64, z: 0 });
    pruefe("Kommt man nah, weicht es aus", f.irrlichtTakt(i, [s]) === "weicht aus" && i.schuebe[0].x < 0
        && i.eig["fynn:lockt"] === true);
    s.location = { x: 10, y: 64, z: 0 };
    pruefe("Aus der Ferne lockt es", f.irrlichtTakt(i, [s]) === "lockt");
    let r = "";
    for (let t = 0; t < 70 && r !== "schatz" && r !== "falle"; t++) r = f.irrlichtTakt(i, [s], () => 0.1);
    pruefe("Nach einer halben Minute: ein Schatz", r === "schatz" && w.dinge.some(([t]) => t === "minecraft:emerald")
        && i.ereignisse.includes("fynn:verschwinden") && s.onScreenDisplay.leiste.includes("Schatz"));
    const w2 = welt();
    const i2 = wesen(w2, f.IRRLICHT, { x: 0, y: 65, z: 0 });
    const s2 = wesen(w2, "minecraft:player", { x: 10, y: 64, z: 0 });
    r = "";
    for (let t = 0; t < 70 && r !== "schatz" && r !== "falle"; t++) r = f.irrlichtTakt(i2, [s2], () => 0.9);
    pruefe("... oder eine Falle", r === "falle" && w2.neu.filter((t) => t === "minecraft:zombie").length === 2);
}

// Irrlichtflasche
{
    const w = welt();
    pruefe("Die Irrlichtflasche macht Licht", f.lichtSetzen(w.dim, { x: 2, y: 65, z: 2 }, 0)
        && w.bloecke["2,65,2"].startsWith("minecraft:light_block"));
    pruefe("... nicht in festem Boden", !f.lichtSetzen(w.dim, { x: 2, y: 60, z: 2 }, 0));
    f.lichterTakt(f.LICHT.dauer + 1);
    pruefe("... und nach drei Minuten ist es wieder dunkel", w.bloecke["2,65,2"] === "minecraft:air");
}

pruefe("Das Skript hoert auf Treffer und Wuerfe",
    gemerkt.ereignisse.entityHurt?.length >= 1 && gemerkt.ereignisse.projectileHitBlock?.length >= 1);
const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
