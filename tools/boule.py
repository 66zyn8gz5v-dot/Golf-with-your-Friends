# -*- coding: utf-8 -*-
"""Baut src/courses_boule.js – die neun Bahnen der Boule-Welt.

Warum ein Erzeuger und keine von Hand getippte Datei: Eine Karte ist ein Feld aus Zeichenketten,
und die häufigste Panne dabei ist eine Zeile, die ein Zeichen zu kurz ist. Hier wird jede Karte aus
einem Rechteck gebaut und danach geprüft – rechteckig, genau ein Abschlag, genau ein Loch, und
zwischen beiden muss ein Weg liegen.

Was eine Boule-Bahn von einer Golfbahn unterscheidet:
  * **Platz.** Bei vier Spielern liegen am Ende zwölf Kugeln plus die Zielkugel auf der Bahn. Eine
    enge Golfbahn wäre nach der vierten Kugel verstopft, und die restlichen acht prallten nur noch
    an den anderen ab, ohne je in die Nähe der Zielkugel zu kommen.
  * **Freier Abschlag.** Jede neue Kugel wird neben dem Abschlag eingesetzt und sucht sich dort
    einen freien Platz. Steht der Abschlag in einer Nische, wird es nach acht Kugeln eng.
  * **Kein Eis, kein Sand.** Auf Eis rollt eine Kugel ewig weiter (Bremsung 0.75), auf Sand bleibt
    sie nach einem Meter liegen (Bremsung 20). Beides macht das Abschätzen unmöglich, worum es in
    Boule aber gerade geht. Also nur Gras.
  * **Kein Loch.** Eine Boule-Bahn hat keines: Es wäre eine Falle, die mit dem Spiel nichts zu tun
    hat – wer Pech hat, verliert eine Kugel an ein Ziel, das er gar nicht anspielt. Die Bahnen
    tragen darum `ohneLoch: true`; die Bahnprüfung weiß davon und verlangt für sie kein 'H'.
Hindernisse gibt es nur zwei Arten: Blöcke ('x', Bäume und Findlinge) und Prellsteine. Alles
Bewegte – Loren, Fähren, Kanonen, Stacheln – würde liegende Kugeln verschieben oder verschlucken,
während gerade jemand anderes zielt.

    python3 tools/boule.py
"""
import io, os, re
from collections import deque

def leer(b, h):
    """Ein Rechteck Gras mit einem Rand aus Nichts drumherum."""
    return [['.'] * b for _ in range(h)]

def rasen(f, x0, y0, x1, y1, z='#'):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            f[y][x] = z

def setz(f, x, y, z):
    f[y][x] = z

def block(f, x0, y0, x1, y1, z='x'):
    rasen(f, x0, y0, x1, y1, z)

def txt(f):
    return [''.join(r) for r in f]

BAHNEN = []

def bahn(name, theme, karte, hindernisse=None, par=3):
    BAHNEN.append({'name': name, 'par': par, 'theme': theme, 'ohneLoch': True,
                   'map': txt(karte), 'obstacles': hindernisse or []})

# 1 – Der Anger: nichts als Rasen. Wer hier danebenlegt, hat nur sich selbst.
f = leer(22, 13); rasen(f, 1, 1, 20, 11)
setz(f, 2, 6, 'T')
bahn('Der Anger', 'meadow', f)

# 2 – Steinmal: ein Steinquader in der Mitte, um den herum gespielt wird. (Der Name folgt dem, was
#     gezeichnet wird: Blöcke sind im Waldthema blaue Quader, keine Bäume.)
f = leer(22, 13); rasen(f, 1, 1, 20, 11)
block(f, 10, 5, 12, 7)
setz(f, 2, 6, 'T')
bahn('Steinmal', 'forest', f)

# 3 – Steilrand: an der oberen Seite fehlt der Boden. Wer zu fest spielt, ist weg.
f = leer(22, 13); rasen(f, 1, 1, 20, 11)
rasen(f, 6, 1, 15, 2, '.')
setz(f, 2, 7, 'T')
bahn('Steilrand', 'meadow', f)

