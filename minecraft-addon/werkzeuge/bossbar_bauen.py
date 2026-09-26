#!/usr/bin/env python3
"""Die gepixelte Bossbar fuer Sir Roland.

Fynn: "den ersten Boss ... mit einer richtigen Bossbar, die gepixelt ist."

Die Leiste ist ein Schwert - Durendal selbst: links der Griff mit Knauf
und Parierstange, nach rechts die Klinge, und die Blutrinne der Klinge ist
das Leben. Sie leert sich von der Spitze her zum Griff. In der zweiten
Phase glueht die Rinne heller, der Name wird blau.

Wie sie ins Spiel kommt: Roland hat Minecrafts eigene Bossleiste
(Komponente minecraft:boss) - die weiss schon, wer in der Naehe ist, zeigt
sich allen Spielern im Umkreis und folgt dem Leben von selbst. Nur ihr
Aussehen wird ausgetauscht: ui/hud_screen.json ersetzt das Feld einer
Bossleiste durch zwei Fassungen, Mojangs und unsere. Welche zu sehen ist,
entscheidet der Name des Bosses - steht "Roland" darin, unsere; sonst
bleibt fuer Wither und Enderdrache alles, wie es war. Steht "entfesselt"
darin (das Kampfskript setzt den Namen in Phase zwei), die gluehende.

Warum ueber den Namen: Mehr erfaehrt die Oberflaeche von einer Bossleiste
nicht - Name, Fuellstand, Farbe. Die Farbe kann ein Add-on nicht waehlen.

Die Oberflaechendateien (JSON-UI) hat Mojang nie beschrieben; sie koennen
bei einem Spielupdate brechen. Gebaut ist deshalb so, dass im schlimmsten
Fall wieder Mojangs Leiste erscheint und nicht gar keine: Mojangs Teile
stehen unveraendert darin, unsere liegen nur daneben.

    python3 werkzeuge/bossbar_bauen.py [--bilder vorschau]
"""

import json
import sys
from pathlib import Path

from PIL import Image

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"

BREITE = 182            # wie Mojangs Leiste: so bleibt das Raster der Bossleisten gleich
HOEHE = 13
RINNE = (12, 4, 158, 5)  # x, y, Breite, Hoehe der Blutrinne im Rahmenbild

# Farben. Kein reines Schwarz: der Umriss ist ein sehr dunkles Blau, das
# auf hellem Himmel wie im Dunkeln haelt.
UMRISS = (22, 26, 44)
STAHL = [(236, 241, 248), (190, 200, 214), (140, 150, 166), (96, 106, 122)]
GOLD = [(252, 228, 140), (230, 186, 74), (170, 124, 36)]
SAPHIR = [(170, 214, 255), (64, 120, 230), (30, 58, 150)]
LEDER = [(56, 70, 140), (34, 42, 96)]
LEER = [(26, 30, 58), (18, 22, 44), (14, 17, 36)]
FUELLUNG = {
    1: [(150, 196, 255), (82, 142, 240), (54, 104, 214), (40, 78, 184), (28, 56, 140)],
    # Entfesselt: heller Kern, kraeftiges Tuerkisblau, goldene Funken - die
    # Klinge brennt.
    2: [(226, 250, 255), (110, 226, 255), (48, 176, 255), (34, 112, 240), (26, 66, 196)],
}
FUNKEN = {1: (206, 230, 255), 2: (255, 226, 120)}


