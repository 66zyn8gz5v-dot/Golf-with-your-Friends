// Nester und Eier (4.85).
//
// Fynn: "Die Voegel, das Eichhoernchen sollen eigene Nester machen ... die
// in den Baeumen generieren ... da sollen sich Eier anlagern, die man dann
// auch klauen kann."
//
// Was hier geschieht:
//
// * Nester entstehen von selbst, wo Spieler unterwegs sind - wie das Obst:
//   Vogelnest und Kobel oben im Laub, die Spechthoehle in einem Stamm,
//   Adlerhorst und Greifennest hoch oben auf dem Fels. Jedes Stueck Land
//   (16 x 16) bekommt hoechstens einmal eines; das merkt sich die Welt.
// * Die Tiere bauen sich auch selbst eines, dort, wo sie leben - oder
//   ziehen in ein freies ein, das in der Naehe liegt. Wer ein Nest hat,
//   bleibt in seiner Naehe; Singvoegel und Spechte schlafen nachts darin.
// * Ist ein Elterntier in der Naehe, kommt ab und zu ein Ei dazu (beim
//   Eichhoernchen eine Haselnuss fuer den Vorrat).
// * Wer ein Ei nimmt, macht die Eltern wuetend: Singvoegel zetern, der
//   Adler stoesst herab, der Greif greift an.
// * Aus dem Greifenei schluepft ein junger Greif, der dem Spieler gehoert.
//
// Blocke, Modelle und Eier baut werkzeuge/nester_bauen.py.

import { world, system, BlockPermutation, ItemStack } from "@minecraft/server";

export const INHALT = "fynn:inhalt";
export const SEITE = "fynn:seite";
export const HOLZ = "fynn:holz";
// Die Baumarten der Spechthoehle, in der Reihenfolge von fynn:holz. Die
// Hoehle traegt die Rinde des Stamms, in den sie gehackt ist
// (werkzeuge/nester_bauen.py, HOLZARTEN).
// Die Pappel aus dem Herbstwald (Minecraft 1.26.50) steht hinten - so
// behalten die Hoehlen, die schon in einer Welt stehen, ihre Baumart.
export const HOLZARTEN = ["oak", "birch", "spruce", "jungle", "acacia", "dark_oak", "mangrove", "cherry", "pale_oak",
    "poplar"];
export function holzVon(typeId) {
    const m = /^minecraft:(.+)_log$/.exec(typeId ?? "");
    const i = m ? HOLZARTEN.indexOf(m[1]) : -1;
    return i < 0 ? 0 : i;
}

// Welches Nest wem gehoert und was darin liegt.
export const NESTER = {
    "fynn:vogelnest":    { ei: "fynn:vogelei",   max: 3, tiere: ["fynn:singvogel"] },
    "fynn:spechthoehle": { ei: "fynn:spechtei",  max: 3, tiere: ["fynn:specht"] },
    "fynn:kobel":        { ei: "fynn:nuss",      max: 3, tiere: ["fynn:eichhoernchen"] },
    "fynn:adlerhorst":   { ei: "fynn:adlerei",   max: 2, tiere: ["fynn:steinadler"] },
    "fynn:greifennest":  { ei: "fynn:greifenei", max: 1, tiere: ["fynn:greif"] },
};
/** Tier -> sein Nest. */
export const NEST_VON = Object.fromEntries(
    Object.entries(NESTER).flatMap(([nest, n]) => n.tiere.map((t) => [t, nest])));

// Wie weit ein Tier von seinem Nest weg sein darf, bevor es umkehrt - die
// grossen Jaeger haben ein weites Revier, die kleinen Voegel ein enges.
export const REVIER = {
    "fynn:singvogel": 20, "fynn:specht": 20, "fynn:eichhoernchen": 20,
    "fynn:steinadler": 48, "fynn:greif": 40,
};
// Wer beim Klauen angreift (die anderen zetern nur).
const VERTEIDIGER = new Set(["fynn:steinadler", "fynn:greif"]);

