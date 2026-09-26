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
3. **Datei sichern** — Ziel: `Auf meinem iPad › Minecraft › games › com.mojang ›
   development_behavior_packs`. Dann: „Nach Speicherort fragen" **aus**, „Überschreiben, falls
   Datei besteht" **an**, und **Unterpfad** auf `sternenpaket_verhalten`.
4. bis 6. Dasselbe mit der unteren Adresse, Ziel `development_resource_packs`, Unterpfad
   `sternenpaket_bilder`.

Der Unterpfad ist der Punkt, an dem es beim ersten Versuch scheiterte: „Archiv extrahieren" gibt
den *Inhalt* des Archivs weiter, nicht den Ordner darum herum. Ohne Unterpfad liegen `items`,
`entities` und `manifest.json` lose im Entwicklungsordner, und Minecraft findet dort kein Paket -
wortlos, wie immer. Der Unterpfad legt den fehlenden Ordner wieder an.

Ohne das Überschreiben legt das iPad bei jedem Mal einen zweiten Ordner mit „2" im Namen an, und
Minecraft hat dasselbe Paket doppelt.

## Der lange Weg, wenn der Kurzbefehl klemmt

Beide Dateien aus `auslieferung/` von Hand laden und in der Dateien-App entpacken. Dabei entsteht
ein Ordner, der so heisst wie die Zip-Datei, und **darin** liegt der eigentliche Paketordner.
Gebraucht wird der innere (der Kurzbefehl nimmt stattdessen den Unterpfad, siehe oben):

* `paket_verhalten/sternenpaket_verhalten` nach `development_behavior_packs`
* `paket_bilder/sternenpaket_bilder` nach `development_resource_packs`

Beim Verschieben **Ersetzen** waehlen, nicht „beide behalten". Die leeren Huellen danach loeschen.

## Der Notweg: die .mcaddon zum Antippen

Wenn der Kurzbefehl klemmt, geht es auch ohne ihn. Diese Adresse laedt das ganze Add-on als eine
Datei, und ein Tipp darauf uebergibt sie an Minecraft:

<https://github.com/66zyn8gz5v-dot/Golf-with-your-Friends/raw/claude/minecraft-mod-bedrock-y7faxg/minecraft-addon/auslieferung/Sternenpaket.mcaddon>

Die Adresse bleibt immer dieselbe, auch wenn die Fassung sich aendert - deshalb steht keine Nummer
im Dateinamen.

Und genau daran ist sie am 22. September haengengeblieben: Auf GitHub lag 1.63, im Spiel kam immer
wieder 1.62 an. Das iPad merkt sich, was hinter einer Adresse steckt, und gibt beim naechsten Mal
die gemerkte Datei heraus, ohne nachzufragen - die Adresse hat sich ja nicht geaendert. Ein
Anhaengsel loest das, weil es fuer das iPad eine fremde Adresse ist:

<https://github.com/66zyn8gz5v-dot/Golf-with-your-Friends/raw/claude/minecraft-mod-bedrock-y7faxg/minecraft-addon/auslieferung/Sternenpaket.mcaddon?v=163>

Die Zahl dahinter ist beliebig, sie muss sich nur von der letzten unterscheiden; die Fassungsnummer
ist deshalb der einfachste Wert. `bauen.py` schreibt die fertige Adresse am Ende jedes Baus hin,
damit sie im Bericht nicht von Hand zusammengesetzt wird.

Fuer den Kurzbefehl, der immer dieselbe Adresse aufruft, gibt es denselben Trick zum Einbauen:
hinter die Adresse ein `?v=` setzen und dahinter den Baustein „Aktuelles Datum" einfuegen. Dann ist
die Adresse bei jedem Lauf eine andere, und das Gedaechtnis des iPads greift nie.

Der Haken: Minecraft kann „Duplikatpaket gefunden" melden und ablehnen, wenn dasselbe Paket schon
im Speicher liegt. Dann erst unter Einstellungen › Speicher › Ressourcenpakete das alte loeschen.
Deshalb ist das der Notweg und nicht der Regelweg.

## Die Kennungen wurden am 22. September getauscht

Minecraft unterscheidet Pakete an ihrer UUID, nicht am Namen. Solange zwei Kopien desselben Pakets
dieselbe Kennung tragen, sind sie fuer Minecraft ein und dasselbe Paket - und es nimmt eine davon,
ohne zu sagen welche. Genau daran hing es: Der Kurzbefehl schrieb den neuen Stand sauber in den
Entwicklungsordner, und das Spiel benutzte trotzdem weiter eine alte, importierte Kopie.

Seit Fassung 1.38 tragen beide Pakete neue Kennungen. Alte und neue Fassung stehen damit
nebeneinander in der Paketliste, statt sich gegenseitig zu verdecken. Wer noch eine alte Kopie
im Speicher hat, schaltet sie in der Welt aus und das neue Paket ein - oder loescht sie unter
Einstellungen > Speicher.

Der Preis: Eine `.mcaddon` von vor diesem Tag ist fuer Minecraft ein anderes Paket als eine von
danach. Beide lassen sich gleichzeitig installieren, und beide gleichzeitig einzuschalten geht
schief - dann sind alle Gegenstaende doppelt erklaert.

## Woran man sieht, welche Fassung wirklich im Spiel ist

Die Fassungsnummer steht im **Namen** des Pakets, nicht nur in der Beschreibung darunter. In der
Paketliste der Welt - Einstellungen › Ressourcenpakete - steht also zum Beispiel „Sternenpaket
1.34 (Aussehen)". Was dort steht, ist die Wahrheit; was im Entwicklungsordner liegt, muss nicht
dasselbe sein.

Zwei Fallen, die sich so aufdecken lassen:

* **Das Paket steht doppelt in der Liste.** Dann ist eines davon aus einer `.mcaddon` importiert
  und liegt im normalen Paketordner, das andere kommt aus dem Entwicklungsordner. Die Welt benutzt
  nur eines - und wenn das das importierte ist, aendert der Kurzbefehl nichts. Das importierte
  unter Einstellungen › Speicher loeschen.
* **Die Nummer ist eine alte.** Dann ist der Kurzbefehl nicht durchgelaufen oder hat neben den
  alten Ordner einen zweiten mit „2" im Namen gelegt, statt zu ersetzen.

## Was sich wann aendert

Nicht jede Aenderung betrifft beide Pakete:

* **Verhalten** (`sternenpaket_verhalten`): Gegenstaende, Rezepte, Wesen, Beute, Spawnregeln.
* **Bilder** (`sternenpaket_bilder`): Texturen, Modelle, Attachables, Animationen, Namen.

Wird nur an einem Modell gefeilt, reicht das Bilder-Paket. Und wenn sich nur eine einzelne Datei
aendert — etwa die Halte-Animation einer Waffe —, genuegt es, genau diese Datei an ihren Platz zu
sichern und beim Nachfragen **Ersetzen** zu waehlen.
