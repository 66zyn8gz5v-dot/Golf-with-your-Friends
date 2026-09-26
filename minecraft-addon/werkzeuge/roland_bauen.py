#!/usr/bin/env python3
"""Der erste Boss: Sir Roland von Ronceval, Oberkommandant des Ritterordens.

Fynn: "Das soll naemlich der Oberkommandant Roland oder Sir Roland ... Der
soll zwei Phasen haben ... ein paar Spezialangriffe, der kann ein bisschen
Magie, hat ein Schild, hat ein Schwert ... sehr coole Animationen ... Der
soll ein bisschen groesser sein ... Breiter ... Sehr elegante
Schwertschwuenge ... der kann wahrscheinlich auch so andere Ritter
beschwoeren." Dazu eine gepixelte Bossbar, besondere Beute und ein Boss,
der mit mehreren Spielern staerker wird.

Der Name kommt aus dem Rolandslied: Roland fiel bei Roncesvalles, sein
Schwert hiess Durendal, sein Horn Olifant. Beides laesst er fallen.

Diese Datei baut das Aussehen: Modell, Haut (zwei - die zweite Phase
leuchtet), das Schwert Durendal in seiner Hand. Die Bewegungen stehen in
roland_bewegung.py, der Kampf in verhaltenspaket/scripts/roland.js.

    python3 werkzeuge/roland_bauen.py [--bilder vorschau]
"""

import json
import math
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tiermodell as tm                                        # noqa: E402
from tiermodell import Modell, hexfarbe, mische, streu, wolken  # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

# Wo die rechte Faust sitzt: Hier liegt die Mitte von Durendals Griff.
HAND = [-7.5, 11.0, 0.0]


def schreibe(pfad, daten):
    pfad = Path(pfad)
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# ============================================================ Durendal

# Rolands Schwert: breiter und laenger als die Klingen der Ritter, eine
# Blutrinne voller Runen, die in der zweiten Phase blau glueht. Die
# Parierstange ist aus Gold mit hochgezogenen Enden wie Fluegel, in ihrer
# Mitte ein Saphir - der Orden fuehrt Blau. Kein Umriss: Fynns Regel fuer
# 3D-Waffen.
DURENDAL = {
    "karte": [
        ".....r.....",
        "....wrd....",
        "...wsrdD...",
        "...wsRdD...",
        "...wsrdD...",
        "...wsrdD...",
        "...wsRdD...",
        "...wsrdD...",
        "...wsrdD...",
        "...wsRdD...",
        "...wsrdD...",
        "...wsrdD...",
        "...wsRdD...",
        "...wsrdD...",
        "...wsrdD...",
        "...wsRdD...",
        "...wsrdD...",
        "...wsrdD...",
        "...wsRdD...",
        "...wsrdD...",
        "...wssdD...",
        "G..wssdD..G",
        "gG.wssdD.Gg",
        ".gggeEeggg.",
        "..GGGEGGG..",
        "....lLl....",
        "....LlL....",
        "....lLl....",
        "....LlL....",
        "....gEg....",
        "....GeG....",
        ".....G.....",
    ],
    "farben": {
        "w": (238, 242, 248), "s": (200, 208, 220), "d": (140, 148, 164), "D": (104, 112, 128),
        "r": (70, 110, 214), "R": (150, 200, 255),          # Runenrinne, Rune hell
        "g": (240, 200, 90), "G": (176, 128, 36),           # Gold
        "e": (150, 196, 255), "E": (40, 76, 190),           # Saphir
        "L": (34, 44, 104), "l": (22, 28, 74),              # blaues Leder
    },
    "tiefe": {"w": 1.5, "s": 2.0, "r": 2.0, "R": 2.0, "d": 2.0, "D": 1.5,
              "g": 3.0, "G": 3.0, "e": 4.0, "E": 3.5, "L": 2.5, "l": 2.5},
    "mitte": 5.5,
    "griff": "Ll",
}
# Was im Spiel leuchtet (Alpha 254, Material entity_emissive_alpha): die
# Runen und der Saphir. In der ersten Phase nur die Runen-Lichter.
DURENDAL_GLUT = {1: {"R"}, 2: {"R", "r", "e"}}


def durendal_modell(ordner):
    """Baut Durendal mit dem Werkzeug der anderen Klingen - einmal fuer
    den Gegenstand, hier fuer Rolands Hand."""
    import waffe_bauen as w
    v = DURENDAL
    geo_pfad, bild_pfad = Path(ordner) / "durendal.geo.json", Path(ordner) / "durendal.png"
    w.aus_zeichenkarte("durendal", v["karte"], {k: f + (255,) for k, f in v["farben"].items()},
                       dicke=lambda zeile, spalte, zeichen: v["tiefe"][zeichen], mitte=v["mitte"],
                       ziel_modell=str(geo_pfad), ziel_textur=str(bild_pfad))
    geo = json.loads(geo_pfad.read_text(encoding="utf-8"))["minecraft:geometry"][0]
    return geo, Image.open(bild_pfad).convert("RGBA")


# ============================================================ Gestalt

class Ruestung:
    """Merkt sich zu jedem Kasten seine Grenzen, damit der Maler Raender
    findet: Goldkanten an Schulterplatten, Schild und Umhang sind "nahe am
    Rand dieses Kastens" - so sitzen sie auf jeder Seite richtig."""

    def __init__(self):
        self.grenzen = {}

    def kasten(self, knochen, ursprung, groesse, stoff, **weiter):
        name = f"{stoff}|{len(self.grenzen)}"
        auf = weiter.get("aufblasen", 0.0)
        self.grenzen[name] = ([ursprung[i] - auf for i in range(3)],
                              [ursprung[i] + groesse[i] + auf for i in range(3)])
        knochen.kasten(ursprung, groesse, name, **weiter)


