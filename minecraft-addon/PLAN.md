# Wohin das Add-on gehen soll

Fynns Ziel: aus dem Sternenpaket ein kleines Rollenspiel machen. Rollen,
Fähigkeiten, Magie, Aufstieg. Diese Datei hält fest, was besprochen ist —
damit es nicht verloren geht, auch wenn wochenlang nichts passiert.

Nichts davon ist gebaut. Gebaut sind bisher: Sternenstaub, Sternenklinge,
Glimmerling. Was hier steht, ist der Plan.

## Die Rollen

Beim ersten Betreten der Welt öffnet sich ein Menü zur Rollenwahl. Die Wahl
wird dauerhaft am Spieler gespeichert. Danach gibt es eine Startausrüstung,
die zur Rolle passt.

| Rolle | Besonderheit |
| --- | --- |
| Assassine | leichtfüßig, dauerhaft etwas schneller als die anderen |
| Ritter | mehr Leben |
| Magier | mehr Mana |

## Mana

Mana ist eine eigene Anzeige und wird für Zauber gebraucht. Es ist keine
Minecraft-Mechanik, sondern eine Zahl, die wir selbst führen.

**Anzeige:** Zuerst als Text über der Hotbar, mit Blocksymbolen als Balken
(`Mana ▮▮▮▮▯▯`). Eine echte grafische Leiste neben den Herzen ist später
möglich, aber der wackeligste Teil des ganzen Vorhabens — die dafür nötigen
Oberflächen-Dateien sind von Mojang nie dokumentiert worden und gehen bei
Spielupdates gern kaputt.

**Zauber auslösen:** Über Gegenstände — Zauberstab, Spruchrolle, Amulett.
Eigene Tasten gibt es in Bedrock nicht, es gibt kein "Q für Feuerball".
Das muss das Design von vornherein einplanen.

## Kristalle und Essenz

Zwei verschiedene Dinge, deshalb zwei Namen:

* **Manakristalle** sind Gegenstände im Inventar. Stapelbar bis 64. Neun
  einer Stufe lassen sich zu einem der nächsten Stufe zusammenbauen, wie bei
  Erzblöcken.
* **Essenz** ist die unsichtbare Zahl, die dauerhaft zum Spieler gehört. Man
  bekommt sie, indem man Kristalle eintauscht, und gibt sie für Fähigkeiten
  aus.

Warum die Trennung wichtig ist: Kristalle liegen im Inventar und sind beim
Tod weg. Essenz nicht. Das Eintauschen ist also das Sichern des Fortschritts
— und eine echte Entscheidung: weitersammeln für den großen Kristall, oder
lieber jetzt einlösen?

### Wer was fallen lässt

| Wer | Sicher | Mit Glück (etwa 10 %) |
| --- | --- | --- |
| Zombie, Skelett, Spinne, Glimmerling | nichts | trüber Kristall |
| Creeper, Ertrunkener, Hexe | trüber Kristall | klarer Kristall |
| Enderman, Plünderer, Verwüster | klarer Kristall | leuchtender Kristall |
| Wächter, Ältester Wächter, Warden | leuchtender Kristall | Sternenkristall |

Vier Stufen, nicht mehr. Jede Stufe ist ein eigener Gegenstand mit Textur,
Namen und Rezept; acht Stufen wären vor allem viel Arbeit.

**Nur Oberwelt, vorerst.** Der Nether kommt später; dann schiebt er sich
zwischen Stufe zwei und drei. Ozeanmonument, Plünderer-Außenposten und Deep
Dark liefern genug Abstufung, um ohne ihn auszukommen — und der Warden ist
auch ohne Nether ein würdiger Endgegner. Jede Dimension bringt eigene Mobs,
Biome und Spawn-Regeln mit; beides gleichzeitig anzufangen hiesse doppelt so
viele Stellen, an denen etwas schiefgeht, und nichts davon fertig.

Eigene Mobs entstehen aus demselben Grund erst einmal nur für die Oberwelt.
Der Glimmerling ist der erste davon. Er steht auf der untersten Stufe, wie
ein Skelett — den Sternenstaub lässt er weiterhin sicher fallen, der Kristall
kommt obendrauf. Dass ein harmloses Waldtier überhaupt Kristalle gibt, ist
vertretbar, weil es wegläuft: Einen Glimmerling zu erwischen kostet mehr
Mühe als einen Zombie, der von selbst angelaufen kommt.

Die schwachen Nachtmobs gehen absichtlich leer aus. Sonst baut man eine
Mob-Farm, geht Abendbrot essen und hat alle Fähigkeiten an einem Tag frei —
danach gibt es nichts mehr zu erreichen. So lohnt sich stattdessen der Weg in
gefährliche Gegenden.

Umgesetzt wird das über ein Skript, das auf den Tod eines Wesens reagiert —
nicht über achtzig einzelne Beutelisten. Das gilt dann automatisch auch für
Mobs, die Mojang später hinzufügt, und für unsere eigenen.

## In welcher Reihenfolge

Jede Stufe muss für sich funktionieren und spielbar sein.

1. Rollenmenü, Rolle merken, Startausrüstung
2. Die passiven Unterschiede: Tempo, Extraherzen
3. Mana als Text und **ein** einziger Zauber
4. Kristalle, Essenz, Eintauschen
5. Fähigkeiten kaufen, Stufen
6. Mehr Zauber, Abklingzeiten, später vielleicht die grafische Leiste

## Was nicht geht

Damit niemand später enttäuscht ist:

* **Keine eigenen Tasten.** Zauber laufen über Gegenstände oder Menüs.
* **Kein echtes Lebensmaximum.** Die Extraherzen des Ritters kommen über
  einen dauerhaften Effekt und haben eine etwas andere Farbe.
* **Keine neue Leiste im HUD ohne Umwege.** Siehe oben bei Mana.
* **Keine neuen Dimensionen.**
* **Auf Realms keine experimentellen Skript-Teile.** Die stabilen reichen für
  alles hier Beschriebene.
* **Erfolge sind aus**, sobald ein Verhaltenspaket aktiv ist.

## Der wunde Punkt

Skripte sind deutlich fehleranfälliger als die JSON-Dateien, aus denen das
Add-on bisher besteht. An denen lässt sich vieles vorher prüfen; ein Skript
muss laufen, um zu zeigen, dass es funktioniert. Laufen kann es nur bei Fynn.

Deshalb: erst muss das Grundpaket nachweislich im Spiel ankommen. Vorher
lohnt es nicht, hier anzufangen.
