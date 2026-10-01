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

import json
import math

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

# Seit 4.94 (Fynn: "Mach die Drachen dynamischer, gib ihnen mehr Gelenke,
# mach ein bisschen geilere Animationen") laeuft jeder Drache auf seiner
# eigenen Uhr: variable.fynn_t ist die Lebenszeit, um einen Zufall versetzt -
# zwei Drachen nebeneinander bruellen, strecken und blinzeln nicht im
# Gleichtakt. Was mehrere Bewegungen gemeinsam brauchen (wann er bruellt,
# wann er welche Schwinge streckt), rechnet das Spiel einmal je Bild vorher
# aus (VORHER), statt es in jeder Bewegung neu zu tun.
T = "variable.fynn_t"
BRUELL = "variable.fynn_bruell"
OFFEN = {"links": "variable.fynn_offen_l", "rechts": "variable.fynn_offen_r"}
# Ob er gerade Zeit fuer so etwas hat: am Boden, still, ohne Feuer, wach.
# Liegt er auf "Platz" (bleib hier)? Dann steht er nicht, geht nicht,
# baeumt sich nicht auf - ausser jemand sitzt auf ihm.
PLATZ = "(query.property('fynn:wartet') * (1.0 - query.has_rider))"
RUHIG = (f"(1.0 - {LAEUFT}) * (1.0 - {FEUER}) * (1.0 - {FLIEGT}) * (1.0 - {LIEGT}) * (1.0 - {PLATZ})")


def strecken(ab, dauer=3.2):
    """0..1..0: die Schwinge streckt sich, haelt kurz und faltet sich wieder."""
    return (f"math.clamp(math.sin(math.clamp((variable.fynn_sz - {ab}) / {dauer}, 0.0, 1.0) * 180.0) * 1.6,"
            f" 0.0, 1.0) * variable.fynn_ruhig")


VORHER = [
    f"{T} = query.life_time + variable.fynn_zufall * 0.05;",
    f"variable.fynn_ruhig = {RUHIG};",
    # Alle 17 Sekunden bruellt er (wenn er gerade ruhig steht).
    f"variable.fynn_bz = math.mod({T}, 17.0);",
    f"{BRUELL} = variable.fynn_bz < 2.4 ? math.clamp(math.sin(variable.fynn_bz / 2.4 * 180.0) * 2.2, 0.0, 1.0)"
    " * variable.fynn_ruhig : 0.0;",
    # Alle halbe Minute streckt er erst die linke, dann die rechte Schwinge.
    f"variable.fynn_sz = math.mod({T} + 6.0, 31.0);",
]


# Der Atem hat zwei Teile: Luftholen, dann Ausstoss. Wie lange er schon
# speit, zaehlt das Spiel selbst mit (variable.fynn_az); das Skript wartet
# nach dem Einschalten von fynn:feuer eine Sekunde mit dem Strahl
# (ATEMARTEN.anlauf in drachen.js) - genau so lange holt er Luft.
ANLAUF = 1.0
VORHER += [
    f"variable.fynn_az = {FEUER} ? variable.fynn_az + query.delta_time : 0.0;",
    f"variable.fynn_holen = {FEUER} * math.clamp(variable.fynn_az / 0.25, 0.0, 1.0)"
    f" * (1.0 - math.clamp((variable.fynn_az - {ANLAUF}) / 0.12, 0.0, 1.0));",
    f"variable.fynn_speit = {FEUER} * math.clamp((variable.fynn_az - {ANLAUF}) / 0.12, 0.0, 1.0);",
    # Der Ruck: im ersten Augenblick des Strahls schnellt der Kopf vor.
    f"variable.fynn_ruck = variable.fynn_speit * math.max(0.0, 1.0 - (variable.fynn_az - {ANLAUF}) / 0.4);",
]
HOLEN, SPEIT, RUCK = "variable.fynn_holen", "variable.fynn_speit", "variable.fynn_ruck"


def vorher(atemfluegel=0.0):
    """Was das Spiel je Bild vorab rechnet. atemfluegel: wie weit die Art
    beim Speien die Schwingen oeffnet (der Frostwyvern reisst sie ganz auf,
    der Lindwurm halb) - das Oeffnen selbst tut der Stand (OFFEN)."""
    # Dazu (5.2): Wer eine Gabe wirkt, reisst die Schwingen auf, und ein
    # Junges breitet sie fuer seinen Flatterversuch aus.
    auf = f"math.max(query.property('fynn:wirkt'), {JUNG_FLATTERN})"
    return VORHER + [
        f"{OFFEN['links']} = math.max(math.max(math.max({BRUELL}, {strecken(0.0)}), {SPEIT} * {atemfluegel}), {auf});",
        f"{OFFEN['rechts']} = math.max(math.max(math.max({BRUELL}, {strecken(3.8)}), {SPEIT} * {atemfluegel}), {auf});",
    ]
SCHLAEFT = "query.property('fynn:schlaeft') * (1.0 - query.property('fynn:besiegt'))"
BESIEGT = "query.property('fynn:besiegt')"

# Jede Art nennt ihren Atem anders (Fynn: "den kannst du bei jedem Drachen
# unterschiedlich benennen") - so heisst auch die Bewegung und der Schalter
# in der Pixelschmiede.
ATEMARTEN = {"feuer": ("Feueratem", "feueratem"), "frost": ("Frosthauch", "frosthauch"),
             "blitz": ("Sturmhauch", "sturmhauch"), "gift": ("Giftodem", "giftodem"),
             "schatten": ("Schattenatem", "schattenatem"), "schall": ("Schallbrüllen", "schallbruellen"),
             # Nur die Arten aus der Zucht (5.2).
             "dampf": ("Dampfatem", "dampfatem"), "sterne": ("Sternenstrahl", "sternenstrahl"),
             "lava": ("Lavaatem", "lavaatem")}


def atem_posen(art, hals, schwanz, stuetzt=False):
    """Luftholen und Ausstoss, je Art verschieden. Was nur am Boden Sinn
    hat (sich aufbaeumen, die Beine stemmen), traegt den Faktor boden - in
    der Luft haelt ihn das Schweben aufrecht."""
    boden = f"(1.0 - {FLIEGT})"
    holen, speit = {}, {}
    if art == "frost":
        # Frosthauch: Er duckt sich, legt die Schwingen wie einen Mantel nach
        # vorn und zieht den Kopf tief ein - dann reisst er die Schwingen
        # weit nach hinten auf und fegt den Hauch dicht ueber den Boden, in
        # breiten Boegen von links nach rechts.
        holen["rumpf"] = {"rotation": [f"5.0 * {boden}", 0.0, 0.0], "position": [0.0, f"-2.0 * {boden}", 0.0],
                          "scale": [1.05, 1.05, 1.0]}
        for i, w in enumerate((12.0, -6.0, -14.0, -10.0)[:hals]):
            holen[f"hals{i + 1}"] = {"rotation": [w, f"math.sin({T} * 200.0 - {i * 40}) * 2.0", 0.0]}
        holen["kopf"] = {"rotation": [14.0, 0.0, 0.0]}
        holen["kiefer"] = {"rotation": [f"6.0 + math.sin({T} * 500.0) * 2.0", 0.0, 0.0]}
        beidseitig(holen, {"fluegel": [0.0, 22.0, -18.0]})
        speit["rumpf"] = {"rotation": [f"6.0 * {boden} - {RUCK} * 6.0", 0.0, 0.0],
                          "position": [0.0, 0.0, f"-{RUCK} * 2.0"]}
        for i, w in enumerate((16.0, 10.0, 4.0, 0.0)[:hals]):
            speit[f"hals{i + 1}"] = {"rotation": [f"{w} * {boden} - 3.0",
                                                  f"math.sin({T} * 90.0 - {i * 25}) * 8.0", 0.0]}
        speit["kopf"] = {"rotation": [f"-14.0 * {boden} + 6.0 + math.sin({T} * 900.0) * 1.5",
                                      f"math.sin({T} * 90.0 - 110.0) * 10.0", 0.0]}
        speit["kiefer"] = {"rotation": [f"40.0 + math.sin({T} * 700.0) * 2.0", 0.0, 0.0]}
        # Die Schwingen stehen weit offen (atemfluegel) und schlagen den Hauch
        # mit kurzen Stoessen nach vorn.
        beidseitig(speit, {"fluegel": [0.0, f"-20.0 + math.sin({T} * 400.0) * 6.0", f"10.0 + math.sin({T} * 400.0) * 8.0"]})
        for i in range(1, schwanz + 1):
            speit[f"schwanz{i}"] = {"rotation": [4.0 if i == 1 else 0.0,
                                                 f"math.sin({T} * 250.0 - {i * 40}) * {1 + i * 0.6:.1f}", 0.0]}
        return holen, speit
    if art == "gift":
        # Giftodem: Die Koepfe steigen und wiegen sich wie zwei Schlangen,
        # umeinander herum - der Kragen klappt auf. Dann speien sie: der eine
        # zieht die Giftwolke in langen Boegen, der andere spuckt Funken in
        # kurzen Stoessen (mehrere_koepfe gibt jedem Kopf seinen Takt, und
        # _giftdrache macht aus dem zweiten den Spucker).
        holen["rumpf"] = {"rotation": [f"-8.0 * {boden}", 0.0, 0.0], "scale": [1.05, 1.04, 1.0]}
        for i, w in enumerate((-14.0, -10.0, 0.0, 10.0, 12.0)[:hals]):
            holen[f"hals{i + 1}"] = {"rotation": [w, f"math.sin({T} * 120.0 - {i * 30}) * 6.0", 0.0]}
        holen["kopf"] = {"rotation": [-10.0, f"-math.sin({T} * 120.0 - {hals * 30}) * 8.0", 0.0]}
        holen["kiefer"] = {"rotation": [f"10.0 + math.sin({T} * 500.0) * 2.0", 0.0, 0.0]}
        speit["rumpf"] = {"position": [0.0, 0.0, f"-{RUCK} * 2.0 + 0.8"]}
        for i, w in enumerate((10.0, 6.0, 0.0, -4.0, -4.0)[:hals]):
            speit[f"hals{i + 1}"] = {"rotation": [f"{w} * {boden} - 2.0",
                                                  f"math.sin({T} * 60.0 - {i * 20}) * 6.0", 0.0]}
        speit["kopf"] = {"rotation": [f"-6.0 * {boden} + math.sin({T} * 900.0) * 1.5",
                                      f"math.sin({T} * 60.0 - 100.0) * 7.0", 0.0]}
        speit["kiefer"] = {"rotation": [f"44.0 + math.sin({T} * 700.0) * 2.0", 0.0, 0.0]}
        for i in range(1, schwanz + 1):
            speit[f"schwanz{i}"] = {"rotation": [0.0, f"math.sin({T} * 200.0 - {i * 40}) * {1 + i * 0.6:.1f}", 0.0]}
        return holen, speit
    # Feueratem (Lindwurm und alle, die nichts Eigenes haben): Er baeumt
    # sich auf, die Brust schwillt, der Hals biegt sich zum S nach hinten
    # und der Kopf hebt sich - Glut zwischen den Zaehnen. Dann schnellt der
    # Kopf nach vorn und unten, die Schwingen gehen halb auf, die
    # Vorderklauen graben sich ein, der Strahl zieht in weiten Boegen, der
    # Schwanz peitscht.
    holen["rumpf"] = {"rotation": [f"-10.0 * {boden}", 0.0, 0.0], "position": [0.0, f"1.5 * {boden}", 1.0],
                      "scale": [1.07, 1.06, 1.0]}
    holen["becken"] = {"rotation": [f"8.0 * {boden}", 0.0, 0.0]}
    for i, w in enumerate((-20.0, -14.0, 4.0, 14.0, 18.0)[:hals]):
        holen[f"hals{i + 1}"] = {"rotation": [w, 0.0, 0.0]}
    holen["kopf"] = {"rotation": [-18.0, 0.0, 0.0]}
    holen["kiefer"] = {"rotation": [f"8.0 + math.sin({T} * 400.0) * 2.0", 0.0, 0.0]}
    beidseitig(holen, {"fluegel": [0.0, 0.0, -15.0], "bein_vorn": [-8.0, 0.0, 0.0]})
    holen["schwanz1"] = {"rotation": [-8.0, 0.0, 0.0]}
    for i in range(2, schwanz + 1):
        holen[f"schwanz{i}"] = {"rotation": [0.0, f"math.sin({T} * 220.0 - {i * 40}) * 3.0", 0.0]}
    speit["rumpf"] = {"rotation": [f"6.0 * {boden}", 0.0, 0.0],
                      "position": [0.0, 0.0, f"-{RUCK} * 2.5 + (1.0 - {RUCK}) * 1.0"]}
    for i, w in enumerate((14.0, 8.0, -2.0, -6.0, -6.0)[:hals]):
        speit[f"hals{i + 1}"] = {"rotation": [f"{w} * {boden} - 3.0 + {RUCK} * 3.0",
                                              f"math.sin({T} * 70.0 - {i * 20}) * 5.0", 0.0]}
    speit["kopf"] = {"rotation": [f"-8.0 * {boden} + 8.0 * {FLIEGT} + math.sin({T} * 900.0) * 1.5",
                                  f"math.sin({T} * 70.0 - 100.0) * 6.0", 0.0]}
    speit["kiefer"] = {"rotation": [f"45.0 + math.sin({T} * 700.0) * 3.0", 0.0, 0.0]}
    beidseitig(speit, {"fluegel": [0.0, 0.0, f"-8.0 * {boden}"], "bein_vorn": [f"-12.0 * {boden}", 0.0, 0.0],
                       "zehen_vorn": [f"-20.0 * {boden}", 0.0, 0.0]})
    for i in range(1, schwanz + 1):
        speit[f"schwanz{i}"] = {"rotation": [-6.0 if i == 1 else 0.0,
                                             f"math.sin({T} * 300.0 - {i * 40}) * {2 + i * 0.8:.1f}", 0.0]}
    return holen, speit


