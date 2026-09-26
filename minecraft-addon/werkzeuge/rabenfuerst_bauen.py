#!/usr/bin/env python3
"""Der zweite Boss: Morvan, der Rabenfuerst - Koenig aller Banditen.

Fynn: "Mach jetzt bitte zwei weitere Bosse, ich lasse dir da Freiraum -
mach aber auch mit den Sachen, die du jetzt gelernt hast."

Roland ist schwer, gepanzert, stellt sich dem Kampf. Morvan ist das
Gegenteil: schlank, schnell, hinterhaeltig. Er wirft Dolche im Faecher,
verschwindet in einer Rauchbombe und steht ploetzlich hinter dir, schickt
Schattendoppelgaenger vor, laesst einen Rabenschwarm los. In Phase zwei
wird er zur Schattengestalt: Die Naht seines Mantels glueht violett, und
er bringt die Nacht der Raben - Dunkelheit fuer alle.

Er passt zu den Banditen (banditen_bauen.py): dieselbe rote Schaerpe wie
ihr Kopftuch, dazu der schwarze Federumhang, die silberne Rabenschnabel-
Maske mit violetten Augen, zwei Dolche und ein Rabe auf der Schulter.

Gebaut mit dem, was an Roland gelernt ist (boss_kern.py, boss_kern.js):
zwei Phasen mit je einer vollen Leiste, Aufladen unverwundbar,
Staerke je Spielerzahl, Beute fuer jeden Mitkaempfer.

    python3 werkzeuge/rabenfuerst_bauen.py [--bilder vorschau]
"""

import json
import math
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boss_kern as bk                                          # noqa: E402
import tiermodell as tm                                         # noqa: E402
from tiermodell import Modell, hexfarbe, mische, streu          # noqa: E402
from roland_bauen import Ruestung, randabstand                  # noqa: E402

RES = bk.RES
VER = bk.VER
TYP = "fynn:rabenfuerst"
NAME = "rabenfuerst"
PRAEFIX = "animation.fynn.rabenfuerst."
HAND_R = [-6.0, 11.5, 0.0]
HAND_L = [6.0, 11.5, 0.0]


def tm_ton(*a, **k):
    from tiere_gestalt import ton
    return ton(*a, **k)


# ============================================================ Rabendolch

# Ein gebogener Dolch: dunkler Stahl mit heller Schneide, violette Rinne,
# Parierstange aus Silber wie Rabenschwingen, schwarzes Leder, Knauf ein
# silberner Rabenkopf. Klein - er fuehrt zwei davon.
RABENDOLCH = {
    "karte": [
        "...w...",
        "..wsd..",
        "..wvd..",
        "..wvd..",
        "..wvd..",
        "..wvd..",
        "..wvd..",
        "..wsd..",
        "sSSSSSs",
        ".s.L.s.",
        "...L...",
        "...l...",
        "...L...",
        "..SSS..",
        "...S...",
    ],
    "farben": {
        "w": (214, 218, 228), "s": (150, 154, 170), "d": (74, 76, 92),
        "v": (140, 70, 210),                                   # violette Rinne
        "S": (200, 204, 216),                                  # Silber
        "L": (40, 32, 36), "l": (24, 20, 24),                  # schwarzes Leder
    },
    "tiefe": {"w": 1.0, "s": 1.5, "d": 1.0, "v": 1.5, "S": 2.0, "L": 2.0, "l": 2.0},
    "mitte": 3.5,
    "griff": "Ll",
}
DOLCH_GLUT = {1: {"v"}, 2: {"v", "w"}}


def dolch_modell(ordner):
    import waffe_bauen as w
    v = RABENDOLCH
    gp, bp = Path(ordner) / "rabendolch.geo.json", Path(ordner) / "rabendolch.png"
    w.aus_zeichenkarte("rabendolch", v["karte"], {k: f + (255,) for k, f in v["farben"].items()},
                       dicke=lambda zeile, spalte, zeichen: v["tiefe"][zeichen], mitte=v["mitte"],
                       ziel_modell=str(gp), ziel_textur=str(bp))
    return json.loads(gp.read_text(encoding="utf-8"))["minecraft:geometry"][0], Image.open(bp).convert("RGBA")


# ============================================================ Gestalt

def gestalt():
    """Schlank und gross: Rumpf acht breit wie ein Mensch, aber lange Beine
    und ein hoher Kragen; im Spiel ein Siebtel groesser. Die Knochen:
    Huefte und Oberkoerper getrennt (er dreht sich in jeden Stich), die
    Mantelschoesse hinten zum Wehen, der Rabe auf der linken Schulter mit
    eigenem Kopf, zwei Haende fuer zwei Dolche."""
    m = Modell(NAME, sichtbreite=3, sichthoehe=3.5)
    r = Ruestung()
    k = r.kasten

    m.knoch("wurzel", [0, 0, 0])
    huefte = m.knoch("huefte", [0, 12, 0], "wurzel")
    k(huefte, [-4.5, 10.5, -2.5], [9, 2, 5], "schaerpe")
    k(huefte, [2.5, 7.5, -2.7], [2, 3, 1], "schaerpe_ende")             # der Knoten haengt
    k(huefte, [-4, 10, -2.9], [1, 2, 1], "wurfmesser")
    k(huefte, [-2.5, 10, -2.9], [1, 2, 1], "wurfmesser")
    k(huefte, [-1, 10, -2.9], [1, 2, 1], "wurfmesser")

    for seite, name in ((-1, "rechtes_bein"), (1, "linkes_bein")):
        x0 = -4 if seite < 0 else 0
        b = m.knoch(name, [2 * seite, 12, 0], "huefte")
        k(b, [x0, 0, -2], [4, 12, 4], "hose")
        k(b, [x0 - 0.5, 0, -2.5], [5, 5, 5], "stiefel")
        k(b, [x0 - 0.5, 0, -3.5], [5, 2, 1], "stiefel")                # Spitze

    mantel = m.knoch("mantel", [0, 11, 2.2], "huefte")
    k(mantel, [-4.5, 1, 2], [9, 10, 1], "mantel")

    koerper = m.knoch("koerper", [0, 12, 0], "huefte")
    k(koerper, [-4, 12, -2], [8, 12, 4], "rock")
    k(koerper, [-4.5, 20, -2.5], [9, 5, 5], "kragen")
    federn = m.knoch("federn", [0, 24, 0], "koerper")
    k(federn, [-6, 21, -3], [12, 3, 6], "federn")
    k(federn, [-7, 18, -3], [2, 4, 6], "federn")
    k(federn, [5, 18, -3], [2, 4, 6], "federn")
    k(federn, [-5, 17, 2.5], [10, 5, 1], "federn")                     # Federkragen am Ruecken

    kopf = m.knoch("kopf", [0, 24, 0], "koerper")
    k(kopf, [-4, 24, -4], [8, 8, 8], "haube")
    k(kopf, [-4.5, 24, -4.5], [9, 9, 9], "kapuze", aufblasen=0.1)
    k(kopf, [-2, 30, 3.5], [4, 3, 3], "kapuze")                        # Zipfel
    k(kopf, [-3.5, 25.5, -5], [7, 5, 1], "maske")
    k(kopf, [-1.5, 25, -8], [3, 3, 3], "schnabel")
    k(kopf, [-1, 24.5, -10], [2, 2, 2], "schnabel")

    for seite, name in ((-1, "rechter_arm"), (1, "linker_arm")):
        x0 = -8 if seite < 0 else 4
        a = m.knoch(name, [5 * seite, 22, 0], "koerper")
        k(a, [x0, 12, -2], [4, 12, 4], "aermel")
        k(a, [x0 - 0.5, 11.5, -2.5], [5, 4, 5], "handschuh")
        m.knoch("rechte_hand" if seite < 0 else "linke_hand", HAND_R if seite < 0 else HAND_L, name)

    rabe = m.knoch("rabe", [6, 24, 0], "koerper")
    k(rabe, [5, 24, -2], [3, 3, 4], "rabe")
    k(rabe, [5.5, 23.5, 2], [2, 1, 3], "rabe")                          # Schwanz
    rkopf = m.knoch("rabe_kopf", [6.5, 26.5, -2], "rabe")
    k(rkopf, [5.5, 26, -4], [2, 2, 2], "rabe_kopf")
    k(rkopf, [6, 26.5, -5.5], [1, 1, 2], "rabe_schnabel")
    return m, r


