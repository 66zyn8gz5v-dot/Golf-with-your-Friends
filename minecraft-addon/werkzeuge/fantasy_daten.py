#!/usr/bin/env python3
"""Steckbriefe der Fantasy-Wesen, erste Welle (4.78) - fuer tiere_bauen.TIERE.

* Feuermuecke: Schwaerme gluehender Muecken im Nether und nachts in der
  Wueste. Ihr Stich setzt in Brand, Wasser loescht sie. Mit einer
  Glasflasche faengt man eine - die Glutflasche wirft man wie eine
  Feuerbombe. Aus ihrem Glutstaub wird Lohenstaub.
* Sturmlibelle: grosse Libelle mit knisternden Fluegeln ueber Suempfen und
  Fluessen. Wer sie schlaegt, bekommt einen Schlag - bei Gewitter einen
  kraeftigen. Sie jagt Feuermuecken. Ihr Sturmfluegel schiesst einen im
  Gleitflug nach vorn.
* Frostkaefer: Kaefer mit Eispanzer in Schnee und Eis. Wird er
  geschlagen, rollt er sich ein und beisst dann mit Frost zurueck; wo er
  laeuft, friert das Wasser. Aus seinen Panzern wird der Frosttalisman.
* Basilisk: der Koenig der Schlangen aus den mittelalterlichen Sagen. Wer
  ihm in die Augen schaut, erstarrt - wegschauen oder den Schild heben. Er
  fuerchtet nur den Hahn. Sein Auge laesst andere erstarren.

Was sich nicht in Komponenten sagen laesst, steht in scripts/fantasy.js.
"""

from kleintiere_daten import familie, SPIELER, LT, STEHT, puls, eigenschaft


def schwebeflug(tempo):
    """Wie Mojangs Biene und Hilfsgeist: schwebt, steht in der Luft, faellt
    nicht."""
    return {
        "minecraft:navigation.hover": {"can_path_over_water": True, "can_sink": False, "can_pass_doors": False,
                                       "can_path_from_air": True, "avoid_water": True,
                                       "avoid_damage_blocks": True},
        "minecraft:movement.hover": {},
        "minecraft:can_fly": {},
        "minecraft:flying_speed": {"value": tempo},
        "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
        "minecraft:damage_sensor": {"triggers": [{"cause": "fall", "deals_damage": False}]},
        "minecraft:behavior.random_hover": {"priority": 8, "xz_dist": 10, "y_dist": 5, "y_offset": -1,
                                            "interval": 1, "hover_height": {"min": 1, "max": 4}},
    }


def boden(biome, bloecke, gewicht, herde, hell=(7, 15)):
    return [{"minecraft:spawns_on_surface": {}, "minecraft:weight": {"default": gewicht},
             "minecraft:herd": {"min_size": herde[0], "max_size": herde[1]},
             "minecraft:spawns_on_block_filter": bloecke,
             "minecraft:brightness_filter": {"min": hell[0], "max": hell[1], "adjust_for_weather": False},
             "minecraft:density_limit": {"surface": 3},
             "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "!=" if m.startswith("!") else "==",
                                         "value": m.lstrip("!")} for m in merkmale]}
            for merkmale in biome]


# ------------------------------------------------------------ Bewegungen

def muecke_bewegungen():
    schlag = f"math.sin({LT} * 4200.0)"
    summen = {"loop": True, "bones": {
        "fluegel_links": {"rotation": [0.0, f"{schlag} * 20.0", f"-12.0 - {schlag} * 45.0"]},
        "fluegel_rechts": {"rotation": [0.0, f"-{schlag} * 20.0", f"12.0 + {schlag} * 45.0"]},
        "rumpf": {"position": [0.0, f"math.sin({LT} * 300.0) * 0.8", 0.0],
                  "rotation": [f"math.sin({LT} * 170.0) * 5.0", 0.0, f"math.sin({LT} * 130.0) * 6.0"]},
        "hinterleib": {"rotation": [f"math.sin({LT} * 420.0) * 7.0", 0.0, 0.0]},
        "beine": {"rotation": [f"20.0 + math.sin({LT} * 260.0) * 10.0", 0.0, 0.0]},
    }}
    # Der Stich: Kopf und Ruessel stossen vor, der Hinterleib schnellt hoch.
    stich = {"loop": True, "bones": {
        "kopf": {"rotation": ["math.sin(variable.attack_time * 180.0) * 35.0", 0.0, 0.0]},
        "hinterleib": {"rotation": ["-math.sin(variable.attack_time * 180.0) * 30.0", 0.0, 0.0]},
    }}
    return {"summen": (summen, "1.0"), "stich": (stich, "variable.attack_time > 0.0")}


