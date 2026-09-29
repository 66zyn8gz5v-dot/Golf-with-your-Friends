// Die Drachen (ab 4.89): Atem, Landen und Abheben.
//
// Fynn: "Richtiger Feueratem, der dann auch Feuer rausschiesst."
//
// Bis 4.88 spuckte der Lindwurm vier kleine Feuerbaelle. Jetzt ist es ein
// Strahl: gut zwei Sekunden lang schiessen Flammen aus dem Maul, alles, was
// im Kegel davor steht, brennt, und wo der Strahl auf den Boden trifft,
// faengt es an zu brennen (nur wenn mobGriefing an ist).
//
// Der Atem ist fuer alle Drachen gebaut: Jede Art nennt ihre Atemart
// (ATEMARTEN), und die bestimmt Flammenbild, Wirkung auf Wesen und Wirkung
// auf Bloecke. Der Lindwurm hat Feuer; die anderen Arten kommen dazu.
//
// Dazu das Landen: Ein Drache kreist nicht nur. Hat er eine Weile kein Ziel,
// landet er (fynn:landen, sanftes Sinken), laeuft umher und hebt wieder ab,
// wenn er jemanden sieht oder genug gelaufen ist (fynn:abheben).

import * as mc from "@minecraft/server";

const { world, system } = mc;

// ------------------------------------------------------------ Arten

export const ATEMARTEN = {
    feuer: {
        teilchen: "fynn:drachenfeuer", weite: 14, kegel: 0.9, dauer: 44, anlauf: 8, pause: [140, 220],
        laut: "mob.blaze.shoot", knistern: "fire.fire",
        wesen(ziel, drache) {
            try { ziel.setOnFire(5, true); } catch (e) { /* manche brennen nicht */ }
            try { ziel.applyDamage(3, { cause: "fire", damagingEntity: drache }); } catch (e) { /* egal */ }
        },
        block(dim, getroffen, zufall) {
            // Oben auf den getroffenen Block ein Feuer - und manchmal daneben.
            let n = 0;
            for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1]]) {
                if ((dx || dz) && zufall() > 0.35) continue;
                const o = { x: getroffen.x + dx, y: getroffen.y + 1, z: getroffen.z + dz };
                try {
                    const b = dim.getBlock(o);
                    const unten = dim.getBlock({ x: o.x, y: o.y - 1, z: o.z });
                    if (b?.isAir && unten && !unten.isAir && !unten.isLiquid) { b.setType("minecraft:fire"); n++; }
                } catch (e) { /* ungeladen */ }
            }
            return n;
        },
    },
};

export const DRACHEN = {
    "fynn:lindwurm": { atem: "feuer", maul: 4.5, hoehe: 1.7, luft: [1200, 2400], boden: [600, 1600] },
};

// ------------------------------------------------------------ Kleinkram

function lebt(w) {
    try { return !!w && w.isValid !== false; } catch (e) { return false; }
}
function weite(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
function einheit(v) {
    const l = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / l, y: v.y / l, z: v.z / l };
}
function zielVon(drache) {
    try { return drache.target; } catch (e) { return undefined; }
}
function erlaubtZuZuendeln() {
    try { return world.gameRules?.mobGriefing !== false; } catch (e) { return true; }
}

/** Wo das Maul ist: vor dem Leib in Blickrichtung, etwas hoeher. */
export function maul(drache) {
    const art = DRACHEN[drache.typeId] ?? DRACHEN["fynn:lindwurm"];
    const o = drache.location;
    let b = { x: 0, y: 0, z: 1 };
    try { b = drache.getViewDirection(); } catch (e) { /* geradeaus */ }
    const flach = einheit({ x: b.x, y: 0, z: b.z });
    return { x: o.x + flach.x * art.maul, y: o.y + art.hoehe, z: o.z + flach.z * art.maul };
}

