# -*- coding: utf-8 -*-
"""Baut src/courses_zauber.js – die Bahnen des Zauberreichs.

Das Zauberreich ist ein Ereignis mit drei Orten, und sie erzählen einen Aufstieg:

    Lehrlingsgarten   Normal    9 Bahnen   der ummauerte Garten, in dem man es lernt
    Sternenwarte      Profi     9 Bahnen   die Terrasse über den Wolken und der Kartensaal darunter
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
    'mondzieher'  zieht bei voller Scheibe, stößt bei dunkler, läßt beim Halbmond in Ruhe
    'sternbild'   alle Sterne anfahren, dann geht das Sternentor auf

DIE REGELN, DIE HIER GEPRÜFT WERDEN, und warum jede einzelne dasteht:

  * Die Blüte muß OHNE die Brücke erreichbar sein. Sonst bräuchte man die Brücke, um an das zu
    kommen, was die Brücke baut. Das ist der Fehler, den man beim Bauen nicht sieht und beim
    Spielen sofort.
  * Man muß es in der Zeit auch schaffen. Gerechnet wird mit demselben Reibungswert, den die
    Physik benutzt, und mit einem ehrlichen Tempo an der Blüte – nicht mit dem Höchstschlag.
  * Jeder Hut steht auf Boden. Ein Hut über dem Abgrund spuckt den Ball ins Nichts.
  * Der Sockel des Mondziehers steht auf Boden – er ist fest.
  * Ein Sternentor sperrt wirklich etwas ab, und alle seine Sterne liegen davor. Ein Tor, das
    nichts absperrt, ist Schmuck; ein Stern dahinter macht die Bahn unlösbar.
  * Keine freie Sichtlinie vom Abschlag ins Loch. Dieselbe Regel wie in der Flut: Eine Bahn, die
    man mit einem geraden Schlag löst, ist keine Bahn.

    python3 tools/zauber.py
"""
import io
import math
from collections import deque

FEST = '#silwTHoAaBbCc'      # worauf der Ball liegen kann ('A'/'a' … sind Rohrmünder)
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

def muehle(x, y, w=3.0, gap=1.0, tempo=1.0, achse='y', phase=0.0, stil=None):
    o = {'type': 'windmill', 'x': x, 'y': y, 'w': w, 'gap': gap, 'speed': tempo,
         'blades': 4, 'axis': achse, 'phase': phase, 'depth': 1.2}
    if stil: o['style'] = stil
    return o

def portal(x, y, tx, ty, farbe='#c77dff'):
    return {'type': 'portal', 'x': x, 'y': y, 'tx': tx, 'ty': ty, 'color': farbe, 'twoWay': True}

def magnet(x, y, r=3.0, kraft=8.0, stil=None):
    o = {'type': 'magnet', 'x': x, 'y': y, 'r': r, 'strength': kraft, 'slow': 0}
    if stil: o['style'] = stil
    return o

def scheibe_(x, y, r=1.5, tempo=1.6, aus=0, stil=None):
    o = {'type': 'turntable', 'x': x, 'y': y, 'r': r, 'speed': tempo, 'exit': aus, 'eject': 4.5}
    if stil: o['style'] = stil
    return o

def rampe(x, y, w, h, angle=0, land=2.6, speed=5.0, minSpeed=2.5, stil=None):
    """Sprungschanze. x/y ist die OBERE LINKE Ecke, angle die Flugrichtung in Grad (0 = nach
    rechts). Der Ball landet genau `land` Felder hinter der Schanzenkante - in der Luft gibt es
    keine Mauern, also ist der Landepunkt das, was zaehlt; pruefe() sieht nach, ob dort Boden ist."""
    o = {'type': 'ramp', 'x': x, 'y': y, 'w': w, 'h': h, 'angle': angle,
         'minSpeed': minSpeed, 'speed': speed, 'land': land}
    if stil: o['style'] = stil
    return o

def gatter(x, y, w=2.0, period=5.0, offen=0.5, achse='x', phase=0.0):
    return {'type': 'gate', 'x': x, 'y': y, 'w': w, 'h': 0.3, 'period': period,
            'open': offen, 'axis': achse, 'phase': phase}

def bande(x0, y0, x1, y1):
    return {'type': 'wall', 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 't': 0.22, 'h': 0.5}


def mond(x, y, r=3.4, kraft=9.0, takt=7.0, phase=0.0, core=0.4):
    """Mondzieher. Volle Scheibe zieht, dunkle stößt, Halbmond läßt in Ruhe."""
    return {'type': 'mondzieher', 'x': x, 'y': y, 'r': r, 'kraft': kraft, 'takt': takt,
            'phase': phase, 'core': core}

def riesenbluete(x, y, r=4.2, blaetter=6, takt=8.0, phase=0.0, kraft=26.0):
    """Die Riesenblüte – der Endgegner des Lehrlingsgartens. Das Loch liegt in ihrer Mitte."""
    return {'type': 'riesenbluete', 'x': x, 'y': y, 'r': r, 'blaetter': blaetter,
            'takt': takt, 'phase': phase, 'kraft': kraft, 'dicke': 0.38}

def sphaere(x, y, ringe, dicke=0.3):
    """Die Große Armillarsphäre – der Endgegner der Sternenwarte. 'ringe' ist eine Liste von
    (Radius, Gassenbreite im Bogenmaß, Tempo, Versatz)."""
    return {'type': 'armillar', 'x': x, 'y': y, 'dicke': dicke,
            'ringe': [{'r': float(a), 'gasse': float(b), 'tempo': float(c), 'phase': float(d)}
                      for a, b, c, d in ringe]}

def waechter(x, y, r=1.6, weite=11.0, keil=0.42, takt=5.0, phase=0.0, folgen=1.1, wucht=15.0):
    """Der Bannwächter – der Endgegner der Erzmagierloge. Er dreht sich zum Ball und schlägt in
    den Keil, in den sein Arm zeigt."""
    return {'type': 'bannwaechter', 'x': x, 'y': y, 'r': r, 'weite': weite, 'keil': keil,
            'takt': takt, 'phase': phase, 'folgen': folgen, 'wucht': wucht,
            'warn': 1.2, 'schlag': 0.3}

def gang(f, x0, y0, x1, y1):
    """Schneidet einen Gang in die Leere. Die Loge ist andersherum gebaut als die ersten beiden
    Orte: Dort war die Karte ein gefüllter Saal, in den Wände gestellt wurden; hier ist sie leer,
    und nur der Weg wird hineingeschnitten. Das macht die Strecke schmal UND lang, weil sie sich
    winden muß, statt quer über einen Platz zu laufen."""
    fuell(f, x0, y0, x1, y1)

def kanone(x, y, grad=0, weite=9.0, amp=0.0, tempo=1.0, phase=0.0, laden=0.7, stil=None):
    """Die Bannschleuder. amp=0 heißt: Sie schwenkt nicht, sie zeigt immer dorthin, wo die Punkte
    am Boden hinführen. Auf einer Bahn, neben der die Leere liegt, ist eine schwenkende Kanone
    kein Rätsel, sondern ein Würfel."""
    o = {'type': 'cannon', 'x': x, 'y': y, 'base': math.radians(grad), 'amp': amp,
         'speed': tempo, 'phase': phase, 'range': weite, 'loadTime': laden,
         'catchR': 0.7, 'flySpeed': 8}
    if stil: o['style'] = stil
    return o

def rohr(paar, grad=0, stil='siegelroehre'):
    """Die Siegelröhre. Ihre beiden Enden stehen als Buchstaben in der Karte: 'A' schluckt,
    'a' spuckt aus. grad ist die Richtung, in die ausgeworfen wird."""
    o = {'type': 'copperpipe', 'pair': paar.upper(), 'angle': grad}
    if stil: o['style'] = stil
    return o

def kreis(x, y, wirkung, r=1.6, takt=0.0, phase=0.0, kraft=0.0, weite=4.2):
    """Ein Zauberkreis. Die Wirkung bestimmt die Farbe, und die Farbe steht im Bild, bevor man
    hineinrollt: schub (grün), bremse (blau), sprung (gold), wirbel (violett), bann (rot).
    takt=0 heißt „brennt immer"; sonst ist er die halbe Periode an. Ein Bannkreis OHNE Takt wäre
    eine Mauer, die nie aufgeht - pruefe() läßt das nicht durch."""
    o = {'type': 'zauberkreis', 'x': x, 'y': y, 'r': r, 'wirkung': wirkung,
         'takt': takt, 'phase': phase}
    if kraft: o['kraft'] = kraft
    if wirkung == 'sprung': o['weite'] = weite
    return o

def sternbild(sterne, tor, r=0.5):
    """Sternbild mit Sternentor. Das Tor steht waagerecht oder senkrecht auf einer ganzen Linie –
    nur dann läßt sich prüfen, welche Kachelkanten es sperrt."""
    return {'type': 'sternbild', 'r': r,
            'sterne': [[float(p[0]), float(p[1])] for p in sterne],
            'tor': {'x0': float(tor[0]), 'y0': float(tor[1]), 'x1': float(tor[2]), 'y1': float(tor[3])}}

# --- Alte Maschinen, deren Aussehen diese Welt weiterbenutzt ---------------
def auge(x, y, r=1.1, weite=9.0, tempo=0.42, phase=0.0, stil=None):
    """Das Fernrohr, das die Terrasse absucht (Verhalten: das Auge des Turms)."""
    o = {'type': 'eyetower', 'x': x, 'y': y, 'r': r, 'range': weite, 'fov': 0.6,
         'speed': tempo, 'phase': phase}
    if stil: o['style'] = stil
    return o

def pendel(x, y, laenge=3.5, amp=50, ruhe=90, phase=0.0, stil=None):
    o = {'type': 'pendulum', 'x': x, 'y': y, 'len': laenge, 'amp': amp, 'ruhe': ruhe,
         'phase': phase, 'w': 1.2, 'h': 1.2}
    if stil: o['style'] = stil
    return o

def feder(x, y, base=0.0, weite=9.0):
    return {'type': 'springwork', 'x': x, 'y': y, 'base': base, 'amp': 0.2, 'speed': 0.75,
            'range': weite, 'catchR': 0.7, 'loadTime': 0.9}

def zahnfeld(x0, y0, x1, y1, warten=2.4, fahrt=3.0, phase=0.0, stil=None):
    o = {'type': 'gearfield', 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'wait': warten,
         'travel': fahrt, 'r': 0.9, 'zaehne': 10, 'phase': phase}
    if stil: o['style'] = stil
    return o

def wandertor(x0, y0, x1, y1, gasse=1.8, stil=None):
    o = {'type': 'wandergate', 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1, 'gap': gasse}
    if stil: o['style'] = stil
    return o

def spiegel(x0, y0, x1, y1):
    """Zauberspiegel. Wer hineinrollt, kommt drüben seitenverkehrt heraus."""
    return {'type': 'zauberspiegel', 'x0': x0, 'y0': y0, 'x1': x1, 'y1': y1}

def blitz(x, y, w=2.0, h=4.0, takt=4.5, phase=0.0, stil=None):
    o = {'type': 'lightning', 'x': x, 'y': y, 'w': w, 'h': h, 'period': takt,
         'phase': phase, 'warn': 1.0, 'strike': 0.35}
    if stil: o['style'] = stil
    return o