export const LEGEN = { weite: 16, chance: 0.5 };
export const SUCHE = { takt: 200, stellen: 30, weite: 32, hoehe: 14, chance: 0.3 };
export const BAUEN = { chance: 0.25, weite: 6, pause: 6000 };

const LAUB = /^minecraft:(oak|birch|spruce|jungle|dark_oak|acacia|cherry|mangrove|pale_oak|azalea|(orange|red|yellow)_poplar)_leaves$/;
const KOBELLAUB = /^minecraft:(oak|birch|spruce|dark_oak|pale_oak|(orange|red|yellow)_poplar)_leaves$/;
const STAMM = /^minecraft:(oak|birch|spruce|jungle|dark_oak|acacia|cherry|mangrove|pale_oak|poplar)_log$/;
const FELS = new Set(["minecraft:stone", "minecraft:granite", "minecraft:diorite", "minecraft:andesite",
    "minecraft:calcite", "minecraft:tuff", "minecraft:gravel", "minecraft:snow", "minecraft:snow_layer",
    "minecraft:grass_block", "minecraft:dirt", "minecraft:coarse_dirt", "minecraft:packed_ice",
    "minecraft:stone_bricks"]);
// Horste liegen oben: ab dieser Hoehe beginnt fuer Adler und Greif das Gebirge.
export const HORSTHOEHE = 95;

// Nord, West, Sued, Ost - in der Reihenfolge der Drehung im Block (fynn:seite).
export const RICHTUNGEN = [[0, -1], [-1, 0], [0, 1], [1, 0]];

const schluessel = (o) => `${Math.floor(o.x)},${Math.floor(o.y)},${Math.floor(o.z)}`;
function ausSchluessel(s) {
    const [x, y, z] = s.split(",").map(Number);
    return { x, y, z };
}

function blockBei(dim, o) {
    try { return dim.getBlock(o); } catch (e) { return undefined; }
}
function istLuft(b) {
    return !!b && (b.isAir ?? b.typeId === "minecraft:air");
}
/** Nur Laub, das an einem gewachsenen Baum haengt - nicht das, was jemand
 *  als Hecke gesetzt hat. */
function natuerlichesLaub(b, muster = LAUB) {
    if (!b || !muster.test(b.typeId)) return false;
    try {
        if (b.permutation?.getState?.("persistent_bit")) return false;
    } catch (e) { /* ohne Zustand gilt es als natuerlich */ }
    return true;
}

// ------------------------------------------------------------ Nester setzen

export function setzeNest(dim, o, nest, inhalt = 0, seite = undefined, holz = undefined) {
    const b = blockBei(dim, o);
    if (!b) return false;
    const zustaende = { [INHALT]: Math.min(inhalt, NESTER[nest].max) };
    if (seite !== undefined) zustaende[SEITE] = seite;
    if (holz !== undefined) zustaende[HOLZ] = holz;
    b.setPermutation(BlockPermutation.resolve(nest, zustaende));
    bekannt.set(schluessel(o), nest);
    return true;
}

/** Oben auf dem Laub: ein freier Platz ueber einem natuerlichen Blatt, und
 *  darueber noch Luft - das Nest liegt auf der Krone, nicht darin. */
export function platzAufLaub(dim, o, muster = LAUB) {
    const blatt = blockBei(dim, o);
    if (!natuerlichesLaub(blatt, muster)) return undefined;
    const ort = { x: o.x, y: o.y + 1, z: o.z };
    if (!istLuft(blockBei(dim, ort)) || !istLuft(blockBei(dim, { x: o.x, y: o.y + 2, z: o.z }))) return undefined;
    return ort;
}

/** Ein Stamm mit einer freien Seite, ueber dem Laub waechst - in einen
 *  Balken im Haus hackt kein Specht. Liefert die Seite, in die das Loch
 *  zeigt. */
