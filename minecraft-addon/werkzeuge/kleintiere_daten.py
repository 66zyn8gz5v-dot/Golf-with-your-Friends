#!/usr/bin/env python3
"""Steckbriefe der Kleintiere (4.77) - fuer tiere_bauen.TIERE.

Fynn: "mehr kleinere Wesen, zum Beispiel kleinere Voegel, ein Specht, der
an Baeumen so Dings, eine Schnecke, die alle so auch Funktionen haben ...
man kann mit denen was anfangen."

* Singvoegel (Rotkehlchen, Blaumeise, Spatz) fliegen vor jedem weg, der
  nicht schleicht. Wer sich mit Samen anschleicht, kann sie zaehmen - mit
  einer Kaeferlarve sicher. Ein zahmer Vogel folgt einem und warnt laut,
  wenn ein Monster in der Naehe ist. Sie picken Schnecken.
* Der Specht fliegt Baumstaemme an, haelt sich fest und haemmert - und
  findet dabei Kaeferlarven.
* Die Schnecke kriecht, zieht sich bei Gefahr ins Haus zurueck, gibt mit
  einer Glasflasche Schleim (daraus werden Schleimbaelle) und hinterlaesst
  ihr Haus (daraus wird Knochenmehl).
* Das Eichhoernchen flitzt Baeume hoch, bringt Nuesse, wenn man es mit
  Beeren oder Samen fuettert, und vergraebt manchmal eine Nuss - daraus
  waechst ein Baum.

Die Einzelheiten, die sich nicht in Komponenten sagen lassen, stehen in
scripts/kleintiere.js.
"""


def familie(*namen):
    return {"any_of": [{"test": "is_family", "subject": "other", "value": n} for n in namen]}


SPIELER = {"test": "is_family", "subject": "other", "value": "player"}
NICHT_SCHLEICHEND = {"test": "is_sneaking", "subject": "other", "value": False}
# Wer kleine Tiere frisst: der Adler, Fuchs, Katzen, Wolf.
KLEINRAEUBER = ["steinadler", "fox", "ocelot", "cat", "wolf"]
SAMEN = ["minecraft:wheat_seeds", "minecraft:pumpkin_seeds", "minecraft:melon_seeds",
         "minecraft:beetroot_seeds", "minecraft:torchflower_seeds"]
STAEMME = ["minecraft:oak_log", "minecraft:birch_log", "minecraft:spruce_log", "minecraft:jungle_log",
           "minecraft:dark_oak_log", "minecraft:acacia_log", "minecraft:cherry_log", "minecraft:mangrove_log",
           "minecraft:pale_oak_log"]
LT = "query.life_time"
STEHT = "(1.0 - math.clamp(query.modified_move_speed * 3.0, 0.0, 1.0))"


def puls(tempo, versatz, schwelle):
    """0, und fuer kurze Zeit 1 - je Tier versetzt (wie in tiere_bauen)."""
    k = round(1.5 / (1.0 - schwelle), 2)
    return (f"math.clamp((math.sin({LT} * {tempo} + variable.fynn_zufall + {versatz}) - {schwelle}) * {k}, "
            "0.0, 1.0)")


def flucht(familien, spieler=False, weite=8):
    """Weg von Raeubern - und, solange sie wild sind, von jedem Spieler,
    der nicht schleicht. Anschleichen ist der Weg, sie zu zaehmen."""
    arten = [{"filters": familie(*familien), "max_dist": weite, "walk_speed_multiplier": 1.3,
              "sprint_speed_multiplier": 1.6}]
    if spieler:
        arten.append({"filters": {"all_of": [SPIELER, NICHT_SCHLEICHEND]}, "max_dist": 6,
                      "walk_speed_multiplier": 1.3, "sprint_speed_multiplier": 1.6})
    return {"minecraft:behavior.avoid_mob_type": {"priority": 1, "remove_target": True, "entity_types": arten}}


