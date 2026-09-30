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
        teilchen: "fynn:drachenfeuer", weite: 14, kegel: 0.9, dauer: 44, anlauf: 20, pause: [140, 220], veraendert: true,
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
        teilchen: "fynn:frostatem", beiteilchen: "fynn:frostsplitter",
        weite: 13, kegel: 1.0, dauer: 44, anlauf: 20, pause: [140, 220], veraendert: true,
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
        teilchen: "fynn:sturmatem", weite: 14, kegel: 1.1, dauer: 30, anlauf: 20, pause: [120, 200],
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
    // Das Gift (linker Kopf des Giftdrachen, 4.93): Wer im Strahl steht,
    // wird vergiftet, und wo der Strahl auftrifft, bleibt eine Giftwolke liegen.
    gift: {
        teilchen: "fynn:giftatem", weite: 12, kegel: 1.0, dauer: 40, anlauf: 20, pause: [140, 220],
        laut: "mob.witch.throw", knistern: "random.fizz",
        wesen(ziel) {
            try { ziel.addEffect("poison", 120, { amplifier: 1 }); } catch (e) { /* egal */ }
            try { ziel.addEffect("nausea", 120, { amplifier: 0 }); } catch (e) { /* egal */ }
        },
        block(dim, getroffen, zufall, jetzt) {
            wolkeLegen(dim, { x: getroffen.x + 0.5, y: getroffen.y + 1.2, z: getroffen.z + 0.5 }, jetzt);
            return 1;
        },
    },
};

// Der Schattenatem (Nachtschwinge, 4.96): Wer darin steht, sieht nichts
// mehr und verdorrt - die Welt veraendert er nicht.
ATEMARTEN.schatten = {
    teilchen: "fynn:schattenatem", weite: 13, kegel: 1.0, dauer: 36, anlauf: 20, pause: [140, 220],
    laut: "mob.wither.shoot", knistern: "mob.phantom.swoop",
    wesen(ziel, drache) {
        try { ziel.addEffect("blindness", 80, { amplifier: 0 }); } catch (e) { /* egal */ }
        try { ziel.addEffect("wither", 60, { amplifier: 0 }); } catch (e) { /* egal */ }
        try { ziel.applyDamage(2, { cause: "magic", damagingEntity: drache }); } catch (e) { /* egal */ }
    },
    block() { return 0; },
};

// Das Schallbruellen (Schlunddrache, 5.00): Schallringe laufen den Strahl
// entlang nach vorn; wer darin steht, fliegt weit weg und ist benommen.
ATEMARTEN.schall = {
    teilchen: "minecraft:sonic_explosion", weite: 14, kegel: 1.1, dauer: 36, anlauf: 20, pause: [140, 220],
    laut: "mob.warden.sonic_charge", knistern: "mob.warden.sonic_boom",
    wesen(ziel, drache) {
        try {
            const d = drache.location, o = ziel.location;
            const r = einheit({ x: o.x - d.x, y: 0, z: o.z - d.z });
            ziel.applyKnockback({ x: r.x * 3.2, z: r.z * 3.2 }, 0.6);
        } catch (e) { /* egal */ }
        try { ziel.applyDamage(3, { cause: "sonic_boom", damagingEntity: drache }); } catch (e) { /* egal */ }
        try { ziel.addEffect("nausea", 120, { amplifier: 0 }); } catch (e) { /* egal */ }
        try { ziel.addEffect("slowness", 60, { amplifier: 1 }); } catch (e) { /* egal */ }
    },
    // Alle vier Ticks ein Ring in drei, sechs, neun und zwoelf Bloecken.
    strahl(dim, mund, r, jetzt) {
        if (jetzt % 4) return;
        for (const s of [3, 6, 9, 12]) {
            teilchen(dim, "minecraft:sonic_explosion", { x: mund.x + r.x * s, y: mund.y + r.y * s, z: mund.z + r.z * s });
        }
    },
    block() { return 0; },
};

// ------------------------------------------------------------ Giftwolken

export const WOLKE = { dauer: 200, weite: 3.5, abstand: 3 };
export const wolken = [];        // { dim, ort, bis }
let wolkenUhr = 0;

