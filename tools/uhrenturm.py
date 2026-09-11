# -*- coding: utf-8 -*-
"""Baut die zwoelf Bahnen des Uhrenturms und schreibt src/courses_clock.js.

Die Karten werden aus Rechtecken und Scheiben zusammengesetzt statt von Hand getippt. Der Gewinn
ist nicht die Tipparbeit, sondern die Pruefung: Jede Bahn wird hier schon beim Bauen gegen
dieselben Regeln gehalten, die spaeter tools/validate.mjs anlegt - Abschlag und Loch vorhanden,
alle Zeilen gleich lang, und jeder Punkt, den eine Maschine braucht, liegt auf der Bahn. Ein
Pendel, dessen Umkehrpunkt in der Mauer haengt, faellt hier auf und nicht erst im Spiel.

Der rote Faden der Welt ist der Takt: Auf jeder Bahn gibt es einen Moment, auf den man warten muss.
Darum stehen die Maschinen nicht irgendwo, sondern immer vor einer Stelle, an der kein Weg
vorbeifuehrt - eine Tuer, eine Luecke, ein Rohr. Kraft allein hilft nirgends.
"""
import math, os

FLOOR = set('#silwTHoABC')          # was der Ball betreten darf (wie in validate.mjs)
HART = set('#siTHoABC')             # davon das, worauf er auch liegen bleiben kann

class Karte:
    def __init__(self, w, h):
        self.w, self.h = w, h
        self.g = [['.'] * w for _ in range(h)]
    def rect(self, x0, y0, x1, y1, ch='#'):
        assert 0 <= x0 <= x1 < self.w and 0 <= y0 <= y1 < self.h, (x0, y0, x1, y1)
        for y in range(y0, y1 + 1):
            for x in range(x0, x1 + 1):
                self.g[y][x] = ch
    def scheibe(self, cx, cy, r, ch='#'):
        for y in range(self.h):
            for x in range(self.w):
                if math.hypot(x + 0.5 - cx, y + 0.5 - cy) <= r:
                    self.g[y][x] = ch
    def put(self, x, y, ch):
        assert 0 <= x < self.w and 0 <= y < self.h, (x, y)
        self.g[y][x] = ch
    def at(self, x, y):
        if 0 <= int(y) < self.h and 0 <= int(x) < self.w:
            return self.g[int(y)][int(x)]
        return '.'
    def frei(self, x, y):
        return self.at(x, y) in FLOOR
    def rows(self):
        r = [''.join(z) for z in self.g]
        assert all(len(z) == self.w for z in r)
        return r

BAHNEN = []
def bahn(**kw):
    BAHNEN.append(kw)

# ---------------------------------------------------------------- Maschinen als Bausteine
# Jeder Baustein prueft selbst, ob er auf dieser Karte stehen kann, und liefert die JS-Zeile.

def pendeltor(k, name, gx, gy, ph, amp=60, phase=0, w=1.2):
    """Pendel, das eine Tuer bewacht: Die Linse haengt in Ruhe genau im Durchlass (gx,gy) und
    schwingt zu beiden Seiten darueber hinaus. ph ist die Hoehe der Aufhaengung (Welt-y).
    Der Spieler wartet, bis sie zur Seite ausschwingt, und schiebt den Ball hindurch."""
    ln = gy - ph
    assert ln > 0.8, (name, ln)
    a = math.radians(amp)
    for etikett, wx, wy in [('Ruhelage', gx, gy),
                            ('links', gx - ln * math.sin(a), ph + ln * math.cos(a)),
                            ('rechts', gx + ln * math.sin(a), ph + ln * math.cos(a))]:
        assert k.frei(wx, wy), f'{name}: Pendel-{etikett} bei ({wx:.1f},{wy:.1f}) liegt auf "{k.at(wx, wy)}"'
    return ("{ type: 'pendulum', x: %s, y: %s, len: %s, amp: %d, ruhe: 90, phase: %s, w: %s, h: %s }"
            % (g(gx), g(ph), g(ln), amp, g(phase), g(w), g(w)))

def zahnradfeld(k, name, x0, y0, x1, y1, wait=2.2, travel=3.2, r=0.9, zaehne=10, phase=0):
    """Zahnradfeld traegt ueber eine Luecke. Beide Enden muessen auf der Bahn liegen, sonst
    setzt es den Ball ins Nichts.

    Ein- und Ausstiegskachel werden zu 'o' (Klippe): Dort baut level.js keine Bande und keine
    Kollisionskante. Sonst stuende quer vor dem Feld ein Gelaender, und der getragene Ball fuehre
    mitten hindurch - er wird ja gesetzt und nicht geschoben, also haelt ihn keine Wand auf. Mit
    der offenen Kante sieht man, wofuer die Luecke da ist, und wer danebenrollt, faellt auch
    wirklich hinunter."""
    for etikett, wx, wy in [('Anfang', x0, y0), ('Ende', x1, y1)]:
        assert k.frei(wx, wy), f'{name}: Zahnradfeld-{etikett} bei ({wx},{wy}) liegt auf "{k.at(wx, wy)}"'
        if k.at(wx, wy) == '#':
            k.put(int(wx), int(wy), 'o')
    assert math.hypot(x1 - x0, y1 - y0) > 1, name
    return ("{ type: 'gearfield', x0: %s, y0: %s, x1: %s, y1: %s, wait: %s, travel: %s, r: %s, zaehne: %d, phase: %s }"
            % (g(x0), g(y0), g(x1), g(y1), g(wait), g(travel), g(r), zaehne, g(phase)))

