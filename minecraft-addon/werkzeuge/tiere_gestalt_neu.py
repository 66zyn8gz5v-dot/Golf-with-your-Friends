#!/usr/bin/env python3
"""Gestalt und Haut der sechs Tiere aus Fassung 4.41.

Fynn: "Machst du noch fuenf neue Mobs, die es im echten Leben gibt. Land,
Wasser ist egal. Ich haette aber gern noch einen extra Mob in der Luft."

    Elefant       Savanne - Ruessel, der schwingt; Ohren, die faecheln
    Nashorn       Savanne - zwei Hoerner, Hautfalten wie Panzerplatten
    Gorilla       Dschungel - geht auf den Knoecheln, trommelt auf die Brust
    Walross       Eisschollen und Kuesten im Norden - Stosszaehne, Bart
    Mantarochen   warmes Meer - fliegt mit den Brustflossen durchs Wasser
    Steinadler    Berge - kreist hoch oben und stoesst auf Kaninchen herab

Dieselben Regeln wie bei den ersten zwoelf (tiere_gestalt.py): ruhige
Farben in kleinen Stufen, scharfe Augen, Nasen, Krallen; runde Formen aus
mehreren Kaesten. Masse: 16 sind ein Block, vorn ist -z.

tiere_gestalt.py holt diese Datei am Ende herein, damit tiere_bauen.py
alle Tiere an einer Stelle findet.
"""

import tiere_gestalt as g
from tiere_gestalt import beine, nah, paar, ton
from tiermodell import Modell, hexfarbe, mische, wolken


# Nur Modelle und Maler gehen nach tiere_gestalt - die Hilfen dort bleiben.
__all__ = [f"{t}_{w}" for t in ("elefant", "nashorn", "gorilla", "walross", "manta", "adler")
           for w in ("modell", "maler")]


def auge(p, n, orte, iris="#1a120c", halb=(0.5, 0.5, 0.5)):
    # Ueber das Modul, damit g.JUNG (grosse Babyaugen) gilt.
    return g.auge(p, n, orte, iris, halb)


# ================================================================== Elefant

def elefant_modell():
    m = Modell("elefant", sichtbreite=4.5, sichthoehe=4)
    body = m.knoch("body", [0, 26, 0])
    body.kasten([-10, 18, -14], [20, 20, 28], "haut")
    body.kasten([-8, 38, -13], [16, 2, 22], "haut")            # runder Ruecken
    body.kasten([-2, 40, -11], [4, 1, 16], "haut")             # Rueckgrat
    body.kasten([-9, 17, -12], [18, 1, 24], "bauch")
    body.kasten([-7, 16, -8], [14, 1, 15], "bauch")            # der Bauch haengt etwas
    body.kasten([-9, 19, 14], [18, 17, 1], "haut")             # Hinterteil
    body.kasten([-9, 19, -15], [18, 17, 1], "haut")            # Brust
    # Schultern und Hueften treten an den Flanken hervor.
    paar(body, [9.5, 20, -13], [1, 16, 9], "haut")
    paar(body, [9.5, 20, 4], [1, 15, 9], "haut")
    kopf = m.knoch("head", [0, 34, -14], "body")
    kopf.kasten([-7, 25, -26], [14, 15, 12], "kopf")
    kopf.kasten([-6, 40, -24], [12, 2, 8], "kopf")             # hohe Stirn
    paar(kopf, [1, 42, -23], [4, 1, 5], "kopf")               # die zwei Beulen oben auf dem Kopf
    paar(kopf, [6.5, 26, -25], [1, 7, 8], "kopf")             # Wangen
    paar(kopf, [6.5, 35, -25], [1, 1, 4], "braue")
    kiefer = m.knoch("kiefer", [0, 25, -22], "head")
    kiefer.kasten([-3, 22, -27], [6, 3, 4], "maul")            # Unterlippe, oeffnet sich beim Trompeten
    zaehne = m.knoch("stosszaehne", [0, 26, -25], "head")
    paar(zaehne, [3, 23, -32], [2, 2, 7], "stosszahn", drehung=[-25, 0, 0], drehpunkt=[4, 25, -26])
    paar(zaehne, [3.5, 26.5, -35], [1, 1, 4], "stosszahn", drehung=[-50, 0, 0], drehpunkt=[4, 27, -31])
    # Die grossen Ohren stehen seitlich vom Kopf ab, weit ueber den Rumpf
    # hinaus - Scharnier am Kopf, damit sie faecheln koennen. Unten ein
    # Lappen, oben ein umgeschlagener Rand, wie beim afrikanischen Elefanten.
    for name, x, zeichen in (("ohr_links", 7, 1), ("ohr_rechts", -7, -1)):
        ohr = m.knoch(name, [x, 32, -20], "head")
        ohr.kasten([x if zeichen > 0 else x - 10, 22, -21], [10, 17, 1], "ohr")
        ohr.kasten([x + 1 if zeichen > 0 else x - 7, 18, -21], [6, 4, 1], "ohr")
        ohr.kasten([x if zeichen > 0 else x - 10, 38, -21.5], [10, 1, 2], "ohrrand")
        ohr.kasten([x + 9 if zeichen > 0 else x - 10, 23, -21.5], [1, 15, 2], "ohrrand")
    r1 = m.knoch("ruessel1", [0, 30, -27], "head")
    r1.kasten([-3, 26, -30.5], [6, 5, 5], "ruessel")           # breiter Ansatz
    r1.kasten([-2.5, 20, -30], [5, 6, 4], "ruessel")
    r2 = m.knoch("ruessel2", [0, 20, -28], "ruessel1")
    r2.kasten([-2.5, 11, -30], [5, 9, 4], "ruessel")
    r3 = m.knoch("ruessel3", [0, 11, -28], "ruessel2")
    r3.kasten([-2, 4, -29.5], [4, 7, 3], "ruessel")
    r3.kasten([-2.5, 3, -30], [5, 1, 4], "ruesselspitze")
    paar(r3, [0.5, 2, -30.5], [1, 1, 1], "ruesselspitze")         # die zwei "Finger" an der Spitze
    schwanz = m.knoch("tail", [0, 34, 14], "body")
    schwanz.kasten([-0.5, 22, 14], [1, 12, 1], "haut")
    schwanz.kasten([-1, 19, 13.5], [2, 3, 2], "quaste")
    beine(m, "body", 6, -9, 9, (7, 18, 7), 18, pfote=(8, 2, 8))
    # Knie und Fussgelenke: die Beine werden an zwei Stellen dicker.
    for name, x, z in (("leg0", 6, -9), ("leg1", -6, -9), ("leg2", 6, 9), ("leg3", -6, 9)):
        m.finde(name).kasten([x - 4, 8, z - 4], [8, 3, 8], "knie")
    saenfte(m)
    return m