def blinzeln(versatz=0.0):
    """Die Lider: im Schlaf und besiegt zu - und sonst alle paar Sekunden
    fuer einen Augenblick. Ohne Blinzeln starrt ein Drache wie ausgestopft."""
    return (f"query.property('fynn:schlaeft') || query.property('fynn:besiegt') || "
            f"math.mod({T} + {versatz}, 4.7) < 0.14")


def zucken(tempo, schaerfe=20.0):
    """0..1: meist 0, alle paar Sekunden ein kurzer, scharfer Ausschlag - fuer
    Schnauben, Kieferzucken, das Schnippen der Schwanzspitze."""
    return f"math.pow(math.max(0.0, math.sin({T} * {tempo})), {schaerfe})"


def blick_bewegung(hals):
    """Er sieht, wen er im Blick hat: Hals und Kopf teilen sich die Drehung,
    jedes Halsglied ein Stueck - so dreht sich der ganze Hals in einer Kurve
    statt nur der Kopf auf einem steifen Stiel."""
    gier = "math.clamp(query.target_y_rotation, -75.0, 75.0)"
    neig = "math.clamp(query.target_x_rotation, -30.0, 40.0)"
    b = {f"hals{i}": {"rotation": [f"{neig} * {0.4 / hals:.3f}", f"{gier} * {0.55 / hals:.3f}", 0.0]}
         for i in range(1, hals + 1)}
    b["kopf"] = {"rotation": [f"{neig} * 0.6", f"{gier} * 0.45", 0.0]}
    return b


def biss_bewegung(hals, schwanz, vorderbein=True):
    """Der Biss am Angriffszaehler des Spiels: Hals zurueck, Maul auf - dann
    schnellt er vor, schnappt zu und schuettelt den Kopf. Wer Vorderbeine
    hat, schlaegt dabei mit der linken Klaue."""
    at = "variable.attack_time"
    aus = f"math.sin(math.clamp({at} / 0.35, 0.0, 1.0) * 180.0)"
    zu = f"math.sin(math.clamp(({at} - 0.3) / 0.7, 0.0, 1.0) * 180.0)"
    b = {}
    for i in range(1, hals + 1):
        s = max(0.3, 1.0 - (i - 1) * 0.2)
        b[f"hals{i}"] = {"rotation": [f"-{aus} * {10 * s:.1f} + {zu} * {13 * s:.1f}", 0.0, 0.0]}
    b["kopf"] = {"rotation": [f"-{aus} * 25.0 + {zu} * 18.0", f"math.sin({at} * 900.0) * 9.0 * {zu}",
                              f"math.sin({at} * 900.0 + 90.0) * 6.0 * {zu}"]}
    b["kiefer"] = {"rotation": [f"{aus} * 50.0 + {zu} * 6.0", 0.0, 0.0]}
    b["rumpf"] = {"rotation": [f"{zu} * 5.0", 0.0, 0.0], "position": [0.0, 0.0, f"{aus} * 1.5 - {zu} * 3.5"]}
    for i in range(1, schwanz + 1):
        b[f"schwanz{i}"] = {"rotation": [0.0, f"math.sin({at} * 360.0 - {i * 30}) * {3 + i}", 0.0]}
    if vorderbein:
        b["bein_vorn_links"] = {"rotation": [f"-{aus} * 45.0 + {zu} * 30.0", 0.0, f"{aus} * 10.0"]}
        b["unterbein_vorn_links"] = {"rotation": [f"{aus} * 35.0", 0.0, 0.0]}
        b["zehen_vorn_links"] = {"rotation": [f"-{aus} * 35.0 + {zu} * 20.0", 0.0, 0.0]}
    return b


def seitenweise(knochen, name, links, wert):
    """Ein Knochenpaar, dessen Werte von der Seite abhaengen: wert(seite,
    zeichen) liefert [x, y, z] fuer diese Seite (zeichen +1 links, -1 rechts)."""
    for seite, zeichen in (("links", 1), ("rechts", -1)):
        knochen[f"{name}_{seite}"] = {"rotation": wert(seite, zeichen)}


def hinterfluegel(bewegungen, nachlauf=0.18):
    """Ein zweites Fluegelpaar (die Nachtschwinge, 4.97): Es tut, was das
    erste tut, einen Augenblick spaeter - so schlagen die vier Fluegel nicht
    im Gleichtakt, sondern in einer Welle von vorn nach hinten."""
    import re
    muster = re.compile(r"^(fluegel|unterarm|hand|finger\d+)_(links|rechts)$")
    aus = {}
    for name, (anim, gewicht) in bewegungen.items():
        knochen = dict(anim["bones"])
        for k, werte in anim["bones"].items():
            if muster.match(k):
                knochen["h" + k] = json.loads(json.dumps(werte).replace(T, f"({T} - {nachlauf})"))
        aus[name] = (dict(anim, bones=knochen), gewicht)
    return aus


