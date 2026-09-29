#!/usr/bin/env python3
"""Die Drachen (ab 4.89) - Gestalt und Haut.

Fynn: "Die brauchen mehr Animation, mehr 3D, kleinere Objekte, die dazu
passen ... bessere Formen, Gelenke. Richtiger Feueratem ... verschiedene
Drachenarten, die auch unterschiedlich aussehen, nicht nur
unterschiedliche Farben."

Deshalb gibt es hier Bausteine, aus denen jede Art ihren eigenen Koerper
zusammensetzt: ein Hals aus Gliedern, ein Schwanz aus Gliedern, Beine mit
Oberschenkel, Unterschenkel und Fuss - und Schwingen wie bei einer
Fledermaus: Oberarm, Unterarm, Hand und drei Finger, dazwischen die
Flughaut. So falten sie sich am Boden zusammen und spreizen sich im Flug.

Gebaut wird immer die linke Seite (x > 0); die rechte entsteht gespiegelt.
Die Flughaut ist zwischen den Fingern als Dreieck aufgespannt, die
Hinterkante in Boegen ausgeschnitten. Die Farbe kommt aus haut.py:
zusammenhaengende Verlaeufe, keine Punkte.
"""

import math

from tiermodell import Modell, hexfarbe, mische
import haut as H


def glut(farbe, hell=0.0):
    """Eine leuchtende Farbe: Alpha 254 (Material entity_emissive_alpha),
    wie in fantasy_gestalt - hier nachgebaut, damit die Drachen sich ohne
    Umweg laden lassen."""
    f = hexfarbe(farbe) if isinstance(farbe, str) else tuple(farbe[:3])
    f = tuple(max(0, min(255, int(c * (1 + hell)))) for c in f)
    return f + (254,)


# ================================================================== Bausteine

def spiegel_knochen(m, name, neu, links_nach_rechts):
    """Baut zum Knochen name (und allen seinen Kindern) die Spiegelung an
    x = 0. Namen werden mit links_nach_rechts umbenannt."""
    quelle = {k.name: k for k in m.knochen}
    reihe = [name]
    i = 0
    while i < len(reihe):
        reihe += [k.name for k in m.knochen if k.eltern == reihe[i]]
        i += 1
    for n in reihe:
        k = quelle[n]
        d = k.drehung
        eltern = links_nach_rechts(k.eltern) if k.eltern in reihe else k.eltern
        g = m.knoch(links_nach_rechts(n), [-k.drehpunkt[0], k.drehpunkt[1], k.drehpunkt[2]], eltern,
                    drehung=[d[0], -d[1], -d[2]] if d else None)
        for c in k.kaesten:
            weiter = {"aufblasen": c.aufblasen}
            if c.drehung:
                weiter["drehung"] = [c.drehung[0], -c.drehung[1], -c.drehung[2]]
                if c.drehpunkt:
                    weiter["drehpunkt"] = [-c.drehpunkt[0], c.drehpunkt[1], c.drehpunkt[2]]
            g.kasten([-c.ursprung[0] - c.groesse[0], c.ursprung[1], c.ursprung[2]], c.groesse, c.stoff, **weiter)


def rechts(name):
    return name.replace("_links", "_rechts") if name else name


# Die Schwinge, in Flughaltung gebaut: waagrecht ausgebreitet. Alle Masse
# gehen von der Schulter aus, damit jede Drachenart ihre eigene Groesse hat.
class Schwinge:
    def __init__(self, schulter, oberarm=12, unterarm=16, finger=(26, 22, 16), winkel=(10, -30, -70),
                 hinterkante=None):
        self.schulter = schulter
        self.oberarm = oberarm
        self.unterarm = unterarm
        self.finger = finger
        self.winkel = winkel          # Grad um y; positiv = nach vorn (links)
        sx, sy, sz = schulter
        self.ellbogen = (sx + oberarm, sy, sz)
        self.handgelenk = (sx + oberarm + unterarm, sy, sz)
        # Wo die Haut hinten am Leib ansetzt.
        self.hinterkante = hinterkante or (sx, sz + 17)

    def spitze(self, i):
        """Die Spitze des i-ten Fingers in Ruhelage (x, z)."""
        w = math.radians(self.winkel[i])
        hx, _, hz = self.handgelenk
        return (hx + self.finger[i] * math.cos(w), hz - self.finger[i] * math.sin(w))


