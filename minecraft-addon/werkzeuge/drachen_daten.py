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
RUHIG = (f"(1.0 - {LAEUFT}) * (1.0 - {FEUER}) * (1.0 - {FLIEGT}) * (1.0 - {LIEGT})")


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
    f"{OFFEN['links']} = math.max({BRUELL}, {strecken(0.0)});",
    f"{OFFEN['rechts']} = math.max({BRUELL}, {strecken(3.8)});",
]


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


def drachen_bewegungen(schwinge, hals=4, schwanz=6, tempo=220.0, beinhoehe=20, finger=None, stuetzt=False):
    """schwinge: die Schwinge der Art (fuer die ausgerechnete Faltung);
    beinhoehe: wie tief der Leib beim Liegen sinkt; stuetzt: ein Wyvern,
    der am Boden auf den Handgelenken der Schwingen geht."""
    import drachen_gestalt as dg
    falt = dg.faltung(schwinge, stuetzt)
    finger = schwinge.anzahl
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
        "fluegel": [0.0, f"-math.max(0.0, math.cos({phi})) * 10.0 * {schlagen}",
                    f"-6.0 - math.sin({phi}) * 42.0 * {schlagen}"],
        "unterarm": [0.0, f"math.max(0.0, math.cos({phi})) * 18.0 * {schlagen}",
                     f"-math.sin({phi} - 50.0) * 22.0 * {schlagen}"],
        "hand": [0.0, f"-math.max(0.0, math.cos({phi} - 40.0)) * 10.0 * {schlagen}",
                 f"-math.sin({phi} - 90.0) * 14.0 * {schlagen}"],
        # Beim Heben legen sich die hinteren Finger an, beim Schlag nach unten
        # spreizen sie sich - der Faecher atmet mit jedem Schlag.
        **{f"finger{i}": [0.0, f"-math.max(0.0, -math.sin({phi})) * {4.5 * i:.1f}"
                               f" + math.max(0.0, math.sin({phi})) * {1.5 * i:.1f}",
                          f"-math.sin({phi} - {60 + 12 * i}) * {2.0 + i} * {schlagen}"]
           for i in range(1, finger + 1)},
        # Im Flug: Hinterbeine nach hinten gestreckt, Vorderbeine angezogen;
        # sie pendeln mit jedem Schlag ein wenig nach.
        "bein_hinten": [f"55.0 + math.sin({phi} - 120.0) * 5.0 * {schlagen}", 0.0, 0.0],
        "unterbein_hinten": [f"25.0 + math.sin({phi} - 160.0) * 6.0 * {schlagen}", 0.0, 0.0],
        "fuss_hinten": [45.0, 0.0, 0.0], "zehen_hinten": [35.0, 0.0, 0.0],
        "bein_vorn": [40.0, 0.0, 0.0], "unterbein_vorn": [-70.0, 0.0, 0.0], "fuss_vorn": [40.0, 0.0, 0.0],
        "zehen_vorn": [30.0, 0.0, 0.0],
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

    # Feueratem: Hals gestreckt, Kopf nach vorn geneigt, das Maul weit auf.
    # Ein Zittern geht durch den Kopf, der Hals fuehrt den Strahl in einer
    # kleinen Welle hin und her.
    # Am Boden steht der Hals aufgerichtet; zum Feuern senkt er ihn, damit
    # der Strahl nach vorn geht und nicht in den Himmel - und stemmt sich
    # dabei mit den Vorderbeinen in den Boden, den Schwanz angehoben.
    boden = f"(1.0 - {FLIEGT})"
    senken = (18.0, 10.0, -2.0, -6.0)
    feuer = {"hals" + str(i): {"rotation": [f"-3.0 + {boden} * {senken[min(i - 1, 3)]}",
                                            f"math.sin({T} * 160.0 - {i * 45}) * 2.5", 0.0]}
             for i in range(1, hals + 1)}
    feuer["kopf"] = {"rotation": [f"8.0 - {boden} * 30.0 + math.sin({T} * 900.0) * 1.5",
                                  f"-math.sin({T} * 160.0 - {hals * 45 + 45}) * 3.0", 0.0]}
    feuer["kiefer"] = {"rotation": [f"38.0 + math.sin({T} * 700.0) * 2.0", 0.0, 0.0]}
    feuer["rumpf"] = {"rotation": [f"{boden} * 5.0", 0.0, 0.0],
                      "position": [0.0, 0.0, f"{boden} * (1.0 + math.sin({T} * 600.0) * 0.2)"]}
    beidseitig(feuer, {"bein_vorn": [f"-{boden} * 12.0", 0.0, 0.0], "zehen_vorn": [f"-{boden} * 20.0", 0.0, 0.0]})
    feuer["schwanz1"] = {"rotation": [f"-{boden} * 10.0", 0.0, 0.0]}

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
    beidseitig(stoss, {"fluegel": [0.0, -30.0, -12.0], "unterarm": [0.0, 45.0, 0.0], "hand": [0.0, -40.0, 0.0],
                       "bein_vorn": [-60.0, 0.0, 0.0], "unterbein_vorn": [20.0, 0.0, 0.0],
                       "zehen_vorn": [-65.0, 0.0, 0.0],
                       "bein_hinten": [-30.0, 0.0, 0.0], "zehen_hinten": [-70.0, 0.0, 0.0]})
    stoss["kiefer"] = {"rotation": [22.0, 0.0, 0.0]}
    for i in range(1, schwanz + 1):
        stoss[f"schwanz{i}"] = {"rotation": [-2.0, f"-math.sin({T} * 55.0 - {i * 40}) * {3 + i * 1.5}", 0.0]}

    # Liegen - im Schlaf und besiegt. Wie auf Fynns Vorbild: flach auf dem
    # Bauch, die Vorderbeine nach vorn, die Hinterbeine untergeschlagen, der
    # Hals zur Seite gelegt, der Kopf am Boden, der Schwanz um den Leib
    # gerollt, die Schwingen gefaltet. Nur der Atem hebt die Flanken - und
    # im Traum zuckt manchmal die Schwanzspitze.
    liegen = {}
    beidseitig(liegen, dict(falt))
    zusammen(liegen, finger)
    beidseitig(liegen, {"bein_vorn": [-75.0, 0.0, 0.0], "unterbein_vorn": [55.0, 0.0, 0.0],
                        "fuss_vorn": [20.0, 0.0, 0.0], "zehen_vorn": [15.0, 0.0, 0.0],
                        "bein_hinten": [-60.0, 0.0, 0.0], "unterbein_hinten": [120.0, 0.0, 0.0],
                        "fuss_hinten": [-55.0, 0.0, 0.0], "zehen_hinten": [20.0, 0.0, 0.0]})
    liegen["rumpf"] = {"position": [0.0, -(beinhoehe - 7.0), 0.0],
                       "scale": [f"1.0 + math.sin({T} * 40.0) * 0.02", f"1.0 + math.sin({T} * 40.0) * 0.03", 1.0]}
    # Das Becken dreht sich schon in die Rolle hinein.
    liegen["becken"] = {"rotation": [0.0, -12.0, 0.0]}
    for i in range(1, hals + 1):
        liegen[f"hals{i}"] = {"rotation": [14.0 if i == 1 else 6.0, 24.0, 0.0]}
    liegen["kopf"] = {"rotation": [-8.0, 20.0, 8.0]}
    for i in range(1, schwanz + 1):
        traum = f"{zucken(9.0, 30.0)} * math.sin({T} * 500.0) * 12.0" if i == schwanz else 0.0
        liegen[f"schwanz{i}"] = {"rotation": [-4.0 if i == 1 else 0.0, -24.0, traum]}
    # Besiegt: ab und zu ein schwaches Zucken, das Maul einen Spalt offen.
    benommen = {"kopf": {"rotation": [f"math.max(0.0, math.sin({T} * 50.0)) * 6.0", 0.0, 0.0]},
                "kiefer": {"rotation": [10.0, 0.0, 0.0]},
                f"schwanz{schwanz}": {"rotation": [0.0, f"math.sin({T} * 80.0) * 10.0", 0.0]}}

    ruht = f"(1.0 - {LIEGT})"
    return {
        "flug": ({"loop": True, "bones": flug}, f"{FLIEGT} * {ruht}"),
        "schweben": ({"loop": True, "bones": schweben}, f"{FLIEGT} * {FEUER} * {ruht}"),
        "stand": ({"loop": True, "bones": stand}, f"(1.0 - {FLIEGT}) * {ruht}"),
        "gehen": ({"loop": True, "bones": gang}, f"(1.0 - {FLIEGT}) * {LAEUFT} * {ruht}"),
        "liegen": ({"loop": True, "bones": liegen}, LIEGT),
        "benommen": ({"loop": True, "bones": benommen}, "query.property('fynn:besiegt')"),
        "feueratem": ({"loop": True, "bones": feuer}, FEUER),
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
        "fynn:bleiben": {"remove": {"component_groups": ["fynn:folgt"]}, "add": {"component_groups": ["fynn:bleibt"]}},
        "fynn:folgen": {"remove": {"component_groups": ["fynn:bleibt"]}, "add": {"component_groups": ["fynn:folgt"]}},
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
    for n in ("fynn:feuer", "fynn:fliegt", "fynn:schlaeft", "fynn:besiegt"):
        e.update(eigenschaft(n))
    return e


def schlangen_bewegungen(glieder=14, hals=2):
    """Der Himmelsdrache (4.92) hat keine Schwingen: Er schwimmt durch die
    Luft. Zwei Wellen laufen gleichzeitig von vorn nach hinten durch den
    Leib - eine seitliche (das Schlaengeln) und eine flachere auf und ab.
    Jedes Glied kommt einen Takt spaeter, und nach hinten schwingt es weiter
    aus. Die Beine paddeln, die Barthaare wehen.

    Seit 4.94 dreht er sich jede Weile einmal um sich selbst, eine
    Fassrolle, wie ein Otter im Wasser; der Leib rollt dabei in der Welle
    mit. Am Boden richtet er den Vorderleib auf wie eine Kobra und wiegt
    sich."""
    def seiten(knochen, werte):
        for seite, z in (("links", 1), ("rechts", -1)):
            for name, (x, y, zz) in werte.items():
                knochen[f"{name}_{seite}"] = {"rotation": [x, y if isinstance(y, (int, float)) else f"{z} * ({y})",
                                                           zz if isinstance(zz, (int, float)) else f"{z} * ({zz})"]}

    # Die Fassrolle: alle 23 Sekunden, 2,6 Sekunden lang, weich an- und
    # auslaufend - nicht mit Reiter, dem wuerde sonst schwindlig.
    rz = f"math.mod({T} + 9.0, 23.0)"
    rolle = f"(({rz} < 2.6 && !query.has_rider) ? math.pow(math.sin({rz} / 2.6 * 90.0), 2.0) * 360.0 : 0.0)"
    flug = {}
    flug["rumpf"] = {"rotation": ["-query.target_x_rotation * 0.3", f"math.sin({T} * 120.0 + 35.0) * 6.0",
                                  f"variable.fynn_dreh * 2.0 + math.sin({T} * 120.0 + 80.0) * 5.0 + {rolle}"],
                     "position": [0.0, f"math.sin({T} * 95.0) * 1.2", 0.0]}
    for i in range(1, glieder + 1):
        # Jedes Glied rollt ein wenig mit der Welle - so windet sich der Leib
        # wirklich, statt flach wie ein Band zu wedeln.
        flug[f"schwanz{i}"] = {"rotation": [f"math.sin({T} * 95.0 - {i * 28}) * 3.5",
                                            f"math.sin({T} * 120.0 - {i * 35}) * {7 + i * 0.45:.2f}"
                                            f" - variable.fynn_dreh * 0.8",
                                            f"math.sin({T} * 120.0 - {i * 35 + 60}) * 2.5"]}
    for i in range(1, hals + 1):
        flug[f"hals{i}"] = {"rotation": [f"math.sin({T} * 95.0 + {40 + i * 20}) * 3.0",
                                         f"-math.sin({T} * 120.0 + {35 + i * 30}) * 5.0", 0.0]}
    flug["kopf"] = {"rotation": [f"math.sin({T} * 95.0 + 120.0) * 3.0", f"-math.sin({T} * 120.0 + 120.0) * 6.0", 0.0]}
    flug["kiefer"] = {"rotation": [f"{zucken(15.0, 10.0)} * 20.0", 0.0, 0.0]}
    seiten(flug, {"bart": [f"math.sin({T} * 160.0) * 12.0 + math.sin({T} * 310.0) * 4.0",
                           f"math.sin({T} * 130.0) * 14.0", 0.0]})
    for teil, versatz in (("vorn", 0.0), ("hinten", 90.0)):
        for seite, ph in (("links", 0.0), ("rechts", 180.0)):
            p_ = f"{T} * 120.0 + {versatz + ph}"
            flug[f"bein_{teil}_{seite}"] = {"rotation": [f"45.0 + math.sin({p_}) * 25.0", 0.0, 0.0]}
            flug[f"unterbein_{teil}_{seite}"] = {"rotation": [f"-30.0 + math.cos({p_}) * 20.0", 0.0, 0.0]}
            flug[f"fuss_{teil}_{seite}"] = {"rotation": [40.0, 0.0, 0.0]}
            # Die Krallen greifen beim Paddeln in die Luft.
            flug[f"zehen_{teil}_{seite}"] = {"rotation": [f"20.0 + math.cos({p_}) * 25.0", 0.0, 0.0]}

    # Am Boden: Er kriecht in Wellen, im Tempo seines Weges.
    w = "query.modified_distance_moved * 22.0"
    gang = {"rumpf": {"rotation": [0.0, f"math.sin({w}) * 5.0", f"math.sin({w} + 60.0) * 3.0"]}}
    for i in range(1, glieder + 1):
        gang[f"schwanz{i}"] = {"rotation": [0.0, f"math.sin({w} - {i * 35}) * {5 + i * 0.4:.2f}", 0.0]}
    for teil, versatz in (("vorn", 0.0), ("hinten", 180.0)):
        for seite, ph in (("links", 0.0), ("rechts", 180.0)):
            p_ = f"{w} + {versatz + ph}"
            gang[f"bein_{teil}_{seite}"] = {"rotation": [f"math.sin({p_}) * 30.0", 0.0, 0.0]}
            gang[f"zehen_{teil}_{seite}"] = {"rotation": [f"math.max(0.0, -math.cos({p_})) * 35.0", 0.0, 0.0]}
    # Wie eine Kobra: der Vorderleib aufgerichtet, der Kopf pendelt langsam
    # hin und her, und ab und zu schnellt er ein Stueck vor.
    stand = {"rumpf": {"rotation": [f"-10.0 + math.sin({T} * 35.0) * 2.0", 0.0, f"math.sin({T} * 26.0) * 4.0"],
                       "scale": [1.0, f"1.0 + math.sin({T} * 50.0) * 0.015", 1.0]}}
    for i in range(1, glieder + 1):
        stand[f"schwanz{i}"] = {"rotation": [3.0 if i == 1 else 0.0,
                                             f"math.sin({T} * 30.0 - {i * 30}) * {3.0 + i * 0.2:.1f}", 0.0]}
    for i in range(1, hals + 1):
        stand[f"hals{i}"] = {"rotation": [f"-6.0 + math.sin({T} * 35.0 - {i * 30}) * 2.0",
                                          f"math.sin({T} * 26.0 - {i * 25}) * 8.0", 0.0]}
    stand["kopf"] = {"rotation": [f"16.0 + math.sin({T} * 40.0) * 3.0 + {zucken(11.0, 30.0)} * 10.0",
                                  f"math.sin({T} * 21.0) * 14.0", f"math.sin({T} * 13.0) * 8.0"]}
    stand["kiefer"] = {"rotation": [f"{zucken(23.0, 24.0)} * 16.0", 0.0, 0.0]}
    seiten(stand, {"bart": [f"math.sin({T} * 60.0) * 6.0", f"math.sin({T} * 45.0) * 6.0", 0.0]})
    stand["zehen_vorn_links"] = {"rotation": [f"-{zucken(7.0, 6.0)} * math.max(0.0, math.sin({T} * 900.0)) * 18.0",
                                              0.0, 0.0]}

    # Liegen (Schlaf, besiegt): zusammengerollt wie eine Schlange, der Kopf
    # obenauf.
    liegen = {"rumpf": {"position": [0.0, -8.0, 0.0],
                        "scale": [f"1.0 + math.sin({T} * 40.0) * 0.02", f"1.0 + math.sin({T} * 40.0) * 0.03", 1.0]}}
    # Eine Spirale: nach hinten immer enger, so liegt der Schwanz innen.
    for i in range(1, glieder + 1):
        liegen[f"schwanz{i}"] = {"rotation": [0.0, 18.0 + i * 2.5, 0.0]}
    liegen[f"schwanz{glieder}"]["rotation"][2] = f"{zucken(9.0, 30.0)} * math.sin({T} * 500.0) * 14.0"
    for i in range(1, hals + 1):
        liegen[f"hals{i}"] = {"rotation": [8.0, -30.0, 0.0]}
    liegen["kopf"] = {"rotation": [-5.0, -30.0, 0.0]}
    for teil in ("vorn", "hinten"):
        for seite in ("links", "rechts"):
            liegen[f"bein_{teil}_{seite}"] = {"rotation": [-70.0, 0.0, 0.0]}
            liegen[f"unterbein_{teil}_{seite}"] = {"rotation": [100.0, 0.0, 0.0]}
            liegen[f"zehen_{teil}_{seite}"] = {"rotation": [30.0, 0.0, 0.0]}
    benommen = {"kopf": {"rotation": [f"math.max(0.0, math.sin({T} * 50.0)) * 6.0", 0.0, 0.0]},
                "kiefer": {"rotation": [10.0, 0.0, 0.0]}}
    # Der Sturmhauch: Hals gerade, das Maul weit auf, die Maehne gestraeubt,
    # der Leib spannt sich wie eine Feder und zittert.
    feuer = {f"hals{i}": {"rotation": [-2.0, f"math.sin({T} * 160.0 - {i * 45}) * 3.0", 0.0]} for i in range(1, hals + 1)}
    feuer["kopf"] = {"rotation": [f"6.0 + math.sin({T} * 900.0) * 1.5", 0.0, 0.0]}
    feuer["kiefer"] = {"rotation": [f"40.0 + math.sin({T} * 700.0) * 2.0", 0.0, 0.0]}
    for i in range(1, 5):
        feuer[f"schwanz{i}"] = {"rotation": [0.0, f"math.sin({T} * 800.0 - {i * 60}) * 1.5", 0.0]}
    seiten(feuer, {"bart": [-30.0, "25.0", 0.0]})
    zeit = f"math.mod({T}, 19.0)"
    auf = f"math.clamp(math.sin({zeit} / 2.2 * 180.0) * 2.0, 0.0, 1.0)"
    # Bruellen: Er baeumt sich hoch auf, der Kopf in den Nacken, die
    # Barthaare stehen ab.
    bruellen = {"kopf": {"rotation": [f"-{auf} * 35.0", 0.0, 0.0]}, "kiefer": {"rotation": [f"{auf} * 40.0", 0.0, 0.0]},
                "hals1": {"rotation": [f"-{auf} * 15.0", 0.0, 0.0]}, "hals2": {"rotation": [f"-{auf} * 10.0", 0.0, 0.0]},
                "rumpf": {"rotation": [f"-{auf} * 18.0", 0.0, 0.0], "position": [0.0, f"{auf} * 2.5", 0.0]},
                "schwanz1": {"rotation": [f"{auf} * 12.0", 0.0, 0.0]}}
    seiten(bruellen, {"bart": [f"-{auf} * 25.0", f"{auf} * 30.0", 0.0],
                      "bein_vorn": [f"-{auf} * 40.0", 0.0, 0.0], "zehen_vorn": [f"-{auf} * 40.0", 0.0, 0.0]})
    ruht = f"(1.0 - {LIEGT})"
    return {
        "flug": ({"loop": True, "bones": flug}, f"{FLIEGT} * {ruht}"),
        "stand": ({"loop": True, "bones": stand}, f"(1.0 - {FLIEGT}) * {ruht}"),
        "gehen": ({"loop": True, "bones": gang}, f"(1.0 - {FLIEGT}) * {LAEUFT} * {ruht}"),
        "liegen": ({"loop": True, "bones": liegen}, LIEGT),
        "benommen": ({"loop": True, "bones": benommen}, "query.property('fynn:besiegt')"),
        "feueratem": ({"loop": True, "bones": feuer}, FEUER),
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
        aus[name] = (dict(anim, bones={k: v for k, v in anim["bones"].items() if k in da}), gewicht)
    return aus


def drache(eintrag, schwinge, bewegungen=None, koepfe=("",), **bewegung):
    """Setzt zusammen, was alle Drachen gemeinsam haben. bewegungen: eigene
    (der Himmelsdrache ohne Schwingen); sonst die der Drachen mit Schwingen."""
    gruppen, ereignisse = drachen_zustaende(eintrag.pop("tempo_luft"), eintrag.pop("tempo_boden"),
                                            eintrag.pop("jagt_tiere"), eintrag.pop("sitz"),
                                            schwimmt=eintrag.pop("schwimmt", False))
    k = drachen_grundlage()
    k.update(eintrag.pop("komponenten", {}))
    bew = bewegungen or drachen_bewegungen(schwinge, **bewegung)
    if len(koepfe) > 1:
        bew = mehrere_koepfe(bew, koepfe)
    eintrag.update({
        "art": "drache", "verhalten": "drache", "keine_panik": True, "baby": False,
        "komponenten": k, "gruppen": gruppen, "ereignisse": ereignisse,
        "start_gruppen": ["fynn:luft", "fynn:wildjagd"], "start_setzen": {"fynn:fliegt": True},
        "eigenschaften": eigenschaften_drache(),
        "eigene_bewegungen": nur_vorhandene(bew, eintrag["gestalt"]),
        "vorher": VORHER,
        # Augenlider im Schlaf und besiegt - und zum Blinzeln; jeder Kopf
        # blinzelt fuer sich. Der Sattel nur gesattelt.
        "sichtbarkeit": [{f"lider{s}": blinzeln(j * 0.9)} for j, s in enumerate(koepfe)]
        + [{"sattel": "query.is_saddled"}],
        "gruppe": "Drachen",
    })
    eintrag["steckbrief_extra"] = eintrag.get("steckbrief_extra", []) + [
        ["Besiegen", "bei einem Viertel Leben bricht er zusammen – drei Schläge: Gnadenstoß und Beute; "
                     "ein Goldapfel: er steht auf und gehört dir"],
        ["Zahm", "folgt dir und kämpft mit dir; schleichend antippen: bleib hier / komm mit"],
        ["Reiten", "mit Sattel: Sprungtaste zum Steigen, er fliegt, wohin du schaust; "
                   "schlägst du beim Reiten zu, speit er dorthin"],
        ["Schlafen", "nachts eingerollt am Boden – wer schleicht, weckt ihn nicht"]]
    return eintrag


# ------------------------------------------------------------ Lindwurm

def _lindwurm():
    import drachen_gestalt as dg
    return drache({
        "id": "lindwurm", "name": ("Lindwurm", "Fire Dragon"), "gestalt": "lindwurm",
        "varianten": [("gruen", 50), ("rot", 35), ("schwarz", 15)],
        "leben": 160, "schaden": 12, "tempo": 1.4, "tempo_luft": 1.4, "tempo_boden": 0.2,
        "kollision": (3.5, 2.6), "herde": (1, 1),
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
    }, dg.LINDWURM_SCHWINGE, hals=5, schwanz=8, beinhoehe=21)


# ------------------------------------------------------------ Frostwyvern

def _frostwyvern():
    import drachen_gestalt as dg
    return drache({
        "id": "frostwyvern", "name": ("Frostwyvern", "Frost Wyvern"), "gestalt": "frostwyvern",
        "varianten": [("eis", 60), ("gletscher", 30), ("nacht", 10)],
        "leben": 120, "schaden": 9, "tempo": 1.5, "tempo_luft": 1.55, "tempo_boden": 0.22,
        "kollision": (2.6, 2.0), "herde": (1, 1),
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
    }, dg.FROSTWYVERN_SCHWINGE, hals=4, schwanz=8, beinhoehe=18, stuetzt=True)


# ------------------------------------------------------------ Himmelsdrache

def _himmelsdrache():
    import drachen_gestalt as dg
    return drache({
        "id": "himmelsdrache", "name": ("Himmelsdrache", "Sky Serpent"), "gestalt": "himmelsdrache",
        "varianten": [("jade", 50), ("perle", 35), ("gold", 15)],
        "leben": 130, "schaden": 8, "tempo": 1.3, "tempo_luft": 1.3, "tempo_boden": 0.2,
        "kollision": (2.0, 1.6), "herde": (1, 1),
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
    }, None, bewegungen=schlangen_bewegungen(dg.HIMMELSDRACHE_GLIEDER, 2))


# ------------------------------------------------------------ Giftdrache

def _giftdrache():
    import drachen_gestalt as dg
    return drache({
        "id": "giftdrache", "name": ("Giftdrache", "Twin-Headed Venom Dragon"), "gestalt": "giftdrache",
        "varianten": [("sumpf", 55), ("moor", 30), ("gift", 15)],
        "leben": 140, "schaden": 10, "tempo": 1.35, "tempo_luft": 1.35, "tempo_boden": 0.2,
        "kollision": (2.8, 2.2), "herde": (1, 1),
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
        "atemarten": ["gift", "funken"],
        "steckbrief_extra": [
            ["Lebt", "in Sümpfen und Mangrovensümpfen – zwei Köpfe, zwei Aufgaben"],
            ["Linker Kopf", "bläst eine Giftwolke, die eine Weile liegen bleibt – wer hineingerät, wird vergiftet"],
            ["Rechter Kopf", "spuckt Funken: Trifft er die Wolke, explodiert sie"],
            ["Biss", "vergiftet"]],
    }, dg.GIFTDRACHE_SCHWINGE, koepfe=("_a", "_b"), hals=5, schwanz=7, beinhoehe=17)


DRACHEN = [_lindwurm(), _frostwyvern(), _himmelsdrache(), _giftdrache()]
