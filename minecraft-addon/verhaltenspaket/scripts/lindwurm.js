// Der Lindwurm (4.80): der Drache des Mittelalters.
//
// Fynn: "eher Drachen und sowas, was im Mittelalter eine grosse Rolle
// gespielt hat."
//
// Fliegen, Kreisen und Herabstossen kann er von selbst (wie Mojangs
// Phantom, siehe werkzeuge/fantasy_daten.py). Hier kommt der Feueratem
// dazu: Hat er ein Ziel in Reichweite, reisst er das Maul auf
// (fynn:feuer) und speit vier Feuerbaelle hintereinander, dazu eine
// Flammenwolke. Dann braucht er eine Weile, bis er wieder Feuer hat.

import * as mc from "@minecraft/server";

const { world, system } = mc;

export const DRACHE = "fynn:lindwurm";
export const ATEM = { weite: 26, schuesse: 4, abstand: 5, dauer: 30, pause: [100, 160], tempo: 1.3 };

const feuer = new Map();         // Id -> { naechster, schuesse, bis, pause }

function lebt(w) {
    try { return !!w && w.isValid !== false; } catch (e) { return false; }
}

function weite(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}

/** Wo das Maul ist: ein Stueck vor dem Rumpf, etwas hoeher. */
export function maul(drache) {
    const o = drache.location;
    const b = drache.getViewDirection();
    return { x: o.x + b.x * 3.5, y: o.y + 1.4 + b.y * 3.5, z: o.z + b.z * 3.5 };
}

function flammen(dim, ort, richtung) {
    try {
        const Karte = mc.MolangVariableMap;
        if (Karte) {
            const m = new Karte();
            m.setFloat("variable.fynn_x", richtung.x);
            m.setFloat("variable.fynn_y", richtung.y);
            m.setFloat("variable.fynn_z", richtung.z);
            dim.spawnParticle("fynn:drachenfeuer", ort, m);
        } else {
            dim.spawnParticle("fynn:drachenfeuer", ort);
        }
    } catch (e) { /* egal */ }
}

/** Ein Feuerball aus dem Maul auf das Ziel. */
export function feuerball(drache, ziel) {
    const von = maul(drache);
    const zu = { x: ziel.location.x, y: ziel.location.y + 1, z: ziel.location.z };
    const l = weite(von, zu) || 1;
    const r = { x: (zu.x - von.x) / l, y: (zu.y - von.y) / l, z: (zu.z - von.z) / l };
    flammen(drache.dimension, von, r);
    try {
        const ball = drache.dimension.spawnEntity("minecraft:small_fireball", von);
        const p = ball.getComponent("minecraft:projectile");
        if (p) {
            p.owner = drache;
            p.shoot({ x: r.x * ATEM.tempo, y: r.y * ATEM.tempo, z: r.z * ATEM.tempo });
        }
        return ball;
    } catch (e) {
        return undefined;
    }
}

/** Ein Takt (alle 5 Ticks) fuer einen Lindwurm. */
export function atemTakt(drache, jetzt, zufall = Math.random) {
    let f = feuer.get(drache.id);
    if (!f) { f = { schuesse: 0, naechster: 0, bis: 0, pause: 0 }; feuer.set(drache.id, f); }
    let ziel;
    try { ziel = drache.target; } catch (e) { /* egal */ }
    if (f.schuesse > 0) {
        if (jetzt >= f.naechster && lebt(ziel)) {
            feuerball(drache, ziel);
            f.schuesse--;
            f.naechster = jetzt + ATEM.abstand;
        }
        if (f.schuesse === 0 || !lebt(ziel)) f.schuesse = 0;
        return "speit";
    }
    if (f.bis && jetzt >= f.bis) {
        f.bis = 0;
        try { drache.setProperty("fynn:feuer", false); } catch (e) { /* egal */ }
    }
    if (jetzt < f.pause || !lebt(ziel) || weite(drache.location, ziel.location) > ATEM.weite) return "fliegt";
    // Tief Luft holen - dann Feuer.
    f.schuesse = ATEM.schuesse;
    f.naechster = jetzt + 6;
    f.bis = jetzt + ATEM.dauer;
    f.pause = jetzt + ATEM.pause[0] + Math.floor(zufall() * (ATEM.pause[1] - ATEM.pause[0]));
    try {
        drache.setProperty("fynn:feuer", true);
        drache.dimension.playSound("mob.enderdragon.growl", drache.location, { volume: 3, pitch: 0.9 });
    } catch (e) { /* egal */ }
    return "holt Luft";
}

world.afterEvents.entityDie.subscribe((e) => {
    try { feuer.delete(e.deadEntity?.id); } catch (fehler) { /* egal */ }
});

let runde = 0;
system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        const r = runde++;
        for (const d of world.getDimension("overworld").getEntities({ type: DRACHE })) {
            try {
                atemTakt(d, jetzt);
                // Das Rauschen der Schwingen, wenn er fliegt.
                if (r % 8 === 0 && !d.isOnGround) d.dimension.playSound("mob.enderdragon.flap", d.location, { volume: 2, pitch: 1.1 });
            } catch (f) { /* egal */ }
        }
    } catch (fehler) {
        console.warn(`Lindwurm: ${fehler}`);
    }
}, 5);
