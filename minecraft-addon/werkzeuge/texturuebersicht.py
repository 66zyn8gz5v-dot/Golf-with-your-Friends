#!/usr/bin/env python3
"""Zeigt, welche Blocktextur gerade auf welcher Seite welches Blocks sitzt.

Eine Textur liegt als Datei im Paket, wird in terrain_texture.json unter
einem Kurznamen angemeldet und von einem Block unter diesem Kurznamen auf
eine Seite gelegt - dreimal derselbe Name an drei Stellen. Wer wissen
will, wo ein Bild landet, muss alle drei lesen.

Diese Tafel liest sie fuer ihn: jedes Bild mit Nummer, Dateiname und der
Stelle, an der es im Spiel auftaucht. Damit laesst sich per Nummer
ansagen, was wohin gehoert.

Die Seiten stehen als Rolle da, nicht als Himmelsrichtung. Im Block ist
"vorn" je nach Blickrichtung north, south, east oder west - acht
Umschaltungen sorgen dafuer. Diese Buchhaltung interessiert hier nicht;
was zaehlt, ist: vorn, Seite, oben, unten.

    python3 werkzeuge/texturuebersicht.py
"""

import json
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WURZEL = Path(__file__).resolve().parent.parent
BLOCKS = WURZEL / "ressourcenpaket" / "textures" / "blocks"
SCHRIFT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"
SCHMAL = "/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"

GEGEN = {"north": "south", "east": "west", "south": "north", "west": "east"}


def rolle(seite, richtung):
    """Was eine Himmelsrichtung am Block bedeutet.

    Sie bedeutet nichts fuer sich: Welche Wand vorn ist, haengt daran,
    wohin der Block gesetzt wurde. Bei placement_direction zeigt er sein
    Gesicht zum Spieler, also der Ausrichtung entgegen - steht
    cardinal_direction auf 'north', ist die Suedseite die Vorderseite.

    Die erste Fassung dieser Tabelle fuehrte alle vier Himmelsrichtungen
    als "vorn". Das stimmte, solange nur die Vorderseite ein eigenes Bild
    hatte. Seit die Querseiten das runde Bild tragen, meldete sie es als
    Vorderseite - eine Uebersicht, die etwas Falsches behauptet, ist
    schlimmer als keine.
    """
    if seite in ("up", "down"):
        return {"up": "oben", "down": "unten"}[seite]
    if seite == "*":
        return "Rest"
    if richtung is None:
        return f"Seite {seite}"
    if seite == GEGEN[richtung]:
        return "vorn"
    if seite == richtung:
        return "hinten"
    return "Querseite"


def verwendung():
    """Zu jedem Kurznamen: welcher Block, welche Rolle, an oder aus."""
    wo = {}
    for datei in sorted((WURZEL / "verhaltenspaket" / "blocks").glob("*.json")):
        d = json.loads(datei.read_text(encoding="utf-8"))["minecraft:block"]
        block = datei.stem

        def sammeln(instanzen, zustand, richtung):
            for seite, wert in instanzen.items():
                kurz = wert.get("texture")
                if kurz:
                    wo.setdefault(kurz, set()).add(
                        (block, rolle(seite, richtung), zustand))

        grund = d["components"].get("minecraft:material_instances", {})
        sammeln(grund, "", None)
        for p in d.get("permutations", []):
            bedingung = p.get("condition", "")
            an = "'an'" in bedingung
            richtung = next((r for r in GEGEN if f"'{r}'" in bedingung), None)
            sammeln(p["components"].get("minecraft:material_instances", {}),
                    "brennt" if an else "aus", richtung)
    return wo


def kurznamen():
    """Zu jeder Bilddatei ihr Kurzname aus terrain_texture.json."""
    pfad = WURZEL / "ressourcenpaket" / "textures" / "terrain_texture.json"
    d = json.loads(pfad.read_text(encoding="utf-8"))["texture_data"]
    zu = {}
    for kurz, eintrag in d.items():
        t = eintrag["textures"]
        for p in (t if isinstance(t, list) else [t]):
            zu[Path(p).stem] = kurz
    return zu


def tafel():
    dateien = sorted(BLOCKS.glob("*.png"))
    kurz_von = kurznamen()
    wo = verwendung()

    # Drei Spalten, nicht vier: Bei vier war die Zelle 200 Punkte breit,
    # und Namen wie "feuerkasten_vorn_an" liefen in die Nachbarzelle.
    SPALTEN, BILD, ZELLE_H, ZELLE_B = 3, 140, 262, 268
    zeilen = (len(dateien) + SPALTEN - 1) // SPALTEN
    breite = SPALTEN * ZELLE_B + 20
    blatt = Image.new("RGB", (breite, 64 + zeilen * ZELLE_H), (250, 250, 252))
    mal = ImageDraw.Draw(blatt)
    titel = ImageFont.truetype(SCHRIFT, 26)
    fett = ImageFont.truetype(SCHRIFT, 19)
    text = ImageFont.truetype(SCHMAL, 14)

    mal.text((20, 18), "Blocktexturen - wo jede gerade sitzt",
             fill=(30, 30, 40), font=titel)

    for i, datei in enumerate(dateien):
        sp, ze = i % SPALTEN, i // SPALTEN
        x, y = 20 + sp * ZELLE_B, 64 + ze * ZELLE_H
        bild = Image.open(datei).convert("RGBA").resize((BILD, BILD), Image.NEAREST)
        blatt.paste(bild, (x + 46, y + 2), bild)
        mal.rectangle([(x + 46, y + 2), (x + 46 + BILD, y + 2 + BILD)],
                      outline=(190, 190, 200))
        # Die Nummer neben das Bild, der Name darunter - nebeneinander
        # passten beide nicht in eine Zeile.
        mal.text((x + 8, y + 4), f"{i + 1}", fill=(200, 60, 40), font=titel)
        mal.text((x + 8, y + 2 + BILD + 8), datei.stem, fill=(30, 30, 40), font=fett)

        kurz = kurz_von.get(datei.stem)
        stellen = sorted(wo.get(kurz, set()))
        if not stellen:
            mal.text((x + 8, y + 2 + BILD + 34), "nirgends benutzt",
                     fill=(190, 60, 40), font=text)
        else:
            # Gleiche Rolle in mehreren Zustaenden nur einmal nennen.
            gesehen = []
            for block, rolle, zustand in stellen:
                zeile = f"{block}: {rolle}" + (f" ({zustand})" if zustand else "")
                if zeile not in gesehen:
                    gesehen.append(zeile)
            for j, zeile in enumerate(gesehen[:4]):
                mal.text((x + 8, y + 2 + BILD + 34 + j * 17), zeile,
                         fill=(70, 70, 80), font=text)
    return blatt


def main():
    ziel = WURZEL / "vorschau" / "blocktexturen_uebersicht.png"
    tafel().save(ziel)
    print(f"gezeichnet: {ziel.name}")

    kurz_von, wo = kurznamen(), verwendung()
    for i, datei in enumerate(sorted(BLOCKS.glob("*.png")), 1):
        stellen = sorted(wo.get(kurz_von.get(datei.stem), set()))
        kurz = "; ".join(f"{b}/{r}" + (f" ({z})" if z else "")
                         for b, r, z in stellen) or "nirgends benutzt"
        print(f"{i:2d}  {datei.stem:22s} {kurz}")


if __name__ == "__main__":
    main()
