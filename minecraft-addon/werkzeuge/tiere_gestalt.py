#!/usr/bin/env python3
"""Gestalt, Haut und Bewegung der zwoelf Tiere.

Jedes Tier ist hier eine Funktion, die sein Modell baut, und eine, die
sein Fell malt. Masse in Minecraft-Einheiten: 16 sind ein Block, y ist
oben, vorn ist -z (dorthin schaut der Kopf).

Zweite Fassung (4.36). Fynn: "Farben, die sich nicht ganz so stark
unterscheiden, damit das nicht so gepunktet aussieht ... mehr Detail, ein
bisschen 3D, ein bisschen besonderer."

* Farben: kein Tupfer mehr. Jede Flaeche bekommt ihren Ton aus einer
  Grundfarbe, die sich nur in kleinen Schritten (3 bis 4 Prozent) aendert:
  oben etwas heller, unten etwas dunkler, grosse weiche Wolken und feine
  senkrechte Fellstraehnen - so wie Mojangs Wolf oder Kuh. Aus der Naehe
  sieht man Struktur, von weitem eine ruhige Flaeche.
* Was man lesen soll, ist scharf: Augen mit Glanzpunkt, Nase, Maul,
  Pfoten, Hufe, Krallen, Streifen.
* Mehr 3D: Nasen, Brauen, Wangen, Krallen, Zaehne, Hauer, Ohren mit
  Innenseite, Buckel und Ruecken aus mehreren Kaesten, damit die Tiere
  runder werden und nicht wie Kisten aussehen.
"""

import math

from tiermodell import Modell, hexfarbe, mische, streu, wolken


# ------------------------------------------------------------ Malhilfen

def ton(farbe, p, n, texel, saat=0, hell=0.0, wolke=0.06, straehne=0.035, stufe=0.035):
    """Die Farbe dieses Punkts: Grundfarbe, leicht aufgehellt oder
    abgedunkelt - in kleinen Stufen, damit es ruhig bleibt."""
    if isinstance(farbe, str):
        farbe = hexfarbe(farbe)
    f = 1.0 + hell + 0.06 * n[1]
    f += wolke * 2 * (wolken(p, 8.0, saat, 1) - 0.5)
    # Fellstraehnen: eine ganze Spalte des Bildes etwas heller oder dunkler.
    f += straehne * 2 * (streu(texel[0], saat) - 0.5)
    f = round(f / stufe) * stufe
    return tuple(max(0, min(255, int(round(c * f)))) for c in farbe)


def nah(p, mitte, halb):
    """Liegt p im Kasten um mitte mit den halben Kantenlaengen halb?"""
    return all(abs(p[i] - mitte[i]) <= halb[i] for i in range(3))


# Beim Malen der Jungtiere gesetzt: dann werden die Augen gross und
# glaenzend - wie bei Mojangs neuen, suesseren Tierbabys.
JUNG = False


def auge(p, n, orte, iris="#1a120c", halb=(0.5, 0.5, 0.5), ring=None, gross=False):
    """Ein Auge, Bildpunkt fuer Bildpunkt auf genau einer Seite des Kopfes.

    Fynn: "An die Augen musst du noch mal ran." Vorher war es eine Wolke um
    einen Punkt im Raum: Bei dunklem Fell verschwanden dunkle Pupille und
    dunkle Iris ganz (Elch, Bison, Wildschwein), und die Jungtiere hatten
    tiefschwarze Klumpen von zwei mal zwei Punkten - bei Loewe und Tiger
    sah das aus wie ein Panda.

    Jetzt ein festes Muster, gezaehlt von der Augenmitte aus:
      Alttier:  vorn/innen die Pupille, hinten/aussen die Iris.
      Jungtier: zwei Reihen - vorn die Pupille, hinten unten die Iris,
                hinten oben ein heller Glanzpunkt.
    Grosse Koepfe (gross) bekommen das zweireihige Auge auch als Alttier:
    Auf dem Elchkopf war eine einzelne Reihe aus der Naehe gerade noch zu
    finden, aus Spielentfernung nicht mehr.
    Mit ring bekommt das Auge darunter einen hellen Lidrand. Den brauchen
    die Tiere mit dunklem Fell, sonst ist das Auge nicht zu finden.

    "Vorn" heisst auf der Kopfseite zur Schnauze hin, auf dem Gesicht zur
    Mitte hin - so schauen die Augen nach vorn."""
    if abs(n[0]) > 0.5:
        achse, quer = 0, 2          # Kopfseite: waagerecht laeuft z
    elif n[2] < -0.5:
        achse, quer = 2, 0          # Gesicht: waagerecht laeuft x
    else:
        return None
    for o in orte:
        if (p[0] < 0) != (o[0] < 0):
            continue
        if abs(p[achse] - o[achse]) > halb[achse] + 0.05:
            continue
        # Nach hinten bzw. nach aussen positiv.
        h = p[2] - o[2] if quer == 2 else abs(p[0]) - abs(o[0])
        i = math.floor(h + 1e-6)
        j = math.floor(p[1] - o[1] + 0.5 + 1e-6)
        if i not in (-1, 0):
            continue
        if JUNG or gross:
            if j == 1:
                return hexfarbe("#0c0908") if i == -1 else hexfarbe("#f4f0e6")
            if j == 0:
                if i == -1:
                    return hexfarbe("#0c0908")
                # Jungtiere haben helleres Fell als die Alten; mit der Iris
                # der Alten blieb vom Auge nur ein schwarzer Strich uebrig.
                return mische(hexfarbe(iris), (232, 216, 192), 0.3) if JUNG else hexfarbe(iris)
        elif j == 0:
            return hexfarbe("#0c0908") if i == -1 else hexfarbe(iris)
        if j == -1 and ring:
            return hexfarbe(ring)
    return None


def paar(knochen, ursprung, groesse, stoff, **weiter):
    """Ein Kasten und sein Spiegelbild an der Mittelebene x = 0."""
    knochen.kasten(ursprung, groesse, stoff, **weiter)
    gespiegelt = [-ursprung[0] - groesse[0], ursprung[1], ursprung[2]]
    if weiter.get("drehung"):
        d = weiter["drehung"]
        weiter = dict(weiter, drehung=[d[0], -d[1], -d[2]])
        if weiter.get("drehpunkt"):
            dp = weiter["drehpunkt"]
            weiter["drehpunkt"] = [-dp[0], dp[1], dp[2]]
    knochen.kasten(gespiegelt, groesse, stoff, **weiter)


def beine(m, eltern, x, z_vorn, z_hinten, groesse, huefte, stoff="bein", pfote=None, krallen=False, knie=0.45):
    """Vier Beine: leg0 vorn links, leg1 vorn rechts, leg2 hinten links,
    leg3 hinten rechts. pfote: (Breite, Hoehe, Tiefe) eines breiteren
    Fusses unten; krallen: drei kleine Krallen vorn an jedem Fuss.

    Jedes Bein hat ein Knie (knie0 bis knie3) auf knie mal Beinhoehe -
    Fynn: "Vielleicht brauchst du noch ein Gelenk, ein bisschen Knie-
    maessig." Der Unterschenkel reicht einen Pixel in den Oberschenkel
    hinein und ist einen Hauch duenner: So klafft beim Einknicken keine
    Luecke, und gerade flimmert nichts."""
    w, h, d = groesse
    kh = max(2, round(h * knie))
    for i, (name, bx, bz) in enumerate((("leg0", x, z_vorn), ("leg1", -x, z_vorn),
                                        ("leg2", x, z_hinten), ("leg3", -x, z_hinten))):
        b = m.knoch(name, [bx, huefte, bz], eltern)
        b.kasten([bx - w / 2, huefte - h + kh, bz - d / 2], [w, h - kh, d], stoff)
        u = m.knoch(f"knie{i}", [bx, huefte - h + kh, bz], name)
        u.kasten([bx - w / 2, huefte - h, bz - d / 2], [w, kh + 1, d], stoff, aufblasen=-0.12)
        if pfote:
            pw, ph, pd = pfote
            vorne = bz - d / 2 - (pd - d)
            u.kasten([bx - pw / 2, huefte - h, vorne], [pw, ph, pd], "pfote")
            if krallen:
                for j in range(3):
                    kx = bx - pw / 2 + 0.5 + j * (pw - 2) / 2
                    u.kasten([kx, huefte - h, vorne - 1], [1, 1, 1], "kralle")


VIERBEINER = [("leg0", 1), ("leg1", -1), ("leg2", -1), ("leg3", 1)]


# ================================================================== Braunbaer

BAER_FARBEN = {
    # Fell, Beine, Schnauze, Buckel
    "braun":   ("#80542f", "#553820", "#a8845a", "#8f6038"),
    "grizzly": ("#8a6a48", "#50382a", "#b89a74", "#b09878"),
    "schwarz": ("#34302c", "#221e1c", "#9a7a56", "#3c3632"),
}


