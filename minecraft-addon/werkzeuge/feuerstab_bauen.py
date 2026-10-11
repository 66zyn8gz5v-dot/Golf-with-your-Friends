#!/usr/bin/env python3
"""Baut den Feuerstab als 3D-Gegenstand - gepixelt von Fynns Cousin.

Zwei Dinge unterscheiden ihn von den Schwertern:

Er ist schraeg gezeichnet, Stiel unten links, Kugel oben rechts. Die
Halteanimation der Klingen erwartet aber eine Waffe, die im Modell nach
oben zeigt. Das Bild zu drehen wuerde die Pixelzeichnung zerstoeren -
gedreht wird deshalb das Modell: jeder Pixel ein eigener Kasten, dessen
Mitte um 45 Grad um den Fuss des Stiels wandert und der sich selbst um 45
Grad um seine Mitte dreht. Welche Richtung Minecraft fuer die Drehung des
Kastens annimmt, ist dabei gleich: Ein einfarbiges Quadrat sieht um +45
und um -45 Grad gedreht gleich aus, und das Gitter schliesst in beiden
Faellen lueckenlos. Die Lage der Mitten dagegen ist hier gerechnet, nicht
Minecraft ueberlassen - dort steckt die Richtung, die zaehlt.

Und er ist rund, wo die Schwerter flach sind: Die Feuerkugel bekommt die
Tiefe einer Kugel, in der Mitte am dicksten, zum Goldring hin flacher.
Der Stiel ist ein Stock, die Funken schweben als duenne Flocken.

    python3 werkzeuge/feuerstab_bauen.py
"""

import json
import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

import waffe_bauen as w
from vorlagen import feuerstab as vorlage

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"

KUGEL = set("g)*/")        # was zur Feuerkugel gehoert
STIEL = "4"
FUNKE, RAUCH = "'", "k"

KUGEL_RAND = 2.0           # Tiefe am Goldring
KUGEL_MITTE = 4.0          # Tiefe im Kern
# Der Stiel duenner als alles oben. Erst stand er auf 2 - so dick wie
# breit, ein Stock -, und die Kugel lief am Goldring auf 1,25 aus. Dann
# war der Griff dicker als der Rand des Kopfes, und Fynn: "die Dicke des
# Griffes soll duenner sein als die des oberen Teils". Jetzt ist er
# duenner als die duennste Stelle oben, bei beiden Staeben.
STIEL_DICKE = 1.0

# Wie viel groesser als gemalt. Ein Pixel wird sonst ein Pixel, und die
# Staebe lagen kleiner in der Hand als die Schwerter - der zweite, mit
# sechzehn Pixeln gemalt, deutlich. Vergroessert wird um den Fuss herum,
# damit die Hand bleibt, wo sie ist, und nur der Stab laenger wird.
GROESSE = {"feuerstab": 1.3, "feuerstab_2": 1.8}
FUNKEN_DICKE = 0.75
RAUCH_DICKE = 0.5


def kugel_mass(karte):
    """Mitte und Halbmesser der Kugel, am Bild gemessen.

    Die Mitte ist der Schwerpunkt des roten Kerns, der Halbmesser der
    Abstand zum aeussersten Pixel des Goldrings. So passt sich die Tiefe
    an, falls der Cousin die Kugel noch einmal umzeichnet.
    """
    kern = [(s, z) for z, t in enumerate(karte) for s, c in enumerate(t) if c in "*/"]
    mx = sum(s for s, _ in kern) / len(kern) + 0.5
    my = sum(z for _, z in kern) / len(kern) + 0.5
    rand = max(math.hypot(s + 0.5 - mx, z + 0.5 - my)
               for z, t in enumerate(karte) for s, c in enumerate(t) if c in KUGEL)
    return mx, my, rand + 0.5


def tiefen(karte):
    mx, my, r = kugel_mass(karte)

    def tief(zeile, spalte, zeichen):
        if zeichen in KUGEL:
            d = math.hypot(spalte + 0.5 - mx, zeile + 0.5 - my) / r
            genau = KUGEL_RAND + (KUGEL_MITTE - KUGEL_RAND) * math.sqrt(max(0.0, 1 - d * d))
            # Auf halbe Pixel gerundet: Stufen statt einer glatt gedrehten
            # Kugel. Glatt sah sie gedrechselt aus, in Stufen nach Minecraft.
            return round(genau * 2) / 2
        if zeichen == STIEL:
            return STIEL_DICKE
        if zeichen == FUNKE:
            return FUNKEN_DICKE
        return RAUCH_DICKE
    return tief


