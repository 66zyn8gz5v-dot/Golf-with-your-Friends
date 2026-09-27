// Erfahrung und das Buch der Faehigkeiten, ohne Spiel.
import { gemerkt } from "@minecraft/server";
import { letztesFenster, setzeAntwort } from "@minecraft/server-ui";
const f = await import("./faehigkeiten.js");
const e = await import("./erfahrung.js");
const k = await import("./boss_kern.js");

const ergebnisse = [];
function pruefe(was, ok) { ergebnisse.push(ok); console.log(`${ok ? "ok  " : "NEIN"} ${was}`); }

function leben(wert, max = 20) {
    return { currentValue: wert, effectiveMax: max, setCurrentValue(v) { this.currentValue = v; } };
}
function spieler(level = 0, rolle) {
    const eig = new Map(rolle ? [["fynn:rolle", rolle]] : []);
    const wirkungen = new Map();
    const h = leben(20);
    return {
        id: "s", typeId: "minecraft:player", level, xp: 0, hand: undefined, location: { x: 0, y: 64, z: 0 },
        getDynamicProperty: (n) => eig.get(n), setDynamicProperty: (n, v) => eig.set(n, v),
        addLevels(n) { this.level += n; }, addExperience(n) { this.xp += n; },
        getGameMode: () => "Survival",
        getEffect: (n) => wirkungen.get(n), wirkungen,
        addEffect: (n, d, o) => wirkungen.set(n, { amplifier: o?.amplifier ?? 0, duration: d }),
        removeEffect: (n) => wirkungen.delete(n),
        getComponent(n) {
            if (n === "minecraft:health") return h;
            if (n === "minecraft:equippable") return { getEquipment: (p) => (p === "Mainhand" && this.hand ? { typeId: this.hand } : undefined) };
            return undefined;
        },
        h, dimension: { playSound() {}, spawnParticle() {} },
        onScreenDisplay: { setTitle() {}, setActionBar() {} },
    };
}
let nummer = 0;
function monster(typ = "minecraft:zombie", wert = 20) {
    const h = leben(wert, wert);
    const wirkungen = [];
    return { id: `m${++nummer}`, typeId: typ, location: { x: 1, y: 64, z: 0 }, h, wirkungen,
        getComponent: (n) => (n === "minecraft:health" ? h : undefined), addEffect: (n) => wirkungen.push(n) };
}

// ---- Ausbauen mit Leveln: Stufe n kostet n Level
const s = spieler(10);
pruefe("die erste Stufe kostet 1 Level, die fuenfte 5, die fuenfzigste 50", f.kosten(0) === 1 && f.kosten(4) === 5 && f.kosten(49) === 50);
pruefe("fuenf Stufen auf einmal ab 0: 15 Level", f.kostenFuer(0, 5) === 15);
let r = f.ausbauen(s, "angriff");
pruefe(`Angriff ausgebaut: Stufe ${r.stufe}, noch ${s.level} Level`, r.ok && r.stufe === 1 && s.level === 9);
r = f.ausbauen(s, "angriff", 3);
pruefe(`drei Stufen: 2+3+4 Level (noch ${s.level})`, r.ok && r.stufe === 4 && s.level === 0);
r = f.ausbauen(s, "angriff");
pruefe("zu wenig Level: nichts passiert", !r.ok && r.grund === "level" && f.gespeichert(s, "angriff") === 4);
pruefe("Rollenfaehigkeit ohne die Rolle: geht nicht", f.ausbauen(spieler(50), "bollwerk").grund === "rolle");
const bis50 = spieler(5000);
r = f.ausbauen(bis50, "mining", 60);
pruefe(`Mining bis 50, nicht weiter (${r.stufe}), Upgrade-Liste im Ergebnis`, r.stufe === 50 && r.neu.length === 5);
const rolleMax = spieler(5000, "ritter");
pruefe("Rollenfaehigkeiten bis 25", f.ausbauen(rolleMax, "wirbelsturm", 40).stufe === 25);

