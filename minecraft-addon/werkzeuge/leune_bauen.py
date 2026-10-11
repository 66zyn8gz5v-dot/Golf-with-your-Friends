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

def bogen_bauen(k, mitte, hoehe=36, woelbung=7, x_dicke=2, stoff="bogen"):
    """Ein grosser Reflexbogen aus Gliedern: Er biegt sich vom Griff nach
    vorn und schwingt an den Enden wieder zurueck - so sehen die
    Leunenboegen aus. mitte: der Griff (x, y, z); der Bogen steht
    senkrecht, seine Woelbung zeigt nach -z (vorn)."""
    x0, y0, z0 = mitte
    teile = 9
    punkte = []
    for i in range(teile + 1):
        s = i / teile * 2 - 1                         # -1 unten .. 1 oben
        y = y0 + s * hoehe / 2
        # Woelbung nach vorn, die Enden schwingen zurueck (Reflex).
        z = z0 - woelbung * (1 - s * s) + 2.5 * max(0.0, abs(s) - 0.75) / 0.25
        punkte.append((y, z))
    for i in range(teile):
        (ya, za), (yb, zb) = punkte[i], punkte[i + 1]
        lang = math.hypot(yb - ya, zb - za)
        winkel = math.degrees(math.atan2(zb - za, yb - ya))
        dick = 3 if 3 <= i <= 5 else 2
        k.kasten([x0 - x_dicke / 2, ya, (za + zb) / 2 - dick / 2], [x_dicke, max(1, round(lang + 0.6)), dick],
                 "griff" if i == 4 else stoff, drehung=[-winkel, 0, 0], drehpunkt=[x0, ya, (za + zb) / 2])
    # Hornspitzen an den Enden und die Sehne.
    for (y, z), r in ((punkte[0], 1), (punkte[-1], -1)):
        k.kasten([x0 - 1, y - (2 if r > 0 else 0), z - 1], [2, 2, 3], "horn")
    k.kasten([x0 - 0.05, punkte[0][0], punkte[0][1] + 0.5], [0, round(hoehe), 0], "sehne")
    return punkte


