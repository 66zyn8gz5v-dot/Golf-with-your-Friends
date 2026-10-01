// Aschvaru, der Seelendrache, durchgespielt - ohne Spiel.
import { gemerkt, system } from "@minecraft/server";
const r = await import("./seelendrache.js");
const { ANGRIFFE, MAUL } = await import("./seelendrache_daten.js");
const k = r.kampf;

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

function spieler(id, x, z, modus = "Survival") {
    return {
        id, typeId: "minecraft:player", location: { x, y: 64, z }, titel: [], wirkungen: [], schaden: [], stoesse: [], isValid: true,
        getGameMode: () => modus,
        getComponent: (n) => (n === "minecraft:health" ? { currentValue: 20, effectiveMax: 20 } : undefined),
        onScreenDisplay: { setTitle: (t, o) => this?.titel?.push?.(t), setActionBar() { } },
        applyDamage(b) { this.schaden.push(b); },
        applyKnockback(r, h) { this.stoss = [r, h]; this.stoesse.push([r, h]); }, isOnGround: true,
        addEffect(n) { this.wirkungen.push(n); },
        teleport(o) { this.location = { ...o }; },
        getViewDirection: () => ({ x: 0, y: 0, z: 1 }),
    };
}

function welt(alle, wand = null) {
    return {
        gerufen: [], gegenstaende: [], partikel: [],
        getPlayers: ({ location, maxDistance }) => alle.filter((w) => w.typeId === "minecraft:player" && w.isValid !== false
            && Math.hypot(w.location.x - location.x, w.location.z - location.z) <= maxDistance),
        getEntities: (f) => alle.filter((w) => {
            if (w.isValid === false) return false;
            if (f.type && w.typeId !== f.type) return false;
            if (f.location && Math.hypot(w.location.x - f.location.x, w.location.z - f.location.z) > f.maxDistance) return false;
            if (f.excludeFamilies?.includes("seelendrache") && (w.typeId === "fynn:seelendrache" || w.typeId === "fynn:seelenabbild")) return false;
            if (f.excludeFamilies?.includes("player") && w.typeId === "minecraft:player") return false;
            return true;
        }),
        spawnParticle(n, o) { this.partikel.push([n, o]); },
        playSound() { },
        spawnEntity(typ, ort) {
            const w = { id: `s${this.gerufen.length}`, typeId: typ, location: ort, isValid: true, tags: [], dimension: this,
                addTag(t) { this.tags.push(t); }, remove() { this.isValid = false; }, setRotation() { }, playAnimation() { } };
            this.gerufen.push(w);
            alle.push(w);
            return w;
        },
        spawnItem(stapel) { this.gegenstaende.push([stapel.typeId, stapel.amount]); },
        getBlock: ({ x, y, z }) => ({ isAir: y >= 64 && !(wand && wand(x, y, z)), isLiquid: false }),
    };
}

let nummer = 0;
function drache(alle, lebenMax = 320, wand = null) {
    const b = {
        id: `aschvaru${++nummer}`, typeId: "fynn:seelendrache", location: { x: 0, y: 64, z: 0 }, isValid: true,
        eig: new Map([["fynn:phase", 1], ["fynn:angriff", 0]]), ereignisse: [], nameTag: "", wirkungen: [],
        lebenJetzt: lebenMax, lebenMax, dyn: new Map(), weg: false, drehung: 0, hoehen: [],
        getComponent(n) {
            if (n !== "minecraft:health") return undefined;
            const self = this;
            return { get currentValue() { return self.lebenJetzt; }, get effectiveMax() { return self.lebenMax; },
                setCurrentValue(v) { self.lebenJetzt = v; } };
        },
        getProperty(key) { return this.eig.get(key); },
        setProperty(key, v) { this.eig.set(key, v); },
        triggerEvent(n) {
            this.ereignisse.push(n);
            const m = /^fynn:staerke_(\d)$/.exec(n);
            if (m) { this.lebenMax = [0, 320, 480, 640, 800, 960, 1120][+m[1]]; this.lebenJetzt = this.lebenMax; }
        },
        addEffect(n) { this.wirkungen.push(n); }, removeEffect() { },
        teleport(o) { this.location = { ...o }; this.hoehen.push(o.y); },
        setRotation(rr) { this.drehung = rr.y; },
        getRotation() { return { x: 0, y: this.drehung }; },
        getDynamicProperty(key) { return this.dyn.get(key); },
        setDynamicProperty(key, v) { this.dyn.set(key, v); },
        remove() { this.isValid = false; this.weg = true; },
    };
    b.dimension = welt(alle, wand);
    alle.push(b);
    return b;
}

