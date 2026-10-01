#!/usr/bin/env python3
"""Baut die Erzpfeile in 3D - so, wie man sie in der Hand haelt.

Die Erzpfeile stecken meist in der Zweithand (siehe pfeile.js). Bisher
waren sie dort Minecrafts flaches Bildmodell. Jetzt ein richtiger Pfeil:

* die Spitze ein flaches Metallblatt (0.5) in der Farbe der Sorte,
* ein runder Schaft (1 mal 1),
* die Federn duenn (0.25) und ueber Kreuz - zwei Federebenen im rechten
  Winkel, wie bei einem echten Pfeil. Aus einem flachen Bild allein ginge
  das nicht; die zweite Ebene ist dieselbe Zeichnung, um den Schaft
  gedreht.

Die Farben sind die der Inventarbilder (vorlagen/pfeile.py) - ohne den
dunklen Umriss, den Fynn an 3D-Modellen nicht mag. Das Inventarbild
selbst bleibt.

    python3 werkzeuge/pfeile_3d_bauen.py
"""

import json
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import waffe_bauen as w                           # noqa: E402
from vorlagen import pfeile as v                  # noqa: E402
from dolche_bauen import schreibe                 # noqa: E402
from neue_waffen_bauen import griffversatz        # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"

# Aufrecht, Spitze oben, 5 breit. W B A die Spitze (hell nach dunkel),
# s S Schaft, g der Schaft dort, wo die Hand ihn haelt, F f Federn.
MITTE = 2.5
# Die Spitze schlank mit zwei Widerhaken. Die erste Fassung hatte unten
# eine volle Zeile von fuenf Pixeln und sah aus wie eine Glocke.
KARTE = [
    "..W..",
    "..B..",
    ".WBA.",
    ".BBA.",
    "B.S.A",
    "..s..",
    "..s..",
    "..s..",
    "..s..",
    "..g..",
    "..g..",
    "..g..",
    ".FsF.",
    "FfsfF",
    "FfsfF",
    "..S..",
]
FEDERN = set("Ff")
TIEFE = {"W": 0.5, "B": 0.5, "A": 0.5, "s": 1.0, "S": 1.0, "g": 1.0, "F": 0.25, "f": 0.25}


def farben(sorte):
    f = v.SORTEN[sorte]["farben"]
    return {"W": f["W"], "B": f["B"], "A": f["A"],
            "s": v.SCHAFT["s"], "g": v.SCHAFT["s"], "S": v.SCHAFT["S"],
            "F": f["F"], "f": f["f"]}


def modell(sorte):
    rgba = {k: c + (255,) for k, c in farben(sorte).items()}
    dicke = lambda zeile, spalte, zeichen: TIEFE[zeichen]   # noqa: E731
    haut = RES / "textures" / "entity" / f"{sorte}_haut.png"
    ziel = RES / "models" / "entity" / f"{sorte}.geo.json"
    geo = w.aus_zeichenkarte(sorte, KARTE, rgba, dicke=dicke, mitte=MITTE,
                             ziel_modell=str(ziel), ziel_textur=str(haut))
    # Die zweite Federebene: nur die Federn, noch einmal gebaut und um den
    # Schaft gedreht. Die Haut ist dieselbe, die Felder darin auch.
    nur_federn = ["".join(z if z in FEDERN else "." for z in zeile) for zeile in KARTE]
    with tempfile.TemporaryDirectory() as ordner:
        quer = w.aus_zeichenkarte(sorte + "_quer", nur_federn, rgba, dicke=dicke, mitte=MITTE,
                                  ziel_modell=f"{ordner}/q.geo.json", ziel_textur=f"{ordner}/q.png")
    knochen = geo["minecraft:geometry"][0]["bones"]
    federkaesten = quer["minecraft:geometry"][0]["bones"][-1]["cubes"]
    knochen.append({"name": "federn_quer", "parent": "griff", "pivot": [0, 8, 0],
                    "rotation": [0, 90, 0], "cubes": federkaesten})
    schreibe(ziel, geo)


def animation():
    # Pfeile bleiben so klein wie bisher - sie sind Munition, keine Waffe.
    aussen, ich = griffversatz(KARTE, "g", 0.37, 0.28)
    # In der Zweithand steht alles spiegelverkehrt: links statt rechts.
    zweit = "c.item_slot == 'slot.weapon.offhand'"
    return {"format_version": "1.10.0", "animations": {"animation.erzpfeil.halten": {"loop": True, "bones": {
        "waffe": {
            "position": [f"c.is_first_person ? ({zweit} ? 3.5 : -3.5) : 0.0",
                         "c.is_first_person ? -3.5 : -2.0", 0.0],
            "rotation": ["c.is_first_person ? 0.0 : 90.0", 0.0,
                         f"c.is_first_person ? ({zweit} ? 135.0 : -135.0) : 0.0"],
            "scale": "c.is_first_person ? 0.28 : 0.37",
        },
        "griff": {"position": [0.0, f"c.is_first_person ? {ich:.2f} : {aussen:.2f}", 0.0],
                  "rotation": [0.0, "c.is_first_person ? 0.0 : 90.0", 0.0]},
    }}}}


def attachable(sorte):
    return {"format_version": "1.10.0", "minecraft:attachable": {"description": {
        "identifier": f"fynn:{sorte}",
        "materials": {"default": "entity_alphatest", "enchanted": "entity_alphatest_glint"},
        "textures": {"default": f"textures/entity/{sorte}_haut", "enchanted": "textures/misc/enchanted_item_glint"},
        "geometry": {"default": f"geometry.{sorte}"},
        "animations": {"halten": "animation.erzpfeil.halten"},
        "scripts": {"animate": ["halten"]},
        "render_controllers": ["controller.render.item_default"],
    }}}


def main():
    for sorte in v.SORTEN:
        modell(sorte)
        schreibe(RES / "attachables" / f"{sorte}.json", attachable(sorte))
    schreibe(RES / "animations" / "erzpfeil.animation.json", animation())
    print("gebaut: 4 Erzpfeile in 3D")


if __name__ == "__main__":
    main()
