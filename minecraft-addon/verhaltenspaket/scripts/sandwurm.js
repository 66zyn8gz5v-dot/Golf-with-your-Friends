// Der Sandwurm (4.79).
//
// Fynn: "Grosse Sandwuermer sind sehr cool."
//
// Er ist fast immer unter dem Sand: Man sieht nur einen wandernden
// Sandhuegel, der Boden bebt, Sand staubt auf. Er hoert Schritte - wer
// schleicht (oder eine Sandperle bei sich traegt), den findet er nicht.
// Kommt er einem Spieler nahe genug, bricht er direkt unter ihm aus dem
// Sand, schnappt zu und bleibt ein paar Sekunden stehen - nur dann kann
// man ihn treffen. Dann taucht er wieder ab.
//
// Der Ablauf, je Wurm:  unten -> auf (1,3 s) -> oben (5-8 s) -> ab (1,1 s) -> unten
// Die Bewegungen dazu spielt das Aussehen an den Eigenschaften fynn:unten,
// fynn:auf und fynn:ab; die Ereignisse im Verhalten schalten dazu, ob er
// getroffen werden kann.
//
// Der Sandklopfer: auf Sand benutzt, klopft er dreissig Sekunden lang, und
// jeder Wurm in der Naehe kommt zu ihm. Ist keiner da, lockt er einen an.

import { world, system } from "@minecraft/server";
import { istKreativ } from "./boss_kern.js";
import { getragen } from "./tiere.js";

export const WURM = "fynn:sandwurm";
export const PERLE = "fynn:sandperle";
export const KLOPFER = "fynn:sandklopfer";
export const ZEIT = { auf: 26, oben: [100, 160], ab: 22, pause: 100 };
export const NAH = 3.5;
export const BISS = 8;
export const KLOPFEN = { dauer: 600, weite: 64, locken: 200, abstand: 20 };
const SAND = new Set(["minecraft:sand", "minecraft:red_sand", "minecraft:sandstone", "minecraft:red_sandstone"]);

const wuermer = new Map();       // Id -> { phase, bis }
const beben = new Map();         // Spieler-Id -> Takt der letzten Warnung

function lebt(w) {
    try { return !!w && w.isValid !== false; } catch (e) { return false; }
}

function abstand(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}

function aufSand(dim, o) {
    try { return SAND.has(dim.getBlock({ x: Math.floor(o.x), y: Math.floor(o.y) - 1, z: Math.floor(o.z) })?.typeId); }
    catch (e) { return false; }
}

/** Hoert der Wurm diesen Spieler? Nicht, wer schleicht, im Kreativmodus
 *  ist oder eine Sandperle traegt. */
export function hoert(spieler) {
    if (spieler.isSneaking || istKreativ(spieler)) return false;
    try { return !getragen(spieler).has(PERLE); } catch (e) { return true; }
}

export function zustandVon(wurm) {
    let z = wuermer.get(wurm.id);
    if (!z) {
        let unten = true;
        try { unten = wurm.getProperty("fynn:unten") !== false; } catch (e) { /* egal */ }
        z = { phase: unten ? "unten" : "oben", bis: 0 };
        wuermer.set(wurm.id, z);
    }
    return z;
}

function knall(wurm) {
    const o = wurm.location;
    try {
        for (const dy of [0, 0.8, 1.6]) wurm.dimension.spawnParticle("fynn:sandstaub", { x: o.x, y: o.y + dy, z: o.z });
        wurm.dimension.playSound("mob.ravager.roar", o, { volume: 2, pitch: 0.5 });
        wurm.dimension.playSound("dig.sand", o, { volume: 2, pitch: 0.6 });
    } catch (e) { /* egal */ }
}

