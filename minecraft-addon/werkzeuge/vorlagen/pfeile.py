"""Die Erzpfeile - eine Form, vier Metalle.

Die Form ist die des Minecraft-Pfeils, damit man sie im Inventar sofort
als Pfeile erkennt. Die Sorten unterscheiden sich an der Spitze (das
Metall) und an der Befiederung (eine Farbe je Sorte, damit man sie auch
im Getuemmel auseinanderhaelt).

Buchstaben: W Glanz, B hell, A Grund, K Kante der Spitze; s S Schaft
hell/dunkel; F f x Federn hell/mittel/dunkel.

Wirkung beim Treffer (steht im Skript pfeile.js):
    Eisen     trifft haerter - halb so viel Schaden noch einmal obendrauf
    Silber    gegen Untote dreifach: Zombie, Skelett, Phantom und Co.
    Gold      der Getroffene schwebt zwei Sekunden hilflos nach oben
    Elektrum  ein Schlag wie ein Funke: kurz gelaehmt
"""

KARTE = [
    "................",
    "................",
    "............AWK.",
    "..........ABBAK.",
    "..........KsBK..",
    "..........sSAK..",
    ".........sS.K...",
    "........sS......",
    ".......sS.......",
    "......sS........",
    ".....sS.........",
    "...FfS..........",
    "..FfFx..........",
    "..xFx...........",
    "...x............",
    "................",
]

SCHAFT = {"s": (160, 120, 70), "S": (70, 48, 24)}

SORTEN = {
    "eisenpfeil": {
        "name": ("Eisenpfeil", "Iron Arrow"),
        "barren": "minecraft:iron_ingot",
        "farben": {"A": (170, 174, 182), "W": (250, 250, 252), "B": (214, 218, 224), "K": (80, 84, 92),
                   "F": (240, 240, 240), "f": (200, 200, 204), "x": (120, 120, 126)},
    },
    "silberpfeil": {
        "name": ("Silberpfeil", "Silver Arrow"),
        "barren": "fynn:silberbarren",
        "farben": {"A": (206, 218, 236), "W": (255, 255, 255), "B": (232, 238, 248), "K": (110, 124, 150),
                   "F": (110, 150, 230), "f": (70, 105, 190), "x": (40, 60, 120)},
    },
    "goldpfeil": {
        "name": ("Goldpfeil", "Gold Arrow"),
        "barren": "minecraft:gold_ingot",
        "farben": {"A": (234, 184, 40), "W": (255, 248, 200), "B": (252, 220, 100), "K": (150, 100, 20),
                   "F": (230, 80, 70), "f": (180, 45, 45), "x": (110, 25, 30)},
    },
    "elektrumpfeil": {
        "name": ("Elektrumpfeil", "Electrum Arrow"),
        "barren": "fynn:elektrumbarren",
        "farben": {"A": (228, 206, 120), "W": (255, 252, 220), "B": (246, 232, 170), "K": (150, 120, 50),
                   "F": (180, 120, 230), "f": (130, 80, 190), "x": (80, 45, 120)},
    },
}

# Wie viele Pfeile ein Rezept ergibt. Minecraft gibt fuer einen Feuerstein
# vier; ein Barren ist nicht seltener als Feuerstein, also ebenso viele.
JE_REZEPT = 4
