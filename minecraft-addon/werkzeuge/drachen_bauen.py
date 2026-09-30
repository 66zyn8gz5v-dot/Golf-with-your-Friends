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
from neue_waffen_bauen import geschoss, sprite_aussehen              # noqa: E402

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

# Der Eissplitter des Frostwyverns (4.91): ein spitzer Kristall.
EISSPLITTER = [
    "................",
    "................",
    "............kk..",
    "...........kWk..",
    "..........kWCk..",
    ".........kWCk...",
    "........kWCk....",
    ".......kWCk.....",
    "......kCCk......",
    ".....kCBk.......",
    "....kCBk........",
    "...kBBk.........",
    "..kBkk..........",
    "..kk............",
    "................",
    "................",
]
EISSPLITTER_F = {"k": (30, 70, 110), "W": (250, 254, 255), "C": (170, 226, 250), "B": (90, 160, 214)}

NAMEN = [
    ("item.fynn:drachenpfeife", "Drachenpfeife", "Dragon Whistle"),
    ("entity.fynn:eissplitter.name", "Eissplitter", "Ice Shard"),
    ("entity.fynn:plasmaschuss.name", "Plasmaschuss", "Plasma Blast"),
]
NAMEN += [(k + ".name", d, e) for k, d, e in NAMEN if k.startswith("item.")]


# Die Atemarten der Drachen: dasselbe Strahlbild wie das Drachenfeuer
# (fantasy_bauen.drachenfeuer), nur in ihren Farben.
ATEMFARBEN = {
    "frostatem": {"0.0": "#FFFFFFFF", "0.2": "#FFE4F8FF", "0.5": "#E0A8DCF8", "0.8": "#A07AB4E6", "1.0": "#00C8E0F0"},
    "sturmatem": {"0.0": "#FFFFFFFF", "0.15": "#FFE8F0FF", "0.4": "#D0B8C8FF", "0.7": "#8098A8E8", "1.0": "#00C0C8E0"},
    "giftatem": {"0.0": "#FFE8FFB0", "0.2": "#FFB8F050", "0.5": "#E080C830", "0.8": "#A0507A28", "1.0": "#00384A20"},
    # Der Schattenatem der Nachtschwinge (4.96): violett, dann schwarz.
    "schattenatem": {"0.0": "#FFE8C8FF", "0.2": "#FFA060F0", "0.5": "#E04A1A8A", "0.8": "#A01A0A2A", "1.0": "#00000000"},
}

# Der Plasmaschuss (4.96): eine violett gluehende Kugel.
PLASMASCHUSS = [
    "................",
    "................",
    "................",
    "................",
    "......kkkk......",
    ".....kPPPPk.....",
    "....kPWWppPk....",
    "....kPWppppk....",
    "....kPppppPk....",
    "....kPpppPPk....",
    ".....kPPPPk.....",
    "......kkkk......",
    "................",
    "................",
    "................",
    "................",
]
PLASMASCHUSS_F = {"k": (60, 20, 110), "P": (160, 90, 255), "p": (210, 170, 255), "W": (255, 250, 255)}


def plasmaknall():
    """Der Knall des Plasmaschusses: violette Funken nach allen Seiten."""
    t = funken()
    t["particle_effect"]["description"]["identifier"] = "fynn:plasmaknall"
    k = t["particle_effect"]["components"]
    k["minecraft:emitter_rate_instant"] = {"num_particles": 60}
    k["minecraft:emitter_shape_sphere"] = {"radius": 0.4, "direction": "outwards"}
    del k["minecraft:emitter_shape_point"]
    k["minecraft:particle_initial_speed"] = "6.0 + variable.particle_random_1 * 6.0"
    k["minecraft:particle_motion_dynamic"] = {"linear_drag_coefficient": 2.5}
    k["minecraft:particle_appearance_billboard"]["size"] = [0.14, 0.14]
    k["minecraft:particle_appearance_tinting"]["color"]["gradient"] = {
        "0.0": "#FFFFFFFF", "0.3": "#FFC08CFF", "1.0": "#006A2AC8"}
    return t


def atem_teilchen(name, verlauf):
    import fantasy_bauen as fb
    t = fb.drachenfeuer()
    t["particle_effect"]["description"]["identifier"] = f"fynn:{name}"
    t["particle_effect"]["components"]["minecraft:particle_appearance_tinting"]["color"]["gradient"] = verlauf
    return t


def giftwolke():
    """Eine liegende Giftwolke: dicke gruene Schwaden, die langsam wabern
    und steigen. Das Skript stoesst sie jede Sekunde neu aus, solange die
    Wolke liegt."""
    return {"format_version": "1.10.0", "particle_effect": {
        "description": {"identifier": "fynn:giftwolke", "basic_render_parameters": {
            "material": "particles_blend", "texture": "textures/particle/fynn_rauch"}},
        "components": {
            "minecraft:emitter_rate_instant": {"num_particles": 18},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_sphere": {"radius": 2.6, "direction": "outwards"},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "1.4 + variable.particle_random_1 * 0.6"},
            "minecraft:particle_initial_speed": 0.15,
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, 0.25, 0], "linear_drag_coefficient": 0.8},
            "minecraft:particle_appearance_billboard": {
                "size": ["0.6 + variable.particle_age * 0.6", "0.6 + variable.particle_age * 0.6"],
                "facing_camera_mode": "rotate_xyz",
                "uv": {"texture_width": 8, "texture_height": 8, "uv": [0, 0], "uv_size": [8, 8]}},
            "minecraft:particle_appearance_tinting": {"color": {
                "interpolant": "variable.particle_age / variable.particle_lifetime",
                "gradient": {"0.0": "#0098D040", "0.3": "#A088C034", "0.8": "#7060902C", "1.0": "#00405020"}}},
        }}}