def fuss(karte):
    """Das untere Ende des Stabs: der gemalte Pixel am weitesten unten links.

    Beim ersten Stab ist das ein Stielpixel, beim zweiten die goldene
    Spitze - gesucht wird deshalb nach der Lage, nicht nach der Farbe.
    """
    gemalt = [(s, z) for z, t in enumerate(karte) for s, c in enumerate(t) if c != "."]
    s, z = max(gemalt, key=lambda p: p[1] - p[0])
    return s + 0.5, len(karte) - 1 - z + 0.5          # in Modellkoordinaten


def aufrichten(modelldatei, karte, faktor=1.0):
    """Dreht das schraege Modell um 45 Grad aufrecht, den Fuss nach unten.

    Im Modell zeigt Bildspalte x nach +x und die Bildzeile nach oben, die
    Kugel liegt also bei +x und +y vom Stiel aus. Eine Drehung um +45 Grad
    in dieser Ebene (x nach rechts, y nach oben) bringt sie senkrecht ueber
    den Fuss. Danach wird der Fuss in den Nullpunkt geschoben - dort, wo
    auch bei den Schwertern das untere Ende sitzt.
    """
    geo = json.loads(modelldatei.read_text())
    fx, fy = fuss(karte)
    c, s = math.cos(math.radians(45)), math.sin(math.radians(45))
    anzahl = 0
    for knochen in geo["minecraft:geometry"][0]["bones"]:
        for k in knochen.get("cubes", []):
            px, py, pz = k["pivot"]
            nx = fx + (px - fx) * c - (py - fy) * s
            ny = fy + (px - fx) * s + (py - fy) * c
            dx, dy = nx - px - fx, ny - py - fy + 0.5
            ursprung = [k["origin"][0] + dx, k["origin"][1] + dy, k["origin"][2]]
            drehpunkt = [px + dx, py + dy, pz]
            # Vergroessern um den Nullpunkt, in dem jetzt der Fuss steht.
            # Alles gleichmaessig, auch die Tiefe - sonst wuerde aus dem
            # duennen Griff wieder ein dicker.
            k["origin"] = [v * faktor for v in ursprung]
            k["pivot"] = [v * faktor for v in drehpunkt]
            k["size"] = [v * faktor for v in k["size"]]
            anzahl += 1
    modelldatei.write_text(json.dumps(geo, indent=2) + "\n")
    return anzahl


def inventarbild(karte):
    """Das Bild fuers Inventar, auf zwanzig mal zwanzig beschnitten.

    Fynn hat fuer neue Waffen hoechstens zwanzig Pixel festgelegt - mehr
    faellt neben den Vanilla-Gegenstaenden auf. Der Stab selbst passt
    hinein (Spalten 0 bis 19, Zeilen 4 bis 23), verloren gehen nur Funken
    und Rauchpunkte am Rand. Im 3D-Modell bleiben sie alle.
    """
    stueck = [z[0:20] for z in karte[4:24]]
    for z, t in enumerate(karte):
        for s, ch in enumerate(t):
            if ch not in ".'k":
                assert 0 <= s < 20 and 4 <= z < 24, f"Stab ragt aus dem Ausschnitt: {(s, z)}"
    bild = Image.new("RGBA", (20, 20))
    for y, t in enumerate(stueck):
        for x, ch in enumerate(t):
            bild.putpixel((x, y), tuple(vorlage.FARBEN[ch]))
    return bild


# Wie weit ein Rauchpunkt von der Kugel weg sein darf, um ins Modell zu
# kommen. Im flachen Bild lesen sich die dunklen Punkte als Rauch. Im
# Modell wurde aus der Reihe unten rechts ein schwarzer Stab, der neben
# der Kugel in der Luft hing. Die Punkte nahe der Kugel durften zuerst
# bleiben, als Rauchfahne - Fynn wollte das Modell dann ganz ohne die
# schwarzen Pixel. Null heisst: keiner kommt hinein. Im Inventarbild
# bleiben sie alle, dort gehoeren sie zur Zeichnung.
RAUCH_REICHWEITE = 0.0


def ohne_fernen_rauch(karte):
    kugel = [(s, z) for z, t in enumerate(karte) for s, c in enumerate(t) if c in KUGEL]
    neu, weg = [], 0
    for z, t in enumerate(karte):
        zeile = ""
        for s, c in enumerate(t):
            if c == RAUCH and min(math.hypot(s - a, z - b) for a, b in kugel) > RAUCH_REICHWEITE:
                zeile += "."
                weg += 1
            else:
                zeile += c
        neu.append(zeile)
    return neu, weg


