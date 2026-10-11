#!/usr/bin/env python3
"""Mischlinge und Dracheneier (5.2).

Fynn: "Man kann zwei gezaehmte Drachen paaren, und diese legen dann ein Ei
... das Ei ist ein kleiner Mix, also du musst so ein bisschen Mix aus den
Drachen machen. Das wird ein bisschen schwieriger, weil du jetzt recht
viele Kombinationen machen musst."

Ein Junges hat den Koerper der einen Art und die Farben der anderen: Leib
und Bauch bleiben (leicht zur anderen Art hin getoent), Ruecken, Flecken,
Flughaut, Hoerner, Augen und Glut kommen vom anderen Elternteil. So gibt
es zu jeder der sechs Arten fuenf Mischhaeute - dreissig Kombinationen,
alle aus denselben Malern wie die reinen Arten.

Die Reihenfolge von ARTEN ist die von drachen_daten.DRACHEN und von
ARTEN in scripts/drachenzucht.js: Die Nummer steht in fynn:misch (+1).
"""

import drachen_gestalt as dg
import drachen_klotz as dk
import drachen_neu as dn
import haut as H
from tiermodell import mische

# (Kennung, Gestalt, Farbtafel)
ARTEN = [
    ("lindwurm", "feuerdrache", dk.FEUERDRACHE_FARBEN),
    ("frostwyvern", "frostwyvern", dk.FROSTWYVERN_FARBEN),
    ("himmelsdrache", "himmelsdrache", dg.HIMMELSDRACHE_FARBEN),
    ("giftdrache", "giftdrache", dk.GIFTDRACHE_FARBEN),
    ("nachtschwinge", "nachtschwinge", dk.NACHTSCHWINGE_FARBEN),
    ("schlunddrache", "schlunddrache", dk.SCHLUNDDRACHE_FARBEN),
    # Die Arten aus der Zucht (5.2, drachen_neu.py).
    ("dampfdrache", "dampfdrache", dn.DAMPFDRACHE_FARBEN),
    ("sternendrache", "sternendrache", dn.STERNENDRACHE_FARBEN),
    ("lavadrache", "lavadrache", dn.LAVADRACHE_FARBEN),
]
NAMEN = {"lindwurm": "Feuerdrache", "frostwyvern": "Frostwyvern", "himmelsdrache": "Himmelsdrache",
         "giftdrache": "Giftdrache", "nachtschwinge": "Nachtschwinge", "schlunddrache": "Schlunddrache",
         "dampfdrache": "Dampfdrache", "sternendrache": "Sternendrache", "lavadrache": "Lavadrache"}
# Was vom anderen Elternteil kommt: die Details. Leib, Ruecken und Bauch
# bleiben die des Koerper-Elternteils (Fynn: "die Grundform ... die Farben
# sollen beibehalten werden und dann halt die kleinen Details"); Leib und
# Ruecken bekommen nur einen Hauch der anderen Farbe.
VOM_ANDEREN = ("fleck", "haut", "hautfleck", "augen", "glut", "horn")
HAUCH = {"leib": 0.12, "ruecken": 0.3}


def tafel(gestalt):
    return next(f for _, g, f in ARTEN if g == gestalt)


def grundfarben(gestalt):
    """Die Farben der haeufigsten Variante einer Art."""
    return next(iter(tafel(gestalt).values()))


def hexa(c):
    c = H.farbe(c)
    return "#%02x%02x%02x" % c


def farben(gestalt, variante=None):
    """Die Farben einer Variante (ohne Angabe: die haeufigste)."""
    t = tafel(gestalt)
    return t.get(variante) or next(iter(t.values()))


def varianten(gestalt):
    """Die Farbvarianten einer Art, in der Reihenfolge von query.variant."""
    return [v for v in tafel(gestalt) if not v.startswith("_")]


# 5.2 (zweiter Teil) - Fynn: "Es gibt ja auch verschiedene Farben von den
# Drachen an sich ... wenn da eine Kombination ist, dann sollen die Farben
# quasi auch beibehalten werden und dann halt die kleinen Details." Darum
# zaehlt fuer einen Mischling nicht die Art der Eltern, sondern ihre
# Farbvariante: Der Koerper behaelt die Farben des einen Elternteils, die
# Details (Ruecken, Flecken, Flughaut, Hoerner, Augen, das Erbteil) kommen
# in der Variante des anderen. fynn:misch sagt, welche: 1 + Nummer der Art
# mal 3 + Nummer ihrer Variante (0 = kein Mischling).
def platz(art_nr, variante_nr):
    return art_nr * 3 + variante_nr + 1


