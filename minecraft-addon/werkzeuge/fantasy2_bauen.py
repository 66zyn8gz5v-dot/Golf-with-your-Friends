#!/usr/bin/env python3
"""Die Beute der zweiten Fantasy-Welle (4.81 bis 4.83).

4.81: Glutstachel und Glutpfeil (Glutskorpion), Spinnenkristall und
Hoehlenauge (Kristallspinne), Irrlichtflasche mit ihrem Wurfgeschoss
(Irrlicht). Was sie tun: scripts/fantasy2.js, scripts/pfeile.js (Glutpfeil)
und scripts/tiere.js (Hoehlenauge als Talisman).

    python3 werkzeuge/fantasy2_bauen.py [--bilder ordner]
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boss_kern as bk                                               # noqa: E402
import roland_beute_bauen as rbb                                     # noqa: E402
from tierprodukte_bauen import gegenstand, formlos, geformt, BEUTEFACH, JAGDFACH  # noqa: E402
from neue_waffen_bauen import geschoss, sprite_aussehen              # noqa: E402

VER, RES = bk.VER, bk.RES
K = rbb.UMRISS

GLUTSTACHEL = [
    "................",
    "................",
    ".........kk.....",
    "........kYk.....",
    "........kOk.....",
    ".......kOrk.....",
    "......kOrrk.....",
    ".....kOrrk......",
    "....kOrrk.......",
    "...kOrrk........",
    "..kGGrk.........",
    "..kGGGk.........",
    "...kkk..........",
    "................",
    "................",
    "................",
]
GLUTSTACHEL_F = {"k": K, "Y": (255, 230, 110), "O": (255, 140, 40), "r": (180, 60, 20), "G": (60, 48, 52)}

GLUTPFEIL = [
    "................",
    "............kkk.",
    "...........kYOk.",
    "..........kOrOk.",
    ".........kOrkk..",
    "........kwk.....",
    ".......kwk......",
    "......kwk.......",
    ".....kwk........",
    "....kwk.........",
    "..kkwk..........",
    ".kfFk...........",
    ".kFfk...........",
    "..kk............",
    "................",
    "................",
]
GLUTPFEIL_F = {"k": K, "Y": (255, 230, 110), "O": (255, 140, 40), "r": (180, 60, 20), "w": (150, 110, 70),
               "f": (230, 230, 230), "F": (200, 200, 200)}

SPINNENKRISTALL = [
    "................",
    "................",
    ".......kk.......",
    "......kWPk......",
    "......kWPk......",
    "...kk.kWPk.kk...",
    "..kWPkkWPkkWPk..",
    "..kWPPkPPkPPPk..",
    "...kPPkPPkPPk...",
    "...kPPPPPPPPk...",
    "....kpPPPPpk....",
    ".....kppppk.....",
    "......kkkk......",
    "................",
    "................",
    "................",
]
SPINNENKRISTALL_F = {"k": K, "W": (240, 220, 255), "P": (168, 106, 224), "p": (110, 60, 160)}

HOEHLENAUGE = [
    "....gggggggg....",
    "...g........g...",
    "..g..........g..",
    "...g...kk...g...",
    "....g.kGGk.g....",
    ".....kGPPGk.....",
    "....kGPWWPGk....",
    "....kGPWkPGk....",
    "....kGPPPPGk....",
    ".....kGPPGk.....",
    "......kGGk......",
    ".......kk.......",
    "................",
    "................",
    "................",
    "................",
]
HOEHLENAUGE_F = {"k": K, "g": (200, 170, 70), "G": (230, 190, 70), "P": (168, 106, 224), "W": (250, 240, 255)}

IRRLICHTFLASCHE = [
    "................",
    "......kkkk......",
    "......kbbk......",
    ".......kk.......",
    "......kwwk......",
    ".....kw..wk.....",
    "....kw.GG.wk....",
    "....k.GWWG.k....",
    "....k.GWWG.k....",
    "....kw.GG.wk....",
    "....k..g...k....",
    "....kw...g.k....",
    ".....kwwwwk.....",
    "......kkkk......",
    "................",
    "................",
]
IRRLICHTFLASCHE_F = {"k": K, "b": (120, 84, 50), "w": (206, 232, 236), "G": (122, 255, 192),
                     "W": (230, 255, 240), "g": (160, 240, 200)}

NAMEN = [
    ("item.fynn:glutstachel", "Glutstachel", "Ember Stinger"),
    ("item.fynn:glutpfeil", "Glutpfeil", "Ember Arrow"),
    ("item.fynn:spinnenkristall", "Spinnenkristall", "Spider Crystal"),
    ("item.fynn:hoehlenauge", "Höhlenauge", "Cave Eye"),
    ("item.fynn:irrlichtflasche", "Irrlichtflasche", "Wisp in a Bottle"),
    ("entity.fynn:irrlichtflasche_wurf.name", "Irrlichtflasche", "Wisp in a Bottle"),
]
NAMEN += [(k + ".name", d, e) for k, d, e in NAMEN if k.startswith("item.")]


def bilder():
    return {"glutstachel": rbb.male(GLUTSTACHEL, GLUTSTACHEL_F), "glutpfeil": rbb.male(GLUTPFEIL, GLUTPFEIL_F),
            "spinnenkristall": rbb.male(SPINNENKRISTALL, SPINNENKRISTALL_F),
            "hoehlenauge": rbb.male(HOEHLENAUGE, HOEHLENAUGE_F),
            "irrlichtflasche": rbb.male(IRRLICHTFLASCHE, IRRLICHTFLASCHE_F)}


def main():
    bk.schreibe(VER / "items" / "glutstachel.json",
                gegenstand("glutstachel", {"minecraft:max_stack_size": 64}, "items", BEUTEFACH))
    # Wie die Erzpfeile: in die Zweithand, dann schiesst der Bogen Glut.
    bk.schreibe(VER / "items" / "glutpfeil.json", gegenstand("glutpfeil", {
        "minecraft:max_stack_size": 64, "minecraft:allow_off_hand": True},
        "equipment", "minecraft:itemGroup.name.arrow"))
    bk.schreibe(VER / "recipes" / "glutpfeil.json",
                formlos("glutpfeil", ["fynn:glutstachel", "minecraft:arrow", "minecraft:arrow",
                                      "minecraft:arrow", "minecraft:arrow"], "fynn:glutpfeil", 4))
    bk.schreibe(VER / "items" / "spinnenkristall.json",
                gegenstand("spinnenkristall", {"minecraft:max_stack_size": 64}, "items", BEUTEFACH))
    bk.schreibe(VER / "items" / "hoehlenauge.json",
                gegenstand("hoehlenauge", {"minecraft:max_stack_size": 1, "minecraft:glint": True},
                           "equipment", JAGDFACH))
    bk.schreibe(VER / "recipes" / "hoehlenauge.json",
                geformt("hoehlenauge", [" G ", "GkG", " G "],
                        {"G": "minecraft:gold_ingot", "k": "fynn:spinnenkristall"}, "fynn:hoehlenauge"))
    bk.schreibe(VER / "items" / "irrlichtflasche.json", gegenstand("irrlichtflasche", {
        "minecraft:max_stack_size": 16,
        "minecraft:throwable": {"do_swing_animation": True, "launch_power_scale": 1.0, "max_launch_power": 1.0},
        "minecraft:projectile": {"projectile_entity": "fynn:irrlichtflasche_wurf"},
    }, "equipment", JAGDFACH))
    bk.schreibe(VER / "entities" / "irrlichtflasche_wurf.json", geschoss("irrlichtflasche_wurf", 0))
    bk.schreibe(RES / "entity" / "irrlichtflasche_wurf.entity.json",
                sprite_aussehen("irrlichtflasche_wurf", "textures/items/irrlichtflasche"))
    bk.item_bilder(bilder())
    bk.sprache("Fantasy-Wesen, zweite Welle", NAMEN)
    print("gebaut: Glutstachel, Glutpfeil, Spinnenkristall, Höhlenauge, Irrlichtflasche")
    if "--bilder" in sys.argv:
        from PIL import Image
        ordner = Path(sys.argv[sys.argv.index("--bilder") + 1])
        b = list(bilder().values())
        gesamt = Image.new("RGBA", (len(b) * 180, 180), (198, 198, 198, 255))
        for i, bild in enumerate(b):
            gesamt.alpha_composite(bild.resize((144, 144), Image.NEAREST), (18 + i * 180, 18))
        gesamt.save(ordner / "fantasy2_gegenstaende.png")
        print("gezeichnet:", ordner / "fantasy2_gegenstaende.png")


if __name__ == "__main__":
    main()
