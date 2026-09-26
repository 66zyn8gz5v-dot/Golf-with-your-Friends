#!/usr/bin/env python3
"""Baut die Dolchpaare des Assassinen - sechs Sorten aus einer Vorlage.

Je Sorte entsteht alles, was ein Gegenstand braucht: Inventarbild,
3D-Modell mit Haut, Attachable, Gegenstand, Rezept und die Namen. Die
Sorten stehen in vorlagen/dolche.py; wer eine neue will, traegt sie dort
ein und laesst dieses Werkzeug noch einmal laufen.

Zwei Dolche, ein Gegenstand: Bedrock hat keine richtige zweite Hand fuer
eigene Waffen. Darum ist das Paar ein einziger Gegenstand, und sein
Modell traegt zwei Dolche. Der eine haengt am rechten Handknochen, wie
jede Waffe; der andere an "leftitem", dem Knochen der linken Hand. Das
geht, weil ein Attachable seine Knochen ueber den Namen an den Traeger
bindet - dasselbe, womit die Ritterruestung an Armen und Beinen sitzt.

In der Ich-Ansicht zeigt Minecraft keinen linken Arm, und "leftitem" liegt
dort irgendwo hinter der Kamera. Der linke Dolch der Ich-Ansicht ist darum
eine dritte Kette, gebunden an "body" - der Koerper dreht sich in der
Ich-Ansicht mit dem Blick, er steht also fest vor der Kamera. Dort sitzt
der linke Dolch spiegelbildlich zum rechten, unten links im Bild. Wo genau,
wird nicht geschaetzt, sondern aus dem rechten gerechnet (links_ich).

Was nicht hier steht: dass die Zweithand leer bleibt, solange man die
Dolche haelt. Das macht das Skript (dolche.js).

    python3 werkzeuge/dolche_bauen.py
"""

import copy
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import waffe_bauen as w                 # noqa: E402
from vorlagen import dolche as v        # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

# Tiefe je Teil: die Klinge flach, Parierstange und Knauf wuchtig, der
# einen Pixel breite Griff anderthalb tief, damit er rund wirkt.
TIEFE = {"L": 1.0, "M": 1.0, "S": 1.0, "G": 2.0, "g": 2.0,
         "W": 1.5, "w": 1.5, "P": 2.0, "p": 2.0}

# Wo der Griff sitzt, gemessen an der Stahlklinge: Deren Griffmitte liegt
# in der Aussenansicht 4.5 Einheiten, in der Ich-Ansicht 22 Einheiten
# unter dem Drehpunkt der Waffe. Die Dolche verschieben ihren Griff
# dorthin, damit sie genauso in der Hand liegen. Siehe griffversatz().
GRIFF_AUSSEN = -4.5
GRIFF_ICH = -22.0

# Wie gross die Dolche in der Hand sind. Mit der Groesse der Schwerter
# (0.37 und 0.28) waren sie sieben Pixel lang, zwei davon Griff: Von vorn
# sah man nur den Knauf, und Fynn schrieb, sie "stecken noch in der Hand".
# Jetzt etwa halb so lang wie ein Schwert, wie ein Dolch eben ist.
GROESSE_AUSSEN = 0.55
GROESSE_ICH = 0.40
# Von aussen zeigt die Klinge nicht waagerecht nach vorn, sondern schraeg
# nach oben - so sieht man sie auch von vorn.
KIPPEN_AUSSEN = 40.0
# In der Ich-Ansicht: rechts sitzt die Parierstange knapp ueber der Faust
# (nachgesehen mit spieler_ansehen - tiefer verschwindet der Dolch hinter
# der Hand). Links gibt es keine Hand; dort liegt der Dolch tiefer, damit
# sein Griff unten aus dem Bild laeuft, statt frei in der Luft zu enden.
ICH_VERSATZ_RECHTS = 0.0


