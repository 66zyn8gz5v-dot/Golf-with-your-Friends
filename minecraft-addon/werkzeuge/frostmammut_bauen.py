#!/usr/bin/env python3
"""Der dritte Boss: Hrimgar, das Frostmammut.

Fynn: "Mach jetzt bitte zwei weitere Bosse, ich lasse dir da Freiraum."

Nach dem Ritter und dem Banditenkoenig ein Tier - aber ein uraltes, aus
dem Eis: gross wie ein Haus, zotteliges Fell mit Raureif, Stosszaehne,
die sich nach oben biegen, auf dem Ruecken ein Panzer aus Eiskristallen.
Es stuermt an, stampft (wer springt, entgeht der Welle), fegt mit den
Zaehnen, schleudert mit dem Ruessel und laesst Eiszapfen regnen. Ist die
erste Leiste leer, laedt es sich auf, und der Eispanzer zerspringt: In
Phase zwei glueht ein Frostkern in seiner Brust, es speit Frostatem und
ruft Eiswoelfe. Es ist das einzige Tier im Paket, das einen Boss-Kampf
fuehrt - gebaut wie die Tiere (tiermodell), gefuehrt wie die Bosse
(boss_kern).

    python3 werkzeuge/frostmammut_bauen.py [--bilder vorschau]
"""

import json
import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boss_kern as bk                                          # noqa: E402
import tiermodell as tm                                         # noqa: E402
from tiermodell import Modell, hexfarbe, mische, streu, wolken  # noqa: E402
from roland_bauen import Ruestung, randabstand                  # noqa: E402
from spawneier import ei_eintrag  # noqa: E402

RES = bk.RES
VER = bk.VER
TYP = "fynn:frostmammut"
NAME = "frostmammut"
PRAEFIX = "animation.fynn.frostmammut."


def tm_ton(*a, **k):
    from tiere_gestalt import ton
    return ton(*a, **k)


def spiegel(ursprung, groesse):
    return [-ursprung[0] - groesse[0], ursprung[1], ursprung[2]]


# ============================================================ Gestalt

def stosszahn_bogen():
    """Ein Stosszahn als Bogen aus gedrehten Gliedern statt als Treppe:
    Er kommt schraeg nach unten aus dem Kiefer, schwingt nach vorn und
    biegt sich dann nach oben und innen - die Form, an der man ein Mammut
    sofort erkennt. Jedes Glied ist etwas duenner als das vorige."""
    glieder = []
    x, y, z = 5.0, 28.0, -32.0
    anzahl = 7
    for i in range(anzahl):
        t = i / (anzahl - 1)
        steigung = -35.0 + 150.0 * t            # Grad ueber der Waagerechten, nach vorn gezaehlt
        seitwaerts = 14.0 - 34.0 * t            # erst nach aussen, zur Spitze wieder nach innen
        laenge = 5.0 - 1.2 * t
        dicke = 4.0 - 2.0 * t
        rs, rw = math.radians(steigung), math.radians(seitwaerts)
        dx = math.sin(rw) * math.cos(rs) * laenge
        dy = math.sin(rs) * laenge
        dz = -math.cos(rw) * math.cos(rs) * laenge
        mitte = [round(x + dx / 2, 3), round(y + dy / 2, 3), round(z + dz / 2, 3)]
        glieder.append((mitte, [round(dicke, 2), round(dicke, 2), round(laenge + 1.0, 2)],
                        [round(-steigung, 2), round(-seitwaerts, 2), 0.0]))
        x, y, z = x + dx, y + dy, z + dz
    return glieder


def gestalt():
    """Wie der Elefant im Paket, nur groesser und schwerer: ein hoher
    Buckel ueber den Schultern, der Ruecken faellt nach hinten ab, das
    Fell haengt wie ein Rock bis fast auf den Boden. Der Rumpf dreht um
    die Hinterhuefte - so kann es sich aufbaeumen, und die Vorderbeine
    gehen mit."""
    m = Modell(NAME, sichtbreite=6, sichthoehe=5)
    r = Ruestung()
    k = r.kasten

    m.knoch("wurzel", [0, 0, 0])
    koerper = m.knoch("koerper", [0, 28, 10], "wurzel")
    k(koerper, [-11, 24, -15], [22, 20, 30], "fell")
    k(koerper, [-9, 44, -15], [18, 5, 16], "fell")                     # Buckel
    k(koerper, [-7, 49, -13], [14, 2, 10], "fell")
    k(koerper, [-9, 42, 1], [18, 3, 12], "fell")                       # Ruecken faellt ab
    k(koerper, [-12, 19, -15], [24, 6, 28], "fell_lang")               # Fellrock
    k(koerper, [-10, 18, -17], [20, 16, 2], "fell_lang")               # Brustfell
    k(koerper, [-3, 21, -17.5], [6, 7, 1], "kern")                     # unter dem Kopf: hier glueht Phase 2

    panzer = m.knoch("eispanzer", [0, 48, -4], "koerper")
    for ursprung, groesse, dreh in (
            ([-7, 50, -12], [4, 7, 4], [12, 0, 14]), ([-1, 52, -11], [3, 9, 3], [-8, 0, -6]),
            ([3, 50, -10], [4, 6, 4], [10, 0, -16]), ([-5, 49, -4], [3, 7, 3], [-14, 0, 10]),
            ([2, 48, -3], [3, 6, 3], [16, 0, -12]), ([-2, 46, 3], [3, 5, 3], [-10, 0, 4]),
            ([-12, 40, -12], [3, 6, 3], [0, 0, 20]), ([9, 40, -12], [3, 6, 3], [0, 0, -20]),
            ([-12, 38, -6], [2, 5, 2], [10, 0, 25]), ([10, 38, -6], [2, 5, 2], [10, 0, -25])):
        k(panzer, ursprung, groesse, "eis", drehung=dreh)

    kopf = m.knoch("kopf", [0, 42, -15], "koerper")
    k(kopf, [-8, 30, -28], [16, 16, 13], "kopf")
    k(kopf, [-6, 46, -26], [12, 4, 9], "fell")                         # Scheitelfell
    k(kopf, [-4, 50, -24], [8, 2, 5], "fell")
    for x0 in (-10, 8):
        k(kopf, [x0, 37, -21], [2, 6, 5], "fell")                      # kleine Ohren
    zaehne = m.knoch("stosszaehne", [0, 32, -27], "kopf")
    for mitte, groesse, dreh in stosszahn_bogen():
        ursprung = [mitte[i] - groesse[i] / 2 for i in range(3)]
        k(zaehne, ursprung, groesse, "zahn", drehung=dreh, drehpunkt=mitte)
        gespiegelt = [-mitte[0], mitte[1], mitte[2]]
        k(zaehne, spiegel(ursprung, groesse), groesse, "zahn", drehung=[dreh[0], -dreh[1], -dreh[2]],
          drehpunkt=gespiegelt)
    r1 = m.knoch("ruessel1", [0, 34, -28], "kopf")
    k(r1, [-3.5, 26, -32], [7, 9, 5], "ruessel")
    r2 = m.knoch("ruessel2", [0, 26, -30], "ruessel1")
    k(r2, [-3, 17, -32], [6, 9, 4], "ruessel")
    r3 = m.knoch("ruessel3", [0, 17, -30], "ruessel2")
    k(r3, [-2.5, 9, -31.5], [5, 8, 4], "ruessel")
    k(r3, [-3, 8, -32], [6, 1, 5], "ruesselspitze")

    for name, x, z in (("bein_vl", 7, -9), ("bein_vr", -7, -9), ("bein_hl", 7, 9), ("bein_hr", -7, 9)):
        b = m.knoch(name, [x, 26, z], "koerper")
        k(b, [x - 4.5, 0, z - 4.5], [9, 26, 9], "bein")
        k(b, [x - 5, 10, z - 5], [10, 5, 10], "fell_lang")             # Fellmanschette am Knie
        k(b, [x - 5, 0, z - 5], [10, 2, 10], "fuss")
    schwanz = m.knoch("schwanz", [0, 42, 15], "koerper")
    k(schwanz, [-1, 32, 15], [2, 10, 2], "fell")
    k(schwanz, [-1.5, 29, 14.5], [3, 3, 3], "fell_lang")
    return m, r


