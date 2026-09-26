#!/usr/bin/env python3
"""Baut das Licht: Sonne, Himmel, Lichtstrahlen, Wasser, Fackeln, Blaetter.

Fynn: "eine Art Shader mit schickem Schattenwurf und schoenen
Lichtveraenderungen, schicker Sonnenaufgang ... Animationen von Baeumen,
also diesen Blaettern. Diese Lichtstrahlen."

Echte Shader - eigene Grafikprogramme - kann ein Paket in Bedrock nicht
mehr mitbringen, und auf dem iPad schon gar nicht. Der offizielle Weg ist
Mojangs "Vibrant Visuals" (Lebendige Grafik): gerichtetes Sonnenlicht mit
Schatten, Nebel, durch den Licht faellt, Wasserwellen, Leuchten. Ein Paket
darf all das in JSON-Dateien einstellen, fuer jede Tageszeit mit
Schluesselwerten (Zeit 0 = Mittag, 0.25 = Sonnenuntergang, 0.5 = Mitternacht,
0.75 = Sonnenaufgang). Dieses Werkzeug schreibt diese Dateien.

Was es tut:

* Licht (lighting): warmes Weiss am Mittag, Gold am Nachmittag, tiefes
  Orange und Rot bei Sonnenauf- und -untergang, blaues Mondlicht. Die
  Sonne laeuft 20 Grad schraeg ueber den Himmel - so fallen die Schatten
  den ganzen Tag lang schraeg und lang, statt mittags senkrecht unter den
  Dingen zu verschwinden.
* Himmel (atmospherics): kraeftigere Farben am Horizont, ein Leuchten um
  die Sonne, wenn sie tief steht, ein Schimmer um den Mond.
* Lichtstrahlen: ein duenner Dunst in der Luft (volumetrischer Nebel), in
  den Taelern dichter als oben, der das Licht nach vorn streut. Durch
  Baeume und Fenster fallen dann sichtbare Strahlen.
* Farbstimmung (color_grading): etwas mehr Kontrast und Farbe, warme
  Lichter, kuehle Schatten.
* Wasser: echte Wellen und Lichtmuster am Grund.
* Fackeln, Laternen, Lagerfeuer und unser Feuerkasten werden zu Lichtern,
  die selbst Schatten werfen.
* Blaetter und Gras bewegen sich im Wind: Ihre Bilder sind jetzt kleine
  Filme (flipbook), in denen die Blaetter hin und her rascheln.

Wie es in die Welt kommt: Seit 1.21.90 hat jede Landschaft (plains, forest
...) eine eigene Datei, die sagt, welches Licht, welcher Himmel, welcher
Nebel gilt. Unsere Einstellungen tragen den Namensraum "fynn:", und das
Werkzeug schreibt fuer jede Oberwelt-Landschaft Mojangs Datei mit unseren
Namen neu. Nether und End bleiben, wie sie sind. Wo Mojang einer
Landschaft eine eigene Stimmung gibt (Wueste, Sumpf, Dschungel ...),
bleibt deren Himmel und Farbe; nur die Sonne laeuft ueberall gleich
schraeg, denn das muss sie - schraege und gerade Sonne lassen sich beim
Uebergang zwischen Landschaften nicht mischen.

Die Vorlagen stehen in werkzeuge/mojang/vv (aus Mojangs bedrock-samples).

    python3 werkzeuge/licht_bauen.py
"""

import copy
import json
import math
import re
import shutil
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from dolche_bauen import schreibe       # noqa: E402

WERKZEUGE = Path(__file__).resolve().parent
WURZEL = WERKZEUGE.parent
RES = WURZEL / "ressourcenpaket"
VV = WERKZEUGE / "mojang" / "vv"

# Nether und End: dort gibt es keine Sonne, und ihre Stimmung ist gewollt.
NICHT_OBERWELT = {"hell", "crimson_forest", "warped_forest", "soulsand_valley", "basalt_deltas", "the_end"}

