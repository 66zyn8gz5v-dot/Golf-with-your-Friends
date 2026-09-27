// Das Buch der Faehigkeiten: Mit Leveln wird der Spieler staerker.
//
// Fynn (4.71): Grundfaehigkeiten fuer alle - Ruestung, Angriff, Agility,
// Mining - und zwei eigene fuer jede Rolle, bezahlt mit Minecrafts Leveln.
//
// Fynn (4.72): "Ich haette gerne, dass ich die einzelnen Punkte bis 50
// leveln kann. Und dass ich zum Beispiel bei Level 10 ein insgesamtes
// Upgrade kriege. Das erste Level kostet ein Level, das zweite zwei, das
// fuenfte fuenf. Beim Mining, dass ich schneller abbauen kann oder
// Obsidian schnell. Beim Angriff, dass ich Herzen wiederkriege, wenn ich
// Schaden mache. Bei Schild mehr Herzen, weniger Schaden. Die
// Rollenfaehigkeiten eher bis 25." Dazu verlangt jede Waffe, jedes Werkzeug
// und jede Ruestung bestimmte Werte (anforderungen.js).
//
// Also: Jede Stufe bringt ein kleines Stueck (z. B. 1 % mehr Schaden), und
// alle zehn Stufen - bei den Rollenfaehigkeiten an festen Stellen - kommt
// ein grosses Upgrade dazu (MEILENSTEINE). Gespeichert wird jede Stufe am
// Spieler (fynn:fk_<name>); sie ueberlebt Tod und Neustart.

import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { ROLLEN, gibKraft, hinweis, rolleVon } from "./rollen.js";
import { DOLCHE, BOEGEN, STAEBE, waffeInDerHand } from "./waffenarten.js";
import { UEBERSICHT, WERTNAMEN, anforderungFuer, istWerkzeug } from "./anforderungen.js";

export const BUCH = "fynn:heldenbuch";

const prozent = (x) => `${Math.round(x * 10) / 10}`.replace(".", ",");

// Jede Faehigkeit: was die Stufen stetig bringen (text) und die grossen
// Upgrades (meilensteine) - so steht es im Buch.
export const GRUND = [
    {
        id: "ruestung", name: "Rüstung", farbe: "§7", max: 50, bild: "textures/items/iron_chestplate",
        text: (r) => `${prozent(0.6 * r)} % weniger Schaden`,
        meilensteine: [
            { ab: 10, text: "+2 Herzen" },
            { ab: 20, text: "+2 Herzen (zusammen 4)" },
            { ab: 30, text: "Dornen: wer dich schlägt, bekommt ein Fünftel zurück" },
            { ab: 40, text: "+2 Herzen (zusammen 6)" },
            { ab: 50, text: "Widerstand I für immer" },
        ],
    },
    {
        id: "angriff", name: "Angriff", farbe: "§c", max: 50, bild: "textures/items/iron_sword",
        text: (r) => `+${r} % Schaden mit jeder Waffe`,
        meilensteine: [
            { ab: 10, text: "Lebensraub: 10 % des Schadens kommen als Leben zurück" },
            { ab: 20, text: "Kritisch: jeder zehnte Treffer macht die Hälfte mehr" },
            { ab: 30, text: "Lebensraub 20 %" },
            { ab: 40, text: "Stärke I für immer" },
            { ab: 50, text: "Lebensraub 25 %, jeder fünfte Treffer kritisch" },
        ],
    },
    {
        id: "agility", name: "Agility", farbe: "§a", max: 50, bild: "textures/items/feather",
        text: (r) => `${2 * r} % weniger Fallschaden`,
        meilensteine: [
            { ab: 10, text: "Tempo I für immer" },
            { ab: 20, text: "Sprungkraft I für immer" },
            { ab: 30, text: "Ausweichen: jeder zehnte Treffer geht daneben" },
            { ab: 40, text: "Tempo II für immer" },
            { ab: 50, text: "Ausweichen bei jedem fünften Treffer, kein Fallschaden" },
        ],
    },
    {
        id: "mining", name: "Mining", farbe: "§6", max: 50, bild: "textures/items/iron_pickaxe",
        text: (r) => `${prozent(1.5 * r)} % Chance auf doppeltes Erz`,
        meilensteine: [
            { ab: 10, text: "Eile I für immer" },
            { ab: 20, text: "Obsidianbrecher: Obsidian mit einem Schlag der Diamantpicke" },
            { ab: 30, text: "Eile II für immer" },
            { ab: 40, text: "Erzsucher: in Stein steckt manchmal ein Erz" },
            { ab: 50, text: "Eile III für immer" },
        ],
    },
];