def vogelflug(tempo):
    """Wie Mojangs Papagei: fliegt kurz, landet auf Baeumen und am Boden,
    faellt ohne Schaden."""
    return {
        "minecraft:navigation.fly": {"can_path_from_air": True, "can_path_over_water": True,
                                     "avoid_damage_blocks": True, "avoid_water": True},
        "minecraft:movement.basic": {},
        "minecraft:jump.static": {},
        "minecraft:can_fly": {},
        "minecraft:flying_speed": {"value": tempo},
        "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
        "minecraft:damage_sensor": {"triggers": [{"cause": "fall", "deals_damage": False}]},
        "minecraft:game_event_movement_tracking": {"emit_flap": True},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.random_fly": {"priority": 6, "xz_dist": 12, "y_dist": 4, "y_offset": 0,
                                          "speed_multiplier": 1.0, "can_land_on_trees": True,
                                          "avoid_damage_blocks": True},
        "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 0.8},
        "minecraft:behavior.look_at_player": {"priority": 8, "look_distance": 6, "probability": 0.02},
    }


def festhalten():
    """Am Stamm haengen: keine Schwerkraft, kein Laufen - das Skript setzt
    das Tier an den Baum und laesst es wieder los."""
    gruppe = {"minecraft:physics": {"has_gravity": False, "has_collision": True},
              "minecraft:movement": {"value": 0.0}}
    ereignisse = {"fynn:festhalten": {"add": {"component_groups": ["fynn:haengt"]}},
                  "fynn:loslassen": {"remove": {"component_groups": ["fynn:haengt"]}}}
    return gruppe, ereignisse


def zum_stamm(chance, abstand):
    return {"minecraft:behavior.move_to_block": {
        "priority": 5, "tick_interval": abstand, "start_chance": chance, "search_range": 12,
        "search_height": 5, "goal_radius": 1.6, "stay_duration": 2.0, "speed_multiplier": 1.0,
        "target_blocks": STAEMME, "on_reach": [{"event": "fynn:ziel_erreicht", "target": "self"}]}}


def eigenschaft(*namen):
    return {n: {"type": "bool", "default": False, "client_sync": True} for n in namen}


# ------------------------------------------------------------ Bewegungen

def vogelbewegungen_klein(specht=False):
    """Kleine Voegel schlagen schnell mit den Fluegeln, hopsen am Boden,
    picken und schauen sich ruckartig um."""
    schlag = f"math.sin({LT} * 2600.0) * 55.0"
    fliegen = {"loop": True, "bones": {
        "fluegel_links": {"rotation": [0.0, 0.0, f"-35.0 - {schlag}"]},
        "fluegel_rechts": {"rotation": [0.0, 0.0, f"35.0 + {schlag}"]},
        "rumpf": {"rotation": [f"-query.target_x_rotation * 0.3 + math.sin({LT} * 1300.0) * 3.0", 0.0, 0.0]},
        "fuesse": {"rotation": [65.0, 0.0, 0.0]},
        "schwanz": {"rotation": [f"8.0 + math.sin({LT} * 1300.0) * 6.0", 0.0, 0.0]},
    }}
    hopsen = {"loop": True, "bones": {
        "rumpf": {"position": [0.0, f"math.abs(math.sin({LT} * 720.0)) * 2.0", 0.0]},
        "fuesse": {"rotation": [f"math.sin({LT} * 1440.0) * 12.0", 0.0, 0.0]},
        "schwanz": {"rotation": [f"-math.abs(math.sin({LT} * 720.0)) * 12.0", 0.0, 0.0]},
    }}
    # Am Boden: ruckartig umschauen, ab und zu picken, der Schwanz zuckt.
    picken = puls(90.0, 30, 0.75)
    am_boden = {"loop": True, "bones": {
        "kopf": {"rotation": [f"{picken} * 55.0",
                              f"math.sin(math.floor({LT} * 2.5) * 71.0) * 35.0 * (1.0 - {picken})", 0.0]},
        "schwanz": {"rotation": [f"{puls(70.0, 100, 0.8)} * -30.0", 0.0, 0.0]},
    }}
    b = {
        # Eigene Namen: "fliegen" und "warnen" gehoeren schon Adler und Baer.
        "flattern": (fliegen, "1.0 - query.is_on_ground"),
        "hopsen": (hopsen, "query.is_on_ground * math.clamp(query.modified_move_speed * 4.0, 0.0, 1.0)"),
        "am_boden": (am_boden, f"query.is_on_ground * {STEHT}"),
    }
    if specht:
        # Am Stamm: aufgerichtet, Bauch zum Holz, der Stuetzschwanz drueckt
        # gegen die Rinde - und der Kopf haemmert in Salven.
        salve = f"math.clamp(math.sin({LT} * 110.0) * 3.0 - 1.0, 0.0, 1.0)"
        hieb = f"math.pow(math.abs(math.sin({LT} * 1500.0)), 3.0) * 28.0 * {salve}"
        b["hacken"] = ({"loop": True, "bones": {
            "rumpf": {"rotation": [-78.0, 0.0, 0.0]},
            "kopf": {"rotation": [f"62.0 + {hieb}", 0.0, 0.0]},
            "schwanz": {"rotation": [18.0, 0.0, 0.0]},
            "fuesse": {"rotation": [-50.0, 0.0, 0.0]},
            "fluegel_links": {"rotation": [0.0, 0.0, 0.0]},
            "fluegel_rechts": {"rotation": [0.0, 0.0, 0.0]},
        }}, "query.property('fynn:hackt')")
    else:
        # Der zahme Vogel warnt: aufgeplustert, Kopf hoch, Fluegel zucken.
        b["alarm"] = ({"loop": True, "bones": {
            "rumpf": {"scale": [1.18, 1.12, 1.1]},
            "kopf": {"rotation": [-28.0, f"math.sin({LT} * 1400.0) * 25.0", 0.0]},
            "fluegel_links": {"rotation": [0.0, 0.0, f"-12.0 - math.abs(math.sin({LT} * 1800.0)) * 30.0"]},
            "fluegel_rechts": {"rotation": [0.0, 0.0, f"12.0 + math.abs(math.sin({LT} * 1800.0)) * 30.0"]},
            "schwanz": {"rotation": [f"-25.0 + math.sin({LT} * 1200.0) * 18.0", 0.0, 0.0]},
        }}, "query.property('fynn:warnt')")
        b["sitzen"] = ({"loop": True, "bones": {
            "rumpf": {"position": [0.0, -2.5, 0.0]},
            "fuesse": {"scale": [1.0, 0.35, 1.0]},
        }}, "query.is_sitting")
    return b


