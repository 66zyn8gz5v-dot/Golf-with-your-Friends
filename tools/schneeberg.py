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
import math, os, re

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

SCHNEE_WACHS = 0.0018      # rund vierzig Kacheln Schnee, bis der Ball nicht mehr ins Loch passt

# Die Regel, dass auf einer Schneebahn ein Weg ueber Eis oder Wasser zum Loch fuehren muss, wird
# nicht hier geprueft, sondern in tools/validate.mjs. Der Grund: Sie haengt an Seilbahnen und
# Etagen - auf "Die Seilbahn" liegt das Eis auf dem einen Plateau und das Loch auf dem anderen,
# und dazwischen faehrt nur die Gondel. Das modelliert validate.mjs schon vollstaendig; es hier
# noch einmal nachzubauen hiesse, dieselbe Rechnung zweimal zu pflegen.

def hang(k, rampen, hstufe, kraft, bis=None):
    """Der Berg steigt nach rechts an - jede Bahn wird bergauf gespielt.

    'rampen' sind die Spalten, an denen die naechste Stufe beginnt; dort liegt jeweils eine Schraege
    ueber die volle Breite der Bahn. Nur ueber sie kommt der Ball eine Stufe hoeher (src/physics.js
    laesst eine Kante sonst wie eine Mauer wirken) - und auf ihr rollt er auch wieder herunter, wenn
    der Schlag nicht reicht. Darum ist 'kraft' wichtiger als 'hstufe': 'hstufe' ist nur die Optik,
    'kraft' das Gefaelle. Zwei Dinge muessen dafuer stimmen, und beide sind schon einmal schiefgegangen:
    Die Schraege traegt 'alwaysForce', wirkt also auch auf einen liegenden Ball (sonst bleibt er auf
    halber Hoehe kleben, weil die Kraft nur einen rollenden Ball trifft), und 'kraft' liegt ueber der
    Reibung des Schnees (4,2) - darunter haelt der Boden den Ball fest, egal wie steil es aussieht.
    Darum liegen Rampen auch nie auf Eis oder Tiefschnee, deren Reibung ganz anders ist.
    Am Gipfel ist beides groesser als am Fuss: Der Berg wird nach oben hin steiler.

    'bis' begrenzt die Hoehen auf die Spalten bis dorthin. Das brauchen die beiden Wolkenbahnen:
    Das Hoehenraster gilt in level.js fuer alle Ebenen zugleich, die Wolken sollen aber flach
    bleiben - sie liegen dort rechts, der Fels links.
    """
    grenze = k.w - 1 if bis is None else bis
    hoehen = [[0] * k.w for _ in range(k.h)]
    felder = []
    for i, eintrag in enumerate(rampen):
        # ('luft', x): Die Stufe beginnt bei x, ohne Rampe - dort ist keine Bahn, sondern eine
        # Schlucht, und hinueber kommt nur die Gondel. Sonst: Rampe auf den Spalten gx und gx+1,
        # die selbst noch zur unteren Stufe gehoeren; erst dahinter wird es hoeher.
        luft = isinstance(eintrag, tuple)
        gx = eintrag[1] if luft else eintrag
        for y in range(k.h):
            for x in range(gx if luft else gx + 2, grenze + 1):
                hoehen[y][x] = i + 1
        if luft:
            continue
        ys = [y for y in range(k.h) for x in (gx, gx + 1) if k.frei(x + 0.5, y + 0.5)]
        assert len(ys) >= 4, f'Rampe bei Spalte {gx}: dort liegen nur {len(ys)} Bahnkacheln'
        for y in set(ys):                 # eine Schraege aus Eis oder Tiefschnee waere keine
            for x in (gx, gx + 1):
                assert k.at(x, y) not in 'isTH', f'Rampe bei Spalte {gx}: Kachel ({x},{y}) ist "{k.at(x, y)}"'
        y0, y1 = min(ys), max(ys) + 1
        felder.append("{ type: 'field', x: %s, y: %s, w: 2, h: %s, fx: %s, fy: 0, style: 'slope', base: %d, rise: 1, alwaysForce: true }"
                      % (g(gx), g(y0), g(y1 - y0), g(-kraft), i))
    return [''.join(str(v) for v in row) for row in hoehen], felder, hstufe

