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
            return ton(panzer, p, n, texel, 801, straehne=0.0, hell=0.1)
        if stoff == "brust":
            # Gluehende Risse im dunklen Panzer.
            if streu(texel[0], texel[1], 802) < 0.2:
                return glut(dunkel)
            return ton(panzer, p, n, texel, 803, straehne=0.0)
        if stoff == "kopf":
            if abs(n[0]) > 0.5 and y > 6.5:
                return glut(dunkel, -0.2)                                       # rote Facettenaugen
            return ton(panzer, p, n, texel, 804, straehne=0.0)
        if stoff == "ruessel":
            return ton("#4a2a1a", p, n, texel, 805, straehne=0.0)
        if stoff == "fluegel":
            # Durchscheinend kann Minecraft nicht - also ein heller, leise
            # gluehender Fluegel mit dunkleren Adern und hellem Rand.
            if abs(x) > 6.3 or abs(z) > 1.2:
                return glut(rand, -0.05)
            if texel[0] % 3 == 0:
                return glut(mische(hexfarbe(rand), (40, 20, 10), 0.5))
            return glut(mische(hexfarbe(rand), (255, 250, 230), 0.72), -0.08)
        if stoff == "bein":
            return ton(mische(hexfarbe(panzer), hexfarbe(dunkel), 0.35), p, n, texel, 806, straehne=0.0)
        return ton(panzer, p, n, texel, 807)
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
                if streu(texel[0], texel[1], 811) < 0.25:
                    return glut(augen, 0.2)
                return ton(augen, p, n, texel, 812, straehne=0.0)
            return ton(koerper, p, n, texel, 813, straehne=0.0)
        if stoff in ("brust", "leib"):
            # Metallisch glaenzend, mit einer Blitzader den Ruecken entlang.
            if n[1] > 0.5 and abs(x) < 0.6:
                return glut(blitz)
            if int(math.floor(z)) % 3 == 0:
                return ton(koerper, p, n, texel, 814, straehne=0.0, hell=-0.2)
            return ton(hell if n[1] > 0.5 else koerper, p, n, texel, 815, straehne=0.0)
        if stoff == "zange":
            return ton(koerper, p, n, texel, 816, straehne=0.0, hell=-0.25)
        if stoff == "fluegel":
            # Adernetz mit leuchtendem Rand; die Zellen bleiben frei.
            # Voll, hell und glasig, mit dunklem Adernetz, einem dunklen
            # Fleck an der Spitze (wie bei echten Libellen) und leuchtendem Rand.
            if abs(x) > 9.5:
                return ton("#1a2430", p, n, texel, 817, straehne=0.0)         # das Flecklein an der Spitze
            if texel[1] % 3 == 0 or texel[0] % 4 == 0:
                return glut(mische(hexfarbe(blitz), hexfarbe(koerper), 0.55), -0.2)
            if streu(texel[0], texel[1], 818) < 0.08:
                return glut(blitz)                                             # kleine Funken
            return glut(mische(hexfarbe(blitz), (255, 255, 255), 0.7), -0.12)
        if stoff == "bein":
            return ton("#1a1e24", p, n, texel, 818, straehne=0.0)
        return ton(koerper, p, n, texel, 819)
    return male


# ================================================================== Frostkaefer

