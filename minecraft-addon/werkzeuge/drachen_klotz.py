#!/usr/bin/env python3
"""Die neuen Drachen (ab 4.96) - von vorn gebaut, nach Fynns Vorbildern.

Fynn: "Mach ganz neue Drachenmodelle draus ... es ist schwerer, von den
anderen weiterzuarbeiten, als neu zu starten." Seine Bilder zeigen
Minecraft-Drachen aus wenigen, kraeftigen Bloecken: ein wuchtiger, kantiger
Kopf mit geschichteten Klingenhoernern, ein gelbes Schlitzauge, einzelne
weisse Zaehne, ein dicker Hals aus Bloecken, ein heller Brustpanzer, lange
flache Zehen, grosse Schwingen mit dicken Knochen und gezacktem Rand - und
eine Haut mit grossen Flecken statt Sprenkeln.

Die Knochen heissen wie bei den alten Drachen (rumpf, becken, hals1 ...,
kopf, kiefer, fluegel_links ...), damit Bewegungen, Faltung, Sattel und
Skript weiter passen. Neu sind Form und Haut.

Stoffe und was der Maler daraus macht:

* leib, bauch, brust - die Haut: Bauch unten hell, Flanke, Ruecken dunkler,
  darueber grosse dunkle Flecken; oben an jeder Kante ein heller, unten ein
  dunkler Saum, damit die Bloecke plastisch wirken.
* klinge - flache Rueckenstacheln und Hoerner: dunkel am Ansatz, zur Spitze
  hell.
* zahn, zunge, rachen, kralle, auge ...
"""

import math

import haut as H
from tiermodell import Modell, hexfarbe, mische, wolken
from drachen_gestalt import (MAEULER, AUGEN, Schwinge, schwinge_bauen, schwinge_maler, glieder,
                             becken_abtrennen, sattel_bauen, sattelzeug, glut)


# ================================================================== Bausteine

