// Die aufgeladenen Angriffe von Ritter und Assassine, dazu die Regel,
// dass die Dolche beide Haende brauchen.
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

const ANGRIFFE = [
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
