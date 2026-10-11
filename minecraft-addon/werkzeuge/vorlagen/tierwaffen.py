"""Waffen aus Tierbeute - gezeichnet fuer das 3D-Modell, hochkant.

Schwertfischklinge: Die Klinge ist das Schwert des Schwertfischs selbst,
dunkel schiefergrau mit hellerer Kante, zur Spitze hin schmal. Am Ansatz
schimmert noch die blausilberne Haut des Fischs, darunter eine
Parierstange aus Knochen, ein Lederegriff und ein goldener Knauf.
Jedes Zeichen hat seine Dicke: die Klinge flach, die Parierstange
wuchtig - wie bei den anderen 3D-Waffen (neue_waffen.py).
"""

SCHWERTFISCHKLINGE = {
    "mitte": 3.5,
    "karte": [
        "...a...",
        "...A...",
        "...A...",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        "..aAs..",
        ".aaAss.",
        ".aBBBs.",
        ".BbBbB.",
        "KKkKkKK",
        ".kKKKk.",
        "...L...",
        "...l...",
        "...L...",
        "...l...",
        "...L...",
        "..GgG..",
        "...g...",
    ],
    "farben": {
        "a": (110, 104, 128), "A": (74, 68, 88), "s": (42, 38, 52),
        "B": (154, 176, 200), "b": (90, 112, 144),
        "K": (236, 228, 208), "k": (188, 174, 144),
        "L": (110, 74, 44), "l": (78, 50, 32),
        "G": (240, 200, 80), "g": (176, 138, 42),
    },
    "tiefe": {"a": 1.0, "A": 2.0, "s": 1.0, "B": 3.0, "b": 3.0, "K": 4.0, "k": 3.0,
              "L": 2.5, "l": 2.5, "G": 3.0, "g": 2.5},
    "griff": "Ll",
}


# Das grosse Schwertfischschwert (Fassung 4.48). Fynn: "Die grosse ist dann
# ein richtiges Schwert. Das [kleine] ist mehr so ein Vibe von einem Dolch."
# Die Klinge ist ein ganzes Schwert des Fischs, lang und schmal, mit
# hellerer Kante. Am Ansatz steht die Rueckenflosse wie ein Segel - der
# Faecher, an dem man den Schwertfisch erkennt -, darunter die Parier-
# stange aus Knochen, ein langer Ledergriff, und als Knauf die sichel-
# foermige Schwanzflosse.
_KLINGE = ["...aAs..."] * 18
SCHWERTFISCHSCHWERT = {
    "mitte": 4.5,
    "karte": [
        "....a....",
        "....A....",
        "...aA....",
        "...aAs...",
    ] + _KLINGE + [
        ".F.aAs...",
        ".FFaAs...",
        ".FfaAs...",
        "FFfaAss..",
        "FfFaBBs..",
        "FFfBbBBs.",
        ".KKKKKKK.",
        "..kKKKk..",
        "....L....",
        "....l....",
        "....L....",
        "....l....",
        "....L....",
        "....l....",
        "...GgG...",
        "..FfgfF..",
        ".F.....F.",
    ],
    "farben": {
        "a": (110, 104, 128), "A": (74, 68, 88), "s": (42, 38, 52),
        "B": (154, 176, 200), "b": (90, 112, 144),
        "F": (46, 70, 120), "f": (84, 114, 164),
        "K": (236, 228, 208), "k": (188, 174, 144),
        "L": (110, 74, 44), "l": (78, 50, 32),
        "G": (240, 200, 80), "g": (176, 138, 42),
    },
    "tiefe": {"a": 1.0, "A": 2.0, "s": 1.0, "B": 3.0, "b": 3.0, "F": 1.0, "f": 1.0, "K": 4.0, "k": 3.0,
              "L": 2.5, "l": 2.5, "G": 3.0, "g": 2.5},
    "griff": "Ll",
}