def griffmitte(karte):
    """Hoehe der Griffmitte im Modell, samt Knauf - wie bei den Schwertern."""
    griff = [i for i, z in enumerate(karte) if set(z) - set(".") <= set("WwPp") and z.strip(".")]
    mitte = (griff[0] + griff[-1]) / 2
    # Bildzeilen zaehlen von oben; aus_zeichenkarte setzt die Mitte des
    # Bilds auf die Hoehe 8.
    return len(karte) - 1 - mitte + 0.5 + (8 - len(karte) / 2)


def griffversatz(karte):
    y = griffmitte(karte)
    return GRIFF_AUSSEN - (y - 8), GRIFF_ICH - (y - 8)


def dolch_griffversatz(karte):
    """Wie griffversatz, aber fuer die groesseren Dolche: Der Versatz liegt
    im verkleinerten Knochen, also muss er mit der Groesse umgerechnet
    werden, damit die Griffmitte an derselben Stelle der Faust bleibt."""
    y = griffmitte(karte)
    return (GRIFF_AUSSEN * 0.37 / GROESSE_AUSSEN - (y - 8),
            GRIFF_ICH * 0.28 / GROESSE_ICH - (y - 8))


def mit_linker_hand(modell):
    """Haengt eine Kopie der Knochenkette an die linke Hand."""
    geo = modell["minecraft:geometry"][0]
    rechts = geo["bones"]
    links = []
    for knochen in rechts:
        neu = copy.deepcopy(knochen)
        if neu["name"] == "rightitem":
            neu["name"] = "leftitem"
            neu["binding"] = "'leftitem'"
        else:
            neu["name"] += "_l"
            neu["parent"] = "leftitem" if neu["parent"] == "rightitem" else neu["parent"] + "_l"
        links.append(neu)
    # Die dritte Kette fuer die Ich-Ansicht, am Koerper.
    griff = next(k for k in rechts if k["name"] == "griff")
    ich = [{"name": "links_ich", "binding": "'body'", "pivot": [0, 8, 0]},
           {"name": "griff_li", "parent": "links_ich", "pivot": [0, 8, 0],
            "cubes": copy.deepcopy(griff["cubes"])}]
    geo["bones"] = rechts + links + ich
    return modell


def symbol(farben):
    bild = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(v.SYMBOL):
        for x, z in enumerate(zeile):
            if z != ".":
                bild.putpixel((x, y), farben[z] + (255,))
    return bild


def animation(links_ich=None, ich=ICH_VERSATZ_RECHTS):
    aussen, _ = dolch_griffversatz(v.KARTE)
    halten = {
        "waffe": {
            "position": ["c.is_first_person ? -3.5 : 0.0", "c.is_first_person ? -3.5 : -2.0", 0.0],
            "rotation": [f"c.is_first_person ? 0.0 : {KIPPEN_AUSSEN}", 0.0, "c.is_first_person ? -135.0 : 0.0"],
            "scale": f"c.is_first_person ? {GROESSE_ICH} : {GROESSE_AUSSEN}",
        },
        "griff": {
            "position": [0.0, f"c.is_first_person ? {ich:.2f} : {aussen:.2f}", 0.0],
            "rotation": [0.0, "c.is_first_person ? 0.0 : 90.0", 0.0],
        },
    }
    links = {
        "waffe_l": {
            "position": [0.0, -2.0, 0.0],
            "rotation": [KIPPEN_AUSSEN, 0.0, 0.0],
            # In der Ich-Ansicht weg - dort uebernimmt links_ich.
            "scale": f"c.is_first_person ? 0.0 : {GROESSE_AUSSEN}",
        },
        "griff_l": {
            "position": [0.0, round(aussen, 2), 0.0],
            "rotation": [0.0, 90.0, 0.0],
        },
    }
    anims = {
        "animation.dolche.halten": {"loop": True, "bones": halten},
        "animation.dolche.links": {"loop": True, "bones": links},
    }
    if links_ich:
        rot, pos, groesse = links_ich
        anims["animation.dolche.links_ich"] = {"loop": True, "bones": {"links_ich": {
            "rotation": [round(w, 2) for w in rot],
            "position": [round(w, 2) for w in pos],
            "scale": f"c.is_first_person ? {groesse:.3f} : 0.0",
        }}}
    return {"format_version": "1.10.0", "animations": anims}


