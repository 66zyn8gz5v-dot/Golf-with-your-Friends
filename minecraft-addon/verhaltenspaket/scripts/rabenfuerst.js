// Morvan, der Rabenfuerst - Koenig aller Banditen. Der Kampf.
//
// Roland stellt sich, Morvan weicht aus: Wurfmesser im Faecher, die
// Rauchbombe und der Stich von hinten, Schattendoppelgaenger, ein
// Rabenschwarm, drei Schattenspruenge durch den Gegner. In Phase zwei
// bringt er die Nacht der Raben (Dunkelheit fuer alle). Takt, Phasen,
// Schutz, Staerke und Beute kommen aus boss_kern.js; hier steht nur, was
// Morvan ausmacht. Die Zeiten stammen aus rabenfuerst_daten.js, geschrieben
// zusammen mit den Animationen.

import { world, system } from "@minecraft/server";
import {
    bossKampf, abstand, richtung, blickRichtung, schaue, funken, ton, spielerBei, ziele, gueltig,
    istKreativ, frei, boden, verbrauche, ruht, titel,
} from "./boss_kern.js";
import { ANGRIFFE, LEBEN, MEHR_SPIELER, LETZTE_KRAFT, BEUTE, ANTEIL } from "./rabenfuerst_daten.js";

export const TYP = "fynn:rabenfuerst";
export const SCHATTEN = "fynn:schattendoppelgaenger";
const SCHONEN = ["rabenfuerst"];
const A = ANGRIFFE;

// ------------------------------------------------------------ Hilfen

function drehe(r, grad) {
    const w = grad * Math.PI / 180;
    return { x: r.x * Math.cos(w) - r.z * Math.sin(w), z: r.x * Math.sin(w) + r.z * Math.cos(w) };
}

function hinter(ziel, weite = 1.6) {
    // Hinter dem Ziel: gegen seine Blickrichtung (Spieler) oder von Morvan aus weiter.
    const blick = ziel.getViewDirection?.();
    const l = blick ? Math.hypot(blick.x, blick.z) : 0;
    const r = l > 0.1 ? { x: -blick.x / l, z: -blick.z / l } : null;
    return r;
}

function versetze(z, ort, blickZu) {
    const dim = z.boss.dimension;
    const ziel = boden(dim, ort, 2) ?? ort;
    funken(dim, "fynn:rauchwolke", { x: z.boss.location.x, y: z.boss.location.y + 1, z: z.boss.location.z });
    try {
        z.boss.teleport(ziel, { keepVelocity: false, facingLocation: blickZu ?? ziel });
    } catch (e) { /* geht nicht - er bleibt */ }
    funken(dim, "fynn:rauchwolke", { x: ziel.x, y: ziel.y + 1, z: ziel.z });
    ton(dim, "mob.bat.takeoff", ziel, 1, 0.7);
    return ziel;
}

// ------------------------------------------------------------ Angriffe

export function faecherRichtungen(r, breite = 30, anzahl = 5) {
    const aus = [];
    for (let i = 0; i < anzahl; i++) aus.push(drehe(r, -breite + (2 * breite * i) / (anzahl - 1)));
    return aus;
}

function dolchfaecher(z, a, t) {
    const d = A.dolchfaecher;
    const dim = z.boss.dimension;
    if (t === d.wurf) {
        const r = gueltig(a.ziel) ? richtung(z.boss.location, a.ziel.location) : blickRichtung(z.boss);
        a.start = { x: z.boss.location.x, y: z.boss.location.y + 1.4, z: z.boss.location.z };
        a.dolche = faecherRichtungen(r, z.phase === 2 ? 40 : 30, z.phase === 2 ? 7 : 5).map((richt) => ({ richt, fertig: false }));
        ton(dim, "random.bow", z.boss.location, 1, 1.4);
    }
    if (a.dolche && t > d.wurf && t <= d.wurf + 8) {
        const weite = (t - d.wurf) * 2;
        for (const dolch of a.dolche) {
            if (dolch.fertig) continue;
            const p = { x: a.start.x + dolch.richt.x * weite, y: a.start.y, z: a.start.z + dolch.richt.z * weite };
            if (!frei(dim, { x: p.x, y: p.y - 0.5, z: p.z }, 0)) { dolch.fertig = true; continue; }
            funken(dim, "fynn:wurfdolch", p);
            for (const w of ziele(z.boss, p, 1.0, SCHONEN)) {
                kampf.treffe(z, w, 5, { x: dolch.richt.x * 0.4, z: dolch.richt.z * 0.4 }, 0.15);
                try { w.addEffect("poison", 60, { amplifier: 0 }); } catch (e) { /* egal */ }
                dolch.fertig = true;
                break;
            }
        }
    }
}

