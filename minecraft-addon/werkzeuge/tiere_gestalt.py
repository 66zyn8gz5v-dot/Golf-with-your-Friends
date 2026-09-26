#!/usr/bin/env python3
"""Gestalt, Haut und Bewegung der zwoelf Tiere.

Jedes Tier ist hier eine Funktion, die sein Modell baut, und eine, die
sein Fell malt. Masse in Minecraft-Einheiten: 16 sind ein Block, y ist
oben, vorn ist -z (dorthin schaut der Kopf).

Minecraft-Stil (Fynn: "zu viel Textur, halte die Mobs im Minecraft-Stil"):
Mojangs Tiere haben 7 bis 28 Farben insgesamt, grosse ruhige Flaechen,
weiche Uebergaenge in wenigen Stufen - und scharf nur das, was man lesen
soll: Augen, Nase, Hufe. Die erste Fassung hatte jeden Bildpunkt
gekoernt; das sah aus wie Rauschen im Fernseher. Jetzt: drei Stufen je
Flaeche, grosse Wolken, nur hier und da ein einzelner Tupfer.
"""

import math

from tiermodell import Modell, hexfarbe, mische, palette, streu, treppe, wolken


def fell(pal, p, n, texel, saat=0, verschiebung=0.0, tupfer=0.03, wolke=0.35, skala=9.0):
    """Eine Stufe aus der Farbtreppe pal (hell -> dunkel) fuer diesen Punkt.
    Grosse, ruhige Wolken statt Koernung; oben etwas heller, unten dunkler.
    Ganz selten ein einzelner dunklerer Tupfer - wie bei Mojangs Wolf."""
    x = 0.45 + verschiebung
    x -= 0.1 * n[1]
    x += wolke * (wolken(p, skala, saat, lagen=1) - 0.5)
    if streu(texel[0], texel[1], saat) < tupfer:
        x += 0.22
    return treppe(pal, x)


def nah(p, mitte, halb):
    """Liegt p im Kasten um mitte mit den halben Kantenlaengen halb?"""
    return all(abs(p[i] - mitte[i]) <= halb[i] for i in range(3))


# ================================================================== Braunbaer

BAER_FARBEN = {
    # Name: (Fell hell, Fell dunkel, Schnauze, Beine dunkel)
    "braun":   ("#9a6a3e", "#3a2312", "#b08758", "#2a190c"),
    "grizzly": ("#b89a70", "#4c3522", "#c4a57a", "#2e2014"),
    "schwarz": ("#4a403a", "#141111", "#a07a50", "#0d0b0a"),
}


def baer_modell():
    m = Modell("braunbaer", sichtbreite=3, sichthoehe=2.5)
    koerper = m.knoch("body", [0, 17, 0])
    koerper.kasten([-7, 10, -13], [14, 13, 26], "fell")
    # Der Buckel ueber den Schultern - daran erkennt man den Braunbaeren.
    koerper.kasten([-6, 22, -12], [12, 3, 9], "buckel")
    kopf = m.knoch("head", [0, 19, -13], "body")
    kopf.kasten([-5, 15, -21], [10, 9, 8], "kopf")
    kopf.kasten([-3, 15, -25], [6, 5, 4], "schnauze")
    kopf.kasten([-5, 23, -18], [3, 3, 1], "ohr")
    kopf.kasten([2, 23, -18], [3, 3, 1], "ohr")
    m.knoch("tail", [0, 20, 13], "body").kasten([-1.5, 18, 13], [3, 3, 2], "fell")
    for name, x, z in (("leg0", 4.5, -8.5), ("leg1", -4.5, -8.5), ("leg2", 4.5, 8.5), ("leg3", -4.5, 8.5)):
        b = m.knoch(name, [x, 12, z], "body")
        b.kasten([x - 2.5, 0, z - 2.5], [5, 12, 5], "bein")
    return m


def baer_maler(variante):
    hell, dunkel, schnauze, beine = BAER_FARBEN[variante]
    pal = palette(hell, dunkel, 3)
    pal_bein = palette(dunkel, beine, 3)
    pal_schnauze = palette(schnauze, hell, 3)
    auge, nase = hexfarbe("#0b0706"), hexfarbe("#151010")

    def f(stoff, p, n, texel):
        if stoff == "bein":
            if p[1] < 1.2 and n[2] < -0.5 and int(p[0] * 2) % 2 == 0:
                return hexfarbe("#d9ccb0")          # Krallen vorn am Fuss
            if p[1] < 2.0:
                return hexfarbe("#1a120c")
            return fell(pal_bein, p, n, texel, 3, verschiebung=0.1 - 0.25 * (p[1] / 12))
        if stoff == "schnauze":
            if n[2] < -0.5 and nah(p, (0, 19, -25), (1.2, 1.0, 1)):
                return nase
            if n[2] < -0.5 and p[1] < 16:
                return hexfarbe("#3a2616")          # Maul
            return fell(pal_schnauze, p, n, texel, 5, tupfer=0.0)
        if stoff == "kopf":
            for x in (-3.5, 3.5):
                if nah(p, (x, 21.5, -21), (0.6, 0.6, 0.6)):
                    return auge
            return fell(pal, p, n, texel, 7, verschiebung=0.05)
        if stoff == "ohr":
            return fell(pal, p, n, texel, 9, verschiebung=0.3 if n[2] < -0.5 else 0.1)
        if stoff == "buckel":
            # Beim Grizzly die silbrigen Spitzen auf dem Buckel.
            extra = -0.2 if variante == "grizzly" else -0.08
            return fell(pal, p, n, texel, 11, verschiebung=extra)
        # Rumpf: der Ruecken heller, die Flanken nach unten dunkler.
        tiefe = (23 - p[1]) / 13
        return fell(pal, p, n, texel, 1, verschiebung=-0.1 + 0.3 * tiefe)
    return f


