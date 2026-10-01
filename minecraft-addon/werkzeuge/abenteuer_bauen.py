#!/usr/bin/env python3
"""Abenteuer: der Rubin, zwei neue Schwerter, zwei Ruestungen.

Fynn: "ein, zwei neue Ruestungen, neue Schwerter, vielleicht neuen
Edelstein oder so, den man abbauen kann."

* Rubin: Rubinerz in den Bergen (im Stein) und tief unten (im Tiefenschiefer),
  selten wie Smaragd. Erz, Stein und Block sind Mojangs Smaragd, rot
  umgefaerbt - so sehen sie aus wie echtes Minecraft. Abbauen ab
  Eisenspitzhacke.
* Rubinklinge: rote Kristallklinge mit Silberkante, goldene Parierstange
  mit Rubin im Knauf. In 3D.
* Haizahnsaebel: ein Stahlsaebel, auf dessen Ruecken eine Reihe Haizaehne
  sitzt - schneidet vorn und reisst hinten. In 3D.
* Rubinruestung und Baerenfellruestung: siehe ruestungen_bauen.py.

    python3 werkzeuge/abenteuer_bauen.py [--bilder ORDNER]
"""

import colorsys
import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tierprodukte_bauen as tp                          # noqa: E402
from vorlagen.tierformen import FORMEN                   # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"
MOJANG = Path("/home/user/mojang/bedrock-samples/resource_pack/textures")
EIGENE_KOPIE = Path(__file__).resolve().parent / "mojang" / "smaragd"


# ------------------------------------------------------------ Rubin

def rot_umfaerben(bild):
    """Smaragdgruen -> Rubinrot. Nur was gruen ist, wird rot; Stein und
    Schiefer darum bleiben, wie sie sind. Helligkeit und Saettigung bleiben,
    nur der Farbton wandert - so bleibt Mojangs Schattierung erhalten."""
    bild = bild.convert("RGBA")
    aus = bild.copy()
    for y in range(bild.height):
        for x in range(bild.width):
            r, g, b, a = bild.getpixel((x, y))
            if a == 0:
                continue
            h, s, v = colorsys.rgb_to_hsv(r / 255, g / 255, b / 255)
            if 0.18 < h < 0.6 and s > 0.18:
                r2, g2, b2 = colorsys.hsv_to_rgb(0.975, min(1.0, s * 1.05), v * 0.96)
                aus.putpixel((x, y), (round(r2 * 255), round(g2 * 255), round(b2 * 255), a))
    return aus


def vorlage(name):
    """Mojangs Bild - aus dem Beispielpaket, oder aus der Kopie im Werkzeug-
    ordner, damit der Bau auch ohne das Beispielpaket geht."""
    EIGENE_KOPIE.mkdir(parents=True, exist_ok=True)
    kopie = EIGENE_KOPIE / Path(name).name
    quelle = MOJANG / name
    if quelle.exists() and not kopie.exists():
        Image.open(quelle).save(kopie)
    return Image.open(kopie)


def erzblock(kennung, textur, sekunden, farbe):
    return {"format_version": "1.21.90", "minecraft:block": {
        "description": {"identifier": f"fynn:{kennung}",
                        "menu_category": {"category": "nature", "group": "minecraft:itemGroup.name.ore"}},
        "components": {
            "minecraft:geometry": "minecraft:geometry.full_block",
            "minecraft:material_instances": {"*": {"texture": textur, "render_method": "opaque"}},
            "minecraft:map_color": farbe,
            "minecraft:light_dampening": 15,
            "minecraft:destructible_by_explosion": {"explosion_resistance": 3.0},
            "minecraft:destructible_by_mining": {"seconds_to_destroy": sekunden, "item_specific_speeds": [
                {"item": "minecraft:iron_pickaxe", "destroy_speed": 0.4},
                {"item": "minecraft:golden_pickaxe", "destroy_speed": 0.2},
                {"item": "minecraft:diamond_pickaxe", "destroy_speed": 0.3},
                {"item": "minecraft:netherite_pickaxe", "destroy_speed": 0.25}]},
            "minecraft:loot": f"loot_tables/blocks/{kennung}.json",
        }}}


def erz_beute(ergebnis):
    """Ein Rubin, mit Glueck zwei - nur mit Eisen, Diamant oder Netherit.
    Mit Behutsamkeit faellt das Erz selbst (wie bei Mojangs Erzen)."""
    toepfe = []
    for spitzhacke in ("iron_pickaxe", "diamond_pickaxe", "netherite_pickaxe"):
        toepfe.append({"rolls": 1, "conditions": [{"condition": "match_tool", "item": f"minecraft:{spitzhacke}"}],
                       "entries": [{"type": "item", "name": ergebnis, "weight": 1, "functions": [
                           {"function": "set_count", "count": {"min": 1, "max": 1}},
                           {"function": "explosion_decay"}]}]})
    return {"pools": toepfe}


