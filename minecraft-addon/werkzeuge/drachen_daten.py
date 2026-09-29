#!/usr/bin/env python3
"""Die Drachen (ab 4.89) - Steckbriefe, Verhalten und Bewegungen.

Jeder Drache kann zwei Dinge, die Mojangs Phantom nicht kann: landen und
laufen. Er hat deshalb zwei Zustaende als Komponentengruppen:

* fynn:luft  - gleitet ohne Schwerkraft, kreist und stoesst herab
               (wie das Phantom);
* fynn:boden - laeuft auf seinen Beinen, mit Schwerkraft.

Wann er landet und wann er wieder abhebt, entscheidet scripts/drachen.js;
dort steht auch der Atem. Die Eigenschaft fynn:fliegt sagt den
Bewegungen, welcher Zustand gerade gilt.

Die Bewegungen sind so gebaut, dass sie sich addieren: Feueratem und
Bruellen legen sich ueber Flug oder Gang.
"""

from kleintiere_daten import familie, SPIELER, LT, eigenschaft

FLIEGT = "query.property('fynn:fliegt')"
FEUER = "query.property('fynn:feuer')"
LAEUFT = "math.clamp(query.modified_move_speed * 4.0, 0.0, 1.0)"


def gegen(ausdruck):
    """Das Spiegelbild eines Winkels fuer die rechte Seite."""
    if isinstance(ausdruck, (int, float)):
        return -ausdruck
    return f"-({ausdruck})"


def beidseitig(knochen, links):
    """links: {Knochenname ohne Seite: [x, y, z]} - rechts gespiegelt (y und
    z umgekehrt)."""
    for name, (x, y, z) in links.items():
        knochen[f"{name}_links"] = {"rotation": [x, y, z]}
        knochen[f"{name}_rechts"] = {"rotation": [x, gegen(y), gegen(z)]}
    return knochen


# ------------------------------------------------------------ Bewegungen