function laufe(z, ticks) {
    for (let i = 0; i < ticks; i++) { system.currentTick += 1; k.takt(z); r.kugelTakt(); }
}

// ---- Staerke
pruefe("allein: 320 Leben je Phase", k.staerkeFuer(1).leben === 320);
pruefe("das Maul steht vorn und hoch", MAUL.vor > 3 && MAUL.hoch > 2);

// ---- Auftritt
let alle = [spieler("a", 6, 0), spieler("b", -5, 2)];
let boss = drache(alle);
let z = k.zustandVon(boss);
k.starte(z, "auftritt");
laufe(z, 1);
pruefe("Auftritt: Staerke fuer zwei", boss.ereignisse.includes("fynn:staerke_2") && boss.lebenMax === 480);
pruefe(`der Name steht fest am Boss: ${boss.nameTag}`, boss.nameTag === "Aschvaru");
laufe(z, ANGRIFFE.auftritt.laenge + 2);
pruefe("nach dem Auftritt: kampfbereit", boss.ereignisse.includes("fynn:auftritt_fertig") && boss.eig.get("fynn:angriff") === 0);

// ---- Wahl: keine Diener, Phase-zwei-Angriffe erst in Phase zwei
const frisch = { phase: 1, gefolge: [] };
const alles = () => true;
pruefe("Phase eins weit: Strahl und Kreise", ["seelenstrahl", "seelenkreise"].every((n) => r.moeglich(frisch, 12, alles).includes(n)));
pruefe("Phase eins nah: Fluegel und Schweif, kein Strahl", ["fluegelschlag", "schweifhieb"].every((n) => r.moeglich(frisch, 3, alles).includes(n))
    && !r.moeglich(frisch, 3, alles).includes("seelenstrahl"));
pruefe("Phase eins: kein Sog, kein Spiegel, kein Sturm", ["seelensog", "seelenspiegel", "seelensturm"].every((n) => !r.moeglich(frisch, 8, alles).includes(n)));
pruefe("Phase zwei: Sog, Spiegel, Sturm", ["seelensog", "seelenspiegel", "seelensturm"].every((n) => r.moeglich({ phase: 2, gefolge: [] }, 8, alles).includes(n)));
pruefe("Strahl: von rechts nach links", r.strahlWinkel(0) === 35 && r.strahlWinkel(1) === -35 && r.strahlWinkel(0.5) === 0);
pruefe("Schweif: trifft seitlich und hinten, nicht vorn", r.imSchweif({ x: 0, z: 0 }, { x: 0, z: 1 }, { x: 0, z: -5 })
    && r.imSchweif({ x: 0, z: 0 }, { x: 0, z: 1 }, { x: 5, z: 0 }) && !r.imSchweif({ x: 0, z: 0 }, { x: 0, z: 1 }, { x: 0, z: 5 }));

