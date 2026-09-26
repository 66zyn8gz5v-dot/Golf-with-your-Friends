// Die aufgeladenen Angriffe von Ritter, Assassine und Bogenschuetze,
// dazu die Regel, dass die Dolche beide Haende brauchen.
//
// Aufgeladen wird ueberall gleich, wie beim Degen und den Feuerstaeben:
// Waffe in die Hand, ducken, geduckt bleiben, bis es klingt - beim
// Aufstehen geht der Angriff los. Gezaehlt wird der Zustand "duckt sich",
// nicht die Taste: Auf dem iPad meldet Minecraft die Taste nur fuer einen
// Tick.
//
// Die Angriffe gehoeren zur Rolle. Wer eine andere Rolle hat, laedt gar
// nicht erst - und bekommt auch keinen Hinweis. Ducken mit dem Schwert in
// der Hand ist sonst alltaeglich (an Kanten, beim Bruecken bauen), und
// jedes Mal eine Meldung waere laestig. Nur wer die Rolle hat und zu
// wenig Kraft, bekommt das gesagt.

import { world, system } from "@minecraft/server";
import { angriffErlaubt, hinweis, rolleVon, verbrauche } from "./rollen.js";

export const DOLCHE = new Set([
    "fynn:eisendolche", "fynn:silberdolche", "fynn:stahldolche",
    "fynn:elektrumdolche", "fynn:diamantdolche", "fynn:netheritdolche",
]);

// Alle Schwerter ausser dem Degen: Der hat seinen eigenen Sprungstoss.
const SCHWERTER = new Set([
    "minecraft:wooden_sword", "minecraft:stone_sword", "minecraft:iron_sword",
    "minecraft:golden_sword", "minecraft:diamond_sword", "minecraft:netherite_sword",
    "minecraft:copper_sword",
    "fynn:ritterschwert", "fynn:eisenklinge", "fynn:silberklinge",
    "fynn:elektrumklinge", "fynn:sternenklinge",
]);

const BOEGEN = new Set(["minecraft:bow", "minecraft:crossbow", "fynn:sturmbogen"]);

// Was von einem Angriff nie getroffen wird: Gegenstaende am Boden,
// Erfahrung, Geschosse - und Mitspieler. Ein Wirbelschlag unter Freunden
// soll keinen Streit ausloesen.
const NIE_TREFFEN = ["minecraft:item", "minecraft:xp_orb", "minecraft:arrow",
    "fynn:feuerball", "minecraft:player"];

const WIRBEL_SCHADEN = 7;
const WIRBEL_WEITE = 3.5;       // Bloecke rund um den Ritter
const SPRUNG_WEITE = 10;        // so weit sieht der Assassine sein Ziel
const HINTERHALT = 10;          // Schaden von hinten: fuenf Herzen
const SPERRE = 20;              // Ticks zwischen zwei Angriffen
const FAECHER = [-16, -8, 0, 8, 16];    // Grad links und rechts der Blickrichtung
const PFEIL_TEMPO = 3.0;        // so schnell wie ein voll gespannter Bogen
const PFEIL_LEBEN = 60;         // Ticks, dann sind die Hagelpfeile weg

const ERDBEBEN_WEITE = 5;
const ERDBEBEN_SCHADEN = 6;

const ANGRIFFE = [
    {
        // Der Kriegshammer ist das Werkzeug des Ritters fuer Meuten: Er
        // laedt laenger und kostet mehr als der Wirbelschlag, reicht aber
        // weiter und wirft alles in die Luft.
        name: "Erdbeben", rolle: "ritter", ladezeit: 25, kosten: 50,
        passt: (id) => id === "fynn:kriegshammer", los: erdbeben,
    },
    {
        name: "Wirbelschlag", rolle: "ritter", ladezeit: 20, kosten: 40,
        passt: (id) => SCHWERTER.has(id), los: wirbelschlag,
    },
    {
        // Kuerzer geladen als der Wirbel: Der Assassine ist schnell,
        // und er laedt im Schatten - geduckt ist er ohnehin unsichtbar.
        name: "Schattensprung", rolle: "assassine", ladezeit: 15, kosten: 35,
        passt: (id) => DOLCHE.has(id), los: schattensprung,
    },
    {
        name: "Pfeilhagel", rolle: "bogenschuetze", ladezeit: 20, kosten: 40,
        passt: (id) => BOEGEN.has(id), los: pfeilhagel,
    },
];

