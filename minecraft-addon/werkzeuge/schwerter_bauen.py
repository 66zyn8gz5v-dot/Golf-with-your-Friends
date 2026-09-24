#!/usr/bin/env python3
"""Baut Fynns fuenf weitere Klingen - Holz, Kupfer, Gold, Diamant, Netherit.

Dasselbe Verfahren wie beim Stahlschwert, nur fuer alle auf einmal: Die
Zeichnung wird zeilenweise zu Kaesten, und die Tiefe richtet sich danach,
welcher Teil des Schwerts gerade dran ist. Mit einer Dicke fuer alles wird
entweder die Klinge zum Brett oder die Parierstange zum Blech.

Wo die Parierstange sitzt, wird nicht abgezaehlt, sondern gemessen: Sie
ist die breiteste Stelle der Zeichnung. So bleibt die Aufteilung richtig,
auch wenn eine Zeichnung noch einmal ueberarbeitet wird.

    python3 werkzeuge/schwerter_bauen.py
"""

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

import waffe_bauen as w

# Dieselben Tiefen wie beim Stahlschwert, damit die Reihe zusammenpasst.
DICKE_KLINGE = 1.25
DICKE_PARIER = 2.0
DICKE_GRIFF = 1.5

# Das zweite Verfahren: Die Tiefe haengt nicht nur davon ab, in welchem
# Teil der Waffe ein Pixel liegt, sondern auch davon, wie hell er gemalt
# ist. Wer eine Parierstange zeichnet, setzt die Lichtkante dorthin, wo
# das Metall vorsteht - die Helligkeit sagt also schon, was vorn ist.
#
# Fuer die Elektrumklinge gebraucht: Ihr Dreieck hat helle Linien auf
# dunklem Grund, und flach gebaut verschwindet dieser Unterschied. Die
# dunklen Stellen darin gehoeren ohnehin eher zur Klinge als zum Beschlag.
RELIEF_KLINGE = 1.0     # duenner als die alte Klinge
RELIEF_GRIFF = 1.25     # etwas schlanker als der alte Griff
RELIEF_PARIER_DUNKEL = 1.5   # noch fast Klinge
RELIEF_PARIER_HELL = 2.5     # die Lichtkanten des Dreiecks stehen vor
RELIEF_GRIFF_HELL = 2.0      # damit auch der Knauf hervortritt

# Ab hier gilt ein Ton als hell. Die elf Elektrumtoene teilen sich an
# dieser Grenze genau so auf, wie man sie im Bild sieht: die sieben
# Schattentoene unten, die vier Lichttoene oben.
HELLGRENZE = 380


def ist_hell(zeichen, farben):
    f = farben.get(zeichen)
    return bool(f) and sum(f[:3]) > HELLGRENZE

# Vorlage, das Vanilla-Schwert, das sie ersetzt, und der Name der Textur.
#
# Der Texturname steht daneben, weil er nicht immer dem Modell gleicht:
# Minecraft wirft alle Bilder in einen Topf, egal aus welchem Ordner sie
# kommen. Wo es neben dem Modell auch ein Inventarbild gibt, braucht die
# Modelltextur deshalb einen eigenen Namen - sonst behaelt das Spiel nur
# eines der beiden. Die fuenf Vanilla-Ersetzungen haben kein eigenes
# Inventarbild und kommen ohne Zusatz aus.
KLINGEN = [
    ("holzklinge",     "minecraft:wooden_sword",     "holzklinge"),
    ("kupferklinge",   "minecraft:copper_sword",     "kupferklinge"),
    ("goldklinge",     "minecraft:golden_sword",     "goldklinge"),
    ("diamantklinge",  "minecraft:diamond_sword",    "diamantklinge"),
    ("netheritklinge", "minecraft:netherite_sword",  "netheritklinge"),
    # Silber hat kein Gegenstueck in Minecraft - die Klinge ist ein eigener
    # Gegenstand und hat darum auch ein eigenes Inventarbild.
    ("silberklinge",   None,                         "silberklinge_haut"),
    ("elektrumklinge", None,                         "elektrumklinge_haut"),
]

# Wer die Tiefe nach der Helligkeit bekommt statt nach drei festen Stufen.
# Die uebrigen bleiben ausdruecklich beim alten Verfahren: Ihre Modelle
# liegen im Spiel, und ein Verfahren zu wechseln heisst, sie alle zu
# aendern - das gehoert nicht in einen Auftrag, der von einem handelt.
MIT_RELIEF = {"elektrumklinge"}

