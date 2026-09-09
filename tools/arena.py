# -*- coding: utf-8 -*-
"""Baut die zwoelf Bahnen der Kolosseum-Welt und schreibt src/courses_colosseum.js.

Die Karten werden hier aus Rechtecken zusammengesetzt statt von Hand getippt: So kann jede Bahn
sofort geprueft werden (alle Zeilen gleich lang, Abschlag und Loch vorhanden, Hindernisse auf dem
Fairway), und eine Aenderung an der Groesse zieht nicht Dutzende Zeichen nach sich."""
import os

class Karte:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [['.'] * w for _ in range(h)]
    def rect(self, x0, y0, x1, y1, ch='#'):
        """Rechteck von (x0,y0) bis einschliesslich (x1,y1)."""
        assert 0 <= x0 <= x1 < self.w and 0 <= y0 <= y1 < self.h, (x0, y0, x1, y1)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.g[y][x] = ch
    def put(self, x, y, ch):
        assert 0 <= x < self.w and 0 <= y < self.h, (x, y)
        self.g[y][x] = ch
    def at(self, x, y):
        return self.g[y][x]
    def rows(self):
        r = [''.join(z) for z in self.g]
        assert all(len(z) == self.w for z in r)
        return r

BAHNEN = []
def bahn(**kw):
    BAHNEN.append(kw)

# ---------------------------------------------------------------- 1 Gladiatorengasse (einfach)
k = Karte(24, 9)
k.rect(2, 2, 21, 6)
k.put(3, 4, 'T'); k.put(20, 4, 'H')
bahn(name='Gladiatorengasse', par=2, maxStrokes=10, map=k.rows(),
     intro='Der Einzug in die Arena. Zwei Gladiatoren schreiten quer über den Sand – zwischen ihnen '
           'muss der Ball hindurch. Sonst steht nichts im Weg.',
     obstacles=[
        "{ type: 'mover', x0: 9.5, y0: 2.5, x1: 9.5, y1: 6.5, w: 0.8, h: 0.8, period: 4.2, style: 'gladiator' }",
        "{ type: 'mover', x0: 15.5, y0: 6.5, x1: 15.5, y1: 2.5, w: 0.8, h: 0.8, period: 5.0, phase: 0.35, style: 'gladiator' }",
     ],
     decor=[("bannerRed", 1.2, 4.5, 1.2), ("bannerRed", 22.6, 4.5, 1.2),
            ("pillarLight", 6.5, 0.6, 1.2), ("pillarLight", 17.5, 0.6, 1.2),
            ("urn", 8.5, 7.5, 1.1), ("urn", 15.5, 7.5, 1.1)],
     seed=801, dichte=0.12)

# ---------------------------------------------------------------- 2 Sprungpodest (einfach)
k = Karte(28, 9)
k.rect(2, 3, 8, 5)        # Podest A
k.rect(12, 3, 17, 5)      # Podest B
k.rect(21, 3, 25, 5)      # Podest C
k.put(3, 4, 'T'); k.put(24, 4, 'H')
bahn(name='Sprungpodest', par=3, maxStrokes=10, map=k.rows(),
     intro='Drei Podeste, dazwischen nichts als Luft. Zwei Sprungschanzen tragen über die Lücken – '
           'wer zu zaghaft anläuft, kommt nicht hinüber.',
     obstacles=[
        "{ type: 'ramp', x: 6, y: 3, w: 2, h: 3, angle: 0, minSpeed: 3, speed: 6.5, land: 5.0 }",
        "{ type: 'ramp', x: 15, y: 3, w: 2, h: 3, angle: 0, minSpeed: 3, speed: 6.5, land: 5.0 }",
     ],
     decor=[("pillarLight", 10.0, 1.4, 1.3), ("pillarLight", 19.0, 1.4, 1.3),
            ("bannerRed", 1.2, 4.5, 1.2), ("bannerRed", 26.6, 4.5, 1.2),
            ("obelisk", 10.0, 7.0, 1.3), ("obelisk", 19.0, 7.0, 1.3)],
     seed=802, dichte=0.12)

