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

Seit 4.90 (Fynn: "Wenn man die getoetet hat, fallen die so nieder ... man
kann sie dann entweder toeten, dann kriegt man den Stuff, oder heilen,
dann sind die zugeneigt, man kann sie dann reiten"):

* fynn:besiegt  - bei einem Viertel Leben bricht er zusammen, liegt da und
                  nimmt keinen Schaden. Drei Schlaege: Gnadenstoss (Beute).
                  Ein Goldapfel: geheilt und gezaehmt. Sonst erholt er sich.
* fynn:zahm     - folgt (fynn:folgt) oder bleibt (fynn:bleibt), traegt einen
                  Sattel (fynn:gesattelt) und einen Reiter, fliegt mit ihm.
* fynn:schlaf   - nachts eingerollt, Augen zu; Schaden weckt ihn.
* fynn:wildjagd - nur wilde Drachen suchen sich Spieler als Beute.
"""

from kleintiere_daten import familie, SPIELER, LT, eigenschaft

FLIEGT = "query.property('fynn:fliegt')"
FEUER = "query.property('fynn:feuer')"
# Liegt er (im Schlaf oder besiegt)? Dann ruhen Stand, Gang und Bruellen.
LIEGT = "math.max(query.property('fynn:schlaeft'), query.property('fynn:besiegt'))"
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


def zusammen(knochen, finger=5):
    """Gefaltet: Die Flughaut zieht sich zu ihrem Knochen hin zusammen - an
    Ober- und Unterarm und zwischen den Fingern. Sonst stuende sie, starr am
    Knochen, als Segel in die Luft."""
    for seite in ("links", "rechts"):
        knochen[f"armhaut_{seite}"] = {"scale": [1.0, 1.0, 0.15]}
        knochen[f"unterarmhaut_{seite}"] = {"scale": [1.0, 1.0, 0.15]}
        for i in range(1, finger):
            knochen[f"fingerhaut{i}_{seite}"] = {"scale": [1.0, 1.0, 0.12]}
    return knochen


# ------------------------------------------------------------ Bewegungen

def drachen_bewegungen(schwinge, hals=4, schwanz=6, tempo=220.0, beinhoehe=20, finger=None, stuetzt=False):
    """schwinge: die Schwinge der Art (fuer die ausgerechnete Faltung);
    beinhoehe: wie tief der Leib beim Liegen sinkt; stuetzt: ein Wyvern,
    der am Boden auf den Handgelenken der Schwingen geht."""
    import drachen_gestalt as dg
    falt = dg.faltung(schwinge, stuetzt)
    finger = schwinge.anzahl
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
        # Beim Heben legen sich die hinteren Finger ein Stueck an.
        **{f"finger{i}": [0.0, f"-math.max(0.0, -math.sin({phi})) * {4.0 * i}", 0.0] for i in range(2, finger + 1)},
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
    beidseitig(stand, dict(falt))
    zusammen(stand, finger)
    for i, w in enumerate((-14.0, -8.0, 0.0, 6.0, 8.0)[:hals]):
        stand[f"hals{i + 1}"] = {"rotation": [f"{w} + math.sin({LT} * 40.0 - {i * 25}) * 1.5", 0.0, 0.0]}
    stand["kopf"] = {"rotation": [f"16.0 + math.sin({LT} * 40.0 - 120.0) * 3.0",
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
    if stuetzt:
        # Der Wyvern setzt die Handgelenke im Wechsel mit den Fuessen vor,
        # wie eine Fledermaus am Boden: die Schulter schwingt vor und zurueck.
        for seite, phase, zeichen in (("links", 180.0, 1), ("rechts", 0.0, -1)):
            gang[f"fluegel_{seite}"] = {"rotation": [0.0, f"math.sin({w} + {phase}) * 14.0 * {zeichen}",
                                                     f"math.max(0.0, math.cos({w} + {phase})) * -8.0 * {zeichen}"]}
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

    # Liegen - im Schlaf und besiegt. Wie auf Fynns Vorbild: flach auf dem
    # Bauch, die Vorderbeine nach vorn, die Hinterbeine untergeschlagen, der
    # Hals zur Seite gelegt, der Kopf am Boden, der Schwanz um den Leib
    # gerollt, die Schwingen gefaltet. Nur der Atem hebt die Flanken.
    liegen = {}
    beidseitig(liegen, dict(falt))
    zusammen(liegen, finger)
    beidseitig(liegen, {"bein_vorn": [-75.0, 0.0, 0.0], "unterbein_vorn": [55.0, 0.0, 0.0],
                        "fuss_vorn": [20.0, 0.0, 0.0],
                        "bein_hinten": [-60.0, 0.0, 0.0], "unterbein_hinten": [120.0, 0.0, 0.0],
                        "fuss_hinten": [-55.0, 0.0, 0.0]})
    liegen["rumpf"] = {"position": [0.0, -(beinhoehe - 7.0), 0.0],
                       "scale": [f"1.0 + math.sin({LT} * 40.0) * 0.02", f"1.0 + math.sin({LT} * 40.0) * 0.03", 1.0]}
    for i in range(1, hals + 1):
        liegen[f"hals{i}"] = {"rotation": [14.0 if i == 1 else 6.0, 24.0, 0.0]}
    liegen["kopf"] = {"rotation": [-8.0, 20.0, 8.0]}
    for i in range(1, schwanz + 1):
        liegen[f"schwanz{i}"] = {"rotation": [-4.0 if i == 1 else 0.0, -24.0, 0.0]}
    # Besiegt: ab und zu ein schwaches Zucken, das Maul einen Spalt offen.
    benommen = {"kopf": {"rotation": [f"math.max(0.0, math.sin({LT} * 50.0)) * 6.0", 0.0, 0.0]},
                "kiefer": {"rotation": [10.0, 0.0, 0.0]},
                f"schwanz{schwanz}": {"rotation": [0.0, f"math.sin({LT} * 80.0) * 10.0", 0.0]}}

    ruht = f"(1.0 - {LIEGT})"
    return {
        "flug": ({"loop": True, "bones": flug}, f"{FLIEGT} * {ruht}"),
        "stand": ({"loop": True, "bones": stand}, f"(1.0 - {FLIEGT}) * {ruht}"),
        "gehen": ({"loop": True, "bones": gang}, f"(1.0 - {FLIEGT}) * {LAEUFT} * {ruht}"),
        "liegen": ({"loop": True, "bones": liegen}, LIEGT),
        "benommen": ({"loop": True, "bones": benommen}, "query.property('fynn:besiegt')"),
        "feueratem": ({"loop": True, "bones": feuer}, FEUER),
        # Eigener Name: "bruellen" gibt der Tierbau allen Tieren mit eigenem
        # Zufallstakt (ZUSATZ_GEWICHT) - das weckte sonst Schlafende.
        "drachenbruellen": ({"loop": True, "bones": bruellen},
                     f"(1.0 - {FLIEGT}) * (1.0 - {LAEUFT}) * (1.0 - {FEUER}) * {ruht} * ({zeit} < 2.2)"),
        "sturzflug": ({"loop": True, "bones": stoss},
                      f"{FLIEGT} * math.clamp(-query.vertical_speed * 0.6 - 0.2, 0.0, 1.0)"),
    }


# ------------------------------------------------------------ Verhalten

HEILMITTEL = ["minecraft:golden_apple", "minecraft:enchanted_golden_apple"]


def drachen_zustaende(tempo_luft, tempo_boden, beute, sitz, reitflug=0.5, reichweite=48, schwimmt=False):
    """Alle Zustaende eines Drachen als Komponentengruppen, dazu die
    Ereignisse, die zwischen ihnen wechseln. sitz: wo der Reiter sitzt."""
    kein_kreativ = {"test": "has_ability", "subject": "other", "value": "instabuild", "operator": "!="}
    kein_fall = {"cause": "fall", "deals_damage": False}
    gruppen = {}
    gruppen["fynn:wildjagd"] = {"minecraft:behavior.nearest_attackable_target": {
        "priority": 2, "must_see": True, "reselect_targets": True, "within_radius": reichweite,
        "target_search_height": reichweite,
        "entity_types": [{"filters": {"all_of": [SPIELER, kein_kreativ]}, "max_dist": reichweite},
                         {"filters": familie(*beute), "max_dist": 32}]}}
    gruppen["fynn:luft"] = {
        "minecraft:movement": {"value": tempo_luft},
        "minecraft:movement.glide": {"start_speed": 0.12, "speed_when_turning": 0.2},
        "minecraft:physics": {"has_gravity": False},
        "minecraft:behavior.circle_around_anchor": {
            "priority": 3, "goal_radius": 1.5, "radius_range": {"min": 12.0, "max": 22.0},
            "height_offset_range": {"min": -4, "max": 6}, "height_above_target_range": {"min": 14, "max": 26}},
        "minecraft:behavior.swoop_attack": {"priority": 2, "damage_reach": 0.6, "speed_multiplier": 1.0,
                                            "delay_range": {"min": 10.0, "max": 20.0}},
    }
    gruppen["fynn:boden"] = {
        "minecraft:movement": {"value": tempo_boden},
        "minecraft:movement.basic": {},
        "minecraft:navigation.walk": {"can_path_over_water": False, "avoid_water": not schwimmt,
                                      "avoid_damage_blocks": True},
        "minecraft:physics": {},
        "minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.3, "track_target": True},
        "minecraft:behavior.random_stroll": {"priority": 6, "speed_multiplier": 0.8, "xz_dist": 12},
        "minecraft:behavior.look_at_player": {"priority": 7, "look_distance": 16, "probability": 0.05},
    }
    # Schlaf: Er liegt still; wer ihm Schaden tut, weckt ihn.
    gruppen["fynn:schlaf"] = {
        "minecraft:movement": {"value": 0.0},
        "minecraft:damage_sensor": {"triggers": [kein_fall, {"cause": "all", "deals_damage": True,
                                                             "on_damage": {"event": "fynn:aufwachen"}}]},
    }
    # Besiegt: Er liegt da, nimmt keinen Schaden mehr - und laesst sich mit
    # einem Goldapfel heilen. Das Zaehmen macht Minecraft selbst (tameable):
    # Es nimmt den Apfel aus der Hand und merkt sich, wem der Drache gehoert.
    gruppen["fynn:besiegt"] = {
        "minecraft:movement": {"value": 0.0},
        "minecraft:physics": {},
        "minecraft:damage_sensor": {"triggers": [{"cause": "all", "deals_damage": False}]},
        "minecraft:tameable": {"probability": 1.0, "tame_items": HEILMITTEL,
                               "tame_event": {"event": "fynn:geheilt", "target": "self"}},
    }
    # Beim Gnadenstoss faellt der Schutz weg, das Skript gibt den letzten Schlag.
    gruppen["fynn:sterbend"] = {"minecraft:movement": {"value": 0.0}, "minecraft:physics": {}}
    sattel_in_hand = {"test": "has_equipment", "subject": "other", "domain": "hand", "value": "saddle"}
    hat_sattel = {"test": "has_equipment", "subject": "self", "domain": "inventory", "value": "saddle"}
    nicht_geduckt = {"test": "is_sneak_held", "subject": "other", "value": False}
    gruppen["fynn:zahm"] = {
        "minecraft:is_tamed": {},
        "minecraft:inventory": {"container_type": "horse"},
        "minecraft:equippable": {"slots": [{"slot": 0, "item": "saddle", "accepted_items": ["saddle"],
                                            "on_equip": {"event": "fynn:gesattelt"},
                                            "on_unequip": {"event": "fynn:abgesattelt"}}]},
        "minecraft:interact": {"interactions": [
            {"on_interact": {"filters": {"all_of": [dict(hat_sattel, operator="not"), sattel_in_hand, nicht_geduckt]}},
             "equip_item_slot": "0", "interact_text": "action.interact.saddle"},
            {"on_interact": {"filters": {"all_of": [
                hat_sattel, {"test": "rider_count", "subject": "self", "operator": "equals", "value": 0},
                {"test": "has_equipment", "subject": "other", "domain": "hand", "value": "shears"}, nicht_geduckt]}},
             "hurt_item": 1, "drop_item_slot": "0", "drop_item_y_offset": 2,
             "interact_text": "action.interact.removesaddle", "play_sounds": "unsaddle"}]},
        "minecraft:rideable": {"seat_count": 1, "crouching_skip_interact": True, "family_types": ["player"],
                               "interact_text": "action.interact.ride.horse", "seats": [{"position": sitz}]},
        "minecraft:behavior.owner_hurt_by_target": {"priority": 1},
        "minecraft:behavior.owner_hurt_target": {"priority": 2},
        "minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.3, "track_target": True},
        "minecraft:variable_max_auto_step": {"base_value": 1.0625, "controlled_value": 1.0625,
                                             "jump_prevented_value": 0.5625},
    }
    gruppen["fynn:folgt"] = {"minecraft:behavior.follow_owner": {
        "priority": 4, "speed_multiplier": 1.2, "start_distance": 12, "stop_distance": 4, "can_teleport": True}}
    gruppen["fynn:bleibt"] = {"minecraft:movement": {"value": 0.0}}
    gruppen["fynn:gesattelt"] = {
        "minecraft:is_saddled": {},
        "minecraft:input_ground_controlled": {},
        "minecraft:behavior.player_ride_tamed": {},
        "minecraft:movement": {"value": tempo_boden * 1.4},
        "minecraft:can_power_jump": {},
        "minecraft:horse.jump_strength": {"value": reitflug},
    }
    alle_wild = ["fynn:luft", "fynn:boden", "fynn:schlaf", "fynn:wildjagd"]
    ereignisse = {
        "fynn:landen": {"remove": {"component_groups": ["fynn:luft"]}, "add": {"component_groups": ["fynn:boden"]},
                        "set_property": {"fynn:fliegt": False}},
        "fynn:abheben": {"remove": {"component_groups": ["fynn:boden", "fynn:schlaf"]},
                         "add": {"component_groups": ["fynn:luft"]},
                         "set_property": {"fynn:fliegt": True, "fynn:schlaeft": False}},
        "fynn:einschlafen": {"add": {"component_groups": ["fynn:schlaf"]}, "set_property": {"fynn:schlaeft": True}},
        "fynn:aufwachen": {"remove": {"component_groups": ["fynn:schlaf"]}, "set_property": {"fynn:schlaeft": False}},
        "fynn:niedergeschlagen": {"remove": {"component_groups": alle_wild}, "add": {"component_groups": ["fynn:besiegt"]},
                                  "set_property": {"fynn:besiegt": True, "fynn:fliegt": False, "fynn:schlaeft": False,
                                                   "fynn:feuer": False}},
        "fynn:gnadenstoss": {"remove": {"component_groups": ["fynn:besiegt"]}, "add": {"component_groups": ["fynn:sterbend"]}},
        "fynn:erholt": {"remove": {"component_groups": ["fynn:besiegt"]},
                        "add": {"component_groups": ["fynn:boden", "fynn:wildjagd"]},
                        "set_property": {"fynn:besiegt": False}},
        "fynn:geheilt": {"remove": {"component_groups": ["fynn:besiegt"] + alle_wild},
                         "add": {"component_groups": ["fynn:zahm", "fynn:boden", "fynn:folgt"]},
                         "set_property": {"fynn:besiegt": False, "fynn:fliegt": False}},
        "fynn:gesattelt": {"add": {"component_groups": ["fynn:gesattelt"]}},
        "fynn:abgesattelt": {"remove": {"component_groups": ["fynn:gesattelt"]}},
        "fynn:bleiben": {"remove": {"component_groups": ["fynn:folgt"]}, "add": {"component_groups": ["fynn:bleibt"]}},
        "fynn:folgen": {"remove": {"component_groups": ["fynn:bleibt"]}, "add": {"component_groups": ["fynn:folgt"]}},
        # Drachen aus aelteren Welten (4.89 und davor) bekommen einmal ihre
        # Zustaende - das Skript loest das aus.
        "fynn:einrichten": {"sequence": [
            {"filters": {"test": "is_tamed", "subject": "self", "value": False},
             "remove": {"component_groups": ["fynn:boden"]},
             "add": {"component_groups": ["fynn:luft", "fynn:wildjagd"]},
             "set_property": {"fynn:fliegt": True}}]},
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
        # Gezaehmte verschwinden nie.
        "minecraft:despawn": {"despawn_from_distance": {},
                              "filters": {"test": "is_tamed", "subject": "self", "operator": "!=", "value": True}},
    }


def eigenschaften_drache():
    e = {}
    for n in ("fynn:feuer", "fynn:fliegt", "fynn:schlaeft", "fynn:besiegt"):
        e.update(eigenschaft(n))
    return e


def schlangen_bewegungen(glieder=14, hals=2):
    """Der Himmelsdrache (4.92) hat keine Schwingen: Er schwimmt durch die
    Luft. Zwei Wellen laufen gleichzeitig von vorn nach hinten durch den
    Leib - eine seitliche (das Schlaengeln) und eine flachere auf und ab.
    Jedes Glied kommt einen Takt spaeter, und nach hinten schwingt es weiter
    aus. Die Beine paddeln, die Barthaare wehen."""
    def seiten(knochen, werte):
        for seite, z in (("links", 1), ("rechts", -1)):
            for name, (x, y, zz) in werte.items():
                knochen[f"{name}_{seite}"] = {"rotation": [x, y if isinstance(y, (int, float)) else f"{z} * ({y})",
                                                           zz if isinstance(zz, (int, float)) else f"{z} * ({zz})"]}

    flug = {}
    flug["rumpf"] = {"rotation": ["-query.target_x_rotation * 0.3", f"math.sin({LT} * 120.0 + 35.0) * 6.0",
                                  "variable.fynn_dreh * 1.5"],
                     "position": [0.0, f"math.sin({LT} * 95.0) * 1.2", 0.0]}
    for i in range(1, glieder + 1):
        flug[f"schwanz{i}"] = {"rotation": [f"math.sin({LT} * 95.0 - {i * 28}) * 3.5",
                                            f"math.sin({LT} * 120.0 - {i * 35}) * {7 + i * 0.45:.2f}"
                                            f" - variable.fynn_dreh * 0.8", 0.0]}
    for i in range(1, hals + 1):
        flug[f"hals{i}"] = {"rotation": [f"math.sin({LT} * 95.0 + {40 + i * 20}) * 3.0",
                                         f"-math.sin({LT} * 120.0 + {35 + i * 30}) * 5.0", 0.0]}
    flug["kopf"] = {"rotation": [f"math.sin({LT} * 95.0 + 120.0) * 3.0", f"-math.sin({LT} * 120.0 + 120.0) * 6.0", 0.0]}
    seiten(flug, {"bart": [f"math.sin({LT} * 160.0) * 10.0", f"math.sin({LT} * 130.0) * 12.0", 0.0]})
    for teil, versatz in (("vorn", 0.0), ("hinten", 90.0)):
        for seite, ph in (("links", 0.0), ("rechts", 180.0)):
            p_ = f"{LT} * 120.0 + {versatz + ph}"
            flug[f"bein_{teil}_{seite}"] = {"rotation": [f"45.0 + math.sin({p_}) * 25.0", 0.0, 0.0]}
            flug[f"unterbein_{teil}_{seite}"] = {"rotation": [f"-30.0 + math.cos({p_}) * 20.0", 0.0, 0.0]}
            flug[f"fuss_{teil}_{seite}"] = {"rotation": [40.0, 0.0, 0.0]}

    # Am Boden: Er kriecht in Wellen, im Tempo seines Weges.
    w = "query.modified_distance_moved * 22.0"
    gang = {"rumpf": {"rotation": [0.0, f"math.sin({w}) * 5.0", 0.0]}}
    for i in range(1, glieder + 1):
        gang[f"schwanz{i}"] = {"rotation": [0.0, f"math.sin({w} - {i * 35}) * {5 + i * 0.4:.2f}", 0.0]}
    for teil, versatz in (("vorn", 0.0), ("hinten", 180.0)):
        for seite, ph in (("links", 0.0), ("rechts", 180.0)):
            gang[f"bein_{teil}_{seite}"] = {"rotation": [f"math.sin({w} + {versatz + ph}) * 30.0", 0.0, 0.0]}
    stand = {"rumpf": {"scale": [1.0, f"1.0 + math.sin({LT} * 50.0) * 0.015", 1.0]}}
    for i in range(1, glieder + 1):
        stand[f"schwanz{i}"] = {"rotation": [0.0, f"math.sin({LT} * 30.0 - {i * 30}) * 3.0", 0.0]}
    stand["kopf"] = {"rotation": [f"10.0 + math.sin({LT} * 40.0) * 3.0", f"math.sin({LT} * 21.0) * 14.0", 0.0]}
    seiten(stand, {"bart": [f"math.sin({LT} * 60.0) * 6.0", f"math.sin({LT} * 45.0) * 6.0", 0.0]})

    # Liegen (Schlaf, besiegt): zusammengerollt wie eine Schlange, der Kopf
    # obenauf.
    liegen = {"rumpf": {"position": [0.0, -8.0, 0.0],
                        "scale": [f"1.0 + math.sin({LT} * 40.0) * 0.02", f"1.0 + math.sin({LT} * 40.0) * 0.03", 1.0]}}
    # Eine Spirale: nach hinten immer enger, so liegt der Schwanz innen.
    for i in range(1, glieder + 1):
        liegen[f"schwanz{i}"] = {"rotation": [0.0, 18.0 + i * 2.5, 0.0]}
    for i in range(1, hals + 1):
        liegen[f"hals{i}"] = {"rotation": [8.0, -30.0, 0.0]}
    liegen["kopf"] = {"rotation": [-5.0, -30.0, 0.0]}
    for teil in ("vorn", "hinten"):
        for seite in ("links", "rechts"):
            liegen[f"bein_{teil}_{seite}"] = {"rotation": [-70.0, 0.0, 0.0]}
            liegen[f"unterbein_{teil}_{seite}"] = {"rotation": [100.0, 0.0, 0.0]}
    benommen = {"kopf": {"rotation": [f"math.max(0.0, math.sin({LT} * 50.0)) * 6.0", 0.0, 0.0]},
                "kiefer": {"rotation": [10.0, 0.0, 0.0]}}
    # Der Sturmhauch: Hals gerade, das Maul weit auf, die Maehne gestraeubt.
    feuer = {f"hals{i}": {"rotation": [-2.0, 0.0, 0.0]} for i in range(1, hals + 1)}
    feuer["kopf"] = {"rotation": [f"6.0 + math.sin({LT} * 900.0) * 1.5", 0.0, 0.0]}
    feuer["kiefer"] = {"rotation": [f"40.0 + math.sin({LT} * 700.0) * 2.0", 0.0, 0.0]}
    zeit = f"math.mod({LT}, 19.0)"
    auf = f"math.clamp(math.sin({zeit} / 2.2 * 180.0) * 2.0, 0.0, 1.0)"
    bruellen = {"kopf": {"rotation": [f"-{auf} * 35.0", 0.0, 0.0]}, "kiefer": {"rotation": [f"{auf} * 35.0", 0.0, 0.0]},
                "hals1": {"rotation": [f"-{auf} * 15.0", 0.0, 0.0]}}
    ruht = f"(1.0 - {LIEGT})"
    return {
        "flug": ({"loop": True, "bones": flug}, f"{FLIEGT} * {ruht}"),
        "stand": ({"loop": True, "bones": stand}, f"(1.0 - {FLIEGT}) * {ruht}"),
        "gehen": ({"loop": True, "bones": gang}, f"(1.0 - {FLIEGT}) * {LAEUFT} * {ruht}"),
        "liegen": ({"loop": True, "bones": liegen}, LIEGT),
        "benommen": ({"loop": True, "bones": benommen}, "query.property('fynn:besiegt')"),
        "feueratem": ({"loop": True, "bones": feuer}, FEUER),
        "drachenbruellen": ({"loop": True, "bones": bruellen},
                            f"(1.0 - {FLIEGT}) * (1.0 - {LAEUFT}) * (1.0 - {FEUER}) * {ruht} * ({zeit} < 2.2)"),
    }


def drache(eintrag, schwinge, bewegungen=None, **bewegung):
    """Setzt zusammen, was alle Drachen gemeinsam haben. bewegungen: eigene
    (der Himmelsdrache ohne Schwingen); sonst die der Drachen mit Schwingen."""
    gruppen, ereignisse = drachen_zustaende(eintrag.pop("tempo_luft"), eintrag.pop("tempo_boden"),
                                            eintrag.pop("jagt_tiere"), eintrag.pop("sitz"),
                                            schwimmt=eintrag.pop("schwimmt", False))
    k = drachen_grundlage()
    k.update(eintrag.pop("komponenten", {}))
    eintrag.update({
        "art": "drache", "verhalten": "drache", "keine_panik": True, "baby": False,
        "komponenten": k, "gruppen": gruppen, "ereignisse": ereignisse,
        "start_gruppen": ["fynn:luft", "fynn:wildjagd"], "start_setzen": {"fynn:fliegt": True},
        "eigenschaften": eigenschaften_drache(),
        "eigene_bewegungen": bewegungen or drachen_bewegungen(schwinge, **bewegung),
        # Augenlider nur im Schlaf und besiegt, der Sattel nur gesattelt.
        "sichtbarkeit": [{"lider": "query.property('fynn:schlaeft') || query.property('fynn:besiegt')"},
                         {"sattel": "query.is_saddled"}],
        "gruppe": "Drachen",
    })
    eintrag["steckbrief_extra"] = eintrag.get("steckbrief_extra", []) + [
        ["Besiegen", "bei einem Viertel Leben bricht er zusammen – drei Schläge: Gnadenstoß und Beute; "
                     "ein Goldapfel: er steht auf und gehört dir"],
        ["Zahm", "folgt dir und kämpft mit dir; schleichend antippen: bleib hier / komm mit"],
        ["Reiten", "mit Sattel: Sprungtaste zum Steigen, er fliegt, wohin du schaust; "
                   "schlägst du beim Reiten zu, speit er dorthin"],
        ["Schlafen", "nachts eingerollt am Boden – wer schleicht, weckt ihn nicht"]]
    return eintrag


# ------------------------------------------------------------ Lindwurm

def _lindwurm():
    import drachen_gestalt as dg
    return drache({
        "id": "lindwurm", "name": ("Lindwurm", "Fire Dragon"), "gestalt": "lindwurm",
        "varianten": [("gruen", 50), ("rot", 35), ("schwarz", 15)],
        "leben": 160, "schaden": 12, "tempo": 1.4, "tempo_luft": 1.4, "tempo_boden": 0.2,
        "kollision": (3.5, 2.6), "herde": (1, 1),
        "jagt_tiere": ["cow", "sheep", "horse", "bison", "elch"],
        "sitz": [0.0, 2.1, -0.2],
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
        "komponenten": {"minecraft:fire_immune": {}, "minecraft:attack": {"damage": 12}},
        "steckbrief_extra": [
            ["Lebt", "selten, hoch in den Bergen – kreist über den Gipfeln, landet ab und zu"],
            ["Feueratem", "ein Flammenstrahl, der alles in Brand setzt, was darin steht"],
            ["Feuerkugel", "auf weite Entfernung: eine Kugel, die beim Aufprall explodiert"],
            ["Drachenschuppen", "daraus die Drachenschuppen-Rüstung (stark wie Diamant)"]],
    }, dg.LINDWURM_SCHWINGE, hals=5, schwanz=8, beinhoehe=21)


# ------------------------------------------------------------ Frostwyvern

def _frostwyvern():
    import drachen_gestalt as dg
    return drache({
        "id": "frostwyvern", "name": ("Frostwyvern", "Frost Wyvern"), "gestalt": "frostwyvern",
        "varianten": [("eis", 60), ("gletscher", 30), ("nacht", 10)],
        "leben": 120, "schaden": 9, "tempo": 1.5, "tempo_luft": 1.55, "tempo_boden": 0.22,
        "kollision": (2.6, 2.0), "herde": (1, 1),
        "jagt_tiere": ["sheep", "rabbit", "fox", "polar_bear", "eiswolf"],
        "sitz": [0.0, 1.6, -0.2],
        "biome": [["frozen"]], "gewicht": 2,
        "spawn_bedingungen": [{"minecraft:spawns_on_surface": {}, "minecraft:weight": {"default": 2},
                               "minecraft:herd": {"min_size": 1, "max_size": 1},
                               "minecraft:density_limit": {"surface": 1},
                               "minecraft:height_filter": {"min": 70, "max": 320},
                               "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==",
                                                           "value": tag}]}
                              for tag in ("frozen_peaks", "jagged_peaks", "ice_plains", "snowy_slopes", "grove")],
        "population": "monster",
        "material": "entity_emissive_alpha",
        "beute": [("fynn:drachenschuppe", 2, 5, 1.0, False), ("minecraft:blue_ice", 1, 3, 1.0, False),
                  ("minecraft:bone", 1, 2, 1.0, False)],
        "laute": {"ambient": "mob.enderdragon.growl", "hurt": "mob.enderdragon.hit", "death": "mob.ravager.death",
                  "pitch": [1.5, 1.7]},
        "ei": ("#b8d4e6", "#4a7aa8"),
        "komponenten": {"minecraft:freezing_immune": {}, "minecraft:attack": {"damage": 9}},
        "atemart": "frost",
        "steckbrief_extra": [
            ["Lebt", "in Eisbergen, auf Gletschern und Schneehängen – häufiger als der Lindwurm, aber kleiner"],
            ["Gestalt", "ein Wyvern: nur zwei Beine, die Schwingen sind seine Vorderbeine"],
            ["Frosthauch", "verlangsamt stark, lässt Wasser zu Eis gefrieren und Schnee fallen"],
            ["Eiskristalle", "auf weite Entfernung: drei Eissplitter im Fächer, die treffen und verlangsamen"]],
    }, dg.FROSTWYVERN_SCHWINGE, hals=4, schwanz=8, beinhoehe=18, stuetzt=True)


# ------------------------------------------------------------ Himmelsdrache

def _himmelsdrache():
    import drachen_gestalt as dg
    return drache({
        "id": "himmelsdrache", "name": ("Himmelsdrache", "Sky Serpent"), "gestalt": "himmelsdrache",
        "varianten": [("jade", 50), ("perle", 35), ("gold", 15)],
        "leben": 130, "schaden": 8, "tempo": 1.3, "tempo_luft": 1.3, "tempo_boden": 0.2,
        "kollision": (2.0, 1.6), "herde": (1, 1),
        "jagt_tiere": ["sheep", "goat", "llama", "rabbit"],
        "sitz": [0.0, 1.2, -0.1],
        "biome": [["meadow"], ["savanna"]], "gewicht": 1,
        "spawn_bedingungen": [{"minecraft:spawns_on_surface": {}, "minecraft:weight": {"default": 1},
                               "minecraft:herd": {"min_size": 1, "max_size": 1},
                               "minecraft:density_limit": {"surface": 1},
                               "minecraft:height_filter": {"min": 80, "max": 320},
                               "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==",
                                                           "value": tag}]}
                              for tag in ("meadow", "cherry_grove", "savanna", "extreme_hills", "stony_peaks")],
        "population": "monster",
        "material": "entity_emissive_alpha",
        "beute": [("fynn:drachenschuppe", 2, 4, 1.0, False), ("minecraft:feather", 2, 5, 1.0, False),
                  ("minecraft:gold_nugget", 3, 8, 1.0, False)],
        "laute": {"ambient": "mob.enderdragon.growl", "hurt": "mob.enderdragon.hit", "death": "mob.ravager.death",
                  "pitch": [1.8, 2.0]},
        "ei": ("#3c8a64", "#e8b030"),
        # Seine eigenen Blitze tun ihm nichts.
        "komponenten": {"minecraft:attack": {"damage": 8},
                        "minecraft:damage_sensor": {"triggers": [{"cause": "fall", "deals_damage": False},
                                                                 {"cause": "lightning", "deals_damage": False}]}},
        "atemart": "blitz",
        "steckbrief_extra": [
            ["Lebt", "sehr selten über Bergwiesen, Kirschhainen und Savannen – schwebt schlängelnd ohne Flügel"],
            ["Sturmhauch", "ein Windstoß mit Funken, der alles weit wegschleudert"],
            ["Blitzschlag", "auf weite Entfernung: drei Blitze, einer nach dem anderen, rund um sein Ziel"]],
    }, None, bewegungen=schlangen_bewegungen(dg.HIMMELSDRACHE_GLIEDER, 2))


DRACHEN = [_lindwurm(), _frostwyvern(), _himmelsdrache()]
