#!/usr/bin/env python3
"""Das Inventarbild des Ritterschwerts in 32 mal 32.

Sechzehn Pixel waren Fynn zu wenig: "Die Inventaransicht ist leider
nicht so tough." Bei sechzehn geht die Haelfte jeder Linie fuer die
schwarze Kontur drauf, und von der Klinge bleibt eine gepunktete Treppe.
Bei zweiunddreissig ist Platz fuer vier Stufen quer ueber die Klinge, fuer
die Wicklung am Griff und fuer die beiden Steine. Minecraft nimmt
Inventarbilder in jeder Quadratgroesse - die Elektrumklinge liegt seit
laengerem in 48 mal 48 im Paket.

Von Hand diagonal zu pixeln ist beim Degen siebenmal schiefgegangen,
darum wird hier gerechnet: Das Schwert hat eine Laengsachse vom Knauf zur
Spitze, und jeder Bildpunkt wird auf diese Achse projiziert. Wie weit er
vom Knauf entfernt liegt, sagt, welches Bauteil ihn traegt; wie weit er
seitlich absteht, welchen Ton.

Die Senkrechte zu (a, b) ist (-b, a). Genau das war beim Degen der
Fehler: mit (b, -a) faellt die Querachse mit der Laengsachse zusammen,
und es kommt ein Strich heraus statt eines Schwerts.
"""
from PIL import Image
import math

# Die Kantenlaenge des Bildes. Alle Maasse darunter stehen in Anteilen
# davon, damit sich die Aufloesung an einer Stelle aendern laesst: Beim
# Sprung von 32 auf 20 war jede Zahl von Hand umzurechnen, und dabei
# geht eine unter.
N = 20
RAND = 0.14          # was zwischen Schwert und Bildrand frei bleibt

KNAUF = (N*RAND, N*(1-RAND))        # unten links
SPITZE = (N*(1-RAND), N*RAND)       # oben rechts

dx, dy = SPITZE[0]-KNAUF[0], SPITZE[1]-KNAUF[1]
LAENGE = math.hypot(dx, dy)
u = (dx/LAENGE, dy/LAENGE)          # entlang der Klinge
v = (-u[1], u[0])                   # senkrecht dazu

# Die Quermasse: ebenfalls in Anteilen der Bildkante, damit sie den
# Sprung mitmachen.
KLINGE_QUER = 0.066 * N
PARIER_QUER = 0.234 * N
GRIFF_QUER  = 0.039 * N

# Die Toene stammen aus Fynns Entwurf; die Klinge bekommt eine Stufe mehr
# als im 16er-Bild, weil bei doppelter Aufloesung Platz dafuer ist.
KONTUR = (24, 25, 29, 255)
GRAT   = (233, 235, 238, 255)
HELL   = (205, 209, 215, 255)
MITTE  = (172, 176, 183, 255)
SCHATT = (131, 136, 146, 255)
TIEF   = (96, 100, 110, 255)
BESCHL_HELL = (198, 202, 208, 255)
BESCHL_MITT = (152, 157, 165, 255)
BESCHL_TIEF = (104, 108, 117, 255)
LEDER_HELL = (124, 86, 78, 255)
LEDER_DUNK = (78, 50, 48, 255)
STEIN_HELL = (198, 66, 76, 255)
STEIN      = (150, 38, 50, 255)
STEIN_TIEF = (96, 24, 34, 255)

# Die Abschnitte entlang der Achse, in Anteilen der Gesamtlaenge.
#
# Es ist ein Langschwert: lange Klinge, langer Griff fuer zwei Haende,
# schmale Parierstange. Der erste Versuch gab dem Griffbereich vierzig
# Prozent und der Klinge eine Breite von fast sechs Pixeln - daraus wurde
# ein gedrungenes Breitschwert. Fynn: "Die Klinge soll ein duenneres
# Design haben, es soll so ein Ritter-Langschwert werden." Jetzt traegt
# die Klinge einundsiebzig Prozent der Laenge.
KNAUF_BIS   = 0.05
GRIFF_BIS   = 0.31
PARIER_BIS  = 0.355