def libelle_bewegungen():
    def fl(phase, zeichen, amp=32.0):
        return {"rotation": [0.0, 0.0, f"{zeichen} * (4.0 + math.sin({LT} * 2600.0 + {phase}) * {amp})"]}
    surren = {"loop": True, "bones": {
        # Vorder- und Hinterfluegel gegeneinander versetzt, wie bei echten
        # Libellen - darum stehen sie scheinbar in der Luft.
        "fluegel_vorn_links": fl(0, -1), "fluegel_vorn_rechts": fl(0, 1),
        "fluegel_hinten_links": fl(100, -1), "fluegel_hinten_rechts": fl(100, 1),
        "rumpf": {"position": [0.0, f"math.sin({LT} * 150.0) * 0.6", 0.0],
                  "rotation": [f"-query.target_x_rotation * 0.3", 0.0, f"-variable.fynn_dreh * 2.0"]},
        "hinterleib": {"rotation": [f"math.sin({LT} * 90.0) * 5.0", f"-variable.fynn_dreh * 1.5", 0.0]},
        "leibspitze": {"rotation": [f"math.sin({LT} * 90.0 - 40.0) * 8.0", f"-variable.fynn_dreh * 2.0", 0.0]},
        # Ruckartig umschauen, wie eine Libelle auf der Jagd.
        "kopf": {"rotation": [0.0, f"math.sin(math.floor({LT} * 2.0) * 83.0) * 25.0", 0.0]},
        "beine": {"rotation": [35.0, 0.0, 0.0]},
    }}
    return {"surren": (surren, "1.0")}


def kaefer_bewegungen():
    lauf = f"{LT} * 900.0"
    krabbeln_bones = {}
    for i in range(6):
        # Dreiergang: vorn links, Mitte rechts, hinten links zusammen - und
        # die anderen drei genau gegenlaeufig.
        gruppe = 0 if i in (0, 3, 4) else 180
        seite = 1 if i % 2 == 0 else -1
        krabbeln_bones[f"bein{i}"] = {"rotation": [
            f"math.max(0.0, math.sin({lauf} + {gruppe} + 90.0)) * -18.0",
            f"math.sin({lauf} + {gruppe}) * 22.0 * {seite}", 0.0]}
    krabbeln_bones["koerper"] = {"rotation": [0.0, f"math.sin({lauf} * 2.0) * 1.5", 0.0]}
    krabbeln = {"loop": True, "bones": krabbeln_bones}
    tasten = {"loop": True, "bones": {
        "fuehler_links": {"rotation": [f"math.sin({LT} * 120.0) * 12.0", f"math.sin({LT} * 80.0) * 10.0", 0.0]},
        "fuehler_rechts": {"rotation": [f"math.sin({LT} * 120.0 + 60.0) * 12.0",
                                        f"math.sin({LT} * 80.0 + 90.0) * 10.0", 0.0]},
        "kiefer_links": {"rotation": [0.0, f"-math.max(0.0, math.sin({LT} * 60.0)) * 18.0", 0.0]},
        "kiefer_rechts": {"rotation": [0.0, f"math.max(0.0, math.sin({LT} * 60.0)) * 18.0", 0.0]},
        "kristalle": {"scale": f"1.0 + math.sin({LT} * 90.0) * 0.04"},
    }}
    gerollt = {"loop": True, "bones": dict(
        {f"bein{i}": {"scale": 0.05} for i in range(6)},
        kopf={"scale": 0.3, "position": [0.0, 0.0, 3.0]},
        koerper={"position": [0.0, -1.5, 0.0], "scale": [1.05, 1.15, 0.85]},
        panzer_links={"rotation": [0.0, 0.0, -18.0]},
        panzer_rechts={"rotation": [0.0, 0.0, 18.0]},
    )}
    beissen = {"loop": True, "bones": {
        "kiefer_links": {"rotation": [0.0, "-math.sin(variable.attack_time * 540.0) * 35.0", 0.0]},
        "kiefer_rechts": {"rotation": [0.0, "math.sin(variable.attack_time * 540.0) * 35.0", 0.0]},
        "kopf": {"rotation": ["math.sin(variable.attack_time * 180.0) * 15.0", 0.0, 0.0]},
    }}
    return {
        "krabbeln": (krabbeln, "math.clamp(query.modified_move_speed * 5.0, 0.0, 1.0)"),
        "tasten": (tasten, "1.0"),
        "einrollen": (gerollt, "query.property('fynn:gerollt')"),
        "beissen": (beissen, "variable.attack_time > 0.0"),
    }


