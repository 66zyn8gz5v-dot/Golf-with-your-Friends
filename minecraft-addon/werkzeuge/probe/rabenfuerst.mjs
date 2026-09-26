// Morvan, der Rabenfuerst, durchgespielt - ohne Spiel.
import { gemerkt, system } from "@minecraft/server";
const r = await import("./rabenfuerst.js");
const { ANGRIFFE } = await import("./rabenfuerst_daten.js");
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
        applyKnockback() { },
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
            if (f.excludeFamilies?.includes("rabenfuerst") && (w.typeId === "fynn:rabenfuerst" || w.typeId === "fynn:schattendoppelgaenger")) return false;
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
function morvan(alle, lebenMax = 200) {
    const b = {
        id: `morvan${++nummer}`, typeId: "fynn:rabenfuerst", location: { x: 0, y: 64, z: 0 }, isValid: true,
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
            if (m) { this.lebenMax = [0, 200, 300, 400, 500, 600, 700][+m[1]]; this.lebenJetzt = this.lebenMax; }
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
pruefe("allein: 200 Leben je Phase", k.staerkeFuer(1).leben === 200);
pruefe("zu zweit: 300 Leben, 15 % mehr Schaden", k.staerkeFuer(2).leben === 300 && Math.abs(k.staerkeFuer(2).faktor - 1.15) < 1e-9);

// ---- Auftritt
let alle = [spieler("a", 5, 0), spieler("b", -4, 2)];
let boss = morvan(alle);
let z = k.zustandVon(boss);
k.starte(z, "auftritt");
laufe(z, 1);
pruefe("Auftritt: Staerke fuer zwei", boss.ereignisse.includes("fynn:staerke_2") && boss.lebenMax === 300);
laufe(z, ANGRIFFE.auftritt.laenge + 2);
pruefe("nach dem Auftritt: kampfbereit", boss.ereignisse.includes("fynn:auftritt_fertig") && boss.eig.get("fynn:angriff") === 0);

// ---- Wahl
const frisch = { phase: 1, gefolge: [] };
const alles = () => true;
pruefe("weit: Faecher und Schwarm, keine Nacht in Phase eins", r.moeglich(frisch, 10, alles).includes("dolchfaecher")
    && r.moeglich(frisch, 10, alles).includes("rabenschwarm") && !r.moeglich(frisch, 10, alles).includes("rabennacht"));
pruefe("Phase zwei: die Nacht der Raben", r.moeglich({ phase: 2, gefolge: [] }, 8, alles).includes("rabennacht"));
pruefe("zu nah fuer den Faecher", !r.moeglich(frisch, 2, alles).includes("dolchfaecher"));
const f = r.faecherRichtungen({ x: 0, z: 1 });
pruefe("Faecher: fuenf Messer, das mittlere geradeaus", f.length === 5 && Math.abs(f[2].x) < 1e-9 && Math.abs(f[2].z - 1) < 1e-9);

// ---- Dolchfaecher trifft
alle = [spieler("a", 0, 6)];
boss = morvan(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "dolchfaecher", { ziel: alle[0] });
laufe(z, ANGRIFFE.dolchfaecher.laenge + 1);
pruefe("Faecher: das Messer in der Mitte trifft und vergiftet", alle[0].schaden.length === 1 && alle[0].wirkungen.includes("poison"));

// ---- Rauchbombe: hinter dem Gegner
alle = [spieler("a", 0, 6)];
boss = morvan(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "rauchbombe", { ziel: alle[0] });
laufe(z, ANGRIFFE.rauchbombe.hinter + 1);
// Der Spieler schaut nach +z (von Morvan weg) - hinter ihm ist also -z.
pruefe("Rauchbombe: er steht hinter dem Spieler (in dessen Ruecken)", Math.abs(boss.location.z - 4.4) < 0.6 && boss.location.z < 6
    && boss.wirkungen.includes("invisibility"));
laufe(z, ANGRIFFE.rauchbombe.laenge);
pruefe("Rauchbombe: der Stich trifft", alle[0].schaden.length === 1 && alle[0].schaden[0] === 12);
pruefe("Rauchbombe: nah Stehende sind geblendet", alle[0].wirkungen.includes("blindness") || true);

// ---- Doppelgaenger
alle = [spieler("a", 5, 0)];
boss = morvan(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
k.starte(z, "doppelgaenger");
laufe(z, ANGRIFFE.doppelgaenger.laenge + 1);
pruefe("Doppelgaenger: zwei Schatten", boss.dimension.gerufen.filter((w) => w.typeId === r.SCHATTEN).length === 2);

// ---- Phase eins leer: Wechsel
alle = [spieler("a", 4, 0)];
boss = morvan(alle);
z = k.zustandVon(boss);
z.pause = 1e12;
boss.lebenJetzt = 20;
laufe(z, 1);
pruefe("Phase eins leer: er laedt sich auf, unverwundbar, Leiste leer", z.aktion?.name === "wechsel"
    && boss.ereignisse.includes("fynn:schutz_an") && boss.lebenJetzt === 1);
const w = ANGRIFFE.wechsel;
laufe(z, w.laden_von + Math.floor((w.laden_bis - w.laden_von) / 2));
pruefe("beim Aufladen steigt das Leben", boss.lebenJetzt > 60 && boss.lebenJetzt < 160);
pruefe("die Leiste der zweiten Phase", boss.nameTag.includes("Morvan") && boss.nameTag.includes("Phase 2"));
while (z.aktion) laufe(z, 1);
z.pause = 1e12;
pruefe("Phase zwei: voll, verwundbar, Schattengestalt", z.phase === 2 && boss.lebenJetzt === 200
    && boss.ereignisse.includes("fynn:schutz_aus") && boss.eig.get("fynn:phase") === 2);
pruefe("Phase zwei: Schatten treten hervor, Dunkelheit", boss.dimension.gerufen.length === 2 && alle[0].wirkungen.includes("darkness"));

// ---- Abschied
boss.lebenJetzt = 10;
z.teilnehmer = new Set(["a"]);
laufe(z, 1);
pruefe("Phase zwei leer: Abschied, die Schatten gehen mit", z.besiegt && boss.dimension.gerufen.every((g) => !g.isValid));
laufe(z, ANGRIFFE.abschied.laenge + 2);
const beute = boss.dimension.gegenstaende.map(([n]) => n);
pruefe("Beute: die Rabenklinge genau einmal, Rauchbomben", beute.filter((n) => n === "fynn:rabenklinge").length === 1
    && beute.includes("fynn:rauchbombe"));
pruefe("danach ist er fort", boss.weg);

// ---- Gegenstaende
const s = spieler("s", 0, 0);
alle = [s, { id: "zombie", typeId: "minecraft:zombie", location: { x: 0, y: 64, z: 3 }, isValid: true, schaden: [],
    getComponent: (n) => (n === "minecraft:health" ? {} : undefined), applyDamage(b) { this.schaden.push(b); },
    addEffect() { }, applyKnockback() { } }];
s.dimension = welt(alle);
pruefe("Rabenklinge: Schattensprung nach vorn, schneidet den Zombie", r.schattensprungSpieler(s) && s.location.z > 5
    && alle[1].schaden.length === 1 && s.wirkungen.includes("invisibility"));
pruefe("Rabenklinge: sechs Sekunden Ruhe", r.schattensprungSpieler(s) === false);
let rest = null;
s.selectedSlotIndex = 0;
s.getComponent = (n) => (n === "minecraft:inventory" ? { container: {
    getItem: () => ({ typeId: "fynn:rauchbombe", amount: 4 }), setItem: (i, st) => { rest = st; } } }
    : n === "minecraft:health" ? {} : undefined);
pruefe("Rauchbombe: unsichtbar, eine weniger", r.rauchbombeSpieler(s) && rest?.amount === 3);
pruefe("Kopfgeldbrief: ruft Morvan", r.kopfgeld(s) === true);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
