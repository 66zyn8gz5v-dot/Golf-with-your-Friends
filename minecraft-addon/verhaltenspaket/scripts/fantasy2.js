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

// ------------------------------------------------------------ Anbindung

world.afterEvents.entityHurt.subscribe((e) => {
    try {
        const taeter = e.damageSource?.damagingEntity;
        if (taeter?.typeId === SKORPION) skorpionStich(e.hurtEntity);
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
    } catch (fehler) {
        console.warn(`Fantasy 2: ${fehler}`);
    }
}, 5);
