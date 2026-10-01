#!/usr/bin/env python3
"""Der vierte Boss: Aschvaru, der Seelendrache.

Fynn: "Wir brauchen auch noch eine neue Art vom Drachen, der Seelendrache
... Das soll ein Boss sein ... Boss-Bar ... ein weisser Drache ... Recht
weiss, recht gross, ein Kopf ... Seelenattacken ... wenn Mobs beschwoert
werden, ist eigentlich immer nicht so geil in Bossfights. Der kann ...
magischen Seelenkreisen ... Er speit auch so einen Strahl ... maybe kann
der sich auch klonen, noch so eine Seelenvariante. So eine helle,
hellblaue ... Schicken Boss draus."

Gebaut aus denselben Bloecken wie die Drachen seit 4.96 (drachen_klotz),
gefuehrt wie die anderen Bosse (boss_kern). Er ist knochenweiss mit
eisblauen Schatten, hat lange Sichelhoerner, gluehende Augen, einen
Seelenkern in der Brust und blaue Seelenflammen statt Rueckenstacheln.
Er beschwoert keine Diener: Seine Angriffe sind Magie - ein Strahl, der
langsam ueber das Feld streicht, Seelenkreise unter den Fuessen, die nach
einer Warnung ausbrechen, ein Fluegelschlag, ein Schweifhieb. In Phase
zwei erwacht der Seelenring um seinen Kopf; dann zieht er die Gegner zu
sich und stoesst sie fort, steigt auf und laesst Seelen regnen - und er
spaltet zwei Spiegelbilder ab: hellblaue, durchscheinende Abbilder, die
Seelenkugeln werfen und beim ersten Treffer zerspringen.

    python3 werkzeuge/seelendrache_bauen.py [--bilder vorschau]
"""

import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boss_kern as bk                                          # noqa: E402
import haut as H                                                # noqa: E402
import tiermodell as tm                                         # noqa: E402
from tiermodell import Modell, hexfarbe, mische, wolken         # noqa: E402
from drachen_gestalt import (Schwinge, schwinge_bauen, glieder, becken_abtrennen,  # noqa: E402
                             glut, faltung)
from drachen_klotz import klinge, klingen_reihe, bein_klotz, kopf_klotz, klotz_maler, fingerkrallen  # noqa: E402

RES = bk.RES
VER = bk.VER
TYP = "fynn:seelendrache"
NAME = "seelendrache"
PRAEFIX = "animation.fynn.seelendrache."
ABBILD = "fynn:seelenabbild"
GROESSE = 1.6
HALS = 5
SCHWANZ = 8


# ============================================================ Gestalt

# Groesser als die Schwingen des Feuerdrachen: Er soll, wenn er sie
# ausbreitet, den Himmel verdecken.
SCHWINGE = Schwinge((9, 30, -8), oberarm=18, unterarm=24, finger=(70, 64, 56, 46),
                    winkel=(18, -12, -40, -68), hinterkante=(9, 20), dicke=(6, 4, 2), biegung=14, bogen=7.0)


def flamme(k, x, y, z, hoch, neigung=-25, seite=0.0):
    """Eine Seelenflamme statt eines Rueckenstachels: drei schmale Zungen,
    die nach oben spitz zulaufen und nach hinten wehen - in einem eigenen
    Stoff, damit sie leuchten."""
    for i, (b, h, versatz) in enumerate(((3, hoch, 0.0), (2, round(hoch * 0.7), -2.0), (2, round(hoch * 0.5), 2.0))):
        k.kasten([x - b / 2, y - 0.5, z - 1 + versatz], [b, max(1, h), 2 if i else 3], "flamme",
                 drehung=[neigung, 0, seite], drehpunkt=[x, y, z])


def hoerner(m, kopf_name, ky, kz, sb, sh, sl):
    """Lange Sichelhoerner aus drei Gliedern: nach hinten ueber den Nacken,
    jedes Glied biegt sich weiter nach oben - wie eine Mondsichel. Darunter
    ein zweites, kleineres Paar."""
    y0 = ky - 3
    for seite, x in (("links", 1), ("rechts", -1)):
        hx, hy, hz = x * (sb / 2 - 2), y0 + sh - 0.5, kz - sl + 6
        h1 = m.knoch(f"horn_{seite}", [hx, hy, hz], kopf_name, drehung=[18, -x * 14, 0])
        h1.kasten([hx - 1.5, hy - 1.5, hz], [3, 3, 11], "horn")
        h2 = m.knoch(f"horn2_{seite}", [hx, hy, hz + 11], f"horn_{seite}", drehung=[16, x * 4, 0])
        h2.kasten([hx - 1, hy - 1, hz + 10.5], [2, 2, 10], "horn")
        h3 = m.knoch(f"horn3_{seite}", [hx, hy, hz + 20.5], f"horn2_{seite}", drehung=[30, x * 8, 0])
        h3.kasten([hx - 0.5, hy - 0.5, hz + 20], [1, 1, 8], "horn")
        # Das kleine Paar: kurz, schraeg nach hinten und aussen.
        k = m.finde(kopf_name)
        kx = x * (sb / 2 - 0.5)
        k.kasten([kx - 0.5, y0 + sh - 4, kz - 4], [1, 1, 7], "horn",
                 drehung=[18, -x * 32, 0], drehpunkt=[kx, y0 + sh - 3.5, kz - 4])


def seelenring(m, kopf_name, ky, kz, sb, sh, sl):
    """Der Seelenring: ein Kreis aus leuchtenden Bloecken, der hinter dem
    Kopf schwebt. Er ist nur in Phase zwei zu sehen (Animation ring_aus)
    und dreht sich langsam."""
    mitte = [0, ky + sh - 1, kz - sl / 2 + 5]
    ring = m.knoch("seelenring", list(mitte), kopf_name, drehung=[-14, 0, 0])
    r = 9.5
    # Dicht an dicht und ueberlappend: ein geschlossener Ring, keine Perlen.
    for i in range(28):
        w = i / 28 * math.tau
        x, y = mitte[0] + math.cos(w) * r, mitte[1] + math.sin(w) * r
        ring.kasten([x - 1.25, y - 1, mitte[2] - 0.5], [2.5, 2, 1], "ring",
                    drehung=[0, 0, math.degrees(w) + 90], drehpunkt=[x, y, mitte[2]])
    # Vier Runen-Spitzen nach aussen, wie die Zacken einer Krone.
    for i in range(4):
        w = (i / 4 + 1 / 8) * math.tau
        x, y = mitte[0] + math.cos(w) * (r + 2), mitte[1] + math.sin(w) * (r + 2)
        ring.kasten([x - 0.75, y - 2, mitte[2] - 0.5], [1.5, 4, 1], "ring",
                    drehung=[0, 0, math.degrees(w) - 90], drehpunkt=[x, y, mitte[2]])


def gestalt():
    """Gebaut wie der Feuerdrache (damit Faltung, Hals und Beine zueinander
    passen), aber schlanker, mit laengeren Schwingen, Sichelhoernern, einem
    Seelenkern in der Brust und Seelenflammen auf Ruecken, Hals und
    Schwanz. Der Schwanz endet in einem Faecher aus Flammen."""
    m = Modell(NAME, sichtbreite=14.0, sichthoehe=6.0)
    m.knoch("wurzel", [0, 0, 0])
    r = m.knoch("rumpf", [0, 22, 0], "wurzel")
    r.kasten([-8.5, 14, -14], [17, 16, 14], "leib")                     # Brust
    r.kasten([-6.5, 13, -15], [13, 13, 3], "brust")                     # Brustplatten vorn
    r.kasten([-4, 16, -16.5], [8, 8, 2], "kern")                        # der Seelenkern
    r.kasten([-2.5, 17.5, -17.3], [5, 5, 1], "kern")
    r.kasten([-7.5, 15, -1], [15, 14, 10], "leib")                      # Mitte
    r.kasten([-6.5, 13.5, -13], [13, 1, 29], "bauch")                   # Bauchplatten
    r.kasten([-8, 22, -12], [16, 9, 10], "leib", aufblasen=0.2)         # Schulterbuckel
    for z, h in ((-10, 9), (-5, 10), (0, 9), (5, 8)):
        flamme(r, 0, 30, z, h)
    hals, ende = glieder(m, "hals", "rumpf", (0, 26, -14), -1,
                         [(7, 11, 11, 2.5), (7, 10, 10, 2.5), (7, 9, 9, 2.0), (6, 9, 9, 1.5), (6, 9, 9, 1.0)],
                         stoff="leib")
    for i, n in enumerate(hals):
        g = m.finde(n)
        c = g.kaesten[0]
        flamme(g, 0, c.ursprung[1] + c.groesse[1], c.ursprung[2] + c.groesse[2] / 2, 7 - i, neigung=-35)
    _, ky, kz = ende
    sb, sh, sl = 13, 10, 12
    kopf_klotz(m, NAME, hals[-1], ky, kz, schaedel=(sb, sh, sl), schnauze=(10, 6, 13), hoerner="keine")
    hoerner(m, "kopf", ky, kz, sb, sh, sl)
    seelenring(m, "kopf", ky, kz, sb, sh, sl)
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 22, 17), 1,
                            [(8, 11, 10, -0.8), (8, 9, 8, -0.6), (8, 8, 7, -0.4), (8, 7, 6, -0.3),
                             (7, 6, 5, -0.2), (7, 5, 4, 0.0), (7, 4, 3, 0.0), (6, 3, 3, 0.0)], stoff="leib")
    for i, n in enumerate(schwanz[:-1]):
        g = m.finde(n)
        c = g.kaesten[0]
        flamme(g, 0, c.ursprung[1] + c.groesse[1], c.ursprung[2] + c.groesse[2] / 2, max(3, 8 - i), neigung=-55)
    _, sy, sz = ende
    spitze = m.finde(schwanz[-1])
    # Der Flammenfaecher am Schwanzende: drei Zungen, die mittlere am laengsten.
    for seite, lang in ((-30, 9), (0, 12), (30, 9)):
        spitze.kasten([-1, sy - 0.5, sz - 1], [2, 1, lang], "flamme", drehung=[0, seite, 0], drehpunkt=[0, sy, sz - 1])
        spitze.kasten([-0.5, sy + 0.5, sz], [1, 2, lang - 4], "flamme", drehung=[0, seite, 0], drehpunkt=[0, sy, sz - 1])
    for seite, x in (("links", 1), ("rechts", -1)):
        bein_klotz(m, f"bein_hinten_{seite}", "rumpf", (x * 7.5, 22, 12), (8, 10, 10), (6, 9, 6), (8, 3, 6),
                   zehen=4, zehlang=5)
        bein_klotz(m, f"bein_vorn_{seite}", "rumpf", (x * 7.5, 21, -9), (6, 9, 7), (5, 9, 5), (7, 3, 5),
                   zehen=4, zehlang=4)
    schwinge_bauen(m, SCHWINGE, zusatz=fingerkrallen)
    becken_abtrennen(m, 8, 22)
    return m


