// Die Drachenzucht (5.2): paaren, Eier legen, brueten, schluepfen, wachsen.
//
// Fynn: "Wir brauchen jetzt auch Babydrachen, die langsam wachsen, und man
// sieht den Wachstum in kleineren Ticks ... man kann zwei gezaehmte Drachen
// paaren, und diese legen dann ein Ei. Das muss man dann hochziehen, und
// das Ei ist ein kleiner Mix ... Von den staerkeren Drachen erben die dann
// auch die Faehigkeiten ... Es muessen auch nicht alle Drachen paarbar
// sein, aber die meisten."
//
// * Paaren: Zwei zahme, ausgewachsene Drachen bekommen rohes Fleisch
//   (schleichend antippen). Stehen beide verliebt beieinander, legt einer
//   ein Drachenei. Danach brauchen beide fuenf Minuten Ruhe.
// * Nicht jedes Paar passt: Der Himmelsdrache ohne Schwingen mag weder den
//   schweren Schlunddrachen noch den Giftdrachen (UNVERTRAEGLICH).
// * Das Ei: Es muss warm liegen - an Feuer, Lagerfeuer, Lava oder Magma;
//   ein Frostei dagegen kalt, an Schnee oder Eis. Nach sechs Minuten
//   Waerme schluepft das Junge und gehoert dem, dessen Drache das Ei gelegt
//   hat. Wer das Ei antippt, hebt es auf und kann es woanders absetzen.
// * Das Junge: der Koerper der einen Art, die Farben und ein Kennzeichen
//   der anderen (fynn:misch). Den Atem erbt es vom staerkeren Elternteil,
//   die Faehigkeit vom anderen. Manche Paare ergeben eine Gabe - eine
//   dritte Faehigkeit, die aus beiden entsteht (GABEN, drachengaben.js).
//   Manche Paare bringen selten sogar eine ganz neue Art hervor
//   (NEUE_ARTEN). Jede Generation wird ein wenig staerker.
// * Wachsen: zehn Stufen, alle drei Minuten eine; rohes Fleisch laesst es
//   schneller wachsen. Erst ausgewachsen traegt es einen Sattel. Hatte ein
//   Elternteil uralte Blut, wird es vielleicht selbst uralt.

import * as mc from "@minecraft/server";
import { DRACHEN, FAEHIGKEITEN, WUCHS, FLEISCH, eig, istZahm, lebt, weite, leiste, wuchsVon,
         atemVon, faehigkeitVon, besitzerVon } from "./drachen.js";
import { gabeVon, gabeFuer, GABENNAMEN, ATEMNAMEN, gabeImKampf, gabeWirken, gabeBereit, macht } from "./drachengaben.js";
import { zusatz } from "./drachen.js";

const { world, system } = mc;

// Die Reihenfolge ist die der Mischhaeute und Eierschalen
// (werkzeuge/drachen_misch.py, ARTEN) - fynn:misch und fynn:koerper sind
// Nummern darin.
export const ARTEN = ["fynn:lindwurm", "fynn:frostwyvern", "fynn:himmelsdrache", "fynn:giftdrache",
    "fynn:nachtschwinge", "fynn:schlunddrache", "fynn:dampfdrache", "fynn:sternendrache", "fynn:lavadrache"];
export const EI = "fynn:drachenei";

export const ZUCHT = {
    liebe: 600,           // so lange ist er verliebt (Ticks)
    weite: 12,            // so nah muessen die beiden beieinander sein
    pause: 6000,          // danach so lange keine Liebe (Ticks)
    brut: 7200,           // so lange muss das Ei warm liegen
    stufe: 3600,          // so lange je Wachstumsstufe
    futter: 600,          // so viel schneller waechst er je Stueck Fleisch
    uraltErbe: 0.3,       // Chance, dass das Junge eines Uralten uralt wird
    staerkeSprung: 6,     // so viel staerker als der staerkere Elternteil
    staerkeMax: 260,
};

