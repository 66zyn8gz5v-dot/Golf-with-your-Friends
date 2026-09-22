#!/usr/bin/env python3
"""Baut aus einer Beschreibung aus Kaesten ein 3D-Waffenmodell samt Textur.

Warum ein Werkzeug und nicht von Hand: Ein 3D-Schwert besteht aus sieben
Kaesten, und jeder Kasten braucht sechs Texturfelder an genau berechneten
Stellen. Von Hand ist das eine Stunde Zaehlarbeit pro Waffe - und beim
naechsten Speer faengt man von vorn an. Hier sagt man, welche Kaesten es
gibt und woraus sie sind; die Felder sucht das Werkzeug selbst.

Die Farben stammen aus Mojangs eigenen Texturen (iron_sword.png), nicht aus
dem Gefuehl - geschaetzte Metalltoene waren beim Stein schon einmal daneben.
"""

import json
import math
import sys
from pathlib import Path

from PIL import Image

# Aus iron_sword.png ausgelesen, von hell nach dunkel.
WERKSTOFFE = {
    "stahl": {
        "kern": (216, 216, 216),
        "glanz": (255, 255, 255),
        # Aus Fynns Vorlage gemessen: der Schatten neben dem Grat ist 122,
        # nicht 150. Der Unterschied entscheidet, ob die Klinge raeumlich
        # wirkt oder wie angemalt.
        "flanke": (122, 122, 122),
    },
    "leder": {
        "kern": (104, 78, 30),
        "glanz": (137, 103, 39),
        "flanke": (73, 54, 21),
    },
    "haut": {
        # Aus Mojangs steve.png gemessen (rechter Arm, Vorderseite).
        "kern": (170, 125, 102),
        "glanz": (186, 139, 114),
        "flanke": (150, 111, 91),
    },
    "eisen": {  # matter als die Klinge, fuer Parierstange und Knauf
        "kern": (150, 150, 150),
        "glanz": (190, 190, 190),
        "flanke": (107, 107, 107),
    },
}


def felder_eines_kastens(groesse):
    """Breite und Hoehe des Texturkreuzes, das ein Kasten braucht."""
    w, h, d = (int(round(z)) for z in groesse)
    return 2 * (d + w), d + h


def packe(kaesten, breite):
    """Legt die Texturkreuze reihenweise nebeneinander.

    Ein einfacher Regalpacker: Was nicht mehr in die Reihe passt, kommt in
    die naechste. Bei sieben Kaesten lohnt nichts Klügeres, und so bleibt
    nachvollziehbar, welches Feld wo liegt.
    """
    plaetze = {}
    x = y = zeilenhoehe = 0
    for kasten in kaesten:
        fw, fh = felder_eines_kastens(kasten["size"])
        if x + fw > breite:
            x = 0
            y += zeilenhoehe + 1
            zeilenhoehe = 0
        plaetze[kasten["name"]] = (x, y)
        x += fw + 1
        zeilenhoehe = max(zeilenhoehe, fh)
    return plaetze, y + zeilenhoehe


def uv_feld(uv, groesse, seite):
    """Ecke und Groesse eines Seitenfeldes im Bedrock-Kreuz.

    Gleiche Aufteilung wie im Betrachter - up liegt bei u+d, nachgesehen in
    Mojangs steve.png.
    """
    u, v = uv
    w, h, d = (int(round(z)) for z in groesse)
    return {
        "up":    (u + d,         v,     w, d),
        "down":  (u + d + w,     v,     w, d),
        "west":  (u,             v + d, d, h),
        "north": (u + d,         v + d, w, h),
        "east":  (u + d + w,     v + d, d, h),
        "south": (u + d + w + d, v + d, w, h),
    }[seite]


