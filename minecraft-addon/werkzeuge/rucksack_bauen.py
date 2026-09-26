#!/usr/bin/env python3
"""Der Rucksack - wie eine Shulkerkiste, aber man traegt ihn auf dem Ruecken.

Fynn: "Das Backpack funktioniert so aehnlich wie eine Shulkerbox, nur dass
du sie visuell auch siehst auf dem Ruecken, wenn du den Backpack im
Inventar haeltst. Den kannst du auch platzieren und dann reinschauen. ...
Sobald in einem Backpack etwas drin ist, kannst du nicht noch ein weiteres
Backpack mit dir fuehren. Du kannst aber in dem Backpack ein weiteres
Backpack verstauen, was leer ist. ... Und diese kann man am Elch
befestigen, so dass man zwei Backpacks mitnehmen kann."

Wie das zusammengeht:

* Der Rucksack ist ein Gegenstand (fynn:rucksack). Hat man ihn im
  Inventar, sitzt er sichtbar auf dem Ruecken - ein eigenes Modell an der
  Spielerdatei, das das Skript ueber zwei kurze Animationen an- und
  ausschaltet (animation.fynn.rucksack_an / _ab setzen v.fynn_rucksack).
  Beim Aufsetzen rutscht er von unten hoch und federt nach, die Schultern
  ziehen kurz mit; beim Gehen wippt er im Schritt.
* Tippt man mit ihm auf einen Block, steht er dort (ein Wesen,
  fynn:rucksack_abgestellt, mit 27 Plaetzen wie eine Shulkerkiste).
  Antippen oeffnet ihn, Schlagen hebt ihn wieder auf - mit allem darin.
* Wohin der Inhalt geht, solange man ihn traegt: in eine Struktur, die
  das Spiel in der Welt speichert (StructureManager). Der Gegenstand merkt
  sich ihren Namen. Beim Abstellen kommt der Rucksack genau so wieder
  heraus, wie er war - mit Verzauberungen, Namen, allem.
* Am gezaehmten Elch haengen bis zu zwei Rucksaecke (siehe tiere_bauen:
  "reiten", tiere_gestalt.reitzeug).

Das Skript dazu ist verhaltenspaket/scripts/rucksack.js. Dieses Werkzeug
baut die Modelle (Ruecken, abgestellt, in der Hand), Bilder, Gegenstand,
Wesen, Rezept, und liefert der Spielerdatei ihre Teile
(spieler_animation_bauen holt sie sich hier ab).

    python3 werkzeuge/rucksack_bauen.py [--bilder ORDNER]
"""

import json
import sys
from pathlib import Path

from PIL import Image

sys.path.insert(0, str(Path(__file__).resolve().parent))
import tierprodukte_bauen as tp                 # noqa: E402
from tiere_gestalt import ton                   # noqa: E402
from tiermodell import Modell, hexfarbe, streu  # noqa: E402

WURZEL = Path(__file__).resolve().parent.parent
RES = WURZEL / "ressourcenpaket"
VER = WURZEL / "verhaltenspaket"

# Dieselben Farben wie die Taschen am Elch (tiere_gestalt.REITZEUG).
FARBEN = {"sack": "#9a6438", "deckel": "#6e4424", "klappe": "#6e4424", "schnalle": "#d8b060",
          "fach": "#8a5630", "fachdeckel": "#6e4424", "gurt": "#3e2616", "rolle": "#8a2e2a",
          "rollriemen": "#3e2616", "griff": "#3e2616", "becher": "#9aa0a8", "riemen": "#3e2616"}


# ------------------------------------------------------------ Gestalt

