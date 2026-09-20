#!/usr/bin/env python3
"""Baut aus einer Beschreibung aus Kaesten ein 3D-Waffenmodell samt Textur.

Warum ein Werkzeug und nicht von Hand: Ein 3D-Schwert besteht aus sieben
Kaesten, und jeder Kasten braucht sechs Texturfelder an genau berechneten
Stellen. Von Hand ist das eine Stunde Zaehlarbeit pro Waffe - und beim
naechsten Speer faengt man von vorn an. Hier sagt man, welche Kaesten es
gibt und woraus sie sind; die Felder sucht das Werkzeug selbst.

Die Farben stammen aus Mojangs eigenen Texturen (iron_sword.png), nicht aus
dem Gefuehl - geschaetzte Metalltoene waren beim Stein schon einmal daneben.
"""

import json
import sys
from pathlib import Path

from PIL import Image

# Aus iron_sword.png ausgelesen, von hell nach dunkel.
WERKSTOFFE = {
    "stahl": {
        "kern": (216, 216, 216),
        "glanz": (255, 255, 255),
        "flanke": (150, 150, 150),
    },
    "leder": {
        "kern": (104, 78, 30),
        "glanz": (137, 103, 39),
        "flanke": (73, 54, 21),
    },
    "eisen": {  # matter als die Klinge, fuer Parierstange und Knauf
        "kern": (150, 150, 150),
        "glanz": (190, 190, 190),
        "flanke": (107, 107, 107),
    },
}


def felder_eines_kastens(groesse):
    """Breite und Hoehe des Texturkreuzes, das ein Kasten braucht."""
    w, h, d = (int(round(z)) for z in groesse)
    return 2 * (d + w), d + h


def packe(kaesten, breite):
    """Legt die Texturkreuze reihenweise nebeneinander.

    Ein einfacher Regalpacker: Was nicht mehr in die Reihe passt, kommt in
    die naechste. Bei sieben Kaesten lohnt nichts Klügeres, und so bleibt
    nachvollziehbar, welches Feld wo liegt.
    """
    plaetze = {}
    x = y = zeilenhoehe = 0
    for kasten in kaesten:
        fw, fh = felder_eines_kastens(kasten["size"])
        if x + fw > breite:
            x = 0
            y += zeilenhoehe + 1
            zeilenhoehe = 0
        plaetze[kasten["name"]] = (x, y)
        x += fw + 1
        zeilenhoehe = max(zeilenhoehe, fh)
    return plaetze, y + zeilenhoehe


def uv_feld(uv, groesse, seite):
    """Ecke und Groesse eines Seitenfeldes im Bedrock-Kreuz.

    Gleiche Aufteilung wie im Betrachter - up liegt bei u+d, nachgesehen in
    Mojangs steve.png.
    """
    u, v = uv
    w, h, d = (int(round(z)) for z in groesse)
    return {
        "up":    (u + d,         v,     w, d),
        "down":  (u + d + w,     v,     w, d),
        "west":  (u,             v + d, d, h),
        "north": (u + d,         v + d, w, h),
        "east":  (u + d + w,     v + d, d, h),
        "south": (u + d + w + d, v + d, w, h),
    }[seite]


def male_flaeche(bild, feld, farben, seite, schliff, gewickelt=False):
    """Malt ein Seitenfeld: heller Kern, abgesetzte Kanten.

    Keine geschlossene Umrandung. Eine Klinge ist drei Pixel breit - zieht
    man aussen und oben und unten einen Rand, bleibt davon nichts als Rand
    uebrig, und das Schwert wird schwarz. Die Tiefe macht ohnehin der
    Unterschied zwischen den Flaechen, nicht ein gemalter Strich.
    """
    fu, fv, fw, fh = feld
    mitte = (fw - 1) / 2
    for zeile in range(fh):
        for spalte in range(fw):
            farbe = farben["kern"]
            if gewickelt and zeile % 2 == 1:
                farbe = farben["flanke"]
            if fw >= 3 and (spalte == 0 or spalte == fw - 1):
                farbe = farben["flanke"]
            # Der helle Streifen laengs der Mitte laesst die flache Seite
            # einer Klinge geschliffen aussehen statt wie ein Brett.
            if schliff and fw >= 3 and abs(spalte - mitte) < 0.6:
                farbe = farben["glanz"]
            if fh >= 3 and zeile == fh - 1:
                farbe = farben["flanke"]
            if seite == "down":
                farbe = farben["flanke"]
            bild.putpixel((fu + spalte, fv + zeile), farbe + (255,))


