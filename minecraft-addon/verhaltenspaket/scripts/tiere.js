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
    // Aus den Panzern des Frostkaefers (4.78); das Eis unter den Fuessen
    // macht fantasy.js.
    "fynn:frosttalisman": { wirkung: "fire_resistance", stufe: 0 },
};
const JAEGERKETTE = "fynn:jaegerkette";

// Ganze Ruestungen: Wer alle vier Teile traegt, bekommt ihre Kraft.
export const SAETZE = [
    { teile: ["fynn:baerenkapuze", "fynn:baerenfellmantel", "fynn:baerenfellhose", "fynn:baerenfellstiefel"],
      wirkung: "strength", stufe: 0 },
    // Die Drachenschuppen-Ruestung (4.80): ganz getragen gegen Feuer gefeit.
    { teile: ["fynn:drachenhelm", "fynn:drachenpanzer", "fynn:drachenbeinschutz", "fynn:drachenstiefel"],
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

// ------------------------------------------------------------ Hai

// Fynn (4.73): "Die Angriffsanimation: Der soll auf einen zuschwimmen und
// dann auch ein bisschen beschleunigen." Hat ein Hai im Wasser ein Ziel in
// 4 bis 14 Bloecken, nimmt er Anlauf: knapp eine Sekunde lang schiebt ihn
// jeder Schub etwas staerker auf das Ziel zu, er zieht eine Blasenspur, und
// fynn:sturm spielt die gestreckte Sturm-Bewegung mit offenem Maul. Den Biss
// selbst macht sein gewoehnlicher Nahkampf. Danach braucht er ein paar
// Sekunden, bevor er wieder anlaeuft.
export const STURM = { von: 4, bis: 14, dauer: 16, pause: 100 };
const stuerme = new Map();          // Hai -> { start, ziel }
const sturmPause = new Map();       // Hai -> Tick, ab dem er wieder darf

function lebt(wesen) {
    try {
        return typeof wesen?.isValid === "function" ? wesen.isValid() : !!wesen?.isValid;
    } catch (e) {
        return false;
    }
}

function sturmEnde(hai, jetzt) {
    stuerme.delete(hai.id);
    sturmPause.set(hai.id, jetzt + STURM.pause + Math.floor(Math.random() * 60));
    try { hai.setProperty("fynn:sturm", false); } catch (e) { /* weg */ }
}

/** Ein Takt fuer einen Hai; sagt, was er gerade tut (fuer die Probe). */
export function haiTakt(hai, jetzt) {
    const lauf = stuerme.get(hai.id);
    if (lauf) {
        const n = jetzt - lauf.start;
        const z = lauf.ziel;
        if (n > STURM.dauer || !hai.isInWater || !lebt(z)) {
            sturmEnde(hai, jetzt);
            return "ende";
        }
        const d = { x: z.location.x - hai.location.x, y: z.location.y + 0.6 - hai.location.y, z: z.location.z - hai.location.z };
        const l = Math.hypot(d.x, d.y, d.z);
        if (l < 1.8) {
            sturmEnde(hai, jetzt);
            return "ende";
        }
        // Immer kraeftiger - er beschleunigt, bis er fast da ist.
        const schub = 0.04 + n * 0.012;
        const v = hai.getVelocity?.() ?? { x: 0, y: 0, z: 0 };
        if (Math.hypot(v.x, v.y, v.z) < 1.1) {
            hai.applyImpulse({ x: d.x / l * schub, y: d.y / l * schub * 0.6, z: d.z / l * schub });
        }
        try {
            hai.dimension.spawnParticle("minecraft:basic_bubble_particle",
                { x: hai.location.x, y: hai.location.y + 0.5, z: hai.location.z });
        } catch (e) { /* egal */ }
        return "sturm";
    }
    if (jetzt < (sturmPause.get(hai.id) ?? 0)) return "pause";
    if (!hai.isInWater) return "an_land";
    let ziel;
    try { ziel = hai.target; } catch (e) { ziel = undefined; }
    if (!lebt(ziel)) return "ruhig";
    const weite = Math.hypot(ziel.location.x - hai.location.x, ziel.location.y - hai.location.y,
        ziel.location.z - hai.location.z);
    if (weite < STURM.von || weite > STURM.bis) return "wartet";
    stuerme.set(hai.id, { start: jetzt, ziel });
    try {
        hai.setProperty("fynn:sturm", true);
        hai.dimension.playSound("mob.guardian.attack_loop", hai.location, { volume: 0.8, pitch: 1.4 });
    } catch (e) { /* egal */ }
    return "los";
}

system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        for (const hai of world.getDimension("overworld").getEntities({ type: "fynn:hai" })) {
            try { haiTakt(hai, jetzt); } catch (fehler) { /* dieser Hai ist gerade weg */ }
        }
    } catch (fehler) {
        console.warn(`Tiere, Hai: ${fehler}`);
    }
}, 2);