def saenfte(m):
    """Der Elefantensattel: eine Saenfte wie in Indien - Decke mit
    Goldborte, Holzplattform mit Bruestung, drei Kissen, vier Pfosten und
    ein Dach mit Spitze; an den Flanken zwei Kisten fuer den Stauraum.
    Nur zu sehen, wenn der Elefant gesattelt ist (part_visibility)."""
    s = m.knoch("saenfte", [0, 40, 0], "body")
    s.kasten([-10.5, 40, -11], [21, 1, 20], "decke")
    paar(s, [10, 29, -10], [1, 11, 18], "decke")
    paar(s, [10.2, 28, -10], [1, 1, 18], "borte")
    s.kasten([-8, 41, -9], [16, 1, 18], "holz")
    s.kasten([-8, 42, -9], [16, 3, 1], "wand")
    s.kasten([-8, 42, 8], [16, 3, 1], "wand")
    paar(s, [7, 42, -8], [1, 3, 16], "wand")
    for x in (-8, 7):
        for z in (-9, 8):
            s.kasten([x, 45, z], [1, 15, 1], "pfosten")
    s.kasten([-6, 42, -7], [12, 1, 5], "kissen")                  # vorn der Lenker
    paar(s, [0.5, 42, 1], [5, 1, 5], "kissen")                     # hinten zwei
    s.kasten([-9.5, 60, -10.5], [19, 1, 21], "dach")
    s.kasten([-7.5, 61, -8.5], [15, 1, 17], "dach")
    s.kasten([-5, 62, -6], [10, 1, 12], "dach")
    s.kasten([-2, 63, -3], [4, 1, 6], "dach")
    s.kasten([-0.5, 64, -0.5], [1, 3, 1], "gold")                  # Spitze
    s.kasten([-9.5, 59, -10.5], [19, 1, 1], "fransen")
    s.kasten([-9.5, 59, 9.5], [19, 1, 1], "fransen")
    paar(s, [8.5, 59, -9.5], [1, 1, 19], "fransen")
    paar(s, [10.5, 25, -3], [3, 6, 6], "kiste")                    # Stauraum an den Flanken
    paar(s, [13.5, 27, -0.5], [1, 1, 1], "gold")                   # Schloss


ELEFANT_FARBEN = {"savanne": "#8a8078", "grau": "#7a7a78", "kalb": "#9a928a"}