def aufwind(x, y, w=2, h=3, land=6.0, flug=7.0, stil=None):
    o = {'type': 'updraft', 'x': x, 'y': y, 'w': w, 'h': h, 'minSpeed': 2.5,
         'land': land, 'fly': flug}
    if stil: o['style'] = stil
    return o

def fallbeil(x, y, h=3.0, takt=5.0, phase=0.0):
    return {'type': 'guillotine', 'x': x, 'y': y, 'w': 0.35, 'h': h, 'period': takt,
            'phase': phase, 'hold': 0.32}

def wanderloch(stellen, phase=0.0, stil=None):
    """Das wandernde Loch der Uhrwerkstadt. Es IST das Loch, kein Hindernis daneben - darum muß
    das 'H' der Karte auf seiner ersten Stelle stehen (siehe validate.mjs)."""
    o = {'type': 'wanderloch', 'stellen': [[float(p[0]), float(p[1])] for p in stellen],
         'phase': phase}
    if stil: o['style'] = stil
    return o

def lampe(x, y, r=3.4, stil=None):
    o = {'type': 'grubenlampe', 'x': x, 'y': y, 'r': r}
    if stil: o['style'] = stil
    return o

def nebel(x, y, r=3.0, dreh=1, stil=None):
    """Der Nebelwirbel am Himmel (Verhalten: der Strudel der Flut)."""
    o = {'type': 'strudel', 'x': x, 'y': y, 'r': r, 'dreh': dreh}
    if stil: o['style'] = stil
    return o


def tor_kanten(tor):
    """Welche Übergänge zwischen zwei Nachbarfeldern sperrt ein Sternentor?

    Ein Tor ist eine Wand und keine Kachel: Es steht auf einer ganzen Linie ZWISCHEN zwei
    Kachelreihen. Wer es als gesperrte Kachel rechnete, sperrte eine Reihe zu viel und hielte
    Bahnen für unpassierbar, die es nicht sind."""
    x0, y0, x1, y1 = tor['x0'], tor['y0'], tor['x1'], tor['y1']
    kanten = set()
    if abs(x1 - x0) < 1e-6:
        X = int(round(x0))
        for y in range(int(math.floor(min(y0, y1))), int(math.ceil(max(y0, y1)))):
            kanten.add(((X - 1, y), (X, y))); kanten.add(((X, y), (X - 1, y)))
    elif abs(y1 - y0) < 1e-6:
        Y = int(round(y0))
        for x in range(int(math.floor(min(x0, x1))), int(math.ceil(max(x0, x1)))):
            kanten.add(((x, Y - 1), (x, Y))); kanten.add(((x, Y), (x, Y - 1)))
    else:
        raise AssertionError('ein Sternentor steht nur waagerecht oder senkrecht')
    return kanten


def tor_felder(tor):
    """Die Kacheln links und rechts der Wand – so viel steht der Sichtlinie im Weg."""
    return set(a for kante in tor_kanten(tor) for a in kante)


# ---------------------------------------------------------------- Sammlung
WELTEN = []          # [(kennung, js-Name, Titel, [Bahnen])]

def welt(kennung, jsname, titel):
    WELTEN.append((kennung, jsname, titel, []))
    return WELTEN[-1][3]


BODEN = '#silwTHAaBbCc'      # worauf der Ball liegen kann (ohne die offene Kante 'o')

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