function inDerHand(spieler) {
    return spieler.getComponent("minecraft:equippable")?.getEquipment("Mainhand")?.typeId;
}

function lebt(wesen) {
    try {
        return typeof wesen.isValid === "function" ? wesen.isValid() : !!wesen.isValid;
    } catch (fehler) {
        return false;
    }
}

function waagerecht(v) {
    const l = Math.hypot(v.x, v.z);
    return l > 0.001 ? { x: v.x / l, z: v.z / l } : undefined;
}

// ------------------------------------------------------------ Laden

const laden = new Map();        // Spieler -> { angriff, stand }
const letzter = new Map();

system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try {
            const angriff = ANGRIFFE.find((a) => a.passt(inDerHand(spieler)));
            const lauf = laden.get(spieler.id);
            if (!angriff || rolleVon(spieler) !== angriff.rolle) {
                laden.delete(spieler.id);
                continue;
            }
            if (spieler.isSneaking) {
                const stand = (lauf?.angriff === angriff ? lauf.stand : 0) + 1;
                laden.set(spieler.id, { angriff, stand });
                if (stand === angriff.ladezeit && angriffErlaubt(spieler, angriff.rolle, angriff.kosten)) {
                    spieler.dimension.playSound("random.orb", spieler.location, { volume: 0.5, pitch: 1.3 });
                    hinweis(spieler, `§e» ${angriff.name} bereit «`, 30);
                }
                continue;
            }
            laden.delete(spieler.id);
            if (!lauf || lauf.angriff !== angriff || lauf.stand < angriff.ladezeit) continue;
            if (system.currentTick - (letzter.get(spieler.id) ?? -SPERRE) < SPERRE) continue;
            if (!angriffErlaubt(spieler, angriff.rolle, angriff.kosten, true)) continue;
            letzter.set(spieler.id, system.currentTick);
            verbrauche(spieler, angriff.kosten);
            angriff.los(spieler);
        } catch (fehler) {
            console.warn(`Kampf, Laden: ${fehler}`);
        }
    }
}, 1);

// ------------------------------------------------------ Wirbelschlag

/**
 * Der Ritter dreht sich mit dem Schwert einmal um sich selbst: Alles in
 * dreieinhalb Bloecken Umkreis nimmt Schaden und fliegt nach aussen.
 * Gegen eine Meute, die ihn umringt - dafuer ist der Ritter gebaut.
 */
function wirbelschlag(spieler) {
    const ort = spieler.location;
    const dimension = spieler.dimension;
    const ziele = dimension.getEntities({
        location: ort, maxDistance: WIRBEL_WEITE,
        excludeTypes: NIE_TREFFEN, excludeFamilies: ["inanimate"],
    });
    for (const ziel of ziele) {
        if (ziel.id === spieler.id) continue;
        ziel.applyDamage(WIRBEL_SCHADEN, { cause: "entityAttack", damagingEntity: spieler });
        const weg = waagerecht({ x: ziel.location.x - ort.x, z: ziel.location.z - ort.z })
            ?? { x: 0, z: 1 };
        ziel.applyKnockback({ x: weg.x * 1.2, z: weg.z * 1.2 }, 0.35);
    }
    // Ein Ring aus Funken auf Hueft- und Brusthoehe zeigt, wie weit er
    // reicht.
    for (let i = 0; i < 16; i++) {
        const winkel = (i / 16) * Math.PI * 2;
        dimension.spawnParticle("minecraft:critical_hit_emitter", {
            x: ort.x + Math.cos(winkel) * 2.2,
            y: ort.y + (i % 2 ? 0.8 : 1.2),
            z: ort.z + Math.sin(winkel) * 2.2,
        });
    }
    dimension.playSound("mob.irongolem.throw", ort, { volume: 0.9, pitch: 0.7 });
}

// ---------------------------------------------------------- Erdbeben

/**
 * Der Ritter schlaegt den Hammer auf den Boden: Alles in fuenf Bloecken
 * Umkreis nimmt Schaden, fliegt hoch und ein Stueck nach aussen und ist
 * danach kurz benommen (langsamer).
 */
