# -*- coding: utf-8 -*-
"""Baut src/courses_zauber.js – die Bahnen des Zauberreichs.

Das Zauberreich ist ein Ereignis mit drei Orten, und sie erzählen einen Aufstieg:

    Lehrlingsgarten   Normal    9 Bahnen   der ummauerte Garten, in dem man es lernt
    Sternenwarte      Profi     9 Bahnen   (folgt)
    Erzmagierloge     Legende   9 Bahnen   (folgt)

Jeder Ort ist im Spiel eine eigene Welt mit eigenem Belohnungshut – so, wie es die Regel in
hats.js ohnehin schon vorsieht: Wer jede Bahn einer Welt gespielt hat und in der Summe unter Par
bleibt, darf ihren Skin tragen.

DIE FRAGE DIESER WELT: *WANN FÄNGT ES AN?*
Jede andere Welt läuft im Takt. Fallgatter, Falltür, Stacheln, Fontäne, Wracktor – sie alle gehen
auf und zu, ohne daß man gefragt würde, und die Aufgabe heißt immer: den Moment abpassen. Das ist
eine gute Aufgabe, aber es ist immer dieselbe.

Hier startet der Spieler die Uhr selbst. Er stößt die Blüte an, und von da an läuft SEINE Zeit.
Das macht aus dem Abpassen eine Dosierung: zu hart, und man schießt über die Brücke hinaus; zu
weich, und man liegt darauf, wenn die Ranke welkt. Genau dazwischen liegt der Schlag – und genau
das übt ein Lehrling.

DIE MASCHINEN (src/obstacles_zauber.js):
    'ranke'       Blüte anstoßen, dann wächst eine Ranke über die Lücke – für ein paar Sekunden
    'zauberhut'   drei Hüte; wer in einen rollt, kommt aus dem leuchtenden heraus, und das
                  Leuchten wandert im Takt weiter

DIE REGELN, DIE HIER GEPRÜFT WERDEN, und warum jede einzelne dasteht:

  * Die Blüte muß OHNE die Brücke erreichbar sein. Sonst bräuchte man die Brücke, um an das zu
    kommen, was die Brücke baut. Das ist der Fehler, den man beim Bauen nicht sieht und beim
    Spielen sofort.
  * Man muß es in der Zeit auch schaffen. Gerechnet wird mit demselben Reibungswert, den die
    Physik benutzt, und mit einem ehrlichen Tempo an der Blüte – nicht mit dem Höchstschlag.
  * Jeder Hut steht auf Boden. Ein Hut über dem Abgrund spuckt den Ball ins Nichts.
  * Keine freie Sichtlinie vom Abschlag ins Loch. Dieselbe Regel wie in der Flut: Eine Bahn, die
    man mit einem geraden Schlag löst, ist keine Bahn.

    python3 tools/zauber.py
"""
import io
import math
from collections import deque

FEST = '#silwTHo'            # worauf der Ball liegen kann
REIBUNG = 4.2                # muß zu FRICTION['#'] in src/physics.js passen
RANKE_TEMPO = 12.0           # ehrliches Tempo an der Blüte – nicht der Höchstschlag (19)
RANKE_PUFFER = 1.5           # so viel Weg bleibt als Luft, damit es nicht auf die Kachel ankommt


# ---------------------------------------------------------------- Bauklötze
def leer(b, h, z='.'):
    return [[z] * b for _ in range(h)]

def fuell(f, x0, y0, x1, y1, z='#'):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            f[y][x] = z

def setz(f, x, y, z):
    f[y][x] = z

def scheibe(f, mx, my, rx, ry, z='#'):
    """Ein Rundbeet. Der Garten ist angelegt, nicht ausgesprengt – hier sind Kreise am Platz."""
    for y in range(len(f)):
        for x in range(len(f[0])):
            if ((x - mx) / rx) ** 2 + ((y - my) / ry) ** 2 <= 1.0:
                f[y][x] = z

def txt(f):
    return [''.join(r) for r in f]


# ---------------------------------------------------------------- Maschinen
def ranke(x, y, w, h, bx, by, dauer=4.0):
    """Rankenbrücke. (x, y) ist die linke obere Ecke der Lücke, (bx, by) die Blüte."""
    return {'type': 'ranke', 'x': x, 'y': y, 'w': w, 'h': h, 'dauer': dauer, 'r': 0.6,
            'bluete': {'x': bx, 'y': by}}

