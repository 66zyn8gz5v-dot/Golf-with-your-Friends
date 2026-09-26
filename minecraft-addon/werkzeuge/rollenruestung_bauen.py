#!/usr/bin/env python3
"""Baut zwei neue Ruestungen: die Magierrobe und die Assassinen-Montur.

Fynn wollte zu den Rollen passende Ruestungen, "denk dir was Geiles aus".
Der Ritter hat seine schon; dazu kommen:

Magierrobe, Blau mit Gold:
  * Zauberhut - spitz, mit breiter Krempe, Goldband und einer Spitze, die
    nach hinten abknickt,
  * Robe - mit Goldborte vorn, Kragen und einem langen Umhang, der hinten
    bis an die Waden faellt,
  * Robenrock - weit geschnitten, mit Goldsaum,
  * Schnabelschuhe - mit goldenen, hochgebogenen Spitzen.

Assassinen-Montur, fast schwarz mit Rot:
  * Kapuze - vorn eine Maske bis unter die Augen, oben ein Zipfel, der
    nach hinten faellt,
  * Harnisch - dunkles Leder mit roter Schaerpe quer ueber die Brust und
    einem roten Schal, dessen Ende hinten herabweht,
  * Hose - mit hellen Wickeln an den Knien,
  * Stiefel - weich, mit umgeschlagenem Schaft.

Wie bei der Ritterruestung liegt jedes Teil als Kaesten ueber dem
Koerper, die Knochen heissen wie beim Spieler. Keine Aermel: Fynn will
die Arme frei, sonst steckt die Waffe im Stoff.

Anders als beim Ritter gibt es hier keine gemalte Vorlage aus der
Pixelschmiede. Die Stoffe sind deshalb nicht Pixel fuer Pixel gemalt,
sondern beschrieben - Grundton, eingewebte Flecken, Borte, Saum -, und
das Werkzeug malt jede Flaeche danach. Je Ruestung ein Bild von 128 mal
128, in das die Flaechen aller vier Teile gepackt werden (64 mal 64
reichten nicht: Allein der Umhang ist 21 Pixel hoch).

    python3 werkzeuge/rollenruestung_bauen.py
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dolche_bauen import schreibe, sprache      # noqa: E402
from ofen_koernung import streu                 # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

DREH = {"body": [0, 24, 0], "head": [0, 24, 0], "rightArm": [-5, 22, 0],
        "leftArm": [5, 22, 0], "rightLeg": [-1.9, 12, 0], "leftLeg": [1.9, 12, 0]}

# ============================================================ Farben

MAGIER = {
    "a": (96, 120, 220), "b": (66, 88, 190), "c": (46, 62, 150), "d": (32, 44, 112),
    "o": (24, 32, 86), "k": (14, 18, 52),
    "G": (250, 214, 90), "g": (190, 140, 40), "S": (255, 252, 220),
}
ASSASSINE = {
    "a": (100, 100, 114), "b": (72, 72, 84), "c": (52, 52, 62), "d": (38, 38, 46),
    "o": (28, 28, 34), "k": (14, 14, 18),
    "R": (196, 38, 48), "r": (132, 24, 32), "e": (255, 80, 70), "x": (6, 6, 8),
    "W": (206, 200, 186), "w": (160, 154, 142), "L": (120, 82, 52), "l": (84, 56, 36),
    "s": (196, 200, 208),
}

# ============================================================ Stoffe
#
# Ein Stoff ist eine Funktion: Flaeche, Spalte, Zeile, Breite, Hoehe ->
# Farbzeichen (oder None fuer durchsichtig). "Flaeche" ist north (vorn,
# dem Betrachter zugewandt), south (hinten), east, west, up, down.

def grund(hell="b", mitte="c", dunkel="d", salz=0):
    """Ein Stoff mit eingewebten Flecken: meist der Mittelton, ab und zu
    heller oder dunkler, paarweise wie bei der Koernung der Burg."""
    def stoff(f, x, y, w, h):
        z = streu(x // 2, y + 17 * "nsewud".index(f[0]), salz)
        # Je etwa ein Fuenfzehntel hell und dunkel. Mit einem Siebtel sah
        # die Robe im ersten Bild fleckig aus statt gewebt.
        if z < 18:
            return hell
        if z > 238:
            return dunkel
        return mitte
    return stoff


def mit(basis, *schichten):
    """Legt Schichten ueber einen Stoff; die erste, die etwas sagt, gilt."""
    def stoff(f, x, y, w, h):
        for s in schichten:
            z = s(f, x, y, w, h)
            if z is not None:
                return z
        return basis(f, x, y, w, h)
    return stoff


def saum(zeichen, unten=1, oben=0):
    def s(f, x, y, w, h):
        if f in ("up", "down"):
            return None
        if y >= h - unten or y < oben:
            return zeichen
        return None
    return s


def borte_vorn(zeichen, spalten):
    def s(f, x, y, w, h):
        return zeichen if f == "north" and x in spalten else None
    return s


def schraeg_vorn(zeichen, schatten, versatz=0):
    """Eine Schaerpe quer ueber die Brust, von der rechten Schulter des
    Traegers (links im Bild) zur linken Huefte."""
    def s(f, x, y, w, h):
        if f != "north":
            return None
        d = x - y + versatz
        return zeichen if d == 0 else (schatten if d == -1 else None)
    return s


def voll(zeichen):
    return lambda f, x, y, w, h: zeichen


# ============================================================ Packen

class Atlas:
    """Legt die Flaechen aller Kaesten nebeneinander in ein Bild.

    Jede Flaeche bekommt ihr eigenes Feld (Bedrocks Angabe je Seite).
    Ein festes Kastennetz ginge bei halben Pixeln - dem Umhang, der
    Krempe - nicht auf.
    """

    def __init__(self, farben, breite=128, hoehe=128):
        self.farben = farben
        self.bild = Image.new("RGBA", (breite, hoehe), (0, 0, 0, 0))
        self.x = self.y = self.zeile = 0

    def feld(self, w, h):
        if self.x + w > self.bild.width:
            self.x, self.y, self.zeile = 0, self.y + self.zeile, 0
        if self.y + h > self.bild.height:
            raise SystemExit("Atlas voll - groesser machen")
        u, v = self.x, self.y
        self.x += w
        self.zeile = max(self.zeile, h)
        return u, v

    def kasten(self, ursprung, groesse, stoff, aufblasen=0.0, drehung=None, drehpunkt=None):
        import math
        w, h, d = (max(1, math.ceil(g)) for g in groesse)
        masse = {"north": (w, h), "south": (w, h), "east": (d, h), "west": (d, h),
                 "up": (w, d), "down": (w, d)}
        uv = {}
        for flaeche, (fw, fh) in masse.items():
            u, v = self.feld(fw, fh)
            for y in range(fh):
                for x in range(fw):
                    z = stoff(flaeche, x, y, fw, fh)
                    if z is not None:
                        self.bild.putpixel((u + x, v + y), self.farben[z] + (255,))
            uv[flaeche] = {"uv": [u, v], "uv_size": [fw, fh]}
        k = {"origin": list(ursprung), "size": list(groesse), "uv": uv}
        if aufblasen:
            k["inflate"] = aufblasen
        if drehung:
            k["rotation"] = list(drehung)
            k["pivot"] = list(drehpunkt)
        return k


def knochen(name, kaesten=(), eltern="body", drehpunkt=None, drehung=None):
    k = {"name": name, "pivot": drehpunkt or DREH[name]}
    if name != "body":
        k["parent"] = eltern
    if drehung:
        k["rotation"] = drehung
    if kaesten:
        k["cubes"] = list(kaesten)
    return k


# ============================================================ Magierrobe

def magierrobe():
    a = Atlas(MAGIER)
    blau = grund(salz=3)
    blau_hell = grund("a", "b", "c", salz=5)
    gold = grund("G", "G", "g", salz=7)

    hut = [
        knochen("body"),
        knochen("head", [
            # Die Krempe, zwei Pixel breiter als der Kopf auf jeder Seite
            a.kasten([-6, 31.5, -6], (12, 1, 12), mit(blau, saum("k"))),
            # Das Goldband ueber der Krempe
            a.kasten([-4.5, 32.5, -4.5], (9, 1, 9), gold),
            a.kasten([-4, 33.5, -4], (8, 3, 8), blau_hell),
        ]),
        # Der obere Teil knickt nach hinten ab - der Hut eines Zauberers
        # steht nie gerade.
        knochen("hutspitze", [
            a.kasten([-3, 36.5, -3], (6, 3, 6), mit(blau_hell, lambda f, x, y, w, h:
                                                  "S" if f == "north" and (x, y) == (2, 1) else None)),
            a.kasten([-2, 39.5, -2], (4, 3, 4), blau),
            a.kasten([-1, 42.5, -1], (2, 2, 2), blau),
            a.kasten([-0.5, 44, -0.5], (1, 1, 1), gold),
        ], eltern="head", drehpunkt=[0, 36.5, 0], drehung=[-22.5, 0, 0]),
    ]
    robe = [
        knochen("body", [
            a.kasten([-4, 12, -2], (8, 12, 4), mit(blau, borte_vorn("G", (3, 4)),
                                                   saum("g", 1), saum("G", 0, 1)), 1.0),
            # Kragen, ein Stueck weiter als der Koerper
            a.kasten([-5, 22.5, -3.5], (10, 2, 7), mit(gold, saum("g", 1))),
            # Der Umhang: von den Schultern bis an die Waden, hinten
            a.kasten([-4.5, 3, 3.2], (9, 21, 0.5), mit(blau, saum("G", 1))),
        ]),
    ]
    rock = [
        knochen("body"),
        knochen("rightLeg", [a.kasten([-3.9, 0, -2], (4, 12, 4), mit(blau, saum("G", 1)), 0.75)]),
        knochen("leftLeg", [a.kasten([-0.1, 0, -2], (4, 12, 4), mit(blau, saum("G", 1)), 0.75)]),
    ]

    def schuh(x):
        return [
            a.kasten([x, 0, -2], (4, 3, 4), mit(blau, saum("k", 1)), 0.6),
            # Die Spitze: vorn heraus und nach oben gebogen
            a.kasten([x + 1, 0, -4], (2, 1.5, 2), gold),
            a.kasten([x + 1.5, 1.5, -4.5], (1, 1, 1), gold),
        ]
    schuhe = [
        knochen("body"),
        knochen("rightLeg", schuh(-3.9)),
        knochen("leftLeg", schuh(-0.1)),
    ]
    return a.bild, {"magierhut": hut, "magierrobe": robe, "magierrock": rock, "magierschuhe": schuhe}


# ============================================================ Assassine

def assassinenmontur():
    a = Atlas(ASSASSINE)
    dunkel = grund(salz=11)
    dunkler = grund("c", "d", "o", salz=13)
    rot = grund("R", "R", "r", salz=17)

    def kapuzenfront(f, x, y, w, h):
        # Vorn: oben der Kapuzenrand, auf Augenhoehe (Zeile 3 und 4) offen
        # fuer die Augen des Spielers, darunter die rote Maske.
        if f != "north":
            return None
        if y in (3, 4) and 1 <= x <= 6:
            return "X"      # durchsichtig, siehe unten
        if y >= 5 and 1 <= x <= 6:
            return "R" if y < 7 else "r"
        return None

    def ohne_x(stoff):
        def s(f, x, y, w, h):
            z = stoff(f, x, y, w, h)
            return None if z == "X" else z
        return s

    kapuze = [
        knochen("body"),
        knochen("head", [
            a.kasten([-4, 24, -4], (8, 8, 8), ohne_x(mit(dunkel, kapuzenfront)), 1.0),
            # Der Rand steht ueber die Stirn vor und wirft Schatten
            a.kasten([-4.5, 31, -5.6], (9, 1.5, 1.5), dunkler),
        ]),
        # Der Zipfel haengt hinten am Kopf herab. Die erste Fassung war
        # gedreht und stand als Klappe nach oben ab.
        knochen("zipfel", [
            a.kasten([-2, 27, 4.8], (4, 4, 1.5), dunkel),
            a.kasten([-1, 25, 5.2], (2, 2, 1), dunkler),
        ], eltern="head", drehpunkt=[0, 31, 5]),
    ]
    harnisch = [
        knochen("body", [
            a.kasten([-4, 12, -2], (8, 12, 4), mit(dunkel, schraeg_vorn("R", "r", -2),
                                                   saum("L", 2), saum("k", 0, 1)), 1.0),
            # Der Schal um den Hals
            a.kasten([-4.5, 22.5, -3.3], (9, 2, 6.6), rot),
            # Zwei Wurfmesser in der Schaerpe
            a.kasten([1.2, 16, -3.4], (1, 3, 0.6), voll("s")),
            a.kasten([2.8, 15, -3.4], (1, 3, 0.6), voll("s")),
        ]),
        # Das Schalende weht hinten herab, leicht schraeg
        knochen("schalende", [
            a.kasten([0.5, 14, 3.1], (2.5, 9, 0.5), mit(rot, saum("r", 1))),
        ], drehpunkt=[1.75, 23, 3.3], drehung=[12, 0, -8]),
    ]

    def wickel(f, x, y, w, h):
        # Helle Wickel um das Knie: Zeile 5 bis 7 von oben
        if f in ("up", "down"):
            return None
        return ("W" if (x + y) % 2 else "w") if 5 <= y <= 7 else None

    hose = [
        knochen("body"),
        knochen("rightLeg", [a.kasten([-3.9, 0, -2], (4, 12, 4), mit(dunkel, wickel), 0.5)]),
        knochen("leftLeg", [a.kasten([-0.1, 0, -2], (4, 12, 4), mit(dunkel, wickel), 0.5)]),
    ]

    def stiefel(x):
        return [
            a.kasten([x, 0, -2], (4, 5, 4), mit(dunkler, saum("k", 1)), 1.0),
            # Umgeschlagener Schaft
            a.kasten([x - 0.5, 5, -2.5], (5, 1, 5), grund("L", "L", "l", salz=19)),
        ]
    stiefelpaar = [
        knochen("body"),
        knochen("rightLeg", stiefel(-3.9)),
        knochen("leftLeg", stiefel(-0.1)),
    ]
    return a.bild, {"assassinenkapuze": kapuze, "assassinenharnisch": harnisch,
                    "assassinenhose": hose, "assassinenstiefel": stiefelpaar}


# ============================================================ Inventar

# Die Umrisse von Minecrafts Lederruestung (Grautoene a bis k, Lederbesatz
# T t u), dazu eigene Zeichnungen fuer Hut und Kapuze. Die Grautoene
# werden auf den Stoff der Ruestung gelegt.
HUT = [
    "................",
    "..........kk....",
    ".........kGk....",
    "........kak.....",
    ".......kabk.....",
    "......kabbk.....",
    "......kaSck.....",
    ".....kaabcck....",
    ".....kabbcck....",
    "....kGGGGGGGk...",
    "....kaabbccck...",
    ".kkkkabbbccckkk.",
    "kaaaabbbbbbcccck",
    ".kkabbbbbccccck.",
    "...kkkkkkkkkk...",
    "................",
]
KAPUZE = [
    "................",
    "................",
    "......kkkk......",
    ".....kaaabk.....",
    "....kaaaabbk....",
    "...kaaabbbbck...",
    "...kaxxxxxxck...",
    "...kaxexxexck...",
    "...kaRRRRRRck...",
    "...karRRRRrck...",
    "...kabrrrrbck...",
    "...kabbbbbcck...",
    "....kbbbbcck....",
    ".....kkkkkk.....",
    "................",
    "................",
]
BRUST = [
    "................",
    "................",
    ".ooooo....ooooo.",
    ".oaabo....oaabo.",
    ".oabbco..ocabbo.",
    ".obbbacoocbbbbo.",
    ".odcbaacabbbcdo.",
    ".kkdaaacbbbbdkk.",
    "...kaabdcbbbk...",
    "...kbabcbbbck...",
    "...kbbbdcbbck...",
    "...kcbbcbbcck...",
    "...kdccdcccdk...",
    "....kdcdccdk....",
    ".....kkkkkk.....",
    "................",
]
HOSE = [
    "................",
    "................",
    "....oooooook....",
    "...oaaaaabbdk...",
    "...oaabbbbbck...",
    "...oabbccbbck...",
    "...oabckkdbck...",
    "...ouuk..kuuk...",
    "...uTtu..uTtu...",
    "...uttu..uttu...",
    "...ouuk..kuuk...",
    "...ocdk..kcdk...",
    "...kddk..kddk...",
    "...kkkk..kkkk...",
    "................",
    "................",
]
STIEFEL = [
    "................",
    "................",
    "................",
    "....ooo..ooo....",
    "...oaak..oaak...",
    "...oaak..oabk...",
    "...oabk..obbk...",
    "...obbk..obbk...",
    "...obck..obbk...",
    "..ubbtu..utbcu..",
    ".uTTttu..uttTtu.",
    ".utttuu..uutttu.",
    ".uuuu......uuuu.",
    "................",
    "................",
    "................",
]


def symbol(karte, farben, besatz, aenderung=None):
    """Malt ein Inventarbild; 'besatz' sagt, was aus dem Lederbesatz wird."""
    b = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(karte):
        for x, z in enumerate(zeile):
            if aenderung:
                z = aenderung(x, y, z)
            z = besatz.get(z, z)
            if z != ".":
                b.putpixel((x, y), farben[z] + (255,))
    return b


def symbole():
    m, s = MAGIER, ASSASSINE

    def robe(x, y, z):
        if z not in ".ko" and x in (7, 8) and y >= 7:
            return "G"                       # Goldborte vorn
        if (x, y) == (5, 10):
            return "S"                       # ein Stern
        return z

    def schaerpe(x, y, z):
        if z in ".ko":
            return z
        d = x - y
        return "R" if d == -2 else ("r" if d == -1 else z)

    return {
        "magierhut": symbol(HUT, m, {}),
        "magierrobe": symbol(BRUST, m, {}, robe),
        "magierrock": symbol(HOSE, m, {"T": "G", "t": "g", "u": "k"}),
        "magierschuhe": symbol(STIEFEL, m, {"T": "G", "t": "g", "u": "k"}),
        "assassinenkapuze": symbol(KAPUZE, s, {}),
        "assassinenharnisch": symbol(BRUST, s, {}, schaerpe),
        "assassinenhose": symbol(HOSE, s, {"T": "W", "t": "w", "u": "k"}),
        "assassinenstiefel": symbol(STIEFEL, s, {"T": "L", "t": "l", "u": "k"}),
    }


# ============================================================ Gegenstaende

TEILE = {
    # Name: Slot, Schutz, Haltbarkeit, Name de/en
    "magierhut":          ("head", 1, 165, "Zauberhut", "Wizard Hat"),
    "magierrobe":         ("chest", 4, 240, "Magierrobe", "Mage Robe"),
    "magierrock":         ("legs", 3, 225, "Robenrock", "Robe Skirt"),
    "magierschuhe":       ("feet", 1, 195, "Schnabelschuhe", "Pointed Shoes"),
    "assassinenkapuze":   ("head", 2, 220, "Assassinenkapuze", "Assassin Hood"),
    "assassinenharnisch": ("chest", 5, 320, "Assassinenharnisch", "Assassin Harness"),
    "assassinenhose":     ("legs", 4, 300, "Assassinenhose", "Assassin Trousers"),
    "assassinenstiefel":  ("feet", 1, 260, "Assassinenstiefel", "Assassin Boots"),
}
SLOT = {"head": ("slot.armor.head", "armor_head", "helmet"),
        "chest": ("slot.armor.chest", "armor_torso", "chestplate"),
        "legs": ("slot.armor.legs", "armor_legs", "leggings"),
        "feet": ("slot.armor.feet", "armor_feet", "boots")}

# Rezepte: Magier aus blauer Wolle mit Gold, Assassine aus schwarzer
# Wolle und Leder mit Rot. Der Hut hat die Form eines Hutes.
REZEPTE = {
    "magierhut":          ([" G ", " W ", "WWW"], {"G": "minecraft:gold_ingot", "W": "minecraft:blue_wool"}),
    "magierrobe":         (["W W", "WGW", "WWW"], {"G": "minecraft:gold_ingot", "W": "minecraft:blue_wool"}),
    "magierrock":         (["WWW", "W W", "W W"], {"W": "minecraft:blue_wool"}),
    "magierschuhe":       (["W W", "G G"], {"G": "minecraft:gold_nugget", "W": "minecraft:blue_wool"}),
    "assassinenkapuze":   (["DDD", "DRD"], {"D": "minecraft:black_wool", "R": "minecraft:red_wool"}),
    "assassinenharnisch": (["L L", "LRL", "LLL"], {"L": "minecraft:leather", "R": "minecraft:red_wool"}),
    "assassinenhose":     (["DDD", "D D", "L L"], {"D": "minecraft:black_wool", "L": "minecraft:leather"}),
    "assassinenstiefel":  (["D D", "L L"], {"D": "minecraft:black_wool", "L": "minecraft:leather"}),
}
REPARATUR = {"magier": "minecraft:blue_wool", "assassinen": "minecraft:leather"}


def gegenstand(name):
    slot, schutz, haltbar, _, _ = TEILE[name]
    slot_name, verzauber, gruppe = SLOT[slot]
    reparatur = REPARATUR["magier" if name.startswith("magier") else "assassinen"]
    return {
        "format_version": "1.26.30",
        "minecraft:item": {
            "description": {"identifier": f"fynn:{name}",
                            "menu_category": {"category": "equipment",
                                              "group": f"minecraft:itemGroup.name.{gruppe}"}},
            "components": {
                "minecraft:icon": {"textures": {"default": name}},
                "minecraft:max_stack_size": 1,
                "minecraft:wearable": {"slot": slot_name, "protection": schutz},
                "minecraft:durability": {"max_durability": haltbar},
                "minecraft:enchantable": {"slot": verzauber, "value": 15},
                "minecraft:repairable": {"repair_items": [{"items": [reparatur], "repair_amount": haltbar // 4}]},
                "minecraft:tags": {"tags": ["minecraft:is_armor"]},
            },
        },
    }


def attachable(name, textur):
    slot = TEILE[name][0]
    beschreibung = {
        "identifier": f"fynn:{name}",
        "materials": {"default": "armor", "enchanted": "armor_enchanted"},
        "textures": {"default": f"textures/models/armor/{textur}",
                     "enchanted": "textures/misc/enchanted_item_glint"},
        "geometry": {"default": f"geometry.{name}"},
        "render_controllers": ["controller.render.armor"],
    }
    # Hose und Schuhe blenden die zweite Hautschicht der Beine aus, wie
    # beim Ritter - sonst schaut sie durch den Stoff.
    if slot == "legs":
        beschreibung["scripts"] = {"parent_setup": "variable.leg_layer_visible = 0.0;"}
    if slot == "feet":
        beschreibung["scripts"] = {"parent_setup": "variable.boot_layer_visible = 0.0;"}
    return {"format_version": "1.10.0", "minecraft:attachable": {"description": beschreibung}}


def rezept(name):
    muster, schluessel = REZEPTE[name]
    erstes = next(iter(schluessel.values()))
    return {
        "format_version": "1.20.10",
        "minecraft:recipe_shaped": {
            "description": {"identifier": f"fynn:{name}"},
            "tags": ["crafting_table"],
            "pattern": muster,
            "key": {k: {"item": v} for k, v in schluessel.items()},
            "unlock": [{"item": erstes}],
            "result": {"item": f"fynn:{name}"},
        },
    }


def geo(name, knochenliste, breite=128, hoehe=128):
    return {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": f"geometry.{name}",
                "texture_width": breite, "texture_height": hoehe,
                "visible_bounds_width": 3, "visible_bounds_height": 3.5,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": knochenliste,
        }],
    }


def ansicht(textur, teile, ziel):
    """Alle vier Teile einer Ruestung an einem Koerper, zum Ansehen."""
    import modell_ansehen
    alle = {}
    for liste in teile.values():
        for k in liste:
            z = alle.setdefault(k["name"], {kk: vv for kk, vv in k.items() if kk != "cubes"} | {"cubes": []})
            z["cubes"] += k.get("cubes", [])
    tmp_geo = WURZEL / "vorschau" / "_ansicht.geo.json"
    tmp_bild = WURZEL / "vorschau" / "_ansicht.png"
    tmp_geo.write_text(json.dumps(geo("ansicht", list(alle.values()))))
    textur.save(tmp_bild)
    modell_ansehen.zeichne(str(tmp_geo), str(tmp_bild), str(ziel),
                           ansichten=[("vorn", 0, 0), ("Seite", 90, 0), ("hinten", 180, 0),
                                      ("schraeg", 30, 15)], breite=300, hoehe=460)
    tmp_geo.unlink()
    tmp_bild.unlink()


def main():
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    deutsch, englisch = [], []
    bilder = symbole()
    # Die Stoffbilder heissen anders als jedes Teil: Zwei Bilder gleichen
    # Namens behaelt Minecraft nur einmal, und "magierrobe" ist schon das
    # Inventarbild der Robe.
    for satz, stoff, bauer in (("magierrobe", "magier_stoff", magierrobe),
                               ("assassinenmontur", "assassinen_stoff", assassinenmontur)):
        textur, teile = bauer()
        (RES / "textures" / "models" / "armor").mkdir(parents=True, exist_ok=True)
        textur.save(RES / "textures" / "models" / "armor" / f"{stoff}.png")
        for name, knochenliste in teile.items():
            schreibe(RES / "models" / "entity" / f"{name}.geo.json", geo(name, knochenliste))
            schreibe(RES / "attachables" / f"{name}.json", attachable(name, stoff))
            schreibe(VER / "items" / f"{name}.json", gegenstand(name))
            schreibe(VER / "recipes" / f"{name}.json", rezept(name))
            bilder[name].save(RES / "textures" / "items" / f"{name}.png")
            liste["texture_data"][name] = {"textures": f"textures/items/{name}"}
            _, _, _, de, en = TEILE[name]
            deutsch += [(f"item.fynn:{name}", de), (f"item.fynn:{name}.name", de)]
            englisch += [(f"item.fynn:{name}", en), (f"item.fynn:{name}.name", en)]
        ansicht(textur, teile, WURZEL / "vorschau" / f"{satz}.png")
        print(f"gebaut: {satz} ({', '.join(teile)})")
    liste_pfad.write_text(json.dumps(liste, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    sprache(RES / "texts" / "de_DE.lang", deutsch)
    sprache(RES / "texts" / "en_US.lang", englisch)


if __name__ == "__main__":
    main()
