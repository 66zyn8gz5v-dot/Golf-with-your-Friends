#!/usr/bin/env python3
"""Was alle Bosse beim Bauen gemeinsam haben - gelernt an Sir Roland.

* ablauf(): eine Bewegung aus Schluesselposen, weich (Catmull-Rom), von der
  Grundhaltung des Bosses aus und zu ihr zurueck.
* steuerung(): die Animationssteuerung - ein Zustand "bereit" und je
  Angriff einer, gesteuert ueber die Eigenschaft fynn:angriff.
* skriptdaten(): die Zeiten der Angriffe fuer das Kampfskript, in Ticks.
* verhalten(): das Verhaltenspaket - dieselben Gruppen und Ereignisse wie
  bei Roland (Schutz, Staerke je Spielerzahl, Auftritt mit Sicherheitsuhr,
  Nahkampf, der sich waehrend eines Angriffs abschaltet). Die Namen der
  Ereignisse erwartet verhaltenspaket/scripts/boss_kern.js.
* aussehen(), steuerplan(): die Client-Datei mit zwei Haeuten je Phase.

Roland selbst ist vorher entstanden und hat seine eigenen Dateien; die
neuen Bosse bauen hierauf.
"""

import json
from pathlib import Path

from spawneier import ei_eintrag

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"


def schreibe(pfad, daten):
    pfad = Path(pfad)
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


# ============================================================ Bewegung

def grundpose(haltung, weitere=()):
    """Die Grundhaltung als volle Pose: je Knochen Drehung und Verschiebung."""
    pose = {k: {"rotation": list(v), "position": [0.0, 0.0, 0.0]} for k, v in haltung.items()}
    for k in weitere:
        pose.setdefault(k, {"rotation": [0.0, 0.0, 0.0], "position": [0.0, 0.0, 0.0]})
    return pose


def ablauf(grund, laenge, bilder, linear=(), spruenge=(), zurueck=True):
    """Eine Bewegung aus Schluesselposen. bilder: [(zeit, {knochen: drehung
    oder {"rotation": .., "position": .., "scale": ..}})]. Was eine Pose
    nicht nennt, bleibt wie in der Pose davor. Anfang (und, wenn zurueck,
    Ende) ist die Grundhaltung. linear: Knochen, die gleichmaessig laufen;
    spruenge: (zeit, knochen, kanal, vorher, nachher)."""
    kanaele = ("rotation", "position", "scale")
    null = {"rotation": [0.0] * 3, "position": [0.0] * 3, "scale": [1.0] * 3}

    def kopie(p):
        return {k: {kk: list(vv) for kk, vv in v.items()} for k, v in p.items()}
    start = {k: dict(null, **{kk: list(vv) for kk, vv in v.items()}) for k, v in grund.items()}
    folge = [(0.0, {})] + list(bilder)
    if zurueck:
        folge.append((laenge, {k: dict(v) for k, v in start.items()}))
    posen = []
    aktuell = kopie(start)
    for zeit, aenderung in folge:
        aktuell = kopie(aktuell)
        for knochen, wert in aenderung.items():
            eintrag = aktuell.setdefault(knochen, {k: list(v) for k, v in null.items()})
            if isinstance(wert, dict):
                for kanal in kanaele:
                    if kanal in wert:
                        eintrag[kanal] = list(wert[kanal]) if isinstance(wert[kanal], list) else [wert[kanal]] * 3
            else:
                eintrag["rotation"] = list(wert)
        posen.append((zeit, aktuell))
    knochen = {}
    for name in sorted({k for _, p in posen for k in p}):
        for kanal in kanaele:
            leer = null[kanal]
            werte = [(z, p.get(name, {}).get(kanal, leer)) for z, p in posen]
            if all(w == leer for _, w in werte):
                continue
            kurve = {}
            for z, w in werte:
                kurve[f"{z:.2f}"] = {"post": [round(float(x), 3) for x in w],
                                     "lerp_mode": "linear" if name in linear else "catmullrom"}
            for zeit, k, kan, vorher, nachher in spruenge:
                if k == name and kan == kanal:
                    kurve[f"{zeit:.2f}"] = {"pre": vorher, "post": nachher, "lerp_mode": "linear"}
            knochen.setdefault(name, {})[kanal] = kurve
    return {"animation_length": laenge, "bones": knochen}


