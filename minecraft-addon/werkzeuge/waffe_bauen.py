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
        # Aus Fynns Vorlage gemessen: der Schatten neben dem Grat ist 122,
        # nicht 150. Der Unterschied entscheidet, ob die Klinge raeumlich
        # wirkt oder wie angemalt.
        "flanke": (122, 122, 122),
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


def male_flaeche(bild, feld, farben, seite, schliff, gewickelt=False,
                 abschnitte=False):
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
            # Drei Toene nebeneinander, nicht symmetrisch: hell, dunkel,
            # mittel. Aus Fynns Vorlage abgelesen - das Licht faellt von
            # einer Seite, also liegt der Glanz auf der einen Schneide, der
            # Schatten neben dem Grat und der Grundton auf der anderen
            # Haelfte. Ein Glanzstreifen genau in der Mitte sieht dagegen
            # aus wie ein Brett mit Strich.
            if schliff and fw >= 3:
                farbe = (farben["glanz"] if spalte == 0
                         else farben["flanke"] if spalte == 1
                         else farben["kern"])
            elif schliff and fw == 2:
                farbe = farben["glanz"] if spalte == 0 else farben["kern"]
            if fh >= 3 and zeile == fh - 1:
                farbe = farben["flanke"]
            # Abschnitte der Laenge nach, zur Spitze hin heller. Eine
            # einfarbige Klinge sieht aus wie ein ausgeschnittenes Stueck
            # Papier; die Vorlage staffelt sie in Stufen.
            if abschnitte and fh >= 6 and farbe != farben["flanke"]:
                stufe = (zeile * 4) // fh
                farbe = tuple(min(255, max(0, k + (1 - stufe) * 14)) for k in farbe)
            if seite == "down":
                farbe = farben["flanke"]
            bild.putpixel((fu + spalte, fv + zeile), farbe + (255,))


def pruefe_luecken(kaesten):
    """Warnt, wenn zwischen zwei Teilen der Mittelachse Luft bleibt.

    Genau diese Luecke hat Fynn im Spiel gesehen: "schrumpfen" zieht einen
    Kasten in alle Richtungen zusammen, auch in der Laenge, und dann
    stossen zwei Teile nicht mehr aneinander. Von aussen sieht man es
    kaum, im Spiel schwebt die Spitze.
    """
    achse = []
    for k in kaesten:
        # Teile, die seitlich ausscheren, gehoeren nicht zur Mittelachse.
        if abs(k["origin"][0] + k["size"][0] / 2) > 0.6:
            continue
        s = k.get("schrumpfen", 0)
        achse.append((k["origin"][1] - s, k["origin"][1] + k["size"][1] + s, k["name"]))
    achse.sort()
    luecken = []
    for (u1, o1, n1), (u2, o2, n2) in zip(achse, achse[1:]):
        if u2 > o1 + 0.001:
            luecken.append(f"  zwischen {n1} und {n2}: {o1:.3f} bis {u2:.3f}")
    if luecken:
        print("Luecken in der Mittelachse:")
        print("\n".join(luecken))
    return not luecken


def baue(name, kennung, kaesten, breite=64, ziel_modell=None, ziel_textur=None):
    pruefe_luecken(kaesten)
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
                         kasten.get("gewickelt", False),
                         kasten.get("abschnitte", False))

        eintrag = {
            "origin": kasten["origin"],
            "size": kasten["size"],
            "uv": list(uv),
        }
        # Ein negativer Wert schrumpft den Kasten in alle Richtungen. So wird
        # aus einem Pixel Dicke ein halber - fuer Schneiden, die duenner sind
        # als der Grat in der Mitte.
        if kasten.get("schrumpfen"):
            eintrag["inflate"] = kasten["schrumpfen"]
        knochen_kaesten.append(eintrag)

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
    # Aus der Vorlage gemessen, ein Pixel entspricht dort 49 Bildpunkten:
    # Klinge 151 Punkte breit (drei Pixel), Parierstange 340 (sieben), Griff
    # 76 - also anderthalb, hier noch etwas schlanker.
    #
    # Achtung bei "schrumpfen": Es zieht den Kasten in ALLE Richtungen
    # zusammen, also auch in der Laenge. Zwei duenne Teile, die im Raster
    # aneinanderstossen, haben danach eine Luecke dazwischen. Deshalb
    # ueberlappen die Stuecke hier um mehr, als sie schrumpfen.
    # Ein Kasten statt zweier Stufen: Jede Verbreiterung nach unten liest
    # sich als Sockel, auf dem das Schwert steht. Der Knauf ist deshalb nur
    # eine Spur staerker als der Griff, nicht mehr.
    {"name": "knauf",        "origin": [-1.0, 0, -1.0], "size": [2, 2.5, 2], "werkstoff": "eisen", "schrumpfen": -0.3},
    {"name": "griff",        "origin": [-1.0,  1.5, -1.0], "size": [2, 5, 2], "werkstoff": "leder", "gewickelt": True, "schrumpfen": -0.375},
    {"name": "parier_mitte", "origin": [-1.5,  6, -1.0], "size": [3, 1, 2], "werkstoff": "eisen"},
    {"name": "parier_links", "origin": [-3.5,  6, -0.5], "size": [2, 1, 1], "werkstoff": "eisen", "schrumpfen": -0.125},
    {"name": "parier_rechts","origin": [ 1.5,  6, -0.5], "size": [2, 1, 1], "werkstoff": "eisen", "schrumpfen": -0.125},
    {"name": "klinge",       "origin": [-1.5,  6.5, -0.5], "size": [3, 14, 1], "werkstoff": "stahl", "schliff": True, "schrumpfen": -0.375, "abschnitte": True},
    {"name": "grat",         "origin": [-0.5,  6.5, -0.5], "size": [1, 14, 1], "werkstoff": "stahl", "schrumpfen": -0.25},
    {"name": "klinge_ort",   "origin": [-1.0, 19.5, -0.5], "size": [2, 2, 1], "werkstoff": "stahl", "schliff": True, "schrumpfen": -0.375},
    {"name": "spitze",       "origin": [-0.5, 20.5, -0.5], "size": [1, 2, 1], "werkstoff": "stahl", "schrumpfen": -0.25},
]


if __name__ == "__main__":
    ziel = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    baue("eisenklinge", "fynn:eisenklinge", EISENKLINGE,
         ziel_modell=ziel / "eisenklinge.geo.json",
         ziel_textur=ziel / "eisenklinge.png")
