#!/usr/bin/env python3
"""Rechnet Molang aus - die Formelsprache der Bedrock-Animationen.

Warum das noetig ist: Eine Animation ist in Bedrock keine Bilderfolge,
sondern eine Formel je Knochen, etwa "math.sin(q.life_time * 103.2) * 2.8".
Wie der Arm bei einem Hieb wirklich steht, sieht man erst, wenn man die
Formel fuer einen bestimmten Augenblick ausrechnet. Hier laeuft kein
Minecraft, also rechnet dieses Werkzeug nach.

Es kann, was in Spielerdateien vorkommt: Zahlen, Rechenzeichen, Vergleiche,
"a ? b : c", Variablen (v., q., c. mit langer und kurzer Schreibweise),
"this", "c.owning_entity->v.name", Zuweisungen mit ";" und die
math.-Funktionen. Molang rechnet Winkel in Grad, nicht im Bogenmass - so
auch hier.

Was es nicht kennt, ist null und steht danach in `unbekannt`. Minecraft
macht es genauso: Eine unbekannte Variable ist dort ebenfalls null. Die
Liste hilft beim Nachsehen, ob eine Formel an einer Stelle haengt, die hier
nicht nachgebildet ist.
"""

import math
import re

_TOKEN = re.compile(r"""
    (?P<zahl>\d+\.\d*f?|\.\d+f?|\d+f?)
  | (?P<text>'[^']*')
  | (?P<name>[A-Za-z_][A-Za-z_0-9]*(?:\.[A-Za-z_][A-Za-z_0-9]*)*(?:->[A-Za-z_][A-Za-z_0-9]*(?:\.[A-Za-z_][A-Za-z_0-9]*)*)?)
  | (?P<zeichen>\?\?|&&|\|\||==|!=|<=|>=|[-+*/()<>!?:,;=])
  | (?P<leer>\s+)
""", re.VERBOSE)

KURZ = {"variable": "v", "query": "q", "context": "c", "temp": "t"}


def normname(name):
    """v.x, variable.x und VARIABLE.X sind in Molang dasselbe."""
    name = name.lower()
    teile = name.split(".", 1)
    if teile[0] in KURZ:
        teile[0] = KURZ[teile[0]]
    return ".".join(teile)


def zerlege(text):
    tokens = []
    pos = 0
    while pos < len(text):
        m = _TOKEN.match(text, pos)
        if not m:
            raise ValueError(f"Molang: unbekanntes Zeichen bei {text[pos:pos + 20]!r}")
        pos = m.end()
        art = m.lastgroup
        if art == "leer":
            continue
        wert = m.group(art)
        if art == "zahl":
            wert = float(wert.rstrip("f"))
        tokens.append((art, wert))
    tokens.append(("ende", None))
    return tokens


class _Leser:
    def __init__(self, text):
        self.t = zerlege(text)
        self.i = 0

    def schau(self):
        return self.t[self.i]

    def nimm(self, wert=None):
        tok = self.t[self.i]
        if wert is not None and tok[1] != wert:
            raise ValueError(f"Molang: erwartet {wert!r}, gefunden {tok[1]!r}")
        self.i += 1
        return tok

    def ist(self, *werte):
        tok = self.t[self.i]
        return tok[0] == "zeichen" and tok[1] in werte


# Der Baum besteht aus Tupeln: ("zahl", 3.0), ("var", "v.x"), ("ruf", name,
# [args]), ("bin", op, a, b), ("neg", a), ("nicht", a), ("wenn", a, b, c),
# ("setze", name, a), ("folge", [ausdruecke]).

def _ausdruck(l):
    bed = _oder(l)
    if l.ist("?"):
        l.nimm("?")
        dann = _ausdruck(l)
        sonst = ("zahl", 0.0)
        if l.ist(":"):
            l.nimm(":")
            sonst = _ausdruck(l)
        return ("wenn", bed, dann, sonst)
    if l.ist("??"):
        l.nimm("??")
        return ("bin", "??", bed, _ausdruck(l))
    return bed