def steuerung(name, angriffe, bereit_anims, zusatz=None, hiebe=None):
    """angriffe: {nr: kurzname}. bereit_anims: Liste wie in "animations".
    zusatz: {kurzname: [weitere Animationen in diesem Zustand]}.
    hiebe: Liste von Hieb-Animationen, die im Nahkampf reihum laufen."""
    zusatz = zusatz or {}
    wechsel = [{f"angriff_{nr}": f"query.property('fynn:angriff') == {nr}"} for nr in angriffe]
    zustaende = {"bereit": {"animations": bereit_anims, "transitions": list(wechsel), "blend_transition": 0.2}}
    if hiebe:
        zustaende["bereit"]["transitions"].append({"hieb": "variable.attack_time > 0.0"})
        zustaende["hieb"] = {
            "on_entry": [f"variable.hieb = math.mod(variable.hieb + 1, {len(hiebe)});"],
            "animations": [{h: f"variable.hieb == {i}"} for i, h in enumerate(hiebe)],
            "transitions": list(wechsel) + [{"bereit": "query.all_animations_finished"}],
            "blend_transition": 0.12,
        }
    for nr, kurz in angriffe.items():
        zustaende[f"angriff_{nr}"] = {
            "animations": [kurz] + zusatz.get(kurz, []),
            "transitions": [{"bereit": f"query.property('fynn:angriff') != {nr}"}],
            "blend_transition": 0.15,
        }
    return {"format_version": "1.10.0", "animation_controllers": {
        f"controller.animation.fynn.{name}.kampf": {"initial_state": "bereit", "states": zustaende}}}


def skriptdaten(angriffe, quelle):
    """angriffe: {kurz: (nr, laenge in s, {zeitname: s oder [s]})}."""
    daten = {}
    for kurz, (nr, laenge, zeiten) in angriffe.items():
        e = {"nr": nr, "laenge": round(laenge * 20)}
        for k, v in zeiten.items():
            e[k] = [round(x * 20) for x in v] if isinstance(v, list) else round(v * 20)
        daten[kurz] = e
    return (f"// Erzeugt von werkzeuge/{quelle} - nicht von Hand aendern.\n"
            "// Die Zeiten der Angriffe in Ticks, passend zu den Animationen.\n"
            f"export const ANGRIFFE = {json.dumps(daten, indent=4, ensure_ascii=False)};\n")


# ============================================================ Im Spiel

def aussehen(typ, name, animationen, praefix, groesse, ei, material="entity_emissive_alpha", skripte=None):
    anims = {k[len(praefix):]: k for k in animationen}
    anims["kampf"] = f"controller.animation.fynn.{name}.kampf"
    s = {"scale": str(groesse), "initialize": ["variable.hieb = 0;"], "animate": ["kampf"]}
    s.update(skripte or {})
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": typ,
        "materials": {"default": material},
        "textures": {"default": f"textures/entity/{name}", "entfesselt": f"textures/entity/{name}_entfesselt"},
        "geometry": {"default": f"geometry.fynn.{name}"},
        "animations": anims,
        "scripts": s,
        "render_controllers": [f"controller.render.fynn.{name}"],
        "spawn_egg": ei_eintrag(typ.split(":", 1)[1], ei),
    }}}


def steuerplan(name):
    return {"format_version": "1.8.0", "render_controllers": {f"controller.render.fynn.{name}": {
        "arrays": {"textures": {"Array.haut": ["Texture.default", "Texture.entfesselt"]}},
        "geometry": "Geometry.default",
        "materials": [{"*": "Material.default"}],
        "textures": ["Array.haut[query.property('fynn:phase') - 1]"],
    }}}


def staerke(grundleben, grundschaden, anzahl, mehr=6):
    n = max(1, min(mehr, anzahl))
    return round(grundleben * (1 + 0.5 * (n - 1))), round(grundschaden * (1 + 0.15 * (n - 1)), 1)


