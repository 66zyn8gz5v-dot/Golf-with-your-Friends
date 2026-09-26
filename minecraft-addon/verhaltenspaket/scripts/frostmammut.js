// Hrimgar, das Frostmammut - der dritte Boss. Der Kampf.
//
// Roland ficht, Morvan weicht aus, Hrimgar walzt: Es stuermt durch die
// Reihen, stampft eine Welle in den Boden (wer springt, entgeht ihr), fegt
// mit den Stosszaehnen, schleudert mit dem Ruessel und laesst Eiszapfen
// regnen. In Phase zwei zerspringt der Eispanzer; dann speit es Frostatem
// und ruft Eiswoelfe. Takt, Phasen, Schutz, Staerke und Beute kommen aus
// boss_kern.js. Die Zeiten stammen aus frostmammut_daten.js, geschrieben
// zusammen mit den Animationen.

import { world, system } from "@minecraft/server";
import {
    bossKampf, abstand, richtung, blickRichtung, funken, ton, spielerBei, ziele, gueltig,
    istKreativ, frei, boden, verbrauche, ruht, titel,
} from "./boss_kern.js";
import { ANGRIFFE, LEBEN, MEHR_SPIELER, LETZTE_KRAFT, BEUTE, ANTEIL } from "./frostmammut_daten.js";

export const TYP = "fynn:frostmammut";
export const WOLF = "fynn:eiswolf";
const SCHONEN = ["frostmammut"];
const A = ANGRIFFE;

// ------------------------------------------------------------ Hilfen

function drehe(r, grad) {
    const w = grad * Math.PI / 180;
    return { x: r.x * Math.cos(w) - r.z * Math.sin(w), z: r.x * Math.sin(w) + r.z * Math.cos(w) };
}

// Der Winkel zwischen der Blickrichtung r und dem Weg zu einem Ort, in Grad.
export function winkelZu(von, r, ort) {
    const weg = richtung(von, ort);
    const kos = Math.max(-1, Math.min(1, r.x * weg.x + r.z * weg.z));
    return Math.acos(kos) * 180 / Math.PI;
}

function amBoden(wesen) {
    try {
        return wesen.isOnGround !== false;
    } catch (e) {
        return true;
    }
}

function frieren(wesen, dauer, staerke = 1) {
    try { wesen.addEffect("slowness", dauer, { amplifier: staerke }); } catch (e) { /* egal */ }
}

function ring(dim, mitte, r, anzahl, art = "fynn:frostwolke") {
    for (let i = 0; i < anzahl; i++) {
        const w = (i / anzahl) * Math.PI * 2;
        funken(dim, art, { x: mitte.x + Math.cos(w) * r, y: mitte.y + 0.2, z: mitte.z + Math.sin(w) * r });
    }
}

// ------------------------------------------------------------ Angriffe

// Ansturm: die Richtung steht beim Losrennen fest - wer ausweicht, dem
// donnert es vorbei. Jeder in der Bahn wird einmal getroffen und fliegt
// zur Seite. An einer Wand bleibt es stehen.
function ansturm(z, a, t) {
    const d = A.ansturm;
    const dim = z.boss.dimension;
    if (t === d.los) {
        a.richt = gueltig(a.ziel) ? richtung(z.boss.location, a.ziel.location) : blickRichtung(z.boss);
        a.getroffen = new Set();
        ton(dim, "mob.ravager.roar", z.boss.location, 1.5, 0.7);
    }
    if (!a.richt || t <= d.los || t > d.halt || a.steht) return;
    const o = z.boss.location;
    const schritt = z.phase === 2 ? 0.62 : 0.5;
    const naechst = { x: o.x + a.richt.x * schritt, y: o.y, z: o.z + a.richt.z * schritt };
    const vorn = { x: o.x + a.richt.x * 2.2, y: o.y, z: o.z + a.richt.z * 2.2 };
    if (!frei(dim, vorn, 3)) {
        a.steht = true;
        ton(dim, "random.explode", vorn, 0.8, 0.8);
        funken(dim, "fynn:frostwolke", { x: vorn.x, y: vorn.y + 1, z: vorn.z });
        return;
    }
    const auf = boden(dim, naechst, 3) ?? naechst;
    try {
        z.boss.teleport({ x: naechst.x, y: auf.y, z: naechst.z },
            { keepVelocity: false, facingLocation: { x: naechst.x + a.richt.x * 4, y: auf.y + 2, z: naechst.z + a.richt.z * 4 } });
    } catch (e) { /* bleibt stehen */ }
    if (t % 3 === 0) funken(dim, "fynn:frostwolke", { x: o.x, y: o.y + 0.3, z: o.z });
    for (const w of ziele(z.boss, vorn, 2.6, SCHONEN)) {
        if (a.getroffen.has(w.id)) continue;
        a.getroffen.add(w.id);
        // Zur Seite, auf die es naeher dran steht - wie ein Pflug.
        const seite = (w.location.x - o.x) * a.richt.z - (w.location.z - o.z) * a.richt.x > 0 ? 1 : -1;
        const stoss = { x: a.richt.x * 0.8 + a.richt.z * seite * 1.4, z: a.richt.z * 0.8 - a.richt.x * seite * 1.4 };
        kampf.treffe(z, w, 11, stoss, 0.6);
        ton(dim, "random.anvil_land", w.location, 0.6, 0.6);
    }
}

