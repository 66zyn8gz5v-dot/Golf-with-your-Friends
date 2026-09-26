#!/usr/bin/env python3
"""Baut die Bewegungen des Spielers: Angriffe, Laufen, Schleichen, Sprung, Bogen.

Fynn: "mehr Animation vom Spieler, so Laufanimation, ein bisschen andere
Sneak-Animation ... dynamischer", und: "die Schlaganimation wird immer
noch nicht richtig ausgefuehrt bei den Schwertern ... man schwingt die nur
so leicht hin und her, aber man schlaegt nicht richtig zu."

Warum der alte Hieb nur wackelte: In der Ich-Sicht spielt Minecraft beim
Zuschlagen seine eigene Armbewegung - eine kleine Kreisbewegung, gemacht
fuer ein flaches Bild. Unsere Klingen drehten dazu nur sich selbst ein
Stueck (animation.klinge.schlag). Der Arm blieb, wo er war. Mit einem
grossen 3D-Schwert sieht das aus wie Zittern.

Jetzt fuehrt der Arm den Hieb, und jede Waffenart hat ihre eigene Folge
von Schlaegen - die stehen in kampf_animationen.py.

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
import kampf_animationen as k                       # noqa: E402
from dolche_bauen import schreibe                   # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
SPIELER = RES / "entity" / "player.entity.json"

# Was sich beim Schleichen aufladen laesst (Wirbelschlag, Schattensprung in
# kampf.js): Schwerter und Dolche.
HIEBWAFFEN = k.GEGENSTAENDE[k.SCHWERT] + k.GEGENSTAENDE[k.DOLCHE]
BOEGEN = ["minecraft:bow", "fynn:sturmbogen"]
PFEILE = ["minecraft:arrow", "fynn:eisenpfeil", "fynn:silberpfeil", "fynn:goldpfeil", "fynn:elektrumpfeil"]


def pfeilsuche():
    """Hat der Spieler irgendwo Pfeile? Zweithand, Schnellleiste, Rucksack.

    Molang kann in jeden Platz schauen (query.is_item_name_any mit Platz
    und Nummer), aber nur einzeln - also 37 Blicke. Das Spiel kennt so nur
    das eigene Inventar; bei Mitspielern bleibt der Koecher leer."""
    n = namen(PFEILE)
    teile = [f"query.is_item_name_any('slot.weapon.offhand', 0, {n})"]
    teile += [f"query.is_item_name_any('slot.hotbar', {i}, {n})" for i in range(9)]
    teile += [f"query.is_item_name_any('slot.inventory', {i}, {n})" for i in range(27)]
    return " || ".join(teile)


def namen(liste):
    return ", ".join(f"'{n}'" for n in liste)


# ------------------------------------------------------------ Variablen

INITIALISIEREN = k.INITIALISIEREN + [
    "variable.fynn_luft = 0.0;",
    "variable.fynn_sturz = 0.0;",
    "variable.fynn_flugzeit = 0.0;",
    "variable.fynn_flug = 0.0;",
    "variable.fynn_umhang = 4.0;",
    "variable.fynn_pfeile = 0.0;",
    "variable.fynn_pfeiltakt = 0.0;",
    "variable.fynn_lade = 0.0;",
    "variable.fynn_los = 0.0;",
    "variable.fynn_spannen_zuvor = 0.0;",
]

VORBERECHNUNG = [
    f"variable.fynn_schwert = query.is_item_name_any('slot.weapon.mainhand', {namen(HIEBWAFFEN)});",
    f"variable.fynn_bogen = query.is_item_name_any('slot.weapon.mainhand', {namen(BOEGEN)});",
    # Wie weit der Schritt gerade ist - derselbe Takt wie Minecrafts eigene
    # Beinbewegung (tcos0), damit Arme, Beine und Koerper zusammenpassen.
    "variable.fynn_gang = query.modified_distance_moved * 38.17;",
    "variable.fynn_tempo = math.clamp(query.modified_move_speed, 0.0, 1.0);",
    # In der Luft: weich ein- und ausgeblendet, sonst springt die Haltung
    # bei jeder Stufe, die man hochlaeuft.
    "variable.fynn_luft = math.lerp(variable.fynn_luft, (!query.is_on_ground && !query.is_in_water && "
    "!query.is_riding && !query.is_gliding && !query.is_swimming) ? 1.0 : 0.0, 0.2);",
    # Freier Fall, etwa vom Starttempel: schneller als 12 Bloecke je
    # Sekunde nach unten. Bremst der Fallschirm (langsames Fallen), loest
    # sich die Haltung wieder.
    "variable.fynn_sturz = math.lerp(variable.fynn_sturz, (!query.is_on_ground && query.vertical_speed < -12.0 && "
    "!query.is_gliding && !query.is_swimming && !query.is_riding) ? 1.0 : 0.0, 0.08);",
    # Fliegen im Kreativmodus. Minecraft verraet das nicht (query.is_flying
    # gibt es nicht), also wird es erkannt: Wer laenger als eine knappe
    # halbe Sekunde in der Luft ist, ohne zu fallen, fliegt. Ein Sprung
    # schwebt nur um den hoechsten Punkt herum so langsam - zu kurz. Beim
    # Hoch- und Runterfliegen bleibt der Wert stehen; echtes Fallen (schneller
    # als 12 je Sekunde) und der Boden setzen ihn zurueck.
    "variable.fynn_flugzeit = (query.is_on_ground || query.is_swimming || query.is_gliding || query.is_riding || "
    "query.is_levitating || query.vertical_speed < -12.0) ? 0.0 : (math.abs(query.vertical_speed) < 4.0 ? "
    "variable.fynn_flugzeit + query.delta_time : variable.fynn_flugzeit);",
    "variable.fynn_flug = math.lerp(variable.fynn_flug, math.clamp((variable.fynn_flugzeit - 0.45) / 0.35, 0.0, 1.0), 0.15);",
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
    # Wie weit der Umhang nach hinten weht, in Grad: im Stehen fast
    # senkrecht, im Gehen und Rennen hoch, im freien Fall fast waagerecht.
    # Weich nachgezogen, damit er nicht springt, wenn man anhaelt.
    # Im Flug liegt der Koerper schon schraeg im Wind - dort braucht der
    # Umhang nur wenig mehr, um waagerecht hinterherzuwehen.
    "variable.fynn_umhang = math.lerp(variable.fynn_umhang, (4.0 + 26.0 * variable.fynn_tempo + "
    "(query.is_sprinting ? 10.0 : 0.0) + (query.is_on_ground ? 0.0 : 8.0)) * (1.0 - variable.fynn_flug) + "
    "variable.fynn_flug * (6.0 + 25.0 * variable.fynn_tempo) + 60.0 * variable.fynn_sturz, 0.12);",
    # Pfeile im Inventar - nur jedes zwanzigste Bild nachgesehen, das sind
    # 37 Plaetze. Der Koecher des Waldlaeufers zeigt danach Pfeile oder nicht.
    "variable.fynn_pfeiltakt = variable.fynn_pfeiltakt + 1.0;",
    "variable.fynn_pfeile = math.mod(variable.fynn_pfeiltakt, 20.0) < 1.0 ? ((" + pfeilsuche() + ") ? 1.0 : 0.0) "
    ": variable.fynn_pfeile;",
    # Losgelassen: eine Viertelsekunde Rueckstoss.
    "variable.fynn_los = (variable.fynn_spannen_zuvor > 0.25 && variable.fynn_spannen <= 0.0) ? 1.0 : "
    "math.max(variable.fynn_los - query.delta_time * 4.0, 0.0);",
    "variable.fynn_spannen_zuvor = variable.fynn_spannen;",
] + k.vorberechnung() + k.rollen_vorberechnung()

# Das Attachable liest diese Werte ueber c.owning_entity - das Schwert
# seinen Hieb, die Ruestungen Umhang, Schritt und Pfeile.
OEFFENTLICH = ["variable.fynn_schwert", "variable.fynn_umhang", "variable.fynn_tempo",
               "variable.fynn_gang", "variable.fynn_pfeile"] + k.OEFFENTLICH


# ------------------------------------------------------------ Laufen

# Der Kopf wird nirgends gegengedreht: Mojangs Blickanimation rechnet ihn
# "relative_to entity", er schaut also aufs Ziel, egal wie Taille und
# Koerper darunter drehen.

GANG = "variable.fynn_gang"
TEMPO = "variable.fynn_tempo"
RENNEN = "(query.is_sprinting ? 1.0 : 0.0)"
# Die Arme schwingen nur, wenn sie frei sind - nicht beim Zielen.
FREI = "(variable.fynn_spannen <= 0.0)"

# Zweite Fassung, dynamischer (Fynn: "beim Laufen die Animation noch ein
# bisschen dynamischer"): tieferes Wippen, mehr Schulterdrehung, der
# Oberkoerper nickt bei jedem Schritt nach vorn und wiegt sich seitlich,
# die Arme schwingen weiter aus.
LAUFEN = {
    "loop": True,
    "bones": {
        # Der Koerper wippt: am tiefsten, wenn die Beine am weitesten
        # auseinander stehen, am hoechsten, wenn sie aneinander vorbei gehen.
        "root": {"position": [0.0, f"(math.abs(math.sin({GANG})) - 1.0) * 1.3 * {TEMPO}", 0.0]},
        # Die Schultern drehen gegen die Huefte, wie beim echten Gehen: Der
        # Arm, der vorn ist, nimmt seine Schulter mit. Bei jedem Aufsetzen
        # nickt der Oberkoerper ein wenig; beim Rennen lehnt er weit vor.
        "waist": {"rotation": [f"(4.0 + 10.0 * {RENNEN} + math.abs(math.cos({GANG})) * 3.0) * {TEMPO}",
                               f"-math.cos({GANG}) * 12.0 * {TEMPO}",
                               f"math.sin({GANG}) * 3.0 * {TEMPO}"]},
        # Mehr Schwung in den Armen, beim Rennen weit und abgespreizt. Die
        # Beine bleiben bei Minecrafts Schwung - der ist beim Rennen schon
        # 70 Grad.
        "rightarm": {"rotation": [f"-variable.tcos0 * (0.35 + 0.35 * {RENNEN}) * {FREI}", 0.0,
                                  f"(3.0 + 6.0 * {RENNEN}) * {TEMPO} * {FREI}"]},
        "leftarm": {"rotation": [f"variable.tcos0 * (0.35 + 0.35 * {RENNEN}) * {FREI}", 0.0,
                                 f"-(3.0 + 6.0 * {RENNEN}) * {TEMPO} * {FREI}"]},
    },
}

# Im Stehen atmet man: Der Oberkoerper hebt und senkt sich kaum sichtbar.
ATMEN = {
    "loop": True,
    "bones": {
        "waist": {"rotation": ["math.sin(query.life_time * 80.0) * 1.2", 0.0, 0.0]},
        "head": {"position": [0.0, "math.sin(query.life_time * 80.0) * 0.15", 0.0]},
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


# ------------------------------------------------------------ Fliegen

# Fliegen im Kreativmodus (Fynn: "im Kreativmodus brauchen wir auch eine
# Fluganimation"). Im Schweben ein ruhiges Auf und Ab, die Arme locker
# ausgebreitet, die Beine wechselnd; im Vorwaertsflug legt sich der
# Koerper nach vorn, je schneller, desto flacher, die Arme gehen an den
# Koerper - wie ein Held im Flug. Gedreht wird um die Koerpermitte.
NEIGUNG = f"(15.0 + 50.0 * {TEMPO})"
SCHWEBEN = f"(1.0 - {TEMPO})"
WELLE = "math.sin(query.life_time * 120.0)"
FLUG = {
    "loop": True,
    "bones": {
        "root": {"rotation": [f"{NEIGUNG} - this", 0.0, 0.0],
                 "position": [0.0, f"12.0 - 12.0 * math.cos({NEIGUNG}) + {WELLE} * 0.8 * {SCHWEBEN} - this",
                              f"12.0 * math.sin({NEIGUNG}) - this"]},
        "waist": {"rotation": ["-this", "-this", "-this"]},
        "rightarm": {"rotation": [f"-15.0 + 40.0 * {TEMPO} + {WELLE} * 5.0 * {SCHWEBEN} - this", "-this",
                                  f"14.0 - 8.0 * {TEMPO} - this"]},
        "leftarm": {"rotation": [f"-15.0 + 40.0 * {TEMPO} - {WELLE} * 5.0 * {SCHWEBEN} - this", "-this",
                                 f"-14.0 + 8.0 * {TEMPO} - this"]},
        "rightleg": {"rotation": [f"10.0 + {WELLE} * 8.0 * {SCHWEBEN} - this", "-this", "3.0 - this"]},
        "leftleg": {"rotation": [f"4.0 - {WELLE} * 8.0 * {SCHWEBEN} - this", "-this", "-3.0 - this"]},
    },
}


# ------------------------------------------------------------ Sturz

# Fallschirmspringer: der Koerper flach, Bauch nach unten, Arme und Beine
# weit gespreizt, die Arme flattern im Fahrtwind. Fynn wollte beim Sprung
# vom Starttempel "eine Fallanimation" - und dabei die Gegend sehen.
# Gedreht wird um die Koerpermitte, nicht um die Fuesse (dort sitzt der
# Drehpunkt von root) - sonst schwaenge der ganze Spieler zur Seite weg.
FLATTERN = "math.sin(query.life_time * 1500.0)"
STURZ = {
    "loop": True,
    "bones": {
        "root": {"rotation": ["70.0 - this", 0.0, 0.0],
                 "position": [0.0, "12.0 - 12.0 * math.cos(70.0) - this",
                              "-12.0 * math.sin(70.0) * -1.0 - this"]},
        "waist": {"rotation": ["-this", "-this", "-this"]},
        # Die Arme seitlich weit ab und nach vorn, wie Fluegel. (Bei
        # gehobenem Arm spreizt z mit umgekehrtem Vorzeichen ab.)
        "rightarm": {"rotation": [f"-130.0 + {FLATTERN} * 4.0 - this", "-this", f"-55.0 + {FLATTERN} * 3.0 - this"]},
        "leftarm": {"rotation": [f"-130.0 - {FLATTERN} * 4.0 - this", "-this", f"55.0 - {FLATTERN} * 3.0 - this"]},
        "rightleg": {"rotation": [f"10.0 + {FLATTERN} * 2.0 - this", "-this", "18.0 - this"]},
        "leftleg": {"rotation": [f"10.0 - {FLATTERN} * 2.0 - this", "-this", "-18.0 - this"]},
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
# Deshalb die Angriffe zuletzt - sie ersetzen die Arme ganz.
TEILE = [
    ("fynn_laufen", "animation.fynn.laufen", LAUFEN,
     f"{BEWEGT} && !query.is_sneaking && variable.fynn_luft < 0.5"),
    ("fynn_atmen", "animation.fynn.atmen", ATMEN,
     f"{BEWEGT} && !query.is_sneaking && variable.fynn_tempo < 0.05 && variable.fynn_luft < 0.5"),
    ("fynn_schleichen", "animation.fynn.schleichen", SCHLEICHEN,
     f"{BEWEGT} && query.is_sneaking && !query.is_item_name_any('slot.weapon.mainhand', 'fynn:degen')"),
] + k.haltungen(BEWEGT) + [
    ("fynn_luft", "animation.fynn.luft", LUFT, f"({BEWEGT}) * variable.fynn_luft * (1.0 - variable.fynn_flug)"),
    ("fynn_flug", "animation.fynn.flug", FLUG, f"({AUSSEN_FREI} && !query.is_gliding) * variable.fynn_flug"),
    ("fynn_sturz", "animation.fynn.sturz", STURZ, f"({AUSSEN_FREI}) * variable.fynn_sturz"),
    ("fynn_aufladen", "animation.fynn.aufladen", AUFLADEN, f"{BEWEGT} && variable.fynn_lade > 0.0"),
    ("fynn_aufladen_ich", "animation.fynn.aufladen_ich", AUFLADEN_ICH,
     "variable.is_first_person && !variable.is_paperdoll && variable.fynn_lade > 0.0 && variable.fynn_hiebzeit <= 0.0"),
    ("fynn_bogen_aussen", "animation.fynn.bogen_aussen", BOGEN_AUSSEN,
     f"{AUSSEN_FREI} && (variable.fynn_spannen > 0.0 || variable.fynn_los > 0.0)"),
    ("fynn_bogen_ich", "animation.fynn.bogen_ich", BOGEN_ICH,
     "variable.is_first_person && !variable.is_paperdoll && (variable.fynn_spannen >= 1.0 || variable.fynn_los > 0.0)"),
] + k.teile(AUSSEN_FREI) + k.rollen_teile(AUSSEN_FREI)


def animationen():
    fertig = {}
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
    unsere = {n for n, *_ in TEILE}
    # Auch was fruehere Fassungen hatten und diese nicht mehr: die alten
    # Hiebe (fynn_hieb_*), die nur Vorhand und Rueckhand kannten.
    alt = [n for n in d["animations"] if n.startswith(("fynn_hieb", "fynn_a_", "fynn_i_", "fynn_h_"))]
    for n in alt:
        del d["animations"][n]
    unsere |= set(alt)
    s["initialize"] = [z for z in s["initialize"] if "fynn_" not in z] + INITIALISIEREN
    eigene_vars = ("variable.fynn_schwert", "variable.fynn_bogen", "variable.fynn_hieb", "variable.fynn_gang",
                   "variable.fynn_tempo", "variable.fynn_luft", "variable.fynn_sturz", "variable.fynn_umhang",
                   "variable.fynn_flug", "variable.fynn_dolche",
                   "variable.fynn_pfeil", "variable.fynn_lade", "variable.fynn_spannen",
                   "variable.fynn_los") + k.EIGENE_VARS
    s["pre_animation"] = [z for z in s["pre_animation"] if not z.startswith(eigene_vars)] + VORBERECHNUNG
    s["animate"] = [e for e in s["animate"] if (next(iter(e)) if isinstance(e, dict) else e) not in unsere]
    s["animate"] += [{n: bedingung} for n, _, _, bedingung in TEILE]
    # Nur unsere eigenen oeffentlichen Werte neu setzen; was eine fruehere
    # Fassung freigab und diese nicht mehr kennt, kommt weg.
    for v in [v for v in s["variables"] if v.startswith("variable.fynn_") and v not in OEFFENTLICH]:
        del s["variables"][v]
    for v in OEFFENTLICH:
        s["variables"][v] = "public"
    for n, name, *_ in TEILE:
        d["animations"][n] = name
    SPIELER.write_text(json.dumps(datei, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def klingenschlag():
    """Der alte Klingenschwung im Attachable ruht, wenn der Arm den Schlag
    fuehrt - sonst kaeme er zweimal. Beim Ritter (fynn_waffe bleibt dort 0)
    und bei allem, was keine Waffenart hat, bleibt er."""
    ruhe = "(1.0 - ((c.owning_entity->v.fynn_waffe) > 0.0))"
    for datei_name, anim in (("klinge.animation.json", "animation.klinge.schlag"),
                             ("degen.animation.json", "animation.degen.schlag")):
        pfad = RES / "animations" / datei_name
        datei = json.loads(pfad.read_text(encoding="utf-8"))
        knochen = datei["animations"][anim]["bones"]["stoss"]
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
    anzahl = sum(len(v) for v in k.ANGRIFFE.values())
    print(f"gebaut: {len(TEILE)} Spielerbewegungen, {anzahl} Angriffe fuer {len(k.ANGRIFFE)} Waffenarten")
    if "--bilder" in sys.argv:
        import spieler_bilder
        spieler_bilder.alle(Path(sys.argv[sys.argv.index("--bilder") + 1]))


if __name__ == "__main__":
    main()
