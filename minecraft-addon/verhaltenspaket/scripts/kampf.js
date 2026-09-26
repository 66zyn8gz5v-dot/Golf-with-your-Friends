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

import { world, system, ItemStack, ItemLockMode } from "@minecraft/server";
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
    "fynn:elektrumklinge", "fynn:sternenklinge", "fynn:schwertfischklinge", "fynn:schwertfischschwert", "fynn:saphirschwert", "fynn:durendal", "fynn:rabenklinge", "fynn:frostzahn",
    "fynn:rubinklinge", "fynn:haizahnsaebel",
]);

const BOEGEN = new Set(["minecraft:bow", "minecraft:crossbow", "fynn:sturmbogen", "fynn:geweihbogen"]);

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

// ------------------------------------------------------------- Rolle

// Geduckt springen heisst rollen: ein flacher Stoss nach vorn - in
// Laufrichtung, im Stehen in Blickrichtung - und fuer eine halbe Sekunde
// Widerstand, damit man durch einen Angriff hindurchrollen kann. Wie in
// Kampfspielen ein Ausweichen, fuer jede Rolle. Die Bewegung dazu zeigt
// der Spieler selbst (spieler_animation_bauen: animation.fynn.rolle); sie
// erkennt die Rolle am Tempo, das dieser Stoss erzeugt.
//
// Der Sprung wird zweifach erkannt: an isJumping, und daran, dass der
// Spieler eben noch am Boden stand und jetzt nach oben fliegt. Auf dem
// iPad kommt die Taste manchmal nur fuer einen Tick an - dann greift das
// zweite.
const ROLL_WEITE = 0.75;        // Stoss waagerecht - etwa vier Bloecke weit
const ROLL_HOEHE = 0.22;
const ROLL_SPERRE = 25;         // Ticks bis zur naechsten Rolle
const amBoden = new Map();
const letzteRolle = new Map();

export function rollRichtung(spieler) {
    const v = spieler.getVelocity();
    return (Math.hypot(v.x, v.z) > 0.03 ? waagerecht(v) : undefined) ?? waagerecht(spieler.getViewDirection());
}

export function rolltSich(spieler, warAmBoden) {
    if (!spieler.isSneaking || spieler.isGliding || spieler.isSwimming || spieler.isInWater) return false;
    if (spieler.getComponent("minecraft:riding")) return false;
    const absprung = spieler.isJumping ? spieler.isOnGround || warAmBoden
        : warAmBoden && !spieler.isOnGround && spieler.getVelocity().y > 0.1;
    if (!absprung) return false;
    return system.currentTick - (letzteRolle.get(spieler.id) ?? -ROLL_SPERRE) >= ROLL_SPERRE;
}

system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try {
            const warAmBoden = amBoden.get(spieler.id) ?? false;
            amBoden.set(spieler.id, spieler.isOnGround);
            if (!rolltSich(spieler, warAmBoden)) continue;
            const richtung = rollRichtung(spieler);
            if (!richtung) continue;
            letzteRolle.set(spieler.id, system.currentTick);
            spieler.applyKnockback({ x: richtung.x * ROLL_WEITE, z: richtung.z * ROLL_WEITE }, ROLL_HOEHE);
            spieler.addEffect("resistance", 10, { amplifier: 2, showParticles: false });
            try {
                spieler.dimension.playSound("armor.equip_leather", spieler.location, { volume: 0.7, pitch: 1.4 });
            } catch (e) {
                // ohne Ton geht es auch
            }
        } catch (fehler) {
            console.warn(`Kampf, Rolle: ${fehler}`);
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

// ------------------------------------------------ Zweithand: beide Haende

// Beidhaendige Waffen belegen die Zweithand. Bei den Dolchen steckt dort
// der linke Dolch als eigener Gegenstand, festgesetzt: Man sieht ihn im
// Zweithandplatz, er laesst sich nicht herausnehmen, und er macht den
// zweiten Dolch sichtbar - auch in der Ich-Sicht, wo Minecraft vom
// Spieler nur zeichnet, was in den Haenden liegt.
//
// Was vorher links war - ein Schild, eine Fackel -, kommt in den Rucksack
// und nach dem Wechsel zu einer anderen Waffe zurueck. Fynn: "richtig
// visuell sichtbar machen, dass man das Schild nicht ausruesten kann".
// Spaeter koennen hier Zweihaender dazukommen; dann mit einem Platzhalter
// statt eines Dolchs.
export const ZWEITHAND = new Map([...DOLCHE].map((d) => [d, d.replace(/e$/, "_links")]));
const LINKE = new Set(ZWEITHAND.values());
const ABGELEGT = "fynn:zweithand_abgelegt";     // am Spieler: was links war

function zweithandPruefen(spieler) {
    const ausruestung = spieler.getComponent("minecraft:equippable");
    const inventar = spieler.getComponent("minecraft:inventory")?.container;
    if (!ausruestung) return;
    const soll = ZWEITHAND.get(inDerHand(spieler));
    const links = ausruestung.getEquipment("Offhand");

    if (soll) {
        if (links?.typeId === soll) return;
        if (links && !LINKE.has(links.typeId)) {
            const rest = inventar?.addItem(links);
            if (rest) spieler.dimension.spawnItem(rest, spieler.location);
            spieler.setDynamicProperty(ABGELEGT, links.typeId);
            const name = links.typeId === "minecraft:shield" ? "Der Schild" : "Was links war";
            hinweis(spieler, `§eBeide Hände führen die Dolche.§7 ${name} liegt im Rucksack.`, 80);
            try {
                spieler.playSound("armor.equip_leather", { pitch: 0.8 });
            } catch (e) {
                // ohne Ton geht es auch
            }
        }
        const dolch = new ItemStack(soll, 1);
        dolch.lockMode = ItemLockMode.slot;
        dolch.keepOnDeath = true;
        ausruestung.setEquipment("Offhand", dolch);
        return;
    }

    // Keine beidhaendige Waffe mehr: den linken Dolch weg, das Abgelegte zurueck.
    if (links && LINKE.has(links.typeId)) {
        ausruestung.setEquipment("Offhand", undefined);
        const zurueck = spieler.getDynamicProperty(ABGELEGT);
        spieler.setDynamicProperty(ABGELEGT, undefined);
        if (typeof zurueck === "string" && inventar) {
            for (let i = 0; i < inventar.size; i++) {
                const stueck = inventar.getItem(i);
                if (stueck?.typeId !== zurueck) continue;
                inventar.setItem(i, undefined);
                ausruestung.setEquipment("Offhand", stueck);
                break;
            }
        }
    }
    // Ein linker Dolch hat hier nichts zu suchen, wo auch immer er steckt.
    if (inventar) {
        for (let i = 0; i < inventar.size; i++) {
            if (LINKE.has(inventar.getItem(i)?.typeId)) inventar.setItem(i, undefined);
        }
    }
}

system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try {
            zweithandPruefen(spieler);
        } catch (fehler) {
            console.warn(`Kampf, Zweithand: ${fehler}`);
        }
    }
}, 4);

// Faellt ein linker Dolch doch einmal auf den Boden (etwa beim Tod, falls
// das Festhalten nicht greift), verschwindet er.
world.afterEvents.entitySpawn.subscribe((e) => {
    try {
        const ding = e.entity;
        if (ding?.typeId !== "minecraft:item") return;
        if (LINKE.has(ding.getComponent("minecraft:item")?.itemStack?.typeId)) ding.remove();
    } catch (fehler) {
        // schon weg
    }
});