def federwerk(k, name, x, y, base_grad, rng=8, amp=0.35, speed=0.9, catchR=0.7):
    """Federwerk schleudert in Grundrichtung 'base_grad'. Topf und Landepunkt muessen Bahn sein."""
    b = math.radians(base_grad)
    lx, ly = x + math.cos(b) * (rng + 0.9), y + math.sin(b) * (rng + 0.9)
    assert k.frei(x, y), f'{name}: Federwerk-Topf bei ({x},{y}) liegt auf "{k.at(x, y)}"'
    assert k.frei(lx, ly), f'{name}: Federwerk-Landepunkt bei ({lx:.1f},{ly:.1f}) liegt auf "{k.at(lx, ly)}"'
    return ("{ type: 'springwork', x: %s, y: %s, base: %s, amp: %s, speed: %s, range: %s, catchR: %s, loadTime: 0.9 }"
            % (g(x), g(y), g(round(b, 4)), g(amp), g(speed), g(rng), g(catchR)))

def hemmung(k, name, x, y, quer, phase=0, dick=0.45):
    """Hemmung quer ueber einen Durchlass. 'quer' ist die Richtung, in der die beiden Klinken
    nebeneinander stehen ('x' oder 'y'), und zugleich die Breite des Durchlasses."""
    assert k.frei(x, y), f'{name}: Hemmung-Mitte bei ({x},{y}) liegt auf "{k.at(x, y)}"'
    w, h = (quer[1], dick) if quer[0] == 'x' else (dick, quer[1])
    assert max(w, h) >= 1.6, (name, w, h)
    return ("{ type: 'escapement', x: %s, y: %s, w: %s, h: %s, phase: %s }" % (g(x), g(y), g(w), g(h), g(phase)))

def zeigerarm(k, name, x, y, r=4.5, phase=0, thick=0.24):
    """Zeigerarm streicht ueber eine runde Flaeche. Die Spitze soll ueberwiegend ueber der Bahn
    gehen, sonst faehrt der Arm durch Mauern."""
    assert k.frei(x, y), f'{name}: Zeigerarm-Nabe bei ({x},{y}) liegt auf "{k.at(x, y)}"'
    drauf = sum(1 for i in range(12)
                if k.frei(x + math.cos(i * math.pi / 6) * r, y + math.sin(i * math.pi / 6) * r))
    assert drauf >= 8, f'{name}: Zeigerarm streicht nur an {drauf} von 12 Stellen ueber die Bahn'
    return "{ type: 'sweephand', x: %s, y: %s, r: %s, thick: %s, phase: %s }" % (g(x), g(y), g(r), g(thick), g(phase))

def zeigerwerk(k, name, x, y, r=5, phase=0):
    """Zeigerwerk: drei Zeiger auf einer Achse, jeder mit eigener Umlaufdauer und eigener Wirkung.
    Sie sind keine Mauern, aber ihre Felder fegen den ganzen Kreis ab - liegt ein Stueck davon in
    der Mauer, zieht oder bremst dort etwas, das man nicht sieht. Der Kreis unter dem laengsten
    Zeiger (Sekundenzeiger, 0.95 * r) muss darum ganz auf der Bahn liegen."""
    assert k.frei(x, y), f'{name}: Zeigerwerk-Nabe bei ({x},{y}) liegt auf "{k.at(x, y)}"'
    lang = r * 0.95
    for i in range(24):
        a = i * math.pi / 12
        mx, my = x + math.cos(a) * lang, y + math.sin(a) * lang
        assert k.frei(mx, my), f'{name}: Zeigerspitze bei ({mx:.1f},{my:.1f}) liegt auf "{k.at(mx, my)}"'
    return "{ type: 'handclock', x: %s, y: %s, r: %s, phase: %s }" % (g(x), g(y), g(r), g(phase))

def zifferblatt(k, name, x, y, r=6, marken=12):
    """Zifferblatt: Das Loch springt von Marke zu Marke. Jede Marke muss Bahn sein, und das 'H'
    der Karte gehoert auf die erste (oben, 12 Uhr)."""
    for i in range(marken):
        a = -math.pi / 2 + i * 2 * math.pi / marken
        mx, my = x + math.cos(a) * r, y + math.sin(a) * r
        ch = k.at(mx, my)
        assert ch in HART, f'{name}: Zifferblatt-Marke {i} bei ({mx:.1f},{my:.1f}) liegt auf "{ch}"'
        assert k.at(mx, my) != 'T', f'{name}: der Abschlag steht auf Marke {i} - der Ball laege beim Start im Loch'
    return "{ type: 'wanderloch', x: %s, y: %s, r: %s, marken: %d }" % (g(x), g(y), g(r), marken)

def wanderloch(k, name, stellen):
    """Wanderloch: Das Loch springt der Reihe nach von Stelle zu Stelle und am Ende wieder auf die
    erste. Alle Stellen muessen Bahn sein - laege auch nur eine in der Mauer, waere die Bahn zehn
    Sekunden lang nicht zu gewinnen. Das 'H' der Karte wird hier gleich auf die erste Stelle
    gesetzt: So steht es immer da, wo das Loch ohne laufende Uhr liegt, und die Bahnpruefung
    findet ihren Weg dorthin."""
    assert len(stellen) >= 2, name
    for i, (mx, my) in enumerate(stellen):
        ch = k.at(mx, my)
        assert ch in HART, f'{name}: Wanderloch-Stelle {i} bei ({mx},{my}) liegt auf "{ch}"'
    kacheln = [(int(mx), int(my)) for mx, my in stellen]
    assert len(set(kacheln)) == len(kacheln), f'{name}: zwei Stellen auf derselben Kachel'
    for y in range(k.h):                                  # Abschlag darf auf keiner Stelle stehen -
        for x in range(k.w):                              # sonst laege der Ball beim Start im Loch
            if k.g[y][x] == 'T':
                assert (x, y) not in kacheln, f'{name}: der Abschlag ({x},{y}) steht auf einer Stelle des Wanderlochs'
    for y in range(k.h):                                  # altes 'H' weg, es zieht auf Stelle 0
        for x in range(k.w):
            if k.g[y][x] == 'H':
                k.g[y][x] = '#'
    k.put(kacheln[0][0], kacheln[0][1], 'H')
    liste = ', '.join('[%s, %s]' % (g(mx), g(my)) for mx, my in stellen)
    return "{ type: 'wanderloch', stellen: [%s] }" % liste