// Wie stark eine Art von sich aus ist - wer staerker ist, gibt den Atem.
export const STAERKE = {
    "fynn:lindwurm": 120, "fynn:frostwyvern": 100, "fynn:himmelsdrache": 110, "fynn:giftdrache": 100,
    "fynn:nachtschwinge": 130, "fynn:schlunddrache": 120,
    "fynn:dampfdrache": 135, "fynn:sternendrache": 145, "fynn:lavadrache": 150,
};

export const UNVERTRAEGLICH = [
    ["fynn:himmelsdrache", "fynn:schlunddrache"],
    ["fynn:himmelsdrache", "fynn:giftdrache"],
    // Glut und Eis vertragen sich nicht - und der Sternendrache hat fuer den
    // schweren Lavadrachen nichts uebrig.
    ["fynn:lavadrache", "fynn:frostwyvern"],
    ["fynn:sternendrache", "fynn:lavadrache"],
];

// Paare, aus denen manchmal eine ganz neue Art schluepft (jedes vierte Ei).
export const NEUE_ARTEN = {
    "fynn:frostwyvern+fynn:lindwurm": { art: "fynn:dampfdrache", chance: 0.25 },
    "fynn:himmelsdrache+fynn:nachtschwinge": { art: "fynn:sternendrache", chance: 0.25 },
    "fynn:lindwurm+fynn:schlunddrache": { art: "fynn:lavadrache", chance: 0.25 },
};

// Welche Eier es kalt brauchen statt warm.
export const KALTE_EIER = new Set(["fynn:frostwyvern"]);
const WARM = new Set(["minecraft:fire", "minecraft:soul_fire", "minecraft:campfire", "minecraft:soul_campfire",
    "minecraft:lava", "minecraft:flowing_lava", "minecraft:magma"]);
const KALT = new Set(["minecraft:snow", "minecraft:snow_layer", "minecraft:powder_snow", "minecraft:ice",
    "minecraft:packed_ice", "minecraft:blue_ice"]);

function name(art) {
    return DRACHEN[art]?.name ?? "Drache";
}
function paarSchluessel(a, b) {
    return [a, b].sort().join("+");
}
function dyn(w, k) {
    try { return w.getDynamicProperty(k); } catch (e) { return undefined; }
}
function setzeDyn(w, k, v) {
    try { w.setDynamicProperty(k, v); } catch (e) { /* egal */ }
}
function kreativ(s) {
    try { return s?.getGameMode?.() === "Creative"; } catch (e) { return false; }
}
function herzen(dim, o, n = 5) {
    for (let i = 0; i < n; i++) {
        try {
            dim.spawnParticle("minecraft:heart_particle",
                { x: o.x + (Math.random() - 0.5) * 2, y: o.y + 1.5 + Math.random(), z: o.z + (Math.random() - 0.5) * 2 });
        } catch (e) { /* egal */ }
    }
}
function verbrauchen(spieler) {
    if (kreativ(spieler)) return;
    try {
        const inv = spieler.getComponent("minecraft:inventory")?.container;
        const platz = spieler.selectedSlotIndex ?? 0;
        const ding = inv?.getItem(platz);
        if (!ding) return;
        if (ding.amount > 1) { ding.amount -= 1; inv.setItem(platz, ding); } else inv.setItem(platz, undefined);
    } catch (e) { /* egal */ }
}

// ------------------------------------------------------------ Merkmale

/** Was ein Drache vererbt: seine Art, sein (vielleicht geerbter) Atem, seine
 *  Faehigkeit und Gabe, wie stark er ist, welche Generation, ob uralt. */
export function merkmale(d) {
    return {
        art: d.typeId,
        atem: atemVon(d),
        faehigkeit: faehigkeitVon(d),
        gabe: gabeVon(d),
        staerke: Number(dyn(d, "fynn:staerke") ?? STAERKE[d.typeId] ?? 100),
        generation: Number(dyn(d, "fynn:generation") ?? 1),
        uralt: !!eig(d, "fynn:uralt"),
    };
}