# ---------------------------------------------------------------- 3 Mahlsteine (einfach)
k = Karte(24, 11)
k.rect(2, 2, 21, 8)
k.put(3, 5, 'T'); k.put(20, 5, 'H')
bahn(name='Mahlsteine', par=3, maxStrokes=10, map=k.rows(),
     intro='Zwei steinerne Mahlräder drehen sich mitten im Sand. Sie schlagen den Ball fort, wenn '
           'man ihnen zu nah kommt – und geben zwischen den Armen den Weg frei.',
     obstacles=[
        "{ type: 'rotor', x: 8.5, y: 5.5, blades: 3, len: 1.9, speed: 1.4, style: 'stone', height: 0.6 }",
        "{ type: 'rotor', x: 15.5, y: 5.5, blades: 3, len: 1.9, speed: -1.7, phase: 0.7, style: 'stone', height: 0.6 }",
     ],
     decor=[("bannerRed", 1.2, 5.5, 1.2), ("bannerRed", 22.6, 5.5, 1.2),
            ("pillarLight", 12.0, 0.6, 1.3), ("pillarLight", 12.0, 9.4, 1.3),
            ("urn", 5.5, 9.4, 1.1), ("urn", 18.5, 9.4, 1.1)],
     seed=803, dichte=0.12)

# ---------------------------------------------------------------- 4 Löwenpforte (einfach, erstes Löwentor)
k = Karte(24, 9)
k.rect(2, 1, 21, 3)       # obere Kammer (Ziel)
k.rect(2, 5, 14, 7)       # untere Kammer (Start)
k.put(1, 2, 'a')          # Ausgang: liegt ausserhalb der Kammer, wirft nach rechts hinein
k.put(15, 6, 'A')         # Eingang am Ende der unteren Kammer
k.put(3, 6, 'T'); k.put(20, 2, 'H')
bahn(name='Löwenpforte', par=3, maxStrokes=12, map=k.rows(),
     intro='Zwei Gassen, dazwischen die Arenamauer. Nur die Löwenpforte führt hinüber – und sie '
           'schluckt nur einen Ball mit Schwung. Zu zaghaft geschlagen, und der Löwe lässt ihn abprallen.',
     obstacles=[
        "{ type: 'liongate', pair: 'A', angle: 0 }",
        "{ type: 'mover', x0: 13.5, y0: 1.5, x1: 13.5, y1: 3.5, w: 0.8, h: 0.8, period: 4.0, style: 'gladiator' }",
     ],
     decor=[("bannerRed", 1.2, 6.5, 1.2), ("bannerRed", 22.6, 2.5, 1.2),
            ("pillarLight", 18.0, 5.0, 1.3), ("pillarLight", 20.5, 6.5, 1.3),
            ("brazier", 16.5, 4.2, 1.0), ("urn", 8.5, 8.4, 1.1)],
     seed=804, dichte=0.11)

# ---------------------------------------------------------------- 5 Gleitendes Gitter (mittel, erstes Wandertor)
k = Karte(28, 13)
k.rect(2, 3, 25, 9)
k.put(3, 6, 'T'); k.put(24, 6, 'H')
bahn(name='Gleitendes Gitter', par=3, maxStrokes=14, map=k.rows(),
     intro='Quer durch die Arena läuft ein Gitter mit einem einzigen Durchlass – und der gleitet '
           'langsam hin und her. Dahinter mahlen zwei Steinräder. Erst den Spalt abpassen, dann durch.',
     obstacles=[
        "{ type: 'wandergate', x0: 14, y0: 3, x1: 14, y1: 10, gap: 2.0 }",
        "{ type: 'rotor', x: 8.5, y: 6.5, blades: 3, len: 1.7, speed: 1.5, style: 'stone', height: 0.6 }",
        "{ type: 'rotor', x: 20.5, y: 6.5, blades: 3, len: 1.7, speed: -1.5, phase: 0.5, style: 'stone', height: 0.6 }",
     ],
     decor=[("bannerRed", 1.2, 6.5, 1.2), ("bannerRed", 26.6, 6.5, 1.2),
            ("pillarLight", 14.0, 1.4, 1.3), ("pillarLight", 14.0, 11.4, 1.3),
            ("urn", 6.5, 11.4, 1.1), ("urn", 21.5, 11.4, 1.1), ("brazier", 14.0, 10.6, 1.0)],
     seed=805, dichte=0.11)