// Stampfen: ein Ring laeuft nach aussen. Er trifft nur, wer am Boden steht.
export function ringWeite(t, schlag, phase) {
    if (t < schlag) return null;
    const r = 1.5 + (t - schlag) * 0.8;
    return r <= (phase === 2 ? 12 : 9.5) ? r : null;
}

function stampfen(z, a, t) {
    const d = A.stampfen;
    const dim = z.boss.dimension;
    if (t === d.schlag) {
        a.mitte = { ...z.boss.location };
        a.getroffen = new Set();
        ton(dim, "random.explode", a.mitte, 1.4, 0.5);
        ton(dim, "random.glass", a.mitte, 1, 0.6);
    }
    const r = a.mitte ? ringWeite(t, d.schlag, z.phase) : null;
    if (r === null) return;
    ring(dim, a.mitte, r, Math.round(6 + r * 2));
    for (const w of ziele(z.boss, a.mitte, r + 0.6, SCHONEN)) {
        if (a.getroffen.has(w.id)) continue;
        if (abstand(w.location, a.mitte) < r - 1.2) continue;
        if (!amBoden(w)) continue;
        a.getroffen.add(w.id);
        const weg = richtung(a.mitte, w.location);
        kampf.treffe(z, w, 9, { x: weg.x * 0.8, z: weg.z * 0.8 }, 0.5);
        frieren(w, 60, 1);
    }
}

// Stosszahnfeger: zwei Schwuenge vor ihm, erst nach links, dann nach rechts.
function stosszahnfeger(z, a, t) {
    const d = A.stosszahnfeger;
    const i = d.treffer.indexOf(t);
    if (i < 0) return;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    const r = gueltig(a.ziel) ? richtung(o, a.ziel.location) : blickRichtung(z.boss);
    const seite = i === 0 ? 1 : -1;
    ton(dim, "item.trident.throw", o, 1.2, 0.5);
    const vorn = { x: o.x + r.x * 2.5, y: o.y + 1, z: o.z + r.z * 2.5 };
    funken(dim, "fynn:frostwolke", vorn);
    for (const w of ziele(z.boss, o, 5.2, SCHONEN)) {
        if (winkelZu(o, r, w.location) > 75) continue;
        kampf.treffe(z, w, 9, { x: r.z * seite * 1.3 + r.x * 0.4, z: -r.x * seite * 1.3 + r.z * 0.4 }, 0.45);
    }
}

// Eiszapfenregen: Zeichen ueber jedem Gegner, dann fallen die Zapfen dorthin,
// wo er beim Zeichen stand. Wer weitergeht, dem passiert nichts.
function eiszapfenregen(z, a, t) {
    const d = A.eiszapfenregen;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    if (t === 0) ton(dim, "mob.polarbear.warning", o, 2, 0.5);
    if (t === d.zeichen) {
        a.marken = ziele(z.boss, o, 22, SCHONEN).slice(0, 8).map((w) => ({ ...w.location }));
        const extra = z.phase === 2 ? 5 : 2;
        for (let i = 0; i < extra; i++) {
            const w = Math.random() * Math.PI * 2;
            const r = 3 + Math.random() * 7;
            const p = boden(dim, { x: o.x + Math.cos(w) * r, y: o.y, z: o.z + Math.sin(w) * r });
            if (p) a.marken.push(p);
        }
    }
    if (a.marken && t >= d.zeichen && t < d.fall && (t - d.zeichen) % 4 === 0) {
        for (const m of a.marken) ring(dim, m, 1.2, 6, "fynn:flocke");
    }
    if (a.marken && t === d.fall) {
        for (const m of a.marken) {
            funken(dim, "fynn:eiszapfen", m);
            funken(dim, "fynn:eiszapfen", { x: m.x + 0.6, y: m.y, z: m.z - 0.4 });
            funken(dim, "fynn:eiszapfen", { x: m.x - 0.5, y: m.y, z: m.z + 0.5 });
        }
    }
    if (a.marken && t === d.fall + 6) {
        const getroffen = new Set();
        for (const m of a.marken) {
            ton(dim, "random.glass", m, 0.9, 0.8 + Math.random() * 0.4);
            funken(dim, "fynn:frostwolke", { x: m.x, y: m.y + 0.3, z: m.z });
            for (const w of ziele(z.boss, m, 1.9, SCHONEN)) {
                if (getroffen.has(w.id)) continue;
                getroffen.add(w.id);
                kampf.treffe(z, w, 8, null);
                frieren(w, 80, 1);
            }
        }
    }
}

