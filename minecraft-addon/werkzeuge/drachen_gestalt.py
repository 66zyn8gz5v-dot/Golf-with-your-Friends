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

from tiermodell import Modell, hexfarbe, mische, wolken
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
                 hinterkante=None, dicke=(3, 2, 1), biegung=0, bogen=3.0):
        # biegung: um wie viel Grad jeder Finger im letzten Drittel nach hinten
        # knickt (4.97, Fynn: "bei den Fluegeln nicht so gerade"); bogen: wie
        # tief die Hinterkante zwischen den Fingern eingebuchtet ist.
        self.biegung = biegung
        self.bogen = bogen
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


def schwinge_bauen(m, s, eltern="rumpf", zusatz=None):
    """Die linke Schwinge; die rechte entsteht durch spiegel_knochen.
    zusatz(m, s): was eine Art noch an die linke Schwinge baut (Krallen an
    den Fingerspitzen ...) - es wird mit gespiegelt."""
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
    # Die Haut am Unterarm reicht drei Pixel ueber den Ellbogen zurueck: Knickt
    # der Unterarm, liegt sie unter der des Oberarms, statt einen Spalt
    # aufzureissen.
    m.knoch("unterarmhaut_links", [ex, sy, sz], "unterarm_links").kasten(
        [ex - 3, sy - 0.02, sz + 0.5], [breite + 3, 0, s.hinterkante[1] - sz + 2], "flughaut_unterarm")
    hand = m.knoch("hand_links", [hx, sy, sz], "unterarm_links")
    hand.kasten([hx - 1.5, sy - 1.5, sz - 1.5], [3, 3, 3], "knochen")
    # Der Daumen: eine kurze Klaue vorn am Handgelenk.
    hand.kasten([hx - 0.5, sy - 0.5, sz - 4], [1, 1, 3], "knochen")
    hand.kasten([hx - 0.5, sy - 1.5, sz - 5], [1, 2, 1], "kralle")
    for i in range(s.anzahl):
        f = m.knoch(f"finger{i + 1}_links", [hx, sy, sz], "hand_links", drehung=[0, s.winkel[i], 0])
        st = d2 + (1 if i == 0 else 0)
        if s.biegung:
            # Zwei Drittel gerade, dann knickt der Finger nach hinten und wird
            # duenner - wie ein echter Fluegelfinger.
            a = round(s.finger[i] * 0.66)
            f.kasten([hx, sy - st / 2, sz - st / 2], [a, st, st], "fingerknochen")
            f.kasten([hx + a - 1, sy - (st - 1) / 2, sz - (st - 1) / 2], [s.finger[i] - a + 1, max(1, st - 1), max(1, st - 1)],
                     "fingerknochen", drehung=[0, -s.biegung, 0], drehpunkt=[hx + a, sy, sz])
            # Ein Knoechel am Knick.
            f.kasten([hx + a - 1, sy - st / 2 - 0.5, sz - st / 2 - 0.5], [2, st + 1, st + 1], "fingerknochen")
        else:
            f.kasten([hx, sy - st / 2, sz - st / 2], [s.finger[i], st, st], "fingerknochen")
        if i < s.anzahl - 1:
            # Die Haut bis zum naechsten Finger - als Dreieck im Rechteck.
            zwischen = math.radians(s.winkel[i] - s.winkel[i + 1])
            tief = int(math.ceil(s.finger[i] * math.sin(zwischen))) + 1
            m.knoch(f"fingerhaut{i + 1}_links", [hx, sy, sz], f"finger{i + 1}_links").kasten(
                [hx, sy, sz], [s.finger[i], 0, tief], f"flughaut_f{i + 1}")
    if zusatz:
        zusatz(m, s)
    spiegel_knochen(m, "fluegel_links", None, rechts)


def zackenkante(lx, lz, hoehe):
    """Eine gezackte Hinterkante (4.96, nach Fynns Vorbildern): ein
    Saegezahn, der entlang der Kante laeuft - so franst die Flughaut aus."""
    return hoehe * abs(((lx * 0.45 + lz * 0.2) % 2.0) - 1.0)


