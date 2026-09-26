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
from spawneier import ei_eintrag  # noqa: E402

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
        "biome": [["taiga"], ["extreme_hills", "forest"], ["roofed"]], "gewicht": 6,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:snow_layer", "minecraft:coarse_dirt"],
        "beute": [("fynn:baerenfleisch", 1, 3, 1.0, True), ("fynn:baerenfell", 1, 1, 0.5, False),
                  ("fynn:baerenkralle", 1, 1, 0.08, False)],
        "laute": {"ambient": "mob.polarbear.idle", "hurt": "mob.polarbear.hurt", "death": "mob.polarbear.death",
                  "step": "mob.polarbear.step", "pitch": [0.7, 0.9]},
        "ei": ("#6b4424", "#c9a26f"), "angriff": "tatze",
    },
    {
        "id": "elch", "grast": True, "scharrt": True, "name": ("Elch", "Moose"), "gestalt": "elch",
        "varianten": [("bulle", 50), ("kuh", 50)], "baby_textur": "kalb",
        "art": "land", "verhalten": "neutral", "leben": 36, "schaden": 6, "tempo": 0.23,
        "kollision": (1.5, 2.3), "baby": True, "herde": (1, 3), "stoss": 1.6,
        "futter": ["minecraft:apple", "minecraft:sweet_berries", "fynn:weidenroeschen"],
        # Fynn: "Man kann jetzt auch den Elch reiten. Zaehmen mit irgendwas,
        # was der frisst - eine Pflanze, oder Setzlinge." Elche fressen im
        # Sommer Weidenroeschen und junge Baeume - beides zaehmt ihn.
        "reiten": {"zaehmen": ["fynn:weidenroeschen", "minecraft:birch_sapling", "minecraft:spruce_sapling",
                               "minecraft:oak_sapling", "minecraft:dark_oak_sapling", "minecraft:cherry_sapling"],
                   "chance": 0.2, "tempo": 0.25, "sitz": [0.0, 1.75, -0.19], "sprung": 0.7},
        "biome": [["taiga"], ["swamp"]], "gewicht": 6,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:snow_layer", "minecraft:coarse_dirt"],
        "beute": [("fynn:elchfleisch", 1, 3, 1.0, True), ("minecraft:leather", 0, 2, 1.0, False)],
        # Das Geweih verlieren nur die Bullen - das entscheidet tiere.js,
        # denn eine Beuteliste weiss nicht, welche Variante gestorben ist.
        "laute": {"ambient": "mob.cow.say", "hurt": "mob.cow.hurt", "death": "mob.cow.hurt",
                  "step": "mob.cow.step", "pitch": [0.45, 0.6]},
        "ei": ("#3e2a1a", "#d8c8a0"), "angriff": "stoss",
        "zeigen": {"geweih": "query.variant == 0 && !query.is_baby"},
    },
    {
        "id": "wildschwein", "grast": True, "name": ("Wildschwein", "Wild Boar"), "gestalt": "wildschwein",
        "varianten": [("erwachsen", 100)], "baby_textur": "frischling",
        "art": "land", "verhalten": "feindlich", "reichweite": 5, "leben": 22, "schaden": 5, "tempo": 0.27,
        "kollision": (0.9, 0.9), "baby": True, "herde": (2, 4), "stoss": 1.2,
        "futter": ["minecraft:carrot", "minecraft:potato", "minecraft:beetroot", "minecraft:apple"],
        "biome": [["forest", "!taiga", "!mountains"]], "gewicht": 8,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:coarse_dirt"],
        "beute": [("fynn:wildschweinfleisch", 1, 3, 1.0, True), ("fynn:wildschweinhauer", 1, 1, 0.12, False)],
        "laute": {"ambient": "mob.hoglin.ambient", "hurt": "mob.hoglin.hurt", "death": "mob.hoglin.death",
                  "step": "mob.hoglin.step", "pitch": [1.0, 1.2]},
        "ei": ("#4a3c30", "#a88478"), "angriff": "stoss",
    },
    {
        "id": "bison", "grast": True, "scharrt": True, "name": ("Bison", "Bison"), "gestalt": "bison",
        # Waldbisons sind dunkler; ganz selten ein weisser Bison - bei den
        # Praerievoelkern ein heiliges Tier.
        "varianten": [("prarie", 72), ("winter", 0), ("wald", 26), ("weiss", 2)], "baby_textur": "kalb",
        "art": "land", "verhalten": "neutral", "herdenwut": True, "leben": 50, "schaden": 7, "tempo": 0.22,
        "kollision": (1.8, 2.2), "baby": True, "herde": (3, 6), "stoss": 2.0,
        "futter": ["minecraft:wheat"],
        "biome": [["plains"], ["ice_plains", "!mutated"], ["meadow"]], "gewicht": 9,
        "boden": ["minecraft:grass_block", "minecraft:snow_layer"],
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
        "biome": [["savanna"]], "gewicht": 6,
        "boden": ["minecraft:grass_block", "minecraft:coarse_dirt"],
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
        "biome": [["jungle"]], "gewicht": 5,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:moss_block"],
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
        "biome": [["swamp"], ["mangrove_swamp"]], "gewicht": 6,
        "boden": ["minecraft:grass_block", "minecraft:mud", "minecraft:mangrove_roots", "minecraft:muddy_mangrove_roots"],
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
        "biome": [["frozen_peaks"], ["jagged_peaks"], ["snowy_slopes"], ["grove"]], "gewicht": 6,
        "boden": ["minecraft:snow", "minecraft:snow_layer", "minecraft:stone", "minecraft:packed_ice",
                  "minecraft:grass_block", "minecraft:powder_snow"],
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
    # ---------------------------------------------------- Fassung 4.41
    {
        "id": "elefant", "name": ("Elefant", "Elephant"), "gestalt": "elefant",
        "varianten": [("savanne", 60), ("grau", 40)], "baby_textur": "kalb",
        "art": "land", "verhalten": "neutral", "herdenwut": True, "leben": 80, "schaden": 10, "tempo": 0.2,
        "kollision": (2.2, 2.8), "baby": True, "herde": (2, 4), "stoss": 2.0,
        "futter": ["minecraft:melon_slice", "minecraft:wheat", "minecraft:apple"],
        "biome": [["savanna"]], "gewicht": 5,
        "boden": ["minecraft:grass_block", "minecraft:coarse_dirt"],
        "beute": [("minecraft:leather", 2, 4, 1.0, False)],
        "laute": {"ambient": "mob.ravager.roar", "hurt": "mob.ravager.hurt", "death": "mob.ravager.death",
                  "step": "mob.ravager.step", "pitch": [1.2, 1.4]},
        "ei": ("#8a8078", "#ece4cc"), "angriff": "stoss",
        "zeigen": {"stosszaehne": "!query.is_baby"},
        # Fynn: "Es gibt eine geringe Wahrscheinlichkeit, dass besonders
        # grosse Elefanten spawnen. Auf dem kann man dann einen Spezialsattel
        # drauf machen ... ordentlich Stauraum ... bis zu drei Spieler."
        "riese": {"chance": 6, "gross": 1.4, "leben": 140, "kollision": (2.9, 3.8), "tempo": 0.22,
                  "zaehmen": ["minecraft:hay_block", "minecraft:melon_block"], "zaehmchance": 0.25,
                  "sattel": "fynn:elefantensattel",
                  # Plattform oben bei y = 42 Pixel, um 1.4 vergroessert:
                  # 42 * 1.4 / 16 = 3.7 Bloecke; die Reiter sitzen knapp darunter.
                  "sitze": [[0.0, 3.45, 0.5], [-0.35, 3.45, -0.35], [0.35, 3.45, -0.35]]},
    },
    {
        "id": "nashorn", "grast": True, "scharrt": True, "name": ("Nashorn", "Rhino"), "gestalt": "nashorn",
        "varianten": [("grau", 70), ("dunkel", 30)], "baby_textur": "kalb",
        "art": "land", "verhalten": "neutral", "leben": 50, "schaden": 9, "tempo": 0.24,
        "kollision": (1.6, 1.9), "baby": True, "herde": (1, 2), "stoss": 2.5,
        "futter": ["minecraft:wheat", "minecraft:hay_block"],
        "biome": [["savanna"]], "gewicht": 4,
        "boden": ["minecraft:grass_block", "minecraft:coarse_dirt"],
        "beute": [("minecraft:leather", 1, 3, 1.0, False)],
        "laute": {"ambient": "mob.hoglin.ambient", "hurt": "mob.hoglin.hurt", "death": "mob.hoglin.death",
                  "step": "mob.ravager.step", "pitch": [0.55, 0.7]},
        "ei": ("#8a8884", "#5e5a56"), "angriff": "stoss",
        "zeigen": {"horn": "!query.is_baby"},
    },
    {
        "id": "gorilla", "name": ("Gorilla", "Gorilla"), "gestalt": "gorilla",
        "varianten": [("silberruecken", 35), ("schwarz", 65)], "baby_textur": "jung",
        # Fynn: "Der Silberruecken muss ein bisschen groesser sein als der
        # normale Affe." Wie in echt: Der alte Anfuehrer der Gruppe ist der
        # schwerste Gorilla, gut ein Siebtel groesser als die anderen.
        "variante_gross": {0: 1.15},
        "art": "land", "verhalten": "neutral", "herdenwut": True, "leben": 40, "schaden": 8, "tempo": 0.26,
        "kollision": (1.3, 1.8), "baby": True, "herde": (2, 4),
        "futter": ["minecraft:melon_slice", "minecraft:sweet_berries", "minecraft:bamboo"],
        "biome": [["jungle"]], "gewicht": 5,
        "boden": ["minecraft:grass_block", "minecraft:podzol", "minecraft:moss_block"],
        "beute": [("minecraft:leather", 0, 1, 1.0, False)],
        "laute": {"ambient": "mob.panda.idle.aggressive", "hurt": "mob.panda.hurt", "death": "mob.panda.death",
                  "step": "mob.polarbear.step", "pitch": [0.5, 0.65]},
        "ei": ("#2c2a28", "#8a8884"), "angriff": "tatze", "trommelt": True,
    },
    {
        "id": "walross", "name": ("Walross", "Walrus"), "gestalt": "walross",
        "varianten": [("braun", 100)], "baby_textur": "jung",
        "art": "amphib", "verhalten": "neutral", "herdenwut": True, "leben": 40, "schaden": 6, "tempo": 0.12,
        "wassertempo": 0.08, "kollision": (1.6, 1.2), "baby": True, "herde": (2, 5), "stoss": 1.5,
        "futter": ["minecraft:cod", "minecraft:salmon"],
        "biome": [["frozen", "ocean"], ["beach", "cold"]], "gewicht": 7,
        "boden": ["minecraft:ice", "minecraft:packed_ice", "minecraft:snow", "minecraft:snow_layer", "minecraft:gravel",
                  "minecraft:stone", "minecraft:sand"],
        "beute": [("minecraft:cod", 1, 3, 1.0, True), ("minecraft:leather", 0, 2, 1.0, False)],
        "laute": {"ambient": "mob.cow.say", "hurt": "mob.cow.hurt", "death": "mob.cow.hurt",
                  "step": "mob.turtle.step", "pitch": [0.4, 0.5]},
        "ei": ("#9a6a52", "#ece2c8"), "angriff": "stoss",
        "zeigen": {"zaehne": "!query.is_baby"},
    },
    {
        "id": "mantarochen", "name": ("Mantarochen", "Manta Ray"), "gestalt": "manta",
        "varianten": [("ozean", 70), ("riff", 30)],
        "art": "fisch", "verhalten": "friedlich", "leben": 30, "tempo": 0.1, "wassertempo": 0.12,
        "kollision": (1.8, 0.4), "baby": False, "herde": (1, 2), "fluegel": True,
        "biome": [["ocean", "warm"], ["ocean", "lukewarm"]], "gewicht": 4, "wasser": True,
        "beute": [("minecraft:prismarine_crystals", 0, 1, 1.0, False)],
        "laute": {"hurt": "mob.fish.hurt", "death": "mob.fish.hurt", "flop": "mob.fish.flop", "pitch": [0.5, 0.6]},
        "ei": ("#23272e", "#e8eaec"),
    },
    {
        "id": "steinadler", "name": ("Steinadler", "Golden Eagle"), "gestalt": "adler",
        "varianten": [("altvogel", 70), ("jungvogel", 30)],
        "art": "vogel", "verhalten": "neutral", "leben": 16, "schaden": 4, "tempo": 1.2,
        "kollision": (1.0, 0.6), "baby": False, "herde": (1, 1),
        "jagt": ["minecraft:rabbit", "minecraft:chicken"],
        "biome": [["mountains"], ["extreme_hills"], ["meadow"]], "gewicht": 4,
        "boden": ["minecraft:grass_block", "minecraft:stone", "minecraft:snow_layer", "minecraft:gravel"],
        "beute": [("minecraft:feather", 1, 3, 1.0, False)],
        "laute": {"ambient": "mob.parrot.idle", "hurt": "mob.parrot.hurt", "death": "mob.parrot.death",
                  "pitch": [0.55, 0.65]},
        "ei": ("#4a3222", "#b8863a"), "angriff": "krallen",
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

    elif art == "vogel":
        # Wie Mojangs Phantom: gleitet ohne Schwerkraft, kreist hoch ueber
        # einem Punkt und stoesst von oben herab - auf Kaninchen und
        # Huehner, und auf jeden, der ihn angreift.
        c.update({
            "minecraft:movement.glide": {"start_speed": 0.1, "speed_when_turning": 0.2},
            "minecraft:physics": {"has_gravity": False},
            "minecraft:breathable": {"total_supply": 15, "suffocate_time": 0},
            "minecraft:game_event_movement_tracking": {"emit_flap": True},
            "minecraft:follow_range": {"value": 48, "max": 48},
            "minecraft:attack": {"damage": t["schaden"]},
            "minecraft:behavior.circle_around_anchor": {
                "priority": 3, "goal_radius": 1, "radius_range": {"min": 6.0, "max": 14.0},
                "height_offset_range": {"min": -3, "max": 4},
                "height_above_target_range": {"min": 14, "max": 26}},
            "minecraft:behavior.swoop_attack": {"priority": 2, "damage_reach": 0.3, "speed_multiplier": 1.0,
                                                "delay_range": {"min": 8.0, "max": 16.0}},
            "minecraft:behavior.nearest_attackable_target": {
                "priority": 2, "must_see": True, "reselect_targets": True, "within_radius": 40,
                "target_search_height": 40,
                "entity_types": [{"filters": familie(*[n.split(":")[1] for n in t["jagt"]]), "max_dist": 40}]},
        })

    # --- Verhalten und Junge
    gruppen = {}
    ereignisse = {}
    erwachsen, baby = "fynn:erwachsen", "fynn:baby"
    gruppen[erwachsen] = {"minecraft:loot": {"table": f"loot_tables/entities/{t['id']}.json"}}

    if t["verhalten"] == "neutral" and art != "vogel":
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
    elif art != "vogel":
        c["minecraft:behavior.panic"] = {"priority": 1, "speed_multiplier": 1.3}

    erwachsen_liste = [erwachsen] + (["fynn:ruhig"] if "fynn:ruhig" in gruppen else []) + \
                      (["fynn:jagd"] if t["verhalten"] == "feindlich" else [])
    if t.get("reiten"):
        erwachsen_liste.append("fynn:wild")
        reittier(t, c, gruppen, ereignisse)

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
            # Reittiere bekommen Junge nur, wenn sie gezaehmt sind - wie
            # Pferde. So stoert das Fuettern das Zaehmen nicht.
            c["minecraft:breedable"] = {"require_tame": bool(t.get("reiten")), "breed_items": t["futter"],
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
    if t.get("riese"):
        rie = t["riese"]
        alter = [{"weight": 88 - rie["chance"], "add": {"component_groups": erwachsen_liste}},
                 {"weight": rie["chance"], "add": {"component_groups": erwachsen_liste + ["fynn:riese"]},
                  "set_property": {"fynn:riese": True}}]
        riesenreittier(t, c, gruppen, ereignisse)
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

    beschreibung = {"identifier": kennung, "spawn_category": "water_creature" if wasser else "creature",
                    "is_spawnable": True, "is_summonable": True}
    if t.get("riese"):
        beschreibung["properties"] = {"fynn:riese": {"type": "bool", "default": False, "client_sync": True}}
    if t.get("reiten"):
        # Wie viele Rucksaecke der Elch traegt (0 bis 2) - das Spiel zeigt
        # danach die Taschen an den Flanken (verhaltenspaket/scripts/rucksack.js).
        beschreibung["properties"] = {"fynn:taschen": {"type": "int", "range": [0, 2], "default": 0,
                                                       "client_sync": True}}
    return {
        "format_version": "1.26.30",
        "minecraft:entity": {
            "description": beschreibung,
            "component_groups": gruppen,
            "components": c,
            "events": ereignisse,
        },
    }


def reittier(t, c, gruppen, ereignisse):
    """Zaehmen, Satteln, Reiten - nach Mojangs Kamel und Pferd.

    Wild: Fuettern mit dem, was in "zaehmen" steht, zaehmt mit einer
    Chance. Gezaehmt: vergisst jede Wut, bleibt fuer immer, laesst einen
    Sattel auflegen (mit der Schere wieder ab) und traegt einen Reiter.
    Gesattelt: laesst sich lenken, so schnell wie ein Pferd, springt hoch,
    wenn man die Sprungtaste haelt."""
    r = t["reiten"]
    sattel_in_hand = {"test": "has_equipment", "subject": "other", "domain": "hand", "value": "saddle"}
    hat_sattel = {"test": "has_equipment", "subject": "self", "domain": "inventory", "value": "saddle"}
    nicht_geduckt = {"test": "is_sneak_held", "subject": "other", "value": False}
    gruppen["fynn:wild"] = {"minecraft:tameable": {
        "probability": r["chance"], "tame_items": r["zaehmen"],
        "tame_event": {"event": "fynn:gezaehmt", "target": "self"}}}
    gruppen["fynn:gezaehmt"] = {
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
             "interact_text": "action.interact.removesaddle", "play_sounds": "unsaddle"},
        ]},
        "minecraft:rideable": {"seat_count": 1, "crouching_skip_interact": True, "family_types": ["player"],
                               "interact_text": "action.interact.ride.horse",
                               "seats": [{"position": r["sitz"]}]},
        "minecraft:variable_max_auto_step": {"base_value": 1.0625, "controlled_value": 1.0625,
                                             "jump_prevented_value": 0.5625},
    }
    gruppen["fynn:gesattelt"] = {
        "minecraft:is_saddled": {},
        "minecraft:input_ground_controlled": {},
        "minecraft:behavior.player_ride_tamed": {},
        "minecraft:movement": {"value": r["tempo"]},
        "minecraft:can_power_jump": {},
        "minecraft:horse.jump_strength": {"value": r["sprung"]},
    }
    ereignisse["fynn:gezaehmt"] = {"remove": {"component_groups": ["fynn:wild", "fynn:ruhig", "fynn:wuetend"]},
                                    "add": {"component_groups": ["fynn:gezaehmt"]}}
    ereignisse["fynn:gesattelt"] = {"add": {"component_groups": ["fynn:gesattelt"]}}
    ereignisse["fynn:abgesattelt"] = {"remove": {"component_groups": ["fynn:gesattelt"]}}
    # Ein gezaehmtes Tier verschwindet nie, auch wenn man weit weg ist.
    c["minecraft:despawn"] = {"despawn_from_distance": {},
                              "filters": {"test": "is_tamed", "subject": "self", "operator": "!=", "value": True}}
    # Wer wuetend ist, laesst sich nicht zaehmen - der Eisbaer-Wutzustand
    # bleibt fuer wilde Elche.
    if "fynn:ruhig" in gruppen:
        ereignisse["fynn:beruhigt"] = {"sequence": [
            {"filters": {"test": "is_tamed", "subject": "self", "value": False},
             "remove": {"component_groups": ["fynn:wuetend"]}, "add": {"component_groups": ["fynn:ruhig"]}},
            {"filters": {"test": "is_tamed", "subject": "self", "value": True},
             "remove": {"component_groups": ["fynn:wuetend"]}}]}


