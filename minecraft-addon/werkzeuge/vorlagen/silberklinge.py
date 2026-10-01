"""Fynns Silberklinge, abgetastet aus seiner Zeichnung.

Das Bild kam achtfach vergroessert an; zurueckgerechnet liegt es Pixel
fuer Pixel so vor, wie er es gemalt hat - die Vergroesserung ging genau
auf, es war also nichts zu raten.

Neu gegenueber den fuenf anderen Klingen ist der Stein im Knauf: zwei
Blautoene, die sonst nirgends im Paket vorkommen.
"""

FARBEN = {
    'z': (246, 249, 255, 255),   # Glanz auf der Schneide
    'y': (206, 218, 236, 255),   # helles Silber
    'x': (152, 168, 194, 255),   # Schatten
    'v': (98, 112, 140, 255),   # tiefer Schatten
    'r': (64, 78, 112, 255),   # Kante im Dunkeln
    'n': (52, 62, 94, 255),   # Wicklung hell
    'k': (38, 46, 72, 255),   # Wicklung dunkel
    'e': (150, 220, 246, 255),   # Stein, Lichtpunkt
    'b': (96, 170, 214, 255),   # Stein
}

# Die Klinge steht senkrecht in der Mitte der zwanzig Spalten.
MITTE = 10.0

KARTE = [
    ".........yx.........",
    "........yyxx........",
    "........yyxx........",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......zyyxxv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yyxxvv.......",
    ".......yxxvvr.......",
    ".......yxxvvr.......",
    ".......yxxvvr.......",
    ".......yxxvvr.......",
    ".......yxxvvr.......",
    ".......yxxvvr.......",
    ".......yxxvvr.......",
    ".......yxxvvr.......",
    "..yy...yxxvvr...xx..",
    "yzzzzzzzzzyyyyyyyyyy",
    "xyyyyyyyyyxxxxxxxxxx",
    ".xxxxxxxxxvvvvvvvvv.",
    "........vvvv........",
    "........nknk........",
    "........nnkk........",
    "........zxyv........",
    "........yzvx........",
    "........nknk........",
    "........nnkk........",
    "........zxyv........",
    "........yzvx........",
    "........nknk........",
    "........nnkk........",
    "........zxyv........",
    "........yzvx........",
    "........zyxv........",
    ".......zzebvv.......",
    "........zyxv........",
]
