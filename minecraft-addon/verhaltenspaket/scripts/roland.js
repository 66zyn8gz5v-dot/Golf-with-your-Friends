// Sir Roland von Ronceval, Oberkommandant des Ritterordens - der Kampf.
//
// Fynn: "Der soll zwei Phasen haben ... ein paar Spezialangriffe, der kann
// ein bisschen Magie, hat ein Schild, hat ein Schwert ... der kann
// wahrscheinlich auch so andere Ritter beschwoeren ... wenn mehrere
// Spieler online sind ... dass der Boss dann staerker ist, mehr Leben hat."
//
// Was Dateien allein nicht koennen, steht hier: welcher Angriff wann kommt,
// wer davon getroffen wird, der Wechsel in die zweite Phase bei halbem
// Leben, die Staerke nach Zahl der Spieler, der Abschied mit der Beute fuer
// jeden, der mitgekaempft hat. Die Bewegungen dazu spielt das Spiel selbst:
// Das Skript setzt nur die Eigenschaft fynn:angriff, die Animations-
// steuerung im Ressourcenpaket springt in den passenden Zustand. Die Zeiten
// (in Ticks) kommen aus roland_daten.js, geschrieben zusammen mit den
// Animationen - so treffen Schlag und Bild zusammen.

import { world, system, ItemStack } from "@minecraft/server";
import { ANGRIFFE } from "./roland_daten.js";
import { LEBEN, MEHR_SPIELER, LETZTE_KRAFT, BEUTE, ANTEIL } from "./roland_werte.js";
import { merkeSiege } from "./boss_kern.js";

export const TYP = "fynn:roland";
// Der Name in Phase zwei, wie in Fynns Entwurf. Die Bossleiste
// (ui/hud_screen.json) erkennt an "Roland" ihr Aussehen und an "Phase 2"
// den Rahmen der zweiten Phase.
export const NAME_ENTFESSELT = "Sir Roland · Phase 2";
const UMKREIS_STAERKE = 48;      // wer beim Auftritt so nah ist, zaehlt mit
const UMKREIS_KAMPF = 32;
const SPIELERZAHL = "fynn:roland_spieler";

// Zwischen zwei Spezialangriffen kaempft er gewoehnlich (Ticks).
const PAUSE = { 1: [70, 110], 2: [40, 70] };
// Wie lange ein Angriff nach seinem Einsatz ruht (Ticks). In Phase zwei
// kuerzer.
const ABKLINGEN = {
    schildstoss: 160, klingenwirbel: 200, sprungschlag: 240, schildwall: 320,
    sternenklingen: 300, saphirwelle: 220, ruf_des_ordens: 700,
};

export const kaempfe = new Map();

// ------------------------------------------------------------ Hilfen

function gueltig(wesen) {
    try {
        return !!wesen && (typeof wesen.isValid === "function" ? wesen.isValid() : !!wesen.isValid);
    } catch (e) {
        return false;
    }
}

function istKreativ(spieler) {
    const modus = String(spieler.getGameMode?.() ?? "").toLowerCase();
    return modus === "creative" || modus === "spectator";
}

function abstand(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}

function richtung(von, nach) {
    const dx = nach.x - von.x;
    const dz = nach.z - von.z;
    const l = Math.hypot(dx, dz) || 1;
    return { x: dx / l, z: dz / l };
}

// Minecrafts Gier: 0 ist Sueden (+z), 90 Westen (-x).
export function gierZu(von, nach) {
    return -Math.atan2(nach.x - von.x, nach.z - von.z) * 180 / Math.PI;
}

function blickRichtung(boss) {
    const gier = (boss.getRotation?.().y ?? 0) * Math.PI / 180;
    return { x: -Math.sin(gier), z: Math.cos(gier) };
}

function schaue(boss, ziel) {
    try {
        boss.setRotation({ x: 0, y: gierZu(boss.location, ziel) });
    } catch (e) {
        // ohne Drehen geht es auch
    }
}

function funken(dimension, art, ort) {
    try {
        dimension.spawnParticle(art, ort);
    } catch (e) {
        // Partikel sind Schmuck
    }
}

function ton(dimension, name, ort, lautstaerke = 1, hoehe = 1) {
    try {
        dimension.playSound(name, ort, { volume: lautstaerke, pitch: hoehe });
    } catch (e) {
        // ohne Ton geht es auch
    }
}

function ereignis(boss, name) {
    try {
        boss.triggerEvent(name);
    } catch (e) {
        console.warn(`Roland, Ereignis ${name}: ${e}`);
    }
}

function spielerBei(boss, weite) {
    try {
        return boss.dimension.getPlayers({ location: boss.location, maxDistance: weite })
            .filter((s) => !istKreativ(s));
    } catch (e) {
        return [];
    }
}

// Wen ein Schlag trifft: alles Lebende im Umkreis ausser Roland und seinen
// Rittern (Familie "ritter") - und keine Spieler im Kreativmodus.
export function ziele(boss, mitte, weite) {
    let wesen = [];
    try {
        wesen = boss.dimension.getEntities({ location: mitte, maxDistance: weite, excludeFamilies: ["ritter", "inanimate"] });
    } catch (e) {
        return [];
    }
    return wesen.filter((w) => w.id !== boss.id && !!w.getComponent?.("minecraft:health")
        && w.typeId !== "minecraft:item" && w.typeId !== "minecraft:xp_orb"
        && !(w.typeId === "minecraft:player" && istKreativ(w)));
}

