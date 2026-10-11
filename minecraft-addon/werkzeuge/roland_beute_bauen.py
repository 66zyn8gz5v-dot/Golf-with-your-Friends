#!/usr/bin/env python3
"""Rolands Beute und wie man ihn ruft: Durendal, Olifant, Fehdehandschuh.

Fynn: "Der braucht auf jeden Fall auch ein paar Special Drops. Ja, auch ein
neues Item vielleicht. Muss nicht unbedingt eine Waffe sein ... kann aber
eine Waffe sein. Irgendwas Cooles."

* Durendal - Rolands Schwert aus dem Rolandslied, das nicht zerbrechen
  wollte, als Roland es gegen den Fels schlug. Deshalb auch hier:
  unzerbrechlich (keine Haltbarkeit). Staerker als Netherit. Rechtsklick
  schickt eine Saphirwelle ueber den Boden, alle acht Sekunden.
* Olifant - Rolands Horn. Kein Kampfgegenstand: Wer es blaest, gibt allen
  Spielern in der Naehe Widerstand, Staerke und Regeneration, und Monster
  ganz in der Naehe werden zurueckgeworfen. Laenger Ruhe als das Jagdhorn,
  dafuer staerker.
* Fehdehandschuh - wer ihn auf den Boden wirft, fordert Roland heraus. So
  kommt man im Ueberlebensmodus an den Boss: gebaut aus Stahl, Gold und
  Lapis.

    python3 werkzeuge/roland_beute_bauen.py [--bilder vorschau]
"""

import json
import math
import sys
import tempfile
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

UMRISS = (28, 30, 46)