# ============================================================ Malen

# Knochenweiss mit eisblauen Schatten; die Flecken sind ein Hauch
# dunkler (Fynns Regel: grosse Flecken und Verlaeufe, keine Punkte).
FARBEN = {
    "leib": "#f4f7fb", "ruecken": "#d6dfeb", "bauch": "#ffffff", "fleck": "#dfe7f2",
    "haut": "#eef3fa", "hautfleck": "#d8e4f2", "augen": "#7cf2ff", "glut": "#8ef0ff",
    "horn": ("#8e9ab0", "#dfe5ee", "#ffffff"), "kralle": "#283246", "zunge": "#8cc4e0",
    "rachen": "#22405c", "zacken": 1.4,
}
# Seelenblau: vom tiefen Kern bis zum weissen Rand.
SEELE = [(40, 120, 200), (70, 190, 245), (130, 236, 255), (214, 252, 255), (255, 255, 255)]


def seelenfarbe(t, hell=0.0):
    t = max(0.0, min(1.0, t))
    f = H.verlauf(SEELE, t, len(SEELE))
    return glut(f, hell)


def maler(phase):
    """Phase eins: Kern, Augen und Flammen leuchten. Phase zwei: Der Leib
    reisst auf - feine, leuchtende Seelenadern laufen ueber Flanken und
    Hals, die Adern der Flughaut gluehen, die Flammen werden weisser."""
    def besonders(stoff, p, n, texel):
        x, y, z = p
        k = H.kasten_von(texel)
        if stoff == "kern":
            # Ein Kristall mit Licht von innen: in der Mitte weiss, zum Rand
            # tiefblau, mit einem Kreuz aus Licht.
            if k is None:
                return seelenfarbe(0.6)
            cx = k.ursprung[0] + k.groesse[0] / 2
            cy = k.ursprung[1] + k.groesse[1] / 2
            d = max(abs(x - cx), abs(y - cy)) / max(1.0, k.groesse[0] / 2)
            if abs(x - cx) < 0.6 or abs(y - cy) < 0.6:
                d *= 0.5
            return seelenfarbe(1.0 - d * (0.8 if phase == 2 else 1.0), 0.0)
        if stoff == "flamme":
            # Unten tiefblau, zur Spitze weiss - in Phase zwei heller.
            t = H.hoehe(p, n, texel) if abs(n[1]) <= 0.5 else (0.9 if n[1] > 0 else 0.2)
            return seelenfarbe(0.25 + t * 0.7 + (0.15 if phase == 2 else 0.0))
        if stoff == "schnauze" and n[2] < -0.5 and H.hoehe(p, n, texel) > 0.55 and 1.0 < abs(x) < 2.6:
            # Die Nuestern schmal und schieferblau - schwarz wirkten sie von
            # vorn wie ein zweites Paar Augen.
            if H.hoehe(p, n, texel) > 0.75 and 1.4 < abs(x) < 2.3:
                return (70, 96, 132)
            return H.dunkler(FARBEN["leib"], 0.06)
        if stoff == "ring":
            return seelenfarbe(0.75 if abs(n[2]) > 0.5 else 0.45)
        if phase == 2 and stoff in ("leib", "bein", "kopf", "schnauze") and abs(n[1]) <= 0.5:
            # Seelenadern: Hoehenlinien eines ruhigen Rauschens - geschwungene,
            # zusammenhaengende Linien, keine Punkte.
            w = wolken((x * 0.6, y, z * 0.6), 5.0, 913)
            if abs(w - 0.5) < 0.022:
                return seelenfarbe(0.7)
            if abs(w - 0.5) < 0.05:
                return H.mische(H.farbe(FARBEN["leib"]), (150, 230, 255), 0.45)
        return False

    f = dict(FARBEN)
    roh = klotz_maler(NAME, f, SCHWINGE, besonders=besonders, saat=17)
    ader = seelenfarbe(0.55) if phase == 2 else (150, 196, 236)

    def male(stoff, p, n, texel):
        c = roh(stoff, p, n, texel)
        if c is not None and stoff.startswith("flughaut") and phase == 2:
            # Die Adern der Flughaut (dunkler als die Haut) gluehen in Phase zwei.
            if tuple(c[:3]) == tuple(H.dunkler(FARBEN["haut"], 0.2)[:3]):
                return ader
        return c
    return male


def abbild_haut(bild):
    """Das Spiegelbild: dieselbe Gestalt, hellblau und durchscheinend
    (Material entity_alphablend) - Licht wird zu Weiss, Schatten zu
    Himmelblau, Augen und Flammen fast deckend."""
    aus = Image.new("RGBA", bild.size, (0, 0, 0, 0))
    q = bild.load()
    z = aus.load()
    for y in range(bild.height):
        for x in range(bild.width):
            r, g, b, a = q[x, y]
            if a == 0:
                continue
            hell = (0.3 * r + 0.59 * g + 0.11 * b) / 255
            f = mische((96, 178, 250), (236, 252, 255), max(0.0, min(1.0, (hell - 0.45) / 0.5)))
            z[x, y] = f + (225 if a == 254 else 150,)
    return aus


def bauen():
    m = gestalt()
    geo = m.geometrie()
    geo["minecraft:geometry"][0]["description"]["identifier"] = f"geometry.fynn.{NAME}"
    h1 = m.male(maler(1))
    h2 = m.male(maler(2))
    return m, geo, h1, h2


# ============================================================ Bewegung

# Die Schwingen am Boden: ausgerechnet wie bei den Drachen (faltung), die
# Flughaut zieht sich dabei zum Knochen zusammen.
FALT = faltung(SCHWINGE)
FINGER = SCHWINGE.anzahl
# Hals aufgerichtet, Kopf leicht gesenkt, der Schwanz liegt.
HALS_STAND = (-16.0, -9.0, -2.0, 6.0, 9.0)
KOPF_STAND = 14.0
SCHWANZ_STAND = (6.0, 3.0, 0.0, -2.0, -3.0, -2.0, 0.0, 0.0)


def fluegel(auf=0.0, hebung=0.0, vor=0.0, knick=0.0):
    """Beide Schwingen als Pose. auf: 0 gefaltet, 1 ausgebreitet;
    hebung: wie weit die ausgebreitete Schwinge nach oben steht (Grad);
    vor: nach vorn geschwenkt (die Schwingen umfangen den Leib);
    knick: der Unterarm knickt nach unten ein (beim Schlag nach oben)."""
    pose = {}
    for seite, s in (("links", 1), ("rechts", -1)):
        for name, (x, y, z) in FALT.items():
            w = [x * (1 - auf), y * s * (1 - auf), z * s * (1 - auf)]
            if name == "fluegel":
                w[2] -= hebung * s * auf
                w[1] += vor * s
            if name == "unterarm":
                w[2] += knick * s * auf
            pose[f"{name}_{seite}"] = {"rotation": [round(v, 2) for v in w]}
        sc = round(0.15 + 0.85 * auf, 3)
        pose[f"armhaut_{seite}"] = {"scale": [1.0, 1.0, sc]}
        pose[f"unterarmhaut_{seite}"] = {"scale": [1.0, 1.0, sc]}
        for i in range(1, FINGER):
            pose[f"fingerhaut{i}_{seite}"] = {"scale": [1.0, 1.0, round(0.12 + 0.88 * auf, 3)]}
    return pose


def grund():
    pose = {}
    for i, w in enumerate(HALS_STAND):
        pose[f"hals{i + 1}"] = {"rotation": [w, 0.0, 0.0], "position": [0.0, 0.0, 0.0]}
    pose["kopf"] = {"rotation": [KOPF_STAND, 0.0, 0.0], "position": [0.0, 0.0, 0.0]}
    for i, w in enumerate(SCHWANZ_STAND):
        pose[f"schwanz{i + 1}"] = {"rotation": [w, 0.0, 0.0], "position": [0.0, 0.0, 0.0]}
    for k in ("rumpf", "becken", "kiefer"):
        pose[k] = {"rotation": [0.0, 0.0, 0.0], "position": [0.0, 0.0, 0.0]}
    for k, v in fluegel().items():
        pose[k] = dict({"rotation": [0.0, 0.0, 0.0], "position": [0.0, 0.0, 0.0]}, **v)
    return pose


def hals(*w, y=0.0):
    """Die Halsglieder auf einmal: w je Glied (x), y verteilt auf alle."""
    return {f"hals{i + 1}": [w[i] if i < len(w) else w[-1], round(y / HALS, 2), 0.0] for i in range(HALS)}


def schwanz(x=0.0, y=0.0):
    """Der Schwanz biegt sich, nach hinten immer mehr."""
    return {f"schwanz{i + 1}": [round(SCHWANZ_STAND[i] + x * (0.5 + i * 0.12), 2), round(y * (0.4 + i * 0.12), 2), 0.0]
            for i in range(SCHWANZ)}


def ablauf(laenge, bilder, **weiter):
    """Wie bk.ablauf, aber Posen duerfen ganze Teile mischen: hals(...),
    schwanz(...), fluegel(...) - alles wird zu einem Bild zusammengelegt."""
    return bk.ablauf(grund(), laenge, [(t, standfest(dict(b))) for t, b in bilder], **weiter)


