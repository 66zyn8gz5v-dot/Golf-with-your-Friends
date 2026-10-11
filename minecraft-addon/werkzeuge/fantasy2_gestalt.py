#!/usr/bin/env python3
"""Die Fantasy-Wesen, zweite Welle (4.81 bis 4.83) - Gestalt und Haut.

Fynn: "Mach am besten sechs neue Mobs." Gewaehlt hat er Greif, Werwolf
(seit 5.1 wieder draussen), Moosgolem, Glutskorpion und Kristallspinne; das Irrlicht kam als sechstes
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


# ================================================================== Moosgolem (4.82, neu 5.1)
#
# 5.1 - Fynn: "Der sieht kakafuzzi aus. Der sollte schoen breit sein, so ein
# bisschen runde Vibes, wie so ein Steinriese, der leicht bemoost ist, recht
# kleine Beine, grosse Arme ... kann Steine werfen, die Teil seiner Arme
# sind ... mit einer gewissen Wahrscheinlichkeit ein Erz auf dem Ruecken."
#
# Rund wird ein Klotz aus drei ineinandergesteckten Kaesten, jeder an zwei
# Achsen eingezogen: So bricht jede Kante einmal ab, und der Fels wirkt
# gerundet statt wuerfelig.

def rundling(k, ursprung, groesse, stoff, fase=1):
    x, y, z = ursprung
    w, h, d = groesse
    f = fase
    # Die beiden eingezogenen Kaesten heissen "~rand": Ihr Deckel ist nur
    # die abgebrochene Kante, dort waechst kein Moos (sonst zieht sich um
    # jede Stufe ein gruener Strich).
    k.kasten([x, y + f, z + f], [w, h - 2 * f, d - 2 * f], stoff + "~rand")
    k.kasten([x + f, y, z + f], [w - 2 * f, h, d - 2 * f], stoff)
    k.kasten([x + f, y + f, z], [w - 2 * f, h - 2 * f, d], stoff + "~rand")


# Die Erze auf dem Buckel, von gewoehnlich bis legendaer. Die Nummer ist der
# Wert von fynn:erz; welcher Stein wie oft kommt, wuerfelt das Spiel beim
# Erscheinen (fantasy2_daten._moosgolem), die Beute steht dort auch.
# (Name, Seltenheit, dunkel, mittel, hell)
GOLEMERZE = {
    1: ("Amethyst", "gewöhnlich", "#5a2e8a", "#a070e0", "#e8d0ff"),
    2: ("Lapislazuli", "ungewöhnlich", "#1a2e7a", "#3a64d8", "#a8c4ff"),
    3: ("Smaragd", "selten", "#0e5a2e", "#2ec862", "#b8ffd0"),
    4: ("Rubin", "sehr selten", "#6a0a1a", "#e0283e", "#ffc0c8"),
    5: ("Diamant", "legendär", "#1a6a78", "#5ae8e8", "#f0ffff"),
}

# Jeder Kristall: Fuss (x, z), Breite, Hoehe, Neigung (um x, um z). Die
# hoeheren Stufen tragen mehr und groessere Kristalle.
ERZKRISTALLE = {
    1: [(-3, 4, 2, 9, (-14, 12)), (1, 5, 3, 11, (6, -10)), (-5, 7, 2, 6, (18, 28)), (4, 3, 2, 6, (-20, -26)),
        (0, 8, 2, 5, (30, -4))],
    2: [(-3, 3, 4, 7, (-8, 10)), (1, 5, 4, 6, (10, -14)), (-5, 7, 3, 4, (16, 22)), (3, 8, 3, 4, (22, -20))],
    3: [(-1, 4, 3, 13, (-6, 6)), (-5, 5, 2, 9, (12, 22)), (3, 5, 3, 10, (10, -16)), (0, 8, 2, 6, (28, 0))],
    4: [(-2, 3, 4, 12, (-10, 8)), (2, 6, 3, 9, (8, -20)), (-6, 6, 3, 8, (14, 26)), (1, 9, 2, 5, (30, -6))],
    5: [(-2, 3, 4, 15, (-8, 6)), (3, 4, 3, 11, (6, -22)), (-6, 5, 3, 10, (12, 28)), (0, 8, 3, 8, (32, 0)),
        (5, 8, 2, 6, (24, -36))],
}


def moosgolem_modell():
    m = Modell("moosgolem", sichtbreite=3.6, sichthoehe=3.0)
    k = m.knoch("koerper", [0, 9, 1])
    # Der Leib ein Fass: unten und oben schmaler als in der Mitte.
    rundling(k, [-11, 6, -7], [22, 5, 16], "stein", 2)
    rundling(k, [-13, 9, -9], [26, 14, 19], "stein", 3)
    rundling(k, [-12, 21, -7], [24, 7, 17], "stein", 2)
    rundling(k, [-10, 26, -3], [20, 8, 14], "stein", 3)               # der Buckel hinter dem Kopf
    k.kasten([-7, 34, 0], [14, 1, 8], "moos")                         # Moosdecke auf dem Buckel
    for x in (-13.5, 12.5):
        k.kasten([x, 17, -3], [1, 7, 12], "moosbart")                 # an den Flanken haengt es herab
    kopf = m.knoch("kopf", [0, 24, -7], "koerper")
    rundling(kopf, [-5, 19, -15], [10, 9, 9], "stein")
    kopf.kasten([-6, 25, -16], [12, 2, 4], "braue")                   # die Stirn wie ein Felsvorsprung
    # Die Augen eigens, damit er sie im Schlaf schliessen kann.
    augen = m.knoch("augen", [0, 24, -15], "kopf")
    augen.kasten([-4, 23, -15.4], [2, 2, 1], "auge")
    augen.kasten([2, 23, -15.4], [2, 2, 1], "auge")
    kopf.kasten([-4, 18, -14.5], [8, 2, 6], "kiefer")
    kopf.kasten([-4, 28, -13], [8, 1, 6], "moos")
    for x, z in ((-3, -12), (2, -10)):
        kopf.kasten([x, 29, z], [1, 2, 1], "blume")
    for seite, s in (("links", 1), ("rechts", -1)):
        def sx(x, w):
            # Die rechte Seite ist die gespiegelte linke.
            return x if s > 0 else -x - w
        arm = m.knoch(f"arm_{seite}", [16 * s, 27, -1], "koerper")
        # Die Schultern: runde Felsen, hoeher als der Kopf.
        rundling(arm, [sx(11, 12), 21, -8], [12, 12, 13], "stein", 3)
        arm.kasten([sx(13, 8), 33, -5], [8, 1, 7], "moos")
        for x, z, h in ((13, -8.4, 6), (17, -8.4, 4), (20, -4, 7)):
            arm.kasten([sx(x, 1), 33 - h, z], [1, h, 1], "ranke")
        rundling(arm, [sx(13, 8), 12, -6], [8, 10, 9], "stein", 2)       # der Oberarm
        unter = m.knoch(f"unterarm_{seite}", [17 * s, 13, -1], f"arm_{seite}")
        rundling(unter, [sx(11, 12), 5, -8], [12, 9, 12], "stein", 2)
        faust = m.knoch(f"faust_{seite}", [17 * s, 6, -2], f"unterarm_{seite}")
        rundling(faust, [sx(9, 15), 0, -10], [15, 8, 14], "stein", 3)
        # Vier Finger, eingeschlagen: jeder ein eigener Brocken.
        for i in range(4):
            faust.kasten([sx(10 + i * 3.4, 3), 1, -11], [3, 5, 2], "finger")
        # Die Wurfsteine sitzen aussen auf dem Unterarm - sie brechen ab,
        # wenn er wirft, und wachsen nach.
        st = m.knoch(f"armstein_{seite}", [23 * s, 9, -1], f"unterarm_{seite}")
        rundling(st, [sx(22, 7), 5, -7], [7, 9, 11], "wurfstein", 2)
        rundling(st, [sx(21, 6), 12, -5], [6, 5, 7], "wurfstein", 1)
        st.kasten([sx(22, 4), 16.5, -3], [4, 1, 4], "moos")
        bein = m.knoch(f"bein_{seite}", [6 * s, 9, 1], "koerper")
        rundling(bein, [sx(2, 8), 1, -3], [8, 9, 8], "stein", 2)
        rundling(bein, [sx(1, 10), 0, -6], [10, 3, 10], "stein", 1)      # der breite Fuss
    # Das Erz auf dem Buckel: ein Brocken dunkles Gestein, aus dem die
    # Kristalle wachsen. Welche zu sehen sind, sagt fynn:erz.
    fels = m.knoch("erzfels", [0, 34, 5], "koerper")
    rundling(fels, [-7, 33, 0], [14, 4, 11], "erzstein", 2)
    for nr, kristalle in ERZKRISTALLE.items():
        e = m.knoch(f"erz_{nr}", [0, 36, 5], "erzfels")
        for x, z, w, h, (nx, nz) in kristalle:
            e.kasten([x, 36, z], [w, h, w], f"erz{nr}", drehung=[nx, 0, nz], drehpunkt=[x + w / 2, 36, z + w / 2])
    return m


MOOSGOLEM_FARBEN = {
    # Stein hell, Stein dunkel, Moos, Kern
    "wald": ("#8e8c82", "#57554e", "#5a8a32", "#7affa0"),
    "tiefwald": ("#6e7068", "#3c3e38", "#3a6a2a", "#a0ffda"),
}


def moosgolem_maler(variante):
    """Grosse Flaechen, keine Punkte: Gesteinsschichten als wellige Linien,
    oben hell, unten im Schatten dunkler, das Moos kriecht in einer
    welligen Kante die Flanken herab."""
    stein, dunkel, moos, kern = MOOSGOLEM_FARBEN.get(variante, MOOSGOLEM_FARBEN["wald"])
    stein_reihe = [H.dunkler(stein, 0.32), H.dunkler(stein, 0.16), stein, H.heller(stein, 0.08)]
    moos_reihe = [H.dunkler(moos, 0.3), H.dunkler(moos, 0.12), moos, mische(hexfarbe(moos), (170, 200, 80), 0.35)]

    def fels(p, n, texel, reihe, mooskante=0.78):
        x, y, z = p
        t = H.hoehe(p, n, texel)
        if n[1] > 0.5:
            return H.farbe(moos)
        k = H.kasten_von(texel)
        hoch = k.groesse[1] if k else 0
        # Die Mooskante wellt sich, statt gerade zu verlaufen - nur an den
        # hohen Flaechen, sonst wird jede Stufe zum gruenen Strich.
        if hoch >= 8 and n[1] > -0.5 and t > mooskante + 0.1 * math.sin(x * 0.6 + z * 0.8):
            return H.verlauf(moos_reihe[1:], (t - mooskante) / (1 - mooskante), 3)
        if n[1] < -0.5:
            return H.farbe(reihe[0])
        # Der Verlauf haengt an der Hoehe im ganzen Golem, nicht im
        # einzelnen Kasten: Sonst beginnt jede Stufe wieder dunkel, und der
        # Fels bekommt Streifen. Unten im Schatten, oben im Licht.
        c = H.verlauf(reihe, (y - 1.0) / 30.0, 4)
        # Grosse dunklere Flecken, wie Flechten und Nassstellen am Fels -
        # ganze Flaechen, keine Punkte.
        if math.sin(x * 0.28 + y * 0.12) + math.sin(z * 0.33 - y * 0.21 + 1.3) > 1.15:
            c = H.dunkler(c, 0.1)
        return c

    def male(stoff, p, n, texel):
        x, y, z = p
        stoff, _, rand = stoff.partition("~")
        if rand and n[1] > 0.5:
            # Die Kante oben: heller Stein, wo das Licht sie trifft.
            return H.heller(stein if stoff != "wurfstein" else mische(hexfarbe(stein), (176, 150, 120), 0.3), 0.12)
        if stoff == "stein":
            return fels(p, n, texel, stein_reihe)
        if stoff == "wurfstein":
            # Die Wurfsteine sind heller und waermer, mit dunkler Bruchfuge
            # unten - man sieht, dass sie nur aufsitzen.
            if n[1] < -0.5:
                return H.farbe(dunkel)
            k = H.kasten_von(texel)
            if k and y - k.ursprung[1] < 1 and n[1] < 0.5:
                return H.farbe(dunkel)
            warm = mische(hexfarbe(stein), (176, 150, 120), 0.3)
            return fels(p, n, texel, [H.dunkler(warm, 0.25), H.dunkler(warm, 0.1), warm, H.heller(warm, 0.1)], 0.9)
        if stoff in ("moos", "moosbart"):
            if n[1] < -0.5 and int(math.floor(x + z)) % 3 == 0:
                return None                                                   # herabhaengende Faeden
            t = H.hoehe(p, n, texel)
            if stoff == "moosbart":
                # Der Bart wird nach unten duenner: unten nur noch Straehnen.
                if t < 0.45 and int(math.floor(z)) % 2 == 0:
                    return None
            return H.verlauf(moos_reihe, t if n[1] <= 0.5 else 1.0, 4)
        if stoff == "auge":
            return glut(H.heller(kern, 0.3)) if n[2] < -0.5 else H.farbe(dunkel)
        if stoff == "braue":
            if n[1] > 0.5:
                return H.farbe(moos)
            return H.verlauf([H.dunkler(stein, 0.35), H.dunkler(stein, 0.15)], H.hoehe(p, n, texel), 2)
        if stoff == "kiefer":
            return H.verlauf([H.dunkler(stein, 0.35), H.dunkler(stein, 0.2)], H.hoehe(p, n, texel), 2)
        if stoff == "finger":
            if n[1] > 0.5:
                return H.heller(stein, 0.05)
            return H.verlauf([H.dunkler(stein, 0.3), H.dunkler(stein, 0.1)], H.hoehe(p, n, texel), 2)
        if stoff == "blume":
            return glut("#ff8ab8") if n[1] > 0.5 else hexfarbe("#3a6a22")
        if stoff == "ranke":
            return H.verlauf([H.dunkler(moos, 0.35), H.dunkler(moos, 0.1)], H.hoehe(p, n, texel), 2)
        if stoff == "erzstein":
            # Tiefschiefer, dunkel und kuehl.
            if n[1] > 0.5:
                return hexfarbe("#3a3a44")
            return H.verlauf(["#26262e", "#34343e", "#44444e"], H.hoehe(p, n, texel), 3)
        if stoff.startswith("erz"):
            _, _, tief, mitte, hell = GOLEMERZE[int(stoff[3:])]
            t = H.hoehe(p, n, texel)
            if n[1] > 0.5:
                return glut(hell)
            # Eine Seite jedes Kristalls faengt das Licht (die Facette).
            seite = 0.25 if (n[0] > 0.5 or n[2] < -0.5) else 0.0
            return glut(H.verlauf([tief, mitte, hell], min(1.0, t * 0.85 + seite), 4))
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


