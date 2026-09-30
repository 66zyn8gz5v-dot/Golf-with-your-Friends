// Die Gaben der Mischlinge (5.2): Faehigkeiten, die aus zwei Atemarten
// entstehen.
//
// Fynn: "Faehigkeiten kombinieren, neue Faehigkeiten entstehen ... so dass
// die Faehigkeiten sich gut ausgleichen und kombinieren lassen."
//
// Ein gezuechteter Drache, dessen Eltern verschiedene Atemarten hatten,
// bekommt eine Gabe. Welche, haengt nur an den beiden Atemarten: Feuer und
// Sturm ergeben den Feuerwirbel, Frost und Sturm den Schneesturm, Schatten
// und Sturm den Schattenblitz ... fuenfzehn Paare, fuenfzehn Gaben.
//
// Jede Gabe hat eine Form (wie sie wirkt) und zwei Elemente (was sie tut):
//
// * Wirbel - eine Windhose am Ziel, die ansaugt und vier Sekunden wirkt.
// * Welle  - ein Ring, der vom Drachen nach aussen laeuft und wegstoesst.
// * Regen  - Brocken, die rund um das Ziel vom Himmel schlagen.
// * Kette  - ein Blitz, der von Ziel zu Ziel springt.
// * Wolke  - ein Nebel, der am Ziel liegen bleibt.
//
// Die Elemente: Feuer brennt, Frost verlangsamt, Sturm schleudert hoch,
// Gift vergiftet, Schatten verdunkelt und laesst verdorren, Schall macht
// schwindlig und stoesst weg.
//
// Staerker wird eine Gabe mit der Blutlinie: je Generation ein Stueck
// (bis zur sechsten), dazu bei Uralten.

import * as mc from "@minecraft/server";
import { eig, lebt, weite, einheit, maul, reiterVon, besitzerVon, blutMacht } from "./drachen.js";

const { world, system } = mc;

export const ATEMNAMEN = {
    feuer: "Feueratem", frost: "Frosthauch", sturm: "Sturmatem", gift: "Giftatem",
    schatten: "Schattenatem", schall: "Schallbrüllen",
};

// Paar der Atemarten (sortiert) -> Gabe.
export const GABEN = {
    "feuer+frost":     { name: "Dampfwelle", form: "welle" },
    "feuer+sturm":     { name: "Feuerwirbel", form: "wirbel" },
    "feuer+gift":      { name: "Brandnebel", form: "wolke" },
    "feuer+schatten":  { name: "Höllenregen", form: "regen" },
    "feuer+schall":    { name: "Donnerknall", form: "welle" },
    "frost+sturm":     { name: "Schneesturm", form: "wirbel" },
    "frost+gift":      { name: "Gifthagel", form: "regen" },
    "frost+schatten":  { name: "Nachtfrost", form: "wolke" },
    "frost+schall":    { name: "Eisschrei", form: "welle" },
    "gift+sturm":      { name: "Giftwirbel", form: "wirbel" },
    "schatten+sturm":  { name: "Schattenblitz", form: "kette" },
    "schall+sturm":    { name: "Donnerkette", form: "kette" },
    "gift+schatten":   { name: "Fluchnebel", form: "wolke" },
    "gift+schall":     { name: "Sporenknall", form: "welle" },
    "schall+schatten": { name: "Schattenregen", form: "regen" },
};
export const GABENNAMEN = Object.fromEntries(Object.entries(GABEN).map(([k, g]) => [k, g.name]));

export function gabeFuer(atemA, atemB) {
    if (!atemA || !atemB || atemA === atemB) return undefined;
    const k = [atemA, atemB].sort().join("+");
    return GABEN[k] ? k : undefined;
}

export function gabeVon(d) {
    try {
        const g = d.getDynamicProperty("fynn:gabe");
        return GABEN[g] ? g : undefined;
    } catch (e) { return undefined; }
}

/** Wie stark - die Blutlinie steht in drachen.js (blutMacht). */
export function macht(d) {
    return blutMacht(d);
}

// ------------------------------------------------------------ Elemente