def standfest(bild):
    """Baeumt er sich auf (Rumpf um x), drehen Becken und Hinterbeine
    zurueck, damit die Fuesse am Boden bleiben."""
    if "rumpf" not in bild:
        return bild
    r = bild["rumpf"]
    kx = (r["rotation"] if isinstance(r, dict) else r)[0]
    alt = bild.get("becken", [0, 0, 0])
    if isinstance(alt, dict):
        return bild
    bild["becken"] = [alt[0] - kx, alt[1], alt[2]]
    return bild


T = "query.life_time"


def haltung():
    """Er atmet, der Hals wiegt sich, der Schwanz pendelt, die Flammen
    lodern (die Flammen sitzen fest, darum zittert der Rumpf ein wenig)."""
    knochen = {}
    for name, wert in grund().items():
        knochen[name] = {k: list(v) for k, v in wert.items() if k != "position"}
    for i, w in enumerate(HALS_STAND):
        knochen[f"hals{i + 1}"]["rotation"] = [f"{w} + math.sin({T} * 50.0 - {i * 25}) * 1.8",
                                              f"math.sin({T} * 19.0 - {i * 20}) * 3.0", 0.0]
    knochen["kopf"]["rotation"] = [f"{KOPF_STAND} + math.sin({T} * 50.0 - 140.0) * 3.0",
                                   f"math.sin({T} * 23.0) * 10.0", f"math.sin({T} * 13.0) * 4.0"]
    for i, w in enumerate(SCHWANZ_STAND):
        knochen[f"schwanz{i + 1}"]["rotation"] = [f"{w} + math.sin({T} * 40.0 - {i * 30}) * 1.5",
                                                 f"math.sin({T} * 30.0 - {i * 35}) * {2 + i * 1.5}", 0.0]
    knochen["rumpf"] = {"scale": [f"1.0 + math.sin({T} * 55.0) * 0.01", f"1.0 + math.sin({T} * 55.0) * 0.016", 1.0],
                        "position": [0.0, f"math.sin({T} * 55.0) * 0.3", 0.0]}
    knochen["kiefer"] = {"rotation": [f"math.max(0.0, math.sin({T} * 31.0) - 0.9) * 120.0", 0.0, 0.0]}
    return {"loop": True, "bones": knochen}