def schwinge_maler(s, haut, knochen, aderfarbe=None, zacken=0.0, flecken=None):
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
            if bogenkante(lx, lz, spitze_b, spitze_a, s.bogen) - zackenkante(lx, lz, zacken) < 0:
                return None
            if int(round(lz)) % 5 == 0 and lz > 1:
                return ader
            grund = H.verlauf([H.dunkler(haut, 0.12), haut, H.heller(haut, 0.12)], lz / 14.0, 4)
            if flecken and wolken((p[0], 0, p[2]), 4.0, 11) > 0.6:
                return H.mische(grund, H.farbe(flecken), 0.55)
            return grund
        # Arm und Unterarm: vom Knochen bis zur Linie letzte Fingerspitze - Leib.
        letzte = s.spitze(s.anzahl - 1)
        hinten = s.hinterkante
        ecken = [(s.schulter[0], s.schulter[2]), (hx, hz), letzte, hinten]
        if not innen((x, z), ecken):
            return None
        if bogenkante(x, z, hinten, letzte, s.bogen + 0.5) - zackenkante(x, z, zacken) < 0:
            return None
        if int(round(z - hz)) % 5 == 0 and z - hz > 1:
            return ader
        grund = H.verlauf([H.dunkler(haut, 0.12), haut, H.heller(haut, 0.12)], (z - hz) / 16.0, 4)
        if flecken and wolken((p[0], 0, p[2]), 4.0, 11) > 0.6:
            return H.mische(grund, H.farbe(flecken), 0.55)
        return grund
    return male


def verschiebe(m, namen, dx):
    """Schiebt Knochen samt Kaesten seitlich (fuer Koepfe, die nicht in der
    Mitte sitzen - der Giftdrache hat zwei)."""
    for k in m.knochen:
        if k.name not in namen:
            continue
        k.drehpunkt[0] += dx
        for c in k.kaesten:
            c.ursprung[0] += dx
            if c.drehpunkt:
                c.drehpunkt = [c.drehpunkt[0] + dx, c.drehpunkt[1], c.drehpunkt[2]]


def becken_abtrennen(m, z_grenze, y):
    """Teilt den Rumpf in Brust und Becken (4.94). Fynn: "Mach die Drachen
    dynamischer, gib ihnen mehr Gelenke." Ein Rumpf aus einem Stueck ist ein
    Brett - so biegt sich der Ruecken: Beim Gehen dreht das Becken gegen die
    Schultern, beim Aufbaeumen bleibt es unten, waehrend die Brust steigt.
    Alles hinter z_grenze (Huefte, Hinterbeine, Schwanz) haengt am Becken;
    Kaesten, die ueber die Grenze reichen, werden dort geteilt."""
    r = m.finde("rumpf")
    becken = m.knoch("becken", [0, y, z_grenze], "rumpf")
    # Gleich hinter den Rumpf in die Reihe, damit Eltern vor Kindern stehen.
    m.knochen.remove(becken)
    m.knochen.insert(m.knochen.index(r) + 1, becken)
    bleibt = []
    for c in r.kaesten:
        anfang, ende = c.ursprung[2], c.ursprung[2] + c.groesse[2]
        if anfang >= z_grenze - 0.01:
            becken.kaesten.append(c)
        elif ende > z_grenze + 0.5 and not c.drehung and float(z_grenze - anfang).is_integer():
            vorn = int(z_grenze - anfang)
            bleibt.append(c)
            becken.kasten([c.ursprung[0], c.ursprung[1], z_grenze], [c.groesse[0], c.groesse[1], c.groesse[2] - vorn],
                          c.stoff, aufblasen=c.aufblasen)
            c.groesse[2] = vorn
        else:
            bleibt.append(c)
    r.kaesten = bleibt
    for k in m.knochen:
        if k.eltern == "rumpf" and (k.name.startswith("bein_hinten") or k.name == "schwanz1"):
            k.eltern = "becken"
    return becken