def bahn(liste, name, theme, karte, hindernisse=None, par=3, intro=None, maxStrokes=None, **mehr):
    """Legt eine Bahn an. Die Schrägen kommen ZUERST – sie ändern die Karte.

    'mehr' nimmt auf, was nur einzelne Bahnen brauchen – 'dunkel' und 'lampe' der Gruft zum
    Beispiel. Die stehen an der BAHN und nicht an der Palette: Wie finster es ist, ist eine Frage
    der Aufgabe, nicht der Farbe (siehe courses_mine.js)."""
    schr = schraegen(karte)
    b = {'name': name, 'par': par, 'theme': theme, 'map': txt(karte),
         'obstacles': schr + (hindernisse or []),
         'autoDecor': {'density': DEKO_DICHTE, 'seed': DEKO_SAAT[len(liste) % len(DEKO_SAAT)]}}
    if intro: b['intro'] = intro
    if maxStrokes: b['maxStrokes'] = maxStrokes
    b.update(mehr)
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
        elif o['type'] == 'cannon':
            # Die Bannschleuder trägt über die Leere. Ihr Landepunkt steht fest, solange sie nicht
            # schwenkt (amp = 0) - und in der Loge schwenkt keine. Damit ist der Wurf ein Übergang
            # wie ein Hut, nur in eine Richtung; für die Frage „kommt man ans Loch" reicht das.
            weit = 0.9 + o.get('range', 9.0)
            lx = o['x'] + math.cos(o['base']) * weit
            ly = o['y'] + math.sin(o['base']) * weit
            if not fest(int(lx), int(ly)):
                fehler.append(f'die Bannschleuder auf {o["x"]}/{o["y"]} wirft nach '
                              f'{lx:.1f}/{ly:.1f} – dort ist kein Boden')
            else:
                spruenge.append([(int(o['x']), int(o['y'])), (int(lx), int(ly))])
        elif o['type'] == 'copperpipe':
            # Die Siegelröhre: ihre beiden Enden stehen als Buchstaben in der Karte
            gross, klein = o['pair'].upper(), o['pair'].lower()
            ein = aus = None
            for yy, zeile in enumerate(karte):
                for xx, ch in enumerate(zeile):
                    if ch == gross: ein = (xx, yy)
                    if ch == klein: aus = (xx, yy)
            if not ein or not aus:
                fehler.append(f'die Siegelröhre {gross} braucht beide Enden in der Karte')
            else:
                # Ausgeworfen wird eine Kachel weiter in Richtung 'angle' – dort muß Boden sein
                a = math.radians(o.get('angle', 0))
                lx, ly = aus[0] + 0.5 + math.cos(a) * 0.95, aus[1] + 0.5 + math.sin(a) * 0.95
                if not fest(int(lx), int(ly)):
                    fehler.append(f'die Siegelröhre {gross} spuckt nach {lx:.1f}/{ly:.1f} – '
                                  f'dort ist kein Boden')
                spruenge.append([ein, aus])

    def erreichbar(von, ohne=(), kanten=()):
        """Welche Felder erreicht man von 'von' aus? 'ohne' sind Rechtecke, die gesperrt sind –
        damit läßt sich fragen, was man OHNE eine bestimmte Rankenbrücke noch erreicht. 'kanten'
        sind gesperrte ÜBERGÄNGE zwischen zwei Nachbarfeldern: So steht ein Sternentor genau dort,
        wo es in der Bahn steht – zwischen zwei Kacheln und nicht auf einer."""
        gesperrt = set()
        for (x0, y0, w, h) in ohne:
            for y in range(int(y0), int(y0 + h)):
                for x in range(int(x0), int(x0 + w)): gesperrt.add((x, y))
        kanten = set(kanten)
        gesehen = {von}; q = deque([von])
        while q:
            x, y = q.popleft()
            nachbarn = [(x + dx, y + dy) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))]
            for gruppe in spruenge:
                if (x, y) in gruppe: nachbarn.extend(gruppe)
            for n in nachbarn:
                if n in gesehen or n in gesperrt or not fest(*n): continue
                if ((x, y), n) in kanten: continue
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
            elif art == 'sternbild':
                # Solange ein Stern fehlt, steht dort eine Wand – und bis dahin gibt es keinen
                # geraden Schlag ins Loch.
                sperren |= tor_felder(o['tor'])
            elif art == 'mondzieher':
                # Der Sockel ist fest; außerdem zieht der Mond jeden geraden Schlag krumm.
                sperren.add((int(o['x']), int(o['y'])))
            elif art == 'zauberspiegel':
                # Ein Spiegel ist keine Wand, aber wer hindurchrollt, kommt woanders heraus –
                # eine gerade Linie durch ihn hindurch ist also keine gerade Linie mehr.
                for k in range(0, 21):
                    u = k / 20
                    sperren.add((int(o['x0'] + (o['x1'] - o['x0']) * u),
                                 int(o['y0'] + (o['y1'] - o['y0']) * u)))
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

        # UND DIE BRÜCKE MUSS DEN GANZEN WEG SPERREN. Ihre Felder sind in der Karte gewöhnlicher
        # Boden; liegt daneben noch ein Streifen frei, rollt man einfach daran vorbei, und die
        # ganze Maschine ist Schmuck. Genau das hatte die Bot-Prüfung in der Erzmagierloge
        # entlarvt: zwei Ranken auf einer Bahn, und der Bot lochte sie im Mittel in zwei Schlägen,
        # weil er keine einzige davon benutzen mußte. Dieselbe Regel wie beim Sternentor.
        if tee and cup:
            mich = [(o['x'], o['y'], o['w'], o['h'])]
            if cup in erreichbar(tee, mich):
                fehler.append('an dieser Rankenbrücke führt ein Weg vorbei – dann braucht man sie '
                              'nie, und sie ist nur Schmuck')

        # UND MAN MUSS ES IN DER ZEIT SCHAFFEN. Gerechnet mit demselben Reibungswert wie die
        # Physik und mit einem ehrlichen Tempo an der Blüte, nicht mit dem Höchstschlag.
        dauer = o.get('dauer', 4.0)
        # Wie weit kommt ein Ball, der mit RANKE_TEMPO losrollt, in 'dauer' Sekunden? Nur bis er
        # steht: nach RANKE_TEMPO/REIBUNG Sekunden ist Schluss. Die erste Fassung rechnete die
        # Wurfformel auch ueber diesen Punkt hinaus weiter - und dort wird sie wieder KLEINER,
        # als waere der Ball rueckwaerts gerollt. Bei dauer 5,5 kam so heraus, man schaffe nur
        # 2,5 Felder, und eine voellig gesunde Bahn fiel durch.
        halt = RANKE_TEMPO / REIBUNG
        rollt = min(dauer, halt)
        weit = RANKE_TEMPO * rollt - 0.5 * REIBUNG * rollt * rollt
        ecken = [(o['x'], o['y']), (o['x'] + o['w'], o['y']),
                 (o['x'], o['y'] + o['h']), (o['x'] + o['w'], o['y'] + o['h'])]
        noetig = max(math.hypot(ex - bl['x'], ey - bl['y']) for ex, ey in ecken)
        if noetig + RANKE_PUFFER > weit:
            fehler.append(f'von der Blüte bis hinter die Ranke sind es {noetig:.1f} Felder, in '
                          f'{dauer:.1f} s schafft man aber nur {weit:.1f} – die Brücke welkt, '
                          f'bevor man drüben ist')

    # ---- Die Mühle (der Bienenstand)
    #
    # SIE MUSS DEN GANG WIRKLICH ZUSPERREN. Ihre beiden Klötze reichen von der Mitte aus je
    # w/2 + overlap weit; ist der Gang höher als das, bleibt an der Wand ein Schlitz offen, durch
    # den man an der ganzen Maschine vorbeirollt. Fynn hat genau das auf dem Treibhaus gefunden,
    # und man sieht es auf dem Bild sofort, sobald die Körbe einzeln dastehen: Der letzte Korb
    # hört auf, die Bande fängt aber erst ein Stück weiter an.
    for o in [x for x in b['obstacles'] if x['type'] == 'windmill']:
        achse_x = o.get('axis', 'y') == 'x'
        w = o.get('w', 3.0); ueber = o.get('overlap', 0.7)
        reicht = w / 2 + ueber
        mitte = o['x'] if achse_x else o['y']
        quer = int(o['y'] if achse_x else o['x'])
        offen = []
        for i in range(breit if achse_x else hoch):
            px, py = (i, quer) if achse_x else (quer, i)
            if not fest(px, py):
                continue
            if abs(i + 0.5 - mitte) > reicht + 0.001:
                offen.append(i)
        if offen:
            fehler.append(f'die Mühle auf {o["x"]}/{o["y"]} sperrt den Gang nicht zu: bei '
                          f'{"x" if achse_x else "y"} = {offen[0]} ist noch Boden, ihre Klötze '
                          f'reichen aber nur {reicht:.1f} Felder weit (w={w}, overlap={ueber})')

    # ---- Die Zauberkreise
    #
    # Ein Bannkreis ohne Takt ist eine runde Mauer, die nie aufgeht - der Reiz liegt genau darin,
    # daß er im Takt erlischt. Und jeder Kreis muß ganz auf der Bahn liegen: Ein Kreis, der halb
    # in der Bande steckt, sieht aus wie ein Fehler und wirkt auch nur halb.
    for o in [x for x in b['obstacles'] if x['type'] == 'zauberkreis']:
        if o['wirkung'] == 'bann' and not o['takt']:
            fehler.append(f'der Bannkreis auf {o["x"]}/{o["y"]} hat keinen Takt – er wäre eine '
                          f'Mauer, die nie aufgeht')
        r = o['r']
        for ex, ey in ((o['x'] - r, o['y']), (o['x'] + r, o['y']), (o['x'], o['y'] - r), (o['x'], o['y'] + r)):
            if not fest(int(ex), int(ey)):
                fehler.append(f'der Zauberkreis auf {o["x"]}/{o["y"]} ragt bei {ex:.1f}/{ey:.1f} '
                              f'über die Bahn hinaus')
                break

    # ---- Die Sprungschanzen
    #
    # IN DER LUFT GIBT ES KEINE MAUERN (siehe physics.js). Das ist der Reiz der Schanze - man
    # fliegt über die Sperre, um die alle anderen herummüssen -, aber es heißt auch: Wo der Ball
    # aufkommt, entscheidet allein die Rechnung `Schanzenkante + land`. Liegt dort eine Wand oder
    # der Rand, landet der Ball im Nichts und die Bahn ist kaputt, ohne daß es jemand beim
    # Hinsehen merkt. Also wird der Landepunkt hier nachgerechnet.
    for o in [x for x in b['obstacles'] if x['type'] == 'ramp']:
        rad = math.radians(o.get('angle', 90))
        dx, dy = math.cos(rad), math.sin(rad)
        # Die Kante liegt eine halbe Rampenlänge vom Mittelpunkt entfernt, in Flugrichtung
        mx, my = o['x'] + o['w'] / 2, o['y'] + o['h'] / 2
        halb = o['w'] / 2 if abs(dx) > 0.5 else o['h'] / 2
        lx, ly = mx + dx * (halb + o['land']), my + dy * (halb + o['land'])
        if not fest(int(lx), int(ly)):
            fehler.append(f'die Schanze auf {o["x"]}/{o["y"]} wirft den Ball nach '
                          f'{lx:.1f}/{ly:.1f} – dort ist kein Boden')
        # Und sie muß selbst auf Boden stehen, sonst kommt man gar nicht auf sie herauf
        for ex, ey in ((o['x'] + 0.1, o['y'] + 0.1), (o['x'] + o['w'] - 0.1, o['y'] + o['h'] - 0.1)):
            if not fest(int(ex), int(ey)):
                fehler.append(f'die Schanze auf {o["x"]}/{o["y"]} steht mit einer Ecke '
                              f'({ex:.1f}/{ey:.1f}) nicht auf der Bahn')

    # ---- Die Zauberhüte
    for o in [x for x in b['obstacles'] if x['type'] == 'zauberhut']:
        if len(o['plaetze']) < 2:
            fehler.append('ein Hütchenzauber braucht mindestens zwei Hüte')
        for p in o['plaetze']:
            px, py = int(p[0]), int(p[1])
            if not fest(px, py):
                fehler.append(f'ein Zauberhut steht auf {px}/{py}, und dort ist kein Boden – '
                              f'er spuckte den Ball ins Nichts')

    # ---- Der Mondzieher
    for o in [x for x in b['obstacles'] if x['type'] == 'mondzieher']:
        mx, my = int(o['x']), int(o['y'])
        if not fest(mx, my):
            fehler.append(f'ein Mondzieher steht auf {mx}/{my}, und dort ist kein Boden – '
                          f'sein Sockel stünde im Nichts')

    # ---- Das Sternbild
    #
    # Zwei Regeln, und beide betreffen denselben Fehler in zwei Richtungen: Ein Tor, das nichts
    # absperrt, ist Schmuck – und ein Stern hinter dem eigenen Tor macht die Bahn unlösbar.
    for o in [x for x in b['obstacles'] if x['type'] == 'sternbild']:
        if len(o['sterne']) < 2:
            fehler.append('ein Sternbild braucht mindestens zwei Sterne')
        for pkt in o['sterne']:
            sx, sy = int(pkt[0]), int(pkt[1])
            if not fest(sx, sy):
                fehler.append(f'ein Stern steht auf {sx}/{sy}, und dort ist kein Boden')
        if tee and cup:
            zu = erreichbar(tee, kanten=tor_kanten(o['tor']))
            if cup in zu:
                fehler.append('das Sternentor sperrt nichts ab – es gibt einen Weg ins Loch, der '
                              'daran vorbeiführt')
            for pkt in o['sterne']:
                if (int(pkt[0]), int(pkt[1])) not in zu:
                    fehler.append(f'der Stern auf {int(pkt[0])}/{int(pkt[1])} liegt hinter dem '
                                  f'eigenen Tor – dann geht es nie auf')

    # ---- Der Zauberspiegel
    #
    # Er wirft den Ball auf der anderen Seite aus, und zwar an der seitenverkehrten Stelle. Beides
    # muß Boden sein: Steht vor einem Ende die Wand, kommt man dort nie an; ist HINTER einem Ende
    # kein Boden, wirft der Spiegel den Ball ins Nichts. Beim Bauen sieht man das nicht, beim
    # Spielen sofort.
    for o in [x for x in b['obstacles'] if x['type'] == 'zauberspiegel']:
        dx, dy = o['x1'] - o['x0'], o['y1'] - o['y0']
        lang = math.hypot(dx, dy)
        if lang < 1.5:
            fehler.append('ein Zauberspiegel unter anderthalb Feldern Breite ist ein Punkt, '
                          'kein Spiegel')
            continue
        nx, ny = -dy / lang, dx / lang
        # Nicht ganz bis an die Enden: Ein Spiegel steckt mit seinen Enden IN der Wand, wie eine
        # Tuer im Rahmen. Geprueft wird die Flaeche, durch die der Ball geht.
        for k in range(1, 20):
            u = k / 20
            px, py = o['x0'] + dx * u, o['y0'] + dy * u
            for seite in (1, -1):
                qx, qy = px + nx * seite * 0.8, py + ny * seite * 0.8
                if not fest(int(qx), int(qy)):
                    fehler.append(f'neben dem Zauberspiegel ist bei {int(qx)}/{int(qy)} kein Boden '
                                  f'– dort käme der Ball nie an oder flöge ins Nichts')
                    break
            else:
                continue
            break

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
#  DIE OPTIK IST JETZT DIE EIGENE. Anfangs lieh sich der Garten seine Bilder aus den alten Welten:
#  ein Pilz aus dem Pilzhain, ein Hexenbesen als Windrad, ein Müllerhaus als Mühle. Das Verhalten
#  war neu, das Bild geborgt – und ein geborgtes Bild erzählt die falsche Geschichte. Seit Fassung
#  195 hat jede der fünf alten Maschinen hier ihre eigene Gestalt, und alle fünf wachsen im selben
#  Garten: Springkraut, Rasensprenger, Bienenstock, Pollenstrudel, Riesen-Sonnenblume
#  (gezeichnet in src/render_garten.js).
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
    pilz(14.5, 8.5, stil='springkraut'),
    pilz(23.5, 4.5, stil='springkraut'),
], par=3,
intro='Der Garten des Lehrlings, kurz vor Sonnenuntergang. Zwei Hecken stehen im Weg, und dazwischen '
      'geht es im Bogen hindurch. Die beiden Springkräuter federn den Ball zurück, sobald ihre '
      'Kapsel platzt – das lohnt sich zu wissen, bevor es schwieriger wird.')

# --- 2 ---------------------------------------------------------------------
# Die erste Blüte. Hier wird die Rankenbrücke erklärt, und sonst nichts: eine Lücke,
# eine Blüte davor, dahinter viel Platz zum Ankommen.
f = leer(32, 13)
fuell(f, 1, 3, 30, 9)
setz(f, 3, 6, 'T'); setz(f, 28, 6, 'H')
bahn(GARTEN, 'Die erste Blüte', 'lehrlingsgarten', f, [
    ranke(14, 3, 4, 7, 10.5, 6.5, dauer=4.0),
    windrad(21.5, 6.5, blades=3, laenge=1.8, tempo=1.1, stil='sprenger'),
], par=3,
intro='Über die Lücke führt nichts – bis man die Blüte anstößt. Dann wächst eine Ranke hinüber und '
      'trägt vier Sekunden lang. Zu sacht geschlagen, und man liegt noch darauf, wenn sie welkt; zu '
      'hart, und man fliegt daran vorbei. Dazwischen liegt der Schlag.')

# --- 3 ---------------------------------------------------------------------
# Der Springkrautkranz. Ein Rundbeet, in seiner Mitte das Loch, und davor ein Kranz aus Springkraut.
# Gerade hinein geht nicht; man muß den Ball abprallen lassen.
f = leer(28, 15)
scheibe(f, 13.5, 7.5, 12, 6.4)
setz(f, 3, 7, 'T'); setz(f, 13, 7, 'H')
ring = []
for i in range(8):
    # Ohne Versatz: So steht eines der Kräuter genau zwischen Abschlag und Loch. Das ist der Sinn
    # der Bahn – der gerade Weg ist versperrt – und die Prüfung besteht darauf.
    a = i * (math.pi * 2 / 8)
    ring.append(pilz(round(13.5 + math.cos(a) * 3.2, 1), round(7.5 + math.sin(a) * 3.2, 1),
                     r=0.5 if i % 2 else 0.58, stil='springkraut'))
bahn(GARTEN, 'Der Springkrautkranz', 'lehrlingsgarten', f, ring, par=3,
intro='Ein Rundbeet, und mitten darin das Loch. Der Kranz aus Springkraut läßt niemanden geradewegs '
      'hinein – wer es mit Gewalt versucht, kommt weiter heraus, als er hineingekommen ist. Sanft '
      'anspielen und eine Kapsel als Wand benutzen ist der kürzere Weg.')