export const ROLLENFAEHIGKEITEN = {
    ritter: [
        {
            id: "wirbelsturm", name: "Wirbelsturm", farbe: "§6", max: 25, bild: "textures/items/ritterhelm",
            text: (r) => `Wirbelschlag +${4 * r} % Schaden, +${prozent(0.06 * r)} Blöcke Reichweite`,
            meilensteine: [
                { ab: 10, text: "Wirbelschlag und Erdbeben kosten 10 Ausdauer weniger" },
                { ab: 20, text: "… 20 Ausdauer weniger" },
                { ab: 25, text: "Doppelwirbel: ein zweiter Wirbel folgt" },
            ],
        },
        {
            id: "bollwerk", name: "Bollwerk", farbe: "§6", max: 25, bild: "textures/items/ritterbrustpanzer",
            text: (r) => `Unter 40 % Leben ${prozent(1.6 * r)} % weniger Schaden`,
            meilensteine: [
                { ab: 10, text: "Bei wenig Leben Tempo I zum Rückzug" },
                { ab: 20, text: "+2 Herzen für immer" },
                { ab: 25, text: "Bei wenig Leben Regeneration" },
            ],
        },
    ],
    magier: [
        {
            id: "feuerkraft", name: "Feuerkraft", farbe: "§9", max: 25, bild: "textures/items/feuerstab_2",
            text: (r) => `Feuerball und Frostkugel +${3 * r} % stärker, ${5 + Math.floor(r / 5)} s Brand`,
            meilensteine: [
                { ab: 10, text: "Jeder Ball kostet 5 Mana weniger" },
                { ab: 20, text: "… 10 Mana weniger" },
                { ab: 25, text: "Glutring: um den Einschlag brennt oder friert alles" },
            ],
        },
        {
            id: "manaquelle", name: "Manaquelle", farbe: "§9", max: 25, bild: "textures/items/magierhut",
            text: (r) => `Mana kommt um ${Math.floor(r / 5)} schneller wieder`,
            meilensteine: [
                { ab: 5, text: "je fünf Stufen ein Punkt Mana mehr pro halbe Sekunde" },
                { ab: 25, text: "Schläge mit dem Stab geben 5 Mana" },
            ],
        },
    ],
    bogenschuetze: [
        {
            id: "pfeilregen", name: "Pfeilregen", farbe: "§a", max: 25, bild: "textures/items/bow_standby",
            text: (r) => `Pfeilhagel mit ${5 + Math.floor(r / 5)} Pfeilen`,
            meilensteine: [
                { ab: 10, text: "Pfeilhagel kostet 10 Fokus weniger" },
                { ab: 20, text: "… 20 Fokus weniger" },
                { ab: 25, text: "Brennende Pfeile im Hagel" },
            ],
        },
        {
            id: "volltreffer", name: "Volltreffer", farbe: "§a", max: 25, bild: "textures/items/arrow",
            text: (r) => `${prozent(1.2 * r)} % Chance, dass ein Pfeil doppelt trifft`,
            meilensteine: [
                { ab: 10, text: "Volltreffer verlangsamen" },
                { ab: 20, text: "Volltreffer treffen dreifach" },
                { ab: 25, text: "Volltreffer betäuben kurz" },
            ],
        },
    ],
    assassine: [
        {
            id: "schattenschritt", name: "Schattenschritt", farbe: "§c", max: 25, bild: "textures/items/eisendolche",
            text: (r) => `Schattensprung ${prozent(10 + 0.4 * r)} Blöcke weit, Hinterhalt +${3 * r} %`,
            meilensteine: [
                { ab: 10, text: "Schattensprung kostet 10 Schatten weniger" },
                { ab: 20, text: "… 20 Schatten weniger" },
                { ab: 25, text: "Nach dem Hinterhalt drei Sekunden Tempo II" },
            ],
        },
        {
            id: "giftklinge", name: "Giftklinge", farbe: "§c", max: 25, bild: "textures/items/assassinenkapuze",
            text: (r) => (r === 0 ? "Dolche vergiften nicht" : `Dolche vergiften ${prozent(Math.max(1, 0.2 * r))} s lang`),
            meilensteine: [
                { ab: 10, text: "Gift II" },
                { ab: 20, text: "Dazu Schwäche" },
                { ab: 25, text: "Das Gift springt auf einen zweiten Gegner über" },
            ],
        },
    ],
};

const ALLE = [...GRUND, ...Object.values(ROLLENFAEHIGKEITEN).flat()];
const ROLLE_VON = Object.fromEntries(Object.entries(ROLLENFAEHIGKEITEN)
    .flatMap(([rolle, liste]) => liste.map((f) => [f.id, rolle])));

