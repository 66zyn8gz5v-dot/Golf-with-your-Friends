// Was die Kleintiere tun (4.77).
//
// Fynn: "Ich haette gerne mehr kleinere Wesen, zum Beispiel kleinere Voegel,
// ein Specht, der an Baeumen so Dings, eine Schnecke, die alle so auch
// Funktionen haben ... man kann mit denen was anfangen."
//
// Wie sie aussehen und wohin sie laufen, steht in den Tierdateien
// (werkzeuge/kleintiere_daten.py). Hier steht, was sich dort nicht sagen
// laesst:
//
// * Specht: Kommt er an einem Stamm an, haelt er sich an der Rinde fest und
//   haemmert in Salven - und findet dabei manchmal eine Kaeferlarve.
// * Eichhoernchen: klettert den Stamm hinauf und wieder herunter; bringt
//   Nuesse, wenn man es mit Beeren oder Samen fuettert; vergraebt ab und zu
//   eine Nuss auf freier Wiese - dort steht dann ein Setzling.
// * Singvogel: Mit einer Kaeferlarve wird er sicher zahm. Ein zahmer Vogel
//   warnt laut, wenn ein Monster in der Naehe ist - und sein Besitzer liest,
//   was da kommt.
// * Schnecke: Kommt ihr jemand zu nahe, der nicht schleicht, zieht sie sich
//   ins Haus zurueck und kommt erst wieder heraus, wenn es ruhig ist.

import { world, system, ItemStack } from "@minecraft/server";

export const SPECHT = "fynn:specht";
export const EICHHOERNCHEN = "fynn:eichhoernchen";
export const SINGVOGEL = "fynn:singvogel";
export const SCHNECKE = "fynn:schnecke";
export const LARVE = "fynn:kaeferlarve";
export const NUSS = "fynn:nuss";

const STAMM = /^minecraft:(oak|birch|spruce|jungle|dark_oak|acacia|cherry|mangrove|pale_oak)_log$/;
const SETZLING = {
    oak: "minecraft:oak_sapling", birch: "minecraft:birch_sapling", spruce: "minecraft:spruce_sapling",
    jungle: "minecraft:jungle_sapling", dark_oak: "minecraft:dark_oak_sapling", acacia: "minecraft:acacia_sapling",
    cherry: "minecraft:cherry_sapling", mangrove: "minecraft:mangrove_propagule", pale_oak: "minecraft:pale_oak_sapling",
};
const FUTTER = new Set(["minecraft:sweet_berries", "minecraft:glow_berries", "minecraft:wheat_seeds",
    "minecraft:pumpkin_seeds", "minecraft:melon_seeds", "minecraft:beetroot_seeds", "minecraft:torchflower_seeds"]);
const GRABBODEN = new Set(["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol", "minecraft:coarse_dirt",
    "minecraft:moss_block", "minecraft:rooted_dirt"]);
export const VOGELNAMEN = ["Rotkehlchen", "Blaumeise", "Spatz"];

export const HACKEN = { dauer: [120, 200], larve: 0.45 };
export const KLETTERN = { schritt: 0.25, oben: [60, 140] };
export const GRABEN = { chance: 0.04, hoechstens: 3, dauer: 40 };
export const WARNEN = { weite: 12, pause: 200, dauer: 40 };

function ist(wesen, typ) {
    try { return wesen?.isValid !== false && wesen?.typeId === typ; } catch (e) { return false; }
}

function block(dim, x, y, z) {
    try { return dim.getBlock({ x: Math.floor(x), y: Math.floor(y), z: Math.floor(z) }); } catch (e) { return undefined; }
}

function holzart(typ) {
    const m = STAMM.exec(typ ?? "");
    return m ? m[1] : undefined;
}

/** Der naechste Stamm neben dem Tier (bis zwei Bloecke weit, etwas hoeher). */
export function stammNeben(dim, o) {
    for (let r = 1; r <= 2; r++) {
        for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, r], [r, -r], [-r, -r]]) {
            for (const dy of [0, 1, 2, -1]) {
                const b = block(dim, o.x + dx, o.y + dy, o.z + dz);
                if (b && STAMM.test(b.typeId)) return { x: Math.floor(o.x + dx), y: Math.floor(o.y + dy), z: Math.floor(o.z + dz), typ: b.typeId };
            }
        }
    }
    return undefined;
}