export function vertraeglich(a, b) {
    return !UNVERTRAEGLICH.some(([x, y]) => (a === x && b === y) || (a === y && b === x));
}

/**
 * Was im Ei steckt. a und b: die Merkmale der Eltern.
 * - Neue Art: manche Paare bringen selten eine ganz neue hervor.
 * - Koerper von einem, Farben vom anderen (bei gleicher Art: rein).
 * - Atem vom staerkeren, Faehigkeit vom schwaecheren Elternteil.
 * - Gabe: was aus beiden Atemarten entsteht - sonst vielleicht die eines
 *   Elternteils.
 */
export function mischen(a, b, zufall = Math.random) {
    const neu = NEUE_ARTEN[paarSchluessel(a.art, b.art)];
    const staerker = a.staerke === b.staerke ? (zufall() < 0.5 ? a : b) : (a.staerke > b.staerke ? a : b);
    const schwaecher = staerker === a ? b : a;
    const ei = {
        koerper: a.art, farbe: b.art,
        atem: staerker.atem, faehigkeit: schwaecher.faehigkeit,
        gabe: gabeFuer(a.atem, b.atem) ?? (zufall() < 0.5 ? (a.gabe || b.gabe || undefined) : undefined),
        staerke: Math.min(ZUCHT.staerkeMax, Math.max(a.staerke, b.staerke) + ZUCHT.staerkeSprung),
        generation: Math.max(a.generation, b.generation) + 1,
        uralt: (a.uralt || b.uralt) && zufall() < ZUCHT.uraltErbe,
    };
    if (neu && zufall() < neu.chance) {
        const art = DRACHEN[neu.art];
        return { ...ei, koerper: neu.art, farbe: neu.art, atem: art.atem, faehigkeit: art.faehigkeit,
                 gabe: ei.gabe, neueArt: true };
    }
    if (zufall() < 0.5) { ei.koerper = b.art; ei.farbe = a.art; }
    return ei;
}

// ------------------------------------------------------------ Fuettern und Liebe

const verliebt = new Map();      // Drachen-Id -> { drache, bis }

function pauseBis(d) {
    return Number(dyn(d, "fynn:zuchtpause") ?? 0);
}

/** Rohes Fleisch: Ein Junges waechst schneller, ein Erwachsener verliebt sich. */
export function fuettern(drache, spieler, jetzt) {
    if (!DRACHEN[drache.typeId] || !istZahm(drache)) return "nicht zahm";
    if (eig(drache, "fynn:besiegt")) return "besiegt";
    const dim = drache.dimension;
    if (wuchsVon(drache) < WUCHS) {
        setzeDyn(drache, "fynn:wuchszeit", Number(dyn(drache, "fynn:wuchszeit") ?? 0) + ZUCHT.futter);
        try {
            dim.spawnParticle("minecraft:villager_happy", { ...drache.location, y: drache.location.y + 0.8 });
            dim.playSound("random.eat", drache.location, { volume: 1, pitch: 1.4 });
        } catch (e) { /* egal */ }
        verbrauchen(spieler);
        spieler.onScreenDisplay?.setActionBar(`§aDein junger ${name(drache.typeId)} frisst – er wächst schneller.`);
        return "waechst";
    }
    if (besitzerVon(drache) && besitzerVon(drache) !== spieler.id) return "fremd";
    if (jetzt < pauseBis(drache)) {
        spieler.onScreenDisplay?.setActionBar(`§7Der ${name(drache.typeId)} braucht noch Ruhe.`);
        return "ruht";
    }
    verliebt.set(drache.id, { drache, bis: jetzt + ZUCHT.liebe });
    try { drache.setProperty("fynn:verliebt", true); } catch (e) { /* egal */ }
    herzen(dim, drache.location, 7);
    try { dim.playSound("mob.enderdragon.growl", drache.location, { volume: 1, pitch: 1.6 }); } catch (e) { /* egal */ }
    verbrauchen(spieler);
    spieler.onScreenDisplay?.setActionBar(`§d${name(drache.typeId)} ist verliebt! §7Jetzt noch ein zweiter Drache in der Nähe.`);
    return "verliebt";
}