def baue(name, kennung, kaesten, breite=64, ziel_modell=None, ziel_textur=None):
    plaetze, hoehe = packe(kaesten, breite)
    hoehe = max(16, 1 << (max(1, hoehe - 1)).bit_length())  # auf Zweierpotenz

    bild = Image.new("RGBA", (breite, hoehe), (0, 0, 0, 0))
    knochen_kaesten = []

    for kasten in kaesten:
        uv = plaetze[kasten["name"]]
        farben = WERKSTOFFE[kasten["werkstoff"]]
        schliff = kasten.get("schliff", False)
        for seite in ("up", "down", "west", "north", "east", "south"):
            feld = uv_feld(uv, kasten["size"], seite)
            if feld[2] <= 0 or feld[3] <= 0:
                continue
            male_flaeche(bild, feld, farben, seite, schliff,
                         kasten.get("gewickelt", False))

        knochen_kaesten.append({
            "origin": kasten["origin"],
            "size": kasten["size"],
            "uv": list(uv),
        })

    modell = {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": f"geometry.{name}",
                "texture_width": breite,
                "texture_height": hoehe,
                "visible_bounds_width": 3,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1, 0],
            },
            "bones": [{
                # Der Name ist Vorschrift: Bedrock haengt den Knochen
                # "rightitem" an die Hand. Die Bindung daneben sorgt dafuer,
                # dass es auch in der linken Hand sitzt.
                "name": "rightitem",
                "binding": "q.item_slot_to_bone_name(c.item_slot)",
                "pivot": [0, 8, 0],
                "cubes": knochen_kaesten,
            }],
        }],
    }

    ziel_modell = Path(ziel_modell or f"{name}.geo.json")
    ziel_textur = Path(ziel_textur or f"{name}.png")
    ziel_modell.write_text(json.dumps(modell, indent=2) + "\n", encoding="utf-8")
    bild.save(ziel_textur)
    print(f"gebaut: {ziel_modell.name} und {ziel_textur.name} "
          f"({breite}x{hoehe}, {len(kaesten)} Kaesten)")
    return modell


# --------------------------------------------------------- Die Eisenklinge

# Aufrecht gebaut, Griff unten. Der Mittelgrat liegt quer zur Klinge und
# steht seitlich vor - das ist es, was die Waffe von vorne wie eine Raute
# aussehen laesst statt wie ein Brett.
EISENKLINGE = [
    # Eine Klinge ist ein flaches Band: breit, aber duenn. Der erste Versuch
    # hatte einen Mittelgrat als eigenen Kasten - damit war der Querschnitt
    # quadratisch, und das Schwert sah aus wie ein Stab. Der Grat sitzt
    # jetzt in der Textur, als heller Streifen laengs der Mitte, und der
    # Kasten bleibt einen Pixel duenn.
    {"name": "knauf",        "origin": [-1.0,  0, -1.0], "size": [2, 2, 2], "werkstoff": "eisen"},
    {"name": "griff",        "origin": [-1.0,  2, -0.5], "size": [2, 5, 1], "werkstoff": "leder", "gewickelt": True},
    {"name": "parierstange", "origin": [-3.0,  7, -1.0], "size": [6, 1, 2], "werkstoff": "eisen"},
    {"name": "klinge",       "origin": [-1.5,  8, -0.5], "size": [3, 11, 1], "werkstoff": "stahl", "schliff": True},
    {"name": "klinge_ort",   "origin": [-1.0, 19, -0.5], "size": [2, 2, 1], "werkstoff": "stahl", "schliff": True},
    {"name": "spitze",       "origin": [-0.5, 21, -0.5], "size": [1, 1, 1], "werkstoff": "stahl"},
]


if __name__ == "__main__":
    ziel = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    baue("eisenklinge", "fynn:eisenklinge", EISENKLINGE,
         ziel_modell=ziel / "eisenklinge.geo.json",
         ziel_textur=ziel / "eisenklinge.png")