def hoehenpruefung(name, karte, hoehen, rampen_js):
    """Abschlag unten, Loch oben - sonst waere die Bahn kein Aufstieg. Und keine Rampe unter einer
    Schneebruecke: Die muss flach liegen, sonst steht mitten auf ihr eine Kante."""
    def h(x, y):
        return int(hoehen[int(y)][int(x)])
    tx = ty = hx = hy = None
    for y, r in enumerate(karte):
        for x, c in enumerate(r):
            if c == 'T': tx, ty = x, y
            if c == 'H': hx, hy = x, y
    if tx is not None:
        assert h(tx, ty) == 0, f'{name}: der Abschlag liegt schon auf Stufe {h(tx, ty)}'
    if hx is not None:
        hoch = max(int(c) for r in hoehen for c in r)
        assert h(hx, hy) == hoch, f'{name}: das Loch liegt auf Stufe {h(hx, hy)}, der Berg geht bis {hoch}'
    for o in rampen_js:
        m = re.search(r"type: 'schneebruecke', x: (\d+), y: (\d+), w: (\d+), h: (\d+)", o)
        if not m:
            continue
        bx, by, bw, bh = (int(v) for v in m.groups())
        stufen = {h(bx + dx, by + dy) for dy in range(bh) for dx in range(bw)}
        assert len(stufen) == 1, f'{name}: die Schneebruecke bei ({bx},{by}) liegt auf den Stufen {sorted(stufen)} - sie muss flach liegen'

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

# ================================================================ Die zwoelf Bahnen
#
# DIE VIER ABSCHNITTE SIND JETZT VIER REGELN, NICHT VIER FARBEN
# Vorher war der Schneeberg zwoelfmal dieselbe Bahn: eine Windfahne auf jeder, eine Lawine auf
# fast jeder, drei bis sechs Hindernisse auf vierhundert Feldern, Eis auf vier von zwoelf und
# Wasser auf keiner. Die Abschnitte unterschieden sich nur in der Palette.
#
#   Talstation (1-3)  Schnee, viel Schnee. Hier lernt man die Weltregel: Der Ball setzt an und
#                     passt nicht mehr ins Loch, und die Eisplatte davor ist die Loesung.
#   Felsband (4-6)    Schmale Baender zwischen Felsen. Ein zugeschneiter Ball kommt durch die
#                     Engstellen nicht durch - hier kostet das Dickwerden zum ersten Mal wirklich.
#   Gletscher (7-9)   Alles Eis. Der Ball bleibt klein und rutscht; dafuer steht Schmelzwasser in
#                     den Spalten. Die einzige Stelle der Welt, an der man *nicht* abstreifen muss.
#   Gipfel (10-12)    Tiefschnee auf schmalen Graten, mehrere Ebenen, der staerkste Wind.
#
# Und die Maschinen sind ungleich verteilt: Windfahne auf 8 von 12 statt auf allen, Lawine auf 6,
# Seilbahn auf 4, Schneebruecke auf 5. Zwei Bahnen haben gar keinen Wind - und genau deshalb
# merkt man ihn auf den anderen.

# ---------------------------------------------------------------- 1 Talstation (Weltregel lernen)
k = Karte(30, 13)
k.rect(2, 3, 27, 9)
k.rect(20, 5, 24, 8, 'i')                          # die Eisplatte vor dem Loch - hier faellt der Schnee ab
k.put(4, 6, 'T'); k.put(25, 6, 'H')
hoehen, schraegen, hs = hang(k, [10, 17], 0.6, 4.8)
bahn(name='Talstation', par=3, theme='snowfoot', maxStrokes=12, seed=301, dichte=0.38,
     schnee=SCHNEE_WACHS,
     intro='Die erste Lektion des Berges, und sie steht gleich am Anfang: Wer durch den Schnee '
           'rollt, setzt Schnee an. Der Ball wird dicker – und ein dicker Ball passt nicht ins '
           'Loch, er rollt darüber hinweg. Vor dem Loch liegt darum eine Eisplatte: Dort streift '
           'er alles wieder ab. Erst aufs Eis, dann einlochen.',
     obstacles=[windfahne(k, 'Talstation', 15, 6.5)] + schraegen,
     decor=[('pineSnow', 15, 1.4, 1.4), ('pineSnow', 8, 11.4, 1.2), ('pineSnow', 22, 11.4, 1.3),
            ('pineSnow', 11, 1.4, 1.1), ('pineSnow', 26, 11.4, 1.2), ('rockSnow', 0.8, 6.5, 1),
            ('rockSnow', 29, 2.4, 0.9)],
     heights=hoehen, hstep=hs,
     map=k.rows())