export function faehigkeit(id) {
    return ALLE.find((f) => f.id === id);
}

/** Die gespeicherte Stufe, gleich welche Rolle man gerade hat. */
export function gespeichert(spieler, id) {
    try {
        return spieler.getDynamicProperty(`fynn:fk_${id}`) ?? 0;
    } catch (e) {
        return 0;
    }
}

/** Die Stufe, die gerade wirkt: Rollenfaehigkeiten nur mit ihrer Rolle. */
export function rang(spieler, id) {
    const rolle = ROLLE_VON[id];
    if (rolle && rolleVon(spieler) !== rolle) return 0;
    return gespeichert(spieler, id);
}

/** Was die naechste Stufe kostet: Stufe n kostet n Level (Fynns Regel). */
export function kosten(stufe) {
    return stufe + 1;
}

/** Was mehrere Stufen auf einmal kosten. */
export function kostenFuer(stufe, anzahl) {
    let summe = 0;
    for (let i = 0; i < anzahl; i++) summe += kosten(stufe + i);
    return summe;
}

function istKreativSpieler(spieler) {
    try {
        return String(spieler.getGameMode?.()).toLowerCase() === "creative";
    } catch (e) {
        return false;
    }
}

export function ausbauen(spieler, id, anzahl = 1) {
    const f = faehigkeit(id);
    if (!f) return { ok: false, grund: "unbekannt" };
    if (ROLLE_VON[id] && rolleVon(spieler) !== ROLLE_VON[id]) return { ok: false, grund: "rolle" };
    const jetzt = gespeichert(spieler, id);
    const schritte = Math.min(anzahl, f.max - jetzt);
    if (schritte <= 0) return { ok: false, grund: "voll" };
    const preis = kostenFuer(jetzt, schritte);
    const kreativ = istKreativSpieler(spieler);
    if (!kreativ && (spieler.level ?? 0) < preis) return { ok: false, grund: "level", preis };
    if (!kreativ) spieler.addLevels(-preis);
    spieler.setDynamicProperty(`fynn:fk_${id}`, jetzt + schritte);
    wirken(spieler);
    const neu = f.meilensteine.filter((m) => m.ab > jetzt && m.ab <= jetzt + schritte).map((m) => m.text);
    return { ok: true, stufe: jetzt + schritte, preis, neu };
}

// ------------------------------------------------------------ Anforderungen

/** Was fehlt, um einen Gegenstand zu benutzen - z. B. ["Mining 35 (du: 12)"]. */
export function fehlendeWerte(spieler, typ) {
    const a = anforderungFuer(typ);
    if (!a || istKreativSpieler(spieler)) return [];
    const fehlt = [];
    for (const [wert, noetig] of Object.entries(a)) {
        const hat = gespeichert(spieler, wert);
        if (hat < noetig) fehlt.push(`${WERTNAMEN[wert]} ${noetig} (du: ${hat})`);
    }
    return fehlt;
}

const RUESTUNGSPLAETZE = ["Head", "Chest", "Legs", "Feet"];
const zuletztGemeldet = new Map();

/**
 * Wer etwas haelt oder traegt, das er noch nicht beherrscht: Mit der Waffe
 * trifft er nicht (Schwaeche), mit dem Werkzeug baut er nicht ab
 * (Abbaulaehmung), in der Ruestung ist er schwerfaellig (Langsamkeit). So
 * zeigt es auch Minecraft selbst an - mit den Symbolen der Wirkungen.
 */
export function pruefeAusruestung(spieler) {
    if (istKreativSpieler(spieler)) return [];
    const hand = waffeInDerHand(spieler);
    const fehltHand = fehlendeWerte(spieler, hand);
    if (fehltHand.length) {
        spieler.addEffect("weakness", 15, { amplifier: 9, showParticles: false });
        if (istWerkzeug(hand)) spieler.addEffect("mining_fatigue", 15, { amplifier: 4, showParticles: false });
    }
    let fehltRuestung = [];
    try {
        const aus = spieler.getComponent("minecraft:equippable");
        for (const platz of RUESTUNGSPLAETZE) {
            const f = fehlendeWerte(spieler, aus?.getEquipment(platz)?.typeId);
            if (f.length) fehltRuestung = f;
        }
    } catch (e) { /* ohne Ruestung */ }
    if (fehltRuestung.length) spieler.addEffect("slowness", 15, { amplifier: 1, showParticles: false });
    // Einmal sagen, was fehlt - nicht alle halbe Sekunde.
    const alles = [...fehltHand, ...fehltRuestung];
    const schluessel = `${hand}|${alles.join()}`;
    if (alles.length && zuletztGemeldet.get(spieler.id) !== schluessel) {
        const was = fehltHand.length ? "Dafür" : "Für diese Rüstung";
        hinweis(spieler, `§c${was} brauchst du ${(fehltHand.length ? fehltHand : fehltRuestung).join(", ")}.`, 80);
    }
    zuletztGemeldet.set(spieler.id, alles.length ? schluessel : "");
    return alles;
}

