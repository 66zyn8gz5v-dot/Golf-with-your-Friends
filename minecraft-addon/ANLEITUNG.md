# Wie das Add-on aufs iPad kommt

## Der kurze Weg: der Kurzbefehl

Auf dem iPad gibt es einen Kurzbefehl namens **Sternenpaket holen**. Ein Tipp darauf, und der
neueste Stand ist im Spiel. Danach Minecraft einmal ganz beenden und neu starten.

Der Kurzbefehl holt sich zwei Dateien von hier:

* <https://raw.githubusercontent.com/66zyn8gz5v-dot/Golf-with-your-Friends/claude/minecraft-mod-bedrock-y7faxg/minecraft-addon/auslieferung/paket_verhalten.zip>
* <https://raw.githubusercontent.com/66zyn8gz5v-dot/Golf-with-your-Friends/claude/minecraft-mod-bedrock-y7faxg/minecraft-addon/auslieferung/paket_bilder.zip>

Deshalb liegen die gebauten Pakete unter `auslieferung/` im Verzeichnis, obwohl gebaute Dateien
dort sonst nichts verloren haben: Sie sind hier nicht Abfall, sondern der Weg ins Spiel.

### Den Kurzbefehl bauen

In der App **Kurzbefehle** einen neuen anlegen und diese Aktionen untereinander setzen. Der
Ablauf steht zweimal da, einmal je Paket.

1. **Inhalte von URL abrufen** — die obere Adresse einsetzen.
2. **Archiv entpacken** — nimmt die geladene Datei.
3. **Datei speichern** — Ziel: `Auf meinem iPad › Minecraft › games › com.mojang ›
   development_behavior_packs`. Bei „Nachfragen, wo gesichert werden soll" den Haken **weg**, und
   **Überschreiben, falls vorhanden** an.
4. bis 6. Dasselbe mit der unteren Adresse, Ziel `development_resource_packs`.

Ohne das Überschreiben legt das iPad bei jedem Mal einen zweiten Ordner mit „2" im Namen an, und
Minecraft hat dasselbe Paket doppelt.

## Der lange Weg, wenn der Kurzbefehl klemmt

Beide Dateien aus `auslieferung/` von Hand laden und in der Dateien-App entpacken. Dabei entsteht
ein Ordner, der so heisst wie die Zip-Datei, und **darin** liegt der eigentliche Paketordner.
Gebraucht wird der innere:

* `paket_verhalten/sternenpaket_verhalten` nach `development_behavior_packs`
* `paket_bilder/sternenpaket_bilder` nach `development_resource_packs`

Beim Verschieben **Ersetzen** waehlen, nicht „beide behalten". Die leeren Huellen danach loeschen.

## Der Notweg: die .mcaddon

`Sternenpaket-<Fassung>.mcaddon` laesst sich antippen und importieren. Das geht nur einmal:
Beim zweiten Mal sagt Minecraft „Duplikatpaket gefunden" und lehnt ab. Dann muss das alte Paket
erst unter Einstellungen › Speicher geloescht werden. Deshalb ist das der Notweg und nicht der
Regelweg.

## Was sich wann aendert

Nicht jede Aenderung betrifft beide Pakete:

* **Verhalten** (`sternenpaket_verhalten`): Gegenstaende, Rezepte, Wesen, Beute, Spawnregeln.
* **Bilder** (`sternenpaket_bilder`): Texturen, Modelle, Attachables, Animationen, Namen.

Wird nur an einem Modell gefeilt, reicht das Bilder-Paket. Und wenn sich nur eine einzelne Datei
aendert — etwa die Halte-Animation einer Waffe —, genuegt es, genau diese Datei an ihren Platz zu
sichern und beim Nachfragen **Ersetzen** zu waehlen.