// ---- Die grossen Upgrades
const w = spieler(0);
w.setDynamicProperty("fynn:fk_ruestung", 20);
w.setDynamicProperty("fynn:fk_agility", 40);
w.setDynamicProperty("fynn:fk_mining", 30);
w.setDynamicProperty("fynn:fk_angriff", 40);
const liste = Object.fromEntries(f.wirkungenFuer(w));
pruefe("Ruestung 20: +4 Herzen, Agility 40: Tempo II und Sprungkraft, Mining 30: Eile II, Angriff 40: Staerke",
    liste.health_boost === 1 && liste.speed === 1 && liste.jump_boost === 0 && liste.haste === 1 && liste.strength === 0);
pruefe("unter 10: keine Dauerwirkung", f.wirkungenFuer(spieler(0)).length === 0);
f.wirken(w);
pruefe("die Wirkungen sind gesetzt, lang", w.wirkungen.get("speed")?.duration > 20000);

// ---- Getroffen: Ruestung, Agility, Ausweichen, Dornen
const h = spieler(0);
h.setDynamicProperty("fynn:fk_ruestung", 30);
h.h.currentValue = 10;
const angreifer = monster("minecraft:zombie", 20);
f.treffer({ hurtEntity: h, damage: 10, damageSource: { cause: "entityAttack", damagingEntity: angreifer } }, () => 0.99);
pruefe(`Ruestung 30: 18 % zurueck (Leben ${h.h.currentValue})`, Math.abs(h.h.currentValue - 11.8) < 1e-9);
pruefe(`Dornen: der Zombie bekommt ein Fuenftel (${angreifer.h.currentValue})`, angreifer.h.currentValue === 18);
const fl = spieler(0);
fl.setDynamicProperty("fynn:fk_agility", 50);
fl.h.currentValue = 10;
f.treffer({ hurtEntity: fl, damage: 6, damageSource: { cause: "fall" } }, () => 0.99);
pruefe(`Agility 50: kein Fallschaden (Leben ${fl.h.currentValue})`, fl.h.currentValue === 16);
fl.h.currentValue = 10;
f.treffer({ hurtEntity: fl, damage: 6, damageSource: { cause: "entityAttack" } }, () => 0.1);
pruefe("Agility 50: ausgewichen", fl.h.currentValue === 16);

// ---- Bollwerk nur fuer Ritter, nur mit wenig Leben
const ritter = spieler(0, "ritter");
ritter.setDynamicProperty("fynn:fk_bollwerk", 25);
ritter.h.currentValue = 6;
f.treffer({ hurtEntity: ritter, damage: 5, damageSource: { cause: "entityAttack" } }, () => 0.99);
pruefe(`Bollwerk 25 bei wenig Leben: 40 % zurueck, Tempo und Regeneration (${ritter.h.currentValue})`,
    Math.abs(ritter.h.currentValue - 8) < 1e-9 && ritter.wirkungen.has("regeneration") && ritter.wirkungen.has("speed"));

// ---- Angriff: mehr Schaden, Lebensraub, kritisch
const a = spieler(0, "assassine");
a.setDynamicProperty("fynn:fk_angriff", 30);
a.setDynamicProperty("fynn:fk_giftklinge", 25);
a.hand = "fynn:eisendolche";
a.h.currentValue = 10;
const z = monster();
z.h.currentValue = 20;
const zweiter = monster();
a.dimension.getEntities = () => [z, zweiter];
z.dimension = a.dimension;
f.treffer({ hurtEntity: z, damage: 10, damageSource: { cause: "entityAttack", damagingEntity: a } }, () => 0.99);
pruefe(`Angriff 30: +30 % (Zombie ${z.h.currentValue})`, z.h.currentValue === 17);
pruefe(`Lebensraub 20 %: 2,6 Leben zurueck (${a.h.currentValue})`, Math.abs(a.h.currentValue - 12.6) < 1e-9);
pruefe("Giftklinge 25: Gift, Schwaeche, springt ueber", z.wirkungen.includes("poison") && z.wirkungen.includes("weakness")
    && zweiter.wirkungen.includes("poison"));
