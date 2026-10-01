#!/usr/bin/env python3
"""Malt die Texturen des Schmelztiegels - des Blocks, der auf dem
Feuerkasten sitzt.

Bis hierher trug der Tiegel geliehene Bilder: Fuenf seiner sieben Dateien
waren pixelgleiche Kopien der Feuerkastenbilder. Jetzt bekommt er einen
eigenen Satz, der zum Feuerkasten passen soll. Darum uebernimmt er von
ihm, was die beiden als Paar erkennbar macht:

* den gesprenkelten Rand oben und unten und die Eckbeschlaege, Zeichen
  fuer Zeichen aus den Karten des Feuerkastens abgeschrieben,
* die Steinpalette - dieselben Buchstaben stehen fuer dieselben Farben
  wie in feuerkasten_*_karte.png,
* die Koernung aus ofen_koernung.py, mit derselben Staerke.

Eigen ist ihm, was ihn zum Tiegel macht: zwei Stahlreifen mit Nieten, wie
um einen Bottich, im Ton des Stahlbarrens; vorn eine Ausgussrinne und ein
Sichtschlitz; oben das Becken, in dem das Metall liegt - kalt erstarrt
und grau, befeuert fluessig und gluehend.

Die befeuerten Bilder entstehen aus den kalten: Nur wo die Karte "an"
etwas anderes sagt als die Karte "aus", steht Glut. Alles andere, auch
die Koernung, ist in beiden Pixel fuer Pixel gleich - sonst springt die
Wand beim Anzuenden.

    python3 werkzeuge/tiegel_texturen.py
"""

import math
from pathlib import Path

from PIL import Image

import ofen_koernung

WURZEL = Path(__file__).resolve().parent.parent
BLOCKS = WURZEL / "ressourcenpaket" / "textures" / "blocks"

# Dieselben Buchstaben wie in den Karten des Feuerkastens: Kleinbuchstaben
# Stein von hell nach dunkel, Grossbuchstaben Glut.
FARBEN = {
    "a": (172, 172, 172), "b": (162, 162, 162), "c": (149, 149, 149),
    "d": (143, 143, 143), "e": (138, 138, 138), "f": (129, 129, 129),
    "g": (118, 118, 118), "h": (101, 105, 99), "i": (91, 95, 89),
    "j": (75, 75, 75), "k": (69, 65, 65), "l": (58, 57, 57),
    "m": (47, 46, 46), "n": (17, 17, 17),
    "A": (221, 184, 41), "B": (221, 152, 41), "C": (255, 135, 0),
    "D": (225, 103, 60), "E": (221, 120, 41), "F": (221, 104, 41),
    "G": (240, 80, 46), "H": (221, 88, 41), "I": (221, 73, 41),
    # Der Stahl - die drei mittleren Toene des Stahlbarrens im Inventar,
    # damit man den Reifen als dasselbe Metall erkennt.
    "q": (196, 203, 214),   # Niet, Lichtkante
    "o": (150, 159, 174),   # Reifen
    "p": (104, 113, 130),   # Reifen, Schattenseite
}
STAHL = {FARBEN[z] + (255,) for z in "qop"}

REIFEN_OBEN = "eoqoooqooqoooqoe"      # Nieten in unregelmaessigem Abstand,
REIFEN_UNTEN = "e" + "p" * 14 + "e"   # wie von Hand geschlagen

# Die Seitenwand: Rand und Eckbeschlaege aus feuerkasten_seite, dazwischen
# dunkler Stein zwischen zwei Reifen. Unten dunkelt er nach - dort sitzt
# er ueber dem Feuer.
SEITE = [
    "acegfeffeeefafee",   # Rand, wie am Feuerkasten
    "gjjejjjjjjjjcjje",   # Eckbeschlaege, wie am Feuerkasten
    "cjccjjjjjjjjeejc",
    "cegejjjjjjjjecef",
    REIFEN_OBEN,
    REIFEN_UNTEN,
    "fjjkjjjjjjjljjjf",
    "ejjjkjjjjjjjkjje",
    "fjjjjjjljjjjjjjf",
    "ejljjjjjjjjjljje",
    "ejkjjjjjjjjjjkje",
    REIFEN_OBEN,
    REIFEN_UNTEN,
    "elmllmllllmlllle",   # Russ ueber dem Feuer
    "ellmlllllmllllle",
    "eeecffeeeeeefeee",   # Rand unten, wie am Feuerkasten
]

