#!/usr/bin/env python3
"""Baut die zwoelf Tiere: Verhalten, Aussehen, Bewegung, Vorkommen, Beute.

Fynn: "ein paar neue Mobs ... die es auch im echten Leben gibt ... gross,
cool, gefaehrlich ... Codes, wie die sich verhalten, was sie machen, was
die droppen ... Baby-Varianten ... acht an Land, vier im Wasser ... auf die
Biome verteilen ... verschiedene Varianten ... Drops mit unterschiedlicher
Seltenheit ... Check die Lebensraeume."

Die Gestalt jedes Tiers steht in tiere_gestalt.py, der Werkzeugkasten in
tiermodell.py. Hier steht, wie sich die Tiere verhalten und wo sie leben -
jedes als ein Eintrag in TIERE. Die Verhaltensbausteine folgen Mojangs
eigenen Tieren (Beispielpaket bedrock-samples): Der Baer verteidigt seine
Jungen wie der Eisbaer, der Wal taucht zum Atmen auf wie der Delfin, das
Krokodil ist an Land und im Wasser zu Hause wie die Schildkroete.

Wo sie leben (Biom-Merkmale aus Mojangs Biomdateien):

    Braunbaer      Taiga (auch verschneit und Riesentaiga)
    Elch           Taiga, verschneite Taiga
    Wildschwein    Laub- und Birkenwald, dunkler Wald
    Bison          Ebenen und Sonnenblumenebenen; im Schnee im Winterfell
    Loewe          Savanne, in Rudeln
    Tiger          Dschungel und Bambusdschungel, allein
    Krokodil       Sumpf und Mangrovensumpf, an Land und im Wasser
    Schneeleopard  Gipfel, Schneehaenge, Hain - hoch oben im Schnee
    Buckelwal      Ozeane und tiefe Ozeane (nicht gefroren)
    Hai            warme und laue Ozeane
    Riesenkalmar   tiefe Ozeane, unter Hoehe 40, im Dunkeln
    Schwertfisch   warme und laue Ozeane

    python3 werkzeuge/tiere_bauen.py [--bilder ORDNER]
"""

import copy
import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tiere_gestalt as g                               # noqa: E402
import tiermodell as tm                                 # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"


def schreibe(pfad, daten):
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def familie(*namen):
    return {"any_of": [{"test": "is_family", "subject": "other", "value": n} for n in namen]}


SPIELER = {"test": "is_family", "subject": "other", "value": "player"}
KEIN_KREATIV = {"test": "has_ability", "subject": "other", "value": "instabuild", "operator": "!="}


# ------------------------------------------------------------ Die Tiere
#
# verhalten:
#   "neutral"   greift an, wenn man es angreift oder seinen Jungen zu nahe kommt
#   "feindlich" greift Spieler in der Naehe an (reichweite), jagt Beute
#   "friedlich" greift nie an
# art: "land", "amphib" (Krokodil), "fisch" (atmet Wasser), "wal" (atmet Luft)

