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

## Bosse

Später, aber vorgesehen. Eigene Bosse mit echter Bossleiste oben am
Bildschirm: Name und Lebensanzeige, erscheint beim Näherkommen. Das ist in
Bedrock eingebaut (`minecraft:boss`) und kostet zwei Zeilen — `hud_range`
bestimmt die Entfernung, `should_darken_sky` verdunkelt den Himmel wie beim
Wither.

Beute: sicher mehrere Kristalle der obersten Stufe, dazu mit kleiner
Wahrscheinlichkeit ein besonderer Gegenstand. Dafür braucht die Beuteliste
zwei Töpfe — einen sicheren und einen seltenen.

**Beschworen, nicht gefunden.** Ein Boss, der frei in der Welt auftaucht, ist
entweder nie zu finden oder steht plötzlich im Dorf. Besser der Weg des
Withers: ein Bauwerk oder ein Ritual, das ihn ruft — bezahlt mit
Sternenkristallen. Dann bestimmt der Spieler den Zeitpunkt, kann sich
vorbereiten und den Kampf wiederholen, bis der seltene Gegenstand fällt. Der
Sternenkristall ist damit nicht nur Währung, sondern auch Schlüssel.

**Der Aufwand steckt nicht in der Leiste.** Die ist trivial. Ein Boss, der
sich wie einer anfühlt, braucht ein eigenes Modell mit Animationen,
Angriffsmuster, die länger als zwei Minuten tragen, und am besten mehrere
Phasen — ab der Hälfte anders kämpfen, Helfer rufen. Phasen gehen ohne
Skript; Minecraft kann Mobs mitten im Kampf umschalten. Trotzdem ist ein
guter Boss mehr Arbeit als zehn gewöhnliche Mobs.

## Strukturen in der Welt

Geht, und ist nicht mehr experimentell. Vier Teile: die Struktur wird im Spiel
gebaut und mit einem Strukturblock als `.mcstructure` gespeichert; die Datei
kommt ins Verhaltenspaket unter `structures/`; ein *Feature* sagt, was
platziert wird; eine *Feature Rule* sagt, wo und wie oft.

**Arbeitsteilung:** Fynn baut, Claude verdrahtet. Bauen lässt sich hier nicht
— ohne Spiel wäre eine Struktur nur blind zusammengerechnet. Im Spiel steht
sie in zehn Minuten und man sieht dabei, ob sie etwas taugt.

Was dabei zu beachten ist:

* **Nur neues Land.** Weltgenerierung greift ausschließlich in Gebieten, die
  noch nie erzeugt wurden. Zum Ausprobieren gehört eine frische Welt oder ein
  langer Marsch nach draußen.
* **Das Gelände passt sich nicht an.** Auf einem Hang steckt die Struktur halb
  im Berg oder schwebt. Ruinen, Türme und Bauten mit dickem Fundament
  verzeihen das; bei einer Ruine sieht schief sogar richtig aus.
* **Keine zusammengesetzten Dörfer** wie in der Java-Version. Die Struktur
  erscheint genau so, wie sie gespeichert wurde. Mehrere Varianten zur Auswahl
  gehen.
* **Truhen mit Inhalt** kann eine Struktur mitbringen — damit lassen sich
  Kristalle in Ruinen verstecken.

Klein anfangen: Ein kleiner Turm, der zuverlässig erscheint, ist mehr wert als
ein Dungeon, das an drei Stellen klemmt.

Naheliegende erste Kandidaten: der Altar, an dem der Boss beschworen wird, und
kleine Ruinen mit Kristalltruhen.

## Prüfungsspawner und Arenen

Der Prüfungsspawner aus den Prüfungskammern spuckt Wellen aus und gibt danach
Beute — von der Idee her genau das, was eine Arena braucht.

**Geht:** Den Mob eines Prüfungsspawners mit einem Spawn-Ei umstellen, auch
auf eigene Mobs. Eigene Wesen bekommen ihr Spawn-Ei automatisch.

**Geht nicht:** Das per Add-on festlegen. Die Einstellungen im Spawner
(`normal_config`, `ominous_config`) sind in Bedrock von aussen nicht
beschreibbar, anders als in der Java-Version. Die Prüfungskammern, die
Minecraft selbst erzeugt, behalten also ihre Vanilla-Mobs; jeder Spawner
müsste von Hand umgestellt werden.

**Geht wieder:** Die Belohnungen. Die Beutelisten der Tresore und Spawner
lassen sich im eigenen Paket überschreiben — dann liegen in allen
Prüfungskammern unsere Kristalle.

**Zu prüfen, sobald das Spiel läuft:** Ob ein Strukturblock die Einstellung
eines umgestellten Prüfungsspawners mitspeichert. Bei gewöhnlichen Spawnern
tut er das. Wenn ja, lässt sich eine eigene Arena bauen, deren Spawner die
eigenen Mobs ruft, und die dann überall in der Welt erscheint. Das wäre ein
lohnender früher Versuch.

**Rückfallweg:** Ein eigenes Wellensystem per Skript. Mehr Arbeit, dafür alles
selbst bestimmt — welche Mobs, wie viele, wie stark, welche Beute.

## In welcher Reihenfolge

Jede Stufe muss für sich funktionieren und spielbar sein.

1. Rollenmenü, Rolle merken, Startausrüstung
2. Die passiven Unterschiede: Tempo, Extraherzen
3. Mana als Text und **ein** einziger Zauber
4. Kristalle, Essenz, Eintauschen
5. Fähigkeiten kaufen, Stufen
6. Mehr Zauber, Abklingzeiten, später vielleicht die grafische Leiste
7. Der erste Boss, beschworen statt gefunden

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