# Wem die gemalte Aussenkontur abgenommen wird, bevor das Modell entsteht.
# Sie stammt aus einer Zeichnung, die fuer sich stehen sollte; am Modell
# macht die Geometrie ihre Kanten selbst.
OHNE_KONTUR = {"elektrumklinge"}


def spannweite(text):
    """Wie breit eine Zeile ist, von der ersten bis zur letzten Farbe."""
    gemalt = [i for i, z in enumerate(text) if z != "."]
    return gemalt[-1] - gemalt[0] + 1 if gemalt else 0


def parierstange(karte):
    """Die Zeilen der Parierstange: der breite Block um die breiteste Zeile.

    Massstab ist die Klinge, nicht die Parierstange. Die Klinge ist die
    haeufigste Zeilenbreite - sie hat mit Abstand die meisten Zeilen - und
    zur Parierstange gehoert, was von der breitesten Stelle aus zusammen-
    haengend breiter ist als sie.

    Vorher war der Massstab "mindestens halb so breit wie die breiteste
    Zeile". Das ging, solange die Klinge schmal war: sechs Pixel gegen eine
    Parierstange von zwanzig. Bei der Elektrumklinge steht eine Klinge von
    dreizehn gegen eine Parierstange von dreiundzwanzig - die Klinge ist
    selbst breiter als die halbe Parierstange, und die Erkennung lief durch
    das ganze Schwert. Die Folge waere eine Klinge von Parierstangendicke
    gewesen, also ein Brett.

    "Zusammenhaengend" zaehlt mit, weil manche Klingen sich kurz vor der
    Spitze noch einmal verbreitern. Ein blosses "breiter als die Klinge"
    haette diese Stelle zu einer zweiten Parierstange gemacht.

    Warum nicht einfach "breiter als die Klinge", sondern ein Fuenftel des
    Ueberstands darueber: Bei der Goldklinge laeuft der Griff schraeg aus
    dem Bild, seine Zeilen sind dadurch breiter als die Klinge, und die
    Erkennung lief den halben Griff hinunter. Ein Fuenftel reicht, um den
    schraegen Griff auszuschliessen, und laesst die auslaufenden Enden
    einer V-foermigen Parierstange noch drin.
    """
    weiten = [spannweite(z) for z in karte]
    klinge = max(set(weiten), key=weiten.count)
    schwelle = klinge + (max(weiten) - klinge) / 5
    breiteste = weiten.index(max(weiten))
    oben = breiteste
    while oben > 0 and weiten[oben - 1] >= schwelle:
        oben -= 1
    unten = breiteste
    while unten < len(weiten) - 1 and weiten[unten + 1] >= schwelle:
        unten += 1
    return oben, unten


def dickenliste(karte):
    """Eine Tiefe je Bildzeile, von oben nach unten."""
    oben, unten = parierstange(karte)
    liste = []
    for zeile in range(len(karte)):
        if zeile < oben:
            liste.append(DICKE_KLINGE)
        elif zeile <= unten:
            liste.append(DICKE_PARIER)
        else:
            liste.append(DICKE_GRIFF)
    return liste, oben, unten


def reliefdicke(karte, farben):
    """Eine Tiefe je Pixel: aus dem Bauteil und aus der Helligkeit."""
    oben, unten = parierstange(karte)

    def tief(zeile, zeichen):
        if zeile < oben:
            return RELIEF_KLINGE
        hell = ist_hell(zeichen, farben)
        if zeile <= unten:
            return RELIEF_PARIER_HELL if hell else RELIEF_PARIER_DUNKEL
        return RELIEF_GRIFF_HELL if hell else RELIEF_GRIFF

    return tief, oben, unten


def main():
    wurzel = Path(__file__).resolve().parent.parent / "ressourcenpaket"
    import importlib
    for name, _ersetzt, texturname in KLINGEN:
        v = importlib.import_module("vorlagen." + name)
        karte = v.KARTE
        if name in OHNE_KONTUR:
            karte, gefallen = w.aussenlinie_weg(karte)
            print(f"  {name}: {gefallen} Pixel Aussenkontur abgenommen")
        if name in MIT_RELIEF:
            dicken, oben, unten = reliefdicke(karte, v.FARBEN)
        else:
            dicken, oben, unten = dickenliste(karte)
        modell = wurzel / "models" / "entity" / (name + ".geo.json")
        textur = wurzel / "textures" / "entity" / (texturname + ".png")
        w.aus_zeichenkarte(name, karte, v.FARBEN, dicke=dicken,
                           mitte=v.MITTE,
                           ziel_modell=str(modell), ziel_textur=str(textur))
        print(f"  {name}: Parierstange in Zeile {oben}-{unten} "
              f"von {len(karte)}")


if __name__ == "__main__":
    main()
