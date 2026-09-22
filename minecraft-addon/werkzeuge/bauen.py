#!/usr/bin/env python3
"""Packt beide Pakete zu einer .mcaddon-Datei fuers iPad.

Eine .mcaddon ist nichts weiter als ein Zip-Archiv mit einem besonderen
Namensende. Minecraft erkennt daran, dass es die enthaltenen Pakete
einsortieren soll, statt die Datei nur zu oeffnen.
"""

import json
import subprocess
import sys
import zipfile
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
def fassung():
    """Die Versionsnummer aus dem Manifest, als "1.2" geschrieben."""
    kopf = json.loads((WURZEL / "verhaltenspaket" / "manifest.json")
                      .read_text(encoding="utf-8"))["header"]["version"]
    return f"{kopf[0]}.{kopf[1]}"


# Die Fassung steht im Dateinamen, damit im Downloads-Ordner des iPads nicht
# zwei gleich heissende Dateien liegen und die falsche angetippt wird.
ZIEL = WURZEL / f"Sternenpaket-{fassung()}.mcaddon"

# Wo der Notweg im Netz liegt. Steht hier, damit die Adresse im Bericht
# nicht von Hand zusammengesetzt wird - dabei verrutscht der Zweigname.
ADRESSE_NOTWEG = (
    "https://github.com/66zyn8gz5v-dot/Golf-with-your-Friends/raw/"
    "claude/minecraft-mod-bedrock-y7faxg/minecraft-addon/auslieferung/"
    "Sternenpaket.mcaddon"
)
PAKETE = ("verhaltenspaket", "ressourcenpaket")

# Sachen, die im Archiv nichts verloren haben und auf manchen Systemen
# heimlich entstehen.
UNERWUENSCHT = {".DS_Store", "Thumbs.db", "desktop.ini"}

# Fuer den Entwicklungsordner des iPads. Die Namen tauchen dort als
# Ordnernamen auf, deshalb sagen sie, was drin ist - "ressourcenpaket" sagt
# zwischen fremden Paketen wenig.
ENTWICKLUNG = {
    "sternenpaket_verhalten": "verhaltenspaket",
    "sternenpaket_bilder": "ressourcenpaket",
}


def packe_entwicklung(name, paket):
    """Ein Zip je Paket, mit dem Paketordner als Wurzel darin.

    Warum mit: Der Kurzbefehl auf dem iPad reicht weiter, was im Archiv
    steht. Laegen die Dateien lose darin, schuettete er sie einzeln in den
    Entwicklungsordner statt als Paket - und Minecraft faende nichts.

    Der Preis: Wer von Hand in der Dateien-App entpackt, bekommt den Ordner
    doppelt verschachtelt und muss den inneren nehmen. Deshalb heisst die
    Zip-Datei anders als der Ordner darin, dann ist erkennbar, welcher
    gemeint ist.
    """
    # Nach auslieferung/, weil das iPad sich die Dateien von dort ueber
    # GitHub selbst holt - siehe ANLEITUNG.md.
    ordner_ziel = WURZEL / "auslieferung"
    ordner_ziel.mkdir(exist_ok=True)
    # Anderer Dateiname als der Ordner darin - siehe oben.
    ziel = ordner_ziel / f"{name.replace('sternenpaket_', 'paket_')}.zip"
    if ziel.exists():
        ziel.unlink()
    ordner = WURZEL / paket
    anzahl = 0
    with zipfile.ZipFile(ziel, "w", zipfile.ZIP_DEFLATED) as archiv:
        for datei in sorted(ordner.rglob("*")):
            if not datei.is_file() or datei.name in UNERWUENSCHT:
                continue
            archiv.write(datei, f"{name}/{datei.relative_to(ordner)}")
            anzahl += 1
    print(f"Fuer den Entwicklungsordner: {ziel.name} ({anzahl} Dateien)")


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

    # Dieselbe Datei noch einmal nach auslieferung/, unter einem Namen ohne
    # Fassungsnummer. Sie ist der Notweg, wenn der Kurzbefehl klemmt: Ein
    # Tipp auf die Adresse auf GitHub, und Minecraft importiert sie selbst.
    # Ohne Nummer im Namen bleibt die Adresse immer dieselbe - eine Adresse,
    # die sich mit jeder Fassung aendert, ist keine, die man sich merkt.
    notweg = WURZEL / "auslieferung" / "Sternenpaket.mcaddon"
    notweg.parent.mkdir(exist_ok=True)
    notweg.write_bytes(ZIEL.read_bytes())
    print(f"Notweg zum Antippen: {notweg.name}")
    # Die Adresse mit Anhaengsel, und zwar bei jedem Bau neu ausgerechnet.
    # Am 22. September blieb eine Auslieferung haengen, obwohl auf GitHub
    # der neue Stand lag: Das iPad merkt sich, was hinter einer Adresse
    # steckt, und gibt beim naechsten Antippen die alte Datei aus dem
    # eigenen Gedaechtnis heraus, ohne nachzufragen. Die Adresse ist ja
    # dieselbe geblieben. Ein Anhaengsel mit der Fassungsnummer macht
    # daraus fuer das iPad eine fremde Adresse - und die holt es.
    print(f"Adresse fuer den Bericht (mit Anhaengsel gegen das Gedaechtnis "
          f"des iPads):\n  {ADRESSE_NOTWEG}?v={fassung().replace('.', '')}")

    for name, paket in ENTWICKLUNG.items():
        packe_entwicklung(name, paket)
    return 0


if __name__ == "__main__":
    sys.exit(main())
