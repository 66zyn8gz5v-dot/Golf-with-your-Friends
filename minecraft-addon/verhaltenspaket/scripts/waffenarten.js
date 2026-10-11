// Welche Waffe gehoert zu welcher Kampfart?
//
// Fynn (4.67): "Die Effekte und Faehigkeiten sollen von Waffen ausgehen
// und nicht von der Rolle." Wer ein Schwert haelt, kaempft wie ein Ritter
// - mit Wirbelschlag, Widerstand und Ausdauer -, wer Dolche haelt, wie ein
// Assassine, gleich welche Rolle er am Altar gewaehlt hat. Die Namen der
// Arten sind die der Rollen, damit Leiste, Farben und Ruestungen dieselben
// bleiben.

export const DOLCHE = new Set([
    "fynn:eisendolche", "fynn:silberdolche", "fynn:stahldolche",
    "fynn:elektrumdolche", "fynn:diamantdolche", "fynn:netheritdolche",
]);

// Alle Schwerter ausser dem Degen: Der hat seinen eigenen Sprungstoss und
// gehoert keiner Art.
export const SCHWERTER = new Set([
    "minecraft:wooden_sword", "minecraft:stone_sword", "minecraft:iron_sword",
    "minecraft:golden_sword", "minecraft:diamond_sword", "minecraft:netherite_sword",
    "minecraft:copper_sword",
    "fynn:ritterschwert", "fynn:eisenklinge", "fynn:silberklinge",
    "fynn:elektrumklinge", "fynn:sternenklinge", "fynn:schwertfischklinge", "fynn:schwertfischschwert", "fynn:saphirschwert", "fynn:durendal", "fynn:rabenklinge", "fynn:frostzahn",
    "fynn:rubinklinge", "fynn:haizahnsaebel",
]);

export const HAEMMER = new Set(["fynn:kriegshammer"]);

export const BOEGEN = new Set(["minecraft:bow", "minecraft:crossbow", "fynn:sturmbogen", "fynn:geweihbogen"]);

export const STAEBE = { "fynn:feuerstab": "feuer", "fynn:feuerstab_2": "feuer", "fynn:frostzepter": "frost" };

export function artDerWaffe(typ) {
    if (!typ) return undefined;
    if (SCHWERTER.has(typ) || HAEMMER.has(typ)) return "ritter";
    if (STAEBE[typ]) return "magier";
    if (BOEGEN.has(typ)) return "bogenschuetze";
    if (DOLCHE.has(typ)) return "assassine";
    return undefined;
}

export function waffeInDerHand(spieler) {
    try {
        return spieler.getComponent("minecraft:equippable")?.getEquipment("Mainhand")?.typeId;
    } catch (fehler) {
        return undefined;
    }
}

export function artInDerHand(spieler) {
    return artDerWaffe(waffeInDerHand(spieler));
}
