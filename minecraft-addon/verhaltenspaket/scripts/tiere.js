// Was die neuen Tiere und ihre Gegenstaende koennen, das keine Datei
// beschreiben kann: Talismane, Jagdhorn, Trank der Tiefe, die Tinte des
// Riesenkalmars, die Fontaene des Wals, das Geweih der Elchbullen.
//
// Wie ueberall im Paket faengt jeder Abschnitt seine Fehler selbst ab -
// ein Fehler hier soll nicht Tempel und Kampf mitreissen.

import { world, system, ItemStack } from "@minecraft/server";

// ------------------------------------------------------------ Talismane

// Wer einen Talisman in der Schnellleiste oder in der Zweithand traegt,
// bekommt die Kraft des Tiers - solange er ihn dabei hat.
export const TALISMANE = {
    "fynn:baerentalisman": { wirkung: "strength", stufe: 0 },
    "fynn:loewentalisman": { wirkung: "resistance", stufe: 0 },
    "fynn:tigertalisman": { wirkung: "speed", stufe: 0 },
    "fynn:haitalisman": { wirkung: "conduit_power", stufe: 0, nurImWasser: true },
    "fynn:elchtalisman": { wirkung: "jump_boost", stufe: 1 },
};
const JAEGERKETTE = "fynn:jaegerkette";

// Ganze Ruestungen: Wer alle vier Teile traegt, bekommt ihre Kraft.
export const SAETZE = [
    { teile: ["fynn:baerenkapuze", "fynn:baerenfellmantel", "fynn:baerenfellhose", "fynn:baerenfellstiefel"],
      wirkung: "strength", stufe: 0 },
    { teile: ["fynn:rubinhelm", "fynn:rubinharnisch", "fynn:rubinbeinschutz", "fynn:rubinstiefel"],
      wirkung: "fire_resistance", stufe: 0 },
];

export function ganzerSatz(spieler) {
    const ausruestung = spieler.getComponent("minecraft:equippable");
    if (!ausruestung) return undefined;
    const an = ["Head", "Chest", "Legs", "Feet"].map((platz) => ausruestung.getEquipment(platz)?.typeId);
    return SAETZE.find((satz) => satz.teile.every((teil, i) => an[i] === teil));
}

export function getragen(spieler) {
    const dabei = new Set();
    const inventar = spieler.getComponent("minecraft:inventory")?.container;
    if (inventar) {
        for (let i = 0; i < 9; i++) {
            const stueck = inventar.getItem(i);
            if (stueck) dabei.add(stueck.typeId);
        }
    }
    const links = spieler.getComponent("minecraft:equippable")?.getEquipment("Offhand");
    if (links) dabei.add(links.typeId);
    return dabei;
}

system.runInterval(() => {
    for (const spieler of world.getAllPlayers()) {
        try {
            const dabei = getragen(spieler);
            for (const [name, t] of Object.entries(TALISMANE)) {
                if (!dabei.has(name)) continue;
                if (t.nurImWasser && !spieler.isInWater) continue;
                // Etwas laenger als der Takt, damit die Wirkung nie flackert.
                spieler.addEffect(t.wirkung, 60, { amplifier: t.stufe, showParticles: false });
            }
            const satz = ganzerSatz(spieler);
            if (satz) spieler.addEffect(satz.wirkung, 60, { amplifier: satz.stufe, showParticles: false });
        } catch (fehler) {
            console.warn(`Tiere, Talismane: ${fehler}`);
        }
    }
}, 40);

// ------------------------------------------------------------ Jagdhorn

// Einmal blasen: Alle Spieler in 24 Bloecken bekommen fuer 20 Sekunden
// Tempo und Staerke. Danach braucht das Horn eine Minute Ruhe.
const HORN_PAUSE = 1200;
const letztesHorn = new Map();

