#!/usr/bin/env python3
"""Drei feindliche Menschen: Bandit, Wilderer, Bandenchef.

Fynn: "feindliche Mobs ... drei ausdenken ... sollen auch Waffen haben, die
innovativ neu aus Dingen sind, die wir schon hergestellt haben. Die muessen
jetzt kein Fantasy-Style sein, koennen auch einfach Banditen sein."

* Bandit: rotes Kopftuch mit Knoten, Tuch vor dem Gesicht, Lederweste mit
  Guerteltaschen. Kaempft mit dem Haizahnsaebel - einem Stahlsaebel mit
  Haizaehnen auf dem Ruecken. Kommt in Banden.
* Wilderer: breiter Jaegerhut mit Feder, gruenbrauner Mantel mit
  Fellkragen, Koecher auf dem Ruecken. Schiesst mit dem Elchgeweihbogen,
  auf Spieler und auf die wilden Tiere (er ist ja Wilderer).
* Bandenchef: gross, Baerenfell ueber den Schultern, Umhang, Augenklappe,
  Rubin im Ohr. Fuehrt die Rubinklinge. Wird er schwer getroffen, pfeift er
  einmal nach Verstaerkung (verhaltenspaket/scripts/banditen.js).

Alle drei tragen ihre Waffe in der Hand (dieselben 3D-Modelle wie beim
Spieler) und bewegen sich: Gehen mit Armschwung und Wippen, Atmen und
Umschauen im Stehen, Hieb von oben, Bogen anlegen, Umhang im Wind.

Sie kommen in Ebenen, Savannen, Waeldern und der Taiga - tags und nachts,
nie auf friedlich. Eine Bande hat zwei bis vier Leute, etwa jeder dritte
ist ein Wilderer; der Chef ist selten und kommt allein.

    python3 werkzeuge/banditen_bauen.py [--bilder ORDNER]
"""

import json
import sys
from pathlib import Path

from PIL import Image, ImageDraw

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tierprodukte_bauen as tp                          # noqa: E402
from tiere_gestalt import nah, ton                       # noqa: E402
from tiermodell import Modell, hexfarbe, ansehen        # noqa: E402
from spawneier import ei_eintrag  # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

HAUT = {"bandit": "#c08a64", "wilderer": "#b07a52", "bandenchef": "#9a6a48"}


# ------------------------------------------------------------ Gestalt

def koerper(name):
    """Ein Mensch wie der Spieler, mit Handknochen fuer die Waffe."""
    m = Modell(name, sichtbreite=2, sichthoehe=2.5)
    body = m.knoch("body", [0, 24, 0])
    body.kasten([-4, 12, -2], [8, 12, 4], "rumpf")
    m.knoch("head", [0, 24, 0], "body").kasten([-4, 24, -4], [8, 8, 8], "kopf")
    m.knoch("rightArm", [-5, 22, 0], "body").kasten([-8, 12, -2], [4, 12, 4], "arm")
    m.knoch("leftArm", [5, 22, 0], "body").kasten([4, 12, -2], [4, 12, 4], "arm")
    m.knoch("rightLeg", [-1.9, 12, 0], "body").kasten([-3.9, 0, -2], [4, 12, 4], "bein")
    m.knoch("leftLeg", [1.9, 12, 0], "body").kasten([-0.1, 0, -2], [4, 12, 4], "bein")
    m.knoch("rightItem", [-6, 15, 1], "rightArm")
    m.knoch("leftItem", [6, 15, 1], "leftArm")
    return m


def bandit_modell():
    m = koerper("bandit")
    kopf, body = m.finde("head"), m.finde("body")
    kopf.kasten([-4, 30, -4], [8, 2, 8], "tuch", aufblasen=0.4)            # Kopftuch, ueber den Augen
    kopf.kasten([-1, 29, 4.2], [2, 2, 2], "tuch")                           # Knoten
    kopf.kasten([-1.5, 25, 4.6], [1, 4, 1], "tuch")                         # Zipfel
    kopf.kasten([0.5, 26, 4.6], [1, 3, 1], "tuch")
    body.kasten([-4, 12, -2], [8, 2, 4], "guertel", aufblasen=0.3)
    body.kasten([1.5, 11, -2.9], [2, 3, 1], "tasche")
    body.kasten([-4.8, 11, -1], [1, 3, 2], "tasche")
    body.kasten([-1, 12, -2.6], [2, 13, 1], "weste_riemen", drehung=[0, 0, 35], drehpunkt=[0, 18, -2.1])  # Patronengurt schraeg
    return m


