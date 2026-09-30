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
        teleport(o) { this.location = { ...o }; },
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
        d.flugTakt(drache, 0) === "eingerichtet" && drache.ereignisse.includes("fynn:einrichten"));
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

// --- Besiegt, Gnadenstoss, Heilen, Erholen
{
    const w = welt();
    const leben = { currentValue: 100, effectiveMax: 160, setCurrentValue(v) { this.currentValue = v; },
                    resetToMaxValue() { this.currentValue = this.effectiveMax; } };
    const drache = wesen(w, "fynn:lindwurm", { x: 0, y: 64, z: 0 }, { eig: { "fynn:fliegt": false } });
    drache.dyn["fynn:drache490"] = true;
    drache.getComponent = (n) => (n === "minecraft:health" ? leben : undefined);
    const spieler = wesen(w, "minecraft:player", { x: 3, y: 64, z: 0 },
        { onScreenDisplay: { leiste: [], setActionBar(t) { this.leiste.push(t); } } });
    pruefe("Bei viel Leben: kein Zusammenbruch", !d.getroffen(drache, 100));
    leben.currentValue = 30;
    pruefe("Bei einem Viertel: Er bricht zusammen", d.getroffen(drache, 100)
        && drache.ereignisse.includes("fynn:niedergeschlagen")
        && spieler.onScreenDisplay.leiste.at(-1).includes("Goldapfel"));
    drache.eig["fynn:besiegt"] = true;
    pruefe("... und nicht noch einmal", !d.getroffen(drache, 101));
    pruefe("Besiegt: Er atmet kein Feuer", d.atemTakt(drache, 102) === "ruht");
    pruefe("Erster und zweiter Schlag zaehlen nur", d.schlag(drache, spieler, 110) === 1 && d.schlag(drache, spieler, 120) === 2
        && !drache.ereignisse.includes("fynn:gnadenstoss"));
    pruefe("Der dritte ist der Gnadenstoss", d.schlag(drache, spieler, 130) === 3
        && drache.ereignisse.includes("fynn:gnadenstoss")
        && gemerkt.takte.some(([f, t]) => f === "spaeter" && t === 2));
    const zweiter = wesen(w, "fynn:lindwurm", { x: 20, y: 64, z: 0 }, { eig: { "fynn:besiegt": true } });
    zweiter.dyn["fynn:drache490"] = true;
    const leben2 = { currentValue: 20, effectiveMax: 160, setCurrentValue(v) { this.currentValue = v; },
                     resetToMaxValue() { this.currentValue = this.effectiveMax; } };
    zweiter.getComponent = (n) => (n === "minecraft:health" ? leben2 : undefined);
    d.besiegtTakt(zweiter, 1000);
    pruefe("Niemand entscheidet: Er wartet ...", d.besiegtTakt(zweiter, 1000 + d.BESIEGT.dauer - 10) === "besiegt");
    pruefe("... und erholt sich nach fuenf Minuten", d.besiegtTakt(zweiter, 1000 + d.BESIEGT.dauer + 1) === "erholt sich"
        && zweiter.ereignisse.includes("fynn:erholt") && leben2.currentValue > 20);
    const dritter = wesen(w, "fynn:lindwurm", { x: 40, y: 64, z: 0 }, { eig: { "fynn:besiegt": true } });
    const leben3 = { currentValue: 20, effectiveMax: 160, resetToMaxValue() { this.currentValue = this.effectiveMax; } };
    dritter.getComponent = (n) => (n === "minecraft:health" ? leben3 : undefined);
    d.geheilt(dritter, spieler);
    pruefe("Mit dem Goldapfel geheilt: volles Leben, er gehoert dir",
        leben3.currentValue === 160 && dritter.dyn["fynn:besitzer"] === spieler.id
        && spieler.onScreenDisplay.leiste.at(-1).includes("gehört jetzt dir"));
}