# ---------------------------------------------------------------- 2 Waldschneise (ohne Wind)
k = Karte(32, 14)
k.rect(2, 3, 29, 10)
for x in (11, 12, 19, 20):                         # Baumgruppen als Blocks mitten in der Schneise
    k.rect(x, 4, x, 5, 'x'); k.rect(x, 8, x, 9, 'x')
k.rect(8, 6, 10, 7, 's'); k.rect(21, 6, 23, 7, 's')  # Tiefschnee bremst - und setzt doppelt an
k.rect(25, 5, 28, 8, 'i')
k.put(4, 6, 'T'); k.put(27, 7, 'H')
hoehen, schraegen, hs = hang(k, [6, 16], 0.6, 4.8)
bahn(name='Waldschneise', par=4, theme='snowfoot', maxStrokes=14, seed=302, dichte=0.4,
     schnee=SCHNEE_WACHS,
     # Ohne Windsaecke: Diese Bahn hat als einzige keinen Wind, und ein Windsack am Rand wuerde
     # einen versprechen. Was nicht weht, soll auch nicht wehen aussehen.
     ohneDeko=['windsock'],
     intro='Hier steht der Wind still – die einzige Bahn am Fuß des Berges, auf der er schweigt. '
           'Dafür ist der Weg lang: Zwischen den Baumgruppen bleibt nur eine Gasse, und links und '
           'rechts liegt Tiefschnee, in dem der Ball fast stehen bleibt. Je weiter der Weg, desto '
           'dicker der Ball – das Eisfeld am Ende ist keine Zugabe, sondern Pflicht.',
     obstacles=schraegen,
     decor=[('pineSnow', 16, 1.4, 1.5), ('pineSnow', 6, 12.4, 1.2), ('pineSnow', 26, 12.4, 1.3),
            ('pineSnow', 9, 1.4, 1.3), ('pineSnow', 22, 1.4, 1.1), ('pineSnow', 13, 12.4, 1.4),
            ('rockSnow', 30.8, 6.5, 1)],
     heights=hoehen, hstep=hs,
     map=k.rows())

# ---------------------------------------------------------------- 3 Lawinenhang (erste Lawine)
k = Karte(32, 15)
k.rect(2, 3, 29, 11)
for (bx, by) in [(11, 5), (16, 8), (21, 5), (13, 10)]:   # Felsbloecke als Deckung
    k.rect(bx, by, bx + 1, by, 'x')
k.rect(24, 6, 27, 9, 'i')
k.put(4, 7, 'T'); k.put(27, 7, 'H')
hoehen, schraegen, hs = hang(k, [7, 18], 0.6, 5.0)
bahn(name='Lawinenhang', par=4, theme='snowfoot', maxStrokes=16, seed=303, dichte=0.3,
     schnee=SCHNEE_WACHS,
     intro='Über dem Hang hängt eine Wächte, und alle neun Sekunden kommt sie herunter. Vorher '
           'staubt es an der Abrisskante – das ist die Vorwarnung. Wer offen liegt, wird ein Stück '
           'mitgenommen; wer hinter einem Felsblock liegt, merkt nichts davon. Und wer sich '
           'mitnehmen lässt, rollt dabei durch den Schnee und wird dicker.',
     obstacles=[lawine(k, 'Lawinenhang', 8, 3, 26, 12, 90),
                windfahne(k, 'Lawinenhang', 16, 10.5)] + schraegen,
     decor=[('pineSnow', 6, 1.4, 1.3), ('rockSnow', 30.8, 7.5, 1.1), ('pineSnow', 25, 1.4, 1.2),
            ('pineSnow', 10, 13.4, 1.2), ('rockSnow', 0.8, 12.5, 1), ('pineSnow', 19, 1.4, 1.1)],
     heights=hoehen, hstep=hs,
     map=k.rows())