def turbine(k, o, name, x, y, ebene=0, w=1.4, h=1.4):
    """Turbine: hebt den Ball von ihrer Ebene k auf die naechste darueber, o. Geprueft wird, dass
    sie auf ihrer Ebene auf der Bahn steht UND dass genau darueber Boden ist - sonst fiele der
    Ball im selben Augenblick wieder herunter."""
    assert k.frei(x, y), f'{name}: Turbine bei ({x},{y}) steht auf Ebene {ebene} auf "{k.at(x, y)}"'
    assert o.frei(x, y), f'{name}: ueber der Turbine bei ({x},{y}) ist auf Ebene {ebene + 1} kein Boden ("{o.at(x, y)}")'
    eb = "" if ebene == 0 else ", ebene: %d" % ebene
    return "{ type: 'turbine', x: %s, y: %s, w: %s, h: %s%s }" % (g(x), g(y), g(w), g(h), eb)

def luke(karten, name, x, y, ebene=1, phase=0, w=1.6, h=1.6):
    """Luke: eine Klappe im Boden einer Ebene, die im Takt auf- und zugeht. Zu ist sie Boden, offen
    ein Loch. Geprueft wird, dass sie auf ihrer Ebene auf der Bahn liegt, dass es ueberhaupt eine
    Ebene darunter gibt und dass man irgendwo darunter auch landet - sonst waere sie kein Weg nach
    unten, sondern ein Sturz ins Aus."""
    assert ebene >= 1, f'{name}: eine Luke auf der untersten Ebene fuehrt ins Nichts'
    assert karten[ebene].frei(x, y), f'{name}: Luke bei ({x},{y}) liegt auf Ebene {ebene} auf "{karten[ebene].at(x, y)}"'
    assert any(karten[n].frei(x, y) for n in range(ebene)), \
        f'{name}: unter der Luke bei ({x},{y}) ist auf keiner Ebene Boden'
    ph = "" if phase == 0 else ", phase: %s" % g(phase)
    eb = "" if ebene == 0 else ", ebene: %d" % ebene
    return "{ type: 'luke', x: %s, y: %s, w: %s, h: %s%s%s }" % (g(x), g(y), g(w), g(h), eb, ph)

def rohr(k, name, paar, grad, ziel=None, ebene=0):
    """Kupferrohr: Die beiden Plaetze stehen als Gross- und Kleinbuchstabe in der Karte. Der
    Rohrmund steht auf Karte k (Ebene 'ebene'), das Rohrende auf Karte 'ziel' - das darf dieselbe
    sein oder eine hoehere. Geprueft wird, dass es beide gibt und dass die Auswurfstelle Bahn ist.
    Das Rohr ist eine Fahrt, kein Tor: Man kommt immer hinein, der Ball faehrt sichtbar hindurch
    und wird am Ende ausgeworfen."""
    gross, klein = paar.upper(), paar.lower()
    zk, zeb = (k, ebene) if ziel is None else ziel
    ein = aus = None
    for y in range(k.h):
        for x in range(k.w):
            if k.g[y][x] == gross: ein = (x + 0.5, y + 0.5)
    for y in range(zk.h):
        for x in range(zk.w):
            if zk.g[y][x] == klein: aus = (x + 0.5, y + 0.5)
    assert ein, f'{name}: Kupferrohr {paar} braucht {gross} auf Ebene {ebene}'
    assert aus, f'{name}: Kupferrohr {paar} braucht {klein} auf Ebene {zeb}'
    a = math.radians(grad)
    lx, ly = aus[0] + math.cos(a) * 0.95, aus[1] + math.sin(a) * 0.95
    assert zk.at(lx, ly) in HART, f'{name}: Kupferrohr {paar} spuckt auf "{zk.at(lx, ly)}" bei ({lx:.1f},{ly:.1f})'
    eb = "" if ebene == 0 else ", ebene: %d" % ebene
    zi = "" if zeb == ebene else ", ziel: %d" % zeb
    return "{ type: 'copperpipe', pair: '%s', angle: %d%s%s }" % (gross, grad, eb, zi)

def kettenzug(k, o, name, x, y, ebene=0, grad=0, phase=0):
    """Kettenzug: Haken laufen im Takt um; wer die Stelle beruehrt, waehrend gerade einer unten ist,
    wird eine Etage hoeher gebracht. Geprueft wird Boden unten wie oben."""
    assert k.frei(x, y), f'{name}: Kettenzug bei ({x},{y}) steht auf Ebene {ebene} auf "{k.at(x, y)}"'
    assert o.frei(x, y), f'{name}: ueber dem Kettenzug bei ({x},{y}) ist auf Ebene {ebene + 1} kein Boden'
    eb = "" if ebene == 0 else ", ebene: %d" % ebene
    ph = "" if phase == 0 else ", phase: %s" % g(phase)
    return "{ type: 'kettenzug', x: %s, y: %s, angle: %d%s%s }" % (g(x), g(y), grad, eb, ph)

