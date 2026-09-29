#!/usr/bin/env python3
"""Steckbriefe der Fantasy-Wesen, zweite Welle (4.81 bis 4.83).

4.81:
* Glutskorpion: Skorpion aus Basalt und Glut im Nether und in dunklen
  Wuestenhoehlen. Sein Stich brennt. Aus dem Glutstachel werden Glutpfeile
  (Zweithand, wie die Erzpfeile): Was sie treffen, brennt.
* Kristallspinne: Spinne mit leuchtenden Amethyst-Kristallen auf dem
  Ruecken, tief in Hoehlen. Klettert Waende hoch und spinnt Netze um ihre
  Beute. Aus dem Spinnenkristall wird das Hoehlenauge: Nachtsicht.
* Irrlicht: ein schwebendes Licht nachts im Sumpf. Es weicht aus, wenn man
  naeher kommt - wer ihm eine halbe Minute folgt, findet einen Schatz ...
  oder eine Falle. Mit der Glasflasche gefangen wird es zur Irrlichtflasche:
  geworfen leuchtet es dort drei Minuten lang.

Was sich nicht in Komponenten sagen laesst, steht in scripts/fantasy2.js.
"""

from kleintiere_daten import familie, SPIELER, LT, STEHT, puls, eigenschaft
from fantasy_daten import schwebeflug, boden

KEIN_KREATIV = {"test": "has_ability", "subject": "other", "value": "instabuild", "operator": "!="}


def laufen_am_boden(tempo_extra=None):
    k = {
        "minecraft:navigation.walk": {"avoid_water": True, "avoid_damage_blocks": True},
        "minecraft:movement.basic": {},
        "minecraft:jump.static": {},
        "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.random_stroll": {"priority": 6, "speed_multiplier": 1.0},
        "minecraft:behavior.look_at_player": {"priority": 8, "look_distance": 8, "probability": 0.02},
    }
    k.update(tempo_extra or {})
    return k


def achtbeiner(lauf, beine=8, heben=16.0, schwingen=20.0):
    """Wechselgang fuer acht Beine: die geraden Paare gegen die ungeraden."""
    knochen = {}
    for i in range(beine):
        paar_nr, seite = divmod(i, 2)
        phase = 0 if (paar_nr + seite) % 2 == 0 else 180
        zeichen = 1 if seite == 0 else -1
        knochen[f"bein{i}"] = {"rotation": [
            0.0, f"math.sin({lauf} + {phase}) * {schwingen} * {zeichen}",
            f"math.max(0.0, math.sin({lauf} + {phase} + 90.0)) * {heben} * {zeichen}"]}
    return knochen


# ------------------------------------------------------------ Bewegungen

def skorpion_bewegungen():
    lauf = f"{LT} * 1000.0"
    krabbeln = {"loop": True, "bones": achtbeiner(lauf)}
    krabbeln["bones"]["koerper"] = {"rotation": [0.0, f"math.sin({lauf} * 2.0) * 1.5", 0.0]}
    # Im Stehen: die Scheren oeffnen und schliessen sich, der Schwanz
    # pendelt ueber dem Ruecken.
    lauern = {"loop": True, "bones": {
        "finger_links": {"rotation": [0.0, f"-math.max(0.0, math.sin({LT} * 90.0)) * 25.0", 0.0]},
        "finger_rechts": {"rotation": [0.0, f"math.max(0.0, math.sin({LT} * 90.0 + 60.0)) * 25.0", 0.0]},
        "arm_links": {"rotation": [0.0, f"math.sin({LT} * 40.0) * 8.0", 0.0]},
        "arm_rechts": {"rotation": [0.0, f"-math.sin({LT} * 40.0 + 30.0) * 8.0", 0.0]},
        "schwanz3": {"rotation": [f"math.sin({LT} * 70.0) * 6.0", f"math.sin({LT} * 45.0) * 8.0", 0.0]},
        "stachel": {"rotation": [f"math.sin({LT} * 70.0 - 40.0) * 10.0", 0.0, 0.0]},
    }}
    # Der Stich: der Schwanz schnellt ueber den Kopf nach vorn, die Scheren packen.
    stich = {"loop": True, "bones": {
        "schwanz1": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 15.0", 0.0, 0.0]},
        "schwanz3": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 25.0", 0.0, 0.0]},
        "schwanz5": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 30.0", 0.0, 0.0]},
        "stachel": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 40.0", 0.0, 0.0]},
        "finger_links": {"rotation": [0.0, "-math.sin(variable.attack_time * 540.0) * 30.0", 0.0]},
        "finger_rechts": {"rotation": [0.0, "math.sin(variable.attack_time * 540.0) * 30.0", 0.0]},
    }}
    return {
        "krabbeln": (krabbeln, "math.clamp(query.modified_move_speed * 5.0, 0.0, 1.0)"),
        "lauern": (lauern, "1.0"),
        "stich": (stich, "variable.attack_time > 0.0"),
    }


