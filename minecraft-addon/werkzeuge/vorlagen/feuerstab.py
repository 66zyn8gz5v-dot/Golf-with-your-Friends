"""Der Feuerstab - gepixelt von Fynns kleinem Cousin.

Ein Sondergegenstand: unten links der dunkle Stiel, oben rechts eine
Feuerkugel mit Goldring, orangem Rand und rotem Kern, rundherum Funken
und ein paar Rauchpunkte. Aus der Pixelschmiede uebernommen, Zeichen fuer
Zeichen; gezeichnet ist er schraeg, so wie Minecraft Gegenstaende im
Inventar zeigt.
"""

FARBEN = {
    "'": (206, 97, 41, 255),  # Funke
    ')': (214, 126, 55, 255),  # Flamme hell
    '*': (186, 32, 56, 255),  # Glut
    '/': (138, 20, 40, 255),  # Glut tief
    '4': (40, 30, 11, 255),  # Stiel
    'g': (206, 158, 66, 255),  # Goldring
    'k': (44, 46, 58, 255),  # Rauch
    '.': (0, 0, 0, 0),
}

KARTE = [
    '..................k.....',
    '........................',
    '.................k......',
    "............'..'.'......",
    "..........'......k......",
    "...........gggggg..'....",
    "........'.g))))))g......",
    ".........g))****))g.'...",
    "......'.g))******)g.....",
    '.......g))*******)g.....',
    "....'.g))********)g.'...",
    '......g)*********)gkk...',
    "...'.g))**//****))gk'...",
    '.....g)**44/***))g.k....',
    ".....g))444****)g..'....",
    "....'.g444***))g..k.....",
    "......444)**))g..'......",
    ".....444g)))gg.'......k.",
    '....444..ggg......k...k.',
    "...444..'....'........k.",
    "..444......'.......k..k.",
    '4444..................k.',
    '444................k....',
    '444...................k.',
]
