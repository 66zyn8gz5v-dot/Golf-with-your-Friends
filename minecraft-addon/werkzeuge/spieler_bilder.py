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

import kampf_animationen as k
import spieler_ansehen as s

A = s.RES / "attachables"
# Womit jede Waffenart gezeigt wird - rechts, und links (Zweithand).
VERTRETER = {k.SCHWERT: ("steinschwert", None), k.DOLCHE: ("eisendolche", "eisendolch_links"),
             k.HAMMER: ("kriegshammer", None), k.DEGEN: ("degen", None), k.STAB: ("feuerstab", None),
             k.WURF: ("wurfstern", None)}


def waffen(art):
    rechts, links = VERTRETER[art]
    return s.Waffe(A / f"{rechts}.json"), (s.Waffe(A / f"{links}.json") if links else None)


def angriffe(ordner, sp):
    """Je Waffenart ein Bogen: jeder Schlag der Folge von vorn, von der
    Seite und aus der Ich-Sicht. (Den linken Dolch zeichnet die Ich-Sicht
    hier nicht - er haengt an Mojangs Schildknochen, siehe dolche_bauen.)"""
    fertig = []
    for art in k.ANGRIFFE:
        w, z = waffen(art)
        zeilen = []
        for i, angriff in enumerate(k.ANGRIFFE[art]):
            for text, ich, gier in (("von vorn", False, 35), ("von der Seite", False, 100), ("Ich-Sicht", True, 0)):
                reihe = []
                for t in (0.0, 0.2, 0.3, 0.4, 0.5, 0.65, 0.85):
                    zustand = {"v.fynn_waffe": float(art), "v.fynn_schlag": float(i), "v.fynn_hiebzeit": t,
                               "v.fynn_kombo_waffe": float(art)}
                    # Die Ich-Sicht im Seitenverhaeltnis des iPads, sonst faellt
                    # rechts ab, was im Spiel noch zu sehen ist.
                    b, _ = s.bild(sp, zustand, w, ich=ich, gier=gier, zoom=5.0, breite=320 if ich else 240,
                                  hoehe=240, zweithand=z)
                    reihe.append((b, f"t = {t:.2f}"))
                zeilen.append((f"{i + 1}. {angriff.name} ({angriff.dauer} s), {text}", reihe))
        fertig.append(bogen(zeilen, ordner / f"angriff_{k.ARTNAME[art]}.png",
                            f"Schlagfolge {k.ARTNAME[art]}: {len(k.ANGRIFFE[art])} Schlaege"))
    return fertig


def haltungen(ordner, sp):
    zeilen = []
    for gier in (35, 100):
        reihe = []
        for art in k.HALTUNGEN:
            w, z = waffen(art)
            b, _ = s.bild(sp, {}, w, gier=gier, zoom=5.0, breite=220, hoehe=240, zweithand=z)
            reihe.append((b, k.ARTNAME[art]))
        zeilen.append((f"im Stehen, Blick {gier} Grad", reihe))
    return bogen(zeilen, ordner / "haltungen.png", "Kampfhaltungen je Waffenart")


def rolle(ordner, sp, w):
    zeilen = []
    for gier in (100, 35):
        reihe = []
        for t in (0.0, 0.1, 0.25, 0.4, 0.55, 0.7, 0.85, 0.95):
            zustand = {"v.fynn_rollzeit": t, "q.is_sneaking": 1.0, "q.is_on_ground": 0.0}
            b, _ = s.bild(sp, zustand, w, gier=gier, zoom=4.0, breite=200, hoehe=240)
            reihe.append((b, f"t = {t:.2f}"))
        zeilen.append((f"Blick {gier} Grad", reihe))
    return bogen(zeilen, ordner / "rolle.png", "Rolle vorwaerts (geduckt springen)")


def bogen(zeilen, ziel, titel):
    """zeilen: Liste von (Beschriftung, [(Bild, Text), ...])."""
    # Die Spalten so breit wie das breiteste Bild (die Ich-Sicht ist breiter).
    b = max(einzel.size[0] for _, bilder in zeilen for einzel, _ in bilder)
    hoehe = max(einzel.size[1] for _, bilder in zeilen for einzel, _ in bilder)
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

    fertig += angriffe(ordner, sp)
    fertig.append(haltungen(ordner, sp))
    fertig.append(rolle(ordner, sp, schwert))

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
