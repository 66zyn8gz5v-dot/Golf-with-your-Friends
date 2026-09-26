#!/usr/bin/env python3
"""Baut die Bewegungen des Spielers: Hieb, Laufen, Schleichen, Sprung, Bogen.

Fynn: "mehr Animation vom Spieler, so Laufanimation, ein bisschen andere
Sneak-Animation ... dynamischer", und: "die Schlaganimation wird immer
noch nicht richtig ausgefuehrt bei den Schwertern ... man schwingt die nur
so leicht hin und her, aber man schlaegt nicht richtig zu."

Warum der alte Hieb nur wackelte: In der Ich-Sicht spielt Minecraft beim
Zuschlagen seine eigene Armbewegung - eine kleine Kreisbewegung, gemacht
fuer ein flaches Bild. Unsere Klingen drehten dazu nur sich selbst ein
Stueck (animation.klinge.schlag). Der Arm blieb, wo er war. Mit einem
grossen 3D-Schwert sieht das aus wie Zittern.

Jetzt fuehrt der Arm den Hieb: Er holt rechts oben aus und zieht quer
durchs Bild nach links unten; jeder zweite Hieb kommt als Rueckhand von
links. Von aussen dreht sich dabei der Oberkoerper mit, der freie Arm
schwingt dagegen, das vordere Bein geht mit.

Alles haengt an v.attack_time, Minecrafts eigenem Zaehler fuer den
Schlag (0 bis 1). Die Hiebe laufen deshalb genau so schnell wie das
Spiel zuschlaegt, und kein Steuerwerk kann aus dem Takt geraten:
"anim_time_update" macht aus dem Zaehler die Zeit der Animation.

Die Bewegungen stehen hier nicht als Zahlenkolonnen, sondern als
Schluesselhaltungen ("Schulter so weit gedreht, Handgelenk so weit") -
die Umrechnung in Bedrocks Knochenwinkel macht haltung.py. Angesehen
wird alles mit spieler_ansehen.py, siehe --bilder.

    python3 werkzeuge/spieler_animation_bauen.py [--bilder ORDNER]
"""

import json
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import haltung as h                                 # noqa: E402
from spieler_ansehen import drehmatrix, lade        # noqa: E402
from dolche_bauen import schreibe                   # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
SPIELER = RES / "entity" / "player.entity.json"

# Was einen Hieb bekommt. Der Degen bleibt draussen: Er sticht, statt zu
# hauen, und hat seinen eigenen Stoss. Dieselbe Liste wie SCHWERTER und
# DOLCHE in kampf.js - die Dolche gehoeren dazu, weil der Assassine mit
# ihnen genauso zuschlaegt, nur schneller.
HIEBWAFFEN = [
    "minecraft:wooden_sword", "minecraft:stone_sword", "minecraft:iron_sword",
    "minecraft:golden_sword", "minecraft:diamond_sword", "minecraft:netherite_sword",
    "minecraft:copper_sword",
    "fynn:ritterschwert", "fynn:eisenklinge", "fynn:silberklinge",
    "fynn:elektrumklinge", "fynn:sternenklinge",
    "fynn:eisendolche", "fynn:silberdolche", "fynn:stahldolche",
    "fynn:elektrumdolche", "fynn:diamantdolche", "fynn:netheritdolche",
]
BOEGEN = ["minecraft:bow", "fynn:sturmbogen"]


def namen(liste):
    return ", ".join(f"'{n}'" for n in liste)


# ------------------------------------------------------------ Variablen

INITIALISIEREN = [
    # 1, damit der erste Hieb auf 0 kippt - die Vorhand.
    "variable.fynn_hieb_seite = 1.0;",
    "variable.fynn_hieb_zuvor = 0.0;",
    "variable.fynn_luft = 0.0;",
    "variable.fynn_lade = 0.0;",
    "variable.fynn_los = 0.0;",
    "variable.fynn_spannen_zuvor = 0.0;",
]

