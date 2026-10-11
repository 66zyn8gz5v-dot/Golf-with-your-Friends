#!/usr/bin/env python3
"""Baut die Erzpfeile: Inventarbild, Gegenstand, Rezept und Namen.

Minecrafts Bogen verschiesst nur seine eigenen Pfeile - ein Gegenstand
aus einem Paket laesst sich ihm nicht als Munition geben. Die Erzpfeile
gehen darum einen Umweg, den das Skript pfeile.js macht: Man steckt sie
in die Zweithand. Schiesst der Bogen, bekommt der abgeschossene Pfeil
die Wirkung der Sorte, ein Erzpfeil wird verbraucht und der gewoehnliche
Pfeil zurueckgelegt.

Deshalb tragen die Gegenstaende "allow_off_hand" - ohne das nimmt die
Zweithand sie nicht.

    python3 werkzeuge/pfeile_bauen.py
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from vorlagen import pfeile as v            # noqa: E402
from dolche_bauen import schreibe, sprache  # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"


def bild(farben):
    alle = {**v.SCHAFT, **farben}
    b = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(v.KARTE):
        for x, z in enumerate(zeile):
            if z != ".":
                b.putpixel((x, y), alle[z] + (255,))
    return b


def gegenstand(name):
    return {
        "format_version": "1.26.30",
        "minecraft:item": {
            "description": {
                "identifier": f"fynn:{name}",
                "menu_category": {"category": "equipment", "group": "minecraft:itemGroup.name.arrow"},
            },
            "components": {
                "minecraft:icon": {"textures": {"default": name}},
                "minecraft:max_stack_size": 64,
                "minecraft:allow_off_hand": True,
            },
        },
    }


def rezept(name, sorte):
    # Wie Minecrafts Pfeil: Spitze oben, Stock in der Mitte, Feder unten.
    return {
        "format_version": "1.20.10",
        "minecraft:recipe_shaped": {
            "description": {"identifier": f"fynn:{name}"},
            "tags": ["crafting_table"],
            "pattern": ["X", "#", "F"],
            "key": {
                "X": {"item": sorte["barren"]},
                "#": {"item": "minecraft:stick"},
                "F": {"item": "minecraft:feather"},
            },
            "unlock": [{"item": "minecraft:feather"}],
            "result": {"item": f"fynn:{name}", "count": v.JE_REZEPT},
        },
    }


def main():
    texturliste = RES / "textures" / "item_texture.json"
    liste = json.loads(texturliste.read_text(encoding="utf-8"))
    deutsch, englisch = [], []
    for name, sorte in v.SORTEN.items():
        bild(sorte["farben"]).save(RES / "textures" / "items" / f"{name}.png")
        liste["texture_data"][name] = {"textures": f"textures/items/{name}"}
        schreibe(VER / "items" / f"{name}.json", gegenstand(name))
        schreibe(VER / "recipes" / f"{name}.json", rezept(name, sorte))
        de, en = sorte["name"]
        deutsch += [(f"item.fynn:{name}", de), (f"item.fynn:{name}.name", de)]
        englisch += [(f"item.fynn:{name}", en), (f"item.fynn:{name}.name", en)]
        print(f"gebaut: {name}")
    texturliste.write_text(json.dumps(liste, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    sprache(RES / "texts" / "de_DE.lang", deutsch)
    sprache(RES / "texts" / "en_US.lang", englisch)


if __name__ == "__main__":
    main()
