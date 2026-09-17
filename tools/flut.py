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
import math
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


# Startwerte für die Streu-Deko. Jede Bahn bekommt einen eigenen, sonst stünde auf allen zwölf
# dasselbe Wrack an derselben Stelle. Die Zahlen sind Primzahlen ohne tiefere Bedeutung – sie
# müssen nur verschieden sein und sich nicht mehr ändern, damit ein Bild von heute morgen noch
# stimmt.
DEKO_SAAT = [17, 29, 43, 59, 71, 89, 101, 113, 131, 149, 163, 181]
# Wie dicht. Die Stege sind schmal, also ist fast die ganze Karte Wasser – bei der Dichte der
# Landwelten (0,4) stünde der Meeresgrund voll wie ein Möbellager. Ein Achtel reicht.
DEKO_DICHTE = 0.13


def bahn(name, theme, karte, hindernisse=None, par=3, intro=None, maxStrokes=None):
    b = {'name': name, 'par': par, 'theme': theme, 'map': txt(karte),
         'obstacles': hindernisse or [],
         'autoDecor': {'density': DEKO_DICHTE, 'seed': DEKO_SAAT[len(BAHNEN) % len(DEKO_SAAT)]}}
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


def muschel(x, y, angle=0, r=1.05, takt=5.5, offen=0.45, phase=0.0):
    o = {'type': 'muschel', 'x': x, 'y': y, 'r': r, 'angle': angle, 'takt': takt, 'offen': offen}
    if phase: o['phase'] = phase
    return o


def tang(x0, y0, x1, y1, takt=3.4, phase=0.0):
    """Ein Tangstreifen über die Kacheln x0..x1 / y0..y1."""
    o = {'type': 'tangwald', 'x': (x0 + x1 + 1) / 2, 'y': (y0 + y1 + 1) / 2,
         'w': x1 - x0 + 1, 'h': y1 - y0 + 1, 'takt': takt}
    if phase: o['phase'] = phase
    return o


def raucher(x, y, angle=0, weite=6.0, r=1.0, takt=4.6, phase=0.0):
    o = {'type': 'raucher', 'x': x, 'y': y, 'r': r, 'angle': angle, 'weite': weite, 'takt': takt}
    if phase: o['phase'] = phase
    return o


def ankerkette(x, y, len_=4.0, amp=48, ruhe=90, takt=5.2, phase=0.0):
    """x,y ist die AUFHÄNGUNG – der Anker hängt 'len_' Kacheln darunter und schwingt um sie."""
    o = {'type': 'ankerkette', 'x': x, 'y': y, 'len': len_, 'amp': amp, 'ruhe': ruhe, 'takt': takt}
    if phase: o['phase'] = phase
    return o


def wracktor(x, y, len_=2.2, zu=90, gegen=False, takt=6.0, phase=0.0):
    """x,y ist die ANGEL – das Blatt ist 'len_' Kacheln lang und schwingt um sie. 'zu' ist der
    Winkel, in dem es den Durchgang sperrt; auf geht es um 88 Grad in die eine oder (mit 'gegen')
    in die andere Richtung."""
    o = {'type': 'wracktor', 'x': x, 'y': y, 'len': len_, 'zuWinkel': zu, 'takt': takt}
    if gegen: o['gegen'] = True
    if phase: o['phase'] = phase
    return o


