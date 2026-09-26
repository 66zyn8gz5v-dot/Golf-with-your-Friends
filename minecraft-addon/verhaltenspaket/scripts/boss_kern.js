// Was alle Bosse gemeinsam haben - gelernt an Sir Roland.
//
// Jeder Boss hat zwei Phasen mit je einer vollen Lebensleiste. Ist Phase
// eins leer, laedt er sich unverwundbar wieder auf (Fynn: "damit man ihn
// dort nicht toeten kann"), ist Phase zwei leer, folgt sein Abschied mit
// der Beute fuer jeden, der mitgekaempft hat. Er wird staerker mit jedem
// Spieler, der beim Auftritt in der Naehe steht. Seine Angriffe sind
// Zustaende: Das Skript setzt die Eigenschaft fynn:angriff, die
// Animationssteuerung spielt die Bewegung, und die Zeiten, zu denen etwas
// trifft, kommen aus derselben Tabelle wie die Animationen.
//
// Ein Boss beschreibt nur, was ihn ausmacht (seine Angriffe, seine Wahl,
// seine Beute); den Rest - Takt, Phasen, Schutz, Beute, Neuladen - macht
// bossKampf() hier. Die Ereignisse im Verhaltenspaket heissen bei allen
// Bossen gleich (fynn:angriff_beginn, fynn:schutz_an, fynn:staerke_N ...).

import { world, system, ItemStack } from "@minecraft/server";

// ------------------------------------------------------------ Hilfen

export function gueltig(wesen) {
    try {
        return !!wesen && (typeof wesen.isValid === "function" ? wesen.isValid() : !!wesen.isValid);
    } catch (e) {
        return false;
    }
}

export function istKreativ(spieler) {
    const modus = String(spieler.getGameMode?.() ?? "").toLowerCase();
    return modus === "creative" || modus === "spectator";
}

export function abstand(a, b) {
    return Math.hypot(a.x - b.x, a.z - b.z);
}

export function richtung(von, nach) {
    const dx = nach.x - von.x;
    const dz = nach.z - von.z;
    const l = Math.hypot(dx, dz) || 1;
    return { x: dx / l, z: dz / l };
}

// Minecrafts Gier: 0 ist Sueden (+z), 90 Westen (-x).
export function gierZu(von, nach) {
    return -Math.atan2(nach.x - von.x, nach.z - von.z) * 180 / Math.PI;
}

export function blickRichtung(wesen) {
    const gier = (wesen.getRotation?.().y ?? 0) * Math.PI / 180;
    return { x: -Math.sin(gier), z: Math.cos(gier) };
}

export function schaue(wesen, ziel) {
    try {
        wesen.setRotation({ x: 0, y: gierZu(wesen.location, ziel) });
    } catch (e) { /* ohne Drehen geht es auch */ }
}

export function funken(dimension, art, ort) {
    try {
        dimension.spawnParticle(art, ort);
    } catch (e) { /* Partikel sind Schmuck */ }
}

export function ton(dimension, name, ort, lautstaerke = 1, hoehe = 1) {
    try {
        dimension.playSound(name, ort, { volume: lautstaerke, pitch: hoehe });
    } catch (e) { /* ohne Ton geht es auch */ }
}

export function ereignis(wesen, name) {
    try {
        wesen.triggerEvent(name);
    } catch (e) {
        console.warn(`Boss, Ereignis ${name}: ${e}`);
    }
}

export function spielerBei(wesen, weite) {
    try {
        return wesen.dimension.getPlayers({ location: wesen.location, maxDistance: weite })
            .filter((s) => !istKreativ(s));
    } catch (e) {
        return [];
    }
}

export function titel(spieler, oben, unten, dauer = 50) {
    for (const s of spieler) {
        try {
            s.onScreenDisplay.setTitle(oben, { subtitle: unten, fadeInDuration: 8, stayDuration: dauer, fadeOutDuration: 15 });
        } catch (e) { /* egal */ }
    }
}