function wirkung(el, ziel, quelle, st, von) {
    try {
        switch (el) {
            case "feuer": ziel.setOnFire(Math.round(4 * st), true); break;
            case "frost": ziel.addEffect("slowness", Math.round(60 * st), { amplifier: 2, showParticles: true }); break;
            case "gift": ziel.addEffect("poison", Math.round(80 * st), { amplifier: 1, showParticles: true }); break;
            case "schatten":
                ziel.addEffect("darkness", 80, { amplifier: 0, showParticles: false });
                ziel.addEffect("wither", Math.round(40 * st), { amplifier: 0, showParticles: true });
                break;
            case "schall": ziel.addEffect("nausea", 100, { amplifier: 0, showParticles: false }); break;
            default: break;
        }
    } catch (e) { /* manche Wesen haben keine Effekte */ }
    if (el === "sturm" || el === "schall") {
        const r = von ? einheit({ x: ziel.location.x - von.x, y: 0, z: ziel.location.z - von.z }) : { x: 0, y: 0, z: 0 };
        const hoch = el === "sturm" ? 0.9 : 0.35, seit = el === "sturm" ? 0.4 : 1.2;
        try {
            if (ziel.typeId === "minecraft:player") ziel.applyKnockback({ x: r.x * seit, z: r.z * seit }, hoch);
            else ziel.applyImpulse({ x: r.x * seit, y: hoch, z: r.z * seit });
        } catch (e) { /* egal */ }
    }
}

function treffen(g, ziel, schaden, von) {
    try { ziel.applyDamage(Math.round(schaden * g.st), { cause: "entityAttack", damagingEntity: g.drache }); } catch (e) { /* egal */ }
    for (const el of g.elemente) wirkung(el, ziel, g.drache, g.st, von);
}

function wolke(dim, el, ort) {
    try { dim.spawnParticle(`fynn:gabe_${el}`, ort); } catch (e) { /* egal */ }
}

/** Wen die Gabe treffen darf: nicht den Drachen, nicht seinen Reiter, nicht
 *  seinen Besitzer, keine Drachen desselben Besitzers - und Spieler nur,
 *  wenn sie selbst das Ziel sind. */
function opferBei(g, ort, radius) {
    let nah = [];
    try { nah = g.dim.getEntities({ location: ort, maxDistance: radius }); } catch (e) { return []; }
    const besitzer = besitzerVon(g.drache);
    const reiter = reiterVon(g.drache);
    return nah.filter((w) => {
        if (!lebt(w) || w.id === g.drache.id || w.id === reiter?.id || w.id === besitzer) return false;
        if (w.typeId === "minecraft:item" || w.typeId === "minecraft:xp_orb" || w.typeId === "fynn:drachenei") return false;
        if (w.typeId === "minecraft:player" && w.id !== g.ziel?.id) return false;
        try { if (besitzer && w.getDynamicProperty("fynn:besitzer") === besitzer) return false; } catch (e) { /* egal */ }
        return true;
    });
}

// ------------------------------------------------------------ Formen

// Laufende Gaben; der Takt unten treibt sie alle zwei Ticks weiter.
export const laufend = [];

