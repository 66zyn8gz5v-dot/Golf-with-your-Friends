// Die Drachen (ab 4.89): Atem, Faehigkeiten, Landen, Schlafen, Besiegen,
// Heilen, Reiten.
//
// Fynn: "Richtiger Feueratem, der dann auch Feuer rausschiesst." Und (4.90):
// "Die haben alle verschiedene Faehigkeiten ... Wenn man die getoetet hat,
// fallen die so nieder. Man kann sie dann entweder toeten, dann kriegt man
// den Stuff, oder heilen, dann sind die zugeneigt, man kann sie reiten.
// Schlafen mit Augen zu, Schlafpartikeln, Z-maessig."
//
// * Atem: ein Strahl von gut zwei Sekunden. Jede Art nennt ihre Atemart
//   (ATEMARTEN): Flammenbild, Wirkung auf Wesen, Wirkung auf Bloecke.
// * Faehigkeit: die zweite Angriffsart (FAEHIGKEITEN) - beim Lindwurm die
//   Feuerkugel fuer Ziele weiter weg.
// * Landen und Abheben: Ohne Ziel landet er irgendwann, laeuft, schlaeft
//   nachts eingerollt und hebt ab, wenn er jemanden sieht.
// * Besiegt: Bei einem Viertel Leben bricht ein wilder Drache zusammen (die
//   Gruppe fynn:besiegt macht ihn unverwundbar). Drei Schlaege sind der
//   Gnadenstoss, ein Goldapfel heilt und zaehmt ihn (das Zaehmen selbst macht
//   Minecraft, siehe drachen_daten.py). Nach fuenf Minuten erholt er sich.
// * Zahm: folgt, kaempft mit; schleichend antippen: bleib / komm. Gesattelt
//   fliegt er mit dem Reiter wie der Greif (greif.js); schlaegt der Reiter
//   zu, speit der Drache dorthin. Die Drachenpfeife loest die Faehigkeit aus
//   (im Sattel) oder ruft die eigenen Drachen herbei (zu Fuss).

import * as mc from "@minecraft/server";
import { flugTakt as reitflug } from "./greif.js";

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
    // Der Frosthauch (Frostwyvern, 4.91): Wer darin steht, wird stark
    // verlangsamt und friert; Wasser gefriert zu Eis, auf den Boden faellt Schnee.
    frost: {
        teilchen: "fynn:frostatem", weite: 13, kegel: 1.0, dauer: 44, anlauf: 8, pause: [140, 220],
        laut: "random.glass", knistern: "block.powder_snow.step",
        wesen(ziel, drache) {
            try { ziel.addEffect("slowness", 100, { amplifier: 3 }); } catch (e) { /* egal */ }
            try { ziel.addEffect("mining_fatigue", 100, { amplifier: 1 }); } catch (e) { /* egal */ }
            try { ziel.extinguishFire?.(); } catch (e) { /* egal */ }
            try { ziel.applyDamage(2, { cause: "freezing", damagingEntity: drache }); } catch (e) { /* egal */ }
        },
        block(dim, getroffen, zufall) {
            let n = 0;
            for (const [dx, dz] of [[0, 0], [1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1]]) {
                if ((dx || dz) && zufall() > 0.5) continue;
                const o = { x: getroffen.x + dx, y: getroffen.y, z: getroffen.z + dz };
                try {
                    const b = dim.getBlock(o);
                    if (b?.typeId === "minecraft:water" || b?.typeId === "minecraft:flowing_water") {
                        b.setType("minecraft:ice"); n++; continue;
                    }
                    const oben = dim.getBlock({ x: o.x, y: o.y + 1, z: o.z });
                    if (oben?.isAir && b && !b.isAir && !b.isLiquid) { oben.setType("minecraft:snow_layer"); n++; }
                } catch (e) { /* ungeladen */ }
            }
            return n;
        },
    },
    // Der Sturmhauch (Himmelsdrache, 4.92): ein Windstoss voller Funken.
    // Er schleudert weg, was im Strahl steht, und trifft mit einem Schlag.
    sturm: {
        teilchen: "fynn:sturmatem", weite: 14, kegel: 1.1, dauer: 30, anlauf: 6, pause: [120, 200],
        laut: "mob.breeze.shoot", knistern: "mob.breeze.wind_burst",
        wesen(ziel, drache) {
            try {
                const d = drache.location, o = ziel.location;
                const r = einheit({ x: o.x - d.x, y: 0, z: o.z - d.z });
                ziel.applyKnockback({ x: r.x * 2.6, z: r.z * 2.6 }, 0.8);
            } catch (e) {
                try { ziel.applyImpulse({ x: 0, y: 0.8, z: 0 }); } catch (f) { /* egal */ }
            }
            try { ziel.applyDamage(2, { cause: "lightning", damagingEntity: drache }); } catch (e) { /* egal */ }
            try {
                ziel.dimension.spawnParticle("minecraft:electric_spark_particle",
                    { x: ziel.location.x, y: ziel.location.y + 1, z: ziel.location.z });
            } catch (e) { /* egal */ }
        },
        block() { return 0; },
    },
};

