// Der Starttempel: Wer zum ersten Mal in die Welt kommt, steht in einem
// Tempel hoch am Himmel und waehlt dort seine Rolle.
//
// Fynns Idee: "man spawnt in einer Struktur so ein Starter-Tempel ... kann
// dann da seine Rolle auswaehlen, und die ist da so leicht vorgestellt,
// was man da bekommt." Darum steht an jeder der vier Seiten eine
// Steinstatue, die genau die Startausruestung ihrer Rolle traegt, davor
// der Altar dieser Rolle. Antippen, bestaetigen - dann gibt es die
// Ausruestung, und in der Mitte oeffnet sich ein Tor im Boden.
//
// Hinunter geht es zu Fuss: Fynn wollte "runterspringen ... eine
// Fallanimation, aber keinen Fallschaden", um "die Umgebung abzuchecken".
// Der Tempel steht deshalb ganz oben (Hoehe 290), man faellt gut 200
// Bloecke durch die Luft, und kurz vor dem Boden bremst ein Fallschirm-
// Effekt (langsames Fallen). Den ganzen Sturz ueber schuetzt Resistenz V.
//
// Danach verschwindet der Tempel wieder - "er soll nicht einfach in der
// Welt rumchillen". Sobald niemand mehr oben steht, wird er abgebaut, samt
// Statuen. Kommt spaeter ein neuer Spieler, entsteht er fuer ihn neu, an
// derselben Stelle. Wer schon eine Rolle hatte (aus der Zeit vor dem
// Tempel), wird nicht hinaufgeholt.
//
// Solange man im Tempel ist, gilt der Abenteuermodus: Abbauen geht nicht,
// man faellt also auch nicht aus Versehen durch den Boden.

import { world, system, BlockPermutation, ItemStack, GameMode } from "@minecraft/server";
import { ActionFormData } from "@minecraft/server-ui";
import { ROLLEN, rolleVon, setzeRolle } from "./rollen.js";

const TEMPEL_SCHLUESSEL = "fynn:tempel";        // an der Welt: wo er steht
const GESTARTET = "fynn:gestartet";             // am Spieler: war schon oben
const AUSGERUESTET = "fynn:ausgeruestet";       // am Spieler: Startausruestung bekommen
const STEHT = "fynn:tempel_steht";              // an der Welt: gerade aufgebaut?
const MODUS = "fynn:modus";                     // am Spieler: Spielmodus vor dem Tempel
const STURZ = "fynn:sturz";                     // am Spieler: faellt gerade vom Tempel

// Ganz oben, damit der Sprung lang wird. Die Welt endet bei 319; darunter
// braucht der Tempel noch Platz fuer Laternen und Insel.
const TEMPEL_HOEHE = 290;
const HOECHSTE_HOEHE = 312;
// Ab dieser Entfernung zum Boden bremst der Fallschirm.
const BREMSWEG = 14;

// Welche Rolle an welcher Seite steht, und wohin Altar und Statue dann
// schauen. "blick" ist die Richtung von der Seite zur Mitte; "zustand"
// die Ausrichtung des Altars (Front zur Mitte, siehe altar_bauen.py);
// "drehung" die Blickrichtung der Statue in Minecrafts Grad (0 = Sueden).
export const SEITEN = [
    { rolle: "ritter",        dx: 0,  dz: -1, zustand: "north", drehung: 0 },
    { rolle: "magier",        dx: 1,  dz: 0,  zustand: "east",  drehung: 90 },
    { rolle: "bogenschuetze", dx: 0,  dz: 1,  zustand: "south", drehung: 180 },
    { rolle: "assassine",     dx: -1, dz: 0,  zustand: "west",  drehung: -90 },
];

// Farbiger Weg von der Mitte zu jedem Altar, in der Farbe der Rolle.
const WEGFARBE = {
    ritter: "minecraft:yellow_concrete", magier: "minecraft:blue_concrete",
    bogenschuetze: "minecraft:lime_concrete", assassine: "minecraft:red_concrete",
};

// ------------------------------------------------------------ Ausruestung

function ding(typ, anzahl = 1) {
    return () => new ItemStack(typ, anzahl);
}

