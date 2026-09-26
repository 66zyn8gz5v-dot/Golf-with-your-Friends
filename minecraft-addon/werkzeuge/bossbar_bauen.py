#!/usr/bin/env python3
"""Die gepixelte Bossbar fuer Sir Roland.

Fynn: "den ersten Boss ... mit einer richtigen Bossbar, die gepixelt ist."

Das Aussehen ist Fynns eigener Entwurf: goldene Endkappen, Trennstriche,
in der Mitte ein Medaillon mit Saphir zwischen zwei kurzen Klingen, der
Balken in fuenf Blautoenen. In der zweiten Phase glueht der Balken heller,
der Name wird blau. (Vorher war die Leiste ein Schwert - Fynn hat
nachgelegt.)

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
HOEHE = 17
RINNE = (5, 6, 172, 5)   # x, y, Breite, Hoehe des Lebensbalkens im Rahmenbild

# Fynns Entwurf (September 2026): eine Leiste mit goldenen Endkappen,
# Trennstrichen bei einem und zwei Sechsteln, in der Mitte ein goldenes
# Medaillon mit Saphir, links und rechts davon je eine kurze Klinge mit
# blauer Rinne und goldener Spitze. Der Balken laeuft unter dem Schmuck
# hindurch. Aus seinem Bild Pixel fuer Pixel zurueckgerechnet (es war
# sechsfach vergroessert und als JPEG etwas verwaschen) und sauber
# nachgezeichnet - links nach seinem Bild, rechts gespiegelt; nur das
# Medaillon behaelt sein Licht von links.
FARBE = {
    "a": (19, 18, 23),       # Umriss
    "c": (183, 183, 190),    # Stahl hell (Oberkante)
    "b": (85, 87, 95),       # Stahl dunkel (Unterkante)
    "m": (232, 230, 234),    # Klinge, Glanz
    "q": (69, 89, 184),      # Klinge, blaue Rinne
    "x": (240, 232, 189),    # Gold, Glanzlicht
    "f": (237, 211, 131),    # Gold hell
    "j": (204, 160, 75),     # Gold
    "r": (193, 154, 83),     # Gold, halbdunkel
    "g": (143, 109, 51),     # Gold dunkel
    "n": (37, 35, 62),       # Medaillon, tiefes Blau
    "e": (24, 32, 86),       # Medaillon, Blau
    "C": (148, 176, 243),    # Saphir
    "s": (180, 186, 200),    # Steinchen oben
}
# Das Medaillon, 14 breit, 17 hoch, ab x = 84.
MEDAILLON = [
    ".....asma.....",
    "...aajssjaa...",
    ".aaffjjjjjfaa.",
    "aafjjnnnnjjfaa",
    "afjjneeeenjjra",
    "fjjjjrjjrjjjjr",
    "fjnrnfnnfnrnjr",
    "fjnrfneenfrnjr",
    "fjnrneCCenrnjr",
    "fjnrfeeeefrnjr",
    "fjnrnfnnfnrnjr",
    "fjjjjrjjrjjjjr",
    "afjgneeeengjra",
    "aagggnnnngggaa",
    ".aaggggggggaa.",
    "...aaggggaa...",
    ".....aaaa.....",
]
FUELLUNG = {
    # Fynns Blau, von hell oben nach dunkel unten.
    1: [(166, 190, 245), (83, 119, 220), (51, 82, 188), (36, 54, 138), (24, 32, 86)],
    # Entfesselt: dasselbe Blau, heller und kraeftiger - der Balken glueht.
    2: [(222, 240, 255), (120, 196, 255), (70, 150, 250), (44, 100, 220), (30, 60, 160)],
}
LEER = [(27, 30, 48), (24, 27, 42), (20, 23, 37), (17, 19, 31), (13, 16, 24)]


def rahmen():
    """Alles ausser dem Balken selbst: Kappen, Stahlkanten, Trennstriche,
    Klingen, Medaillon. Wo der Balken zu sehen sein soll, bleibt es leer."""
    b = Image.new("RGBA", (BREITE, HOEHE), (0, 0, 0, 0))
    halb = {}

    def p(x, y, z):
        halb[(x, y)] = z

    # Endkappe links: Gold mit einem Stein aus Weiss und Blau.
    for y in range(2, 15):
        for x in range(0, 5):
            p(x, y, "a")
    for y in range(3, 14):
        p(1, y, "f")
        p(2, y, "j")
        p(3, y, "g")
    p(1, 3, "x"), p(2, 3, "x"), p(3, 3, "x")
    for y in (6, 7, 9, 10):
        p(2, y, "m")
    p(2, 8, "q")
    p(1, 13, "g"), p(2, 13, "g")
    # Die Leiste: Umriss, helle und dunkle Stahlkante; der Balken dazwischen.
    for x in range(5, 91):
        p(x, 4, "a")
        p(x, 5, "c")
        p(x, 11, "b")
        p(x, 12, "a")
    # Trennstriche, zwei Pixel breit, hell links.
    for x0 in (24, 49):
        for y in range(5, 12):
            p(x0, y, "f")
            p(x0 + 1, y, "g")
    # Die Klinge links der Mitte, mit goldener Spitze nach aussen.
    for x in range(66, 81):
        p(x, 6, "a")
        p(x, 7, "m")
        p(x, 8, "q" if (x - 66) % 3 else "c")
        p(x, 9, "b")
        p(x, 10, "a")
    for y in range(6, 11):
        p(65, y, "f")
    p(64, 6, "a"), p(64, 7, "r"), p(64, 8, "j"), p(64, 9, "r"), p(64, 10, "a")
    p(63, 7, "a"), p(63, 8, "r"), p(63, 9, "a"), p(62, 8, "a")
    p(65, 5, "a"), p(65, 11, "a")
    # Die Parierstange neben dem Medaillon.
    for y in range(3, 14):
        p(81, y, "a" if y in (3, 13) else ("g" if y in (4, 12) else "j"))
        p(82, y, "a" if y in (3, 13) else "f")
        p(83, y, "a")
    # Rechts gespiegelt.
    for (x, y), z in list(halb.items()):
        halb[(BREITE - 1 - x, y)] = z
    # Das Medaillon mit seinem eigenen Licht.
    for y, zeile in enumerate(MEDAILLON):
        for i, z in enumerate(zeile):
            if z != ".":
                halb[(84 + i, y)] = z
    for (x, y), z in halb.items():
        b.putpixel((x, y), FARBE[z] + (255,))
    return b


def rinne(farben, leer=False):
    """Der Balken, 172 mal 5: fuenf Zeilen Blau, oben hell, unten dunkel."""
    _, _, w, h = RINNE
    b = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    for y in range(h):
        f = (LEER if leer else farben)[y]
        for x in range(w):
            b.putpixel((x, y), f + (255,))
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
            "size": [BREITE, 28],
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
                    # Eine Zeile Luft unter dem Namen, wie in Fynns Entwurf.
                    "offset": [0, 11],
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
        "voll": rinne(FUELLUNG[1]),
        "entfesselt": rinne(FUELLUNG[2]),
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
    zustaende = [(1.0, 1, "Sir Roland"), (0.62, 1, "Sir Roland"),
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
