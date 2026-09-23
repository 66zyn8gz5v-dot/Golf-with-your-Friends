#!/usr/bin/env python3
"""Prueft das Paket, bevor es aufs iPad geht.

Minecraft meldet keine Fehler: Ein Paket mit einem Tippfehler laedt einfach
nicht, oder der Gegenstand erscheint ohne Bild und mit einem kryptischen
Namen. Jede Pruefung hier entspricht einem Fehler, den man sonst im Spiel
suchen muesste, ohne einen Hinweis zu bekommen.
"""

import json
import sys
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
VERHALTEN = WURZEL / "verhaltenspaket"
RESSOURCEN = WURZEL / "ressourcenpaket"

fehler = []
hinweise = []
EIGENE_GEGENSTAENDE = set()


def lies(pfad):
    try:
        return json.loads(pfad.read_text(encoding="utf-8"))
    except FileNotFoundError:
        fehler.append(f"Datei fehlt: {pfad.relative_to(WURZEL)}")
    except json.JSONDecodeError as problem:
        fehler.append(f"{pfad.relative_to(WURZEL)}: kaputtes JSON - {problem}")
    return None


def pruefe_manifeste():
    verhalten = lies(VERHALTEN / "manifest.json")
    ressourcen = lies(RESSOURCEN / "manifest.json")
    if not verhalten or not ressourcen:
        return

    kennungen = []
    for name, inhalt in (("Verhaltenspaket", verhalten), ("Ressourcenpaket", ressourcen)):
        kennungen.append(inhalt["header"]["uuid"])
        for baustein in inhalt["modules"]:
            kennungen.append(baustein["uuid"])

    # Vier gleiche Kennungen waeren der haeufigste Anfaengerfehler: Minecraft
    # haelt zwei Pakete mit derselben Kennung fuer dasselbe Paket.
    if len(set(kennungen)) != len(kennungen):
        fehler.append("Zwei Bausteine haben dieselbe UUID - Minecraft verwechselt sie dann.")

    abhaengig = [e.get("uuid") for e in verhalten.get("dependencies", [])]
    if ressourcen["header"]["uuid"] not in abhaengig:
        fehler.append(
            "Das Verhaltenspaket verweist nicht auf das Ressourcenpaket - "
            "die Gegenstaende haetten dann kein Bild."
        )

    for paket in (VERHALTEN, RESSOURCEN):
        if not (paket / "pack_icon.png").exists():
            hinweise.append(f"{paket.name}: pack_icon.png fehlt (Paket zeigt ein leeres Feld).")


def pruefe_gegenstaende(sprachen):
    zuordnung = lies(RESSOURCEN / "textures" / "item_texture.json")
    bekannte_bilder = set((zuordnung or {}).get("texture_data", {}))

    kennungen = set()
    for datei in sorted((VERHALTEN / "items").glob("*.json")):
        inhalt = lies(datei)
        if not inhalt:
            continue
        gegenstand = inhalt["minecraft:item"]
        kennung = gegenstand["description"]["identifier"]
        kennungen.add(kennung)

        bild = gegenstand["components"].get("minecraft:icon", {}).get("textures", {}).get("default")
        if bild is None:
            fehler.append(f"{datei.name}: kein Bild angegeben (minecraft:icon).")
        elif bild not in bekannte_bilder:
            fehler.append(f"{datei.name}: Bild '{bild}' steht nicht in item_texture.json.")

        for kuerzel, schluessel in sprachen.items():
            if f"item.{kennung}" not in schluessel and f"item.{kennung}.name" not in schluessel:
                fehler.append(f"{kuerzel}.lang: kein Name fuer '{kennung}'.")

    # Jedes eingetragene Bild muss es auch wirklich geben.
    for name, eintrag in (zuordnung or {}).get("texture_data", {}).items():
        pfad = RESSOURCEN / (eintrag["textures"] + ".png")
        if not pfad.exists():
            fehler.append(f"item_texture.json: Datei fehlt - {eintrag['textures']}.png")

    return kennungen


