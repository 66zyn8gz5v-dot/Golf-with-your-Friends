#!/usr/bin/env python3
"""Baut Fynns Degen aus seiner Zeichenkarte.

Dieselbe Dickenstufung wie beim Stahlschwert, nur mit anderen Werten: Eine
Degenklinge ist zwei Pixel breit und soll trotzdem nicht wie ein Blech
aussehen, der Buegelkorb dagegen ist ein rundes Messingteil.

Wo der Korb anfaengt, wird gemessen statt abgezaehlt - genau wie beim
Schwert die Parierstange. Die breiteste Stelle der Karte gehoert zum Korb,
und von dort aus laeuft die Suche nach oben und unten, solange die Zeilen
noch halb so breit sind. Beim Degen findet sie dabei den ganzen Griffteil,
und das ist richtig: Korb, Griff und Knauf sind alle das dicke Stueck.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import waffe_bauen as w
from stahlschwert_bauen import parierstange
from vorlagen import degen as v

DICKE_KLINGE = 1.25
DICKE_KORB = 2.0


def dickenliste(karte):
    oben, unten = parierstange(karte)
    return [DICKE_KORB if oben <= z <= unten else DICKE_KLINGE
            for z in range(len(karte))], oben, unten


def main():
    ziel = Path(sys.argv[1]) if len(sys.argv) > 1 else None
    if ziel is None:
        wurzel = Path(__file__).resolve().parent.parent / "ressourcenpaket"
        modell = wurzel / "models" / "entity" / "degen.geo.json"
        textur = wurzel / "textures" / "entity" / "degen_haut.png"
    else:
        modell, textur = ziel / "degen.geo.json", ziel / "degen.png"

    dicken, oben, unten = dickenliste(v.KARTE)
    print(f"Korb und Griff in den Zeilen {oben} bis {unten} "
          f"({unten - oben + 1} von {len(v.KARTE)})")
    w.aus_zeichenkarte("degen", v.KARTE, v.FARBEN, dicke=dicken, mitte=v.MITTE,
                       ziel_modell=str(modell), ziel_textur=str(textur))

    # Das Inventarbild kommt aus derselben Vorlage, damit es nicht
    # irgendwo einzeln liegt und beim naechsten Mal keiner mehr weiss,
    # woraus es entstanden ist.
    from PIL import Image
    bild = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    for y, zeile in enumerate(v.BILD):
        for x, zeichen in enumerate(zeile):
            bild.putpixel((x, y), tuple(v.FARBEN.get(zeichen, (0, 0, 0, 0))))
    ziel_bild = (modell.parent.parent.parent / "textures" / "items" / "degen.png"
                 if ziel is None else ziel / "degen_bild.png")
    ziel_bild.parent.mkdir(parents=True, exist_ok=True)
    bild.save(ziel_bild)
    print(f"gebaut: {ziel_bild.name} - Fynns Gegenstandsbild")


if __name__ == "__main__":
    main()
