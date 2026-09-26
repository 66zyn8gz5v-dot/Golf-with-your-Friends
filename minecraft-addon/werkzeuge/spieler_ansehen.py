#!/usr/bin/env python3
"""Zeichnet den Spieler mitten in einer Bewegung - von aussen und aus der Ich-Sicht.

Warum es das braucht: Ein Hieb, ein Schritt, ein gespannter Bogen stehen in
Bedrock als Formeln in drei Dateien - der Spielerdatei, Mojangs eigenen
Animationen und unseren. Welche davon wann laeuft, entscheidet ein
Steuerwerk, und alle zusammen addieren sich auf dieselben Knochen. Ob am
Ende ein Arm zuschlaegt oder nur zappelt, sieht man den Formeln nicht an.
Hier laeuft kein Minecraft; dieses Werkzeug rechnet es nach und malt es.

Was es nachbildet:

* die Spielerdatei mit ihren Vorberechnungen (pre_animation),
* Mojangs Steuerwerk des Spielers (Ich-Sicht oder von aussen),
* unsere Animationen und Steuerwerke obendrauf, in derselben Reihenfolge,
* "this", Mischgewichte, Schluesselbilder mit Catmull-Rom,
* die Waffe in der Hand: das Attachable mit seiner eigenen Haltung, an den
  Knochen rightItem gebunden.

Die Drehrichtung ist nachgeprueft, nicht geraten (siehe drehmatrix).

Was fehlt: Licht, Schatten, Umhang, Ruestung, alles Zufaellige. Fuer die
Frage "wie steht der Koerper in diesem Augenblick" reicht es.
"""

import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw

import molang
from modell_ansehen import flaechen_des_kastens, uv_feld

WERKZEUGE = Path(__file__).resolve().parent
WURZEL = WERKZEUGE.parent
RES = WURZEL / "ressourcenpaket"
MOJANG = WERKZEUGE / "mojang"


def lade(pfad):
    """JSON mit Mojangs //-Kommentaren."""
    text = Path(pfad).read_text(encoding="utf-8")
    text = re.sub(r"^\s*//.*$", "", text, flags=re.M)
    text = re.sub(r",(\s*[}\]])", r"\1", text)
    return json.loads(text)


# ------------------------------------------------------------ Matrizen

def mal(a, b):
    return [[sum(a[i][k] * b[k][j] for k in range(4)) for j in range(4)] for i in range(4)]


def anwenden(m, p):
    return tuple(m[i][0] * p[0] + m[i][1] * p[1] + m[i][2] * p[2] + m[i][3] for i in range(3))


def verschiebung(x, y, z):
    return [[1, 0, 0, x], [0, 1, 0, y], [0, 0, 1, z], [0, 0, 0, 1]]


def groesse(sx, sy, sz):
    return [[sx, 0, 0, 0], [0, sy, 0, 0], [0, 0, sz, 0], [0, 0, 0, 1]]


def _rx(a):
    c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
    return [[1, 0, 0, 0], [0, c, -s, 0], [0, s, c, 0], [0, 0, 0, 1]]


def _ry(a):
    c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
    return [[c, 0, s, 0], [0, 1, 0, 0], [-s, 0, c, 0], [0, 0, 0, 1]]


def _rz(a):
    c, s = math.cos(math.radians(a)), math.sin(math.radians(a))
    return [[c, -s, 0, 0], [s, c, 0, 0], [0, 0, 1, 0], [0, 0, 0, 1]]


def drehmatrix(rx, ry, rz):
    """Bedrocks Drehung eines Knochens, im Raum der Modelldatei.

    Erst um x, dann um y, dann um z - mit umgekehrtem Vorzeichen bei x und
    z, mit gleichem bei y. Nachgeprueft an zwei Stellen, bei denen man
    weiss, wie es im Spiel aussieht:

    * Mojangs Bogenhaltung dreht den linken Arm um +27.5 Grad um y. Der
      linke Arm liegt bei x = +5; beim Bogenspannen zeigt er zur Mitte
      hin, also nach -x. Das tut er nur mit gleichem Vorzeichen bei y.
    * Ein Arm mit -90 Grad um x zeigt nach vorn, zum Gesicht (-z). Das
      tut er nur mit umgekehrtem Vorzeichen bei x.

    Das alte modell_ansehen.py drehte y andersherum. Bei allem, was nur um
    x oder z gedreht ist, fiel das nie auf.
    """
    return mal(_rz(-rz), mal(_ry(ry), _rx(-rx)))