# ---------------------------------------------------------------- 4 Felsband (Engstelle)
k = Karte(34, 15)
k.rect(2, 6, 31, 9)                                # das schmale Band
k.rect(12, 7, 12, 8, 'x'); k.rect(20, 7, 20, 8, 'x')   # zwei Felsnasen - dazwischen wird es eng
k.rect(5, 6, 8, 9, 'i')                            # die Eisplatte liegt *vor* der Engstelle
k.rect(18, 7, 20, 8, 's')
k.rect(26, 7, 29, 8, 'i')                          # und eine zweite kurz vor dem Loch
k.put(3, 7, 'T'); k.put(30, 8, 'H')
hoehen, schraegen, hs = hang(k, [10, 22], 0.7, 5.2)
bahn(name='Felsband', par=4, theme='snowrock', maxStrokes=16, seed=304, dichte=0.22,
     schnee=SCHNEE_WACHS,
     intro='Ein Band aus Fels, vier Felder breit, und zwei Nasen springen hinein. Hier kostet das '
           'Dickwerden zum ersten Mal wirklich: Ein zugeschneiter Ball kommt zwischen den Nasen '
           'nicht mehr durch. Die Eisplatte liegt gleich hinter dem Abschlag – man muss also '
           'schlank losfahren, nicht schlank ankommen.',
     obstacles=[windfahne(k, 'Felsband', 16, 7.5, kraft=1.25)] + schraegen,
     decor=[('rockSnow', 16, 3.4, 1.4), ('rockSnow', 26, 12.4, 1.3), ('pineSnow', 6, 12.4, 1.1),
            ('rockSnow', 9, 3.4, 1.2), ('rockSnow', 22, 12.4, 1.1), ('rockSnow', 33, 4.4, 1)],
     heights=hoehen, hstep=hs,
     map=k.rows())

# ---------------------------------------------------------------- 5 Die Seilbahn (erste Gondel)
k = Karte(36, 15)
k.rect(2, 4, 12, 11)
k.rect(23, 4, 33, 11)                              # zweites Plateau, dazwischen die Schlucht
k.rect(8, 6, 11, 9, 'i')
k.rect(28, 5, 31, 6, 's')
k.rect(28, 8, 31, 10, 'i')                         # Eis auch drueben, sonst kommt er zu dick an
k.put(4, 7, 'T'); k.put(31, 8, 'H')
hoehen, schraegen, hs = hang(k, [26], 0.7, 5.2)
bahn(name='Die Seilbahn', par=4, theme='snowrock', maxStrokes=16, seed=305, dichte=0.2,
     schnee=SCHNEE_WACHS,
     intro='Zwischen den beiden Plateaus liegt die Schlucht, und darüber fährt die Gondel. Sie '
           'wartet, sie nimmt mit, sie setzt ab – dagegen hilft kein Schlag, nur Geduld. Wichtig '
           'ist, *wie* man einsteigt: Auf der anderen Seite liegt kein Eis mehr.',
     obstacles=[seilbahn([k], 'Die Seilbahn', 11, 7.5, 24, 7.5),
                windfahne(k, 'Die Seilbahn', 6, 5.5, phase=0.5)] + schraegen,
     decor=[('rockSnow', 17, 2.4, 1.5), ('rockSnow', 17, 13.4, 1.4), ('pineSnow', 5, 2.4, 1.2),
            ('pineSnow', 34, 13.4, 1.2), ('rockSnow', 0.8, 8.5, 1), ('pineSnow', 30, 2.4, 1.1)],
     heights=hoehen, hstep=hs,
     map=k.rows())