def spinne_bewegungen():
    lauf = f"{LT} * 1100.0"
    krabbeln = {"loop": True, "bones": achtbeiner(lauf, heben=14.0, schwingen=18.0)}
    tasten = {"loop": True, "bones": {
        "kopf": {"rotation": [f"math.sin({LT} * 50.0) * 4.0", f"math.sin({LT} * 35.0) * 8.0", 0.0]},
        "kristalle": {"scale": f"1.0 + math.sin({LT} * 80.0) * 0.05"},
        "koerper": {"position": [0.0, f"math.sin({LT} * 60.0) * 0.3", 0.0]},
    }}
    # Netz spinnen: der Hinterleib hebt sich, die Vorderbeine greifen.
    spinnen = {"loop": True, "bones": {
        "koerper": {"rotation": [-15.0, 0.0, 0.0]},
        "bein0": {"rotation": [f"-30.0 + math.sin({LT} * 900.0) * 15.0", 0.0, 0.0]},
        "bein1": {"rotation": [f"-30.0 - math.sin({LT} * 900.0) * 15.0", 0.0, 0.0]},
    }}
    beissen = {"loop": True, "bones": {
        "kopf": {"rotation": ["math.sin(variable.attack_time * 180.0) * 20.0", 0.0, 0.0]},
        "bein0": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 40.0", 0.0, 0.0]},
        "bein1": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 40.0", 0.0, 0.0]},
    }}
    return {
        "krabbeln": (krabbeln, "math.clamp(query.modified_move_speed * 5.0, 0.0, 1.0)"),
        "tasten": (tasten, "1.0"),
        "netzspinnen": (spinnen, "query.property('fynn:spinnt')"),
        "beissen": (beissen, "variable.attack_time > 0.0"),
    }


def irrlicht_bewegungen():
    schweben = {"loop": True, "bones": {
        "kern": {"position": [f"math.sin({LT} * 70.0) * 1.0", f"math.sin({LT} * 110.0) * 1.5",
                              f"math.cos({LT} * 60.0) * 1.0"],
                 "scale": f"1.0 + math.sin({LT} * 700.0) * 0.08"},
        "huelle": {"rotation": [f"{LT} * 90.0", f"{LT} * 140.0", 0.0],
                   "scale": f"1.0 + math.sin({LT} * 400.0 + 40.0) * 0.12"},
        "kranz": {"rotation": [0.0, f"{LT} * -220.0", 0.0]},
        "spitze": {"scale": [1.0, f"1.0 + math.sin({LT} * 900.0) * 0.3", 1.0]},
    }}
    # Lockt es, flackert es heftiger.
    locken = {"loop": True, "bones": {
        "kern": {"scale": f"1.2 + math.sin({LT} * 1500.0) * 0.2"},
        "huelle": {"scale": f"1.25 + math.sin({LT} * 600.0) * 0.2"},
    }}
    return {"schweben": (schweben, "1.0"), "locken": (locken, "query.property('fynn:lockt')")}


# ------------------------------------------------------------ Die Wesen