def schneckenbewegungen():
    welle = f"math.sin({LT} * 240.0)"
    kriechen = {"loop": True, "bones": {
        "fuss": {"scale": [1.0, 1.0, f"1.0 + {welle} * 0.06"]},
        "kopf": {"rotation": [f"math.sin({LT} * 50.0) * 6.0", f"math.sin({LT} * 37.0) * 14.0", 0.0]},
        "fuehler_links": {"rotation": [f"math.sin({LT} * 90.0) * 14.0", 0.0, f"math.sin({LT} * 70.0) * 10.0"]},
        "fuehler_rechts": {"rotation": [f"math.sin({LT} * 90.0 + 70.0) * 14.0", 0.0,
                                        f"math.sin({LT} * 70.0 + 40.0) * 10.0"]},
    }}
    verstecken = {"loop": True, "bones": {
        "fuss": {"scale": [0.55, 0.6, 0.28]},
        "kopf": {"scale": 0.05},
        "haus": {"position": [0.0, -1.0, 0.0]},
    }}
    return {"kriechen": (kriechen, "1.0"), "verstecken": (verstecken, "query.property('fynn:versteckt')")}


def eichhoernchenbewegungen():
    klettern = {"loop": True, "bones": {
        "body": {"rotation": [-82.0, 0.0, 0.0]},
        "head": {"rotation": [f"20.0 + math.sin({LT} * 300.0) * 6.0", 0.0, 0.0]},
        "leg0": {"rotation": [f"-40.0 + math.sin({LT} * 1100.0) * 35.0", 0.0, 25.0]},
        "leg1": {"rotation": [f"-40.0 - math.sin({LT} * 1100.0) * 35.0", 0.0, -25.0]},
        "leg2": {"rotation": [f"30.0 - math.sin({LT} * 1100.0) * 35.0", 0.0, 25.0]},
        "leg3": {"rotation": [f"30.0 + math.sin({LT} * 1100.0) * 35.0", 0.0, -25.0]},
        "tail": {"rotation": [70.0, f"math.sin({LT} * 400.0) * 15.0", 0.0]},
        "tail2": {"rotation": [30.0, 0.0, 0.0]},
    }}
    graben = {"loop": True, "bones": {
        "body": {"rotation": [18.0, 0.0, 0.0]},
        "head": {"rotation": [35.0, f"math.sin({LT} * 500.0) * 8.0", 0.0]},
        "leg0": {"rotation": [f"-30.0 + math.sin({LT} * 1600.0) * 45.0", 0.0, 0.0]},
        "leg1": {"rotation": [f"-30.0 - math.sin({LT} * 1600.0) * 45.0", 0.0, 0.0]},
        "tail": {"rotation": [f"-10.0 + math.sin({LT} * 800.0) * 10.0", 0.0, 0.0]},
    }}
    # Aufrecht sitzen und knabbern - die Vorderpfoten am Maul.
    knabbern = {"loop": True, "bones": {
        "body": {"rotation": [-50.0, 0.0, 0.0], "position": [0.0, 1.5, 0.0]},
        "head": {"rotation": [f"38.0 + math.sin({LT} * 1600.0) * 4.0", 0.0, 0.0]},
        "leg0": {"rotation": [-10.0, 0.0, -18.0]},
        "leg1": {"rotation": [-10.0, 0.0, 18.0]},
        "leg2": {"rotation": [50.0, 0.0, 0.0]},
        "leg3": {"rotation": [50.0, 0.0, 0.0]},
    }}
    return {
        "klettern": (klettern, "query.property('fynn:klettert')"),
        "graben": (graben, "query.property('fynn:graebt')"),
        "knabbern": (knabbern, f"{STEHT} * query.is_on_ground * {puls(12.0, 150, 0.7)} "
                               "* (1.0 - query.property('fynn:klettert')) * (1.0 - query.property('fynn:graebt'))"),
    }


