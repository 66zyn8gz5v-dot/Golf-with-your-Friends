#!/usr/bin/env python3
"""Was die Kleintiere geben (4.77): Kaeferlarve, Schneckenschleim,
Schneckenhaus, Nuss - Gegenstand, Bild, Rezept, Namen.

Die Tiere selbst baut tiere_bauen.py (Steckbriefe in kleintiere_daten.py),
was sie tun, steht in scripts/kleintiere.js.

    python3 werkzeuge/kleintiere_bauen.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boss_kern as bk                                               # noqa: E402
import roland_beute_bauen as rbb                                     # noqa: E402
from tierprodukte_bauen import gegenstand, essen, formlos, BEUTEFACH  # noqa: E402

VER = bk.VER

# Eine dicke, geringelte Larve, zusammengekruemmt wie unter der Rinde.
LARVE = [
    "................",
    "................",
    "......kkkk......",
    ".....kLlLLk.....",
    "....kLlLLlLk....",
    "...kLlkkkklLk...",
    "...kLlk..kHHk...",
    "..kLlLk..kHbk...",
    "..kLlk....kk....",
    "..kLlLk.........",
    "..kLLlk...kk....",
    "...kLLlkkkLk....",
    "....kLlLlLLk....",
    ".....kLLlLk.....",
    "......kkkk......",
    "................",
]
LARVE_FARBEN = {"k": rbb.UMRISS, "L": (238, 226, 196), "l": (206, 188, 150), "H": (176, 104, 50),
                "b": (40, 26, 16)}

# Eine Flasche mit gruen-gelbem, zaehem Schleim.
SCHLEIM = [
    "................",
    "......kkkk......",
    "......kwwk......",
    ".......kk.......",
    "......kwwk......",
    ".....kwGGwk.....",
    "....kwGYYGwk....",
    "....kGYYYYGk....",
    "....kGYGGYGk....",
    "....kGGYGGGk....",
    "....kGGGGGGk....",
    "....kgGGGGgk....",
    ".....kggggk.....",
    "......kkkk......",
    "................",
    "................",
]
SCHLEIM_FARBEN = {"k": rbb.UMRISS, "w": (206, 232, 236), "G": (150, 190, 70), "Y": (206, 226, 120),
                  "g": (100, 140, 50)}

# Das leere Schneckenhaus mit seiner Spirale.
HAUS = [
    "................",
    "................",
    "......kkkkk.....",
    "....kkHHHHHkk...",
    "...kHHBBBBHHHk..",
    "...kHBHHHHBHHk..",
    "..kHBHBBBHHBHk..",
    "..kHBHBHHBHBHk..",
    "..kHBHHBBHHBHk..",
    "..kHHBHHHHBHHk..",
    "...kHHBBBBHHk...",
    "...kkHHHHHHkk...",
    ".....kkkkkk.....",
    "................",
    "................",
    "................",
]
HAUS_FARBEN = {"k": rbb.UMRISS, "H": (200, 164, 122), "B": (122, 86, 52)}

# Eine Haselnuss mit heller Kappe.
NUSS = [
    "................",
    "................",
    ".......kk.......",
    "......kSk.......",
    ".....kCCCk......",
    "....kCcCcCk.....",
    "....kCCCCCk.....",
    "...kNNNNNNNk....",
    "...kNnNNNNhk....",
    "...kNnNNNNhk....",
    "...kNnNNNNNk....",
    "....kNnNNNk.....",
    ".....kNNNk......",
    "......kkk.......",
    "................",
    "................",
]
NUSS_FARBEN = {"k": rbb.UMRISS, "S": (90, 120, 50), "C": (150, 170, 80), "c": (120, 140, 60),
               "N": (160, 100, 50), "n": (120, 72, 36), "h": (196, 138, 80)}

NAMEN = [
    ("item.fynn:kaeferlarve", "Käferlarve", "Beetle Grub"),
    ("item.fynn:kaeferlarve.name", "Käferlarve", "Beetle Grub"),
    ("item.fynn:schneckenschleim", "Schneckenschleim", "Snail Slime"),
    ("item.fynn:schneckenschleim.name", "Schneckenschleim", "Snail Slime"),
    ("item.fynn:schneckenhaus", "Schneckenhaus", "Snail Shell"),
    ("item.fynn:schneckenhaus.name", "Schneckenhaus", "Snail Shell"),
    ("item.fynn:nuss", "Haselnuss", "Hazelnut"),
    ("item.fynn:nuss.name", "Haselnuss", "Hazelnut"),
    ("action.interact.fynn_schleim", "Schleim abfüllen", "Collect slime"),
]


def bilder():
    return {"kaeferlarve": rbb.male(LARVE, LARVE_FARBEN), "schneckenschleim": rbb.male(SCHLEIM, SCHLEIM_FARBEN),
            "schneckenhaus": rbb.male(HAUS, HAUS_FARBEN), "nuss": rbb.male(NUSS, NUSS_FARBEN)}


def main():
    # Die Larve: ein Happen fuer den Notfall - vor allem aber Vogelfutter,
    # mit dem sich ein Singvogel sicher zaehmen laesst.
    bk.schreibe(VER / "items" / "kaeferlarve.json",
                gegenstand("kaeferlarve", essen(1, 0.1, immer=True, dauer=0.8), "nature", BEUTEFACH))
    bk.schreibe(VER / "items" / "schneckenschleim.json",
                gegenstand("schneckenschleim", {"minecraft:max_stack_size": 16}, "nature", BEUTEFACH))
    bk.schreibe(VER / "items" / "schneckenhaus.json",
                gegenstand("schneckenhaus", {"minecraft:max_stack_size": 64}, "nature", BEUTEFACH))
    bk.schreibe(VER / "items" / "nuss.json",
                gegenstand("nuss", essen(2, 0.4, dauer=0.8), "items", "minecraft:itemGroup.name.miscFood"))
    # Schleim wird zum Schleimball (die Flasche bleibt uebrig), das Haus -
    # Kalk wie ein Knochen - zu Knochenmehl.
    bk.schreibe(VER / "recipes" / "schneckenschleim_schleimball.json",
                formlos("schneckenschleim_schleimball", ["fynn:schneckenschleim"], "minecraft:slime_ball"))
    bk.schreibe(VER / "recipes" / "schneckenhaus_knochenmehl.json",
                formlos("schneckenhaus_knochenmehl", ["fynn:schneckenhaus"], "minecraft:bone_meal", 3))
    bk.item_bilder(bilder())
    bk.sprache("Kleintiere", NAMEN)
    print("gebaut: Käferlarve, Schneckenschleim, Schneckenhaus, Haselnuss")
    if "--bilder" in sys.argv:
        from PIL import Image
        ordner = Path(sys.argv[sys.argv.index("--bilder") + 1])
        gesamt = Image.new("RGBA", (4 * 180, 180), (198, 198, 198, 255))
        for i, b in enumerate(bilder().values()):
            gesamt.alpha_composite(b.resize((144, 144), Image.NEAREST), (18 + i * 180, 18))
        gesamt.save(ordner / "kleintiere_gegenstaende.png")
        print("gezeichnet:", ordner / "kleintiere_gegenstaende.png")


if __name__ == "__main__":
    main()