def gang():
    """Vier Beine im Kreuzgang, die Zehen krallen sich ein, das Becken
    dreht gegen die Brust."""
    t = "query.anim_time * 16.0"
    k = {}
    for bein, a in (("bein_vorn_links", 1), ("bein_hinten_rechts", 1), ("bein_vorn_rechts", -1), ("bein_hinten_links", -1)):
        k[bein] = {"rotation": [f"math.cos({t}) * {26 * a}", 0.0, 0.0]}
        k[bein.replace("bein", "unterbein")] = {"rotation": [f"math.max(0.0, math.sin({t}) * {30 * a})", 0.0, 0.0]}
        k[bein.replace("bein", "fuss")] = {"rotation": [f"-math.max(0.0, math.sin({t}) * {20 * a})", 0.0, 0.0]}
    k["becken"] = {"rotation": [0.0, f"math.sin({t}) * 4.0", 0.0]}
    k["rumpf"] = {"position": [0.0, f"-math.abs(math.sin({t})) * 0.8", 0.0]}
    for i in range(SCHWANZ):
        k[f"schwanz{i + 1}"] = {"rotation": [0.0, f"math.sin({t} - {40 + i * 30}) * {4 + i * 1.5}", 0.0]}
    return {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": k}


def lider():
    """Die Lider liegen sonst ueber den Augen; nur alle paar Sekunden
    blinzelt er. Laeuft immer, auch waehrend der Angriffe."""
    return {"loop": True, "bones": {"lider": {"scale": f"math.mod({T}, 5.3) < 0.14 ? 1.0 : 0.0"}}}


def ring_aus():
    return {"loop": True, "bones": {"seelenring": {"scale": 0.0}}}


def ring_an():
    """Phase zwei: Der Ring dreht sich und pulsiert."""
    return {"loop": True, "bones": {"seelenring": {
        "rotation": [0.0, 0.0, f"{T} * 40.0"],
        "scale": f"1.0 + math.sin({T} * 220.0) * 0.04"}}}


def beine_vorn(ober, unter=0.0, fuss=0.0):
    return {f"{t}_vorn_{s}": [w, 0.0, 0.0] for s in ("links", "rechts")
            for t, w in (("bein", ober), ("unterbein", unter), ("fuss", fuss))}


def beine_hinten(ober, unter=0.0, fuss=0.0):
    return {f"{t}_hinten_{s}": [w, 0.0, 0.0] for s in ("links", "rechts")
            for t, w in (("bein", ober), ("unterbein", unter), ("fuss", fuss))}


def pose(*teile, **knochen):
    """Legt Teilposen (hals(...), fluegel(...) ...) und einzelne Knochen zu
    einem Bild zusammen."""
    bild = {}
    for t in teile:
        bild.update(t)
    bild.update(knochen)
    return bild


def aufbaeumen(winkel, hoch=0.0):
    """Der Rumpf richtet sich auf; die Vorderbeine heben sich mit, damit
    sie nicht in den Boden stechen, und er geht ein Stueck hoch."""
    return pose(beine_vorn(winkel * 1.6, -winkel * 1.4), rumpf={"rotation": [winkel, 0.0, 0.0],
                                                                 "position": [0.0, hoch, 0.0]})


# Geduckt, die Schwingen um den Leib gelegt: der Anfang beim Auftritt und
# die Haltung beim Aufladen.
KAUERN = pose(hals(0, 4, 4, 4, 4), fluegel(0.0), beine_vorn(-55, 100, -45), beine_hinten(-50, 95, -45),
              kopf=[18.0, 0.0, 0.0], rumpf={"rotation": [3.0, 0.0, 0.0], "position": [0.0, -7.5, 0.0]})


def gebogen(winkel):
    """Hals und Kopf zur Seite: winkel teilen sich Hals (60 %) und Kopf."""
    return {f"hals{i + 1}": [HALS_STAND[i] + (6 if i > 2 else 0), round(winkel * 0.6 / HALS, 2), 0.0] for i in range(HALS)}


def seelenstrahl():
    """Er reisst den Kopf zurueck, Licht sammelt sich im Maul (bis 1,1 s),
    dann der Strahl: Er streicht langsam von rechts nach links (1,2 bis
    3,4 s) - wer zur Seite laeuft oder sich duckt hinter etwas, entkommt."""
    zurueck = pose(hals(-26, -16, -8, -2, 4), fluegel(0.9, 30), aufbaeumen(-10, 1.0),
                   kopf=[-14.0, 0.0, 0.0], kiefer=[12.0, 0.0, 0.0])

    def speit(w):
        return pose(gebogen(w), fluegel(0.85, 18), aufbaeumen(2.0), kopf=[8.0, round(w * 0.4, 1), 0.0],
                    kiefer=[34.0, 0.0, 0.0])
    return ablauf(4.4, [
        (0.70, zurueck),
        (1.00, dict(zurueck, kopf=[-18.0, 0.0, 0.0])),
        (1.20, speit(35)), (2.30, speit(0)), (3.40, speit(-35)),
        (3.80, pose(hals(*HALS_STAND), fluegel(0.0), kopf=[KOPF_STAND, 0.0, 0.0], kiefer=[4.0, 0.0, 0.0])),
    ])


def seelenkreise():
    """Aufbaeumen, die Schwingen offen, der Kopf zum Himmel - unter den
    Gegnern leuchten Kreise auf (1,0 s). Mit dem Aufstampfen (2,0 s)
    brechen Saeulen aus Seelenlicht hervor. Dann noch einmal (2,4 / 3,2 s)."""
    hoch = pose(aufbaeumen(-22, 2.0), hals(-12, -8, -4, 0, 4), fluegel(0.85, 35), kopf=[-22.0, 0.0, 0.0],
                kiefer=[26.0, 0.0, 0.0])
    unten = pose(aufbaeumen(6.0), hals(-8, -2, 4, 8, 10), fluegel(0.6, -5), kopf=[22.0, 0.0, 0.0],
                 kiefer=[18.0, 0.0, 0.0], wurzel={"position": [0.0, -0.8, 0.0]})
    return ablauf(4.0, [
        (0.50, hoch), (1.00, dict(hoch, kopf=[-26.0, 0.0, 0.0])),
        (1.55, hoch),
        (1.90, unten), (2.05, dict(unten, wurzel={"position": [0.0, 0.0, 0.0]})),
        (2.40, pose(hoch, aufbaeumen(-15, 1.2))),
        (2.95, pose(hoch, aufbaeumen(-15, 1.2))),
        (3.15, unten), (3.35, dict(unten, wurzel={"position": [0.0, 0.0, 0.0]})),
    ])


def fluegelschlag():
    """Die Schwingen hoch - und zweimal nach vorn unten geschlagen (0,7 /
    1,4 s): eine Druckwelle, die alles vor ihm fortreisst."""
    oben = pose(fluegel(1.0, 72), aufbaeumen(-12, 1.0), hals(-20, -12, -6, 0, 4), kopf=[-4.0, 0.0, 0.0],
                kiefer=[20.0, 0.0, 0.0])
    unten = pose(fluegel(1.0, -8, knick=-20), aufbaeumen(4.0), hals(-10, -4, 2, 6, 8), kopf=[10.0, 0.0, 0.0],
                 kiefer=[30.0, 0.0, 0.0])
    return ablauf(2.2, [(0.40, oben), (0.70, unten), (1.05, oben), (1.40, unten),
                        (1.80, pose(fluegel(0.0), kopf=[KOPF_STAND, 0.0, 0.0], kiefer=[0.0, 0.0, 0.0]))])


def schweifhieb():
    """Er dreht sich halb weg, holt mit dem Schwanz aus und fegt ihn einmal
    herum (0,65 s) - fuer alle, die hinter oder neben ihm stehen."""
    return ablauf(1.6, [
        (0.35, pose(schwanz(4, 32), gebogen(-30), rumpf=[0.0, -18.0, 0.0], kopf=[KOPF_STAND, -12.0, 0.0])),
        (0.65, pose(schwanz(6, -58), gebogen(25), rumpf=[0.0, 28.0, 0.0], kopf=[KOPF_STAND, 10.0, 0.0])),
        (1.00, pose(schwanz(2, -22), rumpf=[0.0, 10.0, 0.0])),
    ])


def seelensog():
    """Phase zwei: Er baeumt sich auf, breitet die Schwingen und bruellt -
    ein Sog zieht alle zu ihm (0,6 bis 2,0 s). Dann der Schlag mit beiden
    Schwingen (2,2 s), der sie wieder fortstoesst."""
    auf = pose(aufbaeumen(-20, 2.0), fluegel(1.0, 48), hals(-16, -10, -4, 0, 2), kopf=[-26.0, 0.0, 0.0],
               kiefer=[42.0, 0.0, 0.0])
    return ablauf(3.2, [
        (0.50, auf), (1.30, dict(auf, kopf=[-22.0, 0.0, 0.0])), (1.95, pose(auf, fluegel(1.0, 64))),
        (2.20, pose(aufbaeumen(6.0), fluegel(1.0, -8, knick=-20), hals(-6, 0, 4, 8, 10), kopf=[20.0, 0.0, 0.0],
                    kiefer=[30.0, 0.0, 0.0], wurzel={"position": [0.0, -1.0, 0.0]})),
        (2.60, pose(fluegel(0.6, 0), wurzel={"position": [0.0, 0.0, 0.0]})),
    ])


def seelenspiegel():
    """Phase zwei: Er huellt sich in die Schwingen und duckt sich (0,4 s),
    Licht flackert - dann reisst er sie auf (1,3 s), und links und rechts
    stehen zwei hellblaue Spiegelbilder."""
    zu = pose(KAUERN, fluegel(0.0))
    return ablauf(2.4, [
        (0.40, zu), (1.10, dict(zu, kopf=[34.0, 0.0, 0.0])),
        (1.30, pose(aufbaeumen(-18, 1.5), fluegel(1.0, 55), hals(-18, -12, -6, 0, 4), beine_hinten(0.0),
                    kopf=[-20.0, 0.0, 0.0], kiefer=[36.0, 0.0, 0.0])),
        (1.85, pose(fluegel(0.5, 20), aufbaeumen(-4.0), kopf=[6.0, 0.0, 0.0], kiefer=[0.0, 0.0, 0.0])),
    ])


def seelensturm():
    """Phase zwei: Er duckt sich und springt (0,8 s) - das Skript hebt ihn
    in die Luft. Dort schlaegt er mit den Schwingen und laesst Seelen
    regnen; bei 3,9 s stuerzt er herab und schlaegt auf (4,2 s): eine
    Welle laeuft ueber den Boden."""
    luft = pose(beine_hinten(30, 30, 20), beine_vorn(-40, 80, 20), hals(-6, 0, 6, 10, 12), kopf=[28.0, 0.0, 0.0],
                kiefer=[24.0, 0.0, 0.0], rumpf={"rotation": [-8.0, 0.0, 0.0], "position": [0.0, 0.0, 0.0]})
    bilder = [
        (0.55, pose(KAUERN, fluegel(1.0, 62))),
        (0.80, pose(fluegel(1.0, -32, knick=-12), beine_hinten(20, 10), beine_vorn(-30, 40),
                    rumpf={"rotation": [-16.0, 0.0, 0.0], "position": [0.0, 0.0, 0.0]})),
    ]
    t, oben = 1.1, True
    while t < 3.75:
        bilder.append((round(t, 2), pose(luft, fluegel(1.0, 62) if oben else fluegel(1.0, -30, knick=-14))))
        t += 0.3
        oben = not oben
    bilder += [
        (3.90, pose(luft, fluegel(1.0, 80), rumpf={"rotation": [14.0, 0.0, 0.0], "position": [0.0, 0.0, 0.0]})),
        (4.20, pose(fluegel(1.0, -22), beine_vorn(10), beine_hinten(0), hals(-6, -2, 4, 8, 10), kopf=[18.0, 0.0, 0.0],
                    kiefer=[30.0, 0.0, 0.0], rumpf={"rotation": [4.0, 0.0, 0.0], "position": [0.0, -2.0, 0.0]})),
        (4.60, pose(fluegel(0.5, 10), rumpf={"rotation": [0.0, 0.0, 0.0], "position": [0.0, 0.0, 0.0]})),
    ]
    return ablauf(5.2, bilder)


def wechsel():
    """Phase eins ist leer: ein Schrei, dann kauert er sich in seine
    Schwingen und laedt sich auf (1,0 bis 3,6 s) - Seelen stroemen in
    seinen Kern. Er baeumt sich auf, und beim Aufschlag (4,2 s) erwacht
    der Seelenring."""
    return ablauf(5.0, [
        (0.30, pose(aufbaeumen(-18, 1.5), fluegel(0.6, 30), kopf=[-26.0, 0.0, 0.0], kiefer=[40.0, 0.0, 0.0])),
        (1.00, KAUERN),
        (3.60, dict(KAUERN, kopf=[22.0, 0.0, 0.0])),
        (3.90, pose(aufbaeumen(-30, 3.0), fluegel(1.0, 72), hals(-20, -14, -8, -4, 0), beine_hinten(0.0),
                    kopf=[-30.0, 0.0, 0.0], kiefer=[46.0, 0.0, 0.0])),
        (4.20, pose(aufbaeumen(4.0), fluegel(1.0, -16), hals(-8, -2, 4, 8, 10), kopf=[16.0, 0.0, 0.0],
                    kiefer=[30.0, 0.0, 0.0])),
        (4.60, pose(fluegel(0.4, 10), kopf=[KOPF_STAND, 0.0, 0.0], kiefer=[0.0, 0.0, 0.0])),
    ])


def seelengericht():
    """Der ultimative Angriff (Phase zwei) - Fynn: "Er laedt so seine Kraft
    maessig auf. Und dabei bildet sich so ein grosser Magiekreis um ihn
    herum ... der ist auf jeden Fall gefaehrlich." Ein Schrei, dann stemmt
    er sich in den Boden, breitet die Schwingen und reckt den Kopf zum
    Himmel; er laedt (1,0 bis 5,0 s) und zittert dabei immer staerker. Er
    baeumt sich ein letztes Mal auf - und schlaegt die Schwingen herab
    (5,4 s): Im ganzen Kreis brechen Seelen aus dem Boden."""
    laden = pose(aufbaeumen(-14, 1.5), fluegel(1.0, 50), hals(-22, -16, -10, -6, -2), beine_vorn(-22, 30, -8),
                 kopf=[-30.0, 0.0, 0.0], kiefer=[30.0, 0.0, 0.0])
    return ablauf(6.6, [
        (0.40, pose(aufbaeumen(-24, 2.0), fluegel(0.9, 40), kopf=[-30.0, 0.0, 0.0], kiefer=[46.0, 0.0, 0.0])),
        (1.00, laden),
        (3.00, dict(laden, kopf=[-36.0, 0.0, 0.0], kiefer=[38.0, 0.0, 0.0])),
        (4.60, pose(laden, fluegel(1.0, 64))),
        (5.00, pose(aufbaeumen(-32, 3.0), fluegel(1.0, 82), hals(-24, -18, -12, -6, -2), beine_hinten(0.0),
                    kopf=[-38.0, 0.0, 0.0], kiefer=[50.0, 0.0, 0.0])),
        (5.40, pose(aufbaeumen(6.0), fluegel(1.0, -12, knick=-20), hals(-4, 2, 6, 10, 12), kopf=[24.0, 0.0, 0.0],
                    kiefer=[34.0, 0.0, 0.0], wurzel={"position": [0.0, -1.5, 0.0]})),
        (5.90, pose(fluegel(0.6, 5), kopf=[KOPF_STAND, 0.0, 0.0], kiefer=[6.0, 0.0, 0.0],
                    wurzel={"position": [0.0, 0.0, 0.0]})),
    ])


def zittern():
    """Waehrend des Seelengerichts bebt er - je laenger er laedt, desto mehr."""
    huelle = "math.clamp((query.anim_time - 1.0) / 4.0, 0.0, 1.0) * (query.anim_time < 5.0)"
    return {"loop": "hold_on_last_frame", "animation_length": 6.6, "bones": {
        "wurzel": {"rotation": [f"math.sin(query.anim_time * 2600.0) * 1.1 * {huelle}", 0.0,
                                f"math.sin(query.anim_time * 1900.0) * 1.1 * {huelle}"]}}}


def beben():
    """Waehrend er laedt, zittert er - immer staerker."""
    huelle = "math.clamp((query.anim_time - 1.0) / 2.6, 0.0, 1.0) * (query.anim_time < 3.6)"
    return {"loop": "hold_on_last_frame", "animation_length": 5.0, "bones": {
        "wurzel": {"rotation": [f"math.sin(query.anim_time * 2400.0) * 0.8 * {huelle}", 0.0,
                                f"math.sin(query.anim_time * 1700.0) * 0.8 * {huelle}"]}}}


def auftritt():
    """Er kauert, in seine Schwingen gehuellt, im Seelenkreis - richtet sich
    auf, breitet die Schwingen und schreit (1,8 s)."""
    return ablauf(3.2, [
        (0.0, KAUERN), (1.00, dict(KAUERN, kopf=[22.0, 0.0, 0.0])),
        (1.80, pose(aufbaeumen(-26, 2.5), fluegel(1.0, 66), hals(-18, -12, -6, -2, 2), beine_hinten(0.0),
                    kopf=[-28.0, 0.0, 0.0], kiefer=[46.0, 0.0, 0.0])),
        (2.30, pose(aufbaeumen(3.0), fluegel(0.6, 15), hals(*HALS_STAND), kopf=[12.0, 0.0, 0.0], kiefer=[10.0, 0.0, 0.0])),
    ])


LIEGEN = pose(beine_vorn(-80, 70, 10), beine_hinten(-75, 110, -30), fluegel(0.9, -6), hals(10, 6, 2, -2, -4),
              kopf=[6.0, 0.0, 12.0], kiefer=[10.0, 0.0, 0.0], schwanz1=[-6.0, 10.0, 0.0],
              rumpf={"rotation": [0.0, 0.0, 5.0], "position": [0.0, -11.0, 0.0]})


def abschied():
    """Ein letzter Schrei, dann bricht er zusammen; die Schwingen sinken
    offen zu Boden, und seine Seele steigt aus ihm auf."""
    return ablauf(4.0, [
        (0.40, pose(aufbaeumen(-20, 1.5), fluegel(0.8, 40), kopf=[-34.0, 0.0, 0.0], kiefer=[44.0, 0.0, 0.0])),
        (1.20, LIEGEN),
        (2.40, dict(LIEGEN, kopf=[28.0, 0.0, 16.0], kiefer=[4.0, 0.0, 0.0])),
        (4.00, dict(LIEGEN, kopf=[30.0, 0.0, 18.0], kiefer=[2.0, 0.0, 0.0])),
    ], zurueck=False)


def hieb_biss():
    return ablauf(0.8, [
        (0.25, pose(hals(-22, -14, -6, 0, 4), kopf=[-10.0, 0.0, 0.0], kiefer=[38.0, 0.0, 0.0])),
        (0.45, pose(hals(4, 8, 10, 12, 12), kopf=[30.0, 0.0, 0.0], kiefer=[0.0, 0.0, 0.0])),
    ])


def hieb_klaue():
    return ablauf(0.8, [
        (0.30, {"bein_vorn_links": [-80.0, 0.0, -12.0], "unterbein_vorn_links": [40.0, 0.0, 0.0],
                "rumpf": [-8.0, 8.0, 0.0], "kopf": [KOPF_STAND, -10.0, 0.0]}),
        (0.45, {"bein_vorn_links": [18.0, 0.0, 6.0], "unterbein_vorn_links": [0.0, 0.0, 0.0],
                "rumpf": [4.0, -8.0, 0.0], "kopf": [KOPF_STAND + 8, 6.0, 0.0]}),
    ])


ANGRIFFE = {
    "seelenstrahl": (1, seelenstrahl, {"laden": 0.2, "von": 1.2, "bis": 3.4}),
    "seelenkreise": (2, seelenkreise, {"zeichen": 1.0, "ausbruch": 2.0, "zeichen2": 2.4, "ausbruch2": 3.2}),
    "fluegelschlag": (3, fluegelschlag, {"schlaege": [0.7, 1.4]}),
    "schweifhieb": (4, schweifhieb, {"treffer": 0.65}),
    "seelensog": (5, seelensog, {"sog_von": 0.6, "sog_bis": 2.0, "knall": 2.2}),
    "seelenspiegel": (6, seelenspiegel, {"spaltung": 1.3}),
    "seelensturm": (7, seelensturm, {"abheben": 0.8, "oben": 1.4, "regen": [1.8, 2.3, 2.8, 3.3], "sturz": 3.9,
                                     "aufprall": 4.2}),
    "wechsel": (8, wechsel, {"laden_von": 1.0, "laden_bis": 3.6, "umschlag": 4.2}),
    "auftritt": (9, auftritt, {"bereit": 2.8}),
    "abschied": (10, abschied, {"beute": 3.2}),
    "seelengericht": (11, seelengericht, {"laden_von": 1.0, "laden_bis": 5.0, "entladung": 5.4}),
}
HIEBE = [("hieb_biss", hieb_biss), ("hieb_klaue", hieb_klaue)]


def alle_animationen():
    anims = {PRAEFIX + "haltung": haltung(), PRAEFIX + "gang": gang(), PRAEFIX + "beben": beben(),
             PRAEFIX + "zittern": zittern(),
             PRAEFIX + "lider": lider(), PRAEFIX + "ring_aus": ring_aus(), PRAEFIX + "ring_an": ring_an()}
    for name, bau in HIEBE:
        anims[PRAEFIX + name] = bau()
    for name, (_, bau, _) in ANGRIFFE.items():
        a = bau()
        a["loop"] = "hold_on_last_frame"
        anims[PRAEFIX + name] = a
    return anims


def maul_ort(geo, anim, zeit):
    """Wo das Maul in einer Pose steht - in Bloecken vor und ueber den
    Fuessen. Das Skript laesst Strahl und Seelenkugeln dort beginnen, wo
    der Drache sie sichtbar ausspeit."""
    import molang
    import spieler_ansehen as s
    from drachen_gestalt import MAEULER
    teil = geo["minecraft:geometry"][0]
    knochen = s._modellknochen(teil)
    u = molang.Umgebung({"q.life_time": zeit, "q.anim_time": zeit})
    p = s.Pose()
    p.lege_an(anim, 1.0, zeit, u)
    m = s.baue_matrizen(knochen, {"": p}, {n: k["pivot"] for n, k in knochen.items()})
    kopf, ort = MAEULER[NAME][0]
    w = s.anwenden(m[kopf], ort)
    return round(-w[2] * GROESSE / 16, 2), round(w[1] * GROESSE / 16, 2)


def schau_daten():
    """Was die Pixelschmiede braucht, um die Angriffe zu zeigen: die Zeiten
    (in Sekunden), wo das Maul sitzt, die Haut der Spiegelbilder und wohin
    Kreise und Seelen fallen (Beispielorte vor ihm, in Welteinheiten - ein
    Block sind 16, er schaut nach -z)."""
    import base64
    import io
    from drachen_gestalt import MAEULER
    zeiten = {}
    for name, (_, bau, z) in ANGRIFFE.items():
        laenge = bau()["animation_length"]
        e = dict(z, laenge=laenge, ende=laenge + 0.8)
        zeiten[name] = e
    zeiten["seelenspiegel"]["ende"] = zeiten["seelenspiegel"]["spaltung"] + 6.5
    m, _, _, h2 = bauen()
    puffer = io.BytesIO()
    abbild_haut(h2).save(puffer, "PNG")
    return {
        "zeiten": zeiten,
        "maul": MAEULER[NAME][0][1],
        "abbild": "data:image/png;base64," + base64.b64encode(puffer.getvalue()).decode("ascii"),
        "kreise": [[[-48, -150], [56, -112], [4, -205], [-112, -64]],
                   [[44, -175], [-64, -122], [108, -58], [8, -92]]],
        "sturm": [[-40, -120], [50, -150], [-90, -70], [20, -190]],
    }


# ============================================================ Spiegelbild

AB_PRAEFIX = "animation.fynn.seelenabbild."


def abbild_animationen():
    """Das Spiegelbild schwebt mit ausgebreiteten Schwingen, die langsam
    schlagen; die Beine haengen. wurf: Es wirft den Kopf vor und speit eine
    Seelenkugel (das Skript spielt es ab)."""
    schlag = f"(22.0 + math.sin({T} * 120.0) * 34.0)"
    k = {}
    for seite, s_ in (("links", 1), ("rechts", -1)):
        # Das Vorzeichen als Zahl ausgeschrieben: "-" vor "-1" ergab "--1",
        # und daran scheitert Molang.
        k[f"fluegel_{seite}"] = {"rotation": [0.0, 0.0, f"{-s_:.1f} * {schlag}"]}
        k[f"unterarm_{seite}"] = {"rotation": [0.0, 0.0, f"{s_:.1f} * math.sin({T} * 120.0 - 50.0) * 14.0"]}
    for name, w in pose(beine_hinten(30, 30, 20), beine_vorn(-40, 80, 20)).items():
        k[name] = {"rotation": w}
    for i in range(HALS):
        k[f"hals{i + 1}"] = {"rotation": [f"{(-6, 0, 4, 8, 10)[i]} + math.sin({T} * 60.0 - {i * 30}) * 2.0", 0.0, 0.0]}
    k["kopf"] = {"rotation": [f"16.0 + math.sin({T} * 60.0 - 160.0) * 3.0", 0.0, 0.0]}
    for i in range(SCHWANZ):
        k[f"schwanz{i + 1}"] = {"rotation": [f"-6.0 + math.sin({T} * 70.0 - {i * 40}) * 4.0",
                                            f"math.sin({T} * 45.0 - {i * 40}) * {3 + i}", 0.0]}
    k["rumpf"] = {"rotation": [-6.0, 0.0, 0.0], "position": [0.0, f"math.sin({T} * 120.0 - 90.0) * 1.5", 0.0]}
    schweben = {"loop": True, "bones": k}
    wurf = {"animation_length": 0.6, "bones": {
        "kopf": {"rotation": {"0.0": [0, 0, 0], "0.15": [-24, 0, 0], "0.3": [22, 0, 0], "0.6": [0, 0, 0]}},
        "kiefer": {"rotation": {"0.0": [0, 0, 0], "0.15": [10, 0, 0], "0.3": [40, 0, 0], "0.6": [0, 0, 0]}}}}
    return {AB_PRAEFIX + "schweben": schweben, AB_PRAEFIX + "wurf": wurf,
            AB_PRAEFIX + "lider": lider(), AB_PRAEFIX + "ring": ring_an()}


def abbild_aussehen():
    anims = {k[len(AB_PRAEFIX):]: k for k in abbild_animationen()}
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": ABBILD,
        "materials": {"default": "entity_alphablend"},
        "textures": {"default": "textures/entity/seelenabbild"},
        "geometry": {"default": f"geometry.fynn.{NAME}"},
        "animations": anims,
        "scripts": {"scale": "1.0", "animate": ["schweben", "lider", "ring"]},
        "render_controllers": ["controller.render.default"],
    }}}


