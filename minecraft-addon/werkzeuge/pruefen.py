#!/usr/bin/env python3
"""Prueft das Paket, bevor es aufs iPad geht.

Minecraft meldet keine Fehler: Ein Paket mit einem Tippfehler laedt einfach
nicht, oder der Gegenstand erscheint ohne Bild und mit einem kryptischen
Namen. Jede Pruefung hier entspricht einem Fehler, den man sonst im Spiel
suchen muesste, ohne einen Hinweis zu bekommen.
"""

import json
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
VERHALTEN = WURZEL / "verhaltenspaket"
RESSOURCEN = WURZEL / "ressourcenpaket"

fehler = []
hinweise = []


def lies(pfad):
    try:
        return json.loads(pfad.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fehler.append(f"Datei fehlt: {pfad.relative_to(WURZEL)}")
    except json.JSONDecodeError as problem:
        fehler.append(f"{pfad.relative_to(WURZEL)}: kaputtes JSON - {problem}")
    return None


def pruefe_manifeste():
    verhalten = lies(VERHALTEN / "manifest.json")
    ressourcen = lies(RESSOURCEN / "manifest.json")
    if not verhalten or not ressourcen:
        return

    kennungen = []
    for name, inhalt in (("Verhaltenspaket", verhalten), ("Ressourcenpaket", ressourcen)):
        kennungen.append(inhalt["header"]["uuid"])
        for baustein in inhalt["modules"]:
            kennungen.append(baustein["uuid"])

    # Vier gleiche Kennungen waeren der haeufigste Anfaengerfehler: Minecraft
    # haelt zwei Pakete mit derselben Kennung fuer dasselbe Paket.
    if len(set(kennungen)) != len(kennungen):
        fehler.append("Zwei Bausteine haben dieselbe UUID - Minecraft verwechselt sie dann.")

    abhaengig = [e["uuid"] for e in verhalten.get("dependencies", [])]
    if ressourcen["header"]["uuid"] not in abhaengig:
        fehler.append(
            "Das Verhaltenspaket verweist nicht auf das Ressourcenpaket - "
            "die Gegenstaende haetten dann kein Bild."
        )

    for paket in (VERHALTEN, RESSOURCEN):
        if not (paket / "pack_icon.png").exists():
            hinweise.append(f"{paket.name}: pack_icon.png fehlt (Paket zeigt ein leeres Feld).")


def pruefe_gegenstaende():
    zuordnung = lies(RESSOURCEN / "textures" / "item_texture.json")
    bekannte_bilder = set((zuordnung or {}).get("texture_data", {}))

    sprachen = {}
    for kuerzel in ("de_DE", "en_US"):
        pfad = RESSOURCEN / "texts" / f"{kuerzel}.lang"
        if not pfad.exists():
            fehler.append(f"Sprachdatei fehlt: texts/{kuerzel}.lang")
            sprachen[kuerzel] = set()
            continue
        schluessel = set()
        for zeile in pfad.read_text(encoding="utf-8").splitlines():
            if "=" in zeile and not zeile.strip().startswith("#"):
                schluessel.add(zeile.split("=", 1)[0].strip())
        sprachen[kuerzel] = schluessel

    kennungen = set()
    for datei in sorted((VERHALTEN / "items").glob("*.json")):
        inhalt = lies(datei)
        if not inhalt:
            continue
        gegenstand = inhalt["minecraft:item"]
        kennung = gegenstand["description"]["identifier"]
        kennungen.add(kennung)

        bild = gegenstand["components"].get("minecraft:icon", {}).get("textures", {}).get("default")
        if bild is None:
            fehler.append(f"{datei.name}: kein Bild angegeben (minecraft:icon).")
        elif bild not in bekannte_bilder:
            fehler.append(f"{datei.name}: Bild '{bild}' steht nicht in item_texture.json.")

        for kuerzel, schluessel in sprachen.items():
            if f"item.{kennung}" not in schluessel and f"item.{kennung}.name" not in schluessel:
                fehler.append(f"{kuerzel}.lang: kein Name fuer '{kennung}'.")

    # Jedes eingetragene Bild muss es auch wirklich geben.
    for name, eintrag in (zuordnung or {}).get("texture_data", {}).items():
        pfad = RESSOURCEN / (eintrag["textures"] + ".png")
        if not pfad.exists():
            fehler.append(f"item_texture.json: Datei fehlt - {eintrag['textures']}.png")

    return kennungen


def pruefe_rezepte(kennungen):
    for datei in sorted((VERHALTEN / "recipes").glob("*.json")):
        inhalt = lies(datei)
        if not inhalt:
            continue
        rezept = inhalt.get("minecraft:recipe_shaped") or inhalt.get("minecraft:recipe_shapeless")
        if not rezept:
            fehler.append(f"{datei.name}: unbekannte Rezeptart.")
            continue

        verwendet = [e["item"] for e in rezept.get("key", {}).values()]
        verwendet.append(rezept["result"]["item"])
        for eintrag in rezept.get("unlock", []):
            if "item" in eintrag:
                verwendet.append(eintrag["item"])

        for stueck in verwendet:
            # Nur eigene Gegenstaende pruefen - Vanilla-Namen kennen wir nicht.
            if stueck.startswith("fynn:") and stueck not in kennungen:
                fehler.append(f"{datei.name}: '{stueck}' gibt es als Gegenstand nicht.")

        muster = rezept.get("pattern", [])
        schluessel = set(rezept.get("key", {}))
        for zeile in muster:
            for zeichen in zeile:
                if zeichen != " " and zeichen not in schluessel:
                    fehler.append(f"{datei.name}: Zeichen '{zeichen}' im Muster hat keine Zutat.")


def main():
    pruefe_manifeste()
    kennungen = pruefe_gegenstaende()
    pruefe_rezepte(kennungen)

    for text in hinweise:
        print(f"  Hinweis: {text}")
    if fehler:
        print()
        for text in fehler:
            print(f"  FEHLER: {text}")
        print(f"\n{len(fehler)} Fehler. Das Paket wuerde im Spiel nicht richtig laufen.")
        return 1
    print(f"\nAlles in Ordnung. {len(kennungen)} Gegenstaende geprueft.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