def _glutskorpion():
    k = laufen_am_boden({"minecraft:fire_immune": {}})
    nether = [{"minecraft:spawns_on_surface": {}, "minecraft:spawns_underground": {},
               "minecraft:weight": {"default": 8}, "minecraft:herd": {"min_size": 1, "max_size": 2},
               "minecraft:density_limit": {"surface": 4, "underground": 4},
               "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==", "value": "nether"}]},
              {"minecraft:spawns_underground": {}, "minecraft:weight": {"default": 4},
               "minecraft:herd": {"min_size": 1, "max_size": 1},
               "minecraft:brightness_filter": {"min": 0, "max": 7, "adjust_for_weather": False},
               "minecraft:density_limit": {"underground": 2},
               "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==", "value": "desert"}]}]
    return {
        "id": "glutskorpion", "name": ("Glutskorpion", "Ember Scorpion"), "gestalt": "glutskorpion",
        "gruppe": "Fantasy",
        "varianten": [("glut", 80), ("seele", 20)],
        "art": "kriecher", "verhalten": "feindlich", "reichweite": 10, "leben": 22, "schaden": 5,
        "tempo": 0.28, "kollision": (1.3, 0.8), "baby": False, "herde": (1, 2),
        "biome": [["nether"]], "gewicht": 8,
        "spawn_bedingungen": nether, "population": "monster",
        "material": "entity_emissive_alpha",
        "beute": [("fynn:glutstachel", 1, 1, 0.5, False), ("minecraft:blaze_powder", 0, 1, 1.0, False)],
        "laute": {"ambient": "mob.silverfish.say", "hurt": "mob.blaze.hit", "death": "mob.blaze.death",
                  "step": "mob.spider.step", "pitch": [0.6, 0.8]},
        "ei": ("#2a2226", "#ff6a1a"),
        "komponenten": k,
        "eigene_bewegungen": skorpion_bewegungen(),
        "steckbrief_extra": [
            ["Stich", "setzt dich in Brand"],
            ["Glutstachel", "mit vier Pfeilen: vier Glutpfeile – in die Zweithand, und was sie treffen, brennt"]],
    }


def _kristallspinne():
    k = laufen_am_boden({
        "minecraft:navigation.climb": {"can_path_over_water": True, "avoid_damage_blocks": True},
        "minecraft:can_climb": {},
    })
    k.pop("minecraft:navigation.walk")
    tief = [{"minecraft:spawns_underground": {}, "minecraft:weight": {"default": 6},
             "minecraft:herd": {"min_size": 1, "max_size": 2},
             "minecraft:height_filter": {"min": -60, "max": 20},
             "minecraft:brightness_filter": {"min": 0, "max": 7, "adjust_for_weather": False},
             "minecraft:density_limit": {"underground": 3},
             "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==", "value": "overworld"}]}]
    return {
        "id": "kristallspinne", "name": ("Kristallspinne", "Crystal Spider"), "gestalt": "kristallspinne",
        "gruppe": "Fantasy",
        "varianten": [("amethyst", 75), ("smaragd", 25)],
        "art": "kriecher", "verhalten": "feindlich", "reichweite": 14, "leben": 26, "schaden": 4, "gift": True,
        "tempo": 0.3, "kollision": (1.6, 1.0), "baby": False, "herde": (1, 2),
        "biome": [["overworld"]], "gewicht": 6,
        "spawn_bedingungen": tief, "population": "monster",
        "material": "entity_emissive_alpha",
        "beute": [("fynn:spinnenkristall", 1, 1, 0.45, False), ("minecraft:amethyst_shard", 1, 3, 1.0, False),
                  ("minecraft:string", 1, 2, 1.0, False)],
        "laute": {"ambient": "mob.spider.say", "hurt": "mob.spider.say", "death": "mob.spider.death",
                  "step": "mob.spider.step", "pitch": [0.7, 0.85]},
        "ei": ("#241c2e", "#a86ae0"),
        "komponenten": k,
        "eigenschaften": eigenschaft("fynn:spinnt"),
        "eigene_bewegungen": spinne_bewegungen(),
        "steckbrief_extra": [
            ["Klettert", "Wände hinauf, wie Minecrafts Spinnen"],
            ["Netz", "spinnt ein Netz um dich – es hält dich fest und vergeht nach ein paar Sekunden"],
            ["Biss", "giftig"],
            ["Spinnenkristall", "mit Gold zum Höhlenauge: in der Schnellleiste Nachtsicht"]],
    }


