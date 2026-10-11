// Aschvaru, der Seelendrache - der vierte Boss. Der Kampf.
//
// Fynn wollte keinen Boss, der Diener ruft ("wenn Mobs beschwoert werden,
// ist eigentlich immer nicht so geil"). Aschvaru kaempft mit Magie: ein
// Seelenstrahl, der langsam ueber das Feld streicht (wer seitlich laeuft
// oder hinter einer Wand steht, entkommt), Seelenkreise unter den Fuessen,
// aus denen nach einer Warnung Lichtsaeulen brechen, ein Fluegelschlag nach
// vorn und ein Schweifhieb fuer alle, die ihn von der Seite angehen. In
// Phase zwei erwacht der Seelenring: Er zieht alle zu sich und stoesst sie
// fort, steigt auf und laesst Seelen regnen - und er spaltet zwei
// Spiegelbilder ab. Die sind keine Diener: Sie schweben, wo sie erscheinen,
// werfen Seelenkugeln und zerspringen beim ersten Treffer.
//
// Takt, Phasen, Schutz, Staerke und Beute kommen aus boss_kern.js; die
// Zeiten und der Ort des Mauls aus seelendrache_daten.js, geschrieben
// zusammen mit den Animationen.

import { world, system } from "@minecraft/server";
import {
    bossKampf, abstand, richtung, blickRichtung, funken, ton, spielerBei, ziele, gueltig,
    istKreativ, frei, boden, verbrauche, ruht, titel, leben, gierZu,
} from "./boss_kern.js";
import { ANGRIFFE, LEBEN, MEHR_SPIELER, LETZTE_KRAFT, BEUTE, ANTEIL, MAUL, MAUL_FLUG } from "./seelendrache_daten.js";

export const TYP = "fynn:seelendrache";
export const ABBILD = "fynn:seelenabbild";
const SCHONEN = ["seelendrache"];
const A = ANGRIFFE;

// ------------------------------------------------------------ Hilfen

