#!/usr/bin/env python3
"""Die Kleintiere: Singvoegel, Specht, Schnecke, Eichhoernchen (4.77).

Fynn: "Ich haette gerne mehr kleinere Wesen, zum Beispiel kleinere Voegel,
ein Specht, der an Baeumen so Dings, eine Schnecke ... die alle auch
Funktionen haben." Was sie tun, steht in tiere_bauen.py (Verhalten) und
scripts/kleintiere.js; hier stehen Gestalt und Haut.

Alle vier sind doppelt so gross gebaut, wie sie im Spiel erscheinen, und
werden im Verhaltenspaket verkleinert (minecraft:scale). Ein Bildpunkt der
Haut ist bei ihnen darum nur ein halber Modellpixel - sonst haette ein
Rotkehlchen genau einen Punkt fuer seine rote Brust.
"""

import math

from tiermodell import Modell, hexfarbe, mische, streu
from tiere_gestalt import ton, auge, paar, beine


# ================================================================== Singvoegel

def singvogel_modell():
    m = Modell("singvogel", sichtbreite=1.2, sichthoehe=1.0)
    rumpf = m.knoch("rumpf", [0, 6, 0])
    rumpf.kasten([-2.5, 4, -4], [5, 5, 8], "gefieder")
    rumpf.kasten([-2, 3, -3], [4, 1, 5], "bauch")
    kopf = m.knoch("kopf", [0, 8, -4], "rumpf")
    kopf.kasten([-2, 7, -8], [4, 4, 4], "kopf")
    kopf.kasten([-0.5, 8, -10], [1, 1, 2], "schnabel")
    for name, x, seite in (("fluegel_links", 2.5, 1), ("fluegel_rechts", -2.5, -1)):
        f = m.knoch(name, [x, 8, -3], "rumpf")
        f.kasten([x if seite > 0 else x - 1, 4.5, -3.5], [1, 4, 8], "fluegel")
    schwanz = m.knoch("schwanz", [0, 7, 4], "rumpf", drehung=[-15, 0, 0])
    schwanz.kasten([-1.5, 6.5, 4], [3, 1, 6], "schwanz")
    fuesse = m.knoch("fuesse", [0, 4, 0], "rumpf")
    paar(fuesse, [0.5, 0, 0], [1, 4, 1], "bein")
    paar(fuesse, [0.5, 0, -1], [1, 1, 1], "bein")
    return m


# Rotkehlchen, Blaumeise, Spatz: Ruecken, Bauch, Brust/Gesicht, Fluegel,
# Kopfplatte.
SINGVOGEL_FARBEN = {
    "rotkehlchen": {"ruecken": "#7a6446", "bauch": "#ebe4d6", "brust": "#e0662e", "fluegel": "#6a5238",
                    "kappe": "#7a6446", "kante": "#a08662"},
    "blaumeise":   {"ruecken": "#8aa24a", "bauch": "#f0d23e", "brust": "#f0d23e", "fluegel": "#3f7ccc",
                    "kappe": "#3a78c8", "kante": "#eef2f4"},
    "spatz":       {"ruecken": "#8a643c", "bauch": "#c9c4ba", "brust": "#2c2824", "fluegel": "#7a5634",
                    "kappe": "#8a8a86", "kante": "#e8e0cc"},
}