export function jagdhorn(spieler) {
    const jetzt = system.currentTick;
    if (jetzt - (letztesHorn.get(spieler.id) ?? -HORN_PAUSE) < HORN_PAUSE) {
        spieler.onScreenDisplay?.setActionBar("§7Das Horn braucht noch Ruhe.");
        return false;
    }
    letztesHorn.set(spieler.id, jetzt);
    try {
        spieler.dimension.playSound("horn.call.0", spieler.location, { volume: 4, pitch: 0.8 });
    } catch (e) {
        // ohne Ton geht es auch
    }
    for (const mitjaeger of spieler.dimension.getPlayers({ location: spieler.location, maxDistance: 24 })) {
        mitjaeger.addEffect("speed", 400, { amplifier: 1 });
        mitjaeger.addEffect("strength", 400, { amplifier: 0 });
        mitjaeger.onScreenDisplay?.setActionBar("§6» Zur Jagd! «");
    }
    return true;
}

world.afterEvents.itemUse.subscribe((e) => {
    try {
        if (e.itemStack?.typeId === "fynn:jagdhorn") jagdhorn(e.source);
    } catch (fehler) {
        console.warn(`Tiere, Jagdhorn: ${fehler}`);
    }
});

// ------------------------------------------------------------ Essen

// Was beim Essen mehr passiert als satt werden.
export const MAHLZEITEN = {
    // Fuenf Minuten unter Wasser sehen und atmen.
    "fynn:trank_der_tiefe": [["night_vision", 6000, 0], ["water_breathing", 6000, 0], ["conduit_power", 6000, 0]],
    "fynn:honigbraten": [["regeneration", 200, 1]],
    "fynn:wildeintopf": [["saturation", 20, 0]],
    "fynn:sushi": [["water_breathing", 600, 0]],
};
// Rohes Wild ist nicht ohne: Mit etwas Pech gibt es Hunger.
const ROH_RISKANT = new Set(["fynn:baerenfleisch", "fynn:wildschweinfleisch", "fynn:krokodilfleisch"]);

world.afterEvents.itemCompleteUse.subscribe((e) => {
    try {
        const name = e.itemStack?.typeId;
        const spieler = e.source;
        for (const [wirkung, dauer, stufe] of MAHLZEITEN[name] ?? []) {
            spieler.addEffect(wirkung, dauer, { amplifier: stufe });
        }
        if (ROH_RISKANT.has(name) && Math.random() < 0.3) spieler.addEffect("hunger", 400, { amplifier: 0 });
    } catch (fehler) {
        console.warn(`Tiere, Essen: ${fehler}`);
    }
});

// ------------------------------------------------------------ Beute

// Seltenes, das die Jaegerkette noch einmal wuerfeln laesst. Die Kette
// macht das Glueck des Jaegers: Jedes Tier, das er erlegt, gibt mit einer
// Chance von einem Viertel ein zweites Mal etwas Seltenes her.
export const SELTEN = {
    "fynn:braunbaer": ["fynn:baerenkralle", "fynn:baerenfell"],
    "fynn:elch": ["fynn:elchgeweih"],
    "fynn:wildschwein": ["fynn:wildschweinhauer"],
    "fynn:bison": ["fynn:bisonhorn", "fynn:bisonfell"],
    "fynn:loewe": ["fynn:loewenzahn", "fynn:loewenfell"],
    "fynn:tiger": ["fynn:tigerkralle", "fynn:tigerfell"],
    "fynn:krokodil": ["fynn:krokodilzahn", "fynn:krokodilleder"],
    "fynn:schneeleopard": ["fynn:schneeleopardenfell"],
    "fynn:wal": ["fynn:ambra"],
    "fynn:hai": ["fynn:haizahn", "fynn:haihaut"],
    "fynn:riesenkalmar": ["fynn:kalmarauge"],
    "fynn:schwertfisch": ["fynn:schwertfischspiess"],
};

function istJung(wesen) {
    try {
        return !!wesen.getComponent("minecraft:is_baby");
    } catch (e) {
        return false;
    }
}