def male_flaeche(bild, feld, farben, seite, schliff, gewickelt=False,
                 abschnitte=False, gemustert=False):
    """Malt ein Seitenfeld: heller Kern, abgesetzte Kanten.

    Keine geschlossene Umrandung. Eine Klinge ist drei Pixel breit - zieht
    man aussen und oben und unten einen Rand, bleibt davon nichts als Rand
    uebrig, und das Schwert wird schwarz. Die Tiefe macht ohnehin der
    Unterschied zwischen den Flaechen, nicht ein gemalter Strich.
    """
    fu, fv, fw, fh = feld
    mitte = (fw - 1) / 2
    for zeile in range(fh):
        for spalte in range(fw):
            farbe = farben["kern"]
            if gemustert:
                # Feste Regel statt Zufall: Gewuerfeltes Rauschen sah beim
                # Stein nach Bildstoerung aus. Diese Folge wiederholt sich
                # erst nach vier Pixeln und wirkt deshalb wie gehaemmertes
                # Metall, nicht wie Flimmern.
                stufe = (spalte * 3 + zeile * 5) % 4
                farbe = (farben["glanz"] if stufe == 0
                         else farben["flanke"] if stufe == 3
                         else farben["kern"])
            if gewickelt and zeile % 2 == 1:
                farbe = farben["flanke"]
            if fw >= 3 and (spalte == 0 or spalte == fw - 1):
                farbe = farben["flanke"]
            # Drei Toene nebeneinander, nicht symmetrisch: hell, dunkel,
            # mittel. Aus Fynns Vorlage abgelesen - das Licht faellt von
            # einer Seite, also liegt der Glanz auf der einen Schneide, der
            # Schatten neben dem Grat und der Grundton auf der anderen
            # Haelfte. Ein Glanzstreifen genau in der Mitte sieht dagegen
            # aus wie ein Brett mit Strich.
            if schliff and fw >= 3:
                farbe = (farben["glanz"] if spalte == 0
                         else farben["flanke"] if spalte == 1
                         else farben["kern"])
            elif schliff and fw == 2:
                farbe = farben["glanz"] if spalte == 0 else farben["kern"]
            if fh >= 3 and zeile == fh - 1:
                farbe = farben["flanke"]
            # Abschnitte der Laenge nach, zur Spitze hin heller. Eine
            # einfarbige Klinge sieht aus wie ein ausgeschnittenes Stueck
            # Papier; die Vorlage staffelt sie in Stufen.
            if abschnitte and fh >= 6 and farbe != farben["flanke"]:
                stufe = (zeile * 4) // fh
                farbe = tuple(min(255, max(0, k + (1 - stufe) * 14)) for k in farbe)
            if seite == "down":
                farbe = farben["flanke"]
            bild.putpixel((fu + spalte, fv + zeile), farbe + (255,))


def pruefe_luecken(kaesten):
    """Warnt, wenn zwischen zwei Teilen der Mittelachse Luft bleibt.

    Genau diese Luecke hat Fynn im Spiel gesehen: "schrumpfen" zieht einen
    Kasten in alle Richtungen zusammen, auch in der Laenge, und dann
    stossen zwei Teile nicht mehr aneinander. Von aussen sieht man es
    kaum, im Spiel schwebt die Spitze.
    """
    achse = []
    gedreht = 0
    for k in kaesten:
        # Gedrehte Kaesten bleiben aussen vor: Ihre Kanten liegen nach der
        # Drehung nicht mehr da, wo die Zahlen stehen, und die Rechnung
        # haette bei jeder Schraege Alarm geschlagen, wo keiner ist.
        if k.get("drehung") and any(k["drehung"]):
            gedreht += 1
            continue
        # Teile, die seitlich ausscheren, gehoeren nicht zur Mittelachse.
        if abs(k["origin"][0] + k["size"][0] / 2) > 0.6:
            continue
        s = k.get("schrumpfen", 0)
        achse.append((k["origin"][1] - s, k["origin"][1] + k["size"][1] + s, k["name"]))
    achse.sort()
    luecken = []
    for (u1, o1, n1), (u2, o2, n2) in zip(achse, achse[1:]):
        if u2 > o1 + 0.001:
            luecken.append(f"  zwischen {n1} und {n2}: {o1:.3f} bis {u2:.3f}")
    if luecken:
        print("Luecken in der Mittelachse:")
        print("\n".join(luecken))
    if gedreht:
        print(f"  ({gedreht} gedrehte Kaesten nicht geprueft - bei schraegen "
              f"Teilen stimmt die Rechnung nicht.)")
    return not luecken


def baue(name, kennung, kaesten, breite=64, ziel_modell=None, ziel_textur=None):
    pruefe_luecken(kaesten)
    plaetze, hoehe = packe(kaesten, breite)
    hoehe = max(16, 1 << (max(1, hoehe - 1)).bit_length())  # auf Zweierpotenz

    bild = Image.new("RGBA", (breite, hoehe), (0, 0, 0, 0))
    knochen_kaesten = []

    for kasten in kaesten:
        uv = plaetze[kasten["name"]]
        farben = WERKSTOFFE[kasten["werkstoff"]]
        schliff = kasten.get("schliff", False)
        for seite in ("up", "down", "west", "north", "east", "south"):
            feld = uv_feld(uv, kasten["size"], seite)
            if feld[2] <= 0 or feld[3] <= 0:
                continue
            male_flaeche(bild, feld, farben, seite, schliff,
                         kasten.get("gewickelt", False),
                         kasten.get("abschnitte", False),
                         kasten.get("gemustert", False))

        eintrag = {
            "origin": kasten["origin"],
            "size": kasten["size"],
            "uv": list(uv),
        }
        # Ein negativer Wert schrumpft den Kasten in alle Richtungen. So wird
        # aus einem Pixel Dicke ein halber - fuer Schneiden, die duenner sind
        # als der Grat in der Mitte.
        if kasten.get("schrumpfen"):
            eintrag["inflate"] = kasten["schrumpfen"]

        # Gedrehte Kaesten geben schraege Kanten, die aus geraden Kaesten nur
        # als Treppe herauskommen - die Klingenspitze der Vorlage ist genau
        # das. Ohne Drehpunkt dreht der Kasten um die Mitte seiner
        # Grundflaeche: Beim Anstueckeln zaehlt der Fuss, nicht der
        # Mittelpunkt, sonst wandert das Teil beim Drehen weg von dem,
        # woran es sitzen soll.
        drehung = kasten.get("drehung")
        if drehung and any(drehung):
            eintrag["rotation"] = list(drehung)
            eintrag["pivot"] = list(kasten.get("drehpunkt") or [
                kasten["origin"][0] + kasten["size"][0] / 2,
                kasten["origin"][1],
                kasten["origin"][2] + kasten["size"][2] / 2,
            ])
        knochen_kaesten.append(eintrag)

    modell = {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": f"geometry.{name}",
                "texture_width": breite,
                "texture_height": hoehe,
                "visible_bounds_width": 3,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1, 0],
            },
            "bones": [{
                # Der Name ist Vorschrift: Bedrock haengt den Knochen
                # "rightitem" an die Hand. Die Bindung daneben sorgt dafuer,
                # dass es auch in der linken Hand sitzt.
                "name": "rightitem",
                "binding": "q.item_slot_to_bone_name(c.item_slot)",
                "pivot": [0, 8, 0],
                "cubes": knochen_kaesten,
            }],
        }],
    }

    ziel_modell = Path(ziel_modell or f"{name}.geo.json")
    ziel_textur = Path(ziel_textur or f"{name}.png")
    ziel_modell.write_text(json.dumps(modell, indent=2) + "\n", encoding="utf-8")
    bild.save(ziel_textur)
    print(f"gebaut: {ziel_modell.name} und {ziel_textur.name} "
          f"({breite}x{hoehe}, {len(kaesten)} Kaesten)")
    return modell


