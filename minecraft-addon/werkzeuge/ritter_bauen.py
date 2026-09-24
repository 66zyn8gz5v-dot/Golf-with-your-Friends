#!/usr/bin/env python3
"""Baut den Koerper des Ritters und die Vorlage fuer seine Haut.

Warum ein Werkzeug und keine von Hand geschriebene Datei: Ein Mensch
besteht aus acht Kaesten, die alle voneinander abhaengen - der Arm haengt
an der Schulter, der Helm am Kopf. Aendert sich die Koerpergroesse, muss
jede Zahl mitwandern. Hier steht sie einmal.

Das Feldmuster der Haut ist das von Minecraft selbst: Kopf oben links,
Koerper in der Mitte, Arme und Beine daneben. Wer schon einmal einen Skin
gemalt hat, findet sich sofort zurecht - und Vorlagen aus dem Netz passen.

    python3 werkzeuge/ritter_bauen.py
"""

import json
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
BILDER = WURZEL / "ressourcenpaket"

# Zwei Bloecke hoch, wie ein Dorfbewohner: 32 Pixel vom Boden bis zum
# Scheitel. Beine 12, Koerper 12, Kopf 8.
BEIN, RUMPF, KOPF = 12, 12, 8


def kasten(ort, groesse, uv, blaehen=0.0):
    k = {"origin": ort, "size": groesse, "uv": uv}
    if blaehen:
        k["inflate"] = blaehen
    return k


def modell():
    """Die Knochen. Die Namen sind die von Minecraft - daran haengen die
    eingebauten Animationen fuers Gehen, Schlagen und Umschauen."""
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry.ritter",
                "texture_width": 64,
                "texture_height": 64,
                "visible_bounds_width": 2,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": [
                {"name": "body", "pivot": [0, BEIN, 0], "cubes": [
                    kasten([-4, BEIN, -2], [8, RUMPF, 4], [16, 16]),
                    # Die Ruestung sitzt als zweite Haut darueber, einen
                    # Viertelpixel abgehoben. Sonst flackert sie mit dem
                    # Koerper darunter um dieselben Flaechen.
                    kasten([-4, BEIN, -2], [8, RUMPF, 4], [16, 32], 0.25),
                ]},
                {"name": "head", "parent": "body", "pivot": [0, BEIN + RUMPF, 0], "cubes": [
                    kasten([-4, BEIN + RUMPF, -4], [8, KOPF, 8], [0, 0]),
                ]},
                # Der Helm ist eine eigene Schicht ueber dem Kopf. So laesst
                # er sich je Rittersorte austauschen, ohne das Gesicht
                # noch einmal zu malen.
                {"name": "hat", "parent": "head", "pivot": [0, BEIN + RUMPF, 0], "cubes": [
                    kasten([-4, BEIN + RUMPF, -4], [8, KOPF, 8], [32, 0], 0.5),
                ]},
                {"name": "rightArm", "parent": "body", "pivot": [-5, BEIN + RUMPF - 2, 0], "cubes": [
                    kasten([-8, BEIN, -2], [4, RUMPF, 4], [40, 16]),
                    kasten([-8, BEIN, -2], [4, RUMPF, 4], [40, 32], 0.25),
                ]},
                {"name": "leftArm", "parent": "body", "pivot": [5, BEIN + RUMPF - 2, 0], "cubes": [
                    kasten([4, BEIN, -2], [4, RUMPF, 4], [32, 48]),
                    kasten([4, BEIN, -2], [4, RUMPF, 4], [48, 48], 0.25),
                ]},
                {"name": "rightLeg", "parent": "body", "pivot": [-2, BEIN, 0], "cubes": [
                    kasten([-4, 0, -2], [4, BEIN, 4], [0, 16]),
                    kasten([-4, 0, -2], [4, BEIN, 4], [0, 32], 0.25),
                ]},
                {"name": "leftLeg", "parent": "body", "pivot": [2, BEIN, 0], "cubes": [
                    kasten([0, 0, -2], [4, BEIN, 4], [16, 48]),
                    kasten([0, 0, -2], [4, BEIN, 4], [0, 48], 0.25),
                ]},
                # Leere Knochen fuer das, was er traegt. Minecraft haengt
                # Gegenstaende an genau diese Namen.
                {"name": "rightItem", "parent": "rightArm", "pivot": [-6, BEIN + 2, 1]},
                {"name": "leftItem", "parent": "leftArm", "pivot": [6, BEIN + 2, 1]},
            ],
        }],
    }


