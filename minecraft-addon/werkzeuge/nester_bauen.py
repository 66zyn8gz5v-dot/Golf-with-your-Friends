#!/usr/bin/env python3
"""Nester und Eier (4.85).

Fynn: "Die Voegel, das Eichhoernchen sollen eigene Nester machen, die du
als eigene Bloecke machen musst, die in den Baeumen generieren koennen ...
da sollen sich Eier anlagern, die man dann auch klauen kann von den
verschiedenen Tieren."

Fuenf Nester, jedes ein eigener Block:

* Vogelnest - kleine Mulde aus Halmen oben auf dem Laub; bis zu drei
  hellblaue, gesprenkelte Eier (Singvoegel).
* Spechthoehle - ein Stueck Stamm mit rundem Loch; bis zu drei weisse Eier.
* Kobel - das Kugelnest des Eichhoernchens im Laub; darin sein Vorrat an
  Haselnuessen.
* Adlerhorst - ein grosser Horst aus dicken Aesten auf den Bergen; bis zu
  zwei braun gefleckte Eier.
* Greifennest - ein Horst mit goldenem Stroh und Federn; ein goldenes Ei,
  aus dem ein junger, zahmer Greif schluepft.

Die Eier sieht man im Nest (je Anzahl ein eigenes Modell). Wo die Nester
entstehen, wie die Eier hineinkommen und was beim Klauen geschieht:
scripts/nester.js.

    python3 werkzeuge/nester_bauen.py [--bilder ordner]
"""

import json
import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tierprodukte_bauen as tp                                       # noqa: E402
import roland_beute_bauen as rbb                                      # noqa: E402
from tiermodell import Modell, hexfarbe, mische, streu               # noqa: E402
from tiere_gestalt import ton                                         # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"
K = rbb.UMRISS

# (Kennung, Name, Ei-Gegenstand oder None, hoechstens Eier, Farben der Eier)
NESTER = {
    "vogelnest":    {"name": ("Vogelnest", "Bird Nest"), "ei": "vogelei", "max": 3,
                     "eifarbe": ("#9ad0e0", "#5a7a88"), "halm": ("#8a6a3e", "#5e4426", "#b0925a")},
    "spechthoehle": {"name": ("Spechthöhle", "Woodpecker Hollow"), "ei": "spechtei", "max": 3,
                     "eifarbe": ("#f4f0e8", "#d8d0c0")},
    "kobel":        {"name": ("Kobel", "Squirrel Drey"), "ei": None, "max": 3,
                     "halm": ("#6a4a2a", "#4a3220", "#4e7a2e")},
    "adlerhorst":   {"name": ("Adlerhorst", "Eagle Eyrie"), "ei": "adlerei", "max": 2,
                     "eifarbe": ("#e0d0b0", "#8a5a30"), "halm": ("#6a4a2a", "#3e2a18", "#8a6a3e")},
    "greifennest":  {"name": ("Greifennest", "Griffin Nest"), "ei": "greifenei", "max": 1,
                     "eifarbe": ("#f0c848", "#b8862a"), "halm": ("#c8a04a", "#8a6a2a", "#f0d880")},
}


# ------------------------------------------------------------ Modelle

def ring(b, radius, hoehe, unten, dicke, stoff):
    """Ein runder Rand aus acht Kaesten - eine Mulde aus Pixeln."""
    for i in range(8):
        w = i * 45
        r = math.radians(w)
        mx, mz = math.cos(r) * (radius - dicke / 2), math.sin(r) * (radius - dicke / 2)
        laenge = 2 * math.tan(math.radians(22.5)) * radius + 0.6
        b.kasten([round(mx - laenge / 2, 2), unten, round(mz - dicke / 2, 2)], [round(laenge, 2), hoehe, dicke], stoff,
                 drehung=[0, -w + 90, 0], drehpunkt=[round(mx, 2), unten, round(mz, 2)])


def eier(b, orte, groesse, hoehe):
    for x, z in orte:
        b.kasten([x - groesse / 2, hoehe, z - groesse / 2], [groesse, groesse + 1, groesse], "ei")


def vogelnest_modell(anzahl):
    m = Modell(f"vogelnest_{anzahl}", sichtbreite=1, sichthoehe=1)
    b = m.knoch("nest", [0, 0, 0])
    b.kasten([-4, 0, -4], [8, 1, 8], "boden")
    ring(b, 5, 3, 0, 2, "halm")
    eier(b, [(-1.5, -1), (1.5, 0), (0, 1.8)][:anzahl], 2, 1)
    return m


