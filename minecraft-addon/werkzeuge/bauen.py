#!/usr/bin/env python3
"""Packt beide Pakete zu einer .mcaddon-Datei fuers iPad.

Eine .mcaddon ist nichts weiter als ein Zip-Archiv mit einem besonderen
Namensende. Minecraft erkennt daran, dass es die enthaltenen Pakete
einsortieren soll, statt die Datei nur zu oeffnen.
"""

import subprocess
import sys
import zipfile
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
ZIEL = WURZEL / "Sternenpaket.mcaddon"
PAKETE = ("verhaltenspaket", "ressourcenpaket")

# Sachen, die im Archiv nichts verloren haben und auf manchen Systemen
# heimlich entstehen.
UNERWUENSCHT = {".DS_Store", "Thumbs.db", "desktop.ini"}


def main():
    # Erst pruefen, dann packen: Eine kaputte Datei auf dem iPad kostet mehr
    # Zeit als ein abgebrochener Bauvorgang hier.
    pruefung = subprocess.run(
        [sys.executable, str(WURZEL / "werkzeuge" / "pruefen.py")],
        capture_output=True,
        text=True,
    )
    print(pruefung.stdout.strip())
    if pruefung.returncode != 0:
        print("\nNicht gepackt - erst die Fehler oben beheben.")
        return 1

    if ZIEL.exists():
        ZIEL.unlink()

    anzahl = 0
    with zipfile.ZipFile(ZIEL, "w", zipfile.ZIP_DEFLATED) as archiv:
        for paket in PAKETE:
            ordner = WURZEL / paket
            for datei in sorted(ordner.rglob("*")):
                if not datei.is_file() or datei.name in UNERWUENSCHT:
                    continue
                archiv.write(datei, f"{paket}/{datei.relative_to(ordner)}")
                anzahl += 1

    groesse = ZIEL.stat().st_size
    print(f"\nGepackt: {ZIEL.name} ({anzahl} Dateien, {groesse} Bytes)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