def _irrlicht():
    k = schwebeflug(0.35)
    k.update({
        "minecraft:fire_immune": {},
        "minecraft:damage_sensor": {"triggers": [{"cause": "fall", "deals_damage": False}]},
        "minecraft:interact": {"interactions": [{
            "on_interact": {"filters": {"all_of": [
                SPIELER, {"test": "has_equipment", "domain": "hand", "subject": "other",
                          "value": "minecraft:glass_bottle"}]},
                "event": "fynn:gefangen", "target": "self"},
            "use_item": True, "transform_to_item": "fynn:irrlichtflasche",
            "interact_text": "action.interact.fynn_fangen"}]},
    })
    nachts = [{"minecraft:spawns_on_surface": {}, "minecraft:weight": {"default": 6},
               "minecraft:herd": {"min_size": 1, "max_size": 1},
               "minecraft:brightness_filter": {"min": 0, "max": 6, "adjust_for_weather": False},
               "minecraft:density_limit": {"surface": 2},
               "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==", "value": tag}]}
              for tag in ("swamp", "mangrove_swamp")]
    return {
        "id": "irrlicht", "name": ("Irrlicht", "Will-o'-the-Wisp"), "gestalt": "irrlicht", "gruppe": "Fantasy",
        "varianten": [("blass", 60), ("blau", 40)],
        "art": "insekt", "verhalten": "friedlich", "keine_panik": True, "leben": 6, "tempo": 0.25,
        "kollision": (0.5, 0.6), "baby": False, "herde": (1, 1),
        "biome": [["swamp"]], "gewicht": 6,
        "spawn_bedingungen": nachts, "population": "ambient",
        "material": "entity_emissive_alpha",
        "beute": [],
        "laute": {"ambient": "mob.allay.idle", "hurt": "mob.allay.hurt", "death": "mob.allay.death",
                  "pitch": [0.5, 0.7]},
        "ei": ("#2a4a3a", "#7affc0"),
        "komponenten": k,
        "gruppen": {"fynn:gefangen": {"minecraft:instant_despawn": {}}},
        "ereignisse": {"fynn:gefangen": {"add": {"component_groups": ["fynn:gefangen"]}},
                       "fynn:verschwinden": {"add": {"component_groups": ["fynn:gefangen"]}}},
        "eigenschaften": eigenschaft("fynn:lockt"),
        "eigene_bewegungen": irrlicht_bewegungen(),
        "steckbrief_extra": [
            ["Lebt", "nachts im Sumpf"],
            ["Lockt", "weicht aus, wenn du näher kommst – folgst du ihm eine halbe Minute, "
                      "findest du einen Schatz … oder eine Falle"],
            ["Glasflasche", "fängt es ein – die Irrlichtflasche wirft man, und dort leuchtet es drei Minuten"]],
    }


# ------------------------------------------------------------ Werwolf (4.82)