def baer_modell():
    m = Modell("braunbaer", sichtbreite=3, sichthoehe=2.5)
    body = m.knoch("body", [0, 17, 0])
    body.kasten([-7, 10, -12], [14, 13, 24], "fell")
    body.kasten([-6, 9, -10], [12, 1, 19], "bauch")
    body.kasten([-6, 23, -9], [12, 1, 20], "fell")
    body.kasten([-6, 11, 12], [12, 11, 1], "fell")
    # Der Schulterbuckel - daran erkennt man den Braunbaeren.
    body.kasten([-6, 23, -12], [12, 3, 8], "buckel")
    body.kasten([-5, 26, -11], [10, 1, 6], "buckel")
    kopf = m.knoch("head", [0, 19, -12], "body")
    kopf.kasten([-5, 15, -20], [10, 9, 8], "kopf")
    paar(kopf, [5, 15, -18], [1, 5, 5], "wange")
    kopf.kasten([-4, 22, -21], [8, 1, 1], "braue")
    kopf.kasten([-3, 15, -24], [6, 5, 4], "schnauze")
    kopf.kasten([-1, 19, -25], [2, 1, 1], "nase")
    paar(kopf, [2.5, 23, -17], [3, 3, 2], "ohr")
    m.knoch("tail", [0, 20, 13], "body").kasten([-1.5, 18, 13], [3, 3, 2], "fell")
    beine(m, "body", 4.5, -7.5, 8, (5, 12, 5), 12, pfote=(6, 2, 6), krallen=True)
    return m


def baer_maler(variante):
    fell, bein, schnauze, buckel = BAER_FARBEN[variante]

    def f(stoff, p, n, texel):
        if stoff == "kralle":
            return hexfarbe("#d8ccb0") if variante != "schwarz" else hexfarbe("#b8ac94")
        if stoff == "pfote":
            if n[1] < -0.5:
                return hexfarbe("#241a14")                  # Ballen
            return ton(bein, p, n, texel, 3, hell=-0.08)
        if stoff == "bein":
            return ton(bein, p, n, texel, 3, hell=0.12 * (p[1] - 6) / 6)
        if stoff == "nase":
            return hexfarbe("#16100c") if n[1] <= 0.5 else hexfarbe("#3a2c24")
        if stoff == "schnauze":
            if n[2] < -0.5 and p[1] < 16:
                return hexfarbe("#3a2616")                  # Maul
            return ton(schnauze, p, n, texel, 5, straehne=0.02)
        if stoff == "kopf":
            a = auge(p, n, [(-3.5, 20.5, -20), (3.5, 20.5, -20)], "#8a5a2a")
            if a and n[2] < -0.5:
                return a
            return ton(fell, p, n, texel, 7)
        if stoff in ("wange", "braue"):
            return ton(fell, p, n, texel, 9, hell=0.04)
        if stoff == "ohr":
            if n[2] < -0.5 and abs(abs(p[0]) - 4) < 0.6 and p[1] < 25:
                return ton(bein, p, n, texel, 9, hell=-0.1)  # Ohr innen
            return ton(fell, p, n, texel, 9)
        if stoff == "buckel":
            return ton(buckel, p, n, texel, 11, hell=0.05)
        if stoff == "bauch":
            return ton(fell, p, n, texel, 13, hell=-0.1)
        # Rumpf: der Ruecken heller, die Flanken nach unten dunkler.
        return ton(fell, p, n, texel, 1, hell=0.05 - 0.12 * (23 - p[1]) / 13)
    return f


# ================================================================== Elch

ELCH_FARBEN = {
    # Fell, Beine (Struempfe), Schnauze
    "bulle": ("#4e3524", "#8c7c68", "#3e2a1c"),
    "kuh":   ("#5c4030", "#978774", "#4a3322"),
    "kalb":  ("#98603a", "#b08c6c", "#7a4a2a"),
}


def elch_modell():
    m = Modell("elch", sichtbreite=3.5, sichthoehe=3.5)
    body = m.knoch("body", [0, 23, 0])
    body.kasten([-6, 17, -13], [12, 12, 26], "fell")
    body.kasten([-5, 16, -11], [10, 1, 22], "bauch")
    body.kasten([-5, 28, -13], [10, 4, 11], "buckel")
    body.kasten([-4, 32, -12], [8, 1, 8], "buckel")
    body.kasten([-5, 18, 13], [10, 10, 1], "fell")
    kopf = m.knoch("head", [0, 26, -12], "body")
    kopf.kasten([-3, 20, -18], [6, 10, 7], "hals")
    kopf.kasten([-1, 30, -18], [2, 1, 6], "maehne")
    kopf.kasten([-3.5, 26, -24], [7, 6, 8], "kopf")
    kopf.kasten([-3, 22, -31], [6, 7, 8], "schnauze")
    # Die ueberhaengende Oberlippe - die dicke Elchnase.
    kopf.kasten([-3.5, 25, -33], [7, 4, 3], "lippe")
    # Die Glocke haengt in die Schnauze hinein statt nur an deren Kante:
    # vorher beruehrten sich die beiden an einer Linie, und von der Seite
    # sah es aus, als schwebe ein Strich unter dem Kopf. Eigener Knochen,
    # damit das Kalb eine kleine bekommen kann - junge Elche haben kaum eine.
    glocke = m.knoch("glocke", [0, 23, -23], "head")
    glocke.kasten([-1, 15, -25], [2, 9, 2], "glocke")
    paar(kopf, [3.5, 30, -21], [4, 2, 1], "ohr", drehung=[0, 0, -20], drehpunkt=[3.5, 31, -20.5])
    geweih = m.knoch("geweih", [0, 32, -20], "head")
    # Das Schaufelgeweih: Stange, breite Schaufel, Zacken am Rand.
    kippen = dict(drehung=[0, 0, -22], drehpunkt=[7, 32.5, -22])
    paar(geweih, [3, 31, -21], [3, 2, 2], "geweih")
    paar(geweih, [5, 32, -22], [3, 2, 2], "geweih")
    paar(geweih, [7, 32, -27], [8, 1, 9], "schaufel", **kippen)
    for z in (-27, -24, -21, -19):
        paar(geweih, [14, 33, z], [1, 3, 1], "zacke", **kippen)
    paar(geweih, [8, 33, -28], [1, 3, 1], "zacke", **kippen)
    paar(geweih, [11, 33, -28], [1, 2, 1], "zacke", **kippen)
    m.knoch("tail", [0, 27, 13], "body").kasten([-1.5, 24, 13], [3, 3, 1], "fell")
    beine(m, "body", 4, -9, 9, (4, 18, 4), 18, pfote=(4, 2, 5))
    reitzeug(m)
    return m


def reitzeug(m):
    """Sattel und zwei Rucksaecke an den Flanken. Das Spiel zeigt sie nur,
    wenn der Elch gesattelt ist bzw. Rucksaecke traegt (part_visibility in
    der Darstellung, tiere_bauen.steuerung)."""
    sattel = m.knoch("sattel", [0, 29, 3], "body")
    # Hinter dem Buckel: eine Satteldecke, die an den Seiten herabfaellt,
    # darauf der Ledersitz mit Knauf und hinterer Lehne, Steigbuegel.
    sattel.kasten([-6.5, 29, -2], [13, 1, 10], "decke")
    paar(sattel, [6, 24, -1], [1, 5, 8], "decke")
    sattel.kasten([-4, 30, 0], [8, 1, 6], "sitz")
    sattel.kasten([-2, 30, -1], [4, 2, 1], "sitz")
    sattel.kasten([-0.5, 32, -1], [1, 1, 1], "knauf")
    sattel.kasten([-3, 30, 6], [6, 2, 1], "sitz")
    paar(sattel, [6.5, 19, 2], [1, 5, 1], "riemen")
    paar(sattel, [6.5, 17, 1.5], [1, 2, 2], "buegel")
    # Die Rucksaecke an den Flanken sind dieselben wie auf dem Ruecken des
    # Spielers (rucksack_bauen.rucksack) - der Knochen ist um 90 Grad
    # gedreht, damit die Aussentasche nach aussen zeigt.
    import rucksack_bauen
    for name, seite in (("tasche_links", 1), ("tasche_rechts", -1)):
        t = m.knoch(name, TASCHE[name], "body", drehung=[0, 90 * seite, 0])
        rucksack_bauen.rucksack(t, TASCHE[name], 1, vorsilbe="rs_")


# Wo die Rucksaecke am Elch haengen: Rueckwand an der Flanke (hinter der
# Satteldecke), mittig ueber den Hinterbeinen.
TASCHE = {"tasche_links": (7, 19, 10.5), "tasche_rechts": (-7, 19, 10.5)}