def basilisk_bewegungen():
    # Der Blick: Kopf hoch, die Krone richtet sich auf, das Maul steht offen.
    starren = {"loop": True, "bones": {
        "head": {"rotation": [-18.0, 0.0, 0.0]},
        "krone": {"scale": [1.25, 1.35, 1.25]},
        "kiefer": {"rotation": [14.0, 0.0, 0.0]},
        "body": {"rotation": [-6.0, 0.0, 0.0]},
        "tail": {"rotation": [0.0, f"math.sin({LT} * 400.0) * 12.0", 0.0]},
    }}
    zischen = {"loop": True, "bones": {
        "kiefer": {"rotation": [f"26.0 + math.sin({LT} * 1800.0) * 3.0", 0.0, 0.0]},
        "head": {"rotation": [-10.0, 0.0, 0.0]},
    }}
    # Der Schwanz schlaengelt - er ist ein halber Drache, halb Schlange.
    schlaengeln = {"loop": True, "bones": {
        "tail": {"rotation": [0.0, f"math.sin({LT} * 160.0) * 10.0", 0.0]},
        "tail2": {"rotation": [0.0, f"math.sin({LT} * 160.0 - 50.0) * 14.0", 0.0]},
        "tail3": {"rotation": [0.0, f"math.sin({LT} * 160.0 - 100.0) * 18.0", 0.0]},
    }}
    return {
        "starren": (starren, "query.property('fynn:starrt')"),
        "zischen": (zischen, f"{STEHT} * {puls(15.0, 80, 0.88)} * (1.0 - query.property('fynn:starrt'))"),
        "schlaengeln": (schlaengeln, "1.0"),
    }


# ------------------------------------------------------------ Die Wesen

def _feuermuecke():
    k = schwebeflug(0.5)
    k.update({
        "minecraft:fire_immune": {},
        # Wasser loescht sie; die Lava vertraegt sie.
        "minecraft:hurt_on_condition": {"damage_conditions": [{
            "filters": {"test": "in_water", "subject": "self", "operator": "==", "value": True},
            "cause": "drowning", "damage_per_tick": 1}]},
        # Mit einer Glasflasche einfangen: Die Muecke ist dann in der Flasche.
        "minecraft:interact": {"interactions": [{
            "on_interact": {"filters": {"all_of": [
                SPIELER, {"test": "has_equipment", "domain": "hand", "subject": "other",
                          "value": "minecraft:glass_bottle"}]},
                "event": "fynn:gefangen", "target": "self"},
            "use_item": True, "transform_to_item": "fynn:glutflasche",
            "interact_text": "action.interact.fynn_fangen"}]},
    })
    nether = [{"minecraft:spawns_on_surface": {}, "minecraft:spawns_underground": {},
               "minecraft:weight": {"default": 12}, "minecraft:herd": {"min_size": 3, "max_size": 6},
               "minecraft:density_limit": {"surface": 6, "underground": 6},
               "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==", "value": "nether"}]}]
    return {
        "id": "feuermuecke", "name": ("Feuermücke", "Fire Gnat"), "gestalt": "feuermuecke", "gruppe": "Fantasy",
        "varianten": [("glut", 85), ("seelenglut", 15)],
        "art": "insekt", "verhalten": "feindlich", "reichweite": 10, "leben": 4, "schaden": 2, "tempo": 0.3,
        "kollision": (0.8, 0.8), "skalierung": 0.45, "baby": False, "herde": (3, 6),
        "biome": [["desert"]], "gewicht": 6,
        "spawn_bedingungen": nether + boden([["desert"]], ["minecraft:sand", "minecraft:sandstone"], 8, (3, 5),
                                            hell=(0, 7)),
        "population": "monster",
        "material": "entity_emissive_alpha",
        "beute": [("fynn:glutstaub", 0, 2, 1.0, False)],
        "laute": {"ambient": "mob.bee.aggressive", "hurt": "mob.bee.hurt", "death": "mob.bee.death",
                  "pitch": [1.8, 2.1]},
        "ei": ("#2a1a14", "#ff9a3a"),
        "komponenten": k,
        "gruppen": {"fynn:gefangen": {"minecraft:instant_despawn": {}}},
        "ereignisse": {"fynn:gefangen": {"add": {"component_groups": ["fynn:gefangen"]}}},
        "eigene_bewegungen": muecke_bewegungen(),
        "steckbrief_extra": [
            ["Stich", "setzt dich für ein paar Sekunden in Brand"],
            ["Schwäche", "Wasser löscht sie"],
            ["Glasflasche", "fängt eine Feuermücke – die Glutflasche wirft man wie eine Feuerbombe"],
            ["Glutstaub", "zwei davon werden zu Lohenstaub"]],
    }


