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

    WASSER ODER ABGRUND – DAS IST DIE WICHTIGSTE ENTSCHEIDUNG JEDER BAHN.
    Am Rand eines Stegs über dem ABGRUND baut das Spiel eine Bande: Wer dagegengedrückt wird,
    prallt ab und bleibt liegen. Über WASSER gibt es keine Bande: Wer hinausgetrieben wird, geht
    unter und zahlt einen Strafschlag.

    Beides wird gebraucht, und der erste Anlauf hatte nur eins davon. Damals stand hier, offenes
    Wasser sei nötig, damit die Strömung überhaupt jemanden herunterspülen kann – das stimmt, und
    es galt dann für alle zwölf Bahnen. Ergebnis: die ganze Welt hatte genau EINE Bande. Damit
    gibt es nur einen Schlag – gerade und vorsichtig, sonst Wasser –, kein Winkel, kein Abprall,
    und nach drei Bahnen hat man alles gesehen.

    Jetzt legt jede Bahn selbst fest, wo was gilt: mauer() zieht Banden, wo gespielt wird, und
    offenes Wasser bleibt dort, wo die Strömung wirklich gefährlich sein soll.

    Ganz außen bleibt ein Rahmen aus Abgrund, damit die Bahn eine Kante hat und nicht ins Nichts
    ausfranst."""
    f = leer(breit, hoch, 'w')
    for x in range(breit):
        f[0][x] = '.'; f[hoch - 1][x] = '.'
    for y in range(hoch):
        f[y][0] = '.'; f[y][breit - 1] = '.'
    return f


def mauer(f, x0, y0, x1, y1):
    """Zieht eine MAUER um alles, was in diesem Rechteck an Boden grenzt: Jede Wasserkachel darin,
    die neben Boden liegt, wird zu Abgrund – und daraus baut das Spiel eine Bande.

    DAS IST DAS WICHTIGSTE BAUTEIL DIESER WELT, UND ES HAT LANGE GEFEHLT.
    Eine Bande entsteht nur an der Kante zwischen Boden und ABGRUND. Wasser ist begehbarer Boden,
    an dem man versinkt – dort gibt es keine Kante, an der etwas abprallen könnte. Die ersten zwölf
    Bahnen waren durchweg Stege im offenen Wasser, also hatte die ganze Welt genau EINE Bande,
    und damit nur einen einzigen Schlag: gerade und vorsichtig, sonst Wasser. Kein Winkel, kein
    Abprall, kein Bandenspiel – und nach drei Bahnen hatte man alles gesehen.

    Jetzt gibt es beides, und jedes an seinem Platz: Mauern dort, wo man spielen soll, offenes
    Wasser dort, wo die Strömung jemanden herunterspülen soll."""
    for y in range(max(0, y0), min(len(f), y1 + 1)):
        for x in range(max(0, x0), min(len(f[0]), x1 + 1)):
            if f[y][x] != 'w': continue
            if any(0 <= y + dy < len(f) and 0 <= x + dx < len(f[0]) and f[y + dy][x + dx] in BODEN
                   for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))):
                f[y][x] = '.'


def klotz(f, x, y, b=1, h=1):
    """Ein Mauerklotz mitten in der Bahn: ein Pfeiler, eine Hausecke, ein Wrackteil. Er hat ringsum
    eine Bande, also kann man ihn anspielen – das ist der zweite Weg zu Winkeln, neben dem Rand."""
    for yy in range(y, y + h):
        for xx in range(x, x + b):
            if 0 <= yy < len(f) and 0 <= xx < len(f[0]): f[yy][xx] = 'x'


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


def platz(f, x0, y0, x1, y1, z='#'):
    """Ein ummauerter Raum: Boden im Rechteck, Bande ringsum. Das Gegenstück zum Steg."""
    fuell(f, x0, y0, x1, y1, z)
    mauer(f, x0 - 1, y0 - 1, x1 + 1, y1 + 1)


def rinne(f, x0, y0, x1, y1, b=3, z='#'):
    """Ein Gang MIT Banden – eine Gasse zwischen Häusern statt eines Stegs über dem Meer."""
    gang(f, x0, y0, x1, y1, b, z)
    h = (b - 1) // 2
    if y0 == y1:
        mauer(f, min(x0, x1) - 1, y0 - h - 1, max(x0, x1) + 1, y0 + (b - 1 - h) + 1)
    else:
        mauer(f, x0 - h - 1, min(y0, y1) - 1, x0 + (b - 1 - h) + 1, max(y0, y1) + 1)


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
# Landwelten (0,4) stünde der Meeresgrund voll wie ein Möbellager. Ein knappes Viertel war der
# erste Versuch, und das war zuviel: Auf den großen Bahnen standen über zweihundertfünfzig
# Gegenstände ringsum, und vor lauter Fässern, Masten und Korallen sah man die Bahn nicht mehr.
# Deko ist Umgebung, nicht Inhalt – sie soll den Rand füllen, nicht um Aufmerksamkeit bitten.
DEKO_DICHTE = 0.09
# Und die schwebenden Wesen ringsum – Schwärme, Rochen, Schildkröten, Quallen. Sie stehen weiter
# auseinander als die Bodendeko, weil jedes einzelne größer ist und sich bewegt: Ein Rand voller
# zappelnder Tiere zieht den Blick von der Bahn weg, und die soll man ansehen.
SCHWEB_DICHTE = 0.025


# Die TIEFE jeder Bahn, von der Wasserlinie (0) bis zum Grund (1). Sie läuft gleichmäßig durch:
# Bahn 1 liegt dicht unter der Oberfläche, Bahn 12 ganz unten, und dazwischen geht es Schritt für
# Schritt hinunter. Die vier Paletten bleiben als Stützstellen stehen; zwischen ihnen mischt
# themaFuer() in src/themes.js. Vorher lagen je drei Bahnen auf derselben Palette – dann sprang
# die Farbe drei Mal hart um, und der Abstieg war kein Abstieg, sondern vier Zimmer.
# Der erste Wert ist NICHT null, sondern die Tiefe der obersten Palette. Alles darunter wird
# abgeschnitten, weil es keine Stützstelle mehr gibt – und dann sind die ersten beiden Bahnen
# farblich fast gleich, während anderswo ein ordentlicher Schritt liegt. Die Prüfung in
# tools/flut.mjs hat genau das gemeldet: größter Farbschritt 17,5, kleinster 3,0.
def _tiefen(n=13, von=0.12, bis=1.0):
    return [round(von + (bis - von) * i / (n - 1), 3) for i in range(n)]


TIEFEN = _tiefen()


def bahn(name, theme, karte, hindernisse=None, par=3, intro=None, maxStrokes=None):
    b = {'name': name, 'par': par, 'theme': theme, 'map': txt(karte),
         'tiefe': TIEFEN[min(len(BAHNEN), len(TIEFEN) - 1)],
         'obstacles': hindernisse or [],
         'autoDecor': {'density': DEKO_DICHTE, 'seed': DEKO_SAAT[len(BAHNEN) % len(DEKO_SAAT)]},
         'schwebDecor': {'density': SCHWEB_DICHTE, 'seed': DEKO_SAAT[len(BAHNEN) % len(DEKO_SAAT)] + 7}}
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


def schoepfrad(x, y, achse='y', breit=6.0, spalt=1.8, tiefe_=1.4, hoch=2.2,
               schaufeln=8, rad=1.6, tempo=0.9, phase=0.0):
    """DAS SCHÖPFRAD – die Mühle der versunkenen Stadt.

    Dieselbe Maschine wie die Windmühle: ein Torhaus, dessen Durchgang im Takt der Flügel zufällt.
    Nur treibt sie hier unten kein Wind, sondern die Strömung, und die Flügel sind die Schaufeln
    eines hölzernen Rades. 'achse' sagt, in welche Richtung sich das HAUS erstreckt – bei 'y'
    läuft der Weg also in x-Richtung hindurch."""
    return {'type': 'windmill', 'style': 'schoepfrad', 'x': x, 'y': y, 'axis': achse,
            'w': breit, 'gap': spalt, 'depth': tiefe_, 'height': hoch,
            'blades': schaufeln, 'len': rad, 'speed': tempo, 'phase': phase}


def wrackkanone(x, y, richtung=0, schwenk=16, weite=9.0, tempo=0.9, phase=0.0, laden=0.7):
    """DIE WRACKKANONE – die Kanone der versunkenen Stadt.

    Es ist dieselbe Maschine wie die Kanone im Märchenland, nur in der Gestalt, die hier unten
    Sinn ergibt: ein Bronzegeschütz von einem gesunkenen Schiff. 'richtung' und 'schwenk' stehen
    in GRAD, weil man sich Grad vorstellen kann und Bogenmaß nicht; umgerechnet wird hier.

    'weite' ist die Flugstrecke in Kacheln – WO DER BALL AUFKOMMT, MUSS BODEN SEIN. Das ist der
    Fehler, den man der Karte nicht ansieht, und pruefe() rechnet ihn darum nach."""
    return {'type': 'cannon', 'style': 'wrackkanone', 'x': x, 'y': y,
            'base': round(math.radians(richtung), 4), 'amp': round(math.radians(schwenk), 4),
            'speed': tempo, 'phase': phase, 'range': weite, 'loadTime': laden}


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
            # WO DER BALL LANDET, MUSS BODEN SEIN. Das Auslauffeld selbst ist ein Gitter in der
            # Mauer – dort stünde der Ball ohne Grund –, darum setzt src/obstacles_flut.js ihn
            # eine knappe Kachel weiter in Richtung 'angle' ab. Steht dort Wasser, spuckt das Rohr
            # ins Nichts, und man sieht es der Karte nicht an.
            w = math.radians(o.get('angle', 0))
            lx, ly = int(zx + 0.5 + math.cos(w) * 0.95), int(zy + 0.5 + math.sin(w) * 0.95)
            if not (0 <= ly < len(karte) and 0 <= lx < len(karte[0]) and karte[ly][lx] in BODEN):
                fehler.append(f'ein Abflußrohr setzt den Ball auf {lx}/{ly} ab, und dort ist kein '
                              'Boden – die Landestelle liegt eine Kachel in Richtung des Winkels')
            elif (lx, ly) == cup:
                fehler.append('ein Abflußrohr setzt den Ball genau ins Loch ab')
            else:
                # UND DAS ROHR STÖSST. Es setzt nicht bloß ab, es gibt einen Schub von 5,5
                # Kacheln je Sekunde mit; bei einer Reibung von 4,2 trägt der rund dreieinhalb
                # Kacheln weit. Steht dort Wasser, ist der Ball weg – im Kaltwasserfeld hat genau
                # das den Ball über den Stegrand geschoben, und die Karte sah völlig harmlos aus.
                # Eine Bande (Abgrund oder Klotz) fängt ihn dagegen auf, dann ist alles gut.
                for k in range(1, 5):
                    px, py = int(lx + math.cos(w) * k), int(ly + math.sin(w) * k)
                    if not (0 <= py < len(karte) and 0 <= px < len(karte[0])): break
                    c2 = karte[py][px]
                    if c2 in ('.', 'x'): break          # Bande – sie hält ihn auf
                    if c2 not in BODEN or c2 == 'w':
                        fehler.append(f'der Schub eines Abflußrohrs treibt den Ball auf {px}/{py} '
                                      'ins Wasser – hinter der Landestelle braucht es vier Kacheln '
                                      'Boden oder eine Bande')
                        break
            # Und der Einlauf darf nicht neben dem Abschlag liegen: Er schluckt jeden, der ihn
            # berührt, also wäre man weg, bevor man den ersten Schlag richtig getan hat.
            if abs(ex - tee[0]) + abs(ey - tee[1]) < 4:
                fehler.append('der Einlauf eines Abflußrohrs liegt neben dem Abschlag')
            # Unterwegs ist die Leitung unter dem Grund – aber sie soll eine Strecke überbrücken,
            # die zu Fuß länger ist. Sonst ist sie ein teurer Umweg um zwei Kacheln.
            if abs(ex - zx) + abs(ey - zy) < 6:
                fehler.append('ein Abflußrohr überbrückt fast nichts – der Weg drumherum ist kürzer')

    # KEINE FREIE SICHTLINIE VOM ABSCHLAG INS LOCH. Als das Wasser den Banden wich, fiel mit dem
    # Wasser auch die Strafe weg: Der Kessel war mit EINEM Schlag zu lochen, weil Abschlag und Loch
    # auf einer Geraden lagen und nichts dazwischen mehr etwas gekostet hat. Eine Bahn, die man
    # blind durchziehen kann, ist kein Hindernis, sondern ein Ass.
    #
    # Was zählt als „etwas dazwischen": alles, was nicht glatter Boden ist (Mauer, Klotz, Wasser,
    # Schlick), und jede Maschine, die auf ihrer Fläche wirklich zupackt oder schiebt.
    # DER STRUDEL ZÄHLT AUSDRÜCKLICH NICHT, und das ist gemessen: Im Kessel saß er genau auf der
    # Linie, und der Bot lochte trotzdem mit einem Schlag. Wer mitten durch die Mitte rollt, wird
    # nach links so stark gezogen wie nach rechts – unterm Strich passiert nichts. Ein Strudel
    # lenkt ab, wenn man SCHRÄG an ihm vorbeikommt; als Sperre taugt er nicht.
    sperren = set()
    for o in b['obstacles']:
        art = o['type']
        if art == 'windmill':
            # Das Torhaus steht quer im Weg – durch den Spalt sieht man nicht weit.
            for dy2 in range(-2, 3):
                for dx2 in range(-2, 3): sperren.add((int(o['x']) + dx2, int(o['y']) + dy2))
        elif art in ('stroemung', 'flut', 'tangwald'):
            x0, y0, x1, y1 = grenzen(o)
            for y in range(y0, y1 + 1):
                for x in range(x0, x1 + 1): sperren.add((x, y))
        elif art in ('muschel', 'wracktor', 'ankerkette', 'raucher'):
            rr = o.get('len') or o.get('weite') or o.get('r') or 1.0
            for y in range(int(o['y'] - rr) - 1, int(o['y'] + rr) + 2):
                for x in range(int(o['x'] - rr) - 1, int(o['x'] + rr) + 2):
                    if (x + 0.5 - o['x']) ** 2 + (y + 0.5 - o['y']) ** 2 <= rr * rr:
                        sperren.add((x, y))
        elif art == 'angler':
            for i in range(41):
                u = i / 40
                sperren.add((int(o['x0'] + (o['x1'] - o['x0']) * u),
                             int(o['y0'] + (o['y1'] - o['y0']) * u)))

    tx, ty = tee[0] + 0.5, tee[1] + 0.5
    hx, hy = cup[0] + 0.5, cup[1] + 0.5
    schritte = max(2, int(math.hypot(hx - tx, hy - ty) * 4))
    frei = True
    for i in range(1, schritte):
        u = i / schritte
        ix, iy = int(tx + (hx - tx) * u), int(ty + (hy - ty) * u)
        if not (0 <= iy < len(karte) and 0 <= ix < len(karte[0])): frei = False; break
        if karte[iy][ix] not in '#TH' or (ix, iy) in sperren: frei = False; break
    if frei:
        fehler.append('vom Abschlag führt eine freie gerade Linie ins Loch – das ist ein Ass, '
                      'kein Hindernis (Mauer, Klotz, Wasser oder Schlick dazwischenlegen)')

    # DIE WRACKKANONE. Zwei Dinge sieht man ihr auf der Karte nicht an, und beide machen die Bahn
    # kaputt: daß sie selbst auf keinem Boden steht (dann kommt nie ein Ball hinein), und daß sie
    # ins Wasser schießt. Sie schwenkt, also zählt nicht eine Flugbahn, sondern der ganze Fächer –
    # geprüft werden die beiden Ränder und die Mitte. Wer daneben liegt, zahlt einen Strafschlag,
    # ohne etwas falsch gemacht zu haben, und das ist kein Hindernis, sondern eine Falle.
    for o in b['obstacles']:
        if o.get('style') != 'wrackkanone': continue
        kx, ky = int(o['x']), int(o['y'])
        if not (0 <= ky < len(karte) and 0 <= kx < len(karte[0]) and karte[ky][kx] in TROCKEN):
            fehler.append('ein Wrackgeschütz steht auf keinem festen Grund')
        if abs(kx - tee[0]) + abs(ky - tee[1]) < 3:
            fehler.append('ein Wrackgeschütz steht auf dem Abschlag – man wäre geladen, bevor man '
                          'gespielt hat')
        for w in (o['base'] - o['amp'], o['base'], o['base'] + o['amp']):
            zx = int(o['x'] + math.cos(w) * o['range'])
            zy = int(o['y'] + math.sin(w) * o['range'])
            if not (0 <= zy < len(karte) and 0 <= zx < len(karte[0]) and karte[zy][zx] in BODEN
                    and karte[zy][zx] != 'w'):
                fehler.append(f'ein Wrackgeschütz schießt auf {zx}/{zy}, und dort ist kein Boden '
                              f'(Schwenk {round(math.degrees(w))}°, Weite {o["range"]})')
                break

    # DAS SCHÖPFRAD. Ein Torhaus, das nicht auf dem Weg steht, ist eine Kulisse: Der Ball geht
    # zwei Kacheln daneben vorbei, und die Schaufeln drehen sich für niemanden. Geprüft wird
    # darum, daß der Durchgang selbst auf Boden liegt und daß der Weg auch wirklich hindurchführt –
    # also auf beiden Seiten des Hauses Boden ist.
    for o in b['obstacles']:
        if o['type'] != 'windmill': continue
        durch = int(o['x']), int(o['y'])
        if not (0 <= durch[1] < len(karte) and 0 <= durch[0] < len(karte[0])
                and karte[durch[1]][durch[0]] in TROCKEN):
            fehler.append('ein Schöpfrad hat keinen Boden im Durchgang')
            continue
        quer = (1, 0) if o.get('axis', 'y') == 'y' else (0, 1)
        for seite in (-1, 1):
            px = durch[0] + quer[0] * seite * 2
            py = durch[1] + quer[1] * seite * 2
            if not (0 <= py < len(karte) and 0 <= px < len(karte[0]) and karte[py][px] in TROCKEN):
                fehler.append(f'ein Schöpfrad steht nicht IM Weg – auf {px}/{py} ist kein Boden, '
                              'also führt der Weg daran vorbei statt hindurch')
                break

    # Jede Bahn dieser Welt braucht wenigstens eine ihrer Maschinen, sonst könnte sie überall stehen
    eigene = {'flut', 'pumpwerk', 'stroemung', 'strudel', 'angler', 'muschel', 'tangwald', 'raucher',
              'ankerkette', 'wracktor', 'abflussrohr'}
    # Die Wrackkanone ist keine eigene Hindernisart, sondern die Kanone in anderer Gestalt – für
    # die Welt zählt sie trotzdem als ihre, denn so sieht sie nirgendwo sonst aus.
    if not any(o['type'] in eigene or o.get('style') in ('wrackkanone', 'schoepfrad')
               for o in b['obstacles']):
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
# --- 1: die Hafenmole. EINE BANDENBAHN zum Anfangen, und zwar eine mit einer Ecke: unten der
#        lange Kai, oben das Hafenbecken mit dem Loch, dazwischen nur eine drei Kacheln breite
#        Durchfahrt. Wer geradeaus zieht, landet an der Mauer – hier lernt man den Winkel.
f = meer(38, 23)
fuell(f, 3, 12, 33, 16)            # der Kai: der lange Gang am Wasser
fuell(f, 24, 4, 33, 10)            # das Hafenbecken darüber, darin liegt das Loch
fuell(f, 27, 10, 29, 12)           # die Durchfahrt – die einzige Verbindung der beiden
# Die Mole außen herum: der Weg für den, der die Schleuse vollstehen sieht. Sie führt hinunter
# und wieder hinauf, ist also länger – sonst nähme das Becken niemand.
fuell(f, 7, 16, 9, 20)
fuell(f, 7, 19, 23, 20)
fuell(f, 21, 16, 23, 20)
klotz(f, 12, 12, 2, 2)             # ein Poller mitten im Kai, gleich hinter dem Abschlag
klotz(f, 30, 7, 2, 3)              # der Kranfuß deckt das Loch: gerade hinein geht nicht
mauer(f, 0, 0, 37, 22)
setz(f, 5, 15, 'T'); setz(f, 33, 8, 'H')
bahn('Die Hafenmole', 'wasserlinie', f, par=4,
     intro='Ein Hafenbecken mit Kaimauern ringsum – hier geht nichts ins Meer, hier wird über die '
           'Bande gespielt. Nach oben führt eine einzige Durchfahrt, und der Kranfuß deckt das '
           'Loch. Läuft die Schleuse voll, nimmt man die Mole außen herum.',
     hindernisse=[becken(14, 12, 16, 16)])

# --- 2: der Priel. Ein PRIEL SCHLÄNGELT SICH – und diese Bahn tut das auch: vier Kehren,
#        alle gemauert, alle drei Kacheln breit. Und mittendurch eine gerade Abkürzung, in der
#        das Becken steht.
f = meer(44, 21)
gang(f, 3, 4, 20, 4, b=3)          # oben nach rechts
gang(f, 20, 4, 20, 9, b=3)         # hinunter
gang(f, 11, 9, 20, 9, b=3)         # zurück nach links
gang(f, 11, 9, 11, 15, b=3)        # wieder hinunter
gang(f, 11, 15, 33, 15, b=3)       # der lange Lauf nach rechts
gang(f, 33, 9, 33, 15, b=3)        # und hinauf in die Kammer
fuell(f, 28, 6, 40, 12)            # die Kammer, in der das Loch liegt
klotz(f, 35, 9, 2, 2)              # ein Wrackteil davor
# Die Abkürzung: ein gerader Priel von der ersten Kehre in die letzte. Er spart vier Kehren –
# steht das Becken darin voll, schlängelt man eben.
gang(f, 6, 4, 6, 15, b=3)
gang(f, 6, 15, 11, 15, b=3)        # und unten das Stück, das sie in den langen Lauf einfädelt
mauer(f, 0, 0, 43, 20)
setz(f, 4, 4, 'T'); setz(f, 38, 11, 'H')
bahn('Der Priel', 'wasserlinie', f, par=4,
     intro='Vier Kehren, alle gemauert – hier kommt man nur über die Bande vorwärts. Gleich hinter '
           'dem Abschlag geht es gerade hinunter: die Abkürzung. In ihr steht ein Becken, und wenn '
           'das vollsteht, schlängelt man den ganzen Priel entlang.',
     hindernisse=[pumpwerk(7.5, 5.5), becken(5, 8, 7, 12)])

# --- 3: die Buhnen. Der erste STEG ÜBER WASSER, und mit Absicht ohne Rand – hier ist die
#        Strömung gefährlich. Dafür stehen Buhnenpfähle darauf: Klötze mit Bande, an denen man
#        den Winkel doch noch bekommt.
f = meer(44, 21)
gang(f, 3, 10, 40, 10, b=5)
klotz(f, 14, 8, 1, 2)
klotz(f, 20, 11, 1, 2)
klotz(f, 27, 8, 1, 2)
setz(f, 5, 10, 'T'); setz(f, 38, 10, 'H')
bahn('Die Buhnen', 'wasserlinie', f, par=4,
     intro='Ein breiter Steg im offenen Wasser – hier gibt es keinen Rand, der einen aufhält. '
           'Dafür stehen Buhnenpfähle darauf, an denen man den Winkel doch bekommt. Und zwischen '
           'ihnen drückt das Wasser zurück.',
     hindernisse=[strom(17, 9, 25, 11, 180, tempo=4.6),
                  wracktor(32.5, 8.15, len_=2.8, zu=90, gegen=True)])

# ---------------------------------------------------------------- Flachwasser
# --- 4: der Kessel. Eine RUNDE HALLE mit Bande, sechs Pfeilern und dem Strudel in der Mitte.
#
#        Beim ersten Bau stand hier eine leere Schüssel: Abschlag links, Loch rechts, der Strudel
#        genau dazwischen – und der Bot lochte mit EINEM Schlag. Ein Strudel, durch dessen Mitte
#        man rollt, zieht nach beiden Seiten gleich stark und hält keinen auf. Darum stehen jetzt
#        Pfeiler im Ring, und vor dem Loch liegt ein Riegel: Man kommt nur von oben oder unten
#        heran, nie geradeaus.
f = meer(40, 23)
for i, (ein, aus) in enumerate([(9, 30), (6, 33), (4, 35), (3, 36), (3, 36), (4, 35), (6, 33), (9, 30)]):
    fuell(f, ein, 4 + i, aus, 4 + i)       # oben die Rundung
fuell(f, 3, 12, 36, 12)
for i, (ein, aus) in enumerate([(3, 36), (4, 35), (6, 33), (9, 30)]):
    fuell(f, ein, 13 + i, aus, 13 + i)     # unten die Rundung
for kx, ky in [(19, 4), (13, 6), (26, 6), (13, 13), (26, 13), (19, 15)]:
    klotz(f, kx, ky, 2, 2)                 # der Ring aus Pfeilern um den Strudel
# Die Nische mit dem Loch: Decke, zwei Wangen, und der Mund zeigt nach UNTEN.
# Auch das ist gemessen: Mit dem Loch offen im Kessel lochte der einfache Bot im Schnitt nach
# 1,75 Schlägen, einmal gleich beim ersten – eine runde Schüssel mit harten Banden ist ein
# Flipper, in dem alles irgendwann ins Loch fällt. Ein Mund, der von der falschen Seite wegsieht,
# nimmt dem Zufall das.
klotz(f, 30, 6, 5, 1)                      # die Decke der Nische
klotz(f, 30, 7, 1, 3)                      # die linke Wange
klotz(f, 35, 7, 1, 3)                      # die rechte Wange
mauer(f, 0, 0, 39, 22)
setz(f, 6, 14, 'T'); setz(f, 33, 8, 'H')
bahn('Der Kessel', 'flachwasser', f, par=4,
     intro='Ein runder Kessel, ganz aus Mauer, mit sechs Pfeilern darin. In der Mitte dreht sich '
           'das Wasser und schleudert nach außen – und außen ist die Bande, die zurückwirft. Das '
           'Loch liegt in einer Nische, deren Mund nach unten zeigt: Man muß von unten hinauf.',
     hindernisse=[strudel(19.5, 10.0, 3.4, dreh=1)])

# --- 5: das Schöpfrad. EIN TORHAUS QUER IM WEG, und davor dreht sich ein hölzernes Rad. Steht
#        eine Schaufel unten, ist der Durchgang zu – dann wartet man einen Takt oder nimmt den
#        Bogen darunter. Es ist die Mühle dieser Welt, und wie jede Maschine bekommt sie ihre
#        eigene Bahn, bevor sie sich mit anderen mischt.
f = meer(42, 23)
rinne(f, 3, 11, 30, 11, b=5)       # die Hauptgasse, mitten hindurch
fuell(f, 30, 5, 38, 15)            # die Kammer dahinter, in der das Loch liegt
klotz(f, 33, 6, 2, 3)              # ein Pfeiler deckt das Loch
rinne(f, 12, 11, 12, 17, b=4)      # der Bogen für den, der nicht warten will
rinne(f, 12, 17, 27, 17, b=4)
rinne(f, 27, 11, 27, 17, b=4)
mauer(f, 0, 0, 41, 22)
setz(f, 5, 11, 'T'); setz(f, 36, 7, 'H')
bahn('Das Schöpfrad', 'flachwasser', f, par=4,
     intro='Ein Torhaus steht quer im Weg, und davor dreht die Strömung ein großes Schöpfrad. '
           'Steht eine Schaufel unten, kommt niemand hindurch – einen Takt warten, oder den Bogen '
           'darunter nehmen. Der ist länger, aber er ist immer offen.',
     hindernisse=[schoepfrad(20.5, 11.5, achse='y', breit=6.0, spalt=1.8),
                  strom(15, 13, 19, 14, 0, tempo=4.2)])

# --- 5: der Seegraswald. ENGE GASSEN zwischen Mauern, versetzt wie ein Zickzack. Hier zählt der
#        Winkel mehr als die Kraft.
f = meer(42, 23)
rinne(f, 3, 5, 30, 5)
rinne(f, 30, 5, 30, 11)
rinne(f, 10, 11, 30, 11)
rinne(f, 10, 11, 10, 17)
rinne(f, 10, 17, 36, 17)
klotz(f, 20, 4, 1, 1); klotz(f, 20, 6, 1, 1)
klotz(f, 18, 10, 1, 1); klotz(f, 18, 12, 1, 1)
setz(f, 4, 5, 'T'); setz(f, 35, 17, 'H')
bahn('Der Seegraswald', 'flachwasser', f, par=5,
     intro='Drei Gassen im Zickzack, alle gemauert. Hier zählt der Winkel mehr als die Kraft – und '
           'in der mittleren steht ein Tangfeld, das den Schwung frißt.',
     # Kein Becken: Die Gassen haben keinen zweiten Weg, also wäre ein Becken hier eine Sperre
     # und kein Hindernis. Der Tangwald ist die Maschine dieser Bahn.
     hindernisse=[tang(24, 9, 26, 13)])

# --- 6: das Kanonendeck. ZWEI KAMMERN mit je einem Wrackgeschütz, dazwischen eine Wahl.
#        Hier stand bis Fassung 182 die Riesenmuschel. Sie ging, weil zwei Maschinen, die den Ball
#        packen und weiterwerfen (Muschel und Kanone), eine zuviel sind – und die Kanone ist die,
#        bei der man sieht, wohin es geht.
f = meer(42, 23)
rinne(f, 3, 11, 12, 11)
platz(f, 12, 4, 26, 9)             # obere Kammer
platz(f, 12, 13, 26, 18)           # untere Kammer
rinne(f, 12, 9, 12, 13)            # der Schacht, der beide verbindet
rinne(f, 26, 11, 38, 11)
mauer(f, 0, 0, 41, 22)
setz(f, 5, 11, 'T'); setz(f, 36, 11, 'H')
bahn('Das Kanonendeck', 'flachwasser', f, par=4,
     intro='Zwei gemauerte Kammern, in jeder ein Wrackgeschütz. Wer hineinrollt, wird geladen – '
           'und dann geht es hinaus, dorthin, wo das Rohr gerade zeigt. Es schwenkt, also ist der '
           'Augenblick die halbe Miete. Beide Kammern führen zum Ausgang.',
     # Der Fächer bleibt GANZ in der Kammer. Beim ersten Versuch schossen die Geschütze schräg
     # auf den Ausgang zu – und die Ränder des Schwenks landeten im Wasser zwischen den Kammern.
     # Eine Kanone, die bei ungünstigem Augenblick einen Strafschlag kostet, ist keine Maschine,
     # sondern eine Falle; also wirft sie einen quer durch die Kammer, und den Rest spielt man.
     hindernisse=[wrackkanone(15.5, 6.5, richtung=0, schwenk=14, weite=9.0),
                  wrackkanone(15.5, 15.5, richtung=0, schwenk=14, weite=9.0, phase=1.6)])

# ---------------------------------------------------------------- Dämmerzone
# --- 7: die Kanalisation. Ein BANDENLABYRINTH aus Kammern und Klötzen, mit dem Abflußrohr als
#        Abkürzung für den, der den Strudel richtig nimmt.
f = meer(44, 23)
rinne(f, 3, 6, 14, 6)
platz(f, 14, 4, 30, 18)
klotz(f, 18, 7, 2, 2); klotz(f, 25, 7, 2, 2)
klotz(f, 18, 14, 2, 2); klotz(f, 25, 14, 2, 2)
rinne(f, 30, 16, 40, 16)
mauer(f, 0, 0, 43, 22)
setz(f, 5, 6, 'T'); setz(f, 38, 16, 'H')
setz(f, 16, 17, 'A'); setz(f, 34, 16, 'a')
bahn('Die Kanalisation', 'daemmerzone', f, par=4,
     intro='Gleich am Anfang ein Schöpfrad im Torhaus, dann vier Pfeiler im Platz, und über dem '
           'Brunnen dreht sich das Wasser. In der Ecke liegt ein Abflußgitter: Man spielt nicht '
           'hinein, man landet darin – und die Leitung setzt einen hinter dem Platz wieder ab.',
     hindernisse=[strudel(22.0, 11.0, 3.4, dreh=-1), abfluss('A', angle=0),
                  schoepfrad(9.5, 6.5, achse='y', breit=3.6, spalt=1.5, tiefe_=1.2,
                             hoch=2.0, rad=1.3, tempo=1.05)])

# --- 8: die Kaimauer. HALB UND HALB, und das ist der ganze Reiz: links die Mauer, an der man
#        entlangspielen kann, rechts das offene Meer, in das man fällt.
f = meer(44, 23)
gang(f, 3, 6, 40, 6, b=5)
gang(f, 3, 17, 40, 17, b=5)
gang(f, 4, 6, 4, 17, b=4)
gang(f, 39, 6, 39, 17, b=4)
mauer(f, 0, 0, 43, 9)              # der obere Steg bekommt seine Kaimauer …
setz(f, 6, 17, 'T'); setz(f, 37, 5, 'H')
# Ein Abflußgitter in der zweiten Hälfte des unteren Stegs: Wer bis hierher gekommen ist, darf
# hinauf, statt noch bis ganz nach rechts zu fahren. Weiter vorn läge es falsch – dann spielte
# niemand den unteren Steg, und der ist die halbe Bahn.
setz(f, 30, 18, 'C'); setz(f, 30, 8, 'c')
bahn('Die Kaimauer', 'daemmerzone', f, par=5,
     intro='Unten hin, oben zurück. Der untere Steg liegt im offenen Wasser – dort hält einen '
           'nichts. Der obere hat die Kaimauer im Rücken, dort kann man über die Bande spielen. '
           'Über beiden schwingt ein Anker – und in der Mitte liegt ein Abflußgitter, das einen '
           'nach oben setzt, statt ganz außen herumzufahren.',
     hindernisse=[ankerkette(20.5, 12.5, len_=5.0, ruhe=90, takt=5.2),
                  ankerkette(30.5, 11.5, len_=5.0, ruhe=270, takt=5.2, phase=0.5),
                  wracktor(12.5, 15.15, len_=2.8, zu=90, gegen=True),
                  abfluss('C', angle=270)])

# --- 9: der Marktplatz. EIN GROSSER PLATZ mit Häuserecken als Klötzen – der bandenreichste Ort
#        der Welt, und der einzige, auf dem man wirklich Karambolage spielen kann.
f = meer(46, 23)
rinne(f, 3, 6, 12, 6)
platz(f, 12, 4, 34, 19)
for kx, ky in [(17, 8), (17, 14), (24, 6), (24, 16), (30, 8), (30, 14)]:
    klotz(f, kx, ky, 2, 2)
rinne(f, 34, 17, 43, 17)
mauer(f, 0, 0, 45, 22)
setz(f, 5, 6, 'T'); setz(f, 41, 17, 'H')
fuell(f, 20, 11, 23, 13, 's')
setz(f, 14, 18, 'B'); setz(f, 38, 17, 'b')
bahn('Der Marktplatz', 'daemmerzone', f, par=5,
     intro='Sechs Häuserecken stehen auf dem Platz – hier prallt man von allem ab, und genau so '
           'kommt man weiter. Über dem Brunnen dreht sich das Wasser, in der Ecke liegt das '
           'Abflußgitter, und am Ausgang schwingt der Anker – hinter ihm das letzte Schöpfrad.',
     # Kein Becken: Der Platz ist offen, man geht zwei Kacheln daneben vorbei. Drei Maschinen
     # stehen ohnehin darauf.
     hindernisse=[strudel(21.5, 12.0, 2.8, dreh=-1),
                  abfluss('B', angle=0),
                  ankerkette(38.5, 13.5, len_=4.0, ruhe=90, takt=5.2),
                  schoepfrad(37.5, 17.5, achse='y', breit=3.6, spalt=1.5, tiefe_=1.2,
                             hoch=2.0, rad=1.3, tempo=0.85, phase=1.1)])

# ---------------------------------------------------------------- Meeresgrund
# --- 10: die Schlotebene. Unten ein STEG über Wasser mit dem Raucher, oben eine GEMAUERTE Ebene.
#         Der Schlot ist der Weg von der einen in die andere.
f = meer(44, 23)
gang(f, 3, 17, 30, 17, b=5)
platz(f, 8, 4, 38, 8)
rinne(f, 8, 8, 8, 17)
setz(f, 5, 17, 'T'); setz(f, 35, 6, 'H')
bahn('Die Schlotebene', 'meeresgrund', f, par=4,
     intro='Unten der offene Steg, oben die gemauerte Ebene mit dem Loch. Der lange Weg führt ganz '
           'links hinauf – der kurze über den Schlot, der einen hochwirft. Er wirft auch einen '
           'Ball, der nur daliegt.',
     hindernisse=[raucher(26.5, 17.5, angle=270, weite=11.0, takt=4.6),
                  tang(30, 4, 32, 8, takt=3.4)])

# --- 11: das Kaltwasserfeld. Der zweite reine STEG über Wasser – die gefährlichste Bahn, und
#         die einzige, auf der es gegeneinander zieht.
f = meer(46, 23)
gang(f, 3, 7, 42, 7, b=4)
gang(f, 3, 16, 42, 16, b=4)
gang(f, 23, 7, 23, 16, b=4)
setz(f, 5, 16, 'T'); setz(f, 40, 7, 'H')
# Der zweite Weg nach oben. Der mittlere Steg hat den Strudel und die Muschel, hier gibt es das
# Gitter – ruhig, aber es setzt einen dort ab, wo die obere Dünung schiebt. Beides kostet etwas,
# nur eben Verschiedenes.
setz(f, 12, 18, 'D'); setz(f, 12, 7, 'd')
bahn('Das Kaltwasserfeld', 'meeresgrund', f, par=5,
     intro='Zwei Stege im offenen Wasser, auf beiden zieht es – oben nach rechts, unten nach '
           'links, und beide als Dünung: Sie kommt und geht. Hier gibt es keine Bande, die einen '
           'hält. Stehenbleiben geht nirgends. Wer nicht über den Strudelsteg will, nimmt links '
           'das Abflußgitter – und oben steht ein Wrackgeschütz, das weiterhilft.',
     hindernisse=[strom(10, 6, 19, 8, 0, tempo=6.0, puls=1.25),
                  strom(27, 6, 36, 8, 0, tempo=6.0, puls=1.25, phase=1.6),
                  strom(10, 15, 19, 17, 180, tempo=6.0, puls=1.25, phase=3.14),
                  strom(27, 15, 36, 17, 180, tempo=6.0, puls=1.25, phase=4.7),
                  strudel(23.5, 11.5, 2.6, dreh=1),
                  wrackkanone(23.5, 7.5, richtung=0, schwenk=10, weite=6.5, phase=0.3),
                  abfluss('D', angle=0)])

# --- 12: der Schlund. Das Finale: eine GROSSE HALLE mit Banden und Pfeilern, davor zwei Äste mit
#         Becken – und der Anglerfisch zieht durch die Halle.
f = meer(48, 25)
rinne(f, 3, 12, 11, 12)
rinne(f, 11, 6, 11, 20)
rinne(f, 11, 6, 20, 6)             # der obere Ast ist kurz – dort steht das Becken
rinne(f, 11, 20, 20, 20)           # der untere führt tiefer herum und ist damit der Umweg
platz(f, 20, 8, 36, 17)
rinne(f, 20, 6, 20, 8)
rinne(f, 20, 17, 20, 20)
rinne(f, 36, 12, 45, 12)
for kx, ky in [(25, 10), (31, 14)]:
    klotz(f, kx, ky, 2, 2)
mauer(f, 0, 0, 47, 24)
setz(f, 5, 12, 'T'); setz(f, 43, 12, 'H')
bahn('Der Schlund', 'meeresgrund', f, par=5,
     intro='Das Ende. Zwei Äste – der kurze läuft durch ein Becken, der lange tiefer herum –, und '
           'beide münden in die große Halle: zwei '
           'Pfeiler, ein Strudel – und ein Anglerfisch, der seine Bahn zieht. Wen seine Laterne '
           'erreicht, der spielt den letzten Schlag noch einmal.',
     hindernisse=[becken(14, 5, 18, 7),
                  strudel(28.0, 12.5, 2.6, dreh=-1),
                  angler(22, 12, 34, 12, tempo=2.2),
                  raucher(38.5, 12.5, angle=0, weite=5.0, takt=5.2),
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
    if 'tiefe' in b: teile.append(f"tiefe: {b['tiefe']}")
    if 'maxStrokes' in b: teile.append(f"maxStrokes: {b['maxStrokes']}")
    kopf = '    ' + ', '.join(teile) + ',\n'
    if 'intro' in b: kopf += f"    intro: {wert(b['intro'])},\n"
    if 'autoDecor' in b:
        a = b['autoDecor']
        kopf += f"    autoDecor: {{ density: {a['density']}, seed: {a['seed']} }},\n"
    if 'schwebDecor' in b:
        a = b['schwebDecor']
        kopf += f"    schwebDecor: {{ density: {a['density']}, seed: {a['seed']} }},\n"
    karte = ',\n      '.join(f"'{r}'" for r in b['map'])
    hind = ''
    if b['obstacles']:
        zeilen = ',\n      '.join('{ ' + ', '.join(f'{k}: {wert(v)}' for k, v in o.items()) + ' }'
                                  for o in b['obstacles'])
        hind = f",\n    obstacles: [\n      {zeilen},\n    ]"
    return f"  {{\n{kopf}    map: [\n      {karte},\n    ]{hind},\n  }}"


kopf = """/* Die Flut (Weltkennung 'flut'): die versunkene Stadt.
   Erzeugt von tools/flut.py – dort steht auch, warum die Bahnen so aussehen, wie sie aussehen.

   ZWÖLF BAHNEN, und jede hat ihre eigene Form: Hafenbecken, Priel, Steg, Kessel, Gassen,
   Kammern, Platz, Ebene. Die Welt trägt in src/courses_pro.js die Kennzeichnung 'nurVorschau';
   im Spiel taucht sie erst auf, wenn sie dort hingehört.

   BANDEN STATT WASSER, WO GESPIELT WIRD. Eine Bande entsteht nur an der Kante zwischen Boden und
   Abgrund ('.') oder an einem Klotz ('x'); Wasser ('w') ist Boden, an dem man versinkt, und hat
   keine. Die ersten zwölf Bahnen waren durchweg Stege im offenen Wasser – die ganze Welt hatte
   EINE Bande, und damit nur einen Schlag: gerade und vorsichtig, sonst Wasser. Jetzt ist beides
   da, jedes an seinem Platz.

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