def drachen_bewegungen(schwinge, hals=4, schwanz=6, tempo=220.0, beinhoehe=20, finger=None, stuetzt=False,
                       atem="feuer", bauch=None):
    """schwinge: die Schwinge der Art (fuer die ausgerechnete Faltung);
    beinhoehe: wie tief der Leib beim Liegen sinkt; stuetzt: ein Wyvern,
    der am Boden auf den Handgelenken der Schwingen geht."""
    import drachen_gestalt as dg
    falt = dg.faltung(schwinge, stuetzt)
    finger = schwinge.anzahl
    # Wie hoch der Bauch im Stehen ueber dem Boden ist - so tief legt er sich.
    bauch = bauch if bauch is not None else beinhoehe - 7.0
    phi = f"{T} * {tempo}"
    # Kraeftige Schlaege, dazwischen gleitet er: Dann stehen die Schwingen
    # weit, nur leicht angehoben, und schlagen kaum. Speit er Feuer, gleitet
    # er nie - er steht schlagend in der Luft.
    schlagen = (f"math.max(0.3 + 0.7 * math.clamp(math.sin({T} * 28.0) * 2.0 + 0.6, 0.0, 1.0),"
                f" {FEUER})")
    flug = {}
    beidseitig(flug, {
        # Die Schulter schlaegt; der Unterarm kommt einen Takt spaeter nach,
        # und beim Heben falten sich Unterarm und Finger ein Stueck ein - so
        # schiebt der Schlag nach unten Luft und der nach oben nicht.
        # 4.97 - Fynn: "Beim Fliegen bilden sich manchmal Luecken zwischen den
        # Fluegeln." Die Flughaut haengt Stueck fuer Stueck an Oberarm,
        # Unterarm und Fingern. Dreht sich ein Glied gegen das naechste in der
        # Fluegelebene (um die Hochachse), klafft die Haut auseinander. Darum
        # schwingen die Glieder jetzt nur noch um die Scharniere, an denen
        # die Hautstuecke sich beruehren: Die Schulter schlaegt, der Unterarm
        # knickt am Ellbogen nach - Hand und Finger bleiben fest mit ihm.
        "fluegel": [0.0, f"-math.max(0.0, math.cos({phi})) * 10.0 * {schlagen}",
                    f"-6.0 - math.sin({phi}) * 42.0 * {schlagen}"],
        "unterarm": [0.0, 0.0, f"-math.sin({phi} - 50.0) * 26.0 * {schlagen}"],
        # Im Flug (4.99 neu - Fynn: "bei der Fluganimation gefallen mir die
        # Drachenbeine noch nicht"): Die Beine sind eng an den Leib gezogen wie
        # bei einem Greifvogel. Hinten: der Schenkel nach vorn unter den Bauch,
        # das Knie gebeugt, Unterschenkel und Fuss liegen nach hinten, die
        # Zehen gekruemmt. Vorn: die Arme an die Brust gezogen, der Ellbogen
        # geknickt, die Klauen zur Faust. Sie pendeln leicht mit dem Schlag.
        "bein_hinten": [f"-18.0 + math.sin({phi} - 120.0) * 4.0 * {schlagen}", 0.0, -6.0],
        "unterbein_hinten": [f"88.0 + math.sin({phi} - 160.0) * 5.0 * {schlagen}", 0.0, 0.0],
        "fuss_hinten": [38.0, 0.0, 0.0], "zehen_hinten": [55.0, 0.0, 0.0],
        "bein_vorn": [-42.0, 0.0, -8.0], "unterbein_vorn": [95.0, 0.0, 0.0], "fuss_vorn": [25.0, 0.0, 0.0],
        "zehen_vorn": [65.0, 0.0, 0.0],
    })
    # Der Leib geht mit dem Schlag: hebt sich, wenn die Schwingen nach unten
    # druecken, nickt dabei ein wenig - und legt sich in die Kurve.
    flug["rumpf"] = {"rotation": [f"-query.target_x_rotation * 0.4 + math.sin({phi} - 60.0) * 3.0 * {schlagen}",
                                  0.0, "variable.fynn_dreh * 3.0"],
                     "position": [0.0, f"-math.sin({phi} - 30.0) * 1.6 * {schlagen}", 0.0]}
    # Das Becken gegen die Brust: Der Leib biegt sich mit jedem Schlag.
    flug["becken"] = {"rotation": [f"math.sin({phi} - 110.0) * 4.0 * {schlagen}", "-variable.fynn_dreh * 1.5", 0.0]}
    for i in range(1, hals + 1):
        # Der Hals schwingt im S, jedes Glied einen Takt spaeter.
        flug[f"hals{i}"] = {"rotation": [f"-3.0 + math.sin({T} * 60.0 - {i * 30}) * 3.0"
                                         f" - math.sin({phi} - {40 + i * 20}) * 1.5 * {schlagen}",
                                         f"math.sin({T} * 45.0 - {i * 35}) * 5.0", 0.0]}
    # Ab und zu schnappt er im Flug mit dem Maul.
    flug["kopf"] = {"rotation": [f"math.sin({T} * 60.0 - {hals * 30 + 30}) * 4.0",
                                 f"-math.sin({T} * 45.0) * 8.0 - variable.fynn_dreh * 2.0", 0.0]}
    flug["kiefer"] = {"rotation": [f"{zucken(17.0, 12.0)} * 24.0", 0.0, 0.0]}
    for i in range(1, schwanz + 1):
        # Der Schwanz steuert: er schwingt gegen den Schlag und in die Kurve.
        flug[f"schwanz{i}"] = {"rotation": [f"math.sin({T} * 70.0 - {i * 40}) * 3.0"
                                            f" + math.sin({phi} - {150 + i * 25}) * {1.0 + i * 0.4:.1f} * {schlagen}",
                                            f"math.sin({T} * 55.0 - {i * 40}) * {3 + i * 1.5}"
                                            f" - variable.fynn_dreh * {i}", 0.0]}

    # Schweben beim Feuerspeien in der Luft: aufgerichtet, die Beine haengen,
    # der Hals biegt sich nach unten zum Ziel.
    schweben = {"rumpf": {"rotation": [-24.0, 0.0, 0.0]},
                "becken": {"rotation": [8.0, 0.0, 0.0]}}
    beidseitig(schweben, {"bein_hinten": [-55.0, 0.0, 0.0], "unterbein_hinten": [-10.0, 0.0, 0.0],
                          "fuss_hinten": [-30.0, 0.0, 0.0], "zehen_hinten": [-20.0, 0.0, 0.0],
                          "bein_vorn": [-60.0, 0.0, 0.0], "unterbein_vorn": [80.0, 0.0, 0.0],
                          "zehen_vorn": [-35.0, 0.0, 0.0]})
    for i in range(1, hals + 1):
        schweben[f"hals{i}"] = {"rotation": [round(24.0 / hals + 2.0, 1), 0.0, 0.0]}
    schweben["kopf"] = {"rotation": [6.0, 0.0, 0.0]}
    for i in range(1, min(schwanz, 3) + 1):
        schweben[f"schwanz{i}"] = {"rotation": [(18.0, 10.0, 5.0)[i - 1], 0.0, 0.0]}

    # Am Boden: Schwingen zusammengefaltet an den Leib gelegt, der Hals
    # aufgerichtet, der Schwanz liegt und pendelt leise.
    stand = {}
    # Die Faltung ist ausgerechnet (Ellbogen hinten, Handgelenk als Buckel
    # ueber der Schulter, die Finger eng am Leib nach hinten) - so liegt die
    # Flughaut zusammengelegt an der Flanke statt wie ein Faecher abzustehen.
    # Streckt er eine Schwinge oder bruellt er, oeffnet sie sich (OFFEN):
    # die Faltung geht zurueck, die Haut spannt sich wieder.
    for seite, zeichen in (("links", 1), ("rechts", -1)):
        auf = OFFEN[seite]
        for name, (x, y, z) in falt.items():
            w = [x, y * zeichen, z * zeichen]
            werte = [f"{v} * (1.0 - {auf})" if v else 0.0 for v in w]
            if name == "fluegel":
                # Geoeffnet steht die Schwinge schraeg nach oben, zittert leicht.
                werte[2] = f"{werte[2]} - {auf} * {45.0 * zeichen} - {auf} * math.sin({T} * 400.0) * {1.5 * zeichen}"
            stand[f"{name}_{seite}"] = {"rotation": werte}
        stand[f"armhaut_{seite}"] = {"scale": [1.0, 1.0, f"0.15 + 0.85 * {auf}"]}
        stand[f"unterarmhaut_{seite}"] = {"scale": [1.0, 1.0, f"0.15 + 0.85 * {auf}"]}
        for i in range(1, finger):
            stand[f"fingerhaut{i}_{seite}"] = {"scale": [1.0, 1.0, f"0.12 + 0.88 * {auf}"]}
    for i, w in enumerate((-14.0, -8.0, 0.0, 6.0, 8.0)[:hals]):
        stand[f"hals{i + 1}"] = {"rotation": [f"{w} + math.sin({T} * 40.0 - {i * 25}) * 1.5",
                                              f"math.sin({T} * 17.0 - {i * 20}) * 3.0", 0.0]}
    # Der Kopf sieht sich um, legt sich neugierig schief, schnaubt ab und zu
    # (ein kurzes Nicken) - und das Maul zuckt, als wittere er etwas.
    stand["kopf"] = {"rotation": [f"16.0 + math.sin({T} * 40.0 - 120.0) * 3.0 + {zucken(11.0, 30.0)} * 12.0",
                                  f"math.sin({T} * 21.0) * 14.0", f"math.sin({T} * 13.0) * 7.0"]}
    stand["kiefer"] = {"rotation": [f"{zucken(23.0, 24.0)} * 14.0", 0.0, 0.0]}
    # Atmen: Die Brust hebt und weitet sich.
    stand["rumpf"] = {"scale": [f"1.0 + math.sin({T} * 55.0) * 0.01", f"1.0 + math.sin({T} * 55.0) * 0.018", 1.0],
                      "position": [0.0, f"math.sin({T} * 55.0) * 0.3", 0.0]}
    stand["becken"] = {"rotation": [0.0, f"math.sin({T} * 19.0) * 2.5", 0.0]}
    for i in range(1, schwanz + 1):
        # Der Schwanz schlaengelt sich langsam, die Spitze schnippt ab und zu.
        schnipp = f" + {zucken(13.0, 16.0)} * math.sin({T} * 720.0) * {6 * i}" if i > schwanz - 2 else ""
        stand[f"schwanz{i}"] = {"rotation": [f"{10.0 if i == 1 else 1.5} + math.sin({T} * 23.0 - {i * 30}) * 1.2",
                                             f"math.sin({T} * 28.0 - {i * 40}) * {2 + i}{schnipp}", 0.0]}
    # Die Vorderklauen scharren ungeduldig.
    stand["zehen_vorn_links"] = {"rotation": [f"-{zucken(7.0, 6.0)} * math.max(0.0, math.sin({T} * 900.0)) * 18.0",
                                              0.0, 0.0]}

    # Gehen: Kreuzgang wie eine Echse - vorn links mit hinten rechts. Das
    # Knie hebt den Fuss im Vorschwingen, die Krallen krallen sich dabei ein
    # und spreizen sich beim Aufsetzen. Schultern und Becken drehen
    # gegeneinander, der Ruecken biegt sich - wie bei einem Waran.
    w = "query.modified_distance_moved * 22.0"
    gang = {}
    for seite, phase in (("links", 0.0), ("rechts", 180.0)):
        for teil, versatz in (("vorn", 0.0), ("hinten", 180.0)):
            p = f"{w} + {phase + versatz}"
            gang[f"bein_{teil}_{seite}"] = {"rotation": [f"math.sin({p}) * 30.0", 0.0, 0.0]}
            gang[f"unterbein_{teil}_{seite}"] = {"rotation": [
                f"math.max(0.0, -math.cos({p})) * {-34.0 if teil == 'vorn' else 36.0}", 0.0, 0.0]}
            gang[f"fuss_{teil}_{seite}"] = {"rotation": [f"-math.sin({p}) * 16.0", 0.0, 0.0]}
            gang[f"zehen_{teil}_{seite}"] = {"rotation": [
                f"math.max(0.0, -math.cos({p})) * 40.0 - math.max(0.0, math.cos({p})) * 10.0", 0.0, 0.0]}
    if stuetzt:
        # Der Wyvern setzt die Handgelenke im Wechsel mit den Fuessen vor,
        # wie eine Fledermaus am Boden: die Schulter schwingt vor und zurueck.
        for seite, phase, zeichen in (("links", 180.0, 1), ("rechts", 0.0, -1)):
            gang[f"fluegel_{seite}"] = {"rotation": [0.0, f"math.sin({w} + {phase}) * 14.0 * {zeichen}",
                                                     f"math.max(0.0, math.cos({w} + {phase})) * -8.0 * {zeichen}"]}
    else:
        # Die gefalteten Schwingen wippen mit den Schultern.
        seitenweise(gang, "fluegel", None, lambda seite, z: [0.0, f"math.sin({w}) * 3.0 * {z}",
                                                             f"math.sin({w} * 2.0) * 2.0 * {z}"])
    gang["rumpf"] = {"rotation": [f"math.sin({w} * 2.0) * 1.2", f"math.sin({w}) * 4.0", f"math.sin({w}) * 3.0"],
                     "position": [0.0, f"math.abs(math.sin({w})) * 0.8", 0.0]}
    gang["becken"] = {"rotation": [0.0, f"-math.sin({w}) * 7.0", f"-math.sin({w}) * 3.0"]}
    for i in range(1, schwanz + 1):
        gang[f"schwanz{i}"] = {"rotation": [0.0, f"-math.sin({w} - {i * 30}) * {3 + i * 1.5}", 0.0]}
    for i in range(1, hals + 1):
        gang[f"hals{i}"] = {"rotation": [f"math.sin({w} * 2.0 - {i * 30}) * 2.0", f"-math.sin({w} - {i * 20}) * 2.5", 0.0]}
    # Der Kopf haelt dagegen und bleibt ruhig - wie bei einem Jaeger.
    gang["kopf"] = {"rotation": [f"-math.sin({w} * 2.0 - {hals * 30}) * 2.5", f"math.sin({w}) * 3.0", 0.0]}

    # Der Atemangriff (4.95) - Fynn: "Wir brauchen bessere Angriffs-
    # animationen, also den Feueratem." Er hat jetzt zwei Teile:
    # Luftholen (eine Sekunde, so lange wartet auch das Skript mit dem
    # Strahl) und Ausstoss mit einem Ruck am Anfang. Jede Art macht es auf
    # ihre Weise (atem_posen).
    holen, speit = atem_posen(atem, hals, schwanz, stuetzt)


    # Bruellen am Boden, alle 17 Sekunden: Er baeumt sich auf - die Brust
    # hoch, die Vorderklauen in der Luft, die Schwingen weit offen (das
    # oeffnen tut der Stand, OFFEN), der Kopf in den Nacken, das Maul auf.
    # Das Becken bleibt unten, der Schwanz stemmt sich in den Boden und
    # peitscht. Das Gewicht (BRUELL) blendet die Pose ein und aus.
    bruellen = {"rumpf": {"rotation": [-22.0, 0.0, 0.0], "position": [0.0, 3.0, 1.0]},
                "becken": {"rotation": [20.0, 0.0, 0.0]}}
    beidseitig(bruellen, {"bein_vorn": [-50.0, 0.0, 6.0], "unterbein_vorn": [65.0, 0.0, 0.0],
                          "fuss_vorn": [10.0, 0.0, 0.0], "zehen_vorn": [-30.0, 0.0, 0.0],
                          "bein_hinten": [8.0, 0.0, 0.0], "zehen_hinten": [-15.0, 0.0, 0.0]})
    for i, wert in enumerate((-16.0, -10.0, -4.0, 0.0, 4.0)[:hals]):
        bruellen[f"hals{i + 1}"] = {"rotation": [wert, 0.0, 0.0]}
    bruellen["kopf"] = {"rotation": [f"-38.0 + math.sin({T} * 900.0) * 2.0", f"math.sin({T} * 700.0) * 2.0", 0.0]}
    bruellen["kiefer"] = {"rotation": [f"42.0 + math.sin({T} * 1100.0) * 3.0", 0.0, 0.0]}
    for i in range(1, schwanz + 1):
        bruellen[f"schwanz{i}"] = {"rotation": [8.0 if i == 1 else 0.0,
                                                f"math.sin({T} * 300.0 - {i * 40}) * {2 + i}", 0.0]}

    # Im Sturzflug: Schwingen angelegt, die Krallen voraus und gespreizt.
    stoss = {}
    # Auch hier nur um die Scharniere: die ganze Schwinge nach hinten
    # geschwenkt, der Unterarm nach oben geknickt - die Haut bleibt ganz.
    beidseitig(stoss, {"fluegel": [0.0, -34.0, -14.0], "unterarm": [0.0, 0.0, -24.0],
                       "bein_vorn": [-60.0, 0.0, 0.0], "unterbein_vorn": [20.0, 0.0, 0.0],
                       "zehen_vorn": [-65.0, 0.0, 0.0],
                       "bein_hinten": [-30.0, 0.0, 0.0], "zehen_hinten": [-70.0, 0.0, 0.0]})
    stoss["kiefer"] = {"rotation": [22.0, 0.0, 0.0]}
    for i in range(1, schwanz + 1):
        stoss[f"schwanz{i}"] = {"rotation": [-2.0, f"-math.sin({T} * 55.0 - {i * 40}) * {3 + i * 1.5}", 0.0]}

    # Liegen (5.00 neu) - Fynn: "Die Schlafanimation ... sind ein bisschen
    # zusammengequetscht und sehen kleiner aus, als sie in Wirklichkeit
    # sind ... die grossen Drachen sollen gross bleiben." Frueher sank der
    # Leib tiefer, als der Bauch hoch ist, und rollte sich zur Kugel. Jetzt
    # liegt der Bauch genau auf dem Boden (bauch: wie hoch er beim Stehen
    # ist), und er liegt lang wie ein Hund: die Vorderpfoten flach nach vorn,
    # die Hinterbeine seitlich untergeschlagen, die Schwingen angelegt.
    # Der Wyvern stuetzt sich im Liegen nicht auf die Handgelenke - er legt
    # die Schwingen an wie die anderen.
    falt_liegen = dg.faltung(schwinge, False)

    def liegend():
        k = {}
        beidseitig(k, dict(falt_liegen))
        zusammen(k, finger)
        beidseitig(k, {"bein_vorn": [22.0, 0.0, -4.0], "unterbein_vorn": [-108.0, 0.0, 0.0],
                       "fuss_vorn": [86.0, 0.0, 0.0], "zehen_vorn": [4.0, 0.0, 0.0],
                       "bein_hinten": [-62.0, 0.0, -14.0], "unterbein_hinten": [118.0, 0.0, 0.0],
                       "fuss_hinten": [-52.0, 0.0, 0.0], "zehen_hinten": [8.0, 0.0, 0.0]})
        k["rumpf"] = {"position": [0.0, -bauch, 0.0]}
        return k

    # Schlafen: lang ausgestreckt und doch leicht eingedreht (Fynn: "Der soll
    # sich trotzdem so leicht eindrehen") - der Hals biegt sich in einem
    # weiten Bogen zur Seite, der Kopf ruht neben den Vorderpfoten, der
    # Schwanz legt sich im Bogen nach vorn um ihn. Er bleibt so lang und
    # gross, wie er ist. Er atmet tief und langsam, schnarcht mit leicht
    # offenem Maul, im Traum zucken eine Schwinge und die Schwanzspitze.
    schlaf = liegend()
    schlaf["fluegel_links"]["rotation"][2] = f"{schlaf['fluegel_links']['rotation'][2]} + {zucken(5.0, 40.0)} * 6.0"
    schlaf["rumpf"]["scale"] = [f"1.0 + math.sin({T} * 24.0) * 0.02", f"1.0 + math.sin({T} * 24.0) * 0.03", 1.0]
    for i in range(1, hals + 1):
        schlaf[f"hals{i}"] = {"rotation": [round(34.0 / hals + (4.0 if i == 1 else 0.0), 1), round(62.0 / hals, 1), 0.0]}
    schlaf["kopf"] = {"rotation": [-18.0, 18.0, 12.0]}
    schlaf["becken"] = {"rotation": [0.0, -8.0, 0.0]}
    schlaf["kiefer"] = {"rotation": [f"math.max(0.0, math.sin({T} * 24.0)) * 5.0", 0.0, 0.0]}
    for i in range(1, schwanz + 1):
        traum = f"{zucken(9.0, 30.0)} * math.sin({T} * 500.0) * 12.0" if i == schwanz else 0.0
        schlaf[f"schwanz{i}"] = {"rotation": [-16.0 if i == 1 else (3.0 if i == 2 else 1.0),
                                              round(-130.0 / schwanz, 1), traum]}

    # Platz (5.00 neu): Wer seinem Drachen "bleib hier" sagt, dem legt er
    # sich hin wie ein Hund - wach, den Kopf erhoben, er sieht sich um,
    # waelzt ab und zu den Schwanz, gaehnt und blinzelt.
    ruhen = liegend()
    for i, w in enumerate((-16.0, -10.0, -4.0, 2.0, 6.0)[:hals]):
        ruhen[f"hals{i + 1}"] = {"rotation": [f"{w} + math.sin({T} * 30.0 - {i * 25}) * 1.5",
                                              f"math.sin({T} * 13.0 - {i * 20}) * 5.0", 0.0]}
    gaehnen = f"math.pow(math.max(0.0, math.sin({T} * 16.0)), 30.0)"
    ruhen["kopf"] = {"rotation": [f"14.0 - {gaehnen} * 25.0", f"math.sin({T} * 19.0) * 18.0",
                                  f"math.sin({T} * 11.0) * 6.0"]}
    ruhen["kiefer"] = {"rotation": [f"{gaehnen} * 45.0", 0.0, 0.0]}
    ruhen["rumpf"]["scale"] = [1.0, f"1.0 + math.sin({T} * 40.0) * 0.015", 1.0]
    for i in range(1, schwanz + 1):
        ruhen[f"schwanz{i}"] = {"rotation": [-16.0 if i == 1 else (3.0 if i == 2 else 1.0),
                                             f"{round(-40.0 / schwanz, 1)} + math.sin({T} * 26.0 - {i * 35}) * {1.5 + i * 0.8:.1f}",
                                             0.0]}

    # Besiegt (4.98 neu) - Fynn: "sieht nicht realistisch aus, wenn die Beine
    # einfach so gerade stehen ... er sollte so liegen, als waere er wirklich
    # k.o. - aber nicht die gleiche Animation wie das Schlafen."
    # Er ist zusammengesackt: flach auf dem Bauch, leicht zur Seite gekippt,
    # alle Muskeln schlaff. Die Vorderbeine rutschen seitlich weg, die
    # Ellbogen geknickt, die Klauen offen und kraftlos; die Hinterbeine
    # liegen breit nach hinten und aussen, die Knie gebeugt. Beide Schwingen
    # sind halb aufgefallen und liegen flach am Boden. Der Hals liegt lang
    # ausgestreckt, der Kopf auf der Seite, das Maul offen. Er atmet flach
    # und schnell, ab und zu zucken ein Fuss und eine Schwinge, und der Kopf
    # versucht sich zu heben und faellt zurueck.
    # (Schlafen dagegen: eingerollt, Kopf am Becken, Schwinge als Decke.)
    nieder = {}
    for seite, zeichen in (("links", 1), ("rechts", -1)):
        for name, (x, y, z) in falt.items():
            w = [round(x * 0.45, 1), round(y * 0.45 * zeichen, 1), round(z * 0.45 * zeichen, 1)]
            if name == "fluegel":
                # Die Schwinge faellt nach aussen auf den Boden. Der Wyvern
                # stuetzt sich sonst darauf - hier liegt sie flach daneben.
                w[2] = round(z * 0.12 * zeichen + 14.0 * zeichen, 1) if stuetzt else round(w[2] + 42.0 * zeichen, 1)
            nieder[f"{name}_{seite}"] = {"rotation": w}
        nieder[f"armhaut_{seite}"] = {"scale": [1.0, 1.0, 0.8]}
        nieder[f"unterarmhaut_{seite}"] = {"scale": [1.0, 1.0, 0.8]}
        for i in range(1, finger):
            nieder[f"fingerhaut{i}_{seite}"] = {"scale": [1.0, 1.0, 0.75]}
    nieder["fluegel_rechts"]["rotation"][2] = (f"{nieder['fluegel_rechts']['rotation'][2]}"
                                               f" - {zucken(4.0, 40.0)} * 6.0")
    nieder["rumpf"] = {"rotation": [3.0, 0.0, -6.0], "position": [0.0, -(bauch - 1.0), 0.0],
                       "scale": [f"1.0 + math.sin({T} * 170.0) * 0.012", f"1.0 + math.sin({T} * 170.0) * 0.02", 1.0]}
    nieder["becken"] = {"rotation": [0.0, 8.0, 8.0]}
    # Beine: schlaff, jedes Gelenk ein wenig geknickt, nach aussen weggerutscht
    # (z < 0 dreht das linke Bein nach aussen).
    # Der Leib liegt am Boden, die Beine liegen darum flach: nach vorn und
    # hinten weggestreckt und weit nach aussen gerutscht, nur leicht geknickt.
    beidseitig(nieder, {"bein_vorn": [-78.0, 0.0, -52.0], "unterbein_vorn": [28.0, 0.0, 0.0],
                        "fuss_vorn": [20.0, 0.0, 0.0], "zehen_vorn": [30.0, 0.0, 0.0],
                        "bein_hinten": [72.0, 0.0, -46.0], "unterbein_hinten": [22.0, 0.0, 0.0],
                        "fuss_hinten": [28.0, 0.0, 0.0], "zehen_hinten": [36.0, 0.0, 0.0]})
    nieder["fuss_hinten_links"] = {"rotation": [f"30.0 + {zucken(6.0, 40.0)} * math.sin({T} * 900.0) * 16.0",
                                                0.0, 0.0]}
    for i in range(1, hals + 1):
        # Lang ausgestreckt, zum Boden hin durchhaengend, leicht gebogen.
        nieder[f"hals{i}"] = {"rotation": [7.0 if i <= 2 else 3.0, (4.0, -3.0, 5.0, -2.0, 4.0)[(i - 1) % 5], 0.0]}
    heben = f"math.pow(math.max(0.0, math.sin({T} * 22.0)), 8.0)"
    nieder["kopf"] = {"rotation": [f"10.0 - {heben} * 16.0", 8.0, f"38.0 - {heben} * 20.0"]}
    nieder["kiefer"] = {"rotation": [f"20.0 + math.sin({T} * 170.0) * 2.0 - {heben} * 8.0", 0.0, 0.0]}
    # Der Schwanz (4.99 - Fynn: "die Schwaenze schweben noch steif in der
    # Luft, wenn er besiegt ist"): Der Leib liegt tiefer, der Schwanz setzt
    # also dicht ueber dem Boden an - das erste Glied knickt nach unten,
    # die folgenden liegen flach auf und werden duenner, jedes ein wenig
    # zur Seite gelegt wie ein hingeworfenes Seil.
    for i in range(1, schwanz + 1):
        # (Beim Schwanz, der nach hinten zeigt, senkt ein negativer Winkel.)
        senk = -20.0 if i == 1 else max(0.0, round(4.0 - (i - 2) * 0.7, 1))
        nieder[f"schwanz{i}"] = {"rotation": [senk, f"{(7.0 if i % 2 else -4.0)} + math.sin({T} * 30.0 - {i * 30}) * 0.8",
                                              0.0]}
    nieder[f"schwanz{schwanz}"]["rotation"][1] = f"math.sin({T} * 80.0) * 3.0 + {zucken(5.0, 30.0)} * 14.0"

    ruht = f"(1.0 - {LIEGT})"
    return {
        "flug": ({"loop": True, "bones": flug}, f"{FLIEGT} * {ruht}"),
        "schweben": ({"loop": True, "bones": schweben}, f"{FLIEGT} * {FEUER} * {ruht}"),
        "stand": ({"loop": True, "bones": stand}, f"(1.0 - {FLIEGT}) * {ruht} * (1.0 - {PLATZ})"),
        "gehen": ({"loop": True, "bones": gang}, f"(1.0 - {FLIEGT}) * {LAEUFT} * {ruht} * (1.0 - {PLATZ})"),
        "platz": ({"loop": True, "bones": ruhen}, f"(1.0 - {FLIEGT}) * {ruht} * {PLATZ}"),
        "schlafen": ({"loop": True, "bones": schlaf}, SCHLAEFT),
        "niederliegen": ({"loop": True, "bones": nieder}, BESIEGT),
        "luftholen": ({"loop": True, "bones": holen}, HOLEN),
        ATEMARTEN[atem][1]: ({"loop": True, "bones": speit}, SPEIT),
        # Eigener Name: "bruellen" gibt der Tierbau allen Tieren mit eigenem
        # Zufallstakt (ZUSATZ_GEWICHT) - das weckte sonst Schlafende.
        "drachenbruellen": ({"loop": True, "bones": bruellen}, BRUELL),
        "sturzflug": ({"loop": True, "bones": stoss},
                      f"{FLIEGT} * math.clamp(-query.vertical_speed * 0.6 - 0.2, 0.0, 1.0)"),
        "drachenblick": ({"loop": True, "bones": blick_bewegung(hals)}, ruht),
        "drachenbiss": ({"loop": True, "bones": biss_bewegung(hals, schwanz, not stuetzt)},
                        f"(variable.attack_time > 0.0) * {ruht}"),
    }