def gestalt():
    """Roland, gebaut wie ein Mensch, aber breiter: Rumpf zehn statt acht
    Pixel, Arme und Beine fuenf statt vier, dazu Schulterplatten, die ueber
    die Arme hinausragen. Im Spiel kommt noch ein Fuenftel Groesse dazu.

    Die Knochen sind so geschnitten, dass die Bewegungen elegant werden
    koennen: Der Rumpf dreht sich in der Huefte gegen die Beine (ein Hieb
    kommt aus der Drehung), der Umhang hat zwei Glieder, die nachschwingen,
    der Wappenrock haengt an der Huefte und weicht den Beinen aus."""
    m = Modell("roland", sichtbreite=4, sichthoehe=4)
    r = Ruestung()
    k = r.kasten

    wurzel = m.knoch("wurzel", [0, 0, 0])
    huefte = m.knoch("huefte", [0, 12, 0], "wurzel")
    k(huefte, [-5, 10, -3], [10, 3, 6], "stahl_d")
    k(huefte, [-5.5, 11.5, -3.5], [11, 2, 7], "guertel")

    # Beine: Schiene, Kniebuckel, Schuh aus Platten, ein Beintaschen-Rock oben.
    for seite, name in ((-1, "rechtes_bein"), (1, "linkes_bein")):
        x0 = -5 if seite < 0 else 0
        b = m.knoch(name, [2.5 * seite, 12, 0], "huefte")
        k(b, [x0, 0, -2.5], [5, 12, 5], "bein")
        k(b, [x0 - 0.5, 8, -3], [6, 4, 6], "platte", aufblasen=0.1)           # Beintasche
        k(b, [x0 - 0.25, 4.5, -3.25], [5.5, 2, 1], "platte_rand")               # Kniebuckel
        k(b, [x0 - 0.5, 0, -3.5], [6, 2, 6], "stahl")                          # Schuh
        k(b, [x0 + 0.5, 0, -4.5], [4, 1, 1], "stahl")                          # Schuhspitze

    wrock = m.knoch("wappenrock", [0, 11, -3.3], "huefte")
    k(wrock, [-3.5, 2, -3.6], [7, 9, 0], "wappenrock")

    koerper = m.knoch("koerper", [0, 13, 0], "huefte")
    k(koerper, [-5, 13, -3], [10, 11, 6], "rock")
    k(koerper, [-4.5, 22.5, -3.5], [9, 2, 7], "halsberge")
    k(koerper, [-3.5, 15, -3.5], [7, 7, 1], "brustplatte")

    umhang = m.knoch("umhang", [0, 24, 3.2], "koerper")
    k(umhang, [-6, 13, 3.1], [12, 11, 1], "umhang")
    umhang2 = m.knoch("umhang_unten", [0, 13, 3.6], "umhang")
    k(umhang2, [-6, 1.5, 3.1], [12, 12, 1], "umhang")

    kopf = m.knoch("kopf", [0, 24, 0], "koerper")
    k(kopf, [-4, 24, -4], [8, 8, 8], "helm")
    k(kopf, [-3.5, 24.5, -4.75], [7, 4, 1], "visier")
    k(kopf, [-4.5, 31, -4.5], [9, 1, 9], "krone")
    for x, z in ((-4.5, -4.5), (3.5, -4.5), (-4.5, 3.5), (3.5, 3.5), (-0.5, -4.5)):
        k(kopf, [x, 32, z], [1, 1, 1], "krone_zacke")
    k(kopf, [-0.5, 32, -3.5], [1, 1, 7], "helmkamm")
    busch = m.knoch("busch", [0, 33, 1], "kopf")
    k(busch, [-1, 33, -2], [2, 3, 4], "busch")
    k(busch, [-1.5, 34, 1], [3, 3, 3], "busch")
    k(busch, [-1.5, 32, 3.5], [3, 4, 2], "busch")
    k(busch, [-1, 28, 5], [2, 5, 2], "busch")
    k(busch, [-0.5, 25, 5.5], [1, 3, 1], "busch")

    for seite, name in ((-1, "rechter_arm"), (1, "linker_arm")):
        x0 = -10 if seite < 0 else 5
        a = m.knoch(name, [7.5 * seite, 22, 0], "koerper")
        k(a, [x0, 12, -2.5], [5, 11, 5], "arm")
        k(a, [x0 - 0.5, 10, -3], [6, 4, 6], "handschuh")
        k(a, [x0 - 0.25, 15.5, -3.25], [5.5, 2, 6.5], "platte_rand")         # Ellbogen
        sch = m.knoch(name.replace("arm", "schulter"), [7.5 * seite, 23, 0], name)
        xs = -11.5 if seite < 0 else 4.5
        k(sch, [xs, 20, -3.5], [7, 5, 7], "schulter")
        k(sch, [xs + (0 if seite < 0 else 1), 18, -3], [6, 2, 6], "schulter")
        k(sch, [xs + (1 if seite < 0 else 2), 25, -3], [4, 1, 6], "platte_rand")
        if seite < 0:
            m.knoch("rechte_hand", HAND, name)
        else:
            # Der Schild sitzt vor dem Unterarm, die Schauseite nach vorn.
            # Hebt der Arm sich, dreht der Schildknochen gegen, damit die
            # Seite mit dem Stern vorn bleibt. Ein Dreieckschild aus Stufen
            # wie der Helmbusch: eine Treppe sieht ruhiger aus als eine
            # Schraege.
            s = m.knoch("schild", [7.5, 10, -3], name)
            k(s, [2.5, 9, -4.6], [10, 10, 1], "schild")
            k(s, [3.5, 6, -4.6], [8, 3, 1], "schild")
            k(s, [4.5, 4, -4.6], [6, 2, 1], "schild")
            k(s, [5.5, 2, -4.6], [4, 2, 1], "schild")
            k(s, [6.5, 1, -4.6], [2, 1, 1], "schild")
    return m, r


# ============================================================ Malen

