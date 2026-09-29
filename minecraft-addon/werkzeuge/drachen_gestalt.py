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
    """finger/winkel: je Finger Laenge und Richtung (Grad um y, positiv =
    nach vorn). Der erste Finger bildet die Vorderkante, zwischen je zwei
    Fingern spannt sich Haut, und vom letzten Finger laeuft die Hinterkante
    zurueck zum Leib. dicke: Staerke von Oberarm, Unterarm und Fingern -
    Fynns Vorbilder (Ice and Fire) haben kraeftige Fluegelknochen."""
    def __init__(self, schulter, oberarm=12, unterarm=16, finger=(26, 22, 16), winkel=(10, -30, -70),
                 hinterkante=None, dicke=(3, 2, 1)):
        self.schulter = schulter
        self.oberarm = oberarm
        self.unterarm = unterarm
        self.finger = tuple(finger)
        self.winkel = tuple(winkel)
        self.dicke = dicke
        sx, sy, sz = schulter
        self.ellbogen = (sx + oberarm, sy, sz)
        self.handgelenk = (sx + oberarm + unterarm, sy, sz)
        # Wo die Haut hinten am Leib ansetzt.
        self.hinterkante = hinterkante or (sx, sz + 17)

    @property
    def anzahl(self):
        return len(self.finger)

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
    d0, d1, d2 = s.dicke
    arm = m.knoch("fluegel_links", [sx, sy, sz], eltern)
    arm.kasten([sx, sy - d0 / 2, sz - d0 / 2], [s.oberarm, d0, d0], "knochen")
    # Die Haut an Ober- und Unterarm haengt an eigenen Knochen: Beim Falten
    # zieht sie sich zum Knochen hin zusammen, statt als Segel hochzustehen.
    m.knoch("armhaut_links", [sx, sy, sz], "fluegel_links").kasten(
        [sx, sy, sz + 0.5], [s.oberarm, 0, s.hinterkante[1] - sz + 2], "flughaut_arm")
    unter = m.knoch("unterarm_links", [ex, sy, sz], "fluegel_links")
    unter.kasten([ex, sy - d1 / 2, sz - d1 / 2], [s.unterarm, d1, d1], "knochen")
    letzte = s.spitze(s.anzahl - 1)
    breite = int(math.ceil(max(letzte[0], hx) - ex)) + 1
    m.knoch("unterarmhaut_links", [ex, sy, sz], "unterarm_links").kasten(
        [ex, sy, sz + 0.5], [breite, 0, s.hinterkante[1] - sz + 2], "flughaut_unterarm")
    hand = m.knoch("hand_links", [hx, sy, sz], "unterarm_links")
    hand.kasten([hx - 1.5, sy - 1.5, sz - 1.5], [3, 3, 3], "knochen")
    # Der Daumen: eine kurze Klaue vorn am Handgelenk.
    hand.kasten([hx - 0.5, sy - 0.5, sz - 4], [1, 1, 3], "knochen")
    hand.kasten([hx - 0.5, sy - 1.5, sz - 5], [1, 2, 1], "kralle")
    for i in range(s.anzahl):
        f = m.knoch(f"finger{i + 1}_links", [hx, sy, sz], "hand_links", drehung=[0, s.winkel[i], 0])
        st = d2 + (1 if i == 0 else 0)
        f.kasten([hx, sy - st / 2, sz - st / 2], [s.finger[i], st, st], "fingerknochen")
        if i < s.anzahl - 1:
            # Die Haut bis zum naechsten Finger - als Dreieck im Rechteck.
            zwischen = math.radians(s.winkel[i] - s.winkel[i + 1])
            tief = int(math.ceil(s.finger[i] * math.sin(zwischen))) + 1
            m.knoch(f"fingerhaut{i + 1}_links", [hx, sy, sz], f"finger{i + 1}_links").kasten(
                [hx, sy, sz], [s.finger[i], 0, tief], f"flughaut_f{i + 1}")
    spiegel_knochen(m, "fluegel_links", None, rechts)