def riesenreittier(t, c, gruppen, ereignisse):
    """Der Riesenelefant: selten, gross, gutmuetig. Mit Heuballen oder
    Melonen zaehmen, dann den Elefantensattel auflegen (mit der Schere
    wieder ab). Gesattelt tragen sie drei Reiter - wer zuerst aufsteigt,
    lenkt - und eine Kiste mit 15 Plaetzen (geduckt antippen oder beim
    Reiten das Inventar oeffnen)."""
    r = t["riese"]
    nicht_geduckt = {"test": "is_sneak_held", "subject": "other", "value": False}
    gesattelt = {"test": "has_component", "subject": "self", "value": "minecraft:is_saddled"}
    gruppen["fynn:riese"] = {
        "minecraft:collision_box": {"width": r["kollision"][0], "height": r["kollision"][1]},
        "minecraft:health": {"value": r["leben"], "max": r["leben"]},
        "minecraft:variable_max_auto_step": {"base_value": 1.5625, "controlled_value": 1.5625,
                                             "jump_prevented_value": 1.5625},
        "minecraft:tameable": {"probability": r["zaehmchance"], "tame_items": r["zaehmen"],
                               "tame_event": {"event": "fynn:gezaehmt", "target": "self"}},
    }
    gruppen["fynn:gezaehmt"] = {
        "minecraft:is_tamed": {},
        "minecraft:inventory": {"container_type": "horse", "inventory_size": 16},
        "minecraft:interact": {"interactions": [
            {"on_interact": {"filters": {"all_of": [
                dict(gesattelt, operator="!="),
                {"test": "has_equipment", "subject": "other", "domain": "hand", "value": r["sattel"]},
                nicht_geduckt]}, "event": "fynn:gesattelt", "target": "self"},
             "use_item": True, "play_sounds": "saddle", "interact_text": "action.interact.saddle"},
            {"on_interact": {"filters": {"all_of": [
                gesattelt, {"test": "rider_count", "subject": "self", "operator": "equals", "value": 0},
                {"test": "has_equipment", "subject": "other", "domain": "hand", "value": "shears"}, nicht_geduckt]},
                "event": "fynn:abgesattelt", "target": "self"},
             "hurt_item": 1, "spawn_items": {"table": "loot_tables/elefantensattel.json"},
             "play_sounds": "unsaddle", "interact_text": "action.interact.removesaddle"},
        ]},
    }
    gruppen["fynn:gesattelt"] = {
        "minecraft:is_saddled": {},
        "minecraft:is_chested": {},
        "minecraft:input_ground_controlled": {},
        "minecraft:behavior.player_ride_tamed": {},
        "minecraft:movement": {"value": r["tempo"]},
        "minecraft:rideable": {"seat_count": len(r["sitze"]), "controlling_seat": 0, "crouching_skip_interact": True,
                               "family_types": ["player"], "interact_text": "action.interact.ride.horse",
                               "seats": [{"position": pos} for pos in r["sitze"]]},
    }
    ereignisse["fynn:gezaehmt"] = {"remove": {"component_groups": ["fynn:ruhig", "fynn:wuetend"]},
                                    "add": {"component_groups": ["fynn:gezaehmt"]}}
    ereignisse["fynn:gesattelt"] = {"add": {"component_groups": ["fynn:gesattelt"]}}
    ereignisse["fynn:abgesattelt"] = {"remove": {"component_groups": ["fynn:gesattelt"]}}
    # Zum Ausprobieren, ohne lange zu suchen:
    #     /event entity @e[type=fynn:elefant,r=10] fynn:wird_riese
    ereignisse["fynn:wird_riese"] = {"add": {"component_groups": ["fynn:riese"]}, "set_property": {"fynn:riese": True}}
    c["minecraft:despawn"] = {"despawn_from_distance": {},
                              "filters": {"test": "is_tamed", "subject": "self", "operator": "!=", "value": True}}
    ereignisse["fynn:beruhigt"] = {"sequence": [
        {"filters": {"test": "is_tamed", "subject": "self", "value": False},
         "remove": {"component_groups": ["fynn:wuetend"]}, "add": {"component_groups": ["fynn:ruhig"]}},
        {"filters": {"test": "is_tamed", "subject": "self", "value": True},
         "remove": {"component_groups": ["fynn:wuetend"]}}]}


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
            if t.get("boden"):
                # Nur auf passendem Boden - nicht auf Blaettern oder Dachziegeln.
                b["minecraft:spawns_on_block_filter"] = t["boden"]
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