// ---- Seelenstrahl: wer im Strahl steht, wird mehrmals getroffen; wer hinter der Wand steht, nicht
alle = [spieler("a", 0, 10), spieler("b", -6, 10)];
boss = drache(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "seelenstrahl", { ziel: alle[0] });
laufe(z, ANGRIFFE.seelenstrahl.laenge + 1);
pruefe(`Strahl: der vorn wird mehrmals getroffen (${alle[0].schaden.length})`, alle[0].schaden.length >= 2);
pruefe("Strahl: Partikel zeichnen den Strahl", boss.dimension.partikel.some(([n]) => n === "fynn:seelenstrahl"));
alle = [spieler("a", 0, 12)];
boss = drache(alle, 320, (x, y, zz) => zz >= 8 && zz < 9);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "seelenstrahl", { ziel: alle[0] });
laufe(z, ANGRIFFE.seelenstrahl.laenge + 1);
pruefe("Strahl: hinter der Wand sicher", alle[0].schaden.length === 0);

// ---- Seelenkreise: wer stehen bleibt, wird getroffen und hochgeworfen; wer geht, nicht
alle = [spieler("a", 0, 8), spieler("b", 6, 0)];
boss = drache(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "seelenkreise", { ziel: alle[0] });
laufe(z, ANGRIFFE.seelenkreise.zeichen + 2);
pruefe("Kreise: Zauberkreise leuchten", boss.dimension.partikel.some(([n]) => n === "fynn:seelenkreis"));
alle[1].location = { x: 14, y: 64, z: 0 };
laufe(z, ANGRIFFE.seelenkreise.ausbruch - ANGRIFFE.seelenkreise.zeichen);
pruefe("Kreise: der Stehende getroffen und hochgeworfen", alle[0].schaden.length === 1 && alle[0].stoss[1] >= 0.8);
pruefe("Kreise: der Weggegangene nicht", alle[1].schaden.length === 0);

// ---- Fluegelschlag: zweimal vorn, weit fort
alle = [spieler("a", 0, 4), spieler("b", 0, -4)];
boss = drache(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "fluegelschlag", { ziel: alle[0] });
laufe(z, ANGRIFFE.fluegelschlag.laenge + 1);
pruefe("Fluegelschlag: vorn zweimal, weit", alle[0].schaden.length === 2 && alle[0].stoss[0].z > 2);
pruefe("Fluegelschlag: hinten nichts", alle[1].schaden.length === 0);

// ---- Schweifhieb: hinten ja, vorn nein
alle = [spieler("a", 0, 4), spieler("b", 0, -5)];
boss = drache(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "schweifhieb", { ziel: alle[0] });
laufe(z, ANGRIFFE.schweifhieb.laenge + 1);
pruefe("Schweifhieb: der hinten fliegt weg", alle[1].schaden.length === 1);
pruefe("Schweifhieb: der vorn bleibt heil", alle[0].schaden.length === 0);