def klinge(k, x, y, z, hoch, lang, neigung=-30, seite=0.0, stoff="klinge"):
    """Ein flacher Stachel wie eine Klinge: unten breit, oben schmal, nach
    hinten geneigt. (x, y, z): wo er ansetzt."""
    k.kasten([x - 0.5, y - 0.5, z - lang / 2], [1, max(1, round(hoch * 0.6)), lang], stoff,
             drehung=[neigung, 0, seite], drehpunkt=[x, y, z])
    k.kasten([x - 0.5, y - 0.5 + round(hoch * 0.6) - 1, z - lang / 4], [1, max(1, round(hoch * 0.5)), max(1, lang // 2)],
             stoff, drehung=[neigung, 0, seite], drehpunkt=[x, y, z])


def klingen_reihe(m, glieder_namen, stoff="klinge", hoehe=(5, 3), neigung=-30):
    """Auf jedes Glied einer Kette eine Klinge, nach hinten kleiner."""
    for i, n in enumerate(glieder_namen):
        g = m.finde(n)
        c = g.kaesten[0]
        oben = c.ursprung[1] + c.groesse[1]
        mitte = c.ursprung[2] + c.groesse[2] / 2
        t = i / max(1, len(glieder_namen) - 1)
        h = round(hoehe[0] + (hoehe[1] - hoehe[0]) * t)
        if h >= 1:
            klinge(g, 0, oben, mitte, h, max(2, round(c.groesse[2] * 0.7)), neigung, stoff=stoff)


def bein_klotz(m, name, eltern, huefte, oben, unten, fuss, zehen=4, zehlang=5):
    """Ein kraeftiges Bein wie auf Fynns Bildern: dicker Schenkel, Unterschenkel,
    ein flacher Fuss und lange, flache Zehen mit Krallen, jede ein eigener
    Kasten. oben/unten: (Breite, Laenge, Tiefe); fuss: (Breite, Hoehe, Laenge).
    Die Zehen haengen an zehen_... und krallen sich beim Gehen ein."""
    hx, hy, hz = huefte
    ob = m.knoch(name, [hx, hy, hz], eltern)
    ob.kasten([hx - oben[0] / 2, hy - oben[1], hz - oben[2] / 2], [oben[0], oben[1] + 2, oben[2]], "bein")
    ky = hy - oben[1]
    un = m.knoch(name.replace("bein", "unterbein"), [hx, ky, hz], name)
    un.kasten([hx - unten[0] / 2, ky - unten[1], hz - unten[2] / 2], [unten[0], unten[1] + 1, unten[2]], "bein")
    fy = ky - unten[1]
    fu = m.knoch(name.replace("bein", "fuss"), [hx, fy, hz], name.replace("bein", "unterbein"))
    fu.kasten([hx - fuss[0] / 2, fy - fuss[1], hz - fuss[2] / 2 - 1], [fuss[0], fuss[1], fuss[2]], "bein")
    vorn = hz - fuss[2] / 2 - 1
    ze = m.knoch(name.replace("bein", "zehen"), [hx, fy - fuss[1] + 1, vorn], name.replace("bein", "fuss"))
    breit = fuss[0] / zehen
    for j in range(zehen):
        zx = hx - fuss[0] / 2 + j * breit + (breit - 2) / 2
        # Die aeusseren Zehen spreizen sich ein wenig.
        spreiz = (j - (zehen - 1) / 2) * 8
        ze.kasten([zx, fy - fuss[1], vorn - zehlang], [2, 2, zehlang], "bein", drehung=[0, -spreiz, 0],
                  drehpunkt=[zx + 1, fy - fuss[1] + 1, vorn])
        ze.kasten([zx + 0.5, fy - fuss[1] - 0.01, vorn - zehlang - 2], [1, 1, 2], "kralle", drehung=[0, -spreiz, 0],
                  drehpunkt=[zx + 1, fy - fuss[1] + 1, vorn])
    # Eine Afterkralle hinten am Fuss.
    fu.kasten([hx - 0.5, fy - fuss[1], hz + fuss[2] / 2 - 1], [1, 1, 2], "kralle")
    return fy - fuss[1]


def kopf_klotz(m, art, eltern, ky, kz, schaedel=(12, 10, 11), schnauze=(10, 6, 11), hoerner="klingen", s="",
               zaehne=True):
    """Ein kantiger Drachenkopf aus Bloecken: Schaedel, eine lange Schnauze
    mit Nasenbuckel, Brauenwuelste ueber gelben Schlitzaugen, Unterkiefer
    mit Zunge, Zaehne einzeln oben und unten, dazu Hoerner nach Art:
    "klingen" (geschichtete flache Klingen nach hinten, wie auf Fynns Bild),
    "sicheln" (zwei lange, gebogene Hoerner), "stacheln" (ein Kranz spitzer
    Dornen)."""
    sb, sh, sl = schaedel
    nb, nh, nl = schnauze
    kopf = m.knoch(f"kopf{s}", [0, ky, kz], eltern)
    y0 = ky - 3
    kopf.kasten([-sb / 2, y0, kz - sl], [sb, sh, sl], "kopf")
    kopf.kasten([-nb / 2, y0, kz - sl - nl], [nb, nh, nl], "schnauze")
    kopf.kasten([-nb / 2 + 1, y0 + nh, kz - sl - nl + 1], [nb - 2, 2, nl - 3], "schnauze")      # Nasenbuckel
    # Brauenwuelste: ueber jedem Auge ein Block, schraeg nach hinten hoch.
    for x in (1, -1):
        kopf.kasten([x * sb / 2 - (1 if x > 0 else 2), y0 + sh - 3, kz - sl - 1], [3, 2, 6], "braue",
                    drehung=[-12, 0, 0], drehpunkt=[x * sb / 2, y0 + sh - 2, kz - sl])
        # Wangenplatten hinten am Kiefer.
        kopf.kasten([x * sb / 2 - (0 if x > 0 else 1), y0 - 1, kz - 4], [1, 4, 4], "klinge",
                    drehung=[0, -x * 20, 0], drehpunkt=[x * sb / 2, y0, kz - 4])
        # Kiefermuskeln (4.97): ein Wulst hinten an jeder Wange, unter dem Auge.
        kopf.kasten([x * sb / 2 - (0 if x > 0 else 1.5), y0, kz - sl + 4], [1, 4, 5], "muskel",
                    aufblasen=0.25)
        # Das Auge: ein eigener Block, ein Stueck aus dem Schaedel heraus, unter
        # der Braue - mit Schlitzpupille und dunkler Hoehle darum.
        kopf.kasten([x * sb / 2 - (0 if x > 0 else 1), y0 + sh - 6, kz - sl + 1], [1, 3, 4], "auge",
                    aufblasen=0.02)
        # Nuestern: zwei kleine Wuelste vorn auf der Schnauze.
        kopf.kasten([x * (nb / 2 - 2) - (0 if x > 0 else 2), y0 + nh - 0.5, kz - sl - nl + 0.5], [2, 1, 2], "nuester")
    # Eine Stufe von der Stirn zur Schnauze - weicher Uebergang statt Kante.
    kopf.kasten([-nb / 2 - 0.5, y0 + nh, kz - sl - 3], [nb + 1, 2, 4], "kopf")
    # Kinnwulst unter dem Schaedel, zum Hals hin.
    kopf.kasten([-sb / 2 + 1.5, y0 - 2, kz - 6], [sb - 3, 2, 6], "kehle")
    if zaehne:
        # Oben: Zaehne einzeln an den Seiten, vorn zwei lange Fangzaehne.
        for z in range(int(kz - sl - nl + 2), int(kz - sl), 2):
            for x in (nb / 2 - 1, -nb / 2):
                kopf.kasten([x, y0 - 1, z], [1, 1, 1], "zahn")
        for x in (-nb / 2 + 1, nb / 2 - 2):
            kopf.kasten([x, y0 - 2, kz - sl - nl + 0.5], [1, 2, 1], "zahn")
    kiefer = m.knoch(f"kiefer{s}", [0, y0, kz - sl + 2], f"kopf{s}")
    kiefer.kasten([-nb / 2 + 0.5, y0 - 3, kz - sl - nl + 1], [nb - 1, 3, nl + sl - 4], "kiefer")
    kiefer.kasten([-nb / 2 + 2, y0 - 0.5, kz - sl - nl + 3], [nb - 4, 1, nl - 2], "zunge")
    # Das Kinn: vorn ein Wulst nach unten, hinten die Kieferleiste.
    kiefer.kasten([-nb / 2 + 1.5, y0 - 4, kz - sl - nl + 1.5], [nb - 3, 1, 4], "kiefer")
    for x in (1, -1):
        kiefer.kasten([x * (nb / 2 - 0.5) - (0 if x > 0 else 1), y0 - 3.5, kz - sl - 2], [1, 2, 5], "muskel")
    if zaehne:
        for z in range(int(kz - sl - nl + 3), int(kz - sl), 2):
            for x in (nb / 2 - 1.5, -nb / 2 + 0.5):
                kiefer.kasten([x, y0, z], [1, 1, 1], "zahn")
    MAEULER.setdefault(art, []).append((f"kopf{s}", [0, y0, kz - sl - nl]))
    oy, oz = y0 + sh - 4.5, kz - sl + 3
    AUGEN[art] = (oy, oz, sb / 2 + 1)
    lid = m.knoch(f"lider{s}", [0, ky, kz], f"kopf{s}")
    for x in (sb / 2 + 1.1, -sb / 2 - 1.1):
        lid.kasten([x, oy - 1.5, oz - 2], [0, 3, 4], "lid")
    if hoerner == "klingen":
        # Drei flache Klingen je Seite, uebereinander geschichtet, schraeg nach
        # hinten und oben - wie auf Fynns Bild vom orangen Drachen.
        for seite, x in (("links", 1), ("rechts", -1)):
            # Sie setzen hinten auf dem Schaedel an und ragen weit ueber den
            # Nacken hinaus.
            hz0 = kz - 5
            h = m.knoch(f"horn{s}_{seite}", [x * (sb / 2 - 1.5), y0 + sh - 1, hz0], f"kopf{s}",
                        drehung=[24, -x * 14, 0])
            for j, (hoch, lang, dx) in enumerate(((4, 14, 0.0), (3, 11, -x * 1.5), (2, 8, -x * 3.0))):
                bx = x * (sb / 2 - 1.5) + dx
                h.kasten([bx - 0.5, y0 + sh - 1 - j * 1.5, hz0 + j], [1, hoch, lang], "horn")
            h.kasten([x * (sb / 2 - 1.5) - 0.5, y0 + sh + 1, hz0 + 13], [1, 2, 4], "horn",
                     drehung=[-25, 0, 0], drehpunkt=[x * (sb / 2 - 1.5), y0 + sh + 1, hz0 + 13])
        # Ein kurzer Kamm auf der Stirn.
        kopf.kasten([-0.5, y0 + sh, kz - sl + 1], [1, 2, 5], "klinge")
    elif hoerner == "sicheln":
        for seite, x in (("links", 1), ("rechts", -1)):
            h = m.knoch(f"horn{s}_{seite}", [x * (sb / 2 - 2), y0 + sh, kz - sl + 4], f"kopf{s}",
                        drehung=[30, -x * 18, 0])
            h.kasten([x * (sb / 2 - 2) - 1, y0 + sh - 1, kz - sl + 4], [2, 2, 8], "horn")
            h2 = m.knoch(f"hornspitze{s}_{seite}", [x * (sb / 2 - 2), y0 + sh, kz - sl + 12], f"horn{s}_{seite}",
                         drehung=[-40, 0, 0])
            h2.kasten([x * (sb / 2 - 2) - 0.5, y0 + sh - 0.5, kz - sl + 11], [1, 1, 8], "horn")
    elif hoerner == "stacheln":
        for i in range(5):
            for x in (1, -1):
                w = 20 + i * 14
                kopf.kasten([x * (sb / 2 - 0.5) - 0.5, y0 + sh - 1 - i * 1.5, kz - 3], [1, 1, 6 - i // 2], "horn",
                            drehung=[25 - i * 8, -x * w, 0], drehpunkt=[x * (sb / 2 - 0.5), y0 + sh - 1 - i * 1.5, kz - 3])
    return kopf


def kante(p, n, k):
    """Wie nah liegt der Bildpunkt an der oberen und unteren Kante seiner
    Seite (in Pixeln)? Fuer den hellen und dunklen Saum der Bloecke."""
    if k is None or abs(n[1]) > 0.5:
        return 9.0, 9.0
    oben = k.ursprung[1] + k.groesse[1] - p[1]
    unten = p[1] - k.ursprung[1]
    return oben, unten


def klotz_haut(f, saat=0):
    """Der Maler fuer Leib, Kopf und Beine.

    4.97 - Fynn: "was diesen Realismus bringt, sind diese dunklen Stellen
    beim Drachen, dass Schatten und Muskeln besser abgebildet werden ... ein
    schoener Uebergang von Bauch zu Oberkoerper." Darum:

    * Der Bauch geht in mehreren Stufen in die Flanke ueber, nicht mit
      einer harten Kante.
    * Jeder Block ist an seinen Enden dunkler (vorn, hinten, zu den Seiten
      des Rueckens) - so wirkt er rund statt flach.
    * Gleich ueber dem Bauch liegt ein Schattenband, wie unter einem
      Muskelwulst; unten an Schenkeln und Oberarmen ebenso.
    * Grosse dunkle Flecken, heller Saum oben, dunkler Saum unten."""
    bauch, leib, ruecken, fleck = f["bauch"], f["leib"], f["ruecken"], f.get("fleck", H.dunkler(f["leib"], 0.25))
    uebergang = [H.farbe(bauch), mische(H.farbe(bauch), H.farbe(leib), 0.35),
                 mische(H.farbe(bauch), H.farbe(leib), 0.7), H.farbe(leib)]

    def haut(p, n, texel, grenze=0.3, flecken=True):
        k = H.kasten_von(texel)
        t = H.hoehe(p, n, texel)
        if n[1] < -0.5:
            c = H.farbe(bauch)
            # Bauchschilde: Querbaender, jedes drei Pixel breit.
            if int(math.floor(p[2])) % 3 == 0:
                c = H.dunkler(c, 0.1)
            return c
        if n[1] <= 0.5 and t < grenze + 0.12 and grenze > 0:
            # Der Uebergang vom Bauch zur Flanke in vier Stufen.
            s_ = max(0.0, min(1.0, (t - (grenze - 0.2)) / 0.32))
            c = H.verlauf(uebergang, s_, 4)
            if s_ < 0.3 and int(math.floor(p[2])) % 3 == 0:
                c = H.dunkler(c, 0.08)
        else:
            c = H.verlauf([mische(H.farbe(bauch), H.farbe(leib), 0.75), leib, ruecken],
                          (t - grenze) / max(0.01, 1 - grenze), 5)
            if flecken and wolken(p, 4.0, saat) > 0.57:
                c = mische(c, H.farbe(fleck), 0.8)
        if n[1] <= 0.5 and grenze > 0 and grenze + 0.1 < t < grenze + 0.24:
            c = H.dunkler(c, 0.12)                           # Muskelschatten ueber dem Bauch
        if grenze == 0.0 and n[1] <= 0.5 and t < 0.3:
            c = H.dunkler(c, 0.1 + (0.3 - t) * 0.3)          # Schatten unten am Bein
        if k is not None and abs(n[1]) <= 0.5:
            # Rundung: zu den Enden des Blocks hin dunkler.
            achse = 2 if abs(n[0]) > 0.5 else 0
            rand = min(p[achse] - k.ursprung[achse], k.ursprung[achse] + k.groesse[achse] - p[achse])
            if k.groesse[achse] >= 5 and rand < 2.0:
                c = H.dunkler(c, 0.14 if rand < 1.0 else 0.07)
        oben, unten = kante(p, n, k)
        if oben < 1.0:
            c = H.heller(c, 0.12)
        elif unten < 1.0:
            c = H.dunkler(c, 0.18)
        if n[1] > 0.5 and k is not None:
            # Oben: die Mitte (Rueckgrat) etwas heller, die Seiten dunkler.
            rand = min(p[0] - k.ursprung[0], k.ursprung[0] + k.groesse[0] - p[0])
            if k.groesse[0] >= 6 and rand < 2.0:
                c = H.dunkler(c, 0.1 if rand < 1.0 else 0.05)
        return c
    return haut


def klotz_maler(art, f, schwinge=None, besonders=None, saat=0):
    """Der Maler der neuen Drachen. f: leib, ruecken, bauch, fleck, haut
    (Flughaut), hautfleck, augen, glut, horn (drei Toene), kralle, zunge."""
    haut = klotz_haut(f, saat)
    horn = f.get("horn", ("#3a2a22", "#8a6a4a", "#e8d8b0"))
    fluegel = (schwinge_maler(schwinge, f["haut"], f["ruecken"], zacken=f.get("zacken", 1.6),
                              flecken=f.get("hautfleck")) if schwinge else None)
    oy, oz, halb = AUGEN.get(art, (0, 0, 0))

    def male(stoff, p, n, texel):
        x, y, z = p
        if besonders:
            c = besonders(stoff, p, n, texel)
            if c is not False:
                return c
        if stoff.startswith("flughaut") and fluegel:
            return fluegel(stoff, p, n, texel)
        if stoff in ("leib", "bauch"):
            return haut(p, n, texel, grenze=1.1 if stoff == "bauch" else 0.22)
        if stoff == "bein":
            # Beine ohne hellen Bauch: nur unten an Fuss und Zehen ein Hauch.
            return haut(p, n, texel, grenze=0.0)
        if stoff == "brust":
            # Der helle Brustpanzer: Querplatten mit dunkler Fuge.
            c = H.farbe(f["bauch"])
            return H.dunkler(c, 0.18) if int(math.floor(y)) % 3 == 0 else H.heller(c, 0.05)
        if stoff in ("kopf", "schnauze"):
            if stoff == "kopf" and abs(n[0]) > 0.5 and abs(abs(x) - halb) < 0.6:
                # Das Auge: ein gelber Schlitz mit schwarzer Pupille, darueber
                # ein dunkler Schatten der Braue.
                if abs(y - oy) < 1.1 and abs(z - oz) < 1.6:
                    if abs(z - oz) < 0.45:
                        return hexfarbe("#120804")
                    return glut(f["augen"]) if abs(y - oy) < 0.6 else glut(H.dunkler(f["augen"], 0.3))
                if 1.1 <= y - oy < 2.1 and abs(z - oz) < 2.0:
                    return H.dunkler(f["ruecken"], 0.3)
            if stoff == "schnauze" and n[2] < -0.5 and H.hoehe(p, n, texel) > 0.55 and 1.0 < abs(x) < 2.6:
                return hexfarbe("#1a0a06")                                   # Nuestern
            if stoff == "schnauze" and n[1] < -0.5:
                return H.farbe(f.get("rachen", "#7a2a2a"))                   # Gaumen
            return haut(p, n, texel, grenze=0.25)
        if stoff == "glutader":
            return glutader(f)
        if stoff == "auge":
            # Gelbe Iris, eine senkrechte schwarze Schlitzpupille, oben der
            # Schatten der Braue, aussen ein dunkler Ring.
            k = H.kasten_von(texel)
            if abs(n[0]) > 0.5 and k is not None:
                lz = p[2] - k.ursprung[2]
                ly = p[1] - k.ursprung[1]
                if ly > k.groesse[1] - 1:
                    return H.dunkler(f["ruecken"], 0.35)
                if 1.5 <= lz < 2.5:
                    return hexfarbe("#0e0604")
                if lz < 0.7 or lz > k.groesse[2] - 0.7:
                    return H.dunkler(f["augen"], 0.45)
                return glut(f["augen"]) if ly > 0.8 else glut(H.dunkler(f["augen"], 0.2))
            return H.dunkler(f["ruecken"], 0.3)
        if stoff == "nuester":
            if n[1] > 0.5 or n[2] < -0.5:
                k = H.kasten_von(texel)
                if k is not None and abs(p[0] - (k.ursprung[0] + k.groesse[0] / 2)) < 0.6:
                    return hexfarbe("#140806")
            return H.dunkler(f["leib"], 0.1)
        if stoff == "muskel":
            # Die Kiefermuskeln: oben im Licht, unten tief im Schatten.
            t = H.hoehe(p, n, texel)
            return H.verlauf([H.dunkler(f["leib"], 0.3), H.dunkler(f["leib"], 0.12), f["leib"]], t, 3)
        if stoff == "kehle":
            return H.verlauf([f["bauch"], mische(H.farbe(f["bauch"]), H.farbe(f["leib"]), 0.5)],
                             H.hoehe(p, n, texel), 3)
        if stoff == "braue":
            return H.verlauf([f["ruecken"], H.dunkler(f["ruecken"], 0.2)], H.hoehe(p, n, texel), 2)
        if stoff == "kiefer":
            if n[1] > 0.5:
                return H.farbe(f.get("rachen", "#7a2a2a"))                   # Rachen
            return haut(p, n, texel, grenze=0.6)
        if stoff == "zunge":
            return H.verlauf([H.dunkler(f.get("zunge", "#d86a7a"), 0.15), f.get("zunge", "#d86a7a")],
                             1 - H.laenge(p, texel, 2), 3)
        if stoff == "zahn":
            return hexfarbe("#f4eedc") if n[1] > -0.5 else hexfarbe("#d8cfb8")
        if stoff == "lid":
            return H.farbe(f["ruecken"])
        if stoff == "klinge":
            return H.verlauf([H.dunkler(f["ruecken"], 0.15), f["ruecken"], mische(H.farbe(f["ruecken"]),
                              H.farbe(horn[2]), 0.45)], H.hoehe(p, n, texel), 3)
        if stoff == "horn":
            return H.verlauf(list(horn), H.laenge(p, texel, 2), 3)
        if stoff == "kralle":
            return H.farbe(f.get("kralle", "#1e1612"))
        if stoff in ("knochen", "fingerknochen"):
            # Die Fluegelknochen: dick, oben dunkler, unten heller.
            c = H.verlauf([H.dunkler(f["ruecken"], 0.1), f["leib"]], 1 - H.hoehe(p, n, texel), 3)
            oben, unten = kante(p, n, H.kasten_von(texel))
            return H.heller(c, 0.1) if oben < 1.0 else c
        if stoff == "sattel":
            k = H.kasten_von(texel)
            if k is not None and n[1] > 0.5 and (abs(x) > k.groesse[0] / 2 - 1 or
                                                 min(z - k.ursprung[2], k.ursprung[2] + k.groesse[2] - z) < 1):
                return hexfarbe("#b08850")
            return H.verlauf(["#4a2e1a", "#6a4226"], H.hoehe(p, n, texel), 2)
        if stoff == "gurt":
            return hexfarbe("#3a2414") if int(y) % 4 else hexfarbe("#a8a8b0")
        if stoff in ("decke", "metall"):
            return sattelzeug(stoff, p, n, texel)
        return haut(p, n, texel)
    return male


# ================================================================== Feuerdrache (4.96)

# Kraeftige Schwingen mit dicken Knochen: vier lange Finger, die Flughaut
# dazwischen am Rand gezackt, an jeder Fingerspitze eine Kralle.
# 4.97 - Fynn: "die Groesse der Fluegel ist ein bisschen groesser bei dem
# roten Drachen, der geflogen ist": laengere Arme und Finger, die Finger
# geknickt, die Hinterkante tiefer eingebuchtet.
FEUERDRACHE_SCHWINGE = Schwinge((9, 30, -8), oberarm=17, unterarm=22, finger=(64, 60, 52, 42),
                                winkel=(18, -12, -40, -68), hinterkante=(9, 20), dicke=(7, 5, 3),
                                biegung=12, bogen=6.0)


def fingerkrallen(m, s):
    """An jede Fingerspitze eine Kralle, die ueber die Flughaut hinausragt,
    am Ellbogen ein Dorn nach hinten, am Handgelenk eine grosse Daumenklaue."""
    hx, sy, sz = s.handgelenk
    for i in range(s.anzahl):
        if s.biegung:
            a = round(s.finger[i] * 0.66)
            m.finde(f"finger{i + 1}_links").kasten([hx + s.finger[i], sy - 0.5, sz - 0.5], [4, 1, 1], "kralle",
                                                   drehung=[0, -s.biegung, 0], drehpunkt=[hx + a, sy, sz])
        else:
            m.finde(f"finger{i + 1}_links").kasten([hx + s.finger[i], sy - 0.5, sz - 0.5], [4, 1, 1], "kralle")
    ex = s.ellbogen[0]
    m.finde("unterarm_links").kasten([ex - 0.5, sy + 1, sz], [1, 1, 5], "horn",
                                     drehung=[-25, 0, 0], drehpunkt=[ex, sy + 1, sz])
    h = m.finde("hand_links")
    h.kasten([hx - 1, sy - 1, sz - 6], [2, 2, 3], "kralle")
    h.kasten([hx - 0.5, sy - 2, sz - 8], [1, 2, 2], "kralle")


def feuerdrache_modell():
    """Der Feuerdrache (ersetzt den Lindwurm) nach Fynns roten und orangen
    Vorbildern: ein tonnenfoermiger Leib mit hellem Brustpanzer, ein dicker
    Hals aus vier Bloecken, ein kantiger Kopf mit Klingenhoernern, kraeftige
    Beine mit langen Zehen, grosse Schwingen, ein langer Schwanz mit
    Klingen und einer Speerspitze."""
    m = Modell("lindwurm", sichtbreite=11.0, sichthoehe=4.0)   # die Kennung bleibt: alte Welten behalten ihre Drachen
    MAEULER.pop("lindwurm", None)
    r = m.knoch("rumpf", [0, 22, 0])
    r.kasten([-9, 14, -14], [18, 17, 14], "leib")                       # Brust
    r.kasten([-7, 13, -15], [14, 13, 3], "brust")                       # Brustpanzer vorn
    r.kasten([-8, 15, -1], [16, 15, 10], "leib")                        # Mitte
    r.kasten([-7, 13.5, -13], [14, 1, 29], "bauch")                     # Bauchplatten
    r.kasten([-8.5, 23, -12], [17, 9, 10], "leib", aufblasen=0.2)       # Schulterbuckel
    for z, h in ((-10, 7), (-5, 8), (0, 8), (5, 7)):
        klinge(r, 0, 31, z, h, 5)
    for x in (1, -1):
        # Seitliche Reihe kleiner Klingen die Flanke entlang.
        for z in (-8, -2, 4):
            klinge(r, x * 8.5, 27, z, 3, 3, neigung=-40, seite=-x * 40)
    hals, ende = glieder(m, "hals", "rumpf", (0, 26, -14), -1,
                         [(7, 12, 12, 2.0), (7, 11, 11, 2.0), (7, 10, 10, 2.0), (6, 10, 10, 1.5), (6, 10, 10, 1.0)],
                         stoff="leib")
    klingen_reihe(m, hals, hoehe=(6, 4))
    _, ky, kz = ende
    kopf_klotz(m, "lindwurm", hals[-1], ky, kz, schaedel=(14, 11, 12), schnauze=(12, 7, 12), hoerner="klingen")
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 22, 17), 1,
                            [(8, 12, 11, -0.8), (8, 10, 9, -0.6), (8, 9, 8, -0.4), (8, 7, 7, -0.3),
                             (7, 6, 6, -0.2), (7, 5, 5, 0.0), (7, 4, 4, 0.0), (6, 3, 3, 0.0)], stoff="leib")
    klingen_reihe(m, schwanz, hoehe=(7, 3))
    _, sy, sz = ende
    spitze = m.finde(schwanz[-1])
    # Die Speerspitze: flach und breit, dahinter spitz.
    spitze.kasten([-4, sy - 0.5, sz - 1], [8, 1, 4], "klinge")
    spitze.kasten([-2.5, sy - 0.5, sz + 3], [5, 1, 3], "klinge")
    spitze.kasten([-1, sy - 0.5, sz + 6], [2, 1, 3], "klinge")
    for seite, x in (("links", 1), ("rechts", -1)):
        bein_klotz(m, f"bein_hinten_{seite}", "rumpf", (x * 8, 22, 12), (8, 10, 10), (6, 9, 6), (8, 3, 6),
                   zehen=4, zehlang=5)
        bein_klotz(m, f"bein_vorn_{seite}", "rumpf", (x * 8, 21, -9), (6, 9, 7), (5, 9, 5), (7, 3, 5),
                   zehen=4, zehlang=4)
    schwinge_bauen(m, FEUERDRACHE_SCHWINGE, zusatz=fingerkrallen)
    becken_abtrennen(m, 8, 22)
    sattel_bauen(m, "rumpf", 32, -3, 18)
    uralt_zier(m)
    sattelzone(m)
    return m


FEUERDRACHE_FARBEN = {
    # Wie Fynns rotes Vorbild: tiefes Rot mit dunklen Flecken, der Bauch
    # orange, die Flughaut rosa-rot mit dunkleren Flecken.
    "rot":    {"leib": "#c0302a", "ruecken": "#8a1a1e", "bauch": "#f0a048", "fleck": "#6e1218",
               "haut": "#e0706a", "hautfleck": "#a03040", "augen": "#ffd21a", "glut": "#ffb030",
               "horn": ("#3a1a14", "#7a3a2a", "#e8c8a0"), "kralle": "#1e1210", "zunge": "#e07a8a",
               "rachen": "#6a1a1e"},
    # Das orange Vorbild: Orange mit rostroten Flecken, cremefarbener Bauch.
    "orange": {"leib": "#e0702a", "ruecken": "#b0401e", "bauch": "#f8d0a0", "fleck": "#9a3218",
               "haut": "#f0a878", "hautfleck": "#c86a4a", "augen": "#ffe03a", "glut": "#ffc040",
               "horn": ("#5a1e14", "#a04a28", "#f0c890"), "kralle": "#2a1a12", "zunge": "#e88a9a",
               "rachen": "#7a2a24"},
    # Selten: schwarz wie Obsidian, mit gluehend roter Brust.
    "obsidian": {"leib": "#34303a", "ruecken": "#1a181e", "bauch": "#d0482a", "fleck": "#121016",
                 "haut": "#5a4a5a", "hautfleck": "#2a2030", "augen": "#ff7a1a", "glut": "#ff5a1a",
                 "horn": ("#121014", "#4a4450", "#b8b0c0"), "kralle": "#0a0808", "zunge": "#c06070",
                 "rachen": "#4a1418"},
}


def feuerdrache_maler(variante):
    f = FEUERDRACHE_FARBEN.get(variante, FEUERDRACHE_FARBEN["rot"])
    return klotz_maler("lindwurm", f, FEUERDRACHE_SCHWINGE, saat=3)


# ================================================================== Frostwyvern (4.96)

# Nach Fynns tuerkisem Vorbild: lange, duenne Knochenarme, eine blasse
# Flughaut, die zwischen den Fingern tief ausgefranst ist.
FROSTWYVERN_SCHWINGE = Schwinge((6.5, 23, -8), oberarm=14, unterarm=19, finger=(48, 44, 38, 30),
                                winkel=(14, -14, -42, -72), hinterkante=(6, 14), dicke=(3, 3, 2),
                                biegung=10, bogen=5.0)


def wyvernkrallen(m, s):
    """Fingerkrallen, und am Handgelenk die grosse Klaue, auf der er am
    Boden geht - dazu ein Eiskristall."""
    fingerkrallen(m, s)
    hx, sy, sz = s.handgelenk
    h = m.finde("hand_links")
    h.kasten([hx - 1, sy - 2, sz - 3], [2, 2, 3], "kralle")
    klinge(h, hx, sy + 1.5, sz + 1, 5, 2, neigung=-15, stoff="eiszacke")


def fangzaehne(m, art, s, kopfname, ky, kz, schaedel, schnauze):
    """Das riesige Maul des tuerkisen Vorbilds: ein Kranz langer Fangzaehne
    oben und unten, vorn die laengsten."""
    sb, sh, sl = schaedel
    nb, nh, nl = schnauze
    y0 = ky - 3
    kopf, kiefer = m.finde(f"kopf{s}"), m.finde(f"kiefer{s}")
    for i, z in enumerate(range(int(kz - sl - nl + 1), int(kz - sl + 1), 2)):
        lang = 3 if i < 2 else 2
        for x in (nb / 2 - 1, -nb / 2):
            kopf.kasten([x, y0 - lang, z], [1, lang, 1], "zahn")
            kiefer.kasten([x + (0.5 if x < 0 else -0.5), y0 - 3 + 3, z + 1], [1, lang, 1], "zahn")
    for x in range(int(-nb / 2 + 1), int(nb / 2 - 1), 2):
        kopf.kasten([x, y0 - 3, kz - sl - nl], [1, 3, 1], "zahn")


def frostwyvern_modell():
    """Der Frostwyvern nach Fynns tuerkisem Vorbild: schlank, nur zwei Beine,
    die Schwingen sind zugleich Vorderbeine. Ein kantiger Kopf mit einem
    riesigen Maul voller langer Zaehne und einem Kranz Knochendornen, ein
    langer duenner Hals, weisse Knochenstacheln den Ruecken entlang, ein
    langer Schwanz, der in einem Faecher aus Eiszacken endet."""
    m = Modell("frostwyvern", sichtbreite=9.0, sichthoehe=3.5)
    MAEULER.pop("frostwyvern", None)
    r = m.knoch("rumpf", [0, 18, 0])
    r.kasten([-6, 10, -11], [12, 12, 11], "leib")
    r.kasten([-5, 9.5, -12], [10, 9, 2], "brust")
    r.kasten([-5.5, 10.5, -1], [11, 11, 9], "leib")
    r.kasten([-5, 11, 7], [10, 10, 7], "leib")
    r.kasten([-4.5, 9.5, -10], [9, 1, 23], "bauch")
    for z, h in ((-9, 6), (-5, 7), (-1, 7), (3, 6), (7, 5), (11, 4)):
        klinge(r, 0, 22 if z < 6 else 21, z, h, 3, neigung=-35, stoff="knochenstachel")
    hals, ende = glieder(m, "hals", "rumpf", (0, 20, -11), -1,
                         [(6, 8, 8, 2.0), (6, 7, 7, 2.0), (6, 7, 7, 1.5), (5, 7, 7, 1.0), (5, 7, 7, 0.5)],
                         stoff="leib")
    klingen_reihe(m, hals, stoff="knochenstachel", hoehe=(4, 3), neigung=-40)
    _, ky, kz = ende
    schaedel, schnauze = (11, 9, 9), (10, 6, 10)
    kopf_klotz(m, "frostwyvern", hals[-1], ky, kz, schaedel=schaedel, schnauze=schnauze, hoerner="stacheln",
               zaehne=False)
    fangzaehne(m, "frostwyvern", "", "kopf", ky, kz, schaedel, schnauze)
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 17, 14), 1,
                            [(8, 9, 8, -0.4), (8, 7, 6, -0.3), (8, 6, 5, -0.2), (8, 5, 4, 0.0),
                             (8, 4, 4, 0.0), (8, 3, 3, 0.0), (8, 3, 3, 0.0), (7, 2, 2, 0.0)], stoff="leib")
    klingen_reihe(m, schwanz, stoff="knochenstachel", hoehe=(5, 2), neigung=-40)
    _, sy, sz = ende
    letztes = m.finde(schwanz[-1])
    for w in (-45, -20, 0, 20, 45):
        letztes.kasten([-0.5, sy - 0.5, sz - 1], [1, 1, 8 if w == 0 else 6], "eiszacke", drehung=[0, w, 0],
                       drehpunkt=[0, sy, sz - 1])
    for seite, x in (("links", 1), ("rechts", -1)):
        bein_klotz(m, f"bein_hinten_{seite}", "rumpf", (x * 5.5, 18, 9), (6, 8, 8), (4, 7, 4), (6, 3, 5),
                   zehen=3, zehlang=4)
    schwinge_bauen(m, FROSTWYVERN_SCHWINGE, zusatz=wyvernkrallen)
    becken_abtrennen(m, 7, 17)
    sattel_bauen(m, "rumpf", 22, -3, 12)
    uralt_zier(m)
    sattelzone(m)
    return m