VORBERECHNUNG = [
    f"variable.fynn_schwert = query.is_item_name_any('slot.weapon.mainhand', {namen(HIEBWAFFEN)});",
    f"variable.fynn_bogen = query.is_item_name_any('slot.weapon.mainhand', {namen(BOEGEN)});",
    # Ein neuer Hieb beginnt, wenn der Zaehler von null loslaeuft - oder
    # neu anfaengt, bevor der alte fertig war (schnelles Tippen). Dann
    # wechselt die Seite: Vorhand, Rueckhand, Vorhand ...
    "variable.fynn_hieb_seite = (variable.attack_time > 0.0 && (variable.fynn_hieb_zuvor <= 0.0 || "
    "variable.attack_time < variable.fynn_hieb_zuvor)) ? 1.0 - variable.fynn_hieb_seite : variable.fynn_hieb_seite;",
    "variable.fynn_hieb_zuvor = variable.attack_time;",
    # Wie weit der Schritt gerade ist - derselbe Takt wie Minecrafts eigene
    # Beinbewegung (tcos0), damit Arme, Beine und Koerper zusammenpassen.
    "variable.fynn_gang = query.modified_distance_moved * 38.17;",
    "variable.fynn_tempo = math.clamp(query.modified_move_speed, 0.0, 1.0);",
    # In der Luft: weich ein- und ausgeblendet, sonst springt die Haltung
    # bei jeder Stufe, die man hochlaeuft.
    "variable.fynn_luft = math.lerp(variable.fynn_luft, (!query.is_on_ground && !query.is_in_water && "
    "!query.is_riding && !query.is_gliding && !query.is_swimming) ? 1.0 : 0.0, 0.2);",
    # Aufladen: Schleichen mit Schwert oder Dolch laedt in kampf.js den
    # Wirbelschlag und den Schattensprung. Hier waechst die Ausholhaltung
    # im selben Takt mit - eine Sekunde bis ganz.
    "variable.fynn_lade = (query.is_sneaking && variable.fynn_schwert) ? "
    "math.min(variable.fynn_lade + query.delta_time, 1.0) : math.max(variable.fynn_lade - query.delta_time * 5.0, 0.0);",
    # Wie weit der Bogen gespannt ist, 0 bis 1 in einer Sekunde. Der
    # Nutzungszaehler laeuft in Bedrock rueckwaerts vom Hoechstwert - so
    # rechnet auch Mojangs eigener Bogen.
    "variable.fynn_spannen = (variable.fynn_bogen && query.main_hand_item_use_duration > 0.0) ? "
    "math.clamp((query.main_hand_item_max_duration - query.main_hand_item_use_duration) / 20.0, 0.0, 1.0) : 0.0;",
    # Losgelassen: eine Viertelsekunde Rueckstoss.
    "variable.fynn_los = (variable.fynn_spannen_zuvor > 0.25 && variable.fynn_spannen <= 0.0) ? 1.0 : "
    "math.max(variable.fynn_los - query.delta_time * 4.0, 0.0);",
    "variable.fynn_spannen_zuvor = variable.fynn_spannen;",
]

# Das Attachable liest diese Werte ueber c.owning_entity.
OEFFENTLICH = ["variable.fynn_schwert"]


# ------------------------------------------------------------ Hilfen

def glatt(f):
    return f * f * (3 - 2 * f)


def zwischen(folge, t, anzahl):
    """Wert einer Schluesselhaltung zur Zeit t, weich uebergeblendet."""
    for a, b in zip(folge, folge[1:]):
        if a[0] <= t <= b[0]:
            f = glatt((t - a[0]) / (b[0] - a[0]))
            aus = []
            for k in range(1, anzahl + 1):
                x, y = a[k], b[k]
                if isinstance(x, tuple):
                    aus.append(tuple(x[i] + (y[i] - x[i]) * f for i in range(len(x))))
                else:
                    aus.append(x + (y - x) * f)
            return aus
    return list(folge[-1][1:anzahl + 1])