def singvogel_maler(variante):
    f = SINGVOGEL_FARBEN.get(variante, SINGVOGEL_FARBEN["rotkehlchen"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "schnabel":
            return ton("#2a2622" if variante != "blaumeise" else "#1e1e22", p, n, texel, 701, straehne=0.0)
        if stoff == "bein":
            return ton("#9a7462", p, n, texel, 703, straehne=0.0)
        if stoff == "kopf":
            a = auge(p, n, [(-2, 9.5, -6.5), (2, 9.5, -6.5)], "#0c0a08")
            if a and abs(n[0]) > 0.5:
                return a
            if variante == "blaumeise":
                # Blaue Kappe, weisse Wangen, ein dunkelblauer Streifen durchs Auge.
                if y > 10.2 or (n[1] > 0.5):
                    return ton(f["kappe"], p, n, texel, 705, straehne=0.0)
                if abs(y - 9.5) < 0.5 and abs(n[0]) > 0.5:
                    return ton("#1e2a5a", p, n, texel, 706, straehne=0.0)
                if y < 8 and z < -6:
                    return ton("#1e2a5a", p, n, texel, 707, straehne=0.0)       # der Kinnlatz
                return ton("#f4f4f0", p, n, texel, 708, straehne=0.0)
            if variante == "spatz":
                if y > 10.2 or n[1] > 0.5:
                    return ton(f["kappe"], p, n, texel, 709, straehne=0.0)
                if z > -6 and abs(n[0]) > 0.5:
                    return ton("#8a5430", p, n, texel, 710, straehne=0.0)     # kastanienbrauner Nacken
                if y < 8.5 and (n[2] < -0.5 or z < -6.5):
                    return ton(f["brust"], p, n, texel, 711, straehne=0.0)    # der schwarze Latz
                return ton("#d8d4cc", p, n, texel, 712, straehne=0.0)
            # Rotkehlchen: Stirn, Gesicht und Kehle orange.
            if n[2] < -0.5 or (z < -6 and y < 10):
                return ton(f["brust"], p, n, texel, 713, straehne=0.0)
            return ton(f["ruecken"], p, n, texel, 714, straehne=0.02)
        if stoff == "gefieder":
            vorn = z < -1.5
            if n[1] > 0.5 or (abs(n[0]) > 0.5 and y > 7):
                if variante == "spatz" and streu(texel[0], texel[1], 5) < 0.3:
                    return ton("#3a2a1c", p, n, texel, 715, straehne=0.0)     # dunkle Laengsstriche
                return ton(f["ruecken"], p, n, texel, 716, straehne=0.03)
            if vorn:
                if variante == "blaumeise" and abs(x) < 0.6:
                    return ton("#2a3040", p, n, texel, 717, straehne=0.0)     # der Bauchstreifen
                if variante == "spatz":
                    return ton(f["brust"] if y > 6.5 else f["bauch"], p, n, texel, 718, straehne=0.0)
                return ton(f["brust"], p, n, texel, 719, straehne=0.0)
            return ton(f["bauch"], p, n, texel, 720, straehne=0.02)
        if stoff == "bauch":
            return ton(f["bauch"], p, n, texel, 721, straehne=0.0)
        if stoff == "fluegel":
            # Helle Kanten der Schwungfedern; bei Meise und Spatz eine Binde.
            if abs(z - 0.5) < 0.5 and variante != "rotkehlchen":
                return ton(f["kante"], p, n, texel, 722, straehne=0.0)
            if z > 2.5 and texel[1] % 2 == 0:
                return ton(f["kante"], p, n, texel, 723, straehne=0.0, hell=-0.1)
            return ton(f["fluegel"], p, n, texel, 724, straehne=0.03)
        if stoff == "schwanz":
            return ton(f["fluegel"], p, n, texel, 725, straehne=0.04, hell=-0.08)
        return ton(f["ruecken"], p, n, texel, 726)
    return male


# ================================================================== Specht

def specht_modell():
    m = Modell("specht", sichtbreite=1.3, sichthoehe=1.2)
    rumpf = m.knoch("rumpf", [0, 6, 0])
    rumpf.kasten([-2.5, 4, -4], [5, 6, 8], "gefieder")
    kopf = m.knoch("kopf", [0, 9, -4], "rumpf")
    kopf.kasten([-2, 8, -8], [4, 4, 4], "kopf")
    kopf.kasten([-0.5, 9, -11], [1, 1, 3], "schnabel")
    for name, x, seite in (("fluegel_links", 2.5, 1), ("fluegel_rechts", -2.5, -1)):
        f = m.knoch(name, [x, 9, -3], "rumpf")
        f.kasten([x if seite > 0 else x - 1, 4.5, -3.5], [1, 5, 8], "fluegel")
    # Der Stuetzschwanz: steife Federn, auf die er sich am Stamm lehnt.
    schwanz = m.knoch("schwanz", [0, 5, 4], "rumpf", drehung=[-10, 0, 0])
    schwanz.kasten([-1.5, 4.5, 4], [3, 1, 7], "schwanz")
    fuesse = m.knoch("fuesse", [0, 4, 0], "rumpf")
    paar(fuesse, [0.5, 1, -0.5], [1, 3, 1], "bein")
    paar(fuesse, [0.5, 1, -1.5], [1, 1, 1], "kralle")
    return m


def specht_maler(variante):
    maennchen = variante == "maennchen"

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "schnabel":
            return ton("#3a3632", p, n, texel, 731, straehne=0.0)
        if stoff in ("bein", "kralle"):
            return ton("#5a5650", p, n, texel, 732, straehne=0.0)
        if stoff == "kopf":
            a = auge(p, n, [(-2, 10.5, -6.5), (2, 10.5, -6.5)], "#140e0a", ring="#e8e4dc")
            if a and abs(n[0]) > 0.5:
                return a
            # Das Maennchen hat einen roten Fleck im Nacken.
            if maennchen and z > -5.2 and y > 10:
                return ton("#c82626", p, n, texel, 733, straehne=0.0)
            if n[1] > 0.5 or y > 11:
                return ton("#1c1a1a", p, n, texel, 734, straehne=0.0)         # schwarzer Scheitel
            # Weisse Wangen mit schwarzem Bartstreif darunter.
            if abs(n[0]) > 0.5 and abs(y - 9) < 0.55:
                return ton("#1c1a1a", p, n, texel, 735, straehne=0.0)
            return ton("#f0ece4", p, n, texel, 736, straehne=0.0)
        if stoff == "gefieder":
            if n[1] > 0.5 or (abs(n[0]) > 0.5 and y > 8):
                return ton("#1c1a1a", p, n, texel, 737, straehne=0.02)
            # Unterseite hell, zum Schwanz hin leuchtend rot.
            if z > 1.5 and y < 6:
                return ton("#d42c2c", p, n, texel, 738, straehne=0.0)
            return ton("#e6e0d2", p, n, texel, 739, straehne=0.02)
        if stoff == "fluegel":
            # Grosser weisser Schulterfleck, dahinter schwarz mit weissen Binden.
            if z < 0 and y > 6.5:
                return ton("#f2eee6", p, n, texel, 740, straehne=0.0)
            if z >= 0 and texel[1] % 3 == 0:
                return ton("#f2eee6", p, n, texel, 741, straehne=0.0, hell=-0.05)
            return ton("#1c1a1a", p, n, texel, 742, straehne=0.02)
        if stoff == "schwanz":
            return ton("#1c1a1a", p, n, texel, 743, straehne=0.03)
        return ton("#1c1a1a", p, n, texel, 744)
    return male


# ================================================================== Schnecke

def schnecke_modell():
    m = Modell("schnecke", sichtbreite=1.2, sichthoehe=1.0)
    fuss = m.knoch("fuss", [0, 1, 0])
    fuss.kasten([-2, 0, -7], [4, 2, 14], "koerper")
    kopf = m.knoch("kopf", [0, 2, -6], "fuss")
    kopf.kasten([-1.5, 1, -9], [3, 3, 3], "koerper")
    for name, x in (("fuehler_links", 1), ("fuehler_rechts", -1)):
        f = m.knoch(name, [x, 4, -8], "kopf", drehung=[-20, 0, 12 if x > 0 else -12])
        f.kasten([x - 0.5, 4, -8.5], [1, 4, 1], "fuehler")
    # Das Haus haengt nicht am Fuss: Zieht die Schnecke sich zurueck,
    # schrumpft der Fuss hinein, und das Haus bleibt, wo es ist.
    haus = m.knoch("haus", [0, 2, 1])
    haus.kasten([-3, 2, -3], [6, 7, 7], "haus")
    haus.kasten([-2.5, 1.5, 3.5], [5, 5, 1], "haus")
    return m


SCHNECKE_FARBEN = {
    # Haus, Baender, Koerper
    "weinberg": ("#c8a47a", "#7a5634", "#a89682"),
    "baender":  ("#e8cf5a", "#4a3020", "#9c8e78"),
}


def schnecke_maler(variante):
    haus, band, koerper = SCHNECKE_FARBEN.get(variante, SCHNECKE_FARBEN["weinberg"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "fuehler":
            if y > 7.2:
                return hexfarbe("#1a1612")                                    # die Augen an der Spitze
            return ton(koerper, p, n, texel, 751, straehne=0.0, hell=-0.05)
        if stoff == "koerper":
            # Warzige Haut: einzelne dunklere Punkte.
            if streu(texel[0], texel[1], 752) < 0.18:
                return ton(koerper, p, n, texel, 753, straehne=0.0, hell=-0.14)
            return ton(koerper, p, n, texel, 754, straehne=0.0)
        if stoff == "haus":
            # Die Spirale: auf den Seiten eine Archimedes-Spirale um die
            # Mitte des Hauses, oben und hinten Baender, die ihr folgen.
            cy, cz = 5.5, 0.5
            dy, dz = y - cy, z - cz
            r = math.hypot(dy, dz)
            w = math.atan2(dy, dz)
            if abs(n[0]) > 0.5:
                # Ein Umgang alle zwei Pixel: feiner zerfiele die Spirale
                # auf einer Seite von sieben Punkten in Kruemel.
                gang = (r - 2.0 * (w + math.pi) / (2 * math.pi)) / 2.0
                t = gang - math.floor(gang)
                if r < 0.9:
                    return ton(band, p, n, texel, 755, straehne=0.0)
                if t < 0.45:
                    return ton(band, p, n, texel, 756, straehne=0.0,
                               hell=0.0 if variante == "baender" else 0.08)
                return ton(haus, p, n, texel, 758, straehne=0.0, hell=0.1 * (1 - min(r, 3.5) / 3.5))
            if variante == "baender" and (abs(x) < 0.6 or abs(abs(x) - 2) < 0.5):
                return ton(band, p, n, texel, 759, straehne=0.0)
            if variante != "baender" and texel[0] % 3 == 0:
                return ton(haus, p, n, texel, 760, straehne=0.0, hell=-0.12)  # Anwachsstreifen
            return ton(haus, p, n, texel, 761, straehne=0.0)
        return ton(koerper, p, n, texel, 762)
    return male


# ================================================================== Eichhoernchen

def eichhoernchen_modell():
    m = Modell("eichhoernchen", sichtbreite=1.2, sichthoehe=1.4)
    body = m.knoch("body", [0, 6, 0])
    body.kasten([-2, 4, -4], [4, 4, 8], "fell")
    kopf = m.knoch("head", [0, 8, -4], "body")
    kopf.kasten([-2, 6, -8], [4, 4, 4], "kopf")
    kopf.kasten([-1, 6, -9], [2, 2, 1], "schnauze")
    paar(kopf, [1, 10, -6], [1, 2, 1], "ohr")
    paar(kopf, [1, 12, -6], [1, 1, 1], "pinsel")
    # Der buschige Schwanz: erst nach hinten, dann steil hoch, oben
    # eingerollt - fast so gross wie das ganze Tier.
    # Positiv um x hebt ein nach hinten zeigendes Glied an - so steht der
    # Schwanz hoch ueber dem Ruecken und rollt sich oben nach vorn.
    schwanz = m.knoch("tail", [0, 7, 4], "body", drehung=[40, 0, 0])
    schwanz.kasten([-2, 5, 4], [4, 4, 5], "schwanz")
    oben = m.knoch("tail2", [0, 7, 8.5], "tail", drehung=[55, 0, 0])
    oben.kasten([-2, 5, 8.5], [4, 4, 6], "schwanz")
    beine(m, "body", 1.5, -2.5, 2.5, (1, 4, 2), 4)
    return m


EICHHOERNCHEN_FARBEN = {
    # Fell, Bauch, Schwanz, Pinsel
    "rot":  ("#b4552a", "#f2e6cc", "#a24a24", "#6a2c14"),
    "grau": ("#8a8480", "#f0ece4", "#7e7672", "#5a5250"),
}


def eichhoernchen_maler(variante):
    fell, bauch, schwanz, pinsel = EICHHOERNCHEN_FARBEN.get(variante, EICHHOERNCHEN_FARBEN["rot"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "kopf":
            a = auge(p, n, [(-2, 8.5, -6.5), (2, 8.5, -6.5)], "#0c0a08", ring=bauch)
            if a and abs(n[0]) > 0.5:
                return a
            if y < 7 and n[1] < 0.5:
                return ton(bauch, p, n, texel, 771, straehne=0.0)              # helle Kehle
            return ton(fell, p, n, texel, 772, straehne=0.03)
        if stoff == "schnauze":
            if n[2] < -0.5 and y > 7.2:
                return hexfarbe("#2a1a14")                                    # die Nase
            return ton(fell, p, n, texel, 773, straehne=0.0, hell=0.05)
        if stoff == "ohr":
            return ton(fell, p, n, texel, 774, straehne=0.0, hell=-0.05)
        if stoff == "pinsel":
            return ton(pinsel, p, n, texel, 775, straehne=0.0)
        if stoff == "fell":
            if n[1] < -0.5 or (abs(n[0]) > 0.5 and y < 5) or (n[2] < -0.5 and y < 6.5):
                return ton(bauch, p, n, texel, 776, straehne=0.0)
            return ton(fell, p, n, texel, 777, straehne=0.04)
        if stoff == "schwanz":
            # Buschig: die Raender heller, darin einzelne Haarspitzen.
            rand = abs(x) > 1.4
            if rand and streu(texel[0], texel[1], 778) < 0.5:
                return ton(mische(hexfarbe(schwanz), hexfarbe(bauch), 0.35), p, n, texel, 779, straehne=0.0)
            return ton(schwanz, p, n, texel, 780, straehne=0.06)
        if stoff == "bein":
            return ton(fell, p, n, texel, 781, straehne=0.02, hell=-0.06)
        return ton(fell, p, n, texel, 782)
    return male