def rahmen():
    """Klinge, Griff und Spitze, 182 mal 13. Die Mitte der Rinne bleibt
    frei - dort liegen Leere und Fuellung darunter."""
    b = Image.new("RGBA", (BREITE, HOEHE), (0, 0, 0, 0))

    def p(x, y, f):
        if 0 <= x < BREITE and 0 <= y < HOEHE:
            b.putpixel((x, y), tuple(f) + (255,))

    rx, ry, rw, rh = RINNE
    # Die Klinge: zwei Stahlkanten ueber und unter der Rinne, aussen der Umriss.
    for x in range(rx - 1, rx + rw + 1):
        p(x, ry - 3, UMRISS)
        p(x, ry - 2, STAHL[0])
        p(x, ry - 1, STAHL[1])
        p(x, ry + rh, STAHL[2])
        p(x, ry + rh + 1, STAHL[3])
        p(x, ry + rh + 2, UMRISS)
    # Die Spitze: Die Kanten laufen in Stufen zusammen, die Rinne endet
    # vorher in einem Punkt.
    ende = rx + rw
    for i in range(12):
        x = ende + i
        oben, unten = ry - 3 + (i + 1) // 2, ry + rh + 2 - (i + 1) // 2
        if oben > unten:
            break
        for y in range(oben, unten + 1):
            if y in (oben, unten):
                farbe = UMRISS
            elif y == oben + 1:
                farbe = STAHL[0]
            elif y == unten - 1:
                farbe = STAHL[3]
            else:
                farbe = STAHL[1] if y < ry + rh // 2 + 1 else STAHL[2]
            p(x, y, farbe)
    # Kleine Kerben alle 25 Prozent in der oberen Kante, bei 50 Prozent in
    # Gold: Dort wechselt Roland in die zweite Phase.
    for anteil in (0.25, 0.5, 0.75):
        x = rx + round(rw * anteil)
        if anteil == 0.5:
            p(x, ry - 2, GOLD[0])
            p(x, ry - 3, GOLD[1])
            p(x, ry + rh + 1, GOLD[2])
            p(x, ry + rh + 2, GOLD[1])
        else:
            p(x, ry - 2, STAHL[2])

    # Parierstange: senkrecht, golden, ueber die ganze Hoehe, mit einem
    # Saphir in der Mitte und hochgebogenen Enden.
    for y in range(0, HOEHE):
        for x in (7, 8, 9):
            p(x, y, GOLD[0] if x == 7 else (GOLD[1] if x == 8 else GOLD[2]))
        p(6, y, UMRISS)
        p(10, y, UMRISS)
    for y in (0, HOEHE - 1):
        for x in range(6, 11):
            p(x, y, UMRISS)
    p(11, 0, UMRISS), p(11, 1, GOLD[1]), p(11, HOEHE - 1, UMRISS), p(11, HOEHE - 2, GOLD[2])
    mitte = HOEHE // 2
    p(8, mitte, SAPHIR[0]), p(8, mitte - 1, SAPHIR[1]), p(8, mitte + 1, SAPHIR[2])
    p(7, mitte, SAPHIR[1]), p(9, mitte, SAPHIR[2])
    # Griff: blaues Leder mit Golddraht.
    for x in range(3, 6):
        p(x, mitte - 2, UMRISS)
        p(x, mitte + 2, UMRISS)
        for y in range(mitte - 1, mitte + 2):
            draht = (x + y) % 3 == 0
            p(x, y, GOLD[1] if draht else LEDER[0 if y < mitte + 1 else 1])
    # Knauf: goldene Kugel mit Saphir.
    for y in range(mitte - 2, mitte + 3):
        p(0, y, UMRISS)
    for x, y, f in ((1, mitte - 2, GOLD[0]), (2, mitte - 2, GOLD[1]), (1, mitte + 2, GOLD[2]), (2, mitte + 2, GOLD[2]),
                    (1, mitte - 1, GOLD[0]), (2, mitte - 1, SAPHIR[0]), (1, mitte, GOLD[1]), (2, mitte, SAPHIR[1]),
                    (1, mitte + 1, GOLD[2]), (2, mitte + 1, GOLD[2])):
        p(x, y, f)
    for x in (1, 2):
        p(x, mitte - 3, UMRISS)
        p(x, mitte + 3, UMRISS)
    return b


def rinne(farben, funke=None, leer=False):
    """Die Blutrinne, 158 mal 5: oben hell, unten dunkel, in kleinen
    Stufen. Funken in unregelmaessigem Abstand - nie als Streifen."""
    _, _, w, h = RINNE
    b = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for x in range(w):
        for y in range(h):
            if leer:
                f = LEER[0] if y == 0 else (LEER[2] if y == h - 1 else LEER[1])
            else:
                f = farben[min(y, len(farben) - 1)]
            b.putpixel((x, y), f + (255,))
    if funke and not leer:
        x, schritt = 5, [11, 17, 8, 14, 20, 9, 13]
        i = 0
        while x < w - 2:
            y = 1 + (i % 3 == 1)
            b.putpixel((x, y), funke + (255,))
            if i % 2 == 0:
                b.putpixel((x + 1, y), farben[0] + (255,))
            x += schritt[i % len(schritt)]
            i += 1
    return b