# ---------------------------------------------------------------- 6 Wagenrennen (mittel)
k = Karte(30, 11)
k.rect(2, 3, 10, 7)       # Podest A
k.rect(16, 3, 21, 7)      # Podest B
k.rect(24, 3, 27, 7)      # Podest C
k.put(3, 5, 'T'); k.put(26, 5, 'H')
bahn(name='Wagenrennen', par=4, maxStrokes=14, map=k.rows(),
     intro='Der Streitwagen pendelt in seinen Rillen über den Graben und nimmt mit, wer rechtzeitig '
           'aufspringt. Wer die Fahrt verpasst, liegt im Sand. Am Ende hilft nur noch die Schanze.',
     obstacles=[
        "{ type: 'rail', y: 5.5, x0: 10, x1: 17 }",
        "{ type: 'ferry', x0: 10.5, y0: 5.5, x1: 16.5, y1: 5.5, w: 1.4, h: 1.0, wait: 1.6, travel: 2.6, style: 'chariot' }",
        "{ type: 'ramp', x: 19, y: 3, w: 2, h: 5, angle: 0, minSpeed: 3, speed: 6.0, land: 3.5 }",
     ],
     decor=[("pillarLight", 13.0, 1.4, 1.3), ("pillarLight", 13.0, 8.6, 1.3),
            ("bannerRed", 1.2, 5.5, 1.2), ("bannerRed", 28.6, 5.5, 1.2),
            ("obelisk", 22.5, 1.4, 1.3), ("urn", 22.5, 8.6, 1.1)],
     seed=806, dichte=0.11)

# ---------------------------------------------------------------- 7 Katapultbahn (mittel)
k = Karte(28, 14)
k.rect(2, 9, 12, 12)      # untere Kammer mit Katapult
k.rect(15, 2, 25, 6)      # obere Kammer mit dem Loch
k.put(3, 11, 'T'); k.put(24, 4, 'H')
bahn(name='Katapultbahn', par=4, maxStrokes=14, map=k.rows(),
     intro='Vom Sand der unteren Kammer geht es nur mit dem Katapult hinauf. Es schwenkt langsam – '
           'wer im richtigen Moment geladen wird, fliegt in die obere Kammer. Dort warten die Wachen.',
     obstacles=[
        "{ type: 'cannon', style: 'catapult', x: 11.5, y: 10.5, base: -0.951, amp: 0.16, speed: 0.8, range: 7.7, catchR: 0.65, loadTime: 0.8 }",
        "{ type: 'mover', x0: 17.5, y0: 2.5, x1: 17.5, y1: 6.5, w: 0.8, h: 0.8, period: 4.4, style: 'gladiator' }",
        "{ type: 'mover', x0: 22.5, y0: 6.5, x1: 22.5, y1: 2.5, w: 0.8, h: 0.8, period: 5.2, phase: 0.4, style: 'gladiator' }",
     ],
     decor=[("bannerRed", 1.2, 10.5, 1.2), ("bannerRed", 26.6, 4.5, 1.2),
            ("pillarLight", 14.0, 8.0, 1.3), ("pillarLight", 20.0, 8.0, 1.3),
            ("brazier", 8.5, 13.4, 1.0), ("urn", 5.5, 7.5, 1.1), ("obelisk", 25.0, 8.5, 1.3)],
     seed=807, dichte=0.06)