def drachen_bewegungen(hals=4, schwanz=6, tempo=220.0):
    phi = f"{LT} * {tempo}"
    # Kraeftige Schlaege, dazwischen gleitet er: Dann stehen die Schwingen
    # weit, nur leicht angehoben, und schlagen kaum.
    schlagen = f"(0.3 + 0.7 * math.clamp(math.sin({LT} * 28.0) * 2.0 + 0.6, 0.0, 1.0))"
    flug = {}
    beidseitig(flug, {
        # Die Schulter schlaegt; der Unterarm kommt einen Takt spaeter nach,
        # und beim Heben falten sich Unterarm und Finger ein Stueck ein - so
        # schiebt der Schlag nach unten Luft und der nach oben nicht.
        "fluegel": [0.0, f"-math.max(0.0, math.cos({phi})) * 8.0 * {schlagen}",
                    f"-6.0 - math.sin({phi}) * 40.0 * {schlagen}"],
        "unterarm": [0.0, f"math.max(0.0, math.cos({phi})) * 14.0 * {schlagen}",
                     f"-math.sin({phi} - 50.0) * 20.0 * {schlagen}"],
        "hand": [0.0, 0.0, f"-math.sin({phi} - 90.0) * 12.0 * {schlagen}"],
        "finger2": [0.0, f"-math.max(0.0, -math.sin({phi})) * 6.0", 0.0],
        "finger3": [0.0, f"-math.max(0.0, -math.sin({phi})) * 10.0", 0.0],
        # Im Flug: Hinterbeine nach hinten gestreckt, Vorderbeine angezogen.
        "bein_hinten": [55.0, 0.0, 0.0], "unterbein_hinten": [25.0, 0.0, 0.0], "fuss_hinten": [45.0, 0.0, 0.0],
        "bein_vorn": [40.0, 0.0, 0.0], "unterbein_vorn": [-70.0, 0.0, 0.0], "fuss_vorn": [40.0, 0.0, 0.0],
    })
    flug["rumpf"] = {"rotation": ["-query.target_x_rotation * 0.4", 0.0, "variable.fynn_dreh * 2.5"],
                     "position": [0.0, f"-math.sin({phi} - 30.0) * 1.4 * {schlagen}", 0.0]}
    for i in range(1, hals + 1):
        # Der Hals schwingt im S, jedes Glied einen Takt spaeter.
        flug[f"hals{i}"] = {"rotation": [f"-3.0 + math.sin({LT} * 60.0 - {i * 30}) * 3.0",
                                         f"math.sin({LT} * 45.0 - {i * 35}) * 5.0", 0.0]}
    flug["kopf"] = {"rotation": [f"math.sin({LT} * 60.0 - {hals * 30 + 30}) * 4.0",
                                 f"-math.sin({LT} * 45.0) * 8.0 - variable.fynn_dreh * 2.0", 0.0]}
    for i in range(1, schwanz + 1):
        flug[f"schwanz{i}"] = {"rotation": [f"math.sin({LT} * 70.0 - {i * 40}) * 3.0",
                                            f"math.sin({LT} * 55.0 - {i * 40}) * {3 + i * 1.5} - variable.fynn_dreh * {i}",
                                            0.0]}

    # Am Boden: Schwingen zusammengefaltet an den Leib gelegt, der Hals
    # aufgerichtet, der Schwanz liegt und pendelt leise.
    stand = {}
    # Die Faltung ist ausgerechnet (Ellbogen hinten, Handgelenk als Buckel
    # ueber der Schulter, die Finger eng am Leib nach hinten) - so liegt die
    # Flughaut zusammengelegt an der Flanke statt wie ein Faecher abzustehen.
    beidseitig(stand, {
        "fluegel": [0.0, -84.0, -60.0],
        "unterarm": [0.0, 146.0, 0.0],
        "hand": [-30.0, -156.0, 0.0],
        "finger1": [0.0, -15.0, 0.0], "finger2": [0.0, 12.0, 0.0], "finger3": [0.0, 38.0, 0.0],
    })
    for i, w in enumerate((-22.0, -12.0, 4.0, 10.0)[:hals]):
        stand[f"hals{i + 1}"] = {"rotation": [f"{w} + math.sin({LT} * 40.0 - {i * 25}) * 1.5", 0.0, 0.0]}
    stand["kopf"] = {"rotation": [f"26.0 + math.sin({LT} * 40.0 - 120.0) * 3.0",
                                  f"math.sin({LT} * 21.0) * 14.0", 0.0]}
    stand["rumpf"] = {"scale": [1.0, f"1.0 + math.sin({LT} * 55.0) * 0.012", 1.0]}
    for i in range(1, schwanz + 1):
        stand[f"schwanz{i}"] = {"rotation": [10.0 if i == 1 else 1.5,
                                             f"math.sin({LT} * 28.0 - {i * 40}) * {2 + i}", 0.0]}

    # Gehen: Kreuzgang wie eine Echse - vorn links mit hinten rechts. Das
    # Knie hebt den Fuss im Vorschwingen, der Leib wiegt sich dagegen.
    w = "query.modified_distance_moved * 22.0"
    gang = {}
    for seite, phase in (("links", 0.0), ("rechts", 180.0)):
        for teil, versatz in (("vorn", 0.0), ("hinten", 180.0)):
            p = f"{w} + {phase + versatz}"
            gang[f"bein_{teil}_{seite}"] = {"rotation": [f"math.sin({p}) * 26.0", 0.0, 0.0]}
            gang[f"unterbein_{teil}_{seite}"] = {"rotation": [
                f"math.max(0.0, -math.cos({p})) * {-28.0 if teil == 'vorn' else 30.0}", 0.0, 0.0]}
            gang[f"fuss_{teil}_{seite}"] = {"rotation": [f"-math.sin({p}) * 14.0", 0.0, 0.0]}
    gang["rumpf"] = {"rotation": [0.0, f"math.sin({w}) * 3.0", f"math.sin({w}) * 2.0"],
                     "position": [0.0, f"math.abs(math.sin({w})) * 0.6", 0.0]}
    for i in range(1, schwanz + 1):
        gang[f"schwanz{i}"] = {"rotation": [0.0, f"-math.sin({w} - {i * 30}) * {3 + i * 1.5}", 0.0]}
    for i in range(1, hals + 1):
        gang[f"hals{i}"] = {"rotation": [f"math.sin({w} * 2.0) * 1.5", f"-math.sin({w}) * 2.0", 0.0]}

    # Feueratem: Hals gestreckt, Kopf nach vorn geneigt, das Maul weit auf.
    # Ein Zittern geht durch den Kopf.
    # Am Boden steht der Hals aufgerichtet; zum Feuern senkt er ihn, damit
    # der Strahl nach vorn geht und nicht in den Himmel.
    boden = f"(1.0 - {FLIEGT})"
    senken = (18.0, 10.0, -2.0, -6.0)
    feuer = {"hals" + str(i): {"rotation": [f"-3.0 + {boden} * {senken[min(i - 1, 3)]}", 0.0, 0.0]}
             for i in range(1, hals + 1)}
    feuer["kopf"] = {"rotation": [f"8.0 - {boden} * 30.0 + math.sin({LT} * 900.0) * 1.5", 0.0, 0.0]}
    feuer["kiefer"] = {"rotation": [f"38.0 + math.sin({LT} * 700.0) * 2.0", 0.0, 0.0]}

    # Bruellen am Boden, alle paar Sekunden: Kopf hoch, Maul auf, die
    # Schwingen halb geoeffnet.
    zeit = f"math.mod({LT}, 17.0)"
    auf = f"math.clamp(math.sin({zeit} / 2.2 * 180.0) * 2.0, 0.0, 1.0)"
    bruellen = {}
    beidseitig(bruellen, {"fluegel": [0.0, f"{auf} * 30.0", f"-{auf} * 30.0"],
                          "unterarm": [0.0, f"-{auf} * 70.0", 0.0],
                          "hand": [0.0, f"{auf} * 60.0", 0.0]})
    bruellen["hals1"] = {"rotation": [f"-{auf} * 12.0", 0.0, 0.0]}
    bruellen["hals2"] = {"rotation": [f"-{auf} * 10.0", 0.0, 0.0]}
    bruellen["kopf"] = {"rotation": [f"-{auf} * 40.0", 0.0, 0.0]}
    bruellen["kiefer"] = {"rotation": [f"{auf} * 35.0", 0.0, 0.0]}

    # Im Sturzflug: Schwingen angelegt, die Krallen voraus.
    stoss = {}
    beidseitig(stoss, {"fluegel": [0.0, -30.0, -12.0], "unterarm": [0.0, 45.0, 0.0], "hand": [0.0, -40.0, 0.0],
                       "bein_vorn": [-60.0, 0.0, 0.0], "unterbein_vorn": [20.0, 0.0, 0.0],
                       "bein_hinten": [-30.0, 0.0, 0.0]})
    stoss["kiefer"] = {"rotation": [22.0, 0.0, 0.0]}

    return {
        "flug": ({"loop": True, "bones": flug}, FLIEGT),
        "stand": ({"loop": True, "bones": stand}, f"(1.0 - {FLIEGT})"),
        "gehen": ({"loop": True, "bones": gang}, f"(1.0 - {FLIEGT}) * {LAEUFT}"),
        "feueratem": ({"loop": True, "bones": feuer}, FEUER),
        "bruellen": ({"loop": True, "bones": bruellen},
                     f"(1.0 - {FLIEGT}) * (1.0 - {LAEUFT}) * (1.0 - {FEUER}) * ({zeit} < 2.2)"),
        "sturzflug": ({"loop": True, "bones": stoss},
                      f"{FLIEGT} * math.clamp(-query.vertical_speed * 0.6 - 0.2, 0.0, 1.0)"),
    }