def plaetze():
    """Alle (Art, Gestalt, Variante) in der Reihenfolge von fynn:misch."""
    return [(art, gestalt, v) for art, gestalt, _ in ARTEN for v in varianten(gestalt)]


def misch_bedingung(art_nr):
    """Molang: stammen die Details von dieser Art (Nummer ab 1)?"""
    return f"math.floor((query.property('fynn:misch') + 2) / 3) == {art_nr}"


def mischfarben(koerper, farbe, kv=None, fv=None):
    a = dict(farben(koerper, kv))
    b = farben(farbe, fv)
    # Der Himmelsdrache hat keine Flecken und keine Flughaut-Flecken: dann
    # aus seinem Ruecken und seiner Haut abgeleitet.
    b = dict(b)
    b.setdefault("fleck", hexa(H.dunkler(b["ruecken"], 0.2)))
    b.setdefault("hautfleck", hexa(H.dunkler(b["haut"], 0.25)))
    for k in VOM_ANDEREN:
        if k in a:
            a[k] = b[k]
    for k, wie in HAUCH.items():
        a[k] = hexa(mische(H.farbe(a[k]), H.farbe(b[k]), wie))
    if "maehne" in a:
        # Maehne und Bart des Himmelsdrachen in den Farben des anderen.
        a["maehne"] = (b["ruecken"], b["glut"])
        a["bart"] = b["horn"][2]
    return a


def misch_maler(koerper, farbe, kv=None, fv=None):
    """Der Maler der Art koerper, mit den Mischfarben - die Maler kennen nur
    ihre Farbtafel, also steht die Mischung dort kurz als eigene Variante.
    kv/fv: die Farbvarianten von Koerper und Details."""
    t = tafel(koerper)
    t["_misch"] = mischfarben(koerper, farbe, kv, fv)
    art = next(a for a, g, _ in ARTEN if g == farbe)
    try:
        return mit_erbe(getattr(dg, f"{koerper}_maler")("_misch"), {art: farben(farbe, fv)})
    finally:
        del t["_misch"]


# ------------------------------------------------------------ Erbteile
#
# Fynn: "Kannst du das Aussehen auch minimal veraendern waehrend der
# Kombination." Ein Mischling bekommt vom anderen Elternteil dessen
# Kennzeichen als eigenes Stueck Modell - der Feuerdrache seine
# Hornklingen, der Frostwyvern Eiszacken, der Himmelsdrache Maehne und
# Barteln, der Giftdrache den Kragen, die Nachtschwinge die Schwanzsichel,
# der Schlunddrache den Knochenkranz. Sie sitzen an Kopf, Hals, Ruecken
# und Schwanzspitze - wo genau, wird am Modell gemessen, damit es bei
# allen sechs Koerpern passt. Sichtbar ist nur das der anderen Art
# (fynn:misch); die Stuecke auf dem Ruecken verschwinden unter dem Sattel.

import re  # noqa: E402


def _kasten(k):
    lo = [min(c.ursprung[i] for c in k.kaesten) for i in range(3)]
    hi = [max(c.ursprung[i] + c.groesse[i] for c in k.kaesten) for i in range(3)]
    return lo, hi


def _koepfe(m):
    return [k for k in m.knochen if re.fullmatch(r"kopf(_[ab])?", k.name)]


def _hals(m, kopf):
    """Die Halswirbel von vorn nach hinten, die zu diesem Kopf fuehren."""
    kette, k = [], kopf
    while k.eltern and k.eltern.startswith("hals"):
        k = m.finde(k.eltern)
        kette.append(k)
    return kette


def _schwanzspitze(m):
    glieder = [k for k in m.knochen if re.fullmatch(r"schwanz\d+", k.name)]
    return max(glieder, key=lambda k: int(k.name[7:])) if glieder else None


def _knoch(m, name, eltern):
    e = m.finde(eltern)
    return m.knoch(name, list(e.drehpunkt), eltern)