export const FAEHIGKEITEN = {
    // Eine grosse Feuerkugel wie die des Ghasts: fliegt geradeaus und
    // explodiert beim Aufprall (mit mobGriefing auch mit Feuer).
    feuerkugel: {
        min: 14, max: 44, pause: [200, 320], name: "Feuerkugel",
        wirken(drache, mund, r) {
            try {
                drache.dimension.playSound("mob.ghast.fireball", mund, { volume: 3, pitch: 0.7 });
                const kugel = drache.dimension.spawnEntity("minecraft:fireball", mund);
                const p = kugel.getComponent("minecraft:projectile");
                if (p) {
                    p.owner = drache;
                    p.shoot({ x: r.x * 1.4, y: r.y * 1.4, z: r.z * 1.4 });
                }
                return kugel;
            } catch (e) {
                return undefined;
            }
        },
    },
};

// Drei Eissplitter im Faecher (Frostwyvern): Die Splitter sind echte
// Geschosse (fynn:eissplitter) - sie treffen hart und verlangsamen.
FAEHIGKEITEN.eiskristalle = {
    min: 10, max: 36, pause: [160, 260], name: "Eiskristalle",
    wirken(drache, mund, r) {
        const dim = drache.dimension;
        try { dim.playSound("random.glass", mund, { volume: 2, pitch: 1.6 }); } catch (e) { /* egal */ }
        const splitter = [];
        for (const w of [-0.14, 0, 0.14]) {
            // Seitlich gefaechert: um die Hochachse gedreht.
            const c = Math.cos(w), s = Math.sin(w);
            const q = einheit({ x: r.x * c - r.z * s, y: r.y + 0.04, z: r.x * s + r.z * c });
            try {
                const e = dim.spawnEntity("fynn:eissplitter", mund);
                const p = e.getComponent("minecraft:projectile");
                if (p) { p.owner = drache; p.shoot({ x: q.x * 1.9, y: q.y * 1.9, z: q.z * 1.9 }); }
                splitter.push(e);
            } catch (e) { /* egal */ }
        }
        return splitter;
    },
};

// Drei Blitze rund um das Ziel, einer nach dem anderen (Himmelsdrache).
FAEHIGKEITEN.blitzschlag = {
    min: 8, max: 40, pause: [240, 360], name: "Blitzschlag",
    wirken(drache, mund, r, ziel) {
        const dim = drache.dimension;
        const mitte = ziel?.location ?? { x: mund.x + r.x * 16, y: mund.y + r.y * 16, z: mund.z + r.z * 16 };
        try { dim.playSound("ambient.weather.thunder", drache.location, { volume: 3, pitch: 1.2 }); } catch (e) { /* egal */ }
        [0, 10, 20].forEach((warte, i) => {
            const o = i === 0 ? mitte : { x: mitte.x + (Math.random() - 0.5) * 6, y: mitte.y, z: mitte.z + (Math.random() - 0.5) * 6 };
            system.runTimeout(() => {
                try { dim.spawnEntity("minecraft:lightning_bolt", o); } catch (e) { /* egal */ }
            }, warte);
        });
        return mitte;
    },
};