// --- Zahm: bleiben, folgen, Pfeife ruft
{
    const w = welt();
    const zahm = { "minecraft:is_tamed": {} };
    const drache = wesen(w, "fynn:lindwurm", { x: 50, y: 64, z: 50 });
    drache.getComponent = (n) => zahm[n];
    const spieler = wesen(w, "minecraft:player", { x: 0, y: 64, z: 0 },
        { onScreenDisplay: { setActionBar() {} }, getViewDirection: () => ({ x: 0, y: 0, z: 1 }) });
    drache.dyn["fynn:besitzer"] = spieler.id;
    pruefe("Schleichend antippen: Er bleibt", d.bleibOderKomm(drache, spieler) === "bleibt"
        && drache.ereignisse.includes("fynn:bleiben"));
    pruefe("... noch einmal: Er kommt mit", d.bleibOderKomm(drache, spieler) === "folgt");
    pruefe("Zahme Drachen landen und fliegen nicht von allein", d.flugTakt(drache, 5000) === "zahm"
        || drache.dyn["fynn:drache490"] === true);
    drache.dyn["fynn:drache490"] = true;
    pruefe("... wirklich nicht", d.flugTakt(drache, 5001) === "zahm");
    const gerufen = d.pfeife(spieler, 6000);
    pruefe("Die Pfeife ruft ihn herbei", gerufen === 1
        && Math.hypot(drache.location.x - 3, drache.location.z - 3) < 1e-9);
}

// --- Schlaf
{
    const w = welt();
    world.getTimeOfDay = () => 18000;
    const drache = wesen(w, "fynn:lindwurm", { x: 0, y: 64, z: 0 }, { eig: { "fynn:fliegt": false } });
    drache.dyn["fynn:drache490"] = true;
    d.flugTakt(drache, 7000, () => 0.5);
    pruefe("Nachts, eine Weile am Boden: Er schlaeft ein",
        d.flugTakt(drache, 7300, () => 0.0) === "schlaeft ein" && drache.ereignisse.includes("fynn:einschlafen"));
    drache.eig["fynn:schlaeft"] = true;
    const leise = wesen(w, "minecraft:player", { x: 4, y: 64, z: 0 }, { isSneaking: true });
    pruefe("Wer schleicht, weckt ihn nicht", d.flugTakt(drache, 7320, () => 0.0) === "schlaeft");
    leise.isSneaking = false;
    pruefe("Wer laut vorbeilaeuft, schon", d.flugTakt(drache, 7340, () => 0.0) === "wacht auf");
    world.getTimeOfDay = undefined;
}

// --- Die Feuerkugel
{
    const w = welt();
    const kugeln = [];
    w.dim.spawnEntity = (typ, o) => { const k = { typ, o, flug: null, getComponent: () => ({ set owner(x) {}, shoot(v) { k.flug = v; } }) }; kugeln.push(k); return k; };
    const drache = wesen(w, "fynn:lindwurm", { x: 0, y: 80, z: 0 });
    drache.target = wesen(w, "minecraft:player", { x: 0, y: 78, z: 5 });
    pruefe("Ziel zu nah: keine Feuerkugel", d.faehigkeitTakt(drache, 100, undefined, () => 0) === "wartet");
    drache.target.location = { x: 0, y: 64, z: 30 };
    pruefe("Ziel weit weg: Feuerkugel", d.faehigkeitTakt(drache, 110, undefined, () => 0) === "Feuerkugel"
        && kugeln[0]?.typ === "minecraft:fireball" && kugeln[0].flug.z > 0.5);
    pruefe("... dann eine Pause", d.faehigkeitTakt(drache, 120, undefined, () => 0) === "wartet");
}

// --- Frostwyvern: Frosthauch und Eiskristalle
{
    const w = welt();
    // Ein Teich vor ihm: Wasser bei y = 63.
    for (let x = -3; x <= 3; x++) for (let z = 4; z <= 14; z++) w.bloecke[`${x},63,${z}`] = "minecraft:water";
    const blockBei = w.dim.getBlock;
    w.dim.getBlock = (o) => { const b = blockBei(o); b.isLiquid = b.typeId === "minecraft:water"; return b; };
    const wyvern = wesen(w, "fynn:frostwyvern", { x: 0, y: 66, z: 0 }, { eig: { "fynn:fliegt": false } });
    wyvern.dyn["fynn:drache490"] = true;
    const effekte = [];
    const opfer = wesen(w, "minecraft:player", { x: 0, y: 64, z: 9 }, { addEffect(n) { effekte.push(n); } });
    wyvern.target = opfer;
    for (let t = 20000; t < 20000 + 80; t += 2) d.atemTakt(wyvern, t, () => 0);
    pruefe("Frosthauch: Er speit Frost, nicht Feuer",
        w.teilchen.includes("fynn:frostatem") && !w.teilchen.includes("fynn:drachenfeuer"));
    pruefe("... wer drin steht, wird langsam und friert", effekte.includes("slowness") && opfer.schaden > 0 && opfer.brand === 0);
    pruefe("... und das Wasser gefriert", Object.values(w.bloecke).includes("minecraft:ice"));
    const splitter = [];
    w.dim.spawnEntity = (typ, o) => { const k = { typ, flug: null, getComponent: () => ({ set owner(x) {}, shoot(v) { k.flug = v; } }) }; splitter.push(k); return k; };
    opfer.location = { x: 0, y: 64, z: 25 };
    pruefe("Eiskristalle: drei Splitter im Faecher", d.faehigkeitTakt(wyvern, 30000, undefined, () => 0) === "Eiskristalle"
        && splitter.length === 3 && splitter.every((k) => k.typ === "fynn:eissplitter" && k.flug.z > 1)
        && splitter[0].flug.x !== splitter[2].flug.x);
}