# Kleine Dinge, die Tiere zwischendurch tun. Jede kommt in Abstaenden, je
# Tier versetzt (variable.fynn_zufall), damit eine Herde nicht im Gleichtakt
# zuckt. puls(): 0, und fuer kurze Zeit 1 - weich an- und abschwellend.
def puls(tempo, versatz, schwelle):
    k = round(1.5 / (1.0 - schwelle), 2)
    return (f"math.clamp((math.sin(query.life_time * {tempo} + variable.fynn_zufall + {versatz}) - {schwelle})"
            f" * {k}, 0.0, 1.0)")


STEHT = "(1.0 - math.clamp(query.modified_move_speed * 3.0, 0.0, 1.0))"
ZUSATZ_GEWICHT = {
    "kopfschuetteln": f"{STEHT} * {puls(19.0, 0, 0.93)}",
    "schwanzschlag": puls(31.0, 120, 0.8),
    "grasen": f"{STEHT} * {puls(13.0, 200, 0.7)}",
    "scharren": f"query.is_angry * {STEHT}",
    "trompeten": puls(14.0, 40, 0.93),
    "kratzen": f"{STEHT} * {puls(11.0, 300, 0.9)}",
    "bruellen": f"{STEHT} * {puls(17.0, 60, 0.9)}",
    "wedeln": f"{STEHT} * {puls(23.0, 90, 0.85)}",
    "sonnen": f"{STEHT} * (1.0 - query.is_in_water) * {puls(9.0, 0, 0.5)}",
    "schrei": puls(21.0, 0, 0.93),
    "salto": "1.0",
}


