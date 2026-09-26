#!/usr/bin/env python3
"""Spawn-Eier mit eigenem Bild fuer alle Mobs des Pakets.

Fynn: "Wenn du fertig mit den Bossen bist, machst du Designs fuer die
Eier der Mobs."

Bis hierher hatte nur der Ritter ein eigenes Ei (spawnei_bauen.py); alle
anderen waren das gesprenkelte Standard-Ei in zwei Farben, und im Inventar
sah ein Loewe aus wie ein Kamel. Jetzt traegt jedes Ei das Kennzeichen
seines Tiers: Gesicht, Hoerner, Maehne, Streifen, Flosse.

Gemalt wird wie beim Ritter-Ei, weil das neben den Vanilla-Eiern besteht:
dieselbe Eiform, ein dunkler Umriss, und die Flaechen gefleckt statt
schattiert (Farbtreppen mit fuenf Stufen und einer Streuung von einer
Stufe - eine weniger als beim Ritter, damit das Gesicht darauf ruhig
bleibt). Das Kennzeichen steht als kleine Karte darueber.

Die Bauwerkzeuge der Mobs holen sich den Eintrag fuer ihr Ei hier
(ei_eintrag), damit ein neuer Bau das Bild nicht wieder durch zwei
Farben ersetzt.

    python3 werkzeuge/spawneier.py [--bilder vorschau]
"""

import json
import sys
from pathlib import Path

from PIL import Image

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"

sys.path.insert(0, str(Path(__file__).resolve().parent))
from spawnei_bauen import FORM, drin, streu  # noqa: E402