# ============================================================ Malen

FELL = "#5b3b27"
FELL_H = "#6c4630"
FELL_D = "#4a3020"
RAUREIF = (224, 238, 248)
ELFENBEIN = "#eadfc4"
EIS = [(236, 250, 255), (184, 228, 255), (132, 196, 240), (96, 160, 220)]
FROST_GLUT = (150, 225, 255, 254)


def maler(r, phase):
    def male(stoff_name, p, n, texel):
        stoff = stoff_name.split("|")[0]
        lo, hi = r.grenzen[stoff_name]
        rand = randabstand(p, n, (lo, hi))
        oben = n[1] > 0.5
        licht = 0.08 if oben else (-0.12 if n[1] < -0.5 else 0.0)
        # Raureif: auf allem, was nach oben schaut und hoch liegt, in Flecken.
        if oben and stoff in ("fell", "kopf") and wolken(p, 4.0, 701) > 0.42:
            return mische(RAUREIF, hexfarbe(FELL_H), 0.15 * streu(texel[0], texel[1], 702))
        if phase == 2 and stoff == "fell" and p[1] > 30 and wolken(p, 2.0, 720) > 0.7:
            # Wo der Panzer sass, bleiben gluehende Frostflecken im Fell - man
            # sieht auch von hinten, dass es jetzt ernst wird.
            return FROST_GLUT
        if stoff in ("fell", "fell_lang"):
            # Zotteln in Flecken, nicht in Streifen (Fynns Regel): drei Toene
            # nach einem ruhigen Rauschen, unten am Fellrock dunkle Spitzen.
            if stoff == "fell_lang" and p[1] - lo[1] < 1.2 and int(p[0] + p[2]) % 2 == 0:
                return tm_ton(FELL_D, p, n, texel, 703)
            w = wolken(p, 3.0, 704)
            grund = FELL_D if w < 0.38 else (FELL if w < 0.6 else FELL_H)
            return tm_ton(grund, p, n, texel, 705, hell=licht, wolke=0.04, straehne=0.0)
        if stoff == "kopf":
            vorn = n[2] < -0.5
            # Kleine Augen seitlich vorn; in Phase zwei gluehen sie eisblau.
            if abs(n[0]) > 0.5 and 39 <= p[1] < 40.2 and -25.5 <= p[2] < -24:
                return FROST_GLUT if phase == 2 else (24, 18, 14)
            if vorn and phase == 2 and abs(p[0]) < 1 and p[1] > 40:
                return FROST_GLUT
            return tm_ton(FELL_D if vorn else FELL, p, n, texel, 706, hell=licht, wolke=0.06, straehne=0.0)
        if stoff == "kern":
            if phase == 2:
                # Der Frostkern: gluehende Risse in einem Stern.
                d = abs(p[0]) + abs(p[1] - 24.5)
                if d < 2.2 or (abs(p[0]) < 0.6) or (abs(p[1] - 24.5) < 0.6):
                    return FROST_GLUT
                return tm_ton("#2c4a66", p, n, texel, 707)
            return tm_ton(FELL_D, p, n, texel, 708)
        if stoff in ("eis", "eisplatte"):
            # Eis: hell an den Kanten, in der Mitte tiefer, ein Glanzstreif.
            i = 0 if rand < 0.6 else (1 if rand < 1.6 else 2)
            if oben:
                i = max(0, i - 1)
            f = EIS[i]
            if phase == 2:
                return f + (254,)
            return f
        if stoff == "zahn":
            t = max(0.0, min(1.0, (-p[2] - 32) / 22))
            return tm_ton("#%02x%02x%02x" % mische(hexfarbe(ELFENBEIN), (196, 176, 136), t * 0.6),
                          p, n, texel, 709, hell=licht, wolke=0.03, straehne=0.0)
        if stoff in ("ruessel", "ruesselspitze"):
            # Quer gefurcht wie beim Elefanten, aber mit Fellbueschen.
            if int(p[1]) % 3 == 0 and abs(n[2]) > 0.5:
                return tm_ton(FELL_D, p, n, texel, 710)
            return tm_ton("#4a3325", p, n, texel, 711, hell=licht)
        if stoff == "bein":
            w = wolken(p, 3.0, 712)
            return tm_ton(FELL_D if w < 0.45 else FELL, p, n, texel, 712, hell=licht - 0.04, straehne=0.0)
        if stoff == "fuss":
            return tm_ton("#3a3029", p, n, texel, 713)
        return (255, 0, 255)
    return male


def bauen():
    m, r = gestalt()
    geo = m.geometrie()
    geo["minecraft:geometry"][0]["description"]["identifier"] = f"geometry.fynn.{NAME}"
    return geo, m.male(maler(r, 1)), m.male(maler(r, 2))


# ============================================================ Bewegung

HALTUNG = {
    "koerper": [0, 0, 0], "kopf": [-5, 0, 0], "stosszaehne": [0, 0, 0],
    "ruessel1": [10, 0, 0], "ruessel2": [8, 0, 0], "ruessel3": [10, 0, 0],
    "bein_vl": [0, 0, 0], "bein_vr": [0, 0, 0], "bein_hl": [0, 0, 0], "bein_hr": [0, 0, 0], "schwanz": [10, 0, 0],
}
VORN_BEINE = ("bein_vl", "bein_vr")


def grund():
    return bk.grundpose(HALTUNG, ["wurzel", "eispanzer"])


def ablauf(laenge, bilder, **weiter):
    return bk.ablauf(grund(), laenge, [(t, standfest(b)) for t, b in bilder], **weiter)