def main():
    ziel = BILDER / "models" / "entity" / "ritter.geo.json"
    ziel.write_text(json.dumps(modell(), indent=2) + "\n")
    b = modell()["minecraft:geometry"][0]["bones"]
    print(f"gebaut: {ziel.name} - {len(b)} Knochen, "
          f"{sum(len(k.get('cubes', [])) for k in b)} Kaesten, "
          f"{BEIN + RUMPF + KOPF} Pixel hoch")


if __name__ == "__main__":
    main()


# ----------------------------------------------------- Die Haut

from PIL import Image, ImageDraw   # noqa: E402  (erst hier gebraucht)

# Die Toene sind die des Pakets, damit der Ritter neben den Klingen steht
# und nicht daneben.
UMRISS   = (44, 46, 58, 255)
STAHL_H  = (228, 233, 240, 255)
STAHL_S  = (168, 178, 194, 255)
STAHL_T  = (104, 114, 134, 255)
LEDER_H  = (146, 98, 56, 255)
LEDER_D  = (94, 60, 34, 255)
HAUT     = (214, 170, 132, 255)
HAUT_S   = (176, 134, 100, 255)
AUGE     = (44, 46, 58, 255)
FEDER    = (186, 32, 56, 255)


def flaechen(u, v, b, h, t):
    """Wo die sechs Seiten eines Kastens im Bild liegen.

    Minecrafts Netz: oben und unten nebeneinander in der ersten Reihe,
    darunter rechts, vorn, links, hinten. Diese Aufteilung ist nicht
    frei gewaehlt - sie ist die, die das Spiel aus uv und size errechnet.
    """
    return {
        "oben":   (u + t,         v,     b, t),
        "unten":  (u + t + b,     v,     b, t),
        "rechts": (u,             v + t, t, h),
        "vorn":   (u + t,         v + t, b, h),
        "links":  (u + t + b,     v + t, t, h),
        "hinten": (u + t + b + t, v + t, b, h),
    }


def fuelle(bild, feld, farbe):
    x, y, b, h = feld
    ImageDraw.Draw(bild).rectangle([x, y, x + b - 1, y + h - 1], fill=farbe)


