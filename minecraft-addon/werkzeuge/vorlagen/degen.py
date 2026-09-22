"""Fynns Degen, abgetastet aus seiner Zeichnung vom 22. September.

Eine Stichwaffe: lange duenne Klinge, davor ein Buegelkorb aus Messing,
der die Hand von einer Seite umfasst. Anders als beim Stahlschwert ist er
absichtlich nicht spiegelgleich - ein Korb ist eine halbe Schale.

Der schwarze Umriss aus der Zeichnung ist hier heraus. Im flachen Bild
traegt er die Form, im Koerper ist er nur eine schwarze Haut um jedes
Teil - und die Luecken zwischen Korb und Griff waren dort ohnehin Umriss
statt Luft. Mit ihm faellt auch die letzte Reihe weg: Sie bestand nur
daraus.
"""

FARBEN = {
    # Klinge, von der Spitze zum Griff immer dunkler
    "z": (236, 246, 243, 255),   # Glanz
    "y": (190, 220, 213, 255),   # hell
    "x": (140, 183, 184, 255),   # mittel
    "v": (99, 135, 136, 255),    # dunkel
    "r": (35, 62, 65, 255),      # Schatten
    # Korb und Parierstange
    "G": (246, 200, 130, 255),   # Messing hell
    "g": (228, 170, 98, 255),    # Messing
    "e": (177, 118, 67, 255),    # Messing dunkel
    # Griff
    "K": (27, 25, 13, 255),      # Leder tief
    "j": (52, 46, 24, 255),      # Leder dunkel
    "J": (67, 56, 28, 255),      # Leder
    ".": (0, 0, 0, 0),
}

KARTE = [
    "........z.........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........zy........",
    "........yx........",
    "........yx........",
    "........yx........",
    "........yx........",
    "........yx........",
    "........yx........",
    "........yx........",
    "........xv........",
    "........xv........",
    "........xv........",
    "........xv........",
    "........xv........",
    "........xv........",
    "........xv........",
    "........vr........",
    "........vr........",
    "........vr........",
    "........vr........",
    "........vr........",
    "........vr...ge...",
    "....GGGGrrGGggg...",
    "....gggggggggee...",
    "....ge..KK........",
    "....ge..KK........",
    "....gg..KK........",
    "....gg..KK........",
    "....gg..Kj........",
    "....gg..Kj........",
    "....gg..Kj........",
    "....gg..Kj........",
    "....gg..jJ........",
    "....gg..jJ........",
    "....gg..jJ........",
    "....gg..jJ...ge...",
    "....GGGGGGGgggg...",
    "....gggggggggee..."
]
# Die Klinge liegt auf den Spalten 8 und 9, ihre Mitte also auf 9.
MITTE = 9.0