TIERE = [
    {
        "id": "braunbaer", "name": ("Braunbär", "Brown Bear"), "gestalt": "baer",
        "varianten": [("braun", 60), ("grizzly", 25), ("schwarz", 15)],
        "art": "land", "verhalten": "neutral", "leben": 40, "schaden": 7, "tempo": 0.25,
        "kollision": (1.4, 1.4), "baby": True, "herde": (1, 2),
        # Baeren moegen Honig - wer Honigwaben in der Hand haelt, dem laufen
        # sie nach, und mit Honig bekommen sie Junge.
        "futter": ["minecraft:honeycomb", "minecraft:sweet_berries", "minecraft:salmon"],
        "jagt": ["minecraft:salmon", "minecraft:cod"],
        "biome": [["taiga"]], "gewicht": 4,
        "beute": [("fynn:baerenfleisch", 1, 3, 1.0, True), ("fynn:baerenfell", 1, 1, 0.5, False),
                  ("fynn:baerenkralle", 1, 1, 0.08, False)],
        "laute": {"ambient": "mob.polarbear.idle", "hurt": "mob.polarbear.hurt", "death": "mob.polarbear.death",
                  "step": "mob.polarbear.step", "pitch": [0.7, 0.9]},
        "ei": ("#6b4424", "#c9a26f"), "angriff": "tatze",
    },
    {
        "id": "elch", "name": ("Elch", "Moose"), "gestalt": "elch",
        "varianten": [("bulle", 50), ("kuh", 50)], "baby_textur": "kalb",
        "art": "land", "verhalten": "neutral", "leben": 36, "schaden": 6, "tempo": 0.23,
        "kollision": (1.5, 2.3), "baby": True, "herde": (1, 3), "stoss": 1.6,
        "futter": ["minecraft:apple", "minecraft:sweet_berries"],
        "biome": [["taiga"]], "gewicht": 4,
        "beute": [("fynn:elchfleisch", 1, 3, 1.0, True), ("minecraft:leather", 0, 2, 1.0, False)],
        # Das Geweih verlieren nur die Bullen - das entscheidet tiere.js,
        # denn eine Beuteliste weiss nicht, welche Variante gestorben ist.
        "laute": {"ambient": "mob.cow.say", "hurt": "mob.cow.hurt", "death": "mob.cow.hurt",
                  "step": "mob.cow.step", "pitch": [0.45, 0.6]},
        "ei": ("#3e2a1a", "#d8c8a0"), "angriff": "stoss",
        "zeigen": {"geweih": "query.variant == 0 && !query.is_baby"},
    },
    {
        "id": "wildschwein", "name": ("Wildschwein", "Wild Boar"), "gestalt": "wildschwein",
        "varianten": [("erwachsen", 100)], "baby_textur": "frischling",
        "art": "land", "verhalten": "feindlich", "reichweite": 5, "leben": 22, "schaden": 5, "tempo": 0.27,
        "kollision": (0.9, 0.9), "baby": True, "herde": (2, 4), "stoss": 1.2,
        "futter": ["minecraft:carrot", "minecraft:potato", "minecraft:beetroot", "minecraft:apple"],
        "biome": [["forest", "!taiga", "!mountains"]], "gewicht": 6,
        "beute": [("fynn:wildschweinfleisch", 1, 3, 1.0, True), ("fynn:wildschweinhauer", 1, 1, 0.12, False)],
        "laute": {"ambient": "mob.hoglin.ambient", "hurt": "mob.hoglin.hurt", "death": "mob.hoglin.death",
                  "step": "mob.hoglin.step", "pitch": [1.0, 1.2]},
        "ei": ("#4a3c30", "#a88478"), "angriff": "stoss",
    },
    {
        "id": "bison", "name": ("Bison", "Bison"), "gestalt": "bison",
        "varianten": [("prarie", 100), ("winter", 0)], "baby_textur": "kalb",
        "art": "land", "verhalten": "neutral", "herdenwut": True, "leben": 45, "schaden": 6, "tempo": 0.22,
        "kollision": (1.6, 1.9), "baby": True, "herde": (3, 6), "stoss": 2.0,
        "futter": ["minecraft:wheat"],
        "biome": [["plains"], ["ice_plains", "!mutated"]], "gewicht": 7,
        # Im Schnee tragen sie Raureif auf dem Fell.
        "variante_nach_biom": {"frozen": 1},
        "beute": [("fynn:bisonfleisch", 2, 4, 1.0, True), ("fynn:bisonfell", 1, 1, 0.4, False),
                  ("fynn:bisonhorn", 1, 1, 0.1, False)],
        "laute": {"ambient": "mob.cow.say", "hurt": "mob.cow.hurt", "death": "mob.cow.hurt",
                  "step": "mob.cow.step", "pitch": [0.35, 0.5]},
        "ei": ("#3a2618", "#7a5636"), "angriff": "stoss",
    },
    {
        "id": "loewe", "name": ("Löwe", "Lion"), "gestalt": "loewe",
        "varianten": [("loewe", 35), ("loewin", 65)], "baby_textur": "junges",
        "art": "land", "verhalten": "feindlich", "reichweite": 8, "nachts": 16,
        "leben": 32, "schaden": 7, "tempo": 0.3,
        "kollision": (1.1, 1.3), "baby": True, "herde": (2, 4),
        "futter": ["minecraft:beef", "minecraft:mutton", "minecraft:porkchop"],
        "jagt": ["minecraft:cow", "minecraft:sheep", "minecraft:pig", "minecraft:horse", "minecraft:donkey"],
        "biome": [["savanna"]], "gewicht": 5,
        "beute": [("fynn:loewenfell", 1, 1, 0.35, False), ("fynn:loewenzahn", 1, 1, 0.15, False)],
        "laute": {"ambient": "mob.polarbear.warning", "hurt": "mob.cat.hit", "death": "mob.polarbear.death",
                  "step": "mob.polarbear.step", "pitch": [0.75, 0.9]},
        "ei": ("#d8a864", "#6a3e1a"), "angriff": "tatze", "springt": True,
        "zeigen": {"maehne": "query.variant == 0 && !query.is_baby"},
    },
    {
        "id": "tiger", "name": ("Tiger", "Tiger"), "gestalt": "tiger",
        "varianten": [("orange", 95), ("weiss", 5)],
        "art": "land", "verhalten": "feindlich", "reichweite": 10, "leben": 32, "schaden": 8, "tempo": 0.3,
        "kollision": (1.1, 1.2), "baby": True, "herde": (1, 1),
        "futter": ["minecraft:beef", "minecraft:porkchop", "minecraft:chicken"],
        "jagt": ["minecraft:pig", "minecraft:chicken", "minecraft:ocelot", "minecraft:panda"],
        "biome": [["jungle"]], "gewicht": 3,
        "beute": [("fynn:tigerfell", 1, 1, 0.35, False), ("fynn:tigerkralle", 1, 1, 0.12, False)],
        "laute": {"ambient": "mob.polarbear.warning", "hurt": "mob.cat.hit", "death": "mob.polarbear.death",
                  "step": "mob.polarbear.step", "pitch": [0.85, 1.0]},
        "ei": ("#e8923a", "#1c1410"), "angriff": "tatze", "springt": True,
    },
    {
        "id": "krokodil", "name": ("Krokodil", "Crocodile"), "gestalt": "krokodil",
        "varianten": [("alt", 100)], "baby_textur": "jung",
        "art": "amphib", "verhalten": "feindlich", "reichweite": 7, "leben": 30, "schaden": 8, "tempo": 0.17,
        "wassertempo": 0.09, "kollision": (1.2, 0.6), "baby": True, "herde": (1, 2),
        "futter": ["minecraft:cod", "minecraft:salmon", "minecraft:chicken"],
        "jagt": ["minecraft:chicken", "minecraft:pig", "minecraft:cod", "minecraft:salmon", "minecraft:frog"],
        "biome": [["swamp"], ["mangrove_swamp"]], "gewicht": 5,
        "beute": [("fynn:krokodilfleisch", 1, 2, 1.0, True), ("fynn:krokodilleder", 1, 1, 0.5, False),
                  ("fynn:krokodilzahn", 1, 1, 0.12, False)],
        "laute": {"ambient": "mob.turtle.ambient", "hurt": "mob.turtle.hurt", "death": "mob.turtle.death",
                  "step": "mob.turtle.step", "pitch": [0.4, 0.55]},
        "ei": ("#3e4a22", "#d8cf9c"), "angriff": "biss",
    },
    {
        "id": "schneeleopard", "name": ("Schneeleopard", "Snow Leopard"), "gestalt": "schneeleopard",
        "varianten": [("grau", 100)],
        "art": "land", "verhalten": "feindlich", "reichweite": 6, "leben": 24, "schaden": 6, "tempo": 0.32,
        "kollision": (0.9, 1.0), "baby": True, "herde": (1, 1),
        "futter": ["minecraft:mutton", "minecraft:rabbit"],
        "jagt": ["minecraft:goat", "minecraft:rabbit", "minecraft:sheep"],
        "biome": [["frozen_peaks"], ["jagged_peaks"], ["snowy_slopes"], ["grove"]], "gewicht": 4,
        "beute": [("fynn:schneeleopardenfell", 1, 1, 0.4, False)],
        "laute": {"ambient": "mob.ocelot.idle", "hurt": "mob.cat.hit", "death": "mob.ocelot.death",
                  "pitch": [0.55, 0.7]},
        "ei": ("#e0e0dc", "#4a4844"), "angriff": "tatze", "springt": True, "kaelte": True,
    },
    {
        "id": "wal", "name": ("Buckelwal", "Humpback Whale"), "gestalt": "wal",
        "varianten": [("hell", 60), ("dunkel", 40)], "baby_textur": "kalb",
        "art": "wal", "verhalten": "friedlich", "leben": 100, "tempo": 0.06, "wassertempo": 0.06,
        "kollision": (3.0, 2.2), "baby": True, "herde": (1, 2), "luft": 1200,
        "futter": ["minecraft:cod", "minecraft:salmon"],
        "biome": [["ocean", "!frozen", "!warm"]], "gewicht": 2, "wasser": True,
        "beute": [("fynn:walbarte", 1, 3, 1.0, False), ("fynn:ambra", 1, 1, 0.05, False)],
        "laute": {"ambient": "mob.elderguardian.idle", "hurt": "mob.dolphin.hurt", "death": "mob.dolphin.death",
                  "pitch": [0.3, 0.45]},
        "ei": ("#1e2328", "#e6eaec"),
    },
    {
        "id": "hai", "name": ("Hai", "Shark"), "gestalt": "hai",
        "varianten": [("weisser_hai", 50), ("tigerhai", 30), ("hammerhai", 20)],
        "art": "fisch", "verhalten": "feindlich", "reichweite": 12, "blut": 24,
        "leben": 34, "schaden": 7, "tempo": 0.12, "wassertempo": 0.16,
        "kollision": (1.2, 0.8), "baby": False, "herde": (1, 2),
        "jagt": ["minecraft:cod", "minecraft:salmon", "minecraft:tropicalfish", "minecraft:squid",
                 "minecraft:dolphin", "minecraft:turtle"],
        "biome": [["ocean", "warm"], ["ocean", "lukewarm"]], "gewicht": 4, "wasser": True,
        "beute": [("fynn:haifleisch", 1, 2, 1.0, True), ("fynn:haihaut", 1, 1, 0.35, False),
                  ("fynn:haizahn", 1, 2, 0.15, False)],
        "laute": {"hurt": "mob.fish.hurt", "death": "mob.fish.hurt", "flop": "mob.fish.flop", "pitch": [0.5, 0.6]},
        "ei": ("#5a6670", "#eef0f0"), "angriff": "biss",
        "zeigen": {"hammer": "query.variant == 2"},
    },
    {
        "id": "riesenkalmar", "name": ("Riesenkalmar", "Giant Squid"), "gestalt": "riesenkalmar",
        "varianten": [("rot", 100)],
        "art": "fisch", "verhalten": "feindlich", "reichweite": 10, "leben": 50, "schaden": 6,
        "tempo": 0.1, "wassertempo": 0.1, "kollision": (1.6, 1.0), "baby": False, "herde": (1, 1),
        "jagt": ["minecraft:squid", "minecraft:cod", "minecraft:salmon"],
        "biome": [["ocean", "deep"]], "gewicht": 3, "wasser": True, "tief": 40,
        "beute": [("fynn:kalmarfleisch", 2, 3, 1.0, True), ("minecraft:ink_sac", 1, 3, 1.0, False),
                  ("fynn:kalmarauge", 1, 1, 0.1, False)],
        "laute": {"ambient": "mob.squid.ambient", "hurt": "mob.squid.hurt", "death": "mob.squid.death",
                  "pitch": [0.4, 0.5]},
        "ei": ("#8a2a34", "#e8a0a0"), "angriff": "arme",
    },
    {
        "id": "schwertfisch", "name": ("Schwertfisch", "Swordfish"), "gestalt": "schwertfisch",
        "varianten": [("blau", 100)],
        "art": "fisch", "verhalten": "neutral", "leben": 18, "schaden": 6, "tempo": 0.12, "wassertempo": 0.2,
        "kollision": (0.9, 0.6), "baby": False, "herde": (1, 3), "stoss": 1.0,
        "jagt": ["minecraft:cod", "minecraft:salmon", "minecraft:tropicalfish"],
        "biome": [["ocean", "warm"], ["ocean", "lukewarm"]], "gewicht": 5, "wasser": True,
        "beute": [("fynn:schwertfischfilet", 1, 2, 1.0, True), ("fynn:schwertfischspiess", 1, 1, 0.15, False)],
        "laute": {"hurt": "mob.fish.hurt", "death": "mob.fish.hurt", "flop": "mob.fish.flop", "pitch": [0.8, 1.0]},
        "ei": ("#2e2644", "#c4ccd4"), "angriff": "spiess",
    },
]


