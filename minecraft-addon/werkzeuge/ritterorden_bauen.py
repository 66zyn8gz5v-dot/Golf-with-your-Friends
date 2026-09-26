#!/usr/bin/env python3
"""Der Ritterorden: Ritter mit Schwert oder Armbrust, der Ritterhauptmann
mit Helmbusch und das Saphirschwert.

Fynn: "Der Ritter ... braucht das ganz normale Standard-Eisenschwert als
Waffe. Oder eine Armbrust. Und am besten gibst du dem fuer den Armbrust
nochmal ein neues Design. Dann gibt es den staerkeren Ritter ... so einen
blauen Federhut ... auf dem Helm. Und der hat auch ein Eisenschwert. Aber
das ist so ein bisschen verziert mit Blau ... bei der Parierstange ... so
ein Saphir. Der macht mehr Schaden." Beute: Eisen, Brot, Aepfel und
anderes; das Saphirschwert selten und nur mit drei Vierteln Haltbarkeit,
das Eisenschwert auch.

Was hier entsteht:
* Ritter (fynn:ritter): sieben von zehn mit Eisenschwert, drei mit
  Armbrust. Die Armbrust ist kein Gegenstand, sondern ein eigenes Modell,
  das mit dem rechten Arm mitgeht - so darf sie aussehen, wie sie will,
  und muss nicht wie Mojangs Armbrust gespannt werden.
* Ritterhauptmann (fynn:ritterhauptmann): kraeftiger, blauer Helmbusch,
  Saphirschwert.
* Saphirschwert (fynn:saphirschwert): in 3D wie die anderen Klingen,
  staerker als Eisen, nur als Beute zu haben.

Der Koerper bleibt der des Ritters (ritter_bauen.py, Fynns Haut). Armbrust
und Helmbusch sind eigene kleine Modelle mit eigener Textur, die ueber
einen zweiten Steuerplan dazukommen - ihre Knochen heissen wie die des
Ritters, deshalb bewegen sie sich mit.

    python3 werkzeuge/ritterorden_bauen.py [--bilder vorschau]
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tiermodell as tm                                   # noqa: E402
from tiermodell import Modell, hexfarbe, mische, streu    # noqa: E402
import banditen_bauen as bb                               # noqa: E402
from tiere_gestalt import ton                             # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"


def schreibe(pfad, daten):
    pfad = Path(pfad)
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# ============================================================ Saphirschwert

# Ein Eisenschwert mit blauer Blutrinne, Saphiren an den Enden der
# Parierstange und einem grossen in ihrer Mitte, dazu blau umwickelter
# Griff und ein Saphir im Knauf. Schmal wie ein echtes Eisenschwert -
# neun Spalten nur wegen der Parierstange.
SAPHIRSCHWERT = {
    "karte": [
        "....w....",
        "...wsd...",
        "...wsd...",
    ] + ["...wbd..."] * 15 + [
        "...wsd...",
        "..EqqqE..",
        "EeqqeqqeE",
        ".EQQEQQE.",
        "....L....",
        "....l....",
        "....L....",
        "....l....",
        "....L....",
        "...QeQ...",
        "....Q....",
    ],
    "farben": {
        "w": (232, 236, 242), "s": (184, 192, 204), "d": (118, 126, 142),
        "b": (76, 120, 226),                      # blaue Blutrinne
        "q": (196, 202, 212), "Q": (110, 116, 130),
        "e": (150, 190, 250), "E": (44, 78, 196),  # Saphir hell / dunkel
        "L": (40, 54, 124), "l": (24, 32, 86),     # blaues Leder am Griff
    },
    "tiefe": {"w": 1.0, "s": 1.0, "d": 1.0, "b": 1.0, "q": 2.0, "Q": 2.0,
              "e": 3.0, "E": 2.5, "L": 2.0, "l": 2.0},
    "mitte": 4.5,
    "griff": "Ll",
}

def saphirschwert_bild():
    """Inventarbild, 16 mal 16: die Klinge schraeg nach oben rechts, wie
    Minecrafts Schwerter - auf der Diagonale x + y = 15. Die Parierstange
    steht quer dazu, der grosse Saphir genau im Kreuz. Der Umriss (k)
    kommt von selbst um alles herum."""
    punkte = {(14, 1): "w"}
    for i in range(8):                      # Klinge: helle Kante, blaue Rinne, dunkle Kante
        x, y = 13 - i, 2 + i
        punkte[(x, y)] = "b"
        punkte.setdefault((x, y - 1), "w")
        punkte.setdefault((x + 1, y), "d")
    for (x, y), z in (((3, 8), "E"), ((4, 9), "q"), ((5, 10), "e"), ((6, 11), "q"), ((7, 12), "E")):
        punkte[(x, y)] = z                  # Parierstange mit Saphiren
    for (x, y), z in (((4, 11), "L"), ((3, 12), "l"), ((2, 13), "L"), ((1, 14), "e")):
        punkte[(x, y)] = z                  # Griff und Knauf
    karte = [["."] * 16 for _ in range(16)]
    for (x, y), z in punkte.items():
        karte[y][x] = z
    for (x, y) in list(punkte):
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if 0 <= nx < 16 and 0 <= ny < 16 and karte[ny][nx] == ".":
                karte[ny][nx] = "k"
    return ["".join(z) for z in karte]


def bild(karte, farben):
    b = Image.new("RGBA", (len(karte[0]), len(karte)), (0, 0, 0, 0))
    for y, zeile in enumerate(karte):
        for x, z in enumerate(zeile):
            if z != ".":
                b.putpixel((x, y), tuple(farben[z]) + (255,))
    return b


def saphirschwert():
    import waffe_bauen as w
    from neue_waffen_bauen import halten, waffen_attachable, gegenstand
    v = SAPHIRSCHWERT
    w.aus_zeichenkarte("saphirschwert", v["karte"], {k: f + (255,) for k, f in v["farben"].items()},
                       dicke=lambda zeile, spalte, zeichen: v["tiefe"][zeichen], mitte=v["mitte"],
                       ziel_modell=str(RES / "models" / "entity" / "saphirschwert.geo.json"),
                       ziel_textur=str(RES / "textures" / "entity" / "saphirschwert_haut.png"))
    schreibe(RES / "attachables" / "saphirschwert.json", waffen_attachable("saphirschwert"))
    icon = bild(saphirschwert_bild(), dict(v["farben"], k=(30, 32, 44)))
    icon.save(RES / "textures" / "items" / "saphirschwert.png")
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    liste["texture_data"]["saphirschwert"] = {"textures": "textures/items/saphirschwert"}
    schreibe(liste_pfad, liste)
    # Eisen macht 6 Schaden, Diamant 7. Das Saphirschwert liegt dazwischen
    # und darueber: 7, und haelt laenger als Eisen. Kein Rezept - es gibt
    # es nur vom Ritterhauptmann.
    schreibe(VER / "items" / "saphirschwert.json", gegenstand("saphirschwert", {
        "minecraft:hand_equipped": True, "minecraft:damage": 7,
        "minecraft:rarity": "rare",
        "minecraft:durability": {"max_durability": 420},
        "minecraft:enchantable": {"value": 14, "slot": "sword"},
        "minecraft:repairable": {"repair_items": [{"items": ["minecraft:iron_ingot"], "repair_amount": 105}]},
    }))
    return {"animation.saphirschwert.halten": halten(v["karte"], v["griff"])}, icon


# ============================================================ Armbrust

HOLZ = "#5a3a22"
HOLZ_H = "#7a5232"
STAHL = "#a8b0bc"
STAHL_D = "#6a7280"
BLAU = "#2e4a9a"
GOLD = "#d8b050"


def armbrust_modell():
    """Die Ritterarmbrust, gebaut fuer den herabhaengenden Arm.

    Die Hand sitzt unten am rechten Arm (y 12). Beim Zielen dreht der Arm
    um -90 Grad nach vorn; was jetzt nach unten zeigt, zeigt dann nach
    vorn, und was nach vorn (-z) zeigt, zeigt nach oben. Deshalb laeuft
    der Schaft hier nach unten, und der Bolzen liegt vorn auf.

    Der Unterschied zu Mojangs Armbrust: ein Stahlbogen in drei Stufen,
    blau lackiert mit goldenen Spitzen, ein Steigbuegel vorn zum Spannen,
    Messingbeschlaege am Schaft - eine Waffe aus der Ruestkammer eines
    Ordens, nicht vom Pluenderer."""
    m = Modell("ritter_armbrust", sichtbreite=2, sichthoehe=3)
    m.knoch("body", [0, 12, 0])
    m.knoch("rightArm", [-5, 22, 0], "body")
    a = m.knoch("armbrust", [-6, 12, 0], "rightArm")
    a.kasten([-7, 3, -1], [2, 13, 2], "schaft")                # Schaft, durch die Faust
    a.kasten([-7.5, 14, -1.5], [3, 3, 3], "kolben")             # Kolben hinten
    a.kasten([-7, 9, 1], [2, 2, 1], "beschlag")                # Abzugsbuegel unten
    a.kasten([-6.5, 11, 1], [1, 2, 1], "abzug")
    a.kasten([-7, 5, -1.5], [2, 1, 3], "beschlag")             # Messingring vorn
    # Der Bogen: Mitte, dann je Seite zwei Stufen nach hinten gebogen.
    a.kasten([-9, 2, -1], [6, 1, 2], "bogen")
    a.kasten([-12, 3, -1], [3, 1, 2], "bogen")
    a.kasten([-3, 3, -1], [3, 1, 2], "bogen")
    a.kasten([-14, 4, -1], [2, 1, 2], "bogen")
    a.kasten([-1, 4, -1], [2, 1, 2], "bogen")
    a.kasten([-15, 4, -1], [1, 2, 2], "spitze")
    a.kasten([1, 4, -1], [1, 2, 2], "spitze")
    # Die Sehne, gespannt bis an die Nuss hinter dem Bolzen.
    a.kasten([-14, 7, -0.5], [15, 1, 1], "sehne", aufblasen=-0.3)
    # Der Bolzen liegt oben auf (-z) - Stahlspitze vorn, blaue Federn hinten.
    a.kasten([-6.5, 1, -2], [1, 7, 1], "bolzen")
    a.kasten([-6.5, 0, -2], [1, 1, 1], "bolzenspitze")
    a.kasten([-6.5, 6, -2.5], [1, 2, 1], "feder", aufblasen=-0.1)
    # Steigbuegel ganz vorn: hier setzt man den Fuss beim Spannen hinein.
    a.kasten([-8, 0, -1], [4, 1, 2], "buegel")
    a.kasten([-8, 0, -1], [1, 2, 2], "buegel")
    a.kasten([-5, 0, -1], [1, 2, 2], "buegel")
    return m


def armbrust_maler(stoff, p, n, texel):
    hell = 0.1 if n[1] > 0.5 or n[2] < -0.5 else (-0.1 if n[1] < -0.5 else 0.0)
    rausch = (streu(p[0] // 2, p[1] // 2, p[2] // 2, 901) - 0.5) * 0.08
    if stoff in ("schaft", "kolben"):
        # Holzmaserung laeuft den Schaft entlang: in Zweierstufen.
        return ton(HOLZ if int(p[1]) % 4 < 2 else HOLZ_H, p, n, texel, 902, hell=hell + rausch)
    if stoff in ("beschlag", "buegel"):
        return ton("#b8903c", p, n, texel, 903, hell=hell)
    if stoff == "abzug":
        return hexfarbe(STAHL_D)
    if stoff == "bogen":
        return ton(BLAU, p, n, texel, 904, hell=hell + rausch)
    if stoff == "spitze":
        return hexfarbe(GOLD)
    if stoff == "sehne":
        return hexfarbe("#e8e0cc")
    if stoff == "bolzen":
        return hexfarbe("#8a6a44")
    if stoff == "bolzenspitze":
        return hexfarbe(STAHL)
    if stoff == "feder":
        return hexfarbe("#5a7ad8")
    return hexfarbe("#ff00ff")


# ============================================================ Helmbusch

def helmbusch_modell():
    """Ein Federbusch aus blauen Straussenfedern, wie ihn Ritter auf dem
    Turnierhelm trugen: in einer goldenen Tuelle auf dem Scheitel, erst
    nach oben, dann in Stufen nach hinten fallend bis ueber den Nacken.
    Stufen statt schraeger Kaesten - in Minecraft sieht eine Treppe
    ruhiger aus als ein gedrehter Klotz."""
    m = Modell("ritter_helmbusch", sichtbreite=2, sichthoehe=3)
    m.knoch("body", [0, 12, 0])
    m.knoch("head", [0, 24, 0], "body")
    b = m.knoch("busch", [0, 32, 0], "head")
    b.kasten([-1, 32, -2], [2, 2, 2], "tuelle")
    b.kasten([-1.5, 34, -3], [3, 3, 4], "feder")
    b.kasten([-1.5, 35, 1], [3, 3, 3], "feder")
    b.kasten([-1.5, 33, 4], [3, 4, 2], "feder")
    b.kasten([-1, 30, 5.5], [2, 4, 2], "feder")
    b.kasten([-0.5, 28, 6], [1, 2, 1], "feder")
    return m


def helmbusch_maler(stoff, p, n, texel):
    if stoff == "tuelle":
        return ton(GOLD, p, n, texel, 911, hell=0.08 if n[1] > 0.5 else -0.05)
    # Die Federn: oben hell, nach unten dunkler; die Kiele in hellem Blau.
    t = max(0.0, min(1.0, (p[1] - 28) / 10))
    grund = mische(hexfarbe("#1e3280"), hexfarbe("#5a86e8"), t)
    fahne = (streu(p[0] // 1, p[1] // 2, p[2] // 2, 912) - 0.5) * 0.12
    if abs(p[0]) < 0.6 and n[1] > 0.5:
        return mische(grund, (220, 232, 255), 0.35)
    return ton("#%02x%02x%02x" % grund, p, n, texel, 913, hell=fahne)


# ============================================================ Haut des Hauptmanns

def hauptmann_haut():
    """Die Ritterhaut, nur edler: das Blau des Wappenrocks kraeftiger und
    tiefer, der braune Guertel in Gold. So erkennt man den Hauptmann auch
    von hinten, wenn der Helmbusch verdeckt ist."""
    alt = Image.open(RES / "textures" / "entity" / "ritter.png").convert("RGBA")
    neu = alt.copy()
    for y in range(alt.height):
        for x in range(alt.width):
            r, g, b, a = alt.getpixel((x, y))
            if a == 0:
                continue
            if b > r + 40 and b > g + 30:              # Blau: kraeftiger
                neu.putpixel((x, y), (max(0, r - 18), max(0, g - 8), min(255, b + 30), a))
            elif r > b + 20 and r > 60 and g < r:     # Leder und Rot: Gold
                hell = (r + g + b) / 3 / 110
                neu.putpixel((x, y), tuple(min(255, int(c * hell)) for c in (216, 176, 80)) + (a,))
    return neu


# ============================================================ Bewegung

ARMBRUST_TRAGEN = {"loop": True, "bones": {
    # Ohne Ziel: vor dem Bauch, schraeg nach unten, die linke Hand stuetzt.
    "rightArm": {"rotation": [-45.0, -12.0, 0.0]},
    "leftArm": {"rotation": [-40.0, 38.0, 0.0]},
}}
ARMBRUST_ZIELEN = {"loop": True, "bones": {
    # Mit Ziel: Kolben an der Schulter, der Blick folgt dem Ziel. "this"
    # zieht die Tragehaltung wieder ab, damit sie nicht doppelt zaehlt.
    "rightArm": {"rotation": ["-90.0 + query.target_x_rotation - this", "-6.0 + query.target_y_rotation - this", "-this"]},
    "leftArm": {"rotation": ["-82.0 + query.target_x_rotation - this", "40.0 + query.target_y_rotation - this", "-this"]},
    "body": {"rotation": [0.0, -8.0, 0.0]},
}}


def animationen(name):
    eigene = {f"animation.fynn.{name}.{k}": bb.BEWEGUNG[k] for k in ("laufen", "stehen", "halten", "hieb")}
    if name == "ritter":
        eigene["animation.fynn.ritter.armbrust"] = ARMBRUST_TRAGEN
        eigene["animation.fynn.ritter.zielen"] = ARMBRUST_ZIELEN
    return eigene


def aussehen(name, ei, extra):
    anim = {k.split(".")[-1]: k for k in animationen(name)}
    anim["blick"] = "animation.common.look_at_target"
    schwert = "query.variant == 0" if name == "ritter" else "1.0"
    liste = [{"laufen": "math.clamp(query.modified_move_speed * 1.4, 0.0, 1.0)"}, "stehen", "blick",
             {"halten": schwert}, {"hieb": f"variable.attack_time > 0.0 && {schwert}"}]
    if name == "ritter":
        liste += [{"armbrust": "query.variant == 1"}, {"zielen": "query.variant == 1 && query.has_target"}]
    geometrie = {"default": "geometry.ritter"}
    texturen = {"default": f"textures/entity/{'ritter' if name == 'ritter' else 'ritterhauptmann'}"}
    steuer = ["controller.render.default"]
    for teil, bedingung in extra:
        geometrie[teil] = f"geometry.fynn.ritter_{teil}"
        texturen[teil] = f"textures/entity/ritter_{teil}"
        steuer.append({f"controller.render.fynn.ritter_{teil}": bedingung})
    skripte = {
        "animate": liste,
        # Die Waffen in der Hand lesen diese Werte vom Traeger, wie bei den
        # Banditen.
        "variables": {f"variable.{v}": "public" for v in
                      ("attack_time", "fynn_schwert", "fynn_waffe", "fynn_schlag", "fynn_hiebzeit")},
        "initialize": [f"variable.{v} = 0.0;" for v in ("fynn_schwert", "fynn_waffe", "fynn_schlag", "fynn_hiebzeit")],
    }
    if name == "ritterhauptmann":
        skripte["scale"] = "1.06"
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": f"fynn:{name}",
        "materials": {"default": "entity_alphatest"},
        "textures": texturen,
        "geometry": geometrie,
        # Ohne das zeichnet das Spiel keine 3D-Waffen (Anbauteile) in der
        # Hand eines Mobs - das Saphirschwert bliebe unsichtbar.
        "enable_attachables": True,
        "animations": anim,
        "scripts": skripte,
        "render_controllers": steuer,
        "spawn_egg": ei,
    }}}


def steuerplan(teil):
    return {"format_version": "1.8.0", "render_controllers": {f"controller.render.fynn.ritter_{teil}": {
        "geometry": f"Geometry.{teil}", "materials": [{"*": "Material.default"}],
        "textures": [f"Texture.{teil}"]}}}


# ============================================================ Verhalten

SPIELER = {"test": "is_family", "subject": "other", "value": "player"}


def feinde():
    """Ritter schuetzen das Land: Sie gehen auf Banditen und auf Monster
    los - nur nicht auf Creeper, die zu schlagen ist dumm."""
    return {"priority": 2, "must_see": True, "reselect_targets": True, "within_radius": 20, "entity_types": [
        {"filters": {"test": "is_family", "subject": "other", "value": "bandit"}, "max_dist": 20},
        {"filters": {"all_of": [{"test": "is_family", "subject": "other", "value": "monster"},
                                {"test": "is_family", "subject": "other", "operator": "!=", "value": "creeper"},
                                {"test": "is_family", "subject": "other", "operator": "!=", "value": "bandit"}]},
         "max_dist": 14}]}


def grundteile(leben, tempo, familie):
    return {
        "minecraft:type_family": {"family": familie},
        "minecraft:collision_box": {"width": 0.7, "height": 1.95},
        "minecraft:health": {"value": leben, "max": leben},
        "minecraft:movement": {"value": tempo},
        "minecraft:movement.basic": {},
        "minecraft:navigation.walk": {"can_path_over_water": False, "avoid_water": True, "can_open_doors": True},
        "minecraft:jump.static": {},
        "minecraft:can_climb": {},
        "minecraft:physics": {},
        "minecraft:pushable": {"is_pushable": True, "is_pushable_by_piston": True},
        "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
        "minecraft:nameable": {},
        "minecraft:despawn": {"despawn_from_distance": {}},
        "minecraft:conditional_bandwidth_optimization": {},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.hurt_by_target": {"priority": 1},
        "minecraft:behavior.nearest_attackable_target": feinde(),
        "minecraft:behavior.look_at_player": {"priority": 6, "look_distance": 8.0, "probability": 0.02},
        "minecraft:behavior.random_stroll": {"priority": 7, "speed_multiplier": 0.8},
        "minecraft:behavior.random_look_around": {"priority": 8},
    }


def ritter_verhalten():
    c = grundteile(30, 0.24, ["ritter", "mob"])
    gruppen = {
        "fynn:schwertritter": {
            "minecraft:variant": {"value": 0},
            "minecraft:attack": {"damage": 4},
            # Die Waffe in der Hand; faellt selten mit herunter, dann
            # abgenutzt - ein Ritter kaempft nicht mit einem neuen Schwert.
            "minecraft:equipment": {"table": "loot_tables/ausruestung/ritter_schwert.json",
                                    "slot_drop_chance": [{"slot": "slot.weapon.mainhand", "drop_chance": 0.08}]},
            "minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.2, "track_target": True},
            "minecraft:loot": {"table": "loot_tables/entities/ritter.json"},
        },
        "fynn:armbrustritter": {
            "minecraft:variant": {"value": 1},
            "minecraft:shooter": {"def": "minecraft:arrow"},
            "minecraft:behavior.ranged_attack": {"priority": 3, "attack_interval_min": 1.6, "attack_interval_max": 2.6,
                                                 "attack_radius": 18.0, "speed_multiplier": 1.0},
            "minecraft:loot": {"table": "loot_tables/entities/ritter_armbrust.json"},
        },
    }
    ereignisse = {"minecraft:entity_spawned": {"randomize": [
        {"weight": 70, "add": {"component_groups": ["fynn:schwertritter"]}},
        {"weight": 30, "add": {"component_groups": ["fynn:armbrustritter"]}}]}}
    return {"format_version": "1.21.90", "minecraft:entity": {
        "description": {"identifier": "fynn:ritter", "is_spawnable": True, "is_summonable": True},
        "component_groups": gruppen, "components": c, "events": ereignisse}}


def hauptmann_verhalten():
    c = grundteile(50, 0.25, ["ritter", "ritterhauptmann", "mob"])
    c.update({
        "minecraft:attack": {"damage": 7},
        "minecraft:knockback_resistance": {"value": 0.4},
        "minecraft:equipment": {"table": "loot_tables/ausruestung/ritterhauptmann.json",
                                "slot_drop_chance": [{"slot": "slot.weapon.mainhand", "drop_chance": 0.05}]},
        "minecraft:behavior.melee_box_attack": {"priority": 3, "speed_multiplier": 1.25, "track_target": True},
        "minecraft:loot": {"table": "loot_tables/entities/ritterhauptmann.json"},
    })
    return {"format_version": "1.21.90", "minecraft:entity": {
        "description": {"identifier": "fynn:ritterhauptmann", "is_spawnable": True, "is_summonable": True},
        "components": c}}


def topf(name, lo, hi, chance=1.0, nur_spieler=False, schaden=None):
    funktionen = [{"function": "set_count", "count": {"min": lo, "max": hi}}]
    if schaden:
        # set_damage: der Anteil der Haltbarkeit, der noch uebrig ist.
        funktionen = [{"function": "set_damage", "damage": {"min": schaden[0], "max": schaden[1]}}]
    else:
        funktionen.append({"function": "looting_enchant", "count": {"min": 0, "max": 1}})
    t = {"rolls": 1, "entries": [{"type": "item", "name": name, "weight": 1, "functions": funktionen}]}
    bedingungen = []
    if nur_spieler:
        bedingungen.append({"condition": "killed_by_player"})
    if chance < 1.0:
        bedingungen.append({"condition": "random_chance_with_looting", "chance": chance,
                            "looting_multiplier": round(chance / 3, 3)})
    if bedingungen:
        t["conditions"] = bedingungen
    return t


def beute():
    brot_und_eisen = [
        topf("minecraft:iron_ingot", 0, 2),
        topf("minecraft:iron_nugget", 1, 4),
        topf("minecraft:bread", 0, 2),
        topf("minecraft:apple", 1, 1, chance=0.4),
    ]
    return {
        "entities/ritter.json": {"pools": brot_und_eisen + [
            topf("fynn:stahlbarren", 1, 1, chance=0.08, nur_spieler=True)]},
        "entities/ritter_armbrust.json": {"pools": brot_und_eisen + [
            topf("minecraft:arrow", 1, 5),
            topf("minecraft:crossbow", 1, 1, chance=0.05, nur_spieler=True, schaden=(0.3, 0.7))]},
        "entities/ritterhauptmann.json": {"pools": [
            topf("minecraft:iron_ingot", 1, 3),
            topf("minecraft:gold_nugget", 1, 4),
            topf("minecraft:bread", 1, 3),
            topf("minecraft:apple", 0, 2),
            topf("minecraft:cooked_beef", 0, 2, chance=0.5),
            topf("fynn:stahlbarren", 1, 2, chance=0.25, nur_spieler=True),
            topf("minecraft:emerald", 1, 1, chance=0.1, nur_spieler=True),
            topf("minecraft:golden_apple", 1, 1, chance=0.03, nur_spieler=True)]},
        # Was sie in der Hand tragen. Beim Hauptmann steht das
        # Saphirschwert auf drei Vierteln - so faellt es auch herunter.
        "ausruestung/ritter_schwert.json": {"pools": [{"rolls": 1, "entries": [
            {"type": "item", "name": "minecraft:iron_sword", "weight": 1,
             "functions": [{"function": "set_damage", "damage": {"min": 0.4, "max": 0.9}}]}]}]},
        "ausruestung/ritterhauptmann.json": {"pools": [{"rolls": 1, "entries": [
            {"type": "item", "name": "fynn:saphirschwert", "weight": 1,
             "functions": [{"function": "set_damage", "damage": 0.75}]}]}]},
    }


# ============================================================ Sprache

NAMEN = [
    ("entity.fynn:ritterhauptmann.name", "Ritterhauptmann", "Knight Captain"),
    ("item.spawn_egg.entity.fynn:ritterhauptmann.name", "Ritterhauptmann", "Knight Captain"),
    ("item.fynn:saphirschwert", "Saphirschwert", "Sapphire Sword"),
    ("item.fynn:saphirschwert.name", "Saphirschwert", "Sapphire Sword"),
]


def sprache():
    for datei, i in (("de_DE.lang", 1), ("en_US.lang", 2)):
        pfad = RES / "texts" / datei
        zeilen = [z for z in pfad.read_text(encoding="utf-8").splitlines()
                  if z.split("=")[0] not in {n[0] for n in NAMEN} and z != "## Ritterorden"]
        while zeilen and not zeilen[-1].strip():
            zeilen.pop()
        zeilen += ["", "## Ritterorden"] + [f"{n[0]}={n[i]}" for n in NAMEN]
        pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


# ============================================================ Waffenlisten

def in_liste_eintragen():
    """Das Saphirschwert schwingt wie die anderen Klingen: Es steht in
    denselben Listen wie das Schwertfischschwert."""
    for pfad in (Path(__file__).resolve().parent / "kampf_animationen.py", VER / "scripts" / "kampf.js"):
        text = pfad.read_text(encoding="utf-8")
        if '"fynn:saphirschwert"' not in text:
            text = text.replace('"fynn:schwertfischschwert",', '"fynn:schwertfischschwert", "fynn:saphirschwert",', 1)
            pfad.write_text(text, encoding="utf-8")


# ============================================================ Bauen

def main():
    waffe_anims, icon = saphirschwert()
    for modell, maler, teil in ((armbrust_modell(), armbrust_maler, "armbrust"),
                                (helmbusch_modell(), helmbusch_maler, "helmbusch")):
        schreibe(RES / "models" / "entity" / f"ritter_{teil}.geo.json", modell.geometrie())
        modell.male(maler).save(RES / "textures" / "entity" / f"ritter_{teil}.png")
        schreibe(RES / "render_controllers" / f"ritter_{teil}.render_controllers.json", steuerplan(teil))
    hauptmann_haut().save(RES / "textures" / "entity" / "ritterhauptmann.png")

    alle = dict(waffe_anims)
    alle.update(animationen("ritter"))
    alle.update(animationen("ritterhauptmann"))
    schreibe(RES / "animations" / "ritterorden.animation.json", {"format_version": "1.10.0", "animations": alle})
    # Die alte Laufbewegung des Ritters wird nicht mehr gebraucht.
    alt = RES / "animations" / "ritter.animation.json"
    if alt.exists():
        alt.unlink()

    schreibe(RES / "entity" / "ritter.entity.json", aussehen(
        "ritter", {"texture": "ritter_ei", "texture_index": 0}, [("armbrust", "query.variant == 1")]))
    schreibe(RES / "entity" / "ritterhauptmann.entity.json", aussehen(
        "ritterhauptmann", {"base_color": "#2e4a9a", "overlay_color": "#d8b050"}, [("helmbusch", "1.0")]))
    schreibe(VER / "entities" / "ritter.json", ritter_verhalten())
    schreibe(VER / "entities" / "ritterhauptmann.json", hauptmann_verhalten())
    for name, tabelle in beute().items():
        schreibe(VER / "loot_tables" / name, tabelle)
    for veraltet in (VER / "loot_tables" / "ausruestung" / "ritter.json", VER / "loot_tables" / "wesen" / "ritter.json"):
        if veraltet.exists():
            veraltet.unlink()
    sprache()
    in_liste_eintragen()
    print("gebaut: Ritter (Schwert/Armbrust), Ritterhauptmann, Saphirschwert")

    if "--bilder" in sys.argv:
        vorschau(Path(sys.argv[sys.argv.index("--bilder") + 1]), icon)


def zusammensetzen(geo_a, bild_a, geo_b, bild_b):
    """Zwei Modelle zu einem, wie das Spiel sie uebereinander zeichnet.

    Das zweite Bild kommt unter das erste; die Kaesten des zweiten Modells
    holen ihre Felder entsprechend weiter unten. Knochen, die es im ersten
    schon gibt (body, rightArm, head), sind im zweiten nur Gelenke ohne
    Kaesten - sie fallen weg, und die neuen Knochen haengen sich an die
    vorhandenen. Die Mob-Schau der Pixelschmiede nimmt dasselbe."""
    a = json.loads(json.dumps(geo_a["minecraft:geometry"][0]))
    b = geo_b["minecraft:geometry"][0]
    unten = bild_a.height
    namen = {k["name"].lower() for k in a["bones"]}
    for k in b["bones"]:
        if k["name"].lower() in namen:
            if k.get("cubes"):
                raise ValueError(f"{k['name']}: vorhandener Knochen mit eigenen Kaesten")
            continue
        k = json.loads(json.dumps(k))
        for c in k.get("cubes", []):
            c["uv"] = [c["uv"][0], c["uv"][1] + unten]
        a["bones"].append(k)
    bild = Image.new("RGBA", (max(bild_a.width, bild_b.width), unten + bild_b.height), (0, 0, 0, 0))
    bild.paste(bild_a, (0, 0))
    bild.paste(bild_b, (0, unten))
    a["description"] = dict(a["description"], texture_width=bild.width, texture_height=bild.height)
    return {"format_version": geo_a.get("format_version", "1.12.0"), "minecraft:geometry": [a]}, bild


def vorschau(ordner, icon):
    """Ritter mit Armbrust und Hauptmann mit Helmbusch, zusammengesetzt aus
    Koerper und Zusatzmodell, von vorn und von hinten."""
    from PIL import ImageDraw
    lade = lambda p: json.loads(Path(p).read_text(encoding="utf-8"))
    koerper = lade(RES / "models" / "entity" / "ritter.geo.json")
    anims = lade(RES / "animations" / "ritterorden.animation.json")["animations"]
    zellen = []
    for name, haut, teil, posen in (
            ("Ritter mit Armbrust", "ritter", "armbrust", ["stehen", "armbrust"]),
            ("Ritter zielt", "ritter", "armbrust", ["armbrust", "zielen"]),
            ("Ritterhauptmann", "ritterhauptmann", "helmbusch", ["stehen", "halten"])):
        geo, bild = zusammensetzen(koerper, Image.open(RES / "textures" / "entity" / f"{haut}.png").convert("RGBA"),
                                   lade(RES / "models" / "entity" / f"ritter_{teil}.geo.json"),
                                   Image.open(RES / "textures" / "entity" / f"ritter_{teil}.png").convert("RGBA"))
        wer = "ritter" if haut == "ritter" else "ritterhauptmann"
        liste = [(anims[f"animation.fynn.{wer}.{p}"], 1.0) for p in posen]
        for gier in (35, 150):
            zellen.append((tm.ansehen(geo, bild, liste, {"q.has_target": 1.0}, gier=gier, neigung=8,
                                      breite=240, hoehe=300, zoom=7.5, mitte=(0, 18, 0)), f"{name}, {gier} Grad"))
    gesamt = Image.new("RGBA", (len(zellen) * 240, 330), (250, 250, 252, 255))
    m = ImageDraw.Draw(gesamt)
    for i, (b, text) in enumerate(zellen):
        gesamt.paste(b, (i * 240, 0))
        m.text((i * 240 + 8, 310), text, fill=(20, 20, 30, 255))
    ordner.mkdir(parents=True, exist_ok=True)
    gesamt.save(ordner / "ritterorden.png")
    groß = icon.resize((128, 128), Image.NEAREST)
    groß.save(ordner / "saphirschwert_bild.png")
    print("gezeichnet:", ordner / "ritterorden.png")


if __name__ == "__main__":
    main()