SCHRAEGE_SONNE = 20.0     # Grad; muss in allen Licht-Dateien gleich sein


def lade(pfad):
    text = Path(pfad).read_text(encoding="utf-8")
    text = re.sub(r"^\s*//.*$", "", text, flags=re.M)
    return json.loads(text)


# ------------------------------------------------------------ Licht

SONNENFARBE = {
    "0.00": [255, 244, 229],      # Mittag: warmes Weiss
    "0.15": [255, 224, 176],      # Nachmittag: Gold
    "0.21": [255, 176, 96],       # goldene Stunde
    "0.245": [255, 116, 44],      # die Sonne beruehrt den Horizont
    "0.27": [255, 84, 62],        # rot
    "0.30": [255, 122, 140],      # Daemmerung, rosa
    "0.70": [255, 122, 140],
    "0.73": [255, 92, 56],
    "0.755": [255, 126, 48],
    "0.79": [255, 180, 100],
    "0.85": [255, 224, 176],
    "1.00": [255, 244, 229],
}


def licht_tag():
    vorlage = lade(VV / "lighting" / "global.json")
    l = copy.deepcopy(vorlage)
    s = l["minecraft:lighting_settings"]
    s["description"]["identifier"] = "fynn:licht_tag"
    bahn = s["directional_lights"]["orbital"]
    bahn["sun"]["color"] = SONNENFARBE
    # Mittags etwas heller - dann leuchtet, was hell ist.
    bahn["sun"]["illuminance"] = {k: (v * 1.15 if v >= 50 else v) for k, v in bahn["sun"]["illuminance"].items()}
    bahn["moon"]["color"] = {"0.0": [150, 176, 255], "1.0": [150, 176, 255]}
    bahn["moon"]["illuminance"] = {k: (0.55 if v > 0 else 0.0) for k, v in bahn["moon"]["illuminance"].items()}
    bahn["orbital_offset_degrees"] = SCHRAEGE_SONNE
    # Das Himmelslicht in den Schatten leicht blau: kuehle Schatten neben
    # warmer Sonne, der Kontrast macht die Szene.
    s["ambient"] = {"color": "#E4ECFF", "illuminance": 0.025}
    l["format_version"] = "1.21.80"
    return l


def licht_kopie(datei):
    """Mojangs Licht fuer eine besondere Landschaft - nur mit schraeger Sonne."""
    l = lade(datei)
    s = l["minecraft:lighting_settings"]
    alt = s["description"]["identifier"].split(":")[1]
    s["description"]["identifier"] = f"fynn:licht_{alt}"
    s.setdefault("directional_lights", {}).setdefault("orbital", {})["orbital_offset_degrees"] = SCHRAEGE_SONNE
    return l, f"minecraft:{alt}", f"fynn:licht_{alt}"


# ------------------------------------------------------------ Himmel

def himmel():
    a = lade(VV / "atmospherics" / "atmospherics.json")
    s = a["minecraft:atmosphere_settings"]
    s["description"]["identifier"] = "fynn:himmel"
    s["sky_horizon_color"] = {
        "0.00": [170, 200, 235], "0.17": [196, 206, 222], "0.215": [255, 192, 142],
        "0.24": [255, 142, 92], "0.26": [250, 112, 120], "0.285": [172, 110, 172],
        "0.33": [72, 82, 142], "0.50": [26, 34, 72], "0.67": [72, 82, 142],
        "0.715": [176, 112, 172], "0.74": [250, 116, 110], "0.76": [255, 152, 96],
        "0.785": [255, 202, 152], "0.83": [196, 206, 222], "1.00": [170, 200, 235],
    }
    s["sky_zenith_color"] = {
        "0.00": [66, 118, 204], "0.20": [78, 114, 192], "0.26": [58, 68, 132],
        "0.33": [20, 24, 56], "0.50": [8, 10, 28], "0.67": [20, 24, 56],
        "0.74": [58, 68, 132], "0.80": [78, 114, 192], "1.00": [66, 118, 204],
    }
    # Ein Leuchten um die Sonne, am staerksten, wenn sie tief steht.
    s["sun_mie_strength"] = {"0.0": 0.15, "0.20": 0.3, "0.25": 1.0, "0.30": 0.2,
                             "0.70": 0.2, "0.75": 1.0, "0.80": 0.3, "1.0": 0.15}
    s["sun_glare_shape"] = {"0.0": 0.03, "0.25": 0.09, "0.40": 0.0, "0.60": 0.0,
                            "0.75": 0.09, "1.0": 0.03}
    s["moon_mie_strength"] = {"0.0": 0.0, "0.35": 0.0, "0.50": 0.35, "0.65": 0.0, "1.0": 0.0}
    return a