def elefant_maler(variante):
    haut = ELEFANT_FARBEN[variante]

    staub = "#8a6a58" if variante == "savanne" else None

    def falten(p, n, texel, saat, hell=0.0):
        # Die Haut: waagerechte Falten in jeder dritten Zeile, oben heller
        # von der Sonne. Savannenelefanten tragen unten roten Staub - sie
        # bewerfen sich damit gegen die Hitze.
        h = hell - (0.045 if int(p[1]) % 3 == 0 and abs(n[1]) < 0.5 else 0.0)
        h += 0.05 if n[1] > 0.5 else 0.0
        farbe = haut
        if staub and p[1] < 16:
            # weich nach unten, in drei Stufen - kein Muster
            farbe = mische(hexfarbe(haut), hexfarbe(staub), min(0.6, round((16 - p[1]) / 16 * 3) / 3 * 0.6))
        return ton(farbe, p, n, texel, saat, hell=h, straehne=0.0, wolke=0.05)

    def f(stoff, p, n, texel):
        if stoff in SAENFTE:
            return saenfte_maler(stoff, p, n, texel)
        if stoff == "stosszahn":
            return ton("#ece4cc", p, n, texel, 301, straehne=0.0, hell=0.05 if n[1] > 0.5 else 0.0)
        if stoff == "ohrrand":
            return falten(p, n, texel, 302, hell=-0.06)
        if stoff == "braue":
            return falten(p, n, texel, 306, hell=-0.1)
        if stoff == "knie":
            # Tiefe Falten um das Knie herum.
            return falten(p, n, texel, 308, hell=-0.1 if int(p[1]) == 9 else -0.03)
        if stoff == "ohr":
            if n[2] > 0.5 and abs(p[0]) > 8:
                # Hinten rosig, mit dunkleren Adern, die sich verzweigen.
                ader = abs((abs(p[0]) - 8) * 0.8 - (p[1] - 22) * 0.5 - 3) < 0.45 or abs(p[1] - 30.5) < 0.45
                return ton("#8a7470" if ader else "#a08a86", p, n, texel, 303, straehne=0.0)
            if n[2] < -0.5 and (abs(p[0]) > 15.4 or p[1] < 22.6 or p[1] > 38.4):
                return falten(p, n, texel, 304, hell=-0.08)                  # dunkler Rand
            return falten(p, n, texel, 305, hell=-0.03)
        if stoff == "pfote":
            if n[2] < -0.5 and p[1] < 1.6 and abs((p[0] % 3.0) - 1.5) < 0.6:
                return hexfarbe("#d8d0bc")                                 # Zehennaegel
            return ton(haut, p, n, texel, 307, hell=-0.1, straehne=0.0)
        if stoff == "ruesselspitze":
            return ton(haut, p, n, texel, 309, hell=-0.12, straehne=0.0)
        if stoff == "maul":
            if n[1] > 0.5:
                return ton("#a0706c", p, n, texel, 310, straehne=0.0)       # rosa Innenseite
            return ton("#6a5a58", p, n, texel, 311, straehne=0.0)
        if stoff == "quaste":
            return ton("#2a2420", p, n, texel, 313, straehne=0.05)
        if stoff == "kopf":
            a = auge(p, n, [(-7, 34, -23), (7, 34, -23)], "#3a2a1c")
            if a and abs(n[0]) > 0.5:
                return a
            if abs(n[0]) > 0.5 and nah(p, (0, 33.5, -23), (8, 1.5, 2.2)):
                return falten(p, n, texel, 316, hell=-0.1)                   # Runzeln ums Auge
            if abs(n[0]) > 0.5 and abs(p[1] - 30.5) < 0.5 and -25 < p[2] < -18:
                return falten(p, n, texel, 318, hell=-0.12)                  # Schlaefe
            if g.JUNG and n[1] > 0.5 and p[1] > 41:
                return ton("#5a524a", p, n, texel, 315, straehne=0.06)      # Flaum auf dem Kopf
            return falten(p, n, texel, 317, hell=0.02)
        if stoff == "ruessel":
            # Ringe um den Ruessel.
            return falten(p, n, texel, 319, hell=-0.04 if int(p[1]) % 2 else 0.0)
        if stoff == "bauch":
            return falten(p, n, texel, 321, hell=-0.1)
        if stoff == "bein":
            # Senkrechte Runzeln an den Beinen.
            return falten(p, n, texel, 323, hell=-0.04 - (0.05 if int(p[0] + p[2]) % 3 == 0 else 0.0))
        return falten(p, n, texel, 325, hell=0.04 * (p[1] - 28) / 10)
    return f


SAENFTE = {"decke": "#9a2a2a", "borte": "#d8b050", "holz": "#6a4428", "wand": "#6a4428", "pfosten": "#4a2e1a",
           "kissen": "#3a5a8a", "dach": "#a83232", "gold": "#e0b850", "fransen": "#d8b050", "kiste": "#6a4428"}


def saenfte_maler(stoff, p, n, texel):
    if stoff == "decke" and n[1] > 0.5 and (abs(abs(p[0]) - 9.5) < 0.6 or abs(p[2] + 10.5) < 0.6 or abs(p[2] - 8.5) < 0.6):
        return ton("#d8b050", p, n, texel, 461, straehne=0.0)          # Goldborte oben
    if stoff == "decke" and abs(n[0]) > 0.5 and abs(p[1] - 34.5) < 0.5:
        return ton("#d8b050", p, n, texel, 463, straehne=0.0)          # Muster an der Seite
    if stoff == "wand" and p[1] > 44.4:
        return ton("#d8b050", p, n, texel, 465, straehne=0.0)          # vergoldeter Handlauf
    if stoff == "dach" and abs(n[1]) > 0.5 and int(abs(p[0]) + 0.5) % 4 < 2:
        return ton("#e0b850", p, n, texel, 467, straehne=0.0)          # Streifen im Dachstoff
    if stoff == "kiste" and (abs(p[1] - 28) < 0.5 or abs(abs(p[2] - 0) - 2.5) < 0.5):
        return ton("#3a3a40", p, n, texel, 469, straehne=0.0)          # Eisenbaender
    if stoff == "fransen" and texel[0] % 2 == 1:
        return None
    return ton(SAENFTE[stoff], p, n, texel, 471, straehne=0.03 if stoff in ("holz", "wand", "pfosten", "kiste") else 0.0,
               hell=0.05 if n[1] > 0.5 else 0.0)