function erdbeben(spieler) {
    const ort = spieler.location;
    const dimension = spieler.dimension;
    for (const ziel of dimension.getEntities({
        location: ort, maxDistance: ERDBEBEN_WEITE,
        excludeTypes: NIE_TREFFEN, excludeFamilies: ["inanimate"],
    })) {
        if (ziel.id === spieler.id) continue;
        ziel.applyDamage(ERDBEBEN_SCHADEN, { cause: "entityAttack", damagingEntity: spieler });
        const weg = waagerecht({ x: ziel.location.x - ort.x, z: ziel.location.z - ort.z }) ?? { x: 0, z: 1 };
        ziel.applyKnockback({ x: weg.x * 0.6, z: weg.z * 0.6 }, 0.9);
        ziel.addEffect("slowness", 60, { amplifier: 1 });
    }
    // Staub in zwei Ringen am Boden, dazu Minecrafts Brueller-Welle.
    for (const r of [1.5, 3.5]) {
        for (let i = 0; i < 12; i++) {
            const winkel = (i / 12) * Math.PI * 2;
            dimension.spawnParticle("minecraft:basic_smoke_particle", {
                x: ort.x + Math.cos(winkel) * r, y: ort.y + 0.2, z: ort.z + Math.sin(winkel) * r,
            });
        }
    }
    dimension.spawnParticle("minecraft:knockback_roar_particle", { x: ort.x, y: ort.y + 0.5, z: ort.z });
    dimension.playSound("random.explode", ort, { volume: 0.7, pitch: 0.6 });
}

// ---------------------------------------------------- Schattensprung

function rauch(dimension, ort) {
    for (let i = 0; i < 8; i++) {
        dimension.spawnParticle("minecraft:basic_smoke_particle", {
            x: ort.x + (Math.random() - 0.5) * 0.8,
            y: ort.y + 0.3 + Math.random() * 1.4,
            z: ort.z + (Math.random() - 0.5) * 0.8,
        });
    }
}

/**
 * Der Assassine sucht, wen er ansieht - bis zehn Bloecke weit -, und
 * steht im naechsten Augenblick hinter ihm. Der Stich von hinten trifft
 * mit fuenf Herzen.
 *
 * Ist hinter dem Ziel eine Wand, bleibt er stehen und sticht von vorn,
 * mit dem gewoehnlichen Schaden seiner Dolche. Sieht er niemanden an,
 * macht er einen kurzen Satz nach vorn - verschwendet ist die Kraft dann
 * trotzdem nicht ganz.
 */
function schattensprung(spieler) {
    const dimension = spieler.dimension;
    const blick = spieler.getViewDirection();
    const treffer = dimension.getEntitiesFromRay(spieler.getHeadLocation(), blick, {
        maxDistance: SPRUNG_WEITE, excludeTypes: NIE_TREFFEN, excludeFamilies: ["inanimate"],
    }).filter((t) => t.entity.id !== spieler.id)
        .sort((a, b) => a.distance - b.distance)[0];

    rauch(dimension, spieler.location);
    dimension.playSound("mob.endermen.portal", spieler.location, { volume: 0.7, pitch: 1.5 });

    if (!treffer) {
        const vor = waagerecht(blick) ?? { x: 0, z: 1 };
        spieler.applyKnockback({ x: vor.x * 1.8, z: vor.z * 1.8 }, 0.2);
        return;
    }

    const ziel = treffer.entity;
    // "Hinten" ist, wohin das Ziel nicht schaut. Schaut es senkrecht nach
    // oben oder unten, zaehlt die eigene Blickrichtung.
    const sieht = waagerecht(ziel.getViewDirection()) ?? waagerecht(blick) ?? { x: 0, z: 1 };
    const hinter = {
        x: ziel.location.x - sieht.x * 1.3,
        y: ziel.location.y,
        z: ziel.location.z - sieht.z * 1.3,
    };
    const geschafft = spieler.tryTeleport(hinter, {
        checkForBlocks: true,
        facingLocation: { x: ziel.location.x, y: ziel.location.y + 1, z: ziel.location.z },
    });

    // Zwei Ticks spaeter zustechen: erst ankommen, dann treffen. Sonst
    // rechnet das Spiel den Stich noch vom alten Standort.
    system.runTimeout(() => {
        try {
            if (!lebt(ziel)) return;
            ziel.applyDamage(geschafft ? HINTERHALT : HINTERHALT / 2, {
                cause: "entityAttack", damagingEntity: spieler,
            });
            dimension.spawnParticle("minecraft:critical_hit_emitter", {
                x: ziel.location.x, y: ziel.location.y + 1, z: ziel.location.z,
            });
        } catch (fehler) {
            console.warn(`Kampf, Stich: ${fehler}`);
        }
    }, 2);
    if (geschafft) rauch(dimension, hinter);
}