def glieder(m, name, eltern, start, richtung, teile, stoff="leib", zacken=None, drehung=None):
    """Eine Kette von Gliedern (Hals oder Schwanz). teile: Liste von
    (Laenge, Breite, Hoehe, Anstieg). richtung -1 = nach vorn (Hals),
    +1 = nach hinten (Schwanz). Jedes Glied haengt am vorigen; sein
    Drehpunkt ist das Gelenk zum vorigen. zacken: Stoff fuer einen
    Rueckenstachel auf jedem Glied."""
    x0, y, z = start
    namen = []
    for i, (lang, breit, hoch, steig) in enumerate(teile):
        n = f"{name}{i + 1}"
        # drehung: nur das erste Glied - es stellt die ganze Kette schraeg
        # (die beiden Haelse des Giftdrachen stehen auseinander).
        g = m.knoch(n, [x0, y, z], eltern, drehung=drehung if i == 0 else None)
        z_anfang = z if richtung > 0 else z - lang
        # Ein Pixel Ueberlappung zum vorigen Glied: So klafft beim Biegen nichts.
        g.kasten([x0 - breit / 2, y - hoch / 2, z_anfang - (1 if (richtung > 0 and i) else 0)],
                 [breit, hoch, lang + (1 if i else 0)], stoff)
        if zacken:
            # Ein hoher Stachel, unten breit, oben schmal und nach hinten
            # geneigt - wie die Rueckenkaemme auf Fynns Vorbildern.
            zh = max(2, round(hoch * 0.5))
            mitte = z_anfang + lang / 2
            g.kasten([x0 - 0.5, y + hoch / 2 - 0.5, mitte - 1.5], [1, zh, 3], zacken,
                     drehung=[-20 * richtung, 0, 0], drehpunkt=[x0, y + hoch / 2, mitte])
            g.kasten([x0 - 0.5, y + hoch / 2 + zh - 1, mitte - 0.5 + richtung], [1, 2, 1], zacken,
                     drehung=[-20 * richtung, 0, 0], drehpunkt=[x0, y + hoch / 2, mitte])
        eltern = n
        namen.append(n)
        z = z + richtung * lang
        y = y + steig
    return namen, (x0, y, z)


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
    # Die Krallen sitzen auf einem eigenen Gelenk vorn am Fuss (4.94): Beim
    # Heben krallen sie sich ein, beim Aufsetzen spreizen sie sich.
    vorn_z = hz - fuss[2] + 1.5
    ze = m.knoch(name.replace("bein", "zehen"), [hx, fy - fuss[1] + 0.5, vorn_z], name.replace("bein", "fuss"))
    for j in range(krallen):
        # Lange, nach unten gebogene Krallen: ein Glied vorn, die Spitze tiefer.
        kx = hx - fuss[0] / 2 + j * (fuss[0] - 1) / max(1, krallen - 1)
        ze.kasten([kx, fy - fuss[1], hz - fuss[2] - 0.5], [1, 1, 2], "kralle")
        ze.kasten([kx, fy - fuss[1] - 0.01, hz - fuss[2] - 1.5], [1, 1, 1], "kralle",
                  drehung=[25, 0, 0], drehpunkt=[kx + 0.5, fy - fuss[1] + 0.5, hz - fuss[2] - 0.5])
    return fy - fuss[1]


# ================================================================== Lindwurm (4.89)

# Wo das Maul sitzt (Knochen, Punkt an der Schnauzenspitze, zwischen den
# Kiefern) - daraus zeichnet die Pixelschmiede den Atem. Bei mehreren
# Koepfen steht hier eine Liste.
MAEULER = {}
# Wo die Augen sitzen (Knochen, y, z, halbe Kopfbreite) - fuer den Maler.
AUGEN = {}