def wilderer_modell():
    m = koerper("wilderer")
    kopf, body = m.finde("head"), m.finde("body")
    kopf.kasten([-6, 31, -6], [12, 1, 12], "hut")                           # Krempe
    kopf.kasten([-4, 32, -4], [8, 3, 8], "hut")
    kopf.kasten([-4, 32, -4], [8, 1, 8], "hutband", aufblasen=0.1)
    kopf.kasten([3.5, 33, 0], [1, 4, 2], "feder", drehung=[0, 0, -20], drehpunkt=[4, 33, 1])
    body.kasten([-4.5, 22, -2.5], [9, 2, 5], "fell")                        # Fellkragen
    body.kasten([1, 13, 2], [3, 9, 2], "koecher", drehung=[0, 0, 20], drehpunkt=[2.5, 17, 3])
    body.kasten([1.5, 21, 2.5], [2, 3, 1], "pfeile", drehung=[0, 0, 20], drehpunkt=[2.5, 17, 3])
    body.kasten([-4, 3, -2], [8, 9, 4], "mantelsaum", aufblasen=0.35)       # langer Mantel
    return m


def bandenchef_modell():
    m = koerper("bandenchef")
    kopf, body = m.finde("head"), m.finde("body")
    kopf.kasten([4, 26, -0.5], [1, 1, 1], "rubin")                          # Ohrring
    body.kasten([-5.5, 22, -3], [11, 3, 6], "fell")                         # Baerenfell ueber den Schultern
    body.kasten([-6, 23, -2.5], [2, 2, 5], "fell")
    body.kasten([4, 23, -2.5], [2, 2, 5], "fell")
    body.kasten([-4, 12, -2], [8, 2, 4], "guertel", aufblasen=0.3)
    body.kasten([-1, 12, -2.9], [2, 2, 1], "schnalle")
    body.kasten([-3, 14, -2.7], [6, 7, 1], "platte")                        # Brustplatte
    umhang = m.knoch("umhang", [0, 24, 2.5], "body")
    umhang.kasten([-5, 5, 2.2], [10, 18, 1], "umhang")
    return m


# ------------------------------------------------------------ Malen

def gesicht(p, n, texel, haut, augen="#2a1a10"):
    """Das Gesicht vorn am Kopf: Augen mit Weiss, Brauen, Mund."""
    if n[2] < -0.5:
        for x in (-2.5, 2.5):
            if nah(p, (x, 28.5, -4), (0.5, 0.5, 1)):
                return hexfarbe(augen)
            if nah(p, (x - (1 if x < 0 else -1), 28.5, -4), (0.5, 0.5, 1)):
                return hexfarbe("#f0ece4")
            if nah(p, (x, 29.5, -4), (1.4, 0.5, 1)):
                return hexfarbe("#3a2616")                  # Braue
        if nah(p, (0, 26.5, -4), (1.5, 0.5, 1)):
            return hexfarbe("#6a3e2e")                      # Mund
    return None