function entlieben(d) {
    try { if (lebt(d)) d.setProperty("fynn:verliebt", false); } catch (e) { /* egal */ }
}

export function istVerliebt(d, jetzt) {
    const v = verliebt.get(d.id);
    return !!v && jetzt < v.bis && lebt(v.drache);
}

/** Wer verliebt ist und einen verliebten Partner in der Naehe hat: paaren. */
export function paarTakt(jetzt, zufall = Math.random) {
    const liste = [...verliebt.values()].filter((v) => jetzt < v.bis && lebt(v.drache));
    for (const [id, v] of verliebt) {
        if (liste.includes(v)) continue;
        verliebt.delete(id);
        entlieben(v.drache);
    }
    for (let i = 0; i < liste.length; i++) {
        for (let j = i + 1; j < liste.length; j++) {
            const a = liste[i].drache, b = liste[j].drache;
            if (a.dimension !== b.dimension || weite(a.location, b.location) > ZUCHT.weite) continue;
            verliebt.delete(a.id);
            verliebt.delete(b.id);
            entlieben(a);
            entlieben(b);
            if (!vertraeglich(a.typeId, b.typeId)) {
                leiste(a.dimension, a.location,
                    `§cDer ${name(a.typeId)} und der ${name(b.typeId)} mögen sich nicht – sie passen nicht zusammen.`);
                return "unvertraeglich";
            }
            setzeDyn(a, "fynn:zuchtpause", jetzt + ZUCHT.pause);
            setzeDyn(b, "fynn:zuchtpause", jetzt + ZUCHT.pause);
            const mutter = zufall() < 0.5 ? a : b;
            const inhalt = mischen(merkmale(a), merkmale(b), zufall);
            herzen(a.dimension, a.location, 10);
            herzen(b.dimension, b.location, 10);
            const ort = { x: (a.location.x + b.location.x) / 2, y: mutter.location.y, z: (a.location.z + b.location.z) / 2 };
            eiLegen(mutter.dimension, ort, inhalt, besitzerVon(mutter) ?? besitzerVon(a) ?? besitzerVon(b));
            return "ei";
        }
    }
    return liste.length ? "wartet" : "niemand";
}

// ------------------------------------------------------------ Das Ei

function nummer(art) {
    const n = ARTEN.indexOf(art);
    return n < 0 ? 0 : n;
}

export function eiLegen(dim, ort, inhalt, besitzer, brut = 0) {
    let ei;
    try { ei = dim.spawnEntity(EI, ort); } catch (e) { return undefined; }
    if (!ei || typeof ei !== "object") return undefined;
    try {
        ei.setProperty("fynn:koerper", nummer(inhalt.koerper));
        ei.setProperty("fynn:farbe", nummer(inhalt.farbe));
    } catch (e) { /* egal */ }
    setzeDyn(ei, "fynn:ei", JSON.stringify(inhalt));
    setzeDyn(ei, "fynn:brut", brut);
    if (besitzer) setzeDyn(ei, "fynn:besitzer", besitzer);
    try {
        dim.playSound("block.turtle_egg.drop", ort, { volume: 1.5, pitch: 0.6 });
        dim.spawnParticle("minecraft:villager_happy", { x: ort.x, y: ort.y + 0.5, z: ort.z });
    } catch (e) { /* egal */ }
    leiste(dim, ort, `§6Ein Drachenei! §7${eiBeschreibung(inhalt)} – ${KALTE_EIER.has(inhalt.koerper)
        ? "es braucht Kälte (Schnee, Eis)" : "es braucht Wärme (Feuer, Lagerfeuer, Lava, Magma)"}.`);
    return ei;
}

export function eiInhalt(ei) {
    try { return JSON.parse(dyn(ei, "fynn:ei") ?? "null"); } catch (e) { return null; }
}

