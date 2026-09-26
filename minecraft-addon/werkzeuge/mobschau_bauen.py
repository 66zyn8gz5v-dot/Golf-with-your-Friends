#!/usr/bin/env python3
"""Die Mob-Schau der Pixelschmiede: alle Mobs des Sternenpakets zum Ansehen.

Fynn: "Wir brauchen eine neue Kategorie und zwar Mobs. Dass wir da eine
kleine Anschau kriegen an die Mobs, die wir entwickelt haben."

Die Pixelschmiede ist eine einzelne Seite ohne Server. Deshalb muss alles,
was die Schau zeigt, in der Seite selbst stehen: die Modelle, die Texturen
als eingebettete Bilder und die Animationen. Dieses Werkzeug sammelt das aus
dem Ressourcen- und dem Verhaltenspaket ein und schreibt es zwischen die
Marken MOBSCHAU:DATEN in werkzeuge/pixelschmiede.html.

Die Animationen stehen im Paket als Molang-Formeln. Die Seite rechnet sie
nicht selbst aus. Dieses Werkzeug uebersetzt sie beim Bauen in
JavaScript-Funktionen. So laufen die Tiere in der Schau mit genau den
Bewegungen, die sie im Spiel haben, und die Seite braucht kein eval.

    python3 werkzeuge/mobschau_bauen.py
"""

import base64
import json
import re
import sys
from pathlib import Path

HIER = Path(__file__).resolve().parent
sys.path.insert(0, str(HIER))
import tiere_bauen                     # noqa: E402
import banditen_bauen                  # noqa: E402

WURZEL = HIER.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"
SEITE = HIER / "pixelschmiede.html"
ANFANG = "/* MOBSCHAU:DATEN:ANFANG */"
ENDE = "/* MOBSCHAU:DATEN:ENDE */"


# ------------------------------------------------------ Molang -> JavaScript

def js_ausdruck(wert, achse=0):
    """Eine Molang-Formel als JavaScript-Ausdruck.

    Q haelt die Abfragen (query), V die Variablen, M die Mathematik in Grad
    wie in Molang, P die Eigenschaften (query.property). Unbekanntes wird zu
    0 - wie im Spiel, wo eine fehlende Variable auch 0 ist. "this" ist der
    Wert dieser Achse vor der Animation; er kommt als H[achse] herein - der
    Bogen des Wilderers zieht damit die Grundhaltung wieder ab."""
    if isinstance(wert, bool):
        return "1" if wert else "0"
    if isinstance(wert, (int, float)):
        return repr(float(wert))
    s = str(wert).strip().rstrip(";").strip()
    s = re.sub(r"\bthis\b", f"H[{achse}]", s)
    s = re.sub(r"\bq\.", "query.", s)
    s = re.sub(r"\bv\.", "variable.", s)
    s = re.sub(r"\bt\.", "temp.", s)
    s = re.sub(r"\bc\.", "context.", s)
    s = re.sub(r"query\.property\(\s*'([^']*)'\s*\)", r'P("\1")', s)
    s = re.sub(r"math\.(\w+)", r"M.\1", s)
    s = re.sub(r"query\.(\w+)", r"(Q.\1||0)", s)
    s = re.sub(r"variable\.(\w+)", r"(V.\1||0)", s)
    s = re.sub(r"temp\.(\w+)", r"(V.t_\1||0)", s)
    s = re.sub(r"context\.(\w+)", "0", s)
    if re.search(r"[A-Za-z_]\w*\.", s.replace("M.", "").replace("Q.", "").replace("V.", "")):
        raise ValueError(f"unbekannter Name in Molang: {wert!r}")
    return f"({s})"