# --- 4 ---------------------------------------------------------------------
# Zwei Blüten. Dieselbe Maschine zweimal, und dazwischen bleibt keine Zeit zum Nachdenken:
# Wer nach der ersten Ranke stehenbleibt, fängt von vorn an.
f = leer(34, 13)
fuell(f, 1, 3, 32, 9)
setz(f, 3, 6, 'T'); setz(f, 30, 6, 'H')
bahn(GARTEN, 'Zwei Blüten', 'lehrlingsgarten', f, [
    ranke(11, 3, 3, 7, 8.5, 6.5, dauer=4.0),
    ranke(22, 3, 3, 7, 18.5, 6.5, dauer=4.0),
    pilz(27.5, 6.5, stil='springkraut'),
], par=4,   # zwei Uhren hintereinander kosten einen Schlag mehr, als hier lange stand
intro='Zwei Lücken, zwei Blüten. Die zweite Blüte liegt hinter der ersten Ranke – man kommt also nur '
      'an sie heran, wenn die erste noch trägt. Ein Schlag, der beide schafft, ist möglich; zwei '
      'ruhige sind sicherer.')

# --- 5 ---------------------------------------------------------------------
# Der Hutständer. ZWEI Regalwände statt einer, und dahinter noch der halbe Weg. In der ersten
# Fassung war die Bahn hinter dem Zauber zu Ende: Hut treffen, herauskommen, einlochen – die
# Maschine war erklärt, aber gespielt hatte man sie nicht. Jetzt entscheidet der Hut nur, WO man
# den zweiten Teil beginnt, und der zweite Teil ist selbst eine Aufgabe: an der zweiten Wand oben
# herum, am Springkraut vorbei, durch den Rasensprenger ans Loch. Wer in der Nische landet, hat
# nicht verloren, sondern nur den längeren Anlauf.
f = leer(42, 15)
fuell(f, 1, 2, 40, 12)
fuell(f, 12, 2, 14, 12, 'x')          # die erste Regalwand: hier hilft nur der Hut
fuell(f, 28, 5, 30, 12, 'x')          # die zweite: sie läßt oben eine Gasse frei
# Die Nische um den falschen Hut. VORHER WAR HIER SAND, und Sand ist eine schlechte Strafe: Er
# nimmt Tempo weg, aber man sieht ihm nicht an, wieviel, und man kann nichts dagegen tun. Eine
# Ecke ist ehrlicher – wer hier herauskommt, sieht sofort, dass er einmal zur Seite und einmal
# hinaus spielen muss. Das kostet genau einen Schlag, und zwar einen, den man selbst verschuldet
# hat, indem man im falschen Augenblick in den Hut gerollt ist.
# Die Lücke oben links ist der Ausgang; ohne sie wäre die Nische ein Gefängnis. 
fuell(f, 17, 9, 21, 9, 'x')           # die Wand über der Nische, mit einer Lücke bei x = 15/16
fuell(f, 21, 10, 21, 12, 'x')         # und die Wand an ihrer rechten Seite
setz(f, 3, 7, 'T'); setz(f, 37, 10, 'H')
bahn(GARTEN, 'Der Hutständer', 'gewaechshaus', f, [
    huete([(6, 7), (18, 4), (18, 11)], takt=2.6),
    pilz(9.5, 10.5, stil='springkraut'),
    pilz(24.5, 7.5, stil='springkraut'),
    windrad(34.5, 6.5, blades=2, laenge=1.3, tempo=0.9, stil='sprenger'),
], par=3,   # die Bot-Prüfung nach dem Umbau: Median 2, Schnitt 2,25 – Par 4 wäre ein geschenkter Schlag
intro='Durch die erste Wand kommt nur, wer sich verzaubern läßt: hinein in einen Hut, heraus aus '
      'dem, der gerade leuchtet – und wer in den leuchtenden rollt, aus dem nächsten. Einer der '
      'beiden Ausgänge steht in einer Nische: Von dort muß man erst zur Seite und dann hinaus, das '
      'kostet einen Schlag. Danach ist die Bahn noch nicht zu Ende – die zweite Wand läßt nur oben '
      'eine Gasse, und davor dreht der Sprenger.')

# --- 6 ---------------------------------------------------------------------
# Das Treibhaus. Der Bienenstand steht quer über dem Weg, dahinter drehen zwei Rasensprenger.
f = leer(30, 14)
fuell(f, 1, 3, 28, 10)
setz(f, 3, 6, 'T'); setz(f, 27, 6, 'H')
bahn(GARTEN, 'Das Treibhaus', 'gewaechshaus', f, [
    # Die Zahlen stammen aus der Bot-Prüfung: Mit Durchlaß 1,1 und zwei Sprengern zu 1,4 brauchte
    # der Normalspieler im Schnitt fünfeinhalb Schläge – auf der sechsten Bahn einer NORMAL-Welt ist
    # das zu viel. Breiterer Durchlaß, langsamere Sprenger, und sie stehen weiter auseinander.
    muehle(15.5, 6.5, w=6.8, gap=1.5, tempo=0.85, achse='y', stil='bienenstock'),
    windrad(21.5, 4.5, blades=2, laenge=1.3, tempo=-0.9, stil='sprenger'),
    windrad(21.5, 8.5, blades=2, laenge=1.3, tempo=0.9, stil='sprenger'),
    pilz(8.5, 4.5, stil='springkraut'),
    pilz(8.5, 8.5, stil='springkraut'),
], par=4,
intro='Der Bienenstand steht quer im Weg, und der Durchlaß zwischen den Körben schließt sich im Takt '
      'mit einer Wabe. Dahinter drehen zwei Rasensprenger gegeneinander – sie laufen in '
      'verschiedene Richtungen, also gibt es keinen Augenblick, in dem beide zugleich aus dem Weg '
      'sind. Einer nach dem anderen.')

# --- 7 ---------------------------------------------------------------------
# Blüte und Hut. Zuerst die Ranke über den Steg, dann die Hüte durch die Regalwand.
f = leer(34, 15)
fuell(f, 1, 4, 12, 10)                # der Vorraum
fuell(f, 13, 6, 20, 8)                # der schmale Steg
fuell(f, 21, 3, 32, 11)               # die Halle
fuell(f, 27, 3, 28, 8, 'x')           # die Regalwand davor - mit einer Gasse an der Unterkante
setz(f, 3, 7, 'T'); setz(f, 31, 7, 'H')
bahn(GARTEN, 'Blüte und Hut', 'gewaechshaus', f, [
    ranke(14, 6, 5, 3, 9.5, 7.5, dauer=5.5),
    # ZWEI Hüte, nicht drei. Mit dreien brauchte der Normalspieler in der Bot-Prüfung im Schnitt
    # sieben Schläge und im Median neun: Aus welchem Hut man herauskommt, war dann Glück. Mit
    # zweien ist der Weg eindeutig – egal welcher gerade leuchtet, man landet drüben –, und die
    # Aufgabe ist wieder das, was sie sein soll: hineintreffen. Die Wahl zwischen mehreren
    # Ausgängen gehört in die Sternenwarte, nicht in den Garten. 
    # Und ein weites Maul. Mit 0,42 Kacheln war der Hut ein Nadeloehr: Der ehrlich messende
    # Bot (siehe README, die zwei Fehler im Pruefstand) brauchte im Median NEUN Schlaege bei
    # Par 4, weil er immer wieder daneben rollte. Ein Hut, den man nur mit Glueck trifft, ist
    # keine Aufgabe, sondern eine Pruefung der Geduld.
    #
    # UND DIE REGALWAND HAT JETZT EINE GASSE. Auch mit weitem Maul blieb der Median bei elf:
    # Wer den Hut verfehlte, stand vor einer Wand ohne Ausweg und musste es noch einmal
    # versuchen, und noch einmal. Der Hut ist jetzt die ABKUERZUNG, nicht die einzige Tuer -
    # das ist im Garten die richtige Rolle fuer ihn. Wer ihn trifft, spart einen Schlag; wer
    # nicht, geht unten herum.
    huete([(24, 7), (30, 10)], takt=2.4, r=0.62),
    pilz(24.5, 4.5, stil='springkraut'),
], par=4,
intro='Erst die Ranke über den Steg – sie trägt hier eine halbe Sekunde länger, der Weg ist weiter. '
      'Dann steht die Regalwand im Weg, und wieder helfen nur die Hüte. Wer beim Steg zu viel Kraft '
      'gibt, steht drüben zu weit oben und muß noch einmal ansetzen.')

# --- 8 ---------------------------------------------------------------------
# Der Blätterwirbel. Ein Pollenstrudel zieht, eine Riesen-Sonnenblume dreht und wirft aus.
#
# ZWEITE FASSUNG. Die erste war ein offener Platz mit einem Beet darin, und der Bot lochte sie
# JEDES MAL mit einem Schlag – ein Schlag am Beet vorbei, und der Ball lief durch. Eine Bahn, auf
# der der gerade Weg immer reicht, ist Kulisse. Jetzt stehen zwei Beete versetzt zueinander und vor
# dem Loch eine Hecke: Der Weg ist ein Zickzack, und der Pollenstrudel steht genau in der ersten
# Kehre, wo man am wenigsten Lust hat, abgelenkt zu werden.
#
# DRITTE FASSUNG. Damit war sie zu weit ins andere Extrem gekippt: Der Bot brauchte im Mittel fünf
# Schläge bei Par 3 und über zwei Minuten. Die Hecke bekommt darum eine Gasse an der Unterkante –
# wer sie sieht, kommt geradeaus durch –, und Par steht jetzt auf 4. Eine Bahn, die man nur mit
# Glück in drei schafft, ist nicht schwer, sondern unfair.
f = leer(30, 15)
fuell(f, 1, 3, 28, 11)
fuell(f, 10, 3, 12, 8, '.')           # Beet von oben
fuell(f, 18, 7, 20, 11, '.')          # Beet von unten
fuell(f, 23, 8, 24, 10, 'x')          # Hecke vor dem Loch, mit einer Gasse darunter
setz(f, 3, 5, 'T'); setz(f, 26, 9, 'H')
bahn(GARTEN, 'Der Blätterwirbel', 'lehrlingsgarten', f, [
    # Der erste Zauberkreis des Spiels steht hier, im Garten, und er schiebt: Die freundlichste der
    # fünf Wirkungen gehört auf die Stufe, auf der man Zaubern lernt.
    kreis(15.5, 9.5, 'schub', r=1.5),
    magnet(8.5, 9.5, r=2.6, kraft=5.0, stil='pollen'),   # schwach genug, daß es den Ball ablenkt und nicht einfängt
    scheibe_(15.5, 5.5, r=1.8, tempo=1.8, aus=90, stil='sonnenblume'),
    pilz(22.5, 5.5, stil='springkraut'),
], par=3,
intro='Zwei Beete stehen versetzt, dazwischen geht es im Zickzack. Die Pusteblume zieht an allem, '
      'was an ihr vorbeirollt – ausgerechnet in der ersten Kehre, wo man ohnehin schon aufpassen '
      'muß. Die Sonnenblume dahinter fängt den Ball und wirft ihn immer nach unten aus; wer sie '
      'trifft, spart sich die halbe Bahn.')