def werwolf_bewegungen():
    geht = "math.clamp(query.modified_move_speed * 4.0, 0.0, 1.0)"
    schritt = f"{LT} * 500.0"
    wolf_ist = "query.property('fynn:wolf')"
    # Welche Gestalt man sieht: die andere schrumpft auf nichts.
    als_mensch = {"loop": True, "bones": {"wolf": {"scale": 0.0}}}
    als_wolf = {"loop": True, "bones": {"mensch": {"scale": 0.0}}}
    mensch_geht = {"loop": True, "bones": {
        "mensch_bein_links": {"rotation": [f"math.sin({schritt}) * 30.0", 0.0, 0.0]},
        "mensch_bein_rechts": {"rotation": [f"-math.sin({schritt}) * 30.0", 0.0, 0.0]},
        "mensch_arm_links": {"rotation": [f"-math.sin({schritt}) * 12.0", 0.0, 0.0]},
        "mensch_arm_rechts": {"rotation": [f"math.sin({schritt}) * 25.0", 0.0, 0.0]},
    }}
    wolf_geht = {"loop": True, "bones": {
        "wolf_bein_links": {"rotation": [f"math.sin({schritt} * 1.3) * 32.0", 0.0, 0.0]},
        "wolf_bein_rechts": {"rotation": [f"-math.sin({schritt} * 1.3) * 32.0", 0.0, 0.0]},
        "wolf_arm_links": {"rotation": [f"-math.sin({schritt} * 1.3) * 28.0", 0.0, 0.0]},
        "wolf_arm_rechts": {"rotation": [f"math.sin({schritt} * 1.3) * 28.0", 0.0, 0.0]},
        "wolf": {"rotation": [f"12.0 + math.sin({schritt} * 2.6) * 3.0", 0.0, 0.0]},
        "wolf_schwanz": {"rotation": [0.0, f"math.sin({schritt} * 1.3) * 15.0", 0.0]},
    }}
    wolf_steht = {"loop": True, "bones": {
        "wolf": {"rotation": [8.0, 0.0, 0.0], "scale": [1.0, f"1.0 + math.sin({LT} * 90.0) * 0.02", 1.0]},
        "wolf_kopf": {"rotation": [f"math.sin({LT} * 30.0) * 5.0", f"math.sin({LT} * 23.0) * 18.0", 0.0]},
        "wolf_schwanz": {"rotation": [0.0, f"math.sin({LT} * 60.0) * 10.0", 0.0]},
        "wolf_arm_links": {"rotation": [-10.0, 0.0, -8.0]}, "wolf_arm_rechts": {"rotation": [-10.0, 0.0, 8.0]},
    }}
    heulen = {"loop": True, "bones": {
        "wolf_kopf": {"rotation": [-55.0, 0.0, 0.0]},
        "wolf_kiefer": {"rotation": [f"25.0 + math.sin({LT} * 400.0) * 4.0", 0.0, 0.0]},
        "wolf": {"rotation": [-10.0, 0.0, 0.0]},
    }}
    # Die Verwandlung: zittern, Arme hoch, Kopf in den Nacken.
    wandeln = {"loop": True, "bones": {
        "mensch": {"rotation": [f"math.sin({LT} * 1800.0) * 4.0", 0.0, f"math.sin({LT} * 1500.0) * 5.0"],
                   "scale": [f"1.0 + math.sin({LT} * 900.0) * 0.08", f"1.0 + math.sin({LT} * 700.0) * 0.1", 1.0]},
        "mensch_kopf": {"rotation": [-40.0, 0.0, 0.0]},
        "mensch_arm_links": {"rotation": [-150.0, 0.0, -20.0]},
        "mensch_arm_rechts": {"rotation": [-150.0, 0.0, 20.0]},
    }}
    schlagen = {"loop": True, "bones": {
        "wolf_arm_rechts": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 110.0", 0.0, 0.0]},
        "wolf_arm_links": {"rotation": ["-math.sin(variable.attack_time * 180.0 - 60.0) * 80.0", 0.0, 0.0]},
        "wolf_kiefer": {"rotation": ["math.sin(variable.attack_time * 180.0) * 30.0", 0.0, 0.0]},
    }}
    return {
        "als_mensch": (als_mensch, f"1.0 - {wolf_ist}"),
        "als_wolf": (als_wolf, wolf_ist),
        "mensch_geht": (mensch_geht, f"(1.0 - {wolf_ist}) * {geht}"),
        "wolf_geht": (wolf_geht, f"{wolf_ist} * {geht}"),
        "wolf_steht": (wolf_steht, f"{wolf_ist} * (1.0 - {geht})"),
        "heulen": (heulen, f"{wolf_ist} * {STEHT} * {puls(10.0, 30, 0.9)}"),
        "verwandlung": (wandeln, "query.property('fynn:wandelt')"),
        "pranke": (schlagen, f"{wolf_ist} * (variable.attack_time > 0.0)"),
    }


