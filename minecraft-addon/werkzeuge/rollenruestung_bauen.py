#!/usr/bin/env python3
"""Baut die Ruestungen der Rollen: Magierrobe, Assassinen-Montur, Waldlaeufer.

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

Waldlaeufer, fuer den Bogenschuetzen, gruen mit braunem Leder (spaeter
dazugekommen - Fynn: "der Bogenschuetze braucht eine eigene
Spezialruestung", bis dahin trug er gefaerbtes Leder):
  * Kapuze - vorn offen, mit Stirnrand, Zipfel und einer Feder,
  * Wams - mit Koecherriemen quer ueber die Brust, Guertel und einem
    Koecher auf dem Ruecken, aus dem Pfeilfedern ueber die Schulter ragen,
  * Hose - Leder mit Knieflicken,
  * Stiefel - hoch, mit gruen gefuettertem Umschlag.

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
WALD = {
    "a": (122, 164, 82), "b": (88, 130, 60), "c": (64, 100, 46), "d": (46, 74, 34),
    "o": (32, 52, 26), "k": (18, 30, 14),
    "L": (156, 110, 66), "l": (118, 80, 46), "m": (88, 58, 34), "n": (62, 42, 26),
    "F": (236, 234, 226), "f": (196, 58, 48), "g": (150, 150, 146), "H": (132, 96, 58),
    "T": (156, 110, 66), "t": (118, 80, 46), "u": (62, 42, 26),
}
ASSASSINE = {
    "a": (100, 100, 114), "b": (72, 72, 84), "c": (52, 52, 62), "d": (38, 38, 46),
    "o": (28, 28, 34), "k": (14, 14, 18),
    "R": (196, 38, 48), "r": (132, 24, 32), "e": (255, 80, 70), "x": (6, 6, 8),
    "W": (206, 200, 186), "w": (160, 154, 142), "L": (120, 82, 52), "l": (84, 56, 36),
    "s": (196, 200, 208),
}

# Farbleitern, hell nach dunkel. Aus ihnen holt sich das Kantenlicht den
# naechsthelleren und naechstdunkleren Ton (siehe Atlas.kasten).
RAMPEN = {
    # Weiss (S) steht nicht in der blauen Leiter: Sonst wuerde jede helle
    # Faser an einer Oberkante zum weissen Fleck.
    "magier": ["abcdok", "SGg"],
    "assassine": ["abcdok", "eRr", "WwL", "Ll"],
    "wald": ["abcdok", "Llmn"],
}


def heller(z, rampen):
    for r in rampen:
        i = r.find(z)
        if i > 0:
            return r[i - 1]
    return z


def dunkler(z, rampen):
    for r in rampen:
        i = r.find(z)
        if 0 <= i < len(r) - 1:
            return r[i + 1]
    return z


# ============================================================ Stoffe
#
# Ein Stoff ist eine Funktion: Flaeche, Spalte, Zeile, Breite, Hoehe ->
# Farbzeichen (oder None fuer durchsichtig). "Flaeche" ist north (vorn,
# dem Betrachter zugewandt), south (hinten), east, west, up, down.

def grund(hell="b", mitte="c", dunkel="d", salz=0):
    """Ein Stoff: fast nur der Mittelton, dazu wenige einzelne helle und
    noch weniger dunkle Faeden.

    Die erste Fassung streute je ein Fuenfzehntel helle und dunkle
    Flecken, paarweise - im Spiel sah die Robe damit fleckig aus, eher
    schmutzig als gewebt ("ueberzeugt mich noch nicht"). Tiefe kommt jetzt
    aus dem Kantenlicht und den Falten, nicht aus dem Rauschen."""
    def stoff(f, x, y, w, h):
        z = streu(x, y + 17 * "nsewud".index(f[0]), salz)
        if z < 9:
            return hell
        if z > 250:
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

    def __init__(self, farben, breite=128, hoehe=128, rampen=()):
        self.farben = farben
        self.rampen = rampen
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

    def licht(self, flaeche, x, y, fw, fh, z, falten):
        """Kantenlicht, wie man Minecraft-Ruestungen schattiert: Licht von
        oben - die oberste Zeile jeder Seite einen Ton heller, die unterste
        einen dunkler, Deckel heller, Boden dunkler. Dazu auf Wunsch
        Falten: jede dritte Spalte ab dem oberen Drittel einen Ton dunkler,
        wie ein Stoff, der faellt."""
        if not self.rampen or z is None:
            return z
        if flaeche == "up":
            return heller(z, self.rampen)
        if flaeche == "down":
            return dunkler(z, self.rampen)
        # Nur die Oberkante hell. Eine dunkle Unterkante an jedem Kasten
        # zeichnete jede Kastengrenze nach - Fynn: "nicht ganz so kantig".
        if fh >= 4 and y == 0:
            return heller(z, self.rampen)
        if falten and fh >= 6 and y >= fh // 3 and x % 3 == 1:
            return dunkler(z, self.rampen)
        return z

    def kasten(self, ursprung, groesse, stoff, aufblasen=0.0, drehung=None, drehpunkt=None, falten=False):
        import math
        w, h, d = (max(1, math.ceil(g)) for g in groesse)
        masse = {"north": (w, h), "south": (w, h), "east": (d, h), "west": (d, h),
                 "up": (w, d), "down": (w, d)}
        uv = {}
        for flaeche, (fw, fh) in masse.items():
            u, v = self.feld(fw, fh)
            for y in range(fh):
                for x in range(fw):
                    z = self.licht(flaeche, x, y, fw, fh, stoff(flaeche, x, y, fw, fh), falten)
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
    a = Atlas(MAGIER, rampen=RAMPEN["magier"])
    blau = grund(salz=3)
    blau_hell = grund("a", "b", "c", salz=5)
    gold = grund("G", "G", "g", salz=7)

    def stern(mitte, flaeche):
        """Ein kleiner Stern: die Mitte hell, die vier Zacken Gold."""
        mx, my = mitte

        def s(f, x, y, w, h):
            if f != flaeche:
                return None
            if (x, y) == (mx, my):
                return "S"
            if abs(x - mx) + abs(y - my) == 1:
                return "G"
            return None
        return s

    def goldband(f, x, y, w, h):
        # Das Hutband: die unteren beiden Zeilen der Seiten.
        if f in ("up", "down"):
            return None
        return "G" if y >= h - 2 else None

    # Der Hut sitzt jetzt auf dem Kopf statt obendrauf. Fynn: "dass der Hut
    # ein bisschen besser sitzt" - in der ersten Fassung lag die Krempe auf
    # dem Scheitel, und von hinten sah man darunter die ganzen Haare. Jetzt
    # umschliesst der Hutkopf den oberen Kopf bis knapp ueber die Augen,
    # die Krempe sitzt auf Stirnhoehe, und die Spitze knickt in vier
    # Gliedern immer weiter nach hinten ab, bis sie fast waagerecht haengt.
    hut = [
        knochen("body"),
        knochen("head", [
            a.kasten([-4, 29, -4], (8, 4, 8), mit(blau_hell, stern((4, 1), "north"), goldband), 0.6),
            # Die Krempe rund statt quadratisch: zwei ueberkreuzte Platten
            # ergeben ein Achteck.
            a.kasten([-7, 28.6, -5], (14, 1, 10), mit(blau, saum("o", 1))),
            a.kasten([-5, 28.6, -7], (10, 1, 14), mit(blau, saum("o", 1))),
        ]),
        knochen("hut1", [a.kasten([-3, 33, -3], (6, 3, 6), blau_hell)],
                eltern="head", drehpunkt=[0, 33, 0], drehung=[-8, 0, 0]),
        knochen("hut2", [a.kasten([-2, 36, -2], (4, 3, 4), blau)],
                eltern="hut1", drehpunkt=[0, 36, 0], drehung=[-18, 0, 0]),
        knochen("hut3", [a.kasten([-1.5, 39, -1.5], (3, 2, 3), blau)],
                eltern="hut2", drehpunkt=[0, 39, 0], drehung=[-25, 0, 0]),
        knochen("hut4", [
            a.kasten([-1, 41, -1], (2, 2, 2), blau),
            # Ein goldenes Gloeckchen an der Spitze
            a.kasten([-0.5, 43, -0.5], (1, 1, 1), gold),
        ], eltern="hut3", drehpunkt=[0, 41, 0], drehung=[-30, 0, 0]),
    ]

    def guertel(f, x, y, w, h):
        if f in ("up", "down"):
            return None
        # Ein dunkler Guertel - in Gold ergab er mit der Borte ein Kreuz
        return "o" if y == 7 else ("k" if y == 8 else None)

    robe = [
        knochen("body", [
            a.kasten([-4, 12, -2], (8, 12, 4), mit(blau, borte_vorn("G", (3, 4)), guertel,
                                                   saum("g", 1), saum("G", 0, 1)), 0.55, falten=True),
            # Eine Tasche an der rechten Huefte, mit Goldknopf
            a.kasten([-5.4, 12.8, -1.2], (1.2, 2.4, 2.4), mit(voll("c"), saum("b", 0, 1))),
            a.kasten([-5.6, 14.2, -0.3], (0.4, 0.6, 0.6), gold),
            # Die Schliesse am Hals und die Guertelschnalle, beide Gold
            a.kasten([-1, 22, -3.4], (2, 1.5, 0.6), gold),
            a.kasten([-1.5, 15.5, -3.4], (3, 2, 0.6), gold),
        ]),
        # Der Umhang, in zwei Gliedern, damit er sich im Wind biegt: Das
        # obere haengt an den Schultern, das untere am oberen. Wie weit er
        # weht, liest die Animation vom Traeger (animation.fynn_ruestung.umhang).
        knochen("umhang", [
            a.kasten([-4.5, 12, 2.7], (9, 12, 0.5), mit(blau, stern((4, 5), "south")), falten=True),
        ], drehpunkt=[0, 24, 2.95]),
        knochen("umhang_unten", [
            a.kasten([-4.5, 3, 2.7], (9, 9, 0.5), mit(blau, saum("G", 1)), falten=True),
        ], eltern="umhang", drehpunkt=[0, 12, 2.95]),
        # Ein Stehkragen im Nacken, leicht nach hinten gestellt - statt der
        # goldenen Kloetze auf den Schultern, die im Spiel wie Fremdkoerper
        # aussahen.
        knochen("kragen", [
            a.kasten([-4.5, 24, 1.9], (9, 3, 1), mit(blau, saum("G", 0, 1))),
        ], drehpunkt=[0, 24, 2.4], drehung=[-15, 0, 0]),
        # Ein Zauberbuch an der linken Huefte, an einer Goldkette
        knochen("zauberbuch", [
            a.kasten([4.4, 11.5, -2], (1.5, 4, 3), mit(voll("o"), saum("G", 0, 1), saum("g", 1))),
            a.kasten([4.6, 15.5, -0.8], (0.6, 1, 0.6), gold),
        ], drehpunkt=[5, 15.5, 0], drehung=[0, 0, 8]),
    ]
    def runen(f, x, y, w, h):
        # Eine Reihe goldener Zeichen ueber dem Saum
        if f in ("up", "down"):
            return None
        return "G" if y == h - 2 and x % 2 == 0 else None

    rock = [
        knochen("body"),
        knochen("rightLeg", [
            a.kasten([-3.9, 2, -2], (4, 10, 4), mit(blau, runen), 0.45, falten=True),
            # Unten weiter: der Rock faellt glockig aus
            a.kasten([-4.3, 0, -2.4], (4.8, 2.5, 4.8), mit(blau, saum("G", 1)), 0.2),
        ]),
        knochen("leftLeg", [
            a.kasten([-0.1, 2, -2], (4, 10, 4), mit(blau, runen), 0.45, falten=True),
            a.kasten([-0.5, 0, -2.4], (4.8, 2.5, 4.8), mit(blau, saum("G", 1)), 0.2),
        ]),
    ]

    def schuh(x):
        return [
            a.kasten([x, 0, -2], (4, 3, 4), mit(blau, saum("k", 1)), 0.5),
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
    a = Atlas(ASSASSINE, rampen=RAMPEN["assassine"])
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
            a.kasten([-4, 24, -4], (8, 8, 8), ohne_x(mit(dunkel, kapuzenfront)), 0.6),
            # Oben abgerundet: eine schmalere Lage auf dem Scheitel
            a.kasten([-3.5, 32.4, -3.5], (7, 0.6, 7), dunkel),
            # Der Rand steht ueber die Stirn vor und wirft Schatten
            a.kasten([-4.2, 30.8, -5.1], (8.4, 1.2, 1.2), dunkler),
        ]),
        # Der Zipfel haengt hinten am Kopf herab. Die erste Fassung war
        # gedreht und stand als Klappe nach oben ab.
        knochen("zipfel", [
            a.kasten([-2, 27, 4.4], (4, 4, 1.5), dunkel),
            a.kasten([-1, 25, 4.8], (2, 2, 1), dunkler),
        ], eltern="head", drehpunkt=[0, 31, 5]),
    ]
    harnisch = [
        knochen("body", [
            a.kasten([-4, 12, -2], (8, 12, 4), mit(dunkel, schraeg_vorn("R", "r", -2),
                                                   saum("L", 2), saum("k", 0, 1)), 0.5),
            # Zwei Guerteltaschen, eine an jeder Huefte
            a.kasten([-5.2, 12.3, -1.5], (1.3, 2.2, 2.4), mit(grund("L", "L", "l", salz=47), saum("l", 0, 1))),
            a.kasten([3.9, 12.3, -1.5], (1.3, 2.2, 2.4), mit(grund("L", "L", "l", salz=53), saum("l", 0, 1))),
            # Der Schal um den Hals
            a.kasten([-4.5, 22.5, -3.3], (9, 2, 6.6), rot),
            # Zwei Wurfmesser in der Schaerpe
            a.kasten([1.2, 16, -3.4], (1, 3, 0.6), voll("s")),
            a.kasten([2.8, 15, -3.4], (1, 3, 0.6), voll("s")),
        ]),
        # Zwei Klingen in Scheiden, ueber Kreuz auf dem Ruecken - die
        # Griffe ragen ueber die Schultern.
        knochen("scheide_r", [
            a.kasten([-0.5, 13, 2.9], (1, 9, 0.8), mit(grund("L", "L", "l", salz=41), saum("l", 1))),
            a.kasten([-0.5, 22, 3.0], (1, 3, 0.6), voll("c")),
            a.kasten([-1.5, 21.6, 2.8], (3, 0.6, 1), voll("s")),
        ], drehpunkt=[0, 17, 3.3], drehung=[0, 0, 32]),
        knochen("scheide_l", [
            a.kasten([-0.5, 13, 3.6], (1, 9, 0.8), mit(grund("L", "L", "l", salz=43), saum("l", 1))),
            a.kasten([-0.5, 22, 3.7], (1, 3, 0.6), voll("c")),
            a.kasten([-1.5, 21.6, 3.5], (3, 0.6, 1), voll("s")),
        ], drehpunkt=[0, 17, 4], drehung=[0, 0, -32]),
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
            a.kasten([x, 0, -2], (4, 5, 4), mit(dunkler, saum("k", 1)), 0.6),
            # Runde Kappe vorn am Fuss
            a.kasten([x + 0.5, 0, -2.9], (3, 1.5, 1), dunkler),
            # Ein Riemen mit Schnalle
            a.kasten([x - 0.1, 2.2, -2.7], (4.2, 0.6, 5.4), voll("l")),
            a.kasten([x + 1.6, 2.1, -2.95], (0.8, 0.8, 0.4), voll("s")),
            # Umgeschlagener Schaft
            a.kasten([x - 0.4, 5, -2.4], (4.8, 1, 4.8), grund("L", "L", "l", salz=19)),
        ]
    stiefelpaar = [
        knochen("body"),
        knochen("rightLeg", stiefel(-3.9)),
        knochen("leftLeg", stiefel(-0.1)),
    ]
    return a.bild, {"assassinenkapuze": kapuze, "assassinenharnisch": harnisch,
                    "assassinenhose": hose, "assassinenstiefel": stiefelpaar}


# ============================================================ Waldlaeufer

def waldlaeufer():
    """Fuer den Bogenschuetzen: gruenes Tuch, braunes Leder, ein Koecher.

    Das Erkennungszeichen ist der Koecher auf dem Ruecken: schraeg, mit
    Pfeilfedern, die ueber der rechten Schulter herausschauen - von vorn
    wie von hinten sieht man, wer hier der Schuetze ist.
    """
    a = Atlas(WALD, rampen=RAMPEN["wald"])
    gruen = grund(salz=23)
    gruen_dunkel = grund("c", "d", "o", salz=29)
    leder = grund("L", "l", "m", salz=31)
    leder_dunkel = grund("l", "m", "n", salz=37)

    def gesicht_frei(f, x, y, w, h):
        # Vorn offen vom dritten Pixel an - Fynn will das Gesicht sehen.
        if f == "north" and y >= 2 and 1 <= x <= 6:
            return "X"
        return None

    def ohne_x(stoff):
        def s(f, x, y, w, h):
            z = stoff(f, x, y, w, h)
            return None if z == "X" else z
        return s

    kapuze = [
        knochen("body"),
        knochen("head", [
            a.kasten([-4, 24, -4], (8, 8, 8), ohne_x(mit(gruen, gesicht_frei)), 0.6),
            a.kasten([-3.5, 32.4, -3.5], (7, 0.6, 7), gruen),
            # Der Rand steht ueber die Stirn vor
            a.kasten([-4.2, 30.8, -5.1], (8.4, 1.2, 1.2), gruen_dunkel),
        ]),
        # Der Zipfel faellt hinten auf die Schultern
        knochen("zipfel", [
            a.kasten([-2.5, 26, 4.4], (5, 5, 1.5), gruen),
            a.kasten([-1.5, 23.5, 4.8], (3, 2.5, 1), gruen_dunkel),
        ], eltern="head", drehpunkt=[0, 31, 5]),
        # Eine Feder an der rechten Seite, schraeg nach hinten
        knochen("feder", [
            a.kasten([-5.9, 30, -1], (0.6, 5, 1.2), mit(voll("F"), saum("f", 0, 2))),
            a.kasten([-5.9, 29, -0.8], (0.6, 1, 0.8), voll("n")),
        ], eltern="head", drehpunkt=[-5.6, 29.5, -0.4], drehung=[-30, 0, 15]),
    ]

    def guertel(f, x, y, w, h):
        if f in ("up", "down"):
            return None
        if y in (8, 9):
            return "n" if y == 9 else "m"
        return None

    def schnuerung(f, x, y, w, h):
        if f in ("up", "down"):
            return None
        return "L" if (x + y) % 3 == 0 and 0 < y < h - 1 else None

    wams = [
        knochen("body", [
            a.kasten([-4, 12, -2], (8, 12, 4), mit(gruen, schraeg_vorn("l", "m", -1), guertel,
                                                   saum("o", 1), saum("L", 0, 1)), 0.5),
            # Eine Tasche am Guertel, rechts
            a.kasten([-5.1, 12.2, -1.6], (1.2, 2.4, 2.6), mit(leder, saum("n", 0, 1))),
            # Lederkragen
            a.kasten([-4.5, 22.5, -3], (9, 1.5, 6), leder),
            # Die Guertelschnalle
            a.kasten([-1, 14.5, -3.1], (2, 2, 0.5), voll("g")),
        ]),
        # Der Koecher: schraeg ueber den Ruecken, oben an der rechten
        # Schulter (x negativ), unten an der linken Huefte.
        # Der Armschutz des Bogenschuetzen am linken Unterarm - Leder mit
        # Schnuerung. Nur der Unterarm, die Hand bleibt frei.
        knochen("leftArm", [
            a.kasten([4, 13.5, -2], (4, 4, 4), mit(leder_dunkel, schnuerung), 0.35),
        ], eltern="body"),
        knochen("koecher", [
            # Rund statt kantig: zwei ueberkreuzte Kaesten
            a.kasten([-1.75, 11, 3], (3, 11, 3.5), mit(leder, saum("n", 1), saum("m", 0, 1))),
            a.kasten([-2, 11, 3.25], (3.5, 11, 3), mit(leder, saum("n", 1), saum("m", 0, 1))),
        ], drehpunkt=[0, 17, 4.5], drehung=[0, 0, -28]),
        # Pfeile im Koecher - nur zu sehen, wenn man Pfeile dabei hat
        # (animation.fynn_ruestung.koecher liest das vom Traeger).
        knochen("pfeile", [
            # Pfeilschaefte und Federn, die oben herausschauen
            # (eine Stufe hoeher als zuerst - so ragen die Federn auch von
            # vorn gesehen ueber die Schulter)
            a.kasten([-1.4, 22, 3.6], (0.8, 3, 0.8), voll("H")),
            a.kasten([0.1, 22, 4.6], (0.8, 3.5, 0.8), voll("H")),
            a.kasten([-1.7, 24.5, 3.3], (1.4, 2.6, 1.4), voll("F")),
            a.kasten([-0.2, 25, 4.3], (1.4, 2.6, 1.4), voll("f")),
            a.kasten([0.8, 23.8, 3.4], (1.2, 2.4, 1.2), voll("F")),
        ], eltern="koecher", drehpunkt=[0, 22, 4.5]),
    ]

    def knieflicken(f, x, y, w, h):
        if f in ("up", "down"):
            return None
        return "m" if 4 <= y <= 6 and 1 <= x <= w - 2 else None

    hose = [
        knochen("body"),
        knochen("rightLeg", [a.kasten([-3.9, 0, -2], (4, 12, 4), mit(leder, knieflicken), 0.5)]),
        knochen("leftLeg", [a.kasten([-0.1, 0, -2], (4, 12, 4), mit(leder, knieflicken), 0.5)]),
    ]

    def stiefel(x):
        return [
            a.kasten([x, 0, -2], (4, 6, 4), mit(leder_dunkel, saum("n", 1)), 0.6),
            a.kasten([x + 0.5, 0, -2.9], (3, 1.5, 1), leder_dunkel),
            # Umgeschlagener Schaft, gruen gefuettert
            a.kasten([x - 0.4, 6, -2.4], (4.8, 1.5, 4.8), gruen_dunkel),
        ]
    stiefelpaar = [
        knochen("body"),
        knochen("rightLeg", stiefel(-3.9)),
        knochen("leftLeg", stiefel(-0.1)),
    ]
    return a.bild, {"waldlaeuferkapuze": kapuze, "waldlaeuferwams": wams,
                    "waldlaeuferhose": hose, "waldlaeuferstiefel": stiefelpaar}


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
WALDKAPUZE = [
    "................",
    "..........F.....",
    "......kkkkFf....",
    ".....kaabbkf....",
    "....kaabbbbck...",
    "...kaabbbbbbck..",
    "...kabkkkkkcck..",
    "...kabk....kck..",
    "...kabk....kck..",
    "...kabk....kck..",
    "...kaabkkkkbcck.",
    "...kabbbbbbccck.",
    "....kbbbbbcccdk.",
    ".....kkkkkkdddk.",
    "..............k.",
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

    def riemen(x, y, z):
        if z in ".ko":
            return z
        d = x - y
        if d == -1:
            return "l"
        if d == -2:
            return "m"
        return "n" if y == 10 else z

    w = WALD
    return {
        "waldlaeuferkapuze": symbol(WALDKAPUZE, w, {}),
        "waldlaeuferwams": symbol(BRUST, w, {}, riemen),
        "waldlaeuferhose": symbol(HOSE, {**w, "a": w["L"], "b": w["l"], "c": w["m"], "d": w["n"]},
                                  {"T": "a", "t": "c", "u": "k"}),
        "waldlaeuferstiefel": symbol(STIEFEL, {**w, "a": w["l"], "b": w["m"], "c": w["n"]},
                                     {"T": "b", "t": "d", "u": "k"}),
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
    "waldlaeuferkapuze":  ("head", 2, 200, "Waldläuferkapuze", "Ranger Hood"),
    "waldlaeuferwams":    ("chest", 4, 280, "Waldläuferwams", "Ranger Jerkin"),
    "waldlaeuferhose":    ("legs", 3, 260, "Waldläuferhose", "Ranger Trousers"),
    "waldlaeuferstiefel": ("feet", 1, 220, "Waldläuferstiefel", "Ranger Boots"),
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
    # Waldlaeufer aus gruener Wolle und Leder; die Kapuze traegt eine Feder,
    # das Wams einen Pfeil fuer den Koecher.
    "waldlaeuferkapuze":  (["GFG", "G G"], {"G": "minecraft:green_wool", "F": "minecraft:feather"}),
    "waldlaeuferwams":    (["L L", "GAG", "LLL"], {"L": "minecraft:leather", "G": "minecraft:green_wool",
                                                   "A": "minecraft:arrow"}),
    "waldlaeuferhose":    (["LLL", "G G", "L L"], {"L": "minecraft:leather", "G": "minecraft:green_wool"}),
    "waldlaeuferstiefel": (["G G", "L L"], {"G": "minecraft:green_wool", "L": "minecraft:leather"}),
}
REPARATUR = {"magier": "minecraft:blue_wool", "assassinen": "minecraft:leather",
             "waldlaeufer": "minecraft:leather"}


def gegenstand(name):
    slot, schutz, haltbar, _, _ = TEILE[name]
    slot_name, verzauber, gruppe = SLOT[slot]
    reparatur = next(v for k, v in REPARATUR.items() if name.startswith(k))
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


# ============================================================ Bewegung

# Was an den Ruestungen sich bewegt. Die Werte kommen vom Traeger
# (c.owning_entity), berechnet in der Spielerdatei (spieler_animation_bauen):
# fynn_umhang - wie weit der Wind den Umhang hebt, in Grad
# fynn_tempo  - wie schnell man geht, 0 bis 1
# fynn_gang   - der Schritttakt, derselbe wie der der Beine
# fynn_pfeile - 1, wenn Pfeile im Inventar sind
# Eine Statue gibt feste Werte vor (statue_bauen).
U = "(c.owning_entity->v.fynn_umhang)"
T = "(c.owning_entity->v.fynn_tempo)"
G = "(c.owning_entity->v.fynn_gang)"
P = "(c.owning_entity->v.fynn_pfeile)"
R = "(c.owning_entity->v.fynn_rucksack)"

BEWEGUNGEN = {
    # Der Umhang weht nach hinten, je schneller, desto hoeher; das untere
    # Glied schwingt nach, so biegt er sich wie Stoff. Dazu ein Flattern.
    "animation.fynn_ruestung.umhang": {
        # Traegt man einen Rucksack, faellt der Umhang von den Schultern
        # schraeg ueber ihn, statt mitten hindurch (v.fynn_rucksack, siehe
        # rucksack_bauen.py); unten haengt er wieder gerader.
        "umhang": {"rotation": [f"{U} + {R} * 38.0 + math.sin(q.life_time * 400.0) * 2.0 * {T}", 0.0,
                               f"math.sin(q.life_time * 230.0) * 1.5 * {T}"]},
        "umhang_unten": {"rotation": [f"{U} * 0.4 - {R} * 20.0 + math.sin(q.life_time * 400.0 - 70.0) * 4.0 * {T}",
                                     0.0, 0.0]},
    },
    # Die Hutspitze wippt bei jedem Schritt und legt sich im Wind zurueck.
    "animation.fynn_ruestung.hutspitze": {
        "hut3": {"rotation": [f"-{U} * 0.15 + math.sin({G} * 2.0) * 4.0 * {T}", 0.0,
                              f"math.sin({G}) * 5.0 * {T}"]},
        "hut4": {"rotation": [f"-{U} * 0.2 + math.sin({G} * 2.0 - 40.0) * 6.0 * {T}", 0.0,
                              f"math.sin({G} - 30.0) * 7.0 * {T}"]},
    },
    "animation.fynn_ruestung.zipfel": {
        "zipfel": {"rotation": [f"{U} * 0.5 + math.sin(q.life_time * 380.0) * 2.0 * {T}", 0.0, 0.0]},
    },
    "animation.fynn_ruestung.schal": {
        "schalende": {"rotation": [f"{U} * 0.9 + math.sin(q.life_time * 420.0) * 5.0 * {T}", 0.0,
                                   f"math.sin(q.life_time * 260.0) * 4.0 * {T}"]},
    },
    "animation.fynn_ruestung.feder": {
        "feder": {"rotation": [f"-{U} * 0.2", 0.0,
                               f"math.sin({G} * 2.0) * 6.0 * {T} + math.sin(q.life_time * 500.0) * 1.5 * {T}"]},
    },
    # Pfeile nur, wenn man welche hat; der Koecher klappert beim Gehen.
    "animation.fynn_ruestung.koecher": {
        "pfeile": {"scale": P},
        "koecher": {"rotation": [0.0, 0.0, f"math.sin({G} * 2.0) * 2.0 * {T}"]},
    },
}
BEWEGT = {
    "magierhut": ["hutspitze"],
    "magierrobe": ["umhang"],
    "assassinenkapuze": ["zipfel"],
    "assassinenharnisch": ["schal"],
    "waldlaeuferkapuze": ["zipfel", "feder"],
    "waldlaeuferwams": ["koecher"],
}


def bewegungen():
    return {"format_version": "1.10.0", "animations": {
        name: {"loop": True, "bones": knochen} for name, knochen in BEWEGUNGEN.items()}}


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
    if name in BEWEGT:
        beschreibung["animations"] = {k: f"animation.fynn_ruestung.{k}" for k in BEWEGT[name]}
        beschreibung["scripts"] = {"animate": list(BEWEGT[name])}
    # Hose und Schuhe blenden die zweite Hautschicht der Beine aus, wie
    # beim Ritter - sonst schaut sie durch den Stoff.
    if slot == "legs":
        beschreibung.setdefault("scripts", {})["parent_setup"] = "variable.leg_layer_visible = 0.0;"
    if slot == "feet":
        beschreibung.setdefault("scripts", {})["parent_setup"] = "variable.boot_layer_visible = 0.0;"
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
                               ("assassinenmontur", "assassinen_stoff", assassinenmontur),
                               ("waldlaeufer", "waldlaeufer_stoff", waldlaeufer)):
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
    schreibe(RES / "animations" / "rollenruestung.animation.json", bewegungen())
    liste_pfad.write_text(json.dumps(liste, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    sprache(RES / "texts" / "de_DE.lang", deutsch)
    sprache(RES / "texts" / "en_US.lang", englisch)


if __name__ == "__main__":
    main()