# ------------------------------------------------------------ Farbe

def farbe():
    return {
        "format_version": "1.21.90",
        "minecraft:color_grading_settings": {
            "description": {"identifier": "fynn:farbe"},
            "color_grading": {
                "midtones": {"contrast": [1.18] * 3, "gain": [1.0] * 3, "gamma": [2.2] * 3,
                             "offset": [0.0] * 3, "saturation": [1.12] * 3},
                # Warme Lichter, kuehle Schatten
                "highlights": {"enabled": True, "highlightsMin": 1.5, "contrast": [1.0] * 3,
                               "gain": [1.03, 1.0, 0.96], "gamma": [2.2] * 3, "offset": [0.0] * 3,
                               "saturation": [1.08] * 3},
                "shadows": {"enabled": True, "shadowsMax": 0.3, "contrast": [1.0] * 3,
                            "gain": [0.97, 0.99, 1.04], "gamma": [2.2] * 3, "offset": [0.0] * 3,
                            "saturation": [1.05] * 3},
                "temperature": {"enabled": True, "temperature": 6100, "type": "color_temperature"},
            },
            # Derselbe Tonwert-Operator wie bei Mojang: Verschiedene lassen
            # sich beim Uebergang zwischen Landschaften nicht mischen.
            "tone_mapping": {"operator": "generic"},
        },
    }


# ------------------------------------------------------------ Wasser

def wasser():
    w = lade(VV / "water" / "water.json")
    s = w["minecraft:water_settings"]
    s["description"]["identifier"] = "fynn:wasser"
    s["particle_concentrations"] = {"chlorophyll": 0.3, "suspended_sediment": 1.0, "cdom": 0.2}
    s["caustics"] = {"enabled": True, "frame_length": 0.08, "scale": 0.5, "power": 2}
    s["waves"] = {"enabled": True, "frequency": 1.0, "octaves": 16, "depth": 0.6, "speed": 1.2,
                  "shape": 1.6, "pull": 0.35, "mix": 0.25, "frequency_scaling": 1.2,
                  "speed_scaling": 1.03, "direction_increment": 25.0}
    s["biome_water_color_contribution"] = 0.3
    w["format_version"] = "1.26.0"
    return w


# ------------------------------------------------------------ Nebel

# Duenner Dunst, unten im Tal dichter als auf den Bergen, der das Licht
# nach vorn streut (Henyey-Greenstein g nahe 1): Schaut man zur Sonne,
# leuchtet er; faellt Licht durch Luecken im Laub, sieht man die Strahlen.
#
# Die Groessenordnung ist Mojangs: Wo ihre Landschaften Dunst haben (Strand,
# Taiga, Dschungel), steht max_density 0.05 und scattering 0.04 bis 0.06.
# Viele haben gar keinen (Ebene, Blumenwald, Wueste: 0.0) - dort gibt es
# darum auch keine Strahlen. Jetzt ueberall ein wenig, und staerker nach
# vorn gestreut (g 0.75 statt oft 0.4 bis 0.6), damit die Strahlen zur
# Sonne hin sichtbar werden.
DUNST = {
    "density": {
        "air": {"max_density": 0.06, "uniform": False, "zero_density_height": 200, "max_density_height": 62},
        "weather": {"max_density": 0.12, "uniform": True},
    },
    "media_coefficients": {
        "air": {"scattering": [0.05, 0.05, 0.05], "absorption": [0.0, 0.0, 0.0]},
    },
    "henyey_greenstein_g": {"air": {"henyey_greenstein_g": 0.75}},
}