def pruefe_rezepte(kennungen):
    for datei in sorted((VERHALTEN / "recipes").glob("*.json")):
        inhalt = lies(datei)
        if not inhalt:
            continue
        ofen = inhalt.get("minecraft:recipe_furnace")
        if ofen:
            for stueck in (ofen["input"], ofen["output"]):
                name = stueck["item"] if isinstance(stueck, dict) else stueck
                if name.startswith("fynn:") and name not in kennungen:
                    fehler.append(f"{datei.name}: '{name}' gibt es als Gegenstand nicht.")
            continue

        rezept = inhalt.get("minecraft:recipe_shaped") or inhalt.get("minecraft:recipe_shapeless")
        if not rezept:
            fehler.append(f"{datei.name}: unbekannte Rezeptart.")
            continue

        verwendet = [e["item"] for e in rezept.get("key", {}).values()]
        verwendet += [e["item"] for e in rezept.get("ingredients", [])]
        verwendet.append(rezept["result"]["item"])
        for eintrag in rezept.get("unlock", []):
            if "item" in eintrag:
                verwendet.append(eintrag["item"])

        for stueck in verwendet:
            # Nur eigene Gegenstaende pruefen - Vanilla-Namen kennen wir nicht.
            if stueck.startswith("fynn:") and stueck not in kennungen:
                fehler.append(f"{datei.name}: '{stueck}' gibt es als Gegenstand nicht.")

        muster = rezept.get("pattern", [])
        schluessel = set(rezept.get("key", {}))
        for zeile in muster:
            for zeichen in zeile:
                if zeichen != " " and zeichen not in schluessel:
                    fehler.append(f"{datei.name}: Zeichen '{zeichen}' im Muster hat keine Zutat.")



def pruefe_wesen(sprachen):
    """Ein Wesen haengt an vier Dateien, die sich gegenseitig ueber Namen
    finden muessen. Stimmt einer nicht, erscheint das Tier gar nicht, oder
    als weisser Wuerfel ohne Bild - beides ohne Fehlermeldung."""
    modelle = {}
    for datei in (RESSOURCEN / "models" / "entity").glob("*.json"):
        inhalt = lies(datei)
        if not inhalt:
            continue
        for teil in inhalt.get("minecraft:geometry", []):
            kennung = teil["description"]["identifier"]
            modelle[kennung] = {knochen["name"] for knochen in teil.get("bones", [])}

    aussehen = {}
    for datei in (RESSOURCEN / "entity").glob("*.json"):
        inhalt = lies(datei)
        if inhalt:
            aussehen[inhalt["minecraft:client_entity"]["description"]["identifier"]] = (
                inhalt["minecraft:client_entity"]["description"]
            )

    spawnregeln = set()
    for datei in (VERHALTEN / "spawn_rules").glob("*.json"):
        inhalt = lies(datei)
        if inhalt:
            spawnregeln.add(inhalt["minecraft:spawn_rules"]["description"]["identifier"])

    for datei in sorted((VERHALTEN / "entities").glob("*.json")):
        inhalt = lies(datei)
        if not inhalt:
            continue
        beschreibung = inhalt["minecraft:entity"]["description"]
        kennung = beschreibung["identifier"]
        bauteile = inhalt["minecraft:entity"]["components"]

        if kennung not in aussehen:
            fehler.append(f"{datei.name}: kein Aussehen in ressourcenpaket/entity/ fuer '{kennung}'.")
            continue
        sicht = aussehen[kennung]

        modell = sicht["geometry"]["default"]
        if modell not in modelle:
            fehler.append(f"{kennung}: Modell '{modell}' gibt es nicht.")
        else:
            # Die eingebauten Animationen sprechen feste Knochen an. Fehlen
            # die, steht das Tier still, ohne dass etwas gemeldet wird.
            benoetigt = set()
            for animation in sicht.get("animations", {}).values():
                if animation == "animation.quadruped.walk":
                    benoetigt |= {"leg0", "leg1", "leg2", "leg3"}
                if animation == "animation.common.look_at_target":
                    benoetigt.add("head")
            fehlend = sorted(benoetigt - modelle[modell])
            if fehlend:
                fehler.append(
                    f"{kennung}: Modell '{modell}' fehlen die Knochen {fehlend} - "
                    "die eingebaute Animation greift ins Leere."
                )

        for name, pfad in sicht["textures"].items():
            if not (RESSOURCEN / (pfad + ".png")).exists():
                fehler.append(f"{kennung}: Bild fehlt - {pfad}.png")

        beute = bauteile.get("minecraft:loot", {}).get("table")
        if beute:
            if not (VERHALTEN / beute).exists():
                fehler.append(f"{kennung}: Beuteliste fehlt - {beute}")
            else:
                inhalt_beute = lies(VERHALTEN / beute)
                for topf in (inhalt_beute or {}).get("pools", []):
                    for eintrag in topf.get("entries", []):
                        stueck = eintrag.get("name", "")
                        if stueck.startswith("fynn:") and stueck not in EIGENE_GEGENSTAENDE:
                            fehler.append(f"{beute}: '{stueck}' gibt es als Gegenstand nicht.")

        if beschreibung.get("is_spawnable") and kennung not in spawnregeln:
            hinweise.append(
                f"{kennung}: keine Spawnregel - das Wesen erscheint nur per Ei oder Befehl."
            )

        for kuerzel, schluessel in sprachen.items():
            if f"entity.{kennung}.name" not in schluessel:
                fehler.append(f"{kuerzel}.lang: kein Name fuer das Wesen '{kennung}'.")