# ---------------------------------------------------------------- 8 Tierpforten (mittel)
k = Karte(30, 17)
k.rect(2, 2, 11, 6)       # Kammer 1 (Start)
k.put(12, 4, 'A')         # Eingang am Ende von Kammer 1
# Das linke Podest von Kammer 2 muss lang genug sein: Das Löwentor spuckt den Ball mit fester
# Geschwindigkeit aus, und der rollt gut zehn Kacheln weit. Endete das Podest davor, flöge er
# geradewegs in den Graben – ein Strafschlag, den der Spieler nicht abwenden kann.
k.rect(2, 8, 15, 11)      # Kammer 2, linkes Podest
k.rect(20, 8, 27, 11)     # Kammer 2, rechtes Podest
k.put(1, 9, 'a')          # Ausgang von Tor A
k.put(28, 9, 'B')         # Eingang von Tor B
k.rect(14, 13, 27, 15)    # Kammer 3 (Ziel)
k.put(13, 14, 'b')        # Ausgang von Tor B
k.put(3, 4, 'T'); k.put(26, 14, 'H')
bahn(name='Tierpforten', par=5, maxStrokes=16, map=k.rows(),
     intro='Drei Kammern, zwei Löwenpforten. Zwischen ihnen klafft ein Graben, über den nur der '
           'Streitwagen führt. Jede Pforte will Schwung sehen, sonst bleibt sie eine Wand.',
     obstacles=[
        "{ type: 'liongate', pair: 'A', angle: 0 }",
        "{ type: 'liongate', pair: 'B', angle: 0 }",
        "{ type: 'rail', y: 9.5, x0: 15, x1: 21 }",
        "// Der Wagen wartet länger als er fährt: Wer den Graben erreicht, soll ihn meistens",
        "// besetzt vorfinden statt vor einer leeren Station zu stehen.",
        "{ type: 'ferry', x0: 15.5, y0: 9.5, x1: 20.5, y1: 9.5, w: 1.4, h: 1.0, wait: 2.6, travel: 2.4, style: 'chariot' }",
        "{ type: 'mover', x0: 6.5, y0: 2.5, x1: 6.5, y1: 6.5, w: 0.8, h: 0.8, period: 4.6, style: 'gladiator' }",
        "{ type: 'mover', x0: 22.5, y0: 15.5, x1: 22.5, y1: 13.5, w: 0.8, h: 0.8, period: 3.8, phase: 0.3, style: 'gladiator' }",
     ],
     decor=[("bannerRed", 1.2, 4.5, 1.2), ("bannerRed", 28.6, 14.5, 1.2),
            ("pillarLight", 15.0, 5.0, 1.3), ("pillarLight", 15.0, 10.0, 1.3),
            ("brazier", 13.0, 6.6, 1.0), ("brazier", 29.0, 11.6, 1.0),
            ("urn", 5.5, 12.6, 1.1), ("obelisk", 20.0, 6.0, 1.3)],
     seed=808, dichte=0.06)

# ---------------------------------------------------------------- 9 Sandsturm (schwer)
k = Karte(32, 12)
k.rect(2, 3, 21, 8)       # grosse Arena mit Gitter und Rädern
k.rect(26, 3, 29, 8)      # Zielpodest hinter dem Graben
k.put(3, 6, 'T'); k.put(28, 6, 'H')
bahn(name='Sandsturm', par=5, maxStrokes=16, map=k.rows(),
     intro='Alles auf einmal: das gleitende Gitter, zwei Mahlsteine, patrouillierende Gladiatoren – '
           'und am Ende die Schanze über den Graben. Wer zu kurz anläuft, fällt hinein.',
     obstacles=[
        "{ type: 'wandergate', x0: 12, y0: 3, x1: 12, y1: 9, gap: 1.8 }",
        "{ type: 'rotor', x: 16.5, y: 4.5, blades: 3, len: 1.6, speed: 1.6, style: 'stone', height: 0.6 }",
        "{ type: 'rotor', x: 16.5, y: 7.5, blades: 3, len: 1.6, speed: -1.8, phase: 0.5, style: 'stone', height: 0.6 }",
        "{ type: 'mover', x0: 7.5, y0: 3.5, x1: 7.5, y1: 8.5, w: 0.8, h: 0.8, period: 4.0, style: 'gladiator' }",
        "{ type: 'mover', x0: 27.5, y0: 8.5, x1: 27.5, y1: 3.5, w: 0.8, h: 0.8, period: 4.8, phase: 0.4, style: 'gladiator' }",
        "{ type: 'ramp', x: 20, y: 3, w: 2, h: 6, angle: 0, minSpeed: 3.2, speed: 6.8, land: 4.0 }",
     ],
     decor=[("bannerRed", 1.2, 6.5, 1.2), ("bannerRed", 30.6, 6.5, 1.2),
            ("pillarLight", 12.0, 1.4, 1.3), ("pillarLight", 12.0, 10.6, 1.3),
            ("obelisk", 23.5, 1.6, 1.4), ("obelisk", 23.5, 10.4, 1.4),
            ("urn", 5.5, 10.6, 1.1), ("brazier", 24.0, 6.0, 1.0)],
     seed=809, dichte=0.07)