def _links(naechste, *ops):
    def lies(l):
        a = naechste(l)
        while l.ist(*ops):
            op = l.nimm()[1]
            a = ("bin", op, a, naechste(l))
        return a
    return lies


def _vorzeichen(l):
    if l.ist("-"):
        l.nimm()
        return ("neg", _vorzeichen(l))
    if l.ist("+"):
        l.nimm()
        return _vorzeichen(l)
    if l.ist("!"):
        l.nimm()
        return ("nicht", _vorzeichen(l))
    return _grund(l)


def _grund(l):
    art, wert = l.schau()
    if art == "zahl":
        l.nimm()
        return ("zahl", wert)
    if art == "text":
        l.nimm()
        return ("text", wert[1:-1])
    if l.ist("("):
        l.nimm("(")
        a = _ausdruck(l)
        l.nimm(")")
        return a
    if art == "name":
        l.nimm()
        name = normname(wert)
        if l.ist("("):
            l.nimm("(")
            args = []
            if not l.ist(")"):
                args.append(_ausdruck(l))
                while l.ist(","):
                    l.nimm(",")
                    args.append(_ausdruck(l))
            l.nimm(")")
            return ("ruf", name, args)
        return ("var", name)
    raise ValueError(f"Molang: unerwartet {wert!r}")


_mal = _links(_vorzeichen, "*", "/")
_plus = _links(_mal, "+", "-")
_vergleich = _links(_plus, "<", "<=", ">", ">=")
_gleich = _links(_vergleich, "==", "!=")
_und = _links(_gleich, "&&")
_oder = _links(_und, "||")


def _anweisung(l):
    """name = ausdruck, oder nur ein Ausdruck."""
    art, wert = l.schau()
    if art == "name" and l.t[l.i + 1] == ("zeichen", "="):
        l.nimm()
        l.nimm("=")
        return ("setze", normname(wert), _ausdruck(l))
    return _ausdruck(l)


_CACHE = {}


def uebersetze(text):
    if text in _CACHE:
        return _CACHE[text]
    l = _Leser(text)
    teile = []
    while l.schau()[0] != "ende":
        if l.ist(";"):
            l.nimm()
            continue
        teile.append(_anweisung(l))
    baum = teile[0] if len(teile) == 1 else ("folge", teile)
    _CACHE[text] = baum
    return baum


def _rad(grad):
    return math.radians(grad)


MATHE = {
    "math.sin": lambda a: math.sin(_rad(a)),
    "math.cos": lambda a: math.cos(_rad(a)),
    "math.abs": abs,
    "math.sqrt": lambda a: math.sqrt(max(a, 0.0)),
    "math.pow": lambda a, b: math.pow(a, b) if a >= 0 or float(b).is_integer() else 0.0,
    "math.clamp": lambda a, lo, hi: min(max(a, lo), hi),
    "math.min": min,
    "math.max": max,
    "math.lerp": lambda a, b, t: a + (b - a) * t,
    "math.floor": math.floor,
    "math.ceil": math.ceil,
    "math.round": round,
    "math.trunc": math.trunc,
    "math.mod": lambda a, b: math.fmod(a, b) if b else 0.0,
    "math.exp": math.exp,
    "math.atan2": lambda y, x: math.degrees(math.atan2(y, x)),
    "math.asin": lambda a: math.degrees(math.asin(max(-1.0, min(1.0, a)))),
    "math.acos": lambda a: math.degrees(math.acos(max(-1.0, min(1.0, a)))),
}
KONSTANTEN = {"math.pi": math.pi}