// Ruesselschleuder: wer direkt vor ihm steht, fliegt hoch in die Luft -
// und faellt tief.
function ruesselschleuder(z, a, t) {
    if (t !== A.ruesselschleuder.wurf) return;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    const r = gueltig(a.ziel) ? richtung(o, a.ziel.location) : blickRichtung(z.boss);
    ton(dim, "mob.polarbear.warning", o, 1.5, 0.7);
    for (const w of ziele(z.boss, o, 4.6, SCHONEN)) {
        if (winkelZu(o, r, w.location) > 60) continue;
        kampf.treffe(z, w, 6, { x: r.x * 0.3, z: r.z * 0.3 }, 1.5);
        funken(dim, "fynn:frostwolke", w.location);
    }
}

// Frostatem: ein Kegel vor ihm, der Kopf schwenkt dabei hin und her.
export function atemRichtung(r, t, d) {
    const s = (t - d.von) / Math.max(1, d.bis - d.von);
    return drehe(r, Math.sin(s * Math.PI * 2) * 28);
}

function frostatem(z, a, t) {
    const d = A.frostatem;
    const dim = z.boss.dimension;
    if (t === d.von) {
        a.richt = gueltig(a.ziel) ? richtung(z.boss.location, a.ziel.location) : blickRichtung(z.boss);
        ton(dim, "mob.enderdragon.growl", z.boss.location, 1, 1.6);
    }
    if (!a.richt || t < d.von || t > d.bis || (t - d.von) % 3 !== 0) return;
    const o = z.boss.location;
    const r = atemRichtung(a.richt, t, d);
    for (const s of [2.5, 4.5, 6.5]) funken(dim, "fynn:frostatem", { x: o.x + r.x * s, y: o.y + 1.6, z: o.z + r.z * s });
    for (const w of ziele(z.boss, o, 9, SCHONEN)) {
        if (abstand(w.location, o) < 1.5 || winkelZu(o, r, w.location) > 25) continue;
        kampf.treffe(z, w, 2, null);
        frieren(w, 50, 2);
    }
}

function eiswoelfe(z, a, t) {
    if (t !== A.eiswoelfe.ruf) return;
    const dim = z.boss.dimension;
    ton(dim, "mob.wolf.growl", z.boss.location, 2, 0.6);
    const neu = kampf.rufe(z, WOLF, z.n > 2 ? 3 : 2, 4, 3.5);
    for (const g of neu) funken(dim, "fynn:frostwolke", { x: g.location.x, y: g.location.y + 0.5, z: g.location.z });
}

// ------------------------------------------------------------ Die Wahl

const ABKLINGEN = {
    ansturm: 260, stampfen: 180, stosszahnfeger: 80, eiszapfenregen: 300, ruesselschleuder: 160,
    frostatem: 280, eiswoelfe: 600,
};

export function moeglich(z, weite, bereit) {
    const liste = [];
    if (weite > 6 && weite < 20 && bereit("ansturm")) liste.push("ansturm");
    if (weite < 8 && bereit("stampfen")) liste.push("stampfen");
    if (weite < 5 && bereit("stosszahnfeger")) liste.push("stosszahnfeger");
    if (weite < 22 && bereit("eiszapfenregen")) liste.push("eiszapfenregen");
    if (weite < 4.5 && bereit("ruesselschleuder")) liste.push("ruesselschleuder");
    if (z.phase === 2 && weite < 9 && bereit("frostatem")) liste.push("frostatem");
    if (z.phase === 2 && bereit("eiswoelfe") && z.gefolge.filter(gueltig).length < 2) liste.push("eiswoelfe");
    return liste;
}

// ------------------------------------------------------------ Der Kampf