# ------------------------------------------------------------ Verhalten

def lava():
    return {"damage_conditions": [{"filters": {"test": "in_lava", "subject": "self", "operator": "==", "value": True},
                                   "cause": "lava", "damage_per_tick": 4}]}


def angriffsziele(t):
    """Wen ein feindliches Tier angreift."""
    ziele = []
    r = t.get("reichweite", 8)
    if t["art"] in ("fisch",):
        # Im Wasser: nur Spieler, die auch im Wasser sind. Wer blutet (wenig
        # Leben), den wittert der Hai auch von weiter her.
        ziele.append({"filters": {"all_of": [SPIELER, KEIN_KREATIV,
                                              {"test": "in_water", "subject": "other", "value": True}]},
                      "max_dist": r})
        if t.get("blut"):
            ziele.append({"filters": {"all_of": [SPIELER, KEIN_KREATIV,
                                                  {"test": "in_water", "subject": "other", "value": True},
                                                  {"test": "actor_health", "subject": "other",
                                                   "operator": "<", "value": 10}]},
                          "max_dist": t["blut"]})
    else:
        tag = {"filters": {"all_of": [SPIELER, KEIN_KREATIV]}, "max_dist": r}
        ziele.append(tag)
        if t.get("nachts"):
            # Loewen jagen in der Daemmerung und nachts - dann sehen sie weiter.
            ziele.append({"filters": {"all_of": [SPIELER, KEIN_KREATIV,
                                                  {"test": "is_daytime", "value": False}]},
                          "max_dist": t["nachts"]})
    if t.get("jagt"):
        ziele.append({"filters": familie(*[n.split(":")[1] for n in t["jagt"]]), "max_dist": 12})
    return ziele


def angriffsbausteine(t, prio=2):
    b = {
        "minecraft:attack": {"damage": t["schaden"]},
        "minecraft:behavior.melee_box_attack": {"priority": prio, "speed_multiplier": 1.3, "track_target": True},
    }
    if t.get("springt"):
        # Grosskatzen springen ihre Beute an.
        b["minecraft:behavior.leap_at_target"] = {"priority": prio - 1, "yd": 0.4, "must_be_on_ground": True}
    if t.get("stoss"):
        b["minecraft:attack"]["effect_name"] = "slowness"
        b["minecraft:attack"]["effect_duration"] = 1
    return b