export function platzImStamm(dim, o) {
    const b = blockBei(dim, o);
    if (!b || !STAMM.test(b.typeId)) return undefined;
    const unten = blockBei(dim, { x: o.x, y: o.y - 1, z: o.z });
    if (!unten || !STAMM.test(unten.typeId)) return undefined;
    let krone = false;
    for (let dy = 1; dy <= 8 && !krone; dy++) {
        const oben = blockBei(dim, { x: o.x, y: o.y + dy, z: o.z });
        if (natuerlichesLaub(oben)) krone = true;
        else if (!oben || !STAMM.test(oben.typeId)) {
            // Der Stamm endet - die Krone kann gleich daneben haengen.
            for (const [dx, dz] of RICHTUNGEN) {
                if (natuerlichesLaub(blockBei(dim, { x: o.x + dx, y: o.y + dy, z: o.z + dz }))) krone = true;
            }
            break;
        }
    }
    if (!krone) return undefined;
    for (let s = 0; s < 4; s++) {
        const [dx, dz] = RICHTUNGEN[s];
        if (istLuft(blockBei(dim, { x: o.x + dx, y: o.y, z: o.z + dz }))) return { ort: { ...o }, seite: s, holz: holzVon(b.typeId) };
    }
    return undefined;
}

/** Hoch oben auf dem Fels, mit freiem Himmel darueber. */
export function platzAufFels(dim, o) {
    if (o.y < HORSTHOEHE) return undefined;
    const b = blockBei(dim, o);
    if (!b || !FELS.has(b.typeId)) return undefined;
    const ort = { x: o.x, y: o.y + 1, z: o.z };
    for (let dy = 1; dy <= 3; dy++) {
        if (!istLuft(blockBei(dim, { x: o.x, y: o.y + dy, z: o.z }))) return undefined;
    }
    return ort;
}

/** Welches Nest an diese Stelle passt - oder keines. */
export function nestFuer(dim, o, wurf = Math.random) {
    const b = blockBei(dim, o);
    if (!b) return undefined;
    if (LAUB.test(b.typeId)) {
        const kobel = KOBELLAUB.test(b.typeId) && wurf() < 0.35;
        const ort = platzAufLaub(dim, o);
        return ort ? { nest: kobel ? "fynn:kobel" : "fynn:vogelnest", ort } : undefined;
    }
    if (STAMM.test(b.typeId)) {
        const p = platzImStamm(dim, o);
        return p ? { nest: "fynn:spechthoehle", ort: p.ort, seite: p.seite, holz: p.holz } : undefined;
    }
    const ort = platzAufFels(dim, o);
    if (!ort) return undefined;
    return { nest: wurf() < 0.15 ? "fynn:greifennest" : "fynn:adlerhorst", ort };
}

// ------------------------------------------------------------ Nester in der Welt

// Welche Landstuecke schon ein Nest haben. Nur einmal je Stueck - sonst
// staende nach ein paar Stunden in jedem Baum eines.
const FELDER = "fynn:nestfelder";
const HOECHSTENS_FELDER = 2500;
let felder;
function feldListe() {
    if (felder) return felder;
    try {
        const roh = world.getDynamicProperty(FELDER);
        felder = new Set(typeof roh === "string" && roh ? roh.split(";") : []);
    } catch (e) {
        felder = new Set();
    }
    return felder;
}
export function feldVon(o) {
    return `${Math.floor(o.x / 16)}:${Math.floor(o.z / 16)}`;
}
function feldMerken(f) {
    const liste = feldListe();
    liste.add(f);
    if (liste.size > HOECHSTENS_FELDER) {
        // Die aeltesten vergessen: Dort darf dann irgendwann ein zweites
        // Nest stehen - besser als eine Liste, die nicht mehr in die Welt passt.
        const alle = [...liste];
        felder = new Set(alle.slice(alle.length / 2));
    }
    try { world.setDynamicProperty(FELDER, [...felder].join(";")); } catch (e) { /* egal */ }
}
export function feldVergessen() { felder = new Set(); }

/** Ein paar Stellen um den Spieler absuchen und, wo es passt, ein Nest
 *  mit ein, zwei Eiern hineinsetzen. */
