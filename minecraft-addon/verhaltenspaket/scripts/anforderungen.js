// Was eine Waffe, ein Werkzeug oder eine Ruestung verlangt.
//
// Fynn (4.72): "Fuer verschiedene Items brauche ich verschiedene
// hochgelevelte Punkte. Bei einer Holzpicke brauche ich vielleicht eins
// Mining, bei einer Diamantpicke 35 Mining. Die koennen sich auch
// kombinieren, zum Beispiel bei einer Lanze oder bei einem Schwert, dass ich
// da Angriff und Agility brauche."
//
// Holz verlangt nichts, damit man eine neue Welt ueberhaupt beginnen kann -
// die erste Holzpicke kommt, bevor es den ersten Level gibt.

export const WERTNAMEN = { ruestung: "Rüstung", angriff: "Angriff", agility: "Agility", mining: "Mining" };

// Werkzeuge, Schwerter, Lanzen nach Stoff.
const STOFF = { wooden: 0, stone: 5, copper: 8, golden: 8, iron: 15, diamond: 35, netherite: 45 };
// Ruestungen nach Stoff.
const PANZER = { leather: 0, chainmail: 8, copper: 8, golden: 8, iron: 15, diamond: 30, netherite: 40 };

// Alles, was sich nicht aus Stoff und Art ergibt - vor allem die Waffen und
// Ruestungen aus dem Paket, dazu Bogen, Armbrust, Dreizack und Streitkolben.
const EIGENE = {
    "minecraft:bow": { agility: 3 },
    "minecraft:crossbow": { agility: 5, angriff: 8 },
    "minecraft:trident": { angriff: 25, agility: 15 },
    "minecraft:mace": { angriff: 30, ruestung: 15 },
    "minecraft:turtle_helmet": { ruestung: 10 },
    // Schwerter aus dem Paket: Angriff und ein wenig Agility.
    "fynn:ritterschwert": { angriff: 15, agility: 5 },
    "fynn:eisenklinge": { angriff: 15, agility: 5 },
    "fynn:silberklinge": { angriff: 20, agility: 7 },
    "fynn:haizahnsaebel": { angriff: 20, agility: 10 },
    "fynn:schwertfischklinge": { angriff: 20, agility: 10 },
    "fynn:elektrumklinge": { angriff: 25, agility: 10 },
    "fynn:saphirschwert": { angriff: 28, agility: 10 },
    "fynn:rubinklinge": { angriff: 30, agility: 10 },
    "fynn:schwertfischschwert": { angriff: 32, agility: 12 },
    "fynn:sternenklinge": { angriff: 38, agility: 12 },
    "fynn:degen": { angriff: 12, agility: 15 },
    // Die Beute der Bosse verlangt am meisten.
    "fynn:rabenklinge": { angriff: 30, agility: 25 },
    "fynn:frostzahn": { angriff: 40, ruestung: 15 },
    "fynn:durendal": { angriff: 42, agility: 15, ruestung: 10 },
    "fynn:kriegshammer": { angriff: 28, ruestung: 15 },
    // Dolche: vor allem Agility.
    "fynn:eisendolche": { agility: 15, angriff: 7 },
    "fynn:silberdolche": { agility: 20, angriff: 10 },
    "fynn:stahldolche": { agility: 25, angriff: 12 },
    "fynn:elektrumdolche": { agility: 25, angriff: 12 },
    "fynn:diamantdolche": { agility: 35, angriff: 15 },
    "fynn:netheritdolche": { agility: 45, angriff: 20 },
    "fynn:wurfstern": { agility: 10 },
    // Staebe und Boegen.
    "fynn:feuerstab": { angriff: 10 },
    "fynn:feuerstab_2": { angriff: 20 },
    "fynn:frostzepter": { angriff: 25, agility: 5 },
    "fynn:geweihbogen": { agility: 15 },
    "fynn:sturmbogen": { agility: 28, angriff: 15 },
};

// Die Ruestungen der Rollen, je Teil gleich.
const SAETZE = {
    ritter: [{ ruestung: 15 }, ["ritterhelm", "ritterbrustpanzer", "ritterbeinschutz", "ritterstiefel"]],
    magier: [{ ruestung: 5 }, ["magierhut", "magierrobe", "magierrock", "magierschuhe"]],
    waldlaeufer: [{ ruestung: 8, agility: 5 }, ["waldlaeuferkapuze", "waldlaeuferwams", "waldlaeuferhose", "waldlaeuferstiefel"]],
    assassine: [{ ruestung: 8, agility: 10 }, ["assassinenkapuze", "assassinenharnisch", "assassinenhose", "assassinenstiefel"]],
    baer: [{ ruestung: 12 }, ["baerenkapuze", "baerenfellmantel", "baerenfellhose", "baerenfellstiefel"]],
};
for (const [werte, teile] of Object.values(SAETZE)) for (const t of teile) EIGENE[`fynn:${t}`] = werte;

/** Was ein Gegenstand verlangt, z. B. { angriff: 15, agility: 5 } - oder null. */
export function anforderungFuer(typ) {
    if (!typ) return null;
    if (EIGENE[typ]) return EIGENE[typ];
    let m = /^minecraft:(wooden|stone|copper|golden|iron|diamond|netherite)_(sword|pickaxe|axe|shovel|hoe|spear)$/.exec(typ);
    if (m) {
        const s = STOFF[m[1]];
        if (s === 0) return null;
        switch (m[2]) {
            case "sword": return { angriff: s, agility: Math.floor(s / 3) };
            case "spear": return { angriff: Math.floor(s * 0.8), agility: Math.floor(s * 0.6) };
            case "axe": return { mining: s, angriff: Math.floor(s / 2) };
            default: return { mining: s };
        }
    }
    m = /^minecraft:(leather|chainmail|copper|golden|iron|diamond|netherite)_(helmet|chestplate|leggings|boots)$/.exec(typ);
    if (m && PANZER[m[1]]) return { ruestung: PANZER[m[1]] };
    return null;
}

export function istWerkzeug(typ) {
    return /_(pickaxe|axe|shovel|hoe)$/.test(typ ?? "");
}

/** Die Zeilen fuer das Buch: welche Stufe wofuer. */
export const UEBERSICHT = [
    "§6Werkzeuge§r (Mining): Holz 0 · Stein 5 · Kupfer und Gold 8 · Eisen 15 · Diamant 35 · Netherit 45. Äxte dazu die Hälfte Angriff.",
    "§6Schwerter§r: Angriff wie beim Werkzeug, dazu ein Drittel Agility. §6Lanzen§r: vier Fünftel Angriff, drei Fünftel Agility.",
    "§6Rüstung§r (Rüstung): Leder 0 · Kette, Kupfer, Gold 8 · Eisen 15 · Diamant 30 · Netherit 40.",
    "§6Dolche§r vor allem Agility (Eisen 15 bis Netherit 45), §6Stäbe§r Angriff (10 bis 25), §6Bögen§r Agility (Bogen 3, Armbrust 5, Sturmbogen 28).",
    "§6Die Beute der Bosse§r verlangt am meisten: Durendal Angriff 42, Frostzahn Angriff 40, Rabenklinge Angriff 30 und Agility 25.",
];