def _klingen(m, vor, stoff):
    """Feuerdrache: zwei Hornklingen nach hinten, eine Klingenreihe am Ruecken."""
    for kopf in _koepfe(m):
        lo, hi = _kasten(kopf)
        cx, w = (lo[0] + hi[0]) / 2, hi[0] - lo[0]
        b = _knoch(m, f"{vor}_kopf{kopf.name[4:]}", kopf.name)
        for s in (-1, 1):
            x, y, z = cx + s * (w / 2 - 2), hi[1] - 1.5, hi[2] - 5
            for i, (dicke, hoehe, laenge, ab) in enumerate(((3, 3, 7, 0), (2, 2, 6, 7), (1, 1, 4, 13))):
                b.kasten([x - dicke / 2, y + (3 - hoehe) / 2, z + ab], [dicke, hoehe, laenge], stoff,
                         drehung=[28 + i * 6, s * 14, 0], drehpunkt=[x, y + 1.5, z])
    r = _knoch(m, f"{vor}_ruecken", "rumpf")
    lo, hi = _kasten(m.finde("rumpf"))
    laenge = hi[2] - lo[2]
    for i, h in enumerate((4, 6, 7, 5)):
        z = lo[2] + 3 + i * (laenge - 8) / 3
        r.kasten([-0.5, hi[1] - 1, z], [1, h, 4], stoff, drehung=[-28, 0, 0], drehpunkt=[0, hi[1] - 1, z + 2])


def _eiszacken(m, vor, stoff):
    """Frostwyvern: Eiskristalle am Ruecken und an der Schwanzspitze."""
    r = _knoch(m, f"{vor}_ruecken", "rumpf")
    lo, hi = _kasten(m.finde("rumpf"))
    laenge = hi[2] - lo[2]
    for i, (h, s) in enumerate(((5, 1), (7, -1), (6, 1), (8, -1), (4, 1))):
        z = lo[2] + 2 + i * (laenge - 5) / 4
        x = s * 1.5
        r.kasten([x - 1, hi[1] - 1.5, z], [2, h, 2], stoff, drehung=[-12, 0, s * 16], drehpunkt=[x, hi[1] - 1.5, z + 1])
    spitze = _schwanzspitze(m)
    if spitze:
        lo, hi = _kasten(spitze)
        t = _knoch(m, f"{vor}_schwanz", spitze.name)
        for h, nx, nz in ((7, -40, 0), (5, -20, 30), (5, -20, -30)):
            t.kasten([-1, hi[1] - 1, hi[2] - 3], [2, h, 2], stoff, drehung=[nx, 0, nz], drehpunkt=[0, hi[1] - 1, hi[2] - 2])


def _maehne(m, vor, stoff):
    """Himmelsdrache: eine Maehne ueber den Hals und Barteln am Maul."""
    for kopf in _koepfe(m):
        lo, hi = _kasten(kopf)
        cx, w = (lo[0] + hi[0]) / 2, hi[0] - lo[0]
        b = _knoch(m, f"{vor}_kopf{kopf.name[4:]}", kopf.name)
        b.kasten([cx - 0.5, hi[1] - 1, hi[2] - 7], [1, 5, 8], stoff, drehung=[-12, 0, 0], drehpunkt=[cx, hi[1], hi[2]])
        for s in (-1, 1):
            x = cx + s * (w / 2 - 1)
            b.kasten([x - 0.5, lo[1] + 2, lo[2] + 2], [1, 1, 10], stoff + "_bart",
                     drehung=[-38, s * 24, 0], drehpunkt=[x, lo[1] + 2.5, lo[2] + 2])
        for glied in _hals(m, kopf):
            glo, ghi = _kasten(glied)
            gx = (glo[0] + ghi[0]) / 2
            h = _knoch(m, f"{vor}_{glied.name}", glied.name)
            h.kasten([gx - 0.5, ghi[1] - 1, glo[2]], [1, 5, max(2, round(ghi[2] - glo[2]))], stoff,
                     drehung=[-8, 0, 0], drehpunkt=[gx, ghi[1], ghi[2]])


def _kragen(m, vor, stoff):
    """Giftdrache: ein gefaecherter Kragen hinter dem Kopf."""
    for kopf in _koepfe(m):
        lo, hi = _kasten(kopf)
        cx, cy = (lo[0] + hi[0]) / 2, (lo[1] + hi[1]) / 2
        b = _knoch(m, f"{vor}_kopf{kopf.name[4:]}", kopf.name)
        for a in (-80, -45, -15, 15, 45, 80):
            b.kasten([cx - 1.5, cy, hi[2] - 3], [3, 8, 1], stoff, drehung=[-25, 0, a], drehpunkt=[cx, cy, hi[2] - 2.5])