def schwinge_maler(s, haut, knochen, aderfarbe=None):
    """Die Farbe der Flughaut: vorn am Knochen dunkler, zur Hinterkante hin
    heller; feine Adern laufen parallel zum Finger. Ausserhalb des
    Dreiecks zwischen zwei Fingern: nichts (durchsichtig). Die Hinterkante
    ist zwischen den Fingerspitzen in Boegen ausgeschnitten."""
    hx, _, hz = s.handgelenk
    ader = aderfarbe or H.dunkler(haut, 0.2)

    def male(stoff, p, n, texel):
        x, y, z = abs(p[0]), p[1], p[2]
        if stoff.startswith("flughaut_f"):
            i = int(stoff[len("flughaut_f"):]) - 1
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
        # Arm und Unterarm: vom Knochen bis zur Linie letzte Fingerspitze - Leib.
        letzte = s.spitze(s.anzahl - 1)
        hinten = s.hinterkante
        ecken = [(s.schulter[0], s.schulter[2]), (hx, hz), letzte, hinten]
        if not innen((x, z), ecken):
            return None
        if bogenkante(x, z, hinten, letzte, 3.5) < 0:
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
            # Ein hoher Stachel, unten breit, oben schmal und nach hinten
            # geneigt - wie die Rueckenkaemme auf Fynns Vorbildern.
            zh = max(2, round(hoch * 0.5))
            mitte = z_anfang + lang / 2
            g.kasten([-0.5, y + hoch / 2 - 0.5, mitte - 1.5], [1, zh, 3], zacken,
                     drehung=[-20 * richtung, 0, 0], drehpunkt=[0, y + hoch / 2, mitte])
            g.kasten([-0.5, y + hoch / 2 + zh - 1, mitte - 0.5 + richtung], [1, 2, 1], zacken,
                     drehung=[-20 * richtung, 0, 0], drehpunkt=[0, y + hoch / 2, mitte])
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
        # Lange, nach unten gebogene Krallen: ein Glied vorn, die Spitze tiefer.
        kx = hx - fuss[0] / 2 + j * (fuss[0] - 1) / max(1, krallen - 1)
        fu.kasten([kx, fy - fuss[1], hz - fuss[2] - 0.5], [1, 1, 2], "kralle")
        fu.kasten([kx, fy - fuss[1] - 0.01, hz - fuss[2] - 1.5], [1, 1, 1], "kralle",
                  drehung=[25, 0, 0], drehpunkt=[kx + 0.5, fy - fuss[1] + 0.5, hz - fuss[2] - 0.5])
    return fy - fuss[1]


# ================================================================== Lindwurm (4.89)

# Wo das Maul sitzt (Knochen, Punkt an der Schnauzenspitze, zwischen den
# Kiefern) - daraus zeichnet die Pixelschmiede den Atem. Bei mehreren
# Koepfen steht hier eine Liste.
MAEULER = {}
# Wo die Augen sitzen (Knochen, y, z, halbe Kopfbreite) - fuer den Maler.
AUGEN = {}