ZEITEN = [round(i * 0.05, 2) for i in range(21)]


def zahl(x):
    return round(x, 2) + 0.0


def schluessel(werte):
    """{zeit: [x, y, z]} -> Bedrocks Schluesselbilder."""
    return {f"{t:.2f}": [zahl(v) if isinstance(v, (int, float)) else v for v in w] for t, w in werte}


# ------------------------------------------------------------ Hieb, Ich-Sicht

# Grundhaltung des rechten Arms in der Ich-Sicht (Mojangs empty_hand) und
# zwei Punkte, um die gedreht wird. Die Hand ist der Drehpunkt des
# Knochens rightItem, wie ihn empty_hand verschiebt; die Schulter ist der
# Drehpunkt des Arms. Beide in der Modelldatei, nachgerechnet mit
# spieler_ansehen.
ICH_ARM_ROT = (95.0, -45.0, 115.0)
ICH_ARM_POS = (13.5, -10.0, 12.0)
ARM_PIVOT = (-5.0, 22.0, 0.0)
ICH_HAND = (11.3, 16.6, 16.0)
ICH_SCHULTER = (8.5, 12.0, 12.0)

# Die Schluesselhaltungen: Zeit, Schulter rollen (um die Blickachse, plus
# heisst gegen den Uhrzeigersinn), Handgelenk rollen, Handgelenk nicken
# (plus kippt die Klinge vom Auge weg), Verschiebung der Hand
# (x rechts, y oben, z vom Auge weg).
#
# Der Hieb selbst liegt zwischen 0.15 und 0.55 - bei Minecrafts
# Schlagdauer von 0.3 Sekunden etwa eine Achtelsekunde. So schnell, dass
# er zuschlaegt, und lang genug, dass man den Bogen sieht.
ICH_VORHAND = [
    (0.00, 0, 0, 0, (0, 0, 0)),
    (0.15, -5, -15, 5, (-2, 6, 0)),       # ausholen: hoch, Klinge nach rechts
    (0.30, 20, 30, 20, (-1, 3, 3)),       # durchziehen
    (0.42, 45, 80, 35, (-3, 1, 4)),       # quer durchs Bild
    (0.55, 65, 110, 60, (-4, -1, 3)),     # nach links unten
    (0.75, 50, 60, 30, (-2, -9, 0)),      # unter dem Bildrand zurueck
    (1.00, 0, 0, 0, (0, 0, 0)),
]
ICH_RUECKHAND = [
    (0.00, 0, 0, 0, (0, 0, 0)),
    (0.15, 35, 55, -5, (-2, 5, 0)),       # ausholen nach links oben
    (0.30, 25, 10, 20, (0, 3, 3)),
    (0.42, 5, -50, 35, (1, 1, 4)),
    (0.55, -10, -80, 60, (2, -1, 3)),     # nach rechts unten
    (0.75, 0, -40, 30, (1, -9, 0)),
    (1.00, 0, 0, 0, (0, 0, 0)),
]


def ich_haltung(folge, t):
    schulter, hand_rollen, hand_nicken, schub = zwischen(folge, t, 4)
    rot, pos = h.bewege(ARM_PIVOT, ICH_ARM_ROT, ICH_ARM_POS, h.dreh_um((0, 0, 1), schulter), ICH_SCHULTER, schub)
    # Das Handgelenk dreht nicht den Arm, sondern rightItem - so bleibt der
    # Arm ein Arm und kippt nicht um die Faust herum. Die Drehung ist im
    # Bild gedacht und wird in den Raum des Arms umgerechnet.
    a = drehmatrix(*rot)
    at = [[a[j][i] for j in range(3)] + [0] for i in range(3)] + [[0, 0, 0, 1]]
    bild = h.mal(h.dreh_um((0, 0, 1), hand_rollen), h.dreh_um((1, 0, 0), hand_nicken))
    item = h.zerlege(h.mal(at, h.mal(bild, a)))
    return rot, pos, item