BAER_BEINE = [("leg0", 1), ("leg1", -1), ("leg2", -1), ("leg3", 1)]


def paar(knochen, ursprung, groesse, stoff, **weiter):
    """Ein Kasten und sein Spiegelbild an der Mittelebene x = 0."""
    knochen.kasten(ursprung, groesse, stoff, **weiter)
    gespiegelt = [-ursprung[0] - groesse[0], ursprung[1], ursprung[2]]
    if "drehung" in weiter and weiter["drehung"]:
        d = weiter["drehung"]
        weiter = dict(weiter, drehung=[d[0], -d[1], -d[2]])
        if weiter.get("drehpunkt"):
            dp = weiter["drehpunkt"]
            weiter["drehpunkt"] = [-dp[0], dp[1], dp[2]]
    knochen.kasten(gespiegelt, groesse, stoff, **weiter)


def beine(m, eltern, x, z_vorn, z_hinten, groesse, huefte, stoff="bein"):
    """Vier Beine: leg0 vorn links, leg1 vorn rechts, leg2 hinten links,
    leg3 hinten rechts. x ist der Abstand der Beinmitte von der Mitte."""
    w, h, d = groesse
    for name, bx, bz in (("leg0", x, z_vorn), ("leg1", -x, z_vorn), ("leg2", x, z_hinten), ("leg3", -x, z_hinten)):
        b = m.knoch(name, [bx, huefte, bz], eltern)
        b.kasten([bx - w / 2, huefte - h, bz - d / 2], [w, h, d], stoff)


VIERBEINER = [("leg0", 1), ("leg1", -1), ("leg2", -1), ("leg3", 1)]


def augen(p, n, orte, halb=(0.6, 0.6, 0.6)):
    return any(nah(p, o, halb) for o in orte)


# ================================================================== Elch

ELCH_FARBEN = {
    "bulle": ("#5a3d27", "#2a1a10", "#9a8a74"),
    "kuh":   ("#6a4a30", "#33200f", "#a39480"),
    "kalb":  ("#a86c3c", "#6e4222", "#b89878"),
}


def elch_modell():
    m = Modell("elch", sichtbreite=3.5, sichthoehe=3.5)
    body = m.knoch("body", [0, 23, 0])
    body.kasten([-6, 17, -13], [12, 12, 26], "fell")
    body.kasten([-5, 28, -12], [10, 4, 10], "buckel")
    kopf = m.knoch("head", [0, 26, -12], "body")
    kopf.kasten([-3, 20, -18], [6, 10, 7], "hals")
    kopf.kasten([-3.5, 26, -24], [7, 6, 8], "kopf")
    kopf.kasten([-3, 22, -31], [6, 7, 8], "schnauze")
    kopf.kasten([-1, 16, -22], [2, 6, 2], "glocke")
    paar(kopf, [3.5, 30, -20], [3, 2, 1], "ohr")
    geweih = m.knoch("geweih", [0, 32, -20], "head")
    # Das Schaufelgeweih: eine breite Platte je Seite, am Rand Zacken.
    paar(geweih, [3, 31, -21], [3, 2, 2], "geweih")
    paar(geweih, [6, 32, -25], [8, 1, 7], "geweih")
    for z in (-25, -22, -19):
        paar(geweih, [13, 33, z], [1, 3, 1], "geweih")
    paar(geweih, [8, 33, -25], [1, 2, 1], "geweih")
    m.knoch("tail", [0, 27, 13], "body").kasten([-1.5, 24, 13], [3, 3, 1], "fell")
    beine(m, "body", 4, -9, 9, (4, 18, 4), 18)
    return m


def elch_maler(variante):
    hell, dunkel, bein = ELCH_FARBEN[variante]
    pal = palette(hell, dunkel, 3)
    pal_bein = palette(bein, dunkel, 3)
    pal_geweih = palette("#d8c8a0", "#9a8460", 3)

    def f(stoff, p, n, texel):
        if stoff == "geweih":
            return fell(pal_geweih, p, n, texel, 21, tupfer=0.0)
        if stoff == "bein":
            if p[1] < 1.5:
                return hexfarbe("#1e1812")                  # Hufe
            # Oben am Koerper dunkel, unten die hellen "Struempfe".
            return fell(pal_bein if p[1] < 11 else pal, p, n, texel, 23)
        if stoff == "schnauze":
            if n[2] < -0.5 and augen(p, n, [(-1.5, 25.5, -31), (1.5, 25.5, -31)], (0.6, 0.6, 1)):
                return hexfarbe("#120c08")                  # Nuestern
            return fell(pal, p, n, texel, 25, verschiebung=0.15, tupfer=0.0)
        if stoff == "kopf":
            if augen(p, n, [(-3.5, 29.5, -21), (3.5, 29.5, -21)]):
                return hexfarbe("#0a0806")
            return fell(pal, p, n, texel, 27)
        if stoff in ("hals", "glocke", "buckel"):
            return fell(pal, p, n, texel, 29, verschiebung=0.25)
        if stoff == "ohr":
            return fell(pal, p, n, texel, 31, verschiebung=0.1)
        return fell(pal, p, n, texel, 33, verschiebung=0.1 * (29 - p[1]) / 12)
    return f


