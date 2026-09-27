// Das Buch der Faehigkeiten: Mit Leveln wird der Spieler staerker.
//
// Fynn (4.71): "Es gibt ganz normale - Ruestung, Angriff, Agility, Mining -
// als Standard. Und jede Rolle hat noch eine oder zwei einzigartige
// Faehigkeiten, die sich auch ausbauen lassen." Bezahlt wird mit
// Minecrafts Leveln, wie beim Verzaubern (so hat Fynn es gewaehlt): Jede
// Stufe kostet zwei Level mehr als ihre Nummer, die erste also 2, die
// zehnte 11.
//
// Die vier Grundfaehigkeiten hat jeder. Die Rollenfaehigkeiten gehoeren zur
// Rolle vom Altar und staerken die aufgeladenen Angriffe ihrer Waffenart -
// wer die Rolle wechselt, behaelt seine Stufen, sie wirken aber erst
// wieder, wenn er zurueckwechselt.
//
// Gespeichert wird jede Stufe am Spieler (fynn:fk_<name>), sie ueberlebt
// also Tod und Neustart.

import { world, system, ItemStack } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { ROLLEN, hinweis, rolleVon } from "./rollen.js";
import { DOLCHE, BOEGEN, waffeInDerHand } from "./waffenarten.js";

export const BUCH = "fynn:heldenbuch";

// Jede Faehigkeit: was sie jetzt tut (Stufe r) - so steht es im Buch.
export const GRUND = [
    {
        id: "ruestung", name: "Rüstung", farbe: "§7", max: 10, bild: "textures/items/iron_chestplate",
        text: (r) => `${3 * r} % weniger Schaden`
            + (r >= 10 ? ", +4 Herzen" : r >= 5 ? ", +2 Herzen" : ""),
        ziel: "Auf Stufe 5 und 10 je zwei Extra-Herzen.",
    },
    {
        id: "angriff", name: "Angriff", farbe: "§c", max: 10, bild: "textures/items/iron_sword",
        text: (r) => `+${4 * r} % Schaden mit jeder Waffe`,
    },
    {
        id: "agility", name: "Agility", farbe: "§a", max: 10, bild: "textures/items/feather",
        text: (r) => `${10 * r} % weniger Fallschaden`
            + (r >= 7 ? ", Tempo II" : r >= 3 ? ", Tempo I" : ""),
        ziel: "Tempo I ab Stufe 3, Tempo II ab Stufe 7, auf Stufe 10 kein Fallschaden.",
    },
    {
        id: "mining", name: "Mining", farbe: "§6", max: 10, bild: "textures/items/iron_pickaxe",
        text: (r) => `${5 * r} % Chance auf doppeltes Erz`
            + (r >= 9 ? ", Eile III" : r >= 5 ? ", Eile II" : r >= 2 ? ", Eile I" : ""),
        ziel: "Eile I ab Stufe 2, II ab 5, III ab 9.",
    },
];

