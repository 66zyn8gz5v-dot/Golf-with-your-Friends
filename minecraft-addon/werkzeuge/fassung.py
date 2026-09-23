#!/usr/bin/env python3
"""Die Fassungsnummer an allen Stellen zugleich setzen.

Sie steht an neun Stellen: in beiden Manifesten je im Kopf, in jedem
Modul, im Namen und in der Beschreibung, dazu in der Abhaengigkeit des
Verhaltenspakets auf das Bilderpaket - und in den Sprachdateien am
Degen und am Stahlschwert, wo sie im Spiel ablesbar ist.

Von Hand gepflegt ist mindestens eine davon regelmaessig liegen
geblieben. Zuletzt war es die Abhaengigkeit: Das Verhaltenspaket
verlangte noch das Bilderpaket in 1.84, waehrend alles andere auf 1.92
stand.

    python3 werkzeuge/fassung.py 1.93
"""

import json
import re
import sys
from collections import OrderedDict
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
PAKETE = {
    "verhaltenspaket": ("Regeln", "Gegenstaende, Rezepte, Bloecke und Wesen."),
    "ressourcenpaket": ("Bilder", "Texturen, Modelle und Namen."),
}


def lies(pfad):
    return json.loads(pfad.read_text(encoding="utf-8"), object_pairs_hook=OrderedDict)


def schreib(pfad, inhalt):
    pfad.write_text(json.dumps(inhalt, indent=2, ensure_ascii=False) + "\n",
                    encoding="utf-8")


def setze(neu):
    zahlen = [int(t) for t in neu.split(".")]
    while len(zahlen) < 3:
        zahlen.append(0)
    kurz = "%d.%d" % (zahlen[0], zahlen[1])

    # Erst die Kennungen der Pakete einsammeln, damit die Abhaengigkeit
    # des einen auf das andere mitgezogen werden kann.
    kennungen = {}
    for paket in PAKETE:
        kennungen[lies(WURZEL / paket / "manifest.json")["header"]["uuid"]] = paket

    for paket, (was, beschreibung) in PAKETE.items():
        pfad = WURZEL / paket / "manifest.json"
        d = lies(pfad)
        d["header"]["version"] = zahlen
        d["header"]["name"] = f"Sternenpaket {kurz} ({was})"
        d["header"]["description"] = f"Fassung {kurz} - {beschreibung}"
        for modul in d["modules"]:
            if isinstance(modul.get("version"), list):
                modul["version"] = zahlen
        for abhaengig in d.get("dependencies", []):
            # Nur das eigene Schwesterpaket mitziehen. Die Module von
            # Mojang haben ihre eigenen Nummern und gehen uns nichts an.
            if abhaengig.get("uuid") in kennungen:
                abhaengig["version"] = zahlen
        schreib(pfad, d)
        print(f"{paket}: {kurz}")

    # Die Nummer am Werkzeug selbst, damit im Spiel ablesbar ist, welche
    # Fassung geladen ist.
    for sprache in ("de_DE", "en_US"):
        pfad = WURZEL / "ressourcenpaket" / "texts" / f"{sprache}.lang"
        text = pfad.read_text(encoding="utf-8")
        text = re.sub(r"(Stahlschwert|Degen) \d+\.\d+", rf"\1 {kurz}", text)
        pfad.write_text(text, encoding="utf-8")
    print(f"Sprachdateien: Degen und Stahlschwert auf {kurz}")


if __name__ == "__main__":
    if len(sys.argv) != 2:
        print(__doc__)
        raise SystemExit(1)
    setze(sys.argv[1])
