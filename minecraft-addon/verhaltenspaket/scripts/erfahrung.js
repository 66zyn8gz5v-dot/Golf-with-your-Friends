// Mehr Erfahrung: Monster geben mehr, und manche lassen etwas fallen.
//
// Fynn (4.71): "Ich haette gerne, dass es Drops gibt, und die geben
// Erfahrung. Und man kann auch mit der normalen Erfahrung leveln. Es soll
// ein Erfahrungsgefaess geben, wo Erfahrungspunkte gespeichert sind - das
// gibt sofort 15 Level, egal auf welchem Level man ist. Die anderen Mobs
// sollen einfach mehr Level droppen."
//
// Gezaehlt wird Minecrafts eigene Erfahrung - die gruene Leiste. Mit den
// Leveln baut man im Buch der Faehigkeiten seine Staerken aus
// (faehigkeiten.js). Dieses Skript sorgt nur dafuer, dass es genug davon
// gibt:
//
// * Wer ein Monster besiegt, bekommt zu Minecrafts Kugeln noch Erfahrung
//   obendrauf (EXTRA).
// * Monster lassen manchmal einen Erfahrungsfunken fallen (50 Punkte),
//   starke Gegner ein Erfahrungsgefaess (15 Level auf einen Schlag).
// * Bosse geben jedem Mitkaempfer Level (BOSS_LEVEL) und immer ein Gefaess
//   in der Beute.

import { world, ItemStack } from "@minecraft/server";
import { verbrauche, istKreativ, ruht } from "./boss_kern.js";

export const FUNKE = "fynn:erfahrungsfunke";
export const GEFAESS = "fynn:erfahrungsgefaess";
export const FUNKE_PUNKTE = 50;
export const GEFAESS_LEVEL = 15;

// Erfahrungspunkte zusaetzlich zu Minecrafts Kugeln. Ein Zombie gibt von
// sich aus 5 - mit dem Zuschlag also 13.
const EXTRA = {
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
// Seit 4.72 kosten die Faehigkeiten viel mehr (bis 50 Stufen, Stufe n kostet
// n Level) - darum zaehlt jeder Zuschlag doppelt.
const ZUSCHLAG = 2;

// Die Chance auf ein Gefaess bei starken Gegnern (sonst keine).
const GEFAESS_CHANCE = {
    "fynn:ritterhauptmann": 0.12, "fynn:bandenchef": 0.12, "minecraft:evocation_illager": 0.2,
    "minecraft:ravager": 0.25, "minecraft:piglin_brute": 0.15, "minecraft:elder_guardian": 1,
    "minecraft:warden": 1, "minecraft:wither": 1, "minecraft:ender_dragon": 1,
};
const FUNKE_CHANCE = 0.2;

// Bosse verschwinden nach dem Abschied statt zu sterben - ihre Level gibt
// boss_kern.js mit der Beute, jedem Mitkaempfer ganz.
export const BOSS_LEVEL = { "fynn:roland": 8, "fynn:rabenfuerst": 9, "fynn:frostmammut": 10 };

function istMonster(wesen) {
    try {
        return !!wesen.getComponent?.("minecraft:type_family")?.hasTypeFamily?.("monster");
    } catch (e) {
        return false;
    }
}

export function extraFuer(wesen) {
    const typ = wesen?.typeId;
    if (!typ || typ === "minecraft:player") return 0;
    if (EXTRA[typ] !== undefined) return EXTRA[typ] * ZUSCHLAG;
    return istMonster(wesen) ? STANDARD_MONSTER * ZUSCHLAG : 0;
}

/** Was ein besiegtes Wesen fallen laesst: [Gegenstand, Anzahl]. */
export function dropsFuer(wesen, zufall = Math.random) {
    const typ = wesen?.typeId;
    const liste = [];
    if (GEFAESS_CHANCE[typ] && zufall() < GEFAESS_CHANCE[typ]) liste.push([GEFAESS, 1]);
    if ((EXTRA[typ] !== undefined || istMonster(wesen)) && zufall() < FUNKE_CHANCE) {
        liste.push([FUNKE, zufall() < 0.3 ? 2 : 1]);
    }
    return liste;
}

// Wer den letzten Schlag setzt, bekommt den Zuschlag - auch mit Pfeil oder
// Feuerball: Dann meldet Minecraft den Schuetzen als Verursacher.
world.afterEvents.entityDie.subscribe((e) => {
    try {
        const taeter = e.damageSource?.damagingEntity;
        if (taeter?.typeId !== "minecraft:player") return;
        const tot = e.deadEntity;
        const extra = extraFuer(tot);
        if (extra > 0) taeter.addExperience(extra);
        let ort;
        try { ort = tot.location; } catch (f) { return; }
        for (const [typ, anzahl] of dropsFuer(tot)) {
            try { tot.dimension.spawnItem(new ItemStack(typ, anzahl), ort); } catch (f) { /* egal */ }
        }
    } catch (fehler) {
        console.warn(`Erfahrung: ${fehler}`);
    }
});

// ------------------------------------------------------------ Benutzen

export function funkeBenutzen(spieler) {
    if (ruht(spieler, "erfahrungsfunke", 4)) return false;
    spieler.addExperience(FUNKE_PUNKTE);
    try { spieler.dimension.playSound("random.orb", spieler.location, { volume: 0.8, pitch: 1.2 }); } catch (e) { /* egal */ }
    if (!istKreativ(spieler)) verbrauche(spieler);
    return true;
}

export function gefaessBenutzen(spieler) {
    if (ruht(spieler, "erfahrungsgefaess", 20)) return false;
    // Genau 15 Level - egal, auf welchem Level man steht (Fynns Wunsch):
    // Minecrafts Punkte wuerden oben immer weniger Level ergeben.
    spieler.addLevels(GEFAESS_LEVEL);
    try {
        spieler.dimension.playSound("random.levelup", spieler.location, { volume: 1, pitch: 0.9 });
        spieler.onScreenDisplay.setTitle(`§a+${GEFAESS_LEVEL} Level`, {
            subtitle: "§7Im Buch der Fähigkeiten kannst du sie ausgeben",
            fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 10,
        });
    } catch (e) { /* egal */ }
    if (!istKreativ(spieler)) verbrauche(spieler);
    return true;
}

world.afterEvents.itemUse.subscribe((e) => {
    try {
        const typ = e.itemStack?.typeId;
        if (typ === FUNKE) funkeBenutzen(e.source);
        else if (typ === GEFAESS) gefaessBenutzen(e.source);
    } catch (fehler) {
        console.warn(`Erfahrung, Gegenstand: ${fehler}`);
    }
});
