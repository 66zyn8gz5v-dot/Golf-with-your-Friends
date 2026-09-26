// Der Rucksack: abstellen, oeffnen, aufheben - mit allem darin - und am
// Elch festmachen. Dazu die Regel: Nur EIN voller Rucksack auf dem Ruecken.
//
// Wo der Inhalt bleibt, solange man den Rucksack traegt: Das abgestellte
// Rucksack-Wesen (mit seinen 27 Plaetzen) wird als Struktur in der Welt
// gespeichert, und der Gegenstand merkt sich deren Namen. So kommt beim
// Abstellen alles unveraendert wieder heraus - mit Verzauberungen, Namen,
// Haltbarkeit. Eine Liste der Gegenstaende nachzubauen wuerde das nicht
// schaffen.
//
// Wie ueberall im Paket faengt jeder Abschnitt seine Fehler selbst ab.

import { world, system, ItemStack, StructureSaveMode } from "@minecraft/server";

export const RUCKSACK = "fynn:rucksack";
export const ABGESTELLT = "fynn:rucksack_abgestellt";
export const ELCH = "fynn:elch";
const INHALT = "fynn:inhalt";       // Name der Struktur mit dem Inhalt
const ANZAHL = "fynn:anzahl";       // wie viele Stapel darin sind (fuer die Beschriftung)
const RICHTUNG = {
    Up: [0, 1, 0], Down: [0, -1, 0], North: [0, 0, -1], South: [0, 0, 1], East: [1, 0, 0], West: [-1, 0, 0],
};

function sage(spieler, text) {
    try {
        spieler.onScreenDisplay?.setActionBar(text);
    } catch (e) {
        // nicht wichtig
    }
}

function ton(dimension, name, ort, hoehe = 1.0) {
    try {
        dimension.playSound(name, ort, { volume: 0.8, pitch: hoehe });
    } catch (e) {
        // ohne Ton geht es auch
    }
}

export function istVoll(stapel) {
    return stapel?.typeId === RUCKSACK && !!stapel.getDynamicProperty(INHALT);
}

function inventar(spieler) {
    return spieler.getComponent("minecraft:inventory")?.container;
}

// Alle Rucksaecke eines Spielers: [Platz, Stapel].
export function rucksaecke(spieler) {
    const liste = [];
    const behaelter = inventar(spieler);
    if (!behaelter) return liste;
    for (let i = 0; i < behaelter.size; i++) {
        const stapel = behaelter.getItem(i);
        if (stapel?.typeId === RUCKSACK) liste.push([i, stapel]);
    }
    return liste;
}

// Einen Rucksack-Gegenstand bauen, voll oder leer.
export function rucksackStapel(inhalt, anzahl) {
    const stapel = new ItemStack(RUCKSACK, 1);
    if (inhalt) {
        stapel.setDynamicProperty(INHALT, inhalt);
        stapel.setDynamicProperty(ANZAHL, anzahl);
        stapel.setLore([`§7${anzahl} Stapel darin`]);
    }
    return stapel;
}

function gib(spieler, stapel) {
    const rest = inventar(spieler)?.addItem(stapel);
    if (rest) spieler.dimension.spawnItem(rest, spieler.location);
}

// Blöcke, die man mit dem Rucksack in der Hand trotzdem benutzen will: Da
// wird er nur abgestellt, wenn man sich duckt - wie bei der Shulkerkiste.
const BENUTZBAR = /chest|barrel|shulker|door|gate|button|lever|table|furnace|smoker|anvil|bed|loom|grindstone|stonecutter|lectern|smithing|enchanting|brewing|beacon|bell|note|repeater|comparator|daylight|hopper|dispenser|dropper|crafter|cartography|fletching|jukebox|composter|cauldron/;

function benutzbar(block) {
    try {
        return !!block.getComponent("minecraft:inventory") || BENUTZBAR.test(block.typeId);
    } catch (e) {
        return false;
    }
}

// ------------------------------------------------------------ Abstellen

// Gras, Farn und Schnee duerfen im Weg sein - der Rucksack steht dann darin.
const WEICH = new Set(["minecraft:short_grass", "minecraft:tall_grass", "minecraft:fern", "minecraft:large_fern",
    "minecraft:snow_layer", "minecraft:dead_bush", "minecraft:seagrass"]);

function frei(b) {
    return !!b && (b.isAir || WEICH.has(b.typeId));
}

