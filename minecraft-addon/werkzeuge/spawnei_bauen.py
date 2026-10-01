#!/usr/bin/env python3
"""Malt das Spawn-Ei des Ritters.

Ein Spawn-Ei laesst sich in Bedrock auf zwei Arten angeben: mit zwei
Farben, aus denen das Spiel das bekannte gesprenkelte Ei baut, oder mit
einem eigenen Bild. Zwei Farben sind schnell, sehen aber aus wie jedes
andere Ei auch - man erkennt sie nur an der Sprenkelfarbe.

Hier steht ein eigenes Bild: ein Ei mit dem Gesicht des Ritterhelms.
Sehspalt und Lueftungsloecher sitzen an denselben Stellen wie am echten
Helm, damit man im Inventar sofort sieht, was herauskommt.

Die erste Fassung war ein glatter Verlauf aus drei Graustufen. Daneben
gelegt fiel auf, woran das lag: die Vanilla-Eier haben 18 bis 21 Farben,
und bei 64 bis 72 Prozent der Nachbarpaare ist der Ton verschieden - sie
sind gefleckt, nicht schattiert. Darum hier zwei Farbtreppen zu je fuenf
Stufen und eine Streuung, die jedem Pixel bis zu zwei Stufen zulegt oder
abzieht.

    python3 werkzeuge/spawnei_bauen.py
"""

from pathlib import Path
from PIL import Image

WURZEL = Path(__file__).resolve().parent.parent

# Die Eiform der neueren Vanilla-Eier - runder und voller als die alte.
FORM = [
    "................", "......####......", ".....######.....", "....########....",
    "...##########...", "...##########...", "..############..", "..############..",
    "..############..", "..############..", "..############..", "..############..",
    "...##########...", "....########....", ".....######.....", "................",
]

# Zwei Treppen von hell nach dunkel: der Helmstahl und der blaue
# Wappenrock. Fuenf Stufen, damit die Streuung Luft nach oben und unten
# hat, ohne dass gleich alles am Anschlag klebt.
STAHL = [(230, 231, 234), (199, 201, 205), (162, 164, 169), (124, 126, 132), (85, 87, 92)]
BLAU  = [(95, 120, 196), (68, 80, 172), (51, 55, 143), (39, 42, 114), (28, 29, 85)]

KANTE = (60, 61, 66, 255)   # Umriss, dunkler als die dunkelste Stufe
BAND  = (46, 47, 51, 255)   # Stirnband und Lueftungsloecher
LOCH  = (12, 12, 16, 255)   # Sehspalt - dahinter ist nichts

WAPPEN_AB = 11              # ab dieser Zeile traegt das Ei Blau


def drin(x, y):
    return 0 <= x < 16 and 0 <= y < 16 and FORM[y][x] == "#"


def streu(x, y):
    """Eine Zahl 0..255, die von Ort zu Ort springt.

    Eine lineare Summe aus x und y ergibt Diagonalstreifen - genau das,
    was hier weg soll. Darum werden die Bits verwuerfelt: erst mit zwei
    grossen Primzahlen auseinandergezogen, dann geschoben, multipliziert
    und noch einmal geschoben.
    """
    h = (x * 73856093) ^ (y * 19349663)
    h = (h ^ (h >> 13)) * 1274126177
    return (h ^ (h >> 16)) & 0xFF


def ton(x, y, wappen_ab):
    treppe = BLAU if y >= wappen_ab else STAHL
    # Licht von oben links, aber nur grob: die Streuung traegt das Bild.
    grund = 0 if x + y < 12 else (1 if x + y < 16 else (2 if x + y < 20 else 3))
    stufe = grund + (streu(x, y) % 5) - 2
    return treppe[max(0, min(len(treppe) - 1, stufe))] + (255,)


def ei(wappen_ab=WAPPEN_AB):
    bild = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y in range(16):
        for x in range(16):
            if not drin(x, y):
                continue
            if not (drin(x - 1, y) and drin(x + 1, y)
                    and drin(x, y - 1) and drin(x, y + 1)):
                bild.putpixel((x, y), KANTE)
            else:
                bild.putpixel((x, y), ton(x, y, wappen_ab))

    for x in range(4, 12):                            # Stirnband
        bild.putpixel((x, 6), BAND)
    for x in list(range(4, 7)) + list(range(9, 12)):  # Sehspalt, zweigeteilt
        bild.putpixel((x, 8), LOCH)
    return bild


def main():
    ziel = WURZEL / "ressourcenpaket" / "textures" / "items" / "ritter_ei.png"
    ei().save(ziel)
    print(f"gemalt: {ziel.name}")


if __name__ == "__main__":
    main()