# ================================================================== Nashorn

def nashorn_modell():
    m = Modell("nashorn", sichtbreite=3.5, sichthoehe=2.5)
    body = m.knoch("body", [0, 20, 0])
    body.kasten([-8, 12, -13], [16, 15, 26], "haut")
    body.kasten([-7, 27, -12], [14, 2, 10], "haut")            # Nackenbuckel
    body.kasten([-6, 27, 1], [12, 1, 10], "haut")
    body.kasten([-7, 11, -11], [14, 1, 22], "bauch")
    body.kasten([-7, 13, 13], [14, 13, 1], "haut")
    # Die grossen Hautfalten an Schulter und Huefte - wie Panzerplatten.
    paar(body, [8, 13, -8], [1, 12, 1], "falte")
    paar(body, [8, 13, 6], [1, 12, 1], "falte")
    body.kasten([-7.5, 12, -14], [15, 13, 1], "falte")          # der Halskragen
    paar(body, [8, 22, -12], [1, 5, 4], "haut")                 # Schulterpanzer
    paar(body, [8, 21, 7], [1, 5, 5], "haut")                   # Hueftpanzer
    for z in (-10, -6, -2, 2, 6):
        body.kasten([-1, 29 if z < 0 else 28, z], [2, 1, 2], "haut")   # kleine Hoecker am Rueckgrat
    kopf = m.knoch("head", [0, 22, -13], "body")
    kopf.kasten([-5, 10, -25], [10, 10, 12], "kopf")
    kopf.kasten([-4, 9, -31], [8, 7, 6], "schnauze")
    kopf.kasten([-4.5, 8, -31], [9, 1, 5], "lippe")             # die breite, eckige Lippe
    paar(kopf, [5, 12, -23], [1, 5, 6], "kopf")                 # Backen
    paar(kopf, [5, 16, -22], [1, 1, 3], "falte")                # Falte ueber dem Auge
    for name, x in (("ohr_links", 4.5), ("ohr_rechts", -4.5)):
        ohr = m.knoch(name, [x, 19, -15.5], "head", drehung=[0, 0, -20 if x > 0 else 20])
        ohr.kasten([x - 1, 19, -16], [2, 4, 1], "ohr")
        ohr.kasten([x - 1, 23, -16], [2, 1, 1], "ohrhaar")
    hoerner = m.knoch("horn", [0, 16, -28], "head")
    hoerner.kasten([-1.5, 16, -30], [3, 5, 3], "horn")
    hoerner.kasten([-1, 20, -29.5], [2, 3, 2], "horn", drehung=[-15, 0, 0], drehpunkt=[0, 20, -28.5])
    hoerner.kasten([-0.5, 22.5, -29], [1, 2, 1], "hornspitze", drehung=[-25, 0, 0], drehpunkt=[0, 22.5, -28.5])
    hoerner.kasten([-1, 16, -25.5], [2, 3, 2], "horn")          # das kleine zweite Horn
    schwanz = m.knoch("tail", [0, 25, 13], "body")
    schwanz.kasten([-0.5, 17, 13], [1, 8, 1], "haut")
    schwanz.kasten([-1, 15, 12.5], [2, 2, 2], "quaste")
    beine(m, "body", 5, -9, 9, (5, 12, 5), 12, pfote=(6, 2, 6))
    for name, x, z in (("leg0", 5, -9), ("leg1", -5, -9), ("leg2", 5, 9), ("leg3", -5, 9)):
        m.finde(name).kasten([x - 3, 5, z - 3], [6, 2, 6], "falte")   # Knie
    return m


NASHORN_FARBEN = {"grau": "#8a8884", "dunkel": "#5e5a56", "kalb": "#9a9690"}


def nashorn_maler(variante):
    haut = NASHORN_FARBEN[variante]

    def f(stoff, p, n, texel):
        if stoff == "hornspitze":
            return hexfarbe("#3a3430")
        if stoff == "horn":
            # Horn waechst in Ringen - feine waagerechte Linien.
            return ton("#6a6258", p, n, texel, 331, straehne=0.04,
                       hell=(0.06 if p[1] > 19 else 0.0) - (0.06 if int(p[1]) % 2 == 0 and abs(n[1]) < 0.5 else 0.0))
        if stoff == "pfote":
            if n[2] < -0.5 and p[1] < 1.6 and abs(p[0] % 2.0 - 1.0) < 0.5:
                return hexfarbe("#3a342e")                                 # drei Zehen
            return ton(haut, p, n, texel, 333, hell=-0.12, straehne=0.0)
        if stoff == "falte":
            return ton(haut, p, n, texel, 335, hell=-0.14, straehne=0.0)
        if stoff == "quaste":
            return ton("#2a2622", p, n, texel, 337, straehne=0.04)
        if stoff == "ohrhaar":
            return ton("#3a3430", p, n, texel, 338, straehne=0.0)
        if stoff == "ohr":
            if n[2] < -0.5:
                return ton("#6a5e58", p, n, texel, 339, straehne=0.0)
            return ton(haut, p, n, texel, 341, straehne=0.0)
        if stoff == "lippe":
            return ton(haut, p, n, texel, 343, hell=-0.08, straehne=0.0)
        if stoff == "schnauze":
            if n[2] < -0.5 and p[1] > 13.5 and 1.0 < abs(p[0]) < 2.6:
                return hexfarbe("#1a1614")                                 # Nuestern
            return ton(haut, p, n, texel, 345, straehne=0.0)
        if stoff == "kopf":
            a = auge(p, n, [(-5, 15, -21), (5, 15, -21)], "#2a1e14")
            if a and abs(n[0]) > 0.5:
                return a
            return ton(haut, p, n, texel, 347, straehne=0.0, hell=0.02)
        if stoff == "bauch":
            return ton(haut, p, n, texel, 349, hell=-0.1, straehne=0.0)
        if stoff == "bein":
            return ton(haut, p, n, texel, 351, hell=-0.05, straehne=0.0)
        # Der Rumpf: eine waagerechte Falte an der Flanke, sonst ruhig.
        if abs(n[0]) > 0.5 and abs(p[1] - 16.5) < 0.5:
            return ton(haut, p, n, texel, 353, hell=-0.1, straehne=0.0)
        return ton(haut, p, n, texel, 355, straehne=0.0, hell=0.03 * (p[1] - 19) / 8)
    return f