def js_anweisungen(zeilen):
    """Eine Liste von Molang-Anweisungen ("variable.x = ...;") als Funktionsrumpf."""
    aus = []
    for zeile in zeilen:
        for teil in str(zeile).split(";"):
            teil = teil.strip()
            if not teil:
                continue
            m = re.match(r"^(?:variable|v)\.(\w+)\s*=(?!=)(.*)$", teil)
            if m:
                aus.append(f"V.{m.group(1)}={js_ausdruck(m.group(2))};")
            else:
                aus.append(js_ausdruck(teil) + ";")
    return "".join(aus)


def fn(ausdruck):
    return "function(Q,V,M,P,H){return " + ausdruck + "}"


def kanal_js(kanal):
    """Ein Animationskanal: ein Wert fuer alle drei Achsen oder drei eigene."""
    if isinstance(kanal, dict):
        raise ValueError("Schluesselbilder kommen in den Mob-Animationen nicht vor")
    if not isinstance(kanal, list):
        kanal = [kanal, kanal, kanal]
    return fn("[" + ",".join(js_ausdruck(w, i) for i, w in enumerate(kanal)) + "]")


def animation_js(anim):
    teile = []
    if "anim_time_update" in anim:
        teile.append("t:" + fn(js_ausdruck(anim["anim_time_update"])))
    if anim.get("animation_length"):
        teile.append(f"len:{float(anim['animation_length'])}")
    if anim.get("loop") is True:
        teile.append("loop:1")
    knochen = []
    for name, kanaele in anim.get("bones", {}).items():
        eintraege = []
        for kurz, lang in (("r", "rotation"), ("p", "position"), ("s", "scale")):
            if lang in kanaele:
                eintraege.append(f"{kurz}:{kanal_js(kanaele[lang])}")
        knochen.append(json.dumps(name.lower()) + ":{" + ",".join(eintraege) + "}")
    teile.append("bones:{" + ",".join(knochen) + "}")
    return "{" + ",".join(teile) + "}"


# Mojangs eigene Schrittbewegung fuer Vierbeiner. Der Glimmerling benutzt
# sie, sie steht aber nicht im Paket - das Spiel bringt sie mit.
VANILLE = {
    "animation.quadruped.walk": {
        "anim_time_update": "query.modified_distance_moved", "loop": True,
        "bones": {
            "leg0": {"rotation": ["math.cos(query.anim_time * 38.17) * 80.0", 0.0, 0.0]},
            "leg1": {"rotation": ["math.cos(query.anim_time * 38.17 + 180) * 80.0", 0.0, 0.0]},
            "leg2": {"rotation": ["math.cos(query.anim_time * 38.17 + 180) * 80.0", 0.0, 0.0]},
            "leg3": {"rotation": ["math.cos(query.anim_time * 38.17) * 80.0", 0.0, 0.0]},
        }},
}


# ------------------------------------------------------------ Einlesen

def lade(pfad):
    return json.loads(Path(pfad).read_text(encoding="utf-8"))


ALLE_ANIMATIONEN = {}
for datei in sorted((RES / "animations").glob("*.json")):
    ALLE_ANIMATIONEN.update(lade(datei).get("animations", {}))
ALLE_ANIMATIONEN.update(VANILLE)

RENDER = {}
for datei in sorted((RES / "render_controllers").glob("*.json")):
    RENDER.update(lade(datei).get("render_controllers", {}))

GEOMETRIEN = {}
for datei in sorted((RES / "models" / "entity").glob("*.geo.json")):
    for g in lade(datei).get("minecraft:geometry", []):
        GEOMETRIEN[g["description"]["identifier"]] = g