def hieb_ich(folge):
    rots, poss, items = [], [], []
    for t in ZEITEN:
        rot, pos, item = ich_haltung(folge, t)
        rots.append(rot)
        poss.append(pos)
        items.append(item)
    rots, items = h.stetig(rots), h.stetig(items)
    # Der Arm steht absolut ("- this"): Minecrafts eigener kleiner Schwung
    # laeuft gleichzeitig und wuerde sich sonst dazuaddieren.
    return {
        "loop": False,
        "anim_time_update": "variable.attack_time",
        "animation_length": 1.0,
        "bones": {
            "rightarm": {
                "rotation": schluessel((t, [f"{zahl(r[i])} - this" for i in range(3)]) for t, r in zip(ZEITEN, rots)),
                "position": schluessel((t, [f"{zahl(p[i])} - this" for i in range(3)]) for t, p in zip(ZEITEN, poss)),
            },
            "rightitem": {
                "rotation": schluessel(zip(ZEITEN, items)),
            },
        },
    }


# ------------------------------------------------------------ Hieb, von aussen

# Winkel direkt in Bedrocks Schreibweise - von aussen sind sie anschaulich:
# rechter Arm x negativ hebt nach vorn und oben, y negativ zieht ihn vor
# den Koerper, z positiv spreizt ihn ab. Taille y positiv nimmt die
# rechte Schulter zurueck. Die Beine: x negativ ist vorn.
# (t, rechter Arm, linker Arm, Taille (x, y, z), rechtes Bein, linkes Bein,
#  Handgelenk). Das Handgelenk kippt die Klinge in Richtung des Arms: So
# zeigt sie am Ende des Hiebs nach unten durch, statt wie eine Deckung
# nach oben zu stehen.
AUSSEN_VORHAND = [
    (0.00, (-18, 0, 0), (0, 0, 0), (0, 0, 0), 0, 0, 0),
    (0.18, (-165, 25, 15), (-35, 0, -10), (-4, 30, 0), 6, -4, -20),     # hoch ueber die rechte Schulter
    (0.35, (-110, -15, 5), (-10, 0, -15), (4, 5, 0), -8, 6, 10),
    (0.48, (-55, -45, 0), (25, 0, -20), (8, -25, 0), -16, 10, 55),      # quer vor den Koerper
    (0.62, (-30, -55, 5), (30, 0, -20), (6, -32, 0), -16, 10, 75),      # nach links unten durch
    (1.00, (-18, 0, 0), (0, 0, 0), (0, 0, 0), 0, 0, 0),
]
AUSSEN_RUECKHAND = [
    (0.00, (-18, 0, 0), (0, 0, 0), (0, 0, 0), 0, 0, 0),
    (0.18, (-140, -60, 0), (-20, 0, -10), (-4, -30, 0), -6, 4, -15),    # hoch vor die linke Schulter
    (0.35, (-105, -20, 10), (-5, 0, -15), (4, -5, 0), -8, 6, 10),
    (0.48, (-70, 35, 30), (20, 0, -20), (6, 25, 0), -14, 8, 50),        # nach rechts aussen
    (0.62, (-40, 50, 40), (25, 0, -20), (4, 30, 0), -14, 8, 70),
    (1.00, (-18, 0, 0), (0, 0, 0), (0, 0, 0), 0, 0, 0),
]


def huelle(t):
    """Wie stark der Hieb die uebrigen Bewegungen ersetzt: schnell rein,
    langsam raus. Am Anfang und am Ende null - dann steht der Arm genau
    dort, wo Minecraft ihn gerade hat, und nichts springt."""
    if t < 0.1:
        return glatt(t / 0.1)
    if t > 0.7:
        return glatt((1.0 - t) / 0.3)
    return 1.0