# --------------------------------------------------------- Die Eisenklinge

# Aufrecht gebaut, Griff unten. Der Mittelgrat liegt quer zur Klinge und
# steht seitlich vor - das ist es, was die Waffe von vorne wie eine Raute
# aussehen laesst statt wie ein Brett.
EISENKLINGE = [
    # Aus der Vorlage gemessen, ein Pixel entspricht dort 49 Bildpunkten:
    # Klinge 151 Punkte breit (drei Pixel), Parierstange 340 (sieben), Griff
    # 76 - also anderthalb, hier noch etwas schlanker.
    #
    # Achtung bei "schrumpfen": Es zieht den Kasten in ALLE Richtungen
    # zusammen, also auch in der Laenge. Zwei duenne Teile, die im Raster
    # aneinanderstossen, haben danach eine Luecke dazwischen. Deshalb
    # ueberlappen die Stuecke hier um mehr, als sie schrumpfen.
    # Der Knauf in zwei Stufen, die nach unten breiter werden. Ich hatte das
    # zwischendurch zu einem Kasten zusammengezogen, weil es wie ein Sockel
    # aussah - Fynn gefaellt die Stufe besser, und es ist sein Schwert.
    {"name": "knauf_platte", "origin": [-1.5, -0.25, -1.0], "size": [3, 1.5, 2], "werkstoff": "eisen", "gemustert": True, "schrumpfen": -0.25},
    {"name": "knauf_hals",   "origin": [-1.0, 1, -0.5], "size": [2, 1, 1], "werkstoff": "eisen", "gemustert": True},
    {"name": "griff",        "origin": [-1.0,  1.5, -1.0], "size": [2, 5, 2], "werkstoff": "leder", "gewickelt": True, "schrumpfen": -0.375},
    {"name": "parier_mitte", "origin": [-1.5,  6, -1.0], "size": [3, 1, 2], "werkstoff": "eisen", "gemustert": True},
    {"name": "parier_links", "origin": [-3.5,  6, -0.5], "size": [2, 1, 1], "werkstoff": "eisen", "gemustert": True, "schrumpfen": -0.125},
    {"name": "parier_rechts","origin": [ 1.5,  6, -0.5], "size": [2, 1, 1], "werkstoff": "eisen", "gemustert": True, "schrumpfen": -0.125},
    {"name": "klinge",       "origin": [-1.5,  6.5, -0.5], "size": [3, 14, 1], "werkstoff": "stahl", "schliff": True, "schrumpfen": -0.375, "abschnitte": True},
    {"name": "grat",         "origin": [-0.5,  6.5, -0.5], "size": [1, 14, 1], "werkstoff": "stahl", "schrumpfen": -0.25},
    {"name": "klinge_ort",   "origin": [-1.0, 19.5, -0.5], "size": [2, 2, 1], "werkstoff": "stahl", "schliff": True, "schrumpfen": -0.375},
    {"name": "spitze",       "origin": [-0.5, 20.5, -0.5], "size": [1, 2, 1], "werkstoff": "stahl", "schrumpfen": -0.25},
]


# ------------------------------------------------- Aus einer Zeichenkarte