// ------------------------------------------------------------ Braunbaer

// Fynn (4.74): "Die Tiere sollen eine richtige Mission haben - der
// Braunbaer sucht Honig oder holt Lachs. Aggressiv ist er, wenn er
// Jungtiere hat, sonst nicht, ausser wenn man ihn anschlaegt."
//
// Die Ziele sucht sich der Baer selbst (move_to_block: Bienennest,
// Beerenstrauch, Wasser). Kommt er an, meldet er fynn:ziel_erreicht, und
// hier entscheidet sich, was er tut: Am Nest richtet er sich auf und holt
// den Honig heraus (das Nest ist danach leer), am Strauch frisst er die
// Beeren, am Wasser schlaegt er nach Lachsen - manchmal fliegt einer ans
// Ufer. Waehrend er beschaeftigt ist, bleibt er stehen.
export const AUFGABEN = {
    honig: { tun: 1, dauer: 80 },
    beeren: { tun: 2, dauer: 60 },
    angeln: { tun: 3, dauer: 120 },
};
const BAER = "fynn:braunbaer";
const aufgaben = new Map();         // Baer -> { baer, art, start, bis, block }

function istKreativ(spieler) {
    try { return String(spieler.getGameMode?.()).toLowerCase() === "creative"; } catch (e) { return false; }
}

/** Was es um den Baer herum gibt: Nest vor Strauch vor Wasser. */
export function aufgabeAm(baer) {
    const o = baer.location;
    const funde = {};
    for (let dy = -1; dy <= 2; dy++) {
        for (let dx = -2; dx <= 2; dx++) {
            for (let dz = -2; dz <= 2; dz++) {
                let b;
                try { b = baer.dimension.getBlock({ x: Math.floor(o.x) + dx, y: Math.floor(o.y) + dy, z: Math.floor(o.z) + dz }); } catch (e) { b = undefined; }
                const id = b?.typeId;
                if (id === "minecraft:bee_nest" || id === "minecraft:beehive") funde.honig ??= b;
                else if (id === "minecraft:sweet_berry_bush") funde.beeren ??= b;
                else if (id === "minecraft:water") funde.angeln ??= b;
            }
        }
    }
    for (const art of ["honig", "beeren", "angeln"]) if (funde[art]) return { art, block: funde[art] };
    return null;
}

export function beginneAufgabe(baer, jetzt) {
    if (istJung(baer) || aufgaben.has(baer.id)) return null;
    const f = aufgabeAm(baer);
    if (!f) return null;
    const a = AUFGABEN[f.art];
    aufgaben.set(baer.id, { baer, art: f.art, start: jetzt, bis: jetzt + a.dauer, block: f.block });
    try {
        baer.setProperty("fynn:tun", a.tun);
        baer.addEffect("slowness", a.dauer + 5, { amplifier: 10, showParticles: false });
        // Zum Ziel schauen.
        const l = f.block.location;
        const gier = Math.atan2(-(l.x + 0.5 - baer.location.x), l.z + 0.5 - baer.location.z) * 180 / Math.PI;
        baer.setRotation?.({ x: 0, y: gier });
    } catch (e) { /* egal */ }
    return f.art;
}