# ============================================================ Malen

# Nicht ganz schwarz: Ein Mantel aus reinem Schwarz ist im Spiel ein Loch -
# man sieht keine Form. Kohle mit einem Hauch Violett.
KOHLE = "#3b3446"
KOHLE_D = "#2b2533"
LEDER = "#3e2d24"
ROT = "#8e1d27"          # die Schaerpe - rot wie das Kopftuch der Banditen
FEDER = "#221d2b"
FEDER_GLANZ = "#5d468c"
KNOCHEN = "#d9d2c3"
SILBER = (200, 204, 216)
AUGE_1 = (196, 120, 255, 254)
AUGE_2 = (236, 190, 255, 254)
SCHATTEN = (168, 92, 255, 254)


def maler(r, phase):
    glut = SCHATTEN

    def male(stoff_name, p, n, texel):
        stoff = stoff_name.split("|")[0]
        lo, hi = r.grenzen[stoff_name]
        rand = randabstand(p, n, (lo, hi))
        vorn = n[2] < -0.5
        hinten = n[2] > 0.5
        licht = 0.08 if n[1] > 0.5 else (-0.1 if n[1] < -0.5 else 0.0)
        if stoff == "rock":
            # Der Mantel: vorn eine Knopfleiste aus Silber, in Phase zwei
            # gluehen die Naehte.
            if vorn and abs(p[0]) < 0.6:
                return SILBER if int(p[1]) % 3 == 0 else tm_ton(KOHLE_D, p, n, texel, 501)
            if phase == 2 and rand < 0.6 and not n[1] > 0.5:
                return glut
            return tm_ton(KOHLE, p, n, texel, 502, hell=licht, wolke=0.06)
        if stoff in ("kragen",):
            if phase == 2 and hi[1] - p[1] < 0.6:
                return glut
            # Vorn die Fibel: ein silberner Rabenkopf haelt den Umhang.
            if vorn and abs(p[0]) < 1.1 and 21.5 < p[1] < 23.5:
                return SILBER if not (abs(p[0]) < 0.5 and p[1] > 22.5) else AUGE_1
            return tm_ton(KOHLE_D, p, n, texel, 503, hell=licht)
        if stoff == "mantel":
            if phase == 2 and (min(p[0] - lo[0], hi[0] - p[0]) < 0.7 or p[1] - lo[1] < 0.7):
                return glut
            # Der Saum ist zerfetzt: unten Zacken in Stufen, fast schwarz.
            # (Durchsichtig geht nicht - das Material nutzt Alpha zum Leuchten.)
            if p[1] - lo[1] < 2 and int(p[0] * 1.5) % 2 == 0:
                return (14, 12, 17)
            return tm_ton(KOHLE, p, n, texel, 504, hell=licht - 0.04, wolke=0.07)
        if stoff == "federn":
            # Federn: Schuppen in Reihen, jede Spitze mit violettem Glanz.
            reihe = int((hi[1] - p[1]) // 1.5)
            spitze = (int(p[0] + reihe) % 2 == 0) and ((hi[1] - p[1]) % 1.5 > 1.0)
            if spitze:
                return glut if phase == 2 else tm_ton(FEDER_GLANZ, p, n, texel, 505)
            return tm_ton(FEDER, p, n, texel, 506, hell=licht, wolke=0.05)
        if stoff == "schaerpe":
            if vorn and abs(p[0] - 3.5) < 0.6:
                return SILBER                                     # Schnalle
            return tm_ton(ROT, p, n, texel, 507, hell=licht)
        if stoff == "schaerpe_ende":
            if p[1] - lo[1] < 0.6:
                return tm_ton("#5e1219", p, n, texel, 508)
            return tm_ton(ROT, p, n, texel, 507, hell=licht)
        if stoff == "wurfmesser":
            return SILBER if p[1] > 11 else tm_ton(LEDER, p, n, texel, 509)
        if stoff == "hose":
            return tm_ton("#342d39", p, n, texel, 510, hell=licht)
        if stoff == "stiefel":
            if hi[1] - p[1] < 1 and not n[1] < -0.5:
                return tm_ton("#5a4232", p, n, texel, 511)       # Stulpe
            return tm_ton(LEDER, p, n, texel, 512, hell=licht)
        if stoff == "aermel":
            if phase == 2 and n[0] != 0 and abs(p[2]) < 0.5:
                return glut
            return tm_ton(KOHLE, p, n, texel, 513, hell=licht)
        if stoff == "handschuh":
            if hi[1] - p[1] < 1:
                return SILBER if int(p[0] + p[2]) % 2 == 0 else tm_ton(LEDER, p, n, texel, 514)
            return tm_ton(LEDER, p, n, texel, 515, hell=licht)
        if stoff in ("haube",):
            return tm_ton("#1a151f", p, n, texel, 516)
        if stoff == "kapuze":
            if phase == 2 and vorn and rand < 0.6:
                return glut
            return tm_ton(KOHLE_D, p, n, texel, 517, hell=licht, wolke=0.05)
        if stoff == "maske":
            if vorn:
                # Die Augen: schmale violette Schlitze, in Phase zwei grell.
                if 28 <= p[1] < 29.2 and 1.0 <= abs(p[0]) < 3.0:
                    return AUGE_2 if phase == 2 else AUGE_1
                if 27.2 <= p[1] < 28 and 1.0 <= abs(p[0]) < 3.0:
                    return (30, 24, 36)
            return tm_ton(KNOCHEN, p, n, texel, 518, hell=licht, wolke=0.04)
        if stoff == "schnabel":
            if abs(p[0]) > 0.5 and 26 < p[1] < 27 and n[0] != 0:
                return (60, 56, 64)                               # Nasenloch
            return tm_ton(KNOCHEN, p, n, texel, 519, hell=licht - 0.04)
        if stoff == "rabe":
            if n[1] > 0.5 and int(p[2]) % 2 == 0:
                return tm_ton(FEDER_GLANZ, p, n, texel, 520)
            return tm_ton(FEDER, p, n, texel, 521, hell=licht)
        if stoff == "rabe_kopf":
            if vorn or abs(n[0]) > 0.5:
                if 26.8 < p[1] < 27.6 and (abs(n[0]) > 0.5):
                    return AUGE_2 if phase == 2 else AUGE_1
            return tm_ton(FEDER, p, n, texel, 522, hell=licht)
        if stoff == "rabe_schnabel":
            return (54, 50, 58)
        return (255, 0, 255)
    return male


# ============================================================ Zusammenbau

def mit_dolchen(geo, bilder, dgeo, dbild):
    """Zwei Dolche, einer in jeder Hand, im Rueckhandgriff: die Klinge zeigt
    nach unten hinten am Unterarm entlang - der Griff der Messerkaempfer.
    Beide Kaesten-Saetze teilen sich dasselbe Feld im Bild."""
    g = json.loads(json.dumps(geo["minecraft:geometry"][0]))
    griff = {RABENDOLCH["farben"][z] for z in RABENDOLCH["griff"]}
    kaesten = [c for b in dgeo["bones"] for c in b.get("cubes", [])]
    punkte = []
    for c in kaesten:
        u, v = c["uv"]["north"]["uv"]
        if dbild.getpixel((int(u), int(v)))[:3] in griff:
            punkte.append([c["origin"][i] + c["size"][i] / 2 for i in range(3)])
    mitte = [sum(p[i] for p in punkte) / len(punkte) for i in range(3)]
    unten = bilder[0].height
    for hand, seite in ((HAND_R, "rechts"), (HAND_L, "links")):
        versatz = [hand[i] - mitte[i] for i in range(3)]
        neu = []
        for c in kaesten:
            c = json.loads(json.dumps(c))
            c["origin"] = [c["origin"][i] + versatz[i] for i in range(3)]
            if "pivot" in c:
                c["pivot"] = [c["pivot"][i] + versatz[i] for i in range(3)]
            for f in c["uv"].values():
                f["uv"] = [f["uv"][0], f["uv"][1] + unten]
            neu.append(c)
        eltern = "rechte_hand" if seite == "rechts" else "linke_hand"
        # Rueckhandgriff: die Klinge (im Modell nach oben) zeigt nach unten.
        g["bones"].append({"name": f"dolch_{seite}", "parent": eltern, "pivot": hand, "rotation": [180, 0, 0]})
        g["bones"].append({"name": f"dolch_{seite}_klinge", "parent": f"dolch_{seite}", "pivot": hand,
                           "rotation": [0, 90, 0], "cubes": neu})
    breite = max(bilder[0].width, dbild.width)
    aus = []
    for phase, grund in ((1, bilder[0]), (2, bilder[1])):
        b = Image.new("RGBA", (breite, unten + dbild.height), (0, 0, 0, 0))
        b.paste(grund, (0, 0))
        d = dbild.copy()
        leuchtend = {RABENDOLCH["farben"][z] for z in DOLCH_GLUT[phase]}
        for y in range(d.height):
            for x in range(d.width):
                f = d.getpixel((x, y))
                if f[3] and f[:3] in leuchtend:
                    d.putpixel((x, y), f[:3] + (254,))
        b.paste(d, (0, unten))
        aus.append(b)
    hoehe = 16
    while hoehe < aus[0].height:
        hoehe *= 2
    aus = [b.crop((0, 0, breite, hoehe)) for b in aus]
    g["description"] = dict(g["description"], identifier=f"geometry.fynn.{NAME}", texture_width=breite,
                            texture_height=hoehe)
    return {"format_version": "1.12.0", "minecraft:geometry": [g]}, aus


def bauen():
    m, r = gestalt()
    geo = m.geometrie()
    h1, h2 = m.male(maler(r, 1)), m.male(maler(r, 2))
    with tempfile.TemporaryDirectory() as ordner:
        dgeo, dbild = dolch_modell(ordner)
    return mit_dolchen(geo, (h1, h2), dgeo, dbild)


# ============================================================ Bewegung

# Die Grundhaltung eines Messerkaempfers: tief, seitlich, beide Dolche vor
# dem Koerper, die Klingen nach unten gedreht (Rueckhandgriff).
HALTUNG = {
    "huefte": [0, 25, 0], "koerper": [16, -25, 0], "kopf": [-12, 0, 0],
    "rechtes_bein": [-24, 10, 8], "linkes_bein": [22, -8, -6],
    "rechter_arm": [-50, -10, 10], "rechte_hand": [120, 0, 0],
    "linker_arm": [-70, 20, -10], "linke_hand": [120, 0, 0],
    "mantel": [14, 0, 0], "rabe": [0, 0, 0], "rabe_kopf": [0, 0, 0],
}
TIEF = -1.5     # so tief steht er immer (Verschiebung der Wurzel)


def grund():
    g = bk.grundpose(HALTUNG, ["wurzel", "federn", "dolch_rechts", "dolch_links"])
    g["wurzel"]["position"] = [0.0, TIEF, 0.0]
    return g


def ablauf(laenge, bilder, **weiter):
    return bk.ablauf(grund(), laenge, bilder, **weiter)


def haltung():
    knochen = {k: {"rotation": list(v)} for k, v in HALTUNG.items()}
    knochen["koerper"]["rotation"][0] = "16.0 + math.sin(query.life_time * 110.0) * 2.0"
    knochen["rechter_arm"]["rotation"][0] = "-50.0 + math.sin(query.life_time * 110.0 + 40.0) * 3.0"
    knochen["linker_arm"]["rotation"][0] = "-70.0 + math.sin(query.life_time * 110.0 + 80.0) * 3.0"
    knochen["mantel"]["rotation"][0] = "14.0 + math.sin(query.life_time * 80.0) * 3.0"
    # Der Rabe ruckt mit dem Kopf, wie Raben das tun: in Stufen.
    knochen["rabe_kopf"]["rotation"] = ["math.floor(math.sin(query.life_time * 60.0) * 2.0) * 10.0",
                                        "math.floor(math.sin(query.life_time * 45.0 + 30.0) * 2.0) * 20.0", 0.0]
    knochen["wurzel"] = {"position": [0.0, f"{TIEF} + math.sin(query.life_time * 110.0) * 0.2", 0.0]}
    return {"loop": True, "bones": knochen}


def gang():
    t = "query.anim_time * 34.0"
    return {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": {
        "rechtes_bein": {"rotation": [f"math.cos({t}) * 32.0", 0.0, 0.0]},
        "linkes_bein": {"rotation": [f"-math.cos({t}) * 32.0", 0.0, 0.0]},
        "huefte": {"rotation": [0.0, f"math.cos({t}) * 8.0", 0.0]},
        "koerper": {"rotation": [f"math.abs(math.sin({t})) * 4.0", f"-math.cos({t}) * 10.0", 0.0]},
        "wurzel": {"position": [0.0, f"-math.abs(math.sin({t})) * 0.8", 0.0]},
        "mantel": {"rotation": [f"16.0 + math.abs(math.sin({t})) * 10.0", 0.0, 0.0]},
    }}