def verschmelze(felder, abstand=20):
    """Fasst Farben zusammen, die praktisch gleich sind.

    Bilder verlieren beim Verschicken durch Messenger an Genauigkeit: Aus
    zwei Farben werden dreissig, die sich um zwei, drei Stufen
    unterscheiden. Ungefiltert bekaeme jeder dieser Toene ein eigenes
    Zeichen, und das Modell zerfiele in lauter Einzelkaesten, statt Balken
    zusammenzufassen - bei Fynns Stahlschwert 25 Griffarben statt vier.

    Die haeufigste Farbe einer Gruppe gewinnt: Sie ist die, die wirklich
    gemalt wurde, die anderen sind ihre verrutschten Nachbarn.
    """
    from collections import Counter
    haeufig = Counter(f for z in felder for f in z if f)
    vertreter = []
    ersatz = {}
    for farbe, _ in haeufig.most_common():
        for v in vertreter:
            if sum(abs(a - b) for a, b in zip(farbe, v)) <= abstand:
                ersatz[farbe] = v
                break
        else:
            vertreter.append(farbe)
            ersatz[farbe] = farbe
    return [[ersatz[f] if f else None for f in z] for z in felder], len(vertreter)


def _balken(karte, winkel=None):
    """Fasst waagerecht benachbarte Pixel gleicher Farbe zusammen.

    Sonst wuerde jeder Pixel ein eigener Kasten: Ein Schwert braechte es auf
    ueber hundert, und jeder kostet das Spiel Rechenzeit. Waagerecht reicht -
    bei einer Klinge liegen die gleichen Toene ohnehin in Zeilen.

    Gedrehte Pixel bleiben einzeln: Jeder hat seinen eigenen Winkel, und
    zusammengefasst waere aus zwei schraegen Pixeln ein langer schraeger
    Balken geworden statt zweier Stufen.
    """
    gefunden = []
    for zeile, text in enumerate(karte):
        dreh_zeile = winkel[zeile] if winkel else None
        spalte = 0
        while spalte < len(text):
            zeichen = text[spalte]
            if zeichen == ".":
                spalte += 1
                continue
            grad = _grad(dreh_zeile, spalte)
            ende = spalte
            if not grad:
                while (ende + 1 < len(text) and text[ende + 1] == zeichen
                       and not _grad(dreh_zeile, ende + 1)):
                    ende += 1
            gefunden.append((spalte, zeile, ende - spalte + 1, zeichen, grad))
            spalte = ende + 1
    return gefunden


# Zeichen der Drehkarte. Die Schraegen zeigen in die Richtung, in die die
# Kante laeuft - so wie man sie auch hinschreiben wuerde.
DREHUNGEN = {".": 0.0, " ": 0.0, "/": 45.0, "\\": -45.0,
             "<": 22.5, ">": -22.5, "x": 90.0}


def _grad(zeile, spalte):
    if not zeile or spalte >= len(zeile):
        return 0.0
    return DREHUNGEN.get(zeile[spalte], 0.0)


def _pruefe_karte(name, karte, mitte):
    """Warnt, wenn auf der Mittelachse eine Zeile leer bleibt.

    Ein Loch mittendrin faellt im flachen Bild kaum auf - zwischen Klinge
    und Parierstange sieht es wie ein Schatten aus. Im Modell schwebt
    dann der obere Teil, weil ihn nichts mehr traegt. Genau das hat Fynn
    an seinem eigenen Bild gesehen.
    """
    spalte = int(mitte)
    belegt = []
    for i, zeile in enumerate(karte):
        voll = any(c != "." for c in zeile[max(0, spalte-1):spalte+1])
        belegt.append(voll)
    erste = next((i for i, v in enumerate(belegt) if v), None)
    letzte = next((i for i in range(len(belegt)-1, -1, -1) if belegt[i]), None)
    if erste is None:
        return True
    loecher = [i for i in range(erste, letzte + 1) if not belegt[i]]
    if loecher:
        print(f"Loch in der Mittelachse von {name}: "
              + ", ".join(f"Zeile {i}" for i in loecher))
        print("  Dort traegt nichts - im Modell schwebt, was darueber liegt.")
    return not loecher


def _pruefe_mitte(name, karte, mitte, versatz):
    """Warnt, wenn ein Teil nicht auf der Mittelachse liegt.

    Der Versatz ist dafuer da, ein Teil mit ungerader Breite mittig zu
    bekommen - falsch herum angewendet schiebt er ein Teil heraus, das
    vorher schon richtig lag. Genau das ist mir mit dem Griff passiert,
    und im Bild sieht man einen halben Pixel Versatz kaum. Deshalb rechnet
    das Werkzeug es nach.

    Zeilen, die absichtlich aussermittig sind - eine Schneide, eine
    einseitige Zier -, melden sich hier mit. Die Meldung ist eine Frage,
    kein Fehler.
    """
    schief = []
    for zeile, text in enumerate(karte):
        gemalt = [i for i, c in enumerate(text) if c != "."]
        if not gemalt:
            continue
        v = versatz[zeile] if versatz and zeile < len(versatz) else 0.0
        links = gemalt[0] - mitte + v
        rechts = gemalt[-1] + 1 - mitte + v
        versetzt = (links + rechts) / 2
        if abs(versetzt) > 0.01:
            schief.append((zeile, versetzt))
    if schief:
        print(f"Nicht auf der Mittelachse bei {name}:")
        for zeile, versetzt in schief:
            print(f"  Zeile {zeile}: {versetzt:+.2f} Pixel neben der Mitte")
    return not schief