def rucksack(b, o, r, vorsilbe="", becher=True):
    """Den Rucksack in einen Knochen bauen. o: Mitte der Rueckwand unten;
    r: +1, wenn die Aussenseite nach +z zeigt (auf dem Ruecken), -1 nach -z
    (abgestellt, mit der Tasche nach vorn). vorsilbe: vor jeden Stoffnamen,
    damit er sich am Elch nicht mit dessen Stoffen verwechselt.

    Zweite Fassung (Fynn: "an der Seite noch ein bisschen verbuggt ... mehr
    Detail"): Alles bleibt innerhalb von 3.5 Pixeln neben der Mitte - so
    schwingen die Arme des Spielers (ab 4 Pixeln) beim Gehen nicht mehr
    hindurch. Die Seitentaschen sind darum weg; dafuer: zwei Gurte mit
    Schnallen ueber dem Deckel, eine Aussentasche mit eigenem Deckel und
    Knopf, eine karierte Schlafrolle mit zwei Riemen, ein Tragegriff und
    ein Blechbecher, der unten am Karabiner baumelt."""
    ox, oy, oz = o

    def k(x, y, z, w, h, d, stoff):
        wz = oz + z if r > 0 else oz - z - d
        b.kasten([ox + x, oy + y, wz], [w, h, d], vorsilbe + stoff)

    k(-3.5, 0, 0, 7, 9, 4, "sack")
    k(-3.5, 8.5, -0.5, 7, 1, 5, "deckel")
    k(-3, 5.5, 4, 6, 4, 1, "klappe")             # der Deckel faellt vorn herab
    k(-2.5, 4.5, 5, 1, 5, 1, "gurt")             # zwei Gurte mit Schnallen
    k(1.5, 4.5, 5, 1, 5, 1, "gurt")
    k(-3, 1, 4, 6, 4, 1, "fach")                 # Aussentasche
    k(-2.5, 4, 5, 5, 1, 1, "fachdeckel")
    k(-0.5, 3, 5, 1, 1, 1, "schnalle")           # Knopf der Aussentasche
    k(-3.5, 9.5, 0.5, 7, 2, 3, "rolle")          # Schlafrolle obenauf
    k(-2.5, 9.3, 0.3, 1, 1, 1, "rollriemen")
    k(1.5, 9.3, 0.3, 1, 1, 1, "rollriemen")
    k(-1, 9.5, 3.5, 2, 1, 1, "griff")            # Tragegriff
    if becher:                                   # (abgestellt stuende er im Boden)
        k(-0.5, -1.5, 4.2, 1, 1, 1, "becher")    # Blechbecher am Karabiner