def kopf_bauen(m, art, eltern, ky, kz, schaedel=(9, 6, 10), schnauze=(7, 4, 6), hoerner="krone", s="", zier=()):
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
    # Zierrat (4.95) - Fynn: "generell ein bisschen mehr Details noch in den
    # Drachen", und die Arten sollen sich staerker unterscheiden.
    if "kinn" in zier:
        # Kinnstacheln: zwei Reihen unter dem Unterkiefer, nach hinten gekaemmt.
        for i in range(3):
            for x in (nb / 2 - 1.5, -nb / 2 + 0.5):
                kiefer.kasten([x, ky - 5, kz - sl - 1 + i * 2.5], [1, 1, 3 - (i == 2)], "horn",
                              drehung=[-35, 0, 0], drehpunkt=[x + 0.5, ky - 4, kz - sl - 1 + i * 2.5])
    if "eisbart" in zier:
        # Ein Bart aus Eiszapfen am Kinn, vorn kurz, nach hinten laenger.
        for i, (x, lang) in enumerate(((-1.5, 2), (0.5, 3), (-0.5, 4), (1.5, 3), (-2.5, 2))):
            kiefer.kasten([x, ky - 4 - lang, kz - sl - nl + 3 + i * 1.5], [1, lang, 1], "eiszacke",
                          drehung=[15, 0, 0], drehpunkt=[x + 0.5, ky - 4, kz - sl - nl + 3.5 + i * 1.5])
    if "eiskamm" in zier:
        # Ein Kamm aus Eis vom Nasenruecken bis in den Nacken.
        for i, h in enumerate((2, 3, 4, 3)):
            kopf.kasten([-0.5, ky - 2 + sh - 0.5, kz - sl + i * 2.5], [1, h, 2], "eiszacke",
                        drehung=[-25, 0, 0], drehpunkt=[0, ky - 2 + sh, kz - sl + 1 + i * 2.5])
    if "kragen" in zier:
        # Ein Halskragen wie bei der Kragenechse: zwei Haeute, im Ruhen nach
        # hinten an den Hals gelegt - beim Giftspeien und Bruellen klappt er
        # auf (Knochen kragen_links/rechts, gedreht in den Bewegungen).
        for seite, x in (("links", 1), ("rechts", -1)):
            kr = m.knoch(f"kragen{s}_{seite}", [x * sb / 2, ky + 1, kz - 1], f"kopf{s}", drehung=[0, -x * 70, 0])
            kr.kasten([x * sb / 2 - (0 if x > 0 else 7), ky - 4, kz - 1], [7, 10, 0], "kragen")
            # Die Stacheln, die die Haut spannen.
            for j, (dy, w) in enumerate(((5, 30), (1, 0), (-3, -30))):
                kr.kasten([x * sb / 2 - (0 if x > 0 else 7), ky + 1 + dy * 0.8, kz - 1.5], [7, 1, 1], "horn",
                          drehung=[0, 0, x * w * 0.6], drehpunkt=[x * sb / 2, ky + 1, kz - 1])
    return kopf