def bogenkante(px, pz, a, b, tiefe):
    """Wie weit liegt (px, pz) diesseits der Kante a->b, abzueglich eines
    Bogens der Tiefe tiefe in der Mitte der Kante? > 0 heisst: innen."""
    ax, az = a
    bx, bz = b
    lx, lz = bx - ax, bz - az
    laenge = math.hypot(lx, lz) or 1.0
    t = ((px - ax) * lx + (pz - az) * lz) / (laenge * laenge)
    abstand = ((px - ax) * lz - (pz - az) * lx) / laenge
    return abstand - tiefe * math.sin(math.pi * max(0.0, min(1.0, t)))


def innen(punkt, ecken):
    """Liegt der Punkt im (konvexen) Vieleck? Egal, in welcher Richtung die
    Ecken umlaufen: Innen liegt er, wenn er zu allen Kanten auf derselben
    Seite liegt."""
    px, pz = punkt
    zeichen = 0
    for i in range(len(ecken)):
        ax, az = ecken[i]
        bx, bz = ecken[(i + 1) % len(ecken)]
        k = (bx - ax) * (pz - az) - (bz - az) * (px - ax)
        if abs(k) < 1e-6:
            continue
        if zeichen == 0:
            zeichen = 1 if k > 0 else -1
        elif (k > 0) != (zeichen > 0):
            return False
    return True


def schwinge_bauen(m, s, eltern="rumpf"):
    """Die linke Schwinge; die rechte entsteht durch spiegel_knochen."""
    sx, sy, sz = s.schulter
    ex, _, _ = s.ellbogen
    hx, _, hz = s.handgelenk
    arm = m.knoch("fluegel_links", [sx, sy, sz], eltern)
    arm.kasten([sx, sy - 1.5, sz - 1.5], [s.oberarm, 3, 3], "knochen")
    arm.kasten([sx, sy, sz + 0.5], [s.oberarm, 0, s.hinterkante[1] - sz + 2], "flughaut_arm")
    unter = m.knoch("unterarm_links", [ex, sy, sz], "fluegel_links")
    unter.kasten([ex, sy - 1, sz - 1], [s.unterarm, 2, 2], "knochen")
    breite = int(math.ceil(max(s.spitze(2)[0], hx) - ex)) + 1
    unter.kasten([ex, sy, sz + 0.5], [breite, 0, s.hinterkante[1] - sz + 2], "flughaut_unterarm")
    hand = m.knoch("hand_links", [hx, sy, sz], "unterarm_links")
    hand.kasten([hx - 1, sy - 1.5, sz - 1.5], [3, 3, 3], "knochen")
    hand.kasten([hx, sy - 0.5, sz - 3.5], [1, 1, 2], "kralle")          # der Daumen mit Kralle
    for i in range(3):
        f = m.knoch(f"finger{i + 1}_links", [hx, sy, sz], "hand_links", drehung=[0, s.winkel[i], 0])
        f.kasten([hx, sy - 0.5, sz - 0.5], [s.finger[i], 1, 1], "fingerknochen")
        if i < 2:
            # Die Haut bis zum naechsten Finger - als Dreieck im Rechteck.
            zwischen = math.radians(s.winkel[i] - s.winkel[i + 1])
            tief = int(math.ceil(s.finger[i] * math.sin(zwischen))) + 1
            f.kasten([hx, sy, sz], [s.finger[i], 0, tief], f"flughaut_f{i + 1}")
    spiegel_knochen(m, "fluegel_links", None, rechts)