# ================================================================== Wildschwein

def wildschwein_modell():
    m = Modell("wildschwein", sichtbreite=2, sichthoehe=1.5)
    body = m.knoch("body", [0, 11, 0])
    body.kasten([-5, 6, -10], [10, 10, 20], "fell")
    body.kasten([-1, 16, -9], [2, 2, 13], "borsten")
    kopf = m.knoch("head", [0, 12, -10], "body")
    kopf.kasten([-4, 6, -17], [8, 8, 7], "kopf")
    kopf.kasten([-2.5, 6, -21], [5, 4, 4], "ruessel")
    paar(kopf, [2.5, 8, -21], [1, 3, 1], "hauer")
    paar(kopf, [2, 14, -13], [2, 3, 1], "ohr")
    m.knoch("tail", [0, 15, 10], "body", drehung=[20, 0, 0]).kasten([-0.5, 10, 10], [1, 5, 1], "borsten")
    beine(m, "body", 3, -7, 7, (3, 6, 3), 6)
    return m


def wildschwein_maler(variante):
    frischling = variante == "frischling"
    pal = palette("#9a6e44", "#5a3c22", 3) if frischling else palette("#6e5c4a", "#2e241c", 3)
    streif = hexfarbe("#d8b884")

    def f(stoff, p, n, texel):
        if stoff == "hauer":
            return hexfarbe("#eee6d2")
        if stoff == "ruessel":
            if n[2] < -0.5:
                if augen(p, n, [(-1, 8, -21), (1, 8, -21)], (0.5, 0.6, 1)):
                    return hexfarbe("#3a2420")
                return hexfarbe("#a88478")                  # Rüsselscheibe
            return fell(pal, p, n, texel, 41, verschiebung=0.1, tupfer=0.0)
        if stoff == "kopf" and augen(p, n, [(-3, 12, -17), (3, 12, -17)]):
            return hexfarbe("#0c0806")
        if stoff == "bein" and p[1] < 1.2:
            return hexfarbe("#1a1410")
        if stoff in ("borsten", "ohr"):
            return fell(pal, p, n, texel, 43, verschiebung=0.35)
        if frischling and stoff == "fell":
            # Die Frischlinge tragen helle Laengsstreifen - bei ihnen laufen
            # sie vom Kopf zum Schwanz, also quer zu x und y.
            quer = p[0] if n[1] > 0.5 else p[1]
            if n[2] == 0 and int(round(quer)) % 3 == 0:
                return streif
        return fell(pal, p, n, texel, 45, verschiebung=0.1 * (16 - p[1]) / 10)
    return f


# ================================================================== Bison

def bison_modell():
    m = Modell("bison", sichtbreite=3.5, sichthoehe=3)
    body = m.knoch("body", [0, 18, 0])
    body.kasten([-8, 10, -14], [16, 17, 15], "zottel")
    body.kasten([-6, 11, 1], [12, 12, 13], "fell")
    kopf = m.knoch("head", [0, 20, -14], "body")
    kopf.kasten([-5, 10, -21], [10, 11, 7], "kopf")
    kopf.kasten([-5.5, 19, -20], [11, 3, 5], "zottel")
    kopf.kasten([-2, 6, -20], [4, 4, 3], "zottel")
    paar(kopf, [5, 17, -18], [3, 2, 2], "horn")
    paar(kopf, [7, 19, -18], [2, 3, 2], "horn")
    schwanz = m.knoch("tail", [0, 22, 14], "body")
    schwanz.kasten([-0.5, 13, 14], [1, 9, 1], "fell")
    schwanz.kasten([-1, 11, 13.5], [2, 3, 2], "zottel")
    beine(m, "body", 4.5, -9, 9, (4, 11, 4), 11)
    # Die "Pluderhosen": langes Fell an den Vorderbeinen.
    for name, x in (("leg0", 4.5), ("leg1", -4.5)):
        m.finde(name).kasten([x - 2.5, 5, -11.5], [5, 6, 5], "zottel")
    return m


def bison_maler(variante):
    winter = variante == "winter"
    kalb = variante == "kalb"
    vorn = palette("#b07840", "#7a4c24", 3) if kalb else palette("#4e3322", "#1e140c", 3)
    hinten = palette("#c08850", "#8a5a30", 3) if kalb else palette("#7a5636", "#40291a", 3)

    def f(stoff, p, n, texel):
        if winter and n[1] > 0.5 and wolken(p, 4.0, 51, 1) > 0.42:
            return hexfarbe("#eef2f4")                      # Raureif auf dem Ruecken
        if stoff == "horn":
            return hexfarbe("#2a2622") if p[1] > 20 else hexfarbe("#3c3630")
        if stoff == "bein":
            return hexfarbe("#16100b") if p[1] < 1.5 else fell(vorn, p, n, texel, 53, verschiebung=0.2)
        if stoff == "kopf":
            if augen(p, n, [(-4.5, 16.5, -21), (4.5, 16.5, -21)]):
                return hexfarbe("#0a0604")
            if n[2] < -0.5 and p[1] < 13 and abs(p[0]) < 2.5:
                return hexfarbe("#16100c")                  # Maul und Nase
            return fell(vorn, p, n, texel, 55, verschiebung=0.15)
        if stoff == "zottel":
            return fell(vorn, p, n, texel, 57)
        return fell(hinten, p, n, texel, 59)
    return f


