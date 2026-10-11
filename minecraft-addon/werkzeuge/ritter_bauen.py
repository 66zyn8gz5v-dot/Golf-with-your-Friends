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

# Fynns Entwurf ist Zeile fuer Zeile das Mass eines Minecraft-Skins:
# Kopf 8 hoch und 8 breit, darunter zwoelf Zeilen ueber die volle Breite
# von sechzehn - das sind Rumpf und beide Arme -, dann zwoelf Zeilen
# Beine. Zusammen 32, also zwei Bloecke. Deshalb steht hier kein eigenes
# Mass, sondern genau dieses.
KOPF, RUMPF, BEIN = 8, 12, 12
TIEFE = 4                  # so tief ist ein Rumpf in Minecraft
SCHULTER = BEIN + RUMPF    # Oberkante des Rumpfs


def modell():
    """Ein Koerper, sonst nichts.

    Keine Helmglocke, keine Schulterstuecke, kein aufgesetzter Panzer:
    Fynns Bild ist der Skin, und was darauf gemalt ist, ist gemalte
    Ruestung. Die richtige Ruestung wird spaeter ein eigenes Stueck, das
    er anzieht - und die braucht einen glatten Koerper darunter, sonst
    steckt sie in Schulterstuecken fest, die schon da sind.

    Die Felder sind die eines gewoehnlichen Skins: Kopf oben links,
    Kopfhuelle daneben, Rumpf in der Mitte, Arme und Beine an den
    bekannten Stellen. Damit passt jede Vorlage aus dem Netz, und jeder
    Skin-Editor kann die Haut oeffnen.
    """
    def k(ort, groesse, uv):
        return {"origin": ort, "size": groesse, "uv": uv}

    teile = {
        "kopf":   k([-4, SCHULTER, -4], [8, KOPF, 8], [0, 0]),
        "huelle": k([-4, SCHULTER, -4], [8, KOPF, 8], [32, 0]),
        "rumpf":  k([-4, BEIN, -2], [8, RUMPF, TIEFE], [16, 16]),
        "arm_r":  k([-8, BEIN, -2], [4, RUMPF, TIEFE], [40, 16]),
        "arm_l":  k([4, BEIN, -2], [4, RUMPF, TIEFE], [32, 48]),
        "bein_r": k([-4, 0, -2], [4, BEIN, TIEFE], [0, 16]),
        "bein_l": k([0, 0, -2], [4, BEIN, TIEFE], [16, 48]),
    }
    teile["huelle"]["inflate"] = 0.5

    return teile, {
        "format_version": "1.12.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": "geometry.ritter",
                "texture_width": 64,
                "texture_height": 64,
                "visible_bounds_width": 2,
                "visible_bounds_height": 3,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": [
                {"name": "body", "pivot": [0, BEIN, 0], "cubes": [teile["rumpf"]]},
                {"name": "head", "parent": "body", "pivot": [0, SCHULTER, 0],
                 "cubes": [teile["kopf"]]},
                # Die Kopfhuelle bleibt leer, solange nichts drauf gemalt
                # ist - aber der Knochen steht schon da, damit die Ruestung
                # spaeter einen Platz hat.
                {"name": "hat", "parent": "head", "pivot": [0, SCHULTER, 0],
                 "cubes": [teile["huelle"]]},
                {"name": "rightArm", "parent": "body", "pivot": [-5, SCHULTER - 2, 0],
                 "cubes": [teile["arm_r"]]},
                {"name": "leftArm", "parent": "body", "pivot": [5, SCHULTER - 2, 0],
                 "cubes": [teile["arm_l"]]},
                {"name": "rightLeg", "parent": "body", "pivot": [-2, BEIN, 0],
                 "cubes": [teile["bein_r"]]},
                {"name": "leftLeg", "parent": "body", "pivot": [2, BEIN, 0],
                 "cubes": [teile["bein_l"]]},
                {"name": "rightItem", "parent": "rightArm", "pivot": [-6, BEIN + 2, 1]},
                {"name": "leftItem", "parent": "leftArm", "pivot": [6, BEIN + 2, 1]},
            ],
        }],
    }


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
def aus_ansichten(teile, vorn, hinten, seite_links, seite_rechts=None):
    """Malt die Haut aus drei Bildern der fertigen Figur.

    Eine Skin-Vorschau zeigt, wie der Ritter aussehen soll - aber nicht,
    welches Rechteck im Hautbild dazu gehoert. Das laesst sich ausrechnen:
    Jeder Kasten weiss, wo er im Raum steht, und jede seiner sechs Seiten
    schaut in eine bekannte Richtung. Die Vorderseite holt sich ihren
    Ausschnitt aus der Vorderansicht, die Seiten aus der Seitenansicht.

    Oben und unten kommen in einer Vorschau nicht vor. Sie bekommen die
    oberste beziehungsweise unterste Zeile ihrer Vorderseite - besser als
    eine geratene Farbe, und an einem Helm sieht man die Oberseite ohnehin
    nur von einer Leiter aus.
    """
    import math
    if seite_rechts is None:
        seite_rechts = seite_links     # eine Ansicht fuer beide Seiten
    bild = Image.new("RGBA", (64, 64), (0, 0, 0, 0))
    hoch = vorn.height

    def hole(quelle, bx, by):
        """Ein Pixel aus einer Ansicht, am Rand festgehalten."""
        x = min(max(bx, 0), quelle.width - 1)
        y = min(max(by, 0), quelle.height - 1)
        return quelle.getpixel((x, y))

    for name, k in teile.items():
        if name == "huelle":
            continue          # bleibt durchsichtig, bis es eine Ruestung gibt
        ox, oy, oz = k["origin"]
        b, h, t = k["size"]
        u, v = k["uv"]
        felder = flaechen(u, v, math.ceil(b), math.ceil(h), math.ceil(t))
        for seiten_name, (fx, fy, fb, fh) in felder.items():
            for dy in range(fh):
                for dx in range(fb):
                    # Wo dieser Pixel am Koerper sitzt, in Modellmassen
                    if seiten_name in ("vorn", "hinten"):
                        mx = ox + (dx if seiten_name == "vorn" else b - 1 - dx)
                        my = oy + h - 1 - dy
                        quelle, qx = (vorn if seiten_name == "vorn" else hinten), mx + 8
                    elif seiten_name in ("rechts", "links"):
                        mz = oz + (dx if seiten_name == "links" else t - 1 - dx)
                        my = oy + h - 1 - dy
                        quelle = seite_links if seiten_name == "links" else seite_rechts
                        qx = mz + 4
                    else:                       # oben und unten
                        mx = ox + dx
                        my = oy + h - 1 if seiten_name == "oben" else oy
                        quelle, qx = vorn, mx + 8
                    farbe = hole(quelle, int(qx), int(hoch - 1 - my))
                    bild.putpixel((fx + dx, fy + dy), farbe + (255,))
    return bild