STAHL = "#b0b9c6"
STAHL_D = "#6c7688"
GOLD = (226, 186, 78)
GOLD_D = (164, 120, 38)
BLAU = "#2b48a4"
BLAU_D = "#1d3175"
PURPUR = "#7c1f30"       # Futter des Umhangs
# Leuchtendes Blau. Phase eins nur in Augen und Saphiren, Phase zwei
# ueberall, wo der Orden seine Magie traegt: Borten, Runen, Federbusch.
GLUT_1 = (120, 180, 255, 254)
GLUT_2 = (150, 214, 255, 254)

# Ein Kompassstern, 7 mal 7 - das Zeichen des Sternenpakets, auf Brust,
# Schild, Umhang und Bossbar. Vier lange Strahlen statt acht kurzer: Bei
# sieben Pixeln zerfaellt ein Achtzack in Punkte, der Kompassstern bleibt
# ein Stern. In der Mitte ein Saphir (o), der in Phase zwei glueht.
STERN = [
    "...x...",
    "...x...",
    "..xxx..",
    "xxxoxxx",
    "..xxx..",
    "...x...",
    "...x...",
]


def randabstand(p, n, grenzen):
    """Wie weit ist der Punkt vom Rand seiner Seite entfernt (in Pixeln)?"""
    lo, hi = grenzen
    achse = max(range(3), key=lambda i: abs(n[i]))
    return min(min(p[i] - lo[i], hi[i] - p[i]) for i in range(3) if i != achse)


def stern_bei(u, v, mu, mv, gross=1):
    """Liegt (u, v) auf dem Stern mit Mitte (mu, mv)? gross: Pixel je
    Sternpunkt. Gibt 'x', 'o' oder None."""
    i = int(math.floor((u - mu) / gross + 3.5))
    j = int(math.floor((v - mv) / gross + 3.5))
    if 0 <= i < 7 and 0 <= j < 7 and STERN[j][i] != ".":
        return STERN[j][i]
    return None


def stahl(p, n, texel, saat, grund=STAHL, hell=0.0):
    # Poliert: Licht von oben und vorn, dazu ruhige Flecken, keine Kratzer.
    licht = 0.10 if n[1] > 0.5 else (0.04 if n[2] < -0.5 else (-0.12 if n[1] < -0.5 else 0.0))
    return tm_ton(grund, p, n, texel, saat, hell=licht + hell, wolke=0.07)


def tm_ton(*a, **k):
    from tiere_gestalt import ton
    return ton(*a, **k)