function treffe(z, ziel, schaden, stoss, hoch = 0.4) {
    try {
        ziel.applyDamage(Math.round(schaden * z.faktor), { cause: "entityAttack", damagingEntity: z.boss });
        if (stoss) ziel.applyKnockback({ x: stoss.x, z: stoss.z }, hoch);
    } catch (e) {
        // ein Ziel, das gerade verschwindet
    }
}

function leben(boss) {
    const h = boss.getComponent?.("minecraft:health");
    return h ? { jetzt: h.currentValue, max: h.effectiveMax, h } : null;
}

// ------------------------------------------------------------ Staerke

// Leben und Schaden nach Zahl der Spieler. Das Leben steht in den Gruppen
// fynn:staerke_1 bis _6 (roland_bauen.py), der Schaden der Spezialangriffe
// waechst hier mit: ein Siebtel je weiterem Spieler.
export function staerkeFuer(anzahl) {
    const n = Math.max(1, Math.min(MEHR_SPIELER, anzahl));
    return { n, leben: LEBEN[n], faktor: 1 + 0.15 * (n - 1) };
}

function setzeStaerke(z) {
    const anzahl = Math.max(1, spielerBei(z.boss, UMKREIS_STAERKE).length);
    const s = staerkeFuer(anzahl);
    ereignis(z.boss, `fynn:staerke_${s.n}`);
    try {
        z.boss.setDynamicProperty(SPIELERZAHL, s.n);
    } catch (e) { /* nicht schlimm */ }
    z.n = s.n;
    return s;
}

function faktorVon(z) {
    return staerkeFuer(z.n ?? 1).faktor * (z.phase === 2 ? 1.2 : 1);
}

// ------------------------------------------------------------ Zustand

export function zustandVon(boss) {
    let z = kaempfe.get(boss.id);
    if (!z) {
        let n = 1;
        try { n = boss.getDynamicProperty(SPIELERZAHL) ?? 1; } catch (e) { /* neu */ }
        let phase = 1;
        try { phase = boss.getProperty("fynn:phase") ?? 1; } catch (e) { /* neu */ }
        z = {
            boss, n, phase, aktion: null, pause: system.currentTick + 40, abkling: {},
            teilnehmer: new Set(), gefolge: [], besiegt: false, faktor: 1,
        };
        kaempfe.set(boss.id, z);
    }
    z.boss = boss;
    z.faktor = faktorVon(z);
    return z;
}

// ------------------------------------------------------------ Angriffe

export function starte(z, name, extra = {}) {
    const a = ANGRIFFE[name];
    z.aktion = { name, t: 0, laenge: a.laenge, ...extra };
    try {
        z.boss.setProperty("fynn:angriff", a.nr);
    } catch (e) {
        console.warn(`Roland, Angriff ${name}: ${e}`);
    }
    ereignis(z.boss, "fynn:angriff_beginn");
    // Er steht, waehrend er zaubert und ausholt. Springen und Anlaufen
    // macht das Skript selbst.
    try {
        z.boss.addEffect("slowness", a.laenge + 4, { amplifier: 20, showParticles: false });
    } catch (e) { /* ohne geht es auch */ }
    z.abkling[name] = system.currentTick + Math.round((ABKLINGEN[name] ?? 0) * (z.phase === 2 ? 0.7 : 1));
}

export function beende(z) {
    const war = z.aktion?.name;
    z.aktion = null;
    try {
        z.boss.setProperty("fynn:angriff", 0);
        z.boss.removeEffect("slowness");
    } catch (e) { /* weg ist weg */ }
    if (!z.besiegt) ereignis(z.boss, "fynn:angriff_ende");
    const [lo, hi] = PAUSE[z.phase] ?? PAUSE[1];
    z.pause = system.currentTick + lo + Math.floor(Math.random() * (hi - lo));
    return war;
}

function zielVon(z) {
    let ziel;
    try { ziel = z.boss.target; } catch (e) { ziel = undefined; }
    if (gueltig(ziel) && abstand(ziel.location, z.boss.location) <= UMKREIS_KAMPF) return ziel;
    let bester = null;
    for (const s of spielerBei(z.boss, UMKREIS_KAMPF)) {
        if (!bester || abstand(s.location, z.boss.location) < abstand(bester.location, z.boss.location)) bester = s;
    }
    return bester;
}

// Welche Angriffe jetzt passen - nach Abstand, Phase und Abklingzeit.
export function moeglich(z, weite, jetzt = system.currentTick) {
    const bereit = (name) => (z.abkling[name] ?? 0) <= jetzt;
    const liste = [];
    if (weite > 3 && weite < 10 && bereit("schildstoss")) liste.push("schildstoss");
    if (weite < 4.5 && bereit("klingenwirbel")) liste.push("klingenwirbel");
    if (weite > 6 && weite < 18 && bereit("sprungschlag")) liste.push("sprungschlag");
    if (weite < 6 && bereit("schildwall")) liste.push("schildwall");
    if (weite < 24 && bereit("sternenklingen")) liste.push("sternenklingen");
    if (weite > 3 && weite < 12 && bereit("saphirwelle")) liste.push("saphirwelle");
    if (z.phase === 2 && bereit("ruf_des_ordens") && lebendesGefolge(z) < gefolgeMax(z)) liste.push("ruf_des_ordens");
    return liste;
}

