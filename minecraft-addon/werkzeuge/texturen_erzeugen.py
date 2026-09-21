#!/usr/bin/env python3
"""Erzeugt die Bilddateien des Ressourcenpakets aus Zeichenkarten.

Warum Zeichenkarten statt fertiger PNG-Dateien: So kann das Aussehen hier im
Text geaendert werden, ohne ein Malprogramm und ohne dass jemand eine
Binaerdatei im Projekt nachvollziehen muss. Wer einen Punkt in ein 'a'
aendert, setzt ein Pixel.
"""

import struct
import zlib
from pathlib import Path

GROESSE = 16  # Minecraft erwartet Gegenstandsbilder in 16x16.

# Jedes Zeichen ist eine Farbe. Der Punkt bleibt durchsichtig.
FARBEN = {
    ".": (0, 0, 0, 0),
    "a": (255, 246, 214, 255),   # Sternenlicht, heisser Kern
    "b": (240, 190, 92, 255),    # Gold, glimmend
    "c": (176, 122, 44, 255),    # Bernstein, abkuehlend
    # Mittelalter-Palette: geschmiedeter Stahl, Bronze, gegerbtes Leder.
    "w": (228, 233, 240, 255),   # Klinge, geschliffene Kante
    "s": (168, 178, 194, 255),   # Klinge, Schattenseite
    "d": (104, 114, 134, 255),   # Klinge, tiefer Schatten
    "k": (44, 46, 58, 255),      # Umriss, fast schwarz
    "g": (206, 158, 66, 255),    # Bronze, hell
    "e": (138, 98, 38, 255),     # Bronze, dunkel
    "l": (146, 98, 56, 255),     # Leder, hell
    "m": (94, 60, 34, 255),      # Leder, dunkel
    # Silber ist heller und kuehler als Stahl - sonst waere im Inventar
    # nicht zu unterscheiden, was aus dem Berg kommt und was geschmiedet ist.
    "z": (246, 249, 255, 255),   # Silber, Glanzpunkt
    "y": (206, 218, 236, 255),   # Silber, hell
    "x": (152, 168, 194, 255),   # Silber, Schatten
    "v": (98, 112, 140, 255),    # Silber, tief
    # Fels. Vier Toene statt einem, damit die Bloecke nicht wie eine glatte
    # Flaeche wirken - abgelesen an Minecrafts eigenem stone.png.
    "p": (143, 143, 143, 255),   # Stein, hell
    "o": (127, 127, 127, 255),   # Stein
    "u": (116, 116, 116, 255),   # Stein, mittel
    "q": (104, 104, 104, 255),   # Stein, dunkel
}

STERNENSTAUB = [
    "................",
    "....a......a....",
    "...aba....aba...",
    "....a......a....",
    "................",
    "......kkkk......",
    ".....kbccbk.....",
    "....kbcaacbk....",
    "...kbcaaaacbk...",
    "...kbcaaaacbk...",
    "....kbcaacbk....",
    ".....kbccbk.....",
    "......kkkk......",
    "...a........a...",
    "..aba......aba..",
    "...a........a...",
]

STERNENKLINGE = [
    ".............kwd",
    "............kwsd",
    "...........kwsd.",
    "..........kwsd..",
    ".........kwsd...",
    "........kwsd....",
    ".......kwsd.....",
    "......kwsd......",
    ".....kwsd.......",
    ".eegggkwsdgggee.",
    "..eekklmlkkee...",
    "...klmlk........",
    "..klmlk.........",
    ".klmlk..........",
    "kgglgk..........",
    ".kggk...........",
]



# Rohsilber, wie es aus dem Fels faellt: ein Klumpen, kein Barren. Gemalt von
# Fynn in der Pixelschmiede. Bewusst ohne schwarzen Umriss - der Brocken hat
# stattdessen dunklere Randpixel, so wie Minecrafts eigenes Roheisen.
ROHSILBER = [
    "................",
    "..........xxx...",
    "........xxzyzx..",
    ".......wvzyzwx..",
    "......syzzzwzwx.",
    "......szzzzzzzs.",
    ".....syzzzxwzzd.",
    "....yszxzxwwwzd.",
    "...dzzzxswwzzzv.",
    "...vzzzxxzzzzs..",
    "..vwzzxszzszys..",
    ".vzzzxxszzzyx...",
    ".wwzzxzzzzzx....",
    ".dwwzzzwvwd.....",
    "..sdvdv.........",
    "................",
]


# Der Silberbarren aus dem Ofen. Gemalt von Fynn in der Pixelschmiede - flach
# und schraeg, wie Minecraft seine Barren zeichnet, mit dunkler Vorderkante
# und hellem Ruecken. Diesmal mit Umriss.
SILBERBARREN = [
    "................",
    "................",
    "................",
    "..........kk....",
    ".......kkkyyk...",
    "....kkkywwwwwk..",
    ".kkkywwwwwwwwwk.",
    "kzwwwwwwwwwwzzwk",
    "kszwwwwwwzzzwxyk",
    "ksszwwzzzwxvvvyk",
    "kssszzwxvvvvyyyk",
    "kxsswxvvvdyyxkk.",
    ".kxswxdvddkkk...",
    "..kxsxdkkk......",
    "...kkkk.........",
    "................",
]