def main():
    teile, geo = modell()
    ziel = BILDER / "models" / "entity" / "ritter.geo.json"
    ziel.write_text(json.dumps(geo, indent=2) + "\n")

    vorlagen = Path(__file__).resolve().parent / "vorlagen" / "ritter"
    # Vier Ansichten, wenn es sie gibt - die Vorschau aus dem anderen Chat
    # zeigt beide Seiten, und die sind nicht gleich. Sonst drei, mit einer
    # Seitenansicht fuer links und rechts.
    namen = ["vorn", "hinten", "links", "rechts"]
    if not (vorlagen / "links.png").exists():
        namen = ["vorn", "hinten", "seite"]
    fehlend = [n for n in namen if not (vorlagen / (n + ".png")).exists()]
    if fehlend:
        raise SystemExit("Ansichten fehlen in %s: %s" % (vorlagen, fehlend))
    haut = aus_ansichten(teile, *(Image.open(vorlagen / (n + ".png")).convert("RGB")
                                  for n in namen))
    helm_aufsetzen(haut, teile,
                   *(Image.open(vorlagen / (n + ".png")).convert("RGB")
                     for n in namen))
    haut.save(BILDER / "textures" / "entity" / "ritter.png")

    b = geo["minecraft:geometry"][0]["bones"]
    print(f"gebaut: {ziel.name} - {len(b)} Knochen, "
          f"{sum(len(k.get('cubes', [])) for k in b)} Kaesten, "
          f"{BEIN + RUMPF + KOPF} Pixel hoch")
    print(f"  Haut aus Fynns drei Ansichten: {haut.width} x {haut.height}")




