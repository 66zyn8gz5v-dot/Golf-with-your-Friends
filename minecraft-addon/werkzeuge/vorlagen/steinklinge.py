"""Fynns Steinschwert, abgetastet aus seiner Zeichnung.

Das Bild kam sechzehnfach vergroessert und als JPEG an. Jede Zelle ist
deshalb der Median ihrer Innenflaeche, und Toene, die sich nur durch das
Rauschen der Kompression unterscheiden, sind zu einem zusammengefasst.
Der blaugraue Hintergrund faellt weg.

Die Klinge ist Stein und ist zweimal ausgebrochen: links in Zeile 20
und 21, rechts in Zeile 32 und 33. Der dunkle Fleck in Zeile 24 und 25
ist ein Einschluss im Stein. Um die Mitte der Parierstange liegt ein
Knoten aus Messing, und der Griff ist mit zwei Lederbaendern gewickelt.
"""

FARBEN = {
    'a': (202, 201, 197, 255),
    'b': (159, 158, 154, 255),
    'c': (193, 192, 190, 255),
    'd': (163, 164, 159, 255),
    'e': (141, 141, 138, 255),
    'f': (179, 180, 175, 255),
    'g': (173, 173, 171, 255),
    'h': (119, 120, 115, 255),
    'i': (89, 90, 85, 255),
    'j': (152, 152, 143, 255),
    'k': (97, 98, 93, 255),
    'l': (212, 193, 145, 255),
    'm': (180, 159, 114, 255),
    'n': (136, 119, 86, 255),
    'o': (133, 134, 128, 255),
    'p': (107, 107, 103, 255),
    'q': (127, 128, 123, 255),
    'r': (61, 42, 35, 255),
    's': (102, 74, 49, 255),
    't': (146, 109, 69, 255),
    'u': (41, 29, 22, 255),
    '.': (0, 0, 0, 0),
}

MITTE = 10.0

KARTE = [
    ".........ab.........",
    ".........ab.........",
    "........ccde........",
    "........cfde........",
    ".......ccddeg.......",
    ".......ccdeeg.......",
    "......ccddeecc......",
    "......ccddeecc......",
    "......ccddeecc......",
    "......ccddeecc......",
    "......ccddeecc......",
    "......ccddeecc......",
    "......ccddeecc......",
    "......ccddeecc......",
    "......ccddeecc......",
    "......ccddeecc......",
    "......ggeehhgg......",
    "......ggeehhgg......",
    "......ggeehhgg......",
    "......ggeehhgg......",
    "........gehhgg......",
    ".......geehhgg......",
    "......ggeehhgg......",
    "......ggeehhgg......",
    "......ggeeiigg......",
    "......ggeeiigg......",
    "......ggeehhgg......",
    "......ggeehhgg......",
    "......ggeehhgg......",
    "......ggeehhgg......",
    "......jjhhkkjj......",
    "......jjhhkkjj......",
    "......jjhhkj........",
    "......jjhhkkj.......",
    "......jjhhkkjj......",
    "......jjhhkkjj......",
    "......jjhhkkjj......",
    "......jjhhkkjj......",
    "......jjhhkkjj......",
    "......jjhhkkjj......",
    "..fffffflmnlbbbbbb..",
    "jjjjjjjjmnlmooooooop",
    "..qqqqqqnlmnpppppp..",
    ".......ikkkki.......",
    "........rrss........",
    "........trus........",
    "........ttuu........",
    "........rtsu........",
    "........rrss........",
    "........trus........",
    "........ttuu........",
    "........rtsu........",
    "........rrss........",
    "........trus........",
    "........ttuu........",
    "........rtsu........",
    "........llmm........",
    ".......fffeee.......",
    ".......dddhhh.......",
    "........eekk........",
    ".........pi.........",
]
