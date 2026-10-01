#!/usr/bin/env python3
"""Baut die vier neuen Waffen: Kriegshammer, Frostzepter, Sturmbogen,
Wurfsterne - dazu die Frostkugel, die das Zepter verschiesst.

Fynn: "ein paar mehr einzigartigere Waffen ... die noch nicht im Spiel
enthalten sind". Eine je Rolle, und jede kann etwas, das es sonst nicht
gibt (das steht in den Skripten):

* Kriegshammer, Ritter - aufgeladen ein Erdbeben: alles ringsum fliegt
  hoch.
* Frostzepter, Magier - aufgeladen eine Frostkugel: Wer getroffen wird,
  friert fast ein.
* Sturmbogen, Bogenschuetze - ein eigener Bogen; ein voll gespannter
  Schuss holt beim Einschlag einen Blitz herunter.
* Wurfsterne, Assassine - zum Werfen wie Schneebaelle, vergiften kurz.

Inventarbilder hoechstens 16 mal 16 (Fynns Regel: hoechstens 20).

    python3 werkzeuge/neue_waffen_bauen.py
"""

import copy
import json
import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import waffe_bauen as w                          # noqa: E402
from vorlagen import neue_waffen as v            # noqa: E402
from vorlagen import bogen                       # noqa: E402
from bogen_schild_bauen import hornspitzen       # noqa: E402
from dolche_bauen import schreibe, sprache, GRIFF_AUSSEN, GRIFF_ICH  # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

NAMEN = {
    "kriegshammer": ("Kriegshammer", "War Hammer"),
    "frostzepter": ("Frostzepter", "Frost Scepter"),
    "sturmbogen": ("Sturmbogen", "Storm Bow"),
    "wurfstern": ("Wurfstern", "Throwing Star"),
}

# ============================================================ Schraeg malen

def kontur(punkte, farbe_rand):
    """Umriss aussen herum, nur an den vier Seiten - bei 16 Pixeln
    macht ein Rand auch an den Ecken aus schraegen Linien Treppen."""
    rand = {}
    for (x, y) in punkte:
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            p = (x + dx, y + dy)
            if p not in punkte and 0 <= p[0] < 16 and 0 <= p[1] < 16:
                rand[p] = farbe_rand
    return rand


def bild_aus(punkte):
    b = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for (x, y), f in punkte.items():
        b.putpixel((x, y), tuple(f) + (255,))
    return b


def stiel(punkte, farben, von=(2, 13), laenge=8, griff=3):
    """Ein Stiel von unten links nach oben rechts, der Griff unten."""
    x, y = von
    for i in range(laenge):
        if i < griff:
            f = farben["griff"][i % 2]
        else:
            f = farben["stiel"][i % 2]
        punkte[(x + i, y - i)] = f
    return (x + laenge, y - laenge)          # wo der Kopf ansetzt


def hammer_symbol():
    f = v.KRIEGSHAMMER["farben"]
    punkte = {}
    stiel(punkte, {"griff": (f["R"], f["r"]), "stiel": (f["W"], f["w"])}, laenge=7)
    cx, cy = 11, 4
    for y in range(16):
        for x in range(16):
            laengs = (x - cx) - (y - cy)     # entlang des Stiels
            quer = (x - cx) + (y - cy)       # quer dazu: die Laenge des Kopfes
            if abs(laengs) <= 2 and abs(quer) <= 5:
                if abs(laengs) <= 1 and abs(quer) <= 1 and (laengs + quer) % 2 == 0:
                    punkte[(x, y)] = f["G"]              # die Rune
                elif quer <= -4 or laengs <= -2:
                    punkte[(x, y)] = f["L"]              # Licht oben links
                elif quer >= 4 or laengs >= 2:
                    punkte[(x, y)] = f["D"]
                else:
                    punkte[(x, y)] = f["M"]
    punkte[(14, 1)] = f["S"]                             # der Dorn
    punkte.update({p: c for p, c in kontur(punkte, (30, 32, 40)).items() if p not in punkte})
    return bild_aus(punkte)