# ============================================================ Oberflaeche

def binde_name(bedingung):
    """Sichtbar, wenn der Bossname die Bedingung erfuellt. Erst holt eine
    Sammlungsbindung den Namen dieser Leiste, dann rechnet eine Ansichts-
    bindung daraus die Sichtbarkeit."""
    return [
        {"binding_type": "collection", "binding_collection_name": "boss_bars", "binding_name": "#bossName"},
        {"binding_type": "view", "source_property_name": bedingung, "target_property_name": "#visible"},
    ]


HAT_ROLAND = "(not ((#bossName - 'Roland') = #bossName))"
HAT_KEIN_ROLAND = "((#bossName - 'Roland') = #bossName)"
ENTFESSELT = "(not ((#bossName - 'entfesselt') = #bossName))"
GEBUNDEN = "((#bossName - 'entfesselt') = #bossName)"


def fuellung(textur, sichtbar):
    rx, ry, rw, rh = RINNE
    return {
        "type": "image",
        "texture": textur,
        "size": [rw, rh],
        "offset": [rx, ry],
        "anchor_from": "top_left",
        "anchor_to": "top_left",
        "layer": 2,
        # Wie Mojangs Leiste: Fuellstand als Beschnitt von rechts.
        "clip_direction": "left",
        "clip_pixelperfect": True,
        "bindings": [
            {"binding_name": "#progress_percentage", "binding_name_override": "#clip_ratio",
             "binding_type": "collection", "binding_collection_name": "boss_bars"},
            {"binding_type": "collection", "binding_collection_name": "boss_bars", "binding_name": "#bossName"},
            {"binding_type": "view", "source_property_name": sichtbar, "target_property_name": "#visible"},
        ],
    }


def name(farbe, sichtbar):
    return {
        "type": "label",
        "text": "#bossName",
        "color": farbe,
        "shadow": True,
        "enable_profanity_filter": False,
        "anchor_from": "top_middle",
        "anchor_to": "top_middle",
        "bindings": [
            {"binding_type": "collection", "binding_collection_name": "boss_bars", "binding_name": "#bossName"},
            {"binding_type": "view", "source_property_name": sichtbar, "target_property_name": "#visible"},
        ],
    }


def oberflaeche():
    return {
        "namespace": "hud",
        # Mojangs Feld, mit denselben Teilen - nur neben unseren.
        "boss_health_panel": {
            "type": "panel",
            "size": [BREITE, 24],
            "anchor_from": "top_middle",
            "anchor_to": "top_middle",
            "$progress_bar_collection": "boss_bars",
            "controls": [
                {"fynn_mojang_leiste@hud.fynn_mojang_leiste": {}},
                {"fynn_roland_leiste@hud.fynn_roland_leiste": {}},
            ],
            "bindings": [
                {"binding_name": "#bar_visible", "binding_type": "collection",
                 "binding_collection_name": "boss_bars", "binding_name_override": "#visible"},
            ],
        },
        "fynn_mojang_leiste": {
            "type": "panel",
            "size": ["100%", "100%"],
            "$progress_bar_collection": "boss_bars",
            "controls": [
                {"boss_name@hud.boss_name_panel": {}},
                {"progress_bar_for_collections@common.progress_bar_for_collections": {"offset": [0, 10]}},
            ],
            "bindings": binde_name(HAT_KEIN_ROLAND),
        },
        "fynn_roland_leiste": {
            "type": "panel",
            "size": ["100%", "100%"],
            "controls": [
                {"name_gebunden": name([0.96, 0.84, 0.48], GEBUNDEN)},
                {"name_entfesselt": name([0.62, 0.86, 1.0], ENTFESSELT)},
                {"leiste": {
                    "type": "panel",
                    "size": [BREITE, HOEHE],
                    "offset": [0, 10],
                    "anchor_from": "top_middle",
                    "anchor_to": "top_middle",
                    "controls": [
                        {"leer": {"type": "image", "texture": "textures/ui/fynn_bossleiste_leer",
                                  "size": [RINNE[2], RINNE[3]], "offset": [RINNE[0], RINNE[1]],
                                  "anchor_from": "top_left", "anchor_to": "top_left", "layer": 1}},
                        {"voll": fuellung("textures/ui/fynn_bossleiste_voll", GEBUNDEN)},
                        {"voll_entfesselt": fuellung("textures/ui/fynn_bossleiste_entfesselt", ENTFESSELT)},
                        {"rahmen": {"type": "image", "texture": "textures/ui/fynn_bossleiste_rahmen",
                                    "size": [BREITE, HOEHE], "layer": 3}},
                    ],
                }},
            ],
            "bindings": binde_name(HAT_ROLAND),
        },
    }