export function drehe(r, grad) {
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

function istSpieler(w) {
    return w.typeId === "minecraft:player";
}

function zielRichtung(z, a) {
    return gueltig(a.ziel) ? richtung(z.boss.location, a.ziel.location) : blickRichtung(z.boss);
}

function maulOrt(o, r, maul) {
    return { x: o.x + r.x * maul.vor, y: o.y + maul.hoch, z: o.z + r.z * maul.vor };
}

function ring(dim, mitte, r, anzahl, art = "fynn:seelenfunke", hoehe = 0.3) {
    for (let i = 0; i < anzahl; i++) {
        const w = (i / anzahl) * Math.PI * 2;
        funken(dim, art, { x: mitte.x + Math.cos(w) * r, y: mitte.y + hoehe, z: mitte.z + Math.sin(w) * r });
    }
}

function heile(boss, n) {
    const l = leben(boss);
    if (l) try { l.h.setCurrentValue(Math.min(l.max, l.jetzt + n)); } catch (e) { /* egal */ }
}

function fest(wesen) {
    try {
        const b = wesen.dimension.getBlock({ x: Math.floor(wesen.x), y: Math.floor(wesen.y), z: Math.floor(wesen.z) });
        return !!b && !b.isAir && !b.isLiquid;
    } catch (e) {
        return false;
    }
}

// ------------------------------------------------------------ Seelenkugeln

// Kugeln fliegen als Liste, die jeden Tick ein Stueck weiterzieht: Sie sind
// kein Wesen, nur Licht - darum gibt es keinen Diener, den man jagen muss.
// gezielt: folgt dem Ziel ein wenig und zerplatzt bei der ersten Beruehrung.
// fallend: fliegt auf einen festen Ort zu und zerplatzt dort im Umkreis.
const kugeln = [];

export function wirfKugel(boss, von, art) {
    const k = { boss, dim: boss.dimension, ort: { ...von }, t: 0, ...art };
    if (!k.richt) {
        const ziel = k.nach ?? (gueltig(k.folgt) ? { ...k.folgt.location, y: k.folgt.location.y + 1 } : null);
        const dx = (ziel?.x ?? von.x) - von.x;
        const dy = (ziel?.y ?? von.y) - von.y;
        const dz = (ziel?.z ?? von.z + 1) - von.z;
        const l = Math.hypot(dx, dy, dz) || 1;
        k.richt = { x: dx / l, y: dy / l, z: dz / l };
    }
    kugeln.push(k);
    return k;
}

function platzt(k, ort) {
    funken(k.dim, "fynn:seelenfunke", ort);
    ton(k.dim, "random.glass", ort, 0.5, 1.6 + Math.random() * 0.3);
    const z = gueltig(k.boss) ? kampf.kaempfe.get(k.boss.id) : null;
    const getroffen = new Set();
    for (const w of gueltig(k.boss) ? ziele(k.boss, ort, k.weite ?? 1.4, SCHONEN) : []) {
        if (getroffen.has(w.id)) continue;
        getroffen.add(w.id);
        if (Math.abs((w.location.y + 0.9) - ort.y) > 2.2) continue;
        if (z) kampf.treffe(z, w, k.schaden, null);
        else try { w.applyDamage(k.schaden); } catch (e) { /* egal */ }
        try { w.addEffect("slowness", 30, { amplifier: 1 }); } catch (e) { /* egal */ }
    }
}

export function kugelTakt() {
    for (let i = kugeln.length - 1; i >= 0; i--) {
        const k = kugeln[i];
        k.t += 1;
        let weg = false;
        try {
            if (k.folgt && gueltig(k.folgt)) {
                // Sie lenkt ein wenig nach: Wer stehen bleibt, wird getroffen, wer
                // zur Seite laeuft, nicht.
                const p = k.folgt.location;
                const dx = p.x - k.ort.x, dy = p.y + 1 - k.ort.y, dz = p.z - k.ort.z;
                const l = Math.hypot(dx, dy, dz) || 1;
                const s = 0.08;
                const nx = k.richt.x * (1 - s) + dx / l * s, ny = k.richt.y * (1 - s) + dy / l * s, nz = k.richt.z * (1 - s) + dz / l * s;
                const nl = Math.hypot(nx, ny, nz) || 1;
                k.richt = { x: nx / nl, y: ny / nl, z: nz / nl };
            }
            k.ort = { x: k.ort.x + k.richt.x * k.tempo, y: k.ort.y + k.richt.y * k.tempo, z: k.ort.z + k.richt.z * k.tempo };
            funken(k.dim, "fynn:seelenkugel", k.ort);
            if (k.nach) {
                if (Math.hypot(k.nach.x - k.ort.x, k.nach.y - k.ort.y, k.nach.z - k.ort.z) <= k.tempo) {
                    platzt(k, k.nach);
                    weg = true;
                }
            } else if (gueltig(k.boss) && ziele(k.boss, k.ort, 1.2, SCHONEN)
                .some((w) => Math.abs(w.location.y + 0.9 - k.ort.y) < 1.3)) {
                platzt(k, k.ort);
                weg = true;
            } else if (fest({ dimension: k.dim, ...k.ort })) {
                platzt(k, k.ort);
                weg = true;
            }
        } catch (e) {
            weg = true;
        }
        if (weg || k.t > (k.dauer ?? 80)) kugeln.splice(i, 1);
    }
}

system.runInterval(() => {
    try { kugelTakt(); } catch (e) { console.warn(`Seelendrache, Kugeln: ${e}`); }
}, 1);

// ------------------------------------------------------------ Angriffe

// Seelenstrahl: Der Strahl beginnt im Maul, faellt bis neun Bloecke weit
// auf Brusthoehe ab und streicht von rechts nach links. Eine Wand haelt
// ihn auf. Wer drin steht, verliert Leben - in Phase zwei bekommt er
// einen Teil davon.
export function strahlWinkel(s) {
    return 35 - 70 * Math.max(0, Math.min(1, s));
}

export function strahlHoehe(start, ziel, weite) {
    return start + (ziel - start) * Math.min(1, weite / 9);
}

const STRAHL_WEITE = 22;

function seelenstrahl(z, a, t) {
    const d = A.seelenstrahl;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    if (t === 0) {
        a.richt = zielRichtung(z, a);
        ton(dim, "mob.evocation_illager.prepare_attack", o, 2, 0.6);
    }
    if (t >= d.laden && t < d.von && t % 3 === 0) {
        // Licht sammelt sich im Maul.
        const m = maulOrt(o, a.richt, { vor: MAUL.vor * 0.7, hoch: MAUL.hoch + 0.8 });
        funken(dim, "fynn:seelenhauch", m);
        if (t % 9 === 0) ton(dim, "beacon.ambient", m, 1.2, 1.6);
    }
    if (t === d.von) ton(dim, "mob.warden.sonic_boom", o, 1.4, 1.4);
    if (t < d.von || t > d.bis) return;
    const r = drehe(a.richt, strahlWinkel((t - d.von) / (d.bis - d.von)));
    const start = maulOrt(o, r, MAUL);
    const brust = o.y + 1.0;
    // Wie weit er reicht: bis zur ersten Wand.
    let laenge = STRAHL_WEITE;
    for (let s = 1; s < STRAHL_WEITE; s += 0.7) {
        const p = { x: start.x + r.x * s, y: strahlHoehe(start.y, brust, s), z: start.z + r.z * s };
        if (fest({ dimension: dim, ...p })) { laenge = s; break; }
        if (t % 2 === 0) funken(dim, "fynn:seelenstrahl", p);
    }
    if (t % 2 === 0) funken(dim, "fynn:seelenfunke", { x: start.x + r.x * laenge, y: strahlHoehe(start.y, brust, laenge), z: start.z + r.z * laenge });
    if (t % 10 === 0) ton(dim, "beacon.ambient", start, 1.5, 1.8);
    if ((t - d.von) % 4 !== 0) return;
    for (const w of ziele(z.boss, start, laenge + 1.5, SCHONEN)) {
        const rx = w.location.x - start.x, rz = w.location.z - start.z;
        const entlang = rx * r.x + rz * r.z;
        if (entlang < 0.3 || entlang > laenge) continue;
        if (Math.abs(rx * r.z - rz * r.x) > 1.4) continue;
        if (Math.abs(w.location.y + 1 - strahlHoehe(start.y, brust, entlang)) > 2.2) continue;
        kampf.treffe(z, w, z.phase === 2 ? 4 : 3, null);
        funken(dim, "fynn:seelenfunke", { x: w.location.x, y: w.location.y + 1, z: w.location.z });
        if (z.phase === 2) heile(z.boss, 2);
    }
}

// Seelenkreise: unter jedem Gegner ein Zauberkreis - wer stehen bleibt,
// den trifft die Saeule, die daraus bricht, und wirft ihn hoch. Zweimal
// hintereinander; in Phase zwei kommen Kreise dazu, wo niemand steht, und
// sie sind groesser.
export function marken(z, o) {
    const liste = ziele(z.boss, o, 24, SCHONEN).slice(0, 8).map((w) => ({ ...w.location }));
    const extra = z.phase === 2 ? 4 : 1;
    for (let i = 0; i < extra; i++) {
        const w = Math.random() * Math.PI * 2;
        const r = 4 + Math.random() * 8;
        const p = boden(z.boss.dimension, { x: o.x + Math.cos(w) * r, y: o.y, z: o.z + Math.sin(w) * r });
        if (p) liste.push(p);
    }
    return liste;
}

function seelenkreise(z, a, t) {
    const d = A.seelenkreise;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    if (t === 0) ton(dim, "mob.evocation_illager.prepare_summon", o, 2, 0.7);
    const weite = z.phase === 2 ? 2.2 : 1.8;
    for (const [zeichen, ausbruch] of [[d.zeichen, d.ausbruch], [d.zeichen2, d.ausbruch2]]) {
        if (t === zeichen) {
            a.marken = marken(z, o);
            ton(dim, "mob.evocation_illager.cast_spell", o, 2, 0.8);
        }
        if (a.marken && t >= zeichen && t < ausbruch && (t - zeichen) % 6 === 0) {
            for (const m of a.marken) {
                funken(dim, "fynn:seelenkreis", m);
                if (t - zeichen > 8) funken(dim, "fynn:seelenhauch", m);
            }
        }
        if (a.marken && t === ausbruch) {
            const getroffen = new Set();
            for (const m of a.marken) {
                funken(dim, "fynn:seelensaeule", m);
                funken(dim, "fynn:seelenfunke", { x: m.x, y: m.y + 0.5, z: m.z });
                ton(dim, "mob.evocation_illager.cast_spell", m, 0.8, 1.4);
                for (const w of ziele(z.boss, m, weite, SCHONEN)) {
                    if (getroffen.has(w.id)) continue;
                    getroffen.add(w.id);
                    kampf.treffe(z, w, 9, { x: 0, z: 0 }, 0.9);
                }
            }
            ton(dim, "random.explode", o, 0.6, 1.4);
            a.marken = null;
        }
    }
}

// Fluegelschlag: zweimal eine Druckwelle nach vorn - weit fort.
function fluegelschlag(z, a, t) {
    const i = A.fluegelschlag.schlaege.indexOf(t);
    if (i < 0) return;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    const r = zielRichtung(z, a);
    ton(dim, "mob.enderdragon.flap", o, 2, 0.6);
    for (const s of [3, 5, 7]) {
        for (const w of [-30, 0, 30]) {
            const q = drehe(r, w);
            funken(dim, "fynn:seelenhauch", { x: o.x + q.x * s, y: o.y + 1, z: o.z + q.z * s });
        }
    }
    for (const w of ziele(z.boss, o, 9.5, SCHONEN)) {
        if (winkelZu(o, r, w.location) > 70) continue;
        kampf.treffe(z, w, 6, { x: r.x * 2.4, z: r.z * 2.4 }, 0.5);
    }
}

// Schweifhieb: Der Schwanz fegt herum - es trifft, wer neben oder hinter
// ihm steht. Wer vor ihm steht, sieht ihn nur ausholen.
export function imSchweif(o, r, ort) {
    return abstand(o, ort) <= 8 && winkelZu(o, r, ort) > 50;
}

function schweifhieb(z, a, t) {
    if (t !== A.schweifhieb.treffer) return;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    const r = blickRichtung(z.boss);
    ton(dim, "mob.enderdragon.flap", o, 1.5, 1.2);
    ton(dim, "item.trident.throw", o, 1.2, 0.5);
    ring(dim, o, 6, 12, "fynn:seelenhauch", 0.6);
    for (const w of ziele(z.boss, o, 8.5, SCHONEN)) {
        if (!imSchweif(o, r, w.location)) continue;
        // Zur Seite weg, in Richtung des Schwungs.
        const weg = richtung(o, w.location);
        kampf.treffe(z, w, 9, { x: weg.x * 1.4 - weg.z * 0.8, z: weg.z * 1.4 + weg.x * 0.8 }, 0.45);
    }
}

// Seelensog (Phase zwei): Er zieht alle zu sich - wer sich nicht wehrt
// (weglaeuft), steht beim Schlag dicht vor ihm.
function seelensog(z, a, t) {
    const d = A.seelensog;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    if (t === 0) ton(dim, "mob.enderdragon.growl", o, 2, 0.6);
    if (t >= d.sog_von && t < d.sog_bis) {
        if (t % 4 === 0) funken(dim, "fynn:seelensog", o);
        if (t % 8 === 0) ton(dim, "mob.warden.sonic_charge", o, 1.5, 0.8);
        if (t % 2 === 0) {
            for (const w of ziele(z.boss, o, 16, SCHONEN)) {
                if (abstand(w.location, o) < 2.5) continue;
                const weg = richtung(w.location, o);
                try { w.applyKnockback({ x: weg.x * 0.34, z: weg.z * 0.34 }, 0.02); } catch (e) { /* egal */ }
            }
        }
    }
    if (t === d.knall) {
        ton(dim, "random.explode", o, 1.5, 0.7);
        ton(dim, "mob.enderdragon.flap", o, 2, 0.5);
        ring(dim, o, 2.5, 12);
        ring(dim, o, 5, 18, "fynn:seelenhauch");
        for (const w of ziele(z.boss, o, 7, SCHONEN)) {
            const weg = richtung(o, w.location);
            kampf.treffe(z, w, 12, { x: weg.x * 2.6, z: weg.z * 2.6 }, 0.6);
        }
    }
}

// Seelenspiegel (Phase zwei): zwei Spiegelbilder links und rechts. Sie
// schweben, werfen Seelenkugeln und zerspringen beim ersten Treffer.
const abbilder = new Map();

export function abbildZahl(z) {
    return z.gefolge.filter((w) => gueltig(w) && w.typeId === ABBILD).length;
}

export function spalten(z) {
    const dim = z.boss.dimension;
    const o = z.boss.location;
    const r = blickRichtung(z.boss);
    const neu = [];
    for (const seite of [1, -1]) {
        if (abbildZahl(z) >= 2) break;
        let ort = { x: o.x - r.z * seite * 7 + r.x * 2, y: o.y + 2.5, z: o.z + r.x * seite * 7 + r.z * 2 };
        if (!frei(dim, ort, 3)) ort = { x: o.x + r.x * 2, y: o.y + 6, z: o.z + r.z * 2 };
        try {
            const g = dim.spawnEntity(ABBILD, ort);
            g.addTag("boss_gefolge");
            z.gefolge.push(g);
            abbilder.set(g.id, { naechster: system.currentTick + 30 + neu.length * 20 });
            neu.push(g);
            funken(dim, "fynn:seelenfunke", ort);
            ring(dim, ort, 1.5, 8, "fynn:seelenhauch", 0);
        } catch (e) {
            console.warn(`Seelendrache, Spiegelbild: ${e}`);
        }
    }
    ton(dim, "mob.evocation_illager.cast_spell", o, 2, 1.2);
    return neu;
}

function seelenspiegel(z, a, t) {
    const d = A.seelenspiegel;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    if (t === 0) ton(dim, "mob.evocation_illager.prepare_summon", o, 2, 1.0);
    if (t < d.spaltung && t % 3 === 0) funken(dim, "fynn:seelenhauch", { x: o.x, y: o.y + 2, z: o.z });
    if (t === d.spaltung) spalten(z);
}

// Ein Spiegelbild wendet sich dem naechsten Spieler zu und wirft alle zwei
// bis drei Sekunden eine Seelenkugel.
function abbildTakt(z) {
    for (const g of z.gefolge) {
        if (!gueltig(g) || g.typeId !== ABBILD) continue;
        const m = abbilder.get(g.id) ?? { naechster: system.currentTick + 40 };
        abbilder.set(g.id, m);
        let ziel = null;
        for (const s of spielerBei(g, 28)) {
            if (!ziel || abstand(s.location, g.location) < abstand(ziel.location, g.location)) ziel = s;
        }
        if (!ziel) continue;
        try { g.setRotation({ x: 0, y: gierZu(g.location, ziel.location) }); } catch (e) { /* egal */ }
        if (system.currentTick % 12 === 0) funken(g.dimension, "fynn:seelenhauch", g.location);
        if (system.currentTick === m.naechster - 6) {
            try { g.playAnimation("animation.fynn.seelenabbild.wurf"); } catch (e) { /* egal */ }
        }
        if (system.currentTick >= m.naechster) {
            const r = richtung(g.location, ziel.location);
            wirfKugel(z.boss, { x: g.location.x + r.x * 3.5, y: g.location.y + 1.6, z: g.location.z + r.z * 3.5 },
                { folgt: ziel, tempo: 0.45, schaden: 6, dauer: 70 });
            ton(g.dimension, "mob.ghast.fireball", g.location, 0.8, 1.6);
            m.naechster = system.currentTick + 46 + Math.floor(Math.random() * 20);
        }
    }
}

// Seelensturm (Phase zwei): Er steigt auf, laesst Seelen auf die Gegner
// regnen (wo ein Kreis aufleuchtet, schlaegt gleich eine ein) und stuerzt
// herab: Eine Welle laeuft ueber den Boden - wer springt, entgeht ihr.
export function steigHoehe(dim, o, max = 7) {
    let h = 0;
    for (let i = 1; i <= max; i++) {
        if (!frei(dim, { x: o.x, y: o.y + i, z: o.z }, 4)) break;
        h = i;
    }
    return h;
}

export function wellenWeite(t, aufprall) {
    if (t < aufprall) return null;
    const r = 1.5 + (t - aufprall) * 0.8;
    return r <= 11 ? r : null;
}

function seelensturm(z, a, t) {
    const d = A.seelensturm;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    if (t === 0) {
        a.boden = { ...o };
        a.hoehe = steigHoehe(dim, o);
        a.drehung = z.boss.getRotation?.().y ?? 0;
    }
    let y = null;
    if (t >= d.abheben && t <= d.oben) {
        const s = (t - d.abheben) / (d.oben - d.abheben);
        y = a.boden.y + a.hoehe * (1 - (1 - s) * (1 - s));
    } else if (t > d.oben && t < d.sturz) {
        y = a.boden.y + a.hoehe + Math.sin(t * 0.3) * 0.2;
    } else if (t >= d.sturz && t <= d.aufprall) {
        const s = (t - d.sturz) / (d.aufprall - d.sturz);
        y = a.boden.y + a.hoehe * (1 - s * s);
    }
    if (y !== null && a.hoehe > 0) {
        try {
            z.boss.teleport({ x: a.boden.x, y, z: a.boden.z }, { keepVelocity: false, rotation: { x: 0, y: a.drehung } });
        } catch (e) { /* bleibt, wo er ist */ }
    }
    if (t === d.abheben) {
        ton(dim, "mob.enderdragon.flap", o, 2, 0.5);
        ring(dim, a.boden, 3, 12, "fynn:seelenhauch", 0.2);
    }
    if (t > d.abheben && t < d.sturz && t % 6 === 0) ton(dim, "mob.enderdragon.flap", o, 1.2, 0.7);
    if (d.regen.includes(t)) {
        // Jede Seele faellt dorthin, wo der Gegner beim Wurf steht.
        const r = blickRichtung(z.boss);
        const maul = maulOrt(o, r, MAUL_FLUG);
        const ziele_ = ziele(z.boss, a.boden, 24, SCHONEN).slice(0, 6).map((w) => boden(dim, w.location) ?? { ...w.location });
        if (z.n > 1 || ziele_.length < 2) {
            const w = Math.random() * Math.PI * 2;
            const p = boden(dim, { x: a.boden.x + Math.cos(w) * 7, y: a.boden.y, z: a.boden.z + Math.sin(w) * 7 });
            if (p) ziele_.push(p);
        }
        a.warnen = (a.warnen ?? []).concat(ziele_.map((p) => ({ p, bis: t + 16 })));
        for (const p of ziele_) wirfKugel(z.boss, maul, { nach: { x: p.x, y: p.y + 0.3, z: p.z }, tempo: 0.9, schaden: 7, weite: 1.8, dauer: 40 });
        ton(dim, "mob.ghast.fireball", maul, 1.2, 0.8);
    }
    if (a.warnen && t % 5 === 0) {
        a.warnen = a.warnen.filter((w) => w.bis > t);
        for (const w of a.warnen) funken(dim, "fynn:seelenkreis", w.p);
    }
    if (t === d.aufprall) {
        a.welle = { ...a.boden };
        a.getroffen = new Set();
        ton(dim, "random.explode", a.boden, 1.6, 0.6);
        ring(dim, a.boden, 2, 12);
    }
    const r = a.welle ? wellenWeite(t, d.aufprall) : null;
    if (r === null) return;
    ring(dim, a.welle, r, Math.round(6 + r * 2), "fynn:seelenstrahl", 0.2);
    for (const w of ziele(z.boss, a.welle, r + 0.6, SCHONEN)) {
        if (a.getroffen.has(w.id)) continue;
        if (abstand(w.location, a.welle) < r - 1.2) continue;
        if (!amBoden(w)) continue;
        a.getroffen.add(w.id);
        const weg = richtung(a.welle, w.location);
        kampf.treffe(z, w, 9, { x: weg.x * 0.9, z: weg.z * 0.9 }, 0.5);
    }
}

// Seelengericht (Phase zwei, der ultimative Angriff). Fynn: "Er laedt so
// seine Kraft maessig auf. Und dabei bildet sich so ein grosser Magiekreis
// um ihn herum ... der ist auf jeden Fall gefaehrlich." Vier Sekunden
// waechst ein Kreis von vierzehn Bloecken um ihn; darin leuchten warme
// Schutzlichter. Dann bricht im ganzen Kreis die Seele aus dem Boden - wer
// noch drin steht und nicht in einem Schutzlicht, den trifft es schwer.
export const GERICHT_WEITE = 14;
const SCHUTZ_WEITE = 1.9;

export function schutzOrte(mitte, anzahl, zufall = Math.random) {
    const orte = [];
    const versatz = zufall() * Math.PI * 2;
    for (let i = 0; i < anzahl; i++) {
        const w = versatz + (i / anzahl) * Math.PI * 2;
        const r = 6 + zufall() * 4;
        orte.push({ x: mitte.x + Math.cos(w) * r, y: mitte.y, z: mitte.z + Math.sin(w) * r });
    }
    return orte;
}

// Wen das Gericht trifft: wer im Kreis steht und in keinem Schutzlicht.
export function imGericht(mitte, schutz, ort) {
    if (abstand(mitte, ort) > GERICHT_WEITE + 0.5) return false;
    return !schutz.some((s) => abstand(s, ort) <= SCHUTZ_WEITE);
}

function seelengericht(z, a, t) {
    const d = A.seelengericht;
    const dim = z.boss.dimension;
    const o = z.boss.location;
    if (t === 0) {
        a.mitte = { ...o };
        const anzahl = z.n > 2 ? 4 : 3;
        a.schutz = schutzOrte(a.mitte, anzahl).map((p) => boden(dim, p, 2) ?? p);
        z.merk.gericht = true;
        ton(dim, "mob.enderdragon.growl", o, 3, 0.4);
        titel(spielerBei(z.boss, 48), "§bAschvaru ruft das Seelengericht", "§7Raus aus dem Kreis - oder ins goldene Licht!", 70);
    }
    if (!a.mitte) return;
    if (t >= d.laden_von && t < d.entladung) {
        const s = Math.min(1, (t - d.laden_von) / (d.laden_bis - d.laden_von));
        // Der grosse Kreis: zuerst alle acht Ticks, zum Ende hin dichter -
        // er flackert immer schneller.
        const takt = s < 0.7 ? 8 : (s < 0.9 ? 5 : 3);
        if ((t - d.laden_von) % takt === 0) funken(dim, "fynn:seelengericht", a.mitte);
        if (t % 6 === 0) {
            for (const p of a.schutz) {
                funken(dim, "fynn:seelenschutz", p);
                funken(dim, "fynn:schutzlicht", p);
            }
        }
        // Seelen steigen ueberall im Kreis auf - immer mehr.
        if (t % 2 === 0) {
            for (let i = 0; i < 1 + Math.floor(s * 4); i++) {
                const w = Math.random() * Math.PI * 2, r = Math.sqrt(Math.random()) * GERICHT_WEITE;
                funken(dim, "fynn:seelenhauch", { x: a.mitte.x + Math.cos(w) * r, y: a.mitte.y + 0.3, z: a.mitte.z + Math.sin(w) * r });
            }
        }
        if (t % 10 === 0) ton(dim, "beacon.ambient", o, 2, 0.5 + s * 1.3);
        if (t === d.laden_bis) ton(dim, "mob.warden.sonic_charge", o, 3, 0.6);
    }
    if (t === d.entladung) {
        ton(dim, "random.explode", o, 3, 0.5);
        ton(dim, "mob.warden.sonic_boom", o, 3, 0.7);
        // Saeulen ueberall im Kreis, Ring um Ring - nur in den Schutzlichtern nicht.
        for (const [r, n] of [[0, 1], [3.5, 6], [7, 11], [10.5, 16], [13.5, 20]]) {
            for (let i = 0; i < n; i++) {
                const w = (i / n) * Math.PI * 2 + r;
                const p = { x: a.mitte.x + Math.cos(w) * r, y: a.mitte.y, z: a.mitte.z + Math.sin(w) * r };
                if (a.schutz.some((s) => abstand(s, p) <= SCHUTZ_WEITE)) continue;
                funken(dim, "fynn:seelensaeule", p);
            }
        }
        ring(dim, a.mitte, GERICHT_WEITE, 40, "fynn:seelenfunke", 0.4);
        for (const p of a.schutz) ring(dim, p, 1.2, 8, "fynn:seelenhauch", 0.2);
        for (const w of ziele(z.boss, a.mitte, GERICHT_WEITE + 1, SCHONEN)) {
            if (!imGericht(a.mitte, a.schutz, w.location)) continue;
            const weg = richtung(a.mitte, w.location);
            kampf.treffe(z, w, 20, { x: weg.x * 1.2, z: weg.z * 1.2 }, 0.8);
            try {
                w.addEffect("darkness", 120, { amplifier: 0 });
                w.addEffect("weakness", 200, { amplifier: 1 });
            } catch (e) { /* egal */ }
        }
    }
}

// ------------------------------------------------------------ Die Wahl

const ABKLINGEN = {
    seelenstrahl: 240, seelenkreise: 260, fluegelschlag: 140, schweifhieb: 90,
    seelensog: 400, seelenspiegel: 700, seelensturm: 520, seelengericht: 1000,
};

export function moeglich(z, weite, bereit) {
    const liste = [];
    if (weite > 4 && weite < 20 && bereit("seelenstrahl")) liste.push("seelenstrahl");
    if (weite < 24 && bereit("seelenkreise")) liste.push("seelenkreise");
    if (weite < 8 && bereit("fluegelschlag")) liste.push("fluegelschlag");
    if (weite < 8 && bereit("schweifhieb")) liste.push("schweifhieb");
    if (z.phase === 2 && weite < 14 && bereit("seelensog")) liste.push("seelensog");
    if (z.phase === 2 && bereit("seelenspiegel") && abbildZahl(z) === 0) liste.push("seelenspiegel");
    if (z.phase === 2 && weite < 22 && bereit("seelensturm")) liste.push("seelensturm");
    if (z.phase === 2 && weite < 18 && bereit("seelengericht")) liste.push("seelengericht");
    return liste;
}

export function unterHaelfte(z) {
    const l = leben(z.boss);
    return !!l && l.jetzt <= l.max / 2;
}

// Steht jemand neben oder hinter ihm, waehrend er sich dem Ziel zuwendet?
// Dann zuerst der Schweif.
function flankiert(z, ziel) {
    const r = richtung(z.boss.location, ziel.location);
    return spielerBei(z.boss, 8).some((s) => s.id !== ziel.id && imSchweif(z.boss.location, r, s.location));
}

// ------------------------------------------------------------ Der Kampf

export const kampf = bossKampf({
    typ: TYP,
    name1: "Aschvaru", name2: "Aschvaru · Phase 2",
    angriffe: A, leben: LEBEN, mehrSpieler: MEHR_SPIELER, letzteKraft: LETZTE_KRAFT,
    beute: BEUTE, anteil: ANTEIL,
    pause: { 1: [45, 85], 2: [30, 60] },
    abklingen: ABKLINGEN,
    beweglich: ["seelensturm"],
    wechselName: "wechsel", auftrittName: "auftritt", abschiedName: "abschied",
    titelAuftritt: ["§bAschvaru, der Seelendrache", "§7Die Seelen der Gefallenen erwachen"],
    titelWechsel: ["§bAschvaru sammelt die Seelen", "§7Er ist unverwundbar"],
    titelSieg: "§7Aschvarus Seele steigt zum Himmel",
    gefolgeWeg: "fynn:seelenfunke",
    schritte: { seelenstrahl, seelenkreise, fluegelschlag, schweifhieb, seelensog, seelenspiegel, seelensturm, seelengericht },
    waehle(z, ziel, weite) {
        const liste = moeglich(z, weite, (n) => kampf.bereit(z, n));
        // Faellt er in Phase zwei unter die Haelfte, ruft er das Gericht -
        // sobald er kann, das erste Mal ohne Warten.
        if (liste.includes("seelengericht") && !z.merk.gericht && unterHaelfte(z)) return "seelengericht";
        if (liste.includes("schweifhieb") && flankiert(z, ziel)) return "schweifhieb";
        const ohne = liste.filter((n) => n !== "schweifhieb");
        const wahl = ohne.length ? ohne : liste;
        return wahl.length ? wahl[Math.floor(Math.random() * wahl.length)] : null;
    },
    wechsel(z, a, t) {
        const d = A.wechsel;
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        if (t === 0) ton(dim, "mob.enderdragon.growl", ort, 2, 0.5);
        if (t >= d.laden_von && t < d.laden_bis) {
            // Seelen stroemen von ueberall in seinen Kern - ein Wirbel, der sich
            // immer enger um ihn legt.
            const s = (t - d.laden_von) / (d.laden_bis - d.laden_von);
            if (t % 2 === 0) {
                const w = t * 0.35;
                const r = 9 - s * 7;
                for (const k of [0, Math.PI]) {
                    funken(dim, "fynn:seelenhauch", { x: ort.x + Math.cos(w + k) * r, y: ort.y + 0.5 + s * 2, z: ort.z + Math.sin(w + k) * r });
                }
            }
            if (t % 10 === 0) ton(dim, "beacon.ambient", ort, 1.2, 0.6 + s);
        }
    },
    phaseZwei(z) {
        // Der Ring erwacht: ein Lichtschlag, der alle in der Naehe fortwirft -
        // und links und rechts stehen schon seine ersten Spiegelbilder.
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        ton(dim, "beacon.activate", ort, 2, 0.8);
        ton(dim, "random.explode", ort, 1.2, 0.9);
        ring(dim, ort, 2, 12);
        ring(dim, ort, 4.5, 18, "fynn:seelenhauch");
        for (const m of [0, 1, 2, 3, 4, 5]) {
            const w = m * Math.PI / 3;
            funken(dim, "fynn:seelensaeule", { x: ort.x + Math.cos(w) * 4, y: ort.y, z: ort.z + Math.sin(w) * 4 });
        }
        for (const w of ziele(z.boss, ort, 8, SCHONEN)) {
            const weg = richtung(ort, w.location);
            kampf.treffe(z, w, 6, { x: weg.x * 2.4, z: weg.z * 2.4 }, 0.7);
        }
        spalten(z);
        titel(spielerBei(z.boss, 48), "§bDer Seelenring erwacht", "§7Aschvaru spaltet seine Seele");
    },
    auftritt(z, a, t) {
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        if (t === 0) {
            ton(dim, "beacon.activate", ort, 2, 0.6);
            ring(dim, ort, 4, 16, "fynn:seelenhauch", 0.1);
        }
        if (t < 30 && t % 6 === 0) {
            for (const m of [0, 1, 2, 3]) {
                const w = m * Math.PI / 2 + t * 0.05;
                funken(dim, "fynn:seelenkreis", { x: ort.x + Math.cos(w) * 3.2, y: ort.y, z: ort.z + Math.sin(w) * 3.2 });
            }
        }
        if (t === 36) ton(dim, "mob.enderdragon.growl", ort, 2.5, 0.6);
    },
    abschied(z, a, t) {
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        if (t % 4 === 0) funken(dim, "fynn:seelenhauch", { x: ort.x, y: ort.y + 1.5 + (t / 80) * 4, z: ort.z });
        if (t === 8) ton(dim, "mob.enderdragon.death", ort, 0.6, 1.4);
        if (t === A.abschied.beute) {
            funken(dim, "fynn:seelensaeule", ort);
            ring(dim, ort, 2, 12);
            ring(dim, ort, 3.5, 16, "fynn:seelenhauch");
            ton(dim, "beacon.deactivate", ort, 2, 0.7);
        }
    },
    immer(z) {
        abbildTakt(z);
        if (z.phase !== 2) return;
        // Die Seelen um ihn herum - in Phase zwei steigen sie staendig auf.
        if (system.currentTick % 10 === 0) {
            const w = Math.random() * Math.PI * 2;
            funken(z.boss.dimension, "fynn:seelenhauch", {
                x: z.boss.location.x + Math.cos(w) * 2, y: z.boss.location.y + 2.5, z: z.boss.location.z + Math.sin(w) * 2,
            });
        }
    },
});

// Ein Spiegelbild zerspringt.
world.afterEvents.entityDie.subscribe((e) => {
    try {
        if (e.deadEntity?.typeId !== ABBILD) return;
        const o = e.deadEntity.location;
        funken(e.deadEntity.dimension, "fynn:seelenfunke", { x: o.x, y: o.y + 1, z: o.z });
        ton(e.deadEntity.dimension, "random.glass", o, 1.2, 1.4);
        abbilder.delete(e.deadEntity.id);
    } catch (fehler) { /* schon weg */ }
});

// ------------------------------------------------------------ Gegenstaende

// Seelenklinge: Seelenschnitt - ein kurzer Strahl vor dir. Was darin
// steht, nimmt Schaden; du bekommst einen Teil davon als Leben zurueck.
export function seelenschnitt(spieler) {
    if (ruht(spieler, "seelenklinge", 160)) return false;
    const dim = spieler.dimension;
    const o = spieler.location;
    const blick = spieler.getViewDirection?.() ?? { x: 0, z: 1 };
    const l = Math.hypot(blick.x, blick.z) || 1;
    const r = { x: blick.x / l, z: blick.z / l };
    for (let s = 1; s <= 10; s += 0.8) funken(dim, "fynn:seelenstrahl", { x: o.x + r.x * s, y: o.y + 1.3, z: o.z + r.z * s });
    ton(dim, "beacon.activate", o, 0.8, 1.8);
    let nah = [];
    try { nah = dim.getEntities({ location: o, maxDistance: 10.5, excludeFamilies: ["player", "inanimate"] }); } catch (e) { /* egal */ }
    let getroffen = 0;
    for (const w of nah) {
        if (!w.getComponent?.("minecraft:health") || w.getComponent?.("minecraft:tameable")?.isTamed) continue;
        const rx = w.location.x - o.x, rz = w.location.z - o.z;
        const entlang = rx * r.x + rz * r.z;
        if (entlang < 0.5 || entlang > 10 || Math.abs(rx * r.z - rz * r.x) > 1.3) continue;
        try { w.applyDamage(7, { cause: "entityAttack", damagingEntity: spieler }); getroffen += 1; } catch (e) { /* egal */ }
        funken(dim, "fynn:seelenfunke", { x: w.location.x, y: w.location.y + 1, z: w.location.z });
    }
    if (getroffen) heile(spieler, Math.min(6, getroffen * 2));
    return true;
}

// Seelenkristall: Heilt sofort und laesst das Leben eine Weile nachwachsen.
export function seelenkristall(spieler) {
    if (ruht(spieler, "seelenkristall", 40)) return false;
    try {
        spieler.addEffect("instant_health", 1, { amplifier: 1 });
        spieler.addEffect("regeneration", 300, { amplifier: 1 });
    } catch (e) { /* egal */ }
    const o = spieler.location;
    ring(spieler.dimension, o, 1, 8, "fynn:seelenhauch", 0.2);
    ton(spieler.dimension, "beacon.power", o, 1, 1.6);
    if (!istKreativ(spieler)) verbrauche(spieler);
    return true;
}

// Seelenruf: Die Laterne ruft ihn - ein Zauberkreis vor dir, dann steigt er
// daraus auf.
export function seelenruf(spieler) {
    const dim = spieler.dimension;
    let schonDa = [];
    try { schonDa = dim.getEntities({ type: TYP, location: spieler.location, maxDistance: 96 }); } catch (e) { /* egal */ }
    if (schonDa.length) {
        try { spieler.onScreenDisplay?.setActionBar("§7Aschvaru ist schon hier."); } catch (e) { /* egal */ }
        return false;
    }
    if (ruht(spieler, "seelenruf", 100)) return false;
    const blick = spieler.getViewDirection?.() ?? { x: 0, z: 1 };
    const l = Math.hypot(blick.x, blick.z) || 1;
    let ort = { x: spieler.location.x + blick.x / l * 11, y: spieler.location.y, z: spieler.location.z + blick.z / l * 11 };
    ort = boden(dim, ort, 5) ?? spieler.location;
    if (!istKreativ(spieler)) verbrauche(spieler);
    ton(dim, "mob.evocation_illager.prepare_summon", ort, 2, 0.6);
    for (let i = 0; i < 8; i++) {
        system.runTimeout(() => {
            funken(dim, "fynn:seelenkreis", ort);
            ring(dim, ort, 3.2 - i * 0.3, 10, "fynn:seelenhauch", 0.1);
        }, i * 5);
    }
    system.runTimeout(() => {
        try { dim.spawnEntity(TYP, ort); } catch (e) { console.warn(`Seelendrache, Seelenruf: ${e}`); }
    }, 42);
    return true;
}

world.afterEvents.itemUse.subscribe((e) => {
    try {
        const typ = e.itemStack?.typeId;
        if (typ === "fynn:seelenklinge") seelenschnitt(e.source);
        else if (typ === "fynn:seelenkristall") seelenkristall(e.source);
        else if (typ === "fynn:seelenruf") seelenruf(e.source);
    } catch (fehler) {
        console.warn(`Seelendrache, Gegenstand: ${fehler}`);
    }
});