def kopf_bauen(m, art, eltern, ky, kz, schaedel=(9, 6, 10), schnauze=(7, 4, 6), hoerner="krone", s=""):
    """Ein Drachenkopf mit Unterkiefer, Zaehnen, Augenlidern und Hoernern.
    s haengt an jeden Knochennamen (fuer Drachen mit mehreren Koepfen).
    hoerner: "krone" (viele nach hinten, wie bei Fynns Vorbild), "stacheln"
    (duenne Eisdornen), "stumpf" (kurz und dick), "ohren" (Hautlappen statt
    Hoernern), "geweih" (verzweigt), "kamm" (Flossenkamm)."""
    sb, sh, sl = schaedel
    nb, nh, nl = schnauze
    kopf = m.knoch(f"kopf{s}", [0, ky, kz], eltern)
    kopf.kasten([-sb / 2, ky - 2, kz - sl], [sb, sh, sl], "kopf")
    kopf.kasten([-nb / 2, ky - 2, kz - sl - nl], [nb, nh, nl], "schnauze")
    kopf.kasten([-sb / 2 - 0.5, ky - 2 + sh - 0.5, kz - sl + 1], [sb + 1, 1, 4], "braue")
    for x in (-nb / 2, nb / 2 - 1):
        kopf.kasten([x, ky - 2.5, kz - sl - nl + 0.5], [1, 1, nl - 1], "zaehne")
    # Das Maul: zu ist es eine Linie, offen Zaehne und der Rachen.
    kiefer = m.knoch(f"kiefer{s}", [0, ky - 2, kz - sl + 3], f"kopf{s}")
    kiefer.kasten([-nb / 2, ky - 4, kz - sl - nl], [nb, 2, nl + sl - 3], "kiefer")
    for x in (-nb / 2, nb / 2 - 1):
        kiefer.kasten([x, ky - 2.5, kz - sl - nl + 0.5], [1, 1, nl - 1], "zaehne")
    MAEULER.setdefault(art, []).append((f"kopf{s}", [0, ky - 2, kz - sl - nl]))
    # Die Augen: vorn oben am Schaedel, unter der Braue. Die Lider liegen als
    # hauchduenne Flaeche darueber und sind nur im Schlaf zu sehen.
    oy, oz = ky - 2 + sh - 2.5, kz - sl + 2.5
    AUGEN[art] = (oy, oz, sb / 2)
    lid = m.knoch(f"lider{s}", [0, ky, kz], f"kopf{s}")
    for x in (sb / 2 + 0.05, -sb / 2 - 0.05):
        lid.kasten([x, oy - 1, oz - 1.5], [0, 2, 3], "lid")
    if hoerner == "krone":
        # Wie auf Fynns Vorbild: zwei lange Haupthoerner mit Knick, dahinter
        # auf jeder Seite drei kleinere Stacheln, die faecherfoermig nach hinten
        # und aussen stehen, dazu Wangenstacheln am Kiefer und ein Nasenhorn.
        for seite, x in (("links", 1), ("rechts", -1)):
            hx_ = x * (sb / 2 - 2)
            h1 = m.knoch(f"horn{s}_{seite}", [hx_, ky + sh - 2, kz - 4], f"kopf{s}", drehung=[38, -x * 8, 0])
            h1.kasten([hx_ - 1, ky + sh - 3, kz - 4], [2, 2, 9], "horn")
            h2 = m.knoch(f"hornspitze{s}_{seite}", [hx_, ky + sh - 2, kz + 5], f"horn{s}_{seite}", drehung=[-35, 0, 0])
            h2.kasten([hx_ - 0.5, ky + sh - 2.5, kz + 4], [1, 1, 7], "horn")
            for i, (dy, w, l) in enumerate(((-1.0, 28, 7), (-3.0, 44, 6), (-5.0, 60, 5))):
                ox = x * sb / 2
                kopf.kasten([ox - (0 if x > 0 else 1), ky + sh - 2 + dy, kz - 2], [1, 1, l], "horn",
                            drehung=[12 - i * 8, -w * x, 0], drehpunkt=[ox, ky + sh - 2 + dy + 0.5, kz - 2])
            # Wangenstacheln unten am Schaedel, nach hinten.
            kopf.kasten([x * sb / 2 - (0 if x > 0 else 1), ky - 1.5, kz - 3], [1, 1, 5], "horn",
                        drehung=[-10, -x * 20, 0], drehpunkt=[x * sb / 2, ky - 1, kz - 3])
        kopf.kasten([-0.5, ky - 2 + nh, kz - sl - nl + 1.5], [1, 2, 2], "horn")        # Nasenhorn
    elif hoerner == "stacheln":
        for i in range(4):
            for x in (1, -1):
                kopf.kasten([x * (sb / 2 - 1 - i) - 0.5, ky + sh - 2.5, kz - 3 + i], [1, 1, 6 + i], "horn",
                            drehung=[35 - i * 6, -x * (12 + i * 8), 0],
                            drehpunkt=[x * (sb / 2 - 1 - i), ky + sh - 2, kz - 3 + i])
    elif hoerner == "stumpf":
        for x in (1, -1):
            kopf.kasten([x * (sb / 2 - 1) - 1.5, ky + sh - 2.5, kz - 5], [3, 3, 4], "horn",
                        drehung=[40, 0, 0], drehpunkt=[x * (sb / 2 - 1), ky + sh - 2, kz - 5])
        kopf.kasten([-1.5, ky - 2 + nh - 0.5, kz - sl - nl + 1], [3, 3, 3], "horn")
    elif hoerner == "ohren":
        for x in (1, -1):
            kopf.kasten([x * (sb / 2 - 1) - (0 if x > 0 else 2), ky + sh - 2.5, kz - 3], [2, 0, 7], "ohr",
                        drehung=[20, -x * 25, x * 30], drehpunkt=[x * (sb / 2 - 1), ky + sh - 2, kz - 3])
            kopf.kasten([x * (sb / 2) - (0 if x > 0 else 1), ky + sh - 4, kz - 2], [1, 0, 5], "ohr",
                        drehung=[5, -x * 50, x * 20], drehpunkt=[x * sb / 2, ky + sh - 4, kz - 2])
    elif hoerner == "geweih":
        for x in (1, -1):
            g = m.knoch(f"geweih{s}_{'links' if x > 0 else 'rechts'}", [x * 2.5, ky + sh - 2, kz - 4], f"kopf{s}",
                        drehung=[35, -x * 15, 0])
            g.kasten([x * 2.5 - 0.5, ky + sh - 2.5, kz - 4], [1, 1, 9], "horn")
            for i, l in enumerate((3, 4, 3)):
                g.kasten([x * 2.5 - 0.5, ky + sh - 2.5, kz - 1 + i * 2.5], [1, l, 1], "horn")
    elif hoerner == "kamm":
        kopf.kasten([-0.5, ky - 2 + sh, kz - sl + 1], [1, 4, sl + 2], "flosse")
        for x in (1, -1):
            kopf.kasten([x * sb / 2 - (0 if x > 0 else 0), ky - 1, kz - 4], [0, 4, 6], "flosse",
                        drehung=[0, -x * 30, 0], drehpunkt=[x * sb / 2, ky, kz - 4])
    return kopf