def huete(plaetze, takt=2.6, phase=0.0, r=0.42):
    return {'type': 'zauberhut', 'takt': takt, 'phase': phase, 'r': r,
            'plaetze': [[float(p[0]), float(p[1])] for p in plaetze]}

def pilz(x, y, r=0.55, stil='mushroom'):
    return {'type': 'bumper', 'x': x, 'y': y, 'r': r, 'style': stil, 'kick': 7.5}

def windrad(x, y, blades=3, laenge=1.6, tempo=1.3, stil='vine'):
    return {'type': 'rotor', 'x': x, 'y': y, 'blades': blades, 'len': laenge,
            'speed': tempo, 'thick': 0.16, 'style': stil, 'phase': 0.0}

def muehle(x, y, w=3.0, gap=1.0, tempo=1.0, achse='y', phase=0.0):
    return {'type': 'windmill', 'x': x, 'y': y, 'w': w, 'gap': gap, 'speed': tempo,
            'blades': 4, 'axis': achse, 'phase': phase, 'depth': 1.2}

def portal(x, y, tx, ty, farbe='#c77dff'):
    return {'type': 'portal', 'x': x, 'y': y, 'tx': tx, 'ty': ty, 'color': farbe, 'twoWay': True}

def magnet(x, y, r=3.0, kraft=8.0, stil=None):
    o = {'type': 'magnet', 'x': x, 'y': y, 'r': r, 'strength': kraft, 'slow': 0}
    if stil: o['style'] = stil
    return o

def scheibe_(x, y, r=1.5, tempo=1.6, aus=0):
    return {'type': 'turntable', 'x': x, 'y': y, 'r': r, 'speed': tempo, 'exit': aus, 'eject': 4.5}

def rampe(x, y, w, h, angle=0, land=2.6, speed=5.0, minSpeed=2.5):
    return {'type': 'ramp', 'x': x, 'y': y, 'w': w, 'h': h, 'angle': angle,
            'minSpeed': minSpeed, 'speed': speed, 'land': land}

def gatter(x, y, w=2.0, period=5.0, offen=0.5, achse='x', phase=0.0):
    return {'type': 'gate', 'x': x, 'y': y, 'w': w, 'h': 0.3, 'period': period,
            'open': offen, 'axis': achse, 'phase': phase}

def bande(x0, y0, x1, y1):
    return {'type': 'wall', 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 't': 0.22, 'h': 0.5}


# ---------------------------------------------------------------- Sammlung
WELTEN = []          # [(kennung, js-Name, Titel, [Bahnen])]

def welt(kennung, jsname, titel):
    WELTEN.append((kennung, jsname, titel, []))
    return WELTEN[-1][3]


BODEN = '#silwTH'            # worauf der Ball liegen kann (ohne die offene Kante 'o')

def schraegen(f):
    """SCHRÄGE BANDEN IN DIE ECKEN – so, wie es die alten Welten machen.

    Eine Kehre mit einer rechtwinkligen Ecke ist eine Falle: Der Ball läuft in den Winkel und
    bleibt dort liegen, statt um die Ecke zu prallen. Genau das war in der Flut zweimal zu
    besichtigen, bis die Ecken verschwanden – hier stehen sie von Anfang an nicht drin.

    ES REICHT NICHT, DIE DIAGONALE DAVORZULEGEN. Die Eckkachel selbst muß BODEN werden; erst dann
    verschwindet die rechtwinklige Bande, und die Diagonale übernimmt die Begrenzung. Durch sie
    kommt niemand, sie ist eine Wand wie jede andere.

    Klötze ('x') bleiben eckig – ein Pfeiler soll eine Kante haben, an der man rechnen kann."""
    hoch, breit = len(f), len(f[0])
    boden = lambda x, y: 0 <= x < breit and 0 <= y < hoch and f[y][x] in BODEN
    ecken = []
    for y in range(hoch):
        for x in range(breit):
            if f[y][x] != '.': continue
            r, l = boden(x + 1, y), boden(x - 1, y)
            u, o = boden(x, y + 1), boden(x, y - 1)
            if sum((r, l, u, o)) != 2: continue
            if (r and l) or (u and o): continue        # gerader Rand, keine Ecke
            if r and u: strecke = (x + 1, y, x, y + 1)
            elif r and o: strecke = (x + 1, y + 1, x, y)
            elif l and u: strecke = (x, y, x + 1, y + 1)
            else: strecke = (x, y + 1, x + 1, y)       # l und o
            ecken.append((x, y, strecke))
    # Erst alle sammeln, dann umwandeln: Sonst fände die Suche Ecken, die sie selbst erzeugt hat.
    aus = []
    for x, y, (x0, y0, x1, y1) in ecken:
        f[y][x] = '#'
        aus.append(bande(x0, y0, x1, y1))
    return aus


