"""Die Dolche des Assassinen - eine Form, sechs Werkstoffe.

Fynn wollte fuer den Assassinen zwei Dolche, einen in jeder Hand, und
das "in verschiedenen Versionen". Gezeichnet ist die Form einmal; die
Sorten unterscheiden sich nur in den Farben. So bleibt die Reihe
einheitlich, und eine Aenderung an der Form trifft alle sechs.

Zwei Bilder:

* KARTE ist der Dolch hochkant fuer das 3D-Modell, 9 breit und 25 hoch.
  Die Klinge ist drei Pixel breit - Lichtkante, Kern, Schatten -, die
  Parierstange sieben, der Griff einen. Zuerst waren es 19 Zeilen; Fynn
  wollte sie "insgesamt ein bisschen laenger". Die Klinge hat dafuer
  fuenf Zeilen mehr und eine schlankere Spitze, der Griff eine.
* SYMBOL ist das Inventarbild: zwei gekreuzte Dolche auf 16 mal 16. Fynns
  Regel fuer neue Waffen - hoechstens 20 mal 20 - gilt auch hier. Zwei
  parallele Dolche flossen bei dieser Groesse zu einem Brett zusammen,
  gekreuzt liest man sofort "zwei Klingen".

Buchstaben: L M S Klinge hell/Kern/Schatten, G g Parierstange, W w Griff
(Wicklung abwechselnd), P p Knauf, K Umriss (nur im Symbol - am Modell
macht die Geometrie ihre Kanten selbst).
"""

MITTE = 4.5

KARTE = [
    "....L....",
    "...LM....",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LMS...",
    "...LSS...",
    ".GGGGGGg.",
    "..gGGGg..",
    "....W....",
    "....w....",
    "....W....",
    "....w....",
    "....W....",
    "...PPp...",
    "....p....",
]

SYMBOL = [
    "................",
    "................",
    "...K........K...",
    "..KLK......KLK..",
    "...KLK....KLK...",
    "...KSLK..KLSK...",
    "....KSLKKLSK....",
    ".....KSLLSK.....",
    "......KLSK......",
    "...K.KLSSLK.K...",
    "..KGKLSKKSLKGK..",
    "...KGSK..KSGK...",
    "..KwKgK..KgKwK..",
    ".KWK.K....K.KWK.",
    "KPK..........KPK",
    ".K............K.",
]

# Der linke Dolch fuer sich: das Inventarbild des Gegenstands, der in der
# Zweithand steckt, solange man das Paar fuehrt. Einer der beiden Dolche
# aus SYMBOL, allein.
EINZEL = [
    "................",
    "............KK..",
    "...........KLLK.",
    "..........KLSK..",
    ".........KLSK...",
    "........KLSK....",
    ".......KLSK.....",
    "......KLSK......",
    "..K..KLSK.......",
    "..KGKLSK........",
    "...KGSK.........",
    "..KwKgK.........",
    ".KWK.K..........",
    "KPK.............",
    ".K..............",
    "................",
]

# Je Sorte: Name, Barren fuer Rezept und Reparatur, Schaden, Haltbarkeit
# und die Farben. Der Schaden liegt einen unter dem Schwert derselben
# Stufe - die Staerke der Dolche ist der Schattensprung, nicht der Hieb.
SORTEN = {
    "eisendolche": {
        "name": ("Eisendolche", "Iron Daggers"),
        "barren": "minecraft:iron_ingot", "schaden": 5, "haltbarkeit": 250,
        "farben": {
            "L": (232, 234, 238), "M": (198, 202, 208), "S": (150, 155, 163),
            "G": (170, 174, 180), "g": (118, 122, 130),
            "W": (122, 84, 58), "w": (86, 58, 40),
            "P": (190, 194, 200), "p": (130, 134, 142), "K": (40, 40, 46),
        },
    },
    "silberdolche": {
        "name": ("Silberdolche", "Silver Daggers"),
        "barren": "fynn:silberbarren", "schaden": 5, "haltbarkeit": 200,
        "farben": {
            # Die Toene des Silberbarrens, dazu eine blaue Wicklung.
            "L": (250, 252, 255), "M": (214, 222, 236), "S": (168, 178, 196),
            "G": (206, 218, 236), "g": (152, 168, 194),
            "W": (62, 84, 176), "w": (40, 54, 124),
            "P": (228, 233, 240), "p": (152, 168, 194), "K": (44, 48, 62),
        },
    },
    "stahldolche": {
        "name": ("Stahldolche", "Steel Daggers"),
        "barren": "fynn:stahlbarren", "schaden": 6, "haltbarkeit": 320,
        "farben": {
            # Kalter, blaeulicher Stahl wie die Reifen am Tiegel, schwarzes
            # Leder am Griff.
            "L": (221, 228, 238), "M": (178, 188, 204), "S": (128, 138, 158),
            "G": (104, 113, 130), "g": (72, 78, 92),
            "W": (72, 62, 62), "w": (46, 38, 38),
            "P": (150, 159, 174), "p": (104, 113, 130), "K": (30, 32, 40),
        },
    },
    "elektrumdolche": {
        "name": ("Elektrumdolche", "Electrum Daggers"),
        "barren": "fynn:elektrumbarren", "schaden": 6, "haltbarkeit": 280,
        "farben": {
            "L": (255, 246, 190), "M": (228, 206, 120), "S": (184, 156, 74),
            "G": (214, 176, 70), "g": (160, 120, 40),
            "W": (132, 40, 40), "w": (90, 26, 28),
            "P": (238, 214, 120), "p": (160, 120, 40), "K": (58, 40, 16),
        },
    },
    "diamantdolche": {
        "name": ("Diamantdolche", "Diamond Daggers"),
        "barren": "minecraft:diamond", "schaden": 6, "haltbarkeit": 1561,
        "farben": {
            "L": (214, 255, 250), "M": (92, 219, 213), "S": (38, 160, 160),
            "G": (234, 184, 40), "g": (186, 130, 22),
            "W": (82, 60, 40), "w": (56, 40, 26),
            "P": (234, 184, 40), "p": (186, 130, 22), "K": (16, 52, 52),
        },
    },
    "netheritdolche": {
        "name": ("Netheritdolche", "Netherite Daggers"),
        "barren": "minecraft:netherite_ingot", "schaden": 7, "haltbarkeit": 2031,
        "farben": {
            "L": (150, 140, 146), "M": (98, 88, 94), "S": (62, 54, 58),
            "G": (90, 80, 84), "g": (58, 50, 54),
            "W": (112, 50, 40), "w": (74, 32, 28),
            "P": (120, 110, 116), "p": (74, 66, 70), "K": (20, 16, 18),
        },
    },
}