export const DRACHEN = {
    "fynn:lindwurm": {
        name: "Lindwurm", atem: "feuer", faehigkeit: "feuerkugel", maul: 5.0, hoehe: 1.8,
        luft: [1200, 2400], boden: [800, 1800],
        // Wie er mit Reiter fliegt: schneller als der Greif, steigt kraeftiger.
        reitflug: { tempo: 1.3, steigen: 0.14, nachziehen: 0.12, schwebe: 0.04, hoechstSteigen: 0.75 },
    },
    // Er schwebt: mit Reiter der schnellste, und er faellt kaum.
    "fynn:himmelsdrache": {
        name: "Himmelsdrache", atem: "sturm", faehigkeit: "blitzschlag", maul: 3.2, hoehe: 1.3,
        luft: [1600, 3000], boden: [400, 900],
        reitflug: { tempo: 1.6, steigen: 0.15, nachziehen: 0.15, schwebe: 0.06, hoechstSteigen: 0.8 },
    },
    // Kleiner und wendiger: fliegt mit Reiter schneller, steigt leichter.
    "fynn:frostwyvern": {
        name: "Frostwyvern", atem: "frost", faehigkeit: "eiskristalle", maul: 3.8, hoehe: 1.6,
        luft: [1000, 2000], boden: [600, 1400],
        reitflug: { tempo: 1.45, steigen: 0.15, nachziehen: 0.14, schwebe: 0.045, hoechstSteigen: 0.8 },
    },
};

