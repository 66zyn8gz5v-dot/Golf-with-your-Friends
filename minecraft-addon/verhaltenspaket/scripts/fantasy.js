// Was die Fantasy-Wesen koennen (4.78).
//
// Fynn: "ein paar Fantasy-Tiere ... eher Drachen und sowas, was im
// Mittelalter eine grosse Rolle gespielt hat. Ein bisschen Elementtiere -
// wie eine Feuermuecke. Insekten finde ich cool."
//
// * Feuermuecke: Ihr Stich setzt in Brand. Die Glutflasche (eine gefangene
//   Muecke) zerspringt beim Aufprall in Flammen.
// * Sturmlibelle: Wer sie schlaegt, bekommt einen elektrischen Schlag - bei
//   Gewitter einen doppelt so starken. Der Sturmfluegel gibt im Gleitflug
//   einen Schub nach vorn.
// * Frostkaefer: rollt sich ein, wenn man ihn schlaegt, beisst mit Frost und
//   friert Wasser zu Eis. Der Frosttalisman laesst das Wasser unter einem
//   gefrieren (Feuerschutz gibt er ueber tiere.js, wie die anderen
//   Talismane).
// * Basilisk: Wer ihm in die Augen schaut, wird langsamer und erstarrt zu
//   Stein. Ein erhobener Schild wirft den Blick zurueck. Sein Auge laesst
//   andere erstarren.

import { world, system } from "@minecraft/server";
import { istKreativ } from "./boss_kern.js";
import { getragen } from "./tiere.js";

export const MUECKE = "fynn:feuermuecke";
export const LIBELLE = "fynn:sturmlibelle";
export const KAEFER = "fynn:frostkaefer";
export const BASILISK = "fynn:basilisk";
export const GLUTWURF = "fynn:glutflasche_wurf";
export const STURMFLUEGEL = "fynn:sturmfluegel";
export const FROSTTALISMAN = "fynn:frosttalisman";
export const BASILISKENAUGE = "fynn:basiliskenauge";

export const STICH = { brand: 4 };
export const SCHLAG = { schaden: 3, gewitter: 6 };
export const SCHUB = { kraft: 1.9, hoch: 0.25 };
export const FROST = { weite: 2, einrollen: 60, lahm: 60 };
export const BLICK = { weite: 16, erstarren: 60, pause: 100, starr: 60 };
export const AUGE = { weite: 24, dauer: 100 };

function lebt(w) {
    try { return !!w && w.isValid !== false; } catch (e) { return false; }
}

function block(dim, x, y, z) {
    try { return dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }); } catch (e) { return undefined; }
}

// ------------------------------------------------------------ Feuermuecke

export function stich(opfer) {
    try { opfer.setOnFire(STICH.brand, true); } catch (e) { /* manche brennen nicht */ }
}

/** Die Glutflasche zerspringt: Flammen rundum, wo Platz ist. */
export function glutPlatzt(dim, ort) {
    let feuer = 0;
    try {
        dim.spawnParticle("minecraft:lava_particle", ort);
        dim.spawnParticle("minecraft:basic_flame_particle", ort);
        dim.playSound("random.glass", ort, { volume: 1, pitch: 1.1 });
        dim.playSound("mob.blaze.shoot", ort, { volume: 0.8, pitch: 1.2 });
    } catch (e) { /* egal */ }
    for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const hier = block(dim, ort.x + dx, ort.y, ort.z + dz);
        const unten = block(dim, ort.x + dx, ort.y - 1, ort.z + dz);
        if (hier?.typeId === "minecraft:air" && unten && unten.typeId !== "minecraft:air" && !unten.isLiquid) {
            try { hier.setType("minecraft:fire"); feuer++; } catch (e) { /* egal */ }
        }
    }
    try {
        for (const w of dim.getEntities({ location: ort, maxDistance: 2.5 })) {
            if (w.typeId !== "minecraft:item") stich(w);
        }
    } catch (e) { /* egal */ }
    return feuer;
}

// ------------------------------------------------------------ Sturmlibelle

function gewitter(dim) {
    try { return dim.getWeather?.() === "Thunder"; } catch (e) { return false; }
}

