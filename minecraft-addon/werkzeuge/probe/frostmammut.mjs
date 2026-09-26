// Hrimgar, das Frostmammut, durchgespielt - ohne Spiel.
import { gemerkt, system } from "@minecraft/server";
const r = await import("./frostmammut.js");
const { ANGRIFFE } = await import("./frostmammut_daten.js");
const k = r.kampf;

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

function spieler(id, x, z, modus = "Survival") {
    return {
        id, typeId: "minecraft:player", location: { x, y: 64, z }, titel: [], wirkungen: [], schaden: [], isValid: true,
        getGameMode: () => modus,
        getComponent: (n) => (n === "minecraft:health" ? { currentValue: 20, effectiveMax: 20 } : undefined),
        onScreenDisplay: { setTitle: (t, o) => this?.titel?.push?.(t), setActionBar() { } },
        applyDamage(b) { this.schaden.push(b); },
        applyKnockback(r, h) { this.stoss = [r, h]; }, isOnGround: true,
        addEffect(n) { this.wirkungen.push(n); },
        teleport(o) { this.location = { ...o }; },
        getViewDirection: () => ({ x: 0, y: 0, z: 1 }),
    };
}

function welt(alle) {
    return {
        gerufen: [], gegenstaende: [], partikel: [],
        getPlayers: ({ location, maxDistance }) => alle.filter((w) => w.typeId === "minecraft:player"
            && Math.hypot(w.location.x - location.x, w.location.z - location.z) <= maxDistance),
        getEntities: (f) => alle.filter((w) => {
            if (f.type && w.typeId !== f.type) return false;
            if (f.location && Math.hypot(w.location.x - f.location.x, w.location.z - f.location.z) > f.maxDistance) return false;
            if (f.excludeFamilies?.includes("frostmammut") && (w.typeId === "fynn:frostmammut" || w.typeId === "fynn:eiswolf")) return false;
            if (f.excludeFamilies?.includes("player") && w.typeId === "minecraft:player") return false;
            if (f.families?.includes("monster") && w.typeId !== "minecraft:zombie") return false;
            return true;
        }),
        spawnParticle(n) { this.partikel.push(n); },
        playSound() { },
        spawnEntity(typ, ort) {
            const w = { id: `s${this.gerufen.length}`, typeId: typ, location: ort, isValid: true, tags: [],
                addTag(t) { this.tags.push(t); }, remove() { this.isValid = false; } };
            this.gerufen.push(w);
            alle.push(w);
            return w;
        },
        spawnItem(stapel) { this.gegenstaende.push([stapel.typeId, stapel.amount]); },
        getBlock: ({ y }) => ({ isAir: y >= 64, isLiquid: false }),
    };
}

let nummer = 0;
function hrimgar(alle, lebenMax = 280) {
    const b = {
        id: `hrimgar${++nummer}`, typeId: "fynn:frostmammut", location: { x: 0, y: 64, z: 0 }, isValid: true,
        eig: new Map([["fynn:phase", 1], ["fynn:angriff", 0]]), ereignisse: [], nameTag: "", wirkungen: [],
        lebenJetzt: lebenMax, lebenMax, dyn: new Map(), weg: false, drehung: 0,
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
            if (m) { this.lebenMax = [0, 280, 420, 560, 700, 840, 980][+m[1]]; this.lebenJetzt = this.lebenMax; }
        },
        addEffect(n) { this.wirkungen.push(n); }, removeEffect() { },
        teleport(o) { this.location = { ...o }; },
        setRotation(rr) { this.drehung = rr.y; },
        getRotation() { return { x: 0, y: this.drehung }; },
        getDynamicProperty(key) { return this.dyn.get(key); },
        setDynamicProperty(key, v) { this.dyn.set(key, v); },
        remove() { this.isValid = false; this.weg = true; },
    };
    b.dimension = welt(alle);
    alle.push(b);
    return b;
}

function laufe(z, ticks) {
    for (let i = 0; i < ticks; i++) { system.currentTick += 1; k.takt(z); }
}

// ---- Staerke
pruefe("allein: 280 Leben je Phase", k.staerkeFuer(1).leben === 280);
pruefe("zu dritt: 560 Leben, 30 % mehr Schaden", k.staerkeFuer(3).leben === 560 && Math.abs(k.staerkeFuer(3).faktor - 1.3) < 1e-9);