def schwinge_maler(s, haut, knochen, aderfarbe=None):
    """Die Farbe der Flughaut: vorn am Knochen dunkler, zur Hinterkante hin
    heller; feine Adern laufen parallel zum Finger. Ausserhalb des
    Dreiecks zwischen zwei Fingern: nichts (durchsichtig)."""
    hx, _, hz = s.handgelenk
    ader = aderfarbe or H.dunkler(haut, 0.2)

    def male(stoff, p, n, texel):
        x, y, z = abs(p[0]), p[1], p[2]
        if stoff in ("flughaut_f1", "flughaut_f2"):
            i = 0 if stoff == "flughaut_f1" else 1
            # Ortsraum des Fingers: er zeigt nach +x, die Haut liegt hinter ihm.
            lx, lz = x - hx, z - hz
            zwischen = math.radians(s.winkel[i] - s.winkel[i + 1])
            spitze_a = (s.finger[i], 0.0)
            spitze_b = (s.finger[i + 1] * math.cos(zwischen), s.finger[i + 1] * math.sin(zwischen))
            if not innen((lx, lz), [(0.0, 0.0), spitze_a, spitze_b]):
                return None
            if bogenkante(lx, lz, spitze_b, spitze_a, 3.0) < 0:
                return None
            if int(round(lz)) % 5 == 0 and lz > 1:
                return ader
            return H.verlauf([H.dunkler(haut, 0.12), haut, H.heller(haut, 0.12)], lz / 14.0, 4)
        # Arm und Unterarm: vom Knochen bis zur Linie Fingerspitze - Leib.
        spitze3 = s.spitze(2)
        hinten = s.hinterkante
        ecken = [(s.schulter[0], s.schulter[2]), (hx, hz), spitze3, hinten]
        if not innen((x, z), ecken):
            return None
        if bogenkante(x, z, hinten, spitze3, 3.5) < 0:
            return None
        if int(round(z - hz)) % 5 == 0 and z - hz > 1:
            return ader
        return H.verlauf([H.dunkler(haut, 0.12), haut, H.heller(haut, 0.12)], (z - hz) / 16.0, 4)
    return male


def glieder(m, name, eltern, start, richtung, teile, stoff="leib", zacken=None):
    """Eine Kette von Gliedern (Hals oder Schwanz). teile: Liste von
    (Laenge, Breite, Hoehe, Anstieg). richtung -1 = nach vorn (Hals),
    +1 = nach hinten (Schwanz). Jedes Glied haengt am vorigen; sein
    Drehpunkt ist das Gelenk zum vorigen. zacken: Stoff fuer einen
    Rueckenstachel auf jedem Glied."""
    x0, y, z = start
    namen = []
    for i, (lang, breit, hoch, steig) in enumerate(teile):
        n = f"{name}{i + 1}"
        g = m.knoch(n, [0, y, z], eltern)
        z_anfang = z if richtung > 0 else z - lang
        # Ein Pixel Ueberlappung zum vorigen Glied: So klafft beim Biegen nichts.
        g.kasten([-breit / 2, y - hoch / 2, z_anfang - (1 if (richtung > 0 and i) else 0)],
                 [breit, hoch, lang + (1 if i else 0)], stoff)
        if zacken:
            zh = max(1, round(hoch * 0.35))
            g.kasten([-0.5, y + hoch / 2, z_anfang + lang / 2 - 1], [1, zh, 2], zacken)
            g.kasten([-0.5, y + hoch / 2 + zh, z_anfang + lang / 2 - (0.5 if richtung > 0 else 0.5)],
                     [1, 1, 1], zacken)
        eltern = n
        namen.append(n)
        z = z + richtung * lang
        y = y + steig
    return namen, (0, y, z)