def gold(p, n, saat=0):
    f = 1.0 + (0.08 if n[1] > 0.5 else (-0.1 if n[1] < -0.5 else 0.0))
    f += 0.05 * (streu(p[0] // 1, p[1] // 1, p[2] // 1, saat) - 0.5)
    return tuple(max(0, min(255, int(c * f))) for c in GOLD)


def maler(r, phase):
    glut = GLUT_1 if phase == 1 else GLUT_2

    def male(stoff_name, p, n, texel):
        stoff = stoff_name.split("|")[0]
        g = r.grenzen[stoff_name]
        rand = randabstand(p, n, g)
        vorn = n[2] < -0.5
        hinten = n[2] > 0.5
        if stoff in ("stahl", "helm"):
            if stoff == "helm" and vorn:
                # Sehschlitz mit zwei blauen Augen, darunter Atemloecher.
                if 28 <= p[1] < 29.2:
                    if 1.0 <= abs(p[0]) < 2.6:
                        return glut
                    return (26, 30, 40)
                if 25.5 <= p[1] < 27 and p[0] > 0.5 and int(p[0] * 2) % 2 == 0 and int(p[1] * 2) % 2 == 0:
                    return (40, 44, 56)
            return stahl(p, n, texel, 301)
        if stoff == "visier":
            # Der Sehschlitz liegt im vorgezogenen Visier: dort die Augen.
            if 27.6 <= p[1] < 28.6 and vorn:
                if 1.0 <= abs(p[0]) < 2.6:
                    return glut
                return (26, 30, 40)
            return stahl(p, n, texel, 302, hell=0.06)
        if stoff == "stahl_d":
            return stahl(p, n, texel, 303, grund=STAHL_D)
        lo, hi = g
        if stoff == "halsberge":
            # Nur die Oberkante golden - Gold ist Schmuck, nicht Ruestung.
            if hi[1] - p[1] < 0.6 and n[1] < 0.5:
                return gold(p, n, 304)
            return stahl(p, n, texel, 305, hell=0.04)
        if stoff == "platte_rand":
            # Knie, Ellbogen, Schulterkamm: Stahl mit einer goldenen Niete.
            mitte = [(lo[i] + hi[i]) / 2 for i in range(3)]
            if (vorn or n[0] != 0) and abs(p[1] - mitte[1]) < 0.6 and (
                    abs(p[0] - mitte[0]) < 0.6 if vorn else abs(p[2] - mitte[2]) < 0.6):
                return gold(p, n, 304)
            return stahl(p, n, texel, 305, hell=0.08)
        if stoff == "platte":
            return stahl(p, n, texel, 305, hell=0.04)
        if stoff == "schulter":
            # Goldkante nur unten, wo die Platte ueber dem Arm endet.
            if p[1] - lo[1] < 0.8 and n[1] > -0.5:
                return glut if phase == 2 else gold(p, n, 306)
            # In Phase zwei brennt auf der Aussenseite eine Rune: der Stern.
            if phase == 2 and abs(n[0]) > 0.5 and hi[1] - lo[1] > 4:
                if stern_bei(p[2], -p[1], (lo[2] + hi[2]) / 2, -(lo[1] + hi[1]) / 2 - 0.5, gross=0.8):
                    return glut
            return stahl(p, n, texel, 307, hell=0.06)
        if stoff == "bein":
            if p[1] > 8:
                return stahl(p, n, texel, 308, grund=STAHL_D)
            return stahl(p, n, texel, 309)
        if stoff == "arm":
            return stahl(p, n, texel, 310, grund=STAHL_D)
        if stoff == "handschuh":
            # Goldene Knoechel vorn, sonst dunkler Stahl.
            if vorn and p[1] < 11.5:
                return gold(p, n, 311)
            return stahl(p, n, texel, 312, grund="#8a94a4")
        if stoff == "guertel":
            if vorn and abs(p[0]) < 1.5:
                return gold(p, n, 313)
            return tm_ton("#5a3a24", p, n, texel, 314, wolke=0.05)
        if stoff == "rock":
            if n[1] > 0.5:
                return stahl(p, n, texel, 315)
            # Der Wappenrock ueber der Brust: blau, vorn und hinten der Stern.
            if vorn:
                s = stern_bei(p[0], -p[1], 0, -18.5)
                if s:
                    return glut if s == "o" else gold(p, n, 316)
            if p[1] < 14 and rand < 1:
                return gold(p, n, 317)
            return tm_ton(BLAU, p, n, texel, 318, wolke=0.06)
        if stoff == "brustplatte":
            if vorn:
                s = stern_bei(p[0], -p[1], 0, -18.5)
                if s:
                    return glut if s == "o" else gold(p, n, 316)
                return tm_ton(BLAU, p, n, texel, 318, wolke=0.06)
            return tm_ton(BLAU_D, p, n, texel, 320)
        if stoff == "wappenrock":
            if p[1] < 3:
                return gold(p, n, 321)
            if abs(p[0]) > 2.5:
                return tm_ton(BLAU_D, p, n, texel, 322)
            return tm_ton(BLAU, p, n, texel, 323)
        if stoff == "umhang":
            innen = n[2] < -0.5
            aussen = n[2] > 0.5
            lo, hi = g
            # Goldborte an den Seiten und unten, in Phase zwei gluehend.
            seitlich = min(p[0] - lo[0], hi[0] - p[0]) < 1
            unten = p[1] - 1.5 < 1
            unten = unten and stoff_name in r.umhang_unten
            if not innen and (seitlich or unten):
                return glut if phase == 2 else gold(p, n, 324)
            if innen:
                return tm_ton(PURPUR, p, n, texel, 325, wolke=0.05)
            if aussen and stoff_name in r.umhang_oben:
                # Auf dem Ruecken der Stern, doppelt gross.
                s = stern_bei(p[0], -p[1], 0, -17.5, gross=2)
                if s:
                    return glut if s == "o" else gold(p, n, 338)
            return tm_ton(BLAU_D, p, n, texel, 326, wolke=0.07)
        if stoff == "krone":
            return gold(p, n, 327)
        if stoff == "krone_zacke":
            if vorn and abs(p[0]) < 0.6:
                return glut
            return gold(p, n, 328)
        if stoff == "helmkamm":
            return gold(p, n, 329)
        if stoff == "busch":
            t = max(0.0, min(1.0, (p[2] - 0) / 7 + (30 - p[1]) / 10))
            if phase == 2 and t > 0.55:
                return glut
            farbe = mische(hexfarbe("#f2f5fc"), hexfarbe("#3a64d8"), t)
            return tm_ton("#%02x%02x%02x" % farbe, p, n, texel, 330, wolke=0.05)
        if stoff == "schild":
            lo, hi = g
            aussen = n[2] < -0.5
            if aussen:
                # Blau mit Goldrand und dem Stern.
                am_rand = (p[0] - lo[0] < 1 or hi[0] - p[0] < 1 or
                           (stoff_name == r.schild_oben and hi[1] - p[1] < 1))
                if am_rand or stoff_name in r.schild_spitze:
                    return gold(p, n, 331)
                s = stern_bei(p[0], -p[1], 7.5, -13.5, gross=1)
                if s:
                    return glut if (s == "o") else gold(p, n, 332)
                return tm_ton(BLAU, p, n, texel, 333, wolke=0.07)
            if n[2] > 0.5:
                # Innen Holz mit einem Lederriemen fuer den Arm.
                if 11 <= p[1] < 13:
                    return tm_ton("#4a2e1c", p, n, texel, 334)
                return tm_ton("#7a5534", p, n, texel, 335, wolke=0.05)
            return gold(p, n, 336)
        return (255, 0, 255)
    return male


def haeute(m, r):
    """Beide Haeute auf demselben Texturfeld: Phase eins und zwei."""
    r.umhang_oben = {s for s in r.grenzen if s.startswith("umhang") and r.grenzen[s][0][1] > 12}
    r.umhang_unten = {s for s in r.grenzen if s.startswith("umhang") and r.grenzen[s][0][1] < 12}
    schilde = [s for s in r.grenzen if s.startswith("schild|")]
    r.schild_oben = max(schilde, key=lambda s: r.grenzen[s][1][1])
    r.schild_spitze = {min(schilde, key=lambda s: r.grenzen[s][0][1])}
    return m.male(maler(r, 1)), m.male(maler(r, 2))


# ============================================================ Zusammenbau

def mit_durendal(geo_roland, bild_roland, bild2_roland, geo_klinge, bild_klinge):
    """Haengt Durendal an die rechte Hand: zwei Knochen um die Faust -
    der erste legt die Klinge nach vorn, der zweite dreht ihre flache Seite
    nach aussen. Die Kaesten werden so verschoben, dass die Griffmitte
    genau in der Faust liegt; gemessen an den Farben des Griffs."""
    g = json.loads(json.dumps(geo_roland["minecraft:geometry"][0]))
    griff_farben = {DURENDAL["farben"][z] for z in DURENDAL["griff"]}
    kaesten = [c for b in geo_klinge["bones"] for c in b.get("cubes", [])]
    punkte = []
    for c in kaesten:
        u, v = c["uv"]["north"]["uv"]
        if bild_klinge.getpixel((int(u), int(v)))[:3] in griff_farben:
            punkte.append([c["origin"][i] + c["size"][i] / 2 for i in range(3)])
    mitte = [sum(p[i] for p in punkte) / len(punkte) for i in range(3)]
    versatz = [HAND[i] - mitte[i] for i in range(3)]
    unten = bild_roland.height
    neu = []
    for c in kaesten:
        c = json.loads(json.dumps(c))
        c["origin"] = [c["origin"][i] + versatz[i] for i in range(3)]
        if "pivot" in c:
            c["pivot"] = [c["pivot"][i] + versatz[i] for i in range(3)]
        for f in c["uv"].values():
            f["uv"] = [f["uv"][0], f["uv"][1] + unten]
        neu.append(c)
    g["bones"].append({"name": "durendal", "parent": "rechte_hand", "pivot": HAND, "rotation": [90, 0, 0]})
    g["bones"].append({"name": "durendal_klinge", "parent": "durendal", "pivot": HAND,
                       "rotation": [0, 90, 0], "cubes": neu})
    breite = max(bild_roland.width, bild_klinge.width)
    bilder = []
    for phase, grund in ((1, bild_roland), (2, bild2_roland)):
        b = Image.new("RGBA", (breite, unten + bild_klinge.height), (0, 0, 0, 0))
        b.paste(grund, (0, 0))
        klinge = bild_klinge.copy()
        # Runen und Saphir gluehen - in Phase zwei mehr.
        leuchtend = {DURENDAL["farben"][z] for z in DURENDAL_GLUT[phase]}
        for y in range(klinge.height):
            for x in range(klinge.width):
                f = klinge.getpixel((x, y))
                if f[3] and f[:3] in leuchtend:
                    klinge.putpixel((x, y), f[:3] + (254,))
        b.paste(klinge, (0, unten))
        bilder.append(b)
    hoehe = 16
    while hoehe < bilder[0].height:
        hoehe *= 2
    bilder = [b.crop((0, 0, breite, hoehe)) for b in bilder]
    g["description"] = dict(g["description"], texture_width=breite, texture_height=hoehe)
    return {"format_version": "1.12.0", "minecraft:geometry": [g]}, bilder


def bauen():
    m, r = gestalt()
    geo = m.geometrie()
    haut1, haut2 = haeute(m, r)
    with tempfile.TemporaryDirectory() as ordner:
        klinge_geo, klinge_bild = durendal_modell(ordner)
    geo, (haut1, haut2) = mit_durendal(geo, haut1, haut2, klinge_geo, klinge_bild)
    return geo, haut1, haut2


def vorschau(ordner, geo, haut1, haut2):
    """Roland in seiner Fechterhaltung, beide Phasen, vorn und hinten."""
    from PIL import ImageDraw
    import roland_bewegung as rb
    zellen = []
    for haut, titel in ((haut1, "Phase 1"), (haut2, "Phase 2 - entfesselt")):
        for gier in (25, 160):
            b = tm.ansehen(geo, haut, [(rb.haltung(), 1.0)], {}, gier=gier, neigung=6, breite=360, hoehe=460,
                           zoom=9.5, mitte=(0, 18.5, 0))
            zellen.append((b, f"{titel}, {'vorn' if gier < 90 else 'hinten'}"))
    gesamt = Image.new("RGBA", (4 * 360, 480), (244, 245, 248, 255))
    zeichner = ImageDraw.Draw(gesamt)
    for i, (b, text) in enumerate(zellen):
        gesamt.paste(b, (i * 360, 0))
        zeichner.text((i * 360 + 10, 462), text, fill=(20, 20, 30, 255))
    Path(ordner).mkdir(parents=True, exist_ok=True)
    gesamt.save(Path(ordner) / "roland.png")
    print("gezeichnet:", Path(ordner) / "roland.png")


# ============================================================ Im Spiel

def aussehen():
    """Die Client-Datei: Modell, zwei Haeute (die Phase waehlt), alle
    Bewegungen ueber die Steuerung, ein Fuenftel groesser als ein Ritter."""
    import roland_bewegung as rb
    anims = {k[len(rb.PRAEFIX):]: k for k in rb.alle_animationen()}
    anims["kampf"] = "controller.animation.fynn.roland.kampf"
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": "fynn:roland",
        # Leuchtende Pixel (Alpha 254): Augen, Saphire, in Phase zwei die
        # Borten und Runen.
        "materials": {"default": "entity_emissive_alpha"},
        "textures": {"default": "textures/entity/roland", "entfesselt": "textures/entity/roland_entfesselt"},
        "geometry": {"default": "geometry.fynn.roland"},
        "animations": anims,
        "scripts": {
            "scale": "1.2",
            "initialize": ["variable.hieb = 0;"],
            "animate": ["kampf"],
        },
        "render_controllers": ["controller.render.fynn.roland"],
        "spawn_egg": {"base_color": "#2b48a4", "overlay_color": "#e2ba4e"},
    }}}


