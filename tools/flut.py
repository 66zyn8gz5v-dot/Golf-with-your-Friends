# -*- coding: utf-8 -*-
"""Baut die Bahnen der Welt „Die Flut" und prüft sie, bevor sie geschrieben werden.

    python3 tools/flut.py

WARUM DIESE WELT EIN EIGENES WERKZEUG BRAUCHT
In jeder anderen Welt ist eine Bahn fertig, wenn ein Weg vom Abschlag zum Loch führt. Hier nicht:
Der Weg muß auch dann noch führen, wenn das Wasser schon zwei, drei Ringe gefressen hat – sonst
sitzt man auf einer Insel und kann nichts mehr tun als zusehen. Umgekehrt darf die Bahn nicht so
breit sein, daß die Flut bis zum letzten Schlag nichts ändert; dann ist die Weltregel bloß Deko.

Darum rechnet dieses Werkzeug dieselben Ringnummern wie src/obstacles_flut.js und sagt für jede
Bahn zweierlei: **wieviel Boden bei voller Flut übrig ist** und **bei welcher Stufe der Weg reißt**.
Das Erste ist die Probe darauf, daß die Weltregel überhaupt etwas tut; das Zweite ist die Aufgabe
der Bahn in einer Ziffer – ab dieser Stufe muß man warten, bis die Tide zurückgeht.

Daß eine Bahn zeitweise in Inseln zerfällt, ist erlaubt und oft gewollt. Unspielbar wird sie davon
nicht, weil das Wasser wieder fällt (siehe src/obstacles_flut.js). Unspielbar wäre nur eine Bahn,
auf der schon bei der ersten Stufe nichts mehr geht – dafür steht die Untergrenze weiter unten.

KARTENLEGENDE wie in courses.js: '#' Boden, '.' offenes Wasser/Abgrund, 'T' Abschlag, 'H' Loch,
'x' Block, 'w' Wasser, 's' bremsender Grund (hier: Schlick), 'i' Eis (hier: nasser Stein).
"""
import io
from collections import deque

FLUT_START = 9.0     # muß zu src/obstacles_flut.js passen – tools/flut.mjs prüft das
FLUT_TAKT = 4.5
FLUT_MAX = 4
FLUT_HALT = 7

BODEN = set('#siwlTHoABCDEF')     # alles, was das Spiel als Boden zählt
TROCKEN = set('#siTHoABCDEF')     # davon das, was die Flut noch fressen kann


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


def flut(start=FLUT_START, takt=FLUT_TAKT, max_=FLUT_MAX, halt=FLUT_HALT):
    return {'type': 'flut', 'start': start, 'takt': takt, 'max': max_, 'halt': halt}


def pumpwerk(x, y, r=0.8, stufen=2, dauer=7):
    return {'type': 'pumpwerk', 'x': x, 'y': y, 'r': r, 'stufen': stufen, 'dauer': dauer}


def bande(x, y, w, h):
    return {'type': 'wall', 'x': x, 'y': y, 'w': w, 'h': h}


# ---------------------------------------------------------------- Ringnummern
def ringe(karte, tee, cup):
    """Dieselbe Vielquellen-Breitensuche wie src/obstacles_flut.js.

    Sie hier noch einmal zu schreiben ist Absicht: Stimmten die beiden nicht überein, würde eine
    Bahn hier durchgehen und im Spiel absaufen. tools/flut.mjs vergleicht darum die Zahlen aus
    dieser Rechnung mit denen der laufenden Maschine."""
    H, W = len(karte), len(karte[0])
    def trocken(x, y):
        return 0 <= x < W and 0 <= y < H and karte[y][x] in TROCKEN
    r = [[0] * W for _ in range(H)]
    q = deque()
    for y in range(H):
        for x in range(W):
            if not trocken(x, y):
                q.append((x, y))
    for x in range(W):
        for y in (0, H - 1):
            if trocken(x, y) and not r[y][x]: r[y][x] = 1; q.append((x, y))
    for y in range(H):
        for x in (0, W - 1):
            if trocken(x, y) and not r[y][x]: r[y][x] = 1; q.append((x, y))
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if not trocken(nx, ny) or r[ny][nx]: continue
            r[ny][nx] = r[y][x] + 1
            q.append((nx, ny))
    for (x, y) in (tee, cup):
        r[y][x] = 9999
    return r


def finde(karte, z):
    for y, zeile in enumerate(karte):
        x = zeile.find(z)
        if x >= 0: return (x, y)
    return None