function flammen(dim, name, ort, r) {
    try {
        const Karte = mc.MolangVariableMap;
        if (Karte) {
            const m = new Karte();
            m.setFloat("variable.fynn_x", r.x);
            m.setFloat("variable.fynn_y", r.y);
            m.setFloat("variable.fynn_z", r.z);
            dim.spawnParticle(name, ort, m);
        } else {
            dim.spawnParticle(name, ort);
        }
    } catch (e) { /* egal */ }
}

// ------------------------------------------------------------ Atem

const zustand = new Map();       // Id -> { bis, ab, pause, luftSeit, bodenSeit, neu }

function von(drache) {
    let z = zustand.get(drache.id);
    if (!z) { z = { bis: 0, ab: 0, pause: 0, luftSeit: 0, bodenSeit: 0 }; zustand.set(drache.id, z); }
    return z;
}

/** Wer im Kegel vor dem Maul steht. */
export function imKegel(dim, mund, r, atem, drache) {
    let nah = [];
    try { nah = dim.getEntities({ location: mund, maxDistance: atem.weite }); } catch (e) { return []; }
    return nah.filter((w) => {
        if (w === drache || w.id === drache.id || w.typeId === drache.typeId) return false;
        if (w.typeId === "minecraft:item" || w.typeId === "minecraft:xp_orb") return false;
        const zu = { x: w.location.x - mund.x, y: w.location.y + 0.9 - mund.y, z: w.location.z - mund.z };
        const l = Math.hypot(zu.x, zu.y, zu.z);
        if (l < 1.5) return true;
        // Der Kegel wird mit der Entfernung breiter: wie weit neben der Achse?
        const laengs = zu.x * r.x + zu.y * r.y + zu.z * r.z;
        if (laengs <= 0) return false;
        const quer = Math.sqrt(Math.max(0, l * l - laengs * laengs));
        return quer <= 0.8 + laengs * atem.kegel * 0.3;
    });
}

/** Ein Takt (alle 2 Ticks) des Atems. Liefert, was er tut. */
export function atemTakt(drache, jetzt, zufall = Math.random) {
    const art = DRACHEN[drache.typeId];
    if (!art) return "kein Drache";
    const atem = ATEMARTEN[art.atem];
    const z = von(drache);
    const ziel = zielVon(drache);
    if (z.bis) {
        if (jetzt >= z.bis) {
            z.bis = 0;
            try { drache.setProperty("fynn:feuer", false); } catch (e) { /* egal */ }
            return "fertig";
        }
        if (jetzt < z.ab) return "holt Luft";
        const mund = maul(drache);
        let r;
        if (lebt(ziel)) {
            r = einheit({ x: ziel.location.x - mund.x, y: ziel.location.y + 0.8 - mund.y, z: ziel.location.z - mund.z });
        } else {
            try { r = einheit(drache.getViewDirection()); } catch (e) { r = { x: 0, y: -0.3, z: 1 }; }
        }
        // Der Strahl zieht leicht hin und her - so trifft er auch, wer ausweicht.
        const schwenk = Math.sin(jetzt * 0.35) * 0.12;
        r = einheit({ x: r.x - r.z * schwenk, y: r.y, z: r.z + r.x * schwenk });
        const dim = drache.dimension;
        flammen(dim, atem.teilchen, mund, r);
        if ((jetzt - z.ab) % 6 === 0) {
            for (const w of imKegel(dim, mund, r, atem, drache)) atem.wesen(w, drache);
            if (erlaubtZuZuendeln()) {
                try {
                    const hit = dim.getBlockFromRay(mund, r, { maxDistance: atem.weite, includeLiquidBlocks: true,
                                                                includePassableBlocks: false });
                    if (hit?.block && !hit.block.isLiquid) atem.block(dim, hit.block.location, zufall);
                } catch (e) { /* egal */ }
            }
            try { dim.playSound(atem.knistern, mund, { volume: 1.5, pitch: 0.8 }); } catch (e) { /* egal */ }
        }
        return "speit";
    }
    if (jetzt < z.pause || !lebt(ziel)) return "wartet";
    const d = weite(drache.location, ziel.location);
    if (d > atem.weite + 6 || d < 2) return "wartet";
    // Tief Luft holen - das Maul geht auf, dann kommt der Strahl.
    z.ab = jetzt + atem.anlauf;
    z.bis = z.ab + atem.dauer;
    z.pause = z.bis + atem.pause[0] + Math.floor(zufall() * (atem.pause[1] - atem.pause[0]));
    try {
        drache.setProperty("fynn:feuer", true);
        drache.dimension.playSound("mob.enderdragon.growl", drache.location, { volume: 3, pitch: 0.9 });
        drache.dimension.playSound(atem.laut, drache.location, { volume: 2, pitch: 0.6 });
    } catch (e) { /* egal */ }
    return "holt Luft";
}

