# -*- coding: utf-8 -*-
"""Baut die Bahnen der Welt „Die Flut" und prüft sie, bevor sie geschrieben werden.

    python3 tools/flut.py

WARUM DIESE WELT EIN EIGENES WERKZEUG BRAUCHT
Die erste Fassung ließ das Wasser über die *ganze* Bahn steigen. Gut gedacht, schlecht zu spielen:
Wer den Augenblick verpaßte, konnte nichts tun als warten, bis es zurückging. Warten ist kein
Druck, Warten ist Leerlauf.

Jetzt sind es BECKEN an einzelnen Stellen, und daraus folgen die beiden Regeln, die dieses Werkzeug
durchsetzt – die Regeln gegen das Warten:

  1. ES GIBT IMMER EINEN TROCKENEN WEG. Auch wenn jedes Becken der Bahn randvoll steht, muß ein Weg
     vom Abschlag zum Loch führen. Dann ist das Becken die *kurze* Möglichkeit, nicht die einzige:
     Wer den Takt trifft, spart einen Schlag; wer ihn nicht trifft, spielt außen herum und verliert
     Zeit, aber nicht die Bahn. Niemand muß je stehenbleiben und zusehen.

  2. DER TAKT BLEIBT KURZ. Wie lange ein Becken braucht, hängt an seiner Tiefe, und die hängt an
     seiner Breite: Es läuft von außen nach innen voll, ein Ring je Takt. Ein breites Becken ist
     darum eine lange Wartezeit – und nichts anderes war der Fehler von vorhin. Hier ist bei
     FLUT_GEDULD Schluß.

Dazu die Selbstverständlichkeiten: Abschlag und Loch liegen nicht im Becken, jedes Becken liegt
wirklich auf der Bahn, und ein Becken, das nie zugeht, ist keines.

KARTENLEGENDE wie in courses.js: '#' Boden, '.' offenes Wasser/Abgrund, 'T' Abschlag, 'H' Loch,
'x' Block, 'w' Wasser, 's' bremsender Grund (hier: Schlick), 'i' Eis (hier: nasser Stein).
"""
import io
from collections import deque

# Müssen zu src/obstacles_flut.js passen – tools/flut.mjs vergleicht die Zahlen
FLUT_START = 2.5
FLUT_TAKT = 1.2
FLUT_MAX = 4
FLUT_HALT = 1.0
FLUT_LEER = 5.0
FLUT_GEDULD = 15.0       # so lange darf ein Lauf höchstens dauern

BODEN = set('#siwlTHoABCDEF')     # alles, was das Spiel als Boden zählt
TROCKEN = set('#siTHoABCDEF')     # davon das, was ein Becken fluten kann


def leer(b, h, z='.'):
    return [[z] * b for _ in range(h)]


def fuell(f, x0, y0, x1, y1, z='#'):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            f[y][x] = z


def setz(f, x, y, z):
    f[y][x] = z


def txt(f):
    return [''.join(r) for r in f]


BAHNEN = []


def bahn(name, theme, karte, hindernisse=None, par=3, intro=None, maxStrokes=None):
    b = {'name': name, 'par': par, 'theme': theme, 'map': txt(karte),
         'obstacles': hindernisse or []}
    if intro: b['intro'] = intro
    if maxStrokes: b['maxStrokes'] = maxStrokes
    BAHNEN.append(b)


def becken(x0, y0, x1, y1, start=FLUT_START, takt=FLUT_TAKT, halt=FLUT_HALT, leer_=FLUT_LEER):
    """Ein Flutbecken über die Kacheln x0..x1 / y0..y1 (beide Enden eingeschlossen).

    Die Maschine rechnet mit Mitte und Kantenlänge wie alle Flächenhindernisse; hier steht es in
    Kacheln, weil man Bahnen in Kacheln baut und sich sonst bei jedem Becken um eine halbe
    verzählt."""
    return {'type': 'flut',
            'x': (x0 + x1 + 1) / 2, 'y': (y0 + y1 + 1) / 2,
            'w': x1 - x0 + 1, 'h': y1 - y0 + 1,
            'start': start, 'takt': takt, 'halt': halt, 'leer': leer_}


def pumpwerk(x, y, r=0.8, dauer=4):
    return {'type': 'pumpwerk', 'x': x, 'y': y, 'r': r, 'dauer': dauer}