def links_ich_haltung(name):
    """Der linke Dolch der Ich-Ansicht: das Spiegelbild des rechten.

    Gerechnet mit spieler_ansehen - wo der rechte Dolch in Ruhe vor der
    Kamera liegt, gespiegelt an der senkrechten Bildmitte (die Kamera sitzt
    bei x = 2.5). Der Dolch selbst ist symmetrisch, darum wird er dabei
    auch in sich gespiegelt; zusammen ist das wieder eine reine Drehung.
    """
    import haltung
    import spieler_ansehen as s

    sp = s.Spieler()
    waffe = s.Waffe(RES / "attachables" / f"{name}.json")
    pose, u = sp.pose({"v.is_first_person": 1.0, "hand": waffe.kennung, "q.life_time": 0.0})
    geo = s.lade(s.MOJANG / "humanoid_custom.geo.json")["geometry.humanoid.custom"]
    knochen = s._modellknochen(geo)
    knochen.update(s._modellknochen(waffe.geo, "w:", bindung="rightitem"))
    m = s.baue_matrizen(knochen, {"": pose, "w:": waffe.pose(u, True)},
                        {n: k["pivot"] for n, k in knochen.items()})["w:griff"]
    auge_x = 2.5
    lin = [[m[i][j] * (-1 if (i == 0) != (j == 0) else 1) for j in range(3)] for i in range(3)]
    ort = (2 * auge_x - m[0][3], m[1][3], m[2][3])
    groesse = abs(lin[0][0] * (lin[1][1] * lin[2][2] - lin[1][2] * lin[2][1])
                  - lin[0][1] * (lin[1][0] * lin[2][2] - lin[1][2] * lin[2][0])
                  + lin[0][2] * (lin[1][0] * lin[2][1] - lin[1][1] * lin[2][0])) ** (1 / 3)
    dreh = [[lin[i][j] / groesse for j in range(3)] + [0] for i in range(3)] + [[0, 0, 0, 1]]
    drehpunkt = (0, 8, 0)
    bindung = (0, 24 - 8, 0)       # Drehpunkt von body minus eigener
    welt = [sum(lin[i][k] * drehpunkt[k] for k in range(3)) + ort[i] for i in range(3)]
    pos = [welt[i] - drehpunkt[i] - bindung[i] for i in range(3)]
    return haltung.zerlege(dreh), pos, groesse


def attachable(name):
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": f"fynn:{name}",
                "materials": {"default": "entity_alphatest", "enchanted": "entity_alphatest_glint"},
                "textures": {
                    "default": f"textures/entity/{name}_haut",
                    "enchanted": "textures/misc/enchanted_item_glint",
                },
                "geometry": {"default": f"geometry.{name}"},
                "animations": {
                    "halten": "animation.dolche.halten",
                    "links": "animation.dolche.links",
                    "links_ich": "animation.dolche.links_ich",
                    "schlag": "animation.klinge.schlag",
                },
                "scripts": {"animate": ["halten", "links", "links_ich", "schlag"]},
                "render_controllers": ["controller.render.item_default"],
            }
        },
    }


