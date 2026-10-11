#!/usr/bin/env python3
"""Zeichnet eine Textur als beschriftetes Raster zum Draufzeigen.

Fynn kann die Texturen nicht anfassen - er sagt sie an. Dafuer braucht er
einen Namen fuer jedes einzelne Pixel: die Spalte ueber eine Zahl, die
Zeile ueber eine Zahl, die Farbe ueber einen Buchstaben. "Zeile 7, Spalte
3 soll d statt f" ist damit eine vollstaendige Anweisung.

Die Buchstaben gelten ueber alle Bilder eines Blocks hinweg gleich: Wer in
der Vorderseite ein 'f' sieht, findet dieselbe Farbe unter 'f' auch in der
Seitenansicht. Waeren sie je Bild neu vergeben, waere jede Aussage ueber
zwei Bilder hinweg falsch.

Kleinbuchstaben tragen den Stein, von hell nach dunkel sortiert.
Grossbuchstaben tragen das Feuer. Der Unterschied ist mit blossem Auge
im Raster zu sehen, ohne in der Liste nachzuschlagen.

    python3 werkzeuge/texturkarte.py feuerkasten
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WURZEL = Path(__file__).resolve().parent.parent
BLOCKS = WURZEL / "ressourcenpaket" / "textures" / "blocks"

FELD = 34          # Kantenlaenge eines Pixelfeldes im Raster
RAND = 34          # Platz fuer die Zeilen- und Spaltenzahlen
KOPF = 58          # Platz fuer Titel und Vorschau darueber
SCHRIFT = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono-Bold.ttf"


def ist_feuer(farbe):
    """Ob ein Ton zum Feuer gehoert statt zum Stein.

    Der Stein ist durchweg ungesaettigt - seine drei Kanaele liegen nah
    beieinander. Das Feuer ist es nie. Die Grenze bei vierzig trennt die
    beiden Gruppen in allen sechs Bildern des Feuerkastens sauber; der
    graueste Feuerton hat einen Abstand von 195, der bunteste Stein 6.
    """
    r, g, b = farbe[:3]
    return max(r, g, b) - min(r, g, b) > 40


def zeichen_vergeben(bilder):
    """Ein Zeichen je Farbe, ueber alle Bilder eines Blocks hinweg."""
    farben = set()
    for bild in bilder.values():
        farben.update(f for f in bild.get_flattened_data() if f[3])

    stein = sorted((f for f in farben if not ist_feuer(f)),
                   key=lambda f: -sum(f[:3]))
    feuer = sorted((f for f in farben if ist_feuer(f)),
                   key=lambda f: -sum(f[:3]))
    zu = {}
    for i, f in enumerate(stein):
        zu[f] = "abcdefghijklmnopqrstuvwxyz"[i]
    for i, f in enumerate(feuer):
        zu[f] = "ABCDEFGHIJKLMNOPQRSTUVWXYZ"[i]
    return zu


def raster(bild, zu, titel):
    """Ein Bild als beschriftetes Raster, daneben die Textur in klein."""
    n = bild.width
    breite = RAND + n * FELD + 20 + n * 6
    hoehe = KOPF + RAND + n * FELD + 14
    blatt = Image.new("RGB", (breite, hoehe), (250, 250, 252))
    mal = ImageDraw.Draw(blatt)
    gross = ImageFont.truetype(SCHRIFT, 20)
    klein = ImageFont.truetype(SCHRIFT, 15)

    mal.text((14, 18), titel, fill=(30, 30, 40), font=gross)
    # Die Textur selbst daneben. Ein Raster aus Buchstaben sagt nicht,
    # wie das Bild aussieht - und zugeordnet wird zwischen beidem.
    vor = bild.resize((48, 48), Image.NEAREST)
    blatt.paste(vor, (breite - 62, 6), vor)

    px = bild.load()
    for y in range(n):
        mal.text((4, KOPF + RAND + y * FELD + FELD // 2 - 7), f"{y:2d}",
                 fill=(90, 90, 100), font=klein)
        for x in range(n):
            if y == 0:
                mal.text((RAND + x * FELD + FELD // 2 - 7, KOPF + RAND - 20),
                         f"{x:2d}", fill=(90, 90, 100), font=klein)
            f = px[x, y]
            ecke = (RAND + x * FELD, KOPF + RAND + y * FELD)
            kasten = [ecke, (ecke[0] + FELD - 1, ecke[1] + FELD - 1)]
            mal.rectangle(kasten, fill=f[:3] if f[3] else (250, 250, 252),
                          outline=(210, 210, 216))
            if not f[3]:
                continue
            # Die Beschriftung muss auf jedem Grund lesbar sein, und die
            # Toene reichen von fast schwarz bis fast weiss.
            schrift = (20, 20, 24) if sum(f[:3]) > 330 else (245, 245, 250)
            mal.text((ecke[0] + FELD // 2 - 7, ecke[1] + FELD // 2 - 10),
                     zu[f], fill=schrift, font=gross)
    return blatt


def legende(zu, breite):
    """Die Farbliste: Zeichen, Farbfleck, RGB-Werte."""
    reihen = sorted(zu.items(), key=lambda t: (t[1].isupper(), t[1]))
    zeilen = (len(reihen) + 1) // 2
    hoehe = 40 + zeilen * 30
    blatt = Image.new("RGB", (breite, hoehe), (250, 250, 252))
    mal = ImageDraw.Draw(blatt)
    gross = ImageFont.truetype(SCHRIFT, 20)
    klein = ImageFont.truetype(SCHRIFT, 16)
    mal.text((14, 8), "Farben - Kleinbuchstaben Stein, Grossbuchstaben Feuer",
             fill=(30, 30, 40), font=gross)
    for i, (f, z) in enumerate(reihen):
        sp, ze = i // zeilen, i % zeilen
        x, y = 14 + sp * (breite // 2 - 14), 38 + ze * 30
        mal.text((x, y + 2), z, fill=(30, 30, 40), font=gross)
        mal.rectangle([(x + 26, y), (x + 26 + 26, y + 24)], fill=f[:3],
                      outline=(180, 180, 190))
        mal.text((x + 62, y + 4), f"{f[0]:3d} {f[1]:3d} {f[2]:3d}",
                 fill=(70, 70, 80), font=klein)
    return blatt


def main():
    block = sys.argv[1] if len(sys.argv) > 1 else "feuerkasten"
    dateien = sorted(BLOCKS.glob(f"{block}*.png"))
    if not dateien:
        print(f"keine Bilder zu {block!r} gefunden")
        raise SystemExit(1)
    bilder = {p.stem: Image.open(p).convert("RGBA") for p in dateien}
    zu = zeichen_vergeben(bilder)

    # Je Textur eine eigene Datei, jede mit der Farbliste darunter. Alle
    # sechs untereinander ergaben ein Blatt von 690 auf 4048 Punkten - auf
    # einem iPad nur mit viel Wischen zu lesen, und die Farbliste stand
    # ganz unten, weit weg von jedem Raster.
    for name, bild in bilder.items():
        oben = raster(bild, zu, name)
        fuss = legende(zu, oben.width)
        blatt = Image.new("RGB", (oben.width, oben.height + fuss.height),
                          (250, 250, 252))
        blatt.paste(oben, (0, 0))
        blatt.paste(fuss, (0, oben.height))
        ziel = WURZEL / "vorschau" / f"{name}_karte.png"
        blatt.save(ziel)
        print(f"gezeichnet: {ziel.name}")
    print(f"{len(bilder)} Bilder, {len(zu)} Farben")

    # Dieselben Karten als Text, damit sie im Bericht stehen koennen.
    for n, b in bilder.items():
        px = b.load()
        print(f"\n{n}")
        print("    " + "".join(f"{x%10}" for x in range(b.width)))
        for y in range(b.height):
            print(f" {y:2d} " + "".join(zu[px[x, y]] if px[x, y][3] else "."
                                        for x in range(b.width)))


if __name__ == "__main__":
    main()
