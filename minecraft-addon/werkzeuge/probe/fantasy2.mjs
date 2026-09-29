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

// Werwolf
{
    pruefe("Vollmondnacht", f.mondnacht(18000, 0) && f.mondnacht(14000, 7));
    pruefe("Tag oder dunkler Mond: keine Wolfsnacht", !f.mondnacht(6000, 0) && !f.mondnacht(18000, 4));
    const w = welt();
    const ww = wesen(w, f.WERWOLF, { x: 0, y: 64, z: 0 });
    pruefe("Am Tag bleibt er ein Mensch", f.werwolfTakt(ww, 0, false) === "Mensch");
    pruefe("In der Mondnacht beginnt die Verwandlung", f.werwolfTakt(ww, 20, true) === "beginnt"
        && ww.ereignisse.includes("fynn:wandeln"));
    pruefe("... dauert einen Moment", f.werwolfTakt(ww, 30, true) === "wandelt");
    pruefe("... dann ist er ein Wolf und heult", f.werwolfTakt(ww, 20 + f.WANDELN.dauer, true) === "ist Wolf"
        && ww.ereignisse.includes("fynn:zum_wolf") && w.toene.includes("mob.wolf.howl"));
    ww.eig["fynn:wolf"] = true;
    pruefe("Im Morgengrauen wird er wieder Mensch", f.werwolfTakt(ww, 200, false) === "beginnt"
        && f.werwolfTakt(ww, 200 + f.WANDELN.dauer, false) === "ist Mensch" && ww.ereignisse.includes("fynn:zum_menschen"));
    const schaeden = [];
    const wolf = wesen(w, f.WERWOLF, { x: 0, y: 64, z: 0 }, { eig: { "fynn:wolf": true },
        applyDamage(m) { schaeden.push(m); } });
    const mitSilber = wesen(w, "minecraft:player", { x: 1, y: 64, z: 0 }, {
        getComponent: () => ({ getEquipment: () => ({ typeId: "fynn:silberklinge" }) }) });
    const mitEisen = wesen(w, "minecraft:player", { x: 1, y: 64, z: 0 }, {
        getComponent: () => ({ getEquipment: () => ({ typeId: "minecraft:iron_sword" }) }) });
    pruefe("Silber trifft den Wolf doppelt", f.silberTreffer(wolf, mitSilber, 3) === 9 && schaeden[0] === 9);
    pruefe("Eisen nicht", f.silberTreffer(wolf, mitEisen, 3) === 0);
    const mensch = wesen(w, f.WERWOLF, { x: 0, y: 64, z: 0 }, { eig: { "fynn:wolf": false } });
    pruefe("Den Menschen trifft Silber nicht besonders", f.silberTreffer(mensch, mitSilber, 3) === 0);
}

// Moosgolem
{
    const w = welt();
    const g = wesen(w, f.GOLEM, { x: 3, y: 64, z: 0 }, { eig: { "fynn:schlaeft": true } });
    w.dim.getEntities = (q) => [g].filter((e) => !q?.type || e.typeId === q.type);
    pruefe("Er schlaeft", f.golemTakt(g, 0) === "schlaeft");
    pruefe("Wer einen Baum faellt, weckt ihn", f.baumGefaellt(w.dim, { x: 0, y: 64, z: 0 }, 10) === 1
        && g.ereignisse.includes("fynn:aufwachen"));
    g.eig["fynn:schlaeft"] = false;
    const s = wesen(w, "minecraft:player", { x: 5, y: 64, z: 0 });
    s.effekte = [];
    s.addEffect = (n) => s.effekte.push(n);
    s.applyDamage = () => {};
    g.target = s;
    pruefe("Wach, mit Ziel: Wurzeln brechen hervor", f.golemTakt(g, 20) === "wurzeln" && s.effekte.includes("slowness"));
    pruefe("... dann eine Pause", f.golemTakt(g, 40) === "kaempft");
    g.target = undefined;
    pruefe("Ohne Ziel wacht er noch eine Weile", f.golemTakt(g, 60) === "wacht");
    pruefe("... dann schlaeft er wieder ein", f.golemTakt(g, 40 + f.GOLEMZEIT.wach) === "schlaeft ein"
        && g.ereignisse.includes("fynn:einschlafen"));
}

// Moosherz
{
    const w = welt();
    const getreide = { typeId: "minecraft:wheat", location: { x: 1, y: 64, z: 0 },
        permutation: { getState: () => 3, withState: (n, v) => ({ reif: v }) }, gesetzt: null,
        setPermutation(p) { this.gesetzt = p; } };
    const basis = w.dim.getBlock;
    w.dim.getBlock = (o) => (o.x === 1 && o.y === 64 && o.z === 0 ? getreide : basis(o));
    const s = wesen(w, "minecraft:player", { x: 0.5, y: 64, z: 0.5 }, { getGameMode: () => "Creative" });
    const n = f.moosherz(s, () => 0.1);
    pruefe("Das Moosherz laesst das Getreide reifen", getreide.gesetzt?.reif === 7);
    pruefe("... und Blumen spriessen", n > 5 && Object.values(w.bloecke).some((t) => t === "minecraft:poppy"));
}

pruefe("Das Skript hoert auf Treffer und Wuerfe",
    gemerkt.ereignisse.entityHurt?.length >= 1 && gemerkt.ereignisse.projectileHitBlock?.length >= 1);
const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