def standfest(bild):
    """Die Hinterbeine haengen am Rumpf. Baeumt er sich auf, wuerden sie
    mitkippen und in der Luft stehen - deshalb drehen sie um denselben
    Winkel zurueck, und die Fuesse bleiben am Boden."""
    if "koerper" not in bild:
        return bild
    kx = bild["koerper"][0]
    bild = dict(bild)
    for bein in ("bein_hl", "bein_hr"):
        alt = bild.get(bein, [0, 0, 0])
        bild[bein] = [alt[0] - kx, alt[1], alt[2]]
    return bild


def haltung():
    knochen = {k: {"rotation": list(v)} for k, v in HALTUNG.items()}
    knochen["koerper"]["rotation"][0] = "math.sin(query.life_time * 50.0) * 1.2"
    knochen["kopf"]["rotation"] = ["-5.0 + math.sin(query.life_time * 50.0 + 60.0) * 2.0",
                                   "math.sin(query.life_time * 23.0) * 6.0", 0.0]
    knochen["ruessel2"]["rotation"] = ["8.0 + math.sin(query.life_time * 70.0) * 6.0", 0.0,
                                       "math.sin(query.life_time * 40.0) * 8.0"]
    knochen["ruessel3"]["rotation"] = ["10.0 + math.sin(query.life_time * 70.0 - 40.0) * 8.0", 0.0, 0.0]
    knochen["schwanz"]["rotation"] = ["10.0", 0.0, "math.sin(query.life_time * 90.0) * 12.0"]
    return {"loop": True, "bones": knochen}


def gang():
    t = "query.anim_time * 22.0"
    return {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": {
        "bein_vl": {"rotation": [f"math.cos({t}) * 24.0", 0.0, 0.0]},
        "bein_hr": {"rotation": [f"math.cos({t}) * 24.0", 0.0, 0.0]},
        "bein_vr": {"rotation": [f"-math.cos({t}) * 24.0", 0.0, 0.0]},
        "bein_hl": {"rotation": [f"-math.cos({t}) * 24.0", 0.0, 0.0]},
        "wurzel": {"position": [0.0, f"-math.abs(math.sin({t})) * 0.8", 0.0]},
        "kopf": {"rotation": [f"math.sin({t} * 2.0) * 3.0", 0.0, 0.0]},
        "ruessel2": {"rotation": [0.0, 0.0, f"math.sin({t}) * 10.0"]},
        "schwanz": {"rotation": [0.0, 0.0, f"math.sin({t}) * 15.0"]},
    }}


def panzer_weg():
    """Phase zwei: der Eispanzer ist zersprungen."""
    return {"loop": True, "bones": {"eispanzer": {"scale": 0.0}}}


def hieb_kopf():
    return ablauf(0.8, [
        (0.30, {"kopf": [-18, 0, 0], "koerper": [-4, 0, 0], "ruessel1": [-20, 0, 0]}),
        (0.45, {"kopf": [26, 0, 0], "koerper": [6, 0, 0], "ruessel1": [30, 0, 0], "wurzel": {"position": [0, 0, -2]}}),
        (0.60, {"kopf": [18, 0, 0]}),
    ])


def hieb_stampf():
    return ablauf(0.8, [
        (0.30, {"bein_vl": [-55, 0, 0], "koerper": [-8, 0, 0], "kopf": [-12, 0, 0]}),
        (0.45, {"bein_vl": [12, 0, 0], "koerper": [4, 0, 0], "kopf": [10, 0, 0]}),
    ])


def galopp(von, bis, schritt=0.15):
    b = []
    t, i = von, 0
    while t <= bis + 1e-9:
        a = 1 if i % 2 == 0 else -1
        b.append((round(t, 2), {"bein_vl": [-40 * a, 0, 0], "bein_hr": [-40 * a, 0, 0],
                                "bein_vr": [40 * a, 0, 0], "bein_hl": [40 * a, 0, 0]}))
        t += schritt
        i += 1
    return b


def ansturm():
    """Mit dem Vorderfuss scharren, den Kopf senken - und los (0,8 bis
    1,8 s): alles in der Bahn fliegt zur Seite. Dann rutscht es aus."""
    return ablauf(2.6, [
        (0.25, {"bein_vr": [-40, 0, 0], "kopf": [12, 0, 0]}),
        (0.45, {"bein_vr": [20, 0, 0]}),
        (0.65, {"bein_vr": [-40, 0, 0], "kopf": [20, 0, 0], "ruessel1": [30, 0, 0]}),
        (0.80, {"bein_vr": [0, 0, 0], "kopf": [26, 0, 0], "ruessel1": [40, 0, 0], "ruessel2": [20, 0, 0],
                "koerper": [6, 0, 0]}),
    ] + galopp(0.9, 1.8) + [
        (2.00, {"koerper": [-10, 0, 0], "bein_vl": [-30, 0, 0], "bein_vr": [-30, 0, 0], "bein_hl": [20, 0, 0],
                "bein_hr": [20, 0, 0], "kopf": [-10, 0, 0], "ruessel1": [-10, 0, 0]}),
    ])


def stampfen():
    """Aufbaeumen auf die Hinterbeine - und mit den Vorderbeinen in den
    Boden (0,8 s): eine Welle laeuft nach aussen. Wer springt, entgeht ihr."""
    return ablauf(2.0, [
        (0.60, {"koerper": [-32, 0, 0], "bein_vl": [-50, 0, 0], "bein_vr": [-40, 0, 0], "kopf": [-22, 0, 0],
                "ruessel1": [-40, 0, 0], "ruessel2": [-30, 0, 0], "ruessel3": [-30, 0, 0], "schwanz": [40, 0, 0]}),
        (0.80, {"koerper": [6, 0, 0], "bein_vl": [10, 0, 0], "bein_vr": [10, 0, 0], "kopf": [18, 0, 0],
                "ruessel1": [30, 0, 0], "ruessel2": [10, 0, 0], "ruessel3": [0, 0, 0], "wurzel": {"position": [0, -1.5, 0]}}),
        (1.20, {"koerper": [4, 0, 0], "wurzel": {"position": [0, -1.0, 0]}}),
    ])


def stosszahnfeger():
    """Der Kopf schwingt nach rechts, dann mit den Zaehnen nach links und
    wieder zurueck - zwei Treffer (0,6 / 0,95 s)."""
    return ablauf(1.6, [
        (0.35, {"kopf": [10, -40, -8], "koerper": [0, -6, 0]}),
        (0.60, {"kopf": [16, 45, 10], "koerper": [0, 8, 0], "ruessel2": [0, 0, -25]}),
        (0.95, {"kopf": [12, -45, -10], "koerper": [0, -8, 0], "ruessel2": [0, 0, 25]}),
        (1.20, {"kopf": [4, 0, 0], "koerper": [0, 0, 0], "ruessel2": [8, 0, 0]}),
    ])


