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


# Die neun Baumarten mit Mojangs eigenen Bildern. Fynn: "Du musst dir die
# originalen Versionen holen, damit das auch matcht. Von jeder Baumart."
# Die Hoehle zeigt deshalb nicht eine gemalte Rinde, sondern genau die des
# Baums, in dem sie sitzt - auch mit einem Texturpaket.
# (Kennung, Stamm, Rinde, Stirnseite, frisches Holz, Name)
HOLZARTEN = [
    ("eiche", "oak_log", "log_oak", "log_oak_top", "stripped_oak_log"),
    ("birke", "birch_log", "log_birch", "log_birch_top", "stripped_birch_log"),
    ("fichte", "spruce_log", "log_spruce", "log_spruce_top", "stripped_spruce_log"),
    ("tropenbaum", "jungle_log", "log_jungle", "log_jungle_top", "stripped_jungle_log"),
    ("akazie", "acacia_log", "log_acacia", "log_acacia_top", "stripped_acacia_log"),
    ("schwarzeiche", "dark_oak_log", "log_big_oak", "log_big_oak_top", "stripped_dark_oak_log"),
    ("mangrove", "mangrove_log", "mangrove_log_side", "mangrove_log_top", "stripped_mangrove_log_side"),
    ("kirsche", "cherry_log", "cherry_log_side", "cherry_log_top", "stripped_cherry_log_side"),
    ("blasseiche", "pale_oak_log", "pale_oak_log_side", "pale_oak_log_top", "stripped_pale_oak_log_side"),
    # Die Pappel aus dem Herbstwald (Minecraft 1.26.50). Sie steht hinten,
    # damit die Nummern der anderen Arten gleich bleiben.
    ("pappel", "poplar_log", "poplar_log_side", "poplar_log_top", "stripped_poplar_log_side"),
]
VANILLE = Path(__file__).resolve().parent / "mojang" / "vv" / "staemme"

# Das Loch: sechs mal sechs Pixel mit abgestumpften Ecken, drei Pixel tief.
LOCH = {"x": (-3, 3), "y": (7, 13), "tiefe": 3}


def _flaechen(ursprung, groesse):
    import modell_ansehen as ma
    return ma.flaechen_des_kastens(ursprung, groesse)


def _uv(seite, ursprung, groesse):
    """Der Ausschnitt einer Teilflaeche aus dem 16er-Bild des ganzen Blocks.

    Die Rinde laeuft ueber mehrere Kaesten (um das Loch herum). Damit sie an
    den Naehten nicht springt, liest jede Teilflaeche genau das Stueck, das
    an ihrer Stelle laege, wenn die Seite aus einem Guss waere - gemessen
    von der Ecke oben links der ganzen Blockseite aus, in der Richtung, in
    der Bedrock das Bild auflegt (modell_ansehen, am Spiel geprueft)."""
    ganz, _ = _flaechen([-8, 0, -8], [16, 16, 16])[seite]
    teil, _ = _flaechen(ursprung, groesse)[seite]
    o, r, u = ganz[0], ganz[1], ganz[3]
    achse_u = [(r[i] - o[i]) / 16 for i in range(3)]
    achse_v = [(u[i] - o[i]) / 16 for i in range(3)]
    d = [teil[0][i] - o[i] for i in range(3)]
    breite = sum(abs(teil[1][i] - teil[0][i]) for i in range(3))
    hoehe = sum(abs(teil[3][i] - teil[0][i]) for i in range(3))
    return [round(sum(d[i] * achse_u[i] for i in range(3)), 3), round(sum(d[i] * achse_v[i] for i in range(3)), 3)], \
        [breite, hoehe]


def _kasten(ursprung, groesse, stoffe):
    """stoffe: {Seite: Materialname} - nur diese Seiten werden gezeichnet."""
    uv = {}
    for seite, stoff in stoffe.items():
        u, g = _uv(seite, ursprung, groesse)
        uv[seite] = {"uv": u, "uv_size": g, "material_instance": stoff}
    return {"origin": ursprung, "size": groesse, "uv": uv}