# Streu-Deko. Dieselbe Dichte wie in der Flut, und aus demselben Grund: Beim ersten Anlauf stand
# der Außenbereich so voll, daß man die Bahn nicht mehr fand. Neun Prozent sind ein Garten,
# fünfundzwanzig sind ein Dickicht.
DEKO_DICHTE = 0.09
DEKO_SAAT = [11, 29, 43, 57, 71, 83, 97, 109, 127]


def bahn(liste, name, theme, karte, hindernisse=None, par=3, intro=None, maxStrokes=None):
    """Legt eine Bahn an. Die Schrägen kommen ZUERST – sie ändern die Karte."""
    schr = schraegen(karte)
    b = {'name': name, 'par': par, 'theme': theme, 'map': txt(karte),
         'obstacles': schr + (hindernisse or []),
         'autoDecor': {'density': DEKO_DICHTE, 'seed': DEKO_SAAT[len(liste) % len(DEKO_SAAT)]}}
    if intro: b['intro'] = intro
    if maxStrokes: b['maxStrokes'] = maxStrokes
    liste.append(b)


# ---------------------------------------------------------------- Prüfung
def pruefe(b):
    karte = b['map']
    name = b['name']
    fehler = []
    breit, hoch = len(karte[0]), len(karte)
    if any(len(r) != breit for r in karte):
        fehler.append('die Karte ist nicht rechteckig')
        raise AssertionError(f"{name}: " + fehler[0])

    platt = ''.join(karte)
    if platt.count('T') != 1: fehler.append('die Bahn braucht genau einen Abschlag')
    if platt.count('H') != 1: fehler.append('die Bahn braucht genau ein Loch')

    tee = cup = None
    for y, r in enumerate(karte):
        for x, c in enumerate(r):
            if c == 'T': tee = (x, y)
            if c == 'H': cup = (x, y)

    fest = lambda x, y: 0 <= x < breit and 0 <= y < hoch and karte[y][x] in FEST

    """Was den Weg verbindet, ohne daß man rollt: Portale und Zauberhüte. Ohne sie hielte die
       Prüfung jede Bahn für unpassierbar, deren einziger Weg durch einen Hut führt – und das ist
       ausgerechnet die Bahn, die den Hut erklärt."""
    spruenge = []
    for o in b['obstacles']:
        if o['type'] == 'portal':
            spruenge.append([(int(o['x']), int(o['y'])), (int(o['tx']), int(o['ty']))])
        elif o['type'] == 'zauberhut':
            spruenge.append([(int(p[0]), int(p[1])) for p in o['plaetze']])

    def erreichbar(von, ohne=()):
        """Welche Felder erreicht man von 'von' aus? 'ohne' sind Rechtecke, die gesperrt sind –
        damit läßt sich fragen, was man OHNE eine bestimmte Rankenbrücke noch erreicht."""
        gesperrt = set()
        for (x0, y0, w, h) in ohne:
            for y in range(int(y0), int(y0 + h)):
                for x in range(int(x0), int(x0 + w)): gesperrt.add((x, y))
        gesehen = {von}; q = deque([von])
        while q:
            x, y = q.popleft()
            nachbarn = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            for gruppe in spruenge:
                if (x, y) in gruppe: nachbarn.extend(gruppe)
            for n in nachbarn:
                if n in gesehen or n in gesperrt or not fest(*n): continue
                gesehen.add(n); q.append(n)
        return gesehen

    if tee and cup:
        if cup not in erreichbar(tee):
            fehler.append('vom Abschlag führt kein Weg zum Loch')

        # KEINE FREIE SICHTLINIE. Dieselbe Regel wie in der Flut: Eine Bahn, die ein gerader
        # Schlag löst, ist keine Bahn. Gesperrt zählt, was wirklich im Weg steht.
        sperren = set()
        for o in b['obstacles']:
            art = o['type']
            if art == 'windmill':
                for dy2 in range(-2, 3):
                    for dx2 in range(-2, 3): sperren.add((int(o['x']) + dx2, int(o['y']) + dy2))
            elif art == 'rotor':
                rr = o.get('len', 1.5)
                for y in range(int(o['y'] - rr), int(o['y'] + rr) + 1):
                    for x in range(int(o['x'] - rr), int(o['x'] + rr) + 1): sperren.add((x, y))
            elif art == 'zauberhut':
                for p in o['plaetze']: sperren.add((int(p[0]), int(p[1])))
            elif art == 'turntable':
                rr = o.get('r', 1.5)
                for y in range(int(o['y'] - rr), int(o['y'] + rr) + 1):
                    for x in range(int(o['x'] - rr), int(o['x'] + rr) + 1): sperren.add((x, y))
            elif art == 'gate':
                for dx2 in range(-1, 2): sperren.add((int(o['x']) + dx2, int(o['y'])))
            elif art == 'bumper':
                # Ein Pilz steht wirklich im Weg – ein Ball, der ihn trifft, fliegt woandershin.
                sperren.add((int(o['x']), int(o['y'])))
        tx, ty = tee[0] + 0.5, tee[1] + 0.5
        hx, hy = cup[0] + 0.5, cup[1] + 0.5
        schritte = max(2, int(math.hypot(hx - tx, hy - ty) * 4))
        frei = True
        for i in range(1, schritte):
            u = i / schritte
            ix, iy = int(tx + (hx - tx) * u), int(ty + (hy - ty) * u)
            if not (0 <= iy < hoch and 0 <= ix < breit): frei = False; break
            if karte[iy][ix] not in '#TH' or (ix, iy) in sperren: frei = False; break
        if frei:
            fehler.append('vom Abschlag führt eine freie gerade Linie ins Loch – das ist ein Ass, '
                          'kein Hindernis')

    # ---- Die Rankenbrücke
    ranken = [o for o in b['obstacles'] if o['type'] == 'ranke']
    for o in ranken:
        bl = o['bluete']
        bx, by = int(bl['x']), int(bl['y'])
        if not fest(bx, by):
            fehler.append(f"eine Blüte steht auf {bx}/{by}, und dort ist kein Boden")
            continue
        for dy in range(int(o['y']), int(o['y'] + o['h'])):
            for dx in range(int(o['x']), int(o['x'] + o['w'])):
                if not fest(dx, dy):
                    fehler.append(f"die Ranke bei {dx}/{dy} liegt nicht über Boden – in der Karte "
                                  f"muß dort '#' stehen, das Fallen besorgt die Maschine")

        # DIE WICHTIGSTE REGEL DIESER WELT: Die Blüte muß OHNE IHRE EIGENE Brücke erreichbar sein.
        # Sonst bräuchte man die Brücke, um an das zu kommen, was die Brücke baut. Andere Brücken
        # dürfen dabei benutzt werden – zwei Lücken hintereinander sind ausdrücklich erlaubt.
        if tee:
            ohne_mich = [(o['x'], o['y'], o['w'], o['h'])]
            if (bx, by) not in erreichbar(tee, ohne_mich):
                fehler.append('die Blüte ist nur über ihre eigene Ranke zu erreichen – dann kommt '
                              'man nie an sie heran')

        # UND MAN MUSS ES IN DER ZEIT SCHAFFEN. Gerechnet mit demselben Reibungswert wie die
        # Physik und mit einem ehrlichen Tempo an der Blüte, nicht mit dem Höchstschlag.
        dauer = o.get('dauer', 4.0)
        weit = RANKE_TEMPO * dauer - 0.5 * REIBUNG * dauer * dauer
        weit = min(weit, RANKE_TEMPO * RANKE_TEMPO / (2 * REIBUNG))
        ecken = [(o['x'], o['y']), (o['x'] + o['w'], o['y']),
                 (o['x'], o['y'] + o['h']), (o['x'] + o['w'], o['y'] + o['h'])]
        noetig = max(math.hypot(ex - bl['x'], ey - bl['y']) for ex, ey in ecken)
        if noetig + RANKE_PUFFER > weit:
            fehler.append(f'von der Blüte bis hinter die Ranke sind es {noetig:.1f} Felder, in '
                          f'{dauer:.1f} s schafft man aber nur {weit:.1f} – die Brücke welkt, '
                          f'bevor man drüben ist')

    # ---- Die Zauberhüte
    for o in [x for x in b['obstacles'] if x['type'] == 'zauberhut']:
        if len(o['plaetze']) < 2:
            fehler.append('ein Hütchenzauber braucht mindestens zwei Hüte')
        for p in o['plaetze']:
            px, py = int(p[0]), int(p[1])
            if not fest(px, py):
                fehler.append(f'ein Zauberhut steht auf {px}/{py}, und dort ist kein Boden – '
                              f'er spuckte den Ball ins Nichts')

    if fehler:
        raise AssertionError(f"{name}: " + '; '.join(fehler))

    felder = sum(1 for r in karte for c in r if c in FEST)
    banden = sum(1 for o in b['obstacles'] if o['type'] == 'wall')
    return dict(breit=breit, hoch=hoch, felder=felder, schraegen=banden,
                maschinen=sum(1 for o in b['obstacles'] if o['type'] != 'wall'))