# ------------------------------------------------------------ Die Tiere

def _singvogel():
    wild = {"minecraft:tameable": {"probability": 0.25, "tame_items": SAMEN,
                                   "tame_event": {"event": "fynn:gezaehmt", "target": "self"}},
            "minecraft:despawn": {"despawn_from_distance": {}}}
    wild.update(flucht(KLEINRAEUBER, spieler=True))
    zahm = {"minecraft:is_tamed": {},
            "minecraft:sittable": {},
            "minecraft:behavior.stay_while_sitting": {"priority": 2},
            "minecraft:behavior.follow_owner": {"priority": 3, "speed_multiplier": 1.2,
                                                "start_distance": 10, "stop_distance": 3}}
    k = vogelflug(0.35)
    k.update(flucht(KLEINRAEUBER))
    k.update({
        "minecraft:behavior.tempt": {"priority": 4, "speed_multiplier": 1.0, "items": SAMEN + ["fynn:kaeferlarve"],
                                     "can_tempt_vertically": True},
        # Drosseln und Rotkehlchen fressen Schnecken - sie picken aufs Haus.
        "minecraft:attack": {"damage": 1},
        "minecraft:behavior.melee_box_attack": {"priority": 5, "speed_multiplier": 1.0},
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 6, "must_see": True, "within_radius": 8, "reselect_targets": True,
            "entity_types": [{"filters": familie("schnecke"), "max_dist": 8}]},
    })
    return {
        "id": "singvogel", "name": ("Singvogel", "Songbird"), "gestalt": "singvogel", "gruppe": "Kleintiere",
        "varianten": [("rotkehlchen", 40), ("blaumeise", 30), ("spatz", 30)],
        "variantennamen": ["Rotkehlchen", "Blaumeise", "Spatz"],
        "art": "kleinvogel", "verhalten": "friedlich", "leben": 4, "tempo": 0.2,
        "kollision": (0.7, 0.7), "skalierung": 0.5, "baby": False, "herde": (2, 4),
        "biome": [["forest"], ["plains"], ["meadow"], ["cherry_grove"], ["taiga"]], "gewicht": 9,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:moss_block"],
        "beute": [("minecraft:feather", 0, 1, 1.0, False)],
        "laute": {"ambient": "mob.parrot.idle", "hurt": "mob.parrot.hurt", "death": "mob.parrot.death",
                  "pitch": [1.6, 1.9]},
        "ei": ("#e0662e", "#7a6446"),
        "komponenten": k, "ohne": ["minecraft:despawn"],
        "gruppen": {"fynn:wild": wild, "fynn:zahm": zahm},
        "ereignisse": {"fynn:gezaehmt": {"remove": {"component_groups": ["fynn:wild"]},
                                         "add": {"component_groups": ["fynn:zahm"]}}},
        "start_gruppen": ["fynn:wild"],
        "eigenschaften": eigenschaft("fynn:warnt"),
        "eigene_bewegungen": vogelbewegungen_klein(),
        "steckbrief_extra": [['Zähmen', 'anschleichen (sonst fliegt er weg) und mit Samen füttern – mit einer Käferlarve sicher'], ['Zahm', 'folgt dir, setzt sich auf Wunsch – und warnt laut, wenn ein Monster in der Nähe ist'], ['Frisst', 'Samen, Käferlarven – und pickt Schnecken']],
    }