def maler(o, r, vorsilbe=""):
    """Malt in Koordinaten des Rucksacks (x quer, y hoch, z nach aussen).
    Wuerfelig statt strichig, wie Fynn es mag. Fuer fremde Stoffe: None."""
    ox, oy, oz = o

    def f(stoff, p, n, texel):
        if not stoff.startswith(vorsilbe) or stoff[len(vorsilbe):] not in FARBEN:
            return None
        stoff = stoff[len(vorsilbe):]
        x, y, z = p[0] - ox, p[1] - oy, (p[2] - oz) * r
        nz = n[2] * r
        grund = FARBEN[stoff]
        if stoff == "rolle":
            # Karierte Wolldecke: Wuerfel aus zwei Pixeln, rot und dunkelrot,
            # mit einem helleren Kreuzungspunkt.
            a, c = int((x + 8) // 2) % 2, int((z + y + 8) // 2) % 2
            farbe = "#b24a3a" if a and c else ("#8a2e2a" if a or c else "#6a2220")
            return ton(farbe, p, n, texel, 95, straehne=0.0)
        if stoff == "rollriemen" or stoff == "gurt":
            if stoff == "gurt" and abs(y - 6.0) < 0.6 and nz > 0.5:
                return ton(FARBEN["schnalle"], p, n, texel, 90, straehne=0.0)     # Schnalle am Gurt
            return ton(FARBEN["riemen"], p, n, texel, 91, straehne=0.0)
        if stoff == "sack":
            if y < 0.9:
                return ton("#5e3a20", p, n, texel, 99, straehne=0.0)             # verstaerkter Boden
            # Das Leder: kleine Wuerfel, jeder einen Hauch anders.
            flecken = (streu(x // 2, y // 2, z // 2, 101) - 0.5) * 0.06
            return ton(grund, p, n, texel, 101, straehne=0.0, hell=flecken + (0.05 if n[1] > 0.5 else 0.0))
        if stoff == "klappe":
            if nz > 0.5 and (abs(abs(x) - 2.5) < 0.6 and y < 6.1):
                return ton(FARBEN["schnalle"], p, n, texel, 102, straehne=0.0)   # Nieten an den Ecken
            if y < 6.1 and nz > 0.5:
                return ton("#5a361c", p, n, texel, 103, straehne=0.0)            # Kante unten
            return ton(grund, p, n, texel, 105, straehne=0.0)
        if stoff == "fach":
            flecken = (streu(x // 2, y // 2, 107) - 0.5) * 0.06
            return ton(grund, p, n, texel, 109, straehne=0.0, hell=flecken)
        if stoff in ("deckel", "fachdeckel"):
            return ton(grund, p, n, texel, 111, straehne=0.0, hell=0.06 if n[1] > 0.5 else 0.0)
        if stoff == "schnalle":
            return ton(grund, p, n, texel, 113, straehne=0.0, hell=0.1 if nz > 0.5 else 0.0)
        if stoff == "becher":
            return ton(grund, p, n, texel, 114, straehne=0.0, hell=0.12 if n[1] > 0.5 else 0.0)
        if stoff == "riemen":
            if abs(p[1] - 19.5) < 0.5 and abs(p[0]) < 0.6:
                return ton(FARBEN["schnalle"], p, n, texel, 115, straehne=0.0)   # Brustschnalle
            return ton(grund, p, n, texel, 117, straehne=0.0)
        return ton(grund, p, n, texel, 119, straehne=0.0)
    return f


RUECKEN = (0, 12, 3.5)     # auf dem Ruecken, hinter jeder Brustplatte (die reicht bis 3)
STEHT = (0, 0, 2)          # abgestellt: auf dem Boden, mittig
HAND = (0, -3.5, -2)       # in der Hand: haengt unter der Faust


def ruecken_modell():
    m = Modell("rucksack_ruecken", sichtbreite=2, sichthoehe=3)
    m.knoch("body", [0, 24, 0])
    rucksack(m.knoch("fynn_rucksack", [0, 12, 3.5], "body"), RUECKEN, 1)
    riemen = m.knoch("fynn_riemen", [0, 24, 0], "body")
    for x in (-3, 2):
        riemen.kasten([x, 24, -2.5], [1, 1, 6], "riemen")          # ueber die Schulter
        riemen.kasten([x, 15, -2.6], [1, 9, 1], "riemen")          # vorn herab
    riemen.kasten([-2, 19, -2.8], [4, 1, 1], "riemen")             # Brustgurt mit Schnalle
    return m


def steht_modell():
    m = Modell("rucksack_abgestellt", sichtbreite=1, sichthoehe=1)
    rucksack(m.knoch("rucksack", [0, 0, 0]), STEHT, -1, becher=False)
    return m


def hand_modell():
    m = Modell("rucksack_hand", sichtbreite=2, sichthoehe=2)
    m.knoch("rightitem", [0, 8, 0])
    m.knoch("halten", [0, 8, 0], "rightitem")
    rucksack(m.knoch("rucksack", [0, 8, 0], "halten"), HAND, 1)
    return m


def geometrie(modell, bindung=False):
    geo = modell.geometrie()
    if bindung:
        for b in geo["minecraft:geometry"][0]["bones"]:
            if b["name"] == "rightitem":
                b["binding"] = "q.item_slot_to_bone_name(c.item_slot)"
    return geo


# ------------------------------------------------------------ Bewegung

# Wie weit das Aufsetzen ist: 0 beim Aufsetzen, 1 nach 0.45 Sekunden.
AUF = "math.clamp((query.life_time - variable.fynn_rucksack_seit) / 0.45, 0.0, 1.0)"
G = "variable.fynn_gang"
T = "variable.fynn_tempo"

SITZ = {"loop": True, "bones": {
    # Von unten hochrutschen, oben leicht ueberschiessen und einfedern;
    # im Gehen wippt er einen halben Schritt hinter dem Koerper her.
    "fynn_rucksack": {
        "position": [0.0, f"-7.0 * math.pow(1.0 - {AUF}, 2.0) + math.sin({AUF} * 180.0) * 1.2 "
                          f"- math.cos({G} * 2.0 - 60.0) * 0.35 * {T}", 0.0],
        "rotation": [f"-math.sin({AUF} * 180.0) * 12.0 + math.sin({G} * 2.0 - 60.0) * 3.0 * {T} "
                     f"- (query.is_sprinting ? 6.0 : 0.0)", 0.0, f"math.sin({G}) * 2.0 * {T}"],
    },
    "fynn_riemen": {"scale": f"{AUF} > 0.3 ? 1.0 : 0.0"},
    # Die Schultern ziehen beim Aufsetzen kurz nach hinten.
    "rightArm": {"rotation": [f"math.sin({AUF} * 180.0) * 22.0", 0.0, f"math.sin({AUF} * 180.0) * 8.0"]},
    "leftArm": {"rotation": [f"math.sin({AUF} * 180.0) * 22.0", 0.0, f"-math.sin({AUF} * 180.0) * 8.0"]},
}}

# Die beiden Schalter, die das Skript abspielt. Die Zeitleiste setzt die
# Werte beim Spieler; "seit" nur, wenn er vorher keinen trug - so startet
# das Aufsetzen nicht jedes Mal neu, wenn das Skript den Stand wiederholt.
SCHALTER = {
    "animation.fynn.rucksack_an": {"animation_length": 0.05, "timeline": {"0.0": [
        "variable.fynn_rucksack_seit = variable.fynn_rucksack < 0.5 ? query.life_time : variable.fynn_rucksack_seit;",
        "variable.fynn_rucksack = 1.0;"]}},
    "animation.fynn.rucksack_ab": {"animation_length": 0.05, "timeline": {"0.0": [
        "variable.fynn_rucksack = 0.0;"]}},
}

# Was die Spielerdatei braucht (spieler_animation_bauen baut es ein).
SPIELER_START = ["variable.fynn_rucksack = 0.0;", "variable.fynn_rucksack_seit = -10.0;"]
SPIELER_TEILE = [("fynn_rucksack_sitz", "animation.fynn.rucksack_sitz", SITZ,
                  "variable.fynn_rucksack > 0.5 && !variable.is_first_person")]
STEUERUNG = "controller.render.fynn_rucksack"


def spieler_einbauen(d):
    """Modell, Bild und Darstellung an die Spielerdatei haengen."""
    d["geometry"]["fynn_rucksack"] = "geometry.fynn.rucksack_ruecken"
    d["textures"]["fynn_rucksack"] = "textures/entity/rucksack/ruecken"
    d["render_controllers"] = [r for r in d["render_controllers"]
                               if not (isinstance(r, dict) and STEUERUNG in r)]
    d["render_controllers"].append(
        {STEUERUNG: "variable.fynn_rucksack > 0.5 && !variable.is_first_person && !variable.map_face_icon"})


# ------------------------------------------------------------ Gegenstand, Wesen

SYMBOL = [
    "................",
    "....rRrRrRrR....",
    "...grRrRrRrRg...",
    "....rRrRrRrR....",
    "....kkkkkkkk....",
    "....kkkkkkkk....",
    "....#nkkkkn#....",
    "....#nkkkkn#....",
    "....#bkkkkb#....",
    "....#n####n#....",
    "....#pppppp#....",
    "....#ppbbpp#....",
    "....#pppppp#....",
    "....########....",
    "....dddddddd....",
    ".......c........",
]
SYMBOLFARBEN = {"#": FARBEN["sack"], "k": FARBEN["deckel"], "b": FARBEN["schnalle"], "p": FARBEN["fach"],
                "n": FARBEN["gurt"], "r": "#8a2e2a", "R": "#b24a3a", "g": FARBEN["rollriemen"], "d": "#5e3a20",
                "c": FARBEN["becher"]}


def gegenstand():
    return tp.gegenstand("rucksack", {"minecraft:max_stack_size": 1}, "equipment",
                         "minecraft:itemGroup.name.chest")


def rezept():
    return tp.geformt("rucksack", ["SLS", "LCL", "LFL"],
                      {"S": "minecraft:string", "L": "minecraft:leather", "C": "minecraft:chest",
                       "F": "fynn:baerenfell"}, "fynn:rucksack")


def wesen():
    """Der abgestellte Rucksack: steht still, nimmt keinen Schaden, hat 27
    Plaetze. Oeffnen durch Antippen macht das Spiel selbst (wie bei der
    Kistenlore); Schlagen hebt ihn auf (rucksack.js)."""
    return {"format_version": "1.26.30", "minecraft:entity": {
        "description": {"identifier": "fynn:rucksack_abgestellt", "is_spawnable": False, "is_summonable": True},
        "components": {
            "minecraft:type_family": {"family": ["rucksack", "inanimate"]},
            "minecraft:health": {"value": 20, "max": 20},
            "minecraft:damage_sensor": {"triggers": [{"cause": "all", "deals_damage": "no"}]},
            "minecraft:collision_box": {"width": 0.6, "height": 0.75},
            "minecraft:physics": {"has_gravity": False},
            "minecraft:pushable": {"is_pushable": False, "is_pushable_by_piston": False},
            "minecraft:knockback_resistance": {"value": 1.0},
            "minecraft:fire_immune": {},
            "minecraft:inventory": {"container_type": "minecart_chest", "inventory_size": 27},
        }}}


def aussehen():
    return {"format_version": "1.10.0", "minecraft:client_entity": {"description": {
        "identifier": "fynn:rucksack_abgestellt",
        "materials": {"default": "entity_alphatest"},
        "textures": {"default": "textures/entity/rucksack/abgestellt"},
        "geometry": {"default": "geometry.fynn.rucksack_abgestellt"},
        "render_controllers": ["controller.render.default"],
    }}}


HALTEN = {"loop": True, "bones": {"halten": {
    # Dritte Person: haengt am Griff unter der Faust. Ich-Sicht: rechts
    # unten im Bild, leicht gedreht, damit man die Tasche vorn sieht.
    "position": ["c.is_first_person ? -3.5 : 0.0", "c.is_first_person ? -3.5 : -3.0", 0.0],
    "rotation": [0.0, "c.is_first_person ? 180.0 : 90.0", "c.is_first_person ? -135.0 : 0.0"],
    "scale": "c.is_first_person ? 0.55 : 0.6",
}}}


def attachable():
    return {"format_version": "1.10.0", "minecraft:attachable": {"description": {
        "identifier": "fynn:rucksack",
        "materials": {"default": "entity_alphatest", "enchanted": "entity_alphatest_glint"},
        "textures": {"default": "textures/entity/rucksack/hand", "enchanted": "textures/misc/enchanted_item_glint"},
        "geometry": {"default": "geometry.fynn.rucksack_hand"},
        "animations": {"halten": "animation.fynn.rucksack_halten"},
        "scripts": {"animate": ["halten"]},
        "render_controllers": ["controller.render.item_default"],
    }}}


def steuerung():
    return {"format_version": "1.8.0", "render_controllers": {STEUERUNG: {
        "geometry": "Geometry.fynn_rucksack",
        "materials": [{"*": "Material.default"}],
        "textures": ["Texture.fynn_rucksack"],
    }}}


NAMEN = [("item", "rucksack", ("Rucksack", "Backpack")),
         ("entity", "rucksack_abgestellt", ("Rucksack", "Backpack"))]


def sprache():
    for datei, i in (("de_DE.lang", 0), ("en_US.lang", 1)):
        pfad = RES / "texts" / datei
        schluessel = {"item.fynn:rucksack", "item.fynn:rucksack.name", "entity.fynn:rucksack_abgestellt.name",
                      "item.spawn_egg.entity.fynn:rucksack_abgestellt.name"}
        zeilen = [z for z in pfad.read_text(encoding="utf-8").splitlines()
                  if z.split("=")[0] not in schluessel and z != "## Rucksack"]
        while zeilen and not zeilen[-1].strip():
            zeilen.pop()
        n = NAMEN[0][2][i]
        zeilen += ["", "## Rucksack", f"item.fynn:rucksack={n}", f"item.fynn:rucksack.name={n}",
                   f"entity.fynn:rucksack_abgestellt.name={n}"]
        pfad.write_text("\n".join(zeilen) + "\n", encoding="utf-8")


def main():
    ordner = RES / "textures" / "entity" / "rucksack"
    ordner.mkdir(parents=True, exist_ok=True)
    teile = [(ruecken_modell(), RUECKEN, 1, "ruecken", False),
             (steht_modell(), STEHT, -1, "abgestellt", False),
             (hand_modell(), HAND, 1, "hand", True)]
    bilder = {}
    for modell, o, r, name, bindung in teile:
        tp.schreibe(RES / "models" / "entity" / f"{modell.name}.geo.json", geometrie(modell, bindung))
        bild = modell.male(maler(o, r))
        bild.save(ordner / f"{name}.png")
        bilder[name] = (modell, bild)
    tp.schreibe(RES / "animations" / "rucksack.animation.json", {"format_version": "1.10.0", "animations": {
        **SCHALTER, "animation.fynn.rucksack_halten": HALTEN}})
    tp.schreibe(RES / "render_controllers" / "rucksack.render_controllers.json", steuerung())
    tp.schreibe(RES / "entity" / "rucksack_abgestellt.entity.json", aussehen())
    tp.schreibe(RES / "attachables" / "rucksack.json", attachable())
    tp.schreibe(VER / "entities" / "rucksack_abgestellt.json", wesen())
    tp.schreibe(VER / "items" / "rucksack.json", gegenstand())
    tp.schreibe(VER / "recipes" / "rucksack.json", rezept())
    from vorlagen.tierformen import FORMEN
    FORMEN["rucksack"] = SYMBOL
    symbol = tp.male("rucksack", SYMBOLFARBEN)
    symbol.save(RES / "textures" / "items" / "rucksack.png")
    liste_pfad = RES / "textures" / "item_texture.json"
    liste = json.loads(liste_pfad.read_text(encoding="utf-8"))
    liste["texture_data"]["rucksack"] = {"textures": "textures/items/rucksack"}
    tp.schreibe(liste_pfad, liste)
    sprache()
    print("gebaut: Rucksack (Ruecken, abgestellt, Hand), Gegenstand, Wesen, Rezept")
    if "--bilder" in sys.argv:
        ansehen(bilder, symbol, Path(sys.argv[sys.argv.index("--bilder") + 1]))


def ansehen(bilder, symbol, ordner):
    """Am Spieler von hinten und schraeg, abgestellt, in der Hand, Symbol."""
    import spieler_ansehen as s
    import tiermodell as tm
    ordner.mkdir(parents=True, exist_ok=True)
    # Fuer die Vorschau haengt der Rucksack wie ein Ruestungsteil am
    # Spieler - dieselben Knochennamen, dieselbe Rechnung.
    tmp = ordner / "_rucksack_vorschau.json"
    tmp.write_text(json.dumps({"format_version": "1.10.0", "minecraft:attachable": {"description": {
        "identifier": "fynn:rucksack_vorschau", "materials": {"default": "entity_alphatest"},
        "textures": {"default": "textures/entity/rucksack/ruecken"},
        "geometry": {"default": "geometry.fynn.rucksack_ruecken"}}}}), encoding="utf-8")
    sp = s.Spieler()
    zellen = []
    for gier in (200, 150, 30):
        b, _ = s.bild(sp, {"v.fynn_tempo": 0.0}, None, gier=gier, zoom=8.0, breite=260, hoehe=320, ruestung=[tmp])
        zellen.append(b)
    tmp.unlink()
    modell, bild = bilder["abgestellt"]
    zellen.append(tm.ansehen(modell.geometrie(), bild, gier=35, neigung=25, breite=260, hoehe=320))
    gross = symbol.resize((128, 128), Image.NEAREST)
    feld = Image.new("RGBA", (260, 320), (236, 238, 242, 255))
    feld.alpha_composite(gross, (66, 96))
    zellen.append(feld)
    gesamt = Image.new("RGBA", (260 * len(zellen), 320), (236, 238, 242, 255))
    for i, z in enumerate(zellen):
        gesamt.paste(z, (i * 260, 0))
    gesamt.save(ordner / "rucksack.png")
    print("gezeichnet:", ordner / "rucksack.png")


if __name__ == "__main__":
    main()