const k2 = monster(); k2.h.currentValue = 20;
f.treffer({ hurtEntity: k2, damage: 10, damageSource: { cause: "entityAttack", damagingEntity: a } }, () => 0.05);
pruefe(`kritisch ab Angriff 20: +50 % dazu (${k2.h.currentValue})`, k2.h.currentValue === 12);
const knapp = monster(); knapp.h.currentValue = 1;
f.treffer({ hurtEntity: knapp, damage: 5, damageSource: { cause: "entityAttack", damagingEntity: a } });
pruefe("Zusatzschaden toetet nie (den letzten Schlag macht die Waffe)", knapp.h.currentValue === 1);
const boss = monster("fynn:frostmammut", 280); boss.h.currentValue = 35;
f.treffer({ hurtEntity: boss, damage: 50, damageSource: { cause: "entityAttack", damagingEntity: a } });
pruefe(`Boss nie unter seine letzte Kraft (${boss.h.currentValue})`, boss.h.currentValue === 31);
const b = spieler(0, "bogenschuetze");
b.setDynamicProperty("fynn:fk_volltreffer", 25);
b.hand = "minecraft:bow";
const ziel = monster(); ziel.h.currentValue = 20;
f.treffer({ hurtEntity: ziel, damage: 5, damageSource: { cause: "projectile", damagingEntity: b } }, () => 0.1);
pruefe(`Volltreffer 25: dreifach dazu, betaeubt (Leben ${ziel.h.currentValue})`, ziel.h.currentValue === 10 && ziel.wirkungen.includes("slowness"));

// ---- Anforderungen
const neu = spieler(0);
pruefe("Holzpicke: braucht nichts", f.fehlendeWerte(neu, "minecraft:wooden_pickaxe").length === 0);
pruefe(`Diamantpicke: ${f.fehlendeWerte(neu, "minecraft:diamond_pickaxe")}`, f.fehlendeWerte(neu, "minecraft:diamond_pickaxe")[0] === "Mining 35 (du: 0)");
pruefe(`Eisenschwert: Angriff und Agility (${f.fehlendeWerte(neu, "minecraft:iron_sword").join(", ")})`,
    f.fehlendeWerte(neu, "minecraft:iron_sword").length === 2);
neu.hand = "minecraft:diamond_pickaxe";
neu.getComponent = ((alt) => function (n) {
    if (n === "minecraft:equippable") return { getEquipment: (p) => (p === "Mainhand" ? { typeId: this.hand } : p === "Chest" ? { typeId: "minecraft:iron_chestplate" } : undefined) };
    return alt.call(this, n);
})(neu.getComponent);
const fehlt = f.pruefeAusruestung(neu);
pruefe(`Diamantpicke ohne Mining: Schwaeche und Abbaulaehmung; Eisenbrust ohne Ruestung: langsam (${fehlt.length} fehlt)`,
    neu.wirkungen.has("weakness") && neu.wirkungen.has("mining_fatigue") && neu.wirkungen.has("slowness"));
const kreativ = spieler(0);
kreativ.getGameMode = () => "Creative";
pruefe("im Kreativmodus: keine Anforderungen", f.fehlendeWerte(kreativ, "minecraft:netherite_sword").length === 0);

// ---- Mining
const m = spieler(0);
m.setDynamicProperty("fynn:fk_mining", 50);
pruefe("Mining 50: 75 % doppeltes Eisenerz", f.doppeltesErz(m, "minecraft:iron_ore", undefined, () => 0.7) === "minecraft:raw_iron"
    && f.doppeltesErz(m, "minecraft:iron_ore", undefined, () => 0.8) === null);
pruefe("mit Behutsamkeit nicht", f.doppeltesErz(m, "minecraft:iron_ore",
    { getComponent: () => ({ getEnchantment: () => ({ level: 1 }) }) }, () => 0.3) === null);
pruefe("Erzsucher: im Stein steckt manchmal ein Erz", f.erzsucher(m, "minecraft:stone", () => 0.01) !== null
    && f.erzsucher(spieler(0), "minecraft:stone", () => 0.01) === null);
let abgebaut = null;
const obsidian = { typeId: "minecraft:obsidian", location: { x: 0, y: 60, z: 0 },
    setType(t) { abgebaut = t; }, dimension: { spawnItem() {}, playSound() {} } };
m.hand = "minecraft:diamond_pickaxe";
m.setDynamicProperty("fynn:fk_mining", 15);
pruefe("Obsidianbrecher mit Mining 15 - nein", !f.obsidianBrechen(m, obsidian));
m.setDynamicProperty("fynn:fk_mining", 35);
pruefe("Obsidianbrecher mit Mining 35 und Diamantpicke: mit einem Schlag", f.obsidianBrechen(m, obsidian) && abgebaut === "minecraft:air");

