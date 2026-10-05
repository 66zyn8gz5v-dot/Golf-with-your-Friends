"""Der Alte Platz – zehn Bahnen Minigolf, wie es wirklich ist.

    python3 tools/altplatz.py        schreibt src/courses_altplatz.js

WARUM ES DIESE WELT GIBT. Fynn: „Ich möchte eine neue Welt wie das Märchenland und co." Und
gleich danach: „Aber wir brauchen auch Hindernisse." Beides zusammen ergibt die eine Welt, die
in diesem Spiel noch fehlte – die, in der die FORM die Arbeit macht und die Maschinen nur
mitspielen, statt die Bahn zu sein.

Alle anderen Welten sind um eine Maschine herum gebaut: die Mine um die Lampe, die Flut um den
Wasserstand, das Zauberreich um die Blüte, die Loge um die Schleuder. Hier ist es umgekehrt. Die
Aufgabe steckt im Grundriß – im Winkel, in der Enge, im Sand, im Bogen um das Hindernis herum –,
und die vier Maschinen, die vorkommen, sind die vier, die auf jedem echten Minigolfplatz stehen:
die Mühle, der Tunnel, die Klappe und der Prellbock.

DIE REGELN DIESER WELT, und sie sind Verzicht:
  * KEIN ABGRUND. Jede Bahn ist ringsum ummauert. Wer schlecht spielt, liegt schlecht – er ist
    nicht weg. Das ist der Unterschied zwischen einer Normalwelt und einer Legendenwelt.
  * NICHTS FLIEGT. Keine Schanze, keine Kanone, kein Aufwind. Der Ball bleibt auf dem Boden,
    und damit bleibt alles vorhersagbar.
  * KEINE WIRKUNGSFELDER. Kein Schub, kein Zug, kein Wirbel. Was den Ball ablenkt, kann man
    ansehen: eine Wand, eine Schräge, ein Klotz.
  * JEDE AUSSENECKE IST ABGESCHRÄGT. Die Lehre aus der Erzmagierloge: Eine rechtwinklige Kehre
    schluckt den Ball, eine schräge gibt ihn weiter. Auf einem Platz, auf dem man mit Bande
    spielt, ist das keine Feinheit, sondern die Grundlage.

Die Bauklötze stehen in tools/zauber.py. Sie werden von dort geholt statt abgeschrieben: Es sind
vierhundert Zeilen, und zwei Abschriften einer Prüfung sind schlimmer als keine – die eine wird
irgendwann verbessert und die andere nicht.
"""
import io
import math
from collections import deque

_Q = io.open('tools/zauber.py', encoding='utf-8').read()
exec(_Q[:_Q.index('# ===========================================================================')])
exec(_Q[_Q.index('def wert(v):'):_Q.index('KOPF = ')])
WELTEN.clear()

PLATZ = welt('altplatz', 'ALTPLATZ_COURSES', 'Der Alte Platz')
T = 'altplatz'

# --- 1 -----------------------------------------------------------------------
# Der Anstoß. Die erste Bahn jedes Platzes ist eine Gerade mit einem Stein darin - damit man
# einmal schlägt, bevor man etwas können muß.
f = leer(28, 12)
fuell(f, 2, 3, 25, 8)
fuell(f, 12, 3, 13, 6, 'x')            # der Stein, er läßt unten durch
setz(f, 4, 7, 'T'); setz(f, 23, 4, 'H')
bahn(PLATZ, 'Der Anstoß', T, f, [], par=2,
     intro='Die erste Bahn: eine Gerade, ein Stein darin. Unten ist Platz. Mehr muß eine erste '
           'Bahn nicht wollen.')

# --- 2 -----------------------------------------------------------------------
# Der Knick. Das Winkelstück - und die Ecke ist abgeschrägt, damit der Ball um sie herumkommt,
# statt in ihr liegenzubleiben.
f = leer(28, 17)
fuell(f, 2, 3, 20, 7)
fuell(f, 16, 3, 20, 14)
keil(f, 20, 3, 4, 'ro')                # die Außenecke der Kehre
setz(f, 4, 5, 'T'); setz(f, 18, 12, 'H')
bahn(PLATZ, 'Der Knick', T, f, [], par=3,
     intro='Rechts herum, und in der Ecke steht keine Kante, sondern eine Schräge. Wer mit '
           'Schwung hineinspielt, kommt um sie herum.')

