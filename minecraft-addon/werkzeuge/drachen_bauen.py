#!/usr/bin/env python3
"""Was die Drachen ausser sich selbst brauchen (ab 4.90): die Drachenpfeife
und die Teilchen fuer Schlaf und Niederlage.

Fynn: "Schlafen mit Augen zu, Schlafpartikeln, Z-maessig."

* Drachenpfeife - im Sattel loest sie die zweite Faehigkeit des Drachen aus
  (beim Lindwurm die Feuerkugel), zu Fuss ruft sie die eigenen Drachen.
  Rezept: Knochen, Goldbarren, Faden.
* fynn:schlaf_z  - kleine "Z", die ueber dem Kopf aufsteigen und groesser
  werden.
* fynn:benommen  - gelbe Sternchen, die ueber dem besiegten Drachen kreisen.

    python3 werkzeuge/drachen_bauen.py [--bilder ordner]
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import boss_kern as bk                                               # noqa: E402
import roland_beute_bauen as rbb                                     # noqa: E402
from tierprodukte_bauen import gegenstand, geformt, JAGDFACH          # noqa: E402

VER, RES = bk.VER, bk.RES
K = rbb.UMRISS

DRACHENPFEIFE = [
    "................",
    "................",
    "................",
    "...........kk...",
    "..........kGGk..",
    ".........kGgGk..",
    "........kWWkk...",
    ".......kWwWk....",
    "......kWwWk.....",
    ".....kWwWk......",
    "....kWkwk.......",
    "...kWwWk........",
    "..kWWWk.........",
    "..kkkk..........",
    "................",
    "................",
]
DRACHENPFEIFE_F = {"k": K, "W": (232, 222, 196), "w": (190, 176, 146), "G": (240, 196, 72), "g": (184, 134, 42)}

# Ein "Z" fuer die Schlafteilchen: weiss mit dunklem Rand, damit man es
# auch vor hellem Himmel sieht.
Z_BILD = [
    "kkkkkkkk",
    "kWWWWWWk",
    "kkkkkWWk",
    "...kWWk.",
    "..kWWk..",
    ".kWWkkkk",
    "kWWWWWWk",
    "kkkkkkkk",
]
STERN_BILD = [
    "...kk...",
    "...kYk..",
    "kkkYYkkk",
    "kYYWYYYk",
    ".kYYYYk.",
    "..kYkYk.",
    ".kYk.kYk",
    ".kk...kk",
]

NAMEN = [
    ("item.fynn:drachenpfeife", "Drachenpfeife", "Dragon Whistle"),
]
NAMEN += [(k + ".name", d, e) for k, d, e in NAMEN if k.startswith("item.")]


def schlaf_z():
    return {"format_version": "1.10.0", "particle_effect": {
        "description": {"identifier": "fynn:schlaf_z", "basic_render_parameters": {
            "material": "particles_alpha", "texture": "textures/particle/fynn_schlaf_z"}},
        "components": {
            "minecraft:emitter_rate_instant": {"num_particles": 1},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {"direction": [0.3, 1, 0.1]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": 2.2},
            "minecraft:particle_initial_speed": 0.8,
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0.15, 0.1, 0], "linear_drag_coefficient": 0.4},
            "minecraft:particle_appearance_billboard": {
                "size": ["0.15 + variable.particle_age * 0.15", "0.15 + variable.particle_age * 0.15"],
                "facing_camera_mode": "lookat_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}},
            "minecraft:particle_appearance_tinting": {"color": {
                "interpolant": "variable.particle_age / variable.particle_lifetime",
                "gradient": {"0.0": "#FFFFFFFF", "0.7": "#FFFFFFFF", "1.0": "#00FFFFFF"}}},
        }}}


def benommen():
    return {"format_version": "1.10.0", "particle_effect": {
        "description": {"identifier": "fynn:benommen", "basic_render_parameters": {
            "material": "particles_alpha", "texture": "textures/particle/fynn_stern"}},
        "components": {
            "minecraft:emitter_rate_instant": {"num_particles": 3},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_disc": {"radius": 0.9, "plane_normal": "y", "surface_only": True,
                                             "direction": [0, 0.1, 0]},
            "minecraft:particle_initial_speed": 0.2,
            "minecraft:particle_lifetime_expression": {"max_lifetime": 1.0},
            # Die Sterne kreisen: Die Geschwindigkeit dreht sich um die Hochachse.
            "minecraft:particle_motion_parametric": {"relative_position": [
                "math.cos(variable.particle_age * 360 + variable.particle_random_1 * 360) * 0.9",
                "math.sin(variable.particle_age * 720) * 0.1",
                "math.sin(variable.particle_age * 360 + variable.particle_random_1 * 360) * 0.9"]},
            "minecraft:particle_appearance_billboard": {
                "size": [0.16, 0.16], "facing_camera_mode": "lookat_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}},
        }}}


def teilchenbild(muster, farben):
    from PIL import Image
    bild = Image.new("RGBA", (8, 8), (0, 0, 0, 0))
    for y, zeile in enumerate(muster):
        for x, z in enumerate(zeile):
            if z in farben:
                bild.putpixel((x, y), farben[z] + (255,))
    return bild


def bilder():
    return {"drachenpfeife": rbb.male(DRACHENPFEIFE, DRACHENPFEIFE_F)}


def main():
    bk.schreibe(VER / "items" / "drachenpfeife.json",
                gegenstand("drachenpfeife", {"minecraft:max_stack_size": 1,
                                             "minecraft:use_modifiers": {"use_duration": 0.05},
                                             "minecraft:cooldown": {"category": "fynn:drachenpfeife", "duration": 1.0}},
                           "equipment", JAGDFACH))
    bk.schreibe(VER / "recipes" / "drachenpfeife.json",
                geformt("drachenpfeife", ["  G", " K ", "F  "],
                        {"G": "minecraft:gold_ingot", "K": "minecraft:bone", "F": "minecraft:string"},
                        "fynn:drachenpfeife"))
    bk.schreibe(RES / "particles" / "schlaf_z.particle.json", schlaf_z())
    bk.schreibe(RES / "particles" / "benommen.particle.json", benommen())
    ordner = RES / "textures" / "particle"
    ordner.mkdir(parents=True, exist_ok=True)
    teilchenbild(Z_BILD, {"k": (40, 44, 70), "W": (245, 248, 255)}).save(ordner / "fynn_schlaf_z.png")
    teilchenbild(STERN_BILD, {"k": (90, 60, 10), "Y": (255, 214, 60), "W": (255, 250, 210)}).save(ordner / "fynn_stern.png")
    bk.item_bilder(bilder())
    bk.sprache("Drachen", NAMEN)
    print("gebaut: Drachenpfeife, Schlaf-Z, Benommen-Sterne")
    if "--bilder" in sys.argv:
        from PIL import Image
        ziel = Path(sys.argv[sys.argv.index("--bilder") + 1])
        g = Image.new("RGBA", (300, 110), (198, 198, 198, 255))
        g.alpha_composite(bilder()["drachenpfeife"].resize((96, 96), Image.NEAREST), (7, 7))
        g.alpha_composite(teilchenbild(Z_BILD, {"k": (40, 44, 70), "W": (245, 248, 255)}).resize((80, 80), Image.NEAREST), (115, 15))
        g.alpha_composite(teilchenbild(STERN_BILD, {"k": (90, 60, 10), "Y": (255, 214, 60), "W": (255, 250, 210)})
                          .resize((80, 80), Image.NEAREST), (210, 15))
        g.save(ziel / "drachen_gegenstaende.png")
        print("gezeichnet:", ziel / "drachen_gegenstaende.png")


if __name__ == "__main__":
    main()