# ===========================================================================
#  DER LEHRLINGSGARTEN – Normal, neun Bahnen
#  Ein ummauerter Garten in der Dämmerung. Die Hecken sind die Banden, die Beete die Lücken.
#
#  DIE OPTIK KOMMT AUS DEM BESTAND. Das Spiel hat für fast jede Maschine schon mehrere Gestalten –
#  das Windrad kann eine Ranke sein, ein Besen, eine Sense; der Prellklotz ein Pilz, ein Kristall,
#  eine Leuchtkugel; der Magnet ein Seelenlicht. Hier wird genau das benutzt: Kein einziges neues
#  Bild, und trotzdem sieht keine Maschine aus wie im Märchenland.
# ===========================================================================
GARTEN = welt('lehrling', 'ZAUBER_GARTEN', 'Lehrlingsgarten')

# --- 1 ---------------------------------------------------------------------
# Am Gartentor. Zwei Hecken, ein Bogen dazwischen. Nichts Neues – die Bahn sagt nur,
# wie man in diesem Garten um eine Ecke kommt.
f = leer(30, 13)
fuell(f, 1, 2, 28, 10)
fuell(f, 8, 2, 11, 6, '.')            # Hecke, von oben hereinragend
fuell(f, 17, 6, 20, 10, '.')          # und eine von unten
setz(f, 3, 6, 'T'); setz(f, 26, 6, 'H')
bahn(GARTEN, 'Am Gartentor', 'lehrlingsgarten', f, [
    pilz(14.5, 8.5),
    pilz(23.5, 4.5, stil='orb'),
], par=3,
intro='Der Garten des Lehrlings, kurz vor Sonnenuntergang. Zwei Hecken stehen im Weg, und dazwischen '
      'geht es im Bogen hindurch. Die Leuchtkugel am Ende federt kräftiger als der Pilz – das lohnt '
      'sich zu wissen, bevor es schwieriger wird.')