# ---------------------------------------------------------------- 6 Schneewaechte (erste Bruecke)
k = Karte(34, 15)
k.rect(2, 4, 31, 11)
# Der Spalt war zuerst vier Felder breit, und die beiden Waechten waren die einzigen Uebergaenge.
# Der Bot ist zehnmal von zehn im Schlaglimit geendet: Er hat die schmalen Stege nicht getroffen
# und ist immer wieder hinuntergefallen. Zwei Felder breit ist er eine Frage des Zielens, vier
# waren eine Frage des Gluecks.
# Unter den Waechten steht Schmelzwasser, kein Abgrund - und das ist der Unterschied zwischen
# einer Aufgabe und einer kaputten Bahn. Zuerst lagen die Waechten ueber festem Boden: Jedes Mal,
# wenn der Ball darueberrollte, brachen sie und machten aus Boden ein Loch. Nach ein paar
# Schlaegen war das Feld durchloechert, und der Bot hat zehnmal von zehn im Schlaglimit geendet.
# Ueber Wasser kostet ein Fehler einen Schlag - und die Bahn bleibt, wie sie war.
# Oben und unten bleibt ein fester Rand: Es gibt immer einen Weg herum, und die beiden Waechten
# sind die Abkuerzung, nicht die einzige Moeglichkeit. Ohne den Rand schnitt das Wasser die Bahn
# durch - die Bahnpruefung hat das sofort gemeldet, und selbst das beste Spiel kam nicht hinueber.
k.rect(15, 5, 16, 10, 'w')                         # der Wasserlauf, ueberbrueckt von zwei Waechten
k.rect(4, 6, 7, 9, 'i')
for (bx, by) in [(21, 6), (25, 9)]:
    k.rect(bx, by, bx + 1, by, 'x')
k.rect(26, 7, 28, 9, 'i')                          # hinter dem Spalt, kurz vor dem Loch
k.put(3, 7, 'T'); k.put(29, 8, 'H')
hoehen, schraegen, hs = hang(k, [20, 24], 0.7, 5.2)
bahn(name='Schneewächte', par=5, theme='snowrock', maxStrokes=18, seed=306, dichte=0.24,
     schnee=SCHNEE_WACHS,
     intro='Zwei Wächten liegen über dem Spalt, oben und unten. Jede trägt genau einen Schlag – '
           'wer zurückwill, findet nichts mehr vor. Man hat also zwei Versuche, und muss sich beim '
           'ersten entscheiden. Das Eis liegt hinter dem Abschlag; auf der anderen Seite des '
           'Spalts hilft nur noch, was man mitgebracht hat.',
     obstacles=[schneebruecke([k], 'Schneewächte', 15, 5, 2, 2),
                schneebruecke([k], 'Schneewächte', 15, 9, 2, 2),
                windfahne(k, 'Schneewächte', 10, 10.5)] + schraegen,
     decor=[('rockSnow', 16, 2.4, 1.4), ('rockSnow', 24, 13.4, 1.3), ('pineSnow', 7, 2.4, 1.2),
            ('rockSnow', 33, 6.5, 1.1), ('pineSnow', 11, 13.4, 1.1)],
     heights=hoehen, hstep=hs,
     map=k.rows())

# ---------------------------------------------------------------- 7 Blankeis (der Gletscher beginnt)
k = Karte(34, 15)
k.rect(2, 4, 31, 11, 'i')                          # alles Eis - auf dem Gletscher waechst nichts an
k.rect(2, 4, 5, 11, '#')                           # nur die Startzunge ist Schnee
k.rect(13, 7, 14, 8, 'x'); k.rect(22, 5, 23, 6, 'x')
k.put(3, 7, 'T'); k.put(29, 8, 'H')
hoehen, schraegen, hs = hang(k, [], 0.7, 5.2)
bahn(name='Blankeis', par=4, theme='glacier', maxStrokes=16, seed=307, dichte=0.12,
     schnee=SCHNEE_WACHS,
     intro='Der Gletscher, und damit die Umkehrung: Hier ist alles Eis. Der Ball setzt nichts an – '
           'im Gegenteil, was er mitgebracht hat, streift er gleich auf den ersten Metern ab. '
           'Dafür bremst nichts mehr. Ein Schlag, der auf Schnee genau richtig war, ist hier '
           'doppelt zu viel.',
     obstacles=[windfahne(k, 'Blankeis', 17, 10.5, kraft=1.3)] + schraegen,
     decor=[('rockSnow', 17, 2.4, 1.4), ('rockSnow', 9, 13.4, 1.3), ('rockSnow', 27, 13.4, 1.2),
            ('rockSnow', 33, 7.5, 1.1), ('rockSnow', 0.8, 5.5, 1)],
     heights=hoehen, hstep=hs,
     map=k.rows())

