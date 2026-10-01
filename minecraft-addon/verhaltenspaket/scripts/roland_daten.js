// Erzeugt von werkzeuge/roland_bewegung.py - nicht von Hand aendern.
// Die Zeiten der Angriffe in Ticks, passend zu den Animationen.
export const ANGRIFFE = {
    "schildstoss": {
        "nr": 1,
        "laenge": 28,
        "anlauf": 9,
        "stoss": 14,
        "ende_anlauf": 17
    },
    "klingenwirbel": {
        "nr": 2,
        "laenge": 38,
        "treffer": [
            16,
            24
        ]
    },
    "sprungschlag": {
        "nr": 3,
        "laenge": 46,
        "absprung": 10,
        "landung": 24
    },
    "schildwall": {
        "nr": 4,
        "laenge": 50,
        "von": 5,
        "bis": 40
    },
    "sternenklingen": {
        "nr": 5,
        "laenge": 56,
        "zeichen": [
            12,
            26
        ],
        "einschlag": [
            30,
            44
        ]
    },
    "saphirwelle": {
        "nr": 6,
        "laenge": 34,
        "welle": 14
    },
    "ruf_des_ordens": {
        "nr": 7,
        "laenge": 48,
        "ruf": 20
    },
    "phasenwechsel": {
        "nr": 8,
        "laenge": 100,
        "knien": 20,
        "laden_von": 20,
        "laden_bis": 72,
        "welle": 84
    },
    "auftritt": {
        "nr": 9,
        "laenge": 64,
        "bereit": 60
    },
    "konter": {
        "nr": 10,
        "laenge": 12,
        "treffer": 5
    },
    "abschied": {
        "nr": 11,
        "laenge": 80,
        "licht": 64
    }
};