// ---- Phase eins leer: Wechsel, danach Spiegelbilder
alle = [spieler("a", 5, 0)];
boss = drache(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
boss.lebenJetzt = 20;
laufe(z, 1);
pruefe("Phase eins leer: er laedt sich auf, unverwundbar", z.aktion?.name === "wechsel" && boss.lebenJetzt === 1);
while (z.aktion) laufe(z, 1);
z.pause = 1e12;
pruefe("Phase zwei: voll, der Ring erwacht", z.phase === 2 && boss.lebenJetzt === 320 && boss.eig.get("fynn:phase") === 2
    && boss.nameTag === "Aschvaru · Phase 2");
pruefe("Phase zwei: zwei Spiegelbilder, keine Diener", r.abbildZahl(z) === 2
    && boss.dimension.gerufen.every((g) => g.typeId === r.ABBILD));
pruefe("Phase zwei: kein dritter Spiegel, solange zwei da sind", !r.moeglich(z, 8, alles).includes("seelenspiegel"));

// ---- Die Spiegelbilder werfen Seelenkugeln, die treffen
alle[0].schaden = [];
alle[0].location = { x: 0, y: 64, z: 9 };
laufe(z, 150);
pruefe(`Spiegelbilder: Seelenkugeln treffen (${alle[0].schaden.length})`, alle[0].schaden.length >= 1);

// ---- Seelensog: zieht, dann stoesst er fort (die Spiegelbilder sind
// vorher zersprungen - sonst zaehlten ihre Kugeln mit)
for (const g of boss.dimension.gerufen) g.isValid = false;
alle[0].schaden = [];
alle[0].stoesse = [];
alle[0].location = { x: 0, y: 64, z: 6 };
k.starte(z, "seelensog", { ziel: alle[0] });
laufe(z, ANGRIFFE.seelensog.laenge + 1);
const zug = alle[0].stoesse.find(([s]) => s.z < 0);
pruefe("Seelensog: erst zu ihm hin, dann weit fort", !!zug && alle[0].schaden.length === 1 && alle[0].stoss[0].z > 2);

// ---- Seelensturm: steigt auf, landet, Welle; wer springt, entgeht ihr
alle[0].schaden = [];
alle[0].location = { x: 0, y: 64, z: 5 };
// b kommt erst zur Landung dazu (sonst fielen auch auf ihn Seelen) - und springt.
const b2 = spieler("b", 40, 0);
b2.isOnGround = false;
alle.push(b2);
k.starte(z, "seelensturm", { ziel: alle[0] });
laufe(z, ANGRIFFE.seelensturm.oben + 2);
pruefe(`Seelensturm: er ist in der Luft (${boss.location.y})`, boss.location.y > 68);
laufe(z, ANGRIFFE.seelensturm.aufprall - ANGRIFFE.seelensturm.oben - 2);
b2.location = { x: 4, y: 64, z: 0 };
laufe(z, ANGRIFFE.seelensturm.laenge - ANGRIFFE.seelensturm.aufprall);
pruefe("Seelensturm: wieder unten", Math.abs(boss.location.y - 64) < 0.01);
pruefe("Seelensturm: der Stehende getroffen (Seelen und Welle)", alle[0].schaden.length >= 1);
pruefe("Seelensturm: der Springende entgeht der Welle", b2.schaden.length === 0);

// ---- Abschied
boss.lebenJetzt = 10;
z.teilnehmer = new Set(["a"]);
laufe(z, 1);
pruefe("Phase zwei leer: Abschied, die Spiegelbilder vergehen", z.besiegt && boss.dimension.gerufen.every((g) => !g.isValid));
laufe(z, ANGRIFFE.abschied.laenge + 2);
const beute = boss.dimension.gegenstaende.map(([n]) => n);
pruefe("Beute: Seelenklinge genau einmal, Seelenkristalle", beute.filter((n) => n === "fynn:seelenklinge").length === 1
    && beute.includes("fynn:seelenkristall"));
pruefe("danach ist er fort", boss.weg);

// ---- Gegenstaende
const s = spieler("s", 0, 0);
const zombie = { id: "zombie", typeId: "minecraft:zombie", location: { x: 0, y: 64, z: 5 }, isValid: true, schaden: [],
    getComponent: (n) => (n === "minecraft:health" ? {} : undefined), applyDamage(b) { this.schaden.push(b); } };
alle = [s, zombie];
s.dimension = welt(alle);
pruefe("Seelenklinge: Seelenschnitt trifft den Zombie vorn", r.seelenschnitt(s) && zombie.schaden.length === 1);
pruefe("Seelenklinge: acht Sekunden Ruhe", r.seelenschnitt(s) === false);
let rest = null;
s.selectedSlotIndex = 0;
s.getComponent = (n) => (n === "minecraft:inventory" ? { container: {
    getItem: () => ({ typeId: "fynn:seelenkristall", amount: 2 }), setItem: (i, st) => { rest = st; } } }
    : n === "minecraft:health" ? {} : undefined);
pruefe("Seelenkristall: heilt, eines weniger", r.seelenkristall(s) && s.wirkungen.includes("regeneration") && rest?.amount === 1);
pruefe("Seelenruf: ruft Aschvaru", r.seelenruf(s) === true);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