def schreibe(pfad, daten):
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def bilder():
    return {
        "rahmen": rahmen(),
        "leer": rinne(None, leer=True),
        "voll": rinne(FUELLUNG[1], FUNKEN[1]),
        "entfesselt": rinne(FUELLUNG[2], FUNKEN[2]),
    }


def zusammen(teile, anteil, phase):
    """Die Leiste, wie sie im Spiel aussieht - fuer die Vorschau."""
    b = Image.new("RGBA", (BREITE, HOEHE), (0, 0, 0, 0))
    b.paste(teile["leer"], RINNE[:2])
    voll = teile["voll" if phase == 1 else "entfesselt"]
    breite = round(RINNE[2] * anteil)
    if breite:
        b.alpha_composite(voll.crop((0, 0, breite, RINNE[3])), RINNE[:2])
    b.alpha_composite(teile["rahmen"])
    return b


def vorschau(ordner, teile):
    """Ein Himmel, darauf die Leiste dreimal gross in drei Zustaenden, mit
    dem Namen darueber - so ungefaehr sieht es oben im Bild aus."""
    from PIL import ImageDraw
    massstab = 4
    zustaende = [(1.0, 1, "Sir Roland von Ronceval"), (0.62, 1, "Sir Roland von Ronceval"),
                 (0.31, 2, "Sir Roland - entfesselt")]
    w, h = BREITE * massstab + 80, len(zustaende) * 110 + 30
    bild = Image.new("RGBA", (w, h), (120, 168, 255, 255))
    # Himmel: oben dunkler, unten heller - in Stufen wie Minecrafts Himmel.
    for y in range(h):
        t = y / h
        f = tuple(int(a + (b - a) * (int(t * 6) / 6)) for a, b in zip((96, 142, 236), (170, 206, 255)))
        for x in range(w):
            bild.putpixel((x, y), f + (255,))
    zeichner = ImageDraw.Draw(bild)
    for i, (anteil, phase, text) in enumerate(zustaende):
        leiste = zusammen(teile, anteil, phase).resize((BREITE * massstab, HOEHE * massstab), Image.NEAREST)
        y = 30 + i * 110
        bild.alpha_composite(leiste, (40, y + 26))
        farbe = (245, 214, 122, 255) if phase == 1 else (158, 219, 255, 255)
        tw = zeichner.textlength(text) * 2
        klein = Image.new("RGBA", (int(tw / 2) + 4, 14), (0, 0, 0, 0))
        ImageDraw.Draw(klein).text((1, 1), text, fill=(40, 40, 40, 255))
        ImageDraw.Draw(klein).text((0, 0), text, fill=farbe)
        klein = klein.resize((klein.width * 2, klein.height * 2), Image.NEAREST)
        bild.alpha_composite(klein, (int(w / 2 - klein.width / 2), y))
        zeichner.text((44, y + 26 + HOEHE * massstab + 4), f"{round(anteil * 100)} % - Phase {phase}",
                      fill=(20, 30, 60, 255))
    Path(ordner).mkdir(parents=True, exist_ok=True)
    bild.save(Path(ordner) / "bossleiste.png")
    print("gezeichnet:", Path(ordner) / "bossleiste.png")


def main():
    teile = bilder()
    (RES / "textures" / "ui").mkdir(parents=True, exist_ok=True)
    for name_, bild in teile.items():
        bild.save(RES / "textures" / "ui" / f"fynn_bossleiste_{name_}.png")
    schreibe(RES / "ui" / "hud_screen.json", oberflaeche())
    print("gebaut: Bossleiste (ui/hud_screen.json, textures/ui/fynn_bossleiste_*.png)")
    if "--bilder" in sys.argv:
        vorschau(Path(sys.argv[sys.argv.index("--bilder") + 1]), teile)


if __name__ == "__main__":
    main()
