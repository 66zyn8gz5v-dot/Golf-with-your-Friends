#!/usr/bin/env python3
"""Ruhige Haut (4.88): Farbverlaeufe statt Punkte.

Fynn: "Ich mag dieses mit diesen Punkten nicht ... wie es Mojang auch
gemacht hat: nicht mit einzelnen Punkten, die da drauf geklatscht sind,
sondern ein Farbverlauf vom Bauch zum Ruecken ... richtig zusammenhaengende
Farben. Wer hat random Punkte auf seiner Haut?"

Bisher entstand Muster, indem jeder Bildpunkt fuer sich wuerfelte (streu),
ob er heller oder dunkler wird - das gibt Sprenkel und Schachbretter. Hier
entsteht Farbe aus dem Ort: Wie hoch liegt der Punkt am Koerper? Unten der
helle Bauch, an der Flanke hinauf in wenigen Stufen dunkler bis zum
Ruecken. Stufen statt stufenlos, damit es Pixelkunst bleibt: Jede Stufe ist
ein ganzes Band von Bildpunkten, und Nachbarn haben fast immer dieselbe
Farbe.

Muster, wo es welche gibt, sind Formen, keine Punkte: ein Aalstrich den
Ruecken entlang, Bauchschilde als Querlinien, Baender, Adern.
"""

from tiermodell import hexfarbe, mische


def farbe(c):
    if isinstance(c, str):
        return hexfarbe(c)
    return tuple(c[:3])


def kasten_von(texel):
    return texel[4] if len(texel) > 4 else None


def hoehe(p, n, texel):
    """0 an der Unterkante des Kastens, 1 an der Oberkante - der Deckel ist
    ganz Ruecken, der Boden ganz Bauch."""
    if n[1] > 0.5:
        return 1.0
    if n[1] < -0.5:
        return 0.0
    k = kasten_von(texel)
    if k is None or not k.groesse[1]:
        return 0.5
    return max(0.0, min(1.0, (p[1] - k.ursprung[1]) / k.groesse[1]))


def laenge(p, texel, achse=2):
    """0..1 entlang einer Achse des Kastens (vorn nach hinten: z)."""
    k = kasten_von(texel)
    if k is None or not k.groesse[achse]:
        return 0.5
    return max(0.0, min(1.0, (p[achse] - k.ursprung[achse]) / k.groesse[achse]))


def verlauf(farben, t, stufen=5):
    """Aus einer Farbreihe (unten -> oben) die Farbe bei t, in Stufen."""
    farben = [farbe(f) for f in farben]
    t = max(0.0, min(1.0, t))
    if stufen > 1:
        t = round(t * (stufen - 1)) / (stufen - 1)
    if len(farben) == 1:
        return farben[0]
    teil = t * (len(farben) - 1)
    i = min(int(teil), len(farben) - 2)
    return mische(farben[i], farben[i + 1], teil - i)


def koerper(p, n, texel, bauch, flanke, ruecken, grenze=0.3, stufen=4, schilde=0, aalstrich=None,
            strichbreite=1.0):
    """Die Haut eines Leibes: heller Bauch unten, dann ein Verlauf die Flanke
    hinauf bis zum Ruecken.

    schilde: alle so viele Pixel eine Querlinie ueber den Bauch (wie die
    Bauchschilde von Schlangen und Drachen) - eine Linie, keine Punkte.
    aalstrich: eine dunklere Farbe fuer einen Streifen die Rueckenmitte
    entlang."""
    x, y, z = p
    t = hoehe(p, n, texel)
    if n[1] > 0.5 and aalstrich is not None and abs(x) < strichbreite:
        return farbe(aalstrich)
    if t < grenze and n[1] <= 0.5:
        b = farbe(bauch)
        if schilde and int(z // 1) % schilde == 0:
            b = mische(b, farbe(flanke), 0.22)
        return b
    return verlauf([mische(farbe(bauch), farbe(flanke), 0.55), flanke, ruecken],
                   (t - grenze) / (1.0 - grenze), stufen)


def dunkler(c, wie=0.15):
    return mische(farbe(c), (0, 0, 0), wie)


def heller(c, wie=0.15):
    return mische(farbe(c), (255, 255, 255), wie)