# Das Reitzeug: dunkles Leder, Messing, eine rote Decke - die Rucksaecke in
# denselben Farben wie der Rucksack des Spielers (rucksack_bauen.py).
REITZEUG = {"decke": "#8a2e2a", "sitz": "#5a3820", "knauf": "#c8a050", "riemen": "#3e2616", "buegel": "#8a8e96",
            "tasche": "#9a6438", "tasche_fach": "#8a5630", "tasche_klappe": "#6e4424", "schnalle": "#c8a050",
            "rolle": "#3e5a3a"}


def reitzeug_maler(stoff, p, n, texel):
    if stoff.startswith("rs_"):
        import rucksack_bauen
        # Die Seite am Ort erkennen: links liegt alles bei x > 0.
        name = "tasche_links" if p[0] > 0 else "tasche_rechts"
        return rucksack_bauen.maler(TASCHE[name], 1, "rs_")(stoff, p, n, texel)
    if stoff not in REITZEUG:
        return False
    if stoff == "decke" and abs(p[1] - 24.5) < 0.5:
        return ton("#d8b060", p, n, texel, 81, straehne=0.0)          # goldene Borte unten
    if stoff == "rolle" and abs(p[2] - 9.0) < 0.5:
        return ton("#3e2616", p, n, texel, 83, straehne=0.0)          # Riemen um die Rolle
    if stoff == "tasche" and n[1] < 0.5 and abs(p[1] - 22.5) < 0.5:
        return ton("#5e3a20", p, n, texel, 85, straehne=0.0)          # Naht
    return ton(REITZEUG[stoff], p, n, texel, 87, straehne=0.02, hell=0.05 if n[1] > 0.5 else 0.0)


def elch_maler(variante):
    fell, bein, schnauze = ELCH_FARBEN[variante]

    def f(stoff, p, n, texel):
        zeug = reitzeug_maler(stoff, p, n, texel)
        if zeug is not False:
            return zeug
        if stoff in ("geweih", "schaufel", "zacke"):
            hell = 0.08 if stoff == "zacke" else (-0.04 if n[1] < 0 else 0.0)
            return ton("#cdbb92", p, n, texel, 21, hell=hell, straehne=0.02)
        if stoff == "pfote":
            return hexfarbe("#2a221a") if n[1] < 0.5 else hexfarbe("#3a2f24")   # Hufe
        if stoff == "bein":
            # Oben am Koerper dunkel, unten die hellen Struempfe.
            return ton(bein if p[1] < 12 else fell, p, n, texel, 23)
        if stoff == "lippe":
            if n[2] < -0.5 and nah(p, (0, 26.5, -33), (2.6, 0.6, 1)) and abs(p[0]) > 0.8:
                return hexfarbe("#120c08")                  # Nuestern
            return ton(schnauze, p, n, texel, 25, hell=0.05)
        if stoff == "schnauze":
            return ton(schnauze, p, n, texel, 25)
        if stoff == "kopf":
            a = auge(p, n, [(-3.5, 29.5, -22), (3.5, 29.5, -22)], "#7a4a24", ring="#9a7a5c", gross=True)
            if a and abs(n[0]) > 0.5:
                return a
            return ton(fell, p, n, texel, 27, hell=0.04)
        if stoff == "ohr":
            return ton(fell, p, n, texel, 31, hell=0.08 if n[1] > 0 else -0.05)
        if stoff in ("hals", "glocke", "maehne"):
            return ton(fell, p, n, texel, 29, hell=-0.08)
        if stoff == "buckel":
            return ton(fell, p, n, texel, 35, hell=-0.04)
        if stoff == "bauch":
            return ton(fell, p, n, texel, 37, hell=-0.12)
        return ton(fell, p, n, texel, 33, hell=0.03 - 0.1 * (29 - p[1]) / 12)
    return f


# ================================================================== Wildschwein

def wildschwein_modell():
    m = Modell("wildschwein", sichtbreite=2, sichthoehe=1.5)
    body = m.knoch("body", [0, 11, 0])
    body.kasten([-5, 6, -10], [10, 10, 20], "fell")
    body.kasten([-4, 5, -8], [8, 1, 16], "bauch")
    # Der hohe Nacken und der Borstenkamm auf dem Ruecken.
    body.kasten([-4.5, 16, -10], [9, 2, 8], "nacken")
    body.kasten([-1, 18, -10], [2, 1, 6], "borsten")
    body.kasten([-1, 16, -2], [2, 1, 10], "borsten")
    kopf = m.knoch("head", [0, 12, -10], "body")
    kopf.kasten([-4, 6, -16], [8, 8, 6], "kopf")
    kopf.kasten([-3, 6, -19], [6, 6, 3], "kopf")
    kopf.kasten([-2, 6, -22], [4, 4, 3], "ruessel")
    kopf.kasten([-2, 6, -23], [4, 4, 1], "scheibe")
    # Hauer: aus dem Maul heraus und nach oben gebogen.
    paar(kopf, [2, 7, -21], [1, 2, 1], "hauer")
    paar(kopf, [2, 9, -22], [1, 1, 1], "hauer")
    paar(kopf, [2, 13, -12], [2, 3, 1], "ohr", drehung=[-15, 0, -15], drehpunkt=[3, 13, -11.5])
    schwanz = m.knoch("tail", [0, 15, 10], "body", drehung=[20, 0, 0])
    schwanz.kasten([-0.5, 10, 10], [1, 5, 1], "borsten")
    schwanz.kasten([-1, 9, 9.5], [2, 2, 2], "borsten")
    beine(m, "body", 3, -7, 7, (3, 6, 3), 6, pfote=(3, 1, 4))
    return m


def wildschwein_maler(variante):
    frischling = variante == "frischling"
    fell = "#8e643c" if frischling else "#5e4e40"
    borsten = "#5e3e22" if frischling else "#2e2620"
    streif = "#cfae7c"

    def f(stoff, p, n, texel):
        if stoff == "hauer":
            return hexfarbe("#eee6d2") if p[1] > 8 else hexfarbe("#d8ceb4")
        if stoff == "scheibe":
            if n[2] < -0.5:
                if 0.4 < abs(p[0]) < 1.6 and 7 < p[1] < 9:
                    return hexfarbe("#3a2420")               # Nasenloecher
                return hexfarbe("#a88478")                   # Ruesselscheibe
            return hexfarbe("#8a6a60")
        if stoff == "ruessel":
            return ton(fell, p, n, texel, 41, hell=0.06)
        if stoff == "kopf":
            a = auge(p, n, [(-3, 11.5, -16), (3, 11.5, -16)], "#6a4a2a", ring="#8a7058", gross=True)
            if a and n[2] < -0.5:
                return a
            return ton(fell, p, n, texel, 43)
        if stoff == "pfote":
            return hexfarbe("#1e1812")
        if stoff in ("borsten", "nacken", "ohr"):
            return ton(borsten, p, n, texel, 45, straehne=0.05)
        if stoff == "bauch":
            return ton(fell, p, n, texel, 47, hell=-0.12)
        if frischling and stoff == "fell" and n[2] == 0:
            # Frischlinge tragen helle Laengsstreifen, vom Kopf zum Schwanz.
            quer = p[0] if n[1] > 0.5 else p[1]
            if int(round(quer)) % 3 == 0:
                return ton(streif, p, n, texel, 49, straehne=0.0)
        return ton(fell, p, n, texel, 51, hell=0.03 - 0.08 * (16 - p[1]) / 10)
    return f


# ================================================================== Bison