export function beuteNachTod(tot, jaeger, wurf = Math.random) {
    const extra = [];
    if (!tot || istJung(tot)) return extra;
    // Das Geweih verlieren nur Elchbullen (Variante 0) - das weiss keine
    // Beuteliste, denn die kennt die Variante nicht.
    if (tot.typeId === "fynn:elch" && jaeger && tot.getComponent("minecraft:variant")?.value === 0 && wurf() < 0.15) {
        extra.push("fynn:elchgeweih");
    }
    if (jaeger?.typeId === "minecraft:player" && SELTEN[tot.typeId] && getragen(jaeger).has(JAEGERKETTE)) {
        const liste = SELTEN[tot.typeId];
        if (wurf() < 0.25) extra.push(liste[Math.floor(wurf() * liste.length) % liste.length]);
    }
    return extra;
}

world.afterEvents.entityDie.subscribe((e) => {
    try {
        const tot = e.deadEntity;
        if (!tot?.typeId?.startsWith("fynn:")) return;
        const jaeger = e.damageSource?.damagingEntity;
        const ort = tot.location;
        const dimension = tot.dimension;
        for (const name of beuteNachTod(tot, jaeger)) dimension.spawnItem(new ItemStack(name, 1), ort);
    } catch (fehler) {
        console.warn(`Tiere, Beute: ${fehler}`);
    }
});

// ------------------------------------------------------------ Riesenkalmar

// Wer den Riesenkalmar trifft, bekommt Tinte ins Gesicht: drei Sekunden
// blind. Und wen seine Arme erwischen, den halten sie fest.
world.afterEvents.entityHurt.subscribe((e) => {
    try {
        const kalmar = e.hurtEntity;
        if (kalmar?.typeId !== "fynn:riesenkalmar") return;
        const angreifer = e.damageSource?.damagingEntity;
        if (angreifer?.typeId !== "minecraft:player") return;
        angreifer.addEffect("blindness", 60, { amplifier: 0 });
        try {
            kalmar.dimension.spawnParticle("minecraft:ink_emitter", kalmar.location);
        } catch (e2) {
            // ohne Wolke geht es auch
        }
    } catch (fehler) {
        console.warn(`Tiere, Tinte: ${fehler}`);
    }
});

world.afterEvents.entityHitEntity.subscribe((e) => {
    try {
        if (e.damagingEntity?.typeId !== "fynn:riesenkalmar") return;
        e.hitEntity?.addEffect("slowness", 50, { amplifier: 2 });
    } catch (fehler) {
        console.warn(`Tiere, Griff: ${fehler}`);
    }
});

// ------------------------------------------------------------ Wal

// Taucht ein Wal auf, blaest er: eine Fontaene aus dem Blasloch, dazu das
// Schnaufen des Delfins, tief gestimmt.
export function blaestAus(wal) {
    const { x, y, z } = wal.location;
    const dimension = wal.dimension;
    const kopf = dimension.getBlock({ x, y: y + 2.4, z });
    const rumpf = dimension.getBlock({ x, y: y + 1, z });
    if (!kopf || !rumpf) return false;
    if (!kopf.isAir || rumpf.typeId !== "minecraft:water") return false;
    dimension.spawnParticle("fynn:walfontaene", { x, y: y + 2.2, z });
    try {
        dimension.playSound("mob.dolphin.blowhole", { x, y, z }, { volume: 2, pitch: 0.4 });
    } catch (e) {
        // ohne Ton geht es auch
    }
    return true;
}

system.runInterval(() => {
    try {
        const welt = world.getDimension("overworld");
        for (const wal of welt.getEntities({ type: "fynn:wal" })) {
            if (Math.random() < 0.3) blaestAus(wal);
        }
    } catch (fehler) {
        console.warn(`Tiere, Wal: ${fehler}`);
    }
}, 60);
