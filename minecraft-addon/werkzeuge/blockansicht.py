#!/usr/bin/env python3
"""Setzt einen Block aus seinen Texturen zu einem Wuerfel zusammen.

Ob die Seiten richtig zugeordnet sind, zeigt sonst erst das Spiel - und
bis dahin vergeht ein Ladevorgang. Hier steht der Block nach einem
Aufruf da, von schraeg vorn, wie im Inventar.

Keine echte Darstellung: Es fehlen Licht und Schatten, und die Kanten
sind hart. Fuer die Frage "liegt das richtige Bild auf der richtigen
Seite" reicht es.

    python3 werkzeuge/blockansicht.py feuerkasten
    python3 werkzeuge/blockansicht.py schmelztiegel feuerkasten   (uebereinander)
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

WURZEL = Path(__file__).resolve().parent.parent
BLOCKS = WURZEL / "ressourcenpaket" / "textures" / "blocks"
SCHRIFT = "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"

N = 64     # Kantenlaenge einer Wuerfelseite in Bildpunkten


def flaeche(textur, ecken, ziel, dunkler=1.0):
    """Malt eine Textur in ein Parallelogramm.

    Gerechnet wird rueckwaerts: Fuer jeden Zielpunkt wird gefragt, welcher
    Texturpunkt dort liegt. Vorwaerts gerechnet blieben Loecher stehen,
    wo das Parallelogramm groesser ist als die Textur.
    """
    (ax, ay), (bx, by), (cx, cy) = ecken[0], ecken[1], ecken[3]
    ux, uy = bx - ax, by - ay          # eine Kante
    vx, vy = cx - ax, cy - ay          # die andere
    nenner = ux * vy - uy * vx
    px = textur.load()
    zp = ziel.load()
    xs = [e[0] for e in ecken]; ys = [e[1] for e in ecken]
    for y in range(min(ys), max(ys) + 1):
        for x in range(min(xs), max(xs) + 1):
            dx, dy = x - ax, y - ay
            s = (dx * vy - dy * vx) / nenner
            t = (ux * dy - uy * dx) / nenner
            if not (0 <= s < 1 and 0 <= t < 1):
                continue
            f = px[int(s * textur.width), int(t * textur.height)]
            if f[3]:
                zp[x, y] = tuple(int(k * dunkler) for k in f[:3]) + (255,)


def wuerfel(oben, vorn, rechts):
    breite, hoehe = 2 * N + 2, 2 * N + N // 2 + 2
    bild = Image.new("RGBA", (breite, hoehe), (0, 0, 0, 0))
    m = N // 2
    # Die obere Raute, dann die beiden Waende darunter. Zwei zu eins
    # hoch, wie Minecraft seine Bloecke im Inventar zeigt.
    flaeche(oben,   [(N, 0), (2 * N, m), (N, N), (0, m)], bild, 1.0)
    flaeche(vorn,   [(0, m), (N, N), (N, N + N), (0, m + N)], bild, 0.78)
    flaeche(rechts, [(N, N), (2 * N, m), (2 * N, m + N), (N, N + N)], bild, 0.62)
    return bild


def texturen(block, brennt):
    """Welche Bilder auf oben, vorn und der rechten Seite liegen."""
    pfad = WURZEL / "verhaltenspaket" / "blocks" / f"{block}.json"
    d = json.loads(pfad.read_text(encoding="utf-8"))["minecraft:block"]
    for p in d.get("permutations", []):
        c = p.get("condition", "")
        if "'north'" in c and (("'an'" in c) == brennt):
            m = p["components"]["minecraft:material_instances"]
            # Bei Ausrichtung north ist south die Vorderseite und east
            # die rechte Seite, von vorn gesehen.
            return (m.get("up", m["*"])["texture"],
                    m.get("south", m["*"])["texture"],
                    m.get("east", m["*"])["texture"])
    m = d["components"]["minecraft:material_instances"]
    return (m.get("up", m["*"])["texture"], m.get("north", m["*"])["texture"],
            m.get("east", m["*"])["texture"])


def turm(oben_block, unten_block):
    """Zwei Bloecke uebereinander, wie der Tiegel auf dem Feuerkasten.

    Ob zwei Bloecke zusammenpassen, sieht man einzeln nicht: Es entscheidet
    sich an der Naht, wo der Boden des oberen auf dem Deckel des unteren
    sitzt. Der untere Wuerfel wird zuerst gemalt, der obere eine
    Kantenlaenge hoeher darueber - er deckt dabei genau den Deckel des
    unteren ab, so wie im Spiel.
    """
    schrift = ImageFont.truetype(SCHRIFT, 19)
    teile = []
    for brennt, wie in ((False, "aus"), (True, "brennt")):
        wuerfel_paar = []
        for block in (unten_block, oben_block):
            namen = texturen(block, brennt)
            bilder = [Image.open(BLOCKS / f"{n}.png").convert("RGBA").resize((N, N), Image.NEAREST)
                      for n in namen]
            wuerfel_paar.append(wuerfel(*bilder))
        unten, oben = wuerfel_paar
        stapel = Image.new("RGBA", (unten.width, unten.height + N), (0, 0, 0, 0))
        stapel.paste(unten, (0, N), unten)
        stapel.paste(oben, (0, 0), oben)
        teile.append((wie, stapel))

    w = teile[0][1].width
    blatt = Image.new("RGB", (len(teile) * (w + 60) + 40, teile[0][1].height + 70),
                      (248, 248, 250))
    mal = ImageDraw.Draw(blatt)
    for i, (wie, bild) in enumerate(teile):
        x = 40 + i * (w + 60)
        mal.text((x, 14), wie, fill=(30, 30, 40), font=schrift)
        blatt.paste(bild, (x, 46), bild)
    ziel = WURZEL / "vorschau" / f"{oben_block}_auf_{unten_block}.png"
    blatt.save(ziel)
    print(f"gezeichnet: {ziel.name}")


def main():
    if len(sys.argv) > 2:
        turm(sys.argv[1], sys.argv[2])
        return
    block = sys.argv[1] if len(sys.argv) > 1 else "feuerkasten"
    schrift = ImageFont.truetype(SCHRIFT, 19)
    teile = []
    for brennt, wie in ((False, "aus"), (True, "brennt")):
        namen = texturen(block, brennt)
        bilder = [Image.open(BLOCKS / f"{n}.png").convert("RGBA").resize((N, N), Image.NEAREST)
                  for n in namen]
        teile.append((wie, namen, wuerfel(*bilder)))

    # Eine Spalte je Zustand, breit genug fuer die laengste Zeile. Zu eng
    # gesetzt lief die Beschriftung des einen in die des anderen.
    w = max(teile[0][2].width, 230)
    blatt = Image.new("RGB", (len(teile) * (w + 40) + 40, teile[0][2].height + 130),
                      (248, 248, 250))
    mal = ImageDraw.Draw(blatt)
    for i, (wie, namen, bild) in enumerate(teile):
        x = 40 + i * (w + 40)
        mal.text((x, 14), f"{block} - {wie}", fill=(30, 30, 40), font=schrift)
        blatt.paste(bild, (x, 44), bild)
        for j, (rolle, name) in enumerate(zip(("oben", "vorn", "rechts"), namen)):
            mal.text((x, 44 + bild.height + 10 + j * 22),
                     f"{rolle:7s}{name.replace('feuerkasten_', '').replace('tiegel_', '')}",
                     fill=(90, 90, 100), font=schrift)
    ziel = WURZEL / "vorschau" / f"{block}_wuerfel.png"
    blatt.save(ziel)
    print(f"gezeichnet: {ziel.name}")


if __name__ == "__main__":
    main()