def _sichel(m, vor, stoff):
    """Nachtschwinge: eine Sichel an der Schwanzspitze, dazu Dornen am Kopf."""
    spitze = _schwanzspitze(m)
    if spitze:
        lo, hi = _kasten(spitze)
        cy = (lo[1] + hi[1]) / 2
        t = _knoch(m, f"{vor}_schwanz", spitze.name)
        z = hi[2] - 3
        t.kasten([-1, cy - 1.5, z], [2, 3, 4], stoff)
        t.kasten([-0.5, cy + 1, z + 1], [1, 9, 2], stoff, drehung=[-40, 0, 0], drehpunkt=[0, cy + 1, z + 2])
        t.kasten([-0.5, cy + 8.5, z + 1], [1, 5, 2], stoff, drehung=[-80, 0, 0], drehpunkt=[0, cy + 1, z + 2])
        t.kasten([-0.5, cy - 8, z + 1], [1, 7, 2], stoff, drehung=[40, 0, 0], drehpunkt=[0, cy - 1, z + 2])
    for kopf in _koepfe(m):
        lo, hi = _kasten(kopf)
        cx, w = (lo[0] + hi[0]) / 2, hi[0] - lo[0]
        b = _knoch(m, f"{vor}_kopf{kopf.name[4:]}", kopf.name)
        for s in (-1, 1):
            x = cx + s * (w / 2 - 0.5)
            b.kasten([x - 0.5, hi[1] - 3, hi[2] - 3], [1, 2, 6], stoff, drehung=[10, s * 30, 0],
                     drehpunkt=[x, hi[1] - 2, hi[2] - 3])


def _knochenkranz(m, vor, stoff):
    """Schlunddrache: ein Kranz Knochendornen um den Kopf."""
    for kopf in _koepfe(m):
        lo, hi = _kasten(kopf)
        cx, w, cy = (lo[0] + hi[0]) / 2, hi[0] - lo[0], (lo[1] + hi[1]) / 2
        b = _knoch(m, f"{vor}_kopf{kopf.name[4:]}", kopf.name)
        z = hi[2] - 4
        for s in (-1, 1):
            for dy, rz, h in ((cy - 1, 70, 5), (cy + 2, 45, 7), (hi[1] - 1, 20, 6)):
                x = cx + s * (w / 2 - 1)
                b.kasten([x - 1, dy, z], [2, h, 2], stoff, drehung=[-30, 0, -s * rz], drehpunkt=[x, dy, z + 1])
        b.kasten([cx - 1, hi[1] - 1, z], [2, 6, 2], stoff, drehung=[-45, 0, 0], drehpunkt=[cx, hi[1] - 1, z + 1])


def _ruecken_reihe(m, vor, n):
    """Wo auf dem Ruecken Platz ist: n Stellen von vorn nach hinten."""
    r = _knoch(m, f"{vor}_ruecken", "rumpf")
    lo, hi = _kasten(m.finde("rumpf"))
    laenge = hi[2] - lo[2]
    return r, hi[1], [lo[2] + 2 + i * (laenge - 6) / max(1, n - 1) for i in range(n)]


def _schlote(m, vor, stoff):
    """Dampfdrache: zwei Paar Dampfschlote hinter den Schultern."""
    r, oben, orte = _ruecken_reihe(m, vor, 4)
    for z in orte[:2]:
        for x in (2.5, -2.5):
            r.kasten([x - 1, oben - 1, z], [2, 4, 2], stoff)
            r.kasten([x - 1.5, oben + 2.5, z - 0.5], [3, 1, 3], stoff + "_glut")


def _sternkristalle(m, vor, stoff):
    """Sternendrache: leuchtende Kristalle den Ruecken entlang, ein Stern auf der Stirn."""
    r, oben, orte = _ruecken_reihe(m, vor, 5)
    for i, z in enumerate(orte):
        h = (5, 7, 6, 5, 4)[i]
        r.kasten([-1, oben - 1, z], [2, round(h * 0.6), 2], stoff, drehung=[-22, 0, 0], drehpunkt=[0, oben - 1, z + 1])
        r.kasten([-0.5, oben - 1 + round(h * 0.6) - 0.5, z + 0.5], [1, round(h * 0.5), 1], stoff,
                 drehung=[-22, 0, 0], drehpunkt=[0, oben - 1, z + 1])
    for kopf in _koepfe(m):
        lo, hi = _kasten(kopf)
        cx = (lo[0] + hi[0]) / 2
        b = _knoch(m, f"{vor}_kopf{kopf.name[4:]}", kopf.name)
        b.kasten([cx - 1, hi[1] - 1, lo[2] + (hi[2] - lo[2]) * 0.45], [2, 2, 2], stoff)