function zustandSetzen(block, name, wert) {
    try { block.setPermutation(block.permutation.withState(name, wert)); } catch (e) { /* ohne diesen Zustand */ }
}

export function aufgabeTakt(baer, jetzt, zufall = Math.random) {
    const a = aufgaben.get(baer.id);
    if (!a) return null;
    const dim = baer.dimension;
    // Der Takt laeuft alle zehn Ticks - gezaehlt wird in Takten, nicht Ticks.
    const n = Math.floor((jetzt - a.start) / 10);
    const l = a.block.location;
    const ueber = { x: l.x + 0.5, y: l.y + 1, z: l.z + 0.5 };
    try {
        if (a.art === "honig" && n % 2 === 0) dim.playSound("mob.bee.aggressive", ueber, { volume: 0.7, pitch: 1 });
        if (a.art === "angeln" && n % 3 === 1) {
            dim.spawnParticle("minecraft:water_splash_particle", ueber);
            dim.playSound("random.splash", ueber, { volume: 0.5, pitch: 1.2 });
        }
    } catch (e) { /* egal */ }
    if (jetzt < a.bis) return a.art;

    aufgaben.delete(baer.id);
    let ergebnis = a.art;
    try {
        baer.setProperty("fynn:tun", 0);
        baer.removeEffect("slowness");
        if (a.art === "honig") {
            zustandSetzen(a.block, "honey_level", 0);
            dim.spawnParticle("minecraft:villager_happy", { x: baer.location.x, y: baer.location.y + 1.5, z: baer.location.z });
        }
        if (a.art === "beeren") zustandSetzen(a.block, "growth", 1);
        if (a.art === "angeln" && zufall() < 0.5) {
            ergebnis = "angeln:lachs";
            dim.spawnParticle("minecraft:water_splash_particle", ueber);
            // Meist frisst er ihn gleich, manchmal fliegt der Lachs ans Ufer.
            if (zufall() < 0.3) {
                dim.spawnItem(new ItemStack("minecraft:salmon", 1), { x: baer.location.x, y: baer.location.y + 1, z: baer.location.z });
                ergebnis = "angeln:lachs_am_ufer";
            }
        }
        dim.playSound("random.eat", baer.location, { volume: 0.8, pitch: 0.7 });
    } catch (e) { /* egal */ }
    return `fertig:${ergebnis}`;
}

world.afterEvents.dataDrivenEntityTrigger.subscribe((e) => {
    try {
        if (e.entity?.typeId !== BAER || e.eventId !== "fynn:ziel_erreicht") return;
        beginneAufgabe(e.entity, system.currentTick);
    } catch (fehler) {
        console.warn(`Tiere, Baer: ${fehler}`);
    }
});

// Die Baerenmutter: Sind Junge in der Naehe und kommt ein Spieler naeher als
// zwoelf Bloecke, richtet sie sich auf und bruellt - eine Warnung. Geht er
// trotzdem naeher als sieben Bloecke heran, greift sie an.
const muetter = new Map();          // Baer -> { gewarnt, warnBis, wut }

export function mutterTakt(baer, jetzt, spielerNah, jungesNah) {
    const m = muetter.get(baer.id) ?? {};
    muetter.set(baer.id, m);
    if (m.warnBis && jetzt >= m.warnBis) {
        m.warnBis = 0;
        if (!aufgaben.has(baer.id)) try { baer.setProperty("fynn:tun", 0); } catch (e) { /* egal */ }
    }
    if (!jungesNah || !spielerNah.length) return "ruhig";
    if (m.wut && jetzt < m.wut) return "wut";
    const weite = Math.min(...spielerNah.map((s) => Math.hypot(s.location.x - baer.location.x, s.location.z - baer.location.z)));
    if (!m.gewarnt || jetzt - m.gewarnt > 200) {
        m.gewarnt = jetzt;
        m.warnBis = jetzt + 50;
        try {
            baer.setProperty("fynn:tun", 4);
            baer.dimension.playSound("mob.polarbear.warning", baer.location, { volume: 1.5, pitch: 0.8 });
        } catch (e) { /* egal */ }
        return "warnt";
    }
    if (weite < 7) {
        m.wut = jetzt + 240;
        m.warnBis = 0;
        try {
            baer.setProperty("fynn:tun", 0);
            baer.triggerEvent("fynn:baerenmutter");
        } catch (e) { /* egal */ }
        return "greift an";
    }
    return "beobachtet";
}