def zahnstange(k, o, name, x, y, ebene=0, grad=0, phase=0):
    """Zahnstange: Die Schaufel wartet unten, faehrt hoch, kommt zurueck. Mitgenommen wird, wer
    beim Losfahren daraufsteht. Geprueft wird Boden unten wie oben."""
    assert k.frei(x, y), f'{name}: Zahnstange bei ({x},{y}) steht auf Ebene {ebene} auf "{k.at(x, y)}"'
    assert o.frei(x, y), f'{name}: ueber der Zahnstange bei ({x},{y}) ist auf Ebene {ebene + 1} kein Boden'
    eb = "" if ebene == 0 else ", ebene: %d" % ebene
    ph = "" if phase == 0 else ", phase: %s" % g(phase)
    return "{ type: 'zahnstange', x: %s, y: %s, angle: %d%s%s }" % (g(x), g(y), grad, eb, ph)

def g(v):
    """Zahl fuer die JS-Ausgabe: ganze Zahlen ohne Komma."""
    return str(int(v)) if float(v) == int(v) else str(round(float(v), 4))

# ================================================================ Die zwoelf Bahnen
# 1-4 fuehren ein bis zwei Maschinen ein, 5-8 mischen sie, 9-11 kombinieren, 12 ist der Hoehepunkt.
# Das Kupferrohr kommt ab Bahn 4 vor, die Hemmung ab Bahn 5 - beide nicht auf jeder Bahn.

