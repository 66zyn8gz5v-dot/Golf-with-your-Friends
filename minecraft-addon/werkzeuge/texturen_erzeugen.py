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

    # Alle Gegenstaende nebeneinander. Einzeln sieht fast jedes Bild
    # brauchbar aus; ob es zur uebrigen Welt passt, zeigt erst der direkte
    # Vergleich - daran ist die erste Fassung dieses Pakets gescheitert.
    hintergrund = (235, 235, 240, 255)
    luecke = [hintergrund] * 20
    nebeneinander = None
    for karte in bilder.values():
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