// Boegen, Dreizack, Wurfsterne: ohne die Werte gar nicht erst spannen.
world.beforeEvents.itemUse.subscribe((e) => {
    try {
        const fehlt = fehlendeWerte(e.source, e.itemStack?.typeId);
        if (!fehlt.length) return;
        e.cancel = true;
        system.run(() => hinweis(e.source, `§cDafür brauchst du ${fehlt.join(", ")}.`, 80));
    } catch (fehler) { /* egal */ }
});

// ------------------------------------------------------------ Wirkungen

/** Dauerhafte Wirkungen aus den Stufen: [Wirkung, Staerke]. */
export function wirkungenFuer(spieler) {
    const liste = [];
    const ruestung = gespeichert(spieler, "ruestung");
    let herzen = (ruestung >= 10 ? 2 : 0) + (ruestung >= 20 ? 2 : 0) + (ruestung >= 40 ? 2 : 0);
    if (rang(spieler, "bollwerk") >= 20) herzen += 2;
    // Stufe 0 der Wirkung gibt zwei Herzen, jede weitere zwei mehr.
    if (herzen > 0) liste.push(["health_boost", herzen / 2 - 1]);
    if (ruestung >= 50) liste.push(["resistance", 0]);
    if (gespeichert(spieler, "angriff") >= 40) liste.push(["strength", 0]);
    const agility = gespeichert(spieler, "agility");
    if (agility >= 10) liste.push(["speed", agility >= 40 ? 1 : 0]);
    if (agility >= 20) liste.push(["jump_boost", 0]);
    const mining = gespeichert(spieler, "mining");
    if (mining >= 10) liste.push(["haste", mining >= 50 ? 2 : mining >= 30 ? 1 : 0]);
    return liste;
}

// Lang, damit nichts staendig neu gesetzt wird - bei den Extra-Herzen
// koennte das sonst am Leben ruetteln. Aufgefrischt wird erst, wenn weniger
// als eine Minute uebrig ist oder die Staerke nicht stimmt (neue Stufe,
// Milch getrunken, gestorben, eine Waffe hat kurz schwaecheres Tempo gesetzt).
const DAUER = 20 * 60 * 20;
const AUFFRISCHEN = 20 * 60;

export function wirken(spieler) {
    for (const [id, staerke] of wirkungenFuer(spieler)) {
        let jetzt;
        try { jetzt = spieler.getEffect?.(id); } catch (e) { jetzt = undefined; }
        if (jetzt && jetzt.amplifier === staerke && jetzt.duration > AUFFRISCHEN) continue;
        try {
            if (jetzt && jetzt.amplifier !== staerke) spieler.removeEffect(id);
            spieler.addEffect(id, DAUER, { amplifier: staerke, showParticles: false });
        } catch (e) { /* egal */ }
    }
}

/** Mana aus der Manaquelle, fuer rollen.js: nur mit einem Stab in der Hand. */
export function kraftBonus(spieler, art) {
    if (art !== "magier") return 0;
    return Math.floor(rang(spieler, "manaquelle") / 5);
}

// Die erste Faehigkeit jeder Rolle macht ihre Angriffe billiger.
const ERSTE = { ritter: "wirbelsturm", magier: "feuerkraft", bogenschuetze: "pfeilregen", assassine: "schattenschritt" };

export function kostenRabatt(spieler, art) {
    const r = rang(spieler, ERSTE[art] ?? "");
    const stufe = r >= 20 ? 2 : r >= 10 ? 1 : 0;
    return stufe * (art === "magier" ? 5 : 10);
}

// ------------------------------------------------------------ Kampf

// Bosse nie unter ihre letzte Kraft druecken: Den Rest regelt ihr
// Kampfskript (Phasenwechsel, Abschied).
const BOSSE = new Set(["fynn:roland", "fynn:rabenfuerst", "fynn:frostmammut"]);
const LETZTE_KRAFT = 30;

function lebenVon(wesen) {
    try {
        const h = wesen.getComponent?.("minecraft:health");
        return h ? { h, jetzt: h.currentValue, max: h.effectiveMax } : null;
    } catch (e) {
        return null;
    }
}