# --- 3 -----------------------------------------------------------------------
# Die Pyramide. Der Klassiker: ein Hindernis mitten im Feld, an dem man vorbei oder von dem man
# abprallen muß. Als Raute aus vier Banden - sie weist nach allen vier Seiten im Winkel ab.
f = leer(30, 17)
fuell(f, 2, 3, 27, 14)
setz(f, 4, 8, 'T'); setz(f, 25, 8, 'H')
bahn(PLATZ, 'Die Pyramide', T, f, raute(15.0, 8.5, 3.4) + [
    pilz(15.0, 3.6, stil='mushroom'),
    pilz(15.0, 13.4, stil='mushroom'),
], par=3,
     intro='Mitten im Feld steht die Pyramide. Wer sie mittig trifft, bekommt den Ball zurück; '
           'wer sie streift, wird abgelenkt. Oben und unten herum geht es auch – nur steht da '
           'je ein Prellbock im Weg.')

# --- 4 -----------------------------------------------------------------------
# Die Mühle. Die berühmteste Bahn der Welt, und sie ist einfach: eine Mauer mit einem Tor, und
# im Tor dreht sich das Flügelrad. Man wartet, bis es aufgeht, und schlägt dann.
f = leer(32, 13)
fuell(f, 2, 3, 29, 9)
fuell(f, 14, 3, 15, 4, 'x')            # die Mauer, sie läßt in der Mitte ein Tor
fuell(f, 14, 8, 15, 9, 'x')
setz(f, 4, 6, 'T'); setz(f, 27, 6, 'H')
bahn(PLATZ, 'Die Mühle', T, f, [
    muehle(14.5, 6.0, w=3.4, gap=1.4, tempo=0.85, achse='y', tiefe=2.0),
], par=3,
     intro='Die Mühle. Durch das Tor kommt nur, wer den Augenblick abpaßt, in dem der Flügel '
           'oben steht. Zu früh ist dasselbe wie zu spät.')

# --- 5 -----------------------------------------------------------------------
# Der Tunnel. Zwei Felder, dazwischen eine Mauer - und ein Rohr hindurch. Außen herum geht es
# auch, es dauert nur.
f = leer(32, 15)
fuell(f, 2, 3, 29, 12)
fuell(f, 14, 3, 15, 9, 'x')            # die Mauer, unten bleibt der lange Weg frei
setz(f, 4, 6, 'T'); setz(f, 27, 5, 'H')
setz(f, 12, 6, 'A'); setz(f, 17, 6, 'a')
bahn(PLATZ, 'Der Tunnel', T, f, [
    rohr('A', grad=0, stil=None),
    pilz(22.0, 9.0, stil='mushroom'),
], par=3,
     intro='Der Tunnel nimmt den Ball auf der einen Seite und gibt ihn auf der anderen wieder '
           'heraus. Wer sein Maul verfehlt, geht unten herum – das kostet einen Schlag.')

# --- 6 -----------------------------------------------------------------------
# Die Sandbahn. Kein Hindernis, nur Untergrund: Die Mitte ist Sand und frißt Tempo, der schnelle
# Weg ist ein schmaler Streifen Grün am Rand.
f = leer(32, 13)
fuell(f, 2, 3, 29, 9)
fuell(f, 8, 3, 24, 7, 's')             # das Sandfeld, oben bleibt ein Streifen Grün
fuell(f, 17, 8, 18, 9, 'x')            # und ein Klotz, damit der Streifen nicht gerade durchgeht
setz(f, 4, 8, 'T'); setz(f, 27, 5, 'H')
bahn(PLATZ, 'Die Sandbahn', T, f, [], par=3,
     intro='In der Mitte liegt Sand, und Sand frißt Tempo. Am oberen Rand bleibt ein Streifen '
           'Grün – er ist schmal, und ein Klotz steht auch noch darin.')