def pruefe_bloecke(sprachen, kennungen):
    """Ein Block haengt an sechs Dateien. Fehlt eine Verbindung, steht im
    Spiel ein schwarz-violetter Wuerfel - oder der Block ist gar nicht da,
    beides ohne Fehlermeldung."""
    zuordnung = lies(RESSOURCEN / "textures" / "terrain_texture.json")
    bekannte_bilder = set((zuordnung or {}).get("texture_data", {}))

    blockkennungen = set()
    for datei in sorted((VERHALTEN / "blocks").glob("*.json")):
        inhalt = lies(datei)
        if not inhalt:
            continue
        block = inhalt["minecraft:block"]
        kennung = block["description"]["identifier"]
        blockkennungen.add(kennung)
        bauteile = block["components"]

        stoffe = bauteile.get("minecraft:material_instances", {})
        if not stoffe:
            fehler.append(f"{datei.name}: kein minecraft:material_instances - der Block bliebe unsichtbar.")
        for seite, angabe in stoffe.items():
            bild = angabe.get("texture")
            if bild not in bekannte_bilder:
                fehler.append(f"{datei.name}: Bild '{bild}' steht nicht in terrain_texture.json.")

        # Auch in den Permutationen nachsehen. Bei den Oefen steht dort
        # fast jede Textur - sie wechseln je nach Blickrichtung und
        # Brennzustand. Ein Tippfehler waere hier bisher durchgerutscht
        # und haette im Spiel eine schwarz-violette Seite ergeben.
        for nr, perm in enumerate(block.get("permutations", []), 1):
            for seite, angabe in perm.get("components", {}) \
                    .get("minecraft:material_instances", {}).items():
                bild = angabe.get("texture")
                if bild not in bekannte_bilder:
                    fehler.append(
                        f"{datei.name}, Permutation {nr} ({perm.get('condition','')}): "
                        f"Bild '{bild}' steht nicht in terrain_texture.json.")

        beute = bauteile.get("minecraft:loot")
        if beute:
            pfad = VERHALTEN / beute
            if not pfad.exists():
                fehler.append(f"{kennung}: Beuteliste fehlt - {beute}")
            else:
                inhalt_beute = lies(pfad) or {}
                gefunden = False
                for topf in inhalt_beute.get("pools", []):
                    for eintrag in topf.get("entries", []):
                        gefunden = True
                        stueck = eintrag.get("name", "")
                        if stueck.startswith("fynn:") and stueck not in kennungen:
                            fehler.append(f"{beute}: '{stueck}' gibt es als Gegenstand nicht.")
                if not gefunden:
                    fehler.append(f"{beute}: kein einziger Eintrag - der Block liesse nichts fallen.")
        else:
            hinweise.append(f"{kennung}: keine Beuteliste - der Block faellt als er selbst.")

        for kuerzel, schluessel in sprachen.items():
            if f"tile.{kennung}.name" not in schluessel:
                fehler.append(f"{kuerzel}.lang: kein Name fuer den Block '{kennung}'.")

    for name, eintrag in (zuordnung or {}).get("texture_data", {}).items():
        if not (RESSOURCEN / (eintrag["textures"] + ".png")).exists():
            fehler.append(f"terrain_texture.json: Datei fehlt - {eintrag['textures']}.png")

    return blockkennungen