/** Wo das Tier an der Rinde haengt: an der Seite des Stamms, die ihm am
 *  naechsten ist, mit dem Bauch zum Holz. */
export function anDerRinde(stamm, o, abstand) {
    const cx = stamm.x + 0.5, cz = stamm.z + 0.5;
    const dx = o.x - cx, dz = o.z - cz;
    const seite = Math.abs(dx) >= Math.abs(dz) ? { x: Math.sign(dx) || 1, z: 0 } : { x: 0, z: Math.sign(dz) || 1 };
    return { ort: { x: cx + seite.x * abstand, y: stamm.y + 0.15, z: cz + seite.z * abstand }, mitte: { x: cx, z: cz } };
}

function festhalten(tier, ort, mitte, eigenschaft) {
    tier.triggerEvent("fynn:festhalten");
    tier.teleport(ort, { facingLocation: { x: mitte.x, y: ort.y, z: mitte.z } });
    tier.setProperty(eigenschaft, true);
}

function loslassen(tier, eigenschaft) {
    try {
        tier.setProperty(eigenschaft, false);
        tier.triggerEvent("fynn:loslassen");
    } catch (e) { /* schon fort */ }
}

// ------------------------------------------------------------ Specht

const hackende = new Map();    // Specht-Id -> { tier, ende, stamm, ort }

export function beginneHacken(specht, jetzt, zufall = Math.random) {
    if (hackende.has(specht.id)) return false;
    const stamm = stammNeben(specht.dimension, specht.location);
    if (!stamm) return false;
    const { ort, mitte } = anDerRinde(stamm, specht.location, 0.72);
    festhalten(specht, ort, mitte, "fynn:hackt");
    const [a, b] = HACKEN.dauer;
    hackende.set(specht.id, { tier: specht, ende: jetzt + a + Math.floor(zufall() * (b - a)), stamm, ort });
    return true;
}

export function hackTakt(jetzt, zufall = Math.random) {
    for (const [id, h] of hackende) {
        const s = h.tier;
        if (!ist(s, SPECHT)) { hackende.delete(id); continue; }
        const holz = block(s.dimension, h.stamm.x, h.stamm.y, h.stamm.z);
        if (jetzt < h.ende && holz && STAMM.test(holz.typeId)) {
            // Salven: vier Schlaege, dann eine Pause - wie ein echter Specht.
            if (Math.floor(jetzt / 5) % 6 < 4) {
                try { s.dimension.playSound("hit.wood", s.location, { volume: 0.9, pitch: 1.5 + zufall() * 0.2 }); } catch (e) { /* egal */ }
            }
            continue;
        }
        hackende.delete(id);
        loslassen(s, "fynn:hackt");
        if (holz && STAMM.test(holz.typeId) && zufall() < HACKEN.larve) {
            try { s.dimension.spawnItem(new ItemStack(LARVE, 1), { x: h.ort.x, y: h.stamm.y + 0.2, z: h.ort.z }); } catch (e) { /* egal */ }
        }
    }
}

// ------------------------------------------------------------ Eichhoernchen

const kletternde = new Map();   // Id -> { tier, phase, y, oben, unten, ort, mitte, bis }

export function beginneKlettern(tier, jetzt, zufall = Math.random) {
    if (kletternde.has(tier.id)) return false;
    const dim = tier.dimension;
    const stamm = stammNeben(dim, tier.location);
    if (!stamm) return false;
    // Den Stamm hinunter bis zum Fuss und hinauf bis zur Krone.
    let unten = stamm.y, oben = stamm.y;
    while (unten > stamm.y - 3 && STAMM.test(block(dim, stamm.x, unten - 1, stamm.z)?.typeId ?? "")) unten--;
    while (oben < stamm.y + 12 && STAMM.test(block(dim, stamm.x, oben + 1, stamm.z)?.typeId ?? "")) oben++;
    const { ort, mitte } = anDerRinde({ ...stamm, y: unten }, tier.location, 0.78);
    festhalten(tier, ort, mitte, "fynn:klettert");
    kletternde.set(tier.id, { tier, phase: "hoch", y: ort.y, unten: ort.y, oben: oben + 0.2, ort, mitte, bis: 0 });
    return true;
}

