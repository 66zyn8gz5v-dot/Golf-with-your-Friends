#!/usr/bin/env python3
"""Die Fantasy-Wesen, zweite Welle (4.81 bis 4.83) - Gestalt und Haut.

Fynn: "Mach am besten sechs neue Mobs." Gewaehlt hat er Greif, Werwolf,
Moosgolem, Glutskorpion und Kristallspinne; das Irrlicht kam als sechstes
dazu. Hier stehen zuerst die kleineren drei (4.81).

Was leuchtet, bekommt Alpha 254 (siehe fantasy_gestalt.glut).
"""

import math

from tiermodell import Modell, hexfarbe, mische, streu
from tiere_gestalt import ton, paar
from fantasy_gestalt import glut


# ================================================================== Glutskorpion

def glutskorpion_modell():
    m = Modell("glutskorpion", sichtbreite=1.8, sichthoehe=1.2)
    k = m.knoch("koerper", [0, 4, 0])
    k.kasten([-4, 2, -5], [8, 4, 7], "panzer")                  # Kopfbrust
    k.kasten([-3.5, 2.5, 2], [7, 3.5, 7], "panzer")             # Hinterleib
    k.kasten([-3, 1.5, -4], [6, 1, 12], "unterseite")
    # Acht Beine, je ein Knochen: nach aussen, dann nach unten.
    for i in range(4):
        z = -3.5 + i * 2.5
        for seite, x in ((0, 4), (1, -4)):
            b = m.knoch(f"bein{i * 2 + seite}", [x, 3, z], "koerper")
            aussen = x if x > 0 else x - 3
            b.kasten([aussen, 2.5, z - 0.5], [3, 1, 1], "bein")
            b.kasten([x + 2 if x > 0 else x - 3, 0, z - 0.5], [1, 3, 1], "bein")
    # Die Scheren: Arm, Zange, bewegliche Finger.
    for seite, x in (("links", 2.5), ("rechts", -2.5)):
        arm = m.knoch(f"arm_{seite}", [x, 4, -5], "koerper")
        arm.kasten([x - 1, 3, -9], [2, 2, 4], "panzer")
        zange = m.knoch(f"schere_{seite}", [x, 4, -9], f"arm_{seite}")
        zange.kasten([x - 1.5, 2.5, -13], [3, 3, 4], "schere")
        finger = m.knoch(f"finger_{seite}", [x + (1 if x > 0 else -1), 4, -13], f"schere_{seite}")
        finger.kasten([x + (0.5 if x > 0 else -1.5), 3, -16], [1, 2, 3], "schere")
        zange.kasten([x - (1.5 if x > 0 else -0.5), 3, -16], [1, 2, 3], "schere")
    # Der Schwanz: fuenf Glieder, die sich ueber den Ruecken biegen.
    eltern, z0, y0 = "koerper", 9, 4.5
    for i in range(5):
        g = m.knoch(f"schwanz{i + 1}", [0, y0, z0], eltern, drehung=[32 if i else 20, 0, 0])
        g.kasten([-1.5 + i * 0.2, y0 - 1.5, z0], [3 - i * 0.4, 3 - i * 0.3, 4], "schwanz")
        eltern, z0 = f"schwanz{i + 1}", z0 + 4
    stachel = m.knoch("stachel", [0, y0, z0], eltern, drehung=[40, 0, 0])
    stachel.kasten([-1, y0 - 1, z0], [2, 2, 3], "blase")
    stachel.kasten([-0.5, y0 - 1.5, z0 + 3], [1, 1, 2], "stachel")
    return m


GLUTSKORPION_FARBEN = {
    # Panzer, Panzer hell, Glut, Glut hell
    "glut": ("#2a2226", "#3e3438", "#ff6a1a", "#ffd24a"),
    "seele": ("#1c2228", "#2e3a42", "#2aa8d8", "#9af0ff"),
}