FROSTWYVERN_FARBEN = {
    # Tuerkis mit dunkleren Flecken, blasse Knochenhaut, weisse Stacheln.
    "eis":       {"leib": "#5aa898", "ruecken": "#2e6e66", "bauch": "#dcece4", "fleck": "#3a827a",
                  "haut": "#e4e8d8", "hautfleck": "#b8c8bc", "augen": "#8af0ff", "glut": "#c0f4ff",
                  "horn": ("#b8c0b0", "#e0e4d4", "#fbfbf2"), "kralle": "#1e3a3a", "zunge": "#5a8a9a",
                  "rachen": "#1a2e36", "zacken": 2.2},
    "gletscher": {"leib": "#c8dce8", "ruecken": "#7aa0c0", "bauch": "#f4fafc", "fleck": "#9ab8d0",
                  "haut": "#eef4f8", "hautfleck": "#c4d4e2", "augen": "#5ad8ff", "glut": "#c8f4ff",
                  "horn": ("#8ab0c8", "#d0e4f0", "#ffffff"), "kralle": "#1e3a58", "zunge": "#6a8aaa",
                  "rachen": "#1a2a3e", "zacken": 2.2},
    "nacht":     {"leib": "#3a4a7a", "ruecken": "#1a2244", "bauch": "#a0b4de", "fleck": "#242e58",
                  "haut": "#8a9ac8", "hautfleck": "#5a6aa0", "augen": "#9ad8ff", "glut": "#b8e4ff",
                  "horn": ("#6a7aa8", "#b8c4e4", "#eef2ff"), "kralle": "#0e1428", "zunge": "#5a5a8a",
                  "rachen": "#10142a", "zacken": 2.2},
}