# --- 2 ---------------------------------------------------------------------
# Die erste Blüte. Hier wird die Rankenbrücke erklärt, und sonst nichts: eine Lücke,
# eine Blüte davor, dahinter viel Platz zum Ankommen.
f = leer(32, 13)
fuell(f, 1, 3, 30, 9)
setz(f, 3, 6, 'T'); setz(f, 28, 6, 'H')
bahn(GARTEN, 'Die erste Blüte', 'lehrlingsgarten', f, [
    ranke(14, 3, 4, 7, 10.5, 6.5, dauer=4.0),
    windrad(21.5, 6.5, blades=3, laenge=1.8, tempo=1.1, stil='vine'),
], par=3,
intro='Über die Lücke führt nichts – bis man die Blüte anstößt. Dann wächst eine Ranke hinüber und '
      'trägt vier Sekunden lang. Zu sacht geschlagen, und man liegt noch darauf, wenn sie welkt; zu '
      'hart, und man fliegt daran vorbei. Dazwischen liegt der Schlag.')

# --- 3 ---------------------------------------------------------------------
# Der Pilzring. Ein Rundbeet, in seiner Mitte das Loch, und davor ein Kranz aus Pilzen.
# Gerade hinein geht nicht; man muß den Ball abprallen lassen.
f = leer(28, 15)
scheibe(f, 13.5, 7.5, 12, 6.4)
setz(f, 3, 7, 'T'); setz(f, 13, 7, 'H')
ring = []
for i in range(8):
    # Ohne Versatz: So steht einer der Pilze genau zwischen Abschlag und Loch. Das ist der Sinn
    # der Bahn – der gerade Weg ist versperrt – und die Prüfung besteht darauf.
    a = i * (math.pi * 2 / 8)
    ring.append(pilz(round(13.5 + math.cos(a) * 3.2, 1), round(7.5 + math.sin(a) * 3.2, 1),
                     r=0.5, stil='mushroom' if i % 2 else 'orb'))