def sattelzeug(stoff, p, n, texel):
    """Satteldecke (tiefrot, goldener Saum) und Beschlaege (Eisen)."""
    if stoff == "metall":
        return H.verlauf(["#6a6a72", "#c8c8d0"], H.hoehe(p, n, texel), 2)
    k = H.kasten_von(texel)
    if k is not None:
        rand = min(p[0] - k.ursprung[0], k.ursprung[0] + k.groesse[0] - p[0],
                   p[2] - k.ursprung[2], k.ursprung[2] + k.groesse[2] - p[2])
        if rand < 1.0:
            return hexfarbe("#e0b040")
    return hexfarbe("#8a1e22") if int(p[2] // 2) % 2 else hexfarbe("#7a181c")


def sattel_bauen(m, eltern, oben, z, breite):
    """Ein Drachensattel (4.99 groesser und genauer): unten eine Satteldecke
    mit Saum, darauf der Sitz aus Leder mit hohem Hinterzwiesel und einem
    Knauf vorn, seitlich Gurte und Steigbuegel. Nur zu sehen, wenn der
    Drache gesattelt ist (render controller)."""
    s = m.knoch("sattel", [0, oben, z], eltern)
    db = min(breite - 2, 14)
    s.kasten([-db / 2, oben - 0.5, z - 6], [db, 1, 14], "decke")
    s.kasten([-4, oben + 0.5, z - 4], [8, 2, 9], "sattel")
    s.kasten([-4, oben + 2.5, z + 3], [8, 3, 2], "sattel")                  # Hinterzwiesel
    s.kasten([-1.5, oben + 2.5, z - 4], [3, 3, 2], "sattel")                # Knauf
    s.kasten([-1, oben + 5, z - 4], [2, 1, 2], "metall")
    for x in (1, -1):
        gx = x * (breite / 2 + 0.1) - (0 if x > 0 else 0)
        s.kasten([gx, oben - 10, z - 1], [0, 10, 2], "gurt")
        # Steigbuegel an einem Riemen, neben der Flanke.
        bx = x * (db / 2 + 0.5) - (0.5 if x > 0 else 0.5)
        s.kasten([bx, oben - 6, z + 1], [1, 6, 1], "gurt")
        s.kasten([bx - 1, oben - 7, z + 0.5], [3, 1, 2], "metall")
    return s


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
        if stoff == "glutader":
            return glut(gluht, 0.1)
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
        if stoff in ("decke", "metall"):
            return sattelzeug(stoff, p, n, texel)
        return koerper(p, n, texel)
    return male


_faltungen = {}


def faltung(s, stuetzt=False):
    """Wie die Schwinge am Boden zusammengelegt wird - ausgerechnet statt
    geraten: Der Ellbogen liegt hinten oben am Leib, das Handgelenk steht als
    Buckel ueber der Schulter, und alle Finger liegen eng an der Flanke nach
    hinten. Gesucht wird grob, dann fein; das Ergebnis sind die Winkel
    (links) fuer Schulter, Unterarm, Hand und jeden Finger.

    stuetzt: ein Wyvern hat keine Vorderbeine - er stuetzt sich auf die
    Handgelenke der gefalteten Schwingen, wie eine Fledermaus am Boden.
    Dann sitzt das Handgelenk unten vorn neben der Brust."""
    schluessel = (s.schulter, s.oberarm, s.unterarm, s.finger, s.winkel, stuetzt)
    if schluessel in _faltungen:
        return _faltungen[schluessel]
    import modell_ansehen as ma
    S, E, W = s.schulter, s.ellbogen, s.handgelenk
    ziel_x = S[0] + 3
    ziel_e = (S[0] + 1, S[1] + 3, S[2] + 12)
    ziel_h = (S[0] + 4, S[1] + 6, S[2] - 2)
    if stuetzt:
        ziel_e = (S[0] + 3, S[1] + 4, S[2] + 6)
        ziel_h = (S[0] + 5, 1.5, S[2] - 4)

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
            if t[1] < 1:
                f += 50 * (1 - t[1]) ** 2               # nicht in den Boden
        return f

    best = None
    if stuetzt:
        raster = (range(-150, 151, 30), range(-90, 91, 30), range(-180, 181, 30), range(-90, 91, 45),
                  range(-180, 181, 45), range(-30, 31, 15))
    else:
        raster = (range(-100, -49, 8), range(-70, -9, 10), range(120, 181, 10), range(-90, 91, 30),
                  range(-180, -99, 10), range(-30, 31, 10))
    import itertools
    for werte in itertools.product(*raster):
        f = fehler(*werte)
        if best is None or f < best[0]:
            best = (f,) + werte
    # Dann Schritt fuer Schritt verfeinern: jeden Winkel einzeln ein Stueck
    # hin und her, solange es besser wird, mit immer kleineren Schritten.
    werte = list(best[1:])
    for schritt in (16, 8, 4, 2, 1):
        besser = True
        while besser:
            besser = False
            for i in range(len(werte)):
                for d in (-schritt, schritt):
                    probe = list(werte)
                    probe[i] += d
                    f = fehler(*probe)
                    if f < best[0]:
                        best = (f,) + tuple(probe)
                        werte = probe
                        besser = True
    _, fy, fz, uy, hx, hy, c = best
    w = {"fluegel": [0.0, float(fy), float(fz)], "unterarm": [0.0, float(uy), 0.0], "hand": [float(hx), float(hy), 0.0]}
    for i in range(s.anzahl):
        w[f"finger{i + 1}"] = [0.0, round(c - 0.75 * s.winkel[i], 1), 0.0]
    _faltungen[schluessel] = w
    return w


# ================================================================== Himmelsdrache (4.92)

# 4.95: Fynn: "Der Luftdrache ... fliegt ein bisschen wie Rayquaza. Der
# braucht bessere Animation, mehr Gelenke, weil der sehr gelenkig ist."
# Statt 14 Gliedern zu 7 Pixeln jetzt 22 zu 5: Die Wellen laufen runder
# durch den Leib, er kann sich enger winden und zur Schraube drehen.
HIMMELSDRACHE_GLIEDER = 22
# An welchen Gliedern die Seitenflossen sitzen und das hintere Beinpaar.
HIMMELSDRACHE_FLOSSEN = (3, 7, 11, 15, 19)
HIMMELSDRACHE_BEINGLIED = 6


def himmelsdrache_modell():
    """Der Himmelsdrache: lang wie eine Schlange, keine Schwingen - er
    schwebt schlaengelnd durch die Luft wie die Drachen aus dem Osten (und
    wie Rayquaza). Ein Vorderleib mit kleinen Beinen, ein kurzer Hals, ein
    Kopf mit Geweih, Barthaaren aus drei Gliedern und einer Maehne, dann
    22 Glieder mit einem Rueckenkamm; an fuenf davon ein Paar Seitenflossen
    auf eigenen Gelenken, die im Flug schlagen. Hinten das zweite Beinpaar
    und am Ende eine Schwanzflosse wie ein Faecher."""
    m = Modell("himmelsdrache", sichtbreite=9.0, sichthoehe=3.0)
    MAEULER.pop("himmelsdrache", None)
    r = m.knoch("rumpf", [0, 14, 0])
    r.kasten([-4.5, 10, -6], [9, 8, 12], "leib")
    r.kasten([-3.5, 9.5, -5], [7, 1, 10], "bauch")
    for z in (-5, -1, 3):
        r.kasten([-0.5, 18, z], [1, 3, 3], "maehne")
    hals, ende = glieder(m, "hals", "rumpf", (0, 15, -6), -1, [(6, 8, 8, 1.5), (6, 7, 7, 1.0)], stoff="leib")
    for h in hals:
        k = m.finde(h)
        z0 = k.kaesten[0].ursprung[2]
        k.kasten([-0.5, k.kaesten[0].ursprung[1] + k.kaesten[0].groesse[1], z0 + 1], [1, 3, 4], "maehne")
    _, ky, kz = ende
    kopf_bauen(m, "himmelsdrache", hals[-1], ky, kz, schaedel=(8, 6, 8), schnauze=(6, 4, 7), hoerner="geweih")
    for seite, x in (("links", 1), ("rechts", -1)):
        # Die Barthaare: drei Glieder je Seite, damit sie im Flug in Wellen
        # nachwehen statt wie Stangen abzustehen.
        eltern, bz = "kopf", kz - 13
        for i in range(3):
            b = m.knoch(f"bart{i + 1}_{seite}", [x * 3, ky - 1, bz], eltern,
                        drehung=[20, -x * 30, 0] if i == 0 else None)
            b.kasten([x * 3 - 0.5, ky - 1.5, bz], [1, 1, 5], "bart")
            eltern, bz = f"bart{i + 1}_{seite}", bz + 5
        # Die Maehne am Hinterkopf: zwei breite Buschel.
        m.finde("kopf").kasten([x * 4 - (0 if x > 0 else 1), ky, kz - 3], [1, 5, 5], "maehne",
                                drehung=[-25, -x * 20, 0], drehpunkt=[x * 4, ky + 2, kz - 3])
        # Flossenohren, nach hinten gelegt.
        m.finde("kopf").kasten([x * 4 - (0 if x > 0 else 0), ky + 1, kz - 6], [0, 3, 6], "flosse",
                                drehung=[15, -x * 35, 0], drehpunkt=[x * 4, ky + 2, kz - 6])
    teile = []
    for i in range(HIMMELSDRACHE_GLIEDER):
        dicke = max(3, round(8 - i * 0.26))
        teile.append((5, dicke, dicke, 0.0))
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 14, 6), 1, teile, stoff="leib", zacken="maehne")
    _, sy, sz = ende
    for n in HIMMELSDRACHE_FLOSSEN:
        # Seitenflossen: schmale Klingen, schraeg nach hinten und aussen -
        # jede auf einem eigenen Gelenk.
        g = m.finde(f"schwanz{n}")
        gz = g.drehpunkt[2]
        d = teile[n - 1][1]
        for seite, x in (("links", 1), ("rechts", -1)):
            fl = m.knoch(f"flosse{n}_{seite}", [x * d / 2, 14, gz + 2], f"schwanz{n}", drehung=[0, -x * 40, x * 10])
            lang = max(5, 10 - n // 4)
            fl.kasten([x * d / 2 - (0 if x > 0 else lang), 13.5, gz + 1], [lang, 1, 4], "flosse")
            fl.kasten([x * d / 2 + (lang if x > 0 else -lang - 3), 13.5, gz + 2], [3, 1, 3], "flosse")
    # Die Schwanzflosse: ein Faecher aus fuenf Strahlen auf eigenem Gelenk.
    faecher = m.knoch("schwanzflosse", [0, sy, sz - 1], schwanz[-1])
    for w in (-50, -25, 0, 25, 50):
        faecher.kasten([-0.5, sy - 0.5, sz - 1], [1, 1, 7], "maehne", drehung=[0, w, 0], drehpunkt=[0, sy, sz - 1])
    faecher.kasten([-3, sy - 0.5, sz - 1], [6, 0, 6], "flosse")
    for seite, x in (("links", 4), ("rechts", -4)):
        bein_bauen(m, f"bein_vorn_{seite}", "rumpf", (x, 12, -2), (3, 5, 3), (2, 5, 2), (3, 2, 4), krallen=4)
        # Das hintere Beinpaar sitzt am sechsten Glied und schwingt mit ihm.
        gz = m.finde(f"schwanz{HIMMELSDRACHE_BEINGLIED}").drehpunkt[2] + 2
        bein_bauen(m, f"bein_hinten_{seite}", f"schwanz{HIMMELSDRACHE_BEINGLIED}", (x * 0.8, 12, gz), (3, 5, 3),
                   (2, 5, 2), (3, 2, 4), krallen=4)
    sattel_bauen(m, "rumpf", 18, -1, 9)
    from drachen_klotz import uralt_zier, sattelzone
    uralt_zier(m)
    sattelzone(m)
    return m


HIMMELSDRACHE_FARBEN = {
    "jade":  {"leib": "#3c8a64", "ruecken": "#1e5a44", "bauch": "#e8d890", "haut": "#e8b030",
              "augen": "#ffe25a", "glut": "#e8fffa", "horn": ("#8a6a30", "#d8b060", "#f8e8b0"), "kralle": "#e8c860",
              "maehne": ("#c83a22", "#f0a030"), "bart": "#f0c850"},
    "perle": {"leib": "#dce8f0", "ruecken": "#7a9ec0", "bauch": "#fbf6e8", "haut": "#9ac8e8",
              "augen": "#60c8ff", "glut": "#f4fbff", "horn": ("#a0a8b8", "#dce2ec", "#ffffff"), "kralle": "#c0ccda",
              "maehne": ("#5a8ad8", "#b8e0ff"), "bart": "#e0eaf4"},
    "gold":  {"leib": "#d8a830", "ruecken": "#9a5a18", "bauch": "#f8e8b0", "haut": "#c83a22",
              "augen": "#ff5a2a", "glut": "#fff4d0", "horn": ("#7a4a1a", "#c89048", "#f0d8a0"), "kralle": "#7a4a1a",
              "maehne": ("#b0201a", "#ff7a2a"), "bart": "#fff0b0"},
}


def himmelsdrache_maler(variante):
    f = HIMMELSDRACHE_FARBEN.get(variante, HIMMELSDRACHE_FARBEN["jade"])

    def besonders(stoff, p, n, texel):
        if stoff == "maehne":
            # Die Maehne und die Rueckenkaemme: vom Ansatz zur Spitze heller.
            t = H.hoehe(p, n, texel) if abs(n[1]) < 0.5 else (1.0 if n[1] > 0 else 0.0)
            return H.verlauf([f["maehne"][0], f["maehne"][1]], t, 3)
        if stoff == "bart":
            return H.verlauf([H.dunkler(f["bart"], 0.15), f["bart"]], 1 - H.laenge(p, texel, 2), 3)
        if stoff == "leib" and n[1] < -0.5:
            # Der Bauch ist ein durchgehendes helles Band mit Querschilden.
            return H.dunkler(f["bauch"], 0.12) if int(p[2] // 1) % 2 == 0 else H.farbe(f["bauch"])
        return False
    return drachen_maler("himmelsdrache", f, None, besonders)


# Die neuen Drachen (4.96) im Stil von Fynns Vorbildern stehen in
# drachen_klotz; hier sind sie mit ihrem Namen zu finden wie alle anderen.
from drachen_klotz import *  # noqa: E402,F401,F403
# Die Arten aus der Zucht (5.2).
from drachen_neu import *  # noqa: E402,F401,F403