# ------------------------------------------------------------ Animation

KANAELE = ("rotation", "position", "scale")


def _drei(wert):
    if isinstance(wert, list):
        return wert
    return [wert, wert, wert]


def _schluessel(eintrag, seite):
    if isinstance(eintrag, dict) and ("pre" in eintrag or "post" in eintrag):
        if seite == "pre":
            return _drei(eintrag.get("pre", eintrag.get("post")))
        return _drei(eintrag.get("post", eintrag.get("pre")))
    return _drei(eintrag)


def _art(eintrag):
    if isinstance(eintrag, dict):
        return eintrag.get("lerp_mode", "linear")
    return "linear"


def kanalwert(kanal, zeit, u):
    """Ein Kanal zu einer Zeit: Zahl, Formel, Liste oder Schluesselbilder."""
    if isinstance(kanal, dict) and not ("pre" in kanal or "post" in kanal):
        zeiten = sorted(kanal, key=float)
        t = [float(z) for z in zeiten]
        werte = [kanal[z] for z in zeiten]

        def aus(i, seite):
            return [molang.rechne(w, u) for w in _schluessel(werte[i], seite)]

        if zeit <= t[0]:
            return aus(0, "pre")
        if zeit >= t[-1]:
            return aus(len(t) - 1, "post")
        i = max(k for k in range(len(t)) if t[k] <= zeit)
        anteil = (zeit - t[i]) / (t[i + 1] - t[i])
        a, b = aus(i, "post"), aus(i + 1, "pre")
        if "catmullrom" in (_art(werte[i]), _art(werte[i + 1])):
            vor = aus(max(i - 1, 0), "post")
            nach = aus(min(i + 2, len(t) - 1), "pre")
            s = anteil
            return [0.5 * ((2 * a[k]) + (-vor[k] + b[k]) * s
                           + (2 * vor[k] - 5 * a[k] + 4 * b[k] - nach[k]) * s * s
                           + (-vor[k] + 3 * a[k] - 3 * b[k] + nach[k]) * s * s * s)
                    for k in range(3)]
        return [a[k] + (b[k] - a[k]) * anteil for k in range(3)]
    return [molang.rechne(w, u) for w in _schluessel(kanal, "post")]


class Pose:
    """Die Summe aller Animationen: je Knochen Drehung, Verschiebung, Groesse."""

    def __init__(self):
        self.k = {}
        # Knochen, deren Drehung "relative_to entity" gerechnet wird: Sie
        # drehen nicht mit ihren Eltern mit (der Kopf beim Umsehen).
        self.zum_koerper = set()

    def von(self, knochen):
        return self.k.setdefault(knochen.lower(), {"rotation": [0.0] * 3, "position": [0.0] * 3,
                                                   "scale": [1.0] * 3})

    def lege_an(self, animation, gewicht, zeit, u):
        if gewicht == 0:
            return
        if animation.get("override_previous_animation"):
            for name in animation.get("bones", {}):
                self.k.pop(name.lower(), None)
        if "anim_time_update" in animation:
            # Die Zeit der Animation kommt aus einer Formel, etwa aus
            # v.attack_time - dann laeuft sie genau mit dem Hieb.
            u.werte["q.anim_time"] = zeit
            zeit = molang.rechne(animation["anim_time_update"], u)
        laenge = animation.get("animation_length")
        if animation.get("loop") is True and laenge:
            zeit = math.fmod(zeit, laenge)
        for name, kanaele in animation.get("bones", {}).items():
            ziel = self.von(name)
            if kanaele.get("relative_to", {}).get("rotation") == "entity":
                self.zum_koerper.add(name.lower())
            for kanal in KANAELE:
                if kanal not in kanaele:
                    continue
                vorher = list(ziel[kanal])
                # "this" ist je Achse der Wert vor dieser Animation. Die
                # Formel sieht ihn, und nur ihn - nicht den der anderen
                # Achsen.
                werte = []
                for achse in range(3):
                    u.this = vorher[achse]
                    werte.append(kanalwert(kanaele[kanal], zeit, u)[achse])
                if kanal == "scale":
                    ziel[kanal] = [vorher[a] * (1 + (werte[a] - 1) * gewicht) for a in range(3)]
                else:
                    ziel[kanal] = [vorher[a] + werte[a] * gewicht for a in range(3)]


