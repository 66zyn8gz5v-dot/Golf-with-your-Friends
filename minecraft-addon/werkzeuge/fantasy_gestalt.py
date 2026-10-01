#!/usr/bin/env python3
"""Die Fantasy-Wesen, erste Welle (4.78): Feuermuecke, Sturmlibelle,
Frostkaefer, Basilisk - Gestalt und Haut.

Fynn: "ein paar Fantasy-Tiere ... nicht Einhorn, eher Drachen und sowas,
was im Mittelalter eine grosse Rolle gespielt hat. Ein bisschen
Elementtiere - nicht Feuerloewe, sondern wie eine Feuermuecke. Insekten
finde ich cool."

Was leuchtet, bekommt in der Haut Alpha 254: Das Material
entity_emissive_alpha laesst genau diese Punkte im Dunkeln gluehen - die
Glut der Muecke, die Blitzadern der Libelle, die Eiskristalle des Kaefers,
die Augen des Basilisken.

Die Insekten sind doppelt so gross gebaut und werden im Spiel verkleinert
(wie die Kleintiere), damit ihre Haut feiner wird.
"""

import math

from tiermodell import Modell, hexfarbe, mische, streu
from tiere_gestalt import ton, auge, paar, beine
import haut as H

LEUCHT = 254


def glut(farbe, hell=0.0):
    """Eine leuchtende Farbe: Alpha 254."""
    f = hexfarbe(farbe) if isinstance(farbe, str) else farbe
    f = tuple(max(0, min(255, int(c * (1 + hell)))) for c in f)
    return f + (LEUCHT,)


# ================================================================== Feuermuecke

def feuermuecke_modell():
    m = Modell("feuermuecke", sichtbreite=1.0, sichthoehe=1.0)
    rumpf = m.knoch("rumpf", [0, 6, 0])
    rumpf.kasten([-1.5, 5, -2], [3, 3, 3], "brust")
    leib = m.knoch("hinterleib", [0, 6, 1], "rumpf", drehung=[-18, 0, 0])
    leib.kasten([-1, 4.5, 1], [2, 2, 6], "leib")
    kopf = m.knoch("kopf", [0, 6.5, -2], "rumpf")
    kopf.kasten([-1, 5.5, -4], [2, 2, 2], "kopf")
    kopf.kasten([-0.5, 5.5, -7], [1, 1, 3], "ruessel")
    for name, x in (("fluegel_links", 1.5), ("fluegel_rechts", -1.5)):
        f = m.knoch(name, [x, 8, -0.5], "rumpf")
        f.kasten([x if x > 0 else x - 6, 8, -1.5], [6, 0, 3], "fluegel")
    beine_ = m.knoch("beine", [0, 5, -0.5], "rumpf")
    for z in (-1.5, -0.5, 0.5):
        paar(beine_, [0.5, 2.5, z], [1, 3, 0], "bein")
    return m


FEUERMUECKE_FARBEN = {
    # Panzer, Glut hell, Glut dunkel, Fluegelrand
    "glut": ("#2a1a14", "#ffd24a", "#ff6a1a", "#ff9a3a"),
    "seelenglut": ("#141c24", "#9af0ff", "#2aa8d8", "#5ad0f0"),
}