def bandit_maler(_):
    haut, tuch, weste, hemd, hose, stiefel = HAUT["bandit"], "#9a2a26", "#5e3a22", "#c8b894", "#4a3a2e", "#2e2218"

    def f(stoff, p, n, texel):
        if stoff == "tuch":
            return ton(tuch, p, n, texel, 401, straehne=0.03)
        if stoff == "kopf":
            if p[1] < 27.2 and n[1] <= 0.5:
                return ton(tuch, p, n, texel, 403, hell=-0.05)   # Tuch vor dem Gesicht
            g = gesicht(p, n, texel, haut)
            if g:
                return g
            if n[1] > 0.5 or (p[1] > 31):
                return ton("#2a1e16", p, n, texel, 405)          # Haar
            return ton(haut, p, n, texel, 407, straehne=0.0)
        if stoff == "rumpf":
            if n[2] < -0.5 and abs(p[0]) < 1.5:
                return ton(hemd, p, n, texel, 409)               # Hemd zwischen den Westenhaelften
            return ton(weste, p, n, texel, 411)
        if stoff == "arm":
            return ton(hemd if p[1] > 17 else haut, p, n, texel, 413, straehne=0.0)
        if stoff == "bein":
            return ton(stiefel if p[1] < 4 else hose, p, n, texel, 415)
        if stoff in ("guertel", "tasche"):
            if stoff == "guertel" and n[2] < -0.5 and abs(p[0]) < 1:
                return hexfarbe("#c8a050")
            return ton("#3a2618", p, n, texel, 417, straehne=0.0)
        if stoff == "weste_riemen":
            # Huelsen in einer ruhigen Reihe - kein Schachbrett, das flimmert.
            if n[2] < -0.5 and texel[1] % 2 == 0:
                return ton("#c8a860", p, n, texel, 418, straehne=0.0)
            return ton("#4a2e1a", p, n, texel, 419, straehne=0.0)
        return ton(weste, p, n, texel, 421)
    return f


def wilderer_maler(_):
    haut, mantel, hose, stiefel = HAUT["wilderer"], "#4e5a32", "#5a4630", "#2e2218"

    def f(stoff, p, n, texel):
        if stoff == "hut":
            return ton("#5a4028", p, n, texel, 431)
        if stoff == "hutband":
            return ton("#2a1c12", p, n, texel, 433, straehne=0.0)
        if stoff == "feder":
            return hexfarbe("#c8402a") if p[1] > 35 else hexfarbe("#e8dcc0")
        if stoff == "kopf":
            g = gesicht(p, n, texel, haut, "#3a4a2a")
            if g:
                return g
            if n[2] < -0.5 and p[1] < 27.2:
                return ton("#5a3a22", p, n, texel, 435)          # Vollbart
            if n[1] > 0.5 or p[1] > 30 or (n[2] > 0.5):
                return ton("#4a3020", p, n, texel, 437)          # Haar
            return ton(haut, p, n, texel, 439, straehne=0.0)
        if stoff == "fell":
            return ton("#8a6a48", p, n, texel, 441, straehne=0.06, hell=0.05)
        if stoff == "koecher":
            return ton("#6a4228", p, n, texel, 443, straehne=0.0)
        if stoff == "pfeile":
            return hexfarbe("#e8e0c8") if texel[0] % 2 else hexfarbe("#c83a2a")
        if stoff in ("rumpf", "mantelsaum"):
            if n[2] < -0.5 and abs(p[0]) < 0.6:
                return hexfarbe("#c8a050")                       # Knopfleiste
            return ton(mantel, p, n, texel, 445)
        if stoff == "arm":
            return ton(mantel if p[1] > 13.5 else haut, p, n, texel, 447, straehne=0.02)
        if stoff == "bein":
            return ton(stiefel if p[1] < 5 else hose, p, n, texel, 449)
        return ton(mantel, p, n, texel, 451)
    return f


