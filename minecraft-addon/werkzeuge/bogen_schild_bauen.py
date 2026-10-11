#!/usr/bin/env python3
"""Malt Bogen und Schild neu - fuer alle, nicht nur fuer eine Rolle.

Wie bei den Schwertern ersetzt das Paket hier Minecrafts eigene Bilder.
Wer das Paket an hat, sieht jeden Bogen und jeden Schild so, auch die,
die er schon im Inventar hatte.

Bogen: vier Bilder zu 16 mal 16, Form wie in Minecraft (warum, steht in
vorlagen/bogen.py).

Schild: eine Haut von 64 mal 64 im Zuschnitt von Minecrafts Schildmodell.
Das Modell ist ein Brett von 12 mal 22 mal 1 und ein Griff von 2 mal 6
mal 6; die Felder dafuer liegen, wo Minecraft sie sucht (siehe FELDER).
Vorn ein blauer Grund mit goldenem Kreuz und einem Buckel aus Messing,
eingefasst von einem Eisenrand mit Nieten - das Wappen des Ritters, der
im Blau seines Wappenrocks kommt. Hinten Holzbretter mit zwei
Lederriemen.

Ein Banner auf dem Schild legt sich wie bisher darueber; dafuer baut
Minecraft ein eigenes Bild, dieses hier bleibt davon unberuehrt.

    python3 werkzeuge/bogen_schild_bauen.py
"""

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from vorlagen import bogen                  # noqa: E402
import ofen_koernung                        # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket" / "textures"


# ---------------------------------------------------------------- Bogen

def hornspitzen(karte):
    """Setzt Horn an die beiden Enden der Wurfarme.

    Die Enden sind die Holzpixel, die am weitesten oben rechts und unten
    links liegen - gemessen an x - y. So findet das Werkzeug sie in jeder
    Spannstufe selbst, auch dort, wo sich die Arme schon gebogen haben.
    """
    zeilen = [list(z) for z in karte]
    holz = [(x, y) for y, z in enumerate(zeilen) for x, c in enumerate(z) if c in "DLMK"]
    for ende in (max, min):
        wert = ende(x - y for x, y in holz)
        spitze = sorted((p for p in holz if p[0] - p[1] == wert), key=lambda p: p[1])
        # Das obere der beiden Pixel hell, das untere im Schatten.
        for (x, y), ton in zip(spitze, "Tt"):
            zeilen[y][x] = ton
    return ["".join(z) for z in zeilen]


def bogenbild(karte):
    bild = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(hornspitzen(karte)):
        for x, z in enumerate(zeile):
            if z != ".":
                bild.putpixel((x, y), bogen.FARBEN[z] + (255,))
    return bild


# ---------------------------------------------------------------- Schild

EISEN = {"hell": (196, 200, 208), "mitte": (150, 155, 163), "dunkel": (104, 109, 118),
         "niet": (232, 236, 242)}
BLAU = [(58, 80, 172), (50, 70, 154), (40, 56, 128)]      # hell, Grund, dunkel
GOLD = {"licht": (248, 218, 116), "mitte": (224, 178, 52), "schatten": (168, 124, 30)}
MESSING = {"licht": (255, 236, 160), "mitte": (214, 168, 60), "schatten": (140, 100, 26)}
HOLZ = [(120, 84, 50), (104, 72, 42), (78, 54, 32)]
LEDER = [(92, 60, 38), (66, 42, 26)]

# Wo Minecraft die Flaechen des Schildmodells sucht (Zuschnitt fuer einen
# Kasten, Breite x Hoehe x Tiefe): Brett 12x22x1 ab (0, 0), Griff 2x6x6
# ab (26, 0).
VORN = (1, 1)           # 12 x 22
HINTEN = (14, 1)        # 12 x 22
KANTEN = [(0, 1, 1, 22), (13, 1, 1, 22), (1, 0, 12, 1), (13, 0, 12, 1)]
GRIFF = (26, 0, 16, 12)


def vorderseite():
    b, h = 12, 22
    feld = Image.new("RGBA", (b, h))
    for y in range(h):
        for x in range(b):
            # Ein ruhiger Grund, nur gekoernt. Mit Brettfugen alle zwei
            # Pixel sah er aus wie Nadelstreifen - bei zwoelf Pixeln
            # Breite ist fuer Bretter kein Platz.
            if x in (0, b - 1) or y in (0, h - 1):
                ton = EISEN["hell"] if x == 0 or y == 0 else EISEN["dunkel"]
            else:
                ton = BLAU[1]
            feld.putpixel((x, y), ton + (255,))
    # Die Bretter bekommen Maserung wie die Steine der Burg.
    feld, _ = ofen_koernung.koernen(feld, salz=53)

    def setze(x, y, ton):
        feld.putpixel((x, y), ton + (255,))

    # Das Kreuz: senkrecht in Spalte 5-6, waagerecht in Zeile 7-8. Licht
    # von oben links, wie ueberall im Paket.
    for y in range(1, h - 1):
        setze(5, y, GOLD["licht"])
        setze(6, y, GOLD["schatten"])
    for x in range(1, b - 1):
        setze(x, 7, GOLD["licht"])
        setze(x, 8, GOLD["schatten"])
    # Der Buckel in der Mitte, rund durch dunkle Ecken.
    buckel = ["sMMs", "MLMs", "MMMs", "ssss"]
    for dy, zeile in enumerate(buckel):
        for dx, z in enumerate(zeile):
            ton = {"L": MESSING["licht"], "M": MESSING["mitte"], "s": MESSING["schatten"]}[z]
            setze(4 + dx, 6 + dy, ton)
    # Nieten im Rand, oben, in der Mitte und unten.
    for y in (2, 11, 19):
        setze(0, y, EISEN["niet"])
        setze(b - 1, y, EISEN["niet"])
    for x in (2, 9):
        setze(x, 0, EISEN["niet"])
        setze(x, h - 1, EISEN["niet"])
    return feld


def rueckseite():
    b, h = 12, 22
    feld = Image.new("RGBA", (b, h))
    for y in range(h):
        for x in range(b):
            if x in (0, b - 1) or y in (0, h - 1):
                ton = EISEN["mitte"]
            elif y in (6, 7, 14, 15):
                ton = LEDER[0] if y in (6, 14) else LEDER[1]
            else:
                ton = HOLZ[2] if x % 3 == 0 else HOLZ[(x // 3) % 2]
            feld.putpixel((x, y), ton + (255,))
    feld, _ = ofen_koernung.koernen(feld, salz=59)
    return feld


def schild():
    haut = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    haut.paste(vorderseite(), VORN)
    haut.paste(rueckseite(), HINTEN)
    for x, y, b, h in KANTEN:
        for dy in range(h):
            for dx in range(b):
                haut.putpixel((x + dx, y + dy), EISEN["mitte"] + (255,))
    gx, gy, gb, gh = GRIFF
    for dy in range(gh):
        for dx in range(gb):
            haut.putpixel((gx + dx, gy + dy), LEDER[(dx + dy) % 2 if dy % 3 else 1] + (255,))
    return haut


def main():
    for name, karte in bogen.BILDER.items():
        bogenbild(karte).save(RES / "items" / f"{name}.png")
        print(f"gemalt: textures/items/{name}.png")
    (RES / "entity").mkdir(exist_ok=True)
    schild().save(RES / "entity" / "shield.png")
    print("gemalt: textures/entity/shield.png")


if __name__ == "__main__":
    main()