def hieb_links():
    return ablauf(0.55, [
        (0.14, {"koerper": [8, 30, 0], "linker_arm": [-140, 40, -30], "linke_hand": [40, 0, 0],
                "huefte": [0, 30, 0]}),
        (0.26, {"koerper": [18, -40, 0], "linker_arm": [-50, -50, 10], "linke_hand": [70, 0, 0],
                "mantel": [30, 0, 0]}),
        (0.38, {"koerper": [20, -46, 0], "linker_arm": [-30, -60, 20]}),
    ])


def hieb_rechts():
    return ablauf(0.55, [
        (0.14, {"koerper": [8, -50, 0], "rechter_arm": [-140, -40, 30], "rechte_hand": [40, 0, 0],
                "huefte": [0, 10, 0]}),
        (0.26, {"koerper": [18, 20, 0], "rechter_arm": [-50, 50, -10], "rechte_hand": [70, 0, 0],
                "mantel": [30, 0, 0]}),
        (0.38, {"koerper": [20, 26, 0], "rechter_arm": [-30, 60, -20]}),
    ])


def hieb_kreuz():
    return ablauf(0.7, [
        (0.2, {"rechter_arm": [-160, 20, 10], "linker_arm": [-160, -20, -10], "rechte_hand": [20, 0, 0],
               "linke_hand": [20, 0, 0], "koerper": [-10, 0, 0], "huefte": [0, 0, 0],
               "wurzel": {"position": [0, -0.5, 0]}}),
        (0.34, {"rechter_arm": [-40, 40, -20], "linker_arm": [-40, -40, 20], "rechte_hand": [80, 0, 0],
                "linke_hand": [80, 0, 0], "koerper": [26, 0, 0], "wurzel": {"position": [0, -2.5, -1.5]},
                "mantel": [40, 0, 0]}),
        (0.48, {"koerper": [24, 0, 0]}),
    ])