def hieb_aussen(folge):
    ra, la, ta, rb, lb, hg = [], [], [], [], [], []
    for t in ZEITEN:
        rechts, links, taille, rbein, lbein, gelenk = zwischen(folge, t, 6)
        e = huelle(t)
        ra.append((t, [f"({zahl(v)} - this) * {zahl(e)}" for v in rechts]))
        la.append((t, [f"({zahl(v)} - this) * {zahl(e)}" for v in links]))
        ta.append((t, [v * e for v in taille]))
        rb.append((t, [rbein * e, 0, 0]))
        lb.append((t, [lbein * e, 0, 0]))
        hg.append((t, [gelenk * e, 0, 0]))
    return {
        "loop": False,
        "anim_time_update": "variable.attack_time",
        "animation_length": 1.0,
        "bones": {
            "rightarm": {"rotation": schluessel(ra)},
            "leftarm": {"rotation": schluessel(la)},
            "waist": {"rotation": schluessel(ta)},
            "rightleg": {"rotation": schluessel(rb)},
            "leftleg": {"rotation": schluessel(lb)},
            "rightitem": {"rotation": schluessel(hg)},
        },
    }


# ------------------------------------------------------------ Laufen

# Der Kopf wird nirgends gegengedreht: Mojangs Blickanimation rechnet ihn
# "relative_to entity", er schaut also aufs Ziel, egal wie Taille und
# Koerper darunter drehen.

GANG = "variable.fynn_gang"
TEMPO = "variable.fynn_tempo"
RENNEN = "(query.is_sprinting ? 1.0 : 0.0)"
# Die Arme schwingen nur, wenn sie frei sind - nicht beim Zielen.
FREI = "(variable.fynn_spannen <= 0.0)"

LAUFEN = {
    "loop": True,
    "bones": {
        # Der Koerper wippt: am tiefsten, wenn die Beine am weitesten
        # auseinander stehen, am hoechsten, wenn sie aneinander vorbei gehen.
        "root": {"position": [0.0, f"(math.abs(math.sin({GANG})) - 1.0) * 0.9 * {TEMPO}", 0.0]},
        # Die Schultern drehen gegen die Huefte, wie beim echten Gehen: Der
        # Arm, der vorn ist, nimmt seine Schulter mit. Beim Rennen lehnt der
        # Oberkoerper nach vorn.
        "waist": {"rotation": [f"(4.0 + 8.0 * {RENNEN}) * {TEMPO}",
                               f"-math.cos({GANG}) * 9.0 * {TEMPO}",
                               f"math.sin({GANG}) * 1.5 * {TEMPO}"]},
        # Mehr Schwung in den Armen, beim Rennen etwas abgespreizt. Die Beine
        # bleiben bei Minecrafts Schwung - der ist beim Rennen schon 70 Grad.
        "rightarm": {"rotation": [f"-variable.tcos0 * (0.2 + 0.2 * {RENNEN}) * {FREI}", 0.0,
                                  f"(2.0 + 4.0 * {RENNEN}) * {TEMPO} * {FREI}"]},
        "leftarm": {"rotation": [f"variable.tcos0 * (0.2 + 0.2 * {RENNEN}) * {FREI}", 0.0,
                                 f"-(2.0 + 4.0 * {RENNEN}) * {TEMPO} * {FREI}"]},
    },
}


# ------------------------------------------------------------ Schleichen

# Stillstehend eine geduckte Lauerstellung, ein Bein vor, die Arme bereit.
# Im Gehen weicht die Schrittstellung dem Schritt, und der Koerper wiegt
# sich von einer Seite zur anderen - geschlichen, nicht gegangen.
STILL = f"(1.0 - {TEMPO})"
LADE = "variable.fynn_lade"
SCHLEICHEN = {
    "loop": True,
    "bones": {
        "root": {"position": [0.0, f"-0.6 + math.abs(math.sin({GANG})) * 0.5 * {TEMPO}", 0.0]},
        "waist": {"rotation": [8.0, f"-math.cos({GANG}) * 6.0 * {TEMPO}", f"math.sin({GANG}) * 5.0 * {TEMPO}"]},
        "rightarm": {"rotation": [f"-22.0 * (1.0 - {LADE})", 0.0, f"8.0 * (1.0 - {LADE})"]},
        "leftarm": {"rotation": [-28.0, 0.0, -10.0]},
        "rightleg": {"rotation": [f"-16.0 * {STILL} + variable.tcos0 * 0.4", 0.0, 3.0]},
        "leftleg": {"rotation": [f"12.0 * {STILL} - variable.tcos0 * 0.4", 0.0, -3.0]},
    },
}

