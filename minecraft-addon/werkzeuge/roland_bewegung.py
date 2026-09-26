#!/usr/bin/env python3
"""Rolands Bewegungen: Haltung, Gang, Hiebe und die Spezialangriffe.

Fynn: "hat sehr coole Animationen, wirklich einige richtig krasse
Animationen ... Sehr elegante Schwertschwuenge."

Wie es zusammenspielt: Das Kampfskript (roland.js) setzt die Eigenschaft
fynn:angriff auf die Nummer eines Spezialangriffs und nach dessen Ende
wieder auf 0. Die Animationssteuerung im Ressourcenpaket springt bei jeder
Nummer in ihren Zustand und spielt dort die Animation einmal ab - mit
weichem Uebergang hinein und heraus. Die Zeiten der Treffer im Skript und
die Schluesselbilder hier gehoeren zusammen; sie stehen deshalb beide in
ANGRIFFE, und das Skript bekommt seine Zeiten aus dieser Tabelle
(roland_daten.js wird hier geschrieben).

Eleganz entsteht nicht aus dem Arm allein. Jeder Hieb hat drei Teile:
Ausholen (langsam, der Koerper dreht sich weg), Schlag (schnell, die
Drehung kommt aus der Huefte, der Arm folgt spaet), Nachschwung (die
Klinge laeuft aus, der Umhang schwingt nach). Die Schluesselbilder sind
Catmull-Rom - weiche Kurven statt Knicke.

    python3 werkzeuge/roland_bewegung.py [--bilder ordner]
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

PRAEFIX = "animation.fynn.roland."


def kurve(**bilder):
    """Schluesselbilder als weiche Kurve: kurve(t0=[..], t0_4=[..]) ->
    {"0.0": {"post": .., "lerp_mode": "catmullrom"}, ...}. Die Namen
    tragen die Zeit (t0_4 = 0,4 Sekunden)."""
    aus = {}
    for name, wert in bilder.items():
        zeit = float(name[1:].replace("_", "."))
        aus[f"{zeit:.2f}"] = {"post": wert, "lerp_mode": "catmullrom"}
    return aus


# ============================================================ Haltung

# Die Grundhaltung eines Fechters: seitlich gestellt, Schildarm vorn, die
# Klinge tief und schraeg nach vorn gerichtet, der Blick geradeaus. Alle
# anderen Bewegungen gehen von hier aus und kehren hierher zurueck.
HALTUNG = {
    "huefte": [0.0, 12.0, 0.0],
    "koerper": [6.0, -14.0, 0.0],
    "kopf": [-6.0, 2.0, 0.0],
    "rechtes_bein": [-10.0, 6.0, 5.0],
    "linkes_bein": [12.0, -4.0, -4.0],
    "rechter_arm": [-24.0, -10.0, 12.0],
    "rechte_hand": [18.0, 0.0, 0.0],
    "linker_arm": [-48.0, -24.0, -8.0],
    "schild": [44.0, 20.0, 0.0],
    "umhang": [8.0, 0.0, 0.0],
}


def haltung():
    """Die Haltung selbst, dazu ein ruhiges Atmen: die Brust hebt sich, die
    Klingenspitze wandert ein wenig, der Umhang lebt."""
    knochen = {k: {"rotation": list(v)} for k, v in HALTUNG.items()}
    knochen["koerper"]["rotation"][0] = "6.0 + math.sin(query.life_time * 90.0) * 1.5"
    knochen["rechter_arm"]["rotation"][0] = "-24.0 + math.sin(query.life_time * 90.0 - 30.0) * 2.0"
    knochen["kopf"]["rotation"][0] = "-6.0 - math.sin(query.life_time * 90.0) * 1.2"
    knochen["umhang"]["rotation"][0] = "8.0 + math.sin(query.life_time * 70.0) * 2.0"
    knochen["wurzel"] = {"position": [0.0, "math.sin(query.life_time * 90.0) * 0.15", 0.0]}
    return {"loop": True, "bones": knochen}


def gang():
    """Schwerer, fester Schritt: das Gewicht sinkt bei jedem Auftreten, der
    Oberkoerper pendelt gegen die Beine, der Umhang weht nach hinten.
    Getaktet an der gelaufenen Strecke, damit die Fuesse nicht rutschen."""
    t = "query.anim_time * 30.0"
    return {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": {
        "rechtes_bein": {"rotation": [f"math.cos({t}) * 28.0", 0.0, 0.0]},
        "linkes_bein": {"rotation": [f"-math.cos({t}) * 28.0", 0.0, 0.0]},
        "huefte": {"rotation": [0.0, f"math.cos({t}) * 5.0", 0.0]},
        "koerper": {"rotation": [f"3.0 + math.abs(math.sin({t})) * 2.0", f"-math.cos({t}) * 6.0", 0.0]},
        "wurzel": {"position": [0.0, f"-math.abs(math.sin({t})) * 0.6", 0.0]},
        "wappenrock": {"rotation": [f"-math.abs(math.cos({t})) * 22.0", 0.0, 0.0]},
        "umhang": {"rotation": [f"6.0 + math.abs(math.sin({t})) * 4.0", 0.0, 0.0]},
        "umhang_unten": {"rotation": [f"5.0 + math.sin({t} * 2.0) * 4.0", 0.0, 0.0]},
    }}


# ============================================================ Ablaeufe

# Grundhaltung als volle Pose (Drehungen), dazu Verschiebungen (nur wurzel).
def _grund():
    pose = {k: {"rotation": list(v), "position": [0.0, 0.0, 0.0]} for k, v in HALTUNG.items()}
    for k in ("wurzel", "rechtes_bein", "linkes_bein", "wappenrock", "umhang_unten", "rechte_hand", "busch"):
        pose.setdefault(k, {"rotation": [0.0, 0.0, 0.0], "position": [0.0, 0.0, 0.0]})
    return pose


def ablauf(laenge, bilder, linear=(), spruenge=(), zurueck=True):
    """Eine Bewegung aus Schluesselposen. bilder: [(zeit, {knochen: drehung
    oder {"rotation": .., "position": ..}})]. Was eine Pose nicht nennt,
    bleibt wie in der Pose davor - so muss jede Pose nur sagen, was sich
    aendert. Anfang und Ende sind immer die Grundhaltung, damit die
    Bewegung aus ihr kommt und in sie zurueckfindet.

    linear: Knochen, die gleichmaessig laufen sollen (eine Drehung um sich
    selbst darf nicht beschleunigen und bremsen). spruenge: (zeit, knochen,
    kanal, vorher, nachher) - ein Sprung ohne Uebergang, etwa nach zwei
    vollen Umdrehungen zurueck auf null, was gleich aussieht."""
    folge = [(0.0, {})] + list(bilder)
    if zurueck:
        folge.append((laenge, {k: dict(v) for k, v in _grund().items()}))
    posen = []
    aktuell = _grund()
    for zeit, aenderung in folge:
        aktuell = {k: {"rotation": list(v["rotation"]), "position": list(v["position"])} for k, v in aktuell.items()}
        for knochen, wert in aenderung.items():
            eintrag = aktuell.setdefault(knochen, {"rotation": [0.0] * 3, "position": [0.0] * 3})
            if isinstance(wert, dict):
                for kanal in ("rotation", "position"):
                    if kanal in wert:
                        eintrag[kanal] = list(wert[kanal])
            else:
                eintrag["rotation"] = list(wert)
        posen.append((zeit, aktuell))
    knochen = {}
    namen = sorted({k for _, p in posen for k in p})
    for name in namen:
        for kanal in ("rotation", "position"):
            werte = [(z, p.get(name, {}).get(kanal, [0.0] * 3)) for z, p in posen]
            # Was ueberall null ist, braucht keine Kurve. Drehungen, die nicht
            # null sind, bleiben stehen, auch wenn sie sich nicht aendern: In
            # einem Angriff spielt die Grundhaltung nicht mit.
            if all(w == [0.0] * 3 for _, w in werte):
                continue
            kurve_ = {}
            for z, w in werte:
                eintrag = {"post": [round(float(x), 2) for x in w],
                           "lerp_mode": "linear" if name in linear else "catmullrom"}
                kurve_[f"{z:.2f}"] = eintrag
            for zeit, k, kan, vorher, nachher in spruenge:
                if k == name and kan == kanal:
                    kurve_[f"{zeit:.2f}"] = {"pre": vorher, "post": nachher, "lerp_mode": "linear"}
            knochen.setdefault(name, {})[kanal] = kurve_
    return {"animation_length": laenge, "bones": knochen}


# ============================================================ Hiebe

# Drei Hiebe, die sich abwechseln - so wird aus dem gewoehnlichen
# Nahkampf eine Folge: schraeg von oben, quer, Stoss. Jeder dauert 0,7
# Sekunden; getroffen wird im Spiel beim Ausloesen, die Bewegung zeigt es.
def hieb_schraeg():
    return ablauf(0.7, [
        (0.18, {"huefte": [0, 22, 0], "koerper": [0, 30, 0], "kopf": [-6, -22, 0],
                "rechter_arm": [-155, 25, 20], "rechte_hand": [0, 0, 0],
                "linker_arm": [-40, -10, -18], "umhang": [4, -10, 0]}),
        (0.30, {"huefte": [0, -6, 0], "koerper": [14, -32, 0], "kopf": [-4, 18, 0],
                "rechter_arm": [-55, -40, -10], "rechte_hand": [60, 0, 0],
                "linker_arm": [-30, -20, -30], "umhang": [16, 16, 0]}),
        (0.42, {"koerper": [16, -42, 0], "rechter_arm": [-22, -55, -18], "rechte_hand": [72, 0, 0],
                "umhang": [22, 20, 0], "umhang_unten": [12, 0, 0]}),
    ])


def hieb_quer():
    return ablauf(0.7, [
        (0.20, {"huefte": [0, 25, 0], "koerper": [2, 40, 0], "kopf": [-6, -30, 0],
                "rechter_arm": [-82, 78, 12], "rechte_hand": [88, 0, 0],
                "linker_arm": [-30, -45, -25], "umhang": [6, -14, 0]}),
        (0.32, {"huefte": [0, -10, 0], "koerper": [4, -40, 0], "kopf": [-6, 26, 0],
                "rechter_arm": [-88, -55, 0], "rechte_hand": [90, 0, 0],
                "linker_arm": [-25, 10, -40], "umhang": [18, 20, 0]}),
        (0.46, {"koerper": [4, -50, 0], "rechter_arm": [-75, -72, 0], "rechte_hand": [80, 0, 0],
                "umhang": [24, 24, 0], "umhang_unten": [14, 0, 0]}),
    ])


def hieb_stoss():
    return ablauf(0.7, [
        (0.20, {"huefte": [0, 20, 0], "koerper": [-6, 34, 0], "kopf": [-4, -24, 0],
                "rechter_arm": [-84, 42, 0], "rechte_hand": [90, 0, 0],
                "linker_arm": [-60, -30, -10], "schild": [50, 20, 0],
                "wurzel": {"position": [0, -0.5, 1.2]}}),
        (0.32, {"huefte": [0, -4, 0], "koerper": [14, -18, 0], "kopf": [-10, 10, 0],
                "rechter_arm": [-94, -6, 0], "rechte_hand": [90, 0, 0],
                "rechtes_bein": [-38, 4, 4], "linkes_bein": [28, -4, -4],
                "wurzel": {"position": [0, -1.2, -2.5]}, "umhang": [20, 0, 0]}),
        (0.48, {"koerper": [16, -14, 0], "rechter_arm": [-92, -4, 0],
                "wurzel": {"position": [0, -1.2, -2.8]}, "umhang": [26, 0, 0], "umhang_unten": [14, 0, 0]}),
    ])


# ============================================================ Spezialangriffe

# Der Schild vor der Brust, Stern nach vorn: Der Arm kommt vor den Koerper
# (beim linken Arm heisst das: Drehung um y positiv), der Schildknochen
# dreht gegen - um x die Armhebung, um z die Schraege des Arms -, damit die
# Schauseite aufrecht nach vorn zeigt. Von vorn und von beiden Seiten
# nachgesehen.
SCHILD_VOR = {"linker_arm": [-80, 45, 0], "schild": [80, 0, -30]}
# Die Klinge senkrecht in den Boden gestossen, vor dem Koerper.
KLINGE_IM_BODEN = {"rechter_arm": [-38, -8, 0], "rechte_hand": [118, 0, 0]}
# Die Klinge zum Himmel.
KLINGE_ZUM_HIMMEL = {"rechter_arm": [-176, 4, 6], "rechte_hand": [92, 0, 0]}
# Knien: das rechte Bein nach vorn angewinkelt, das linke Knie am Boden.
KNIEN = {"wurzel": {"position": [0, -5.0, 0]}, "rechtes_bein": [-88, 6, 0], "linkes_bein": [12, -4, 0],
         "wappenrock": [-60, 0, 0], "umhang": [4, 0, 0], "umhang_unten": [10, 0, 0]}
AUFRECHT = {"wurzel": {"position": [0, 0, 0]}, "rechtes_bein": HALTUNG["rechtes_bein"],
            "linkes_bein": HALTUNG["linkes_bein"], "wappenrock": [0, 0, 0], "umhang_unten": [0, 0, 0]}


def schildstoss():
    """Schild vor, tief geduckt anlaufen, dann der Stoss mit dem Schild.
    Im Skript: Anlauf 0,45 bis 0,8 s, Treffer ab 0,7 s."""
    lauf = lambda z, a: (z, {"rechtes_bein": [-40 * a, 0, 0], "linkes_bein": [40 * a, 0, 0]})
    return ablauf(1.4, [
        # Der Schild genau vor der Brust: Der Rumpf bleibt gerade - dreht er
        # sich, zeigt der Schild am Gegner vorbei.
        (0.35, dict(SCHILD_VOR, huefte=[0, 0, 0], koerper=[22, 0, 0], kopf=[-18, 0, 0],
                    rechter_arm=[26, 10, 22], rechte_hand=[165, 0, 0],
                    wurzel={"position": [0, -1.5, 1.0]}, rechtes_bein=[-20, 0, 0], linkes_bein=[25, 0, 0])),
        lauf(0.5, 1), lauf(0.6, -1), lauf(0.7, 1),
        (0.78, {"linker_arm": [-96, 40, 0], "schild": [96, 0, -26], "koerper": [30, 4, 0],
                "wurzel": {"position": [0, -1.8, -1.5]}, "umhang": [40, 0, 0], "umhang_unten": [20, 0, 0]}),
        (0.95, {"linker_arm": [-88, 44, 0], "schild": [88, 0, -30], "koerper": [24, 0, 0], "rechtes_bein": [-30, 0, 0],
                "linkes_bein": [20, 0, 0], "umhang": [30, 0, 0]}),
    ])


def klingenwirbel():
    """Tief ausholen, dann zweimal um sich selbst, die Klinge weit
    ausgestreckt. Im Skript: Treffer bei 0,8 und 1,2 s, Umkreis 4,5 Bloecke."""
    aus = {"rechter_arm": [-88, 88, 0], "rechte_hand": [90, 0, 0], "linker_arm": [-20, 0, -60],
           "koerper": [8, 20, 0], "kopf": [-4, 0, 0]}
    return ablauf(1.9, [
        (0.45, {"huefte": [0, 40, 0], "koerper": [16, 60, 0], "kopf": [-10, -40, 0],
                "rechter_arm": [-70, 100, 20], "rechte_hand": [90, 0, 0], "linker_arm": [-40, -30, -30],
                "wurzel": {"position": [0, -2.0, 0], "rotation": [0, 0, 0]},
                "rechtes_bein": [-18, 10, 10], "linkes_bein": [22, -10, -10]}),
        (0.55, dict(aus, huefte=[0, 0, 0], wurzel={"position": [0, -1.2, 0], "rotation": [0, -60, 0]},
                    umhang=[50, 0, 0], umhang_unten=[30, 0, 0])),
        (0.95, {"wurzel": {"position": [0, -0.6, 0], "rotation": [0, -360, 0]}}),
        (1.35, {"wurzel": {"position": [0, -1.2, 0], "rotation": [0, -720, 0]}}),
        (1.55, {"wurzel": {"position": [0, -1.5, 0], "rotation": [0, -720, 0]}, "koerper": [20, -30, 0],
                "rechter_arm": [-60, -50, 0], "rechte_hand": [60, 0, 0], "umhang": [20, 0, 0]}),
    ], linear=("wurzel",), spruenge=[(1.89, "wurzel", "rotation", [0, -720, 0], [0, 0, 0])])


def sprungschlag():
    """Ducken, Sprung (das Skript traegt ihn im Bogen zum Ziel, 0,5 bis
    1,2 s), Landung mit der Klinge voran in den Boden - Schockwelle bei
    1,2 s -, kurz knien, aufstehen."""
    return ablauf(2.3, [
        (0.40, {"wurzel": {"position": [0, -3.0, 0]}, "koerper": [30, 0, 0], "kopf": [-25, 0, 0],
                "rechter_arm": [-150, 10, 10], "rechte_hand": [0, 0, 0],
                "linker_arm": [30, 0, -30], "schild": [0, 0, 0], "rechtes_bein": [-40, 0, 0],
                "linkes_bein": [-10, 0, 0], "huefte": [0, 0, 0]}),
        (0.60, {"wurzel": {"position": [0, 0, 0]}, "koerper": [-12, 0, 0], "kopf": [10, 0, 0],
                "rechter_arm": [-178, 0, 8], "linker_arm": [-30, 0, -50],
                "rechtes_bein": [-50, 0, 0], "linkes_bein": [30, 0, 0], "umhang": [-10, 0, 0],
                "umhang_unten": [-20, 0, 0]}),
        (1.00, {"koerper": [-18, 0, 0], "rechtes_bein": [-60, 0, 0], "linkes_bein": [-30, 0, 0],
                "umhang": [30, 0, 0], "umhang_unten": [30, 0, 0]}),
        (1.20, dict(KNIEN, koerper=[40, 0, 0], kopf=[-30, 0, 0], rechter_arm=[-40, 0, 0],
                    rechte_hand=[116, 0, 0], linker_arm=[-20, 0, -35], umhang=[60, 0, 0])),
        (1.75, dict(KNIEN, koerper=[34, 0, 0], kopf=[-24, 0, 0])),
        (2.05, dict(AUFRECHT, koerper=[10, -10, 0], umhang=[10, 0, 0])),
    ])


def schildwall():
    """Den Schild hoch, das Gewicht nach vorn, die Klinge hinter dem Schild
    bereit. Waehrend 0,25 bis 2,0 s haelt der Schild alles ab, was von
    vorn kommt - und Roland kontert."""
    zitter = "math.sin(query.anim_time * 1400.0) * 0.8"
    a = ablauf(2.5, [
        # Schild vorn, die Klinge ruht hinten auf der Schulter - bereit zum Konter.
        (0.25, dict(SCHILD_VOR, huefte=[0, 0, 0], koerper=[14, 0, 0], kopf=[-10, 0, 0],
                    rechter_arm=[-34, 16, 18], rechte_hand=[-100, 0, 0],
                    wurzel={"position": [0, -1.5, 0]}, rechtes_bein=[-24, 10, 6], linkes_bein=[26, -6, -6])),
        (2.00, {"koerper": [16, 0, 0]}),
    ])
    return a


def sternenklingen():
    """Magie: Durendal zum Himmel, der Schildarm weit geoeffnet, der Kopf im
    Nacken - ueber jedem Gegner erscheint ein Zeichen, dann faellt eine
    Klinge aus Licht. Mit der Klinge zeigt Roland auf den Gegner. Im Skript:
    Zeichen bei 0,6 s, Einschlag bei 1,5 s (Phase zwei: zweite Welle 1,3 /
    2,2 s)."""
    return ablauf(2.8, [
        (0.55, dict(KLINGE_ZUM_HIMMEL, koerper=[-14, 0, 0], kopf=[-30, 0, 0], huefte=[0, 0, 0],
                    linker_arm=[-10, 0, -70], schild=[0, 0, 0], umhang=[14, 0, 0],
                    wurzel={"position": [0, 0.6, 0]})),
        (1.30, {"koerper": [-16, 0, 0], "kopf": [-34, 0, 0], "wurzel": {"position": [0, 0.9, 0]}}),
        (1.50, {"rechter_arm": [-90, 0, 0], "rechte_hand": [90, 0, 0], "koerper": [10, -10, 0],
                "kopf": [-6, 0, 0], "linker_arm": [-30, 0, -30], "wurzel": {"position": [0, 0, 0]},
                "umhang": [24, 0, 0]}),
        (2.10, {"rechter_arm": [-176, 4, 6], "rechte_hand": [92, 0, 0], "koerper": [-10, 0, 0]}),
        (2.30, {"rechter_arm": [-90, 0, 0], "rechte_hand": [90, 0, 0], "koerper": [10, -10, 0]}),
    ])


def saphirwelle():
    """Die Klinge hoch hinter den Kopf, weit zurueckgelehnt - und mit
    ganzer Kraft in den Boden. Von dort laeuft die Welle los (0,7 s)."""
    return ablauf(1.7, [
        (0.50, {"rechter_arm": [-172, -6, 4], "rechte_hand": [-10, 0, 0], "koerper": [-20, 6, 0],
                "kopf": [-16, 0, 0], "huefte": [0, 0, 0], "linker_arm": [-50, 0, -50], "schild": [0, 0, 0],
                "wurzel": {"position": [0, 0.4, 0.8]}, "rechtes_bein": [-20, 0, 0], "linkes_bein": [20, 0, 0],
                "umhang": [-4, 0, 0]}),
        (0.70, dict(KLINGE_IM_BODEN, koerper=[42, 0, 0], kopf=[-34, 0, 0], linker_arm=[-40, 0, -40],
                    wurzel={"position": [0, -2.0, -1.5]}, rechtes_bein=[-40, 0, 0], linkes_bein=[30, 0, 0],
                    umhang=[4, 0, 0], umhang_unten=[24, 0, 0])),
        (1.15, dict(KLINGE_IM_BODEN, koerper=[36, 0, 0], umhang=[-12, 0, 0], umhang_unten=[6, 0, 0])),
    ])


def ruf_des_ordens():
    """Durendal in den Boden, den Schild hoch in die Luft, der Ruf - bei
    1,0 s treten Ritter aus blauem Licht."""
    return ablauf(2.4, [
        (0.40, dict(KLINGE_IM_BODEN, koerper=[8, 0, 0], kopf=[-6, 0, 0], huefte=[0, 0, 0],
                    linker_arm=[-40, 0, -20])),
        # Arm hoch, der Schild dreht mit - der Stern zeigt nach vorn.
        (0.80, {"linker_arm": [-172, 0, -12], "schild": [165, 0, 0], "kopf": [-30, 0, 0], "koerper": [-10, 0, 0],
                "umhang": [18, 0, 0]}),
        (1.00, {"kopf": [-36, 0, 0], "koerper": [-14, 0, 0], "wurzel": {"position": [0, 0.3, 0]}}),
        (1.80, {"kopf": [-26, 0, 0], "koerper": [-8, 0, 0], "wurzel": {"position": [0, 0, 0]}}),
    ])


def phasenwechsel():
    """Getroffen taumelt er, sinkt auf ein Knie, stuetzt sich auf Durendal
    - der Umhang hebt sich wie im Wind, die Rinne beginnt zu gluehen - und
    er steht auf, die Klinge zum Himmel: Schockwelle bei 3,0 s."""
    return ablauf(4.0, [
        (0.35, {"koerper": [-18, 24, 0], "kopf": [-20, -20, 0], "wurzel": {"position": [0, 0, 1.5]},
                "rechter_arm": [-10, 30, 30], "linker_arm": [10, -20, -30], "schild": [0, 0, 0]}),
        (0.90, dict(KNIEN, **KLINGE_IM_BODEN, koerper=[28, 0, 0], kopf=[30, 0, 0], huefte=[0, 0, 0],
                    linker_arm=[-20, 0, -20], umhang=[-14, 0, 0])),
        (2.30, {"umhang": [8, 0, 0], "umhang_unten": [24, 0, 0], "kopf": [20, 0, 0]}),
        (2.60, dict(AUFRECHT, koerper=[-8, 0, 0], kopf=[-10, 0, 0], umhang=[40, 0, 0])),
        (3.00, dict(KLINGE_ZUM_HIMMEL, koerper=[-24, 0, 0], kopf=[-30, 0, 0], linker_arm=[-120, 0, -50],
                    schild=[110, 0, 0],
                    wurzel={"position": [0, 1.0, 0]}, umhang=[60, 0, 0], umhang_unten=[30, 0, 0])),
        (3.40, {"koerper": [-20, 0, 0], "wurzel": {"position": [0, 0.5, 0]}}),
    ])


def auftritt():
    """Er erscheint kniend, erhebt sich und gruesst mit der Klinge vor dem
    Visier - dann die Fechterhaltung."""
    knie = dict(KNIEN, **KLINGE_IM_BODEN, koerper=[24, 0, 0], kopf=[34, 0, 0], huefte=[0, 0, 0],
                linker_arm=[-20, 0, -20], schild=[0, 0, 0])
    return ablauf(3.2, [
        (0.0, knie),
        (1.10, dict(knie, kopf=[20, 0, 0])),
        (1.80, dict(AUFRECHT, koerper=[0, 0, 0], kopf=[0, 0, 0], rechter_arm=[-110, -24, 0],
                    rechte_hand=[64, 0, 0], linker_arm=[-10, 0, -10])),
        (2.50, {"rechter_arm": [-112, -26, 0]}),
    ])


def konter():
    """Nach einem abgewehrten Schlag: kurz und hart aus dem Schild heraus."""
    return ablauf(0.6, [
        (0.12, dict(SCHILD_VOR, huefte=[0, 0, 0], koerper=[-4, 6, 0], rechter_arm=[-84, 42, 0], rechte_hand=[90, 0, 0])),
        (0.24, {"koerper": [16, -20, 0], "rechter_arm": [-94, -4, 0], "rechte_hand": [90, 0, 0],
                "wurzel": {"position": [0, -1, -2]}}),
    ])


def abschied():
    """Besiegt: er taumelt zurueck, faellt auf die Knie, stoesst Durendal in
    den Boden und senkt den Kopf - so bleibt er, bis ihn das Licht holt."""
    return ablauf(4.0, [
        (0.35, {"koerper": [-20, 10, 0], "kopf": [-24, 0, 0], "wurzel": {"position": [0, 0, 1.5]},
                "rechter_arm": [-20, 20, 30], "linker_arm": [0, 0, -40], "schild": [0, 0, 0]}),
        (1.00, dict(KNIEN, **KLINGE_IM_BODEN, koerper=[30, 0, 0], kopf=[40, 0, 0], huefte=[0, 0, 0],
                    linker_arm=[-5, 0, -10], umhang=[2, 0, 0])),
        (4.0, dict(KNIEN, **KLINGE_IM_BODEN, koerper=[34, 0, 0], kopf=[44, 0, 0], linker_arm=[0, 0, -8])),
    ], zurueck=False)


# ============================================================ Tabelle

# Die Spezialangriffe mit Nummer (so heissen sie im Skript, in der
# Eigenschaft fynn:angriff und in der Steuerung), Laenge und den Zeitpunkten,
# zu denen das Skript etwas tut. Eine Zeit steht nur hier.
ANGRIFFE = {
    1: ("schildstoss", schildstoss, {"anlauf": 0.45, "stoss": 0.72, "ende_anlauf": 0.85}),
    2: ("klingenwirbel", klingenwirbel, {"treffer": [0.8, 1.2]}),
    3: ("sprungschlag", sprungschlag, {"absprung": 0.5, "landung": 1.2}),
    4: ("schildwall", schildwall, {"von": 0.25, "bis": 2.0}),
    5: ("sternenklingen", sternenklingen, {"zeichen": [0.6, 1.3], "einschlag": [1.5, 2.2]}),
    6: ("saphirwelle", saphirwelle, {"welle": 0.7}),
    7: ("ruf_des_ordens", ruf_des_ordens, {"ruf": 1.0}),
    8: ("phasenwechsel", phasenwechsel, {"knien": 0.9, "welle": 3.0}),
    9: ("auftritt", auftritt, {"bereit": 3.0}),
    10: ("konter", konter, {"treffer": 0.24}),
    11: ("abschied", abschied, {"licht": 3.2}),
}
HIEBE = [("hieb_schraeg", hieb_schraeg), ("hieb_quer", hieb_quer), ("hieb_stoss", hieb_stoss)]


def alle_animationen():
    anims = {PRAEFIX + "haltung": haltung(), PRAEFIX + "gang": gang(),
             # Mojangs Blick-Animation dreht einen Knochen namens "head" -
             # Rolands Kopf heisst "kopf".
             PRAEFIX + "blick": {"loop": True, "bones": {"kopf": {"rotation": [
                 "query.target_x_rotation", "query.target_y_rotation", 0.0]}}}}
    for name, bau in HIEBE:
        anims[PRAEFIX + name] = bau()
    for nr, (name, bau, _) in ANGRIFFE.items():
        a = bau()
        # Am Ende stehen bleiben, bis die Steuerung weiterschaltet - sonst
        # springt er fuer einen Augenblick in die Ruhelage des Modells.
        a["loop"] = "hold_on_last_frame"
        anims[PRAEFIX + name] = a
    return anims


def steuerung():
    """Die Animationssteuerung: bereit (Haltung, Gang, Blick), die Hiebe im
    Wechsel, und je Spezialangriff ein Zustand."""
    angriffe = [{f"angriff_{nr}": f"query.property('fynn:angriff') == {nr}"} for nr in ANGRIFFE]
    zustaende = {
        "bereit": {
            "animations": ["haltung", {"gang": "math.clamp(query.modified_move_speed * 2.0, 0.0, 1.0)"}, "blick"],
            "transitions": angriffe + [{"hieb": "variable.attack_time > 0.0"}],
            "blend_transition": 0.2,
        },
        "hieb": {
            # Jeder neue Hieb der naechste in der Folge: schraeg, quer, Stoss.
            "on_entry": ["variable.hieb = math.mod(variable.hieb + 1, 3);"],
            "animations": [{"hieb_schraeg": "variable.hieb == 0"}, {"hieb_quer": "variable.hieb == 1"},
                           {"hieb_stoss": "variable.hieb == 2"}],
            "transitions": angriffe + [{"bereit": "query.all_animations_finished"}],
            "blend_transition": 0.12,
        },
    }
    for nr, (name, _, _) in ANGRIFFE.items():
        zustaende[f"angriff_{nr}"] = {
            "animations": [name],
            "transitions": [{"bereit": f"query.property('fynn:angriff') != {nr}"}],
            "blend_transition": 0.15,
        }
    return {"format_version": "1.10.0", "animation_controllers": {
        "controller.animation.fynn.roland.kampf": {"initial_state": "bereit", "states": zustaende}}}


def skriptdaten():
    """Die Zeiten fuer das Kampfskript, in Ticks (20 je Sekunde)."""
    daten = {}
    for nr, (name, bau, zeiten) in ANGRIFFE.items():
        eintrag = {"nr": nr, "laenge": round(bau()["animation_length"] * 20)}
        for k, v in zeiten.items():
            eintrag[k] = [round(x * 20) for x in v] if isinstance(v, list) else round(v * 20)
        daten[name] = eintrag
    return ("// Erzeugt von werkzeuge/roland_bewegung.py - nicht von Hand aendern.\n"
            "// Die Zeiten der Angriffe in Ticks, passend zu den Animationen.\n"
            f"export const ANGRIFFE = {json.dumps(daten, indent=4, ensure_ascii=False)};\n")


def main():
    schreibe_json(RES / "animations" / "roland.animation.json",
                  {"format_version": "1.10.0", "animations": alle_animationen()})
    schreibe_json(RES / "animation_controllers" / "roland.animation_controllers.json", steuerung())
    (VER / "scripts" / "roland_daten.js").write_text(skriptdaten(), encoding="utf-8")
    print("gebaut: Rolands Bewegungen,", len(alle_animationen()), "Animationen")


def schreibe_json(pfad, daten):
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
