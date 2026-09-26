#!/usr/bin/env python3
"""Baut die Dolchpaare des Assassinen - sechs Sorten aus einer Vorlage.

Je Sorte entsteht alles, was ein Gegenstand braucht: Inventarbild,
3D-Modell mit Haut, Attachable, Gegenstand, Rezept und die Namen. Die
Sorten stehen in vorlagen/dolche.py; wer eine neue will, traegt sie dort
ein und laesst dieses Werkzeug noch einmal laufen.

Zwei Dolche: Das Paar ist ein Gegenstand in der Haupthand; den linken
Dolch legt das Skript (kampf.js) als eigenen, festgesetzten Gegenstand in
die Zweithand, solange man das Paar haelt - "<sorte>dolch_links". So ist
auch sichtbar, dass die Zweithand belegt ist: Dort steckt der Dolch, kein
Schild passt dazu.

Warum ein eigener Gegenstand: In der Ich-Sicht zeichnet Minecraft vom
Spieler nur, was in den Haenden liegt. Ein zweiter Dolch, der am linken
Arm oder am Koerper des Paars hing, war dort unsichtbar (Fynns
Bildschirmfoto, Fassung 4.28). Gegenstaende in der Zweithand dagegen
zeichnet das Spiel auch in der Ich-Sicht.

Wo der linke Dolch in der Ich-Sicht liegt, ist nicht geraten: Er haengt an
einem Knochen wie Mojangs Schild, mit genau dessen Werten fuer die
Zweithand, und sitzt dort, wo der Schild seinen Griff hat. Der Schild
erscheint im Spiel richtig - der Dolch also an derselben Stelle.

    python3 werkzeuge/dolche_bauen.py
"""

import copy
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import waffe_bauen as w                 # noqa: E402
import kampf_animationen                # noqa: E402
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
KIPPEN_AUSSEN = 62.0
# In der Ich-Ansicht: rechts sitzt die Parierstange knapp ueber der Faust
# (nachgesehen mit spieler_ansehen - tiefer verschwindet der Dolch hinter
# der Hand). Links gibt es keine Hand; dort liegt der Dolch tiefer, damit
# sein Griff unten aus dem Bild laeuft, statt frei in der Luft zu enden.
#
# Gemessen vom tieferen linken Versatz aus, nicht als feste Zahl: Wird der
# Dolch laenger, wandert seine Griffmitte, und ein fester Wert saesse dann
# nicht mehr an der Faust.
ICH_ANHEBEN_RECHTS = 8.9


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


def symbol(farben):
    bild = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(v.SYMBOL):
        for x, z in enumerate(zeile):
            if z != ".":
                bild.putpixel((x, y), farben[z] + (255,))
    return bild


def animation(ich=None):
    if ich is None:
        ich = dolch_griffversatz(v.KARTE)[1] + ICH_ANHEBEN_RECHTS
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
    # Der linke Dolch. Von aussen wie der rechte, an der linken Hand. In
    # der Ich-Sicht die Kette "schild" mit Mojangs Schildwerten fuer die
    # Zweithand (shield.entity.json: off_hand_first_person_*), darin der
    # Dolch am Schildgriff, leicht nach aussen geneigt wie das
    # Spiegelbild des rechten.
    #
    # In der Schlagfolge der Dolche (kampf_animationen) fuehrt beim zweiten
    # Schlag die linke Hand: In der Ich-Sicht stoesst dieser Dolch zur
    # Bildmitte vor. Beim Kreuzschnitt am Ende schneidet er quer nach
    # aussen, gegen den rechten.
    stoss, schnitt = kampf_animationen.links_ich_stoss()
    links = {
        # Rueckwaertsgriff: um den Griff herum umgedreht, die Klinge liegt
        # am Unterarm entlang nach hinten. Fynn: "der eine Dolch wird so
        # rueckwaerts gehalten."
        "waffe": {
            "position": [0.0, -2.0, 0.0],
            "rotation": [KIPPEN_AUSSEN - 180.0, 0.0, 0.0],
            "scale": f"c.is_first_person ? 0.0 : {GROESSE_AUSSEN}",
        },
        "griff": {
            "position": [0.0, round(aussen, 2), 0.0],
            "rotation": [0.0, 90.0, 0.0],
        },
        "schild": {
            "position": [-13.5, -5.8, 5.1],
            "rotation": [1.0, 176.0, -2.5],
            "scale": "c.is_first_person ? 1.0 : 0.0",
        },
        "dolch_ich": {
            "position": [f"-5.0 * {stoss} + 3.0 * {schnitt}", f"2.0 * {stoss} - 4.0 * {schnitt}",
                         f"-7.0 * {stoss} - 3.0 * {schnitt}"],
            "rotation": [f"-20.0 * {stoss} - 25.0 * {schnitt}", 0.0,
                         f"{LINKS_NEIGUNG} - 30.0 * {stoss} + 50.0 * {schnitt}"],
            "scale": GROESSE_ICH,
        },
    }
    anims = {
        "animation.dolche.halten": {"loop": True, "bones": halten},
        "animation.dolche.links": {"loop": True, "bones": links},
    }
    return {"format_version": "1.10.0", "animations": anims}


SCHILD_DREHPUNKT = [1.0, 15.5, 3.0]     # Mojangs shield.geo.json
SCHILD_GRIFF = [1.0, 28.0, 3.0]         # Mitte des Schildgriffs dort
LINKS_NEIGUNG = 20.0                    # Spitze leicht nach aussen


