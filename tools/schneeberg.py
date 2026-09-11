# -*- coding: utf-8 -*-
"""Baut die zwoelf Bahnen des Schneebergs und schreibt src/courses_snow.js.

Die Welt ist ein Aufstieg: Bahn 1 steht am Fuss im Nadelwald, Bahn 12 auf dem Gipfel ueber den
Wolken. Das ist nicht nur Kulisse - jeder Abschnitt hat seine eigene Palette, und die Karten werden
nach oben hin schmaler und ausgesetzter. Wer die Bilder nebeneinanderlegt, sieht, wie weit er
gekommen ist.

Die Frage der Welt ist *wohin*: Der Wind versetzt jeden Schlag, und er ist ablesbar. Darum steht
auf fast jeder Bahn eine Windfahne, und die Bahnen sind so gebaut, dass der Wind quer zum Weg
weht - sonst waere er nur Deko.

Wie beim Uhrenturm ist der Gewinn dieses Skripts nicht die Tipparbeit, sondern die Pruefung: Jede
Bahn wird schon beim Bauen gegen dieselben Regeln gehalten, die spaeter tools/validate.mjs anlegt.
"""
import math, os

FLOOR = set('#silwTHoABCDEF')       # was der Ball betreten darf (wie in validate.mjs)
HART = set('#siTHoABCDEF')          # davon das, worauf er auch liegen bleiben kann

class Karte:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [['.'] * w for _ in range(h)]
    def rect(self, x0, y0, x1, y1, ch='#'):
        assert 0 <= x0 <= x1 < self.w and 0 <= y0 <= y1 < self.h, (x0, y0, x1, y1)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.g[y][x] = ch
    def scheibe(self, cx, cy, r, ch='#'):
        for y in range(self.h):
            for x in range(self.w):
                if math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r:
                    self.g[y][x] = ch
    def put(self, x, y, ch):
        assert 0 <= x < self.w and 0 <= y < self.h, (x, y)
        self.g[y][x] = ch
    def at(self, x, y):
        if 0 <= int(y) < self.h and 0 <= int(x) < self.w:
            return self.g[int(y)][int(x)]
        return '.'
    def frei(self, x, y):
        return self.at(x, y) in FLOOR
    def rows(self):
        r = [''.join(z) for z in self.g]
        assert all(len(z) == self.w for z in r)
        return r

BAHNEN = []
def bahn(**kw):
    BAHNEN.append(kw)

def g(v):
    """Zahl fuer die JS-Ausgabe: ganze Zahlen ohne Komma."""
    return str(int(v)) if float(v) == int(v) else str(round(float(v), 4))

# ---------------------------------------------------------------- Maschinen als Bausteine

def windfahne(k, name, x, y, phase=0, kraft=None, ebene=0):
    """Windfahne: dreht den Wind im Takt durch Ost, Sued, West, Nord und zeigt die naechste
    Richtung vorher an. Sie wirkt auf der ganzen Bahn, steht aber trotzdem auf ihr - man soll
    hingehen und nachsehen koennen, und die Kamera soll sie mitnehmen."""
    assert k.frei(x, y), f'{name}: Windfahne bei ({x},{y}) steht auf "{k.at(x, y)}"'
    kr = "" if kraft is None else ", kraft: %s" % g(kraft)
    ph = "" if phase == 0 else ", phase: %s" % g(phase)
    eb = "" if ebene == 0 else ", ebene: %d" % ebene
    return "{ type: 'windfahne', x: %s, y: %s%s%s%s }" % (g(x), g(y), kr, ph, eb)