class Umgebung:
    """Was eine Formel lesen kann: Variablen, Abfragen, Hilfsfunktionen.

    werte:      alles, was mit v., q., c. oder t. anfaengt ("v.attack_time")
    rufe:       Abfragen mit Klammern, etwa "q.is_item_name_any"
    """

    def __init__(self, werte=None, rufe=None):
        self.werte = dict(werte or {})
        self.rufe = dict(rufe or {})
        self.unbekannt = set()
        self.this = 0.0

    def lies(self, name):
        if name == "this":
            return self.this
        if name in KONSTANTEN:
            return KONSTANTEN[name]
        if "->" in name:
            # c.owning_entity->v.x: der Traeger ist hier derselbe Spieler.
            name = normname(name.split("->", 1)[1])
        if name in self.werte:
            return self.werte[name]
        if name in self.rufe:
            # Abfragen duerfen ohne Klammern stehen: q.get_equipped_item_name
            return self.rufe[name]()
        self.unbekannt.add(name)
        return 0.0


def _zahl(x):
    if isinstance(x, bool):
        return 1.0 if x else 0.0
    return x


def _rechne(b, u):
    art = b[0]
    if art == "zahl" or art == "text":
        return b[1]
    if art == "var":
        return u.lies(b[1])
    if art == "neg":
        return -_rechne(b[1], u)
    if art == "nicht":
        return 0.0 if _rechne(b[1], u) else 1.0
    if art == "wenn":
        return _rechne(b[2], u) if _rechne(b[1], u) else _rechne(b[3], u)
    if art == "setze":
        wert = _rechne(b[2], u)
        u.werte[b[1]] = wert
        return wert
    if art == "folge":
        wert = 0.0
        for teil in b[1]:
            wert = _rechne(teil, u)
        return wert
    if art == "ruf":
        name = b[1]
        args = [_rechne(a, u) for a in b[2]]
        if name in MATHE:
            return float(MATHE[name](*args))
        if name in u.rufe:
            return _zahl(u.rufe[name](*args))
        u.unbekannt.add(name + "()")
        return 0.0
    if art == "bin":
        op = b[1]
        if op == "&&":
            return 1.0 if (_rechne(b[2], u) and _rechne(b[3], u)) else 0.0
        if op == "||":
            return 1.0 if (_rechne(b[2], u) or _rechne(b[3], u)) else 0.0
        if op == "??":
            return _rechne(b[2], u) or _rechne(b[3], u)
        a, c = _rechne(b[2], u), _rechne(b[3], u)
        if op == "+":
            return a + c
        if op == "-":
            return a - c
        if op == "*":
            return a * c
        if op == "/":
            return a / c if c else 0.0
        if op == "==":
            return 1.0 if a == c else 0.0
        if op == "!=":
            return 1.0 if a != c else 0.0
        if op == "<":
            return 1.0 if a < c else 0.0
        if op == "<=":
            return 1.0 if a <= c else 0.0
        if op == ">":
            return 1.0 if a > c else 0.0
        if op == ">=":
            return 1.0 if a >= c else 0.0
    raise ValueError(f"Molang: unbekannter Baum {b!r}")


def rechne(ausdruck, umgebung):
    """Zahl oder Formeltext -> Zahl."""
    if isinstance(ausdruck, (int, float)):
        return float(ausdruck)
    return float(_zahl(_rechne(uebersetze(ausdruck), umgebung)))


if __name__ == "__main__":
    u = Umgebung({"v.a": 0.5, "q.b": 2.0})
    proben = [
        ("1 + 2 * 3", 7.0), ("-(2 + 3) * 2", -10.0), ("math.sin(90)", 1.0),
        ("v.a > 0.2 ? 10 : 20", 10.0), ("variable.a * Query.B", 1.0),
        ("v.c = 3; v.c * 2", 6.0), ("!v.a", 0.0), ("v.a ? 4", 4.0),
        ("c.owning_entity->v.a", 0.5), ("1.0f - 0.5", 0.5),
        ("math.clamp(5, 0, 1) + math.pi * 0", 1.0),
        ("v.a > 0 && v.a < 1 || 0", 1.0), ("'bow' == 'bow'", 1.0),
    ]
    for text, soll in proben:
        ist = rechne(text, u)
        assert abs(ist - soll) < 1e-9, (text, ist, soll)
    print(f"molang: {len(proben)} Proben richtig")
