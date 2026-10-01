#!/usr/bin/env python3
"""Drei Drachen, die es nur aus der Zucht gibt (5.2).

Fynn: "Und bei manchen entsteht auch eine andere Art, eine neue Art von
Drache." Wer bestimmte Arten paart, bekommt manchmal etwas ganz Neues
(scripts/drachenzucht.js, NEUE_ARTEN):

* Dampfdrache  - aus Feuerdrache und Frostwyvern. Schlank, elfenbeinfarben
  mit Kupferplatten, auf dem Ruecken zwei Paar Dampfschlote, aus denen es
  raucht. Er speit bruehend heissen Dampf und laesst Geysire aufsteigen.
* Sternendrache - aus Himmelsdrache und Nachtschwinge. Vier Sichelschwingen
  wie die Nachtschwinge, der lange Schwanz und die Maehne des
  Himmelsdrachen, nachtblau mit Nebelflecken, leuchtende Kristallzacken den
  Ruecken entlang, ein Stern auf der Stirn. Er speit einen Sternenstrahl
  und ruft Meteore vom Himmel.
* Lavadrache   - aus Feuerdrache und Schlunddrache. Schwer und breit,
  Basaltplatten auf dem Ruecken, ein gluehender Bauch, gluehende Risse an
  den Flanken, eine Keule am Schwanz. Er speit Lava und wirft Lavabomben.

Gebaut aus denselben Bausteinen wie die anderen (drachen_klotz), damit
Bewegungen, Sattel, Uralt-Zier, Jungdrachen und Mischlinge passen.
"""

import math

import haut as H
import drachen_klotz as dk
from tiermodell import Modell, mische, wolken
from drachen_gestalt import (MAEULER, Schwinge, schwinge_bauen, glieder, becken_abtrennen, sattel_bauen, glut)
from drachen_klotz import (klinge, klingen_reihe, bein_klotz, kopf_klotz, klotz_maler, fingerkrallen,
                           sichelschwinge_bauen, uralt_zier, sattelzone, NACHTSCHWINGE_HINTEN)

# Was unter dem Sattel verschwindet, damit nichts durch ihn sticht.
dk.STACHELSTOFFE = tuple(dict.fromkeys(dk.STACHELSTOFFE + ("basalt", "kupfer", "schlot", "sternzacke")))


# ================================================================== Lavadrache

LAVADRACHE_SCHWINGE = Schwinge((8, 27, -7), oberarm=14, unterarm=18, finger=(46, 42, 36, 28),
                               winkel=(16, -12, -40, -68), hinterkante=(8, 18), dicke=(6, 5, 3),
                               biegung=8, bogen=5.0)