export const kampf = bossKampf({
    typ: TYP,
    name2: "Hrimgar · Phase 2",
    angriffe: A, leben: LEBEN, mehrSpieler: MEHR_SPIELER, letzteKraft: LETZTE_KRAFT,
    beute: BEUTE, anteil: ANTEIL,
    pause: { 1: [50, 90], 2: [35, 65] },
    abklingen: ABKLINGEN,
    wechselName: "wechsel", auftrittName: "auftritt", abschiedName: "abschied",
    titelAuftritt: ["§bHrimgar, das Frostmammut", "§7Es erwacht aus dem Eis"],
    titelWechsel: ["§bHrimgar sammelt den Frost", "§7Es ist unverwundbar"],
    titelSieg: "§7Hrimgar sinkt in den Schnee",
    gefolgeWeg: "fynn:frostwolke",
    schritte: { ansturm, stampfen, stosszahnfeger, eiszapfenregen, ruesselschleuder, frostatem, eiswoelfe },
    waehle(z, ziel, weite) {
        const liste = moeglich(z, weite, (n) => kampf.bereit(z, n));
        return liste.length ? liste[Math.floor(Math.random() * liste.length)] : null;
    },
    wechsel(z, a, t) {
        const d = A.wechsel;
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        if (t === 0) ton(dim, "mob.polarbear.warning", ort, 2, 0.4);
        if (t >= d.laden_von && t < d.laden_bis) {
            // Der Frost zieht sich zusammen: ein Wirbel, der immer enger wird.
            if (t % 2 === 0) {
                const s = (t - d.laden_von) / (d.laden_bis - d.laden_von);
                const w = t * 0.4;
                const r = 5 - s * 3.5;
                funken(dim, "fynn:flocke", { x: ort.x + Math.cos(w) * r, y: ort.y + 1 + s * 2.5, z: ort.z + Math.sin(w) * r });
                funken(dim, "fynn:flocke", { x: ort.x - Math.cos(w) * r, y: ort.y + 1 + s * 2.5, z: ort.z - Math.sin(w) * r });
            }
            if (t % 12 === 0) ton(dim, "random.glass", ort, 0.5, 1.6 - ((t - d.laden_von) / (d.laden_bis - d.laden_von)) * 0.8);
        }
    },
    phaseZwei(z) {
        // Der Panzer zerspringt: Splitter fliegen, alle in der Naehe werden
        // weggeworfen, und aus dem Schnee kommen die ersten Woelfe.
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        ton(dim, "random.glass", ort, 2, 0.5);
        ton(dim, "random.explode", ort, 1.2, 0.7);
        ring(dim, ort, 2, 10);
        ring(dim, ort, 4, 16, "fynn:flocke");
        for (let i = 0; i < 10; i++) {
            const w = i * Math.PI / 5;
            funken(dim, "fynn:eiszapfen", { x: ort.x + Math.cos(w) * 3, y: ort.y, z: ort.z + Math.sin(w) * 3 });
        }
        for (const w of ziele(z.boss, ort, 7, SCHONEN)) {
            const weg = richtung(ort, w.location);
            kampf.treffe(z, w, 6, { x: weg.x * 2.4, z: weg.z * 2.4 }, 0.7);
            frieren(w, 60, 1);
        }
        kampf.rufe(z, WOLF, 2, 4, 3.5);
        titel(spielerBei(z.boss, 48), "§bDer Eispanzer zerspringt", "§7Hrimgar wird wild");
    },
    auftritt(z, a, t) {
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        if (t === 0) {
            ring(dim, ort, 2.5, 12);
            ring(dim, ort, 4, 16, "fynn:flocke");
            ton(dim, "random.glass", ort, 1.5, 0.5);
        }
        if (t === 36) ton(dim, "mob.polarbear.warning", ort, 2.5, 0.4);
    },
    abschied(z, a, t) {
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        if (t % 8 === 0) funken(dim, "fynn:flocke", { x: ort.x, y: ort.y + 2, z: ort.z });
        if (t === A.abschied.beute) {
            ring(dim, ort, 2, 12);
            ring(dim, ort, 3.5, 16, "fynn:flocke");
            ton(dim, "random.glass", ort, 1.5, 0.4);
        }
    },
    immer(z) {
        if (z.phase !== 2) return;
        // Die Frostaura: der Boden um es herum ist eiskalt.
        if (system.currentTick % 8 === 0) funken(z.boss.dimension, "fynn:flocke", { x: z.boss.location.x, y: z.boss.location.y + 3, z: z.boss.location.z });
        if (system.currentTick % 20 === 0) {
            for (const s of spielerBei(z.boss, 4.5)) frieren(s, 30, 0);
        }
    },
});

