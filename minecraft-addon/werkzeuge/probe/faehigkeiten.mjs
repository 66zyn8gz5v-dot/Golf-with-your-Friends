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
function monster(typ = "minecraft:zombie", wert = 20) {
    const h = leben(wert, wert);
    const wirkungen = [];
    return { typeId: typ, location: { x: 1, y: 64, z: 0 }, h, wirkungen,
        getComponent: (n) => (n === "minecraft:health" ? h : undefined), addEffect: (n) => wirkungen.push(n) };
}

// ---- Ausbauen mit Leveln
const s = spieler(10);
pruefe("die erste Stufe kostet 2 Level, die zehnte 11", f.kosten(0) === 2 && f.kosten(9) === 11);
let r = f.ausbauen(s, "angriff");
pruefe(`Angriff ausgebaut: Stufe ${r.stufe}, noch ${s.level} Level`, r.ok && r.stufe === 1 && s.level === 8);
s.level = 1;
r = f.ausbauen(s, "angriff");
pruefe("zu wenig Level: nichts passiert", !r.ok && r.grund === "level" && f.gespeichert(s, "angriff") === 1);
pruefe("Rollenfaehigkeit ohne die Rolle: geht nicht", f.ausbauen(spieler(50), "bollwerk").grund === "rolle");

// ---- Wirkungen
const w = spieler(0);
w.setDynamicProperty("fynn:fk_ruestung", 5);
w.setDynamicProperty("fynn:fk_agility", 7);
w.setDynamicProperty("fynn:fk_mining", 2);
const liste = Object.fromEntries(f.wirkungenFuer(w));
pruefe("Ruestung 5: +2 Herzen, Agility 7: Tempo II, Mining 2: Eile I",
    liste.health_boost === 0 && liste.speed === 1 && liste.haste === 0);
f.wirken(w);
pruefe("die Wirkungen sind gesetzt, lang und ohne Partikel", w.wirkungen.get("speed")?.duration > 20000);

// ---- Getroffen: Ruestung und Agility
w.h.currentValue = 10;
f.treffer({ hurtEntity: w, damage: 10, damageSource: { cause: "entityAttack" } });
pruefe(`Ruestung 5: 15 % zurueck (Leben ${w.h.currentValue})`, Math.abs(w.h.currentValue - 11.5) < 1e-9);
w.setDynamicProperty("fynn:fk_agility", 10);
w.h.currentValue = 10;
f.treffer({ hurtEntity: w, damage: 6, damageSource: { cause: "fall" } });
pruefe(`Agility 10: kein Fallschaden (Leben ${w.h.currentValue})`, w.h.currentValue === 16);

// ---- Bollwerk nur fuer Ritter, nur mit wenig Leben
const ritter = spieler(0, "ritter");
ritter.setDynamicProperty("fynn:fk_bollwerk", 5);
ritter.h.currentValue = 6;
f.treffer({ hurtEntity: ritter, damage: 5, damageSource: { cause: "entityAttack" } });
pruefe(`Bollwerk 5 bei wenig Leben: 40 % zurueck (${ritter.h.currentValue})`, Math.abs(ritter.h.currentValue - 8) < 1e-9);

