#!/usr/bin/env python3
"""Baut Fynns Ritterruestung: vier Teile zum Anziehen, mit eigenem Modell.

Minecraft-Ruestung ist von sich aus schon ein wenig 3D: Sie liegt als
aufgeblasene Kaesten ueber dem Koerper. "Richtig 3D" heisst hier, dass
Teile darueber hinausragen - so wie in Fynns Vorschau:

* Schulterplatten, die seitlich, vorn und oben ueber Arm und Brust stehen,
* ein Kinnschutz, der vorn unten aus dem Helm ragt, mit Atemloechern,
* Knieplatten vorn am Beinschutz.

Die Grundkaesten tragen die beiden Trage-Ebenen aus der Pixelschmiede.
Sie sind im Standardformat gemalt, darum stimmt dort jede Seite ohne
Nacharbeit. Die Zusatzteile bekommen die Flaechen, die in den
Trage-Ebenen frei sind: Beim Helm-Bild ist das die Ecke, in der bei einer
Spielerhaut die zweite Kopfschicht liegt, bei der zweiten Ebene der
ganze obere Streifen.

Ein Modell je Teil, weil Minecraft jedes Teil einzeln anzieht. Die
Knochen heissen wie beim Spieler (head, body, rightArm ...) und haben
dieselben Drehpunkte - daran haengt Minecraft die Ruestung an den
Traeger, und nur so geht sie beim Laufen mit.

    python3 werkzeuge/ruestung_bauen.py
"""

import json
from pathlib import Path

from PIL import Image

from vorlagen import ritterruestung as vorlage

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"

# Wie weit die Grundkaesten ueber dem Koerper liegen - dieselben Werte wie
# bei Minecrafts eigener Ruestung. Der Beinschutz liegt enger als die
# Stiefel, sonst stuende er an den Waden durch sie hindurch.
AUFGEBLASEN = {"helm": 1.0, "brust": 1.0, "hose": 0.5, "stiefel": 1.0}

# Kurzzeichen fuer die Zusatzteile, auf die Farben der Vorlage gelegt.
# Die armenischen Zeichen der Pixelschmiede sind beim Malen von Hand kaum
# auseinanderzuhalten.
KURZ = {"W": "Բ", "w": "Գ", "s": "Դ", "m": "Ե", "d": "Զ", "#": "Ա",
        "B": "Է", "u": "Ժ", "b": "Ը", "n": "Թ"}


def netz(bild, u, v, groesse, seiten, ueberschreiben=False):
    """Malt einen Kasten ins Kastennetz, so wie Bedrock es liest.

    Die Lage der Seiten ist die aus modell_ansehen.py, nachgesehen an
    Mojangs steve.png: oben (u+d, v), unten (u+d+w, v), darunter die vier
    Seiten west, vorn, ost, hinten. West ist beim rechten Arm aussen.
    """
    w, h, d = groesse
    felder = {
        "oben":   (u + d, v, w, d),
        "unten":  (u + d + w, v, w, d),
        "west":   (u, v + d, d, h),
        "vorn":   (u + d, v + d, w, h),
        "ost":    (u + d + w, v + d, d, h),
        "hinten": (u + d + w + d, v + d, w, h),
    }
    px = bild.load()
    for name, (x0, y0, fw, fh) in felder.items():
        karte = seiten[name]
        assert len(karte) == fh and all(len(z) == fw for z in karte), (name, karte)
        for y, zeile in enumerate(karte):
            for x, z in enumerate(zeile):
                if not ueberschreiben:
                    assert px[x0 + x, y0 + y][3] == 0, f"{name} ueberdeckt ({x0+x},{y0+y})"
                farbe = vorlage.FARBEN[KURZ.get(z, z)]
                px[x0 + x, y0 + y] = tuple(farbe[:3]) + (255,)


def voll(zeichen, b, h):
    return [zeichen * b] * h


# --- Die Zusatzteile -------------------------------------------------

# Schulterplatte, 7 breit, 5 hoch, 7 tief. Zwei Schienen uebereinander,
# getrennt von einer dunklen Fuge - so liest man sie als geschichtetes
# Metall statt als Klotz. Die Punkte auf der unteren Schiene sind Nieten.
SCHULTER = (7, 5, 7)
SCHULTER_SEITE = [
    "WWWWWWw",
    "wwwWwws",
    "mmmmmmm",
    "wWwwwWs",
    "ssssssm",
]
SCHULTER_SEITEN = {
    "oben": [
        "wWWWWWw",
        "Wwwwwws",
        "Wwwwwws",
        "Wwwdwws",
        "Wwwwwws",
        "Wwwwwws",
        "wssssss",
    ],
    "unten": voll("d", 7, 7),
    "west": SCHULTER_SEITE,          # aussen
    "vorn": SCHULTER_SEITE,
    "hinten": SCHULTER_SEITE,
    # Innen, steckt im Koerper - trotzdem bemalt: Bei der gespiegelten
    # linken Platte landet diese Seite je nach Spiegelung aussen.
    "ost": SCHULTER_SEITE,
}