export function suche(spieler, wurf = Math.random) {
    const dim = spieler.dimension;
    const mitte = spieler.location;
    for (let i = 0; i < SUCHE.stellen; i++) {
        const o = {
            x: Math.floor(mitte.x + (wurf() * 2 - 1) * SUCHE.weite),
            y: Math.floor(mitte.y + (wurf() * 2 - 1) * SUCHE.hoehe),
            z: Math.floor(mitte.z + (wurf() * 2 - 1) * SUCHE.weite),
        };
        const f = feldVon(o);
        if (feldListe().has(f)) continue;
        const p = nestFuer(dim, o, wurf);
        if (!p) continue;
        // Gefunden: Das Stueck ist damit erledigt, ob hier nun eines
        // hinkommt oder nicht.
        feldMerken(f);
        if (wurf() >= SUCHE.chance) return undefined;
        const inhalt = Math.min(NESTER[p.nest].max, 1 + (wurf() < 0.4 ? 1 : 0));
        setzeNest(dim, p.ort, p.nest, inhalt, p.seite, p.holz);
        return p;
    }
    return undefined;
}

// ------------------------------------------------------------ Eier legen und klauen

// Nester, die gerade geladen sind - die, deren Takt einmal lief, und die,
// die hier gesetzt wurden. Tiere ziehen in eines davon ein.
export const bekannt = new Map();

/** Ein Takt am Nest: Ist ein Elterntier in der Naehe, kommt ein Ei dazu. */
export function legen(block, wurf = Math.random) {
    const nest = block.typeId;
    const n = NESTER[nest];
    if (!n) return "fremd";
    bekannt.set(schluessel(block.location), nest);
    const inhalt = block.permutation.getState(INHALT) ?? 0;
    if (inhalt >= n.max) return "voll";
    let eltern = [];
    try {
        eltern = n.tiere.flatMap((t) => block.dimension.getEntities({
            type: t, location: block.center(), maxDistance: LEGEN.weite }));
    } catch (e) { /* ohne Tiere keine Eier */ }
    eltern = eltern.filter((t) => !istJung(t));
    if (!eltern.length) return "verlassen";
    if (wurf() >= LEGEN.chance) return "wartet";
    block.setPermutation(block.permutation.withState(INHALT, inhalt + 1));
    try { block.dimension.playSound("random.pop", block.center(), { volume: 0.5, pitch: 1.4 }); } catch (e) { /* egal */ }
    return "gelegt";
}

function istJung(t) {
    try { return !!t.getComponent?.("minecraft:is_baby"); } catch (e) { return false; }
}
function istZahm(t) {
    try { return !!t.getComponent?.("minecraft:is_tamed"); } catch (e) { return false; }
}

/** Ein Ei nehmen. Die Eltern merken es. */
export function klauen(block, spieler) {
    const nest = block.typeId;
    const n = NESTER[nest];
    if (!n) return false;
    const inhalt = block.permutation.getState(INHALT) ?? 0;
    if (inhalt <= 0) {
        spieler?.onScreenDisplay?.setActionBar(nest === "fynn:kobel" ? "§7Der Kobel ist leer." : "§7Das Nest ist leer.");
        return false;
    }
    block.setPermutation(block.permutation.withState(INHALT, inhalt - 1));
    const oben = block.center();
    block.dimension.spawnItem(new ItemStack(n.ei, 1), { x: oben.x, y: oben.y + 0.3, z: oben.z });
    try { block.dimension.playSound("block.sweet_berry_bush.pick", oben, { volume: 0.8, pitch: 1.3 }); } catch (e) { /* egal */ }
    elternMerkenEs(block, spieler);
    return true;
}

/** Wer in der Naehe wohnt, wehrt sich: Die Grossen greifen an, die Kleinen
 *  zetern. */
