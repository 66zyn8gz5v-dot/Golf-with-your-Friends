"""Der Bogen - vier Bilder: in Ruhe und drei Stufen des Spannens.

Die Form ist die von Minecraft, Pixel fuer Pixel. Das hat einen Grund:
Das Spiel baut den Bogen in der Hand aus dem Bild selbst (ein
"texture_mesh" - jeder gemalte Pixel wird ein Kloetzchen) und dreht ihn
dafuer um feste Winkel. Eine andere Form saesse schief in der Hand, und
die vier Stufen muessen beim Spannen genau aufeinanderpassen, sonst
springt der Bogen.

Neu ist alles andere: Eibenholz statt Birke, ein Griff aus gruenem Leder
- die Farbe des Bogenschuetzen -, Hornspitzen an beiden Enden, eine
helle Sehne und eine Stahlspitze am Pfeil.

Buchstaben: D L M K Holz aussen/hell/mittel/innen, G g Griff, s Sehne,
p q k Pfeilschaft hell/mittel/dunkel, 1 2 3 Pfeilspitze hell nach
dunkel. Die Hornspitzen setzt das Werkzeug selbst an die beiden Enden.
"""

FARBEN = {
    "D": (86, 44, 26), "L": (172, 102, 54), "M": (132, 72, 38), "K": (50, 24, 14),
    "G": (100, 160, 72), "g": (58, 106, 44),
    "s": (226, 220, 204),
    "p": (200, 168, 114), "q": (144, 110, 68), "k": (98, 72, 42),
    "1": (242, 246, 252), "2": (192, 200, 212), "3": (140, 150, 166),
    "T": (236, 224, 194), "t": (190, 174, 142),     # Horn an den Enden
}

BILDER = {
    "bow_standby": [
        "................",
        "...........DDDD.",
        "........DDDLMMLK",
        "......DDLMLKKKK.",
        ".....DgMKKK..s..",
        "....DgGg....s...",
        "...DgGg....s....",
        "...DMg....s.....",
        "..DLK....s......",
        "..DMK...s.......",
        "..DLK..s........",
        ".DLK..s.........",
        ".DMK.s..........",
        ".DMKs...........",
        ".DLK............",
        "..K.............",
    ],
    "bow_pulling_0": [
        ".1..............",
        ".32........DDDD.",
        "..kL....DDDLMMLK",
        "...kp.DDLMLKKKK.",
        "....qpgMKKK...s.",
        "....qqpg.....s..",
        "...DgGqp.....s..",
        "...DMg.qp...s...",
        "..DLK...qp.s....",
        "..DMK....qps....",
        "..DLK.....s.....",
        ".DLK....ss......",
        ".DMK...s........",
        ".DMK.ss.........",
        ".DLKs...........",
        "..K.............",
    ],
    "bow_pulling_1": [
        "................",
        "..1.........DDD.",
        "..32....DDDDLMLK",
        "...kp.DDLMLLKKK.",
        "....qpgMKKKK..s.",
        "....qqpg......s.",
        "...DgGqp.....s..",
        "...DMg.qp....s..",
        "..DLK...qp..s...",
        "..DMK....qp.s...",
        "..DLK.....qp....",
        "..DLK.....s.....",
        ".DLK....ss......",
        ".DMK..ss........",
        ".DLKss..........",
        "..K.............",
    ],
    "bow_pulling_2": [
        "................",
        "................",
        "...1....DDDDDDD.",
        "...32.DDLMLLLMLK",
        "....qpgMKKKKKKK.",
        "....qqpg......s.",
        "...DgGqp......s.",
        "...DMg.qp....s..",
        "..DLK...qp...s..",
        "..DMK....qp..s..",
        "..DLK.....qp.s..",
        "..DLK......qp...",
        "..DLK......s....",
        "..DMK..ssss.....",
        "..DLKss.........",
        "...K............",
    ],
}