def abfluss(paar, angle=0):
    """Das Abflußrohr braucht zwei Buchstaben in der Karte: den Großbuchstaben als Einlauf, den
    gleichen Kleinbuchstaben als Auslauf. 'angle' sagt, wohin gespült wird."""
    return {'type': 'abflussrohr', 'pair': paar, 'angle': angle}


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

    # Das Wracktor. Es schlägt zu, und wo es zuschlägt, darf niemand stehen müssen: Eine Luke, deren
    # Bogen über den Abschlag oder das Loch streicht, würfe den Ball weg, bevor oder nachdem man
    # etwas dagegen tun kann. Und sie muß über BODEN schwingen – über offenem Wasser sperrt sie
    # nichts und trifft nie jemanden, dann ist sie bloß Deko mit Takt.
    for o in b['obstacles']:
        if o['type'] != 'wracktor': continue
        amp = -88 if o.get('gegen') else 88
        boden = 0
        schritte = 20
        for i in range(schritte + 1):
            w = math.radians(o['zuWinkel'] + amp * (i / schritte))
            for k in (0.4, 0.7, 1.0):
                px = int(o['x'] + math.cos(w) * o['len'] * k)
                py = int(o['y'] + math.sin(w) * o['len'] * k)
                if not (0 <= py < len(karte) and 0 <= px < len(karte[0])): continue
                if karte[py][px] in TROCKEN: boden += 1
                for name, (tx, ty) in (('Abschlag', tee), ('Loch', cup)):
                    if (px, py) == (tx, ty):
                        fehler.append(f'ein Wracktor schlägt über den {name}')
        if boden < schritte:
            fehler.append(f'ein Wracktor schwingt fast nur über Wasser ({boden} feste Felder im Bogen) '
                          '– dort sperrt es nichts')
        if o['takt'] > FLUT_GEDULD:
            fehler.append(f'ein Wracktor braucht {o["takt"]:.1f} s je Takt – zu lang zum Warten')

    # Das Abflußrohr. Beide Gitter müssen auf festem Grund liegen – ein Einlauf im offenen Wasser
    # ist nie zu erreichen, ein Auslauf darin spuckt den Ball ins Nichts. Und keines der beiden
    # darf auf dem Abschlag oder dem Loch sitzen: Der Einlauf verschlänge den Ball, bevor man
    # gespielt hat, der Auslauf machte das Loch unerreichbar.
    for o in b['obstacles']:
        if o['type'] != 'abflussrohr': continue
        gross, klein = o['pair'].upper(), o['pair'].lower()
        stellen = {}
        for y, zeile in enumerate(karte):
            for x, c in enumerate(zeile):
                if c in (gross, klein): stellen[c] = (x, y)
        for c, was in ((gross, 'Einlauf'), (klein, 'Auslauf')):
            if c not in stellen:
                fehler.append(f'ein Abflußrohr braucht {c} auf der Karte ({was} fehlt)')
                continue
            if stellen[c] in (tee, cup):
                fehler.append(f'der {was} eines Abflußrohrs liegt auf {"dem Abschlag" if stellen[c] == tee else "dem Loch"}')
        if gross in stellen and klein in stellen:
            (ex, ey), (zx, zy) = stellen[gross], stellen[klein]
            # Unterwegs ist die Leitung unter dem Grund – aber sie soll eine Strecke überbrücken,
            # die zu Fuß länger ist. Sonst ist sie ein teurer Umweg um zwei Kacheln.
            if abs(ex - zx) + abs(ey - zy) < 6:
                fehler.append('ein Abflußrohr überbrückt fast nichts – der Weg drumherum ist kürzer')

    # Jede Bahn dieser Welt braucht wenigstens eine ihrer Maschinen, sonst könnte sie überall stehen
    eigene = {'flut', 'pumpwerk', 'stroemung', 'strudel', 'angler', 'muschel', 'tangwald', 'raucher',
              'ankerkette', 'wracktor', 'abflussrohr'}
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
# JEDE MASCHINE BEKOMMT IHRE EIGENE BAHN, BEVOR SIE SICH MIT ANDEREN MISCHT. Das ist die Ordnung
# dieser zwölf: Wer zum ersten Mal einen Strudel sieht, sieht ihn allein und lernt, was er tut.
# Erst danach steht er neben einer Strömung. Eine Welt, die alles auf einmal auspackt, ist nicht
# schwer, sondern nur unübersichtlich.
#
#   Bahn  1-3   wasserlinie   Becken · Pumpwerk · Strömung und Wracktor
#   Bahn  4-6   flachwasser   Strudel · Tangwald · Riesenmuschel
#   Bahn  7-9   daemmerzone   Abflußrohr · Ankerkette · alles der Stadt zusammen
#   Bahn 10-12  meeresgrund   Schwarzer Raucher · Gegenströmungen · der Anglerfisch
#
# DER ANGLERFISCH KOMMT ZULETZT und nur einmal. Er ist das einzige Hindernis der Welt, das einen
# Schlag zurücksetzt, und er ist damit die Pointe der letzten Bahn – nicht das Grundrauschen der
# ganzen Welt.
#
# Zwei Regeln halten die Welt spielbar, und beide stehen als Prüfung weiter oben: Es gibt immer
# einen trockenen Weg (der Nebensteg), und kein Becken braucht länger als fünfzehn Sekunden für
# einen Lauf. Schwer heißt nicht warten.