// Je Rolle: was angezogen wird (Kopf, Brust, Beine, Fuesse), was in die
// Haende kommt und was ins Inventar. Die Statuen tragen dasselbe.
export const AUSRUESTUNG = {
    ritter: {
        // Ein Steinschwert, kein Eisen: Fynn fand ein Eisenschwert zum Start
        // "schon ein krankes Starter-Equip". Das bessere findet man unterwegs.
        text: "Ritterrüstung, Steinschwert, Schild",
        anziehen: ["fynn:ritterhelm", "fynn:ritterbrustpanzer", "fynn:ritterbeinschutz", "fynn:ritterstiefel"].map((t) => ding(t)),
        haupthand: ding("minecraft:stone_sword"),
        zweithand: ding("minecraft:shield"),
        dazu: [ding("minecraft:bread", 8)],
    },
    magier: {
        text: "Magierrobe mit Zauberhut, Feuerstab II",
        anziehen: ["fynn:magierhut", "fynn:magierrobe", "fynn:magierrock", "fynn:magierschuhe"].map((t) => ding(t)),
        haupthand: ding("fynn:feuerstab_2"),
        dazu: [ding("minecraft:bread", 8)],
    },
    bogenschuetze: {
        text: "Waldläufer-Rüstung mit Köcher, Bogen, Pfeile und Eisenpfeile",
        anziehen: ["fynn:waldlaeuferkapuze", "fynn:waldlaeuferwams", "fynn:waldlaeuferhose",
            "fynn:waldlaeuferstiefel"].map((t) => ding(t)),
        haupthand: ding("minecraft:bow"),
        dazu: [ding("minecraft:arrow", 32), ding("fynn:eisenpfeil", 16), ding("minecraft:bread", 8)],
    },
    assassine: {
        text: "Assassinen-Montur, Eisendolche",
        anziehen: ["fynn:assassinenkapuze", "fynn:assassinenharnisch", "fynn:assassinenhose",
            "fynn:assassinenstiefel"].map((t) => ding(t)),
        haupthand: ding("fynn:eisendolche"),
        dazu: [ding("minecraft:bread", 8)],
    },
};
const PLAETZE = ["Head", "Chest", "Legs", "Feet"];
const BEFEHLSPLAETZE = ["slot.armor.head", "slot.armor.chest", "slot.armor.legs", "slot.armor.feet"];

function ausruesten(spieler, rolle) {
    const a = AUSRUESTUNG[rolle];
    const ausruestung = spieler.getComponent("minecraft:equippable");
    const inventar = spieler.getComponent("minecraft:inventory")?.container;
    const uebrig = [];
    const verstauen = (stueck) => {
        const rest = inventar?.addItem(stueck);
        if (rest) uebrig.push(rest);
    };
    a.anziehen.forEach((machen, i) => {
        const stueck = machen();
        // Was schon angezogen ist, bleibt; das Neue kommt dann ins Inventar.
        if (!ausruestung?.getEquipment(PLAETZE[i])) ausruestung?.setEquipment(PLAETZE[i], stueck);
        else verstauen(stueck);
    });
    verstauen(a.haupthand());
    if (a.zweithand) {
        if (!ausruestung?.getEquipment("Offhand")) ausruestung?.setEquipment("Offhand", a.zweithand());
        else verstauen(a.zweithand());
    }
    for (const machen of a.dazu) verstauen(machen());
    spieler.setDynamicProperty(AUSGERUESTET, true);
    return uebrig;
}

// ------------------------------------------------------------ Bauplan

/**
 * Alles, was den Tempel ausmacht, als Liste: Ort, Block, Zustaende.
 * Mitte ist der Punkt, auf dem man in der Mitte steht (die Fuesse).
 */