def lavadrache_modell():
    """Schwer und breit: ein Leib wie ein Fels, Basaltplatten und -klingen
    den Ruecken entlang, der Bauch gluehend wie Lava unter einer Kruste,
    gluehende Risse an den Flanken, ein kurzer, dicker Hals, ein wuchtiger
    Kopf mit Dornenkranz, kurze, kraeftige Beine und eine Keule am Schwanz."""
    m = Modell("lavadrache", sichtbreite=11.0, sichthoehe=4.0)
    MAEULER.pop("lavadrache", None)
    r = m.knoch("rumpf", [0, 20, 0])
    r.kasten([-9, 12, -12], [18, 15, 13], "leib")
    r.kasten([-9, 12.5, 0], [18, 14, 10], "leib")
    r.kasten([-8, 13, 9], [16, 12, 7], "leib")
    r.kasten([-7, 11.5, -11], [14, 1, 26], "bauch")
    r.kasten([-7, 11, -13], [14, 11, 2], "brust")
    # Basaltplatten: breite Schilde, darauf Klingen.
    for z, b in ((-11, 14), (-4, 15), (3, 14), (9, 12)):
        r.kasten([-b / 2, 26.5, z], [b, 2, 6], "basalt")
        klinge(r, 0, 28.5, z + 3, 6, 4, neigung=-35, stoff="basalt")
    for x in (1, -1):
        # Seitliche Platten und gluehende Risse die Flanken entlang.
        for z in (-10, -3, 4):
            r.kasten([x * 9 - (0 if x > 0 else 2), 22, z], [2, 4, 6], "basalt",
                     drehung=[0, 0, -x * 20], drehpunkt=[x * 9, 24, z + 3])
        rand = x * 9.05
        for y, z, lang, w in ((16, -11, 8, 12), (19, -4, 7, -14), (15, 2, 9, 10), (18, 9, 6, -12)):
            r.kasten([rand, y, z], [0, 1, lang], "glutriss", drehung=[w, 0, 0], drehpunkt=[rand, y, z + lang / 2])
    hals, ende = glieder(m, "hals", "rumpf", (0, 23, -12), -1,
                         [(6, 11, 11, 1.5), (6, 11, 11, 1.0), (5, 11, 11, 0.5)], stoff="leib")
    klingen_reihe(m, hals, stoff="basalt", hoehe=(6, 5), neigung=-35)
    _, ky, kz = ende
    kopf_klotz(m, "lavadrache", hals[-1], ky, kz, schaedel=(15, 12, 12), schnauze=(12, 8, 11), hoerner="stacheln")
    kopf = m.finde("kopf")
    kopf.kasten([-7.5, ky + 6, kz - 11], [15, 2, 7], "basalt")                  # Stirnpanzer
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 20, 15), 1,
                            [(8, 11, 10, -0.6), (8, 10, 9, -0.5), (8, 9, 8, -0.3), (7, 8, 7, -0.2),
                             (7, 7, 6, 0.0), (6, 6, 5, 0.0), (6, 5, 5, 0.0)], stoff="leib")
    klingen_reihe(m, schwanz, stoff="basalt", hoehe=(6, 3), neigung=-35)
    _, sy, sz = ende
    keule = m.finde(schwanz[-1])
    # Die Keule: ein Basaltklotz mit Dornen, innen gluehend.
    keule.kasten([-4.5, sy - 3.5, sz - 2], [9, 7, 7], "basalt")
    keule.kasten([-3.5, sy - 2.5, sz + 4.5], [7, 5, 2], "basalt")
    keule.kasten([-4.6, sy - 1, sz - 1], [9.2, 1, 5], "glutriss")
    for x, w in ((1, -40), (-1, 40)):
        keule.kasten([x * 4.5 - 0.5, sy - 0.5, sz + 1], [1, 1, 5], "horn", drehung=[0, w, 0],
                     drehpunkt=[x * 4.5, sy, sz + 1.5])
    keule.kasten([-0.5, sy + 3.5, sz + 1], [1, 5, 1], "horn", drehung=[-20, 0, 0], drehpunkt=[0, sy + 3.5, sz + 1.5])
    for seite, x in (("links", 1), ("rechts", -1)):
        bein_klotz(m, f"bein_hinten_{seite}", "rumpf", (x * 8, 20, 11), (8, 10, 9), (7, 8, 7), (9, 3, 7),
                   zehen=4, zehlang=4)
        bein_klotz(m, f"bein_vorn_{seite}", "rumpf", (x * 8, 19, -8), (7, 9, 7), (6, 8, 6), (8, 3, 6),
                   zehen=4, zehlang=4)
    schwinge_bauen(m, LAVADRACHE_SCHWINGE, zusatz=fingerkrallen)
    becken_abtrennen(m, 8, 20)
    sattel_bauen(m, "rumpf", 28.5, -3, 16)
    uralt_zier(m)
    sattelzone(m)
    return m