bahn(GARTEN, 'Der Pilzring', 'lehrlingsgarten', f, ring, par=3,
intro='Ein Rundbeet, und mitten darin das Loch. Der Kranz aus Pilzen läßt niemanden geradewegs '
      'hinein – wer es mit Gewalt versucht, kommt weiter heraus, als er hineingekommen ist. Sanft '
      'anspielen und einen Pilz als Wand benutzen ist der kürzere Weg.')

# --- 4 ---------------------------------------------------------------------
# Zwei Blüten. Dieselbe Maschine zweimal, und dazwischen bleibt keine Zeit zum Nachdenken:
# Wer nach der ersten Ranke stehenbleibt, fängt von vorn an.
f = leer(34, 13)
fuell(f, 1, 3, 32, 9)
setz(f, 3, 6, 'T'); setz(f, 30, 6, 'H')
bahn(GARTEN, 'Zwei Blüten', 'lehrlingsgarten', f, [
    ranke(11, 3, 3, 7, 8.5, 6.5, dauer=4.0),
    ranke(22, 3, 3, 7, 18.5, 6.5, dauer=4.0),
    pilz(27.5, 6.5, stil='orb'),
], par=3,
intro='Zwei Lücken, zwei Blüten. Die zweite Blüte liegt hinter der ersten Ranke – man kommt also nur '
      'an sie heran, wenn die erste noch trägt. Ein Schlag, der beide schafft, ist möglich; zwei '
      'ruhige sind sicherer.')

# --- 5 ---------------------------------------------------------------------
# Der Hutständer. Eine Mauer quer durch das Treibhaus, und durch sie führt nur der Zauber:
# hinein in einen Hut, heraus aus dem, der leuchtet. Einer der beiden Ausgänge liegt im Sand.
f = leer(30, 14)
fuell(f, 1, 2, 28, 11)
fuell(f, 13, 2, 15, 11, 'x')          # die Mauer
fuell(f, 19, 9, 24, 11, 's')          # der Sandkasten hinter dem falschen Hut
setz(f, 3, 6, 'T'); setz(f, 26, 5, 'H')
bahn(GARTEN, 'Der Hutständer', 'gewaechshaus', f, [
    huete([(6, 6), (22, 4), (22, 10)], takt=2.6),
    pilz(9.5, 9.5, stil='crystal'),
], par=3,
intro='Durch die Mauer kommt nur, wer sich verzaubern läßt. Wer in einen Hut rollt, kommt aus dem '
      'heraus, der gerade leuchtet – und wer in den leuchtenden rollt, aus dem nächsten. Einer der '
      'beiden Ausgänge steht im Sand. Das Leuchten wandert; man sieht es kommen.')

# --- 6 ---------------------------------------------------------------------
# Das Treibhaus. Das Gerätehaus steht quer über dem Weg, davor kehren zwei Besen.
f = leer(30, 14)
fuell(f, 1, 3, 28, 10)
setz(f, 3, 6, 'T'); setz(f, 27, 6, 'H')
bahn(GARTEN, 'Das Treibhaus', 'gewaechshaus', f, [
    # Die Zahlen stammen aus der Bot-Prüfung: Mit Tür 1,1 und zwei Besen zu 1,4 brauchte der
    # Normalspieler im Schnitt fünfeinhalb Schläge – auf der sechsten Bahn einer NORMAL-Welt ist
    # das zu viel. Breitere Tür, langsamere Besen, und die Besen stehen weiter auseinander.
    muehle(15.5, 6.5, w=5.0, gap=1.5, tempo=0.85, achse='y'),
    windrad(21.5, 4.5, blades=2, laenge=1.3, tempo=-0.9, stil='broom'),
    windrad(21.5, 8.5, blades=2, laenge=1.3, tempo=0.9, stil='broom'),
    pilz(8.5, 4.5, stil='crystal'),
    pilz(8.5, 8.5, stil='crystal'),
], par=3,
intro='Das Gerätehaus steht quer im Weg, und seine Tür geht im Takt auf und zu. Dahinter kehren zwei '
      'Besen gegeneinander – sie drehen in verschiedene Richtungen, also gibt es keinen Augenblick, '
      'in dem beide zugleich aus dem Weg sind. Einer nach dem anderen.')