export function elternMerkenEs(block, spieler) {
    const n = NESTER[block.typeId];
    const o = block.center();
    let eltern = [];
    try {
        eltern = n.tiere.flatMap((t) => block.dimension.getEntities({ type: t, location: o, maxDistance: 32 }));
    } catch (e) { return 0; }
    let wuetend = 0;
    for (const t of eltern) {
        if (istZahm(t) || istJung(t)) continue;
        if (VERTEIDIGER.has(t.typeId)) {
            // Ein kleiner Stoss vom Spieler: Dann haelt das Tier ihn fuer den
            // Angreifer (hurt_by_target) - anders laesst sich einem Tier
            // kein Ziel geben.
            try { t.applyDamage(1, { cause: "entityAttack", damagingEntity: spieler }); wuetend++; } catch (e) { /* egal */ }
            try { t.dimension.playSound("mob.parrot.hurt", t.location, { volume: 2, pitch: t.typeId === "fynn:greif" ? 0.5 : 0.7 }); }
            catch (e) { /* egal */ }
        } else {
            try {
                t.dimension.playSound(t.typeId === "fynn:eichhoernchen" ? "mob.fox.screech" : "mob.parrot.idle",
                                      t.location, { volume: 2, pitch: 1.9 });
                t.dimension.spawnParticle("minecraft:villager_angry",
                                          { x: t.location.x, y: t.location.y + 0.8, z: t.location.z });
            } catch (e) { /* egal */ }
        }
    }
    if (wuetend) {
        spieler?.onScreenDisplay?.setActionBar(eltern.some((t) => t.typeId === "fynn:greif")
            ? "§cDer Greif hat dich gesehen!" : "§cDer Adler verteidigt seinen Horst!");
    }
    return wuetend;
}

/** Abgebaut: Die Eier fallen mit heraus - und aus der Spechthoehle der
 *  Stamm, der sie einmal war, in seiner Baumart. */
export function abgebaut(dim, ort, permutation, spieler = undefined) {
    const typ = permutation?.type?.id;
    const n = NESTER[typ];
    bekannt.delete(schluessel(ort));
    if (!n) return 0;
    const mitte = { x: ort.x + 0.5, y: ort.y + 0.5, z: ort.z + 0.5 };
    const inhalt = permutation.getState(INHALT) ?? 0;
    if (inhalt > 0) dim.spawnItem(new ItemStack(n.ei, inhalt), mitte);
    if (typ === "fynn:spechthoehle" && !kreativ(spieler)) {
        const holz = HOLZARTEN[permutation.getState(HOLZ) ?? 0] ?? "oak";
        dim.spawnItem(new ItemStack(`minecraft:${holz}_log`, 1), mitte);
    }
    return inhalt;
}

// ------------------------------------------------------------ Tiere und ihr Nest

const NEST = "fynn:nest";              // am Tier: wo sein Nest steht
const GEBAUT = "fynn:nest_gebaut";     // am Tier: wann es zuletzt gebaut hat

export function nestVon(tier) {
    try {
        const s = tier.getDynamicProperty(NEST);
        return typeof s === "string" ? ausSchluessel(s) : undefined;
    } catch (e) {
        return undefined;
    }
}

/** Steht das Nest noch? Ungeladen zaehlt als ja - man sieht es nur nicht. */
export function nestSteht(tier, o) {
    let b;
    try { b = tier.dimension.getBlock(o); } catch (e) { return true; }
    if (!b) return true;
    return b.typeId === NEST_VON[tier.typeId];
}