// ------------------------------------------------------------ Landen und Abheben

function fliegt(drache) {
    try { return !!drache.getProperty("fynn:fliegt"); } catch (e) { return true; }
}

/** Ein Takt (jede Sekunde): landen, laufen, abheben. */
export function flugTakt(drache, jetzt, zufall = Math.random) {
    const art = DRACHEN[drache.typeId];
    if (!art) return "kein Drache";
    const z = von(drache);
    // Drachen aus einer Welt von vor 4.89 haben noch keinen Zustand: Sie
    // bekommen einmal den Flug, dann laufen sie wie alle anderen.
    try {
        if (!drache.getDynamicProperty("fynn:drache489")) {
            drache.setDynamicProperty("fynn:drache489", true);
            drache.triggerEvent("fynn:abheben");
            return "eingerichtet";
        }
    } catch (e) { /* egal */ }
    const ziel = zielVon(drache);
    if (fliegt(drache)) {
        if (!z.luftSeit) z.luftSeit = jetzt + art.luft[0] + Math.floor(zufall() * (art.luft[1] - art.luft[0]));
        if (lebt(ziel) || jetzt < z.luftSeit) return "fliegt";
        z.luftSeit = 0;
        try {
            drache.triggerEvent("fynn:landen");
            // Sanft hinunter statt wie ein Stein.
            drache.addEffect("slow_falling", 400, { showParticles: false });
        } catch (e) { /* egal */ }
        return "landet";
    }
    if (!z.bodenSeit) z.bodenSeit = jetzt + art.boden[0] + Math.floor(zufall() * (art.boden[1] - art.boden[0]));
    let imWasser = false;
    try { imWasser = !!drache.isInWater; } catch (e) { /* egal */ }
    const zielWeit = lebt(ziel) && weite(drache.location, ziel.location) > 7;
    if (!imWasser && !zielWeit && jetzt < z.bodenSeit) return "laeuft";
    z.bodenSeit = 0;
    try {
        drache.triggerEvent("fynn:abheben");
        drache.removeEffect?.("slow_falling");
        drache.applyImpulse({ x: 0, y: 1.1, z: 0 });
        drache.dimension.playSound("mob.enderdragon.flap", drache.location, { volume: 3, pitch: 0.9 });
        drache.dimension.playSound("mob.enderdragon.growl", drache.location, { volume: 2, pitch: 1.1 });
    } catch (e) { /* egal */ }
    return "hebt ab";
}

world.afterEvents.entityDie.subscribe((e) => {
    try { zustand.delete(e.deadEntity?.id); } catch (fehler) { /* egal */ }
});

let runde = 0;
system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        const r = runde++;
        for (const dimName of ["overworld", "nether"]) {
            let welt;
            try { welt = world.getDimension(dimName); } catch (f) { continue; }
            for (const typ of Object.keys(DRACHEN)) {
                for (const d of welt.getEntities({ type: typ })) {
                    try {
                        atemTakt(d, jetzt);
                        if (r % 10 === 0) flugTakt(d, jetzt);
                        // Das Rauschen der Schwingen, wenn er fliegt.
                        if (r % 16 === 0 && fliegt(d)) {
                            d.dimension.playSound("mob.enderdragon.flap", d.location, { volume: 2, pitch: 1.1 });
                        }
                    } catch (f) { /* egal */ }
                }
            }
        }
    } catch (fehler) {
        console.warn(`Drachen: ${fehler}`);
    }
}, 2);
