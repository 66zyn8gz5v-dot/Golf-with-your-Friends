# -*- coding: utf-8 -*-
"""Baut src/courses_mine.js – die zehn Bahnen der Zwergenmine.

Warum ein Erzeuger und keine von Hand getippte Datei: Eine Karte ist ein Feld aus Zeichenketten,
und die häufigste Panne dabei ist eine Zeile, die ein Zeichen zu kurz ist. Hier wird jede Karte aus
einem Rechteck gebaut und danach geprüft – rechteckig, genau ein Abschlag, genau ein Loch, ein Weg
dazwischen (über alle Sohlen hinweg), und jedes Hindernis dort, wo es auch stehen kann.

DIE WELT IST EIN ABSTIEG, UND ZWAR WÖRTLICH
Die erste Fassung dieser Welt war flach – alle neun Bahnen auf einer Ebene. Ausgerechnet im
Bergwerk, wo der Abstieg von Sohle zu Sohle das Naheliegendste überhaupt ist. Jetzt haben vier
der zehn Bahnen zwei Sohlen: Man schlägt auf der oberen ab und kommt nach unten, indem man über
eine Kante rollt und fällt. Das kostet keinen Strafschlag – genau darum ist es hier das richtige
Mittel: In jeder anderen Welt braucht ein Stockwerkwechsel eine Maschine, die trägt (Aufzug,
Seilbahn, Turbine). Nach unten braucht man keine. Man lässt los.

Damit das geht, führt das Spiel seit Fassung 143 mit, auf welcher Ebene der Abschlag liegt
(level.js, 'teeEbene'). Vorher war es immer die unterste, und jede mehrstöckige Bahn ging darum
zwangsläufig nach oben.

Ein Kante, über die man fallen soll, muss in der Karte ein 'o' sein: An einem gewöhnlichen
Bodenrand baut das Spiel eine Bande, und die hielte den Ball auf.

DIE VIER ABSCHNITTE sind vier Paletten und zugleich der Weg nach unten:
    Bahn 1      'mundloch'  Tageslicht vor dem Berg, Halde und Förderturm
    Bahn 2-5    'stollen'   die Stollen, Grubenholz und Lampenschein
    Bahn 6-7    'kristall'  die Kristallkammern, der Fels wird violett
    Bahn 8-10   'schmelze'  die unterste Sohle, wo das Erz flüssig wird

DIE FRAGE DIESER WELT ist: *was liegt da vorn überhaupt?* Ab Bahn 2 liegt auf jeder Bahn ein
Schleier ('dunkel'), der sich nur um den Ball und um die Grubenlampen öffnet. Darum gilt hier eine
Regel, die es in keiner anderen Welt gibt: **Jede dunkle Bahn muss mit den Lampen allein lesbar
sein.** Der Erzeuger prüft das, so gut es sich prüfen lässt – jede dunkle Bahn braucht Lampen, und
kein Stück des Weges darf weiter als GANG_DUNKEL Felder von jedem Licht entfernt liegen.

DIE MASCHINEN DER WELT (src/obstacles_mine.js):
    'sprengladung'  wirft im Takt alles im Umkreis nach außen; die Lunte sagt es vorher an
    'bruchwand'     Fels, den eine Zündung in der Nähe wegsprengt – dann bleibt der Gang offen
    'kippbuehne'    Bohle über dem Schacht, die zu der Seite kippt, auf der der Ball liegt
    'grubenlampe'   leuchtet ein Stück Bahn aus – auf einer dunklen Bahn das Wertvollste
    'fass'          der Prellklotz der Welt: ein eisenbeschlagenes Fass, rund von allen Seiten
    'giessloeffel'  kippt im Takt Erz in eine Rinne; es erstarrt zu Boden, die Brücke wächst

    python3 tools/mine.py
"""
import io
import math
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

