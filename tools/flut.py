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


def meer(breit, hoch):
    """Eine Bahn, die aus offenem Wasser besteht – die Stege werden hineingelegt.

    WARUM WASSER UND NICHT ABGRUND. Am Rand eines Stegs über dem Abgrund baut das Spiel eine
    Bande: Wer dagegengedrückt wird, prallt ab und bleibt liegen. Eine Strömung könnte dann
    niemanden herunterspülen, sie würde einen nur an die Bande drücken – geprüft im Browser, und
    genau so sah es aus. Über Wasser gibt es keine Bande: Wer hinausgetrieben wird, geht unter und
    zahlt einen Strafschlag. Erst damit ist die Strömung eine Gefahr.

    Ganz außen bleibt ein Rahmen aus Abgrund, damit die Bahn eine Kante hat und nicht ins Nichts
    ausfranst."""
    f = leer(breit, hoch, 'w')
    for x in range(breit):
        f[0][x] = '.'; f[hoch - 1][x] = '.'
    for y in range(hoch):
        f[y][0] = '.'; f[y][breit - 1] = '.'
    return f


def gang(f, x0, y0, x1, y1, b=3, z='#'):
    """Ein gerader Steg, b Kacheln breit, von (x0,y0) nach (x1,y1) – waagerecht oder senkrecht.

    Die Bahnen dieser Welt sind aus Stegen gebaut, nicht aus Plätzen: Ringsum ist offenes Wasser,
    und wer heruntergespült wird, zahlt. Das ist der Unterschied zwischen einer Strömung, die
    ärgert, und einer, die etwas kostet – und der Grund, warum die Welt eine Legende ist."""
    h = (b - 1) // 2
    if y0 == y1:
        fuell(f, min(x0, x1), y0 - h, max(x0, x1), y0 + (b - 1 - h), z)
    else:
        fuell(f, x0 - h, min(y0, y1), x0 + (b - 1 - h), max(y0, y1), z)


def umweg(f, x0, x1, ym, yn, b=3):
    """Der Nebensteg samt seinen beiden Verbindungen: der Weg, den man nimmt, wenn das Becken
    gerade vollsteht. Ohne ihn müßte man warten, und das soll nie sein."""
    gang(f, x0, yn, x1, yn, b)
    gang(f, x0, ym, x0, yn, b)
    gang(f, x1, ym, x1, yn, b)


def kammer(f, x0, y0, x1, y1, z='#'):
    """Ein weiterer Raum im Steg – da, wo sich etwas drehen können muß."""
    fuell(f, x0, y0, x1, y1, z)


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