# --- 9 ---------------------------------------------------------------------
# Die Lehrlingsprüfung. Alles, was der Garten kann, hintereinander.
f = leer(34, 15)
fuell(f, 1, 3, 32, 11)
setz(f, 3, 7, 'T'); setz(f, 31, 8, 'H')
bahn(GARTEN, 'Die Lehrlingsprüfung', 'lehrlingsgarten', f, [
    ranke(10, 3, 3, 9, 7.5, 7.5, dauer=4.2),
    pilz(14.5, 5.5, stil='springkraut'),
    pilz(14.5, 9.5, stil='springkraut'),
    muehle(18.5, 7.5, w=7.6, gap=1.2, tempo=0.9, achse='y', stil='bienenstock'),
    huete([(24, 5), (24, 10), (29, 11)], takt=2.8),
], par=4,   # seit der Bienenstock die Gasse wirklich schließt: Bot-Median 4 statt 3
intro='Die Prüfung: erst die Ranke, dann zwischen dem Springkraut hindurch, dann der Bienenstand im '
      'Takt – und '
      'zum Schluß noch einmal die Hüte. Wer hier unter Par bleibt, hat den Lehrlingshut verdient.')


# --- 10 --------------------------------------------------------------------
# DER ENDGEGNER DES GARTENS: Die Riesenblüte.
#
# Der Weg dorthin ist lang und ohne Tücke - erst das Vorfeld mit den Maschinen, die man im Garten
# gelernt hat, dann der Zugang, und ganz am Ende sie selbst. Das ist Absicht: Ein Endgegner soll
# nicht der letzte von zehn Handgriffen sein, sondern das, worauf es hinausläuft. Wer vor ihr
# steht, soll noch Schläge übrig haben, um sie zu lernen.
#
# DAS LOCH LIEGT IN IHRER MITTE. Eine große Maschine, an der man vorbeispielt, ist ein Umweg;
# eine, durch die man hindurch muß, ist ein Gegner.
f = leer(52, 19)
fuell(f, 1, 8, 30, 11)                # das lange Vorfeld
fuell(f, 10, 4, 13, 11)               # zwei Ausbuchtungen nach oben und unten
fuell(f, 19, 8, 22, 15)
fuell(f, 28, 4, 31, 15)               # der Zugang zum Rondell
fuell(f, 31, 3, 50, 16)               # das Rondell mit der Blüte
setz(f, 3, 9, 'T'); setz(f, 40, 9, 'H')
bahn(GARTEN, 'Die Riesenblüte', 'lehrlingsgarten', f, [
    kreis(7.0, 9.5, 'schub', r=1.2),
    windrad(11.5, 6.0, blades=2, laenge=1.4, tempo=0.9, stil='sprenger'),
    pilz(16.0, 9.5, stil='springkraut'),
    # Der Bienenstand steht dort, wo der Gang nur vier Kacheln hoch ist: Weiter vorn, an der
    # Ausbuchtung, müßte er elf Felder weit reichen, um wirklich zuzusperren.
    muehle(25.5, 10.0, w=4.0, gap=1.5, tempo=0.8, achse='y', stil='bienenstock'),
    scheibe_(20.5, 13.5, r=1.7, tempo=1.6, aus=0, stil='sonnenblume'),
    kreis(29.5, 9.5, 'bremse', r=1.3),
    riesenbluete(40.5, 9.5, r=4.6, blaetter=6, takt=8.5, kraft=26),
], par=6, maxStrokes=18,
intro='Am Ende des Gartens steht sie: sechs Blütenblätter, und das Loch liegt in ihrer Mitte. '
      'Sie öffnet und schließt sich in einem langsamen Takt – aber wenn sie zugeht, kommt der '
      'Pollenstoß, und wer dann noch im Kelch liegt und nicht im Loch, fliegt wieder hinaus. Der '
      'Kelch glüht auf, bevor es soweit ist. Das ist die einzige Warnung, und sie reicht.')

# ===========================================================================
#  DIE STERNENWARTE - Profi, neun Bahnen
#  Die Terrasse eines Turms über den Wolken und der Kartensaal darunter.
#
#  WAS DIESE STUFE VON DER NORMALEN UNTERSCHEIDET. Nicht schmalere Wege - die sind nur lästiger,
#  nicht schwerer. Hier fällt die Entscheidung VOR dem Schlag: Der Mondzieher fragt "wann", das
#  Sternbild fragt "in welcher Reihenfolge". Beides muß man sich überlegen, während der Ball noch
#  liegt; danach kann man es nicht mehr richten.
#
#  UND DIE ALTEN MASCHINEN BEHALTEN IHR GESICHT. Das Auge des Turms aus dem Schattenreich wird zum
#  Fernrohr, das Pendel der Uhrwerkstadt zum Lot des Astronomen, der Strudel der Flut zum
#  Nebelwirbel, das Zahnradfeld zur Armillarsphäre. Jede von ihnen hat eine Zeichnung, an der man
#  sie erkennt - und die wiederzusehen ist ein Teil der Freude.
# ===========================================================================
WARTE = welt('warte', 'ZAUBER_WARTE', 'Sternenwarte')

# --- 1 ---------------------------------------------------------------------
# Der Aufgang. Ein Mond, ein Abgrund - mehr nicht. Wer ihn hier nicht versteht, versteht die ganze
# Welt nicht, und darum steht auf dieser Bahn sonst nichts im Weg.
f = leer(30, 13)
fuell(f, 1, 2, 28, 10)
fuell(f, 10, 7, 20, 10, '.')          # der Abgrund unter dem Gang
setz(f, 3, 8, 'T'); setz(f, 26, 8, 'H')
bahn(WARTE, 'Der Aufgang', 'sternenwarte', f, [
    mond(15.0, 4.0, r=3.4, kraft=9.0, takt=7.0),
    pilz(8.5, 4.5, stil='meteorit'),
    pilz(22.5, 4.5, stil='meteorit'),
], par=3,
intro='Der Mond über der Terrasse zieht, solange seine Scheibe voll ist, und stößt, solange sie '
      'dunkel ist. Beim Halbmond läßt er in Ruhe. Der Gang oben ist schmal, und unter ihm ist '
      'nichts - also: erst hinsehen, dann schlagen.')

# --- 2 ---------------------------------------------------------------------
# Das erste Sternbild. Drei Sterne, ein Tor, sonst nichts. Dieselbe Sparsamkeit wie bei Bahn 1.
f = leer(32, 13)
fuell(f, 1, 2, 30, 10)
fuell(f, 20, 2, 21, 5, 'x')           # der Mauerdurchbruch, in dem das Tor steht
fuell(f, 20, 8, 21, 10, 'x')
setz(f, 3, 6, 'T'); setz(f, 28, 6, 'H')
bahn(WARTE, 'Das erste Sternbild', 'sternenwarte', f, [
    sternbild([(6, 3), (11, 9), (16, 3)], (20, 6, 20, 8)),
    pilz(13.5, 6.5, stil='meteorit'),
], par=3,
intro='Die drei Sterne wollen angefahren werden - alle drei, in einer Reihenfolge, die man sich '
      'vorher überlegt. Erst dann geht das Tor auf. Die Linien am Boden zeigen, was noch fehlt.')

# --- 3 ---------------------------------------------------------------------
# Zwischen den Monden. Zwei Monde im Gegentakt: Wenn der eine zieht, stößt der andere. Es gibt
# keinen Augenblick, in dem beide schweigen - man muß sich für eine Seite entscheiden.
f = leer(34, 15)
fuell(f, 1, 2, 32, 12)
fuell(f, 12, 2, 14, 5, '.'); fuell(f, 12, 9, 14, 12, '.')
fuell(f, 22, 2, 24, 5, '.'); fuell(f, 22, 9, 24, 12, '.')
setz(f, 4, 7, 'T'); setz(f, 30, 7, 'H')
bahn(WARTE, 'Zwischen den Monden', 'sternenwarte', f, [
    mond(9.0, 7.0, r=3.2, kraft=8.0, takt=6.0, phase=0.0),
    mond(19.0, 7.0, r=3.2, kraft=8.0, takt=6.0, phase=0.5),
    pendel(27.0, 4.0, laenge=3.5, amp=48, stil='foucault'),
], par=4,
intro='Zwei Monde stehen im Gegentakt: Zieht der eine, stößt der andere. Dazwischen liegen zwei '
      'Stege, die keinen Platz für Irrtümer lassen. Und am Ende schwingt das Lot des Astronomen.')

# --- 4 ---------------------------------------------------------------------
# Der Kartensaal. Vier Sterne in den Ecken einer Halle, das Tor quer davor. Wer die Ecken in der
# falschen Reihenfolge nimmt, läuft die Halle zweimal ab.
f = leer(30, 15)
fuell(f, 1, 2, 28, 12)
fuell(f, 12, 2, 14, 5, 'x')           # Regale
fuell(f, 12, 9, 14, 12, 'x')
# Der Kartentisch mitten im Saal. Er stand hier nicht, solange das Sternentor vor dem Loch die
# Gerade sperrte; ohne das Tor lag der Weg vom Abschlag bis ins Loch frei, und die Bahn war ein
# Ass. Um den Tisch herum muß man so oder so.
fuell(f, 17, 6, 18, 9, 'x')
setz(f, 3, 7, 'T'); setz(f, 26, 7, 'H')
bahn(WARTE, 'Der Kartensaal', 'kartensaal', f, [
    rampe(7.5, 2.6, 3.0, 2.8, angle=0, land=5.2, speed=5.8, stil='sternschanze'),
    pendel(24.0, 3.6, laenge=3.2, amp=55, stil='foucault'),
    pilz(18.5, 4.5, stil='meteorit'),
    wandertor(21, 2, 21, 13, gasse=2.0, stil='kulisse'),
], par=4,
intro='Zwei Regale teilen den Saal. Wer den Gang in der Mitte nimmt, kommt am Lot des Astronomen '
      'vorbei; wer die Schanze oben trifft, fliegt über das erste Regal hinweg. Vor dem Loch '
      'wandert die Kulisse hin und her – da hilft nur der richtige Augenblick.')

