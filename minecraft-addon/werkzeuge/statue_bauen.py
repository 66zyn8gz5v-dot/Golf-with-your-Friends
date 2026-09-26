#!/usr/bin/env python3
"""Baut die Statuen des Starttempels.

Eine Statue ist ein Wesen in Spielergestalt mit einer Haut aus Stein. Sie
bewegt sich nicht, nimmt keinen Schaden und laesst nichts fallen, wenn
jemand sie doch los wird. Was sie traegt, bekommt sie vom Skript
(tempel.js): genau die Startausruestung ihrer Rolle. So sieht man im
Tempel, was man bekommt, bevor man waehlt.

Damit Ruestung und Waffe an einem eigenen Wesen ueberhaupt gezeichnet
werden, braucht es "enable_attachables" - sonst zeigt Minecraft
angelegte Dinge nur an Spielern und an Wesen aus dem Spiel selbst.

Die Haut ist nur auf der inneren Schicht bemalt. Die aeussere (Jacke,
Hutschicht, Aermel) bleibt durchsichtig; bemalt waere die Statue einen
halben Pixel dicker, und die Ruestung saesse zu eng.

    python3 werkzeuge/statue_bauen.py
"""

import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ofen_koernung                            # noqa: E402
from dolche_bauen import schreibe, sprache      # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

# Die innere Schicht einer Spielerhaut von 64 mal 64: Kopf, Rumpf, Arme,
# Beine - (x, y, Breite, Hoehe) des jeweiligen Kastennetzes.
INNEN = [(0, 0, 32, 16), (16, 16, 24, 16), (40, 16, 16, 16), (0, 16, 16, 16),
         (16, 48, 16, 16), (32, 48, 16, 16)]
STEIN = [(168, 166, 160), (150, 148, 142), (132, 130, 124), (112, 110, 105)]


def haut():
    bild = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    for x0, y0, b, h in INNEN:
        for y in range(h):
            for x in range(b):
                bild.putpixel((x0 + x, y0 + y), STEIN[1] + (255,))
    bild, _ = ofen_koernung.koernen(bild, 83)
    # Leere Augen, eine Stufe dunkler - Statuen schauen durch einen durch.
    for x in (9, 10, 13, 14):
        bild.putpixel((x, 12), STEIN[3] + (255,))
    return bild


def verhalten():
    ohne = [{"slot": s, "drop_chance": 0.0} for s in (
        "slot.weapon.mainhand", "slot.weapon.offhand", "slot.armor.head",
        "slot.armor.chest", "slot.armor.legs", "slot.armor.feet")]
    return {
        "format_version": "1.21.90",
        "minecraft:entity": {
            "description": {"identifier": "fynn:statue", "is_spawnable": False, "is_summonable": True},
            "components": {
                # "inanimate": Wirbelschlag und Schattensprung lassen sie aus.
                "minecraft:type_family": {"family": ["statue", "inanimate"]},
                "minecraft:collision_box": {"width": 0.6, "height": 1.9},
                "minecraft:health": {"value": 100, "max": 100},
                "minecraft:damage_sensor": {"triggers": {"cause": "all", "deals_damage": "no"}},
                "minecraft:physics": {},
                "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
                "minecraft:knockback_resistance": {"value": 1.0},
                "minecraft:persistent": {},
                "minecraft:fire_immune": True,
                "minecraft:nameable": {"always_show": True, "allow_name_tag_renaming": False},
                "minecraft:equipment": {"table": "loot_tables/leer.json", "slot_drop_chance": ohne},
                "minecraft:loot": {"table": "loot_tables/leer.json"},
            },
        },
    }


def aussehen():
    return {
        "format_version": "1.10.0",
        "minecraft:client_entity": {
            "description": {
                "identifier": "fynn:statue",
                "materials": {"default": "entity_alphatest"},
                "textures": {"default": "textures/entity/statue"},
                "geometry": {"default": "geometry.humanoid.custom"},
                "enable_attachables": True,
                "animations": {"pose": "animation.statue.pose"},
                # Was die Ruestungen vom Traeger lesen (siehe
                # rollenruestung_bauen.py): Eine Statue steht still, ihr
                # Umhang haengt, und im Koecher stecken Pfeile.
                "scripts": {
                    "initialize": ["variable.fynn_pfeile = 1.0;", "variable.fynn_umhang = 4.0;",
                                   "variable.fynn_tempo = 0.0;", "variable.fynn_gang = 0.0;"],
                    "variables": {"variable.fynn_pfeile": "public", "variable.fynn_umhang": "public",
                                  "variable.fynn_tempo": "public", "variable.fynn_gang": "public"},
                    "animate": ["pose"],
                },
                "render_controllers": ["controller.render.default"],
            }
        },
    }


def pose():
    # Waffe leicht vorgestreckt, der andere Arm angewinkelt, der Kopf
    # etwas erhoben - eine Heldenstatue, kein Wachsfigurenkabinett.
    return {
        "format_version": "1.10.0",
        "animations": {
            "animation.statue.pose": {
                "loop": True,
                "bones": {
                    "rightArm": {"rotation": [-35, 0, 5]},
                    "leftArm": {"rotation": [-15, 0, -8]},
                    "head": {"rotation": [-6, 0, 0]},
                    "rightLeg": {"rotation": [4, 0, 0]},
                    "leftLeg": {"rotation": [-4, 0, 0]},
                },
            }
        },
    }


def main():
    haut().save(RES / "textures" / "entity" / "statue.png")
    schreibe(VER / "entities" / "statue.json", verhalten())
    schreibe(RES / "entity" / "statue.entity.json", aussehen())
    schreibe(RES / "animations" / "statue.animation.json", pose())
    sprache(RES / "texts" / "de_DE.lang", [("entity.fynn:statue.name", "Statue")])
    sprache(RES / "texts" / "en_US.lang", [("entity.fynn:statue.name", "Statue")])
    print("gebaut: Statue")


if __name__ == "__main__":
    main()