# ------------------------------------------------------------ Der Spieler

class Spieler:
    """Spielerdatei, Steuerwerke und alle Animationen, einmal geladen."""

    def __init__(self, spielerdatei=RES / "entity" / "player.entity.json"):
        self.beschreibung = lade(spielerdatei)["minecraft:client_entity"]["description"]
        self.animationen = {}
        self.steuerwerke = {}
        dateien = [MOJANG / "player.animation.json", MOJANG / "player_firstperson.animation.json",
                   MOJANG / "humanoid.animation.json"] + sorted((RES / "animations").glob("*.json"))
        for datei in dateien:
            self.animationen.update(lade(datei).get("animations", {}))
        for datei in [MOJANG / "player.animation_controllers.json"] + \
                sorted((RES / "animation_controllers").glob("*.json")):
            self.steuerwerke.update(lade(datei).get("animation_controllers", {}))
        self.kurz = self.beschreibung["animations"]

    def umgebung(self, zustand):
        """Was das Spiel dem Spieler an Werten mitgibt - hier von Hand."""
        z = dict(zustand)
        hand = z.pop("hand", "")
        zweithand = z.pop("zweithand", "")
        werte = {
            "q.life_time": 1.0, "q.modified_distance_moved": 0.0, "q.modified_move_speed": 0.0,
            "q.walk_distance": 0.0, "q.is_on_ground": 1.0, "q.is_alive": 1.0,
            "q.target_x_rotation": 0.0, "q.ground_speed": 0.0, "q.target_y_rotation": 0.0,
            "q.main_hand_item_max_duration": 72000.0, "q.main_hand_item_use_duration": 0.0,
            "v.attack_time": 0.0, "v.is_first_person": 0.0, "v.gliding_speed_value": 1.0,
            "v.first_person_item_rotation_factor": 1.0 if hand else 0.0,
            "v.player_arm_height": 1.0, "c.player_offhand_arm_height": 1.0,
            "v.bob_animation": 1.0, "v.is_holding_right": 1.0 if hand else 0.0,
            "v.player_x_rotation": 0.0,
        }
        werte.update({molang.normname(k): v for k, v in z.items()})

        def gleich(slot, *namen):
            gegenstand = hand if "offhand" not in str(slot) else zweithand
            return 1.0 if gegenstand in namen else 0.0

        def name_von(*args):
            slot = args[0] if args and isinstance(args[0], str) else "main_hand"
            gegenstand = zweithand if slot in ("off_hand", "slot.weapon.offhand") else hand
            return gegenstand.split(":")[-1]

        def pivot(knochen, achse):
            return {"rightarm": [-5, 22, 0], "leftarm": [5, 22, 0], "rightitem": [-6, 15, 1],
                    "leftitem": [6, 15, 1]}.get(knochen.lower(), [0, 0, 0])[int(achse)]

        rufe = {
            "q.is_item_name_any": gleich,
            "q.get_equipped_item_name": name_von,
            "q.get_default_bone_pivot": pivot,
            "q.position_delta": lambda *a: 0.0,
            "q.is_riding_any_entity_of_type": lambda *a: 0.0,
        }
        return molang.Umgebung(werte, rufe)

    def _eintraege(self, liste, u, zustaende, zeiten, gewicht=1.0):
        """Die Animationsliste eines Zustands aufloesen - Steuerwerke rekursiv."""
        for eintrag in liste:
            if isinstance(eintrag, dict):
                name, bedingung = next(iter(eintrag.items()))
                w = molang.rechne(bedingung, u)
            else:
                name, w = eintrag, 1.0
            if not w:
                continue
            voll = self.kurz.get(name, name)
            if voll in self.steuerwerke:
                werk = self.steuerwerke[voll]
                zustand = zustaende.get(name) or self._zustand_von_selbst(name, werk, u)
                inhalt = werk["states"][zustand]
                yield from self._eintraege(inhalt.get("animations", []), u, zustaende, zeiten,
                                           gewicht * w)
            elif voll in self.animationen:
                yield name, self.animationen[voll], gewicht * w
            else:
                u.unbekannt.add("Animation " + voll)

    def _zustand_von_selbst(self, name, werk, u):
        # Mojangs Wurzelsteuerwerk springt je nach Blick; die anderen stehen
        # in ihrem Anfangszustand, wenn niemand etwas anderes sagt.
        if name == "root":
            return "first_person" if u.lies("v.is_first_person") else "third_person"
        return werk.get("initial_state", "default")

    def pose(self, zustand, zustaende=None, zeiten=None):
        """zustand:   Werte wie {"v.attack_time": 0.3, "hand": "minecraft:stone_sword"}
        zustaende: Steuerwerk -> Zustand, etwa {"fynn_hieb": "vor"}
        zeiten:    Animation (Kurzname) -> Zeit in Sekunden seit ihrem Start"""
        zustaende = zustaende or {}
        zeiten = zeiten or {}
        u = self.umgebung(zustand)
        skripte = self.beschreibung.get("scripts", {})
        for zeile in skripte.get("initialize", []):
            molang.rechne(zeile, u)
        # Mehrere Bilder lang vorrechnen: Manche Werte laufen weich nach
        # (math.lerp auf den eigenen alten Wert) und stehen erst nach einer
        # Weile dort, wo sie im Spiel waeren.
        for _ in range(60):
            for k, v in zustand.items():
                if k not in ("hand", "zweithand") and not molang.normname(k).startswith("v."):
                    u.werte[molang.normname(k)] = v
            for zeile in skripte.get("pre_animation", []):
                molang.rechne(zeile, u)
        # Vom Werkzeug gesetzte Werte gewinnen gegen die Vorberechnung - sonst
        # liesse sich ein Zwischenwert wie v.hieb_zeit nicht vorgeben.
        for k, v in zustand.items():
            if k not in ("hand", "zweithand"):
                u.werte[molang.normname(k)] = v
        pose = Pose()
        lebenszeit = u.lies("q.life_time")
        for name, animation, w in self._eintraege(skripte.get("animate", []), u, zustaende, zeiten):
            pose.lege_an(animation, w, zeiten.get(name, lebenszeit), u)
        return pose, u