def frostwyvern_maler(variante):
    f = FROSTWYVERN_FARBEN.get(variante, FROSTWYVERN_FARBEN["eis"])

    def besonders(stoff, p, n, texel):
        if stoff == "knochenstachel":
            return H.verlauf(list(f["horn"]), H.hoehe(p, n, texel), 3)
        if stoff == "eiszacke":
            return glut(H.verlauf([H.dunkler(f["glut"], 0.35), f["glut"], "#ffffff"],
                                  H.hoehe(p, n, texel) if abs(n[1]) < 0.5 else (1.0 if n[1] > 0 else 0.3), 3))
        return False
    return klotz_maler("frostwyvern", f, FROSTWYVERN_SCHWINGE, besonders, saat=7)


# ================================================================== Nachtschwinge (4.96)

# Nach Fynns schwarzem Vorbild: keine Flughaut, sondern Sicheln - jeder
# Finger ist eine gebogene Klinge.
NACHTSCHWINGE_SCHWINGE = Schwinge((7, 24, -7), oberarm=13, unterarm=16, finger=(40, 36, 30, 24),
                                  winkel=(8, -20, -48, -78), hinterkante=(7, 15), dicke=(4, 3, 3))
# 4.97 - Fynn: "bei dem schwarzen Drachen, dass er vier Fluegel hat, das
# fand ich sehr cool." Das zweite Paar sitzt hinter dem ersten, ueber der
# Huefte, kleiner und flacher gewinkelt.
NACHTSCHWINGE_HINTEN = Schwinge((6, 22, 5), oberarm=10, unterarm=12, finger=(30, 26, 21),
                                winkel=(-4, -32, -62), hinterkante=(6, 14), dicke=(3, 3, 2))