# ------------------------------------------------------------ Verhalten

HEILMITTEL = ["minecraft:golden_apple", "minecraft:enchanted_golden_apple"]
URALT_GROESSE = 2.2


# ------------------------------------------------------------ Jungdrachen (5.2)
#
# Fynn: "Babydrachen, die langsam wachsen, und man sieht den Wachstum in
# kleineren Ticks, dass er nicht direkt von klein zu gross wird."
#
# fynn:wuchs zaehlt von 0 (frisch geschluepft) bis WUCHS (ausgewachsen);
# wilde Drachen stehen von Anfang an auf WUCHS. Das Skript zaehlt die Zeit
# und stellt die Stufen weiter (scripts/drachenzucht.js). Im Bild waechst
# er ueber die Groesse im Aussehen - weich in gut einer Sekunde von Stufe
# zu Stufe (variable.fynn_wuchs zieht nach); der Trefferkasten waechst in
# den Stufengruppen mit.
WUCHS = 10
FLEISCH = ["minecraft:beef", "minecraft:porkchop", "minecraft:mutton", "minecraft:chicken", "minecraft:rabbit",
           "minecraft:cod", "minecraft:salmon", "fynn:elchfleisch", "fynn:bisonfleisch"]
WUCHS_EIG = "query.property('fynn:wuchs')"
WUCHS_VAR = "variable.fynn_wuchs"
WUCHS_ANFANG = [f"{WUCHS_VAR} = {WUCHS_EIG};"]
WUCHS_VORHER = [f"{WUCHS_VAR} = math.lerp({WUCHS_VAR}, {WUCHS_EIG}, math.min(1.0, query.delta_time * 1.5));"]
JUNG = f"(1.0 - {WUCHS_VAR} / {WUCHS:.1f})"


def wuchs_faktor(k):
    """Wie gross im Verhaeltnis zum Erwachsenen: frisch geschluepft 0,3."""
    return round(0.3 + 0.7 * k / WUCHS, 3)


def jung_zustaende(gruppen, ereignisse, eintrag):
    """Stufengruppen, Zaehmen nach dem Schluepfen und das Erwachsenwerden."""
    breite, hoehe = eintrag["kollision"]
    stufen = [f"fynn:wuchs_{k}" for k in range(WUCHS + 1)]
    for k in range(WUCHS + 1):
        f = wuchs_faktor(k)
        gruppen[stufen[k]] = {"minecraft:collision_box": {"width": round(breite * f, 2), "height": round(hoehe * f, 2)}}
        if k < WUCHS:
            gruppen[stufen[k]]["minecraft:is_baby"] = {}
    # Frisch geschluepft gehoert er noch niemandem: Das Skript zaehmt ihn fuer
    # den Besitzer des Eis; wer nicht da ist, kann ihn mit rohem Fleisch zaehmen.
    gruppen["fynn:zaehmbar"] = {"minecraft:tameable": {"probability": 1.0, "tame_items": FLEISCH,
                                                        "tame_event": {"event": "fynn:jung_zahm", "target": "self"}}}
    # Zahm, aber noch zu klein: kein Sattel, kein Reiter, kein Kampf.
    gruppen["fynn:zahm_jung"] = {
        "minecraft:is_tamed": {},
        "minecraft:behavior.look_at_player": {"priority": 7, "look_distance": 8, "probability": 0.1},
    }
    varianten = eintrag["varianten"]
    ereignisse["fynn:schluepfen"] = {"sequence": [
        {"randomize": [{"weight": w, "add": {"component_groups": [f"fynn:variante_{i}"]}}
                       for i, (_, w) in enumerate(varianten)]},
        {"add": {"component_groups": ["fynn:boden", "fynn:zaehmbar", stufen[0]]},
         "set_property": {"fynn:wuchs": 0, "fynn:fliegt": False}}]}
    # Das Skript gibt dem Jungen die Farbvariante seines Elternteils (5.2).
    for i in range(len(varianten)):
        ereignisse[f"fynn:farbe_{i}"] = {
            "remove": {"component_groups": [f"fynn:variante_{j}" for j in range(len(varianten)) if j != i]},
            "add": {"component_groups": [f"fynn:variante_{i}"]}}
    ereignisse["fynn:jung_zahm"] = {"remove": {"component_groups": ["fynn:zaehmbar"]},
                                    "add": {"component_groups": ["fynn:zahm_jung", "fynn:folgt"]}}
    for k in range(1, WUCHS):
        ereignisse[f"fynn:wachsen_{k}"] = {"remove": {"component_groups": [s for s in stufen if s != stufen[k]]},
                                          "add": {"component_groups": [stufen[k]]},
                                          "set_property": {"fynn:wuchs": k}}
    # Ausgewachsen: jetzt mit Sattel, Reiter und Beute. Die Stufe WUCHS
    # traegt den vollen Trefferkasten (die Gruppe davor ist ja weg).
    ereignisse["fynn:ausgewachsen"] = {
        "remove": {"component_groups": [s for s in stufen if s != stufen[WUCHS]] + ["fynn:zahm_jung", "fynn:zaehmbar"]},
        "add": {"component_groups": [stufen[WUCHS], "fynn:zahm", "fynn:erwachsen"]},
        "set_property": {"fynn:wuchs": WUCHS}}


# Mischlinge (5.2) haben nicht nur die Farben und ein Kennzeichen der
# anderen Art, sondern auch ein wenig von ihrer Gestalt: vom Feuerdrachen
# den schweren Kopf, vom Frostwyvern lange, schlanke Beine und weite
# Schwingen, vom Himmelsdrachen den langen Schwanz und kleinere Schwingen,
# vom Giftdrachen den dicken Hals, von der Nachtschwinge den schmalen Kopf
# und riesige Schwingen, vom Schlunddrachen den maechtigen Kopf.
def _alle(namen, wert):
    return {n: {"scale": wert} for n in namen}


KOEPFE = ("kopf", "kopf_a", "kopf_b")
HAELSE = ("hals1", "hals_a1", "hals_b1")
SCHWINGEN = ("fluegel_links", "fluegel_rechts", "hfluegel_links", "hfluegel_rechts")
BEINE = tuple(f"bein_{l}_{s}" for l in ("vorn", "hinten") for s in ("links", "rechts"))
MISCHGESTALT = {
    "lindwurm": {**_alle(KOEPFE, 1.1), **_alle(("horn_links", "horn_rechts", "horn_a_links", "horn_a_rechts"), 1.2)},
    "frostwyvern": {**_alle(SCHWINGEN, 1.1), **_alle(BEINE, [0.85, 1.08, 0.85])},
    "himmelsdrache": {**_alle(SCHWINGEN, 0.85), "schwanz1": {"scale": [0.9, 0.9, 1.18]}},
    "giftdrache": {**_alle(HAELSE, [1.15, 1.15, 1.0]), **_alle(KOEPFE, 1.06)},
    "nachtschwinge": {**_alle(SCHWINGEN, 1.16), **_alle(KOEPFE, [0.9, 0.92, 1.05])},
    "schlunddrache": {**_alle(KOEPFE, 1.22), **_alle(HAELSE, 0.9)},
    # Die Arten aus der Zucht: vom Dampfdrachen die hohen Beine, vom
    # Sternendrachen der lange Schwanz und weite Schwingen, vom Lavadrachen
    # der wuchtige Kopf und staemmige Beine.
    "dampfdrache": {**_alle(BEINE, [0.9, 1.12, 0.9]), **_alle(KOEPFE, 0.94)},
    "sternendrache": {**_alle(SCHWINGEN, 1.1), "schwanz1": {"scale": [0.9, 0.9, 1.2]}},
    "lavadrache": {**_alle(KOEPFE, 1.12), **_alle(BEINE, [1.15, 0.95, 1.15])},
}