export function abstellen(spieler, block, seite) {
    const d = WEICH.has(block.typeId) ? [0, 0, 0] : (RICHTUNG[seite] ?? [0, 1, 0]);
    const ziel = { x: block.location.x + d[0], y: block.location.y + d[1], z: block.location.z + d[2] };
    const dimension = spieler.dimension;
    const platz = dimension.getBlock(ziel);
    if (!frei(platz)) {
        sage(spieler, "§7Da ist kein Platz für den Rucksack.");
        return false;
    }
    const behaelter = inventar(spieler);
    const fach = spieler.selectedSlotIndex;
    const stapel = behaelter?.getItem(fach);
    if (stapel?.typeId !== RUCKSACK) return false;
    const inhalt = stapel.getDynamicProperty(INHALT);
    let gestellt = false;
    if (inhalt && world.structureManager.get(inhalt)) {
        world.structureManager.place(inhalt, dimension, ziel, { includeEntities: true, includeBlocks: false });
        world.structureManager.delete(inhalt);
        gestellt = true;
    }
    if (!gestellt) {
        if (inhalt) sage(spieler, "§cDer Inhalt dieses Rucksacks ist verloren gegangen.");
        dimension.spawnEntity(ABGESTELLT, { x: ziel.x + 0.5, y: ziel.y, z: ziel.z + 0.5 });
    }
    // Den Rucksack zum Spieler drehen.
    const mitte = { x: ziel.x + 0.5, y: ziel.y, z: ziel.z + 0.5 };
    for (const r of dimension.getEntities({ type: ABGESTELLT, location: mitte, maxDistance: 0.8 })) {
        const gier = Math.atan2(spieler.location.x - mitte.x, spieler.location.z - mitte.z) * -180 / Math.PI;
        r.setRotation({ x: 0, y: gier });
    }
    behaelter.setItem(fach, undefined);
    ton(dimension, "armor.equip_leather", mitte, 0.9);
    return true;
}

// Zwei Wege fuehren zum Abstellen, weil das Spiel nicht immer beide meldet:
// die eigene Komponente "fynn:rucksack" am Gegenstand (onUseOn) und das
// allgemeine Antippen eines Blocks. Was zuerst kommt, stellt ab; der zweite
// findet danach keinen Rucksack mehr in der Hand oder kommt im selben
// Augenblick und wird uebergangen.
const zuletzt = new Map();

export function versucheAbzustellen(spieler, block, seite) {
    const jetzt = system.currentTick;
    if (jetzt - (zuletzt.get(spieler.id) ?? -100) < 5) return false;
    zuletzt.set(spieler.id, jetzt);
    return abstellen(spieler, block, seite);
}

function spaeter(spieler, block, seite) {
    system.run(() => {
        try {
            versucheAbzustellen(spieler, block, seite);
        } catch (fehler) {
            console.warn(`Rucksack, abstellen: ${fehler}`);
        }
    });
}

system.beforeEvents.startup.subscribe((e) => {
    try {
        melde(e.itemComponentRegistry);
    } catch (fehler) {
        console.warn(`Rucksack, Anmelden: ${fehler}`);
    }
});

function melde(register) {
    register.registerCustomComponent("fynn:rucksack", {
        onUseOn(ereignis) {
            try {
                if (ereignis.source?.typeId !== "minecraft:player") return;
                if (benutzbar(ereignis.block) && !ereignis.source.isSneaking) return;
                spaeter(ereignis.source, ereignis.block, ereignis.blockFace);
            } catch (fehler) {
                console.warn(`Rucksack, abstellen: ${fehler}`);
            }
        },
    });
}

world.beforeEvents.playerInteractWithBlock.subscribe((e) => {
    try {
        if (e.itemStack?.typeId !== RUCKSACK || !e.isFirstEvent) return;
        if (benutzbar(e.block) && !e.player.isSneaking) return;
        e.cancel = true;
        spaeter(e.player, e.block, e.blockFace);
    } catch (fehler) {
        console.warn(`Rucksack, abstellen: ${fehler}`);
    }
});

// ------------------------------------------------------------ Aufheben

const unterwegs = new Set();

export function belegt(rucksackWesen) {
    const behaelter = rucksackWesen.getComponent("minecraft:inventory")?.container;
    if (!behaelter) return 0;
    return behaelter.size - behaelter.emptySlotsCount;
}

