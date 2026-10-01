#!/usr/bin/env python3
"""Rechnet Bewegungen in Bedrocks Knochenwinkel um.

Ein Hieb ist leicht zu beschreiben: "Der Arm dreht sich um die Schulter,
von rechts oben nach links unten, die Klinge kippt dabei nach vorn."
Bedrock will dafuer aber drei Winkel je Knochen, die nacheinander um x, y
und z drehen - und zwei Drehungen hintereinander sind nicht die Summe ihrer
Winkel. Wer die Zahlen von Hand anpasst, dreht an einer Achse und die
Klinge kippt ploetzlich in eine ganz andere Richtung.

Hier wird deshalb mit Drehmatrizen gerechnet: Die Grundhaltung eines
Knochens mal eine Zusatzdrehung um einen frei gewaehlten Punkt - und am
Ende wird das Ergebnis wieder in Bedrocks drei Winkel und eine
Verschiebung zerlegt. Die Zerlegung ist das Gegenstueck zu
spieler_ansehen.drehmatrix und wird unten gegen sie geprueft.
"""

import math

from spieler_ansehen import drehmatrix, mal, verschiebung


def dreh_um(achse, winkel):
    """Gewoehnliche Drehung um eine Achse der Modelldatei (Rechte-Hand-Regel)."""
    x, y, z = achse
    laenge = math.sqrt(x * x + y * y + z * z)
    x, y, z = x / laenge, y / laenge, z / laenge
    c, s = math.cos(math.radians(winkel)), math.sin(math.radians(winkel))
    t = 1 - c
    return [[t * x * x + c, t * x * y - s * z, t * x * z + s * y, 0],
            [t * x * y + s * z, t * y * y + c, t * y * z - s * x, 0],
            [t * x * z - s * y, t * y * z + s * x, t * z * z + c, 0],
            [0, 0, 0, 1]]


def zerlege(m):
    """Drehmatrix -> Bedrock-Winkel (rx, ry, rz), passend zu drehmatrix()."""
    # drehmatrix = Rz(-rz) Ry(ry) Rx(-rx), also gewoehnlich ZYX mit
    # A = -rx, B = ry, C = -rz.
    b = math.asin(max(-1.0, min(1.0, -m[2][0])))
    if abs(math.cos(b)) > 1e-6:
        a = math.atan2(m[2][1], m[2][2])
        c = math.atan2(m[1][0], m[0][0])
    else:
        a = math.atan2(-m[1][2], m[1][1])
        c = 0.0
    return (-math.degrees(a), math.degrees(b), -math.degrees(c))


def knochen(pivot, rot, pos=(0, 0, 0)):
    """Die Matrix eines Knochens relativ zu seinem Elternteil."""
    p = pivot
    return mal(verschiebung(*[pos[i] + p[i] for i in range(3)]),
               mal(drehmatrix(*rot), verschiebung(-p[0], -p[1], -p[2])))


def bewege(pivot, rot, pos, drehung, um, schub=(0, 0, 0)):
    """Grundhaltung eines Knochens, dazu eine Drehung um den Punkt `um`
    (im Raum des Elternknochens) und eine Verschiebung.

    drehung: Matrix aus dreh_um (oder mehrere, schon multipliziert)
    Ergebnis: (rot, pos) in Bedrocks Schreibweise.
    """
    neu = mal(verschiebung(*[um[i] + schub[i] for i in range(3)]),
              mal(drehung, mal(verschiebung(-um[0], -um[1], -um[2]), knochen(pivot, rot, pos))))
    winkel = zerlege(neu)
    # Die Verschiebung: Wo landet der Drehpunkt? Dort minus Drehpunkt.
    ort = [neu[i][3] + sum(neu[i][k] * pivot[k] for k in range(3)) for i in range(3)]
    return winkel, tuple(ort[i] - pivot[i] for i in range(3))


def stetig(folge):
    """Winkelreihen ohne Spruenge um 360 Grad - sonst dreht die
    Zwischenrechnung zwischen zwei Schluesselbildern einmal ganz herum."""
    aus = [list(folge[0])]
    for w in folge[1:]:
        w = list(w)
        for i in range(3):
            while w[i] - aus[-1][i] > 180:
                w[i] -= 360
            while w[i] - aus[-1][i] < -180:
                w[i] += 360
        aus.append(w)
    return aus


if __name__ == "__main__":
    import random
    random.seed(4)
    for _ in range(200):
        w = [random.uniform(-170, 170), random.uniform(-80, 80), random.uniform(-170, 170)]
        m = drehmatrix(*w)
        z = zerlege(m)
        m2 = drehmatrix(*z)
        assert all(abs(m[i][j] - m2[i][j]) < 1e-9 for i in range(3) for j in range(3)), (w, z)
    (r, p) = bewege((-5, 22, 0), (95, -45, 115), (13.5, -10, 12), dreh_um((0, 0, 1), 0), (0, 0, 0))
    assert max(abs(r[i] - (95, -45, 115)[i]) for i in range(3)) < 1e-6
    assert max(abs(p[i] - (13.5, -10, 12)[i]) for i in range(3)) < 1e-6
    print("haltung: Zerlegung und Grundhaltung stimmen")