def zusatzbewegungen(t, da, kopf, schwanzkette):
    """Kopfschuetteln (gegen Fliegen), Schwanzschlagen, Grasen, Scharren vor
    dem Angriff - und was nur ein Tier tut: Elefanten trompeten, Gorillas
    kratzen sich am Kopf, Walrosse bruellen und wedeln mit der Flosse,
    Krokodile liegen mit offenem Maul in der Sonne."""
    lt = "query.life_time"
    z = {}
    ohren = [o for o in ("ohr_links", "ohr_rechts") if o in da]
    if kopf:
        schuetteln = {kopf: {"rotation": [0.0, f"math.sin({lt} * 1100.0) * 9.0", f"math.sin({lt} * 1100.0 + 90.0) * 12.0"]}}
        for o in ohren:
            schuetteln[o] = {"rotation": [0.0, f"math.sin({lt} * 1100.0 + 60.0) * {-25 if o == 'ohr_links' else 25}", 0.0]}
        z["kopfschuetteln"] = {"loop": True, "bones": schuetteln}
    if schwanzkette:
        z["schwanzschlag"] = {"loop": True, "bones": {
            k: {"rotation": [f"-10.0 - {i * 5}", f"math.sin({lt} * 700.0 - {i * 60}) * {30 + 10 * i}", 0.0]}
            for i, k in enumerate(schwanzkette)}}
    if t.get("grast") and kopf:
        z["grasen"] = {"loop": True, "bones": {
            kopf: {"rotation": [f"48.0 + math.sin({lt} * 400.0) * 3.0", f"math.sin({lt} * 60.0) * 8.0", 0.0]},
            "body": {"rotation": [4.0, 0.0, 0.0]}}}
    if t.get("scharrt"):
        z["scharren"] = {"loop": True, "bones": {
            "leg0": {"rotation": [f"-15.0 + math.sin({lt} * 500.0) * 28.0", 0.0, 0.0]},
            kopf: {"rotation": [22.0, f"math.sin({lt} * 250.0) * 6.0", 0.0]}}}
    if "ruessel1" in da:
        z["trompeten"] = {"loop": True, "bones": {
            kopf: {"rotation": [-22.0, 0.0, 0.0]},
            "ruessel1": {"rotation": [-85.0, 0.0, 0.0]},
            "ruessel2": {"rotation": [-55.0, 0.0, 0.0]},
            "ruessel3": {"rotation": [f"-45.0 + math.sin({lt} * 900.0) * 8.0", 0.0, 0.0]},
            "kiefer": {"rotation": [22.0, 0.0, 0.0]},
            "ohr_links": {"rotation": [0.0, -38.0, 0.0]},
            "ohr_rechts": {"rotation": [0.0, 38.0, 0.0]}}}
    if t["id"] == "gorilla":
        z["kratzen"] = {"loop": True, "bones": {
            "leg0": {"rotation": [f"-92.0 + math.sin({lt} * 800.0) * 6.0", 0.0, 42.0]},
            kopf: {"rotation": [8.0, -12.0, -14.0]},
            "body": {"rotation": [-10.0, 0.0, 0.0]}}}
    if t["id"] == "walross":
        z["bruellen"] = {"loop": True, "bones": {
            kopf: {"rotation": [f"-38.0 + math.sin({lt} * 300.0) * 4.0", 0.0, 0.0]},
            "body": {"rotation": [-8.0, 0.0, 0.0]}}}
        z["wedeln"] = {"loop": True, "bones": {
            "leg0": {"rotation": [0.0, f"math.sin({lt} * 400.0) * 20.0", f"-25.0 + math.sin({lt} * 400.0) * 15.0"]}}}
    if "kiefer" in da and t["id"] == "krokodil":
        z["sonnen"] = {"loop": True, "bones": {"kiefer": {"rotation": [32.0, 0.0, 0.0]},
                                               kopf: {"rotation": [-6.0, 0.0, 0.0]}}}
    return z


