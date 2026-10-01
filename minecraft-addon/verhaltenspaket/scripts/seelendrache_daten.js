// Erzeugt von werkzeuge/seelendrache_bauen.py - nicht von Hand aendern.
// Die Zeiten der Angriffe in Ticks, passend zu den Animationen.
export const ANGRIFFE = {
    "seelenstrahl": {
        "nr": 1,
        "laenge": 88,
        "laden": 4,
        "von": 24,
        "bis": 68
    },
    "seelenkreise": {
        "nr": 2,
        "laenge": 80,
        "zeichen": 20,
        "ausbruch": 40,
        "zeichen2": 48,
        "ausbruch2": 64
    },
    "fluegelschlag": {
        "nr": 3,
        "laenge": 44,
        "schlaege": [
            14,
            28
        ]
    },
    "schweifhieb": {
        "nr": 4,
        "laenge": 32,
        "treffer": 13
    },
    "seelensog": {
        "nr": 5,
        "laenge": 64,
        "sog_von": 12,
        "sog_bis": 40,
        "knall": 44
    },
    "seelenspiegel": {
        "nr": 6,
        "laenge": 48,
        "spaltung": 26
    },
    "seelensturm": {
        "nr": 7,
        "laenge": 104,
        "abheben": 16,
        "oben": 28,
        "regen": [
            36,
            46,
            56,
            66
        ],
        "sturz": 78,
        "aufprall": 84
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
        "laenge": 64,
        "bereit": 56
    },
    "abschied": {
        "nr": 10,
        "laenge": 80,
        "beute": 64
    },
    "seelengericht": {
        "nr": 11,
        "laenge": 132,
        "laden_von": 20,
        "laden_bis": 100,
        "entladung": 108
    }
};
export const LEBEN = {"1": 320, "2": 480, "3": 640, "4": 800, "5": 960, "6": 1120};
export const MEHR_SPIELER = 6;
export const LETZTE_KRAFT = 30;
export const BEUTE = [["fynn:erfahrungsgefaess", 1, 1, 1.0], ["fynn:seelenklinge", 1, 1, 1.0], ["fynn:seelenkristall", 2, 3, 1.0], ["minecraft:diamond", 4, 7, 1.0], ["minecraft:echo_shard", 2, 4, 1.0], ["minecraft:soul_lantern", 2, 4, 1.0], ["minecraft:emerald", 3, 6, 1.0], ["minecraft:experience_bottle", 6, 10, 1.0]];
export const ANTEIL = [["fynn:erfahrungsgefaess", 1, 1, 1.0], ["fynn:seelenkristall", 1, 1, 1.0], ["minecraft:diamond", 1, 3, 1.0], ["minecraft:echo_shard", 1, 2, 1.0], ["minecraft:experience_bottle", 2, 4, 1.0]];
// Wo das Maul steht (Bloecke vor und ueber den Fuessen): beim Strahl und im Flug.
export const MAUL = { vor: 6.69, hoch: 3.57 };
export const MAUL_FLUG = { vor: 6.1, hoch: 2.1 };