def sattel_bauen(m, eltern, oben, z, breite):
    """Ein Drachensattel: Sitz, vorn ein Knauf, seitlich Gurte. Nur zu sehen,
    wenn der Drache gesattelt ist (render controller)."""
    s = m.knoch("sattel", [0, oben, z], eltern)
    s.kasten([-4, oben, z - 4], [8, 1, 9], "sattel")
    s.kasten([-1, oben + 1, z - 4], [2, 2, 1], "sattel")
    s.kasten([-4.5, oben + 1, z + 4], [9, 1, 1], "sattel")
    for x in (breite / 2 + 0.1, -breite / 2 - 0.1):
        s.kasten([x, oben - 10, z], [0, 10, 2], "gurt")
    return s


# Wie bei Fynns Vorbildern (Ice and Fire): kraeftige Fluegelknochen, fuenf
# sehr lange Finger, die weit auseinanderstehen - der ganze Fluegel ist ein
# riesiger Faecher, dessen letzter Finger fast bis zur Huefte zurueckzeigt.
LINDWURM_SCHWINGE = Schwinge((8.5, 31, -9), oberarm=12, unterarm=16, finger=(54, 50, 44, 37, 28),
                             winkel=(16, -10, -36, -62, -90), hinterkante=(8, 18), dicke=(5, 4, 2))


