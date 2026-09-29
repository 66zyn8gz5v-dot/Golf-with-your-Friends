#!/usr/bin/env python3
"""Die Beute der Fantasy-Wesen (4.78): Glutstaub, Glutflasche (mit ihrem
Wurfgeschoss), Sturmfluegel, Frostpanzer, Frosttalisman, Basiliskenauge -
dazu der Steinstaub, wenn jemand versteinert.

Die Wesen baut tiere_bauen.py (Steckbriefe in fantasy_daten.py), was die
Gegenstaende tun, steht in scripts/fantasy.js.

    python3 werkzeuge/fantasy_bauen.py [--bilder ordner]
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

GLUTSTAUB = [
    "................",
    "................",
    "................",
    "................",
    ".......kk.......",
    "......kYk.......",
    ".....kYOk..k....",
    "....kOYOOkkYk...",
    "...kOOYYOOYOOk..",
    "..kOrOOYOOOrOk..",
    "..kOrrOOOOrrOOk.",
    ".kOrrrrOOrrrrOk.",
    ".kkkkkkkkkkkkkk.",
    "................",
    "................",
    "................",
]
GLUTSTAUB_F = {"k": K, "Y": (255, 230, 110), "O": (255, 150, 40), "r": (200, 70, 20)}

GLUTFLASCHE = [
    "................",
    "......kkkk......",
    "......kbbk......",
    ".......kk.......",
    "......kwwk......",
    ".....kwOOwk.....",
    "....kwOYYOwk....",
    "....kOYWWYOk....",
    "....kOYWWYOk....",
    "....kOOYYOOk....",
    "....krOOOOrk....",
    "....krrOOrrk....",
    ".....krrrrk.....",
    "......kkkk......",
    "................",
    "................",
]
GLUTFLASCHE_F = {"k": K, "b": (120, 84, 50), "w": (206, 232, 236), "O": (255, 150, 40), "Y": (255, 220, 90),
                 "W": (255, 250, 220), "r": (190, 60, 20)}

STURMFLUEGEL = [
    "................",
    "..............kk",
    "............kkck",
    "..........kkcwck",
    "........kkcwwcdk",
    "......kkcwwcwwck",
    ".....kcwwcwwcwk.",
    "....kcwwcYwcwwk.",
    "...kcwcwwYwwck..",
    "..kcwwcwYwwck...",
    ".kcwwcwYYcwk....",
    ".kcwcwwwYck.....",
    "kkcwwcwwck......",
    "kbbcccckk.......",
    "kkkkkkk.........",
    "................",
]
STURMFLUEGEL_F = {"k": K, "c": (80, 170, 210), "w": (210, 245, 255), "Y": (140, 245, 255), "d": (30, 40, 60),
                  "b": (30, 90, 140)}

FROSTPANZER = [
    "................",
    "................",
    ".....kkkkkk.....",
    "...kkHHWHHHkk...",
    "..kHHWHHHHWHHk..",
    "..kHWHHPPHHHHk..",
    ".kHHHHPPPPHHHHk.",
    ".kHHWHPPPPHWHHk.",
    ".kHHHHHPPHHHHHk.",
    ".kPHHHHHHHHHHPk.",
    "..kPHHWHHHHHPk..",
    "..kkPPHHHHPPkk..",
    "....kkPPPPkk....",
    "......kkkk......",
    "................",
    "................",
]
FROSTPANZER_F = {"k": K, "H": (140, 200, 232), "W": (235, 250, 255), "P": (90, 150, 200)}

FROSTTALISMAN = [
    "....ssssssss....",
    "...s........s...",
    "..s..........s..",
    "..s..........s..",
    "...s...kk...s...",
    "....s.kWWk.s....",
    ".....kgWCgk.....",
    "....kgCWWCgk....",
    "...kgCWCCWCgk...",
    "...kgCCWWCCgk...",
    "....kgCWWCgk....",
    ".....kgCCgk.....",
    "......kggk......",
    ".......kk.......",
    "................",
    "................",
]
FROSTTALISMAN_F = {"k": K, "s": (170, 170, 180), "g": (200, 205, 215), "C": (120, 210, 245),
                   "W": (240, 252, 255)}

BASILISKENAUGE = [
    "................",
    "................",
    ".....kkkkkk.....",
    "...kkoooooookk..",
    "..koyyyyyyyyyok.",
    ".koyyYYYkYYYyyok",
    ".koyYYYYkYYYYyok",
    "koyyYYYkkkYYYyyo",
    ".koyYYYYkYYYYyok",
    ".koyyYYYkYYYyyok",
    "..koyyyyyyyyyok.",
    "...kkoooooookk..",
    ".....kkkkkk.....",
    "................",
    "................",
    "................",
]
BASILISKENAUGE_F = {"k": K, "o": (130, 70, 20), "y": (230, 170, 30), "Y": (255, 220, 60)}

# --- Sandwurm (4.79)
WURMZAHN = [
    "................",
    "................",
    "..kkk...........",
    "..kWWkk.........",
    "...kWWWkk.......",
    "...kWWWWWkk.....",
    "....kWWWWWWkk...",
    "....kWWWWWWWWk..",
    ".....kWWWWWWSk..",
    ".....kWWWWWSSk..",
    "......kWWWSSk...",
    ".......kSSSSk...",
    "........kkkk....",
    "................",
    "................",
    "................",
]
WURMZAHN_F = {"k": K, "W": (238, 230, 210), "S": (190, 170, 130)}

SANDPERLE = [
    "................",
    "................",
    "................",
    "......kkkk......",
    ".....kHHHHk.....",
    "....kHWWHHHk....",
    "...kHWWHHHHGk...",
    "...kHWHHHHHGk...",
    "...kHHHHHHGGk...",
    "...kHHHHHGGGk...",
    "....kHHHGGGk....",
    ".....kGGGGk.....",
    "......kkkk......",
    "................",
    "................",
    "................",
]
SANDPERLE_F = {"k": K, "H": (236, 214, 150), "W": (255, 250, 230), "G": (196, 160, 90)}

SANDKLOPFER = [
    "................",
    "....kkkkkkkk....",
    "...kLLLLLLLLk...",
    "...kIIIIIIIIk...",
    "...kLLLLLLLLk...",
    "...kLzLLLLzLk...",
    "....kkkIIkkk....",
    "......kIIk......",
    "......kSSk......",
    "......kSSk......",
    "......kSSk......",
    "......kSSk......",
    "......kSSk......",
    ".......kk.......",
    "................",
    "................",
]
SANDKLOPFER_F = {"k": K, "L": (150, 100, 60), "I": (200, 200, 205), "z": (238, 230, 210), "S": (120, 84, 50)}


# --- Lindwurm (4.80)
DRACHENSCHUPPE = [
    "................",
    "................",
    "......kkkk......",
    ".....kRRRRk.....",
    "....kRrRRrRk....",
    "...kRrRRRRrRk...",
    "...kRRRRRRRRk...",
    "...kRrRRRRrRk...",
    "...kRRrRRrRRk...",
    "...kGRRRRRRGk...",
    "....kGRRRRGk....",
    ".....kGGGGk.....",
    "......kGGk......",
    ".......kk.......",
    "................",
    "................",
]
DRACHENSCHUPPE_F = {"k": K, "R": (150, 44, 36), "r": (200, 80, 60), "G": (216, 176, 80)}


def drachenfeuer():
    """Der Feueratem des Lindwurms: ein Kegel aus Flammen."""
    return {"format_version": "1.10.0", "particle_effect": {
        "description": {"identifier": "fynn:drachenfeuer", "basic_render_parameters": {
            "material": "particles_blend", "texture": "textures/particle/fynn_rauch"}},
        "components": {
            "minecraft:emitter_rate_steady": {"spawn_rate": 90, "max_particles": 120},
            "minecraft:emitter_lifetime_once": {"active_time": 0.4},
            "minecraft:emitter_shape_point": {"direction": [
                "variable.fynn_x + (variable.particle_random_1 - 0.5) * 0.35",
                "variable.fynn_y + (variable.particle_random_2 - 0.5) * 0.35",
                "variable.fynn_z + (variable.particle_random_3 - 0.5) * 0.35"]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "0.7 + variable.particle_random_4 * 0.4"},
            "minecraft:particle_initial_speed": 14.0,
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 1.5, 0], "linear_drag_coefficient": 2.2},
            "minecraft:particle_appearance_billboard": {
                "size": ["0.25 + variable.particle_age * 1.6", "0.25 + variable.particle_age * 1.6"],
                "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}},
            "minecraft:particle_appearance_lighting": {},
            "minecraft:particle_appearance_tinting": {"color": {
                "interpolant": "variable.particle_age / variable.particle_lifetime",
                "gradient": {"0.0": "#FFFFF0A0", "0.3": "#FFFF9A2A", "0.7": "#CCD2401A", "1.0": "#00401A10"}}},
        }}}


def sandstaub():
    """Aufwirbelnder Sand, wo der Wurm unter dem Boden zieht."""
    return {"format_version": "1.10.0", "particle_effect": {
        "description": {"identifier": "fynn:sandstaub", "basic_render_parameters": {
            "material": "particles_alpha", "texture": "textures/particle/walfontaene"}},
        "components": {
            "minecraft:emitter_rate_instant": {"num_particles": 24},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_disc": {"radius": 1.4, "plane_normal": "y",
                                             "direction": ["(variable.particle_random_1 - 0.5) * 0.8", 1.0,
                                                           "(variable.particle_random_2 - 0.5) * 0.8"]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "0.7 + variable.particle_random_3 * 0.6"},
            "minecraft:particle_initial_speed": "1.5 + variable.particle_random_3 * 3.0",
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -10, 0], "linear_drag_coefficient": 0.6},
            "minecraft:particle_appearance_billboard": {
                "size": ["0.08 + variable.particle_random_4 * 0.1", "0.08 + variable.particle_random_4 * 0.1"],
                "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}},
            "minecraft:particle_appearance_tinting": {"color": [
                "0.82 + variable.particle_random_4 * 0.1", "0.72 + variable.particle_random_4 * 0.1", 0.5, 1.0]},
        }}}


NAMEN = [
    ("item.fynn:wurmzahn", "Wurmzahn", "Sandworm Tooth"),
    ("item.fynn:sandperle", "Sandperle", "Sand Pearl"),
    ("item.fynn:sandklopfer", "Sandklopfer", "Sand Thumper"),
    ("item.fynn:drachenschuppe", "Drachenschuppe", "Dragon Scale"),
    ("item.fynn:glutstaub", "Glutstaub", "Ember Dust"),
    ("item.fynn:glutflasche", "Glutflasche", "Ember Bottle"),
    ("item.fynn:sturmfluegel", "Sturmflügel", "Storm Wing"),
    ("item.fynn:frostpanzer", "Frostpanzer", "Frost Carapace"),
    ("item.fynn:frosttalisman", "Frosttalisman", "Frost Talisman"),
    ("item.fynn:basiliskenauge", "Basiliskenauge", "Basilisk Eye"),
    ("entity.fynn:glutflasche_wurf.name", "Glutflasche", "Ember Bottle"),
    ("action.interact.fynn_fangen", "Einfangen", "Catch"),
]
NAMEN += [(k + ".name", d, e) for k, d, e in NAMEN if k.startswith("item.")]


def bilder():
    return {"glutstaub": rbb.male(GLUTSTAUB, GLUTSTAUB_F), "glutflasche": rbb.male(GLUTFLASCHE, GLUTFLASCHE_F),
            "sturmfluegel": rbb.male(STURMFLUEGEL, STURMFLUEGEL_F),
            "frostpanzer": rbb.male(FROSTPANZER, FROSTPANZER_F),
            "frosttalisman": rbb.male(FROSTTALISMAN, FROSTTALISMAN_F),
            "basiliskenauge": rbb.male(BASILISKENAUGE, BASILISKENAUGE_F),
            "wurmzahn": rbb.male(WURMZAHN, WURMZAHN_F), "sandperle": rbb.male(SANDPERLE, SANDPERLE_F),
            "sandklopfer": rbb.male(SANDKLOPFER, SANDKLOPFER_F),
            "drachenschuppe": rbb.male(DRACHENSCHUPPE, DRACHENSCHUPPE_F)}


def steinstaub():
    """Graue Brocken, wenn jemand zu Stein erstarrt."""
    return {"format_version": "1.10.0", "particle_effect": {
        "description": {"identifier": "fynn:steinstaub", "basic_render_parameters": {
            "material": "particles_alpha", "texture": "textures/particle/walfontaene"}},
        "components": {
            "minecraft:emitter_rate_instant": {"num_particles": 30},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_box": {"half_dimensions": [0.35, 0.9, 0.35], "direction": "outwards"},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "0.8 + variable.particle_random_1 * 0.6"},
            "minecraft:particle_initial_speed": "1.0 + variable.particle_random_2 * 2.0",
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -9, 0], "linear_drag_coefficient": 0.5},
            "minecraft:particle_appearance_billboard": {
                "size": ["0.08 + variable.particle_random_3 * 0.1", "0.08 + variable.particle_random_3 * 0.1"],
                "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}},
            "minecraft:particle_appearance_tinting": {"color": [
                "0.45 + variable.particle_random_4 * 0.2", "0.45 + variable.particle_random_4 * 0.2",
                "0.47 + variable.particle_random_4 * 0.2", 1.0]},
        }}}


def main():
    bk.schreibe(VER / "items" / "glutstaub.json",
                gegenstand("glutstaub", {"minecraft:max_stack_size": 64}, "items", BEUTEFACH))
    # Die Glutflasche wirft man - sie zerspringt in Flammen.
    bk.schreibe(VER / "items" / "glutflasche.json", gegenstand("glutflasche", {
        "minecraft:max_stack_size": 16,
        "minecraft:throwable": {"do_swing_animation": True, "launch_power_scale": 1.0, "max_launch_power": 1.0},
        "minecraft:projectile": {"projectile_entity": "fynn:glutflasche_wurf"},
    }, "equipment", JAGDFACH))
    bk.schreibe(VER / "entities" / "glutflasche_wurf.json", geschoss("glutflasche_wurf", 3, {
        "catch_fire": {"fire_affected_by_griefing": True}}))
    bk.schreibe(RES / "entity" / "glutflasche_wurf.entity.json",
                sprite_aussehen("glutflasche_wurf", "textures/items/glutflasche"))
    # Der Sturmfluegel haelt sechzehn Schuebe, dann ist er verbraucht.
    bk.schreibe(VER / "items" / "sturmfluegel.json", gegenstand("sturmfluegel", {
        "minecraft:max_stack_size": 1,
        "minecraft:durability": {"max_durability": 16},
        "minecraft:use_modifiers": {"use_duration": 0.05},
        "minecraft:cooldown": {"category": "fynn:sturmfluegel", "duration": 1.0},
    }, "equipment", JAGDFACH))
    bk.schreibe(VER / "items" / "frostpanzer.json",
                gegenstand("frostpanzer", {"minecraft:max_stack_size": 64}, "items", BEUTEFACH))
    bk.schreibe(VER / "items" / "frosttalisman.json",
                gegenstand("frosttalisman", {"minecraft:max_stack_size": 1, "minecraft:glint": True},
                           "equipment", JAGDFACH))
    bk.schreibe(VER / "items" / "basiliskenauge.json", gegenstand("basiliskenauge", {
        "minecraft:max_stack_size": 1, "minecraft:glint": True,
        "minecraft:use_modifiers": {"use_duration": 0.05},
        "minecraft:cooldown": {"category": "fynn:basiliskenauge", "duration": 15.0},
    }, "equipment", JAGDFACH))
    # Zwei Glutstaub ergeben Lohenstaub - Brauen ohne Netherfestung.
    bk.schreibe(VER / "recipes" / "glutstaub_lohenstaub.json",
                formlos("glutstaub_lohenstaub", ["fynn:glutstaub", "fynn:glutstaub"], "minecraft:blaze_powder"))
    bk.schreibe(VER / "recipes" / "frosttalisman.json",
                geformt("frosttalisman", [" p ", "pDp", " p "],
                        {"p": "fynn:frostpanzer", "D": "minecraft:diamond"}, "fynn:frosttalisman"))
    bk.schreibe(RES / "particles" / "steinstaub.particle.json", steinstaub())
    # Sandwurm (4.79): Zahn, Perle, und der Klopfer, der Wuermer anlockt.
    bk.schreibe(VER / "items" / "wurmzahn.json",
                gegenstand("wurmzahn", {"minecraft:max_stack_size": 64}, "items", BEUTEFACH))
    bk.schreibe(VER / "items" / "sandperle.json",
                gegenstand("sandperle", {"minecraft:max_stack_size": 1, "minecraft:glint": True},
                           "equipment", JAGDFACH))
    bk.schreibe(VER / "items" / "sandklopfer.json", gegenstand("sandklopfer", {
        "minecraft:max_stack_size": 16, "minecraft:use_modifiers": {"use_duration": 0.05},
        "minecraft:cooldown": {"category": "fynn:sandklopfer", "duration": 2.0},
    }, "equipment", JAGDFACH))
    bk.schreibe(VER / "recipes" / "sandklopfer.json",
                geformt("sandklopfer", ["zLz", "ISI", " S "],
                        {"z": "fynn:wurmzahn", "L": "minecraft:leather", "I": "minecraft:iron_ingot",
                         "S": "minecraft:stick"}, "fynn:sandklopfer"))
    bk.schreibe(RES / "particles" / "sandstaub.particle.json", sandstaub())
    # Lindwurm (4.80): die Schuppe (daraus die Ruestung, ruestungen_bauen.py)
    # und sein Feueratem.
    bk.schreibe(VER / "items" / "drachenschuppe.json", gegenstand("drachenschuppe", {
        "minecraft:max_stack_size": 64, "minecraft:rarity": "rare"}, "items", BEUTEFACH))
    bk.schreibe(RES / "particles" / "drachenfeuer.particle.json", drachenfeuer())
    bk.item_bilder(bilder())
    bk.sprache("Fantasy-Wesen", NAMEN)
    print("gebaut: Glutstaub, Glutflasche, Sturmflügel, Frostpanzer, Frosttalisman, Basiliskenauge, "
          "Wurmzahn, Sandperle, Sandklopfer, Drachenschuppe")
    if "--bilder" in sys.argv:
        from PIL import Image
        ordner = Path(sys.argv[sys.argv.index("--bilder") + 1])
        b = list(bilder().values())
        gesamt = Image.new("RGBA", (len(b) * 180, 180), (198, 198, 198, 255))
        for i, bild in enumerate(b):
            gesamt.alpha_composite(bild.resize((144, 144), Image.NEAREST), (18 + i * 180, 18))
        gesamt.save(ordner / "fantasy_gegenstaende.png")
        print("gezeichnet:", ordner / "fantasy_gegenstaende.png")


if __name__ == "__main__":
    main()