def geometrie_daten(ident):
    """Knochen und Kaesten, knapp als Listen - die Seite baut die Flaechen."""
    g = GEOMETRIEN[ident]
    d = g["description"]
    namen = [b["name"].lower() for b in g["bones"]]
    knochen = []
    for b in g["bones"]:
        eltern = b.get("parent", "").lower()
        kaesten = []
        for c in b.get("cubes", []):
            uv = c.get("uv", [0, 0])
            if not isinstance(uv, list):
                raise ValueError(f"{ident}: flaechenweises UV kommt bei den Mobs nicht vor")
            r = c.get("rotation", [0, 0, 0])
            p = c.get("pivot", [0, 0, 0])
            kaesten.append(list(c["origin"]) + list(c["size"]) + list(uv)
                           + [c.get("inflate", 0) or 0] + list(r) + list(p))
        knochen.append([b["name"].lower(), namen.index(eltern) if eltern in namen else -1,
                        b.get("pivot", [0, 0, 0]), b.get("rotation", [0, 0, 0]), kaesten])
    return {"tw": d.get("texture_width", 64), "th": d.get("texture_height", 64), "k": knochen}


def bild_daten(pfad):
    return "data:image/png;base64," + base64.b64encode(Path(pfad).read_bytes()).decode("ascii")


def biome_aus_spawnregel(ident):
    """Die Biom-Stichworte aus der Spawnregel, ohne die ausgeschlossenen."""
    kurz = ident.split(":")[1]
    for datei in (VER / "spawn_rules").glob("*.json"):
        d = lade(datei)["minecraft:spawn_rules"]
        if d["description"]["identifier"] != ident:
            continue
        gruppen = []
        for bedingung in d.get("conditions", []):
            filt = bedingung.get("minecraft:biome_filter", [])
            if isinstance(filt, dict):
                filt = [filt]
            stichworte = []

            def sammle(f):
                if isinstance(f, list):
                    for x in f:
                        sammle(x)
                elif isinstance(f, dict):
                    if f.get("test") == "has_biome_tag" and f.get("operator", "==") in ("==", "equals"):
                        stichworte.append(f["value"])
                    for schluessel in ("all_of", "any_of"):
                        if schluessel in f:
                            sammle(f[schluessel])
            sammle(filt)
            if stichworte:
                gruppen.append(stichworte)
        return gruppen
    return []


BIOME = {
    "taiga": "Taiga", "forest": "Wald", "extreme_hills": "Berge", "mountains": "Berge",
    "roofed": "Dunkelwald", "plains": "Ebene", "savanna": "Savanne", "jungle": "Dschungel",
    "swamp": "Sumpf", "mangrove_swamp": "Mangrovensumpf", "meadow": "Bergwiese", "grove": "Hain",
    "snowy_slopes": "Schneehänge", "frozen_peaks": "Eisgipfel", "jagged_peaks": "Zackengipfel",
    "ice_plains": "Eisebene", "ocean": "Ozean", "beach": "Strand", "river": "Fluss",
    "desert": "Wüste", "mesa": "Tafelberge", "birch": "Birkenwald", "flower_forest": "Blumenwald",
}
EIGENSCHAFT = {"frozen": "gefrorener", "cold": "kalter", "warm": "warmer", "lukewarm": "lauwarmer",
               "deep": "tiefer", "forest": "mit Wald"}


def biom_text(gruppen):
    namen = []
    for gruppe in gruppen:
        haupt = [g for g in gruppe if g in BIOME and not (g == "forest" and len(gruppe) > 1 and gruppe[0] != "forest")]
        zusatz = [g for g in gruppe if g not in haupt]
        if not haupt:
            continue
        name = BIOME[haupt[0]]
        vorne = [EIGENSCHAFT[z] for z in zusatz if z in EIGENSCHAFT and z != "forest"]
        if vorne:
            name = " ".join(vorne) + " " + name
        if "forest" in zusatz:
            name += " mit Wald"
        if name not in namen:
            namen.append(name)
    # "kalter Strand" sagt schon alles; ein nacktes "Strand" daneben waere doppelt.
    return [n for n in namen if not any(m != n and m.endswith(" " + n) for m in namen)]