def steuerplan():
    return {"format_version": "1.8.0", "render_controllers": {"controller.render.fynn.roland": {
        "arrays": {"textures": {"Array.haut": ["Texture.default", "Texture.entfesselt"]}},
        "geometry": "Geometry.default",
        "materials": [{"*": "Material.default"}],
        "textures": ["Array.haut[query.property('fynn:phase') - 1]"],
    }}}


# ------------------------------------------------------------ Partikel

FUNKE = [
    "...w....",
    "...b....",
    ".bbwbb..",
    "wwwWwww.",
    ".bbwbb..",
    "...b....",
    "...w....",
    "........",
]
KLINGE_LICHT = ["." * 3 + "w" + "." * 4] + ["..bwwb.." for _ in range(24)] + [
    "gggwwggg", ".gggggg.", "...bb...", "...bb...", "...bb...", "..gggg..", "...gg..."]


def zeichen_bild():
    """Das Zeichen am Boden, wo gleich eine Klinge aus Licht einschlaegt:
    ein Ring mit dem Kompassstern, 32 mal 32."""
    b = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    for y in range(32):
        for x in range(32):
            dx, dy = x - 15.5, y - 15.5
            r = math.hypot(dx, dy)
            if 13 <= r < 15:
                b.putpixel((x, y), (140, 200, 255, 255))
            elif 10.5 <= r < 11.5 and (int(math.degrees(math.atan2(dy, dx)) // 15) % 2 == 0):
                b.putpixel((x, y), (90, 150, 255, 200))
            s = stern_bei(dx + 0.5, dy + 0.5, 0, 0, gross=3)
            if s:
                b.putpixel((x, y), (220, 240, 255, 255) if s == "o" else (110, 176, 255, 230))
    return b


def karte_bild(karte, farben):
    b = Image.new("RGBA", (len(karte[0]), len(karte)), (0, 0, 0, 0))
    for y, zeile in enumerate(karte):
        for x, z in enumerate(zeile):
            if z != ".":
                b.putpixel((x, y), farben[z])
    return b


def partikel(name, textur, groesse_tex, teile):
    return {"format_version": "1.10.0", "particle_effect": {
        "description": {"identifier": f"fynn:{name}", "basic_render_parameters": {
            "material": "particles_blend", "texture": f"textures/particle/{textur}"}},
        "components": teile}}


def alle_partikel():
    """Die Magie des Ordens ist blau. Alles faellt oder verblasst sanft -
    kein Partikel bleibt stehen."""
    ausblenden = {"minecraft:particle_appearance_tinting": {"color": [1, 1, 1, "1 - v.particle_age / v.particle_lifetime"]}}

    def funke_uv(groesse):
        return {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}

    p = {}
    p["saphirfunken"] = partikel("saphirfunken", "fynn_saphirfunke", 8, {
        "minecraft:emitter_rate_instant": {"num_particles": 14},
        "minecraft:emitter_lifetime_once": {"active_time": 0.1},
        "minecraft:emitter_shape_sphere": {"radius": 0.3, "direction": "outwards"},
        "minecraft:particle_lifetime_expression": {"max_lifetime": "0.4 + math.random(0, 0.4)"},
        "minecraft:particle_initial_speed": "math.random(2, 5)",
        "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -3, 0], "linear_drag_coefficient": 3},
        "minecraft:particle_appearance_billboard": {
            "size": ["0.14 * (1 - v.particle_age / v.particle_lifetime)",
                     "0.14 * (1 - v.particle_age / v.particle_lifetime)"],
            "facing_camera_mode": "rotate_xyz", "uv": funke_uv(8)},
        **ausblenden})
    p["saphirwelle"] = partikel("saphirwelle", "fynn_saphirfunke", 8, {
        "minecraft:emitter_rate_instant": {"num_particles": 40},
        "minecraft:emitter_lifetime_once": {"active_time": 0.1},
        "minecraft:emitter_shape_disc": {"radius": 0.4, "plane_normal": [0, 1, 0], "direction": "outwards"},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.55},
        "minecraft:particle_initial_speed": 9,
        "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 3.5},
        "minecraft:particle_appearance_billboard": {"size": [0.2, 0.2], "facing_camera_mode": "rotate_xyz",
                                                    "uv": funke_uv(8)},
        **ausblenden})
    p["saphiraura"] = partikel("saphiraura", "fynn_saphirfunke", 8, {
        "minecraft:emitter_rate_instant": {"num_particles": 5},
        "minecraft:emitter_lifetime_once": {"active_time": 0.1},
        "minecraft:emitter_shape_box": {"half_dimensions": [0.7, 1.2, 0.7], "direction": [0, 1, 0]},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 1.2},
        "minecraft:particle_initial_speed": 0.8,
        "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 0.5},
        "minecraft:particle_appearance_billboard": {"size": [0.09, 0.09], "facing_camera_mode": "rotate_xyz",
                                                    "uv": funke_uv(8)},
        **ausblenden})
    p["ordenslicht"] = partikel("ordenslicht", "fynn_saphirfunke", 8, {
        "minecraft:emitter_rate_steady": {"spawn_rate": 60, "max_particles": 60},
        "minecraft:emitter_lifetime_once": {"active_time": 0.8},
        "minecraft:emitter_shape_disc": {"radius": 0.7, "plane_normal": [0, 1, 0], "direction": [0, 1, 0]},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 1.0},
        "minecraft:particle_initial_speed": "math.random(3, 6)",
        "minecraft:particle_motion_dynamic": {"linear_drag_coefficient": 1.5},
        "minecraft:particle_appearance_billboard": {"size": [0.16, 0.16], "facing_camera_mode": "rotate_xyz",
                                                    "uv": funke_uv(8)},
        **ausblenden})
    p["sternenzeichen"] = partikel("sternenzeichen", "fynn_sternenzeichen", 32, {
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        "minecraft:emitter_lifetime_once": {"active_time": 0.05},
        "minecraft:emitter_shape_point": {"offset": [0, 0.08, 0]},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.95},
        "minecraft:particle_initial_spin": {"rotation": 0, "rotation_rate": 90},
        "minecraft:particle_appearance_billboard": {
            "size": ["0.9 + v.particle_age * 0.2", "0.9 + v.particle_age * 0.2"],
            "facing_camera_mode": "emitter_transform_xz",
            "uv": {"texture_width": 32, "texture_height": 32, "uv": [0, 0], "uv_size": [32, 32]}},
        "minecraft:particle_appearance_tinting": {"color": [1, 1, 1, "math.min(1, v.particle_age * 4)"]}})
    p["sternenklinge"] = partikel("sternenklinge", "fynn_sternenklinge", 32, {
        "minecraft:emitter_rate_instant": {"num_particles": 1},
        "minecraft:emitter_lifetime_once": {"active_time": 0.05},
        "minecraft:emitter_shape_point": {"offset": [0, 6.5, 0], "direction": [0, -1, 0]},
        "minecraft:particle_lifetime_expression": {"max_lifetime": 0.24},
        "minecraft:particle_initial_speed": 26,
        "minecraft:particle_appearance_billboard": {
            "size": [0.28, 1.1], "facing_camera_mode": "lookat_y",
            "uv": {"texture_width": 8, "texture_height": 32, "uv": [0, 0], "uv_size": [8, 32]}}})
    return p