def strom(x0, y0, x1, y1, angle, tempo=None, kraft=None, puls=0, phase=0.0):
    """Ein Strömungsband über die Kacheln x0..x1 / y0..y1. 'angle' in Grad: 0 nach rechts,
    90 nach unten, 180 nach links, 270 nach oben – wie überall im Spiel."""
    o = {'type': 'stroemung', 'x': (x0 + x1 + 1) / 2, 'y': (y0 + y1 + 1) / 2,
         'w': x1 - x0 + 1, 'h': y1 - y0 + 1, 'angle': angle}
    if tempo is not None: o['tempo'] = tempo
    if kraft is not None: o['kraft'] = kraft
    if puls: o['puls'] = puls; o['phase'] = phase
    return o


def strudel(x, y, r=2.4, dreh=1):
    return {'type': 'strudel', 'x': x, 'y': y, 'r': r, 'dreh': dreh}


def fass(x, y, r=0.65):
    return {'type': 'bumper', 'x': x, 'y': y, 'r': r, 'style': 'fass'}


def grenzen(o):
    return (round(o['x'] - o['w'] / 2), round(o['y'] - o['h'] / 2),
            round(o['x'] + o['w'] / 2) - 1, round(o['y'] + o['h'] / 2) - 1)


# ---------------------------------------------------------------- Ringnummern
def ringe(karte, o):
    """Dieselbe Vielquellen-Breitensuche wie src/obstacles_flut.js – vom Beckenrand nach innen.

    Sie hier noch einmal zu schreiben ist Absicht: Stimmten die beiden nicht überein, würde eine
    Bahn hier durchgehen und im Spiel absaufen. tools/flut.mjs vergleicht darum die Zahlen aus
    dieser Rechnung mit denen der laufenden Maschine."""
    H, W = len(karte), len(karte[0])
    x0, y0, x1, y1 = grenzen(o)
    def trocken(x, y):
        return (x0 <= x <= x1 and y0 <= y <= y1
                and 0 <= x < W and 0 <= y < H and karte[y][x] in TROCKEN)
    r = [[0] * W for _ in range(H)]
    q = deque()
    for y in range(H):
        for x in range(W):
            if not trocken(x, y): continue
            if all(trocken(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))): continue
            r[y][x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not trocken(nx, ny) or r[ny][nx]: continue
            r[ny][nx] = r[y][x] + 1
            q.append((nx, ny))
    return r


def tiefe(r):
    return max((max(z) for z in r), default=0)


def zyklus(o, t):
    m = max(1, min(o.get('max', t) or t, FLUT_MAX))
    return 2 * m * o['takt'] + o['halt'] + o['leer'], m


def finde(karte, z):
    for y, zeile in enumerate(karte):
        x = zeile.find(z)
        if x >= 0: return (x, y)
    return None


def verbunden(karte, nass, tee, cup):
    """Führt ein trockener Weg vom Abschlag zum Loch, wenn 'nass' geflutet ist?"""
    H, W = len(karte), len(karte[0])
    def begehbar(x, y):
        return 0 <= x < W and 0 <= y < H and karte[y][x] in TROCKEN and (x, y) not in nass
    gesehen = {tee}
    q = deque([tee])
    while q:
        x, y = q.popleft()
        if (x, y) == cup: return True
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n in gesehen or not begehbar(*n): continue
            gesehen.add(n); q.append(n)
    return False


def weglaenge(karte, nass, tee, cup):
    """Kürzester Weg in Feldern – um zu sehen, ob das Becken wirklich eine Abkürzung ist."""
    H, W = len(karte), len(karte[0])
    def begehbar(x, y):
        return 0 <= x < W and 0 <= y < H and karte[y][x] in TROCKEN and (x, y) not in nass
    d = {tee: 0}
    q = deque([tee])
    while q:
        x, y = q.popleft()
        if (x, y) == cup: return d[(x, y)]
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n in d or not begehbar(*n): continue
            d[n] = d[(x, y)] + 1; q.append(n)
    return None


def pruefe(b):
    fehler = []
    karte = b['map']
    tee, cup = finde(karte, 'T'), finde(karte, 'H')
    if not tee: fehler.append('kein Abschlag'); return fehler, None
    if not cup: fehler.append('kein Loch'); return fehler, None
    becken_ = [o for o in b['obstacles'] if o['type'] == 'flut']

    nass_voll = set()
    laeufe = []
    for o in becken_:
        r = ringe(karte, o)
        t = tiefe(r)
        if t == 0:
            fehler.append('ein Becken liegt auf keinem Boden'); continue
        z, m = zyklus(o, t)
        laeufe.append(z)
        if z > FLUT_GEDULD:
            fehler.append(f'ein Becken braucht {z:.1f} s für einen Lauf – zu lang zum Warten '
                          f'(Tiefe {t}; ein schmaleres Becken ist schneller)')
        for y, zeile in enumerate(r):
            for x, n in enumerate(zeile):
                if 0 < n <= m: nass_voll.add((x, y))
        if (tee in nass_voll) or (cup in nass_voll):
            fehler.append('Abschlag oder Loch liegt im Becken')

    # Regel 1: Es gibt immer einen trockenen Weg – auch wenn alle Becken randvoll stehen.
    if not verbunden(karte, nass_voll, tee, cup):
        fehler.append('bei vollen Becken führt kein Weg mehr zum Loch – dann muß man warten, '
                      'und genau das soll nicht sein')

    # Und ein Becken, das nichts verkürzt, ist Zierrat: Der Weg durch das leere Becken muß kürzer
    # sein als der Umweg, sonst nimmt ihn niemand und die Maschine läuft für nichts.
    kurz = weglaenge(karte, set(), tee, cup)
    lang = weglaenge(karte, nass_voll, tee, cup)
    if becken_ and kurz is not None and lang is not None and lang <= kurz + 1:
        fehler.append(f'der Umweg ist genauso kurz wie der Weg durchs Becken ({kurz} gegen {lang} '
                      'Felder) – dann nimmt niemand das Becken')

    # Eine Strömung über dem Abschlag hieße: Man kommt nie zum Zielen. Über dem Loch hieße: Der
    # Ball wird davor weggetragen, egal wie gut man trifft. Beides ist kein Hindernis, sondern eine
    # kaputte Bahn – und beides sieht man ihr beim Bauen nicht an.
    for o in b['obstacles']:
        if o['type'] == 'stroemung':
            x0, y0, x1, y1 = grenzen(o)
            for name, (px, py) in (('Abschlag', tee), ('Loch', cup)):
                if x0 <= px <= x1 and y0 <= py <= y1:
                    fehler.append(f'eine Strömung liegt über dem {name}')
            if not any(karte[y][x] in TROCKEN
                       for y in range(max(0, y0), min(len(karte), y1 + 1))
                       for x in range(max(0, x0), min(len(karte[0]), x1 + 1))):
                fehler.append('eine Strömung liegt auf keinem Boden')
        if o['type'] == 'strudel':
            for name, (px, py) in (('Abschlag', tee), ('Loch', cup)):
                if (px + 0.5 - o['x']) ** 2 + (py + 0.5 - o['y']) ** 2 < (o['r'] + 0.6) ** 2:
                    fehler.append(f'ein Strudel greift bis an den {name}')

    # Jede Bahn dieser Welt braucht wenigstens eine ihrer Maschinen, sonst könnte sie überall stehen
    eigene = {'flut', 'pumpwerk', 'stroemung', 'strudel'}
    if not any(o['type'] in eigene for o in b['obstacles']):
        fehler.append('keine Maschine der Welt auf dieser Bahn')

    felder = sum(1 for z in karte for c in z if c in BODEN)
    return fehler, {'breit': len(karte[0]), 'hoch': len(karte), 'felder': felder,
                    'becken': len(becken_), 'lauf': max(laeufe) if laeufe else 0,
                    'kurz': kurz, 'lang': lang, 'nass': len(nass_voll)}


# ================================================================ Die Bahnen
# Zwölf Bahnen, drei je Tiefe. Die Welt ist ein Abstieg: von dicht unter der Oberfläche bis auf den
# Meeresgrund, und jeder Abschnitt bringt eine Maschine dazu.
#
#   Bahn  1-3   wasserlinie   Becken, dann die erste Strömung
#   Bahn  4-6   flachwasser   Pumpwerk und der erste Strudel
#   Bahn  7-9   daemmerzone   alles zusammen, in der versunkenen Stadt
#   Bahn 10-12  meeresgrund   Dünung, Gegenströmungen, und zuletzt alles auf einmal
#
# Becken sind mit Absicht flach: Sie laufen von außen nach innen voll, ein Ring je Takt, und die
# Tiefe ist die halbe kürzere Kante. Vier Kacheln kurze Kante heißt Tiefe 2 heißt ein Lauf von
# knapp elf Sekunden – ein Takt wie beim Mühlrad. Sechs Kacheln wären schon dreizehn.

# ---------------------------------------------------------------- Wasserlinie
# --- 1: das Hafenbecken im Kai. Quer hindurch ist es kurz, außen herum sicher.
f = leer(32, 17)
fuell(f, 2, 2, 29, 14)
setz(f, 5, 8, 'T'); setz(f, 26, 8, 'H')
fuell(f, 11, 6, 20, 9, 's')
fuell(f, 11, 5, 20, 5, 'x')
fuell(f, 11, 10, 20, 10, 'x')
bahn('Das Hafenbecken', 'wasserlinie', f, par=3,
     intro='Dicht unter der Oberfläche: Die Sonne steht noch im Wasser. Das Becken läuft im Takt '
           'voll und wieder leer – steht es leer, geht es geradeaus hindurch, steht es voll, spielt '
           'man oben oder unten herum. Warten muß man nie.',
     hindernisse=[becken(11, 6, 20, 9)])

# --- 2: der Priel. Die erste Strömung, und sie steht quer zum Weg.
f = leer(32, 17)
fuell(f, 2, 2, 29, 14)
setz(f, 5, 8, 'T'); setz(f, 26, 8, 'H')
fuell(f, 13, 3, 18, 13, 's')        # der Priel: sandiger Grund, durch den es zieht
bahn('Der Priel', 'wasserlinie', f, par=3,
     intro='Ein Priel zieht quer über den Grund. Wer geradeaus spielt, kommt schräg an – man muß '
           'gegen die Strömung halten. Sie trägt auch einen Ball, der schon liegt: In ihr kann man '
           'nicht in Ruhe zielen.',
     hindernisse=[strom(13, 3, 18, 13, 90, tempo=4.0),
                  fass(11.5, 5.5), fass(20.5, 11.5)])

# --- 3: die Mole. Strömung und Becken zusammen – die Strömung hilft, wenn man sie nimmt.
f = leer(34, 17)
fuell(f, 2, 2, 31, 14)
setz(f, 5, 8, 'T'); setz(f, 30, 8, 'H')
fuell(f, 10, 2, 11, 6, 'x')         # die Mole ragt von oben herein: der hohe Weg ist zu
fuell(f, 12, 9, 17, 12, 's')        # dahinter schiebt es nach rechts
fuell(f, 20, 6, 27, 9, 's')         # und dann das Becken, quer im Weg
fuell(f, 20, 5, 27, 5, 'x')
fuell(f, 20, 10, 27, 10, 'x')
bahn('Die Mole', 'wasserlinie', f, par=4,
     intro='Die Mole nimmt den hohen Weg. Unten herum schiebt die Strömung nach rechts – wer sie '
           'mitnimmt, spart einen Schlag; dahinter liegt das Becken quer vor dem Loch.',
     hindernisse=[strom(12, 9, 17, 12, 0, tempo=5.0), becken(20, 6, 27, 9)])

# ---------------------------------------------------------------- Flachwasser
# --- 4: die Sandbank. Zwei versetzte Becken und das Pumpwerk.
f = leer(36, 17)
fuell(f, 2, 2, 33, 14)
setz(f, 5, 8, 'T'); setz(f, 30, 8, 'H')
fuell(f, 11, 6, 16, 9, 's')
fuell(f, 21, 6, 26, 9, 's')
fuell(f, 11, 5, 16, 5, 'x')
fuell(f, 21, 10, 26, 10, 'x')
bahn('Die Sandbank', 'flachwasser', f, par=4,
     intro='Tiefer, und das Licht wird grün. Zwei Becken hintereinander, jedes zur anderen Seite '
           'hin gemauert: Wer sie umgeht, fährt Zickzack. Unten links liegt das Pumpwerk – wer '
           'darüberrollt, hält beide vier Sekunden lang leer.',
     hindernisse=[becken(11, 6, 16, 9), becken(21, 6, 26, 9, start=4.4), pumpwerk(5.5, 12.5)])

# --- 5: der Seegraswald. Der erste Strudel, mittendrin.
f = leer(34, 19)
fuell(f, 2, 2, 31, 16)
setz(f, 5, 9, 'T'); setz(f, 28, 9, 'H')
fuell(f, 9, 3, 10, 15, 'x')         # Seegrasdickicht als Wand, mit zwei Durchlässen
fuell(f, 9, 7, 10, 8, '#')
fuell(f, 9, 11, 10, 12, '#')
bahn('Der Seegraswald', 'flachwasser', f, par=3,   # Bot: Median 2
     intro='Zwischen den Halmen gibt es zwei Durchlässe, und dahinter dreht sich das Wasser. Der '
           'Strudel hält niemanden fest – er wirft nur woandershin, als man wollte.',
     hindernisse=[strudel(18.5, 9.5, 3.0, dreh=1), fass(24.5, 5.5), fass(24.5, 13.5)])

# --- 6: die Rinne. Eine lange Strömung, auf der man reitet, und am Ende ein Becken.
f = leer(38, 17)
fuell(f, 2, 2, 35, 14)
setz(f, 4, 8, 'T'); setz(f, 32, 8, 'H')
fuell(f, 7, 7, 24, 9, 's')          # die Rinne
fuell(f, 7, 6, 24, 6, 'x')
fuell(f, 7, 10, 24, 10, 'x')
fuell(f, 26, 5, 30, 12, 's')        # Becken am Ende der Rinne
bahn('Die Rinne', 'flachwasser', f, par=4,
     intro='Die Rinne trägt weit – man muß sie nur treffen. Am Ende wartet ein Becken quer vor dem '
           'Loch; wer zu schnell ankommt, landet darin.',
     hindernisse=[strom(7, 7, 24, 9, 0, tempo=6.0), becken(26, 5, 30, 12)])

# ---------------------------------------------------------------- Dämmerzone
# --- 7: die Gassen. Geradeaus steht ein Haus, links und rechts säuft es ab.
f = leer(34, 19)
fuell(f, 2, 2, 31, 16)
setz(f, 5, 9, 'T'); setz(f, 28, 9, 'H')
fuell(f, 12, 9, 19, 9, 'x')
fuell(f, 12, 6, 19, 8, 's')
fuell(f, 12, 10, 19, 12, 's')
bahn('Die Gassen', 'daemmerzone', f, par=3,
     intro='In der Dämmerzone steht die Stadt. Geradeaus versperrt ein Haus den Weg; links und '
           'rechts daran vorbei laufen zwei Gassen, und beide saufen im Takt voll. Wer keine '
           'erwischt, spielt ganz außen herum.',
     hindernisse=[becken(12, 6, 19, 8), becken(12, 10, 19, 12, start=4.4)])

# --- 8: der Marktplatz. Zwei Becken auf dem Weg, dazwischen der Brunnenstrudel.
f = leer(36, 21)
fuell(f, 2, 2, 33, 18)
setz(f, 5, 10, 'T'); setz(f, 30, 10, 'H')
fuell(f, 9, 8, 14, 11, 's')         # Becken vor dem Brunnen
fuell(f, 9, 7, 14, 7, 'x')
fuell(f, 9, 12, 14, 12, 'x')
fuell(f, 22, 8, 27, 11, 's')        # und eines dahinter
fuell(f, 22, 7, 27, 7, 'x')
fuell(f, 22, 12, 27, 12, 'x')
bahn('Der Marktplatz', 'daemmerzone', f, par=4,
     intro='Über dem alten Brunnen mitten auf dem Platz dreht sich das Wasser. Davor und dahinter '
           'liegt je ein Becken – wer beide im richtigen Augenblick nimmt, geht geradeaus durch '
           'und wird vom Brunnen doch noch versetzt.',
     hindernisse=[becken(9, 8, 14, 11), strudel(18.5, 10.5, 3.4, dreh=-1),
                  becken(22, 8, 27, 11, start=4.4)])

# --- 9: die Kaimauer. Eine lange Mauer trennt unten von oben; das Becken ist das Tor darin.
f = leer(38, 21)
fuell(f, 2, 2, 35, 18)
setz(f, 5, 15, 'T'); setz(f, 32, 5, 'H')
# Die Kaimauer geht fast über die ganze Breite. Sie muß es: Läßt man ein Ende offen, ist der Weg
# drumherum genauso kurz wie der durchs Tor (beides bergauf und nach rechts, kein Umweg), und das
# Tor wäre Zierrat. Offen bleibt nur ein schmaler Durchlaß ganz links – hinter dem Abschlag, so
# daß man dafür erst zurück muß. 
fuell(f, 4, 9, 35, 9, 'x')
fuell(f, 16, 7, 21, 10, 's')        # das Tor darin: ein Becken, das im Takt zuläuft
fuell(f, 4, 4, 29, 6, 's')          # oben zieht es nach rechts, zum Loch hin
bahn('Die Kaimauer', 'daemmerzone', f, par=4,   # Bot: Median 3
     intro='Die Kaimauer trennt unten von oben, und das einzige Tor darin ist ein Becken. Ist es '
           'voll, muß man ganz außen herum. Oben zieht die Strömung nach rechts – bis vor das Loch.',
     hindernisse=[becken(16, 7, 21, 10), strom(4, 4, 29, 6, 0, tempo=6.5), pumpwerk(5.5, 11.5)])

# ---------------------------------------------------------------- Meeresgrund
# --- 10: der Grund. Weit, dunkel, ein langes Becken quer davor.
f = leer(38, 19)
fuell(f, 2, 2, 35, 16)
setz(f, 5, 9, 'T'); setz(f, 32, 9, 'H')
fuell(f, 12, 7, 25, 10, 's')
fuell(f, 12, 6, 25, 6, 'x')
fuell(f, 12, 11, 25, 11, 'x')
bahn('Der Grund', 'meeresgrund', f, par=3,   # Bot: Median 2
     intro='Ganz unten. Von oben kommt kein Licht mehr – was leuchtet, leuchtet selbst. Quer vor '
           'dem Loch liegt ein langes Becken; der Umweg ist weit. Links unten das Pumpwerk.',
     hindernisse=[becken(12, 7, 25, 10), pumpwerk(6.5, 14.5)])

# --- 11: das Kaltwasserfeld. Zwei Strömungen gegeneinander, dazwischen ein Strudel.
f = leer(38, 21)
fuell(f, 2, 2, 35, 18)
setz(f, 5, 10, 'T'); setz(f, 32, 10, 'H')
fuell(f, 11, 3, 26, 7, 's')         # obere Strömung: nach rechts
fuell(f, 11, 13, 26, 17, 's')       # untere: nach links
fuell(f, 11, 8, 26, 8, 'x')
fuell(f, 11, 12, 26, 12, 'x')
bahn('Das Kaltwasserfeld', 'meeresgrund', f, par=4,   # Bot: Median 2, aber die Dünung kostet einen Menschen Schläge
     intro='Zwei Strömungen laufen gegeneinander, oben nach rechts, unten nach links – und beide '
           'als Dünung: Sie schwellen an und wieder ab. Dazwischen bleibt eine schmale Gasse, und '
           'in ihrer Mitte dreht sich das Wasser.',
     hindernisse=[strom(11, 3, 26, 7, 0, tempo=6.0, puls=0.55),
                  strom(11, 13, 26, 17, 180, tempo=6.0, puls=0.55, phase=3.14),
                  strudel(18.5, 10.5, 2.6, dreh=1)])

# --- 12: der Schlund. Alles auf einmal – das Ende der Welt.
f = leer(40, 21)
fuell(f, 2, 2, 37, 18)
setz(f, 5, 10, 'T'); setz(f, 34, 10, 'H')
fuell(f, 9, 4, 14, 7, 's')          # erstes Becken
fuell(f, 9, 13, 14, 16, 's')        # zweites Becken
fuell(f, 9, 8, 14, 12, 'x')         # dazwischen ein Block: beide Becken sind die Durchlässe
fuell(f, 17, 4, 24, 16, 's')        # das Feld des Strudels
fuell(f, 27, 6, 32, 9, 's')         # letztes Becken vor dem Loch
fuell(f, 27, 5, 32, 5, 'x')
fuell(f, 27, 10, 32, 10, 'x')
bahn('Der Schlund', 'meeresgrund', f, par=5,
     intro='Das Ende: zwei Becken als einzige Durchlässe, dahinter ein Feld, über das es zieht und '
           'in dessen Mitte sich alles dreht, und ganz zuletzt noch ein Becken vor dem Loch. Das '
           'Pumpwerk liegt unten links, hinter dem Abschlag – wer es will, muß zurück.',
     hindernisse=[becken(9, 4, 14, 7), becken(9, 13, 14, 16, start=4.4),
                  strom(17, 4, 24, 16, 0, tempo=5.0, puls=0.5),
                  strudel(20.5, 10.5, 3.0, dreh=-1),
                  becken(27, 6, 32, 9, start=2.0),
                  pumpwerk(5.5, 17.5)])


# ================================================================ Prüfen
fehler_gesamt = 0
for b in BAHNEN:
    fehler, z = pruefe(b)
    for fe in fehler:
        print(f"FEHLER  {b['name']}: {fe}")
        fehler_gesamt += 1
    if z:
        print(f"  {b['name']:<16} {z['breit']:>2}x{z['hoch']:<2} {b['theme']:<7} Par {b['par']} · "
              f"{z['becken']} Becken · längster Lauf {z['lauf']:.1f} s · "
              f"Weg durchs Becken {z['kurz']}, außen herum {z['lang']} Felder")

if fehler_gesamt:
    raise SystemExit(f"\n{fehler_gesamt} Fehler – nichts geschrieben\n")


# ================================================================ Schreiben
def wert(v):
    if isinstance(v, str): return "'" + v.replace("'", "\\'") + "'"
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, float): return repr(round(v, 3))
    return repr(v)


