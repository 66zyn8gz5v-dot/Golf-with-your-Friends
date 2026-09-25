#!/usr/bin/env python3
"""Legt Mauerwerk-Koernung auf die glatten Flaechen der Ofentexturen.

Fynn zur Tuer und zum Bottich: "gibst du C und A bitte mehr Struktur wie
auch bei D, dass es nicht so einzelne gleichfarbige Fronten sind."

Die Zahlen sagten erst das Gegenteil - die Tuer hat 56 Prozent
Nachbarwechsel, die Seitenwand nur 52. Nebeneinandergelegt war es
trotzdem zu sehen: Bei der Seitenwand sitzt die Koernung ueberall, bei
Tuer und Bottich nur am Rand und in der Mitte, und dazwischen liegen
grosse glatte Felder. Eine Zahl ueber das ganze Bild sagt nichts darueber,
wie die Unruhe verteilt ist.

An der Seitenwand gemessen: Der Grundton deckt siebzig Prozent der
Flaeche, die restlichen dreissig sind Flecken aus drei bis fuenf
benachbarten Helligkeitsstufen, nach hell und nach dunkel. Genau das
bekommen die glatten Felder hier.

Angefasst werden nur zusammenhaengende Felder desselben Tons ab zwoelf
Pixeln. Kanten, Rahmen und der Ring des Bottichs bestehen aus anderen
Toenen und bleiben damit von selbst stehen - ohne dass irgendwo eine
Liste steht, was Detail ist und was Flaeche.

    python3 werkzeuge/ofen_koernung.py
"""

from collections import Counter
from pathlib import Path

from PIL import Image

WURZEL = Path(__file__).resolve().parent.parent
BLOCKS = WURZEL / "ressourcenpaket" / "textures" / "blocks"

MINDESTGROESSE = 12     # ab wann ein Feld als Flaeche gilt
FLECKENANTEIL = 0.17    # Startpunkte; mit dem Nachbarn rechts ergibt das
                        # die dreissig Prozent, die an D gemessen sind

# Die Bilder, die Koernung bekommen. Die "an"-Fassung steht daneben: Sie
# bekommt dieselben Flecken an denselben Stellen, sonst springt die Wand
# beim Anzuenden.
ZIELE = [("feuerkasten_vorn", "feuerkasten_vorn_an"),
         ("feuerkasten_rund", "feuerkasten_rund_an")]


def streu(x, y, salz=0):
    """Eine Zahl 0..255, die von Ort zu Ort springt.

    Dieselbe Verwuerfelung wie beim Spawn-Ei: erst mit zwei grossen
    Primzahlen auseinandergezogen, dann geschoben und multipliziert. Eine
    lineare Summe aus x und y gaebe Diagonalstreifen.
    """
    h = (x * 73856093) ^ (y * 19349663) ^ (salz * 83492791)
    h = (h ^ (h >> 13)) * 1274126177
    return (h ^ (h >> 16)) & 0xFF


def felder(px, n):
    """Zusammenhaengende Felder gleicher Farbe, ab MINDESTGROESSE."""
    gesehen = set()
    gefunden = []
    for y in range(n):
        for x in range(n):
            if (x, y) in gesehen or not px[x, y][3]:
                continue
            ton = px[x, y]
            stapel, feld = [(x, y)], set()
            gesehen.add((x, y))
            while stapel:
                a, b = stapel.pop()
                feld.add((a, b))
                for da, db in ((-1, 0), (1, 0), (0, -1), (0, 1)):
                    p = (a + da, b + db)
                    if (0 <= p[0] < n and 0 <= p[1] < n and p not in gesehen
                            and px[p] == ton):
                        gesehen.add(p)
                        stapel.append(p)
            if len(feld) >= MINDESTGROESSE:
                gefunden.append((ton, feld))
    return gefunden


def fleckentoene(ton, palette):
    """Drei bis fuenf Nachbarstufen des Grundtons, nach hell und dunkel.

    Gesucht wird zuerst in der Palette des Bildes selbst, damit die
    Koernung nicht mit neuen Farben anrueckt. Was dort fehlt, wird
    gerechnet: Der Ofen ist durchweg grau, ein Helligkeitsversatz reicht.

    Bunte Toene bleiben draussen. Beide Tueren tragen am unteren Rand ein
    paar gruenlich-graue Pixel - in der Palette stehen sie neben den
    Grautoenen, und ueber die Flaeche gestreut sah die Wand beschimmelt
    aus statt gemauert.
    """
    h = sum(ton[:3])
    def grau(t):
        return max(t[:3]) - min(t[:3]) <= 6
    # Der Abstand bleibt eng. An der Seitenwand liegen die Flecken 26 bis
    # 102 Helligkeitsstufen neben ihrem Grund (ueber alle drei Kanaele
    # gerechnet). Mit der weiteren Grenze von 230 holte sich der Bottich
    # die tiefsten Schwarztoene seines Rings als Flecken - die Flaeche
    # wurde scheckig und der Ring ging darin unter.
    nah = sorted((t for t in palette if t != ton and t[3] and grau(t)
                  and 20 < abs(sum(t[:3]) - h) < 110),
                 key=lambda t: abs(sum(t[:3]) - h))[:4]
    for versatz in (14, -14, 26, -26):
        if len(nah) >= 4:
            break
        neu = tuple(max(0, min(255, k + versatz)) for k in ton[:3]) + (255,)
        if neu not in nah:
            nah.append(neu)
    return nah


def koernen(bild, salz=0):
    n = bild.width
    aus = bild.copy()
    px, ziel = bild.load(), aus.load()
    palette = set(bild.get_flattened_data())
    angefasst = 0
    for ton, feld in felder(px, n):
        toene = fleckentoene(ton, palette)
        for x, y in sorted(feld):
            w = streu(x, y, salz)
            if w >= FLECKENANTEIL * 256:
                continue
            fleck = toene[w % len(toene)]
            ziel[x, y] = fleck
            angefasst += 1
            # Der Nachbar rechts kommt mit, wenn er zur selben Flaeche
            # gehoert. Einzeln gesetzt wirkte die Koernung wie Pfeffer;
            # an der Seitenwand liegen die Flecken paarweise - kk, ll, mm
            # steht dort in fast jeder Zeile. Das gibt Mauerwerk statt
            # Rauschen.
            if (x + 1, y) in feld and ziel[x + 1, y] == ton:
                ziel[x + 1, y] = fleck
                angefasst += 1
    return aus, angefasst


def main():
    for i, (kalt, heiss) in enumerate(ZIELE):
        grund = Image.open(BLOCKS / f"{kalt}.png").convert("RGBA")
        neu, n = koernen(grund, salz=i)
        neu.save(BLOCKS / f"{kalt}.png")
        print(f"{kalt}: {n} Pixel gekoernt")

        # Die befeuerte Fassung bekommt dieselben Flecken. Sie wird nicht
        # neu gekoernt, sondern aus der kalten aufgebaut: Wo sie vom
        # Original abweicht, steht Feuer - das bleibt, alles andere kommt
        # aus der gekoernten Fassung.
        warm = Image.open(BLOCKS / f"{heiss}.png").convert("RGBA")
        a, b, c = grund.load(), warm.load(), neu.copy()
        cz = c.load()
        feuer = 0
        for y in range(warm.height):
            for x in range(warm.width):
                if b[x, y] != a[x, y]:
                    cz[x, y] = b[x, y]
                    feuer += 1
        c.save(BLOCKS / f"{heiss}.png")
        print(f"{heiss}: dieselben Flecken, {feuer} Feuerpixel behalten")


if __name__ == "__main__":
    main()