// Wen ein Schlag trifft: alles Lebende im Umkreis ausser dem Boss und
// seinem Gefolge (die Familien in "schonen") - und keine Spieler im
// Kreativmodus, keine Gegenstaende.
export function ziele(boss, mitte, weite, schonen = []) {
    let wesen = [];
    try {
        wesen = boss.dimension.getEntities({ location: mitte, maxDistance: weite, excludeFamilies: [...schonen, "inanimate"] });
    } catch (e) {
        return [];
    }
    return wesen.filter((w) => w.id !== boss.id && !!w.getComponent?.("minecraft:health")
        && w.typeId !== "minecraft:item" && w.typeId !== "minecraft:xp_orb"
        && !(w.typeId === "minecraft:player" && istKreativ(w)));
}

export function leben(wesen) {
    const h = wesen.getComponent?.("minecraft:health");
    return h ? { jetzt: h.currentValue, max: h.effectiveMax, h } : null;
}

export function bogenPunkt(start, ende, s, hoehe = 5) {
    return {
        x: start.x + (ende.x - start.x) * s,
        y: start.y + (ende.y - start.y) * s + hoehe * 4 * s * (1 - s),
        z: start.z + (ende.z - start.z) * s,
    };
}

export function frei(dimension, ort, hoehe = 2) {
    try {
        for (let dy = 0.2; dy < hoehe + 0.3; dy += 1) {
            const b = dimension.getBlock({ x: Math.floor(ort.x), y: Math.floor(ort.y + dy), z: Math.floor(ort.z) });
            if (b && !b.isAir && !b.isLiquid) return false;
        }
        return true;
    } catch (e) {
        return false;
    }
}

// Der Boden unter einem Ort: von drei Bloecken darueber bis fuenf darunter.
export function boden(dimension, ort, hoehe = 2) {
    try {
        for (let dy = 3; dy >= -5; dy--) {
            const y = Math.floor(ort.y) + dy;
            const unten = dimension.getBlock({ x: Math.floor(ort.x), y: y - 1, z: Math.floor(ort.z) });
            if (unten && !unten.isAir && !unten.isLiquid && frei(dimension, { x: ort.x, y, z: ort.z }, hoehe)) {
                return { x: Math.floor(ort.x) + 0.5, y, z: Math.floor(ort.z) + 0.5 };
            }
        }
    } catch (e) { /* unbekannter Boden */ }
    return null;
}

export function verbrauche(spieler) {
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
        console.warn(`Boss, Gegenstand verbrauchen: ${e}`);
    }
}

const zuletzt = new Map();
// Ruht dieser Gegenstand bei diesem Spieler noch? Sonst jetzt merken.
export function ruht(spieler, was, dauer) {
    const schluessel = `${spieler.id}:${was}`;
    const jetzt = system.currentTick;
    if (jetzt - (zuletzt.get(schluessel) ?? -dauer) < dauer) return true;
    zuletzt.set(schluessel, jetzt);
    return false;
}

export function beuteListe(liste, zufall = Math.random) {
    const aus = [];
    for (const [name, lo, hi, chance] of liste) {
        if (zufall() >= chance) continue;
        aus.push([name, lo + Math.floor(zufall() * (hi - lo + 1))]);
    }
    return aus;
}

// Der Erste bekommt alles, jeder weitere Mitkaempfer seinen Anteil.
export function legeBeute(dimension, ort, teilnehmer, beute, anteil, zufall = Math.random) {
    const stapel = beuteListe(beute, zufall);
    for (let i = 1; i < Math.max(1, teilnehmer); i++) stapel.push(...beuteListe(anteil, zufall));
    stapel.forEach(([name, anzahl], i) => {
        const w = i * 0.9;
        try {
            dimension.spawnItem(new ItemStack(name, anzahl), { x: ort.x + Math.cos(w) * 0.8, y: ort.y + 0.6, z: ort.z + Math.sin(w) * 0.8 });
        } catch (e) {
            console.warn(`Boss, Beute ${name}: ${e}`);
        }
    });
    return stapel;
}

// Bei einem Wechsel fuellt sich das Leben von laden_von bis laden_bis.
export function ladeStand(t, d) {
    return Math.max(0, Math.min(1, (t - d.laden_von) / (d.laden_bis - d.laden_von)));
}

// ------------------------------------------------------------ Der Kampf