# ------------------------------------------------------------ Modell bauen

def _modellknochen(geo, praefix="", bindung=None):
    """Knochen einer Geometrie mit Eltern, Drehpunkt, Grunddrehung, Kaesten."""
    aus = {}
    for k in geo["bones"]:
        name = praefix + k["name"].lower()
        eltern = k.get("parent")
        eintrag = {"name": name, "pivot": k.get("pivot", [0, 0, 0]), "grund": k.get("rotation", [0, 0, 0]),
                   "kaesten": k.get("cubes", []), "eltern": praefix + eltern.lower() if eltern else None,
                   "tex": None, "gebunden": None}
        # Gebunden ist ein Knochen mit "binding" - oder einer, der so heisst
        # wie der Handknochen des Spielers (so machen es Mojangs Bogen).
        if bindung and ("binding" in k or k["name"].lower() == bindung):
            ziel = bindung
            # Eine feste Bindung wie "'leftitem'" oder "'body'" nennt ihren
            # Knochen selbst; q.item_slot_to_bone_name meint die Waffenhand.
            fest = re.fullmatch(r"\s*'([A-Za-z_]+)'\s*", k.get("binding", ""))
            if fest:
                ziel = fest.group(1).lower()
            eintrag["eltern"] = ziel
            eintrag["gebunden"] = ziel
        aus[name] = eintrag
    return aus