# Die Arme vor der Brust gekreuzt, die Dolche an den Schultern.
ARME_GEKREUZT = {"rechter_arm": [-80, -55, 0], "linker_arm": [-80, 55, 0],
                 "rechte_hand": [140, 0, 0], "linke_hand": [140, 0, 0]}
KNIEN = {"wurzel": {"position": [0, -5.0, 0]}, "rechtes_bein": [-88, 6, 0], "linkes_bein": [12, -4, 0]}


def dolchfaecher():
    """Die Arme kreuzen, dann auseinander - aus beiden Haenden fliegen die
    Wurfmesser im Faecher (0,5 s)."""
    return ablauf(1.3, [
        (0.35, dict(ARME_GEKREUZT, koerper=[-6, 0, 0], huefte=[0, 0, 0], kopf=[-4, 0, 0],
                    wurzel={"position": [0, -2.0, 0]})),
        (0.50, {"rechter_arm": [-95, 70, 30], "linker_arm": [-95, -70, -30], "rechte_hand": [60, 0, 0],
                "linke_hand": [60, 0, 0], "koerper": [14, 0, 0], "mantel": [36, 0, 0],
                "wurzel": {"position": [0, -1.0, 0]}}),
        (0.75, {"rechter_arm": [-80, 60, 20], "linker_arm": [-80, -60, -20]}),
    ])


def rauchbombe():
    """Die Rauchbombe vor die Fuesse (0,3 s), tief in den Rauch - weg
    (unsichtbar 0,45 bis 1,4 s) -, und hinter dem Gegner im Ausfall mit
    beiden Klingen (Stich bei 1,55 s)."""
    return ablauf(2.4, [
        (0.20, {"rechter_arm": [-150, 0, 10], "rechte_hand": [60, 0, 0], "koerper": [-8, -20, 0]}),
        (0.32, {"rechter_arm": [-20, 0, 10], "koerper": [30, -10, 0], "wurzel": {"position": [0, -3.5, 0]},
                "mantel": [50, 0, 0]}),
        (0.45, {"koerper": [40, 0, 0], "wurzel": {"position": [0, -4.5, 0]}}),
        (1.40, dict(ARME_GEKREUZT, koerper=[20, 0, 0], huefte=[0, 0, 0], wurzel={"position": [0, -3.0, 1.0]})),
        (1.55, {"rechter_arm": [-100, 10, 0], "linker_arm": [-100, -10, 0], "rechte_hand": [95, 0, 0],
                "linke_hand": [95, 0, 0], "koerper": [30, 0, 0], "rechtes_bein": [-40, 0, 0],
                "linkes_bein": [30, 0, 0], "wurzel": {"position": [0, -2.5, -3.0]}, "mantel": [40, 0, 0]}),
        (1.80, {"koerper": [26, 0, 0], "wurzel": {"position": [0, -2.2, -3.0]}}),
    ])


def doppelgaenger():
    """Die Arme weit, der Kopf gesenkt - die Schatten loesen sich (0,9 s)."""
    return ablauf(1.8, [
        (0.40, {"rechter_arm": [-10, 0, 75], "linker_arm": [-10, 0, -75], "rechte_hand": [180, 0, 0],
                "linke_hand": [180, 0, 0], "kopf": [30, 0, 0], "koerper": [-6, 0, 0], "huefte": [0, 0, 0],
                "wurzel": {"position": [0, -0.5, 0]}, "mantel": [30, 0, 0]}),
        (0.85, {"kopf": [34, 0, 0], "rechter_arm": [-20, 0, 85], "linker_arm": [-20, 0, -85]}),
        (0.95, dict(ARME_GEKREUZT, kopf=[-14, 0, 0], koerper=[14, 0, 0], wurzel={"position": [0, -2.0, 0]},
                    mantel=[40, 0, 0])),
    ])


def rabenschwarm():
    """Der Rabe hebt ab, Morvan zeigt mit dem Dolch auf den Gegner - der
    Schwarm (0,8 s). Am Ende kehrt der Rabe auf die Schulter zurueck."""
    weg = {"position": [4, 14, -10], "rotation": [-30, 0, 0], "scale": 0.0}
    return ablauf(2.4, [
        (0.35, {"rabe": {"position": [0, 3, -2], "rotation": [-40, 0, 0]}, "linker_arm": [-150, 0, -20],
                "linke_hand": [60, 0, 0], "koerper": [-8, 0, 0], "kopf": [-24, 0, 0]}),
        (0.70, {"rabe": {"position": [2, 8, -6], "rotation": [-30, 0, 0], "scale": 0.8}}),
        (0.85, {"rabe": weg, "linker_arm": [-100, -10, 0], "linke_hand": [90, 0, 0], "koerper": [10, 10, 0],
                "kopf": [-6, 0, 0]}),
        (2.00, {"rabe": weg}),
        (2.25, {"rabe": {"position": [0, 3, -2], "rotation": [20, 0, 0], "scale": 1.0}}),
    ])


def schattensprung():
    """Drei Spruenge durch den Gegner, drei Schnitte (0,5 / 1,0 / 1,5 s).
    Das Skript versetzt ihn; hier der Schnitt und die Landung dazwischen."""
    b = []
    for i, z in enumerate((0.5, 1.0, 1.5)):
        seite = 1 if i % 2 == 0 else -1
        b.append((z - 0.12, {"koerper": [20, 40 * seite, 0], "wurzel": {"position": [0, -3.0, 0]},
                             "rechter_arm": [-120, -30 * seite, 20], "linker_arm": [-120, 30 * seite, -20],
                             "mantel": [50, 0, 0]}))
        b.append((z, {"koerper": [26, -40 * seite, 0], "wurzel": {"position": [0, -2.0, -2.0]},
                      "rechter_arm": [-40, 50 * seite, 0], "linker_arm": [-40, 50 * seite, 0],
                      "rechte_hand": [80, 0, 0], "linke_hand": [80, 0, 0]}))
    return ablauf(2.0, b)


def rabennacht():
    """Phase zwei: die Dolche gekreuzt ueber dem Kopf - dann zerreisst er die
    Nacht (0,8 s): Dunkelheit fuer alle Gegner."""
    return ablauf(2.6, [
        (0.55, {"rechter_arm": [-170, 25, 0], "linker_arm": [-170, -25, 0], "rechte_hand": [0, 0, 0],
                "linke_hand": [0, 0, 0], "kopf": [-30, 0, 0], "koerper": [-14, 0, 0], "huefte": [0, 0, 0],
                "wurzel": {"position": [0, 0.5, 0]}, "mantel": [10, 0, 0]}),
        (0.80, {"rechter_arm": [-20, 0, 60], "linker_arm": [-20, 0, -60], "rechte_hand": [120, 0, 0],
                "linke_hand": [120, 0, 0], "kopf": [10, 0, 0], "koerper": [24, 0, 0],
                "wurzel": {"position": [0, -3.0, 0]}, "mantel": [60, 0, 0]}),
        (1.60, {"koerper": [20, 0, 0], "mantel": [30, 0, 0]}),
    ])