# ================================================================== Loewe

def loewe_modell():
    m = Modell("loewe", sichtbreite=2.5, sichthoehe=2)
    body = m.knoch("body", [0, 14, 0])
    body.kasten([-5, 9, -11], [10, 9, 22], "fell")
    kopf = m.knoch("head", [0, 16, -11], "body")
    kopf.kasten([-4, 13, -18], [8, 8, 7], "kopf")
    kopf.kasten([-2.5, 13, -21], [5, 4, 3], "schnauze")
    paar(kopf, [2, 21, -15], [2, 2, 1], "ohr")
    maehne = m.knoch("maehne", [0, 16, -11], "head")
    maehne.kasten([-6, 10, -16], [12, 13, 6], "maehne")
    maehne.kasten([-5, 6, -14], [10, 5, 5], "maehne")
    schwanz = m.knoch("tail", [0, 17, 11], "body", drehung=[-40, 0, 0])
    schwanz.kasten([-0.5, 16.5, 11], [1, 1, 12], "fell")
    schwanz.kasten([-1, 16, 22], [2, 2, 3], "quaste")
    beine(m, "body", 3, -8, 8, (3, 9, 3), 9)
    return m


def loewe_maler(variante):
    pal = palette("#d8a864", "#a8763a", 3)
    pal_maehne = palette("#a0662c", "#4a2a12", 3)
    creme = palette("#f0dcb0", "#d8bc88", 2)
    junges = variante == "junges"

    def f(stoff, p, n, texel):
        if stoff == "maehne":
            # Innen, am Gesicht, heller; nach aussen dunkler.
            aussen = max(abs(p[0]) / 6, (23 - p[1]) / 13 * 0.4)
            return fell(pal_maehne, p, n, texel, 61, verschiebung=0.35 * aussen - 0.1)
        if stoff == "quaste":
            return hexfarbe("#3a2210")
        if stoff == "schnauze":
            if n[2] < -0.5 and nah(p, (0, 16, -21), (1, 0.6, 1)):
                return hexfarbe("#7a4a3a")                  # Nase
            return fell(creme, p, n, texel, 63, tupfer=0.0)
        if stoff == "kopf":
            if augen(p, n, [(-2.5, 18.5, -18), (2.5, 18.5, -18)]):
                return hexfarbe("#d8a020") if texel[0] % 2 else hexfarbe("#1a1206")
            return fell(pal, p, n, texel, 65)
        if stoff == "bein" and p[1] < 1:
            return hexfarbe("#c09058")
        if stoff == "fell" and (n[1] < -0.5 or p[1] < 10.5):
            return fell(creme, p, n, texel, 67)             # heller Bauch
        if junges and wolken(p, 2.2, 69, 1) > 0.72:
            return hexfarbe("#a07048")                      # Flecken der Jungen
        return fell(pal, p, n, texel, 71)
    return f


# ================================================================== Tiger

def tiger_modell():
    m = Modell("tiger", sichtbreite=2.5, sichthoehe=2)
    body = m.knoch("body", [0, 13, 0])
    body.kasten([-5, 8, -12], [10, 9, 24], "fell")
    kopf = m.knoch("head", [0, 15, -12], "body")
    kopf.kasten([-4, 12, -19], [8, 8, 7], "kopf")
    kopf.kasten([-2.5, 12, -22], [5, 4, 3], "schnauze")
    paar(kopf, [4, 12, -18], [1, 5, 4], "wange")
    paar(kopf, [2, 20, -16], [2, 2, 1], "ohr")
    schwanz = m.knoch("tail", [0, 16, 12], "body", drehung=[-35, 0, 0])
    schwanz.kasten([-1, 15, 12], [2, 2, 14], "schwanz")
    beine(m, "body", 3, -8.5, 8.5, (4, 8, 4), 8)
    return m


TIGER_FARBEN = {
    "orange": ("#e8923a", "#b8601e", "#1c1410", "#f2eee2", "#d8a020"),
    "weiss":  ("#f2f0ea", "#cfcac0", "#2a2420", "#ffffff", "#5a9ad8"),
}