export function kletterTakt(jetzt, zufall = Math.random) {
    for (const [id, k] of kletternde) {
        const t = k.tier;
        if (!ist(t, EICHHOERNCHEN)) { kletternde.delete(id); continue; }
        if (k.phase === "hoch") {
            k.y = Math.min(k.oben, k.y + KLETTERN.schritt);
            if (k.y >= k.oben) {
                k.phase = "oben";
                const [a, b] = KLETTERN.oben;
                k.bis = jetzt + a + Math.floor(zufall() * (b - a));
            }
        } else if (k.phase === "oben") {
            if (jetzt >= k.bis) k.phase = "runter";
            continue;
        } else {
            k.y = Math.max(k.unten, k.y - KLETTERN.schritt);
            if (k.y <= k.unten) {
                kletternde.delete(id);
                loslassen(t, "fynn:klettert");
                continue;
            }
        }
        try { t.teleport({ x: k.ort.x, y: k.y, z: k.ort.z }, { facingLocation: { x: k.mitte.x, y: k.y + 1, z: k.mitte.z } }); } catch (e) { /* egal */ }
    }
}

const fuetterungen = [];        // { tier, ab }

export function gefuettert(tier, jetzt, zufall = Math.random) {
    fuetterungen.push({ tier, ab: jetzt + 40 + Math.floor(zufall() * 40) });
    try { tier.dimension.spawnParticle("minecraft:heart_particle", { ...tier.location, y: tier.location.y + 0.7 }); } catch (e) { /* egal */ }
}

export function nussTakt(jetzt, zufall = Math.random) {
    for (let i = fuetterungen.length - 1; i >= 0; i--) {
        const f = fuetterungen[i];
        if (jetzt < f.ab) continue;
        fuetterungen.splice(i, 1);
        if (!ist(f.tier, EICHHOERNCHEN)) continue;
        const anzahl = 1 + Math.floor(zufall() * 3);
        try {
            f.tier.dimension.spawnItem(new ItemStack(NUSS, anzahl), f.tier.location);
            f.tier.dimension.playSound("random.pop", f.tier.location, { volume: 0.8, pitch: 1.3 });
        } catch (e) { /* egal */ }
    }
}

/** Welche Baumart in der Naehe steht - daraus wird der Setzling. */
export function baumartNahe(dim, o) {
    for (const r of [3, 5, 7]) {
        for (const [dx, dz] of [[r, 0], [-r, 0], [0, r], [0, -r], [r, r], [-r, -r], [r, -r], [-r, r]]) {
            for (const dy of [1, 2, 3]) {
                const art = holzart(block(dim, o.x + dx, o.y + dy, o.z + dz)?.typeId);
                if (art) return art;
            }
        }
    }
    return "oak";
}

/** Darf hier eine Nuss hin? Auf Erde, frei darueber, und kein Baum und
 *  kein Setzling direkt daneben - sonst wuerde der Wald nur dichter. */
export function freierPlatz(dim, o) {
    const boden = block(dim, o.x, o.y - 1, o.z);
    const hier = block(dim, o.x, o.y, o.z);
    if (!boden || !GRABBODEN.has(boden.typeId) || !hier || hier.typeId !== "minecraft:air") return false;
    for (let dx = -2; dx <= 2; dx++) {
        for (let dz = -2; dz <= 2; dz++) {
            for (let dy = 0; dy <= 2; dy++) {
                const t = block(dim, o.x + dx, o.y + dy, o.z + dz)?.typeId ?? "";
                if (STAMM.test(t) || t.endsWith("_sapling") || t.endsWith("_propagule")) return false;
            }
        }
    }
    return true;
}

const grabende = new Map();     // Id -> { tier, ab, ort }

