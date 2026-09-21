#!/usr/bin/env python3
"""Zeichnet ein Bedrock-Modell schraeg von der Seite.

Warum das noetig ist: Ein Modell ist eine Liste von Zahlen. Ob daraus ein
Tier wird oder ein Haufen Kaesten, sieht man daran nicht - und im Spiel
nachschauen kann hier niemand. Diese Ansicht ist fuer Modelle das, was die
Vorschaubilder fuer die Texturen sind.

Kein Ersatz fuer das Spiel: Es fehlen Beleuchtung, Schatten und Animation,
und die Knochen stehen in ihrer Ruhehaltung. Fuer die Frage "sitzen die
Kaesten richtig und liegt die Textur auf der richtigen Flaeche" reicht es.
"""

import json
import math
import sys
from pathlib import Path

from PIL import Image, ImageDraw


# ---------------------------------------------------------------- Rechnen

def kreuz(a, b):
    return (a[1] * b[2] - a[2] * b[1],
            a[2] * b[0] - a[0] * b[2],
            a[0] * b[1] - a[1] * b[0])


def punkt_mal(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def normiert(v):
    laenge = math.sqrt(punkt_mal(v, v)) or 1.0
    return (v[0] / laenge, v[1] / laenge, v[2] / laenge)


def drehe(punkt, pivot, winkel):
    """Dreht um den Drehpunkt, in Bedrocks Reihenfolge und Vorzeichen.

    Bedrock dreht im Uhrzeigersinn, wenn man entlang der Achse blickt -
    deshalb stehen hier die Minuszeichen. Ohne sie kippen gedrehte Teile
    (Fluegel, angewinkelte Arme) auf die falsche Seite.
    """
    x = punkt[0] - pivot[0]
    y = punkt[1] - pivot[1]
    z = punkt[2] - pivot[2]

    rx, ry, rz = (math.radians(-w) for w in winkel)

    y, z = y * math.cos(rx) - z * math.sin(rx), y * math.sin(rx) + z * math.cos(rx)
    x, z = x * math.cos(ry) + z * math.sin(ry), -x * math.sin(ry) + z * math.cos(ry)
    x, y = x * math.cos(rz) - y * math.sin(rz), x * math.sin(rz) + y * math.cos(rz)

    return (x + pivot[0], y + pivot[1], z + pivot[2])


# ------------------------------------------------------- Kasten aufklappen

def flaechen_des_kastens(ursprung, groesse, aufblasen=0.0):
    """Die sechs Seiten mit ihren Ecken - in der Reihenfolge, in der die
    Textur sie liest: erst die Ecke oben links des Texturfeldes, dann nach
    rechts, dann nach rechts unten, dann nach links unten.

    Warum diese Reihenfolge wichtig ist: Bedrock klappt den Kasten als Band
    um die Hochachse auf (west, north, east, south). Nur wenn die Ecken hier
    in derselben Richtung stehen, landet die Textur nicht seitenverkehrt.
    """
    x0 = ursprung[0] - aufblasen
    y0 = ursprung[1] - aufblasen
    z0 = ursprung[2] - aufblasen
    x1 = ursprung[0] + groesse[0] + aufblasen
    y1 = ursprung[1] + groesse[1] + aufblasen
    z1 = ursprung[2] + groesse[2] + aufblasen

    # Die Aussenrichtung steht hier ausdruecklich dabei, statt sie aus der
    # Umlaufrichtung der Ecken zu erschliessen: Deckel und Boden laufen anders
    # herum als die vier Seiten, und geraten hatte das den Wuerfel von oben
    # durchsichtig gemacht.
    return {
        "north": ([(x0, y1, z0), (x1, y1, z0), (x1, y0, z0), (x0, y0, z0)], (0, 0, -1)),
        "east":  ([(x1, y1, z0), (x1, y1, z1), (x1, y0, z1), (x1, y0, z0)], (1, 0, 0)),
        "south": ([(x1, y1, z1), (x0, y1, z1), (x0, y0, z1), (x1, y0, z1)], (0, 0, 1)),
        "west":  ([(x0, y1, z1), (x0, y1, z0), (x0, y0, z0), (x0, y0, z1)], (-1, 0, 0)),
        "up":    ([(x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)], (0, 1, 0)),
        "down":  ([(x0, y0, z1), (x1, y0, z1), (x1, y0, z0), (x0, y0, z0)], (0, -1, 0)),
    }


def uv_feld(uv, groesse, flaeche):
    """Ecke und Groesse des Texturfeldes einer Seite im Bedrock-Kreuz.

    Die Reihenfolge oben ist up, dann down - nachgesehen in Mojangs eigenem
    steve.png: beim Kopf (uv 0,0, Kante 8) liegt bei x=8 das Haar und bei
    x=16 der Hals. Geraten hatte ich es andersherum, und dann stand die
    Schildkroete auf dem Bauch.
    """
    u, v = uv
    w, h, d = groesse
    return {
        "up":    (u + d,         v,     w, d),
        "down":  (u + d + w,     v,     w, d),
        "west":  (u,             v + d, d, h),
        "north": (u + d,         v + d, w, h),
        "east":  (u + d + w,     v + d, d, h),
        "south": (u + d + w + d, v + d, w, h),
    }[flaeche]


# ----------------------------------------------------- Knochen einsammeln

def sammle_flaechen(teil):
    """Laeuft die Knochen durch, setzt jeden Kasten an seinen Platz und gibt
    die einzelnen Seiten mit ihren Ecken im Raum zurueck."""
    knochen = {k["name"]: k for k in teil.get("bones", [])}

    def drehungen(name, gesehen=()):
        """Alle Drehungen dieses Knochens und seiner Eltern, von aussen nach
        innen. Ein Arm dreht sich mit der Schulter mit, deshalb zaehlt die
        ganze Kette."""
        if name not in knochen or name in gesehen:
            return []
        k = knochen[name]
        eigen = []
        if k.get("rotation"):
            eigen = [(k.get("pivot", [0, 0, 0]), k["rotation"])]
        eltern = drehungen(k["parent"], gesehen + (name,)) if k.get("parent") else []
        return eltern + eigen

    ergebnis = []
    for name, k in knochen.items():
        kette = drehungen(name)
        for kasten in k.get("cubes", []):
            uv = kasten.get("uv", [0, 0])

            if isinstance(uv, list):
                def feld_fuer(flaeche, _uv=uv, _groesse=kasten["size"]):
                    return uv_feld(_uv, _groesse, flaeche)
            else:
                # Flaechenweises UV: Jede Seite nennt ihren eigenen
                # Bildausschnitt. So arbeiten die Modelle, die aus einer
                # Zeichenkarte entstehen - dort ist die Textur das gemalte
                # Bild selbst, nicht ein gepacktes Kreuz.
                def feld_fuer(flaeche, _uv=uv):
                    eintrag = _uv.get(flaeche)
                    if not eintrag:
                        return None
                    u, v = eintrag["uv"]
                    w, h = eintrag.get("uv_size", [1, 1])
                    # Ein negatives Mass spiegelt die Flaeche. Fuers Ansehen
                    # genuegt der Betrag: Gespiegelt oder nicht faellt bei
                    # einem einfarbigen Ausschnitt nicht auf, und die
                    # Rueckseite sieht man ohnehin selten.
                    if w < 0:
                        u, w = u + w, -w
                    if h < 0:
                        v, h = v + h, -h
                    return (u, v, w, h)

            seiten = flaechen_des_kastens(
                kasten["origin"], kasten["size"], kasten.get("inflate", 0) or 0)

            eigene_drehung = kasten.get("rotation")
            eigener_pivot = kasten.get("pivot", [0, 0, 0])

            for flaeche, (ecken, aussen) in seiten.items():
                feld = feld_fuer(flaeche)
                if feld is None:
                    continue
                mitte = tuple(sum(p[i] for p in ecken) / 4 for i in range(3))
                # Die Normale wandert als zweiter Punkt mit durch alle
                # Drehungen - dann stimmt sie auch bei gekippten Teilen.
                gedreht = list(ecken) + [mitte, tuple(mitte[i] + aussen[i] for i in range(3))]
                if eigene_drehung:
                    gedreht = [drehe(p, eigener_pivot, eigene_drehung) for p in gedreht]
                for pivot, winkel in reversed(kette):
                    gedreht = [drehe(p, pivot, winkel) for p in gedreht]
                m, a = gedreht[4], gedreht[5]
                ergebnis.append({
                    "knochen": name,
                    "ecken": gedreht[:4],
                    "mitte": m,
                    "normale": normiert(tuple(a[i] - m[i] for i in range(3))),
                    "feld": feld,
                    "seite": flaeche,
                })
    return ergebnis


# ------------------------------------------------------------- Zeichnen

def blickrichtung(gier, neigung):
    """Richtung vom Modell zur Kamera. Gier 0 heisst: die Kamera steht vorne,
    also dort, wohin der Mob schaut (Bedrock: das ist -z)."""
    g = math.radians(gier)
    n = math.radians(neigung)
    return normiert((math.sin(g) * math.cos(n), math.sin(n), -math.cos(g) * math.cos(n)))


def eine_ansicht(flaechen, textur, breite, hoehe, gier, neigung, hintergrund):
    richtung = blickrichtung(gier, neigung)
    rechts = normiert(kreuz(richtung, (0, 1, 0)))
    hoch = kreuz(rechts, richtung)

    def flach(p):
        return (punkt_mal(p, rechts), -punkt_mal(p, hoch))

    # Nur Seiten, die der Kamera zugewandt sind. Rueckseiten wuerden sonst
    # ueber das Gesicht gemalt.
    sichtbar = []
    for f in flaechen:
        if punkt_mal(f["normale"], richtung) <= 0:
            continue
        sichtbar.append((punkt_mal(f["mitte"], richtung), f["normale"], f))

    if not sichtbar:
        return Image.new("RGBA", (breite, hoehe), hintergrund)

    # Massstab und Verschiebung so, dass das Modell das Bild ausfuellt -
    # sonst haengt der Kopf halb ausserhalb, wie beim ersten Versuch.
    alle = [flach(p) for _, _, f in sichtbar for p in f["ecken"]]
    links = min(p[0] for p in alle)
    oben = min(p[1] for p in alle)
    zoom = min((breite - 60) / max(max(p[0] for p in alle) - links, 0.001),
               (hoehe - 60) / max(max(p[1] for p in alle) - oben, 0.001))
    dx = 30 - links * zoom
    dy = 30 - oben * zoom

    bild = Image.new("RGBA", (breite, hoehe), hintergrund)
    mal = ImageDraw.Draw(bild)

    # Von hinten nach vorne malen.
    for _, normale, f in sorted(sichtbar, key=lambda t: t[0]):
        fu, fv, fw, fh = (int(round(w)) for w in f["feld"])
        if fw <= 0 or fh <= 0:
            continue
        p0, p1, p2, p3 = f["ecken"]

        # Streifendes Licht von schraeg oben, damit die Kanten sichtbar
        # bleiben und der Wuerfel nicht zum Fleck verschwimmt.
        licht = 0.55 + 0.45 * max(0.0, punkt_mal(normale, normiert((0.4, 1.0, -0.5))))

        for zeile in range(fh):
            for spalte in range(fw):
                tx = min(max(fu + spalte, 0), textur.width - 1)
                ty = min(max(fv + zeile, 0), textur.height - 1)
                farbe = textur.getpixel((tx, ty))
                if farbe[3] == 0:
                    continue

                a0, a1 = spalte / fw, (spalte + 1) / fw
                b0, b1 = zeile / fh, (zeile + 1) / fh

                def raumpunkt(sa, sb):
                    o = [p0[i] + (p1[i] - p0[i]) * sa for i in range(3)]
                    u = [p3[i] + (p2[i] - p3[i]) * sa for i in range(3)]
                    return flach([o[i] + (u[i] - o[i]) * sb for i in range(3)])

                viereck = [raumpunkt(a0, b0), raumpunkt(a1, b0),
                           raumpunkt(a1, b1), raumpunkt(a0, b1)]
                viereck = [(p[0] * zoom + dx, p[1] * zoom + dy) for p in viereck]

                # Alpha 254 heisst in Bedrock "dieses Pixel leuchtet". Damit
                # man das hier auch sieht, bleibt es hell statt abzudunkeln.
                hell = 1.0 if farbe[3] == 254 else licht
                ton = tuple(min(255, int(farbe[k] * hell)) for k in range(3)) + (255,)
                mal.polygon(viereck, fill=ton)

    return bild


def lade_geometrie(modelldatei):
    """Liest beide Schreibweisen: die heutige mit "minecraft:geometry" und die
    alte, in der Mojangs eigene Modelle noch vorliegen ("geometry.turtle" als
    Schluessel). Die alten sind unsere Vorlagen - deshalb muss das hier gehen."""
    modell = json.loads(Path(modelldatei).read_text(encoding="utf-8"))
    if "minecraft:geometry" in modell:
        return modell["minecraft:geometry"][0]
    for schluessel, inhalt in modell.items():
        if schluessel.startswith("geometry.") and isinstance(inhalt, dict):
            return inhalt
    raise SystemExit(f"keine Geometrie in {modelldatei}")


def zeichne(modelldatei, texturdatei, zieldatei, ansichten=None, breite=420, hoehe=460):
    teil = lade_geometrie(modelldatei)
    textur = Image.open(texturdatei).convert("RGBA")
    flaechen = sammle_flaechen(teil)

    if ansichten is None:
        ansichten = [("von vorne", 25, 18), ("von hinten", 205, 18), ("von oben", 25, 60)]

    hintergrund = (240, 240, 244, 255)
    gesamt = Image.new("RGBA", (breite * len(ansichten), hoehe), hintergrund)
    mal = ImageDraw.Draw(gesamt)
    for i, (beschriftung, gier, neigung) in enumerate(ansichten):
        gesamt.paste(eine_ansicht(flaechen, textur, breite, hoehe, gier, neigung,
                                  hintergrund), (breite * i, 0))
        mal.text((breite * i + 16, hoehe - 26), beschriftung, fill=(90, 90, 100, 255))

    gesamt.save(zieldatei)
    print(f"gezeichnet: {zieldatei}")


if __name__ == "__main__":
    if len(sys.argv) < 4:
        print("Aufruf: modell_ansehen.py <modell.geo.json> <textur.png> <ziel.png>")
        raise SystemExit(1)
    zeichne(sys.argv[1], sys.argv[2], sys.argv[3])
