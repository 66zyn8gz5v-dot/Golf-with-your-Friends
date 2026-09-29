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


FANTASY2 = [_glutskorpion(), _kristallspinne(), _irrlicht()]