# Kinnschutz, 7 breit, 3 hoch, 1 tief: die Leiste mit den drei
# Atemloechern aus Fynns Vorschau, vorn aus dem Helm heraus.
KINN = (6, 3, 1)
KINN_SEITEN = {
    "oben": ["wwwwww"],
    "unten": ["dddddd"],
    "west": ["W", "s", "d"],
    "ost": ["W", "#", "d"],
    "vorn": None,                    # wird aus der Vorlage genommen
    "hinten": voll("d", 6, 3),
}

# Knieplatte, 4 breit, 3 hoch, 1 tief.
KNIE = (4, 3, 1)
KNIE_SEITEN = {
    "oben": ["wWWw"],
    "unten": ["dddd"],
    "west": ["w", "s", "m"],
    "ost": ["w", "s", "m"],
    "vorn": [
        "sWWs",
        "wWws",
        "mssd",
    ],
    "hinten": voll("d", 4, 3),
}

# Beintaschen: der blaue Bund oben an jedem Bein. In Fynns Vorschau ist er
# das Auffaelligste zwischen Kettenhemd und Beinschienen. Der Beinschutz
# hat ihn zwar aufgemalt - aber am Rumpf, und dort liegt er unter dem
# Brustpanzer, sobald man beides traegt. Darum ein eigener Kasten je
# Bein, weiter aufgeblasen als der Beinschutz, damit er unter dem Panzer
# hervorschaut. Die Blautoene sind die der 3D-Textur.
TASCHE = (4, 2, 4)
TASCHEN_SEITEN = {
    "oben": voll("b", 4, 4),
    "unten": voll("n", 4, 4),
    # Von links hell nach rechts dunkel, wie in der Vorschau. Der erste
    # Wurf war fast nur Dunkelblau und las sich im Spielbild als schwarzer
    # Streifen.
    "west": ["Buub", "ubbu"],
    "vorn": ["BBuu", "Buub"],
    "ost": ["uubb", "ubbn"],
    "hinten": ["BBuu", "Bubb"],
}

# Wo die Zusatzteile im Bild liegen: in Flaechen, die die Trage-Ebenen
# frei lassen. netz() bricht ab, wenn doch etwas ueberdeckt wuerde.
UV_SCHULTER = (32, 0)    # Ebene 1
UV_KINN = (32, 12)       # Ebene 1
UV_KNIE = (0, 0)         # Ebene 2
UV_TASCHE = (16, 0)      # Ebene 2

# Die Gesichtsoeffnung im Helm, in Pixeln der Helmfront. Durchsichtig
# heisst hier wirklich offen: Minecrafts Ruestungsmaterial laesst Luecken
# durch, so wie beim Kettenhemd.
GESICHT_ZEILEN = (3, 4)
GESICHT_SPALTEN = range(1, 7)


def bild_aus(karte):
    b = Image.new("RGBA", (len(karte[0]), len(karte)))
    px = b.load()
    for y, zeile in enumerate(karte):
        for x, z in enumerate(zeile):
            px[x, y] = tuple(vorlage.FARBEN[z][:3]) + (255,) if z != "." else (0, 0, 0, 0)
    return b