def abbild_verhalten():
    """Kein Diener: Es geht nicht, es greift nicht an - es schwebt, wo es
    erscheint, und das Kampfskript laesst es Seelenkugeln werfen. Ein
    Treffer, und es zerspringt; nach 24 Sekunden vergeht es von selbst."""
    return {"format_version": "1.21.90", "minecraft:entity": {
        "description": {"identifier": ABBILD, "is_spawnable": False, "is_summonable": True},
        "component_groups": {"fynn:vergehen": {"minecraft:instant_despawn": {}}},
        "components": {
            "minecraft:type_family": {"family": ["seelendrache", "seelenabbild", "monster", "mob"]},
            "minecraft:health": {"value": 4, "max": 4},
            "minecraft:collision_box": {"width": 2.2, "height": 2.2},
            "minecraft:physics": {"has_gravity": False},
            "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
            "minecraft:knockback_resistance": {"value": 1.0},
            "minecraft:fire_immune": True,
            "minecraft:damage_sensor": {"triggers": [
                {"cause": "fall", "deals_damage": "no"},
                {"on_damage": {"filters": {"test": "is_family", "subject": "other", "value": "seelendrache"}},
                 "deals_damage": "no"}]},
            "minecraft:timer": {"time": 24, "looping": False, "time_down_event": {"event": "fynn:vergehen"}},
        },
        "events": {"fynn:vergehen": {"add": {"component_groups": ["fynn:vergehen"]}}}}}


