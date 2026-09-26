#!/usr/bin/env python3
"""Die Chronik der Bosse: ein Buch, das alle Bosse zeigt.

Drei Bosse gibt es jetzt, und keiner erscheint von selbst - man muss
wissen, dass es sie gibt und womit man sie ruft. Das stand bisher nur in
der Pixelschmiede. Die Chronik bringt es ins Spiel: Wer sie aufschlaegt,
sieht jeden Boss mit seinem Ei, wie man ihn ruft, was er kann, einen Tipp
fuer den Kampf und die Beute - und wie oft man ihn schon besiegt hat.

Hier entstehen Gegenstand, Rezept, Bild und Namen; was im Buch steht und
das Zaehlen der Siege, steht in scripts/chronik.js.

    python3 werkzeuge/chronik_bauen.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boss_kern as bk                                               # noqa: E402
import roland_beute_bauen as rbb                                     # noqa: E402
from neue_waffen_bauen import gegenstand, rezept                     # noqa: E402

VER = bk.VER

# Ein geschlossenes Buch in Leder, mit Goldecken und einer Krone darauf -
# die Krone steht mittig ueber den Spalten 5 bis 10.
BUCH = [
    "................",
    "...kkkkkkkkkk...",
    "..kDRRRRRRRRRk..",
    "..kDgRRRRRRgRk..",
    "..kDRRRRggRRRk..",
    "..kDRgRggRgRRk..",
    "..kDRggggggRRk..",
    "..kDRgbggbgRRk..",
    "..kDRggggggRRk..",
    "..kDRRRRRRRRRk..",
    "..kDRRRRRRRRRk..",
    "..kDgRRRRRRgRk..",
    "..kDRRRRRRRRRk..",
    "..kkPPPPPPPPPk..",
    "...kkkkkkkkkk...",
    "................",
]
FARBEN = {"k": rbb.UMRISS, "R": (122, 34, 48), "D": (84, 22, 32), "g": (230, 188, 74), "b": (80, 140, 230),
          "P": (236, 226, 200)}

def buch_bild():
    """Das Leder gefleckt wie die Eier, nicht glatt: drei Toene nach der
    Streuung, oben links etwas heller."""
    from spawnei_bauen import streu
    bild = rbb.male(BUCH, FARBEN)
    toene = [(142, 44, 58), (122, 34, 48), (104, 28, 40)]
    for y, zeile in enumerate(BUCH):
        for x, z in enumerate(zeile):
            if z == "R":
                stufe = (0 if x + y < 14 else 1) + streu(x, y) % 2
                bild.putpixel((x, y), toene[min(2, stufe)] + (255,))
    return bild


NAMEN = [
    ("item.fynn:bosschronik", "Chronik der Bosse", "Chronicle of Bosses"),
]


def main():
    bk.schreibe(VER / "items" / "bosschronik.json", gegenstand("bosschronik", {
        "minecraft:rarity": "uncommon", "minecraft:use_modifiers": {"use_duration": 0.1},
    }, gruppe="fynn:itemGroup.name.jagd", stapel=1))
    # Ein Buch, Eisen fuer die Ritter, Gold fuer die Banditen, Eis fuer das Mammut.
    bk.schreibe(VER / "recipes" / "bosschronik.json", rezept(
        "bosschronik", [" i ", "gBe"],
        {"i": "minecraft:iron_ingot", "g": "minecraft:gold_ingot", "B": "minecraft:book", "e": "minecraft:ice"}))
    bk.item_bilder({"bosschronik": buch_bild()})
    bk.sprache("Chronik der Bosse", NAMEN)
    print("gebaut: Chronik der Bosse")


if __name__ == "__main__":
    main()