export function eiBeschreibung(inhalt) {
    if (!inhalt) return "ein Drachenei";
    if (inhalt.neueArt) return `ein ${name(inhalt.koerper)} (neue Art!)`;
    if (inhalt.koerper === inhalt.farbe) return `ein ${name(inhalt.koerper)}`;
    return `${name(inhalt.koerper)} mit den Farben des ${name(inhalt.farbe)}`;
}

/** Liegt das Ei richtig - warm, oder (Frostei) kalt? */
export function temperiert(dim, ort, kalt) {
    const gesucht = kalt ? KALT : WARM;
    const x0 = Math.floor(ort.x), y0 = Math.floor(ort.y), z0 = Math.floor(ort.z);
    for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                try {
                    if (gesucht.has(dim.getBlock({ x: x0 + dx, y: y0 + dy, z: z0 + dz })?.typeId)) return true;
                } catch (e) { /* ungeladen */ }
            }
        }
    }
    return false;
}

/** Ein Takt (jede Sekunde) fuer ein Ei. */
export function eiTakt(ei, jetzt, schritt = 20) {
    const inhalt = eiInhalt(ei) ?? zufallsInhalt();
    const kalt = KALTE_EIER.has(inhalt.koerper);
    const richtig = temperiert(ei.dimension, ei.location, kalt);
    let brut = Number(dyn(ei, "fynn:brut") ?? 0);
    if (richtig) brut += schritt;
    setzeDyn(ei, "fynn:brut", brut);
    try {
        ei.setProperty("fynn:warm", richtig);
        ei.setProperty("fynn:bald", brut >= ZUCHT.brut * 0.8);
    } catch (e) { /* egal */ }
    if (Math.floor(jetzt / 20) % 3 === 0) {
        const rest = Math.max(0, Math.ceil((ZUCHT.brut - brut) / 1200));
        leiste(ei.dimension, ei.location, richtig
            ? `§6Drachenei §7(${eiBeschreibung(inhalt)}): ${kalt ? "kalt" : "warm"} – schlüpft in etwa ${rest} Min.`
            : `§bDrachenei §7(${eiBeschreibung(inhalt)}): ${kalt ? "zu warm! Leg es an Schnee oder Eis"
                : "zu kalt! Leg es an Feuer, Lagerfeuer, Lava oder Magma"}.`, 5);
    }
    if (richtig && brut % 200 === 0) {
        try { ei.dimension.playSound("block.sniffer_egg.crack", ei.location, { volume: 0.6, pitch: 1.2 }); } catch (e) { /* egal */ }
    }
    if (brut < ZUCHT.brut) return richtig ? "brütet" : (kalt ? "zu warm" : "zu kalt");
    schluepfen(ei, inhalt);
    return "schlüpft";
}

function zufallsInhalt() {
    // Ein Ei ohne Eltern (aus dem Kreativinventar): irgendeine reine Art.
    const art = ARTEN[Math.floor(Math.random() * ARTEN.length)];
    return { koerper: art, farbe: art, atem: DRACHEN[art].atem, faehigkeit: DRACHEN[art].faehigkeit,
             staerke: STAERKE[art], generation: 1, uralt: false };
}

export function schluepfen(ei, inhalt = eiInhalt(ei)) {
    const dim = ei.dimension, ort = { ...ei.location };
    const besitzer = dyn(ei, "fynn:besitzer");
    let junges;
    try { junges = dim.spawnEntity(`${inhalt.koerper}<fynn:schluepfen>`, ort); } catch (e) { return undefined; }
    try { ei.remove(); } catch (e) { /* egal */ }
    try {
        dim.playSound("block.sniffer_egg.hatch", ort, { volume: 2, pitch: 0.7 });
        dim.playSound("mob.enderdragon.growl", ort, { volume: 0.8, pitch: 2.0 });
        dim.spawnParticle("fynn:eierschale", { x: ort.x, y: ort.y + 0.5, z: ort.z });
    } catch (e) { /* egal */ }
    // Die Gruppen des Jungen stehen erst einen Augenblick spaeter.
    system.runTimeout(() => einrichten(junges, inhalt, besitzer), 2);
    return junges;
}