SILBERERZ = [
    "ppppouuouquuoooo",
    "oououoooooowduou",
    "ouqquuuquuwsdooo",
    "ooppopwpppsdouuu",
    "uoopwwsqpppppuoo",
    "opowssdoouuququp",
    "uowsdduppuuwdooo",
    "uusduquuowwsdooo",
    "pppopoopwssdooou",
    "oopoooppwsdppppo",
    "qououuqqsduoouuu",
    "oooowspoooowsdop",
    "ouuwsdouuwwsduqu",
    "ppwsdoouuwsduuup",
    "ouddoooowsdopppp",
    "oooooouupppoouoo",
]


# --- Der Glimmerling ---------------------------------------------------
#
# Die Mob-Textur ist ein Schnittmuster: Jede Wuerfelflaeche des Modells holt
# sich ihr Bild aus einem festen Rechteck dieser Datei. Die Bereiche unten
# entsprechen genau den "uv"-Angaben in glimmerling.geo.json - wer dort etwas
# verschiebt, muss hier mitziehen.
#
# Ein Pixel mit Alpha 254 statt 255 leuchtet im Dunkeln. Das kommt vom
# Material "entity_emissive_alpha": Es behandelt leicht durchsichtige Pixel
# als Eigenlicht. So glimmt das Tier nachts, ohne dass es eine Lichtquelle
# waere - Bedrock kann Mobs die Umgebung nicht erhellen lassen.

MOB_BREITE, MOB_HOEHE = 64, 32

FELL_HELL = (104, 116, 74, 255)
FELL = (78, 90, 56, 255)
FELL_DUNKEL = (52, 62, 38, 255)
HUF = (46, 38, 30, 255)
GLIMMEN = (255, 214, 120, 254)      # 254 = leuchtet
GLIMMEN_TIEF = (214, 160, 70, 254)
AUGE = (255, 246, 214, 254)


def rechteck(bild, x, y, breite, hoehe, farbe):
    for zeile in range(y, y + hoehe):
        for spalte in range(x, x + breite):
            bild[zeile][spalte] = farbe


def glimmerling_textur():
    leer = (0, 0, 0, 0)
    bild = [[leer for _ in range(MOB_BREITE)] for _ in range(MOB_HOEHE)]

    # Rumpf: uv [0,0], Wuerfel 6 breit, 5 hoch, 8 tief.
    rechteck(bild, 0, 0, 28, 13, FELL)
    rechteck(bild, 8, 0, 6, 8, FELL_HELL)        # Ruecken
    rechteck(bild, 14, 0, 6, 8, FELL_DUNKEL)     # Bauch
    # Glimmflecken auf dem Ruecken, wie Glut unter Moos.
    for fleck_x, fleck_y in ((9, 2), (12, 4), (10, 6)):
        rechteck(bild, fleck_x, fleck_y, 2, 1, GLIMMEN)
    rechteck(bild, 11, 1, 1, 1, GLIMMEN_TIEF)

    # Kopf: uv [28,0], Wuerfel 6x6x6.
    rechteck(bild, 28, 0, 24, 12, FELL)
    rechteck(bild, 34, 0, 6, 6, FELL_HELL)       # Schaedeldecke
    rechteck(bild, 40, 0, 6, 6, FELL_DUNKEL)     # Kehle
    rechteck(bild, 34, 6, 6, 6, FELL_HELL)       # Gesicht
    rechteck(bild, 35, 8, 1, 2, AUGE)            # linkes Auge
    rechteck(bild, 38, 8, 1, 2, AUGE)            # rechtes Auge
    rechteck(bild, 36, 10, 2, 1, FELL_DUNKEL)    # Schnauze
    rechteck(bild, 35, 6, 1, 1, GLIMMEN)         # Glimmen ueber den Augen
    rechteck(bild, 38, 6, 1, 1, GLIMMEN)

    # Beine: uv [0,16], Wuerfel 2x5x2. Alle vier teilen sich dieses Bild.
    rechteck(bild, 0, 16, 8, 7, FELL_DUNKEL)
    rechteck(bild, 2, 16, 2, 2, FELL)            # Oberseite am Rumpf
    rechteck(bild, 0, 21, 8, 2, HUF)             # dunkle Hufe unten

    return bild


def pruefe_karte(name, karte):
    """Ein verrutschtes Zeichen faellt sonst erst im Spiel auf - dort aber
    als unsichtbares Bild ohne Fehlermeldung."""
    if len(karte) != GROESSE:
        raise ValueError(f"{name}: {len(karte)} Zeilen statt {GROESSE}")
    for nummer, zeile in enumerate(karte):
        if len(zeile) != GROESSE:
            raise ValueError(
                f"{name}, Zeile {nummer}: {len(zeile)} Zeichen statt {GROESSE}"
            )
        for zeichen in zeile:
            if zeichen not in FARBEN:
                raise ValueError(f"{name}, Zeile {nummer}: '{zeichen}' hat keine Farbe")