def grundhaut(mit_feder=False):
    """Ein schlichter Ritter zum Weitermalen - keine fertige Gestaltung.

    Absicht ist eine Haut, auf der jedes Feld schon die richtige Grundfarbe
    hat und die Koerperteile sich voneinander abheben. Wer von einer leeren
    Flaeche anfaengt, muss erst herausfinden, welches der zwanzig Rechtecke
    der linke Oberarm ist - und auf einer einfarbigen sieht man nicht, ob
    die Arme ueberhaupt am richtigen Platz sitzen.

    Die zweite Schicht - in Minecraft die Huelle ueber Koerper und
    Gliedern - bleibt hier weitgehend leer und traegt nur den Brustpanzer
    und die Schulterstuecke. Deckt sie alles, ist die erste Schicht
    unsichtbar, und man malt an etwas, das niemand je sieht.
    """
    bild = Image.new("RGBA", (64, 64), (0, 0, 0, 0))

    kopf = flaechen(0, 0, 8, 8, 8)
    for seite in kopf.values():
        fuelle(bild, seite, HAUT_S)
    fuelle(bild, kopf["vorn"], HAUT)
    x, y, b, h = kopf["vorn"]
    for dx in (2, 5):
        fuelle(bild, (x + dx, y + 3, 1, 1), AUGE)

    helm = flaechen(32, 0, 8, 8, 8)
    for name, seite in helm.items():
        fuelle(bild, seite, STAHL_T if name == "hinten" else STAHL_S)
    fuelle(bild, helm["oben"], STAHL_H)
    x, y, b, h = helm["vorn"]
    fuelle(bild, (x, y + 3, 8, 2), UMRISS)          # Sehschlitz
    fuelle(bild, (x + 3, y + 5, 2, 3), STAHL_T)     # Nasensteg
    if mit_feder:
        ox, oy, ob, ot = helm["oben"]
        fuelle(bild, (ox + 3, oy, 2, 8), FEDER)
        hx, hy, hb, hh = helm["hinten"]
        fuelle(bild, (hx + 3, hy, 2, 4), FEDER)

    # Rumpf: Untergewand dunkel, damit der Panzer darueber zu sehen ist
    for name, seite in flaechen(16, 16, 8, 12, 4).items():
        fuelle(bild, seite, LEDER_D if name in ("oben", "unten") else LEDER_H)
    # Brustpanzer als zweite Schicht, Schultern etwas heller
    for name, seite in flaechen(16, 32, 8, 12, 4).items():
        if name in ("vorn", "hinten", "rechts", "links"):
            x, y, b, h = seite
            fuelle(bild, (x, y, b, 8), STAHL_S)
            fuelle(bild, (x, y, b, 2), STAHL_H)
        elif name == "oben":
            fuelle(bild, seite, STAHL_H)

    # Arme: der rechte etwas dunkler, sonst sieht man im Bild nicht,
    # welcher welcher ist
    for (u, v), ton in (((40, 16), STAHL_S), ((32, 48), STAHL_H)):
        for name, seite in flaechen(u, v, 4, 12, 4).items():
            fuelle(bild, seite, STAHL_T if name in ("oben", "unten") else ton)
    for u, v in ((40, 32), (48, 48)):          # Schulterstuecke
        for name, seite in flaechen(u, v, 4, 12, 4).items():
            if name in ("vorn", "hinten", "rechts", "links"):
                x, y, b, h = seite
                fuelle(bild, (x, y, b, 4), STAHL_H)
            elif name == "oben":
                fuelle(bild, seite, STAHL_H)

    # Beine: Leder oben, Stahlschiene unten
    for (u, v), ton in (((0, 16), LEDER_H), ((16, 48), LEDER_H)):
        for name, seite in flaechen(u, v, 4, 12, 4).items():
            fuelle(bild, seite, LEDER_D if name in ("oben", "unten") else ton)
            if name in ("vorn", "hinten", "rechts", "links"):
                x, y, b, h = seite
                fuelle(bild, (x, y + 7, b, 5), STAHL_T)
    return bild


def feldkarte():
    """Dasselbe Raster, aber eingefaerbt und beschriftet - zum Nachschauen,
    nicht zum Einbauen."""
    felder = [
        ("Kopf", 0, 0, 8, 8, 8, (214, 170, 132)),
        ("Helm", 32, 0, 8, 8, 8, (168, 178, 194)),
        ("Rumpf", 16, 16, 8, 12, 4, (120, 170, 220)),
        ("Rumpf: Ruestung", 16, 32, 8, 12, 4, (80, 130, 190)),
        ("Arm rechts", 40, 16, 4, 12, 4, (230, 170, 80)),
        ("Arm rechts: Ruestung", 40, 32, 4, 12, 4, (190, 130, 50)),
        ("Arm links", 32, 48, 4, 12, 4, (240, 200, 120)),
        ("Arm links: Ruestung", 48, 48, 4, 12, 4, (200, 160, 90)),
        ("Bein rechts", 0, 16, 4, 12, 4, (150, 200, 140)),
        ("Bein rechts: Ruestung", 0, 32, 4, 12, 4, (110, 160, 100)),
        ("Bein links", 16, 48, 4, 12, 4, (190, 220, 170)),
        ("Bein links: Ruestung", 0, 48, 4, 12, 4, (150, 180, 130)),
    ]
    bild = Image.new("RGB", (64, 64), (246, 244, 239))
    for _, u, v, b, h, t, farbe in felder:
        for name, seite in flaechen(u, v, b, h, t).items():
            hell = {"vorn": 1.0, "oben": 1.15, "links": 0.85,
                    "rechts": 0.85, "hinten": 0.7, "unten": 0.6}[name]
            fuelle(bild, seite, tuple(min(255, int(k * hell)) for k in farbe))
    return bild, felder