def adlerhorst_modell(anzahl):
    m = Modell(f"adlerhorst_{anzahl}", sichtbreite=1, sichthoehe=1)
    b = m.knoch("nest", [0, 0, 0])
    b.kasten([-7, 0, -7], [14, 2, 14], "boden")
    ring(b, 8, 4, 0, 3, "ast")
    # Einzelne Aeste ragen schraeg heraus.
    for w in (20, 110, 200, 290):
        b.kasten([-1, 2, 5], [2, 2, 8], "ast", drehung=[15, w, 0], drehpunkt=[0, 2, 0])
    eier(b, [(-2, -1), (2, 1)][:anzahl], 3, 2)
    return m


def greifennest_modell(anzahl):
    m = adlerhorst_modell(0)
    m.name = f"greifennest_{anzahl}"
    b = m.knoch("federn", [0, 0, 0])
    for w in (45, 160, 250):
        b.kasten([-0.5, 3, 6], [1, 0, 6], "feder", drehung=[25, w, 0], drehpunkt=[0, 3, 0])
    if anzahl:
        b.kasten([-2, 2, -2], [4, 5, 4], "ei")
    return m


def kobel_modell():
    m = Modell("kobel", sichtbreite=1, sichthoehe=1)
    b = m.knoch("kobel", [0, 0, 0])
    b.kasten([-5, 0, -5], [10, 8, 10], "reisig")
    b.kasten([-4, 8, -4], [8, 2, 8], "reisig")
    b.kasten([-6, 2, -4], [12, 4, 8], "reisig")
    b.kasten([-4, 2, -6], [8, 4, 12], "reisig")
    b.kasten([-1.5, 3, -6.2], [3, 3, 0], "eingang")
    return m


def spechthoehle_modell():
    m = Modell("spechthoehle", sichtbreite=1, sichthoehe=1)
    b = m.knoch("stamm", [0, 0, 0])
    b.kasten([-8, 0, -8], [16, 16, 16], "rinde")
    return m


# ------------------------------------------------------------ Maler