# ------------------------------------------------------------ Gangarten
#
# Fynn: "Die gehen noch ein bisschen wild ... mit diesen Kloetzen als
# Beine. Vielleicht brauchst du noch ein Gelenk, ein bisschen Knie-maessig."
#
# Wie Vierbeiner wirklich laufen (siehe Animationsleitfaeden, z. B.
# Animation Mentor, AnimSchool): Im Schritt setzen sie die Fuesse einzeln,
# immer in derselben Reihenfolge - hinten links, vorn links, hinten rechts,
# vorn rechts, je eine Viertelrunde versetzt ("lateraler Viertakt"); drei
# Fuesse stehen fast immer. Beim Vorschwingen knickt das Knie ein und der
# Huf hebt sich nach hinten; steht der Fuss, ist das Bein gerade. Schneller
# wird daraus der Trab: die diagonalen Beine gemeinsam. Nur Katzen
# galoppieren, mit gebogenem Ruecken.
#
# Drehrichtung: Positiv um x schwingt ein haengendes Bein nach hinten.
# Die Oberschenkel schwingen mit cos(T + Phase); nach vorn (und damit in
# der Luft) sind sie, solange sin(T + Phase) positiv ist - genau dann
# knickt das Knie ein.

VIERTAKT = {"leg2": 0.0, "leg0": -90.0, "leg3": -180.0, "leg1": -270.0}
DIAGONAL = {"leg0": 0.0, "leg3": 0.0, "leg1": -180.0, "leg2": -180.0}


def beinpaar(T, phasen, winkel, knie, knie_da):
    knochen = {}
    for bein, phase in phasen.items():
        knochen[bein] = {"rotation": [f"math.cos({T} + {phase}) * {winkel}", 0.0, 0.0]}
        k = "knie" + bein[-1]
        if k in knie_da:
            # Nur in der Luft einknicken, und dort weich an- und abschwellend.
            knochen[k] = {"rotation": [f"math.max(0.0, math.sin({T} + {phase}) - 0.15) * {knie / 0.85:.1f}", 0.0, 0.0]}
    return knochen