# ================================================================== Gorilla

def gorilla_modell():
    """Ein Silberruecken geht auf den Knoecheln: lange Arme vorn, kurze
    Beine hinten, die Schultern hoch, der Ruecken faellt nach hinten ab."""
    m = Modell("gorilla", sichtbreite=2.5, sichthoehe=2.5)
    body = m.knoch("body", [0, 20, 0], drehung=[-14, 0, 0])
    body.kasten([-7.5, 13, -11], [15, 14, 12], "brust")
    body.kasten([-6, 12, 1], [12, 11, 9], "fell")
    body.kasten([-6, 27, -10], [12, 2, 8], "fell")            # Schulterbuckel
    body.kasten([-5, 23, 1], [10, 1, 7], "fell")
    paar(body, [0.5, 19, -11.6], [5, 6, 1], "brust")          # Brustmuskeln
    body.kasten([-4, 13.5, -11.3], [8, 5, 1], "brust")        # Bauch
    paar(body, [7.5, 20, -10], [1, 6, 7], "fell")              # Schultern
    kopf = m.knoch("head", [0, 26, -11], "body")
    kopf.kasten([-4, 23, -17], [8, 8, 7], "kopf")
    kopf.kasten([-4.5, 29, -18], [9, 2, 2], "braue")          # der Wulst ueber den Augen
    kopf.kasten([-3, 25, -19], [6, 2, 2], "gesicht")          # Nase und Oberlippe
    kopf.kasten([-1.5, 27, -18.5], [3, 2, 1], "gesicht")      # Nasenruecken
    kopf.kasten([-2, 31, -15], [4, 2, 5], "kopf")             # Scheitelkamm
    kopf.kasten([-1, 33, -13], [2, 1, 3], "kopf")
    paar(kopf, [4, 26, -14], [1, 2, 2], "ohr")
    kiefer = m.knoch("kiefer", [0, 24, -15], "head")
    kiefer.kasten([-3, 22, -19], [6, 3, 3], "gesicht")        # Unterkiefer - klappt beim Bruellen auf
    kiefer.kasten([-2, 24, -18.5], [4, 1, 1], "zahn")
    # Arme vorn (leg0, leg1), lang und kraeftig, mit der Faust auf dem Boden.
    for name, x in (("leg0", 8.5), ("leg1", -8.5)):
        b = m.knoch(name, [x, 26, -7], "body")
        b.kasten([x - 2.5, 3, -9.5], [5, 23, 5], "arm")
        b.kasten([x - 3, 3, -10], [6, 9, 6], "arm")                # kraeftige Unterarme
        b.kasten([x - 3, 0, -10.5], [6, 3, 6], "faust")
    for name, x in (("leg2", 4), ("leg3", -4)):
        b = m.knoch(name, [x, 12, 6], "body")
        b.kasten([x - 2.5, 2, 3.5], [5, 10, 5], "fell")
        b.kasten([x - 2.5, 0, 2.5], [5, 2, 6], "fuss")
        b.kasten([x - 3, 5, 3], [6, 5, 6], "fell")                  # Oberschenkel
    return m


