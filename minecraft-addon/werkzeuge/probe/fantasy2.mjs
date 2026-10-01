// Probe: Glutskorpion, Kristallspinne, Irrlicht, Moosgolem - ohne Spiel.
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
    pruefe("Wach, mit Ziel nah: Wurzeln brechen hervor", f.golemTakt(g, 20) === "wurzeln" && s.effekte.includes("slowness"));
    pruefe("... dann eine Pause", f.golemTakt(g, 40) === "kaempft");

    // Steht man weiter weg, holt er aus und wirft einen Stein aus dem Arm.
    s.location = { x: 18, y: 64, z: 0 };
    pruefe("Weiter weg: er holt aus", f.golemTakt(g, 60) === "holt aus" && g.eig["fynn:wurf"] === f.STEIN.holt);
    pruefe("... ein Takt spaeter fliegt der Felsbrocken", f.golemTakt(g, 80) === "wirft"
        && w.neu.includes(f.FELSBROCKEN) && g.eig["fynn:wurf"] === f.STEIN.leer);
    const schub = f.felsWerfen(g, s, false);
    pruefe("... im Bogen nach oben und auf das Ziel zu", schub.y > 0 && schub.x > 0);
    pruefe("Solange der Arm leer ist, kein zweiter Wurf", f.golemTakt(g, 100) === "kaempft");
    f.golemTakt(g, 80 + f.GOLEMWURF.leer);
    pruefe("Dann waechst der Stein nach", g.eig["fynn:wurf"] === f.STEIN.waechst);
    const r = f.golemTakt(g, 80 + f.GOLEMWURF.leer + f.GOLEMWURF.wachsen);
    pruefe("... dann holt er wieder aus, diesmal mit dem anderen Arm", r === "holt aus" && g.eig["fynn:links"] === true);
    f.golemTakt(g, 80 + f.GOLEMWURF.leer + f.GOLEMWURF.wachsen + f.GOLEMWURF.ausholen);
    g.target = undefined;
    for (const n of [1, 2]) f.golemTakt(g, 400 * n);
    pruefe("Die Steine wachsen auch ohne Ziel nach", g.eig["fynn:wurf"] === f.STEIN.bereit);
    pruefe("Ohne Ziel wacht er noch eine Weile", f.golemTakt(g, 400) === "wacht");
    pruefe("... dann schlaeft er wieder ein", f.golemTakt(g, 400 + f.GOLEMZEIT.wach) === "schlaeft ein"
        && g.ereignisse.includes("fynn:einschlafen") && g.eig["fynn:wurf"] === f.STEIN.bereit);

    // Nach dem Neuladen der Welt ist ein wacher Golem nicht mehr gemerkt.
    const g2 = wesen(w, f.GOLEM, { x: 0, y: 64, z: 0 }, { eig: { "fynn:schlaeft": false } });
    const s2 = wesen(w, "minecraft:player", { x: 12, y: 64, z: 0 });
    g2.target = s2;
    pruefe("Ein wacher Golem nach dem Neuladen kaempft weiter", f.golemTakt(g2, 5000) === "holt aus");
    g2.target = undefined;
    s2.isValid = false;
    pruefe("Stirbt das Ziel beim Ausholen, bricht er ab", f.golemTakt(g2, 5000 + f.GOLEMWURF.ausholen) === "bricht ab"
        && g2.eig["fynn:wurf"] === f.STEIN.bereit);
}

// Das Erz auf dem Buckel
{
    const w = welt();
    const s = wesen(w, "minecraft:player", { x: 0, y: 64, z: 0 });
    const ohne = wesen(w, f.GOLEM, { x: 0, y: 64, z: 0 }, { eig: { "fynn:erz": 0 } });
    pruefe("Ohne Erz sagt er nichts", f.erzBeiTod(ohne, s) === undefined);
    const rubin = wesen(w, f.GOLEM, { x: 0, y: 64, z: 0 }, { eig: { "fynn:erz": 4 } });
    const text = f.erzBeiTod(rubin, s);
    pruefe("Mit Rubin: wer ihn besiegt, erfaehrt es", text.includes("Rubin") && text.includes("sehr selten")
        && s.onScreenDisplay.leiste === text);
    pruefe("Der Diamant ist legendaer", f.GOLEMERZE[5].name === "Diamant" && f.GOLEMERZE[5].seltenheit === "legendär");
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
