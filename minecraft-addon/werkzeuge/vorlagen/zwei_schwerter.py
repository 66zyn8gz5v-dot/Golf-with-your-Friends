"""Fynns zwei Schwerter aus dem 3D-Bild, flach gezeichnet.

Beide haben dieselbe Form - Klinge, Parierstange, Griff und Knauf sind
Pixel fuer Pixel gleich; nur die Farben unterscheiden sie. Deshalb steht
die Form hier einmal mit Rollenziffern, und die Farben kommen je Schwert
dazu.

Die Klinge hat einen Mittelgrat statt eines Lichtverlaufs: fuenf Streifen,
von aussen nach innen Fase, Flaeche, Grat - das ist es, was diese beiden
von der Silberklinge unterscheidet, und es faellt weg, sobald man nur von
hell nach dunkel abstuft.

Symmetrie wird nicht getippt, sondern gespiegelt: Die linke Haelfte steht
da, die rechte entsteht daraus. Von Hand getippt waere jede Zeile eine
Gelegenheit, die Mitte um ein Pixel zu verfehlen - und ein Schwert, das
nicht auf seiner Achse steht, haengt im Spiel schief in der Hand.
"""

# Rollen: 1 Fase aussen, 2 Klingenflaeche, 3 Mittelgrat,
#         5 Beschlag, 7 Einlage, 8 Stein,
#         9 Wicklung hell, 0 Wicklung dunkel
LINKS = (
    # --- Klinge: Spitze, dann 39 gleiche Zeilen ----------------------
    [".........3",
     "........23",
     ".......123",
     ".......123"]
    + [".......123"] * 39
    # --- Parierstange -------------------------------------------------
    # Die Enden stehen eine Stufe hoeher als der Balken und zeigen zur
    # Klinge - daran erkennt man diese beiden Schwerter von weitem.
    + ["..555..123",
       "..55555555",
       "..57755555",
       "..57755557",
       "..55555555",
       "....555555"]
    # --- Griff: Querringe, keine Karos ---------------------------------
    + ["........99",
       "........00",
       "........99",
       "........00",
       "........99",
       "........00",
       "........99",
       "........00",
       "........99",
       "........00",
       "........99"]
    # --- Knauf: ein flacher Querblock, nicht ein zweites Kreuz ---------
    + ["......5555",
       ".....55577",
       "......5555"]
)


def ganze_zeile(halb):
    """Linke Haelfte plus ihr Spiegelbild - zusammen zwanzig Pixel."""
    return halb + halb[::-1]


FORM = [ganze_zeile(z) for z in LINKS]

# Beim Schwert mit dem Stein wird die mittlere Einlage rot. Die Stelle
# steht hier statt in der Form, damit die Form fuer beide gleich bleibt.
STEIN_ZEILE = 46
