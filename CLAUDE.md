# Feste Absprachen für die Arbeit an Fantasy Golf

Diese Datei steht hier, damit die Regeln auch dann gelten, wenn niemand sie noch einmal sagt.

## Alles geht zuerst in die Vorschau

**Neue Arbeit kommt in die Vorschau, nicht ins Spiel.** Ins Spiel geht sie erst, wenn Lüddecke es
ausdrücklich sagt („das kann ins Spiel", „übernimm das nach main"). Ohne diesen Satz bleibt `main`
unangetastet – auch dann, wenn eine Änderung noch so klein oder noch so sicher aussieht.

Der Weg dahin, bei jeder Auslieferung:

1. `APP_VERSION` in `src/version.js` um eins erhöhen.
2. Prüfen: `node tools/validate.mjs` und `node tools/auslieferung.mjs`, dazu die Regressionsskripte.
3. Auf den Arbeitszweig `claude/fantasy-golf-game-8-holes-t25aag` festschreiben und schieben.
4. Den Arbeitsablauf `pages.yml` von Hand auf `main` anstoßen (`workflow_dispatch`). Er holt sich
   den Vorschau-Stand selbst aus dem Arbeitszweig – ein Lauf von einem anderen Zweig scheitert an
   der Schutzregel der Umgebung `github-pages`.
5. Bilder vom Ergebnis machen und einen Bericht auf Deutsch schreiben.

## Am Ende eines größeren Auftrags immer den Link mitgeben

Zum Schluss steht der Link zur Vorschau im Bericht, ohne dass jemand danach fragen muss:

    https://66zyn8gz5v-dot.github.io/Golf-with-your-Friends/vorschau/

Zum Vergleich das Spiel: `https://66zyn8gz5v-dot.github.io/Golf-with-your-Friends/`

Dazu gehört der Hinweis, die Seite einmal neu zu laden – der Service Worker hält sonst den alten
Stand. Vorschau und Spiel sind getrennte Anwendungen mit getrenntem Speicher; Rekorde aus dem einen
tauchen im anderen nicht auf.

## Sprache

Berichte, Rückfragen und alles, was Lüddecke liest, auf **Deutsch**. Im Quelltext ebenso: Namen,
Kommentare und Festschreibtexte sind deutsch, und Kommentare sagen das *Warum*, nicht das *Was*.
