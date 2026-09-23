#!/usr/bin/env python3
"""Die Blockdateien gegen Mojangs eigene Schemata halten.

Warum das noetig wurde: Beim Wechsel der Regelfassung von 1.21.90 auf
1.26.20 blieb "states": {"fynn:brennt": [false, true]} stehen. In der
neuen Fassung sind Wahrheitswerte dort nicht mehr erlaubt, nur
Zeichenketten oder Zahlenbereiche. Minecraft sagt dazu nichts - es
verwirft den Block stillschweigend, und im Spiel steht ein fremder
Wuerfel. Gefunden wurde es erst auf Fynns iPad.

Mojang liefert die Schemata in seinem Beispielpaket mit:

    git clone --depth 1 https://github.com/Mojang/bedrock-samples

Wo sie liegen, sagt die Umgebungsvariable BEDROCK_SCHEMAS; ohne sie
wird an den ueblichen Stellen gesucht. Fehlen sie, meldet die Pruefung
das als Hinweis und laesst den Rest durchlaufen - sie soll nicht
blockieren, nur warnen.
"""

import json
import os
import urllib.parse
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent

ORTE = [
    os.environ.get("BEDROCK_SCHEMAS", ""),
    "/home/user/mojang/bedrock-samples/metadata/json_schemas",
    str(Path.home() / "bedrock-samples" / "metadata" / "json_schemas"),
]


def schemaordner():
    for ort in ORTE:
        if ort and Path(ort).is_dir():
            return Path(ort)
    return None


def lade_alle(wurzel):
    """Alle Schemata einsammeln - sie verweisen quer durch den Baum, und
    manche Verweise zeigen auf Pfade, unter denen die Datei gar nicht
    liegt. Deshalb zusaetzlich eine Ablage nach blossem Dateinamen."""
    speicher, nach_name = {}, {}
    for datei in wurzel.rglob("*.json"):
        try:
            inhalt = json.loads(datei.read_text(encoding="utf-8"))
        except Exception:
            continue
        nach_name.setdefault(datei.name, inhalt)
        for schluessel in {inhalt.get("$id", ""), "/" + str(datei.relative_to(wurzel))}:
            if schluessel:
                for form in (schluessel, urllib.parse.quote(schluessel),
                             urllib.parse.unquote(schluessel)):
                    speicher[form] = inhalt
    return speicher, nach_name


def pruefe(fehler, hinweise):
    wurzel = schemaordner()
    if wurzel is None:
        hinweise.append("Mojangs Schemata nicht gefunden - die Bloecke wurden "
                        "nicht gegen die Regelfassung geprueft.")
        return
    try:
        import warnings
        warnings.filterwarnings("ignore")
        from jsonschema import Draft7Validator, RefResolver
    except ImportError:
        hinweise.append("jsonschema fehlt (pip install jsonschema) - die Bloecke "
                        "wurden nicht gegen die Regelfassung geprueft.")
        return

    speicher, nach_name = lade_alle(wurzel)

    class Nachsichtig(RefResolver):
        def resolve(self, ref):
            for form in (ref, urllib.parse.unquote(ref), urllib.parse.quote(ref)):
                if form in self.store:
                    return form, self.store[form]
            name = urllib.parse.unquote(ref.rsplit("/", 1)[-1])
            if name in nach_name:
                return ref, nach_name[name]
            return ref, {}          # unbekannt: nichts einschraenken

    fassungen = {p.name: p for p in (wurzel / "server" / "block").glob("*") if p.is_dir()}

    for datei in sorted((WURZEL / "verhaltenspaket" / "blocks").glob("*.json")):
        inhalt = json.loads(datei.read_text(encoding="utf-8"))
        fassung = str(inhalt.get("format_version", ""))
        ordner = fassungen.get(fassung)
        if ordner is None:
            # Die Schemata gibt es nur fuer einzelne Fassungen. Gegen die
            # neueste zu pruefen ist besser als gar nicht - was dort
            # beanstandet wird, faellt spaetestens beim naechsten
            # Fassungswechsel auf die Fuesse.
            ordner = sorted(fassungen.items())[-1][1]
        haupt = json.loads((ordner / "Blocks.json").read_text(encoding="utf-8"))
        eigen = dict(speicher)
        for nachbar in ordner.glob("*.json"):
            d = json.loads(nachbar.read_text(encoding="utf-8"))
            for form in ("./" + nachbar.name, urllib.parse.quote("./" + nachbar.name)):
                eigen[form] = d
        loeser = Nachsichtig(base_uri="", referrer=haupt, store=eigen)
        try:
            gefunden = sorted(Draft7Validator(haupt, resolver=loeser)
                              .iter_errors(inhalt["minecraft:block"]),
                              key=lambda e: list(e.path))
        except Exception as fehlschlag:
            hinweise.append(f"{datei.name}: Schemapruefung gescheitert ({fehlschlag}).")
            continue
        for f in gefunden:
            wo = "/".join(str(t) for t in f.path) or "(Wurzel)"
            fehler.append(f"{datei.name} [{ordner.name}] {wo}: {f.message[:200]}")


if __name__ == "__main__":
    fehler, hinweise = [], []
    pruefe(fehler, hinweise)
    for h in hinweise:
        print("  Hinweis:", h)
    for f in fehler:
        print("  FEHLER:", f)
    print("\n%d Beanstandung(en)." % len(fehler))
    raise SystemExit(1 if fehler else 0)