// --- Himmelsdrache: Sturmhauch und Blitzschlag
{
    const w = welt();
    const hd = wesen(w, "fynn:himmelsdrache", { x: 0, y: 66, z: 0 }, { eig: { "fynn:fliegt": true } });
    hd.dyn["fynn:drache490"] = true;
    const stoesse = [];
    const opfer = wesen(w, "minecraft:player", { x: 0, y: 64, z: 8 },
        { applyKnockback(v, h) { stoesse.push([v, h]); } });
    hd.target = opfer;
    for (let t = 40000; t < 40000 + 80; t += 2) d.atemTakt(hd, t, () => 0);
    pruefe("Sturmhauch: Windstoss mit Funken", w.teilchen.includes("fynn:sturmatem"));
    pruefe("... wer drin steht, fliegt weg - vom Drachen fort", stoesse.length > 0 && stoesse[0][0].z > 1
        && opfer.schaden > 0 && opfer.brand === 0);
    pruefe("... und kein Feuer, kein Eis", !Object.values(w.bloecke).some((b) => b === "minecraft:fire" || b === "minecraft:ice"));
    const vorher = gemerkt.takte.filter(([f]) => f === "spaeter").length;
    opfer.location = { x: 0, y: 64, z: 24 };
    pruefe("Blitzschlag: drei Blitze nacheinander", d.faehigkeitTakt(hd, 50000, undefined, () => 0) === "Blitzschlag"
        && gemerkt.takte.filter(([f]) => f === "spaeter").length - vorher === 3);
}

// --- Giftdrache: Giftwolke und Funken
{
    const w = welt();
    world.gameRules = { mobGriefing: false };
    const gd = wesen(w, "fynn:giftdrache", { x: 0, y: 66, z: 0 }, { eig: { "fynn:fliegt": false } });
    gd.dyn["fynn:drache490"] = true;
    const effekte = [];
    const opfer = wesen(w, "minecraft:player", { x: 0, y: 64, z: 8 }, { addEffect(n) { effekte.push(n); } });
    gd.target = opfer;
    const links = d.maul(gd, 0), rechts = d.maul(gd, 1);
    pruefe("Zwei Maeuler, links und rechts", Math.abs(links.x - rechts.x) > 3);
    for (let t = 60000; t < 60000 + 80; t += 2) d.atemTakt(gd, t, () => 0);
    pruefe("Linker Kopf: Giftstrahl, wer drin steht, ist vergiftet",
        w.teilchen.includes("fynn:giftatem") && effekte.includes("poison"));
    pruefe("... und eine Giftwolke bleibt liegen - auch ohne mobGriefing", d.wolken.length === 1);
    effekte.length = 0;
    d.wolkenTakt(60100);
    pruefe("Die Wolke vergiftet, wer darin steht", effekte.includes("poison") && w.teilchen.includes("fynn:giftwolke"));
    opfer.location = { ...d.wolken[0].ort };
    pruefe("Rechter Kopf: Funken in die Wolke - sie explodiert",
        d.faehigkeitTakt(gd, 60200, undefined, () => 0) === "Explosion" && d.wolken.length === 0
        && w.teilchen.includes("fynn:funken"));
    d.wolkenTakt(60300 + d.WOLKE.dauer);
    world.gameRules = undefined;
}

pruefe("Anmeldung: der Takt alle zwei Ticks", gemerkt.takte.some(([f, t]) => typeof f === "function" && t === 2));

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