# 4 – Die Zwillinge: zwei gleiche Quader, dazwischen eine Gasse.
f = leer(23, 13); rasen(f, 1, 1, 21, 11)
block(f, 9, 1, 11, 4); block(f, 9, 8, 11, 11)
setz(f, 2, 6, 'T')
bahn('Die Zwillinge', 'forest', f)

# 5 – Hufeisen: der Rasen läuft um einen Hain herum.
f = leer(23, 14); rasen(f, 1, 1, 21, 12)
block(f, 7, 1, 15, 7)
setz(f, 3, 10, 'T')
bahn('Hufeisen', 'forest', f)

# 6 – Waldlichtung: eine runde Lichtung, vom Wald umstanden.
f = leer(21, 15); 
mx, my, rx, ry = 10.0, 7.0, 9.0, 6.2
for y in range(15):
    for x in range(21):
        if ((x - mx) / rx) ** 2 + ((y - my) / ry) ** 2 <= 1.0:
            f[y][x] = '#'
setz(f, 3, 7, 'T')
bahn('Waldlichtung', 'forest', f)

# 7 – Die Hecke: eine Steinreihe quer über den Rasen, mit einer Lücke.
f = leer(23, 13); rasen(f, 1, 1, 21, 11)
block(f, 11, 1, 11, 4); block(f, 11, 8, 11, 11)
setz(f, 2, 6, 'T')
bahn('Die Hecke', 'meadow', f)

# 8 – Findlinge: drei Prellsteine auf freier Wiese – die Kugeln springen ab.
f = leer(22, 13); rasen(f, 1, 1, 20, 11)
setz(f, 2, 6, 'T')
bahn('Findlinge', 'meadow', f, [
    {'type': 'bumper', 'x': 9.5, 'y': 3.5, 'r': 0.6},
    {'type': 'bumper', 'x': 12.5, 'y': 8.5, 'r': 0.6},
    {'type': 'bumper', 'x': 15.5, 'y': 5.0, 'r': 0.6},
])

# 9 – Langer Anger: die weiteste Bahn, das Loch ganz hinten.
f = leer(28, 11); rasen(f, 1, 1, 26, 9)
block(f, 13, 1, 14, 2); block(f, 13, 8, 14, 9)
setz(f, 2, 5, 'T')
bahn('Langer Anger', 'meadow', f, par=4)

