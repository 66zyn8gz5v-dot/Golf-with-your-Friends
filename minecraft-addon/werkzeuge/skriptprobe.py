#!/usr/bin/env python3
"""Das Verhaltensskript durchspielen, ohne Minecraft.

main.js kann hier nicht laufen: Es holt sich @minecraft/server, und das
gibt es nur im Spiel. Also werden die paar Dinge, die es anfasst, als
Attrappe nachgebaut - Welt, Takte, Gegenstaende, Formulare - und das
Skript damit von vorn bis hinten durchgespielt: einlegen, schmelzen,
warten, herausnehmen, abbauen.

Der Grund dafuer ist handfest: Ein Fehler in main.js laesst nicht nur
den Tiegel ausfallen, sondern reisst das ganze Verhaltenspaket mit -
Silbererz, Klingen, alles. Und gemerkt haette man es erst auf dem iPad.

    python3 werkzeuge/skriptprobe.py
"""

import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

WURZEL = Path(__file__).resolve().parent.parent
HIER = Path(__file__).resolve().parent / "probe"

SERVER = '''
export const gemerkt = { ereignisse: {}, takte: [], eigenschaften: new Map() };
export const welten = new Map();
const abo = (vorsilbe) => new Proxy({}, { get: (_, name) => ({
    subscribe: (f) => { (gemerkt.ereignisse[vorsilbe + name] ||= []).push(f); } }) });
export const world = {
  afterEvents: abo(""),
  beforeEvents: abo("vorher."),
  getDimension: (id) => welten.get(id),
  getAllPlayers: () => [],
  getDynamicProperty: (k) => gemerkt.eigenschaften.get(k),
  setDynamicProperty: (k, v) => v === undefined
      ? gemerkt.eigenschaften.delete(k) : gemerkt.eigenschaften.set(k, v),
};
export const system = {
  currentTick: 0,
  beforeEvents: abo("system."),
  runInterval: (f, n) => gemerkt.takte.push([f, n]),
  run: (f) => f(),
  runTimeout: (f, n) => { gemerkt.takte.push(["spaeter", n]); },
};
export const ItemLockMode = { inventory: "inventory", none: "none", slot: "slot" };
export const BlockPermutation = { resolve: (typ, zustaende) => ({ typ, zustaende }) };
export const GameMode = { Adventure: "Adventure", Creative: "Creative", Spectator: "Spectator", Survival: "Survival" };
export class ItemStack {
  constructor(typeId, amount = 1) { this.typeId = typeId; this.amount = amount; }
  getComponent() { return undefined; }
  clone() { return new ItemStack(this.typeId, this.amount); }
}
'''

SERVER_UI = '''
export const letztesFenster = { titel: "", text: "", knoepfe: [] };
export let antwortGeber = () => ({ canceled: true });
export function setzeAntwort(f) { antwortGeber = f; }
export class ActionFormData {
  constructor() { this.knoepfe = []; }
  title(t) { this.titel = t; return this; }
  body(t) { this.text = t; return this; }
  button(beschriftung, bild) { this.knoepfe.push({ beschriftung, bild }); return this; }
  show() {
    letztesFenster.titel = this.titel;
    letztesFenster.text = this.text;
    letztesFenster.knoepfe = this.knoepfe;
    return Promise.resolve(antwortGeber(this));
  }
}
export const FormCancelationReason = { UserBusy: "UserBusy", UserClosed: "UserClosed" };
'''


def main():
    with tempfile.TemporaryDirectory() as ordner:
        platz = Path(ordner)
        for name, quelle in [("server", SERVER), ("server-ui", SERVER_UI)]:
            ziel = platz / "node_modules" / "@minecraft" / name
            ziel.mkdir(parents=True)
            (ziel / "package.json").write_text(
                '{ "name": "@minecraft/%s", "version": "2.0.0",'
                ' "type": "module", "main": "index.js" }' % name, encoding="utf-8")
            (ziel / "index.js").write_text(quelle, encoding="utf-8")
        (platz / "package.json").write_text('{"type":"module"}', encoding="utf-8")
        # Alle Skriptdateien, nicht nur main.js: main.js holt sich die
        # Rollen aus rollen.js.
        for skript in (WURZEL / "verhaltenspaket" / "scripts").glob("*.js"):
            shutil.copy(skript, platz / skript.name)
        for probe in sorted(HIER.glob("*.mjs")):
            shutil.copy(probe, platz / probe.name)

        for probe in sorted(HIER.glob("*.mjs")):
            print("=" * 60)
            print("Probe:", probe.name)
            lauf = subprocess.run(["node", probe.name], cwd=platz,
                                  capture_output=True, text=True)
            print(lauf.stdout)
            if lauf.returncode != 0:
                print(lauf.stderr, file=sys.stderr)
                print("Das Skript ist durchgefallen:", probe.name)
                raise SystemExit(1)
        print("Alle Proben durchgespielt, ohne Fehler.")


if __name__ == "__main__":
    main()