def bein_bauen(m, name, eltern, huefte, oben, unten, fuss, krallen=3, vorn=-1):
    """Ein Bein mit drei Gelenken: Huefte, Knie, Knoechel. oben/unten:
    (Breite, Laenge, Tiefe) von Ober- und Unterschenkel; fuss: (Breite,
    Hoehe, Laenge). Die Krallen zeigen nach vorn (vorn = -1)."""
    hx, hy, hz = huefte
    ob = m.knoch(name, [hx, hy, hz], eltern)
    ob.kasten([hx - oben[0] / 2, hy - oben[1], hz - oben[2] / 2], [oben[0], oben[1] + 1, oben[2]], "bein")
    ky = hy - oben[1]
    un = m.knoch(name.replace("bein", "unterbein"), [hx, ky, hz], name)
    un.kasten([hx - unten[0] / 2, ky - unten[1], hz - unten[2] / 2], [unten[0], unten[1] + 1, unten[2]], "bein",
              aufblasen=-0.1)
    fy = ky - unten[1]
    fu = m.knoch(name.replace("bein", "fuss"), [hx, fy, hz], name.replace("bein", "unterbein"))
    fu.kasten([hx - fuss[0] / 2, fy - fuss[1], hz - fuss[2] + 1.5], [fuss[0], fuss[1], fuss[2]], "fuss")
    for j in range(krallen):
        kx = hx - fuss[0] / 2 + 0.5 + j * (fuss[0] - 2) / max(1, krallen - 1) - 0.5
        fu.kasten([kx, fy - fuss[1], hz - fuss[2] + 0.5], [1, 1, 1], "kralle")
    return fy - fuss[1]


# ================================================================== Lindwurm (4.89)

# Wo das Maul sitzt (Knochen, Punkt an der Schnauzenspitze, zwischen den
# Kiefern) - daraus zeichnet die Pixelschmiede den Atem.
MAEULER = {}

LINDWURM_SCHWINGE = Schwinge((7, 27, -7), oberarm=13, unterarm=18, finger=(32, 28, 22), winkel=(12, -24, -58),
                             hinterkante=(7, 13))