# ============================================================ Bossleiste

BALKEN_1 = [(226, 252, 255), (150, 232, 252), (84, 196, 240), (48, 140, 210), (28, 84, 156)]
BALKEN_2 = [(255, 255, 255), (206, 248, 255), (140, 228, 255), (84, 180, 244), (44, 112, 204)]
# Fynns Rahmen in Knochenweiss und Seelenblau: das Gold wird zu hellem
# Elfenbein, die blaue Rinne der Klingen zu Tuerkis.
SEELENTAUSCH = {
    (237, 211, 131): (246, 250, 255), (204, 160, 75): (208, 218, 232), (193, 154, 83): (188, 200, 218),
    (143, 109, 51): (130, 144, 168), (240, 232, 189): (255, 255, 255), (69, 89, 184): (70, 200, 245),
    (37, 35, 62): (18, 36, 56), (24, 32, 86): (24, 64, 96), (148, 176, 243): (150, 240, 255),
}
SEELENFLAMME = [
    ".....asma.....",
    "...aajssjaa...",
    ".aaffjjjjjfaa.",
    "aafjnnnnnnjfaa",
    "afjnnnnWnnnjra",
    "fjnnnnWWnnnnjr",
    "fjnnnWWCnnnnjr",
    "fjnnnWCCWnnnjr",
    "fjnnWCCiCWnnjr",
    "fjnnWCiiiCWnjr",
    "fjnnWCiiiCWnjr",
    "fjjnnWCiCWnjjr",
    "afjgnWWWnngjra",
    "aagggnnnngggaa",
    ".aaggggggggaa.",
    "...aaggggaa...",
    ".....aaaa.....",
]
SEELENFLAMME_FARBEN = {"a": (19, 18, 23), "s": (214, 224, 238), "m": (246, 250, 255), "f": (246, 250, 255),
                       "j": (208, 218, 232), "r": (188, 200, 218), "g": (130, 144, 168), "n": (16, 32, 52),
                       "W": (60, 170, 232), "C": (150, 236, 255), "i": (255, 255, 255)}


def bossleiste():
    import bossbar_bauen as bb
    grund = bb.umgefaerbt(bb.rahmen(), SEELENTAUSCH)
    rahmen1 = bb.mit_medaillon(grund, SEELENFLAMME, SEELENFLAMME_FARBEN)
    rahmen2 = bb.mit_schein(rahmen1, (120, 230, 255))
    return {
        "kennung": NAME, "marke": "Aschvaru", "titel": ("Aschvaru", "Aschvaru · Phase 2"),
        "namensfarben": ([0.86, 0.97, 1.0], [0.55, 0.92, 1.0]),
        "teile": {"rahmen": rahmen1, "rahmen_entfesselt": rahmen2, "leer": bb.rinne(None, leer=True),
                  "voll": bb.rinne(BALKEN_1), "entfesselt": bb.rinne(BALKEN_2)},
    }


# ============================================================ Partikel

def partikel_bilder():
    """Weiche Formen aus Verlaeufen, keine Sprenkel: eine Seele (runder
    Lichtfleck), ein Zauberkreis mit Runen, eine Lichtsaeule."""
    seele = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    for y in range(8):
        for x in range(8):
            d = math.hypot(x - 3.5, y - 3.5) / 4.0
            if d < 1.0:
                f = H.verlauf([(255, 255, 255), (170, 240, 255), (80, 190, 245)], d, 3)
                seele.putpixel((x, y), tuple(f[:3]) + (255 if d < 0.75 else 150,))
    kreis = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    hell, mitte_f, dunkel = (230, 252, 255, 255), (120, 224, 255, 255), (60, 160, 230, 220)
    for y in range(32):
        for x in range(32):
            dx, dy = x - 15.5, y - 15.5
            r = math.hypot(dx, dy)
            w = math.degrees(math.atan2(dy, dx)) % 360
            if 14.0 <= r < 15.6:
                kreis.putpixel((x, y), hell)                      # aeusserer Ring
            elif 12.2 <= r < 13.0:
                kreis.putpixel((x, y), dunkel)                    # innerer Ring
            elif 13.0 <= r < 14.0 and (w % 45) < 14:
                kreis.putpixel((x, y), mitte_f)                   # Runen zwischen den Ringen
            elif 5.5 <= r < 6.4:
                kreis.putpixel((x, y), mitte_f)
    # Ein Stern aus zwei Dreiecken, die den inneren Ring beruehren.
    for drehung in (90, 270):
        ecken = [(15.5 + math.cos(math.radians(drehung + i * 120)) * 12.2,
                  15.5 + math.sin(math.radians(drehung + i * 120)) * 12.2) for i in range(3)]
        for i in range(3):
            (ax, ay), (bx, by) = ecken[i], ecken[(i + 1) % 3]
            for s_ in range(40):
                t = s_ / 39
                kreis.putpixel((int(ax + (bx - ax) * t), int(ay + (by - ay) * t)), hell)
    saeule = Image.new("RGBA", (8, 32), (0, 0, 0, 0))
    for y in range(32):
        for x in range(8):
            d = abs(x - 3.5) / 4.0
            oben = y / 31
            f = H.verlauf([(255, 255, 255), (160, 236, 255), (70, 180, 240)], d, 3)
            a = int(255 * min(1.0, oben * 1.6) * (1.0 if d < 0.6 else 0.6))
            if a > 8:
                saeule.putpixel((x, y), tuple(f[:3]) + (a,))
    return {"fynn_seele": seele, "fynn_seelenkreis": kreis, "fynn_seelensaeule": saeule,
            "fynn_seelengericht": gerichtskreis(), "fynn_schutzkreis": schutzkreis()}


def gerichtskreis():
    """Der grosse Kreis des Seelengerichts, 64 Pixel fuer 28 Bloecke:
    doppelter Aussenring, ein Band aus Runen, ein achtzackiger Stern aus
    zwei Quadraten, Speichen zur Mitte. Durchgehende Linien, keine Punkte."""
    b = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    hell, mitte_f, tief = (236, 252, 255, 255), (130, 226, 255, 255), (60, 160, 235, 230)
    for y in range(64):
        for x in range(64):
            dx, dy = x - 31.5, y - 31.5
            r = math.hypot(dx, dy)
            w = math.degrees(math.atan2(dy, dx)) % 360
            if 30.2 <= r < 31.6:
                b.putpixel((x, y), hell)
            elif 28.2 <= r < 29.2:
                b.putpixel((x, y), tief)
            elif 24.0 <= r < 27.4 and (w % 15) < 7:
                b.putpixel((x, y), mitte_f)                       # Runenband
            elif 22.6 <= r < 23.6:
                b.putpixel((x, y), tief)
            elif 8.4 <= r < 9.6:
                b.putpixel((x, y), hell)
            elif 9.6 <= r < 22.6 and min(w % 45, 45 - w % 45) * math.radians(1) * r < 0.6:
                b.putpixel((x, y), tief)                          # Speichen
    for drehung in (0, 45):
        ecken = [(31.5 + math.cos(math.radians(drehung + i * 90)) * 22.6,
                  31.5 + math.sin(math.radians(drehung + i * 90)) * 22.6) for i in range(4)]
        for i in range(4):
            (ax, ay), (bx, by) = ecken[i], ecken[(i + 1) % 4]
            for s_ in range(80):
                t = s_ / 79
                b.putpixel((int(ax + (bx - ax) * t), int(ay + (by - ay) * t)), hell)
    return b


def schutzkreis():
    """Ein Schutzlicht: warm statt kalt, damit man es im blauen Kreis sofort
    findet - ein heller Ring, innen ein sanfter Schein."""
    b = Image.new("RGBA", (32, 32), (0, 0, 0, 0))
    for y in range(32):
        for x in range(32):
            r = math.hypot(x - 15.5, y - 15.5)
            if 13.6 <= r < 15.6:
                b.putpixel((x, y), (255, 244, 196, 255))
            elif 8.0 <= r < 9.2:
                b.putpixel((x, y), (255, 214, 120, 240))
            elif r < 13.6:
                b.putpixel((x, y), (255, 226, 150, int(40 + 50 * (1 - r / 13.6))))
    return b