# ------------------------------------------------------------ Verhalten

def luft_und_boden(tempo_luft, tempo_boden, beute, reichweite=48):
    """Die zwei Zustaende. beute: Familien, die er jagt (neben Spielern)."""
    kein_kreativ = {"test": "has_ability", "subject": "other", "value": "instabuild", "operator": "!="}
    ziele = {"minecraft:behavior.nearest_attackable_target": {
        "priority": 2, "must_see": True, "reselect_targets": True, "within_radius": reichweite,
        "target_search_height": reichweite,
        "entity_types": [{"filters": {"all_of": [SPIELER, kein_kreativ]}, "max_dist": reichweite},
                         {"filters": familie(*beute), "max_dist": 32}]}}
    luft = {
        "minecraft:movement": {"value": tempo_luft},
        "minecraft:movement.glide": {"start_speed": 0.12, "speed_when_turning": 0.2},
        "minecraft:physics": {"has_gravity": False},
        "minecraft:behavior.circle_around_anchor": {
            "priority": 3, "goal_radius": 1.5, "radius_range": {"min": 12.0, "max": 22.0},
            "height_offset_range": {"min": -4, "max": 6}, "height_above_target_range": {"min": 14, "max": 26}},
        "minecraft:behavior.swoop_attack": {"priority": 2, "damage_reach": 0.6, "speed_multiplier": 1.0,
                                            "delay_range": {"min": 10.0, "max": 20.0}},
    }
    luft.update(ziele)
    boden = {
        "minecraft:movement": {"value": tempo_boden},
        "minecraft:movement.basic": {},
        "minecraft:navigation.walk": {"can_path_over_water": False, "avoid_water": True, "avoid_damage_blocks": True},
        "minecraft:physics": {},
        "minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.3, "track_target": True},
        "minecraft:behavior.random_stroll": {"priority": 6, "speed_multiplier": 0.8, "xz_dist": 12},
        "minecraft:behavior.look_at_player": {"priority": 7, "look_distance": 16, "probability": 0.05},
    }
    boden.update(ziele)
    gruppen = {"fynn:luft": luft, "fynn:boden": boden}
    ereignisse = {
        "fynn:landen": {"remove": {"component_groups": ["fynn:luft"]}, "add": {"component_groups": ["fynn:boden"]},
                        "set_property": {"fynn:fliegt": False}},
        "fynn:abheben": {"remove": {"component_groups": ["fynn:boden"]}, "add": {"component_groups": ["fynn:luft"]},
                         "set_property": {"fynn:fliegt": True}},
    }
    return gruppen, ereignisse