// Zusatzschaden setzt das Leben direkt herab: Ein zweiter Treffer im selben
// Augenblick wuerde von Minecraft verschluckt (kurze Unverwundbarkeit nach
// jedem Treffer). Er toetet nie - den letzten Schlag macht die Waffe.
export function zusatzSchaden(ziel, menge) {
    const l = lebenVon(ziel);
    if (!l || menge <= 0) return 0;
    const boden = BOSSE.has(ziel.typeId) ? LETZTE_KRAFT + 1 : 1;
    const neu = Math.max(boden, l.jetzt - menge);
    if (neu >= l.jetzt) return 0;
    try { l.h.setCurrentValue(neu); } catch (e) { return 0; }
    return l.jetzt - neu;
}

function heile(wesen, menge) {
    const l = lebenVon(wesen);
    if (!l || menge <= 0 || l.jetzt <= 0) return;
    try { l.h.setCurrentValue(Math.min(l.max, l.jetzt + menge)); } catch (e) { /* egal */ }
}

function wirkung(wesen, id, dauer, staerke = 0) {
    try { wesen.addEffect(id, dauer, { amplifier: staerke }); } catch (e) { /* egal */ }
}

function funke(wesen) {
    try {
        wesen.dimension.spawnParticle("minecraft:critical_hit_emitter",
            { x: wesen.location.x, y: wesen.location.y + 1, z: wesen.location.z });
    } catch (e) { /* egal */ }
}

export function lebensraub(angriff) {
    return angriff >= 50 ? 0.25 : angriff >= 30 ? 0.2 : angriff >= 10 ? 0.1 : 0;
}

export function kritischChance(angriff) {
    return angriff >= 50 ? 0.2 : angriff >= 20 ? 0.1 : 0;
}

export function ausweichChance(agility) {
    return agility >= 50 ? 0.2 : agility >= 30 ? 0.1 : 0;
}

// Waehrend wir selbst Schaden austeilen, nicht noch einmal zuschlagen.
let imZusatz = false;

/** Was ein Treffer ausloest - fuer entityHurt, auch aus den Proben. */
export function treffer(e, zufall = Math.random) {
    const ziel = e.hurtEntity;
    const quelle = e.damageSource?.damagingEntity;
    const ursache = e.damageSource?.cause;
    const schaden = e.damage ?? 0;
    if (schaden <= 0 || imZusatz) return;

    // ---- Getroffen: Ruestung, Bollwerk, Agility.
    if (ziel?.typeId === "minecraft:player") {
        const l = lebenVon(ziel);
        const wenig = l && l.max > 0 && l.jetzt / l.max < 0.4;
        let weniger = 0.006 * gespeichert(ziel, "ruestung");
        if (wenig) {
            const b = rang(ziel, "bollwerk");
            weniger += 0.016 * b;
            if (b >= 10) wirkung(ziel, "speed", 60);
            if (b >= 25) wirkung(ziel, "regeneration", 100);
        }
        if (ursache === "fall") weniger += 0.02 * gespeichert(ziel, "agility");
        else if (zufall() < ausweichChance(gespeichert(ziel, "agility"))) weniger = 1;
        heile(ziel, schaden * Math.min(1, weniger));
        // Dornen: wer zuschlaegt, bekommt ein Fuenftel zurueck.
        if (gespeichert(ziel, "ruestung") >= 30 && quelle && quelle.typeId !== "minecraft:player"
            && ursache === "entityAttack") {
            imZusatz = true;
            try { zusatzSchaden(quelle, schaden * 0.2); } finally { imZusatz = false; }
        }
        return;
    }

    // ---- Getroffen von einem Spieler: Angriff, Volltreffer, Gift, Mana.
    if (quelle?.typeId !== "minecraft:player") return;
    const angriff = gespeichert(quelle, "angriff");
    const waffe = waffeInDerHand(quelle);
    let extra = schaden * 0.01 * angriff;
    if (zufall() < kritischChance(angriff)) {
        extra += schaden * 0.5;
        funke(ziel);
    }
    const voll = rang(quelle, "volltreffer");
    if (ursache === "projectile" && BOEGEN.has(waffe) && zufall() < 0.012 * voll) {
        extra += schaden * (voll >= 20 ? 2 : 1);
        funke(ziel);
        if (voll >= 25) wirkung(ziel, "slowness", 40, 4);
        else if (voll >= 10) wirkung(ziel, "slowness", 60, 1);
    }
    imZusatz = true;
    let angerichtet = 0;
    try { angerichtet = zusatzSchaden(ziel, extra); } finally { imZusatz = false; }
    // Lebensraub: ein Teil des Schadens kommt als Leben zurueck.
    heile(quelle, (schaden + angerichtet) * lebensraub(angriff));

    const gift = rang(quelle, "giftklinge");
    if (gift > 0 && ursache === "entityAttack" && DOLCHE.has(waffe)) {
        const dauer = Math.max(20, 4 * gift);
        wirkung(ziel, "poison", dauer, gift >= 10 ? 1 : 0);
        if (gift >= 20) wirkung(ziel, "weakness", 60);
        if (gift >= 25) {
            try {
                const naechster = ziel.dimension.getEntities({ location: ziel.location, maxDistance: 4,
                    families: ["monster"] }).find((w) => w.id !== ziel.id);
                if (naechster) wirkung(naechster, "poison", dauer, 1);
            } catch (f) { /* egal */ }
        }
    }
    if (ursache === "entityAttack" && STAEBE[waffe] && rang(quelle, "manaquelle") >= 25) gibKraft(quelle, 5);
}