def _szene(von, dauer):
    """0..1..0 in einem Fenster der vierzehn Sekunden langen Spieluhr der Jungen."""
    uhr = f"math.mod({T}, 14.0)"
    return (f"({uhr} >= {von} && {uhr} < {von + dauer} ? "
            f"math.clamp(math.sin(({uhr} - {von}) / {dauer} * 180.0) * 2.0, 0.0, 1.0) : 0.0)")


JUNG_SPIELT = "(query.property('fynn:wuchs') < 10) * variable.fynn_ruhig"
JUNG_FLATTERN = f"({JUNG_SPIELT} * {_szene(5.0, 2.0)})"


def zucht_bewegungen(koepfe):
    """Kleine Szenen zur Zucht (5.2).

    * Junge spielen, wenn sie ruhig stehen: alle vierzehn Sekunden erst ein
      paar Hopser mit gesenktem Kopf, dann ein Flatterversuch mit den kleinen
      Schwingen, dann ein Schwanzwedeln mit schief gelegtem Kopf.
    * Verliebt (fynn:verliebt): Kopf gesenkt und schraeg, der Schwanz wedelt.
    * Wirkt er eine Gabe (fynn:wirkt): Er baeumt sich auf, reisst die
      Schwingen hoch und bruellt."""
    jung = JUNG_SPIELT
    szene = _szene

    def fuer_koepfe(k, name, wert):
        for s_ in koepfe:
            k[f"{name}{s_}"] = wert

    hopsen = {"rumpf": {"position": [0.0, f"math.abs(math.sin({T} * 540.0)) * 2.5", 0.0],
                        "rotation": [f"-math.sin({T} * 540.0) * 6.0", 0.0, 0.0]},
              "schwanz1": {"rotation": [8.0, f"math.sin({T} * 900.0) * 20.0", 0.0]}}
    beidseitig(hopsen, {"bein_vorn": [-25.0, 0.0, 0.0]})
    fuer_koepfe(hopsen, "kopf", {"rotation": [15.0, 0.0, 0.0]})
    flattern = {"rumpf": {"position": [0.0, f"math.abs(math.sin({T} * 800.0)) * 1.2", 0.0]}}
    for vor in ("", "h"):
        flattern[f"{vor}fluegel_links"] = {"rotation": [0.0, 0.0, f"math.sin({T} * 1600.0) * 35.0"]}
        flattern[f"{vor}fluegel_rechts"] = {"rotation": [0.0, 0.0, f"-math.sin({T} * 1600.0) * 35.0"]}
    fuer_koepfe(flattern, "kopf", {"rotation": [-15.0, 0.0, 0.0]})
    wedeln = {f"schwanz{i}": {"rotation": [0.0, f"math.sin({T} * 700.0 - {i * 40}) * 18.0", 0.0]} for i in (1, 2, 3)}
    fuer_koepfe(wedeln, "kopf", {"rotation": [0.0, 0.0, f"math.sin({T} * 200.0) * 14.0"]})
    verliebt = {f"schwanz{i}": {"rotation": [0.0, f"math.sin({T} * 400.0 - {i * 40}) * 12.0", 0.0]} for i in (1, 2, 3)}
    fuer_koepfe(verliebt, "kopf", {"rotation": [18.0, 0.0, f"math.sin({T} * 150.0) * 14.0"]})
    fuer_koepfe(verliebt, "hals", {"rotation": [10.0, 0.0, 0.0]})
    verliebt["hals1"] = {"rotation": [10.0, 0.0, 0.0]}
    wirkt = {"rumpf": {"rotation": [f"-14.0 * (1.0 - {FLIEGT})", 0.0, 0.0]}, "hals1": {"rotation": [-15.0, 0.0, 0.0]}}
    for vor in ("", "h"):
        wirkt[f"{vor}fluegel_links"] = {"rotation": [0.0, 0.0, -20.0]}
        wirkt[f"{vor}fluegel_rechts"] = {"rotation": [0.0, 0.0, 20.0]}
    fuer_koepfe(wirkt, "kopf", {"rotation": [-20.0, 0.0, 0.0]})
    fuer_koepfe(wirkt, "kiefer", {"rotation": [f"35.0 + math.sin({T} * 900.0) * 3.0", 0.0, 0.0]})
    return {
        "jung_hopsen": ({"loop": True, "bones": hopsen}, f"{jung} * {szene(0.0, 2.2)}"),
        "jung_flattern": ({"loop": True, "bones": flattern}, f"{jung} * {szene(5.0, 2.0)}"),
        "jung_wedeln": ({"loop": True, "bones": wedeln}, f"{jung} * {szene(9.0, 2.6)}"),
        "verliebt": ({"loop": True, "bones": verliebt}, "query.property('fynn:verliebt') * variable.fynn_ruhig"),
        "gabe_wirken": ({"loop": True, "bones": wirkt}, "query.property('fynn:wirkt')"),
    }


def jung_bewegung(koepfe):
    """Ein Junges ist nicht einfach ein kleiner Drache: Der Kopf ist gross,
    Hals und Schwanz kurz, Schwingen und Hoerner Stummel, die Beine
    staemmig. Je aelter, desto weniger davon."""
    k = {}

    def gross(name, wie, flach=False):
        s = f"1.0 + {wie} * {JUNG}"
        k[name] = {"scale": [s, 1.0, s] if flach else s}

    for s_ in koepfe:
        gross(f"kopf{s_}", 0.75)
        gross(f"hals{s_}1", -0.22)
        for seite in ("links", "rechts"):
            gross(f"horn{s_}_{seite}", -0.55)
            gross(f"geweih{s_}_{seite}", -0.5)
    gross("schwanz1", -0.25)
    for vor in ("", "h"):
        for seite in ("links", "rechts"):
            gross(f"{vor}fluegel_{seite}", -0.4)
    for lage in ("vorn", "hinten"):
        for seite in ("links", "rechts"):
            gross(f"bein_{lage}_{seite}", 0.3, flach=True)
    return {"loop": True, "bones": k}


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
        "fynn:bleiben": {"remove": {"component_groups": ["fynn:folgt"]}, "add": {"component_groups": ["fynn:bleibt"]},
                         "set_property": {"fynn:wartet": True}},
        "fynn:folgen": {"remove": {"component_groups": ["fynn:bleibt"]}, "add": {"component_groups": ["fynn:folgt"]},
                        "set_property": {"fynn:wartet": False}},
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
    for n in ("fynn:feuer", "fynn:fliegt", "fynn:schlaeft", "fynn:besiegt", "fynn:uralt", "fynn:wartet"):
        e.update(eigenschaft(n))
    # Jungdrachen und Mischlinge (5.2): wie gross (WUCHS = erwachsen) und in
    # wessen Farben (0 = eigene, sonst 1 + Nummer der Art in DRACHEN).
    e["fynn:wuchs"] = {"type": "int", "range": [0, WUCHS], "default": WUCHS, "client_sync": True}
    e["fynn:misch"] = {"type": "int", "range": [0, 27], "default": 0, "client_sync": True}
    e.update(eigenschaft("fynn:verliebt", "fynn:wirkt"))
    return e