def schreibe_png(pfad, pixelzeilen):
    """Schreibt ein PNG von Hand - so braucht das Projekt keine Zusatzpakete."""
    roh = b""
    for zeile in pixelzeilen:
        roh += b"\x00"  # Jede PNG-Zeile beginnt mit ihrer Filterart, hier: keine.
        for r, g, b, a in zeile:
            roh += bytes((r, g, b, a))

    def block(art, inhalt):
        kopf = art + inhalt
        return struct.pack(">I", len(inhalt)) + kopf + struct.pack(">I", zlib.crc32(kopf))

    breite = len(pixelzeilen[0])
    hoehe = len(pixelzeilen)
    kopfdaten = struct.pack(">IIBBBBB", breite, hoehe, 8, 6, 0, 0, 0)
    daten = (
        b"\x89PNG\r\n\x1a\n"
        + block(b"IHDR", kopfdaten)
        + block(b"IDAT", zlib.compress(roh, 9))
        + block(b"IEND", b"")
    )
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_bytes(daten)


def karte_zu_pixeln(karte, vergroesserung=1, hintergrund=None):
    zeilen = []
    for zeile in karte:
        pixelzeile = []
        for zeichen in zeile:
            farbe = FARBEN[zeichen]
            if hintergrund is not None and farbe[3] == 0:
                farbe = hintergrund
            pixelzeile.extend([farbe] * vergroesserung)
        for _ in range(vergroesserung):
            zeilen.append(pixelzeile)
    return zeilen


def main():
    hier = Path(__file__).resolve().parent.parent
    bilder = {
        "sternenstaub": STERNENSTAUB,
        "sternenklinge": STERNENKLINGE,
        "rohsilber": ROHSILBER,
        "silberbarren": SILBERBARREN,
    }
    for name, karte in bilder.items():
        pruefe_karte(name, karte)
        ziel = hier / "ressourcenpaket" / "textures" / "items" / f"{name}.png"
        schreibe_png(ziel, karte_zu_pixeln(karte))
        print(f"  geschrieben  {ziel.relative_to(hier)}")

        # Sechzehnfach vergroessert, weil 16x16 am Bildschirm ein Fleck ist.
        vorschau = hier / "vorschau" / f"{name}.png"
        schreibe_png(vorschau, karte_zu_pixeln(karte, 16, (235, 235, 240, 255)))
        print(f"  geschrieben  {vorschau.relative_to(hier)}")

    bloecke = {
        "silbererz": SILBERERZ,
    }
    for name, karte in bloecke.items():
        pruefe_karte(name, karte)
        ziel = hier / "ressourcenpaket" / "textures" / "blocks" / f"{name}.png"
        schreibe_png(ziel, karte_zu_pixeln(karte))
        print(f"  geschrieben  {ziel.relative_to(hier)}")

        vorschau = hier / "vorschau" / f"{name}.png"
        schreibe_png(vorschau, karte_zu_pixeln(karte, 16))
        print(f"  geschrieben  {vorschau.relative_to(hier)}")

    mob = hier / "ressourcenpaket" / "textures" / "entity" / "glimmerling.png"
    haut = glimmerling_textur()
    schreibe_png(mob, haut)
    print(f"  geschrieben  {mob.relative_to(hier)}")

    gross = [[farbe for farbe in zeile for _ in range(6)] for zeile in haut]
    vorschau_mob = hier / "vorschau" / "glimmerling_haut.png"
    schreibe_png(vorschau_mob, [zeile for zeile in gross for _ in range(6)])
    print(f"  geschrieben  {vorschau_mob.relative_to(hier)}")

    # Alle Gegenstaende nebeneinander. Einzeln sieht fast jedes Bild
    # brauchbar aus; ob es zur uebrigen Welt passt, zeigt erst der direkte
    # Vergleich - daran ist die erste Fassung dieses Pakets gescheitert.
    hintergrund = (235, 235, 240, 255)
    luecke = [hintergrund] * 20
    nebeneinander = None
    for karte in list(bilder.values()) + list(bloecke.values()):
        gross = karte_zu_pixeln(karte, 14, hintergrund)
        if nebeneinander is None:
            nebeneinander = gross
        else:
            nebeneinander = [a + luecke + b for a, b in zip(nebeneinander, gross)]
    ziel = hier / "vorschau" / "alle_zusammen.png"
    schreibe_png(ziel, nebeneinander)
    print(f"  geschrieben  {ziel.relative_to(hier)}")

    # Das Paketsymbol steht in der Paketliste des Spiels und darf nicht
    # durchsichtig sein - sonst sieht man dort ein leeres Feld.
    russbraun = (34, 27, 23, 255)
    for paket in ("verhaltenspaket", "ressourcenpaket"):
        ziel = hier / paket / "pack_icon.png"
        schreibe_png(ziel, karte_zu_pixeln(STERNENSTAUB, 8, russbraun))
        print(f"  geschrieben  {ziel.relative_to(hier)}")


if __name__ == "__main__":
    main()
