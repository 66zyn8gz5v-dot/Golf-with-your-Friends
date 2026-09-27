// Ruhm und Stufen: Der Spieler wird mit der Zeit staerker.
//
// Fynn: "Wir brauchen eine Art Level-System, damit der Spieler mit der Zeit
// staerker wird."
//
// Gezaehlt wird "Ruhm", nicht Minecrafts gruene Erfahrung: Die gibt man beim
// Verzaubern und am Amboss wieder aus, und dann wuerde man Stufen verlieren.
// Ruhm gibt es fuer jedes besiegte Monster, mehr fuer Ritter, Banditen und
// die grossen Vanilla-Gegner, am meisten fuer die drei Bosse. Er haengt am
// Spieler (eine Eigenschaft, die mit der Welt gespeichert wird) und geht nie
// verloren - auch nicht beim Tod.
//
// Die Stufe steht vor der Kraftleiste ueber der Schnellleiste; wer Ruhm
// bekommt, sieht kurz, wie viel und wie weit es noch zur naechsten Stufe
// ist. Was jede Stufe bringt, steht in BELOHNUNGEN.

import { world, system } from "@minecraft/server";
import { hinweis } from "./rollen.js";

const RUHM_SCHLUESSEL = "fynn:ruhm";
export const HOECHSTE_STUFE = 30;

// Ruhm je besiegtem Wesen. Alles andere, das Minecraft "monster" nennt,
// bringt STANDARD_MONSTER, friedliche Tiere bringen einen Punkt.
const RUHM_FUER = {
    "minecraft:zombie": 8, "minecraft:husk": 8, "minecraft:drowned": 8, "minecraft:zombie_villager": 8,
    "minecraft:skeleton": 8, "minecraft:stray": 9, "minecraft:bogged": 9, "minecraft:spider": 8,
    "minecraft:cave_spider": 8, "minecraft:creeper": 10, "minecraft:slime": 3, "minecraft:magma_cube": 4,
    "minecraft:enderman": 15, "minecraft:witch": 15, "minecraft:pillager": 12, "minecraft:vindicator": 15,
    "minecraft:evocation_illager": 30, "minecraft:ravager": 40, "minecraft:blaze": 12, "minecraft:ghast": 15,
    "minecraft:wither_skeleton": 15, "minecraft:piglin_brute": 25, "minecraft:guardian": 12,
    "minecraft:elder_guardian": 120, "minecraft:breeze": 20, "minecraft:warden": 400,
    "minecraft:wither": 500, "minecraft:ender_dragon": 800,
    "fynn:ritter": 20, "fynn:ritterhauptmann": 40, "fynn:bandit": 15, "fynn:wilderer": 15,
    "fynn:bandenchef": 40, "fynn:eiswolf": 10, "fynn:schattendoppelgaenger": 3,
};
const STANDARD_MONSTER = 6;
const TIER = 1;

// Die Bosse sterben nicht wie andere Wesen (sie verabschieden sich und
// verschwinden) - ihren Ruhm verteilt boss_kern.js mit der Beute, jeder
// Mitkaempfer bekommt ihn ganz.
export const BOSS_RUHM = { "fynn:roland": 300, "fynn:rabenfuerst": 350, "fynn:frostmammut": 400 };

// Wie viel Ruhm von Stufe n zu Stufe n+1 fuehrt: am Anfang schnell (sechs
// Zombies), spaeter langsamer. Bis Stufe 30 sind es gut 7000 - viele Abende,
// aber jeder Boss bringt einen ordentlichen Schritt.
export function bisNaechste(stufe) {
    return 30 + 15 * stufe;
}

export function stufeAus(ruhm) {
    let stufe = 1;
    let rest = ruhm;
    while (stufe < HOECHSTE_STUFE && rest >= bisNaechste(stufe)) {
        rest -= bisNaechste(stufe);
        stufe += 1;
    }
    return { stufe, rest, noetig: stufe < HOECHSTE_STUFE ? bisNaechste(stufe) : 0 };
}

export function ruhmVon(spieler) {
    try {
        return spieler.getDynamicProperty(RUHM_SCHLUESSEL) ?? 0;
    } catch (e) {
        return 0;
    }
}

export function stufeVon(spieler) {
    return stufeAus(ruhmVon(spieler)).stufe;
}

// ------------------------------------------------------------ Belohnungen

// Was eine Stufe bringt. Die Staerken sind Wirkungen, die nie auslaufen -
// mit Arten, die keine Waffe gibt (die Waffen geben Widerstand, Feuerfest,
// Sprungkraft, Tempo), damit sich nichts gegenseitig ueberschreibt.
export const BELOHNUNGEN = [
    { ab: 3, text: "Eile I - schneller abbauen" },
    { ab: 5, text: "+2 Herzen" },
    { ab: 8, text: "Kraft kommt schneller" },
    { ab: 10, text: "+4 Herzen" },
    { ab: 12, text: "Stärke I - mehr Schaden" },
    { ab: 15, text: "+6 Herzen" },
    { ab: 16, text: "Kraft kommt noch schneller" },
    { ab: 20, text: "+8 Herzen" },
    { ab: 24, text: "Kraft kommt am schnellsten" },
    { ab: 25, text: "+10 Herzen" },
    { ab: 30, text: "+12 Herzen und Stärke II" },
];

