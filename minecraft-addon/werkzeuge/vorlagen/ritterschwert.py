"""Das Ritterschwert - Fynns Entwurf, aus der Vorschau abgetastet.

Fynn wollte "ein richtig cleanes Eisenschwert, so ein Ritterschwert,
duenne Klinge" und hat den Entwurf als Bildschirmfoto aus einem anderen
Gespraech geschickt: 16 mal 40 Pixel, im Foto auf 20 Bildschirmpunkte je
Pixel vergroessert.

Zwei Sachen waren beim Abtasten zu beachten.

Der kalte Klingenschatten liegt bei (108, 122, 146) und damit nur
vierzehn Stufen neben dem Grund der Vorschau, (116, 136, 150). Beim
ersten Abtasten hat die Trennung Grund/Schwert ihn verschluckt - mitten
in der Klinge klafften fuenf durchsichtige Pixel. Die Zeilen darunter
zeigen, was dort steht.

Und das Foto war geglaettet: Aus vier Klingentoenen waren fuenfzehn
geworden, die Spalten flackerten zwischen benachbarten Graustufen. Je
Spalte und Abschnitt steht jetzt der haeufigste Ton. Im Kleinen sah das
Flackern nach Handschrift aus, im Spiel nach Dreck auf dem Stahl.

Die Klinge ist vier Pixel breit und traegt ihren Verlauf nicht in der
Laenge, sondern quer: Lichtgrat links, heller Kern, kalter Schatten,
Schattenkante rechts. Nach unten hin kippt der Kern in drei Stufen ins
Kalte. Dadurch wirkt sie schlank, obwohl sie einen Pixel breiter ist als
die der Stahlklinge.
"""

FARBEN = {
    'b': (227, 230, 234, 255),  # Lichtgrat der Klinge
    'c': (203, 208, 214, 255),  # Stahl hell
    'd': (179, 184, 192, 255),  # Stahl mittel
    'e': (154, 160, 169, 255),  # Stahl gedaempft
    'f': (131, 136, 146, 255),  # Stahl Schattenkante
    'g': (107, 112, 122, 255),  # Stahl Schatten
    'h': (85, 90, 99, 255),  # Stahl tiefster Schatten
    'i': (108, 122, 146, 255),  # kalter Klingenschatten
    'k': (111, 77, 73, 255),  # Wicklung hell
    'm': (87, 56, 58, 255),  # Wicklung mittel
    'n': (62, 39, 41, 255),  # Wicklung dunkel
    'o': (44, 29, 30, 255),  # Wicklung tiefster Ton
    'p': (184, 58, 68, 255),  # Stein Licht
    'q': (138, 35, 46, 255),  # Stein
    'r': (94, 23, 32, 255),  # Stein Schatten
    '.': (0, 0, 0, 0),
}

# Die Klinge steht in den Spalten 6 bis 9, die Parierstange reicht von
# Spalte 1 bis 14 - beide haben ihre Mitte bei 8.0.
MITTE = 8.0

KARTE = [
    "................",
    # Spitze
    ".......bd.......",
    "......cbcf......",
    "......cbcf......",
    "......cbcf......",
    "......cbcf......",
    # Klinge oben - Kern noch hell
    "......dbdg......",
    "......dbdg......",
    "......dbdg......",
    "......dbdg......",
    "......dbdg......",
    "......dbdg......",
    # Klingenmitte - der Kern kippt ins Kalte
    "......dbig......",
    "......dbig......",
    "......dbig......",
    "......dbig......",
    "......dbig......",
    "......dbig......",
    "......dbig......",
    "......dbig......",
    "......dbig......",
    "......dbig......",
    # Klinge unten - zur Parierstange hin dunkel
    "......dbgg......",
    "......dbgg......",
    "......dbgg......",
    "......dbgg......",
    "......dbgg......",
    # Parierstange, der rote Stein in der Mitte
    ".c....eceh....g.",
    ".bbbcccpqcdeeef.",
    ".cdeeeeqrffgggh.",
    # Wicklung, zwei Baender im Wechsel
    ".......kn.......",
    ".......mo.......",
    ".......kn.......",
    ".......mo.......",
    ".......kn.......",
    ".......mo.......",
    ".......kn.......",
    # Knauf mit dem zweiten Stein
    "......cdef......",
    "......epqg......",
    ".......fh.......",
]