def lawine(k, name, x0, y0, x1, y1, grad, phase=0, ebene=0):
    """Lawine: faehrt im Takt durch ihren Streifen. Geprueft wird, dass im Streifen ueberhaupt
    Bahn liegt und dass es mindestens einen Felsblock gibt - ohne Deckung waere sie keine Aufgabe,
    sondern nur Warten."""
    w, h = x1 - x0, y1 - y0
    assert w >= 2 and h >= 2, (name, w, h)
    boden = sum(1 for y in range(int(y0), int(y1)) for x in range(int(x0), int(x1)) if k.frei(x + 0.5, y + 0.5))
    assert boden >= 6, f'{name}: im Lawinenstreifen liegen nur {boden} Bahnkacheln'
    blocks = sum(1 for y in range(int(y0), int(y1)) for x in range(int(x0), int(x1)) if k.at(x, y) == 'x')
    assert blocks >= 1, f'{name}: im Lawinenstreifen steht kein Block - es gibt keine Deckung'
    ph = "" if phase == 0 else ", phase: %s" % g(phase)
    eb = "" if ebene == 0 else ", ebene: %d" % ebene
    return ("{ type: 'lawine', x: %s, y: %s, w: %s, h: %s, angle: %d%s%s }"
            % (g(x0), g(y0), g(w), g(h), grad, ph, eb))

def seilbahn(karten, name, x0, y0, x1, y1, ebene=0, ziel=None, wait=2.6, travel=3.4, phase=0):
    """Seilbahn: Gondel am Seil zwischen zwei Stationen. Beide Stationen muessen auf ihrer Ebene
    Bahn sein - die Talstation auf 'ebene', die Bergstation auf 'ziel'."""
    zl = ebene if ziel is None else ziel
    assert karten[ebene].frei(x0, y0), f'{name}: Talstation ({x0},{y0}) liegt auf Ebene {ebene} auf "{karten[ebene].at(x0, y0)}"'
    assert karten[zl].frei(x1, y1), f'{name}: Bergstation ({x1},{y1}) liegt auf Ebene {zl} auf "{karten[zl].at(x1, y1)}"'
    assert math.hypot(x1 - x0, y1 - y0) > 2, name
    eb = "" if ebene == 0 else ", ebene: %d" % ebene
    zi = "" if zl == ebene else ", ziel: %d" % zl
    ph = "" if phase == 0 else ", phase: %s" % g(phase)
    return ("{ type: 'seilbahn', x0: %s, y0: %s, x1: %s, y1: %s, wait: %s, travel: %s%s%s%s }"
            % (g(x0), g(y0), g(x1), g(y1), g(wait), g(travel), ph, eb, zi))

def schneebruecke(karten, name, x, y, w=2, h=2, ebene=0):
    """Schneebruecke: traegt genau einen Schlag lang. Geprueft wird, dass sie auf ihrer Ebene auf
    der Bahn liegt - sonst waere sie von Anfang an ein Loch."""
    for dy in range(h):
        for dx in range(w):
            assert karten[ebene].frei(x + dx + 0.5, y + dy + 0.5), \
                f'{name}: Schneebruecke bei ({x + dx},{y + dy}) liegt auf "{karten[ebene].at(x + dx, y + dy)}"'
    eb = "" if ebene == 0 else ", ebene: %d" % ebene
    return "{ type: 'schneebruecke', x: %s, y: %s, w: %s, h: %s%s }" % (g(x), g(y), g(w), g(h), eb)

def blick(x, y, w, h, zx, zy, ebene=None):
    """Blickzone: Liegt der Ball darin, schaut die Kamera auf (zx, zy) statt aufs Loch."""
    eb = "" if ebene is None else ", ebene: %d" % ebene
    return "{ x: %s, y: %s, w: %s, h: %s%s, look: { x: %s, y: %s } }" % (g(x), g(y), g(w), g(h), eb, g(zx), g(zy))

# ================================================================ Die zwoelf Bahnen
# Vier Abschnitte zu je drei Bahnen. Der Abschnitt gibt die Palette vor und damit die Hoehe:
#   1-3   snowfoot  - Nadelwald am Fuss, breite Haenge, der Wind wird eingefuehrt
#   4-6   snowrock  - Felsband, schmaler, Lawine und Seilbahn kommen dazu
#   7-9   glacier   - Blankeis und Spalten, die Schneebruecke wird zur Hauptsache
#   10-12 summit    - Grat und Gipfel, oben die Wolkenetagen
# Der Wind weht auf jeder Bahn quer zum Weg, nie laengs: Sonst waere er kein Raetsel, sondern nur
# Rueckenwind oder Gegenwind, und man koennte ihn aussitzen.