def _ecken(anbau):
    """Die vier Ecken eines Anbaus in der Ansicht von vorne, nach der
    Drehung. Die Tiefe bleibt aussen vor - Luecken entstehen in der
    Flaeche, nicht dahinter."""
    ox, oy = anbau["origin"][0], anbau["origin"][1]
    bx, by = anbau["size"][0], anbau["size"][1]
    dreh = (anbau.get("drehung") or [0, 0, 0])[2]
    px, py = (anbau.get("drehpunkt") or [ox + bx / 2, oy, 0])[:2]
    bogen = math.radians(dreh)
    ecken = []
    for ex, ey in ((ox, oy), (ox + bx, oy), (ox + bx, oy + by), (ox, oy + by)):
        dx, dy = ex - px, ey - py
        ecken.append((px + dx * math.cos(bogen) - dy * math.sin(bogen),
                      py + dx * math.sin(bogen) + dy * math.cos(bogen)))
    return ecken


def _pruefe_anbauten(name, anbauten):
    """Warnt, wenn zwei Anbauten sich nicht beruehren.

    Gedrehte Teile stossen fast nie glatt aneinander: Der Winkel laesst
    an der einen Ecke einen Keil offen. Von aussen sieht man davon wenig,
    im Spiel aber schwebt das Teil - genau das hat Fynn beim ersten
    Schwert entdeckt, und hier wieder.
    """
    kaesten = []
    for a in anbauten:
        ecken = _ecken(a)
        kaesten.append((a.get("name", "?"),
                        min(e[0] for e in ecken), max(e[0] for e in ecken),
                        min(e[1] for e in ecken), max(e[1] for e in ecken)))
    luecken = []
    for i, (n1, l1, r1, u1, o1) in enumerate(kaesten):
        naechster = None
        for j, (n2, l2, r2, u2, o2) in enumerate(kaesten):
            if i == j:
                continue
            # Ueberschneiden sie sich senkrecht, koennte es ein Nachbar sein.
            if o2 > u1 - 0.01 and o1 > u2 - 0.01:
                abstand = max(l2 - r1, l1 - r2)
                if abstand > 0.001:
                    naechster = abstand if naechster is None else min(naechster, abstand)
                else:
                    naechster = 0.0
                    break
        if naechster and naechster > 0.001:
            luecken.append(f"  {n1}: {naechster:.2f} Pixel Luft zum naechsten Teil")
    if luecken:
        print(f"Luecken zwischen den Anbauten von {name}:")
        print("\n".join(luecken))
    return not luecken