export function grabTakt(tier, jetzt, zufall = Math.random) {
    const g = grabende.get(tier.id);
    if (g) {
        if (jetzt < g.ab) return "graebt";
        grabende.delete(tier.id);
        try { tier.setProperty("fynn:graebt", false); } catch (e) { /* egal */ }
        const dim = tier.dimension;
        if (!freierPlatz(dim, g.ort)) return "nichts";
        try {
            block(dim, g.ort.x, g.ort.y, g.ort.z).setType(SETZLING[baumartNahe(dim, g.ort)]);
            dim.playSound("dig.grass", g.ort, { volume: 0.8, pitch: 1.2 });
            dim.spawnParticle("minecraft:crop_growth_emitter", { x: Math.floor(g.ort.x) + 0.5, y: Math.floor(g.ort.y) + 0.3, z: Math.floor(g.ort.z) + 0.5 });
            tier.setDynamicProperty("fynn:vergraben", (tier.getDynamicProperty("fynn:vergraben") ?? 0) + 1);
        } catch (e) { return "nichts"; }
        return "gepflanzt";
    }
    if (kletternde.has(tier.id) || zufall() >= GRABEN.chance) return "ruht";
    if ((tier.getDynamicProperty?.("fynn:vergraben") ?? 0) >= GRABEN.hoechstens) return "ruht";
    const ort = { x: tier.location.x, y: tier.location.y, z: tier.location.z };
    if (!freierPlatz(tier.dimension, ort)) return "ruht";
    tier.setProperty("fynn:graebt", true);
    grabende.set(tier.id, { tier, ab: jetzt + GRABEN.dauer, ort });
    return "graebt";
}

// ------------------------------------------------------------ Singvogel

function zaehmbar(vogel) {
    try { return vogel.getComponent("minecraft:tameable"); } catch (e) { return undefined; }
}

function istZahm(vogel) {
    try { return !!vogel.getComponent("minecraft:is_tamed"); } catch (e) { return false; }
}

/** Mit einer Kaeferlarve: sicher zahm. */
export function larveFuettern(vogel, spieler) {
    if (istZahm(vogel)) return false;
    const z = zaehmbar(vogel);
    if (!z) return false;
    try { z.tame(spieler); } catch (e) { /* dann eben ueber das Ereignis */ }
    try { vogel.triggerEvent("fynn:gezaehmt"); } catch (e) { /* egal */ }
    try {
        vogel.dimension.spawnParticle("minecraft:heart_particle", { ...vogel.location, y: vogel.location.y + 0.5 });
        vogel.dimension.playSound("mob.parrot.idle", vogel.location, { volume: 1, pitch: 1.9 });
    } catch (e) { /* egal */ }
    verbrauche(spieler);
    return true;
}

function verbrauche(spieler) {
    try {
        if (spieler.getGameMode?.() === "Creative" || spieler.getGameMode?.() === "creative") return;
        const inv = spieler.getComponent("minecraft:inventory")?.container;
        const platz = spieler.selectedSlotIndex ?? 0;
        const ding = inv?.getItem(platz);
        if (!ding) return;
        if (ding.amount > 1) { ding.amount -= 1; inv.setItem(platz, ding); } else inv.setItem(platz, undefined);
    } catch (e) { /* egal */ }
}

function namensschluessel(typ) {
    return typ.startsWith("minecraft:") ? `entity.${typ.slice(10)}.name` : `entity.${typ}.name`;
}

export function vogelName(vogel) {
    if (vogel.nameTag) return vogel.nameTag;
    let v = 0;
    try { v = vogel.getComponent("minecraft:variant")?.value ?? 0; } catch (e) { /* egal */ }
    return VOGELNAMEN[v] ?? VOGELNAMEN[0];
}

const warnPause = new Map();
const warnEnde = new Map();

/** Ein zahmer Vogel warnt vor Monstern: aufgeplustert, laut, und der
 *  Besitzer liest in der Leiste, was da kommt. */
export function warnTakt(vogel, jetzt) {
    if (warnEnde.has(vogel.id) && jetzt >= warnEnde.get(vogel.id)) {
        warnEnde.delete(vogel.id);
        try { vogel.setProperty("fynn:warnt", false); } catch (e) { /* egal */ }
    }
    if (!istZahm(vogel) || jetzt < (warnPause.get(vogel.id) ?? 0)) return undefined;
    let monster;
    try {
        monster = vogel.dimension.getEntities({ location: vogel.location, maxDistance: WARNEN.weite, families: ["monster"] })[0];
    } catch (e) { return undefined; }
    if (!monster) return undefined;
    warnPause.set(vogel.id, jetzt + WARNEN.pause);
    warnEnde.set(vogel.id, jetzt + WARNEN.dauer);
    try {
        vogel.setProperty("fynn:warnt", true);
        vogel.dimension.playSound("mob.parrot.idle", vogel.location, { volume: 2, pitch: 2 });
        const m = monster.location;
        vogel.dimension.spawnParticle("minecraft:villager_angry", { x: m.x, y: m.y + 2.2, z: m.z });
    } catch (e) { /* egal */ }
    const besitzerId = zaehmbar(vogel)?.tamedToPlayerId;
    const besitzer = besitzerId ? world.getAllPlayers().find((p) => p.id === besitzerId) : undefined;
    if (besitzer) {
        try {
            besitzer.onScreenDisplay.setActionBar({ rawtext: [
                { text: `§e${vogelName(vogel)} warnt: §c` }, { translate: namensschluessel(monster.typeId) },
                { text: " §ein der Nähe!" }] });
        } catch (e) { /* egal */ }
    }
    return monster.typeId;
}