LAVADRACHE_FARBEN = {
    # Schwarzer Basalt, darunter orange Glut.
    "basalt": {"leib": "#3a3230", "ruecken": "#1e1a1a", "bauch": "#e0601a", "fleck": "#2a2422",
               "haut": "#5a2a1e", "hautfleck": "#8a3a1e", "augen": "#ffc21a", "glut": "#ff7a1a",
               "horn": ("#1a1616", "#4a3e3a", "#9a8a80"), "kralle": "#0e0a0a", "zunge": "#e07a3a",
               "rachen": "#ff5a1a", "zacken": 1.6},
    # Magma: roetlicher Stein, gelbe Glut.
    "magma":  {"leib": "#5a2a1a", "ruecken": "#2a120c", "bauch": "#ffa01a", "fleck": "#3e1a10",
               "haut": "#7a2a14", "hautfleck": "#b04a1a", "augen": "#fff05a", "glut": "#ffc23a",
               "horn": ("#2a0e08", "#6a2e1a", "#c87a4a"), "kralle": "#120806", "zunge": "#f09a4a",
               "rachen": "#ff9a1a", "zacken": 1.6},
    # Selten: Seelenlava - blaue Glut unter grauem Stein.
    "seele":  {"leib": "#34343e", "ruecken": "#16161e", "bauch": "#3ac8ff", "fleck": "#24242e",
               "haut": "#2a3a4a", "hautfleck": "#3a6a8a", "augen": "#8af0ff", "glut": "#6ae8ff",
               "horn": ("#14141a", "#3e3e4a", "#9a9aaa"), "kralle": "#0a0a0e", "zunge": "#6ab8e8",
               "rachen": "#3ac8ff", "zacken": 1.6},
}


def lavadrache_maler(variante):
    f = LAVADRACHE_FARBEN.get(variante, LAVADRACHE_FARBEN["basalt"])
    heiss = [H.dunkler(f["bauch"], 0.35), f["bauch"], f["glut"], H.heller(f["glut"], 0.4)]

    def besonders(stoff, p, n, texel):
        x, y, z = p
        if stoff == "basalt":
            t = H.hoehe(p, n, texel) if abs(n[1]) < 0.5 else (1.0 if n[1] > 0 else 0.0)
            c = H.verlauf([H.dunkler(f["ruecken"], 0.2), f["ruecken"], f["horn"][1]], t, 3)
            k = H.kasten_von(texel)
            # Unten an jeder Platte glimmt die Glut durch die Fuge.
            if k is not None and abs(n[1]) < 0.5 and y - k.ursprung[1] < 0.8 and k.groesse[1] >= 2:
                return glut(f["glut"])
            return c
        if stoff == "glutriss":
            return glut(H.verlauf([f["glut"], H.heller(f["glut"], 0.5)], H.laenge(p, texel, 2), 3))
        if stoff in ("bauch", "brust"):
            # Die Glut unter einer dunklen Kruste: Querplatten mit gluehender Fuge.
            if int(math.floor(z if stoff == "bauch" else y)) % 3 == 0:
                return glut(H.heller(f["glut"], 0.2))
            return glut(H.verlauf(heiss, (math.sin(x * 0.7) + 1) / 2 * 0.6 + 0.2, 4))
        return False
    return klotz_maler("lavadrache", f, LAVADRACHE_SCHWINGE, besonders, saat=41)


# ================================================================== Dampfdrache

DAMPFDRACHE_SCHWINGE = Schwinge((7, 25, -7), oberarm=15, unterarm=19, finger=(54, 50, 42, 34),
                                winkel=(16, -12, -40, -68), hinterkante=(7, 16), dicke=(4, 3, 2),
                                biegung=10, bogen=5.0)


