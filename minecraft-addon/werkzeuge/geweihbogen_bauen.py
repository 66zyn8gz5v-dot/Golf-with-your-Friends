#!/usr/bin/env python3
"""Der Elchgeweihbogen - ein Bogen aus zwei Elchgeweihen, in 3D.

Fynn: "ich haette gerne einen Elchgeweihbogen, den man aus zwei
Elchgeweihen craften kann ... der soll auch ganz cool sein. Auch 3D."

Die Wurfarme sind zwei Geweihstangen: elfenbeinfarben, dicker als Holz,
und an der Aussenseite stehen Zacken ab - wie am Geweih selbst. Die
Spitzen enden in hellen Geweihenden, der Griff ist dunkles Leder.

Gebaut wird wie der Sturmbogen (bogen_3d_bauen.py): Die Form folgt
Minecrafts Bogen Pixel fuer Pixel, damit er genau so in der Hand liegt und
die vier Spannstufen aufeinanderpassen; jedes Teil bekommt seine eigene
Dicke. Die Zacken setzt das Werkzeug selbst an die Aussenkante der Arme,
dort, wo Platz ist und der Pfeil nicht vorbeifliegt.

Was er kann (pfeile.js): Er ist ein Jagdbogen. Pfeile aus ihm treffen
wilde Tiere - alles aus tiere_bauen.py - mit vier Schaden mehr.

Rezept, zwei Geweihe, drei Faeden, ein Stueck Leder als Griff:

     G S
    L  S
     G S

    python3 werkzeuge/geweihbogen_bauen.py
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import bogen_3d_bauen as b3                      # noqa: E402
from bogen_schild_bauen import hornspitzen       # noqa: E402
from dolche_bauen import schreibe                # noqa: E402
from vorlagen import bogen                       # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

FARBEN = {
    "D": (150, 126, 90), "L": (238, 228, 202), "M": (210, 194, 156), "K": (122, 100, 70),
    "G": (96, 62, 38), "g": (64, 40, 24),
    "s": (226, 220, 204),
    "p": (200, 168, 114), "q": (144, 110, 68), "k": (98, 72, 42),
    "1": (242, 246, 252), "2": (192, 200, 212), "3": (140, 150, 166),
    "T": (252, 248, 238), "t": (216, 204, 178),     # helle Geweihenden
    "Z": (230, 218, 188),                           # Zacken
}

# Geweih ist dicker als Eibenholz; die Zacken etwas duenner als die Stange.
TIEFE = dict(b3.TIEFE, **{"D": 2.0, "L": 2.0, "M": 2.0, "K": 2.0, "T": 2.0, "t": 2.0, "Z": 1.5})

PFEIL = set("pqk123")


def mit_zacken(karte):
    """Zacken an die Aussenkante der Wurfarme: schraeg nach oben links, wo
    der Bogen seinen Ruecken hat. Nur wo Platz ist, nicht am Griff und
    nicht neben dem Pfeil."""
    zeilen = [list(z) for z in hornspitzen(karte)]
    griff = [y for y, z in enumerate(zeilen) if "G" in z or "g" in z]
    frei = lambda x, y: 0 <= x < 16 and 0 <= y < 16 and zeilen[y][x] == "."   # noqa: E731
    neben_pfeil = lambda x, y: any(                                             # noqa: E731
        0 <= x + dx < 16 and 0 <= y + dy < 16 and zeilen[y + dy][x + dx] in PFEIL
        for dx in (-1, 0, 1) for dy in (-1, 0, 1))
    # Die Aussenkante entlang laufen (von unten links nach oben rechts) und
    # an jedem dritten Pixel eine Zacke setzen - abwechselnd kurz und lang.
    kante = sorted(((x, y) for y, z in enumerate(zeilen) for x, c in enumerate(z)
                    if c == "D" and not (griff and min(griff) - 1 <= y <= max(griff) + 1)),
                   key=lambda q: q[0] - q[1])
    for i, (x, y) in enumerate(kante[1::3]):
        richtungen = ((0, -1), (-1, -1)) if y <= 4 else ((-1, 0), (-1, -1))
        for dx, dy in richtungen:
            if frei(x + dx, y + dy) and not neben_pfeil(x + dx, y + dy):
                zeilen[y + dy][x + dx] = "Z"
                if i % 2 == 0 and frei(x + 2 * dx, y + 2 * dy) and not neben_pfeil(x + 2 * dx, y + 2 * dy):
                    zeilen[y + 2 * dy][x + 2 * dx] = "Z"
                break
    return ["".join(z) for z in zeilen]


def bild(karte):
    b = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(karte):
        for x, z in enumerate(zeile):
            if z != ".":
                b.putpixel((x, y), FARBEN[z] + (255,))
    return b


def modell(name, karte):
    """Wie b3.modell, aber mit den Dicken des Geweihs und schon fertiger
    Karte (die Zacken sind drin, die Spitzen auch)."""
    kaesten = []
    for u, v, lang, z in b3.laeufe(karte):
        d = TIEFE[z]
        feld = {"uv": [u, v], "uv_size": [lang, 1]}
        kaesten.append({
            "origin": [b3.ORT[0] + u - b3.BILD_DREHPUNKT[0], b3.ORT[1] + 0.5 - d / 2,
                       b3.ORT[2] + v - b3.BILD_DREHPUNKT[1]],
            "size": [lang, d, 1],
            "uv": {"up": feld, "down": feld, "north": feld, "south": feld,
                   "east": {"uv": [u + lang - 1, v], "uv_size": [1, 1]},
                   "west": {"uv": [u, v], "uv_size": [1, 1]}},
        })
    return {
        "description": {"identifier": f"geometry.{name}", "texture_width": 16, "texture_height": 16,
                        "visible_bounds_width": 3, "visible_bounds_height": 3, "visible_bounds_offset": [0, 0.5, 0]},
        "bones": [{"name": "rightitem", "pivot": [0, 0, 0]},
                  {"name": "bogen", "parent": "rightitem", "pivot": list(b3.ORT), "rotation": list(b3.DREHUNG),
                   "cubes": kaesten}],
    }


GEOMETRIEN = [f"geometry.fynn_geweihbogen_{i}" for i in range(4)]


def attachable():
    a = b3.attachable("fynn:geweihbogen", ["textures/items/geweihbogen"] +
                      [f"textures/items/geweihbogen_pulling_{i}" for i in range(3)], "controller.render.fynn_bogen")
    d = a["minecraft:attachable"]["description"]
    d["geometry"] = {"default": GEOMETRIEN[0]}
    d["geometry"].update({f"bow_pulling_{i}": GEOMETRIEN[i + 1] for i in range(3)})
    return a


def gegenstand():
    return {"format_version": "1.26.30", "minecraft:item": {
        "description": {"identifier": "fynn:geweihbogen",
                        "menu_category": {"category": "equipment", "group": "minecraft:itemGroup.name.bow"}},
        "components": {
            "minecraft:icon": {"textures": {"default": "geweihbogen"}},
            "minecraft:max_stack_size": 1,
            "minecraft:hand_equipped": True,
            "minecraft:rarity": "rare",
            "minecraft:durability": {"max_durability": 800},
            "minecraft:enchantable": {"value": 1, "slot": "bow"},
            "minecraft:repairable": {"repair_items": [{"items": ["fynn:elchgeweih"], "repair_amount": 400}]},
            "minecraft:use_modifiers": {"use_duration": 3600, "movement_modifier": 0.35},
            "minecraft:shooter": {
                "ammunition": [{"item": "minecraft:arrow", "use_offhand": True,
                                "search_inventory": True, "use_in_creative": True}],
                "max_draw_duration": 1.0, "scale_power_by_draw_duration": True, "charge_on_draw": False},
        }}}


def rezept():
    return {"format_version": "1.12", "minecraft:recipe_shaped": {
        "description": {"identifier": "fynn:geweihbogen"}, "tags": ["crafting_table"],
        "pattern": [" GS", "L S", " GS"],
        "key": {"G": {"item": "fynn:elchgeweih"}, "S": {"item": "minecraft:string"}, "L": {"item": "minecraft:leather"}},
        "unlock": [{"item": "fynn:elchgeweih"}],
        "result": {"item": "fynn:geweihbogen", "count": 1}}}


def sprache():
    for datei, name in (("de_DE.lang", "Elchgeweihbogen"), ("en_US.lang", "Moose Antler Bow")):
        pfad = RES / "texts" / datei
        zeilen = [z for z in pfad.read_text(encoding="utf-8").splitlines()
                  if not z.startswith("item.fynn:geweihbogen")]
        while zeilen and not zeilen[-1].strip():
            zeilen.pop()
        zeilen += [f"item.fynn:geweihbogen={name}", f"item.fynn:geweihbogen.name={name}"]
        pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def main():
    karten = [mit_zacken(bogen.BILDER[s]) for s in b3.STUFEN]
    namen = ["geweihbogen"] + [f"geweihbogen_pulling_{i}" for i in range(3)]
    for k, n in zip(karten, namen):
        bild(k).save(RES / "textures" / "items" / f"{n}.png")
    geos = [modell(g.replace("geometry.", ""), k) for g, k in zip(GEOMETRIEN, karten)]
    schreibe(RES / "models" / "entity" / "geweihbogen.geo.json", {"format_version": "1.16.0", "minecraft:geometry": geos})
    schreibe(RES / "attachables" / "geweihbogen.json", attachable())
    schreibe(VER / "items" / "geweihbogen.json", gegenstand())
    schreibe(VER / "recipes" / "geweihbogen.json", rezept())
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    for n in namen:
        liste["texture_data"][n] = {"textures": f"textures/items/{n}"}
    schreibe(liste_pfad, liste)
    sprache()
    zacken = sum(z.count("Z") for z in karten[0])
    print(f"gebaut: Elchgeweihbogen, 4 Spannstufen, {zacken} Zacken, "
          f"{sum(len(g['bones'][1]['cubes']) for g in geos)} Kaesten")
    for zeile in karten[0]:
        print("   ", zeile)


if __name__ == "__main__":
    main()
