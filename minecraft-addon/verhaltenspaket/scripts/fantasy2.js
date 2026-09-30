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

// ------------------------------------------------------------ Moosgolem (4.82, neu 5.1)
//
// 5.1 - Fynn: "Der kann Steine werfen, die Teil seiner Arme sind ... mit
// einer gewissen Wahrscheinlichkeit ein Erz auf dem Ruecken ... davon droppt
// er dann auch beim Sterben." Das Erz wuerfelt das Spiel beim Erscheinen
// (fynn:erz, die Beute haengt an der Komponentengruppe), hier steht nur,
// was er dabei sagt. Der Wurf dagegen ist ganz Skript: ausholen, loslassen,
// der Stein fehlt am Arm und waechst nach - abwechselnd links und rechts.

export const GOLEM = "fynn:moosgolem";
export const FELSBROCKEN = "fynn:felsbrocken";

export const GOLEMZEIT = { wach: 1200, wurzelPause: 100, weckWeite: 12, wurzelWeite: 7 };
// Ticks: wie lange er ausholt, wie lange der Arm leer ist, wie lange der
// Stein nachwaechst, und die Pause bis zum naechsten Wurf.
export const GOLEMWURF = { min: 6, max: 22, ausholen: 20, leer: 100, wachsen: 20, pause: 140, tempo: 1.3, fall: 0.05 };
export const STEIN = { bereit: 0, holt: 1, leer: 2, waechst: 3 };

// Wie die Kristalle auf seinem Buckel heissen - in derselben Reihenfolge
// wie fynn:erz (fantasy2_gestalt.GOLEMERZE).
export const GOLEMERZE = [
    null,
    { name: "Amethyst", seltenheit: "gewöhnlich", farbe: "§7" },
    { name: "Lapislazuli", seltenheit: "ungewöhnlich", farbe: "§a" },
    { name: "Smaragd", seltenheit: "selten", farbe: "§9" },
    { name: "Rubin", seltenheit: "sehr selten", farbe: "§d" },
    { name: "Diamant", seltenheit: "legendär", farbe: "§6" },
];

const golems = new Map();        // Id -> { ruhe, wurzeln, wurf, loslassen, weiter, ziel }

function eigenschaft(w, name, sonst) {
    try { return w.getProperty(name) ?? sonst; } catch (e) { return sonst; }
}

function setzen(w, name, wert) {
    try { w.setProperty(name, wert); } catch (e) { /* egal */ }
}

function golemZustand(golem, jetzt) {
    let z = golems.get(golem.id);
    if (!z) {
        z = { ruhe: jetzt + GOLEMZEIT.wach, wurzeln: 0, wurf: 0, loslassen: 0, weiter: 0, ziel: undefined };
        golems.set(golem.id, z);
    }
    return z;
}