def alle_partikel():
    def p(name, textur, teile):
        return {"format_version": "1.10.0", "particle_effect": {
            "description": {"identifier": f"fynn:{name}", "basic_render_parameters": {
                "material": "particles_blend", "texture": f"textures/particle/{textur}"}},
            "components": teile}}
    aus = {"minecraft:particle_appearance_tinting": {"color": [1, 1, 1, "1 - v.particle_age / v.particle_lifetime"]}}
    seele_uv = {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}
    return {
        # Ein Ausbruch von Seelen nach allen Seiten.
        "seelenfunke": p("seelenfunke", "fynn_seele", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 14},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_sphere": {"radius": 0.6, "direction": "outwards"},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "0.6 + math.random(0, 0.5)"},
            "minecraft:particle_initial_speed": "math.random(1.5, 3.5)",
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 1.2, 0], "linear_drag_coefficient": 2.0},
            "minecraft:particle_appearance_billboard": {"size": ["0.16 - v.particle_age * 0.1", "0.16 - v.particle_age * 0.1"],
                                                        "facing_camera_mode": "rotate_xyz", "uv": seele_uv}}, **aus)),
        # Ein Stueck des Strahls: Das Skript setzt sie dicht an dicht.
        "seelenstrahl": p("seelenstrahl", "fynn_seele", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.25},
            "minecraft:particle_initial_speed": 0,
            "minecraft:particle_appearance_billboard": {"size": ["0.55 - v.particle_age", "0.55 - v.particle_age"],
                                                        "facing_camera_mode": "rotate_xyz", "uv": seele_uv}}, **aus)),
        # Der Zauberkreis am Boden: flach, er dreht sich.
        "seelenkreis": p("seelenkreis", "fynn_seelenkreis", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {"offset": [0, 0.08, 0]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.36},
            "minecraft:particle_initial_speed": 0,
            "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)",
                                                "rotation_rate": 60},
            "minecraft:particle_appearance_billboard": {"size": [1.7, 1.7], "facing_camera_mode": "emitter_transform_xz",
                "uv": {"texture_width": 32, "texture_height": 32, "uv": [0, 0], "uv_size": [32, 32]}}})),
        # Die Saeule, die aus dem Kreis bricht.
        "seelensaeule": p("seelensaeule", "fynn_seelensaeule", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {"offset": [0, 2.6, 0]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.6},
            "minecraft:particle_initial_speed": 0,
            "minecraft:particle_appearance_billboard": {
                "size": ["0.6 + v.particle_age * 0.6", "2.6 + v.particle_age * 1.5"], "facing_camera_mode": "lookat_y",
                "uv": {"texture_width": 8, "texture_height": 32, "uv": [0, 0], "uv_size": [8, 32]}}}, **aus)),
        # Eine Seelenkugel im Flug - eine je Tick, so entsteht eine Spur.
        "seelenkugel": p("seelenkugel", "fynn_seele", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.3},
            "minecraft:particle_initial_speed": 0,
            "minecraft:particle_appearance_billboard": {"size": ["0.42 - v.particle_age", "0.42 - v.particle_age"],
                                                        "facing_camera_mode": "rotate_xyz", "uv": seele_uv}}, **aus)),
        # Seelen, die langsam aufsteigen: Aura in Phase zwei, der Abschied.
        "seelenhauch": p("seelenhauch", "fynn_seele", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 4},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_sphere": {"radius": 0.8, "direction": "outwards"},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "1.2 + math.random(0, 0.8)"},
            "minecraft:particle_initial_speed": 0.3,
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 1.0, 0], "linear_drag_coefficient": 1.0},
            "minecraft:particle_appearance_billboard": {"size": [0.13, 0.13], "facing_camera_mode": "rotate_xyz",
                                                        "uv": seele_uv}}, **aus)),
        # Das Seelengericht: der grosse Kreis, 14 Bloecke Halbmesser, flach am
        # Boden. Das Skript setzt ihn alle paar Ticks neu, er dreht sich.
        "seelengericht": p("seelengericht", "fynn_seelengericht", {
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {"offset": [0, 0.1, 0]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.45},
            "minecraft:particle_initial_speed": 0,
            "minecraft:particle_initial_spin": {"rotation": "math.random(0, 360)", "rotation_rate": 12},
            "minecraft:particle_appearance_billboard": {"size": [14, 14], "facing_camera_mode": "emitter_transform_xz",
                "uv": {"texture_width": 64, "texture_height": 64, "uv": [0, 0], "uv_size": [64, 64]}}}),
        # Ein Schutzlicht: ein warmer Kreis am Boden ...
        "seelenschutz": p("seelenschutz", "fynn_schutzkreis", {
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {"offset": [0, 0.12, 0]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.45},
            "minecraft:particle_initial_speed": 0,
            "minecraft:particle_appearance_billboard": {"size": [1.8, 1.8], "facing_camera_mode": "emitter_transform_xz",
                "uv": {"texture_width": 32, "texture_height": 32, "uv": [0, 0], "uv_size": [32, 32]}}}),
        # ... und darueber eine goldene Lichtsaeule, damit man es von weitem sieht.
        "schutzlicht": p("schutzlicht", "fynn_seelensaeule", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {"offset": [0, 3.0, 0]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.6},
            "minecraft:particle_initial_speed": 0,
            "minecraft:particle_appearance_billboard": {"size": [0.45, 3.0], "facing_camera_mode": "lookat_y",
                "uv": {"texture_width": 8, "texture_height": 32, "uv": [0, 0], "uv_size": [8, 32]}},
            "minecraft:particle_appearance_tinting": {"color": [1.0, 0.88, 0.55, "0.9 - v.particle_age"]}})),
        # Der Sog: Seelen stroemen von aussen zu ihm.
        "seelensog": p("seelensog", "fynn_seele", dict({
            "minecraft:emitter_rate_instant": {"num_particles": 24},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_disc": {"radius": 9, "plane_normal": "y", "surface_only": True,
                                              "direction": "inwards", "offset": [0, 0.8, 0]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 0.9},
            "minecraft:particle_initial_speed": 9,
            "minecraft:particle_appearance_billboard": {"size": [0.16, 0.16], "facing_camera_mode": "rotate_xyz",
                                                        "uv": seele_uv}}, **aus)),
    }


# ============================================================ Gegenstaende

SEELENKLINGE = {
    "karte": [
        "...w...",
        "..wiw..",
        "..wiI..",
        "..wiI..",
        "..wiI..",
        "..wiI..",
        "..wiI..",
        "..wiI..",
        "..wiI..",
        ".CwiIC.",
        "CCcbcCC",
        "...L...",
        "...l...",
        "...L...",
        "...l...",
        "..CbC..",
    ],
    "farben": {"w": (244, 252, 255), "i": (160, 234, 255), "I": (84, 176, 232), "C": (206, 216, 230),
               "c": (150, 164, 186), "b": (90, 220, 255), "L": (46, 58, 92), "l": (32, 40, 66)},
    "tiefe": {"w": 1.0, "i": 1.5, "I": 1.5, "C": 2.5, "c": 2.5, "b": 3.0, "L": 2.0, "l": 2.0},
    "mitte": 3.5,
    "griff": "Ll",
}


def seelenklinge_bild():
    """Das Inventarbild: die Klinge schraeg von unten links nach oben rechts."""
    punkte = {(14, 1): "w", (13, 1): "w", (14, 2): "i"}
    for i in range(8):
        x, y = 13 - i, 2 + i
        punkte[(x, y)] = "i"
        punkte.setdefault((x + 1, y), "I")
        punkte.setdefault((x - 1, y), "w")
    for (x, y), z in (((6, 11), "C"), ((7, 10), "C"), ((5, 12), "C"), ((8, 9), "C"), ((4, 10), "C"),
                      ((3, 9), "C"), ((8, 12), "C"), ((9, 13), "C"), ((6, 10), "b")):
        punkte[(x, y)] = z
    for (x, y), z in (((5, 11), "c"), ((4, 12), "L"), ((3, 13), "l"), ((2, 14), "b")):
        punkte[(x, y)] = z
    karte = [["."] * 16 for _ in range(16)]
    for (x, y), z in punkte.items():
        karte[y][x] = z
    import roland_beute_bauen as rbb
    return rbb.male(rbb.umrande(["".join(z) for z in karte]), dict(SEELENKLINGE["farben"], k=rbb.UMRISS))


SEELENKRISTALL = [
    "................",
    ".......kk.......",
    "......kwik......",
    ".....kwiiIk.....",
    ".....kwiiIk.....",
    "....kwiiiiIk....",
    "....kwiiiiIk....",
    "...kwiiWiiiIk...",
    "...kwiWWWiiIk...",
    "...kwiiWiiIIk...",
    "....kwiiiiIk....",
    "....kwiiiIIk....",
    ".....kwiiIk.....",
    "......kiIk......",
    ".......kk.......",
    "................",
]
SEELENRUF = [
    "................",
    "......kkkk......",
    ".....kggggk.....",
    "......kggk......",
    ".....kkkkkk.....",
    "....kgiiiigk....",
    "...kgiwWWiigk...",
    "...kgiWWWWigk...",
    "...kgiWWWWigk...",
    "...kgiiWWiigk...",
    "....kgiiiigk....",
    ".....kkkkkk.....",
    "......kggk......",
    ".......kk.......",
    "................",
    "................",
]