// ---- Auftritt
let alle = [spieler("a", 6, 0), spieler("b", -5, 2)];
let boss = hrimgar(alle);
let z = k.zustandVon(boss);
k.starte(z, "auftritt");
laufe(z, 1);
pruefe("Auftritt: Staerke fuer zwei", boss.ereignisse.includes("fynn:staerke_2") && boss.lebenMax === 420);
laufe(z, ANGRIFFE.auftritt.laenge + 2);
pruefe("nach dem Auftritt: kampfbereit", boss.ereignisse.includes("fynn:auftritt_fertig") && boss.eig.get("fynn:angriff") === 0);

// ---- Wahl
const frisch = { phase: 1, gefolge: [] };
const alles = () => true;
pruefe("weit: Ansturm und Eiszapfen", r.moeglich(frisch, 12, alles).includes("ansturm") && r.moeglich(frisch, 12, alles).includes("eiszapfenregen"));
pruefe("nah: Feger, Schleuder, Stampfen - kein Ansturm", ["stosszahnfeger", "ruesselschleuder", "stampfen"].every((n) => r.moeglich(frisch, 3, alles).includes(n))
    && !r.moeglich(frisch, 3, alles).includes("ansturm"));
pruefe("Phase eins: kein Frostatem, keine Woelfe", !r.moeglich(frisch, 5, alles).includes("frostatem") && !r.moeglich(frisch, 5, alles).includes("eiswoelfe"));
pruefe("Phase zwei: Frostatem und Woelfe", r.moeglich({ phase: 2, gefolge: [] }, 5, alles).includes("frostatem")
    && r.moeglich({ phase: 2, gefolge: [] }, 5, alles).includes("eiswoelfe"));
pruefe("Winkel: geradeaus 0, zur Seite 90", Math.abs(r.winkelZu({ x: 0, z: 0 }, { x: 0, z: 1 }, { x: 0, z: 5 })) < 1e-6
    && Math.abs(r.winkelZu({ x: 0, z: 0 }, { x: 0, z: 1 }, { x: 5, z: 0 }) - 90) < 1e-6);
pruefe("Stampfen: der Ring waechst und hoert auf", r.ringWeite(10, 16, 1) === null && r.ringWeite(16, 16, 1) === 1.5
    && r.ringWeite(30, 16, 1) === null && r.ringWeite(28, 16, 2) !== null);

// ---- Ansturm: rennt, trifft den in der Bahn, nicht den daneben
alle = [spieler("a", 0, 12), spieler("b", 8, 4)];
boss = hrimgar(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "ansturm", { ziel: alle[0] });
laufe(z, ANGRIFFE.ansturm.laenge + 1);
pruefe("Ansturm: es ist losgerannt", boss.location.z > 8);
pruefe("Ansturm: der in der Bahn fliegt zur Seite", alle[0].schaden.length === 1 && alle[0].stoss && Math.abs(alle[0].stoss[0].x) > 0.5);
pruefe("Ansturm: der daneben bleibt heil", alle[1].schaden.length === 0);

// ---- Stampfen: wer springt, entgeht der Welle
alle = [spieler("a", 4, 0), spieler("b", -4, 0)];
alle[1].isOnGround = false;
boss = hrimgar(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "stampfen", { ziel: alle[0] });
laufe(z, ANGRIFFE.stampfen.laenge + 1);
pruefe("Stampfen: am Boden getroffen und verlangsamt", alle[0].schaden.length === 1 && alle[0].wirkungen.includes("slowness"));
pruefe("Stampfen: im Sprung verschont", alle[1].schaden.length === 0);

// ---- Stosszahnfeger: zwei Treffer vorn, keiner hinten
alle = [spieler("a", 0, 3), spieler("b", 0, -3)];
boss = hrimgar(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "stosszahnfeger", { ziel: alle[0] });
laufe(z, ANGRIFFE.stosszahnfeger.laenge + 1);
pruefe("Feger: vorn zweimal getroffen", alle[0].schaden.length === 2);
pruefe("Feger: hinten nichts", alle[1].schaden.length === 0);

// ---- Eiszapfen: wer stehen bleibt, wird getroffen; wer weggeht, nicht
alle = [spieler("a", 0, 8), spieler("b", 6, 0)];
boss = hrimgar(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "eiszapfenregen", { ziel: alle[0] });
laufe(z, ANGRIFFE.eiszapfenregen.zeichen + 2);
alle[1].location = { x: 12, y: 64, z: 0 };
laufe(z, ANGRIFFE.eiszapfenregen.laenge);
pruefe("Eiszapfen: der Stehende ist getroffen und verlangsamt", alle[0].schaden.length === 1 && alle[0].wirkungen.includes("slowness"));
pruefe("Eiszapfen: der Weggegangene nicht", alle[1].schaden.length === 0);