const FORMEN = {
    // Eine Windhose am Ziel: zieht an, hebt, wirkt alle halbe Sekunde.
    wirbel: {
        dauer: 80,
        start(g) { g.ort = { ...g.zielOrt }; },
        schritt(g, t) {
            if (lebt(g.ziel)) {
                // Sie folgt dem Ziel langsam.
                g.ort.x += (g.ziel.location.x - g.ort.x) * 0.08;
                g.ort.z += (g.ziel.location.z - g.ort.z) * 0.08;
                g.ort.y = g.ziel.location.y;
            }
            for (let i = 0; i < 3; i++) {
                const h = ((t * 0.35 + i * 1.7) % 5.0);
                const w = t * 0.9 + i * 2.1;
                const r = 0.6 + h * 0.35;
                wolke(g.dim, g.elemente[i % 2], { x: g.ort.x + Math.cos(w) * r, y: g.ort.y + h, z: g.ort.z + Math.sin(w) * r });
            }
            if (t % 10 !== 0) return;
            for (const w of opferBei(g, g.ort, 3.5)) {
                const zu = { x: g.ort.x - w.location.x, y: 0.35, z: g.ort.z - w.location.z };
                try { if (w.typeId !== "minecraft:player") w.applyImpulse({ x: zu.x * 0.12, y: zu.y, z: zu.z * 0.12 }); } catch (e) { /* egal */ }
                treffen(g, w, 2, null);
            }
            try { g.dim.playSound("mob.breeze.idle_ground", g.ort, { volume: 2, pitch: 0.6 }); } catch (e) { /* egal */ }
        },
    },
    // Ein Ring vom Drachen nach aussen, neun Bloecke weit.
    welle: {
        dauer: 24,
        start(g) { g.mitte = { ...g.drache.location }; g.getroffen = new Set(); },
        schritt(g, t) {
            const r = 1 + t * 0.36;
            for (let i = 0; i < 14; i++) {
                const w = i / 14 * Math.PI * 2 + t * 0.1;
                wolke(g.dim, g.elemente[i % 2], { x: g.mitte.x + Math.cos(w) * r, y: g.mitte.y + 0.4, z: g.mitte.z + Math.sin(w) * r });
            }
            for (const w of opferBei(g, g.mitte, r + 1)) {
                if (g.getroffen.has(w.id) || weite(w.location, g.mitte) < r - 1.5) continue;
                g.getroffen.add(w.id);
                treffen(g, w, 6, g.mitte);
            }
            if (t === 0) {
                try {
                    g.dim.playSound("random.explode", g.mitte, { volume: 2, pitch: 0.7 });
                    g.dim.playSound("mob.warden.sonic_boom", g.mitte, { volume: 1.5, pitch: 1.2 });
                } catch (e) { /* egal */ }
            }
        },
    },
    // Brocken aus dem Himmel rund um das Ziel: acht Einschlaege in zwei Sekunden.
    regen: {
        dauer: 44,
        start(g) { g.mitte = { ...g.zielOrt }; },
        schritt(g, t) {
            if (t % 5 !== 0) return;
            const w = Math.random() * Math.PI * 2, r = Math.random() * 4;
            const ort = { x: g.mitte.x + Math.cos(w) * r, y: g.mitte.y, z: g.mitte.z + Math.sin(w) * r };
            // Der fallende Brocken: eine Spur von oben, dann der Einschlag.
            for (let h = 10; h >= 0; h -= 2) wolke(g.dim, g.elemente[h % 4 === 0 ? 0 : 1], { ...ort, y: ort.y + h });
            for (const el of g.elemente) wolke(g.dim, el, { ...ort, y: ort.y + 0.3 });
            try { g.dim.playSound("random.explode", ort, { volume: 0.8, pitch: 1.4 }); } catch (e) { /* egal */ }
            for (const v of opferBei(g, ort, 2.2)) treffen(g, v, 4, ort);
        },
    },
    // Ein Blitz, der von Ziel zu Ziel springt - bis zu fuenf.
    kette: {
        dauer: 30,
        start(g) {
            g.glieder = [];
            let von = maul(g.drache), jetzt = g.ziel;
            const schon = new Set();
            while (lebt(jetzt) && g.glieder.length < 5) {
                g.glieder.push([von, { ...jetzt.location, y: jetzt.location.y + 1 }, jetzt]);
                schon.add(jetzt.id);
                von = { ...jetzt.location, y: jetzt.location.y + 1 };
                jetzt = opferBei(g, jetzt.location, 7).find((w) => !schon.has(w.id) && w.typeId !== "minecraft:player");
            }
        },
        schritt(g, t) {
            const i = Math.floor(t / 6);
            if (t % 6 !== 0 || !g.glieder[i]) return;
            const [a, b, wer] = g.glieder[i];
            const n = Math.max(3, Math.round(weite(a, b) * 1.5));
            for (let k = 0; k <= n; k++) {
                const s = k / n;
                // Ein Blitz ist nicht gerade: er zuckt seitlich.
                const zick = (k % 2 ? 0.35 : -0.35) * Math.sin(s * Math.PI);
                wolke(g.dim, g.elemente[k % 2], { x: a.x + (b.x - a.x) * s + zick, y: a.y + (b.y - a.y) * s, z: a.z + (b.z - a.z) * s - zick });
            }
            try { g.dim.playSound("ambient.weather.thunder", b, { volume: 0.8, pitch: 1.6 }); } catch (e) { /* egal */ }
            if (lebt(wer)) treffen(g, wer, 6, a);
        },
    },
    // Ein Nebel, der sechs Sekunden am Ziel liegen bleibt.
    wolke: {
        dauer: 120,
        start(g) { g.mitte = { ...g.zielOrt }; },
        schritt(g, t) {
            if (t % 4 === 0) {
                for (let i = 0; i < 4; i++) {
                    const w = Math.random() * Math.PI * 2, r = Math.random() * 3.5;
                    wolke(g.dim, g.elemente[i % 2], { x: g.mitte.x + Math.cos(w) * r, y: g.mitte.y + 0.3 + Math.random(), z: g.mitte.z + Math.sin(w) * r });
                }
            }
            if (t % 10 !== 0) return;
            for (const w of opferBei(g, g.mitte, 3.8)) treffen(g, w, 1, null);
        },
    },
};