def nebel(vanilla_id):
    """Mojangs Nebel einer Landschaft mit unserem Dunst. Hat die Landschaft
    schon eigenen Dunst, bleibt dessen Dichte; nur das Streuen nach vorn
    wird kraeftiger."""
    name = vanilla_id.split(":")[1]
    datei = None
    for f in (VV / "fogs").glob("*.json"):
        d = lade(f)
        if d["minecraft:fog_settings"]["description"]["identifier"] == vanilla_id:
            datei = d
            break
    if datei is None:
        return None, None
    s = datei["minecraft:fog_settings"]
    s["description"]["identifier"] = f"fynn:{name}"
    eigen = s.get("volumetric", {})
    streut = max(eigen.get("media_coefficients", {}).get("air", {}).get("scattering", [0.0])) if eigen else 0.0
    if streut > 0:
        eigen.setdefault("henyey_greenstein_g", {})["air"] = {"henyey_greenstein_g": max(
            0.72, eigen.get("henyey_greenstein_g", {}).get("air", {}).get("henyey_greenstein_g", 0.0))}
        s["volumetric"] = eigen
    else:
        s["volumetric"] = copy.deepcopy(DUNST)
    datei["format_version"] = "1.21.90"
    return datei, f"fynn:{name}"


# ------------------------------------------------------------ Fackeln

LICHTER = {
    "minecraft:torch": ("#FFB060", "point_light"),
    "minecraft:wall_torch": ("#FFB060", "point_light"),
    "minecraft:lantern": ("#FFC070", "point_light"),
    "minecraft:soul_torch": ("#70D8FF", "point_light"),
    "minecraft:soul_lantern": ("#70D8FF", "point_light"),
    "minecraft:campfire": ("#FF9040", "point_light"),
    "minecraft:soul_campfire": ("#70D8FF", "point_light"),
    "minecraft:lit_pumpkin": ("#FFA040", "point_light"),
    "minecraft:redstone_torch": ("#FF4020", "point_light"),
    "minecraft:glowstone": ("#FFD890", "static_light"),
    "minecraft:sea_lantern": ("#CFF0FF", "static_light"),
    "minecraft:shroomlight": ("#FFB070", "static_light"),
    # Unsere: Feuerkasten und Schmelztiegel gluehen orange, die Altaere
    # schimmern kuehl.
    "fynn:feuerkasten": ("#FF8A3A", "point_light"),
    "fynn:schmelztiegel": ("#FF7A30", "point_light"),
    "fynn:rollenaltar": ("#B8C8FF", "static_light"),
    "fynn:tempelaltar": ("#B8C8FF", "static_light"),
}


def fackeln():
    return {"format_version": "1.21.120", "minecraft:local_light_settings": {
        block: {"light_color": farbe_, "light_type": art} for block, (farbe_, art) in LICHTER.items()}}


# ------------------------------------------------------------ Blaetter

BLAETTER = ["leaves_oak", "leaves_spruce", "leaves_birch", "leaves_jungle", "leaves_acacia",
            "leaves_big_oak", "azalea_leaves", "azalea_leaves_flowers", "mangrove_leaves",
            "cherry_leaves", "pale_oak_leaves", "orange_poplar_leaves", "red_poplar_leaves",
            "yellow_poplar_leaves"]
GRAS = ["tallgrass", "fern"]
BILDER = 8                  # Einzelbilder je Film
TICKS = 6                   # 0.3 Sekunden je Bild, ueberblendet