def eiszapfenregen():
    """Den Ruessel hoch, ein Trompeten - ueber den Gegnern bilden sich
    Zeichen (1,0 s), dann fallen die Eiszapfen (1,8 s)."""
    hoch = {"kopf": [-30, 0, 0], "ruessel1": [-70, 0, 0], "ruessel2": [-40, 0, 0], "ruessel3": [-35, 0, 0]}
    return ablauf(2.6, [
        (0.50, dict(hoch, koerper=[-6, 0, 0])),
        (1.00, dict(hoch, kopf=[-34, 0, 0])),
        (1.80, {"kopf": [0, 0, 0], "ruessel1": [0, 0, 0], "ruessel2": [0, 0, 0], "ruessel3": [0, 0, 0],
                "koerper": [2, 0, 0]}),
    ])


def ruesselschleuder():
    """Der Ruessel holt unter dem Kopf aus und schleudert den Gegner hoch
    in die Luft (0,7 s)."""
    return ablauf(1.6, [
        (0.40, {"kopf": [22, 0, 0], "ruessel1": [40, 0, 0], "ruessel2": [30, 0, 0], "ruessel3": [20, 0, 0],
                "koerper": [4, 0, 0]}),
        (0.70, {"kopf": [-22, 0, 0], "ruessel1": [-85, 0, 0], "ruessel2": [-30, 0, 0], "ruessel3": [-20, 0, 0],
                "koerper": [-6, 0, 0]}),
        (1.00, {"kopf": [-10, 0, 0], "ruessel1": [-40, 0, 0]}),
    ])


def frostatem():
    """Phase zwei: tief einatmen, dann den Ruessel nach vorn und Frost
    speien (0,6 bis 2,2 s), dabei einmal nach links und rechts."""
    atem = {"ruessel1": [-75, 0, 0], "ruessel2": [-10, 0, 0], "ruessel3": [-5, 0, 0]}
    return ablauf(2.6, [
        (0.40, {"kopf": [-28, 0, 0], "ruessel1": [-50, 0, 0], "koerper": [-6, 0, 0]}),
        (0.60, dict(atem, kopf=[14, 0, 0], koerper=[4, 0, 0])),
        (1.20, dict(atem, kopf=[14, 28, 0])),
        (1.80, dict(atem, kopf=[14, -28, 0])),
        (2.20, dict(atem, kopf=[10, 0, 0])),
    ])


def eiswoelfe():
    """Aufbaeumen und ein langes Trompeten - aus dem Schnee springen
    Eiswoelfe (1,2 s)."""
    return ablauf(2.2, [
        (0.50, {"koerper": [-16, 0, 0], "kopf": [-35, 0, 0], "ruessel1": [-70, 0, 0], "ruessel2": [-40, 0, 0],
                "ruessel3": [-20, 0, 0], "bein_vl": [-20, 0, 0], "bein_vr": [-20, 0, 0]}),
        (1.40, {"kopf": [-38, 0, 0]}),
    ])


KNIEN = {"koerper": [18, 0, 0], "wurzel": {"position": [0, -4.0, 0]}, "bein_vl": [-60, 0, 0],
         "bein_vr": [-60, 0, 0], "kopf": [25, 0, 0], "ruessel1": [20, 0, 0], "ruessel2": [10, 0, 0]}


def wechsel():
    """Phase eins ist leer: es baeumt sich auf, bricht vorn in die Knie und
    laedt sich auf (1,0 bis 3,6 s) - Frost wirbelt, der Panzer knackt. Dann
    erhebt es sich, und beim Aufschlag (4,2 s) zerspringt der Eispanzer."""
    return ablauf(5.0, [
        (0.30, {"koerper": [-25, 0, 0], "kopf": [-30, 0, 0], "ruessel1": [-60, 0, 0], "bein_vl": [-30, 0, 0],
                "bein_vr": [-30, 0, 0]}),
        (1.00, dict(KNIEN)),
        (3.60, dict(KNIEN, kopf=[5, 0, 0], ruessel1=[-20, 0, 0])),
        (3.90, {"koerper": [-35, 0, 0], "wurzel": {"position": [0, 0, 0]}, "bein_vl": [-50, 0, 0],
                "bein_vr": [-50, 0, 0], "kopf": [-30, 0, 0], "ruessel1": [-70, 0, 0], "ruessel2": [-40, 0, 0]}),
        (4.20, {"koerper": [6, 0, 0], "bein_vl": [10, 0, 0], "bein_vr": [10, 0, 0], "kopf": [20, 0, 0],
                "ruessel1": [30, 0, 0], "ruessel2": [10, 0, 0], "wurzel": {"position": [0, -1.5, 0]}}),
        (4.60, {"koerper": [0, 0, 0], "kopf": [0, 0, 0], "wurzel": {"position": [0, 0, 0]}}),
    ])


def beben():
    huelle = "math.clamp((query.anim_time - 1.0) / 2.6, 0.0, 1.0) * (query.anim_time < 3.6)"
    return {"loop": "hold_on_last_frame", "animation_length": 5.0, "bones": {
        "koerper": {"rotation": [f"math.sin(query.anim_time * 2400.0) * 1.2 * {huelle}", 0.0,
                                 f"math.sin(query.anim_time * 1700.0) * 1.2 * {huelle}"]},
        "eispanzer": {"scale": f"1.0 + math.abs(math.sin(query.anim_time * 1500.0)) * 0.08 * {huelle}"},
    }}


def auftritt():
    return ablauf(3.0, [
        (0.0, dict(KNIEN, kopf=[30, 0, 0])),
        (1.00, dict(KNIEN, kopf=[20, 0, 0])),
        (1.80, {"koerper": [-35, 0, 0], "wurzel": {"position": [0, 0, 0]}, "bein_vl": [-50, 0, 0],
                "bein_vr": [-50, 0, 0], "kopf": [-35, 0, 0], "ruessel1": [-75, 0, 0], "ruessel2": [-40, 0, 0],
                "ruessel3": [-30, 0, 0]}),
        (2.30, {"koerper": [4, 0, 0], "bein_vl": [8, 0, 0], "bein_vr": [8, 0, 0], "kopf": [10, 0, 0],
                "ruessel1": [20, 0, 0], "ruessel2": [8, 0, 0], "ruessel3": [10, 0, 0]}),
    ])


def abschied():
    return ablauf(4.0, [
        (0.40, {"koerper": [-10, 0, 0], "kopf": [-20, 0, 0], "ruessel1": [-50, 0, 0]}),
        (1.20, dict(KNIEN)),
        (2.40, dict(KNIEN, koerper=[10, 0, 12], wurzel={"position": [0, -8.0, 0]}, bein_hl=[70, 0, 0],
                    bein_hr=[70, 0, 0], kopf=[35, 0, 10], ruessel1=[30, 0, 0], ruessel2=[20, 0, 0])),
        (4.00, dict(KNIEN, koerper=[10, 0, 14], wurzel={"position": [0, -8.0, 0]}, bein_hl=[70, 0, 0],
                    bein_hr=[70, 0, 0], kopf=[38, 0, 12], ruessel1=[34, 0, 0], ruessel2=[24, 0, 0])),
    ], zurueck=False)