def schlangen_bewegungen(glieder=22, hals=2, flossen=(), beinglied=6):
    """Der Himmelsdrache hat keine Schwingen: Er schwimmt durch die Luft.

    Seit 4.95 (Fynn: "fliegt ein bisschen wie Rayquaza ... braucht bessere
    Animation, mehr Gelenke") laeuft durch seine 22 Glieder eine Welle, die
    zugleich seitlich und auf und ab schwingt, eine Vierteldrehung
    versetzt: Der Leib windet sich wie eine Schraube durch die Luft, jedes
    Glied einen Takt nach dem vorigen. Kopf und Hals halten dagegen, damit
    der Kopf ruhig nach vorn sieht. Die Barthaare wehen in drei Gliedern
    nach, die Seitenflossen schlagen, die Schwanzflosse steuert. Alle 23
    Sekunden eine Fassrolle."""
    def seiten(knochen, werte):
        for seite, z in (("links", 1), ("rechts", -1)):
            for name, (x, y, zz) in werte.items():
                knochen[f"{name}_{seite}"] = {"rotation": [x, y if isinstance(y, (int, float)) else f"{z} * ({y})",
                                                           zz if isinstance(zz, (int, float)) else f"{z} * ({zz})"]}

    def barthaare(knochen, tempo, weite, grund=(0.0, 0.0)):
        """Drei Glieder, jedes einen Takt spaeter und weiter ausschlagend."""
        seiten(knochen, {f"bart{j}": [f"{grund[0] if j == 1 else 0.0} + math.sin({T} * {tempo} - {j * 50}) * {weite * (0.6 + j * 0.3):.1f}",
                                      f"{grund[1] if j == 1 else 0.0} + math.sin({T} * {tempo * 0.8:.0f} - {j * 50}) * {weite * (0.7 + j * 0.3):.1f}",
                                      0.0] for j in (1, 2, 3)})

    def flossenschlag(knochen, tempo, weite, grund=0.0):
        for n in flossen:
            seiten(knochen, {f"flosse{n}": [0.0, f"{grund} + math.sin({T} * {tempo} - {n * 30}) * {weite}",
                                            f"math.sin({T} * {tempo} - {n * 30} + 90.0) * {weite * 1.2:.1f}"]})

    om = 150.0          # Grad je Sekunde: wie schnell die Welle durch den Leib laeuft
    rz = f"math.mod({T} + 9.0, 23.0)"
    rolle = f"(({rz} < 2.6 && !query.has_rider) ? math.pow(math.sin({rz} / 2.6 * 90.0), 2.0) * 360.0 : 0.0)"
    flug = {}
    flug["rumpf"] = {"rotation": [f"-query.target_x_rotation * 0.3 + math.cos({T} * {om} + 30.0) * 5.0",
                                  f"math.sin({T} * {om} + 30.0) * 7.0",
                                  f"variable.fynn_dreh * 2.0 + math.sin({T} * {om} + 90.0) * 4.0 + {rolle}"],
                     "position": [0.0, f"math.sin({T} * {om}) * 1.4", 0.0]}
    for i in range(1, glieder + 1):
        ph = f"{T} * {om} - {i * 24}"
        flug[f"schwanz{i}"] = {"rotation": [f"math.cos({ph}) * {5.5 + i * 0.12:.2f}",
                                            f"math.sin({ph}) * {8.0 + i * 0.25:.2f} - variable.fynn_dreh * 0.5",
                                            f"math.sin({ph} + 60.0) * 2.0"]}
    for i in range(1, hals + 1):
        flug[f"hals{i}"] = {"rotation": [f"-math.cos({T} * {om} + {30 + i * 25}) * 3.0",
                                         f"-math.sin({T} * {om} + {30 + i * 25}) * 5.0", 0.0]}
    flug["kopf"] = {"rotation": [f"-math.cos({T} * {om} + 90.0) * 2.5", f"-math.sin({T} * {om} + 90.0) * 5.0", 0.0]}
    flug["kiefer"] = {"rotation": [f"{zucken(15.0, 10.0)} * 20.0", 0.0, 0.0]}
    barthaare(flug, 180.0, 12.0, (-10.0, 10.0))
    flossenschlag(flug, 320.0, 14.0)
    flug["schwanzflosse"] = {"rotation": [f"math.cos({T} * {om} - {glieder * 20 + 20}) * 10.0",
                                          f"math.sin({T} * {om} - {glieder * 20 + 20}) * 16.0", 0.0]}
    for teil, versatz in (("vorn", 0.0), ("hinten", 90.0)):
        for seite, ph in (("links", 0.0), ("rechts", 180.0)):
            p_ = f"{T} * 120.0 + {versatz + ph}"
            flug[f"bein_{teil}_{seite}"] = {"rotation": [f"45.0 + math.sin({p_}) * 25.0", 0.0, 0.0]}
            flug[f"unterbein_{teil}_{seite}"] = {"rotation": [f"-30.0 + math.cos({p_}) * 20.0", 0.0, 0.0]}
            flug[f"fuss_{teil}_{seite}"] = {"rotation": [40.0, 0.0, 0.0]}
            flug[f"zehen_{teil}_{seite}"] = {"rotation": [f"20.0 + math.cos({p_}) * 25.0", 0.0, 0.0]}

    # Am Boden: Er kriecht in Wellen, im Tempo seines Weges.
    w = "query.modified_distance_moved * 22.0"
    gang = {"rumpf": {"rotation": [0.0, f"math.sin({w}) * 5.0", f"math.sin({w} + 60.0) * 3.0"]}}
    for i in range(1, glieder + 1):
        gang[f"schwanz{i}"] = {"rotation": [0.0, f"math.sin({w} - {i * 24}) * {4 + i * 0.3:.1f}", 0.0]}
    for teil, versatz in (("vorn", 0.0), ("hinten", 180.0)):
        for seite, ph in (("links", 0.0), ("rechts", 180.0)):
            p_ = f"{w} + {versatz + ph}"
            gang[f"bein_{teil}_{seite}"] = {"rotation": [f"math.sin({p_}) * 30.0", 0.0, 0.0]}
            gang[f"zehen_{teil}_{seite}"] = {"rotation": [f"math.max(0.0, -math.cos({p_})) * 35.0", 0.0, 0.0]}
    # Wie eine Kobra: der Vorderleib aufgerichtet, der Kopf pendelt langsam
    # hin und her, der Leib liegt in einer langsam wandernden S-Kurve.
    stand = {"rumpf": {"rotation": [f"-10.0 + math.sin({T} * 35.0) * 2.0", 0.0, f"math.sin({T} * 26.0) * 4.0"],
                       "scale": [1.0, f"1.0 + math.sin({T} * 50.0) * 0.015", 1.0]}}
    for i in range(1, glieder + 1):
        stand[f"schwanz{i}"] = {"rotation": [3.0 if i == 1 else 0.0,
                                             f"math.sin({T} * 30.0 - {i * 22}) * {5.0 + i * 0.15:.1f}", 0.0]}
    for i in range(1, hals + 1):
        stand[f"hals{i}"] = {"rotation": [f"-6.0 + math.sin({T} * 35.0 - {i * 30}) * 2.0",
                                          f"math.sin({T} * 26.0 - {i * 25}) * 8.0", 0.0]}
    stand["kopf"] = {"rotation": [f"16.0 + math.sin({T} * 40.0) * 3.0 + {zucken(11.0, 30.0)} * 10.0",
                                  f"math.sin({T} * 21.0) * 14.0", f"math.sin({T} * 13.0) * 8.0"]}
    stand["kiefer"] = {"rotation": [f"{zucken(23.0, 24.0)} * 16.0", 0.0, 0.0]}
    barthaare(stand, 60.0, 5.0, (25.0, 0.0))
    flossenschlag(stand, 90.0, 6.0)
    stand["zehen_vorn_links"] = {"rotation": [f"-{zucken(7.0, 6.0)} * math.max(0.0, math.sin({T} * 900.0)) * 18.0",
                                              0.0, 0.0]}

    # Schlafen: zu einer Spirale gerollt, nach hinten immer enger, so liegt
    # der Schwanz innen und der Kopf obenauf. Die Flossen liegen an.
    schlaf = {"rumpf": {"position": [0.0, -8.0, 0.0],
                        "scale": [f"1.0 + math.sin({T} * 24.0) * 0.025", f"1.0 + math.sin({T} * 24.0) * 0.04", 1.0]}}
    for i in range(1, glieder + 1):
        # Eine lockere Spirale (5.00): nicht eng zusammengeschnuert.
        schlaf[f"schwanz{i}"] = {"rotation": [0.0, round(8.0 + i * 0.55, 1), 0.0]}
    schlaf[f"schwanz{glieder}"]["rotation"][2] = f"{zucken(9.0, 30.0)} * math.sin({T} * 500.0) * 14.0"
    for i in range(1, hals + 1):
        schlaf[f"hals{i}"] = {"rotation": [8.0, -30.0, 0.0]}
    schlaf["kopf"] = {"rotation": [-5.0, -30.0, 0.0]}
    schlaf["kiefer"] = {"rotation": [f"math.max(0.0, math.sin({T} * 24.0)) * 5.0", 0.0, 0.0]}
    seiten(schlaf, {"bart1": [40.0, "10.0", 0.0], "bart2": [20.0, 0.0, 0.0]})
    for n in flossen:
        seiten(schlaf, {f"flosse{n}": [0.0, "-45.0", 0.0]})
    for teil in ("vorn", "hinten"):
        for seite in ("links", "rechts"):
            schlaf[f"bein_{teil}_{seite}"] = {"rotation": [-70.0, 0.0, 0.0]}
            schlaf[f"unterbein_{teil}_{seite}"] = {"rotation": [100.0, 0.0, 0.0]}
            schlaf[f"zehen_{teil}_{seite}"] = {"rotation": [30.0, 0.0, 0.0]}
    # Besiegt: lang hingestreckt und auf die Seite gerollt, der Leib in
    # einer schlaffen Welle, das Maul offen, Barthaare und Flossen liegen
    # kraftlos am Boden - nur die Schwanzflosse zuckt noch.
    nieder = {"rumpf": {"rotation": [0.0, 0.0, 72.0], "position": [0.0, -6.0, 0.0],
                        "scale": [f"1.0 + math.sin({T} * 170.0) * 0.012", f"1.0 + math.sin({T} * 170.0) * 0.018", 1.0]}}
    for i in range(1, glieder + 1):
        nieder[f"schwanz{i}"] = {"rotation": [0.0, f"{round(math.sin(math.radians(i * 30)) * 6.0, 1)}", 0.0]}
    for i in range(1, hals + 1):
        nieder[f"hals{i}"] = {"rotation": [4.0, 6.0, 0.0]}
    nieder["kopf"] = {"rotation": [f"6.0 - math.pow(math.max(0.0, math.sin({T} * 30.0)), 6.0) * 16.0", 10.0, -40.0]}
    nieder["kiefer"] = {"rotation": [f"20.0 + math.sin({T} * 170.0) * 2.0", 0.0, 0.0]}
    seiten(nieder, {"bart1": [60.0, "0.0", 0.0], "bart2": [15.0, 0.0, 0.0], "bart3": [10.0, 0.0, 0.0]})
    for n in flossen:
        # Die Flossen fallen kraftlos nach hinten an den Leib.
        seiten(nieder, {f"flosse{n}": [0.0, "-50.0", "-10.0"]})
    nieder["schwanzflosse"] = {"rotation": [0.0, f"{zucken(6.0, 40.0)} * math.sin({T} * 900.0) * 20.0", 0.0]}
    for teil in ("vorn", "hinten"):
        for seite in ("links", "rechts"):
            # Schlaff, nicht steif: jedes Gelenk ein wenig eingeknickt.
            nieder[f"bein_{teil}_{seite}"] = {"rotation": [-38.0, 0.0, 0.0]}
            nieder[f"unterbein_{teil}_{seite}"] = {"rotation": [62.0, 0.0, 0.0]}
            nieder[f"fuss_{teil}_{seite}"] = {"rotation": [25.0, 0.0, 0.0]}
            nieder[f"zehen_{teil}_{seite}"] = {"rotation": [40.0, 0.0, 0.0]}

    # Sturmhauch: Er rollt sich zusammen wie eine gespannte Feder - der
    # Leib in engen Zacken, der Kopf zurueckgenommen, Barthaare und Flossen
    # gespreizt. Dann schnellt er sich gerade, stoesst den Kopf vor und
    # blaest; der Leib zittert, Barthaare und Flossen reisst der Wind nach
    # hinten.
    holen = {"rumpf": {"rotation": [-14.0, 0.0, 0.0], "scale": [1.06, 1.06, 1.0]}}
    for i in range(1, glieder + 1):
        holen[f"schwanz{i}"] = {"rotation": [0.0, f"{round(math.sin(math.radians(i * 24)) * 26.0, 1)}"
                                                  f" + math.sin({T} * 400.0 - {i * 40}) * 1.0", 0.0]}
    holen["hals1"] = {"rotation": [-18.0, 0.0, 0.0]}
    holen["hals2"] = {"rotation": [-12.0, 0.0, 0.0]}
    holen["kopf"] = {"rotation": [14.0, 0.0, 0.0]}
    holen["kiefer"] = {"rotation": [f"8.0 + math.sin({T} * 500.0) * 2.0", 0.0, 0.0]}
    seiten(holen, {"bart1": [-20.0, "30.0", 0.0]})
    for n in flossen:
        seiten(holen, {f"flosse{n}": [0.0, "35.0", "20.0"]})
    speit = {"rumpf": {"position": [0.0, 0.0, f"-{RUCK} * 3.5"],
                       "rotation": [f"-{RUCK} * 6.0", 0.0, 0.0]}}
    for i in range(1, glieder + 1):
        speit[f"schwanz{i}"] = {"rotation": [0.0, f"math.sin({T} * 800.0 - {i * 60}) * 1.5", 0.0]}
    speit["hals1"] = {"rotation": [f"4.0 + {RUCK} * 6.0", 0.0, 0.0]}
    speit["kopf"] = {"rotation": [f"-4.0 + math.sin({T} * 900.0) * 1.5", 0.0, 0.0]}
    speit["kiefer"] = {"rotation": [f"42.0 + math.sin({T} * 700.0) * 2.0", 0.0, 0.0]}
    seiten(speit, {"bart1": [-35.0, "28.0", 0.0], "bart2": [f"math.sin({T} * 600.0) * 6.0", "10.0", 0.0],
                   "bart3": [f"math.sin({T} * 600.0 - 60.0) * 8.0", "8.0", 0.0]})
    for n in flossen:
        seiten(speit, {f"flosse{n}": [0.0, f"-40.0 + math.sin({T} * 700.0 - {n * 30}) * 4.0", 0.0]})
    zeit = f"math.mod({T}, 19.0)"
    auf = f"math.clamp(math.sin({zeit} / 2.2 * 180.0) * 2.0, 0.0, 1.0)"
    # Bruellen: Er baeumt sich hoch auf, der Kopf in den Nacken, die
    # Barthaare und Flossen stehen ab.
    bruellen = {"kopf": {"rotation": [f"-{auf} * 35.0", 0.0, 0.0]}, "kiefer": {"rotation": [f"{auf} * 40.0", 0.0, 0.0]},
                "hals1": {"rotation": [f"-{auf} * 15.0", 0.0, 0.0]}, "hals2": {"rotation": [f"-{auf} * 10.0", 0.0, 0.0]},
                "rumpf": {"rotation": [f"-{auf} * 18.0", 0.0, 0.0], "position": [0.0, f"{auf} * 2.5", 0.0]},
                "schwanz1": {"rotation": [f"{auf} * 12.0", 0.0, 0.0]}}
    seiten(bruellen, {"bart1": [f"-{auf} * 25.0", f"{auf} * 30.0", 0.0],
                      "bein_vorn": [f"-{auf} * 40.0", 0.0, 0.0], "zehen_vorn": [f"-{auf} * 40.0", 0.0, 0.0]})
    for n in flossen:
        seiten(bruellen, {f"flosse{n}": [0.0, f"{auf} * 30.0", f"{auf} * 25.0"]})
    # Platz (5.00): Er legt sich in einer lockeren S-Kurve flach hin, der
    # Vorderleib bleibt erhoben, der Kopf sieht sich um.
    ruhen = {"rumpf": {"position": [0.0, -6.0, 0.0], "rotation": [-6.0, 0.0, 0.0],
                       "scale": [1.0, f"1.0 + math.sin({T} * 40.0) * 0.015", 1.0]}}
    for i in range(1, glieder + 1):
        ruhen[f"schwanz{i}"] = {"rotation": [2.0 if i == 1 else 0.0,
                                             f"{round(math.sin(math.radians(i * 22)) * 9.0, 1)} + math.sin({T} * 20.0 - {i * 20}) * 1.0",
                                             0.0]}
    for i in range(1, hals + 1):
        ruhen[f"hals{i}"] = {"rotation": [-8.0, f"math.sin({T} * 13.0 - {i * 20}) * 8.0", 0.0]}
    ruhen["kopf"] = {"rotation": [14.0, f"math.sin({T} * 19.0) * 18.0", f"math.sin({T} * 11.0) * 6.0"]}
    for teil in ("vorn", "hinten"):
        for seite in ("links", "rechts"):
            ruhen[f"bein_{teil}_{seite}"] = {"rotation": [-60.0, 0.0, 0.0]}
            ruhen[f"unterbein_{teil}_{seite}"] = {"rotation": [90.0, 0.0, 0.0]}
    ruht = f"(1.0 - {LIEGT})"
    return {
        "flug": ({"loop": True, "bones": flug}, f"{FLIEGT} * {ruht}"),
        "stand": ({"loop": True, "bones": stand}, f"(1.0 - {FLIEGT}) * {ruht} * (1.0 - {PLATZ})"),
        "gehen": ({"loop": True, "bones": gang}, f"(1.0 - {FLIEGT}) * {LAEUFT} * {ruht} * (1.0 - {PLATZ})"),
        "platz": ({"loop": True, "bones": ruhen}, f"(1.0 - {FLIEGT}) * {ruht} * {PLATZ}"),
        "schlafen": ({"loop": True, "bones": schlaf}, SCHLAEFT),
        "niederliegen": ({"loop": True, "bones": nieder}, BESIEGT),
        "luftholen": ({"loop": True, "bones": holen}, HOLEN),
        "sturmhauch": ({"loop": True, "bones": speit}, SPEIT),
        "drachenbruellen": ({"loop": True, "bones": bruellen},
                            f"(1.0 - {FLIEGT}) * (1.0 - {LAEUFT}) * (1.0 - {FEUER}) * {ruht} * ({zeit} < 2.2)"),
        "drachenblick": ({"loop": True, "bones": blick_bewegung(hals)}, ruht),
        "drachenbiss": ({"loop": True, "bones": biss_bewegung(hals, 6, True)},
                        f"(variable.attack_time > 0.0) * {ruht}"),
    }


def mehrere_koepfe(bewegungen, koepfe):
    """Macht aus Bewegungen fuer einen Kopf solche fuer mehrere: Jeder Hals
    (hals1, hals2 ...), jeder Kopf und jeder Kiefer bekommt seine Kopie
    (hals_a1, kopf_a ...). Die Koepfe laufen zeitversetzt - so sieht jeder
    fuer sich umher, statt dass beide dasselbe tun."""
    import re
    muster = re.compile(r"^(hals)(\d+)$|^(kopf|kiefer)$")
    aus = {}
    for name, (anim, gewicht) in bewegungen.items():
        knochen = {}
        for k, werte in anim["bones"].items():
            treffer = muster.match(k)
            if not treffer:
                knochen[k] = werte
                continue
            for j, s in enumerate(koepfe):
                neu = f"hals{s}{treffer.group(2)}" if treffer.group(1) else f"{treffer.group(3)}{s}"
                text = json.dumps(werte).replace(LT, f"({LT} + {j * 1.7})").replace(T, f"({T} + {j * 1.7})")
                knochen[neu] = json.loads(text)
        aus[name] = (dict(anim, bones=knochen), gewicht)
    return aus