/**
 * Baut den Kampf eines Bosses. art:
 *   typ, name2 (Name in Phase zwei - daran erkennt die Bossleiste den
 *   Rahmen), angriffe (Zeiten aus *_daten.js), leben (je Spielerzahl),
 *   mehrSpieler, letzteKraft, beute, anteil, schonen (Familien, die seine
 *   Schlaege nicht treffen), pause {1: [lo, hi], 2: [lo, hi]}, abklingen,
 *   schritte {angriff: (z, a, t) => ...}, waehle(z, ziel, weite) -> Name,
 *   wechsel(z, a, t) (Bilder und Toene beim Aufladen; Leben und Schutz
 *   macht der Kern), phaseZwei(z) (was im Augenblick des Wechsels
 *   geschieht), abschied(z, a, t), auftritt(z, a, t), titel (Auftritt).
 */
export function bossKampf(art) {
    const kaempfe = new Map();
    const A = art.angriffe;

    function staerkeFuer(anzahl) {
        const n = Math.max(1, Math.min(art.mehrSpieler, anzahl));
        return { n, leben: art.leben[n], faktor: 1 + 0.15 * (n - 1) };
    }

    function faktorVon(z) {
        return staerkeFuer(z.n ?? 1).faktor * (z.phase === 2 ? 1.2 : 1);
    }

    function zustandVon(boss) {
        let z = kaempfe.get(boss.id);
        if (!z) {
            let n = 1;
            try { n = boss.getDynamicProperty("fynn:boss_spieler") ?? 1; } catch (e) { /* neu */ }
            let phase = 1;
            try { phase = boss.getProperty("fynn:phase") ?? 1; } catch (e) { /* neu */ }
            z = { boss, n, phase, aktion: null, pause: system.currentTick + 40, abkling: {},
                teilnehmer: new Set(), gefolge: [], besiegt: false, faktor: 1, merk: {} };
            kaempfe.set(boss.id, z);
        }
        z.boss = boss;
        z.faktor = faktorVon(z);
        return z;
    }

    function starte(z, name, extra = {}) {
        const a = A[name];
        z.aktion = { name, t: 0, laenge: a.laenge, ...extra };
        try { z.boss.setProperty("fynn:angriff", a.nr); } catch (e) { console.warn(`Boss, Angriff ${name}: ${e}`); }
        ereignis(z.boss, "fynn:angriff_beginn");
        if (!art.beweglich?.includes(name)) {
            try { z.boss.addEffect("slowness", a.laenge + 4, { amplifier: 20, showParticles: false }); } catch (e) { /* egal */ }
        }
        z.abkling[name] = system.currentTick + Math.round((art.abklingen?.[name] ?? 0) * (z.phase === 2 ? 0.7 : 1));
    }

    function beende(z) {
        const war = z.aktion?.name;
        z.aktion = null;
        try {
            z.boss.setProperty("fynn:angriff", 0);
            z.boss.removeEffect("slowness");
        } catch (e) { /* weg ist weg */ }
        if (!z.besiegt) ereignis(z.boss, "fynn:angriff_ende");
        const [lo, hi] = art.pause[z.phase] ?? art.pause[1];
        z.pause = system.currentTick + lo + Math.floor(Math.random() * (hi - lo));
        return war;
    }

    function treffe(z, ziel, schaden, stoss, hoch = 0.4) {
        try {
            ziel.applyDamage(Math.round(schaden * z.faktor), { cause: "entityAttack", damagingEntity: z.boss });
            if (stoss) ziel.applyKnockback({ x: stoss.x, z: stoss.z }, hoch);
        } catch (e) { /* ein Ziel, das gerade verschwindet */ }
    }

    function zielVon(z) {
        let ziel;
        try { ziel = z.boss.target; } catch (e) { ziel = undefined; }
        if (gueltig(ziel) && abstand(ziel.location, z.boss.location) <= 32) return ziel;
        let bester = null;
        for (const s of spielerBei(z.boss, 32)) {
            if (!bester || abstand(s.location, z.boss.location) < abstand(bester.location, z.boss.location)) bester = s;
        }
        return bester;
    }

    function bereit(z, name, jetzt = system.currentTick) {
        return (z.abkling[name] ?? 0) <= jetzt;
    }

    function gefolgeZahl(z) {
        z.gefolge = z.gefolge.filter((w) => gueltig(w));
        return z.gefolge.length;
    }

    // Ruft Gefolge an Orte um den Boss, hoechstens bis max lebende.
    function rufe(z, typ, anzahl, max, weite = 3) {
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        const n = Math.min(anzahl, Math.max(0, max - gefolgeZahl(z)));
        const neu = [];
        for (let i = 0; i < n; i++) {
            const w = (i / Math.max(1, n)) * Math.PI * 2 + 0.6;
            const p = { x: ort.x + Math.cos(w) * weite, y: ort.y, z: ort.z + Math.sin(w) * weite };
            try {
                const g = dim.spawnEntity(typeof typ === "function" ? typ(i) : typ, p);
                g.addTag("boss_gefolge");
                z.gefolge.push(g);
                neu.push(g);
            } catch (e) {
                console.warn(`Boss, Gefolge: ${e}`);
            }
        }
        return neu;
    }

    function waehle(z) {
        const ziel = zielVon(z);
        if (!ziel) {
            z.pause = system.currentTick + 20;
            return;
        }
        const name = art.waehle(z, ziel, abstand(ziel.location, z.boss.location));
        if (!name) {
            z.pause = system.currentTick + 10;
            return;
        }
        schaue(z.boss, ziel.location);
        starte(z, name, { ziel });
    }

    // Der Wechsel: unverwundbar, Leiste leer, dann fuellt sie sich.
    function wechsel(z, a, t) {
        const d = A[art.wechselName];
        const l = leben(z.boss);
        if (t === 0) {
            ereignis(z.boss, "fynn:schutz_an");
            if (l) l.h.setCurrentValue(1);
            titel(spielerBei(z.boss, 48), art.titelWechsel[0], art.titelWechsel[1]);
        }
        if (t === d.laden_von) {
            try { z.boss.nameTag = art.name2; } catch (e) { /* egal */ }
        }
        if (t > d.laden_von && t <= d.laden_bis && l) l.h.setCurrentValue(Math.max(1, Math.round(l.max * ladeStand(t, d))));
        art.wechsel?.(z, a, t);
        if (t === d.umschlag) {
            z.phase = 2;
            z.faktor = faktorVon(z);
            try { z.boss.setProperty("fynn:phase", 2); } catch (e) { /* weiter */ }
            ereignis(z.boss, "fynn:entfesseln");
            art.phaseZwei?.(z);
        }
        if (t === d.laenge - 1) {
            if (l) l.h.setCurrentValue(l.max);
            ereignis(z.boss, "fynn:schutz_aus");
        }
    }

    function besiegen(z) {
        if (z.besiegt) return false;
        z.besiegt = true;
        if (z.aktion) beende(z);
        ereignis(z.boss, "fynn:schutz_an");
        const l = leben(z.boss);
        if (l) l.h.setCurrentValue(1);
        starte(z, art.abschiedName);
        try { z.boss.addEffect("slowness", 400, { amplifier: 20, showParticles: false }); } catch (e) { /* egal */ }
        return true;
    }

    function abschied(z, a, t) {
        const d = A[art.abschiedName];
        const dim = z.boss.dimension;
        const ort = z.boss.location;
        if (t === 0) {
            for (const w of z.gefolge) {
                if (!gueltig(w)) continue;
                funken(dim, art.gefolgeWeg ?? "minecraft:basic_smoke_particle", w.location);
                try { w.remove(); } catch (e) { /* weg */ }
            }
            z.gefolge = [];
        }
        art.abschied?.(z, a, t);
        if (t === d.beute) {
            const nahe = spielerBei(z.boss, 64);
            const anwesend = [...z.teilnehmer].filter((id) => nahe.some((s) => s.id === id)).length;
            legeBeute(dim, ort, anwesend, art.beute, art.anteil);
            titel(nahe, "§6Sieg", art.titelSieg, 60);
        }
        if (t >= d.laenge) {
            kaempfe.delete(z.boss.id);
            try { z.boss.remove(); } catch (e) { /* weg */ }
            return true;
        }
        return false;
    }

    function auftritt(z, a, t) {
        if (t === 0) {
            const anzahl = Math.max(1, spielerBei(z.boss, 48).length);
            const s = staerkeFuer(anzahl);
            ereignis(z.boss, `fynn:staerke_${s.n}`);
            try { z.boss.setDynamicProperty("fynn:boss_spieler", s.n); } catch (e) { /* egal */ }
            z.n = s.n;
            z.faktor = faktorVon(z);
            titel(spielerBei(z.boss, 48), art.titelAuftritt[0],
                z.n > 1 ? `${art.titelAuftritt[1]} §8- §f${z.n} Herausforderer` : art.titelAuftritt[1], 50);
        }
        art.auftritt?.(z, a, t);
        if (t === A[art.auftrittName].bereit) ereignis(z.boss, "fynn:auftritt_fertig");
    }

    function takt(z) {
        const boss = z.boss;
        if (!gueltig(boss)) return;
        if (z.aktion?.name === art.abschiedName) {
            z.aktion.t += 1;
            abschied(z, z.aktion, z.aktion.t);
            return;
        }
        const l = leben(boss);
        // Leer: in Phase eins der Wechsel, in Phase zwei der Abschied.
        if (l && !z.besiegt && l.jetzt <= art.letzteKraft + 0.5 && z.aktion?.name !== art.wechselName) {
            if (z.phase === 1) {
                if (z.aktion) beende(z);
                starte(z, art.wechselName);
            } else {
                besiegen(z);
                abschied(z, z.aktion, 0);
                return;
            }
        }
        if (z.aktion) {
            const a = z.aktion;
            const schritt = a.name === art.wechselName ? wechsel
                : a.name === art.auftrittName ? auftritt : art.schritte[a.name];
            try {
                if (schritt) schritt(z, a, a.t);
            } catch (e) {
                console.warn(`Boss, ${a.name}: ${e}`);
            }
            if (z.aktion === a) {
                a.t += 1;
                if (a.t > a.laenge) beende(z);
            }
        } else if (system.currentTick >= z.pause) {
            waehle(z);
        }
        art.immer?.(z);
    }

    const kampf = { kaempfe, staerkeFuer, zustandVon, starte, beende, treffe, bereit, rufe, gefolgeZahl,
        besiegen, takt, zielVon };

    system.runInterval(() => {
        for (const z of [...kaempfe.values()]) {
            try { takt(z); } catch (e) { console.warn(`Boss ${art.typ}, Takt: ${e}`); }
        }
    }, 1);

    // Nach dem Neuladen: Bosse, die schon da sind, wieder aufnehmen.
    system.runInterval(() => {
        for (const id of ["minecraft:overworld", "minecraft:nether", "minecraft:the_end"]) {
            let wesen = [];
            try { wesen = world.getDimension(id).getEntities({ type: art.typ }); } catch (e) { continue; }
            for (const boss of wesen) {
                if (kaempfe.has(boss.id)) continue;
                zustandVon(boss);
                try { boss.setProperty("fynn:angriff", 0); } catch (e) { /* egal */ }
                ereignis(boss, "fynn:angriff_ende");
                ereignis(boss, "fynn:schutz_aus");
            }
        }
        for (const [id, z] of kaempfe) if (!gueltig(z.boss)) kaempfe.delete(id);
    }, 60);

    world.afterEvents.entitySpawn.subscribe((e) => {
        try {
            if (e.entity?.typeId !== art.typ) return;
            if (String(e.cause ?? "").toLowerCase() === "loaded") return;
            starte(zustandVon(e.entity), art.auftrittName);
        } catch (fehler) {
            console.warn(`Boss ${art.typ}, Auftritt: ${fehler}`);
        }
    });

    world.afterEvents.entityHurt.subscribe((e) => {
        try {
            if (e.hurtEntity?.typeId !== art.typ) return;
            const z = zustandVon(e.hurtEntity);
            const quelle = e.damageSource?.damagingEntity;
            if (quelle?.typeId === "minecraft:player") z.teilnehmer.add(quelle.id);
            art.getroffen?.(z, e, quelle);
        } catch (fehler) {
            console.warn(`Boss ${art.typ}, Treffer: ${fehler}`);
        }
    });

    world.afterEvents.entityDie.subscribe((e) => {
        try {
            if (e.deadEntity?.typeId !== art.typ) return;
            const z = kaempfe.get(e.deadEntity.id);
            if (!z) return;
            for (const w of z.gefolge) if (gueltig(w)) try { w.remove(); } catch (f) { /* weg */ }
            kaempfe.delete(e.deadEntity.id);
        } catch (fehler) {
            console.warn(`Boss ${art.typ}, Tod: ${fehler}`);
        }
    });

    return kampf;
}