ANGRIFFE = {
    "ansturm": (1, ansturm, {"los": 0.8, "halt": 1.8}),
    "stampfen": (2, stampfen, {"schlag": 0.8}),
    "stosszahnfeger": (3, stosszahnfeger, {"treffer": [0.6, 0.95]}),
    "eiszapfenregen": (4, eiszapfenregen, {"zeichen": 1.0, "fall": 1.8}),
    "ruesselschleuder": (5, ruesselschleuder, {"wurf": 0.7}),
    "frostatem": (6, frostatem, {"von": 0.6, "bis": 2.2}),
    "eiswoelfe": (7, eiswoelfe, {"ruf": 1.2}),
    "wechsel": (8, wechsel, {"laden_von": 1.0, "laden_bis": 3.6, "umschlag": 4.2}),
    "auftritt": (9, auftritt, {"bereit": 2.8}),
    "abschied": (10, abschied, {"beute": 3.2}),
}
HIEBE = [("hieb_kopf", hieb_kopf), ("hieb_stampf", hieb_stampf)]


def alle_animationen():
    anims = {PRAEFIX + "haltung": haltung(), PRAEFIX + "gang": gang(), PRAEFIX + "beben": beben(),
             PRAEFIX + "panzer_weg": panzer_weg()}
    for name, bau in HIEBE:
        anims[PRAEFIX + name] = bau()
    for name, (_, bau, _) in ANGRIFFE.items():
        a = bau()
        a["loop"] = "hold_on_last_frame"
        anims[PRAEFIX + name] = a
    return anims


# ============================================================ Eiswolf

def wolf_gestalt():
    """Ein Wolf aus Schnee und Frost - klein, schnell, eisblaue Augen."""
    m = Modell("eiswolf", sichtbreite=1.5, sichthoehe=1.5)
    m.knoch("wurzel", [0, 0, 0])
    koerper = m.knoch("koerper", [0, 10, 0], "wurzel")
    koerper.kasten([-3, 7, -6], [6, 6, 12], "fell")
    koerper.kasten([-3.5, 7.5, -8], [7, 7, 4], "mahne")
    kopf = m.knoch("kopf", [0, 12, -8], "koerper")
    kopf.kasten([-3, 10, -13], [6, 6, 5], "kopf")
    kopf.kasten([-1.5, 10, -16], [3, 3, 3], "schnauze")
    kopf.kasten([-3, 16, -10], [2, 2, 1], "ohr")
    kopf.kasten([1, 16, -10], [2, 2, 1], "ohr")
    for name, x, z in (("bein0", -2, -4), ("bein1", 2, -4), ("bein2", -2, 4), ("bein3", 2, 4)):
        m.knoch(name, [x, 8, z], "koerper").kasten([x - 1, 0, z - 1], [2, 8, 2], "bein")
    m.knoch("schwanz", [0, 12, 6], "koerper", drehung=[-40, 0, 0]).kasten([-1, 10, 6], [2, 2, 7], "schwanz")
    return m


def wolf_maler(stoff, p, n, texel):
    if stoff == "kopf" and abs(n[2]) > 0.5 and n[2] < 0 and 13.2 <= p[1] < 14.2 and 1 <= abs(p[0]) < 2.4:
        return (150, 225, 255, 254)
    if stoff == "schnauze" and n[2] < -0.5 and p[1] > 12:
        return (40, 50, 64)
    if stoff in ("mahne", "fell") and n[1] > 0.5 and streu(texel[0], texel[1], 801) > 0.75:
        return (170, 225, 250)                                    # Eiskristalle im Fell
    grund = "#e4eef6" if stoff != "bein" else "#c8d6e2"
    if stoff == "mahne":
        grund = "#f2f8fc"
    return tm_ton(grund, p, n, texel, 802, hell=0.06 if n[1] > 0.5 else (-0.1 if n[1] < -0.5 else 0.0),
                  wolke=0.05, straehne=0.0)


def wolf_animationen():
    return {
        "animation.fynn.eiswolf.stehen": {"loop": True, "bones": {
            "schwanz": {"rotation": [0.0, "math.sin(query.life_time * 200.0) * 15.0", 0.0]},
            "kopf": {"rotation": ["math.sin(query.life_time * 80.0) * 3.0", 0.0, 0.0]}}},
        "animation.fynn.eiswolf.laufen": tm.lauf_animation(
            [("bein0", 1), ("bein3", 1), ("bein1", -1), ("bein2", -1)], winkel=45.0),
        "animation.fynn.eiswolf.biss": {"animation_length": 0.4, "bones": {
            "kopf": {"rotation": {"0.0": [0, 0, 0], "0.15": [-20, 0, 0], "0.25": [20, 0, 0], "0.4": [0, 0, 0]}}}},
    }


def wolf_aussehen():
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": "fynn:eiswolf",
        "materials": {"default": "entity_emissive_alpha"},
        "textures": {"default": "textures/entity/eiswolf"},
        "geometry": {"default": "geometry.fynn.eiswolf"},
        "animations": {"stehen": "animation.fynn.eiswolf.stehen", "laufen": "animation.fynn.eiswolf.laufen",
                       "biss": "animation.fynn.eiswolf.biss"},
        "scripts": {"animate": ["stehen", {"laufen": "math.clamp(query.modified_move_speed * 2.0, 0.0, 1.0)"},
                                {"biss": "variable.attack_time > 0.0"}]},
        "render_controllers": ["controller.render.default"],
        "spawn_egg": ei_eintrag("eiswolf", {"base_color": "#e4eef6", "overlay_color": "#6ec8f0"}),
    }}}


def wolf_verhalten():
    spieler = {"all_of": [{"test": "is_family", "subject": "other", "value": "player"},
                          {"test": "has_ability", "subject": "other", "value": "instabuild", "operator": "!="}]}
    return {"format_version": "1.21.90", "minecraft:entity": {
        "description": {"identifier": "fynn:eiswolf", "is_spawnable": True, "is_summonable": True},
        "component_groups": {"fynn:vergehen": {"minecraft:instant_despawn": {}}},
        "components": {
            "minecraft:type_family": {"family": ["eiswolf", "frostmammut", "monster", "mob"]},
            "minecraft:health": {"value": 16, "max": 16},
            "minecraft:attack": {"damage": 4, "effect_name": "slowness", "effect_duration": 3},
            "minecraft:collision_box": {"width": 0.7, "height": 0.9},
            "minecraft:movement": {"value": 0.38},
            "minecraft:movement.basic": {},
            "minecraft:navigation.walk": {"avoid_water": True},
            "minecraft:jump.static": {},
            "minecraft:physics": {},
            "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
            "minecraft:damage_sensor": {"triggers": [{"cause": "fall", "deals_damage": "no"},
                                                     {"cause": "freezing", "deals_damage": "no"}]},
            "minecraft:loot": {"table": "loot_tables/entities/eiswolf.json"},
            "minecraft:experience_reward": {"on_death": "query.last_hit_by_player ? 5 : 0"},
            # Aus Schnee gemacht: nach 45 Sekunden zerfaellt er wieder.
            "minecraft:timer": {"time": 45, "looping": False, "time_down_event": {"event": "fynn:vergehen"}},
            "minecraft:behavior.leap_at_target": {"priority": 2, "yd": 0.4, "must_be_on_ground": True},
            "minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.3, "track_target": True},
            "minecraft:behavior.nearest_attackable_target": {"priority": 1, "must_see": False, "within_radius": 24,
                                                             "entity_types": [{"filters": spieler, "max_dist": 24}]},
            "minecraft:behavior.random_stroll": {"priority": 6},
        },
        "events": {"fynn:vergehen": {"add": {"component_groups": ["fynn:vergehen"]}}}}}


