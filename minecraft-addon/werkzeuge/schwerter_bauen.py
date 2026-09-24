#!/usr/bin/env python3
"""Baut Fynns fuenf weitere Klingen - Holz, Kupfer, Gold, Diamant, Netherit.

Dasselbe Verfahren wie beim Stahlschwert, nur fuer alle auf einmal: Die
Zeichnung wird zeilenweise zu Kaesten, und die Tiefe richtet sich danach,
welcher Teil des Schwerts gerade dran ist. Mit einer Dicke fuer alles wird
entweder die Klinge zum Brett oder die Parierstange zum Blech.

Wo die Parierstange sitzt, wird nicht abgezaehlt, sondern gemessen: Sie
ist die breiteste Stelle der Zeichnung. So bleibt die Aufteilung richtig,
auch wenn eine Zeichnung noch einmal ueberarbeitet wird.

    python3 werkzeuge/schwerter_bauen.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import waffe_bauen as w

# Dieselben Tiefen wie beim Stahlschwert, damit die Reihe zusammenpasst.
DICKE_KLINGE = 1.25
DICKE_PARIER = 2.0
DICKE_GRIFF = 1.5

# Vorlage, Modellname und das Vanilla-Schwert, das sie ersetzt.
KLINGEN = [
    ("holzklinge",     "minecraft:wooden_sword"),
    ("kupferklinge",   "minecraft:copper_sword"),
    ("goldklinge",     "minecraft:golden_sword"),
    ("diamantklinge",  "minecraft:diamond_sword"),
    ("netheritklinge", "minecraft:netherite_sword"),
]


def spannweite(text):
    """Wie breit eine Zeile ist, von der ersten bis zur letzten Farbe."""
    gemalt = [i for i, z in enumerate(text) if z != "."]
    return gemalt[-1] - gemalt[0] + 1 if gemalt else 0


def parierstange(karte):
    """Die Zeilen der Parierstange: der breite Block in der Mitte.

    Gesucht wird von der breitesten Zeile aus nach oben und unten, solange
    die Zeilen noch mindestens halb so breit sind.
    """
    weiten = [spannweite(z) for z in karte]
    breiteste = weiten.index(max(weiten))
    schwelle = max(weiten) / 2
    oben = breiteste
    while oben > 0 and weiten[oben - 1] >= schwelle:
        oben -= 1
    unten = breiteste
    while unten < len(weiten) - 1 and weiten[unten + 1] >= schwelle:
        unten += 1
    return oben, unten


def dickenliste(karte):
    """Eine Tiefe je Bildzeile, von oben nach unten."""
    oben, unten = parierstange(karte)
    liste = []
    for zeile in range(len(karte)):
        if zeile < oben:
            liste.append(DICKE_KLINGE)
        elif zeile <= unten:
            liste.append(DICKE_PARIER)
        else:
            liste.append(DICKE_GRIFF)
    return liste, oben, unten


def main():
    wurzel = Path(__file__).resolve().parent.parent / "ressourcenpaket"
    import importlib
    for name, _ersetzt in KLINGEN:
        v = importlib.import_module("vorlagen." + name)
        dicken, oben, unten = dickenliste(v.KARTE)
        modell = wurzel / "models" / "entity" / (name + ".geo.json")
        textur = wurzel / "textures" / "entity" / (name + ".png")
        w.aus_zeichenkarte(name, v.KARTE, v.FARBEN, dicke=dicken,
                           mitte=v.MITTE,
                           ziel_modell=str(modell), ziel_textur=str(textur))
        print(f"  {name}: Parierstange in Zeile {oben}-{unten} "
              f"von {len(v.KARTE)}")


if __name__ == "__main__":
    main()