def lindwurm_modell():
    """Der Feuerdrache, gebaut nach Fynns Vorbildern (Ice and Fire): ein
    grosser, kantiger Kopf mit Hoernerkrone, ein langer, dicker Hals, ein
    massiger Brustkorb, kurze dicke Beine mit grossen Klauen, riesige
    Faecherschwingen und ein langer Schwanz - ueberall hohe Rueckenstacheln."""
    m = Modell("lindwurm", sichtbreite=11.0, sichthoehe=4.0)
    MAEULER.pop("lindwurm", None)
    r = m.knoch("rumpf", [0, 21, 0])
    r.kasten([-9, 13, -15], [18, 18, 14], "leib")                    # Brust: hoch und breit
    r.kasten([-8, 13.5, -2], [16, 16, 11], "leib")                   # Bauch
    r.kasten([-7, 14.5, 8], [14, 14, 9], "leib")                     # Huefte
    r.kasten([-7, 12.5, -14], [14, 1, 29], "bauch")                  # Bauchschilde
    for z, h, top in ((-13, 5, 31), (-9, 6, 31), (-5, 6, 31), (-1, 6, 29.5), (3, 5, 29.5), (7, 5, 28.5),
                      (11, 4, 28.5), (14, 4, 28.5)):
        r.kasten([-0.5, top - 0.5, z], [1, h - 1, 3], "stachel", drehung=[-20, 0, 0], drehpunkt=[0, top, z + 1.5])
        r.kasten([-0.5, top + h - 2, z + 1.5], [1, 2, 1], "stachel", drehung=[-20, 0, 0], drehpunkt=[0, top, z + 1.5])
    hals, ende = glieder(m, "hals", "rumpf", (0, 25, -15),
                         -1, [(7, 12, 12, 1.5), (7, 11, 11, 1.5), (7, 10, 10, 1.5), (7, 9, 9, 1.0), (6, 9, 9, 0.5)],
                         stoff="leib", zacken="stachel")
    _, ky, kz = ende
    kopf_bauen(m, "lindwurm", hals[-1], ky, kz, schaedel=(12, 9, 12), schnauze=(9, 5, 11), hoerner="krone")
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 21.5, 17),
                            1, [(8, 12, 11, -0.6), (8, 10, 9, -0.6), (8, 9, 8, -0.4), (8, 8, 7, -0.3),
                                (8, 6, 6, -0.2), (8, 5, 5, 0.0), (8, 4, 4, 0.0), (8, 3, 3, 0.0)],
                            stoff="leib", zacken="stachel")
    _, sy, sz = ende
    m.finde(schwanz[-1]).kasten([-5, sy - 0.5, sz - 1], [10, 1, 8], "spitze")
    for seite, x in (("links", 7.5), ("rechts", -7.5)):
        # Kurze, dicke Beine; vorn richtige Haende mit vier Klauen.
        bein_bauen(m, f"bein_hinten_{seite}", "rumpf", (x, 21, 12), (8, 9, 10), (6, 8, 6), (8, 4, 10), krallen=4)
        bein_bauen(m, f"bein_vorn_{seite}", "rumpf", (x, 20, -10), (7, 8, 7), (5, 8, 5), (7, 4, 8), krallen=4)
    schwinge_bauen(m, LINDWURM_SCHWINGE)
    sattel_bauen(m, "rumpf", 31, -3, 18)
    return m


LINDWURM_FARBEN = {
    "gruen":   {"leib": "#3e6a30", "ruecken": "#1e3a1a", "bauch": "#d0c080", "haut": "#6a5230",
                "augen": "#ffa21a", "glut": "#ff7a1a"},
    "rot":     {"leib": "#8a2a22", "ruecken": "#4a1210", "bauch": "#e0b858", "haut": "#7a2e20",
                "augen": "#ffd21a", "glut": "#ffb030"},
    "schwarz": {"leib": "#2e2e36", "ruecken": "#121216", "bauch": "#7a6a8a", "haut": "#34303e",
                "augen": "#c07aff", "glut": "#b86aff"},
}