def bandenchef_maler(_):
    haut, leder, hose = HAUT["bandenchef"], "#3a2a22", "#2e2a26"

    def f(stoff, p, n, texel):
        if stoff == "rubin":
            return hexfarbe("#d02840")
        if stoff == "kopf":
            if n[2] < -0.5 and nah(p, (2.5, 28.5, -4), (1.4, 0.8, 1)):
                return hexfarbe("#141010")                       # Augenklappe
            if n[2] < -0.5 and abs(p[0] - (-2.5)) < 0.6 and 27 < p[1] < 30.5 and texel[1] % 2 == 0:
                return hexfarbe("#8a4a3a")                       # Narbe
            g = gesicht(p, n, texel, haut, "#6a3a2a")
            if g:
                return g
            if (n[2] < -0.5 and p[1] < 27.2) or (n[1] < -0.5):
                return ton("#2a1a14", p, n, texel, 461)          # dunkler Bart
            if n[1] > 0.5 or p[1] > 31.2:
                return ton(haut, p, n, texel, 463, hell=0.05)    # Glatze
            if abs(n[0]) > 0.5 and 28.3 < p[1] < 29 and n[0] * p[0] > 0:
                return hexfarbe("#141010")                       # Band der Klappe
            return ton(haut, p, n, texel, 465, straehne=0.0)
        if stoff == "fell":
            return ton("#6e4a2c", p, n, texel, 467, straehne=0.07, hell=0.04)
        if stoff == "umhang":
            if p[1] < 7:
                return ton("#4a1418", p, n, texel, 469, straehne=0.06)   # zerschlissener Saum
            return ton("#6a1a20", p, n, texel, 471, straehne=0.04)
        if stoff == "platte":
            # Brustplatte mit Rubin in der Mitte - der Chef traegt, was er erbeutet hat.
            if n[2] < -0.5:
                if nah(p, (0, 18, -2.7), (1, 1, 1)):
                    return ton("#c82438", p, n, texel, 472, straehne=0.0)
                if nah(p, (0, 18, -2.7), (1.6, 1.6, 1)):
                    return ton("#c8a050", p, n, texel, 474, straehne=0.0)   # Goldfassung
                if abs(p[0]) > 2.1 or p[1] > 20.1 or p[1] < 14.9:
                    if abs(p[0]) > 2.1 and (p[1] > 20.1 or p[1] < 14.9):
                        return hexfarbe("#d8d0b8")                           # Nieten
                    return ton("#5e626c", p, n, texel, 476, straehne=0.0)   # Rand
            return ton("#7e828c", p, n, texel, 473, straehne=0.0)
        if stoff == "schnalle":
            return ton("#c8a050", p, n, texel, 473, straehne=0.0)
        if stoff == "guertel":
            return ton("#1e1612", p, n, texel, 475, straehne=0.0)
        if stoff == "rumpf":
            return ton(leder, p, n, texel, 477)
        if stoff == "arm":
            return ton(leder if p[1] > 19 else haut, p, n, texel, 479, straehne=0.02)
        if stoff == "bein":
            return ton("#1a1410" if p[1] < 5 else hose, p, n, texel, 481)
        return ton(leder, p, n, texel, 483)
    return f


# ------------------------------------------------------------ Bewegung

LAUF = "query.anim_time * 38.17"
BEWEGUNG = {
    "laufen": {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": {
        "rightLeg": {"rotation": [f"math.cos({LAUF}) * 40.0", 0.0, 0.0]},
        "leftLeg": {"rotation": [f"-math.cos({LAUF}) * 40.0", 0.0, 0.0]},
        "rightArm": {"rotation": [f"-math.cos({LAUF}) * 32.0", 0.0, 0.0]},
        "leftArm": {"rotation": [f"math.cos({LAUF}) * 32.0", 0.0, 0.0]},
        # Weiches Wippen: oben, wenn die Beine senkrecht stehen.
        "body": {"position": [0.0, f"-math.cos({LAUF} * 2.0) * 0.3", 0.0],
                 "rotation": [3.0, f"math.cos({LAUF}) * 5.0", 0.0]},
    }},
    "stehen": {"loop": True, "bones": {
        "body": {"rotation": ["math.sin(query.life_time * 80.0) * 1.2", 0.0, 0.0]},
        "rightArm": {"rotation": [0.0, 0.0, "3.0 + math.sin(query.life_time * 80.0) * 2.0"]},
        "leftArm": {"rotation": [0.0, 0.0, "-3.0 - math.sin(query.life_time * 80.0) * 2.0"]},
    }},
    # Die Waffe in der Hand haelt man vor dem Koerper, nicht haengend.
    "halten": {"loop": True, "bones": {"rightArm": {"rotation": [-22.0, -8.0, 0.0]}}},
    # Hieb von oben rechts nach unten links - wie der Vorhandhieb des Spielers.
    "hieb": {"loop": True, "bones": {
        "rightArm": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 120.0 - 40.0 * math.sin(variable.attack_time * 360.0)",
                                  "-math.sin(variable.attack_time * 180.0) * 35.0", 0.0]},
        "body": {"rotation": [0.0, "math.sin(variable.attack_time * 360.0) * 18.0", 0.0]},
        "leftArm": {"rotation": ["math.sin(variable.attack_time * 180.0) * 25.0", 0.0, -10.0]},
    }},
    # Bogen anlegen, sobald ein Ziel da ist (wie Mojangs Skelett).
    "bogen": {"loop": True, "bones": {
        "rightArm": {"rotation": ["-90.0 + query.target_x_rotation - this", "-8.0 + query.target_y_rotation - this", "-this"]},
        "leftArm": {"rotation": ["-90.0 + query.target_x_rotation - this", "35.0 + query.target_y_rotation - this", "-this"]},
        "body": {"rotation": [0.0, -12.0, 0.0]},
    }},
    "umhang": {"loop": True, "bones": {
        "umhang": {"rotation": ["6.0 + query.modified_move_speed * 28.0 + math.sin(query.life_time * 300.0) * 3.0", 0.0,
                                "math.sin(query.life_time * 200.0) * 2.0"]},
    }},
}