/** Ein freies Nest in der Naehe suchen - oder selbst eines bauen. */
export function nestFinden(tier, jetzt, wurf = Math.random) {
    const art = NEST_VON[tier.typeId];
    const o = tier.location;
    // Erst einziehen: ein Nest der eigenen Art in der Naehe.
    let bestes, abstand = 17;
    for (const [s, nest] of bekannt) {
        if (nest !== art) continue;
        const p = ausSchluessel(s);
        const d = Math.hypot(p.x + 0.5 - o.x, p.z + 0.5 - o.z);
        if (d >= abstand || Math.abs(p.y - o.y) >= 40) continue;
        // Was hier steht, kann laengst weg sein (Feuer, Explosion) - nachsehen.
        if (!nestSteht(tier, p)) { bekannt.delete(s); continue; }
        bestes = p; abstand = d;
    }
    if (bestes) return merken(tier, bestes, "eingezogen");
    // Sonst bauen - nicht jedes Mal, und nicht gleich wieder, wenn das
    // letzte zerstoert wurde.
    const zuletzt = Number(tier.getDynamicProperty?.(GEBAUT) ?? -Infinity);
    if (jetzt - zuletzt < BAUEN.pause || wurf() >= BAUEN.chance) return undefined;
    const p = bauplatz(tier, wurf);
    if (!p) return undefined;
    setzeNest(tier.dimension, p.ort, art, 0, p.seite, p.holz);
    try { tier.setDynamicProperty(GEBAUT, jetzt); } catch (e) { /* egal */ }
    try { tier.dimension.playSound(art === "fynn:spechthoehle" ? "hit.wood" : "block.bamboo.place", p.ort,
                                   { volume: 0.8, pitch: 1.2 }); } catch (e) { /* egal */ }
    return merken(tier, p.ort, "gebaut");
}

function merken(tier, o, wie) {
    try { tier.setDynamicProperty(NEST, schluessel(o)); } catch (e) { /* egal */ }
    return { ort: o, wie };
}

/** Wo dieses Tier sein Nest baut. Gesucht wird in Saeulen: erst gleich
 *  neben dem Tier (der Specht haengt ja schon am Stamm), dann ringsum. Wer
 *  auf dem Laub baut, schaut von oben auf die Krone, Adler und Greif von
 *  oben auf den Fels - so trifft die Suche, statt im Leeren zu stochern. */
export function bauplatz(tier, wurf = Math.random) {
    const dim = tier.dimension;
    const art = NEST_VON[tier.typeId];
    const o = { x: Math.floor(tier.location.x), y: Math.floor(tier.location.y), z: Math.floor(tier.location.z) };
    const saeulen = [[0, 0], ...RICHTUNGEN];
    for (let i = 0; i < 16; i++) {
        saeulen.push([Math.round((wurf() * 2 - 1) * BAUEN.weite), Math.round((wurf() * 2 - 1) * BAUEN.weite)]);
    }
    const horst = art === "fynn:adlerhorst" || art === "fynn:greifennest";
    for (const [dx, dz] of saeulen) {
        const x = o.x + dx, z = o.z + dz;
        if (art === "fynn:spechthoehle") {
            for (let y = o.y - 3; y <= o.y + 6; y++) {
                const s = platzImStamm(dim, { x, y, z });
                if (s) return s;
            }
            continue;
        }
        // Von oben herab bis zum ersten Block, der keine Luft ist.
        for (let y = o.y + (horst ? 4 : 8); y > o.y - (horst ? 48 : 8); y--) {
            const b = blockBei(dim, { x, y, z });
            if (!b) break;
            if (istLuft(b)) continue;
            const ort = horst ? platzAufFels(dim, { x, y, z })
                : platzAufLaub(dim, { x, y, z }, art === "fynn:kobel" ? KOBELLAUB : LAUB);
            if (ort) return { ort };
            break;
        }
    }
    return undefined;
}

/** Ein Takt fuer ein Tier mit Nest: Nest suchen, in der Naehe bleiben,
 *  nachts heimkehren. */