def rubin():
    bl = RES / "textures" / "blocks"
    rot_umfaerben(vorlage("blocks/emerald_ore.png")).save(bl / "rubinerz.png")
    rot_umfaerben(vorlage("blocks/deepslate/deepslate_emerald_ore.png")).save(bl / "tiefenrubinerz.png")
    rot_umfaerben(vorlage("blocks/emerald_block.png")).save(bl / "rubinblock.png")
    rot_umfaerben(vorlage("items/emerald.png")).save(RES / "textures" / "items" / "rubin.png")

    terrain_pfad = RES / "textures" / "terrain_texture.json"
    terrain = json.loads(terrain_pfad.read_text(encoding="utf-8"))
    for n in ("rubinerz", "tiefenrubinerz", "rubinblock"):
        terrain["texture_data"][n] = {"textures": f"textures/blocks/{n}"}
    tp.schreibe(terrain_pfad, terrain)
    bloecke_pfad = RES / "blocks.json"
    bloecke = json.loads(bloecke_pfad.read_text(encoding="utf-8"))
    bloecke["fynn:rubinerz"] = {"sound": "stone"}
    bloecke["fynn:tiefenrubinerz"] = {"sound": "deepslate"}
    bloecke["fynn:rubinblock"] = {"sound": "metal"}
    tp.schreibe(bloecke_pfad, bloecke)

    tp.schreibe(VER / "blocks" / "rubinerz.json", erzblock("rubinerz", "rubinerz", 15.0, "#9A3A4A"))
    tp.schreibe(VER / "blocks" / "tiefenrubinerz.json", erzblock("tiefenrubinerz", "tiefenrubinerz", 22.0, "#5A2A34"))
    block = erzblock("rubinblock", "rubinblock", 25.0, "#C0203A")
    block["minecraft:block"]["description"]["menu_category"] = {"category": "construction"}
    block["minecraft:block"]["components"]["minecraft:loot"] = "loot_tables/blocks/rubinblock.json"
    tp.schreibe(VER / "blocks" / "rubinblock.json", block)
    tp.schreibe(VER / "loot_tables" / "blocks" / "rubinerz.json", erz_beute("fynn:rubin"))
    tp.schreibe(VER / "loot_tables" / "blocks" / "tiefenrubinerz.json", erz_beute("fynn:rubin"))
    tp.schreibe(VER / "loot_tables" / "blocks" / "rubinblock.json",
                {"pools": [{"rolls": 1, "entries": [{"type": "item", "name": "fynn:rubinblock", "weight": 1}]}]})

    # Vorkommen: in den Bergen im Stein, tief unten ueberall im Schiefer.
    for name, erz, ersetzt, hoehe, biome, iterationen in (
            ("rubinerz", "fynn:rubinerz", ["minecraft:stone", "minecraft:andesite", "minecraft:diorite",
                                           "minecraft:granite", "minecraft:tuff"], [0, 120],
             [{"test": "has_biome_tag", "operator": "==", "value": "mountains"}], 6),
            ("rubinerz_huegel", "fynn:rubinerz", ["minecraft:stone", "minecraft:andesite", "minecraft:granite"],
             [0, 100], [{"test": "has_biome_tag", "operator": "==", "value": "extreme_hills"}], 5),
            ("tiefenrubinerz", "fynn:tiefenrubinerz", ["minecraft:deepslate", "minecraft:tuff"], [-60, -8],
             [{"test": "has_biome_tag", "operator": "==", "value": "overworld"}], 2)):
        tp.schreibe(VER / "features" / f"{name}_ader.json", {"format_version": "1.13.0", "minecraft:ore_feature": {
            "description": {"identifier": f"fynn:{name}_ader"}, "count": 3,
            "replace_rules": [{"places_block": erz, "may_replace": [{"name": n} for n in ersetzt]}]}})
        tp.schreibe(VER / "features" / f"{name}_streuung.json", {"format_version": "1.13.0", "minecraft:scatter_feature": {
            "description": {"identifier": f"fynn:{name}_streuung"}, "places_feature": f"fynn:{name}_ader",
            "iterations": iterationen, "project_input_to_floor": False,
            "x": {"distribution": "uniform", "extent": [0, 16]},
            "y": {"distribution": "uniform", "extent": hoehe},
            "z": {"distribution": "uniform", "extent": [0, 16]}}})
        tp.schreibe(VER / "feature_rules" / f"{name}_regel.json", {"format_version": "1.13.0", "minecraft:feature_rules": {
            "description": {"identifier": f"fynn:{name}_regel", "places_feature": f"fynn:{name}_streuung"},
            "conditions": {"placement_pass": "underground_pass", "minecraft:biome_filter": biome}}})

    rezepte = {
        "rubin_aus_erz": {"format_version": "1.12", "minecraft:recipe_furnace": {
            "description": {"identifier": "fynn:rubin_aus_erz"}, "tags": ["furnace", "blast_furnace"],
            "input": "fynn:rubinerz", "output": "fynn:rubin"}},
        "rubin_aus_tiefenerz": {"format_version": "1.12", "minecraft:recipe_furnace": {
            "description": {"identifier": "fynn:rubin_aus_tiefenerz"}, "tags": ["furnace", "blast_furnace"],
            "input": "fynn:tiefenrubinerz", "output": "fynn:rubin"}},
        "rubinblock": tp.geformt("rubinblock", ["RRR", "RRR", "RRR"], {"R": "fynn:rubin"}, "fynn:rubinblock"),
        "rubin_aus_block": tp.formlos("rubin_aus_block", ["fynn:rubinblock"], "fynn:rubin", 9),
    }
    return rezepte