def angler(x0, y0, x1, y1, tempo=2.2, phase=0.0):
    """Ein Anglerfisch, der die Strecke (x0,y0)–(x1,y1) abschwimmt."""
    o = {'type': 'angler', 'x0': x0 + 0.5, 'y0': y0 + 0.5, 'x1': x1 + 0.5, 'y1': y1 + 0.5,
         'tempo': tempo}
    if phase: o['phase'] = phase
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
            # Und der Boden darunter muß glatt sein. Die Reibung auf Schlick ist 20 Kacheln/s²,
            # die Strömung schiebt mit 13 – auf Schlick bewegt sie GAR NICHTS, denn die Reibung
            # frißt sie auf. Beim ersten Bau lagen fünf von sechs Strömungen auf Schlick, und im
            # Browser sah es aus, als seien sie kaputt. Dieselbe Falle wie bei der Kippbühne und
            # bei der Dünung: Eine Kraft unter der Reibung ist keine Kraft.
            bremsend = [(x, y)
                        for y in range(max(0, y0), min(len(karte), y1 + 1))
                        for x in range(max(0, x0), min(len(karte[0]), x1 + 1))
                        if karte[y][x] == 's']
            if bremsend:
                fehler.append(f'eine Strömung liegt auf bremsendem Grund ({len(bremsend)} Felder '
                              'Schlick) – dort trägt sie nichts')
        if o['type'] == 'strudel':
            for name, (px, py) in (('Abschlag', tee), ('Loch', cup)):
                if (px + 0.5 - o['x']) ** 2 + (py + 0.5 - o['y']) ** 2 < (o['r'] + 0.6) ** 2:
                    fehler.append(f'ein Strudel greift bis an den {name}')

    # Der Anglerfisch. Zwei Dinge sieht man einer Bahn beim Bauen nicht an: daß seine Strecke
    # neben dem Steg im Wasser liegt (dann schwimmt er da, wo nie ein Ball ist), und daß sie bis
    # an den Abschlag reicht (dann wird man gefressen, bevor man den ersten Schlag tun konnte).
    for o in b['obstacles']:
        if o['type'] != 'angler': continue
        schritte = 24
        auf = 0
        for i in range(schritte + 1):
            u = i / schritte
            px = int(o['x0'] + (o['x1'] - o['x0']) * u)
            py = int(o['y0'] + (o['y1'] - o['y0']) * u)
            if 0 <= py < len(karte) and 0 <= px < len(karte[0]) and karte[py][px] in TROCKEN:
                auf += 1
            if abs(px - tee[0]) + abs(py - tee[1]) < 3:
                fehler.append('ein Anglerfisch schwimmt bis an den Abschlag')
                break
        if auf < schritte * 0.6:
            fehler.append(f'ein Anglerfisch schwimmt größtenteils neben dem Steg '
                          f'({auf} von {schritte + 1} Punkten auf Boden)')

    # Jede Bahn dieser Welt braucht wenigstens eine ihrer Maschinen, sonst könnte sie überall stehen
    eigene = {'flut', 'pumpwerk', 'stroemung', 'strudel', 'angler'}
    if not any(o['type'] in eigene for o in b['obstacles']):
        fehler.append('keine Maschine der Welt auf dieser Bahn')

    felder = sum(1 for z in karte for c in z if c in BODEN)
    return fehler, {'breit': len(karte[0]), 'hoch': len(karte), 'felder': felder,
                    'becken': len(becken_), 'lauf': max(laeufe) if laeufe else 0,
                    'kurz': kurz, 'lang': lang, 'nass': len(nass_voll)}


# ================================================================ Die Bahnen
# ZWÖLF STEGE, DREI JE TIEFE. Die Welt ist eine Legende, und das heißt hier: keine Plätze, sondern
# schmale Stege im offenen Wasser. Wer heruntergespült wird, zahlt einen Strafschlag – erst damit
# wird aus der Strömung eine Gefahr und nicht bloß ein Ärgernis.
#
#   Bahn  1-3   wasserlinie   Becken, dann die erste Strömung
#   Bahn  4-6   flachwasser   Pumpwerk und der erste Strudel
#   Bahn  7-9   daemmerzone   alles zusammen, in der versunkenen Stadt
#   Bahn 10-12  meeresgrund   Dünung, Gegenströmungen, und zuletzt alles auf einmal
#
# Zwei Regeln halten die Welt spielbar, und beide stehen als Prüfung weiter unten: Es gibt immer
# einen trockenen Weg (der Nebensteg), und kein Becken braucht länger als fünfzehn Sekunden für
# einen Lauf. Schwer heißt nicht warten.

# ---------------------------------------------------------------- Wasserlinie
# --- 1: das Hafenbecken. Der Steg geht hindurch; wer nicht durchkommt, geht oben herum.
f = meer(32, 17)
gang(f, 3, 9, 28, 9)
umweg(f, 10, 21, 9, 4)
setz(f, 4, 9, 'T'); setz(f, 27, 9, 'H')
fuell(f, 13, 8, 18, 10, 's')
bahn('Das Hafenbecken', 'wasserlinie', f, par=3,
     intro='Dicht unter der Oberfläche. Der Steg führt geradeaus durch das Becken – steht es leer, '
           'ist es kurz; steht es voll, geht es oben herum. Neben dem Steg ist nichts.',
     hindernisse=[becken(13, 8, 18, 10)])

