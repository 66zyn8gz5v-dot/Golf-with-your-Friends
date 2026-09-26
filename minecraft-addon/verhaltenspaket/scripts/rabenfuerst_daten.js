// Erzeugt von werkzeuge/rabenfuerst_bauen.py - nicht von Hand aendern.
// Die Zeiten der Angriffe in Ticks, passend zu den Animationen.
export const ANGRIFFE = {
    "dolchfaecher": {
        "nr": 1,
        "laenge": 26,
        "wurf": 10
    },
    "rauchbombe": {
        "nr": 2,
        "laenge": 48,
        "bombe": 6,
        "weg": 9,
        "hinter": 28,
        "stich": 31
    },
    "doppelgaenger": {
        "nr": 3,
        "laenge": 36,
        "schatten": 18
    },
    "rabenschwarm": {
        "nr": 4,
        "laenge": 48,
        "los": 16,
        "von": 20,
        "bis": 42
    },
    "schattensprung": {
        "nr": 5,
        "laenge": 40,
        "schnitte": [
            10,
            20,
            30
        ]
    },
    "rabennacht": {
        "nr": 6,
        "laenge": 52,
        "nacht": 16
    },
    "wechsel": {
        "nr": 7,
        "laenge": 100,
        "laden_von": 20,
        "laden_bis": 72,
        "umschlag": 84
    },
    "auftritt": {
        "nr": 8,
        "laenge": 60,
        "bereit": 56
    },
    "abschied": {
        "nr": 9,
        "laenge": 80,
        "beute": 64
    }
};
export const LEBEN = {"1": 200, "2": 300, "3": 400, "4": 500, "5": 600, "6": 700};
export const MEHR_SPIELER = 6;
export const LETZTE_KRAFT = 30;
export const BEUTE = [["fynn:rabenklinge", 1, 1, 1.0], ["fynn:rauchbombe", 4, 8, 1.0], ["minecraft:emerald", 4, 8, 1.0], ["minecraft:gold_ingot", 3, 6, 1.0], ["minecraft:gold_nugget", 8, 16, 1.0], ["minecraft:diamond", 1, 3, 1.0], ["minecraft:golden_apple", 1, 1, 1.0], ["minecraft:experience_bottle", 3, 6, 1.0], ["fynn:haizahnsaebel", 1, 1, 0.3]];
export const ANTEIL = [["minecraft:emerald", 2, 4, 1.0], ["minecraft:gold_ingot", 2, 3, 1.0], ["fynn:rauchbombe", 2, 3, 1.0], ["minecraft:golden_apple", 1, 1, 0.5], ["minecraft:experience_bottle", 2, 3, 1.0]];
