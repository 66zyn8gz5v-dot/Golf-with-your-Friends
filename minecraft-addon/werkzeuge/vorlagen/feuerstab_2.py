"""Feuerstab 2 - aus der Pixelschmiede, 16 mal 16, schraeg gezeichnet.

Oben eine Flamme in vier Stufen, darunter ein goldener Kopf, ein
Holzstiel und unten eine goldene Spitze; rundherum ein dunkler Umriss.

Die Pixelschmiede schreibt ihn mit armenischen Buchstaben, weil dort die
lateinischen vergeben sind. Hier stehen lateinische, der Lesbarkeit
wegen; die Farben sind dieselben, in derselben Reihenfolge.
"""

FARBEN = {
    'a': (216, 54, 28, 255),  # Flamme rot
    'b': (255, 138, 28, 255),  # Flamme orange
    'c': (255, 210, 58, 255),  # Flamme gelb
    'd': (30, 20, 20, 255),  # Umriss
    'e': (255, 246, 208, 255),  # Flamme weiss
    'f': (242, 201, 76, 255),  # Gold hell
    'g': (184, 138, 42, 255),  # Gold
    'h': (122, 90, 28, 255),  # Gold dunkel
    'i': (140, 92, 54, 255),  # Holz hell
    'j': (110, 70, 41, 255),  # Holz
    'k': (74, 46, 28, 255),  # Holz dunkel
    'l': (77, 48, 42, 255),  # Holz Schatten
    'm': (46, 29, 25, 255),  # Holz tief
    '.': (0, 0, 0, 0),
}

KARTE = [
    '............a...',
    '...........ab..b',
    '........a.abca..',
    '..........bccb..',
    '........dabcecad',
    '.......dfbceecbg',
    '.......dfbcecbgd',
    '.......dfffgghhd',
    '.......difgdddd.',
    '......djkdd.....',
    '.....dlmd.......',
    '....dlmd........',
    '...dlmd.........',
    'd.djkd..........',
    'gdikd...........',
    'fgkd............',
]