def tiger_maler(variante):
    hell, dunkel, streif, weiss, auge = TIGER_FARBEN[variante]
    pal = palette(hell, dunkel, 3)
    streif, weiss, auge = hexfarbe(streif), hexfarbe(weiss), hexfarbe(auge)

    def gestreift(p, abstand=4.5, breite=0.26):
        # Senkrechte Baender, leicht gewellt, damit es nach Tiger aussieht
        # und nicht nach Zebrastreifen-Lineal.
        s = (p[2] + 1.6 * math.sin(p[1] * 0.9 + p[0] * 0.4)) / abstand
        return (s - math.floor(s)) < breite

    def f(stoff, p, n, texel):
        if stoff == "schnauze":
            if n[2] < -0.5 and nah(p, (0, 15, -22), (1, 0.6, 1)):
                return hexfarbe("#c07068")
            return weiss
        if stoff == "wange":
            return weiss
        if stoff == "kopf":
            if augen(p, n, [(-2.5, 17.5, -19), (2.5, 17.5, -19)]):
                return auge if texel[0] % 2 else streif
            if n[2] < -0.5 and p[1] < 16:
                return weiss
            if n[1] > 0.5 and int(p[2]) % 2 == 0 and abs(p[0]) > 1:
                return streif                               # Stirnstreifen
            return fell(pal, p, n, texel, 81)
        if stoff == "ohr":
            return streif if n[2] > 0.5 else fell(pal, p, n, texel, 83)
        if stoff == "schwanz":
            return streif if int(p[2]) % 3 == 0 else fell(pal, p, n, texel, 85)
        if stoff == "bein":
            if p[1] < 1:
                return weiss
            if n[2] == 0 and int(p[1]) % 3 == 1:
                return streif
            return fell(pal, p, n, texel, 87)
        if n[1] < -0.5 or p[1] < 9.5:
            return weiss                                    # Bauch
        if gestreift(p):
            return streif
        return fell(pal, p, n, texel, 89)
    return f


# ================================================================== Krokodil

def krokodil_modell():
    m = Modell("krokodil", sichtbreite=4, sichthoehe=1.2)
    body = m.knoch("body", [0, 4, 0])
    body.kasten([-5, 2, -12], [10, 5, 24], "haut")
    for z in range(-10, 12, 4):
        paar(body, [2, 7, z], [1, 1, 2], "zacke")
    kopf = m.knoch("head", [0, 5, -12], "body")
    kopf.kasten([-4, 2, -18], [8, 4, 6], "kopf")
    kopf.kasten([-2.5, 3, -28], [5, 2, 10], "maul")
    paar(kopf, [1, 6, -17], [2, 1, 2], "auge")
    kiefer = m.knoch("kiefer", [0, 3, -17], "head")
    kiefer.kasten([-2.5, 1, -28], [5, 2, 11], "kiefer")
    s1 = m.knoch("schwanz1", [0, 4.5, 12], "body")
    s1.kasten([-3.5, 2, 12], [7, 4, 10], "haut")
    paar(s1, [1, 6, 14], [1, 1, 2], "zacke")
    s2 = m.knoch("schwanz2", [0, 4, 22], "schwanz1")
    s2.kasten([-2.5, 2.5, 22], [5, 3, 9], "haut")
    s2.kasten([-0.5, 5.5, 24], [1, 1, 4], "zacke")
    s3 = m.knoch("schwanz3", [0, 4, 31], "schwanz2")
    s3.kasten([-1.5, 3, 31], [3, 2, 8], "haut")
    for name, x, z in (("leg0", 5.5, -8.5), ("leg1", -5.5, -8.5), ("leg2", 5.5, 8.5), ("leg3", -5.5, 8.5)):
        m.knoch(name, [x, 4, z], "body").kasten([x - 1.5, 0, z - 1.5], [3, 4, 3], "bein")
    return m


def krokodil_maler(variante):
    jung = variante == "jung"
    pal = palette("#7a8a48", "#3e4a22", 3) if jung else palette("#5a6a3a", "#262e18", 3)
    bauch = hexfarbe("#d8cf9c")

    def f(stoff, p, n, texel):
        if stoff == "auge":
            if n[1] > 0.5 or abs(n[0]) > 0.5:
                return hexfarbe("#c8c040") if texel[0] % 2 else hexfarbe("#141008")
        if stoff in ("maul", "kiefer"):
            # Zaehne entlang der Kante zwischen Ober- und Unterkiefer.
            kante = (stoff == "maul" and p[1] < 3.6) or (stoff == "kiefer" and p[1] > 2.4)
            if abs(n[0]) > 0.5 and kante and int(p[2]) % 2 == 0:
                return hexfarbe("#f2ecd8")
            if stoff == "kiefer" and n[1] < -0.5:
                return bauch
            if stoff == "maul" and n[2] < -0.5:
                return hexfarbe("#1c2010") if abs(p[0]) < 1 and p[1] > 4 else fell(pal, p, n, texel, 91)
        if n[1] < -0.5:
            return bauch
        if abs(n[0]) > 0.5 and p[1] < 3:
            return bauch                                    # Flanken unten hell
        # Schuppenplatten: ein ruhiges Gitter, oben dunkle Fugen.
        if n[1] > 0.5 and (int(math.floor(p[2])) % 3 == 0) and stoff != "zacke":
            return pal[2]
        return fell(pal, p, n, texel, 93)
    return f


# ================================================================== Schneeleopard