# --- Feuerstab 2 --------------------------------------------------------

from vorlagen import feuerstab_2 as vorlage_2

GOLD_2 = set("fgh")
UMRISS_2 = "d"


# Die Flamme, nach Farbe gestaffelt: Der fast weisse Kern steht am
# weitesten vor, die roten Spitzen sind am duennsten. Zuerst war sie rund
# gerechnet wie die Kugel des ersten Stabs, bis 3,5 dick - dicker als der
# goldene Kopf, der sie haelt. Fynn: "Die Flamme soll nicht so dick sein
# wie das goldene Teil" und "unterschiedlich dick an verschiedenen
# Stellen". Darum oben hoechstens 2,5 bei einem Kopf von 3, und auf jede
# Stelle ein kleiner Versatz, der von Pixel zu Pixel springt: Eine Flamme
# mit glatter Oberflaeche saehe aus wie aus Holz geschnitzt.
FLAMMEN_TIEFE = {"e": 2.5, "c": 2.0, "b": 1.5, "a": 1.25}
GOLD_TIEFE = 3.0


def flackern(spalte, zeile):
    """-0,25, 0 oder +0,25 - fest je Stelle, aber ohne Muster.

    Dieselbe Verwuerfelung wie in der Koernung: Eine Summe aus Spalte und
    Zeile gaebe Streifen.
    """
    h = (spalte * 73856093) ^ (zeile * 19349663)
    h = (h ^ (h >> 13)) * 1274126177
    return ((h ^ (h >> 16)) % 3 - 1) * 0.25


def tiefen_2(karte):
    def tief(zeile, spalte, zeichen):
        if zeichen in FLAMMEN_TIEFE:
            wert = FLAMMEN_TIEFE[zeichen] + flackern(spalte, zeile)
            # Nie dicker als 2,5 und nie so duenn wie der Griff.
            return min(2.5, max(STIEL_DICKE + 0.25, wert))
        if zeichen in GOLD_2:
            return GOLD_TIEFE
        return STIEL_DICKE
    return tief


def ohne_umriss(karte):
    """Der dunkle Umriss gehoert zur flachen Zeichnung, nicht ins Modell.

    Beim ersten Stab wollte Fynn das Modell ausdruecklich ohne die schwarzen
    Pixel; am Modell zieht die Geometrie ihre Kanten selbst. Im
    Inventarbild bleibt der Umriss - dort traegt er die Form.
    """
    return [z.replace(UMRISS_2, ".") for z in karte]


def baue(name, karte, farben, tiefe):
    modell = RES / "models" / "entity" / f"{name}.geo.json"
    textur = RES / "textures" / "entity" / f"{name}_haut.png"
    # Jeder Pixel mit "/" in der Drehkarte: gedreht und damit einzeln - aus
    # zusammengefassten Zeilen wuerden schraege Balken.
    w.aus_zeichenkarte(name, karte, farben, dicke=tiefe,
                       mitte=0, winkel=["/" * len(karte[0])] * len(karte),
                       ziel_modell=str(modell), ziel_textur=str(textur))
    n = aufrichten(modell, karte, GROESSE[name])
    print(f"{name}: {n} Kaesten um 45 Grad aufgerichtet")
    return modell


def main():
    karte, weg = ohne_fernen_rauch(vorlage.KARTE)
    print(f"Rauchpunkte fern der Kugel: {weg} nicht im Modell")
    baue("feuerstab", karte, vorlage.FARBEN, tiefen(karte))
    inventarbild(vorlage.KARTE).save(RES / "textures" / "items" / "feuerstab.png")

    karte_2 = ohne_umriss(vorlage_2.KARTE)
    baue("feuerstab_2", karte_2, vorlage_2.FARBEN, tiefen_2(karte_2))
    # Sechzehn mal sechzehn - passt ohne Beschnitt unter Fynns Obergrenze.
    bild = Image.new("RGBA", (16, 16))
    for y, zeile in enumerate(vorlage_2.KARTE):
        for x, z in enumerate(zeile):
            bild.putpixel((x, y), tuple(vorlage_2.FARBEN[z]))
    bild.save(RES / "textures" / "items" / "feuerstab_2.png")
    print("Inventarbilder: feuerstab (20 x 20), feuerstab_2 (16 x 16)")


if __name__ == "__main__":
    main()