def gegenstaende():
    import waffe_bauen as w
    import roland_beute_bauen as rbb
    from neue_waffen_bauen import halten, waffen_attachable, gegenstand, rezept
    v = SEELENKLINGE
    w.aus_zeichenkarte("seelenklinge", v["karte"], {k: f + (255,) for k, f in v["farben"].items()},
                       dicke=lambda zeile, spalte, zeichen: v["tiefe"][zeichen], mitte=v["mitte"],
                       ziel_modell=str(RES / "models" / "entity" / "seelenklinge.geo.json"),
                       ziel_textur=str(RES / "textures" / "entity" / "seelenklinge_haut.png"))
    bk.schreibe(RES / "attachables" / "seelenklinge.json", waffen_attachable("seelenklinge"))
    bk.schreibe(RES / "animations" / "seelenklinge.animation.json", {"format_version": "1.10.0", "animations": {
        "animation.seelenklinge.halten": halten(v["karte"], v["griff"])}})
    bk.schreibe(VER / "items" / "seelenklinge.json", gegenstand("seelenklinge", {
        "minecraft:hand_equipped": True, "minecraft:damage": 10, "minecraft:rarity": "epic",
        "minecraft:durability": {"max_durability": 1800},
        "minecraft:enchantable": {"value": 18, "slot": "sword"},
        "minecraft:repairable": {"repair_items": [{"items": ["fynn:seelenkristall"], "repair_amount": 600}]},
        "minecraft:use_modifiers": {"use_duration": 0.1},
        "minecraft:cooldown": {"category": "fynn:seelenklinge", "duration": 8.0},
    }))
    bk.schreibe(VER / "items" / "seelenkristall.json", gegenstand("seelenkristall", {
        "minecraft:rarity": "epic", "minecraft:use_modifiers": {"use_duration": 0.1},
    }, gruppe="fynn:itemGroup.name.jagd", stapel=16))
    bk.schreibe(VER / "items" / "seelenruf.json", gegenstand("seelenruf", {
        "minecraft:rarity": "rare", "minecraft:use_modifiers": {"use_duration": 0.1},
    }, gruppe="fynn:itemGroup.name.jagd", stapel=16))
    # Der Seelenruf: eine Seelenlaterne, eingefasst mit Ghast-Traenen und
    # Diamanten.
    bk.schreibe(VER / "recipes" / "seelenruf.json", rezept(
        "seelenruf", [" g ", "dLd", " g "],
        {"L": "minecraft:soul_lantern", "g": "minecraft:ghast_tear", "d": "minecraft:diamond"}))
    f_kristall = {"k": rbb.UMRISS, "w": (246, 254, 255), "i": (150, 232, 255), "I": (70, 170, 232),
                  "W": (255, 255, 255)}
    f_ruf = {"k": rbb.UMRISS, "g": (120, 132, 156), "i": (90, 200, 250), "w": (255, 255, 255),
             "W": (170, 240, 255)}
    return {"seelenklinge": seelenklinge_bild(), "seelenkristall": rbb.male(SEELENKRISTALL, f_kristall),
            "seelenruf": rbb.male(SEELENRUF, f_ruf)}


# ============================================================ Verhalten

GRUNDLEBEN = 320
GRUNDSCHADEN = 12
BEUTE = [
    ("fynn:erfahrungsgefaess", 1, 1, 1.0),
    ("fynn:seelenklinge", 1, 1, 1.0),
    ("fynn:seelenkristall", 2, 3, 1.0),
    ("minecraft:diamond", 4, 7, 1.0),
    ("minecraft:echo_shard", 2, 4, 1.0),
    ("minecraft:soul_lantern", 2, 4, 1.0),
    ("minecraft:emerald", 3, 6, 1.0),
    ("minecraft:experience_bottle", 6, 10, 1.0),
]
ANTEIL = [
    ("fynn:erfahrungsgefaess", 1, 1, 1.0),
    ("fynn:seelenkristall", 1, 1, 1.0),
    ("minecraft:diamond", 1, 3, 1.0),
    ("minecraft:echo_shard", 1, 2, 1.0),
    ("minecraft:experience_bottle", 2, 4, 1.0),
]


def verhalten():
    return bk.verhalten(TYP, ["seelendrache", "monster", "mob"], GRUNDLEBEN, GRUNDSCHADEN, (4.0, 4.4), {
        "minecraft:movement": {"value": 0.22},
        "minecraft:movement.basic": {},
        "minecraft:navigation.walk": {"can_path_over_water": True, "avoid_water": True},
        "minecraft:jump.static": {},
        "minecraft:variable_max_auto_step": {"base_value": 1.5, "jump_prevented_value": 1.5},
        "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
        "minecraft:knockback_resistance": {"value": 1.0},
        "minecraft:breathable": {"breathes_water": True},
        "minecraft:damage_sensor": {"triggers": [{"cause": "fall", "deals_damage": "no"},
                                                 {"cause": "wither", "deals_damage": "no"}]},
        "minecraft:experience_reward": {"on_death": "query.last_hit_by_player ? 160 : 0"},
        "minecraft:loot": {"table": f"loot_tables/entities/{NAME}.json"},
        "minecraft:behavior.look_at_player": {"priority": 6, "look_distance": 16.0, "probability": 0.05},
        "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 0.6},
    }, nahkampf={"minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.2, "track_target": True}},
        phase_zwei={"minecraft:movement": {"value": 0.26}}, anzahl_angriffe=len(ANGRIFFE))


NAMEN = [
    ("entity.fynn:seelendrache.name", "Aschvaru", "Aschvaru"),
    ("item.spawn_egg.entity.fynn:seelendrache.name", "Aschvaru, der Seelendrache", "Aschvaru the Soul Dragon"),
    ("entity.fynn:seelenabbild.name", "Seelenabbild", "Soul Image"),
    ("item.fynn:seelenklinge", "Seelenklinge", "Soul Blade"),
    ("item.fynn:seelenklinge.name", "Seelenklinge", "Soul Blade"),
    ("item.fynn:seelenkristall", "Seelenkristall", "Soul Crystal"),
    ("item.fynn:seelenkristall.name", "Seelenkristall", "Soul Crystal"),
    ("item.fynn:seelenruf", "Seelenruf", "Soul Call"),
    ("item.fynn:seelenruf.name", "Seelenruf", "Soul Call"),
]


def main():
    m, geo, h1, h2 = bauen()
    bk.schreibe(RES / "models" / "entity" / f"{NAME}.geo.json", geo)
    h1.save(RES / "textures" / "entity" / f"{NAME}.png")
    h2.save(RES / "textures" / "entity" / f"{NAME}_entfesselt.png")
    abbild_haut(h2).save(RES / "textures" / "entity" / "seelenabbild.png")
    anims = alle_animationen()
    bk.schreibe(RES / "animations" / f"{NAME}.animation.json", {"format_version": "1.10.0", "animations": anims})
    kurz = {nr: name for name, (nr, _, _) in ANGRIFFE.items()}
    bk.schreibe(RES / "animation_controllers" / f"{NAME}.animation_controllers.json", bk.steuerung(
        NAME, kurz, ["haltung", {"gang": "math.clamp(query.modified_move_speed * 2.5, 0.0, 1.0)"}],
        zusatz={"wechsel": ["beben"], "seelengericht": ["zittern"]}, hiebe=[h for h, _ in HIEBE]))
    bk.schreibe(RES / "entity" / f"{NAME}.entity.json", bk.aussehen(
        TYP, NAME, anims, PRAEFIX, GROESSE, {"base_color": "#eef3fa", "overlay_color": "#7cf2ff"},
        skripte={"animate": ["kampf", "lider", {"ring_aus": "query.property('fynn:phase') == 1"},
                             {"ring_an": "query.property('fynn:phase') == 2"}]}))
    bk.schreibe(RES / "render_controllers" / f"{NAME}.render_controllers.json", bk.steuerplan(NAME))
    bk.schreibe(RES / "animations" / "seelenabbild.animation.json", {"format_version": "1.10.0",
                                                                    "animations": abbild_animationen()})
    bk.schreibe(RES / "entity" / "seelenabbild.entity.json", abbild_aussehen())
    bk.schreibe(VER / "entities" / "seelenabbild.json", abbild_verhalten())
    bk.schreibe(VER / "entities" / f"{NAME}.json", verhalten())
    bk.schreibe(VER / "loot_tables" / "entities" / f"{NAME}.json", bk.beutetabelle(BEUTE))
    for name, daten in alle_partikel().items():
        bk.schreibe(RES / "particles" / f"{NAME}_{name}.particle.json", daten)
    for name, bild in partikel_bilder().items():
        bild.save(RES / "textures" / "particle" / f"{name}.png")
    zeiten = {name: (nr, bau()["animation_length"], z) for name, (nr, bau, z) in ANGRIFFE.items()}
    vor, hoch = maul_ort(geo, seelenstrahl(), ANGRIFFE["seelenstrahl"][2]["von"] + 1.1)
    svor, shoch = maul_ort(geo, seelensturm(), 2.0)
    (VER / "scripts" / f"{NAME}_daten.js").write_text(
        bk.skriptdaten(zeiten, "seelendrache_bauen.py")
        + bk.werte_js("seelendrache_bauen.py", GRUNDLEBEN, 6, 30, BEUTE, ANTEIL).split("\n", 1)[1]
        + "// Wo das Maul steht (Bloecke vor und ueber den Fuessen): beim Strahl und im Flug.\n"
        + f"export const MAUL = {{ vor: {vor}, hoch: {hoch} }};\n"
        + f"export const MAUL_FLUG = {{ vor: {svor}, hoch: {shoch} }};\n",
        encoding="utf-8")
    bk.item_bilder(gegenstaende())
    bk.sprache("Aschvaru, der Seelendrache", NAMEN)
    print("gebaut: Aschvaru, der Seelendrache")
    if "--bilder" in sys.argv:
        vorschau(Path(sys.argv[sys.argv.index("--bilder") + 1]), geo, h1, h2)


def vorschau(ordner, geo, h1, h2):
    from PIL import ImageDraw
    hintergrund = (52, 60, 84, 255)
    zellen = []
    for haut, titel, ring in ((h1, "Phase 1", ring_aus()), (h2, "Phase 2 - der Seelenring erwacht", ring_an())):
        for gier in (35, 150):
            b = tm.ansehen(geo, haut, [(haltung(), 1.0), (lider(), 1.0), (ring, 1.0)], {"q.life_time": 1.0},
                           gier=gier, neigung=10, breite=420, hoehe=380, zoom=2.9, mitte=(0, 34, -8),
                           hintergrund=hintergrund)
            zellen.append((b, f"{titel}, {'vorn' if gier < 90 else 'hinten'}"))
    gesamt = Image.new("RGBA", (4 * 420, 400), hintergrund)
    zeichner = ImageDraw.Draw(gesamt)
    for i, (b, text) in enumerate(zellen):
        gesamt.paste(b, (i * 420, 0))
        zeichner.text((i * 420 + 10, 382), text, fill=(230, 240, 255, 255))
    ordner.mkdir(parents=True, exist_ok=True)
    gesamt.save(ordner / f"{NAME}.png")
    print("gezeichnet:", ordner / f"{NAME}.png")


if __name__ == "__main__":
    main()