def linker_name(name):
    return name[:-1] + "_links"        # eisendolche -> eisendolch_links


def linkes_modell(modell, links):
    """Zwei Ketten: aussen wie der rechte Dolch, innen am Schildknochen."""
    geo = copy.deepcopy(modell["minecraft:geometry"][0])
    geo["description"]["identifier"] = f"geometry.{links}"
    kette = geo["bones"]
    griff = next(k for k in kette if k["name"] == "griff")
    y = griffmitte(v.KARTE)
    verschoben = []
    for kasten in copy.deepcopy(griff["cubes"]):
        o = kasten["origin"]
        kasten["origin"] = [o[0] + SCHILD_GRIFF[0], o[1] + SCHILD_GRIFF[1] - y, o[2] + SCHILD_GRIFF[2]]
        verschoben.append(kasten)
    # Die Kette fuer aussen heisst "leftitem". Hiess sie wie beim rechten
    # Dolch "rightitem", haengte Minecraft sie ueber den Namen an die
    # rechte Hand - dort steckte der linke Dolch unsichtbar im rechten
    # (Fynns Bildschirmfoto, Fassung 4.31).
    for k in kette:
        if k["name"] == "rightitem":
            k["name"] = "leftitem"
            k["binding"] = "'leftitem'"
        elif k.get("parent") == "rightitem":
            k["parent"] = "leftitem"
    geo["bones"] = kette + [
        {"name": "schild", "binding": "q.item_slot_to_bone_name(c.item_slot)", "pivot": SCHILD_DREHPUNKT},
        {"name": "dolch_ich", "parent": "schild", "pivot": SCHILD_GRIFF, "cubes": verschoben},
    ]
    return {"format_version": modell["format_version"], "minecraft:geometry": [geo]}


def einzeln(farben):
    bild = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(v.EINZEL):
        for x, z in enumerate(zeile):
            if z != ".":
                bild.putpixel((x, y), farben[z] + (255,))
    return bild


def linkes_attachable(name, links):
    return {
        "format_version": "1.10.0",
        "minecraft:attachable": {
            "description": {
                "identifier": f"fynn:{links}",
                "materials": {"default": "entity_alphatest", "enchanted": "entity_alphatest_glint"},
                "textures": {"default": f"textures/entity/{name}_haut",
                             "enchanted": "textures/misc/enchanted_item_glint"},
                "geometry": {"default": f"geometry.{links}"},
                "animations": {"links": "animation.dolche.links"},
                "scripts": {"animate": ["links"]},
                "render_controllers": ["controller.render.item_default"],
            }
        },
    }


def linker_gegenstand(links):
    """Nur fuer die Zweithand; nicht im Kreativinventar, kein Rezept."""
    return {
        "format_version": "1.26.30",
        "minecraft:item": {
            "description": {"identifier": f"fynn:{links}", "menu_category": {"category": "none"}},
            "components": {
                "minecraft:icon": {"textures": {"default": links}},
                "minecraft:max_stack_size": 1,
                "minecraft:allow_off_hand": True,
                "minecraft:hand_equipped": True,
            },
        },
    }


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
                    "schlag": "animation.klinge.schlag",
                },
                "scripts": {"animate": ["halten", "schlag"]},
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
        schreibe(RES / "models" / "entity" / f"{name}.geo.json", modell)
        links = linker_name(name)
        schreibe(RES / "models" / "entity" / f"{links}.geo.json", linkes_modell(modell, links))
        einzeln(sorte["farben"]).save(RES / "textures" / "items" / f"{links}.png")
        liste["texture_data"][links] = {"textures": f"textures/items/{links}"}
        schreibe(RES / "attachables" / f"{links}.json", linkes_attachable(name, links))
        schreibe(VER / "items" / f"{links}.json", linker_gegenstand(links))

        symbol(sorte["farben"]).save(RES / "textures" / "items" / f"{name}.png")
        liste["texture_data"][name] = {"textures": f"textures/items/{name}"}

        schreibe(RES / "attachables" / f"{name}.json", attachable(name))
        schreibe(VER / "items" / f"{name}.json", gegenstand(name, sorte))
        schreibe(VER / "recipes" / f"{name}.json", rezept(name, sorte))

        de, en = sorte["name"]
        deutsch += [(f"item.fynn:{name}", de), (f"item.fynn:{name}.name", de)]
        englisch += [(f"item.fynn:{name}", en), (f"item.fynn:{name}.name", en)]
        de_l = "Linker " + de[:-1] + " (Zweithand)"          # Eisendolche -> Linker Eisendolch
        en_l = "Left " + en[:-1] + " (off hand)"
        deutsch += [(f"item.fynn:{links}", de_l), (f"item.fynn:{links}.name", de_l)]
        englisch += [(f"item.fynn:{links}", en_l), (f"item.fynn:{links}.name", en_l)]

    schreibe(RES / "animations" / "dolche.animation.json", animation())
    texturliste.write_text(json.dumps(liste, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    sprache(RES / "texts" / "de_DE.lang", deutsch)
    sprache(RES / "texts" / "en_US.lang", englisch)
    aussen, ich = dolch_griffversatz(v.KARTE)
    print(f"Griffversatz: aussen {aussen:+.2f}, Ich-Ansicht rechts {ich + ICH_ANHEBEN_RECHTS:+.2f}, links {ich:+.2f}")
    print("Linker Dolch: eigener Gegenstand je Sorte, Ich-Sicht am Schildknochen")


if __name__ == "__main__":
    main()