export function libelleSchlaegt(libelle, taeter) {
    const staerke = gewitter(libelle.dimension) ? SCHLAG.gewitter : SCHLAG.schaden;
    try {
        taeter.applyDamage(staerke, { cause: "lightning", damagingEntity: libelle });
        const o = taeter.location;
        taeter.dimension.spawnParticle("minecraft:electric_spark_particle", { x: o.x, y: o.y + 1, z: o.z });
        taeter.dimension.playSound("ambient.weather.thunder", o, { volume: 0.25, pitch: 2 });
    } catch (e) { /* egal */ }
    return staerke;
}

/** Im Gleitflug: ein Schub in Blickrichtung. Kostet eine Ladung. */
export function sturmSchub(spieler) {
    if (!spieler.isGliding) {
        try { spieler.onScreenDisplay.setActionBar("§7Der Sturmflügel wirkt nur im Gleitflug mit der Elytra."); } catch (e) { /* egal */ }
        return false;
    }
    const b = spieler.getViewDirection();
    spieler.applyImpulse({ x: b.x * SCHUB.kraft, y: b.y * SCHUB.kraft + SCHUB.hoch, z: b.z * SCHUB.kraft });
    try {
        spieler.dimension.spawnParticle("minecraft:electric_spark_particle", spieler.location);
        spieler.dimension.playSound("item.trident.riptide_1", spieler.location, { volume: 0.8, pitch: 1.3 });
    } catch (e) { /* egal */ }
    if (!istKreativ(spieler)) abnutzen(spieler);
    return true;
}

function abnutzen(spieler) {
    try {
        const inv = spieler.getComponent("minecraft:inventory")?.container;
        const platz = spieler.selectedSlotIndex ?? 0;
        const ding = inv?.getItem(platz);
        const h = ding?.getComponent("minecraft:durability");
        if (!h) return;
        if (h.damage + 1 >= h.maxDurability) {
            inv.setItem(platz, undefined);
            spieler.dimension.playSound("random.break", spieler.location);
        } else {
            h.damage += 1;
            inv.setItem(platz, ding);
        }
    } catch (e) { /* egal */ }
}

// ------------------------------------------------------------ Frostkaefer

const gerollt = new Map();       // Kaefer-Id -> Takt, an dem er sich wieder ausrollt

export function kaeferGetroffen(kaefer, jetzt) {
    if (gerollt.has(kaefer.id)) return false;
    try { kaefer.triggerEvent("fynn:einrollen"); } catch (e) { return false; }
    gerollt.set(kaefer.id, { kaefer, bis: jetzt + FROST.einrollen });
    try { kaefer.dimension.playSound("block.glass.break", kaefer.location, { volume: 0.5, pitch: 1.6 }); } catch (e) { /* egal */ }
    return true;
}

export function ausrollTakt(jetzt) {
    for (const [id, g] of gerollt) {
        if (jetzt < g.bis) continue;
        gerollt.delete(id);
        if (lebt(g.kaefer)) {
            try { g.kaefer.triggerEvent("fynn:ausrollen"); } catch (e) { /* egal */ }
        }
    }
}

export function frostbiss(opfer) {
    try {
        opfer.addEffect("slowness", FROST.lahm, { amplifier: 2, showParticles: true });
        const o = opfer.location;
        opfer.dimension.spawnParticle("minecraft:snowflake_particle", { x: o.x, y: o.y + 1, z: o.z });
    } catch (e) { /* egal */ }
}

function stillesWasser(b) {
    if (!b || b.typeId !== "minecraft:water") return false;
    try { return (b.permutation?.getState?.("liquid_depth") ?? 0) === 0; } catch (e) { return true; }
}

/** Friert das Wasser unter und um einen Punkt zu tauendem Eis - wie Mojangs
 *  Frostlaeufer: Es schmilzt spaeter von selbst. */
export function friere(dim, o, weite = FROST.weite) {
    let eis = 0;
    const y = Math.floor(o.y) - 1;
    for (let dx = -weite; dx <= weite; dx++) {
        for (let dz = -weite; dz <= weite; dz++) {
            if (dx * dx + dz * dz > weite * weite + 1) continue;
            const b = block(dim, o.x + dx, y, o.z + dz);
            const drueber = block(dim, o.x + dx, y + 1, o.z + dz);
            if (!stillesWasser(b) || drueber?.typeId !== "minecraft:air") continue;
            try { b.setType("minecraft:frosted_ice"); eis++; } catch (e) { /* egal */ }
        }
    }
    return eis;
}