def gorilla_maler(variante):
    silber = variante == "silberruecken"
    jung = variante == "jung"
    fell = "#4a4440" if jung else "#3e3a37"

    def f(stoff, p, n, texel):
        if stoff == "zahn":
            return ton("#e0d8c8", p, n, texel, 360, straehne=0.0)
        if stoff == "faust" and n[2] < -0.5 and texel[0] % 2 == 0 and p[1] > 1:
            return ton("#121010", p, n, texel, 359, straehne=0.0)          # Fingerknoechel
        if stoff in ("gesicht", "faust", "fuss"):
            if stoff == "gesicht" and n[2] < -0.5 and p[1] > 25.5 and 0.5 < abs(p[0]) < 1.8:
                return hexfarbe("#0a0808")                                 # Nasenloecher
            return ton("#1c1a19", p, n, texel, 361, straehne=0.0, hell=0.08 if n[1] > 0.5 else 0.0)
        if stoff == "braue":
            return ton("#1e1c1a", p, n, texel, 363, straehne=0.0)
        if stoff == "kopf":
            a = auge(p, n, [(-2, 27.5, -17), (2, 27.5, -17)], "#4a2e1a")
            if a and n[2] < -0.5:
                return a
            if n[2] < -0.5 and p[1] < 29 and abs(p[0]) < 3.5:
                return ton("#1e1c1a", p, n, texel, 365, straehne=0.0)       # das nackte Gesicht
            return ton(fell, p, n, texel, 367, straehne=0.05)
        if stoff == "ohr":
            return ton("#1e1c1a", p, n, texel, 369, straehne=0.0)
        if silber and stoff in ("fell",) and (n[1] > 0.3 or abs(n[0]) > 0.5) and p[1] > 16:
            return ton("#8a8884", p, n, texel, 371, straehne=0.06)          # der silberne Ruecken
        if stoff == "brust":
            if n[2] < -0.5:
                return ton("#1e1c1a", p, n, texel, 373, straehne=0.0, hell=0.04)   # nackte Brust
            if silber and n[1] > 0.3:
                return ton("#8a8884", p, n, texel, 375, straehne=0.06)
        return ton(fell, p, n, texel, 377, straehne=0.05)
    return f


# ================================================================== Walross

def walross_modell():
    m = Modell("walross", sichtbreite=3, sichthoehe=1.6)
    body = m.knoch("body", [0, 8, 0])
    body.kasten([-8, 1, -10], [16, 14, 20], "haut")
    body.kasten([-7, 15, -8], [14, 2, 16], "haut")
    body.kasten([-7, 0, -8], [14, 1, 16], "bauch")
    body.kasten([-6, 3, 10], [12, 10, 3], "haut")             # das Hinterteil wird schmal
    body.kasten([-7.5, 3, -11], [15, 11, 1], "falte")         # Speckfalte am Hals
    paar(body, [8, 3, -5], [1, 10, 11], "haut")                # dicke Flanken
    body.kasten([-5, 17, -6], [10, 1, 10], "haut")             # Buckel
    kopf = m.knoch("head", [0, 12, -10], "body")
    kopf.kasten([-5, 9, -17], [10, 9, 7], "kopf")
    kopf.kasten([-4.5, 8, -20], [9, 5, 3], "schnauze")
    paar(kopf, [0.5, 8, -21], [4, 4, 1], "bartpolster")      # die zwei dicken Bartpolster
    kopf.kasten([-2, 13, -19.5], [4, 1, 2], "schnauze")       # Nasenruecken
    paar(kopf, [4.5, 15, -15], [1, 1, 2], "falte")            # Brauen
    zaehne = m.knoch("zaehne", [0, 8, -19], "head")
    paar(zaehne, [2.5, 1, -19], [1, 7, 1], "stosszahn")
    paar(zaehne, [2, 7, -19.5], [2, 1, 2], "bartpolster")    # wo die Zaehne aus der Lippe kommen
    for name, x in (("leg0", 7), ("leg1", -7)):
        b = m.knoch(name, [x, 4, -6], "body")
        b.kasten([x if x > 0 else x - 4, 0, -9], [4, 2, 5], "flosse")
        b.kasten([x + (4 if x > 0 else -5), 0, -8.5], [1, 1, 4], "flosse")    # Fingerspitzen
        b.kasten([x - 1 if x > 0 else x - 2, 2, -8], [3, 3, 3], "haut")      # Oberarm
    for name, x in (("leg2", 3), ("leg3", -3)):
        b = m.knoch(name, [x, 3, 12], "body")
        b.kasten([x - 2, 0, 12], [4, 2, 6], "flosse")
        b.kasten([x - 2.5, 0, 17], [5, 1, 2], "flosse")                       # gespreizte Hinterflosse
    return m


def walross_maler(variante):
    haut = "#8a6a5a" if variante == "jung" else "#9a6a52"

    def f(stoff, p, n, texel):
        if stoff in SAENFTE:
            return saenfte_maler(stoff, p, n, texel)
        if stoff == "stosszahn":
            return ton("#ece2c8", p, n, texel, 381, straehne=0.0)
        if stoff == "flosse":
            if n[1] > 0.5 and texel[0] % 2 == 0:
                return ton(haut, p, n, texel, 382, hell=-0.2, straehne=0.0)   # Zehenlinien
            return ton(haut, p, n, texel, 383, hell=-0.12, straehne=0.0)
        if stoff == "falte":
            return ton(haut, p, n, texel, 384, hell=-0.1, straehne=0.0)
        if stoff == "bartpolster":
            if n[2] < -0.5 and texel[1] % 2 == 0:
                return ton("#d8ccb8", p, n, texel, 385, straehne=0.0)         # Borsten in Reihen
            return ton(haut, p, n, texel, 386, hell=0.08, straehne=0.0)
        if stoff == "schnauze":
            # Der Bart: helle Borsten in Reihen.
            if n[2] < -0.5 and p[1] < 11 and int(p[0] + 10) % 2 == 0 and int(p[1]) % 2 == 0:
                return hexfarbe("#e0d4c0")
            return ton(haut, p, n, texel, 385, hell=0.06, straehne=0.0)
        if stoff == "kopf":
            a = auge(p, n, [(-5, 15, -14), (5, 15, -14)], "#2a1a12")
            if a and abs(n[0]) > 0.5:
                return a
            return ton(haut, p, n, texel, 387, straehne=0.0)
        if stoff == "bauch":
            return ton(haut, p, n, texel, 389, hell=-0.1, straehne=0.0)
        # Rosig-braune Haut mit weichen, groesseren Flecken, wie Falten.
        w = wolken(p, 5.0, 391, 1)
        return ton(haut, p, n, texel, 393, hell=-0.05 if w > 0.6 else 0.0, straehne=0.0)
    return f


