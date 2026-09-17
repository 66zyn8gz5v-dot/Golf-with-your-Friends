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
    if not becken_:
        fehler.append('kein Becken – dann ist es keine Bahn dieser Welt')
        return fehler, None

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
    if kurz is not None and lang is not None and lang <= kurz + 1:
        fehler.append(f'der Umweg ist genauso kurz wie der Weg durchs Becken ({kurz} gegen {lang} '
                      'Felder) – dann nimmt niemand das Becken')

    felder = sum(1 for z in karte for c in z if c in BODEN)
    return fehler, {'breit': len(karte[0]), 'hoch': len(karte), 'felder': felder,
                    'becken': len(becken_), 'lauf': max(laeufe) if laeufe else 0,
                    'kurz': kurz, 'lang': lang, 'nass': len(nass_voll)}


# ================================================================ Die Bahnen
# Becken sind mit Absicht flach: Sie laufen von außen nach innen voll, ein Ring je Takt, und die
# Tiefe ist die halbe kürzere Kante. Vier Kacheln kurze Kante heißt Tiefe 2 heißt ein Lauf von
# knapp zwölf Sekunden – ein Takt wie beim Mühlrad. Sechs Kacheln wären schon fünfzehn.

# --- Bahn 1: das Hafenbecken mitten im Kai. Quer hindurch ist es kurz, außen herum sicher.
f = leer(32, 17)
fuell(f, 2, 2, 29, 14)
setz(f, 5, 8, 'T')
setz(f, 26, 8, 'H')
fuell(f, 11, 6, 20, 9, 's')         # der Beckengrund ist Schlick: bremst, wer zu fest durchzieht
fuell(f, 11, 5, 20, 5, 'x')         # Kaimauern oben und unten – der Umweg ist nicht geschenkt
fuell(f, 11, 10, 20, 10, 'x')
bahn('Das Hafenbecken', 'deich', f, par=3,
     intro='Das Becken läuft im Takt voll und wieder leer. Steht es leer, geht es geradeaus '
           'hindurch – das ist der kurze Weg. Steht es voll, spielt man oben oder unten herum und '
           'braucht einen Schlag mehr. Warten muß man nie.',
     hindernisse=[becken(11, 6, 20, 9)])

# --- Bahn 2: zwei Becken hintereinander, jedes zur anderen Seite hin gemauert. Wer beide umgeht,
#     fährt Zickzack; wer beide im richtigen Augenblick trifft, geht geradeaus.
f = leer(36, 17)
fuell(f, 2, 2, 33, 14)
setz(f, 5, 8, 'T')
setz(f, 30, 8, 'H')
fuell(f, 11, 6, 16, 9, 's')
fuell(f, 21, 6, 26, 9, 's')
fuell(f, 11, 5, 16, 5, 'x')         # das erste Becken ist oben zu: außen herum geht es unten lang
fuell(f, 21, 10, 26, 10, 'x')       # das zweite unten: also wieder hinauf
bahn('Zwei Becken', 'gassen', f, par=4,
     intro='Zwei Becken hintereinander, jedes zur anderen Seite hin gemauert: Wer sie umgeht, fährt '
           'Zickzack. Unten links liegt das Pumpwerk – wer darüberrollt, hält beide vier Sekunden '
           'lang leer.',
     hindernisse=[becken(11, 6, 16, 9), becken(21, 6, 26, 9, start=4.4), pumpwerk(5.5, 12.5)])


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