system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        const welt = world.getDimension("overworld");
        for (const baer of welt.getEntities({ type: BAER })) {
            if (istJung(baer)) continue;
            try {
                aufgabeTakt(baer, jetzt);
                const nah = welt.getEntities({ type: BAER, location: baer.location, maxDistance: 12 });
                const spieler = welt.getPlayers({ location: baer.location, maxDistance: 12 }).filter((s) => !istKreativ(s));
                mutterTakt(baer, jetzt, spieler, nah.some(istJung));
            } catch (fehler) { /* dieser Baer ist gerade weg */ }
        }
        for (const [id, a] of aufgaben) {
            if (!lebt(a.baer)) aufgaben.delete(id);
        }
    } catch (fehler) {
        console.warn(`Tiere, Baeren: ${fehler}`);
    }
}, 10);

// ------------------------------------------------------------ Walsprung

// Fynn (4.75): "Der Buckelwal soll aus dem Wasser springen und dann darauf
// klatschen koennen." Ab und zu - ein erwachsener Wal, dicht unter der
// Oberflaeche - stoesst er sich ab: ein kraeftiger Schub nach oben und vorn,
// fynn:sprung spielt die Drehung in der Luft. Faellt er zurueck ins Wasser,
// klatscht es: eine Wand aus Gischt, ein tiefer Schlag, und wer in der Naehe
// schwimmt, wird weggespuelt.
export const WALSPRUNG = { chance: 0.02, pause: 1200, laenge: 60 };
const spruenge = new Map();         // Wal -> { wal, start, inDerLuft }
const walPause = new Map();

export function darfSpringen(wal) {
    if (istJung(wal) || !wal.isInWater) return false;
    const { x, y, z } = wal.location;
    try {
        const ueber = wal.dimension.getBlock({ x, y: y + 3, z });
        const unten = wal.dimension.getBlock({ x, y: y + 1, z });
        return !!ueber?.isAir && unten?.typeId === "minecraft:water";
    } catch (e) {
        return false;
    }
}

export function walTakt(wal, jetzt, zufall = Math.random) {
    const s = spruenge.get(wal.id);
    if (!s) {
        if (jetzt < (walPause.get(wal.id) ?? 0) || zufall() >= WALSPRUNG.chance || !darfSpringen(wal)) return "schwimmt";
        const blick = wal.getViewDirection?.() ?? { x: 0, z: 1 };
        const l = Math.hypot(blick.x, blick.z) || 1;
        spruenge.set(wal.id, { wal, start: jetzt, inDerLuft: false });
        try {
            wal.setProperty("fynn:sprung", true);
            wal.applyImpulse({ x: blick.x / l * 0.45, y: 1.05, z: blick.z / l * 0.45 });
            wal.dimension.playSound("mob.dolphin.blowhole", wal.location, { volume: 2, pitch: 0.4 });
            // Wo er die Oberflaeche durchbricht, spritzt es schon beim Absprung.
            const o = wal.location, y = oberflaeche(wal.dimension, o);
            const vorn = { x: o.x + blick.x / l * 1.5, y, z: o.z + blick.z / l * 1.5 };
            wal.dimension.spawnParticle("fynn:walgischt", vorn);
            wal.dimension.spawnParticle("fynn:walschaum", vorn);
            wal.dimension.playSound("random.splash", vorn, { volume: 1.5, pitch: 0.7 });
        } catch (e) { /* egal */ }
        return "springt";
    }
    if (!wal.isInWater) {
        s.inDerLuft = true;
        return "fliegt";
    }
    if (!s.inDerLuft && jetzt - s.start < WALSPRUNG.laenge) return "springt";
    // Zurueck im Wasser (oder der Sprung kam nicht hoch): Platsch.
    spruenge.delete(wal.id);
    walPause.set(wal.id, jetzt + WALSPRUNG.pause + Math.floor(zufall() * 600));
    try { wal.setProperty("fynn:sprung", false); } catch (e) { /* egal */ }
    if (!s.inDerLuft) return "abgebrochen";
    klatschen(wal);
    return "klatscht";
}

