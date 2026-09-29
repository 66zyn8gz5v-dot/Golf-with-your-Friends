// Was die Fantasy-Wesen der zweiten Welle koennen (4.81).
//
// Fynn: "Mach am besten sechs neue Mobs."
//
// * Glutskorpion: Sein Stich setzt in Brand. (Der Glutpfeil aus seinem
//   Stachel steht bei den Erzpfeilen in pfeile.js.)
// * Kristallspinne: Hat sie ein Ziel, spinnt sie ein Netz um es - es haelt
//   fest und vergeht nach ein paar Sekunden wieder.
// * Irrlicht: Kommt man naeher, weicht es aus. Wer ihm eine halbe Minute
//   folgt, den fuehrt es zu einem Schatz - oder in eine Falle. Schlaegt man
//   es, verlischt es. Die Irrlichtflasche macht dort, wo sie zerspringt,
//   drei Minuten lang Licht.

import { world, system, ItemStack, BlockPermutation } from "@minecraft/server";
import { istKreativ } from "./boss_kern.js";

export const SKORPION = "fynn:glutskorpion";
export const SPINNE = "fynn:kristallspinne";
export const IRRLICHT = "fynn:irrlicht";
export const LICHTWURF = "fynn:irrlichtflasche_wurf";

export const NETZ = { weite: 10, pause: 200, halten: 100, dauer: 20 };
export const LOCKEN = { weite: 16, nah: 6, folgen: 600, schatz: 0.6 };
export const LICHT = { dauer: 3600 };

function lebt(w) {
    try { return !!w && w.isValid !== false; } catch (e) { return false; }
}

function block(dim, x, y, z) {
    try { return dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }); } catch (e) { return undefined; }
}

