#!/usr/bin/env python3
"""Malt das Spawn-Ei des Ritters.

Ein Spawn-Ei laesst sich in Bedrock auf zwei Arten angeben: mit zwei
Farben, aus denen das Spiel das bekannte gesprenkelte Ei baut, oder mit
einem eigenen Bild. Zwei Farben sind schnell, sehen aber aus wie jedes
andere Ei auch - man erkennt sie nur an der Sprenkelfarbe.

Hier steht ein eigenes Bild: ein Ei mit dem Gesicht des Ritterhelms.
Sehspalt und Lueftungsloecher sitzen an denselben Stellen wie am echten
Helm, damit man im Inventar sofort sieht, was herauskommt.

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

# Toene aus der Ritterhaut, damit Ei und Wesen dieselbe Welt treffen.
HELL   = (199, 201, 205, 255)
MITTE  = (162, 164, 169, 255)
DUNKEL = (124, 126, 132, 255)
KANTE  = (85, 87, 92, 255)
BAND   = (46, 47, 51, 255)
LOCH   = (12, 12, 16, 255)


def drin(x, y):
    return 0 <= x < 16 and 0 <= y < 16 and FORM[y][x] == "#"


def ei():
    bild = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y in range(16):
        for x in range(16):
            if not drin(x, y):
                continue
            # Am Rand die dunkle Kante, sonst Licht von oben links: Ohne
            # diesen Verlauf ist das Ei eine flache Scheibe.
            if not (drin(x - 1, y) and drin(x + 1, y)
                    and drin(x, y - 1) and drin(x, y + 1)):
                bild.putpixel((x, y), KANTE)
            elif x + y < 13:
                bild.putpixel((x, y), HELL)
            elif x + y > 18:
                bild.putpixel((x, y), DUNKEL)
            else:
                bild.putpixel((x, y), MITTE)

    for x in range(4, 12):                      # Stirnband
        bild.putpixel((x, 6), BAND)
    for x in list(range(4, 7)) + list(range(9, 12)):   # Sehspalt, zweigeteilt
        bild.putpixel((x, 8), LOCH)
    for x in (5, 10):                           # Lueftungsloecher
        bild.putpixel((x, 11), BAND)
    return bild


def main():
    ziel = WURZEL / "ressourcenpaket" / "textures" / "items" / "ritter_ei.png"
    ei().save(ziel)
    print(f"gemalt: {ziel.name}")


if __name__ == "__main__":
    main()