def verbunden(karte, r, stufe, tee, cup):
    """Führt bei dieser Stufe noch ein trockener Weg vom Abschlag zum Loch?"""
    H, W = len(karte), len(karte[0])
    def begehbar(x, y):
        return 0 <= x < W and 0 <= y < H and karte[y][x] in TROCKEN and r[y][x] > stufe
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


def reisst_bei(karte, r, tee, cup):
    """Die Stufe, ab der kein trockener Weg mehr vom Abschlag zum Loch führt.

    Das ist die Uhr der Bahn: Ab hier muß über Wasser gespielt werden – oder gar nicht mehr.
    Gibt None zurück, wenn ein Rückgrat bis zuletzt stehenbleibt; das ist erlaubt und für die
    ersten Bahnen sogar richtig, solange ringsum genug verschwindet."""
    for s in range(0, FLUT_MAX + 1):
        if not verbunden(karte, r, s, tee, cup):
            return s
    return None


def trockene_felder(karte, r, stufe):
    return sum(1 for y, zeile in enumerate(karte) for x, c in enumerate(zeile)
               if c in TROCKEN and r[y][x] > stufe)


def pruefe(b):
    fehler = []
    karte = b['map']
    tee, cup = finde(karte, 'T'), finde(karte, 'H')
    if not tee: fehler.append('kein Abschlag'); return fehler, None
    if not cup: fehler.append('kein Loch'); return fehler, None
    r = ringe(karte, tee, cup)
    hind = b['obstacles']

    if not any(o['type'] == 'flut' for o in hind):
        fehler.append('keine Flut – dann ist es keine Bahn dieser Welt')

    # Abschlag und Loch müssen Nachbarn haben, die die Flut lange genug in Ruhe läßt: sonst steht
    # man von Anfang an auf einer Insel und der erste Schlag ist zugleich der einzige.
    for name, (x, y) in (('Abschlag', tee), ('Loch', cup)):
        nachbarn = [r[y + dy][x + dx] for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))
                    if 0 <= y + dy < len(karte) and 0 <= x + dx < len(karte[0])]
        if max(nachbarn or [0]) < 2:
            fehler.append(f'{name} liegt gleich bei Stufe 1 auf einer Insel')

    riss = reisst_bei(karte, r, tee, cup)
    if riss is not None and riss <= 1:
        fehler.append(f'der Weg reißt schon bei Stufe {riss} – zu wenig Zeit')

    # Daß der Weg reißt, ist *nicht* die Bedingung: Eine Bahn darf ein Rückgrat behalten. Die
    # Bedingung ist, daß die Flut wirklich Boden nimmt. Bliebe am Ende fast alles trocken, wäre
    # die Weltregel bloß ein Farbspiel – dann fehlt der Bahn die Frage, um die es hier geht.
    anfang = trockene_felder(karte, r, 0)
    rest = trockene_felder(karte, r, FLUT_MAX)
    if anfang and rest > anfang * 0.45:
        fehler.append(f'bei voller Flut sind noch {round(100 * rest / anfang)} % trocken – '
                      'die Flut ändert auf dieser Bahn zu wenig')

    # Das Pumpwerk gehört ins Nasse. Stünde es auf dem trockenen Rückgrat, bekäme man den Boden
    # geschenkt; es soll etwas kosten, dorthin zu gehen.
    for o in hind:
        if o['type'] != 'pumpwerk': continue
        x, y = int(o['x']), int(o['y'])
        if karte[y][x] not in TROCKEN:
            fehler.append('ein Pumpwerk steht nicht auf Boden')
        elif r[y][x] > 3:
            fehler.append(f'ein Pumpwerk liegt auf Ring {r[y][x]} – dort wird es nie naß')

    felder = sum(1 for z in karte for c in z if c in BODEN)
    return fehler, {'breit': len(karte[0]), 'hoch': len(karte), 'felder': felder,
                    'riss': riss, 'anfang': anfang, 'rest': rest,
                    'tiefster': max(max(z for z in zeile if z < 9000) for zeile in r)}


# ================================================================ Die Bahnen
# Die Bahnen dieser Welt sind mit Absicht groß. Die Flut frißt fünf Ringe; auf einer Bahn, die nur
# zehn Felder breit ist, bliebe danach nichts übrig als eine Linie. Erst ab etwa fünfzehn Reihen
# bleibt ein Rückgrat stehen, auf dem man noch spielen kann – das ist der Grund für die Maße.