function weite(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

// ------------------------------------------------------------ Glutskorpion

export function skorpionStich(opfer) {
    try { opfer.setOnFire(4, true); return true; } catch (e) { return false; }
}

// ------------------------------------------------------------ Kristallspinne

const netzPause = new Map();     // Spinnen-Id -> Takt
const netze = [];                // { dim, ort, bis }
const spinnend = new Map();      // Spinnen-Id -> Takt, bis dahin spinnt sie

export function netzTakt(spinne, jetzt) {
    if (spinnend.has(spinne.id) && jetzt >= spinnend.get(spinne.id)) {
        spinnend.delete(spinne.id);
        try { spinne.setProperty("fynn:spinnt", false); } catch (e) { /* egal */ }
    }
    let ziel;
    try { ziel = spinne.target; } catch (e) { /* egal */ }
    if (!lebt(ziel) || jetzt < (netzPause.get(spinne.id) ?? 0)) return false;
    if (ziel.typeId === "minecraft:player" && istKreativ(ziel)) return false;
    if (weite(spinne.location, ziel.location) > NETZ.weite) return false;
    const fuss = block(ziel.dimension, ziel.location.x, ziel.location.y, ziel.location.z);
    if (!fuss || fuss.typeId !== "minecraft:air") return false;
    try { fuss.setType("minecraft:web"); } catch (e) { return false; }
    netze.push({ dim: ziel.dimension, ort: { ...fuss.location }, bis: jetzt + NETZ.halten });
    netzPause.set(spinne.id, jetzt + NETZ.pause);
    spinnend.set(spinne.id, jetzt + NETZ.dauer);
    try {
        spinne.setProperty("fynn:spinnt", true);
        ziel.dimension.spawnParticle("minecraft:enchanting_table_particle", ziel.location);
        spinne.dimension.playSound("mob.spider.say", spinne.location, { volume: 1, pitch: 1.4 });
    } catch (e) { /* egal */ }
    return true;
}

export function netzeTakt(jetzt) {
    for (let i = netze.length - 1; i >= 0; i--) {
        const n = netze[i];
        if (jetzt < n.bis) continue;
        netze.splice(i, 1);
        const b = block(n.dim, n.ort.x, n.ort.y, n.ort.z);
        if (b?.typeId === "minecraft:web") {
            try { b.setType("minecraft:air"); } catch (e) { /* egal */ }
        }
    }
}

// ------------------------------------------------------------ Irrlicht

const lockend = new Map();       // Irrlicht-Id -> { folgen }

function naechster(irrlicht, spieler) {
    let best, bestWeite = LOCKEN.weite;
    for (const s of spieler) {
        if (istKreativ(s)) continue;
        const w = weite(s.location, irrlicht.location);
        if (w <= bestWeite) { best = s; bestWeite = w; }
    }
    return best ? { spieler: best, weite: bestWeite } : undefined;
}

function boden(dim, o) {
    for (let dy = 0; dy < 10; dy++) {
        const b = block(dim, o.x, o.y - dy - 1, o.z);
        if (b && b.typeId !== "minecraft:air") return { x: o.x, y: Math.floor(o.y - dy), z: o.z };
    }
    return { ...o };
}

/** Am Ende der Verfolgung: Schatz oder Falle. */
export function ende(irrlicht, spieler, zufall = Math.random) {
    const dim = irrlicht.dimension;
    const ort = boden(dim, irrlicht.location);
    let was;
    if (zufall() < LOCKEN.schatz) {
        was = "schatz";
        const beute = [["minecraft:gold_nugget", 4 + Math.floor(zufall() * 6)],
                       ["minecraft:emerald", 1 + Math.floor(zufall() * 2)],
                       ["fynn:erfahrungsfunke", 1 + Math.floor(zufall() * 2)]];
        if (zufall() < 0.15) beute.push(["minecraft:diamond", 1]);
        for (const [typ, n] of beute) {
            try { dim.spawnItem(new ItemStack(typ, n), ort); } catch (e) { /* egal */ }
        }
        try {
            dim.spawnParticle("minecraft:totem_particle", ort);
            dim.playSound("random.levelup", ort, { volume: 1, pitch: 1.2 });
            spieler?.onScreenDisplay.setActionBar("§aDas Irrlicht hat dich zu einem Schatz geführt!");
        } catch (e) { /* egal */ }
    } else {
        was = "falle";
        const nass = block(dim, ort.x, ort.y, ort.z)?.typeId === "minecraft:water";
        for (let i = 0; i < 2; i++) {
            try { dim.spawnEntity(nass ? "minecraft:drowned" : "minecraft:zombie", { x: ort.x + i * 1.5 - 0.75, y: ort.y, z: ort.z }); }
            catch (e) { /* egal */ }
        }
        try {
            dim.playSound("mob.witch.celebrate", ort, { volume: 1, pitch: 0.8 });
            spieler?.onScreenDisplay.setActionBar("§5Eine Falle! Das Irrlicht hat dich in die Irre geführt.");
        } catch (e) { /* egal */ }
    }
    try { irrlicht.triggerEvent("fynn:verschwinden"); } catch (e) { /* egal */ }
    lockend.delete(irrlicht.id);
    return was;
}

/** Ein Takt (alle 10 Ticks) fuer ein Irrlicht. */
export function irrlichtTakt(irrlicht, spieler, zufall = Math.random) {
    const z = lockend.get(irrlicht.id) ?? { folgen: 0 };
    lockend.set(irrlicht.id, z);
    const n = naechster(irrlicht, spieler);
    if (!n) {
        z.folgen = Math.max(0, z.folgen - 20);
        try { if (irrlicht.getProperty("fynn:lockt")) irrlicht.setProperty("fynn:lockt", false); } catch (e) { /* egal */ }
        return "wartet";
    }
    z.folgen += 10;
    try { if (!irrlicht.getProperty("fynn:lockt")) irrlicht.setProperty("fynn:lockt", true); } catch (e) { /* egal */ }
    if (z.folgen >= LOCKEN.folgen) return ende(irrlicht, n.spieler, zufall);
    if (n.weite < LOCKEN.nah) {
        // Zurueckweichen - immer ein Stueck voraus, knapp ueber dem Boden.
        const d = { x: irrlicht.location.x - n.spieler.location.x, z: irrlicht.location.z - n.spieler.location.z };
        const l = Math.hypot(d.x, d.z) || 1;
        const hoch = irrlicht.location.y < n.spieler.location.y + 1.2 ? 0.08 : 0;
        try { irrlicht.applyImpulse({ x: d.x / l * 0.35, y: hoch, z: d.z / l * 0.35 }); } catch (e) { /* egal */ }
        return "weicht aus";
    }
    return "lockt";
}

// ------------------------------------------------------------ Irrlichtflasche

const lichter = [];              // { dim, ort, bis }

export function lichtSetzen(dim, ort, jetzt) {
    const b = block(dim, ort.x, ort.y, ort.z);
    if (!b || b.typeId !== "minecraft:air") return false;
    let gesetzt = false;
    for (const art of ["minecraft:light_block_15", "minecraft:light_block"]) {
        try {
            if (art === "minecraft:light_block") b.setPermutation(BlockPermutation.resolve(art, { block_light_level: 15 }));
            else b.setType(art);
            gesetzt = true;
            break;
        } catch (e) { /* die naechste Schreibweise versuchen */ }
    }
    if (!gesetzt) return false;
    lichter.push({ dim, ort: { ...b.location }, bis: jetzt + LICHT.dauer });
    try {
        dim.spawnParticle("minecraft:totem_particle", ort);
        dim.playSound("random.glass", ort, { volume: 1, pitch: 1.4 });
    } catch (e) { /* egal */ }
    return true;
}

export function lichterTakt(jetzt) {
    for (let i = lichter.length - 1; i >= 0; i--) {
        const l = lichter[i];
        if (jetzt < l.bis) continue;
        lichter.splice(i, 1);
        const b = block(l.dim, l.ort.x, l.ort.y, l.ort.z);
        if (b?.typeId?.startsWith("minecraft:light_block")) {
            try { b.setType("minecraft:air"); } catch (e) { /* egal */ }
        }
    }
}

// ------------------------------------------------------------ Werwolf (4.82)

export const WERWOLF = "fynn:werwolf";
export const GOLEM = "fynn:moosgolem";
export const WANDELN = { dauer: 30 };
// Wann der Wolf herauskommt: nachts, wenn der Mond voll oder fast voll ist
// (0 Vollmond, 1 und 7 die Naechte davor und danach).
const HELLE_MONDE = new Set([0, 1, 7]);

export function mondnacht(zeit, mond) {
    return zeit >= 13000 && zeit <= 23000 && HELLE_MONDE.has(mond);
}

const wandelnd = new Map();      // Werwolf-Id -> { bis, zumWolf }

/** Ein Takt (alle 20 Ticks): Passt die Gestalt zur Nacht? */
export function werwolfTakt(werwolf, jetzt, nachtJetzt) {
    const w = wandelnd.get(werwolf.id);
    if (w) {
        if (jetzt < w.bis) return "wandelt";
        wandelnd.delete(werwolf.id);
        try {
            werwolf.triggerEvent(w.zumWolf ? "fynn:zum_wolf" : "fynn:zum_menschen");
            if (w.zumWolf) werwolf.dimension.playSound("mob.wolf.howl", werwolf.location, { volume: 3, pitch: 0.5 });
        } catch (e) { /* egal */ }
        return w.zumWolf ? "ist Wolf" : "ist Mensch";
    }
    let istWolf = false;
    try { istWolf = !!werwolf.getProperty("fynn:wolf"); } catch (e) { /* egal */ }
    if (istWolf === nachtJetzt) return istWolf ? "Wolf" : "Mensch";
    try { werwolf.triggerEvent("fynn:wandeln"); } catch (e) { return "?"; }
    wandelnd.set(werwolf.id, { bis: jetzt + WANDELN.dauer, zumWolf: nachtJetzt });
    try { werwolf.dimension.playSound("mob.wolf.growl", werwolf.location, { volume: 2, pitch: 0.5 }); } catch (e) { /* egal */ }
    return "beginnt";
}

/** Silber trifft den Wolf doppelt - der Rest nur halb (siehe Verhalten). */
export function silberTreffer(werwolf, taeter, schaden) {
    let wolf = false;
    try { wolf = !!werwolf.getProperty("fynn:wolf"); } catch (e) { return 0; }
    if (!wolf || taeter?.typeId !== "minecraft:player") return 0;
    let waffe;
    try { waffe = taeter.getComponent("minecraft:equippable")?.getEquipment("Mainhand")?.typeId; } catch (e) { /* egal */ }
    if (!waffe || !waffe.includes("silber")) return 0;
    // Das Verhalten hat den Schlag halbiert: dreimal so viel obendrauf ergibt
    // das Doppelte des vollen Schlags.
    const extra = schaden * 3;
    try {
        werwolf.applyDamage(extra, { cause: "magic", damagingEntity: taeter });
        werwolf.dimension.spawnParticle("minecraft:endrod", { x: werwolf.location.x, y: werwolf.location.y + 1.5, z: werwolf.location.z });
    } catch (e) { /* egal */ }
    return extra;
}

// ------------------------------------------------------------ Moosgolem (4.82)

export const GOLEMZEIT = { wach: 1200, wurzelPause: 100, weckWeite: 12 };
const golems = new Map();        // Id -> { ruhe, wurzeln }

export function wecken(golem, jetzt) {
    const z = golems.get(golem.id) ?? { ruhe: 0, wurzeln: 0 };
    golems.set(golem.id, z);
    z.ruhe = jetzt + GOLEMZEIT.wach;
    let schlaeft = true;
    try { schlaeft = golem.getProperty("fynn:schlaeft") !== false; } catch (e) { /* egal */ }
    if (!schlaeft) return false;
    try {
        golem.triggerEvent("fynn:aufwachen");
        golem.dimension.playSound("mob.irongolem.death", golem.location, { volume: 1.5, pitch: 0.4 });
        golem.dimension.spawnParticle("minecraft:crop_growth_emitter", golem.location);
    } catch (e) { /* egal */ }
    return true;
}

/** Wer Baeume faellt, weckt die schlafenden Golems in der Naehe. */
export function baumGefaellt(dim, ort, jetzt) {
    let geweckt = 0;
    let nahe = [];
    try { nahe = dim.getEntities({ type: GOLEM, location: ort, maxDistance: GOLEMZEIT.weckWeite }); } catch (e) { /* egal */ }
    for (const g of nahe) if (wecken(g, jetzt)) geweckt++;
    return geweckt;
}

export function wurzeln(ziel) {
    try {
        ziel.applyDamage(5, { cause: "entityAttack" });
        ziel.addEffect("slowness", 60, { amplifier: 4, showParticles: false });
        const o = ziel.location;
        ziel.dimension.spawnParticle("minecraft:crop_growth_emitter", o);
        ziel.dimension.spawnParticle("fynn:steinstaub", o);
        ziel.dimension.playSound("dig.grass", o, { volume: 1.5, pitch: 0.5 });
        ziel.onScreenDisplay?.setActionBar("§2Wurzeln brechen aus dem Boden und halten dich fest!");
    } catch (e) { /* egal */ }
}

/** Ein Takt (alle 20 Ticks) fuer einen Golem. */
export function golemTakt(golem, jetzt) {
    const z = golems.get(golem.id);
    if (!z) return "schlaeft";
    let ziel;
    try { ziel = golem.target; } catch (e) { /* egal */ }
    if (lebt(ziel)) {
        z.ruhe = jetzt + GOLEMZEIT.wach;
        if (jetzt >= z.wurzeln && weite(golem.location, ziel.location) <= 10
            && !(ziel.typeId === "minecraft:player" && istKreativ(ziel))) {
            z.wurzeln = jetzt + GOLEMZEIT.wurzelPause;
            wurzeln(ziel);
            return "wurzeln";
        }
        return "kaempft";
    }
    if (jetzt >= z.ruhe) {
        golems.delete(golem.id);
        try { golem.triggerEvent("fynn:einschlafen"); } catch (e) { /* egal */ }
        return "schlaeft ein";
    }
    return "wacht";
}

/** Das Moosherz: rundum reift das Getreide, und im Gras spriessen Blumen. */
const BLUMEN = ["minecraft:poppy", "minecraft:dandelion", "minecraft:cornflower", "minecraft:oxeye_daisy",
    "minecraft:azure_bluet", "minecraft:allium"];

export function moosherz(spieler, zufall = Math.random) {
    const dim = spieler.dimension, o = spieler.location;
    let gewachsen = 0;
    for (let dx = -4; dx <= 4; dx++) {
        for (let dz = -4; dz <= 4; dz++) {
            for (let dy = -2; dy <= 1; dy++) {
                const b = block(dim, o.x + dx, o.y + dy, o.z + dz);
                if (!b) continue;
                try {
                    const reif = b.permutation?.getState?.("growth");
                    if (reif !== undefined && reif < 7) {
                        b.setPermutation(b.permutation.withState("growth", 7));
                        gewachsen++;
                        continue;
                    }
                } catch (e) { /* kein Getreide */ }
                if (b.typeId === "minecraft:grass_block" && zufall() < 0.25) {
                    const drueber = block(dim, o.x + dx, o.y + dy + 1, o.z + dz);
                    if (drueber?.typeId === "minecraft:air") {
                        try { drueber.setType(BLUMEN[Math.floor(zufall() * BLUMEN.length)]); gewachsen++; } catch (e) { /* egal */ }
                    }
                }
            }
        }
    }
    try {
        dim.spawnParticle("minecraft:crop_growth_emitter", o);
        dim.playSound("item.bone_meal.use", o, { volume: 1, pitch: 1 });
    } catch (e) { /* egal */ }
    if (!istKreativ(spieler)) {
        try {
            const inv = spieler.getComponent("minecraft:inventory")?.container;
            const platz = spieler.selectedSlotIndex ?? 0;
            const ding = inv?.getItem(platz);
            if (ding && ding.amount > 1) { ding.amount -= 1; inv.setItem(platz, ding); } else inv?.setItem(platz, undefined);
        } catch (e) { /* egal */ }
    }
    return gewachsen;
}

// ------------------------------------------------------------ Anbindung

world.afterEvents.entityHurt.subscribe((e) => {
    try {
        const taeter = e.damageSource?.damagingEntity;
        if (taeter?.typeId === SKORPION) skorpionStich(e.hurtEntity);
        if (e.hurtEntity?.typeId === WERWOLF && e.damageSource?.cause !== "magic") {
            silberTreffer(e.hurtEntity, taeter, e.damage);
        }
        if (e.hurtEntity?.typeId === GOLEM && taeter) wecken(e.hurtEntity, system.currentTick);
        if (e.hurtEntity?.typeId === IRRLICHT && taeter) {
            // Geschlagen verlischt das Irrlicht - es flieht in die Nacht.
            const o = e.hurtEntity.location;
            e.hurtEntity.dimension.spawnParticle("minecraft:totem_particle", o);
            e.hurtEntity.triggerEvent("fynn:verschwinden");
        }
    } catch (fehler) {
        console.warn(`Fantasy 2, Treffer: ${fehler}`);
    }
});

function lichtAnOrt(e, ort) {
    try { lichtSetzen(e.dimension, ort, system.currentTick); } catch (fehler) { console.warn(`Irrlichtflasche: ${fehler}`); }
}

world.afterEvents.projectileHitBlock.subscribe((e) => {
    if (e.projectile?.typeId !== LICHTWURF) return;
    const b = e.getBlockHit?.();
    const f = b?.face;
    const o = b?.block?.location ?? e.location;
    lichtAnOrt(e, { x: o.x + (f === "East" ? 1 : f === "West" ? -1 : 0),
                    y: o.y + (f === "Up" || !f ? 1 : f === "Down" ? -1 : 0),
                    z: o.z + (f === "South" ? 1 : f === "North" ? -1 : 0) });
});

world.afterEvents.projectileHitEntity.subscribe((e) => {
    if (e.projectile?.typeId !== LICHTWURF) return;
    const o = e.getEntityHit?.()?.entity?.location ?? e.location;
    lichtAnOrt(e, { x: o.x, y: o.y + 1, z: o.z });
});

world.afterEvents.playerBreakBlock.subscribe((e) => {
    try {
        if (/_log$|_wood$|_stem$/.test(e.brokenBlockPermutation?.type?.id ?? "")) {
            baumGefaellt(e.dimension, e.block.location, system.currentTick);
        }
    } catch (fehler) {
        console.warn(`Moosgolem, Baum: ${fehler}`);
    }
});

world.afterEvents.itemUse.subscribe((e) => {
    try {
        if (e.itemStack?.typeId === "fynn:moosherz") moosherz(e.source);
    } catch (fehler) {
        console.warn(`Moosherz: ${fehler}`);
    }
});

let runde = 0;
system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        const r = runde++;
        if (netze.length) netzeTakt(jetzt);
        const welt = world.getDimension("overworld");
        for (const s of welt.getEntities({ type: SPINNE })) {
            try { netzTakt(s, jetzt); } catch (f) { /* egal */ }
        }
        if (r % 2 !== 0) return;
        const spieler = world.getAllPlayers();
        for (const i of welt.getEntities({ type: IRRLICHT })) {
            try { irrlichtTakt(i, spieler); } catch (f) { /* egal */ }
        }
        if (r % 20 === 0 && lichter.length) lichterTakt(jetzt);
        if (r % 4 !== 0) return;
        let nacht = false;
        try { nacht = mondnacht(world.getTimeOfDay(), world.getMoonPhase()); } catch (f) { /* egal */ }
        for (const w of welt.getEntities({ type: WERWOLF })) {
            try { werwolfTakt(w, jetzt, nacht); } catch (f) { /* egal */ }
        }
        for (const g of welt.getEntities({ type: GOLEM })) {
            try { golemTakt(g, jetzt); } catch (f) { /* egal */ }
        }
    } catch (fehler) {
        console.warn(`Fantasy 2: ${fehler}`);
    }
}, 5);
