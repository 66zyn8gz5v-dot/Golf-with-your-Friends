#!/usr/bin/env python3
"""Werkzeugkasten fuer die Tiere: Knochen, Kaesten, Fell malen, ansehen.

Fynn: "ein paar neue Mobs fuers Spiel, die es auch im echten Leben gibt ...
gross, cool, gefaehrlich." Zwoelf Tiere, jedes mit Modell, Haut, Bewegung,
Verhalten. Von Hand waeren das Tausende Zahlen, die voneinander abhaengen:
Wo ein Kasten im Texturbild liegt, haengt an seiner Groesse, und die an
der Gestalt des Tiers. Hier steht die Gestalt einmal, alles andere wird
daraus gerechnet.

Gemalt wird nicht im Texturbild, sondern am Tier: Jeder Bildpunkt einer
Seite weiss, wo er im Raum liegt. Ein Tigerstreifen ist dann "wo z so und
so ist", ein Auge "an dieser Stelle des Kopfes" - und landet auf jeder
Seite, die dort vorbeikommt, richtig herum. Bedrocks Texturkreuz (welches
Feld ist oben, welches vorn, wo liegt links) muss dafuer niemand im Kopf
haben; das weiss modell_ansehen.uv_feld, das schon am Spieler nachgeprueft
ist.
"""

import math
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
from modell_ansehen import flaechen_des_kastens, uv_feld   # noqa: E402


# ------------------------------------------------------------ Zufall

def streu(*werte):
    """Eine Zahl 0..1, die von Ort zu Ort springt (wie beim Spawn-Ei)."""
    h = 0x9E3779B1
    for w in werte:
        h ^= (int(w) + 0x7F4A7C15 + (h << 6) + (h >> 2)) & 0xFFFFFFFF
        h = (h * 0x85EBCA6B) & 0xFFFFFFFF
        h ^= h >> 13
    h = (h * 0xC2B2AE35) & 0xFFFFFFFF
    h ^= h >> 16
    return (h & 0xFFFF) / 65535.0


def rauschen(x, y, z, saat=0):
    """Weiches Rauschen im Raum (Wertrauschen, 0..1) - fuer Flecken und
    Wolken im Fell, die ueber Kastenkanten hinweg zusammenpassen."""
    ix, iy, iz = math.floor(x), math.floor(y), math.floor(z)
    fx, fy, fz = x - ix, y - iy, z - iz

    def g(t):
        return t * t * (3 - 2 * t)
    ux, uy, uz = g(fx), g(fy), g(fz)
    summe = 0.0
    for dx in (0, 1):
        for dy in (0, 1):
            for dz in (0, 1):
                w = (ux if dx else 1 - ux) * (uy if dy else 1 - uy) * (uz if dz else 1 - uz)
                summe += w * streu(ix + dx, iy + dy, iz + dz, saat)
    return summe


def wolken(p, skala, saat=0, lagen=2):
    """Rauschen in zwei Groessen uebereinander, 0..1."""
    s, gewicht, gesamt = 0.0, 1.0, 0.0
    for i in range(lagen):
        f = skala * (2 ** i)
        s += gewicht * rauschen(p[0] / f, p[1] / f, p[2] / f, saat + 17 * i)
        gesamt += gewicht
        gewicht *= 0.5
    return s / gesamt


def hexfarbe(t):
    t = t.lstrip("#")
    return tuple(int(t[i:i + 2], 16) for i in (0, 2, 4))


def mische(a, b, t):
    t = max(0.0, min(1.0, t))
    return tuple(int(round(a[i] + (b[i] - a[i]) * t)) for i in range(3))


def treppe(stufen, x):
    """Aus einer Farbtreppe (hell -> dunkel) die Stufe fuer x in 0..1."""
    i = int(max(0.0, min(0.999, x)) * len(stufen))
    return stufen[i]


def palette(hell, dunkel, n=5):
    a, b = hexfarbe(hell), hexfarbe(dunkel)
    return [mische(a, b, i / (n - 1)) for i in range(n)]


# ------------------------------------------------------------ Modell

