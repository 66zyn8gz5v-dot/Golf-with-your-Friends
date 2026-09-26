// Sir Roland durchgespielt - ohne Spiel: Staerke, Angriffswahl, Phasen,
// Schildwall mit Konter, Ruf des Ordens, Abschied mit Beute, Gegenstaende.
import { gemerkt, system } from "@minecraft/server";
const r = await import("./roland.js");
const { ANGRIFFE } = await import("./roland_daten.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

function spieler(id, x, z, modus = "Survival") {
    const titel = [];
    return {
        id, typeId: "minecraft:player", location: { x, y: 64, z }, titel, wirkungen: [], schaden: [], stoesse: [],
        getGameMode: () => modus,
        getComponent: (n) => (n === "minecraft:health" ? { currentValue: 20, effectiveMax: 20 } : undefined),
        onScreenDisplay: { setTitle: (t, o) => titel.push([t, o?.subtitle]), setActionBar: (t) => titel.push([t]) },
        applyDamage(b, o) { this.schaden.push([b, o?.damagingEntity?.typeId]); },
        applyKnockback(v, h) { this.stoesse.push([v, h]); },
        addEffect(n, d, o) { this.wirkungen.push([n, d, o?.amplifier]); },
        getViewDirection: () => ({ x: 0, y: 0, z: 1 }),
        isValid: true,
    };
}

function welt(alle) {
    const d = {
        gerufen: [], gegenstaende: [], partikel: [], toene: [],
        getPlayers: ({ location, maxDistance }) => alle.filter((w) => w.typeId === "minecraft:player"
            && Math.hypot(w.location.x - location.x, w.location.z - location.z) <= maxDistance),
        getEntities: (f) => alle.filter((w) => {
            if (f.type && w.typeId !== f.type) return false;
            if (f.location && Math.hypot(w.location.x - f.location.x, w.location.z - f.location.z) > f.maxDistance) return false;
            if (f.excludeFamilies?.includes("ritter") && (w.typeId === "fynn:roland" || w.typeId.startsWith("fynn:ritter"))) return false;
            if (f.excludeFamilies?.includes("player") && w.typeId === "minecraft:player") return false;
            if (f.families?.includes("monster") && w.typeId !== "minecraft:zombie") return false;
            return true;
        }),
        spawnParticle(n, o) { this.partikel.push(n); },
        playSound(n) { this.toene.push(n); },
        spawnEntity(typ, ort) {
            const w = { id: `r${this.gerufen.length}`, typeId: typ, location: ort, isValid: true, tags: [],
                addTag(t) { this.tags.push(t); }, remove() { this.isValid = false; } };
            this.gerufen.push(w);
            alle.push(w);
            return w;
        },
        spawnItem(stapel) { this.gegenstaende.push([stapel.typeId, stapel.amount]); },
        getBlock: ({ y }) => ({ isAir: y >= 64, isLiquid: false }),
    };
    return d;
}

function roland(alle, lebenMax = 320) {
    const b = {
        id: "roland1", typeId: "fynn:roland", location: { x: 0, y: 64, z: 0 }, isValid: true,
        eig: new Map([["fynn:phase", 1], ["fynn:angriff", 0]]), ereignisse: [], nameTag: "",
        lebenJetzt: lebenMax, lebenMax, dyn: new Map(), weg: false, drehung: 0,
        getComponent(n) {
            if (n !== "minecraft:health") return undefined;
            const self = this;
            return { get currentValue() { return self.lebenJetzt; }, get effectiveMax() { return self.lebenMax; },
                setCurrentValue(v) { self.lebenJetzt = v; } };
        },
        getProperty(k) { return this.eig.get(k); },
        setProperty(k, v) { this.eig.set(k, v); },
        triggerEvent(n) {
            this.ereignisse.push(n);
            const m = /^fynn:staerke_(\d)$/.exec(n);
            if (m) { this.lebenMax = [0, 320, 480, 640, 800, 960, 1120][+m[1]]; this.lebenJetzt = this.lebenMax; }
        },
        addEffect() { }, removeEffect() { },
        teleport(o) { this.location = { ...o }; },
        setRotation(r) { this.drehung = r.y; },
        getRotation() { return { x: 0, y: this.drehung }; },
        getDynamicProperty(k) { return this.dyn.get(k); },
        setDynamicProperty(k, v) { this.dyn.set(k, v); },
        remove() { this.isValid = false; this.weg = true; },
    };
    b.dimension = welt(alle);
    alle.push(b);
    return b;
}

function laufe(z, ticks) {
    for (let i = 0; i < ticks; i++) {
        system.currentTick += 1;
        r.takt(z);
    }
}

// ---- Staerke nach Zahl der Spieler
pruefe("allein: 320 Leben, Faktor 1", r.staerkeFuer(1).leben === 320 && r.staerkeFuer(1).faktor === 1);
pruefe("zu dritt: 640 Leben, 30 % mehr Schaden", r.staerkeFuer(3).leben === 640 && Math.abs(r.staerkeFuer(3).faktor - 1.3) < 1e-9);
pruefe("ab sechs waechst er nicht weiter", r.staerkeFuer(9).leben === r.staerkeFuer(6).leben);
pruefe("niemand da zaehlt wie einer", r.staerkeFuer(0).leben === 320);

// ---- Auftritt mit drei Spielern
let alle = [spieler("a", 5, 0), spieler("b", -6, 3), spieler("c", 2, 20), spieler("fern", 200, 0), spieler("k", 3, 3, "Creative")];
let boss = roland(alle);
let z = r.zustandVon(boss);
r.starte(z, "auftritt");
laufe(z, 1);
pruefe("Auftritt: Staerke fuer drei Spieler (Kreativ und Ferne zaehlen nicht)", boss.ereignisse.includes("fynn:staerke_3") && boss.lebenMax === 640);
pruefe("Auftritt: Titel fuer die Spieler", alle[0].titel.some(([t]) => t.includes("Sir Roland")));
pruefe("Auftritt: Eigenschaft angriff = 9", boss.eig.get("fynn:angriff") === ANGRIFFE.auftritt.nr);
laufe(z, ANGRIFFE.auftritt.laenge + 2);
pruefe("nach dem Auftritt: verwundbar und kampfbereit", boss.ereignisse.includes("fynn:auftritt_fertig")
    && boss.ereignisse.includes("fynn:angriff_ende") && boss.eig.get("fynn:angriff") === 0);

// ---- Angriffswahl nach Abstand
const frisch = { phase: 1, abkling: {}, gefolge: [], n: 1 };
pruefe("ganz nah: Wirbel, Schildwall, kein Sprung", r.moeglich(frisch, 2, 0).includes("klingenwirbel")
    && r.moeglich(frisch, 2, 0).includes("schildwall") && !r.moeglich(frisch, 2, 0).includes("sprungschlag"));
pruefe("weit weg: Sprung und Sternenklingen", r.moeglich(frisch, 14, 0).includes("sprungschlag")
    && r.moeglich(frisch, 14, 0).includes("sternenklingen"));
pruefe("Phase eins: kein Ruf des Ordens", !r.moeglich(frisch, 5, 0).includes("ruf_des_ordens"));
pruefe("Phase zwei: Ruf des Ordens", r.moeglich({ ...frisch, phase: 2 }, 5, 0).includes("ruf_des_ordens"));
pruefe("Abklingzeit sperrt", !r.moeglich({ ...frisch, abkling: { klingenwirbel: 999 } }, 2, 0).includes("klingenwirbel"));

// ---- Sprungbogen
const mitte = r.bogenPunkt({ x: 0, y: 64, z: 0 }, { x: 10, y: 64, z: 0 }, 0.5);
pruefe("Sprung: auf halbem Weg fuenf Bloecke hoch", Math.abs(mitte.x - 5) < 1e-9 && Math.abs(mitte.y - 69) < 1e-9);
pruefe("Blick nach Sueden ist Gier 0, nach Osten -90", Math.abs(r.gierZu({ x: 0, z: 0 }, { x: 0, z: 5 })) < 1e-9
    && Math.abs(r.gierZu({ x: 0, z: 0 }, { x: 5, z: 0 }) + 90) < 1e-9);

// ---- Klingenwirbel trifft im Umkreis, nicht die eigenen Ritter
alle = [spieler("a", 2, 0), spieler("b", 10, 0)];
boss = roland(alle);
z = r.zustandVon(boss);
alle.push({ id: "eigen", typeId: "fynn:ritter", location: { x: 1, y: 64, z: 1 }, getComponent: () => ({}), isValid: true,
    applyDamage() { throw new Error("eigener Ritter getroffen"); } });
r.starte(z, "klingenwirbel");
laufe(z, ANGRIFFE.klingenwirbel.laenge + 1);
pruefe("Wirbel: der nahe Spieler zweimal getroffen", alle[0].schaden.length === 2);
pruefe("Wirbel: der ferne nicht", alle[1].schaden.length === 0);
pruefe("Wirbel: danach wieder Nahkampf", boss.eig.get("fynn:angriff") === 0);

// ---- Schildwall: Treffer von vorn prallen ab, dann Konter
alle = [spieler("a", 0, 3)];
boss = roland(alle);
z = r.zustandVon(boss);
boss.drehung = 0;   // blickt nach Sueden, also zum Spieler
r.starte(z, "schildwall", { ziel: alle[0] });
laufe(z, ANGRIFFE.schildwall.von + 2);
boss.lebenJetzt = 300;
const getroffen = gemerkt.ereignisse["entityHurt"].at(-1);
getroffen({ hurtEntity: boss, damage: 20, damageSource: { damagingEntity: alle[0] } });
pruefe("Schildwall: der Schlag von vorn heilt zurueck", boss.lebenJetzt === 320);
pruefe("Schildwall: wer schlaegt, kaempft mit", z.teilnehmer.has("a"));
laufe(z, 1);
pruefe("Schildwall: danach der Konter", z.aktion?.name === "konter" && boss.eig.get("fynn:angriff") === ANGRIFFE.konter.nr);
laufe(z, ANGRIFFE.konter.laenge);
pruefe("Konter trifft", alle[0].schaden.length === 1);
alle.push(spieler("hinten", 0, -3));
boss.lebenJetzt = 300;
r.starte(z, "schildwall");
laufe(z, ANGRIFFE.schildwall.von + 2);
getroffen({ hurtEntity: boss, damage: 20, damageSource: { damagingEntity: alle[1] } });
pruefe("Schildwall: von hinten hilft der Schild nicht", boss.lebenJetzt === 300);

// ---- Phase zwei bei halbem Leben
alle = [spieler("a", 4, 0), spieler("b", -4, 0)];
boss = roland(alle);
z = r.zustandVon(boss);
z.n = 2;
z.pause = 1e12;
boss.lebenJetzt = 150;
laufe(z, 1);
pruefe("halbes Leben: Phasenwechsel beginnt, unverwundbar", z.aktion?.name === "phasenwechsel" && boss.ereignisse.includes("fynn:schutz_an"));
laufe(z, ANGRIFFE.phasenwechsel.laenge + 1);
pruefe("Phase zwei: Eigenschaft und Name fuer die Bossleiste", boss.eig.get("fynn:phase") === 2
    && boss.nameTag.includes("Roland") && boss.nameTag.includes("Phase 2"));
pruefe("Phase zwei: entfesselt, danach wieder verwundbar", boss.ereignisse.includes("fynn:entfesseln")
    && boss.ereignisse.includes("fynn:schutz_aus"));
pruefe("Phase zwei: zwei Ritter treten aus dem Licht", boss.dimension.gerufen.length === 2
    && boss.dimension.gerufen.every((w) => w.tags.includes("roland_gefolge")));
pruefe("Phase zwei: mehr Schaden", Math.abs(z.faktor - 1.15 * 1.2) < 1e-9);
pruefe("Phase zwei kommt nur einmal", (laufe(z, 1), z.aktion?.name !== "phasenwechsel"));
const vorher = boss.dimension.gerufen.length;
r.rufe(z, 5);
pruefe("nie mehr Gefolge als erlaubt (zu zweit: drei)", boss.dimension.gerufen.length - vorher === 1);

// ---- Abschied und Beute
alle = [spieler("a", 4, 0), spieler("b", -4, 0), spieler("c", 0, 5)];
boss = roland(alle);
z = r.zustandVon(boss);
z.teilnehmer = new Set(["a", "b", "c"]);
r.rufe(z, 2);
boss.lebenJetzt = 25;
laufe(z, 1);
pruefe("unter der letzten Kraft: Abschied, unverwundbar", z.besiegt && z.aktion?.name === "abschied"
    && boss.ereignisse.includes("fynn:schutz_an"));
pruefe("das Gefolge geht mit", boss.dimension.gerufen.every((w) => !w.isValid));
laufe(z, ANGRIFFE.abschied.laenge + 2);
const beute = boss.dimension.gegenstaende.map(([n]) => n);
pruefe("Beute: Durendal genau einmal", beute.filter((n) => n === "fynn:durendal").length === 1);
pruefe("Beute: der Olifant", beute.includes("fynn:olifant"));
pruefe("Beute: drei Mitkaempfer - zwei Anteile mit Diamanten", beute.filter((n) => n === "minecraft:diamond").length === 3);
pruefe("Sieg-Titel fuer alle", alle[0].titel.some(([t]) => t.includes("Sieg")));
pruefe("danach ist er fort", boss.weg && !r.kaempfe.has(boss.id));

pruefe("Beute ohne Glueck: nur das Sichere", r.beuteListe([["x", 1, 1, 1.0], ["y", 1, 1, 0.1]], () => 0.99).length === 1);

// ---- Gegenstaende
alle = [spieler("s", 0, 0), { id: "zombie", typeId: "minecraft:zombie", location: { x: 0, y: 64, z: 3 }, isValid: true,
    schaden: [], getComponent: (n) => (n === "minecraft:health" ? {} : undefined), applyDamage(b) { this.schaden.push(b); },
    applyKnockback() { }, addEffect() { } }];
const s = alle[0];
s.dimension = welt(alle);
pruefe("Olifant: blasen staerkt", r.olifant(s) && s.wirkungen.some(([n]) => n === "resistance") && s.wirkungen.some(([n]) => n === "strength"));
pruefe("Olifant: gleich nochmal geht nicht", r.olifant(s) === false);
pruefe("Durendal: die Welle geht los", r.durendalWelle(s) === true);
pruefe("Durendal: acht Sekunden Ruhe", r.durendalWelle(s) === false);
let genommen = null;
s.selectedSlotIndex = 2;
s.getComponent = (n) => (n === "minecraft:inventory" ? { container: {
    getItem: () => ({ typeId: "fynn:fehdehandschuh", amount: 3 }), setItem: (i, st) => { genommen = st; } } }
    : n === "minecraft:health" ? {} : undefined);
pruefe("Fehdehandschuh: fordert heraus", r.fordereHeraus(s) === true);
pruefe("Fehdehandschuh: einer weniger", genommen?.amount === 2);
alle.push({ id: "da", typeId: "fynn:roland", location: { x: 3, y: 64, z: 3 }, isValid: true });
pruefe("Fehdehandschuh: nicht, wenn er schon da ist", r.fordereHeraus(s) === false);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