/** Eine Giftwolke - wo schon eine liegt, wird sie nur aufgefrischt. */
export function wolkeLegen(dim, ort, jetzt = wolkenUhr) {
    const nah = wolken.find((w) => w.dim === dim && weite(w.ort, ort) < WOLKE.abstand);
    if (nah) { nah.bis = jetzt + WOLKE.dauer; return nah; }
    const w = { dim, ort, bis: jetzt + WOLKE.dauer };
    wolken.push(w);
    return w;
}

/** Jede Sekunde: Die Wolken wabern und vergiften, wer darin steht. */
export function wolkenTakt(jetzt) {
    wolkenUhr = jetzt;
    for (let i = wolken.length - 1; i >= 0; i--) {
        const w = wolken[i];
        if (jetzt >= w.bis) { wolken.splice(i, 1); continue; }
        teilchen(w.dim, "fynn:giftwolke", w.ort);
        let drin = [];
        try { drin = w.dim.getEntities({ location: w.ort, maxDistance: WOLKE.weite }); } catch (e) { /* egal */ }
        for (const e of drin) {
            if (DRACHEN[e.typeId] || e.typeId === "minecraft:item") continue;
            try { e.addEffect("poison", 60, { amplifier: 1 }); } catch (f) { /* egal */ }
        }
    }
    return wolken.length;
}

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

// Der Plasmaschuss (Nachtschwinge): eine violette Kugel, schnell und
// gerade, die beim Aufprall explodiert - ohne Feuer. Die Explosion macht
// das Skript (plasmaTreffer), das Geschoss selbst trifft nur.
FAEHIGKEITEN.plasma = {
    min: 8, max: 40, pause: [120, 200], name: "Plasmaschuss",
    wirken(drache, mund, r) {
        const dim = drache.dimension;
        try { dim.playSound("mob.blaze.shoot", mund, { volume: 3, pitch: 0.6 }); } catch (e) { /* egal */ }
        try {
            const e = dim.spawnEntity("fynn:plasmaschuss", mund);
            const p = e.getComponent("minecraft:projectile");
            if (p) { p.owner = drache; p.shoot({ x: r.x * 2.4, y: r.y * 2.4, z: r.z * 2.4 }); }
            return e;
        } catch (e) {
            return undefined;
        }
    },
};

export function plasmaTreffer(dim, ort, quelle) {
    try {
        dim.createExplosion(ort, 1.8, { causesFire: false, breaksBlocks: erlaubtZuZuendeln(), source: quelle });
    } catch (e) { /* egal */ }
    teilchen(dim, "fynn:plasmaknall", ort);
}