# ------------------------------------------------------------ Schwerter

RUBINKLINGE = {
    "mitte": 3.5,
    "karte": [
        "...w...",
        "..wRs..",
        "..wRs..",
        "..wRs..",
        "..wrs..",
        "..wRs..",
        "..wRs..",
        "..wRs..",
        "..wrs..",
        "..wRs..",
        "..wRs..",
        "..wRs..",
        "..wrs..",
        "..wRs..",
        "..wRs..",
        ".wwRss.",
        "GGGRGGG",
        ".gGGGg.",
        "...L...",
        "...l...",
        "...L...",
        "...l...",
        "..GRG..",
        "...g...",
    ],
    "farben": {
        "w": (236, 238, 244), "s": (150, 156, 170),
        "R": (208, 40, 64), "r": (150, 20, 44),
        "G": (246, 204, 80), "g": (180, 130, 34),
        "L": (100, 40, 44), "l": (70, 26, 30),
    },
    "tiefe": {"w": 1.0, "s": 1.0, "R": 2.5, "r": 2.5, "G": 3.5, "g": 3.0, "L": 2.5, "l": 2.5},
    "griff": "Ll",
}

HAIZAHNSAEBEL = {
    "mitte": 3.5,
    "karte": [
        "...S...",
        "...SZ..",
        "..SMs..",
        "..SMsZ.",
        "..SMs..",
        "..SMsZ.",
        "..SMs..",
        "..SMsZ.",
        "..SMs..",
        "..SMsZ.",
        "..SMs..",
        "..SMsZ.",
        "..SMs..",
        "..SMsZ.",
        "..SMs..",
        ".SSMss.",
        "KKKKKKK",
        ".kKKKk.",
        "...L...",
        "...l...",
        "...L...",
        "...l...",
        "...L...",
        "..kKk..",
    ],
    "farben": {
        "S": (226, 230, 238), "M": (170, 178, 192), "s": (110, 118, 132),
        "Z": (246, 242, 230),
        "K": (70, 74, 84), "k": (44, 48, 56),
        "L": (40, 70, 86), "l": (26, 48, 60),
    },
    "tiefe": {"S": 1.0, "M": 1.5, "s": 1.0, "Z": 1.0, "K": 3.5, "k": 3.0, "L": 2.5, "l": 2.5},
    "griff": "Ll",
}

WAFFENFORMEN = {
    "breitschwert": [
        "..............w.",
        ".............wRs",
        "............wRRs",
        "...........wRRs.",
        "..........wRrs..",
        ".........wRRs...",
        "........wRRs....",
        ".......wRrs.....",
        "..g...wRRs......",
        "...g.wRRs.......",
        "....GGRs........",
        "....GGG.........",
        "...LGg.g........",
        "..LL............",
        ".GL.............",
        "................",
    ],
    "saebel": [
        "..............S.",
        ".............SMZ",
        "............SMs.",
        "...........SMsZ.",
        "..........SMs...",
        ".........SMsZ...",
        "........SMs.....",
        ".......SMsZ.....",
        "..k...SMs.......",
        "...k.SMsZ.......",
        "....KKs.........",
        "....KKK.........",
        "...LKk.k........",
        "..LL............",
        ".kL.............",
        "................",
    ],
}
FORMEN.update(WAFFENFORMEN)