# ------------------------------------------------------------ Verhalten

KEIN_KREATIV = {"test": "has_ability", "subject": "other", "value": "instabuild", "operator": "!="}

BANDITEN = [
    {"id": "bandit", "name": ("Bandit", "Bandit"), "leben": 26, "schaden": 6, "tempo": 0.28,
     "waffe": "fynn:haizahnsaebel", "art": "nah", "ei": ("#5e3a22", "#9a2a26"),
     "beute": [("minecraft:gold_nugget", 1, 3, 1.0), ("minecraft:leather", 0, 1, 1.0),
               ("minecraft:emerald", 1, 1, 0.08), ("fynn:haizahnsaebel", 1, 1, 0.06)]},
    {"id": "wilderer", "name": ("Wilderer", "Poacher"), "leben": 22, "schaden": 4, "tempo": 0.27,
     "waffe": "fynn:geweihbogen", "art": "fern", "ei": ("#4e5a32", "#5a4028"),
     "beute": [("minecraft:arrow", 1, 4, 1.0), ("fynn:baerenfell", 1, 1, 0.12),
               ("fynn:elchgeweih", 1, 1, 0.08), ("fynn:geweihbogen", 1, 1, 0.05)]},
    {"id": "bandenchef", "name": ("Bandenchef", "Bandit Chief"), "leben": 60, "schaden": 9, "tempo": 0.26,
     "waffe": "fynn:rubinklinge", "art": "nah", "gross": 1.12, "ei": ("#3a2a22", "#d02840"),
     "beute": [("fynn:rubin", 1, 3, 1.0), ("minecraft:gold_ingot", 1, 2, 1.0),
               ("fynn:baerenfell", 1, 1, 0.3), ("fynn:rubinklinge", 1, 1, 0.1)]},
]