def _sturmlibelle():
    k = schwebeflug(0.7)
    k.update({
        # Libellen jagen Muecken - auch die gluehenden.
        "minecraft:attack": {"damage": 2},
        "minecraft:behavior.melee_box_attack": {"priority": 4, "speed_multiplier": 1.2},
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 5, "must_see": True, "within_radius": 16, "reselect_targets": True,
            "entity_types": [{"filters": familie("feuermuecke"), "max_dist": 16}]},
    })
    return {
        "id": "sturmlibelle", "name": ("Sturmlibelle", "Storm Dragonfly"), "gestalt": "sturmlibelle",
        "gruppe": "Fantasy",
        "varianten": [("blau", 75), ("gewitter", 25)],
        "art": "insekt", "verhalten": "friedlich", "leben": 8, "tempo": 0.3,
        "kollision": (1.2, 0.7), "skalierung": 0.75, "baby": False, "herde": (1, 2),
        "biome": [["swamp"]], "gewicht": 5,
        "spawn_bedingungen": boden([["swamp"], ["river"], ["mangrove_swamp"], ["beach", "!cold"]],
                                   ["minecraft:grass_block", "minecraft:sand", "minecraft:mud", "minecraft:dirt"],
                                   5, (1, 2)),
        "material": "entity_emissive_alpha",
        "beute": [("fynn:sturmfluegel", 1, 1, 0.5, False)],
        "laute": {"ambient": "mob.bee.aggressive", "hurt": "mob.bee.hurt", "death": "mob.bee.death",
                  "pitch": [0.9, 1.1]},
        "ei": ("#1e5a8a", "#8af4ff"),
        "komponenten": k,
        "eigene_bewegungen": libelle_bewegungen(),
        "steckbrief_extra": [
            ["Achtung", "wer sie schlägt, bekommt einen elektrischen Schlag – bei Gewitter einen starken"],
            ["Jagt", "Feuermücken"],
            ["Sturmflügel", "im Gleitflug mit der Elytra benutzen: ein Schub nach vorn (16 Mal)"]],
    }


