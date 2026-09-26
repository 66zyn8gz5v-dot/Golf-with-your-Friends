#!/usr/bin/env python3
"""Die Baerenruestung: Stahl und Baerenleder, darueber der Baer.

Fynn: "Diese neue Baerenruestung kannst du behalten, dass man den Baeren
als Kapuze und dann als Cape noch hat. Aber darunter muss noch eine
richtige Ruestung liegen, aus Stahl und Baerenleder. Ein bisschen
schwaecher als Eisen, gecraftet aus Eisen und Leder. Mehr Detail,
schicker, ein bisschen dunkler. Und Animation vom Cape."
(Die Rubinruestung davor hat er wieder herausgenommen.)

* Helm: eine Stahlhaube mit Stirnband, Nasenschutz und Wangenklappen -
  darueber der Baerenkopf als Kapuze, mit Schnauze, runden Ohren und
  einer Reihe Zaehne ueber der Stirn, die Eckzaehne laenger.
* Panzer: dunkle Stahlplatte mit Mittelgrat und Schuppenreihen unten,
  vernietet; darueber ein Fellkragen, von dem vorn die beiden
  Vordertatzen des Baeren herabhaengen, mit hellen Krallen. Hinten der
  Baerenpelz als Umhang in drei Gliedern, die nacheinander schwingen.
* Beinschutz: Hose aus Baerenleder, Stahlplatten an den Oberschenkeln,
  Kniekacheln mit Niete, Guertel mit Messingschnalle.
* Stiefel: Lederstiefel mit Stahlkappe und Schienbeinplatte, Fellstulpe.

Die Arme bleiben frei, wie bei allen Ruestungen im Paket. Gemalt wird
ruhig: dunkler Stahl, dunkles Fell, wenige Stufen, nur Nieten, Krallen
und Schnalle setzen helle Punkte.

Wer alle vier Teile traegt, bekommt Staerke (verhaltenspaket/scripts/
tiere.js).

Gebaut mit dem Werkzeugkasten der Tiere (tiermodell.py): Die Knochen
heissen wie beim Spieler, damit Minecraft die Teile an den Traeger haengt;
eine Haut fuer die ganze Ruestung, jedes Teil ein eigenes Modell.

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


# ================================================================== Baer

def baer_satz():
    s = Satz("baerenruestung")
    # --- Helm: Stahlhaube, darueber der Baerenkopf
    s.k("helm", "head", [-4, 24, -4], [8, 8, 8], "haube", aufblasen=0.6)
    s.k("helm", "head", [-4, 24, -4], [8, 8, 8], "kapuze", aufblasen=1.2)
    # Der Baerenkopf sitzt oben auf der Stirn, damit die Augen frei bleiben.
    s.k("helm", "head", [-3, 30.5, -6.5], [6, 4, 3], "baerenkopf")        # Stirn des Baeren
    s.k("helm", "head", [-2, 31, -8.5], [4, 2, 2], "schnauze")
    s.k("helm", "head", [-1, 32.2, -8.9], [2, 1, 1], "nase")
    s.paar("helm", "head", [2.2, 33.5, -3.5], [3, 3, 2], "ohr")
    for x in (-1.5, 0.5):
        s.k("helm", "head", [x, 30.3, -8.2], [1, 1, 1], "zahn")            # Zaehne unter der Schnauze
    s.paar("helm", "head", [2.0, 29.6, -6.8], [1, 2, 1], "zahn")           # Eckzaehne, laenger
    # --- Panzer
    s.k("brust", "body", [-4, 12, -2], [8, 12, 4], "panzer", aufblasen=1.0)
    s.k("brust", "body", [-5, 21.5, -3.5], [10, 3, 7], "kragen", aufblasen=0.3)
    s.paar("brust", "body", [2, 16.5, -4], [2, 5, 1], "tatze")              # Vordertatzen am Kragen
    s.k("brust", "body", [-4, 12, -2], [8, 2, 4], "brustgurt", aufblasen=1.3)
    s.k("brust", "umhang", [-5, 16, 3.2], [10, 8, 1], "umhang", eltern="body", drehpunkt=[0, 24, 3.7])
    s.k("brust", "umhang_mitte", [-5, 10, 3.2], [10, 6, 1], "umhang", eltern="umhang", drehpunkt=[0, 16, 3.7])
    s.k("brust", "umhang_unten", [-5, 5, 3.2], [10, 5, 1], "umhang_saum", eltern="umhang_mitte",
        drehpunkt=[0, 10, 3.7])
    # --- Beinschutz
    s.k("hose", "body", [-4, 11, -2], [8, 3, 4], "guertel", aufblasen=0.6)
    for b in ("rightLeg", "leftLeg"):
        x = BEIN_X[b]
        s.k("hose", b, [x, 4, -2], [4, 8, 4], "hose", aufblasen=0.5)
        s.k("hose", b, [x, 7.5, -3.1], [4, 4, 1], "schenkelplatte")
        s.k("hose", b, [x + 1, 4.5, -3.2], [2, 2, 1], "knie")
    # --- Stiefel
    for b in ("rightLeg", "leftLeg"):
        x = BEIN_X[b]
        s.k("stiefel", b, [x, 0, -2], [4, 4, 4], "stiefel", aufblasen=1.0)
        s.k("stiefel", b, [x, 0, -3.5], [4, 2, 1], "kappe")
        s.k("stiefel", b, [x + 0.5, 2, -3.3], [3, 3, 1], "schiene")
        s.k("stiefel", b, [x - 0.5, 4, -2.5], [5, 2, 5], "stulpe", aufblasen=0.4)
    return s


STAHL, STAHL_HELL, NIETE = "#4a4e56", "#686e78", "#a4a8b0"
FELL, FELL_DUNKEL, FELL_SPITZE = "#5a3a24", "#38241a", "#74503a"
LEDER, LEDER_DUNKEL, MESSING = "#3e2a1e", "#2a1c14", "#a8894a"


def stahl(p, n, texel, saat, hell=0.0):
    return ton(STAHL, p, n, texel, saat, hell=hell, straehne=0.0, wolke=0.04)


def baer_maler():
    def fell(p, n, texel, saat, hell=0.0):
        # Fell: Spitzen oben etwas heller, ruhige Straehnen.
        return ton(FELL, p, n, texel, saat, hell=hell, straehne=0.05)

    def f(stoff, p, n, texel):
        vorn = n[2] < -0.5
        if stoff == "haube":
            # Nur im Gesicht sichtbar: Stirnband, Nasenschutz, Wangenklappen.
            if vorn:
                if p[1] > 29.6 or (abs(p[0]) > 2.9 and p[1] < 27.6):
                    if p[1] > 29.6 and abs(abs(p[0]) - 3.4) < 0.5 and 29.6 < p[1] < 30.6:
                        return hexfarbe(NIETE)
                    return stahl(p, n, texel, 301, hell=0.08 if p[1] > 30 else 0.0)
                return None                                  # Gesicht frei
            return stahl(p, n, texel, 303)
        if stoff == "kapuze":
            if vorn and abs(p[0]) < 3.6 and p[1] < 30.8:
                return None                                  # die Haube schaut heraus
            return fell(p, n, texel, 305, hell=-0.04)
        if stoff == "baerenkopf":
            if vorn and abs(p[1] - 33.0) < 0.3 and abs(abs(p[0]) - 2.5) < 0.3:
                return hexfarbe("#0c0908")                   # Augen, klein und dunkel, ueber der Schnauze
            return fell(p, n, texel, 307, hell=0.03)
        if stoff == "schnauze":
            if n[1] > 0.5:
                return ton(FELL_SPITZE, p, n, texel, 309, straehne=0.02)
            return ton("#8a6a48", p, n, texel, 311, straehne=0.02)
        if stoff == "nase":
            return hexfarbe("#3a2a24") if n[1] > 0.5 else hexfarbe("#141010")
        if stoff == "ohr":
            if vorn and abs(abs(p[0]) - 3.7) < 0.6 and p[1] < 35.3:
                return ton("#4a2e22", p, n, texel, 313, straehne=0.0)   # innen dunkler
            return fell(p, n, texel, 315)
        if stoff == "zahn":
            return ton("#e8e0cc", p, n, texel, 317, straehne=0.0, hell=0.05 if p[1] > 28.5 else -0.05)
        if stoff == "panzer":
            if vorn:
                if abs(p[0]) < 0.55 and p[1] > 14.5:
                    return stahl(p, n, texel, 319, hell=0.16)        # Mittelgrat
                if abs(abs(p[0]) - 3.9) < 0.55 and abs(p[1] - 20.5) < 0.55:
                    return hexfarbe(NIETE)
                if p[1] < 17 and abs(p[1] - round(p[1] / 1.5) * 1.5) < 0.3:
                    return stahl(p, n, texel, 321, hell=-0.16)       # Schuppenreihen
                if abs(p[0]) > 4.4 or p[1] > 24.3:
                    return stahl(p, n, texel, 323, hell=0.1)         # helle Kante
                return stahl(p, n, texel, 325)
            if n[2] > 0.5:
                return ton(LEDER, p, n, texel, 327, straehne=0.0)    # Ruecken: Leder
            return stahl(p, n, texel, 329, hell=-0.05)
        if stoff == "kragen":
            return fell(p, n, texel, 331, hell=0.06 if n[1] > 0.5 else 0.0)
        if stoff == "tatze":
            if p[1] < 17.6:
                if vorn and texel[0] % 2 == 0:
                    return ton("#ddd4bc", p, n, texel, 333, straehne=0.0)   # Krallen
                return ton(FELL_DUNKEL, p, n, texel, 335, straehne=0.0)
            return fell(p, n, texel, 337, hell=-0.02)
        if stoff == "brustgurt":
            if vorn and abs(p[0]) < 1.1:
                return ton(MESSING, p, n, texel, 339, straehne=0.0, hell=0.08 if abs(p[0]) > 0.5 else -0.1)
            return ton(LEDER_DUNKEL, p, n, texel, 341, straehne=0.0)
        if stoff in ("umhang", "umhang_saum"):
            if n[2] < -0.5:
                return ton(LEDER, p, n, texel, 343, straehne=0.0, hell=0.05)   # Innenseite: gegerbt
            if stoff == "umhang_saum" and p[1] < 5.6 + (texel[0] % 3 == 0) * 1.0:
                return None                                  # zottiger Saum
            if stoff == "umhang_saum" and p[1] < 7:
                return ton(FELL_DUNKEL, p, n, texel, 345, straehne=0.06)
            return fell(p, n, texel, 347, hell=0.02 if p[1] > 20 else -0.03)
        if stoff == "guertel":
            if vorn and abs(p[0]) < 1.1:
                return ton(MESSING, p, n, texel, 349, straehne=0.0)
            return ton(LEDER_DUNKEL, p, n, texel, 351, straehne=0.0)
        if stoff == "hose":
            if n[2] > 0.5 or abs(n[0]) > 0.5:
                return ton(LEDER, p, n, texel, 353, straehne=0.02)
            return ton(LEDER, p, n, texel, 355, straehne=0.02, hell=-0.04)
        if stoff == "schenkelplatte":
            if p[1] > 11.0:
                return stahl(p, n, texel, 357, hell=0.1)
            return stahl(p, n, texel, 359)
        if stoff == "knie":
            if vorn and abs((p[0] % 4.0) - 2.0) < 0.6 and abs(p[1] - 5.5) < 0.6:
                return hexfarbe(NIETE)
            return stahl(p, n, texel, 361, hell=0.06)
        if stoff == "stiefel":
            if p[1] < 0.8:
                return ton("#1e1410", p, n, texel, 363, straehne=0.0)   # Sohle
            return ton(LEDER, p, n, texel, 365, straehne=0.02, hell=-0.03)
        if stoff in ("kappe", "schiene"):
            return stahl(p, n, texel, 367, hell=0.08 if stoff == "kappe" and n[1] > 0.5 else 0.0)
        if stoff == "stulpe":
            return fell(p, n, texel, 369, hell=0.05)
        return fell(p, n, texel, 371)
    return f


# Der Umhang: drei Glieder, jedes schwingt etwas spaeter als das obere -
# so faellt der Pelz schwer und weich wie ein echtes Fell. Im Stehen
# atmet er leise mit, im Gehen schwingt er im Schritt seitlich, im Laufen
# weht er hoch. Die Tatzen am Kragen baumeln im Schritt.
U = "(c.owning_entity->v.fynn_umhang)"
T = "(c.owning_entity->v.fynn_tempo)"
G = "(c.owning_entity->v.fynn_gang)"
UMHANG = {
    "umhang": {"rotation": [f"{U} * 0.8 + math.sin(q.life_time * 90.0) * 1.2 + math.sin({G} * 2.0) * 3.0 * {T}", 0.0,
                            f"math.sin({G}) * 3.5 * {T}"]},
    "umhang_mitte": {"rotation": [f"{U} * 0.35 + math.sin(q.life_time * 90.0 - 40.0) * 1.5 "
                                  f"+ math.sin({G} * 2.0 - 60.0) * 5.0 * {T}", 0.0,
                                  f"math.sin({G} - 50.0) * 4.0 * {T}"]},
    "umhang_unten": {"rotation": [f"{U} * 0.25 + math.sin(q.life_time * 90.0 - 80.0) * 2.0 "
                                  f"+ math.sin({G} * 2.0 - 120.0) * 7.0 * {T}", 0.0,
                                  f"math.sin({G} - 100.0) * 5.0 * {T}"]},
}


# ================================================================== Gegenstaende

SLOTS = {"helm": ("slot.armor.head", "armor_head", "helmet"),
         "brust": ("slot.armor.chest", "armor_torso", "chestplate"),
         "hose": ("slot.armor.legs", "armor_legs", "leggings"),
         "stiefel": ("slot.armor.feet", "armor_feet", "boots")}

SAETZE = [
    # (Satz, Maler, Textur, Teile {teil: (Kennung, Namen, Schutz, Haltbarkeit, Muster)}, Material, Reparatur)
    # Etwas schwaecher als Eisen (2/6/5/2, 165/240/225/195), wie Fynn es will.
    ("baer", baer_satz, baer_maler, "baerenruestung", {
        "helm": ("baerenkapuze", ("Bärenhelm", "Bear Helmet"), 2, 150, ["FIF", "I I"]),
        "brust": ("baerenfellmantel", ("Bärenpanzer", "Bear Chestplate"), 5, 220, ["F F", "III", "FIF"]),
        "hose": ("baerenfellhose", ("Bärenbeinschutz", "Bear Leggings"), 4, 205, ["FIF", "I I", "F F"]),
        "stiefel": ("baerenfellstiefel", ("Bärenstiefel", "Bear Boots"), 2, 180, ["F F", "I I"]),
    }, "fynn:baerenfell", "minecraft:iron_ingot", 1),
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
        d["animations"] = {"umhang": "animation.fynn_ruestung.baerenumhang"}
        d["scripts"] = {"animate": ["umhang"]}
    if teil == "hose":
        d.setdefault("scripts", {})["parent_setup"] = "variable.leg_layer_visible = 0.0;"
    if teil == "stiefel":
        d.setdefault("scripts", {})["parent_setup"] = "variable.boot_layer_visible = 0.0;"
    return {"format_version": "1.10.0", "minecraft:attachable": {"description": d}}


# Symbole, 16 mal 16, von vorn: der Baerenkopf ueber der Stahlhaube, der
# Panzer mit Fellkragen und Tatzen, Beinschutz mit Schenkelplatten,
# Stiefel mit Stahlkappe und Fellstulpe.
SYMBOLFARBEN = {"#": FELL, "d": FELL_DUNKEL, "m": "#8a6a48", "s": "#5a606a", "l": "#9aa0aa", "k": "#3a3e46",
                "r": "#4a3222", "b": MESSING, "w": "#e0d8c4", "e": "#1e1410"}
SYMBOLFORMEN = {
    "helm": [
        "................",
        "..dd........dd..",
        ".d##d......d##d.",
        ".d###dddddd###d.",
        "..############..",
        ".###e######e###.",
        ".#####mmmm#####.",
        ".#####meem#####.",
        ".###wmmmmmmw###.",
        ".##sw.w..w.ws##.",
        ".##ssssssssss##.",
        ".##ss..ss..ss##.",
        ".##s...ss...s##.",
        "..#s........s#..",
        "................",
        "................",
    ],
    "brust": [
        "................",
        ".dd###....###dd.",
        ".d#####dd#####d.",
        ".d############d.",
        "..##sssllsss##..",
        "..##sssllsss##..",
        "...#sssllsss#...",
        "...wsssllsssw...",
        "...ssssllssss...",
        "...kkkkkkkkkk...",
        "...ssssssssss...",
        "...rrrrbbrrrr...",
        "...ssssssssss...",
        "................",
        "................",
        "................",
    ],
    "hose": [
        "................",
        "................",
        "...rrrrbbrrrr...",
        "...rrrrrrrrrr...",
        "...ssss..ssss...",
        "...ssss..ssss...",
        "...kkkk..kkkk...",
        "...rrrr..rrrr...",
        "...rssr..rssr...",
        "...rlsr..rslr...",
        "...rrrr..rrrr...",
        "...rrrr..rrrr...",
        "...rrrr..rrrr...",
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
        "..#####..#####..",
        "...dddd..dddd...",
        "...rsrr..rrsr...",
        "...rsrr..rrsr...",
        "..rrrrr..rrrrr..",
        "..sssrr..rrsss..",
        "..eeeee..eeeee..",
        "................",
        "................",
        "................",
        "................",
    ],
}


def bewegung():
    return {"format_version": "1.10.0", "animations": {
        "animation.fynn_ruestung.baerenumhang": {"loop": True, "bones": UMHANG}}}


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
            schluessel = {"F": material, "I": "minecraft:iron_ingot"}
            schluessel = {k: v for k, v in schluessel.items() if any(k in z for z in muster)}
            tp.schreibe(VER / "recipes" / f"{kennung}.json", tp.geformt(kennung, muster, schluessel, f"fynn:{kennung}"))
            symbol = tp.male(f"ruestung_{teil}", SYMBOLFARBEN)
            symbol.save(RES / "textures" / "items" / f"{kennung}.png")
            liste["texture_data"][kennung] = {"textures": f"textures/items/{kennung}"}
            namen.append(("item", kennung, name))
        ansichten.append((satz, bild))
    tp.schreibe(liste_pfad, liste)
    tp.schreibe(RES / "animations" / "baerenruestung.animation.json", bewegung())
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
            b, _ = s.bild(sp, {"v.fynn_umhang": 20.0, "v.fynn_tempo": 0.5, "v.fynn_gang": 40.0}, None, gier=gier, zoom=6.0,
                          breite=240, hoehe=300, ruestung=teile)
            bilder.append(b)
    gesamt = Image.new("RGBA", (240 * len(bilder), 300), (255, 255, 255, 255))
    for i, b in enumerate(bilder):
        gesamt.paste(b, (i * 240, 0))
    gesamt.save(ordner / "neue_ruestungen.png")
    print("gezeichnet:", ordner / "neue_ruestungen.png")


if __name__ == "__main__":
    main()
