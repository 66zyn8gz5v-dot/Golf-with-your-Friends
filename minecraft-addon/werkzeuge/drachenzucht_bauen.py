#!/usr/bin/env python3
"""Die Drachenzucht (5.2): das Drachenei als Wesen und als Gegenstand.

Fynn: "Man kann zwei gezaehmte Drachen paaren, und diese legen dann ein
Ei. Das muss man dann hochziehen, und das Ei ist ein kleiner Mix."

* fynn:drachenei - das Ei, das liegt. Es wackelt, wenn es warm liegt,
  und immer heftiger, je naeher das Schluepfen ist; kurz davor hebt sich
  schon der Deckel. Seine Schale zeigt beide Eltern: die Grundfarbe der
  Art, deren Koerper das Junge bekommt, und breite Baender in den Farben
  der anderen (fynn:koerper, fynn:farbe - eine Haut je Paar).
* Der Gegenstand fynn:drachenei: Wer das Ei aufhebt, traegt es mit sich
  (was darin steckt und wie weit es bebruetet ist, reist mit), und setzt
  es woanders wieder ab.

Was geschieht - paaren, legen, brueten, schluepfen, wachsen, vererben -
steht in scripts/drachenzucht.js.

    python3 werkzeuge/drachenzucht_bauen.py [--bilder ordner]
"""

import math
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boss_kern as bk                                               # noqa: E402
import roland_beute_bauen as rbb                                     # noqa: E402
import haut as H                                                     # noqa: E402
import drachen_misch as dm                                           # noqa: E402
from tiermodell import Modell, mische                                # noqa: E402
from tierprodukte_bauen import gegenstand, JAGDFACH                  # noqa: E402

VER, RES = bk.VER, bk.RES
K = rbb.UMRISS


def ei_modell():
    m = Modell("drachenei", sichtbreite=1.2, sichthoehe=1.2)
    ei = m.knoch("ei", [0, 0, 0])
    ei.kasten([-3, 0, -3], [6, 1, 6], "schale")
    ei.kasten([-4, 1, -3], [8, 5, 6], "schale")
    ei.kasten([-3, 1, -4], [6, 5, 8], "schale")
    ei.kasten([-3.5, 5, -3.5], [7, 2, 7], "schale")
    # Der Deckel: die obere Haelfte, die sich vor dem Schluepfen hebt.
    deckel = m.knoch("deckel", [0, 7, 0], "ei")
    deckel.kasten([-3, 7, -3], [6, 2, 6], "schale")
    deckel.kasten([-2, 9, -2], [4, 2, 4], "schale")
    deckel.kasten([-1, 11, -1], [2, 1, 2], "schale")
    return m


def ei_maler(koerper, farbe):
    """Grundfarbe von der Art des Koerpers, unten dunkler; darum schraeg
    laufende breite Baender in den Farben der anderen Art - bei zwei
    Eltern derselben Art in deren Rueckenfarbe. Ganze Flaechen, keine
    Sprenkel. Um die Mitte ein duenner Naht-Streifen: dort bricht es auf."""
    a = dm.grundfarben(dm.ARTEN[koerper][1])
    b = dm.grundfarben(dm.ARTEN[farbe][1])
    grund = [H.dunkler(a["leib"], 0.3), a["leib"], H.heller(a["leib"], 0.18)]
    band = b["ruecken"] if koerper != farbe else a["ruecken"]
    glanz = b["glut"]

    def male(stoff, p, n, texel):
        x, y, z = p
        winkel = math.atan2(z, x)
        # Zwei breite Baender, sanft gewellt um das Ei herum.
        s = y + 0.9 * math.sin(winkel * 3)
        if n[1] > 0.5 and y > 11:
            return H.farbe(glanz)
        if 6.5 <= y < 7.2 and abs(n[1]) < 0.5:
            return H.dunkler(band, 0.2)
        if 2.5 <= s < 4.5 or 8.2 <= s < 10.0:
            return H.verlauf([H.dunkler(band, 0.15), band], y / 12.0, 2)
        return H.verlauf(grund, y / 12.0, 3)
    return male


def ei_verhalten():
    return {"format_version": "1.26.30", "minecraft:entity": {
        "description": {"identifier": "fynn:drachenei", "is_spawnable": False, "is_summonable": True,
                        "properties": {
                            "fynn:koerper": {"type": "int", "range": [0, 15], "default": 0, "client_sync": True},
                            "fynn:farbe": {"type": "int", "range": [0, 15], "default": 0, "client_sync": True},
                            "fynn:warm": {"type": "bool", "default": False, "client_sync": True},
                            "fynn:bald": {"type": "bool", "default": False, "client_sync": True}}},
        "components": {
            "minecraft:type_family": {"family": ["drachenei", "inanimate"]},
            "minecraft:collision_box": {"width": 0.7, "height": 0.9},
            "minecraft:health": {"value": 20, "max": 20},
            # Ein Ei geht nicht kaputt - aufheben kann man es (Skript).
            "minecraft:damage_sensor": {"triggers": [{"cause": "all", "deals_damage": False}]},
            "minecraft:physics": {},
            "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": True},
            "minecraft:knockback_resistance": {"value": 1.0},
            "minecraft:persistent": {},
            "minecraft:nameable": {},
            "minecraft:interact": {"interactions": [{
                "on_interact": {"filters": {"test": "is_family", "subject": "other", "value": "player"}},
                "interact_text": "action.interact.fynn.drachenei"}]},
        }}}