def drachen_grundlage():
    return {
        "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
        "minecraft:follow_range": {"value": 64, "max": 64},
        "minecraft:knockback_resistance": {"value": 0.8},
        "minecraft:game_event_movement_tracking": {"emit_flap": True},
        "minecraft:damage_sensor": {"triggers": [{"cause": "fall", "deals_damage": False}]},
        "minecraft:behavior.hurt_by_target": {"priority": 1},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:jump.static": {},
    }


def eigenschaften_drache():
    e = eigenschaft("fynn:feuer")
    e.update(eigenschaft("fynn:fliegt"))
    return e


# ------------------------------------------------------------ Lindwurm

def _lindwurm():
    k = drachen_grundlage()
    k.update({"minecraft:fire_immune": {}, "minecraft:attack": {"damage": 12}})
    gruppen, ereignisse = luft_und_boden(1.4, 0.2, ["cow", "sheep", "horse", "bison", "elch"])
    return {
        "id": "lindwurm", "name": ("Lindwurm", "Fire Dragon"), "gestalt": "lindwurm", "gruppe": "Drachen",
        "varianten": [("gruen", 50), ("rot", 35), ("schwarz", 15)],
        "art": "drache", "verhalten": "drache", "keine_panik": True,
        "leben": 140, "schaden": 12, "tempo": 1.4, "kollision": (3.0, 2.2), "baby": False, "herde": (1, 1),
        "biome": [["mountains"], ["extreme_hills"]], "gewicht": 1,
        "spawn_bedingungen": [{"minecraft:spawns_on_surface": {}, "minecraft:weight": {"default": 1},
                               "minecraft:herd": {"min_size": 1, "max_size": 1},
                               "minecraft:density_limit": {"surface": 1},
                               "minecraft:height_filter": {"min": 90, "max": 320},
                               "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==",
                                                           "value": tag}]}
                              for tag in ("mountains", "extreme_hills", "frozen_peaks", "jagged_peaks")],
        "population": "monster",
        "material": "entity_emissive_alpha",
        "beute": [("fynn:drachenschuppe", 4, 7, 1.0, False), ("minecraft:bone", 1, 3, 1.0, False)],
        "laute": {"ambient": "mob.enderdragon.growl", "hurt": "mob.enderdragon.hit", "death": "mob.ravager.death",
                  "pitch": [1.2, 1.4]},
        "ei": ("#3e6a30", "#ffa21a"),
        "komponenten": k,
        "gruppen": gruppen, "ereignisse": ereignisse, "start_gruppen": ["fynn:luft"],
        "start_setzen": {"fynn:fliegt": True},
        "eigenschaften": eigenschaften_drache(),
        "eigene_bewegungen": drachen_bewegungen(),
        "steckbrief_extra": [
            ["Lebt", "selten, hoch in den Bergen – kreist über den Gipfeln, landet ab und zu und läuft auf vier Beinen"],
            ["Feueratem", "ein Flammenstrahl, der alles in Brand setzt, was darin steht, und Feuer auf den Boden legt"],
            ["Angriff", "stößt aus der Höhe herab – am Boden beißt und schlägt er"],
            ["Drachenschuppen", "daraus die Drachenschuppen-Rüstung (stark wie Diamant) – "
                                "ganz getragen schützt sie vor Feuer"]],
    }


DRACHEN = [_lindwurm()]