class Kasten:
    def __init__(self, ursprung, groesse, stoff, drehung=None, drehpunkt=None, aufblasen=0.0, spiegeln=False):
        self.ursprung = [float(v) for v in ursprung]
        self.groesse = [int(v) for v in groesse]
        assert all(g >= 0 for g in self.groesse), groesse
        self.stoff = stoff
        self.drehung = drehung
        self.drehpunkt = drehpunkt
        self.aufblasen = aufblasen
        self.spiegeln = spiegeln
        self.uv = None


class Knochen:
    def __init__(self, name, drehpunkt, eltern=None, drehung=None):
        self.name = name
        self.drehpunkt = [float(v) for v in drehpunkt]
        self.eltern = eltern
        self.drehung = drehung
        self.kaesten = []

    def kasten(self, ursprung, groesse, stoff, **weiter):
        k = Kasten(ursprung, groesse, stoff, **weiter)
        self.kaesten.append(k)
        return k


class Modell:
    def __init__(self, name, sichtbreite=3, sichthoehe=3):
        self.name = name
        self.knochen = []
        self.sichtbreite = sichtbreite
        self.sichthoehe = sichthoehe
        self.breite = self.hoehe = 0

    def knoch(self, name, drehpunkt, eltern=None, drehung=None):
        k = Knochen(name, drehpunkt, eltern, drehung)
        self.knochen.append(k)
        return k

    def finde(self, name):
        return next(k for k in self.knochen if k.name == name)

    # ---------------------------------------------------------- Texturfelder

    def packe(self):
        """Jedem Kasten sein Feld im Texturbild - Reihe fuer Reihe, die
        grossen zuerst. Das Bild wird so breit wie noetig, in Zweierpotenzen,
        damit das Spiel es ohne Umrechnen nimmt."""
        kaesten = [k for b in self.knochen for k in b.kaesten]
        netze = []
        for k in kaesten:
            w, h, d = k.groesse
            netze.append((k, max(1, 2 * (d + w)), max(1, d + h)))
        breit = max(n[1] for n in netze)
        breite = 16
        while breite < breit:
            breite *= 2
        # Nicht schmaler als noetig, aber auch nicht endlos hoch: Wird das
        # Bild mehr als doppelt so hoch wie breit, lieber breiter.
        while True:
            x = y = zeile = 0
            for k, w, h in sorted(netze, key=lambda n: (-n[2], -n[1])):
                if x + w > breite:
                    x, y, zeile = 0, y + zeile, 0
                k.uv = [x, y]
                x += w
                zeile = max(zeile, h)
            hoehe_noetig = y + zeile
            hoehe = 16
            while hoehe < hoehe_noetig:
                hoehe *= 2
            if hoehe <= 2 * breite:
                break
            breite *= 2
        self.breite, self.hoehe = breite, hoehe

    def geometrie(self):
        if not self.breite:
            self.packe()
        knochen = []
        for b in self.knochen:
            eintrag = {"name": b.name, "pivot": b.drehpunkt}
            if b.eltern:
                eintrag["parent"] = b.eltern
            if b.drehung:
                eintrag["rotation"] = b.drehung
            kaesten = []
            for k in b.kaesten:
                w = {"origin": k.ursprung, "size": k.groesse, "uv": k.uv}
                if k.aufblasen:
                    w["inflate"] = k.aufblasen
                if k.drehung:
                    w["rotation"] = k.drehung
                    w["pivot"] = k.drehpunkt or [k.ursprung[i] + k.groesse[i] / 2 for i in range(3)]
                if k.spiegeln:
                    w["mirror"] = True
                kaesten.append(w)
            if kaesten:
                eintrag["cubes"] = kaesten
            knochen.append(eintrag)
        return {
            "format_version": "1.12.0",
            "minecraft:geometry": [{
                "description": {
                    "identifier": f"geometry.fynn.{self.name}",
                    "texture_width": self.breite,
                    "texture_height": self.hoehe,
                    "visible_bounds_width": self.sichtbreite,
                    "visible_bounds_height": self.sichthoehe,
                    "visible_bounds_offset": [0, self.sichthoehe / 2, 0],
                },
                "bones": knochen,
            }],
        }

    # ---------------------------------------------------------- Malen

    def male(self, maler):
        """maler(stoff, punkt, normale, texel) -> Farbe (r, g, b) oder
        (r, g, b, a). Aufgerufen fuer jeden Bildpunkt jeder Seite jedes
        Kastens, mit dem Ort im Raum der Modelldatei."""
        if not self.breite:
            self.packe()
        bild = Image.new("RGBA", (self.breite, self.hoehe), (0, 0, 0, 0))
        for b in self.knochen:
            for k in b.kaesten:
                seiten = flaechen_des_kastens(k.ursprung, k.groesse)
                for name, (ecken, normale) in seiten.items():
                    u, v, w, h = (int(round(z)) for z in uv_feld(k.uv, k.groesse, name))
                    if w <= 0 or h <= 0:
                        continue
                    tl, tr, br, bl = ecken
                    for j in range(h):
                        for i in range(w):
                            s, t = (i + 0.5) / w, (j + 0.5) / h
                            p = tuple(tl[a] + (tr[a] - tl[a]) * s + (bl[a] - tl[a]) * t for a in range(3))
                            farbe = maler(k.stoff, p, normale, (u + i, v + j, name, b.name))
                            if farbe is None:
                                continue
                            if len(farbe) == 3:
                                farbe = tuple(farbe) + (255,)
                            bild.putpixel((u + i, v + j), tuple(int(c) for c in farbe))
        return bild