# Was in der Ich-Sicht gemalt wird: der rechte Arm. Den linken zeigt das
# Spiel nur mit Karte oder Schild in der Hand.
ICH_SICHTBAR = {"rightarm", "rightsleeve"}
DECKSCHICHT = {"hat", "jacket", "leftsleeve", "rightsleeve", "leftpants", "rightpants"}


def baue_matrizen(knochen, posen, drehpunkte):
    """Weltmatrix je Knochen. posen: praefix -> Pose (Spieler "", Waffe "w:")."""
    fertig = {}

    def matrix(name):
        if name in fertig:
            return fertig[name]
        k = knochen[name]
        praefix = name.split(":")[0] + ":" if ":" in name else ""
        eigen = posen[praefix].k.get(name[len(praefix):], None) if praefix in posen else None
        rot = [k["grund"][i] + (eigen["rotation"][i] if eigen else 0) for i in range(3)]
        pos = eigen["position"] if eigen else [0, 0, 0]
        sk = eigen["scale"] if eigen else [1, 1, 1]
        p = k["pivot"]
        m = mal(verschiebung(*pos), mal(verschiebung(*p), mal(drehmatrix(*rot),
                                                              mal(groesse(*sk), verschiebung(-p[0], -p[1], -p[2])))))
        if k["gebunden"]:
            # Ein gebundener Knochen sitzt mit seinem Drehpunkt auf dem
            # Drehpunkt des Knochens, an den er gebunden ist.
            ziel = drehpunkte[k["gebunden"]]
            m = mal(verschiebung(ziel[0] - p[0], ziel[1] - p[1], ziel[2] - p[2]), m)
        if k["eltern"] and k["eltern"] in knochen:
            eltern = matrix(k["eltern"])
            if name in posen[""].zum_koerper and not praefix:
                # Nur der Ort kommt von den Eltern, die Drehung nicht.
                ort = anwenden(eltern, [p[i] + pos[i] for i in range(3)])
                m = mal(verschiebung(*ort), mal(drehmatrix(*rot), mal(groesse(*sk), verschiebung(-p[0], -p[1], -p[2]))))
            else:
                m = mal(eltern, m)
        fertig[name] = m
        return m

    for name in knochen:
        matrix(name)
    return fertig


def flaechen(knochen, matrizen, texturen, nur=None, ohne_deckschicht=True):
    """Alle Seiten aller Kaesten, fertig gedreht, im Raum der Modelldatei."""
    aus = []
    for name, k in knochen.items():
        kurz = name.split(":")[-1]
        praefix = name.split(":")[0] + ":" if ":" in name else ""
        if nur is not None and not praefix and kurz not in nur:
            continue
        if ohne_deckschicht and not praefix and kurz in DECKSCHICHT:
            continue
        tex = texturen[praefix]
        for kasten in k["kaesten"]:
            m = matrizen[name]
            if kasten.get("rotation"):
                # Ein Kasten kann selbst gekippt sein (Flossen, Schwanz) - um
                # seinen eigenen Drehpunkt, innerhalb seines Knochens.
                kp = kasten.get("pivot", [0, 0, 0])
                m = mal(m, mal(verschiebung(*kp), mal(drehmatrix(*kasten["rotation"]),
                                                      verschiebung(-kp[0], -kp[1], -kp[2]))))
            seiten = flaechen_des_kastens(kasten["origin"], kasten["size"], kasten.get("inflate", 0) or 0)
            uv = kasten.get("uv", [0, 0])
            for seite, (ecken, aussen) in seiten.items():
                if isinstance(uv, list):
                    feld = uv_feld(uv, kasten["size"], seite)
                else:
                    e = uv.get(seite)
                    if not e:
                        continue
                    fu, fv = e["uv"]
                    fw, fh = e.get("uv_size", [1, 1])
                    if fw < 0:
                        fu, fw = fu + fw, -fw
                    if fh < 0:
                        fv, fh = fv + fh, -fh
                    feld = (fu, fv, fw, fh)
                welt = [anwenden(m, p) for p in ecken]
                mitte = tuple(sum(p[i] for p in ecken) / 4 for i in range(3))
                spitze = anwenden(m, tuple(mitte[i] + aussen[i] for i in range(3)))
                mw = anwenden(m, mitte)
                aus.append({"ecken": welt, "mitte": mw,
                            "normale": tuple(spitze[i] - mw[i] for i in range(3)),
                            "feld": feld, "tex": tex})
    return aus


