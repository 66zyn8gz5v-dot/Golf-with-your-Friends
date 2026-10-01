#!/usr/bin/env python3
"""Baut den Rollenaltar - ein Pult wie Zaubertisch und Lesepult.

Fynn fand den Wappenstein "nicht so einzigartig": ein voller Block mit
Wappen drauf. Der Altar ist deshalb kein Wuerfel, sondern ein eigenes
Modell: Steinsockel, Saeule mit einem Stoffbanner in der Farbe der
Rolle, darauf ein schraeges Pult aus dunklem Holz mit Goldkante und ein
aufgeschlagenes Buch. Links stehen Zeilen, rechts das Zeichen der Rolle.

Zwei Bloecke teilen sich das Modell:

* fynn:rollenaltar - zum Bauen und Aufstellen, zeigt alle vier Rollen
  (geviertes Wappen im Buch). Antippen oeffnet die Wahl, wie vorher der
  Wappenstein.
* fynn:tempelaltar - steht nur im Starttempel, je einer fuer jede Rolle.
  Er laesst sich nicht abbauen und nicht bauen; wer ihn antippt, waehlt
  genau diese Rolle und bekommt beim ersten Mal die Startausruestung.

Die Front des Modells zeigt nach Sueden (+z). Mit der Ausrichtung beim
Setzen dreht der Block sie zum Spieler hin - dieselbe Rechnung wie beim
Feuerkasten: Zustand "north" heisst, der Spieler schaute nach Norden,
also muss die Front nach Sueden.

    python3 werkzeuge/altar_bauen.py
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import ofen_koernung                            # noqa: E402
from dolche_bauen import schreibe, sprache      # noqa: E402
from rollen_bilder import KUGELFARBEN, mauer, STEIN   # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

ROLLEN = ["ritter", "magier", "bogenschuetze", "assassine"]
SORTEN = ["alle"] + ROLLEN

# ------------------------------------------------------------- Bilder

HOLZ = {"h": (104, 70, 44), "m": (78, 52, 32), "d": (54, 36, 22)}
GOLD = {"G": (240, 196, 72), "g": (178, 128, 30)}
PAPIER = {"p": (238, 226, 194), "P": (214, 198, 160), "t": (122, 94, 64), "r": (170, 150, 116)}

# Die Zeichen der Rollen, sechs mal sechs, auf der rechten Buchseite.
# h hell, c Grund, d dunkel in der Farbe der Rolle, k Tinte.
ZEICHEN = {
    "ritter": [          # ein Schwert, schraeg
        ".....h",
        "....hc",
        "k..hc.",
        ".kcc..",
        ".dk...",
        "d..k..",
    ],
    "magier": [          # eine Flamme
        "..h...",
        "..ch..",
        ".cchc.",
        ".chhc.",
        "cchhcc",
        ".dccd.",
    ],
    "bogenschuetze": [   # Bogen mit eingelegtem Pfeil
        ".dd...",
        "d..k..",
        "dchhhh",
        "d..k..",
        ".dd...",
        "......",
    ],
    "assassine": [       # ein Dolch
        "..h...",
        "..hc..",
        "..hc..",
        ".dkkd.",
        "..cc..",
        "..k...",
    ],
    "alle": [            # das gevierte Wappen des alten Wappensteins
        "111222",
        "111222",
        "111222",
        "333444",
        "333444",
        "333444",
    ],
}


def rollenfarben(rolle):
    """Licht, Grund und Schatten einer Rolle - aus den Kugeln der Leiste."""
    if rolle == "alle":
        return {"h": (236, 224, 250), "c": (130, 90, 170), "d": (80, 50, 110)}
    w, h, c, d, D, K = KUGELFARBEN[rolle]
    return {"h": h, "c": c, "d": D}


def textur(rolle):
    """32 mal 32: Stein, Holz, Buch, Stoff - je ein Viertel."""
    bild = Image.new("RGBA", (32, 32), (0, 0, 0, 0))

    # Stein oben links, gemauert und gekoernt wie der Feuerkasten.
    stein = Image.new("RGBA", (16, 16))
    for y, zeile in enumerate(mauer()):
        for x, z in enumerate(zeile):
            stein.putpixel((x, y), STEIN[z] + (255,))
    stein, _ = ofen_koernung.koernen(stein, 71)
    bild.paste(stein, (0, 0))

    # Holz oben rechts: Bretter quer, eine Goldkante rundum.
    for y in range(16):
        for x in range(16):
            if x in (0, 15) or y in (0, 15):
                ton = GOLD["G"] if x == 0 or y == 0 else GOLD["g"]
            else:
                ton = HOLZ["d"] if y % 4 == 3 else (HOLZ["h"] if (x + 3 * (y // 4)) % 7 else HOLZ["m"])
            bild.putpixel((16 + x, y), ton + (255,))

    # Das Buch unten links: 12 mal 8, links Zeilen, rechts das Zeichen.
    farben = rollenfarben(rolle)
    for y in range(8):
        for x in range(12):
            if x in (5, 6):
                ton = PAPIER["P"]                    # Falz
            elif y in (0, 7) or x in (0, 11):
                ton = PAPIER["r"]                    # Schnitt
            else:
                ton = PAPIER["p"]
            bild.putpixel((x, 16 + y), ton + (255,))
    for y in (2, 3, 5):                             # Zeilen, unregelmaessig lang
        for x in range(1, 5 if y != 5 else 3):
            bild.putpixel((x, 16 + y), PAPIER["t"] + (255,))
    viertel = {"1": KUGELFARBEN["ritter"][2], "2": KUGELFARBEN["magier"][2],
               "3": KUGELFARBEN["bogenschuetze"][2], "4": KUGELFARBEN["assassine"][2]}
    for y, zeile in enumerate(ZEICHEN[rolle]):
        for x, z in enumerate(zeile):
            if z == ".":
                continue
            ton = viertel.get(z) or (PAPIER["t"] if z == "k" else farben[z])
            # Rechte Seite: Spalten 7 bis 10 sind nur vier breit - das
            # Zeichen ragt ueber den Falz, wie auf eine Doppelseite gemalt.
            bild.putpixel((5 + x, 17 + y), ton + (255,))

    # Von oben gesehen liegt die Oberseite im Spiel seitenverkehrt: Was
    # links gemalt ist, steht fuer den Leser rechts. Das Buch wird darum
    # gespiegelt gemalt, damit die Zeilen links und das Zeichen rechts
    # stehen - und das Zeichen richtig herum.
    buch = bild.crop((0, 16, 12, 24)).transpose(Image.FLIP_LEFT_RIGHT)
    bild.paste(buch, (0, 16))

    # Kerzen: Wachs und Flamme in einem freien Winkel der Textur.
    for y in range(16, 19):
        bild.putpixel((24, y), (240, 234, 214, 255))
    bild.putpixel((25, 16), (255, 190, 60, 255))

    # Stoff unten rechts: 6 breit, 8 hoch, Goldsaum unten, in der Mitte
    # ein Streifen im hellen Ton.
    for y in range(8):
        for x in range(6):
            if y == 7:
                ton = GOLD["g"] if x % 2 else GOLD["G"]
            elif x in (2, 3):
                ton = farben["h"] if rolle != "alle" else KUGELFARBEN[ROLLEN[y % 4]][2]
            else:
                ton = farben["c"] if rolle != "alle" else farben["d"]
            bild.putpixel((16 + x, 16 + y), ton + (255,))
    return bild


# ------------------------------------------------------------- Modell

def flaechen(u, v, w, h, d, oben=None):
    """Die sechs Flaechen eines Kastens, alle aus einem Feld der Textur."""
    feld = {"uv": [u, v], "uv_size": [w, h]}
    return {
        "north": feld, "south": feld,
        "east": {"uv": [u, v], "uv_size": [d, h]},
        "west": {"uv": [u, v], "uv_size": [d, h]},
        "up": oben or {"uv": [u, v], "uv_size": [w, d]},
        "down": {"uv": [u, v], "uv_size": [w, d]},
    }


def modell():
    kaesten = [
        # Sockel
        {"origin": [-7, 0, -7], "size": [14, 2, 14], "uv": flaechen(1, 1, 14, 2, 14)},
        # Saeule
        {"origin": [-4, 2, -4], "size": [8, 9, 8], "uv": flaechen(4, 3, 8, 9, 8)},
        # Kapitell aus Holz
        {"origin": [-5, 11, -5], "size": [10, 1, 10], "uv": flaechen(19, 3, 10, 1, 10)},
        # Das Pult: hinten hoch, vorn tief, damit das Buch zum Leser
        # (Sueden) schaut. Beim ersten Bau stand das Vorzeichen falsch
        # herum, und die hohe Kante zeigte zum Leser.
        {"origin": [-7, 12, -5], "size": [14, 2, 10], "uv": flaechen(17, 1, 14, 2, 10),
         "pivot": [0, 12, 0], "rotation": [-22.5, 0, 0]},
        # Das Buch darauf
        {"origin": [-6, 14, -4], "size": [12, 1, 8],
         "uv": flaechen(0, 23, 12, 1, 8, oben={"uv": [0, 16], "uv_size": [12, 8]}),
         "pivot": [0, 12, 0], "rotation": [-22.5, 0, 0]},
        # Das Banner vorn an der Saeule
        {"origin": [-3, 3, 4], "size": [6, 8, 0.5],
         "uv": flaechen(16, 16, 6, 8, 1)},
        # Zwei Kerzen vorn auf dem Sockel.
        {"origin": [-6.5, 2, 4.5], "size": [1, 3, 1],
         "uv": flaechen(24, 16, 1, 3, 1, oben={"uv": [25, 16], "uv_size": [1, 1]})},
        {"origin": [5.5, 2, 4.5], "size": [1, 2, 1],
         "uv": flaechen(24, 16, 1, 2, 1, oben={"uv": [25, 16], "uv_size": [1, 1]})},
    ]
    return {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry.rollenaltar",
                "texture_width": 32, "texture_height": 32,
                "visible_bounds_width": 2, "visible_bounds_height": 2,
                "visible_bounds_offset": [0, 0.5, 0],
            },
            "bones": [{"name": "altar", "pivot": [0, 0, 0], "cubes": kaesten}],
        }],
    }


# ------------------------------------------------------------- Bloecke

DREHUNG = {"north": 0, "west": 90, "south": 180, "east": -90}


def drehungen(bedingung=""):
    return [{
        "condition": f"q.block_state('minecraft:cardinal_direction') == '{r}'" + bedingung,
        "components": {"minecraft:transformation": {"rotation": [0, grad, 0]}},
    } for r, grad in DREHUNG.items()]


def gemeinsam(textur_name):
    return {
        "minecraft:geometry": "geometry.rollenaltar",
        "minecraft:material_instances": {"*": {"texture": textur_name, "render_method": "alpha_test"}},
        "minecraft:collision_box": {"origin": [-7, 0, -7], "size": [14, 15, 14]},
        "minecraft:selection_box": {"origin": [-7, 0, -7], "size": [14, 16, 14]},
        # Kein voller Block: Licht geht durch, sonst stuende er im
        # eigenen Schatten.
        "minecraft:light_dampening": 0,
        # Die Kerzen leuchten ein wenig.
        "minecraft:light_emission": 5,
        "minecraft:map_color": "#8A7A9A",
    }


def rollenaltar():
    return {
        "format_version": "1.21.90",
        "minecraft:block": {
            "description": {
                "identifier": "fynn:rollenaltar",
                "menu_category": {"category": "equipment"},
                "traits": {"minecraft:placement_direction": {"enabled_states": ["minecraft:cardinal_direction"]}},
            },
            "components": {
                **gemeinsam("rollenaltar_alle"),
                "fynn:rollenwahl": {},
                "minecraft:destructible_by_explosion": {"explosion_resistance": 6.0},
                "minecraft:destructible_by_mining": {"seconds_to_destroy": 3.0},
            },
            "permutations": drehungen(),
        },
    }


def tempelaltar():
    permutationen = []
    for rolle in ROLLEN:
        permutationen.append({
            "condition": f"q.block_state('fynn:rolle') == '{rolle}'",
            "components": {"minecraft:material_instances": {
                "*": {"texture": f"rollenaltar_{rolle}", "render_method": "alpha_test"}}},
        })
    return {
        "format_version": "1.21.90",
        "minecraft:block": {
            "description": {
                "identifier": "fynn:tempelaltar",
                # Nicht im Kreativinventar: Er gehoert in den Tempel.
                "menu_category": {"category": "none"},
                "states": {"fynn:rolle": ROLLEN},
                "traits": {"minecraft:placement_direction": {"enabled_states": ["minecraft:cardinal_direction"]}},
            },
            "components": {
                **gemeinsam("rollenaltar_ritter"),
                "fynn:tempelwahl": {},
                # Wie Grundgestein: Den Tempel soll niemand abtragen, und
                # die Altaere darin gibt es nur dort.
                "minecraft:destructible_by_mining": False,
                "minecraft:destructible_by_explosion": False,
                "minecraft:loot": "loot_tables/leer.json",
            },
            "permutations": drehungen() + permutationen,
        },
    }


def rezept():
    return {
        "format_version": "1.20.10",
        "minecraft:recipe_shaped": {
            "description": {"identifier": "fynn:rollenaltar"},
            "tags": ["crafting_table"],
            "pattern": ["GBG", " S ", "SSS"],
            "key": {
                "G": {"item": "minecraft:gold_ingot"},
                "B": {"item": "minecraft:book"},
                "S": {"item": "minecraft:stone_bricks"},
            },
            "unlock": [{"item": "minecraft:book"}],
            "result": {"item": "fynn:rollenaltar"},
        },
    }


def weg_mit_dem_wappenstein():
    """Der Wappenstein war einen Tag lang da und wird vom Altar ersetzt."""
    for pfad in [VER / "blocks" / "wappenstein.json", VER / "recipes" / "wappenstein.json"] + [
            RES / "textures" / "blocks" / f"wappenstein_{n}.png" for n in ("seite", "oben", "unten")]:
        if pfad.exists():
            pfad.unlink()
    for datei in ("terrain_texture.json",):
        p = RES / "textures" / datei
        d = json.loads(p.read_text(encoding="utf-8"))
        for n in ("seite", "oben", "unten"):
            d["texture_data"].pop(f"wappenstein_{n}", None)
        p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    p = RES / "blocks.json"
    d = json.loads(p.read_text(encoding="utf-8"))
    d.pop("fynn:wappenstein", None)
    p.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    for sprache_ in ("de_DE", "en_US"):
        p = RES / "texts" / f"{sprache_}.lang"
        zeilen = [z for z in p.read_text(encoding="utf-8").splitlines() if "fynn:wappenstein" not in z]
        p.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def main():
    weg_mit_dem_wappenstein()
    terrain = RES / "textures" / "terrain_texture.json"
    t = json.loads(terrain.read_text(encoding="utf-8"))
    for sorte in SORTEN:
        textur(sorte).save(RES / "textures" / "blocks" / f"rollenaltar_{sorte}.png")
        t["texture_data"][f"rollenaltar_{sorte}"] = {"textures": f"textures/blocks/rollenaltar_{sorte}"}
    terrain.write_text(json.dumps(t, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    schreibe(RES / "models" / "blocks" / "rollenaltar.geo.json", modell())
    schreibe(VER / "blocks" / "rollenaltar.json", rollenaltar())
    schreibe(VER / "blocks" / "tempelaltar.json", tempelaltar())
    schreibe(VER / "recipes" / "rollenaltar.json", rezept())
    schreibe(VER / "loot_tables" / "leer.json", {"pools": []})
    b = RES / "blocks.json"
    d = json.loads(b.read_text(encoding="utf-8"))
    d["fynn:rollenaltar"] = {"sound": "stone"}
    d["fynn:tempelaltar"] = {"sound": "stone"}
    b.write_text(json.dumps(d, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    sprache(RES / "texts" / "de_DE.lang", [("tile.fynn:rollenaltar.name", "Rollenaltar"),
                                          ("tile.fynn:tempelaltar.name", "Tempelaltar")])
    sprache(RES / "texts" / "en_US.lang", [("tile.fynn:rollenaltar.name", "Role Altar"),
                                          ("tile.fynn:tempelaltar.name", "Temple Altar")])
    print("gebaut: Rollenaltar, Tempelaltar, 5 Texturen")


if __name__ == "__main__":
    main()