// ---- Ruesselschleuder: hoch in die Luft
alle = [spieler("a", 0, 3)];
boss = hrimgar(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "ruesselschleuder", { ziel: alle[0] });
laufe(z, ANGRIFFE.ruesselschleuder.laenge + 1);
pruefe("Schleuder: getroffen und hochgeworfen", alle[0].schaden.length === 1 && alle[0].stoss[1] >= 1.4);

// ---- Phase eins leer: Wechsel
alle = [spieler("a", 5, 0)];
boss = hrimgar(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
boss.lebenJetzt = 20;
laufe(z, 1);
pruefe("Phase eins leer: es laedt sich auf, unverwundbar, Leiste leer", z.aktion?.name === "wechsel"
    && boss.ereignisse.includes("fynn:schutz_an") && boss.lebenJetzt === 1);
const w = ANGRIFFE.wechsel;
laufe(z, w.laden_von + Math.floor((w.laden_bis - w.laden_von) / 2));
pruefe("beim Aufladen steigt das Leben", boss.lebenJetzt > 80 && boss.lebenJetzt < 220);
pruefe("die Leiste der zweiten Phase", boss.nameTag === "Hrimgar · Phase 2");
while (z.aktion) laufe(z, 1);
z.pause = 1e12;
pruefe("Phase zwei: voll, verwundbar, Panzer weg", z.phase === 2 && boss.lebenJetzt === 280
    && boss.ereignisse.includes("fynn:schutz_aus") && boss.eig.get("fynn:phase") === 2);
pruefe("Phase zwei: Splitter werfen weg, zwei Eiswoelfe", alle[0].schaden.length === 1
    && boss.dimension.gerufen.filter((g) => g.typeId === r.WOLF).length === 2);

// ---- Frostatem in Phase zwei
alle[0].location = { x: 0, y: 64, z: 5 };
alle[0].schaden = [];
k.starte(z, "frostatem", { ziel: alle[0] });
laufe(z, ANGRIFFE.frostatem.laenge + 1);
pruefe("Frostatem: mehrmals getroffen, stark verlangsamt", alle[0].schaden.length >= 3 && alle[0].wirkungen.includes("slowness"));

// ---- Abschied
boss.lebenJetzt = 10;
z.teilnehmer = new Set(["a"]);
laufe(z, 1);
pruefe("Phase zwei leer: Abschied, die Woelfe gehen mit", z.besiegt && boss.dimension.gerufen.every((g) => !g.isValid));
laufe(z, ANGRIFFE.abschied.laenge + 2);
const beute = boss.dimension.gegenstaende.map(([n]) => n);
pruefe("Beute: Frostzahn genau einmal, Herz des Winters", beute.filter((n) => n === "fynn:frostzahn").length === 1
    && beute.includes("fynn:herz_des_winters"));
pruefe("danach ist es fort", boss.weg);

// ---- Gegenstaende
const s = spieler("s", 0, 0);
const zombie = { id: "zombie", typeId: "minecraft:zombie", location: { x: 0, y: 64, z: 3 }, isValid: true, schaden: [], wirkungen: [],
    getComponent: (n) => (n === "minecraft:health" ? {} : undefined), applyDamage(b) { this.schaden.push(b); },
    addEffect(n) { this.wirkungen.push(n); }, applyKnockback() { } };
alle = [s, zombie];
s.dimension = welt(alle);
pruefe("Frostzahn: Frostschlag trifft und laehmt den Zombie vorn", r.frostschlag(s) && zombie.schaden.length === 1
    && zombie.wirkungen.includes("slowness"));
pruefe("Frostzahn: fuenf Sekunden Ruhe", r.frostschlag(s) === false);
let rest = null;
s.selectedSlotIndex = 0;
s.getComponent = (n) => (n === "minecraft:inventory" ? { container: {
    getItem: () => ({ typeId: "fynn:herz_des_winters", amount: 2 }), setItem: (i, st) => { rest = st; } } }
    : n === "minecraft:health" ? {} : undefined);
s.removeEffect = () => { };
pruefe("Herz des Winters: Extra-Herzen, Widerstand, eines weniger", r.herzDesWinters(s) && s.wirkungen.includes("absorption")
    && s.wirkungen.includes("resistance") && rest?.amount === 1);
pruefe("Frostruf: ruft Hrimgar", r.frostruf(s) === true);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