# ------------------------------------------------------------ Malen

def _spiegel(p):
    # Bedrock zeigt die Modelldatei spiegelverkehrt in x (so auch
    # Blockbench): Der rechte Arm liegt in der Datei bei x = -5 und ist doch
    # von hinten gesehen rechts. Gemalt wird deshalb in der Spiegelung.
    return (-p[0], p[1], p[2])


def male(seiten, projektion, sichtpunkt, breite, hoehe, hintergrund, bild=None, tiefe=None):
    """Maler-Verfahren: hinten zuerst. projektion: Raumpunkt -> Bildpunkt oder None."""
    bild = bild or Image.new("RGBA", (breite, hoehe), hintergrund)
    zeichne = ImageDraw.Draw(bild)
    liste = []
    for f in seiten:
        m = _spiegel(f["mitte"])
        n = _spiegel(f["normale"])
        zur_kamera = sichtpunkt(m)
        if sum(n[i] * zur_kamera[i] for i in range(3)) <= 0:
            continue
        # Wie weit weg: ohne Fluchtpunkt entlang der Blickrichtung, sonst
        # der Abstand zur Kamera. (Anfangs stand hier fuer beide der
        # Abstand - ohne Fluchtpunkt ist der ueberall gleich, und der
        # Koecher lag vor der Brust statt dahinter.)
        liste.append((tiefe(m) if tiefe else sum(c * c for c in zur_kamera), f))
    licht = (0.35, 0.9, -0.25)
    for _, f in sorted(liste, key=lambda t: -t[0]):
        ecken = [_spiegel(p) for p in f["ecken"]]
        n = _spiegel(f["normale"])
        laenge = math.sqrt(sum(c * c for c in n)) or 1
        hell = 0.6 + 0.4 * max(0.0, sum(n[i] * licht[i] for i in range(3)) / laenge)
        fu, fv, fw, fh = (int(round(w)) for w in f["feld"])
        tex = f["tex"]
        if fw <= 0 or fh <= 0:
            continue
        p0, p1, p2, p3 = ecken
        for zeile in range(fh):
            for spalte in range(fw):
                farbe = tex.getpixel((min(max(fu + spalte, 0), tex.width - 1),
                                      min(max(fv + zeile, 0), tex.height - 1)))
                if farbe[3] == 0:
                    continue
                punkte = []
                for sa, sb in ((spalte / fw, zeile / fh), ((spalte + 1) / fw, zeile / fh),
                               ((spalte + 1) / fw, (zeile + 1) / fh), (spalte / fw, (zeile + 1) / fh)):
                    o = [p0[i] + (p1[i] - p0[i]) * sa for i in range(3)]
                    un = [p3[i] + (p2[i] - p3[i]) * sa for i in range(3)]
                    q = projektion([o[i] + (un[i] - o[i]) * sb for i in range(3)])
                    if q is None:
                        break
                    punkte.append(q)
                if len(punkte) == 4:
                    zeichne.polygon(punkte, fill=tuple(min(255, int(farbe[k] * hell)) for k in range(3)) + (255,))
    return bild