def bison_modell():
    """Der Bison, dritte Fassung (Fynn: "wirklich deutlich mehr Detail ...
    bisschen realistischer, bisschen groesser"). Wie der echte
    Praeriebison: vorn ein maechtiger Pelzmantel mit einem Buckel ueber den
    Schultern, der Kopf tief und breit mit Stirnpelz und Bart, kurze nach
    oben gebogene Hoerner; hinten schmaler, mit kurzem Fell; lange Zotteln
    an den Vorderbeinen; ein duenner Schwanz mit Quaste. Etwa ein Sechstel
    groesser als vorher - der Buckel reicht jetzt ueber zwei Bloecke."""
    m = Modell("bison", sichtbreite=4, sichthoehe=3.2)
    body = m.knoch("body", [0, 20, 0])
    body.kasten([-9.5, 12, -17], [19, 19, 16], "zottel")        # der Pelzmantel vorn
    body.kasten([-8.5, 31, -16], [17, 3, 13], "zottel")          # Buckel, in Stufen gerundet
    body.kasten([-6.5, 34, -15], [13, 2, 10], "zottel")
    body.kasten([-4, 36, -13], [8, 1, 6], "zottel")
    body.kasten([-7, 9, -16], [14, 3, 12], "zottel")             # Fransen unter der Brust
    body.kasten([-7.5, 13, -1], [15, 15, 14], "fell")            # hinten: kurzes Fell
    body.kasten([-6.5, 28, -1], [13, 2, 8], "fell")              # der Ruecken faellt vom Buckel ab
    body.kasten([-6.5, 12, -1], [13, 1, 13], "bauch")
    body.kasten([-7, 14, 13], [14, 13, 2], "fell")               # Keule
    paar(body, [7.5, 16, 5], [1, 9, 6], "fell")                  # Oberschenkel treten hervor
    kopf = m.knoch("head", [0, 22, -17], "body")
    kopf.kasten([-5.5, 8, -26], [11, 13, 9], "kopf")
    kopf.kasten([-6.5, 18, -26.5], [13, 6, 9], "stirnpelz")      # der dicke Pelz auf der Stirn
    kopf.kasten([-5.5, 24, -25.5], [11, 1, 7], "stirnpelz")      # oben gerundet
    kopf.kasten([-3.5, 8, -28], [7, 6, 2], "nase")
    kopf.kasten([-3.5, 2, -25], [7, 6, 6], "bart")
    kopf.kasten([-2.5, 1, -24], [5, 1, 4], "bart")
    paar(kopf, [5.5, 9, -25], [1, 9, 7], "stirnpelz")             # Backenbart
    paar(kopf, [6, 15, -21], [2, 1, 2], "ohr")
    paar(kopf, [6, 18, -22], [2, 2, 2], "horn")
    paar(kopf, [7.5, 19, -22], [2, 3, 2], "horn", drehung=[0, 0, -25], drehpunkt=[8.5, 19.5, -21])
    paar(kopf, [8.3, 21.5, -21.8], [1, 2, 1], "hornspitze", drehung=[-10, 0, -10], drehpunkt=[8.8, 21.5, -21.3])
    schwanz = m.knoch("tail", [0, 26, 15], "body")
    schwanz.kasten([-0.5, 16, 15], [1, 10, 1], "fell")
    schwanz.kasten([-1, 12, 14.5], [2, 4, 2], "quaste")
    beine(m, "body", 5, -10, 10, (5, 13, 5), 13, pfote=(5, 2, 6))
    # Die "Pluderhosen": langes Fell an den Vorderbeinen, bis zum Knie.
    for name, x in (("leg0", 5), ("leg1", -5)):
        m.finde(name).kasten([x - 3, 6, -13], [6, 7, 6], "zottel")
    return m


# Farben je Variante: Pelzmantel, Buckel und Stirn (von der Sonne
# ausgeblichen), Hinterteil, Beine, Nase.
BISON_FARBEN = {
    "prarie": ("#36221a", "#8a6238", "#8c6642", "#2a1c14", "#1a1410"),
    "winter": ("#36221a", "#8a6238", "#8c6642", "#2a1c14", "#1a1410"),
    "wald":   ("#241610", "#5e4028", "#62462e", "#1e140e", "#141010"),
    "weiss":  ("#cfc6b4", "#ece6d8", "#e0d8c8", "#aca290", "#8a7068"),
    "kalb":   ("#a0643a", "#c08450", "#b07446", "#7a4c2c", "#3a2a22"),
}


def weich(a, b, t, stufen=4):
    """Von Farbe a nach b, t zwischen 0 und 1, in wenigen Stufen - ein
    Uebergang, keine Kante und kein Rauschen."""
    t = max(0.0, min(1.0, t))
    a = hexfarbe(a) if isinstance(a, str) else a
    b = hexfarbe(b) if isinstance(b, str) else b
    return mische(a, b, round(t * stufen) / stufen)


