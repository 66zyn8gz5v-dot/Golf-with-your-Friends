# Sternenpaket – ein Minecraft-Add-on für die Bedrock Edition

Das ist der erste Testlauf: zwei Gegenstände, ein Rezept. Absichtlich klein.
Wenn das im Spiel auftaucht, wissen wir, dass die ganze Kette funktioniert –
Datei, Installation, Welt. Erst dann bauen wir das Größere darauf.

## Was drin ist

* **Glimmerling** – ein scheues Waldwesen, das nachts unterwegs ist, im
  Dunkeln glimmt und vor dir wegläuft. Erlegst du eins, lässt es Sternenstaub
  fallen.
* **Sternenstaub** – ein leuchtendes Material
* **Sternenklinge** – ein Schwert aus zwei Sternenstaub und einem Stock,
  etwas stärker und deutlich haltbarer als ein Diamantschwert

## Einbauen aufs iPad

1. **Datei herunterladen.** Den Link im Safari öffnen und auf Herunterladen
   tippen. Die Datei landet in der App „Dateien“, meistens unter „Downloads“.
2. **Datei antippen.** Minecraft startet von selbst und sagt kurz, dass es
   importiert. Wenn stattdessen nichts passiert: in der Dateien-App lange
   drauftippen, „Teilen“, dann Minecraft auswählen.
3. **Neue Welt anlegen.** Beim Erstellen links zu den Einstellungen gehen.
4. Unter **Verhaltenspakete** das Sternenpaket aktivieren. Das passende
   Aussehen-Paket schaltet sich dabei von selbst mit ein.
5. Welt starten.

## Ausprobieren

Im **Kreativmodus** liegt der Sternenstaub im Inventar bei den Materialien,
die Sternenklinge bei den Schwertern. Am schnellsten findest du beide über
die Suche im Inventar.

Den **Glimmerling** findest du nachts in Wäldern, auf Gras, Podsol oder Moos.
Er erscheint nur im Dunkeln und in kleinen Gruppen, und er läuft weg, sobald
du näher als zehn Blöcke kommst – du musst ihn also jagen. Schneller geht es
mit dem Spawn-Ei aus dem Kreativmodus.

So läuft die Kette im **Überlebensmodus**: Glimmerling suchen, erlegen,
Sternenstaub einsammeln, an der Werkbank die Klinge bauen.

Gebaut wird die Klinge an der Werkbank wie ein normales Schwert:
zwei Sternenstaub übereinander, darunter ein Stock.

## Zwei Dinge, die normal sind

* **Erfolge sind aus.** Sobald eine Welt ein Verhaltenspaket benutzt,
  schaltet Minecraft die Erfolge ab. Das ist bei allen Add-ons so.
* **Alte Welten bleiben unverändert.** Das Paket wirkt nur in Welten, in
  denen du es eingeschaltet hast.

## Der Stil: Mittelalter-Fantasy

Alles in diesem Add-on sieht mittelalterlich aus, nicht magisch-modern:
geschmiedeter Stahl, Bronze, gegerbtes Leder, dunkle Umrisse. Kein Neon,
kein Violett, keine Leuchtfarben – die hellen Töne sind dem Sternenstaub
vorbehalten, weil der von sich aus leuchtet.

Die Farben dafür stehen gesammelt in `werkzeuge/texturen_erzeugen.py`
unter `FARBEN`. Wer neue Gegenstände dazubaut, nimmt die von dort, damit
alles zusammenpasst.

## Wie das hier aufgebaut ist

| Ordner | Wofür |
| --- | --- |
| `verhaltenspaket/` | Die Regeln: welche Gegenstände es gibt, was sie können, wie man sie baut |
| `ressourcenpaket/` | Das Aussehen: Bilder und Namen in Deutsch und Englisch |
| `werkzeuge/` | Kleine Programme, die beim Bauen helfen |
| `vorschau/` | Die Bilder stark vergrößert, zum Anschauen |

Minecraft trennt das strikt: Das Verhaltenspaket weiß nichts davon, wie ein
Gegenstand aussieht, und das Ressourcenpaket weiß nichts davon, was er tut.
Verbunden werden die beiden über ihre UUIDs in den `manifest.json`-Dateien.

## Selbst etwas ändern

**Die Bilder** stehen als Zeichenkarten in `werkzeuge/texturen_erzeugen.py`.
Jedes Zeichen ist ein Pixel, jeder Punkt bleibt durchsichtig. Wer dort ein
Zeichen ändert und das Programm laufen lässt, hat ein neues Bild – ohne
Malprogramm.

**Die Namen** stehen in `ressourcenpaket/texts/de_DE.lang`.

**Die Werte der Klinge** (Schaden, Haltbarkeit) stehen in
`verhaltenspaket/items/sternenklinge.json`.

**Wie scheu der Glimmerling ist** steht in
`verhaltenspaket/entities/glimmerling.json` unter `avoid_mob_type`: `max_dist`
ist der Abstand, ab dem er flieht.

**Wo er auftaucht** steht in `verhaltenspaket/spawn_rules/glimmerling.json`.

## Warum der Glimmerling glimmt

Bedrock kann Mobs kein Licht abgeben lassen – ein Glimmerling erhellt seine
Umgebung also nicht. Was geht, ist Eigenlicht auf der Haut: Pixel mit dem
Alphawert 254 statt 255 leuchten, wenn das Wesen das Material
`entity_emissive_alpha` benutzt. Deshalb sind die Flecken auf seinem Rücken
und seine Augen auch nachts hell, während der Rest dunkel bleibt.

## Neu bauen

```
python3 werkzeuge/pruefen.py   # sucht Fehler, die Minecraft selbst verschweigt
python3 werkzeuge/bauen.py     # erzeugt Sternenpaket.mcaddon (prüft vorher)
```

`pruefen.py` gibt es, weil Minecraft bei einem Fehler im Paket nichts sagt:
Der Gegenstand erscheint dann einfach nicht, ohne Fehlermeldung. Das Programm
sucht genau die Fehler, die man sonst blind im Spiel suchen müsste.