def wechsel():
    """Phase eins ist leer: getroffen sinkt er aufs Knie, zieht den Umhang
    um sich - und laedt sich auf (1,0 bis 3,6 s), waehrend Rauch und Raben
    um ihn kreisen. Bei 3,6 s reisst er die Arme auseinander, bei 4,2 s ist
    er die Schattengestalt."""
    knie = dict(KNIEN, **ARME_GEKREUZT, huefte=[0, 0, 0])
    return ablauf(5.0, [
        (0.35, {"koerper": [-20, 20, 0], "kopf": [-20, 0, 0], "wurzel": {"position": [0, 0, 1.5]},
                "rechter_arm": [-10, 30, 30], "linker_arm": [10, -20, -30]}),
        (1.00, dict(knie, koerper=[34, 0, 0], kopf=[40, 0, 0], mantel=[-10, 0, 0])),
        (2.30, dict(knie, koerper=[30, 0, 0], kopf=[30, 0, 0], mantel=[10, 0, 0])),
        (3.60, dict(knie, koerper=[20, 0, 0], kopf=[10, 0, 0], mantel=[26, 0, 0])),
        (3.95, {"wurzel": {"position": [0, 0.5, 0]}, "rechtes_bein": [-10, 10, 8], "linkes_bein": [10, -8, -6],
                "rechter_arm": [-60, 0, 80], "linker_arm": [-60, 0, -80], "rechte_hand": [60, 0, 0],
                "linke_hand": [60, 0, 0], "koerper": [-20, 0, 0], "kopf": [-30, 0, 0], "mantel": [70, 0, 0]}),
        (4.20, {"koerper": [-24, 0, 0], "wurzel": {"position": [0, 1.0, 0]}}),
        (4.60, {"koerper": [0, 0, 0], "kopf": [-10, 0, 0], "wurzel": {"position": [0, -0.5, 0]}}),
    ])


def beben():
    huelle = "math.clamp((query.anim_time - 1.0) / 2.6, 0.0, 1.0) * (query.anim_time < 3.6)"
    return {"loop": "hold_on_last_frame", "animation_length": 5.0, "bones": {
        "koerper": {"rotation": [f"math.sin(query.anim_time * 2600.0) * 1.8 * {huelle}",
                                 f"math.sin(query.anim_time * 1900.0) * 1.4 * {huelle}", 0.0]},
        "mantel": {"rotation": [f"math.sin(query.anim_time * 2200.0) * 4.0 * {huelle}", 0.0, 0.0]},
    }}


def auftritt():
    """Er landet aus einem Rabenschwarm geduckt, richtet sich auf und
    wirbelt die Dolche - dann die Kampfhaltung."""
    lande = {"wurzel": {"position": [0, -5.0, 0]}, "koerper": [40, 0, 0], "kopf": [-30, 0, 0],
             "huefte": [0, 0, 0], "rechter_arm": [30, 20, 30], "linker_arm": [30, -20, -30],
             "rechte_hand": [180, 0, 0], "linke_hand": [180, 0, 0], "rechtes_bein": [-60, 10, 10],
             "linkes_bein": [20, -10, -10], "mantel": [60, 0, 0]}
    return ablauf(3.0, [
        (0.0, lande),
        (0.9, dict(lande, mantel=[20, 0, 0])),
        (1.5, {"wurzel": {"position": [0, 0, 0]}, "koerper": [-4, 0, 0], "kopf": [-6, 0, 0],
               "rechter_arm": [-90, 0, 30], "linker_arm": [-90, 0, -30], "rechtes_bein": [0, 0, 4],
               "linkes_bein": [0, 0, -4], "mantel": [10, 0, 0], "rechte_hand": [0, 0, 0],
               "linke_hand": [0, 0, 0]}),
        (2.1, {"rechte_hand": [360, 0, 0], "linke_hand": [-360, 0, 0]}),
        (2.2, {"rechte_hand": [0, 0, 0], "linke_hand": [0, 0, 0]}),
    ], linear=("rechte_hand", "linke_hand"),
        spruenge=[(2.1, "rechte_hand", "rotation", [360, 0, 0], [0, 0, 0]),
                  (2.1, "linke_hand", "rotation", [-360, 0, 0], [0, 0, 0])])


def abschied():
    """Besiegt: er taumelt, sinkt auf die Knie, senkt den Kopf - und
    zerstiebt zu Raben (das Skript, 3,2 s)."""
    return ablauf(4.0, [
        (0.35, {"koerper": [-22, 10, 0], "kopf": [-24, 0, 0], "wurzel": {"position": [0, 0, 1.5]},
                "rechter_arm": [-10, 30, 30], "linker_arm": [0, -20, -40]}),
        (1.00, dict(KNIEN, koerper=[34, 0, 0], kopf=[44, 0, 0], huefte=[0, 0, 0], rechter_arm=[-10, 0, 10],
                    linker_arm=[-10, 0, -10], rechte_hand=[180, 0, 0], linke_hand=[180, 0, 0])),
        (4.00, dict(KNIEN, koerper=[38, 0, 0], kopf=[48, 0, 0])),
    ], zurueck=False)


# Die Angriffe: Nummer, Bewegung, Zeiten fuer das Skript (in Sekunden).
ANGRIFFE = {
    "dolchfaecher": (1, dolchfaecher, {"wurf": 0.5}),
    "rauchbombe": (2, rauchbombe, {"bombe": 0.3, "weg": 0.45, "hinter": 1.4, "stich": 1.55}),
    "doppelgaenger": (3, doppelgaenger, {"schatten": 0.9}),
    "rabenschwarm": (4, rabenschwarm, {"los": 0.8, "von": 1.0, "bis": 2.1}),
    "schattensprung": (5, schattensprung, {"schnitte": [0.5, 1.0, 1.5]}),
    "rabennacht": (6, rabennacht, {"nacht": 0.8}),
    "wechsel": (7, wechsel, {"laden_von": 1.0, "laden_bis": 3.6, "umschlag": 4.2}),
    "auftritt": (8, auftritt, {"bereit": 2.8}),
    "abschied": (9, abschied, {"beute": 3.2}),
}
HIEBE = [("hieb_links", hieb_links), ("hieb_rechts", hieb_rechts), ("hieb_kreuz", hieb_kreuz)]


def alle_animationen():
    anims = {PRAEFIX + "haltung": haltung(), PRAEFIX + "gang": gang(), PRAEFIX + "beben": beben(),
             PRAEFIX + "blick": {"loop": True, "bones": {"kopf": {"rotation": [
                 "query.target_x_rotation", "query.target_y_rotation", 0.0]}}}}
    for name, bau in HIEBE:
        anims[PRAEFIX + name] = bau()
    for name, (_, bau, _) in ANGRIFFE.items():
        a = bau()
        a["loop"] = "hold_on_last_frame"
        anims[PRAEFIX + name] = a
    return anims


# ============================================================ Bossleiste

# Fynns Leiste in Morvans Farben: Silber statt Gold, violette Rinne, in der
# Mitte statt des Saphirs ein Rabenkopf mit leuchtendem Auge.
BALKEN_1 = [(214, 176, 255), (164, 108, 236), (118, 66, 196), (82, 38, 148), (50, 20, 96)]
BALKEN_2 = [(246, 222, 255), (210, 140, 255), (168, 84, 236), (122, 44, 190), (76, 22, 128)]
SILBERTAUSCH = {
    (237, 211, 131): (226, 228, 238), (204, 160, 75): (176, 180, 196), (193, 154, 83): (160, 164, 182),
    (143, 109, 51): (104, 106, 124), (240, 232, 189): (246, 246, 252), (69, 89, 184): (150, 80, 220),
    (37, 35, 62): (44, 28, 60), (24, 32, 86): (64, 34, 96), (148, 176, 243): (220, 170, 255),
}
RABENKOPF = [
    ".....asma.....",
    "...aajssjaa...",
    ".aaffjjjjjfaa.",
    "aafjnnnnnnjfaa",
    "afjnnnKKKnnjra",
    "fjnnnKKKKKnnjr",
    "fjnnKKCKKKnnjr",
    "fjnnKKKKKWWWjr",
    "fjnnKKKKWWWnjr",
    "fjnnKKKKKWnnjr",
    "fjnnnKKKKnnnjr",
    "fjjnnKKKKnnjjr",
    "afjgnKKKKngjra",
    "aagggnnnngggaa",
    ".aaggggggggaa.",
    "...aaggggaa...",
    ".....aaaa.....",
]
RABENKOPF_FARBEN = {"a": (19, 18, 23), "s": (200, 204, 216), "m": (232, 230, 234), "f": (226, 228, 238),
                    "j": (176, 180, 196), "r": (160, 164, 182), "g": (104, 106, 124), "n": (74, 46, 106),
                    "K": (16, 14, 20), "C": (230, 170, 255), "W": (220, 212, 196)}


