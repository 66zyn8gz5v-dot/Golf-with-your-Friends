#!/usr/bin/env python3
"""Baut Fynns Stahlschwert aus seiner Zeichenkarte - mit abgestufter Dicke.

Warum abgestuft: Mit einer Dicke fuer alles wird entweder die Klinge zum
Brett oder die Parierstange zum Blech. An einem echten Schwert ist die
Parierstange das wuchtigste Stueck, die Klinge flach und der Griff dazwischen.

Wo die drei Teile anfangen und aufhoeren, wird nicht abgezaehlt, sondern
gemessen: Die Parierstange ist die breiteste Stelle der Karte. Dann bleibt
die Aufteilung richtig, auch wenn Fynn die Karte noch einmal ueberarbeitet.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import waffe_bauen as w
from vorlagen import stahlklinge as v

# Die Tiefen in Pixeln. Die Parierstange bleibt so wuchtig wie bisher -
# Fynn wollte ausdruecklich nur Klinge und Griff duenner.
DICKE_KLINGE = 1.25
DICKE_PARIER = 2.0
DICKE_GRIFF = 1.5


def spannweite(text):
    """Wie breit eine Zeile ist, von der ersten bis zur letzten Farbe."""
    gemalt = [i for i, z in enumerate(text) if z != "."]
    return gemalt[-1] - gemalt[0] + 1 if gemalt else 0


def parierstange(karte):
    """Die Zeilen der Parierstange: der breite Block in der Mitte.

    Gesucht wird von der breitesten Zeile aus nach oben und unten, solange
    die Zeilen noch mindestens halb so breit sind. Die Klinge darueber ist
    deutlich schmaler, der Griff darunter erst recht - dazwischen liegt die
    Luecke, an der die Suche von selbst stehen bleibt.
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
    ziel = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if ziel is None:
        wurzel = Path(__file__).resolve().parent.parent / "ressourcenpaket"
        modell = wurzel / "models" / "entity" / "stahlklinge.geo.json"
        textur = wurzel / "textures" / "entity" / "stahlklinge.png"
    else:
        modell = ziel / "stahlklinge.geo.json"
        textur = ziel / "stahlklinge.png"

    dicken, oben, unten = dickenliste(v.KARTE)
    print(f"Parierstange in den Zeilen {oben} bis {unten} "
          f"({unten - oben + 1} von {len(v.KARTE)})")

    w.aus_zeichenkarte("stahlklinge", v.KARTE, v.FARBEN, dicke=dicken,
                       mitte=v.MITTE,
                       ziel_modell=str(modell), ziel_textur=str(textur))


if __name__ == "__main__":
    main()