export function bauplan(mitte) {
    const plan = [];
    const setze = (dx, dy, dz, typ, zustaende) =>
        plan.push({ ort: { x: mitte.x + dx, y: mitte.y + dy, z: mitte.z + dz }, typ, zustaende });

    // Die schwebende Insel darunter: ein umgedrehter Stufenberg.
    for (const [tiefe, r, typ] of [[-2, 6, "minecraft:stone_bricks"], [-3, 4, "minecraft:cobblestone"],
        [-4, 2, "minecraft:mossy_cobblestone"], [-5, 0, "minecraft:mossy_cobblestone"]]) {
        for (let dx = -r; dx <= r; dx++) for (let dz = -r; dz <= r; dz++) setze(dx, tiefe, dz, typ);
    }

    // Der Boden, 15 mal 15: Steinziegel, ein Ring aus gemeisselten Ziegeln,
    // in der Mitte Quarz, von dort farbige Wege zu den Altaeren.
    for (let dx = -7; dx <= 7; dx++) {
        for (let dz = -7; dz <= 7; dz++) {
            const r = Math.max(Math.abs(dx), Math.abs(dz));
            let typ = "minecraft:stone_bricks";
            if (r <= 1) typ = "minecraft:chiseled_quartz_block";
            else if (r === 5) typ = "minecraft:chiseled_stone_bricks";
            setze(dx, -1, dz, typ);
        }
    }
    for (const s of SEITEN) {
        for (let schritt = 2; schritt <= 4; schritt++) setze(s.dx * schritt, -1, s.dz * schritt, WEGFARBE[s.rolle]);
    }

    // Die Mauer rundum, anderthalb Bloecke hoch - darueber springt keiner.
    for (let i = -7; i <= 7; i++) {
        const quer = { wall_connection_type_east: "short", wall_connection_type_west: "short", wall_post_bit: false };
        const laengs = { wall_connection_type_north: "short", wall_connection_type_south: "short", wall_post_bit: false };
        if (Math.abs(i) === 7) continue;              // Ecken: dort stehen Saeulen
        setze(i, 0, -7, "minecraft:stone_brick_wall", quer);
        setze(i, 0, 7, "minecraft:stone_brick_wall", quer);
        setze(-7, 0, i, "minecraft:stone_brick_wall", laengs);
        setze(7, 0, i, "minecraft:stone_brick_wall", laengs);
    }

    // Vier Ecksaeulen mit Laternen obendrauf.
    for (const [dx, dz] of [[-7, -7], [7, -7], [-7, 7], [7, 7]]) {
        for (let dy = 0; dy < 4; dy++) setze(dx, dy, dz, dy === 3 ? "minecraft:chiseled_stone_bricks" : "minecraft:stone_bricks");
        setze(dx, 4, dz, "minecraft:lantern");
    }

    // Je Seite: Sockel fuer die Statue, davor der Altar.
    for (const s of SEITEN) {
        setze(s.dx * 6, 0, s.dz * 6, "minecraft:chiseled_stone_bricks");
        setze(s.dx * 4, 0, s.dz * 4, "fynn:tempelaltar",
            { "fynn:rolle": s.rolle, "minecraft:cardinal_direction": s.zustand });
    }

    // Luft ueber dem Boden, damit nichts im Weg steht (Wolken sind keine
    // Bloecke, aber vielleicht ein Baum oder ein Berg).
    const belegt = new Set(plan.map((p) => `${p.ort.x},${p.ort.y},${p.ort.z}`));
    for (let dx = -6; dx <= 6; dx++) {
        for (let dz = -6; dz <= 6; dz++) {
            for (let dy = 0; dy <= 4; dy++) {
                const ort = { x: mitte.x + dx, y: mitte.y + dy, z: mitte.z + dz };
                if (!belegt.has(`${ort.x},${ort.y},${ort.z}`)) plan.unshift({ ort, typ: "minecraft:air" });
            }
        }
    }
    return plan;
}

// Das Tor in der Mitte: drei mal drei Bloecke, durch Boden und Insel.
function torBloecke(mitte) {
    const ort = [];
    for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
            for (let dy = -1; dy >= -5; dy--) ort.push({ x: mitte.x + dx, y: mitte.y + dy, z: mitte.z + dz });
        }
    }
    return ort;
}

function torAuf(dimension, mitte) {
    for (const ort of torBloecke(mitte)) {
        try {
            dimension.setBlockType(ort, "minecraft:air");
        } catch (e) {
            // nicht geladen - dann bleibt der Block
        }
    }
    try {
        dimension.playSound("block.iron_door.open", { x: mitte.x + 0.5, y: mitte.y, z: mitte.z + 0.5 });
    } catch (e) {
        // ohne Ton geht es auch
    }
}