# --- 7 -----------------------------------------------------------------------
# Die Brücke. Ein Wasserfeld, darüber ein Steg von drei Kacheln. Beide Enden sind abgeschrägt,
# damit man den Steg anspielen kann, statt ihn treffen zu müssen.
f = leer(34, 17)
fuell(f, 2, 3, 31, 14)
fuell(f, 10, 3, 23, 14, 'w')           # das Wasser
fuell(f, 10, 7, 23, 9)                 # und der Steg darüber
# DAS LOCH LIEGT NICHT IN DER FLUCHT DES STEGS. Stünde es dort, wäre die Bahn mit einem einzigen
# geraden Schlag erledigt - ein Steg ist eine schöne Form, aber für sich genommen keine Aufgabe.
# So muß man hinüber UND danach noch einmal abbiegen.
setz(f, 5, 8, 'T'); setz(f, 28, 12, 'H')
bahn(PLATZ, 'Die Brücke', T, f, [
    pilz(26.5, 8.5, stil='mushroom'),
    pilz(29.5, 5.5, stil='mushroom'),
], par=4,
     intro='Drei Kacheln breit, und links und rechts ist Wasser. Hinüber hilft kein Trick, nur '
           'eine gerade Linie – und drüben liegt das Loch nicht da, wo der Steg hinzeigt.')

# --- 8 -----------------------------------------------------------------------
# Der Trichter. Die Wände laufen auf das Loch zu, aber der Eingang liegt nicht in der Mitte:
# Wer mittig spielt, prallt an der Schräge ab und muß von vorn anfangen.
f = leer(30, 17)
fuell(f, 2, 3, 11, 13)                 # das Vorfeld
fuell(f, 11, 9, 27, 13)                # der Hals, unten
fuell(f, 20, 3, 27, 13)                # und die Kammer mit dem Loch
keil(f, 11, 3, 6, 'ro')                # die Schräge, die zum Hals hinunterführt
keil(f, 27, 3, 4, 'ro')
setz(f, 4, 6, 'T'); setz(f, 24, 6, 'H')
bahn(PLATZ, 'Der Trichter', T, f, [
    gatter(16.0, 11.0, w=2.6, period=5.0, offen=0.55, achse='x'),
], par=3,
     intro='Die Wand oben läuft schräg zum Hals hinunter – wer sie richtig anspielt, wird '
           'hineingelenkt. Im Hals liegt die Klappe und macht im Takt zu.')

# --- 9 -----------------------------------------------------------------------
# Die Schleife. Eine Insel mitten im Feld, und das Loch liegt dahinter: Man kommt oben oder unten
# herum, und beide Wege sind gleich lang. Die Wahl liegt darin, was einem unterwegs begegnet.
f = leer(34, 19)
fuell(f, 2, 3, 31, 16)
fuell(f, 11, 7, 22, 12, 'x')           # die Insel
keil(f, 2, 3, 3, 'lo'); keil(f, 31, 3, 3, 'ro')
keil(f, 2, 16, 3, 'lu'); keil(f, 31, 16, 3, 'ru')
setz(f, 5, 10, 'T'); setz(f, 28, 10, 'H')
bahn(PLATZ, 'Die Schleife', T, f, [
    # OBEN EINE KLAPPE, KEINE MÜHLE. Die Mühle muß ihren Gang ganz zusperren, sonst ist sie
    # Schmuck - und hier ist der „Gang" die ganze Höhe des Feldes, weil die Insel ihn nur
    # unterbricht. Eine Klappe darf einen Durchlaß offenlassen; genau das soll sie hier.
    gatter(16.5, 4.5, w=3.0, period=4.8, offen=0.5, achse='x'),
    pilz(16.5, 14.5, stil='mushroom'),
    pilz(13.0, 14.5, stil='mushroom'),
    pilz(20.0, 14.5, stil='mushroom'),
], par=4,
     intro='Die Insel steht im Weg, und beide Wege außen herum sind gleich lang. Oben liegt die '
           'Klappe und macht im Takt zu; unten stehen drei Prellböcke und lassen immer durch – '
           'aber nicht dahin, wo man wollte.')