def gestalt():
    """Gebaut nach Bildern der Leunen aus Breath of the Wild. Masse in
    Pixeln, das Spiel vergroessert je Art (GROESSE)."""
    m = Modell(NAME, sichtbreite=5.0, sichthoehe=6.0)
    m.knoch("wurzel", [0, 0, 0])

    # ---- der Pferdeleib
    leib = m.knoch("leib", [0, 31, 2], "wurzel")
    # Massig wie ein Kaltblut: Der Oberkoerper sitzt vorn auf einem
    # breiten, tiefen Leib, die Kruppe steht hoch und rund.
    leib.kasten([-8, 24, -15], [16, 14, 38], "fell")
    leib.kasten([-7, 38, -11], [14, 2, 32], "fell", aufblasen=0.1)            # gewoelbter Ruecken
    leib.kasten([-7, 20, -17], [14, 13, 5], "fell", aufblasen=0.3)            # Pferdebrust
    leib.kasten([-7, 23, -12], [14, 1, 31], "bauch")                         # Bauch
    leib.kasten([-8.5, 27, 12], [17, 12, 11], "fell", aufblasen=0.3)          # Kruppe
    for seite, x in (("l", 1), ("r", -1)):
        # Vorderbein: Schulter, Unterarm (Roehre), Fessel mit Haarbusch, Huf.
        bx, bz = x * 5, -10
        o = m.knoch(f"bein_v{seite}", [bx, 27, bz], "leib")
        o.kasten([bx - 3.5, 14, bz - 3.5], [7, 14, 7], "fell", aufblasen=0.25)
        u = m.knoch(f"unterbein_v{seite}", [bx, 15, bz], f"bein_v{seite}")
        u.kasten([bx - 2.5, 5, bz - 2.5], [5, 11, 5], "binde")
        f = m.knoch(f"huf_v{seite}", [bx, 5, bz], f"unterbein_v{seite}")
        f.kasten([bx - 3.5, 3.5, bz - 3.5], [7, 3, 7], "fessel", aufblasen=0.2)
        f.kasten([bx - 3, 0, bz - 4], [6, 4, 7], "huf")
        # Hinterbein: maechtiger Schenkel, schraege Roehre, Fessel, Huf.
        hx, hz = x * 5, 17
        o = m.knoch(f"bein_h{seite}", [hx, 31, hz], "leib")
        o.kasten([hx - 4, 16, hz - 5], [8, 16, 10], "fell", aufblasen=0.3)
        u = m.knoch(f"unterbein_h{seite}", [hx, 17, hz + 2], f"bein_h{seite}")
        u.kasten([hx - 2.5, 5, hz - 0.5], [5, 13, 5], "binde")
        f = m.knoch(f"huf_h{seite}", [hx, 5, hz + 2], f"unterbein_h{seite}")
        f.kasten([hx - 3.5, 3.5, hz - 1.5], [7, 3, 7], "fessel", aufblasen=0.2)
        f.kasten([hx - 3, 0, hz - 2], [6, 4, 7], "huf")

    # ---- der Loewenschwanz: drei Glieder, nach hinten unten, mit Quaste
    s1 = m.knoch("schwanz1", [0, 36, 22], "leib", drehung=[-48, 0, 0])
    s1.kasten([-1, 35, 21], [2, 2, 8], "fell")
    s2 = m.knoch("schwanz2", [0, 36, 29], "schwanz1", drehung=[-14, 0, 0])
    s2.kasten([-1, 35, 28.5], [2, 2, 8], "fell")
    s3 = m.knoch("schwanz3", [0, 36, 36], "schwanz2", drehung=[12, 0, 0])
    s3.kasten([-1, 35, 35.5], [2, 2, 5], "fell")
    s3.kasten([-2, 34, 39], [4, 4, 7], "maehne", aufblasen=0.1)

    # ---- der Oberkoerper: Taille, Bauch, Brustkorb
    ober = m.knoch("oberkoerper", [0, 36, -9], "leib")
    ober.kasten([-6, 35, -14], [12, 7, 9], "haut")
    ober.kasten([-5.5, 41, -14.5], [11, 6, 8], "bauchmuskel")
    # Ein Guertel und vorn ein Schurz aus Lederplatten mit Nieten - wie auf
    # Fynns Bild.
    schurz = m.knoch("schurz", [0, 36, -15], "oberkoerper")
    schurz.kasten([-6.5, 35, -14.5], [13, 2, 10], "guertel", aufblasen=0.15)
    schurz.kasten([-4.5, 32, -15.6], [9, 4, 1], "schurz")
    schurz.kasten([-4, 28, -18.2], [8, 4, 1], "schurz")
    schurz.kasten([-3.5, 24, -18.6], [7, 4, 1], "schurz")
    brust = m.knoch("brust", [0, 46, -9], "oberkoerper")
    brust.kasten([-8, 46, -15], [16, 10, 11], "brustkorb")
    brust.kasten([-7, 50, -16], [14, 5, 1], "brustmuskel")
    for x in (1, -1):
        brust.kasten([8 if x > 0 else -12, 50, -14], [4, 6, 8], "schulter", aufblasen=0.25)
    brust.kasten([-6, 56, -13], [12, 3, 7], "haut")                          # Nacken
    # Die Rueckenmaehne: ueber die Schultern den Ruecken hinab.
    rm = m.knoch("maehne", [0, 58, -6], "brust")
    rm.kasten([-7, 43, -5], [14, 16, 5], "maehne", aufblasen=0.2)
    rm.kasten([-6, 39, -2], [12, 6, 4], "maehne")
    rm.kasten([-8, 52, -10], [16, 6, 6], "maehne", aufblasen=0.2)

    # ---- Hals und Kopf
    hals = m.knoch("hals", [0, 56, -10], "brust")
    hals.kasten([-3, 55, -13], [6, 5, 6], "haut")
    kopf = m.knoch("kopf", [0, 60, -11], "hals")
    kopf.kasten([-5, 59, -16], [10, 9, 9], "kopf")
    # Eine breite Loewenschnauze, darauf vorn die Nase; die Augen sitzen
    # darueber unter einem schweren Brauenwulst.
    kopf.kasten([-3.5, 59, -20], [7, 4, 4], "schnauze")
    kopf.kasten([-2, 61.5, -21], [4, 2, 2], "nase")
    kopf.kasten([-3, 63, -18], [6, 1, 2], "schnauze")                        # Nasenruecken
    kopf.kasten([-5, 66, -17], [10, 2, 2], "braue")
    for x in (1, -1):
        kopf.kasten([2 if x > 0 else -3, 58, -20], [1, 2, 1], "zahn")        # Hauer oben
        kopf.kasten([5 if x > 0 else -6, 65, -11], [1, 3, 2], "ohr")
    kiefer = m.knoch("kiefer", [0, 60, -14], "kopf")
    kiefer.kasten([-3, 57, -19.5], [6, 2, 6], "kiefer")
    for x in (1, -1):
        kiefer.kasten([1.5 if x > 0 else -2.5, 59, -19.3], [1, 1, 1], "zahn")
    # Die Maehne steht wild und stachelig nach oben und hinten (Fynns Bild),
    # umrahmt das Gesicht und faellt als langer Bart bis auf die Brust.
    km = m.knoch("maehne_kopf", [0, 62, -9], "kopf")
    for i, w in enumerate((-56, -28, 0, 28, 56)):
        x0 = math.sin(math.radians(w)) * 5
        km.kasten([x0 - 1.5, 66, -13 - 1.5], [3, 9 - abs(i - 2), 3], "maehne",
                  drehung=[-18, 0, -w * 0.8], drehpunkt=[x0, 66, -13])
    for i, w in enumerate((-70, -40, -12, 12, 40, 70)):
        x0 = math.sin(math.radians(w)) * 6
        km.kasten([x0 - 2, 63, -9 - 2], [4, 12 - abs(round(w / 30)), 4], "maehne",
                  drehung=[-40, 0, -w * 0.7], drehpunkt=[x0, 64, -9])
    km.kasten([-6, 65, -15], [12, 3, 8], "maehne", aufblasen=0.2)             # Stirnschopf
    for x in (1, -1):
        km.kasten([5 if x > 0 else -8, 56, -16], [3, 11, 10], "maehne", aufblasen=0.25)
    km.kasten([-6, 54, -8], [12, 14, 4], "maehne", aufblasen=0.2)             # hinter dem Kopf
    km.kasten([-3.5, 50, -20], [7, 8, 4], "maehne", aufblasen=0.1)            # Bart
    km.kasten([-2.5, 45, -19.5], [5, 5, 3], "maehne")
    km.kasten([-1.5, 42, -19], [3, 3, 2], "maehne")                          # Bartquaste
    # Die Hoerner: kurz, hell und kraeftig wie bei einem Stier - seitlich aus
    # dem Kopf, nach aussen und oben, die Spitzen biegen sich nach vorn.
    for seite, x in (("l", 1), ("r", -1)):
        hx, hy, hz = x * 5, 66, -12
        h1 = m.knoch(f"horn_{seite}", [hx, hy, hz], "kopf", drehung=[0, 0, x * 24])
        h1.kasten([hx if x > 0 else hx - 5, hy - 2, hz - 2], [5, 4, 4], "horn")
        h2 = m.knoch(f"horn2_{seite}", [x * 10, hy, hz], f"horn_{seite}", drehung=[-10, -x * 30, 0])
        h2.kasten([x * 10 - 1.5, hy - 1.5, hz - 6], [3, 3, 6], "horn")
        h3 = m.knoch(f"horn3_{seite}", [x * 10, hy, hz - 6], f"horn2_{seite}", drehung=[40, 0, 0])
        h3.kasten([x * 10 - 1, hy - 1, hz - 10], [2, 2, 4], "horn")

    # ---- die Arme. Rechts (-x) die Waffe, links (+x) Schild und Bogen.
    for seite, x in (("l", 1), ("r", -1)):
        ax = x * 10.5
        a = m.knoch(f"arm_{seite}", [ax, 55, -10], "brust")
        a.kasten([ax - 2.5, 44, -12.5], [5, 12, 5], "arm", aufblasen=0.2)
        u = m.knoch(f"unterarm_{seite}", [ax, 45, -10], f"arm_{seite}")
        u.kasten([ax - 2.5, 34, -12.5], [5, 11, 5], "unterarm")
        u.kasten([ax - 3, 38, -13], [6, 2, 6], "armring")
        h = m.knoch(f"hand_{seite}", [ax, 34, -10], f"unterarm_{seite}")
        h.kasten([ax - 2.5, 30, -12.5], [5, 4, 5], "hand")

    # ---- die Waffen in der rechten Hand: nach vorn gehalten.
    wx = -10.5
    schwert = m.knoch("schwert", [wx, 32, -10], "hand_r")
    # Das Leunenschwert ist ein breites, gebogenes Hackmesser: dunkler Stahl,
    # helle Schneide unten, zur Spitze hin breiter und nach oben geschwungen.
    schwert.kasten([wx - 1, 31, -14], [2, 2, 8], "griff")
    schwert.kasten([wx - 1.5, 30, -16], [3, 4, 2], "metall")                 # Ring am Heft
    for z0, y0, hoch in ((-22, 29, 4), (-28, 28.5, 5), (-34, 28.5, 7), (-40, 29, 9)):
        schwert.kasten([wx - 0.5, y0, z0], [1, hoch, 6], "klinge")
    schwert.kasten([wx - 0.5, 30.5, -43], [1, 8, 3], "klinge")               # die breite Spitze
    schwert.kasten([wx - 0.5, 33, -45], [1, 5, 2], "klinge")
    schwert.kasten([wx - 1, 30.5, -8], [2, 3, 2], "metall")                  # Knauf
    keule = m.knoch("keule", [wx, 32, -10], "hand_r")
    keule.kasten([wx - 1, 31, -32], [2, 2, 26], "holz")
    keule.kasten([wx - 1.5, 30.5, -14], [3, 3, 5], "griff")
    keule.kasten([wx - 4, 27, -44], [8, 9, 13], "metall")
    keule.kasten([wx - 3, 28, -46], [6, 7, 2], "metall")
    for dy, dx in ((9, 0), (-1, 0), (4, 4.5), (4, -4.5)):
        for z in (-42, -36):
            keule.kasten([wx - 1 + dx, 27 + dy - 1, z], [2, 3, 2], "dorn")
    speer = m.knoch("speer", [wx, 32, -10], "hand_r")
    speer.kasten([wx - 1, 31, -48], [2, 2, 58], "holz")
    speer.kasten([wx - 1.5, 30.5, -14], [3, 3, 6], "griff")
    speer.kasten([wx - 0.5, 28, -62], [1, 8, 14], "klinge")                  # Blatt
    speer.kasten([wx - 0.5, 29.5, -66], [1, 5, 4], "klinge")
    speer.kasten([wx - 0.5, 31, -68], [1, 2, 2], "klinge")
    for y in (26, 36):
        speer.kasten([wx - 0.5, y, -52], [1, 2, 5], "klinge")                # Seitenzacken
    speer.kasten([wx - 2, 30, -49], [4, 4, 2], "metall")
    speer.kasten([wx - 1, 31, 10], [2, 2, 3], "metall")

    # ---- links: der Schild am Unterarm, der Bogen in der Hand (nur beim Schuss)
    sx = 13.5
    schild = m.knoch("schild", [10.5, 40, -10], "unterarm_l")
    # Der Leunenschild nach Fynns Bild: ein Ring mit Kupferrand und Nieten,
    # in der Mitte rotes Fell, und quer hindurch zwei grosse Halbmondklingen.
    for urs, gr in (([sx, 44, -18], [2, 2, 16]), ([sx, 30, -18], [2, 2, 16]),
                    ([sx, 32, -18], [2, 12, 2]), ([sx, 32, -4], [2, 12, 2])):
        schild.kasten(urs, gr, "schild")
    schild.kasten([sx + 0.5, 32, -16], [1, 12, 12], "maehne")                 # Fell im Ring
    for z0, r in ((-24, -1), (-2, 1)):
        schild.kasten([sx + 0.5, 31, z0], [1, 14, 6], "schildklinge")
        schild.kasten([sx + 0.5, 27, z0 + (0 if r > 0 else -2) + (2 if r > 0 else 0)], [1, 5, 4], "schildklinge")
        schild.kasten([sx + 0.5, 44, z0 + (0 if r > 0 else -2) + (2 if r > 0 else 0)], [1, 5, 4], "schildklinge")
    # In der Hand vorgedreht: Beim Zielen hebt er den Arm waagrecht nach vorn
    # (-90 Grad) - dann steht der Bogen senkrecht, wie man ihn haelt.
    bh = m.knoch("bogen_hand", [10.5, 32, -10], "hand_l", drehung=[90, 0, 0])
    bogen_bauen(bh, (10.5, 32, -10), hoehe=40, woelbung=7)
    # Auf dem Ruecken, schraeg ueber der Maehne.
    br = m.knoch("bogen_ruecken", [0, 50, -2], "brust", drehung=[0, 0, -38])
    bogen_bauen(br, (0, 50, -1), hoehe=40, woelbung=6)
    return m


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
        "metall": ["#26282c", "#44484e", "#767a82"], "klinge": ["#2a2e33", "#4e555c", "#c4c9ce"],
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
            stufe = 0.85 if texel[3].startswith("horn3") else (0.55 if texel[3].startswith("horn2") else 0.2)
            c = H.verlauf([basis, mitte, spitze], stufe + (0.1 if oben else 0.0), 4)
            if not texel[3].startswith("horn3") and int(math.floor(abs(x) * 1.0 + abs(z) * 0.6)) % 2 == 0:
                c = H.dunkler(c, 0.12)                                    # Querrillen
            return c
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
            # Dunkler Stahl, an der aeusseren Kante (weit weg vom Ring) hell.
            kl = f["klinge"]
            weit = abs(z + 10) / 14
            return H.verlauf([kl[0], kl[1], kl[2]], max(0.0, min(1.0, (weit - 0.45) * 2.4)), 3)
        if stoff == "bogen":
            c = H.verlauf([f["holz"], H.heller(f["holz"], 0.25)], t, 2)
            return c
        if stoff == "sehne":
            return (220, 214, 196)
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
    "leib": [0, 0, 0], "oberkoerper": [4, 0, 0], "brust": [2, 0, 0], "hals": [-4, 0, 0], "kopf": [6, 0, 0],
    "kiefer": [0, 0, 0],
    "arm_r": [-14, 0, -10], "unterarm_r": [-26, 0, 0], "hand_r": [0, 0, 0],
    "arm_l": [-22, 18, 14], "unterarm_l": [-56, 0, 0], "hand_l": [0, 0, 0],
    "bein_vl": [0, 0, 0], "bein_vr": [0, 0, 0], "unterbein_vl": [0, 0, 0], "unterbein_vr": [0, 0, 0],
    "huf_vl": [0, 0, 0], "huf_vr": [0, 0, 0],
    "bein_hl": [10, 0, 0], "bein_hr": [10, 0, 0], "unterbein_hl": [-20, 0, 0], "unterbein_hr": [-20, 0, 0],
    "huf_hl": [10, 0, 0], "huf_hr": [10, 0, 0],
    "schwanz1": [0, 0, 0], "schwanz2": [0, 0, 0], "schwanz3": [0, 0, 0],
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
    knochen["brust"]["rotation"] = [f"2.0 + math.sin({T} * 70.0) * 1.5", 0.0, 0.0]
    knochen["kopf"]["rotation"] = [f"6.0 + math.sin({T} * 70.0 - 60.0) * 2.0", f"math.sin({T} * 23.0) * 14.0",
                                   f"math.sin({T} * 17.0) * 4.0"]
    knochen["kiefer"]["rotation"] = [f"math.max(0.0, math.sin({T} * 29.0) - 0.92) * 140.0", 0.0, 0.0]
    knochen["arm_r"]["rotation"] = [f"-14.0 + math.sin({T} * 70.0) * 3.0", 0.0, -10.0]
    knochen["schwanz1"]["rotation"] = [f"math.sin({T} * 50.0) * 6.0", f"math.sin({T} * 80.0) * 18.0", 0.0]
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