function torZu(dimension, mitte) {
    const schluessel = new Set(torBloecke(mitte).map((o) => `${o.x},${o.y},${o.z}`));
    for (const teil of bauplan(mitte)) {
        if (!schluessel.has(`${teil.ort.x},${teil.ort.y},${teil.ort.z}`)) continue;
        try {
            dimension.setBlockType(teil.ort, teil.typ);
        } catch (e) {
            // nicht geladen
        }
    }
}

export function abbauen(dimension, mitte) {
    for (const teil of bauplan(mitte)) {
        if (teil.typ === "minecraft:air") continue;
        try {
            dimension.setBlockType(teil.ort, "minecraft:air");
        } catch (e) {
            // nicht geladen - der Rest geht trotzdem
        }
    }
    for (const s of SEITEN) {
        for (const figur of dimension.getEntities({ tags: [`fynn_statue_${s.rolle}`] })) {
            try {
                figur.remove();
            } catch (e) {
                // schon weg
            }
        }
    }
    world.setDynamicProperty(STEHT, false);
}

function bauen(dimension, mitte) {
    let fehler = 0;
    for (const teil of bauplan(mitte)) {
        try {
            if (teil.zustaende) {
                dimension.setBlockPermutation(teil.ort, BlockPermutation.resolve(teil.typ, teil.zustaende));
            } else {
                dimension.setBlockType(teil.ort, teil.typ);
            }
        } catch (e) {
            // Zustaende, die es so nicht gibt: dann eben der schlichte Block.
            try {
                dimension.setBlockType(teil.ort, teil.typ);
            } catch (e2) {
                fehler += 1;
            }
        }
    }
    for (const s of SEITEN) statue(dimension, mitte, s);
    world.setDynamicProperty(STEHT, true);
    if (fehler) console.warn(`Tempel: ${fehler} Bloecke nicht gesetzt`);
}

function statue(dimension, mitte, seite) {
    const ort = { x: mitte.x + seite.dx * 6 + 0.5, y: mitte.y + 1, z: mitte.z + seite.dz * 6 + 0.5 };
    const figur = dimension.spawnEntity("fynn:statue", ort);
    figur.setRotation({ x: 0, y: seite.drehung });
    const r = ROLLEN[seite.rolle];
    figur.nameTag = `${r.farbe}${r.name}`;
    const marke = `fynn_statue_${seite.rolle}`;
    figur.addTag(marke);
    // Ausruestung fuer ein Wesen geht nur ueber Befehle; die Schnittstelle
    // fuer Ausruestung gibt es nur bei Spielern.
    const a = AUSRUESTUNG[seite.rolle];
    const ziel = `@e[tag=${marke}]`;
    a.anziehen.forEach((machen, i) =>
        dimension.runCommand(`replaceitem entity ${ziel} ${BEFEHLSPLAETZE[i]} 0 ${machen().typeId}`));
    dimension.runCommand(`replaceitem entity ${ziel} slot.weapon.mainhand 0 ${a.haupthand().typeId}`);
    if (a.zweithand) dimension.runCommand(`replaceitem entity ${ziel} slot.weapon.offhand 0 ${a.zweithand().typeId}`);
}

// ------------------------------------------------------------ Ankunft

function tempelOrt() {
    const text = world.getDynamicProperty(TEMPEL_SCHLUESSEL);
    return typeof text === "string" ? JSON.parse(text) : undefined;
}