def drachen_maler(art, f, schwinge=None, besonders=None):
    """Der gemeinsame Maler aller Drachen. f: Farben (leib, ruecken, bauch,
    haut, augen, glut; wahlweise horn als drei Toene, kralle). besonders:
    ein eigener Maler, der zuerst gefragt wird - fuer das, was nur diese Art
    hat (Eisdornen, Gluehrisse, Flossen ...); liefert er False, malt der
    gemeinsame weiter."""
    leib, ruecken, bauch, haut = f["leib"], f["ruecken"], f["bauch"], f.get("haut", f["leib"])
    augen, gluht = f["augen"], f.get("glut", f["augen"])
    horn = f.get("horn", ("#6a5a44", "#b8a888", "#e8e0cc"))
    fluegel = schwinge_maler(schwinge, haut, ruecken) if schwinge else None

    def koerper(p, n, texel):
        return H.koerper(p, n, texel, bauch, leib, ruecken, grenze=0.28, stufen=4, schilde=2,
                         aalstrich=H.dunkler(ruecken, 0.15), strichbreite=1.0)

    def male(stoff, p, n, texel):
        x, y, z = p
        if besonders:
            farbe = besonders(stoff, p, n, texel)
            if farbe is not False:
                return farbe
        if stoff.startswith("flughaut") and fluegel:
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
        if stoff == "lid":
            return H.mische(H.farbe(leib), H.farbe(ruecken), 0.5)             # das geschlossene Auge
        if stoff == "braue":
            return H.farbe(ruecken)
        if stoff == "stachel":
            return H.verlauf([ruecken, H.mische(H.farbe(ruecken), H.farbe(horn[2]), 0.5)], H.hoehe(p, n, texel), 3)
        if stoff == "horn":
            # Vom Ansatz zur Spitze heller, wie echtes Horn.
            return H.verlauf(list(horn), H.laenge(p, texel, 2), 3)
        if stoff in ("ohr", "flosse"):
            return H.verlauf([H.dunkler(haut, 0.15), haut, H.heller(haut, 0.15)], H.laenge(p, texel, 2), 3)
        if stoff == "zaehne":
            return hexfarbe("#ece4d0")
        if stoff == "kralle":
            return H.farbe(f.get("kralle", "#2a2218"))
        if stoff == "kiefer":
            if n[1] > 0.5:
                return glut(H.verlauf([H.dunkler(gluht, 0.5), gluht], 1 - H.laenge(p, texel, 2), 3))  # Zunge und Rachen
            return H.koerper(p, n, texel, bauch, leib, ruecken, grenze=0.6, stufen=3)
        if stoff == "spitze":
            # Die Pfeilspitze am Schwanz: vorn breit, hinten spitz.
            t = H.laenge(p, texel, 2)
            if abs(x) > 4 * (1 - t) + 0.3:
                return None
            return H.verlauf([ruecken, leib], 1 - t, 3)
        if stoff in ("knochen", "fingerknochen"):
            return H.verlauf([H.dunkler(ruecken, 0.1), H.mische(H.farbe(ruecken), H.farbe(leib), 0.5)],
                             H.hoehe(p, n, texel), 2)
        if stoff in ("bein", "fuss"):
            return H.koerper(p, n, texel, bauch, leib, ruecken, grenze=0.1, stufen=3)
        if stoff == "sattel":
            # Braunes Leder mit hellerer Naht am Rand.
            k = H.kasten_von(texel)
            if k is not None and n[1] > 0.5 and (abs(x) > k.groesse[0] / 2 - 1 or
                                                 min(z - k.ursprung[2], k.ursprung[2] + k.groesse[2] - z) < 1):
                return hexfarbe("#b08850")
            return H.verlauf(["#4a2e1a", "#6a4226"], H.hoehe(p, n, texel), 2)
        if stoff == "gurt":
            return hexfarbe("#3a2414") if int(y) % 4 else hexfarbe("#a8a8b0")  # Gurt mit Schnalle
        return koerper(p, n, texel)
    return male