# ---------------------------------------------------------------- 8 Gletscherspalten (Schmelzwasser, kein Wind)
k = Karte(36, 16)
k.rect(2, 4, 33, 12, 'i')
k.rect(2, 4, 5, 12, '#')
for sx in (11, 18, 25):                            # drei Spalten, in zweien steht Schmelzwasser
    k.rect(sx, 4, sx + 1, 12, '.')
k.rect(11, 7, 12, 9, 'w'); k.rect(25, 7, 26, 9, 'w')
# Ueber jede der beiden aeusseren Spalten fuehrt ein schmaler Eissteg, und zwar versetzt: einmal
#    oben, einmal unten. Ohne ihn waere die Spalte nur mit einem Flug zu nehmen, und die Bahn
#    haette keinen Weg mehr. Mit ihm ist sie eine Frage des Zielens.
k.rect(11, 4, 12, 5, 'i'); k.rect(25, 11, 26, 12, 'i')
k.rect(18, 7, 19, 9, '#')                          # ueber die mittlere fuehrt eine Waechte
k.put(3, 8, 'T'); k.put(31, 8, 'H')
hoehen, schraegen, hs = hang(k, [], 0.7, 5.2)
bahn(name='Gletscherspalten', par=5, theme='glacier', maxStrokes=18, seed=308, dichte=0.1,
     schnee=SCHNEE_WACHS,
     # Auch hier kein Windsack: Der Einleitungstext sagt, in der Spalte sei es still - dann darf
     # am Rand nicht doch einer wehen.
     ohneDeko=['windsock'],
     intro='Drei Spalten queren den Gletscher. In zweien steht Schmelzwasser – das ist das erste '
           'offene Wasser dieser Welt, und es kostet einen Schlag. Über die mittlere führt eine '
           'Wächte, die genau einmal trägt. Wind gibt es hier nicht: In der Spalte ist es still.',
     obstacles=[schneebruecke([k], 'Gletscherspalten', 18, 7, 2, 3)] + schraegen,
     decor=[('rockSnow', 8, 2.4, 1.3), ('rockSnow', 22, 14.4, 1.4), ('rockSnow', 33, 2.4, 1.2),
            ('rockSnow', 14, 14.4, 1.1), ('rockSnow', 0.8, 13.5, 1)],
     heights=hoehen, hstep=hs,
     map=k.rows())

# ---------------------------------------------------------------- 9 Eisbruch (Gondel ueber dem Bruch)
k = Karte(36, 16)
k.rect(2, 4, 14, 12, 'i')
k.rect(22, 4, 33, 12, 'i')
k.rect(2, 4, 4, 12, '#')
k.rect(24, 5, 27, 7, '#')                          # eine Schneezunge drueben - dort setzt er wieder an
k.rect(9, 6, 10, 9, 'w')                           # ein Wasserloch mitten im Eis
for (bx, by) in [(28, 10), (31, 6)]:
    k.rect(bx, by, bx + 1, by, 'x')
k.put(3, 8, 'T'); k.put(31, 9, 'H')
hoehen, schraegen, hs = hang(k, [], 0.7, 5.4)
bahn(name='Eisbruch', par=5, theme='glacier', maxStrokes=18, seed=309, dichte=0.1,
     schnee=SCHNEE_WACHS,
     intro='Der Gletscher bricht ab. Über den Bruch fährt eine Gondel, und drüben liegt eine '
           'Schneezunge, die den Ball wieder ansetzen lässt – kurz vor dem Loch. Dazu ein '
           'Wasserloch mitten im Eis und eine Lawine, die von oben kommt. Hier hilft nur, den '
           'Weg vorher im Kopf zu haben.',
     obstacles=[seilbahn([k], 'Eisbruch', 13, 8.5, 23, 8.5, wait=2.2, travel=3.0),
                lawine(k, 'Eisbruch', 24, 4, 33, 13, 90, phase=0.3),
                windfahne(k, 'Eisbruch', 6, 11.5, kraft=1.35)] + schraegen,
     decor=[('rockSnow', 18, 2.4, 1.5), ('rockSnow', 18, 14.4, 1.4), ('rockSnow', 33, 14.4, 1.2),
            ('rockSnow', 0.8, 2.5, 1.1)],
     heights=hoehen, hstep=hs,
     map=k.rows())

