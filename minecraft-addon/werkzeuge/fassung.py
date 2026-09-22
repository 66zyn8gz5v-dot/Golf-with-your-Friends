#!/usr/bin/env python3
"""Zaehlt die Fassungsnummer in beiden Manifesten hoch.

Warum als Werkzeug und nicht von Hand: Die Nummer steht an sechs Stellen -
zweimal im Kopf jedes Pakets, einmal je Baustein, dazu im Namen und in der
Beschreibung. Von Hand ist das sechsmal die Gelegenheit, eine zu vergessen,
und ein Paket mit alter Nummer sieht im Spiel aus wie eines, das nicht
angekommen ist.

Die Nummer steht im Namen, damit sie in Minecrafts Paketliste auf einen
Blick zu lesen ist. Die Beschreibung steht darunter und ist klein.
"""

import json
import re
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
PAKETE = {
    "verhaltenspaket": ("Regeln", "Gegenstaende, Rezepte und Wesen."),
    "ressourcenpaket": ("Aussehen", "Bilder, Modelle und Namen."),
}


def jetzige():
    kopf = json.loads((WURZEL / "verhaltenspaket" / "manifest.json")
                      .read_text(encoding="utf-8"))["header"]["version"]
    return kopf[0], kopf[1]


def setze(gross, klein):
    for paket, (teil, satz) in PAKETE.items():
        pfad = WURZEL / paket / "manifest.json"
        text = pfad.read_text(encoding="utf-8")
        # Jede Fassungsnummer im Paket - Kopf wie Bausteine.
        text = re.sub(r'("version":\s*\[\s*)\d+,(\s*)\d+(,)',
                      rf'\g<1>{gross},\g<2>{klein}\g<3>', text)
        daten = json.loads(text)
        daten["header"]["name"] = f"Sternenpaket {gross}.{klein} ({teil})"
        daten["header"]["description"] = f"Fassung {gross}.{klein} - {satz}"
        pfad.write_text(json.dumps(daten, indent=2) + "\n", encoding="utf-8")

    # Der Name des Stahlschwerts traegt die Nummer mit. Sie ist das
    # Messgeraet fuer die Auslieferung: Was in der Hand steht, ist der
    # Stand, der wirklich im Spiel liegt.
    for sprache in ("de_DE", "en_US"):
        pfad = WURZEL / "ressourcenpaket" / "texts" / f"{sprache}.lang"
        text = pfad.read_text(encoding="utf-8")
        neu_text = re.sub(r"(item\.iron_sword\.name=Stahlschwert )[\d.]+",
                          rf"\g<1>{gross}.{klein}", text)
        neu_text = re.sub(r"(item\.fynn:degen(?:\.name)?=Degen )[\d.]+",
                          rf"\g<1>{gross}.{klein}", neu_text)
        if neu_text != text:
            pfad.write_text(neu_text, encoding="utf-8")

    print(f"Fassung {gross}.{klein}")


if __name__ == "__main__":
    if len(sys.argv) > 1:
        gross, klein = (int(t) for t in sys.argv[1].split("."))
    else:
        gross, klein = jetzige()
        klein += 1
    setze(gross, klein)