# --- 5 ---------------------------------------------------------------------
# Das Fernrohr. Das Auge des Turms sucht die Terrasse ab - dieselbe Zeichnung wie im Schattenreich,
# hier als Instrument statt als Wächter. Wen es erwischt, den setzt es zurück.
#
# DIE TÜRME STEHEN NEBEN DER TERRASSE, NICHT DARAUF. Vorher standen sie mitten im Weg und waren
# damit zweierlei: ein Hindernis, um das man herumspielt, UND ein Auge, vor dem man sich versteckt.
# Das erste nimmt dem zweiten die Wirkung - man umkurvte den Sockel und merkte gar nicht, dass
# oben etwas schaut. Jetzt stehen sie draußen im Dunkeln, wie die Laternen, und was von ihnen auf
# der Bahn ankommt, ist nur noch ihr Blick. Jeder von beiden bewacht die Gerade, die man wirklich
# überqueren muss: der eine unten zwischen dem ersten und dem zweiten Pfeiler, der andere oben
# zwischen dem zweiten und dem dritten.
f = leer(32, 15)
fuell(f, 1, 2, 30, 12)
fuell(f, 8, 2, 9, 8, 'x')
fuell(f, 16, 6, 17, 12, 'x')
fuell(f, 24, 2, 25, 8, 'x')
setz(f, 3, 7, 'T'); setz(f, 29, 10, 'H')
bahn(WARTE, 'Das Fernrohr', 'sternenwarte', f, [
    # WEIT GENUG HINAUS, DASS DER SOCKEL DIE BANDE NICHT MEHR BERUEHRT. Zweimal standen sie noch
    # halb in ihr drin, und das sieht aus wie ein Baufehler und nicht wie ein Turm neben der
    # Terrasse. Die Rechnung: Der Boden endet bei y = 13 bzw. y = 2, die Bande ragt 0,58 nach
    # aussen, und der Sockel des Turms misst 1,375 im Halbmesser (r * 1,25). Macht 14,96 bzw. 0,05
    # als Grenze - mit 15,2 und -0,2 steht beides frei, und beides liegt noch auf der Scholle,
    # die 1,4 Felder ueber die Karte hinausreicht.
    auge(12.5, 15.2, r=1.1, weite=9.0, tempo=0.4, stil='sternenspiegel'),                # unten neben der Terrasse
    auge(21.0, -0.2, r=1.1, weite=9.0, tempo=-0.36, phase=1.6, stil='sternenspiegel'),   # oben neben der Terrasse
    mond(20.0, 10.5, r=2.8, kraft=7.0, takt=6.5, phase=0.3),
], par=4,
intro='Zwei Fernrohre stehen am Rand der Terrasse und suchen sie ab, und zwischen ihnen zieht ein '
      'Mond jeden geraden Weg krumm. Der Zickzack durch die Pfeiler ist der kurze Weg - wenn man '
      'ihn im richtigen Augenblick nimmt. Wer im Strahl liegen bleibt, wird gesehen.')

# --- 6 ---------------------------------------------------------------------
# Die Armillarsphäre. Das Zahnradfeld der Uhrwerkstadt trägt über die Lücke, der Nebelwirbel
# schleudert nach außen. Beide kennt man - neu ist, daß sie zusammenarbeiten.
f = leer(32, 15)
fuell(f, 1, 2, 30, 12)
fuell(f, 13, 2, 19, 12, '.')          # die große Lücke
fuell(f, 13, 6, 19, 8, '#')           # der Steg, über den das Zahnrad fährt
setz(f, 3, 7, 'T'); setz(f, 28, 4, 'H')
bahn(WARTE, 'Die Armillarsphäre', 'sternenwarte', f, [
    zahnfeld(12.5, 7.5, 19.5, 7.5, warten=2.2, fahrt=3.0, stil='meridian'),
    nebel(24.5, 9.0, r=2.8, dreh=1, stil='spiralnebel'),
    pilz(9.5, 4.5, stil='meteorit'),
], par=4,
intro='Der Messingring fährt über den Steg und nimmt mit, wer rechtzeitig darauf liegt. Dahinter '
      'wartet ein Nebelwirbel, der alles nach außen schleudert - am besten also gar nicht erst '
      'hinein.')

# --- 7 ---------------------------------------------------------------------
# Der Wandelgang. Das wandernde Tor der Uhrwerkstadt, dazu ein Mond, der die Lücke verschiebt,
# während man auf sie zielt.
f = leer(34, 15)
fuell(f, 1, 2, 32, 12)
fuell(f, 6, 2, 7, 12, 'x'); fuell(f, 6, 6, 7, 8, '#')     # erster Durchlaß, fest
setz(f, 3, 7, 'T'); setz(f, 30, 7, 'H')
bahn(WARTE, 'Der Wandelgang', 'kartensaal', f, [
    kreis(9.5, 7.0, 'wirbel', r=1.7, kraft=2.2),
    kreis(26.0, 7.0, 'bremse', r=1.6, takt=4.2),
    wandertor(18, 3, 18, 11, gasse=1.9, stil='kulisse'),
    mond(13.0, 7.0, r=3.0, kraft=8.5, takt=5.5),
    pilz(24.5, 4.5, stil='meteorit'),
    pilz(24.5, 9.5, stil='meteorit'),
], par=3,     # Bot-Median 3 - Par 4 waere hier geschenkt
intro='Das wandernde Tor läuft auf und ab, und der Mond davor zieht den Ball von der Lücke weg '
      'oder in sie hinein. Zwei Uhren, die nicht zusammenpassen - man muß sich die eine aussuchen '
      'und die andere aushalten.')

# --- 8 ---------------------------------------------------------------------
# Die Hutkammer. Der Rückgriff auf den Lehrlingsgarten: dieselben Zauberhüte, aber jetzt entscheidet
# ein Mond mit, wo man ankommt.
f = leer(32, 15)
fuell(f, 1, 2, 30, 12)
fuell(f, 11, 2, 12, 9, 'x')
fuell(f, 20, 5, 21, 12, 'x')
setz(f, 3, 7, 'T'); setz(f, 28, 4, 'H')
bahn(WARTE, 'Die Hutkammer', 'kartensaal', f, [
    # Der Sprungkreis wirft den Ball ein Stück weit, ohne die Richtung anzurühren: Er entscheidet,
    # WIE WEIT, nicht wohin. Hier heißt das, daß man über die zweite Wand kommt - wenn man vorher
    # in die richtige Richtung zeigt.
    kreis(16.0, 8.0, 'sprung', r=1.7, weite=5.6),
    huete([(8, 4), (16, 11), (25, 9)], takt=2.4),
    mond(16.0, 4.0, r=3.0, kraft=8.0, takt=6.0, phase=0.25),
    pendel(25.0, 3.0, laenge=3.0, amp=45, stil='foucault'),
], par=4,
intro='Die Hüte aus dem Garten, eine Stufe schärfer: Wo man herauskommt, steht fest - was danach '
      'mit dem Ball geschieht, entscheidet der Mond daneben. Wer den Hut im falschen Augenblick '
      'nimmt, landet dort, wo er nicht hin wollte.')

# --- 9 ---------------------------------------------------------------------
# Die Sternenprüfung. Alles, was die Warte kann, hintereinander: Ranke, Mond, Sternbild.
#
# ZWEITE FASSUNG. Die erste war eine offene Halle mit drei Sternen darin, und der Bot lochte sie
# JEDES MAL in zwei Schlägen bei Par 5: Ein Schlag quer durch die Halle traf im Abprallen alle drei
# Sterne, und das Tor stand schon offen, bevor man es gesehen hatte. Ein Sternbild, das man
# versehentlich vollendet, ist kein Sternbild. Jetzt stehen vier Pfeilerpaare im Weg, und der
# dritte Stern liegt in einer Nische hinter dem letzten Pfeiler - dorthin kommt nur, wer hinfährt.
f = leer(36, 15)
fuell(f, 1, 2, 34, 12)
fuell(f, 9, 2, 12, 4, 'x'); fuell(f, 9, 10, 12, 12, 'x')      # der Gang, den die Ranke sperrt
fuell(f, 20, 2, 21, 5, 'x'); fuell(f, 20, 9, 21, 12, 'x')     # erstes Pfeilerpaar
fuell(f, 24, 2, 25, 5, 'x'); fuell(f, 24, 9, 25, 12, 'x')     # zweites, und dahinter die Nische
# Die Felder der Ranke bleiben in der Karte Boden - das Fallen besorgt die Maschine (siehe
# obstacles_zauber.js). Ein '.' hier wäre ein Loch, das keine Ranke je schlösse.
#
# DRITTE FASSUNG. Die Ranke lag zuerst mitten in der offenen Halle, und daneben blieb ein
# Streifen frei - also rollte der Bot einfach daran vorbei, und die Maschine war Schmuck. Seit
# dieser Erfahrung prüft pruefe(), ob an einer Rankenbrücke ein Weg vorbeiführt.
setz(f, 3, 7, 'T'); setz(f, 32, 7, 'H')
bahn(WARTE, 'Die Sternenprüfung', 'sternenwarte', f, [
    ranke(9, 5, 4, 5, 6.5, 7.5, dauer=4.5),
    mond(16.0, 7.0, r=3.2, kraft=8.5, takt=6.5, phase=0.15),
    rampe(21.8, 6.2, 2.0, 2.6, angle=0, land=5.4, speed=6.0, stil='sternschanze'),
    wandertor(28, 2, 28, 13, gasse=2.0, stil='kulisse'),
], par=5,
intro='Die Prüfung der Warte: erst die Blüte anstoßen und über die Ranke, dann am Mond vorbei. '
      'Danach gibt es zwei Wege. Die Schanze zwischen den Pfeilern ist schmal, wirft aber in '
      'einem Bogen über die Kulisse hinweg; wer sie verfehlt, muß den Augenblick abpassen, in dem '
      'die Gasse vor ihm steht. Wer hier unter Par bleibt, hat den Sternenhut verdient.')

# --- 10 --------------------------------------------------------------------
# DER ENDGEGNER DER WARTE: Die Große Armillarsphäre.
#
# Drei Messingringe um das Loch, jeder mit EINER Gasse, jeder mit eigenem Tempo und eigener
# Richtung. Die Frage der Sternenwarte war immer „wann" - hier wird sie dreifach gestellt, und die
# drei Antworten passen nur selten zusammen. Wer nicht warten will, geht in mehreren Schlägen von
# Ring zu Ring und hält sich zwischen zweien auf.
#
# WARUM DIE RINGE VERSCHIEDEN SCHNELL LAUFEN. Liefen sie gleich, stünden ihre Gassen immer
# übereinander, und die Sphäre wäre ein Tor mit drei Rahmen.
f = leer(54, 21)
fuell(f, 1, 9, 26, 12)                # der Aufgang
fuell(f, 8, 4, 11, 12)
fuell(f, 8, 4, 20, 7)
fuell(f, 17, 7, 20, 17)
fuell(f, 17, 14, 26, 17)
fuell(f, 23, 9, 26, 17)
fuell(f, 26, 2, 52, 19)               # der Saal der Sphäre
setz(f, 3, 10, 'T'); setz(f, 39, 10, 'H')
bahn(WARTE, 'Die Große Armillarsphäre', 'sternenwarte', f, [
    kreis(6.0, 10.5, 'schub', r=1.3),
    pilz(14.0, 5.5, stil='meteorit'),
    pendel(18.5, 10.0, laenge=3.2, amp=55, stil='foucault'),
    kreis(21.5, 15.5, 'bremse', r=1.3),
    mond(30.0, 10.5, r=3.0, kraft=7.5, takt=6.0, phase=0.2),
    sphaere(39.5, 10.5, [(8.2, 0.62, 0.30, 0.0),
                         (5.6, 0.72, -0.44, 0.35),
                         (3.1, 0.86, 0.66, 0.7)]),
], par=6, maxStrokes=18,
intro='Drei Messingringe um das Loch, jeder mit einer einzigen Gasse, jeder mit eigenem Tempo und '
      'eigener Richtung. Alle drei zugleich zu erwischen ist möglich, aber selten – der ruhigere '
      'Weg ist, sich von Ring zu Ring zu arbeiten und zwischen zweien zu warten. Die hellen '
      'Pfosten zeigen, wo die Gasse gerade steht.')