def _basaltpanzer(m, vor, stoff):
    """Lavadrache: breite Basaltplatten auf dem Ruecken, ein Stirnpanzer."""
    r, oben, orte = _ruecken_reihe(m, vor, 3)
    lo, hi = _kasten(m.finde("rumpf"))
    breit = hi[0] - lo[0]
    for z in orte:
        r.kasten([-(breit - 2) / 2, oben - 0.5, z], [breit - 2, 2, 5], stoff)
        r.kasten([-0.5, oben + 1, z + 1], [1, 4, 3], stoff, drehung=[-30, 0, 0], drehpunkt=[0, oben + 1, z + 2.5])
    for kopf in _koepfe(m):
        klo, khi = _kasten(kopf)
        b = _knoch(m, f"{vor}_kopf{kopf.name[4:]}", kopf.name)
        b.kasten([klo[0] - 0.5, khi[1] - 1.5, khi[2] - 8], [khi[0] - klo[0] + 1, 2, 6], stoff)


ERBTEILE = {"lindwurm": _klingen, "frostwyvern": _eiszacken, "himmelsdrache": _maehne,
            "giftdrache": _kragen, "nachtschwinge": _sichel, "schlunddrache": _knochenkranz,
            "dampfdrache": _schlote, "sternendrache": _sternkristalle, "lavadrache": _basaltpanzer}


def erbteile(m, eigene_art):
    """Haengt die Erbteile aller anderen Arten an das Modell. Liefert
    (Knochen, Nummer der Art ab 1, am Ruecken?) fuer die Sichtbarkeit."""
    liste = []
    for nr, (art, _, _) in enumerate(ARTEN, 1):
        if art == eigene_art:
            continue
        vor = f"erbe_{art}"
        vorher = {k.name for k in m.knochen}
        ERBTEILE[art](m, vor, vor)
        for k in m.knochen:
            if k.name not in vorher:
                liste.append((k.name, nr, k.name.endswith("_ruecken")))
    return liste


def erbe_sichtbarkeit(gestalt, eigene_art):
    m = getattr(dg, f"{gestalt}_modell")()
    return [{name: misch_bedingung(nr) + (" && !query.is_saddled" if ruecken else "")}
            for name, nr, ruecken in erbteile(m, eigene_art)]


def erbe_farbe(stoff, p, n, texel, tafeln=None):
    """Die Farben der Erbteile: immer die der Art, von der sie stammen - in
    der Farbvariante des Elternteils, wenn sie in tafeln steht."""
    art = stoff.split("_")[1]
    gestalt = next(g for a, g, _ in ARTEN if a == art)
    f = dict((tafeln or {}).get(art) or grundfarben(gestalt))
    f.setdefault("fleck", hexa(H.dunkler(f["ruecken"], 0.2)))
    f.setdefault("hautfleck", hexa(H.dunkler(f["haut"], 0.25)))
    t = H.hoehe(p, n, texel) if abs(n[1]) < 0.5 else (1.0 if n[1] > 0 else 0.0)
    if art == "frostwyvern":
        return H.verlauf([f["haut"], f["glut"], "#ffffff"], t, 3) + (254,)
    if art == "himmelsdrache":
        if stoff.endswith("_bart"):
            return H.farbe(f["bart"])
        return H.verlauf([f["maehne"][0], f["maehne"][1]], t, 3)
    if art == "giftdrache":
        k = H.kasten_von(texel)
        rand = k is not None and abs(n[2]) > 0.5 and p[1] - k.ursprung[1] > k.groesse[1] - 2
        return H.farbe(f["stachel"]) if rand else H.verlauf([f["hautfleck"], f["haut"]], t, 3)
    if art == "sternendrache":
        return H.verlauf([f["maehne"][0], f["glut"], "#ffffff"], t, 3) + (254,)
    if art == "dampfdrache" and stoff.endswith("_glut"):
        return H.farbe(f["horn"][1]) if n[1] <= 0.5 else H.farbe(f["glut"]) + (254,)
    if art == "lavadrache":
        k = H.kasten_von(texel)
        if k is not None and abs(n[1]) < 0.5 and p[1] - k.ursprung[1] < 0.8:
            return H.farbe(f["glut"]) + (254,)
        return H.verlauf([H.dunkler(f["ruecken"], 0.2), f["ruecken"], f["horn"][1]], t, 3)
    return H.verlauf(list(f["horn"]), t, 3)


def mit_erbe(maler, tafeln=None):
    """Ein Maler, der auch die Erbteile malen kann."""
    def male(stoff, p, n, texel):
        if stoff.startswith("erbe_"):
            return erbe_farbe(stoff, p, n, texel, tafeln)
        return maler(stoff, p, n, texel)
    return male