/** Welche dauerhaften Wirkungen eine Stufe gibt: [Wirkung, Staerke]. */
export function wirkungenFuer(stufe) {
    const liste = [];
    if (stufe >= 3) liste.push(["haste", 0]);
    // Extra-Herzen: Stufe 0 der Wirkung gibt zwei Herzen, jede weitere zwei mehr.
    if (stufe >= 5) liste.push(["health_boost", Math.floor(stufe / 5) - 1]);
    if (stufe >= 30) liste.push(["strength", 1]);
    else if (stufe >= 12) liste.push(["strength", 0]);
    return liste;
}

/** Wie viel Kraft je Nachschub dazukommt (rollen.js). */
export function kraftBonus(spieler) {
    const s = stufeVon(spieler);
    return s >= 24 ? 3 : s >= 16 ? 2 : s >= 8 ? 1 : 0;
}

// Lang, damit die Wirkung nicht staendig neu gesetzt wird - bei den
// Extra-Herzen koennte das sonst am Leben ruetteln. Aufgefrischt wird erst,
// wenn weniger als eine Minute uebrig ist, oder die Staerke nicht stimmt
// (neue Stufe, Milch getrunken, gestorben).
const DAUER = 20 * 60 * 20;
const AUFFRISCHEN = 20 * 60;

export function wirken(spieler) {
    for (const [id, staerke] of wirkungenFuer(stufeVon(spieler))) {
        let jetzt;
        try { jetzt = spieler.getEffect?.(id); } catch (e) { jetzt = undefined; }
        if (jetzt && jetzt.amplifier === staerke && jetzt.duration > AUFFRISCHEN) continue;
        try {
            if (jetzt && jetzt.amplifier !== staerke) spieler.removeEffect(id);
            spieler.addEffect(id, DAUER, { amplifier: staerke, showParticles: false });
        } catch (e) { /* egal */ }
    }
}

// ------------------------------------------------------------ Ruhm geben

export function gibRuhm(spieler, menge) {
    if (!menge || menge <= 0) return;
    const vorher = stufeAus(ruhmVon(spieler));
    const neu = ruhmVon(spieler) + menge;
    try { spieler.setDynamicProperty(RUHM_SCHLUESSEL, neu); } catch (e) { return; }
    const nachher = stufeAus(neu);
    if (nachher.stufe > vorher.stufe) {
        stufeErreicht(spieler, vorher.stufe, nachher.stufe);
    } else if (nachher.noetig) {
        hinweis(spieler, `§a+${menge} Ruhm §7(${nachher.rest}/${nachher.noetig})`, 40);
    } else {
        hinweis(spieler, `§a+${menge} Ruhm §7(höchste Stufe)`, 40);
    }
}

function stufeErreicht(spieler, von, bis) {
    const neu = BELOHNUNGEN.filter((b) => b.ab > von && b.ab <= bis).map((b) => b.text);
    try {
        spieler.onScreenDisplay.setTitle(`§6Stufe ${bis}`, {
            subtitle: neu.length ? `§e${neu.join(" · ")}` : "§7Dein Ruhm wächst",
            fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 15,
        });
        spieler.dimension.playSound("random.levelup", spieler.location, { volume: 0.8, pitch: 1.0 });
    } catch (e) { /* egal */ }
    wirken(spieler);
}

export function ruhmFuerWesen(wesen) {
    const typ = wesen?.typeId;
    if (!typ || typ === "minecraft:player") return 0;
    if (RUHM_FUER[typ] !== undefined) return RUHM_FUER[typ];
    try {
        const familien = wesen.getComponent?.("minecraft:type_family");
        if (familien?.hasTypeFamily?.("monster")) return STANDARD_MONSTER;
        if (familien?.hasTypeFamily?.("inanimate")) return 0;
    } catch (e) { /* unbekannt */ }
    return wesen.getComponent?.("minecraft:health") ? TIER : 0;
}

// Wer den letzten Schlag setzt, bekommt den Ruhm - auch mit Pfeil oder
// Feuerball: Dann meldet Minecraft den Schuetzen als Verursacher.
world.afterEvents.entityDie.subscribe((e) => {
    try {
        const taeter = e.damageSource?.damagingEntity;
        if (taeter?.typeId !== "minecraft:player") return;
        gibRuhm(taeter, ruhmFuerWesen(e.deadEntity));
    } catch (fehler) {
        console.warn(`Ruhm: ${fehler}`);
    }
});

// Die Staerken halten: alle zwei Sekunden nachsehen, nach dem Wiederbeleben
// sofort (der Tod nimmt alle Wirkungen).
system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try { wirken(spieler); } catch (e) { /* egal */ }
    }
}, 40);

world.afterEvents.playerSpawn.subscribe((e) => {
    try { wirken(e.player); } catch (fehler) { /* egal */ }
});