def funken():
    """Der Funkenschwall des rechten Kopfes: kurze, helle Funken, die im
    Bogen fliegen und schnell verglimmen."""
    return {"format_version": "1.10.0", "particle_effect": {
        "description": {"identifier": "fynn:funken", "basic_render_parameters": {
            "material": "particles_add", "texture": "textures/particle/particles"}},
        "components": {
            "minecraft:emitter_rate_instant": {"num_particles": 40},
            "minecraft:emitter_lifetime_once": {"active_time": 0.05},
            "minecraft:emitter_shape_point": {"direction": [
                "variable.fynn_x + (variable.particle_random_1 - 0.5) * 0.3",
                "variable.fynn_y + (variable.particle_random_2 - 0.5) * 0.3",
                "variable.fynn_z + (variable.particle_random_3 - 0.5) * 0.3"]},
            "minecraft:particle_lifetime_expression": {"max_lifetime": "0.5 + variable.particle_random_4 * 0.4"},
            "minecraft:particle_initial_speed": "14.0 + variable.particle_random_1 * 8.0",
            "minecraft:particle_motion_dynamic": {"linear_acceleration": [0, -9.0, 0], "linear_drag_coefficient": 1.5},
            "minecraft:particle_appearance_billboard": {
                "size": [0.08, 0.08], "facing_camera_mode": "lookat_xyz",
                "uv": {"texture_width": 128, "texture_height": 128, "uv": [0, 24], "uv_size": [8, 8]}},
            "minecraft:particle_appearance_tinting": {"color": {
                "interpolant": "variable.particle_age / variable.particle_lifetime",
                "gradient": {"0.0": "#FFFFFFD0", "0.4": "#FFFFC040", "1.0": "#00FF6010"}}},
        }}}


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
    return {"drachenpfeife": rbb.male(DRACHENPFEIFE, DRACHENPFEIFE_F),
            "eissplitter": rbb.male(EISSPLITTER, EISSPLITTER_F),
            "plasmaschuss": rbb.male(PLASMASCHUSS, PLASMASCHUSS_F)}


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
    bk.schreibe(RES / "particles" / "giftwolke.particle.json", giftwolke())
    bk.schreibe(RES / "particles" / "funken.particle.json", funken())
    for name, verlauf in ATEMFARBEN.items():
        bk.schreibe(RES / "particles" / f"{name}.particle.json", atem_teilchen(name, verlauf))
    # Eissplitter: fliegt wie ein Schneeball, trifft hart und verlangsamt.
    bk.schreibe(VER / "entities" / "eissplitter.json", geschoss("eissplitter", 5, {
        "mob_effect": {"effect": "slowness", "durationeasy": 100, "durationnormal": 120, "durationhard": 160,
                       "amplifier": 2}}))
    bk.schreibe(RES / "entity" / "eissplitter.entity.json",
                sprite_aussehen("eissplitter", "textures/items/eissplitter", "1.4"))
    bk.schreibe(RES / "particles" / "benommen.particle.json", benommen())
    # Der Plasmaschuss (Nachtschwinge): schnell, kaum Fall, explodiert beim
    # Aufprall (das macht scripts/drachen.js).
    plasma = geschoss("plasmaschuss", 6)
    plasma["minecraft:entity"]["components"]["minecraft:projectile"].update({"gravity": 0.005, "power": 2.4})
    bk.schreibe(VER / "entities" / "plasmaschuss.json", plasma)
    bk.schreibe(RES / "entity" / "plasmaschuss.entity.json",
                sprite_aussehen("plasmaschuss", "textures/items/plasmaschuss", "1.8"))
    bk.schreibe(RES / "particles" / "plasmaknall.particle.json", plasmaknall())
    ordner = RES / "textures" / "particle"
    ordner.mkdir(parents=True, exist_ok=True)
    teilchenbild(Z_BILD, {"k": (40, 44, 70), "W": (245, 248, 255)}).save(ordner / "fynn_schlaf_z.png")
    teilchenbild(STERN_BILD, {"k": (90, 60, 10), "Y": (255, 214, 60), "W": (255, 250, 210)}).save(ordner / "fynn_stern.png")
    bk.item_bilder(bilder())
    bk.sprache("Drachen", NAMEN)
    print("gebaut: Drachenpfeife, Schlaf-Z, Benommen-Sterne, Atemarten, Giftwolke, Funken, Eissplitter, Plasmaschuss")
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
