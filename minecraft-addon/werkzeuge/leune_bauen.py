#!/usr/bin/env python3
"""Die Leunen - Fynns Wunsch nach den Lynels aus Zelda: Breath of the Wild.

Fynn: "Ich wuerde gerne einen neuen Mob erstellen. Und zwar den Leunen aus
Zelda BOTW. Der soll auch seine Waffen droppen und alle
Angriffsanimationen ... sehr nah an den Leunen rankommen ... Bossbar ...
mit dem Bogen diese drei Pfeile ... verschiedene Farben bzw. Arten ... bis
zum goldenen Leun. Den moechte ich auch haben als Endboss quasi ...
Leunen ... haben unterschiedliche Waffen und sehen dann ein bisschen
unterschiedlich aus wie nach Waffe."

Ein Leune ist halb Pferd, halb Loewe: ein Pferdeleib auf vier Beinen mit
Hufen und Fellbueschen an den Fesseln, darueber ein muskuloeser
Oberkoerper mit Armen, ein Loewenkopf mit Maehne und zwei langen,
geschwungenen Hoernern, ein Loewenschwanz mit Quaste. Fuenf Arten, eine
staerker als die andere (wie im Spiel): Rotmaehnen-, Blaumaehnen-,
Weissmaehnen-Leune, Silberleune - und die Goldleune als Endboss. Jeder
traegt eine von drei Ausruestungen (Schwert, Keule oder Speer, immer mit
Schild) und auf dem Ruecken den Bogen, der drei Pfeile auf einmal
verschiesst.

Alle Arten teilen ein Modell und eine Bewegung; was sie unterscheidet,
ist die Haut - und die Waffen, die in ihr mit gemalt sind (gewoehnlich,
maechtig, wild, golden). Gefuehrt werden sie wie die anderen Bosse
(boss_kern).

    python3 werkzeuge/leune_bauen.py [--bilder vorschau]
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

RES = bk.RES
VER = bk.VER
NAME = "leune"
PRAEFIX = "animation.fynn.leune."


def glut(farbe, hell=0.0):
    """Leuchtend (Alpha 254, Material entity_emissive_alpha)."""
    f = hexfarbe(farbe) if isinstance(farbe, str) else tuple(farbe[:3])
    f = tuple(max(0, min(255, int(c * (1 + hell)))) for c in f)
    return f + (254,)


# ============================================================ Gestalt

# Fynn: "Nicht so kantig, mehr Dynamik ... mehr Detail, achte auf die
# Formen." Darum besteht der Leune nicht aus grossen Kisten, sondern aus
# Kurven: Hoerner, Maehnenstacheln, Schwanz und Bogenarme sind Ketten aus
# kurzen Staeben, die einer Bahn folgen und zur Spitze duenner werden;
# Klingen sind aus vielen schmalen, gedrehten Schnitten zusammengesetzt
# (wie der runde Kupferring), und Leib, Brust und Glieder haben einen
# achteckigen Querschnitt statt eines viereckigen.
#
# Drehungen wie in Bedrock (nachgerechnet mit modell_ansehen.drehe): Ein
# Stab, der entlang +z gebaut ist, zeigt nach Drehung [a, b, 0] in die
# Richtung (cos a sin b, sin a, cos a cos b).


def stab(k, a, b, breite, stoff, tiefe=None, ueber=0.6):
    """Ein Kasten von Punkt a nach Punkt b. breite: quer (lokal x), tiefe:
    quer (lokal y); ueber: wie weit er an beiden Enden uebersteht, damit in
    einer Kette keine Fugen klaffen."""
    tiefe = breite if tiefe is None else tiefe
    d = [b[i] - a[i] for i in range(3)]
    lang = math.sqrt(sum(v * v for v in d)) or 0.01
    c = [(a[i] + b[i]) / 2 for i in range(3)]
    neig = math.degrees(math.atan2(d[1], math.hypot(d[0], d[2])))
    gier = math.degrees(math.atan2(d[0], d[2]))
    L = max(1, int(math.ceil(lang + ueber)))
    return k.kasten([c[0] - breite / 2, c[1] - tiefe / 2, c[2] - L / 2], [breite, tiefe, L], stoff,
                    drehung=[round(neig, 2), round(gier, 2), 0], drehpunkt=[round(v, 3) for v in c])


def kette(k, punkte, dicken, stoffe, tiefen=None):
    """Staebe durch eine Folge von Punkten; dicken/stoffe je Glied (oder einer
    fuer alle)."""
    for i in range(len(punkte) - 1):
        dk = dicken[i] if isinstance(dicken, (list, tuple)) else dicken
        st = stoffe[i] if isinstance(stoffe, (list, tuple)) else stoffe
        tf = None if tiefen is None else (tiefen[i] if isinstance(tiefen, (list, tuple)) else tiefen)
        stab(k, punkte[i], punkte[i + 1], dk, st, tf)


def bahn(stuetzen, schritte):
    """Eine weiche Kurve (Catmull-Rom) durch Stuetzpunkte - so biegt sich ein
    Horn gleichmaessig statt in Knicken."""
    p = [stuetzen[0]] + list(stuetzen) + [stuetzen[-1]]
    aus = []
    for i in range(1, len(p) - 2):
        p0, p1, p2, p3 = p[i - 1], p[i], p[i + 1], p[i + 2]
        for j in range(schritte):
            t = j / schritte
            aus.append(tuple(0.5 * ((2 * p1[a]) + (-p0[a] + p2[a]) * t + (2 * p0[a] - 5 * p1[a] + 4 * p2[a] - p3[a]) * t * t
                                    + (-p0[a] + 3 * p1[a] - 3 * p2[a] + p3[a]) * t ** 3) for a in range(3)))
    aus.append(tuple(stuetzen[-1]))
    return aus


def schnitt(k, x0, innen, aussen, stoff, breite=2, dicke=1):
    """Ein schmaler Streifen in der y-z-Ebene von innen nach aussen (je ein
    Punkt (y, z)) - der Baustein fuer Klingen und Halbmonde."""
    vy, vz = aussen[0] - innen[0], aussen[1] - innen[1]
    lang = math.hypot(vy, vz)
    if lang < 0.3:
        return
    a = math.degrees(math.atan2(-vz, vy))
    cy, cz = (innen[0] + aussen[0]) / 2, (innen[1] + aussen[1]) / 2
    L = max(1, int(math.ceil(lang)))
    k.kasten([x0 - dicke / 2, cy - L / 2, cz - breite / 2], [dicke, L, breite], stoff,
             drehung=[round(a, 2), 0, 0], drehpunkt=[x0, round(cy, 3), round(cz, 3)])


def ring(k, mitte, r, stoff, segmente=16, dicke=2, breite=2):
    """Ein runder Ring in der y-z-Ebene aus vielen kurzen, gedrehten Gliedern."""
    x0, cy, cz = mitte
    lang = int(math.ceil(2 * math.pi * r / segmente + 0.8))
    for i in range(segmente):
        w = 360.0 * i / segmente
        k.kasten([x0 - dicke / 2, cy + r - breite / 2, cz - lang / 2], [dicke, breite, lang], stoff,
                 drehung=[w, 0, 0], drehpunkt=[x0, cy, cz])


def halbmond(k, x0, mitte, richtung, gross=1.0, stoff="schildklinge", spanne=78, schritt=6):
    """Eine Halbmondklinge in der y-z-Ebene: zwischen einem aeusseren Kreis
    (die gewoelbte Schneide) und einem inneren, zum Schaft hin versetzten
    Kreis (die Hoehlung). Aus strahlenfoermigen Schnitten - die Spitzen
    entstehen von selbst dort, wo sich die Kreise treffen. Die aeussersten
    anderthalb Pixel sind die helle Schneide."""
    my, mz = mitte
    uy, uz = richtung
    Ro, Ri = 9.0 * gross, 9.5 * gross
    co = (my - uy * 2 * gross, mz - uz * 2 * gross)
    ci = (my - uy * 9.5 * gross, mz - uz * 9.5 * gross)
    w0 = math.degrees(math.atan2(uz, uy))
    w = -spanne
    while w <= spanne + 0.01:
        ww = math.radians(w0 + w)
        vy, vz = math.cos(ww), math.sin(ww)
        # Wo der Strahl den inneren Kreis verlaesst.
        dy, dz = co[0] - ci[0], co[1] - ci[1]
        b = 2 * (vy * dy + vz * dz)
        c = dy * dy + dz * dz - Ri * Ri
        disk = b * b - 4 * c
        t0 = (-b + math.sqrt(disk)) / 2 if disk > 0 else 0.0
        t0 = max(0.0, t0)
        if t0 < Ro - 1.0:
            innen = (co[0] + vy * t0, co[1] + vz * t0)
            kante = (co[0] + vy * (Ro - 1.6), co[1] + vz * (Ro - 1.6))
            aussen = (co[0] + vy * Ro, co[1] + vz * Ro)
            if Ro - 1.6 > t0:
                schnitt(k, x0, innen, kante, stoff)
            schnitt(k, x0, kante, aussen, "schneide")
        w += schritt


def gestalt():
    """Gebaut nach Fynns Bildern des Leunen aus Breath of the Wild. Masse in
    Pixeln, das Spiel vergroessert je Art (GROESSE)."""
    m = Modell(NAME, sichtbreite=5.0, sichthoehe=6.0)
    m.knoch("wurzel", [0, 0, 0])

    # ---- der Pferdeleib: achteckig im Querschnitt, vorn eine tiefe Brust,
    # hinten eine runde, hohe Kruppe, die Flanken gewoelbt.
    leib = m.knoch("leib", [0, 31, 2], "wurzel")
    leib.kasten([-8, 25, -14], [16, 12, 36], "fell")
    leib.kasten([-6.5, 23, -14], [13, 16, 36], "fell")
    leib.kasten([-7, 22, -16.5], [14, 12, 4], "fell", aufblasen=0.2)          # Pferdebrust
    leib.kasten([-5.5, 20.5, -17.5], [11, 9, 3], "fell", aufblasen=0.2)
    leib.kasten([-6, 23, -12], [12, 1, 30], "bauch")                         # Bauch
    # Der Bauch haengt in der Mitte ein wenig durch - die Linie wird weich.
    leib.kasten([-6, 21.5, -7], [12, 2, 18], "bauch", aufblasen=0.2)
    leib.kasten([-4.5, 20.5, -3], [9, 1, 10], "bauch", aufblasen=0.2)
    leib.kasten([-8.5, 27, 13], [17, 11, 9], "fell", aufblasen=0.2)           # Kruppe
    leib.kasten([-7, 37, 12], [14, 3, 10], "fell", aufblasen=0.2)
    leib.kasten([-6, 38, -12], [12, 2, 25], "fell")                          # Rueckenlinie
    for x in (1, -1):
        # Schultermuskel und Oberschenkelmuskel als Woelbung auf der Flanke.
        leib.kasten([7.5 if x > 0 else -9.5, 25, -15], [2, 11, 8], "fell", aufblasen=0.25)
        leib.kasten([7.5 if x > 0 else -9.5, 24, 13], [2, 13, 9], "fell", aufblasen=0.3)
    for seite, x in (("l", 1), ("r", -1)):
        # Vorderbein: kraeftiger Unterarm, schlanke, bandagierte Roehre,
        # Fessel mit Haarbusch, Huf mit Kronrand.
        bx, bz = x * 5, -10
        o = m.knoch(f"bein_v{seite}", [bx, 27, bz], "leib")
        o.kasten([bx - 3.5, 15, bz - 3], [7, 13, 6], "fell", aufblasen=0.2)
        o.kasten([bx - 3, 16, bz - 3.5], [6, 11, 7], "fell", aufblasen=0.2)
        u = m.knoch(f"unterbein_v{seite}", [bx, 15, bz], f"bein_v{seite}")
        u.kasten([bx - 2.5, 10, bz - 2.5], [5, 6, 5], "binde")
        u.kasten([bx - 2, 5, bz - 2], [4, 6, 4], "binde", aufblasen=0.25)
        f = m.knoch(f"huf_v{seite}", [bx, 5, bz], f"unterbein_v{seite}")
        f.kasten([bx - 3.5, 3, bz - 3.5], [7, 3, 7], "fessel", aufblasen=0.3)
        f.kasten([bx - 3, 0, bz - 4], [6, 3, 7], "huf")
        f.kasten([bx - 2.5, 2.5, bz - 3.5], [5, 1, 6], "huf", aufblasen=0.2)
        # Hinterbein: maechtiger Schenkel, Sprunggelenk, schlanke Roehre.
        hx, hz = x * 5, 17
        o = m.knoch(f"bein_h{seite}", [hx, 31, hz], "leib")
        o.kasten([hx - 4, 17, hz - 5], [8, 15, 10], "fell", aufblasen=0.2)
        o.kasten([hx - 3.5, 15, hz - 3], [7, 6, 8], "fell", aufblasen=0.2)
        u = m.knoch(f"unterbein_h{seite}", [hx, 17, hz + 2], f"bein_h{seite}")
        u.kasten([hx - 2.5, 11, hz - 0.5], [5, 7, 5], "binde")
        u.kasten([hx - 2, 5, hz], [4, 7, 4], "binde", aufblasen=0.25)
        f = m.knoch(f"huf_h{seite}", [hx, 5, hz + 2], f"unterbein_h{seite}")
        f.kasten([hx - 3.5, 3, hz - 1.5], [7, 3, 7], "fessel", aufblasen=0.3)
        f.kasten([hx - 3, 0, hz - 2], [6, 3, 7], "huf")
        f.kasten([hx - 2.5, 2.5, hz - 1.5], [5, 1, 6], "huf", aufblasen=0.2)

    # ---- der Loewenschwanz: eine geschwungene Kette, die Quaste am Ende
    punkte = bahn([(0, 37, 22), (0, 33, 27), (0, 27, 30), (0, 21, 31), (0, 16, 29.5)], 2)
    s1 = m.knoch("schwanz1", [0, 37, 22], "leib")
    kette(s1, punkte[:4], [3, 3, 2], "fell")
    s2 = m.knoch("schwanz2", list(punkte[3]), "schwanz1")
    kette(s2, punkte[3:7], [2, 2, 2], "fell")
    s3 = m.knoch("schwanz3", list(punkte[6]), "schwanz2")
    kette(s3, punkte[6:], 2, "fell")
    ende = punkte[-1]
    for dx, dz, lang in ((0, 0, 7), (1.2, 1, 6), (-1.2, 1, 6), (0, -1.2, 5)):
        stab(s3, (ende[0], ende[1] + 1, ende[2]), (ende[0] + dx * 2, ende[1] - lang, ende[2] + dz * 2), 3,
             "maehne_spitze" if lang < 7 else "maehne")

    # ---- der Oberkoerper: schmale Taille, breite Brust, V-Form
    ober = m.knoch("oberkoerper", [0, 36, -9], "leib")
    ober.kasten([-6, 35, -14], [12, 7, 9], "haut")
    ober.kasten([-5, 35, -14.5], [10, 7, 10], "haut")
    ober.kasten([-5.5, 41, -14.5], [11, 6, 8], "bauchmuskel")
    ober.kasten([-4.5, 41, -15], [9, 6, 9], "bauchmuskel")
    for x in (1, -1):
        # Die schraegen Bauchmuskeln zur Huefte.
        ober.kasten([4.5 if x > 0 else -6.5, 37, -13], [2, 8, 6], "haut", drehung=[0, 0, -x * 12],
                    drehpunkt=[5.5 * x, 41, -10])
    schurz = m.knoch("schurz", [0, 36, -15], "oberkoerper")
    schurz.kasten([-6.5, 35, -14.5], [13, 2, 10], "guertel", aufblasen=0.2)
    for i, (y, z, b) in enumerate(((32, -15.8, 9), (28, -18.2, 8), (24, -18.8, 7), (20, -18.4, 6))):
        schurz.kasten([-b / 2, y, z], [b, 4, 1], "schurz", drehung=[-4 - i * 3, 0, 0],
                      drehpunkt=[0, y + 4, z])
    brust = m.knoch("brust", [0, 46, -9], "oberkoerper")
    brust.kasten([-8, 46, -15], [16, 10, 11], "brustkorb")
    brust.kasten([-7, 45, -16], [14, 12, 13], "brustkorb")
    brust.kasten([-9.5, 50, -13.5], [19, 6, 9], "brustkorb", aufblasen=0.2)  # breiter Ruecken
    for x in (1, -1):
        # Zwei Brustmuskeln, leicht nach aussen gedreht; Schultern als Kuppeln.
        brust.kasten([0.3 if x > 0 else -7.3, 49, -16.6], [7, 6, 2], "brustmuskel", aufblasen=0.15,
                     drehung=[0, x * 10, 0], drehpunkt=[x * 3.5, 52, -16])
        brust.kasten([8 if x > 0 else -12, 50, -14], [4, 6, 8], "schulter", aufblasen=0.35)
        brust.kasten([8.5 if x > 0 else -11.5, 53, -13], [3, 3, 6], "schulter", aufblasen=0.3)
        # Der Kappenmuskel steigt schraeg vom Nacken zur Schulter.
        brust.kasten([1 if x > 0 else -9, 55, -13], [8, 3, 6], "haut", drehung=[0, 0, -x * 18],
                     drehpunkt=[x * 1, 56, -10])
    rm = m.knoch("maehne", [0, 58, -6], "brust")
    rm.kasten([-7, 43, -5], [14, 15, 5], "maehne", aufblasen=0.2)
    for i, x in enumerate((-6, -3, 0, 3, 6)):
        # Lange Straehnen, die den Ruecken hinab wehen.
        stab(rm, (x, 56, -4), (x * 1.2, 40 - (i % 2) * 3, -1), 3, "maehne")
        stab(rm, (x * 1.2, 41 - (i % 2) * 3, -1), (x * 1.3, 36 - (i % 2) * 3, 0.5), 2, "maehne_spitze")

    # ---- Hals und Kopf
    hals = m.knoch("hals", [0, 56, -10], "brust")
    hals.kasten([-3, 55, -13], [6, 5, 6], "haut")
    kopf = m.knoch("kopf", [0, 60, -11], "hals")
    kopf.kasten([-5, 59, -16], [10, 9, 9], "kopf")
    kopf.kasten([-4, 58, -15], [8, 11, 7], "kopf")
    for x in (1, -1):
        kopf.kasten([3.5 if x > 0 else -5.5, 59, -16.5], [2, 4, 4], "kopf", aufblasen=0.2)   # Wangen
    kopf.kasten([-3.5, 59, -20], [7, 4, 4], "schnauze")
    kopf.kasten([-2.5, 58.5, -20.5], [5, 5, 3], "schnauze")
    kopf.kasten([-2, 61.5, -21.2], [4, 2, 2], "nase")
    kopf.kasten([-3, 63, -18], [6, 1, 2], "schnauze")
    kopf.kasten([-5, 66, -17], [10, 2, 2], "braue")
    kopf.kasten([-4, 67, -16.5], [8, 1, 2], "braue")
    for x in (1, -1):
        kopf.kasten([2 if x > 0 else -3, 57.5, -20], [1, 2, 1], "zahn")
        kopf.kasten([5 if x > 0 else -6, 65, -11], [1, 3, 2], "ohr")
    kiefer = m.knoch("kiefer", [0, 60, -14], "kopf")
    kiefer.kasten([-3, 57, -19.5], [6, 2, 6], "kiefer")
    for x in (1, -1):
        kiefer.kasten([1.5 if x > 0 else -2.5, 59, -19.3], [1, 1, 1], "zahn")

    # Die Maehne: viele spitz zulaufende Straehnen, die wild nach oben und
    # hinten stehen, um das Gesicht ein voller Kragen, darunter der Bart.
    km = m.knoch("maehne_kopf", [0, 62, -9], "kopf")
    km.kasten([-6, 64, -15], [12, 4, 8], "maehne", aufblasen=0.2)
    for x in (1, -1):
        km.kasten([5 if x > 0 else -8, 56, -16], [3, 11, 10], "maehne", aufblasen=0.25)
    km.kasten([-6, 54, -8], [12, 13, 4], "maehne", aufblasen=0.2)
    stacheln = [
        # (Ansatz, Richtung, Laenge)
        ((0, 67, -14), (0, 1.0, 0.25), 9), ((-3, 67, -13), (-0.35, 1.0, 0.3), 8), ((3, 67, -13), (0.35, 1.0, 0.3), 8),
        ((-5.5, 66, -11), (-0.8, 0.9, 0.5), 7), ((5.5, 66, -11), (0.8, 0.9, 0.5), 7),
        ((-1.5, 67, -10), (-0.2, 0.8, 0.9), 10), ((1.5, 67, -10), (0.2, 0.8, 0.9), 10),
        ((-4.5, 65, -8), (-0.6, 0.6, 1.0), 9), ((4.5, 65, -8), (0.6, 0.6, 1.0), 9),
        ((0, 64, -7), (0, 0.4, 1.0), 9), ((-7, 61, -12), (-1.0, 0.3, 0.4), 6), ((7, 61, -12), (1.0, 0.3, 0.4), 6),
        ((-6.5, 58, -9), (-0.9, -0.1, 0.8), 6), ((6.5, 58, -9), (0.9, -0.1, 0.8), 6),
    ]
    for (sx_, sy_, sz_), (dx, dy, dz), lang in stacheln:
        n_ = math.sqrt(dx * dx + dy * dy + dz * dz)
        dx, dy, dz = dx / n_, dy / n_, dz / n_
        # Jeder Stachel biegt sich zur Spitze ein wenig nach hinten.
        p0 = (sx_, sy_, sz_)
        p1 = (sx_ + dx * lang * 0.55, sy_ + dy * lang * 0.55, sz_ + dz * lang * 0.55 + 0.8)
        p2 = (sx_ + dx * lang, sy_ + dy * lang - 0.5, sz_ + dz * lang + 2.2)
        stab(km, p0, p1, 3, "maehne")
        stab(km, p1, p2, 2, "maehne_spitze")
    # Der Bart: breit unter dem Kinn, faellt bis auf die Brust, mit Quaste.
    kette(km, [(0, 57.5, -19.5), (0, 52, -20.2), (0, 47.5, -19.6), (0, 44.5, -19)], [7, 5, 3], "maehne",
          tiefen=[4, 3, 3])
    stab(km, (0, 45, -19), (0, 41.5, -18.8), 3, "maehne_spitze")
    for x in (1, -1):
        stab(km, (x * 3, 57, -19), (x * 4, 51, -18.5), 2, "maehne_spitze")

    # Die Hoerner: kraeftig und hell wie bei einem Stier - aus dem Schaedel
    # nach aussen und oben, dann nach vorn, die Spitze nach unten; quer
    # gerippt, zur Spitze schmaler.
    for seite, x in (("l", 1), ("r", -1)):
        h = m.knoch(f"horn_{seite}", [x * 5, 66, -12], "kopf")
        weg = bahn([(x * 4.5, 65.5, -12), (x * 8, 67.5, -12.5), (x * 11, 69.5, -14), (x * 12.5, 69, -17),
                    (x * 12, 67, -19.5), (x * 10.8, 64.5, -20.5)], 2)
        n_ = len(weg) - 1
        for i in range(n_):
            dicke = 4 if i < 2 else (3 if i < 5 else (2 if i < 8 else 1))
            stoff = "hornspitze" if i >= n_ - 3 else ("hornring" if i % 2 else "horn")
            stab(h, weg[i], weg[i + 1], dicke, stoff, ueber=0.8)

    # ---- die Arme: Oberarm mit Bizeps, kraeftiger Unterarm, Lederwickel am
    # Handgelenk, eine Faust.
    for seite, x in (("l", 1), ("r", -1)):
        ax = x * 10.5
        a = m.knoch(f"arm_{seite}", [ax, 55, -10], "brust")
        a.kasten([ax - 2.5, 44, -12.5], [5, 12, 5], "arm", aufblasen=0.2)
        a.kasten([ax - 2, 44.5, -13], [4, 11, 6], "arm", aufblasen=0.2)
        a.kasten([ax - 1.5, 46, -13.6], [3, 6, 2], "arm", aufblasen=0.25)        # Bizeps
        u = m.knoch(f"unterarm_{seite}", [ax, 45, -10], f"arm_{seite}")
        u.kasten([ax - 2.75, 40, -12.75], [5, 5, 5], "unterarm", aufblasen=0.35)
        u.kasten([ax - 2.25, 35, -12.25], [4, 6, 4], "unterarm", aufblasen=0.25)
        u.kasten([ax - 2.5, 34, -12.5], [5, 3, 5], "leder", aufblasen=0.3)        # Wickel
        h = m.knoch(f"hand_{seite}", [ax, 34, -10], f"unterarm_{seite}")
        h.kasten([ax - 2.5, 30, -12.5], [5, 4, 5], "hand")
        h.kasten([ax - 2.5, 29.5, -13.2], [5, 2, 2], "hand", aufblasen=0.1)      # Finger
        h.kasten([ax - (0.5 if x > 0 else 1.5) + x * 2, 31, -13], [2, 2, 3], "hand")   # Daumen

    # ---- die Waffen in der rechten Hand, nach vorn gehalten.
    wx = -10.5
    schwert = m.knoch("schwert", [wx, 32, -10], "hand_r")
    # Das Leunenschwert nach Fynns Bildern: keine Machete, sondern eine
    # langgezogene Axtklinge - am Heft schmal, zur Spitze laufen beide
    # Kanten auseinander, oben und unten, bis zu einem breiten, fast gerade
    # abgeschnittenen Ende. Hell, am Ruecken und am Ende ein dunkler Rand,
    # unten die helle Schneide. Der Griff ist mit Leder umwickelt, am Knauf
    # haengt eine Kette.
    schwert.kasten([wx - 1, 31, -14], [2, 2, 8], "leder")
    schwert.kasten([wx - 1.5, 30, -16.5], [3, 4, 2], "kupfer", aufblasen=0.1)   # Band am Klingenansatz
    schwert.kasten([wx - 1, 30.5, -7], [2, 3, 2], "metall")
    for i in range(3):
        # Die Kette: drei kleine Ringe, die vom Knauf herabhaengen.
        ring(schwert, (wx, 29.2 - i * 2.4, -6.5 + (i % 2) * 0.6), 1.3, "kette", segmente=10, dicke=1, breite=1)
    lang = 34
    for i in range(lang):
        s0 = i / (lang - 1)
        z = -17 - i
        mitte_y = 32 + 1.5 * s0 ** 2                               # die Klinge steigt ein wenig
        oben = mitte_y + 1.8 + 5.2 * s0 ** 1.7
        unten = mitte_y - 1.8 - 4.6 * s0 ** 1.9
        if i >= lang - 2:
            # Das breite Ende: die Ecken leicht gerundet.
            oben -= 0.6 * (i - (lang - 3))
            unten += 0.6 * (i - (lang - 3))
        ende = i >= lang - 3
        schnitt(schwert, wx, (unten, z), (unten + 1.4, z), "schneide")
        schnitt(schwert, wx, (unten + 1.4, z), (oben - 1.4, z), "klingenende" if ende else "klinge")
        schnitt(schwert, wx, (oben - 1.4, z), (oben, z), "klingenruecken")
    # Zwei dunkle Kerben auf dem Blatt, wie im Spiel.
    for z0, y0 in ((-30, 33), (-40, 34.5)):
        schwert.kasten([wx - 0.55, y0, z0 - 2], [1, 1, 4], "klingenruecken", drehung=[8, 0, 0],
                       drehpunkt=[wx, y0, z0])
    # Die Keule: ein langer, umwickelter Schaft, oben ein Kopf aus sechs
    # Flanschen, die sternfoermig abstehen, und ein Dorn an der Spitze.
    keule = m.knoch("keule", [wx, 32, -10], "hand_r")
    keule.kasten([wx - 1, 31, -34], [2, 2, 28], "holz")
    for z in (-14, -20, -26):
        keule.kasten([wx - 1.5, 30.5, z], [3, 3, 3], "leder")
    keule.kasten([wx - 2.5, 29.5, -46], [5, 5, 13], "metall")
    for i in range(6):
        w = i * 60
        keule.kasten([wx - 0.5, 32, -46], [1, 5, 12], "dorn", drehung=[0, 0, w], drehpunkt=[wx, 32, -40])
    stab(keule, (wx, 32, -46), (wx, 32, -51), 2, "dorn")
    # Der Speer: Schaft mit Wickeln, ein langes Blatt aus Schnitten, zwei
    # geschwungene Seitenhaken.
    speer = m.knoch("speer", [wx, 32, -10], "hand_r")
    speer.kasten([wx - 1, 31, -48], [2, 2, 58], "holz")
    for z in (-14, -22, 4):
        speer.kasten([wx - 1.5, 30.5, z], [3, 3, 4], "leder")
    speer.kasten([wx - 2, 30, -50], [4, 4, 3], "metall", aufblasen=0.1)
    for i in range(18):
        s0 = i / 17
        breit = 2 + 6 * math.sin(math.pi * min(1.0, s0 * 1.15)) if s0 < 0.87 else 2 * (1 - s0) / 0.13 + 0.6
        z = -51 - i
        schnitt(speer, wx, (32 - breit / 2, z), (32 - breit / 2 + 1.2, z), "schneide")
        schnitt(speer, wx, (32 - breit / 2 + 1.2, z), (32 + breit / 2 - 1.2, z), "klinge")
        schnitt(speer, wx, (32 + breit / 2 - 1.2, z), (32 + breit / 2, z), "schneide")
    for oben in (1, -1):
        kette(speer, bahn([(wx, 32, -52), (wx, 32 + oben * 4, -53), (wx, 32 + oben * 6.5, -51)], 2), 1, "klinge",
              tiefen=2)
    speer.kasten([wx - 1, 31, 10], [2, 2, 3], "metall")

    # ---- links: der Schild am Unterarm, der Bogen in der Hand
    sx = 13.5
    schild = m.knoch("schild", [10.5, 40, -10], "unterarm_l")
    mitte = (sx + 1, 38, -11)
    ring(schild, mitte, 7.5, "kupfer", segmente=18, dicke=3, breite=3)
    schild.kasten([sx + 0.5, 33, -14], [1, 10, 6], "maehne")
    schild.kasten([sx + 0.5, 35, -16], [1, 6, 10], "maehne")
    axt = m.knoch("schildaxt", [sx + 1.5, 38, -11], "schild", drehung=[-36, 0, 0])
    # Das Blatt der Doppelaxt durch den Ring - zur Mitte schmal, zu den
    # Koepfen breiter.
    for i in range(23):
        z = -22 + i
        breit = 3 + abs(z + 11) * 0.18
        schnitt(axt, sx + 1.5, (38 - breit / 2, z), (38 + breit / 2, z), "schildklinge")
    halbmond(axt, sx + 1.5, (38, 1), (0, 1), gross=1.0)
    halbmond(axt, sx + 1.5, (38, -23), (0, -1), gross=1.0)

    bh = m.knoch("bogen_hand", [10.5, 32, -10], "hand_l", drehung=[90, 0, 0])
    bogen_bauen(bh, (10.5, 32, -10), hoehe=44, woelbung=7)
    br = m.knoch("bogen_ruecken", [0, 50, -2], "brust", drehung=[0, 0, -38])
    bogen_bauen(br, (0, 50, 3), hoehe=44, woelbung=6)
    return m


def bogen_bauen(k, mitte, hoehe=44, woelbung=7, x_dicke=2):
    """Der Leunenbogen nach Fynns Bildern: ein grosser Reflexbogen, in der
    Mitte ein Kupferring als Griff, die Wurfarme hell mit dunkler Innenseite
    und weich geschwungen, an den Enden kleine Halbmondklingen, die Sehne
    golden. Er steht senkrecht, seine Woelbung zeigt nach -z."""
    x0, y0, z0 = mitte
    zg = z0 - woelbung
    ring(k, (x0, y0, zg), 4, "kupfer", segmente=12, dicke=x_dicke + 1, breite=2)
    enden = {}
    for seite in (1, -1):
        h = hoehe / 2
        stuetzen = [(x0, y0 + seite * 4, zg), (x0, y0 + seite * h * 0.4, zg + woelbung * 0.55),
                    (x0, y0 + seite * h * 0.75, zg + woelbung * 1.05), (x0, y0 + seite * h, zg + woelbung * 0.55)]
        weg = bahn(stuetzen, 3)
        n_ = len(weg) - 1
        for i in range(n_):
            stab(k, weg[i], weg[i + 1], x_dicke, "bogen", tiefe=3 if i < n_ // 2 else 2)
        yt, zt = weg[-1][1], weg[-1][2]
        # Die Endklinge: ein kleiner Halbmond, der nach vorn zeigt.
        halbmond(k, x0, (yt, zt - 3), (0, -1), gross=0.45, spanne=70, schritt=10)
        enden[seite] = (yt, zt)
    (y1, z1), (y2, z2) = enden[-1], enden[1]
    k.kasten([x0 - 0.05, y1, z1 + 0.5], [0, round(y2 - y1), 0], "sehne")
    return enden


WAFFEN = ["schwert", "keule", "speer"]



# ============================================================ Malen

# Je Art die Farben, nach den Leunen im Spiel. fell/maehne/haut: dunkel,
# mittel, hell. streifen: die Zeichnung und wie stark sie ist.
ARTEN = {
    "rot": {
        "name": ("Rotmähnen-Leune", "Red-Maned Lynel"),
        # Nach Fynns Bild: dunkles Grau mit einem Stich Oliv, die Maehne
        # dunkelrot, Hoerner und Bandagen cremefarben, die Augen gruen.
        "fell": ["#23271f", "#353b31", "#4c5446"], "bauch": "#55604e", "streifen": ("#1a1d17", 0.35),
        "maehne": ["#4a100c", "#7e2418", "#a8402a"], "haut": ["#272b24", "#3b4237", "#56604f"],
        "horn": ("#9a8a64", "#d6caa2", "#f0e8cc"), "huf": "#1c1a18", "augen": "#7dff6a", "glut": "#a8ff8a",
        "metall": ["#26282c", "#44484e", "#767a82"], "klinge": ["#3e4348", "#a4aaae", "#e6e8e6"],
        "holz": "#4a1c14", "schild": ["#6a3420", "#9a5236", "#c87a52"], "zier": "#d8b088",
        "binde": ["#b8ad8e", "#d8d0b4", "#eee8d4"], "leder": ["#5a2216", "#8a3a26", "#b0563a"],
        "muster": "streifen",
    },
    "blau": {
        "name": ("Blaumähnen-Leune", "Blue-Maned Lynel"),
        "fell": ["#22325a", "#3a5288", "#6a86bc"], "bauch": "#a9bfdc", "streifen": ("#121a36", 0.45),
        "maehne": ["#341652", "#5e2e8c", "#9a62d0"], "haut": ["#2e4472", "#4a64a0", "#7e9ad0"],
        "horn": ("#1a1a24", "#5a5a6a", "#c8c8d4"), "huf": "#1a1a22", "augen": "#ffcc30", "glut": "#ff4a2a",
        "metall": ["#2e3446", "#56607a", "#9aa4c0"], "klinge": ["#5a6a8a", "#9ab0d0", "#e0eaff"],
        "holz": "#3a2a3a", "schild": ["#2a3050", "#3e4a78", "#6a7ab0"], "zier": "#6aa0e8",
        "muster": "streifen",
    },
    "weiss": {
        "name": ("Weißmähnen-Leune", "White-Maned Lynel"),
        "fell": ["#b8b6b0", "#e2e0da", "#fbfaf6"], "bauch": "#ffffff", "streifen": ("#1e1e24", 0.9),
        "maehne": ["#c8c6c0", "#ecebe6", "#ffffff"], "haut": ["#c4c2bc", "#e8e6e0", "#fdfcf8"],
        "horn": ("#18181c", "#3e3e46", "#8e8e98"), "huf": "#202024", "augen": "#ffd23a", "glut": "#ff5020",
        "metall": ["#3a3a40", "#6a6a74", "#aeb0b8"], "klinge": ["#7a7e88", "#c0c4cc", "#f4f6fa"],
        "holz": "#2a2a2e", "schild": ["#3a3a40", "#5a5a62", "#8a8a92"], "zier": "#d02020",
        "muster": "zebra",
    },
    "silber": {
        "name": ("Silberleune", "Silver Lynel"),
        "fell": ["#9ea2b0", "#c8ccd6", "#eef0f6"], "bauch": "#f6f6fa", "streifen": ("#5a2a8a", 0.8),
        "maehne": ["#5e5678", "#a8a0c4", "#efedf6"], "haut": ["#a8acba", "#d0d4de", "#f2f4f8"],
        "horn": ("#2a1a3a", "#5a3a7a", "#c0a8e0"), "huf": "#2a2034", "augen": "#ffd23a", "glut": "#c04aff",
        "metall": ["#3a3446", "#6a6280", "#b0a8c8"], "klinge": ["#7a7290", "#c8c0e0", "#f6f2ff"],
        "holz": "#2a2030", "schild": ["#3a3046", "#5a4a70", "#8a78a8"], "zier": "#b070ff",
        "muster": "wirbel",
    },
    "gold": {
        "name": ("Goldleune", "Golden Lynel"),
        "fell": ["#8a5612", "#c88a24", "#f2c450"], "bauch": "#ffe6a0", "streifen": ("#5a3206", 0.7),
        "maehne": ["#a85a06", "#f0a020", "#ffe478"], "haut": ["#a87018", "#dca236", "#ffd46c"],
        "horn": ("#5a3a08", "#c08a20", "#fff2b0"), "huf": "#4a3008", "augen": "#fff4a0", "glut": "#ffe880",
        "metall": ["#8a5a10", "#d8a030", "#fff0a0"], "klinge": ["#b08a40", "#f0d070", "#fffbe0"],
        "holz": "#5a3a10", "schild": ["#8a5a10", "#c89028", "#ffe080"], "zier": "#ffffff",
        "muster": "wirbel",
    },
}
REIHE = ["rot", "blau", "weiss", "silber", "gold"]


def zeichnung(f, p, n, stoff):
    """Wie stark an diesem Punkt die Zeichnung liegt (0..1). Keine Punkte:
    Streifen sind breite, leicht gewellte Baender quer zum Leib (Rot, Blau),
    beim Weissmaehnen-Leunen kraeftige Zebrastreifen; Silber und Gold
    tragen Wirbel - Hoehenlinien eines ruhigen Rauschens, zu breiten
    Baendern gezogen."""
    x, y, z = p
    art = f["muster"]
    if art in ("streifen", "zebra"):
        if stoff in ("fell", "bein"):
            achse = z if abs(n[0]) > 0.5 or n[1] > 0.5 else y
            if stoff == "bein":
                achse = y
            welle = wolken((x * 0.3, y * 0.3, z * 0.3), 6.0, 41) * 6.0
            breite = 0.5 if art == "zebra" else 0.3
            s = math.sin((achse + welle) * (0.55 if art == "zebra" else 0.42))
            return 1.0 if s > 1 - breite * 2 else 0.0
        if stoff in ("arm", "unterarm") and art == "zebra":
            welle = wolken((x * 0.3, y * 0.3, z * 0.3), 6.0, 43) * 5.0
            return 1.0 if math.sin((y + welle) * 0.6) > 0.25 else 0.0
        return 0.0
    if stoff in ("fell", "bein", "arm", "unterarm", "haut", "brustkorb", "schulter"):
        w = wolken((x * 0.55, y * 0.55, z * 0.55), 5.0, 47)
        return 1.0 if abs(w - 0.5) < 0.045 else (0.5 if abs(w - 0.5) < 0.07 else 0.0)
    return 0.0


def maler(art, phase=1):
    f = ARTEN[art]
    fell, maehne, hautf = f["fell"], f["maehne"], f["haut"]
    streif_farbe, streif_kraft = f["streifen"]

    def rund(c, p, k, n):
        """Die Bloecke wirken rund: an ihren seitlichen Enden dunkler."""
        if k is None or abs(n[1]) > 0.5:
            return c
        achse = 2 if abs(n[0]) > 0.5 else 0
        rand = min(p[achse] - k.ursprung[achse], k.ursprung[achse] + k.groesse[achse] - p[achse])
        if k.groesse[achse] >= 5 and rand < 1.5:
            return H.dunkler(c, 0.12 if rand < 0.8 else 0.06)
        return c

    def mit_zeichnung(c, p, n, stoff):
        z = zeichnung(f, p, n, stoff)
        if z <= 0:
            return c
        if phase == 2 and f["muster"] == "wirbel" and z >= 1.0:
            return glut(f["glut"])
        return mische(H.farbe(c), H.farbe(streif_farbe), streif_kraft * z)

    def male(stoff, p, n, texel):
        x, y, z = p
        k = H.kasten_von(texel)
        t = H.hoehe(p, n, texel)
        oben = n[1] > 0.5
        if stoff in ("fell", "bein"):
            if n[1] < -0.5:
                c = H.farbe(f["bauch"])
            else:
                # Unten hell (Bauch, Innenseite), oben dunkler (Ruecken) - in
                # Stufen, mit einem weichen Uebergang.
                c = H.verlauf([f["bauch"], fell[2], fell[1], fell[0]], t if stoff == "fell" else 0.55 + t * 0.4, 6)
                if stoff == "bein" and y < 9:
                    c = H.dunkler(c, 0.12 * (9 - y) / 9)
            c = mit_zeichnung(c, p, n, stoff)
            return rund(c, p, k, n)
        if stoff == "bauch":
            return H.dunkler(f["bauch"], 0.06) if int(math.floor(z)) % 4 == 0 else H.farbe(f["bauch"])
        if stoff == "fessel":
            return H.verlauf([maehne[0], maehne[1], maehne[2]], t, 3)
        if stoff == "huf":
            c = H.farbe(f["huf"])
            return H.heller(c, 0.25) if oben else (H.dunkler(c, 0.2) if t < 0.3 else c)
        if stoff == "maehne_spitze":
            # Die Spitzen der Straehnen: heller, zur Spitze hin noch heller.
            lt = H.laenge(p, texel, 2)
            return H.verlauf([maehne[1], maehne[2]], 0.3 + lt * 0.7, 3)
        if stoff in ("hornring", "hornspitze"):
            basis, mitte_, spitze = f["horn"]
            if stoff == "hornspitze":
                return H.verlauf([mitte_, spitze], 0.5 + (0.3 if oben else 0.0), 2)
            return H.dunkler(H.verlauf([basis, mitte_], 0.6, 2), 0.06)
        if stoff == "leder":
            le = f.get("leder", [H.dunkler(f["holz"], 0.2), f["holz"], H.heller(f["holz"], 0.2)])
            c = H.verlauf(le, 0.3 + t * 0.5, 3)
            return H.dunkler(c, 0.15) if int(math.floor(y + z * 0.5)) % 2 == 0 else c
        if stoff == "maehne":
            # Strähnen von oben nach unten: oben hell, die Spitzen dunkel -
            # als breite Bahnen, nicht als Punkte.
            bahn = math.sin((x * 1.3 + z * 0.9) * 0.9 + wolken(p, 4.0, 51) * 3) * 0.5 + 0.5
            c = H.verlauf([maehne[0], maehne[1], maehne[2]], 0.25 + t * 0.6 + (bahn - 0.5) * 0.25, 5)
            if phase == 2 and t > 0.75 and art in ("rot", "blau", "gold"):
                return glut(H.heller(maehne[2], 0.1))
            return rund(c, p, k, n)
        if stoff in ("haut", "brustkorb", "schulter", "arm", "unterarm", "hand"):
            c = H.verlauf([hautf[0], hautf[1], hautf[2]], 0.3 + t * 0.6, 5)
            if stoff == "brustkorb" and n[2] < -0.5:
                # Der Brustkorb vorn: in der Mitte eine Furche zwischen den Muskeln.
                if abs(x) < 0.6:
                    c = H.dunkler(c, 0.18)
            if stoff == "hand":
                c = H.dunkler(c, 0.08)
            c = mit_zeichnung(c, p, n, stoff)
            return rund(c, p, k, n)
        if stoff == "brustmuskel":
            # Zwei Brustmuskeln: unten ein Schatten, in der Mitte die Furche.
            c = H.verlauf([hautf[1], hautf[2]], t, 3)
            if abs(x) < 0.6 or t < 0.25:
                c = H.dunkler(c, 0.2)
            return c
        if stoff == "bauchmuskel":
            c = H.verlauf([hautf[1], hautf[2]], 0.4 + t * 0.4, 3)
            if n[2] < -0.5:
                # Sechs Felder mit Schattenfugen.
                if abs(x) < 0.6 or (y - 41) % 2 < 0.5:
                    c = H.dunkler(c, 0.16)
            return rund(c, p, k, n)
        if stoff in ("kopf", "schnauze", "kiefer"):
            c = H.verlauf([fell[1], fell[2], f["bauch"]], 0.35 + t * 0.5, 4)
            if stoff in ("schnauze", "kiefer"):
                c = H.verlauf([fell[2], f["bauch"]], 0.5 + t * 0.5, 3)
            if stoff == "kopf" and n[2] < -0.5:
                # Augen: gelb mit senkrechter Pupille, darueber der Schatten
                # der Braue; zwischen den Augen eine dunkle Stirnzeichnung.
                for ax in (2.6, -2.6):
                    if abs(x - ax) < 1.4 and 64.0 <= y < 66.0:
                        if abs(x - ax) < 0.45:
                            return (20, 12, 8)
                        return glut(f["augen"] if (phase == 1 or y >= 65.0) else f["glut"])
                    if abs(x - ax) < 1.6 and 63.0 <= y < 64.0:
                        c = H.dunkler(c, 0.22)                            # Schatten unter dem Auge
                if abs(x) < 0.8 and y > 63:
                    c = H.dunkler(c, 0.16)
            if stoff == "schnauze" and n[2] < -0.5 and y < 60.5:
                c = H.dunkler(c, 0.25)                                    # Lefzen
            return rund(c, p, k, n)
        if stoff == "nase":
            return H.heller(f["huf"], 0.12) if not oben else H.farbe(f["huf"])
        if stoff == "braue":
            return H.verlauf([fell[0], fell[1]], t, 2)
        if stoff == "ohr":
            return H.dunkler(fell[1], 0.1) if abs(n[0]) > 0.5 else H.farbe(fell[2])
        if stoff == "zahn":
            return hexfarbe("#f6efdc")
        if stoff == "horn":
            # Vom Ansatz zur Spitze: drei Toene; quer gerippt wie ein Widderhorn.
            basis, mitte, spitze = f["horn"]
            return H.verlauf([basis, mitte, spitze], 0.45 + (0.12 if oben else 0.0), 4)
        if stoff == "armring":
            c = H.verlauf([f["metall"][0], f["metall"][2]], t, 3)
            return glut(f["zier"]) if (phase == 2 and art in ("silber", "gold") and abs(n[1]) <= 0.5 and 0.4 < t < 0.6) else c
        if stoff in ("metall", "dorn"):
            c = H.verlauf(f["metall"], t, 3)
            if stoff == "dorn":
                c = H.heller(c, 0.15)
            return c
        if stoff == "klinge":
            # Hell an der Schneide (unten und vorn), dunkler zum Ruecken, eine
            # Kehlung in der Mitte - und bei den wilden und goldenen Waffen
            # eine Gravur in der Zierfarbe.
            if k is not None and k.groesse[2] <= 2:
                # Ein Schnitt einer Schnitt-Klinge: hell zur Schneide, mittelgrau
                # zum Ruecken - ohne Kehlung, die wuerde zu einer Punktreihe.
                return H.verlauf([f["klinge"][2], f["klinge"][1]], 0.15 + t * 0.7, 3)
            c = H.verlauf(list(reversed(f["klinge"])), t, 4)
            if abs(n[0]) > 0.5 and k is not None and k.groesse[1] >= 5:
                mitte = k.ursprung[1] + k.groesse[1] * 0.55
                if abs(y - mitte) < 0.5:
                    c = H.dunkler(c, 0.15)
                if art in ("weiss", "silber", "gold") and abs(y - mitte) < 0.5 and int(z) % 3 == 0:
                    return glut(f["zier"]) if art != "weiss" else H.farbe(f["zier"])
            return c
        if stoff in ("holz", "griff"):
            c = H.farbe(f["holz"])
            if stoff == "griff" and int(math.floor(z + y)) % 2 == 0:
                c = H.dunkler(c, 0.25)                                    # umwickelt
            return H.heller(c, 0.1) if oben else c
        if stoff == "schild":
            # Holz in Brettern, Rand aus Metall, darauf ein Wappen in der
            # Zierfarbe: ein Leunenkopf als Raute.
            if abs(n[0]) > 0.5:
                rand = min(y - 29, 47 - y, z + 19, -1 - z)
                if rand < 1.2:
                    return H.verlauf(f["metall"], 0.6, 2)
                c = H.verlauf(f["schild"], 0.3 + 0.4 * ((int(z) // 3) % 2), 3)
                d = abs(y - 38) + abs(z + 10)
                if 5.5 < d < 7.0:
                    return H.farbe(f["zier"])
                return c
            return H.farbe(f["metall"][1])
        if stoff == "binde":
            # Bandagen: schraeg gewickelte Bahnen, die Fugen als feine Linien.
            b = f.get("binde", ["#b8ad8e", "#d8d0b4", "#eee8d4"])
            c = H.verlauf(b, 0.3 + t * 0.6, 3)
            # Schraeg nur auf den Seiten; die Fuge ist eine durchgehende Linie,
            # kein Punktmuster (Fynns Regel).
            schraeg = (x if abs(n[2]) > 0.5 else z) * 0.5
            if math.floor(y + schraeg) % 3 == 0:
                c = H.dunkler(c, 0.14)
            return rund(c, p, k, n)
        if stoff in ("guertel", "schurz"):
            le = f.get("leder", ["#5a2216", "#8a3a26", "#b0563a"])
            c = H.verlauf(le, 0.25 + t * 0.6, 3)
            if stoff == "schurz" and k is not None and abs(n[2]) > 0.5:
                # Je Platte ein dunkler Saum unten und zwei Nieten oben.
                if y - k.ursprung[1] < 0.8:
                    return H.dunkler(c, 0.3)
                if k.ursprung[1] + k.groesse[1] - y < 1.2 and abs(abs(x) - (k.groesse[0] / 2 - 1.2)) < 0.6:
                    return H.farbe(f["zier"])
            if stoff == "guertel" and abs(n[1]) <= 0.5 and abs(x) < 1.5 and n[2] < -0.5:
                return H.farbe(f["zier"])                                  # Schnalle
            return rund(c, p, k, n)
        if stoff == "schildklinge":
            # Dunkler Stahl mit einer hellen Fase entlang der Kanten - wie die
            # Axtklingen auf Fynns Bild.
            kl = f["klinge"]
            c = H.verlauf([kl[0], kl[1]], t, 2)
            if k is not None and abs(n[0]) > 0.5:
                rand = min(y - k.ursprung[1], k.ursprung[1] + k.groesse[1] - y)
                if rand < 0.9:
                    c = H.heller(c, 0.18)
            return c
        if stoff == "schneide":
            return H.farbe(f["klinge"][2])
        if stoff in ("klingenruecken", "klingenende"):
            return H.verlauf([f["klinge"][0], f["klinge"][1]], 0.25 if stoff == "klingenruecken" else 0.4, 2)
        if stoff == "kette":
            return H.verlauf(["#9aa0a6", "#d4d8dc"], t, 2)
        if stoff == "kupfer":
            # Kupferring: warmer Verlauf, auf der Schauseite je Glied eine Niete.
            ku = f.get("kupfer", ["#7a3a22", "#b0603e", "#d8906a"])
            c = H.verlauf(ku, 0.3 + t * 0.6, 3)
            if k is not None and abs(n[0]) > 0.5 and k.groesse[2] >= 3:
                mz = k.ursprung[2] + k.groesse[2] / 2
                my = k.ursprung[1] + k.groesse[1] / 2
                if abs(z - mz) < 0.5 and abs(y - my) < 0.5:
                    return H.farbe(f["zier"])
            return c
        if stoff == "bogen":
            # Die Wurfarme: aussen hell wie Knochen, innen (zur Sehne) dunkel.
            b = f.get("bogenfarben", ["#3a2a24", "#d8d2c0", "#f2eee2"])
            if n[2] > 0.5:
                return H.farbe(b[0])
            return H.verlauf([b[1], b[2]], t, 2)
        if stoff == "sehne":
            return hexfarbe(f.get("sehne", "#d8b45a"))
        return (255, 0, 255)
    return male


def bauen():
    m = gestalt()
    geo = m.geometrie()
    geo["minecraft:geometry"][0]["description"]["identifier"] = f"geometry.fynn.{NAME}"
    haeute = {art: (m.male(maler(art, 1)), m.male(maler(art, 2))) for art in REIHE}
    return m, geo, haeute


# ============================================================ Bewegung

# Kampfbereit: die Waffe schraeg erhoben, der Schild vor dem Leib, der Kopf
# leicht gesenkt; die Hinterbeine winkeln am Sprunggelenk ab wie bei einem
# Pferd.
HALTUNG = {
    # Angriffslustig: Der Oberkoerper beugt sich vor und dreht die Waffenseite
    # zurueck, der Kopf ist gesenkt, die Waffe hoch und bereit, der Schild
    # vor der Brust; ein Vorderbein steht vor, die Hinterbeine sind versetzt.
    "leib": [0, 0, 0], "oberkoerper": [9, -8, 0], "brust": [5, -4, 0], "hals": [-8, 4, 0], "kopf": [8, 6, 0],
    "kiefer": [0, 0, 0],
    "arm_r": [-40, 30, -34], "unterarm_r": [-46, 0, 0], "hand_r": [10, 0, 0],
    "arm_l": [-18, 30, 30], "unterarm_l": [-52, 0, 0], "hand_l": [0, 0, 0],
    "bein_vl": [-14, 0, 0], "bein_vr": [6, 0, 0], "unterbein_vl": [18, 0, 0], "unterbein_vr": [0, 0, 0],
    "huf_vl": [-4, 0, 0], "huf_vr": [0, 0, 0],
    "bein_hl": [16, 0, 0], "bein_hr": [2, 0, 0], "unterbein_hl": [-24, 0, 0], "unterbein_hr": [-16, 0, 0],
    "huf_hl": [8, 0, 0], "huf_hr": [14, 0, 0],
    "schwanz1": [10, 8, 0], "schwanz2": [6, 10, 0], "schwanz3": [0, 8, 0],
}


def grund():
    return bk.grundpose(HALTUNG, ["wurzel", "maehne", "maehne_kopf", "schild", "schwert", "keule", "speer",
                                  "bogen_hand", "bogen_ruecken"])


def ablauf(laenge, bilder, **weiter):
    return bk.ablauf(grund(), laenge, [(t, standfest(dict(b))) for t, b in bilder], **weiter)


def standfest(bild):
    """Baeumt er sich auf (Leib um x), drehen die Hinterbeine zurueck - die
    Hufe bleiben am Boden, nur die Vorderbeine heben sich."""
    if "leib" not in bild:
        return bild
    w = bild["leib"]
    kx = (w["rotation"] if isinstance(w, dict) else w)[0]
    for bein in ("bein_hl", "bein_hr"):
        alt = bild.get(bein, HALTUNG[bein])
        if isinstance(alt, dict):
            continue
        bild[bein] = [alt[0] - kx, alt[1], alt[2]]
    return bild


def pose(*teile, **knochen):
    bild = {}
    for t in teile:
        bild.update(t)
    bild.update(knochen)
    return bild


def aufbaeumen(winkel, hoch=0.0):
    """Der Pferdeleib steigt vorn; die Vorderbeine ziehen sich an."""
    return {"leib": {"rotation": [winkel, 0.0, 0.0], "position": [0.0, hoch, 0.0]},
            "bein_vl": [winkel * 1.6, 0.0, 0.0], "bein_vr": [winkel * 1.2, 0.0, 0.0],
            "unterbein_vl": [-winkel * 2.2, 0.0, 0.0], "unterbein_vr": [-winkel * 1.8, 0.0, 0.0]}


def galopp(von, bis, schritt=0.14):
    """Vier Beine im Galopp: vorn und hinten gegeneinander, der Leib wippt."""
    b = []
    t, i = von, 0
    while t <= bis + 1e-9:
        a = 1 if i % 2 == 0 else -1
        b.append((round(t, 2), {
            "bein_vl": [-50 * a, 0, 0], "bein_vr": [-38 * a, 0, 0], "unterbein_vl": [40 if a > 0 else 0, 0, 0],
            "unterbein_vr": [30 if a > 0 else 0, 0, 0],
            "bein_hl": [10 + 34 * a, 0, 0], "bein_hr": [10 + 26 * a, 0, 0],
            "unterbein_hl": [-20 - (30 if a < 0 else 0), 0, 0], "unterbein_hr": [-20 - (24 if a < 0 else 0), 0, 0],
            "leib": {"rotation": [4 * a, 0, 0], "position": [0, 1.2 if a > 0 else 0, 0]},
            "schwanz1": [18 + 10 * a, 0, 0]}))
        t += schritt
        i += 1
    return b


T = "query.life_time"


def haltung():
    """Er atmet schwer, der Kopf sieht sich um, der Schwanz peitscht leise;
    ab und zu scharrt ein Vorderhuf."""
    knochen = {k: {"rotation": list(v)} for k, v in HALTUNG.items()}
    knochen["brust"]["rotation"] = [f"5.0 + math.sin({T} * 70.0) * 1.5", -4.0, 0.0]
    knochen["kopf"]["rotation"] = [f"8.0 + math.sin({T} * 70.0 - 60.0) * 2.0", f"6.0 + math.sin({T} * 23.0) * 12.0",
                                   f"math.sin({T} * 17.0) * 4.0"]
    knochen["kiefer"]["rotation"] = [f"math.max(0.0, math.sin({T} * 29.0) - 0.92) * 140.0", 0.0, 0.0]
    knochen["arm_r"]["rotation"] = [f"-40.0 + math.sin({T} * 70.0) * 3.0", 30.0, -34.0]
    knochen["schwanz1"]["rotation"] = [f"10.0 + math.sin({T} * 50.0) * 6.0", f"8.0 + math.sin({T} * 80.0) * 18.0", 0.0]
    knochen["schwanz2"]["rotation"] = [0.0, f"math.sin({T} * 80.0 - 50.0) * 14.0", 0.0]
    knochen["schwanz3"]["rotation"] = [0.0, f"math.sin({T} * 80.0 - 100.0) * 12.0", 0.0]
    # Scharren: alle sieben Sekunden hebt er den rechten Vorderhuf dreimal.
    sch = f"(math.mod({T}, 7.0) < 1.2 ? math.abs(math.sin(math.mod({T}, 7.0) * 450.0)) : 0.0)"
    knochen["bein_vr"]["rotation"] = [f"-{sch} * 34.0", 0.0, 0.0]
    knochen["unterbein_vr"]["rotation"] = [f"{sch} * 50.0", 0.0, 0.0]
    knochen["leib"] = {"position": [0.0, f"math.sin({T} * 70.0) * 0.3", 0.0]}
    knochen["maehne"] = {"rotation": [f"math.sin({T} * 60.0 - 30.0) * 2.0", 0.0, 0.0]}
    return {"loop": True, "bones": knochen}


def gang():
    """Viertakt wie ein Pferd: links hinten, links vorn, rechts hinten,
    rechts vorn - jedes Bein einen Viertel Takt versetzt."""
    t = "query.anim_time * 18.0"
    k = {}
    for bein, versatz, hinten in (("hl", 0, True), ("vl", 90, False), ("hr", 180, True), ("vr", 270, False)):
        w = f"math.sin({t} - {versatz})"
        k[f"bein_{bein}"] = {"rotation": [f"{10 if hinten else 0} + {w} * {26 if hinten else 30}", 0.0, 0.0]}
        k[f"unterbein_{bein}"] = {"rotation": [
            f"{-20 if hinten else 0} + math.max(0.0, math.cos({t} - {versatz})) * {-30 if hinten else 40}", 0.0, 0.0]}
    k["leib"] = {"position": [0.0, f"-math.abs(math.sin({t} * 2.0)) * 0.6", 0.0],
                 "rotation": [0.0, 0.0, f"math.sin({t}) * 1.5"]}
    k["oberkoerper"] = {"rotation": [4.0, f"math.sin({t}) * 4.0", 0.0]}
    k["schwanz1"] = {"rotation": [6.0, f"math.sin({t}) * 14.0", 0.0]}
    return {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": k}


def schwerthieb(richtung, hoch=False):
    """Eine Hiebpose: richtung +1 von rechts aussen nach links, -1 zurueck.
    Die Waffe steht quer zur Hand: Summe der Drehung von Ober- und
    Unterarm 0 heisst "Klinge waagrecht nach vorn", -90 "senkrecht hoch"."""
    if hoch:
        return {"arm_r": [-150, 0, -20], "unterarm_r": [30, 0, 0], "oberkoerper": [-6, 0, 0], "brust": [-6, 0, 0]}
    return {"arm_r": [-50, 65 * richtung, -30 * richtung], "unterarm_r": [24, 0, 0],
            "oberkoerper": [4, 30 * richtung, 0], "brust": [2, 15 * richtung, 0]}


def kombo_schwert():
    """Drei Schlaege (0,55 / 1,05 / 1,7 s): quer von rechts, quer zurueck,
    dann von oben herab - wie die Schwert-Leunen im Spiel."""
    return ablauf(2.4, [
        (0.35, pose(schwerthieb(-1), kopf=[0, 10, 0])),
        (0.55, pose(schwerthieb(1), kopf=[4, -10, 0])),
        (0.85, pose(schwerthieb(1), arm_r=[-80, 70, 30])),
        (1.05, pose(schwerthieb(-1), kopf=[4, 10, 0])),
        (1.40, pose(schwerthieb(0, hoch=True), aufbaeumen(-12, 1.0))),
        (1.70, pose({"arm_r": [-40, 0, -10], "unterarm_r": [-10, 0, 0], "oberkoerper": [24, 0, 0],
                     "brust": [10, 0, 0]}, aufbaeumen(4.0), kopf=[10, 0, 0])),
        (2.00, pose({"arm_r": [-30, 0, -10], "oberkoerper": [16, 0, 0]})),
    ])


def kombo_keule():
    """Die Keule ueber den Kopf (0,6 s) und mit ganzer Kraft in den Boden
    (0,9 s) - eine kleine Welle laeuft los; dann ein Schwinger quer (1,6 s)."""
    oben = pose({"arm_r": [-150, 0, -15], "unterarm_r": [30, 0, 0], "arm_l": [-60, 0, 20], "oberkoerper": [-10, 0, 0],
                 "brust": [-8, 0, 0], "kopf": [-6, 0, 0]}, aufbaeumen(-16, 1.0))
    unten = pose({"arm_r": [-40, 0, -5], "unterarm_r": [60, 0, 0], "oberkoerper": [28, 0, 0], "brust": [12, 0, 0],
                  "kopf": [16, 0, 0]}, aufbaeumen(6.0))
    return ablauf(2.6, [
        (0.60, oben), (0.90, unten), (1.15, unten),
        (1.40, pose(schwerthieb(-1), arm_r=[-60, -60, 40])),
        (1.60, pose(schwerthieb(1), arm_r=[-70, 60, -40])),
        (2.00, pose(schwerthieb(1))),
    ])


def kombo_speer():
    """Zwei Stiche (0,5 / 0,9 s), weit nach vorn - dann ein Rundschlag mit
    dem Schaft (1,6 s)."""
    zurueck = pose({"arm_r": [14, 0, -20], "unterarm_r": [-16, 0, 0], "oberkoerper": [0, -20, 0], "brust": [0, -10, 0]})
    stich = pose({"arm_r": [-62, 0, -6], "unterarm_r": [62, 0, 0], "oberkoerper": [16, 15, 0], "brust": [6, 5, 0]})
    return ablauf(2.4, [
        (0.30, zurueck), (0.50, stich), (0.70, zurueck), (0.90, stich),
        (1.30, pose(schwerthieb(-1), arm_r=[-80, -70, 30])),
        (1.60, pose(schwerthieb(1), arm_r=[-80, 80, -30], oberkoerper=[4, 40, 0])),
        (1.95, pose(schwerthieb(1))),
    ])


def schildstoss():
    """Er reisst den Schild vor und stoesst zu (0,5 s)."""
    return ablauf(1.2, [
        (0.30, {"arm_l": [-10, 30, 20], "unterarm_l": [-80, 0, 0], "oberkoerper": [-4, -20, 0]}),
        (0.50, {"arm_l": [-70, 10, 30], "unterarm_l": [-20, 0, 0], "oberkoerper": [16, 20, 0], "brust": [6, 10, 0]}),
        (0.75, {"arm_l": [-50, 10, 25], "unterarm_l": [-40, 0, 0], "oberkoerper": [8, 10, 0]}),
    ])


def ansturm():
    """Er senkt Kopf und Waffe, scharrt - und galoppiert los (0,7 bis
    1,9 s); am Ende stemmt er die Vorderhufe in den Boden."""
    vor = {"oberkoerper": [24, 0, 0], "brust": [10, 0, 0], "kopf": [10, 0, 0], "arm_r": [-60, 0, -10],
           "unterarm_r": [-10, 0, 0], "arm_l": [-50, 20, 20], "unterarm_l": [-40, 0, 0]}
    return ablauf(2.8, [
        (0.25, pose(vor, bein_vr=[-40, 0, 0], unterbein_vr=[50, 0, 0])),
        (0.45, pose(vor, bein_vr=[10, 0, 0], unterbein_vr=[0, 0, 0])),
        (0.60, pose(vor, bein_vr=[-40, 0, 0], unterbein_vr=[50, 0, 0])),
    ] + [(t, pose(vor, b)) for t, b in galopp(0.7, 1.9)] + [
        (2.10, pose(aufbaeumen(-18, 1.0), oberkoerper=[-10, 0, 0], kopf=[-10, 0, 0], arm_r=[-30, 0, -10])),
    ])


def dreifachschuss():
    """Der Bogen kommt vom Ruecken in die linke Hand, die rechte zieht drei
    Pfeile auf einmal - Schuss (1,1 s), in Phase zwei ein zweiter (1,9 s)."""
    zielen = {"arm_l": [-90, 30, 0], "unterarm_l": [0, 0, 0], "arm_r": [-90, -40, 10], "unterarm_r": [-100, 0, 0],
              "oberkoerper": [0, -30, 0], "brust": [-4, -10, 0], "kopf": [0, 30, 0]}
    los = dict(zielen, arm_r=[-80, -20, 20], unterarm_r=[-40, 0, 0])
    return ablauf(2.6, [
        (0.30, pose(zielen, arm_r=[-60, 0, 0], unterarm_r=[-60, 0, 0])),
        (0.85, zielen), (1.10, los), (1.30, zielen), (1.65, zielen), (1.90, los), (2.20, zielen),
    ])


def feuerbaelle():
    """Er reisst den Kopf zurueck und holt Luft (0,6 s) - und speit drei
    Feuerbaelle in einem Faecher (1,0 s), in Phase zwei noch einmal (1,6 s)."""
    holen = pose(aufbaeumen(-10, 0.5), oberkoerper=[-14, 0, 0], brust=[-8, 0, 0], hals=[-20, 0, 0], kopf=[-24, 0, 0],
                 kiefer=[20, 0, 0], arm_r=[-30, 0, -30], arm_l=[-30, 0, 30])
    speien = pose(oberkoerper=[16, 0, 0], brust=[8, 0, 0], hals=[6, 0, 0], kopf=[12, 0, 0], kiefer=[44, 0, 0],
                  leib={"rotation": [2, 0, 0], "position": [0, 0, 0]})
    return ablauf(2.4, [(0.60, holen), (0.85, holen), (1.00, speien), (1.25, speien),
                        (1.40, holen), (1.60, speien), (1.90, speien)])


def sprungschlag():
    """Er geht in die Knie (0,5 s), springt (0,8 s) - das Skript traegt ihn
    im Bogen zum Ziel - und schlaegt mit der Waffe auf (1,6 s): eine
    Schockwelle laeuft los. Wer springt, entgeht ihr."""
    knie = pose({"leib": {"rotation": [6, 0, 0], "position": [0, -3, 0]}, "bein_vl": [-40, 0, 0],
                 "unterbein_vl": [70, 0, 0], "bein_vr": [-40, 0, 0], "unterbein_vr": [70, 0, 0],
                 "bein_hl": [-20, 0, 0], "bein_hr": [-20, 0, 0], "unterbein_hl": [-50, 0, 0],
                 "unterbein_hr": [-50, 0, 0], "arm_r": [-150, 0, -20], "unterarm_r": [-20, 0, 0]})
    flug = pose({"leib": {"rotation": [-14, 0, 0], "position": [0, 0, 0]}, "bein_vl": [-70, 0, 0],
                 "unterbein_vl": [100, 0, 0], "bein_vr": [-70, 0, 0], "unterbein_vr": [100, 0, 0],
                 "bein_hl": [50, 0, 0], "bein_hr": [50, 0, 0], "unterbein_hl": [-10, 0, 0], "unterbein_hr": [-10, 0, 0],
                 "arm_r": [-170, 0, -10], "unterarm_r": [-30, 0, 0], "oberkoerper": [-10, 0, 0], "kopf": [-6, 0, 0]})
    auf = pose({"leib": {"rotation": [8, 0, 0], "position": [0, -2, 0]}, "arm_r": [-20, 0, -5], "unterarm_r": [0, 0, 0],
                "oberkoerper": [32, 0, 0], "brust": [12, 0, 0], "kopf": [18, 0, 0]}, beine_auf())
    return ablauf(2.8, [(0.50, knie), (0.80, flug), (1.40, flug), (1.60, auf), (1.95, auf),
                        (2.30, pose({"leib": {"rotation": [0, 0, 0], "position": [0, 0, 0]}}))])


def beine_auf():
    return {"bein_vl": [-20, 0, 0], "unterbein_vl": [30, 0, 0], "bein_vr": [-20, 0, 0], "unterbein_vr": [30, 0, 0],
            "bein_hl": [0, 0, 0], "bein_hr": [0, 0, 0], "unterbein_hl": [-30, 0, 0], "unterbein_hr": [-30, 0, 0]}


def bruellen():
    """Er baeumt sich auf und bruellt (0,6 bis 1,6 s) - wer nah steht, ist
    wie gelaehmt - und um ihn bricht ein Feuerring auf (1,8 s)."""
    schrei = pose(aufbaeumen(-22, 2.0), oberkoerper=[-12, 0, 0], brust=[-10, 0, 0], hals=[-16, 0, 0], kopf=[-30, 0, 0],
                  kiefer=[50, 0, 0], arm_r=[-120, 0, -50], unterarm_r=[-20, 0, 0], arm_l=[-120, 0, 50],
                  unterarm_l=[-20, 0, 0])
    return ablauf(2.6, [(0.45, schrei), (1.50, dict(schrei, kopf=[-34, 0, 0])),
                        (1.80, pose(aufbaeumen(6.0), oberkoerper=[24, 0, 0], kopf=[14, 0, 0], kiefer=[30, 0, 0],
                                    arm_r=[-30, 0, -40], arm_l=[-30, 0, 40]))])


def wirbel():
    """Er dreht sich einmal um sich selbst, die Waffe weit ausgestreckt -
    trifft alles ringsum (0,7 s)."""
    aus = {"arm_r": [-80, 60, -60], "unterarm_r": [0, 0, 0], "oberkoerper": [6, 40, 0]}
    return ablauf(1.8, [
        (0.30, pose(aus, wurzel={"rotation": [0, 0, 0]})),
        (0.50, pose(aus, wurzel={"rotation": [0, -120, 0]})),
        (0.70, pose(aus, wurzel={"rotation": [0, -240, 0]})),
        (0.90, pose(aus, wurzel={"rotation": [0, -360, 0]})),
        (1.30, pose(wurzel={"rotation": [0, -360, 0]})),
    ], linear=("wurzel",), spruenge=[(1.31, "wurzel", "rotation", [0, -360, 0], [0, 0, 0])])


BETAEUBT = pose({"leib": {"rotation": [14, 0, 6], "position": [0, -6, 0]}, "bein_vl": [-70, 0, 0],
                 "unterbein_vl": [110, 0, 0], "bein_vr": [-60, 0, 0], "unterbein_vr": [100, 0, 0],
                 "bein_hl": [-4, 0, 0], "bein_hr": [-4, 0, 0], "oberkoerper": [20, 0, 0], "brust": [10, 0, 0],
                 "hals": [14, 0, 0], "kopf": [20, 0, 12], "kiefer": [16, 0, 0], "arm_r": [-10, 0, -20],
                 "arm_l": [-10, 0, 20], "unterarm_l": [-10, 0, 0], "unterarm_r": [-10, 0, 0]})


def betaeubt():
    """Ein Kopftreffer hat ihn betaeubt: Er sackt vorn in die Knie, der Kopf
    haengt, er schwankt - jetzt kann man aufsitzen (bis 3,4 s)."""
    return ablauf(3.8, [(0.35, BETAEUBT), (1.2, dict(BETAEUBT, kopf=[22, 0, -10])),
                        (2.2, dict(BETAEUBT, kopf=[20, 0, 12])), (3.0, dict(BETAEUBT, kopf=[16, 0, -6])),
                        (3.4, pose(aufbaeumen(-10, 1.0), kopf=[-10, 0, 0]))])


def taumeln():
    """Pariert: Er taumelt zurueck, die Arme weit (bis 1,0 s)."""
    return ablauf(1.4, [(0.20, pose(aufbaeumen(-14, 1.0), oberkoerper=[-20, 0, 0], kopf=[-20, 0, 0],
                                    arm_r=[-60, 0, -60], arm_l=[-60, 0, 60], unterarm_l=[-10, 0, 0])),
                        (0.70, pose(aufbaeumen(-6, 0.5), oberkoerper=[-12, 0, 0], kopf=[-8, 0, 0]))])


def wechsel():
    """Zorn: Die erste Leiste ist leer. Er bruellt, stemmt sich in den Boden
    und laedt (1,0 bis 3,4 s) - die Augen beginnen zu gluehen -, dann
    baeumt er sich auf, und ein Feuerstoss bricht um ihn auf (3,8 s)."""
    stemmen = pose({"leib": {"rotation": [6, 0, 0], "position": [0, -2, 0]}, "oberkoerper": [18, 0, 0],
                    "brust": [8, 0, 0], "kopf": [6, 0, 0], "arm_r": [-30, 0, -40], "unterarm_r": [-60, 0, 0],
                    "arm_l": [-30, 0, 40], "unterarm_l": [-60, 0, 0]})
    return ablauf(4.6, [
        (0.40, pose(aufbaeumen(-24, 2.0), kopf=[-30, 0, 0], kiefer=[46, 0, 0])),
        (1.00, stemmen), (3.40, dict(stemmen, kopf=[2, 0, 0])),
        (3.70, pose(aufbaeumen(-24, 2.0), oberkoerper=[-12, 0, 0], kopf=[-34, 0, 0], kiefer=[50, 0, 0],
                    arm_r=[-140, 0, -40], arm_l=[-140, 0, 40])),
        (3.95, pose(aufbaeumen(6.0), oberkoerper=[20, 0, 0], kopf=[14, 0, 0], kiefer=[30, 0, 0],
                    arm_r=[-40, 0, -30], arm_l=[-40, 0, 30])),
    ])


def beben():
    huelle = "math.clamp((query.anim_time - 1.0) / 2.4, 0.0, 1.0) * (query.anim_time < 3.4)"
    return {"loop": "hold_on_last_frame", "animation_length": 4.6, "bones": {
        "wurzel": {"rotation": [f"math.sin(query.anim_time * 2300.0) * 0.9 * {huelle}", 0.0,
                                f"math.sin(query.anim_time * 1700.0) * 0.9 * {huelle}"]}}}


def auftritt():
    """Er steigt, bruellt und schlaegt die Waffe gegen den Schild (2,0 s)."""
    return ablauf(3.0, [
        (0.60, pose(aufbaeumen(-32, 2.5), kopf=[-30, 0, 0], kiefer=[46, 0, 0], arm_r=[-150, 0, -30],
                    arm_l=[-100, 0, 30])),
        (1.40, pose(aufbaeumen(-28, 2.2), kopf=[-26, 0, 0], kiefer=[40, 0, 0], arm_r=[-150, 0, -30])),
        (1.80, pose(aufbaeumen(4.0), arm_r=[-80, 40, -30], arm_l=[-40, 30, 20], unterarm_l=[-70, 0, 0])),
        (2.05, pose(arm_r=[-60, 20, -10], arm_l=[-40, 20, 20], unterarm_l=[-70, 0, 0])),
    ])


LIEGEN = pose({"leib": {"rotation": [0, 0, 70], "position": [0, -11, 0]}, "bein_vl": [-20, 0, -20],
               "bein_vr": [-30, 0, -10], "unterbein_vl": [30, 0, 0], "unterbein_vr": [40, 0, 0],
               "bein_hl": [10, 0, -20], "bein_hr": [20, 0, -10], "oberkoerper": [10, 0, -30], "brust": [0, 0, -10],
               "kopf": [10, 0, -20], "kiefer": [16, 0, 0], "arm_r": [-30, 0, -60], "arm_l": [-20, 0, 40]})


def abschied():
    """Ein letzter Schrei, dann bricht er zur Seite zusammen."""
    return ablauf(4.0, [
        (0.40, pose(aufbaeumen(-22, 1.5), kopf=[-30, 0, 0], kiefer=[44, 0, 0])),
        (1.10, pose(BETAEUBT)),
        (1.90, LIEGEN), (4.00, dict(LIEGEN, kopf=[12, 0, -24], kiefer=[6, 0, 0])),
    ], zurueck=False)


def hieb_waffe():
    return ablauf(0.9, [
        (0.30, schwerthieb(-1)),
        (0.48, pose(schwerthieb(1), arm_r=[-60, 60, 20])),
    ])


def hieb_tritt():
    """Ein Vorderhuf schlaegt nach vorn."""
    return ablauf(0.9, [
        (0.30, pose(aufbaeumen(-14, 1.0), bein_vl=[-80, 0, 0], unterbein_vl=[60, 0, 0])),
        (0.48, pose(aufbaeumen(2.0), bein_vl=[-20, 0, 0], unterbein_vl=[0, 0, 0])),
    ])


ANGRIFFE = {
    "kombo_schwert": (1, kombo_schwert, {"treffer": [0.55, 1.05, 1.7]}),
    "kombo_keule": (2, kombo_keule, {"treffer": [0.9, 1.6]}),
    "kombo_speer": (3, kombo_speer, {"treffer": [0.5, 0.9, 1.6]}),
    "schildstoss": (4, schildstoss, {"stoss": 0.5}),
    "ansturm": (5, ansturm, {"los": 0.7, "halt": 1.9}),
    "dreifachschuss": (6, dreifachschuss, {"schuesse": [1.1, 1.9]}),
    "feuerbaelle": (7, feuerbaelle, {"speien": [1.0, 1.6]}),
    "sprungschlag": (8, sprungschlag, {"abheben": 0.8, "aufprall": 1.6}),
    "bruellen": (9, bruellen, {"schrei": 0.6, "feuer": 1.8}),
    "wirbel": (10, wirbel, {"treffer": 0.7}),
    "betaeubt": (11, betaeubt, {"aufstehen": 3.4}),
    "taumeln": (12, taumeln, {}),
    "wechsel": (13, wechsel, {"laden_von": 1.0, "laden_bis": 3.4, "umschlag": 3.8}),
    "auftritt": (14, auftritt, {"bereit": 2.6}),
    "abschied": (15, abschied, {"beute": 3.2}),
}
HIEBE = [("hieb_waffe", hieb_waffe), ("hieb_tritt", hieb_tritt)]
SCHUSS = ANGRIFFE["dreifachschuss"][0]


def bogen_zeigen():
    """Beim Schuss haengt der Bogen in der Hand, sonst auf dem Ruecken; die
    Nahkampfwaffe ist so lange weggesteckt - die rechte Hand zieht die Sehne."""
    return {"loop": True, "bones": {b: {"scale": 0.0} for b in ["bogen_ruecken"] + WAFFEN}}


def bogen_weg():
    return {"loop": True, "bones": {"bogen_hand": {"scale": 0.0}}}


def alle_animationen():
    anims = {PRAEFIX + "haltung": haltung(), PRAEFIX + "gang": gang(), PRAEFIX + "beben": beben(),
             PRAEFIX + "bogen_zeigen": bogen_zeigen(), PRAEFIX + "bogen_weg": bogen_weg()}
    for name, bau in HIEBE:
        anims[PRAEFIX + name] = bau()
    for name, (_, bau, _) in ANGRIFFE.items():
        a = bau()
        a["loop"] = "hold_on_last_frame"
        anims[PRAEFIX + name] = a
    return anims
