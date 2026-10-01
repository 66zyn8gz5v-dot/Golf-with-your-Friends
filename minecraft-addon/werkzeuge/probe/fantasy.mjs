// Probe: Feuermuecke, Sturmlibelle, Frostkaefer, Basilisk - ohne Spiel.
import { gemerkt } from "@minecraft/server";
const f = await import("./fantasy.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(!!ok); console.log(ok ? "ok  " : "FEHLER", was); }

function welt(bloecke = {}, wetter = "Clear") {
    const w = { bloecke, wesen: [], toene: [], teilchen: [] };
    w.dim = {
        getWeather: () => wetter,
        getBlock: ({ x, y, z }) => {
            const s = `${x},${y},${z}`;
            const typ = w.bloecke[s] ?? (y < 64 ? "minecraft:stone" : "minecraft:air");
            return { typeId: typ, isLiquid: typ === "minecraft:water", location: { x, y, z },
                     permutation: { getState: () => 0 }, setType(t) { w.bloecke[s] = t; } };
        },
        playSound: (n) => w.toene.push(n),
        spawnParticle: (n) => w.teilchen.push(n),
        getEntities: (q) => w.wesen.filter((e) => !q?.location
            || Math.hypot(e.location.x - q.location.x, e.location.y - q.location.y, e.location.z - q.location.z) <= q.maxDistance),
    };
    return w;
}
let nr = 0;
function wesen(w, typeId, ort, extra = {}) {
    const e = { id: `w${++nr}`, typeId, location: { ...ort }, isValid: true, dimension: w.dim, eig: {}, ereignisse: [],
        effekte: [], schaden: [], brand: 0, blick: { x: 0, y: 0, z: 1 }, ansicht: [],
        addEffect(n, d, o) { this.effekte.push([n, d, o?.amplifier]); },
        applyDamage(m, o) { this.schaden.push([m, o?.cause]); },
        setOnFire(s) { this.brand = s; },
        triggerEvent(n) { this.ereignisse.push(n); },
        setProperty(n, v) { this.eig[n] = v; }, getProperty(n) { return this.eig[n]; },
        getViewDirection() { return this.blick; },
        getEntitiesFromViewDirection() { return this.ansicht.map((x) => ({ entity: x })); },
        onScreenDisplay: { leiste: "", setActionBar(t) { this.leiste = t; } },
        getGameMode: () => "Survival", ...extra };
    w.wesen.push(e);
    return e;
}

// --- Feuermuecke und Glutflasche
{
    const w = welt();
    const s = wesen(w, "minecraft:player", { x: 0, y: 64, z: 0 });
    f.stich(s);
    pruefe("Der Stich setzt in Brand", s.brand === f.STICH.brand);
    const opfer = wesen(w, "minecraft:zombie", { x: 1, y: 64, z: 0 });
    const feuer = f.glutPlatzt(w.dim, { x: 0.5, y: 64, z: 0.5 });
    pruefe("Die Glutflasche zuendet den Boden an", feuer >= 3 && w.bloecke["0,64,0"] === "minecraft:fire");
    pruefe("... und alles in der Naehe brennt", opfer.brand > 0);
    const nass = welt({ "0,63,0": "minecraft:water", "1,63,0": "minecraft:water", "-1,63,0": "minecraft:water",
                        "0,63,1": "minecraft:water", "0,63,-1": "minecraft:water" });
    pruefe("Auf Wasser brennt nichts", f.glutPlatzt(nass.dim, { x: 0.5, y: 64, z: 0.5 }) === 0);
}

// --- Sturmlibelle
{
    const w = welt();
    const l = wesen(w, f.LIBELLE, { x: 0, y: 66, z: 0 });
    const s = wesen(w, "minecraft:player", { x: 1, y: 64, z: 0 });
    pruefe("Wer sie schlaegt, bekommt einen Schlag", f.libelleSchlaegt(l, s) === f.SCHLAG.schaden
        && s.schaden[0]?.[1] === "lightning");
    const g = welt({}, "Thunder");
    const l2 = wesen(g, f.LIBELLE, { x: 0, y: 66, z: 0 });
    const s2 = wesen(g, "minecraft:player", { x: 1, y: 64, z: 0 });
    pruefe("... bei Gewitter doppelt", f.libelleSchlaegt(l2, s2) === f.SCHLAG.gewitter);
    // Der Sturmfluegel
    let schub = null;
    const fluegel = { typeId: f.STURMFLUEGEL, dur: { damage: 0, maxDurability: 16 },
                      getComponent() { return this.dur; } };
    let im = fluegel;
    const flieger = wesen(w, "minecraft:player", { x: 0, y: 90, z: 0 }, {
        isGliding: false, selectedSlotIndex: 0, blick: { x: 1, y: 0, z: 0 },
        applyImpulse(i) { schub = i; },
        getComponent: () => ({ container: { getItem: () => im, setItem: (p, d) => { im = d; } } }) });
    pruefe("Am Boden: kein Schub", !f.sturmSchub(flieger) && schub === null);
    flieger.isGliding = true;
    pruefe("Im Gleitflug: Schub nach vorn", f.sturmSchub(flieger) && schub.x > 1.5 && schub.y > 0);
    pruefe("... und eine Ladung weniger", fluegel.dur.damage === 1);
    fluegel.dur.damage = 15;
    f.sturmSchub(flieger);
    pruefe("Die letzte Ladung verbraucht den Fluegel", im === undefined);
}

// --- Frostkaefer
{
    const w = welt();
    for (let x = -3; x <= 3; x++) for (let z = -3; z <= 3; z++) w.bloecke[`${x},63,${z}`] = "minecraft:water";
    const k = wesen(w, f.KAEFER, { x: 0.5, y: 64, z: 0.5 });
    const eis = f.friere(w.dim, k.location);
    pruefe("Wo er laeuft, friert das Wasser", eis >= 9 && w.bloecke["0,63,0"] === "minecraft:frosted_ice"
        && w.bloecke["3,63,3"] === "minecraft:water");
    pruefe("Geschlagen: er rollt sich ein", f.kaeferGetroffen(k, 100) && k.ereignisse.includes("fynn:einrollen"));
    pruefe("... nur einmal zugleich", !f.kaeferGetroffen(k, 110));
    f.ausrollTakt(100 + f.FROST.einrollen);
    pruefe("... und rollt sich wieder aus", k.ereignisse.includes("fynn:ausrollen"));
    const s = wesen(w, "minecraft:player", { x: 1, y: 64, z: 0 });
    f.frostbiss(s);
    pruefe("Sein Biss macht langsam", s.effekte.some(([n, , a]) => n === "slowness" && a === 2));
}

// --- Basilisk
{
    const w = welt();
    const b = wesen(w, f.BASILISK, { x: 0, y: 64, z: 0 }, { blick: { x: 0, y: 0, z: 1 } });
    const s = wesen(w, "minecraft:player", { x: 0, y: 64, z: 8 });
    pruefe("Wer wegschaut, dem passiert nichts", f.blickTakt(b, s, 0) === "nichts");
    s.ansicht = [b];
    let r = "";
    for (let t = 5; t <= f.BLICK.erstarren; t += 5) r = f.blickTakt(b, s, t);
    pruefe("Wer ihm in die Augen schaut, erstarrt", r === "erstarrt"
        && s.effekte.some(([n, , a]) => n === "slowness" && a === 5) && w.teilchen.includes("fynn:steinstaub"));
    pruefe("... und wird dabei immer langsamer", s.effekte.filter(([n]) => n === "slowness").length > 3);
    pruefe("Danach eine Pause", f.blickTakt(b, s, f.BLICK.erstarren + 5) === "nichts");
    const hinten = wesen(w, f.BASILISK, { x: 0, y: 64, z: 16 }, { blick: { x: 0, y: 0, z: 1 } });
    const s2 = wesen(w, "minecraft:player", { x: 0, y: 64, z: 10 });
    s2.ansicht = [hinten];
    pruefe("Schaut der Basilisk weg, geschieht nichts", f.blickTakt(hinten, s2, 0) === "nichts");
    const b3 = wesen(w, f.BASILISK, { x: 30, y: 64, z: 0 }, { blick: { x: 0, y: 0, z: 1 } });
    const schild = { typeId: "minecraft:shield" };
    const s3 = wesen(w, "minecraft:player", { x: 30, y: 64, z: 6 }, { isSneaking: true,
        getComponent: () => ({ getEquipment: (p) => (p === "Offhand" ? schild : undefined) }) });
    s3.ansicht = [b3];
    pruefe("Der Schild wirft den Blick zurueck", f.blickTakt(b3, s3, 0) === "zurueck"
        && b3.effekte.some(([n]) => n === "slowness") && !s3.effekte.length);
    const kreativ = wesen(w, "minecraft:player", { x: 0, y: 64, z: 6 }, { getGameMode: () => "Creative" });
    kreativ.ansicht = [b];
    pruefe("Im Kreativmodus erstarrt niemand", f.blickTakt(b, kreativ, 500) === "nichts");
    // Das Auge
    const z = wesen(w, "minecraft:zombie", { x: 5, y: 64, z: 0 });
    const s4 = wesen(w, "minecraft:player", { x: 0, y: 64, z: 0 });
    s4.ansicht = [z];
    pruefe("Das Basiliskenauge laesst erstarren", f.augeBenutzen(s4) && z.effekte.some(([n]) => n === "slowness"));
    s4.ansicht = [];
    pruefe("... ohne Ziel geschieht nichts", !f.augeBenutzen(s4));
}

pruefe("Das Skript hoert auf Treffer, Wuerfe und Gegenstaende",
    gemerkt.ereignisse.entityHurt?.length >= 1 && gemerkt.ereignisse.projectileHitBlock?.length >= 1
    && gemerkt.ereignisse.itemUse?.length >= 1);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