/** Was das Junge von seinen Eltern hat - und wem es gehoert. */
export function einrichten(junges, inhalt, besitzer) {
    if (!lebt(junges)) return false;
    try {
        junges.setProperty("fynn:misch", inhalt.farbe !== inhalt.koerper ? nummer(inhalt.farbe) + 1 : 0);
    } catch (e) { /* egal */ }
    for (const [k, v] of [["fynn:atem", inhalt.atem], ["fynn:faehigkeit", inhalt.faehigkeit], ["fynn:gabe", inhalt.gabe],
                          ["fynn:staerke", inhalt.staerke], ["fynn:generation", inhalt.generation],
                          ["fynn:uralt_erbe", !!inhalt.uralt], ["fynn:gezuechtet", true],
                          ["fynn:drache490", true], ["fynn:gewuerfelt", true], ["fynn:wuchszeit", 0]]) {
        if (v !== undefined && v !== null) setzeDyn(junges, k, v);
    }
    let spieler;
    try {
        const alle = world.getAllPlayers();
        spieler = alle.find((s) => s.id === besitzer)
            ?? junges.dimension.getEntities({ type: "minecraft:player", location: junges.location, maxDistance: 16 })[0];
    } catch (e) { /* egal */ }
    if (spieler) {
        let gezaehmt = false;
        try { gezaehmt = !!junges.getComponent("minecraft:tameable")?.tame?.(spieler); } catch (e) { /* egal */ }
        try { junges.triggerEvent("fynn:jung_zahm"); } catch (e) { /* egal */ }
        setzeDyn(junges, "fynn:besitzer", spieler.id);
        const teile = [`§6Ein junger ${name(inhalt.koerper)} ist geschlüpft – er gehört dir!`];
        if (inhalt.farbe !== inhalt.koerper) teile.push(`§7Farben: ${name(inhalt.farbe)}`);
        teile.push(`§7Atem: ${ATEMNAMEN[inhalt.atem] ?? inhalt.atem}`);
        teile.push(`§7Fähigkeit: ${FAEHIGKEITEN[inhalt.faehigkeit]?.name ?? inhalt.faehigkeit}`);
        if (inhalt.gabe) teile.push(`§dGabe: ${GABENNAMEN[inhalt.gabe] ?? inhalt.gabe}`);
        spieler.onScreenDisplay?.setActionBar(teile.join(" · "));
        return gezaehmt || true;
    }
    return false;
}

// ------------------------------------------------------------ Aufheben und Absetzen

export function aufheben(ei, spieler) {
    const inhalt = eiInhalt(ei);
    const brut = Number(dyn(ei, "fynn:brut") ?? 0);
    const ding = new mc.ItemStack(EI, 1);
    try {
        if (inhalt) ding.setDynamicProperty("fynn:ei", JSON.stringify(inhalt));
        ding.setDynamicProperty("fynn:brut", brut);
        const besitzer = dyn(ei, "fynn:besitzer");
        if (besitzer) ding.setDynamicProperty("fynn:besitzer", besitzer);
        ding.setLore([`§7${eiBeschreibung(inhalt)}`, `§7bebrütet: ${Math.floor(brut / ZUCHT.brut * 100)} %`]);
    } catch (e) { /* egal */ }
    let platz = false;
    try {
        const rest = spieler.getComponent("minecraft:inventory")?.container?.addItem(ding);
        platz = !rest;
    } catch (e) { /* egal */ }
    if (!platz) {
        try { spieler.dimension.spawnItem(ding, spieler.location); } catch (e) { return false; }
    }
    try { ei.remove(); } catch (e) { /* egal */ }
    spieler.onScreenDisplay?.setActionBar(`§6Du trägst das Drachenei. §7Setz es an einer ${KALTE_EIER.has(inhalt?.koerper)
        ? "kalten" : "warmen"} Stelle ab.`);
    return true;
}