def partikel_bilder():
    blau = {"w": (240, 248, 255, 255), "W": (255, 255, 255, 255), "b": (110, 176, 255, 255),
            "g": (240, 206, 110, 255)}
    return {
        "fynn_saphirfunke": karte_bild(FUNKE, blau),
        "fynn_sternenklinge": karte_bild(list(reversed(KLINGE_LICHT)), blau),
        "fynn_sternenzeichen": zeichen_bild(),
    }


# ============================================================ Verhalten

# Leben und Schaden je Zahl der Spieler, die beim Auftritt in der Naehe
# sind. Fynn: "wenn mehrere Spieler online sind ... dass der Boss dann
# staerker ist, mehr Leben hat." Jeder weitere Spieler: halb so viel Leben
# mehr, ein Siebtel mehr Schaden. Ab sechs Spielern waechst er nicht mehr.
# Das Leben gilt je Phase - ist Phase eins leer, laedt er sich wieder voll
# auf (roland.js).
GRUNDLEBEN = 240
GRUNDSCHADEN = 9
MEHR_SPIELER = 6


def staerke(anzahl):
    n = max(1, min(MEHR_SPIELER, anzahl))
    return round(GRUNDLEBEN * (1 + 0.5 * (n - 1))), round(GRUNDSCHADEN * (1 + 0.15 * (n - 1)), 1)