# --- 2: der Priel. Die erste Strömung, quer über den Steg – und daneben ist offenes Wasser.
f = meer(34, 15)
gang(f, 3, 7, 30, 7)
setz(f, 4, 7, 'T'); setz(f, 29, 7, 'H')
bahn('Der Priel', 'wasserlinie', f, par=3,
     intro='Ein Priel zieht quer über den Steg, und neben dem Steg ist nichts. Wer darin '
           'liegenbleibt, wird heruntergespült und zahlt dafür. Aber er ist eine Dünung – er '
           'schwillt an und wieder ab, und der Augenblick dazwischen ist der, in dem man spielt.',
     # Das Band reicht mit Absicht weit über den Steg hinaus: Es soll nicht an eine Bande drücken,
     # sondern hinunter ins Wasser. Eine Strömung, die einen gegen eine Mauer preßt, ärgert bloß.
     # Zuerst war das Band fünf Kacheln breit und zog mit 6,5 – der Bot brauchte im Mittel
     # dreizehn Schläge und lief einmal ins Limit. Schwer soll die Welt sein, nicht unfair.
     hindernisse=[strom(14, 2, 16, 13, 90, tempo=5.0, puls=1.25),
                  fass(10.5, 7.5), fass(20.5, 7.5)])

# --- 3: die Mole. Unten trägt die Strömung, oben liegt das Loch – dazwischen zwei Aufgänge.
f = meer(34, 19)
gang(f, 3, 15, 31, 15)             # der untere Steg
gang(f, 8, 4, 31, 4)               # der obere
gang(f, 22, 4, 22, 15)             # der kurze Aufgang: durch das Becken
# Der lange Aufgang liegt RECHTS vom Loch. Das ist kein Zufall: Läge er links, wäre er genauso
# kurz wie der kurze – beide Wege gingen nur nach rechts und nach oben, und ein Weg ohne Umkehr
# ist kein Umweg. Erst wer über das Loch hinausfahren und zurückkommen muß, zahlt dafür. 
gang(f, 31, 4, 31, 15)
setz(f, 4, 15, 'T'); setz(f, 27, 4, 'H')
fuell(f, 21, 8, 23, 13, 's')
bahn('Die Mole', 'wasserlinie', f, par=4,
     intro='Unten schiebt die Strömung nach rechts – wer sie mitnimmt, ist schnell am Aufgang. '
           'Der Aufgang ist ein Becken. Ist es voll, bleibt nur der lange Weg ganz links zurück.',
     hindernisse=[strom(10, 14, 20, 16, 0, tempo=7.0), becken(21, 8, 23, 13)])

# ---------------------------------------------------------------- Flachwasser
# --- 4: die Sandbank. Zwei Becken hintereinander, und der Umweg führt am Pumpwerk vorbei.
f = meer(36, 21)
gang(f, 3, 8, 32, 8)
umweg(f, 8, 28, 8, 16)
setz(f, 4, 8, 'T'); setz(f, 31, 8, 'H')
fuell(f, 11, 7, 16, 9, 's')
fuell(f, 21, 7, 26, 9, 's')
bahn('Die Sandbank', 'flachwasser', f, par=4,
     intro='Zwei Becken hintereinander auf einem Steg. Der Umweg unten herum ist lang – aber auf '
           'ihm liegt das Pumpwerk, und das hält beide Becken vier Sekunden lang leer.',
     hindernisse=[becken(11, 7, 16, 9), becken(21, 7, 26, 9, start=4.4), pumpwerk(18.5, 16.5)])

# --- 5: der Seegraswald. Eine Kammer, in der sich das Wasser dreht, mit engem Aus- und Eingang.
f = meer(34, 19)
gang(f, 3, 9, 13, 9)
gang(f, 21, 9, 30, 9)
kammer(f, 13, 4, 21, 14)
setz(f, 4, 9, 'T'); setz(f, 29, 9, 'H')
bahn('Der Seegraswald', 'flachwasser', f, par=3,
     intro='Zwischen den Halmen liegt eine Kammer, und darin dreht sich das Wasser. Der Strudel '
           'hält niemanden fest – er wirft nur woandershin, als man wollte, und der Ausgang ist '
           'schmal.',
     hindernisse=[strudel(17.0, 9.5, 3.6, dreh=1),
                  angler(22, 9, 29, 9, tempo=2.0)])