def ei_aussehen(namen):
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": "fynn:drachenei",
        "materials": {"default": "entity_alphatest"},
        "textures": {n: f"textures/entity/drachenei/{n}" for n in namen},
        "geometry": {"default": "geometry.fynn.drachenei"},
        "scripts": {
            "scale": "1.4",
            "initialize": ["variable.fynn_zufall = math.random(0.0, 360.0);"],
            "animate": [{"wackeln": "query.property('fynn:warm')"}, {"deckel": "query.property('fynn:bald')"}],
        },
        "animations": {"wackeln": "animation.fynn.drachenei.wackeln", "deckel": "animation.fynn.drachenei.deckel"},
        "render_controllers": ["controller.render.fynn.drachenei"],
    }}}


def ei_bewegungen():
    zeit = "(query.life_time + variable.fynn_zufall)"
    # Warm liegend: alle paar Sekunden ein Wackeln - kurz vor dem Schluepfen
    # (fynn:bald) doppelt so oft und doppelt so weit.
    staerke = "(query.property('fynn:bald') ? 2.0 : 1.0)"
    stoss = f"math.max(0.0, math.sin({zeit} * 70.0 * {staerke}) - 0.6) * 2.5"
    return {"format_version": "1.10.0", "animations": {
        "animation.fynn.drachenei.wackeln": {"loop": True, "bones": {
            "ei": {"rotation": [f"math.sin({zeit} * 900.0) * 6.0 * {stoss} * {staerke}", 0.0,
                                f"math.cos({zeit} * 900.0) * 8.0 * {stoss} * {staerke}"]}}},
        "animation.fynn.drachenei.deckel": {"loop": True, "bones": {
            "deckel": {"position": [0.0, f"math.max(0.0, math.sin({zeit} * 300.0)) * 0.8", 0.0],
                       "rotation": [f"math.sin({zeit} * 170.0) * 6.0", 0.0, 0.0]}}},
    }}


def ei_steuerung(namen, anzahl):
    return {"format_version": "1.8.0", "render_controllers": {"controller.render.fynn.drachenei": {
        "arrays": {"textures": {"Array.schale": [f"Texture.{n}" for n in namen]}},
        "geometry": "Geometry.default",
        "materials": [{"*": "Material.default"}],
        "textures": [f"Array.schale[query.property('fynn:koerper') * {anzahl} + query.property('fynn:farbe')]"],
    }}}


DRACHENEI = [
    "................",
    "......kkkk......",
    ".....kHhhRk.....",
    "....kHhRRhhk....",
    "...kHhhhRRhhk...",
    "...khhRhhhhRk...",
    "..kHhhRRhhhhRk..",
    "..khhhhhRRhhhk..",
    "..kRhhhhhhRRhk..",
    "..khRRhhhhhhhk..",
    "..kdhhRRhhhhdk..",
    "...kdhhhRRhdk...",
    "...kddhhhhddk...",
    "....kkddddkk....",
    "......kkkk......",
    "................",
]
DRACHENEI_F = {"k": K, "H": (255, 214, 150), "h": (214, 96, 52), "R": (120, 40, 50), "d": (140, 52, 40)}

NAMEN = [
    ("item.fynn:drachenei", "Drachenei", "Dragon Egg"),
    ("entity.fynn:drachenei.name", "Drachenei", "Dragon Egg"),
    ("action.interact.fynn.drachenei", "Aufheben", "Pick up"),
]
NAMEN += [(k + ".name", d, e) for k, d, e in NAMEN if k.startswith("item.")]


def main():
    m = ei_modell()
    bk.schreibe(RES / "models" / "entity" / "drachenei.geo.json", m.geometrie())
    anzahl = len(dm.ARTEN)
    namen = []
    ordner = RES / "textures" / "entity" / "drachenei"
    ordner.mkdir(parents=True, exist_ok=True)
    for k in range(anzahl):
        for f in range(anzahl):
            name = f"ei_{dm.ARTEN[k][0]}_{dm.ARTEN[f][0]}"
            m.male(ei_maler(k, f)).save(ordner / f"{name}.png")
            namen.append(name)
    bk.schreibe(VER / "entities" / "drachenei.json", ei_verhalten())
    bk.schreibe(RES / "entity" / "drachenei.entity.json", ei_aussehen(namen))
    bk.schreibe(RES / "animations" / "drachenei.animation.json", ei_bewegungen())
    bk.schreibe(RES / "render_controllers" / "drachenei.render_controllers.json", ei_steuerung(namen, anzahl))
    # Der Gegenstand: nicht stapelbar - jedes Ei traegt seine eigenen Eltern.
    bk.schreibe(VER / "items" / "drachenei.json", gegenstand("drachenei", {
        "minecraft:max_stack_size": 1, "minecraft:glint": False}, "items", JAGDFACH))
    bk.item_bilder({"drachenei": rbb.male(DRACHENEI, DRACHENEI_F)})
    bk.sprache("Drachenzucht", NAMEN)
    print(f"gebaut: Drachenei ({len(namen)} Schalen), Gegenstand Drachenei")
    if "--bilder" in sys.argv:
        from PIL import Image
        aus = Path(sys.argv[sys.argv.index("--bilder") + 1])
        bilder = [Image.open(ordner / f"{n}.png") for n in namen]
        w, h = bilder[0].size
        gesamt = Image.new("RGBA", (w * anzahl * 4, h * anzahl * 4), (230, 230, 230, 255))
        for i, b in enumerate(bilder):
            gesamt.alpha_composite(b.resize((w * 4, h * 4), Image.NEAREST), ((i % anzahl) * w * 4, (i // anzahl) * h * 4))
        gesamt.save(aus / "dracheneier.png")


if __name__ == "__main__":
    main()