# Namen fuer die Texturen, wo der Schluessel kein schoenes Wort ist.
VARIANTENNAME = {
    "prarie": "Prärie", "weiss": "Weiß", "weisser_hai": "Weißer Hai", "tigerhai": "Tigerhai",
    "hammerhai": "Hammerhai", "loewe": "Löwe", "loewin": "Löwin", "silberruecken": "Silberrücken",
    "junges": "Junges", "jungvogel": "Jungvogel", "altvogel": "Altvogel", "default": "Standard",
}

VERHALTEN = {"friedlich": "friedlich", "neutral": "wehrt sich", "feindlich": "greift an"}

# Wie ein Schalter heisst, der eine Abfrage im Modell setzt.
SCHALTER = {
    "is_saddled": "Sattel", "is_angry": "wütend", "fynn:riese": "Riese", "fynn:taschen": "Rucksäcke",
}


def gegenstandsname(ident):
    if ":" not in ident:
        ident = "minecraft:" + ident
    if ident.startswith("fynn:"):
        # Gegenstaende heissen item.*, Bloecke wie das Weidenroeschen tile.*.
        for zeile in (RES / "texts" / "de_DE.lang").read_text(encoding="utf-8").splitlines():
            if zeile.startswith((f"item.{ident}.name=", f"tile.{ident}.name=")):
                return zeile.split("=", 1)[1]
    return {
        "minecraft:honeycomb": "Honigwabe", "minecraft:sweet_berries": "Süßbeeren",
        "minecraft:salmon": "Lachs", "minecraft:cod": "Kabeljau", "minecraft:apple": "Apfel",
        "minecraft:carrot": "Karotte", "minecraft:potato": "Kartoffel", "minecraft:beetroot": "Rote Bete",
        "minecraft:wheat": "Weizen", "minecraft:beef": "Rindfleisch", "minecraft:mutton": "Hammelfleisch",
        "minecraft:porkchop": "Schweinefleisch", "minecraft:chicken": "Hühnchen", "minecraft:rabbit": "Kaninchen",
        "minecraft:melon_slice": "Melone", "minecraft:hay_block": "Heuballen", "minecraft:bamboo": "Bambus",
        "minecraft:melon_block": "Melonenblock", "minecraft:leather": "Leder", "minecraft:gold_nugget": "Goldklumpen",
        "minecraft:emerald": "Smaragd", "minecraft:arrow": "Pfeile", "minecraft:gold_ingot": "Goldbarren",
        "minecraft:birch_sapling": "Birkensetzling", "minecraft:spruce_sapling": "Fichtensetzling",
        "minecraft:oak_sapling": "Eichensetzling",
        "minecraft:prismarine_crystals": "Prismarinkristalle", "minecraft:ink_sac": "Tintenbeutel",
        "minecraft:feather": "Federn", "minecraft:dark_oak_sapling": "Schwarzeichensetzling",
    }.get(ident, ident.split(":")[1].replace("_", " "))