def nur_vorhandene(bewegungen, gestalt):
    """Wirft Knochen hinaus, die das Modell nicht hat (der Wyvern hat keine
    Vorderbeine, der Himmelsdrache kein Becken) - die gemeinsamen Bewegungen
    nennen sie alle, das Spiel schriebe sonst Warnungen ins Protokoll."""
    import drachen_gestalt as dg
    da = {k.name for k in getattr(dg, f"{gestalt}_modell")().knochen}
    aus = {}
    for name, (anim, gewicht) in bewegungen.items():
        knochen = {k: v for k, v in anim["bones"].items() if k in da}
        # Bleibt nichts uebrig (eine Mischgestalt, die nur Schwingen
        # aendert, beim Himmelsdrachen), faellt die Bewegung ganz weg.
        if not knochen and set(anim) <= {"loop", "bones"}:
            continue
        aus[name] = (dict(anim, bones=knochen), gewicht)
    return aus


def uralt_knochen(gestalt):
    """Die Knochen, die nur ein Uralter zeigt - wie das Modell sie baut."""
    import drachen_gestalt as dg
    return [k.name for k in getattr(dg, f"{gestalt}_modell")().knochen
            if k.name.startswith("uralt_") and k.name != "uralt_sattel"]


def drache(eintrag, schwinge, bewegungen=None, koepfe=("",), **bewegung):
    """Setzt zusammen, was alle Drachen gemeinsam haben. bewegungen: eigene
    (der Himmelsdrache ohne Schwingen); sonst die der Drachen mit Schwingen."""
    # Die Arten sind verschieden gross (4.95, Fynn: "Die einzelnen Drachen
    # sollen auch unterschiedlich gross sein"): Das Modell waechst im Bild
    # (groesse, im Aussehen), der Trefferkasten steht passend in kollision,
    # und der Sattel wandert mit.
    g = eintrag.get("groesse", 1.0)
    sitz = [round(v * g, 2) for v in eintrag.pop("sitz")]
    gruppen, ereignisse = drachen_zustaende(eintrag.pop("tempo_luft"), eintrag.pop("tempo_boden"),
                                            eintrag.pop("jagt_tiere"), sitz,
                                            schwimmt=eintrag.pop("schwimmt", False))
    k = drachen_grundlage()
    k.update(eintrag.pop("komponenten", {}))
    atem = eintrag.get("atemart") or (eintrag.get("atemarten") or ["feuer"])[0]
    eintrag.setdefault("atemname", ATEMARTEN.get(atem, ATEMARTEN["feuer"])[0])
    if bewegungen is None:
        bewegung.setdefault("atem", atem)
    # Uralte Drachen (4.97): selten, riesig, staerker. Das Skript wuerfelt
    # einmal je Drache (drachen.js, uraltWuerfeln) und loest fynn:uralt_werden
    # aus. Die Gruppe macht ihn groesser (auch den Trefferkasten), gibt ihm
    # mehr Leben und einen haerteren Biss; Atem, Faehigkeit und Reitflug
    # verstaerkt das Skript.
    angriff = dict(k.get("minecraft:attack", {"damage": eintrag.get("schaden", 10)}))
    angriff["damage"] = round(angriff["damage"] * 1.6)
    gruppen["fynn:uralt"] = {"minecraft:scale": {"value": URALT_GROESSE},
                             "minecraft:health": {"value": round(eintrag["leben"] * 2.5),
                                                  "max": round(eintrag["leben"] * 2.5)},
                             "minecraft:attack": angriff}
    ereignisse["fynn:uralt_werden"] = {"add": {"component_groups": ["fynn:uralt"]},
                                       "set_property": {"fynn:uralt": True}}
    jung_zustaende(gruppen, ereignisse, eintrag)
    if bewegungen is None:
        import drachen_gestalt as dg
        r = getattr(dg, f"{eintrag['gestalt']}_modell")().finde("rumpf")
        bewegung.setdefault("bauch", min(c.ursprung[1] for c in r.kaesten))
    vier = bewegung.pop("vier_fluegel", False)
    bew = bewegungen or drachen_bewegungen(schwinge, **bewegung)
    if vier:
        bew = hinterfluegel(bew)
    if len(koepfe) > 1:
        bew = mehrere_koepfe(bew, koepfe)
    # Die Uralten sehen maechtiger aus: groessere Schwingen und Hoerner.
    gross = {}
    for vor in ("", "h"):
        for seite in ("links", "rechts"):
            gross[f"{vor}fluegel_{seite}"] = {"scale": [1.3, 1.3, 1.3]}
    for s_ in koepfe:
        for seite in ("links", "rechts"):
            gross[f"horn{s_}_{seite}"] = {"scale": [1.45, 1.45, 1.45]}
            gross[f"geweih{s_}_{seite}"] = {"scale": [1.45, 1.45, 1.45]}
    bew["uralt"] = ({"loop": True, "bones": gross}, "query.property('fynn:uralt')")
    bew["jung"] = (jung_bewegung(koepfe), f"{WUCHS_EIG} < {WUCHS}")
    bew.update(zucht_bewegungen(koepfe))
    import drachen_misch as dm
    for nr, (art, _, _) in enumerate(dm.ARTEN, 1):
        if art != eintrag["id"]:
            bew[f"misch_{art}"] = ({"loop": True, "bones": MISCHGESTALT[art]}, dm.misch_bedingung(nr))
    groesse = eintrag.get("groesse", 1.0)
    eintrag.update({
        "art": "drache", "verhalten": "drache", "keine_panik": True, "baby": False,
        "komponenten": k, "gruppen": gruppen, "ereignisse": ereignisse,
        "start_gruppen": ["fynn:luft", "fynn:wildjagd"], "start_setzen": {"fynn:fliegt": True},
        "eigenschaften": eigenschaften_drache(),
        "eigene_bewegungen": nur_vorhandene(bew, eintrag["gestalt"]),
        "vorher": WUCHS_VORHER + vorher(eintrag.pop("atemfluegel", 0.0)),
        "anfang": WUCHS_ANFANG,
        # Im Bild waechst er mit (Jungdrachen, 5.2): frisch geschluepft 0,3.
        "skala": f"{groesse} * (0.3 + 0.7 * {WUCHS_VAR} / {WUCHS:.1f})",
        # Mischlinge (5.2): Koerper der einen Art in den Farben der anderen.
        "misch_haut": eintrag["gestalt"],
        # Augenlider im Schlaf und besiegt - und zum Blinzeln; jeder Kopf
        # blinzelt fuer sich. Der Sattel nur gesattelt.
        "sichtbarkeit": [{f"lider{s}": blinzeln(j * 0.9)} for j, s in enumerate(koepfe)]
        + [{"sattel": "query.is_saddled"}]
        + [{k_: "query.property('fynn:uralt')"} for k_ in uralt_knochen(eintrag["gestalt"])]
        # Unter dem Sattel keine Stacheln.
        + [{"stachel_sattel": "!query.is_saddled"},
           {"uralt_sattel": "query.property('fynn:uralt') && !query.is_saddled"}]
        # Die Erbteile der Mischlinge (5.2, drachen_misch.py).
        + __import__("drachen_misch").erbe_sichtbarkeit(eintrag["gestalt"], eintrag["id"]),
        "gruppe": "Drachen",
    })
    eintrag["steckbrief_extra"] = eintrag.get("steckbrief_extra", []) + [
        ["Besiegen", "bei einem Viertel Leben bricht er zusammen – drei Schläge: Gnadenstoß und Beute; "
                     "ein Goldapfel: er steht auf und gehört dir"],
        ["Zahm", "folgt dir und kämpft mit dir; schleichend antippen: bleib hier / komm mit"],
        ["Reiten", "mit Sattel: Sprungtaste zum Steigen, er fliegt, wohin du schaust; "
                   "schlägst du beim Reiten zu, speit er dorthin"],
        ["Schlafen", "nachts eingerollt am Boden – wer schleicht, weckt ihn nicht"],
        ["Uralt", "etwa jeder 25. ist uralt: mehr als doppelt so groß, mit Geweih, Stachelkrone, "
                  "Dornen überall und glühenden Adern, mehr als doppelt so viel Leben, stärkerer Atem – "
                  "und mit Reiter schneller"],
        # Die Zucht (5.2, scripts/drachenzucht.js und drachengaben.js).
        ["Zucht", "zwei zahme, ausgewachsene Drachen schleichend mit rohem Fleisch füttern – stehen beide "
                  "verliebt beieinander, legt einer ein Ei. Nicht jede Art mag jede"],
        ["Drachenei", "braucht Wärme (Feuer, Lagerfeuer, Lava, Magma), ein Frostei Kälte (Schnee, Eis); nach "
                      "sechs Minuten schlüpft das Junge. Antippen: aufheben und woanders absetzen"],
        ["Junges", "wächst in zehn Stufen (mit rohem Fleisch schneller) und gehört dir; erst ausgewachsen "
                   "trägt es einen Sattel"],
        ["Erbe", "sechs von zehn Jungen kommen ganz nach einem Elternteil – Art, Farbe, Fähigkeiten, alles; "
                 "vier von zehn sind Mischlinge: Körper und Farbvariante vom einen, Details, ein Kennzeichen und "
                 "ein wenig Gestalt in der Farbvariante des anderen"],
        ["Mischling", "speit beide Atemarten in einem Strahl, hat beide Fähigkeiten im Wechsel und eine Gabe – "
                      "und ist etwas stärker; jede Generation wird noch stärker"],
        ["Gabe", "aus zwei verschiedenen Atemarten entsteht eine neue Fähigkeit – Feuer und Sturm: "
                 "Feuerwirbel, Frost und Sturm: Schneesturm … Im Sattel löst die Drachenpfeife sie aus"],
        ["Neue Arten", "jeder zweite Mischling von Feuerdrache und Frostwyvern ist ein Dampfdrache, von Himmelsdrache "
                       "und Nachtschwinge ein Sternendrache, von Feuerdrache und Schlunddrache ein Lavadrache"]]
    return eintrag


# ------------------------------------------------------------ Lindwurm

def _lindwurm():
    import drachen_gestalt as dg
    return drache({
        "id": "lindwurm", "name": ("Feuerdrache", "Fire Dragon"), "gestalt": "feuerdrache",
        "varianten": [("rot", 50), ("orange", 35), ("obsidian", 15)],
        "leben": 160, "schaden": 12, "tempo": 1.4, "tempo_luft": 1.4, "tempo_boden": 0.2,
        "kollision": (4.4, 3.4), "herde": (1, 1), "groesse": 1.35, "atemfluegel": 0.45,
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
    }, dg.FEUERDRACHE_SCHWINGE, hals=5, schwanz=8, beinhoehe=22)


# ------------------------------------------------------------ Frostwyvern

def _frostwyvern():
    import drachen_gestalt as dg
    return drache({
        "id": "frostwyvern", "name": ("Frostwyvern", "Frost Wyvern"), "gestalt": "frostwyvern",
        "varianten": [("eis", 60), ("gletscher", 30), ("nacht", 10)],
        "leben": 120, "schaden": 9, "tempo": 1.5, "tempo_luft": 1.55, "tempo_boden": 0.22,
        "kollision": (2.2, 1.7), "herde": (1, 1), "groesse": 0.85, "atemfluegel": 1.0,
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
    }, dg.FROSTWYVERN_SCHWINGE, hals=5, schwanz=8, beinhoehe=18, stuetzt=True)


# ------------------------------------------------------------ Himmelsdrache

def _himmelsdrache():
    import drachen_gestalt as dg
    return drache({
        "id": "himmelsdrache", "name": ("Himmelsdrache", "Sky Serpent"), "gestalt": "himmelsdrache",
        "varianten": [("jade", 50), ("perle", 35), ("gold", 15)],
        "leben": 130, "schaden": 8, "tempo": 1.3, "tempo_luft": 1.3, "tempo_boden": 0.2,
        "kollision": (2.3, 1.8), "herde": (1, 1), "groesse": 1.15,
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
    }, None, bewegungen=schlangen_bewegungen(dg.HIMMELSDRACHE_GLIEDER, 2, dg.HIMMELSDRACHE_FLOSSEN,
                                                     dg.HIMMELSDRACHE_BEINGLIED))


# ------------------------------------------------------------ Giftdrache