def feuermuecke_maler(variante):
    panzer, hell, dunkel, rand = FEUERMUECKE_FARBEN.get(variante, FEUERMUECKE_FARBEN["glut"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "leib":
            # Der glimmende Hinterleib: helle Glut, dunkle Ringe dazwischen.
            if int(math.floor(z)) % 2 == 0:
                return glut(mische(hexfarbe(hell), hexfarbe(dunkel), min(1.0, max(0.0, (z - 1) / 6))))
            return H.heller(panzer, 0.1)
        if stoff == "brust":
            # 4.88: statt Glutpunkten eine gluehende Naht den Ruecken entlang,
            # und der Panzer die Flanke hinab in Stufen dunkler.
            if n[1] > 0.5 and abs(x) < 0.55:
                return glut(dunkel)
            return H.koerper(p, n, texel, H.heller(panzer, 0.18), panzer, H.dunkler(panzer, 0.2), grenze=0.2, stufen=3)
        if stoff == "kopf":
            if abs(n[0]) > 0.5 and y > 6.5:
                return glut(dunkel, -0.2)                                       # rote Facettenaugen
            return H.koerper(p, n, texel, H.heller(panzer, 0.15), panzer, H.dunkler(panzer, 0.2), stufen=3)
        if stoff == "ruessel":
            return H.verlauf(["#6a3a22", "#4a2a1a"], H.laenge(p, texel), 3)
        if stoff == "fluegel":
            # Durchscheinend kann Minecraft nicht - also ein heller, leise
            # gluehender Fluegel mit dunkleren Adern und hellem Rand.
            if abs(x) > 6.3 or abs(z) > 1.2:
                return glut(rand, -0.05)
            if texel[0] % 3 == 0:
                return glut(mische(hexfarbe(rand), (40, 20, 10), 0.5))
            return glut(mische(hexfarbe(rand), (255, 250, 230), 0.72), -0.08)
        if stoff == "bein":
            return H.verlauf([mische(hexfarbe(panzer), hexfarbe(dunkel), 0.35), panzer], H.hoehe(p, n, texel), 2)
        return H.farbe(panzer)
    return male


# ================================================================== Sturmlibelle

def sturmlibelle_modell():
    m = Modell("sturmlibelle", sichtbreite=1.6, sichthoehe=1.0)
    rumpf = m.knoch("rumpf", [0, 6, 0])
    rumpf.kasten([-1.5, 5, -2], [3, 3, 4], "brust")
    kopf = m.knoch("kopf", [0, 6.5, -2], "rumpf")
    kopf.kasten([-2, 5, -5], [4, 3, 3], "kopf")
    leib = m.knoch("hinterleib", [0, 6.5, 2], "rumpf")
    leib.kasten([-1, 5.5, 2], [2, 2, 6], "leib")
    spitze = m.knoch("leibspitze", [0, 6.5, 8], "hinterleib")
    spitze.kasten([-0.5, 6, 8], [1, 1, 7], "leib")
    spitze.kasten([-1, 6, 15], [2, 1, 1], "zange")
    for name, x, z, lang in (("fluegel_vorn_links", 1.5, -1, 11), ("fluegel_hinten_links", 1.5, 1, 10),
                             ("fluegel_vorn_rechts", -1.5, -1, 11), ("fluegel_hinten_rechts", -1.5, 1, 10)):
        f = m.knoch(name, [x, 8, z], "rumpf")
        f.kasten([x if x > 0 else x - lang, 8, z - 1.5], [lang, 0, 3], "fluegel")
    beine_ = m.knoch("beine", [0, 5, 0], "rumpf")
    for z in (-1.5, 0, 1.5):
        paar(beine_, [1, 2, z], [1, 3, 0], "bein")
    return m


STURMLIBELLE_FARBEN = {
    # Koerper, Koerper hell, Blitzader, Augen
    "blau": ("#1e5a8a", "#3a8ac0", "#8af4ff", "#2ab89a"),
    "gewitter": ("#3a2a6a", "#6a4aa8", "#e0a8ff", "#a86ae0"),
}


def sturmlibelle_maler(variante):
    koerper, hell, blitz, augen = STURMLIBELLE_FARBEN.get(variante, STURMLIBELLE_FARBEN["blau"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "kopf":
            # Riesige Facettenaugen, die fast den ganzen Kopf einnehmen.
            if abs(x) > 0.6 and (abs(n[0]) > 0.5 or n[1] > 0.5 or n[2] < -0.5) and y > 5.8:
                # 4.88: ein glattes Facettenauge - oben ein zusammenhaengender
                # Glanz, nach unten dunkler - statt Glitzerpunkten.
                if n[1] > 0.5 and abs(x) > 1.2:
                    return glut(augen, 0.25)
                return H.verlauf([H.dunkler(augen, 0.3), augen, H.heller(augen, 0.2)], H.hoehe(p, n, texel), 3)
            return H.koerper(p, n, texel, H.heller(koerper, 0.2), koerper, H.dunkler(koerper, 0.2), stufen=3)
        if stoff in ("brust", "leib"):
            # Metallisch glaenzend, mit einer Blitzader den Ruecken entlang.
            if n[1] > 0.5 and abs(x) < 0.6:
                return glut(blitz)
            if int(math.floor(z)) % 3 == 0:
                return H.dunkler(koerper, 0.22)                                  # die Ringe des Leibs
            return H.koerper(p, n, texel, H.heller(koerper, 0.15), koerper, hell, grenze=0.2, stufen=3)
        if stoff == "zange":
            return H.dunkler(koerper, 0.25)
        if stoff == "fluegel":
            # Adernetz mit leuchtendem Rand; die Zellen bleiben frei.
            # Voll, hell und glasig, mit dunklem Adernetz, einem dunklen
            # Fleck an der Spitze (wie bei echten Libellen) und leuchtendem Rand.
            if abs(x) > 9.5:
                return ton("#1a2430", p, n, texel, 817, straehne=0.0)         # das Flecklein an der Spitze
            if texel[1] % 3 == 0 or texel[0] % 4 == 0:
                return glut(mische(hexfarbe(blitz), hexfarbe(koerper), 0.55), -0.2)
            return glut(mische(hexfarbe(blitz), (255, 255, 255), 0.7), -0.12)
        if stoff == "bein":
            return H.farbe("#1a1e24")
        return H.farbe(koerper)
    return male


# ================================================================== Frostkaefer

def frostkaefer_modell():
    """4.88 neu gebaut. Fynn: "Die Fluegel von den Kaefern ... sind nicht so
    richtig connected, einzelne Teile."

    Jetzt wie ein echter Kaefer: Kopf, Halsschild, dann zwei Deckfluegel,
    die an der Mittelnaht schliessen und vorn innen ihr Gelenk haben - so
    klappen sie wie Tueren nach oben und aussen. Darunter liegen gefaltet
    die duennen Hautfluegel, die beim Aufschwirren herauskommen. Die
    Eiskristalle wachsen als feste Bueschel aus den Deckfluegeln und gehen
    mit ihnen mit. Beine mit Knie, Fuehler mit Knick."""
    m = Modell("frostkaefer", sichtbreite=1.4, sichthoehe=1.0)
    k = m.knoch("koerper", [0, 4, 0])
    k.kasten([-3.5, 2, -3.5], [7, 3, 10], "unterseite")
    # Das Halsschild: breit, vorn etwas schmaler, gewoelbt.
    k.kasten([-3.5, 3, -6.5], [7, 3, 3], "halsschild")
    k.kasten([-2.5, 6, -6], [5, 1, 2], "halsschild")
    for seite, z_ in (("links", 1), ("rechts", -1)):
        x0 = 0 if z_ > 0 else -4
        pz = m.knoch(f"panzer_{seite}", [0, 7, -3.5], "koerper")
        # Deckfluegel: Grundplatte, gewoelbter Ruecken, abgerundetes Ende.
        pz.kasten([x0, 4, -3.5], [4, 3, 9], "panzer")
        pz.kasten([x0 + (0 if z_ > 0 else 1), 7, -3], [3, 1, 8], "panzer")
        pz.kasten([x0 + (0 if z_ > 0 else 1), 4.5, 5.5], [3, 2, 1], "panzer")
        # Ein Kristallbueschel, das aus dem Deckfluegel waechst: breiter Fuss,
        # darauf die Spitzen - ein Stueck, keine losen Wuerfel.
        bx = 1 if z_ > 0 else -3
        pz.kasten([bx, 8, -1], [2, 1, 3], "kristall")
        pz.kasten([bx + (1 if z_ > 0 else 0), 9, -0.5], [1, 2, 1], "kristall")
        pz.kasten([bx + (0 if z_ > 0 else 1), 9, 0.5], [1, 1, 1], "kristall")
        pz.kasten([bx, 8, 2.5], [2, 1, 2], "kristall")
        pz.kasten([bx + (0 if z_ > 0 else 1), 9, 3], [1, 2, 1], "kristall")
        # Der Hautfluegel darunter, gefaltet; das Gelenk sitzt an der Schulter.
        hf = m.knoch(f"fluegel_{seite}", [z_ * 1.0, 6.5, -3], "koerper")
        hf.kasten([0.5 if z_ > 0 else -3.5, 6.5, -3], [3, 0, 8], "hautfluegel")
    kopf = m.knoch("kopf", [0, 4, -6.5], "koerper")
    kopf.kasten([-2, 2.5, -9], [4, 3, 3], "kopf")
    for name, x in (("kiefer_links", 1), ("kiefer_rechts", -1)):
        kf = m.knoch(name, [x, 3, -9], "kopf")
        kf.kasten([x - 0.5, 2.5, -11], [1, 1, 2], "kiefer")
        kf.kasten([x - 0.5 - x * 0.5, 2.5, -11.5], [1, 1, 1], "kiefer")
    for name, x in (("fuehler_links", 1), ("fuehler_rechts", -1)):
        f = m.knoch(name, [x, 5, -8.5], "kopf", drehung=[-30, 20 if x < 0 else -20, 0])
        f.kasten([x - 0.5, 5, -11.5], [1, 1, 3], "fuehler")
        f2 = m.knoch(name + "_spitze", [x, 5.5, -11.5], name, drehung=[25, 0, 0])
        f2.kasten([x - 0.5, 5, -14], [1, 1, 3], "fuehlerspitze")
    # Sechs Beine, jedes mit Oberschenkel und Unterschenkel (Knie dazwischen).
    for i, (x, z) in enumerate(((3.5, -2.5), (-3.5, -2.5), (3.5, 0.5), (-3.5, 0.5), (3.5, 3.5), (-3.5, 3.5))):
        aussen = 1 if x > 0 else -1
        b = m.knoch(f"bein{i}", [x, 3, z], "koerper")
        b.kasten([x if x > 0 else x - 2, 2.5, z - 0.5], [2, 1, 1], "bein")
        u = m.knoch(f"unterbein{i}", [x + 2 * aussen, 3, z], f"bein{i}")
        u.kasten([x + 2 * aussen - (0 if x > 0 else 1), 0, z - 0.5], [1, 3, 1], "bein")
    return m


FROSTKAEFER_FARBEN = {
    # Panzer, Panzer hell, Unterseite, Kristall
    "eis": ("#6aa8d8", "#b8e0f4", "#243040", "#d8f8ff"),
    "gletscher": ("#5ac0b8", "#c8f0e8", "#1e3434", "#e8fff8"),
}


def frostkaefer_maler(variante):
    """4.88: ohne Raureif-Flecken. Die Deckfluegel sind unten am Rand dunkel
    und werden nach oben in Stufen eisig hell; eine helle Naht in der Mitte
    und ein heller Saum am Rand halten sie als eine Form zusammen."""
    panzer, hell, unten, kristall = FROSTKAEFER_FARBEN.get(variante, FROSTKAEFER_FARBEN["eis"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "panzer":
            if n[1] > 0.5 and abs(x) < 0.55:
                return H.heller(hell, 0.2)                                     # die Naht
            if n[1] > 0.5 and abs(x) > 3.4:
                return H.heller(hell, 0.1)                                     # der Saum
            return H.verlauf([H.dunkler(panzer, 0.25), panzer, hell], H.hoehe(p, n, texel) * 0.8 + (0.2 if y > 6.9 else 0), 4)
        if stoff == "halsschild":
            return H.verlauf([H.dunkler(panzer, 0.35), H.dunkler(panzer, 0.1), panzer], H.hoehe(p, n, texel), 3)
        if stoff == "kristall":
            return glut(H.verlauf([H.mische(H.farbe(kristall), H.farbe(panzer), 0.4), kristall], H.hoehe(p, n, texel), 2),
                        -0.05 if n[1] > 0.5 else -0.15)
        if stoff == "hautfluegel":
            # Duenn und hell, mit wenigen dunklen Laengsadern.
            if texel[0] % 3 == 0:
                return H.dunkler(hell, 0.25)
            return H.heller(hell, 0.35)
        if stoff == "kopf":
            if abs(n[0]) > 0.5 and y > 4.3 and z < -8:
                return glut("#7ae8ff")                                          # eisblaue Augen
            return H.verlauf([unten, H.heller(unten, 0.15)], H.hoehe(p, n, texel), 3)
        if stoff in ("kiefer", "fuehler", "fuehlerspitze"):
            return H.verlauf([H.dunkler(hell, 0.2), hell], H.laenge(p, texel), 3)
        if stoff == "unterseite":
            return H.verlauf([H.dunkler(unten, 0.1), unten], H.hoehe(p, n, texel), 2)
        if stoff in ("bein", "fuss"):
            return H.heller(unten, 0.2)
        return H.farbe(panzer)
    return male


# ================================================================== Basilisk

def basilisk_modell():
    m = Modell("basilisk", sichtbreite=3.0, sichthoehe=1.4)
    body = m.knoch("body", [0, 6, 0])
    body.kasten([-3, 3, -7], [6, 5, 14], "schuppen")
    body.kasten([-2.5, 2.5, -6], [5, 1, 12], "bauch")
    body.kasten([-0.5, 8, -6], [1, 2, 12], "kamm")
    kopf = m.knoch("head", [0, 7, -7], "body")
    kopf.kasten([-2.5, 4, -12], [5, 4, 5], "kopf")
    kopf.kasten([-2, 5, -15], [4, 2, 3], "schnauze")
    kiefer = m.knoch("kiefer", [0, 5, -12], "head")
    kiefer.kasten([-2, 4, -15], [4, 1, 3], "schnauze")
    # Die Krone - der Basilisk ist der Koenig der Schlangen.
    krone = m.knoch("krone", [0, 8, -10], "head")
    krone.kasten([-2.5, 8, -11.5], [5, 1, 3], "krone")
    for x, z, h in ((-2.5, -11.5, 2), (-0.5, -12, 3), (1.5, -11.5, 2), (-1.5, -9.5, 2), (0.5, -9.5, 2)):
        krone.kasten([x, 9, z], [1, h, 1], "zacke")
    schwanz = m.knoch("tail", [0, 6, 7], "body")
    schwanz.kasten([-2, 4, 7], [4, 3.5, 8], "schuppen")
    schwanz.kasten([-0.5, 7.5, 7], [1, 1.5, 8], "kamm")
    s2 = m.knoch("tail2", [0, 5.5, 15], "tail")
    s2.kasten([-1.5, 4.5, 15], [3, 2.5, 8], "schuppen")
    s3 = m.knoch("tail3", [0, 5.5, 23], "tail2")
    s3.kasten([-1, 5, 23], [2, 1.5, 6], "schuppen")
    beine(m, "body", 3.5, -5, 5, (2, 4, 2), 4, pfote=(3, 1, 3), krallen=True)
    return m


BASILISK_FARBEN = {
    # Schuppen, Muster, Bauch, Kamm
    "wueste": ("#9a8248", "#5a4424", "#e0cc94", "#a8321e"),
    "schatten": ("#3a4a26", "#1c2414", "#a8b070", "#6a1a2a"),
}


def basilisk_maler(variante):
    """4.88: statt Schachbrett ein Verlauf vom hellen Bauch zum dunklen
    Ruecken, darauf eine zusammenhaengende Rautenkette wie bei einer Viper."""
    schuppen, muster, bauch, kamm = BASILISK_FARBEN.get(variante, BASILISK_FARBEN["wueste"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "kopf":
            for ax in (-2.5, 2.5):
                if abs(n[0]) > 0.5 and x * ax > 0 and abs(y - 6.5) < 0.6 and abs(z + 10.5) < 1.1:
                    return hexfarbe("#140a04") if abs(z + 10.5) < 0.4 else glut("#ffd21a")
            return H.koerper(p, n, texel, bauch, schuppen, muster, grenze=0.25, stufen=3)
        if stoff == "schnauze":
            if n[2] < -0.5 and y > 5.5 and abs(x) > 0.8:
                return hexfarbe("#1a1008")                                      # Nasenloecher
            return H.koerper(p, n, texel, bauch, schuppen, muster, grenze=0.3, stufen=3)
        if stoff == "schuppen":
            # Die Rautenkette: auf dem Ruecken und ein Stueck die Flanke hinab.
            if n[1] > 0.5 or H.hoehe(p, n, texel) > 0.8:
                raute = abs((z % 4) - 2) + abs(x) * (1.0 if n[1] > 0.5 else 0.0)
                if n[1] > 0.5 and raute < 1.6:
                    return H.dunkler(muster, 0.15)
            return H.koerper(p, n, texel, bauch, schuppen, muster, grenze=0.25, stufen=4, schilde=2)
        if stoff == "bauch":
            return H.koerper(p, n, texel, bauch, schuppen, muster, grenze=1.1, schilde=2)
        if stoff == "kamm":
            oben = 9.0 if z < 7 else 8.25
            if y > oben and texel[0] % 2 == 1:
                return None
            return H.verlauf([H.dunkler(kamm, 0.2), kamm, H.heller(kamm, 0.15)], H.hoehe(p, n, texel), 3)
        if stoff in ("krone", "zacke"):
            if stoff == "zacke" and n[1] > 0.5:
                return glut("#ff3a2a")                                          # rote Steine
            return H.verlauf(["#b8862a", "#e0b030", "#f4d468"], H.hoehe(p, n, texel), 3)
        if stoff in ("bein", "pfote"):
            return H.koerper(p, n, texel, bauch, schuppen, muster, grenze=0.15, stufen=3)
        if stoff == "kralle":
            return hexfarbe("#1a140e")
        return H.koerper(p, n, texel, bauch, schuppen, muster)
    return male


# ================================================================== Sandwurm (4.79)

SANDWURM_GLIEDER = 8
SANDWURM_HOEHE = 10       # je Glied


def sandwurm_modell():
    """Senkrecht gebaut, wie er aus dem Sand ragt: unten das dickste Glied,
    oben der Kopf mit dem Maul aus vier Klappen. Jedes Glied haengt am
    darunter, so kann er sich wiegen wie eine Schlange. Der Sandhuegel ist
    ein eigener Knochen - man sieht ihn, solange der Wurm unter dem Sand ist."""
    m = Modell("sandwurm", sichtbreite=2.4, sichthoehe=6.0)
    m.knoch("koerper", [0, 0, 0])
    eltern = "koerper"
    for i in range(SANDWURM_GLIEDER):
        r = 11 - i * 0.25 if i < 4 else 10 - (i - 4) * 0.5
        r = round(r)
        y0 = i * SANDWURM_HOEHE
        g = m.knoch(f"glied{i}", [0, y0, 0], eltern)
        g.kasten([-r, y0, -r], [2 * r, SANDWURM_HOEHE, 2 * r], "haut")
        # Ein flacher Wulst oben an jedem Glied - die Ringe des Wurms.
        g.kasten([-r - 0.5, y0 + 8, -r - 0.5], [2 * r + 1, 1, 2 * r + 1], "ring")
        eltern = f"glied{i}"
    oben = SANDWURM_GLIEDER * SANDWURM_HOEHE
    kopf = m.knoch("kopf", [0, oben, 0], eltern)
    kopf.kasten([-9, oben, -9], [18, 6, 18], "kopf")
    for name, ursprung, groesse, dreh in (
            ("kiefer_nord", [-8, oben + 6, -9], [16, 9, 2], [0, oben + 6, -8]),
            ("kiefer_sued", [-8, oben + 6, 7], [16, 9, 2], [0, oben + 6, 8]),
            ("kiefer_ost", [7, oben + 6, -8], [2, 9, 16], [8, oben + 6, 0]),
            ("kiefer_west", [-9, oben + 6, -8], [2, 9, 16], [-8, oben + 6, 0])):
        k = m.knoch(name, dreh, "kopf")
        k.kasten(ursprung, groesse, "klappe")
        # Die Spitze jeder Klappe: schmaler, wie ein riesiger Zahn.
        spitze = [ursprung[0] + (4 if groesse[0] > 2 else 0), ursprung[1] + groesse[1],
                  ursprung[2] + (4 if groesse[2] > 2 else 0)]
        k.kasten(spitze, [8 if groesse[0] > 2 else 2, 4, 8 if groesse[2] > 2 else 2], "klappe")
    huegel = m.knoch("huegel", [0, 0, 0])
    huegel.kasten([-14, 0, -14], [28, 3, 28], "sand")
    huegel.kasten([-9, 3, -9], [18, 3, 18], "sand")
    huegel.kasten([-4, 6, -4], [8, 2, 8], "sand")
    return m


SANDWURM_FARBEN = {
    # Haut, Falten, Sand, Klappe innen
    "wueste": ("#b8925e", "#7a5a36", "#dccb96", "#8a2a2a"),
    "rotsand": ("#b0643a", "#6e3a1e", "#c47a44", "#6a1a22"),
}


def sandwurm_maler(variante):
    """4.88: ohne Sprenkel. Die Haut wird zum Kopf hin in Stufen heller,
    jedes Glied ist unten dunkler als oben (so sieht man die Ringe), und
    Laengsfurchen laufen als durchgehende Linien."""
    haut, falte, sand, rachen = SANDWURM_FARBEN.get(variante, SANDWURM_FARBEN["wueste"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "haut":
            winkel = math.atan2(z, x)
            if int(math.floor((winkel + math.pi) / (2 * math.pi) * 16)) % 4 == 0 and abs(n[1]) < 0.5:
                return H.mische(H.farbe(haut), H.farbe(falte), 0.55)
            grund = H.verlauf([falte, haut, H.heller(haut, 0.18)], min(1.0, y / (SANDWURM_GLIEDER * SANDWURM_HOEHE)), 5)
            return H.verlauf([H.dunkler(grund, 0.12), grund], H.hoehe(p, n, texel), 3)
        if stoff == "ring":
            return H.mische(H.farbe(haut), H.farbe(falte), 0.45)
        if stoff == "kopf":
            if n[1] > 0.5:
                r = math.hypot(x, z)
                w = math.degrees(math.atan2(z, x))
                if r < 3:
                    return hexfarbe("#1a0a08")
                if 3.5 < r < 5 and int(w // 20) % 2 == 0:
                    return hexfarbe("#f0e8d4")
                if 6 < r < 7.5 and int(w // 15) % 2 == 1:
                    return hexfarbe("#e8dcc4")
                return H.verlauf([H.dunkler(rachen, 0.3), rachen], r / 9, 4)
            return H.heller(haut, 0.12)
        if stoff == "klappe":
            innen = (x * n[0] + z * n[2]) < 0
            if innen:
                # Zahnreihen als durchgehende Leisten, dazwischen dunkler Rachen.
                if int(y) % 3 == 0:
                    return hexfarbe("#f0e8d4")
                return H.verlauf([H.dunkler(rachen, 0.3), rachen], (y % 3) / 3, 2)
            if n[1] > 0.5:
                return hexfarbe("#f0e8d4")                                    # die Zahnspitzen oben
            return H.verlauf([haut, H.heller(haut, 0.15)], H.hoehe(p, n, texel), 3)
        if stoff == "sand":
            # Der Huegel: oben hell, zu den Raendern hin in Baendern dunkler.
            return H.verlauf([H.dunkler(sand, 0.12), sand, H.heller(sand, 0.08)], H.hoehe(p, n, texel), 3)
        return H.farbe(haut)
    return male


# Der Lindwurm steht seit 4.89 in drachen_gestalt.py - neu gebaut.