# Vorn: dieselbe Wand, dazu die Ausgussrinne oben und ein Sichtschlitz.
VORN = list(SEITE)
VORN[0] = "acegfennnnefafee"   # die Rinne schneidet in den Rand
VORN[1] = "gjjejmnnnnmjcjje"
VORN[2] = "cjccjjmnnmjjeejc"
VORN[3] = "cegejqoppoqjecef"   # Stahllippe unter der Rinne
VORN[7] = "ejjjjlllllljjjje"   # Einfassung des Schlitzes
VORN[8] = "fjjjlnnnnnnljjjf"   # der Schlitz
VORN[9] = "ejjjjbbbbbbjjjje"   # Sims darunter

# Befeuert: Metall in der Rinne, Glut im Schlitz.
VORN_AN = list(VORN)
VORN_AN[0] = "acegfeBAABefafee"
VORN_AN[1] = "gjjejmEBBEmjcjje"
VORN_AN[2] = "cjccjjmFFmjjeejc"
VORN_AN[8] = "fjjjlHEBBEHljjjf"

# Der Boden: glatter Stein wie unter dem Feuerkasten, mit einem Rost in
# der Mitte, durch den die Hitze heraufkommt. Man sieht ihn nur, wenn der
# Tiegel nicht auf dem Feuerkasten steht.
UNTEN = [
    "ljjjjjjjjjjjjjjl",
    *["jjjjjjjjjjjjjjjj"] * 5,
    "jjjjjpnpnpnjjjjj",
    "jjjjjnpnpnpjjjjj",
    "jjjjjpnpnpnjjjjj",
    "jjjjjnpnpnpjjjjj",
    *["jjjjjjjjjjjjjjjj"] * 5,
    "ljjjjjjjjjjjjjjl",
]


def oben(brennt):
    """Die Draufsicht: Rahmen wie am Feuerkasten, darin ein Stahlreifen
    und das runde Becken.

    Gerechnet statt gezeichnet, weil ein Kreis von Hand auf sechzehn
    Pixeln nie rund wird. Licht von oben links: Der Reifen ist dort hell,
    unten rechts im Schatten.
    """
    rand_oben = "acegfeffeeefafee"
    rand_unten = "ecegfeffeeefafea"
    links = "ccefefefeefc"       # Randspalten aus feuerkasten_oben,
    rechts = "cfeefeeefecc"      # Zeilen 2 bis 13
    karte = [rand_oben, "gejjjjjjjjjjjjae"]
    for y in range(2, 14):
        zeile = links[y - 2]
        for x in range(1, 15):
            r = math.hypot(x - 7.5, y - 7.5)
            if r < 4.3:                        # das Becken
                if brennt:
                    zeile += ("A" if r < 1.6 else "B" if r < 2.7
                              else "E" if r < 3.6 else "I")
                else:
                    # Kalt: erstarrtes Metall in der Mitte, dunkler Rand.
                    zeile += "g" if r < 2.6 else "m"
            elif r < 5.5:                      # der Reifen
                licht = (x - 7.5) + (y - 7.5)  # negativ = oben links
                zeile += "q" if licht < -4 else ("p" if licht > 3 else "o")
            else:
                zeile += "j"
        karte.append(zeile + rechts[y - 2])
    karte += ["egjjjjjjjjjjjjag", rand_unten]
    return karte


def malen(karte):
    for z in karte:
        assert len(z) == 16, (z, len(z))
    bild = Image.new("RGBA", (16, 16))
    px = bild.load()
    for y, zeile in enumerate(karte):
        for x, zeichen in enumerate(zeile):
            px[x, y] = FARBEN[zeichen] + (255,)
    return bild


def satz(name, kalt, warm=None, salz=0):
    """Schreibt ein Bild und, wenn es eines gibt, sein befeuertes Gegenstueck."""
    bild, _ = ofen_koernung.koernen(malen(kalt), salz=salz, ausgenommen=STAHL)
    bild.save(BLOCKS / f"{name}.png")
    geschrieben = [name]
    if warm:
        an = bild.copy()
        px = an.load()
        for y in range(16):
            for x in range(16):
                if warm[y][x] != kalt[y][x]:
                    px[x, y] = FARBEN[warm[y][x]] + (255,)
        an.save(BLOCKS / f"{name}_an.png")
        geschrieben.append(name + "_an")
    return geschrieben


def main():
    fertig = []
    # Verschiedene Salze, damit nicht jede Seite dieselben Flecken an
    # denselben Stellen traegt - nebeneinander saehe das gestempelt aus.
    fertig += satz("tiegel_seite", SEITE, salz=11)
    fertig += satz("tiegel_vorn", VORN, VORN_AN, salz=12)
    fertig += satz("tiegel_oben", oben(False), oben(True), salz=13)
    fertig += satz("tiegel_unten", UNTEN, salz=14)
    print("gemalt:", ", ".join(fertig))


if __name__ == "__main__":
    main()