def schreibe(pfad, daten):
    pfad = Path(pfad)
    pfad.parent.mkdir(parents=True, exist_ok=True)
    pfad.write_text(json.dumps(daten, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")


def umrande(karte):
    """Ein dunkler Umriss um alles, was gemalt ist - wie bei Minecrafts
    eigenen Gegenstaenden (fuer 3D-Modelle gilt Fynns Regel: kein Umriss;
    fuer Inventarbilder gehoert er dazu)."""
    h, w = len(karte), len(karte[0])
    k = [list(z) for z in karte]
    for y in range(h):
        for x in range(w):
            if karte[y][x] != ".":
                continue
            for dx, dy in ((1, 0), (-1, 0), (0, 1), (0, -1)):
                nx, ny = x + dx, y + dy
                if 0 <= nx < w and 0 <= ny < h and karte[ny][nx] not in ".k":
                    k[y][x] = "k"
                    break
    return ["".join(z) for z in k]


def male(karte, farben):
    b = Image.new("RGBA", (len(karte[0]), len(karte)), (0, 0, 0, 0))
    for y, zeile in enumerate(karte):
        for x, z in enumerate(zeile):
            if z != ".":
                b.putpixel((x, y), tuple(farben[z]) + (255,))
    return b


# ============================================================ Durendal

def durendal_bild():
    """16 mal 16, schraeg wie Minecrafts Schwerter: Spitze oben rechts. Eine
    helle und eine dunkle Kante, dazwischen die blaue Runenrinne; die
    goldene Parierstange quer mit hochgebogenen Enden, der Saphir im Kreuz,
    blauer Griff, goldener Knauf."""
    punkte = {(15, 0): "w", (14, 1): "w"}
    for i in range(9):
        x, y = 13 - i, 2 + i
        punkte[(x, y)] = "R" if i % 3 == 1 else "r"
        punkte.setdefault((x + 1, y - 1), "w")
        punkte.setdefault((x, y - 1), "s")
        punkte.setdefault((x + 1, y), "d")
    # Parierstange quer zur Klinge, Enden zur Spitze hin gebogen.
    for (x, y), z in (((2, 8), "G"), ((3, 8), "g"), ((3, 9), "g"), ((4, 10), "g"), ((5, 11), "E"),
                      ((6, 12), "g"), ((7, 13), "g"), ((8, 13), "g"), ((8, 14), "G"), ((4, 11), "e")):
        punkte[(x, y)] = z
    for (x, y), z in (((3, 12), "L"), ((2, 13), "l"), ((1, 14), "g"), ((0, 15), "G"), ((1, 15), "G")):
        punkte[(x, y)] = z
    karte = [["."] * 16 for _ in range(16)]
    for (x, y), z in punkte.items():
        if 0 <= x < 16 and 0 <= y < 16:
            karte[y][x] = z
    return umrande(["".join(z) for z in karte])


def durendal():
    import roland_bauen as rb
    import waffe_bauen as w
    from neue_waffen_bauen import halten, waffen_attachable, gegenstand
    v = rb.DURENDAL
    w.aus_zeichenkarte("durendal", v["karte"], {k: f + (255,) for k, f in v["farben"].items()},
                       dicke=lambda zeile, spalte, zeichen: v["tiefe"][zeichen], mitte=v["mitte"],
                       ziel_modell=str(RES / "models" / "entity" / "durendal.geo.json"),
                       ziel_textur=str(RES / "textures" / "entity" / "durendal_haut.png"))
    schreibe(RES / "attachables" / "durendal.json", waffen_attachable("durendal"))
    schreibe(RES / "animations" / "durendal.animation.json", {"format_version": "1.10.0", "animations": {
        "animation.durendal.halten": halten(v["karte"], v["griff"])}})
    icon = male(durendal_bild(), dict(v["farben"], k=UMRISS))
    # Netherit macht 8. Durendal 9, ohne Haltbarkeit: Es zerbricht nicht.
    schreibe(VER / "items" / "durendal.json", gegenstand("durendal", {
        "minecraft:hand_equipped": True, "minecraft:damage": 9,
        "minecraft:rarity": "epic",
        "minecraft:glint": True,
        "minecraft:enchantable": {"value": 22, "slot": "sword"},
        "minecraft:use_modifiers": {"use_duration": 0.1},
        "minecraft:cooldown": {"category": "fynn:durendal", "duration": 8.0},
    }))
    return icon


# ============================================================ Olifant

def olifant_bild():
    """Ein Horn aus Elfenbein, geschwungen von der Spitze oben rechts zum
    Schalltrichter unten links. Gerechnet statt gezeichnet: entlang einer
    Kurve wird es dicker, die Seite zum Licht ist heller. Goldene Ringe am
    Mundstueck, in der Mitte (mit Saphir) und am Trichter."""
    p0, p1, p2 = (14.0, 1.6), (2.5, 1.5), (4.8, 13.2)

    def punkt(t):
        a, b, c = (1 - t) ** 2, 2 * (1 - t) * t, t * t
        return (a * p0[0] + b * p1[0] + c * p2[0], a * p0[1] + b * p1[1] + c * p2[1])

    kurve = [(i / 200, punkt(i / 200)) for i in range(201)]
    karte = [["."] * 16 for _ in range(16)]
    for y in range(16):
        for x in range(16):
            bester = None
            for t, (cx, cy) in kurve:
                d = math.hypot(x + 0.5 - cx, y + 0.5 - cy)
                r = 0.6 + 2.4 * t ** 1.5
                if d <= r and (bester is None or d / r < bester[1]):
                    # Seite: links oben hell, rechts unten dunkel.
                    seite = ((x + 0.5 - cx) + (y + 0.5 - cy)) / max(r, 0.01)
                    bester = (t, d / r, seite)
            if bester is None:
                continue
            t, _, seite = bester
            if abs(t - 0.08) < 0.045 or t > 0.9:
                z = "g" if seite < 0.2 else "G"
            elif abs(t - 0.52) < 0.04:
                z = "e" if abs(seite) < 0.35 else ("g" if seite < 0 else "G")
            else:
                z = "w" if seite < -0.45 else ("i" if seite < 0.35 else "d")
            karte[y][x] = z
    return umrande(["".join(z) for z in karte])


OLIFANT_FARBEN = {"w": (250, 244, 226), "i": (228, 214, 180), "d": (184, 162, 122), "o": (92, 70, 44),
                  "g": (240, 200, 90), "G": (176, 128, 36), "e": (110, 170, 255), "k": UMRISS}


def olifant():
    from neue_waffen_bauen import gegenstand
    schreibe(VER / "items" / "olifant.json", gegenstand("olifant", {
        "minecraft:rarity": "epic",
        "minecraft:use_modifiers": {"use_duration": 0.1},
        "minecraft:cooldown": {"category": "fynn:olifant", "duration": 180.0},
    }, gruppe="fynn:itemGroup.name.jagd"))
    return male(olifant_bild(), OLIFANT_FARBEN)


# ============================================================ Fehdehandschuh

# Ein Panzerhandschuh, Finger nach oben: Stahlplatten, goldene Knoechel,
# eine blaue Stulpe mit Goldrand und dem Saphir des Ordens.
HANDSCHUH = [
    "................",
    "....kkk.kk......",
    "...kSsSkSsk.....",
    "...kSdSkSdkkk...",
    "...kSdSdSdSsk...",
    "...kSdSdSdSdk.kk",
    "...kSdSdSdSdkkSk",
    "...kgGgGgGgGkSdk",
    "...kSSSSSSSSdSdk",
    "...kSsssssssddk.",
    "...kSsssesssdk..",
    "..kkSssssssddk..",
    ".kgggggggggggggk",
    ".kbBbbBbbBbbBbbk",
    ".kbbBbbBbbBbbBbk",
    "..kkkkkkkkkkkkk.",
]
HANDSCHUH_FARBEN = {"S": (228, 234, 242), "s": (180, 190, 204), "d": (118, 128, 146),
                    "g": (240, 200, 90), "G": (176, 128, 36), "b": (54, 86, 186), "B": (36, 58, 140),
                    "e": (130, 190, 255), "k": UMRISS}


def fehdehandschuh():
    from neue_waffen_bauen import gegenstand, rezept
    assert all(len(z) == 16 for z in HANDSCHUH) and len(HANDSCHUH) == 16
    schreibe(VER / "items" / "fehdehandschuh.json", gegenstand("fehdehandschuh", {
        "minecraft:rarity": "rare",
        "minecraft:use_modifiers": {"use_duration": 0.1},
    }, gruppe="fynn:itemGroup.name.jagd", stapel=16))
    # Fuenf Stahlbarren, ein Goldbarren, ein Lapis: Stahl kommt aus dem
    # Schmelzofen, das Gold vom Ritterhauptmann oder aus der Mine.
    schreibe(VER / "recipes" / "fehdehandschuh.json", rezept(
        "fehdehandschuh", ["s s", "sgs", " l "],
        {"s": "fynn:stahlbarren", "g": "minecraft:gold_ingot", "l": "minecraft:lapis_lazuli"}))
    return male(HANDSCHUH, HANDSCHUH_FARBEN)


# ============================================================ Rest

NAMEN = [
    ("item.fynn:durendal", "Durendal", "Durendal"),
    ("item.fynn:durendal.name", "Durendal", "Durendal"),
    ("item.fynn:olifant", "Olifant", "Oliphant"),
    ("item.fynn:olifant.name", "Olifant", "Oliphant"),
    ("item.fynn:fehdehandschuh", "Fehdehandschuh", "Gauntlet of Challenge"),
    ("item.fynn:fehdehandschuh.name", "Fehdehandschuh", "Gauntlet of Challenge"),
    # Kurz, wie in Fynns Entwurf der Bossleiste. Den vollen Namen zeigt der
    # Titel beim Auftritt.
    ("entity.fynn:roland.name", "Sir Roland", "Sir Roland"),
    ("item.spawn_egg.entity.fynn:roland.name", "Sir Roland von Ronceval", "Sir Roland of Roncevaux"),
]


def sprache():
    for datei, i in (("de_DE.lang", 1), ("en_US.lang", 2)):
        pfad = RES / "texts" / datei
        zeilen = [z for z in pfad.read_text(encoding="utf-8").splitlines()
                  if z.split("=")[0] not in {n[0] for n in NAMEN} and z != "## Sir Roland"]
        while zeilen and not zeilen[-1].strip():
            zeilen.pop()
        zeilen += ["", "## Sir Roland"] + [f"{n[0]}={n[i]}" for n in NAMEN]
        pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def in_liste_eintragen():
    """Durendal schwingt wie die anderen Klingen."""
    for pfad in (Path(__file__).resolve().parent / "kampf_animationen.py", VER / "scripts" / "kampf.js"):
        text = pfad.read_text(encoding="utf-8")
        if '"fynn:durendal"' not in text:
            text = text.replace('"fynn:saphirschwert",', '"fynn:saphirschwert", "fynn:durendal",', 1)
            pfad.write_text(text, encoding="utf-8")


def main():
    bilder = {"durendal": durendal(), "olifant": olifant(), "fehdehandschuh": fehdehandschuh()}
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    for name, bild in bilder.items():
        bild.save(RES / "textures" / "items" / f"{name}.png")
        liste["texture_data"][name] = {"textures": f"textures/items/{name}"}
    schreibe(liste_pfad, liste)
    sprache()
    in_liste_eintragen()
    print("gebaut: Durendal, Olifant, Fehdehandschuh")
    if "--bilder" in sys.argv:
        ordner = Path(sys.argv[sys.argv.index("--bilder") + 1])
        gesamt = Image.new("RGBA", (3 * 176, 176), (198, 198, 198, 255))
        for i, bild in enumerate(bilder.values()):
            gesamt.alpha_composite(bild.resize((160, 160), Image.NEAREST), (i * 176 + 8, 8))
        gesamt.save(ordner / "roland_beute.png")
        print("gezeichnet:", ordner / "roland_beute.png")


if __name__ == "__main__":
    main()