// Ein Eiswolf zerfaellt zu Schnee.
world.afterEvents.entityDie.subscribe((e) => {
    try {
        if (e.deadEntity?.typeId !== WOLF) return;
        const o = e.deadEntity.location;
        funken(e.deadEntity.dimension, "fynn:frostwolke", { x: o.x, y: o.y + 0.5, z: o.z });
    } catch (fehler) { /* schon weg */ }
});

// ------------------------------------------------------------ Gegenstaende

// Frostzahn: Frostschlag - ein Faecher aus Frost vor dir. Wer darin steht,
// nimmt Schaden und wird stark verlangsamt.
export function frostschlag(spieler) {
    if (ruht(spieler, "frostzahn", 100)) return false;
    const dim = spieler.dimension;
    const o = spieler.location;
    const blick = spieler.getViewDirection?.() ?? { x: 0, z: 1 };
    const l = Math.hypot(blick.x, blick.z) || 1;
    const r = { x: blick.x / l, z: blick.z / l };
    for (const s of [1.5, 3, 4.5]) {
        for (const w of [-25, 0, 25]) {
            const q = drehe(r, w);
            funken(dim, "fynn:frostatem", { x: o.x + q.x * s, y: o.y + 1.2, z: o.z + q.z * s });
        }
    }
    ton(dim, "random.glass", o, 1, 1.4);
    let nah = [];
    try { nah = dim.getEntities({ location: o, maxDistance: 5.5, excludeFamilies: ["player", "inanimate"] }); } catch (e) { /* egal */ }
    for (const w of nah) {
        if (!w.getComponent?.("minecraft:health") || w.getComponent?.("minecraft:tameable")?.isTamed) continue;
        if (winkelZu(o, r, w.location) > 35) continue;
        try { w.applyDamage(6, { cause: "entityAttack", damagingEntity: spieler }); } catch (e) { /* egal */ }
        frieren(w, 100, 3);
    }
    return true;
}

// Herz des Winters: ein Schild aus Frost - Extra-Herzen und Widerstand fuer
// eine Minute, und der Frost, der dich lahmt, faellt ab.
export function herzDesWinters(spieler) {
    if (ruht(spieler, "herz_des_winters", 40)) return false;
    try {
        spieler.addEffect("absorption", 1200, { amplifier: 2 });
        spieler.addEffect("resistance", 1200, { amplifier: 0 });
        spieler.removeEffect("slowness");
    } catch (e) { /* egal */ }
    const o = spieler.location;
    ring(spieler.dimension, o, 1, 8, "fynn:flocke");
    ton(spieler.dimension, "random.glass", o, 1, 1.8);
    if (!istKreativ(spieler)) verbrauche(spieler);
    return true;
}

// Frostruf: das Horn aus dem Eis. Hrimgar kommt.
export function frostruf(spieler) {
    const dim = spieler.dimension;
    let schonDa = [];
    try { schonDa = dim.getEntities({ type: TYP, location: spieler.location, maxDistance: 96 }); } catch (e) { /* egal */ }
    if (schonDa.length) {
        try { spieler.onScreenDisplay?.setActionBar("§7Hrimgar ist schon hier."); } catch (e) { /* egal */ }
        return false;
    }
    if (ruht(spieler, "frostruf", 100)) return false;
    const blick = spieler.getViewDirection?.() ?? { x: 0, z: 1 };
    const l = Math.hypot(blick.x, blick.z) || 1;
    let ort = { x: spieler.location.x + blick.x / l * 9, y: spieler.location.y, z: spieler.location.z + blick.z / l * 9 };
    ort = boden(dim, ort, 4) ?? spieler.location;
    if (!istKreativ(spieler)) verbrauche(spieler);
    ton(dim, "mob.polarbear.warning", ort, 2, 0.4);
    for (let i = 0; i < 6; i++) system.runTimeout(() => ring(dim, ort, 3 - i * 0.4, 10, "fynn:flocke"), i * 6);
    system.runTimeout(() => {
        try { dim.spawnEntity(TYP, ort); } catch (e) { console.warn(`Hrimgar, Frostruf: ${e}`); }
    }, 40);
    return true;
}

world.afterEvents.itemUse.subscribe((e) => {
    try {
        const typ = e.itemStack?.typeId;
        if (typ === "fynn:frostzahn") frostschlag(e.source);
        else if (typ === "fynn:herz_des_winters") herzDesWinters(e.source);
        else if (typ === "fynn:frostruf") frostruf(e.source);
    } catch (fehler) {
        console.warn(`Hrimgar, Gegenstand: ${fehler}`);
    }
});