function rauchbombe(z, a, t) {
    const d = A.rauchbombe;
    const dim = z.boss.dimension;
    const ort = z.boss.location;
    if (t === d.bombe) {
        funken(dim, "fynn:rauchwolke", { x: ort.x, y: ort.y + 0.5, z: ort.z });
        funken(dim, "fynn:rauchwolke", { x: ort.x, y: ort.y + 1.5, z: ort.z });
        ton(dim, "random.fizz", ort, 1, 0.6);
        for (const s of spielerBei(z.boss, 5)) {
            try { s.addEffect("blindness", 50, { amplifier: 0 }); } catch (e) { /* egal */ }
        }
    }
    if (t === d.weg) {
        try { z.boss.addEffect("invisibility", d.hinter - d.weg + 4, { amplifier: 0, showParticles: false }); } catch (e) { /* egal */ }
    }
    if (t === d.hinter && gueltig(a.ziel)) {
        const r = hinter(a.ziel) ?? richtung(z.boss.location, a.ziel.location);
        const ort2 = { x: a.ziel.location.x + r.x * 1.6, y: a.ziel.location.y, z: a.ziel.location.z + r.z * 1.6 };
        versetze(z, ort2, { x: a.ziel.location.x, y: a.ziel.location.y + 1.6, z: a.ziel.location.z });
        try { z.boss.removeEffect("invisibility"); } catch (e) { /* egal */ }
    }
    if (t === d.stich) {
        const r = gueltig(a.ziel) ? richtung(z.boss.location, a.ziel.location) : blickRichtung(z.boss);
        const vorn = { x: z.boss.location.x + r.x * 1.5, y: z.boss.location.y + 1, z: z.boss.location.z + r.z * 1.5 };
        ton(dim, "item.trident.hit", vorn, 1, 1.3);
        for (const w of ziele(z.boss, vorn, 2.2, SCHONEN)) kampf.treffe(z, w, 12, { x: r.x * 1.2, z: r.z * 1.2 }, 0.3);
    }
}

function doppelgaenger(z, a, t) {
    if (t === A.doppelgaenger.schatten) {
        const n = z.phase === 2 ? 3 : 2;
        const neu = kampf.rufe(z, SCHATTEN, n, n + 1, 2.5);
        for (const g of neu) funken(z.boss.dimension, "fynn:rauchwolke", { x: g.location.x, y: g.location.y + 1, z: g.location.z });
        ton(z.boss.dimension, "mob.evocation_illager.prepare_summon", z.boss.location, 1.2, 1.4);
    }
}

function rabenschwarm(z, a, t) {
    const d = A.rabenschwarm;
    const dim = z.boss.dimension;
    if (t === d.los) {
        a.schwarm = { x: z.boss.location.x, y: z.boss.location.y + 2.2, z: z.boss.location.z };
        a.getroffen = new Set();
        ton(dim, "mob.bat.takeoff", a.schwarm, 1.5, 0.6);
    }
    if (a.schwarm && t > d.los && t <= d.bis) {
        if (gueltig(a.ziel)) {
            const zielort = { x: a.ziel.location.x, y: a.ziel.location.y + 1.2, z: a.ziel.location.z };
            const dx = zielort.x - a.schwarm.x, dy = zielort.y - a.schwarm.y, dz = zielort.z - a.schwarm.z;
            const l = Math.hypot(dx, dy, dz);
            const schritt = Math.min(l, 0.8);
            if (l > 0.01) {
                a.schwarm = { x: a.schwarm.x + dx / l * schritt, y: a.schwarm.y + dy / l * schritt, z: a.schwarm.z + dz / l * schritt };
            }
        }
        funken(dim, "fynn:rabenschwarm", a.schwarm);
        if (t >= d.von && (t - d.von) % 8 === 0) {
            for (const w of ziele(z.boss, a.schwarm, 1.9, SCHONEN)) {
                kampf.treffe(z, w, 2, null);
                if (!a.getroffen.has(w.id)) {
                    a.getroffen.add(w.id);
                    try { w.addEffect("blindness", 30, { amplifier: 0 }); } catch (e) { /* egal */ }
                }
            }
        }
    }
}