# ================================================================== Mantarochen

def manta_modell():
    m = Modell("mantarochen", sichtbreite=3, sichthoehe=1)
    rumpf = m.knoch("rumpf", [0, 4, 0])
    rumpf.kasten([-4, 2, -8], [8, 3, 16], "koerper")
    rumpf.kasten([-3, 5, -6], [6, 1, 11], "koerper")
    rumpf.kasten([-2, 6, -4], [4, 1, 7], "koerper")             # der Ruecken woelbt sich
    rumpf.kasten([-3, 2.5, -8.3], [6, 1, 1], "maul")
    rumpf.kasten([-0.5, 5, 6], [1, 2, 2], "koerper")             # kleine Rueckenflosse
    for name, x in (("horn_links", 3), ("horn_rechts", -3)):
        h = m.knoch(name, [x, 3, -8], "rumpf")
        h.kasten([x - 1 if x > 0 else x - 1, 2, -11], [2, 2, 3], "horn")         # die Kopflappen
        h.kasten([x - 0.5 if x > 0 else x - 0.5, 2, -12], [1, 3, 1], "horn")      # eingerollt
    for name, spitze, x, z in (("flosse_links", "spitze_links", 4, 1), ("flosse_rechts", "spitze_rechts", -4, -1)):
        f = m.knoch(name, [x, 3.5, 0], "rumpf")
        f.kasten([x if z > 0 else x - 7, 3, -7], [7, 1, 12], "fluegel")
        f.kasten([x if z > 0 else x - 5, 3, 5], [5, 1, 2], "fluegel")         # geschwungene Hinterkante
        s = m.knoch(spitze, [x + 7 * z, 3.5, 0], name)
        s.kasten([x + 7 * z if z > 0 else x - 13, 3, -4], [6, 1, 7], "fluegel")
    s1 = m.knoch("schwanz1", [0, 3.5, 8], "rumpf")
    s1.kasten([-0.5, 3, 8], [1, 1, 12], "schwanz")
    return m


def manta_maler(variante):
    riff = variante == "riff"

    def f(stoff, p, n, texel):
        if stoff == "maul":
            return ton("#101216", p, n, texel, 400, straehne=0.0)
        if n[1] < -0.5 and stoff == "koerper" and abs(abs(p[0]) - 2.5) < 1.6 and -6 < p[2] < -1 \
                and texel[1] % 2 == 0:
            return ton("#9aa0a8", p, n, texel, 402, straehne=0.0)            # Kiemenspalten
        if n[1] < -0.5:
            # Bauch weiss, mit ein paar dunklen Tupfen - an denen man jeden
            # Manta erkennt.
            if stoff in ("koerper",) and wolken(p, 2.5, 401, 1) > 0.72:
                return ton("#3a3e46", p, n, texel, 403, straehne=0.0)
            return ton("#e8eaec", p, n, texel, 405, straehne=0.0)
        if stoff == "horn":
            return ton("#2a2e36", p, n, texel, 407, straehne=0.0)
        if stoff == "koerper" and n[2] < -0.5:
            return ton("#1e2228", p, n, texel, 409, straehne=0.0)
        if stoff == "koerper" and n[1] > 0.5 and abs(p[2] + 4) < 1.2 and abs(p[0]) > 1:
            return ton("#dfe2e6", p, n, texel, 411, straehne=0.0)         # helle Schulterflecken
        if riff and stoff == "fluegel" and n[1] > 0.5 and abs(p[2] + 3) < 2 and abs(p[0]) < 9:
            return ton("#c8ccd2", p, n, texel, 413, straehne=0.0)
        return ton("#23272e", p, n, texel, 415, straehne=0.0, hell=0.04 if n[1] > 0.5 else 0.0)
    return f


# ================================================================== Steinadler