def _frostkaefer():
    k = {
        "minecraft:navigation.walk": {"avoid_water": False, "avoid_damage_blocks": True},
        "minecraft:movement.basic": {},
        "minecraft:jump.static": {},
        "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
        "minecraft:freezing_immune": {},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.random_stroll": {"priority": 6, "speed_multiplier": 1.0},
        "minecraft:behavior.look_at_player": {"priority": 8, "look_distance": 6, "probability": 0.02},
    }
    gerollt = {"minecraft:movement": {"value": 0.0},
               "minecraft:damage_sensor": {"triggers": [{"cause": "all", "damage_multiplier": 0.3}]}}
    return {
        "id": "frostkaefer", "name": ("Frostkäfer", "Frost Beetle"), "gestalt": "frostkaefer", "gruppe": "Fantasy",
        "varianten": [("eis", 70), ("gletscher", 30)],
        "art": "kriecher", "verhalten": "neutral", "leben": 14, "schaden": 3, "tempo": 0.12,
        "kollision": (1.2, 0.8), "skalierung": 0.6, "baby": False, "herde": (1, 3),
        "biome": [["frozen"]], "gewicht": 6,
        "spawn_bedingungen": boden([["frozen"], ["ice_plains"], ["snowy_slopes"], ["grove"], ["frozen_peaks"]],
                                   ["minecraft:snow", "minecraft:snow_layer", "minecraft:ice", "minecraft:packed_ice",
                                    "minecraft:grass_block", "minecraft:stone"], 6, (1, 3)),
        "material": "entity_emissive_alpha",
        "beute": [("fynn:frostpanzer", 1, 1, 0.7, False)],
        "laute": {"ambient": "mob.silverfish.say", "hurt": "mob.silverfish.hit", "death": "mob.silverfish.kill",
                  "step": "mob.silverfish.step", "pitch": [0.5, 0.65]},
        "ei": ("#6aa8d8", "#d8f8ff"),
        "komponenten": k,
        "gruppen": {"fynn:gerollt": gerollt},
        "ereignisse": {"fynn:einrollen": {"add": {"component_groups": ["fynn:gerollt"]},
                                          "set_property": {"fynn:gerollt": True}},
                       "fynn:ausrollen": {"remove": {"component_groups": ["fynn:gerollt"]},
                                          "set_property": {"fynn:gerollt": False}}},
        "eigenschaften": eigenschaft("fynn:gerollt"),
        "eigene_bewegungen": kaefer_bewegungen(),
        "steckbrief_extra": [
            ["Besonders", "friert Wasser zu Eis, wo er läuft"],
            ["Geschlagen", "rollt sich in seinen Eispanzer ein – und beißt dann mit Frost zurück"],
            ["Frostpanzer", "vier davon und ein Diamant: der Frosttalisman – Feuerschutz, "
                            "und unter dir friert das Wasser"]],
    }


def _basilisk():
    return {
        "id": "basilisk", "name": ("Basilisk", "Basilisk"), "gestalt": "basilisk", "gruppe": "Fantasy",
        "varianten": [("wueste", 65), ("schatten", 35)],
        "art": "land", "verhalten": "feindlich", "reichweite": 12, "leben": 36, "schaden": 5, "gift": True,
        "tempo": 0.24, "kollision": (1.2, 0.9), "baby": False, "herde": (1, 1),
        # Die Sage: Nur den Hahn fuerchtet der Basilisk.
        "flieht": ["chicken"],
        "biome": [["desert"], ["mesa"]], "gewicht": 2,
        "boden": ["minecraft:sand", "minecraft:red_sand", "minecraft:sandstone", "minecraft:terracotta"],
        "population": "monster",
        "material": "entity_emissive_alpha",
        "beute": [("fynn:basiliskenauge", 1, 1, 0.4, False), ("minecraft:bone", 0, 2, 1.0, False)],
        "laute": {"ambient": "mob.cat.hiss", "hurt": "mob.turtle.hurt", "death": "mob.turtle.death",
                  "step": "mob.turtle.step", "pitch": [0.5, 0.65]},
        "ei": ("#9a8248", "#e0b030"), "angriff": "biss",
        "eigenschaften": eigenschaft("fynn:starrt"),
        "eigene_bewegungen": basilisk_bewegungen(),
        "steckbrief_extra": [
            ["Blick", "wer ihm in die Augen schaut, wird langsam und erstarrt zu Stein – wegschauen!"],
            ["Schutz", "Schild heben (schleichen): Der Blick prallt zurück, und er erstarrt selbst"],
            ["Biss", "giftig"],
            ["Schwäche", "flieht vor Hühnern – die Sage sagt: vor dem Hahn"],
            ["Basiliskenauge", "benutzen: Das Wesen, das du ansiehst, erstarrt"]],
    }


# ------------------------------------------------------------ Sandwurm (4.79)

def maul(offen):
    """Die vier Kieferklappen, um 'offen' Grad nach aussen geklappt."""
    return {"kiefer_nord": {"rotation": [offen, 0.0, 0.0]},
            "kiefer_sued": {"rotation": [f"-({offen})", 0.0, 0.0]},
            "kiefer_ost": {"rotation": [0.0, 0.0, offen]},
            "kiefer_west": {"rotation": [0.0, 0.0, f"-({offen})"]}}


