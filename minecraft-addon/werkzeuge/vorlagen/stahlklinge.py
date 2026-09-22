"""Fynns Stahlschwert, abgetastet aus seinem flachen Pixelbild.

Gedacht als Ersatz fuer das Eisenschwert. Zwei Sachen waren beim Abtasten
zu beachten: Der Hintergrund war gemalt statt durchsichtig, und das Bild
hatte beim Verschicken an Genauigkeit verloren - aus vier Griffarben waren
fuenfundzwanzig geworden.

Danach aufgeraeumt. Das Abgetastete trug noch alles mit, was beim Malen
von Hand entsteht: einzelne Pixel, die aus der Reihe fielen, eine Klinge,
die zwischendurch heller wurde und wieder dunkler, eine Parierstange ohne
zwei gleiche Haelften. Im Kleinen sieht das nach Handschrift aus, im Spiel
nach Schmutz - ein Gegenstand ist dort zwei Zentimeter gross, und was
nicht in einer klaren Linie liegt, liest sich als Dreck auf der Klinge.

Drei Regeln haben aufgeraeumt:

* Jede Zeile ist spiegelgleich. Ein Schwert hat zwei gleiche Haelften.
* Die Klinge wird zum Griff hin Stufe um Stufe dunkler und nie wieder
  heller. Vorher sprang sie hell-dunkel-hell-dunkel.
* Jeder Teil traegt so wenige Farben wie moeglich: die Klinge vier, die
  Wicklung zwei Baender, der Knauf drei Stufen.
"""

FARBEN = {'a': (163, 167, 173, 255), 'b': (237, 238, 240, 255), 'c': (192, 195, 199, 255), 'd': (131, 136, 144, 255), 'e': (214, 216, 219, 255), 'f': (102, 107, 115, 255), 'g': (85, 90, 97, 255), 'i': (122, 128, 136, 255), 'k': (164, 106, 81, 255), 'm': (147, 97, 76, 255), 'n': (117, 82, 68, 255), '.': (0, 0, 0, 0)}

KARTE = [
    # Spitze
    ".........bb.........",
    "........bbbb........",
    ".......bbbbbb.......",
    # Klinge, oberstes Viertel: Schneide fast weiss, Kern hell
    "......bbbccbbb......",
    "......bbccccbb......",
    "......bbccccbb......",
    "......bbccccbb......",
    "......bbccccbb......",
    "......bbccccbb......",
    # zweites Viertel: Kern eine Stufe dunkler
    "......bbaaaabb......",
    "......bbaaaabb......",
    "......bbaaaabb......",
    "......bbaaaabb......",
    "......bbaaaabb......",
    "......bbaaaabb......",
    "......bbaaaabb......",
    # drittes Viertel: Schneide nimmt zurueck, Kern noch dunkler
    "......eeddddee......",
    "......eeddddee......",
    "......eeddddee......",
    "......eeddddee......",
    "......eeddddee......",
    "......eeddddee......",
    "......eeddddee......",
    "......eeddddee......",
    "......eeddddee......",
    "......eeddddee......",
    "......eeddddee......",
    "......eeddddee......",
    "......ccddddcc......",
    "......ccddddcc......",
    # unteres Viertel: am dunkelsten, dort liegt der Schatten der Hand
    "......ccffffcc......",
    "......ccffffcc......",
    "......ccffffcc......",
    "......ccffffcc......",
    "......ccffffcc......",
    "......ccffffcc......",
    "......aaffffaa......",
    "......aaffffaa......",
    "......aaffffaa......",
    "......aaffffaa......",
    # Parierstange: oben die hellere Kante, unten der Koerper
    ".ee...aaffffaa...ee.",
    "eecccccaiiiiacccccee",
    "ccaaaaaaiiiiaaaaaacc",
    "...aaggggggggggaa...",
    # Wicklung: dunkles Leder, alle vier Zeilen eine helle Naht.
    # Die unterste Zeile bleibt dunkel - sonst stiesse das Leder
    # direkt auf den hellen Knauf, und das sticht.
    "........nmmn........",
    "........nmmn........",
    "........mkkm........",
    "........nmmn........",
    "........nmmn........",
    "........nmmn........",
    "........mkkm........",
    "........nmmn........",
    "........nmmn........",
    "........nmmn........",
    "........mkkm........",
    "........nmmn........",
    "........nmmn........",
    # Knauf: eine Kugel von oben beleuchtet. Vorher waren die beiden
    # obersten Zeilen auf voller Breite hell - das las sich als
    # weisser Klotz unter dem Griff, nicht als Knauf.
    "........ibbi........",
    "........icci........",
    ".......iaaaai.......",
    "........iggi........",
    ".........gg.........",
]
MITTE = 10.0