def verhalten(b):
    c = {
        "minecraft:type_family": {"family": [b["id"], "bandit", "monster", "mob"]},
        "minecraft:health": {"value": b["leben"], "max": b["leben"]},
        "minecraft:collision_box": {"width": 0.6, "height": 1.9 * b.get("gross", 1.0)},
        "minecraft:movement": {"value": b["tempo"]},
        "minecraft:movement.basic": {},
        "minecraft:navigation.walk": {"can_path_over_water": True, "can_open_doors": True, "avoid_water": True},
        "minecraft:jump.static": {},
        "minecraft:can_climb": {},
        "minecraft:physics": {},
        "minecraft:pushable_by_entity": {},
        "minecraft:pushable_by_block": {},
        "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
        "minecraft:nameable": {},
        "minecraft:follow_range": {"value": 32, "max": 32},
        "minecraft:despawn": {"despawn_from_distance": {}},
        "minecraft:conditional_bandwidth_optimization": {},
        "minecraft:experience_reward": {"on_death": "query.last_hit_by_player ? 8 : 0"},
        "minecraft:hurt_on_condition": {"damage_conditions": [{"filters": {"test": "in_lava", "subject": "self",
                                                                           "operator": "==", "value": True},
                                                               "cause": "lava", "damage_per_tick": 4}]},
        "minecraft:loot": {"table": f"loot_tables/entities/{b['id']}.json"},
        # Die Waffe faellt nicht aus der Hand, sondern selten ueber die Beuteliste.
        "minecraft:equipment": {"table": f"loot_tables/ausruestung/{b['id']}.json",
                                "slot_drop_chance": [{"slot": "slot.weapon.mainhand", "drop_chance": 0.0}]},
        "minecraft:equip_item": {},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.hurt_by_target": {"priority": 1, "alert_same_type": True},
        "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 0.8},
        "minecraft:behavior.look_at_player": {"priority": 8, "look_distance": 10, "probability": 0.03},
        "minecraft:behavior.random_look_around": {"priority": 9},
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 2, "must_see": True, "reselect_targets": True, "within_radius": 24,
            "entity_types": [
                {"filters": {"all_of": [{"test": "is_family", "subject": "other", "value": "player"}, KEIN_KREATIV]},
                 "max_dist": 20},
                {"filters": {"any_of": [{"test": "is_family", "subject": "other", "value": "villager"},
                                        {"test": "is_family", "subject": "other", "value": "wandering_trader"}]},
                 "max_dist": 16},
            ] + ([{"filters": {"test": "is_family", "subject": "other", "value": "fynn_tier"}, "max_dist": 16}]
                 if b["id"] == "wilderer" else [])},
    }
    if b.get("gross"):
        c["minecraft:scale"] = {"value": b["gross"]}
        c["minecraft:knockback_resistance"] = {"value": 0.5}
    if b["art"] == "nah":
        c["minecraft:attack"] = {"damage": b["schaden"]}
        c["minecraft:behavior.melee_box_attack"] = {"priority": 3, "speed_multiplier": 1.25, "track_target": True}
    else:
        c["minecraft:shooter"] = {"def": "minecraft:arrow"}
        c["minecraft:behavior.ranged_attack"] = {"priority": 3, "attack_interval_min": 1.2, "attack_interval_max": 2.4,
                                                 "attack_radius": 16.0, "speed_multiplier": 1.0}
    return {"format_version": "1.26.30", "minecraft:entity": {
        "description": {"identifier": f"fynn:{b['id']}", "spawn_category": "monster",
                        "is_spawnable": True, "is_summonable": True},
        "components": c}}


def aussehen(b):
    anim = {k: f"animation.fynn.{b['id']}.{k}" for k in BEWEGUNG
            if k != "umhang" or b["id"] == "bandenchef"}
    anim["blick"] = "animation.common.look_at_target"
    liste = [{"laufen": "math.clamp(query.modified_move_speed * 1.4, 0.0, 1.0)"}, "stehen", "blick", "halten",
             {"hieb": "variable.attack_time > 0.0"}]
    if b["art"] == "fern":
        liste.append({"bogen": "query.has_target"})
    if b["id"] == "bandenchef":
        liste.append("umhang")
    skripte = {
        "animate": liste,
        # Die Waffen in der Hand lesen diese Werte vom Traeger (wie beim
        # Spieler); ein Bandit hat keinen eigenen Schlagzaehler.
        "variables": {f"variable.{v}": "public" for v in
                      ("attack_time", "fynn_schwert", "fynn_waffe", "fynn_schlag", "fynn_hiebzeit")},
        "initialize": [f"variable.{v} = 0.0;" for v in ("fynn_schwert", "fynn_waffe", "fynn_schlag", "fynn_hiebzeit")],
    }
    if b.get("gross"):
        skripte["scale"] = str(b["gross"])
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": f"fynn:{b['id']}",
        "materials": {"default": "entity_alphatest"},
        "textures": {"default": f"textures/entity/banditen/{b['id']}"},
        "geometry": {"default": f"geometry.fynn.{b['id']}"},
        "animations": anim,
        "scripts": skripte,
        "render_controllers": ["controller.render.default"],
        "spawn_egg": ei_eintrag(b["id"], {"base_color": b["ei"][0], "overlay_color": b["ei"][1]}),
    }}}