def sichelschwinge_bauen(m, s, eltern="rumpf", vor=""):
    """Die Sichelschwinge: Oberarm, Unterarm, Hand wie sonst, dann je Finger
    eine Sichel aus drei Stuecken, jedes weiter nach hinten gebogen, und
    darunter ein flaches Blatt, das zur Spitze schmal wird. Die Knochen
    heissen wie bei einer Schwinge mit Haut - so falten die Bewegungen sie
    genauso. vor: Vorsilbe fuer ein zweites Paar (hfluegel_links ...)."""
    sx, sy, sz = s.schulter
    ex, _, _ = s.ellbogen
    hx, _, hz = s.handgelenk
    d0, d1, d2 = s.dicke
    arm = m.knoch(f"{vor}fluegel_links", [sx, sy, sz], eltern)
    arm.kasten([sx, sy - d0 / 2, sz - d0 / 2], [s.oberarm, d0, d0], "knochen")
    klinge(arm, sx + s.oberarm * 0.6, sy + d0 / 2, sz, 3, 3, neigung=-40)
    unter = m.knoch(f"{vor}unterarm_links", [ex, sy, sz], f"{vor}fluegel_links")
    unter.kasten([ex, sy - d1 / 2, sz - d1 / 2], [s.unterarm, d1, d1], "knochen")
    klinge(unter, ex + s.unterarm * 0.5, sy + d1 / 2, sz, 3, 3, neigung=-40)
    hand = m.knoch(f"{vor}hand_links", [hx, sy, sz], f"{vor}unterarm_links")
    hand.kasten([hx - 2, sy - 2, sz - 2], [4, 4, 4], "knochen")
    hand.kasten([hx - 0.5, sy - 1, sz - 6], [1, 2, 4], "kralle")
    for i in range(s.anzahl):
        f = m.knoch(f"{vor}finger{i + 1}_links", [hx, sy, sz], f"{vor}hand_links", drehung=[0, s.winkel[i], 0])
        L = s.finger[i]
        a, b, c = round(L * 0.55), round(L * 0.3), round(L * 0.22)
        st = d2
        f.kasten([hx, sy - st / 2, sz - st / 2], [a, st, st], "fingerknochen")
        f.kasten([hx + 2, sy - 0.01, sz], [a - 2, 0, 6], "sichel")
        # Das zweite Stueck biegt 28 Grad nach hinten, das dritte noch 30 mehr.
        p1 = (hx + a, sz)
        f.kasten([p1[0], sy - (st - 1) / 2, p1[1] - (st - 1) / 2], [b, st - 1, st - 1], "fingerknochen",
                 drehung=[0, -28, 0], drehpunkt=[p1[0], sy, p1[1]])
        f.kasten([p1[0], sy - 0.01, p1[1]], [b, 0, 5], "sichel", drehung=[0, -28, 0], drehpunkt=[p1[0], sy, p1[1]])
        w = math.radians(28)
        p2 = (p1[0] + b * math.cos(w), p1[1] + b * math.sin(w))
        f.kasten([p2[0], sy - 0.5, p2[1] - 0.5], [c, 1, 1], "kralle", drehung=[0, -58, 0], drehpunkt=[p2[0], sy, p2[1]])
        f.kasten([p2[0], sy - 0.01, p2[1]], [c, 0, 3], "sichel", drehung=[0, -58, 0], drehpunkt=[p2[0], sy, p2[1]])
    from drachen_gestalt import spiegel_knochen, rechts
    spiegel_knochen(m, f"{vor}fluegel_links", None, rechts)


def nachtschwinge_modell():
    """Die Nachtschwinge nach Fynns schwarzem Vorbild: schlank und lang,
    schwarz mit graublauen Flecken, ein schmaler Kopf mit zwei langen,
    gebogenen Hoernern nach hinten, Stacheln den Ruecken entlang, Sicheln
    statt Flughaut - und am Schwanzende zwei Flossen zum Steuern."""
    m = Modell("nachtschwinge", sichtbreite=10.0, sichthoehe=3.5)
    MAEULER.pop("nachtschwinge", None)
    r = m.knoch("rumpf", [0, 19, 0])
    r.kasten([-6, 11, -11], [12, 12, 11], "leib")
    r.kasten([-5, 11.5, -1], [10, 10, 9], "leib")
    r.kasten([-5, 12, 7], [10, 9, 7], "leib")
    r.kasten([-4.5, 10.5, -10], [9, 1, 23], "bauch")
    for z, h in ((-9, 5), (-5, 6), (-1, 6), (3, 5), (7, 4), (11, 4)):
        klinge(r, 0, 23 if z < 6 else 21, z, h, 3, neigung=-40)
    hals, ende = glieder(m, "hals", "rumpf", (0, 21, -11), -1,
                         [(6, 8, 8, 2.0), (6, 7, 7, 1.5), (6, 7, 7, 1.5), (5, 6, 6, 1.0), (5, 6, 6, 0.5)],
                         stoff="leib")
    klingen_reihe(m, hals, hoehe=(4, 3), neigung=-40)
    _, ky, kz = ende
    kopf_klotz(m, "nachtschwinge", hals[-1], ky, kz, schaedel=(10, 8, 10), schnauze=(8, 5, 9), hoerner="sicheln")
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 18, 14), 1,
                            [(8, 8, 8, -0.4), (8, 7, 6, -0.3), (8, 6, 5, -0.2), (8, 5, 4, 0.0),
                             (8, 4, 4, 0.0), (8, 3, 3, 0.0), (8, 3, 3, 0.0), (7, 2, 2, 0.0)], stoff="leib")
    klingen_reihe(m, schwanz, hoehe=(4, 2), neigung=-40)
    _, sy, sz = ende
    # Zwei Schwanzflossen, schraeg nach aussen - wie Ruder.
    ende_k = m.finde(schwanz[-1])
    for x in (1, -1):
        ende_k.kasten([x * 1 - (0 if x > 0 else 7), sy - 0.5, sz - 5], [7, 0, 6], "sichel",
                      drehung=[0, -x * 20, 0], drehpunkt=[x, sy, sz - 5])
    for seite, x in (("links", 1), ("rechts", -1)):
        bein_klotz(m, f"bein_hinten_{seite}", "rumpf", (x * 5.5, 19, 9), (6, 9, 7), (4, 7, 4), (6, 3, 5),
                   zehen=3, zehlang=4)
        bein_klotz(m, f"bein_vorn_{seite}", "rumpf", (x * 5.5, 18, -8), (5, 8, 5), (4, 7, 4), (5, 3, 4),
                   zehen=3, zehlang=3)
    sichelschwinge_bauen(m, NACHTSCHWINGE_SCHWINGE)
    sichelschwinge_bauen(m, NACHTSCHWINGE_HINTEN, vor="h")
    becken_abtrennen(m, 7, 17)
    sattel_bauen(m, "rumpf", 23, -3, 12)
    uralt_zier(m)
    sattelzone(m)
    return m


NACHTSCHWINGE_FARBEN = {
    # Wie das Vorbild: fast schwarz mit graublauen Flecken, gruene Augen.
    "nacht":  {"leib": "#26262e", "ruecken": "#121216", "bauch": "#3a3a46", "fleck": "#4a5874",
               "haut": "#2a2a34", "augen": "#8aff5a", "glut": "#b87aff",
               "horn": ("#141418", "#4a4a58", "#a8aabc"), "kralle": "#0a0a0e", "zunge": "#8a4a6a",
               "rachen": "#2a1424"},
    "sturm":  {"leib": "#2e3a4e", "ruecken": "#161e2c", "bauch": "#56647e", "fleck": "#6a82a6",
               "haut": "#34405a", "augen": "#5ae8ff", "glut": "#7ab8ff",
               "horn": ("#141a24", "#4a5670", "#b8c8e0"), "kralle": "#0a0e14", "zunge": "#6a4a7a",
               "rachen": "#1a1428"},
    "blut":   {"leib": "#2a1e22", "ruecken": "#140c0e", "bauch": "#5a2226", "fleck": "#7a2a30",
               "haut": "#301e22", "augen": "#ff3a2a", "glut": "#ff4a6a",
               "horn": ("#140a0c", "#4a2a2e", "#c8a0a4"), "kralle": "#0a0606", "zunge": "#8a3a4a",
               "rachen": "#2a0a10"},
}