function schattensprung(z, a, t) {
    const d = A.schattensprung;
    for (const schnitt of d.schnitte) {
        if (t === schnitt - 3 && gueltig(a.ziel)) {
            // Durch den Gegner hindurch: auf die andere Seite.
            const r = richtung(z.boss.location, a.ziel.location);
            const ort = { x: a.ziel.location.x + r.x * 2.2, y: a.ziel.location.y, z: a.ziel.location.z + r.z * 2.2 };
            versetze(z, ort, { x: a.ziel.location.x, y: a.ziel.location.y + 1.6, z: a.ziel.location.z });
        }
        if (t === schnitt) {
            const ort = z.boss.location;
            ton(z.boss.dimension, "item.trident.riptide_1", ort, 0.8, 1.6);
            for (const w of ziele(z.boss, ort, 2.6, SCHONEN)) {
                const weg = richtung(ort, w.location);
                kampf.treffe(z, w, 7, { x: weg.x * 0.8, z: weg.z * 0.8 }, 0.25);
            }
        }
    }
}

function rabennacht(z, a, t) {
    if (t === A.rabennacht.nacht) {
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        ton(dim, "mob.wither.shoot", ort, 1, 0.5);
        for (let i = 0; i < 8; i++) {
            const w = i * Math.PI / 4;
            funken(dim, "fynn:rabenschwarm", { x: ort.x + Math.cos(w) * 2.5, y: ort.y + 1.5, z: ort.z + Math.sin(w) * 2.5 });
        }
        for (const s of spielerBei(z.boss, 18)) {
            try { s.addEffect("darkness", 140, { amplifier: 0 }); } catch (e) { /* egal */ }
        }
        for (const w of ziele(z.boss, ort, 5, SCHONEN)) {
            const weg = richtung(ort, w.location);
            kampf.treffe(z, w, 4, { x: weg.x * 1.4, z: weg.z * 1.4 }, 0.5);
        }
    }
}

// ------------------------------------------------------------ Die Wahl

const ABKLINGEN = {
    dolchfaecher: 140, rauchbombe: 240, doppelgaenger: 420, rabenschwarm: 300, schattensprung: 220, rabennacht: 520,
};

export function moeglich(z, weite, bereit) {
    const liste = [];
    if (weite > 4 && weite < 16 && bereit("dolchfaecher")) liste.push("dolchfaecher");
    if (weite < 14 && bereit("rauchbombe")) liste.push("rauchbombe");
    if (bereit("doppelgaenger") && z.gefolge.filter(gueltig).length < 2) liste.push("doppelgaenger");
    if (weite < 20 && bereit("rabenschwarm")) liste.push("rabenschwarm");
    if (weite > 3 && weite < 12 && bereit("schattensprung")) liste.push("schattensprung");
    if (z.phase === 2 && weite < 16 && bereit("rabennacht")) liste.push("rabennacht");
    return liste;
}

// ------------------------------------------------------------ Der Kampf