def spawnregeln():
    gebiete = [{"test": "has_biome_tag", "operator": "==", "value": w} for w in ("plains", "savanna", "forest", "taiga")]
    grund = {"minecraft:spawns_on_surface": {},
             "minecraft:spawns_on_block_filter": ["minecraft:grass_block", "minecraft:coarse_dirt", "minecraft:podzol",
                                                  "minecraft:dirt", "minecraft:snow_layer"],
             "minecraft:brightness_filter": {"min": 0, "max": 15, "adjust_for_weather": False},
             "minecraft:difficulty_filter": {"min": "easy", "max": "hard"}}
    regeln = {}
    bande = []
    for g in gebiete:
        bande.append(dict(grund, **{
            "minecraft:weight": {"default": 4},
            "minecraft:herd": {"min_size": 2, "max_size": 4},
            # Etwa jeder dritte einer Bande ist ein Wilderer.
            "minecraft:permute_type": [{"weight": 65}, {"weight": 35, "entity_type": "fynn:wilderer"}],
            "minecraft:density_limit": {"surface": 3},
            "minecraft:biome_filter": [g]}))
    regeln["bandit"] = bande
    regeln["bandenchef"] = [dict(grund, **{
        "minecraft:weight": {"default": 1}, "minecraft:herd": {"min_size": 1, "max_size": 1},
        "minecraft:density_limit": {"surface": 1}, "minecraft:biome_filter": [g]}) for g in gebiete]
    # Wilderer ziehen auch allein oder zu zweit durch Wald und Taiga - so
    # gibt es sie auch dann, wenn keine Bande in der Naehe ist.
    regeln["wilderer"] = [dict(grund, **{
        "minecraft:weight": {"default": 2}, "minecraft:herd": {"min_size": 1, "max_size": 2},
        "minecraft:density_limit": {"surface": 2}, "minecraft:biome_filter": [g]})
        for g in gebiete if g["value"] in ("forest", "taiga")]
    return {name: {"format_version": "1.8.0", "minecraft:spawn_rules": {
        "description": {"identifier": f"fynn:{name}", "population_control": "monster"},
        "conditions": bedingungen}} for name, bedingungen in regeln.items()}


def beute(eintraege):
    toepfe = []
    for name, lo, hi, chance in eintraege:
        topf = {"rolls": 1, "entries": [{"type": "item", "name": name, "weight": 1, "functions": [
            {"function": "set_count", "count": {"min": lo, "max": hi}},
            {"function": "looting_enchant", "count": {"min": 0, "max": 1}}]}]}
        if chance < 1.0:
            topf["conditions"] = [{"condition": "killed_by_player"},
                                  {"condition": "random_chance_with_looting", "chance": chance,
                                   "looting_multiplier": round(chance / 3, 3)}]
        toepfe.append(topf)
    return {"pools": toepfe}


def main():
    bilder = []
    for b in BANDITEN:
        modell = globals()[f"{b['id']}_modell"]()
        geo = modell.geometrie()
        tp.schreibe(RES / "models" / "entity" / f"bandit_{b['id']}.geo.json", geo)
        haut = modell.male(globals()[f"{b['id']}_maler"](None))
        ziel = RES / "textures" / "entity" / "banditen" / f"{b['id']}.png"
        ziel.parent.mkdir(parents=True, exist_ok=True)
        haut.save(ziel)
        eigene = {f"animation.fynn.{b['id']}.{k}": v for k, v in BEWEGUNG.items()
                  if k != "umhang" or b["id"] == "bandenchef"}
        tp.schreibe(RES / "animations" / f"bandit_{b['id']}.animation.json",
                    {"format_version": "1.10.0", "animations": eigene})
        tp.schreibe(RES / "entity" / f"bandit_{b['id']}.entity.json", aussehen(b))
        tp.schreibe(VER / "entities" / f"bandit_{b['id']}.json", verhalten(b))
        tp.schreibe(VER / "loot_tables" / "entities" / f"{b['id']}.json", beute(b["beute"]))
        tp.schreibe(VER / "loot_tables" / "ausruestung" / f"{b['id']}.json",
                    {"pools": [{"rolls": 1, "entries": [{"type": "item", "name": b["waffe"], "weight": 1}]}]})
        bilder.append((b, geo, haut, eigene))
    for name, regel in spawnregeln().items():
        tp.schreibe(VER / "spawn_rules" / f"bandit_{name}.json", regel)
    # Namen
    for datei, i in (("de_DE.lang", 0), ("en_US.lang", 1)):
        pfad = RES / "texts" / datei
        zeilen = [z for z in pfad.read_text(encoding="utf-8").splitlines()
                  if not any(z.startswith(f"entity.fynn:{b['id']}.") or z.startswith(f"item.spawn_egg.entity.fynn:{b['id']}")
                             for b in BANDITEN) and z != "## Banditen"]
        while zeilen and not zeilen[-1].strip():
            zeilen.pop()
        zeilen += ["", "## Banditen"]
        for b in BANDITEN:
            n = b["name"][i]
            zeilen += [f"entity.fynn:{b['id']}.name={n}",
                       f"item.spawn_egg.entity.fynn:{b['id']}.name=" + (f"{n}-Spawn-Ei" if i == 0 else f"{n} Spawn Egg")]
        pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")
    print(f"gebaut: {len(BANDITEN)} Banditen")
    if "--bilder" in sys.argv:
        vorschau(bilder, Path(sys.argv[sys.argv.index("--bilder") + 1]))