# ============================================================ Bossleiste

BALKEN_1 = [(226, 248, 255), (160, 222, 250), (98, 186, 236), (58, 138, 206), (36, 90, 160)]
BALKEN_2 = [(246, 254, 255), (190, 240, 255), (120, 214, 250), (70, 166, 236), (40, 110, 196)]
EISTAUSCH = {
    (237, 211, 131): (246, 238, 214), (204, 160, 75): (226, 214, 184), (193, 154, 83): (212, 198, 164),
    (143, 109, 51): (168, 152, 118), (240, 232, 189): (252, 250, 240), (69, 89, 184): (120, 210, 250),
    (183, 183, 190): (206, 226, 238), (85, 87, 95): (96, 118, 136), (232, 230, 234): (240, 250, 255),
}
ZAHNWAPPEN = [
    ".....asma.....",
    "...aajssjaa...",
    ".aaffjjjjjfaa.",
    "aafjnnnnnnjfaa",
    "afjnZnnnnZnjra",
    "fjnZZnnnnZZnjr",
    "fjZZnnInnnZZjr",
    "fjZnnIiInnnZjr",
    "fjZnnnIiInnZjr",
    "fjZZnnnInnZZjr",
    "fjnZZnnnnZZnjr",
    "fjjnZZnnZZnjjr",
    "afjgnnnnnngjra",
    "aagggnnnngggaa",
    ".aaggggggggaa.",
    "...aaggggaa...",
    ".....aaaa.....",
]
ZAHNWAPPEN_FARBEN = {"a": (19, 18, 23), "s": (206, 230, 244), "m": (240, 250, 255), "f": (246, 238, 214),
                     "j": (226, 214, 184), "r": (212, 198, 164), "g": (168, 152, 118), "n": (30, 60, 96),
                     "Z": (238, 228, 200), "I": (140, 220, 255), "i": (230, 250, 255)}


def bossleiste():
    import bossbar_bauen as bb
    grund_ = bb.umgefaerbt(bb.rahmen(), EISTAUSCH)
    rahmen1 = bb.mit_medaillon(grund_, ZAHNWAPPEN, ZAHNWAPPEN_FARBEN)
    rahmen2 = bb.mit_schein(rahmen1, (150, 214, 245))
    return {
        "kennung": NAME, "marke": "Hrimgar", "titel": ("Hrimgar", "Hrimgar · Phase 2"),
        "namensfarben": ([0.9, 0.97, 1.0], [0.55, 0.88, 1.0]),
        "teile": {"rahmen": rahmen1, "rahmen_entfesselt": rahmen2, "leer": bb.rinne(None, leer=True),
                  "voll": bb.rinne(BALKEN_1), "entfesselt": bb.rinne(BALKEN_2)},
    }


# ============================================================ Partikel

EISZAPFEN_BILD = ["...w....", "..wbb...", "..wbb...", "..wbb...", "..wbb...", "...wb...", "...wb...", "...b...."] * 2
FLOCKE_BILD = ["...w....", ".w.w.w..", "..www...", "wwwbwww.", "..www...", ".w.w.w..", "...w....", "........"]


def karte_bild(karte, farben):
    b = Image.new("RGBA", (len(karte[0]), len(karte)), (0, 0, 0, 0))
    for y, zeile in enumerate(karte):
        for x, z in enumerate(zeile):
            if z != ".":
                b.putpixel((x, y), farben[z])
    return b


def partikel_bilder():
    f = {"w": (240, 250, 255, 255), "b": (140, 210, 250, 255)}
    return {"fynn_eiszapfen": karte_bild(EISZAPFEN_BILD, f), "fynn_flocke": karte_bild(FLOCKE_BILD, f)}