def quelle(name):
    for endung in (".tga", ".png"):
        p = VV / "blaetter" / (name + endung)
        if p.exists():
            return p
    return None


def rascheln(bild, bild_nr, gras=False):
    """Ein Einzelbild des Films: Jeder Pixel holt seine Farbe ein kleines
    Stueck versetzt, wie Laub, das sich im Wind bewegt. Versetzt wird mit
    Umbruch am Rand - so bleibt das Bild kachelbar, und Blaetter von
    Nachbarbloecken passen weiter aneinander.

    Beim Gras bleibt der Fuss stehen, nur die Spitzen wiegen sich."""
    w, h = bild.size
    phase = 2 * math.pi * bild_nr / BILDER
    neu = Image.new("RGBA", (w, h))
    for y in range(h):
        for x in range(w):
            if gras:
                hoehe = 1.0 - y / (h - 1)                  # oben 1, unten 0
                dx = round(1.4 * hoehe * math.sin(phase + x * 0.25))
                dy = 0
            else:
                # Buendel von Blaettern bewegen sich zusammen: die Welle
                # laeuft schraeg durchs Bild, dazu ein zweiter, langsamer Takt.
                # Langsame Wellen (kleine Faktoren bei x und y): Ganze
                # Buendel ruecken gemeinsam um einen Pixel. Mit schnelleren
                # Wellen wurde das Laub in jedem Bild neu durchmischt und
                # flimmerte, statt zu rascheln.
                dx = round(0.8 * math.sin(phase + y * 0.35 + x * 0.15))
                dy = round(0.5 * math.sin(phase + x * 0.3 + 1.3))
            neu.putpixel((x, y), bild.getpixel(((x - dx) % w, (y - dy) % h)))
    return neu


def film(pfad, gras):
    bild = Image.open(pfad).convert("RGBA")
    w, h = bild.size
    streifen = Image.new("RGBA", (w, h * BILDER))
    for i in range(BILDER):
        streifen.paste(rascheln(bild, i, gras), (0, i * h))
    return streifen


def blaetter():
    """Schreibt die Filme samt passender Materialkarten und die Liste
    flipbook_textures.json."""
    terrain = lade(VV / "terrain_texture.json")["texture_data"]
    eintraege = lade(VV / "flipbook_textures.json")
    ziel = RES / "textures" / "blocks"
    ziel.mkdir(parents=True, exist_ok=True)
    neu = 0
    for name in BLAETTER + GRAS:
        farbbild = quelle(name)
        if not farbbild:
            continue
        gras = name in GRAS
        film(farbbild, gras).save(ziel / (name + farbbild.suffix))
        # Die Materialkarte (Metall, Leuchten, Rauheit, Durchscheinen) muss
        # sich genauso bewegen, sonst sitzt das Durchscheinen am falschen Blatt.
        karte = quelle(name + "_mers")
        if karte:
            film(karte, gras).save(ziel / (name + "_mers" + karte.suffix))
        satz = VV / "blaetter" / (name + ".texture_set.json")
        if satz.exists():
            shutil.copy(satz, ziel / satz.name)
        # Jede Kachel, die dieses Bild zeigt, bekommt den Film.
        for kachel, eintrag in terrain.items():
            bilder = eintrag.get("textures")
            if isinstance(bilder, str):
                bilder = [bilder]
            if not isinstance(bilder, list):
                continue
            for i, b in enumerate(bilder):
                if (b if isinstance(b, str) else b.get("path")) != f"textures/blocks/{name}":
                    continue
                e = {"flipbook_texture": f"textures/blocks/{name}", "atlas_tile": kachel,
                     "ticks_per_frame": TICKS, "blend_frames": True}
                if len(bilder) > 1:
                    e["atlas_index"] = i
                eintraege.append(e)
                neu += 1
    # Mojangs Eintraege stehen mit drin (Feuer, Wasser, Lava ...): Ob das
    # Spiel die Listen mehrerer Pakete zusammenlegt oder die oberste nimmt,
    # ist nirgends beschrieben - so geht keine Animation verloren.
    schreibe(RES / "textures" / "flipbook_textures.json", eintraege)
    return neu