# ------------------------------------------------------------ Bewegung

def lauf_animation(beine, schritt=38.17, winkel=40.0, extra=None):
    """Beine im Kreuzgang: vorn links mit hinten rechts. beine: Liste
    (Knochen, Phase +1 oder -1). Wie Mojangs Vierbeiner an der gelaufenen
    Strecke getaktet - die Fuesse rutschen dann nicht - und im Spiel mit
    q.modified_move_speed gewichtet: im Stehen null, im Rennen voll."""
    knochen = {}
    for name, phase, *mehr in beine:
        w = mehr[0] if mehr else winkel
        knochen[name] = {"rotation": [f"math.cos(query.anim_time * {schritt:.2f}) * {phase * w:.1f}", 0.0, 0.0]}
    for name, kanaele in (extra or {}).items():
        knochen.setdefault(name, {}).update(kanaele)
    return {"anim_time_update": "query.modified_distance_moved", "loop": True, "bones": knochen}


# ------------------------------------------------------------ Ansehen

def ansehen(geo, textur, animationen=(), werte=None, gier=35, neigung=18, breite=360, hoehe=300, zoom=None,
            mitte=None, hintergrund=(236, 238, 242, 255)):
    """Das Tier in einer Haltung zeichnen. animationen: (Animation, Gewicht).
    werte: Molang-Werte wie {"q.modified_move_speed": 1.0}. Benutzt die
    Rechnerei von spieler_ansehen - dieselbe, die am Spieler nachgeprueft ist."""
    import molang
    import spieler_ansehen as s
    teil = geo["minecraft:geometry"][0]
    knochen = s._modellknochen(teil)
    grund = {"q.life_time": 1.0, "q.anim_time": 0.0, "q.modified_distance_moved": 0.0,
             "q.modified_move_speed": 0.0, "q.is_baby": 0.0, "q.variant": 0.0, "v.attack_time": 0.0,
             "q.target_x_rotation": 0.0, "q.target_y_rotation": 0.0, "q.is_in_water": 0.0,
             "q.vertical_speed": 0.0, "q.is_on_ground": 1.0, "q.ground_speed": 0.0}
    grund.update({molang.normname(k): v for k, v in (werte or {}).items()})
    u = molang.Umgebung(grund)
    pose = s.Pose()
    for anim, gewicht in animationen:
        pose.lege_an(anim, gewicht, u.lies("q.life_time"), u)
    drehpunkte = {n: k["pivot"] for n, k in knochen.items()}
    matrizen = s.baue_matrizen(knochen, {"": pose}, drehpunkte)
    seiten = s.flaechen(knochen, matrizen, {"": textur}, ohne_deckschicht=False)
    d = teil["description"]
    if mitte is None:
        mitte = (0, d["visible_bounds_height"] * 8, 0)
    if zoom is None:
        zoom = min(breite, hoehe) / (max(d["visible_bounds_width"], d["visible_bounds_height"]) * 16) * 1.1
    return s.ansicht_aussen(seiten, gier, neigung, breite, hoehe, zoom, mitte=mitte, hintergrund=hintergrund)
