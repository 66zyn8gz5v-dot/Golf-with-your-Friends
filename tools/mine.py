# -*- coding: utf-8 -*-
"""Baut src/courses_mine.js – die neun Bahnen der Zwergenmine.

Warum ein Erzeuger und keine von Hand getippte Datei: Eine Karte ist ein Feld aus Zeichenketten,
und die häufigste Panne dabei ist eine Zeile, die ein Zeichen zu kurz ist. Hier wird jede Karte aus
einem Rechteck gebaut und danach geprüft – rechteckig, genau ein Abschlag, genau ein Loch, ein Weg
dazwischen, und jedes Hindernis dort, wo es auch stehen kann.

Der Bogen der Welt ist ein Abstieg. Er steckt in den vier Paletten:
    Bahn 1     'mundloch'  Tageslicht vor dem Berg, Halde und Förderturm
    Bahn 2-5   'stollen'   die Stollen, Grubenholz und Lampenschein
    Bahn 6-7   'kristall'  die Kristallkammern, der Fels wird violett
    Bahn 8-9   'schmelze'  die unterste Sohle, wo das Erz flüssig wird

Die Frage dieser Welt ist: *was liegt da vorn überhaupt?* Ab Bahn 2 liegt auf jeder Bahn ein
Schleier ('dunkel'), der sich nur um den Ball und um die Grubenlampen öffnet. Darum gilt hier eine
Regel, die es in keiner anderen Welt gibt: **Jede dunkle Bahn muss mit den Lampen allein lesbar
sein.** Der Erzeuger prüft das, so gut es sich prüfen lässt – jede dunkle Bahn braucht Lampen, und
der Weg vom Abschlag zum Loch darf nie länger als GANG_DUNKEL Felder ohne Licht sein.

Dazu die beiden Maschinen der Welt (src/obstacles_mine.js):
    'sprengladung'  wirft im Takt alles im Umkreis nach außen; die Lunte sagt es vorher an
    'kippbuehne'    Bohle über dem Schacht, die zu der Seite kippt, auf der der Ball liegt
    'grubenlampe'   leuchtet ein Stück Bahn aus – auf einer dunklen Bahn das Wertvollste

    python3 tools/mine.py
"""
import io
from collections import deque

GANG_DUNKEL = 7.5        # so weit darf ein Stück Weg höchstens ohne Lampenlicht sein

def leer(b, h, z='.'):
    return [[z] * b for _ in range(h)]

def fuell(f, x0, y0, x1, y1, z='#'):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            f[y][x] = z

def setz(f, x, y, z):
    f[y][x] = z

def scheibe(f, mx, my, rx, ry, z='#'):
    """Eine Ellipse – die Kammern der Mine sind ausgesprengt, nicht gemauert."""
    for y in range(len(f)):
        for x in range(len(f[0])):
            if ((x - mx) / rx) ** 2 + ((y - my) / ry) ** 2 <= 1.0:
                f[y][x] = z

def txt(f):
    return [''.join(r) for r in f]

BAHNEN = []

def bahn(name, theme, karte, hindernisse=None, par=3, dunkel=None, lampe=3.0,
         intro=None, maxStrokes=None, deko=None):
    b = {'name': name, 'par': par, 'theme': theme, 'map': txt(karte),
         'obstacles': hindernisse or []}
    if dunkel: b['dunkel'] = dunkel; b['lampe'] = lampe
    if intro: b['intro'] = intro
    if maxStrokes: b['maxStrokes'] = maxStrokes
    BAHNEN.append(b)

def lampe(x, y, r=3.6):
    return {'type': 'grubenlampe', 'x': x, 'y': y, 'r': r}

def ladung(x, y, phase=0.0, weite=3.2):
    return {'type': 'sprengladung', 'x': x, 'y': y, 'phase': phase, 'weite': weite}

def bohle(x, y, w, h, angle=0):
    return {'type': 'kippbuehne', 'x': x, 'y': y, 'w': w, 'h': h, 'angle': angle}