# ---------------------------------------------------------------- Wasserlinie
# --- 1: die Hafenmole. Nur das Becken, nichts sonst – die Bahn, auf der man die Maschine lernt.
f = meer(40, 21)
gang(f, 3, 15, 30, 15)             # der lange untere Steg
gang(f, 30, 6, 30, 15)             # der Knick nach oben
gang(f, 30, 6, 36, 6)              # und das kurze Stück zum Loch
umweg(f, 13, 25, 15, 19)           # der Bogen unter dem Becken
setz(f, 4, 15, 'T'); setz(f, 35, 6, 'H')
bahn('Die Hafenmole', 'wasserlinie', f, par=4,
     intro='Die Mole läuft nach rechts und knickt am Ende nach oben ab. Mittendrin läuft sie im '
           'Takt voll: Zwei Wege, im richtigen Augenblick hindurch – oder unten herum, immer, '
           'aber weiter.',
     hindernisse=[becken(17, 14, 23, 16)])

# --- 2: der Priel. Zwei Becken hintereinander, und das Pumpwerk am Anfang hält beide leer.
f = meer(44, 23)
gang(f, 3, 5, 26, 5)               # oberer Lauf
gang(f, 26, 5, 26, 17)             # das Knie in der Mitte
gang(f, 26, 17, 40, 17)            # unterer Lauf zum Loch
umweg(f, 11, 21, 5, 10)            # Bogen um das erste Becken
umweg(f, 30, 38, 17, 21)           # Bogen um das zweite
setz(f, 4, 5, 'T'); setz(f, 39, 17, 'H')
bahn('Der Priel', 'wasserlinie', f, par=5,
     intro='Zwei Becken hintereinander, versetzt getaktet – nacheinander kommt man nie durch beide. '
           'Am Anfang liegt das Pumpwerk: Wer darüberrollt, legt beide für vier Sekunden trocken.',
     hindernisse=[pumpwerk(8.5, 5.5),
                  becken(14, 4, 18, 6), becken(32, 16, 36, 18, start=4.4)])

# --- 3: die Buhnen. Die erste Strömung – und das erste Wracktor kurz vor dem Loch.
f = meer(44, 21)
gang(f, 3, 16, 34, 16)             # zwischen den Buhnen entlang
gang(f, 34, 5, 34, 16)             # am Ende hinauf
gang(f, 20, 5, 40, 5)              # und zurück nach rechts zum Loch
setz(f, 4, 16, 'T'); setz(f, 39, 5, 'H')
bahn('Die Buhnen', 'wasserlinie', f, par=5,
     intro='Zwischen den Buhnen drückt das Wasser zurück – wer zu sacht spielt, kommt nicht durch. '
           'Und vor dem Loch hängt eine Luke aus einem Schiffsrumpf: langsam auf, blitzschnell zu.',
     hindernisse=[strom(18, 15, 25, 17, 180, tempo=4.6),
                  wracktor(28.5, 4.15, len_=2.8, zu=90, gegen=True)])