def spechthoehle_geo():
    """Ein ganzer Stamm, in den vorn (Norden) ein Loch gehackt ist."""
    (lx0, lx1), (ly0, ly1), t = LOCH["x"], LOCH["y"], LOCH["tiefe"]
    vorn = -8 + t
    r, s, i, l = "rinde", "stirn", "innen", "loch"
    kaesten = [
        # Oben und unten ganze Scheiben - so bleiben die Jahresringe aus einem Stueck.
        _kasten([-8, ly1, -8], [16, 16 - ly1, 16], {"north": r, "east": r, "south": r, "west": r, "up": s, "down": i}),
        _kasten([-8, 0, -8], [16, ly0, 16], {"north": r, "east": r, "south": r, "west": r, "down": s, "up": i}),
        # Dazwischen: der Kern hinter dem Loch, links und rechts die Wangen.
        _kasten([-8, ly0, vorn], [16, ly1 - ly0, 16 - t], {"east": r, "south": r, "west": r, "north": l}),
        _kasten([-8, ly0, -8], [lx0 + 8, ly1 - ly0, t], {"north": r, "west": r, "east": i}),
        _kasten([lx1, ly0, -8], [8 - lx1, ly1 - ly0, t], {"north": r, "east": r, "west": i}),
    ]
    # Die vier Ecken des Lochs - so wird es rund statt eckig.
    for x in (lx0, lx1 - 1):
        for y in (ly0, ly1 - 1):
            kaesten.append(_kasten([x, y, -8], [1, 1, t],
                                   {"north": r, "east": i, "west": i, "up": i, "down": i}))
    return {"description": {"identifier": "geometry.fynn.spechthoehle", "texture_width": 16, "texture_height": 16,
                            "visible_bounds_width": 2, "visible_bounds_height": 2, "visible_bounds_offset": [0, 0.5, 0]},
            "bones": [{"name": "stamm", "pivot": [0, 0, 0], "cubes": kaesten}]}


def lochbild():
    """Das Dunkel im Loch: fast schwarz, zum Rand hin eine Spur heller."""
    from PIL import Image
    bild = Image.new("RGBA", (16, 16))
    for y in range(16):
        for x in range(16):
            rand = min(x - 5, 10 - x, y - 3, 8 - y)
            bild.putpixel((x, y), (40, 28, 18, 255) if rand <= 0 else (22, 15, 9, 255))
    return bild


def holz_stoffe(art):
    kennung = art[0]
    t = {"rinde": f"fynn_rinde_{kennung}", "stirn": f"fynn_stirn_{kennung}",
         "innen": f"fynn_splint_{kennung}", "loch": "fynn_spechtloch"}
    stoffe = {n: {"texture": v, "render_method": "opaque"} for n, v in t.items()}
    stoffe["*"] = stoffe["rinde"]
    return stoffe


# ------------------------------------------------------------ Maler