# Aufladen mit Schwert oder Dolch: Die Klinge wird zurueckgenommen, der
# Oberkoerper dreht ein - je laenger geschlichen, desto weiter. Wenn der
# Wirbelschlag bereit ist, zittert die Spannung.
ZITTERN = f"({LADE} >= 1.0 ? math.sin(query.life_time * 2400.0) * 1.2 : 0.0)"
AUFLADEN = {
    "loop": True,
    "bones": {
        "waist": {"rotation": [0.0, f"28.0 * {LADE}", 0.0]},
        "rightarm": {"rotation": [f"(-75.0 * {LADE}) + {ZITTERN} - this * {LADE}",
                                  f"45.0 * {LADE} - this * {LADE}",
                                  f"35.0 * {LADE} - this * {LADE}"]},
        "leftarm": {"rotation": [f"-40.0 * {LADE}", 0.0, f"-15.0 * {LADE}"]},
    },
}

# Dasselbe aus der Ich-Sicht: Die Klinge wandert nach rechts hinten aus dem
# Bild, halb zu sehen, und zittert, wenn es losgehen kann.
AUFLADEN_ICH = {
    "loop": True,
    "bones": {
        "rightarm": {
            "position": [f"2.5 * {LADE}", f"-2.0 * {LADE} + {ZITTERN} * 0.3", f"-1.0 * {LADE}"],
        },
        "rightitem": {"rotation": [f"-20.0 * {LADE}", 0.0, f"25.0 * {LADE} + {ZITTERN}"]},
    },
}


# ------------------------------------------------------------ Sprung

LUFT = {
    "loop": True,
    "bones": {
        # Ein Bein angezogen vorn, eins zurueck, die Arme zum Ausgleich
        # etwas hoch und zur Seite.
        "rightleg": {"rotation": [-28.0, 0.0, 2.0]},
        "leftleg": {"rotation": [16.0, 0.0, -2.0]},
        "rightarm": {"rotation": [f"-12.0 * {FREI}", 0.0, f"18.0 * {FREI}"]},
        "leftarm": {"rotation": [f"-8.0 * {FREI}", 0.0, f"-18.0 * {FREI}"]},
        "waist": {"rotation": [-4.0, 0.0, 0.0]},
    },
}


# ------------------------------------------------------------ Bogen

SPANNEN = "variable.fynn_spannen"
LOS = "variable.fynn_los"
BOGENZITTERN = f"({SPANNEN} >= 1.0 ? math.sin(query.life_time * 2200.0) * 0.8 : 0.0)"

# Schuetzenstellung: seitlich zum Ziel, die Bogenschulter vorn, der
# Bogenarm gestreckt aufs Ziel, die Zughand an der Wange. In Minecraft
# haelt die rechte Hand den Bogen, die linke zieht die Sehne. Mojangs
# eigene Haltung hat beide Arme fast parallel nach vorn - und gilt nur fuer
# den gewoehnlichen Bogen; der Sturmbogen hatte von aussen gar keine.
# Beim Loslassen schnellt die Zughand nach hinten, der Bogen nickt hoch,
# der Koerper dreht ein Stueck zurueck.
DREH = f"((20.0 + 15.0 * {SPANNEN}) * (1.0 - 0.6 * {LOS}))"
ZIEL_X = "-90.0 + query.target_x_rotation - query.is_sneaking * 15.0"
BOGEN_AUSSEN = {
    "loop": True,
    "bones": {
        # Taille y negativ: die rechte Schulter, die den Bogen haelt, vorn.
        "waist": {"rotation": [0.0, f"-{DREH}", 0.0]},
        # Beide Arme drehen mit der Taille mit; zuruecknehmen, damit sie
        # weiter aufs Ziel zeigen.
        "rightarm": {"rotation": [
            f"{ZIEL_X} - 12.0 * {LOS} + {BOGENZITTERN} - this",
            f"query.target_y_rotation + {DREH} * 0.9 - 5.0 - this",
            "-this"]},
        "leftarm": {"rotation": [
            f"{ZIEL_X} - 6.0 * {SPANNEN} + 20.0 * {LOS} - this",
            f"query.target_y_rotation + {DREH} * 0.9 + 20.0 + 25.0 * {SPANNEN} - 70.0 * {LOS} - this",
            f"-15.0 * {LOS} - this"]},
    },
}