def nachtschwinge_maler(variante):
    f = NACHTSCHWINGE_FARBEN.get(variante, NACHTSCHWINGE_FARBEN["nacht"])

    def besonders(stoff, p, n, texel):
        if stoff == "sichel":
            # Das Blatt der Sichel: zur Spitze hin schmal, am Rand hell.
            t, tief = H.laenge(p, texel, 0), H.laenge(p, texel, 2)
            k = H.kasten_von(texel)
            if k is not None and k.ursprung[0] < 0:
                t = 1 - t
            grenze = 1.0 - t * 0.85
            if tief > grenze:
                return None
            c = H.farbe(f["leib"])
            if wolken(p, 3.0, 5) > 0.58:
                c = mische(c, H.farbe(f["fleck"]), 0.7)
            if grenze - tief < 0.18:
                c = H.heller(c, 0.18)
            return c
        return False
    return klotz_maler("nachtschwinge", f, None, besonders, saat=13)


# ================================================================== Uralte Drachen (4.97)

def uralt_zier(m, koepfe=("kopf",)):
    """Was nur ein uralter Drache hat (4.97, und 4.98 - Fynn: "die uralten
    Versionen sollten ausergewoehnlicher sein ... deutlich groesser, mehr
    Stacheln, sollen gefaehrlicher aussehen, groessere Geweihe"):

    * ein maechtiges Geweih: zwei Stangen, die sich nach hinten und oben
      biegen, jede mit drei Enden;
    * eine Krone aus Klingen um den Hinterkopf, Dornen an Kinn und Wangen;
    * auf jedem Halsglied, jedem Schwanzglied und entlang des Rueckens hohe
      Klingen, dazu seitliche Dornenreihen;
    * Dornen an Ellbogen und Knien, an der Vorderkante der Schwingen;
    * gluehende Adern an Schaedel und Flanken.

    Alle Knochen heissen uralt_... und sind nur zu sehen, wenn fynn:uralt
    gesetzt ist (Sichtbarkeit im Aussehen)."""
    import re

    def zier(eltern):
        k = m.finde(eltern)
        return k, m.knoch(f"uralt_{eltern}", list(k.drehpunkt), eltern)

    def dorn(z, x, y, zz, lang, w_seite, w_neig=-30):
        z.kasten([x - 0.5, y - 0.5, zz - 0.5], [1, 1, lang], "horn",
                 drehung=[w_neig, w_seite, 0], drehpunkt=[x, y, zz])

    for kn in koepfe:
        k, z = zier(kn)
        c = k.kaesten[0]
        x0, y0, z0 = c.ursprung
        b, h, l = c.groesse
        oben = y0 + h
        # Die Krone: fuenf Klingen im Halbkreis um den Hinterkopf.
        for i, w in enumerate((-60, -30, 0, 30, 60)):
            klinge(z, x0 + b / 2, oben - 1, z0 + l - 2, 8 - abs(i - 2), 4, neigung=-45, seite=w)
        for seite, x in (("links", 1), ("rechts", -1)):
            rand = x0 + b / 2 + x * b / 2
            # Wangendornen, drei uebereinander, nach hinten und aussen.
            for j in range(3):
                dorn(z, rand, y0 + 1 + j * 2, z0 + l - 3, 5 - j, -x * (35 + j * 10))
            # Kinndornen unter dem Schaedel.
            dorn(z, x0 + b / 2 + x * 2, y0 + 0.5, z0 + 2, 4, -x * 15, 35)
            # Gluehende Adern.
            z.kasten([rand + x * 0.05 - (0 if x > 0 else 0), y0 + 2, z0 + 1], [0, 1, l - 2], "glutader")
            z.kasten([rand + x * 0.05, y0 + 3, z0 + l - 4], [0, 3, 1], "glutader")
            # Das Geweih: eine Stange, die sich zweimal nach oben biegt, mit
            # drei Enden.
            gx, gy, gz = x0 + b / 2 + x * (b / 2 - 1.5), oben - 0.5, z0 + l - 3
            g1 = m.knoch(f"uralt_geweih{kn[4:]}_{seite}", [gx, gy, gz], f"uralt_{kn}", drehung=[28, -x * 28, 0])
            g1.kasten([gx - 1.5, gy - 1.5, gz], [3, 3, 15], "horn")
            g1.kasten([gx - 0.5, gy, gz + 5], [1, 7, 1], "horn", drehung=[-20, 0, 0], drehpunkt=[gx, gy + 1, gz + 5.5])
            g1.kasten([gx - 0.5, gy, gz + 10], [1, 5, 1], "horn", drehung=[-10, 0, -x * 25], drehpunkt=[gx, gy + 1, gz + 10.5])
            g2 = m.knoch(f"uralt_geweih{kn[4:]}2_{seite}", [gx, gy, gz + 15], f"uralt_geweih{kn[4:]}_{seite}",
                         drehung=[-35, -x * 10, 0])
            g2.kasten([gx - 1, gy - 1, gz + 14.5], [2, 2, 11], "horn")
            g2.kasten([gx - 0.5, gy, gz + 20], [1, 6, 1], "horn", drehung=[-15, 0, -x * 15],
                      drehpunkt=[gx, gy + 1, gz + 20.5])
            g2.kasten([gx - 0.5, gy - 0.5, gz + 24], [1, 1, 7], "horn", drehung=[-25, 0, 0], drehpunkt=[gx, gy, gz + 24])
    # Hohe Klingen und seitliche Dornen auf Hals und Schwanz.
    for kn in [k.name for k in m.knochen]:
        treffer = re.match(r"^(hals.*?)(\d+)$|^(schwanz)(\d+)$", kn)
        if not treffer or kn.startswith("uralt_"):
            continue
        nr = int(treffer.group(2) or treffer.group(4))
        if kn.startswith("schwanz") and len([k for k in m.knochen if k.name.startswith("schwanz")]) > 12 and nr % 2:
            continue
        k, z = zier(kn)
        c = k.kaesten[0]
        x0, y0, z0 = c.ursprung
        b, h, l = c.groesse
        klinge(z, x0 + b / 2, y0 + h - 0.5, z0 + l / 2, max(3, round(h * 0.9)), max(2, l - 2), neigung=-35)
        for x in (1, -1):
            dorn(z, x0 + b / 2 + x * b / 2, y0 + h * 0.7, z0 + l / 2, max(2, round(h * 0.45)), -x * 55, -25)
    r, z = zier("rumpf")
    c = r.kaesten[0]
    x0, y0, z0 = c.ursprung
    b, h, l = c.groesse
    for i in range(5):
        klinge(z, 0, y0 + h - 1, z0 + 1 + i * 5, 12 - i, 4, neigung=-35)
    for x in (x0 - 0.05, x0 + b + 0.05):
        z.kasten([x, y0 + h * 0.55, z0 + 1], [0, 1, l + 12], "glutader")
        z.kasten([x, y0 + h * 0.35, z0 + 3], [0, 1, l + 6], "glutader")
    for x in (1, -1):
        # Zwei Reihen Dornen die Flanken entlang.
        for j in range(5):
            dorn(z, x0 + b / 2 + x * b / 2, y0 + h * 0.8, z0 + 1 + j * 5, 4, -x * 60, -20)
            dorn(z, x0 + b / 2 + x * b / 2, y0 + h * 0.55, z0 + 3 + j * 5, 3, -x * 70, -10)
    # Dornen an Ellbogen, Knien und an der Vorderkante der Schwingen.
    for kn in [k.name for k in m.knochen]:
        if re.match(r"^bein_(vorn|hinten)_(links|rechts)$", kn):
            k, z = zier(kn)
            c = k.kaesten[0]
            x = 1 if kn.endswith("links") else -1
            dorn(z, c.ursprung[0] + c.groesse[0] / 2, c.ursprung[1] + 1, c.ursprung[2] + c.groesse[2], 4, 0, -40)
            dorn(z, c.ursprung[0] + c.groesse[0] / 2 + x * c.groesse[0] / 2, c.ursprung[1] + c.groesse[1] * 0.6,
                 c.ursprung[2] + c.groesse[2] / 2, 3, -x * 60, -20)
        elif re.match(r"^h?(fluegel|unterarm)_(links|rechts)$", kn):
            k, z = zier(kn)
            c = k.kaesten[0]
            for j in range(3):
                t = (j + 0.5) / 3
                x_ = c.ursprung[0] + c.groesse[0] * t
                dorn(z, x_, c.ursprung[1] + c.groesse[1], c.ursprung[2] + 0.5, 4, 0, -150)
    return [k.name for k in m.knochen if k.name.startswith("uralt_")]


def glutader(f):
    """Die gluehenden Adern der Uralten: in der Farbe ihres Atems."""
    return glut(f.get("glut", "#ffb030"), 0.1)


# ================================================================== Sattel und Stacheln (4.99)

STACHELSTOFFE = ("klinge", "stachel", "knochenstachel", "maehne", "eiszacke", "horn")