# ---------------------------------------------------------------- 10 Der Grat (Tiefschnee, kein Eis unterwegs)
k = Karte(34, 17)
k.rect(2, 7, 31, 9)                                # der Grat: drei Felder breit, sonst Abgrund
k.rect(6, 7, 9, 9, 's'); k.rect(17, 7, 20, 9, 's')  # zwei Tiefschneefelder auf dem Grat
k.rect(26, 7, 29, 9, 'i')
k.rect(13, 6, 15, 10, '#')                         # eine Verbreiterung zum Durchatmen
k.put(3, 8, 'T'); k.put(30, 8, 'H')
hoehen, schraegen, hs = hang(k, [12, 23], 0.8, 5.6)
bahn(name='Der Grat', par=5, theme='summit', maxStrokes=18, seed=310, dichte=0.08,
     schnee=SCHNEE_WACHS,
     intro='Drei Felder breit, links und rechts nichts. Auf dem Grat liegen zwei Felder '
           'Tiefschnee – dort bremst der Ball, und dort setzt er am meisten an. Das Eis kommt '
           'erst ganz am Ende, drei Felder vor dem Loch: Bis dahin muss man den dicken Ball über '
           'den Grat bringen, ohne ihn hinunterzuschießen.',
     obstacles=[windfahne(k, 'Der Grat', 16, 8, kraft=1.45)] + schraegen,
     decor=[('rockSnow', 16, 3.4, 1.4), ('rockSnow', 8, 14.4, 1.3), ('rockSnow', 24, 14.4, 1.2),
            ('rockSnow', 33, 3.4, 1.1), ('rockSnow', 0.8, 13.5, 1)],
     heights=hoehen, hstep=hs,
     map=k.rows())

# ---------------------------------------------------------------- 11 Ueber den Wolken (zweite Etage)
k = Karte(36, 17)
k.rect(2, 8, 16, 12)
k.rect(21, 8, 33, 12)
k.rect(12, 9, 15, 11, 'i')
k.put(3, 10, 'T')
o1 = Karte(36, 17)
o1.rect(20, 3, 33, 8)                              # die Wolkenetage
o1.rect(24, 4, 27, 6, 's')                         # Tiefschnee oben
o1.rect(29, 5, 29, 6, 'x'); o1.rect(23, 7, 23, 7, 'x')   # Deckung vor der Lawine
o1.rect(28, 4, 30, 7, 'i')                         # die Eisplatte auf der Wolke
o1.put(31, 6, 'H')
hoehen, schraegen, hs = hang(k, [24], 0.8, 5.6)
bahn(name='Über den Wolken', par=5, theme='summit', maxStrokes=18, seed=311, dichte=0.09,
     schnee=SCHNEE_WACHS,
     intro='Der Berg reicht in die Wolken, und das Loch liegt oben. Hinauf führt nur die Gondel. '
           'Das Eis liegt unten, vor der Talstation – oben gibt es keines mehr, dafür Tiefschnee. '
           'Wer zu dick einsteigt, steigt zu dick aus.',
     obstacles=[seilbahn([k, o1], 'Über den Wolken', 15, 10.5, 22, 6.5, ziel=1, wait=2.4, travel=3.2),
                windfahne(k, 'Über den Wolken', 8, 11.5, kraft=1.5),
                lawine(o1, 'Über den Wolken', 22, 3, 32, 8, 90, phase=0.5, ebene=1)] + schraegen,
     decor=[('cloud', 18, 4.4, 1.6), ('cloud', 7, 4.4, 1.4), ('cloud', 28, 15.4, 1.5),
            ('cloud', 12, 15.4, 1.3), ('rockSnow', 0.8, 14.5, 1.1)],
     heights=hoehen, hstep=hs,
     map=k.rows(), ebenen=[o1.rows()])