def zepter_symbol():
    f = v.FROSTZEPTER["farben"]
    punkte = {}
    stiel(punkte, {"griff": (f["B"], f["b"]), "stiel": (f["V"], f["v"])}, laenge=7)
    cx, cy = 11, 4
    for y in range(16):
        for x in range(16):
            d = abs(x - cx) + abs(y - cy)
            if d <= 3:
                if d == 0:
                    punkte[(x, y)] = f["C"]
                elif (x - cx) + (y - cy) < 0:
                    punkte[(x, y)] = f["I"]
                else:
                    punkte[(x, y)] = f["i"]
    # Silberne Klauen, wo der Kristall auf dem Schaft sitzt
    for p in ((8, 5), (9, 7), (9, 6)):
        punkte[p] = f["S"]
    punkte[(15, 0)] = f["C"]                             # ein Funkeln
    punkte.update({p: c for p, c in kontur(punkte, (22, 34, 60)).items() if p not in punkte})
    return bild_aus(punkte)


def wurfstern_symbol():
    stahl = [(236, 240, 246), (196, 202, 212), (150, 156, 168), (104, 110, 122)]
    punkte = {}
    for y in range(16):
        for x in range(16):
            dx, dy = x - 7.5, y - 7.5
            klinge = abs(dx) + 3 * abs(dy) <= 8 or abs(dy) + 3 * abs(dx) <= 8
            loch = abs(dx) < 1 and abs(dy) < 1
            if klinge and not loch:
                # Licht von oben links, die Schneiden heller
                t = (dx + dy) / 8
                punkte[(x, y)] = stahl[0] if t < -0.5 else stahl[1] if t < 0 else stahl[2] if t < 0.5 else stahl[3]
    punkte.update({p: c for p, c in kontur(punkte, (30, 32, 40)).items() if p not in punkte})
    return bild_aus(punkte)


def frostkugel_bild():
    """Die Kugel im Flug: ein leuchtender Eisball, gut sichtbar."""
    b = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y in range(16):
        for x in range(16):
            d = math.hypot(x - 7.5, y - 7.5)
            if d <= 6:
                t = d / 6
                f = (240, 252, 255) if t < 0.35 else (170, 226, 255) if t < 0.7 else (96, 176, 238)
                b.putpixel((x, y), f + (255,))
    for p in ((5, 5), (6, 4), (10, 9)):
        b.putpixel(p, (255, 255, 255, 255))
    return b


# Der Sturmbogen: Form wie der Bogen, Farben eines Gewitters - dunkles
# Stahlblau, goldener Griff, Spitzen wie Blitze, eine blassblaue Sehne.
STURM = dict(bogen.FARBEN, **{
    "D": (40, 50, 84), "L": (112, 132, 184), "M": (72, 88, 134), "K": (24, 30, 54),
    "G": (246, 204, 80), "g": (180, 130, 34),
    "s": (176, 232, 255),
    "T": (255, 244, 130), "t": (232, 204, 64),
})


def sturmbogen_bild(karte):
    b = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(hornspitzen(karte)):
        for x, z in enumerate(zeile):
            if z != ".":
                b.putpixel((x, y), STURM[z] + (255,))
    return b


# ============================================================ 3D-Waffen

# Wie gross die 3D-Waffen aus Pixelbildern in der Hand sind. Frueher 0.37
# (aussen) und 0.28 (Ich-Ansicht) - dieselben Zahlen wie bei der Stahl-
# klinge. Nur ist deren Modell 63 Einheiten lang, ein Pixelbild-Schwert
# aber 24 (ein Pixel, eine Einheit): In der Hand war es nicht einmal halb
# so gross und steckte in der Faust. Fynn: "Der Dolch versinkt so ein
# bisschen in der Hand, der sollte groesser sein, das gilt auch fuer die
# anderen Modelle." Jetzt ist ein Pixelbild-Schwert von aussen gut einen
# Block lang - laenger als ein Dolch, kuerzer als die Stahlklinge.
GROESSE_AUSSEN = 0.75
GROESSE_ICH = 0.42