# ---------------------------------------------------------------------------
# 1 – Mundloch: vor dem Berg, bei Tageslicht. Hier wird nichts Neues verlangt;
#     die Bahn zeigt nur, wohin es gleich geht.
f = leer(26, 14)
fuell(f, 1, 2, 24, 11)
fuell(f, 6, 4, 9, 5, 's')           # Halde: Geröll bremst
fuell(f, 15, 8, 18, 9, 's')
fuell(f, 12, 2, 13, 4, 'x')         # Grubenholz, gestapelt
fuell(f, 12, 9, 13, 11, 'x')
setz(f, 2, 6, 'T'); setz(f, 22, 6, 'H')
bahn('Mundloch', 'mundloch', f, [
    {'type': 'bumper', 'x': 8.5, 'y': 8.5, 'r': 0.6},
    {'type': 'bumper', 'x': 19.5, 'y': 4.5, 'r': 0.6},
    lampe(21.5, 9.5, 3.0),
], par=3,
intro='Vor dem Berg: Halde, Grubenholz, und hinten das Mundloch. Zwischen den Holzstapeln geht es '
      'hindurch – das Geröll bremst, wer zu weit ausholt. Ab hier wird es dunkel.')

# ---------------------------------------------------------------------------
# 2 – Erster Stollen: die Dunkelheit und die Lampen. Ein gerader Gang mit zwei
#     Knicken; wer die Lampen abfährt, sieht immer genug.
f = leer(30, 13)
fuell(f, 1, 5, 12, 7)
fuell(f, 10, 2, 12, 7)
fuell(f, 10, 2, 22, 4)
fuell(f, 20, 2, 22, 10)
fuell(f, 20, 8, 28, 10)
setz(f, 2, 6, 'T'); setz(f, 26, 9, 'H')
bahn('Erster Stollen', 'stollen', f, [
    lampe(11.5, 6.0, 3.8), lampe(11.5, 3.0, 3.4), lampe(21.5, 3.0, 3.8),
    lampe(21.5, 9.0, 3.4), lampe(26.5, 9.0, 3.2),
], par=3, dunkel=0.62,
intro='Unter Tage sieht man nur, was im Licht steht. Der Schleier öffnet sich um den Ball und um '
      'jede Grubenlampe – dazwischen muss man sich merken, was man beim Hinweg gesehen hat. Den '
      'Lampen nach, dann findet man auch das Loch.')

# ---------------------------------------------------------------------------
# 3 – Sprengfeld: die erste Ladung. Der kurze Weg führt mitten durch ihren Kreis,
#     der lange außen herum. Die Lunte sagt an, wie lange man noch hat.
f = leer(30, 15)
fuell(f, 1, 2, 28, 12)
fuell(f, 8, 2, 10, 5, 'x')
fuell(f, 8, 9, 10, 12, 'x')
fuell(f, 18, 6, 20, 8, 'x')
setz(f, 3, 7, 'T'); setz(f, 26, 7, 'H')
bahn('Sprengfeld', 'stollen', f, [
    ladung(13.5, 7.5, 0.0),
    ladung(23.0, 3.5, 0.45),
    lampe(9.0, 7.0, 3.4), lampe(14.0, 7.5, 4.2), lampe(22.0, 8.0, 3.8), lampe(26.0, 7.0, 3.2),
], par=4, dunkel=0.6,
intro='Eine Sprengladung liegt mitten im Weg. Der rote Kreis ist ihre Reichweite, die brennende '
      'Lunte ihre Uhr: Wer im Kreis liegt, wenn sie durchgebrannt ist, fliegt nach außen – umso '
      'weiter, je näher er lag. Das ist keine Strafe. Wer sich richtig hinlegt, lässt sich tragen.')