def verhalten(t, varianten_namen):
    kennung = f"fynn:{t['id']}"
    art = t["art"]
    wasser = art in ("fisch", "wal")
    c = {
        "minecraft:type_family": {"family": [t["id"], "fynn_tier", "mob"] + (["aquatic"] if wasser else [])},
        "minecraft:health": {"value": t["leben"], "max": t["leben"]},
        "minecraft:collision_box": {"width": t["kollision"][0], "height": t["kollision"][1]},
        "minecraft:movement": {"value": t["tempo"]},
        "minecraft:hurt_on_condition": lava(),
        "minecraft:nameable": {},
        "minecraft:physics": {},
        "minecraft:pushable_by_entity": {},
        "minecraft:pushable_by_block": {},
        "minecraft:jump.static": {},
        "minecraft:follow_range": {"value": 24, "max": 24},
        "minecraft:despawn": {"despawn_from_distance": {}},
        "minecraft:conditional_bandwidth_optimization": {},
        "minecraft:experience_reward": {"on_death": "query.last_hit_by_player ? Math.Random(1,3) : 0"},
        "minecraft:behavior.random_look_around": {"priority": 9},
    }
    if t["verhalten"] != "friedlich":
        c["minecraft:behavior.hurt_by_target"] = {"priority": 1}

    # --- Bewegung
    if art == "land":
        c.update({
            "minecraft:navigation.walk": {"can_path_over_water": True, "avoid_damage_blocks": True},
            "minecraft:movement.basic": {},
            "minecraft:can_climb": {},
            "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
            "minecraft:leashable": {"soft_distance": 4.0, "hard_distance": 6.0, "max_distance": 10.0},
            "minecraft:behavior.float": {"priority": 0},
            "minecraft:behavior.random_stroll": {"priority": 6, "speed_multiplier": 0.8},
            "minecraft:behavior.look_at_player": {"priority": 7, "look_distance": 8, "probability": 0.02},
        })
        if t.get("kaelte"):
            c["minecraft:freezing_immune"] = {}
    elif art == "amphib":
        c.update({
            "minecraft:navigation.generic": {"is_amphibious": True, "can_path_over_water": False, "can_swim": True,
                                             "can_walk": True, "can_sink": False, "avoid_damage_blocks": True},
            "minecraft:movement.amphibious": {"max_turn": 10.0},
            "minecraft:underwater_movement": {"value": t["wassertempo"]},
            "minecraft:breathable": {"total_supply": 60, "suffocate_time": 0, "breathes_water": True,
                                     "breathes_air": True, "generates_bubbles": False},
            "minecraft:leashable": {"soft_distance": 4.0, "hard_distance": 6.0, "max_distance": 10.0},
            "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 0.8, "interval": 60},
            "minecraft:behavior.random_swim": {"priority": 6, "interval": 0, "xz_dist": 16, "y_dist": 4},
            "minecraft:behavior.look_at_player": {"priority": 8, "look_distance": 8, "probability": 0.02},
        })
    elif art == "fisch":
        c.update({
            "minecraft:navigation.generic": {"is_amphibious": False, "can_path_over_water": False, "can_swim": True,
                                             "can_walk": False, "can_breach": False, "can_sink": False},
            "minecraft:movement.sway": {"sway_amplitude": 0},
            "minecraft:underwater_movement": {"value": t["wassertempo"]},
            # Atmet Wasser - an Land erstickt er wie ein Fisch.
            "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0, "breathes_water": True,
                                     "breathes_air": False},
            "minecraft:behavior.random_swim": {"priority": 5, "interval": 0, "xz_dist": 16, "y_dist": 4,
                                               "speed_multiplier": 1.0},
            "minecraft:behavior.swim_idle": {"priority": 7, "idle_time": 3.0, "success_rate": 0.1},
        })
    elif art == "wal":
        c.update({
            "minecraft:navigation.generic": {"is_amphibious": True, "can_path_over_water": True, "can_swim": True,
                                             "can_walk": False, "can_breach": True, "can_sink": False},
            "minecraft:underwater_movement": {"value": t["wassertempo"]},
            "minecraft:movement.sway": {"sway_amplitude": 0},
            # Wale atmen Luft - alle Minute muessen sie hoch.
            "minecraft:breathable": {"total_supply": t["luft"], "suffocate_time": 0, "breathes_air": True,
                                     "breathes_water": False, "generates_bubbles": False},
            "minecraft:behavior.swim_up_for_breath": {"priority": 1},
            "minecraft:behavior.move_to_water": {"priority": 1, "search_range": 15, "search_height": 5},
            "minecraft:behavior.random_swim": {"priority": 5, "interval": 0, "xz_dist": 24, "y_dist": 6},
            "minecraft:behavior.random_breach": {"priority": 6, "interval": 200, "xz_dist": 6, "cooldown_time": 20.0},
        })

    # --- Verhalten und Junge
    gruppen = {}
    ereignisse = {}
    erwachsen, baby = "fynn:erwachsen", "fynn:baby"
    gruppen[erwachsen] = {"minecraft:loot": {"table": f"loot_tables/entities/{t['id']}.json"}}

    if t["verhalten"] == "neutral":
        # Wie Mojangs Eisbaer: ruhig, bis man es angreift - oder bis man einem
        # Jungen zu nahe kommt. Dann ruft das Junge, und die Alten kommen.
        gruppen["fynn:ruhig"] = {
            "minecraft:on_target_acquired": {"event": "fynn:wuetend", "target": "self"},
            "minecraft:on_friendly_anger": {"event": "fynn:wuetend", "target": "self"},
        }
        wut = {"minecraft:angry": {"duration": 400, "broadcast_anger": bool(t.get("herdenwut")),
                                   "broadcast_range": 16,
                                   "broadcast_targets": [t["id"]],
                                   "calm_event": {"event": "fynn:beruhigt", "target": "self"}}}
        wut.update(angriffsbausteine(t))
        gruppen["fynn:wuetend"] = wut
        ereignisse["fynn:wuetend"] = {"remove": {"component_groups": ["fynn:ruhig"]},
                                       "add": {"component_groups": ["fynn:wuetend"]}}
        ereignisse["fynn:beruhigt"] = {"remove": {"component_groups": ["fynn:wuetend"]},
                                        "add": {"component_groups": ["fynn:ruhig"]}}
    elif t["verhalten"] == "feindlich":
        f = {"minecraft:behavior.nearest_attackable_target": {"priority": 3, "must_see": True, "reselect_targets": True,
                                                              "within_radius": 24, "entity_types": angriffsziele(t)}}
        f.update(angriffsbausteine(t))
        gruppen["fynn:jagd"] = f
    else:
        c["minecraft:behavior.panic"] = {"priority": 1, "speed_multiplier": 1.3}

    erwachsen_liste = [erwachsen] + (["fynn:ruhig"] if t["verhalten"] == "neutral" else []) + \
                      (["fynn:jagd"] if t["verhalten"] == "feindlich" else [])

    if t.get("baby"):
        gruppen[baby] = {
            "minecraft:is_baby": {},
            "minecraft:scale": {"value": 0.5},
            "minecraft:ageable": {"duration": 1200, "feed_items": t.get("futter", []),
                                  "grow_up": {"event": "minecraft:ageable_grow_up", "target": "self"}},
            "minecraft:behavior.follow_parent": {"priority": 4, "speed_multiplier": 1.2},
            "minecraft:behavior.panic": {"priority": 1, "speed_multiplier": 1.4},
        }
        if t["verhalten"] != "friedlich" and not wasser:
            # Ein Junges, dem ein Spieler zu nahe kommt, ruft die Alten.
            gruppen[baby]["minecraft:behavior.nearest_attackable_target"] = {
                "priority": 5, "entity_types": [{"filters": {"all_of": [SPIELER, KEIN_KREATIV]}, "max_dist": 6}]}
            gruppen[baby]["minecraft:on_target_acquired"] = {"event": "fynn:junges_ruft", "target": "self"}
            gruppen["fynn:junges_ruft"] = {"minecraft:angry": {
                "duration": 1, "broadcast_anger": True, "broadcast_range": 20, "broadcast_targets": [t["id"]],
                "calm_event": {"event": "fynn:junges_still", "target": "self"}}}
            ereignisse["fynn:junges_ruft"] = {"add": {"component_groups": ["fynn:junges_ruft"]}}
            ereignisse["fynn:junges_still"] = {"remove": {"component_groups": ["fynn:junges_ruft"]}}
            if t["verhalten"] == "feindlich":
                # Feindliche Alte greifen ohnehin an; ruft ein Junges, werden
                # sie wuetend auch ueber ihre Reichweite hinaus.
                gruppen["fynn:jagd"]["minecraft:on_friendly_anger"] = {"event": "fynn:mutter", "target": "self"}
                gruppen["fynn:mutter"] = {"minecraft:angry": {"duration": 200, "broadcast_anger": False,
                                                               "calm_event": {"event": "fynn:mutter_ruhig",
                                                                              "target": "self"}}}
                ereignisse["fynn:mutter"] = {"add": {"component_groups": ["fynn:mutter"]}}
                ereignisse["fynn:mutter_ruhig"] = {"remove": {"component_groups": ["fynn:mutter"]}}
        ereignisse["minecraft:ageable_grow_up"] = {"remove": {"component_groups": [baby, "fynn:junges_ruft"]},
                                                   "add": {"component_groups": erwachsen_liste}}
        ereignisse["minecraft:entity_born"] = {"add": {"component_groups": [baby]}}
        if t.get("futter"):
            c["minecraft:breedable"] = {"require_tame": False, "breed_items": t["futter"],
                                        "breeds_with": {"mate_type": kennung, "baby_type": kennung,
                                                        "breed_event": {"event": "minecraft:entity_born",
                                                                        "target": "baby"}}}
            c["minecraft:behavior.breed"] = {"priority": 3, "speed_multiplier": 1.0}
    if t.get("futter"):
        c["minecraft:behavior.tempt"] = {"priority": 4, "speed_multiplier": 1.1, "items": t["futter"],
                                         "can_tempt_vertically": True}

    # --- Varianten
    for i, _ in enumerate(varianten_namen):
        gruppen[f"fynn:variante_{i}"] = {"minecraft:variant": {"value": i}}

    zufall = [{"weight": w, "add": {"component_groups": [f"fynn:variante_{i}"]}}
              for i, (_, w) in enumerate(t["varianten"]) if w > 0]
    alter = [{"weight": 88, "add": {"component_groups": erwachsen_liste}}]
    if t.get("baby"):
        alter.append({"weight": 12, "add": {"component_groups": [baby]}})
    folge = []
    if t.get("variante_nach_biom"):
        for merkmal, v in t["variante_nach_biom"].items():
            folge.append({"filters": {"test": "has_biome_tag", "value": merkmal},
                          "add": {"component_groups": [f"fynn:variante_{v}"]}})
        folge.append({"filters": {"none_of": [{"test": "has_biome_tag", "value": m}
                                              for m in t["variante_nach_biom"]]},
                      "randomize": zufall})
    else:
        folge.append({"randomize": zufall})
    folge.append({"randomize": alter})
    ereignisse["minecraft:entity_spawned"] = {"sequence": folge}
    if t.get("baby"):
        ereignisse["minecraft:entity_born"] = {"sequence": [{"add": {"component_groups": [baby]}},
                                                            {"randomize": zufall}]}

    return {
        "format_version": "1.26.30",
        "minecraft:entity": {
            "description": {"identifier": kennung, "spawn_category": "water_creature" if wasser else "creature",
                            "is_spawnable": True, "is_summonable": True},
            "component_groups": gruppen,
            "components": c,
            "events": ereignisse,
        },
    }


