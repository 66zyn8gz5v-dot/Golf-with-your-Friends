// Probe: Drachenzucht und Gaben (5.2) - paaren, Ei, brueten, schluepfen,
// wachsen, vererben - ohne Spiel.
import { world, system } from "@minecraft/server";
const d = await import("./drachen.js");
const z = await import("./drachenzucht.js");
const g = await import("./drachengaben.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(!!ok); console.log(ok ? "ok  " : "FEHLER", was); }

function welt() {
    const w = { bloecke: {}, wesen: [], toene: [], teilchen: [], neu: [] };
    w.dim = {
        getBlock: (o) => {
            const k = `${Math.floor(o.x)},${Math.floor(o.y)},${Math.floor(o.z)}`;
            return { typeId: w.bloecke[k] ?? (o.y < 64 ? "minecraft:grass_block" : "minecraft:air") };
        },
        getEntities: (f) => w.wesen.filter((e) => e.isValid && (!f?.type || e.typeId === f.type))
            .filter((e) => !f?.location || Math.hypot(e.location.x - f.location.x, e.location.y - f.location.y,
                                                     e.location.z - f.location.z) <= f.maxDistance)
            .filter((e) => !f?.excludeTypes || !f.excludeTypes.includes(e.typeId)),
        playSound: (n) => w.toene.push(n),
        spawnParticle: (n) => w.teilchen.push(n),
        spawnItem: () => {},
        spawnEntity: (typ, ort) => {
            const [art, ereignis] = typ.replace(">", "").split("<");
            const e = wesen(w, art, ort);
            if (ereignis) e.ereignisse.push(ereignis);
            w.neu.push(typ);
            return e;
        },
    };
    return w;
}
let nr = 0;
function wesen(w, typeId, ort, extra = {}) {
    const e = { id: `w${++nr}`, typeId, isValid: true, location: { ...ort }, dimension: w.dim, eig: {}, dyn: {},
        ereignisse: [], effekte: [], schaden: 0, brand: 0, zahm: false,
        setProperty(n, v) { this.eig[n] = v; }, getProperty(n) { return this.eig[n]; },
        getDynamicProperty(n) { return this.dyn[n]; }, setDynamicProperty(n, v) { if (v === undefined) delete this.dyn[n]; else this.dyn[n] = v; },
        triggerEvent(n) { this.ereignisse.push(n); },
        getComponent(n) {
            if (n === "minecraft:is_tamed") return this.zahm ? {} : undefined;
            if (n === "minecraft:tameable") return { tame: (s) => { this.zahm = true; this.herr = s.id; return true; } };
            if (n === "minecraft:inventory") return this.inv;
            return undefined;
        },
        remove() { this.isValid = false; },
        addEffect(n) { this.effekte.push(n); }, applyDamage(m) { this.schaden += m; return true; },
        setOnFire(s) { this.brand = s; }, applyImpulse() {}, applyKnockback() {},
        getViewDirection: () => ({ x: 0, y: 0, z: 1 }),
        onScreenDisplay: { leiste: "", setActionBar(t) { this.leiste = t; } }, ...extra };
    w.wesen.push(e);
    return e;
}
function spieler(w, ort) {
    const s = wesen(w, "minecraft:player", ort, { isSneaking: true, getGameMode: () => "Survival", selectedSlotIndex: 0 });
    const faecher = [];
    s.inv = { container: {
        getItem: (i) => faecher[i], setItem: (i, v) => { faecher[i] = v; },
        addItem: (ding) => { faecher.push(ding); return undefined; } } };
    s.faecher = faecher;
    return s;
}

// --- Mischen
{
    const feuer = { art: "fynn:lindwurm", atem: "feuer", faehigkeit: "feuerkugel", staerke: 120, generation: 1, uralt: false };
    const frost = { art: "fynn:frostwyvern", atem: "frost", faehigkeit: "eiskristalle", staerke: 100, generation: 2, uralt: false };
    const ei = z.mischen(feuer, frost, () => 0.9);
    pruefe("Atem vom Staerkeren, Faehigkeit vom Schwaecheren", ei.atem === "feuer" && ei.faehigkeit === "eiskristalle");
    pruefe("Feuer und Frost ergeben eine Gabe: Dampfwelle", ei.gabe === "feuer+frost"
        && g.GABENNAMEN[ei.gabe] === "Dampfwelle");
    pruefe("Die Generation zaehlt weiter, das Junge ist staerker", ei.generation === 3 && ei.staerke === 126);
    pruefe("Koerper des einen, Farben des anderen", ei.koerper === "fynn:lindwurm" && ei.farbe === "fynn:frostwyvern");
    const andersrum = z.mischen(feuer, frost, () => 0.1);
    pruefe("... oder andersherum", andersrum.koerper === "fynn:frostwyvern" && andersrum.farbe === "fynn:lindwurm");
    const rein = z.mischen(feuer, { ...feuer }, () => 0.9);
    pruefe("Zwei Feuerdrachen: rein, ohne Gabe", rein.koerper === rein.farbe && !rein.gabe);
    pruefe("Uraltes Blut vererbt sich manchmal", z.mischen({ ...feuer, uralt: true }, frost, () => 0.1).uralt
        && !z.mischen({ ...feuer, uralt: true }, frost, () => 0.9).uralt);
    pruefe("Der Himmelsdrache mag den Schlunddrachen nicht",
        !z.vertraeglich("fynn:himmelsdrache", "fynn:schlunddrache") && z.vertraeglich("fynn:lindwurm", "fynn:nachtschwinge"));
    pruefe("Jedes Atempaar hat eine Gabe", Object.keys(g.GABEN).length === 15
        && g.gabeFuer("sturm", "feuer") === "feuer+sturm" && !g.gabeFuer("gift", "gift"));
}

// --- Paaren und Ei
{
    const w = welt();
    const s = spieler(w, { x: 0, y: 64, z: 0 });
    const a = wesen(w, "fynn:lindwurm", { x: 2, y: 64, z: 0 }, { zahm: true });
    const b = wesen(w, "fynn:frostwyvern", { x: 6, y: 64, z: 0 }, { zahm: true });
    a.dyn["fynn:besitzer"] = s.id;
    b.dyn["fynn:besitzer"] = s.id;
    pruefe("Mit Fleisch verliebt er sich", z.fuettern(a, s, 100) === "verliebt" && z.istVerliebt(a, 100));
    pruefe("Allein legt er kein Ei", z.paarTakt(120) === "wartet");
    z.fuettern(b, s, 130);
    pruefe("Zwei Verliebte: ein Drachenei", z.paarTakt(140, () => 0.3) === "ei" && w.neu.includes(z.EI));
    const ei = w.wesen.find((e) => e.typeId === z.EI);
    const inhalt = z.eiInhalt(ei);
    pruefe("Im Ei stecken beide Eltern", inhalt && [inhalt.koerper, inhalt.farbe].sort().join()
        === "fynn:frostwyvern,fynn:lindwurm" && ei.dyn["fynn:besitzer"] === s.id);
    pruefe("Danach brauchen beide Ruhe", z.fuettern(a, s, 200) === "ruht");

    // Unvertraegliche Paare
    const h = wesen(w, "fynn:himmelsdrache", { x: 40, y: 64, z: 0 }, { zahm: true });
    const sch = wesen(w, "fynn:schlunddrache", { x: 43, y: 64, z: 0 }, { zahm: true });
    z.fuettern(h, s, 300);
    z.fuettern(sch, s, 300);
    pruefe("Himmelsdrache und Schlunddrache: kein Ei", z.paarTakt(320) === "unvertraeglich");

    // Brueten: kalt nichts, warm schluepft es
    const brut0 = ei.dyn["fynn:brut"];
    z.eiTakt(ei, 400);
    const kalt = z.KALTE_EIER.has(inhalt.koerper);
    pruefe("Ohne " + (kalt ? "Kälte" : "Wärme") + " brütet es nicht", ei.dyn["fynn:brut"] === brut0 && ei.eig["fynn:warm"] === false);
    const o = ei.location;
    w.bloecke[`${Math.floor(o.x) + 1},${Math.floor(o.y)},${Math.floor(o.z)}`] = kalt ? "minecraft:packed_ice" : "minecraft:campfire";
    pruefe("Richtig gelegt brütet es", z.eiTakt(ei, 420) === "brütet" && ei.dyn["fynn:brut"] === brut0 + 20
        && ei.eig["fynn:warm"] === true);
    ei.dyn["fynn:brut"] = z.ZUCHT.brut - 20;
    pruefe("Nach der Brutzeit schlüpft das Junge", z.eiTakt(ei, 440) === "schlüpft" && !ei.isValid
        && w.neu.includes(`${inhalt.koerper}<fynn:schluepfen>`));
    const junges = w.wesen.find((e) => e.typeId === inhalt.koerper && e.ereignisse.includes("fynn:schluepfen"));
    world.getAllPlayers = () => [s];
    pruefe("Es gehört dem Besitzer des Eis", z.einrichten(junges, inhalt, s.id) && junges.zahm
        && junges.ereignisse.includes("fynn:jung_zahm") && junges.dyn["fynn:besitzer"] === s.id);
    pruefe("... mit den Farben der anderen Art und seinem Erbe",
        junges.eig["fynn:misch"] === z.ARTEN.indexOf(inhalt.farbe) + 1 && junges.dyn["fynn:gabe"] === "feuer+frost"
        && junges.dyn["fynn:gezuechtet"] === true);
    pruefe("Geerbter Atem gilt", d.atemVon(junges) === inhalt.atem);
    pruefe("Beim Antippen erfährt man sein Erbe", d.zusatz.info(junges).includes("Dampfwelle"));

    // Wachsen
    junges.eig["fynn:wuchs"] = 0;
    pruefe("Ganz klein speit es noch nicht", d.atemTakt(junges, 500) === "zu jung");
    junges.dyn["fynn:wuchszeit"] = z.ZUCHT.stufe - 20;
    pruefe("Nach einer Stufe wächst es", z.wachsTakt(junges) === "gewachsen" && junges.ereignisse.includes("fynn:wachsen_1")
        && junges.eig["fynn:wuchs"] === 1);
    pruefe("Fleisch lässt es schneller wachsen", z.fuettern(junges, s, 600) === "waechst"
        && junges.dyn["fynn:wuchszeit"] === z.ZUCHT.futter);
    junges.eig["fynn:wuchs"] = 9;
    junges.dyn["fynn:wuchszeit"] = z.ZUCHT.stufe;
    pruefe("Die letzte Stufe: ausgewachsen", z.wachsTakt(junges) === "ausgewachsen"
        && junges.ereignisse.includes("fynn:ausgewachsen"));
    pruefe("Gezüchtete werden nicht zufällig uralt", !d.uraltWuerfeln(junges, () => 0));

    // Aufheben und absetzen
    const w2 = welt();
    const s2 = spieler(w2, { x: 0, y: 64, z: 0 });
    const ei2 = z.eiLegen(w2.dim, { x: 1, y: 64, z: 1 }, inhalt, s2.id, 1234);
    pruefe("Aufheben: das Ei ist in der Tasche", z.aufheben(ei2, s2) && !ei2.isValid
        && s2.faecher.some((f) => f?.typeId === z.EI));
    const ding = s2.faecher.find((f) => f?.typeId === z.EI);
    s2.faecher[0] = ding;
    const wieder = z.absetzen(s2, ding, { x: 3, y: 64, z: 3 });
    pruefe("Absetzen: dasselbe Ei, gleich weit bebrütet", wieder && wieder.dyn["fynn:brut"] === 1234
        && z.eiInhalt(wieder).koerper === inhalt.koerper);
}

// --- Gaben
{
    const w = welt();
    const s = spieler(w, { x: 0, y: 64, z: -10 });
    const drache = wesen(w, "fynn:lindwurm", { x: 0, y: 64, z: 0 }, { zahm: true });
    drache.dyn["fynn:gabe"] = "feuer+sturm";
    drache.dyn["fynn:besitzer"] = s.id;
    drache.dyn["fynn:generation"] = 3;
    const kuh = wesen(w, "minecraft:zombie", { x: 0, y: 64, z: 10 });
    pruefe("Gabe: Feuerwirbel", g.gabeWirken(drache, kuh, 1000) === "Feuerwirbel" && g.laufend.length === 1);
    pruefe("... dann eine Pause", g.gabeWirken(drache, kuh, 1010) === "wartet");
    for (let t = 0; t < 90; t += 2) g.gabenTakt();
    pruefe("Der Wirbel brennt und trifft", kuh.schaden > 0 && kuh.brand > 0 && g.laufend.length === 0);
    pruefe("Den Besitzer trifft er nicht", s.schaden === 0);
    pruefe("Die Blutlinie macht stärker", g.macht(drache) > 1.2);
    drache.dyn["fynn:gabe"] = "feuer+frost";
    const zombie = wesen(w, "minecraft:zombie", { x: 4, y: 64, z: 0 });
    g.gabeWirken(drache, zombie, 5000);
    for (let t = 0; t < 30; t += 2) g.gabenTakt();
    pruefe("Die Dampfwelle läuft nach außen und verlangsamt", zombie.schaden > 0 && zombie.effekte.includes("slowness")
        && zombie.brand > 0);
}

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