# --- 7 ---------------------------------------------------------------------
# Blüte und Hut. Zuerst die Ranke über den Steg, dann die Hüte durch die Regalwand.
f = leer(34, 15)
fuell(f, 1, 4, 12, 10)                # der Vorraum
fuell(f, 13, 6, 20, 8)                # der schmale Steg
fuell(f, 21, 3, 32, 11)               # die Halle
fuell(f, 27, 3, 28, 11, 'x')          # die Regalwand davor
setz(f, 3, 7, 'T'); setz(f, 31, 7, 'H')
bahn(GARTEN, 'Blüte und Hut', 'gewaechshaus', f, [
    ranke(14, 6, 5, 3, 9.5, 7.5, dauer=4.5),
    # ZWEI Hüte, nicht drei. Mit dreien brauchte der Normalspieler in der Bot-Prüfung im Schnitt
    # sieben Schläge und im Median neun: Aus welchem Hut man herauskommt, war dann Glück. Mit
    # zweien ist der Weg eindeutig – egal welcher gerade leuchtet, man landet drüben –, und die
    # Aufgabe ist wieder das, was sie sein soll: hineintreffen. Die Wahl zwischen mehreren
    # Ausgängen gehört in die Sternenwarte, nicht in den Garten. 
    huete([(24, 7), (30, 10)], takt=2.4),
    pilz(24.5, 4.5, stil='crystal'),
], par=4,
intro='Erst die Ranke über den Steg – sie trägt hier eine halbe Sekunde länger, der Weg ist weiter. '
      'Dann steht die Regalwand im Weg, und wieder helfen nur die Hüte. Wer beim Steg zu viel Kraft '
      'gibt, steht drüben zu weit oben und muß noch einmal ansetzen.')

# --- 8 ---------------------------------------------------------------------
# Der Blätterwirbel. Ein Seelenlicht zieht, ein Laubwirbel dreht und wirft aus.
f = leer(30, 15)
fuell(f, 1, 3, 28, 11)
fuell(f, 12, 3, 14, 7, '.')           # Beet, das die Sicht nimmt
setz(f, 3, 5, 'T'); setz(f, 26, 5, 'H')
bahn(GARTEN, 'Der Blätterwirbel', 'lehrlingsgarten', f, [
    magnet(8.5, 9.5, r=3.0, kraft=7.0, stil='soul'),
    scheibe_(18.5, 8.5, r=1.8, tempo=1.8, aus=270),
    pilz(22.5, 10.5),
], par=3,
intro='Das Seelenlicht zieht an allem, was an ihm vorbeirollt – wer zu dicht daran vorbeispielt, '
      'landet woanders als gedacht. Der Laubwirbel dahinter fängt den Ball und wirft ihn immer in '
      'dieselbe Richtung aus; das ist keine Strafe, das ist eine Abkürzung, wenn man ihn trifft.')

# --- 9 ---------------------------------------------------------------------
# Die Lehrlingsprüfung. Alles, was der Garten kann, hintereinander.
f = leer(34, 15)
fuell(f, 1, 3, 32, 11)
setz(f, 3, 7, 'T'); setz(f, 31, 8, 'H')
bahn(GARTEN, 'Die Lehrlingsprüfung', 'lehrlingsgarten', f, [
    ranke(10, 3, 3, 9, 7.5, 7.5, dauer=4.2),
    pilz(14.5, 5.5),
    pilz(14.5, 9.5, stil='orb'),
    muehle(18.5, 7.5, w=5.0, gap=1.2, tempo=0.9, achse='y'),
    huete([(24, 5), (24, 10), (29, 11)], takt=2.8),
], par=4,
intro='Die Prüfung: erst die Ranke, dann zwischen den Pilzen hindurch, dann das Tor im Takt – und '
      'zum Schluß noch einmal die Hüte. Wer hier unter Par bleibt, hat den Lehrlingshut verdient.')