def dampfdrache_modell():
    """Schlank und hochbeinig: ein heller Leib mit Kupferplatten den Ruecken
    entlang, zwei Paar Dampfschlote hinter den Schultern, ein schmaler Kopf
    mit zwei Kupfersicheln, weite Schwingen und am Schwanz ein Ruder aus
    drei Kupferplatten."""
    m = Modell("dampfdrache", sichtbreite=11.0, sichthoehe=4.0)
    MAEULER.pop("dampfdrache", None)
    r = m.knoch("rumpf", [0, 20, 0])
    r.kasten([-7, 12, -12], [14, 13, 12], "leib")
    r.kasten([-6.5, 12.5, -1], [13, 12, 10], "leib")
    r.kasten([-6, 13, 8], [12, 10, 6], "leib")
    r.kasten([-5.5, 11.5, -11], [11, 1, 24], "bauch")
    r.kasten([-5.5, 11, -13], [11, 10, 2], "kupfer")                          # Brustplatte
    for z in (-11, -5, 1, 7):
        r.kasten([-4, 24.6, z], [8, 1, 5], "kupfer")
    # Die Dampfschlote: Rohre mit Rand, oben offen.
    for x in (3, -3):
        for z in (-8, -2):
            r.kasten([x - 1, 24, z], [2, 4, 2], "schlot")
            r.kasten([x - 1.5, 27.5, z - 0.5], [3, 1, 3], "schlot")
    for x in (1, -1):
        # Nieten-Reihe als Kupferleiste an den Flanken.
        r.kasten([x * 7.05 - (0 if x > 0 else 0), 20, -11], [0, 1, 20], "kupfer")
    hals, ende = glieder(m, "hals", "rumpf", (0, 22, -12), -1,
                         [(6, 8, 8, 2.0), (6, 7, 7, 1.5), (6, 7, 7, 1.5), (5, 6, 6, 1.0), (5, 6, 6, 0.5)],
                         stoff="leib")
    klingen_reihe(m, hals, stoff="kupfer", hoehe=(4, 3), neigung=-40)
    _, ky, kz = ende
    kopf_klotz(m, "dampfdrache", hals[-1], ky, kz, schaedel=(11, 9, 11), schnauze=(9, 6, 10), hoerner="sicheln")
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 19, 14), 1,
                            [(8, 8, 8, -0.4), (8, 7, 6, -0.3), (8, 6, 5, -0.2), (8, 5, 4, 0.0),
                             (8, 4, 4, 0.0), (8, 3, 3, 0.0), (8, 3, 3, 0.0), (7, 2, 2, 0.0)], stoff="leib")
    klingen_reihe(m, schwanz, stoff="kupfer", hoehe=(4, 2), neigung=-40)
    _, sy, sz = ende
    ruder = m.finde(schwanz[-1])
    for w in (-35, 0, 35):
        ruder.kasten([-0.5, sy - 0.5, sz - 2], [1, 6, 6], "kupfer", drehung=[-20, 0, w], drehpunkt=[0, sy, sz - 1])
    for seite, x in (("links", 1), ("rechts", -1)):
        bein_klotz(m, f"bein_hinten_{seite}", "rumpf", (x * 6, 20, 10), (6, 10, 7), (5, 9, 5), (6, 3, 5),
                   zehen=3, zehlang=5)
        bein_klotz(m, f"bein_vorn_{seite}", "rumpf", (x * 6, 19, -8), (5, 9, 6), (4, 9, 4), (5, 3, 4),
                   zehen=3, zehlang=4)
    schwinge_bauen(m, DAMPFDRACHE_SCHWINGE, zusatz=fingerkrallen)
    becken_abtrennen(m, 8, 20)
    sattel_bauen(m, "rumpf", 25.5, -3, 14)
    uralt_zier(m)
    sattelzone(m)
    return m


