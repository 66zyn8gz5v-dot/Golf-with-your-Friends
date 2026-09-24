#!/usr/bin/env python3
"""Baut den Koerper des Ritters und die Vorlage fuer seine Haut.

Warum ein Werkzeug und keine von Hand geschriebene Datei: Ein Mensch
besteht aus acht Kaesten, die alle voneinander abhaengen - der Arm haengt
an der Schulter, der Helm am Kopf. Aendert sich die Koerpergroesse, muss
jede Zahl mitwandern. Hier steht sie einmal.

Das Feldmuster der Haut ist das von Minecraft selbst: Kopf oben links,
Koerper in der Mitte, Arme und Beine daneben. Wer schon einmal einen Skin
gemalt hat, findet sich sofort zurecht - und Vorlagen aus dem Netz passen.

    python3 werkzeuge/ritter_bauen.py
"""

import json
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
BILDER = WURZEL / "ressourcenpaket"

# Die Statur ist die eines Dorfbewohners, nicht die eines Spielers:
# grosser Kopf, tieferer Rumpf, kurze Beine. Zusammen 32 Pixel, also zwei
# Bloecke.
BEIN, RUMPF, KOPF = 12, 10, 10
TIEFE = 6                 # der Rumpf ist tiefer als bei einem Spieler
SCHULTER = BEIN + RUMPF   # Oberkante des Rumpfs


class Packer:
    """Sucht jedem Kasten einen freien Platz im Hautbild.

    Von Hand ging das, solange ein Mensch aus acht Wuerfeln bestand. Mit
    Helmglocke, Visier, Nackenschutz, Brustpanzer, Kittel und zwei
    Schulterstuecken sind es dreizehn, und die Netze haben krumme Masse.
    Beim ersten Versuch lief die Helmglocke rechts aus dem Bild: Ihr Netz
    ist 36 Pixel breit, und sie sollte bei x=32 anfangen.

    Ein Netz ist (Tiefe + Breite) * 2 breit und (Tiefe + Hoehe) hoch - so
    rechnet Minecraft es aus origin und size aus, und deshalb wird hier
    genauso gerechnet statt geschaetzt.
    """

    def __init__(self, breite=64, hoehe=128):
        self.breite, self.hoehe = breite, hoehe
        self.belegt = []

    def platz(self, b, h, t):
        netz_b, netz_h = 2 * (t + b), t + h
        for v in range(self.hoehe - netz_h + 1):
            for u in range(self.breite - netz_b + 1):
                kasten = (u, v, netz_b, netz_h)
                if not any(self._stoesst(kasten, alt) for alt in self.belegt):
                    self.belegt.append(kasten)
                    return [u, v]
        raise ValueError(
            f"Kein Platz mehr fuer ein Netz {netz_b} x {netz_h} in "
            f"{self.breite} x {self.hoehe} - die Haut muss groesser werden.")

    def fuellung(self):
        """Wie viel vom Bild belegt ist - wird es eng, sagt es das hier,
        bevor der naechste Kasten scheitert."""
        return sum(b * h for _, _, b, h in self.belegt) / (self.breite * self.hoehe)

    @staticmethod
    def _stoesst(a, b):
        return not (a[0] + a[2] <= b[0] or b[0] + b[2] <= a[0]
                    or a[1] + a[3] <= b[1] or b[1] + b[3] <= a[1])


def kasten(packer, ort, groesse, blaehen=0.0):
    """Ein Kasten samt Platz in der Haut. Die Masse werden aufgerundet:
    Ein Kasten von 1,5 Pixeln Tiefe braucht trotzdem zwei Pixel Bild."""
    import math
    b, h, t = (max(1, math.ceil(m)) for m in groesse)
    k = {"origin": ort, "size": groesse, "uv": packer.platz(b, h, t)}
    if blaehen:
        k["inflate"] = blaehen
    return k