export const ROLLENFAEHIGKEITEN = {
    ritter: [
        {
            id: "wirbelsturm", name: "Wirbelsturm", farbe: "§6", max: 5, bild: "textures/items/ritterhelm",
            text: (r) => `Wirbelschlag +${20 * r} % Schaden, +${(0.3 * r).toFixed(1).replace(".", ",")} Blöcke Reichweite`,
        },
        {
            id: "bollwerk", name: "Bollwerk", farbe: "§6", max: 5, bild: "textures/items/ritterbrustpanzer",
            text: (r) => `Unter 40 % Leben ${8 * r} % weniger Schaden`,
        },
    ],
    magier: [
        {
            id: "feuerkraft", name: "Feuerkraft", farbe: "§9", max: 5, bild: "textures/items/feuerstab_2",
            text: (r) => `Feuerball und Frostkugel +${12 * r} % stärker, ${5 + r} s Brand`,
        },
        {
            id: "manaquelle", name: "Manaquelle", farbe: "§9", max: 5, bild: "textures/items/magierhut",
            text: (r) => `Mana kommt ${r === 0 ? "wie immer" : `um ${Math.floor((r + 1) / 2)} schneller`} wieder`,
            ziel: "Stufe 1, 3 und 5 bringen je einen Punkt Mana mehr pro halbe Sekunde.",
        },
    ],
    bogenschuetze: [
        {
            id: "pfeilregen", name: "Pfeilregen", farbe: "§a", max: 5, bild: "textures/items/bow_standby",
            text: (r) => `Pfeilhagel mit ${5 + r} Pfeilen`,
        },
        {
            id: "volltreffer", name: "Volltreffer", farbe: "§a", max: 5, bild: "textures/items/arrow",
            text: (r) => `${6 * r} % Chance, dass ein Pfeil doppelt trifft`,
        },
    ],
    assassine: [
        {
            id: "schattenschritt", name: "Schattenschritt", farbe: "§c", max: 5, bild: "textures/items/eisendolche",
            text: (r) => `Schattensprung ${10 + 2 * r} Blöcke weit, Hinterhalt +${15 * r} %`,
        },
        {
            id: "giftklinge", name: "Giftklinge", farbe: "§c", max: 5, bild: "textures/items/assassinenkapuze",
            text: (r) => (r === 0 ? "Dolche vergiften nicht" : `Dolche vergiften ${r} s lang${r >= 5 ? ", stärker" : ""}`),
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

export function kosten(stufe) {
    return stufe + 2;
}

export function ausbauen(spieler, id) {
    const f = faehigkeit(id);
    if (!f) return { ok: false, grund: "unbekannt" };
    if (ROLLE_VON[id] && rolleVon(spieler) !== ROLLE_VON[id]) return { ok: false, grund: "rolle" };
    const jetzt = gespeichert(spieler, id);
    if (jetzt >= f.max) return { ok: false, grund: "voll" };
    const preis = kosten(jetzt);
    const kreativ = istKreativSpieler(spieler);
    if (!kreativ && (spieler.level ?? 0) < preis) return { ok: false, grund: "level", preis };
    if (!kreativ) spieler.addLevels(-preis);
    spieler.setDynamicProperty(`fynn:fk_${id}`, jetzt + 1);
    wirken(spieler);
    return { ok: true, stufe: jetzt + 1, preis };
}

function istKreativSpieler(spieler) {
    try {
        return String(spieler.getGameMode?.()).toLowerCase() === "creative";
    } catch (e) {
        return false;
    }
}

// ------------------------------------------------------------ Wirkungen

/** Dauerhafte Wirkungen aus den Stufen: [Wirkung, Staerke]. */
export function wirkungenFuer(spieler) {
    const liste = [];
    const ruestung = gespeichert(spieler, "ruestung");
    if (ruestung >= 5) liste.push(["health_boost", ruestung >= 10 ? 1 : 0]);
    const agility = gespeichert(spieler, "agility");
    if (agility >= 3) liste.push(["speed", agility >= 7 ? 1 : 0]);
    const mining = gespeichert(spieler, "mining");
    if (mining >= 2) liste.push(["haste", mining >= 9 ? 2 : mining >= 5 ? 1 : 0]);
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
    return Math.floor((rang(spieler, "manaquelle") + 1) / 2);
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

function heile(spieler, menge) {
    const l = lebenVon(spieler);
    if (!l || menge <= 0 || l.jetzt <= 0) return;
    try { l.h.setCurrentValue(Math.min(l.max, l.jetzt + menge)); } catch (e) { /* egal */ }
}

// Waehrend wir selbst Schaden austeilen, nicht noch einmal zuschlagen.
let imZusatz = false;

/** Was ein Treffer ausloest - fuer entityHurt, auch aus den Proben. */
export function treffer(e, zufall = Math.random) {
    const ziel = e.hurtEntity;
    const quelle = e.damageSource?.damagingEntity;
    const ursache = e.damageSource?.cause;
    const schaden = e.damage ?? 0;
    if (schaden <= 0) return;

    // Getroffen: Ruestung, Bollwerk, Agility beim Fallen.
    if (ziel?.typeId === "minecraft:player") {
        let weniger = 0.03 * rang(ziel, "ruestung");
        const l = lebenVon(ziel);
        if (l && l.max > 0 && l.jetzt / l.max < 0.4) weniger += 0.08 * rang(ziel, "bollwerk");
        if (ursache === "fall") weniger += 0.1 * rang(ziel, "agility");
        heile(ziel, schaden * Math.min(1, weniger));
    }

    // Getroffen von einem Spieler: Angriff, Giftklinge, Volltreffer.
    if (quelle?.typeId !== "minecraft:player" || imZusatz || ziel?.typeId === "minecraft:player") return;
    let extra = schaden * 0.04 * rang(quelle, "angriff");
    const waffe = waffeInDerHand(quelle);
    if (ursache === "projectile" && BOEGEN.has(waffe) && zufall() < 0.06 * rang(quelle, "volltreffer")) {
        extra += schaden;
        try {
            quelle.dimension.spawnParticle("minecraft:critical_hit_emitter",
                { x: ziel.location.x, y: ziel.location.y + 1, z: ziel.location.z });
        } catch (f) { /* egal */ }
    }
    imZusatz = true;
    try { zusatzSchaden(ziel, extra); } finally { imZusatz = false; }
    const gift = rang(quelle, "giftklinge");
    if (gift > 0 && ursache === "entityAttack" && DOLCHE.has(waffe)) {
        try { ziel.addEffect("poison", 20 * gift, { amplifier: gift >= 5 ? 1 : 0 }); } catch (f) { /* egal */ }
    }
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

export function doppeltesErz(spieler, blockTyp, werkzeug, zufall = Math.random) {
    const name = String(blockTyp ?? "").replace("minecraft:", "");
    const beute = ERZE[name];
    if (!beute) return null;
    // Behutsamkeit laesst das Erz selbst fallen - dann gibt es nichts doppelt.
    try {
        if (werkzeug?.getComponent?.("minecraft:enchantable")?.getEnchantment?.("silk_touch")) return null;
    } catch (e) { /* ohne Verzauberung */ }
    if (zufall() >= 0.05 * gespeichert(spieler, "mining")) return null;
    return `minecraft:${beute}`;
}

world.afterEvents.playerBreakBlock.subscribe((e) => {
    try {
        if (istKreativSpieler(e.player)) return;
        const beute = doppeltesErz(e.player, e.brokenBlockPermutation?.type?.id, e.itemStackBeforeBreak);
        if (!beute) return;
        const o = e.block.location;
        e.dimension.spawnItem(new ItemStack(beute, 1), { x: o.x + 0.5, y: o.y + 0.5, z: o.z + 0.5 });
    } catch (fehler) {
        console.warn(`Faehigkeiten, Mining: ${fehler}`);
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

export async function zeigeBuch(spieler, versuch = 0) {
    const rolle = rolleVon(spieler);
    const form = new ActionFormData()
        .title("Buch der Fähigkeiten")
        .body(`Deine Level: §a${spieler.level ?? 0}§r\n\n`
            + "Mit Leveln baust du deine Fähigkeiten aus. Level bekommst du für jedes besiegte "
            + "Monster, aus Erfahrungsfunken und aus Erfahrungsgefäßen (15 Level auf einmal).\n\n"
            + (rolle ? `Als ${ROLLEN[rolle].farbe}${ROLLEN[rolle].name}§r hast du zwei eigene Fähigkeiten.`
                : "§7Wähle am Rollenaltar eine Rolle - dann kommen zwei eigene Fähigkeiten dazu."));
    const f = liste(spieler);
    for (const x of f) form.button(knopfText(spieler, x), x.bild);
    const antwort = await form.show(spieler);
    if (antwort.canceled) {
        nochmal(antwort, (v) => zeigeBuch(spieler, v), versuch);
        return;
    }
    const gewaehlt = f[antwort.selection];
    if (gewaehlt) await zeigeFaehigkeit(spieler, gewaehlt);
}

export function seitenText(spieler, f) {
    const r = gespeichert(spieler, f.id);
    return [
        `§7Stufe ${r} von ${f.max}`,
        "",
        `§6Jetzt§r\n${r > 0 ? f.text(r) : "noch nichts"}`,
        "",
        r < f.max ? `§6Stufe ${r + 1}§r\n${f.text(r + 1)}` : "§2Ganz ausgebaut.",
        ...(f.ziel ? ["", `§7${f.ziel}`] : []),
        "",
        r < f.max ? `Kostet §a${kosten(r)} Level§r - du hast ${spieler.level ?? 0}.` : "",
    ].join("\n");
}

export async function zeigeFaehigkeit(spieler, f, versuch = 0) {
    const r = gespeichert(spieler, f.id);
    const form = new ActionFormData().title(`${f.farbe}${f.name}`).body(seitenText(spieler, f));
    const kannAusbauen = r < f.max;
    if (kannAusbauen) form.button(`§2Ausbauen\n§8${kosten(r)} Level`);
    form.button("§8Zurück");
    const antwort = await form.show(spieler);
    if (antwort.canceled) {
        nochmal(antwort, (v) => zeigeFaehigkeit(spieler, f, v), versuch);
        return;
    }
    if (kannAusbauen && antwort.selection === 0) {
        const ergebnis = ausbauen(spieler, f.id);
        if (ergebnis.ok) {
            try {
                spieler.dimension.playSound("random.levelup", spieler.location, { volume: 0.7, pitch: 1.3 });
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