def sandwurm_bewegungen():
    from fantasy_gestalt import SANDWURM_GLIEDER as N
    # Aufgerichtet wie eine Kobra: unten gerade, oben zur Beute vorgebeugt
    # - und dabei langsam wiegend.
    wiegen = {f"glied{i}": {"rotation": [f"{max(0, i - 3) * 7} + math.sin({LT} * 70.0 + {i * 35}) * {2.5 + i * 0.4}",
                                         0.0, f"math.cos({LT} * 55.0 + {i * 35}) * {2.5 + i * 0.4}"]}
              for i in range(1, N)}
    wiegen.update(maul(f"28.0 + math.sin({LT} * 110.0) * 14.0"))
    wiegen["kopf"] = {"rotation": [f"math.sin({LT} * 90.0) * 6.0", f"math.sin({LT} * 40.0) * 20.0", 0.0]}
    # Unter dem Sand: vom Wurm ist nichts zu sehen, nur der Huegel wandert
    # und bebt.
    unten = {"loop": True, "bones": {
        "koerper": {"scale": 0.0},
        "huegel": {"scale": [f"1.0 + math.sin({LT} * 400.0) * 0.05", f"1.0 + math.sin({LT} * 520.0) * 0.15",
                             f"1.0 + math.cos({LT} * 400.0) * 0.05"]},
    }}
    oben = {"loop": True, "bones": {"huegel": {"scale": 0.0}}}
    # Auftauchen: Er schiesst aus dem Sand, das Maul reisst auf, die Glieder
    # peitschen nach - dann steht er.
    auf = {"animation_length": 1.3, "loop": "hold_on_last_frame", "bones": {
        "koerper": {"position": {"0.0": [0, -95, 0], "0.45": [0, -35, 0], "0.85": [0, 6, 0], "1.3": [0, 0, 0]}},
        "huegel": {"scale": {"0.0": [1.4, 1.6, 1.4], "0.3": [1.2, 0.8, 1.2], "0.5": [0.0, 0.0, 0.0]}},
    }}
    # Das Maul: erst zu, dann weit auf, dann halb offen stehen.
    for k, v in maul(1.0).items():
        r = v["rotation"]
        zeichen = [(-1 if isinstance(a, str) else 1) if a else 0 for a in r]
        offen = [z * 65 for z in zeichen]
        auf["bones"][k] = {"rotation": {"0.0": [0, 0, 0], "0.55": [z * -20 for z in zeichen], "0.9": offen,
                                        "1.3": [z * 20 for z in zeichen]}}
    for i in range(1, N):
        # Jedes Glied nur ein wenig - zusammen sind es sonst ueber sechzig Grad.
        peitsche = 5 - i * 0.4
        auf["bones"][f"glied{i}"] = {"rotation": {"0.0": [0, 0, 0], "0.7": [-peitsche, 0, 0],
                                                  "0.95": [peitsche * 0.8, 0, 0], "1.3": [0, 0, 0]}}
    # Abtauchen: Er beugt sich vornueber und gleitet zurueck in den Sand.
    ab = {"animation_length": 1.1, "loop": "hold_on_last_frame", "bones": {
        "koerper": {"position": {"0.0": [0, 0, 0], "0.3": [0, 4, 0], "1.1": [0, -95, 0]}},
    }}
    for i in range(3, N):
        ab["bones"][f"glied{i}"] = {"rotation": {"0.0": [0, 0, 0], "0.5": [10 + i, 0, 0], "1.1": [18 + i, 0, 0]}}
    # Zuschnappen: Die oberen Glieder stossen vor, das Maul klappt auf.
    schnappen = {"loop": True, "bones": dict(
        {f"glied{i}": {"rotation": [f"math.sin(variable.attack_time * 180.0) * {6 + (i - 4) * 4}", 0.0, 0.0]}
         for i in range(4, N)},
        kopf={"rotation": ["math.sin(variable.attack_time * 180.0) * 28.0", 0.0, 0.0]},
        **maul("math.sin(variable.attack_time * 180.0) * 60.0"))}
    return {
        "wiegen": ({"loop": True, "bones": wiegen}, "1.0 - query.property('fynn:unten')"),
        "unten": (unten, "query.property('fynn:unten')"),
        "oben": (oben, "1.0 - query.property('fynn:unten')"),
        "auftauchen": (auf, "query.property('fynn:auf')"),
        "abtauchen": (ab, "query.property('fynn:ab')"),
        "schnappen": (schnappen, "variable.attack_time > 0.0"),
    }