# Unter dieser Grenze nimmt Roland keinen Schaden mehr: Das Kampfskript
# zeigt die Leiste leer und startet in Phase eins den Wechsel (er laedt sich
# auf), in Phase zwei den Abschied mit der Beute - er faellt nie einfach um. Hoeher als der staerkste Schlag
# eines Spielers, damit kein Treffer ueber die Grenze hinweg toetet.
LETZTE_KRAFT = 30

# Die Beute. Der Sieger bekommt alles; jeder weitere Spieler, der mit-
# gekaempft hat, bekommt seinen eigenen Anteil (das Skript legt ihn ab).
BEUTE = [
    # (Gegenstand, von, bis, Chance)
    ("fynn:durendal", 1, 1, 1.0),
    ("fynn:olifant", 1, 1, 1.0),
    ("minecraft:diamond", 3, 5, 1.0),
    ("minecraft:gold_ingot", 4, 8, 1.0),
    ("minecraft:iron_ingot", 6, 12, 1.0),
    ("fynn:stahlbarren", 3, 5, 1.0),
    ("minecraft:emerald", 2, 4, 1.0),
    ("minecraft:golden_apple", 1, 2, 1.0),
    ("minecraft:experience_bottle", 4, 8, 1.0),
    ("minecraft:enchanted_golden_apple", 1, 1, 0.15),
    ("fynn:saphirschwert", 1, 1, 0.35),
]
ANTEIL = [
    ("minecraft:diamond", 2, 3, 1.0),
    ("minecraft:gold_ingot", 2, 4, 1.0),
    ("minecraft:golden_apple", 1, 1, 1.0),
    ("minecraft:experience_bottle", 2, 4, 1.0),
    ("fynn:saphirschwert", 1, 1, 0.5),
]


def beutetabelle():
    """Fuer den Fall, dass Roland doch einmal richtig stirbt (/kill, Leere):
    dann faellt dieselbe Beute aus der Tabelle."""
    toepfe = []
    for name, lo, hi, chance in BEUTE:
        t = {"rolls": 1, "entries": [{"type": "item", "name": name, "weight": 1,
                                      "functions": [{"function": "set_count", "count": {"min": lo, "max": hi}}]}]}
        if chance < 1:
            t["conditions"] = [{"condition": "random_chance", "chance": chance}]
        toepfe.append(t)
    return {"pools": toepfe}