# --- 10 ----------------------------------------------------------------------
# Die Lange Bahn. Der Abschluß: drei Kehren, alle abgeschrägt, eine Klappe in der Mitte und zum
# Schluß der schmale Hals vor dem Loch. Nichts davon ist schwer; alles zusammen ist es.
f = leer(38, 19)
fuell(f, 2, 3, 16, 7)                  # erster Lauf
fuell(f, 12, 3, 16, 15)                # hinunter
fuell(f, 12, 11, 30, 15)               # zweiter Lauf
fuell(f, 26, 5, 30, 15)                # hinauf
fuell(f, 26, 5, 35, 9)                 # dritter Lauf zum Loch
keil(f, 16, 3, 4, 'ro')
keil(f, 12, 15, 4, 'lu')
keil(f, 30, 15, 4, 'ru')
keil(f, 26, 5, 4, 'lo')
setz(f, 4, 5, 'T'); setz(f, 34, 7, 'H')
bahn(PLATZ, 'Die Lange Bahn', T, f, [
    gatter(14.0, 9.0, w=2.6, period=4.6, offen=0.5, achse='y'),
    pilz(21.0, 13.0, stil='mushroom'),
    # HIER STAND EINE MÜHLE, dreimal an drei Stellen, und dreimal hat die Prüfung sie
    # zurückgewiesen: Eine Mühle muß ihren Gang GANZ zusperren, sonst ist sie Schmuck - und auf
    # dieser Bahn ist jeder Gang entweder neunzehn Kacheln breit oder stößt an eine abgeschrägte
    # Ecke, hinter der wieder Boden liegt. Das ist kein Fehler der Bahn, sondern die Antwort:
    # Diese Bahn lebt von ihren Winkeln, nicht von einem Tor. Die Mühle hat ihre eigene Bahn.
    pilz(29.0, 7.0, stil='mushroom'),
], par=4,
     intro='Drei Kehren, und in jeder steht eine Schräge statt einer Ecke. Dazwischen die Klappe, '
           'und vor dem Loch noch zwei Prellböcke. Einzeln ist nichts davon schwer – alles '
           'hintereinander schon. Wer hier im Par bleibt, kann Minigolf.')


# ---------------------------------------------------------------- Prüfen
for kennung, jsname, titel, liste in WELTEN:
    print(f"\n{titel} ({kennung}) – {len(liste)} Bahnen")
    for b in liste:
        z = pruefe(b)
        print(f"  {b['name']:<18} {z['breit']:>2}x{z['hoch']:<2} Par {b['par']} · "
              f"{z['felder']:>3} Felder · {z['schraegen']} Schrägen · {z['maschinen']} Maschinen")

# ---------------------------------------------------------------- Schreiben
KOPF = """/* Der Alte Platz – Minigolf, wie es wirklich ist.
   Erzeugt von tools/altplatz.py; dort steht auch, warum die Bahnen so aussehen, wie sie aussehen.

   DIE EINZIGE WELT, IN DER DIE FORM DIE AUFGABE IST. Alle anderen sind um eine Maschine herum
   gebaut – die Mine um die Lampe, die Flut um den Wasserstand, die Loge um die Schleuder. Hier
   steckt die Aufgabe im Grundriß, und die vier Maschinen, die vorkommen, sind die vier, die auf
   jedem echten Platz stehen: die Mühle, der Tunnel, die Klappe und der Prellbock.

   Kein Abgrund, nichts, was fliegt, kein Wirkungsfeld. Wer schlecht spielt, liegt schlecht –
   er ist nicht weg. Sonst gilt dieselbe Kartenlegende wie in courses.js. */
"""
teile = [KOPF]
for kennung, jsname, titel, liste in WELTEN:
    teile.append(f"const {jsname} = [\n" + ',\n'.join(js(b) for b in liste) + ',\n];\n')
io.open('src/courses_altplatz.js', 'w', encoding='utf-8').write('\n'.join(teile))
print(f"\nsrc/courses_altplatz.js geschrieben – {sum(len(l) for _, _, _, l in WELTEN)} Bahnen")