export function heimTakt(tier, jetzt, nacht, wurf = Math.random) {
    if (istZahm(tier) || istJung(tier)) return "frei";
    let o = nestVon(tier);
    if (o && !nestSteht(tier, o)) {
        // Das Nest ist weg (geklaut, abgebaut): Das Tier sucht sich ein neues.
        bekannt.delete(schluessel(o));
        try { tier.setDynamicProperty(NEST, undefined); } catch (e) { /* egal */ }
        try { tier.setDynamicProperty(GEBAUT, jetzt); } catch (e) { /* egal */ }
        o = undefined;
    }
    if (!o) return nestFinden(tier, jetzt, wurf) ? "nest" : "sucht";
    const t = tier.location;
    const ziel = { x: o.x + 0.5, y: o.y + 0.2, z: o.z + 0.5 };
    const d = Math.hypot(ziel.x - t.x, ziel.z - t.z);
    const kleinvogel = tier.typeId === "fynn:singvogel" || tier.typeId === "fynn:specht";
    if (nacht && kleinvogel && d < 32) {
        // Nachts sitzen die kleinen Voegel im Nest - der Specht vor seinem Loch.
        if (d < 0.8 && Math.abs(ziel.y - t.y) < 1) return "schlaeft";
        let platz = ziel;
        if (tier.typeId === "fynn:specht") {
            const s = blockBei(tier.dimension, o)?.permutation?.getState?.(SEITE) ?? 0;
            const [dx, dz] = RICHTUNGEN[s];
            platz = { x: ziel.x + dx * 0.72, y: o.y + 0.2, z: ziel.z + dz * 0.72 };
        }
        try { tier.teleport(platz, { facingLocation: { x: ziel.x, y: platz.y, z: ziel.z } }); } catch (e) { /* egal */ }
        return "schlaeft";
    }
    if (d <= (REVIER[tier.typeId] ?? 20)) return "daheim";
    // Zu weit weg: ein Schubs Richtung Nest. Kein Pfad, aber genug, damit
    // es umkehrt - den Rest laeuft oder fliegt es selbst.
    const kraft = tier.typeId === "fynn:steinadler" || tier.typeId === "fynn:greif" ? 0.6 : 0.3;
    try {
        tier.applyImpulse({ x: (ziel.x - t.x) / d * kraft, y: kleinvogel ? 0.15 : 0.05, z: (ziel.z - t.z) / d * kraft });
    } catch (e) { /* egal */ }
    return "kehrt um";
}

// ------------------------------------------------------------ Das Greifenei

export const GREIFENEI = "fynn:greifenei";
export const GREIF = "fynn:greif";
// Mit diesem Ereignis erscheint der Greif als Kueken statt erwachsen und wild.
export const SCHLUEPFEN = "fynn:schluepft";

/** Aus dem Ei schluepft ein junger Greif - vor dem Spieler, und er gehoert ihm. */
export function schluepfen(spieler) {
    const o = spieler.location;
    let b = { x: 0, z: 1 };
    try {
        const v = spieler.getViewDirection();
        const l = Math.hypot(v.x, v.z) || 1;
        b = { x: v.x / l, z: v.z / l };
    } catch (e) { /* geradeaus */ }
    const ort = { x: o.x + b.x * 1.5, y: o.y, z: o.z + b.z * 1.5 };
    const dim = spieler.dimension;
    const kueken = dim.spawnEntity(`${GREIF}<${SCHLUEPFEN}>`, ort);
    try {
        dim.playSound("block.turtle_egg.crack", ort, { volume: 1, pitch: 0.8 });
        dim.spawnParticle("minecraft:heart_particle", { x: ort.x, y: ort.y + 1, z: ort.z });
    } catch (e) { /* egal */ }
    // Zaehmen geht erst, wenn die Gruppen des neuen Tiers stehen.
    system.runTimeout(() => zaehmen(kueken, spieler), 2);
    if (!kreativ(spieler)) verbrauchen(spieler, GREIFENEI);
    spieler.onScreenDisplay?.setActionBar("§6Ein junger Greif ist geschlüpft – er gehört dir! §7Mit rohem Fleisch wächst er schneller.");
    return kueken;
}

export function zaehmen(kueken, spieler) {
    try {
        const z = kueken.getComponent("minecraft:tameable");
        if (z?.tame?.(spieler)) return true;
    } catch (e) { /* dann ohne Besitzer */ }
    try { kueken.triggerEvent("fynn:gezaehmt"); } catch (e) { /* egal */ }
    return false;
}