# ---------------------------------------------------------- Der Helm

# Die Stahltoene aus Fynns eigenem Entwurf, damit der Helm zum Rest passt.
H_GLANZ  = (214, 221, 231, 255)
H_HELL   = (180, 188, 201, 255)
H_MITTE  = (143, 151, 170, 255)
H_TIEF   = (104, 109, 125, 255)
H_SCHATT = (67, 74, 92, 255)
H_KANTE  = (39, 44, 59, 255)
SCHWARZ  = (12, 12, 16, 255)


def helm_aufsetzen(bild, teile, vorn, hinten, links, rechts):
    """Hebt den gemalten Helm auf die Kopfhuelle und stanzt die Sehschlitze
    aus.

    Der Helm ist in Fynns Entwurf auf den Kopf gemalt. Dort ist er flach:
    Die Sehschlitze liegen in derselben Ebene wie das Metall, wie
    aufgedruckt. Auf der Huelle - die einen halben Pixel weiter aussen
    liegt - werden dieselben Schlitze zu Loechern, und dahinter liegt der
    geschwaerzte Kopf. Man schaut in den Helm hinein und sieht nichts.

    Seine Gestaltung bleibt dabei unangetastet; sie wandert nur eine
    Schicht nach aussen. Etwas Eigenes zu malen waere einfacher gewesen,
    haette aber seine Arbeit ueberdeckt. Aus demselben Grund sitzt nichts
    mehr obendrauf: Ein Kamm als Kasten stand hier, aber er passte nicht
    zum Helm darunter.

    Ausgestanzt wird, was dunkel ist - aber nicht, wenn die ganze Zeile
    dunkel ist. Eine durchgehend dunkle Zeile ist ein Stirnband oder eine
    Kante, kein Schlitz. Ohne diese Unterscheidung faellt der Helm ausein-
    ander: Das Stirnband ist genauso schwarz wie der Sehspalt.
    """
    kopf_felder = flaechen(*teile["kopf"]["uv"], 8, KOPF, 8)
    huelle = flaechen(*teile["huelle"]["uv"], 8, KOPF, 8)

    # Den gemalten Helm von der Kopfschicht auf die Huelle heben
    for name in huelle:
        qx, qy, qb, qh = kopf_felder[name]
        zx, zy, zb, zh = huelle[name]
        for dy in range(min(qh, zh)):
            for dx in range(min(qb, zb)):
                bild.putpixel((zx + dx, zy + dy), bild.getpixel((qx + dx, qy + dy)))

    # Der Kopf darunter wird schwarz - nicht damit man ihn sieht, sondern
    # damit man ihn nicht sieht.
    for feld in kopf_felder.values():
        fuelle(bild, feld, SCHWARZ)

    # Die Schlitze ausstanzen, nur auf der Vorderseite
    x, y, b, h = huelle["vorn"]
    for dy in range(h):
        zeile = [bild.getpixel((x + dx, y + dy)) for dx in range(b)]
        dunkel = [sum(p[:3]) < 260 for p in zeile]
        if all(dunkel):
            continue                      # Stirnband oder Kante
        for dx, ist_dunkel in enumerate(dunkel):
            if ist_dunkel:
                bild.putpixel((x + dx, y + dy), (0, 0, 0, 0))

    return bild


if __name__ == "__main__":
    main()
