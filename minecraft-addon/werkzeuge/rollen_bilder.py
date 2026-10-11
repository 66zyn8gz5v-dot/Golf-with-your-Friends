#!/usr/bin/env python3
"""Malt die Bilder fuer die Rollen: den Wappenstein und die Kraftleiste.

Der Wappenstein ist der Block, an dem man seine Rolle waehlt. Er traegt
ein geviertes Wappen - je ein Feld fuer jede Rolle, in ihrer Farbe:
Ritter Gold, Magier Blau, Bogenschuetze Gruen, Assassine Rot. Dieselben
Farben tragen die Kugeln der Kraftleiste, so dass man am Stein schon
sieht, welche Leiste zu welcher Rolle gehoert.

Die Kraftleiste ist kein Chattext, sondern steht ueber der Schnellleiste,
dort wo Minecraft kurze Meldungen zeigt. Damit dort Kugeln stehen koennen
und keine Buchstaben, bekommt das Paket eine eigene Zeichenseite:
font/glyph_E3.png. Jedes Feld darin ist ein Schriftzeichen, U+E300 bis
U+E3FF, und das Spiel malt an seiner Stelle das Bild.

Gemalt wird im Raster der Herzen: Eine Kugel ist 7 mal 7 Minecraft-Pixel,
jedes doppelt breit und hoch, weil die Zeichenseite doppelt so fein ist
wie die Schrift. Feiner zu malen ginge, aber dann saehe die Leiste neben
den Herzen fremd aus - Fynns Regel fuer die Waffen gilt hier genauso.

    python3 werkzeuge/rollen_bilder.py
"""

from pathlib import Path

from PIL import Image

import ofen_koernung

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"

# Reihenfolge wie in rollen.js: Feld 1 bis 4 volle Kugeln, 5 bis 8 halbe.
ROLLEN = ["ritter", "magier", "bogenschuetze", "assassine"]

# Je Rolle: Glanzpunkt, Licht, Grund, Schatten, tiefer Schatten, Rand.
KUGELFARBEN = {
    "ritter":        [(255, 250, 214), (255, 228, 110), (234, 184, 40),
                      (186, 130, 22), (140, 94, 16), (72, 50, 12)],
    "magier":        [(232, 246, 255), (124, 192, 255), (52, 122, 236),
                      (32, 78, 192), (22, 50, 140), (16, 26, 72)],
    "bogenschuetze": [(236, 255, 222), (152, 230, 112), (82, 180, 62),
                      (46, 126, 42), (30, 90, 30), (16, 46, 16)],
    "assassine":     [(255, 226, 226), (240, 112, 112), (200, 42, 52),
                      (142, 26, 36), (100, 16, 26), (52, 10, 16)],
}
LEER = (46, 46, 56, 210)
LEER_RAND = (26, 26, 32, 255)

# w Glanz, h Licht, c Grund, d Schatten, D tiefer Schatten, K Rand.
# Licht von oben links wie bei den Herzen.
KUGEL = [
    ".KKKKK.",
    "KwhcccK",
    "KhcccdK",
    "KcccddK",
    "KccdddK",
    "KcdddDK",
    ".KKKKK.",
]
HALB_BIS = 4      # Spalten 0..3 gefuellt, der Rest leer


def kugel(farben, gefuellt_bis=7):
    zeichen = dict(zip("whcdDK", farben))
    bild = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(KUGEL):
        for x, z in enumerate(zeile):
            if z == ".":
                continue
            if z == "K":
                # Auch der Rand wechselt dort die Farbe, wo die Fuellung
                # endet - wie beim halben Herz.
                ton = zeichen["K"] + (255,) if x < gefuellt_bis else LEER_RAND
            elif x < gefuellt_bis:
                ton = zeichen[z] + (255,)
            else:
                ton = LEER
            # Doppelt gross, eine Zeile Luft oben: Die Zeichenseite ist
            # doppelt so fein wie die Schrift.
            for dy in range(2):
                for dx in range(2):
                    bild.putpixel((x * 2 + dx, 1 + y * 2 + dy), ton)
    return bild


def leere_kugel():
    return kugel([LEER_RAND[:3]] * 6, gefuellt_bis=0)