export function absetzen(spieler, ding, ort) {
    let inhalt = null;
    try { inhalt = JSON.parse(ding.getDynamicProperty?.("fynn:ei") ?? "null"); } catch (e) { /* egal */ }
    const brut = Number(ding.getDynamicProperty?.("fynn:brut") ?? 0);
    const besitzer = ding.getDynamicProperty?.("fynn:besitzer") ?? spieler.id;
    const ei = eiLegen(spieler.dimension, ort, inhalt ?? zufallsInhalt(), besitzer, brut);
    if (ei) verbrauchen(spieler);
    return ei;
}

// ------------------------------------------------------------ Wachsen

/** Ein Takt (jede Sekunde) fuer ein Junges: Zeit zaehlen, Stufe weiter. */
export function wachsTakt(drache, schritt = 20) {
    const wuchs = wuchsVon(drache);
    if (wuchs >= WUCHS) return "erwachsen";
    let zeit = Number(dyn(drache, "fynn:wuchszeit") ?? 0) + schritt;
    if (zeit < ZUCHT.stufe) {
        setzeDyn(drache, "fynn:wuchszeit", zeit);
        return "waechst";
    }
    zeit -= ZUCHT.stufe;
    setzeDyn(drache, "fynn:wuchszeit", zeit);
    const neu = wuchs + 1;
    try {
        drache.triggerEvent(neu >= WUCHS ? "fynn:ausgewachsen" : `fynn:wachsen_${neu}`);
        drache.setProperty?.("fynn:wuchs", neu);
        drache.dimension.spawnParticle("minecraft:villager_happy", { ...drache.location, y: drache.location.y + 1 });
        drache.dimension.playSound("mob.enderdragon.flap", drache.location, { volume: 0.6, pitch: 1.8 });
    } catch (e) { /* egal */ }
    if (neu >= WUCHS && dyn(drache, "fynn:uralt_erbe")) {
        system.runTimeout(() => {
            try {
                drache.triggerEvent("fynn:uralt_werden");
                drache.dimension.playSound("mob.enderdragon.growl", drache.location, { volume: 5, pitch: 0.5 });
            } catch (e) { /* egal */ }
        }, 4);
    }
    const besitzer = world.getAllPlayers?.().find((s) => s.id === besitzerVon(drache));
    besitzer?.onScreenDisplay?.setActionBar(neu >= WUCHS
        ? `§6Dein ${name(drache.typeId)} ist ausgewachsen! §7Jetzt trägt er einen Sattel.`
        : `§aDein junger ${name(drache.typeId)} ist gewachsen §7(${neu}/${WUCHS}).`);
    return neu >= WUCHS ? "ausgewachsen" : "gewachsen";
}

// ------------------------------------------------------------ Anmelden

world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    try {
        const ziel = e.target;
        if (ziel?.typeId === EI) {
            e.cancel = true;
            system.run(() => aufheben(ziel, e.player));
            return;
        }
        if (!DRACHEN[ziel?.typeId] || !FLEISCH.has(e.itemStack?.typeId)) return;
        // Erwachsene nur schleichend - sonst steigt man auf.
        if (wuchsVon(ziel) >= WUCHS && !e.player.isSneaking) return;
        if (!istZahm(ziel)) return;
        e.cancel = true;
        system.run(() => fuettern(ziel, e.player, system.currentTick));
    } catch (fehler) {
        console.warn(`Drachenzucht, Antippen: ${fehler}`);
    }
});

world.afterEvents.playerInteractWithBlock.subscribe((e) => {
    try {
        const ding = e.beforeItemStack;
        if (ding?.typeId !== EI || e.isFirstEvent === false) return;
        const b = e.block.location, f = e.blockFace;
        const ort = { x: b.x + 0.5 + (f === "East" ? 1 : f === "West" ? -1 : 0),
                      y: b.y + (f === "Down" ? -1 : f === "Up" || !f ? 1 : 0),
                      z: b.z + 0.5 + (f === "South" ? 1 : f === "North" ? -1 : 0) };
        absetzen(e.player, ding, ort);
    } catch (fehler) {
        console.warn(`Drachenzucht, Absetzen: ${fehler}`);
    }
});