# Aus der Ich-Sicht: Mojangs Bogen zieht sich selbst heran (das Attachable).
# Dazu: voll gespannt zittert die Hand, losgelassen zuckt sie zurueck.
BOGEN_ICH = {
    "loop": True,
    "bones": {
        "rightarm": {
            "position": [f"{BOGENZITTERN} * 0.15", f"1.5 * {LOS} + {BOGENZITTERN} * 0.2", f"-2.5 * {LOS}"],
            "rotation": [f"-8.0 * {LOS}", 0.0, 0.0],
        },
    },
}


# ------------------------------------------------------------ Zusammenbau

AUSSEN_FREI = ("!variable.is_first_person && !variable.is_paperdoll && !variable.map_face_icon && "
               "!query.is_riding && !query.is_sleeping")
BEWEGT = f"{AUSSEN_FREI} && !query.is_swimming && !query.is_gliding && !query.is_crawling"

# Name im Spieler, Animation, Bedingung (zugleich das Mischgewicht).
# Die Reihenfolge zaehlt: Was spaeter kommt, legt sich ueber das Fruehere.
# Deshalb der Hieb zuletzt - er ersetzt die Arme ganz.
TEILE = [
    ("fynn_laufen", "animation.fynn.laufen", LAUFEN,
     f"{BEWEGT} && !query.is_sneaking && variable.fynn_luft < 0.5"),
    ("fynn_schleichen", "animation.fynn.schleichen", SCHLEICHEN,
     f"{BEWEGT} && query.is_sneaking && !query.is_item_name_any('slot.weapon.mainhand', 'fynn:degen')"),
    ("fynn_luft", "animation.fynn.luft", LUFT, f"({BEWEGT}) * variable.fynn_luft"),
    ("fynn_aufladen", "animation.fynn.aufladen", AUFLADEN, f"{BEWEGT} && variable.fynn_lade > 0.0"),
    ("fynn_aufladen_ich", "animation.fynn.aufladen_ich", AUFLADEN_ICH,
     "variable.is_first_person && !variable.is_paperdoll && variable.fynn_lade > 0.0 && variable.attack_time <= 0.0"),
    ("fynn_bogen_aussen", "animation.fynn.bogen_aussen", BOGEN_AUSSEN,
     f"{AUSSEN_FREI} && (variable.fynn_spannen > 0.0 || variable.fynn_los > 0.0)"),
    ("fynn_bogen_ich", "animation.fynn.bogen_ich", BOGEN_ICH,
     "variable.is_first_person && !variable.is_paperdoll && (variable.fynn_spannen >= 1.0 || variable.fynn_los > 0.0)"),
    ("fynn_hieb_ich_vor", "animation.fynn.hieb_ich_vorhand", None,
     "variable.is_first_person && !variable.is_paperdoll && variable.fynn_schwert && variable.attack_time > 0.0 && variable.fynn_hieb_seite < 0.5"),
    ("fynn_hieb_ich_rueck", "animation.fynn.hieb_ich_rueckhand", None,
     "variable.is_first_person && !variable.is_paperdoll && variable.fynn_schwert && variable.attack_time > 0.0 && variable.fynn_hieb_seite >= 0.5"),
    ("fynn_hieb_aussen_vor", "animation.fynn.hieb_aussen_vorhand", None,
     f"{AUSSEN_FREI} && variable.fynn_schwert && variable.attack_time > 0.0 && variable.fynn_hieb_seite < 0.5"),
    ("fynn_hieb_aussen_rueck", "animation.fynn.hieb_aussen_rueckhand", None,
     f"{AUSSEN_FREI} && variable.fynn_schwert && variable.attack_time > 0.0 && variable.fynn_hieb_seite >= 0.5"),
]