# --- 6: die Rinne. Ein langer Steg, auf dem es zieht, und am Ende ein Becken.
f = meer(38, 21)
gang(f, 3, 7, 34, 7)
umweg(f, 24, 33, 7, 15)
setz(f, 4, 7, 'T'); setz(f, 33, 7, 'H')
fuell(f, 27, 6, 30, 8, 's')
bahn('Die Rinne', 'flachwasser', f, par=4,
     intro='Die Rinne trägt weit – man muß sie nur treffen und darf nicht zu früh liegenbleiben. '
           'Am Ende liegt ein Becken quer vor dem Loch; drumherum geht es unten lang.',
     hindernisse=[strom(8, 6, 22, 8, 0, tempo=7.5), becken(27, 6, 30, 8)])

# ---------------------------------------------------------------- Dämmerzone
# --- 7: die Gassen. Zwei Gassen um ein Haus, und beide saufen ab.
f = meer(34, 21)
gang(f, 3, 10, 11, 10)
gang(f, 23, 10, 30, 10)
gang(f, 11, 6, 23, 6)              # die obere Gasse
gang(f, 11, 14, 23, 14)            # die untere
gang(f, 11, 6, 11, 14)
gang(f, 23, 6, 23, 14)
# Und ein dritter Weg ganz außen herum. Die beiden Gassen laufen versetzt voll, aber es gibt
# Augenblicke, in denen beide zu sind – ohne den Bogen müßte man dann warten. 
umweg(f, 7, 27, 10, 18)
setz(f, 4, 10, 'T'); setz(f, 29, 10, 'H')
fuell(f, 14, 5, 20, 7, 's')
fuell(f, 14, 13, 20, 15, 's')
bahn('Die Gassen', 'daemmerzone', f, par=4,
     intro='Das Haus in der Mitte versperrt den geraden Weg. Links und rechts daran vorbei laufen '
           'zwei Gassen, und beide saufen im Takt voll – versetzt, damit immer eine offen ist.',
     hindernisse=[becken(14, 5, 20, 7), becken(14, 13, 20, 15, start=4.4)])

# --- 8: der Marktplatz. Der Brunnen dreht mitten im Platz, davor und dahinter je ein Becken.
f = meer(38, 21)
gang(f, 3, 10, 13, 10)
gang(f, 25, 10, 34, 10)
kammer(f, 13, 5, 25, 15)
umweg(f, 9, 29, 10, 18)
setz(f, 4, 10, 'T'); setz(f, 33, 10, 'H')
fuell(f, 13, 9, 16, 11, 's')
fuell(f, 22, 9, 25, 11, 's')
bahn('Der Marktplatz', 'daemmerzone', f, par=4,
     intro='Über dem alten Brunnen dreht sich das Wasser, und in den Platz hinein und heraus führt '
           'je ein Becken. Wer beide im richtigen Augenblick nimmt, wird trotzdem noch versetzt.',
     hindernisse=[becken(13, 9, 16, 11), strudel(19.0, 10.5, 3.6, dreh=-1),
                  becken(22, 9, 25, 11, start=4.4)])

# --- 9: die Kaimauer. Unten hin, oben zurück – und dazwischen nur das Becken oder der weite Bogen.
f = meer(40, 21)
gang(f, 3, 16, 37, 16)             # unten hin
gang(f, 10, 5, 37, 5)              # oben zurück, zum Loch
gang(f, 20, 5, 20, 16)             # der kurze Aufgang: das Becken
gang(f, 37, 5, 37, 16)             # der lange – jenseits des Lochs, also mit Umkehr
setz(f, 4, 16, 'T'); setz(f, 33, 5, 'H')
fuell(f, 19, 9, 21, 13, 's')
bahn('Die Kaimauer', 'daemmerzone', f, par=4,
     intro='Unter der Kaimauer geht es hin, oben wieder zurück. Der kurze Aufgang ist ein Becken; '
           'oben zieht es dann kräftig aufs Loch zu – zu kräftig, um dort stehenzubleiben. Das '
           'Pumpwerk liegt am Anfang des langen Wegs.',
     hindernisse=[becken(19, 9, 21, 13), strom(22, 4, 31, 6, 0, tempo=7.5),
                  pumpwerk(10.5, 16.5)])