def wuerfel(p, saat, stark=0.09):
    """Kleine Flecken aus 2 und 4 Pixeln - Fell, das lebt, ohne Striche."""
    return ((streu(p[0] // 4, p[1] // 4, p[2] // 4, saat) - 0.5) * stark
            + (streu(p[0] // 2, p[1] // 2, p[2] // 2, saat + 1) - 0.5) * stark * 0.6)


def bison_maler(variante):
    mantel, buckel, hinten, bein, nase = BISON_FARBEN[variante]
    winter = variante == "winter"
    weiss = variante == "weiss"

    def fell(farbe, p, n, texel, saat, hell=0.0):
        if winter and n[1] > 0.2 and wolken(p, 6.0, 51, 1) > 0.38:
            # Raureif: grosse weiche Flaechen oben auf dem Pelz, nach aussen
            # duenner werdend - keine Tupfen.
            staerke = min(1.0, (wolken(p, 6.0, 51, 1) - 0.38) * 5)
            farbe = mische(farbe, hexfarbe("#e8eef2"), round(staerke * 3) / 3 * 0.85)
        return ton(farbe, p, n, texel, saat, hell=hell + wuerfel(p, saat), straehne=0.0, wolke=0.04)

    def f(stoff, p, n, texel):
        # Vom dunklen Mantel vorn zum helleren Hinterteil, weich ueber
        # sechs Pixel; oben auf Buckel und Stirn von der Sonne heller.
        vorn_hinten = (p[2] + 3) / 7
        oben = (p[1] - 27) / 9
        grund = weich(mantel, hinten, vorn_hinten)
        if stoff == "hornspitze":
            return hexfarbe("#1c1a18")
        if stoff == "horn":
            return ton("#6e665a" if not weiss else "#7a7064", p, n, texel, 53, straehne=0.0,
                       hell=0.06 if n[1] > 0.5 else 0.0)
        if stoff == "pfote":
            if n[2] < -0.5 and abs(p[0] % 5 - 2.5) < 0.6:
                return hexfarbe("#0c0908")                           # der Spalt im Huf
            return ton("#1c1612", p, n, texel, 54, straehne=0.0, hell=0.06 if n[1] > 0.5 else 0.0)
        if stoff == "nase":
            if n[2] < -0.5 and 1.0 < abs(p[0]) < 2.0 and 10.5 < p[1] < 12.5:
                return hexfarbe("#0a0605")                           # Nuestern
            if n[2] < -0.5 and p[1] < 9.5:
                return ton("#3a2a24", p, n, texel, 55, straehne=0.0)  # Maul
            return ton(nase, p, n, texel, 56, straehne=0.0, hell=0.05 if n[1] > 0.5 else 0.0)
        if stoff == "kopf":
            return fell(weich(mantel, nase, 0.35), p, n, texel, 57)
        if stoff == "ohr":
            return fell(weich(mantel, nase, 0.5), p, n, texel, 58)
        if stoff == "stirnpelz":
            # Das Auge sitzt aussen auf dem Backenbart, gleich unter dem
            # Stirnpelz - wie beim echten Bison, dem es aus dem Fell guckt.
            # Auf dem Kopf darunter lag es verdeckt und war nie zu sehen.
            if p[1] < 18:
                a = auge(p, n, [(-6.5, 16.5, -23), (6.5, 16.5, -23)], "#8a5a30", ring="#9a7a58", gross=True)
                if a:
                    return a
            # Oben hell ausgeblichen, zu den Augen hin dunkler.
            return fell(weich(mantel, buckel, (p[1] - 17) / 7), p, n, texel, 59)
        if stoff == "bart":
            return fell(weich(mantel, bein, 0.8), p, n, texel, 60, hell=-0.04)
        if stoff == "quaste":
            return fell(bein, p, n, texel, 61)
        if stoff == "zottel":
            if p[1] < 12.5 and stoff == "zottel" and abs(p[0]) < 7.5 and p[2] < -3:
                return fell(weich(mantel, bein, 0.4), p, n, texel, 62)   # Brustfransen
            return fell(weich(grund, buckel, oben), p, n, texel, 63)
        if stoff == "bein":
            return fell(weich(bein, mantel, (p[1] - 4) / 10), p, n, texel, 64)
        if stoff == "bauch":
            return fell(weich(grund, bein, 0.5), p, n, texel, 65)
        # Das Hinterteil: kurzes Fell, oben etwas heller.
        return fell(weich(grund, buckel, (p[1] - 20) / 16), p, n, texel, 66)
    return f


# ================================================================== Loewe

def loewe_modell():
    m = Modell("loewe", sichtbreite=2.5, sichthoehe=2)
    body = m.knoch("body", [0, 14, 0])
    body.kasten([-5, 9, -11], [10, 9, 22], "fell")
    body.kasten([-4, 8, -9], [8, 1, 18], "bauch")
    body.kasten([-4, 18, -10], [8, 1, 20], "fell")
    kopf = m.knoch("head", [0, 16, -11], "body")
    kopf.kasten([-4, 13, -18], [8, 8, 7], "kopf")
    kopf.kasten([-3, 20, -19], [6, 1, 1], "braue")
    kopf.kasten([-2.5, 13, -21], [5, 4, 3], "schnauze")
    kopf.kasten([-1, 16, -22], [2, 1, 1], "nase")
    kopf.kasten([-2, 12, -20], [4, 1, 2], "kinn")
    paar(kopf, [2, 21, -15], [2, 2, 1], "ohr")
    maehne = m.knoch("maehne", [0, 16, -11], "head")
    # Die Maehne in Lagen: Kragen ums Gesicht, Schopf oben, Latz an der
    # Brust, seitliche Buesche und hinten der dichte Nacken.
    maehne.kasten([-6, 10, -16], [12, 13, 5], "maehne")
    maehne.kasten([-5, 23, -15], [10, 2, 5], "maehne_aussen")
    maehne.kasten([-5, 6, -14], [10, 4, 5], "maehne_aussen")
    paar(maehne, [6, 11, -15], [1, 10, 4], "maehne_aussen")
    maehne.kasten([-5, 12, -11], [10, 10, 3], "maehne_aussen")
    schwanz = m.knoch("tail", [0, 17, 11], "body", drehung=[-40, 0, 0])
    schwanz.kasten([-0.5, 16.5, 11], [1, 1, 12], "fell")
    schwanz.kasten([-1, 16, 22], [2, 2, 3], "quaste")
    beine(m, "body", 3, -8, 8, (3, 9, 3), 9, pfote=(4, 2, 4))
    return m


def loewe_maler(variante):
    fell = "#caa060"
    creme = "#ecd8ac"
    junges = variante == "junges"

    def f(stoff, p, n, texel):
        if stoff == "maehne":
            return ton("#8e5a2a", p, n, texel, 61, straehne=0.06, hell=0.05)
        if stoff == "maehne_aussen":
            return ton("#6a4020", p, n, texel, 63, straehne=0.07)
        if stoff == "quaste":
            return ton("#3e2412", p, n, texel, 65, straehne=0.0)
        if stoff == "nase":
            return hexfarbe("#6e3e32")
        if stoff in ("schnauze", "kinn"):
            if stoff == "schnauze" and n[2] < -0.5 and p[1] < 14:
                return hexfarbe("#5a3a2a")                   # Maul
            return ton(creme, p, n, texel, 67, straehne=0.02)
        if stoff == "kopf":
            a = auge(p, n, [(-2.5, 18.5, -18), (2.5, 18.5, -18)], "#c89020")
            if a and n[2] < -0.5:
                return a
            return ton(fell, p, n, texel, 69)
        if stoff == "braue":
            return ton(fell, p, n, texel, 70, hell=0.05)
        if stoff == "ohr":
            return ton("#3e2a18", p, n, texel, 71) if n[2] > 0.5 else ton(fell, p, n, texel, 71)
        if stoff == "pfote":
            return ton(creme, p, n, texel, 73, hell=-0.08)
        if stoff == "bauch" or (stoff == "fell" and p[1] < 10):
            return ton(creme, p, n, texel, 75, hell=-0.04)
        if junges and wolken(p, 2.2, 77, 1) > 0.7:
            return ton("#a88054", p, n, texel, 79, straehne=0.0)   # Flecken der Jungen
        return ton(fell, p, n, texel, 81, hell=0.04 - 0.06 * (19 - p[1]) / 10)
    return f


# ================================================================== Tiger

def tiger_modell():
    m = Modell("tiger", sichtbreite=2.5, sichthoehe=2)
    body = m.knoch("body", [0, 13, 0])
    body.kasten([-5, 8, -12], [10, 9, 24], "fell")
    body.kasten([-4, 7, -10], [8, 1, 20], "bauch")
    body.kasten([-4, 17, -11], [8, 1, 20], "fell")
    kopf = m.knoch("head", [0, 15, -12], "body")
    kopf.kasten([-4, 12, -19], [8, 8, 7], "kopf")
    kopf.kasten([-3, 19, -20], [6, 1, 1], "braue")
    kopf.kasten([-2.5, 12, -22], [5, 4, 3], "schnauze")
    kopf.kasten([-1, 15, -23], [2, 1, 1], "nase")
    kopf.kasten([-2, 11, -21], [4, 1, 2], "kinn")
    # Der Backenbart des Tigers.
    paar(kopf, [4, 11, -18], [2, 6, 4], "wange")
    paar(kopf, [2, 20, -16], [2, 2, 1], "ohr")
    schwanz = m.knoch("tail", [0, 16, 12], "body", drehung=[-35, 0, 0])
    schwanz.kasten([-1, 15, 12], [2, 2, 14], "schwanz")
    beine(m, "body", 3, -8.5, 8.5, (4, 8, 4), 8, pfote=(4, 2, 5))
    return m


TIGER_FARBEN = {
    "orange": ("#dc8638", "#1e1612", "#f0ece2", "#d8a020"),
    "weiss":  ("#ecebe4", "#2c2622", "#ffffff", "#5a9ad8"),
}


def tiger_maler(variante):
    fell, streif, weiss, iris = TIGER_FARBEN[variante]

    def gestreift(p, abstand=4.5, breite=0.26):
        # Senkrechte Baender, leicht gewellt, damit es nach Tiger aussieht
        # und nicht nach Lineal.
        s = (p[2] + 1.6 * math.sin(p[1] * 0.9 + p[0] * 0.4)) / abstand
        return (s - math.floor(s)) < breite

    def f(stoff, p, n, texel):
        if stoff == "nase":
            return hexfarbe("#c06a62")
        if stoff in ("schnauze", "kinn", "wange"):
            if stoff == "schnauze" and n[2] < -0.5 and p[1] < 13:
                return hexfarbe("#5a3a2a")
            if stoff == "wange" and abs(n[0]) > 0.5 and int(p[1]) % 3 == 0:
                return hexfarbe(streif)                     # Streifen im Backenbart
            return ton(weiss, p, n, texel, 83, straehne=0.02)
        if stoff == "braue":
            return ton(weiss, p, n, texel, 85)
        if stoff == "kopf":
            a = auge(p, n, [(-2.5, 17.5, -19), (2.5, 17.5, -19)], iris)
            if a and n[2] < -0.5:
                return a
            if n[1] > 0.5 and int(p[2]) % 2 == 0 and abs(p[0]) > 1:
                return hexfarbe(streif)                     # Stirnstreifen
            if n[2] < -0.5 and p[1] < 16:
                return ton(weiss, p, n, texel, 87)
            return ton(fell, p, n, texel, 89)
        if stoff == "ohr":
            if n[2] > 0.5:
                return hexfarbe(weiss) if abs(abs(p[0]) - 3) < 0.6 else hexfarbe(streif)  # heller Ohrfleck
            return ton(fell, p, n, texel, 91)
        if stoff == "schwanz":
            if p[2] > 23:
                return hexfarbe(streif)                     # schwarze Spitze
            return hexfarbe(streif) if int(p[2]) % 3 == 0 else ton(fell, p, n, texel, 93)
        if stoff == "pfote":
            return ton(weiss, p, n, texel, 95, hell=-0.06)
        if stoff == "bein":
            if n[2] == 0 and int(p[1]) % 3 == 1:
                return hexfarbe(streif)
            return ton(fell, p, n, texel, 97)
        if stoff == "bauch" or n[1] < -0.5 or p[1] < 9.5:
            return ton(weiss, p, n, texel, 99)
        if gestreift(p):
            return hexfarbe(streif)
        return ton(fell, p, n, texel, 101, hell=0.03 - 0.05 * (17 - p[1]) / 8)
    return f


# ================================================================== Krokodil

def krokodil_modell():
    m = Modell("krokodil", sichtbreite=4, sichthoehe=1.2)
    body = m.knoch("body", [0, 4, 0])
    body.kasten([-5, 2, -12], [10, 5, 24], "haut")
    body.kasten([-4, 1, -10], [8, 1, 20], "bauch")
    # Drei Reihen Panzerplatten auf dem Ruecken.
    for z in range(-10, 12, 3):
        paar(body, [2, 7, z], [1, 1, 2], "platte")
    for z in range(-8, 12, 3):
        body.kasten([-0.5, 7, z], [1, 1, 2], "platte")
    kopf = m.knoch("head", [0, 5, -12], "body")
    kopf.kasten([-4, 2, -18], [8, 4, 6], "kopf")
    kopf.kasten([-2.5, 3, -28], [5, 2, 10], "maul")
    kopf.kasten([-1.5, 5, -28], [3, 1, 2], "nasenhoecker")
    paar(kopf, [1, 6, -17], [2, 1, 2], "auge")
    # Zaehne am Oberkiefer, die ueber die Lippe ragen - wie beim echten
    # Krokodil, auch bei geschlossenem Maul.
    for z in (-27, -24, -21):
        paar(kopf, [2.5, 2, z], [1, 1, 1], "zahn")
    kiefer = m.knoch("kiefer", [0, 3, -17], "head")
    kiefer.kasten([-2.5, 1, -28], [5, 2, 11], "kiefer")
    for z in (-26, -23, -20):
        paar(kiefer, [2.5, 3, z], [1, 1, 1], "zahn")
    s1 = m.knoch("schwanz1", [0, 4.5, 12], "body")
    s1.kasten([-3.5, 2, 12], [7, 4, 10], "haut")
    for z in (13, 16, 19):
        paar(s1, [1, 6, z], [1, 1, 2], "platte")
    s2 = m.knoch("schwanz2", [0, 4, 22], "schwanz1")
    s2.kasten([-2.5, 2.5, 22], [5, 3, 9], "haut")
    for z in (23, 26, 29):
        s2.kasten([-0.5, 5.5, z], [1, 1, 2], "platte")
    s3 = m.knoch("schwanz3", [0, 4, 31], "schwanz2")
    s3.kasten([-1.5, 3, 31], [3, 2, 8], "haut")
    s3.kasten([-0.5, 5, 32], [1, 1, 5], "platte")
    for name, x, z in (("leg0", 5.5, -8.5), ("leg1", -5.5, -8.5), ("leg2", 5.5, 8.5), ("leg3", -5.5, 8.5)):
        b = m.knoch(name, [x, 4, z], "body")
        b.kasten([x - 1.5, 1, z - 1.5], [3, 3, 3], "bein")
        b.kasten([x - 2, 0, z - 2.5], [4, 1, 4], "fuss")
    return m


def krokodil_maler(variante):
    jung = variante == "jung"
    haut = "#6e7e40" if jung else "#4e5c32"
    bauch = "#d6cc98"

    def f(stoff, p, n, texel):
        if stoff == "zahn":
            return hexfarbe("#f2ecd8")
        if stoff == "auge":
            if n[1] > 0.5 or abs(n[0]) > 0.5:
                return hexfarbe("#141008") if texel[0] % 2 else hexfarbe("#c8c040")
            return ton(haut, p, n, texel, 111)
        if stoff == "platte":
            return ton(haut, p, n, texel, 113, hell=-0.14, straehne=0.0)
        if stoff == "nasenhoecker":
            if n[1] > 0.5 and abs(p[0]) > 0.3:
                return hexfarbe("#1c2010")
            return ton(haut, p, n, texel, 115)
        if stoff in ("maul", "kiefer"):
            if stoff == "kiefer" and n[1] < -0.5:
                return ton(bauch, p, n, texel, 117)
            if stoff == "kiefer" and n[1] > 0.5:
                return hexfarbe("#c88478")                  # Maul innen
            return ton(haut, p, n, texel, 119, hell=0.04)
        if stoff == "fuss":
            return ton(haut, p, n, texel, 121, hell=-0.1)
        if stoff == "bauch" or n[1] < -0.5:
            return ton(bauch, p, n, texel, 123, straehne=0.0)
        if abs(n[0]) > 0.5 and p[1] < 3:
            return ton(bauch, p, n, texel, 125, hell=-0.06)
        # Schuppenplatten: ein ruhiges Gitter aus etwas dunkleren Fugen.
        if (int(math.floor(p[2])) % 3 == 0) or (n[1] > 0.5 and int(math.floor(p[0] + 10)) % 3 == 0):
            return ton(haut, p, n, texel, 127, hell=-0.08, straehne=0.0)
        return ton(haut, p, n, texel, 129, straehne=0.0)
    return f


# ================================================================== Schneeleopard

def schneeleopard_modell():
    m = Modell("schneeleopard", sichtbreite=2.2, sichthoehe=1.5)
    body = m.knoch("body", [0, 11, 0])
    body.kasten([-4, 7, -10], [8, 8, 20], "fell")
    body.kasten([-3, 6, -8], [6, 1, 16], "bauch")
    body.kasten([-3, 15, -9], [6, 1, 18], "fell")
    kopf = m.knoch("head", [0, 13, -10], "body")
    kopf.kasten([-3, 10, -16], [6, 6, 6], "kopf")
    paar(kopf, [3, 10, -15], [1, 4, 3], "wange")
    kopf.kasten([-2, 10, -18], [4, 3, 2], "schnauze")
    kopf.kasten([-1, 12, -19], [2, 1, 1], "nase")
    paar(kopf, [1.5, 16, -13], [2, 1, 1], "ohr")
    # Der lange, dicke Schwanz - Gleichgewicht am Hang und Schal im Schlaf.
    schwanz = m.knoch("tail", [0, 13, 10], "body", drehung=[-12, 0, 0])
    schwanz.kasten([-1.5, 11.5, 10], [3, 3, 12], "schwanz")
    s2 = m.knoch("tail2", [0, 13, 22], "tail", drehung=[-15, 0, 0])
    s2.kasten([-1.5, 11.5, 22], [3, 3, 9], "schwanz")
    beine(m, "body", 2.5, -7, 7, (3, 7, 3), 7, pfote=(4, 2, 4))
    return m


def schneeleopard_maler(variante):
    fell = "#dddcd4"
    fleck = hexfarbe("#56544e")
    bauch = "#f4f4f0"

    def rosette(p, raster=3.5):
        # Ringe um zufaellig versetzte Punkte eines groben Gitters.
        gx, gy, gz = (math.floor(p[i] / raster) for i in range(3))
        best = 9.0
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    c = (gx + dx, gy + dy, gz + dz)
                    q = [(c[i] + 0.2 + 0.6 * streu(*c, 131 + i)) * raster for i in range(3)]
                    best = min(best, math.dist(p, q))
        return best

    def f(stoff, p, n, texel):
        if stoff == "nase":
            return hexfarbe("#9a7070")
        if stoff in ("schnauze", "wange"):
            return ton(bauch, p, n, texel, 133)
        if stoff == "kopf":
            a = auge(p, n, [(-1.8, 13.5, -16), (1.8, 13.5, -16)], "#8ab09a")
            if a and n[2] < -0.5:
                return a
            if n[2] >= -0.5 and rosette(p, 2.5) < 0.6:
                return fleck
            return ton(fell, p, n, texel, 135)
        if stoff == "pfote":
            return ton(bauch, p, n, texel, 137, hell=-0.05)
        if stoff == "bauch" or n[1] < -0.5 or (stoff == "fell" and p[1] < 8):
            return ton(bauch, p, n, texel, 139)
        d = rosette(p)
        if stoff == "schwanz":
            return fleck if int(p[2]) % 4 == 0 or d < 0.7 else ton(fell, p, n, texel, 141)
        if stoff == "bein":
            return fleck if d < 0.6 else ton(fell, p, n, texel, 143)
        if 0.75 < d < 1.3:
            return fleck
        if d <= 0.75:
            return ton("#c8b89c", p, n, texel, 145)          # warme Mitte der Rosette
        return ton(fell, p, n, texel, 147, hell=0.03 - 0.05 * (15 - p[1]) / 8)
    return f


# ================================================================== Buckelwal

def wal_modell():
    m = Modell("wal", sichtbreite=6, sichthoehe=3)
    rumpf = m.knoch("rumpf", [0, 10, 0])
    rumpf.kasten([-12, 0, -28], [24, 20, 34], "haut")
    rumpf.kasten([-11, 20, -26], [22, 1, 28], "haut")          # runder Ruecken
    rumpf.kasten([-11, -1, -26], [22, 1, 28], "bauch")
    # Der "Buckel" vor der Rueckenfinne, der dem Buckelwal den Namen gibt.
    rumpf.kasten([-2, 21, -3], [4, 1, 6], "haut")
    rumpf.kasten([-1, 22, -1], [2, 3, 4], "haut")
    kopf = m.knoch("kopf", [0, 10, -28], "rumpf")
    kopf.kasten([-10.5, 3, -46], [21, 14, 18], "kopf")
    kopf.kasten([-10, 0, -44], [20, 3, 16], "kehle")
    kopf.kasten([-9, 17, -44], [18, 1, 14], "kopf")
    # Die Hoecker auf Kopf und Kinn - bei echten Buckelwalen Haarwurzeln.
    for x, z in ((-6, -44), (-2, -42), (3, -45), (6, -41), (-4, -38), (1, -36), (7, -35), (-7, -33)):
        kopf.kasten([x, 18, z], [1, 1, 1], "hoecker")
    for x, z in ((-5, -45), (0, -46), (4, -45)):
        kopf.kasten([x, -1, z], [1, 1, 1], "hoecker")
    for name, x, zeichen in (("flosse_links", 12, 1), ("flosse_rechts", -12, -1)):
        f = m.knoch(name, [x, 6, -20], "rumpf", drehung=[0, -20 * zeichen, 25 * zeichen])
        x0 = x if zeichen > 0 else x - 22
        f.kasten([x0, 5, -23], [22, 2, 7], "flosse")
        # Die gewellte Vorderkante der Brustflosse.
        for i in range(4):
            bx = x + zeichen * (3 + i * 5) - (0 if zeichen > 0 else 1)
            f.kasten([bx, 5, -24], [1, 2, 1], "flosse")
    s1 = m.knoch("schwanz1", [0, 10, 6], "rumpf")
    s1.kasten([-9, 3, 6], [18, 14, 16], "haut")
    s1.kasten([-1, 17, 8], [2, 2, 10], "haut")                 # Kiel oben
    s2 = m.knoch("schwanz2", [0, 10, 22], "schwanz1")
    s2.kasten([-5, 6, 22], [10, 8, 14], "haut")
    s2.kasten([-1, 14, 23], [2, 1, 12], "haut")
    fl = m.knoch("fluke", [0, 10, 36], "schwanz2")
    paar(fl, [1, 9, 35], [14, 2, 9], "fluke")
    fl.kasten([-1, 9, 35], [2, 2, 5], "fluke")
    for x in (3, 6, 9, 12):
        paar(fl, [x, 9, 44], [1, 2, 1], "fluke")               # gezackte Hinterkante
    return m


def wal_maler(variante):
    kalb = variante == "kalb"
    haut = "#4a545c" if kalb else ("#2a3036" if variante == "dunkel" else "#323a42")
    weiss = "#e2e6e8"
    grau = "#9aa4aa"

    def f(stoff, p, n, texel):
        if stoff == "hoecker":
            return ton(haut, p, n, texel, 151, hell=0.18, straehne=0.0)
        if stoff == "flosse":
            # Fast weisse Brustflossen, oben grau gewoelkt.
            if n[1] > 0.5 and wolken(p, 3, 153, 1) > 0.5:
                return ton(grau, p, n, texel, 155, straehne=0.0)
            return ton(weiss, p, n, texel, 157, straehne=0.0)
        if stoff == "fluke":
            if n[1] < -0.5:
                # Unterseite der Fluke: weiss mit schwarzem Muster - bei
                # echten Walen so einzigartig wie ein Fingerabdruck.
                return ton(haut, p, n, texel, 159) if wolken(p, 3, 161, 1) > 0.56 else ton(weiss, p, n, texel, 163)
            return ton(haut, p, n, texel, 165, straehne=0.0)
        if stoff == "kehle":
            if n[1] < -0.5 or abs(n[0]) > 0.5:
                if int(round(p[0])) % 2 == 0:
                    return ton(grau, p, n, texel, 167, straehne=0.0)   # Kehlfurchen
            return ton(weiss, p, n, texel, 169, straehne=0.0)
        if stoff == "bauch":
            return ton(weiss if variante != "dunkel" else grau, p, n, texel, 171, straehne=0.0)
        if stoff == "kopf":
            if abs(n[0]) > 0.5 and nah(p, (0, 7.5, -33), (11, 0.5, 0.5)):
                return hexfarbe("#0a0c0e")                 # Auge
            if abs(n[0]) > 0.5 and nah(p, (0, 8.5, -33), (11, 0.5, 0.5)):
                return hexfarbe("#d8dcde")                 # Glanz ueber dem Auge
            if abs(n[0]) > 0.5 and nah(p, (0, 4.5, -39), (11, 0.5, 7)):
                return hexfarbe("#101316")                 # Maullinie
            if n[1] > 0.5 and nah(p, (0, 18, -30), (1.6, 1, 1.5)) and abs(p[0]) > 0.4:
                return hexfarbe("#0e1114")                 # Blasloecher
        if n[1] < -0.5:
            return ton(weiss if variante != "dunkel" else grau, p, n, texel, 173, straehne=0.0)
        if abs(n[0]) > 0.5 and p[1] < 4:
            return ton(grau, p, n, texel, 175, straehne=0.0)
        return ton(haut, p, n, texel, 177, straehne=0.02)
    return f


# ================================================================== Hai

def hai_modell():
    m = Modell("hai", sichtbreite=3.5, sichthoehe=1.8)
    rumpf = m.knoch("rumpf", [0, 5, 0])
    rumpf.kasten([-4.5, 0, -8], [9, 10, 16], "haut")
    rumpf.kasten([-3.5, 10, -7], [7, 1, 14], "haut")
    rumpf.kasten([-3.5, -1, -7], [7, 1, 12], "bauch")
    rumpf.kasten([-0.5, 9, -4], [1, 8, 6], "flosse", drehung=[-25, 0, 0], drehpunkt=[0, 9, -2])
    kopf = m.knoch("kopf", [0, 5, -8], "rumpf")
    kopf.kasten([-4, 1, -17], [8, 8, 9], "kopf")
    kopf.kasten([-3, 2, -21], [6, 5, 4], "kopf")
    kopf.kasten([-2, 3, -22], [4, 3, 1], "kopf")
    # Die obere Zahnreihe haengt ueber den Unterkiefer.
    for z in (-19, -17, -15, -13):
        paar(kopf, [2.5, 0, z], [1, 1, 1], "zahn")
    kopf.kasten([-1.5, 0, -20], [1, 1, 1], "zahn")
    kopf.kasten([0.5, 0, -20], [1, 1, 1], "zahn")
    kiefer = m.knoch("kiefer", [0, 2, -10], "kopf")
    kiefer.kasten([-3.5, 0, -19], [7, 2, 10], "kiefer")
    for z in (-18, -16, -14):
        paar(kiefer, [2.5, 2, z], [1, 1, 1], "zahn")
    hammer = m.knoch("hammer", [0, 6, -18], "kopf")
    hammer.kasten([-10, 4, -21], [20, 3, 5], "hammer")
    for name, x, z in (("flosse_links", 4.5, 1), ("flosse_rechts", -4.5, -1)):
        f = m.knoch(name, [x, 2, -5], "rumpf", drehung=[0, -15 * z, 25 * z])
        f.kasten([x if z > 0 else x - 8, 1.5, -7], [8, 1, 4], "flosse")
    s1 = m.knoch("schwanz1", [0, 5, 8], "rumpf")
    s1.kasten([-3.5, 1.5, 8], [7, 7, 10], "haut")
    s1.kasten([-0.5, 8.5, 14], [1, 2, 3], "flosse")            # zweite Rueckenflosse
    s1.kasten([-0.5, 0.5, 13], [1, 1, 3], "flosse")            # Afterflosse
    paar(s1, [2.5, 1, 9], [2, 1, 3], "flosse")                 # Bauchflossen
    s2 = m.knoch("schwanz2", [0, 5, 18], "schwanz1")
    s2.kasten([-2, 3, 18], [4, 4, 7], "haut")
    paar(s2, [2, 4.5, 20], [1, 1, 4], "haut")                  # Schwanzkiel
    fl = m.knoch("schwanzflosse", [0, 5, 25], "schwanz2")
    fl.kasten([-0.5, 5, 23], [1, 10, 4], "flosse", drehung=[-40, 0, 0], drehpunkt=[0, 5, 25])
    fl.kasten([-0.5, -2, 23], [1, 6, 3], "flosse", drehung=[40, 0, 0], drehpunkt=[0, 5, 25])
    return m


HAI_FARBEN = {
    "weisser_hai": "#7e8a96",
    "tigerhai":    "#86806a",
    "hammerhai":   "#888678",
}


def hai_maler(variante):
    haut = HAI_FARBEN[variante]
    weiss = "#eaeced"

    def f(stoff, p, n, texel):
        if stoff == "zahn":
            return hexfarbe("#f6f4ee")
        if stoff == "kiefer":
            if n[1] > 0.5:
                return hexfarbe("#8a3a40")                  # Maul innen
            return ton(weiss, p, n, texel, 181, straehne=0.0)
        if stoff == "hammer":
            if abs(n[0]) > 0.5 and nah(p, (0, 5.5, -18.5), (10.5, 0.5, 0.5)):
                return hexfarbe("#0a0a0a")                  # Augen an den Enden
            return ton(weiss, p, n, texel, 183) if n[1] < -0.5 else ton(haut, p, n, texel, 185, straehne=0.0)
        if stoff == "kopf":
            if abs(n[0]) > 0.5 and nah(p, (0, 6, -15), (5, 0.5, 0.5)):
                return hexfarbe("#050505")                  # Auge
            if n[2] < -0.5 and p[1] > 3.5 and 0.5 < abs(p[0]) < 1.5 and p[1] < 5:
                return hexfarbe("#3a4248")                  # Nasenloecher
            if n[1] < -0.5 or (abs(n[0]) > 0.5 and p[1] < 3):
                return ton(weiss, p, n, texel, 187, straehne=0.0)
            if n[2] < -0.5 and p[1] < 3.5:
                return hexfarbe("#6a2a30")
        if stoff == "bauch":
            return ton(weiss, p, n, texel, 189, straehne=0.0)
        if stoff == "haut":
            if abs(n[0]) > 0.5 and -7.5 < p[2] < -3 and int(p[2] * 2) % 2 == 0 and 3 < p[1] < 7:
                return ton(haut, p, n, texel, 191, hell=-0.25, straehne=0.0)   # Kiemenspalten
            # Scharfe Grenze: oben grau, unten weiss - von unten verschwindet
            # der Hai so vor dem hellen Wasser.
            grenze = 3.8 + 0.8 * (wolken(p, 3, 193, 1) - 0.5)
            if n[1] < -0.5 or (abs(n[0]) > 0.5 and p[1] < grenze):
                return ton(weiss, p, n, texel, 195, straehne=0.0)
            if variante == "tigerhai" and n[1] >= 0 and int(p[2]) % 4 == 0:
                return ton(haut, p, n, texel, 197, hell=-0.25, straehne=0.0)   # dunkle Querbaender
        if stoff == "flosse":
            return ton(haut, p, n, texel, 199, hell=-0.06, straehne=0.0)
        return ton(haut, p, n, texel, 201, straehne=0.0)
    return f


# ================================================================== Riesenkalmar

KALMAR_ARME = 8


def riesenkalmar_modell():
    m = Modell("riesenkalmar", sichtbreite=5, sichthoehe=2)
    mantel = m.knoch("mantel", [0, 8, 0])
    mantel.kasten([-5, 3, -2], [10, 10, 20], "mantel")
    mantel.kasten([-4, 4, 18], [8, 8, 4], "mantel")
    mantel.kasten([-2, 6, 22], [4, 4, 2], "mantel")            # spitzes Ende
    flossen = m.knoch("flossen", [0, 8, 18], "mantel")
    paar(flossen, [4, 7.5, 13], [6, 1, 9], "flosse")
    paar(flossen, [10, 7.5, 15], [2, 1, 5], "flosse")
    kopf = m.knoch("kopf", [0, 8, -2], "mantel")
    kopf.kasten([-4, 4, -8], [8, 8, 6], "kopf")
    # Die riesigen Augen stehen seitlich hervor.
    paar(kopf, [4, 7, -7], [1, 3, 4], "auge")
    kopf.kasten([-1, 3, -6], [2, 1, 3], "trichter")
    for i in range(KALMAR_ARME):
        w = math.radians(i * 360 / KALMAR_ARME + 22.5)
        x, y = 2.8 * math.cos(w), 8 + 2.8 * math.sin(w)
        arm = m.knoch(f"arm{i}", [x, y, -8], "kopf",
                      drehung=[round(-12 * math.sin(w), 1), round(12 * math.cos(w), 1), 0])
        arm.kasten([x - 1, y - 1, -16], [2, 2, 8], "arm")
        spitze = m.knoch(f"armspitze{i}", [x, y, -16], f"arm{i}")
        spitze.kasten([x - 0.5, y - 0.5, -24], [1, 1, 8], "arm")
    for i, x in enumerate((1.5, -1.5)):
        fang = m.knoch(f"fangarm{i}", [x, 6, -8], "kopf")
        fang.kasten([x - 0.5, 5.5, -34], [1, 1, 26], "arm")
        fang.kasten([x - 1.5, 5, -39], [3, 2, 6], "keule")
    return m


def riesenkalmar_maler(variante):
    haut = "#b04448"
    unten = "#e2a2a2"

    def f(stoff, p, n, texel):
        if stoff == "auge":
            if abs(n[0]) > 0.5:
                # Riesenkalmare haben die groessten Augen im Tierreich.
                r = math.dist((p[1], p[2]), (8.5, -5))
                if r < 0.9:
                    return hexfarbe("#050608")
                if r < 1.6:
                    return hexfarbe("#2a3a5a")
                return hexfarbe("#d8d0b8")
            return ton(haut, p, n, texel, 211)
        if stoff == "trichter":
            return ton(unten, p, n, texel, 213, hell=-0.1)
        if stoff in ("arm", "keule"):
            if n[1] < -0.5 and (texel[0] + texel[1]) % 2 == 0:
                return hexfarbe("#f0cac2")                  # Saugnaepfe
            return ton(haut, p, n, texel, 215, hell=-0.05, straehne=0.0)
        if stoff == "flosse":
            return ton(haut, p, n, texel, 217, hell=0.06, straehne=0.0)
        if n[1] < -0.5:
            return ton(unten, p, n, texel, 219, straehne=0.0)
        if wolken(p, 2.0, 221, 1) > 0.7:
            return ton(haut, p, n, texel, 223, hell=-0.18, straehne=0.0)   # Farbzellen
        return ton(haut, p, n, texel, 225, straehne=0.0)
    return f


# ================================================================== Schwertfisch

def schwertfisch_modell():
    m = Modell("schwertfisch", sichtbreite=3.5, sichthoehe=1.8)
    rumpf = m.knoch("rumpf", [0, 4, 0])
    rumpf.kasten([-3, 0, -8], [6, 8, 18], "haut")
    rumpf.kasten([-2, 8, -7], [4, 1, 15], "haut")
    rumpf.kasten([-2, -1, -7], [4, 1, 14], "bauch")
    # Die hohe, sichelfoermige Rueckenflosse.
    rumpf.kasten([-0.5, 8, -8], [1, 10, 4], "flosse", drehung=[-25, 0, 0], drehpunkt=[0, 8, -6])
    rumpf.kasten([-0.5, 9, -5], [1, 5, 3], "flosse", drehung=[-25, 0, 0], drehpunkt=[0, 8, -6])
    kopf = m.knoch("kopf", [0, 4, -8], "rumpf")
    kopf.kasten([-2.5, 1, -13], [5, 6, 5], "kopf")
    kopf.kasten([-1.5, 3, -15], [3, 3, 2], "kopf")
    kopf.kasten([-1, 4, -24], [2, 1, 9], "schwert")
    kopf.kasten([-0.5, 4, -33], [1, 1, 9], "schwert")
    kopf.kasten([-1, 1, -15], [2, 1, 2], "kopf")
    for name, x, z in (("flosse_links", 3, 1), ("flosse_rechts", -3, -1)):
        f = m.knoch(name, [x, 2, -5], "rumpf", drehung=[0, -10 * z, 35 * z])
        f.kasten([x if z > 0 else x - 7, 1.5, -6], [7, 1, 2], "flosse")
    s1 = m.knoch("schwanz1", [0, 4, 10], "rumpf")
    s1.kasten([-2, 1.5, 10], [4, 5, 7], "haut")
    paar(s1, [2, 3.5, 13], [1, 1, 4], "haut")                  # Schwanzkiel
    fl = m.knoch("schwanzflosse", [0, 4, 17], "schwanz1")
    fl.kasten([-0.5, 4, 16], [1, 10, 3], "flosse", drehung=[-45, 0, 0], drehpunkt=[0, 4, 17])
    fl.kasten([-0.5, -5, 16], [1, 10, 3], "flosse", drehung=[45, 0, 0], drehpunkt=[0, 4, 17])
    return m


def schwertfisch_maler(variante):
    haut = "#3e365a"
    silber = "#b8c0cc"
    weiss = "#eaecf2"

    def f(stoff, p, n, texel):
        if stoff == "schwert":
            return ton("#2e2a34", p, n, texel, 231, hell=0.12 if n[1] < 0 else 0.0, straehne=0.0)
        if stoff == "kopf" and abs(n[0]) > 0.5 and nah(p, (0, 5, -11), (3, 0.9, 0.9)):
            r = math.dist((p[1], p[2]), (5, -11))
            return hexfarbe("#0a0a14") if r < 0.6 else hexfarbe("#5a86c8")   # grosses Auge
        if stoff == "flosse":
            return ton(haut, p, n, texel, 233, hell=-0.06, straehne=0.0)
        if stoff == "bauch" or n[1] < -0.5:
            return ton(weiss, p, n, texel, 235, straehne=0.0)
        if abs(n[0]) > 0.5:
            if p[1] < 3:
                return ton(weiss, p, n, texel, 237, straehne=0.0)
            if p[1] < 5.5:
                return ton(silber, p, n, texel, 239, straehne=0.0)   # silbrige Flanke
        return ton(haut, p, n, texel, 241, straehne=0.0)
    return f


# Die sechs Tiere aus Fassung 4.41 stehen in einer eigenen Datei, damit
# diese nicht endlos wird - hier hereingeholt, damit tiere_bauen.py alle
# Tiere an einer Stelle findet.
from tiere_gestalt_neu import *  # noqa: E402,F401,F403