def bossleiste():
    import bossbar_bauen as bb
    grund = bb.umgefaerbt(bb.rahmen(), SILBERTAUSCH)
    rahmen1 = bb.mit_medaillon(grund, RABENKOPF, RABENKOPF_FARBEN)
    rahmen2 = bb.mit_schein(rahmen1, (126, 64, 176))
    return {
        "kennung": NAME, "marke": "Morvan", "titel": ("Morvan", "Morvan · Phase 2"),
        "namensfarben": ([0.86, 0.74, 1.0], [0.95, 0.55, 1.0]),
        "teile": {"rahmen": rahmen1, "rahmen_entfesselt": rahmen2, "leer": bb.rinne(None, leer=True),
                  "voll": bb.rinne(BALKEN_1), "entfesselt": bb.rinne(BALKEN_2)},
    }


# ============================================================ Partikel

def karte_bild(karte, farben):
    b = Image.new("RGBA", (len(karte[0]), len(karte)), (0, 0, 0, 0))
    for y, zeile in enumerate(karte):
        for x, z in enumerate(zeile):
            if z != ".":
                b.putpixel((x, y), farben[z])
    return b


# Ein Rabe im Flug, zwei Bilder: Fluegel oben, Fluegel unten.
RABE_BILD = [
    "k......k........",
    "kk....kk........",
    ".kk..kk.........",
    "..kkkke...kkkkk.",
    "...kkkk..kkkkkke",
    "...kk.....kkkk..",
    "..k.......k..k..",
    "................",
]
WURFDOLCH_BILD = [
    "...w....",
    "...w....",
    "...sd...",
    "wwsvvsdd",
    "ddsvvsww",
    "...ds...",
    "....w...",
    "....w...",
]
RAUCH_BILD = [
    "..rrrr..",
    ".rRRRRr.",
    "rRRGGRRr",
    "rRGGGGRr",
    "rRGGGGRr",
    "rRRGGRRr",
    ".rRRRRr.",
    "..rrrr..",
]


def partikel_bilder():
    return {
        "fynn_rabe": karte_bild(RABE_BILD, {"k": (24, 20, 30, 255), "e": (200, 130, 255, 255)}),
        "fynn_wurfdolch": karte_bild(WURFDOLCH_BILD, {"w": (230, 232, 240, 255), "s": (170, 174, 190, 255),
                                                      "d": (90, 92, 108, 255), "v": (170, 90, 240, 255)}),
        "fynn_rauch": karte_bild(RAUCH_BILD, {"r": (46, 40, 54, 150), "R": (64, 56, 76, 200),
                                              "G": (86, 78, 100, 230)}),
    }


def alle_partikel():
    def p(name, textur, teile):
        return {"format_version": "1.10.0", "particle_effect": {
            "description": {"identifier": f"fynn:{name}", "basic_render_parameters": {
                "material": "particles_blend", "texture": f"textures/particle/{textur}"}},
            "components": teile}}
    aus = {"minecraft:particle_appearance_tinting": {"color": [1, 1, 1, "1 - v.particle_age / v.particle_lifetime"]}}
    return {
        # Ein paar Raben, die flattern: Bild eins und zwei im Wechsel.
        "rabenschwarm": p("rabenschwarm", "fynn_rabe", {
            "minecraft:emitter_rate_instant": {"num_particles": 4},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_sphere": {"radius": 0.8, "direction": "outwards"},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.55},
            "minecraft:particle_initial_speed": "math.random(1.5, 3.5)",
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 1.5, 0], "linear_drag_coefficient": 1},
            "minecraft:particle_appearance_billboard": {
                "size": [0.28, 0.14], "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 16, "texture_height": 8, "flipbook": {
                    "base_UV": [0, 0], "size_UV": [8, 8], "step_UV": [8, 0], "frames_per_second": 12,
                    "max_frame": 2, "loop": True}}}}),
        "rauchwolke": p("rauchwolke", "fynn_rauch", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 26},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_sphere": {"radius": 1.0, "direction": "outwards"},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "1.4 + math.random(0, 0.8)"},
            "minecraft:particle_initial_speed": "math.random(0.5, 1.6)",
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 0.3, 0], "linear_drag_coefficient": 1.2},
            "minecraft:particle_appearance_billboard": {
                "size": ["0.35 + v.particle_age * 0.5", "0.35 + v.particle_age * 0.5"],
                "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}}}, **aus)),
        "wurfdolch": p("wurfdolch", "fynn_wurfdolch", {
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.1},
            "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": 1440},
            "minecraft:particle_appearance_billboard": {
                "size": [0.22, 0.22], "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}}}),
        "schattenfunken": p("schattenfunken", "fynn_saphirfunke", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 6},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_box": {"half_dimensions": [0.5, 1.1, 0.5], "direction": [0, 1, 0]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 1.0},
            "minecraft:particle_initial_speed": 0.7,
            "minecraft:particle_appearance_billboard": {
                "size": [0.1, 0.1], "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}},
            }, **{"minecraft:particle_appearance_tinting": {"color": [
                0.8, 0.45, 1.0, "1 - v.particle_age / v.particle_lifetime"]}})),
    }


# ============================================================ Schattendoppelgaenger

def schattenhaut(haut):
    """Der Doppelgaenger: Morvans Umriss aus Schatten - alles dunkelviolett,
    nur die Augen und die Naehte leuchten."""
    b = haut.copy()
    for y in range(b.height):
        for x in range(b.width):
            r, g, bl, a = b.getpixel((x, y))
            if not a:
                continue
            if a == 254:
                b.putpixel((x, y), (230, 180, 255, 254))
                continue
            hell = (r + g + bl) / 3 / 255
            b.putpixel((x, y), (int(40 + 60 * hell), int(20 + 30 * hell), int(70 + 90 * hell), 255))
    return b


def schatten_aussehen():
    anims = {"haltung": PRAEFIX + "haltung", "gang": PRAEFIX + "gang", "hieb": PRAEFIX + "hieb_links"}
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": "fynn:schattendoppelgaenger",
        "materials": {"default": "entity_emissive_alpha"},
        "textures": {"default": "textures/entity/rabenfuerst_schatten"},
        "geometry": {"default": f"geometry.fynn.{NAME}"},
        "animations": anims,
        "scripts": {"scale": "1.1", "animate": [
            "haltung", {"gang": "math.clamp(query.modified_move_speed * 2.0, 0.0, 1.0)"},
            {"hieb": "variable.attack_time > 0.0"}]},
        "render_controllers": ["controller.render.default"],
    }}}