def _sandwurm():
    hoert = {"all_of": [SPIELER, {"test": "has_ability", "subject": "other", "value": "instabuild", "operator": "!="},
                        {"test": "is_sneaking", "subject": "other", "value": False}]}
    k = {
        "minecraft:navigation.walk": {"avoid_water": True, "can_path_over_water": False, "avoid_damage_blocks": True},
        "minecraft:movement.basic": {},
        "minecraft:jump.static": {},
        "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0, "breathes_solids": True},
        "minecraft:knockback_resistance": {"value": 1.0},
        "minecraft:behavior.hurt_by_target": {"priority": 1},
        "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 1.0, "interval": 60},
    }
    unten = {
        # Unter dem Sand ist er nicht zu treffen.
        "minecraft:damage_sensor": {"triggers": [{"cause": "all", "deals_damage": False}]},
        # Er hoert Schritte - wer schleicht, den findet er nicht.
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 2, "must_see": False, "reselect_targets": True, "within_radius": 24,
            "entity_types": [{"filters": hoert, "max_dist": 24}]},
        "minecraft:behavior.move_towards_target": {"priority": 3, "within_radius": 32, "speed_multiplier": 1.3},
    }
    oben = {
        "minecraft:movement": {"value": 0.0},
        "minecraft:attack": {"damage": 10},
        "minecraft:behavior.melee_box_attack": {"priority": 2, "speed_multiplier": 1.0, "track_target": True},
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 2, "must_see": True, "reselect_targets": True, "within_radius": 12,
            "entity_types": [{"filters": {"all_of": [SPIELER, {"test": "has_ability", "subject": "other",
                                                               "value": "instabuild", "operator": "!="}]},
                              "max_dist": 12}]},
    }
    return {
        "id": "sandwurm", "name": ("Sandwurm", "Sandworm"), "gestalt": "sandwurm", "gruppe": "Fantasy",
        "varianten": [("wueste", 70), ("rotsand", 30)], "variante_nach_biom": {"mesa": 1},
        "art": "kriecher", "verhalten": "wurm", "keine_panik": True,
        "leben": 80, "schaden": 10, "tempo": 0.22, "kollision": (2.2, 3.5), "baby": False, "herde": (1, 1),
        "biome": [["desert"], ["mesa"]], "gewicht": 2,
        "boden": ["minecraft:sand", "minecraft:red_sand"],
        "population": "monster",
        "beute": [("fynn:wurmzahn", 1, 3, 1.0, False), ("fynn:sandperle", 1, 1, 0.25, False)],
        "laute": {"hurt": "mob.ravager.hurt", "death": "mob.ravager.death", "pitch": [0.45, 0.55]},
        "ei": ("#b8925e", "#8a2a2a"),
        "komponenten": k,
        "gruppen": {"fynn:unten": unten, "fynn:oben": oben},
        "ereignisse": {
            "fynn:auftauchen": {"remove": {"component_groups": ["fynn:unten"]}, "add": {"component_groups": ["fynn:oben"]},
                                "set_property": {"fynn:unten": False, "fynn:auf": True, "fynn:ab": False}},
            "fynn:steht": {"set_property": {"fynn:auf": False}},
            "fynn:abtauchen": {"set_property": {"fynn:ab": True, "fynn:auf": False}},
            "fynn:versunken": {"remove": {"component_groups": ["fynn:oben"]}, "add": {"component_groups": ["fynn:unten"]},
                               "set_property": {"fynn:unten": True, "fynn:ab": False}},
        },
        "start_gruppen": ["fynn:unten"], "start_setzen": {"fynn:unten": True},
        "eigenschaften": eigenschaft("fynn:unten", "fynn:auf", "fynn:ab"),
        "eigene_bewegungen": sandwurm_bewegungen(),
        "steckbrief_extra": [
            ["Unter dem Sand", "nur ein wandernder Sandhügel – der Boden bebt; dort ist er nicht zu treffen"],
            ["Hört", "Schritte – wer schleicht, den findet er nicht"],
            ["Angriff", "bricht direkt unter dir aus dem Sand und schnappt zu, dann taucht er wieder ab"],
            ["Sandklopfer", "aus Wurmzähnen – klopft auf Sand und lockt Sandwürmer an"],
            ["Sandperle", "selten – wer sie trägt, den hört er nicht, und auf Sand bist du schneller"]],
    }


FANTASY = [_feuermuecke(), _sturmlibelle(), _frostkaefer(), _basilisk(), _sandwurm()]
