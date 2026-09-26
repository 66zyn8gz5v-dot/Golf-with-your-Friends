#!/usr/bin/env python3
"""Baut den Wurfstern in 3D: in der Hand und im Flug.

Bisher war er in der Hand Minecrafts flaches Bildmodell und im Flug ein
Bild, das sich zum Betrachter dreht wie ein Schneeball. Jetzt:

* In der Hand ein Stern mit Dicke - in der Mitte am dicksten (1.5), zu
  den Spitzen hin duenner bis 0.5. So wirken die Klingen scharf und die
  Mitte massiv.
* Im Flug derselbe Stern, flach liegend und sich schnell drehend - drei
  Umdrehungen je Sekunde, wie ein geworfener Stern eben fliegt.

Die Farben kommen aus dem Inventarbild (wurfstern.png), Pixel fuer Pixel;
das Inventarbild selbst bleibt, wie es ist.

    python3 werkzeuge/wurfstern_3d_bauen.py
"""

import json
import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import waffe_bauen as w                                   # noqa: E402
from dolche_bauen import schreibe, GRIFF_AUSSEN, GRIFF_ICH  # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
BILD = RES / "textures" / "items" / "wurfstern.png"

ZEICHEN = "abcdefghijklmnopqrstuvwxyz"


# Der dunkle Umriss des Inventarbilds. Am Modell faellt er weg: Die Kanten
# macht dort die Geometrie selbst, und schwarze Umrisspixel an 3D-Modellen
# mag Fynn nicht (so schon beim Feuerstab).
UMRISS = (30, 32, 40, 255)


def karte_und_farben():
    """Das Inventarbild als Zeichenkarte - jede Farbe ein Buchstabe."""
    bild = Image.open(BILD).convert("RGBA")
    farben, zeilen = {}, []
    for y in range(bild.height):
        z = ""
        for x in range(bild.width):
            p = bild.getpixel((x, y))
            if not p[3] or p == UMRISS:
                z += "."
                continue
            if p not in farben.values():
                farben[ZEICHEN[len(farben)]] = p
            z += next(k for k, f in farben.items() if f == p)
        zeilen.append(z)
    return zeilen, farben


def dicke(zeile, spalte):
    """1.5 in der Mitte, 0.5 an den Spitzen, auf Viertel gerundet."""
    r = math.hypot(spalte + 0.5 - 8, zeile + 0.5 - 8)
    return max(0.5, round((1.6 - r * 0.16) * 4) / 4)


def flugmodell(karte):
    """Flach liegend (x und z), die Dicke nach oben - er dreht sich um y."""
    kaesten = []
    for v, zeile in enumerate(karte):
        for u, z in enumerate(zeile):
            if z == ".":
                continue
            d = dicke(v, u)
            feld = {"uv": [u, v], "uv_size": [1, 1]}
            kaesten.append({"origin": [u - 8, -d / 2, v - 8], "size": [1, d, 1],
                            "uv": {k: feld for k in ("north", "south", "east", "west", "up", "down")}})
    return {"format_version": "1.16.0", "minecraft:geometry": [{
        "description": {"identifier": "geometry.wurfstern_flug", "texture_width": 16, "texture_height": 16,
                        "visible_bounds_width": 2, "visible_bounds_height": 1, "visible_bounds_offset": [0, 0, 0]},
        "bones": [{"name": "stern", "pivot": [0, 0, 0], "cubes": kaesten}],
    }]}


def main():
    karte, farben = karte_und_farben()

    # In der Hand: wie die Dolche aufrecht aus der Zeichnung gezogen.
    w.aus_zeichenkarte("wurfstern", karte, farben,
                       dicke=lambda zeile, spalte, zeichen: dicke(zeile, spalte), mitte=8.0,
                       ziel_modell=str(RES / "models" / "entity" / "wurfstern.geo.json"),
                       ziel_textur=str(RES / "textures" / "entity" / "wurfstern_haut.png"))
    # Die Mitte des Sterns liegt auf Hoehe 8 - dorthin, wo bei der
    # Stahlklinge die Griffmitte liegt: Er sitzt zwischen den Fingern.
    halten = {"format_version": "1.10.0", "animations": {"animation.wurfstern.halten": {"loop": True, "bones": {
        "waffe": {
            "position": ["c.is_first_person ? -3.5 : 0.0", "c.is_first_person ? -3.5 : -2.0", 0.0],
            "rotation": ["c.is_first_person ? 0.0 : 90.0", 0.0, "c.is_first_person ? -135.0 : 0.0"],
            "scale": "c.is_first_person ? 0.22 : 0.3",
        },
        "griff": {"position": [0.0, f"c.is_first_person ? {GRIFF_ICH:.2f} : {GRIFF_AUSSEN:.2f}", 0.0],
                  "rotation": [0.0, "c.is_first_person ? 0.0 : 90.0", 0.0]},
    }}, "animation.wurfstern.drehen": {"loop": True, "bones": {
        "stern": {"rotation": [0.0, "q.life_time * 1080.0", 0.0]},
    }}}}
    schreibe(RES / "animations" / "wurfstern.animation.json", halten)
    schreibe(RES / "attachables" / "wurfstern.json", {"format_version": "1.10.0", "minecraft:attachable": {
        "description": {
            "identifier": "fynn:wurfstern",
            "materials": {"default": "entity_alphatest", "enchanted": "entity_alphatest_glint"},
            "textures": {"default": "textures/entity/wurfstern_haut", "enchanted": "textures/misc/enchanted_item_glint"},
            "geometry": {"default": "geometry.wurfstern"},
            "animations": {"halten": "animation.wurfstern.halten"},
            "scripts": {"animate": ["halten"]},
            "render_controllers": ["controller.render.item_default"],
        }}})

    # Im Flug
    schreibe(RES / "models" / "entity" / "wurfstern_flug.geo.json", flugmodell(karte))
    schreibe(RES / "entity" / "wurfstern.entity.json", {"format_version": "1.10.0", "minecraft:client_entity": {
        "description": {
            "identifier": "fynn:wurfstern",
            "materials": {"default": "entity_alphatest"},
            "textures": {"default": "textures/items/wurfstern"},
            "geometry": {"default": "geometry.wurfstern_flug"},
            "animations": {"drehen": "animation.wurfstern.drehen"},
            "scripts": {"scale": "0.45", "animate": ["drehen"]},
            "render_controllers": ["controller.render.default"],
        }}})
    print("gebaut: Wurfstern in der Hand und im Flug")


if __name__ == "__main__":
    main()