/** Er bricht aus dem Sand - unter dem Ziel, wenn es eins gibt. */
export function auftauchen(wurm, jetzt, ziel) {
    const z = zustandVon(wurm);
    if (ziel) {
        try { wurm.teleport({ x: ziel.location.x, y: wurm.location.y, z: ziel.location.z }); } catch (e) { /* egal */ }
    }
    try { wurm.triggerEvent("fynn:auftauchen"); } catch (e) { return false; }
    z.phase = "auf";
    z.bis = jetzt + ZEIT.auf;
    knall(wurm);
    // Wer direkt darueber steht, wird gepackt und hochgeschleudert.
    let opfer = [];
    try { opfer = wurm.dimension.getEntities({ location: wurm.location, maxDistance: 2.5 }); } catch (e) { /* egal */ }
    for (const o of opfer) {
        if (o.id === wurm.id || o.typeId === "minecraft:item") continue;
        if (o.typeId === "minecraft:player" && istKreativ(o)) continue;
        try { o.applyDamage(BISS, { cause: "entityAttack", damagingEntity: wurm }); } catch (e) { /* egal */ }
        try { o.applyKnockback({ x: 0, z: 0 }, 0.9); } catch (e) {
            try { o.applyKnockback(0, 0, 0, 0.9); } catch (f) { /* egal */ }
        }
    }
    return true;
}

/** Ein Takt (alle 5 Ticks) fuer einen Wurm. */
export function wurmTakt(wurm, spieler, jetzt, zufall = Math.random) {
    const z = zustandVon(wurm);
    if (z.phase === "unten") {
        const o = wurm.location;
        try {
            wurm.dimension.spawnParticle("fynn:sandstaub", o);
            if ((z.rumpeln = (z.rumpeln ?? 0) + 1) % 4 === 0) wurm.dimension.playSound("dig.sand", o, { volume: 1.6, pitch: 0.4 });
        } catch (e) { /* egal */ }
        for (const s of spieler) {
            const weit = abstand(s.location, o);
            if (weit < 12 && jetzt - (beben.get(s.id) ?? -200) >= 100) {
                beben.set(s.id, jetzt);
                try {
                    s.runCommand?.("camerashake add @s 0.2 0.8 positional");
                    s.onScreenDisplay.setActionBar("§6Der Sand bebt unter deinen Füßen ... §7(schleichen!)");
                } catch (e) { /* egal */ }
            }
        }
        if (jetzt < z.bis) return "unten";
        const ziel = spieler.find((s) => abstand(s.location, o) <= NAH && Math.abs(s.location.y - o.y) < 4 && hoert(s));
        if (ziel && auftauchen(wurm, jetzt, ziel)) return "taucht auf";
        return "unten";
    }
    if (jetzt < z.bis) return z.phase;
    if (z.phase === "auf") {
        try { wurm.triggerEvent("fynn:steht"); } catch (e) { /* egal */ }
        z.phase = "oben";
        z.bis = jetzt + ZEIT.oben[0] + Math.floor(zufall() * (ZEIT.oben[1] - ZEIT.oben[0]));
        return "oben";
    }
    if (z.phase === "oben") {
        try { wurm.triggerEvent("fynn:abtauchen"); } catch (e) { /* egal */ }
        z.phase = "ab";
        z.bis = jetzt + ZEIT.ab;
        try { wurm.dimension.playSound("dig.sand", wurm.location, { volume: 2, pitch: 0.5 }); } catch (e) { /* egal */ }
        return "taucht ab";
    }
    try { wurm.triggerEvent("fynn:versunken"); } catch (e) { /* egal */ }
    z.phase = "unten";
    z.bis = jetzt + ZEIT.pause;
    return "versunken";
}

// ------------------------------------------------------------ Sandklopfer

const klopfer = [];              // { dim, ort, bis, beginn, gelockt }