def schneeleopard_modell():
    m = Modell("schneeleopard", sichtbreite=2.2, sichthoehe=1.5)
    body = m.knoch("body", [0, 11, 0])
    body.kasten([-4, 7, -10], [8, 8, 20], "fell")
    kopf = m.knoch("head", [0, 13, -10], "body")
    kopf.kasten([-3, 10, -16], [6, 6, 6], "kopf")
    kopf.kasten([-2, 10, -18], [4, 3, 2], "schnauze")
    paar(kopf, [1.5, 16, -13], [2, 1, 1], "ohr")
    # Der lange, dicke Schwanz - er dient in den Bergen als Gleichgewicht
    # und als Schal.
    m.knoch("tail", [0, 13, 10], "body", drehung=[-12, 0, 0]).kasten([-1.5, 11.5, 10], [3, 3, 20], "schwanz")
    beine(m, "body", 2.5, -7, 7, (3, 7, 3), 7)
    return m


def schneeleopard_maler(variante):
    pal = palette("#ecebe4", "#b8b6ac", 3)
    fleck = hexfarbe("#4a4844")
    bauch = hexfarbe("#f8f8f4")

    def rosette(p, raster=3.5):
        # Ringe um zufaellig versetzte Punkte eines groben Gitters.
        gx, gy, gz = (math.floor(p[i] / raster) for i in range(3))
        best = 9.0
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    c = (gx + dx, gy + dy, gz + dz)
                    q = [(c[i] + 0.2 + 0.6 * streu(*c, 97 + i)) * raster for i in range(3)]
                    best = min(best, math.dist(p, q))
        return best

    def f(stoff, p, n, texel):
        if stoff == "schnauze":
            if n[2] < -0.5 and nah(p, (0, 12.5, -18), (1, 0.5, 1)):
                return hexfarbe("#8a6a6a")
            return bauch
        if stoff == "kopf":
            if augen(p, n, [(-1.8, 13.5, -16), (1.8, 13.5, -16)]):
                return hexfarbe("#9ab8a0") if texel[0] % 2 else hexfarbe("#1a1a18")
            if n[2] >= -0.5 and rosette(p, 2.5) < 0.6:
                return fleck
            return fell(pal, p, n, texel, 101)
        if n[1] < -0.5 or (stoff == "fell" and p[1] < 8):
            return bauch
        d = rosette(p)
        if stoff == "schwanz":
            return fleck if int(p[2]) % 4 == 0 or d < 0.7 else fell(pal, p, n, texel, 103)
        if stoff == "bein":
            return fleck if d < 0.6 else fell(pal, p, n, texel, 105)
        if 0.75 < d < 1.3:
            return fleck
        return fell(pal, p, n, texel, 107)
    return f


# ================================================================== Buckelwal

def wal_modell():
    m = Modell("wal", sichtbreite=6, sichthoehe=3)
    rumpf = m.knoch("rumpf", [0, 10, 0])
    rumpf.kasten([-12, 0, -28], [24, 20, 34], "haut")
    rumpf.kasten([-1, 20, -2], [2, 3, 5], "haut")                   # kleine Rueckenfinne
    kopf = m.knoch("kopf", [0, 10, -28], "rumpf")
    kopf.kasten([-10.5, 3, -46], [21, 14, 18], "kopf")
    kopf.kasten([-10, 0, -44], [20, 3, 16], "kehle")
    # Die langen weissen Brustflossen - ein Drittel so lang wie der Wal.
    for name, x, zeichen in (("flosse_links", 12, 1), ("flosse_rechts", -12, -1)):
        f = m.knoch(name, [x, 6, -20], "rumpf", drehung=[0, -20 * zeichen, 25 * zeichen])
        f.kasten([x if zeichen > 0 else x - 22, 5, -23], [22, 2, 7], "flosse")
    s1 = m.knoch("schwanz1", [0, 10, 6], "rumpf")
    s1.kasten([-9, 3, 6], [18, 14, 16], "haut")
    s2 = m.knoch("schwanz2", [0, 10, 22], "schwanz1")
    s2.kasten([-5, 6, 22], [10, 8, 14], "haut")
    m.knoch("fluke", [0, 10, 36], "schwanz2").kasten([-15, 9, 35], [30, 2, 9], "fluke")
    return m


def wal_maler(variante):
    kalb = variante == "kalb"
    pal = palette("#4a545c", "#2a3036", 3) if kalb else palette("#343c44", "#15191d", 3)
    weiss = hexfarbe("#e6eaec")
    grau = hexfarbe("#b4bcc2")

    def f(stoff, p, n, texel):
        if stoff == "flosse":
            # Buckelwale haben fast weisse Brustflossen, oben grau gesprenkelt.
            if n[1] > 0.5 and wolken(p, 3, 111, 1) > 0.55:
                return grau
            return weiss
        if stoff == "fluke":
            if n[1] < -0.5:
                # Unterseite der Fluke: weiss mit schwarzem Muster - bei
                # echten Walen so einzigartig wie ein Fingerabdruck.
                return pal[2] if wolken(p, 3, 113, 1) > 0.58 else weiss
            return fell(pal, p, n, texel, 115, tupfer=0.0)
        if stoff == "kehle":
            if n[1] < -0.5 or abs(n[0]) > 0.5:
                return grau if int(round(p[0])) % 2 == 0 else weiss   # Kehlfurchen
            return weiss
        if stoff == "kopf":
            if abs(n[0]) > 0.5 and nah(p, (0, 7, -33), (11, 0.6, 0.6)):
                return hexfarbe("#0a0c0e")                 # Auge
            if abs(n[0]) > 0.5 and nah(p, (0, 4.5, -40), (11, 0.5, 6)):
                return hexfarbe("#101316")                 # Maullinie
            if n[1] > 0.5 and wolken(p, 2.0, 117, 1) > 0.68:
                return hexfarbe("#56606a")                 # Hoecker auf dem Kopf
        if n[1] < -0.5:
            return weiss if variante != "dunkel" or wolken(p, 5, 119, 1) > 0.45 else grau
        if abs(n[0]) > 0.5 and p[1] < 4:
            return grau
        return fell(pal, p, n, texel, 121, tupfer=0.02)
    return f