world.afterEvents.entityHurt.subscribe((e) => {
    try { treffer(e); } catch (fehler) { console.warn(`Faehigkeiten, Treffer: ${fehler}`); }
});

// ------------------------------------------------------------ Mining

// Doppeltes Erz: was das Erz sonst fallen laesst, noch einmal.
const ERZE = {
    coal_ore: "coal", deepslate_coal_ore: "coal", iron_ore: "raw_iron", deepslate_iron_ore: "raw_iron",
    copper_ore: "raw_copper", deepslate_copper_ore: "raw_copper", gold_ore: "raw_gold",
    deepslate_gold_ore: "raw_gold", nether_gold_ore: "gold_nugget", diamond_ore: "diamond",
    deepslate_diamond_ore: "diamond", emerald_ore: "emerald", deepslate_emerald_ore: "emerald",
    lapis_ore: "lapis_lazuli", deepslate_lapis_ore: "lapis_lazuli", redstone_ore: "redstone",
    deepslate_redstone_ore: "redstone", lit_redstone_ore: "redstone", lit_deepslate_redstone_ore: "redstone",
    quartz_ore: "quartz", ancient_debris: "ancient_debris",
};

function mitBehutsamkeit(werkzeug) {
    try {
        return !!werkzeug?.getComponent?.("minecraft:enchantable")?.getEnchantment?.("silk_touch");
    } catch (e) {
        return false;
    }
}

export function doppeltesErz(spieler, blockTyp, werkzeug, zufall = Math.random) {
    const beute = ERZE[String(blockTyp ?? "").replace("minecraft:", "")];
    if (!beute || mitBehutsamkeit(werkzeug)) return null;
    if (zufall() >= 0.015 * gespeichert(spieler, "mining")) return null;
    return `minecraft:${beute}`;
}

// Erzsucher (Mining 40): in Stein steckt manchmal ein Erz.
const FUNDE = [["coal", 40], ["raw_iron", 25], ["raw_copper", 15], ["raw_gold", 8], ["redstone", 6],
    ["lapis_lazuli", 4], ["diamond", 2]];
const STEIN = new Set(["stone", "deepslate", "cobbled_deepslate", "tuff", "granite", "diorite", "andesite"]);

export function erzsucher(spieler, blockTyp, zufall = Math.random) {
    if (gespeichert(spieler, "mining") < 40) return null;
    if (!STEIN.has(String(blockTyp ?? "").replace("minecraft:", ""))) return null;
    if (zufall() >= 0.02) return null;
    let wurf = zufall() * FUNDE.reduce((s, [, g]) => s + g, 0);
    for (const [name, gewicht] of FUNDE) {
        if ((wurf -= gewicht) < 0) return `minecraft:${name}`;
    }
    return "minecraft:coal";
}

world.afterEvents.playerBreakBlock.subscribe((e) => {
    try {
        if (istKreativSpieler(e.player)) return;
        const typ = e.brokenBlockPermutation?.type?.id;
        const o = e.block.location;
        for (const beute of [doppeltesErz(e.player, typ, e.itemStackBeforeBreak), erzsucher(e.player, typ)]) {
            if (beute) e.dimension.spawnItem(new ItemStack(beute, 1), { x: o.x + 0.5, y: o.y + 0.5, z: o.z + 0.5 });
        }
    } catch (fehler) {
        console.warn(`Faehigkeiten, Mining: ${fehler}`);
    }
});