# ---------------------------------------------------------------- 1 Marktplatz (einfach)
k = Karte(28, 11)
k.rect(2, 2, 25, 8)
k.rect(13, 2, 13, 8, 'x'); k.put(13, 5, '#')      # Mauer mit einer einzigen Tuer
k.put(4, 5, 'T'); k.put(23, 5, 'H')
bahn(name='Marktplatz', par=3, theme='clocktown', maxStrokes=12, seed=71, dichte=0.12,
     intro='Der Platz unter der Stadtuhr. Durch die Mauer führt eine einzige Tür, und vor ihr schwingt '
           'das große Pendel. Zweimal je Schwingung gibt es die Tür frei – dann muss der Ball hindurch.',
     obstacles=[pendeltor(k, 'Marktplatz', 13.5, 5.5, 2.0)],
     decor=[('clock', 13, 0.5, 2.2), ('lantern', 4.5, 0.6, 1), ('lantern', 23.5, 0.6, 1),
            ('barrel', 0.9, 5.5, 1), ('crate', 26.8, 3.4, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 2 Glockengasse (einfach)
k = Karte(32, 11)
k.rect(2, 2, 29, 8)
for cx in (11, 21):
    k.rect(cx, 2, cx, 8, 'x'); k.put(cx, 5, '#')
k.put(4, 5, 'T'); k.put(27, 5, 'H')
bahn(name='Glockengasse', par=3, theme='clocktown', maxStrokes=14, seed=23, dichte=0.12,
     intro='Zwei Türen, zwei Pendel – und sie gehen versetzt. Wer die erste im richtigen Moment nimmt, '
           'steht vor der zweiten zur falschen Zeit. Einmal zusehen lohnt sich mehr als jeder feste Schlag.',
     obstacles=[pendeltor(k, 'Glockengasse A', 11.5, 5.5, 2.0),
                pendeltor(k, 'Glockengasse B', 21.5, 5.5, 2.0, phase=0.5)],
     decor=[('clock', 16, 0.5, 2.2), ('bell', 8.5, 9.6, 1.2), ('bell', 24.5, 9.6, 1.2),
            ('lantern', 16, 9.7, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 3 Raederwerkstatt (einfach)
k = Karte(32, 11)
k.rect(2, 2, 11, 8)                                # diesseits
k.rect(19, 2, 29, 8)                               # jenseits
k.rect(25, 2, 25, 8, 'x'); k.put(25, 5, '#')       # Tür vor dem Loch
k.put(4, 5, 'T'); k.put(28, 5, 'H')
bahn(name='Räderwerkstatt', par=4, theme='clocktown', maxStrokes=16, seed=44, dichte=0.12,
     intro='Zwischen den Hallen liegt nichts als Luft; hinüber tragen nur die Zahnräder. Sie halten an '
           'jedem Ufer kurz an – das ist der Moment zum Einsteigen. Drüben wartet noch ein Pendel.',
     obstacles=[zahnradfeld(k, 'Räderwerkstatt', 11.5, 5.5, 19.5, 5.5, wait=2.8),
                pendeltor(k, 'Räderwerkstatt', 25.5, 5.5, 2.0, phase=0.35)],
     decor=[('clock', 15, 0.5, 2.0), ('lantern', 5.5, 0.6, 1), ('lantern', 27.5, 0.6, 1),
            ('gearFlat', 15, 9.5, 1.6), ('crate', 0.9, 5.5, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 4 Rohrpost (einfach, erstes Kupferrohr)
k = Karte(32, 11)
k.rect(2, 2, 12, 8)
k.rect(13, 2, 13, 8, 'x')                          # geschlossene Wand: kein Tor
k.rect(14, 2, 29, 8)
k.rect(25, 2, 25, 8, 'x'); k.put(25, 5, '#')
k.put(12, 5, 'A'); k.put(20, 2, 'a')               # Rohrmund und Rohrende
k.put(4, 5, 'T'); k.put(28, 5, 'H')
bahn(name='Rohrpost', par=4, theme='boiler', maxStrokes=16, seed=88, dichte=0.12,
     intro='Die Wand hat kein Tor. Hinüber führt nur das Kupferrohr – und in das kommt man immer, '
           'auch ganz sacht. Die Leitung läuft über die Wand hinweg, man sieht den Ball darin fahren '
           'und weiß schon vorher, wo er ankommt. Hinter der Wand wirft ihn das Rohrende in die '
           'Kesselhalle, wo wieder ein Pendel vor der Tür steht.',
     obstacles=[rohr(k, 'Rohrpost', 'A', 90),
                pendeltor(k, 'Rohrpost', 25.5, 5.5, 2.0)],
     decor=[('lantern', 5.5, 0.6, 1), ('lantern', 21.5, 9.6, 1), ('barrel', 30.8, 5.5, 1),
            ('gearFlat', 8.5, 9.5, 1.4)],
     map=k.rows())

# ---------------------------------------------------------------- 5 Hemmwerk (mittel, erste Hemmung)
k = Karte(32, 11)
k.rect(2, 3, 29, 7)
k.rect(22, 3, 22, 7, 'x'); k.put(22, 5, '#')
k.put(4, 5, 'T'); k.put(27, 5, 'H')
bahn(name='Hemmwerk', par=4, theme='escapement', maxStrokes=16, seed=12, dichte=0.1,
     intro='Die Hemmung sperrt immer eine Hälfte des Ganges und gibt die andere frei; alle paar '
           'Sekunden wechselt sie. Beim Umschlagen sind beide Klinken kurz unten. Dahinter steht das '
           'Pendel vor der Tür – und hinter der Tür bleibt das Loch nicht liegen: Es springt alle '
           'zehn Sekunden eine Stelle weiter. Der leuchtende Ring sagt, wohin als Nächstes.',
     obstacles=[hemmung(k, 'Hemmwerk', 12.5, 5.5, ('y', 5)),
                pendeltor(k, 'Hemmwerk', 22.5, 5.5, 3.0, amp=60),
                wanderloch(k, 'Hemmwerk', [(27.5, 3.5), (27.5, 5.5), (27.5, 7.5)])],
     decor=[('gearFlat', 16, 1.4, 1.8), ('lantern', 8.5, 9.5, 1), ('lantern', 24.5, 9.5, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 6 Federkammer (mittel)
k = Karte(32, 13)
k.rect(2, 4, 12, 9)                                # Abschlagskammer
k.rect(21, 3, 29, 10)                              # Landekammer
k.put(4, 6, 'T'); k.put(28, 7, 'H')
bahn(name='Federkammer', par=4, theme='boiler', maxStrokes=16, seed=61, dichte=0.12,
     intro='Über die Kluft kommt nur, wer sich einspannen lässt. Die Feder schwenkt langsam hin und '
           'her – der leuchtende Punkt zeigt, wo der Ball landen wird. Drüben teilt die Hemmung die '
           'Kammer, und der Weg zum Loch führt nur durch die offene Hälfte.',
     obstacles=[federwerk(k, 'Federkammer', 8.5, 6.5, 0, rng=12, amp=0.22, speed=0.8),
                hemmung(k, 'Federkammer', 25.5, 7, ('y', 8))],
     decor=[('lantern', 5.5, 2.5, 1), ('lantern', 24.5, 1.5, 1), ('barrel', 16, 6.5, 1),
            ('gearFlat', 16, 10.5, 1.4)],
     map=k.rows())

# ---------------------------------------------------------------- 7 Zeigerhof (mittel)
k = Karte(32, 15)
k.rect(2, 6, 9, 8)                                 # Gasse zum Hof
k.scheibe(16, 7.5, 6)                              # der runde Hof
k.rect(26, 6, 29, 9)                               # Podest mit dem Loch
k.put(4, 7, 'T'); k.put(28, 7, 'H')
bahn(name='Zeigerhof', par=3, theme='clocktown', maxStrokes=14, seed=5, dichte=0.1,
     intro='Der runde Hof unter dem großen Zeiger. Er braucht zwölf Sekunden für eine Runde und '
           'schiebt alles vor sich her, was auf dem Pflaster liegt – hinüber kommt man nur hinter '
           'ihm her. Am anderen Rand tragen die Zahnräder auf das Podest.',
     obstacles=[zeigerarm(k, 'Zeigerhof', 16, 7.5, r=4.5),
                zahnradfeld(k, 'Zeigerhof', 21.5, 7.5, 26.5, 7.5, wait=2.0, travel=2.6)],
     decor=[('clock', 16, 0.6, 2.4), ('lantern', 5.5, 4.5, 1), ('lantern', 27.5, 4.5, 1),
            ('gearFlat', 16, 13.6, 1.6)],
     map=k.rows())

# ---------------------------------------------------------------- 8 Kesselhaus (mittel)
k = Karte(34, 13)
k.rect(2, 4, 11, 9)                                # Vorhalle
k.rect(12, 4, 12, 9, 'x')                          # dichte Wand
k.rect(13, 2, 22, 10)                              # Kesselhalle
k.rect(27, 4, 31, 9)                               # Podest
k.rect(7, 4, 7, 9, 'x'); k.put(7, 6, '#')          # Tür in der Vorhalle
k.put(11, 6, 'A'); k.put(17, 2, 'a')
k.put(3, 6, 'T'); k.put(30, 6, 'H')
bahn(name='Kesselhaus', par=4, theme='boiler', maxStrokes=16, seed=93, dichte=0.12,
     intro='Erst durch die Tür, dann ins Rohr – die Tür will abgepasst sein, das Rohr nimmt einen '
           'immer. In der Kesselhalle wartet die Feder, die als Einzige über die Glut auf das Podest '
           'wirft. Und auf dem Podest wandert das Loch zwischen zwei Stellen hin und her: Die helle '
           'ist die nächste.',
     obstacles=[pendeltor(k, 'Kesselhaus', 7.5, 6.5, 4.0, amp=60),
                rohr(k, 'Kesselhaus', 'A', 90),
                federwerk(k, 'Kesselhaus', 20.5, 6.5, 0, rng=9, amp=0.2, speed=0.75),
                wanderloch(k, 'Kesselhaus', [(30.5, 5.5), (30.5, 7.5)])],
     decor=[('lantern', 4.5, 2.5, 1), ('barrel', 24.5, 6.5, 1), ('crate', 24.5, 9.5, 1),
            ('gearFlat', 17, 11.6, 1.5)],
     map=k.rows())

# ---------------------------------------------------------------- 9 Glockenturm (schwer)
k = Karte(34, 15)
k.rect(2, 3, 31, 11)
k.rect(12, 3, 12, 11, 'x'); k.put(12, 7, '#')
k.put(4, 7, 'T'); k.put(30, 10, 'H')
bahn(name='Glockenturm', par=5, theme='clocktown', maxStrokes=20, seed=145, dichte=0.1,
     intro='Die Glockenstube: erst das Pendel vor der Tür, dann die Hemmung quer durch die Halle, '
           'und vor dem Loch schwingt noch ein zweites Pendel. Drei Takte, und keiner passt zum '
           'anderen – hier gewinnt, wer wartet, nicht wer fest schlägt.',
     obstacles=[pendeltor(k, 'Glockenturm Tür', 12.5, 7.5, 3.0, amp=60),
                hemmung(k, 'Glockenturm', 22.5, 7.5, ('y', 9), phase=0.5),
                pendeltor(k, 'Glockenturm Loch', 28, 7.5, 3.0, amp=60, phase=0.25)],
     decor=[('bell', 6.5, 1.4, 1.4), ('bell', 27.5, 1.4, 1.4), ('clock', 17, 0.8, 2.2),
            ('lantern', 17, 13.6, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 10 Raederschacht (schwer)
k = Karte(36, 15)
k.rect(2, 5, 8, 10)                                # Einstieg
k.scheibe(17, 7.5, 5.5)                            # Zwischenscheibe unter dem Zeiger
k.rect(27, 4, 33, 11)                              # Ausstieg
k.put(4, 7, 'T'); k.put(32, 8, 'H')
bahn(name='Räderschacht', par=5, theme='escapement', maxStrokes=20, seed=207, dichte=0.1,
     intro='Zwei Zahnradfelder, dazwischen die Scheibe unter dem Zeiger. Beide Felder halten nur '
           'kurz an, und der Zeiger räumt die Scheibe alle zwölf Sekunden einmal leer. Am Ausstieg '
           'teilt die Hemmung den Weg zum Loch – und das Loch selbst wandert dort zwischen drei '
           'Stellen. Die helle Stelle ist die nächste.',
     obstacles=[zahnradfeld(k, 'Räderschacht A', 8.5, 7.5, 11.5, 7.5, wait=2.0, travel=2.2),
                zeigerarm(k, 'Räderschacht', 17, 7.5, r=4.2, phase=0.25),
                zahnradfeld(k, 'Räderschacht B', 22.5, 7.5, 27.5, 7.5, wait=2.0, travel=2.8, phase=0.4),
                hemmung(k, 'Räderschacht', 30, 8, ('y', 8), phase=0.5),
                wanderloch(k, 'Räderschacht', [(32.5, 5.5), (32.5, 7.5), (32.5, 9.5)])],
     decor=[('gearFlat', 17, 1.4, 1.8), ('gearFlat', 17, 13.6, 1.6),
            ('lantern', 5.5, 2.5, 1), ('lantern', 30.5, 2.5, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 11 Kupferlabyrinth (schwer)
k = Karte(36, 15)
k.rect(2, 4, 10, 10)                               # Kammer A
k.rect(11, 4, 11, 10, 'x')
k.rect(12, 2, 22, 12)                              # Kammer B
k.rect(23, 2, 23, 12, 'x')
k.rect(24, 4, 29, 10)                              # Kammer C, diesseits
k.rect(32, 4, 34, 10)                              # Kammer C, jenseits
k.put(10, 7, 'A'); k.put(16, 2, 'a')
k.put(22, 7, 'B'); k.put(27, 4, 'b')
k.put(4, 7, 'T'); k.put(34, 9, 'H')
bahn(name='Kupferlabyrinth', par=5, theme='boiler', maxStrokes=20, seed=311, dichte=0.12,
     intro='Drei Kammern, und zwischen ihnen führt kein Weg – nur die Rohre. Hinein kommt man immer; '
           'schwer ist, was dazwischen liegt: Zwischen den beiden Leitungen steht die Hemmung, und '
           'nur durch die offene Hälfte geht es weiter zum zweiten Rohrmund. Am Ende wirft die '
           'Feder über die letzte Kluft.',
     obstacles=[rohr(k, 'Kupferlabyrinth A', 'A', 90),
                hemmung(k, 'Kupferlabyrinth', 19, 7.5, ('y', 11)),
                rohr(k, 'Kupferlabyrinth B', 'B', 90),
                federwerk(k, 'Kupferlabyrinth', 27.5, 7.5, 0, rng=5, amp=0.2, speed=0.85)],
     decor=[('lantern', 5.5, 2.5, 1), ('lantern', 17, 13.6, 1), ('barrel', 30.5, 7.5, 1),
            ('crate', 30.5, 4.5, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 12 Das grosse Zifferblatt (Hoehepunkt)
k = Karte(30, 22)
k.scheibe(15, 10.5, 9.7)                           # groesser als vorher: Der Abschlag braucht Platz
k.put(15, 4, 'H')                                  # erste Marke, oben auf zwoelf Uhr
k.put(15, 20, 'T')                                 # ganz aussen am Blattrand. Er darf weder auf einer
                                                   # Marke stehen (dort laege der Ball beim Start schon
                                                   # im Loch) noch unter dem grossen Zeiger, der bis
                                                   # r=7.2 streicht - beides prueft das Skript unten.
bahn(name='Das große Zifferblatt', par=6, theme='escapement', maxStrokes=26, seed=1200, dichte=0.08,
     intro='Die Schlussbahn steht auf dem Zifferblatt des Turms – und hier bleibt das Loch nicht '
           'liegen. Alle zehn Sekunden springt es eine Stundenmarke weiter, immer im Uhrzeigersinn. '
           'Der leuchtende Ring zeigt, wohin als Nächstes und wie lange noch. Über die Marken selbst '
           'streicht der große Zeiger und schiebt alles vor sich her – wer zu früh dort liegt, wird '
           'weggeräumt. Darunter gehen '
           'die drei Zeiger des Werks – jeder anders schnell und jeder anders: Der blaue '
           'Stundenzeiger bremst, was in seinem Feld liegt, der grüne Minutenzeiger drückt den Ball '
           'weg, und der rote Sekundenzeiger reißt ihn mit sich herum. Dazu zwei Pendel über dem '
           'Blatt. Hier zählt nur eines: im richtigen Moment am richtigen Ort zu sein.',
     obstacles=[zifferblatt(k, 'Zifferblatt', 15, 10.5, r=6.5),
                zeigerarm(k, 'Zifferblatt', 15, 10.5, r=7.2),
                zeigerwerk(k, 'Zifferblatt', 15, 10.5, r=6.2),
                pendeltor(k, 'Zifferblatt links', 10, 10.5, 6.5, amp=45),
                pendeltor(k, 'Zifferblatt rechts', 20, 10.5, 6.5, amp=45, phase=0.5)],
     decor=[('clock', 15, 0.8, 2.6), ('bell', 4.5, 3.5, 1.3), ('bell', 25.5, 3.5, 1.3),
            ('lantern', 4.5, 17.5, 1), ('lantern', 25.5, 17.5, 1)],
     map=k.rows())

# ---------------------------------------------------------------- 13 Maschinenprobe (Testbahn Ebenen)
# Schlicht mit Absicht: Sie zeigt alle vier Wege nach oben und den einen nach unten, nebeneinander.
# Unten drei Aufstiege zur Wahl, oben die Luke im Weg und das Rohr auf die oberste Etage.
k = Karte(30, 13)
k.rect(2, 3, 28, 9)                                # unterste Ebene: groesser als die daruber,
k.put(3, 6, 'T')                                   # damit man nach jedem Sturz auch Boden trifft

o = Karte(30, 13)                                  # mittlere Ebene
o.rect(7, 4, 24, 8)
o.rect(25, 4, 25, 8, 'o')                          # offene Kante nach unten
o.put(23, 6, 'A')                                  # Rohrmund hinauf zur obersten Ebene

p2 = Karte(30, 13)                                 # oberste Ebene
p2.rect(18, 4, 26, 8)
p2.rect(27, 4, 27, 8, 'o')                         # offene Kante: von hier faellt man ganz nach unten
p2.put(19, 6, 'a')                                 # Rohrende (Mauer, der Ball wird davor gesetzt)
p2.put(25, 6, 'H')                                 # das Loch liegt ganz oben, kurz vor der Kante

bahn(name='Maschinenprobe', par=4, theme='escapement', maxStrokes=14, seed=77, dichte=0.1,
     intro='Eine Probe für die Maschinen zwischen den Ebenen. Unten stehen drei Aufstiege '
           'nebeneinander: Die Turbine hebt sofort, der Kettenzug nur, wenn gerade ein Haken unten '
           'ist, und die Zahnstange nimmt mit, wer beim Losfahren auf der Schaufel steht. Oben liegt '
           'die Luke im Weg – zu ist sie Boden, offen ein Loch. Ganz nach oben führt nur das '
           'Kupferrohr. Gestürzt wird hier nie mit Strafschlag, nur mit Zeitverlust.',
     obstacles=[turbine(k, o, 'Maschinenprobe', 8.5, 6.5),
                kettenzug(k, o, 'Maschinenprobe', 13.5, 6.5),
                zahnstange(k, o, 'Maschinenprobe', 18.5, 6.5),
                luke([k, o, p2], 'Maschinenprobe', 16.5, 6.5, ebene=1),
                rohr(o, 'Maschinenprobe', 'A', 0, ziel=(p2, 2), ebene=1)],
     decor=[('lantern', 5.5, 2.5, 1), ('lantern', 22.5, 10.5, 1), ('gearFlat', 12, 11.0, 1.4)],
     map=k.rows(), ebenen=[o.rows(), p2.rows()])

# ================================================================ Ausgabe
for b in BAHNEN:
    rows = b['map']
    txt = '\n'.join(rows)
    ebenen = b.get('ebenen') or []
    otxt = '\n'.join('\n'.join(e) for e in ebenen)
    assert txt.count('T') == 1, b['name']
    # Das Loch liegt auf genau einer Ebene - alle Karten zusammen haben genau ein 'H'
    assert txt.count('H') + otxt.count('H') == 1, b['name']
    assert otxt.count('T') == 0, b['name']
    for e in ebenen:
        assert len(e) == len(rows) and all(len(a) == len(c) for a, c in zip(e, rows)), b['name']
    if ebenen:
        # Jede Ebene ueber der untersten braucht einen Aufstieg von der Ebene darunter. Turbine,
        # Kettenzug, Zahnstange und ein Rohr mit 'ziel' zaehlen gleichermassen.
        heber = [o for o in b['obstacles']
                 if any(t in o for t in ("'turbine'", "'kettenzug'", "'zahnstange'")) or "ziel:" in o]
        for n in range(1, len(ebenen) + 1):
            drauf = [o for o in heber if ("ebene: %d" % (n - 1)) in o or (n == 1 and 'ebene:' not in o)]
            assert drauf, f"{b['name']}: kein Aufstieg von Ebene {n - 1} auf Ebene {n}"
    # Deko steht neben der Bahn, nie darauf: Eine Laterne auf dem Pflaster sähe aus wie ein
    # Hindernis, wäre aber keins - der Ball rollte einfach hindurch.
    for (t, x, y, sc) in b['decor']:
        ch = rows[int(y)][int(x)] if 0 <= int(y) < len(rows) and 0 <= int(x) < len(rows[0]) else '.'
        assert ch not in FLOOR, f"{b['name']}: Deko {t} bei ({x},{y}) steht auf dem Fairway ('{ch}')"
    print(f"{b['name']:22s} {len(rows[0])}x{len(rows)} Par {b['par']}")

def js_map(rows, extra=""):
    return '\n'.join("      %s'%s'," % (extra, r) for r in rows)

def js_decor(d):
    return '\n'.join("      { t: '%s', x: %s, y: %s, s: %s }," % (t, g(x), g(y), g(s)) for (t, x, y, s) in d)

kopf = '''/* Uhrenturm (Weltkennung 'clock'): zwölf Bahnen in einer Stadt, die im Takt läuft.

   Der rote Faden ist die Zeit. Jede andere Welt fragt, wie fest und wohin man schlägt; diese fragt
   zuerst *wann*. Darum steht auf jeder Bahn mindestens eine Maschine vor einer Stelle, an der kein
   Weg vorbeiführt – eine Tür, eine Lücke, ein Rohr –, und sie gibt diese Stelle nur zeitweise frei.
   Wer zusieht und mitzählt, kommt durch; wer nur fest schlägt, nicht.

   Aufbau: Bahn 1 bis 4 führen je ein bis zwei Maschinen ein, 5 bis 8 mischen sie, 9 bis 11
   kombinieren, und 12 ist der Höhepunkt. Das Kupferrohr kommt erst ab Bahn 4 vor, die Hemmung erst
   ab Bahn 5 – und beide bewusst nicht auf jeder Bahn, damit sie nicht zur Gewohnheit werden.

   Das wandernde Loch steht auf Bahn 5, 8, 10 und - als ganzes Zifferblatt mit zwoelf Stundenmarken
   - auf Bahn 12. Es springt alle zehn Sekunden eine Stelle weiter. Was das Loch tut, macht das
   Hindernis 'wanderloch' selbst; das 'H' der Karte steht auf seiner ersten Stelle, damit die Bahn
   auch ohne laufende Uhr ein Ziel hat.

   Auf Bahn 12 gehen ausserdem die drei Zeiger des Turms ('handclock'): Sie sind keine Mauern,
   sondern fuehren Felder mit sich - der langsame Stundenzeiger bremst, der Minutenzeiger stoesst
   weg, der schnelle Sekundenzeiger zieht an.

   Die Kupferrohre stehen nicht als Koordinaten in der Hindernisliste, sondern als Buchstaben in der
   Karte: Der Großbuchstabe ist der Rohrmund, der gleiche Kleinbuchstabe das Rohrende (A/a, B/b).
   In der Liste steht je Paar nur, in welche Richtung es ausspuckt ('angle' in Grad).

   Die Karten dieser Datei entstehen mit tools/uhrenturm.py aus Rechtecken und Scheiben. Das Skript
   prüft schon beim Bauen, was sonst erst im Spiel auffiele: dass jeder Punkt, den eine Maschine
   braucht, auf der Bahn liegt – der Umkehrpunkt eines Pendels, das Ende eines Zahnradfelds, der
   Landepunkt einer Feder, jede Marke des Zifferblatts.

   Sonst gilt dieselbe Kartenlegende wie in courses.js. Winkel in Grad, wo nicht anders vermerkt
   (Feder und Rohr rechnen intern im Bogenmaß), Zeiten in Sekunden, Koordinaten in Kacheln. */
const CLOCK_COURSES = [
'''

teile = [kopf]
for b in BAHNEN:
    teile.append("  {\n")
    teile.append("    name: '%s', par: %d, theme: '%s', maxStrokes: %d,\n"
                 % (b['name'], b['par'], b['theme'], b['maxStrokes']))
    teile.append("    intro: '%s',\n" % b['intro'].replace("'", "\\'"))
    teile.append("    map: [\n%s\n    ],\n" % js_map(b['map']))
    if b.get('ebenen'):                                # weitere Spielebenen, gleich gross wie die unterste
        teile.append("    ebenen: [\n%s\n    ],\n"
                     % '\n'.join("      [\n%s\n      ]," % js_map(e, "  ") for e in b['ebenen']))
    teile.append("    obstacles: [\n" + '\n'.join('      %s,' % o for o in b['obstacles']) + "\n    ],\n")
    teile.append("    decor: [\n%s\n    ],\n" % js_decor(b['decor']))
    teile.append("    autoDecor: { density: %s, seed: %d },\n" % (b['dichte'], b['seed']))
    teile.append("  },\n")
teile.append("];\n")

ziel = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'src', 'courses_clock.js')
open(ziel, 'w', encoding='utf-8').write(''.join(teile))
print('geschrieben')