# ================================================================== Hai

def hai_modell():
    m = Modell("hai", sichtbreite=3.5, sichthoehe=1.8)
    rumpf = m.knoch("rumpf", [0, 5, 0])
    rumpf.kasten([-4.5, 0, -8], [9, 10, 16], "haut")
    rumpf.kasten([-0.5, 9, -4], [1, 8, 6], "flosse", drehung=[-25, 0, 0], drehpunkt=[0, 9, -2])
    kopf = m.knoch("kopf", [0, 5, -8], "rumpf")
    kopf.kasten([-4, 1, -17], [8, 8, 9], "kopf")
    kopf.kasten([-3, 2, -21], [6, 5, 4], "kopf")
    kiefer = m.knoch("kiefer", [0, 2, -10], "kopf")
    kiefer.kasten([-3.5, 0, -19], [7, 2, 10], "kiefer")
    hammer = m.knoch("hammer", [0, 6, -18], "kopf")
    hammer.kasten([-10, 4, -21], [20, 3, 5], "hammer")
    for name, x, z in (("flosse_links", 4.5, 1), ("flosse_rechts", -4.5, -1)):
        f = m.knoch(name, [x, 2, -5], "rumpf", drehung=[0, -15 * z, 25 * z])
        f.kasten([x if z > 0 else x - 8, 1.5, -7], [8, 1, 4], "flosse")
    s1 = m.knoch("schwanz1", [0, 5, 8], "rumpf")
    s1.kasten([-3.5, 1.5, 8], [7, 7, 10], "haut")
    s1.kasten([-0.5, 8.5, 14], [1, 2, 2], "flosse")
    s2 = m.knoch("schwanz2", [0, 5, 18], "schwanz1")
    s2.kasten([-2, 3, 18], [4, 4, 7], "haut")
    fl = m.knoch("schwanzflosse", [0, 5, 25], "schwanz2")
    fl.kasten([-0.5, 5, 23], [1, 10, 4], "flosse", drehung=[-40, 0, 0], drehpunkt=[0, 5, 25])
    fl.kasten([-0.5, -2, 23], [1, 6, 3], "flosse", drehung=[40, 0, 0], drehpunkt=[0, 5, 25])
    return m


HAI_FARBEN = {
    "weisser_hai": ("#8894a0", "#4a5660"),
    "tigerhai":    ("#8c8672", "#4e4a3a"),
    "hammerhai":   ("#8e8c7e", "#56544a"),
}


def hai_maler(variante):
    hell, dunkel = HAI_FARBEN[variante]
    pal = palette(hell, dunkel, 3)
    weiss = hexfarbe("#eef0f0")

    def f(stoff, p, n, texel):
        if stoff == "kiefer":
            if n[1] > 0.5 and (abs(p[0]) > 2.5 or p[2] < -18) and texel[0] % 2 == 0:
                return weiss                                # Zahnreihe
            if n[1] > 0.5:
                return hexfarbe("#8a3a40")                  # Maul innen
            return weiss
        if stoff == "hammer":
            if abs(n[0]) > 0.5 and nah(p, (0, 5.5, -18.5), (10.5, 0.6, 0.6)):
                return hexfarbe("#0a0a0a")                  # Augen an den Enden
            return weiss if n[1] < -0.5 else fell(pal, p, n, texel, 131, tupfer=0.0)
        if stoff == "kopf":
            if abs(n[0]) > 0.5 and nah(p, (0, 6, -15), (5, 0.6, 0.6)):
                return hexfarbe("#050505")
            if n[1] < -0.5 or (abs(n[0]) > 0.5 and p[1] < 3):
                return weiss
            if n[2] < -0.5 and p[1] < 3.5:
                return hexfarbe("#6a2a30")
        if stoff == "haut":
            if abs(n[0]) > 0.5 and -7.5 < p[2] < -3 and int(p[2] * 2) % 2 == 0 and 3 < p[1] < 7:
                return pal[2]                               # Kiemenspalten
            # Scharfe Grenze: oben grau, unten weiss (so sieht man ihn von
            # unten nicht gegen das helle Wasser).
            grenze = 3.8 + 0.8 * (wolken(p, 3, 133, 1) - 0.5)
            if n[1] < -0.5 or (abs(n[0]) > 0.5 and p[1] < grenze):
                return weiss
            if variante == "tigerhai" and n[1] >= 0 and int(p[2]) % 4 == 0:
                return pal[2]                               # Tigerhai: dunkle Querbaender
        if stoff == "flosse":
            return fell(pal, p, n, texel, 135, verschiebung=0.2, tupfer=0.0)
        return fell(pal, p, n, texel, 137, tupfer=0.0)
    return f