# ---------------------------------------------------------------------------
# 4 – Kippbohle: der Schacht quer durch den Stollen, darüber eine Bohle.
f = leer(28, 13)
fuell(f, 1, 4, 26, 8)
fuell(f, 11, 4, 16, 8, '.')        # der Schacht quer durch den Stollen
fuell(f, 11, 5, 16, 6)             # und der Steg darüber, auf dem die Bohle liegt
setz(f, 3, 6, 'T'); setz(f, 24, 6, 'H')
bahn('Kippbohle', 'stollen', f, [
    bohle(11.0, 5.0, 6.0, 2.0, 0),
    lampe(8.0, 6.0, 3.6), lampe(13.5, 6.0, 4.0), lampe(19.0, 6.0, 3.6),
], par=3, dunkel=0.6,
intro='Über den Schacht führt eine Bohle, die auf einer Achse ruht. Sie kippt zu der Seite, auf '
      'der der Ball liegt: Wer über die Mitte kommt, wird hinübergeworfen – wer davor '
      'liegenbleibt, rutscht zurück. Also nicht zaghaft.')

# ---------------------------------------------------------------------------
# 5 – Lorensohle: Schienen quer durch den Gang, dazu eine Ladung am Ende.
f = leer(32, 14)
fuell(f, 1, 3, 30, 10)
fuell(f, 9, 3, 10, 5, 'x')
fuell(f, 9, 8, 10, 10, 'x')
fuell(f, 19, 3, 20, 6, 'x')
fuell(f, 24, 7, 25, 10, 'x')
setz(f, 3, 7, 'T'); setz(f, 28, 5, 'H')
bahn('Lorensohle', 'stollen', f, [
    {'type': 'rail', 'x0': 14.5, 'y0': 3.2, 'x1': 14.5, 'y1': 10.4},
    {'type': 'mover', 'style': 'cart', 'x0': 14.5, 'y0': 3.5, 'x1': 14.5, 'y1': 10.0, 'period': 4.2, 'r': 0.62},
    {'type': 'rail', 'x0': 22.5, 'y0': 3.2, 'x1': 22.5, 'y1': 10.4},
    {'type': 'mover', 'style': 'cart', 'x0': 22.5, 'y0': 10.0, 'x1': 22.5, 'y1': 3.5, 'period': 3.4, 'r': 0.62},
    ladung(27.5, 8.5, 0.3, 3.0),
    lampe(7.0, 7.0, 3.4), lampe(14.5, 6.5, 4.0), lampe(22.5, 6.5, 4.0), lampe(28.0, 5.0, 3.4),
], par=4, dunkel=0.62,
intro='Auf dieser Sohle fahren die Hunte. Zwei Loren queren den Gang im eigenen Takt – man wartet '
      'sie ab oder schlägt zwischen ihnen hindurch. Kurz vor dem Loch liegt noch eine Ladung.')

# ---------------------------------------------------------------------------
# 6 – Kristallkammer: eine ausgesprengte Halle. Der Fels leuchtet selbst, die
#     Kristalle werfen den Ball zurück, und ein Magnetit zieht ihn aus der Bahn.
f = leer(30, 17)
scheibe(f, 15.0, 8.0, 13.5, 7.5)
fuell(f, 1, 7, 6, 9)
setz(f, 2, 8, 'T'); setz(f, 25, 8, 'H')
bahn('Kristallkammer', 'kristall', f, [
    {'type': 'bumper', 'x': 12.0, 'y': 5.5, 'r': 0.75, 'style': 'crystal'},
    {'type': 'bumper', 'x': 12.0, 'y': 10.5, 'r': 0.75, 'style': 'crystal'},
    {'type': 'bumper', 'x': 18.5, 'y': 8.0, 'r': 0.8, 'style': 'crystal'},
    {'type': 'magnet', 'x': 15.0, 'y': 8.0, 'r': 3.4, 'strength': -3.2},
    lampe(8.0, 8.0, 3.6), lampe(15.0, 8.0, 4.4), lampe(22.0, 8.0, 3.8),
], par=3, dunkel=0.5,
intro='Die Kammer ist ausgesprengt, nicht gemauert – und der Fels leuchtet hier selbst. In der '
      'Mitte sitzt ein Magnetit, der den Ball von sich wegdrückt; die Kristalle werfen ihn '
      'zurück. Wer geradeaus zielt, kommt nie an.')