def glutskorpion_maler(variante):
    panzer, hell, glutfarbe, gluthell = GLUTSKORPION_FARBEN.get(variante, GLUTSKORPION_FARBEN["glut"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "panzer":
            # Basaltplatten mit gluehenden Rissen dazwischen.
            if n[1] > 0.5 and int(math.floor(z)) % 3 == 0:
                return glut(glutfarbe)
            if streu(texel[0], texel[1], 901) < 0.08:
                return glut(glutfarbe, -0.2)
            if abs(n[0]) > 0.5 and abs(z + 3.5) < 0.6 and y > 4.2:
                return glut(gluthell)                                           # Augen
            return ton(hell if n[1] > 0.5 else panzer, p, n, texel, 902, straehne=0.0)
        if stoff == "unterseite":
            return glut(glutfarbe, -0.45)
        if stoff == "schere":
            if n[1] > 0.5 and texel[0] % 3 == 0:
                return glut(glutfarbe, -0.15)
            return ton(hell, p, n, texel, 903, straehne=0.0)
        if stoff == "schwanz":
            if int(math.floor(z)) % 4 == 0:
                return glut(glutfarbe, -0.1)
            return ton(panzer, p, n, texel, 904, straehne=0.0, hell=0.08)
        if stoff == "blase":
            return glut(glutfarbe)
        if stoff == "stachel":
            return glut(gluthell)
        if stoff == "bein":
            return ton(panzer, p, n, texel, 905, straehne=0.0, hell=0.12)
        return ton(panzer, p, n, texel, 906)
    return male


# ================================================================== Kristallspinne

def kristallspinne_modell():
    m = Modell("kristallspinne", sichtbreite=2.2, sichthoehe=1.2)
    k = m.knoch("koerper", [0, 7, 0])
    k.kasten([-4, 5, -6], [8, 5, 6], "chitin")                  # Kopfbrust
    k.kasten([-5, 5, 0], [10, 7, 10], "chitin")                 # Hinterleib
    kr = m.knoch("kristalle", [0, 12, 5], "koerper")
    for x, z, h, w in ((-2, 2, 4, 2), (1, 3, 5, 2), (-3, 6, 3, 1), (2, 7, 3, 1), (-0.5, 5, 6, 1), (3, 1, 2, 1)):
        kr.kasten([x, 12, z], [w, h, w], "kristall")
    kopf = m.knoch("kopf", [0, 7, -6], "koerper")
    kopf.kasten([-3, 5, -10], [6, 4, 4], "kopf")
    paar(kopf, [1, 4, -11], [1, 2, 1], "fang")
    # Acht lange Beine mit Knie, im Bogen nach aussen und unten.
    for i in range(4):
        z = -5 + i * 2.5
        for seite, x in ((0, 4), (1, -4)):
            nr = i * 2 + seite
            b = m.knoch(f"bein{nr}", [x, 8, z], "koerper", drehung=[0, 0, 35 if x > 0 else -35])
            b.kasten([x if x > 0 else x - 8, 7.5, z - 0.5], [8, 1, 1], "bein")
            kx = x + 8 if x > 0 else x - 8
            u = m.knoch(f"knie{nr}", [kx, 8, z], f"bein{nr}", drehung=[0, 0, 105 if x > 0 else -105])
            u.kasten([kx if x > 0 else kx - 9, 7.5, z - 0.5], [9, 1, 1], "bein")
    return m


KRISTALLSPINNE_FARBEN = {
    # Chitin, Chitin hell, Kristall, Kristall hell
    "amethyst": ("#241c2e", "#3a2e48", "#a86ae0", "#e0c0ff"),
    "smaragd": ("#1a2622", "#2c3e36", "#3ac878", "#b0ffd0"),
}


def kristallspinne_maler(variante):
    chitin, hell, kristall, kristallhell = KRISTALLSPINNE_FARBEN.get(variante, KRISTALLSPINNE_FARBEN["amethyst"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "kristall":
            if n[1] > 0.5 or texel[0] % 2 == 0:
                return glut(kristallhell, -0.1)
            return glut(kristall)
        if stoff == "kopf":
            # Acht Augen vorn, leuchtend wie die Kristalle.
            if n[2] < -0.5 and y > 6.5 and int(x + 3) % 2 == 0:
                return glut(kristallhell)
            return ton(hell, p, n, texel, 911, straehne=0.0)
        if stoff == "chitin":
            # Ein Rautenmuster auf dem Hinterleib, leise in Kristallfarbe.
            if n[1] > 0.5 and z > 0 and abs(abs(x) - abs(z - 5)) < 0.6:
                return glut(mische(hexfarbe(kristall), hexfarbe(chitin), 0.55))
            if streu(texel[0], texel[1], 912) < 0.15:
                return ton(hell, p, n, texel, 913, straehne=0.0)
            return ton(chitin, p, n, texel, 914, straehne=0.0)
        if stoff == "fang":
            return glut(kristall, -0.3)
        if stoff == "bein":
            if texel[0] % 4 == 0:
                return ton(hell, p, n, texel, 915, straehne=0.0)
            return ton(chitin, p, n, texel, 916, straehne=0.0)
        return ton(chitin, p, n, texel, 917)
    return male


# ================================================================== Irrlicht

def irrlicht_modell():
    """Ein Licht, das schwebt: ein heller Kern, darum eine flackernde Huelle
    und drei kleine Flammenzungen, die sich im Kreis drehen."""
    m = Modell("irrlicht", sichtbreite=0.8, sichthoehe=1.0)
    kern = m.knoch("kern", [0, 8, 0])
    kern.kasten([-1.5, 6.5, -1.5], [3, 3, 3], "kern")
    huelle = m.knoch("huelle", [0, 8, 0], "kern")
    huelle.kasten([-2.5, 5.5, -2.5], [5, 5, 5], "huelle")
    kranz = m.knoch("kranz", [0, 8, 0], "kern")
    for w in (0, 120, 240):
        r = math.radians(w)
        kranz.kasten([round(math.cos(r) * 4 - 0.5, 1), 7.5, round(math.sin(r) * 4 - 0.5, 1)], [1, 1, 1], "zunge")
    spitze = m.knoch("spitze", [0, 10.5, 0], "kern")
    spitze.kasten([-1, 10.5, -1], [2, 3, 2], "huelle")
    return m


IRRLICHT_FARBEN = {"blass": ("#e0fff0", "#7affc0"), "blau": ("#e0f4ff", "#6ab8ff")}


def irrlicht_maler(variante):
    innen, aussen = IRRLICHT_FARBEN.get(variante, IRRLICHT_FARBEN["blass"])

    def male(stoff, p, n, texel):
        if stoff == "kern":
            return glut(innen)
        if stoff == "huelle":
            # Nur vereinzelte Funken - dazwischen sieht man den Kern.
            if (texel[0] * 7 + texel[1] * 3) % 5 == 0:
                return glut(aussen, -0.1)
            return None
        if stoff == "zunge":
            return glut(mische(hexfarbe(innen), hexfarbe(aussen), 0.5))
        return glut(aussen)
    return male