def aus_zeichenkarte(name, karte, farben, dicke=1.0, mitte=None, anbauten=None,
                     musterzeilen=0, winkel=None, versatz=None,
                     ziel_modell=None, ziel_textur=None):
    """Zieht ein flaches Bild in die Tiefe - jeder Pixel wird zum Quader.

    Warum das leichter ist als Kaesten zu stapeln: Gemalt wird, was man
    sieht. Die Form stimmt dann von selbst, weil sie dieselbe ist wie im
    Inventarbild.

    Die Textur ist das gemalte Bild selbst, unveraendert. Jede Flaeche holt
    sich ihren Ausschnitt daraus - dafuer gibt es in Bedrock die Angabe je
    Seite. Mit dem sonst ueblichen Kreuz-Layout ginge das nicht: Dort
    muesste fuer jeden Kasten ein eigenes Feld gepackt werden, und die
    Farben stuenden nicht mehr da, wo sie gemalt wurden.
    """
    hoehe = len(karte)
    breite = len(karte[0])

    # Die Dicke darf je Zeile verschieden sein. Eine Klinge ist duenn, die
    # Parierstange wuchtig, der Griff schlank - mit einer Dicke fuer alles
    # wird entweder die Klinge zum Brett oder die Parierstange zum Blech.
    def dicke_bei(zeile):
        if isinstance(dicke, (int, float)):
            return float(dicke)
        return float(dicke[zeile] if zeile < len(dicke) else dicke[-1])
    # Welche Spalte auf der Mittelachse liegt. Ohne Angabe die Bildmitte -
    # aber wenn die Klinge nicht mittig gemalt ist, haengt die Waffe sonst
    # schief in der Hand.
    if mitte is None:
        mitte = breite / 2

    bild = Image.new("RGBA", (breite, hoehe), (0, 0, 0, 0))
    for zeile, text in enumerate(karte):
        for spalte, zeichen in enumerate(text):
            bild.putpixel((spalte, zeile), tuple(farben.get(zeichen, (0, 0, 0, 0))))

    # Die untersten Zeilen koennen ein Musterfeld sein: gemalt, aber nicht
    # Teil der Waffe. Anbauten holen sich ihr Bild von dort - ein Knauf mit
    # Verlauf laesst sich sonst nicht machen, weil ein Anbau sonst nur eine
    # einzelne Farbe traegt.
    sichtbar = karte[:hoehe - musterzeilen] if musterzeilen else karte

    kaesten = []
    for x, zeile, lang, zeichen, grad in _balken(sichtbar, winkel):
        # Bildzeilen zaehlen von oben, das Modell zaehlt von unten.
        y = len(sichtbar) - 1 - zeile
        # Mittig um die Senkrechte, damit die Waffe in der Hand nicht
        # seitlich haengt.
        # Zeilen koennen um einen halben Pixel versetzt liegen. In Fynns
        # Vorlage ist der Griff zwei Pixel breit und die Parierstange
        # darueber drei - das geht nur, wenn die Reihen gegeneinander
        # verschoben sind. Auf einem starren Raster laesst sich das nicht
        # bauen, und von Hand nachzurechnen waere bei jeder Zeile eine
        # Gelegenheit, sich zu vertun.
        schiebe = versatz[zeile] if versatz and zeile < len(versatz) else 0.0
        tief = dicke_bei(zeile)
        eintrag = {
            "origin": [x - mitte + schiebe, y, -tief / 2],
            "size": [lang, 1, tief],
            "uv": {
                # Die Rueckseite spiegelt, sonst stuende das Bild dort
                # seitenverkehrt - eine negative Breite dreht den Ausschnitt.
                "north": {"uv": [x, zeile], "uv_size": [lang, 1]},
                "south": {"uv": [x + lang, zeile], "uv_size": [-lang, 1]},
                # Die Schmalseiten zeigen denselben Pixel, nur gestreckt -
                # eine Kante ist einfarbig, da faellt das nicht auf.
                "east":  {"uv": [x + lang - 1, zeile], "uv_size": [1, 1]},
                "west":  {"uv": [x, zeile], "uv_size": [1, 1]},
                "up":    {"uv": [x, zeile], "uv_size": [lang, 1]},
                "down":  {"uv": [x, zeile], "uv_size": [lang, 1]},
            },
        }
        # Ein gedrehter Pixel macht aus einer Treppe eine glatte Kante.
        # Gedreht wird um die eigene Mitte, damit der Pixel dort bleibt,
        # wo er gemalt wurde, und nur seine Ecken ausschwenken.
        if grad:
            eintrag["rotation"] = [0.0, 0.0, grad]
            eintrag["pivot"] = [x - mitte + schiebe + lang / 2, y + 0.5, 0.0]
        kaesten.append(eintrag)

    # Anbauten: Teile, die sich nicht malen lassen, weil sie nicht flach
    # sind - eine geschwungene Parierstange, ein gekippter Knauf. Sie holen
    # ihre Farbe aus einem Pixel der Karte, damit alles eine Textur bleibt.
    stellen = {}
    for zeile, text in enumerate(karte):
        for spalte, zeichen in enumerate(text):
            if zeichen != "." and zeichen not in stellen:
                stellen[zeichen] = (spalte, zeile)

    for anbau in (anbauten or []):
        zeichen = anbau["farbe"]
        if zeichen not in stellen:
            raise ValueError(
                f"{name}: Anbau '{anbau.get('name', '?')}' will die Farbe "
                f"'{zeichen}', die kommt im Bild aber nicht vor.")
        u, v = stellen[zeichen]
        feld = anbau.get("bild") or [u, v, 1, 1]
        bu, bv, bw, bh = feld
        eintrag = {
            "origin": list(anbau["origin"]),
            "size": list(anbau["size"]),
            # Ohne "bild" ein einzelner Pixel, auf die ganze Flaeche
            # gezogen - bei einem einfarbigen Anbau faellt das nicht auf.
            # Mit "bild" ein Ausschnitt der Karte, fuer Teile mit Muster.
            "uv": {
                "north": {"uv": [bu, bv], "uv_size": [bw, bh]},
                "south": {"uv": [bu + bw, bv], "uv_size": [-bw, bh]},
                "east":  {"uv": [u, v], "uv_size": [1, 1]},
                "west":  {"uv": [u, v], "uv_size": [1, 1]},
                "up":    {"uv": [u, v], "uv_size": [1, 1]},
                "down":  {"uv": [u, v], "uv_size": [1, 1]},
            },
        }
        if anbau.get("drehung") and any(anbau["drehung"]):
            eintrag["rotation"] = list(anbau["drehung"])
            eintrag["pivot"] = list(anbau.get("drehpunkt") or [
                anbau["origin"][0] + anbau["size"][0] / 2,
                anbau["origin"][1],
                anbau["origin"][2] + anbau["size"][2] / 2,
            ])
        kaesten.append(eintrag)

    # Die Waffe wird auf den Drehpunkt gesetzt. Vorher stand sie darauf und
    # ragte nach oben weg - beim Verkleinern schrumpfte sie dann nicht an
    # Ort und Stelle, sondern rutschte gleichzeitig nach unten, und beim
    # Drehen schwenkte sie um ihr unteres Ende aus. Liegt ihre Mitte auf dem
    # Drehpunkt, dreht und schrumpft sie um sich selbst - so wie Minecraft
    # es mit dem Bild eines gewoehnlichen Gegenstands auch tut.
    # 8 ist die Mitte des Feldes, in dem Minecraft das Bild eines
    # gewoehnlichen Gegenstands zeichnet - ein Quadrat von 16 Kaestchen,
    # und der Drehpunkt "rightitem" sitzt genau in dessen Mitte.
    versetze = 8 - len(sichtbar) / 2
    for kasten in kaesten:
        kasten["origin"][1] += versetze
        if "pivot" in kasten:
            kasten["pivot"][1] += versetze

    modell = {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": f"geometry.{name}",
                "texture_width": breite,
                "texture_height": hoehe,
                "visible_bounds_width": 4,
                "visible_bounds_height": 4,
                "visible_bounds_offset": [0, 1, 0],
            },
            # Wie die Waffe in der Hand liegt - am 22. September im Spiel
            # gemessen, nicht hergeleitet:
            #
            # Der Knochen der Hand steht auf dem Kopf. Eine Klinge, die im
            # Modell nach +Y zeigt, haengt im Spiel mit der Spitze nach
            # unten. Deshalb steht in der Haltung eine Drehung um -135 Grad
            # und nicht um +45: Beide legen die Waffe auf dieselbe Schraege
            # des Gegenstandsfeldes, aber nur die erste mit der Spitze nach
            # oben rechts, wie Minecraft seine Schwerter zeichnet.
            #
            # Und Vorsicht mit modell_ansehen.py: Der Betrachter zeichnet
            # eine gedrehte Waffe spiegelverkehrt zum Spiel. Fuer "sitzen
            # die Kaesten richtig" taugt er, fuer "zeigt die Spitze nach
            # oben" nicht.
            #
            # Zwei Knochen statt einem, und das aus einem Grund: "rightitem"
            # ist der Knochen, den Minecraft selbst bewegt - er traegt den
            # Ausholschwung beim Zuschlagen. Wer ihn selbst dreht, ueberschreibt
            # den Schwung und schlaegt fortan mit einer starren Stange zu.
            # Die Haltung sitzt deshalb auf einem Kind, und der Schwung bleibt,
            # wo er hingehoert.
            "bones": [
                {
                    "name": "rightitem",
                    "binding": "q.item_slot_to_bone_name(c.item_slot)",
                    "pivot": [0, 8, 0],
                },
                # Dazwischen einer, der nur rechnet. Der Stoss des Degens
                # faehrt hier, nicht in der Haltung darunter: Ein Ausdruck,
                # den Minecraft nicht versteht, macht die ganze Zeile zu
                # Null - stuende die Rechnung in der Haltung, laege die
                # Waffe bei jedem Fehlschlag wieder mitten im Koerper. Auf
                # einem eigenen Knochen faellt nur die Bewegung aus.
                {
                    "name": "laden",
                    "parent": "rightitem",
                    "pivot": [0, 8, 0],
                },
                {
                    "name": "stoss",
                    "parent": "laden",
                    "pivot": [0, 8, 0],
                },
                {
                    "name": "waffe",
                    "parent": "stoss",
                    "pivot": [0, 8, 0],
                },
                # Und noch einer darunter: Er bestimmt, wo die Hand
                # zupackt. Die Waffe liegt im Modell auf ihrer Mitte, und
                # von aussen sah man deshalb, wie der Spieler sie in der
                # Mitte haelt - die untere Haelfte steckte im Arm. Ein
                # Schritt auf diesem Knochen schiebt sie am eigenen
                # Laengsschnitt entlang, bis der Griff in der Faust liegt.
                #
                # Warum ein eigener Knochen und keine Zahl weiter oben: In
                # diesem hier zeigt +Y die Klinge entlang, in den Knochen
                # darueber nicht mehr - dort ist die Waffe schon gedreht,
                # und zwar in jeder Perspektive anders.
                {
                    "name": "griff",
                    "parent": "waffe",
                    "pivot": [0, 8, 0],
                    "cubes": kaesten,
                },
            ],
        }],
    }

    ziel_modell = Path(ziel_modell or f"{name}.geo.json")
    ziel_textur = Path(ziel_textur or f"{name}.png")
    ziel_modell.parent.mkdir(parents=True, exist_ok=True)
    ziel_textur.parent.mkdir(parents=True, exist_ok=True)
    ziel_modell.write_text(json.dumps(modell, indent=2) + "\n", encoding="utf-8")
    bild.save(ziel_textur)
    gemalt = sum(1 for z in sichtbar for c in z if c != ".")
    _pruefe_karte(name, sichtbar, mitte)
    _pruefe_mitte(name, sichtbar, mitte, versatz)
    _pruefe_anbauten(name, anbauten or [])

    zahl_anbau = len(anbauten or [])
    print(f"gebaut: {ziel_modell.name} aus {breite}x{hoehe} - "
          f"{gemalt} Pixel zu {len(kaesten) - zahl_anbau} Kaesten"
          + (f" plus {zahl_anbau} Anbauten" if zahl_anbau else "")
          + (f", Dicke {dicke}" if isinstance(dicke, (int, float))
             else f", Dicke {min(dicke)} bis {max(dicke)}"))
    return modell