def _specht():
    haengt, ereignisse = festhalten()
    k = vogelflug(0.3)
    k.update(flucht(KLEINRAEUBER))
    k.update(zum_stamm(0.7, 160))
    return {
        "id": "specht", "name": ("Buntspecht", "Woodpecker"), "gestalt": "specht", "gruppe": "Kleintiere",
        "varianten": [("maennchen", 50), ("weibchen", 50)],
        "art": "kleinvogel", "verhalten": "friedlich", "leben": 6, "tempo": 0.2,
        "kollision": (0.7, 0.8), "skalierung": 0.55, "baby": False, "herde": (1, 1),
        "biome": [["forest"], ["taiga"], ["roofed"], ["birch"]], "gewicht": 6,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:moss_block", "minecraft:coarse_dirt"],
        "beute": [("minecraft:feather", 0, 2, 1.0, False)],
        "laute": {"ambient": "mob.parrot.idle", "hurt": "mob.parrot.hurt", "death": "mob.parrot.death",
                  "pitch": [1.1, 1.3]},
        "ei": ("#1c1a1a", "#c82626"),
        "komponenten": k,
        "gruppen": {"fynn:haengt": haengt}, "ereignisse": ereignisse,
        "eigenschaften": eigenschaft("fynn:hackt"),
        "eigene_bewegungen": vogelbewegungen_klein(specht=True),
        "steckbrief_extra": [['Besonders', 'fliegt Baumstämme an, hält sich an der Rinde fest und hämmert'], ['Findet', 'beim Hämmern manchmal eine Käferlarve – Futter, mit dem Singvögel sicher zahm werden']],
    }


def _schnecke():
    k = {
        "minecraft:navigation.walk": {"avoid_water": True, "avoid_damage_blocks": True},
        "minecraft:movement.basic": {},
        "minecraft:jump.static": {},
        "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.random_stroll": {"priority": 6, "speed_multiplier": 1.0, "interval": 40},
        # Mit einer Glasflasche: Schneckenschleim. Dann braucht sie zwei
        # Minuten, bis sie wieder genug hat.
        "minecraft:interact": {"interactions": [{
            "on_interact": {"filters": {"all_of": [
                SPIELER, {"test": "has_equipment", "domain": "hand", "subject": "other",
                          "value": "minecraft:glass_bottle"}]}},
            "use_item": True, "transform_to_item": "fynn:schneckenschleim",
            "interact_text": "action.interact.fynn_schleim", "cooldown": 120.0}]},
    }
    im_haus = {"minecraft:movement": {"value": 0.0},
               "minecraft:damage_sensor": {"triggers": [{"cause": "all", "damage_multiplier": 0.25}]}}
    return {
        "id": "schnecke", "name": ("Schnecke", "Snail"), "gestalt": "schnecke", "gruppe": "Kleintiere",
        "varianten": [("weinberg", 60), ("baender", 40)],
        "variantennamen": ["Weinbergschnecke", "Bänderschnecke"],
        "art": "kriecher", "verhalten": "friedlich", "leben": 4, "tempo": 0.035,
        "kollision": (0.8, 0.8), "skalierung": 0.5, "baby": False, "herde": (1, 3),
        "biome": [["forest"], ["swamp"], ["plains"], ["jungle"], ["roofed"]], "gewicht": 7,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:moss_block", "minecraft:mud"],
        "beute": [("fynn:schneckenhaus", 1, 1, 0.6, False), ("fynn:schneckenschleim", 0, 1, 1.0, False)],
        "laute": {"hurt": "mob.slime.small", "death": "mob.slime.small", "pitch": [1.4, 1.6]},
        "ei": ("#c8a47a", "#7a5634"),
        "komponenten": k,
        "gruppen": {"fynn:im_haus": im_haus},
        "ereignisse": {"fynn:verstecken": {"add": {"component_groups": ["fynn:im_haus"]},
                                           "set_property": {"fynn:versteckt": True}},
                       "fynn:hervorkommen": {"remove": {"component_groups": ["fynn:im_haus"]},
                                             "set_property": {"fynn:versteckt": False}}},
        "eigenschaften": eigenschaft("fynn:versteckt"),
        "eigene_bewegungen": schneckenbewegungen(),
        "steckbrief_extra": [['Besonders', 'zieht sich ins Haus zurück, wenn jemand kommt, der nicht schleicht'], ['Glasflasche', 'gibt Schneckenschleim – daraus wird ein Schleimball (alle zwei Minuten)'], ['Haus', 'wird zu drei Knochenmehl']],
    }