export const kampf = bossKampf({
    typ: TYP,
    name2: "Morvan · Phase 2",
    angriffe: A, leben: LEBEN, mehrSpieler: MEHR_SPIELER, letzteKraft: LETZTE_KRAFT,
    beute: BEUTE, anteil: ANTEIL,
    pause: { 1: [50, 90], 2: [30, 60] },
    abklingen: ABKLINGEN,
    wechselName: "wechsel", auftrittName: "auftritt", abschiedName: "abschied",
    titelAuftritt: ["§5Morvan, der Rabenfürst", "§7König aller Banditen"],
    titelWechsel: ["§5Morvan hüllt sich in Schatten", "§7Er ist unverwundbar"],
    titelSieg: "§7Morvan zerstiebt zu Raben",
    gefolgeWeg: "fynn:rauchwolke",
    schritte: { dolchfaecher, rauchbombe, doppelgaenger, rabenschwarm, schattensprung, rabennacht },
    waehle(z, ziel, weite) {
        const liste = moeglich(z, weite, (n) => kampf.bereit(z, n));
        return liste.length ? liste[Math.floor(Math.random() * liste.length)] : null;
    },
    wechsel(z, a, t) {
        const d = A.wechsel;
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        if (t === 0) ton(dim, "mob.bat.death", ort, 1.5, 0.6);
        if (t >= d.laden_von && t < d.laden_bis) {
            if (t % 5 === 0) funken(dim, "fynn:rauchwolke", { x: ort.x, y: ort.y + 1 + (t % 3), z: ort.z });
            if (t % 3 === 0) {
                const w = t * 0.35;
                const hoch = 0.5 + ((t - d.laden_von) / (d.laden_bis - d.laden_von)) * 2.5;
                funken(dim, "fynn:rabenschwarm", { x: ort.x + Math.cos(w) * 2.2, y: ort.y + hoch, z: ort.z + Math.sin(w) * 2.2 });
            }
        }
    },
    phaseZwei(z) {
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        ton(dim, "mob.enderdragon.growl", ort, 1.5, 0.6);
        for (let i = 0; i < 10; i++) {
            const w = i * Math.PI / 5;
            funken(dim, "fynn:rabenschwarm", { x: ort.x + Math.cos(w) * 1.5, y: ort.y + 1.5, z: ort.z + Math.sin(w) * 1.5 });
        }
        funken(dim, "fynn:rauchwolke", { x: ort.x, y: ort.y + 1, z: ort.z });
        for (const w of ziele(z.boss, ort, 6, SCHONEN)) {
            const weg = richtung(ort, w.location);
            kampf.treffe(z, w, 3, { x: weg.x * 2.4, z: weg.z * 2.4 }, 0.7);
        }
        for (const s of spielerBei(z.boss, 18)) {
            try { s.addEffect("darkness", 60, { amplifier: 0 }); } catch (e) { /* egal */ }
        }
        kampf.rufe(z, SCHATTEN, 2, 3, 2.5);
        titel(spielerBei(z.boss, 48), "§dSchattengestalt", "§7Morvan ruft die Nacht");
    },
    auftritt(z, a, t) {
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        if (t === 0) {
            for (let i = 0; i < 6; i++) funken(dim, "fynn:rabenschwarm", { x: ort.x, y: ort.y + 1 + i * 0.4, z: ort.z });
            funken(dim, "fynn:rauchwolke", { x: ort.x, y: ort.y + 1, z: ort.z });
            ton(dim, "mob.bat.takeoff", ort, 2, 0.6);
        }
    },
    abschied(z, a, t) {
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        if (t % 10 === 0) funken(dim, "fynn:rauchwolke", { x: ort.x, y: ort.y + 0.5, z: ort.z });
        if (t === A.abschied.beute) {
            for (let i = 0; i < 12; i++) {
                funken(dim, "fynn:rabenschwarm", { x: ort.x, y: ort.y + 0.5 + i * 0.25, z: ort.z });
            }
            ton(dim, "mob.bat.takeoff", ort, 2, 0.5);
        }
    },
    immer(z) {
        if (z.phase === 2 && system.currentTick % 10 === 0) funken(z.boss.dimension, "fynn:schattenfunken", z.boss.location);
    },
});

// Ein Schatten zerfaellt zu Rauch.
world.afterEvents.entityDie.subscribe((e) => {
    try {
        if (e.deadEntity?.typeId !== SCHATTEN) return;
        const o = e.deadEntity.location;
        funken(e.deadEntity.dimension, "fynn:rauchwolke", { x: o.x, y: o.y + 1, z: o.z });
    } catch (fehler) { /* schon weg */ }
});

// ------------------------------------------------------------ Gegenstaende