def _werwolf():
    k = laufen_am_boden({"minecraft:behavior.hurt_by_target": {"priority": 1},
                         "minecraft:attack": {"damage": 3},
                         "minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.1}})
    wolf = {
        "minecraft:movement": {"value": 0.34},
        "minecraft:attack": {"damage": 9},
        "minecraft:knockback_resistance": {"value": 0.5},
        "minecraft:behavior.melee_box_attack": {"priority": 2, "speed_multiplier": 1.3, "track_target": True},
        "minecraft:behavior.leap_at_target": {"priority": 1, "yd": 0.45, "must_be_on_ground": True},
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 2, "must_see": True, "reselect_targets": True, "within_radius": 24,
            "entity_types": [{"filters": {"all_of": [SPIELER, KEIN_KREATIV]}, "max_dist": 24},
                             {"filters": familie("sheep", "villager", "cow"), "max_dist": 16}]},
        # Gewoehnliche Waffen setzen ihm nur halb zu - Silber trifft ihn voll
        # und dazu doppelt (scripts/fantasy2.js).
        "minecraft:damage_sensor": {"triggers": [
            {"cause": "entity_attack", "damage_multiplier": 0.5},
            {"cause": "projectile", "damage_multiplier": 0.5},
            {"cause": "fall", "deals_damage": False}]},
    }
    return {
        "id": "werwolf", "name": ("Werwolf", "Werewolf"), "gestalt": "werwolf", "gruppe": "Fantasy",
        "varianten": [("grau", 70), ("schwarz", 30)],
        "art": "kriecher", "verhalten": "wurm", "keine_panik": True,
        "leben": 40, "schaden": 9, "tempo": 0.23, "kollision": (0.8, 2.3), "baby": False, "herde": (1, 1),
        "biome": [["forest"], ["taiga"], ["roofed"]], "gewicht": 3,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:coarse_dirt"],
        "population": "monster",
        "beute": [("fynn:werwolfsklaue", 1, 1, 0.5, False), ("minecraft:leather", 0, 2, 1.0, False)],
        "laute": {"hurt": "mob.wolf.hurt", "death": "mob.wolf.death", "pitch": [0.55, 0.7]},
        "ei": ("#4a3a2a", "#6a665e"),
        "komponenten": k,
        "gruppen": {"fynn:wolfsgestalt": wolf},
        "ereignisse": {
            "fynn:zum_wolf": {"add": {"component_groups": ["fynn:wolfsgestalt"]},
                              "set_property": {"fynn:wolf": True, "fynn:wandelt": False}},
            "fynn:zum_menschen": {"remove": {"component_groups": ["fynn:wolfsgestalt"]},
                                  "set_property": {"fynn:wolf": False, "fynn:wandelt": False}},
            "fynn:wandeln": {"set_property": {"fynn:wandelt": True}},
        },
        "eigenschaften": eigenschaft("fynn:wolf", "fynn:wandelt"),
        "eigene_bewegungen": werwolf_bewegungen(),
        "steckbrief_extra": [
            ["Tagsüber", "ein Wanderer im Kapuzenmantel – er tut niemandem etwas"],
            ["Mondnächte", "wenn der Mond voll oder fast voll ist, verwandelt er sich heulend in einen Wolf"],
            ["Silber", "gewöhnliche Waffen treffen den Wolf nur halb – Silberklinge und Silberdolche doppelt"],
            ["Werwolfsklaue", "mit Silber zum Mondtalisman: nachts mehr Stärke"]],
    }


# ------------------------------------------------------------ Moosgolem (4.82)

def moosgolem_bewegungen():
    geht = "math.clamp(query.modified_move_speed * 4.0, 0.0, 1.0)"
    schritt = f"{LT} * 260.0"
    wach = "(1.0 - query.property('fynn:schlaeft'))"
    # Schlafend ein bemooster Felsbrocken: tief gesunken, Kopf eingezogen,
    # die Arme um sich gelegt, die Beine verschwunden.
    schlafen = {"loop": True, "bones": {
        "koerper": {"position": [0.0, -15.0, 0.0], "rotation": [18.0, 0.0, 0.0],
                    "scale": [1.0, f"1.0 + math.sin({LT} * 25.0) * 0.015", 1.0]},
        "kopf": {"position": [0.0, -5.0, 2.0], "rotation": [30.0, 0.0, 0.0]},
        "arm_links": {"rotation": [-35.0, 0.0, 45.0]}, "arm_rechts": {"rotation": [-35.0, 0.0, -45.0]},
        "bein_links": {"scale": [1.0, 0.1, 1.0]}, "bein_rechts": {"scale": [1.0, 0.1, 1.0]},
    }}
    gehen = {"loop": True, "bones": {
        "bein_links": {"rotation": [f"math.sin({schritt}) * 22.0", 0.0, 0.0]},
        "bein_rechts": {"rotation": [f"-math.sin({schritt}) * 22.0", 0.0, 0.0]},
        "arm_links": {"rotation": [f"-math.sin({schritt}) * 16.0", 0.0, 0.0]},
        "arm_rechts": {"rotation": [f"math.sin({schritt}) * 16.0", 0.0, 0.0]},
        "koerper": {"rotation": [4.0, 0.0, f"math.sin({schritt}) * 3.0"]},
    }}
    stehen = {"loop": True, "bones": {
        "koerper": {"scale": [1.0, f"1.0 + math.sin({LT} * 40.0) * 0.01", 1.0]},
        "kopf": {"rotation": [f"math.sin({LT} * 20.0) * 4.0", f"math.sin({LT} * 13.0) * 20.0", 0.0]},
    }}
    # Der Schlag: beide Faeuste ueber den Kopf und auf den Boden.
    schlag = {"loop": True, "bones": {
        "arm_links": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 150.0", 0.0, 0.0]},
        "arm_rechts": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 150.0", 0.0, 0.0]},
        "koerper": {"rotation": ["math.sin(variable.attack_time * 180.0) * 12.0", 0.0, 0.0]},
    }}
    return {
        "schlafen": (schlafen, "query.property('fynn:schlaeft')"),
        "golem_geht": (gehen, f"{wach} * {geht}"),
        "golem_steht": (stehen, f"{wach} * (1.0 - {geht})"),
        "schlag": (schlag, f"{wach} * (variable.attack_time > 0.0)"),
    }


def _moosgolem():
    k = laufen_am_boden({"minecraft:knockback_resistance": {"value": 1.0}})
    schlafend = {"minecraft:movement": {"value": 0.0}}
    wach = {
        "minecraft:attack": {"damage": 14},
        "minecraft:behavior.hurt_by_target": {"priority": 1},
        "minecraft:behavior.melee_box_attack": {"priority": 2, "speed_multiplier": 1.0, "track_target": True},
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 2, "must_see": True, "reselect_targets": True, "within_radius": 16,
            "entity_types": [{"filters": {"all_of": [SPIELER, KEIN_KREATIV]}, "max_dist": 16}]},
    }
    return {
        "id": "moosgolem", "name": ("Moosgolem", "Moss Golem"), "gestalt": "moosgolem", "gruppe": "Fantasy",
        "varianten": [("wald", 65), ("tiefwald", 35)], "variante_nach_biom": {"roofed": 1},
        "art": "kriecher", "verhalten": "wurm", "keine_panik": True,
        "leben": 100, "schaden": 14, "tempo": 0.2, "kollision": (2.0, 2.9), "baby": False, "herde": (1, 1),
        "biome": [["forest"], ["roofed"], ["jungle"]], "gewicht": 2,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:moss_block"],
        "beute": [("fynn:moosherz", 1, 2, 0.7, False), ("minecraft:moss_block", 2, 4, 1.0, False),
                  ("minecraft:mossy_cobblestone", 1, 3, 1.0, False)],
        "laute": {"hurt": "mob.irongolem.hit", "death": "mob.irongolem.death", "step": "mob.irongolem.walk",
                  "pitch": [0.6, 0.7]},
        "ei": ("#7a7a74", "#4e7a2e"),
        "komponenten": k,
        "gruppen": {"fynn:schlafend": schlafend, "fynn:wach": wach},
        "ereignisse": {
            "fynn:aufwachen": {"remove": {"component_groups": ["fynn:schlafend"]}, "add": {"component_groups": ["fynn:wach"]},
                               "set_property": {"fynn:schlaeft": False}},
            "fynn:einschlafen": {"remove": {"component_groups": ["fynn:wach"]}, "add": {"component_groups": ["fynn:schlafend"]},
                                 "set_property": {"fynn:schlaeft": True}},
        },
        "start_gruppen": ["fynn:schlafend"], "start_setzen": {"fynn:schlaeft": True},
        "eigenschaften": eigenschaft("fynn:schlaeft"),
        "eigene_bewegungen": moosgolem_bewegungen(),
        "steckbrief_extra": [
            ["Schläft", "als bemooster Felsbrocken im Wald"],
            ["Erwacht", "wenn du in seiner Nähe Bäume fällst – oder ihn schlägst"],
            ["Wurzeln", "lässt Wurzeln unter dir aus dem Boden brechen: sie halten fest und tun weh"],
            ["Moosherz", "benutzen: rund um dich wächst alles – Getreide reift, Blumen sprießen"]],
    }