def lindwurm_modell():
    """Der Feuerdrache: vier Beine, zwei grosse Schwingen, langer Hals mit
    Hoernern, langer Schwanz mit Pfeilspitze. Der Leib wird zur Huefte hin
    schmaler; ueber den Ruecken laeuft eine Reihe Stacheln."""
    m = Modell("lindwurm", sichtbreite=7.0, sichthoehe=3.0)
    r = m.knoch("rumpf", [0, 20, 0])
    r.kasten([-7, 14, -13], [14, 13, 12], "leib")                    # Brust
    r.kasten([-6.5, 14.5, -2], [13, 12, 10], "leib")                 # Bauch
    r.kasten([-6, 15, 7], [12, 11, 7], "leib")                       # Huefte
    r.kasten([-5, 13.5, -12], [10, 1, 25], "bauch")                  # Bauchschilde
    for z, h in ((-11, 3), (-7, 4), (-3, 4), (1, 4), (5, 3), (9, 3)):
        top = 27 if z < -1 else (26.5 if z < 7 else 26)
        r.kasten([-0.5, top, z], [1, h - 1, 2], "stachel")
        r.kasten([-0.5, top + h - 1, z + 0.5], [1, 1, 1], "stachel")
    # Hals: vier Glieder, nach vorn schmaler und hoeher.
    hals, ende = glieder(m, "hals", "rumpf", (0, 23, -12),
                         -1, [(6, 9, 9, 1.0), (6, 8, 8, 1.0), (6, 7, 7, 1.0), (5, 6, 6, 0.5)],
                         stoff="leib", zacken="stachel")
    _, ky, kz = ende
    MAEULER["lindwurm"] = ("kopf", [0, ky - 2, kz - 16])
    kopf = m.knoch("kopf", [0, ky, kz], hals[-1])
    kopf.kasten([-4.5, ky - 2, kz - 10], [9, 6, 10], "kopf")         # Schaedel
    kopf.kasten([-3.5, ky - 2, kz - 16], [7, 4, 6], "schnauze")      # unten: der gluehende Gaumen
    kopf.kasten([-5, ky + 3.5, kz - 9], [10, 1, 4], "braue")
    for x in (-3.5, 2.5):
        kopf.kasten([x, ky - 2.5, kz - 15.5], [1, 1, 5], "zaehne")    # Oberkiefer-Zaehne, im Kiefer versteckt
    # Wangenstacheln nach hinten.
    kopf.kasten([4.5, ky - 1, kz - 5], [1, 1, 4], "horn", drehung=[0, -25, 0], drehpunkt=[4.5, ky, kz - 5])
    kopf.kasten([-5.5, ky - 1, kz - 5], [1, 1, 4], "horn", drehung=[0, 25, 0], drehpunkt=[-4.5, ky, kz - 5])
    for seite, x in (("links", 3), ("rechts", -3)):
        h1 = m.knoch(f"horn_{seite}", [x, ky + 4, kz - 5], "kopf", drehung=[25, 0, 0])
        h1.kasten([x - 1, ky + 3.5, kz - 5], [2, 2, 6], "horn")
        h2 = m.knoch(f"hornspitze_{seite}", [x, ky + 4.5, kz + 1], f"horn_{seite}", drehung=[-30, 0, 0])
        h2.kasten([x - 0.5, ky + 4, kz + 1], [1, 1, 4], "horn")
    # Der Unterkiefer schliesst genau unter Schnauze und Schaedel: Zu ist
    # das Maul eine Linie, offen sieht man Zaehne und den gluehenden Rachen.
    kiefer = m.knoch("kiefer", [0, ky - 2, kz - 7], "kopf")
    kiefer.kasten([-3.5, ky - 4, kz - 16], [7, 2, 10], "kiefer")     # oben: die gluehende Zunge
    for x in (-3.5, 2.5):
        kiefer.kasten([x, ky - 2.5, kz - 15.5], [1, 1, 5], "zaehne")
    # Schwanz: sechs Glieder, am Ende die Pfeilspitze.
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 20.5, 13),
                            1, [(8, 10, 9, -0.5), (8, 8, 7, -0.5), (8, 7, 6, -0.3), (8, 5, 5, 0.0),
                                (8, 4, 4, 0.0), (8, 3, 3, 0.0)],
                            stoff="leib", zacken="stachel")
    _, sy, sz = ende
    m.finde(schwanz[-1]).kasten([-4, sy - 0.5, sz - 1], [8, 1, 7], "spitze")
    # Vier Beine: hinten kraeftige Schenkel, vorn kuerzere Arme mit Klauen.
    for seite, x in (("links", 6), ("rechts", -6)):
        # Kraeftige Keulen: der Oberschenkel breit und tief, der Unterschenkel schmaler.
        bein_bauen(m, f"bein_hinten_{seite}", "rumpf", (x * 1.1, 20, 10), (7, 9, 9), (5, 8, 5), (6, 3, 8), krallen=3)
        bein_bauen(m, f"bein_vorn_{seite}", "rumpf", (x, 19, -8), (6, 8, 6), (4, 8, 4), (5, 3, 6))
    schwinge_bauen(m, LINDWURM_SCHWINGE)
    return m


LINDWURM_FARBEN = {
    # Leib, Ruecken, Bauch, Flughaut, Augen, Glut
    "gruen":   ("#3e6a30", "#1e3a1a", "#d0c080", "#6a5230", "#ffa21a", "#ff7a1a"),
    "rot":     ("#8a2a22", "#4a1210", "#e0b858", "#7a2e20", "#ffd21a", "#ffb030"),
    "schwarz": ("#2e2e36", "#121216", "#7a6a8a", "#34303e", "#c07aff", "#b86aff"),
}