def verhalten():
    spieler = {"all_of": [{"test": "is_family", "subject": "other", "value": "player"},
                          {"test": "has_ability", "subject": "other", "value": "instabuild", "operator": "!="}]}
    gruppen = {
        # Der gewoehnliche Nahkampf. Waehrend eines Spezialangriffs nimmt
        # das Skript ihn weg, damit nicht mitten im Wirbel zugeschlagen wird.
        "fynn:nahkampf": {
            "minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.15, "track_target": True},
        },
        # Verwundbar - aber unter LETZTE_KRAFT nicht mehr (siehe oben), nicht
        # durch Sturz, nicht durch die eigenen Ritter.
        "fynn:verwundbar": {"minecraft:damage_sensor": {"triggers": [
            {"cause": "fall", "deals_damage": "no"},
            {"on_damage": {"filters": {"test": "is_family", "subject": "other", "value": "ritter"}},
             "deals_damage": "no"},
            {"on_damage": {"filters": {"test": "actor_health", "subject": "self", "operator": "<=",
                                       "value": LETZTE_KRAFT}}, "deals_damage": "no"},
        ]}},
        # Auftritt, Phasenwechsel, Abschied: nichts trifft.
        "fynn:unverwundbar": {"minecraft:damage_sensor": {"triggers": [{"cause": "all", "deals_damage": "no"}]}},
        "fynn:entfesselt": {"minecraft:movement": {"value": 0.3}},
        # Nach dem Auftritt kaempft er - auch dann, wenn das Kampfskript
        # einmal nicht laeuft: Dann macht die Uhr ihn verwundbar.
        "fynn:auftritt": {"minecraft:timer": {"time": 3.4, "looping": False,
                                              "time_down_event": {"event": "fynn:auftritt_fertig"}}},
    }
    for n in range(1, MEHR_SPIELER + 1):
        leben, schaden = staerke(n)
        gruppen[f"fynn:staerke_{n}"] = {"minecraft:health": {"value": leben, "max": leben},
                                        "minecraft:attack": {"damage": schaden}}
    ereignisse = {
        "minecraft:entity_spawned": {"add": {"component_groups": ["fynn:unverwundbar", "fynn:staerke_1",
                                                                  "fynn:auftritt"]}},
        "fynn:auftritt_fertig": {"remove": {"component_groups": ["fynn:auftritt", "fynn:unverwundbar"]},
                                 "add": {"component_groups": ["fynn:verwundbar", "fynn:nahkampf"]}},
        "fynn:angriff_beginn": {"remove": {"component_groups": ["fynn:nahkampf"]}},
        "fynn:angriff_ende": {"add": {"component_groups": ["fynn:nahkampf"]}},
        "fynn:schutz_an": {"remove": {"component_groups": ["fynn:verwundbar"]},
                           "add": {"component_groups": ["fynn:unverwundbar"]}},
        "fynn:schutz_aus": {"remove": {"component_groups": ["fynn:unverwundbar"]},
                            "add": {"component_groups": ["fynn:verwundbar"]}},
        "fynn:entfesseln": {"add": {"component_groups": ["fynn:entfesselt"]}},
    }
    for n in range(1, MEHR_SPIELER + 1):
        andere = [f"fynn:staerke_{m}" for m in range(1, MEHR_SPIELER + 1) if m != n]
        ereignisse[f"fynn:staerke_{n}"] = {"remove": {"component_groups": andere},
                                           "add": {"component_groups": [f"fynn:staerke_{n}"]}}
    leben, schaden = staerke(1)
    teile = {
        "minecraft:type_family": {"family": ["roland", "ritter", "monster", "mob"]},
        "minecraft:boss": {"hud_range": 48, "should_darken_sky": False},
        "minecraft:collision_box": {"width": 1.1, "height": 2.5},
        "minecraft:health": {"value": leben, "max": leben},
        "minecraft:attack": {"damage": schaden},
        "minecraft:movement": {"value": 0.26},
        "minecraft:movement.basic": {},
        "minecraft:navigation.walk": {"can_path_over_water": False, "avoid_water": True, "can_open_doors": False,
                                      "avoid_damage_blocks": True},
        "minecraft:jump.static": {},
        "minecraft:can_climb": {},
        "minecraft:variable_max_auto_step": {"base_value": 1.0625, "jump_prevented_value": 1.0625},
        "minecraft:physics": {},
        "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": True},
        "minecraft:knockback_resistance": {"value": 0.85},
        "minecraft:fire_immune": True,
        "minecraft:breathable": {"breathes_water": True},
        "minecraft:persistent": {},
        "minecraft:nameable": {},
        "minecraft:follow_range": {"value": 48, "max": 48},
        "minecraft:experience_reward": {"on_death": "query.last_hit_by_player ? 120 : 0"},
        "minecraft:loot": {"table": "loot_tables/entities/roland.json"},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.hurt_by_target": {"priority": 1},
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 2, "must_see": False, "reselect_targets": True, "within_radius": 32,
            "entity_types": [{"filters": spieler, "max_dist": 32}]},
        "minecraft:behavior.look_at_player": {"priority": 6, "look_distance": 12.0, "probability": 0.05},
        "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 0.7},
        "minecraft:behavior.random_look_around": {"priority": 8},
    }
    return {"format_version": "1.21.90", "minecraft:entity": {
        "description": {"identifier": "fynn:roland", "is_spawnable": True, "is_summonable": True,
                        "properties": {
                            "fynn:phase": {"type": "int", "range": [1, 2], "default": 1, "client_sync": True},
                            "fynn:angriff": {"type": "int", "range": [0, 11], "default": 0, "client_sync": True},
                        }},
        "component_groups": gruppen, "components": teile, "events": ereignisse}}


def skriptdaten():
    leben = {n: staerke(n)[0] for n in range(1, MEHR_SPIELER + 1)}
    return ("// Erzeugt von werkzeuge/roland_bauen.py - nicht von Hand aendern.\n"
            f"export const LEBEN = {json.dumps(leben)};\n"
            f"export const MEHR_SPIELER = {MEHR_SPIELER};\n"
            f"export const LETZTE_KRAFT = {LETZTE_KRAFT};\n"
            f"export const BEUTE = {json.dumps(BEUTE)};\n"
            f"export const ANTEIL = {json.dumps(ANTEIL)};\n")


def main():
    geo, haut1, haut2 = bauen()
    schreibe(RES / "models" / "entity" / "roland.geo.json", geo)
    haut1.save(RES / "textures" / "entity" / "roland.png")
    haut2.save(RES / "textures" / "entity" / "roland_entfesselt.png")
    schreibe(RES / "entity" / "roland.entity.json", aussehen())
    schreibe(RES / "render_controllers" / "roland.render_controllers.json", steuerplan())
    for name, daten in alle_partikel().items():
        schreibe(RES / "particles" / f"roland_{name}.particle.json", daten)
    schreibe(VER / "entities" / "roland.json", verhalten())
    schreibe(VER / "loot_tables" / "entities" / "roland.json", beutetabelle())
    (VER / "scripts" / "roland_werte.js").write_text(skriptdaten(), encoding="utf-8")
    for name, bild in partikel_bilder().items():
        bild.save(RES / "textures" / "particle" / f"{name}.png")
    print("gebaut: Roland", geo["minecraft:geometry"][0]["description"]["texture_width"], "x",
          geo["minecraft:geometry"][0]["description"]["texture_height"])
    if "--bilder" in sys.argv:
        vorschau(Path(sys.argv[sys.argv.index("--bilder") + 1]), geo, haut1, haut2)


if __name__ == "__main__":
    main()