# ---------------------------------------------------------------------------
# 7 – Zwillingsbohlen: zwei Schächte hintereinander, zwei Bohlen. Zwischen ihnen
#     ist genau ein Absatz Platz – wer zu fest über die erste kommt, fällt in den zweiten.
f = leer(32, 13)
fuell(f, 1, 4, 30, 8)
fuell(f, 9, 4, 13, 8, '.')
fuell(f, 9, 5, 13, 6)
fuell(f, 19, 4, 23, 8, '.')
fuell(f, 19, 5, 23, 6)
setz(f, 3, 6, 'T'); setz(f, 28, 6, 'H')
bahn('Zwillingsbohlen', 'kristall', f, [
    bohle(9.0, 5.0, 5.0, 2.0, 0),
    bohle(19.0, 5.0, 5.0, 2.0, 0),
    lampe(6.5, 6.0, 3.4), lampe(11.5, 6.0, 3.6), lampe(16.5, 6.0, 3.6),
    lampe(21.5, 6.0, 3.6), lampe(27.0, 6.0, 3.4),
], par=3, dunkel=0.55,
intro='Zweimal dasselbe, kurz hintereinander: zwei Schächte, zwei Bohlen. Zwischen ihnen ist ein '
      'schmaler Absatz. Wer über die erste Bohle zu fest hinüberkommt, steht schon auf der '
      'zweiten – und die kippt dann in die falsche Richtung.')

# ---------------------------------------------------------------------------
# 8 – Sohle Neun: die unterste Sohle. Glut in den Spalten, eine Ladung, die über
#     die Lava wirft, und eine Bohle am Ende.
f = leer(32, 15)
fuell(f, 1, 3, 30, 11)
fuell(f, 12, 3, 13, 11, 'l')       # der Lavaspalt quer durch die Sohle
fuell(f, 12, 6, 13, 7)             # ein schmaler Steg hindurch
fuell(f, 22, 3, 26, 11, '.')
fuell(f, 22, 6, 26, 7)
setz(f, 3, 7, 'T'); setz(f, 29, 7, 'H')
bahn('Sohle Neun', 'schmelze', f, [
    ladung(9.0, 7.5, 0.0, 3.4),
    bohle(22.0, 6.0, 5.0, 2.0, 0),
    lampe(7.0, 7.0, 3.6), lampe(12.5, 6.5, 3.4), lampe(18.0, 7.0, 3.8), lampe(24.0, 7.0, 3.6),
], par=4, dunkel=0.48, maxStrokes=14,
intro='Die unterste Sohle: In den Spalten steht die Glut. Durch den Lavaspalt führt ein schmaler '
      'Steg – oder man lässt sich von der Ladung hinüberwerfen, wenn man sich traut. Dahinter '
      'wartet noch ein Schacht mit Bohle.')

# ---------------------------------------------------------------------------
# 9 – Die Schmelze: das Finale. Ein Lavasee mit einem Weg am Rand, zwei Ladungen
#     im Takt gegeneinander, und das Loch auf der Insel in der Mitte.
f = leer(34, 17)
fuell(f, 1, 2, 32, 14)
scheibe(f, 18.0, 8.0, 8.0, 5.0, 'l')      # der See
scheibe(f, 18.0, 8.0, 2.6, 1.7)           # die Insel mit dem Loch
fuell(f, 18, 3, 18, 6)                    # ein Damm hinüber
fuell(f, 6, 2, 7, 6, 'x')
fuell(f, 28, 9, 29, 14, 'x')
setz(f, 3, 8, 'T'); setz(f, 18, 8, 'H')
bahn('Die Schmelze', 'schmelze', f, [
    ladung(18.0, 4.5, 0.0, 3.0),
    ladung(11.0, 12.5, 0.5, 3.2),
    # Im Gang zwischen See und Außenwand ist kein Platz für Prellsteine – dort ließen sie nur
    # 0,7 Kacheln frei. Sie stehen darum im offenen Teil vor dem See.
    {'type': 'bumper', 'x': 8.0, 'y': 4.0, 'r': 0.7},
    {'type': 'bumper', 'x': 8.0, 'y': 12.0, 'r': 0.7},
    lampe(6.0, 8.0, 3.6), lampe(18.0, 4.0, 3.8), lampe(18.0, 8.0, 4.4),
    lampe(12.0, 13.0, 3.6), lampe(26.0, 8.0, 3.4),
], par=5, dunkel=0.45, maxStrokes=15,
intro='Ganz unten steht das Erz flüssig. Mitten im See liegt die Insel mit dem Loch, und nur ein '
      'schmaler Damm führt hinüber – bewacht von einer Ladung, die im Takt alles vom Damm fegt. '
      'Wer den Augenblick nach dem Knall erwischt, hat freie Bahn.')