// -------------------------------------------------------- Pfeilhagel

const hagel = new Map();        // Pfeil -> bis wann er bleiben darf

// Fuer pfeile.js: Hagelpfeile werden nie zu Erzpfeilen - sonst kostete
// jeder Hagel fuenf davon.
export function istHagelpfeil(kennung) {
    return hagel.has(kennung);
}

/**
 * Fuenf Pfeile auf einmal, gefaechert ueber gut dreissig Grad: gegen eine
 * Gruppe, oder gegen einen, der ausweicht.
 *
 * Gespannt wird dafuer nicht: Der Hagel kommt aus der Kraft des Schuetzen,
 * nicht aus dem Koecher, und kostet keine Pfeile. Damit er nicht zur
 * Pfeilquelle wird, verschwinden die Hagelpfeile nach drei Sekunden
 * wieder - bis dahin stecken sie laengst.
 */
function pfeilhagel(spieler) {
    const dimension = spieler.dimension;
    const blick = spieler.getViewDirection();
    const kopf = spieler.getHeadLocation();
    for (const grad of FAECHER) {
        // Um die Senkrechte drehen: Der Faecher liegt waagerecht, die
        // Neigung des Blicks bleibt fuer alle fuenf gleich.
        const w = (grad * Math.PI) / 180;
        const r = {
            x: blick.x * Math.cos(w) - blick.z * Math.sin(w),
            y: blick.y,
            z: blick.x * Math.sin(w) + blick.z * Math.cos(w),
        };
        const start = { x: kopf.x + r.x * 0.8, y: kopf.y + r.y * 0.8 - 0.1, z: kopf.z + r.z * 0.8 };
        const pfeil = dimension.spawnEntity("minecraft:arrow", start);
        const tempo = { x: r.x * PFEIL_TEMPO, y: r.y * PFEIL_TEMPO, z: r.z * PFEIL_TEMPO };
        const geschoss = pfeil.getComponent("minecraft:projectile");
        if (geschoss) {
            geschoss.owner = spieler;
            geschoss.shoot(tempo);
        } else {
            pfeil.applyImpulse(tempo);
        }
        hagel.set(pfeil.id, { pfeil, bis: system.currentTick + PFEIL_LEBEN });
    }
    dimension.playSound("random.bow", spieler.location, { volume: 1.0, pitch: 0.8 });
}

system.runInterval(() => {
    for (const [kennung, eintrag] of hagel) {
        try {
            if (!lebt(eintrag.pfeil)) {
                hagel.delete(kennung);
            } else if (system.currentTick >= eintrag.bis) {
                eintrag.pfeil.remove();
                hagel.delete(kennung);
            }
        } catch (fehler) {
            hagel.delete(kennung);
        }
    }
}, 10);

// ------------------------------------------------ Zweithand sperren

// Die Dolche liegen in beiden Haenden. Was in der Zweithand steckt -
// ein Schild, eine Fackel -, kommt deshalb ins Inventar, solange die
// Dolche gehalten werden. Ist das Inventar voll, faellt es vor die Fuesse.
// Zweimal je Sekunde nachsehen reicht: Wer schneller umraeumt, sieht den
// Schild fuer einen Augenblick, mehr nicht.
system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try {
            if (!DOLCHE.has(inDerHand(spieler))) continue;
            const ausruestung = spieler.getComponent("minecraft:equippable");
            const links = ausruestung?.getEquipment("Offhand");
            if (!links) continue;
            ausruestung.setEquipment("Offhand", undefined);
            const rest = spieler.getComponent("minecraft:inventory")?.container?.addItem(links);
            if (rest) spieler.dimension.spawnItem(rest, spieler.location);
            hinweis(spieler, "§7Die Dolche brauchen beide Hände. Was links war, liegt jetzt im Inventar.", 80);
        } catch (fehler) {
            console.warn(`Kampf, Zweithand: ${fehler}`);
        }
    }
}, 10);