DAMPFDRACHE_FARBEN = {
    # Elfenbein und Kupfer, tuerkise Augen.
    "kupfer": {"leib": "#efe4cf", "ruecken": "#b89a78", "bauch": "#fbf4e6", "fleck": "#d8c2a0",
               "haut": "#e8d8c0", "hautfleck": "#c8a878", "augen": "#5affe8", "glut": "#ffb05a",
               "horn": ("#6a3a1a", "#c87a3a", "#f0c090"), "kralle": "#2a1a10", "zunge": "#d87a6a",
               "rachen": "#6a2a1a", "zacken": 1.4},
    # Rost: dunkler, das Kupfer angelaufen.
    "rost":   {"leib": "#b8a898", "ruecken": "#6a4a3a", "bauch": "#e8d8c4", "fleck": "#8a7060",
               "haut": "#d0b898", "hautfleck": "#a07050", "augen": "#ffd23a", "glut": "#ff9a3a",
               "horn": ("#4a2010", "#a0542a", "#d8905a"), "kralle": "#1e120a", "zunge": "#c86a5a",
               "rachen": "#5a2014", "zacken": 1.4},
    # Selten: Silber und Stahl.
    "silber": {"leib": "#e8eef4", "ruecken": "#9aa8b8", "bauch": "#fafcff", "fleck": "#c0cad6",
               "haut": "#dce4ee", "hautfleck": "#a8b8cc", "augen": "#6ac8ff", "glut": "#c8f0ff",
               "horn": ("#4a5260", "#9aa4b4", "#e8eef8"), "kralle": "#1a1e24", "zunge": "#c87a8a",
               "rachen": "#3a2a3a", "zacken": 1.4},
}


def dampfdrache_maler(variante):
    f = DAMPFDRACHE_FARBEN.get(variante, DAMPFDRACHE_FARBEN["kupfer"])

    def besonders(stoff, p, n, texel):
        x, y, z = p
        if stoff == "kupfer":
            # Metall: ein heller Glanzstreifen oben, dunkler zum Rand.
            t = H.hoehe(p, n, texel) if abs(n[1]) < 0.5 else 0.85
            c = H.verlauf(list(f["horn"]), t, 3)
            k = H.kasten_von(texel)
            if k is not None and n[1] > 0.5 and k.groesse[2] >= 4 and abs(z - (k.ursprung[2] + 1.5)) < 0.6:
                return H.heller(c, 0.25)
            return c
        if stoff == "schlot":
            k = H.kasten_von(texel)
            if n[1] > 0.5 and k is not None:
                # Oben offen: innen dunkel, ganz innen die Glut.
                mx, mz = k.ursprung[0] + k.groesse[0] / 2, k.ursprung[2] + k.groesse[2] / 2
                r_ = max(abs(x - mx), abs(z - mz))
                if r_ < 0.6:
                    return glut(f["glut"])
                if r_ < 1.1:
                    return H.farbe("#1a120e")
            return H.verlauf([H.dunkler(f["horn"][0], 0.2), f["horn"][1]], H.hoehe(p, n, texel), 3)
        return False
    return klotz_maler("dampfdrache", f, DAMPFDRACHE_SCHWINGE, besonders, saat=53)


# ================================================================== Sternendrache

STERNENDRACHE_SCHWINGE = Schwinge((7, 24, -7), oberarm=14, unterarm=18, finger=(46, 42, 34, 26),
                                  winkel=(8, -20, -48, -78), hinterkante=(7, 15), dicke=(4, 3, 3))


def sternkristall(k, x, y, z, hoch, neigung=-25, seite=0.0):
    """Ein leuchtender Kristall: schlank, unten breiter, oben spitz."""
    k.kasten([x - 1, y - 0.5, z - 1], [2, max(1, round(hoch * 0.6)), 2], "sternzacke",
             drehung=[neigung, 0, seite], drehpunkt=[x, y, z])
    k.kasten([x - 0.5, y - 0.5 + round(hoch * 0.6) - 0.5, z - 0.5], [1, max(1, round(hoch * 0.5)), 1], "sternzacke",
             drehung=[neigung, 0, seite], drehpunkt=[x, y, z])


