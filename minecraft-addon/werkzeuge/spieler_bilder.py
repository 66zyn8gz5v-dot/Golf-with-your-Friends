#!/usr/bin/env python3
"""Bilderbogen der Spielerbewegungen - zum Nachsehen, ob sie sitzen.

Liest die fertigen Dateien im Ressourcenpaket, genau so, wie das Spiel sie
liest: Spielerdatei, Mojangs Animationen, unsere Animationen, das
Steinschwert als Attachable. Was hier falsch aussieht, ist auch im Spiel
falsch - und umgekehrt fast immer richtig.

    python3 werkzeuge/spieler_bilder.py ORDNER
"""

import sys
from pathlib import Path

from PIL import Image, ImageDraw

import spieler_ansehen as s


def bogen(zeilen, ziel, titel):
    """zeilen: Liste von (Beschriftung, [(Bild, Text), ...])."""
    b, hoehe = zeilen[0][1][0][0].size
    spalten = max(len(z[1]) for z in zeilen)
    kopf = 34
    gesamt = Image.new("RGBA", (spalten * b, kopf + len(zeilen) * (hoehe + 40)), (250, 250, 252, 255))
    mal = ImageDraw.Draw(gesamt)
    mal.text((10, 10), titel, fill=(20, 20, 30, 255))
    for r, (name, bilder) in enumerate(zeilen):
        y = kopf + r * (hoehe + 40)
        mal.text((10, y + 4), name, fill=(60, 60, 90, 255))
        for c, (einzel, text) in enumerate(bilder):
            gesamt.paste(einzel, (c * b, y + 20))
            mal.text((c * b + 8, y + 20 + hoehe - 16), text, fill=(30, 30, 40, 255))
    gesamt.save(ziel)
    return ziel


def alle(ordner):
    ordner = Path(ordner)
    ordner.mkdir(parents=True, exist_ok=True)
    sp = s.Spieler()
    schwert = s.Waffe(s.RES / "attachables" / "steinschwert.json")
    bogenwaffe = s.Waffe(s.RES / "attachables" / "bogen.json")
    fertig = []

    # Hieb aus der Ich-Sicht
    zeiten = (0.0, 0.15, 0.3, 0.42, 0.55, 0.75)
    zeilen = []
    for seite, name in ((1.0, "Vorhand"), (0.0, "Rueckhand")):
        reihe = []
        for t in zeiten:
            # Die Seite kippt beim Loslaufen des Zaehlers; vorher steht sie
            # auf dem Gegenteil.
            zustand = {"v.attack_time": t, "v.fynn_hieb_seite": seite, "v.fynn_hieb_zuvor": 0.0 if t else 0.0}
            if t:
                zustand["v.fynn_hieb_zuvor"] = t
                zustand["v.fynn_hieb_seite"] = 1.0 - seite
            b, _ = s.bild(sp, zustand, schwert, ich=True, breite=300, hoehe=208)
            reihe.append((b, f"t = {t:.2f}"))
        zeilen.append((f"Hieb, Ich-Sicht, {name}", reihe))
    fertig.append(bogen(zeilen, ordner / "hieb_ich.png", "Schwerthieb aus der Ich-Sicht (Steinschwert)"))

    # Hieb von aussen
    zeilen = []
    for seite, name in ((1.0, "Vorhand"), (0.0, "Rueckhand")):
        reihe = []
        for t in (0.0, 0.18, 0.35, 0.48, 0.62, 0.85):
            zustand = {"v.attack_time": t, "v.fynn_hieb_zuvor": t, "v.fynn_hieb_seite": 1.0 - seite if t else seite}
            b, _ = s.bild(sp, zustand, schwert, gier=35, zoom=6.0, breite=240, hoehe=300)
            reihe.append((b, f"t = {t:.2f}"))
        zeilen.append((f"Hieb von aussen, {name}", reihe))
    fertig.append(bogen(zeilen, ordner / "hieb_aussen.png", "Schwerthieb von aussen"))

    # Laufen, Rennen, Schleichen, Sprung
    zeilen = []
    for name, tempo, rennen in (("Gehen", 0.5, 0.0), ("Rennen", 0.9, 1.0)):
        reihe = []
        for gang in (0, 45, 90, 135, 180):
            # Tempo so, wie es das Spiel ungefaehr liefert: Gehen um 0.5,
            # Rennen um 0.9 (Minecrafts Beinschwung erreicht damit 40 und
            # 70 Grad).
            weg = gang / 38.17
            zustand = {"q.modified_distance_moved": weg, "q.modified_move_speed": tempo, "q.is_sprinting": rennen}
            b, _ = s.bild(sp, zustand, schwert, gier=70, zoom=6.0, breite=240, hoehe=300)
            reihe.append((b, f"Schritt {gang} Grad"))
        zeilen.append((name, reihe))
    reihe = []
    for text, zustand in (
            ("still", {"q.is_sneaking": 1.0}),
            ("geht", {"q.is_sneaking": 1.0, "q.modified_distance_moved": 45 / 38.17, "q.modified_move_speed": 0.4}),
            ("laedt halb", {"q.is_sneaking": 1.0, "v.fynn_lade": 0.5}),
            ("laedt voll", {"q.is_sneaking": 1.0, "v.fynn_lade": 1.0}),
            ("Sprung", {"q.is_on_ground": 0.0, "v.fynn_luft": 1.0})):
        zustand = dict(zustand)
        if "v.fynn_lade" not in zustand:
            zustand["v.fynn_lade"] = 0.0
        if "v.fynn_luft" not in zustand:
            zustand["v.fynn_luft"] = 0.0
        b, _ = s.bild(sp, zustand, schwert, gier=60, zoom=6.0, breite=240, hoehe=300)
        reihe.append((b, text))
    zeilen.append(("Schleichen, Aufladen, Sprung", reihe))
    fertig.append(bogen(zeilen, ordner / "bewegung.png", "Gehen, Rennen, Schleichen, Sprung"))

    # Bogen
    zeilen = []
    reihe, oben = [], []
    for text, zustand in (("spannt an", {"v.fynn_spannen": 0.1}), ("halb", {"v.fynn_spannen": 0.5}),
                          ("voll", {"v.fynn_spannen": 1.0}), ("los!", {"v.fynn_spannen": 0.0, "v.fynn_los": 0.8}),
                          ("danach", {"v.fynn_spannen": 0.0, "v.fynn_los": 0.2})):
        zustand = dict(zustand, **{"q.main_hand_item_use_duration": 0.0})
        b, _ = s.bild(sp, zustand, bogenwaffe, gier=40, zoom=6.0, breite=240, hoehe=300)
        reihe.append((b, text))
        b, _ = s.bild(sp, zustand, bogenwaffe, gier=150, neigung=55, zoom=6.0, breite=240, hoehe=300)
        oben.append((b, text))
    zeilen.append(("Bogen von aussen", reihe))
    zeilen.append(("Bogen von schraeg oben hinten", oben))
    fertig.append(bogen(zeilen, ordner / "bogen.png", "Bogen: Schuetzenstellung und Rueckstoss"))
    for f in fertig:
        print("gezeichnet:", f)
    return fertig


if __name__ == "__main__":
    alle(sys.argv[1])