def beuteliste(eintraege):
    """(Gegenstand, min, max, Chance, briet) -> Beuteliste. Seltenes nur vom
    Spieler (killed_by_player) und mit Pluenderung etwas haeufiger; Fleisch
    kommt gebraten heraus, wenn das Tier brennt - wie bei Mojangs Kuh."""
    toepfe = []
    for name, lo, hi, chance, briet in eintraege:
        funktionen = [{"function": "set_count", "count": {"min": lo, "max": hi}},
                      {"function": "looting_enchant", "count": {"min": 0, "max": 1}}]
        if briet:
            funktionen.append({"function": "furnace_smelt", "conditions": [
                {"condition": "entity_properties", "entity": "this", "properties": {"on_fire": True}}]})
        topf = {"rolls": 1, "entries": [{"type": "item", "name": name, "weight": 1, "functions": funktionen}]}
        if chance < 1.0:
            topf["conditions"] = [{"condition": "killed_by_player"},
                                  {"condition": "random_chance_with_looting", "chance": chance,
                                   "looting_multiplier": round(chance / 4, 3)}]
        toepfe.append(topf)
    return {"pools": toepfe}


def spawnregel(t):
    bedingungen = []
    for merkmale in t["biome"]:
        filt = [{"test": "has_biome_tag", "operator": "!=" if m.startswith("!") else "==", "value": m.lstrip("!")}
                for m in merkmale]
        b = {"minecraft:weight": {"default": t["gewicht"]},
             "minecraft:herd": {"min_size": t["herde"][0], "max_size": t["herde"][1]},
             "minecraft:biome_filter": filt}
        if t.get("wasser"):
            b["minecraft:spawns_underwater"] = {}
            b["minecraft:height_filter"] = {"min": -20 if t.get("tief") else 30, "max": t.get("tief", 62)}
            b["minecraft:density_limit"] = {"surface": 2 if t["id"] == "wal" else 4, "underground": 1}
            if t.get("tief"):
                b["minecraft:brightness_filter"] = {"min": 0, "max": 6, "adjust_for_weather": False}
        else:
            b["minecraft:spawns_on_surface"] = {}
            b["minecraft:brightness_filter"] = {"min": 7, "max": 15, "adjust_for_weather": False}
            b["minecraft:density_limit"] = {"surface": 4}
        bedingungen.append(b)
    if t["art"] == "amphib":
        # Krokodile auch im flachen Sumpfwasser.
        for merkmale in t["biome"]:
            bedingungen.append({"minecraft:spawns_underwater": {}, "minecraft:weight": {"default": t["gewicht"]},
                                "minecraft:herd": {"min_size": 1, "max_size": 1},
                                "minecraft:height_filter": {"min": 55, "max": 64},
                                "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==",
                                                            "value": merkmale[0]}]})
    return {"format_version": "1.8.0", "minecraft:spawn_rules": {
        "description": {"identifier": f"fynn:{t['id']}",
                        "population_control": "water_animal" if t.get("wasser") else "animal"},
        "conditions": bedingungen}}


# ------------------------------------------------------------ Bewegung