# ---------------------------------------------------------------------------- Prüfen
FEST = set('#THsi')              # begehbar und nicht tödlich
BODEN = set('#THswli')           # alles, was Boden ist (Wasser und Lava eingeschlossen)

def pruefe(b):
    m = b['map']
    breit, hoch = len(m[0]), len(m)
    assert all(len(r) == breit for r in m), f"{b['name']}: Zeilen verschieden lang"
    start = ziel = None
    for y, r in enumerate(m):
        for x, c in enumerate(r):
            if c == 'T': assert start is None, f"{b['name']}: mehr als ein Abschlag"; start = (x, y)
            if c == 'H': assert ziel is None, f"{b['name']}: mehr als ein Loch"; ziel = (x, y)
    assert start and ziel, f"{b['name']}: Abschlag oder Loch fehlt"
    # Weg vom Abschlag zum Loch über begehbare Felder
    gesehen = {start}; q = deque([start]); weg = {start: 0}
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n in gesehen or not (0 <= n[0] < breit and 0 <= n[1] < hoch): continue
            if m[n[1]][n[0]] not in FEST: continue
            gesehen.add(n); weg[n] = weg[(x, y)] + 1; q.append(n)
    assert ziel in gesehen, f"{b['name']}: kein Weg vom Abschlag zum Loch"
    # Jedes Hindernis muss auf der Karte liegen
    for o in b['obstacles']:
        for kx, ky in (('x', 'y'), ('x0', 'y0'), ('x1', 'y1')):
            if kx in o and ky in o:
                assert 0 <= o[kx] <= breit and 0 <= o[ky] <= hoch, \
                    f"{b['name']}: {o['type']} liegt bei ({o[kx]},{o[ky]}) außerhalb der Karte"
    # Die Bohle muss auf festem Grund liegen – eine Kippbühne über dem Nichts trüge nichts
    for o in b['obstacles']:
        if o['type'] != 'kippbuehne': continue
        for y in range(int(o['y']), int(o['y'] + o['h'])):
            for x in range(int(o['x']), int(o['x'] + o['w'])):
                assert m[y][x] in FEST, f"{b['name']}: Kippbühne liegt bei ({x},{y}) über '{m[y][x]}'"
    # Die Ladung darf nicht auf dem Abschlag selbst liegen
    for o in b['obstacles']:
        if o['type'] != 'sprengladung': continue
        d = ((o['x'] - start[0] - 0.5) ** 2 + (o['y'] - start[1] - 0.5) ** 2) ** 0.5
        assert d > o['weite'] * 0.6, f"{b['name']}: Sprengladung zu dicht am Abschlag ({d:.1f})"
    # Dunkle Bahnen brauchen Licht, und zwar auf dem ganzen Weg
    lampen = [(o['x'], o['y'], o['r']) for o in b['obstacles'] if o['type'] == 'grubenlampe']
    if b.get('dunkel'):
        assert lampen, f"{b['name']}: dunkel, aber keine einzige Grubenlampe"
        dunkelste = 0
        for (x, y) in gesehen:
            if m[y][x] not in FEST: continue
            d = min((((x + 0.5 - lx) ** 2 + (y + 0.5 - ly) ** 2) ** 0.5 - lr) for lx, ly, lr in lampen)
            dunkelste = max(dunkelste, d)
        assert dunkelste <= GANG_DUNKEL, \
            f"{b['name']}: ein Stück Weg liegt {dunkelste:.1f} Felder von jedem Licht entfernt"
    else:
        dunkelste = 0
    felder = sum(1 for r in m for c in r if c in FEST)
    return dict(breit=breit, hoch=hoch, felder=felder, lampen=len(lampen),
                schritte=weg[ziel], dunkelste=dunkelste)