export function wecken(golem, jetzt) {
    const z = golemZustand(golem, jetzt);
    z.ruhe = jetzt + GOLEMZEIT.wach;
    if (eigenschaft(golem, "fynn:schlaeft", true) === false) return false;
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

/**
 * Den Stein vom Arm auf das Ziel werfen. Er fliegt im Bogen: Die Zeit bis
 * zum Ziel ergibt sich aus Weite und Tempo, und so viel hoeher wird gezielt,
 * wie der Stein in dieser Zeit faellt.
 */
export function felsWerfen(golem, ziel, links) {
    const dim = golem.dimension, o = golem.location;
    let f = { x: 0, z: 1 };
    try {
        const v = golem.getViewDirection();
        const l = Math.hypot(v.x, v.z) || 1;
        f = { x: v.x / l, z: v.z / l };
    } catch (e) { /* dann eben geradeaus */ }
    // Rechts von der Blickrichtung (nach Sueden blickend liegt rechts Westen).
    const seite = links ? -1 : 1;
    const start = { x: o.x - f.z * 1.3 * seite + f.x * 0.6, y: o.y + 3.0, z: o.z + f.x * 1.3 * seite + f.z * 0.6 };
    const z = ziel.location;
    const dx = z.x - start.x, dy = z.y + 1.0 - start.y, dz = z.z - start.z;
    const t = Math.max(4, Math.hypot(dx, dz) / GOLEMWURF.tempo);
    const schub = { x: dx / t, y: dy / t + 0.5 * GOLEMWURF.fall * t, z: dz / t };
    try {
        dim.playSound("mob.irongolem.throw", o, { volume: 1.5, pitch: 0.6 });
        dim.spawnParticle("fynn:steinstaub", start);
    } catch (e) { /* egal */ }
    try {
        const stein = dim.spawnEntity(FELSBROCKEN, start);
        const p = stein?.getComponent?.("minecraft:projectile");
        if (p) { p.owner = golem; p.shoot(schub); }
        return schub;
    } catch (e) {
        return undefined;
    }
}

/** Der Stein am Arm: loslassen, leer, nachwachsen, bereit. */
function steinTakt(golem, z, jetzt) {
    const stufe = eigenschaft(golem, "fynn:wurf", STEIN.bereit);
    if (stufe === STEIN.bereit || jetzt < z.weiter) return undefined;
    if (stufe === STEIN.holt) {
        if (!lebt(z.ziel)) {
            setzen(golem, "fynn:wurf", STEIN.bereit);
            return "bricht ab";
        }
        felsWerfen(golem, z.ziel, eigenschaft(golem, "fynn:links", false));
        setzen(golem, "fynn:wurf", STEIN.leer);
        z.weiter = jetzt + GOLEMWURF.leer;
        return "wirft";
    }
    if (stufe === STEIN.leer) {
        setzen(golem, "fynn:wurf", STEIN.waechst);
        try { golem.dimension.playSound("dig.stone", golem.location, { volume: 1, pitch: 0.5 }); } catch (e) { /* egal */ }
        z.weiter = jetzt + GOLEMWURF.wachsen;
        return undefined;
    }
    // Nachgewachsen - der naechste Wurf kommt vom anderen Arm.
    setzen(golem, "fynn:wurf", STEIN.bereit);
    setzen(golem, "fynn:links", !eigenschaft(golem, "fynn:links", false));
    return undefined;
}

/** Ein Takt (alle 20 Ticks) fuer einen Golem. */
export function golemTakt(golem, jetzt) {
    if (!golems.has(golem.id) && eigenschaft(golem, "fynn:schlaeft", true) !== false) return "schlaeft";
    // Wach, aber nicht gemerkt (nach dem Neuladen der Welt): jetzt merken.
    const z = golemZustand(golem, jetzt);
    const stein = steinTakt(golem, z, jetzt);
    if (stein) return stein;
    let ziel;
    try { ziel = golem.target; } catch (e) { /* egal */ }
    if (lebt(ziel)) {
        z.ruhe = jetzt + GOLEMZEIT.wach;
        if (ziel.typeId === "minecraft:player" && istKreativ(ziel)) return "kaempft";
        const d = weite(golem.location, ziel.location);
        if (jetzt >= z.wurzeln && d <= GOLEMZEIT.wurzelWeite) {
            z.wurzeln = jetzt + GOLEMZEIT.wurzelPause;
            wurzeln(ziel);
            return "wurzeln";
        }
        if (jetzt >= z.wurf && d >= GOLEMWURF.min && d <= GOLEMWURF.max
            && eigenschaft(golem, "fynn:wurf", STEIN.bereit) === STEIN.bereit) {
            setzen(golem, "fynn:wurf", STEIN.holt);
            z.ziel = ziel;
            z.weiter = jetzt + GOLEMWURF.ausholen;
            z.wurf = jetzt + GOLEMWURF.pause;
            return "holt aus";
        }
        return "kaempft";
    }
    if (jetzt >= z.ruhe) {
        golems.delete(golem.id);
        setzen(golem, "fynn:wurf", STEIN.bereit);
        try { golem.triggerEvent("fynn:einschlafen"); } catch (e) { /* egal */ }
        return "schlaeft ein";
    }
    return "wacht";
}

/** Wo der Felsbrocken aufschlaegt, staubt es. */
export function felsAufschlag(dim, ort) {
    try {
        dim.spawnParticle("fynn:steinstaub", ort);
        dim.playSound("dig.stone", ort, { volume: 2, pitch: 0.5 });
        dim.playSound("random.explode", ort, { volume: 0.4, pitch: 1.6 });
    } catch (e) { /* egal */ }
}

/** Beim Tod: Wer ihn besiegt hat, erfaehrt, was er auf dem Buckel trug. */
export function erzBeiTod(golem, taeter) {
    const erz = GOLEMERZE[eigenschaft(golem, "fynn:erz", 0)];
    golems.delete(golem.id);
    if (!erz) return undefined;
    const text = `${erz.farbe}Der Moosgolem trug ${erz.name} auf dem Buckel – ${erz.seltenheit}!`;
    try {
        if (taeter?.typeId === "minecraft:player") taeter.onScreenDisplay?.setActionBar(text);
    } catch (e) { /* egal */ }
    return text;
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
    if (e.projectile?.typeId === FELSBROCKEN) felsAufschlag(e.dimension, e.location);
    if (e.projectile?.typeId !== LICHTWURF) return;
    const b = e.getBlockHit?.();
    const f = b?.face;
    const o = b?.block?.location ?? e.location;
    lichtAnOrt(e, { x: o.x + (f === "East" ? 1 : f === "West" ? -1 : 0),
                    y: o.y + (f === "Up" || !f ? 1 : f === "Down" ? -1 : 0),
                    z: o.z + (f === "South" ? 1 : f === "North" ? -1 : 0) });
});

world.afterEvents.projectileHitEntity.subscribe((e) => {
    if (e.projectile?.typeId === FELSBROCKEN) felsAufschlag(e.dimension, e.location);
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

world.afterEvents.entityDie.subscribe((e) => {
    try {
        if (e.deadEntity?.typeId === GOLEM) erzBeiTod(e.deadEntity, e.damageSource?.damagingEntity);
    } catch (fehler) {
        console.warn(`Moosgolem, Tod: ${fehler}`);
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
        for (const g of welt.getEntities({ type: GOLEM })) {
            try { golemTakt(g, jetzt); } catch (f) { /* egal */ }
        }
    } catch (fehler) {
        console.warn(`Fantasy 2: ${fehler}`);
    }
}, 5);