# ------------------------------------------------------------ Greif (4.83)

def greif_bewegungen():
    fliegt = "query.property('fynn:fliegt')"
    # Am Boden: die Schwingen angelegt, nach hinten gefaltet.
    ruhe = {"loop": True, "bones": {
        "fluegel_links": {"rotation": [0.0, -70.0, -8.0]},
        "fluegel_rechts": {"rotation": [0.0, 70.0, 8.0]},
        "fluegelspitze_links": {"rotation": [0.0, -95.0, 0.0]},
        "fluegelspitze_rechts": {"rotation": [0.0, 95.0, 0.0]},
    }}
    # Wie beim Adler: kraeftiger Abschlag, lockerer Aufschlag.
    schlag = f"(math.sin({LT} * 320.0) + math.sin({LT} * 640.0 + 90.0) * 0.3) * 45.0"
    nach = f"math.sin({LT} * 320.0 - 70.0) * 34.0"
    flug = {"loop": True, "bones": {
        "fluegel_links": {"rotation": [0.0, f"math.cos({LT} * 320.0) * 12.0", f"-5.0 - {schlag}"]},
        "fluegel_rechts": {"rotation": [0.0, f"-math.cos({LT} * 320.0) * 12.0", f"5.0 + {schlag}"]},
        "fluegelspitze_links": {"rotation": [0.0, 0.0, f"-{nach}"]},
        "fluegelspitze_rechts": {"rotation": [0.0, 0.0, f"{nach}"]},
        "body": {"rotation": ["-query.target_x_rotation * 0.4", 0.0, "variable.fynn_dreh * 2.0"],
                 "position": [0.0, f"-math.sin({LT} * 320.0 - 30.0) * 0.8", 0.0]},
        "leg0": {"rotation": [-50.0, 0.0, 0.0]}, "leg1": {"rotation": [-50.0, 0.0, 0.0]},
        "leg2": {"rotation": [60.0, 0.0, 0.0]}, "leg3": {"rotation": [60.0, 0.0, 0.0]},
        "tail": {"rotation": [20.0, f"math.sin({LT} * 80.0) * 8.0", 0.0]},
        "head": {"rotation": [-10.0, 0.0, 0.0]},
    }}
    return {"schwingen_angelegt": (ruhe, f"1.0 - {fliegt}"), "greifenflug": (flug, fliegt)}