export const GABE_PAUSE = [500, 800];
const pausen = new Map();        // Drachen-Id -> Tick

export function gabeBereit(d, jetzt) {
    return !!gabeVon(d) && jetzt >= (pausen.get(d.id) ?? 0);
}

/** Die Gabe wirken - auf ziel (ein Wesen) oder in Blickrichtung. */
export function gabeWirken(drache, ziel, jetzt, zufall = Math.random) {
    const k = gabeVon(drache);
    if (!k) return undefined;
    if (!gabeBereit(drache, jetzt)) return "wartet";
    const gabe = GABEN[k];
    let zielOrt;
    if (lebt(ziel)) zielOrt = { ...ziel.location };
    else {
        let b = { x: 0, y: 0, z: 1 };
        try { b = drache.getViewDirection(); } catch (e) { /* egal */ }
        const o = drache.location;
        zielOrt = { x: o.x + b.x * 12, y: o.y, z: o.z + b.z * 12 };
    }
    const g = { drache, ziel, zielOrt, dim: drache.dimension, t: 0, form: FORMEN[gabe.form], elemente: k.split("+"),
                st: macht(drache), name: gabe.name };
    g.form.start(g);
    laufend.push(g);
    pausen.set(drache.id, jetzt + GABE_PAUSE[0] + Math.floor(zufall() * (GABE_PAUSE[1] - GABE_PAUSE[0])));
    try { drache.dimension.playSound("mob.enderdragon.growl", drache.location, { volume: 3, pitch: 0.7 }); } catch (e) { /* egal */ }
    return gabe.name;
}

/** Zwei Ticks weiter fuer alle laufenden Gaben. */
export function gabenTakt() {
    for (let i = laufend.length - 1; i >= 0; i--) {
        const g = laufend[i];
        try { g.form.schritt(g, g.t); } catch (e) { /* egal */ }
        g.t += 2;
        if (g.t >= g.form.dauer || !lebt(g.drache)) laufend.splice(i, 1);
    }
}

/** Ein wilder oder zahmer, nicht gerittener Drache mit Gabe setzt sie im
 *  Kampf von selbst ein, wenn das Ziel nah genug ist. */
export function gabeImKampf(drache, jetzt) {
    if (!gabeBereit(drache, jetzt) || reiterVon(drache)) return undefined;
    if (eig(drache, "fynn:besiegt") || eig(drache, "fynn:schlaeft")) return undefined;
    let ziel;
    try { ziel = drache.target; } catch (e) { return undefined; }
    if (!lebt(ziel) || weite(drache.location, ziel.location) > 18) return undefined;
    return gabeWirken(drache, ziel, jetzt);
}

system.runInterval(() => {
    try { if (laufend.length) gabenTakt(); } catch (fehler) { console.warn(`Drachengaben: ${fehler}`); }
}, 2);