function kreativ(spieler) {
    try { return spieler?.getGameMode?.() === "Creative"; } catch (e) { return false; }
}
function verbrauchen(spieler, typ) {
    try {
        const inv = spieler.getComponent("minecraft:inventory")?.container;
        const platz = spieler.selectedSlotIndex;
        const ding = inv?.getItem(platz);
        if (ding?.typeId !== typ) return;
        if (ding.amount > 1) { ding.amount -= 1; inv.setItem(platz, ding); } else inv.setItem(platz, undefined);
    } catch (e) { /* egal */ }
}

/** Auf ein Kueken setzt man sich nicht - nur Fleisch darf es bekommen. */
export function darfReiten(greif, ding) {
    if (greif?.typeId !== GREIF || !istJung(greif)) return true;
    return /beef|mutton|porkchop|chicken|rabbit|fleisch/.test(ding?.typeId ?? "");
}

// ------------------------------------------------------------ Anmelden

system.beforeEvents.startup.subscribe((e) => {
    e.blockComponentRegistry.registerCustomComponent("fynn:nest", {
        onTick(ereignis) {
            try { legen(ereignis.block); } catch (fehler) { console.warn(`Nest, Legen: ${fehler}`); }
        },
        onPlayerInteract(ereignis) {
            system.run(() => {
                try { klauen(ereignis.block, ereignis.player); } catch (fehler) { console.warn(`Nest, Klauen: ${fehler}`); }
            });
        },
    });
});

world.afterEvents.playerBreakBlock.subscribe((e) => {
    try {
        abbauBemerkt(e);
        abgebaut(e.dimension, e.block.location, e.brokenBlockPermutation, e.player);
    } catch (fehler) {
        console.warn(`Nest, Abbauen: ${fehler}`);
    }
});
// Wer ein ganzes Nest abbaut, klaut auch - die Eltern merken es genauso.
function abbauBemerkt(e) {
    const typ = e.brokenBlockPermutation?.type?.id;
    if (!NESTER[typ]) return;
    elternMerkenEs({ typeId: typ, dimension: e.dimension, center: () => ({
        x: e.block.location.x + 0.5, y: e.block.location.y + 0.5, z: e.block.location.z + 0.5 }) }, e.player);
}

world.afterEvents.playerPlaceBlock.subscribe((e) => {
    // Ein gesetztes Nest ist gleich bekannt - Tiere koennen einziehen.
    try { if (NESTER[e.block.typeId]) bekannt.set(schluessel(e.block.location), e.block.typeId); } catch (f) { /* egal */ }
});

world.afterEvents.itemUse.subscribe((e) => {
    try {
        if (e.itemStack?.typeId === GREIFENEI) schluepfen(e.source);
    } catch (fehler) {
        console.warn(`Greifenei: ${fehler}`);
    }
});

world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    try {
        if (!darfReiten(e.target, e.itemStack)) {
            e.cancel = true;
            system.run(() => e.player.onScreenDisplay?.setActionBar("§7Der junge Greif ist noch zu klein zum Reiten."));
        }
    } catch (f) { /* egal */ }
});

let runde = 0;
system.runInterval(() => {
    try {
        const r = runde++;
        const jetzt = system.currentTick;
        const welt = world.getDimension("overworld");
        if (r % 2 === 0) {
            for (const s of world.getAllPlayers()) {
                if (s.dimension?.id !== "minecraft:overworld") continue;
                try { suche(s); } catch (f) { /* egal */ }
            }
        }
        let nacht = false;
        try { const z = world.getTimeOfDay(); nacht = z >= 13000 && z <= 23000; } catch (f) { /* egal */ }
        for (const typ of Object.keys(NEST_VON)) {
            for (const t of welt.getEntities({ type: typ })) {
                try { heimTakt(t, jetzt, nacht); } catch (f) { /* egal */ }
            }
        }
    } catch (fehler) {
        console.warn(`Nester: ${fehler}`);
    }
}, SUCHE.takt / 2);