def sattelzone(m):
    """Fynn: "Die Stacheln vom Ruecken gehen manchmal durch den Sattel, das
    sieht scheisse aus." Die Rueckenstacheln, die dort stehen, wo der Sattel
    liegt, kommen auf eigene Knochen (stachel_sattel, beim Uralten
    uralt_sattel). Die blendet das Aussehen aus, sobald er gesattelt ist -
    wie ein Reiter, der die Stacheln unter dem Sattel flachdrueckt."""
    sattel = m.finde("sattel").kaesten[0]
    z_von, z_bis = sattel.ursprung[2] - 3, sattel.ursprung[2] + sattel.groesse[2] + 3
    unten = sattel.ursprung[1] - 4
    for quelle, ziel in (("rumpf", "stachel_sattel"), ("uralt_rumpf", "uralt_sattel")):
        try:
            k = m.finde(quelle)
        except StopIteration:
            continue
        neu = m.knoch(ziel, list(k.drehpunkt), quelle)
        bleibt = []
        for c in k.kaesten:
            z = (c.drehpunkt or [0, 0, c.ursprung[2] + c.groesse[2] / 2])[2]
            y = c.ursprung[1]
            if c.stoff in STACHELSTOFFE and z_von <= z <= z_bis and y >= unten:
                neu.kaesten.append(c)
            else:
                bleibt.append(c)
        k.kaesten = bleibt


# ================================================================== Giftdrache (4.99)

# Nach Fynns zweikoepfigem Vorbild: breite, gefleckte Schwingen.
GIFTDRACHE_SCHWINGE = Schwinge((7.5, 24, -6), oberarm=14, unterarm=17, finger=(48, 44, 38, 30),
                               winkel=(14, -12, -38, -66), hinterkante=(7, 16), dicke=(5, 4, 2),
                               biegung=10, bogen=5.0)


def kragen(m, s, sb, ky, kz):
    """Der Halskragen (wie bei der Kragenechse): zwei Haeute, im Ruhen nach
    hinten an den Hals gelegt; beim Giftspeien und Bruellen klappt er auf
    (kragen_a_links ... in den Bewegungen)."""
    for seite, x in (("links", 1), ("rechts", -1)):
        kr = m.knoch(f"kragen{s}_{seite}", [x * sb / 2, ky + 1, kz - 1], f"kopf{s}", drehung=[0, -x * 70, 0])
        kr.kasten([x * sb / 2 - (0 if x > 0 else 7), ky - 4, kz - 1], [7, 10, 0], "kragen")
        for dy, w in ((5, 30), (1, 0), (-3, -30)):
            kr.kasten([x * sb / 2 - (0 if x > 0 else 7), ky + 1 + dy * 0.8, kz - 1.5], [7, 1, 1], "stachel",
                      drehung=[0, 0, x * w * 0.6], drehpunkt=[x * sb / 2, ky + 1, kz - 1])


def giftdrache_modell():
    """Der Giftdrache nach Fynns zweikoepfigem Vorbild: ein breiter Leib, aus
    dessen Brust zwei lange Haelse wachsen, jeder mit einer Reihe roter
    Stacheln und einem flachen, kantigen Kopf mit Hoernern und einem
    Kragen. Breite, gefleckte Schwingen; am Schwanz eine Stachelkeule."""
    m = Modell("giftdrache", sichtbreite=9.0, sichthoehe=3.2)
    MAEULER.pop("giftdrache", None)
    r = m.knoch("rumpf", [0, 18, 0])
    r.kasten([-8, 10, -11], [16, 14, 11], "leib")                       # Brust: breit fuer zwei Haelse
    r.kasten([-7, 9.5, -12], [14, 10, 2], "brust")
    r.kasten([-7, 10.5, -1], [14, 12, 10], "leib")
    r.kasten([-6, 11, 8], [12, 10, 7], "leib")
    r.kasten([-6, 9.5, -10], [12, 1, 23], "bauch")
    for z, h in ((-7, 5), (-2, 6), (3, 6), (8, 5), (12, 4)):
        klinge(r, 0, 22 if z < 6 else 21, z, h, 4, neigung=-35, stoff="stachel")
    for sfx, x, w in (("_a", 4.5, -22), ("_b", -4.5, 22)):
        hals, ende = glieder(m, f"hals{sfx}", "rumpf", (0, 20, -11), -1,
                             [(6, 7, 7, 1.5), (6, 7, 7, 1.5), (6, 6, 6, 1.0), (6, 6, 6, 0.5), (5, 6, 6, 0.5)],
                             stoff="leib", drehung=[0, w, 0])
        klingen_reihe(m, hals, stoff="stachel", hoehe=(4, 3), neigung=-40)
        vorher = {k.name for k in m.knochen}
        _, ky, kz = ende
        sb = 8
        kopf_klotz(m, "giftdrache", hals[-1], ky, kz, schaedel=(sb, 7, 8), schnauze=(7, 5, 8),
                   hoerner="sicheln" if sfx == "_a" else "stacheln", s=sfx)
        kragen(m, sfx, sb, ky, kz)
        from drachen_gestalt import verschiebe
        verschiebe(m, [k.name for k in m.knochen if k.name not in vorher] + hals, x)
    # Die Maeuler liegen seitlich: MAEULER hat sie noch in der Mitte.
    MAEULER["giftdrache"] = [(k, [o[0] + (4.5 if k.endswith("_a") else -4.5), o[1], o[2]])
                             for k, o in MAEULER["giftdrache"]]
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 17.5, 15), 1,
                            [(8, 9, 8, -0.5), (8, 7, 6, -0.4), (8, 6, 5, -0.2), (8, 5, 4, 0.0),
                             (8, 4, 4, 0.0), (8, 3, 3, 0.0), (7, 3, 3, 0.0)], stoff="leib")
    klingen_reihe(m, schwanz, stoff="stachel", hoehe=(5, 2), neigung=-40)
    _, sy, sz = ende
    keule = m.finde(schwanz[-1])
    # Kein Pfeil, eine Keule: ein Knoten mit Stacheln rundum.
    keule.kasten([-2.5, sy - 2.5, sz - 3], [5, 5, 6], "leib")
    for wx, wz in ((0, 0), (0, 60), (0, -60), (90, 0), (-90, 0), (0, 180), (40, 90), (40, -90)):
        keule.kasten([-0.5, sy + 2, sz - 0.5], [1, 4, 1], "stachel", drehung=[wx, 0, wz], drehpunkt=[0, sy, sz])
    for seite, x in (("links", 1), ("rechts", -1)):
        bein_klotz(m, f"bein_hinten_{seite}", "rumpf", (x * 6.5, 18, 10), (7, 8, 8), (5, 7, 5), (7, 3, 5),
                   zehen=3, zehlang=4)
        bein_klotz(m, f"bein_vorn_{seite}", "rumpf", (x * 6.5, 17, -8), (6, 7, 6), (4, 7, 4), (6, 3, 4),
                   zehen=3, zehlang=4)
    schwinge_bauen(m, GIFTDRACHE_SCHWINGE, zusatz=fingerkrallen)
    becken_abtrennen(m, 8, 17)
    sattel_bauen(m, "rumpf", 24, -2, 16)
    uralt_zier(m, ("kopf_a", "kopf_b"))
    sattelzone(m)
    return m


GIFTDRACHE_FARBEN = {
    # Wie das Vorbild: gruen mit dunkleren Flecken, ein gelber Bauch, rote
    # Stacheln, gefleckte gruen-gelbe Schwingen.
    "sumpf": {"leib": "#5e9a3a", "ruecken": "#2e5a22", "bauch": "#f0c84a", "fleck": "#3e7428",
              "haut": "#a8c048", "hautfleck": "#5a8a2a", "augen": "#ffe23a", "glut": "#b8ff3a",
              "horn": ("#6a5a30", "#b8a068", "#f0e0b0"), "kralle": "#1a1a10", "zunge": "#d86a7a",
              "rachen": "#4a1a1e", "stachel": "#c83a2a", "zacken": 1.8},
    "moor":  {"leib": "#7a6a3a", "ruecken": "#3e3218", "bauch": "#e0b060", "fleck": "#56482a",
              "haut": "#b89a58", "hautfleck": "#7a5a2a", "augen": "#ffb030", "glut": "#ffd040",
              "horn": ("#3a2a14", "#7a5a30", "#c8a870"), "kralle": "#1a140c", "zunge": "#c86a6a",
              "rachen": "#3a1a14", "stachel": "#8a2a1a", "zacken": 1.8},
    "gift":  {"leib": "#8ac030", "ruecken": "#1e2418", "bauch": "#e8f090", "fleck": "#2a3a1a",
              "haut": "#b8e048", "hautfleck": "#3a4a20", "augen": "#ff3aff", "glut": "#d0ff40",
              "horn": ("#1a1a1a", "#4a4a4a", "#8a8a8a"), "kralle": "#101010", "zunge": "#b04ab0",
              "rachen": "#2a0a2a", "stachel": "#d02aa0", "zacken": 1.8},
}