def ansicht_aussen(seiten, gier, neigung, breite, hoehe, zoom, mitte=(0, 16, 0), hintergrund=(236, 238, 242, 255)):
    """Von aussen, ohne Fluchtpunkt. Gier 0: von vorn, 90: von der rechten Seite des Spielers."""
    g, n = math.radians(gier), math.radians(neigung)
    # Alles hier in der Spiegelung gerechnet: Das Gesicht zeigt nach -z,
    # der rechte Arm liegt bei +x.
    richtung = (math.sin(g) * math.cos(n), math.sin(n), -math.cos(g) * math.cos(n))
    blick = tuple(-c for c in richtung)
    rechts = (blick[1] * 0 - blick[2] * 1, blick[2] * 0 - blick[0] * 0, blick[0] * 1 - blick[1] * 0)
    laenge = math.sqrt(sum(c * c for c in rechts)) or 1
    rechts = tuple(c / laenge for c in rechts)
    hoch = (rechts[1] * blick[2] - rechts[2] * blick[1],
            rechts[2] * blick[0] - rechts[0] * blick[2],
            rechts[0] * blick[1] - rechts[1] * blick[0])
    m = _spiegel(mitte)

    def proj(p):
        d = [p[i] - m[i] for i in range(3)]
        return (breite / 2 + zoom * sum(d[i] * rechts[i] for i in range(3)),
                hoehe / 2 - zoom * sum(d[i] * hoch[i] for i in range(3)))

    return male(seiten, proj, lambda p: richtung, breite, hoehe, hintergrund,
                tiefe=lambda p: -sum(p[i] * richtung[i] for i in range(3)))


def ansicht_ich(seiten, breite, hoehe, auge=(2.5, 25.0, -3.0), sichtfeld=55.0, hintergrund=(150, 190, 235, 255)):
    """Ich-Sicht: Die Kamera sitzt im Kopf und schaut in der Datei nach +z.

    Warum +z, obwohl das Gesicht nach -z zeigt: In der Ich-Sicht dreht
    Mojangs Grundhaltung den Kopf um 180 Grad, und die Arme werden in
    diese Richtung vor die Kamera geschoben (empty_hand: z = +12). Der
    rechte Arm wandert dabei nach x = +8.5 - in der Spiegelung also nach
    rechts im Bild, wo man ihn im Spiel auch sieht.
    """
    a = _spiegel(auge)
    f = (hoehe / 2) / math.tan(math.radians(sichtfeld / 2))

    def proj(p):
        d = [p[i] - a[i] for i in range(3)]
        if d[2] < 0.5:
            return None
        # Blick nach +z; rechts im Bild ist gespiegelt -x der Datei, also +x hier.
        return (breite / 2 - f * d[0] / d[2], hoehe / 2 - f * d[1] / d[2])

    return male(seiten, proj, lambda p: tuple(a[i] - p[i] for i in range(3)), breite, hoehe, hintergrund)


# ------------------------------------------------------------ Zusammensetzen

class Waffe:
    """Ein Attachable: Geometrie, Bild, Haltungsanimationen."""

    def __init__(self, attachable_datei):
        d = lade(attachable_datei)["minecraft:attachable"]["description"]
        self.kennung = d["identifier"]
        geo_name = d["geometry"]["default"]
        self.geo = None
        for datei in (RES / "models" / "entity").glob("*.json"):
            for g in lade(datei).get("minecraft:geometry", []):
                if g["description"]["identifier"] == geo_name:
                    self.geo = g
        self.textur = Image.open(RES / (d["textures"]["default"] + ".png")).convert("RGBA")
        alle = lade(MOJANG / "bow.animation.json").get("animations", {})
        for datei in (RES / "animations").glob("*.json"):
            alle.update(lade(datei).get("animations", {}))
        self.animationen = [alle[v] for k, v in d.get("animations", {}).items()
                            if v in alle and k in [s if isinstance(s, str) else next(iter(s)) for s in
                                     d.get("scripts", {}).get("animate", [])]]

    def pose(self, spieler_u, ich, platz="slot.weapon.mainhand"):
        werte = {"c.is_first_person": 1.0 if ich else 0.0, "c.item_slot": platz}
        for k, v in spieler_u.werte.items():
            if k.startswith("v."):
                werte["owner:" + k] = v
        u = molang.Umgebung(werte)
        # c.owning_entity->v.x liest den Spieler.
        u.werte.update({k: v for k, v in spieler_u.werte.items() if k.startswith("v.")})
        pose = Pose()
        for a in self.animationen:
            pose.lege_an(a, 1.0, spieler_u.lies("q.life_time"), u)
        return pose


