#!/usr/bin/env python3
"""Der Block aufgeklappt wie ein Bastelbogen, zum Zuordnen per Ansage.

Fynn kann die Zuordnung nicht anklicken - er sagt sie an. Dafuer braucht
jede Seite eine Nummer und jedes Bild einen Buchstaben, dann ist "3=A"
eine vollstaendige Anweisung.

Links das Wuerfelnetz: oben der Deckel, in der Mitte die vier Waende der
Reihe nach, unten der Boden. Rechts die Bilder, die zur Verfuegung
stehen - paarweise, wo es ein befeuertes Gegenstueck gibt.

Gezeigt wird nur, was verschieden ist. Von den vierzehn Blockbildern im
Paket sind fuenf pixelgleiche Kopien anderer; sie stuenden zweimal in der
Reihe und waeren nicht auseinanderzuhalten.

    python3 werkzeuge/wuerfelnetz.py
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WURZEL = Path(__file__).resolve().parent.parent
BLOCKS = WURZEL / "ressourcenpaket" / "textures" / "blocks"
FETT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
NORMAL = "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"

HELL, LEISE, GRUND = (232, 230, 224), (150, 148, 142), (24, 26, 28)
GOLD = (226, 180, 90)

# Die Seiten des Wuerfels als Netz: (Spalte, Zeile, Nummer, Name).
NETZ = [(1, 0, "1", "OBEN"), (0, 1, "2", "LINKS"), (1, 1, "3", "VORN"),
        (2, 1, "4", "RECHTS"), (3, 1, "5", "HINTEN"), (1, 2, "6", "UNTEN")]

# Die verschiedenen Motive - kalt, befeuert, wie es aussieht.
BILDER = [
    ("A", "feuerkasten_vorn",  "feuerkasten_vorn_an", "Tuer mit Gitter"),
    ("B", "feuerkasten_oben",  "feuerkasten_oben_an", "Platte mit Loch"),
    ("C", "feuerkasten_rund",  "feuerkasten_rund_an", "runder Bottich"),
    ("D", "feuerkasten_seite", None,                  "schlichter Stein"),
    ("E", "feuerkasten_unten", None,                  "glatt, dunkel"),
]

KACHEL = 150


def blatt():
    titel = ImageFont.truetype(FETT, 30)
    zahl = ImageFont.truetype(FETT, 40)
    buchstabe = ImageFont.truetype(FETT, 34)
    klein = ImageFont.truetype(NORMAL, 17)

    hoehe = 200 + len(BILDER) * 128
    bild = Image.new("RGB", (1180, hoehe), GRUND)
    mal = ImageDraw.Draw(bild)

    mal.text((30, 24), "Der Feuerkasten, aufgeklappt", font=titel, fill=HELL)
    mal.text((30, 64), "Welches Bild gehoert auf welche Seite? Sag mir Paare, "
             "zum Beispiel: 3=A, 1=B", font=klein, fill=LEISE)

    links, oben = 40, 110
    for spalte, zeile, nummer, wie in NETZ:
        x, y = links + spalte * (KACHEL + 8), oben + zeile * (KACHEL + 8)
        mal.rectangle([x, y, x + KACHEL, y + KACHEL], fill=(44, 46, 50),
                      outline=(90, 92, 96), width=2)
        mal.text((x + 14, y + 12), nummer, font=zahl, fill=GOLD)
        mal.text((x + 14, y + KACHEL - 30), wie, font=klein, fill=LEISE)
    # Der Hinweis auf zwei Zeilen: einzeilig lief er unter die
    # Bilderspalte und wurde dort abgeschnitten.
    mal.text((links, oben + 3 * (KACHEL + 8) + 12),
             "Wie ein Bastelbogen: oben der Deckel,\n"
             "in der Mitte die vier Waende, unten der Boden.",
             font=klein, fill=LEISE)

    rechts = 700
    mal.text((rechts, 104), "Die Bilder, die es gibt", font=titel, fill=HELL)
    y = 152
    for kennzeichen, kalt, heiss, wie in BILDER:
        mal.text((rechts, y + 24), kennzeichen, font=buchstabe, fill=GOLD)
        b = Image.open(BLOCKS / f"{kalt}.png").convert("RGBA").resize((88, 88), Image.NEAREST)
        bild.paste(b, (rechts + 46, y), b)
        mal.text((rechts + 46, y + 92), wie, font=klein, fill=LEISE)
        if heiss:
            h = Image.open(BLOCKS / f"{heiss}.png").convert("RGBA").resize((88, 88), Image.NEAREST)
            bild.paste(h, (rechts + 190, y), h)
            mal.text((rechts + 190, y + 92), "wenn er brennt", font=klein, fill=LEISE)
        y += 128
    return bild


def main():
    ziel = WURZEL / "vorschau" / "netz_feuerkasten.png"
    blatt().save(ziel)
    print(f"gezeichnet: {ziel.name}")


if __name__ == "__main__":
    main()