def nestmaler(n):
    """Fynn: "Du punktest mir zu viel." Also keine einzelnen hellen und
    dunklen Pixel mehr, sondern wie bei Mojangs Heuballen: waagrechte
    Halme, jeder ein paar Pixel lang, in drei nah beieinander liegenden
    Toenen. Die Eier sind glatt, oben etwas heller, unten etwas dunkler."""
    halm, dunkel, hell = (hexfarbe(f) for f in n.get("halm", ("#8a6a3e", "#5e4426", "#b0925a")))
    ei = hexfarbe(n.get("eifarbe", ("#f4f0e8",))[0])
    toene = [halm, mische(halm, dunkel, 0.45), mische(halm, hell, 0.45)]
    laub = [hexfarbe("#4e7a2e"), hexfarbe("#44702a")]

    def halme(texel, saat):
        # Je zwei Bildzeilen ein Band; darin Halme von vier bis sechs Pixeln.
        band = texel[1] // 2
        versatz = int(streu(band, saat) * 5)
        halmnr = (texel[0] + versatz) // (4 + band % 3)
        wahl = streu(halmnr, band, saat + 1)
        return toene[0] if wahl < 0.5 else toene[1] if wahl < 0.78 else toene[2]

    def male(stoff, p, nn, texel):
        if stoff == "ei":
            if nn[1] > 0.5:
                return mische(ei, (255, 255, 255), 0.18)
            return mische(ei, (0, 0, 0), 0.12) if nn[1] < -0.5 or p[1] < 1.5 else ei
        if stoff == "feder":
            # Eine Feder: innen hell, zur Spitze golden - zwei Flaechen.
            return hexfarbe("#f4ead0") if texel[0] % 6 < 4 else hexfarbe("#e0b040")
        if stoff == "reisig":
            # Kobel: Zweige mit ganzen Laubbueschen darin, nicht mit Sprenkeln.
            busch = streu(texel[0] // 4, texel[1] // 3, 994)
            if busch < 0.38:
                return laub[(texel[0] // 4 + texel[1] // 3) % 2]
            return halme(texel, 995)
        if stoff == "boden":
            return toene[1]
        if stoff == "eingang":
            return hexfarbe("#1a120a")
        return halme(texel, 996 if stoff == "halm" else 997)
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
        # Specht es gehackt hat, und die Rinde ist die des Baums.
        staaten["fynn:seite"] = {"values": {"min": 0, "max": 3}}
        staaten["fynn:holz"] = {"values": {"min": 0, "max": len(HOLZARTEN) - 1}}
        komponenten.update({
            "minecraft:geometry": geo_name(kennung, None),
            "minecraft:material_instances": holz_stoffe(HOLZARTEN[0]),
            # Nichts aus der Beuteliste: Den Stamm der richtigen Baumart
            # laesst das Skript fallen (scripts/nester.js, abgebaut).
            "minecraft:loot": "loot_tables/leer.json",
        })
        for s in range(4):
            teile.append({"condition": f"q.block_state('fynn:seite') == {s}",
                          "components": {"minecraft:transformation": {"rotation": [0, 90 * s, 0]}}})
        for h, art in enumerate(HOLZARTEN):
            teile.append({"condition": f"q.block_state('fynn:holz') == {h}",
                          "components": {"minecraft:material_instances": holz_stoffe(art)}})
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
    return {"pools": [{"rolls": 1, "entries": [{"type": "item", "name": f"fynn:{kennung}", "weight": 1}]}]}


# ------------------------------------------------------------ Eier

EIFORMEN = {
    # W Glanz, L hell, E Grundfarbe, S Schatten - Flaechen, keine Sprenkel.
    "klein": [
        "................",
        "................",
        "................",
        "................",
        "......kkkk......",
        ".....kWLLEk.....",
        "....kWLEEEEk....",
        "....kLEEEEEk....",
        "....kEEEEESk....",
        "....kEEEESSk....",
        ".....kESSSk.....",
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
        ".....kWLLEk.....",
        "....kWLLEEEk....",
        "...kLLEEEEEEk...",
        "...kLEEEEEEEk...",
        "...kEEEEEEEEk...",
        "...kEEEEEEESk...",
        "...kEEEEEESSk...",
        "...kEEEEESSSk...",
        "....kEESSSSk....",
        ".....kSSSSk.....",
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
    return rbb.male(EIFORMEN[form], {"k": K, "E": f, "S": mische(f, hexfarbe(fleck), 0.3),
                                     "L": mische(f, (255, 255, 255), 0.25), "W": mische(f, (255, 255, 255), 0.6)})


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
    # Die Spechthoehle: Mojangs Stammbilder, nur das Dunkel im Loch ist unseres.
    geos.append(spechthoehle_geo())
    for name in ("nest_spechthoehle",):
        terrain["texture_data"].pop(name, None)
        (ordner / f"{name}.png").unlink(missing_ok=True)
    lochbild().save(ordner / "spechtloch.png")
    terrain["texture_data"]["fynn_spechtloch"] = {"textures": "textures/blocks/nester/spechtloch"}
    for kennung, _, rinde, stirn, splint in HOLZARTEN:
        for vorsilbe, bild in (("rinde", rinde), ("stirn", stirn), ("splint", splint)):
            terrain["texture_data"][f"fynn_{vorsilbe}_{kennung}"] = {"textures": f"textures/blocks/{bild}"}
    tp.schreibe(terrain_pfad, terrain)
    tp.schreibe(RES / "models" / "blocks" / "nester.geo.json", {"format_version": "1.12.0", "minecraft:geometry": geos})
    for kennung in NESTER:
        tp.schreibe(VER / "blocks" / f"{kennung}.json", block(kennung))
        if kennung != "spechthoehle":
            tp.schreibe(VER / "loot_tables" / "blocks" / f"{kennung}.json", beute(kennung))
    (VER / "loot_tables" / "blocks" / "spechthoehle.json").unlink(missing_ok=True)
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
    for kennung in ("vogelnest", "kobel", "adlerhorst", "greifennest"):
        # Frueher gemalte, nie angeschlossene Symbole: aufraeumen.
        liste["texture_data"].pop(f"nest_{kennung}_symbol", None)
        (RES / "textures" / "items" / f"nest_{kennung}_symbol.png").unlink(missing_ok=True)
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
        b = [eibild(f, c, fl) for _, f, c, fl, _ in EIER.values()]
        gesamt = Image.new("RGBA", (len(b) * 110, 110), (198, 198, 198, 255))
        for i, x in enumerate(b):
            gesamt.alpha_composite(x.resize((96, 96), Image.NEAREST), (7 + i * 110, 7))
        gesamt.save(ziel / "nester_symbole.png")
        print("gezeichnet:", ziel / "nester_symbole.png")


if __name__ == "__main__":
    main()