// ---- Manaquelle und Rabatte
const mg = spieler(0, "magier");
mg.setDynamicProperty("fynn:fk_manaquelle", 25);
mg.setDynamicProperty("fynn:fk_feuerkraft", 20);
pruefe("Manaquelle 25: +5 Mana, aber nur mit Stab", f.kraftBonus(mg, "magier") === 5 && f.kraftBonus(mg, "ritter") === 0);
pruefe("Feuerkraft 20: jeder Ball 10 Mana billiger", f.kostenRabatt(mg, "magier") === 10);

// ---- Erfahrung
const t = spieler(0);
for (const h of gemerkt.ereignisse["entityDie"] ?? []) {
    h({ deadEntity: { typeId: "minecraft:zombie", location: { x: 0, y: 64, z: 0 }, dimension: { spawnItem() {} } },
        damageSource: { damagingEntity: t } });
}
pruefe(`Zombie: ${t.xp} Erfahrung obendrauf (doppelter Zuschlag)`, t.xp === 16);
pruefe("starke Gegner: das Gefaess", e.dropsFuer({ typeId: "minecraft:warden" }, () => 0.5).some(([n]) => n === e.GEFAESS));
pruefe("Monster: manchmal ein Funke", e.dropsFuer({ typeId: "minecraft:zombie" }, () => 0.1).some(([n]) => n === e.FUNKE)
    && e.dropsFuer({ typeId: "minecraft:zombie" }, () => 0.9).length === 0);
const g = spieler(3);
g.selectedSlotIndex = 0;
g.getComponent = (n) => (n === "minecraft:inventory" ? { container: { getItem: () => ({ typeId: e.GEFAESS, amount: 1 }), setItem() {} } } : undefined);
pruefe("Erfahrungsgefaess: genau 15 Level", e.gefaessBenutzen(g) && g.level === 18);
const sieger = spieler(4);
k.merkeSiege([sieger], "fynn:frostmammut");
pruefe(`Frosthauer besiegt: +10 Level (${sieger.level})`, sieger.level === 14);

// ---- Ohne die Werte kein aufgeladener Angriff
const ro = await import("./rollen.js");
const anfaenger = spieler(0, "ritter");
anfaenger.hand = "minecraft:iron_sword";
anfaenger.setDynamicProperty("fynn:kraft", 100);
pruefe("Eisenschwert ohne Angriff 15: kein Wirbelschlag", !ro.angriffErlaubt(anfaenger, "ritter", 40, true));
anfaenger.setDynamicProperty("fynn:fk_angriff", 15);
anfaenger.setDynamicProperty("fynn:fk_agility", 5);
pruefe("mit Angriff 15 und Agility 5: der Wirbelschlag geht", ro.angriffErlaubt(anfaenger, "ritter", 40, true));

// ---- Das Buch
setzeAntwort(() => ({ canceled: true, cancelationReason: "UserClosed" }));
await f.zeigeBuch(spieler(7));
pruefe("ohne Rolle: die vier Grundfaehigkeiten und die Uebersicht", letztesFenster.knoepfe.length === 5 && letztesFenster.text.includes("7"));
await f.zeigeBuch(spieler(7, "magier"));
pruefe(`Magier: ${letztesFenster.knoepfe.map((x) => x.beschriftung.split("\n")[0].replace(/§./g, "")).join(", ")}`,
    letztesFenster.knoepfe.length === 7);
let schritt = 0;
const kaeufer = spieler(20);
setzeAntwort(() => (schritt++ === 0 ? { canceled: false, selection: 1 }
    : schritt === 2 ? { canceled: false, selection: 1 } : { canceled: true, cancelationReason: "UserClosed" }));
await f.zeigeBuch(kaeufer);
pruefe(`im Buch fuenf Stufen auf einmal: Angriff ${f.gespeichert(kaeufer, "angriff")}, ${kaeufer.level} Level uebrig`,
    f.gespeichert(kaeufer, "angriff") === 5 && kaeufer.level === 5);
pruefe("die Seite zeigt die Upgrades", letztesFenster.text.includes("Lebensraub"));

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
