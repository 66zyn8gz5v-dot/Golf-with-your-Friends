#!/usr/bin/env python3
"""Der Elefantensattel - eine Saenfte fuer den Riesenelefanten.

Fynn: "Maybe kann man den auch reiten, aber da braucht man einen
Spezialsattel. Da kann man so ein Geruest-maessig drauf machen ... auf dem
Ruecken hat man dann so einen coolen Sitz ... ordentlich Stauraum ... bis
zu drei Spieler."

Wie in Indien und Thailand: Auf dem Elefanten sitzt eine Saenfte, eine
Plattform mit Bruestung und Dach. Das Modell gehoert zum Elefanten
(tiere_gestalt_neu.saenfte), das Verhalten zu tiere_bauen (riesenreittier).
Dieses Werkzeug baut den Gegenstand, sein Bild, das Rezept und die
Beuteliste, mit der die Schere den Sattel wieder herausgibt.

Rezept:   R R R     rote Wolle (das Dach)
          P S P     Bretter, Sattel, Bretter
          L K L     Leder, Truhe (der Stauraum), Leder

    python3 werkzeuge/elefantensattel_bauen.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tierprodukte_bauen as tp                 # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"
NAME = "elefantensattel"

SYMBOL = [
    ".......g........",
    "......rrr.......",
    "....rryrryrr....",
    "..rryrryrryrry..",
    "..ffffffffffff..",
    "..p..........p..",
    "..p..........p..",
    "..p.bb.bb.bb.p..",
    "..wwwwwwwwwwww..",
    "..hhhhhhhhhhhh..",
    ".dddddddddddddd.",
    ".dyyyyyyyyyyyyd.",
    ".dd.dddddddd.dd.",
    ".dd.dddddddd.dd.",
    ".yy.yyyyyyyy.yy.",
    "................",
]
FARBEN = {"#": "#9a2a2a", "r": "#a83232", "y": "#d8b050", "g": "#e0b850", "f": "#d8b050", "p": "#4a2e1a",
          "b": "#3a5a8a", "w": "#6a4428", "h": "#7a5030", "d": "#9a2a2a"}


def rezept():
    return {"format_version": "1.20.10", "minecraft:recipe_shaped": {
        "description": {"identifier": f"fynn:{NAME}"}, "tags": ["crafting_table"],
        "pattern": ["RRR", "PSP", "LKL"],
        "key": {"R": {"item": "minecraft:red_wool"}, "P": {"tag": "minecraft:planks"},
                "S": {"item": "minecraft:saddle"}, "L": {"item": "minecraft:leather"},
                "K": {"item": "minecraft:chest"}},
        "unlock": [{"item": "minecraft:saddle"}],
        "result": {"item": f"fynn:{NAME}", "count": 1}}}


def main():
    from vorlagen.tierformen import FORMEN
    FORMEN[NAME] = SYMBOL
    bild = tp.male(NAME, FARBEN)
    bild.save(RES / "textures" / "items" / f"{NAME}.png")
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    liste["texture_data"][NAME] = {"textures": f"textures/items/{NAME}"}
    tp.schreibe(liste_pfad, liste)
    tp.schreibe(VER / "items" / f"{NAME}.json",
                tp.gegenstand(NAME, {"minecraft:max_stack_size": 1}, "equipment", "minecraft:itemGroup.name.saddle"))
    tp.schreibe(VER / "recipes" / f"{NAME}.json", rezept())
    tp.schreibe(VER / "loot_tables" / f"{NAME}.json",
                {"pools": [{"rolls": 1, "entries": [{"type": "item", "name": f"fynn:{NAME}", "weight": 1}]}]})
    import abenteuer_bauen
    abenteuer_bauen.sprache([("item", NAME, ("Elefantensattel", "Elephant Howdah"))], "## Elefantensattel")
    print("gebaut: Elefantensattel (Gegenstand, Bild, Rezept, Beuteliste)")


if __name__ == "__main__":
    main()