export function traegtVollen(spieler) {
    return rucksaecke(spieler).some(([, s]) => istVoll(s));
}

// Schlagen hebt ihn auf. Leer: einfach ein Rucksack. Voll: Der Inhalt geht
// in eine Struktur - dazu wird das Wesen erst ganz nach oben gebracht, in
// die Mitte eines Blocks, damit nichts anderes mit hineingespeichert wird.
export function aufheben(spieler, wesen) {
    if (unterwegs.has(wesen.id)) return false;
    const anzahl = belegt(wesen);
    if (anzahl === 0) {
        wesen.remove();
        gib(spieler, rucksackStapel());
        ton(spieler.dimension, "armor.equip_leather", spieler.location, 1.1);
        return true;
    }
    if (traegtVollen(spieler)) {
        sage(spieler, "§eDu trägst schon einen vollen Rucksack. Stell ihn erst ab.");
        return false;
    }
    unterwegs.add(wesen.id);
    const dimension = wesen.dimension;
    const oben = dimension.heightRange.max - 3;
    const ort = { x: Math.floor(wesen.location.x), y: oben, z: Math.floor(wesen.location.z) };
    const name = `fynn:rucksack_${system.currentTick.toString(36)}_${Math.floor(Math.random() * 1e8).toString(36)}`;
    wesen.teleport({ x: ort.x + 0.5, y: ort.y, z: ort.z + 0.5 });
    system.runTimeout(() => {
        try {
            world.structureManager.createFromWorld(name, dimension, ort, ort, {
                includeEntities: true, includeBlocks: false, saveMode: StructureSaveMode.World,
            });
            wesen.remove();
            gib(spieler, rucksackStapel(name, anzahl));
            ton(dimension, "armor.equip_leather", spieler.location, 1.1);
        } catch (fehler) {
            console.warn(`Rucksack, aufheben: ${fehler}`);
        } finally {
            unterwegs.delete(wesen.id);
        }
    }, 1);
    return true;
}

world.afterEvents.entityHitEntity.subscribe((e) => {
    try {
        if (e.hitEntity?.typeId !== ABGESTELLT || e.damagingEntity?.typeId !== "minecraft:player") return;
        aufheben(e.damagingEntity, e.hitEntity);
    } catch (fehler) {
        console.warn(`Rucksack, aufheben: ${fehler}`);
    }
});

// ------------------------------------------------------------ Nur ein voller

// Traegt jemand mehr als einen vollen Rucksack, fallen die anderen herunter.
export function nurEinVoller(spieler) {
    const volle = rucksaecke(spieler).filter(([, s]) => istVoll(s));
    if (volle.length <= 1) return 0;
    const behaelter = inventar(spieler);
    for (const [platz, stapel] of volle.slice(1)) {
        behaelter.setItem(platz, undefined);
        spieler.dimension.spawnItem(stapel, spieler.location);
    }
    sage(spieler, "§eNur ein voller Rucksack passt auf deinen Rücken!");
    return volle.length - 1;
}

// In einen Rucksack passt ein leerer Rucksack - ein voller nicht.
export function volleHeraus(rucksackWesen) {
    const behaelter = rucksackWesen.getComponent("minecraft:inventory")?.container;
    if (!behaelter) return 0;
    let heraus = 0;
    for (let i = 0; i < behaelter.size; i++) {
        const stapel = behaelter.getItem(i);
        if (!istVoll(stapel)) continue;
        behaelter.setItem(i, undefined);
        const { x, y, z } = rucksackWesen.location;
        rucksackWesen.dimension.spawnItem(stapel, { x, y: y + 0.9, z });
        heraus++;
    }
    return heraus;
}

// ------------------------------------------------------------ Auf dem Ruecken

// Das Skript sagt der Spielerdatei ueber zwei kurze Animationen, ob der
// Rucksack zu sehen ist (siehe werkzeuge/rucksack_bauen.py). Alle zehn
// Sekunden wird der Stand wiederholt, damit auch spaeter dazugekommene
// Mitspieler ihn sehen.
const sichtbar = new Map();

export function zeigeRuecken(spieler, jetzt) {
    const traegt = rucksaecke(spieler).length > 0;
    const vorher = sichtbar.get(spieler.id);
    if (vorher === traegt && jetzt % 200 !== 0) return false;
    sichtbar.set(spieler.id, traegt);
    spieler.playAnimation(traegt ? "animation.fynn.rucksack_an" : "animation.fynn.rucksack_ab");
    return true;
}