def schatten_verhalten():
    spieler = {"all_of": [{"test": "is_family", "subject": "other", "value": "player"},
                          {"test": "has_ability", "subject": "other", "value": "instabuild", "operator": "!="}]}
    return {"format_version": "1.21.90", "minecraft:entity": {
        "description": {"identifier": "fynn:schattendoppelgaenger", "is_spawnable": False, "is_summonable": True},
        "component_groups": {"fynn:vergehen": {"minecraft:instant_despawn": {}}},
        "components": {
            "minecraft:type_family": {"family": ["rabenfuerst", "bandit", "monster", "mob"]},
            "minecraft:health": {"value": 1, "max": 1},
            "minecraft:attack": {"damage": 4, "effect_name": "poison", "effect_duration": 3},
            "minecraft:collision_box": {"width": 0.7, "height": 2.1},
            "minecraft:movement": {"value": 0.36},
            "minecraft:movement.basic": {},
            "minecraft:navigation.walk": {"avoid_water": True},
            "minecraft:jump.static": {},
            "minecraft:physics": {},
            "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
            "minecraft:damage_sensor": {"triggers": [{"cause": "fall", "deals_damage": "no"}]},
            "minecraft:loot": {"table": "loot_tables/empty.json"},
            # Ein Schatten haelt nicht lange: nach zwanzig Sekunden vergeht er.
            "minecraft:timer": {"time": 20, "looping": False, "time_down_event": {"event": "fynn:vergehen"}},
            "minecraft:behavior.melee_box_attack": {"priority": 2, "speed_multiplier": 1.2, "track_target": True},
            "minecraft:behavior.nearest_attackable_target": {"priority": 1, "must_see": False, "within_radius": 24,
                                                             "entity_types": [{"filters": spieler, "max_dist": 24}]},
            "minecraft:behavior.random_stroll": {"priority": 6},
        },
        "events": {"fynn:vergehen": {"add": {"component_groups": ["fynn:vergehen"]}}}}}


# ============================================================ Gegenstaende

# Die Rabenklinge: Morvans Dolch, laenger geschmiedet - eine Klinge fuer
# eine Hand, schneller als ein Schwert. Rechtsklick: Schattensprung.
RABENKLINGE = dict(RABENDOLCH, karte=[
    "...w...",
    "..wsd..",
] + ["..wvd.."] * 11 + [
    "..wsd..",
    "sSSSSSs",
    ".s.L.s.",
    "...L...",
    "...l...",
    "...L...",
    "...l...",
    "..SSS..",
    "...S...",
])


def rabenklinge_bild():
    punkte = {(14, 1): "w", (13, 2): "w"}
    for i in range(8):
        x, y = 12 - i, 3 + i
        punkte[(x, y)] = "v"
        punkte.setdefault((x + 1, y - 1), "w")
        punkte.setdefault((x + 1, y), "d")
    for (x, y), z in (((3, 9), "S"), ((4, 10), "S"), ((5, 11), "S"), ((6, 12), "S"), ((2, 8), "s"), ((7, 13), "s")):
        punkte[(x, y)] = z
    for (x, y), z in (((3, 12), "L"), ((2, 13), "l"), ((1, 14), "S")):
        punkte[(x, y)] = z
    karte = [["."] * 16 for _ in range(16)]
    for (x, y), z in punkte.items():
        karte[y][x] = z
    import roland_beute_bauen as rbb
    return rbb.male(rbb.umrande(["".join(z) for z in karte]), dict(RABENDOLCH["farben"], k=rbb.UMRISS))


RAUCHBOMBE = [
    "................",
    ".......kk.......",
    "......kffk......",
    ".......kk.......",
    "......kLLk......",
    ".....kLllLk.....",
    "....kdDDDDdk....",
    "...kdDDgDDDdk...",
    "...kDDgDDDDDk...",
    "...kDDDDDDDDk...",
    "...kDDDDDDDdk...",
    "...kdDDDDDdDk...",
    "....kdDDDDdk....",
    ".....kkkkkk.....",
    "................",
    "................",
]
KOPFGELD = [
    "................",
    ".kkkkkkkkkkkkkk.",
    ".kppppppppppppk.",
    ".kpPPPPPPPPPPpk.",
    ".kpppKKKKKKpppk.",
    ".kppKmmmmmmKppk.",
    ".kppKmWmmWmKppk.",
    ".kppKmmBBmmKppk.",
    ".kppKKmBBmKKppk.",
    ".kpppKKKKKKpppk.",
    ".kppppppppppppk.",
    ".kpRRRRRRRRRRpk.",
    ".kppggpgpgppppk.",
    ".kpppppppppgppk.",
    ".kkkkkkkkkkkkkk.",
    "................",
]


def gegenstaende():
    import waffe_bauen as w
    import roland_beute_bauen as rbb
    from neue_waffen_bauen import halten, waffen_attachable, gegenstand, rezept
    v = RABENKLINGE
    w.aus_zeichenkarte("rabenklinge", v["karte"], {k: f + (255,) for k, f in v["farben"].items()},
                       dicke=lambda zeile, spalte, zeichen: v["tiefe"][zeichen], mitte=v["mitte"],
                       ziel_modell=str(RES / "models" / "entity" / "rabenklinge.geo.json"),
                       ziel_textur=str(RES / "textures" / "entity" / "rabenklinge_haut.png"))
    bk.schreibe(RES / "attachables" / "rabenklinge.json", waffen_attachable("rabenklinge"))
    bk.schreibe(RES / "animations" / "rabenklinge.animation.json", {"format_version": "1.10.0", "animations": {
        "animation.rabenklinge.halten": halten(v["karte"], v["griff"])}})
    bk.schreibe(VER / "items" / "rabenklinge.json", gegenstand("rabenklinge", {
        "minecraft:hand_equipped": True, "minecraft:damage": 8, "minecraft:rarity": "epic",
        "minecraft:durability": {"max_durability": 1400},
        "minecraft:enchantable": {"value": 18, "slot": "sword"},
        "minecraft:repairable": {"repair_items": [{"items": ["fynn:stahlbarren"], "repair_amount": 350}]},
        "minecraft:use_modifiers": {"use_duration": 0.1},
        "minecraft:cooldown": {"category": "fynn:rabenklinge", "duration": 6.0},
    }))
    bk.schreibe(VER / "items" / "rauchbombe.json", gegenstand("rauchbombe", {
        "minecraft:rarity": "uncommon", "minecraft:use_modifiers": {"use_duration": 0.1},
        "minecraft:cooldown": {"category": "fynn:rauchbombe", "duration": 2.0},
    }, gruppe="fynn:itemGroup.name.jagd", stapel=16))
    bk.schreibe(VER / "items" / "kopfgeldbrief.json", gegenstand("kopfgeldbrief", {
        "minecraft:rarity": "rare", "minecraft:use_modifiers": {"use_duration": 0.1},
    }, gruppe="fynn:itemGroup.name.jagd", stapel=16))
    # Rauchbomben selbst bauen: Schwarzpulver, Kohle, Faden.
    bk.schreibe(VER / "recipes" / "rauchbombe.json", {"format_version": "1.20.10", "minecraft:recipe_shapeless": {
        "description": {"identifier": "fynn:rauchbombe"}, "tags": ["crafting_table"],
        "ingredients": [{"item": "minecraft:gunpowder"}, {"item": "minecraft:coal"}, {"item": "minecraft:string"}],
        "unlock": [{"item": "minecraft:gunpowder"}],
        "result": {"item": "fynn:rauchbombe", "count": 2}}})
    # Der Kopfgeldbrief: Papier, Tinte, ein Smaragd als Belohnung, Gold.
    bk.schreibe(VER / "recipes" / "kopfgeldbrief.json", rezept(
        "kopfgeldbrief", ["pip", "pep", "pgp"],
        {"p": "minecraft:paper", "i": "minecraft:ink_sac", "e": "minecraft:emerald", "g": "minecraft:gold_ingot"}))
    farben_bombe = {"k": rbb.UMRISS, "f": (255, 190, 90), "L": (120, 90, 60), "l": (90, 66, 44),
                    "D": (58, 52, 70), "d": (40, 36, 50), "g": (140, 130, 160)}
    farben_brief = {"k": (70, 52, 32), "p": (222, 204, 160), "P": (60, 44, 30), "K": (40, 34, 44),
                    "m": (210, 204, 190), "W": (170, 90, 240), "B": (170, 160, 150), "R": (142, 29, 39),
                    "g": (200, 160, 60)}
    return {"rabenklinge": rabenklinge_bild(), "rauchbombe": rbb.male(RAUCHBOMBE, farben_bombe),
            "kopfgeldbrief": rbb.male(KOPFGELD, farben_brief)}