# ---------------------------------------------------------------- 10 Die Spina (schwer)
k = Karte(34, 18)
k.rect(2, 2, 31, 15)      # Rundkurs
k.rect(8, 6, 25, 11, '.') # Spina in der Mitte (Mauer)
k.rect(14, 7, 19, 10)     # Kammer im Inneren der Spina
k.put(13, 8, 'a')         # Ausgang der Pforte, wirft in die Kammer
k.put(29, 13, 'A')        # Eingang unten rechts
k.put(4, 14, 'T'); k.put(17, 8, 'H')
bahn(name='Die Spina', par=6, maxStrokes=18, map=k.rows(),
     intro='Ein voller Rundkurs um die Spina. Das Katapult wirft die lange Gerade hinauf, oben zieht '
           'der Streitwagen seine Bahn, unten mahlt der Stein – und ganz am Ende führt die Pforte in '
           'die Kammer im Herzen der Arena.',
     obstacles=[
        "{ type: 'liongate', pair: 'A', angle: 0 }",
        "{ type: 'cannon', style: 'catapult', x: 4.5, y: 8.5, base: -Math.PI / 2, amp: 0.14, speed: 0.7, range: 5.2, catchR: 0.65, loadTime: 0.8 }",
        "{ type: 'rail', y: 3.5, x0: 9, x1: 25 }",
        "{ type: 'ferry', x0: 9.5, y0: 3.5, x1: 24.5, y1: 3.5, w: 1.4, h: 1.0, wait: 1.8, travel: 4.2, style: 'chariot' }",
        "{ type: 'rotor', x: 16.5, y: 13.5, blades: 3, len: 1.7, speed: 1.5, style: 'stone', height: 0.6 }",
        "{ type: 'rotor', x: 28.5, y: 8.5, blades: 3, len: 1.6, speed: -1.6, phase: 0.4, style: 'stone', height: 0.6 }",
        "{ type: 'mover', x0: 6.5, y0: 4.5, x1: 6.5, y1: 6.5, w: 0.8, h: 0.8, period: 3.6, style: 'gladiator' }",
        "{ type: 'mover', x0: 22.5, y0: 14.5, x1: 10.5, y1: 14.5, w: 0.8, h: 0.8, period: 7.0, phase: 0.3, style: 'gladiator' }",
     ],
     decor=[("pillarLight", 10.5, 8.5, 1.4), ("pillarLight", 23.5, 8.5, 1.4),
            ("pillarLight", 10.5, 9.5, 1.4), ("pillarLight", 23.5, 9.5, 1.4),
            ("bannerRed", 1.2, 8.5, 1.2), ("bannerRed", 32.6, 8.5, 1.2),
            ("obelisk", 16.5, 8.5, 1.5), ("brazier", 12.0, 6.6, 1.0), ("brazier", 21.5, 11.4, 1.0),
            ("urn", 5.5, 17.0, 1.1), ("urn", 28.5, 17.0, 1.1)],
     seed=810, dichte=0.07)