def mob_daten(kennung, entitaet_datei, gruppe, info):
    d = lade(RES / "entity" / entitaet_datei)["minecraft:client_entity"]["description"]
    ident = d["identifier"]
    geo_id = d["geometry"]["default"]
    texturen = d["textures"]
    skripte = d.get("scripts", {})

    # Welche Textur ist welche Variante? Der Steuerplan sagt es: das Feld
    # Array.haut in der Reihenfolge von query.variant, dazu die Textur fuer
    # Jungtiere.
    steuer = RENDER.get((d.get("render_controllers") or [""])[0], {})
    reihe = [t.split(".", 1)[1] for t in steuer.get("arrays", {}).get("textures", {}).get("Array.haut", [])]
    ausdruck = " ".join(steuer.get("textures", []))
    baby = re.search(r"query\.is_baby\s*\?\s*Texture\.(\w+)", ausdruck)
    baby = baby.group(1) if baby else None
    if not reihe:
        reihe = [k for k in texturen if k != baby]
    gewichte = dict(info.get("varianten", []))
    varianten = []
    for i, schluessel in enumerate(reihe):
        varianten.append({"n": VARIANTENNAME.get(schluessel, schluessel.replace("_", " ").capitalize()),
                          "b": bild_daten(RES / (texturen[schluessel] + ".png")),
                          "v": i, "w": gewichte.get(schluessel)})
    if baby:
        varianten.append({"n": VARIANTENNAME.get(baby, baby.capitalize()),
                          "b": bild_daten(RES / (texturen[baby] + ".png")), "v": 0, "baby": 1})

    sichtbar = []
    for eintrag in steuer.get("part_visibility", []):
        for knochen, bedingung in eintrag.items():
            if knochen == "*":
                continue
            sichtbar.append(json.dumps(knochen.lower()) + ":" + fn(js_ausdruck(bedingung)))

    animationen = {}
    for kurz, voll in d.get("animations", {}).items():
        if voll in ALLE_ANIMATIONEN:
            animationen[kurz] = animation_js(ALLE_ANIMATIONEN[voll])
    ablauf = []
    for eintrag in skripte.get("animate", []):
        if isinstance(eintrag, str):
            eintrag = {eintrag: 1.0}
        for kurz, gewicht in eintrag.items():
            if kurz in animationen:
                ablauf.append("[" + json.dumps(kurz) + "," + fn(js_ausdruck(gewicht)) + "]")

    alles = " ".join([json.dumps(skripte), json.dumps(steuer.get("part_visibility", []))])
    schalter = []
    if "query.is_saddled" in alles:
        schalter.append("is_saddled")
    if "query.is_angry" in alles:
        schalter.append("is_angry")
    schalter += re.findall(r"query\.property\('([^']+)'\)", alles)

    teile = [
        f"id:{json.dumps(kennung)}", f"ident:{json.dumps(ident)}", f"gruppe:{json.dumps(gruppe)}",
        f"gross:{float(info.get('gross', 1.0))}",
        "info:" + json.dumps(info["steckbrief"], ensure_ascii=False),
        "geo:" + json.dumps(geometrie_daten(geo_id), separators=(",", ":")),
        "var:" + json.dumps(varianten, ensure_ascii=False, separators=(",", ":")),
        "anim:{" + ",".join(json.dumps(k) + ":" + v for k, v in animationen.items()) + "}",
        "ablauf:[" + ",".join(ablauf) + "]",
        "start:function(Q,V,M,P){" + js_anweisungen(skripte.get("initialize", [])) + "}",
        "vorher:function(Q,V,M,P){" + js_anweisungen(skripte.get("pre_animation", [])) + "}",
        "sicht:{" + ",".join(sichtbar) + "}",
        "schalter:" + json.dumps([[s, SCHALTER.get(s, s)] for s in dict.fromkeys(schalter)], ensure_ascii=False),
    ]
    return "{" + ",\n".join(teile) + "}"


# ------------------------------------------------------------ Steckbriefe

def zahl(wert):
    """Deutsch geschrieben: 3,5 statt 3.5."""
    return f"{wert:g}".replace(".", ",")


def steckbrief_tier(t):
    kol = t.get("kollision", (1, 1))
    zeilen = [
        ["Leben", f"{zahl(t['leben'] / 2)} Herzen"],
        ["Verhalten", VERHALTEN.get(t["verhalten"], t["verhalten"])
         + (f", {zahl(t['schaden'] / 2)} Herzen Schaden" if t.get("schaden") and t["verhalten"] != "friedlich" else "")],
        ["Größe", f"{zahl(kol[0])} × {zahl(kol[1])} Blöcke"],
    ]
    wo = biom_text(biome_aus_spawnregel(f"fynn:{t['id']}"))
    if wo:
        zeilen.append(["Lebt in", ", ".join(wo)])
    if t.get("futter"):
        zeilen.append(["Frisst", ", ".join(gegenstandsname(f) for f in t["futter"])])
    reiten = t.get("reiten")
    if reiten:
        zeilen.append(["Zähmen", ", ".join(dict.fromkeys(gegenstandsname(f) for f in reiten.get("zaehmen", [])[:3]))
                       + " – dann mit Sattel reitbar"])
    if t["id"] == "elefant":
        zeilen.append(["Selten", "Riesenelefant: mit Heuballen oder Melonen zähmen, "
                                 "mit dem Elefantensattel reiten – drei Plätze und eine Truhe"])
    beute = [gegenstandsname(b[0]) for b in t.get("beute", [])]
    if beute:
        zeilen.append(["Beute", ", ".join(dict.fromkeys(beute))])
    return {"name": t["name"][0], "en": t["name"][1], "zeilen": zeilen}