export function klopferSetzen(spieler, jetzt) {
    if (!aufSand(spieler.dimension, spieler.location)) {
        try { spieler.onScreenDisplay.setActionBar("§7Der Sandklopfer wirkt nur auf Sand."); } catch (e) { /* egal */ }
        return false;
    }
    const o = spieler.location;
    klopfer.push({ dim: spieler.dimension, ort: { x: o.x, y: o.y, z: o.z }, bis: jetzt + KLOPFEN.dauer,
                   beginn: jetzt, gelockt: false });
    if (!istKreativ(spieler)) {
        try {
            const inv = spieler.getComponent("minecraft:inventory")?.container;
            const platz = spieler.selectedSlotIndex ?? 0;
            const ding = inv?.getItem(platz);
            if (ding && ding.amount > 1) { ding.amount -= 1; inv.setItem(platz, ding); } else inv?.setItem(platz, undefined);
        } catch (e) { /* egal */ }
    }
    try { spieler.onScreenDisplay.setActionBar("§6Der Klopfer schlägt ... §7die Würmer kommen."); } catch (e) { /* egal */ }
    return true;
}

export function klopfTakt(jetzt, zufall = Math.random) {
    for (let i = klopfer.length - 1; i >= 0; i--) {
        const k = klopfer[i];
        if (jetzt >= k.bis) { klopfer.splice(i, 1); continue; }
        try {
            if (jetzt >= (k.schlag ?? 0)) {
                k.schlag = jetzt + 20;
                k.dim.playSound("note.bd", k.ort, { volume: 2, pitch: 0.5 });
                k.dim.spawnParticle("fynn:sandstaub", k.ort);
            }
        } catch (e) { /* egal */ }
        let nahe = [];
        try {
            nahe = k.dim.getEntities({ type: WURM, location: k.ort, maxDistance: KLOPFEN.weite });
        } catch (e) { /* egal */ }
        let gefressen = false;
        for (const w of nahe) {
            const z = zustandVon(w);
            if (z.phase !== "unten") continue;
            const d = abstand(w.location, k.ort);
            if (d <= NAH) {
                // Er hat den Klopfer erreicht - und verschlingt ihn.
                auftauchen(w, jetzt, undefined);
                gefressen = true;
                break;
            }
            const l = d || 1;
            try { w.applyImpulse({ x: (k.ort.x - w.location.x) / l * 0.18, y: 0, z: (k.ort.z - w.location.z) / l * 0.18 }); }
            catch (e) { /* egal */ }
        }
        if (gefressen) { klopfer.splice(i, 1); continue; }
        // Kein Wurm in der Naehe: Nach zehn Sekunden kommt einer von weiter her.
        if (!nahe.length && !k.gelockt && jetzt - k.beginn >= KLOPFEN.locken) {
            k.gelockt = true;
            const w = zufall() * Math.PI * 2;
            try {
                k.dim.spawnEntity(WURM, { x: k.ort.x + Math.cos(w) * KLOPFEN.abstand, y: k.ort.y,
                                          z: k.ort.z + Math.sin(w) * KLOPFEN.abstand });
            } catch (e) { /* egal */ }
        }
    }
}

// ------------------------------------------------------------ Anbindung

world.afterEvents.itemUse.subscribe((e) => {
    try {
        if (e.itemStack?.typeId === KLOPFER) klopferSetzen(e.source, system.currentTick);
    } catch (fehler) {
        console.warn(`Sandklopfer: ${fehler}`);
    }
});

world.afterEvents.entityDie.subscribe((e) => {
    try { wuermer.delete(e.deadEntity?.id); } catch (fehler) { /* egal */ }
});

let runde = 0;
system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        const r = runde++;
        const spieler = world.getAllPlayers();
        for (const w of world.getDimension("overworld").getEntities({ type: WURM })) {
            try { wurmTakt(w, spieler.filter((s) => s.dimension?.id === w.dimension?.id), jetzt); } catch (f) { /* egal */ }
        }
        if (klopfer.length) klopfTakt(jetzt);
        // Die Sandperle: auf Sand leichtfuessig.
        if (r % 4 === 0) {
            for (const s of spieler) {
                try {
                    if (getragen(s).has(PERLE) && aufSand(s.dimension, s.location)) {
                        s.addEffect("speed", 30, { amplifier: 0, showParticles: false });
                    }
                } catch (f) { /* egal */ }
            }
        }
    } catch (fehler) {
        console.warn(`Sandwurm: ${fehler}`);
    }
}, 5);
