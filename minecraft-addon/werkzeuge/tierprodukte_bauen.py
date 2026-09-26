#!/usr/bin/env python3
"""Was die Tiere hergeben - und was man daraus macht.

Fynn: "Fleisch, was speziell gepixelt ist, eine spezielle Textur hat. Neues
Essen, was man mit denen machen kann. Man kann das Fleisch auf jeden Fall
auch braten ... Items, die man craften kann aus den Sachen, was sie
droppen koennen ... Drops mit unterschiedlicher Seltenheit."

Drei Sorten Gegenstaende:

* Fleisch, roh und gebraten - jedes Tier mit eigener Form: der Baer als
  dicker Brocken, der Elch als Medaillon mit Fettrand, das Wildschwein als
  Keule, der Bison als T-Bone, das Krokodil als Schwanzstueck mit Schuppen,
  der Hai als Scheibe, der Schwertfisch als Filet, der Kalmar als Fangarm
  - und gebraten als Calamari-Ringe.
* Beute: Felle, Krallen, Zaehne, Horn, Geweih, Barten, Ambra, Kalmarauge.
  Die Seltenheit steht am Namen (Minecrafts Farben: gelb ungewoehnlich,
  hellblau selten, violett episch) und in der Beuteliste (tiere_bauen.py).
* Gefertigtes: Gerichte, Talismane, Jaegerkette, Jagdhorn,
  Schwertfischklinge, Trank der Tiefe. Was davon mehr kann als ein
  Gegenstand von sich aus, macht verhaltenspaket/scripts/tiere.js.

Die Bilder werden aus den Umrissen in vorlagen/tierformen.py gemalt: Umriss
dunkel, Licht von oben links, keine Koernung - wie Minecrafts eigene.

    python3 werkzeuge/tierprodukte_bauen.py [--bilder ORDNER]
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from vorlagen.tierformen import FORMEN          # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"


def hexfarbe(t):
    t = t.lstrip("#")
    return tuple(int(t[i:i + 2], 16) for i in (0, 2, 4))


def heller(c, t):
    return tuple(int(round(v + (255 - v) * t)) for v in c)


def dunkler(c, t):
    return tuple(int(round(v * (1 - t))) for v in c)


# ------------------------------------------------------------ Malen

def male(form, farben, muster=None, glanz=False, fell=False):
    """Malt einen Umriss aus vorlagen/tierformen.py.

    Zweite Fassung (Fynn: "mehr Detail in die Items"): Jede Flaeche hat
    Volumen - von oben links nach unten rechts in drei sanften Stufen
    dunkler, der Umriss dunkel und je Seite verschieden, dazu wahlweise
    ein Glanzstreif (rohes Fleisch, Zaehne, Horn) oder Fellstriche."""
    zeilen = FORMEN[form]
    assert len(zeilen) == 16 and all(len(z) == 16 for z in zeilen), form
    bild = Image.new("RGBA", (16, 16), (0, 0, 0, 0))

    def da(x, y):
        return 0 <= x < 16 and 0 <= y < 16 and zeilen[y][x] != "."

    punkte = [(x, y) for y in range(16) for x in range(16) if da(x, y)]
    if not punkte:
        return bild
    x0 = min(p[0] for p in punkte)
    y0 = min(p[1] for p in punkte)
    spanne = max(1, max(p[0] + p[1] for p in punkte) - (x0 + y0))
    # Der Glanz: ein kurzer schraeger Strich ein Stueck innen oben links.
    glanzpunkte = set()
    if glanz:
        innen = [p for p in punkte if all(da(p[0] + dx, p[1] + dy) for dx in (-1, 0, 1) for dy in (-1, 0, 1))]
        if innen:
            start = min(innen, key=lambda p: p[0] + p[1] * 1.2)
            for i in range(3):
                q = (start[0] + 1 + i, start[1] + 1 - (i // 2))
                if q in innen:
                    glanzpunkte.add(q)

    for x, y in punkte:
        z = zeilen[y][x]
        if muster and z == "#":
            z = muster(x, y) or z
        if z == "w":
            bild.putpixel((x, y), hexfarbe(farben.get("w", "#ffffff")) + (255,))
            continue
        if z == "e":
            # Ohne Farbe bleibt ein Loch - die Mitte der Calamari-Ringe.
            if farben.get("e", "#1a1210"):
                bild.putpixel((x, y), hexfarbe(farben.get("e", "#1a1210")) + (255,))
            continue
        # Pfoten ('g') ohne eigene Farbe: etwas dunkler als das Fell.
        grund = hexfarbe(farben[z]) if z in farben else (
            dunkler(hexfarbe(farben["#"]), 0.3) if z == "g" else hexfarbe(farben["#"]))
        oben, links, unten, rechts = da(x, y - 1), da(x - 1, y), da(x, y + 1), da(x + 1, y)
        duenn = (not links and not rechts) or (not oben and not unten)
        # Volumen: je weiter unten rechts, desto dunkler, in drei Stufen.
        lage = ((x + y) - (x0 + y0)) / spanne
        c = heller(grund, 0.12) if lage < 0.3 else (grund if lage < 0.65 else dunkler(grund, 0.1))
        if duenn:
            c = grund
        elif not unten or not rechts:
            c = dunkler(grund, 0.45)            # Umriss unten rechts
        elif not oben or not links:
            c = dunkler(grund, 0.3)             # Umriss oben links
        elif not da(x - 1, y - 1) or not da(x, y - 2) or not da(x - 2, y):
            c = heller(c, 0.18)                 # Licht an der oberen Kante
        elif not da(x + 1, y + 1) or not da(x, y + 2):
            c = dunkler(c, 0.14)                # Schatten unten
        elif fell and z == "#" and (x * 2 + y) % 4 == 0:
            c = dunkler(c, 0.12)                # Fellstriche
        elif fell and z == "#" and (x * 2 + y) % 4 == 2 and (x + y) % 3 == 0:
            c = heller(c, 0.1)
        if (x, y) in glanzpunkte:
            c = heller(c, 0.45)
        bild.putpixel((x, y), c + (255,))
    return bild


def streifen(abstand, dicke=1, versatz=0):
    return lambda x, y: "f" if (x + y + versatz) % abstand < dicke else None


def flecken(x, y):
    return "f" if (x * 7 + y * 13) % 11 in (0, 5) else None


# ------------------------------------------------------------ Die Gegenstaende
#
# Fleisch: (Kennung roh, Name roh, Kennung gebraten, Name gebraten, Form roh,
#           Form gebraten, Farben roh, Farben gebraten, Naehrwert roh/gebraten)

ROH = {"#": "#b8343a", "f": "#f0d8d0", "s": "#f2e4d8", "b": "#e8e0cc"}
GAR = {"#": "#8a4e2c", "f": "#4a2614", "s": "#c89a64", "b": "#d8ceb4"}

FLEISCH = [
    ("baerenfleisch", ("Rohes Bärenfleisch", "Raw Bear Meat"), "baerenbraten", ("Bärenbraten", "Bear Roast"),
     "brocken", "brocken", dict(ROH, **{"#": "#8e2228"}), dict(GAR, **{"#": "#6e3a20"}), (3, 9)),
    ("elchfleisch", ("Rohes Elchfleisch", "Raw Moose Meat"), "elchsteak", ("Elchsteak", "Moose Steak"),
     "medaillon", "medaillon", dict(ROH, **{"#": "#a4262e"}), GAR, (3, 8)),
    ("wildschweinfleisch", ("Rohe Wildschweinkeule", "Raw Boar Leg"), "wildschweinbraten",
     ("Wildschweinbraten", "Boar Roast"), "keule", "keule", dict(ROH, **{"#": "#c65a5a"}),
     dict(GAR, **{"#": "#9a5a30"}), (3, 8)),
    ("bisonfleisch", ("Rohes Bisonfleisch", "Raw Bison Meat"), "bisonsteak", ("Bison-T-Bone", "Bison T-Bone"),
     "steak", "steak", ROH, dict(GAR, **{"#": "#7e4426"}), (3, 9)),
    ("krokodilfleisch", ("Rohes Krokodilfleisch", "Raw Crocodile Meat"), "krokodilsteak",
     ("Gegrilltes Krokodil", "Grilled Crocodile"), "schwanzstueck", "schwanzstueck",
     dict(ROH, **{"#": "#e0b0a0", "s": "#4e5e30", "f": "#f4e0d8"}), dict(GAR, **{"#": "#c08650", "s": "#3a4222"}),
     (2, 7)),
    ("haifleisch", ("Rohes Haifleisch", "Raw Shark Meat"), "haisteak", ("Haisteak", "Shark Steak"),
     "fischscheibe", "fischscheibe", dict(ROH, **{"#": "#ecc8c0", "f": "#d8a8a0", "s": "#6e7a84"}),
     dict(GAR, **{"#": "#d8b080", "f": "#a07448", "s": "#5a5048"}), (2, 7)),
    ("schwertfischfilet", ("Rohes Schwertfischfilet", "Raw Swordfish Fillet"), "schwertfischsteak",
     ("Gegrillter Schwertfisch", "Grilled Swordfish"), "filet", "filet",
     dict(ROH, **{"#": "#f0b8a8", "f": "#fae6de"}), dict(GAR, **{"#": "#d49a5c", "f": "#8a5a30"}), (2, 7)),
    ("kalmarfleisch", ("Rohes Kalmarfleisch", "Raw Squid Meat"), "calamari", ("Calamari", "Calamari"),
     "fangarm", "ringe", {"#": "#e0a0a8", "f": "#f8e0e4"}, {"#": "#e0a848", "e": None}, (1, 6)),
]

# Beute: (Kennung, Namen, Form, Farben, Muster, Seltenheit)
BEUTE = [
    ("baerenfell", ("Bärenfell", "Bear Pelt"), "fell", {"#": "#7a4e2c"}, None, "uncommon"),
    ("baerenkralle", ("Bärenkralle", "Bear Claw"), "kralle", {"#": "#3a302a", "w": "#8a7e74"}, None, "rare"),
    ("elchgeweih", ("Elchgeweih", "Moose Antler"), "geweih", {"#": "#d8c8a0", "s": "#8a7458"}, None, "rare"),
    ("wildschweinhauer", ("Wildschweinhauer", "Boar Tusk"), "hauer", {"#": "#eee6d2", "s": "#6a5040"}, None,
     "rare"),
    ("bisonfell", ("Bisonfell", "Bison Hide"), "fell", {"#": "#4e3322"}, None, "uncommon"),
    ("bisonhorn", ("Bisonhorn", "Bison Horn"), "horn", {"#": "#2e2a26", "s": "#6a5a48"}, None, "rare"),
    ("loewenfell", ("Löwenfell", "Lion Pelt"), "fell", {"#": "#d0a060", "f": "#8a5a2a"},
     lambda x, y: "f" if y <= 2 else None, "uncommon"),
    # Der Loewenzahn - ein Zahn vom Loewen, und doch ein bisschen Blume:
    # ein gelber Tupfer an der Wurzel.
    ("loewenzahn", ("Löwenzahn", "Lion Fang"), "zahn", {"#": "#f2ead8", "e": "#f0c820"},
     lambda x, y: "e" if y == 2 and 5 <= x <= 10 else None, "rare"),
    ("tigerfell", ("Tigerfell", "Tiger Pelt"), "fell", {"#": "#e8923a", "f": "#1c1410"}, streifen(4), "uncommon"),
    ("tigerkralle", ("Tigerkralle", "Tiger Claw"), "kralle", {"#": "#e8e0cc", "w": "#ffffff"}, None, "rare"),
    ("schneeleopardenfell", ("Schneeleopardenfell", "Snow Leopard Pelt"), "fell", {"#": "#e0e0da", "f": "#4a4844"},
     flecken, "rare"),
    ("krokodilleder", ("Krokodilleder", "Crocodile Leather"), "fell", {"#": "#56663a", "f": "#3a4424"},
     lambda x, y: "f" if (x % 3 == 0 or y % 3 == 0) else None, "uncommon"),
    ("krokodilzahn", ("Krokodilzahn", "Crocodile Tooth"), "zahn", {"#": "#e8e2c8"}, None, "rare"),
    ("walbarte", ("Walbarte", "Baleen"), "barte", {"#": "#6a6458", "s": "#9a9080"}, None, "common"),
    ("ambra", ("Ambra", "Ambergris"), "ambra", {"#": "#b4ac98", "f": "#8a8474", "w": "#e8e4d8"}, None, "epic"),
    ("haizahn", ("Haizahn", "Shark Tooth"), "haizahn", {"#": "#f4f0e4", "s": "#c8b89a"}, None, "rare"),
    ("haihaut", ("Haihaut", "Shark Skin"), "fell", {"#": "#7c8a94", "f": "#eef0f0"},
     lambda x, y: "f" if y >= 9 else None, "uncommon"),
    ("kalmarauge", ("Riesenkalmarauge", "Giant Squid Eye"), "auge",
     {"#": "#e8e0d0", "s": "#4a6ab0", "e": "#050608", "w": "#ffffff"}, None, "epic"),
    ("schwertfischspiess", ("Schwertfisch-Schwert", "Swordfish Bill"), "spitze", {"#": "#3a3440", "s": "#6a6070",
                                                                                   "w": "#9a94a4"}, None, "rare"),
]

# Talismane: wer einen in der Schnellleiste traegt, bekommt die Kraft des
# Tiers (tiere.js).
TALISMANE = [
    ("baerentalisman", ("Bärentalisman", "Bear Talisman"), "baerenkralle", "#3a302a", "Stärke",
     "Strength"),
    ("loewentalisman", ("Löwentalisman", "Lion Talisman"), "loewenzahn", "#f2ead8", "Widerstand",
     "Resistance"),
    ("tigertalisman", ("Tigertalisman", "Tiger Talisman"), "tigerkralle", "#e8923a", "Schnelligkeit",
     "Speed"),
    ("haitalisman", ("Haitalisman", "Shark Talisman"), "haizahn", "#f4f0e4", "Unterwasserkraft",
     "Conduit Power"),
    ("elchtalisman", ("Elchtalisman", "Moose Talisman"), "elchgeweih", "#d8c8a0", "Sprungkraft",
     "Jump Boost"),
]

GERICHTE = [
    # (Kennung, Namen, Form, Farben, Naehrwert, Saettigung, wird zu)
    ("wildeintopf", ("Wildeintopf", "Game Stew"), "eintopf",
     {"#": "#8a4a24", "f": "#d88a30", "g": "#e0c070", "s": "#8a6a44"}, 14, 1.0, "minecraft:bowl"),
    ("bisonburger", ("Bisonburger", "Bison Burger"), "burger",
     {"#": "#d8a050", "w": "#f8f0dc", "g": "#6aa83a", "f": "#e8c030", "s": "#6e3a20"}, 12, 0.9, None),
    ("jaegerspiess", ("Jägerspieß", "Hunter's Skewer"), "spiess",
     {"#": "#9a5a30", "s": "#6e3a20", "g": "#b0703a", "b": "#a88458"}, 12, 0.8, "minecraft:stick"),
    ("sushi", ("Schwertfisch-Sushi", "Swordfish Sushi"), "sushi",
     {"#": "#f8f4ec", "s": "#2a3a24", "w": "#f0a898", "f": "#f8d8d0"}, 7, 0.7, None),
    ("honigbraten", ("Honigbraten", "Honey Roast"), "honigbraten",
     {"#": "#7a4020", "g": "#f0a818", "w": "#fbe07a"}, 11, 1.0, None),
]


# ------------------------------------------------------------ Dateien

def schreibe(pfad, daten):
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def gegenstand(kennung, komponenten, kategorie="items", gruppe=None):
    beschreibung = {"identifier": f"fynn:{kennung}", "menu_category": {"category": kategorie}}
    if gruppe:
        beschreibung["menu_category"]["group"] = gruppe
    k = {"minecraft:icon": {"textures": {"default": kennung}}}
    k.update(komponenten)
    return {"format_version": "1.26.30", "minecraft:item": {"description": beschreibung, "components": k}}


def essen(naehrwert, saettigung, wird_zu=None, immer=False, trinken=False, dauer=1.6, stapel=64):
    f = {"nutrition": naehrwert, "saturation_modifier": saettigung}
    if wird_zu:
        f["using_converts_to"] = wird_zu
    if immer:
        f["can_always_eat"] = True
    return {"minecraft:food": f, "minecraft:use_modifiers": {"use_duration": dauer, "movement_modifier": 0.35},
            "minecraft:use_animation": "drink" if trinken else "eat", "minecraft:max_stack_size": stapel}


def ofenrezept(roh, gar):
    return {"format_version": "1.12", "minecraft:recipe_furnace": {
        "description": {"identifier": f"fynn:{gar}_braten"},
        "tags": ["furnace", "smoker", "campfire", "soul_campfire"],
        "input": f"fynn:{roh}", "output": f"fynn:{gar}"}}


def formlos(name, zutaten, ergebnis, anzahl=1):
    return {"format_version": "1.12", "minecraft:recipe_shapeless": {
        "description": {"identifier": f"fynn:{name}"},
        "tags": ["crafting_table"],
        "ingredients": [{"item": z} for z in zutaten],
        "unlock": [{"item": zutaten[0]}],
        "result": {"item": ergebnis, "count": anzahl}}}


def geformt(name, muster, schluessel, ergebnis, anzahl=1):
    return {"format_version": "1.12", "minecraft:recipe_shaped": {
        "description": {"identifier": f"fynn:{name}"},
        "tags": ["crafting_table"],
        "pattern": muster,
        "key": {k: {"item": v} for k, v in schluessel.items()},
        "unlock": [{"item": next(iter(schluessel.values()))}],
        "result": {"item": ergebnis, "count": anzahl}}}


def alles():
    """Liefert (Gegenstaende, Bilder, Rezepte, Namen)."""
    teile, bilder, rezepte, namen = {}, {}, {}, []

    namen.append("## Tierfleisch")
    for roh, rn, gar, gn, froh, fgar, froh_c, fgar_c, (nr, ng) in FLEISCH:
        teile[roh] = gegenstand(roh, essen(nr, 0.3), "items", "minecraft:itemGroup.name.miscFood")
        teile[gar] = gegenstand(gar, essen(ng, 0.8), "items", "minecraft:itemGroup.name.miscFood")
        bilder[roh] = male(froh, froh_c, glanz=True)
        bilder[gar] = male(fgar, fgar_c)
        rezepte[f"{gar}_braten"] = ofenrezept(roh, gar)
        namen += [(roh, rn), (gar, gn)]

    namen.append("## Gerichte")
    for k, n, form, farben, nw, sat, wird_zu in GERICHTE:
        stapel = 1 if wird_zu == "minecraft:bowl" else 16
        teile[k] = gegenstand(k, essen(nw, sat, wird_zu, stapel=stapel), "items", "minecraft:itemGroup.name.miscFood")
        bilder[k] = male(form, farben)
        namen.append((k, n))
    for braten in ("baerenbraten", "elchsteak", "wildschweinbraten", "bisonsteak"):
        rezepte[f"wildeintopf_{braten}"] = formlos(
            f"wildeintopf_{braten}", ["minecraft:bowl", f"fynn:{braten}", "minecraft:carrot", "minecraft:potato",
                                     "minecraft:brown_mushroom"], "fynn:wildeintopf")
    rezepte["bisonburger"] = geformt("bisonburger", [" B ", "RSR", " B "],
                                     {"B": "minecraft:bread", "S": "fynn:bisonsteak", "R": "minecraft:beetroot"},
                                     "fynn:bisonburger", 2)
    rezepte["jaegerspiess"] = formlos("jaegerspiess", ["minecraft:stick", "fynn:wildschweinbraten", "fynn:elchsteak",
                                                       "minecraft:baked_potato"], "fynn:jaegerspiess", 2)
    rezepte["sushi"] = formlos("sushi", ["fynn:schwertfischfilet", "minecraft:dried_kelp", "minecraft:dried_kelp"],
                               "fynn:sushi", 3)
    rezepte["honigbraten"] = formlos("honigbraten", ["fynn:baerenbraten", "minecraft:honey_bottle"],
                                     "fynn:honigbraten")

    namen.append("## Was die Tiere hergeben")
    for k, n, form, farben, muster, selten in BEUTE:
        teile[k] = gegenstand(k, {"minecraft:max_stack_size": 64, "minecraft:rarity": selten})
        bilder[k] = male(form, farben, muster, glanz=form in ("zahn", "haizahn", "hauer", "horn", "ambra", "kralle"),
                         fell=form == "fell" and k not in ("krokodilleder", "haihaut"))
        namen.append((k, n))
    for fell, anzahl in (("baerenfell", 3), ("bisonfell", 3), ("loewenfell", 2), ("tigerfell", 2),
                         ("schneeleopardenfell", 2), ("krokodilleder", 2), ("haihaut", 1)):
        rezepte[f"leder_aus_{fell}"] = formlos(f"leder_aus_{fell}", [f"fynn:{fell}"], "minecraft:leather", anzahl)
    rezepte["knochenmehl_aus_walbarte"] = formlos("knochenmehl_aus_walbarte", ["fynn:walbarte"],
                                                  "minecraft:bone_meal", 4)

    namen.append("## Talismane und Jagdzeug")
    for k, n, zutat, farbe, kraft_de, kraft_en in TALISMANE:
        teile[k] = gegenstand(k, {"minecraft:max_stack_size": 1, "minecraft:rarity": "rare", "minecraft:glint": True},
                              "equipment", None)
        bilder[k] = male("talisman", {"#": farbe, "s": "#8a6a44", "g": "#e0b030", "w": "#ffffff"})
        rezepte[k] = geformt(k, [" S ", "S S", " T "], {"S": "minecraft:string", "T": f"fynn:{zutat}"}, f"fynn:{k}")
        namen.append((k, n))
    teile["jaegerkette"] = gegenstand("jaegerkette", {"minecraft:max_stack_size": 1, "minecraft:rarity": "epic",
                                                      "minecraft:glint": True}, "equipment")
    bilder["jaegerkette"] = male("kette", {"#": "#eee6d2", "s": "#8a6a44", "g": "#e0b030", "w": "#ffffff"})
    rezepte["jaegerkette"] = formlos("jaegerkette", ["minecraft:string", "fynn:wildschweinhauer", "fynn:krokodilzahn",
                                                     "fynn:haizahn", "minecraft:gold_nugget"], "fynn:jaegerkette")
    namen.append(("jaegerkette", ("Jägerkette", "Hunter's Necklace")))
    teile["jagdhorn"] = gegenstand("jagdhorn", {"minecraft:max_stack_size": 1, "minecraft:rarity": "rare",
                                                "minecraft:use_modifiers": {"use_duration": 0.1}},
                                   "equipment")
    bilder["jagdhorn"] = male("jagdhorn", {"#": "#3a342c", "s": "#8a5a34", "g": "#e0b030"})
    rezepte["jagdhorn"] = formlos("jagdhorn", ["fynn:bisonhorn", "minecraft:leather", "minecraft:gold_ingot"],
                                  "fynn:jagdhorn")
    namen.append(("jagdhorn", ("Jagdhorn", "Hunting Horn")))
    teile["schwertfischklinge"] = gegenstand("schwertfischklinge", {
        "minecraft:max_stack_size": 1, "minecraft:hand_equipped": True, "minecraft:damage": 7,
        "minecraft:rarity": "rare",
        "minecraft:durability": {"max_durability": 640},
        "minecraft:enchantable": {"value": 14, "slot": "sword"},
        "minecraft:repairable": {"repair_items": [{"items": ["fynn:schwertfischspiess"], "repair_amount": 320}]},
    }, "equipment", "minecraft:itemGroup.name.sword")
    bilder["schwertfischklinge"] = male("klinge", {"#": "#3a3440", "w": "#9a94a4", "g": "#e0b030", "s": "#6e4a2c"})
    rezepte["schwertfischklinge"] = geformt("schwertfischklinge", ["P", "L", "S"],
                                            {"P": "fynn:schwertfischspiess", "L": "minecraft:leather",
                                             "S": "minecraft:stick"}, "fynn:schwertfischklinge")
    namen.append(("schwertfischklinge", ("Schwertfischklinge", "Swordfish Blade")))
    teile["trank_der_tiefe"] = gegenstand("trank_der_tiefe", dict(
        essen(0, 0.0, "minecraft:glass_bottle", immer=True, trinken=True, stapel=16),
        **{"minecraft:rarity": "epic", "minecraft:glint": True}), "items")
    bilder["trank_der_tiefe"] = male("trank", {"#": "#1e4aa8", "w": "#9ae8ff", "s": "#8a6a44", "g": "#c8d8e0"})
    rezepte["trank_der_tiefe"] = formlos("trank_der_tiefe", ["minecraft:glass_bottle", "fynn:kalmarauge", "fynn:ambra",
                                                             "minecraft:prismarine_crystals"], "fynn:trank_der_tiefe")
    namen.append(("trank_der_tiefe", ("Trank der Tiefe", "Potion of the Deep")))
    return teile, bilder, rezepte, namen


def klinge_3d():
    """Die Schwertfischklinge als 3D-Waffe, wie Kriegshammer und Frostzepter."""
    import waffe_bauen as w
    from neue_waffen_bauen import halten, waffen_attachable
    from vorlagen.tierwaffen import SCHWERTFISCHKLINGE as v
    name = "schwertfischklinge"
    w.aus_zeichenkarte(name, v["karte"], {k: f + (255,) for k, f in v["farben"].items()},
                       dicke=lambda zeile, spalte, zeichen, t=v["tiefe"]: t[zeichen], mitte=v["mitte"],
                       ziel_modell=str(RES / "models" / "entity" / f"{name}.geo.json"),
                       ziel_textur=str(RES / "textures" / "entity" / f"{name}_haut.png"))
    schreibe(RES / "attachables" / f"{name}.json", waffen_attachable(name))
    schreibe(RES / "animations" / "tierwaffen.animation.json",
             {"format_version": "1.10.0", "animations": {f"animation.{name}.halten": halten(v["karte"], v["griff"])}})


def sprache(namen):
    for datei, i in (("de_DE.lang", 0), ("en_US.lang", 1)):
        pfad = RES / "texts" / datei
        alt = pfad.read_text(encoding="utf-8").splitlines()
        eigene = {f"item.fynn:{k}" for k, _ in (n for n in namen if isinstance(n, tuple))}
        ueberschriften = {n for n in namen if isinstance(n, str)}
        zeilen = [z for z in alt if z.split("=")[0].replace(".name", "") not in eigene and z not in ueberschriften]
        while zeilen and not zeilen[-1].strip():
            zeilen.pop()
        for n in namen:
            if isinstance(n, str):
                zeilen += ["", n]
            else:
                k, name = n
                zeilen += [f"item.fynn:{k}={name[i]}", f"item.fynn:{k}.name={name[i]}"]
        pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def main():
    teile, bilder, rezepte, namen = alles()
    zuordnung_pfad = RES / "textures" / "item_texture.json"
    zuordnung = json.loads(zuordnung_pfad.read_text(encoding="utf-8"))
    for k, daten in teile.items():
        schreibe(VER / "items" / f"{k}.json", daten)
        ziel = RES / "textures" / "items" / "tiere" / f"{k}.png"
        ziel.parent.mkdir(parents=True, exist_ok=True)
        bilder[k].save(ziel)
        zuordnung["texture_data"][k] = {"textures": f"textures/items/tiere/{k}"}
    schreibe(zuordnung_pfad, zuordnung)
    for name, daten in rezepte.items():
        schreibe(VER / "recipes" / f"tier_{name}.json", daten)
    sprache(namen)
    klinge_3d()
    print(f"gebaut: {len(teile)} Gegenstaende, {len(rezepte)} Rezepte, Schwertfischklinge in 3D")
    if "--bilder" in sys.argv:
        ordner = Path(sys.argv[sys.argv.index("--bilder") + 1])
        ordner.mkdir(parents=True, exist_ok=True)
        spalten = 8
        liste = list(bilder.items())
        bogen = Image.new("RGBA", (spalten * 80, ((len(liste) + spalten - 1) // spalten) * 80), (60, 60, 66, 255))
        for i, (k, b) in enumerate(liste):
            bogen.paste(b.resize((64, 64), Image.NEAREST), ((i % spalten) * 80 + 8, (i // spalten) * 80 + 8),
                        b.resize((64, 64), Image.NEAREST))
        bogen.save(ordner / "tierprodukte.png")
        print("gezeichnet:", ordner / "tierprodukte.png")


if __name__ == "__main__":
    main()