// Der Schnappbiss (Schlunddrache, 5.00): Er schnellt auf sein Ziel zu und
// beisst. Kleine Tiere verschlingt er ganz (und wird davon heiler), alle
// anderen trifft es hart.
FAEHIGKEITEN.schnappen = {
    min: 4, max: 16, pause: [120, 200], name: "Schnappbiss",
    wirken(drache, mund, r, ziel) {
        if (!lebt(ziel)) return undefined;
        const d = drache.location, o = ziel.location;
        const weg = Math.hypot(o.x - d.x, o.z - d.z) || 1;
        const vor = Math.max(0, weg - 2.5);
        try {
            drache.teleport({ x: d.x + (o.x - d.x) / weg * vor, y: Math.max(d.y, o.y), z: d.z + (o.z - d.z) / weg * vor },
                            { facingLocation: o });
        } catch (e) { /* egal */ }
        try { drache.dimension.playSound("mob.ravager.bite", o, { volume: 3, pitch: 0.6 }); } catch (e) { /* egal */ }
        let leben;
        try { leben = ziel.getComponent("minecraft:health"); } catch (e) { /* egal */ }
        const klein = ziel.typeId !== "minecraft:player" && leben && leben.effectiveMax <= 20;
        if (klein) {
            try { ziel.kill(); } catch (e) { /* egal */ }
            try {
                const eigen = drache.getComponent("minecraft:health");
                eigen?.setCurrentValue(Math.min(eigen.effectiveMax, eigen.currentValue + 10));
            } catch (e) { /* egal */ }
            return "verschlungen";
        }
        try { ziel.applyDamage(14, { cause: "entityAttack", damagingEntity: drache }); } catch (e) { /* egal */ }
        return "gebissen";
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

// Funken (rechter Kopf des Giftdrachen): Liegt eine Giftwolke nahe dem
// Ziel, fliegt sie in die Luft. Sonst setzt der Funke das Ziel in Brand.
FAEHIGKEITEN.zuenden = {
    min: 3, max: 26, pause: [100, 180], name: "Funken", kopf: 1,
    wirken(drache, mund, r, ziel) {
        const dim = drache.dimension;
        teilchen(dim, "fynn:funken", mund, r);
        try { dim.playSound("fire.ignite", mund, { volume: 2, pitch: 0.8 }); } catch (e) { /* egal */ }
        const wo = ziel?.location ?? { x: mund.x + r.x * 12, y: mund.y + r.y * 12, z: mund.z + r.z * 12 };
        const wolke = wolken.find((w) => w.dim === dim && weite(w.ort, wo) < 8);
        if (wolke) {
            wolken.splice(wolken.indexOf(wolke), 1);
            system.runTimeout(() => {
                try {
                    dim.createExplosion(wolke.ort, 3, { causesFire: erlaubtZuZuendeln(), breaksBlocks: erlaubtZuZuendeln(),
                                                      source: drache });
                } catch (e) { /* egal */ }
            }, 6);
            return "Explosion";
        }
        try { ziel?.setOnFire?.(4, true); } catch (e) { /* egal */ }
        return "Funken";
    },
};

export const DRACHEN = {
    "fynn:lindwurm": {
        name: "Feuerdrache", atem: "feuer", faehigkeit: "feuerkugel", maul: 5.0, hoehe: 1.8, groesse: 1.35,
        luft: [1200, 2400], boden: [800, 1800],
        // Wie er mit Reiter fliegt: schneller als der Greif, steigt kraeftiger.
        reitflug: { tempo: 1.3, steigen: 0.14, nachziehen: 0.12, schwebe: 0.04, hoechstSteigen: 0.75 },
    },
    // Zwei Koepfe: der linke (1,8 Bloecke daneben) speit Gift, der rechte Funken.
    "fynn:giftdrache": {
        name: "Giftdrache", atem: "gift", faehigkeit: "zuenden", maul: 3.8, hoehe: 1.5, koepfe: [1.6, -1.6], groesse: 1.1,
        luft: [1000, 2000], boden: [800, 1600],
        reitflug: { tempo: 1.25, steigen: 0.13, nachziehen: 0.12, schwebe: 0.04, hoechstSteigen: 0.7 },
    },
    // Er schwebt: mit Reiter der schnellste, und er faellt kaum.
    "fynn:himmelsdrache": {
        name: "Himmelsdrache", atem: "sturm", faehigkeit: "blitzschlag", maul: 3.2, hoehe: 1.3, groesse: 1.15,
        luft: [1600, 3000], boden: [400, 900],
        reitflug: { tempo: 1.6, steigen: 0.15, nachziehen: 0.15, schwebe: 0.06, hoechstSteigen: 0.8 },
    },
    // Die Nachtschwinge (4.96): der schnellste Drache, auch mit Reiter.
    "fynn:nachtschwinge": {
        name: "Nachtschwinge", atem: "schatten", faehigkeit: "plasma", maul: 3.6, hoehe: 1.4, groesse: 1.0,
        luft: [1400, 2600], boden: [600, 1200],
        reitflug: { tempo: 1.8, steigen: 0.17, nachziehen: 0.16, schwebe: 0.05, hoechstSteigen: 0.85 },
    },
    // Der Schlunddrache (5.00): schwer, aber kraeftig.
    "fynn:schlunddrache": {
        name: "Schlunddrache", atem: "schall", faehigkeit: "schnappen", maul: 3.4, hoehe: 1.5, groesse: 1.2,
        luft: [1000, 2000], boden: [800, 1600],
        reitflug: { tempo: 1.2, steigen: 0.13, nachziehen: 0.11, schwebe: 0.04, hoechstSteigen: 0.7 },
    },
    // Kleiner und wendiger: fliegt mit Reiter schneller, steigt leichter.
    "fynn:frostwyvern": {
        name: "Frostwyvern", atem: "frost", faehigkeit: "eiskristalle", maul: 3.8, hoehe: 1.6, groesse: 0.85,
        luft: [1000, 2000], boden: [600, 1400],
        reitflug: { tempo: 1.45, steigen: 0.15, nachziehen: 0.14, schwebe: 0.045, hoechstSteigen: 0.8 },
    },
};

export const BESIEGT = { anteil: 0.25, dauer: 6000, hiebe: 3 };
// Uralte Drachen (4.97): so selten, so viel groesser (wie URALT_GROESSE in
// drachen_daten.py), so viel staerker.
export const URALT = { chance: 0.04, groesse: 2.2, weite: 1.5, kegel: 1.3, schaden: 4, pause: 0.5, flug: 1.35,
                       schuppen: 8 };
export const SCHLAF = { weckweite: 8, weckchance: 0.35 };
export const PFEIFE = "fynn:drachenpfeife";
const HEILMITTEL = new Set(["minecraft:golden_apple", "minecraft:enchanted_golden_apple"]);

// ------------------------------------------------------------ Jungdrachen und Erbe (5.2)
//
// Wie gross ein Drache ist (fynn:wuchs, 10 = erwachsen) und was er geerbt
// hat, steht an ihm selbst: Atem und Faehigkeit koennen von seinen Eltern
// stammen statt von seiner Art (scripts/drachenzucht.js).
export const WUCHS = 10;
// Was die Zucht (drachenzucht.js) hier einhaengt: die Gabe fuer die Pfeife
// und eine Zeile ueber das Erbe beim Antippen.
export const zusatz = { pfeife: null, info: null };
export const FLEISCH = new Set(["minecraft:beef", "minecraft:porkchop", "minecraft:mutton", "minecraft:chicken",
    "minecraft:rabbit", "minecraft:cod", "minecraft:salmon", "fynn:elchfleisch", "fynn:bisonfleisch"]);

export function wuchsVon(d) {
    const w = eig(d, "fynn:wuchs");
    return typeof w === "number" ? w : WUCHS;
}
/** So gross im Verhaeltnis zum Erwachsenen (wie im Aussehen: 0,3 bis 1). */
export function wuchsFaktor(d) {
    return 0.3 + 0.7 * wuchsVon(d) / WUCHS;
}
function erbe(d, schluessel) {
    try { return d.getDynamicProperty(schluessel); } catch (e) { return undefined; }
}
export function atemVon(d) {
    const a = erbe(d, "fynn:atem");
    return ATEMARTEN[a] ? a : DRACHEN[d.typeId]?.atem;
}
/** Die Blutlinie (5.2): Gezuechtete werden je Generation staerker, bis zur
 *  sechsten - 12 % je Stufe; ein Uralter noch einmal die Haelfte. */
export function blutMacht(d) {
    const gen = Number(erbe(d, "fynn:generation") ?? 1);
    return (1 + 0.12 * Math.min(5, Math.max(0, gen - 1))) * (eig(d, "fynn:uralt") ? 1.5 : 1);
}
export function faehigkeitVon(d) {
    const f = erbe(d, "fynn:faehigkeit");
    return FAEHIGKEITEN[f] ? f : DRACHEN[d.typeId]?.faehigkeit;
}

// ------------------------------------------------------------ Kleinkram

export function lebt(w) {
    try { return !!w && w.isValid !== false; } catch (e) { return false; }
}
export function weite(a, b) {
    return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z);
}
export function einheit(v) {
    const l = Math.hypot(v.x, v.y, v.z) || 1;
    return { x: v.x / l, y: v.y / l, z: v.z / l };
}
export function eig(w, n) {
    try { return w.getProperty(n); } catch (e) { return undefined; }
}
export function istZahm(d) {
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
export function leiste(dim, ort, text, weite = 24) {
    try {
        for (const s of dim.getEntities({ type: "minecraft:player", location: ort, maxDistance: weite })) {
            s.onScreenDisplay?.setActionBar(text);
        }
    } catch (e) { /* egal */ }
}

/** Wo das Maul ist: vor dem Leib in Blickrichtung, etwas hoeher. kopf:
 *  welcher Kopf (der Giftdrache hat zwei, seitlich versetzt). */
export function maul(drache, kopf = 0) {
    const art = DRACHEN[drache.typeId] ?? DRACHEN["fynn:lindwurm"];
    const o = drache.location;
    let b = { x: 0, y: 0, z: 1 };
    try { b = drache.getViewDirection(); } catch (e) { /* geradeaus */ }
    const flach = einheit({ x: b.x, y: 0, z: b.z });
    // Die Arten sind verschieden gross (4.95); die Masse oben gelten fuer
    // Groesse 1, das Maul wandert mit - bei den Uralten noch weiter.
    const g = (art.groesse ?? 1) * (eig(drache, "fynn:uralt") ? URALT.groesse : 1) * wuchsFaktor(drache);
    const seite = (art.koepfe?.[kopf] ?? 0) * g;
    return { x: o.x + flach.x * art.maul * g - flach.z * seite, y: o.y + art.hoehe * g,
             z: o.z + flach.z * art.maul * g + flach.x * seite };
}

export function teilchen(dim, name, ort, r) {
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

/** Der Atem eines Uralten reicht weiter, ist breiter und trifft haerter.
 *  Ein Junges (5.2) speit erst ab halber Groesse, und nur so weit, wie es
 *  gross ist. */
function staerker(atem, drache) {
    if (wuchsVon(drache) < WUCHS) return { ...atem, weite: atem.weite * wuchsFaktor(drache) };
    const gen = Math.min(5, Math.max(0, Number(erbe(drache, "fynn:generation") ?? 1) - 1));
    if (gen > 0 && !eig(drache, "fynn:uralt")) {
        // Eine starke Blutlinie: weiter und haerter, je Generation ein Stueck.
        return {
            ...atem, weite: atem.weite * (1 + 0.06 * gen),
            wesen(ziel, d) {
                atem.wesen(ziel, d);
                try { ziel.applyDamage(gen, { cause: "magic", damagingEntity: d }); } catch (e) { /* egal */ }
            },
        };
    }
    if (!eig(drache, "fynn:uralt")) return atem;
    return {
        ...atem, weite: atem.weite * URALT.weite, kegel: atem.kegel * URALT.kegel,
        wesen(ziel, d) {
            atem.wesen(ziel, d);
            try { ziel.applyDamage(URALT.schaden, { cause: "magic", damagingEntity: d }); } catch (e) { /* egal */ }
        },
    };
}

/** Einmal je Drache wird gewuerfelt, ob er uralt ist. */
export function uraltWuerfeln(drache, zufall = Math.random) {
    try {
        if (drache.getDynamicProperty("fynn:gewuerfelt")) return false;
        drache.setDynamicProperty("fynn:gewuerfelt", true);
    } catch (e) { return false; }
    // Gezuechtete Drachen erben das Uralte von ihren Eltern (drachenzucht.js).
    if (wuchsVon(drache) < WUCHS || erbe(drache, "fynn:gezuechtet")) return false;
    if (istZahm(drache) || zufall() >= URALT.chance) return false;
    try {
        drache.triggerEvent("fynn:uralt_werden");
        drache.dimension.playSound("mob.enderdragon.growl", drache.location, { volume: 6, pitch: 0.5 });
    } catch (e) { return false; }
    return true;
}

/** Ein Takt (alle 2 Ticks) des Atems. Liefert, was er tut. */
export function atemTakt(drache, jetzt, zufall = Math.random) {
    const art = DRACHEN[drache.typeId];
    if (!art) return "kein Drache";
    if (eig(drache, "fynn:besiegt") || eig(drache, "fynn:schlaeft")) return "ruht";
    if (wuchsVon(drache) < WUCHS / 2) return "zu jung";
    const atem = staerker(ATEMARTEN[atemVon(drache)], drache);
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
        // Was jede Art zusaetzlich ausstoesst (Eissplitter, Schallringe ...).
        if (atem.beiteilchen) teilchen(dim, atem.beiteilchen, mund, r);
        if (atem.strahl) atem.strahl(dim, mund, r, jetzt);
        if ((jetzt - z.ab) % 6 === 0) {
            for (const w of imKegel(dim, mund, r, atem, drache)) atem.wesen(w, drache);
            // Was die Welt veraendert (Feuer, Eis, Schnee), nur mit mobGriefing;
            // eine Giftwolke dagegen immer.
            if (!atem.veraendert || erlaubtZuZuendeln()) {
                try {
                    const hit = dim.getBlockFromRay(mund, r, { maxDistance: atem.weite, includeLiquidBlocks: true,
                                                                includePassableBlocks: false });
                    // Ob der Block passt, weiss die Atemart: Feuer nicht auf Wasser, Frost gerade dort.
                    if (hit?.block) atem.block(dim, hit.block.location, zufall, jetzt);
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
    // Tief Luft holen - eine Sekunde lang baeumt er sich auf (die Bewegung
    // luftholen im Modell), dann kommt der Strahl.
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
    const f = art && FAEHIGKEITEN[faehigkeitVon(drache)];
    if (!f || eig(drache, "fynn:besiegt") || eig(drache, "fynn:schlaeft")) return "nichts";
    if (wuchsVon(drache) < WUCHS) return "zu jung";
    const z = von(drache);
    if (jetzt < z.kugelPause || z.bis) return "wartet";
    const mund = maul(drache, f.kopf ?? 0);
    let r = richtung;
    if (!r) {
        if (reiterVon(drache)) return "wartet";
        const ziel = zielFuer(drache, z, jetzt);
        if (!lebt(ziel)) return "wartet";
        const d = weite(drache.location, ziel.location);
        if (d < f.min || d > f.max) return "wartet";
        r = einheit({ x: ziel.location.x - mund.x, y: ziel.location.y + 0.8 - mund.y, z: ziel.location.z - mund.z });
    }
    const pause = f.pause[0] + Math.floor(zufall() * (f.pause[1] - f.pause[0]));
    z.kugelPause = jetzt + Math.round(pause * (eig(drache, "fynn:uralt") ? URALT.pause : 1));
    const was = f.wirken(drache, mund, r, richtung ? undefined : zielFuer(drache, z, jetzt));
    return typeof was === "string" ? was : f.name;
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
    const erbe = zusatz.info?.(drache);
    spieler.onScreenDisplay?.setActionBar((bleibt ? `§aDer ${name} kommt mit.` : `§eDer ${name} wartet hier.`)
        + (erbe ? ` §7${erbe}` : ""));
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
        // Eine Gabe (5.2) geht vor, wenn sie bereit ist.
        const gabe = zusatz.pfeife?.(geritten, spieler, jetzt, r);
        if (gabe && gabe !== "wartet") {
            spieler.onScreenDisplay?.setActionBar(`§d${gabe}!`);
            return gabe;
        }
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
        // Mit rohem Fleisch in der Hand fuettert man (drachenzucht.js).
        if (FLEISCH.has(e.itemStack?.typeId)) return;
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
    // Ein Uralter hinterlaesst mehr Schuppen.
    try {
        const d = e.deadEntity;
        if (DRACHEN[d?.typeId] && eig(d, "fynn:uralt")) {
            d.dimension.spawnItem(new mc.ItemStack("fynn:drachenschuppe", URALT.schuppen), d.location);
        }
    } catch (fehler) { /* egal */ }
});

world.afterEvents.projectileHitBlock.subscribe((e) => {
    try {
        if (e.projectile?.typeId === "fynn:plasmaschuss") plasmaTreffer(e.dimension, e.location, e.source);
    } catch (fehler) { /* egal */ }
});

world.afterEvents.projectileHitEntity.subscribe((e) => {
    try {
        if (e.projectile?.typeId === "fynn:plasmaschuss") plasmaTreffer(e.dimension, e.location, e.source);
    } catch (fehler) { /* egal */ }
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
        if (r % 10 === 0 && wolken.length) wolkenTakt(jetzt);
        for (const dimName of ["overworld", "nether"]) {
            let welt;
            try { welt = world.getDimension(dimName); } catch (f) { continue; }
            for (const typ of Object.keys(DRACHEN)) {
                for (const d of welt.getEntities({ type: typ })) {
                    try {
                        const reiter = reiterVon(d);
                        if (r % 40 === 0) uraltWuerfeln(d);
                        if (reiter) {
                            const rf = DRACHEN[typ].reitflug;
                            reitflug(d, eig(d, "fynn:uralt") ? { ...rf, tempo: rf.tempo * URALT.flug } : rf);
                        }
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