def schrittgang(T, art, da, kopf, schwanzkette):
    """Der ruhige Schritt im Viertakt."""
    knie_da = {k for k in da if k.startswith("knie")}
    knochen = beinpaar(T, VIERTAKT, 14.0 if art == "amphib" else 22.0, 38.0, knie_da)
    # Der Koerper hebt und senkt sich zweimal je Runde, wiegt sich sacht
    # zur Seite des Beins, das gerade vorschwingt; der Kopf nickt mit den
    # Vorderbeinen.
    knochen["body"] = {"position": [0.0, f"-math.cos({T} * 2.0) * 0.3", 0.0],
                       "rotation": [f"math.sin({T} * 2.0 - 90.0) * 0.8", 0.0, f"math.sin({T} - 45.0) * 1.4"]}
    if kopf:
        knochen[kopf] = {"rotation": [f"math.sin({T} * 2.0 - 30.0) * 2.5", f"math.sin({T} - 90.0) * 2.0", 0.0]}
    for i, k in enumerate(schwanzkette):
        knochen[k] = {"rotation": [f"math.cos({T} * 2.0) * 3.0", f"math.sin({T} - {40 + 30 * i}) * {8 + 5 * i}", 0.0]}
    if "schwanz1" in da:
        for i, k in enumerate(("schwanz1", "schwanz2", "schwanz3")):
            knochen[k] = {"rotation": [0.0, f"math.sin({T} - {40 * i}) * {8 + 5 * i}", 0.0]}
    return {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": knochen}


def trab(T, da, kopf, schwanzkette):
    """Schneller: der Trab, diagonale Beine gemeinsam, weite Schritte."""
    knie_da = {k for k in da if k.startswith("knie")}
    T2 = f"({T} * 0.8)"
    knochen = beinpaar(T2, DIAGONAL, 30.0, 58.0, knie_da)
    knochen["body"] = {"position": [0.0, f"-math.cos({T2} * 2.0) * 0.6", 0.0],
                       "rotation": [f"math.sin({T2} * 2.0) * 1.5", 0.0, 0.0]}
    if kopf:
        knochen[kopf] = {"rotation": [f"math.sin({T2} * 2.0 + 60.0) * 3.0", 0.0, 0.0]}
    for i, k in enumerate(schwanzkette):
        knochen[k] = {"rotation": [f"-12.0 + math.sin({T2} * 2.0) * 6.0", f"math.sin({T2}) * 8.0", 0.0]}
    return {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": knochen}


def galopp(T, da, kopf, schwanzkette):
    """Katzen: Sprunggalopp - vorn und hinten je fast gemeinsam, der Ruecken
    streckt und beugt sich, die Knie falten weit ein. Weicher als frueher."""
    knie_da = {k for k in da if k.startswith("knie")}
    T2 = f"({T} * 0.7)"
    phasen = {"leg0": 0.0, "leg1": -25.0, "leg2": -180.0, "leg3": -205.0}
    knochen = beinpaar(T2, phasen, 34.0, 55.0, knie_da)
    knochen["body"] = {"position": [0.0, f"(1.0 - math.cos({T2} * 2.0)) * 0.5", 0.0],
                       "rotation": [f"math.sin({T2}) * 4.0", 0.0, 0.0]}
    if kopf:
        knochen[kopf] = {"rotation": [f"-math.sin({T2}) * 4.0", 0.0, 0.0]}
    for i, k in enumerate(schwanzkette):
        knochen[k] = {"rotation": [f"-15.0 + math.sin({T2} * 2.0) * 6.0", 0.0, 0.0]}
    return {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": knochen}


def elefant_dazu(a, T):
    """Der Ruessel pendelt im Gehen und tastet im Stehen herum, die Spitze
    rollt sich ein; die grossen Ohren faecheln - so kuehlen sich Elefanten."""
    lt = "query.life_time"
    for anim, x, y, spitze in (
            (a["laufen"], f"math.sin({T} * 2.0) * 5.0", f"math.sin({T}) * 12.0", f"math.sin({T} * 2.0 - 60.0) * 12.0"),
            (a["stehen"], f"math.sin({lt} * 40.0) * 8.0 - 4.0", f"math.sin({lt} * 27.0) * 10.0",
             f"math.sin({lt} * 55.0 - 80.0) * 18.0 - 12.0")):
        anim["bones"]["ruessel1"] = {"rotation": [x, y, 0.0]}
        anim["bones"]["ruessel2"] = {"rotation": [f"({x}) * 1.4", f"({y}) * 0.6", 0.0]}
        anim["bones"]["ruessel3"] = {"rotation": [spitze, 0.0, 0.0]}
    faecheln = f"(math.sin({lt} * 70.0) * 0.5 + 0.5) * 22.0"
    a["stehen"]["bones"]["ohr_links"] = {"rotation": [0.0, f"-{faecheln}", 0.0]}
    a["stehen"]["bones"]["ohr_rechts"] = {"rotation": [0.0, faecheln, 0.0]}
    a["laufen"]["bones"]["ohr_links"] = {"rotation": [0.0, f"-math.abs(math.sin({T})) * 10.0", 0.0]}
    a["laufen"]["bones"]["ohr_rechts"] = {"rotation": [0.0, f"math.abs(math.sin({T})) * 10.0", 0.0]}


# Der Gorilla trommelt: Er richtet sich auf, legt den Kopf zurueck und
# schlaegt abwechselnd mit beiden Haenden auf die Brust. Wann, rechnet
# variable.trommeln (siehe aussehen): alle gut 15 Sekunden fuer etwa drei.
TROMMELN = {"loop": True, "bones": {
    "body": {"rotation": [-32.0, 0.0, 0.0], "position": [0.0, 3.0, 0.0]},
    "head": {"rotation": [-18.0, 0.0, 0.0]},
    "kiefer": {"rotation": ["18.0 + math.sin(query.life_time * 450.0) * 6.0", 0.0, 0.0]},
    "leg0": {"rotation": ["-22.0 + math.sin(query.life_time * 900.0) * 16.0", 0.0, 20.0]},
    "leg1": {"rotation": ["-22.0 - math.sin(query.life_time * 900.0) * 16.0", 0.0, -20.0]},
    "leg2": {"rotation": [32.0, 0.0, 0.0]},
    "leg3": {"rotation": [32.0, 0.0, 0.0]},
}}
TROMMELN_WANN = "variable.trommeln = math.clamp(math.sin(query.life_time * 22.0) * 5.0 - 4.2, 0.0, 1.0);"


def vogelbewegungen():
    """Der Adler segelt: Fluegel weit und leicht nach oben (V-Form), sie
    atmen langsam mit; alle paar Sekunden ein paar kraeftige Schlaege,
    deren Spitzen etwas spaeter nachkommen. In der Kurve rollt er hinein,
    der Schwanz steuert. Stoesst er herab, legt er die Schwingen an und
    streckt die Faenge vor."""
    lt = "query.life_time"
    schlagen = f"math.clamp(math.sin({lt} * 24.0) * 3.0 - 2.0, 0.0, 1.0)"
    schlag = f"math.sin({lt} * 520.0) * 38.0 * {schlagen}"
    nach = f"math.sin({lt} * 520.0 - 60.0) * 26.0 * {schlagen}"
    fliegen = {"loop": True, "bones": {
        "rumpf": {"rotation": ["-query.target_x_rotation * 0.5", 0.0, "variable.fynn_dreh * 2.5"]},
        # Greifvoegel schauen ruckartig: alle zwei Drittel Sekunden ein
        # neuer Blickwinkel, dazwischen steht der Kopf still.
        "kopf": {"rotation": [f"math.sin(math.floor({lt} * 1.5) * 57.0) * 10.0",
                              f"math.sin(math.floor({lt} * 1.5) * 97.0) * 30.0", 0.0]},
        "fluegel_links": {"rotation": [0.0, 0.0, f"-8.0 - math.sin({lt} * 60.0) * 3.0 - {schlag}"]},
        "fluegel_rechts": {"rotation": [0.0, 0.0, f"8.0 + math.sin({lt} * 60.0) * 3.0 + {schlag}"]},
        "fluegelspitze_links": {"rotation": [0.0, 0.0, f"-4.0 - {nach}"]},
        "fluegelspitze_rechts": {"rotation": [0.0, 0.0, f"4.0 + {nach}"]},
        "schwanz": {"rotation": [f"math.sin({lt} * 40.0) * 4.0", "-variable.fynn_dreh * 3.0", 0.0],
                    "scale": ["1.0 + math.min(math.abs(variable.fynn_dreh) * 0.04, 0.35)", 1.0, 1.0]},
        "fuesse": {"rotation": [70.0, 0.0, 0.0]},
    }}
    stossen = {"loop": True, "bones": {
        "fluegel_links": {"rotation": [0.0, -40.0, -25.0]},
        "fluegel_rechts": {"rotation": [0.0, 40.0, 25.0]},
        "fluegelspitze_links": {"rotation": [0.0, -35.0, 0.0]},
        "fluegelspitze_rechts": {"rotation": [0.0, 35.0, 0.0]},
        "fuesse": {"rotation": [-60.0, 0.0, 0.0]},
        "kopf": {"rotation": [20.0, 0.0, 0.0]},
    }}
    schrei = {"loop": True, "bones": {
        "unterschnabel": {"rotation": [28.0, 0.0, 0.0]},
        "kopf": {"rotation": [-22.0, 0.0, 0.0]},
    }}
    return {"fliegen": fliegen, "stossen": stossen, "schrei": schrei}


# Kopf und Beine der Jungtiere, je Tier. Fynn: "Die haben oft ein bisschen
# zu grossen Kopf, vor allem der Elch." Vorher bekamen alle denselben
# anderthalbfachen Kopf - bei einer Katze niedlich, bei einem Tier mit langem
# Schaedel wie Elch oder Nashorn ein Klotz. Kaelber von Huftieren haben
# ausserdem lange Beine, sie laufen gleich nach der Geburt mit der Herde;
# gestauchte Stummelbeine passen nur zu Baeren und Katzen.
BABY = {          # Kopf, Beinlaenge
    "elch":        (1.15, 0.82),
    "bison":       (1.2, 0.76),
    "nashorn":     (1.15, 0.74),
    "elefant":     (1.2, 0.76),
    "wildschwein": (1.15, 0.72),
    "braunbaer":   (1.3, 0.7),
    "loewe":       (1.35, 0.72),
    "tiger":       (1.35, 0.72),
    "schneeleopard": (1.35, 0.72),
    "gorilla":     (1.3, 1.0),
    "krokodil":    (1.2, 0.85),
    "walross":     (1.2, 0.85),
    "wal":         (1.2, 1.0),
}


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
        # Beinlaenge = Hoehe der Huefte (die Beine reichen bis zum Boden).
        beinlaenge = next(k for k in modell.knochen if k.name == "leg0").drehpunkt[1]
        schritt = round(38.17 * (12.0 / max(6.0, beinlaenge)), 2)
        T = f"query.anim_time * {schritt}"
        katze = t.get("gestalt") in ("loewe", "tiger", "schneeleopard")
        a["laufen"] = schrittgang(T, art, da, kopf, schwanzkette)
        if art == "land":
            a["galopp"] = galopp(T, da, kopf, schwanzkette) if katze else trab(T, da, kopf, schwanzkette)
        # Stehen: atmen und ab und zu das Gewicht verlagern - langsam, damit
        # nichts zittert.
        a["stehen"] = {"loop": True, "bones": {
            "body": {"scale": [1.0, "1.0 + math.sin(query.life_time * 60.0) * 0.012", 1.0],
                     "rotation": [0.0, 0.0, "math.sin(query.life_time * 21.0) * 1.2"]}}}
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
        if "ruessel1" in da:
            elefant_dazu(a, T)
        if t.get("trommelt"):
            a["trommeln"] = TROMMELN
        a.update(zusatzbewegungen(t, da, kopf, schwanzkette))
        # In die Kurve legen: Der Kopf geht voraus, der Koerper neigt sich
        # nach innen, der Schwanz schwingt nach aussen (v.fynn_dreh, siehe
        # DREHUNG).
        drehen = {"body": {"rotation": [0.0, 0.0, "-variable.fynn_dreh * 0.8"]}}
        if kopf:
            drehen[kopf] = {"rotation": [0.0, "variable.fynn_dreh * 1.6", 0.0]}
        for i, k in enumerate(schwanzkette + [k for k in ("schwanz1", "schwanz2", "schwanz3") if k in da]):
            drehen[k] = {"rotation": [0.0, f"-variable.fynn_dreh * {1.5 + i}", 0.0]}
        a["drehen"] = {"loop": True, "bones": drehen}
        if art == "amphib":
            # Im Wasser: Beine angelegt, der Schwanz treibt.
            a["schwimmen"] = {"loop": True, "bones": {
                k: {"rotation": [0.0, "math.sin(query.life_time * 200.0 - %d) * %.1f" % (50 * i, 14 + 8 * i), 0.0]}
                for i, k in enumerate(("schwanz1", "schwanz2", "schwanz3"))}}
            a["schwimmen"]["bones"]["body"] = {"rotation": [0.0, "math.sin(query.life_time * 200.0 + 90.0) * 4.0", 0.0]}
            for bein in ("leg0", "leg1", "leg2", "leg3"):
                a["schwimmen"]["bones"][bein] = {"rotation": [70.0, 0.0, 0.0]}
    elif art == "vogel":
        a.update(vogelbewegungen())
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
            if seite in da and t.get("fluegel"):
                # Der Manta fliegt durchs Wasser: grosse, langsame Schlaege,
                # die aussen etwas spaeter ankommen - eine Welle durch die
                # ganze Schwinge.
                spitze = seite.replace("flosse", "spitze")
                knochen[seite] = {"rotation": [0.0, 0.0, f"math.sin(query.life_time * 150.0) * {24 * zeichen}"]}
                knochen[spitze] = {"rotation": [0.0, 0.0, f"math.sin(query.life_time * 150.0 - 70.0) * {20 * zeichen}"]}
            elif seite in da:
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
        # In der Kurve rollt er nach innen, wie ein Flugzeug.
        knochen.setdefault(rumpf, {})["rotation"] = [
            "query.target_x_rotation * 0.6", 0.0,
            f"math.sin(query.life_time * {tempo * 0.5}) * {2.0 if art == 'wal' else 4.0} - variable.fynn_dreh * 2.0"]
        a["schwimmen"] = {"loop": True, "bones": knochen}
        if "horn_links" in da:
            # Die Kopflappen rollen sich auf und ein; alle halbe Minute
            # schlaegt der Manta einen Salto - wie beim Fressen im Plankton.
            for seite, zeichen in (("horn_links", 1), ("horn_rechts", -1)):
                knochen[seite] = {"rotation": ["math.sin(query.life_time * 45.0) * 25.0 - 10.0", 0.0,
                                               f"math.sin(query.life_time * 45.0) * {8 * zeichen}"]}
            zeit = "math.mod(query.life_time + variable.fynn_zufall * 0.1, 30.0)"
            a["salto"] = {"loop": True, "bones": {"rumpf": {"rotation": [
                f"{zeit} < 2.5 ? math.pow(math.sin({zeit} / 2.5 * 90.0), 2.0) * 360.0 : 0.0", 0.0, 0.0]}}}
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
    elif art_angriff == "krallen":
        ang = {"fuesse": {"rotation": [f"-{stoss} * 110.0", 0.0, 0.0]},
               "kopf": {"rotation": [f"{stoss} * 30.0", 0.0, 0.0]}}
    elif art_angriff == "arme":
        for i in range(g.KALMAR_ARME):
            ang[f"arm{i}"] = {"rotation": [f"-{stoss} * 30.0", 0.0, 0.0]}
            ang[f"armspitze{i}"] = {"rotation": [f"-{nach} * 45.0", 0.0, 0.0]}
        for i in range(2):
            ang[f"fangarm{i}"] = {"rotation": [f"-{stoss} * 50.0", 0.0, 0.0]}
    if ang:
        a["angriff"] = {"loop": True, "bones": {k: v for k, v in ang.items() if k}}

    # --- Junge: so gebaut wie Mojangs neue Tierbabys - grosser runder
    # Kopf, kurze stummelige Beine, kurzer Schwanz. Die Beine werden an der
    # Huefte gestaucht; damit die Fuesse trotzdem am Boden stehen, sinkt der
    # Koerper um genau das Stueck, das die Beine kuerzer werden.
    if t.get("baby") and kopf:
        kopfmass, faktor = BABY.get(t["id"], (1.3, 0.8 if art == "amphib" else 0.72))
        # Der Kopf waechst um seinen Drehpunkt, und der sitzt am Koerper -
        # so bleibt er angewachsen. Vorher wurde er zusaetzlich um einen
        # Pixel nach oben und hinten geschoben; beim Walross sass er damit
        # eine Stufe ueber dem Ruecken. Die Schnauze waechst weniger mit als
        # der Rest: Jungtiere haben kurze Gesichter, und ein langer Kopf in
        # voller Vergroesserung war beim Nashorn hoeher als der ganze Koerper.
        jung = {kopf: {"scale": [kopfmass, kopfmass, round(kopfmass * 0.85, 3)]}}
        if "glocke" in da:
            jung["glocke"] = {"scale": [1.0, 0.45, 1.0]}
        if "leg0" in da:
            bein = next(k for k in modell.knochen if k.name == "leg0").drehpunkt[1]
            for b_ in ("leg0", "leg1", "leg2", "leg3"):
                jung[b_] = {"scale": [1.1, faktor, 1.1]}
            jung["body"] = {"position": [0.0, round(-(1 - faktor) * bein, 2), 0.0]}
        for k in schwanzkette:
            jung[k] = {"scale": 0.7}
        for seite in ("flosse_links", "flosse_rechts"):
            if seite in da:
                jung[seite] = {"scale": 0.8}
        a["jung"] = {"loop": True, "bones": jung}

    # --- Der Riese: alles um den Faktor groesser. Weil die Beine am Rumpf
    # haengen und der Rumpf in seinem Drehpunkt waechst, wird er um genau
    # so viel angehoben, dass die Fuesse wieder auf dem Boden stehen.
    if t.get("riese"):
        f = t["riese"]["gross"]
        rumpf_y = next(k.drehpunkt[1] for k in modell.knochen if k.name == "body")
        a["riese"] = {"loop": True, "bones": {"body": {"scale": f, "position": [0.0, round(rumpf_y * (f - 1), 2), 0.0]}}}

    # --- Einzelne Varianten groesser (der Silberruecken). Nur gezeichnet:
    # Eine Groesse im Verhaltenspaket stritte sich mit der des Jungtiers,
    # und beim Erwachsenwerden fiele sie mit dessen Gruppe wieder weg.
    # Angehoben wie beim Riesen, damit die Fuesse am Boden bleiben.
    if t.get("variante_gross"):
        rumpf_y = next(k.drehpunkt[1] for k in modell.knochen if k.name == "body")
        for nr, f in t["variante_gross"].items():
            a[f"gross{nr}"] = {"loop": True, "bones": {"body": {
                "scale": f, "position": [0.0, round(rumpf_y * (f - 1), 2), 0.0]}}}

    # --- Teile, die nur manche Varianten haben (Geweih, Maehne, Hammerkopf)
    if t.get("zeigen"):
        a["teile"] = {"loop": True, "bones": {k: {"scale": f"({bed}) ? 1.0 : 0.0"} for k, bed in t["zeigen"].items()}}
    return a


# Trab bzw. Galopp erst, wenn es schneller geht als beim Umherstreifen -
# beim Fliehen und Angreifen. Frueher schon ab 0.6: Da trabten Bisons beim
# gemuetlichen Grasen wild durch die Gegend.
GALOPP = "math.clamp((query.modified_move_speed - 0.95) * 4.0, 0.0, 1.0)"
# Wie stark die Gehbewegung wirkt: mit dem Tempo, aber nie ueber 1 - sonst
# schlagen die Beine bei schnellen Tieren weiter aus, als sie duerfen.
GEHEN = "math.clamp(query.modified_move_speed * 1.4, 0.0, 1.0)"
# Wie schnell sich das Tier gerade dreht, weich nachgezogen, in etwa Grad
# je zwanzigstel Sekunde; Spruenge ueber die 180-Grad-Grenze abgefangen.
DREHUNG_START = ["variable.fynn_gier_alt = query.body_y_rotation;", "variable.fynn_dreh = 0.0;",
                 "variable.fynn_zufall = math.random(0.0, 360.0);"]
DREHUNG = [
    "variable.fynn_d = query.body_y_rotation - variable.fynn_gier_alt;",
    "variable.fynn_d = variable.fynn_d > 180.0 ? variable.fynn_d - 360.0 : "
    "(variable.fynn_d < -180.0 ? variable.fynn_d + 360.0 : variable.fynn_d);",
    "variable.fynn_gier_alt = query.body_y_rotation;",
    "variable.fynn_dreh = math.lerp(variable.fynn_dreh, "
    "math.clamp(variable.fynn_d / math.max(query.delta_time, 0.01) / 20.0, -10.0, 10.0), 0.12);",
]


def animate_liste(t, anims):
    liste = []
    wasser = t["art"] in ("fisch", "wal")
    if "laufen" in anims:
        if t["art"] == "amphib":
            liste.append({"laufen": f"!query.is_in_water ? {GEHEN} : 0.0"})
            liste.append({"schwimmen": "query.is_in_water"})
        elif "galopp" in anims:
            liste.append({"laufen": f"{GEHEN} * (1.0 - variable.galopp)"})
            liste.append({"galopp": "variable.galopp"})
        else:
            liste.append({"laufen": GEHEN})
        liste.append({"stehen": "1.0 - math.clamp(query.modified_move_speed * 2.0, 0.0, 0.8)"})
        liste.append("blick")
        liste.append("drehen")
    if wasser:
        liste.append({"schwimmen": "query.is_in_water" if "an_land" in anims else "1.0"})
        if "an_land" in anims:
            liste.append({"an_land": "!query.is_in_water"})
    for name, gewicht in ZUSATZ_GEWICHT.items():
        if name in anims:
            liste.append({name: gewicht})
    if "fliegen" in anims:
        liste.append("fliegen")
        # Im Sturzflug die Schwingen anlegen.
        liste.append({"stossen": "math.clamp(-query.vertical_speed * 0.6 - 0.2, 0.0, 1.0)"})
    if "trommeln" in anims:
        liste.append({"trommeln": "(1.0 - math.clamp(query.modified_move_speed * 3.0, 0.0, 1.0)) * variable.trommeln"})
    if "angriff" in anims:
        liste.append({"angriff": "variable.attack_time > 0.0"})
    if "jung" in anims:
        liste.append({"jung": "query.is_baby"})
    if "teile" in anims:
        liste.append("teile")
    if "riese" in anims:
        liste.append({"riese": "query.property('fynn:riese')"})
    for nr in t.get("variante_gross", {}):
        liste.append({f"gross{nr}": f"query.variant == {nr} && !query.is_baby"})
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
        "scripts": {"initialize": DREHUNG_START,
                    "pre_animation": DREHUNG + ([f"variable.galopp = {GALOPP};"] if "galopp" in anims else [])
                    + ([TROMMELN_WANN] if "trommeln" in anims else []),
                    "animate": animate_liste(t, anims)},
        "render_controllers": [f"controller.render.fynn.{name}"],
        "spawn_egg": ei_eintrag(t["id"], {"base_color": t["ei"][0], "overlay_color": t["ei"][1]}),
    }
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": d}}


def babyhaut(t):
    """Name der Haut fuer die Jungen - oder None, wenn das Tier keine hat."""
    if not t.get("baby"):
        return None
    return t.get("baby_textur") or "jung"


def steuerung(t, texturen):
    """Welche Haut: die Variante - und bei manchen Jungen eine eigene."""
    varianten = [f"Texture.{v}" for v, _ in t["varianten"]]
    bild = "Array.haut[query.variant]"
    if babyhaut(t):
        bild = f"query.is_baby ? Texture.{babyhaut(t)} : Array.haut[query.variant]"
    steuer = {
        "arrays": {"textures": {"Array.haut": varianten}},
        "geometry": "Geometry.default",
        "materials": [{"*": "Material.default"}],
        "textures": [bild],
    }
    if t.get("riese"):
        steuer["part_visibility"] = [{"saenfte": "query.is_saddled"}]
    if t.get("reiten"):
        steuer["part_visibility"] = [{"sattel": "query.is_saddled"},
                                     {"tasche_links": "query.property('fynn:taschen') >= 1"},
                                     {"tasche_rechts": "query.property('fynn:taschen') >= 2"}]
    return {"format_version": "1.8.0", "render_controllers": {f"controller.render.fynn.{t['id']}": steuer}}


# ------------------------------------------------------------ Zusammenbau

def baue(t, bilder=None):
    name = t["id"]
    modell = getattr(g, f"{t['gestalt']}_modell")()
    maler = getattr(g, f"{t['gestalt']}_maler")
    geo = modell.geometrie()
    schreibe(RES / "models" / "entity" / f"tier_{name}.geo.json", geo)

    texturen = {}
    namen = [v for v, _ in t["varianten"]] + ([babyhaut(t)] if babyhaut(t) else [])
    for v in namen:
        # Jungtiere: eigene Haut mit grossen, glaenzenden Augen. Wer keine
        # eigene Jungtierfarbe hat, nimmt die der ersten Variante.
        g.JUNG = v == babyhaut(t)
        bild = modell.male(maler(t.get("baby_textur") or t["varianten"][0][0] if g.JUNG else v))
        g.JUNG = False
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
            baby = v == babyhaut(t)
            werte = {"q.is_baby": 1.0 if baby else 0.0,
                     "q.variant": float(next((i for i, (n, _) in enumerate(t["varianten"]) if n == v), 0)),
                     "q.is_in_water": 1.0}
            anims = [(a, 1.0) for k, a in eigene.items() if k.endswith((".teile", ".jung")) and
                     (not k.endswith(".jung") or baby)]
            nr = int(werte["q.variant"])
            if not baby and nr in t.get("variante_gross", {}):
                anims += [(a, 1.0) for k, a in eigene.items() if k.endswith(f".gross{nr}")]
            if t.get("riese"):
                anims.append(({"loop": True, "bones": {"saenfte": {"scale": 0.0}}}, 1.0))
            if t.get("reiten"):
                # Im Spiel blendet die Darstellung Sattel und Taschen aus,
                # solange keine da sind - hier dasselbe von Hand.
                anims.append(({"loop": True, "bones": {k: {"scale": 0.0} for k in
                                                        ("sattel", "tasche_links", "tasche_rechts")}}, 1.0))
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
          f"{sum(1 for t in TIERE if t['art'] in ('fisch', 'wal'))} im Wasser, "
          f"{sum(1 for t in TIERE if t['art'] == 'vogel')} in der Luft")
    if bilder is not None:
        vorschau(bilder, sys.argv[sys.argv.index("--bilder") + 1])


if __name__ == "__main__":
    main()