# ---------------------------------------------------------------- Flachwasser
# --- 4: der Kessel. Der erste Strudel, allein in einer Kammer.
f = meer(44, 21)
gang(f, 3, 16, 16, 16)
kammer(f, 16, 4, 30, 17)           # der Kessel: Platz genug, daß der Strudel wirken kann
gang(f, 30, 6, 40, 6)
setz(f, 4, 16, 'T'); setz(f, 39, 6, 'H')
bahn('Der Kessel', 'flachwasser', f, par=4,
     intro='Mitten im Kessel dreht sich das Wasser. Es hält niemanden fest – es schleudert nach '
           'außen, und wohin, entscheidet, wo man hineingerät.',
     hindernisse=[strudel(23.0, 10.5, 3.8, dreh=1)])

# --- 5: der Seegraswald. Tang, der den Schwung frißt, mit einer Gasse, die wandert.
f = meer(46, 23)
gang(f, 3, 5, 32, 5)               # hin
gang(f, 32, 5, 32, 18)             # rechts hinunter
gang(f, 18, 18, 32, 18)            # und ein Stück zurück
umweg(f, 20, 28, 5, 11)            # Bogen um das Becken im oberen Lauf
setz(f, 4, 5, 'T'); setz(f, 19, 18, 'H')
bahn('Der Seegraswald', 'flachwasser', f, par=5,
     intro='Hin und um die Ecke wieder zurück – das Loch liegt fast neben dem Abschlag, nur eben '
           'auf der anderen Seite. Auf beiden Läufen liegt ein Tangfeld quer. Es hält niemanden '
           'auf, es nimmt den Schwung; durch jedes läuft eine Gasse, und die wandert.',
     # Nur EIN Tangfeld, obwohl zwei schöner klängen. Mit zweien fand der Profi-Bot in acht
     # Schlägen gar keine Lösung mehr und jeder fünfte Durchgang des Normalspielers lief ins
     # Schlaglimit: Der Tang nimmt den Schwung, der nächste Schlag trägt nicht mehr über die
     # Ecke, und der Ball geht ins Meer. Eine Maschine, die man zweimal trifft, ist nicht
     # doppelt so gut – sie ist doppelt so zäh.
     hindernisse=[tang(15, 3, 17, 7),
                  becken(21, 4, 25, 6)])

# --- 6: die Austernbank. Die Riesenmuschel: Mauer oder Maul, je nach Takt.
f = meer(44, 23)
gang(f, 3, 11, 18, 11)
gang(f, 18, 5, 18, 17, b=5)
gang(f, 18, 5, 30, 5, b=5)
gang(f, 18, 17, 30, 17, b=5)
gang(f, 30, 5, 30, 11, b=5)
gang(f, 30, 11, 40, 11)
setz(f, 4, 11, 'T'); setz(f, 39, 11, 'H')
bahn('Die Austernbank', 'flachwasser', f, par=5,
     intro='Oben oder unten herum – und in beiden Ästen sitzt eine Riesenmuschel. Geschlossen ist '
           'sie ein Klotz, offen ein Maul: Sie schluckt, hält kurz und spuckt in ihre Richtung '
           'wieder aus. Wer den Takt trifft, spart den halben Weg.',
     # Kein Becken auf dieser Bahn, obwohl eines gut hierher passen würde: Die beiden Äste sind
     # gleich lang, also kostet ein Becken in einem von ihnen gar nichts – man nimmt einfach den
     # anderen. Die Prüfung sagt das auch, und sie hat recht.
     hindernisse=[muschel(24.5, 5.5, angle=0), muschel(24.5, 17.5, angle=0, phase=0.5)])