// Rabenklinge: Schattensprung - bis zu acht Bloecke nach vorn, drei
// Sekunden unsichtbar und schnell; wer im Weg steht, wird geschnitten.
export function schattensprungSpieler(spieler) {
    if (ruht(spieler, "rabenklinge", 120)) return false;
    const dim = spieler.dimension;
    const blick = spieler.getViewDirection?.() ?? { x: 0, z: 1 };
    const l = Math.hypot(blick.x, blick.z) || 1;
    const r = { x: blick.x / l, z: blick.z / l };
    const start = { ...spieler.location };
    let ende = start;
    const getroffen = new Set();
    for (let i = 1; i <= 8; i++) {
        const p = { x: start.x + r.x * i, y: start.y, z: start.z + r.z * i };
        if (!frei(dim, p, 2)) break;
        ende = p;
        let wesen = [];
        try { wesen = dim.getEntities({ location: p, maxDistance: 1.4, excludeFamilies: ["player", "inanimate"] }); } catch (e) { /* egal */ }
        for (const w of wesen) {
            if (getroffen.has(w.id) || !w.getComponent?.("minecraft:health") || w.getComponent?.("minecraft:tameable")?.isTamed) continue;
            getroffen.add(w.id);
            try { w.applyDamage(6, { cause: "entityAttack", damagingEntity: spieler }); } catch (e) { /* egal */ }
        }
    }
    funken(dim, "fynn:rauchwolke", { x: start.x, y: start.y + 1, z: start.z });
    try { spieler.teleport(ende, { keepVelocity: false }); } catch (e) { /* bleibt */ }
    funken(dim, "fynn:rauchwolke", { x: ende.x, y: ende.y + 1, z: ende.z });
    try {
        spieler.addEffect("invisibility", 60, { amplifier: 0, showParticles: false });
        spieler.addEffect("speed", 60, { amplifier: 1, showParticles: false });
    } catch (e) { /* egal */ }
    ton(dim, "mob.bat.takeoff", ende, 1, 1);
    return true;
}

// Rauchbombe: Rauch um dich, du bist acht Sekunden unsichtbar und schnell,
// Monster in der Wolke taumeln.
export function rauchbombeSpieler(spieler) {
    if (ruht(spieler, "rauchbombe", 40)) return false;
    const dim = spieler.dimension;
    const o = spieler.location;
    funken(dim, "fynn:rauchwolke", { x: o.x, y: o.y + 0.5, z: o.z });
    funken(dim, "fynn:rauchwolke", { x: o.x, y: o.y + 1.5, z: o.z });
    ton(dim, "random.fizz", o, 1, 0.6);
    try {
        spieler.addEffect("invisibility", 160, { amplifier: 0, showParticles: false });
        spieler.addEffect("speed", 160, { amplifier: 1, showParticles: false });
    } catch (e) { /* egal */ }
    let nah = [];
    try { nah = dim.getEntities({ location: o, maxDistance: 5, families: ["monster"] }); } catch (e) { /* egal */ }
    for (const m of nah) {
        try {
            m.addEffect("slowness", 100, { amplifier: 2 });
            m.addEffect("weakness", 100, { amplifier: 0 });
        } catch (e) { /* egal */ }
    }
    if (!istKreativ(spieler)) verbrauche(spieler);
    return true;
}

// Kopfgeldbrief: "Wer das liest, sucht mich." Morvan kommt.
export function kopfgeld(spieler) {
    const dim = spieler.dimension;
    let schonDa = [];
    try { schonDa = dim.getEntities({ type: TYP, location: spieler.location, maxDistance: 96 }); } catch (e) { /* egal */ }
    if (schonDa.length) {
        try { spieler.onScreenDisplay?.setActionBar("§7Morvan ist schon hier."); } catch (e) { /* egal */ }
        return false;
    }
    if (ruht(spieler, "kopfgeld", 100)) return false;
    const blick = spieler.getViewDirection?.() ?? { x: 0, z: 1 };
    const l = Math.hypot(blick.x, blick.z) || 1;
    let ort = { x: spieler.location.x + blick.x / l * 6, y: spieler.location.y, z: spieler.location.z + blick.z / l * 6 };
    ort = boden(dim, ort) ?? spieler.location;
    if (!istKreativ(spieler)) verbrauche(spieler);
    ton(dim, "mob.bat.takeoff", ort, 2, 0.5);
    for (let i = 0; i < 6; i++) system.runTimeout(() => funken(dim, "fynn:rabenschwarm", { x: ort.x, y: ort.y + 1 + i * 0.3, z: ort.z }), i * 5);
    system.runTimeout(() => {
        try { dim.spawnEntity(TYP, ort); } catch (e) { console.warn(`Morvan, Kopfgeld: ${e}`); }
    }, 32);
    return true;
}

world.afterEvents.itemUse.subscribe((e) => {
    try {
        const typ = e.itemStack?.typeId;
        if (typ === "fynn:rabenklinge") schattensprungSpieler(e.source);
        else if (typ === "fynn:rauchbombe") rauchbombeSpieler(e.source);
        else if (typ === "fynn:kopfgeldbrief") kopfgeld(e.source);
    } catch (fehler) {
        console.warn(`Morvan, Gegenstand: ${fehler}`);
    }
});