function waehle(z) {
    const ziel = zielVon(z);
    if (!ziel) {
        z.pause = system.currentTick + 20;
        return;
    }
    const liste = moeglich(z, abstand(ziel.location, z.boss.location));
    if (!liste.length) {
        z.pause = system.currentTick + 10;
        return;
    }
    const name = liste[Math.floor(Math.random() * liste.length)];
    schaue(z.boss, ziel.location);
    starte(z, name, { ziel });
}

// ---- Schildstoss: Anlauf mit dem Schild voran, wer davor steht, fliegt.
function schildstoss(z, a, t) {
    const d = ANGRIFFE.schildstoss;
    if (t === 0) {
        a.richtung = gueltig(a.ziel) ? richtung(z.boss.location, a.ziel.location) : blickRichtung(z.boss);
        a.getroffen = new Set();
    }
    if (t >= d.anlauf && t < d.ende_anlauf) {
        const ort = z.boss.location;
        const weiter = { x: ort.x + a.richtung.x * 0.6, y: ort.y, z: ort.z + a.richtung.z * 0.6 };
        if (frei(z.boss.dimension, weiter)) {
            try {
                z.boss.teleport(weiter, { keepVelocity: false, facingLocation: {
                    x: weiter.x + a.richtung.x, y: weiter.y + 1.8, z: weiter.z + a.richtung.z } });
            } catch (e) { /* gegen die Wand */ }
        }
        if (t % 2 === 0) funken(z.boss.dimension, "minecraft:knockback_roar_particle", ort);
    }
    if (t >= d.stoss - 3 && t <= d.ende_anlauf + 2) {
        const vorn = { x: z.boss.location.x + a.richtung.x * 1.6, y: z.boss.location.y + 1, z: z.boss.location.z + a.richtung.z * 1.6 };
        for (const w of ziele(z.boss, vorn, 1.9)) {
            if (a.getroffen.has(w.id)) continue;
            a.getroffen.add(w.id);
            treffe(z, w, 8, { x: a.richtung.x * 2.4, z: a.richtung.z * 2.4 }, 0.55);
            try { w.addEffect("slowness", 40, { amplifier: 1 }); } catch (e) { /* egal */ }
            ton(z.boss.dimension, "item.shield.block", vorn, 1.2, 0.7);
            funken(z.boss.dimension, "fynn:saphirfunken", vorn);
        }
    }
}