# ---------------------------------------------------------------- Dämmerzone
# --- 7: die Kanalisation. Das Abflußrohr – und es ist der einzige Weg über die Kammer hinweg.
f = meer(46, 23)
gang(f, 3, 7, 16, 7)
kammer(f, 16, 5, 30, 18)           # der Platz, in dem sich das Wasser dreht
gang(f, 30, 16, 42, 16)
setz(f, 4, 7, 'T'); setz(f, 41, 16, 'H')
setz(f, 19, 16, 'A'); setz(f, 34, 16, 'a')
bahn('Die Kanalisation', 'daemmerzone', f, par=4,
     intro='Im Platz dreht sich das Wasser, und in seiner Ecke liegt ein Abflußgitter. Man spielt '
           'nicht hinein – man landet darin, wenn einen der Strudel dorthin schleudert. Unter dem '
           'Grund läuft die Leitung schnurgerade hinter den Platz; man sieht die Naht.',
     hindernisse=[strudel(23.0, 11.0, 3.8, dreh=-1), abfluss('A', angle=0)])

# --- 8: die Kaimauer. Die Ankerkette, schwer und langsam, über dem schmalsten Stück.
f = meer(46, 23)
gang(f, 3, 6, 42, 6, b=4)
gang(f, 3, 17, 42, 17, b=4)
gang(f, 4, 6, 4, 17, b=4)
gang(f, 41, 6, 41, 17, b=4)
setz(f, 4, 17, 'T'); setz(f, 41, 6, 'H')
bahn('Die Kaimauer', 'daemmerzone', f, par=5,
     intro='Unten hin, oben zurück – oder andersherum. Über beiden Stegen schwingt ein Anker an '
           'seiner Kette. Er ist langsamer als jedes Pendel der Uhrwerkstadt, und das ist auch '
           'nötig: Ein Stoß auf drei Kacheln Steg schickt einen ins Meer.',
     # Auch hier kein Becken: Beide Stege sind gleich lang, also wäre es umsonst – wer es
     # vollstehen sieht, nimmt den anderen und hat nichts verloren.
     hindernisse=[ankerkette(20.5, 12.5, len_=5.0, ruhe=90, takt=5.2),
                  ankerkette(30.5, 11.5, len_=5.0, ruhe=270, takt=5.2, phase=0.5),
                  wracktor(12.5, 16.1, len_=2.8, zu=90, gegen=True)])

# --- 9: der Marktplatz. Alles, was die Stadt hat, auf einer Bahn.
f = meer(48, 23)
gang(f, 3, 6, 14, 6)
# Der Bogen um das Becken am Eingang. Er endet mit Absicht VOR der Kammer und nicht in ihr:
# Läuft er in den offenen Platz hinein, ist er ein zweiter Eingang und kein Umweg – dann ist er
# genauso kurz wie der Weg durchs Becken, und die Prüfung sagt das auch.
umweg(f, 5, 11, 6, 11)
kammer(f, 14, 4, 32, 18)           # der ganze Marktplatz
gang(f, 32, 16, 45, 16)
setz(f, 4, 6, 'T'); setz(f, 44, 16, 'H')
fuell(f, 18, 9, 21, 13, 's')       # Schlick vor dem Brunnen
fuell(f, 26, 9, 29, 13, 's')       # und dahinter
setz(f, 16, 17, 'B'); setz(f, 36, 16, 'b')
bahn('Der Marktplatz', 'daemmerzone', f, par=5,
     intro='Am Eingang ein Becken, im Platz der Brunnen, in dem sich alles dreht, und davor und '
           'dahinter Schlick, der den Schwung frißt. In der Ecke wartet das Abflußgitter, über '
           'dem Ausgang hängt der Anker. Wer hier in fünf Schlägen durchkommt, hat alles '
           'getroffen.',
     # Nur ein Becken, und es liegt im Eingang – dort, wo es einen Umweg gibt. Ein zweites im
     # offenen Platz wäre umsonst: Man geht einfach zwei Kacheln daneben vorbei.
     hindernisse=[becken(7, 5, 9, 7),
                  strudel(23.5, 11.0, 3.2, dreh=-1),
                  abfluss('B', angle=0),
                  ankerkette(40.5, 12.5, len_=4.0, ruhe=90, takt=5.2)])

