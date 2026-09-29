// Der Greif (4.83): reiten und fliegen.
//
// Fynn waehlte: "Greif - Adlerkopf, Loewenkoerper, Fluegel ... zaehmbar mit
// rohem Fleisch, und dann REITBAR und FLIEGT mit dir."
//
// Zaehmen, Satteln und Reiten am Boden laufen wie beim Elch (tiere_bauen.py,
// reittier). Minecraft kennt aber kein Reittier, das man fliegen lenkt - das
// macht dieses Skript, jeden Tick fuer jeden gerittenen Greif:
//
// * Sprungtaste halten: Er schlaegt mit den Schwingen und steigt.
// * In der Luft fliegt er dahin, wohin der Reiter schaut - schaut man nach
//   unten, sinkt er, schaut man hoch, steigt er langsam.
// * Er faellt dabei nie wie ein Stein (Sanfter Fall), und der Reiter
//   bekommt keinen Fallschaden.
//
// Die Greifenfeder: Wer sie in der Schnellleiste hat und tief faellt,
// schwebt sanft hinunter.

import { world, system } from "@minecraft/server";
import { getragen } from "./tiere.js";

export const GREIF = "fynn:greif";
export const FEDER = "fynn:greifenfeder";
export const FLUG = { tempo: 0.95, steigen: 0.11, nachziehen: 0.14, schwebe: 0.035, hoechstSteigen: 0.55 };

function reiterVon(greif) {
    try { return greif.getComponent("minecraft:rideable")?.getRiders?.()?.[0]; } catch (e) { return undefined; }
}

function springt(spieler) {
    try {
        if (spieler.isJumping) return true;
        return spieler.inputInfo?.getButtonState?.("Jump") === "Pressed";
    } catch (e) {
        return false;
    }
}

/** Ein Tick fuer einen Greif. Liefert, was er tut. */
export function flugTakt(greif) {
    const reiter = reiterVon(greif);
    const amBoden = !!greif.isOnGround;
    try {
        const war = !!greif.getProperty("fynn:fliegt");
        if (war === amBoden) greif.setProperty("fynn:fliegt", !amBoden);
    } catch (e) { /* egal */ }
    if (!reiter) return amBoden ? "steht" : "gleitet";
    let v = { x: 0, y: 0, z: 0 };
    try { v = greif.getVelocity(); } catch (e) { /* egal */ }
    if (springt(reiter)) {
        // Steigen - aber nicht schneller als ein kraeftiger Fluegelschlag.
        if (v.y < FLUG.hoechstSteigen) greif.applyImpulse({ x: 0, y: FLUG.steigen, z: 0 });
        try { if (Math.random() < 0.1) greif.dimension.playSound("mob.enderdragon.flap", greif.location, { volume: 0.8, pitch: 1.6 }); }
        catch (e) { /* egal */ }
        if (amBoden) return "hebt ab";
    }
    if (amBoden) return "laeuft";
    // In der Luft: dahin, wohin der Reiter schaut.
    const b = reiter.getViewDirection();
    const ziel = { x: b.x * FLUG.tempo, y: b.y * FLUG.tempo * 0.8, z: b.z * FLUG.tempo };
    greif.applyImpulse({
        x: (ziel.x - v.x) * FLUG.nachziehen,
        y: (ziel.y - v.y) * FLUG.nachziehen + FLUG.schwebe,
        z: (ziel.z - v.z) * FLUG.nachziehen,
    });
    try {
        greif.addEffect("slow_falling", 10, { showParticles: false });
        reiter.addEffect("slow_falling", 60, { showParticles: false });
    } catch (e) { /* egal */ }
    return "fliegt";
}

/** Die Greifenfeder: tief fallen, sanft landen. */
export function federTakt(spieler) {
    try {
        if (spieler.isOnGround || spieler.isGliding || spieler.isInWater) return false;
        if (spieler.getVelocity().y > -0.7) return false;
        if (!getragen(spieler).has(FEDER)) return false;
        spieler.addEffect("slow_falling", 40, { showParticles: false });
        return true;
    } catch (e) {
        return false;
    }
}

let runde = 0;
system.runInterval(() => {
    try {
        const r = runde++;
        for (const g of world.getDimension("overworld").getEntities({ type: GREIF })) {
            try { flugTakt(g); } catch (f) { /* egal */ }
        }
        if (r % 5 === 0) {
            for (const s of world.getAllPlayers()) federTakt(s);
        }
    } catch (fehler) {
        console.warn(`Greif: ${fehler}`);
    }
}, 1);