// Die Arten aus der Zucht zeigen, was sie sind: Aus den Schloten des
// Dampfdrachen steigt Dampf, vom Lavadrachen tropft Glut, um den
// Sternendrachen glitzert es.
const SCHEIN = {
    "fynn:dampfdrache": ["fynn:gabe_dampf", 1.8, -0.4],
    "fynn:lavadrache": ["minecraft:lava_particle", 1.2, 0.3],
    "fynn:sternendrache": ["fynn:gabe_sterne", 1.4, 0.8],
};
export function umgebung(d) {
    const s = SCHEIN[d.typeId];
    if (!s) return false;
    const [teil, hoch, zurueck] = s;
    const g = (wuchsVon(d) < WUCHS ? 0.3 + 0.07 * wuchsVon(d) : 1) * (DRACHEN[d.typeId]?.groesse ?? 1);
    let b = { x: 0, z: 1 };
    try { const v = d.getViewDirection(); const l = Math.hypot(v.x, v.z) || 1; b = { x: v.x / l, z: v.z / l }; } catch (e) { /* egal */ }
    const o = d.location;
    try {
        d.dimension.spawnParticle(teil, { x: o.x - b.x * zurueck * g, y: o.y + hoch * g, z: o.z - b.z * zurueck * g });
    } catch (e) { return false; }
    return true;
}

// Was drachen.js von der Zucht wissen will: im Sattel geht die Pfeife
// zuerst an die Gabe, und wer seinen Drachen antippt, erfaehrt sein Erbe.
zusatz.pfeife = (drache, spieler, jetzt, richtung) => {
    if (!gabeBereit(drache, jetzt)) return undefined;
    const o = spieler.location;
    const ort = { x: o.x + richtung.x * 14, y: o.y, z: o.z + richtung.z * 14 };
    const ziel = drache.dimension.getEntities({ location: ort, maxDistance: 8, excludeTypes: ["minecraft:player"] })
        .find((w) => w.id !== drache.id && w.typeId !== "minecraft:item");
    return gabeWirken(drache, ziel, jetzt);
};
zusatz.info = (drache) => {
    const m = merkmale(drache);
    const teile = [`Gen. ${m.generation}`, `Stärke ${Math.round(m.staerke * macht(drache))}`,
                   ATEMNAMEN[m.atem] ?? m.atem, FAEHIGKEITEN[m.faehigkeit]?.name ?? m.faehigkeit];
    if (m.gabe) teile.push(`Gabe: ${GABENNAMEN[m.gabe]}`);
    if (wuchsVon(drache) < WUCHS) teile.push(`jung (${wuchsVon(drache)}/${WUCHS})`);
    return teile.join(" · ");
};

let runde = 0;
system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        const r = runde++;
        for (const dimName of ["overworld", "nether"]) {
            let welt;
            try { welt = world.getDimension(dimName); } catch (f) { continue; }
            for (const ei of welt.getEntities({ type: EI })) {
                try { eiTakt(ei, jetzt); } catch (f) { /* egal */ }
            }
            for (const art of ARTEN) {
                for (const d of welt.getEntities({ type: art })) {
                    try {
                        if (wuchsVon(d) < WUCHS) wachsTakt(d);
                        else gabeImKampf(d, jetzt);
                        if (r % 2 === 0 && istVerliebt(d, jetzt)) herzen(d.dimension, d.location, 2);
                        if (r % 2 === 1) umgebung(d);
                    } catch (f) { /* egal */ }
                }
            }
        }
        if (verliebt.size) paarTakt(jetzt);
    } catch (fehler) {
        console.warn(`Drachenzucht: ${fehler}`);
    }
}, 20);