function hinauf(spieler, versuch = 0) {
    try {
        const dimension = world.getDimension("overworld");
        let mitte = tempelOrt();
        if (mitte && world.getDynamicProperty(STEHT) === undefined) {
            // Ein alter, niedriger Tempel (siehe alterTempelWeg): weg damit,
            // der neue kommt nach oben.
            abbauen(dimension, mitte);
            mitte = undefined;
        }
        if (!mitte) {
            const hier = spieler.location;
            mitte = {
                x: Math.floor(hier.x),
                y: Math.min(HOECHSTE_HOEHE, Math.max(TEMPEL_HOEHE, Math.floor(hier.y) + 30)),
                z: Math.floor(hier.z),
            };
        }
        if (world.getDynamicProperty(STEHT) !== true) {
            // Nur bauen, wenn die Gegend geladen ist - kurz nach dem
            // Erscheinen ist sie das manchmal noch nicht.
            if (!dimension.getBlock(mitte)) throw new Error("noch nicht geladen");
            bauen(dimension, mitte);
            world.setDynamicProperty(TEMPEL_SCHLUESSEL, JSON.stringify(mitte));
        }

        const modus = String(spieler.getGameMode());
        if (modus.toLowerCase() === "survival") {
            spieler.setDynamicProperty(MODUS, modus);
            spieler.setGameMode(GameMode.Adventure);
        }
        spieler.teleport({ x: mitte.x + 0.5, y: mitte.y, z: mitte.z + 0.5 },
            { dimension, facingLocation: { x: mitte.x + 0.5, y: mitte.y + 1.5, z: mitte.z - 4 } });
        spieler.onScreenDisplay.setTitle("§6Willkommen", {
            subtitle: "§7Wähle deine Rolle an einem der vier Altäre",
            fadeInDuration: 10, stayDuration: 80, fadeOutDuration: 20,
        });
    } catch (fehler) {
        if (versuch < 10) system.runTimeout(() => hinauf(spieler, versuch + 1), 20);
        else console.warn(`Tempel, Ankunft: ${fehler}`);
    }
}

world.afterEvents.playerSpawn.subscribe((e) => {
    try {
        if (!e.initialSpawn) return;
        const spieler = e.player;
        if (spieler.getDynamicProperty(GESTARTET)) return;
        // Wer schon eine Rolle hat, kennt das Spiel - kein Tempel.
        if (rolleVon(spieler)) {
            spieler.setDynamicProperty(GESTARTET, true);
            return;
        }
        system.runTimeout(() => hinauf(spieler), 40);
    } catch (fehler) {
        console.warn(`Tempel, Erscheinen: ${fehler}`);
    }
});

// ------------------------------------------------------------ Wahl

// Nach der Wahl: Spielmodus zurueck, Tor auf, Sprung.
function losspringen(spieler) {
    const modus = spieler.getDynamicProperty(MODUS);
    if (typeof modus === "string") {
        spieler.setGameMode(modus);
        spieler.setDynamicProperty(MODUS, undefined);
    }
    spieler.setDynamicProperty(GESTARTET, true);
    const mitte = tempelOrt();
    if (mitte) torAuf(world.getDimension("overworld"), mitte);
    spieler.onScreenDisplay.setTitle("§6Spring!", {
        subtitle: "§7Das Tor in der Mitte ist offen - unten landest du sicher",
        fadeInDuration: 5, stayDuration: 60, fadeOutDuration: 15,
    });
}

// ------------------------------------------------------------ Sturz

// Wer unter dem Tempel faellt, faellt sicher: Resistenz V nimmt jeden
// Schaden, und nahe am Boden bremst langsames Fallen, das den Fallschaden
// ohnehin aufhebt - doppelt, weil ein Sturz aus 200 Bloecken keinen
// zweiten Versuch hat. Gilt fuer jeden, der aus dem Tempel faellt, auch
// wer ohne Wahl durchs offene Tor rutscht.
function unterDemTempel(spieler, mitte) {
    const o = spieler.location;
    return Math.abs(o.x - (mitte.x + 0.5)) <= 9 && Math.abs(o.z - (mitte.z + 0.5)) <= 9 && o.y < mitte.y - 6;
}

function obenImTempel(spieler, mitte) {
    const o = spieler.location;
    return Math.abs(o.x - (mitte.x + 0.5)) <= 8 && Math.abs(o.z - (mitte.z + 0.5)) <= 8
        && o.y >= mitte.y - 2 && o.y <= mitte.y + 6;
}