# ------------------------------------------------------------ Landschaften

def main():
    for ordner in ("lighting", "atmospherics", "color_grading", "water", "fogs", "biomes",
                   "local_lighting", "shadows"):
        if (RES / ordner).exists():
            shutil.rmtree(RES / ordner)

    schreibe(RES / "lighting" / "fynn_tag.json", licht_tag())
    licht = {"minecraft:default_lighting": "fynn:licht_tag"}
    for datei in sorted((VV / "lighting").glob("*.json")):
        if datei.name in ("global.json", "nether_lighting.json", "end_lighting.json"):
            continue
        l, alt, neu = licht_kopie(datei)
        schreibe(RES / "lighting" / f"fynn_{datei.name}", l)
        licht[alt] = neu
    schreibe(RES / "atmospherics" / "fynn_himmel.json", himmel())
    schreibe(RES / "color_grading" / "fynn_farbe.json", farbe())
    schreibe(RES / "water" / "fynn_wasser.json", wasser())
    schreibe(RES / "local_lighting" / "local_lighting.json", fackeln())
    # Weiche Schatten (Mojangs Voreinstellung, hier ausdruecklich).
    schreibe(RES / "shadows" / "global.json", {"format_version": "1.21.80",
                                               "minecraft:shadow_settings": {"shadow_style": "soft_shadows"}})

    nebel_neu = {}
    landschaften = 0
    for datei in sorted((VV / "biomes").glob("*.client_biome.json")):
        name = datei.name.split(".")[0]
        if name in NICHT_OBERWELT:
            continue
        d = lade(datei)
        k = d["minecraft:client_biome"]["components"]
        l_alt = k.get("minecraft:lighting_identifier", {}).get("lighting_identifier", "minecraft:default_lighting")
        k["minecraft:lighting_identifier"] = {"lighting_identifier": licht.get(l_alt, "fynn:licht_tag")}
        if k.get("minecraft:atmosphere_identifier", {}).get("atmosphere_identifier",
                                                           "minecraft:default_atmospherics") == "minecraft:default_atmospherics":
            k["minecraft:atmosphere_identifier"] = {"atmosphere_identifier": "fynn:himmel"}
        if k.get("minecraft:color_grading_identifier", {}).get("color_grading_identifier",
                                                               "minecraft:default_color_grading") == "minecraft:default_color_grading":
            k["minecraft:color_grading_identifier"] = {"color_grading_identifier": "fynn:farbe"}
        if k.get("minecraft:water_identifier", {}).get("water_identifier",
                                                       "minecraft:default_water") == "minecraft:default_water":
            k["minecraft:water_identifier"] = {"water_identifier": "fynn:wasser"}
        nebel_alt = k.get("minecraft:fog_appearance", {}).get("fog_identifier")
        if nebel_alt:
            if nebel_alt not in nebel_neu:
                n, kennung = nebel(nebel_alt)
                if n:
                    schreibe(RES / "fogs" / f"fynn_{nebel_alt.split(':')[1]}.json", n)
                nebel_neu[nebel_alt] = kennung
            if nebel_neu[nebel_alt]:
                k["minecraft:fog_appearance"] = {"fog_identifier": nebel_neu[nebel_alt]}
        schreibe(RES / "biomes" / datei.name, d)
        landschaften += 1

    filme = blaetter()
    print(f"gebaut: Licht fuer {landschaften} Landschaften, {len(licht)} Lichtstimmungen, "
          f"{sum(1 for v in nebel_neu.values() if v)} Nebel mit Dunst, {filme} Blatt- und Grasfilme")


if __name__ == "__main__":
    main()