# ---------------------------------------------------------------- Meeresgrund
# --- 10: die Schlotebene. Der Schwarze Raucher – die einzige Maschine, die nach oben wirft.
f = meer(46, 23)
gang(f, 3, 17, 30, 17)             # der untere Steg mit dem Schlot
gang(f, 8, 6, 40, 6)               # der obere, auf dem das Loch liegt
gang(f, 8, 6, 8, 17)               # die Verbindung ganz links: der lange Weg
setz(f, 4, 17, 'T'); setz(f, 39, 6, 'H')
bahn('Die Schlotebene', 'meeresgrund', f, par=4,
     intro='Aus dem Grund stößt eine heiße Quelle. Sie wirft auch einen Ball, der nur daliegt – '
           'und sie wirft ihn weit. Kurz vorher flimmert der Boden: Das ist die ganze Warnung, '
           'die man bekommt.',
     hindernisse=[raucher(26.5, 17.5, angle=270, weite=11.0, takt=4.6),
                  tang(30, 4, 32, 8, takt=3.4)])

# --- 11: das Kaltwasserfeld. Zwei Stege, auf jedem zieht es – und zwar gegeneinander.
f = meer(46, 23)
gang(f, 3, 7, 42, 7)
gang(f, 3, 16, 42, 16)
gang(f, 23, 7, 23, 16)
setz(f, 4, 16, 'T'); setz(f, 41, 7, 'H')
bahn('Das Kaltwasserfeld', 'meeresgrund', f, par=5,
     intro='Zwei Stege, auf beiden zieht es – oben nach rechts, unten nach links, und beide als '
           'Dünung: Sie kommt und geht. Verbunden sind sie nur in der Mitte, und mitten in der '
           'Verbindung dreht sich das Wasser. Stehenbleiben geht nirgends.',
     hindernisse=[strom(10, 6, 19, 8, 0, tempo=6.0, puls=1.25),
                  strom(27, 6, 36, 8, 0, tempo=6.0, puls=1.25, phase=1.6),
                  strom(10, 15, 19, 17, 180, tempo=6.0, puls=1.25, phase=3.14),
                  strom(27, 15, 36, 17, 180, tempo=6.0, puls=1.25, phase=4.7),
                  strudel(23.5, 11.5, 2.8, dreh=1),
                  muschel(23.5, 6.5, angle=0, phase=0.3)])

# --- 12: der Schlund. Das Ende: zwei Äste, die Kammer – und der Anglerfisch.
f = meer(48, 25)
gang(f, 3, 12, 11, 12)
gang(f, 11, 5, 11, 19)
gang(f, 11, 5, 22, 5)
gang(f, 11, 19, 22, 19)
kammer(f, 22, 8, 34, 16)
gang(f, 22, 5, 22, 8)
gang(f, 22, 16, 22, 19)
gang(f, 34, 12, 44, 12)
umweg(f, 11, 34, 12, 22)
setz(f, 4, 12, 'T'); setz(f, 43, 12, 'H')
fuell(f, 14, 4, 18, 6, 's')
fuell(f, 14, 18, 18, 20, 's')
bahn('Der Schlund', 'meeresgrund', f, par=5,
     intro='Das Ende. Zwei Äste, in jedem ein Becken, und beide münden in die Kammer, in der es '
           'zieht, sich alles dreht – und in der ein Anglerfisch seine Bahn zieht. Wen seine '
           'Laterne erreicht, der spielt den letzten Schlag noch einmal.',
     hindernisse=[becken(14, 4, 18, 6), becken(14, 18, 18, 20, start=4.4),
                  strom(24, 10, 32, 14, 0, tempo=5.0, puls=1.15),
                  strudel(28.0, 12.5, 2.6, dreh=-1),
                  angler(23, 9, 33, 15, tempo=2.2),
                  raucher(37.5, 12.5, angle=0, weite=6.0, takt=5.2),
                  pumpwerk(7.0, 12.5)])


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
    if 'autoDecor' in b:
        a = b['autoDecor']
        kopf += f"    autoDecor: {{ density: {a['density']}, seed: {a['seed']} }},\n"
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
