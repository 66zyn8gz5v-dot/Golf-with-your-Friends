#!/usr/bin/env python3
"""Obst an den Baeumen: Apfel, Birne, Pfirsich, Pflaume.

Fynn: "eine Wahrscheinlichkeit, dass an Baeumen Fruechte wachsen, die man
dann einfach ernten kann, ohne die Blaetter abzubauen."

Wie es geht: Unter den Blaettern natuerlicher Baeume waechst hin und wieder
eine Frucht - ein eigener kleiner Block, der unter dem Laub haengt. Er
durchlaeuft vier Stufen: Bluete, kleine gruene Frucht, halbreif, reif. Wer
eine reife Frucht antippt, bekommt sie in die Hand, und am Zweig waechst
eine neue nach. Das Laub bleibt, wie es ist.

Welcher Baum was traegt (natuerliche Blaetter, nicht selbst gesetzte):

    Eiche          Apfel (Minecrafts eigener Apfel)
    Birke          Birne
    Kirsche, Akazie Pfirsich
    Schwarzeiche   Pflaume

Das Wachsen und Ernten macht verhaltenspaket/scripts/obst.js; dieses
Werkzeug baut Block, Modelle, Bilder, Gegenstaende und Rezepte.

Dazu drei Gerichte: Obstsalat, Pflaumenkuchen, Apfelstrudel.

    python3 werkzeuge/obst_bauen.py [--bilder ORDNER]
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tierprodukte_bauen as tp                                     # noqa: E402
from tiermodell import Modell, hexfarbe, mische, streu               # noqa: E402
from vorlagen.tierformen import FORMEN                              # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

SORTEN = ["apfel", "birne", "pfirsich", "pflaume"]
# Farben: (unreif, halbreif, reif, Sprenkel oder Wange, Bluete)
FARBEN = {
    "apfel":    ("#6ea03a", "#b0a83a", "#c8302a", "#e8c040", "#f6e2ea"),
    "birne":    ("#7ea83e", "#b8c046", "#d8c04a", "#8a6a32", "#f8f4ee"),
    "pfirsich": ("#94ae4c", "#e8b060", "#f2a262", "#d8503e", "#f2a8c4"),
    "pflaume":  ("#7a9a40", "#6e4a78", "#58306e", "#9a80b4", "#f6f2f4"),
}


# ------------------------------------------------------------ Modelle

def bluete_modell():
    """Zwei gekreuzte Flaechen mit einer Bluetentraube."""
    m = Modell("obst_bluete", sichtbreite=1, sichthoehe=1)
    b = m.knoch("obst", [0, 16, 0])
    b.kasten([-4, 8, 0], [8, 8, 0], "bluete", drehung=[0, 45, 0], drehpunkt=[0, 12, 0])
    b.kasten([-4, 8, 0], [8, 8, 0], "bluete", drehung=[0, -45, 0], drehpunkt=[0, 12, 0])
    return m


# Fynn: "Aepfel und Birnen brauchen mehr Detail. Schicker, ein bisschen
# runder, ein bisschen cleaner." Darum ist keine Frucht mehr ein Wuerfel:
# Jede ist aus Scheiben gestapelt, und jede Scheibe ist ein Achteck aus
# drei Kaesten (ein Kreuz und ein Quadrat dazwischen) - so wirkt sie rund,
# bleibt aber in Minecrafts Pixelart.
#
# Die Scheiben je Sorte, von unten nach oben: (Breite, Hoehe, Unterkante).
FORM = {
    "klein":    [(2, 1, 9), (3, 2, 10), (2, 1, 12)],
    "apfel":    [(3, 1, 7), (5, 3, 8), (4, 1, 11)],
    "birne":    [(3, 1, 5), (5, 3, 6), (4, 1, 9), (3, 2, 10), (2, 1, 12)],
    "pfirsich": [(3, 1, 7), (5, 3, 8), (3, 1, 11)],
    "pflaume":  [(2, 1, 6), (4, 4, 7), (2, 1, 11)],
}


def scheibe(b, breite, hoehe, unten, stoff):
    """Eine runde Scheibe: bei vier und mehr Pixeln ein Achteck."""
    if breite >= 4:
        for bx, bz in ((breite, breite - 2), (breite - 2, breite), (breite - 1, breite - 1)):
            b.kasten([-bx / 2, unten, -bz / 2], [bx, hoehe, bz], stoff)
    else:
        b.kasten([-breite / 2, unten, -breite / 2], [breite, hoehe, breite], stoff)


def frucht_modell(sorte, gross):
    m = Modell(f"obst_{sorte}_{'gross' if gross else 'klein'}", sichtbreite=1, sichthoehe=1)
    b = m.knoch("obst", [0, 16, 0])
    scheiben = FORM[sorte] if gross else FORM["klein"]
    for breite, hoehe, unten in scheiben:
        scheibe(b, breite, hoehe, unten, "frucht")
    oben = scheiben[-1][1] + scheiben[-1][2]
    # Der Stiel, leicht schraeg, und ein Blatt daran.
    b.kasten([-0.5, oben, -0.5], [1, 16 - oben, 1], "stiel", drehung=[0, 0, 8], drehpunkt=[0, oben, 0])
    b.kasten([0.5, 13, 0], [3, 2, 0], "blatt", drehung=[0, -35, 25], drehpunkt=[0.5, 14, 0])
    return m


def maler(sorte, reife):
    unreif, halb, reif, tupf, bluete = FARBEN[sorte]
    grund = hexfarbe({1: unreif, 2: halb, 3: reif}.get(reife, reif))
    scheiben = FORM[sorte] if reife >= 2 else FORM["klein"]
    unten = scheiben[0][2]
    oben = scheiben[-1][1] + scheiben[-1][2]
    mitte_y = (unten + oben) / 2

    def f(stoff, p, n, texel):
        if stoff == "bluete":
            # Eine Traube aus fuenf Bluetchen, gelbe Mitten, dazwischen Luft.
            x, y = texel[0] % 8, texel[1] % 8
            mitten = ((2, 2), (5, 2), (3, 5), (6, 5), (1, 6))
            for mx, my in mitten:
                d = abs(x - mx) + abs(y - my)
                if d == 0:
                    return hexfarbe("#e8c030")
                if d == 1:
                    return hexfarbe(bluete)
            if x in (3, 4) and y < 3:
                return hexfarbe("#5a8a34")                  # Stielchen
            return None
        if stoff == "stiel":
            return hexfarbe("#6a4a2a") if n[0] > 0.5 or n[1] > 0.5 else hexfarbe("#4a3220")
        if stoff == "blatt":
            # Ein Blatt mit Spitze und Mittelrippe, die Ecken bleiben frei.
            x, y = texel[0] % 3, texel[1] % 2
            if x == 2 and y == 1:
                return None                                 # die Spitze
            return hexfarbe("#6aa040") if y == 0 else hexfarbe("#4e8a30")
        # Die Frucht: oben Licht, unten Schatten, in wenigen ruhigen Stufen.
        hoch = (p[1] - mitte_y) / max(1.0, (oben - unten) / 2)
        licht = 0.06 * hoch + 0.1 * n[1] + (0.04 if n[2] < -0.5 or n[0] > 0.5 else -0.03 if n[2] > 0.5 else 0.0)
        c = mische(grund, (255, 255, 255), max(0.0, licht)) if licht > 0 else mische(grund, (0, 0, 0), -licht)
        c = tuple(int(round(v / 6) * 6) for v in c)
        if n[1] > 0.5 and abs(p[0]) < 0.6 and abs(p[2]) < 0.6:
            return mische(grund, (40, 24, 12), 0.5)          # Mulde am Stiel
        if n[1] < -0.5 and abs(p[0]) < 0.6 and abs(p[2]) < 0.6 and reife >= 2:
            return hexfarbe("#4a3622")                      # Kelch unten
        # Ein Glanzpunkt vorn oben - macht die Frucht rund und saftig.
        if n[2] < -0.5 and reife >= 2 and abs(p[0] + 1.0) < 0.45 and abs(p[1] - (oben - 1.5)) < 0.45 \
                and sorte != "pfirsich":
            return mische(c, (255, 255, 255), 0.35)
        if reife == 3:
            s = streu(texel[0], texel[1], 7)
            if sorte == "apfel" and n[2] > 0.5:
                c = mische(c, hexfarbe(tupf), 0.35)         # die Sonnenseite gelblich
            if sorte == "birne" and s < 0.06:
                c = mische(c, hexfarbe(tupf), 0.6)          # wenige braune Sprenkel
            if sorte == "pfirsich":
                if (n[0] > 0.5 or n[2] < -0.5) and p[1] > mitte_y - 1:
                    c = mische(c, hexfarbe(tupf), 0.45)     # rote Wange
                if n[2] < -0.5 and abs(p[0]) < 0.6:
                    c = mische(c, (60, 20, 10), 0.25)       # die Naht
            if sorte == "pflaume" and n[1] > -0.5 and s < 0.14:
                c = mische(c, hexfarbe(tupf), 0.5)          # heller Reif, zart
        return c
    return f


# ------------------------------------------------------------ Block

def zustaende():
    for s in SORTEN:
        for r in range(4):
            yield s, r


def textur_name(sorte, reife):
    return f"obst_{sorte}_bluete" if reife == 0 else f"obst_{sorte}_{reife}"


def geometrie_name(sorte, reife):
    if reife == 0:
        return "geometry.fynn.obst_bluete"
    return f"geometry.fynn.obst_{sorte}_{'klein' if reife == 1 else 'gross'}"


def block():
    auswahl = {"origin": [-3, 6, -3], "size": [6, 10, 6]}
    teile = []
    for s, r in zustaende():
        teile.append({
            "condition": f"q.block_state('fynn:sorte') == '{s}' && q.block_state('fynn:reife') == {r}",
            "components": {
                "minecraft:geometry": geometrie_name(s, r),
                "minecraft:material_instances": {"*": {"texture": textur_name(s, r), "render_method": "alpha_test"}},
            }})
    return {"format_version": "1.21.90", "minecraft:block": {
        "description": {
            "identifier": "fynn:obst",
            "menu_category": {"category": "none"},
            # Zahlen als Bereich, nicht als Liste - die neuere Regelfassung
            # verwirft Listen hier stillschweigend (siehe schemapruefung.py).
            "states": {"fynn:sorte": SORTEN, "fynn:reife": {"values": {"min": 0, "max": 3}}},
        },
        "components": {
            "minecraft:geometry": "geometry.fynn.obst_bluete",
            "minecraft:material_instances": {"*": {"texture": "obst_apfel_bluete", "render_method": "alpha_test"}},
            "minecraft:collision_box": False,
            "minecraft:selection_box": auswahl,
            "minecraft:light_dampening": 0,
            "minecraft:destructible_by_mining": {"seconds_to_destroy": 0.1},
            "minecraft:destructible_by_explosion": {"explosion_resistance": 0.5},
            "minecraft:flammable": {"catch_chance_modifier": 30, "destroy_chance_modifier": 60},
            "minecraft:loot": "loot_tables/leer.json",
            "minecraft:map_color": "#5a8a34",
            "minecraft:tick": {"interval_range": [500, 1400], "looping": True},
            "fynn:obst": {},
        },
        "permutations": teile,
    }}


# ------------------------------------------------------------ Gegenstaende

OBSTFORMEN = {
    "birne": [
        "................",
        "........s.......",
        "........sgg.....",
        ".......s.ggg....",
        "......####......",
        "......####......",
        ".....######.....",
        ".....######.....",
        "....########....",
        "...##w#######...",
        "...#w######f#...",
        "...##########...",
        "...#####f####...",
        "....########....",
        ".....######.....",
        "................",
    ],
    "pfirsich": [
        "................",
        "................",
        "........s.gg....",
        "........sggg....",
        ".....###f###....",
        "....####f####...",
        "...##w##f##rr#..",
        "...#w###f#rrr#..",
        "...#####f#rrr#..",
        "...#####f#rrr#..",
        "...######frr##..",
        "....#####f###...",
        ".....#######....",
        "......#####.....",
        "................",
        "................",
    ],
    "pflaume": [
        "................",
        ".........s......",
        "........s.......",
        "......####......",
        ".....######.....",
        "....##w#####....",
        "....#w######....",
        "....#b######....",
        "....####f###....",
        "....####f###....",
        "....####f###....",
        "....####f##b....",
        ".....######.....",
        "......####......",
        "................",
        "................",
    ],
    "kuchenstueck": [
        "................",
        "................",
        "................",
        "..........fe....",
        "........ffff....",
        "......feffeff...",
        "....ffffffeff...",
        "..fefffffffff...",
        "..###########...",
        "..###########...",
        "..###########...",
        "..sssssssssss...",
        "................",
        "................",
        "................",
        "................",
    ],
    "strudel": [
        "................",
        "................",
        "................",
        "................",
        "....#########...",
        "...#w#w#w#w###..",
        "..##s#s#s#s#s##.",
        "..#############.",
        "..#############.",
        "...###########..",
        "....#########...",
        "................",
        "................",
        "................",
        "................",
        "................",
    ],
}
FORMEN.update(OBSTFORMEN)

GEGENSTAENDE = [
    # (Kennung, Namen, Form, Farben, Naehrwert, Saettigung, wird zu, Stapel, glanz)
    ("birne", ("Birne", "Pear"), "birne", {"#": "#d8c04a", "s": "#5a3e22", "g": "#4e8a30", "w": "#fff4b0",
                                          "f": "#a88a3a"},
     4, 0.3, None, 64),
    ("pfirsich", ("Pfirsich", "Peach"), "pfirsich",
     {"#": "#f2a262", "f": "#d0704a", "r": "#e2704e", "s": "#5a3e22", "g": "#4e8a30", "w": "#ffe0c8"},
     4, 0.35, None, 64),
    ("pflaume", ("Pflaume", "Plum"), "pflaume",
     {"#": "#58306e", "f": "#44245a", "b": "#7a6090", "s": "#5a3e22", "w": "#b8a0d0"}, 3, 0.3, None, 64),
    ("obstsalat", ("Obstsalat", "Fruit Salad"), "eintopf",
     {"#": "#f0d8c0", "f": "#f2a262", "g": "#b8c046", "s": "#8a6a44"}, 12, 0.9, "minecraft:bowl", 1),
    ("pflaumenkuchen", ("Pflaumenkuchen", "Plum Cake"), "kuchenstueck",
     {"#": "#e8c878", "f": "#6e3a80", "e": "#3a1c4a", "s": "#a8743a"}, 8, 0.6, None, 16),
    ("apfelstrudel", ("Apfelstrudel", "Apple Strudel"), "strudel",
     {"#": "#d8a050", "w": "#fbf8f0", "s": "#a86a2a"}, 7, 0.6, None, 16),
]


def rezepte():
    return {
        "obstsalat": tp.formlos("obstsalat", ["minecraft:bowl", "minecraft:apple", "fynn:birne", "fynn:pfirsich",
                                              "fynn:pflaume"], "fynn:obstsalat"),
        "pflaumenkuchen": tp.geformt("pflaumenkuchen", ["PPP", "ZEZ", "WWW"],
                                     {"P": "fynn:pflaume", "Z": "minecraft:sugar", "E": "minecraft:egg",
                                      "W": "minecraft:wheat"}, "fynn:pflaumenkuchen", 3),
        "apfelstrudel": tp.formlos("apfelstrudel", ["minecraft:wheat", "minecraft:apple", "minecraft:apple",
                                                    "minecraft:sugar"], "fynn:apfelstrudel", 2),
    }


def sprache():
    namen = ["## Obst"] + [(k, n) for k, n, *_ in GEGENSTAENDE]
    for datei, i in (("de_DE.lang", 0), ("en_US.lang", 1)):
        pfad = RES / "texts" / datei
        eigene = {f"item.fynn:{k}" for k, _ in namen[1:]} | {"tile.fynn:obst"}
        zeilen = [z for z in pfad.read_text(encoding="utf-8").splitlines()
                  if z.split("=")[0].replace(".name", "") not in eigene and z != "## Obst"]
        while zeilen and not zeilen[-1].strip():
            zeilen.pop()
        zeilen += ["", "## Obst"]
        for k, n in namen[1:]:
            zeilen += [f"item.fynn:{k}={n[i]}", f"item.fynn:{k}.name={n[i]}"]
        zeilen.append(f"tile.fynn:obst.name={'Frucht am Zweig' if i == 0 else 'Fruit on the Branch'}")
        pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def main():
    bilder = {}
    # Modelle und Bilder fuer den Block
    geos = []
    blueten = bluete_modell()
    geos.append(blueten.geometrie()["minecraft:geometry"][0])
    ordner = RES / "textures" / "blocks" / "obst"
    ordner.mkdir(parents=True, exist_ok=True)
    terrain_pfad = RES / "textures" / "terrain_texture.json"
    terrain = json.loads(terrain_pfad.read_text(encoding="utf-8"))
    for s in SORTEN:
        bild = blueten.male(maler(s, 0))
        bild.save(ordner / f"{textur_name(s, 0)}.png")
        bilder[textur_name(s, 0)] = bild
        terrain["texture_data"][textur_name(s, 0)] = {"textures": f"textures/blocks/obst/{textur_name(s, 0)}"}
        for gross, stufen in ((False, (1,)), (True, (2, 3))):
            m = frucht_modell(s, gross)
            geos.append(m.geometrie()["minecraft:geometry"][0])
            for r in stufen:
                bild = m.male(maler(s, r))
                bild.save(ordner / f"{textur_name(s, r)}.png")
                bilder[textur_name(s, r)] = bild
                terrain["texture_data"][textur_name(s, r)] = {"textures": f"textures/blocks/obst/{textur_name(s, r)}"}
    tp.schreibe(terrain_pfad, terrain)
    tp.schreibe(RES / "models" / "blocks" / "obst.geo.json", {"format_version": "1.12.0", "minecraft:geometry": geos})
    tp.schreibe(VER / "blocks" / "obst.json", block())
    # Fruechte und Gerichte
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    for k, n, form, farben, nw, sat, wird_zu, stapel in GEGENSTAENDE:
        tp.schreibe(VER / "items" / f"{k}.json",
                    tp.gegenstand(k, tp.essen(nw, sat, wird_zu, stapel=stapel), "items",
                                  "minecraft:itemGroup.name.miscFood"))
        bild = tp.male(form, farben, glanz=form in ("birne", "pfirsich", "pflaume"))
        ziel = RES / "textures" / "items" / "obst" / f"{k}.png"
        ziel.parent.mkdir(parents=True, exist_ok=True)
        bild.save(ziel)
        bilder[k] = bild
        liste["texture_data"][k] = {"textures": f"textures/items/obst/{k}"}
    tp.schreibe(liste_pfad, liste)
    for name, daten in rezepte().items():
        tp.schreibe(VER / "recipes" / f"obst_{name}.json", daten)
    sprache()
    print(f"gebaut: Obstblock mit {len(SORTEN)} Sorten x 4 Stufen, {len(GEGENSTAENDE)} Gegenstaende")
    if "--bilder" in sys.argv:
        ziel = Path(sys.argv[sys.argv.index("--bilder") + 1])
        ziel.mkdir(parents=True, exist_ok=True)
        liste = list(bilder.items())
        bogen = Image.new("RGBA", (8 * 80, ((len(liste) + 7) // 8) * 80), (60, 60, 66, 255))
        for i, (k, b) in enumerate(liste):
            g = b.resize((b.width * 4, b.height * 4), Image.NEAREST)
            bogen.paste(g, ((i % 8) * 80 + 8, (i // 8) * 80 + 8), g)
        bogen.save(ziel / "obst_bilder.png")


if __name__ == "__main__":
    main()