# ---------------------------------------------------------------- Prüfen
FEST = set('#THsiwl')          # begehbar
def pruefe(b):
    m = b['map']
    breit = len(m[0])
    assert all(len(r) == breit for r in m), f"{b['name']}: Zeilen verschieden lang"
    ganz = ''.join(m)
    assert ganz.count('T') == 1, f"{b['name']}: {ganz.count('T')} Abschläge"
    assert 'H' not in ganz, f"{b['name']}: eine Boule-Bahn hat kein Loch"
    assert 'i' not in ganz and 's' not in ganz, f"{b['name']}: Eis oder Sand auf einer Boule-Bahn"
    # Aller Rasen muss vom Abschlag aus zu erreichen sein. Ohne Loch gibt es kein Ziel mehr, das
    # man prüfen könnte – wohl aber die Gefahr, dass ein abgetrenntes Stück Wiese entsteht, auf das
    # keine Kugel je käme. Das wäre kein Fehler, der auffällt: Es sähe nur aus, als spiele niemand
    # dorthin.
    start = None
    for y, r in enumerate(m):
        for x, c in enumerate(r):
            if c == 'T': start = (x, y)
    gesehen = {start}; q = deque([start])
    while q:
        x, y = q.popleft()
        for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            n = (x + dx, y + dy)
            if n in gesehen or not (0 <= n[0] < breit and 0 <= n[1] < len(m)): continue
            if m[n[1]][n[0]] not in FEST: continue
            gesehen.add(n); q.append(n)
    alle = sum(1 for r in m for c in r if c in FEST)
    assert len(gesehen) == alle, f"{b['name']}: {alle - len(gesehen)} Rasenfelder hängen nicht am Abschlag"
    # Platz: genug Rasen für zwölf Kugeln und die Zielkugel
    rasenfelder = sum(r.count('#') for r in m) + 2
    assert rasenfelder >= 120, f"{b['name']}: nur {rasenfelder} Rasenfelder – zu eng für zwölf Kugeln"
    # Freier Platz um den Abschlag: dort werden alle Kugeln eingesetzt
    frei = sum(1 for dy in range(-2, 3) for dx in range(-2, 3)
               if 0 <= start[0] + dx < breit and 0 <= start[1] + dy < len(m)
               and m[start[1] + dy][start[0] + dx] in FEST)
    assert frei >= 15, f"{b['name']}: nur {frei} freie Felder um den Abschlag"
    # Und ein Platz für die Zielkugel, weit genug weg
    weit = sum(1 for y, r in enumerate(m) for x, c in enumerate(r)
               if c == '#' and ((x - start[0]) ** 2 + (y - start[1]) ** 2) ** 0.5 >= 3.5)
    assert weit >= 40, f"{b['name']}: zu wenig Platz für die Zielkugel"
    return dict(breit=breit, hoch=len(m), rasen=rasenfelder, frei=frei, weit=weit)

for b in BAHNEN:
    z = pruefe(b)
    print(f"  {b['name']:<16} {z['breit']:>2}x{z['hoch']:<2} {b['theme']:<7} "
          f"Rasen {z['rasen']:>3} · frei am Abschlag {z['frei']:>2} · Plätze für die Zielkugel {z['weit']:>3}")

# ---------------------------------------------------------------- Schreiben
def js(b):
    hind = ''
    if b['obstacles']:
        zeilen = ',\n      '.join(
            '{ ' + ', '.join(f"{k}: {v!r}" if not isinstance(v, str) else f"{k}: '{v}'"
                             for k, v in o.items()) + ' }' for o in b['obstacles'])
        hind = f",\n    obstacles: [\n      {zeilen},\n    ]"
    karte = ',\n      '.join(f"'{r}'" for r in b['map'])
    return (f"  {{\n    name: '{b['name']}', par: {b['par']}, theme: '{b['theme']}', ohneLoch: true,\n"
            f"    map: [\n      {karte},\n    ]{hind},\n  }}")

kopf = """/* Die Boule-Welt: neun Bahnen, die zum Kugelschieben gebaut sind und nicht zum Einlochen.
   Erzeugt von tools/boule.py – dort steht auch, warum sie so aussehen, wie sie aussehen.

   In Kürze: Boule braucht Platz. Bei vier Spielern liegen am Ende zwölf Kugeln plus die
   Zielkugel auf der Bahn; eine enge Golfbahn wäre nach der vierten verstopft. Darum sind das
   offene Wiesen und Lichtungen mit wenigen Hindernissen, alle aus Gras – kein Eis (darauf rollt
   eine Kugel ewig) und kein Sand (darauf bleibt sie sofort liegen). Beides nähme dem Spiel
   genau das, worum es geht: das Abschätzen.

   Und sie haben kein Loch: Es wäre eine Falle, die mit dem Spiel nichts zu tun hat – wer Pech hat,
   verlöre eine Kugel an ein Ziel, das er gar nicht anspielt. Daher 'ohneLoch: true'; die
   Bahnprüfung weiß davon und verlangt für diese Bahnen kein 'H'. */
const BOULE_COURSES = [
"""
io.open('src/courses_boule.js', 'w', encoding='utf-8').write(kopf + ',\n'.join(js(b) for b in BAHNEN) + ',\n];\n')
print(f"\nsrc/courses_boule.js geschrieben – {len(BAHNEN)} Bahnen")