def gegenstand(name, sorte):
    return {
        "format_version": "1.26.30",
        "minecraft:item": {
            "description": {
                "identifier": f"fynn:{name}",
                "menu_category": {"category": "equipment", "group": "minecraft:itemGroup.name.sword"},
            },
            "components": {
                "minecraft:icon": {"textures": {"default": name}},
                "minecraft:max_stack_size": 1,
                "minecraft:hand_equipped": True,
                "minecraft:damage": sorte["schaden"],
                "minecraft:durability": {"max_durability": sorte["haltbarkeit"]},
                "minecraft:enchantable": {"value": 14, "slot": "sword"},
                "minecraft:repairable": {"repair_items": [
                    {"items": [sorte["barren"]], "repair_amount": sorte["haltbarkeit"] // 4}]},
            },
        },
    }


def rezept(name, sorte):
    # Netherit wie in Minecraft: kein Werkbankrezept, sondern Aufwerten
    # der Diamantdolche am Schmiedetisch.
    if name == "netheritdolche":
        return {
            "format_version": "1.20.10",
            "minecraft:recipe_smithing_transform": {
                "description": {"identifier": f"fynn:{name}"},
                "tags": ["smithing_table"],
                "template": "minecraft:netherite_upgrade_smithing_template",
                "base": "fynn:diamantdolche",
                "addition": "minecraft:netherite_ingot",
                "result": f"fynn:{name}",
            },
        }
    # Zwei Barren nebeneinander, darunter zwei Stoecke - ein Dolch je
    # Spalte, so wie man das Paar auch vor sich hinlegen wuerde.
    return {
        "format_version": "1.20.10",
        "minecraft:recipe_shaped": {
            "description": {"identifier": f"fynn:{name}"},
            "tags": ["crafting_table"],
            "pattern": ["X X", "# #"],
            "key": {"X": {"item": sorte["barren"]}, "#": {"item": "minecraft:stick"}},
            "unlock": [{"item": sorte["barren"]}],
            "result": {"item": f"fynn:{name}"},
        },
    }


def schreibe(pfad, daten):
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def sprache(datei, eintraege):
    """Traegt Namen ein oder ersetzt sie - ohne doppelte Zeilen."""
    zeilen = datei.read_text(encoding="utf-8").splitlines()
    schluessel = {k for k, _ in eintraege}
    zeilen = [z for z in zeilen if z.split("=", 1)[0] not in schluessel]
    zeilen += [f"{k}={t}" for k, t in eintraege]
    datei.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def main():
    texturliste = RES / "textures" / "item_texture.json"
    liste = json.loads(texturliste.read_text(encoding="utf-8"))
    deutsch, englisch = [], []

    for name, sorte in v.SORTEN.items():
        dicke = lambda zeile, spalte, zeichen: TIEFE[zeichen]    # noqa: E731
        modell = w.aus_zeichenkarte(
            name, v.KARTE, {k: f + (255,) for k, f in sorte["farben"].items()},
            dicke=dicke, mitte=v.MITTE,
            ziel_modell=str(RES / "models" / "entity" / f"{name}.geo.json"),
            ziel_textur=str(RES / "textures" / "entity" / f"{name}_haut.png"))
        schreibe(RES / "models" / "entity" / f"{name}.geo.json", mit_linker_hand(modell))

        symbol(sorte["farben"]).save(RES / "textures" / "items" / f"{name}.png")
        liste["texture_data"][name] = {"textures": f"textures/items/{name}"}

        schreibe(RES / "attachables" / f"{name}.json", attachable(name))
        schreibe(VER / "items" / f"{name}.json", gegenstand(name, sorte))
        schreibe(VER / "recipes" / f"{name}.json", rezept(name, sorte))

        de, en = sorte["name"]
        deutsch += [(f"item.fynn:{name}", de), (f"item.fynn:{name}.name", de)]
        englisch += [(f"item.fynn:{name}", en), (f"item.fynn:{name}.name", en)]

    # Erst ohne den linken Dolch der Ich-Ansicht schreiben - er wird aus der
    # fertigen Haltung des rechten gerechnet.
    schreibe(RES / "animations" / "dolche.animation.json", animation(ich=dolch_griffversatz(v.KARTE)[1]))
    links_ich = links_ich_haltung(next(iter(v.SORTEN)))
    schreibe(RES / "animations" / "dolche.animation.json", animation(links_ich))
    texturliste.write_text(json.dumps(liste, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    sprache(RES / "texts" / "de_DE.lang", deutsch)
    sprache(RES / "texts" / "en_US.lang", englisch)
    aussen, ich = dolch_griffversatz(v.KARTE)
    print(f"Griffversatz: aussen {aussen:+.2f}, Ich-Ansicht rechts {ICH_VERSATZ_RECHTS:+.2f}, links {ich:+.2f}")
    print("Linker Dolch, Ich-Ansicht: Drehung {}, Ort {}, Groesse {:.3f}".format(
        [round(w, 1) for w in links_ich[0]], [round(w, 1) for w in links_ich[1]], links_ich[2]))


if __name__ == "__main__":
    main()
