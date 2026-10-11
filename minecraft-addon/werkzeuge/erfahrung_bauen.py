#!/usr/bin/env python3
"""Erfahrungsfunke, Erfahrungsgefaess und das Buch der Faehigkeiten.

Fynn (4.71): Drops, die Erfahrung geben, ein Erfahrungsgefaess mit 15
Leveln, und ein Faehigkeitensystem, das man mit Leveln ausbaut. Was die
Gegenstaende tun, steht in scripts/erfahrung.js und scripts/faehigkeiten.js;
hier entstehen Gegenstand, Bild, Rezept und Namen.

    python3 werkzeuge/erfahrung_bauen.py [--bilder vorschau]
"""

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boss_kern as bk                                               # noqa: E402
import roland_beute_bauen as rbb                                     # noqa: E402
from neue_waffen_bauen import gegenstand, rezept                     # noqa: E402

VER = bk.VER

# Ein Funke aus gruenem Licht, wie Minecrafts Erfahrungskugeln - nur als
# Stern, damit man ihn im Inventar nicht mit einer Kugel verwechselt.
FUNKE = [
    "................",
    "................",
    ".......kk.......",
    "......kgGk......",
    "......kgGk......",
    "...kkkgYYgkkk...",
    "..kgggYWWYgggk..",
    "..kGGYWWWWYGGk..",
    "..kGGYWWWWYGGk..",
    "..kgggYWWYgggk..",
    "...kkkgYYgkkk...",
    "......kgGk......",
    "......kgGk......",
    ".......kk.......",
    "................",
    "................",
]
FUNKE_FARBEN = {"k": (22, 44, 12), "g": (84, 176, 40), "G": (140, 220, 64), "Y": (220, 250, 120),
                "W": (255, 255, 222)}

# Ein bauchiges Glas mit Korken, darin leuchtende Erfahrung.
GEFAESS = [
    "................",
    "......kkkk......",
    "......kbBk......",
    "......kkkk......",
    "......kwwk......",
    "......kwwk......",
    ".....kwllwk.....",
    "....kwlLLlwk....",
    "...kwlLGGLlwk...",
    "...klLGYYGLlk...",
    "...klLGYYGLlk...",
    "...klLLGGLLlk...",
    "....klLLLLlk....",
    ".....kllllk.....",
    "......kkkk......",
    "................",
]
GEFAESS_FARBEN = {"k": rbb.UMRISS, "b": (120, 84, 50), "B": (150, 108, 66), "w": (206, 232, 236),
                  "l": (40, 120, 30), "L": (84, 184, 44), "G": (150, 230, 70), "Y": (236, 255, 150)}

# Wie die Chronik der Bosse, aber in gruenem Leder mit goldenem Stern.
BUCH = [
    "................",
    "...kkkkkkkkkk...",
    "..kDRRRRRRRRRk..",
    "..kDgRRRRRRgRk..",
    "..kDRRRggRRRRk..",
    "..kDRRRggRRRRk..",
    "..kDRggggggRRk..",
    "..kDRRggggRRRk..",
    "..kDRRgRRgRRRk..",
    "..kDRgRRRRgRRk..",
    "..kDRRRRRRRRRk..",
    "..kDgRRRRRRgRk..",
    "..kDRRRRRRRRRk..",
    "..kkPPPPPPPPPk..",
    "...kkkkkkkkkk...",
    "................",
]
BUCH_FARBEN = {"k": rbb.UMRISS, "R": (46, 112, 62), "D": (28, 72, 40), "g": (230, 188, 74),
               "P": (236, 226, 200)}


def buch_bild():
    """Das Leder gefleckt wie bei der Chronik: drei Toene nach der Streuung."""
    from spawnei_bauen import streu
    bild = rbb.male(BUCH, BUCH_FARBEN)
    toene = [(58, 132, 76), (46, 112, 62), (36, 94, 52)]
    for y, zeile in enumerate(BUCH):
        for x, z in enumerate(zeile):
            if z == "R":
                stufe = (0 if x + y < 14 else 1) + streu(x, y) % 2
                bild.putpixel((x, y), toene[min(2, stufe)] + (255,))
    return bild


NAMEN = [
    ("item.fynn:erfahrungsfunke", "Erfahrungsfunke", "Spark of Experience"),
    ("item.fynn:erfahrungsfunke.name", "Erfahrungsfunke", "Spark of Experience"),
    ("item.fynn:erfahrungsgefaess", "Erfahrungsgefäß", "Vessel of Experience"),
    ("item.fynn:erfahrungsgefaess.name", "Erfahrungsgefäß", "Vessel of Experience"),
    ("item.fynn:heldenbuch", "Buch der Fähigkeiten", "Book of Skills"),
    ("item.fynn:heldenbuch.name", "Buch der Fähigkeiten", "Book of Skills"),
]


def bilder():
    return {"erfahrungsfunke": rbb.male(FUNKE, FUNKE_FARBEN), "erfahrungsgefaess": rbb.male(GEFAESS, GEFAESS_FARBEN),
            "heldenbuch": buch_bild()}


def main():
    benutzen = {"minecraft:use_modifiers": {"use_duration": 0.1}}
    bk.schreibe(VER / "items" / "erfahrungsfunke.json", gegenstand("erfahrungsfunke", dict(
        benutzen, **{"minecraft:rarity": "uncommon"}), gruppe="fynn:itemGroup.name.jagd", stapel=64))
    bk.schreibe(VER / "items" / "erfahrungsgefaess.json", gegenstand("erfahrungsgefaess", dict(
        benutzen, **{"minecraft:rarity": "epic", "minecraft:glint": True}), gruppe="fynn:itemGroup.name.jagd", stapel=16))
    bk.schreibe(VER / "items" / "heldenbuch.json", gegenstand("heldenbuch", dict(
        benutzen, **{"minecraft:rarity": "uncommon"}), gruppe="fynn:itemGroup.name.jagd", stapel=1))
    # Wer sein Buch verliert: ein Buch, Lapis und ein Smaragd.
    bk.schreibe(VER / "recipes" / "heldenbuch.json", rezept(
        "heldenbuch", [" e ", "lBl"],
        {"B": "minecraft:book", "e": "minecraft:emerald", "l": "minecraft:lapis_lazuli"}))
    bk.item_bilder(bilder())
    bk.sprache("Erfahrung und Fähigkeiten", NAMEN)
    print("gebaut: Erfahrungsfunke, Erfahrungsgefäß, Buch der Fähigkeiten")
    if "--bilder" in sys.argv:
        ordner = Path(sys.argv[sys.argv.index("--bilder") + 1])
        gesamt = Image.new("RGBA", (3 * 180, 180), (198, 198, 198, 255))
        for i, b in enumerate(bilder().values()):
            gesamt.alpha_composite(b.resize((144, 144), Image.NEAREST), (18 + i * 180, 18))
        gesamt.save(ordner / "erfahrung.png")
        print("gezeichnet:", ordner / "erfahrung.png")


if __name__ == "__main__":
    main()