# ---------------------------------------------------------------- 12 Der Gipfel (Hoehepunkt)
k = Karte(36, 20)
k.rect(2, 13, 18, 18)
k.rect(6, 14, 9, 17, 'i')
k.put(3, 15, 'T')
o1 = Karte(36, 20)
o1.rect(14, 7, 30, 12)
o1.rect(18, 8, 21, 11, 's')
o1.rect(24, 8, 25, 12, '.')                        # ein Spalt auf der mittleren Etage
o1.rect(24, 8, 25, 10, '#')                        # darueber die Waechte - sie traegt einmal
o2 = Karte(36, 20)
o2.rect(22, 2, 33, 6)
o2.rect(26, 3, 28, 5, 'i')                         # die letzte Eisplatte, direkt vor dem Gipfelloch
o2.rect(29, 5, 29, 6, 'x'); o2.rect(24, 2, 24, 2, 'x')   # Deckung vor der Gipfellawine
o2.put(31, 4, 'H')
hoehen, schraegen, hs = hang(k, [], 0.8, 5.8)
# Par 8, nicht 6: Der Bot braucht im Schnitt 9,4 Schlaege und im Median 11, und die Verteilung
# ist zweigeteilt (4-8 gegen 11-15) - wer eine Etage wieder hinunterfaellt, faehrt den Aufstieg
# noch einmal. Die Bahn ist dabei nie am Limit (hoechstens 15 von 22). Zu aendern war also nicht
# die Bahn, sondern die Zahl, die behauptet, was gutes Spiel hier heisst.
bahn(name='Der Gipfel', par=8, theme='summit', maxStrokes=22, seed=312, dichte=0.08,
     schnee=SCHNEE_WACHS,
     intro='Drei Etagen bis zum Gipfel, zwei Gondeln dazwischen, und ganz oben die letzte '
           'Eisplatte drei Felder vor dem Loch. Der Wind ist hier am stärksten, der Tiefschnee auf '
           'der mittleren Etage am tiefsten, und über dem Spalt liegt eine Wächte, die einmal '
           'trägt. Alles, was der Berg kann, auf einer Bahn.',
     obstacles=[seilbahn([k, o1, o2], 'Der Gipfel', 17, 15.5, 15, 11.5, ziel=1, wait=2.4, travel=3.2),
                seilbahn([k, o1, o2], 'Der Gipfel', 29, 9.5, 23, 4.5, ebene=1, ziel=2, wait=2.4, travel=3.2),
                schneebruecke([k, o1, o2], 'Der Gipfel', 24, 8, 2, 3, ebene=1),
                windfahne(k, 'Der Gipfel', 12, 17, kraft=1.6),
                lawine(o2, 'Der Gipfel', 23, 2, 32, 6, 90, phase=0.35, ebene=2)] + schraegen,
     decor=[('cloud', 20, 2.4, 1.6), ('cloud', 8, 4.4, 1.4), ('cloud', 30, 17.4, 1.5),
            ('cloud', 24, 18.6, 1.3), ('rockSnow', 0.8, 19.4, 1.1)],
     heights=hoehen, hstep=hs,
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
    if b.get('heights'):
        hoehenpruefung(b['name'], rows, b['heights'], b['obstacles'])
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
    if b.get('schnee'):
        teile.append("    schnee: %s,\n" % g(b['schnee']))
    teile.append("    intro: '%s',\n" % b['intro'].replace("'", "\\'"))
    teile.append("    map: [\n%s\n    ],\n" % js_map(b['map']))
    if b.get('heights'):
        teile.append("    heights: [\n%s\n    ],\n" % js_map(b['heights']))
        teile.append("    hStep: %s,\n" % g(b['hstep']))
    if b.get('ebenen'):
        teile.append("    ebenen: [\n%s\n    ],\n"
                     % '\n'.join("      [\n%s\n      ]," % js_map(e, "  ") for e in b['ebenen']))
    teile.append("    obstacles: [\n" + '\n'.join('      %s,' % o for o in b['obstacles']) + "\n    ],\n")
    teile.append("    decor: [\n%s\n    ],\n" % js_decor(b['decor']))
    if b.get('views'):
        teile.append("    views: [\n" + '\n'.join('      %s,' % v for v in b['views']) + "\n    ],\n")
    ohne = b.get('ohneDeko')
    ohne_js = (", ohne: [%s]" % ', '.join("'%s'" % t for t in ohne)) if ohne else ''
    teile.append("    autoDecor: { density: %s, seed: %d%s },\n" % (b['dichte'], b['seed'], ohne_js))
    teile.append("  },\n")
teile.append("];\n")

ziel = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'courses_snow.js')
open(ziel, 'w', encoding='utf-8').write(''.join(teile))
print('geschrieben')