def nestmaler(n):
    halm, dunkel, hell = (hexfarbe(f) for f in n.get("halm", ("#8a6a3e", "#5e4426", "#b0925a")))
    ei, fleck = (hexfarbe(f) for f in n.get("eifarbe", ("#f4f0e8", "#d8d0c0")))

    def male(stoff, p, nn, texel):
        x, y, z = p
        if stoff == "ei":
            # Gesprenkelt, oben mit einem kleinen Glanzpunkt.
            if streu(texel[0], texel[1], 991) < 0.18:
                return fleck
            return ton(ei, p, nn, texel, 992, straehne=0.0, hell=0.08 if nn[1] > 0.5 else 0.0)
        if stoff == "feder":
            return ton("#f8f0d8" if texel[1] % 2 else "#e0b030", p, nn, texel, 993, straehne=0.0)
        if stoff in ("halm", "ast", "boden", "reisig"):
            # Kreuz und quer gelegte Zweige: helle und dunkle Striche im Wechsel.
            strich = (texel[0] + texel[1] * (2 if (texel[1] // 3) % 2 else -2)) % 5
            if stoff == "reisig" and streu(texel[0] // 2, texel[1] // 2, 994) < 0.3:
                return ton(hell, p, nn, texel, 995, straehne=0.0)                 # Laub im Kobel
            if strich == 0:
                return ton(dunkel, p, nn, texel, 996, straehne=0.0)
            if strich == 2:
                return ton(hell if stoff != "reisig" else halm, p, nn, texel, 997, straehne=0.0, hell=0.08)
            if stoff == "boden":
                return ton(mische(halm, dunkel, 0.5), p, nn, texel, 998, straehne=0.0)
            return ton(halm, p, nn, texel, 999, straehne=0.0)
        if stoff == "eingang":
            return hexfarbe("#1a120a")
        return ton(halm, p, nn, texel, 1000)
    return male


def spechtmaler():
    """Eichenrinde, auf der Nordseite ein rundes, dunkles Loch mit hellem Rand."""
    rinde, dunkel = hexfarbe("#6a5230"), hexfarbe("#4a3820")

    def male(stoff, p, nn, texel):
        x, y, z = p
        if nn[2] < -0.5:
            r = math.hypot(x, y - 9)
            if r < 3.2:
                return hexfarbe("#140c06") if r < 2.4 else hexfarbe("#b89a68")
        if abs(nn[1]) > 0.5:
            # Oben und unten: Jahresringe.
            r = math.hypot(x, z)
            return ton("#b89a68" if int(r) % 2 else "#9a7e50", p, nn, texel, 1001, straehne=0.0)
        if texel[0] % 4 == 0 or streu(texel[0], texel[1] // 3, 1002) < 0.15:
            return ton(dunkel, p, nn, texel, 1003, straehne=0.0)
        return ton(rinde, p, nn, texel, 1004, straehne=0.0)
    return male


# ------------------------------------------------------------ Bloecke

def modelle():
    """Alle Modelle: (Kennung, Anzahl oder None, Modell, Maler)."""
    teile = []
    for a in range(4):
        teile.append(("vogelnest", a, vogelnest_modell(a), nestmaler(NESTER["vogelnest"])))
    for a in range(3):
        teile.append(("adlerhorst", a, adlerhorst_modell(a), nestmaler(NESTER["adlerhorst"])))
    for a in range(2):
        teile.append(("greifennest", a, greifennest_modell(a), nestmaler(NESTER["greifennest"])))
    teile.append(("kobel", None, kobel_modell(), nestmaler(NESTER["kobel"])))
    teile.append(("spechthoehle", None, spechthoehle_modell(), spechtmaler()))
    return teile


def geo_name(kennung, anzahl):
    return f"geometry.fynn.{kennung}" + (f"_{anzahl}" if anzahl is not None else "")


def textur_name(kennung, anzahl):
    return f"nest_{kennung}" + (f"_{anzahl}" if anzahl is not None else "")


AUSWAHL = {
    "vogelnest": {"origin": [-5, 0, -5], "size": [10, 4, 10]},
    "adlerhorst": {"origin": [-8, 0, -8], "size": [16, 5, 16]},
    "greifennest": {"origin": [-8, 0, -8], "size": [16, 6, 16]},
    "kobel": {"origin": [-6, 0, -6], "size": [12, 10, 12]},
}


def block(kennung):
    n = NESTER[kennung]
    sichtbar = kennung != "spechthoehle"
    komponenten = {
        "minecraft:destructible_by_mining": {"seconds_to_destroy": 2.0 if kennung == "spechthoehle" else 0.3},
        "minecraft:destructible_by_explosion": {"explosion_resistance": 1.0},
        "minecraft:flammable": {"catch_chance_modifier": 30, "destroy_chance_modifier": 60},
        "minecraft:map_color": "#6a4a2a",
        "minecraft:tick": {"interval_range": [1200, 2400], "looping": True},
        "fynn:nest": {},
    }
    staaten = {"fynn:inhalt": {"values": {"min": 0, "max": n["max"]}}}
    teile = []
    if kennung == "spechthoehle":
        # Der Stamm mit Loch: ein ganzer Block, das Loch zeigt dahin, wo der
        # Specht es gehackt hat.
        staaten["fynn:seite"] = {"values": {"min": 0, "max": 3}}
        komponenten.update({
            "minecraft:geometry": geo_name(kennung, None),
            "minecraft:material_instances": {"*": {"texture": textur_name(kennung, None), "render_method": "opaque"}},
            "minecraft:loot": "loot_tables/blocks/spechthoehle.json",
        })
        for s in range(4):
            teile.append({"condition": f"q.block_state('fynn:seite') == {s}",
                          "components": {"minecraft:transformation": {"rotation": [0, 90 * s, 0]}}})
    else:
        komponenten.update({
            "minecraft:geometry": geo_name(kennung, 0 if kennung != "kobel" else None),
            "minecraft:material_instances": {"*": {"texture": textur_name(kennung, 0 if kennung != "kobel" else None),
                                                   "render_method": "alpha_test"}},
            "minecraft:collision_box": {"origin": AUSWAHL[kennung]["origin"],
                                        "size": [AUSWAHL[kennung]["size"][0], 3, AUSWAHL[kennung]["size"][2]]},
            "minecraft:selection_box": AUSWAHL[kennung],
            "minecraft:light_dampening": 0,
            "minecraft:loot": f"loot_tables/blocks/{kennung}.json",
        })
        if kennung != "kobel":
            for a in range(n["max"] + 1):
                teile.append({"condition": f"q.block_state('fynn:inhalt') == {a}", "components": {
                    "minecraft:geometry": geo_name(kennung, a),
                    "minecraft:material_instances": {"*": {"texture": textur_name(kennung, a),
                                                           "render_method": "alpha_test"}}}})
    d = {"format_version": "1.21.90", "minecraft:block": {
        "description": {"identifier": f"fynn:{kennung}",
                        "menu_category": {"category": "nature", "group": "minecraft:itemGroup.name.leaves"}
                        if sichtbar or kennung == "spechthoehle" else {"category": "none"},
                        "states": staaten},
        "components": komponenten}}
    if teile:
        d["minecraft:block"]["permutations"] = teile
    return d


def beute(kennung):
    """Wer ein Nest abbaut, bekommt es zurueck (die Eier gibt das Skript)."""
    if kennung == "spechthoehle":
        eintrag = {"type": "item", "name": "minecraft:oak_log", "weight": 1}
    else:
        eintrag = {"type": "item", "name": f"fynn:{kennung}", "weight": 1}
    return {"pools": [{"rolls": 1, "entries": [eintrag]}]}


# ------------------------------------------------------------ Eier

EIFORMEN = {
    "klein": [
        "................",
        "................",
        "................",
        "................",
        "......kkkk......",
        ".....kHWEEk.....",
        "....kEWEEFEk....",
        "....kEEEFEEk....",
        "....kEFEEEEk....",
        "....kEEEEFEk....",
        ".....kEEEEk.....",
        "......kkkk......",
        "................",
        "................",
        "................",
        "................",
    ],
    "gross": [
        "................",
        "................",
        "......kkkk......",
        ".....kHWEEk.....",
        "....kEWEEFEk....",
        "...kEEEFEEEEk...",
        "...kEFEEEEFEk...",
        "...kEEEEFEEEk...",
        "...kEEFEEEEEk...",
        "...kEEEEEFEEk...",
        "...kEFEEEEEEk...",
        "....kEEEFEEk....",
        ".....kEEEEk.....",
        "......kkkk......",
        "................",
        "................",
    ],
}
EIER = {
    # Kennung: (Name, Form, Farbe, Fleck, essbar: (Naehrwert, Saettigung) oder None)
    "vogelei": (("Vogelei", "Bird Egg"), "klein", "#9ad0e0", "#5a7a88", (2, 0.3)),
    "spechtei": (("Spechtei", "Woodpecker Egg"), "klein", "#f4f0e8", "#d8d0c0", (2, 0.3)),
    "adlerei": (("Adlerei", "Eagle Egg"), "gross", "#e0d0b0", "#8a5a30", (5, 0.6)),
    "greifenei": (("Greifenei", "Griffin Egg"), "gross", "#f0c848", "#b8862a", None),
}


def eibild(form, farbe, fleck):
    f = hexfarbe(farbe)
    return rbb.male(EIFORMEN[form], {"k": K, "E": f, "F": hexfarbe(fleck), "H": (255, 255, 250),
                                     "W": mische(f, (255, 255, 255), 0.5)})


NESTSYMBOLE = {
    "vogelnest": [
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
        "....kk.kk.kk....",
        "...kBkEkEkEBk...",
        "..kBHBEBEBEHBk..",
        "..kHBHBHBHBHBk..",
        "...kBHBHBHBHk...",
        "....kkkkkkkk....",
        "................",
        "................",
        "................",
        "................",
    ],
    "kobel": [
        "................",
        "................",
        "................",
        ".....kkkkkk.....",
        "....kLBHLBHk....",
        "...kBHLBHLBHk...",
        "..kLBHLBHLBHLk..",
        "..kHLBkkkBHLBk..",
        "..kBHLkeekLBHk..",
        "..kLBHkkkHLBHk..",
        "...kLBHLBHLBk...",
        "....kBHLBHLk....",
        ".....kkkkkk.....",
        "................",
        "................",
        "................",
    ],
    "adlerhorst": [
        "................",
        "................",
        "................",
        "................",
        "................",
        "..k..........k..",
        ".kBk..kk.kk.kBk.",
        "..kBkkEkkEkkBk..",
        ".kBHBHBEBEBHBHk.",
        "kBHBHBHBHBHBHBHk",
        ".kHBHBHBHBHBHBk.",
        "..kkkkkkkkkkkk..",
        "................",
        "................",
        "................",
        "................",
    ],
    "greifennest": [
        "................",
        "................",
        "................",
        "................",
        "..F.........F...",
        "..kF..kkkk.Fk...",
        ".kBkFkEEEEkFBk..",
        "..kBkkEEEEkkBk..",
        ".kBHBHBEEBHBHk..",
        "kBHBHBHBHBHBHBk.",
        ".kHBHBHBHBHBHk..",
        "..kkkkkkkkkkk...",
        "................",
        "................",
        "................",
        "................",
    ],
}


def nestsymbol(kennung):
    n = NESTER[kennung]
    halm, dunkel, hell = n.get("halm", ("#8a6a3e", "#5e4426", "#b0925a"))
    ei = n.get("eifarbe", ("#f4f0e8",))[0]
    return rbb.male(NESTSYMBOLE[kennung], {"k": K, "B": hexfarbe(halm), "H": hexfarbe(dunkel),
                                           "L": hexfarbe(hell), "E": hexfarbe(ei), "e": (26, 18, 10),
                                           "F": (240, 216, 128)})


def main():
    geos = []
    terrain_pfad = RES / "textures" / "terrain_texture.json"
    terrain = json.loads(terrain_pfad.read_text(encoding="utf-8"))
    ordner = RES / "textures" / "blocks" / "nester"
    ordner.mkdir(parents=True, exist_ok=True)
    bilder = {}
    for kennung, anzahl, modell, maler in modelle():
        g = modell.geometrie()["minecraft:geometry"][0]
        g["description"]["identifier"] = geo_name(kennung, anzahl)
        geos.append(g)
        bild = modell.male(maler)
        name = textur_name(kennung, anzahl)
        bild.save(ordner / f"{name}.png")
        bilder[name] = bild
        terrain["texture_data"][name] = {"textures": f"textures/blocks/nester/{name}"}
    tp.schreibe(terrain_pfad, terrain)
    tp.schreibe(RES / "models" / "blocks" / "nester.geo.json", {"format_version": "1.12.0", "minecraft:geometry": geos})
    for kennung in NESTER:
        tp.schreibe(VER / "blocks" / f"{kennung}.json", block(kennung))
        tp.schreibe(VER / "loot_tables" / "blocks" / f"{kennung}.json", beute(kennung))
    # Die Eier
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    namen = []
    for kennung, (name, form, farbe, fleck, essen) in EIER.items():
        teile = ({**tp.essen(essen[0], essen[1], dauer=1.2, stapel=16)} if essen
                 else {"minecraft:max_stack_size": 1, "minecraft:use_modifiers": {"use_duration": 0.05},
                       "minecraft:rarity": "epic"})
        tp.schreibe(VER / "items" / f"{kennung}.json", tp.gegenstand(kennung, teile, "items", tp.BEUTEFACH))
        eibild(form, farbe, fleck).save(RES / "textures" / "items" / f"{kennung}.png")
        liste["texture_data"][kennung] = {"textures": f"textures/items/{kennung}"}
        namen += [(f"item.fynn:{kennung}", name[0], name[1]), (f"item.fynn:{kennung}.name", name[0], name[1])]
    for kennung in NESTSYMBOLE:
        nestsymbol(kennung).save(RES / "textures" / "items" / f"nest_{kennung}_symbol.png")
        liste["texture_data"][f"nest_{kennung}_symbol"] = {"textures": f"textures/items/nest_{kennung}_symbol"}
    tp.schreibe(liste_pfad, liste)
    # Ein Vogelei ersetzt beim Backen ein Huehnerei.
    tp.schreibe(VER / "recipes" / "vogelei_ei.json",
                tp.formlos("vogelei_ei", ["fynn:vogelei", "fynn:vogelei"], "minecraft:egg"))
    for kennung, n in NESTER.items():
        namen += [(f"tile.fynn:{kennung}.name", n["name"][0], n["name"][1])]
    import boss_kern as bk
    bk.sprache("Nester und Eier", namen)
    # Wie die Bloecke klingen: wie Laub, die Spechthoehle wie Holz.
    bl_pfad = RES / "blocks.json"
    bl = json.loads(bl_pfad.read_text(encoding="utf-8"))
    for kennung in NESTER:
        bl[f"fynn:{kennung}"] = {"sound": "wood" if kennung == "spechthoehle" else "grass"}
    tp.schreibe(bl_pfad, bl)
    print(f"gebaut: {len(NESTER)} Nester, {len(EIER)} Eier")
    if "--bilder" in sys.argv:
        from PIL import Image
        ziel = Path(sys.argv[sys.argv.index("--bilder") + 1])
        b = [eibild(f, c, fl) for _, f, c, fl, _ in EIER.values()] + [nestsymbol(k) for k in NESTSYMBOLE]
        gesamt = Image.new("RGBA", (len(b) * 110, 110), (198, 198, 198, 255))
        for i, x in enumerate(b):
            gesamt.alpha_composite(x.resize((96, 96), Image.NEAREST), (7 + i * 110, 7))
        gesamt.save(ziel / "nester_symbole.png")
        print("gezeichnet:", ziel / "nester_symbole.png")


if __name__ == "__main__":
    main()