def _greif():
    fleisch = ["minecraft:beef", "minecraft:mutton", "minecraft:porkchop", "minecraft:chicken", "minecraft:rabbit",
               "fynn:elchfleisch", "fynn:bisonfleisch"]
    k = {"minecraft:damage_sensor": {"triggers": [{"cause": "fall", "deals_damage": False}]}}
    return {
        "id": "greif", "name": ("Greif", "Griffin"), "gestalt": "greif", "gruppe": "Fantasy",
        "varianten": [("gold", 55), ("weiss", 35), ("schwarz", 10)],
        "art": "land", "verhalten": "neutral", "leben": 40, "schaden": 7, "tempo": 0.25,
        "kollision": (1.4, 1.6), "baby": False, "herde": (1, 2),
        # Zaehmen mit rohem Fleisch, dann satteln - und fliegen (scripts/greif.js).
        "reiten": {"zaehmen": fleisch, "chance": 0.2, "tempo": 0.32, "sitz": [0.0, 1.15, 0.0], "sprung": 0.8},
        "biome": [["mountains"], ["extreme_hills"], ["meadow"]], "gewicht": 3,
        "boden": ["minecraft:grass_block", "minecraft:stone", "minecraft:snow_layer", "minecraft:gravel"],
        "beute": [("minecraft:feather", 1, 3, 1.0, False), ("fynn:greifenfeder", 1, 1, 0.35, False)],
        "laute": {"ambient": "mob.parrot.idle", "hurt": "mob.cat.hit", "death": "mob.parrot.death",
                  "step": "mob.cat.step", "pitch": [0.5, 0.6]},
        "ei": ("#c89a58", "#e8d8a8"), "angriff": "tatze",
        "komponenten": k,
        "eigenschaften": eigenschaft("fynn:fliegt"),
        "eigene_bewegungen": greif_bewegungen(),
        "steckbrief_extra": [
            ["Fliegen", "gesattelt die Sprungtaste halten: Er steigt auf. Er fliegt, wohin du schaust – "
                        "schau nach unten, um zu landen"],
            ["Greifenfeder", "in der Schnellleiste: Fällst du tief, schwebst du sanft hinunter"]],
    }


FANTASY2 = [_glutskorpion(), _kristallspinne(), _irrlicht(), _werwolf(), _moosgolem(), _greif()]