def animationen():
    fertig = {
        "animation.fynn.hieb_ich_vorhand": hieb_ich(ICH_VORHAND),
        "animation.fynn.hieb_ich_rueckhand": hieb_ich(ICH_RUECKHAND),
        "animation.fynn.hieb_aussen_vorhand": hieb_aussen(AUSSEN_VORHAND),
        "animation.fynn.hieb_aussen_rueckhand": hieb_aussen(AUSSEN_RUECKHAND),
    }
    for _, name, anim, _ in TEILE:
        if anim is not None:
            fertig[name] = anim
    return {"format_version": "1.10.0", "animations": fertig}


def spielerdatei():
    """Unsere Teile in die Spielerdatei - ohne Mojangs Teile anzufassen.

    Was von einem frueheren Lauf dieses Werkzeugs stammt, wird vorher
    entfernt; so kann es beliebig oft laufen."""
    datei = json.loads(SPIELER.read_text(encoding="utf-8"))
    d = datei["minecraft:client_entity"]["description"]
    s = d["scripts"]
    unsere = {k for k, *_ in TEILE}
    s["initialize"] = [z for z in s["initialize"] if "fynn_" not in z] + INITIALISIEREN
    eigene_vars = ("variable.fynn_schwert", "variable.fynn_bogen", "variable.fynn_hieb", "variable.fynn_gang",
                   "variable.fynn_tempo", "variable.fynn_luft", "variable.fynn_lade", "variable.fynn_spannen",
                   "variable.fynn_los")
    s["pre_animation"] = [z for z in s["pre_animation"] if not z.startswith(eigene_vars)] + VORBERECHNUNG
    s["animate"] = [e for e in s["animate"] if (next(iter(e)) if isinstance(e, dict) else e) not in unsere]
    s["animate"] += [{k: bedingung} for k, _, _, bedingung in TEILE]
    for v in OEFFENTLICH:
        s["variables"][v] = "public"
    for k, name, *_ in TEILE:
        d["animations"][k] = name
    SPIELER.write_text(json.dumps(datei, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def klingenschlag():
    """Der alte Klingenschwung im Attachable ruht, wenn der Arm den Hieb
    fuehrt - sonst kaeme er zweimal. Fuer Stab und Hammer bleibt er."""
    pfad = RES / "animations" / "klinge.animation.json"
    datei = json.loads(pfad.read_text(encoding="utf-8"))
    knochen = datei["animations"]["animation.klinge.schlag"]["bones"]["stoss"]
    ruhe = "(1.0 - (c.owning_entity->v.fynn_schwert))"
    for kanal in ("rotation", "position"):
        neu = []
        for w in knochen[kanal]:
            if isinstance(w, str):
                w = w.split(" * (1.0 - (c.owning_entity")[0]
                w = f"{w} * {ruhe}"
            neu.append(w)
        knochen[kanal] = neu
    schreibe(pfad, datei)


def main():
    schreibe(RES / "animations" / "fynn_spieler.animation.json", animationen())
    spielerdatei()
    klingenschlag()
    print(f"gebaut: {len(TEILE)} Spielerbewegungen, Hieb fuer {len(HIEBWAFFEN)} Waffen")
    if "--bilder" in sys.argv:
        import spieler_bilder
        spieler_bilder.alle(Path(sys.argv[sys.argv.index("--bilder") + 1]))


if __name__ == "__main__":
    main()