# ---------------------------------------------------------------- 11 Der Feuerturm (Schlussbahn)
k = Karte(38, 21)
k.rect(2, 11, 35, 17)     # untere Arena mit dem Feuerturm
k.rect(31, 7, 35, 10)     # Aufstieg rechts
k.rect(10, 2, 35, 6)      # obere Gerade
k.rect(2, 2, 5, 6)        # Zielpodest hinter dem Graben
k.put(3, 14, 'T'); k.put(3, 4, 'H')
bahn(name='Der Feuerturm', par=6, maxStrokes=20, map=k.rows(),
     intro='Die grosse Runde. Unten streicht der Feuerstrahl über den Sand – er geht nie aus, man '
           'muss den Moment abpassen, in dem er am Rand wendet. Oben sperrt das gleitende Gitter, '
           'und vor dem Loch klafft der Graben. Ein langer Weg zum Ass.',
     obstacles=[
        "{ type: 'firetower', x: 18, y: 19.3, height: 3.6, zx: 13, zy: 11, zw: 8, zh: 7, achse: 'y', breit: 2, tempo: 1.9 }",
        "{ type: 'rotor', x: 8.5, y: 14.5, blades: 3, len: 1.7, speed: 1.5, style: 'stone', height: 0.6 }",
        "{ type: 'rotor', x: 26.5, y: 14.5, blades: 3, len: 1.7, speed: -1.6, phase: 0.5, style: 'stone', height: 0.6 }",
        "{ type: 'wandergate', x0: 22, y0: 2, x1: 22, y1: 7, gap: 1.8 }",
        "{ type: 'mover', x0: 29.5, y0: 2.5, x1: 29.5, y1: 6.5, w: 0.8, h: 0.8, period: 4.2, style: 'gladiator' }",
        "{ type: 'mover', x0: 15.5, y0: 6.5, x1: 15.5, y1: 2.5, w: 0.8, h: 0.8, period: 5.0, phase: 0.35, style: 'gladiator' }",
        "{ type: 'ramp', x: 10, y: 2, w: 2, h: 5, angle: 180, minSpeed: 3.2, speed: 6.8, land: 5.0 }",
     ],
     decor=[("bannerRed", 1.2, 14.5, 1.2), ("bannerRed", 36.6, 8.5, 1.2),
            ("pillarLight", 8.0, 8.5, 1.4), ("pillarLight", 20.0, 8.5, 1.4), ("pillarLight", 27.0, 8.5, 1.4),
            ("obelisk", 7.5, 0.8, 1.4), ("obelisk", 30.5, 0.8, 1.4),
            ("brazier", 12.0, 9.4, 1.0), ("brazier", 24.0, 9.4, 1.0),
            ("urn", 5.5, 19.4, 1.1), ("urn", 30.5, 19.4, 1.1)],
     seed=811, dichte=0.06)

# ---------------------------------------------------------------- 12 Die Kaiserloge (Schlussbahn)
k = Karte(38, 20)
k.rect(2, 14, 35, 17)     # untere Gerade mit Katapult und Wachen
k.put(36, 15, 'A')        # Eingang der Pforte am rechten Ende
k.rect(2, 8, 17, 11)      # mittlere Gerade, linkes Stück
k.rect(23, 8, 35, 11)     # mittlere Gerade, rechtes Stück
k.put(1, 9, 'a')          # Ausgang der Pforte
k.rect(2, 2, 35, 6)       # obere Gerade mit der Kaiserloge
k.put(3, 15, 'T'); k.put(5, 4, 'H')
bahn(name='Die Kaiserloge', par=7, maxStrokes=22, map=k.rows(),
     intro='Der Weg des Siegers: einmal unten hindurch, durch die Löwenpforte zurück nach links, über '
           'den Graben auf dem Streitwagen, mit der Schanze hinauf – und oben sitzt der Kaiser. Nach '
           'jedem Schlag dreht er den Daumen. Zeigt er nach unten, klafft die Falltür vor dem Loch.',
     obstacles=[
        "{ type: 'imperialbox', x: 15, y: 0.6, w: 3.4, h: 1.6, lx: 14, ly: 2, lw: 2, lh: 5, start: 'hoch' }",
        "{ type: 'liongate', pair: 'A', angle: 0 }",
        "{ type: 'cannon', style: 'catapult', x: 20.5, y: 15.5, base: 0, amp: 0.1, speed: 0.7, range: 12.0, catchR: 0.65, loadTime: 0.8 }",
        "{ type: 'rail', y: 9.5, x0: 17, x1: 24 }",
        "{ type: 'ferry', x0: 17.5, y0: 9.5, x1: 23.5, y1: 9.5, w: 1.4, h: 1.0, wait: 1.6, travel: 2.8, style: 'chariot' }",
        "{ type: 'ramp', x: 30, y: 8, w: 4, h: 2, angle: -90, minSpeed: 3.2, speed: 7.0, land: 4.0 }",
        "{ type: 'rotor', x: 24.5, y: 4.5, blades: 3, len: 1.7, speed: 1.5, style: 'stone', height: 0.6 }",
        "{ type: 'rotor', x: 9.5, y: 4.5, blades: 3, len: 1.6, speed: -1.7, phase: 0.4, style: 'stone', height: 0.6 }",
        "{ type: 'mover', x0: 8.5, y0: 14.5, x1: 8.5, y1: 17.5, w: 0.8, h: 0.8, period: 3.8, style: 'gladiator' }",
        "{ type: 'mover', x0: 29.5, y0: 17.5, x1: 29.5, y1: 14.5, w: 0.8, h: 0.8, period: 4.6, phase: 0.4, style: 'gladiator' }",
     ],
     decor=[("bannerRed", 1.2, 15.5, 1.2), ("bannerRed", 36.6, 4.5, 1.2),
            ("pillarLight", 6.0, 12.5, 1.4), ("pillarLight", 20.0, 12.5, 1.4), ("pillarLight", 31.0, 12.5, 1.4),
            ("pillarLight", 20.0, 7.0, 1.4), ("pillarLight", 8.0, 7.0, 1.4),
            ("obelisk", 26.0, 0.8, 1.4), ("brazier", 12.0, 12.6, 1.0), ("brazier", 27.0, 7.0, 1.0),
            ("urn", 5.5, 18.6, 1.1), ("urn", 33.5, 18.6, 1.1)],
     seed=812, dichte=0.06)