# --------------------------------------------- Die Flammklinge in Eisen

# Nachgebaut nach Fynns Vorlage, in Eisen statt in Flammen.
#
# Die Masse sind abgezaehlt, nicht geschaetzt: Das Vorlagenbild wurde um
# die gemessenen 4,06 Grad gerade gedreht - die Klinge stand schief -,
# dann ein Raster von 79 Bildpunkten darueber gelegt und Feld fuer Feld
# abgetastet. Dabei kam heraus, dass zwei Sachen vorher falsch waren:
# die Parierstange war zu schmal und der Griff zu breit.
#
# Genauer als so geht es nicht: Die Vorlage ist eine 3D-Ansicht, und die
# Pixel sind unten groesser als oben. Das Raster passt in der Mitte und
# franst an den Enden aus.
KLINGE = [
    "................",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "......wddd......",
    "......wddd......",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "......wssd......",
    "....dssssssd....",
    "....dssddssd....",
    ".......ml.......",
    ".......lm.......",
    ".......ml.......",
    ".......lm.......",
    ".......ml.......",
    ".......lm.......",
    ".......ml.......",
    "................",
    "...wsw..........",
    "...sds..........",
    "...wsw..........",
]
WINKEL = ["................"] * len(KLINGE)
# Halber Versatz je Zeile. Der Griff sitzt um einen halben Pixel weiter
# links, damit er mittig unter der Parierstange haengt - in der Vorlage
# liegen die Reihen nicht stur uebereinander.
# Halber Versatz je Zeile: Damit laesst sich ein Teil mittig bekommen,
# dessen Breite ungerade ist - zwei Pixel liegen mittig, drei nicht.
# Hier braucht ihn gerade keine Zeile.
VERSATZ = [0.0] * len(KLINGE)
MITTE = 8.0
MUSTER = 3