def lindwurm_maler(variante):
    return drachen_maler("lindwurm", LINDWURM_FARBEN.get(variante, LINDWURM_FARBEN["gruen"]), LINDWURM_SCHWINGE)


# ================================================================== Faltung

_faltungen = {}


def faltung(s):
    """Wie die Schwinge am Boden zusammengelegt wird - ausgerechnet statt
    geraten: Der Ellbogen liegt hinten oben am Leib, das Handgelenk steht als
    Buckel ueber der Schulter, und alle Finger liegen eng an der Flanke nach
    hinten. Gesucht wird grob, dann fein; das Ergebnis sind die Winkel
    (links) fuer Schulter, Unterarm, Hand und jeden Finger."""
    schluessel = (s.schulter, s.oberarm, s.unterarm, s.finger, s.winkel)
    if schluessel in _faltungen:
        return _faltungen[schluessel]
    import modell_ansehen as ma
    S, E, W = s.schulter, s.ellbogen, s.handgelenk
    ziel_x = S[0] + 3
    ziel_e = (S[0] + 1, S[1] + 3, S[2] + 12)
    ziel_h = (S[0] + 4, S[1] + 6, S[2] - 2)

    def welt(p, kette):
        for piv, rot in kette:
            p = ma.drehe(p, piv, rot)
        return p

    def fehler(fy, fz, uy, hx, hy, c):
        kS, kE, kW = (S, [0, fy, fz]), (E, [0, uy, 0]), (W, [hx, hy, 0])
        e = welt(E, [kS])
        h = welt(W, [kE, kS])
        f = sum((e[i] - ziel_e[i]) ** 2 for i in range(3)) + sum((h[i] - ziel_h[i]) ** 2 for i in range(3))
        for i in range(s.anzahl):
            fi = c - 0.75 * s.winkel[i]
            t = welt((W[0] + s.finger[i], W[1], W[2]), [(W, [0, s.winkel[i] + fi, 0]), kW, kE, kS])
            f += (t[0] - ziel_x) ** 2 + (t[1] - S[1] - 1) ** 2 + (0 if t[2] > S[2] + 18 else (S[2] + 18 - t[2]) ** 2)
        return f

    best = None
    for fy in range(-100, -49, 8):
        for fz in range(-70, -9, 10):
            for uy in range(120, 181, 10):
                for hx in range(-90, 91, 30):
                    for hy in range(-180, -99, 10):
                        for c in range(-30, 31, 10):
                            f = fehler(fy, fz, uy, hx, hy, c)
                            if best is None or f < best[0]:
                                best = (f, fy, fz, uy, hx, hy, c)
    # Fein nachsuchen um den besten Punkt.
    _, fy0, fz0, uy0, hx0, hy0, c0 = best
    for fy in range(fy0 - 6, fy0 + 7, 3):
        for fz in range(fz0 - 8, fz0 + 9, 4):
            for uy in range(uy0 - 8, uy0 + 9, 4):
                for hx in range(hx0 - 20, hx0 + 21, 10):
                    for hy in range(hy0 - 8, hy0 + 9, 4):
                        for c in range(c0 - 8, c0 + 9, 4):
                            f = fehler(fy, fz, uy, hx, hy, c)
                            if f < best[0]:
                                best = (f, fy, fz, uy, hx, hy, c)
    _, fy, fz, uy, hx, hy, c = best
    w = {"fluegel": [0.0, float(fy), float(fz)], "unterarm": [0.0, float(uy), 0.0], "hand": [float(hx), float(hy), 0.0]}
    for i in range(s.anzahl):
        w[f"finger{i + 1}"] = [0.0, round(c - 0.75 * s.winkel[i], 1), 0.0]
    _faltungen[schluessel] = w
    return w
