"""Fynns Schwert, abgetastet aus seinem flachen Pixelbild.

Das Raster war gerade - sechzehn Bildpunkte je Pixel, keine Perspektive.
Deshalb steht hier, was er gemalt hat, und nichts Geschaetztes.

Die einzige Aenderung: In Zeile 41 klaffte zwischen Klinge und
Parierstange ein Loch. Im flachen Bild sieht das aus wie ein Schatten,
im Modell haette die Klinge dort geschwebt. Die Klingenpixel aus der
Zeile darueber fuellen es.
"""

FARBEN = {'a': (243, 222, 108, 255), 'b': (194, 54, 26, 255), 'c': (166, 43, 11, 255), 'd': (245, 170, 58, 255), 'e': (227, 71, 58, 255), 'f': (242, 128, 46, 255), 'g': (240, 122, 48, 255), 'h': (58, 58, 62, 255), 'i': (154, 90, 72, 255), 'j': (233, 102, 31, 255), 'k': (246, 176, 64, 255), 'l': (236, 90, 72, 255), 'm': (224, 69, 58, 255), 'n': (246, 224, 106, 255), '.': (0, 0, 0, 0)}

KARTE = [
    ".........aa.........",
    "........aaaa........",
    ".......aaaaaa.......",
    "......aaaeeaaa......",
    "......aaeeeeaa......",
    "......aallllaa......",
    "......aallllaa......",
    "......aallllaa......",
    "......aaelleaa......",
    "......aaeeeeaa......",
    "......aaeeeeaa......",
    "......aaeeeeaa......",
    "......aabeeeaa......",
    "......aabeeeaa......",
    "......aabbeeaa......",
    "......aabbeeaa......",
    "......ddbbbedd......",
    "......ddbbbedd......",
    "......ddbbbbdd......",
    "......ddbbbbdd......",
    "......ddbbbbdd......",
    "......ddbbbbdd......",
    "......ddbbbbdd......",
    "......ddbbbbdd......",
    "......ddbbbbdd......",
    "......ddbbbbdd......",
    "......ddbbbbdd......",
    "......ddbbbbdd......",
    "......ffbbbbff......",
    "......ffbbbbff......",
    "......ffccccff......",
    "......ffccccff......",
    "......ffccccff......",
    "......ffccccff......",
    "......ffccccff......",
    "......ffccccff......",
    "......jjccccjj......",
    "......jjccccjj......",
    "......jjccccjj......",
    "......jjccccjj......",
    "......jjccccjj......",
    ".nn...jjccccjj...kk.",
    "knkkgkkggmmggkkgknkg",
    "gggggkggmmmmgggggggg",
    "...ggccccccccccgg...",
    "........hhhh........",
    "........hhhh........",
    "........iiii........",
    "........iiii........",
    "........hhhh........",
    "........hhhh........",
    "........iiii........",
    "........iiii........",
    "........hhhh........",
    "........hhhh........",
    "........iiii........",
    "........iiii........",
    "........hhhh........",
    ".........nn.........",
    "........knkg........",
    ".......mgkgmm.......",
    "........mccm........",
    ".........cc.........",
]
MITTE = 10.0