def kante(f, x0, y0, x1, y1):
    """Macht aus Boden eine offene Kante: Von hier fällt der Ball eine Sohle tiefer.

    Ohne das 'o' baut das Spiel am Rand einer Sohle eine Bande, und dann steht der Ball oben und
    kommt nie unten an. Das ist der einzige Weg nach unten in dieser Welt, also der wichtigste
    Handgriff in dieser Datei."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            if f[y][x] in '#sil':
                f[y][x] = 'o'

def txt(f):
    return [''.join(r) for r in f]

BAHNEN = []

def bahn(name, theme, karte, hindernisse=None, par=3, dunkel=None, lampe=3.0,
         intro=None, maxStrokes=None, oben=None):
    b = {'name': name, 'par': par, 'theme': theme, 'map': txt(karte),
         'obstacles': hindernisse or []}
    if oben is not None: b['ebenen'] = [txt(oben)]
    if dunkel: b['dunkel'] = dunkel; b['lampe'] = lampe
    if intro: b['intro'] = intro
    if maxStrokes: b['maxStrokes'] = maxStrokes
    BAHNEN.append(b)

def lampe_(x, y, r=3.6, ebene=0):
    o = {'type': 'grubenlampe', 'x': x, 'y': y, 'r': r}
    if ebene: o['ebene'] = ebene
    return o

def ladung(x, y, phase=0.0, weite=3.2, ebene=0):
    o = {'type': 'sprengladung', 'x': x, 'y': y, 'phase': phase, 'weite': weite}
    if ebene: o['ebene'] = ebene
    return o

def bohle(x, y, w, h, angle=0, ebene=0):
    o = {'type': 'kippbuehne', 'x': x, 'y': y, 'w': w, 'h': h, 'angle': angle}
    if ebene: o['ebene'] = ebene
    return o

def wand(x, y, w, h, ebene=0):
    """Bruchwand. x, y ist die Mitte – so, wie das Hindernis seine Kanten baut."""
    o = {'type': 'bruchwand', 'x': x, 'y': y, 'w': w, 'h': h}
    if ebene: o['ebene'] = ebene
    return o

def loeffel(x, y, rx, ry, laenge, dx=1, dy=0, takt=2.4, glut=1.0, kipp=0.8, phase=0.0, ebene=0):
    """Gießlöffel. x, y ist die Pfanne, (rx, ry) das erste Feld der Rinne."""
    o = {'type': 'giessloeffel', 'x': x, 'y': y, 'takt': takt, 'glut': glut, 'kipp': kipp, 'phase': phase,
         'rinne': {'x': rx, 'y': ry, 'len': laenge, 'dx': dx, 'dy': dy}}
    if ebene: o['ebene'] = ebene
    return o

def fontaene(x, y, r=0.8, takt=2.1, droht=0.5, oben=0.55, phase=0.0, hoehe=3.4, ebene=0):
    """Lavafontaene: ein Spalt, aus dem im Takt ein Strahl hochschiesst.

    Sie trifft auch einen fliegenden Ball - das ist der Unterschied zu jeder anderen Falle im
    Spiel und der Grund, warum man ueber sie nicht einfach hinwegspringen kann. Der Takt ist
    kurz: Wer wartet, bis Ruhe ist, wartet vergebens, denn die Ruhe dauert eine Sekunde.
    """
    o = {'type': 'lavafontaene', 'x': x, 'y': y, 'r': r, 'takt': takt, 'droht': droht,
         'oben': oben, 'phase': phase, 'hoehe': hoehe}
    if ebene: o['ebene'] = ebene
    return o

def rampe(x, y, w, h, angle=0, land=5.0, speed=5.0, minSpeed=2.5, ebene=0):
    """Sprungschanze. x, y ist die *Ecke* - so, wie das Hindernis selbst rechnet."""
    o = {'type': 'ramp', 'x': x, 'y': y, 'w': w, 'h': h, 'angle': angle,
         'minSpeed': minSpeed, 'speed': speed, 'land': land}
    if ebene: o['ebene'] = ebene
    return o

def fass(x, y, r=0.65, ebene=0):
    o = {'type': 'bumper', 'x': x, 'y': y, 'r': r, 'style': 'fass'}
    if ebene: o['ebene'] = ebene
    return o

def ofen(x, y, w=3.0, gap=0.95, speed=1.0, blades=4, axis='y', phase=0.0, ebene=0):
    """Schmelzofen: dieselbe Maschine wie die Windmuehle im Maerchenland, nur anders gezeichnet.

    Ein Bau quer ueber dem Weg, ein Maul in der Mitte, und im Takt faellt die eiserne Ofenklappe
    davor. Die Frage ist dieselbe wie bei der Muehle (*wann* gehe ich durch?), die Sprache ist die
    der Schmiede. Ein Windrad sechshundert Meter unter Tage waere Unsinn - und ein Schaufelrad vor
    dem Maul waere nur die Muehle in Eisen. Ein Ofen hat kein Rad, er hat eine Klappe.
    """
    o = {'type': 'windmill', 'x': x, 'y': y, 'w': w, 'gap': gap, 'speed': speed,
         'blades': blades, 'axis': axis, 'phase': phase, 'style': 'ofen',
         'len': 1.1, 'height': 1.8, 'depth': 1.3}
    if ebene: o['ebene'] = ebene
    return o

# ---------------------------------------------------------------------------
# 1 – Mundloch: vor dem Berg, bei Tageslicht. Hier wird nichts Neues verlangt;
#     die Bahn zeigt nur, wohin es gleich geht.
f = leer(30, 15)
fuell(f, 1, 2, 28, 12)
fuell(f, 6, 4, 10, 6, 's')            # Halde: Geröll bremst
fuell(f, 17, 9, 21, 11, 's')
fuell(f, 13, 2, 14, 5, 'x')           # Grubenholz, gestapelt
fuell(f, 13, 10, 14, 12, 'x')
setz(f, 2, 7, 'T'); setz(f, 26, 7, 'H')
bahn('Mundloch', 'mundloch', f, [
    fass(9.5, 9.5), fass(21.5, 4.5),
    lampe_(25.5, 10.5, 3.0),
], par=3,
intro='Vor dem Berg: Halde, Grubenholz, und hinten das Mundloch. Zwischen den Holzstapeln geht es '
      'hindurch – das Geröll bremst, wer zu weit ausholt. Ab hier wird es dunkel.')

# ---------------------------------------------------------------------------
# 2 – Erster Stollen: die Dunkelheit selbst ist die Aufgabe. Ein Knick, zwei
#     Kammern, und dazwischen nur das, was die Lampen hergeben.
f = leer(32, 14)
fuell(f, 1, 5, 13, 8)                 # der erste Gang
fuell(f, 10, 1, 15, 8)                # Kammer nach oben
fuell(f, 13, 1, 24, 4)                # Quergang oben
fuell(f, 21, 1, 24, 11)               # hinunter
fuell(f, 21, 8, 30, 11)               # letzter Gang zum Loch
setz(f, 2, 6, 'T'); setz(f, 28, 9, 'H')
bahn('Erster Stollen', 'stollen', f, [
    lampe_(12.5, 6.5, 3.8), lampe_(12.5, 2.5, 3.4),
    lampe_(22.5, 2.5, 3.8), lampe_(22.5, 9.5, 3.6),
    lampe_(27.5, 9.5, 3.2),
], par=3, dunkel=0.62,
intro='Unter Tage sieht man nur, was im Licht steht. Der Schleier öffnet sich um den Ball und um '
      'jede Grubenlampe – dazwischen muss man sich merken, was man beim Hinweg gesehen hat. Den '
      'Lampen nach, dann findet man auch das Loch.')

# ---------------------------------------------------------------------------
# 3 – Der Schacht: der Abstieg wird erklärt. Oben eine Strecke, an ihrem Ende
#     eine offene Kante; unten die Sohle mit dem Loch. Sonst nichts – wer zum
#     ersten Mal fällt, soll sehen, dass es nichts kostet.
u = leer(30, 16)                       # obere Sohle
fuell(u, 2, 6, 19, 9)
kante(u, 18, 6, 19, 9)                 # hier geht es hinunter
setz(u, 3, 7, 'T')
f = leer(30, 16)                       # untere Sohle
fuell(f, 14, 4, 27, 12)
setz(f, 24, 8, 'H')
bahn('Der Schacht', 'stollen', f, [
    lampe_(6.5, 7.5, 3.8, ebene=1), lampe_(13.5, 7.5, 4.0, ebene=1),
    lampe_(18.5, 7.5, 3.4, ebene=1),
    lampe_(17.5, 8.0, 4.0), lampe_(23.5, 8.0, 4.0), lampe_(26.5, 5.0, 3.2),
], par=3, dunkel=0.58, oben=u,
intro='Ab hier geht es nach unten. Die Strecke bricht vorn einfach ab – über die Kante rollen und '
      'fallen lassen, das ist der Weg. Es kostet keinen Schlag; im Berg ist nach unten die '
      'bequemste Richtung. Unten liegt die Sohle mit dem Loch.')

# ---------------------------------------------------------------------------
# 4 – Sprengfeld: zwei Ladungen im Weg, dazu offener Schacht rechts und links.
#     Jetzt kostet ein Fehlwurf etwas.
f = leer(34, 17)
fuell(f, 1, 6, 32, 10)                # der Hauptgang
fuell(f, 8, 2, 12, 14)                # zwei Quergänge
fuell(f, 20, 2, 24, 14)
setz(f, 3, 8, 'T'); setz(f, 30, 8, 'H')
bahn('Sprengfeld', 'stollen', f, [
    ladung(10.0, 8.0, 0.0, 3.4),
    ladung(22.0, 8.0, 0.45, 3.4),
    lampe_(5.5, 8.5, 3.4), lampe_(10.0, 8.0, 4.4),
    lampe_(16.0, 8.5, 3.6), lampe_(22.0, 8.0, 4.4),
    lampe_(28.5, 8.5, 3.4),
], par=4, dunkel=0.6, maxStrokes=14,
intro='Zwei Ladungen liegen mitten im Gang. Der rote Kreis ist ihre Reichweite, die brennende '
      'Lunte ihre Uhr: Wer im Kreis liegt, wenn sie durchgebrannt ist, fliegt nach außen – umso '
      'weiter, je näher er lag. Das ist keine Strafe. Wer sich richtig hinlegt, lässt sich tragen. '
      'Rechts und links steht allerdings nichts mehr.')

# ---------------------------------------------------------------------------
# 5 – Die Bruchwand: die neue Maschine, und nichts sonst. Der Gang ist zu, die
#     Ladung liegt daneben, die Lunte brennt. Man muss nichts können – man muss
#     warten. Danach steht der Berg offen.
f = leer(34, 15)
fuell(f, 1, 5, 32, 9)
fuell(f, 12, 2, 16, 12)               # die Kammer mit der Wand
setz(f, 3, 7, 'T'); setz(f, 30, 7, 'H')
bahn('Die Bruchwand', 'stollen', f, [
    wand(17.0, 7.0, 1.6, 5.0),        # quer im Gang – ohne Sprengung kommt hier niemand durch
    ladung(14.0, 11.0, 0.0, 3.0),
    fass(8.0, 7.0, 0.6),
    lampe_(6.0, 7.5, 3.6), lampe_(13.5, 7.5, 4.2), lampe_(14.0, 11.0, 3.4),
    lampe_(21.0, 7.5, 4.0), lampe_(28.0, 7.5, 3.6),
], par=4, dunkel=0.58, maxStrokes=14,
intro='Vorn steht der Berg. Der Pfeiler mit dem Bohrloch und dem Kreidekreuz ist stehengebliebener '
      'Fels – dagegen hilft kein Schlag. Daneben liegt eine Ladung, und wenn die zündet, ist der '
      'Pfeiler weg. Für den Rest der Bahn. Hier muss man nicht treffen, sondern abwarten.')

# ---------------------------------------------------------------------------
# 6 – Kippbohle: über den Schacht führt eine Bohle. Sie kippt zu der Seite, auf
#     der der Ball liegt – also nicht zaghaft.
f = leer(32, 15)
fuell(f, 1, 5, 30, 9)
fuell(f, 11, 5, 19, 9, '.')           # der Schacht, über den die Bohle führt
fuell(f, 11, 6, 19, 8)                # die Bohle liegt auf dieser Zunge
fuell(f, 2, 2, 8, 12)                 # Startkammer
fuell(f, 23, 2, 30, 12)               # Zielkammer
setz(f, 4, 7, 'T'); setz(f, 27, 7, 'H')
bahn('Kippbohle', 'stollen', f, [
    bohle(11.0, 6.0, 8.0, 2.0),
    lampe_(6.0, 7.5, 4.0), lampe_(11.0, 7.5, 3.8), lampe_(15.0, 7.5, 4.0),
    lampe_(19.0, 7.5, 3.8), lampe_(26.0, 7.5, 4.0),
], par=3, dunkel=0.6,
intro='Über den Schacht führt eine Bohle, die auf einer Achse ruht. Sie kippt zu der Seite, auf '
      'der der Ball liegt: Wer über die Mitte kommt, wird hinübergeworfen – wer davor '
      'liegenbleibt, rutscht zurück. Also nicht zaghaft.')

# ---------------------------------------------------------------------------
# 7 – Lorensohle: oben fahren die Hunte, unten liegt das Loch. Man muss an den
#     Loren vorbei bis zur Kante – und dann fallen.
u = leer(36, 16)
fuell(u, 2, 5, 26, 10)
fuell(u, 11, 2, 13, 13)               # Schienenschlitze quer durch die Strecke
fuell(u, 19, 2, 21, 13)
kante(u, 25, 5, 26, 10)
setz(u, 4, 7, 'T')
f = leer(36, 16)
fuell(f, 20, 3, 34, 13)
fuell(f, 24, 6, 29, 10, 's')          # Geröllhalde in der Mitte der unteren Sohle
setz(f, 32, 8, 'H')
bahn('Lorensohle', 'stollen', f, [
    {'type': 'rail', 'x0': 12.0, 'y0': 2.4, 'x1': 12.0, 'y1': 13.6, 'ebene': 1},
    {'type': 'mover', 'style': 'cart', 'x0': 12.0, 'y0': 3.0, 'x1': 12.0, 'y1': 13.0,
     'period': 4.2, 'r': 0.62, 'ebene': 1},
    {'type': 'rail', 'x0': 20.0, 'y0': 2.4, 'x1': 20.0, 'y1': 13.6, 'ebene': 1},
    {'type': 'mover', 'style': 'cart', 'x0': 20.0, 'y0': 13.0, 'x1': 20.0, 'y1': 3.0,
     'period': 3.4, 'r': 0.62, 'ebene': 1},
    lampe_(7.0, 7.5, 3.8, ebene=1), lampe_(12.0, 7.5, 4.2, ebene=1),
    lampe_(16.0, 7.5, 3.8, ebene=1), lampe_(20.0, 7.5, 4.2, ebene=1),
    lampe_(25.0, 7.5, 3.6, ebene=1),
    lampe_(24.0, 8.0, 4.2), lampe_(31.0, 8.0, 4.0), lampe_(30.0, 4.5, 3.4),
], par=4, dunkel=0.62, maxStrokes=14, oben=u,
intro='Auf dieser Strecke fahren die Hunte. Zwei Loren queren sie im eigenen Takt – man wartet '
      'sie ab oder schlägt zwischen ihnen hindurch. Ganz vorn bricht die Strecke ab, und darunter '
      'liegt die Sohle mit dem Loch.')

# ---------------------------------------------------------------------------
# 8 – Kristallkammer: der Fels leuchtet selbst. Oben die Galerie mit dem
#     Magnetit, unten die Kammer – und davor eine Bruchwand.
u = leer(34, 18)
fuell(u, 2, 7, 15, 11)
scheibe(u, 9, 9, 7.0, 4.6)
kante(u, 14, 7, 15, 11)
setz(u, 4, 9, 'T')
f = leer(34, 18)
scheibe(f, 22, 9, 10.0, 7.0)
fuell(f, 12, 7, 20, 11)
setz(f, 28, 9, 'H')
bahn('Kristallkammer', 'kristall', f, [
    {'type': 'magnet', 'x': 9.0, 'y': 9.0, 'r': 3.2, 'core': 0.4, 'push': True, 'ebene': 1},
    {'type': 'bumper', 'x': 6.0, 'y': 6.0, 'r': 0.7, 'style': 'crystal', 'ebene': 1},
    {'type': 'bumper', 'x': 6.0, 'y': 12.0, 'r': 0.7, 'style': 'crystal', 'ebene': 1},
    wand(19.0, 9.0, 1.6, 4.4),
    ladung(16.5, 12.0, 0.2, 3.0),
    {'type': 'bumper', 'x': 25.0, 'y': 5.5, 'r': 0.8, 'style': 'crystal'},
    {'type': 'bumper', 'x': 25.0, 'y': 12.5, 'r': 0.8, 'style': 'crystal'},
    lampe_(6.0, 9.5, 4.0, ebene=1), lampe_(11.0, 9.5, 4.2, ebene=1),
    lampe_(14.5, 9.5, 3.4, ebene=1),
    lampe_(15.0, 9.5, 4.2), lampe_(16.5, 12.0, 3.4), lampe_(22.0, 9.5, 4.4),
    lampe_(27.0, 9.5, 4.0),
], par=4, dunkel=0.5, maxStrokes=14, oben=u,
intro='Die Kammer ist ausgesprengt, nicht gemauert. Oben auf der Galerie sitzt ein Magnetit, der '
      'den Ball von sich wegdrückt, und die Kristalle werfen ihn zurück – wer geradeaus zielt, '
      'kommt nie an. Unten versperrt ein Felspfeiler den Weg in die große Kammer; die Ladung '
      'daneben macht ihn auf.')

# ---------------------------------------------------------------------------
# 9 – Sohle Neun: hier steht die Glut in den Spalten. Der Abstieg führt mitten
#     hinein, und der Weg unten ist schmal.
u = leer(36, 16)
fuell(u, 2, 6, 14, 10)
fuell(u, 8, 3, 12, 13)
kante(u, 13, 6, 14, 10)               # die Kante endet vor der Glut, nicht darüber
setz(u, 4, 8, 'T')
f = leer(36, 16)
fuell(f, 12, 2, 34, 13)
fuell(f, 16, 2, 20, 13, 'l')          # zwei Lavaspalten quer durch die Sohle
fuell(f, 26, 2, 29, 13, 'l')
fuell(f, 16, 7, 20, 8)                # der Steg über den ersten Spalt
fuell(f, 26, 7, 29, 8)                # über den zweiten führt die Bohle
setz(f, 32, 7, 'H')
# Par 5 und nicht 4: Die Botprüfung braucht hier im Schnitt 5,8 Schläge, auf jeder anderen
# Bahn der Welt liegt das Par über dem Schnitt. Zwei Lavaspalten kosten eben mehr.
bahn('Sohle Neun', 'schmelze', f, [
    bohle(26.0, 7.0, 4.0, 2.0),
    ladung(22.5, 11.0, 0.3, 3.2),
    lampe_(6.0, 8.5, 3.8, ebene=1), lampe_(11.0, 8.5, 4.2, ebene=1),
    lampe_(13.5, 8.5, 3.4, ebene=1),
    lampe_(14.5, 7.5, 4.0), lampe_(18.0, 7.5, 3.6), lampe_(23.0, 7.5, 4.2),
    lampe_(27.5, 7.5, 3.6), lampe_(32.0, 7.5, 3.8),
], par=5, dunkel=0.48, maxStrokes=16, oben=u,
intro='Die unterste Sohle: In den Spalten steht die Glut. Über den ersten Spalt führt ein schmaler '
      'Steg, über den zweiten eine Bohle – und die Ladung dazwischen kann beides sein, Gefahr oder '
      'Abkürzung.')

# ---------------------------------------------------------------------------
# 10 – Die Gießhalle: Hier wird der Weg gebaut, während man davorsteht. Quer durch
#      die Halle steht die Glut; hinüber führt nichts. Am Rand hängt der Gießlöffel.
f = leer(34, 15)
fuell(f, 1, 2, 32, 12)
fuell(f, 14, 2, 18, 12, 'l')          # die Glutspalte quer durch die Halle
setz(f, 3, 7, 'T'); setz(f, 30, 7, 'H')
bahn('Die Gießhalle', 'schmelze', f, [
    # Die Rinne läuft auf Reihe 7 quer über die Spalte – fünf Felder, fünf Güsse
    loeffel(13.0, 7.5, 14, 7, 5, takt=2.2, glut=0.9, kipp=0.7),
    fass(8.0, 4.0, 0.7), fass(8.0, 11.0, 0.7),
    fass(25.0, 4.0, 0.7), fass(25.0, 11.0, 0.7),
    lampe_(4.0, 7.5, 3.8), lampe_(9.5, 7.5, 4.0), lampe_(13.0, 7.5, 4.4),
    lampe_(20.5, 7.5, 4.2), lampe_(26.0, 7.5, 4.0), lampe_(30.5, 7.5, 3.8),
], par=4, dunkel=0.45, maxStrokes=16,
intro='Quer durch die Halle steht die Glut, und hinüber führt nichts. Am Rand hängt der '
      'Gießlöffel: Jedes Mal, wenn er kippt, läuft das Erz ein Feld weiter und erstarrt – so baut '
      'sich die Brücke selbst. Nur läuft jeder neue Guss über das schon Erstarrte hinweg. Warten, '
      'bis es kalt ist, und dann hinüber.')

# ---------------------------------------------------------------------------
# 11 – Die zerbrochene Brücke: In der Mitte fehlt ein Stück, und genau dort steht
#      die Spalte. Man muss springen – und der Sprung muss in die Lücke zwischen
#      zwei Stössen passen.
f = leer(36, 15)
fuell(f, 1, 2, 34, 12, 'l')           # der ganze Grund ist flüssiges Erz
fuell(f, 1, 5, 9, 9)                  # der Absatz mit dem Abschlag
fuell(f, 9, 6, 16, 8)                 # die Brücke bis zum Bruch
fuell(f, 20, 6, 27, 8)                # und weiter hinter dem Bruch
fuell(f, 27, 4, 33, 10)               # der Absatz mit dem Loch
setz(f, 4, 7, 'T'); setz(f, 31, 7, 'H')
bahn('Die zerbrochene Brücke', 'schmelze', f, [
    # Die Fontäne steht mitten im Bruch. Sie ist die einzige Falle im Spiel, die einen fliegenden
    # Ball holt - ohne das wäre der Sprung immer sicher und die Bahn eine Formalität.
    fontaene(18.0, 7.5, r=1.1, takt=2.1, hoehe=4.2),
    # Die Rampe steht drei Felder vor dem Bruch: genug Anlauf, um sie zu treffen, zu wenig, um
    # den Stoss abzuwarten, nachdem man geschlagen hat.
    rampe(13.0, 6.0, 2.0, 3.0, angle=0, land=5.2, speed=5.0),
    # Zwei weitere auf den Stegen - damit die Fontäne nicht nur im Flug zählt, sondern auch beim
    # Rollen. Versetzt im Takt, sonst stünden alle drei gleichzeitig oben.
    fontaene(11.5, 7.5, r=0.7, phase=0.33),
    fontaene(24.0, 7.5, r=0.7, phase=0.66),
    fass(5.5, 5.5, 0.6), fass(5.5, 8.5, 0.6),
    lampe_(4.0, 7.5, 3.8), lampe_(10.0, 7.5, 3.6), lampe_(14.5, 7.5, 4.0),
    lampe_(21.5, 7.5, 3.8), lampe_(26.5, 7.5, 3.8), lampe_(31.0, 7.5, 4.0),
], par=4, dunkel=0.45, maxStrokes=16,
intro='Über den See führte einmal eine Brücke; in der Mitte fehlt ein Stück. Genau dort steht eine '
      'Spalte, aus der im Takt die Lava hochschiesst – und die erwischt den Ball auch in der Luft. '
      'Die Rampe bringt hinüber, aber nur, wenn der Strahl gerade unten ist. Warten hilft nicht: '
      'Die Ruhe dauert eine Sekunde.')

# ---------------------------------------------------------------------------
# 12 – Die Schmelze: das Ende. Alles, was die Welt hat, auf einmal.
f = leer(38, 18)
fuell(f, 1, 2, 36, 15)
scheibe(f, 19, 8, 12.0, 6.0, 'l')     # der See aus flüssigem Erz
fuell(f, 8, 7, 30, 9)                 # der Damm quer hindurch
scheibe(f, 30, 8, 4.4, 3.4)           # die Insel mit dem Loch
setz(f, 3, 8, 'T'); setz(f, 31, 8, 'H')
bahn('Die Schmelze', 'schmelze', f, [
    wand(13.0, 8.5, 1.4, 3.0),        # der Damm ist zu – erst sprengen
    ladung(10.5, 8.5, 0.0, 3.2),      # die Ladung liegt auf dem Damm davor
    # Der Schmelzofen steht quer auf dem Damm: Sein Maul ist die einzige Luecke, und das
    # Geblaeserad davor macht sie im Takt zu. Er steht mit Absicht zwischen den beiden Ladungen -
    # so folgt auf die Frage *wann kommt der Knall* die Frage *wann steht die Schaufel oben*.
    ofen(18.0, 8.5),
    ladung(23.0, 8.5, 0.5, 3.4),      # und eine mitten auf dem Damm
    fass(5.0, 5.0, 0.7), fass(5.0, 11.0, 0.7),
    lampe_(4.5, 8.5, 3.8), lampe_(10.5, 8.5, 4.2), lampe_(16.0, 8.5, 4.0),
    lampe_(23.0, 8.5, 4.4), lampe_(29.5, 8.5, 4.2),
], par=5, dunkel=0.45, maxStrokes=18,
intro='Ganz unten steht das Erz flüssig. Mitten im See liegt die Insel mit dem Loch, und nur ein '
      'schmaler Damm führt hinüber – am Anfang zugemauert, in der Mitte bewacht von einer Ladung, '
      'die im Takt alles hinunterfegt. Wer den Augenblick nach dem Knall erwischt, hat freie Bahn.')

# ---------------------------------------------------------------------------- Prüfen
FEST = set('#THsio')             # begehbar und nicht tödlich ('o' ist Boden mit offener Kante)
BODEN = set('#THswlio')          # alles, was Boden ist (Wasser und Lava eingeschlossen)

def sohlen(b):
    """Alle Sohlen einer Bahn, von unten nach oben – Ebene 0 ist b['map']."""
    return [b['map']] + [e for e in b.get('ebenen', [])]

def pruefe(b):
    s = sohlen(b)
    breit, hoch = len(s[0][0]), len(s[0])
    for e, m in enumerate(s):
        assert len(m) == hoch and all(len(r) == breit for r in m), \
            f"{b['name']}: Sohle {e} hat ein anderes Maß als Sohle 0"

    start = ziel = None
    for e, m in enumerate(s):
        for y, r in enumerate(m):
            for x, c in enumerate(r):
                if c == 'T':
                    assert start is None, f"{b['name']}: mehr als ein Abschlag"
                    start = (x, y, e)
                if c == 'H':
                    assert ziel is None, f"{b['name']}: mehr als ein Loch"
                    ziel = (x, y, e)
    assert start and ziel, f"{b['name']}: Abschlag oder Loch fehlt"

    """Was der Gießlöffel füllt, zählt als Weg: In der Karte steht dort Glut, im Spiel wird daraus
       Boden, sobald das Erz erstarrt ist. Ohne das hielte die Prüfung jede Gießhalle für
       unpassierbar – und mit einer Ausnahme von Hand wäre sie es womöglich wirklich."""
    rinnen = set()
    for o in b.get('obstacles', []):
        if o.get('type') != 'giessloeffel': continue
        r, e = o['rinne'], o.get('ebene', 0)
        for i in range(r['len']):
            rinnen.add((r['x'] + r.get('dx', 0) * i, r['y'] + r.get('dy', 0) * i, e))

    fest = lambda x, y, e: 0 <= x < breit and 0 <= y < hoch and \
        (s[e][y][x] in FEST or (x, y, e) in rinnen)

    """Eine Rampe überbrückt eine Lücke: Der Ball fliegt über sie hinweg und setzt 'land' Felder
       hinter der Rampenkante wieder auf. Ohne diese Ausnahme hielte die Prüfung jede zerbrochene
       Brücke für unpassierbar – dabei ist der Sprung ja gerade der Weg. Gerechnet wird mit
       denselben Zahlen wie im Spiel (obstacles.js, Ramp.launch): halbe Rampenlänge bis zur Kante,
       dann 'land'."""
    spruenge = []
    for o in b.get('obstacles', []):
        if o.get('type') != 'ramp': continue
        e = o.get('ebene', 0)
        a = math.radians(o.get('angle', 90))
        dx, dy = math.cos(a), math.sin(a)
        halb = o['w'] / 2 if abs(dx) > 0.5 else o['h'] / 2
        mx, my = o['x'] + o['w'] / 2, o['y'] + o['h'] / 2
        lx = mx + dx * (halb + o.get('land', 1.7))
        ly = my + dy * (halb + o.get('land', 1.7))
        spruenge.append((o['x'], o['y'], o['x'] + o['w'], o['y'] + o['h'], e, int(lx), int(ly)))

    """Der Weg – über alle Sohlen hinweg. Innerhalb einer Sohle rollt der Ball; von einer Sohle
       auf die nächste kommt er nur, indem er über eine offene Kante ('o') hinausrollt und fällt.
       Nach oben geht es in dieser Welt nicht, und das ist Absicht: Nach unten braucht man keine
       Maschine, nach oben schon."""
    gesehen = {start}
    q = deque([start])
    weg = {start: 0}
    while q:
        x, y, e = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nx, ny = x + dx, y + dy
            if fest(nx, ny, e):
                n = (nx, ny, e)
            elif s[e][y][x] == 'o' and e > 0 and fest(nx, ny, e - 1):
                n = (nx, ny, e - 1)            # über die Kante und eine Sohle tiefer
            else:
                continue
            if n in gesehen: continue
            gesehen.add(n); weg[n] = weg[(x, y, e)] + 1; q.append(n)
        # und von jeder Rampe aus dorthin, wo der Sprung aufsetzt
        for rx0, ry0, rx1, ry1, re, lx, ly in spruenge:
            if e != re or not (rx0 <= x <= rx1 and ry0 <= y <= ry1): continue
            if not fest(lx, ly, e): continue
            n = (lx, ly, e)
            if n in gesehen: continue
            gesehen.add(n); weg[n] = weg[(x, y, e)] + 1; q.append(n)
    assert ziel in gesehen, f"{b['name']}: kein Weg vom Abschlag zum Loch"

    """Der Gießlöffel: Die Rinne muss in der Karte wirklich Glut sein – gösse er über Boden, wäre
       er ein Blitz, der nichts baut. Und die Pfanne muss am ersten Feld stehen, sonst gösse sie
       sichtbar daneben."""
    for o in b.get('obstacles', []):
        if o.get('type') != 'giessloeffel': continue
        r, e = o['rinne'], o.get('ebene', 0)
        assert r['len'] >= 2, f"{b['name']}: eine Rinne aus einem Feld ist keine Brücke"
        for i in range(r['len']):
            x, y = r['x'] + r.get('dx', 0) * i, r['y'] + r.get('dy', 0) * i
            assert 0 <= x < breit and 0 <= y < hoch, f"{b['name']}: die Rinne läuft aus der Karte"
            assert s[e][y][x] == 'l', \
                f"{b['name']}: die Rinne steht bei ({x},{y}) nicht auf Glut, sondern auf '{s[e][y][x]}'"
        nah = abs(o['x'] - (r['x'] + 0.5)) + abs(o['y'] - (r['y'] + 0.5))
        assert nah <= 2.5, f"{b['name']}: der Gießlöffel steht {nah:.1f} Felder vom Rinnenanfang weg"
        # Und beide Enden der Rinne müssen an Boden stoßen – sonst brückt sie ins Nichts
        for ende, dx, dy in ((0, -r.get('dx', 0), -r.get('dy', 0)),
                             (r['len'] - 1, r.get('dx', 0), r.get('dy', 0))):
            x, y = r['x'] + r.get('dx', 0) * ende + dx, r['y'] + r.get('dy', 0) * ende + dy
            assert 0 <= x < breit and 0 <= y < hoch and s[e][y][x] in FEST, \
                f"{b['name']}: die Rinne stößt bei ({x},{y}) nicht auf festen Boden"

    """Und jede Rampe muss auf festem Boden aufsetzen. Eine Schanze, die in die Glut wirft, ist
       keine Aufgabe, sondern ein Fehler – und sie fiele beim Spielen erst auf, wenn es zu spät
       ist."""
    for rx0, ry0, rx1, ry1, re, lx, ly in spruenge:
        assert fest(lx, ly, re), \
            f"{b['name']}: die Rampe bei ({rx0},{ry0}) setzt bei ({lx},{ly}) nicht auf festem Boden auf"

    """Die Lavafontäne muss auf der Bahn stehen und darf weder den Abschlag noch das Loch
       bestreichen: Ein Ball, der schon beim Hinlegen verbrennt, ist keine Aufgabe."""
    for o in b.get('obstacles', []):
        if o.get('type') != 'lavafontaene': continue
        e, rr = o.get('ebene', 0), o.get('r', 0.8)
        for (px, py, pe), was in ((start, 'Abschlag'), (ziel, 'Loch')):
            if pe != e: continue
            d = math.hypot(o['x'] - (px + 0.5), o['y'] - (py + 0.5))
            assert d > rr + 1.0, \
                f"{b['name']}: eine Lavafontäne steht {d:.1f} Felder vom {was} entfernt"

    # Jede offene Kante muss auch irgendwo hinführen – sonst ist sie nur ein Loch ins Aus
    for e in range(1, len(s)):
        for y in range(hoch):
            for x in range(breit):
                if s[e][y][x] != 'o': continue
                assert any(fest(x + dx, y + dy, e - 1) for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1))) \
                    or fest(x, y, e - 1), \
                    f"{b['name']}: offene Kante bei ({x},{y}) auf Sohle {e}, aber darunter ist nichts"

    def ebene(o):
        return o.get('ebene', 0)

    # Jedes Hindernis muss auf der Karte liegen
    for o in b['obstacles']:
        assert ebene(o) < len(s), f"{b['name']}: {o['type']} steht auf Sohle {ebene(o)}, die es nicht gibt"
        for kx, ky in (('x', 'y'), ('x0', 'y0'), ('x1', 'y1')):
            if kx in o and ky in o:
                assert 0 <= o[kx] <= breit and 0 <= o[ky] <= hoch, \
                    f"{b['name']}: {o['type']} liegt bei ({o[kx]},{o[ky]}) außerhalb der Karte"

    # Die Bohle muss auf festem Grund liegen – eine Kippbühne über dem Nichts trüge nichts
    for o in b['obstacles']:
        if o['type'] != 'kippbuehne': continue
        m = s[ebene(o)]
        for y in range(int(o['y']), int(o['y'] + o['h'])):
            for x in range(int(o['x']), int(o['x'] + o['w'])):
                assert m[y][x] in FEST, \
                    f"{b['name']}: Kippbühne liegt bei ({x},{y}) über '{m[y][x]}'"

    """Die Bruchwand braucht eine Ladung in Reichweite – sonst geht sie nie auf, und die Bahn ist
       nicht zu spielen. Das ist die eine Panne, die man beim Bauen nicht sieht: Die Wand steht da
       und sieht richtig aus, nur zündet nichts in ihrer Nähe."""
    for o in b['obstacles']:
        if o['type'] != 'bruchwand': continue
        reich = o.get('weite', 3.6)
        m = s[ebene(o)]
        for y in range(int(o['y'] - o['h'] / 2), int(o['y'] + o['h'] / 2)):
            for x in range(int(o['x'] - o['w'] / 2), int(o['x'] + o['w'] / 2)):
                assert 0 <= x < breit and 0 <= y < hoch and m[y][x] in FEST, \
                    f"{b['name']}: Bruchwand steht bei ({x},{y}) nicht auf Bahn"
        nah = []
        for p in b['obstacles']:
            if p['type'] != 'sprengladung' or ebene(p) != ebene(o): continue
            nx = max(o['x'] - o['w'] / 2, min(p['x'], o['x'] + o['w'] / 2))
            ny = max(o['y'] - o['h'] / 2, min(p['y'], o['y'] + o['h'] / 2))
            nah.append(((p['x'] - nx) ** 2 + (p['y'] - ny) ** 2) ** 0.5)
        assert nah, f"{b['name']}: Bruchwand bei ({o['x']},{o['y']}) ohne jede Sprengladung"
        assert min(nah) <= reich, \
            f"{b['name']}: nächste Ladung ist {min(nah):.1f} von der Bruchwand entfernt, sie reicht {reich}"

    # Die Ladung darf nicht auf dem Abschlag selbst liegen
    for o in b['obstacles']:
        if o['type'] != 'sprengladung' or ebene(o) != start[2]: continue
        d = ((o['x'] - start[0] - 0.5) ** 2 + (o['y'] - start[1] - 0.5) ** 2) ** 0.5
        assert d > o['weite'] * 0.6, f"{b['name']}: Sprengladung zu dicht am Abschlag ({d:.1f})"

    # Dunkle Bahnen brauchen Licht, und zwar auf dem ganzen Weg – je Sohle
    lampen = [(o['x'], o['y'], o['r'], ebene(o)) for o in b['obstacles'] if o['type'] == 'grubenlampe']
    dunkelste = 0
    if b.get('dunkel'):
        assert lampen, f"{b['name']}: dunkel, aber keine einzige Grubenlampe"
        for (x, y, e) in gesehen:
            if s[e][y][x] not in FEST: continue
            hier = [(((x + 0.5 - lx) ** 2 + (y + 0.5 - ly) ** 2) ** 0.5 - lr)
                    for lx, ly, lr, le in lampen if le == e]
            assert hier, f"{b['name']}: Sohle {e} liegt im Weg, hat aber keine Lampe"
            dunkelste = max(dunkelste, min(hier))
        assert dunkelste <= GANG_DUNKEL, \
            f"{b['name']}: ein Stück Weg liegt {dunkelste:.1f} Felder von jedem Licht entfernt"

    felder = sum(1 for m in s for r in m for c in r if c in FEST)
    gefahr = sum(1 for m in s for r in m for c in r if c in 'lw')
    return dict(breit=breit, hoch=hoch, sohlen=len(s), felder=felder, gefahr=gefahr,
                lampen=len(lampen), schritte=weg[ziel], dunkelste=dunkelste)

for b in BAHNEN:
    z = pruefe(b)
    print(f"  {b['name']:<17} {z['breit']:>2}x{z['hoch']:<2} {b['theme']:<9} Par {b['par']} · "
          f"{z['sohlen']} Sohle{'n' if z['sohlen'] > 1 else ' '} · {z['felder']:>3} Felder · "
          f"{z['gefahr']:>3} Glut · Weg {z['schritte']:>2} · {z['lampen']} Lampen · "
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
    ebenen = ''
    if 'ebenen' in b:
        blocks = []
        for e in b['ebenen']:
            zeilen = ',\n        '.join(f"'{r}'" for r in e)
            blocks.append(f"[\n        {zeilen},\n      ]")
        ebenen = ',\n    ebenen: [\n      ' + ',\n      '.join(blocks) + ',\n    ]'
    hind = ''
    if b['obstacles']:
        zeilen = ',\n      '.join('{ ' + ', '.join(f'{k}: {wert(v)}' for k, v in o.items()) + ' }'
                                  for o in b['obstacles'])
        hind = f",\n    obstacles: [\n      {zeilen},\n    ]"
    return f"  {{\n{kopf}    map: [\n      {karte},\n    ]{ebenen}{hind},\n  }}"

kopf = """/* Die Zwergenmine (Weltkennung 'mine'): zehn Bahnen, ein Abstieg unter den Berg.
   Erzeugt von tools/mine.py – dort steht auch, warum sie so aussehen, wie sie aussehen.

   DER ABSTIEG IST WÖRTLICH GEMEINT. Vier der zehn Bahnen haben zwei Sohlen: Man schlägt auf der
   oberen ab und kommt nach unten, indem man über eine Kante rollt und fällt. Das kostet keinen
   Strafschlag, und genau darum ist es hier das richtige Mittel – in jeder anderen Welt braucht ein
   Stockwerkwechsel eine Maschine, die trägt. Nach unten braucht man keine. Ein 'o' in der Karte
   ist so eine offene Kante; an einem gewöhnlichen Bodenrand stünde eine Bande.

   Der rote Faden bleibt die Dunkelheit. Jede andere Welt fragt, wie fest, wann oder wohin man
   schlägt; diese fragt, *was da vorn überhaupt liegt*. Ab Bahn 2 trägt jede Bahn einen Schleier
   ('dunkel'), der sich nur um den Ball und um die Grubenlampen öffnet. Die Lampen sind darum kein
   Schmuck, sondern das Wertvollste auf der Bahn – und jede dunkle Bahn ist so gebaut, dass der Weg
   mit ihnen allein lesbar bleibt (tools/mine.py prüft das, Sohle für Sohle).

   Die vier Abschnitte sind vier Paletten und zugleich der Weg nach unten:
     Bahn 1      'mundloch'  Tageslicht vor dem Berg
     Bahn 2-5    'stollen'   Grubenholz und Lampenschein
     Bahn 6-7    'kristall'  der Fels leuchtet selbst
     Bahn 8-10   'schmelze'  die unterste Sohle, wo das Erz flüssig wird

   Die Maschinen der Welt (src/obstacles_mine.js):
     'sprengladung'  wirft im Takt alles im Umkreis nach außen, je näher desto weiter; die
                     brennende Lunte sagt es vorher an. Keine Strafe – man kann sich tragen lassen.
     'bruchwand'     stehengebliebener Fels, den eine Zündung in der Nähe wegsprengt. Danach bleibt
                     der Gang offen – die einzige Maschine im Spiel, die die Bahn selbst ändert.
     'kippbuehne'    Bohle über dem Schacht, die zu der Seite kippt, auf der der Ball liegt:
                     über die Mitte hinaus wirft sie hinüber, davor schickt sie zurück.
     'grubenlampe'   leuchtet ein Stück Bahn aus.

   Sonst gilt dieselbe Kartenlegende wie in courses.js: 's' ist hier Geröll (bremst), 'x' ein
   Block (Grubenholz oder Fels), 'l' die Glut in den Spalten, '.' der offene Schacht. */
const MINE_COURSES = [
"""
io.open('src/courses_mine.js', 'w', encoding='utf-8').write(kopf + ',\n'.join(js(b) for b in BAHNEN) + ',\n];\n')
print(f"\nsrc/courses_mine.js geschrieben – {len(BAHNEN)} Bahnen")
