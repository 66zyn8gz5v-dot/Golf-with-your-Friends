// Erzeugt von werkzeuge/frostmammut_bauen.py - nicht von Hand aendern.
// Die Zeiten der Angriffe in Ticks, passend zu den Animationen.
export const ANGRIFFE = {
    "ansturm": {
        "nr": 1,
        "laenge": 52,
        "los": 16,
        "halt": 36
    },
    "stampfen": {
        "nr": 2,
        "laenge": 40,
        "schlag": 16
    },
    "stosszahnfeger": {
        "nr": 3,
        "laenge": 32,
        "treffer": [
            12,
            19
        ]
    },
    "eiszapfenregen": {
        "nr": 4,
        "laenge": 52,
        "zeichen": 20,
        "fall": 36
    },
    "ruesselschleuder": {
        "nr": 5,
        "laenge": 32,
        "wurf": 14
    },
    "frostatem": {
        "nr": 6,
        "laenge": 52,
        "von": 12,
        "bis": 44
    },
    "eiswoelfe": {
        "nr": 7,
        "laenge": 44,
        "ruf": 24
    },
    "wechsel": {
        "nr": 8,
        "laenge": 100,
        "laden_von": 20,
        "laden_bis": 72,
        "umschlag": 84
    },
    "auftritt": {
        "nr": 9,
        "laenge": 60,
        "bereit": 56
    },
    "abschied": {
        "nr": 10,
        "laenge": 80,
        "beute": 64
    }
};
export const LEBEN = {"1": 280, "2": 420, "3": 560, "4": 700, "5": 840, "6": 980};
export const MEHR_SPIELER = 6;
export const LETZTE_KRAFT = 30;
export const BEUTE = [["fynn:frostzahn", 1, 1, 1.0], ["fynn:herz_des_winters", 1, 1, 1.0], ["minecraft:diamond", 3, 6, 1.0], ["minecraft:packed_ice", 8, 16, 1.0], ["minecraft:blue_ice", 2, 4, 1.0], ["minecraft:leather", 6, 12, 1.0], ["minecraft:emerald", 2, 4, 1.0], ["minecraft:experience_bottle", 4, 8, 1.0]];
export const ANTEIL = [["fynn:herz_des_winters", 1, 1, 0.5], ["minecraft:diamond", 1, 3, 1.0], ["minecraft:blue_ice", 1, 2, 1.0], ["minecraft:leather", 3, 6, 1.0], ["minecraft:experience_bottle", 2, 4, 1.0]];