# ============================================================ Verhalten

GRUNDLEBEN = 200
GRUNDSCHADEN = 8
BEUTE = [
    ("fynn:rabenklinge", 1, 1, 1.0),
    ("fynn:rauchbombe", 4, 8, 1.0),
    ("minecraft:emerald", 4, 8, 1.0),
    ("minecraft:gold_ingot", 3, 6, 1.0),
    ("minecraft:gold_nugget", 8, 16, 1.0),
    ("minecraft:diamond", 1, 3, 1.0),
    ("minecraft:golden_apple", 1, 1, 1.0),
    ("minecraft:experience_bottle", 3, 6, 1.0),
    ("fynn:haizahnsaebel", 1, 1, 0.3),
]
ANTEIL = [
    ("minecraft:emerald", 2, 4, 1.0),
    ("minecraft:gold_ingot", 2, 3, 1.0),
    ("fynn:rauchbombe", 2, 3, 1.0),
    ("minecraft:golden_apple", 1, 1, 0.5),
    ("minecraft:experience_bottle", 2, 3, 1.0),
]


def verhalten():
    return bk.verhalten(TYP, ["rabenfuerst", "bandit", "monster", "mob"], GRUNDLEBEN, GRUNDSCHADEN, (0.8, 2.3), {
        "minecraft:movement": {"value": 0.33},
        "minecraft:movement.basic": {},
        "minecraft:navigation.walk": {"can_path_over_water": False, "avoid_water": True, "can_open_doors": True},
        "minecraft:jump.static": {},
        "minecraft:can_climb": {},
        "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": True},
        "minecraft:knockback_resistance": {"value": 0.5},
        "minecraft:breathable": {"breathes_water": True},
        "minecraft:experience_reward": {"on_death": "query.last_hit_by_player ? 100 : 0"},
        "minecraft:loot": {"table": "loot_tables/entities/rabenfuerst.json"},
        "minecraft:behavior.look_at_player": {"priority": 6, "look_distance": 12.0, "probability": 0.05},
        "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 0.8},
    }, nahkampf={"minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.3, "track_target": True}},
        phase_zwei={"minecraft:movement": {"value": 0.37}}, anzahl_angriffe=9)


NAMEN = [
    ("entity.fynn:rabenfuerst.name", "Morvan", "Morvan"),
    ("item.spawn_egg.entity.fynn:rabenfuerst.name", "Morvan, der Rabenfürst", "Morvan the Raven Lord"),
    ("entity.fynn:schattendoppelgaenger.name", "Schattendoppelgänger", "Shadow Double"),
    ("item.fynn:rabenklinge", "Rabenklinge", "Raven Blade"),
    ("item.fynn:rabenklinge.name", "Rabenklinge", "Raven Blade"),
    ("item.fynn:rauchbombe", "Rauchbombe", "Smoke Bomb"),
    ("item.fynn:rauchbombe.name", "Rauchbombe", "Smoke Bomb"),
    ("item.fynn:kopfgeldbrief", "Kopfgeldbrief", "Bounty Letter"),
    ("item.fynn:kopfgeldbrief.name", "Kopfgeldbrief", "Bounty Letter"),
]


def main():
    geo, (h1, h2) = bauen()
    bk.schreibe(RES / "models" / "entity" / f"{NAME}.geo.json", geo)
    h1.save(RES / "textures" / "entity" / f"{NAME}.png")
    h2.save(RES / "textures" / "entity" / f"{NAME}_entfesselt.png")
    schattenhaut(h2).save(RES / "textures" / "entity" / f"{NAME}_schatten.png")
    anims = alle_animationen()
    bk.schreibe(RES / "animations" / f"{NAME}.animation.json", {"format_version": "1.10.0", "animations": anims})
    kurz = {nr: name for name, (nr, _, _) in ANGRIFFE.items()}
    bk.schreibe(RES / "animation_controllers" / f"{NAME}.animation_controllers.json", bk.steuerung(
        NAME, kurz, ["haltung", {"gang": "math.clamp(query.modified_move_speed * 2.0, 0.0, 1.0)"}, "blick"],
        zusatz={"wechsel": ["beben"]}, hiebe=[h for h, _ in HIEBE]))
    bk.schreibe(RES / "entity" / f"{NAME}.entity.json", bk.aussehen(
        TYP, NAME, anims, PRAEFIX, 1.15, {"base_color": "#2b2533", "overlay_color": "#8e1d27"}))
    bk.schreibe(RES / "render_controllers" / f"{NAME}.render_controllers.json", bk.steuerplan(NAME))
    bk.schreibe(RES / "entity" / "schattendoppelgaenger.entity.json", schatten_aussehen())
    bk.schreibe(VER / "entities" / f"{NAME}.json", verhalten())
    bk.schreibe(VER / "entities" / "schattendoppelgaenger.json", schatten_verhalten())
    bk.schreibe(VER / "loot_tables" / "entities" / f"{NAME}.json", bk.beutetabelle(BEUTE))
    if not (VER / "loot_tables" / "empty.json").exists():
        bk.schreibe(VER / "loot_tables" / "empty.json", {"pools": []})
    for name, daten in alle_partikel().items():
        bk.schreibe(RES / "particles" / f"{NAME}_{name}.particle.json", daten)
    for name, bild in partikel_bilder().items():
        bild.save(RES / "textures" / "particle" / f"{name}.png")
    zeiten = {name: (nr, bau()["animation_length"], z) for name, (nr, bau, z) in ANGRIFFE.items()}
    (VER / "scripts" / f"{NAME}_daten.js").write_text(
        bk.skriptdaten(zeiten, "rabenfuerst_bauen.py")
        + bk.werte_js("rabenfuerst_bauen.py", GRUNDLEBEN, 6, 30, BEUTE, ANTEIL).split("\n", 1)[1],
        encoding="utf-8")
    bk.item_bilder(gegenstaende())
    bk.sprache("Morvan, der Rabenfuerst", NAMEN)
    print("gebaut: Morvan, der Rabenfuerst")
    if "--bilder" in sys.argv:
        vorschau(Path(sys.argv[sys.argv.index("--bilder") + 1]), geo, h1, h2)


def vorschau(ordner, geo, h1, h2):
    from PIL import ImageDraw
    zellen = []
    for haut, titel in ((h1, "Phase 1"), (h2, "Phase 2 - Schattengestalt")):
        for gier in (25, 160):
            b = tm.ansehen(geo, haut, [(haltung(), 1.0)], {}, gier=gier, neigung=6, breite=320, hoehe=420,
                           zoom=9.0, mitte=(0, 16, 0))
            zellen.append((b, f"{titel}, {'vorn' if gier < 90 else 'hinten'}"))
    gesamt = Image.new("RGBA", (4 * 320, 440), (244, 245, 248, 255))
    zeichner = ImageDraw.Draw(gesamt)
    for i, (b, text) in enumerate(zellen):
        gesamt.paste(b, (i * 320, 0))
        zeichner.text((i * 320 + 10, 424), text, fill=(20, 20, 30, 255))
    ordner.mkdir(parents=True, exist_ok=True)
    gesamt.save(ordner / f"{NAME}.png")
    print("gezeichnet:", ordner / f"{NAME}.png")


if __name__ == "__main__":
    main()
