// Probe: der Drachenatem (Feuerstrahl), Landen und Abheben - ohne Spiel.
import { gemerkt, world } from "@minecraft/server";
const d = await import("./drachen.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(!!ok); console.log(ok ? "ok  " : "FEHLER", was); }

// Eine kleine Welt: Boden bei y = 63, dazu Wesen.
function welt() {
    const w = { bloecke: {}, wesen: [], toene: [], teilchen: [], strahlen: [] };
    const blockBei = (x, y, z) => {
        const k = `${x},${y},${z}`;
        const typ = w.bloecke[k] ?? (y <= 63 ? "minecraft:grass_block" : "minecraft:air");
        return { typeId: typ, isAir: typ === "minecraft:air", isLiquid: false, location: { x, y, z },
                 setType(t) { w.bloecke[k] = t; } };
    };
    w.dim = {
        getBlock: (o) => blockBei(Math.floor(o.x), Math.floor(o.y), Math.floor(o.z)),
        getEntities: (f) => w.wesen.filter((e) => !f?.type || e.typeId === f.type)
            .filter((e) => !f?.location || Math.hypot(e.location.x - f.location.x, e.location.y - f.location.y,
                                                     e.location.z - f.location.z) <= f.maxDistance),
        playSound: (n) => w.toene.push(n),
        spawnParticle: (n, o, m) => w.teilchen.push(n),
        getBlockFromRay(von, r, opt) {
            w.strahlen.push([von, r]);
            for (let s = 0; s < opt.maxDistance; s += 0.25) {
                const p = { x: von.x + r.x * s, y: von.y + r.y * s, z: von.z + r.z * s };
                const b = w.dim.getBlock(p);
                if (!b.isAir) return { block: b };
            }
            return undefined;
        },
    };
    return w;
}
let nr = 0;
function wesen(w, typeId, ort, extra = {}) {
    const e = { id: `w${++nr}`, typeId, isValid: true, location: { ...ort }, dimension: w.dim, eig: {}, dyn: {},
        brand: 0, schaden: 0, ereignisse: [], effekte: [], stoesse: [],
        setOnFire(s) { this.brand = s; }, applyDamage(m) { this.schaden += m; },
        setProperty(n, v) { this.eig[n] = v; }, getProperty(n) { return this.eig[n]; },
        getDynamicProperty(n) { return this.dyn[n]; }, setDynamicProperty(n, v) { this.dyn[n] = v; },
        triggerEvent(n) { this.ereignisse.push(n);
            if (n === "fynn:landen") this.eig["fynn:fliegt"] = false;
            if (n === "fynn:abheben") this.eig["fynn:fliegt"] = true; },
        addEffect(n) { this.effekte.push(n); }, removeEffect() {}, applyImpulse(v) { this.stoesse.push(v); },
        getViewDirection: () => ({ x: 0, y: 0, z: 1 }), ...extra };
    w.wesen.push(e);
    return e;
}

// --- Der Feuerstrahl
{
    const w = welt();
    const drache = wesen(w, "fynn:lindwurm", { x: 0, y: 66, z: 0 }, { eig: { "fynn:fliegt": false } });
    drache.dyn["fynn:drache489"] = true;
    pruefe("Ohne Ziel: kein Feuer", d.atemTakt(drache, 0) === "wartet" && !w.teilchen.length);
    const spieler = wesen(w, "minecraft:player", { x: 0, y: 64, z: 10 });
    const daneben = wesen(w, "minecraft:cow", { x: 9, y: 64, z: 6 });
    const hinten = wesen(w, "minecraft:sheep", { x: 0, y: 64, z: -6 });
    drache.target = spieler;
    pruefe("Ziel in Reichweite: er holt Luft, das Maul geht auf",
        d.atemTakt(drache, 10, () => 0) === "holt Luft" && drache.eig["fynn:feuer"] === true
        && w.toene.includes("mob.enderdragon.growl"));
    pruefe("... erst Anlauf, noch kein Feuer", d.atemTakt(drache, 12) === "holt Luft" && !w.teilchen.length);
    const atem = d.ATEMARTEN.feuer;
    let t = 10 + atem.anlauf;
    for (; t < 10 + atem.anlauf + atem.dauer; t += 2) d.atemTakt(drache, t, () => 0);
    pruefe("Dann ein Strahl: viele Flammenstoesse hintereinander",
        w.teilchen.filter((n) => n === "fynn:drachenfeuer").length >= atem.dauer / 2 - 1);
    pruefe("... wer im Strahl steht, brennt", spieler.brand > 0 && spieler.schaden > 0);
    pruefe("... wer daneben oder hinter ihm steht, nicht", daneben.brand === 0 && hinten.brand === 0);
    pruefe("... wo er auf den Boden trifft, faengt es an zu brennen",
        Object.values(w.bloecke).includes("minecraft:fire"));
    pruefe("... und der Strahl zielt nach vorn unten", w.strahlen.every(([, r]) => r.z > 0.5 && r.y < 0));
    d.atemTakt(drache, t, () => 0);
    pruefe("Danach klappt das Maul zu", drache.eig["fynn:feuer"] === false);
    pruefe("... und er braucht eine Pause", d.atemTakt(drache, t + 20, () => 0) === "wartet");
    const m = d.maul(drache);
    pruefe("Das Maul ist vorn am Kopf", m.z > drache.location.z + 3 && m.y > drache.location.y);
}

// --- Ohne mobGriefing kein Feuer auf dem Boden
{
    const w = welt();
    world.gameRules = { mobGriefing: false };
    const drache = wesen(w, "fynn:lindwurm", { x: 0, y: 66, z: 0 });
    drache.dyn["fynn:drache489"] = true;
    const spieler = wesen(w, "minecraft:player", { x: 0, y: 64, z: 10 });
    drache.target = spieler;
    for (let t = 1000; t < 1100; t += 2) d.atemTakt(drache, t, () => 0);
    pruefe("mobGriefing aus: Er brennt Spieler an, aber nicht die Welt",
        spieler.brand > 0 && !Object.values(w.bloecke).includes("minecraft:fire"));
    world.gameRules = undefined;
}

// --- Landen und Abheben
{
    const w = welt();
    const drache = wesen(w, "fynn:lindwurm", { x: 0, y: 90, z: 0 }, { eig: { "fynn:fliegt": true } });
    pruefe("Ein Drache aus einer alten Welt wird eingerichtet",
        d.flugTakt(drache, 0) === "eingerichtet" && drache.ereignisse.includes("fynn:abheben"));
    const art = d.DRACHEN["fynn:lindwurm"];
    pruefe("Er kreist erst eine Weile", d.flugTakt(drache, 20, () => 0) === "fliegt");
    pruefe("Ohne Ziel landet er irgendwann - sanft",
        d.flugTakt(drache, 20 + art.luft[0] + 1, () => 0) === "landet"
        && drache.eig["fynn:fliegt"] === false && drache.effekte.includes("slow_falling"));
    pruefe("Am Boden laeuft er", d.flugTakt(drache, 3000, () => 0) === "laeuft");
    const spieler = wesen(w, "minecraft:player", { x: 0, y: 90, z: 30 });
    drache.target = spieler;
    pruefe("Sieht er jemanden in der Ferne, hebt er ab",
        d.flugTakt(drache, 3020, () => 0) === "hebt ab" && drache.eig["fynn:fliegt"] === true
        && drache.stoesse.some((v) => v.y > 0.5));
    drache.target = undefined;
    d.flugTakt(drache, 9000, () => 0);
    d.flugTakt(drache, 9000 + art.luft[1] + 1, () => 0);
    const gelandet = 9000 + art.luft[1] + 20;
    d.flugTakt(drache, gelandet, () => 0);
    pruefe("... und nach genug Laufen auch von allein",
        d.flugTakt(drache, gelandet + art.boden[0] + 1, () => 0) === "hebt ab");
}

pruefe("Anmeldung: der Takt alle zwei Ticks", gemerkt.takte.some(([f, t]) => typeof f === "function" && t === 2));

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