# ===========================================================================
#  DIE ERZMAGIERLOGE - Legende, neun Bahnen
#  Der Ratssaal der Erzmagier und die Bannkreis-Gruft darunter.
#
#  WAS DIESE STUFE VON DER PROFI-STUFE UNTERSCHEIDET. Die Warte fragt "wann" und "in welcher
#  Reihenfolge". Hier kommt die dritte Frage dazu: "WO GENAU". Der Zauberspiegel hat keinen festen
#  Ausgang - man waehlt ihn mit dem Auftreffpunkt, stufenlos, ueber die ganze Breite. Wer die Mitte
#  trifft, kommt in der Mitte heraus und hat nichts gewonnen; wer knapp am Rand auftrifft, kommt am
#  anderen Rand heraus. Das ist kein Zielen mehr, das ist Rechnen.
#
#  UND DIE BAUART IST EINE ANDERE. Die ersten neun Bahnen waren offene Saele mit je einer Maschine
#  darin, und der Bot lochte sie im Mittel mit ZWEI Schlaegen bei Par 5 - eine Legenden-Welt, die
#  leichter ist als der Lehrlingsgarten. Der Grund war immer derselbe: Neben der Maschine blieb
#  Platz, und wo Platz ist, geht der Ball vorbei. Jetzt ist jede Bahn eine Folge von KAMMERN, und
#  zwischen zwei Kammern gibt es genau EINEN Durchlass - und in dem steht die Maschine. Wer sie
#  nicht loest, kommt nicht weiter.
#
#  UND HIER KOMMT ALLES ZUSAMMEN. Alle vier Zauber-Maschinen, dazu die haertesten alten: der Blitz
#  und der Aufwind des Sturmhimmels, das wandernde Loch der Uhrwerkstadt, die Grubenlampe der
#  Zwergenmine. Die Gruft ist dunkel wie die Mine - und das ist die einzige Stelle im Zauberreich,
#  an der man sich merken muss, was man beim Hinweg gesehen hat.
# ===========================================================================
LOGE = welt('loge', 'ZAUBER_LOGE', 'Erzmagierloge')

# ---------------------------------------------------------------------------
# DIE ZWEITE FASSUNG DER LOGE. Die erste bestand aus neun offenen Sälen mit je zwei, drei
# Maschinen darin, und Fynn hat sie richtig beurteilt: „Macht die Bahnen bitte etwas schmaler und
# komplexer, die Erzmagierwelt ist schließlich eine Legendenwelt." Ein Saal von sechzehn Kacheln
# Höhe ist kein Weg, sondern ein Platz – man schlägt irgendwohin und kommt irgendwie an.
#
# Deshalb sind die Bahnen jetzt ANDERSHERUM gebaut: Die Karte ist leer, und hineingeschnitten
# werden nur die Gänge, drei Kacheln breit. Neben dem Weg ist nichts. Das macht zweierlei zugleich
# – die Strecke wird schmal, und sie wird lang, weil sie sich winden muß, statt quer über einen
# Platz zu laufen.
#
# UND DIE ZAUBERSPIEGEL SIND FORT. Sie standen auf sechs der neun Bahnen und waren die Maschine,
# die diese Welt erklären sollte; gefallen haben sie nicht („diese Teile finde ich unnötig,
# entferne sie"). An ihre Stelle treten zwei neue: die Bannschleuder – die Kanone der Loge, ein
# Ring aus Bannfeuer auf Marmor – und die Siegelröhre, die Leitung der Uhrwerkstadt in Marmor und
# Gold. Dazu die Zauberkreise, die bleiben durften und jetzt auf fast jeder Bahn stehen.
#
# EINE WIRKUNG FEHLT HIER: der Wirbelkreis. Er dreht die Laufrichtung, und in einem Gang von drei
# Kacheln Breite, neben dem die Leere liegt, heißt das: Ball weg. Das ist kein Rätsel, sondern ein
# Würfel. Er steht deshalb in der Sternenwarte, wo die Säle breit genug sind, um ihn auszuhalten.

# --- 1 ---------------------------------------------------------------------
# Vor der Loge. Der Aufgang: ein Z aus drei Gängen, und in jedem steht eine Sache. Wer die Loge
# betritt, soll einmal alles sehen, was ihn drinnen erwartet - aber jedes für sich.
f = leer(40, 17)
gang(f, 2, 8, 13, 10)                 # der erste Gang, nach rechts
gang(f, 11, 4, 13, 10)                # die Kehre nach oben
gang(f, 11, 4, 27, 6)                 # der zweite Gang
gang(f, 25, 4, 27, 14)                # die zweite Kehre, nach unten
gang(f, 25, 12, 38, 14)               # und der letzte Gang zum Loch
setz(f, 3, 9, 'T'); setz(f, 36, 13, 'H')
bahn(LOGE, 'Vor der Loge', 'erzmagierloge', f, [
    kreis(8.0, 9.5, 'schub', r=1.2),
    windrad(12.5, 9.0, blades=3, laenge=1.3, tempo=0.9, stil='bannzeiger'),
    blitz(19.0, 5.5, w=3.0, h=3.0, takt=4.4, stil='bannschlag'),
    kreis(26.5, 9.0, 'bremse', r=1.2, takt=4.0),
    lampe(31.0, 13.5, r=4.0, stil='bannlicht'),
], par=4,
intro='Der Aufgang zur Loge: drei Gänge, zwei Kehren, und neben dem Weg ist nichts. In jedem Gang '
      'steht eine Sache – erst der Schubkreis, dann der Zeiger, dann der Bann. Wer zu früh zu viel '
      'Tempo mitnimmt, findet die erste Kehre nicht mehr.')

# --- 2 ---------------------------------------------------------------------
# Der Bannlauf. Hier steht die Bannschleuder zum ersten Mal, und sie steht allein: Der Gang endet
# vor der Leere, hinüber führt nichts, und der Ring wirft genau so weit, wie er muß.
f = leer(42, 17)
gang(f, 2, 7, 15, 9)
gang(f, 13, 7, 15, 13)
gang(f, 13, 11, 22, 13)               # die Kammer der Schleuder endet hier
gang(f, 30, 11, 40, 13)               # drüben geht es weiter - dazwischen ist nichts
gang(f, 30, 3, 32, 13)
gang(f, 30, 3, 40, 5)
setz(f, 3, 8, 'T'); setz(f, 38, 4, 'H')
bahn(LOGE, 'Der Bannlauf', 'erzmagierloge', f, [
    kreis(8.5, 8.5, 'schub', r=1.2),
    kanone(20.0, 12.5, grad=0, weite=9.5, amp=0.0, stil='bannschleuder'),
    kreis(35.0, 12.5, 'bremse', r=1.2),
    windrad(31.5, 8.0, blades=3, laenge=1.3, tempo=-0.9, stil='bannzeiger'),
    lampe(36.0, 4.5, r=4.0, stil='bannlicht'),
], par=4,
intro='Der Gang endet vor der Leere. Hinüber kommt nur, wer sich in den Ring aus Bannfeuer rollen '
      'läßt – er wirft immer gleich weit, und die Punkte am Boden sagen vorher, wohin. Drüben '
      'bremst ein blauer Kreis, damit man in der Kehre nicht vorbeischießt.')

# --- 3 ---------------------------------------------------------------------
# Das Bannmal. Die einzige Bahn der Welt, auf der noch gesammelt wird - vier Sterne in vier
# Sackgassen, und das Siegel vor dem Loch geht erst auf, wenn alle brennen.
f = leer(40, 18)
gang(f, 2, 8, 34, 10)                 # der Hauptgang, schnurgerade
gang(f, 6, 3, 8, 10)                  # vier Stichgänge, abwechselnd nach oben und unten
gang(f, 13, 8, 15, 15)
gang(f, 21, 3, 23, 10)
gang(f, 28, 8, 30, 15)
gang(f, 32, 8, 38, 10)
setz(f, 3, 9, 'T'); setz(f, 36, 9, 'H')
bahn(LOGE, 'Das Bannmal', 'bannkreis', f, [
    sternbild([(7, 4), (14, 14), (22, 4), (29, 14)], (33, 8, 33, 11)),
    kreis(10.5, 9.5, 'sprung', r=1.2, weite=4.6),
    kreis(18.0, 9.5, 'bremse', r=1.2),
    kreis(25.5, 9.5, 'schub', r=1.2, takt=4.4),
    lampe(7.0, 4.5, r=3.6, stil='bannlicht'),
    lampe(29.0, 14.5, r=3.6, stil='bannlicht'),
], par=5, dunkel=0.5, lampe=3.2,
intro='Vier Sterne liegen in vier Sackgassen, und das Bannmal vor dem Loch geht erst auf, wenn '
      'alle brennen. In der Gruft sieht man nur, was im Licht steht. Im Hauptgang liegen drei '
      'Kreise – sie helfen beim Abbiegen und stehen im Weg beim Zurückkommen.')

# --- 4 ---------------------------------------------------------------------
# Der Rat der Neun. Die Hüte sind hier keine Abkürzung mehr, sondern der einzige Weg: Der Gang ist
# in drei Stücke zerschnitten, und dazwischen liegt die Leere.
f = leer(42, 17)
gang(f, 2, 7, 12, 9)
gang(f, 17, 3, 27, 5)                 # das zweite Stück liegt oben und hängt an nichts
gang(f, 17, 11, 27, 13)               # das dritte unten, ebenso
gang(f, 31, 7, 40, 9)                 # und das Ziel in der Mitte
gang(f, 31, 5, 33, 11)
setz(f, 3, 8, 'T'); setz(f, 38, 8, 'H')
bahn(LOGE, 'Der Rat der Neun', 'erzmagierloge', f, [
    huete([(10, 8), (19, 4), (19, 12), (32, 8)], takt=2.2),
    kreis(24.0, 4.5, 'bremse', r=1.2),
    kreis(24.0, 12.5, 'schub', r=1.2),
    mond(32.5, 8.5, r=2.8, kraft=7.5, takt=5.5, phase=0.1),
    lampe(36.0, 8.5, r=4.0, stil='bannlicht'),
], par=5,
intro='Vier Hüte, und zwischen ihnen ist nichts – kein Steg, keine Brücke. Wo man herauskommt, '
      'entscheidet der Takt, und die beiden Stücke in der Mitte sind verschieden: oben bremst es, '
      'unten schiebt es. Wer oben landet, hat Zeit; wer unten landet, muß sie sich nehmen.')