// Obsidianbrecher (Mining 20): ein Schlag mit der Diamant- oder
// Netheritpicke, und der Obsidian ist ab.
const OBSIDIAN = new Set(["minecraft:obsidian", "minecraft:crying_obsidian"]);
const HARTE_PICKEN = new Set(["minecraft:diamond_pickaxe", "minecraft:netherite_pickaxe"]);

export function obsidianBrechen(spieler, block) {
    if (gespeichert(spieler, "mining") < 20 || istKreativSpieler(spieler)) return false;
    const picke = waffeInDerHand(spieler);
    if (!HARTE_PICKEN.has(picke) || fehlendeWerte(spieler, picke).length) return false;
    const typ = block?.typeId;
    if (!OBSIDIAN.has(typ)) return false;
    const o = block.location;
    block.setType("minecraft:air");
    block.dimension.spawnItem(new ItemStack(typ, 1), { x: o.x + 0.5, y: o.y + 0.5, z: o.z + 0.5 });
    try { block.dimension.playSound("dig.stone", o, { volume: 1, pitch: 0.6 }); } catch (e) { /* egal */ }
    return true;
}

world.afterEvents.entityHitBlock.subscribe((e) => {
    try {
        if (e.damagingEntity?.typeId !== "minecraft:player") return;
        obsidianBrechen(e.damagingEntity, e.hitBlock);
    } catch (fehler) {
        console.warn(`Faehigkeiten, Obsidian: ${fehler}`);
    }
});

// ------------------------------------------------------------ Das Buch

function nochmal(antwort, weiter, versuch) {
    // "Beschaeftigt" heisst meist: Das Antippen ist noch nicht vorbei.
    if (antwort.canceled && antwort.cancelationReason === "UserBusy" && versuch < 10) {
        system.runTimeout(() => weiter(versuch + 1), 5);
    }
}

export function liste(spieler) {
    const rolle = rolleVon(spieler);
    return [...GRUND, ...(rolle ? ROLLENFAEHIGKEITEN[rolle] : [])];
}

export function knopfText(spieler, f) {
    const r = gespeichert(spieler, f.id);
    const stand = r >= f.max ? "§2ausgebaut" : `§8nächste: ${kosten(r)} Level`;
    return `${f.farbe}${f.name} §8${r}/${f.max}\n${stand}`;
}

function handText(spieler) {
    const hand = waffeInDerHand(spieler);
    const a = anforderungFuer(hand);
    if (!a) return "";
    const fehlt = fehlendeWerte(spieler, hand);
    const was = Object.entries(a).map(([w, n]) => `${WERTNAMEN[w]} ${n}`).join(", ");
    return `\n\nWas du in der Hand hältst, braucht ${was}: `
        + (fehlt.length ? "§cnoch nicht erreicht§r." : "§2erreicht§r.");
}

export async function zeigeBuch(spieler, versuch = 0) {
    const rolle = rolleVon(spieler);
    const form = new ActionFormData()
        .title("Buch der Fähigkeiten")
        .body(`Deine Level: §a${spieler.level ?? 0}§r\n\n`
            + "Jede Stufe kostet so viele Level, wie sie hoch ist: die erste 1, die fünfte 5. "
            + "Alle zehn Stufen gibt es ein großes Upgrade. Waffen, Werkzeuge und Rüstungen verlangen Stufen - "
            + "wer sie noch nicht hat, trifft nicht, baut nicht ab oder ist in der Rüstung schwerfällig.\n\n"
            + (rolle ? `Als ${ROLLEN[rolle].farbe}${ROLLEN[rolle].name}§r hast du zwei eigene Fähigkeiten (bis Stufe 25).`
                : "§7Wähle am Rollenaltar eine Rolle - dann kommen zwei eigene Fähigkeiten dazu.")
            + handText(spieler));
    const f = liste(spieler);
    for (const x of f) form.button(knopfText(spieler, x), x.bild);
    form.button("§6Was brauche ich wofür?", "textures/items/book_writable");
    const antwort = await form.show(spieler);
    if (antwort.canceled) {
        nochmal(antwort, (v) => zeigeBuch(spieler, v), versuch);
        return;
    }
    if (antwort.selection === f.length) {
        await zeigeUebersicht(spieler);
        return;
    }
    const gewaehlt = f[antwort.selection];
    if (gewaehlt) await zeigeFaehigkeit(spieler, gewaehlt);
}

export async function zeigeUebersicht(spieler, versuch = 0) {
    const form = new ActionFormData().title("Was brauche ich wofür?")
        .body(UEBERSICHT.join("\n\n")).button("§8Zurück");
    const antwort = await form.show(spieler);
    if (antwort.canceled) {
        nochmal(antwort, (v) => zeigeUebersicht(spieler, v), versuch);
        return;
    }
    await zeigeBuch(spieler);
}