def modell():
    """Die Knochen. Die Namen sind die von Minecraft - daran haengen die
    eingebauten Animationen fuers Gehen, Schlagen und Umschauen.

    Helm und Panzer sind eigene Kaesten, keine aufgeblasene zweite Haut.
    Eine aufgeblasene Haut waechst nach allen Seiten gleich und bleibt
    deshalb ein Wuerfel - sie kann keine Helmglocke, kein Visier und keine
    Schulterstuecke. Als eigene Kaesten ragen sie ueber die Silhouette
    hinaus, und der Ritter sieht von der Seite aus wie ein Ritter.
    """
    p = Packer()
    # Erst die grossen Teile, dann die kleinen: Ein Packer, der von oben
    # links sucht, verbaut sich sonst den Platz mit Kleinkram.
    teile = {}
    def nimm(name, *masse):
        teile[name] = kasten(p, *masse)
        return teile[name]

    kopf   = nimm("kopf",   [-4, SCHULTER, -4], [8, KOPF, 8])
    rumpf  = nimm("rumpf",   [-4, BEIN, -3], [8, RUMPF, TIEFE])
    glocke = nimm("glocke",  [-4.5, SCHULTER + 3, -4.5], [9, KOPF - 2, 9])
    kittel = nimm("kittel",  [-4.5, BEIN - 1, -3.5], [9, 5, TIEFE + 1])
    arm_r  = nimm("arm_r",   [-8, BEIN, -2], [4, RUMPF, 4])
    arm_l  = nimm("arm_l",   [4, BEIN, -2], [4, RUMPF, 4])
    bein_r = nimm("bein_r",  [-4, 0, -2], [4, BEIN, 4])
    bein_l = nimm("bein_l",  [0, 0, -2], [4, BEIN, 4])
    schulter_r = nimm("schulter_r", [-9, SCHULTER - 4, -3], [6, 5, 6])
    schulter_l = nimm("schulter_l", [3, SCHULTER - 4, -3], [6, 5, 6])
    panzer = nimm("panzer",  [-4.5, BEIN + 3, -3.8], [9, RUMPF - 3, 2])
    visier = nimm("visier",  [-4, SCHULTER + 2, -5], [8, 5, 1])
    nacken = nimm("nacken",  [-4, SCHULTER, 3.5], [8, 4, 1.5])

    return teile, {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry.ritter",
                "texture_width": 64,
                "texture_height": 128,
                "visible_bounds_width": 2,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": [
                {"name": "body", "pivot": [0, BEIN, 0],
                 "cubes": [rumpf, panzer, kittel]},
                {"name": "head", "parent": "body", "pivot": [0, SCHULTER, 0],
                 "cubes": [kopf]},
                {"name": "hat", "parent": "head", "pivot": [0, SCHULTER, 0],
                 "cubes": [glocke, visier, nacken]},
                {"name": "rightArm", "parent": "body", "pivot": [-5, SCHULTER - 2, 0],
                 "cubes": [arm_r, schulter_r]},
                {"name": "leftArm", "parent": "body", "pivot": [5, SCHULTER - 2, 0],
                 "cubes": [arm_l, schulter_l]},
                {"name": "rightLeg", "parent": "body", "pivot": [-2, BEIN, 0],
                 "cubes": [bein_r]},
                {"name": "leftLeg", "parent": "body", "pivot": [2, BEIN, 0],
                 "cubes": [bein_l]},
                {"name": "rightItem", "parent": "rightArm", "pivot": [-6, BEIN + 2, 1]},
                {"name": "leftItem", "parent": "leftArm", "pivot": [6, BEIN + 2, 1]},
            ],
        }],
    }


def main():
    teile, geo = modell()
    ziel = BILDER / "models" / "entity" / "ritter.geo.json"
    ziel.write_text(json.dumps(geo, indent=2) + "\n")
    grundhaut(teile).save(BILDER / "textures" / "entity" / "ritter.png")
    b = geo["minecraft:geometry"][0]["bones"]
    print(f"gebaut: {ziel.name} - {len(b)} Knochen, "
          f"{sum(len(k.get('cubes', [])) for k in b)} Kaesten, "
          f"{BEIN + RUMPF + KOPF} Pixel hoch")


if __name__ == "__main__":
    main()


# ----------------------------------------------------- Die Haut

from PIL import Image, ImageDraw   # noqa: E402  (erst hier gebraucht)

# Die Toene sind die des Pakets, damit der Ritter neben den Klingen steht
# und nicht daneben.
UMRISS   = (44, 46, 58, 255)
STAHL_H  = (228, 233, 240, 255)
STAHL_S  = (168, 178, 194, 255)
STAHL_T  = (104, 114, 134, 255)
LEDER_H  = (146, 98, 56, 255)
LEDER_D  = (94, 60, 34, 255)
HAUT     = (214, 170, 132, 255)
HAUT_S   = (176, 134, 100, 255)
AUGE     = (44, 46, 58, 255)
FEDER    = (186, 32, 56, 255)


def flaechen(u, v, b, h, t):
    """Wo die sechs Seiten eines Kastens im Bild liegen.

    Minecrafts Netz: oben und unten nebeneinander in der ersten Reihe,
    darunter rechts, vorn, links, hinten. Diese Aufteilung ist nicht
    frei gewaehlt - sie ist die, die das Spiel aus uv und size errechnet.
    """
    return {
        "oben":   (u + t,         v,     b, t),
        "unten":  (u + t + b,     v,     b, t),
        "rechts": (u,             v + t, t, h),
        "vorn":   (u + t,         v + t, b, h),
        "links":  (u + t + b,     v + t, t, h),
        "hinten": (u + t + b + t, v + t, b, h),
    }