def frostkaefer_modell():
    m = Modell("frostkaefer", sichtbreite=1.4, sichthoehe=1.0)
    k = m.knoch("koerper", [0, 4, 0])
    k.kasten([-3, 2, -4], [6, 3, 9], "unterseite")
    for name, x0 in (("panzer_links", 0), ("panzer_rechts", -3.5)):
        pz = m.knoch(name, [0 if x0 == 0 else 0, 6, -3.5], "koerper")
        pz.kasten([x0, 4.5, -3.5], [3.5, 2.5, 9], "panzer")
    kr = m.knoch("kristalle", [0, 7, 0], "koerper")
    kr.kasten([1, 7, -1], [1, 1, 1], "kristall")
    kr.kasten([-2, 7, 1], [1, 2, 1], "kristall")
    kr.kasten([1.5, 7, 3], [1, 1, 1], "kristall")
    kr.kasten([-1, 7, -2.5], [1, 1, 1], "kristall")
    kopf = m.knoch("kopf", [0, 4, -4], "koerper")
    kopf.kasten([-2, 2.5, -6.5], [4, 2.5, 2.5], "kopf")
    for name, x in (("kiefer_links", 1), ("kiefer_rechts", -1)):
        kf = m.knoch(name, [x, 3, -6.5], "kopf")
        kf.kasten([x - 0.5, 2.5, -8.5], [1, 1, 2], "kiefer")
    for name, x in (("fuehler_links", 1), ("fuehler_rechts", -1)):
        f = m.knoch(name, [x, 4.5, -6.5], "kopf", drehung=[-30, 20 if x < 0 else -20, 0])
        f.kasten([x - 0.5, 4.5, -10.5], [1, 1, 4], "fuehler")
    # Sechs Beine, je ein Knochen, damit sie im Dreiergang laufen koennen.
    for i, (x, z) in enumerate(((3, -2.5), (-3, -2.5), (3, 0.5), (-3, 0.5), (3, 3.5), (-3, 3.5))):
        b = m.knoch(f"bein{i}", [x, 3, z], "koerper")
        aussen = x if x > 0 else x - 2
        b.kasten([aussen, 2.5, z - 0.5], [2, 1, 1], "bein")
        b.kasten([x + 1 if x > 0 else x - 2, 0, z - 0.5], [1, 3, 1], "bein")
    return m


FROSTKAEFER_FARBEN = {
    # Panzer, Panzer hell, Unterseite, Kristall
    "eis": ("#6aa8d8", "#b8e0f4", "#243040", "#d8f8ff"),
    "gletscher": ("#5ac0b8", "#c8f0e8", "#1e3434", "#e8fff8"),
}


