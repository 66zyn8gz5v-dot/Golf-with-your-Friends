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
import haut as H


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
    """4.88: Basaltplatten im Verlauf, die Glut nur noch in den Fugen
    zwischen den Platten - durchgehende Linien, keine verstreuten Punkte."""
    panzer, hell, glutfarbe, gluthell = GLUTSKORPION_FARBEN.get(variante, GLUTSKORPION_FARBEN["glut"])

    def male(stoff, p, n, texel):
        x, y, z = p
        platte = H.verlauf([H.dunkler(panzer, 0.2), panzer, hell], H.hoehe(p, n, texel), 3)
        if stoff == "panzer":
            if abs(n[0]) > 0.5 and abs(z + 3.5) < 0.6 and y > 4.2:
                return glut(gluthell)                                           # Augen
            if n[1] > 0.5 and int(math.floor(z)) % 3 == 0:
                return glut(glutfarbe)
            if abs(n[0]) > 0.5 and int(math.floor(z)) % 3 == 0 and H.hoehe(p, n, texel) > 0.5:
                return glut(glutfarbe, -0.25)                                   # die Fuge laeuft die Flanke hinab
            return platte
        if stoff == "unterseite":
            return glut(glutfarbe, -0.45)
        if stoff == "schere":
            if n[1] > 0.5 and abs(x) % 3 < 0.6:
                return glut(glutfarbe, -0.15)
            return platte
        if stoff == "schwanz":
            if int(math.floor(z)) % 4 == 0:
                return glut(glutfarbe, -0.1)
            return platte
        if stoff == "blase":
            return glut(H.verlauf([glutfarbe, gluthell], H.hoehe(p, n, texel), 3))
        if stoff == "stachel":
            return glut(gluthell)
        if stoff == "bein":
            return H.verlauf([panzer, hell], H.hoehe(p, n, texel), 2)
        return platte
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
    """4.88: ohne helle Sprenkel. Das Chitin wird zum Ruecken hin heller,
    die Kristalle leuchten von unten dunkel nach oben hell, die Beine haben
    helle Gelenkringe."""
    chitin, hell, kristall, kristallhell = KRISTALLSPINNE_FARBEN.get(variante, KRISTALLSPINNE_FARBEN["amethyst"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "kristall":
            return glut(H.verlauf([kristall, kristallhell], H.hoehe(p, n, texel), 3), -0.05)
        if stoff == "kopf":
            if n[2] < -0.5 and y > 6.5 and int(x + 3) % 2 == 0:
                return glut(kristallhell)
            return H.koerper(p, n, texel, H.dunkler(chitin, 0.1), chitin, hell, stufen=3)
        if stoff == "chitin":
            if n[1] > 0.5 and z > 0 and abs(abs(x) - abs(z - 5)) < 0.6:
                return glut(mische(hexfarbe(kristall), hexfarbe(chitin), 0.55))
            return H.koerper(p, n, texel, H.dunkler(chitin, 0.15), chitin, hell, grenze=0.25, stufen=4)
        if stoff == "fang":
            return glut(kristall, -0.3)
        if stoff == "bein":
            if texel[0] % 4 == 0:
                return H.farbe(hell)                                            # Gelenkring
            return H.verlauf([H.dunkler(chitin, 0.1), chitin], H.hoehe(p, n, texel), 2)
        return H.farbe(chitin)
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
    """4.88: Die Huelle ist kein Funkenregen mehr, sondern ein leuchtendes
    Gitter an ihren Kanten - wie ein Kaefig aus Licht um den Kern."""
    innen, aussen = IRRLICHT_FARBEN.get(variante, IRRLICHT_FARBEN["blass"])

    def male(stoff, p, n, texel):
        if stoff == "kern":
            return glut(innen)
        if stoff == "huelle":
            k = H.kasten_von(texel)
            if k is None:
                return glut(aussen, -0.1)
            nah = 0
            for a in range(3):
                if abs(n[a]) > 0.5:
                    continue
                lo, hi = k.ursprung[a], k.ursprung[a] + k.groesse[a]
                if min(p[a] - lo, hi - p[a]) < 0.7:
                    nah += 1
            return glut(aussen, -0.1) if nah else None
        if stoff == "zunge":
            return glut(mische(hexfarbe(innen), hexfarbe(aussen), 0.5))
        return glut(aussen)
    return male


# ================================================================== Werwolf (4.82)

def werwolf_modell():
    """Zwei Gestalten in einem Modell: der Wanderer im Kapuzenmantel und der
    Wolf, der aufrecht auf zwei Beinen steht, gebeugt, mit langen Armen.
    Welche man sieht, schalten die Bewegungen (Groesse 0 oder 1)."""
    m = Modell("werwolf", sichtbreite=1.4, sichthoehe=2.6)
    # --- Der Wanderer
    mensch = m.knoch("mensch", [0, 12, 0])
    mensch.kasten([-4, 12, -2], [8, 12, 4], "mantel")
    mkopf = m.knoch("mensch_kopf", [0, 24, 0], "mensch")
    mkopf.kasten([-4, 24, -4], [8, 8, 8], "gesicht")
    mkopf.kasten([-4.5, 24, -4.5], [9, 9, 9], "kapuze")
    for seite, x in (("links", 6), ("rechts", -6)):
        a = m.knoch(f"mensch_arm_{seite}", [x, 22, 0], "mensch")
        a.kasten([x - 2, 12, -2], [4, 12, 4], "aermel")
        b = m.knoch(f"mensch_bein_{seite}", [x / 3, 12, 0], "mensch")
        b.kasten([x / 3 - 2, 0, -2], [4, 12, 4], "hose")
    stab = m.knoch("stab", [6, 14, -1], "mensch_arm_links")
    stab.kasten([5.5, 0, -2.5], [1, 26, 1], "stab")
    # --- Der Wolf
    wolf = m.knoch("wolf", [0, 18, 0])
    wolf.kasten([-6, 14, -4], [12, 14, 9], "fell")                    # Brust, maechtig
    wolf.kasten([-5, 10, -3], [10, 5, 7], "fell")                     # Huefte
    wolf.kasten([-5.5, 24, -5], [11, 5, 10], "maehne")
    wkopf = m.knoch("wolf_kopf", [0, 28, -4], "wolf")
    wkopf.kasten([-4, 26, -11], [8, 7, 7], "wolfskopf")
    wkopf.kasten([-2.5, 26, -16], [5, 4, 5], "schnauze")
    paar(wkopf, [1.5, 33, -7], [2, 4, 2], "ohr")
    kiefer = m.knoch("wolf_kiefer", [0, 26.5, -11], "wolf_kopf")
    kiefer.kasten([-2, 25, -16], [4, 1.5, 5], "kiefer")
    for seite, x in (("links", 8), ("rechts", -8)):
        a = m.knoch(f"wolf_arm_{seite}", [x, 26, -1], "wolf")
        a.kasten([x - 2.5, 13, -3.5], [5, 13, 5], "fell")
        pfote = m.knoch(f"wolf_pranke_{seite}", [x, 13, -1], f"wolf_arm_{seite}")
        pfote.kasten([x - 2.5, 5, -3.5], [5, 8, 5], "fell")
        for i in range(3):
            pfote.kasten([x - 2 + i * 1.6, 3, -3.5], [1, 2, 1], "kralle")
        # Die Beine knicken nach hinten ab, wie bei einem Wolf.
        ob = m.knoch(f"wolf_bein_{seite}", [x / 2, 12, 0], "wolf", drehung=[-20, 0, 0])
        ob.kasten([x / 2 - 2.5, 6, -2.5], [5, 7, 6], "fell")
        un = m.knoch(f"wolf_lauf_{seite}", [x / 2, 6.5, 3], f"wolf_bein_{seite}", drehung=[45, 0, 0])
        un.kasten([x / 2 - 1.5, 0, 1.5], [3, 7, 3], "fell")
        un.kasten([x / 2 - 2, 0, -1.5], [4, 2, 4], "pfote")
    schwanz = m.knoch("wolf_schwanz", [0, 13, 4], "wolf", drehung=[-30, 0, 0])
    schwanz.kasten([-1.5, 11.5, 4], [3, 3, 10], "fell")
    return m


WERWOLF_FARBEN = {
    # Fell, Fell dunkel, Mantel, Augen
    "grau": ("#6a665e", "#3e3a36", "#4a3a2a", "#ffcf2a"),
    "schwarz": ("#2e2c2a", "#18171a", "#2a3a2e", "#ff4a2a"),
}


def werwolf_maler(variante):
    """4.88: Fell ohne Flecken - der Ruecken dunkel, zum Bauch und zur Brust
    hin in Stufen heller; die Maehne als ganze dunkle Flaeche."""
    fell, dunkel, mantel, augen = WERWOLF_FARBEN.get(variante, WERWOLF_FARBEN["grau"])
    bauch = mische(hexfarbe(fell), (220, 210, 190), 0.3)

    def pelz(p, n, texel):
        return H.koerper(p, n, texel, bauch, fell, dunkel, grenze=0.25, stufen=4)

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "gesicht":
            if n[2] < -0.5:
                if abs(y - 28.5) < 0.6 and abs(abs(x) - 2) < 0.6:
                    return glut(augen, -0.3)
                if 25 < y < 27.5 and abs(x) < 2.5:
                    return H.farbe(dunkel)                                    # der Bart
                return hexfarbe("#b08a6a")
            return H.farbe(dunkel)
        if stoff == "kapuze":
            if n[2] < -0.5 and abs(x) < 3.5 and y < 31:
                return None
            return H.verlauf([H.dunkler(mantel, 0.15), mantel], H.hoehe(p, n, texel), 3)
        if stoff in ("mantel", "aermel"):
            if stoff == "mantel" and 12 < y < 13.5:
                return hexfarbe("#2a1e14")                                    # Guertel
            return H.verlauf([H.dunkler(mantel, 0.2), mantel, H.heller(mantel, 0.08)], H.hoehe(p, n, texel), 3)
        if stoff == "hose":
            return H.verlauf(["#2e2820", "#3a3228"], H.hoehe(p, n, texel), 2)
        if stoff == "stab":
            return hexfarbe("#6a4a2a")
        if stoff == "maehne":
            return H.verlauf([H.dunkler(dunkel, 0.15), dunkel], H.hoehe(p, n, texel), 2)
        if stoff == "fell":
            if n[2] < -0.5 and y > 14:
                return bauch                                                  # helle Brust
            return pelz(p, n, texel)
        if stoff == "wolfskopf":
            if abs(n[0]) > 0.5 and abs(y - 30.5) < 0.6 and -10 < z < -8:
                return glut(augen)
            return pelz(p, n, texel)
        if stoff == "schnauze":
            if n[2] < -0.5 and y > 28.5:
                return hexfarbe("#141010")                                    # Nase
            if n[1] < -0.5 or y < 27:
                return hexfarbe("#f0e8d4") if texel[0] % 2 == 0 else H.farbe(dunkel)
            return pelz(p, n, texel)
        if stoff == "kiefer":
            if n[1] > 0.5 and texel[0] % 2 == 0:
                return hexfarbe("#f0e8d4")
            return H.farbe(dunkel)
        if stoff == "ohr":
            return H.farbe(dunkel)
        if stoff == "kralle":
            return hexfarbe("#e0d8c4")
        if stoff == "pfote":
            return H.farbe(dunkel)
        return pelz(p, n, texel)
    return male


# ================================================================== Moosgolem (4.82)

def moosgolem_modell():
    m = Modell("moosgolem", sichtbreite=2.4, sichthoehe=3.4)
    k = m.knoch("koerper", [0, 18, 0])
    k.kasten([-10, 18, -6], [20, 16, 12], "stein")
    k.kasten([-10.5, 30, -6.5], [21, 5, 13], "moos")                 # Moosschultern
    k.kasten([-3, 24, -6.6], [6, 6, 1], "kern")                       # das gluehende Herz im Stein
    kopf = m.knoch("kopf", [0, 34, -1], "koerper")
    kopf.kasten([-5, 34, -6], [10, 9, 9], "stein")
    kopf.kasten([-5.5, 41, -6.5], [11, 3, 10], "moos")
    kopf.kasten([-6, 38, -7], [12, 2, 3], "braue")
    for x, z in ((-3, -3), (2, -1), (-1, 1)):
        kopf.kasten([x, 44, z], [1, 2, 1], "blume")
    for seite, x in (("links", 13), ("rechts", -13)):
        a = m.knoch(f"arm_{seite}", [x, 32, 0], "koerper")
        a.kasten([x - 3, 16, -3.5], [6, 17, 7], "stein")
        a.kasten([x - 3.5, 28, -4], [7, 5, 8], "moos")
        faust = m.knoch(f"faust_{seite}", [x, 16, 0], f"arm_{seite}")
        faust.kasten([x - 4, 6, -4.5], [8, 10, 9], "stein")
        faust.kasten([x - 4.5, 11, -5], [9, 2, 10], "ranke")
        b = m.knoch(f"bein_{seite}", [x / 2.6, 18, 0], "koerper")
        b.kasten([x / 2.6 - 4, 0, -4], [8, 18, 8], "stein")
        b.kasten([x / 2.6 - 4.5, 0, -4.5], [9, 3, 9], "moos")
    return m


MOOSGOLEM_FARBEN = {
    # Stein, Stein dunkel, Moos, Kern
    "wald": ("#7a7a74", "#4e4e4a", "#4e7a2e", "#7affa0"),
    "tiefwald": ("#5e6058", "#383a34", "#2e5a26", "#a0ffda"),
}


def moosgolem_maler(variante):
    """4.88: Steinquader mit Fugen (Linien), oben bemoost als ganze Kante
    statt verstreuter Moospunkte; das Moos selbst oben hell, unten dunkler."""
    stein, dunkel, moos, kern = MOOSGOLEM_FARBEN.get(variante, MOOSGOLEM_FARBEN["wald"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "stein":
            if y > 34 and n[2] < -0.5 and abs(y - 37) < 1 and abs(abs(x) - 2.5) < 1:
                return glut(kern)                                               # Augen
            if n[1] > 0.5:
                return H.farbe(moos)
            if texel[1] % 5 == 0 or (texel[0] + (texel[1] // 5) * 3) % 6 == 0:
                return H.farbe(dunkel)                                        # Fugen
            # Oben an der Flanke kriecht das Moos ein Stueck herunter.
            if H.hoehe(p, n, texel) > 0.9:
                return H.dunkler(moos, 0.1)
            return H.verlauf([H.dunkler(stein, 0.1), stein], H.hoehe(p, n, texel), 3)
        if stoff == "moos":
            if n[1] < -0.5 and texel[0] % 3 == 0:
                return None                                                   # herabhaengende Faeden
            return H.verlauf([H.dunkler(moos, 0.2), moos, mische(hexfarbe(moos), (140, 170, 60), 0.3)],
                             H.hoehe(p, n, texel), 3)
        if stoff == "kern":
            # Von der Mitte nach aussen: hell, Glut, dunkler Rand.
            k = H.kasten_von(texel)
            if k is not None:
                mx = k.ursprung[0] + k.groesse[0] / 2
                my = k.ursprung[1] + k.groesse[1] / 2
                r = max(abs(x - mx) / (k.groesse[0] / 2), abs(y - my) / (k.groesse[1] / 2))
                if r > 0.8:
                    return H.farbe(dunkel)
                return glut(H.verlauf([H.heller(kern, 0.4), kern], r / 0.8, 3))
            return glut(kern)
        if stoff == "braue":
            return H.farbe(dunkel)
        if stoff == "blume":
            return glut("#ff8ab8") if n[1] > 0.5 else hexfarbe("#3a6a22")
        if stoff == "ranke":
            if texel[0] % 2 == 0:
                return hexfarbe("#3a5a1e")
            return None
        return H.farbe(stein)
    return male


# ================================================================== Greif (4.83)

from tiere_gestalt import beine  # noqa: E402


def greif_modell():
    """Adlerkopf, Loewenkoerper, grosse Federschwingen - das Wappentier des
    Mittelalters. Vorn Adlerfaenge, hinten Loewenpfoten, der Schwanz mit
    Quaste. Mit Sattel (der Knochen heisst wie beim Elch, dann schaltet ihn
    dieselbe Darstellung ein)."""
    m = Modell("greif", sichtbreite=3.2, sichthoehe=2.0)
    body = m.knoch("body", [0, 13, 0])
    body.kasten([-4, 9, -6], [8, 8, 14], "fell")
    body.kasten([-4.5, 9.5, -7.5], [9, 8.5, 5], "brustfedern")
    kopf = m.knoch("head", [0, 17, -7], "body")
    kopf.kasten([-3, 16, -12], [6, 6, 6], "kopf")
    kopf.kasten([-3.5, 14.5, -9], [7, 4, 3], "brustfedern")                 # die Halskrause
    kopf.kasten([-1.5, 16.5, -15], [3, 3, 3], "schnabel")
    kopf.kasten([-1, 15.5, -15.5], [2, 1, 1.5], "schnabel")                  # der Haken
    paar(kopf, [1.5, 21.5, -8.5], [1, 2, 2], "brustfedern")                   # Federohren
    schwanz = m.knoch("tail", [0, 15, 8], "body", drehung=[-25, 0, 0])
    schwanz.kasten([-1, 14, 8], [2, 2, 10], "fell")
    s2 = m.knoch("tail2", [0, 15, 18], "tail", drehung=[20, 0, 0])
    s2.kasten([-1, 14, 18], [2, 2, 5], "fell")
    s2.kasten([-1.5, 13.5, 22], [3, 3, 3], "quaste")
    for seite, x in (("links", 4), ("rechts", -4)):
        z_ = 1 if x > 0 else -1
        f = m.knoch(f"fluegel_{seite}", [x, 16, -3], "body")
        f.kasten([x if x > 0 else x - 12, 15.5, -4], [12, 1, 9], "schwinge")
        f.kasten([x if x > 0 else x - 7, 16.2, -4], [7, 1, 5], "deckfedern")
        sp = m.knoch(f"fluegelspitze_{seite}", [x + 12 * z_, 16, -3], f"fluegel_{seite}")
        sx = x + 12 * z_
        sp.kasten([sx if x > 0 else sx - 13, 15.5, -3.5], [13, 1, 8], "schwinge")
    sattel = m.knoch("sattel", [0, 17, 0], "body")
    sattel.kasten([-4.5, 16.8, -2.5], [9, 1, 7], "sattel")
    sattel.kasten([-1, 17.8, -2.5], [2, 1, 1], "sattel")
    beine(m, "body", 2.5, -3.5, 5, (3, 9, 3), 9, pfote=(4, 2, 4), krallen=True)
    return m


GREIF_FARBEN = {
    # Kopf, Kopf dunkel, Loewe, Loewe dunkel, Schwinge
    "gold": ("#e8d8a8", "#a0784a", "#c89a58", "#8a6a3a", "#6a4a2a"),
    "weiss": ("#f4f2ea", "#b8b4a8", "#c8a468", "#8e6e40", "#4a3a2e"),
    "schwarz": ("#3a3a40", "#1e1e22", "#2e2c2a", "#1a1918", "#26262c"),
}


def greif_maler(variante):
    """4.88: Federn als Reihen - jede Reihe unten mit einer dunkleren Kante,
    wie Dachziegel - statt eines Schachbretts; das Loewenfell im Verlauf vom
    hellen Bauch zum dunkleren Ruecken."""
    kopf, kopfdunkel, loewe, loewedunkel, schwinge = GREIF_FARBEN.get(variante, GREIF_FARBEN["gold"])
    bauch = mische(hexfarbe(loewe), (240, 225, 190), 0.35)

    def federreihen(grund, p, n, texel):
        if texel[1] % 3 == 2:
            return H.dunkler(grund, 0.18)
        return H.verlauf([H.dunkler(grund, 0.06), grund], H.hoehe(p, n, texel), 2)

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "kopf":
            if abs(n[0]) > 0.5 and abs(y - 19.5) < 0.6 and abs(z + 10.5) < 1.1:
                return hexfarbe("#140a04") if abs(z + 10.5) < 0.4 else glut("#ffb21a", -0.2)
            return H.verlauf([H.heller(kopf, 0.08), kopf, mische(hexfarbe(kopf), hexfarbe(kopfdunkel), 0.35)],
                             H.hoehe(p, n, texel), 3)
        if stoff == "schnabel":
            return H.verlauf(["#8a6a2a", "#e0b030"], H.hoehe(p, n, texel), 2)
        if stoff == "brustfedern":
            return federreihen(kopf, p, n, texel)
        if stoff == "deckfedern":
            return federreihen(schwinge, p, n, texel)
        if stoff == "schwinge":
            hinten = z - (-4)
            if hinten > 8 - (1 if texel[0] % 2 else 0) and abs(x) > 8:
                return None
            if texel[0] % 3 == 0:
                return H.dunkler(schwinge, 0.25)                               # Federkiele
            return H.verlauf([schwinge, H.heller(schwinge, 0.12)], hinten / 8.0, 3)
        if stoff == "fell":
            return H.koerper(p, n, texel, bauch, loewe, loewedunkel, grenze=0.25, stufen=4)
        if stoff == "quaste":
            return H.farbe(loewedunkel)
        if stoff == "bein":
            if z < 0:
                return H.dunkler("#e0b030", 0.12) if texel[1] % 2 == 0 else hexfarbe("#e0b030")
            return H.verlauf([loewedunkel, loewe], H.hoehe(p, n, texel), 3)
        if stoff == "pfote":
            return hexfarbe("#e0b030") if z < 0 else H.farbe(loewedunkel)
        if stoff == "kralle":
            return hexfarbe("#1a1410")
        if stoff == "sattel":
            if texel[0] % 4 == 0:
                return hexfarbe("#a8894a")
            return hexfarbe("#5a3a22")
        return H.farbe(loewe)
    return male


