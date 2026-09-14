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

## Nach jeder Überarbeitung die Links zum Anklicken mitgeben

Am Ende jedes Berichts über eine Überarbeitung des Spiels stehen beide Adressen – ohne dass
jemand danach fragen muss:

Es sind inzwischen vier, weil es zwei Spiele sind:

* 2,5D-Spiel: <https://66zyn8gz5v-dot.github.io/Golf-with-your-Friends/>
* 2,5D-Vorschau: <https://66zyn8gz5v-dot.github.io/Golf-with-your-Friends/vorschau/>
* Fantasy Golf 3D: <https://66zyn8gz5v-dot.github.io/Golf-with-your-Friends/src/3d/>
* Fantasy Golf 3D, Vorschau: <https://66zyn8gz5v-dot.github.io/Golf-with-your-Friends/vorschau/src/3d/>

Im Bericht stehen die, um die es geht – nicht alle vier, wenn nur eine gemeint ist.

**Zum Anklicken, nicht als Textblock.** Eine Adresse, die in einem eingerückten Block oder in
schrägen Anführungszeichen steht, ist im Bericht nur Text: Fynn muss sie mit der Hand markieren
und kopieren. Als richtiger Verweis – in spitzen Klammern oder als `[Text](Adresse)` – ist sie
ein Klick. Das gilt auch für jede andere Adresse im Bericht.

**Und zwar in gewöhnlichem Fließtext, nie in einer Überschrift.** Das ist am 14. September
schiefgegangen: Der Link stand als `### 👉 [Fantasy Golf 3D](…)` da, und beim Antippen auf dem
iPad ging nicht der Browser auf, sondern ein leeres Fenster der Claude-App. Überschriften werden
dort anders dargestellt, und dabei geht das Antippen verloren. Ein Link gehört in einen Satz.

**Dazu die Adresse einmal nackt auf einer eigenen Zeile**, ohne Klammern und ohne Formatierung.
Dann lässt sie sich markieren und kopieren, auch wenn das Antippen wieder ins Leere greift – und
sie ist der Weg, der immer geht: Browser öffnen, einfügen.

Dazu gehört der Hinweis, die Seite einmal neu zu laden – der Service Worker hält sonst den alten
Stand. Vorschau und Spiel sind getrennte Anwendungen mit getrenntem Speicher; Rekorde aus dem einen
tauchen im anderen nicht auf.

Und wenn der neue Stand noch **nicht** unter diesen Adressen liegt – weil die Veröffentlichung
noch aussteht oder an etwas hängt –, dann steht das dabei. Ein Link, hinter dem der alte Stand
wartet, ist schlimmer als kein Link.

## Sprache

Berichte, Rückfragen und alles, was Lüddecke liest, auf **Deutsch**. Im Quelltext ebenso: Namen,
Kommentare und Festschreibtexte sind deutsch, und Kommentare sagen das *Warum*, nicht das *Was*.