/** Die Hoehe, auf der das Wasser ueber dem Wal endet - dort beginnt die
 *  Gischt. Ohne Wasser darueber (oder ohne Welt, in der Probe) knapp ueber ihm. */
export function oberflaeche(dim, o) {
    try {
        for (let dy = 0; dy < 8; dy++) {
            const b = dim.getBlock?.({ x: o.x, y: o.y + dy, z: o.z });
            if (!b) break;
            if (!b.typeId.includes("water")) return Math.floor(o.y + dy) + 0.1;
        }
    } catch (e) { /* ausserhalb der geladenen Welt */ }
    return o.y + 1;
}

function klatschen(wal) {
    const dim = wal.dimension;
    const o = wal.location;
    try {
        // Er schlaegt der Laenge nach auf: Gischt entlang des ganzen Koerpers,
        // eine Krone an jedem Stueck, und in der Mitte der groesste Schaumring.
        const blick = wal.getViewDirection?.() ?? { x: 0, z: 1 };
        const l = Math.hypot(blick.x, blick.z) || 1;
        const y = oberflaeche(dim, o);
        for (const s of [-3, -1.5, 0, 1.5, 3]) {
            const p = { x: o.x + blick.x / l * s, y, z: o.z + blick.z / l * s };
            dim.spawnParticle("fynn:walgischt", p);
            if (s % 3 === 0) dim.spawnParticle("fynn:walschaum", p);
        }
        for (let i = 0; i < 16; i++) {
            const w = (i / 16) * Math.PI * 2;
            dim.spawnParticle("minecraft:water_splash_particle", { x: o.x + Math.cos(w) * 3, y: y + 0.4, z: o.z + Math.sin(w) * 3 });
            if (i % 2 === 0) dim.spawnParticle("fynn:walfontaene", { x: o.x + Math.cos(w) * 2, y, z: o.z + Math.sin(w) * 2 });
        }
        dim.playSound("random.explode", o, { volume: 1.2, pitch: 0.4 });
        dim.playSound("random.splash", o, { volume: 2, pitch: 0.5 });
        for (const w of dim.getEntities({ location: o, maxDistance: 7, excludeTypes: ["fynn:wal", "minecraft:item"] })) {
            const d = { x: w.location.x - o.x, z: w.location.z - o.z };
            const l = Math.hypot(d.x, d.z) || 1;
            try { w.applyKnockback({ x: d.x / l * 1.2, z: d.z / l * 1.2 }, 0.5); } catch (e) { /* Boote u. a. */ }
        }
    } catch (e) { /* egal */ }
}

// Ein eigener Zaehler statt currentTick % 20: Der Takt beginnt nicht
// unbedingt bei einer geraden Zahl, und dann traefe "% 20" nie.
let walRunde = 0;
system.runInterval(() => {
    try {
        const jetzt = system.currentTick;
        const wuerfeln = walRunde++ % 10 === 0;
        for (const wal of world.getDimension("overworld").getEntities({ type: "fynn:wal" })) {
            // Die Springenden jeden Takt, die anderen nur ab und zu wuerfeln.
            if (!spruenge.has(wal.id) && !wuerfeln) continue;
            try { walTakt(wal, jetzt); } catch (fehler) { /* dieser Wal ist gerade weg */ }
        }
    } catch (fehler) {
        console.warn(`Tiere, Walsprung: ${fehler}`);
    }
}, 2);
