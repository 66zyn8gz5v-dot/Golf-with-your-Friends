#!/usr/bin/env python3
"""Die Angriffe - je Waffenart eine eigene Folge von Schlaegen.

Fynn: "neue Kampfanimationen ... fuer die ganzen Waffen, die wir haben ...
verschiedene Attacken ... die Kampftechnik an sich crazy ueberarbeiten."

Vorbild ist Better Combat (ein Java-Mod): Dort hat jede Waffenart eine
eigene Schlagfolge, und wer schnell nachsetzt, bekommt den naechsten Schlag
der Folge statt immer denselben. Jeder Schlag hat vier Abschnitte -
Ausholen, Treffen, Nachschwingen, Zuruecknehmen. Das Schwert etwa: Hieb von
rechts, Hieb von links, Stich. Hier genauso:

    Schwert   Vorhand, Rueckhand, Ausfallstich
    Dolche    Schnitt rechts, Rueckgriff-Schnitt links, Stich, Kreuzschnitt
    Hammer    Schlag von oben mit beiden Haenden, Rundschlag
    Degen     Ausfall, Schnitt
    Stab      Rundschlag, Schlag von oben
    Wurfstern Wurf ueber die Schulter

Warum ein eigener Zaehler statt Minecrafts v.attack_time: Der laeuft bei
jedem Schlag gleich lang, etwa eine Viertelsekunde. Ein Hammer, der so
schnell niedergeht wie ein Dolch, wirkt wie aus Pappe. v.fynn_hiebzeit
laeuft je Schlag verschieden schnell von 0 bis 1 (v.fynn_hiebdauer), und
"anim_time_update" macht daraus die Zeit der Animation.

Ein neuer Klick zaehlt erst, wenn der laufende Schlag getroffen hat (ab
0.55). Vorher geht er ins Leere - sonst risse jeder hastige Klick den
Schlag mittendrin ab und finge von vorn an. Wer innerhalb von 0.8
Sekunden nach dem Ende nachsetzt, bleibt in der Folge; sonst beginnt sie
wieder beim ersten Schlag.

Schaden und Reichweite macht weiter das Spiel. Die Folge ist Bewegung, kein
neues Kampfsystem auf dem Server: Der Server weiss nicht, welcher Schlag
gerade zu sehen ist, und muesste raten.
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import haltung as h                                 # noqa: E402
from spieler_ansehen import drehmatrix              # noqa: E402


# ------------------------------------------------------------ Waffenarten

SCHWERT, DOLCHE, HAMMER, DEGEN, STAB, WURF = 1, 2, 3, 4, 5, 6

GEGENSTAENDE = {
    SCHWERT: ["minecraft:wooden_sword", "minecraft:stone_sword", "minecraft:iron_sword",
              "minecraft:golden_sword", "minecraft:diamond_sword", "minecraft:netherite_sword",
              "minecraft:copper_sword",
              "fynn:ritterschwert", "fynn:eisenklinge", "fynn:silberklinge",
              "fynn:elektrumklinge", "fynn:sternenklinge"],
    DOLCHE: ["fynn:eisendolche", "fynn:silberdolche", "fynn:stahldolche",
             "fynn:elektrumdolche", "fynn:diamantdolche", "fynn:netheritdolche"],
    # Der Streitkolben aus Minecraft ist auch ein Hammer.
    HAMMER: ["fynn:kriegshammer", "minecraft:mace"],
    DEGEN: ["fynn:degen"],
    STAB: ["fynn:feuerstab", "fynn:feuerstab_2", "fynn:frostzepter"],
    # Der Wurfstern wird geworfen, aber das Spiel meldet den Wurf wie einen
    # Schlag (do_swing_animation) - so bekommt er seine Wurfbewegung.
    WURF: ["fynn:wurfstern"],
}


def namen(liste):
    return ", ".join(f"'{n}'" for n in liste)


# ------------------------------------------------------------ Schluessel

def K(t, **kanaele):
    """Eine Schluesselhaltung von aussen. Kanaele:
    ra, la  rechter, linker Arm (x, y, z) - absolut, wie Bedrock sie misst:
            x negativ hebt nach vorn und oben, y negativ zieht den rechten
            Arm vor den Koerper, z positiv spreizt ihn ab
    ta      Taille (x vornueber, y positiv nimmt die rechte Schulter zurueck)
    rb, lb  Beine (x negativ ist vorn)
    rg, lg  Handgelenke: x positiv kippt die Klinge in Richtung des Arms
    wu      Wurzel verschoben (y hoch, z vorwaerts) - Ausfallschritt, Ducken
    """
    return (t, kanaele)


def I(t, schulter=0.0, rollen=0.0, nicken=0.0, schub=(0.0, 0.0, 0.0)):
    """Eine Schluesselhaltung aus der Ich-Sicht: Schulter rollen (um die
    Blickachse, plus gegen den Uhrzeigersinn), Handgelenk rollen,
    Handgelenk nicken (plus kippt die Klinge vom Auge weg), Hand
    verschieben (x rechts, y oben, z vom Auge weg)."""
    return (t, schulter, rollen, nicken, tuple(schub))


RUHE_ICH = [I(0.0), I(1.0)]


class Angriff:
    def __init__(self, name, dauer, aussen, ich, links_ich=None, ein=0.1, aus=0.62):
        self.name = name
        self.dauer = dauer
        self.aussen = aussen
        self.ich = ich
        # Was der linke Dolch in der Ich-Sicht tut (dolche_bauen liest es).
        self.links_ich = links_ich
        self.ein = ein
        self.aus = aus


def spiegeln(folge):
    """Derselbe Schlag mit der anderen Hand: rechts und links getauscht,
    und was um y und z dreht, dreht andersherum."""
    tausch = {"ra": "la", "la": "ra", "rb": "lb", "lb": "rb", "rg": "lg", "lg": "rg"}
    aus = []
    for t, k in folge:
        neu = {}
        for name, wert in k.items():
            ziel = tausch.get(name, name)
            if name == "wu":
                neu[ziel] = (-wert[0], wert[1], wert[2])
            else:
                neu[ziel] = (wert[0], -wert[1], -wert[2])
        aus.append((t, neu))
    return aus


def ich_spiegeln(folge):
    return [(t, -s, -r, n, (-x, y, z)) for t, s, r, n, (x, y, z) in folge]


# ------------------------------------------------------------ Schwert
#
# Der Hieb selbst liegt bei allen Schlaegen zwischen 0.25 und 0.5; davor
# holt der Koerper aus, danach schwingt er nach und nimmt sich zurueck.

SCHWERT_VORHAND = Angriff("vorhand", 0.45, [
    K(0.00),
    # Hoch ueber die rechte Schulter, der Oberkoerper dreht weit auf.
    K(0.22, ra=(-165, 25, 15), la=(-35, 0, -10), ta=(-4, 32, 0), rb=(6, 0, 0), lb=(-4, 0, 0), rg=(-20, 0, 0)),
    K(0.36, ra=(-110, -15, 5), la=(-10, 0, -15), ta=(4, 5, 0), rb=(-8, 0, 0), lb=(6, 0, 0), rg=(10, 0, 0)),
    # Quer vor dem Koerper durch, die Klinge zeigt nach unten durch.
    K(0.48, ra=(-55, -45, 0), la=(25, 0, -20), ta=(8, -25, 0), rb=(-16, 0, 0), lb=(10, 0, 0), rg=(55, 0, 0),
      wu=(0, -0.6, 0.8)),
    K(0.62, ra=(-30, -55, 5), la=(30, 0, -20), ta=(6, -32, 0), rb=(-16, 0, 0), lb=(10, 0, 0), rg=(75, 0, 0),
      wu=(0, -0.6, 0.8)),
    K(1.00),
], [
    I(0.00),
    I(0.18, -5, -15, 5, (-2, 6, 0)),       # ausholen: hoch, Klinge nach rechts
    I(0.32, 20, 30, 20, (-1, 3, 3)),       # durchziehen
    I(0.44, 45, 80, 35, (-3, 1, 4)),       # quer durchs Bild
    I(0.56, 65, 110, 60, (-4, -1, 3)),     # nach links unten
    I(0.76, 50, 60, 30, (-2, -9, 0)),      # unter dem Bildrand zurueck
    I(1.00),
])

SCHWERT_RUECKHAND = Angriff("rueckhand", 0.45, [
    K(0.00),
    K(0.22, ra=(-140, -60, 0), la=(-20, 0, -10), ta=(-4, -30, 0), rb=(-6, 0, 0), lb=(4, 0, 0), rg=(-15, 0, 0)),
    K(0.36, ra=(-105, -20, 10), la=(-5, 0, -15), ta=(4, -5, 0), rb=(-8, 0, 0), lb=(6, 0, 0), rg=(10, 0, 0)),
    K(0.48, ra=(-70, 35, 30), la=(20, 0, -20), ta=(6, 25, 0), rb=(-14, 0, 0), lb=(8, 0, 0), rg=(50, 0, 0)),
    K(0.62, ra=(-40, 50, 40), la=(25, 0, -20), ta=(4, 30, 0), rb=(-14, 0, 0), lb=(8, 0, 0), rg=(70, 0, 0)),
    K(1.00),
], [
    I(0.00),
    I(0.18, 35, 55, -5, (-2, 5, 0)),       # ausholen nach links oben
    I(0.32, 25, 10, 20, (0, 3, 3)),
    I(0.44, 5, -50, 35, (1, 1, 4)),
    I(0.56, -10, -80, 60, (2, -1, 3)),     # nach rechts unten
    I(0.76, 0, -40, 30, (1, -9, 0)),
    I(1.00),
])

# Der Ausfallstich beendet die Folge: zurueckgenommen, die rechte Schulter
# weit hinten, dann mit einem langen Schritt nach vorn, die Klinge in
# Verlaengerung des Arms. Das Handgelenk haelt die Klinge dabei immer
# waagerecht (rg = -Armwinkel).
SCHWERT_STICH = Angriff("stich", 0.55, [
    K(0.00),
    K(0.28, ra=(30, 10, 18), la=(-55, 0, -18), ta=(-5, 38, 0), rb=(14, 0, 0), lb=(-16, 0, 0), rg=(-30, 0, 0),
      wu=(0, -0.4, -0.8)),
    K(0.44, ra=(-88, 22, 0), la=(35, 0, -28), ta=(10, -30, 0), rb=(-42, 0, 0), lb=(26, 0, 0), rg=(86, 0, 0),
      wu=(0, -1.6, 3.5)),
    K(0.62, ra=(-86, 22, 0), la=(32, 0, -26), ta=(10, -32, 0), rb=(-40, 0, 0), lb=(25, 0, 0), rg=(84, 0, 0),
      wu=(0, -1.6, 3.5)),
    K(1.00),
], [
    I(0.00),
    I(0.28, 0, 0, -10, (2, -1, -2)),       # zurueckgenommen
    I(0.42, 0, 0, 55, (-4, 3, 9)),         # in die Bildmitte gestossen
    I(0.62, 0, 0, 52, (-4, 3, 8)),
    I(1.00),
], aus=0.66)


# ------------------------------------------------------------ Dolche
#
# Schnell und kurz. Der rechte Dolch liegt normal in der Hand, der linke
# im Rueckgriff am Unterarm (dolche_bauen) - ein Rueckgriff-Schnitt ist ein
# Haken mit der Faust, die Klinge folgt hinter ihr.

DOLCH_SCHNITT = Angriff("schnitt", 0.3, [
    K(0.00),
    K(0.22, ra=(-85, 45, 30), la=(-60, 25, -8), ta=(0, 28, 0), rg=(15, 0, 0), rb=(4, 0, 0), lb=(-4, 0, 0)),
    K(0.45, ra=(-78, -55, 0), la=(-55, 20, -8), ta=(6, -26, 0), rg=(80, 0, 0), rb=(-10, 0, 0), lb=(6, 0, 0),
      wu=(0, -0.4, 0.8)),
    K(0.62, ra=(-68, -62, 0), la=(-55, 20, -8), ta=(6, -30, 0), rg=(85, 0, 0), rb=(-10, 0, 0), lb=(6, 0, 0),
      wu=(0, -0.4, 0.8)),
    K(1.00),
], [
    I(0.00),
    I(0.20, -8, -20, 0, (1, 3, 0)),
    I(0.40, 30, 60, 35, (-2, 1, 3)),
    I(0.56, 50, 90, 45, (-3, -1, 2)),
    I(0.80, 30, 40, 20, (-1, -6, 0)),
    I(1.00),
])

# Der linke Dolch fuehrt: dieselbe Bewegung gespiegelt. Aus der Ich-Sicht
# sticht der linke Dolch ins Bild (dolche_bauen), der rechte Arm nimmt sich
# etwas zurueck und macht Platz.
DOLCH_LINKS = Angriff("links", 0.3, spiegeln(DOLCH_SCHNITT.aussen), [
    I(0.00),
    I(0.35, 0, 0, -8, (2, -3, -1)),
    I(0.65, 0, 0, -8, (2, -3, -1)),
    I(1.00),
], links_ich="stich")

DOLCH_STICH = Angriff("stich", 0.3, [
    K(0.00),
    K(0.25, ra=(-25, 15, 12), la=(-60, 25, -8), ta=(0, 28, 0), rg=(-25, 0, 0), rb=(6, 0, 0), lb=(-6, 0, 0)),
    K(0.42, ra=(-90, 18, 0), la=(-40, 10, -15), ta=(6, -26, 0), rg=(88, 0, 0), rb=(-24, 0, 0), lb=(14, 0, 0),
      wu=(0, -0.8, 2.2)),
    K(0.62, ra=(-88, 18, 0), la=(-40, 10, -15), ta=(6, -26, 0), rg=(86, 0, 0), rb=(-24, 0, 0), lb=(14, 0, 0),
      wu=(0, -0.8, 2.2)),
    K(1.00),
], [
    I(0.00),
    I(0.25, 0, 0, -12, (2, -2, -3)),
    I(0.40, 0, 0, 72, (-4, 3, 8)),
    I(0.62, 0, 0, 68, (-4, 3, 7)),
    I(1.00),
])

# Zum Schluss beide zugleich: die Arme ueber dem Kopf gekreuzt, dann
# schlagen beide Klingen nach unten und aussen auseinander - ein X.
DOLCH_KREUZ = Angriff("kreuz", 0.45, [
    K(0.00),
    K(0.30, ra=(-155, -35, 0), la=(-155, 35, 0), ta=(-10, 0, 0), rg=(-10, 0, 0), lg=(-10, 0, 0),
      rb=(4, 0, 0), lb=(-4, 0, 0), wu=(0, 0.6, 0)),
    K(0.48, ra=(-45, 40, 38), la=(-45, -40, -38), ta=(16, 0, 0), rg=(60, 0, 0), lg=(60, 0, 0),
      rb=(-20, 0, 0), lb=(18, 0, 0), wu=(0, -2.0, 1.2)),
    K(0.64, ra=(-35, 45, 42), la=(-35, -45, -42), ta=(18, 0, 0), rg=(70, 0, 0), lg=(70, 0, 0),
      rb=(-20, 0, 0), lb=(18, 0, 0), wu=(0, -2.2, 1.2)),
    K(1.00),
], [
    I(0.00),
    I(0.28, -10, -20, -30, (1, 7, -2)),
    I(0.46, 25, 35, 65, (-2, -3, 4)),
    I(0.64, 30, 40, 60, (-2, -6, 3)),
    I(1.00),
], links_ich="schnitt", aus=0.66)


# ------------------------------------------------------------ Hammer
#
# Schwer und mit beiden Haenden. Weit ausholen, einen Augenblick oben
# stehen - dann faellt er, und der ganze Koerper geht mit in die Knie.

HAMMER_OBEN = Angriff("oben", 0.75, [
    K(0.00),
    K(0.32, ra=(-172, -18, 0), la=(-172, 18, 0), ta=(-14, 8, 0), rg=(-35, 0, 0), rb=(4, 0, 0), lb=(-10, 0, 0),
      wu=(0, 0.4, -0.6)),
    K(0.40, ra=(-176, -18, 0), la=(-176, 18, 0), ta=(-16, 8, 0), rg=(-40, 0, 0), rb=(4, 0, 0), lb=(-10, 0, 0),
      wu=(0, 0.5, -0.6)),
    K(0.52, ra=(-48, -22, 0), la=(-48, 22, 0), ta=(28, 0, 0), rg=(35, 0, 0), rb=(-28, 0, 0), lb=(18, 0, 0),
      wu=(0, -2.6, 1.6)),
    K(0.70, ra=(-44, -22, 0), la=(-44, 22, 0), ta=(26, 0, 0), rg=(38, 0, 0), rb=(-28, 0, 0), lb=(18, 0, 0),
      wu=(0, -2.4, 1.6)),
    K(1.00),
], [
    I(0.00),
    I(0.32, 10, 20, -20, (1, 5, 0)),       # hoch erhoben, der Kopf gross im Bild
    I(0.40, 12, 22, -25, (1, 6, 0)),
    I(0.52, 10, 10, 75, (-4, -1, 7)),      # nieder in die Bildmitte
    I(0.72, 10, 10, 72, (-4, -2, 6)),
    I(1.00),
], ein=0.14, aus=0.7)

HAMMER_RUND = Angriff("rund", 0.6, [
    K(0.00),
    K(0.30, ra=(-65, 55, 30), la=(-72, 60, 0), ta=(0, 50, 0), rg=(30, 0, 0), rb=(8, 0, 0), lb=(-8, 0, 0)),
    K(0.50, ra=(-78, -55, 0), la=(-72, -25, -20), ta=(6, -48, 0), rg=(50, 0, 0), rb=(-16, 0, 0), lb=(10, 0, 0),
      wu=(0, -1.0, 0.6)),
    K(0.66, ra=(-70, -62, 0), la=(-65, -30, -22), ta=(6, -55, 0), rg=(55, 0, 0), rb=(-16, 0, 0), lb=(10, 0, 0),
      wu=(0, -1.0, 0.6)),
    K(1.00),
], [
    I(0.00),
    I(0.28, -10, -20, 0, (1, 3, 0)),
    I(0.44, 25, 50, 30, (-1, 1, 4)),
    I(0.58, 60, 100, 55, (-5, -2, 3)),
    I(0.80, 45, 60, 30, (-3, -9, 0)),
    I(1.00),
], ein=0.12, aus=0.68)


# ------------------------------------------------------------ Degen
#
# Fechten: seitlich zum Gegner, die freie Hand hoch hinter dem Kopf. Der
# Ausfall ist ein langer, flacher Schritt, der Arm eine Linie bis zur Spitze.

DEGEN_AUSFALL = Angriff("ausfall", 0.35, [
    K(0.00),
    K(0.25, ra=(-70, 30, 8), la=(-150, 0, -45), ta=(0, -30, 0), rg=(60, 0, 0), rb=(-8, 0, 0), lb=(10, 0, 0)),
    K(0.42, ra=(-90, 40, 0), la=(-120, 0, -70), ta=(6, -42, 0), rg=(88, 0, 0), rb=(-48, 0, 0), lb=(32, 0, 0),
      wu=(0, -2.2, 4.0)),
    K(0.62, ra=(-89, 40, 0), la=(-120, 0, -70), ta=(6, -42, 0), rg=(86, 0, 0), rb=(-46, 0, 0), lb=(30, 0, 0),
      wu=(0, -2.2, 4.0)),
    K(1.00),
], [
    I(0.00),
    I(0.22, 0, 0, 5, (1, 0, -1)),
    I(0.40, 0, 0, 76, (-4, 3, 10)),
    I(0.62, 0, 0, 72, (-4, 3, 9)),
    I(1.00),
])

DEGEN_SCHNITT = Angriff("schnitt", 0.4, [
    K(0.00),
    K(0.24, ra=(-135, 20, 22), la=(-140, 0, -45), ta=(0, 20, 0), rg=(-10, 0, 0)),
    K(0.44, ra=(-60, -40, 0), la=(-130, 0, -55), ta=(4, -28, 0), rg=(70, 0, 0), rb=(-12, 0, 0), lb=(8, 0, 0)),
    K(0.60, ra=(-45, -48, 0), la=(-130, 0, -55), ta=(4, -32, 0), rg=(75, 0, 0), rb=(-12, 0, 0), lb=(8, 0, 0)),
    K(1.00),
], [
    I(0.00),
    I(0.20, -8, -25, -10, (-1, 6, 0)),
    I(0.38, 30, 60, 30, (-2, 1, 4)),
    I(0.54, 55, 95, 55, (-4, -2, 3)),
    I(0.78, 40, 50, 25, (-2, -9, 0)),
    I(1.00),
])


# ------------------------------------------------------------ Stab
#
# Mit beiden Haenden gefuehrt wie ein Kampfstab: ein weiter Rundschlag,
# dann von oben.

STAB_RUND = Angriff("rund", 0.5, [
    K(0.00),
    K(0.28, ra=(-70, 50, 28), la=(-75, 55, 0), ta=(0, 42, 0), rg=(20, 0, 0), rb=(6, 0, 0), lb=(-6, 0, 0)),
    K(0.48, ra=(-80, -50, 0), la=(-75, -20, -20), ta=(6, -42, 0), rg=(45, 0, 0), rb=(-14, 0, 0), lb=(8, 0, 0),
      wu=(0, -0.6, 0.6)),
    K(0.64, ra=(-72, -58, 0), la=(-70, -26, -22), ta=(6, -48, 0), rg=(50, 0, 0), rb=(-14, 0, 0), lb=(8, 0, 0),
      wu=(0, -0.6, 0.6)),
    K(1.00),
], [
    I(0.00),
    I(0.25, -10, -20, 0, (1, 3, 0)),
    I(0.42, 25, 50, 30, (-1, 1, 4)),
    I(0.56, 55, 95, 50, (-4, -2, 3)),
    I(0.80, 40, 55, 25, (-2, -9, 0)),
    I(1.00),
])

STAB_OBEN = Angriff("oben", 0.55, [
    K(0.00),
    K(0.32, ra=(-165, -15, 0), la=(-165, 15, 0), ta=(-10, 6, 0), rg=(-25, 0, 0), rb=(4, 0, 0), lb=(-8, 0, 0),
      wu=(0, 0.3, 0)),
    K(0.50, ra=(-55, -20, 0), la=(-55, 20, 0), ta=(20, 0, 0), rg=(40, 0, 0), rb=(-22, 0, 0), lb=(14, 0, 0),
      wu=(0, -1.8, 1.2)),
    K(0.66, ra=(-50, -20, 0), la=(-50, 20, 0), ta=(20, 0, 0), rg=(42, 0, 0), rb=(-22, 0, 0), lb=(14, 0, 0),
      wu=(0, -1.8, 1.2)),
    K(1.00),
], [
    I(0.00),
    I(0.30, 10, 20, -20, (1, 5, 0)),
    I(0.48, 10, 10, 75, (-4, -1, 7)),
    I(0.66, 10, 10, 72, (-4, -2, 6)),
    I(1.00),
], aus=0.68)


# ------------------------------------------------------------ Wurfstern

WURF_SCHULTER = Angriff("wurf", 0.4, [
    K(0.00),
    # Weit hinter den Kopf, die freie Hand zielt.
    K(0.30, ra=(-160, 15, 25), la=(-82, -12, -5), ta=(-6, 40, 0), rg=(-20, 0, 0), rb=(10, 0, 0), lb=(-14, 0, 0)),
    K(0.46, ra=(-62, -38, 0), la=(12, 0, -20), ta=(10, -34, 0), rg=(40, 0, 0), rb=(-20, 0, 0), lb=(14, 0, 0),
      wu=(0, -0.6, 1.2)),
    K(0.64, ra=(-32, -50, 5), la=(15, 0, -20), ta=(8, -38, 0), rg=(50, 0, 0), rb=(-20, 0, 0), lb=(14, 0, 0),
      wu=(0, -0.6, 1.2)),
    K(1.00),
], [
    I(0.00),
    I(0.30, 10, 20, -20, (1, 5, 0)),       # hoch hinter den Kopf
    I(0.46, 20, 10, 70, (-3, -2, 6)),
    I(0.70, 10, 0, 40, (-1, -8, 2)),
    I(1.00),
])


ANGRIFFE = {
    SCHWERT: [SCHWERT_VORHAND, SCHWERT_RUECKHAND, SCHWERT_STICH],
    DOLCHE: [DOLCH_SCHNITT, DOLCH_LINKS, DOLCH_STICH, DOLCH_KREUZ],
    HAMMER: [HAMMER_OBEN, HAMMER_RUND],
    DEGEN: [DEGEN_AUSFALL, DEGEN_SCHNITT],
    STAB: [STAB_RUND, STAB_OBEN],
    WURF: [WURF_SCHULTER],
}
ARTNAME = {SCHWERT: "schwert", DOLCHE: "dolche", HAMMER: "hammer", DEGEN: "degen", STAB: "stab", WURF: "wurf"}


# ------------------------------------------------------------ Molang

# Ab wann der naechste Klick zaehlt, und wie lange nach dem Ende die Folge
# noch weitergeht.
NACHSETZEN_AB = 0.55
FOLGE_OFFEN = 0.8


def _auswahl(werte, var, sonst="0.0"):
    """(var == k1) ? w1 : ((var == k2) ? w2 : ...) - Molang kennt kein switch."""
    aus = sonst
    for k, w in reversed(list(werte.items())):
        aus = f"({var} == {k:.1f} ? {w} : {aus})"
    return aus


def waffenart():
    aus = "0.0"
    for art in reversed(list(GEGENSTAENDE)):
        aus = f"(query.is_item_name_any('slot.weapon.mainhand', {namen(GEGENSTAENDE[art])}) ? {art:.1f} : {aus})"
    return aus


INITIALISIEREN = [
    "variable.fynn_waffe = 0.0;",
    "variable.fynn_schlag = 0.0;",
    "variable.fynn_kombo_waffe = 0.0;",
    "variable.fynn_hiebzeit = 0.0;",
    "variable.fynn_hiebdauer = 0.4;",
    "variable.fynn_hieb_ende = -10.0;",
    "variable.fynn_hieb_zuvor = 0.0;",
]


def vorberechnung():
    anzahl = _auswahl({a: f"{len(l):.1f}" for a, l in ANGRIFFE.items()}, "variable.fynn_waffe", "1.0")
    dauer = _auswahl({a: _auswahl({i: f"{x.dauer}" for i, x in enumerate(l)}, "variable.fynn_schlag", "0.4")
                      for a, l in ANGRIFFE.items()}, "variable.fynn_waffe", "0.4")
    return [
        f"variable.fynn_waffe = {waffenart()};",
        # Ein neuer Schlag beginnt, wenn Minecrafts Zaehler von null
        # loslaeuft - oder neu anfaengt, bevor der alte fertig war.
        "variable.fynn_hieb_neu = variable.attack_time > 0.0 && (variable.fynn_hieb_zuvor <= 0.0 || "
        "variable.attack_time < variable.fynn_hieb_zuvor);",
        "variable.fynn_hieb_zuvor = variable.attack_time;",
        f"variable.fynn_hieb_start = variable.fynn_hieb_neu && variable.fynn_waffe > 0.0 && "
        f"(variable.fynn_hiebzeit <= 0.0 || variable.fynn_hiebzeit >= {NACHSETZEN_AB});",
        # Weiter in der Folge, wenn schnell nachgesetzt wird und die Waffe
        # dieselbe ist; sonst wieder der erste Schlag.
        f"variable.fynn_schlag = variable.fynn_hieb_start ? ((variable.fynn_waffe == variable.fynn_kombo_waffe && "
        f"query.life_time - variable.fynn_hieb_ende < {FOLGE_OFFEN}) ? math.mod(variable.fynn_schlag + 1.0, {anzahl}) "
        f": 0.0) : variable.fynn_schlag;",
        "variable.fynn_kombo_waffe = variable.fynn_hieb_start ? variable.fynn_waffe : variable.fynn_kombo_waffe;",
        f"variable.fynn_hiebdauer = variable.fynn_hieb_start ? {dauer} : variable.fynn_hiebdauer;",
        "variable.fynn_hiebzeit = variable.fynn_hieb_start ? 0.01 : ((variable.fynn_hiebzeit > 0.0 && "
        "variable.fynn_hiebzeit + query.delta_time / variable.fynn_hiebdauer < 1.0) ? "
        "variable.fynn_hiebzeit + query.delta_time / variable.fynn_hiebdauer : 0.0);",
        # Waffe gewechselt: Der Schlag bricht ab, statt mit der neuen Waffe
        # weiterzulaufen.
        "variable.fynn_hiebzeit = (variable.fynn_waffe == variable.fynn_kombo_waffe) ? variable.fynn_hiebzeit : 0.0;",
        "variable.fynn_hieb_ende = variable.fynn_hiebzeit > 0.0 ? query.life_time : variable.fynn_hieb_ende;",
    ]


# Attachables (Dolche, Klingen) lesen den Schlag mit.
OEFFENTLICH = ["variable.fynn_waffe", "variable.fynn_schlag", "variable.fynn_hiebzeit"]
EIGENE_VARS = ("variable.fynn_waffe", "variable.fynn_schlag", "variable.fynn_kombo", "variable.fynn_hieb")


# ------------------------------------------------------------ Bauen

def glatt(f):
    return f * f * (3 - 2 * f)


ZEITEN = [round(i * 0.04, 2) for i in range(26)]


def zahl(x):
    return round(x, 2) + 0.0


def schluessel(werte):
    return {f"{t:.2f}": [zahl(v) if isinstance(v, (int, float)) else v for v in w] for t, w in werte}


def huelle(t, ein, aus):
    """Wie stark der Schlag die uebrigen Bewegungen ersetzt: schnell rein,
    langsamer raus. Am Anfang und am Ende null - dann steht der Arm genau
    dort, wo ihn Haltung und Laufen gerade haben, und nichts springt."""
    if t < ein:
        return glatt(t / ein)
    if t > aus:
        return glatt((1.0 - t) / (1.0 - aus))
    return 1.0


def kanal(folge, name, t):
    """Wert eines Kanals zur Zeit t. Wo eine Schluesselhaltung ihn nicht
    nennt, laeuft er zwischen den Nachbarn durch, die ihn nennen."""
    punkte = [(z, k[name]) for z, k in folge if name in k]
    if not punkte:
        return None
    if t <= punkte[0][0]:
        return punkte[0][1]
    for (a, x), (b, y) in zip(punkte, punkte[1:]):
        if a <= t <= b:
            f = glatt((t - a) / (b - a))
            return tuple(x[i] + (y[i] - x[i]) * f for i in range(3))
    return punkte[-1][1]


KNOCHEN = {"ra": "rightarm", "la": "leftarm", "ta": "waist", "rb": "rightleg", "lb": "leftleg",
           "rg": "rightitem", "lg": "leftitem"}


def aussen_animation(angriff):
    namen_da = {n for _, k in angriff.aussen for n in k}
    knochen = {}
    for kurz in sorted(namen_da):
        reihe = []
        for t in ZEITEN:
            w = kanal(angriff.aussen, kurz, t)
            e = huelle(t, angriff.ein, angriff.aus)
            if kurz in ("ra", "la"):
                # Die Arme stehen absolut: Minecrafts Halte- und
                # Schlagbewegung laufen gleichzeitig und kaemen sonst dazu.
                reihe.append((t, [f"({zahl(v)} - this) * {zahl(e)}" for v in w]))
            else:
                reihe.append((t, [v * e for v in w]))
        if kurz == "wu":
            # Die Wurzel steht an den Fuessen; z vorwaerts ist im Modell -z.
            knochen["root"] = {"position": schluessel((t, [v[0], v[1], -v[2]]) for t, v in reihe)}
        else:
            knochen[KNOCHEN[kurz]] = {"rotation": schluessel(reihe)}
    return {"loop": False, "anim_time_update": "variable.fynn_hiebzeit", "animation_length": 1.0,
            "bones": knochen}


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


def _ich_zwischen(folge, t):
    for a, b in zip(folge, folge[1:]):
        if a[0] <= t <= b[0]:
            f = glatt((t - a[0]) / (b[0] - a[0]))
            aus = [a[k] + (b[k] - a[k]) * f for k in (1, 2, 3)]
            aus.append(tuple(a[4][i] + (b[4][i] - a[4][i]) * f for i in range(3)))
            return aus
    return list(folge[-1][1:])


def ich_haltung(folge, t):
    schulter, hand_rollen, hand_nicken, schub = _ich_zwischen(folge, t)
    rot, pos = h.bewege(ARM_PIVOT, ICH_ARM_ROT, ICH_ARM_POS, h.dreh_um((0, 0, 1), schulter), ICH_SCHULTER, schub)
    # Das Handgelenk dreht nicht den Arm, sondern rightItem - so bleibt der
    # Arm ein Arm und kippt nicht um die Faust herum. Die Drehung ist im
    # Bild gedacht und wird in den Raum des Arms umgerechnet.
    a = drehmatrix(*rot)
    at = [[a[j][i] for j in range(3)] + [0] for i in range(3)] + [[0, 0, 0, 1]]
    bild = h.mal(h.dreh_um((0, 0, 1), hand_rollen), h.dreh_um((1, 0, 0), hand_nicken))
    item = h.zerlege(h.mal(at, h.mal(bild, a)))
    return rot, pos, item


def ich_animation(angriff):
    rots, poss, items = [], [], []
    for t in ZEITEN:
        rot, pos, item = ich_haltung(angriff.ich, t)
        rots.append(rot)
        poss.append(pos)
        items.append(item)
    rots, items = h.stetig(rots), h.stetig(items)
    # Der Arm steht absolut ("- this"): Minecrafts eigener kleiner Schwung
    # laeuft gleichzeitig und wuerde sich sonst dazuaddieren.
    return {
        "loop": False,
        "anim_time_update": "variable.fynn_hiebzeit",
        "animation_length": 1.0,
        "bones": {
            "rightarm": {
                "rotation": schluessel((t, [f"{zahl(r[i])} - this" for i in range(3)]) for t, r in zip(ZEITEN, rots)),
                "position": schluessel((t, [f"{zahl(p[i])} - this" for i in range(3)]) for t, p in zip(ZEITEN, poss)),
            },
            "rightitem": {"rotation": schluessel(zip(ZEITEN, items))},
        },
    }


# Ein Klick, der ins Leere geht (der laufende Schlag hat noch nicht
# getroffen): Minecrafts eigener kleiner Schwung wuerde trotzdem anlaufen.
# In der Ich-Sicht haelt diese Ruhe den Arm fest.
ICH_RUHE = {
    "loop": True,
    "bones": {"rightarm": {"rotation": [f"{a} - this" for a in ICH_ARM_ROT],
                           "position": [f"{a} - this" for a in ICH_ARM_POS]}},
}


def teile(aussen_frei):
    """(Name im Spieler, Animation, Inhalt, Bedingung) fuer alle Schlaege."""
    ich_frei = "variable.is_first_person && !variable.is_paperdoll"
    aus = [("fynn_hieb_ruhe", "animation.fynn.hieb_ruhe", ICH_RUHE,
            f"{ich_frei} && variable.fynn_waffe > 0.0 && variable.attack_time > 0.0 && variable.fynn_hiebzeit <= 0.0")]
    for art, liste in ANGRIFFE.items():
        for i, angriff in enumerate(liste):
            kurz = f"{ARTNAME[art]}_{angriff.name}"
            wann = f"variable.fynn_waffe == {art:.1f} && variable.fynn_schlag == {i:.1f} && variable.fynn_hiebzeit > 0.0"
            aus.append((f"fynn_a_{kurz}", f"animation.fynn.angriff.{kurz}", aussen_animation(angriff),
                        f"{aussen_frei} && {wann}"))
            aus.append((f"fynn_i_{kurz}", f"animation.fynn.angriff_ich.{kurz}", ich_animation(angriff),
                        f"{ich_frei} && {wann}"))
    return aus


def links_ich_stoss():
    """Wie weit der linke Dolch in der Ich-Sicht gerade vorsticht (0 bis 1)
    und wie weit er schneidet - fuer animation.dolche.links. Gelesen wird
    der Schlag des Spielers; Molang im Attachable kennt keinen eigenen."""
    zeit = "(c.owning_entity->v.fynn_hiebzeit)"
    schlag = "(c.owning_entity->v.fynn_schlag)"
    waffe = "(c.owning_entity->v.fynn_waffe)"
    stiche = [i for i, a in enumerate(ANGRIFFE[DOLCHE]) if a.links_ich == "stich"]
    schnitte = [i for i, a in enumerate(ANGRIFFE[DOLCHE]) if a.links_ich == "schnitt"]
    # Hochlaufen 0.2 bis 0.42, stehen, ab 0.62 zurueck.
    kurve = f"(math.clamp(({zeit} - 0.2) / 0.22, 0.0, 1.0) * math.clamp((1.0 - {zeit}) / 0.38, 0.0, 1.0))"

    def bei(liste):
        wahl = " || ".join(f"{schlag} == {i:.1f}" for i in liste)
        return f"(({waffe} == {DOLCHE:.1f} && {zeit} > 0.0 && ({wahl})) ? {kurve} : 0.0)"
    return bei(stiche), bei(schnitte)


# ------------------------------------------------------------ Haltungen
#
# Fynn: "auch Schwerthaltung". Wer eine Waffe in der Hand hat, haelt sie
# wie eine Waffe - nicht wie eine Fackel. Im Stehen ganz, im Gehen halb,
# damit die Arme beim Laufen noch mitschwingen. Die Schlaege setzen auf
# dieser Haltung auf (ihr "this") und kehren in sie zurueck.

HALTUNGEN = {
    # Klinge schraeg vor dem Koerper, die Spitze nach oben, wie in der Hut.
    SCHWERT: {"ra": (-38, -12, 4), "la": (-12, 0, -6), "ta": (0, 8, 0), "rg": (-28, 0, 0)},
    # Geduckt, beide Klingen vorn: rechts die Spitze voraus, links im
    # Rueckgriff vor der Brust, die Klinge am Unterarm als Deckung.
    DOLCHE: {"ra": (-42, -8, 8), "la": (-58, 28, -6), "ta": (8, 6, 0), "rg": (-10, 0, 0),
             "wu": (0, -0.6, 0), "rb": (-8, 0, 0), "lb": (6, 0, 0)},
    # Der Hammer quer vor dem Koerper, mit beiden Haenden gefasst.
    HAMMER: {"ra": (-32, -22, 0), "la": (-38, 30, 0), "ta": (0, 10, 0), "rg": (-15, 0, 0)},
    # Die Spitze aufs Ziel, der Arm locker vorgestreckt.
    DEGEN: {"ra": (-30, 18, 0), "la": (-8, 0, -12), "ta": (0, -12, 0), "rg": (20, 0, 0)},
    # Der Stab aufrecht neben dem Koerper, wie ein Wanderstab.
    STAB: {"ra": (-22, 0, 10), "la": (-5, 0, -5), "rg": (-60, 0, 0)},
}


def haltung_animation(werte):
    knochen = {}
    for kurz, w in werte.items():
        if kurz in ("ra", "la"):
            knochen[KNOCHEN[kurz]] = {"rotation": [f"{zahl(v)} - this" for v in w]}
        elif kurz == "wu":
            knochen["root"] = {"position": [w[0], w[1], -w[2]]}
        else:
            knochen[KNOCHEN[kurz]] = {"rotation": [zahl(v) for v in w]}
    return {"loop": True, "bones": knochen}


def haltungen(bewegt):
    """Die Haltungen: im Stehen ganz, im Gehen halb - das Gewicht steht in
    der Bedingung. Nicht beim Schleichen (eigene Lauerstellung), nicht in
    der Luft, nicht mit gespanntem Bogen."""
    aus = []
    for art, werte in HALTUNGEN.items():
        wann = (f"({bewegt} && !query.is_sneaking && variable.fynn_waffe == {art:.1f}) * "
                f"(1.0 - 0.6 * variable.fynn_tempo) * (1.0 - variable.fynn_luft) * (1.0 - variable.fynn_flug) * "
                f"(1.0 - variable.fynn_sturz)")
        aus.append((f"fynn_h_{ARTNAME[art]}", f"animation.fynn.haltung.{ARTNAME[art]}",
                    haltung_animation(werte), wann))
    return aus


# ------------------------------------------------------------ Rolle
#
# Fynn: "auch gerne so eine Rolle". Geduckt springen: kampf.js stoesst den
# Spieler dann flach nach vorn (in Laufrichtung) und macht ihn fuer einen
# Augenblick zaeh. Hier sieht man ihn dabei eine Rolle vorwaerts machen -
# eingerollt, einmal ganz herum, und wieder auf die Fuesse.
#
# Erkannt wird die Rolle am Tempo: Wer geduckt in der Luft schneller als
# fuenf Bloecke je Sekunde ist, springt nicht, er rollt - geduckt kommt man
# sonst nie so schnell voran. Danach eine kurze Sperre, damit dieselbe
# Rolle nicht zweimal anlaeuft, wenn sie noch nicht gelandet ist.

ROLLDAUER = 0.5
ROLLTEMPO = 5.0

INITIALISIEREN += ["variable.fynn_rollzeit = 0.0;", "variable.fynn_roll_ende = -10.0;"]
EIGENE_VARS += ("variable.fynn_roll",)


def rollen_vorberechnung():
    return [
        f"variable.fynn_rollzeit = (variable.fynn_rollzeit <= 0.0 && query.is_sneaking && !query.is_on_ground && "
        f"query.ground_speed > {ROLLTEMPO} && query.life_time - variable.fynn_roll_ende > 0.3) ? 0.01 : "
        f"((variable.fynn_rollzeit > 0.0 && variable.fynn_rollzeit + query.delta_time / {ROLLDAUER} < 1.0) ? "
        f"variable.fynn_rollzeit + query.delta_time / {ROLLDAUER} : 0.0);",
        "variable.fynn_roll_ende = variable.fynn_rollzeit > 0.0 ? query.life_time : variable.fynn_roll_ende;",
    ]


def rolle():
    import math
    # Gedreht wird um die Mitte des eingerollten Koerpers, nicht um die
    # Fuesse (dort sitzt der Drehpunkt von root) - sonst ueberschluege sich
    # der Spieler um seine eigenen Zehen.
    mitte = 8.0
    root_rot, root_pos, kopf, ra, la, rb, lb = [], [], [], [], [], [], []
    for t in ZEITEN:
        # Langsam hinein, schnell durch den Ueberschlag, weich auf die Fuesse.
        dreh = 360.0 * glatt(min(max((t - 0.08) / 0.8, 0.0), 1.0))
        einrollen = huelle(t, 0.18, 0.72)
        a = math.radians(dreh)
        root_rot.append((t, [dreh, 0.0, 0.0]))
        root_pos.append((t, [0.0, mitte - mitte * math.cos(a) - 4.0 * einrollen, mitte * math.sin(a)]))
        # Der Kopf dreht "relative_to entity", also nicht von selbst mit
        # dem Koerper - er bekommt dieselbe Drehung, sonst bliebe er aufrecht.
        # Dazu nickt er zur Brust, wie man eben rollt.
        kopf.append((t, [dreh + 35.0 * einrollen, 0.0, 0.0]))
        ra.append((t, [f"({zahl(v)} - this) * {zahl(einrollen)}" for v in (-75.0, -25.0, 0.0)]))
        la.append((t, [f"({zahl(v)} - this) * {zahl(einrollen)}" for v in (-75.0, 25.0, 0.0)]))
        rb.append((t, [f"({zahl(v)} - this) * {zahl(einrollen)}" for v in (-85.0, 0.0, 4.0)]))
        lb.append((t, [f"({zahl(v)} - this) * {zahl(einrollen)}" for v in (-80.0, 0.0, -4.0)]))
    return {
        "loop": False, "anim_time_update": "variable.fynn_rollzeit", "animation_length": 1.0,
        "bones": {
            "root": {"rotation": schluessel(root_rot), "position": schluessel(root_pos)},
            "waist": {"rotation": ["-this", "-this", "-this"]},
            "head": {"rotation": schluessel(kopf)},
            "rightarm": {"rotation": schluessel(ra)},
            "leftarm": {"rotation": schluessel(la)},
            "rightleg": {"rotation": schluessel(rb)},
            "leftleg": {"rotation": schluessel(lb)},
        },
    }


def rollen_teile(aussen_frei):
    return [("fynn_rolle", "animation.fynn.rolle", rolle(), f"{aussen_frei} && variable.fynn_rollzeit > 0.0")]