FUTTER_EICHHOERNCHEN = ["minecraft:sweet_berries", "minecraft:glow_berries"] + SAMEN


def _eichhoernchen():
    haengt, ereignisse = festhalten()
    k = flucht(KLEINRAEUBER, spieler=True, weite=10)
    k.update(zum_stamm(0.5, 240))
    k["minecraft:behavior.tempt"] = {"priority": 4, "speed_multiplier": 1.1,
                                     "items": FUTTER_EICHHOERNCHEN + ["fynn:nuss"], "can_tempt_vertically": True}
    # Fuettern: Beeren oder Samen - das Skript laesst es dafuer Nuesse bringen.
    k["minecraft:interact"] = {"interactions": [{
        "on_interact": {"filters": {"all_of": [SPIELER, {"any_of": [
            {"test": "has_equipment", "domain": "hand", "subject": "other", "value": f}
            for f in FUTTER_EICHHOERNCHEN]}]}},
        "use_item": True, "interact_text": "action.interact.feed", "cooldown": 20.0}]}
    k["minecraft:damage_sensor"] = {"triggers": [{"cause": "fall", "deals_damage": False}]}
    return {
        "id": "eichhoernchen", "name": ("Eichhörnchen", "Squirrel"), "gestalt": "eichhoernchen",
        "gruppe": "Kleintiere",
        "varianten": [("rot", 70), ("grau", 30)],
        "art": "land", "verhalten": "friedlich", "leben": 6, "tempo": 0.32,
        "kollision": (0.7, 0.9), "skalierung": 0.7, "baby": False, "herde": (1, 2),
        "biome": [["forest"], ["taiga"], ["roofed"], ["birch"]], "gewicht": 7,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:coarse_dirt"],
        "beute": [("fynn:nuss", 0, 2, 1.0, False)],
        "laute": {"ambient": "mob.fox.ambient", "hurt": "mob.fox.hurt", "death": "mob.fox.death",
                  "pitch": [1.7, 2.0]},
        "ei": ("#b4552a", "#f2e6cc"),
        "komponenten": k,
        "gruppen": {"fynn:haengt": haengt}, "ereignisse": ereignisse,
        "eigenschaften": eigenschaft("fynn:klettert", "fynn:graebt"),
        "eigene_bewegungen": eichhoernchenbewegungen(),
        "steckbrief_extra": [['Besonders', 'klettert Baumstämme hinauf und wieder herunter'], ['Füttern', 'mit Beeren oder Samen – dann bringt es ein paar Haselnüsse'], ['Pflanzt', 'vergräbt ab und zu eine Nuss auf freier Wiese – dort wächst ein Setzling']],
    }


KLEINTIERE = [_singvogel(), _specht(), _schnecke(), _eichhoernchen()]