def bewegungen(t, modell):
    """Animationen je nach Bauart. Knochen, die es im Modell gibt, bestimmen,
    was sich bewegt.

    Zweite Fassung (Fynn: "Animation noch mal ein bisschen besser machen,
    dass sie noch kranker sind"):
    * Gehen: Beine im Kreuzgang, dazu wippt der Koerper, der Kopf nickt im
      Takt, der Schwanz schwingt.
    * Rennen: ab etwa halbem Tempo geht es in den Galopp ueber - Vorder-
      und Hinterbeine springen paarweise, der Koerper schaukelt.
    * Stehen: atmen, sich umschauen, der Schwanz pendelt.
    * Angriff: Baeren und Katzen richten sich auf und schlagen mit beiden
      Tatzen, Elch, Bison und Wildschwein senken den Kopf und rammen,
      Krokodil und Hai reissen das Maul auf und stossen vor, der
      Schwertfisch schlaegt mit dem Schwert zur Seite, der Kalmar reisst
      die Arme auf und schlaegt sie zusammen.
    """
    da = {k.name for k in modell.knochen}
    a = {}
    art = t["art"]
    name = t["id"]
    kopf = "head" if "head" in da else ("kopf" if "kopf" in da else None)
    schwanzkette = [k for k in ("tail", "tail2") if k in da]
    if art in ("land", "amphib"):
        beinlaenge = next(k for k in modell.knochen if k.name == "leg0").kaesten[0].groesse[1]
        schritt = round(38.17 * (12.0 / max(6.0, beinlaenge)), 2)
        winkel = 22.0 if art == "amphib" else 36.0
        T = f"query.anim_time * {schritt}"
        extra = {
            "body": {"position": [0.0, f"math.abs(math.cos({T})) * 0.8 - 0.4", 0.0],
                     "rotation": [f"math.sin({T} * 2.0) * 1.5", 0.0, f"math.cos({T}) * 1.5"]},
        }
        if kopf:
            extra[kopf] = {"rotation": [f"math.sin({T} * 2.0 + 40.0) * 4.0", f"math.cos({T}) * 3.0", 0.0]}
        for i, k in enumerate(schwanzkette):
            extra[k] = {"rotation": [f"math.cos({T} * 2.0) * 5.0", f"math.sin({T} - {30 * i}) * {12 + 6 * i}", 0.0]}
        if "schwanz1" in da:
            for i, k in enumerate(("schwanz1", "schwanz2", "schwanz3")):
                extra[k] = {"rotation": [0.0, f"math.sin({T} - {40 * i}) * {8 + 5 * i}", 0.0]}
        a["laufen"] = tm.lauf_animation(g.VIERBEINER, schritt=schritt, winkel=winkel, extra=extra)
        if art == "land":
            # Galopp: vorn beide zugleich, hinten beide zugleich, versetzt.
            g_winkel = winkel * 1.35
            galopp = {
                "leg0": {"rotation": [f"math.cos({T}) * {g_winkel}", 0.0, 0.0]},
                "leg1": {"rotation": [f"math.cos({T} - 20.0) * {g_winkel}", 0.0, 0.0]},
                "leg2": {"rotation": [f"math.cos({T} + 180.0) * {g_winkel}", 0.0, 0.0]},
                "leg3": {"rotation": [f"math.cos({T} + 160.0) * {g_winkel}", 0.0, 0.0]},
                "body": {"rotation": [f"math.sin({T}) * 7.0", 0.0, 0.0],
                         "position": [0.0, f"math.abs(math.sin({T})) * 1.5", 0.0]},
            }
            if kopf:
                galopp[kopf] = {"rotation": [f"-math.sin({T}) * 6.0", 0.0, 0.0]}
            for i, k in enumerate(schwanzkette):
                galopp[k] = {"rotation": [f"-20.0 + math.sin({T} * 2.0) * 8.0", 0.0, 0.0]}
            a["galopp"] = {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": galopp}
        a["stehen"] = {"loop": True, "bones": {
            "body": {"scale": [1.0, "1.0 + math.sin(query.life_time * 60.0) * 0.012", 1.0]}}}
        if kopf:
            # Umschauen: langsam und nicht ganz regelmaessig (zwei Wellen).
            a["stehen"]["bones"][kopf] = {"rotation": [
                "math.sin(query.life_time * 17.0) * 3.0",
                "math.sin(query.life_time * 23.0) * 9.0 + math.sin(query.life_time * 61.0) * 3.0", 0.0]}
        for i, k in enumerate(schwanzkette):
            a["stehen"]["bones"][k] = {"rotation": [0.0, f"math.sin(query.life_time * 70.0 - {40 * i}) * {8 + 6 * i}",
                                                    0.0]}
        if "schwanz1" in da:
            for i, k in enumerate(("schwanz1", "schwanz2", "schwanz3")):
                a["stehen"]["bones"][k] = {"rotation": [0.0, f"math.sin(query.life_time * 40.0 - {40 * i}) * {3 + 3 * i}",
                                                        0.0]}
        a["blick"] = "animation.common.look_at_target"
        if art == "amphib":
            # Im Wasser: Beine angelegt, der Schwanz treibt.
            a["schwimmen"] = {"loop": True, "bones": {
                k: {"rotation": [0.0, "math.sin(query.life_time * 200.0 - %d) * %.1f" % (50 * i, 14 + 8 * i), 0.0]}
                for i, k in enumerate(("schwanz1", "schwanz2", "schwanz3"))}}
            a["schwimmen"]["bones"]["body"] = {"rotation": [0.0, "math.sin(query.life_time * 200.0 + 90.0) * 4.0", 0.0]}
            for bein in ("leg0", "leg1", "leg2", "leg3"):
                a["schwimmen"]["bones"][bein] = {"rotation": [70.0, 0.0, 0.0]}
    else:
        # Im Wasser: Fische schlagen seitlich (um y), Wale auf und ab (um x).
        kette = [k for k in ("schwanz1", "schwanz2", "fluke", "schwanzflosse") if k in da]
        achse = 0 if art == "wal" else 1
        tempo = 90.0 if art == "wal" else 260.0
        staerke = "(0.6 + query.modified_move_speed * 1.2)"
        knochen = {}
        for i, k in enumerate(kette):
            w = [0.0, 0.0, 0.0]
            amp = (6 + 5 * i) if art == "wal" else (9 + 8 * i)
            w[achse] = f"math.sin(query.life_time * {tempo} - {45 * i}) * {amp} * {staerke}"
            knochen[k] = {"rotation": w}
        for seite, zeichen in (("flosse_links", 1), ("flosse_rechts", -1)):
            if seite in da:
                knochen[seite] = {"rotation": [f"math.sin(query.life_time * {tempo * 0.5}) * 6.0",
                                               0.0, f"math.sin(query.life_time * {tempo * 0.7}) * {12 * zeichen}"]}
        if kopf and art != "wal" and "mantel" not in da:
            # Der Kopf pendelt gegen den Schwanz - so schwimmt ein Fisch.
            knochen[kopf] = {"rotation": [0.0, f"-math.sin(query.life_time * {tempo}) * 4.0 * {staerke}", 0.0]}
        if "flossen" in da:
            knochen["flossen"] = {"rotation": [0.0, 0.0, "math.sin(query.life_time * 300.0) * 8.0"]}
        if "mantel" in da:
            # Der Kalmar pumpt: Der Mantel wird schmal und wieder weit, die
            # Arme rollen sich an den Spitzen ein und wieder auf.
            knochen["mantel"] = {"scale": ["1.0 + math.sin(query.life_time * 150.0) * 0.06",
                                           "1.0 + math.sin(query.life_time * 150.0) * 0.06", 1.0]}
            for i in range(g.KALMAR_ARME):
                knochen[f"arm{i}"] = {"rotation": [
                    f"math.sin(query.life_time * 120.0 + {i * 45}) * 12.0",
                    f"math.cos(query.life_time * 110.0 + {i * 45}) * 8.0", 0.0]}
                knochen[f"armspitze{i}"] = {"rotation": [
                    f"math.sin(query.life_time * 120.0 + {i * 45 - 60}) * 25.0", 0.0, 0.0]}
            for i in range(2):
                knochen[f"fangarm{i}"] = {"rotation": [
                    f"math.sin(query.life_time * 80.0 + {i * 90}) * 8.0",
                    f"math.sin(query.life_time * 70.0 + {i * 90}) * 12.0", 0.0]}
        # Den ganzen Koerper in Schwimmrichtung neigen, wie der Delfin, und
        # dabei leicht rollen.
        rumpf = "mantel" if "mantel" in da else "rumpf"
        knochen.setdefault(rumpf, {})["rotation"] = [
            "query.target_x_rotation * 0.6", 0.0,
            f"math.sin(query.life_time * {tempo * 0.5}) * {2.0 if art == 'wal' else 4.0}"]
        a["schwimmen"] = {"loop": True, "bones": knochen}
        if art == "fisch" and name != "riesenkalmar":
            # An Land liegt der Fisch auf der Seite und zappelt.
            a["an_land"] = {"loop": True, "bones": {rumpf: {
                "rotation": [0.0, "math.sin(query.life_time * 700.0) * 15.0",
                             "90.0 + math.sin(query.life_time * 900.0) * 8.0"],
                "position": [0.0, -3.0, 0.0]}}}

    # --- Angriff: am Zaehler v.attack_time des Spiels
    stoss = "math.sin(variable.attack_time * 180.0)"
    nach = "math.sin(math.clamp(variable.attack_time * 1.4 - 0.2, 0.0, 1.0) * 180.0)"
    ang = {}
    art_angriff = t.get("angriff")
    if art_angriff == "tatze":
        # Aufrichten, und dann beide Tatzen nacheinander.
        ang = {"body": {"rotation": [f"-{stoss} * 28.0", 0.0, 0.0], "position": [0.0, f"{stoss} * 2.0", 0.0]},
               "leg0": {"rotation": [f"-{stoss} * 95.0", 0.0, f"{stoss} * 15.0"]},
               "leg1": {"rotation": [f"-{nach} * 80.0", 0.0, f"-{nach} * 15.0"]},
               "leg2": {"rotation": [f"{stoss} * 25.0", 0.0, 0.0]},
               "leg3": {"rotation": [f"{stoss} * 25.0", 0.0, 0.0]},
               kopf: {"rotation": [f"{stoss} * 18.0", 0.0, 0.0]}}
    elif art_angriff == "stoss":
        # Kopf runter, Hinterbeine stemmen, der ganze Koerper schiesst vor.
        ang = {kopf: {"rotation": [f"{stoss} * 38.0", 0.0, 0.0]},
               "body": {"rotation": [f"{stoss} * 6.0", 0.0, 0.0], "position": [0.0, 0.0, f"-{stoss} * 3.0"]},
               "leg2": {"rotation": [f"{stoss} * 30.0", 0.0, 0.0]},
               "leg3": {"rotation": [f"{stoss} * 30.0", 0.0, 0.0]}}
    elif art_angriff == "biss":
        if "kiefer" in da:
            ang["kiefer"] = {"rotation": [f"{stoss} * 45.0", 0.0, 0.0]}
        ang[kopf] = {"rotation": [f"-{stoss} * 14.0", f"math.sin(variable.attack_time * 540.0) * 8.0", 0.0],
                     "position": [0.0, 0.0, f"-{stoss} * 2.0"]}
    elif art_angriff == "spiess":
        ang = {kopf: {"rotation": [0.0, "math.sin(variable.attack_time * 360.0) * 30.0", 0.0]},
               "rumpf": {"rotation": [0.0, "-math.sin(variable.attack_time * 360.0) * 12.0", 0.0]}}
    elif art_angriff == "arme":
        for i in range(g.KALMAR_ARME):
            ang[f"arm{i}"] = {"rotation": [f"-{stoss} * 30.0", 0.0, 0.0]}
            ang[f"armspitze{i}"] = {"rotation": [f"-{nach} * 45.0", 0.0, 0.0]}
        for i in range(2):
            ang[f"fangarm{i}"] = {"rotation": [f"-{stoss} * 50.0", 0.0, 0.0]}
    if ang:
        a["angriff"] = {"loop": True, "bones": {k: v for k, v in ang.items() if k}}

    # --- Junge: grosser Kopf, wie bei Mojangs Jungtieren
    if t.get("baby") and kopf:
        a["jung"] = {"loop": True, "bones": {kopf: {"scale": 1.4}}}

    # --- Teile, die nur manche Varianten haben (Geweih, Maehne, Hammerkopf)
    if t.get("zeigen"):
        a["teile"] = {"loop": True, "bones": {k: {"scale": f"({bed}) ? 1.0 : 0.0"} for k, bed in t["zeigen"].items()}}
    return a


GALOPP = "math.clamp((query.modified_move_speed - 0.6) * 3.0, 0.0, 1.0)"


def animate_liste(t, anims):
    liste = []
    wasser = t["art"] in ("fisch", "wal")
    if "laufen" in anims:
        if t["art"] == "amphib":
            liste.append({"laufen": "!query.is_in_water ? query.modified_move_speed : 0.0"})
            liste.append({"schwimmen": "query.is_in_water"})
        elif "galopp" in anims:
            liste.append({"laufen": "query.modified_move_speed * (1.0 - variable.galopp)"})
            liste.append({"galopp": "variable.galopp"})
        else:
            liste.append({"laufen": "query.modified_move_speed"})
        liste.append({"stehen": "1.0 - math.clamp(query.modified_move_speed * 2.0, 0.0, 0.8)"})
        liste.append("blick")
    if wasser:
        liste.append({"schwimmen": "query.is_in_water" if "an_land" in anims else "1.0"})
        if "an_land" in anims:
            liste.append({"an_land": "!query.is_in_water"})
    if "angriff" in anims:
        liste.append({"angriff": "variable.attack_time > 0.0"})
    if "jung" in anims:
        liste.append({"jung": "query.is_baby"})
    if "teile" in anims:
        liste.append("teile")
    return liste


def aussehen(t, anims, texturen):
    name = t["id"]
    kurz = {k: (v if isinstance(v, str) else f"animation.fynn.{name}.{k}") for k, v in anims.items()}
    d = {
        "identifier": f"fynn:{name}",
        "materials": {"default": "entity_alphatest"},
        "textures": {k: f"textures/entity/tiere/{name}_{k}" for k in texturen},
        "geometry": {"default": f"geometry.fynn.{name}"},
        "animations": kurz,
        "scripts": {"animate": animate_liste(t, anims)} if "galopp" not in anims else {
            "pre_animation": [f"variable.galopp = {GALOPP};"], "animate": animate_liste(t, anims)},
        "render_controllers": [f"controller.render.fynn.{name}"],
        "spawn_egg": {"base_color": t["ei"][0], "overlay_color": t["ei"][1]},
    }
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": d}}


def steuerung(t, texturen):
    """Welche Haut: die Variante - und bei manchen Jungen eine eigene."""
    varianten = [f"Texture.{v}" for v, _ in t["varianten"]]
    bild = "Array.haut[query.variant]"
    if t.get("baby_textur"):
        bild = f"query.is_baby ? Texture.{t['baby_textur']} : Array.haut[query.variant]"
    return {"format_version": "1.8.0", "render_controllers": {f"controller.render.fynn.{t['id']}": {
        "arrays": {"textures": {"Array.haut": varianten}},
        "geometry": "Geometry.default",
        "materials": [{"*": "Material.default"}],
        "textures": [bild],
    }}}


# ------------------------------------------------------------ Zusammenbau

def baue(t, bilder=None):
    name = t["id"]
    modell = getattr(g, f"{t['gestalt']}_modell")()
    maler = getattr(g, f"{t['gestalt']}_maler")
    geo = modell.geometrie()
    schreibe(RES / "models" / "entity" / f"tier_{name}.geo.json", geo)

    texturen = {}
    namen = [v for v, _ in t["varianten"]] + ([t["baby_textur"]] if t.get("baby_textur") else [])
    for v in namen:
        bild = modell.male(maler(v))
        ziel = RES / "textures" / "entity" / "tiere" / f"{name}_{v}.png"
        ziel.parent.mkdir(parents=True, exist_ok=True)
        bild.save(ziel)
        texturen[v] = bild

    anims = bewegungen(t, modell)
    eigene = {f"animation.fynn.{name}.{k}": v for k, v in anims.items() if not isinstance(v, str)}
    schreibe(RES / "animations" / f"tier_{name}.animation.json", {"format_version": "1.10.0", "animations": eigene})
    schreibe(RES / "entity" / f"tier_{name}.entity.json", aussehen(t, anims, texturen))
    schreibe(RES / "render_controllers" / f"tier_{name}.render_controllers.json", steuerung(t, texturen))

    schreibe(VER / "entities" / f"tier_{name}.json", verhalten(t, namen))
    schreibe(VER / "spawn_rules" / f"tier_{name}.json", spawnregel(t))
    schreibe(VER / "loot_tables" / "entities" / f"{name}.json", beuteliste(t["beute"]))

    if bilder is not None:
        bilder.append((t, geo, texturen, eigene))
    return geo


def laute():
    """Die Geraeusche - alles Klaenge aus Minecraft, tiefer oder hoeher
    gestimmt: ein tief gestimmtes Kuhmuhen ist ein Bison, ein langsamer
    Waechter-Gesang ist ein Wal."""
    pfad = RES / "sounds.json"
    daten = json.loads(pfad.read_text(encoding="utf-8")) if pfad.exists() else {}
    wesen = daten.setdefault("entity_sounds", {}).setdefault("entities", {})
    for t in TIERE:
        l = dict(t["laute"])
        tonhoehe = l.pop("pitch")
        ereignisse = {}
        for ereignis, klang in l.items():
            ereignisse[ereignis] = {"sound": klang, "volume": 0.25 if ereignis == "step" else 1.0}
            if t["art"] in ("fisch", "wal") and ereignis in ("ambient", "hurt", "death"):
                ereignisse[f"{ereignis}.in.water"] = ereignisse[ereignis]
        wesen[f"fynn:{t['id']}"] = {"volume": 1.0, "pitch": tonhoehe, "events": ereignisse}
    schreibe(pfad, daten)


def sprache():
    for datei, i in (("de_DE.lang", 0), ("en_US.lang", 1)):
        pfad = RES / "texts" / datei
        zeilen = [z for z in pfad.read_text(encoding="utf-8").splitlines()
                  if not any(z.startswith(f"entity.fynn:{t['id']}.") or z.startswith(f"item.spawn_egg.entity.fynn:{t['id']}")
                             for t in TIERE) and z != "## Die Tiere"]
        while zeilen and not zeilen[-1].strip():
            zeilen.pop()
        zeilen += ["", "## Die Tiere"]
        for t in TIERE:
            n = t["name"][i]
            ei = "Spawn-Ei" if i == 0 else "Spawn Egg"
            zeilen += [f"entity.fynn:{t['id']}.name={n}", f"item.spawn_egg.entity.fynn:{t['id']}.name={n}-{ei}"
                       if i == 0 else f"item.spawn_egg.entity.fynn:{t['id']}.name={n} {ei}"]
        pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def vorschau(bilder, ordner):
    from PIL import Image, ImageDraw
    ordner = Path(ordner)
    ordner.mkdir(parents=True, exist_ok=True)
    zellen = []
    for t, geo, texturen, eigene in bilder:
        for v, bild in texturen.items():
            baby = v == t.get("baby_textur")
            werte = {"q.is_baby": 1.0 if baby else 0.0,
                     "q.variant": float(next((i for i, (n, _) in enumerate(t["varianten"]) if n == v), 0)),
                     "q.is_in_water": 1.0}
            anims = [(a, 1.0) for k, a in eigene.items() if k.endswith((".teile", ".jung")) and
                     (not k.endswith(".jung") or baby)]
            b = tm.ansehen(geo, bild, anims, werte, gier=35, neigung=20, breite=260, hoehe=220)
            # Die Schrift der Vorschau kennt keine Umlaute.
            name = t["name"][0].replace("ä", "ae").replace("ö", "oe").replace("ü", "ue")
            zellen.append((b, f"{name} ({v})"))
    spalten = 5
    zeilen = (len(zellen) + spalten - 1) // spalten
    gesamt = Image.new("RGBA", (spalten * 260, zeilen * 240), (250, 250, 252, 255))
    mal = ImageDraw.Draw(gesamt)
    for i, (b, text) in enumerate(zellen):
        x, y = (i % spalten) * 260, (i // spalten) * 240
        gesamt.paste(b, (x, y))
        mal.text((x + 8, y + 222), text, fill=(30, 30, 40, 255))
    ziel = ordner / "tiere_alle.png"
    gesamt.save(ziel)
    print("gezeichnet:", ziel)


def main():
    bilder = [] if "--bilder" in sys.argv else None
    for t in TIERE:
        baue(t, bilder)
    laute()
    sprache()
    print(f"gebaut: {len(TIERE)} Tiere, "
          f"{sum(1 for t in TIERE if t['art'] in ('land', 'amphib'))} an Land, "
          f"{sum(1 for t in TIERE if t['art'] in ('fisch', 'wal'))} im Wasser")
    if bilder is not None:
        vorschau(bilder, sys.argv[sys.argv.index("--bilder") + 1])


if __name__ == "__main__":
    main()