def bild(spieler, zustand, waffe=None, ich=False, zustaende=None, zeiten=None,
         breite=360, hoehe=420, gier=30, neigung=10, zoom=9.0, auge=(2.5, 25.0, -3.0), nachher=None,
         ruestung=(), zweithand=None):
    zustand = dict(zustand)
    zustand["v.is_first_person"] = 1.0 if ich else 0.0
    if waffe:
        zustand.setdefault("hand", waffe.kennung)
    pose, u = spieler.pose(zustand, zustaende, zeiten)
    if nachher:
        nachher(pose)
    geo = lade(MOJANG / "humanoid_custom.geo.json")["geometry.humanoid.custom"]
    knochen = _modellknochen(geo)
    posen = {"": pose}
    texturen = {"": Image.open(MOJANG / "steve.png").convert("RGBA")}
    if waffe and waffe.geo:
        knochen.update(_modellknochen(waffe.geo, "w:", bindung="rightitem"))
        posen["w:"] = waffe.pose(u, ich)
        texturen["w:"] = waffe.textur
    if zweithand is not None and zweithand.geo:
        # In der Zweithand: gebunden an leftItem. In der Ich-Sicht bewegt
        # Minecraft den linken Arm nicht vor die Kamera - er bleibt, wo er
        # ist, und das Attachable schiebt sich selbst ins Bild (so macht es
        # Mojangs Schild, siehe links_ich_haltung in dolche_bauen.py).
        zustand.setdefault("zweithand", zweithand.kennung)
        knochen.update(_modellknochen(zweithand.geo, "z:", bindung="leftitem"))
        posen["z:"] = zweithand.pose(u, ich, "slot.weapon.offhand")
        texturen["z:"] = zweithand.textur
    for i, datei in enumerate(ruestung):
        # Ruestungsteile heften sich ueber den Namen an: Ein Knochen "head"
        # im Ruestungsmodell sitzt auf dem Kopf des Spielers. Ihre eigenen
        # Animationen (Umhang, Hutspitze) lesen den Spieler wie im Spiel.
        teil = Waffe(datei)
        praefix = f"r{i}:"
        knochenliste = _modellknochen(teil.geo, praefix)
        for name, k in knochenliste.items():
            kurz = name[len(praefix):]
            if kurz in knochen and not k["eltern"]:
                k["eltern"] = kurz
            elif k["eltern"] and k["eltern"] not in knochenliste and k["eltern"][len(praefix):] in knochen:
                k["eltern"] = k["eltern"][len(praefix):]
            elif k["eltern"] and k["eltern"] in knochenliste and kurz in knochen:
                # Ein Ruestungsknochen, der wie ein Spielerknochen heisst
                # (leftArm im Wams), haengt am Spielerknochen, nicht an body.
                k["eltern"] = kurz
        knochen.update(knochenliste)
        posen[praefix] = teil.pose(u, ich)
        texturen[praefix] = teil.textur
    drehpunkte = {n: k["pivot"] for n, k in knochen.items()}
    matrizen = baue_matrizen(knochen, posen, drehpunkte)
    # Mojangs Ich-Sicht zeigt den rechten Arm nur mit leerer Hand; mit
    # einer Waffe sieht man nur die Waffe (render controller first_person).
    sichtbar = (ICH_SICHTBAR if not zustand.get("hand") else set()) if ich else None
    seiten = flaechen(knochen, matrizen, texturen, nur=sichtbar)
    if ich:
        return ansicht_ich(seiten, breite, hoehe, auge=auge), u
    return ansicht_aussen(seiten, gier, neigung, breite, hoehe, zoom), u


def reihe(bilder, beschriftungen, ziel):
    b, h = bilder[0].size
    gesamt = Image.new("RGBA", (b * len(bilder), h + 22), (255, 255, 255, 255))
    zeichne = ImageDraw.Draw(gesamt)
    for i, (einzel, text) in enumerate(zip(bilder, beschriftungen)):
        gesamt.paste(einzel, (i * b, 0))
        zeichne.text((i * b + 8, h + 4), text, fill=(40, 40, 50, 255))
    gesamt.save(ziel)
    return ziel