def fuelle(bild, feld, farbe):
    x, y, b, h = feld
    ImageDraw.Draw(bild).rectangle([x, y, x + b - 1, y + h - 1], fill=farbe)


# Welcher Teil welche Farbe bekommt. Nur die Grundierung - das Bild ist
# zum Weitermalen da, nicht als fertige Gestaltung.
ANSTRICH = {
    "kopf":       (HAUT, HAUT_S),
    "rumpf":      (LEDER_H, LEDER_D),
    "kittel":     (LEDER_H, LEDER_D),
    "glocke":     (STAHL_S, STAHL_T),
    "visier":     (UMRISS, UMRISS),
    "nacken":     (STAHL_S, STAHL_T),
    "panzer":     (STAHL_H, STAHL_S),
    "arm_r":      (STAHL_S, STAHL_T),
    "arm_l":      (STAHL_H, STAHL_S),
    "schulter_r": (STAHL_H, STAHL_S),
    "schulter_l": (STAHL_H, STAHL_S),
    "bein_r":     (LEDER_H, LEDER_D),
    "bein_l":     (LEDER_H, LEDER_D),
}


def grundhaut(teile, mit_feder=False):
    """Malt jedes Netz in seiner Grundfarbe.

    Die Felder kommen aus dem Modell, nicht aus einer zweiten Liste. Sonst
    laufen beide auseinander, sobald ein Kasten wandert - und man sieht es
    erst im Spiel, wenn ein Arm ploetzlich das Muster des Helms traegt.
    """
    import math
    bild = Image.new("RGBA", (64, 128), (0, 0, 0, 0))
    for name, k in teile.items():
        u, v = k["uv"]
        b, h, t = (max(1, math.ceil(m)) for m in k["size"])
        vorn, hinten = ANSTRICH[name]
        for seite, feld in flaechen(u, v, b, h, t).items():
            fuelle(bild, feld, hinten if seite in ("hinten", "unten") else vorn)

    # Gesicht: zwei Augen auf die Vorderseite des Kopfes
    u, v = teile["kopf"]["uv"]
    x, y, b, h = flaechen(u, v, 8, KOPF, 8)["vorn"]
    for dx in (2, 5):
        fuelle(bild, (x + dx, y + 4, 1, 1), AUGE)

    # Sehschlitz ins Visier, sonst ist es nur ein schwarzes Brett
    u, v = teile["visier"]["uv"]
    x, y, b, h = flaechen(u, v, 8, 5, 1)["vorn"]
    fuelle(bild, (x, y + 1, 8, 2), STAHL_T)
    fuelle(bild, (x + 3, y + 1, 2, 2), UMRISS)

    if mit_feder:
        u, v = teile["glocke"]["uv"]
        x, y, b, h = flaechen(u, v, 9, 8, 9)["oben"]
        fuelle(bild, (x + 3, y, 3, 9), FEDER)
    return bild


def feldkarte():
    """Dasselbe Raster, aber eingefaerbt und beschriftet - zum Nachschauen,
    nicht zum Einbauen."""
    felder = [
        ("Kopf", 0, 0, 8, 8, 8, (214, 170, 132)),
        ("Helm", 32, 0, 8, 8, 8, (168, 178, 194)),
        ("Rumpf", 16, 16, 8, 12, 4, (120, 170, 220)),
        ("Rumpf: Ruestung", 16, 32, 8, 12, 4, (80, 130, 190)),
        ("Arm rechts", 40, 16, 4, 12, 4, (230, 170, 80)),
        ("Arm rechts: Ruestung", 40, 32, 4, 12, 4, (190, 130, 50)),
        ("Arm links", 32, 48, 4, 12, 4, (240, 200, 120)),
        ("Arm links: Ruestung", 48, 48, 4, 12, 4, (200, 160, 90)),
        ("Bein rechts", 0, 16, 4, 12, 4, (150, 200, 140)),
        ("Bein rechts: Ruestung", 0, 32, 4, 12, 4, (110, 160, 100)),
        ("Bein links", 16, 48, 4, 12, 4, (190, 220, 170)),
        ("Bein links: Ruestung", 0, 48, 4, 12, 4, (150, 180, 130)),
    ]
    bild = Image.new("RGB", (64, 64), (246, 244, 239))
    for _, u, v, b, h, t, farbe in felder:
        for name, seite in flaechen(u, v, b, h, t).items():
            hell = {"vorn": 1.0, "oben": 1.15, "links": 0.85,
                    "rechts": 0.85, "hinten": 0.7, "unten": 0.6}[name]
            fuelle(bild, seite, tuple(min(255, int(k * hell)) for k in farbe))
    return bild, felder