# ================================================================== Riesenkalmar

KALMAR_ARME = 8


def riesenkalmar_modell():
    m = Modell("riesenkalmar", sichtbreite=5, sichthoehe=2)
    mantel = m.knoch("mantel", [0, 8, 0])
    mantel.kasten([-5, 3, -2], [10, 10, 24], "mantel")
    m.knoch("flossen", [0, 8, 19], "mantel").kasten([-11, 7.5, 16], [22, 1, 7], "flosse")
    kopf = m.knoch("kopf", [0, 8, -2], "mantel")
    kopf.kasten([-4, 4, -8], [8, 8, 6], "kopf")
    for i in range(KALMAR_ARME):
        w = math.radians(i * 360 / KALMAR_ARME + 22.5)
        x, y = 2.8 * math.cos(w), 8 + 2.8 * math.sin(w)
        arm = m.knoch(f"arm{i}", [x, y, -8], "kopf",
                      drehung=[round(-12 * math.sin(w), 1), round(12 * math.cos(w), 1), 0])
        arm.kasten([x - 1, y - 1, -22], [2, 2, 14], "arm")
    for i, x in enumerate((1.5, -1.5)):
        fang = m.knoch(f"fangarm{i}", [x, 6, -8], "kopf")
        fang.kasten([x - 0.5, 5.5, -34], [1, 1, 26], "arm")
        fang.kasten([x - 1.5, 5, -38], [3, 2, 5], "keule")
    return m


def riesenkalmar_maler(variante):
    pal = palette("#c04848", "#6a1c26", 3)
    unten = hexfarbe("#e8a0a0")

    def f(stoff, p, n, texel):
        if stoff == "kopf" and abs(n[0]) > 0.5:
            # Riesenkalmare haben die groessten Augen im Tierreich.
            r = math.dist((p[1], p[2]), (8.5, -5))
            if r < 1.3:
                return hexfarbe("#050608")
            if r < 2.2:
                return hexfarbe("#d8d0b8")
        if stoff in ("arm", "keule"):
            if n[1] < -0.5 and (texel[0] + texel[1]) % 2 == 0:
                return hexfarbe("#f0c8c0")                  # Saugnaepfe
            return fell(pal, p, n, texel, 141, verschiebung=0.1, tupfer=0.0)
        if n[1] < -0.5:
            return unten
        if wolken(p, 2.0, 143, 1) > 0.7:
            return pal[2]                                   # dunkle Farbzellen
        return fell(pal, p, n, texel, 145, tupfer=0.0)
    return f


# ================================================================== Schwertfisch

def schwertfisch_modell():
    m = Modell("schwertfisch", sichtbreite=3.5, sichthoehe=1.6)
    rumpf = m.knoch("rumpf", [0, 4, 0])
    rumpf.kasten([-3, 0, -8], [6, 8, 18], "haut")
    rumpf.kasten([-0.5, 8, -8], [1, 8, 4], "flosse", drehung=[-20, 0, 0], drehpunkt=[0, 8, -6])
    kopf = m.knoch("kopf", [0, 4, -8], "rumpf")
    kopf.kasten([-2.5, 1, -13], [5, 6, 5], "kopf")
    kopf.kasten([-0.5, 4, -30], [1, 1, 17], "schwert")
    kopf.kasten([-1, 1, -15], [2, 1, 2], "kopf")
    for name, x, z in (("flosse_links", 3, 1), ("flosse_rechts", -3, -1)):
        f = m.knoch(name, [x, 2, -5], "rumpf", drehung=[0, -10 * z, 35 * z])
        f.kasten([x if z > 0 else x - 6, 1.5, -6], [6, 1, 2], "flosse")
    s1 = m.knoch("schwanz1", [0, 4, 10], "rumpf")
    s1.kasten([-2, 1.5, 10], [4, 5, 7], "haut")
    fl = m.knoch("schwanzflosse", [0, 4, 17], "schwanz1")
    fl.kasten([-0.5, 4, 16], [1, 9, 3], "flosse", drehung=[-45, 0, 0], drehpunkt=[0, 4, 17])
    fl.kasten([-0.5, -4, 16], [1, 9, 3], "flosse", drehung=[45, 0, 0], drehpunkt=[0, 4, 17])
    return m


def schwertfisch_maler(variante):
    pal = palette("#4c4466", "#221c34", 3)
    silber = hexfarbe("#c4ccd4")
    weiss = hexfarbe("#eef0f4")

    def f(stoff, p, n, texel):
        if stoff == "schwert":
            return hexfarbe("#2e2a34") if n[1] >= 0 else hexfarbe("#56525c")
        if stoff == "kopf" and abs(n[0]) > 0.5 and nah(p, (0, 5, -11), (3, 0.8, 0.8)):
            return hexfarbe("#0a0a14") if texel[0] % 2 else hexfarbe("#4a70b0")
        if stoff == "flosse":
            return fell(pal, p, n, texel, 151, verschiebung=0.15, tupfer=0.0)
        if n[1] < -0.5:
            return weiss
        if abs(n[0]) > 0.5:
            if p[1] < 3:
                return weiss
            if p[1] < 5.5:
                return silber                               # silbrige Flanke
        return fell(pal, p, n, texel, 153, tupfer=0.0)
    return f