def texturen():
    eins = bild_aus(vorlage.TRAGE_1)
    # Der Helm der Trage-Ebene hat einen durchgehenden dunklen Ring statt
    # zweier Sehschlitze und kein weisses Band oben - anders als in Fynns
    # Vorschau. Die 3D-Textur hat ihn so, wie er dort aussieht; er wird
    # hier ueber den der Trage-Ebene gelegt.
    netz(eins, 0, 0, (8, 8, 8), {
        "oben": vorlage.HELM_OBEN, "unten": vorlage.HELM_UNTEN,
        "west": vorlage.HELM_WEST, "vorn": vorlage.HELM_VORN,
        "ost": vorlage.HELM_OST, "hinten": vorlage.HELM_HINTEN,
    }, ueberschreiben=True)
    # Das Gesicht bleibt auf Augenhoehe frei: Zeilen 3 und 4 der
    # Helmfront, Spalten 1 bis 6. Fynn wollte vom Skin noch etwas sehen.
    # Darunter sitzt der Kinnschutz, ueber der Oeffnung Band und Stirn -
    # ein offener Helm statt eines geschlossenen. Die Helmfront liegt im
    # Kastennetz bei (8, 8).
    px = eins.load()
    for zeile in GESICHT_ZEILEN:
        for spalte in GESICHT_SPALTEN:
            px[8 + spalte, 8 + zeile] = (0, 0, 0, 0)
    netz(eins, *UV_SCHULTER, SCHULTER, SCHULTER_SEITEN)
    netz(eins, *UV_KINN, KINN, dict(KINN_SEITEN, vorn=vorlage.VISIER_VORN))
    zwei = bild_aus(vorlage.TRAGE_2)
    netz(zwei, *UV_KNIE, KNIE, KNIE_SEITEN)
    netz(zwei, *UV_TASCHE, TASCHE, TASCHEN_SEITEN)
    return eins, zwei


# --- Die Modelle -----------------------------------------------------

def kasten(ursprung, groesse, uv, aufblasen=0.0, gespiegelt=False):
    k = {"origin": ursprung, "size": list(groesse), "uv": list(uv)}
    if aufblasen:
        k["inflate"] = aufblasen
    if gespiegelt:
        k["mirror"] = True
    return k


def knochen(name, drehpunkt, kaesten=(), eltern="body"):
    k = {"name": name, "pivot": drehpunkt}
    if name != "body":
        k["parent"] = eltern
    if kaesten:
        k["cubes"] = list(kaesten)
    return k


# Die Drehpunkte des Spielers. Stimmen sie nicht, haengt die Ruestung beim
# Gehen neben den Gliedern.
DREH = {"body": [0, 24, 0], "head": [0, 24, 0], "rightArm": [-5, 22, 0],
        "leftArm": [5, 22, 0], "rightLeg": [-1.9, 12, 0], "leftLeg": [1.9, 12, 0]}


def modelle():
    a = AUFGEBLASEN
    helm = [
        knochen("body", DREH["body"]),
        knochen("head", DREH["head"], [
            kasten([-4, 24, -4], (8, 8, 8), (0, 0), a["helm"]),
            # Vor die Helmfront gesetzt, die bei z = -5 liegt: -4 und ein
            # Pixel Aufblasen. Er deckt die aufgemalten Atemloecher der
            # Trage-Ebene und bringt eigene mit, die jetzt vorstehen.
            kasten([-3, 23.5, -6], KINN, UV_KINN),
        ]),
    ]
    brust = [
        knochen("body", DREH["body"], [kasten([-4, 12, -2], (8, 12, 4), (16, 16), a["brust"])]),
        # Keine Aermel. Die erste Fassung hatte sie, aufgeblasen wie bei
        # Minecrafts Ruestung - und darin steckte die Hand: Das Schwert lag
        # im Blech statt in der Hand. Fynn: "die Arme muessten frei bleiben".
        # Die Schulterplatten bleiben; sie sitzen oben am Arm, weit weg von
        # dem, was man haelt.
        knochen("rightArm", DREH["rightArm"], [
            # Die Platte sitzt auf der Armspitze (x -8 bis -4, bis y 24)
            # und steht nach innen zwei Pixel ueber die Brust - von vorn
            # sieht man sie deshalb breiter als den Arm, wie in der Vorschau.
            kasten([-9.5, 20.5, -3.5], SCHULTER, UV_SCHULTER),
        ]),
        knochen("leftArm", DREH["leftArm"], [
            kasten([2.5, 20.5, -3.5], SCHULTER, UV_SCHULTER, gespiegelt=True),
        ]),
    ]
    hose = [
        knochen("body", DREH["body"], [kasten([-4, 12, -2], (8, 12, 4), (16, 16), a["hose"])]),
        knochen("rightLeg", DREH["rightLeg"], [
            kasten([-3.9, 0, -2], (4, 12, 4), (0, 16), a["hose"]),
            # Vor den Stiefeln, die vorn bei z = -3 enden - sonst verschwaende
            # das Knie unter ihnen, sobald beides getragen wird.
            kasten([-3.9, 5.5, -3.75], KNIE, UV_KNIE),
            # Bis y 11,9 aufgeblasen - der Brustpanzer endet bei 11 und
            # deckt den oberen Rand, darunter bleiben knapp drei Pixel Blau.
            kasten([-3.9, 10, -2], TASCHE, UV_TASCHE, 0.9),
        ]),
        knochen("leftLeg", DREH["leftLeg"], [
            kasten([-0.1, 0, -2], (4, 12, 4), (0, 16), a["hose"], gespiegelt=True),
            kasten([-0.1, 5.5, -3.75], KNIE, UV_KNIE, gespiegelt=True),
            kasten([-0.1, 10, -2], TASCHE, UV_TASCHE, 0.9, gespiegelt=True),
        ]),
    ]
    stiefel = [
        knochen("body", DREH["body"]),
        knochen("rightLeg", DREH["rightLeg"], [kasten([-3.9, 0, -2], (4, 12, 4), (0, 16), a["stiefel"])]),
        knochen("leftLeg", DREH["leftLeg"], [kasten([-0.1, 0, -2], (4, 12, 4), (0, 16), a["stiefel"], gespiegelt=True)]),
    ]
    return {"ritterhelm": helm, "ritterbrustpanzer": brust,
            "ritterbeinschutz": hose, "ritterstiefel": stiefel}