// ------------------------------------------------------------ Basilisk

const blicke = new Map();        // "Basilisk|Spieler" -> Ticks, die er schon hinschaut
const pause = new Map();         // Spieler-Id -> bis wann er nicht erstarren kann

function schildOben(spieler) {
    if (!spieler.isSneaking) return false;
    try {
        const a = spieler.getComponent("minecraft:equippable");
        return a?.getEquipment("Offhand")?.typeId === "minecraft:shield"
            || a?.getEquipment("Mainhand")?.typeId === "minecraft:shield";
    } catch (e) { return false; }
}

function schautAn(spieler, ziel) {
    try {
        const treffer = spieler.getEntitiesFromViewDirection({ maxDistance: BLICK.weite })[0];
        return treffer?.entity?.id === ziel.id;
    } catch (e) { return false; }
}

function blicktZu(basilisk, spieler) {
    try {
        const b = basilisk.getViewDirection();
        const d = { x: spieler.location.x - basilisk.location.x, z: spieler.location.z - basilisk.location.z };
        const l = Math.hypot(d.x, d.z) || 1;
        return (b.x * d.x + b.z * d.z) / l > 0.4;
    } catch (e) { return false; }
}

export function versteinere(ziel, dauer, stark = true) {
    try {
        ziel.addEffect("slowness", dauer, { amplifier: stark ? 5 : 3, showParticles: false });
        ziel.addEffect("mining_fatigue", dauer, { amplifier: 2, showParticles: false });
        ziel.addEffect("weakness", dauer, { amplifier: 1, showParticles: false });
        const o = ziel.location;
        ziel.dimension.spawnParticle("fynn:steinstaub", { x: o.x, y: o.y + 1, z: o.z });
        ziel.dimension.playSound("dig.stone", o, { volume: 1, pitch: 0.6 });
    } catch (e) { /* egal */ }
}

/** Ein Takt (alle 5 Ticks) fuer einen Basilisken und einen Spieler.
 *  Liefert, was geschah: "nichts", "starrt", "erstarrt", "zurueck". */
export function blickTakt(basilisk, spieler, jetzt) {
    const schluessel = `${basilisk.id}|${spieler.id}`;
    const bisher = blicke.get(schluessel) ?? 0;
    const nah = Math.hypot(spieler.location.x - basilisk.location.x, spieler.location.y - basilisk.location.y,
                           spieler.location.z - basilisk.location.z) <= BLICK.weite;
    if (!nah || istKreativ(spieler) || jetzt < (pause.get(spieler.id) ?? 0)
        || !schautAn(spieler, basilisk) || !blicktZu(basilisk, spieler)) {
        blicke.set(schluessel, Math.max(0, bisher - 10));
        return "nichts";
    }
    if (schildOben(spieler)) {
        // Der Schild wirft den Blick zurueck - jetzt erstarrt er selbst.
        blicke.set(schluessel, 0);
        pause.set(spieler.id, jetzt + BLICK.pause);
        versteinere(basilisk, BLICK.starr, true);
        try { spieler.onScreenDisplay.setActionBar("§aDein Schild wirft den Blick zurück – der Basilisk erstarrt!"); } catch (e) { /* egal */ }
        return "zurueck";
    }
    const zeit = bisher + 5;
    blicke.set(schluessel, zeit);
    try { basilisk.setProperty("fynn:starrt", true); } catch (e) { /* egal */ }
    if (zeit >= BLICK.erstarren) {
        blicke.set(schluessel, 0);
        pause.set(spieler.id, jetzt + BLICK.pause);
        versteinere(spieler, BLICK.starr, true);
        try {
            spieler.applyDamage(4, { cause: "magic", damagingEntity: basilisk });
            spieler.onScreenDisplay.setActionBar("§cDer Blick des Basilisken – du bist zu Stein erstarrt!");
        } catch (e) { /* egal */ }
        return "erstarrt";
    }
    try {
        spieler.addEffect("slowness", 20, { amplifier: Math.min(3, Math.floor(zeit / 15)), showParticles: false });
        spieler.onScreenDisplay.setActionBar("§7Deine Glieder werden schwer ... §fschau weg!");
    } catch (e) { /* egal */ }
    return "starrt";
}

