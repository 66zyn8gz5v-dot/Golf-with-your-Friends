"""Vier neue Waffen, eine je Rolle - gezeichnet fuer das 3D-Modell.

KARTE ist jeweils die Waffe hochkant, wie bei den Schwertern: Jeder Pixel
wird ein Kaestchen, TIEFE sagt je Zeichen, wie dick. Die Inventarbilder
malt das Werkzeug schraeg aus denselben Farben (neue_waffen_bauen.py).

Kriegshammer (Ritter): ein Kopf aus Stahl, breit wie ein Amboss, mit
goldener Rune und einem Dorn obendrauf; langer Eichenstiel mit
Lederwicklung. Der Kopf ist so tief wie breit - ein Klotz, keine
Scheibe.

Frostzepter (Magier): ein Eiskristall mit hellem Kern, von silbernen
Klauen gehalten, auf einem duennen Schaft aus kaltem Stahl.
"""

KRIEGSHAMMER = {
    "mitte": 6.5,
    "karte": [
        "......S......",
        ".....SMS.....",
        ".LLLLLMLLLLL.",
        ".LMMMMMMMMMD.",
        ".LMMMMGMMMMD.",
        ".LMMMGgGMMMD.",
        ".LMMMMGMMMMD.",
        ".DDDDDDDDDDD.",
        "....gGGGg....",
        ".....WwW.....",
        ".....WwW.....",
        ".....wWw.....",
        ".....WwW.....",
        ".....WwW.....",
        ".....wWw.....",
        ".....WwW.....",
        ".....WwW.....",
        ".....wWw.....",
        ".....WwW.....",
        ".....RrR.....",
        ".....rRr.....",
        ".....RrR.....",
        ".....rRr.....",
        ".....RrR.....",
        ".....rRr.....",
        "....gGGGg....",
        ".....gGg.....",
    ],
    "farben": {
        "S": (226, 230, 238), "L": (196, 204, 218), "M": (150, 159, 174), "D": (98, 106, 122),
        "G": (246, 204, 80), "g": (180, 130, 34),
        "W": (140, 100, 60), "w": (108, 74, 42),
        "R": (92, 58, 38), "r": (64, 40, 26),
    },
    "tiefe": {"S": 2.0, "L": 5.0, "M": 5.0, "D": 5.0, "G": 5.25, "g": 3.0,
              "W": 2.0, "w": 2.0, "R": 2.5, "r": 2.5},
    "griff": "Rr",
}

FROSTZEPTER = {
    "mitte": 4.5,
    "karte": [
        "....I....",
        "...IiI...",
        "...IiI...",
        "..IiiiI..",
        "..IiCiI..",
        "..IiCiI..",
        "..IiiiI..",
        "...IiI...",
        "...IiI...",
        "....I....",
        "..SsSsS..",
        "...SsS...",
        "....V....",
        "....v....",
        "....V....",
        "....v....",
        "....V....",
        "....v....",
        "....V....",
        "....v....",
        "....V....",
        "....v....",
        "....V....",
        "....v....",
        "....B....",
        "....b....",
        "....B....",
        "....b....",
        "....B....",
        "...SsS...",
        "....S....",
    ],
    "farben": {
        "I": (150, 214, 252), "i": (96, 176, 238), "C": (240, 252, 255),
        "S": (206, 214, 228), "s": (140, 150, 170),
        "V": (96, 116, 156), "v": (72, 88, 124),
        "B": (60, 70, 110), "b": (42, 50, 84),
    },
    "tiefe": {"I": 3.0, "i": 3.0, "C": 3.5, "S": 2.0, "s": 2.0, "V": 1.25, "v": 1.25,
              "B": 1.5, "b": 1.5},
    "griff": "Bb",
}