def steckbrief_bandit(b):
    zeilen = [
        ["Leben", f"{zahl(b['leben'] / 2)} Herzen"],
        ["Verhalten", f"greift an, {zahl(b['schaden'] / 2)} Herzen Schaden"],
        ["Waffe", gegenstandsname(b["waffe"])],
    ]
    wo = biom_text(biome_aus_spawnregel(f"fynn:{b['id']}"))
    if wo:
        zeilen.append(["Lebt in", ", ".join(wo)])
    if b["id"] == "bandenchef":
        zeilen.append(["Achtung", "ruft Verstärkung, wenn er halb besiegt ist"])
    zeilen.append(["Beute", ", ".join(dict.fromkeys(gegenstandsname(x[0]) for x in b["beute"]))])
    return {"name": b["name"][0], "en": b["name"][1], "zeilen": zeilen}


GRUPPE = {"land": "An Land", "amphib": "Am Wasser", "wal": "Im Wasser", "fisch": "Im Wasser",
          "vogel": "In der Luft"}


def alle_mobs():
    mobs = []
    for t in tiere_bauen.TIERE:
        mobs.append(mob_daten(t["id"], f"tier_{t['id']}.entity.json", GRUPPE.get(t["art"], "An Land"),
                              {"varianten": t["varianten"], "steckbrief": steckbrief_tier(t)}))
    for b in banditen_bauen.BANDITEN:
        mobs.append(mob_daten(b["id"], f"bandit_{b['id']}.entity.json", "Banditen",
                              {"steckbrief": steckbrief_bandit(b), "gross": b.get("gross", 1.0)}))
    mobs.append(mob_daten("ritter", "ritter.entity.json", "Weitere", {"steckbrief": {
        "name": "Ritter", "en": "Knight", "zeilen": [
            ["Leben", "15 Herzen"], ["Verhalten", "greift an, 2,5 Herzen Schaden"],
            ["Größe", "0,7 × 1,95 Blöcke"], ["Rüstung", "Ritterhelm, -brustpanzer, -beinschutz, -stiefel"]]}}))
    wo = biom_text(biome_aus_spawnregel("fynn:glimmerling"))
    mobs.append(mob_daten("glimmerling", "glimmerling.entity.json", "Weitere", {"steckbrief": {
        "name": "Glimmerling", "en": "Glimmerling", "zeilen": [
            ["Leben", "4 Herzen"], ["Verhalten", "friedlich, leuchtet im Dunkeln"],
            ["Größe", "0,7 × 0,95 Blöcke"]] + ([["Lebt in", ", ".join(wo)]] if wo else [])}}))
    return mobs


def main():
    mobs = alle_mobs()
    daten = "var MOBSCHAU = [\n" + ",\n".join(mobs) + "\n];"
    seite = SEITE.read_text(encoding="utf-8")
    a, e = seite.index(ANFANG), seite.index(ENDE)
    seite = seite[:a + len(ANFANG)] + "\n" + daten + "\n" + seite[e:]
    SEITE.write_text(seite, encoding="utf-8")
    print(f"Mob-Schau: {len(mobs)} Mobs, Daten {len(daten) // 1024} KB, Seite {len(seite) // 1024} KB")


if __name__ == "__main__":
    main()