/** Das Basiliskenauge: Wen man ansieht, der erstarrt. */
export function augeBenutzen(spieler) {
    let ziel;
    try { ziel = spieler.getEntitiesFromViewDirection({ maxDistance: AUGE.weite })[0]?.entity; } catch (e) { /* egal */ }
    if (!ziel) {
        try { spieler.onScreenDisplay.setActionBar("§7Das Auge findet niemanden in deinem Blick."); } catch (e) { /* egal */ }
        return false;
    }
    versteinere(ziel, AUGE.dauer, true);
    try { spieler.dimension.playSound("mob.evocation_illager.cast_spell", spieler.location, { volume: 0.7, pitch: 1.4 }); } catch (e) { /* egal */ }
    return true;
}

// ------------------------------------------------------------ Anbindung

world.afterEvents.entityHurt.subscribe((e) => {
    try {
        const taeter = e.damageSource?.damagingEntity;
        const opfer = e.hurtEntity;
        if (!opfer) return;
        if (taeter?.typeId === MUECKE) stich(opfer);
        else if (taeter?.typeId === KAEFER) frostbiss(opfer);
        if (opfer.typeId === LIBELLE && taeter && taeter.typeId !== LIBELLE && e.damageSource?.cause !== "lightning") {
            libelleSchlaegt(opfer, taeter);
        } else if (opfer.typeId === KAEFER) {
            kaeferGetroffen(opfer, system.currentTick);
        }
    } catch (fehler) {
        console.warn(`Fantasy, Treffer: ${fehler}`);
    }
});

world.afterEvents.projectileHitBlock.subscribe((e) => {
    try {
        if (e.projectile?.typeId !== GLUTWURF) return;
        const b = e.getBlockHit?.();
        const f = b?.face;
        const o = b?.block?.location ?? e.location;
        // Auf die Seite des Blocks, die getroffen wurde.
        const ort = { x: o.x + 0.5 + (f === "East" ? 1 : f === "West" ? -1 : 0),
                      y: o.y + (f === "Up" || !f ? 1 : f === "Down" ? -1 : 0),
                      z: o.z + 0.5 + (f === "South" ? 1 : f === "North" ? -1 : 0) };
        glutPlatzt(e.dimension, ort);
    } catch (fehler) {
        console.warn(`Glutflasche: ${fehler}`);
    }
});

world.afterEvents.projectileHitEntity.subscribe((e) => {
    try {
        if (e.projectile?.typeId !== GLUTWURF) return;
        const ziel = e.getEntityHit?.()?.entity;
        glutPlatzt(e.dimension, ziel?.location ?? e.location);
    } catch (fehler) {
        console.warn(`Glutflasche: ${fehler}`);
    }
});

world.afterEvents.itemUse.subscribe((e) => {
    try {
        const typ = e.itemStack?.typeId;
        if (typ === STURMFLUEGEL) sturmSchub(e.source);
        else if (typ === BASILISKENAUGE) augeBenutzen(e.source);
    } catch (fehler) {
        console.warn(`Fantasy, Gegenstand: ${fehler}`);
    }
});

system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        if (gerollt.size) ausrollTakt(jetzt);
        const welt = world.getDimension("overworld");
        // Basilisken: alle 5 Ticks, fuer jeden Spieler in der Naehe.
        const spieler = world.getAllPlayers();
        for (const b of welt.getEntities({ type: BASILISK })) {
            let jemand = false;
            for (const s of spieler) {
                try { if (blickTakt(b, s, jetzt) === "starrt") jemand = true; } catch (f) { /* egal */ }
            }
            if (!jemand) {
                try { if (b.getProperty("fynn:starrt")) b.setProperty("fynn:starrt", false); } catch (f) { /* egal */ }
            }
        }
        // Der Frosttalisman oft - sonst laeuft man schneller, als das Eis waechst.
        for (const s of spieler) {
            try {
                if (!s.isInWater && getragen(s).has(FROSTTALISMAN)) friere(s.dimension, s.location, 2);
            } catch (f) { /* egal */ }
        }
        if (jetzt % 20 !== 0) return;
        for (const k of welt.getEntities({ type: KAEFER })) {
            try { friere(k.dimension, k.location); } catch (f) { /* egal */ }
        }
    } catch (fehler) {
        console.warn(`Fantasy: ${fehler}`);
    }
}, 5);