// ------------------------------------------------------------ Schnecke

const ruhig = new Map();         // Id -> Takt, ab dem sie wieder herauskommt

function bedrohlich(w) {
    if (w.typeId === SCHNECKE || w.typeId === "minecraft:item" || w.typeId === "minecraft:xp_orb") return false;
    if (w.typeId === "minecraft:player") return !w.isSneaking;
    return true;
}

export function schneckenTakt(schnecke, jetzt) {
    let nah = [];
    try { nah = schnecke.dimension.getEntities({ location: schnecke.location, maxDistance: 3.5 }).filter(bedrohlich); } catch (e) { return "?"; }
    const drin = !!schnecke.getProperty?.("fynn:versteckt");
    if (nah.length) {
        ruhig.set(schnecke.id, jetzt + 60);
        if (!drin) {
            schnecke.triggerEvent("fynn:verstecken");
            return "versteckt sich";
        }
        return "bleibt drin";
    }
    if (drin && jetzt >= (ruhig.get(schnecke.id) ?? 0)) {
        schnecke.triggerEvent("fynn:hervorkommen");
        ruhig.delete(schnecke.id);
        return "kommt heraus";
    }
    return drin ? "bleibt drin" : "kriecht";
}

// ------------------------------------------------------------ Anbindung

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    try {
        if (e.eventId !== "fynn:ziel_erreicht") return;
        if (e.entity?.typeId === SPECHT) beginneHacken(e.entity, system.currentTick);
        else if (e.entity?.typeId === EICHHOERNCHEN) beginneKlettern(e.entity, system.currentTick);
    } catch (fehler) {
        console.warn(`Kleintiere, am Stamm: ${fehler}`);
    }
});

world.afterEvents.playerInteractWithEntity.subscribe((e) => {
    try {
        const was = e.beforeItemStack?.typeId;
        const ziel = e.target;
        if (!was || !ziel) return;
        if (ziel.typeId === SINGVOGEL && was === LARVE) larveFuettern(ziel, e.player);
        else if (ziel.typeId === EICHHOERNCHEN && FUTTER.has(was)) gefuettert(ziel, system.currentTick);
        else if (ziel.typeId === SCHNECKE && was === "minecraft:glass_bottle") {
            ziel.dimension.playSound("bottle.fill", ziel.location, { volume: 1, pitch: 0.8 });
        }
    } catch (fehler) {
        console.warn(`Kleintiere, anfassen: ${fehler}`);
    }
});

system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        if (hackende.size) hackTakt(jetzt);
        if (kletternde.size) kletterTakt(jetzt);
        if (fuetterungen.length) nussTakt(jetzt);
        if (jetzt % 10 !== 0) return;
        const welt = world.getDimension("overworld");
        for (const s of welt.getEntities({ type: SCHNECKE })) {
            try { schneckenTakt(s, jetzt); } catch (f) { /* diese ist gerade fort */ }
        }
        if (jetzt % 20 !== 0) return;
        for (const v of welt.getEntities({ type: SINGVOGEL })) {
            try { warnTakt(v, jetzt); } catch (f) { /* egal */ }
        }
        if (jetzt % 200 !== 0) return;
        for (const t of welt.getEntities({ type: EICHHOERNCHEN })) {
            try { grabTakt(t, jetzt); } catch (f) { /* egal */ }
        }
    } catch (fehler) {
        console.warn(`Kleintiere: ${fehler}`);
    }
}, 2);

// Wer gerade graebt, schaut nach, ob die Zeit um ist - sonst stuende der
// Setzling erst beim naechsten Rundgang in zehn Sekunden.
system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        for (const g of [...grabende.values()]) {
            if (jetzt >= g.ab) grabTakt(g.tier, jetzt);
        }
    } catch (fehler) {
        console.warn(`Kleintiere, graben: ${fehler}`);
    }
}, 10);