function frei(dimension, ort) {
    try {
        for (const dy of [0.2, 1.2, 2.2]) {
            const b = dimension.getBlock({ x: Math.floor(ort.x), y: Math.floor(ort.y + dy), z: Math.floor(ort.z) });
            if (b && !b.isAir && !b.isLiquid) return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

// ---- Klingenwirbel: zweimal um sich selbst, alles im Umkreis wird getroffen.
function klingenwirbel(z, a, t) {
    const d = ANGRIFFE.klingenwirbel;
    const dim = z.boss.dimension;
    const ort = z.boss.location;
    if (t > d.treffer[0] - 6 && t <= d.treffer[1] + 4 && t % 2 === 0) {
        // Die Spur der Klinge: Funken auf dem Kreis, den die Spitze zieht.
        const w = (t - (d.treffer[0] - 6)) * 0.55;
        funken(dim, "fynn:saphirfunken", { x: ort.x - Math.sin(w) * 3, y: ort.y + 1.4, z: ort.z + Math.cos(w) * 3 });
    }
    if (d.treffer.includes(t)) {
        ton(dim, "item.trident.riptide_1", ort, 1.2, 0.8);
        funken(dim, "fynn:saphirwelle", { x: ort.x, y: ort.y + 0.8, z: ort.z });
        for (const w of ziele(z.boss, ort, 4.5)) {
            const weg = richtung(ort, w.location);
            treffe(z, w, 7, { x: weg.x * 1.5, z: weg.z * 1.5 }, 0.45);
        }
    }
}

// ---- Sprungschlag: im Bogen zum Ziel, Landung mit Schockwelle.
export function bogenPunkt(start, ende, s, hoehe = 5) {
    return {
        x: start.x + (ende.x - start.x) * s,
        y: start.y + (ende.y - start.y) * s + hoehe * 4 * s * (1 - s),
        z: start.z + (ende.z - start.z) * s,
    };
}

function sprungschlag(z, a, t) {
    const d = ANGRIFFE.sprungschlag;
    const dim = z.boss.dimension;
    if (t === 0) {
        a.start = { ...z.boss.location };
        const ziel = gueltig(a.ziel) ? a.ziel.location : z.boss.location;
        // Nicht mitten auf den Spieler, sondern einen Schritt davor.
        const r = richtung(a.start, ziel);
        a.ende = { x: ziel.x - r.x * 1.2, y: ziel.y, z: ziel.z - r.z * 1.2 };
        funken(dim, "fynn:sternenzeichen", a.ende);
    }
    if (t === d.absprung) ton(dim, "mob.irongolem.throw", z.boss.location, 1, 0.6);
    if (t > d.absprung && t <= d.landung) {
        const s = (t - d.absprung) / (d.landung - d.absprung);
        const p = bogenPunkt(a.start, a.ende, s);
        try {
            z.boss.teleport(p, { keepVelocity: false, facingLocation: { x: a.ende.x, y: p.y, z: a.ende.z } });
        } catch (e) { /* egal */ }
        if (t % 3 === 0) funken(dim, "fynn:saphirfunken", p);
    }
    if (t === d.landung) {
        const ort = z.boss.location;
        ton(dim, "random.explode", ort, 0.8, 1.3);
        ton(dim, "random.anvil_land", ort, 1, 0.5);
        funken(dim, "fynn:saphirwelle", { x: ort.x, y: ort.y + 0.2, z: ort.z });
        funken(dim, "minecraft:huge_explosion_emitter", ort);
        for (const w of ziele(z.boss, ort, 6)) {
            const weite = abstand(ort, w.location);
            const weg = richtung(ort, w.location);
            treffe(z, w, Math.max(4, 11 * (1 - weite / 7)), { x: weg.x * 1.8, z: weg.z * 1.8 }, 0.7);
        }
    }
}

// ---- Schildwall: Schlaege von vorn prallen ab - und er kontert.
export function vonVorn(boss, angreifer) {
    const blick = blickRichtung(boss);
    const zu = richtung(boss.location, angreifer.location);
    return blick.x * zu.x + blick.z * zu.z > 0.2;
}

function schildwall(z, a, t) {
    if (t === ANGRIFFE.schildwall.von) ton(z.boss.dimension, "item.shield.block", z.boss.location, 1, 0.8);
    if (a.konter) {
        const ziel = a.konter;
        beende(z);
        schaue(z.boss, ziel.location);
        starte(z, "konter", { ziel });
    }
}

function konter(z, a, t) {
    if (t === ANGRIFFE.konter.treffer) {
        const r = gueltig(a.ziel) ? richtung(z.boss.location, a.ziel.location) : blickRichtung(z.boss);
        const vorn = { x: z.boss.location.x + r.x * 1.8, y: z.boss.location.y + 1, z: z.boss.location.z + r.z * 1.8 };
        ton(z.boss.dimension, "item.trident.hit", vorn, 1, 0.8);
        for (const w of ziele(z.boss, vorn, 2.2)) treffe(z, w, 9, { x: r.x * 1.8, z: r.z * 1.8 }, 0.35);
    }
}

// ---- Sternenklingen: Zeichen am Boden, dann faellt eine Klinge aus Licht.
function sternenklingen(z, a, t) {
    const d = ANGRIFFE.sternenklingen;
    const dim = z.boss.dimension;
    const wellen = z.phase === 2 ? 2 : 1;
    a.marken ??= [];
    for (let i = 0; i < wellen; i++) {
        if (t === d.zeichen[i]) {
            ton(dim, "mob.evocation_illager.prepare_attack", z.boss.location, 1, 1.2);
            const orte = [];
            for (const s of spielerBei(z.boss, 24)) {
                orte.push({ x: s.location.x, y: Math.floor(s.location.y), z: s.location.z });
            }
            for (const o of orte) funken(dim, "fynn:sternenzeichen", o);
            a.marken[i] = orte;
        }
        if (t === d.einschlag[i]) {
            for (const o of a.marken[i] ?? []) {
                funken(dim, "fynn:sternenklinge", o);
                funken(dim, "fynn:saphirfunken", { x: o.x, y: o.y + 0.3, z: o.z });
                ton(dim, "item.trident.thunder", o, 0.6, 1.6);
                for (const w of ziele(z.boss, o, 1.8)) {
                    treffe(z, w, 9, null);
                    try { w.addEffect("slowness", 30, { amplifier: 2 }); } catch (e) { /* egal */ }
                }
            }
        }
    }
}

// ---- Saphirwelle: aus dem Schlag in den Boden laeuft eine Welle los.
function saphirwelle(z, a, t) {
    const d = ANGRIFFE.saphirwelle;
    const dim = z.boss.dimension;
    if (t === 0) {
        a.richtung = gueltig(a.ziel) ? richtung(z.boss.location, a.ziel.location) : blickRichtung(z.boss);
        a.start = { ...z.boss.location };
        a.getroffen = new Set();
    }
    if (t === d.welle) ton(dim, "random.explode", z.boss.location, 0.5, 1.6);
    const schritt = (t - d.welle) / 2;
    if (t >= d.welle && Number.isInteger(schritt) && schritt < 14) {
        const weite = 1.5 + schritt;
        const o = { x: a.start.x + a.richtung.x * weite, y: a.start.y + 0.2, z: a.start.z + a.richtung.z * weite };
        funken(dim, "fynn:saphirwelle", o);
        funken(dim, "fynn:saphirfunken", o);
        for (const w of ziele(z.boss, o, 1.5)) {
            if (a.getroffen.has(w.id)) continue;
            a.getroffen.add(w.id);
            treffe(z, w, 9, { x: a.richtung.x * 1.2, z: a.richtung.z * 1.2 }, 0.6);
        }
    }
}

// ---- Ruf des Ordens: Ritter treten aus blauem Licht.
function gefolgeMax(z) {
    return Math.min(5, 2 + (z.n ?? 1) - 1);
}

function lebendesGefolge(z) {
    z.gefolge = z.gefolge.filter((w) => gueltig(w));
    return z.gefolge.length;
}

export function rufe(z, anzahl) {
    const dim = z.boss.dimension;
    const ort = z.boss.location;
    const frei_ = Math.max(0, gefolgeMax(z) - lebendesGefolge(z));
    const n = Math.min(anzahl, frei_);
    for (let i = 0; i < n; i++) {
        const w = (i / Math.max(1, n)) * Math.PI * 2 + 0.6;
        const p = { x: ort.x + Math.cos(w) * 3, y: ort.y, z: ort.z + Math.sin(w) * 3 };
        funken(dim, "fynn:ordenslicht", p);
        // In der zweiten Phase kommt ein Hauptmann mit.
        const typ = z.phase === 2 && i === 0 && (z.n ?? 1) >= 2 ? "fynn:ritterhauptmann" : "fynn:ritter";
        try {
            const ritter = dim.spawnEntity(typ, p);
            ritter.addTag("roland_gefolge");
            z.gefolge.push(ritter);
        } catch (e) {
            console.warn(`Roland, Ruf: ${e}`);
        }
    }
    ton(dim, "mob.evocation_illager.prepare_summon", ort, 1.5, 0.8);
    return n;
}

function ruf_des_ordens(z, a, t) {
    if (t === 4) ton(z.boss.dimension, "horn.call.5", z.boss.location, 3, 0.9);
    if (t === ANGRIFFE.ruf_des_ordens.ruf) rufe(z, 2 + Math.floor(((z.n ?? 1) - 1) / 2));
}

// ---- Phasenwechsel: Phase eins ist leer - er laedt sich auf.
//
// Fynn: "Wenn man ihn in Phase 1 auf null HP gebracht hat, laedt er sich
// auf und seine HP steigen und er wechselt in Phase 2 ... immun gegen
// Attacken, damit man ihn dort nicht toeten kann." Jede Phase hat ihre
// eigene volle Leiste. Waehrend des ganzen Wechsels traegt er die Gruppe
// fynn:unverwundbar; das Leben steigt Tick fuer Tick von fast null auf voll.
export function ladeStand(t, d = ANGRIFFE.phasenwechsel) {
    return Math.max(0, Math.min(1, (t - d.laden_von) / (d.laden_bis - d.laden_von)));
}

function phasenwechsel(z, a, t) {
    const d = ANGRIFFE.phasenwechsel;
    const dim = z.boss.dimension;
    const ort = z.boss.location;
    const l = leben(z.boss);
    if (t === 0) {
        ereignis(z.boss, "fynn:schutz_an");
        // Die Leiste zeigt: leer.
        if (l) l.h.setCurrentValue(1);
        ton(dim, "mob.irongolem.hit", ort, 1.5, 0.5);
        for (const s of spielerBei(z.boss, UMKREIS_STAERKE)) {
            try {
                s.onScreenDisplay.setTitle("§bSir Roland lädt sich auf", { subtitle: "§7Er ist unverwundbar",
                    fadeInDuration: 5, stayDuration: 50, fadeOutDuration: 10 });
            } catch (e) { /* egal */ }
        }
    }
    if (t === d.laden_von) {
        // Ab jetzt fuellt sich schon die Leiste der zweiten Phase.
        try { z.boss.nameTag = NAME_ENTFESSELT; } catch (e) { /* egal */ }
        ton(dim, "mob.evocation_illager.cast_spell", ort, 1.5, 0.6);
        ton(dim, "beacon.activate", ort, 1.5, 0.8);
    }
    if (t > d.laden_von && t <= d.laden_bis && l) {
        l.h.setCurrentValue(Math.max(1, Math.round(l.max * ladeStand(t, d))));
        // Blaue Funken sammeln sich um ihn, immer dichter.
        const dichte = 1 + Math.floor(ladeStand(t, d) * 3);
        if (t % Math.max(2, 7 - dichte * 2) === 0) funken(dim, "fynn:saphiraura", ort);
        if (t % 8 === 0) {
            const w = t * 0.7;
            funken(dim, "fynn:saphirfunken", { x: ort.x + Math.cos(w) * 1.6, y: ort.y + 0.4 + ladeStand(t, d) * 1.6, z: ort.z + Math.sin(w) * 1.6 });
        }
    }
    if (t === d.laden_bis) funken(dim, "fynn:ordenslicht", ort);
    if (t === d.welle) {
        z.phase = 2;
        z.faktor = faktorVon(z);
        try {
            z.boss.setProperty("fynn:phase", 2);
            z.boss.nameTag = NAME_ENTFESSELT;
        } catch (e) { /* weiter */ }
        ereignis(z.boss, "fynn:entfesseln");
        ton(dim, "mob.enderdragon.growl", ort, 2, 1.2);
        funken(dim, "fynn:saphirwelle", { x: ort.x, y: ort.y + 0.2, z: ort.z });
        funken(dim, "fynn:ordenslicht", ort);
        for (const w of ziele(z.boss, ort, 7)) {
            const weg = richtung(ort, w.location);
            treffe(z, w, 4, { x: weg.x * 2.6, z: weg.z * 2.6 }, 0.8);
        }
        rufe(z, 2);
        for (const s of spielerBei(z.boss, UMKREIS_STAERKE)) {
            try {
                s.onScreenDisplay.setTitle("§bEntfesselt", { subtitle: "§7Sir Roland ruft den Orden", fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 15 });
            } catch (e) { /* egal */ }
        }
    }
    if (t === d.laenge - 1) {
        if (l) l.h.setCurrentValue(l.max);
        ereignis(z.boss, "fynn:schutz_aus");
    }
}

// ---- Auftritt: kniend erscheinen, aufstehen, gruessen.
function auftritt(z, a, t) {
    const dim = z.boss.dimension;
    if (t === 0) {
        setzeStaerke(z);
        z.faktor = faktorVon(z);
        funken(dim, "fynn:ordenslicht", z.boss.location);
        ton(dim, "ambient.weather.thunder", z.boss.location, 1, 0.8);
        for (const s of spielerBei(z.boss, UMKREIS_STAERKE)) {
            try {
                s.onScreenDisplay.setTitle("§6Sir Roland von Ronceval", {
                    subtitle: z.n > 1 ? `§7Oberkommandant des Ritterordens §8- §f${z.n} Herausforderer`
                        : "§7Oberkommandant des Ritterordens",
                    fadeInDuration: 10, stayDuration: 50, fadeOutDuration: 20,
                });
            } catch (e) { /* egal */ }
        }
    }
    if (t === ANGRIFFE.auftritt.bereit) ereignis(z.boss, "fynn:auftritt_fertig");
}

// ---- Abschied: kniet, das Licht holt ihn, die Beute bleibt.
export function beuteListe(liste, zufall = Math.random) {
    const aus = [];
    for (const [name, lo, hi, chance] of liste) {
        if (zufall() >= chance) continue;
        aus.push([name, lo + Math.floor(zufall() * (hi - lo + 1))]);
    }
    return aus;
}

export function legeBeute(dimension, ort, teilnehmer, zufall = Math.random) {
    // Der Erste bekommt alles, jeder weitere Mitkaempfer seinen Anteil.
    const stapel = beuteListe(BEUTE, zufall);
    for (let i = 1; i < Math.max(1, teilnehmer); i++) stapel.push(...beuteListe(ANTEIL, zufall));
    stapel.forEach(([name, anzahl], i) => {
        const w = i * 0.9;
        try {
            dimension.spawnItem(new ItemStack(name, anzahl), { x: ort.x + Math.cos(w) * 0.8, y: ort.y + 0.6, z: ort.z + Math.sin(w) * 0.8 });
        } catch (e) {
            console.warn(`Roland, Beute ${name}: ${e}`);
        }
    });
    return stapel;
}

function abschied(z, a, t) {
    const d = ANGRIFFE.abschied;
    const dim = z.boss.dimension;
    const ort = z.boss.location;
    if (t === 0) {
        for (const w of z.gefolge) {
            if (!gueltig(w)) continue;
            funken(dim, "fynn:ordenslicht", w.location);
            try { w.remove(); } catch (e) { /* weg */ }
        }
        z.gefolge = [];
        ton(dim, "mob.irongolem.death", ort, 1.5, 0.6);
    }
    if (t % 8 === 0) funken(dim, "fynn:saphiraura", ort);
    if (t === d.licht) {
        funken(dim, "fynn:ordenslicht", ort);
        ton(dim, "random.totem", ort, 1, 0.8);
        const sieger = spielerBei(z.boss, 64).filter((s) => z.teilnehmer.has(s.id));
        legeBeute(dim, ort, sieger.length);
        merkeSiege(sieger, TYP);
        for (const s of spielerBei(z.boss, 64)) {
            try {
                s.onScreenDisplay.setTitle("§6Sieg", { subtitle: "§7Sir Roland legt Durendal nieder", fadeInDuration: 10, stayDuration: 60, fadeOutDuration: 20 });
            } catch (e) { /* egal */ }
        }
    }
    if (t >= d.laenge) {
        funken(dim, "fynn:saphirwelle", { x: ort.x, y: ort.y + 0.5, z: ort.z });
        kaempfe.delete(z.boss.id);
        try { z.boss.remove(); } catch (e) { /* weg */ }
        return true;
    }
    return false;
}

export function besiegen(z) {
    if (z.besiegt) return false;
    z.besiegt = true;
    if (z.aktion) beende(z);
    ereignis(z.boss, "fynn:schutz_an");
    const l = leben(z.boss);
    if (l) l.h.setCurrentValue(1);
    starte(z, "abschied");
    // Fuer immer stillstehen - nach dem Abschied ist er fort.
    try { z.boss.addEffect("slowness", 400, { amplifier: 20, showParticles: false }); } catch (e) { /* egal */ }
    return true;
}

const SCHRITTE = {
    schildstoss, klingenwirbel, sprungschlag, schildwall, konter, sternenklingen,
    saphirwelle, ruf_des_ordens, phasenwechsel, auftritt,
};

// ------------------------------------------------------------ Takt

export function takt(z) {
    const boss = z.boss;
    if (!gueltig(boss)) return;
    const l = leben(boss);
    if (z.aktion?.name === "abschied") {
        z.aktion.t += 1;
        abschied(z, z.aktion, z.aktion.t);
        return;
    }
    // Leer: in Phase eins der Wechsel, in Phase zwei der Abschied. Waehrend
    // des Wechsels ist das Leben absichtlich niedrig - dann nicht noch einmal.
    if (l && !z.besiegt && l.jetzt <= LETZTE_KRAFT + 0.5 && z.aktion?.name !== "phasenwechsel") {
        if (z.phase === 1) {
            if (z.aktion) beende(z);
            starte(z, "phasenwechsel");
        } else {
            besiegen(z);
            abschied(z, z.aktion, 0);
            return;
        }
    }
    if (z.aktion) {
        const a = z.aktion;
        const schritt = SCHRITTE[a.name];
        try {
            if (schritt) schritt(z, a, a.t);
        } catch (e) {
            console.warn(`Roland, ${a.name}: ${e}`);
        }
        if (z.aktion === a) {
            a.t += 1;
            if (a.t > a.laenge) beende(z);
        }
    } else if (system.currentTick >= z.pause) {
        waehle(z);
    }
    if (z.phase === 2 && system.currentTick % 10 === 0) funken(boss.dimension, "fynn:saphiraura", boss.location);
}

system.runInterval(() => {
    for (const z of [...kaempfe.values()]) {
        try {
            takt(z);
        } catch (e) {
            console.warn(`Roland, Takt: ${e}`);
        }
    }
}, 1);

// Nach dem Neuladen der Welt: Rolands, die schon da sind, wieder aufnehmen.
system.runInterval(() => {
    for (const id of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) {
        let wesen = [];
        try { wesen = world.getDimension(id).getEntities({ type: TYP }); } catch (e) { continue; }
        for (const boss of wesen) {
            const bekannt = kaempfe.has(boss.id);
            const z = zustandVon(boss);
            if (!bekannt) {
                try { boss.setProperty("fynn:angriff", 0); } catch (e) { /* egal */ }
                ereignis(boss, "fynn:angriff_ende");
                ereignis(boss, "fynn:schutz_aus");
            }
        }
    }
    for (const [id, z] of kaempfe) if (!gueltig(z.boss)) kaempfe.delete(id);
}, 60);

world.afterEvents.entitySpawn.subscribe((e) => {
    try {
        if (e.entity?.typeId !== TYP) return;
        // Beim Laden einer Welt oder eines Gebiets meldet das Spiel ihn
        // auch - dann kein neuer Auftritt, nur weiterkaempfen.
        if (String(e.cause ?? "").toLowerCase() === "loaded") return;
        const z = zustandVon(e.entity);
        starte(z, "auftritt");
    } catch (fehler) {
        console.warn(`Roland, Auftritt: ${fehler}`);
    }
});

// Wer ihn trifft, kaempft mit (und bekommt beim Sieg seinen Anteil). Und:
// Im Schildwall prallt ab, was von vorn kommt.
world.afterEvents.entityHurt.subscribe((e) => {
    try {
        if (e.hurtEntity?.typeId !== TYP) return;
        const z = zustandVon(e.hurtEntity);
        const quelle = e.damageSource?.damagingEntity;
        if (quelle?.typeId === "minecraft:player") z.teilnehmer.add(quelle.id);
        const a = z.aktion;
        const w = ANGRIFFE.schildwall;
        if (a?.name === "schildwall" && a.t >= w.von && a.t <= w.bis && quelle && vonVorn(z.boss, quelle)) {
            const l = leben(z.boss);
            if (l) l.h.setCurrentValue(Math.min(l.max, l.jetzt + e.damage));
            ton(z.boss.dimension, "item.shield.block", z.boss.location, 1.2, 1);
            funken(z.boss.dimension, "fynn:saphirfunken", { x: z.boss.location.x, y: z.boss.location.y + 1.4, z: z.boss.location.z });
            if (!a.konter && gueltig(quelle) && abstand(quelle.location, z.boss.location) < 5) a.konter = quelle;
        }
    } catch (fehler) {
        console.warn(`Roland, Treffer: ${fehler}`);
    }
});

// Stirbt er doch einmal richtig (/kill, Leere), faellt die Beute aus der
// Tabelle; sein Gefolge verschwindet mit ihm.
world.afterEvents.entityDie.subscribe((e) => {
    try {
        if (e.deadEntity?.typeId !== TYP) return;
        const z = kaempfe.get(e.deadEntity.id);
        if (!z) return;
        for (const w of z.gefolge) if (gueltig(w)) try { w.remove(); } catch (f) { /* weg */ }
        kaempfe.delete(e.deadEntity.id);
    } catch (fehler) {
        console.warn(`Roland, Tod: ${fehler}`);
    }
});

// ------------------------------------------------------------ Gegenstaende

const zuletzt = new Map();

function ruht(spieler, was, dauer) {
    const schluessel = `${spieler.id}:${was}`;
    const jetzt = system.currentTick;
    if (jetzt - (zuletzt.get(schluessel) ?? -dauer) < dauer) return true;
    zuletzt.set(schluessel, jetzt);
    return false;
}

// Durendal: eine Saphirwelle ueber den Boden, alle acht Sekunden. Sie trifft
// Monster und Tiere, keine Spieler.
export function durendalWelle(spieler) {
    if (ruht(spieler, "durendal", 160)) return false;
    const dim = spieler.dimension;
    const blick = spieler.getViewDirection?.() ?? { x: 0, z: 1 };
    const l = Math.hypot(blick.x, blick.z) || 1;
    const r = { x: blick.x / l, z: blick.z / l };
    const start = { ...spieler.location };
    const getroffen = new Set();
    ton(dim, "item.trident.riptide_1", start, 1, 1.2);
    for (let i = 1; i <= 10; i++) {
        system.runTimeout(() => {
            const o = { x: start.x + r.x * (i + 0.5), y: start.y + 0.2, z: start.z + r.z * (i + 0.5) };
            funken(dim, "fynn:saphirwelle", o);
            let wesen = [];
            try {
                wesen = dim.getEntities({ location: o, maxDistance: 1.6, excludeFamilies: ["player", "inanimate"] });
            } catch (e) { return; }
            for (const w of wesen) {
                if (getroffen.has(w.id) || !w.getComponent?.("minecraft:health") || w.typeId === "minecraft:item") continue;
                // Eigene Tiere schont die Welle.
                if (w.getComponent?.("minecraft:tameable")?.isTamed) continue;
                getroffen.add(w.id);
                try {
                    w.applyDamage(8, { cause: "entityAttack", damagingEntity: spieler });
                    w.applyKnockback({ x: r.x * 1.1, z: r.z * 1.1 }, 0.5);
                } catch (e) { /* egal */ }
            }
        }, i * 2);
    }
    return true;
}

// Olifant: Rolands Horn. Alle Spieler in der Naehe werden gestaerkt,
// Monster ganz in der Naehe zurueckgeworfen. Drei Minuten Ruhe.
export function olifant(spieler) {
    if (ruht(spieler, "olifant", 3600)) {
        try { spieler.onScreenDisplay?.setActionBar("§7Der Olifant braucht noch Ruhe."); } catch (e) { /* egal */ }
        return false;
    }
    const dim = spieler.dimension;
    ton(dim, "horn.call.5", spieler.location, 6, 0.7);
    funken(dim, "fynn:saphirwelle", { x: spieler.location.x, y: spieler.location.y + 0.2, z: spieler.location.z });
    for (const s of dim.getPlayers({ location: spieler.location, maxDistance: 32 })) {
        try {
            s.addEffect("resistance", 600, { amplifier: 1 });
            s.addEffect("strength", 600, { amplifier: 1 });
            s.addEffect("regeneration", 200, { amplifier: 0 });
            s.onScreenDisplay?.setActionBar("§b» Der Olifant ruft! «");
        } catch (e) { /* egal */ }
    }
    let nah = [];
    try { nah = dim.getEntities({ location: spieler.location, maxDistance: 8, families: ["monster"] }); } catch (e) { /* egal */ }
    for (const m of nah) {
        const weg = richtung(spieler.location, m.location);
        try {
            m.applyKnockback({ x: weg.x * 2, z: weg.z * 2 }, 0.5);
            m.addEffect("weakness", 200, { amplifier: 0 });
        } catch (e) { /* egal */ }
    }
    return true;
}

// Fehdehandschuh: Wer ihn wirft, fordert Roland heraus. Nicht zweimal in
// derselben Gegend.
export function fordereHeraus(spieler) {
    const dim = spieler.dimension;
    let schonDa = [];
    try { schonDa = dim.getEntities({ type: TYP, location: spieler.location, maxDistance: 96 }); } catch (e) { /* egal */ }
    if (schonDa.length) {
        try { spieler.onScreenDisplay?.setActionBar("§7Sir Roland ist schon hier."); } catch (e) { /* egal */ }
        return false;
    }
    if (ruht(spieler, "fehde", 100)) return false;
    const blick = spieler.getViewDirection?.() ?? { x: 0, z: 1 };
    const l = Math.hypot(blick.x, blick.z) || 1;
    let ort = { x: spieler.location.x + blick.x / l * 6, y: spieler.location.y, z: spieler.location.z + blick.z / l * 6 };
    ort = boden(dim, ort) ?? spieler.location;
    if (!istKreativ(spieler)) verbrauche(spieler);
    ton(dim, "ambient.weather.thunder", ort, 2, 1);
    for (let i = 0; i < 6; i++) system.runTimeout(() => funken(dim, "fynn:ordenslicht", ort), i * 6);
    system.runTimeout(() => {
        try {
            dim.spawnEntity(TYP, ort);
        } catch (e) {
            console.warn(`Roland, Herausforderung: ${e}`);
        }
    }, 36);
    return true;
}

function boden(dim, ort) {
    try {
        for (let dy = 3; dy >= -5; dy--) {
            const y = Math.floor(ort.y) + dy;
            const unten = dim.getBlock({ x: Math.floor(ort.x), y: y - 1, z: Math.floor(ort.z) });
            if (unten && !unten.isAir && !unten.isLiquid && frei(dim, { x: ort.x, y, z: ort.z })) {
                return { x: Math.floor(ort.x) + 0.5, y, z: Math.floor(ort.z) + 0.5 };
            }
        }
    } catch (e) { /* unbekannter Boden */ }
    return null;
}

function verbrauche(spieler) {
    try {
        const inv = spieler.getComponent("minecraft:inventory")?.container;
        const platz = spieler.selectedSlotIndex;
        const stapel = inv?.getItem(platz);
        if (!stapel) return;
        if (stapel.amount > 1) {
            stapel.amount -= 1;
            inv.setItem(platz, stapel);
        } else {
            inv.setItem(platz, undefined);
        }
    } catch (e) {
        console.warn(`Roland, Handschuh: ${e}`);
    }
}

world.afterEvents.itemUse.subscribe((e) => {
    try {
        const typ = e.itemStack?.typeId;
        if (typ === "fynn:durendal") durendalWelle(e.source);
        else if (typ === "fynn:olifant") olifant(e.source);
        else if (typ === "fynn:fehdehandschuh") fordereHeraus(e.source);
    } catch (fehler) {
        console.warn(`Roland, Gegenstand: ${fehler}`);
    }
});