def ton(l, q):
    """Der Ton an der Stelle (Laenge l, Querabstand q) - oder None."""
    a = l / LAENGE
    if a < 0 or a > 1.0:
        return None

    if a < KNAUF_BIS:                                   # Knauf
        if abs(q) > 0.081*N: return None
        if abs(l - LAENGE*0.045) < 0.028*N and abs(q) < 0.056*N:
            return STEIN                                # der zweite Stein
        return BESCHL_HELL if q < -0.025*N else (BESCHL_MITT if q < 0.031*N else BESCHL_TIEF)

    if a < GRIFF_BIS:                                   # Wicklung
        # Der Griff war zuerst dicker als die Klinge und kaum laenger als
        # die Parierstange breit ist - Fynn: "der Griff ist zu dick und zu
        # klein". Jetzt ist er schmaler als die Klinge und reicht ein
        # Stueck unter die Parierstange, wie es ein Griff fuer zwei Haende
        # tut. Der Platz dafuer geht von der Klinge ab: sie traegt
        # fuenfundsechzig statt einundsiebzig Prozent der Laenge.
        if abs(q) > GRIFF_QUER: return None
        # Die Baender laufen quer ueber den Griff: jedes zweite dunkel.
        return LEDER_DUNK if int(l) % 2 else LEDER_HELL

    if a < PARIER_BIS:                                  # Parierstange
        breite = PARIER_QUER   # breit, damit das schlanke Schwert Halt bekommt
        if abs(q) > breite: return None
        # Der Stein sitzt rund um den Kreuzungspunkt statt in einem
        # Streifen quer darueber - als Streifen franste er die
        # Parierstange aus, statt darin zu sitzen.
        mitte = LAENGE * (GRIFF_BIS + PARIER_BIS) / 2
        if (l - mitte)**2 + q*q < (0.051*N)**2:
            if l < mitte and q < 0: return STEIN_HELL
            return STEIN if (l-mitte)**2 + q*q < (0.034*N)**2 else STEIN_TIEF
        if abs(q) > breite - 0.034*N:
            return BESCHL_TIEF                          # die Enden setzen ab
        return BESCHL_HELL if q < -0.019*N else (BESCHL_MITT if q < 0.037*N else BESCHL_TIEF)

    # Klinge: zur Spitze hin schmaler, quer in vier Stufen
    rest = (a - PARIER_BIS) / (1.0 - PARIER_BIS)
    # Die Spitze laeuft ueber das letzte Fuenftel zusammen. Kuerzer
    # gerechnet bricht die Klinge stumpf ab, statt spitz zu werden.
    breite = KLINGE_QUER - (KLINGE_QUER-0.011*N) * max(0.0, rest - 0.80) / 0.20
    if abs(q) > breite:
        return None
    # Bei knapp drei Pixeln Breite bleibt fuer den Verlauf wenig Platz:
    # ein heller Grat auf der Lichtseite, die Mitte, eine dunkle
    # Schattenkante. Vier Stufen wie beim breiten Entwurf wuerden hier zu
    # je einem halben Pixel und waeren im Spiel nicht mehr zu sehen.
    if q < -breite + 0.023*N: return GRAT
    if q < -0.002*N:       return HELL
    if q < 0.023*N:        return MITTE
    if q < breite-0.016*N: return SCHATT
    return TIEF


def bild():
    b = Image.new("RGBA", (N, N), (0, 0, 0, 0))
    px = b.load()
    for y in range(N):
        for x in range(N):
            d = (x + 0.5 - KNAUF[0], y + 0.5 - KNAUF[1])
            l = d[0]*u[0] + d[1]*u[1]
            q = d[0]*v[0] + d[1]*v[1]
            t = ton(l, q)
            if t: px[x, y] = t
    # Die Kontur zum Schluss, als eine Schicht um alles Gemalte. Sie
    # stueckweise nachzuziehen hat beim 16er-Bild ein Loch und doppelte
    # Raender hinterlassen.
    koerper = {(x, y) for y in range(N) for x in range(N) if px[x, y][3]}
    # Nur die vier geraden Nachbarn, nicht die Ecken. Ueber Eck gezogen
    # setzt die Kontur an jeder Stufe der Diagonale zwei Pixel statt
    # einem, und bei zwanzig Pixeln Kantenlaenge frisst das die Klinge
    # auf: von vier Pixeln quer waeren zwei schwarz. Die Luecken an den
    # Ecken sind kein Fehler - so sieht jedes Vanilla-Schwert aus.
    for y in range(N):
        for x in range(N):
            if (x, y) in koerper: continue
            if any((x+ax, y+ay) in koerper for ax, ay in ((-1,0),(1,0),(0,-1),(0,1))):
                px[x, y] = KONTUR
    return b


def main():
    from pathlib import Path
    ziel = (Path(__file__).resolve().parent.parent / "ressourcenpaket"
            / "textures" / "items" / "ritterschwert.png")
    b = bild()
    b.save(ziel)
    gemalt = sum(1 for p in b.get_flattened_data() if p[3])
    print(f"gemalt: {ziel.name} ({N}x{N}, {gemalt} Pixel)")


if __name__ == "__main__":
    main()
