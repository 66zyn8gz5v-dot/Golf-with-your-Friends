#!/usr/bin/env python3
"""Zwei neue Ruestungen: Rubinruestung und Baerenfellruestung.

Fynn: "ein, zwei neue Ruestungen". Beide in 3D - mit Teilen, die ueber den
Koerper hinausragen - und nach den Regeln, die fuer alle Ruestungen im
Paket gelten: die Arme bleiben frei (keine Aermel), gemalt wird ruhig, mit
wenigen Farbstufen.

Rubinruestung: dunkler Stahl, darauf Platten aus rotem Rubinglas mit
silberner Kante; goldener Helmkamm, Rubin auf Stirn, Brust und Knien,
Wangenschutz am Helm. Die beste Ruestung des Pakets, knapp unter Netherit.

Baerenfellruestung: Die Kapuze ist ein Baerenkopf - Schnauze mit Nase,
runde Ohren, Augen, darunter haengen Zaehne ueber dem Gesicht. Dazu eine
Fellweste mit Umhang aus Baerenfell, der im Wind weht (dieselbe Bewegung
wie beim Magier, animation.fynn_ruestung.umhang), Fellhose mit
Lederriemen, Fellstiefel mit dickem Stulpen.

Wer eine Ruestung ganz traegt, bekommt ihre Kraft (verhaltenspaket/
scripts/tiere.js): Baerenfell gibt Staerke, Rubin schuetzt vor Feuer.

Gebaut mit dem Werkzeugkasten der Tiere (tiermodell.py): Die Knochen
heissen wie beim Spieler, damit Minecraft die Teile an den Traeger haengt;
eine Haut je Ruestung, jedes Teil ein eigenes Modell.

    python3 werkzeuge/ruestungen_bauen.py [--bilder ORDNER]
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tierprodukte_bauen as tp                  # noqa: E402
from tiere_gestalt import nah, paar, ton         # noqa: E402
from tiermodell import Modell, hexfarbe          # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

DREH = {"head": [0, 24, 0], "body": [0, 24, 0], "rightArm": [-5, 22, 0], "leftArm": [5, 22, 0],
        "rightLeg": [-1.9, 12, 0], "leftLeg": [1.9, 12, 0]}
BEIN_X = {"rightLeg": -3.9, "leftLeg": -0.1}


class Satz:
    """Eine Ruestung: ein Modell mit allen Kaesten, jedes mit seinem Teil."""

    def __init__(self, name):
        self.m = Modell(name, sichtbreite=3, sichthoehe=3.5)
        self.knochen = {}
        self.teil_von = {}

    def k(self, teil, knochen, ursprung, groesse, stoff, eltern=None, drehpunkt=None, **weiter):
        if knochen not in self.knochen:
            self.knochen[knochen] = self.m.knoch(knochen, drehpunkt or DREH[knochen], eltern)
        kasten = self.knochen[knochen].kasten(ursprung, groesse, stoff, **weiter)
        self.teil_von[id(kasten)] = teil
        return kasten

    def paar(self, teil, knochen, ursprung, groesse, stoff, **weiter):
        self.k(teil, knochen, ursprung, groesse, stoff, **weiter)
        gespiegelt = [-ursprung[0] - groesse[0], ursprung[1], ursprung[2]]
        self.k(teil, knochen, gespiegelt, groesse, stoff, **weiter)

    def geometrie(self, teil, name):
        g = self.m.geometrie()["minecraft:geometry"][0]
        knochen = []
        for b, eintrag in zip(self.m.knochen, g["bones"]):
            wuerfel = [w for kasten, w in zip(b.kaesten, eintrag.get("cubes", [])) if self.teil_von[id(kasten)] == teil]
            if not wuerfel and not any(self.teil_von[id(k)] == teil for x in self.m.knochen
                                       if x.eltern == b.name for k in x.kaesten):
                continue
            neu = {kk: vv for kk, vv in eintrag.items() if kk != "cubes"}
            if wuerfel:
                neu["cubes"] = wuerfel
            knochen.append(neu)
        d = dict(g["description"], identifier=f"geometry.{name}", visible_bounds_offset=[0, 1.5, 0])
        return {"format_version": "1.16.0", "minecraft:geometry": [{"description": d, "bones": knochen}]}


# ================================================================== Rubin

def rubin_satz():
    s = Satz("rubinruestung")
    # Helm
    s.k("helm", "head", [-4, 24, -4], [8, 8, 8], "helm", aufblasen=1.0)
    s.k("helm", "head", [-1, 33, -5], [2, 2, 10], "gold")                  # Kamm
    s.k("helm", "head", [-1, 29, -5.6], [2, 2, 1], "rubin")                # Stirnrubin
    s.paar("helm", "head", [4.6, 23.5, -5.4], [1, 5, 4], "helm")           # Wangenschutz
    # Harnisch - ohne Aermel
    s.k("brust", "body", [-4, 12, -2], [8, 12, 4], "harnisch", aufblasen=1.0)
    s.k("brust", "body", [-4.5, 23.5, -3.5], [9, 2, 7], "gold")            # Kragen
    s.k("brust", "body", [-1.5, 18, -3.7], [3, 3, 1], "rubin")             # Brustrubin
    # Beinschutz
    s.k("hose", "body", [-4, 11, -2], [8, 3, 4], "guertel", aufblasen=0.6)
    s.k("hose", "body", [-1, 11, -3.1], [2, 2, 1], "gold")                 # Schnalle
    for b in ("rightLeg", "leftLeg"):
        x = BEIN_X[b]
        s.k("hose", b, [x, 4, -2], [4, 8, 4], "beinplatte", aufblasen=0.5)
        s.k("hose", b, [x + 1, 6, -2.8], [2, 2, 1], "rubin")               # Knierubin
    # Stiefel
    for b in ("rightLeg", "leftLeg"):
        x = BEIN_X[b]
        s.k("stiefel", b, [x, 0, -2], [4, 5, 4], "stiefel", aufblasen=1.0)
        s.k("stiefel", b, [x, 0, -3.6], [4, 2, 1], "gold")                 # Kappe
    return s


def rubin_maler():
    stahl, rubin, silber, gold = "#3e3e48", "#b8283e", "#c8ccd8", "#e0b040"

    def f(stoff, p, n, texel):
        if stoff == "gold":
            return ton(gold, p, n, texel, 301, straehne=0.0)
        if stoff == "rubin":
            return hexfarbe("#ff9aa8") if n[1] > 0.5 or (texel[0] + texel[1]) % 4 == 0 else ton(rubin, p, n, texel, 303,
                                                                                                  hell=0.1, straehne=0.0)
        if stoff == "helm":
            if n[2] < -0.5 and 26 < p[1] < 28 and abs(p[0]) < 2.6:
                return hexfarbe("#141418")                  # Sehschlitz
            if p[1] < 25 or abs(p[0]) > 3.5 and n[2] < -0.5:
                return ton(silber, p, n, texel, 305, straehne=0.0)
            return ton(rubin, p, n, texel, 307, straehne=0.0)
        if stoff == "harnisch":
            if p[1] > 22 or p[1] < 13 or (n[2] != 0 and abs(p[0]) > 3.3):
                return ton(silber, p, n, texel, 309, straehne=0.0)   # Kanten
            if n[2] < -0.5 and abs(p[0]) < 0.6:
                return ton(silber, p, n, texel, 311, straehne=0.0)   # Mittelgrat vorn
            return ton(rubin, p, n, texel, 313, straehne=0.0)
        if stoff == "guertel":
            return ton(stahl, p, n, texel, 315, straehne=0.0)
        if stoff == "beinplatte":
            return ton(silber if p[1] > 10.5 else rubin, p, n, texel, 317, straehne=0.0)
        if stoff == "stiefel":
            return ton(stahl if p[1] < 3 else rubin, p, n, texel, 319, straehne=0.0)
        return ton(stahl, p, n, texel, 321)
    return f


# ================================================================== Baerenfell

def baer_satz():
    s = Satz("baerenfellruestung")
    # Kapuze mit Baerenkopf
    s.k("helm", "head", [-4, 24, -4], [8, 8, 8], "kapuze", aufblasen=1.2)
    s.k("helm", "head", [-3, 30, -7], [6, 4, 3], "baerenkopf")             # Stirn des Baeren
    s.k("helm", "head", [-2, 29, -9], [4, 3, 2], "schnauze")
    s.k("helm", "head", [-1, 31, -9.5], [2, 1, 1], "nase")
    s.paar("helm", "head", [2.5, 33, -3], [3, 3, 1], "ohr")
    for x in (-2.5, -0.5, 1.5):
        s.k("helm", "head", [x, 28, -6], [1, 1, 1], "zahn")                # Zaehne ueber dem Gesicht
    # Fellweste und Umhang
    s.k("brust", "body", [-4, 12, -2], [8, 12, 4], "weste", aufblasen=1.0)
    s.k("brust", "body", [-5, 22, -3.5], [10, 3, 7], "kragen")             # Fellkragen
    s.k("brust", "body", [-1, 14, -3.4], [2, 9, 1], "riemen")              # Riemen quer
    s.k("brust", "umhang", [-5, 12, 3], [10, 12, 1], "umhang", eltern="body", drehpunkt=[0, 24, 3.5])
    s.k("brust", "umhang_unten", [-5, 4, 3], [10, 8, 1], "umhang_saum", eltern="umhang", drehpunkt=[0, 12, 3.5])
    # Fellhose
    s.k("hose", "body", [-4, 11, -2], [8, 3, 4], "guertel", aufblasen=0.6)
    for b in ("rightLeg", "leftLeg"):
        x = BEIN_X[b]
        s.k("hose", b, [x, 4, -2], [4, 8, 4], "hose", aufblasen=0.5)
    # Fellstiefel mit dickem Stulpen
    for b in ("rightLeg", "leftLeg"):
        x = BEIN_X[b]
        s.k("stiefel", b, [x, 0, -2], [4, 4, 4], "stiefel", aufblasen=1.0)
        s.k("stiefel", b, [x - 0.5, 4, -2.5], [5, 2, 5], "stulpen", aufblasen=0.6)
    return s


def baer_maler():
    fell, dunkel, leder, schnauze = "#7a5030", "#4a3020", "#5a3a22", "#a8845a"

    def f(stoff, p, n, texel):
        if stoff == "kapuze":
            if n[2] < -0.5 and abs(p[0]) < 3.1 and 24.5 < p[1] < 30.5:
                return None                                  # Gesicht frei
            return ton(fell, p, n, texel, 331, straehne=0.05)
        if stoff == "baerenkopf":
            if n[2] < -0.5 and 32 < p[1] < 33 and abs(abs(p[0]) - 2.5) < 0.4:
                return hexfarbe("#0c0908")                   # Augen, klein und dunkel
            return ton(fell, p, n, texel, 333, hell=0.04, straehne=0.05)
        if stoff == "schnauze":
            return ton(schnauze, p, n, texel, 335, straehne=0.02)
        if stoff == "nase":
            return hexfarbe("#16100c")
        if stoff == "ohr":
            return ton(dunkel, p, n, texel, 337) if n[2] < -0.5 else ton(fell, p, n, texel, 337)
        if stoff == "zahn":
            return hexfarbe("#eee6d2")
        if stoff in ("weste", "hose"):
            return ton(fell, p, n, texel, 339, hell=-0.04, straehne=0.05)
        if stoff in ("kragen", "stulpen"):
            return ton(fell, p, n, texel, 341, hell=0.08, straehne=0.06)
        if stoff in ("riemen", "guertel"):
            if stoff == "guertel" and n[2] < -0.5 and abs(p[0]) < 1:
                return hexfarbe("#c8a050")                   # Schnalle
            return ton(leder, p, n, texel, 343, straehne=0.0)
        if stoff in ("umhang", "umhang_saum"):
            if stoff == "umhang_saum" and p[1] < 5:
                return ton(dunkel, p, n, texel, 345, straehne=0.06)   # zerzauster Saum
            return ton(fell, p, n, texel, 347, straehne=0.06)
        if stoff == "stiefel":
            return ton(dunkel if p[1] < 1.5 else leder, p, n, texel, 349, straehne=0.02)
        return ton(fell, p, n, texel, 351)
    return f


# ================================================================== Gegenstaende

SLOTS = {"helm": ("slot.armor.head", "armor_head", "helmet"),
         "brust": ("slot.armor.chest", "armor_torso", "chestplate"),
         "hose": ("slot.armor.legs", "armor_legs", "leggings"),
         "stiefel": ("slot.armor.feet", "armor_feet", "boots")}

SAETZE = [
    # (Satz, Maler, Textur, Teile {teil: (Kennung, Namen, Schutz, Haltbarkeit, Muster)}, Material, Reparatur)
    ("rubin", rubin_satz, rubin_maler, "rubinruestung", {
        "helm": ("rubinhelm", ("Rubinhelm", "Ruby Helmet"), 3, 400, ["RRR", "R R"]),
        "brust": ("rubinharnisch", ("Rubinharnisch", "Ruby Chestplate"), 8, 580, ["R R", "RRR", "RRR"]),
        "hose": ("rubinbeinschutz", ("Rubinbeinschutz", "Ruby Leggings"), 6, 540, ["RRR", "R R", "R R"]),
        "stiefel": ("rubinstiefel", ("Rubinstiefel", "Ruby Boots"), 3, 470, ["R R", "R R"]),
    }, "fynn:rubin", "fynn:rubin", 2),
    ("baer", baer_satz, baer_maler, "baerenfellruestung", {
        "helm": ("baerenkapuze", ("Bärenkopf-Kapuze", "Bear Head Hood"), 2, 200, ["FFF", "F F"]),
        "brust": ("baerenfellmantel", ("Bärenfellmantel", "Bear Pelt Cloak"), 5, 290, ["F F", "FLF", "FFF"]),
        "hose": ("baerenfellhose", ("Bärenfellhose", "Bear Pelt Trousers"), 4, 270, ["FFF", "L L", "F F"]),
        "stiefel": ("baerenfellstiefel", ("Bärenfellstiefel", "Bear Pelt Boots"), 2, 230, ["F F", "L L"]),
    }, "fynn:baerenfell", "fynn:baerenfell", 1),
]


def gegenstand(kennung, teil, schutz, haltbar, reparatur, haerte):
    slot, verzaubern, gruppe = SLOTS[teil]
    k = {"minecraft:max_stack_size": 1,
         "minecraft:wearable": {"slot": slot, "protection": schutz},
         "minecraft:durability": {"max_durability": haltbar},
         "minecraft:enchantable": {"slot": verzaubern, "value": 12},
         "minecraft:repairable": {"repair_items": [{"items": [reparatur], "repair_amount": haltbar // 4}]},
         "minecraft:tags": {"tags": ["minecraft:is_armor"]}}
    if haerte > 1:
        k["minecraft:rarity"] = "rare"
    return tp.gegenstand(kennung, k, "equipment", f"minecraft:itemGroup.name.{gruppe}")


def attachable(kennung, teil, textur, bewegt):
    d = {"identifier": f"fynn:{kennung}",
         "materials": {"default": "armor", "enchanted": "armor_enchanted"},
         "textures": {"default": f"textures/models/armor/{textur}", "enchanted": "textures/misc/enchanted_item_glint"},
         "geometry": {"default": f"geometry.{kennung}"},
         "render_controllers": ["controller.render.armor"]}
    if bewegt:
        d["animations"] = {"umhang": "animation.fynn_ruestung.umhang"}
        d["scripts"] = {"animate": ["umhang"]}
    if teil == "hose":
        d.setdefault("scripts", {})["parent_setup"] = "variable.leg_layer_visible = 0.0;"
    if teil == "stiefel":
        d.setdefault("scripts", {})["parent_setup"] = "variable.boot_layer_visible = 0.0;"
    return {"format_version": "1.10.0", "minecraft:attachable": {"description": d}}


# Symbole: Mojangs Umrisse (vorlagen im Rollenwerkzeug) mit eigenen Farben.
SYMBOLFARBEN = {
    "rubin": {"#": "#b8283e", "s": "#c8ccd8", "g": "#e0b040", "e": "#141418", "w": "#ffb0bc", "f": "#e0b040"},
    "baer": {"#": "#7a5030", "s": "#a8845a", "g": "#4a3020", "e": "#0c0908", "w": "#eee6d2", "f": "#5a3a22"},
}
SYMBOLFORMEN = {
    "helm": [
        "................",
        "................",
        "....f######f....",
        "...##########...",
        "..############..",
        "..###eeeeee###..",
        "..##e......e##..",
        "..##........##..",
        "..#s........s#..",
        "..#s........s#..",
        "................",
        "................",
        "................",
        "................",
        "................",
        "................",
    ],
    "brust": [
        "................",
        "..ff........ff..",
        "..#ff......ff#..",
        "..###ffffff###..",
        "...##########...",
        "...####ww####...",
        "...####ww####...",
        "...##########...",
        "...##########...",
        "...##########...",
        "...ssssssssss...",
        "...##########...",
        "................",
        "................",
        "................",
        "................",
    ],
    "hose": [
        "................",
        "................",
        "...ffffffffff...",
        "...####ff####...",
        "...##########...",
        "...####..####...",
        "...###s..s###...",
        "...###s..s###...",
        "...####..####...",
        "...####..####...",
        "...####..####...",
        "...####..####...",
        "................",
        "................",
        "................",
        "................",
    ],
    "stiefel": [
        "................",
        "................",
        "................",
        "................",
        "................",
        "...ssss..ssss...",
        "...####..####...",
        "...####..####...",
        "...####..####...",
        "..#####..#####..",
        "..fffff..fffff..",
        "................",
        "................",
        "................",
        "................",
        "................",
    ],
}


def main():
    from vorlagen.tierformen import FORMEN
    FORMEN.update({f"ruestung_{k}": v for k, v in SYMBOLFORMEN.items()})
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    namen = []
    ansichten = []
    for kurz, bau, maler, textur, teile, material, reparatur, haerte in SAETZE:
        satz = bau()
        bild = satz.m.male(maler())
        ziel = RES / "textures" / "models" / "armor" / f"{textur}.png"
        ziel.parent.mkdir(parents=True, exist_ok=True)
        bild.save(ziel)
        for teil, (kennung, name, schutz, haltbar, muster) in teile.items():
            tp.schreibe(RES / "models" / "entity" / f"{kennung}.geo.json", satz.geometrie(teil, kennung))
            tp.schreibe(RES / "attachables" / f"{kennung}.json",
                        attachable(kennung, teil, textur, bewegt=(kurz == "baer" and teil == "brust")))
            tp.schreibe(VER / "items" / f"{kennung}.json", gegenstand(kennung, teil, schutz, haltbar, reparatur, haerte))
            schluessel = {"R": material} if kurz == "rubin" else {"F": material, "L": "minecraft:leather"}
            schluessel = {k: v for k, v in schluessel.items() if any(k in z for z in muster)}
            tp.schreibe(VER / "recipes" / f"{kennung}.json", tp.geformt(kennung, muster, schluessel, f"fynn:{kennung}"))
            symbol = tp.male(f"ruestung_{teil}", SYMBOLFARBEN[kurz])
            symbol.save(RES / "textures" / "items" / f"{kennung}.png")
            liste["texture_data"][kennung] = {"textures": f"textures/items/{kennung}"}
            namen.append(("item", kennung, name))
        ansichten.append((satz, bild))
    tp.schreibe(liste_pfad, liste)
    import abenteuer_bauen
    abenteuer_bauen.sprache(namen, "## Neue Ruestungen")
    print(f"gebaut: {len(SAETZE)} Ruestungen, {len(namen)} Teile")
    if "--bilder" in sys.argv:
        ansehen(ansichten, Path(sys.argv[sys.argv.index("--bilder") + 1]))


def ansehen(ansichten, ordner):
    """Beide Ruestungen am Spieler, von vorn und von hinten."""
    import spieler_ansehen as s
    ordner.mkdir(parents=True, exist_ok=True)
    sp = s.Spieler()
    bilder = []
    for satz, _ in ansichten:
        teile = [RES / "attachables" / f"{k}.json" for k, *_ in
                 next(t for t in SAETZE if t[1].__name__ == satz.m.name.replace("ruestung", "_satz")
                      or t[3] == satz.m.name)[4].values()]
        for gier in (30, 200):
            b, _ = s.bild(sp, {"v.fynn_umhang": 20.0, "v.fynn_tempo": 0.5}, None, gier=gier, zoom=6.0,
                          breite=240, hoehe=300, ruestung=teile)
            bilder.append(b)
    gesamt = Image.new("RGBA", (240 * len(bilder), 300), (255, 255, 255, 255))
    for i, b in enumerate(bilder):
        gesamt.paste(b, (i * 240, 0))
    gesamt.save(ordner / "neue_ruestungen.png")
    print("gezeichnet:", ordner / "neue_ruestungen.png")


if __name__ == "__main__":
    main()