def geo(name, knochenliste):
    return {
        "format_version": "1.16.0",
        "minecraft:geometry": [{
            "description": {
                "identifier": f"geometry.{name}",
                "texture_width": 64, "texture_height": 32,
                "visible_bounds_width": 3, "visible_bounds_height": 3.5,
                "visible_bounds_offset": [0, 1.5, 0],
            },
            "bones": knochenliste,
        }],
    }


def gesamtansicht(eins, zwei, modelle_):
    """Alle vier Teile an einem Koerper, zum Vergleich mit Fynns Vorschau.

    Nur fuers Ansehen: beide Ebenen uebereinander in ein Bild, und die
    Kaesten des Beinschutzes lesen ihr Feld eine Bildhoehe tiefer.
    """
    import modell_ansehen
    bild = Image.new("RGBA", (64, 64))
    bild.paste(eins, (0, 0)); bild.paste(zwei, (0, 32))
    alle = {}
    for name, liste in modelle_.items():
        for k in liste:
            ziel = alle.setdefault(k["name"], {"name": k["name"], "pivot": k["pivot"], "cubes": []})
            if "parent" in k:
                ziel["parent"] = k["parent"]
            for c in k.get("cubes", []):
                c = dict(c)
                if name == "ritterbeinschutz":
                    c["uv"] = [c["uv"][0], c["uv"][1] + 32]
                ziel["cubes"].append(c)
    g = geo("ritterruestung_ansicht", list(alle.values()))
    g["minecraft:geometry"][0]["description"]["texture_height"] = 64
    tmp = WURZEL / "vorschau" / "_ruestung_ansicht.geo.json"
    tmp.write_text(json.dumps(g))
    bild.save(WURZEL / "vorschau" / "_ruestung_ansicht.png")
    modell_ansehen.zeichne(str(tmp), str(WURZEL / "vorschau" / "_ruestung_ansicht.png"),
                           str(WURZEL / "vorschau" / "ritterruestung.png"),
                           ansichten=[("vorn", 0, 0), ("Seite", 90, 0), ("hinten", 180, 0),
                                      ("schraeg", 30, 15)],
                           breite=300, hoehe=420)
    tmp.unlink(); (WURZEL / "vorschau" / "_ruestung_ansicht.png").unlink()


def main():
    eins, zwei = texturen()
    ziel = RES / "textures" / "models" / "armor"
    ziel.mkdir(parents=True, exist_ok=True)
    eins.save(ziel / "ritter_1.png")
    zwei.save(ziel / "ritter_2.png")
    print("gemalt: ritter_1.png, ritter_2.png")

    m = modelle()
    for name, liste in m.items():
        (RES / "models" / "entity" / f"{name}.geo.json").write_text(
            json.dumps(geo(name, liste), indent=2) + "\n")
    print("gebaut:", ", ".join(f"{n}.geo.json" for n in m))

    for name, karte in (("ritterhelm", vorlage.HELM), ("ritterbrustpanzer", vorlage.BRUSTPANZER),
                        ("ritterbeinschutz", vorlage.BEINSCHUTZ), ("ritterstiefel", vorlage.STIEFEL)):
        bild_aus(karte).save(RES / "textures" / "items" / f"{name}.png")
    print("Inventarbilder: 4")

    gesamtansicht(eins, zwei, m)


if __name__ == "__main__":
    main()