def sternendrache_modell():
    """Himmelsdrache und Nachtschwinge in einem: der schlanke Leib und die
    vier Sichelschwingen der Nachtschwinge, der lange Hals, die Maehne und
    der lange, fliessende Schwanz des Himmelsdrachen. Statt Klingen
    leuchtende Kristalle den Ruecken entlang, auf der Stirn ein Stern."""
    m = Modell("sternendrache", sichtbreite=11.0, sichthoehe=4.0)
    MAEULER.pop("sternendrache", None)
    r = m.knoch("rumpf", [0, 19, 0])
    r.kasten([-6, 11, -11], [12, 12, 11], "leib")
    r.kasten([-5, 11.5, -1], [10, 10, 9], "leib")
    r.kasten([-5, 12, 7], [10, 9, 7], "leib")
    r.kasten([-4.5, 10.5, -10], [9, 1, 23], "bauch")
    for z, h in ((-9, 6), (-5, 7), (-1, 7), (3, 6), (7, 5), (11, 4)):
        sternkristall(r, 0, 23 if z < 6 else 21, z, h)
    hals, ende = glieder(m, "hals", "rumpf", (0, 21, -11), -1,
                         [(6, 8, 8, 2.0), (6, 7, 7, 1.5), (6, 7, 7, 1.5), (5, 6, 6, 1.0), (5, 6, 6, 1.0),
                          (5, 6, 6, 0.5)], stoff="leib")
    for n_ in hals:
        # Die Maehne: eine hohe, schmale Flosse auf jedem Halsglied.
        g = m.finde(n_)
        c = g.kaesten[0]
        g.kasten([-0.5, c.ursprung[1] + c.groesse[1] - 0.5, c.ursprung[2]], [1, 5, c.groesse[2]], "maehne",
                 drehung=[-12, 0, 0], drehpunkt=[0, c.ursprung[1] + c.groesse[1], c.ursprung[2] + c.groesse[2]])
    _, ky, kz = ende
    kopf_klotz(m, "sternendrache", hals[-1], ky, kz, schaedel=(10, 8, 10), schnauze=(8, 5, 9), hoerner="sicheln")
    m.finde("kopf").kasten([-1, ky + 5, kz - 12], [2, 2, 2], "stern")           # der Stern auf der Stirn
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 18, 14), 1,
                            [(8, 8, 8, -0.4), (8, 7, 6, -0.3), (8, 6, 5, -0.2), (8, 5, 5, 0.0), (8, 5, 4, 0.0),
                             (8, 4, 4, 0.0), (8, 4, 3, 0.0), (8, 3, 3, 0.0), (8, 3, 3, 0.0), (7, 2, 2, 0.0),
                             (7, 2, 2, 0.0), (6, 2, 2, 0.0)], stoff="leib")
    for i, n_ in enumerate(schwanz):
        if i % 2 == 0:
            g = m.finde(n_)
            c = g.kaesten[0]
            sternkristall(g, 0, c.ursprung[1] + c.groesse[1], c.ursprung[2] + c.groesse[2] / 2,
                          max(2, 5 - i // 2), neigung=-35)
    _, sy, sz = ende
    # Am Schwanzende eine Flosse wie ein Kometenschweif.
    ende_k = m.finde(schwanz[-1])
    for w in (-25, 0, 25):
        # Jede Flosse laeuft spitz aus: drei Stufen, nach hinten schmaler.
        for j, (h, lang) in enumerate(((5, 4), (3, 4), (1, 4))):
            ende_k.kasten([-0.5, sy - 0.5, sz - 3 + j * 4], [1, h, lang], "maehne", drehung=[0, 0, w],
                          drehpunkt=[0, sy, sz - 2])
    for seite, x in (("links", 1), ("rechts", -1)):
        bein_klotz(m, f"bein_hinten_{seite}", "rumpf", (x * 5.5, 19, 9), (6, 9, 7), (4, 7, 4), (6, 3, 5),
                   zehen=3, zehlang=4)
        bein_klotz(m, f"bein_vorn_{seite}", "rumpf", (x * 5.5, 18, -8), (5, 8, 5), (4, 7, 4), (5, 3, 4),
                   zehen=3, zehlang=3)
    sichelschwinge_bauen(m, STERNENDRACHE_SCHWINGE)
    sichelschwinge_bauen(m, NACHTSCHWINGE_HINTEN, vor="h")
    becken_abtrennen(m, 7, 17)
    sattel_bauen(m, "rumpf", 23, -3, 12)
    uralt_zier(m)
    sattelzone(m)
    return m


STERNENDRACHE_FARBEN = {
    # Nachtblau mit violetten Nebeln, Kristalle wie Sterne.
    "nacht":  {"leib": "#2a2a5a", "ruecken": "#14143a", "bauch": "#6a4aa8", "fleck": "#4a2a7a",
               "haut": "#3a3a7a", "augen": "#fff4a0", "glut": "#c8b0ff",
               "horn": ("#1a1a3a", "#6a6ab8", "#e8e0ff"), "kralle": "#0a0a1a", "zunge": "#8a5ab8",
               "rachen": "#1a0a3a", "maehne": ("#6a4ad8", "#e0d0ff")},
    # Morgenroete: violett und rosa.
    "morgen": {"leib": "#3a2a5a", "ruecken": "#1a1030", "bauch": "#e87aa8", "fleck": "#6a3a7a",
               "haut": "#5a3a6a", "augen": "#ffe0a0", "glut": "#ffd0a0",
               "horn": ("#2a1a2a", "#8a5a8a", "#ffe0e8"), "kralle": "#120a14", "zunge": "#d87a9a",
               "rachen": "#2a0a1a", "maehne": ("#e85a8a", "#ffe0c0")},
    # Selten: Polarlicht - gruen und tuerkis.
    "polar":  {"leib": "#1a3a4a", "ruecken": "#0a1a2a", "bauch": "#3ae8a8", "fleck": "#1a5a5a",
               "haut": "#1a4a5a", "augen": "#c0ffe0", "glut": "#a0ffe0",
               "horn": ("#0a1a2a", "#3a7a8a", "#d0fff0"), "kralle": "#06101a", "zunge": "#5ab8a8",
               "rachen": "#0a1a2a", "maehne": ("#3ad8a8", "#d0fff8")},
}


def sternendrache_maler(variante):
    f = STERNENDRACHE_FARBEN.get(variante, STERNENDRACHE_FARBEN["nacht"])

    def besonders(stoff, p, n, texel):
        if stoff == "sternzacke":
            t = H.hoehe(p, n, texel) if abs(n[1]) < 0.5 else 1.0
            return glut(H.verlauf([f["maehne"][0], f["glut"], "#ffffff"], t, 3))
        if stoff == "maehne":
            t = H.hoehe(p, n, texel) if abs(n[1]) < 0.5 else 1.0
            return glut(H.verlauf([f["maehne"][0], f["maehne"][1]], t, 3), -0.1)
        if stoff == "stern":
            return glut("#ffffff") if n[2] < -0.5 or n[1] > 0.5 else glut(f["glut"])
        if stoff == "sichel":
            # Die Sichelblaetter wie bei der Nachtschwinge, aber mit
            # leuchtendem Rand - wie der Schweif eines Kometen.
            t, tief = H.laenge(p, texel, 0), H.laenge(p, texel, 2)
            k = H.kasten_von(texel)
            if k is not None and k.ursprung[0] < 0:
                t = 1 - t
            grenze = 1.0 - t * 0.85
            if tief > grenze:
                return None
            if grenze - tief < 0.18:
                return glut(f["glut"])
            c = H.farbe(f["haut"])
            if wolken(p, 5.0, 7) > 0.55:
                c = mische(c, H.farbe(f["fleck"]), 0.7)
            return c
        return False
    return klotz_maler("sternendrache", f, None, besonders, saat=61)