export const BESIEGT = { anteil: 0.25, dauer: 6000, hiebe: 3 };
export const SCHLAF = { weckweite: 8, weckchance: 0.35 };
export const PFEIFE = "fynn:drachenpfeife";
const HEILMITTEL = new Set(["minecraft:golden_apple", "minecraft:enchanted_golden_apple"]);

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
function eig(w, n) {
    try { return w.getProperty(n); } catch (e) { return undefined; }
}
function istZahm(d) {
    try { return !!d.getComponent("minecraft:is_tamed"); } catch (e) { return false; }
}
export function reiterVon(d) {
    try { return d.getComponent("minecraft:rideable")?.getRiders?.()?.[0]; } catch (e) { return undefined; }
}
function erlaubtZuZuendeln() {
    try { return world.gameRules?.mobGriefing !== false; } catch (e) { return true; }
}
function nachts() {
    try { const z = world.getTimeOfDay(); return z >= 13000 && z <= 23000; } catch (e) { return false; }
}
function leiste(dim, ort, text, weite = 24) {
    try {
        for (const s of dim.getEntities({ type: "minecraft:player", location: ort, maxDistance: weite })) {
            s.onScreenDisplay?.setActionBar(text);
        }
    } catch (e) { /* egal */ }
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

function teilchen(dim, name, ort, r) {
    try {
        const Karte = mc.MolangVariableMap;
        if (Karte && r) {
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

// ------------------------------------------------------------ Zustand je Drache

const zustand = new Map();

function von(drache) {
    let z = zustand.get(drache.id);
    if (!z) {
        z = { bis: 0, ab: 0, pause: 0, luftSeit: 0, bodenSeit: 0, kugelPause: 0, befehl: null, hiebe: null,
              besiegtBis: 0, amBodenSeit: 0 };
        zustand.set(drache.id, z);
    }
    return z;
}

/** Worauf er gerade speit: geritten nur, was der Reiter befiehlt. */
function zielFuer(drache, z, jetzt) {
    if (z.befehl && jetzt < z.befehl.bis && lebt(z.befehl.ziel)) return z.befehl.ziel;
    if (reiterVon(drache)) return undefined;
    try { return drache.target; } catch (e) { return undefined; }
}

// ------------------------------------------------------------ Atem

/** Wer im Kegel vor dem Maul steht. */
export function imKegel(dim, mund, r, atem, drache) {
    let nah = [];
    try { nah = dim.getEntities({ location: mund, maxDistance: atem.weite }); } catch (e) { return []; }
    const reiter = reiterVon(drache);
    return nah.filter((w) => {
        if (w === drache || w.id === drache.id || w.typeId === drache.typeId) return false;
        if (reiter && w.id === reiter.id) return false;
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
    if (eig(drache, "fynn:besiegt") || eig(drache, "fynn:schlaeft")) return "ruht";
    const atem = ATEMARTEN[art.atem];
    const z = von(drache);
    const ziel = zielFuer(drache, z, jetzt);
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
        teilchen(dim, atem.teilchen, mund, r);
        if ((jetzt - z.ab) % 6 === 0) {
            for (const w of imKegel(dim, mund, r, atem, drache)) atem.wesen(w, drache);
            if (erlaubtZuZuendeln()) {
                try {
                    const hit = dim.getBlockFromRay(mund, r, { maxDistance: atem.weite, includeLiquidBlocks: true,
                                                                includePassableBlocks: false });
                    // Ob der Block passt, weiss die Atemart: Feuer nicht auf Wasser, Frost gerade dort.
                    if (hit?.block) atem.block(dim, hit.block.location, zufall);
                } catch (e) { /* egal */ }
            }
            try { dim.playSound(atem.knistern, mund, { volume: 1.5, pitch: 0.8 }); } catch (e) { /* egal */ }
        }
        return "speit";
    }
    const befohlen = z.befehl && jetzt < z.befehl.bis;
    if ((!befohlen && jetzt < z.pause) || !lebt(ziel)) return "wartet";
    const d = weite(drache.location, ziel.location);
    if (d > atem.weite + 6 || d < 2) return "wartet";
    // Tief Luft holen - das Maul geht auf, dann kommt der Strahl.
    if (befohlen) z.befehl = null;
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

// ------------------------------------------------------------ Faehigkeit

/** Die zweite Angriffsart. richtung: vom Reiter befohlen; sonst aufs Ziel,
 *  wenn es weit genug weg ist. */
export function faehigkeitTakt(drache, jetzt, richtung = undefined, zufall = Math.random) {
    const art = DRACHEN[drache.typeId];
    const f = art && FAEHIGKEITEN[art.faehigkeit];
    if (!f || eig(drache, "fynn:besiegt") || eig(drache, "fynn:schlaeft")) return "nichts";
    const z = von(drache);
    if (jetzt < z.kugelPause || z.bis) return "wartet";
    const mund = maul(drache);
    let r = richtung;
    if (!r) {
        if (reiterVon(drache)) return "wartet";
        const ziel = zielFuer(drache, z, jetzt);
        if (!lebt(ziel)) return "wartet";
        const d = weite(drache.location, ziel.location);
        if (d < f.min || d > f.max) return "wartet";
        r = einheit({ x: ziel.location.x - mund.x, y: ziel.location.y + 0.8 - mund.y, z: ziel.location.z - mund.z });
    }
    z.kugelPause = jetzt + f.pause[0] + Math.floor(zufall() * (f.pause[1] - f.pause[0]));
    f.wirken(drache, mund, r, richtung ? undefined : zielFuer(drache, z, jetzt));
    return f.name;
}

// ------------------------------------------------------------ Landen, Schlafen, Abheben

function fliegt(drache) {
    return !!eig(drache, "fynn:fliegt");
}

function spielerStoert(drache) {
    try {
        return drache.dimension.getEntities({ type: "minecraft:player", location: drache.location,
                                              maxDistance: SCHLAF.weckweite })
            .some((s) => !s.isSneaking);
    } catch (e) {
        return false;
    }
}

/** Ein Takt (jede Sekunde) fuer einen wilden Drachen. */
export function flugTakt(drache, jetzt, zufall = Math.random) {
    const art = DRACHEN[drache.typeId];
    if (!art) return "kein Drache";
    const z = von(drache);
    // Drachen aus aelteren Welten bekommen einmal ihre Zustaende.
    try {
        if (!drache.getDynamicProperty("fynn:drache490")) {
            drache.setDynamicProperty("fynn:drache490", true);
            drache.triggerEvent("fynn:einrichten");
            return "eingerichtet";
        }
    } catch (e) { /* egal */ }
    if (eig(drache, "fynn:besiegt")) return besiegtTakt(drache, jetzt);
    if (istZahm(drache)) return "zahm";
    let ziel;
    try { ziel = drache.target; } catch (e) { /* egal */ }
    if (eig(drache, "fynn:schlaeft")) {
        // Tag, ein Ziel, oder jemand laeuft laut vorbei: Er wacht auf.
        if (!nachts() || lebt(ziel) || (spielerStoert(drache) && zufall() < SCHLAF.weckchance)) {
            try {
                drache.triggerEvent("fynn:aufwachen");
                drache.dimension.playSound("mob.enderdragon.growl", drache.location, { volume: 2, pitch: 1.2 });
            } catch (e) { /* egal */ }
            return "wacht auf";
        }
        return "schlaeft";
    }
    if (fliegt(drache)) {
        z.amBodenSeit = 0;
        if (!z.luftSeit) z.luftSeit = jetzt + art.luft[0] + Math.floor(zufall() * (art.luft[1] - art.luft[0]));
        // Nachts wird er schneller muede.
        const genug = jetzt >= z.luftSeit || (nachts() && zufall() < 0.02);
        if (lebt(ziel) || !genug) return "fliegt";
        z.luftSeit = 0;
        try {
            drache.triggerEvent("fynn:landen");
            drache.addEffect("slow_falling", 400, { showParticles: false });
        } catch (e) { /* egal */ }
        return "landet";
    }
    if (!z.amBodenSeit) z.amBodenSeit = jetzt;
    if (!z.bodenSeit) z.bodenSeit = jetzt + art.boden[0] + Math.floor(zufall() * (art.boden[1] - art.boden[0]));
    let imWasser = false;
    try { imWasser = !!drache.isInWater; } catch (e) { /* egal */ }
    const zielWeit = lebt(ziel) && weite(drache.location, ziel.location) > 7;
    // Nachts, ohne Ziel, eine Weile am Boden: Er rollt sich ein und schlaeft.
    if (nachts() && !lebt(ziel) && !imWasser && jetzt - z.amBodenSeit > 200 && zufall() < 0.3) {
        try { drache.triggerEvent("fynn:einschlafen"); } catch (e) { /* egal */ }
        return "schlaeft ein";
    }
    if (!imWasser && !zielWeit && (jetzt < z.bodenSeit || nachts())) return "laeuft";
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

// ------------------------------------------------------------ Besiegt

/** Hat ihn ein Schlag auf ein Viertel gebracht? Dann bricht er zusammen. */
export function getroffen(drache, jetzt) {
    if (!DRACHEN[drache.typeId] || istZahm(drache) || eig(drache, "fynn:besiegt")) return false;
    let h;
    try { h = drache.getComponent("minecraft:health"); } catch (e) { return false; }
    if (!h || h.currentValue <= 0 || h.currentValue > h.effectiveMax * BESIEGT.anteil) return false;
    const z = von(drache);
    z.besiegtBis = jetzt + BESIEGT.dauer;
    z.bis = 0;
    try {
        drache.triggerEvent("fynn:niedergeschlagen");
        drache.setDynamicProperty("fynn:besiegt_rest", BESIEGT.dauer);
        drache.dimension.playSound("mob.ravager.stun", drache.location, { volume: 3, pitch: 0.6 });
        drache.dimension.playSound("mob.enderdragon.hit", drache.location, { volume: 3, pitch: 0.5 });
    } catch (e) { /* egal */ }
    const name = DRACHEN[drache.typeId].name;
    leiste(drache.dimension, drache.location,
        `§6Der ${name} ist besiegt! §7Drei Schläge: Gnadenstoß – ein Goldapfel: heilen und zähmen.`);
    return true;
}

/** Ein Schlag auf einen besiegten Drachen - drei sind der Gnadenstoss. */
export function schlag(drache, spieler, jetzt) {
    if (!eig(drache, "fynn:besiegt")) return 0;
    const z = von(drache);
    if (!z.hiebe || jetzt > z.hiebe.bis || z.hiebe.von !== spieler.id) z.hiebe = { n: 0, von: spieler.id };
    z.hiebe.n++;
    z.hiebe.bis = jetzt + 100;
    try { drache.dimension.playSound("mob.enderdragon.hit", drache.location, { volume: 2, pitch: 0.7 }); } catch (e) { /* egal */ }
    if (z.hiebe.n < BESIEGT.hiebe) {
        spieler.onScreenDisplay?.setActionBar(`§7Gnadenstoß: noch ${BESIEGT.hiebe - z.hiebe.n} Schlag${BESIEGT.hiebe - z.hiebe.n > 1 ? "e" : ""}`);
        return z.hiebe.n;
    }
    // Erst faellt der Schutz, dann der letzte Schlag - er zaehlt als deiner,
    // damit die Beute und die Erfahrung dir gehoeren.
    try { drache.triggerEvent("fynn:gnadenstoss"); } catch (e) { /* egal */ }
    system.runTimeout(() => {
        try { drache.applyDamage(100000, { cause: "entityAttack", damagingEntity: spieler }); } catch (e) { /* egal */ }
    }, 2);
    return z.hiebe.n;
}

/** Besiegt und niemand entscheidet sich: Nach fuenf Minuten erholt er sich. */
export function besiegtTakt(drache, jetzt) {
    const z = von(drache);
    if (!z.besiegtBis) {
        // Nach dem Neuladen der Welt: die Restzeit steht am Drachen.
        let rest = BESIEGT.dauer;
        try { rest = Number(drache.getDynamicProperty("fynn:besiegt_rest") ?? BESIEGT.dauer); } catch (e) { /* egal */ }
        z.besiegtBis = jetzt + rest;
    }
    try { drache.setDynamicProperty("fynn:besiegt_rest", Math.max(0, z.besiegtBis - jetzt)); } catch (e) { /* egal */ }
    if (jetzt < z.besiegtBis) return "besiegt";
    z.besiegtBis = 0;
    try {
        drache.triggerEvent("fynn:erholt");
        const h = drache.getComponent("minecraft:health");
        h?.setCurrentValue?.(h.effectiveMax * 0.4);
        drache.dimension.playSound("mob.enderdragon.growl", drache.location, { volume: 3, pitch: 0.8 });
    } catch (e) { /* egal */ }
    return "erholt sich";
}

/** Mit einem Goldapfel geheilt: Er steht auf, voll bei Kraeften, und gehoert
 *  dem, der ihn geheilt hat. */
const heiler = new Map();        // Drachen-Id -> Spieler, der gerade den Apfel gibt
export function geheilt(drache, spieler) {
    const z = von(drache);
    z.besiegtBis = 0;
    z.hiebe = null;
    try {
        drache.getComponent("minecraft:health")?.resetToMaxValue?.();
        if (spieler) drache.setDynamicProperty("fynn:besitzer", spieler.id);
        drache.setDynamicProperty("fynn:besiegt_rest", undefined);
        const o = drache.location;
        for (let i = 0; i < 6; i++) {
            drache.dimension.spawnParticle("minecraft:heart_particle",
                { x: o.x + (Math.random() - 0.5) * 3, y: o.y + 2 + Math.random(), z: o.z + (Math.random() - 0.5) * 3 });
        }
        drache.dimension.playSound("random.levelup", o, { volume: 1, pitch: 0.8 });
    } catch (e) { /* egal */ }
    const name = DRACHEN[drache.typeId]?.name ?? "Drache";
    spieler?.onScreenDisplay?.setActionBar(`§aDer ${name} gehört jetzt dir! §7Sattel drauf – und los.`);
    return true;
}

// ------------------------------------------------------------ Zahm: bleiben, folgen, Pfeife

export function besitzerVon(drache) {
    try { return drache.getDynamicProperty("fynn:besitzer"); } catch (e) { return undefined; }
}

/** Schleichend angetippt: bleib hier / komm mit. */
export function bleibOderKomm(drache, spieler) {
    if (!istZahm(drache)) return undefined;
    const bleibt = !!drache.getDynamicProperty?.("fynn:bleibt");
    try {
        drache.triggerEvent(bleibt ? "fynn:folgen" : "fynn:bleiben");
        drache.setDynamicProperty("fynn:bleibt", !bleibt);
    } catch (e) { /* egal */ }
    const name = DRACHEN[drache.typeId]?.name ?? "Drache";
    spieler.onScreenDisplay?.setActionBar(bleibt ? `§aDer ${name} kommt mit.` : `§eDer ${name} wartet hier.`);
    return bleibt ? "folgt" : "bleibt";
}

/** Die Drachenpfeife: im Sattel die Faehigkeit in Blickrichtung, zu Fuss
 *  ruft sie die eigenen Drachen herbei. */
export function pfeife(spieler, jetzt) {
    const dim = spieler.dimension;
    const geritten = [...Object.keys(DRACHEN)].flatMap((t) => {
        try { return dim.getEntities({ type: t, location: spieler.location, maxDistance: 6 }); } catch (e) { return []; }
    }).find((d) => reiterVon(d)?.id === spieler.id);
    if (geritten) {
        let r = { x: 0, y: 0, z: 1 };
        try { r = einheit(spieler.getViewDirection()); } catch (e) { /* egal */ }
        const was = faehigkeitTakt(geritten, jetzt, r);
        if (was === "wartet") spieler.onScreenDisplay?.setActionBar("§7Dein Drache sammelt noch Kraft ...");
        return was;
    }
    let gerufen = 0;
    for (const t of Object.keys(DRACHEN)) {
        let alle = [];
        try { alle = dim.getEntities({ type: t, location: spieler.location, maxDistance: 160 }); } catch (e) { /* egal */ }
        for (const d of alle) {
            if (besitzerVon(d) !== spieler.id) continue;
            try {
                const o = spieler.location;
                d.teleport({ x: o.x + 3, y: o.y + 1, z: o.z + 3 });
                if (d.getDynamicProperty("fynn:bleibt")) {
                    d.triggerEvent("fynn:folgen");
                    d.setDynamicProperty("fynn:bleibt", false);
                }
                gerufen++;
            } catch (e) { /* egal */ }
        }
    }
    try { dim.playSound("note.flute", spieler.location, { volume: 2, pitch: 1.4 }); } catch (e) { /* egal */ }
    spieler.onScreenDisplay?.setActionBar(gerufen ? `§aDein Drache kommt!` : "§7Kein Drache hört dich.");
    return gerufen;
}

// ------------------------------------------------------------ Anmelden

world.afterEvents.entityHurt.subscribe((e) => {
    try {
        if (DRACHEN[e.hurtEntity?.typeId]) getroffen(e.hurtEntity, system.currentTick);
    } catch (fehler) { /* egal */ }
});

world.afterEvents.entityHitEntity.subscribe((e) => {
    try {
        const ziel = e.hitEntity, wer = e.damagingEntity;
        if (!ziel || !wer || wer.typeId !== "minecraft:player") return;
        if (DRACHEN[ziel.typeId] && eig(ziel, "fynn:besiegt")) {
            schlag(ziel, wer, system.currentTick);
            return;
        }
        // Wer im Sattel zuschlaegt, befiehlt dem Drachen: dorthin speien.
        for (const t of Object.keys(DRACHEN)) {
            for (const d of wer.dimension.getEntities({ type: t, location: wer.location, maxDistance: 6 })) {
                if (reiterVon(d)?.id === wer.id && ziel.id !== d.id) {
                    von(d).befehl = { ziel, bis: system.currentTick + 60 };
                }
            }
        }
    } catch (fehler) { /* egal */ }
});

world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    try {
        const d = e.target;
        if (!DRACHEN[d?.typeId]) return;
        if (eig(d, "fynn:besiegt") && HEILMITTEL.has(e.itemStack?.typeId)) {
            heiler.set(d.id, e.player);
            return;
        }
        if (e.player.isSneaking && istZahm(d) && besitzerVon(d) === e.player.id) {
            system.run(() => bleibOderKomm(d, e.player));
        }
    } catch (fehler) { /* egal */ }
});

world.afterEvents.dataDrivenEntityTrigger?.subscribe?.((e) => {
    try {
        if (e.eventId !== "fynn:geheilt" || !DRACHEN[e.entity?.typeId]) return;
        const d = e.entity;
        let spieler = heiler.get(d.id);
        heiler.delete(d.id);
        if (!spieler) {
            try {
                spieler = d.dimension.getEntities({ type: "minecraft:player", location: d.location, maxDistance: 8 })[0];
            } catch (f) { /* egal */ }
        }
        geheilt(d, spieler);
    } catch (fehler) { /* egal */ }
});

world.afterEvents.itemUse.subscribe((e) => {
    try {
        if (e.itemStack?.typeId === PFEIFE) pfeife(e.source, system.currentTick);
    } catch (fehler) { /* egal */ }
});

world.afterEvents.entityDie.subscribe((e) => {
    try { zustand.delete(e.deadEntity?.id); } catch (fehler) { /* egal */ }
});

function kopfOrt(d) {
    const m = maul(d);
    return { x: (m.x + d.location.x * 2) / 3, y: d.location.y + 1.2, z: (m.z + d.location.z * 2) / 3 };
}

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
                        const reiter = reiterVon(d);
                        if (reiter) reitflug(d, DRACHEN[typ].reitflug);
                        atemTakt(d, jetzt);
                        if (r % 5 === 0) faehigkeitTakt(d, jetzt);
                        if (r % 10 === 0) flugTakt(d, jetzt);
                        if (r % 20 === 0 && eig(d, "fynn:schlaeft")) teilchen(d.dimension, "fynn:schlaf_z", kopfOrt(d));
                        if (r % 10 === 0 && eig(d, "fynn:besiegt")) teilchen(d.dimension, "fynn:benommen", kopfOrt(d));
                        // Das Rauschen der Schwingen, wenn er fliegt.
                        if (r % 16 === 0 && fliegt(d) && !eig(d, "fynn:besiegt")) {
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