# ---------------------------------------------------------------- Prüfen
for kennung, jsname, titel, liste in WELTEN:
    print(f"\n{titel} ({kennung}) – {len(liste)} Bahnen")
    for b in liste:
        z = pruefe(b)
        print(f"  {b['name']:<22} {z['breit']:>2}x{z['hoch']:<2} {b['theme']:<16} Par {b['par']} · "
              f"{z['felder']:>3} Felder · {z['schraegen']} Schrägen · {z['maschinen']} Maschinen")


# ---------------------------------------------------------------- Schreiben
def wert(v):
    if isinstance(v, str): return "'" + v.replace("'", "\\'") + "'"
    if isinstance(v, bool): return 'true' if v else 'false'
    if isinstance(v, float): return repr(round(v, 3))
    if isinstance(v, dict): return '{ ' + ', '.join(f'{k}: {wert(x)}' for k, x in v.items()) + ' }'
    if isinstance(v, list): return '[' + ', '.join(wert(x) for x in v) + ']'
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
    deko = f",\n    autoDecor: {wert(b['autoDecor'])}" if 'autoDecor' in b else ''
    return f"  {{\n{kopf}    map: [\n      {karte},\n    ]{hind}{deko},\n  }}"

KOPF = """/* Das Zauberreich: ein Ereignis mit drei Orten, die einen Aufstieg erzählen.
   Erzeugt von tools/zauber.py – dort steht auch, warum die Bahnen so aussehen, wie sie aussehen.

     'lehrling'   Lehrlingsgarten   Normal    der ummauerte Garten, in dem man es lernt
     'warte'      Sternenwarte      Profi
     'loge'       Erzmagierloge     Legende

   DIE FRAGE DIESER WELT IST: *WANN FÄNGT ES AN?*
   Jede andere Welt läuft im Takt – Fallgatter, Falltür, Stacheln, Fontäne, Wracktor gehen auf und
   zu, ohne daß jemand gefragt würde, und die Aufgabe heißt immer: den Moment abpassen. Hier
   startet der Spieler die Uhr selbst. Er stößt die Blüte an, und von da an läuft SEINE Zeit. Aus
   dem Abpassen wird eine Dosierung, und das ist es, was ein Lehrling übt.

   DIE MASCHINEN (src/obstacles_zauber.js):
     'ranke'       Die Blüte anstoßen läßt eine Ranke über die Lücke wachsen – für ein paar
                   Sekunden, dann welkt sie. Ihre Felder sind in der Karte gewöhnlicher Boden;
                   daß man ohne Ranke hindurchfällt, besorgt die Maschine. Dieselbe Umkehrung wie
                   bei der Schneebrücke, und aus demselben Grund: Boden, der zur Laufzeit
                   entsteht, müßte Wegfindung, Banden und Kamera mitziehen. Boden, der wegfällt,
                   kostet eine Abfrage.
     'zauberhut'   Drei Hüte, einer leuchtet. Wer in einen rollt, kommt aus dem leuchtenden
                   heraus; wer in den leuchtenden rollt, aus dem nächsten – es gibt keine
                   Sackgasse. Das Leuchten wandert im Takt und kündigt sich an.

   DIE OPTIK KOMMT AUS DEM BESTAND. Kein einziges neues Bild für die alten Maschinen, und trotzdem
   sieht keine aus wie im Märchenland: Das Windrad ist hier eine Ranke oder ein Besen, der
   Prellklotz ein Pilz, eine Leuchtkugel oder ein Kristall, der Magnet ein Seelenlicht, die
   Drehscheibe ein Laubwirbel.

   Sonst gilt dieselbe Kartenlegende wie in courses.js. */
"""

teile = [KOPF]
for kennung, jsname, titel, liste in WELTEN:
    teile.append(f"const {jsname} = [\n" + ',\n'.join(js(b) for b in liste) + ',\n];\n')
io.open('src/courses_zauber.js', 'w', encoding='utf-8').write('\n'.join(teile))
gesamt = sum(len(l) for _, _, _, l in WELTEN)
print(f"\nsrc/courses_zauber.js geschrieben – {gesamt} Bahnen in {len(WELTEN)} Welten")