function sturzTakt() {
    if (world.getDynamicProperty(STEHT) !== true && !world.getAllPlayers().some((p) => p.getDynamicProperty(STURZ))) return;
    const mitte = tempelOrt();
    if (!mitte) return;
    const dimension = world.getDimension("overworld");
    for (const spieler of world.getAllPlayers()) {
        try {
            if (!spieler.getDynamicProperty(STURZ)) {
                if (world.getDynamicProperty(STEHT) !== true || !unterDemTempel(spieler, mitte)) continue;
                if (spieler.dimension.id !== dimension.id) continue;
                spieler.setDynamicProperty(STURZ, true);
                const modus = spieler.getDynamicProperty(MODUS);
                if (typeof modus === "string") {
                    spieler.setGameMode(modus);
                    spieler.setDynamicProperty(MODUS, undefined);
                }
                // Ist oben niemand mehr, wird der Tempel abgebaut; sonst
                // nur das Tor geschlossen, damit keiner vor der Wahl faellt.
                if (world.getAllPlayers().some((p) => p.id !== spieler.id && obenImTempel(p, mitte))) torZu(dimension, mitte);
                else abbauen(dimension, mitte);
            }
            spieler.addEffect("resistance", 40, { amplifier: 4, showParticles: false });
            if (spieler.isOnGround || spieler.isInWater) {
                spieler.setDynamicProperty(STURZ, undefined);
                spieler.onScreenDisplay.setTitle("§aGelandet", {
                    subtitle: "§7Viel Glück da draußen", fadeInDuration: 5, stayDuration: 40, fadeOutDuration: 15,
                });
                continue;
            }
            const boden = spieler.dimension.getBlockFromRay(spieler.location, { x: 0, y: -1, z: 0 },
                { maxDistance: BREMSWEG, includeLiquidBlocks: true });
            if (boden) spieler.addEffect("slow_falling", 60, { amplifier: 0, showParticles: false });
        } catch (fehler) {
            console.warn(`Tempel, Sturz: ${fehler}`);
        }
    }
}
system.runInterval(sturzTakt, 2);

// Aufraeumen nach dem Wechsel auf diese Fassung: Bis 4.28 stand der
// Tempel 50 Bloecke ueber dem Spawn und blieb fuer immer stehen - so in
// Fynns Welt. Einen solchen alten Tempel erkennt man daran, dass die Welt
// noch nie "steht" gespeichert hat. Er wird abgebaut, sobald seine Gegend
// geladen ist, und sein Ort vergessen; ein neuer Tempel entsteht dann oben.
function alterTempelWeg() {
    try {
        const mitte = tempelOrt();
        if (!mitte || world.getDynamicProperty(STEHT) !== undefined) return;
        const dimension = world.getDimension("overworld");
        if (!dimension.getBlock(mitte)) return;           // noch nicht geladen
        abbauen(dimension, mitte);
        world.setDynamicProperty(TEMPEL_SCHLUESSEL, undefined);
    } catch (fehler) {
        // Gegend nicht geladen - beim naechsten Takt wieder
    }
}
system.runInterval(alterTempelWeg, 100);

async function tempelwahl(spieler, rolle, versuch = 0) {
    const r = ROLLEN[rolle];
    const schonAusgeruestet = !!spieler.getDynamicProperty(AUSGERUESTET);
    const form = new ActionFormData()
        .title(`${r.farbe}${r.name}`)
        .body(`${r.kurz}\n\n`
            + (schonAusgeruestet
                ? "Deine Startausrüstung hast du schon bekommen."
                : `Startausrüstung: ${AUSRUESTUNG[rolle].text}.`)
            + "\n\nDie Rolle kannst du später an jedem Rollenaltar wechseln - die Ausrüstung gibt es nur einmal.")
        .button(`${r.farbe}${r.name} werden`, r.bild)
        .button("§8Noch umsehen");
    const antwort = await form.show(spieler);
    if (antwort.canceled) {
        if (antwort.cancelationReason === "UserBusy" && versuch < 10) {
            system.runTimeout(() => tempelwahl(spieler, rolle, versuch + 1), 5);
        }
        return;
    }
    if (antwort.selection !== 0) return;

    setzeRolle(spieler, rolle);
    const uebrig = schonAusgeruestet ? [] : ausruesten(spieler, rolle);
    for (const rest of uebrig) spieler.dimension.spawnItem(rest, spieler.location);
    losspringen(spieler);
}

system.beforeEvents.startup.subscribe((e) => {
    e.blockComponentRegistry.registerCustomComponent("fynn:tempelwahl", {
        onPlayerInteract(ereignis) {
            const spieler = ereignis.player;
            if (!spieler) return;
            const rolle = ereignis.block.permutation.getState("fynn:rolle");
            if (!ROLLEN[rolle]) return;
            system.run(() => {
                tempelwahl(spieler, rolle).catch((fehler) => console.warn(`Tempel, Wahl: ${fehler}`));
            });
        },
    });
});
