#!/usr/bin/env python3
"""Baut die Artefaktentasche - einen Beutel, der Dinge aufnimmt wie ein Buendel.

Fynn will spaeter Artefakte machen, die in die Tasche kommen und dort
Staerken geben. Die Tasche selbst gibt es schon jetzt: Seit Minecraft
1.21.110 duerfen Pakete eigene Beutel bauen, mit derselben Bedienung wie
das Buendel - Gegenstand auf die Tasche ziehen, Tasche antippen zum
Herausnehmen.

Noch nimmt sie alles ausser Shulkerkisten und anderen Taschen. Sobald
es Artefakte gibt, bekommt "allowed_items" ihre Namen, und dann passt
nur noch hinein, was hineingehoert.

Die drei Bilder sind die Form des Buendels von Minecraft, weil das Spiel
beim Oeffnen die Gegenstaende zwischen "offen hinten" und "offen vorn"
zeichnet und beide dafuer genau passen muessen. Umgefaerbt in violettes
Leder mit Goldschnur, vorn eine goldene Schliesse mit einem Amethyst.

Buchstaben: 0 bis 5 Leder von dunkel nach hell, a bis d Gold von dunkel
nach hell, x Amethyst.

    python3 werkzeuge/tasche_bauen.py
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dolche_bauen import schreibe, sprache  # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"
NAME = "artefaktentasche"

FARBEN = {
    "0": (34, 16, 50), "1": (58, 30, 86), "2": (84, 46, 122),
    "3": (112, 66, 158), "4": (146, 96, 194), "5": (178, 128, 220),
    "a": (120, 80, 20), "b": (176, 126, 34), "c": (228, 180, 62), "d": (255, 232, 146),
    "x": (236, 196, 255),
}


ZU = [
    "................",
    "......1111......",
    ".....13111111...",
    ".....135111211..",
    "......13533111..",
    ".....ac121111...",
    "....22acccaa....",
    "...23552ca211...",
    "..235555ca111...",
    "..2355c33a2111..",
    "..135cxc533211..",
    "..1235c5533211..",
    "..112333332111..",
    "...1112221111...",
    ".....1111111....",
    "................",
]

OFFEN_HINTEN = [
    "................",
    "................",
    "................",
    "................",
    "...2222222222...",
    ".22344444343322.",
    "2332211112222332",
    ".32211111111123.",
    ".1111111111111..",
    "........2212....",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
]

OFFEN_VORN = [
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "................",
    "34............43",
    "3345.........433",
    "13335543....3531",
    "2133322444455312",
    "22c3455543222c22",
    "222c55543332c222",
    "122c34443222c221",
    "1122333222222211",
    "1111222222221111",
]

BILDER = {NAME: ZU, NAME + "_open_back": OFFEN_HINTEN, NAME + "_open_front": OFFEN_VORN}


def bild(karte):
    b = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(karte):
        for x, z in enumerate(zeile):
            if z != ".":
                b.putpixel((x, y), FARBEN[z] + (255,))
    return b


def gegenstand():
    return {
        "format_version": "1.26.30",
        "minecraft:item": {
            "description": {"identifier": f"fynn:{NAME}", "menu_category": {"category": "equipment"}},
            "components": {
                "minecraft:icon": {"textures": {
                    "default": NAME,
                    "bundle_open_back": NAME + "_open_back",
                    "bundle_open_front": NAME + "_open_front",
                }},
                "minecraft:max_stack_size": 1,
                "minecraft:storage_item": {
                    "max_slots": 64,
                    # Keine Tasche in der Tasche: Sonst liessen sich
                    # Artefakte stapelweise verschachteln.
                    "allow_nested_storage_items": False,
                    "banned_items": ["minecraft:shulker_box", "minecraft:undyed_shulker_box"],
                },
                "minecraft:storage_weight_limit": {"max_weight_limit": 64},
                "minecraft:storage_weight_modifier": {"weight_in_storage_item": 0},
                "minecraft:bundle_interaction": {"num_viewable_slots": 8},
            },
        },
    }


def rezept():
    # Faden oben, Gold als Schliesse, Leder rundherum und ein
    # Amethystsplitter in der Mitte - aus ihm kommt spaeter die Magie.
    return {
        "format_version": "1.20.10",
        "minecraft:recipe_shaped": {
            "description": {"identifier": f"fynn:{NAME}"},
            "tags": ["crafting_table"],
            "pattern": ["SGS", "LAL", "LLL"],
            "key": {
                "S": {"item": "minecraft:string"},
                "G": {"item": "minecraft:gold_ingot"},
                "L": {"item": "minecraft:leather"},
                "A": {"item": "minecraft:amethyst_shard"},
            },
            "unlock": [{"item": "minecraft:leather"}],
            "result": {"item": f"fynn:{NAME}"},
        },
    }


def main():
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    for name, karte in BILDER.items():
        bild(karte).save(RES / "textures" / "items" / f"{name}.png")
        liste["texture_data"][name] = {"textures": f"textures/items/{name}"}
    liste_pfad.write_text(json.dumps(liste, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Die Beutelbilder muss das Spiel vorab laden; dafuer stehen sie in
    # textures_list.json (so verlangt es Mojangs Beschreibung der
    # Buendel-Komponente).
    vorab = RES / "textures" / "textures_list.json"
    eintraege = json.loads(vorab.read_text(encoding="utf-8")) if vorab.exists() else []
    for name in BILDER:
        if f"textures/items/{name}" not in eintraege:
            eintraege.append(f"textures/items/{name}")
    vorab.write_text(json.dumps(eintraege, indent=2) + "\n", encoding="utf-8")

    schreibe(VER / "items" / f"{NAME}.json", gegenstand())
    schreibe(VER / "recipes" / f"{NAME}.json", rezept())
    sprache(RES / "texts" / "de_DE.lang",
            [(f"item.fynn:{NAME}", "Artefaktentasche"), (f"item.fynn:{NAME}.name", "Artefaktentasche")])
    sprache(RES / "texts" / "en_US.lang",
            [(f"item.fynn:{NAME}", "Artifact Pouch"), (f"item.fynn:{NAME}.name", "Artifact Pouch")])
    print("gebaut: Artefaktentasche")


if __name__ == "__main__":
    main()