def hexfarbe(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def treppe(h):
    """Fuenf Stufen von hell nach dunkel um eine Grundfarbe."""
    r, g, b = hexfarbe(h)
    return [tuple(max(0, min(255, round(c * f))) for c in (r, g, b)) for f in (1.28, 1.12, 1.0, 0.86, 0.7)]


def dunkel(farbe, f=0.45):
    return tuple(round(c * f) for c in farbe) + (255,)


# ------------------------------------------------------------ Die Eier
#
# oben/unten: Grundfarben; unten beginnt in Zeile "teilung".
# flecken: (Farbe, Anteil) - Flecken aus der Streuung, fuer Fell und Schuppen.
# karte: {Zeile: 16 Zeichen}; "." laesst den Grund stehen.
# farben: Zeichen -> Farbe. Grossbuchstaben sind Flaechen und werden wie der
# Grund gefleckt; Kleinbuchstaben sind glatte Einzelpixel (Augen, Zaehne).

EIER = {
    "braunbaer": {
        "oben": "#6b4424", "flecken": ("#5a381d", 0.25),
        "karte": {
            4: "....dd....dd....",
            7: ".....k....k.....",
            8: "......MMMM......",
            9: ".....MMnnMM.....",
            10: "......MMMM......",
        },
        "farben": {"d": "#43290f", "k": "#140e0a", "M": "#c9a26f", "n": "#1e1510"},
    },
    "elch": {
        "oben": "#6a4a2c", "flecken": ("#57391f", 0.2),
        "karte": {
            2: "......a..a......",
            3: ".....aa..aa.....",
            4: "....a.a..a.a....",
            5: "....aaa..aaa....",
            8: ".....k....k.....",
            9: "......MMMM......",
            10: "......MnnM......",
            11: ".......MM.......",
            12: ".......d........",
        },
        "farben": {"a": "#e0d0a4", "k": "#120d09", "M": "#46301c", "n": "#1a120c", "d": "#3a2616"},
    },
    "wildschwein": {
        "oben": "#4f4034", "flecken": ("#3e3228", 0.3),
        "karte": {
            2: ".......dd.......",
            3: "......dddd......",
            7: ".....k....k.....",
            8: ".....w....w.....",
            9: ".....wPPPPw.....",
            10: "......PnnP......",
            11: "......PPPP......",
        },
        "farben": {"d": "#2c231c", "k": "#140f0c", "w": "#f2ecdc", "P": "#b08c80", "n": "#3a2622"},
    },
    "bison": {
        "oben": "#8a643e", "unten": "#3a2618", "teilung": 7, "flecken": ("#6e4e30", 0.3),
        "karte": {
            5: "...h........h...",
            6: "...hh......hh...",
            8: ".....k....k.....",
            11: "......nnnn......",
            12: ".....DDDDDD.....",
            13: "......DDDD......",
        },
        "farben": {"h": "#d8d0bc", "k": "#0e0a08", "n": "#1a120c", "D": "#2a1a10"},
    },
    "loewe": {
        "oben": "#8a5226", "flecken": ("#a8662c", 0.3),
        "karte": {
            5: "......FFFF......",
            6: ".....FFFFFF.....",
            7: ".....FkFFkF.....",
            8: ".....FFFFFF.....",
            9: "......FnnF......",
            10: "......FwwF......",
            11: ".......FF.......",
        },
        "farben": {"F": "#dcac68", "k": "#2a1a0c", "n": "#4a2a18", "w": "#f4e8d0"},
    },
    "tiger": {
        "oben": "#e8923a",
        "karte": {
            3: "......s..s......",
            4: "....s......s....",
            5: "...ss......ss...",
            7: ".....g....g.....",
            8: "..ss........ss..",
            9: "......WWWW......",
            10: ".....WWnnWW.....",
            11: "..ss..WWWW..ss..",
            12: "...s..WWWW..s...",
        },
        "farben": {"s": "#1c1410", "g": "#c8d850", "W": "#f4ece0", "n": "#3a2020"},
    },
    "krokodil": {
        "oben": "#4a5a28", "unten": "#b4ac78", "teilung": 11, "flecken": ("#3a4820", 0.35),
        "karte": {
            4: "....dd....dd....",
            5: "....yk....ky....",
            9: "...kkkkkkkkkk...",
            10: "...w.w.w.w.w....",
        },
        "farben": {"d": "#2e3a16", "y": "#e8d040", "k": "#141810", "w": "#f4f0e0"},
    },
    "schneeleopard": {
        "oben": "#dcdcd6",
        "karte": {
            2: "......r..r......",
            3: ".....r.r..r.....",
            4: "..........r.....",
            5: "....r.r.........",
            6: "...r......r.r...",
            7: ".....g....g.....",
            9: "......nn........",
            10: "...r............",
            11: "..r.r.......r...",
            12: "..........r.r...",
            13: ".....r..........",
        },
        "farben": {"r": "#4a4844", "g": "#9cc8b0", "n": "#6a5a58"},
    },
    "wal": {
        "oben": "#2a3440", "unten": "#e6eaec", "teilung": 10,
        "karte": {
            1: ".......w........",
            2: "......w.w.......",
            7: "...k............",
            10: "..g..g..g..g....",
            11: "...g..g..g..g...",
        },
        "farben": {"w": "#d8f0ff", "k": "#0c1014", "g": "#b8c0c4"},
    },
    "hai": {
        "oben": "#6a7680", "unten": "#eef0f0", "teilung": 9,
        "karte": {
            1: "......F.........",
            2: "......FF........",
            3: "......FFF.......",
            6: "...k........k...",
            9: "...kkkkkkkkkk...",
            10: "...w.w.w.w.w....",
        },
        "farben": {"F": "#46525c", "k": "#101418", "w": "#ffffff"},
    },
    "riesenkalmar": {
        "oben": "#9a2e38", "flecken": ("#b84450", 0.25),
        "karte": {
            5: ".....YYYY.......",
            6: "....YYkkYY......",
            7: "....YYkkYY......",
            8: ".....YYYY.......",
            11: "..t..t..t..t....",
            12: "...t..t..t..t...",
            13: "....t..t..t.....",
        },
        "farben": {"Y": "#f0d060", "k": "#140c0c", "t": "#e8a0a0"},
    },
    "schwertfisch": {
        "oben": "#2e2644", "unten": "#c4ccd4", "teilung": 9,
        "karte": {
            1: "......F.........",
            2: "......FF........",
            6: ".sssssk.........",
        },
        "farben": {"F": "#241e38", "s": "#e4e8ec", "k": "#0c0a12"},
    },
    "elefant": {
        "oben": "#8a8078", "flecken": ("#7a716a", 0.25),
        "karte": {
            4: "..EE........EE..",
            5: "..EEE......EEE..",
            6: "..EEE......EEE..",
            7: "..EE.k....k.EE..",
            8: "...E..RRRR..E...",
            9: "......RRRR......",
            10: ".....w.RR.w.....",
            11: ".....w.RR.w.....",
            12: ".......RR.......",
            13: "........R.......",
        },
        "farben": {"E": "#6a625a", "k": "#141210", "w": "#f4ecd8", "R": "#5e5650"},
    },
    "nashorn": {
        "oben": "#8a8884", "flecken": ("#76746f", 0.3),
        "karte": {
            3: "..........h.....",
            4: ".........hh.....",
            5: "........hhh.....",
            6: ".......hhhh.....",
            8: "....k.....k.....",
            10: ".....nn..nn.....",
        },
        "farben": {"h": "#dcd4c0", "k": "#141210", "n": "#3e3c3a"},
    },
    "gorilla": {
        "oben": "#2c2a28", "flecken": ("#3c3a38", 0.25),
        "karte": {
            5: ".....GGGGGG.....",
            6: ".....GkGGkG.....",
            7: "....GGGGGGGG....",
            8: ".....GGnnGG.....",
            9: ".....GGGGGG.....",
            10: "......GddG......",
        },
        "farben": {"G": "#7a6c62", "k": "#0c0a08", "n": "#2a2420", "d": "#2a2420"},
    },
    "walross": {
        "oben": "#9a6a52", "flecken": ("#86584a", 0.25),
        "karte": {
            6: ".....k....k.....",
            8: ".....MMMMMM.....",
            9: "....MMMnnMMM....",
            10: "....MwMMMMwM....",
            11: ".....w....w.....",
            12: ".....w....w.....",
            13: "......w..w......",
        },
        "farben": {"k": "#140e0c", "M": "#c89a80", "n": "#3a2622", "w": "#f4ecd8"},
    },
    "mantarochen": {
        "oben": "#23272e", "unten": "#e8eaec", "teilung": 10,
        "karte": {
            5: "...ww......ww...",
            6: "....ww....ww....",
            7: ".....wwwwww.....",
            8: "......wwww......",
            11: ".....g.g.g......",
            12: "......g.g.g.....",
        },
        "farben": {"w": "#cfd6de", "g": "#9aa4ae"},
    },
    "steinadler": {
        "oben": "#c08a3e", "unten": "#4a3222", "teilung": 8, "flecken": ("#a87430", 0.3),
        "karte": {
            5: ".....k..........",
            6: "......bbb.......",
            7: ".......bbb......",
            8: "........bb......",
            9: "........b.......",
        },
        "farben": {"k": "#141008", "b": "#f0c848"},
    },
    "bandit": {
        "oben": "#5e3a22", "unten": "#9a2a26", "teilung": 10,
        "karte": {
            5: "....LLLLLLLL....",
            6: "...LLLLLLLLLL...",
            7: "...LLwkLLwkLL...",
            8: "...LLLLLLLLLL...",
        },
        "farben": {"L": "#2c1c12", "w": "#e8dcc8", "k": "#0c0806"},
    },
    "wilderer": {
        "oben": "#4e5a32", "flecken": ("#3e4828", 0.3),
        "karte": {
            2: ".........f......",
            3: "........ff......",
            4: "........f.......",
            6: "....SSSSSSSS....",
            7: "....SwkSSwkS....",
            8: "....SSSSSSSS....",
            10: "..tt........tt..",
            11: "....tt....tt....",
            12: "......tttt......",
        },
        "farben": {"f": "#d84a30", "S": "#6a5440", "w": "#e8dcc8", "k": "#0c0806", "t": "#5a4028"},
    },
    "bandenchef": {
        "oben": "#3a2a22", "flecken": ("#2c1f19", 0.3),
        "karte": {
            2: "......g..g......",
            3: ".....gggggg.....",
            6: "..RRRRRRRRRRRR..",
            7: "..RRwkRRRRwkRR..",
            8: "..RRRRRRRRRRRR..",
            11: "......gggg......",
            12: ".......gg.......",
        },
        "farben": {"g": "#e2b84a", "R": "#c02838", "w": "#f0e0d0", "k": "#0c0806"},
    },
    "ritterhauptmann": {
        "oben": "#c7c9cd", "unten": "#3a4ab0", "teilung": 11,
        "karte": {
            0: ".......PP.......",
            1: "......PPPP......",
            2: ".......PP.......",
            6: "....bbbbbbbb....",
            8: "....kkk..kkk....",
            11: "..gggggggggggg..",
        },
        "farben": {"P": "#4a78e8", "b": "#2e2f33", "k": "#0c0c10", "g": "#d8b050"},
    },
    "roland": {
        "oben": "#2b48a4", "unten": "#c7c9cd", "teilung": 11,
        "karte": {
            3: ".......gg.......",
            4: ".......gg.......",
            5: ".....gggggg.....",
            6: "......gggg......",
            7: "......g..g......",
            9: "..cccccccccccc..",
        },
        "farben": {"g": "#f0c850", "c": "#e2ba4e"},
    },
    "rabenfuerst": {
        "oben": "#2b2533", "unten": "#8e1d27", "teilung": 12, "flecken": ("#231e2a", 0.3),
        "karte": {
            5: "....BBBBBBBB....",
            6: "....BvBBBBvB....",
            7: "....BBBBBBBB....",
            8: ".....BBBBBB.....",
            9: "......BBBB......",
            10: ".......BB.......",
            11: ".......B........",
        },
        "farben": {"B": "#e8e0cc", "v": "#a060e8"},
    },
    "frostmammut": {
        "oben": "#5b3b27", "flecken": ("#6c4630", 0.3),
        "karte": {
            1: ".....i..i.......",
            2: "......ii.i......",
            3: ".....i.ii.......",
            7: ".....c....c.....",
            9: "...z..RRRR..z...",
            10: "..z...RRRR...z..",
            11: "..z....RR....z..",
            12: "...z...RR...z...",
            13: "....zz..R.zz....",
        },
        "farben": {"i": "#bfe6ff", "c": "#8ad0f0", "R": "#4a3325", "z": "#f0e6cc"},
    },
    "eiswolf": {
        "oben": "#dce8f0",
        "karte": {
            3: ".....o....o.....",
            4: "....oo....oo....",
            7: ".....c....c.....",
            9: "......MMMM......",
            10: "......MnnM......",
            11: ".......MM.......",
        },
        "farben": {"o": "#8aaec8", "c": "#3cb4f0", "M": "#f4f8fc", "n": "#34485a"},
    },
    "glimmerling": {
        "oben": "#4e5a38", "flecken": ("#5e6a44", 0.25),
        "karte": {
            3: "......y....y....",
            5: "...y.......Y....",
            7: ".....k....k.....",
            9: "..Y.....y.......",
            11: ".......y....y...",
            12: "....Y...........",
        },
        "farben": {"y": "#ffe890", "Y": "#ffd678", "k": "#1a1e14"},
    },
}


def ton(x, y, grund, stufe_plus=0):
    t = treppe(grund)
    licht = 0 if x + y < 12 else (1 if x + y < 16 else (2 if x + y < 20 else 3))
    stufe = licht + (streu(x, y) % 3) - 1 + stufe_plus
    return t[max(0, min(4, stufe))] + (255,)


def male(kennung):
    d = EIER[kennung]
    bild = Image.new("RGBA", (16, 16), (0, 0, 0, 0))
    fleck, anteil = d.get("flecken", (None, 0))
    for y in range(16):
        for x in range(16):
            if not drin(x, y):
                continue
            grund = d["unten"] if d.get("unten") and y >= d.get("teilung", 99) else d["oben"]
            if fleck and grund == d["oben"] and (streu(x + 31, y * 3 + 7) % 100) < anteil * 100:
                grund = fleck
            bild.putpixel((x, y), ton(x, y, grund))
    # Das Kennzeichen, dann der Umriss darueber - so bleibt die Eiform
    # auch dort geschlossen, wo ein Horn oder eine Flosse an den Rand stoesst.
    for y, zeile in d.get("karte", {}).items():
        for x, z in enumerate(zeile):
            if z == "." or not (0 <= y < 16):
                continue
            f = d["farben"][z]
            if z.isupper():
                bild.putpixel((x, y), ton(x, y, f))
            else:
                bild.putpixel((x, y), hexfarbe(f) + (255,))
    kante = dunkel(treppe(d["oben"])[4], 0.55)
    for y in range(16):
        for x in range(16):
            if drin(x, y) and not (drin(x - 1, y) and drin(x + 1, y) and drin(x, y - 1) and drin(x, y + 1)):
                # Liegt ein Kennzeichen auf dem Rand, faerbt es den Umriss
                # nur dunkler - der Rand bleibt, die Farbe bleibt erkennbar.
                zeile = d.get("karte", {}).get(y, "")
                z = zeile[x] if x < len(zeile) else "."
                if z != ".":
                    bild.putpixel((x, y), dunkel(hexfarbe(d["farben"][z]), 0.6))
                else:
                    bild.putpixel((x, y), kante)
    # Was ausserhalb der Eiform liegt (ein Federbusch oben), bleibt stehen.
    for y, zeile in d.get("karte", {}).items():
        for x, z in enumerate(zeile):
            if z != "." and not drin(x, y) and 0 <= y < 16:
                bild.putpixel((x, y), hexfarbe(d["farben"][z]) + (255,))
    return bild


def ei_eintrag(kennung, ersatz=None):
    """Der spawn_egg-Eintrag fuer das Wesen: das eigene Bild, wenn es eins gibt."""
    if kennung in EIER or kennung == "ritter":
        return {"texture": f"{kennung}_ei", "texture_index": 0}
    return ersatz


def main():
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    for kennung in EIER:
        male(kennung).save(RES / "textures" / "items" / f"{kennung}_ei.png")
        liste["texture_data"][f"{kennung}_ei"] = {"textures": f"textures/items/{kennung}_ei"}
    liste_pfad.write_text(json.dumps(liste, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")

    # Die fertigen Wesen gleich umstellen - ein neuer Bau der Mobs holt sich
    # denselben Eintrag ueber ei_eintrag.
    umgestellt = 0
    for datei in sorted((RES / "entity").glob("*.json")):
        daten = json.loads(datei.read_text(encoding="utf-8"))
        d = daten["minecraft:client_entity"]["description"]
        kennung = d["identifier"].split(":", 1)[1]
        if kennung in EIER and d.get("spawn_egg") != ei_eintrag(kennung):
            d["spawn_egg"] = ei_eintrag(kennung)
            datei.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
            umgestellt += 1
    print(f"gemalt: {len(EIER)} Spawn-Eier, {umgestellt} Wesen umgestellt")
    if "--bilder" in sys.argv:
        vorschau(Path(sys.argv[sys.argv.index("--bilder") + 1]))


def vorschau(ordner):
    from PIL import ImageDraw, ImageFont
    try:
        schrift = ImageFont.truetype("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf", 12)
    except OSError:
        schrift = None
    namen = ["ritter"] + list(EIER)
    spalten, gross, rand = 7, 96, 14
    zeilen = (len(namen) + spalten - 1) // spalten
    breite, hoehe = gross + 2 * rand, gross + rand + 24
    gesamt = Image.new("RGBA", (spalten * breite, zeilen * hoehe), (198, 198, 198, 255))
    zeichner = ImageDraw.Draw(gesamt)
    for i, kennung in enumerate(namen):
        bild = Image.open(RES / "textures" / "items" / f"{kennung}_ei.png").convert("RGBA")
        x, y = (i % spalten) * breite + rand, (i // spalten) * hoehe + rand
        # Wie ein Inventarfeld: dunkles Grau mit hellem Rand unten rechts.
        zeichner.rectangle([x - 4, y - 4, x + gross + 3, y + gross + 3], fill=(139, 139, 139, 255))
        gesamt.alpha_composite(bild.resize((gross, gross), Image.NEAREST), (x, y))
        zeichner.text((x - 4, y + gross + 6), kennung, fill=(30, 30, 30, 255), font=schrift)
    ordner.mkdir(parents=True, exist_ok=True)
    gesamt.save(ordner / "spawneier.png")
    print("gezeichnet:", ordner / "spawneier.png")


if __name__ == "__main__":
    main()