def _giftdrache():
    import drachen_gestalt as dg
    t = drache({
        "id": "giftdrache", "name": ("Giftdrache", "Twin-Headed Venom Dragon"), "gestalt": "giftdrache",
        "varianten": [("sumpf", 55), ("moor", 30), ("gift", 15)],
        "leben": 140, "schaden": 10, "tempo": 1.35, "tempo_luft": 1.35, "tempo_boden": 0.2,
        "kollision": (3.1, 2.4), "herde": (1, 1), "groesse": 1.1, "atemfluegel": 0.3,
        "jagt_tiere": ["pig", "frog", "cow", "krokodil"],
        "sitz": [0.0, 1.65, -0.2], "schwimmt": True,
        "biome": [["swamp"], ["mangrove_swamp"]], "gewicht": 2,
        "spawn_bedingungen": [{"minecraft:spawns_on_surface": {}, "minecraft:weight": {"default": 2},
                               "minecraft:herd": {"min_size": 1, "max_size": 1},
                               "minecraft:density_limit": {"surface": 1},
                               "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==",
                                                           "value": tag}]}
                              for tag in ("swamp", "mangrove_swamp")],
        "population": "monster",
        "material": "entity_emissive_alpha",
        "beute": [("fynn:drachenschuppe", 3, 5, 1.0, False), ("minecraft:slime_ball", 2, 5, 1.0, False),
                  ("minecraft:spider_eye", 1, 3, 1.0, False)],
        "laute": {"ambient": "mob.enderdragon.growl", "hurt": "mob.enderdragon.hit", "death": "mob.ravager.death",
                  "pitch": [1.1, 1.3]},
        "ei": ("#5a8a3a", "#6a3a78"),
        "komponenten": {"minecraft:attack": {"damage": 10, "effect_name": "poison", "effect_duration": 6}},
        "atemarten": ["gift", "funken"], "atemname": "Giftodem und Funkenregen",
        "steckbrief_extra": [
            ["Lebt", "in Sümpfen und Mangrovensümpfen – zwei Köpfe, zwei Aufgaben"],
            ["Linker Kopf", "bläst eine Giftwolke, die eine Weile liegen bleibt – wer hineingerät, wird vergiftet"],
            ["Rechter Kopf", "spuckt Funken: Trifft er die Wolke, explodiert sie"],
            ["Biss", "vergiftet"]],
    }, dg.GIFTDRACHE_SCHWINGE, koepfe=("_a", "_b"), hals=5, schwanz=7, beinhoehe=18)
    b = t["eigene_bewegungen"]
    # Der rechte Kopf (b) spuckt Funken: kurze Stoesse, das Maul schnappt
    # dabei auf und zu - der linke zieht die Giftwolke in langen Boegen.
    spuck = f"math.pow(math.max(0.0, math.sin({T} * 520.0)), 3.0)"
    b["giftodem"][0]["bones"]["kopf_b"] = {"rotation": [f"-4.0 + {spuck} * 16.0", f"math.sin({T} * 40.0) * 5.0", 0.0]}
    b["giftodem"][0]["bones"]["kiefer_b"] = {"rotation": [f"24.0 + {spuck} * 22.0", 0.0, 0.0]}
    # Der Kragen: beim Luftholen klappt er zitternd auf, beim Speien und
    # Bruellen steht er offen; im Flug halb, wie ein Segel.
    for name, weit in (("luftholen", f"60.0 + math.sin({T} * 900.0) * 6.0"), ("giftodem", "70.0"),
                       ("drachenbruellen", "70.0"), ("flug", f"25.0 + math.sin({T} * 200.0) * 5.0")):
        for s_ in ("_a", "_b"):
            b[name][0]["bones"][f"kragen{s_}_links"] = {"rotation": [0.0, weit, 0.0]}
            b[name][0]["bones"][f"kragen{s_}_rechts"] = {"rotation": [0.0, f"-({weit})", 0.0]}
    return t


# ------------------------------------------------------------ Nachtschwinge

def _nachtschwinge():
    import drachen_gestalt as dg
    return drache({
        "id": "nachtschwinge", "name": ("Nachtschwinge", "Night Fury Dragon"), "gestalt": "nachtschwinge",
        "varianten": [("nacht", 60), ("sturm", 30), ("blut", 10)],
        "leben": 110, "schaden": 11, "tempo": 1.8, "tempo_luft": 1.8, "tempo_boden": 0.26,
        "kollision": (2.4, 1.8), "herde": (1, 1), "groesse": 1.0, "atemfluegel": 0.6,
        "jagt_tiere": ["sheep", "pig", "fox", "wolf", "rabbit"],
        "sitz": [0.0, 1.75, -0.2],
        "biome": [["roofed"], ["mega"]], "gewicht": 1,
        # Sehr selten, und nur im Dunkeln - nachts oder unter dichtem Laub.
        "spawn_bedingungen": [{"minecraft:spawns_on_surface": {}, "minecraft:weight": {"default": 1},
                               "minecraft:herd": {"min_size": 1, "max_size": 1},
                               "minecraft:density_limit": {"surface": 1},
                               "minecraft:brightness_filter": {"min": 0, "max": 6, "adjust_for_weather": True},
                               "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==",
                                                           "value": tag}]}
                              for tag in ("roofed", "mega", "jagged_peaks")],
        "population": "monster",
        "material": "entity_emissive_alpha",
        "beute": [("fynn:drachenschuppe", 3, 5, 1.0, False), ("minecraft:phantom_membrane", 2, 4, 1.0, False),
                  ("minecraft:ender_pearl", 1, 2, 0.6, False)],
        "laute": {"ambient": "mob.phantom.idle", "hurt": "mob.phantom.hurt", "death": "mob.phantom.death",
                  "pitch": [0.5, 0.7]},
        "ei": ("#1a1a22", "#8a4aff"),
        "komponenten": {"minecraft:attack": {"damage": 11}},
        "atemart": "schatten",
        "steckbrief_extra": [
            ["Lebt", "extrem selten, nur im Dunkeln: im dunklen Wald, in alten Taigas und auf zackigen Gipfeln"],
            ["Gestalt", "vier Flügel aus Sicheln statt Flughaut – der schnellste aller Drachen"],
            ["Schattenatem", "macht blind und laesst verdorren"],
            ["Plasmaschuss", "auf weite Entfernung: eine violette Kugel, die beim Aufprall explodiert"]],
    }, dg.NACHTSCHWINGE_SCHWINGE, hals=5, schwanz=8, beinhoehe=19, tempo=260.0, vier_fluegel=True)


# ------------------------------------------------------------ Schlunddrache

def _schlunddrache():
    import drachen_gestalt as dg
    return drache({
        "id": "schlunddrache", "name": ("Schlunddrache", "Maw Dragon"), "gestalt": "schlunddrache",
        "varianten": [("moos", 55), ("knochen", 30), ("tiefsee", 15)],
        "leben": 150, "schaden": 14, "tempo": 1.3, "tempo_luft": 1.3, "tempo_boden": 0.22,
        "kollision": (2.8, 2.4), "herde": (1, 1), "groesse": 1.2, "atemfluegel": 0.5,
        "jagt_tiere": ["cow", "pig", "sheep", "panda", "ocelot", "parrot"],
        "sitz": [0.0, 1.8, -0.1],
        "biome": [["jungle"]], "gewicht": 1,
        "spawn_bedingungen": [{"minecraft:spawns_on_surface": {}, "minecraft:weight": {"default": 1},
                               "minecraft:herd": {"min_size": 1, "max_size": 1},
                               "minecraft:density_limit": {"surface": 1},
                               "minecraft:biome_filter": [{"test": "has_biome_tag", "operator": "==",
                                                           "value": tag}]}
                              for tag in ("jungle", "bamboo")],
        "population": "monster",
        "material": "entity_emissive_alpha",
        "beute": [("fynn:drachenschuppe", 3, 6, 1.0, False), ("minecraft:bone", 3, 6, 1.0, False),
                  ("minecraft:echo_shard", 1, 1, 0.3, False)],
        "laute": {"ambient": "mob.warden.ambient", "hurt": "mob.enderdragon.hit", "death": "mob.ravager.death",
                  "pitch": [0.7, 0.9]},
        "ei": ("#6a9a82", "#e8e4d0"),
        "komponenten": {"minecraft:attack": {"damage": 14}},
        "atemart": "schall",
        "steckbrief_extra": [
            ["Lebt", "selten, in Dschungeln und Bambuswäldern"],
            ["Gestalt", "ein riesiger Kopf, dessen Schlund immer offen steht, ringsum lange Fangzähne, vier Augen"],
            ["Schallbrüllen", "Schallringe, die nach vorn laufen, alles wegschleudern und benommen machen"],
            ["Schnappbiss", "auf mittlere Entfernung schnellt er vor und beißt zu – kleine Tiere verschlingt er ganz"]],
    }, dg.SCHLUNDDRACHE_SCHWINGE, hals=3, schwanz=9, beinhoehe=20)


# ------------------------------------------------------------ Nur aus der Zucht (5.2)
#
# Fynn: "Bei manchen entsteht auch eine andere Art, eine neue Art von
# Drache." Diese drei erscheinen nie wild - sie schluepfen nur aus den Eiern
# bestimmter Paare (scripts/drachenzucht.js, NEUE_ARTEN). Modelle und Haeute:
# drachen_neu.py.

def nur_zucht(eintrag):
    eintrag.update({"biome": [], "gewicht": 0, "nur_zucht": True, "population": "creature"})
    eintrag["steckbrief_extra"] = [["Herkunft", eintrag.pop("herkunft")]] + eintrag.get("steckbrief_extra", [])
    return eintrag


def _lavadrache():
    import drachen_gestalt as dg
    return drache(nur_zucht({
        "id": "lavadrache", "name": ("Lavadrache", "Lava Dragon"), "gestalt": "lavadrache",
        "herkunft": "schlüpft manchmal aus dem Ei von Feuerdrache und Schlunddrache – nie wild",
        "varianten": [("basalt", 60), ("magma", 30), ("seele", 10)],
        "leben": 190, "schaden": 15, "tempo": 1.2, "tempo_luft": 1.2, "tempo_boden": 0.19,
        "kollision": (3.0, 2.6), "herde": (1, 1), "groesse": 1.3, "atemfluegel": 0.35,
        "jagt_tiere": ["cow", "pig", "sheep", "hoglin"],
        "sitz": [0.0, 2.0, -0.2],
        "material": "entity_emissive_alpha",
        "beute": [("fynn:drachenschuppe", 5, 8, 1.0, False), ("minecraft:magma_cream", 2, 5, 1.0, False),
                  ("minecraft:obsidian", 1, 3, 1.0, False)],
        "laute": {"ambient": "mob.enderdragon.growl", "hurt": "mob.enderdragon.hit", "death": "mob.ravager.death",
                  "pitch": [0.6, 0.8]},
        "ei": ("#3a3230", "#ff7a1a"),
        "komponenten": {"minecraft:fire_immune": {}, "minecraft:attack": {"damage": 15}},
        "atemart": "lava",
        "steckbrief_extra": [
            ["Gestalt", "schwer und breit, Basaltplatten auf dem Rücken, ein glühender Bauch, eine Keule am Schwanz"],
            ["Lavaatem", "zähe Lava im Bogen: brennt lange und setzt alles in Brand"],
            ["Lavabomben", "wirft drei glühende Brocken im Fächer, die beim Aufprall zerplatzen"]],
    }), dg.LAVADRACHE_SCHWINGE, hals=3, schwanz=7, beinhoehe=21)


def _dampfdrache():
    import drachen_gestalt as dg
    return drache(nur_zucht({
        "id": "dampfdrache", "name": ("Dampfdrache", "Steam Dragon"), "gestalt": "dampfdrache",
        "herkunft": "schlüpft manchmal aus dem Ei von Feuerdrache und Frostwyvern – nie wild",
        "varianten": [("kupfer", 60), ("rost", 30), ("silber", 10)],
        "leben": 140, "schaden": 11, "tempo": 1.5, "tempo_luft": 1.5, "tempo_boden": 0.24,
        "kollision": (2.6, 2.2), "herde": (1, 1), "groesse": 1.1, "atemfluegel": 0.55,
        "jagt_tiere": ["sheep", "goat", "rabbit", "fox"],
        "sitz": [0.0, 1.75, -0.2],
        "material": "entity_emissive_alpha",
        "beute": [("fynn:drachenschuppe", 3, 6, 1.0, False), ("minecraft:copper_ingot", 3, 7, 1.0, False),
                  ("minecraft:blaze_powder", 1, 3, 0.6, False)],
        "laute": {"ambient": "mob.enderdragon.growl", "hurt": "mob.enderdragon.hit", "death": "mob.ravager.death",
                  "pitch": [1.1, 1.3]},
        "ei": ("#d8d4cc", "#c87a3a"),
        "komponenten": {"minecraft:fire_immune": {}, "minecraft:freezing_immune": {},
                        "minecraft:attack": {"damage": 11}},
        "atemart": "dampf",
        "steckbrief_extra": [
            ["Gestalt", "schlank und hell, Kupferplatten, zwei Paar Dampfschlote hinter den Schultern"],
            ["Dampfatem", "brühend heißer Dampf in einer breiten Wolke: verbrüht, blendet, löscht Feuer, "
                          "taut Schnee und Eis"],
            ["Geysir", "unter dem Ziel schießt eine Dampfsäule aus dem Boden und schleudert es hoch"]],
    }), dg.DAMPFDRACHE_SCHWINGE, hals=5, schwanz=8, beinhoehe=22)


def _sternendrache():
    import drachen_gestalt as dg
    return drache(nur_zucht({
        "id": "sternendrache", "name": ("Sternendrache", "Star Dragon"), "gestalt": "sternendrache",
        "herkunft": "schlüpft manchmal aus dem Ei von Himmelsdrache und Nachtschwinge – nie wild",
        "varianten": [("nacht", 60), ("morgen", 30), ("polar", 10)],
        "leben": 150, "schaden": 12, "tempo": 1.9, "tempo_luft": 1.9, "tempo_boden": 0.26,
        "kollision": (2.4, 1.8), "herde": (1, 1), "groesse": 1.05, "atemfluegel": 0.6,
        "jagt_tiere": ["sheep", "rabbit", "fox", "phantom"],
        "sitz": [0.0, 1.75, -0.2],
        "material": "entity_emissive_alpha",
        "beute": [("fynn:drachenschuppe", 4, 7, 1.0, False), ("minecraft:amethyst_shard", 3, 6, 1.0, False),
                  ("minecraft:nether_star", 1, 1, 0.05, False)],
        "laute": {"ambient": "mob.phantom.idle", "hurt": "mob.phantom.hurt", "death": "mob.phantom.death",
                  "pitch": [0.8, 1.0]},
        "ei": ("#2a2a5a", "#c8b0ff"),
        "komponenten": {"minecraft:attack": {"damage": 12}},
        "atemart": "sterne",
        "steckbrief_extra": [
            ["Gestalt", "vier Sichelschwingen mit leuchtendem Rand, ein langer Schwanz, Mähne, "
                        "leuchtende Kristalle und ein Stern auf der Stirn"],
            ["Sternenstrahl", "ein gerader, glitzernder Strahl: trifft hart und lässt schweben"],
            ["Meteor", "ein Meteor stürzt vom Himmel auf das Ziel"]],
    }), dg.STERNENDRACHE_SCHWINGE, hals=6, schwanz=12, beinhoehe=19, tempo=260.0, vier_fluegel=True)


DRACHEN = [_lindwurm(), _frostwyvern(), _himmelsdrache(), _giftdrache(), _nachtschwinge(), _schlunddrache(),
           _dampfdrache(), _sternendrache(), _lavadrache()]