# --- 5 ---------------------------------------------------------------------
# Die Ranken der Gruft. Die dunkle Bahn der Welt. Zwei Ranken hintereinander, und der Gang dazwischen
# ist so schmal, daß man beim Warten nirgends hin kann.
f = leer(42, 16)
gang(f, 2, 7, 12, 9)
gang(f, 12, 7, 18, 9)                 # das Feld der ersten Ranke
gang(f, 18, 7, 24, 9)
gang(f, 24, 7, 30, 9)                 # das der zweiten
gang(f, 30, 7, 34, 9)
gang(f, 32, 3, 34, 9)
gang(f, 32, 3, 40, 5)
setz(f, 3, 8, 'T'); setz(f, 38, 4, 'H')
bahn(LOGE, 'Die Ranken der Gruft', 'bannkreis', f, [
    ranke(12, 7, 6, 3, 9.5, 8.5, dauer=4.2),
    ranke(24, 7, 6, 3, 20.5, 8.5, dauer=4.2),
    kreis(22.5, 8.5, 'bremse', r=1.2),
    kreis(37.0, 4.5, 'bremse', r=1.2, takt=4.4),
    lampe(9.5, 8.5, r=4.2, stil='bannlicht'),
    lampe(20.5, 8.5, r=4.2, stil='bannlicht'),
    lampe(37.0, 4.5, r=4.2, stil='bannlicht'),
], par=5, dunkel=0.5, lampe=3.2,
intro='Zwei Ranken hintereinander, und zwischen ihnen ein Stück Gang, auf dem ein Bremskreis '
      'liegt. Wer zu schnell über die erste kommt, steht beim Anstoßen der zweiten schon still – '
      'und in der Dunkelheit sieht man immer nur, was gerade im Licht liegt.')

# --- 6 ---------------------------------------------------------------------
# Der Blitzgang. Ein langer Gang unter drei Bännen hindurch, und danach die Röhre: Wer sie findet,
# spart sich den Rückweg um die ganze Halle.
f = leer(44, 17)
gang(f, 2, 7, 30, 9)                  # der Blitzgang selbst
gang(f, 28, 7, 30, 14)
gang(f, 16, 12, 30, 14)               # der Rückweg unten - lang und ohne alles
gang(f, 16, 3, 18, 14)
gang(f, 16, 3, 42, 5)                 # und oben entlang zum Loch
setz(f, 3, 8, 'T'); setz(f, 40, 4, 'H')
setz(f, 29, 13, 'A'); setz(f, 20, 4, 'a')   # die Röhre: unten geschluckt, oben ausgespien
bahn(LOGE, 'Der Blitzgang', 'erzmagierloge', f, [
    blitz(9.0, 8.5, w=3.0, h=3.0, takt=4.0, phase=0.0, stil='bannschlag'),
    blitz(16.0, 8.5, w=3.0, h=3.0, takt=4.0, phase=0.33, stil='bannschlag'),
    blitz(23.0, 8.5, w=3.0, h=3.0, takt=4.0, phase=0.66, stil='bannschlag'),
    rohr('A', grad=0),                # die Abkürzung: vom Ende des Blitzgangs nach oben
    kreis(35.0, 4.5, 'bremse', r=1.2),
    lampe(38.0, 4.5, r=4.0, stil='bannlicht'),
], par=5,
intro='Drei Bänne schlagen versetzt in denselben Gang – es gibt keinen Augenblick, in dem alle '
      'drei schweigen, also muß man zwischen ihnen durchwandern. Am Ende steht die Siegelröhre: '
      'Wer hineinrollt, kommt oben wieder heraus und spart den ganzen Rückweg.')

# --- 7 ---------------------------------------------------------------------
# Das Wanderloch. Das Loch bleibt nicht, wo es ist - und der Gang davor ist eine Schleife, auf der
# man immer nur eine der drei Stellen sieht.
f = leer(42, 18)
gang(f, 2, 8, 14, 10)
gang(f, 12, 3, 14, 10)
gang(f, 12, 3, 26, 5)
gang(f, 24, 3, 26, 15)
gang(f, 26, 13, 36, 15)
gang(f, 34, 3, 36, 15)                # der Schacht, in dem das Loch wandert
setz(f, 3, 9, 'T'); setz(f, 35, 4, 'H')
bahn(LOGE, 'Das Wanderloch', 'bannkreis', f, [
    wanderloch([(35.5, 4.5), (35.5, 9.5), (35.5, 14.5)], stil='siegelloch'),
    kreis(8.0, 9.5, 'sprung', r=1.2, weite=4.8),
    aufwind(24, 8, w=3, h=3, land=6.5, flug=7.5, stil='bannschacht'),
    windrad(30.0, 14.5, blades=3, laenge=1.3, tempo=0.9, stil='bannzeiger'),
    kreis(35.5, 11.0, 'bremse', r=1.2, takt=4.6),
], par=5,
intro='Das Loch wandert zwischen drei Stellen in einem schmalen Schacht, und man sieht immer nur '
      'die, vor der man steht. Der Bannschacht in der Mitte hebt einen über die Kehre hinweg – '
      'wenn man ihn trifft. Sonst geht es außen herum, und das dauert.')

# --- 8 ---------------------------------------------------------------------
# Die Siegelkammer. Zwei Röhren und eine Schleuder: Auf dieser Bahn gibt es keinen durchgehenden
# Weg zu Fuß, jedes Stück hängt am nächsten nur über eine Maschine.
f = leer(44, 18)
gang(f, 2, 8, 12, 10)                 # Abschlag, endet an der ersten Röhre
gang(f, 18, 3, 28, 5)                 # zweites Stück, oben
gang(f, 18, 12, 28, 14)               # drittes Stück, unten
gang(f, 34, 8, 42, 10)                # und das Ziel
gang(f, 34, 5, 36, 13)
setz(f, 3, 9, 'T'); setz(f, 40, 9, 'H')
# Die Rohrmünder liegen auf dem Boden: A schluckt am Ende des ersten Stücks, a spuckt oben aus.
setz(f, 11, 9, 'A'); setz(f, 19, 4, 'a')
setz(f, 27, 13, 'B'); setz(f, 35, 9, 'b')
bahn(LOGE, 'Die Siegelkammer', 'erzmagierloge', f, [
    rohr('A', grad=0),
    rohr('B', grad=0),
    kanone(26.0, 4.5, grad=90, weite=9.0, amp=0.0, stil='bannschleuder'),
    kreis(22.0, 13.5, 'bremse', r=1.2),
    kreis(38.0, 9.5, 'bann', r=1.2, takt=5.0),
    lampe(41.0, 9.5, r=3.8, stil='bannlicht'),
], par=5,
intro='Vier Stücke Gang, und keines hängt am anderen: Die erste Röhre bringt einen nach oben, die '
      'Schleuder von oben nach unten, die zweite Röhre ans Ziel. Wer eine davon verfehlt, liegt '
      'auf einem Stück, von dem aus es nur einen Weg gibt – zurück in dieselbe Maschine.')

# --- 9 ---------------------------------------------------------------------
# Der Erzmagier. Die letzte Bahn des Zauberreichs. Alles, was die Loge hat, hintereinander, jedes
# in seinem eigenen Gang - und zwischen den Gängen liegt die Leere.
f = leer(46, 19)
gang(f, 2, 9, 12, 11)                 # 1: der Anlauf
gang(f, 12, 9, 18, 11)                # 2: die Ranke
gang(f, 18, 9, 24, 11)
gang(f, 22, 4, 24, 11)                # 3: hinauf zu den Hüten
gang(f, 22, 4, 32, 6)
gang(f, 36, 4, 44, 6)                 # 4: drüben, nur über die Schleuder zu erreichen
gang(f, 36, 4, 38, 16)
gang(f, 30, 14, 38, 16)               # 5: hinunter und zurück zum Loch
setz(f, 3, 10, 'T'); setz(f, 32, 15, 'H')
bahn(LOGE, 'Der Erzmagier', 'erzmagierloge', f, [
    kreis(7.0, 10.5, 'schub', r=1.2),
    ranke(12, 9, 6, 3, 9.5, 10.5, dauer=4.2),
    huete([(20, 10), (23, 5), (30, 5)], takt=2.2),
    kanone(31.0, 5.5, grad=0, weite=9.5, amp=0.0, stil='bannschleuder'),
    mond(41.0, 5.5, r=2.8, kraft=7.5, takt=5.0, phase=0.2),
    blitz(37.5, 11.0, w=3.0, h=4.0, takt=4.2, stil='bannschlag'),
    kreis(34.0, 15.5, 'bremse', r=1.2),
    lampe(32.0, 15.5, r=4.0, stil='bannlicht'),
], par=6,
intro='Die Prüfung der Loge: Schubkreis, Ranke, Hüte, Schleuder, Mond, Bann – sechs Gänge '
      'hintereinander, und zwischen ihnen ist nichts. Jeder einzelne ist zu schaffen. Alle sechs '
      'in einem Anlauf ist das, was den Erzmagierhut kostet.')


# --- 10 --------------------------------------------------------------------
# DER ENDGEGNER DER LOGE: Der Bannwächter.
#
# Er ist der einzige Gegner im Spiel, der ZUSIEHT. Sein Arm dreht sich langsam dorthin, wo der Ball
# liegt; dann glüht das Siegel unter dem Arm auf, und wer im Keil steht, wenn es einschlägt, wird
# quer über den Saal geworfen.
#
# DER ARM SCHLEPPT ABSICHTLICH HINTERHER (folgen = 1,1 Bogenmaß je Sekunde). Ein Arm, der sofort
# auf den Ball zeigt, wäre nicht zu schlagen; so aber entsteht die Aufgabe daraus, sich zu bewegen,
# damit er hinter einem bleibt. Stehenbleiben ist die einzige Antwort, die immer falsch ist - und
# das ist etwas, das keine andere Maschine dieses Spiels verlangt.
#
# WÄHREND ER WARNT, STEHT DER ARM STILL. Sonst zöge die Warnung mit dem Ball mit und wäre keine
# Warnung, sondern eine Verfolgung.
f = leer(56, 21)
gang(f, 2, 9, 16, 11)                 # der Anmarsch, schmal wie der Rest der Loge
gang(f, 14, 4, 16, 11)
gang(f, 14, 4, 26, 6)
gang(f, 24, 4, 26, 16)
gang(f, 24, 14, 32, 16)
gang(f, 32, 2, 54, 19)                # und dann der Saal, in dem er steht
# DAS LOCH LIEGT HINTER IHM. In der ersten Fassung lag es gleich am Eingang des Saals, und der
# Wächter stand dahinter in der Ecke - man konnte einlochen, ohne ihm je zu begegnen. Ein
# Endgegner, an dem man vorbeikommt, ist keiner. Jetzt steht er genau dazwischen.
setz(f, 3, 10, 'T'); setz(f, 50, 10, 'H')
bahn(LOGE, 'Der Bannwächter', 'erzmagierloge', f, [
    kreis(7.0, 10.5, 'schub', r=1.2),
    blitz(20.0, 5.5, w=3.0, h=3.0, takt=4.2, stil='bannschlag'),
    kanone(28.0, 15.5, grad=0, weite=8.0, amp=0.0, stil='bannschleuder'),
    kreis(35.0, 15.0, 'schub', r=1.4),
    waechter(42.0, 10.5, r=2.2, weite=13.0, keil=0.40, takt=5.0, folgen=1.1, wucht=15),
    lampe(50.0, 10.5, r=4.2, stil='bannlicht'),
], par=6, maxStrokes=18,
intro='Am Ende der Loge steht er und sieht zu. Sein Arm dreht sich dorthin, wo der Ball liegt, '
      'dann glüht das Siegel unter ihm auf – und wer beim Einschlag im Keil steht, fliegt quer '
      'durch den Saal zurück. Der Arm ist langsamer als ein Ball. Das ist alles, was man braucht, '
      'und das einzige, worauf man sich verlassen kann.')

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