SCHWERTER = [
    # (Kennung, Namen, Vorlage, Schaden, Haltbarkeit, Reparatur, Symbolform, Symbolfarben, Rezept)
    ("rubinklinge", ("Rubinklinge", "Ruby Blade"), RUBINKLINGE, 8, 1300, "fynn:rubin",
     "breitschwert", {"#": "#d02840", "R": "#d02840", "r": "#96142c", "w": "#f0f2f6", "s": "#8a1a2a",
                      "G": "#f0c850", "g": "#b48a2a", "L": "#64282c"},
     ([" R ", " R ", "GSG"], {"R": "fynn:rubin", "G": "minecraft:gold_ingot", "S": "minecraft:stick"})),
    ("haizahnsaebel", ("Haizahnsäbel", "Shark Tooth Sabre"), HAIZAHNSAEBEL, 7, 900, "fynn:stahlbarren",
     "saebel", {"#": "#aab2c0", "S": "#e2e6ee", "M": "#aab2c0", "s": "#6e7684", "Z": "#f6f2e6", "K": "#464a54",
                "k": "#2c3038", "L": "#28465a"},
     (["  Z", "SZ ", "T  "], {"Z": "fynn:haizahn", "S": "fynn:stahlbarren", "T": "minecraft:stick"})),
]


def schwerter():
    import waffe_bauen as w
    from neue_waffen_bauen import halten, waffen_attachable
    animationen, rezepte = {}, {}
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    for kennung, namen, v, schaden, haltbar, reparatur, form, farben, (muster, schluessel) in SCHWERTER:
        w.aus_zeichenkarte(kennung, v["karte"], {k: f + (255,) for k, f in v["farben"].items()},
                           dicke=lambda zeile, spalte, zeichen, t=v["tiefe"]: t[zeichen], mitte=v["mitte"],
                           ziel_modell=str(RES / "models" / "entity" / f"{kennung}.geo.json"),
                           ziel_textur=str(RES / "textures" / "entity" / f"{kennung}_haut.png"))
        tp.schreibe(RES / "attachables" / f"{kennung}.json", waffen_attachable(kennung))
        animationen[f"animation.{kennung}.halten"] = halten(v["karte"], v["griff"])
        tp.schreibe(VER / "items" / f"{kennung}.json", tp.gegenstand(kennung, {
            "minecraft:max_stack_size": 1, "minecraft:hand_equipped": True, "minecraft:damage": schaden,
            "minecraft:rarity": "rare", "minecraft:durability": {"max_durability": haltbar},
            "minecraft:enchantable": {"value": 14, "slot": "sword"},
            "minecraft:repairable": {"repair_items": [{"items": [reparatur], "repair_amount": haltbar // 4}]},
        }, "equipment", "minecraft:itemGroup.name.sword"))
        tp.male(form, farben).save(RES / "textures" / "items" / f"{kennung}.png")
        liste["texture_data"][kennung] = {"textures": f"textures/items/{kennung}"}
        rezepte[kennung] = tp.geformt(kennung, muster, schluessel, f"fynn:{kennung}")
    liste["texture_data"]["rubin"] = {"textures": "textures/items/rubin"}
    tp.schreibe(liste_pfad, liste)
    tp.schreibe(RES / "animations" / "abenteuerwaffen.animation.json",
                {"format_version": "1.10.0", "animations": animationen})
    tp.schreibe(VER / "items" / "rubin.json", tp.gegenstand("rubin", {"minecraft:max_stack_size": 64,
                                                                      "minecraft:rarity": "uncommon"}))
    return rezepte


NAMEN = [
    ("item", "rubin", ("Rubin", "Ruby")),
    ("item", "rubinklinge", ("Rubinklinge", "Ruby Blade")),
    ("item", "haizahnsaebel", ("Haizahnsäbel", "Shark Tooth Sabre")),
    ("tile", "rubinerz", ("Rubinerz", "Ruby Ore")),
    ("tile", "tiefenrubinerz", ("Tiefenschiefer-Rubinerz", "Deepslate Ruby Ore")),
    ("tile", "rubinblock", ("Rubinblock", "Block of Ruby")),
]


def sprache(namen, ueberschrift):
    for datei, i in (("de_DE.lang", 0), ("en_US.lang", 1)):
        pfad = RES / "texts" / datei
        schluessel = set()
        for art, k, _ in namen:
            schluessel |= {f"{art}.fynn:{k}", f"{art}.fynn:{k}.name"}
        zeilen = [z for z in pfad.read_text(encoding="utf-8").splitlines()
                  if z.split("=")[0] not in schluessel and z != ueberschrift]
        while zeilen and not zeilen[-1].strip():
            zeilen.pop()
        zeilen += ["", ueberschrift]
        for art, k, n in namen:
            if art == "item":
                zeilen.append(f"item.fynn:{k}={n[i]}")
            zeilen.append(f"{art}.fynn:{k}.name={n[i]}")
        pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def main():
    rezepte = rubin()
    rezepte.update(schwerter())
    for name, daten in rezepte.items():
        tp.schreibe(VER / "recipes" / f"{name}.json", daten)
    sprache(NAMEN, "## Rubin und neue Schwerter")
    print(f"gebaut: Rubin (Erz, Tiefenerz, Block, Stein), {len(SCHWERTER)} Schwerter in 3D, {len(rezepte)} Rezepte")


if __name__ == "__main__":
    main()