def js(b):
    teile = [f"name: {wert(b['name'])}", f"par: {b['par']}", f"theme: {wert(b['theme'])}"]
    if 'maxStrokes' in b: teile.append(f"maxStrokes: {b['maxStrokes']}")
    kopf = '    ' + ', '.join(teile) + ',\n'
    if 'intro' in b: kopf += f"    intro: {wert(b['intro'])},\n"
    karte = ',\n      '.join(f"'{r}'" for r in b['map'])
    hind = ''
    if b['obstacles']:
        zeilen = ',\n      '.join('{ ' + ', '.join(f'{k}: {wert(v)}' for k, v in o.items()) + ' }'
                                  for o in b['obstacles'])
        hind = f",\n    obstacles: [\n      {zeilen},\n    ]"
    return f"  {{\n{kopf}    map: [\n      {karte},\n    ]{hind},\n  }}"


kopf = """/* Die Flut (Weltkennung 'flut'): die versunkene Stadt.
   Erzeugt von tools/flut.py – dort steht auch, warum die Bahnen so aussehen, wie sie aussehen.

   NOCH NICHT FERTIG. Zurzeit stehen hier zwei Probebahnen, an denen die Maschinen angesehen und
   gespielt werden können, bevor neun Bahnen darauf gebaut werden. Die Welt trägt darum in
   src/courses_pro.js die Kennzeichnung 'nurVorschau'; im Spiel taucht sie nicht auf.

   DAS FLUTBECKEN ist ein Hindernis wie das Wandertor oder die Falltür: Es läuft im Takt von außen
   nach innen voll und wieder leer, und solange es leer ist, geht der Weg hindurch. Ringsum bleibt
   die Bahn trocken und immer spielbar – **es gibt auf jeder Bahn einen Weg, der auch bei vollem
   Becken zum Loch führt** (tools/flut.py prüft das). Das Becken ist die Abkürzung, nicht die
   einzige Möglichkeit; warten muß man nie.

   Zuerst war die Flut eine Weltregel und stieg über die ganze Bahn. Das war gut gedacht und
   schlecht zu spielen: Wer den Augenblick verpaßte, konnte nur zusehen. Siehe src/obstacles_flut.js.

   Kartenlegende wie in courses.js: '#' Boden, '.' offenes Wasser, 'x' Block, 's' Schlick (bremst),
   'T' Abschlag, 'H' Loch. */
const FLUT_COURSES = [
"""
io.open('src/courses_flut.js', 'w', encoding='utf-8').write(
    kopf + ',\n'.join(js(b) for b in BAHNEN) + ',\n];\n')
print(f"\nsrc/courses_flut.js geschrieben – {len(BAHNEN)} Bahnen")