def frostkaefer_maler(variante):
    panzer, hell, unten, kristall = FROSTKAEFER_FARBEN.get(variante, FROSTKAEFER_FARBEN["eis"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "panzer":
            # Eisfacetten: helle Kanten an der Naht und am Rand, dazwischen
            # Flecken aus Raureif.
            if abs(x) < 0.55 and n[1] > 0.5:
                return ton(unten, p, n, texel, 821, straehne=0.0, hell=0.3)       # die Naht
            if streu(texel[0] // 2, texel[1] // 2, 822) < 0.3:
                return ton(hell, p, n, texel, 823, straehne=0.0)
            return ton(panzer, p, n, texel, 824, straehne=0.0)
        if stoff == "kristall":
            return glut(kristall, -0.05 if n[1] > 0.5 else -0.2)
        if stoff == "kopf":
            if abs(n[0]) > 0.5 and y > 3.8 and z < -5.5:
                return glut("#7ae8ff")                                          # eisblaue Augen
            return ton(unten, p, n, texel, 825, straehne=0.0, hell=0.15)
        if stoff in ("kiefer", "fuehler"):
            return ton(hell, p, n, texel, 826, straehne=0.0, hell=-0.1)
        if stoff == "unterseite":
            return ton(unten, p, n, texel, 827, straehne=0.0)
        if stoff == "bein":
            return ton(unten, p, n, texel, 828, straehne=0.0, hell=0.2)
        return ton(panzer, p, n, texel, 829)
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
    schuppen, muster, bauch, kamm = BASILISK_FARBEN.get(variante, BASILISK_FARBEN["wueste"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "kopf":
            # Gelb gluehende Augen mit Schlitzpupille.
            for ax in (-2.5, 2.5):
                if abs(n[0]) > 0.5 and x * ax > 0 and abs(y - 6.5) < 0.6 and abs(z + 10.5) < 1.1:
                    return hexfarbe("#140a04") if abs(z + 10.5) < 0.4 else glut("#ffd21a")
            if n[1] > 0.5:
                return ton(muster, p, n, texel, 831, straehne=0.0)
            return ton(schuppen, p, n, texel, 832, straehne=0.0)
        if stoff == "schnauze":
            if n[2] < -0.5 and y > 5.5 and abs(x) > 0.8:
                return hexfarbe("#1a1008")                                      # Nasenloecher
            return ton(schuppen, p, n, texel, 833, straehne=0.0, hell=-0.05)
        if stoff == "schuppen":
            # Schuppen im Versatz, oben ein dunkles Rautenmuster.
            if n[1] < -0.5:
                return ton(bauch, p, n, texel, 834, straehne=0.0)
            reihe = int(math.floor(z / 2))
            if (texel[0] + reihe) % 2 == 0 and (n[1] > 0.5 or y > 6):
                return ton(muster, p, n, texel, 835, straehne=0.0)
            if abs(z % 4 - 2) + abs(x) < 1.6 and n[1] > 0.5:
                return ton(muster, p, n, texel, 836, straehne=0.0, hell=-0.2)
            return ton(schuppen, p, n, texel, 837, straehne=0.0)
        if stoff == "bauch":
            if int(math.floor(z)) % 2 == 0:
                return ton(bauch, p, n, texel, 838, straehne=0.0, hell=-0.1)
            return ton(bauch, p, n, texel, 839, straehne=0.0)
        if stoff == "kamm":
            # Ein gezackter Kamm: nur jeder zweite Streifen steht.
            oben = 9.0 if z < 7 else 8.25
            if y > oben and texel[0] % 2 == 1:
                return None
            return ton(kamm, p, n, texel, 840, straehne=0.0)
        if stoff in ("krone", "zacke"):
            if stoff == "zacke" and n[1] > 0.5:
                return glut("#ff3a2a")                                          # rote Steine
            return ton("#e0b030", p, n, texel, 841, straehne=0.0, hell=0.05)
        if stoff in ("bein", "pfote"):
            return ton(schuppen, p, n, texel, 842, straehne=0.0, hell=-0.1)
        if stoff == "kralle":
            return hexfarbe("#1a140e")
        return ton(schuppen, p, n, texel, 843)
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
    haut, falte, sand, rachen = SANDWURM_FARBEN.get(variante, SANDWURM_FARBEN["wueste"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff == "haut":
            # Laengsfurchen und grobe Platten, zum Kopf hin heller.
            winkel = math.atan2(z, x)
            if int(math.floor((winkel + math.pi) / (2 * math.pi) * 16)) % 4 == 0 and abs(n[1]) < 0.5:
                return ton(falte, p, n, texel, 851, straehne=0.0)
            if streu(texel[0] // 3, texel[1] // 3, 852) < 0.2:
                return ton(falte, p, n, texel, 853, straehne=0.0, hell=0.2)
            return ton(haut, p, n, texel, 854, straehne=0.0, hell=min(0.15, y / 600))
        if stoff == "ring":
            return ton(mische(hexfarbe(haut), hexfarbe(falte), 0.45), p, n, texel, 855, straehne=0.0)
        if stoff == "kopf":
            if n[1] > 0.5:
                # Das Maul von oben: dunkler Schlund, Zahnringe darum.
                r = math.hypot(x, z)
                w = math.degrees(math.atan2(z, x))
                if r < 3:
                    return hexfarbe("#1a0a08")
                if 3.5 < r < 5 and int(w // 20) % 2 == 0:
                    return hexfarbe("#f0e8d4")
                if 6 < r < 7.5 and int(w // 15) % 2 == 1:
                    return hexfarbe("#e8dcc4")
                return ton(rachen, p, n, texel, 856, straehne=0.0, hell=-0.1 * (1 - r / 9))
            return ton(haut, p, n, texel, 857, straehne=0.0, hell=0.12)
        if stoff == "klappe":
            # Innen (zur Mitte hin) rot mit Zahnreihen, aussen Haut.
            innen = (x * n[0] + z * n[2]) < 0
            if innen:
                if int(y) % 3 == 0 and texel[0] % 2 == 0:
                    return hexfarbe("#f0e8d4")
                return ton(rachen, p, n, texel, 858, straehne=0.0)
            if n[1] > 0.5:
                return hexfarbe("#f0e8d4")                                    # die Zahnspitzen oben
            return ton(haut, p, n, texel, 859, straehne=0.0, hell=0.08)
        if stoff == "sand":
            if streu(texel[0], texel[1], 860) < 0.12:
                return ton(sand, p, n, texel, 861, straehne=0.0, hell=-0.18)  # Kiesel
            return ton(sand, p, n, texel, 862, straehne=0.0)
        return ton(haut, p, n, texel, 863)
    return male


# ================================================================== Lindwurm (4.80)

def lindwurm_modell():
    """Der Drache des Mittelalters: zwei Beine, zwei grosse Lederschwingen,
    langer Hals, langer Schwanz mit Pfeilspitze. Die Schwingen haben einen
    Arm und einen Finger - so falten sie sich im Flug."""
    m = Modell("lindwurm", sichtbreite=6.0, sichthoehe=2.5)
    rumpf = m.knoch("rumpf", [0, 20, 0])
    rumpf.kasten([-7, 14, -12], [14, 13, 24], "schuppen")
    rumpf.kasten([-6, 13, -11], [12, 1, 22], "bauch")
    for z in range(-10, 11, 4):
        rumpf.kasten([-0.5, 27, z], [1, 3, 2], "zacke")
    # Der Hals in drei Gliedern.
    h1 = m.knoch("hals1", [0, 23, -12], "rumpf")
    h1.kasten([-4, 19, -20], [8, 8, 8], "schuppen")
    h1.kasten([-0.5, 27, -18], [1, 2, 2], "zacke")
    h2 = m.knoch("hals2", [0, 24, -20], "hals1")
    h2.kasten([-3.5, 20.5, -27], [7, 7, 7], "schuppen")
    h2.kasten([-0.5, 27.5, -25], [1, 2, 2], "zacke")
    h3 = m.knoch("hals3", [0, 25, -27], "hals2")
    h3.kasten([-3, 22, -33], [6, 6, 6], "schuppen")
    kopf = m.knoch("kopf", [0, 26, -33], "hals3")
    kopf.kasten([-4.5, 23, -44], [9, 7, 11], "kopf")
    kopf.kasten([-3.5, 24, -50], [7, 4, 6], "schnauze")
    kopf.kasten([-4.5, 29.5, -43], [9, 1, 4], "braue")
    paar(kopf, [2.5, 29, -38], [2, 2, 8], "horn", drehung=[22, 12, 0], drehpunkt=[3.5, 30, -38])
    paar(kopf, [3.5, 26, -39], [2, 1, 4], "horn", drehung=[5, 25, 0], drehpunkt=[4.5, 26.5, -39])
    kiefer = m.knoch("kiefer", [0, 24, -40], "kopf")
    kiefer.kasten([-3.5, 21.5, -50], [7, 2, 10], "kiefer")
    # Der Schwanz in vier Gliedern, am Ende eine Pfeilspitze.
    teile = [([-5, 16, 12], [10, 9, 10]), ([-4, 17, 22], [8, 7, 10]), ([-3, 18, 32], [6, 5, 11]),
             ([-2, 18.5, 43], [4, 4, 12])]
    eltern = "rumpf"
    for i, (ursprung, groesse) in enumerate(teile):
        b = m.knoch(f"schwanz{i + 1}", [0, 20, ursprung[2]], eltern)
        b.kasten(ursprung, groesse, "schuppen")
        b.kasten([-0.5, ursprung[1] + groesse[1], ursprung[2] + 2], [1, 2, 2], "zacke")
        eltern = f"schwanz{i + 1}"
    m.finde("schwanz4").kasten([-4, 19, 55], [8, 2, 6], "spitze")
    # Die Schwingen: Arm mit Flughaut, daran der Finger mit mehr Flughaut.
    for seite, x in (("links", 7), ("rechts", -7)):
        z_ = 1 if x > 0 else -1
        arm = m.knoch(f"fluegel_{seite}", [x, 26, -6], "rumpf")
        arm.kasten([x if x > 0 else x - 18, 25, -7], [18, 3, 3], "knochen")
        arm.kasten([x if x > 0 else x - 18, 25.5, -4], [18, 1, 20], "haut")
        finger = m.knoch(f"fluegelspitze_{seite}", [x + 18 * z_, 26, -6], f"fluegel_{seite}")
        fx = x + 18 * z_
        finger.kasten([fx if x > 0 else fx - 22, 25, -6.5], [22, 2, 2], "knochen")
        finger.kasten([fx if x > 0 else fx - 22, 25.5, -4.5], [22, 1, 24], "haut")
        finger.kasten([fx + (20 if x > 0 else -22), 25, -8], [2, 2, 2], "kralle")
    # Zwei kraeftige Beine mit Knie und Krallenfuss.
    for seite, x in (("links", 5), ("rechts", -5)):
        bein = m.knoch(f"bein_{seite}", [x, 16, 3], "rumpf")
        bein.kasten([x - 2.5, 8, 0], [5, 9, 6], "schuppen")
        unter = m.knoch(f"unterbein_{seite}", [x, 9, 3], f"bein_{seite}")
        unter.kasten([x - 1.5, 2, 2], [3, 8, 3], "schuppen")
        unter.kasten([x - 2.5, 0, -2], [5, 2, 7], "fuss")
        for i in range(3):
            unter.kasten([x - 2.5 + i * 2, 0, -3], [1, 1, 1], "kralle")
    return m


LINDWURM_FARBEN = {
    # Schuppen, Schuppen dunkel, Bauch, Flughaut, Augen
    "gruen":   ("#3a5a2e", "#243a1e", "#c0b078", "#5a4a2e", "#ffa21a"),
    "rot":     ("#7a2420", "#4a1412", "#d8b050", "#6a2a1e", "#ffd21a"),
    "schwarz": ("#26262c", "#141418", "#6a5a78", "#2e2a36", "#b86aff"),
}


def lindwurm_maler(variante):
    schuppen, dunkel, bauch, haut, augen = LINDWURM_FARBEN.get(variante, LINDWURM_FARBEN["gruen"])

    def male(stoff, p, n, texel):
        x, y, z = p
        if stoff in ("schuppen", "kopf", "schnauze"):
            if stoff == "kopf":
                for ax in (-4.5, 4.5):
                    if abs(n[0]) > 0.5 and x * ax > 0 and abs(y - 27.5) < 0.6 and abs(z + 41) < 1.1:
                        return glut(augen) if abs(z + 41) > 0.4 else hexfarbe("#140a04")
            if stoff == "schnauze" and n[2] < -0.5 and y > 26.5 and abs(x) > 1.5:
                return hexfarbe("#140c08")                                    # Nuestern
            if n[1] < -0.5:
                # Der Bauch in Querschilden.
                return ton(bauch, p, n, texel, 871, straehne=0.0, hell=-0.12 if int(z) % 2 == 0 else 0.0)
            # Schuppen im Versatz: zwei mal zwei, jede zweite Reihe verschoben.
            reihe = int(math.floor(y / 2))
            spalte = int(math.floor((texel[0] + reihe) / 2))
            if (spalte + reihe) % 3 == 0:
                return ton(dunkel, p, n, texel, 872, straehne=0.0)
            return ton(schuppen, p, n, texel, 873, straehne=0.0, hell=0.06 if n[1] > 0.5 else 0.0)
        if stoff == "bauch":
            return ton(bauch, p, n, texel, 874, straehne=0.0, hell=-0.12 if int(z) % 2 == 0 else 0.0)
        if stoff == "braue":
            return ton(dunkel, p, n, texel, 875, straehne=0.0)
        if stoff in ("horn", "kralle"):
            return ton("#d8ccb0", p, n, texel, 876, straehne=0.0, hell=-0.25 if stoff == "kralle" else 0.0)
        if stoff == "kiefer":
            if n[1] > 0.5 and (abs(x) > 2.5 or z < -48.5) and texel[0] % 2 == 0:
                return hexfarbe("#f0e8d4")                                    # Zaehne
            if n[1] > 0.5:
                return ton("#6a1a1a", p, n, texel, 877, straehne=0.0)
            return ton(bauch if n[1] < -0.5 else schuppen, p, n, texel, 878, straehne=0.0)
        if stoff == "zacke":
            return ton(dunkel, p, n, texel, 879, straehne=0.0, hell=-0.1)
        if stoff == "spitze":
            # Die Pfeilspitze am Schwanz: vorn breit, hinten spitz.
            if abs(x) > 4 - (z - 55) * 0.66:
                return None
            return ton(dunkel, p, n, texel, 880, straehne=0.0)
        if stoff == "knochen":
            return ton(dunkel, p, n, texel, 881, straehne=0.0, hell=0.1)
        if stoff == "haut":
            # Flughaut mit Adern; die Hinterkante in Boegen ausgeschnitten.
            hinten = z - (-4.5)
            # Zur Spitze hin laeuft die Schwinge schmal zu.
            tiefe = 20 if abs(x) < 25 else 24 - (abs(x) - 25) * 0.8
            bogen = abs(math.sin(abs(x) / 6.5 * math.pi)) * 3.5
            if hinten > tiefe - bogen:
                return None
            if texel[0] % 6 == 0:
                return ton(dunkel, p, n, texel, 882, straehne=0.0, hell=0.15)
            return ton(haut, p, n, texel, 883, straehne=0.0, hell=-0.05 if n[1] < 0 else 0.05)
        if stoff == "fuss":
            return ton(dunkel, p, n, texel, 884, straehne=0.0)
        return ton(schuppen, p, n, texel, 885)
    return male