system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try {
            nurEinVoller(spieler);
            zeigeRuecken(spieler, system.currentTick);
        } catch (fehler) {
            console.warn(`Rucksack, Ruecken: ${fehler}`);
        }
    }
}, 10);

system.runInterval(() => {
    for (const name of ["overworld", "nether", "the_end"]) {
        try {
            for (const r of world.getDimension(name).getEntities({ type: ABGESTELLT })) volleHeraus(r);
        } catch (fehler) {
            console.warn(`Rucksack, verschachtelt: ${fehler}`);
        }
    }
}, 40);

// ------------------------------------------------------------ Am Elch

// Welche Rucksaecke ein Elch traegt, steht in der Welt unter seiner
// Nummer - so ist es auch nach seinem Tod noch lesbar.
function schluessel(elch) {
    return `fynn:elchtaschen_${elch.id}`;
}

export function elchTaschen(elch) {
    try {
        return JSON.parse(world.getDynamicProperty(schluessel(elch)) ?? "[]");
    } catch (e) {
        return [];
    }
}

function merke(elch, taschen) {
    world.setDynamicProperty(schluessel(elch), taschen.length ? JSON.stringify(taschen) : undefined);
    try {
        elch.setProperty("fynn:taschen", taschen.length);
    } catch (e) {
        // ein toter Elch hat keine Eigenschaften mehr
    }
}

export function anElch(spieler, elch) {
    if (!elch.getComponent("minecraft:is_tamed")) {
        sage(spieler, "§7Nur ein gezähmter Elch trägt Rucksäcke.");
        return false;
    }
    const taschen = elchTaschen(elch);
    if (taschen.length >= 2) {
        sage(spieler, "§7Der Elch trägt schon zwei Rucksäcke.");
        return false;
    }
    const behaelter = inventar(spieler);
    const fach = spieler.selectedSlotIndex;
    const stapel = behaelter?.getItem(fach);
    if (stapel?.typeId !== RUCKSACK) return false;
    taschen.push({ inhalt: stapel.getDynamicProperty(INHALT) ?? "", anzahl: stapel.getDynamicProperty(ANZAHL) ?? 0 });
    merke(elch, taschen);
    behaelter.setItem(fach, undefined);
    ton(elch.dimension, "armor.equip_leather", elch.location, 0.8);
    sage(spieler, `§aRucksack festgemacht (${taschen.length} von 2).`);
    return true;
}

export function vomElch(spieler, elch) {
    const taschen = elchTaschen(elch);
    const t = taschen.pop();
    if (!t) return false;
    merke(elch, taschen);
    gib(spieler, rucksackStapel(t.inhalt, t.anzahl));
    ton(elch.dimension, "armor.equip_leather", elch.location, 1.0);
    return true;
}

world.beforeEvents.playerInteractWithEntity.subscribe((e) => {
    try {
        if (e.target?.typeId !== ELCH) return;
        const mitRucksack = e.itemStack?.typeId === RUCKSACK;
        // Geduckt und mit leerer Hand: den letzten Rucksack abnehmen.
        const abnehmen = !e.itemStack && e.player.isSneaking && elchTaschen(e.target).length > 0;
        if (!mitRucksack && !abnehmen) return;
        e.cancel = true;
        const { player, target } = e;
        system.run(() => {
            try {
                if (mitRucksack) anElch(player, target);
                else vomElch(player, target);
            } catch (fehler) {
                console.warn(`Rucksack, Elch: ${fehler}`);
            }
        });
    } catch (fehler) {
        console.warn(`Rucksack, Elch: ${fehler}`);
    }
});

// Stirbt ein Elch, fallen seine Rucksaecke herunter - mit Inhalt.
world.afterEvents.entityDie.subscribe((e) => {
    try {
        const elch = e.deadEntity;
        if (elch?.typeId !== ELCH) return;
        const taschen = elchTaschen(elch);
        if (!taschen.length) return;
        for (const t of taschen) elch.dimension.spawnItem(rucksackStapel(t.inhalt, t.anzahl), elch.location);
        world.setDynamicProperty(schluessel(elch), undefined);
    } catch (fehler) {
        console.warn(`Rucksack, Elch gestorben: ${fehler}`);
    }
});