def lindwurm_maler(variante):
    leib, ruecken, bauch, haut, augen, gluht = LINDWURM_FARBEN.get(variante, LINDWURM_FARBEN["gruen"])
    fluegel = schwinge_maler(LINDWURM_SCHWINGE, haut, ruecken)

    def koerper(p, n, texel):
        return H.koerper(p, n, texel, bauch, leib, ruecken, grenze=0.28, stufen=4, schilde=2,
                         aalstrich=H.dunkler(ruecken, 0.15), strichbreite=1.0)

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff.startswith("flughaut"):
            return fluegel(stoff, p, n, texel)
        if stoff == "leib":
            return koerper(p, n, texel)
        if stoff == "bauch":
            return H.koerper(p, n, texel, bauch, leib, ruecken, grenze=1.1, schilde=2)
        if stoff in ("kopf", "schnauze"):
            k = H.kasten_von(texel)
            if stoff == "kopf" and abs(n[0]) > 0.5 and k is not None:
                # Das Auge: ein gluehender Schlitz unter der Braue, vorn im Schaedel.
                oy = k.ursprung[1] + k.groesse[1] - 2.5
                oz = k.ursprung[2] + 2.5
                if abs(y - oy) < 0.6 and abs(z - oz) < 1.1:
                    return hexfarbe("#140a04") if abs(z - oz) < 0.4 else glut(augen)
            if stoff == "schnauze" and n[2] < -0.5 and H.hoehe(p, n, texel) > 0.7 and 1.5 < abs(x) < 2.5:
                return hexfarbe("#140c08")                                    # Nuestern
            if stoff == "schnauze" and n[1] < -0.5:
                return glut(H.dunkler(gluht, 0.35))                           # der Gaumen
            return H.koerper(p, n, texel, bauch, leib, ruecken, grenze=0.25, stufen=3)
        if stoff == "braue":
            return H.farbe(ruecken)
        if stoff in ("horn", "stachel"):
            # Vom Ansatz zur Spitze heller, wie echtes Horn.
            t = H.laenge(p, texel, 2) if stoff == "horn" else H.hoehe(p, n, texel)
            if stoff == "stachel":
                return H.verlauf([ruecken, H.mische(H.farbe(ruecken), (216, 204, 176), 0.5)], t, 3)
            return H.verlauf(["#6a5a44", "#b8a888", "#e8e0cc"], t, 3)
        if stoff in ("kralle", "zaehne"):
            return hexfarbe("#ece4d0") if stoff == "zaehne" else hexfarbe("#2a2218")
        if stoff in ("rachen", "zunge"):
            return glut(H.verlauf([H.dunkler(gluht, 0.4), gluht], 0.5 if stoff == "zunge" else 1.0, 2))
        if stoff == "kiefer":
            if n[1] > 0.5:
                return glut(H.verlauf([H.dunkler(gluht, 0.5), gluht], 1 - H.laenge(p, texel, 2), 3))  # Zunge und Rachen
            return H.koerper(p, n, texel, bauch, leib, ruecken, grenze=0.6, stufen=3)
        if stoff == "spitze":
            # Die Pfeilspitze: vorn breit, hinten spitz.
            k = H.kasten_von(texel)
            t = H.laenge(p, texel, 2)
            if abs(x) > 4 * (1 - t) + 0.3:
                return None
            return H.verlauf([ruecken, leib], 1 - t, 3)
        if stoff in ("knochen", "fingerknochen"):
            return H.verlauf([H.dunkler(ruecken, 0.1), H.mische(H.farbe(ruecken), H.farbe(leib), 0.5)],
                             H.hoehe(p, n, texel), 2)
        if stoff in ("bein", "fuss"):
            return H.koerper(p, n, texel, bauch, leib, ruecken, grenze=0.1, stufen=3)
        return koerper(p, n, texel)
    return male