# ---------------------------------------------------------------- Meeresgrund
# --- 10: der Grund. Ein langer Steg, quer davor ein breites Becken.
f = meer(38, 21)
gang(f, 3, 8, 34, 8)
umweg(f, 9, 29, 8, 17)
setz(f, 4, 8, 'T'); setz(f, 33, 8, 'H')
fuell(f, 13, 7, 24, 9, 's')
bahn('Der Grund', 'meeresgrund', f, par=3,
     intro='Ganz unten. Von oben kommt kein Licht mehr – was leuchtet, leuchtet selbst. Quer über '
           'den Steg liegt ein langes Becken; der Umweg unten herum ist weit, und auf ihm schwimmt '
           'ein Anglerfisch. Seine Laterne ist hier das hellste Licht: Man sieht ihn kommen, bevor '
           'man ihn sieht.',
     hindernisse=[becken(13, 7, 24, 9), pumpwerk(19.5, 17.5),
                  angler(12, 17, 27, 17, tempo=2.4)])

# --- 11: das Kaltwasserfeld. Zwei Stege, auf jedem zieht es – und zwar gegeneinander.
f = meer(40, 21)
gang(f, 3, 6, 36, 6)               # oberer Steg: es zieht nach rechts
gang(f, 3, 15, 36, 15)             # unterer Steg: es zieht nach links
gang(f, 20, 6, 20, 15)             # die einzige Verbindung, in der Mitte
setz(f, 4, 15, 'T'); setz(f, 35, 6, 'H')
bahn('Das Kaltwasserfeld', 'meeresgrund', f, par=5,
     intro='Zwei Stege, auf beiden zieht es – oben nach rechts, unten nach links, und beide als '
           'Dünung. Verbunden sind sie nur in der Mitte, und mitten in der Verbindung dreht sich '
           'das Wasser. Stehenbleiben geht nirgends.',
     # Die Bänder lassen die Enden und die Mitte frei: Ohne diese Ruhezonen konnte man nirgends
     # zum Liegen kommen, und der Bot lief ins Schlaglimit. Jetzt gibt es Stellen zum Sammeln –
     # nur eben nicht da, wo man sie gerade braucht.
     hindernisse=[strom(9, 5, 17, 7, 0, tempo=6.0, puls=1.25),
                  strom(24, 5, 32, 7, 0, tempo=6.0, puls=1.25, phase=1.6),
                  strom(9, 14, 17, 16, 180, tempo=6.0, puls=1.25, phase=3.14),
                  strom(24, 14, 32, 16, 180, tempo=6.0, puls=1.25, phase=4.7),
                  strudel(20.5, 10.5, 2.6, dreh=1)])

# --- 12: der Schlund. Alles auf einmal, und nichts davon breit.
f = meer(42, 23)
gang(f, 3, 11, 10, 11)
gang(f, 10, 5, 10, 17)             # die Gabelung: oben oder unten weiter
gang(f, 10, 5, 20, 5)
gang(f, 10, 17, 20, 17)
kammer(f, 20, 7, 30, 15)           # die Kammer mit dem Strudel
gang(f, 20, 5, 20, 7)
gang(f, 20, 15, 20, 17)
gang(f, 30, 11, 38, 11)
umweg(f, 10, 30, 11, 20)           # der weite Bogen: wenn beide Äste zu sind
setz(f, 4, 11, 'T'); setz(f, 37, 11, 'H')
fuell(f, 13, 4, 17, 6, 's')        # Becken im oberen Ast
fuell(f, 13, 16, 17, 18, 's')      # Becken im unteren
bahn('Der Schlund', 'meeresgrund', f, par=5,
     intro='Das Ende. Zwei Äste, in jedem ein Becken, und beide münden in eine Kammer, in der es '
           'zieht und sich alles dreht. Wer dort liegenbleibt, bleibt nicht liegen.',
     hindernisse=[becken(13, 4, 17, 6), becken(13, 16, 17, 18, start=4.4),
                  strom(20, 7, 30, 15, 0, tempo=6.0, puls=1.15),
                  strudel(25.0, 11.5, 3.2, dreh=-1),
                  angler(21, 8, 29, 14, tempo=2.2),
                  pumpwerk(6.5, 11.5)])


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