# ---------------------------------------------------------------- 1 Talstation (einfach)
k = Karte(30, 13)
k.rect(2, 3, 27, 9)
k.put(4, 6, 'T'); k.put(25, 6, 'H')
bahn(name='Talstation', par=3, theme='snowfoot', maxStrokes=12, seed=301, dichte=0.3,
     intro='Der Hang unter der Talstation, und die erste Lektion des Berges: Hier oben steht der '
           'Wind nicht still. Die Fahne dreht sich alle paar Sekunden weiter und zeigt schon '
           'vorher, woher es gleich kommt – und zwischen zwei Richtungen ist einen Augenblick '
           'Flaute. Wer geradeaus zielt, landet neben dem Loch; wer danebenzielt oder wartet, trifft.',
     obstacles=[windfahne(k, 'Talstation', 15, 6.5)],
     decor=[('pineSnow', 15, 1.4, 1.4), ('pineSnow', 8, 11.4, 1.2), ('pineSnow', 22, 11.4, 1.3),
            ('rockSnow', 0.8, 6.5, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 2 Waldschneise (einfach)
k = Karte(32, 14)
k.rect(2, 3, 29, 10)
for x in (11, 12, 19, 20):                         # Baumgruppen als Blocks mitten in der Schneise
    k.rect(x, 4, x, 5, 'x'); k.rect(x, 8, x, 9, 'x')
k.rect(8, 6, 10, 7, 's'); k.rect(21, 6, 24, 7, 's')  # Tiefschnee bremst
k.put(4, 6, 'T'); k.put(27, 7, 'H')
bahn(name='Waldschneise', par=4, theme='snowfoot', maxStrokes=14, seed=302, dichte=0.35,
     intro='Die Schneise durch den Wald. In der Mitte bleibt nur eine Gasse zwischen den '
           'Baumgruppen frei, und quer dazu drückt der Wind. Links und rechts liegt Tiefschnee: '
           'Dort bleibt der Ball fast stehen – manchmal ist genau das die Rettung.',
     obstacles=[windfahne(k, 'Waldschneise', 16, 6.5, phase=0.25)],
     decor=[('pineSnow', 16, 1.4, 1.5), ('pineSnow', 6, 12.4, 1.2), ('pineSnow', 26, 12.4, 1.3),
            ('rockSnow', 30.8, 6.5, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 3 Lawinenhang (einfach, erste Lawine)
k = Karte(32, 15)
k.rect(2, 3, 29, 11)
for (bx, by) in [(11, 5), (16, 8), (21, 5), (13, 10)]:   # Felsbloecke als Deckung
    k.rect(bx, by, bx + 1, by, 'x')
k.put(4, 7, 'T'); k.put(27, 7, 'H')
bahn(name='Lawinenhang', par=4, theme='snowfoot', maxStrokes=16, seed=303, dichte=0.25,
     intro='Über dem Hang hängt eine Wächte, und alle neun Sekunden kommt sie herunter. Vorher '
           'staubt es an der Abrisskante – das ist die Vorwarnung. Wer dann offen liegt, wird ein '
           'Stück mitgenommen; wer hinter einem Felsblock liegt, merkt nichts davon. Die hellen '
           'Keile im Schnee zeigen, wo die Deckung reicht.',
     obstacles=[lawine(k, 'Lawinenhang', 8, 3, 26, 12, 90),
                windfahne(k, 'Lawinenhang', 16, 10.5)],
     decor=[('pineSnow', 6, 1.4, 1.3), ('rockSnow', 30.8, 7.5, 1.1), ('pineSnow', 25, 1.4, 1.2)],
     map=k.rows())

# ---------------------------------------------------------------- 4 Felsband (mittel)
k = Karte(34, 15)
k.rect(2, 6, 31, 9)                                # das schmale Band
k.rect(12, 6, 13, 6, 'x'); k.rect(19, 9, 20, 9, 'x')
k.rect(24, 7, 27, 8, 'i')                          # vereiste Stelle kurz vor dem Loch
k.put(4, 7, 'T'); k.put(30, 8, 'H')
bahn(name='Felsband', par=4, theme='snowrock', maxStrokes=16, seed=304, dichte=0.2,
     intro='Ein Band, vier Kacheln breit, und links wie rechts geht es hinunter. Der Wind steht '
           'quer dazu, und kurz vor dem Loch ist das Band vereist – dort greift nichts mehr, außer '
           'dem Wind. Hier lohnt es sich, auf die Flaute zu warten.',
     obstacles=[windfahne(k, 'Felsband', 8, 7.5, phase=0.4),
                lawine(k, 'Felsband', 10, 6, 22, 10, 90, phase=0.3)],
     decor=[('rockSnow', 17, 3.4, 1.4), ('rockSnow', 8, 12.4, 1.2), ('crystalBlue', 26, 3.4, 1),
            ('rockSnow', 28, 12.4, 1.1)],
     map=k.rows())

# ---------------------------------------------------------------- 5 Die Seilbahn (mittel, erste Gondel)
k = Karte(36, 15)
k.rect(2, 5, 12, 11)                               # Talstation
k.rect(23, 4, 33, 11)                              # Bergstation
k.rect(28, 6, 30, 8, 's')
k.put(4, 8, 'T'); k.put(31, 8, 'H')
bahn(name='Die Seilbahn', par=4, theme='snowrock', maxStrokes=16, seed=305, dichte=0.2,
     intro='Zwischen den beiden Felsköpfen liegt nichts als Luft – hinüber bringt nur die Gondel. '
           'Sie wartet an der Station, fährt hinüber, wartet und kommt zurück; einsteigen kann man '
           'nur, während sie steht. Drüben liegt Tiefschnee vor dem Loch, der den Anlauf schluckt.',
     obstacles=[seilbahn([k], 'Die Seilbahn', 11.5, 8.5, 23.5, 8.5),
                windfahne(k, 'Die Seilbahn', 6, 8.5)],
     decor=[('rockSnow', 17, 2.4, 1.5), ('rockSnow', 17, 13.4, 1.4), ('crystalBlue', 34.8, 8.5, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 6 Schneewaechte (mittel, erste Bruecke)
k = Karte(34, 15)
k.rect(2, 6, 13, 10)                               # diesseits
k.rect(14, 6, 17, 10)                              # die Waechte selbst liegt hier drueber
k.rect(18, 4, 31, 11)                              # jenseits
k.rect(22, 5, 23, 5, 'x')
k.put(4, 8, 'T'); k.put(29, 8, 'H')
bahn(name='Schneewächte', par=5, theme='snowrock', maxStrokes=18, seed=306, dichte=0.2,
     intro='Die Rinne ist überschneit, und die Wächte darüber trägt – aber nur einmal. Hat der '
           'Ball sie überquert, bricht sie hinter ihm ein; im selben Schlag kommt man nicht zurück. '
           'Beim nächsten Schlag liegt sie wieder da, der Berg schneit zu. Also: erst schauen, wo '
           'man hinwill, dann hinüber.',
     obstacles=[schneebruecke([k], 'Schneewächte', 14, 6, 4, 5),
                windfahne(k, 'Schneewächte', 25, 9.5, phase=0.5),
                lawine(k, 'Schneewächte', 19, 4, 30, 11, 90, phase=0.45)],
     decor=[('rockSnow', 8, 12.4, 1.3), ('crystalBlue', 16, 2.4, 1.1), ('rockSnow', 33, 2.4, 1.2)],
     map=k.rows())

# ---------------------------------------------------------------- 7 Blankeis (schwer)
k = Karte(34, 15)
k.rect(2, 5, 31, 10)
k.rect(9, 5, 26, 10, 'i')                          # der halbe Hang ist blankes Eis
k.rect(14, 5, 15, 5, 'x'); k.rect(20, 10, 21, 10, 'x')
k.put(4, 7, 'T'); k.put(29, 8, 'H')
bahn(name='Blankeis', par=4, theme='glacier', maxStrokes=16, seed=307, dichte=0.15,
     intro='Der Gletscher, blank gefegt. Auf dem Eis bremst nichts mehr – der Ball läuft, bis ihn '
           'etwas aufhält, und der Wind hat die ganze Zeit über Gelegenheit, ihn abzutreiben. '
           'Sanft schlagen ist hier keine Schwäche, sondern die einzige Möglichkeit.',
     obstacles=[windfahne(k, 'Blankeis', 6, 7.5),
                lawine(k, 'Blankeis', 11, 5, 25, 11, 90, phase=0.35)],
     decor=[('crystalBlue', 17, 2.4, 1.5), ('crystalBlue', 12, 12.4, 1.3), ('rockSnow', 27, 2.4, 1.2),
            ('crystalBlue', 33, 12.4, 1.1)],
     map=k.rows())

# ---------------------------------------------------------------- 8 Gletscherspalten (schwer)
k = Karte(36, 16)
k.rect(2, 6, 10, 11)
k.rect(11, 6, 14, 11)                              # erste Waechte
k.rect(15, 6, 20, 11)
k.rect(21, 6, 24, 11)                              # zweite Waechte
k.rect(25, 4, 33, 12)
k.rect(27, 6, 29, 9, 'i')
k.rect(30, 5, 31, 5, 'x')
k.put(4, 8, 'T'); k.put(31, 9, 'H')
bahn(name='Gletscherspalten', par=5, theme='glacier', maxStrokes=18, seed=308, dichte=0.15,
     intro='Zwei Spalten hintereinander, beide nur von einer Wächte überbrückt. Jede trägt genau '
           'einen Schlag – wer auf der Zwischeninsel landet, hat die erste hinter sich gelassen und '
           'muss über die zweite weiter. Zurück geht es erst im nächsten Schlag, wenn wieder Schnee '
           'darüberliegt.',
     obstacles=[schneebruecke([k], 'Gletscherspalten A', 11, 6, 4, 6),
                schneebruecke([k], 'Gletscherspalten B', 21, 6, 4, 6),
                windfahne(k, 'Gletscherspalten', 17, 10.5, phase=0.3),
                lawine(k, 'Gletscherspalten', 26, 4, 34, 12, 90, phase=0.5)],
     decor=[('crystalBlue', 18, 2.4, 1.4), ('crystalBlue', 8, 13.4, 1.2), ('rockSnow', 30, 14.4, 1.2)],
     map=k.rows())

# ---------------------------------------------------------------- 9 Eisbruch (schwer)
k = Karte(36, 16)
k.rect(2, 6, 11, 11)                               # Talkessel
k.rect(20, 4, 27, 12)                              # Mittelinsel
k.rect(28, 6, 30, 11)                              # Bruecke zur Kanzel
k.rect(31, 6, 34, 11)                              # Kanzel mit dem Loch
k.rect(22, 6, 25, 9, 'i')
k.rect(23, 11, 24, 11, 'x')
k.put(4, 8, 'T'); k.put(33, 8, 'H')
bahn(name='Eisbruch', par=5, theme='glacier', maxStrokes=18, seed=309, dichte=0.15,
     intro='Der Bruch, wo der Gletscher über die Kante fällt. Über die erste Kluft trägt die '
           'Gondel, quer über die Mittelinsel läuft die Lawine, und auf die Kanzel kommt man nur '
           'über eine Wächte, die einmal trägt. Drei Sachen nacheinander, und jede will für sich '
           'abgepasst werden.',
     obstacles=[seilbahn([k], 'Eisbruch', 10.5, 8.5, 21.5, 8.5, travel=3.8),
                lawine(k, 'Eisbruch', 20, 4, 28, 12, 90, phase=0.4),
                schneebruecke([k], 'Eisbruch', 28, 6, 3, 6),
                windfahne(k, 'Eisbruch', 6, 8.5, phase=0.2)],
     decor=[('crystalBlue', 16, 2.4, 1.4), ('crystalBlue', 16, 14.4, 1.3), ('rockSnow', 33, 14.4, 1.2)],
     map=k.rows())

# ---------------------------------------------------------------- 10 Der Grat (schwer)
k = Karte(34, 17)
k.rect(2, 7, 8, 11)                                # Scharte
k.rect(9, 8, 24, 10)                               # der Grat: drei Kacheln breit, links und rechts nichts
k.rect(25, 5, 32, 13)                              # Gipfelvorbau
k.rect(14, 8, 15, 8, 'x'); k.rect(19, 10, 20, 10, 'x')
k.rect(27, 7, 28, 7, 'x')          # Deckung vor der Lawine auf dem Vorbau
k.put(4, 9, 'T'); k.put(29, 9, 'H')
bahn(name='Der Grat', par=5, theme='summit', maxStrokes=18, seed=310, dichte=0.12,
     intro='Drei Kacheln breit, und rechts wie links tausend Meter Luft. Der Wind steht quer zum '
           'Grat, und er dreht: Wer im falschen Augenblick losschlägt, wird heruntergedrückt. Die '
           'beiden Felsköpfe auf dem Grat sind das Einzige, woran man sich festhalten kann.',
     obstacles=[windfahne(k, 'Der Grat', 5, 9.5),
                lawine(k, 'Der Grat', 25, 5, 33, 13, 90, phase=0.35)],
     decor=[('rockSnow', 16, 4.4, 1.4), ('rockSnow', 16, 14.4, 1.3), ('crystalBlue', 33, 2.4, 1.1)],
     map=k.rows())

# ---------------------------------------------------------------- 11 Ueber den Wolken (erste Wolkenetage)
k = Karte(36, 17)                                  # Ebene 0: die letzte feste Platte
k.rect(2, 7, 14, 12)
k.rect(8, 9, 9, 9, 'x')
k.put(4, 9, 'T')
o = Karte(36, 17)                                  # Ebene 1: die Wolkenbank mit dem Loch
o.rect(20, 6, 32, 11)
o.rect(33, 6, 33, 11, 'o')                         # offene Kante: hier faellt man zurueck auf den Fels
o.put(29, 8, 'H')
bahn(name='Über den Wolken', par=5, theme='summit', maxStrokes=18, seed=311, dichte=0.12,
     intro='Ab hier ist der Berg zu Ende, und weiter geht es nur über die Wolken. Die Gondel hängt '
           'an einem Seil, das von der Platte hinauf in die Wolkenbank führt – man sieht schon von '
           'unten, wohin sie fährt. Oben trägt die Wolke, aber an ihrem hellen Rand hört sie auf; '
           'wer darüber hinausrollt, fällt auf den Fels zurück. Das kostet keinen Strafschlag, nur '
           'den Weg.',
     obstacles=[seilbahn([k, o], 'Über den Wolken', 13.5, 9.5, 21.5, 8.5, ziel=1, travel=3.8),
                windfahne(k, 'Über den Wolken', 6, 11.5),
                lawine(k, 'Über den Wolken', 2, 7, 14, 13, 90, phase=0.5)],
     # Unten geht es zur Talstation, nicht zum Loch - das liegt oben in der Wolke.
     views=[blick(0, 0, 18, 17, 13.5, 9.5, ebene=0)],
     decor=[('rockSnow', 17, 14.4, 1.3), ('cloud', 25, 2.4, 1.6), ('cloud', 8, 2.4, 1.4),
            ('cloud', 30, 14.4, 1.5)],
     map=k.rows(), ebenen=[o.rows()])

# ---------------------------------------------------------------- 12 Der Gipfel (Hoehepunkt)
k = Karte(36, 20)                                  # Ebene 0: die Gipfelplatte
k.rect(2, 10, 14, 16)
k.rect(6, 12, 7, 12, 'x')
k.put(4, 13, 'T')
o1 = Karte(36, 20)                                 # Ebene 1: zwei Wolkenbaenke, dazwischen eine Waechte
o1.rect(18, 9, 24, 14)
o1.rect(25, 10, 27, 13)
o1.rect(28, 9, 33, 14)
o1.rect(17, 9, 17, 14, 'o')
o2 = Karte(36, 20)                                 # Ebene 2: die oberste Wolke mit dem Loch
o2.rect(24, 3, 33, 8)
o2.rect(23, 3, 23, 8, 'o')
o2.put(30, 5, 'H')
bahn(name='Der Gipfel', par=6, theme='summit', maxStrokes=22, seed=312, dichte=0.1,
     intro='Ganz oben. Von der Gipfelplatte bringt die erste Gondel auf die untere Wolke, dort '
           'trennt eine Wächte die beiden Bänke – sie trägt einmal, dann bricht sie ein –, und von '
           'der zweiten Bank führt die letzte Gondel noch eine Wolke höher. Dort liegt das Loch. '
           'Über der Platte fegt es noch einmal herunter, und der Wind hört den ganzen Weg nicht '
           'auf. Wer hier ankommt, hat den Berg gelesen und nicht bezwungen.',
     obstacles=[seilbahn([k, o1, o2], 'Gipfel unten', 13.5, 13.5, 19.5, 12.5, ziel=1, travel=3.8),
                schneebruecke([k, o1, o2], 'Gipfel', 25, 10, 3, 4, ebene=1),
                seilbahn([k, o1, o2], 'Gipfel oben', 31.5, 11.5, 30.5, 6.5, ebene=1, ziel=2, travel=3.4),
                windfahne(k, 'Gipfel', 10, 15.5),
                lawine(k, 'Gipfel', 2, 10, 15, 17, 90, phase=0.4)],
     # Jede Etage schaut zu ihrer eigenen Talstation: von der Platte zur ersten Gondel, von der
     # unteren Wolke zur zweiten. Erst ganz oben ist das Loch das Ziel.
     views=[blick(0, 0, 17, 20, 13.5, 13.5, ebene=0),
            blick(16, 0, 20, 20, 31.5, 11.5, ebene=1)],
     decor=[('cloud', 20, 2.4, 1.6), ('cloud', 8, 4.4, 1.4), ('cloud', 30, 17.4, 1.5),
            ('rockSnow', 17, 17.4, 1.3)],
     map=k.rows(), ebenen=[o1.rows(), o2.rows()])

# ================================================================ Ausgabe
for b in BAHNEN:
    rows = b['map']
    txt = '\n'.join(rows)
    ebenen = b.get('ebenen') or []
    otxt = '\n'.join('\n'.join(e) for e in ebenen)
    assert txt.count('T') == 1, b['name']
    assert txt.count('H') + otxt.count('H') == 1, b['name']
    assert otxt.count('T') == 0, b['name']
    for e in ebenen:
        assert len(e) == len(rows) and all(len(a) == len(c) for a, c in zip(e, rows)), b['name']
    if ebenen:
        # Es muss ueberhaupt einen Weg nach oben geben. Welche Ebene wie erreichbar ist, rechnet
        # tools/validate.mjs aus - dort zaehlen auch Stuerze.
        assert any("ziel:" in o for o in b['obstacles']), f"{b['name']}: obere Ebenen, aber kein Weg hinauf"
    # Deko steht neben der Bahn, nie darauf
    for (t, x, y, sc) in b['decor']:
        ch = rows[int(y)][int(x)] if 0 <= int(y) < len(rows) and 0 <= int(x) < len(rows[0]) else '.'
        assert ch not in FLOOR, f"{b['name']}: Deko {t} bei ({x},{y}) steht auf dem Fairway ('{ch}')"
    print(f"{b['name']:22s} {len(rows[0])}x{len(rows)} Par {b['par']}")

def js_map(rows, extra=""):
    return '\n'.join("      %s'%s'," % (extra, r) for r in rows)

def js_decor(d):
    return '\n'.join("      { t: '%s', x: %s, y: %s, s: %s }," % (t, g(x), g(y), g(s)) for (t, x, y, s) in d)

kopf = '''/* Der Schneeberg (Weltkennung 'snow'): zwölf Bahnen, ein Aufstieg vom Fuß bis über die Wolken.

   Der rote Faden ist der Wind. Jede andere Welt fragt, wie fest oder wann man schlägt; diese fragt
   *wohin*. Der Wind dreht im Takt durch vier Richtungen, versetzt jeden rollenden Ball – und er ist
   ablesbar: Die Windfahne zeigt die nächste Richtung, bevor sie kommt, und zwischen zwei Richtungen
   ist einen Augenblick Flaute. Wer geradeaus zielt, kommt nicht an; wer danebenzielt oder wartet,
   schon. Darum steht der Wind auf fast jeder Bahn quer zum Weg und nie längs.

   Der zweite Faden ist die Höhe. Die vier Abschnitte sind vier Paletten, und sie werden nach oben
   hin kälter, schmaler und ausgesetzter:
     Bahn 1-3   'snowfoot' – Nadelwald am Fuß, breite Hänge
     Bahn 4-6   'snowrock' – Felsband, Lawine und Seilbahn
     Bahn 7-9   'glacier'  – Blankeis und Gletscherspalten
     Bahn 10-12 'summit'   – Grat und Gipfel, oben die Wolkenetagen

   Vier eigene Maschinen (src/obstacles_snow.js):
     'windfahne'      dreht den Wind und sagt die nächste Richtung an
     'lawine'         fegt im Takt durch ihren Streifen; hinter einem Block ('x') ist man gedeckt
     'seilbahn'       Gondel zwischen zwei Stationen, darf dabei die Ebene wechseln ('ziel')
     'schneebruecke'  trägt genau einen Schlag lang, dann bricht sie ein

   Die Wolkenetagen sind dieselbe Mechanik wie die Ebenen des Uhrenturms – 'map' ist die unterste
   Fläche, 'ebenen' die darüber, alle deckungsgleich. Nur gezeichnet werden sie als Wolkenbank
   statt als Steinscholle (Palette 'summit' und 'cloud' mit ebeneStil 'wolke').

   Sonst gilt dieselbe Kartenlegende wie in courses.js: 's' ist hier Tiefschnee (bremst), 'i'
   blankes Eis (rutscht), 'x' ein Felsblock (und damit Deckung vor der Lawine), 'o' eine offene
   Kante. Winkel in Grad, Zeiten in Sekunden, Koordinaten in Kacheln.

   Die Karten entstehen mit tools/schneeberg.py und werden dort schon beim Bauen geprüft. */
const SNOW_COURSES = [
'''

teile = [kopf]
for b in BAHNEN:
    teile.append("  {\n")
    teile.append("    name: '%s', par: %d, theme: '%s', maxStrokes: %d,\n"
                 % (b['name'], b['par'], b['theme'], b['maxStrokes']))
    teile.append("    intro: '%s',\n" % b['intro'].replace("'", "\\'"))
    teile.append("    map: [\n%s\n    ],\n" % js_map(b['map']))
    if b.get('ebenen'):
        teile.append("    ebenen: [\n%s\n    ],\n"
                     % '\n'.join("      [\n%s\n      ]," % js_map(e, "  ") for e in b['ebenen']))
    teile.append("    obstacles: [\n" + '\n'.join('      %s,' % o for o in b['obstacles']) + "\n    ],\n")
    teile.append("    decor: [\n%s\n    ],\n" % js_decor(b['decor']))
    if b.get('views'):
        teile.append("    views: [\n" + '\n'.join('      %s,' % v for v in b['views']) + "\n    ],\n")
    teile.append("    autoDecor: { density: %s, seed: %d },\n" % (b['dichte'], b['seed']))
    teile.append("  },\n")
teile.append("];\n")

ziel = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'courses_snow.js')
open(ziel, 'w', encoding='utf-8').write(''.join(teile))
print('geschrieben')