def griffversatz(karte, griffzeichen, aussen=GROESSE_AUSSEN, ich=GROESSE_ICH):
    """Wie weit der Griff verschoben wird, damit seine Mitte in der Faust
    sitzt. GRIFF_AUSSEN und GRIFF_ICH sind bei der alten Groesse (0.37 und
    0.28) gemessen; bei anderer Groesse wird umgerechnet, damit die Faust
    an derselben Stelle der Waffe bleibt."""
    zeilen = [i for i, z in enumerate(karte) if any(c in griffzeichen for c in z)]
    mitte = (zeilen[0] + zeilen[-1]) / 2
    y = len(karte) - 1 - mitte + 0.5 + (8 - len(karte) / 2)
    return GRIFF_AUSSEN * 0.37 / aussen - (y - 8), GRIFF_ICH * 0.28 / ich - (y - 8)


def halten(karte, griffzeichen):
    aussen, ich = griffversatz(karte, griffzeichen)
    return {"loop": True, "bones": {
        "waffe": {
            "position": ["c.is_first_person ? -3.5 : 0.0", "c.is_first_person ? -3.5 : -2.0", 0.0],
            "rotation": ["c.is_first_person ? 0.0 : 90.0", 0.0, "c.is_first_person ? -135.0 : 0.0"],
            "scale": f"c.is_first_person ? {GROESSE_ICH} : {GROESSE_AUSSEN}",
        },
        "griff": {
            "position": [0.0, f"c.is_first_person ? {ich:.2f} : {aussen:.2f}", 0.0],
            "rotation": [0.0, "c.is_first_person ? 0.0 : 90.0", 0.0],
        },
    }}


def waffen_attachable(name):
    return {"format_version": "1.10.0", "minecraft:attachable": {"description": {
        "identifier": f"fynn:{name}",
        "materials": {"default": "entity_alphatest", "enchanted": "entity_alphatest_glint"},
        "textures": {"default": f"textures/entity/{name}_haut", "enchanted": "textures/misc/enchanted_item_glint"},
        "geometry": {"default": f"geometry.{name}"},
        "animations": {"halten": f"animation.{name}.halten", "schlag": "animation.klinge.schlag"},
        "scripts": {"animate": ["halten", "schlag"]},
        "render_controllers": ["controller.render.item_default"],
    }}}


# ============================================================ Gegenstaende

def gegenstand(name, teile, gruppe="minecraft:itemGroup.name.sword", stapel=1):
    return {"format_version": "1.26.30", "minecraft:item": {
        "description": {"identifier": f"fynn:{name}",
                        "menu_category": {"category": "equipment", "group": gruppe}},
        "components": {"minecraft:icon": {"textures": {"default": name}},
                       "minecraft:max_stack_size": stapel, **teile}}}


def rezept(name, muster, schluessel, anzahl=1):
    return {"format_version": "1.20.10", "minecraft:recipe_shaped": {
        "description": {"identifier": f"fynn:{name}"}, "tags": ["crafting_table"],
        "pattern": muster, "key": {k: {"item": x} for k, x in schluessel.items()},
        "unlock": [{"item": next(iter(schluessel.values()))}],
        "result": {"item": f"fynn:{name}", "count": anzahl}}}


def geschoss(name, schaden, extra=None):
    """Ein Wurfgeschoss wie der Schneeball - fliegt mit Minecrafts eigener
    Geschossphysik, denn geworfen wird es ueber "throwable" am Gegenstand."""
    treffer = {
        "impact_damage": {"damage": schaden, "knockback": True},
        "remove_on_hit": {},
    }
    if extra:
        treffer.update(extra)
    return {"format_version": "1.21.90", "minecraft:entity": {
        "description": {"identifier": f"fynn:{name}", "is_spawnable": False, "is_summonable": True},
        "components": {
            "minecraft:type_family": {"family": ["projectile", name]},
            "minecraft:collision_box": {"width": 0.25, "height": 0.25},
            "minecraft:physics": {},
            "minecraft:projectile": {"anchor": "eye_height", "offset": [0, -0.1, 0],
                                     "on_hit": treffer, "gravity": 0.03, "power": 1.8},
            "minecraft:pushable_by_entity": {}, "minecraft:pushable_by_block": {},
        }}}