def giftdrache_maler(variante):
    f = GIFTDRACHE_FARBEN.get(variante, GIFTDRACHE_FARBEN["sumpf"])

    def besonders(stoff, p, n, texel):
        if stoff == "stachel":
            # Rote Stacheln: am Ansatz dunkel, zur Spitze heller.
            return H.verlauf([H.dunkler(f["stachel"], 0.3), f["stachel"], H.heller(f["stachel"], 0.25)],
                             H.hoehe(p, n, texel) if abs(n[1]) < 0.5 else 0.7, 3)
        if stoff == "kragen":
            k = H.kasten_von(texel)
            if k is None:
                return H.farbe(f["haut"])
            mx = k.ursprung[0] + (0 if k.ursprung[0] >= 0 else k.groesse[0])
            t = min(1.0, abs(p[0] - mx) / max(1, k.groesse[0]))
            c = H.verlauf([H.dunkler(f["haut"], 0.2), f["haut"], f["glut"]], t, 4)
            return H.dunkler(c, 0.2) if int(p[1] // 2) % 2 == 0 and t < 0.8 else c
        return False
    return klotz_maler("giftdrache", f, GIFTDRACHE_SCHWINGE, besonders, saat=21)


# ================================================================== Schlunddrache (5.00)

# Nach Fynns tuerkisem Vorbild aus dem Bild mit den drei Drachen: lange,
# duenne Knochenschwingen mit blasser Haut.
SCHLUNDDRACHE_SCHWINGE = Schwinge((7, 26, -7), oberarm=16, unterarm=20, finger=(52, 48, 42, 34),
                                  winkel=(14, -12, -40, -68), hinterkante=(7, 16), dicke=(3, 3, 2),
                                  biegung=12, bogen=6.0)


def schlund_kopf(m, eltern, ky, kz):
    """Der Kopf, um den es geht (Fynn: "der so einen grossen Kopf hat"):
    ein riesiger Kasten, fast so breit wie die Brust, und vorn ein Schlund,
    der immer ein Stueck offen steht - ringsum lange Fangzaehne oben und
    unten, innen ein dunkelroter Rachen. Vier kleine Augen, zwei auf jeder
    Seite, ein Kranz Knochendornen nach hinten, Knochenplatten ueber den
    Brauen."""
    MAEULER.pop("schlunddrache", None)
    b, h, l = 16, 12, 16
    y0 = ky - 4
    kopf = m.knoch("kopf", [0, ky, kz], eltern)
    kopf.kasten([-b / 2, y0, kz - l], [b, h, l], "kopf")
    kopf.kasten([-b / 2 - 0.5, y0 + h - 3, kz - l + 2], [b + 1, 3, 6], "braue")        # Knochenplatte
    kopf.kasten([-b / 2 + 2, y0 + h, kz - l + 1], [b - 4, 2, 5], "knochenplatte")
    kopf.kasten([-b / 2 + 3, y0 - 2, kz - 7], [b - 6, 2, 7], "kehle")
    # Oben: ein Kranz langer Fangzaehne ringsum, vorn die laengsten.
    for x in range(int(-b / 2 + 1), int(b / 2 - 1), 2):
        lang = 4 if abs(x) < 4 else 3
        kopf.kasten([x, y0 - lang, kz - l], [1, lang, 1], "zahn")
    for z in range(int(kz - l + 2), int(kz - 3), 2):
        for x in (b / 2 - 1, -b / 2):
            kopf.kasten([x, y0 - 3, z], [1, 3, 1], "zahn")
    # Der Unterkiefer haengt offen (Grundstellung 22 Grad) - ein Schlund.
    kiefer = m.knoch("kiefer", [0, y0, kz - 3], "kopf", drehung=[22, 0, 0])
    kiefer.kasten([-b / 2 + 0.5, y0 - 4, kz - l], [b - 1, 4, l - 3], "kiefer")
    kiefer.kasten([-b / 2 + 2.5, y0 - 1.5, kz - l + 2], [b - 5, 1, l - 7], "zunge")
    for x in range(int(-b / 2 + 1.5), int(b / 2 - 1), 2):
        kiefer.kasten([x, y0, kz - l + 0.5], [1, 4 if abs(x) < 4 else 3, 1], "zahn")
    for z in range(int(kz - l + 3), int(kz - 4), 2):
        for x in (b / 2 - 1.5, -b / 2 + 0.5):
            kiefer.kasten([x, y0, z], [1, 3, 1], "zahn")
    MAEULER.setdefault("schlunddrache", []).append(("kopf", [0, y0 - 1, kz - l]))
    # Vier Augen: zwei uebereinander auf jeder Seite.
    oy, oz = y0 + h - 5, kz - l + 4
    AUGEN["schlunddrache"] = (oy, oz, b / 2 + 1)
    lid = m.knoch("lider", [0, ky, kz], "kopf")
    for x in (1, -1):
        for dy, dz in ((0, 0), (-3, 3)):
            kopf.kasten([x * b / 2 - (0 if x > 0 else 1), oy - 1 + dy, oz - 2 + dz], [1, 2, 3], "auge")
            lid.kasten([x * (b / 2 + 1.1), oy - 1 + dy, oz - 2 + dz], [0, 2, 3], "lid")
        # Kiemenartige Wangenflossen hinten am Kopf.
        for j in range(3):
            kopf.kasten([x * b / 2 - (0 if x > 0 else 1), y0 + 2 + j * 3, kz - 3], [1, 2, 6], "knochenstachel",
                        drehung=[-10, -x * (30 + j * 12), 0], drehpunkt=[x * b / 2, y0 + 3 + j * 3, kz - 3])
    # Ein Kranz Knochendornen nach hinten.
    for i, w in enumerate((-50, -25, 0, 25, 50)):
        kopf.kasten([-0.5 + w / 12, y0 + h - 1, kz - 4], [1, 1, 9 - abs(i - 2) * 2], "knochenstachel",
                    drehung=[25, w, 0], drehpunkt=[w / 12, y0 + h - 0.5, kz - 4])
    return kopf


def schlunddrache_modell():
    """Der Schlunddrache: ein schlanker Leib, ein kurzer, dicker Hals, der
    den riesigen Kopf traegt, vier duenne Beine mit Krallen, lange
    Knochenschwingen mit blasser Haut, weisse Knochenstacheln und ein langer,
    duenner Schwanz mit einer Knochenspitze."""
    m = Modell("schlunddrache", sichtbreite=10.0, sichthoehe=3.5)
    r = m.knoch("rumpf", [0, 20, 0])
    r.kasten([-7, 12, -11], [14, 13, 11], "leib")
    r.kasten([-6, 11.5, -12], [12, 10, 2], "brust")
    r.kasten([-6, 12.5, -1], [12, 11, 9], "leib")
    r.kasten([-6, 13, 8], [12, 10, 7], "leib")
    r.kasten([-5, 11.5, -10], [10, 1, 23], "bauch")
    for z, h in ((-9, 6), (-4, 7), (1, 7), (6, 6), (11, 5)):
        klinge(r, 0, 25 if z < 6 else 23, z, h, 3, neigung=-35, stoff="knochenstachel")
    hals, ende = glieder(m, "hals", "rumpf", (0, 22, -11), -1,
                         [(6, 11, 11, 2.0), (5, 11, 11, 1.5), (5, 12, 12, 0.5)], stoff="leib")
    klingen_reihe(m, hals, stoff="knochenstachel", hoehe=(5, 4), neigung=-40)
    _, ky, kz = ende
    schlund_kopf(m, hals[-1], ky, kz)
    schwanz, ende = glieder(m, "schwanz", "rumpf", (0, 19, 14), 1,
                            [(8, 9, 8, -0.4), (8, 7, 6, -0.3), (8, 6, 5, -0.2), (8, 5, 4, 0.0), (8, 4, 4, 0.0),
                             (8, 3, 3, 0.0), (8, 3, 3, 0.0), (7, 2, 2, 0.0), (6, 2, 2, 0.0)], stoff="leib")
    klingen_reihe(m, schwanz, stoff="knochenstachel", hoehe=(5, 2), neigung=-40)
    _, sy, sz = ende
    spitze = m.finde(schwanz[-1])
    spitze.kasten([-2, sy - 1, sz - 1], [4, 2, 4], "knochenplatte")
    spitze.kasten([-1, sy - 0.5, sz + 3], [2, 1, 4], "knochenplatte")
    for seite, x in (("links", 1), ("rechts", -1)):
        bein_klotz(m, f"bein_hinten_{seite}", "rumpf", (x * 6, 20, 11), (6, 9, 7), (4, 8, 4), (6, 3, 5),
                   zehen=3, zehlang=5)
        bein_klotz(m, f"bein_vorn_{seite}", "rumpf", (x * 6, 19, -8), (5, 9, 5), (4, 7, 4), (5, 3, 4),
                   zehen=3, zehlang=4)
    schwinge_bauen(m, SCHLUNDDRACHE_SCHWINGE, zusatz=fingerkrallen)
    becken_abtrennen(m, 8, 19)
    sattel_bauen(m, "rumpf", 26, -3, 14)
    uralt_zier(m)
    sattelzone(m)
    return m


SCHLUNDDRACHE_FARBEN = {
    # Wie das Vorbild: moosiges Tuerkisgruen, blasse Knochen und Flughaut.
    "moos":    {"leib": "#6a9a82", "ruecken": "#3a6a5a", "bauch": "#d8e4c8", "fleck": "#4e8070",
                "haut": "#e8e4d0", "hautfleck": "#c8c4a8", "augen": "#ffe86a", "glut": "#c0ffe8",
                "horn": ("#b8b4a0", "#e4e0cc", "#fcfaf0"), "kralle": "#1e2a24", "zunge": "#c85a6a",
                "rachen": "#3a0e14", "zacken": 2.4},
    "knochen": {"leib": "#b8b4a4", "ruecken": "#7a766a", "bauch": "#ece8dc", "fleck": "#96928a",
                "haut": "#f0ece0", "hautfleck": "#d0ccbc", "augen": "#ff5a3a", "glut": "#ffd0b0",
                "horn": ("#8a8678", "#d8d4c4", "#ffffff"), "kralle": "#2a2620", "zunge": "#b04a5a",
                "rachen": "#2a0a10", "zacken": 2.4},
    "tiefsee": {"leib": "#2e5a6a", "ruecken": "#142e3a", "bauch": "#9ac8c8", "fleck": "#1e4452",
                "haut": "#a8c8d0", "hautfleck": "#6a98a8", "augen": "#6affe8", "glut": "#8affff",
                "horn": ("#5a7a80", "#a8c8c8", "#e8fafa"), "kralle": "#0a1418", "zunge": "#6a5a8a",
                "rachen": "#0e0a1a", "zacken": 2.4},
}


def schlunddrache_maler(variante):
    f = SCHLUNDDRACHE_FARBEN.get(variante, SCHLUNDDRACHE_FARBEN["moos"])

    def besonders(stoff, p, n, texel):
        if stoff in ("knochenstachel", "knochenplatte"):
            return H.verlauf(list(f["horn"]), H.hoehe(p, n, texel) if stoff == "knochenstachel" else 0.6, 3)
        if stoff == "kopf" and n[1] < -0.5:
            return H.farbe(f["rachen"])                      # der Gaumen im offenen Schlund
        return False
    return klotz_maler("schlunddrache", f, SCHLUNDDRACHE_SCHWINGE, besonders, saat=29)