def zeichenseite():
    seite = Image.new("RGBA", (256, 256), (0, 0, 0, 0))

    def setze(feld, bild):
        seite.paste(bild, ((feld % 16) * 16, (feld // 16) * 16))

    setze(0, leere_kugel())
    for i, rolle in enumerate(ROLLEN):
        setze(1 + i, kugel(KUGELFARBEN[rolle]))
        setze(5 + i, kugel(KUGELFARBEN[rolle], HALB_BIS))
    # Feld 9: ein goldener Stern hinter der Leiste, solange man die volle
    # Ruestung seiner Rolle traegt - dann kommt die Kraft schneller.
    stern = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(STERN):
        for x, z in enumerate(zeile):
            if z != ".":
                for dy in range(2):
                    for dx in range(2):
                        stern.putpixel((x * 2 + dx, 1 + y * 2 + dy), STERNFARBEN[z] + (255,))
    setze(9, stern)
    return seite


STERN = [
    "...K...",
    "..KwK..",
    "KKKhKKK",
    "KhhhccK",
    ".KhcdK.",
    "KhcKdcK",
    "KKK.KKK",
]
STERNFARBEN = {"w": (255, 250, 214), "h": (255, 228, 110), "c": (234, 184, 40),
               "d": (186, 130, 22), "K": (72, 50, 12)}


# ------------------------------------------------------------ Wappenstein

# Die Steinpalette des Feuerkastens, damit der Wappenstein in dieselbe
# Burg passt. Kleinbuchstaben hell nach dunkel.
STEIN = {
    "a": (172, 172, 172), "c": (149, 149, 149), "e": (138, 138, 138),
    "f": (129, 129, 129), "g": (118, 118, 118), "j": (75, 75, 75),
    "l": (58, 57, 57),
}
WAPPEN = {
    # Die Einfassung im Ton des Stahlbarrens, wie die Reifen am Tiegel.
    "o": (104, 113, 130), "q": (196, 203, 214),
    "Y": (234, 184, 40), "y": (186, 130, 22),
    "B": (52, 122, 236), "b": (32, 78, 192),
    "G": (82, 180, 62), "g": (46, 126, 42),
    "R": (200, 42, 52), "r": (142, 26, 36),
}

# Mauersteine im Verband: Fugen in Zeile 3, 7, 11, 15; die senkrechten
# Fugen springen von Reihe zu Reihe um einen halben Stein. Jeder Stein
# hat zwei glatte Zeilen, 14 Pixel - erst ab 12 koernt ofen_koernung.
def mauer():
    zeilen = []
    for y in range(16):
        if y % 4 == 3:
            zeilen.append("j" * 16)
            continue
        versatz = 0 if (y // 4) % 2 == 0 else 4
        zeile = ""
        for x in range(16):
            if (x + versatz) % 8 == 7:
                zeile += "j"
            elif y % 4 == 0:
                zeile += "c"          # Lichtkante oben am Stein
            else:
                zeile += "e"
        zeilen.append(zeile)
    return zeilen


# Der Schild, elf breit: oben Gold und Blau, unten Gruen und Rot, in der
# Mitte ein Niet, wo sich die Einfassung kreuzt.
SCHILD = [
    "ooooooooooo",
    "oYYYYoBBBBo",
    "oYyYYoBBbBo",
    "oYYYYoBBBBo",
    "oYYyYoBbBBo",
    "oooooqooooo",
    "oGGGGoRRRRo",
    "oGgGGoRRrRo",
    ".oGGGoRRRo.",
    ".oGGgoRrRo.",
    "..oGGoRRo..",
    "...ooooo...",
]

RAUTE = [
    "oooooo",
    "oYYBBo",
    "oYYBBo",
    "oGGRRo",
    "oGGRRo",
    "oooooo",
]


def male(karte, oben=(), links=0, top=0, salz=0):
    farben = {**STEIN, **WAPPEN}
    bild = Image.new("RGBA", (16, 16))
    for y, zeile in enumerate(karte):
        for x, z in enumerate(zeile):
            bild.putpixel((x, y), farben[z] + (255,))
    # Erst die Mauer koernen, dann das Wappen darueber - das Wappen ist
    # gemalt und soll glatt bleiben.
    bild, _ = ofen_koernung.koernen(bild, salz)
    for y, zeile in enumerate(oben):
        for x, z in enumerate(zeile):
            if z != ".":
                bild.putpixel((links + x, top + y), farben[z] + (255,))
    return bild


def main():
    ziel = RES / "font"
    ziel.mkdir(exist_ok=True)
    zeichenseite().save(ziel / "glyph_E3.png")
    print("gemalt: font/glyph_E3.png")

    # Der Wappenstein, fuer den SCHILD und RAUTE gemalt waren, ist seit
    # 4.20 durch den Rollenaltar ersetzt (altar_bauen.py). Die Mauer
    # nimmt der Altar weiter von hier.


if __name__ == "__main__":
    main()