for b in BAHNEN:
    z = pruefe(b)
    print(f"  {b['name']:<17} {z['breit']:>2}x{z['hoch']:<2} {b['theme']:<9} Par {b['par']} · "
          f"{z['felder']:>3} Felder · Weg {z['schritte']:>2} · {z['lampen']} Lampen · "
          f"dunkelste Stelle {z['dunkelste']:.1f}")

# ---------------------------------------------------------------- Schreiben
def wert(v):
    if isinstance(v, str): return "'" + v.replace("'", "\\'") + "'"
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, float): return repr(round(v, 3))
    return repr(v)

def js(b):
    teile = [f"name: {wert(b['name'])}", f"par: {b['par']}", f"theme: {wert(b['theme'])}"]
    if 'maxStrokes' in b: teile.append(f"maxStrokes: {b['maxStrokes']}")
    if 'dunkel' in b: teile.append(f"dunkel: {wert(b['dunkel'])}"); teile.append(f"lampe: {wert(b['lampe'])}")
    kopf = '    ' + ', '.join(teile) + ',\n'
    if 'intro' in b: kopf += f"    intro: {wert(b['intro'])},\n"
    karte = ',\n      '.join(f"'{r}'" for r in b['map'])
    hind = ''
    if b['obstacles']:
        zeilen = ',\n      '.join('{ ' + ', '.join(f'{k}: {wert(v)}' for k, v in o.items()) + ' }'
                                  for o in b['obstacles'])
        hind = f",\n    obstacles: [\n      {zeilen},\n    ]"
    return f"  {{\n{kopf}    map: [\n      {karte},\n    ]{hind},\n  }}"

kopf = """/* Die Zwergenmine (Weltkennung 'mine'): neun Bahnen, ein Abstieg unter den Berg.
   Erzeugt von tools/mine.py – dort steht auch, warum sie so aussehen, wie sie aussehen.

   Der rote Faden ist die Dunkelheit. Jede andere Welt fragt, wie fest, wann oder wohin man
   schlägt; diese fragt, *was da vorn überhaupt liegt*. Ab Bahn 2 trägt jede Bahn einen Schleier
   ('dunkel'), der sich nur um den Ball und um die Grubenlampen öffnet. Die Lampen sind darum kein
   Schmuck, sondern das Wertvollste auf der Bahn – und jede dunkle Bahn ist so gebaut, dass der Weg
   mit ihnen allein lesbar bleibt (tools/mine.py prüft das).

   Die vier Abschnitte sind vier Paletten und zugleich der Abstieg:
     Bahn 1     'mundloch'  Tageslicht vor dem Berg
     Bahn 2-5   'stollen'   Grubenholz und Lampenschein
     Bahn 6-7   'kristall'  der Fels leuchtet selbst
     Bahn 8-9   'schmelze'  die unterste Sohle, wo das Erz flüssig wird

   Zwei eigene Maschinen (src/obstacles_mine.js):
     'sprengladung'  wirft im Takt alles im Umkreis nach außen, je näher desto weiter; die
                     brennende Lunte sagt es vorher an. Keine Strafe – man kann sich tragen lassen.
     'kippbuehne'    Bohle über dem Schacht, die zu der Seite kippt, auf der der Ball liegt:
                     über die Mitte hinaus wirft sie hinüber, davor schickt sie zurück.
     'grubenlampe'   leuchtet ein Stück Bahn aus.

   Sonst gilt dieselbe Kartenlegende wie in courses.js: 's' ist hier Geröll (bremst), 'x' ein
   Block (Grubenholz oder Fels), 'l' die Glut in den Spalten, '.' der offene Schacht. */
const MINE_COURSES = [
"""
io.open('src/courses_mine.js', 'w', encoding='utf-8').write(kopf + ',\n'.join(js(b) for b in BAHNEN) + ',\n];\n')
print(f"\nsrc/courses_mine.js geschrieben – {len(BAHNEN)} Bahnen")