# ---------------------------------------------------------------- Ausgabe
for b in BAHNEN:
    rows = b['map']
    txt = '\n'.join(rows)
    assert txt.count('T') == 1, b['name']
    assert txt.count('H') == 1, b['name']
    print(f"{b['name']:20s} {len(rows[0])}x{len(rows)} Par {b['par']}")

def js_map(rows):
    return '\n'.join("      '%s'," % r for r in rows)

def js_decor(d):
    return '\n'.join("      { t: '%s', x: %s, y: %s, s: %s }," % (t, x, y, s) for (t, x, y, s) in d)

kopf = '''/* Kolosseum: die Arena – zwölf Turnierbahnen, aufsteigend von einfach nach schwer.

   Bahn 1 bis 4 führen je ein bis zwei Hindernisarten ein, 5 bis 8 mischen sie, 9 und 10 kombinieren
   alles, und 11 und 12 sind die grossen Schlussbahnen mit langem Weg zum Ass: auf Bahn 11 steht als
   einziger der Feuerturm, auf Bahn 12 als einzige die Kaiserloge.

   Zwei Hindernisse werden bewusst spät eingeführt und stehen nicht auf jeder Bahn: die Löwenpforte
   (Löwentor) ab Bahn 4, das gleitende Gitter (wanderndes Tor) ab Bahn 5.

   Die Löwentore werden nicht über Koordinaten gesetzt, sondern als Buchstaben in die Karte gemalt:
   Der Grossbuchstabe ist der Eingang, der gleiche Kleinbuchstabe der Ausgang (A/a, B/b, C/c). In der
   Hindernisliste steht je Paar nur, in welche Richtung der Ausgang ausspuckt ('angle' in Grad).
   Geschluckt wird nur, wer Schwung hat – sonst prallt der Ball am Tor ab wie an einer Wand.

   Die Karten dieser Datei entstehen mit einem Hilfsskript aus Rechtecken (siehe README): So bleiben
   alle Zeilen gleich lang, und eine Änderung an einer Kammer zieht nicht Dutzende Zeichen nach sich.

   Sonst gilt dieselbe Kartenlegende wie in courses.js. */
const COLOSSEUM_COURSES = [
'''

teile = [kopf]
for b in BAHNEN:
    teile.append("  {\n")
    teile.append("    name: '%s', par: %d, theme: 'colosseum', maxStrokes: %d,\n" % (b['name'], b['par'], b['maxStrokes']))
    teile.append("    intro: '%s',\n" % b['intro'].replace("'", "\\'"))
    teile.append("    map: [\n%s\n    ],\n" % js_map(b['map']))
    # Zeilen, die mit // beginnen, sind Kommentare für die erzeugte Datei und bekommen kein Komma
    zeilen = '\n'.join(('      %s' % o) if o.startswith('//') else ('      %s,' % o) for o in b['obstacles'])
    teile.append("    obstacles: [\n" + zeilen + "\n    ],\n")
    teile.append("    decor: [\n%s\n    ],\n" % js_decor(b['decor']))
    teile.append("    autoDecor: { density: %s, seed: %d },\n" % (b['dichte'], b['seed']))
    teile.append("  },\n")
teile.append("];\n")

open(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'courses_colosseum.js'), 'w', encoding='utf-8').write(''.join(teile))
print('geschrieben')