export function seitenText(spieler, f) {
    const r = gespeichert(spieler, f.id);
    const ziele = f.meilensteine.map((m) => `${r >= m.ab ? "§2✔" : "§8·"} §7Stufe ${m.ab}: §f${m.text}`);
    return [
        `§7Stufe ${r} von ${f.max}`,
        "",
        `§6Jetzt§r\n${r > 0 ? f.text(r) : "noch nichts"}`,
        "",
        r < f.max ? `§6Stufe ${r + 1}§r\n${f.text(r + 1)}` : "§2Ganz ausgebaut.",
        "",
        "§6Upgrades",
        ...ziele,
        "",
        r < f.max ? `Die nächste Stufe kostet §a${kosten(r)} Level§r - du hast ${spieler.level ?? 0}.` : "",
    ].join("\n");
}

export async function zeigeFaehigkeit(spieler, f, versuch = 0) {
    const r = gespeichert(spieler, f.id);
    const form = new ActionFormData().title(`${f.farbe}${f.name}`).body(seitenText(spieler, f));
    const knoepfe = [];
    if (r < f.max) {
        form.button(`§2Ausbauen\n§8${kosten(r)} Level`);
        knoepfe.push(1);
    }
    if (f.max - r >= 5) {
        form.button(`§2Fünf Stufen ausbauen\n§8${kostenFuer(r, 5)} Level`);
        knoepfe.push(5);
    }
    form.button("§8Zurück");
    const antwort = await form.show(spieler);
    if (antwort.canceled) {
        nochmal(antwort, (v) => zeigeFaehigkeit(spieler, f, v), versuch);
        return;
    }
    const anzahl = knoepfe[antwort.selection];
    if (anzahl) {
        const ergebnis = ausbauen(spieler, f.id, anzahl);
        if (ergebnis.ok) {
            try {
                spieler.dimension.playSound("random.levelup", spieler.location, { volume: 0.7, pitch: 1.3 });
                if (ergebnis.neu.length) {
                    spieler.onScreenDisplay.setTitle(`§6${f.name} ${ergebnis.stufe}`, {
                        subtitle: `§e${ergebnis.neu.join(" · ")}`, fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 15,
                    });
                }
            } catch (e) { /* egal */ }
            hinweis(spieler, `§a${f.name} jetzt Stufe ${ergebnis.stufe}`, 60);
        } else if (ergebnis.grund === "level") {
            hinweis(spieler, `§7Dafür brauchst du ${ergebnis.preis} Level.`, 60);
        }
        await zeigeFaehigkeit(spieler, f);
        return;
    }
    await zeigeBuch(spieler);
}

world.afterEvents.itemUse.subscribe((e) => {
    try {
        if (e.itemStack?.typeId === BUCH) zeigeBuch(e.source);
    } catch (fehler) {
        console.warn(`Faehigkeiten, Buch: ${fehler}`);
    }
});

// ------------------------------------------------------------ Takte

// Die Staerken halten: alle zwei Sekunden nachsehen.
system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try { wirken(spieler); } catch (e) { /* egal */ }
    }
}, 40);

// Was man haelt und traegt: jede halbe Sekunde.
system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try { pruefeAusruestung(spieler); } catch (e) { /* egal */ }
    }
}, 10);

// Das Buch bekommt jeder einmal geschenkt, beim ersten Betreten der Welt
// (oder beim ersten Mal mit dieser Fassung) - sonst weiss niemand davon.
export function schenke(spieler) {
    try {
        if (spieler.getDynamicProperty("fynn:heldenbuch_bekommen")) return false;
        const inv = spieler.getComponent("minecraft:inventory")?.container;
        if (!inv) return false;
        inv.addItem(new ItemStack(BUCH, 1));
        spieler.setDynamicProperty("fynn:heldenbuch_bekommen", true);
        spieler.sendMessage?.("§aDas Buch der Fähigkeiten liegt in deinem Inventar. "
            + "§7Mit deinen Leveln baust du dort Rüstung, Angriff, Agility, Mining und deine Rollenfähigkeiten aus.");
        return true;
    } catch (e) {
        return false;
    }
}

const wartend = new Map();
world.afterEvents.playerSpawn.subscribe((e) => {
    if (e.initialSpawn) wartend.set(e.player.id, { spieler: e.player, ab: system.currentTick + 100 });
});
system.runInterval(() => {
    for (const [id, w] of wartend) {
        if (system.currentTick < w.ab) continue;
        wartend.delete(id);
        schenke(w.spieler);
    }
}, 20);
