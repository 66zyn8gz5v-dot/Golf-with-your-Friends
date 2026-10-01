#!/usr/bin/env python3
"""Weidenroeschen - die Blume, mit der man den Elch zaehmt.

Fynn: "Den kann man zaehmen mit irgendwas, was der frisst. Und fuegst du
halt eine Pflanze, die er gerne isst, irgendwie hinzu."

Echte Elche fressen im Sommer gern Schmalblaettriges Weidenroeschen - eine
hohe Staude mit einer Kerze aus pinken Blueten, die in Nadelwaeldern und an
Waldraendern waechst, gern dort, wo es einmal gebrannt hat. Hier waechst sie
in der Taiga, im Sumpf und auf Bergwiesen, in kleinen Gruppen.

Gebaut wie eine Blume von Minecraft: zwei gekreuzte Flaechen mit demselben
Bild. Oben Knospen, darunter offene Blueten mit vier Blaettern, unten
schmale Blaetter am Stiel.

    python3 werkzeuge/weidenroeschen_bauen.py [--bilder ORDNER]
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tierprodukte_bauen as tp                 # noqa: E402
from tiermodell import hexfarbe                 # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"
NAME = "weidenroeschen"

FARBEN = {"stiel": "#4e7a34", "blatt": "#3e6a2a", "blatt_hell": "#6a9a44", "knospe": "#8a2a5a",
          "bluete": "#d8509a", "bluete_hell": "#f090c0", "mitte": "#f8e8f0"}


def bild():
    b = Image.new("RGBA", (16, 16), (0, 0, 0, 0))

    def setze(x, y, farbe):
        if 0 <= x < 16 and 0 <= y < 16:
            b.putpixel((x, y), hexfarbe(FARBEN[farbe]) + (255,))

    for y in range(2, 16):
        setze(7, y, "stiel")
    # Knospen an der Spitze - dunkel, noch geschlossen.
    for x, y in ((7, 0), (7, 1), (6, 2), (8, 2), (8, 1)):
        setze(x, y, "knospe")
    # Offene Blueten: vier Blaetter um eine helle Mitte, abwechselnd links
    # und rechts am Stiel, unten groesser.
    for mx, my in ((5, 4), (9, 5), (5, 7), (10, 8), (4, 10)):
        for dx, dy in ((0, -1), (-1, 0), (1, 0), (0, 1)):
            setze(mx + dx, my + dy, "bluete_hell" if dy < 0 or dx < 0 else "bluete")
        setze(mx, my, "mitte")
        # Der kleine Bluetenstiel zum Stiel hin.
        schritt = 1 if mx < 7 else -1
        for x in range(mx + 2 * schritt, 7, schritt):
            setze(x, my + 1, "stiel")
    # Schmale Blaetter unten, schraeg nach oben.
    for (sx, sy), richtung in (((7, 12), -1), ((7, 13), 1), ((7, 15), -1), ((7, 15), 1)):
        for i in range(1, 5):
            setze(sx + richtung * i, sy - (i + 1) // 2, "blatt_hell" if i == 4 else "blatt")
    return b


def geometrie():
    ebene = {"origin": [-8, 0, 0], "size": [16, 16, 0], "pivot": [0, 0, 0]}
    return {"format_version": "1.12.0", "minecraft:geometry": [{
        "description": {"identifier": f"geometry.fynn.{NAME}", "texture_width": 16, "texture_height": 16,
                        "visible_bounds_width": 2, "visible_bounds_height": 2, "visible_bounds_offset": [0, 0.5, 0]},
        "bones": [{"name": "pflanze", "pivot": [0, 0, 0], "cubes": [
            dict(ebene, rotation=[0, 45, 0], uv={"north": {"uv": [0, 0], "uv_size": [16, 16]},
                                                  "south": {"uv": [16, 0], "uv_size": [-16, 16]}}),
            dict(ebene, rotation=[0, -45, 0], uv={"north": {"uv": [0, 0], "uv_size": [16, 16]},
                                                   "south": {"uv": [16, 0], "uv_size": [-16, 16]}}),
        ]}]}]}


BODEN = ["minecraft:grass_block", "minecraft:dirt", "minecraft:podzol", "minecraft:coarse_dirt",
         "minecraft:moss_block", "minecraft:mud", "minecraft:rooted_dirt"]


def block():
    return {"format_version": "1.21.90", "minecraft:block": {
        "description": {"identifier": f"fynn:{NAME}",
                        "menu_category": {"category": "nature", "group": "minecraft:itemGroup.name.flower"}},
        "components": {
            "minecraft:geometry": f"geometry.fynn.{NAME}",
            "minecraft:material_instances": {"*": {"texture": NAME, "render_method": "alpha_test"}},
            "minecraft:collision_box": False,
            "minecraft:selection_box": {"origin": [-5, 0, -5], "size": [10, 15, 10]},
            "minecraft:light_dampening": 0,
            "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.0},
            "minecraft:destructible_by_explosion": {"explosion_resistance": 0.0},
            "minecraft:flammable": {"catch_chance_modifier": 60, "destroy_chance_modifier": 100},
            "minecraft:placement_filter": {"conditions": [{"allowed_faces": ["up"], "block_filter": BODEN}]},
            "minecraft:map_color": "#D8509A",
        }}}


def merkmale():
    """Einzeln, dann gestreut: in manchen Chunks eine kleine Gruppe."""
    einzeln = {"format_version": "1.13.0", "minecraft:single_block_feature": {
        "description": {"identifier": f"fynn:{NAME}_einzeln"},
        "places_block": f"fynn:{NAME}",
        "enforce_placement_rules": True,
        "enforce_survivability_rules": True,
        "may_attach_to": {"min_sides_must_attach": 1, "auto_rotate": False, "bottom": BODEN},
        "may_replace": ["minecraft:air"]}}
    streuung = {"format_version": "1.13.0", "minecraft:scatter_feature": {
        "description": {"identifier": f"fynn:{NAME}_gruppe"},
        "places_feature": f"fynn:{NAME}_einzeln",
        "iterations": 7,
        "scatter_chance": {"numerator": 1, "denominator": 5},
        "x": {"distribution": "uniform", "extent": [0, 15]},
        "y": "query.heightmap(variable.worldx, variable.worldz)",
        "z": {"distribution": "uniform", "extent": [0, 15]}}}
    regel = {"format_version": "1.13.0", "minecraft:feature_rules": {
        "description": {"identifier": f"fynn:{NAME}_regel", "places_feature": f"fynn:{NAME}_gruppe"},
        "conditions": {"placement_pass": "surface_pass", "minecraft:biome_filter": [{"any_of": [
            {"test": "has_biome_tag", "operator": "==", "value": w} for w in ("taiga", "swamp", "meadow")]}]}}}
    return einzeln, streuung, regel


def main():
    b = bild()
    b.save(RES / "textures" / "blocks" / f"{NAME}.png")
    tp.schreibe(RES / "models" / "blocks" / f"{NAME}.geo.json", geometrie())
    terrain_pfad = RES / "textures" / "terrain_texture.json"
    terrain = json.loads(terrain_pfad.read_text(encoding="utf-8"))
    terrain["texture_data"][NAME] = {"textures": f"textures/blocks/{NAME}"}
    tp.schreibe(terrain_pfad, terrain)
    bloecke_pfad = RES / "blocks.json"
    bloecke = json.loads(bloecke_pfad.read_text(encoding="utf-8"))
    bloecke[f"fynn:{NAME}"] = {"sound": "grass"}
    tp.schreibe(bloecke_pfad, bloecke)
    tp.schreibe(VER / "blocks" / f"{NAME}.json", block())
    einzeln, streuung, regel = merkmale()
    tp.schreibe(VER / "features" / f"{NAME}_einzeln.json", einzeln)
    tp.schreibe(VER / "features" / f"{NAME}_gruppe.json", streuung)
    tp.schreibe(VER / "feature_rules" / f"{NAME}_regel.json", regel)
    import abenteuer_bauen
    abenteuer_bauen.sprache([("tile", NAME, ("Weidenröschen", "Fireweed"))], "## Weidenroeschen")
    print("gebaut: Weidenroeschen (Block, Bild, Wachstum in Taiga, Sumpf und Bergwiese)")
    if "--bilder" in sys.argv:
        ziel = Path(sys.argv[sys.argv.index("--bilder") + 1])
        ziel.mkdir(parents=True, exist_ok=True)
        b.resize((128, 128), Image.NEAREST).save(ziel / "weidenroeschen.png")


if __name__ == "__main__":
    main()
