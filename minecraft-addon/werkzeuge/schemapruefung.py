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


def als_zahlen(text):
    """1.26.20 -> (1, 26, 20). Was sich nicht so lesen laesst - etwa
    "beta" -, kommt nicht in Frage."""
    teile = text.split(".")
    if not teile or not all(t.isdigit() for t in teile):
        return None
    return tuple(int(t) for t in teile)


def naechste(fassungen, gesucht):
    """Das Schema der hoechsten Fassung, die nicht neuer ist als die
    Datei. Gegen ein neueres zu pruefen erzeugt Fehlalarme: Der
    Glimmerling steht auf 1.21.0, und das beta-Schema beanstandete an
    ihm eine Schreibweise, die in seiner Fassung voellig in Ordnung
    ist."""
    ziel = als_zahlen(gesucht)
    if ziel is None:
        return None
    passende = [(als_zahlen(n), o) for n, o in fassungen.items()
                if als_zahlen(n) is not None and als_zahlen(n) <= ziel]
    if not passende:
        return None
    return max(passende)[1]


def filter_mehrdeutig(f):
    """Mojangs Schema beschreibt Filter doppelt (als einzelnen Test und als
    Gruppe), beide mit "oneOf" - ein gewoehnlicher Filter passt auf beide
    und gilt damit als ungueltig. Mojangs eigener Eisbaer, Wolf, Delfin und
    Hoglin fallen genau so durch (nachgeprueft, Fassung 1.26.30). Solche
    Meldungen an Filtern sind also keine Fehler im Paket."""
    pfad = [str(t) for t in f.path]
    an_filter = any(t in ("filters", "entity_types") for t in pfad)
    return an_filter and ("is valid under each of" in f.message
                          or "is not valid under any of the given schemas" in f.message)


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

    # Was wogegen geprueft wird: Ordner im Paket, Schema-Zweig,
    # Einstiegsdatei und der Schluessel, unter dem der Inhalt steckt.
    ARTEN = [
        ("blocks", "block", "Blocks.json", "minecraft:block"),
        ("items", "item", "ItemDocument.json", "minecraft:item"),
        ("entities", "entity", "ActorDocument.json", "minecraft:entity"),
    ]

    for ordnername, zweig, einstieg, schluessel in ARTEN:
        quelle = WURZEL / "verhaltenspaket" / ordnername
        if not quelle.is_dir():
            continue
        fassungen = {p.name: p for p in (wurzel / "server" / zweig).glob("*") if p.is_dir()}
        if not fassungen:
            continue

        for datei in sorted(quelle.glob("*.json")):
            inhalt = json.loads(datei.read_text(encoding="utf-8"))
            if schluessel not in inhalt:
                continue
            fassung = str(inhalt.get("format_version", ""))
            ordner = fassungen.get(fassung) or naechste(fassungen, fassung)
            # Gibt es gar kein Schema, das alt genug ist, wird gegen das
            # aelteste vorhandene gehalten - aber nur als Hinweis. Eine
            # neuere Fassung ist meist strenger, und ein Treffer kann
            # ebenso gut daher ruehren wie von einem echten Fehler.
            nur_hinweis = ordner is None
            if nur_hinweis:
                ordner = min(((als_zahlen(n), o) for n, o in fassungen.items()
                              if als_zahlen(n) is not None), default=(None, None))[1]
            if ordner is None:
                hinweise.append(f"{datei.name}: kein Schema zu Fassung {fassung}.")
                continue
            einstiegsdatei = ordner / einstieg
            if not einstiegsdatei.exists():
                hinweise.append(f"{datei.name}: kein Einstiegsschema in {ordner.name}.")
                continue
            haupt = json.loads(einstiegsdatei.read_text(encoding="utf-8"))
            eigen = dict(speicher)
            for nachbar in ordner.glob("*.json"):
                d = json.loads(nachbar.read_text(encoding="utf-8"))
                for form in ("./" + nachbar.name, urllib.parse.quote("./" + nachbar.name)):
                    eigen[form] = d
            loeser = Nachsichtig(base_uri="", referrer=haupt, store=eigen)
            try:
                gefunden = sorted(Draft7Validator(haupt, resolver=loeser)
                                  .iter_errors(inhalt[schluessel]),
                                  key=lambda e: list(e.path))
            except Exception as fehlschlag:
                hinweise.append(f"{datei.name}: Schemapruefung gescheitert ({fehlschlag}).")
                continue
            for f in gefunden:
                if filter_mehrdeutig(f):
                    continue
                wo = "/".join(str(t) for t in f.path) or "(Wurzel)"
                text = f"{datei.name} [{ordner.name}] {wo}: {f.message[:200]}"
                if nur_hinweis:
                    hinweise.append(text + f" (nur gegen {ordner.name} geprueft, "
                                           f"die Datei steht auf {fassung})")
                else:
                    fehler.append(text)


if __name__ == "__main__":
    fehler, hinweise = [], []
    pruefe(fehler, hinweise)
    for h in hinweise:
        print("  Hinweis:", h)
    for f in fehler:
        print("  FEHLER:", f)
    print("\n%d Beanstandung(en)." % len(fehler))
    raise SystemExit(1 if fehler else 0)