// ---- Angriff, Giftklinge, Volltreffer
const a = spieler(0, "assassine");
a.setDynamicProperty("fynn:fk_angriff", 5);
a.setDynamicProperty("fynn:fk_giftklinge", 3);
a.hand = "fynn:eisendolche";
const z = monster();
z.h.currentValue = 10;
f.treffer({ hurtEntity: z, damage: 10, damageSource: { cause: "entityAttack", damagingEntity: a } });
pruefe(`Angriff 5: +20 % (Zombie ${z.h.currentValue})`, z.h.currentValue === 8);
pruefe("Giftklinge mit Dolchen: vergiftet", z.wirkungen.includes("poison"));
const knapp = monster(); knapp.h.currentValue = 1;
f.treffer({ hurtEntity: knapp, damage: 5, damageSource: { cause: "entityAttack", damagingEntity: a } });
pruefe("Zusatzschaden toetet nie (den letzten Schlag macht die Waffe)", knapp.h.currentValue === 1);
const boss = monster("fynn:frostmammut", 280); boss.h.currentValue = 35;
f.treffer({ hurtEntity: boss, damage: 50, damageSource: { cause: "entityAttack", damagingEntity: a } });
pruefe(`Boss nie unter seine letzte Kraft (${boss.h.currentValue})`, boss.h.currentValue === 31);
const b = spieler(0, "bogenschuetze");
b.setDynamicProperty("fynn:fk_volltreffer", 5);
b.hand = "minecraft:bow";
const ziel = monster(); ziel.h.currentValue = 15;
f.treffer({ hurtEntity: ziel, damage: 5, damageSource: { cause: "projectile", damagingEntity: b } }, () => 0.1);
pruefe(`Volltreffer: doppelt (Leben ${ziel.h.currentValue})`, ziel.h.currentValue === 10);

// ---- Mining
const m = spieler(0);
m.setDynamicProperty("fynn:fk_mining", 10);
pruefe("Mining 10: doppeltes Eisenerz", f.doppeltesErz(m, "minecraft:iron_ore", undefined, () => 0.3) === "minecraft:raw_iron");
pruefe("mit Behutsamkeit nicht", f.doppeltesErz(m, "minecraft:iron_ore",
    { getComponent: () => ({ getEnchantment: () => ({ level: 1 }) }) }, () => 0.3) === null);
pruefe("Stein ist kein Erz", f.doppeltesErz(m, "minecraft:stone", undefined, () => 0) === null);

// ---- Manaquelle
const mg = spieler(0, "magier");
mg.setDynamicProperty("fynn:fk_manaquelle", 5);
pruefe("Manaquelle 5: +3 Mana, aber nur mit Stab", f.kraftBonus(mg, "magier") === 3 && f.kraftBonus(mg, "ritter") === 0);

// ---- Erfahrung
const t = spieler(0);
for (const h of gemerkt.ereignisse["entityDie"] ?? []) {
    h({ deadEntity: { typeId: "minecraft:zombie", location: { x: 0, y: 64, z: 0 }, dimension: { spawnItem() {} } },
        damageSource: { damagingEntity: t } });
}
pruefe(`Zombie: ${t.xp} Erfahrung obendrauf`, t.xp === 8);
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

// ---- Das Buch
setzeAntwort(() => ({ canceled: true, cancelationReason: "UserClosed" }));
await f.zeigeBuch(spieler(7));
pruefe("ohne Rolle: die vier Grundfaehigkeiten", letztesFenster.knoepfe.length === 4 && letztesFenster.text.includes("7"));
await f.zeigeBuch(spieler(7, "magier"));
pruefe(`Magier: sechs Knoepfe (${letztesFenster.knoepfe.map((x) => x.beschriftung.split("\n")[0].replace(/§./g, "")).join(", ")})`,
    letztesFenster.knoepfe.length === 6);
let schritt = 0;
const kaeufer = spieler(5);
setzeAntwort(() => (schritt++ === 0 ? { canceled: false, selection: 1 }
    : schritt === 2 ? { canceled: false, selection: 0 } : { canceled: true, cancelationReason: "UserClosed" }));
await f.zeigeBuch(kaeufer);
pruefe(`im Buch ausgebaut: Angriff Stufe ${f.gespeichert(kaeufer, "angriff")}, ${kaeufer.level} Level uebrig`,
    f.gespeichert(kaeufer, "angriff") === 1 && kaeufer.level === 3);

const gut = ergebnisse.every(Boolean);
console.log("\nAlles wie erwartet:", gut ? "ja" : "NEIN");
if (!gut) process.exit(1);