def adler_modell():
    m = Modell("steinadler", sichtbreite=3, sichthoehe=1.2)
    rumpf = m.knoch("rumpf", [0, 8, 0])
    rumpf.kasten([-2.5, 5, -5], [5, 5, 10], "gefieder")
    rumpf.kasten([-2, 4, -4], [4, 1, 7], "brust")
    kopf = m.knoch("kopf", [0, 9, -5], "rumpf")
    kopf.kasten([-2, 8, -9], [4, 4, 4], "kopf")
    kopf.kasten([-1, 8, -11], [2, 2, 2], "schnabel")
    kopf.kasten([-0.5, 7, -11], [1, 1, 1], "schnabelspitze")
    kopf.kasten([-2.5, 11, -9], [5, 1, 3], "braue")
    kopf.kasten([-2.5, 8, -6], [5, 4, 2], "haube")            # goldene Nackenfedern
    kopf.kasten([-1, 7.5, -11.5], [2, 1, 1], "schnabelspitze") # der Haken
    unten = m.knoch("unterschnabel", [0, 8, -9], "kopf")
    unten.kasten([-0.5, 7, -10.5], [1, 1, 2], "schnabel")
    for name, spitze, x, z in (("fluegel_links", "fluegelspitze_links", 2.5, 1),
                               ("fluegel_rechts", "fluegelspitze_rechts", -2.5, -1)):
        f = m.knoch(name, [x, 9, -2], "rumpf")
        f.kasten([x if z > 0 else x - 10, 8.5, -4], [10, 1, 7], "fluegel")
        s = m.knoch(spitze, [x + 10 * z, 9, -2], name)
        s.kasten([x + 10 * z if z > 0 else x - 18, 8.5, -3.5], [8, 1, 6], "schwinge")
        f.kasten([x if z > 0 else x - 7, 9.2, -4], [7, 1, 4], "deckfedern")    # Deckfedern obenauf
        f.kasten([x + 2 if z > 0 else x - 10, 8.5, 3], [8, 1, 1], "fluegel")   # Armschwingen hinten
    schwanz = m.knoch("schwanz", [0, 8, 5], "rumpf")
    schwanz.kasten([-2.5, 7.5, 5], [5, 1, 6], "schwanzfeder")
    schwanz.kasten([-3.5, 7.5, 9], [7, 1, 3], "schwanzfeder")   # der Faecher wird hinten breiter
    fuesse = m.knoch("fuesse", [0, 5, 1], "rumpf")
    paar(fuesse, [0.5, 2, 0], [1, 3, 1], "fang")
    paar(fuesse, [0, 3.5, -0.5], [2, 2, 2], "hose")           # befiederte "Hosen" bis zum Fuss
    paar(fuesse, [0, 1, -1], [2, 1, 2], "kralle")
    return m


def adler_maler(variante):
    jung = variante == "jungvogel"
    braun, dunkel, gold = "#4a3222", "#34241a", "#b8863a"

    def f(stoff, p, n, texel):
        if stoff == "schnabelspitze":
            return hexfarbe("#2a2622")
        if stoff == "schnabel":
            if p[2] > -10 and n[1] > -0.5:
                return ton("#e0b840", p, n, texel, 421, straehne=0.0)      # gelbe Wachshaut
            return ton("#5a5650", p, n, texel, 423, straehne=0.0)
        if stoff in ("fang",):
            return ton("#e0b840", p, n, texel, 425, straehne=0.0)
        if stoff == "kralle":
            return hexfarbe("#1a1614") if p[2] < -0.5 else ton("#e0b840", p, n, texel, 427, straehne=0.0)
        if stoff == "braue":
            return ton(dunkel, p, n, texel, 429, straehne=0.0)
        if stoff == "haube":
            return ton(gold, p, n, texel, 430, straehne=0.06, hell=0.04)
        if stoff == "hose":
            return ton("#6a4a2c", p, n, texel, 428, straehne=0.05)
        if stoff == "deckfedern":
            if texel[0] % 3 == 0:
                return ton(dunkel, p, n, texel, 426, straehne=0.0)           # die Federreihen
            return ton("#5a3e28", p, n, texel, 424, straehne=0.03)
        if stoff == "kopf":
            a = auge(p, n, [(-2, 10.5, -7.5), (2, 10.5, -7.5)], "#c07a20")
            if a and abs(n[0]) > 0.5:
                return a
            if p[2] > -7.5 or n[1] > 0.5:
                return ton(gold, p, n, texel, 431, straehne=0.05)          # goldener Nacken
            return ton(braun, p, n, texel, 433, straehne=0.03)
        if stoff in ("fluegel", "schwinge"):
            # Die Schwungfedern: an der Hinterkante und an der Spitze
            # einzelne "Finger" mit Luft dazwischen.
            if stoff == "schwinge" and abs(p[0]) > 16.5 and texel[1] % 2 == 1:
                return None
            if p[2] > 1.8 and texel[0] % 2 == 1 and abs(n[1]) > 0.5:
                return ton(dunkel, p, n, texel, 435, straehne=0.0)
            if jung and n[1] < -0.5 and 6 < abs(p[0]) < 13:
                return ton("#e8e4dc", p, n, texel, 437, straehne=0.0)      # weisse Flecken der Jungen
            if n[1] > 0.5 and p[2] < -2.5:
                return ton("#7a5a3a", p, n, texel, 439, straehne=0.0)      # helle Deckfedern vorn
            return ton(braun if stoff == "fluegel" else dunkel, p, n, texel, 441, straehne=0.04)
        if stoff == "schwanzfeder":
            if jung and p[2] < 8.5:
                return ton("#e8e4dc", p, n, texel, 443, straehne=0.0)
            return ton(dunkel, p, n, texel, 445, straehne=0.05)
        if stoff == "brust":
            return ton("#3e2a1c", p, n, texel, 447, straehne=0.05)
        return ton(braun, p, n, texel, 449, straehne=0.04)
    return f
