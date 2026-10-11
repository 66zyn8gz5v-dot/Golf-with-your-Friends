#!/usr/bin/env python3
"""Baut den Bogen in 3D - mit Dicke je nach Teil, in allen vier Spannstufen.

Minecraft zieht den Bogen in der Hand selbst aus dem Bild: Jeder Pixel wird
ein Kloetzchen von genau einem Pixel Dicke ("texture_mesh"). Fynn wollte ihn
wie die Schwerter - dick, wo es dick sein soll. Also baut dieses Werkzeug
die Kloetzchen selbst, an genau denselben Platz, und gibt jedem Teil seine
eigene Dicke:

    Ledergriff 2.5 - Hornspitzen 2 - Wurfarme 1.5 - Pfeilspitze 1.25
    Pfeilschaft 0.75 - Sehne 0.5, fadenduenn

Wohin die Kloetzchen gehoeren, steht in Mojangs bow.geo.json: Das Bild wird
um den Punkt (6, 6) gedreht, um [0, -135, 90], und bei (2, 1, -2)
abgesetzt. Das Bild liegt dabei flach - Bildspalte nach x, Bildzeile nach
z, die Dicke nach y. Dass es so herum liegt und nicht gespiegelt, ist
nachgerechnet: Nur so steht der Bogen in der Hand senkrecht, Spitze oben,
Spitze unten; in den anderen Lagen laege er quer.

Ein Modell fuer beide Boegen: Der Sturmbogen hat dieselben Formen, nur
andere Farben - die Farben kommen aus dem Bild, nicht aus dem Modell.

    python3 werkzeuge/bogen_3d_bauen.py
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from vorlagen import bogen                        # noqa: E402
from bogen_schild_bauen import hornspitzen        # noqa: E402
from dolche_bauen import schreibe                 # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"

TIEFE = {
    "G": 2.5, "g": 2.5,                        # Ledergriff
    "T": 2.0, "t": 2.0,                        # Hornspitzen
    "D": 1.5, "L": 1.5, "M": 1.5, "K": 1.5,    # Wurfarme
    "1": 1.25, "2": 1.25, "3": 1.25,           # Pfeilspitze
    "p": 0.75, "q": 0.75, "k": 0.75,           # Pfeilschaft
    "s": 0.5,                                  # Sehne
}

# Aus Mojangs bow.geo.json: Drehpunkt im Bild, Ort und Drehung im Modell.
BILD_DREHPUNKT = (6, 6)
ORT = [2, 1, -2]
DREHUNG = [0, -135, 90]

STUFEN = ["bow_standby", "bow_pulling_0", "bow_pulling_1", "bow_pulling_2"]


def laeufe(karte):
    """Waagerechte Laeufe gleicher Zeichen - ein Kasten statt vieler."""
    for v, zeile in enumerate(karte):
        u = 0
        while u < len(zeile):
            z = zeile[u]
            if z == ".":
                u += 1
                continue
            ende = u
            while ende + 1 < len(zeile) and zeile[ende + 1] == z:
                ende += 1
            yield u, v, ende - u + 1, z
            u = ende + 1


def modell(name, karte):
    kaesten = []
    for u, v, lang, z in laeufe(hornspitzen(karte)):
        d = TIEFE[z]
        feld = {"uv": [u, v], "uv_size": [lang, 1]}
        kaesten.append({
            # Das Bild liegt in y von 0 bis 1; die Dicke waechst von dort
            # nach beiden Seiten, damit die Mitte bleibt, wo Minecraft sie hat.
            "origin": [ORT[0] + u - BILD_DREHPUNKT[0], ORT[1] + 0.5 - d / 2, ORT[2] + v - BILD_DREHPUNKT[1]],
            "size": [lang, d, 1],
            "uv": {
                "up": feld, "down": feld,
                "north": feld, "south": feld,
                "east": {"uv": [u + lang - 1, v], "uv_size": [1, 1]},
                "west": {"uv": [u, v], "uv_size": [1, 1]},
            },
        })
    return {
        "description": {
            "identifier": f"geometry.{name}",
            "texture_width": 16, "texture_height": 16,
            "visible_bounds_width": 3, "visible_bounds_height": 3,
            "visible_bounds_offset": [0, 0.5, 0],
        },
        "bones": [
            {"name": "rightitem", "pivot": [0, 0, 0]},
            {"name": "bogen", "parent": "rightitem", "pivot": list(ORT), "rotation": list(DREHUNG),
             "cubes": kaesten},
        ],
    }


GEOMETRIEN = ["geometry.fynn_bogen_0", "geometry.fynn_bogen_1",
              "geometry.fynn_bogen_2", "geometry.fynn_bogen_3"]


def attachable(kennung, bilder, render):
    textur = {"default": bilder[0]}
    textur.update({f"bow_pulling_{i}": bilder[i + 1] for i in range(3)})
    textur["enchanted"] = "textures/misc/enchanted_item_glint"
    geo = {"default": GEOMETRIEN[0]}
    geo.update({f"bow_pulling_{i}": GEOMETRIEN[i + 1] for i in range(3)})
    return {"format_version": "1.10.0", "minecraft:attachable": {"description": {
        "identifier": kennung,
        "materials": {"default": "entity_alphatest", "enchanted": "entity_alphatest_glint"},
        "textures": textur,
        "geometry": geo,
        "animations": {"wield": "animation.bow.wield",
                       "wield_first_person_pull": "animation.bow.wield_first_person_pull"},
        "scripts": {
            "pre_animation": [
                "variable.charge_amount = math.clamp((query.main_hand_item_max_duration - "
                "(query.main_hand_item_use_duration - query.frame_alpha + 1.0)) / 10.0, 0.0, 1.0f);",
                # Fuer den eigenen Bogen: welche Spannstufe zu sehen ist.
                "variable.bogen_stufe = query.main_hand_item_use_duration > 0.0 ? "
                "(variable.charge_amount < 0.4 ? 1 : (variable.charge_amount < 0.95 ? 2 : 3)) : 0;",
            ],
            "animate": ["wield", {"wield_first_person_pull": "query.main_hand_item_use_duration > 0.0f && c.is_first_person"}],
        },
        "render_controllers": [render],
    }}}


def render_controller():
    """Fuer den Sturmbogen. Minecrafts eigener Bogen fragt das Spiel nach
    der Spannstufe (query.get_animation_frame) - ob das Spiel die auch fuer
    einen Bogen aus einem Paket fuehrt, ist nirgends beschrieben. Hier wird
    sie deshalb selbst aus der Zugzeit gerechnet."""
    return {"format_version": "1.10", "render_controllers": {"controller.render.fynn_bogen": {
        "arrays": {
            "textures": {"array.bilder": ["texture.default", "texture.bow_pulling_0",
                                          "texture.bow_pulling_1", "texture.bow_pulling_2"]},
            "geometries": {"array.formen": ["geometry.default", "geometry.bow_pulling_0",
                                            "geometry.bow_pulling_1", "geometry.bow_pulling_2"]},
        },
        "geometry": "array.formen[variable.bogen_stufe]",
        "materials": [{"*": "variable.is_enchanted ? material.enchanted : material.default"}],
        "textures": ["array.bilder[variable.bogen_stufe]", "texture.enchanted"],
    }}}


def main():
    geos = [modell(g.replace("geometry.", ""), bogen.BILDER[s]) for g, s in zip(GEOMETRIEN, STUFEN)]
    schreibe(RES / "models" / "entity" / "fynn_bogen.geo.json",
             {"format_version": "1.16.0", "minecraft:geometry": geos})
    # Minecrafts Bogen: gleiche Bilder, gleiche Umschaltung, nur das Modell neu.
    schreibe(RES / "attachables" / "bogen.json", attachable(
        "minecraft:bow", [f"textures/items/{s}" for s in STUFEN], "controller.render.bow"))
    schreibe(RES / "attachables" / "sturmbogen.json", attachable(
        "fynn:sturmbogen", ["textures/items/sturmbogen"] + [f"textures/items/sturmbogen_pulling_{i}" for i in range(3)],
        "controller.render.fynn_bogen"))
    schreibe(RES / "render_controllers" / "fynn_bogen.render_controllers.json", render_controller())
    anzahl = sum(len(g["bones"][1]["cubes"]) for g in geos)
    print(f"gebaut: 4 Spannstufen, {anzahl} Kaesten; Attachables fuer Bogen und Sturmbogen")


if __name__ == "__main__":
    main()