def sprite_aussehen(name, textur, groesse="1.0"):
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": f"fynn:{name}",
        "materials": {"default": "snowball"},
        "textures": {"default": textur},
        "geometry": {"default": "geometry.item_sprite"},
        "render_controllers": ["controller.render.item_sprite"],
        "animations": {"flying": "animation.actor.billboard"},
        "scripts": {"scale": groesse, "animate": ["flying"]},
    }}}


def frostkugel_verhalten():
    # Wie der Feuerball: Das Skript fuehrt sie, sie selbst hat keine
    # Geschossphysik (siehe main.js, warum).
    feuerball = json.loads((VER / "entities" / "feuerball.json").read_text(encoding="utf-8"))
    kugel = copy.deepcopy(feuerball)
    kugel["minecraft:entity"]["description"]["identifier"] = "fynn:frostkugel"
    kugel["minecraft:entity"]["components"]["minecraft:type_family"]["family"] = ["projectile", "frostkugel"]
    return kugel


def main():
    items = RES / "textures" / "items"
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    animationen = {}

    # --- Hammer und Zepter: 3D aus der Zeichnung
    for name, vorlage, symbol in (("kriegshammer", v.KRIEGSHAMMER, hammer_symbol),
                                  ("frostzepter", v.FROSTZEPTER, zepter_symbol)):
        tiefe = vorlage["tiefe"]
        w.aus_zeichenkarte(name, vorlage["karte"], {k: f + (255,) for k, f in vorlage["farben"].items()},
                           dicke=lambda zeile, spalte, zeichen, t=tiefe: t[zeichen],
                           mitte=vorlage["mitte"],
                           ziel_modell=str(RES / "models" / "entity" / f"{name}.geo.json"),
                           ziel_textur=str(RES / "textures" / "entity" / f"{name}_haut.png"))
        animationen[f"animation.{name}.halten"] = halten(vorlage["karte"], vorlage["griff"])
        schreibe(RES / "attachables" / f"{name}.json", waffen_attachable(name))
        symbol().save(items / f"{name}.png")

    schreibe(RES / "animations" / "neue_waffen.animation.json",
             {"format_version": "1.10.0", "animations": animationen})

    schreibe(VER / "items" / "kriegshammer.json", gegenstand("kriegshammer", {
        "minecraft:hand_equipped": True, "minecraft:damage": 9,
        "minecraft:durability": {"max_durability": 750},
        "minecraft:enchantable": {"value": 10, "slot": "sword"},
        "minecraft:repairable": {"repair_items": [{"items": ["fynn:stahlbarren"], "repair_amount": 180}]},
    }))
    schreibe(VER / "recipes" / "kriegshammer.json", rezept("kriegshammer", ["BBB", "BSB", " S "],
                                                           {"B": "fynn:stahlbarren", "S": "minecraft:stick"}))
    schreibe(VER / "items" / "frostzepter.json", gegenstand("frostzepter", {
        "minecraft:hand_equipped": True, "minecraft:damage": 5,
        "minecraft:durability": {"max_durability": 400},
        "minecraft:enchantable": {"value": 14, "slot": "sword"},
    }))
    schreibe(VER / "recipes" / "frostzepter.json", rezept("frostzepter", ["  D", " P ", "S  "],
                                                          {"D": "minecraft:diamond", "P": "minecraft:packed_ice",
                                                           "S": "fynn:silberbarren"}))
    frostkugel_bild().save(items / "frostkugel.png")
    schreibe(VER / "entities" / "frostkugel.json", frostkugel_verhalten())
    schreibe(RES / "entity" / "frostkugel.entity.json",
             sprite_aussehen("frostkugel", "textures/items/frostkugel", "1.1"))

    # --- Sturmbogen
    for name, karte in bogen.BILDER.items():
        ziel = "sturmbogen" if name == "bow_standby" else name.replace("bow", "sturmbogen")
        sturmbogen_bild(karte).save(items / f"{ziel}.png")
    # Das Attachable des Sturmbogens baut bogen_3d_bauen.py - mit dem
    # 3D-Bogen statt Minecrafts flachem Bildmodell.
    schreibe(VER / "items" / "sturmbogen.json", gegenstand("sturmbogen", {
        "minecraft:hand_equipped": True,
        "minecraft:durability": {"max_durability": 600},
        "minecraft:enchantable": {"value": 1, "slot": "bow"},
        "minecraft:use_modifiers": {"use_duration": 3600, "movement_modifier": 0.35},
        "minecraft:shooter": {
            "ammunition": [{"item": "minecraft:arrow", "use_offhand": True,
                            "search_inventory": True, "use_in_creative": True}],
            "max_draw_duration": 1.0, "scale_power_by_draw_duration": True, "charge_on_draw": False,
        },
    }, gruppe="minecraft:itemGroup.name.bow"))
    schreibe(VER / "recipes" / "sturmbogen.json", rezept("sturmbogen", [" CS", "E S", " CS"],
                                                         {"C": "minecraft:copper_ingot",
                                                          "E": "fynn:elektrumbarren", "S": "minecraft:string"}))

    # --- Wurfsterne
    wurfstern_symbol().save(items / "wurfstern.png")
    schreibe(VER / "items" / "wurfstern.json", gegenstand("wurfstern", {
        "minecraft:throwable": {"do_swing_animation": True, "launch_power_scale": 1.0, "max_launch_power": 1.0},
        "minecraft:projectile": {"projectile_entity": "fynn:wurfstern"},
    }, gruppe="minecraft:itemGroup.name.miscellaneous", stapel=16))
    schreibe(VER / "entities" / "wurfstern.json", geschoss("wurfstern", 5, {
        # Kurz vergiftet - die Klingen sind praepariert.
        "mob_effect": {"effect": "poison", "durationeasy": 40, "durationnormal": 60,
                       "durationhard": 80, "amplifier": 0},
    }))
    # Wie der Wurfstern aussieht - in der Hand und im Flug, beides in 3D -,
    # baut wurfstern_3d_bauen.py.
    schreibe(VER / "recipes" / "wurfstern.json", rezept("wurfstern", [" I ", "I I", " I "],
                                                        {"I": "minecraft:iron_nugget"}, anzahl=4))

    for name in ("kriegshammer", "frostzepter", "sturmbogen", "wurfstern", "frostkugel"):
        liste["texture_data"][name] = {"textures": f"textures/items/{name}"}
    liste_pfad.write_text(json.dumps(liste, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    de = [(f"item.fynn:{n}", d) for n, (d, _) in NAMEN.items()] + [(f"item.fynn:{n}.name", d) for n, (d, _) in NAMEN.items()]
    en = [(f"item.fynn:{n}", e) for n, (_, e) in NAMEN.items()] + [(f"item.fynn:{n}.name", e) for n, (_, e) in NAMEN.items()]
    de += [("entity.fynn:frostkugel.name", "Frostkugel"), ("entity.fynn:wurfstern.name", "Wurfstern")]
    en += [("entity.fynn:frostkugel.name", "Frost Orb"), ("entity.fynn:wurfstern.name", "Throwing Star")]
    sprache(RES / "texts" / "de_DE.lang", de)
    sprache(RES / "texts" / "en_US.lang", en)
    print("gebaut: Kriegshammer, Frostzepter, Sturmbogen, Wurfsterne, Frostkugel")


if __name__ == "__main__":
    main()