# --- Bahn 1: der Kai vor der Stadt. Zum Kennenlernen: Die Flut nimmt die Breite, nicht den Weg.
f = leer(36, 19)
fuell(f, 2, 2, 33, 16)
fuell(f, 14, 2, 20, 6, 'w')        # Hafenbecken: offenes Wasser, kein Abgrund – und eine Quelle der Flut
fuell(f, 13, 7, 21, 7, 's')        # Schlick am Beckenrand: hier kommt das Wasser zuerst von innen
setz(f, 7, 9, 'T')
setz(f, 28, 9, 'H')
fuell(f, 10, 12, 11, 13, 'x')      # Schuppen auf dem Kai
fuell(f, 24, 12, 25, 13, 'x')
bahn('Der Kai', 'deich', f, par=3,   # Bot: Median 2 – Par 3 läßt einen Schlag Luft für die Flut
     intro='Die Springflut kommt, und sie kommt von beiden Seiten und aus dem Hafenbecken dazu. '
           'Der Kai ist breit genug, daß ein Streifen stehenbleibt – aber nur ein Streifen. Wer '
           'sich Zeit läßt, spielt ihn auf einem Steg zu Ende.',
     hindernisse=[flut()])

# --- Bahn 2: zwei Höfe, eine Gasse, ein Pumpwerk. Hier reißt der Weg, und zwar früh.
f = leer(38, 19)
fuell(f, 2, 2, 15, 16)             # Hof am Abschlag
fuell(f, 22, 2, 35, 16)            # Hof am Loch
fuell(f, 16, 7, 21, 11)            # die Gasse dazwischen – das erste, was absäuft
setz(f, 8, 9, 'T')
setz(f, 29, 9, 'H')
fuell(f, 12, 8, 12, 10, 'x')       # Hausecke: der gerade Schlag trifft die Wand, nicht die Gasse
fuell(f, 25, 12, 26, 13, 'x')
bahn('Die Gasse', 'gassen', f, par=4,
     intro='Die Gasse zwischen den Höfen ist die einzige Verbindung, und sie ist das Erste, was '
           'absäuft. Unten links liegt das Pumpwerk: Wer darüberrollt, drückt das Wasser für ein '
           'paar Sekunden zurück – muß dafür aber dorthin, wo es zuerst steht.',
     hindernisse=[flut(), pumpwerk(4.5, 14.5)])


# ================================================================ Prüfen
fehler_gesamt = 0
for b in BAHNEN:
    fehler, z = pruefe(b)
    for fe in fehler:
        print(f"FEHLER  {b['name']}: {fe}")
        fehler_gesamt += 1
    if z:
        riss = 'nie' if z['riss'] is None else f"Stufe {z['riss']}"
        print(f"  {b['name']:<12} {z['breit']:>2}x{z['hoch']:<2} {b['theme']:<7} Par {b['par']} · "
              f"{z['felder']:>3} Felder · tiefster Ring {z['tiefster']} · "
              f"trocken {z['anfang']} → {z['rest']} ({round(100 * z['rest'] / z['anfang'])} %) · "
              f"Weg reißt bei {riss}")

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

   NOCH NICHT FERTIG. Zurzeit stehen hier zwei Probebahnen: eine für die Flut allein, eine für das
   Pumpwerk. Sie sind da, damit die Weltregel angesehen und gespielt werden kann, bevor neun Bahnen
   darauf gebaut werden – und darum trägt die Welt in src/courses_pro.js die Kennzeichnung
   'nurVorschau'. Im Spiel taucht sie nicht auf.

   DIE FRAGE DIESER WELT IST: *wie lange noch?* Das Wasser steigt, Ring für Ring, von den Rändern
   nach innen, und es nimmt der Bahn dabei die Breite. Abschlag und Loch bleiben trocken; alles
   dazwischen kann verschwinden. Die Weltregel selbst steht in src/obstacles_flut.js, gezeichnet
   wird sie in src/render_flut.js.

   Kartenlegende wie in courses.js: '#' Boden, '.' offenes Wasser, 'x' Block, 's' Schlick (bremst),
   'T' Abschlag, 'H' Loch. */
const FLUT_COURSES = [
"""
io.open('src/courses_flut.js', 'w', encoding='utf-8').write(
    kopf + ',\n'.join(js(b) for b in BAHNEN) + ',\n];\n')
print(f"\nsrc/courses_flut.js geschrieben – {len(BAHNEN)} Bahnen")