KIPP = 25.0
ARM_LANG = 3.0
sichtbar = len(KLINGE) - MUSTER
y_parier = sichtbar - 1 - 19
ansatz = 12 - MITTE        # aeussere Kante der Parierstange (Spalte 4..11)
bogen = math.radians(KIPP)
ende_x = ansatz + ARM_LANG * math.cos(bogen)
ende_y = y_parier + 0.25 + ARM_LANG * math.sin(bogen)

# Ueberlappen statt anstossen: Ein gedrehter Arm laesst an seinem Fuss
# einen Keil offen, weil er sich um eine Ecke dreht. Deshalb beginnt er
# ein Stueck INNERHALB der Parierstange und das Endstueck greift ein
# Stueck ueber den Arm.
UEBERLAPP = 0.6
ANBAUTEN = []
for seite in (1, -1):
    fuss = ansatz * seite
    lang = ARM_LANG + UEBERLAPP
    ANBAUTEN.append({
        "name": "parier_arm",
        "origin": [fuss - UEBERLAPP if seite > 0 else fuss - ARM_LANG,
                   y_parier + 0.25, -0.5],
        "size": [lang, 1.5, 1],
        "farbe": "d",
        "drehung": [0, 0, KIPP * seite],
        "drehpunkt": [fuss, y_parier + 0.25, 0],
    })
    ANBAUTEN.append({
        "name": "parier_ende",
        "origin": [ende_x * seite - (0.9 if seite > 0 else 1.3),
                   ende_y - 0.55, -0.5],
        "size": [2.2, 1.7, 1],
        "farbe": "w",
    })

# Die Spitze: je ein schraeger Kasten von den Klingenkanten zur Mitte.
y_klinge = sichtbar - 1 - 1
halbe_klinge = 2.0
schraeg = halbe_klinge * math.sqrt(2)
for seite in (1, -1):
    ANBAUTEN.append({
        "name": "spitze",
        "origin": [-halbe_klinge if seite > 0 else halbe_klinge - schraeg,
                   y_klinge + 1, -0.5],
        "size": [schraeg, 1, 1],
        "farbe": "w" if seite > 0 else "d",
        "drehung": [0, 0, 45 * seite],
        "drehpunkt": [-halbe_klinge * seite, y_klinge + 1, 0],
    })

ANBAUTEN.append({
    "name": "knauf",
    "origin": [-1.0, -0.4, -0.5],
    "size": [2, 2, 1],
    "farbe": "d",
    "bild": [3, len(KLINGE) - MUSTER, 3, 3],
    "drehung": [0, 0, 45],
    "drehpunkt": [0, 0.6, 0],
})


if __name__ == "__main__":
    ziel = Path(sys.argv[1]) if len(sys.argv) > 1 else Path(".")
    baue("eisenklinge", "fynn:eisenklinge", EISENKLINGE,
         ziel_modell=ziel / "eisenklinge.geo.json",
         ziel_textur=ziel / "eisenklinge.png")