def vorschau(bilder, ordner):
    """Jeder Bandit: stehend, gehend, zuschlagend - mit Waffe in der Hand."""
    import spieler_ansehen as s
    ordner.mkdir(parents=True, exist_ok=True)
    zellen = []
    for b, geo, haut, eigene in bilder:
        for text, anims, werte in (
                ("steht", ["stehen", "halten"], {}),
                ("geht", ["laufen", "halten"], {"q.modified_distance_moved": 1.0, "q.modified_move_speed": 1.0}),
                ("greift an" if b["art"] == "nah" else "zielt",
                 ["hieb", "halten"] if b["art"] == "nah" else ["bogen"], {"v.attack_time": 0.35})):
            liste = [(eigene[f"animation.fynn.{b['id']}.{a}"], 1.0) for a in anims]
            if b["id"] == "bandenchef":
                liste.append((eigene["animation.fynn.bandenchef.umhang"], 1.0))
            bild = mit_waffe(s, geo, haut, liste, werte, b["waffe"])
            ImageDraw.Draw(bild).text((8, 262), f"{b['name'][0]}: {text}", fill=(30, 30, 40, 255))
            zellen.append(bild)
    gesamt = Image.new("RGBA", (3 * 240, 3 * 280), (255, 255, 255, 255))
    for i, z in enumerate(zellen):
        gesamt.paste(z, ((i % 3) * 240, (i // 3) * 280))
    gesamt.save(ordner / "banditen.png")
    print("gezeichnet:", ordner / "banditen.png")


def mit_waffe(s, geo, haut, animationen, werte, waffe):
    """Bandit mit seiner Waffe, gerechnet wie beim Spieler."""
    import molang
    teil = geo["minecraft:geometry"][0]
    knochen = s._modellknochen(teil)
    grund = {"q.life_time": 1.0, "q.modified_distance_moved": 0.0, "q.modified_move_speed": 0.0,
             "v.attack_time": 0.0, "q.target_x_rotation": 0.0, "q.target_y_rotation": 0.0}
    grund.update(werte)
    u = molang.Umgebung(grund)
    pose = s.Pose()
    for a, g in animationen:
        pose.lege_an(a, g, 1.0, u)
    posen = {"": pose}
    texturen = {"": haut}
    datei = {"fynn:haizahnsaebel": "haizahnsaebel", "fynn:geweihbogen": "geweihbogen",
             "fynn:rubinklinge": "rubinklinge"}[waffe]
    w = s.Waffe(RES / "attachables" / f"{datei}.json")
    if w.geo:
        knochen.update(s._modellknochen(w.geo, "w:", bindung="rightitem"))
        u.werte.update({"v.fynn_waffe": 0.0, "q.main_hand_item_use_duration": 0.0})
        posen["w:"] = w.pose(u, False)
        texturen["w:"] = w.textur
    drehpunkte = {n: k["pivot"] for n, k in knochen.items()}
    matrizen = s.baue_matrizen(knochen, posen, drehpunkte)
    seiten = s.flaechen(knochen, matrizen, texturen, ohne_deckschicht=False)
    return s.ansicht_aussen(seiten, 35, 10, 240, 280, 6.0, mitte=(0, 17, 0))


if __name__ == "__main__":
    main()