def alle_partikel():
    def p(name, textur, teile):
        return {"format_version": "1.10.0", "particle_effect": {
            "description": {"identifier": f"fynn:{name}", "basic_render_parameters": {
                "material": "particles_blend", "texture": f"textures/particle/{textur}"}},
            "components": teile}}
    aus = {"minecraft:particle_appearance_tinting": {"color": [1, 1, 1, "1 - v.particle_age / v.particle_lifetime"]}}
    return {
        "frostwolke": p("frostwolke", "fynn_flocke", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 18},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_sphere": {"radius": 0.8, "direction": "outwards"},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "0.8 + math.random(0, 0.6)"},
            "minecraft:particle_initial_speed": "math.random(1, 3)",
            "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": 120},
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -1.2, 0], "linear_drag_coefficient": 1.5},
            "minecraft:particle_appearance_billboard": {"size": [0.14, 0.14], "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}}}, **aus)),
        "eiszapfen": p("eiszapfen", "fynn_eiszapfen", {
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {"offset": [0, 7, 0], "direction": [0, -1, 0]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.3},
            "minecraft:particle_initial_speed": 23,
            "minecraft:particle_appearance_billboard": {"size": [0.25, 0.9], "facing_camera_mode": "lookat_y",
                "uv": {"texture_width": 8, "texture_height": 16, "uv": [0, 0], "uv_size": [8, 16]}}}),
        # Flocken, die langsam sinken: Zeichen fuer den Eiszapfenregen, der
        # Wirbel beim Aufladen und die Frostaura in Phase zwei.
        "flocke": p("flocke", "fynn_flocke", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 3},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_sphere": {"radius": 0.3, "direction": "outwards"},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "1.2 + math.random(0, 0.8)"},
            "minecraft:particle_initial_speed": 0.3,
            "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": 60},
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -0.6, 0], "linear_drag_coefficient": 2.0},
            "minecraft:particle_appearance_billboard": {"size": [0.12, 0.12], "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}}}, **aus)),
        "frostatem": p("frostatem", "fynn_flocke", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 10},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_sphere": {"radius": 0.5, "direction": "outwards"},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.6},
            "minecraft:particle_initial_speed": 1.5,
            "minecraft:particle_appearance_billboard": {"size": ["0.2 + v.particle_age * 0.4", "0.2 + v.particle_age * 0.4"],
                "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}}}, **aus)),
    }


# ============================================================ Gegenstaende

FROSTZAHN = {
    "karte": [
        "...w...",
        "..wiw..",
        "..wiI..",
        "..wiI..",
        "..wiI..",
        "..wiI..",
        "..ZiI..",
        "..ZZi..",
        "..ZZZ..",
        "..ZZZ..",
        ".nnZnn.",
        "nnnZZnn",
        "...L...",
        "...l...",
        "...L...",
        "...l...",
        "...L...",
        "..nnn..",
    ],
    "farben": {"w": (236, 250, 255), "i": (170, 228, 252), "I": (110, 190, 240), "Z": (234, 224, 196),
               "n": (120, 96, 70), "L": (92, 70, 50), "l": (70, 52, 38)},
    "tiefe": {"w": 1.0, "i": 1.5, "I": 1.5, "Z": 2.0, "n": 2.5, "L": 2.0, "l": 2.0},
    "mitte": 3.5,
    "griff": "Ll",
}


def frostzahn_bild():
    punkte = {(14, 1): "w", (13, 1): "w", (14, 2): "i"}
    for i in range(7):
        x, y = 13 - i, 2 + i
        punkte[(x, y)] = "i" if i < 4 else "Z"
        punkte.setdefault((x + 1, y), "I" if i < 4 else "Z")
        punkte.setdefault((x - 1, y), "w" if i < 4 else "Z")
    for (x, y), z in (((5, 10), "n"), ((6, 9), "n"), ((4, 11), "n"), ((7, 8), "n")):
        punkte[(x, y)] = z
    for (x, y), z in (((4, 10), "L"), ((3, 11), "l"), ((2, 12), "L"), ((1, 13), "l"), ((0, 14), "n")):
        punkte[(x, y)] = z
    karte = [["."] * 16 for _ in range(16)]
    for (x, y), z in punkte.items():
        karte[y][x] = z
    import roland_beute_bauen as rbb
    return rbb.male(rbb.umrande(["".join(z) for z in karte]), dict(FROSTZAHN["farben"], k=rbb.UMRISS))


HERZ = [
    "................",
    "................",
    "...kkk....kkk...",
    "..kwwik..kiiik..",
    ".kwwiiikkiiiIik.",
    ".kwiiiiiiiiiIIk.",
    ".kiiiiiiiiiiIIk.",
    ".kiiiiiiiiiIIIk.",
    "..kiiiiiiiiIIk..",
    "...kiiiiiiIIk...",
    "....kiiiiIIk....",
    ".....kiiIIk.....",
    "......kIIk......",
    ".......kk.......",
    "................",
    "................",
]
FROSTRUF = [
    "................",
    "..........kk....",
    ".........kZZk...",
    "........kZZk....",
    ".......kZZZk....",
    "......kZZZk.....",
    ".....kZbbZk.....",
    "....kZZZZk......",
    "...kiiZZk.......",
    "..kiIIik........",
    ".kiIIIik........",
    ".kiIIIk.........",
    ".kkiIk..........",
    "...kk...........",
    "................",
    "................",
]


def gegenstaende():
    import waffe_bauen as w
    import roland_beute_bauen as rbb
    from neue_waffen_bauen import halten, waffen_attachable, gegenstand, rezept
    v = FROSTZAHN
    w.aus_zeichenkarte("frostzahn", v["karte"], {k: f + (255,) for k, f in v["farben"].items()},
                       dicke=lambda zeile, spalte, zeichen: v["tiefe"][zeichen], mitte=v["mitte"],
                       ziel_modell=str(RES / "models" / "entity" / "frostzahn.geo.json"),
                       ziel_textur=str(RES / "textures" / "entity" / "frostzahn_haut.png"))
    bk.schreibe(RES / "attachables" / "frostzahn.json", waffen_attachable("frostzahn"))
    bk.schreibe(RES / "animations" / "frostzahn.animation.json", {"format_version": "1.10.0", "animations": {
        "animation.frostzahn.halten": halten(v["karte"], v["griff"])}})
    bk.schreibe(VER / "items" / "frostzahn.json", gegenstand("frostzahn", {
        "minecraft:hand_equipped": True, "minecraft:damage": 9, "minecraft:rarity": "epic",
        "minecraft:durability": {"max_durability": 1600},
        "minecraft:enchantable": {"value": 16, "slot": "sword"},
        "minecraft:repairable": {"repair_items": [{"items": ["minecraft:packed_ice"], "repair_amount": 200}]},
        "minecraft:use_modifiers": {"use_duration": 0.1},
        "minecraft:cooldown": {"category": "fynn:frostzahn", "duration": 10.0},
    }))
    bk.schreibe(VER / "items" / "herz_des_winters.json", gegenstand("herz_des_winters", {
        "minecraft:rarity": "epic", "minecraft:use_modifiers": {"use_duration": 0.1},
    }, gruppe="fynn:itemGroup.name.jagd", stapel=16))
    bk.schreibe(VER / "items" / "frostruf.json", gegenstand("frostruf", {
        "minecraft:rarity": "rare", "minecraft:use_modifiers": {"use_duration": 0.1},
    }, gruppe="fynn:itemGroup.name.jagd", stapel=16))
    # Der Frostruf: ein Bisonhorn, mit Packeis gefasst, ein Diamant darin.
    bk.schreibe(VER / "recipes" / "frostruf.json", rezept(
        "frostruf", [" b ", "iDi", " i "],
        {"b": "fynn:bisonhorn", "i": "minecraft:packed_ice", "D": "minecraft:diamond"}))
    f_herz = {"k": rbb.UMRISS, "w": (246, 252, 255), "i": (160, 224, 252), "I": (90, 170, 230)}
    f_ruf = {"k": rbb.UMRISS, "Z": (230, 216, 180), "b": (120, 90, 60), "i": (190, 236, 255), "I": (110, 190, 240)}
    return {"frostzahn": frostzahn_bild(), "herz_des_winters": rbb.male(HERZ, f_herz),
            "frostruf": rbb.male(FROSTRUF, f_ruf)}


# ============================================================ Verhalten

GRUNDLEBEN = 280
GRUNDSCHADEN = 11
BEUTE = [
    ("fynn:frostzahn", 1, 1, 1.0),
    ("fynn:herz_des_winters", 1, 1, 1.0),
    ("minecraft:diamond", 3, 6, 1.0),
    ("minecraft:packed_ice", 8, 16, 1.0),
    ("minecraft:blue_ice", 2, 4, 1.0),
    ("minecraft:leather", 6, 12, 1.0),
    ("minecraft:emerald", 2, 4, 1.0),
    ("minecraft:experience_bottle", 4, 8, 1.0),
]
ANTEIL = [
    ("fynn:herz_des_winters", 1, 1, 0.5),
    ("minecraft:diamond", 1, 3, 1.0),
    ("minecraft:blue_ice", 1, 2, 1.0),
    ("minecraft:leather", 3, 6, 1.0),
    ("minecraft:experience_bottle", 2, 4, 1.0),
]


def verhalten():
    return bk.verhalten(TYP, ["frostmammut", "monster", "mob"], GRUNDLEBEN, GRUNDSCHADEN, (3.0, 4.0), {
        "minecraft:movement": {"value": 0.22},
        "minecraft:movement.basic": {},
        "minecraft:navigation.walk": {"can_path_over_water": False, "avoid_water": True},
        "minecraft:jump.static": {},
        "minecraft:variable_max_auto_step": {"base_value": 1.5, "jump_prevented_value": 1.5},
        "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
        "minecraft:knockback_resistance": {"value": 1.0},
        "minecraft:breathable": {"breathes_water": True},
        "minecraft:damage_sensor": {"triggers": [{"cause": "freezing", "deals_damage": "no"}]},
        "minecraft:experience_reward": {"on_death": "query.last_hit_by_player ? 140 : 0"},
        "minecraft:loot": {"table": "loot_tables/entities/frostmammut.json"},
        "minecraft:behavior.look_at_player": {"priority": 6, "look_distance": 14.0, "probability": 0.05},
        "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 0.6},
    }, nahkampf={"minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.25, "track_target": True}},
        phase_zwei={"minecraft:movement": {"value": 0.26}}, anzahl_angriffe=10)


NAMEN = [
    ("entity.fynn:frostmammut.name", "Hrimgar", "Hrimgar"),
    ("item.spawn_egg.entity.fynn:frostmammut.name", "Hrimgar, das Frostmammut", "Hrimgar the Frost Mammoth"),
    ("entity.fynn:eiswolf.name", "Eiswolf", "Ice Wolf"),
    ("item.spawn_egg.entity.fynn:eiswolf.name", "Eiswolf", "Ice Wolf"),
    ("item.fynn:frostzahn", "Frostzahn", "Frost Tusk"),
    ("item.fynn:frostzahn.name", "Frostzahn", "Frost Tusk"),
    ("item.fynn:herz_des_winters", "Herz des Winters", "Heart of Winter"),
    ("item.fynn:herz_des_winters.name", "Herz des Winters", "Heart of Winter"),
    ("item.fynn:frostruf", "Frostruf", "Frost Call"),
    ("item.fynn:frostruf.name", "Frostruf", "Frost Call"),
]


def main():
    geo, h1, h2 = bauen()
    bk.schreibe(RES / "models" / "entity" / f"{NAME}.geo.json", geo)
    h1.save(RES / "textures" / "entity" / f"{NAME}.png")
    h2.save(RES / "textures" / "entity" / f"{NAME}_entfesselt.png")
    anims = alle_animationen()
    bk.schreibe(RES / "animations" / f"{NAME}.animation.json", {"format_version": "1.10.0", "animations": anims})
    kurz = {nr: name for name, (nr, _, _) in ANGRIFFE.items()}
    bk.schreibe(RES / "animation_controllers" / f"{NAME}.animation_controllers.json", bk.steuerung(
        NAME, kurz, ["haltung", {"gang": "math.clamp(query.modified_move_speed * 2.5, 0.0, 1.0)"}],
        zusatz={"wechsel": ["beben"]}, hiebe=[h for h, _ in HIEBE]))
    bk.schreibe(RES / "entity" / f"{NAME}.entity.json", bk.aussehen(
        TYP, NAME, anims, PRAEFIX, 1.35, {"base_color": "#5b3b27", "overlay_color": "#bfe6ff"},
        skripte={"animate": ["kampf", {"panzer_weg": "query.property('fynn:phase') == 2"}]}))
    bk.schreibe(RES / "render_controllers" / f"{NAME}.render_controllers.json", bk.steuerplan(NAME))
    wolf = wolf_gestalt()
    bk.schreibe(RES / "models" / "entity" / "eiswolf.geo.json", wolf.geometrie())
    wolf.male(wolf_maler).save(RES / "textures" / "entity" / "eiswolf.png")
    bk.schreibe(RES / "animations" / "eiswolf.animation.json", {"format_version": "1.10.0",
                                                               "animations": wolf_animationen()})
    bk.schreibe(RES / "entity" / "eiswolf.entity.json", wolf_aussehen())
    bk.schreibe(VER / "entities" / "eiswolf.json", wolf_verhalten())
    bk.schreibe(VER / "loot_tables" / "entities" / "eiswolf.json", bk.beutetabelle(
        [("minecraft:snowball", 1, 3, 1.0), ("minecraft:ice", 1, 1, 0.3)]))
    bk.schreibe(VER / "entities" / f"{NAME}.json", verhalten())
    bk.schreibe(VER / "loot_tables" / "entities" / f"{NAME}.json", bk.beutetabelle(BEUTE))
    for name, daten in alle_partikel().items():
        bk.schreibe(RES / "particles" / f"{NAME}_{name}.particle.json", daten)
    for name, bild in partikel_bilder().items():
        bild.save(RES / "textures" / "particle" / f"{name}.png")
    zeiten = {name: (nr, bau()["animation_length"], z) for name, (nr, bau, z) in ANGRIFFE.items()}
    (VER / "scripts" / f"{NAME}_daten.js").write_text(
        bk.skriptdaten(zeiten, "frostmammut_bauen.py")
        + bk.werte_js("frostmammut_bauen.py", GRUNDLEBEN, 6, 30, BEUTE, ANTEIL).split("\n", 1)[1],
        encoding="utf-8")
    bk.item_bilder(gegenstaende())
    bk.sprache("Hrimgar, das Frostmammut", NAMEN)
    print("gebaut: Hrimgar, das Frostmammut")
    if "--bilder" in sys.argv:
        vorschau(Path(sys.argv[sys.argv.index("--bilder") + 1]), geo, h1, h2)


def vorschau(ordner, geo, h1, h2):
    from PIL import ImageDraw
    zellen = []
    for haut, titel, weg in ((h1, "Phase 1", []), (h2, "Phase 2 - Panzer zersprungen", [(panzer_weg(), 1.0)])):
        for gier in (40, 150):
            b = tm.ansehen(geo, haut, [(haltung(), 1.0)] + weg, {}, gier=gier, neigung=8, breite=360, hoehe=360,
                           zoom=4.2, mitte=(0, 28, -14))
            zellen.append((b, f"{titel}, {'vorn' if gier < 90 else 'hinten'}"))
    gesamt = Image.new("RGBA", (4 * 360, 380), (244, 245, 248, 255))
    zeichner = ImageDraw.Draw(gesamt)
    for i, (b, text) in enumerate(zellen):
        gesamt.paste(b, (i * 360, 0))
        zeichner.text((i * 360 + 10, 364), text, fill=(20, 20, 30, 255))
    ordner.mkdir(parents=True, exist_ok=True)
    gesamt.save(ordner / f"{NAME}.png")
    print("gezeichnet:", ordner / f"{NAME}.png")


if __name__ == "__main__":
    main()