def verhalten(typ, familie, grundleben, grundschaden, kasten, teile, letzte_kraft=30, anzahl_angriffe=12,
              nahkampf=None, mehr=6, phase_zwei=None, zusatz_gruppen=None):
    """Das Verhaltenspaket eines Bosses. teile: die eigenen Komponenten
    (Bewegung, Navigation, Beute ...), dazu kommen die gemeinsamen."""
    spieler = {"all_of": [{"test": "is_family", "subject": "other", "value": "player"},
                          {"test": "has_ability", "subject": "other", "value": "instabuild", "operator": "!="}]}
    gruppen = {
        "fynn:nahkampf": nahkampf or {"minecraft:behavior.melee_box_attack": {
            "priority": 3, "speed_multiplier": 1.15, "track_target": True}},
        "fynn:verwundbar": {"minecraft:damage_sensor": {"triggers": [
            {"cause": "fall", "deals_damage": "no"},
            {"on_damage": {"filters": {"test": "is_family", "subject": "other", "value": familie[0]}},
             "deals_damage": "no"},
            {"on_damage": {"filters": {"test": "actor_health", "subject": "self", "operator": "<=",
                                       "value": letzte_kraft}}, "deals_damage": "no"},
        ]}},
        "fynn:unverwundbar": {"minecraft:damage_sensor": {"triggers": [{"cause": "all", "deals_damage": "no"}]}},
        "fynn:entfesselt": phase_zwei or {},
        "fynn:auftritt": {"minecraft:timer": {"time": 3.4, "looping": False,
                                              "time_down_event": {"event": "fynn:auftritt_fertig"}}},
    }
    gruppen.update(zusatz_gruppen or {})
    for n in range(1, mehr + 1):
        l, s = staerke(grundleben, grundschaden, n, mehr)
        gruppen[f"fynn:staerke_{n}"] = {"minecraft:health": {"value": l, "max": l}, "minecraft:attack": {"damage": s}}
    ereignisse = {
        "minecraft:entity_spawned": {"add": {"component_groups": ["fynn:unverwundbar", "fynn:staerke_1", "fynn:auftritt"]}},
        "fynn:auftritt_fertig": {"remove": {"component_groups": ["fynn:auftritt", "fynn:unverwundbar"]},
                                 "add": {"component_groups": ["fynn:verwundbar", "fynn:nahkampf"]}},
        "fynn:angriff_beginn": {"remove": {"component_groups": ["fynn:nahkampf"]}},
        "fynn:angriff_ende": {"add": {"component_groups": ["fynn:nahkampf"]}},
        "fynn:schutz_an": {"remove": {"component_groups": ["fynn:verwundbar"]},
                           "add": {"component_groups": ["fynn:unverwundbar"]}},
        "fynn:schutz_aus": {"remove": {"component_groups": ["fynn:unverwundbar"]},
                            "add": {"component_groups": ["fynn:verwundbar"]}},
        "fynn:entfesseln": {"add": {"component_groups": ["fynn:entfesselt"]}},
    }
    for n in range(1, mehr + 1):
        andere = [f"fynn:staerke_{m}" for m in range(1, mehr + 1) if m != n]
        ereignisse[f"fynn:staerke_{n}"] = {"remove": {"component_groups": andere},
                                           "add": {"component_groups": [f"fynn:staerke_{n}"]}}
    l, s = staerke(grundleben, grundschaden, 1, mehr)
    alle = {
        "minecraft:type_family": {"family": familie},
        "minecraft:boss": {"hud_range": 48, "should_darken_sky": False},
        "minecraft:collision_box": {"width": kasten[0], "height": kasten[1]},
        "minecraft:health": {"value": l, "max": l},
        "minecraft:attack": {"damage": s},
        "minecraft:physics": {},
        "minecraft:persistent": {},
        "minecraft:nameable": {},
        "minecraft:fire_immune": True,
        "minecraft:follow_range": {"value": 48, "max": 48},
        "minecraft:behavior.float": {"priority": 0},
        "minecraft:behavior.hurt_by_target": {"priority": 1},
        "minecraft:behavior.nearest_attackable_target": {
            "priority": 2, "must_see": False, "reselect_targets": True, "within_radius": 32,
            "entity_types": [{"filters": spieler, "max_dist": 32}]},
        "minecraft:behavior.random_look_around": {"priority": 8},
    }
    alle.update(teile)
    return {"format_version": "1.21.90", "minecraft:entity": {
        "description": {"identifier": typ, "is_spawnable": True, "is_summonable": True, "properties": {
            "fynn:phase": {"type": "int", "range": [1, 2], "default": 1, "client_sync": True},
            "fynn:angriff": {"type": "int", "range": [0, anzahl_angriffe], "default": 0, "client_sync": True},
        }},
        "component_groups": gruppen, "components": alle, "events": ereignisse}}


def beutetabelle(beute):
    toepfe = []
    for name, lo, hi, chance in beute:
        t = {"rolls": 1, "entries": [{"type": "item", "name": name, "weight": 1,
                                      "functions": [{"function": "set_count", "count": {"min": lo, "max": hi}}]}]}
        if chance < 1:
            t["conditions"] = [{"condition": "random_chance", "chance": chance}]
        toepfe.append(t)
    return {"pools": toepfe}


def werte_js(quelle, grundleben, mehr, letzte_kraft, beute, anteil):
    leben = {n: round(grundleben * (1 + 0.5 * (n - 1))) for n in range(1, mehr + 1)}
    return (f"// Erzeugt von werkzeuge/{quelle} - nicht von Hand aendern.\n"
            f"export const LEBEN = {json.dumps(leben)};\n"
            f"export const MEHR_SPIELER = {mehr};\n"
            f"export const LETZTE_KRAFT = {letzte_kraft};\n"
            f"export const BEUTE = {json.dumps(beute)};\n"
            f"export const ANTEIL = {json.dumps(anteil)};\n")


def sprache(abschnitt, namen):
    """namen: [(schluessel, deutsch, englisch)] - als eigener Abschnitt."""
    for datei, i in (("de_DE.lang", 1), ("en_US.lang", 2)):
        pfad = RES / "texts" / datei
        kopf = f"## {abschnitt}"
        zeilen = [z for z in pfad.read_text(encoding="utf-8").splitlines()
                  if z.split("=")[0] not in {n[0] for n in namen} and z != kopf]
        while zeilen and not zeilen[-1].strip():
            zeilen.pop()
        zeilen += ["", kopf] + [f"{n[0]}={n[i]}" for n in namen]
        pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def item_bilder(bilder):
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    for name, bild in bilder.items():
        bild.save(RES / "textures" / "items" / f"{name}.png")
        liste["texture_data"][name] = {"textures": f"textures/items/{name}"}
    schreibe(liste_pfad, liste)