def pruefe_vorkommen(blockkennungen):
    """Erz im Berg ist eine Kette aus drei Dateien: Regel zeigt auf Streuung,
    Streuung auf Ader, Ader setzt den Block. Reisst die Kette, erscheint das
    Erz einfach nirgends."""
    merkmale = {}
    for datei in sorted((VERHALTEN / "features").glob("*.json")):
        inhalt = lies(datei)
        if not inhalt:
            continue
        for art, koerper in inhalt.items():
            if not art.startswith("minecraft:"):
                continue
            kennung = koerper["description"]["identifier"]
            merkmale[kennung] = (art, koerper, datei.name)

    for kennung, (art, koerper, dateiname) in merkmale.items():
        if art == "minecraft:ore_feature":
            for regel in koerper.get("replace_rules", []):
                gesetzt = regel.get("places_block")
                if isinstance(gesetzt, str) and gesetzt.startswith("fynn:") \
                        and gesetzt not in blockkennungen:
                    fehler.append(f"{dateiname}: setzt '{gesetzt}' - diesen Block gibt es nicht.")
        weiter = koerper.get("places_feature")
        if weiter and weiter not in merkmale:
            fehler.append(f"{dateiname}: zeigt auf '{weiter}' - dieses Merkmal gibt es nicht.")

    for datei in sorted((VERHALTEN / "feature_rules").glob("*.json")):
        inhalt = lies(datei)
        if not inhalt:
            continue
        beschreibung = inhalt["minecraft:feature_rules"]["description"]
        weiter = beschreibung.get("places_feature")
        if weiter not in merkmale:
            fehler.append(f"{datei.name}: zeigt auf '{weiter}' - dieses Merkmal gibt es nicht.")


def lies_sprachen():
    sprachen = {}
    for kuerzel in ("de_DE", "en_US"):
        pfad = RESSOURCEN / "texts" / f"{kuerzel}.lang"
        if not pfad.exists():
            fehler.append(f"Sprachdatei fehlt: texts/{kuerzel}.lang")
            sprachen[kuerzel] = set()
            continue
        schluessel = set()
        for zeile in pfad.read_text(encoding="utf-8").splitlines():
            if "=" in zeile and not zeile.strip().startswith("#"):
                schluessel.add(zeile.split("=", 1)[0].strip())
        sprachen[kuerzel] = schluessel
    return sprachen


def pruefe_bildnamen():
    """Zwei Bilder duerfen nicht gleich heissen, auch nicht in verschiedenen Ordnern.

    Am 22. September hatte der Degen im Inventar kein Bild mehr, obwohl
    alles an seinem Platz lag: das 16x16-Bild in textures/items, der
    Eintrag in item_texture.json, der Verweis im Gegenstand. Daneben lag
    aber die Haut seines Modells, 18x70 gross - und die hiess ebenfalls
    degen.png. Minecraft fuehrt Bilder unter ihrem Kurznamen, nicht unter
    ihrem Pfad; von zwei gleichnamigen bleibt eines uebrig, und im
    Inventar stand dann die Modellhaut, zusammengequetscht auf ein
    Kaestchen. Zu sehen war davon nichts.

    Von aussen sieht so ein Fehler aus wie ein fehlendes Bild, und man
    sucht an der falschen Stelle - beim Bild, bei der Zuordnung, beim
    Gegenstand. Deshalb steht die Pruefung hier.
    """
    nach_namen = {}
    for bild in (RESSOURCEN / "textures").rglob("*.png"):
        nach_namen.setdefault(bild.name, []).append(
            str(bild.relative_to(RESSOURCEN)))
    for name, pfade in sorted(nach_namen.items()):
        if len(pfade) > 1:
            fehler.append(
                f"Zwei Bilder heissen {name}: {' und '.join(pfade)} - "
                "Minecraft behaelt nur eines davon.")


def main():
    global EIGENE_GEGENSTAENDE
    pruefe_manifeste()
    sprachen = lies_sprachen()
    kennungen = pruefe_gegenstaende(sprachen)
    EIGENE_GEGENSTAENDE = kennungen
    # Erst die Bloecke, dann die Rezepte: Ein setzbarer Block ist im Spiel
    # auch ein Gegenstand - er liegt im Inventar und laesst sich verarbeiten.
    # Vorher lief die Rezeptpruefung zuerst und kannte nur die Dateien aus
    # items/; ein Rezept mit einem eigenen Block darin galt deshalb als
    # Fehler, obwohl es im Spiel laeuft.
    bloecke = pruefe_bloecke(sprachen, kennungen)
    pruefe_rezepte(kennungen | bloecke)
    pruefe_vorkommen(bloecke)
    pruefe_wesen(sprachen)
    pruefe_bildnamen()

    for text in hinweise:
        print(f"  Hinweis: {text}")
    if fehler:
        print()
        for text in fehler:
            print(f"  FEHLER: {text}")
        print(f"\n{len(fehler)} Fehler. Das Paket wuerde im Spiel nicht richtig laufen.")
        return 1
    wesen = len(list((VERHALTEN / "entities").glob("*.json")))
    wort = "Block" if len(bloecke) == 1 else "Bloecke"
    print(f"\nAlles in Ordnung. {len(kennungen)} Gegenstaende, {len(bloecke)} {wort} "
          f"und {wesen} Wesen geprueft.")
    return 0


if __name__ == "__main__":
    sys.exit(main())
