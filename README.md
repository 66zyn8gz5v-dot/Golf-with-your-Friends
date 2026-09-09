# Fantasy Golf – Golf with your Friends

Ein Minigolf-Spiel in 2,5D mit Fantasy-Welten, gebaut mit reinem HTML5-Canvas und JavaScript – ohne Build-Schritt und ohne Abhängigkeiten.

## Spielen

Einfach `index.html` im Browser öffnen (Chrome, Firefox, Safari, Edge – auch mobil).
Alternativ lokal über einen kleinen Server:

```bash
npx serve .          # oder: python3 -m http.server 8080
```

## Welten und Modi

Vom Titelbild führen zwei Wege: **🗺 Weltkarte** und **🛠 Bauen & Eigene Welt**.

Auf der **Weltkarte** liegt jede Welt als schwebende Scheibe in derselben 2,5D-Sicht wie das Spiel selbst: Blick schräg von oben auf eine um 45° gedrehte Welt, dieselbe Projektion wie im Renderer. Jede Scheibe hat darum eine Deckfläche im Karomuster und darunter zwei sichtbare Seitenflächen – die linke hell, die rechte im Schatten – mit Streiflicht an der Oberkante und dunkler Vorderkante. Darauf stehen die Bauten als echte Körper: Quader mit Deckfläche und zwei Seiten, Kegeldächer und Baumkronen aus vier Dreiecken, hell zur Sonne und dunkel zur Schattenseite, dazu Fahnen und Kontaktschatten. Die Reise geht von links (heller Tag im Märchenland) nach rechts (Nacht im Schattenreich): Himmelsverlauf vom Tag in die Nacht, Sterne, Sonnenstrahlen links, Blutmond rechts, ein scharfer Bergkamm mit Schneekappen und dahinter ein zweiter im Dunst, ziehende Wolken, ein gestrichelter goldener Weg über die Vorderkanten der Scheiben, schwebende Flocken, Nebelbänder und eine Randabdunklung. **Jeder Ort ist von Anfang an anwählbar – nichts muss freigespielt werden.** Die Stufe am Ort ist nur ein Hinweis darauf, was einen erwartet:

| Ort | Stufe | Bahnen |
| --- | --- | --- |
| Märchenland | Normal | 9 (Wiese, Pilzhain, Schmiede, Zauberwald, Drachenhöhle, Eisgrotte, Wolkenburg, Hexenturm, Burgberg) |
| Meereswelt | Normal | 10 auf See und am Meeresgrund |
| Tüftlerreich | Profi | 9 Bahnen quer durch neun Orte, jeder mit eigener Maschinerie: Windmühlen, Zwergenkanone, Uhrwerk, Magnete, Schrumpftrank |
| Dschungeltempel | Profi | 9 Bahnen durch den Urwald bis zur verlorenen Stadt |
| Sturmhimmel | Legende | 9 extra große Bahnen über den Wolken |
| Schattenreich | Legende | 10 extra große Bahnen im Reich der Schatten |
| Kolosseum | Legende | 3 Bahnen in der Arena (Anfang der Turnierbahnen) |

Nach dem Antippen eines Ortes folgt die Startaufstellung mit **Modus**, **Spielern**, **Hut**, **Musik** und **Steuerung**:

- **🏆 Wettkampf**: alle Bahnen der Welt der Reihe nach, mit Schlaglimit, Zwischen- und Endtafel, 1–4 Spieler im Hotseat.
- **🛠 Kreativ**: allein und ohne Schlaglimit; im Spiel mit „◀ Bahn" / „Bahn ▶" (Tasten P / N) frei springen, „Ball zurück" (R) setzt an den Abschlag. Gedacht zum Erkunden und zum schnellen Prüfen einzelner Bahnen.

### Hüte

Die vier Bälle sind weiß, grün, hellblau und gelb. Jeder Spieler sucht sich vor dem Spiel einen Hut für seinen Ball aus: **Krone**, **Zauberhut**, **Piratenhut**,
**Zylinder**, **Kappe**, **Wikingerhelm**, **Ritterhelm**, **Partyhut**, **Strohhut**, **Teufelshörner**,
**Blumenkranz** – oder **Ohne** für den blanken Ball. Die Vorschau in der Startaufstellung zeigt den Ball
gleich in der Farbe des jeweiligen Spielers; bei mehreren Spielern wird oben umgeschaltet, für wen gerade
gewählt wird. Die Wahl merkt sich der Browser, und in der Anzeigetafel steht neben jedem Spieler sein Hut.

Der **Ritterhelm** ist ein Sonderfall: er legt sich um den ganzen Ball, als wäre der Ball der Kopf, und trägt
einen Federbusch wie bei den Feldherren. Die beiden äußeren Federn nehmen die Farbe des Balls an (beim weißen
Ball Rot), die mittlere bleibt immer weiß.

Die Hüte werden in `src/hats.js` gezeichnet – reine Canvas-Pfade, keine Bilddateien. Ein neuer Hut braucht
nur eine Zeichenfunktion in `DEFS` und einen Eintrag in `LIST`; der Nullpunkt liegt auf dem Kopf des Balls,
eine Einheit entspricht dem Ballradius, und die Ballmitte liegt bei (0, 0.72). Wer die Spielerfarbe braucht,
nimmt sie als zweiten Wert der Zeichenfunktion entgegen.

## Rangliste

Über **🏆 Rangliste** im Startbildschirm: für jede Bahn und für jede ganze Runde, mit Namen dabei, in
**drei Wertungen**. Es gibt nichts auszuwählen – **alle drei laufen bei jedem Schlag gleichzeitig mit**,
und die Liste zeigt sie nebeneinander. Einmal den Namen eintragen, dann einfach drauflos spielen:

| Wertung | Was zählt |
| --- | --- |
| **🏆 Schläge** | Die wenigsten Schläge, wie beim Golf üblich. |
| **⏱ Zeit** | Wer ist am schnellsten durch? Die Uhr läuft, sobald der Ball auf dem Abschlag liegt, und stoppt beim Einlochen. |
| **⚡ Kombi** | Beides zusammen, gerechnet wie beim Speedgolf: **Schläge + Minuten**. Vier Schläge in 1:12 ergeben 4 + 1,2 = **5,2**. Wer trödelt, verliert – wer wild drauflos schlägt, aber auch. |

Wer einen Zeitrekord bricht, kann in derselben Bahn auch den Schläge- und den Kombi-Rekord holen – jede
Wertung wird einzeln geprüft, und die Meldung im Spiel nennt alle, die gefallen sind.

Die Uhr steht still, solange ein Menü offen ist oder die Seite im Hintergrund liegt – niemand soll dafür
bestraft werden, dass das Telefon klingelt. Die laufende Zeit steht während des Zugs oben rechts, die
Rekorde der Bahn (Schläge und Zeit) oben links. Auf der Ergebnistafel nach jeder Bahn steht die gebrauchte
Zeit je Spieler, im Endergebnis Gesamtzeit und Kombi-Wert.

Die Liste ist über alle Geräte gleich – bricht jemand einen Rekord, sehen die anderen es sofort, auch
mitten im Spiel („🏆 Lea: Elfenwiese – Zeit 0:41,2").

Einmal den eigenen Namen eintragen, mehr ist nicht nötig. Der Name gilt auch online: im Warteraum und auf
der Punktetafel steht dann er statt „Spieler 2". Gewertet wird **der eigene Ball im Wettkampf** – am Gerät
Spieler 1, online der eigene Platz. Der Kreativmodus zählt nicht, weil man dort beliebig oft neu setzen darf.

**Wie ehrlich ist die Liste?** Sie ist eine Anschreibetafel unter Freunden, kein Schiedsrichter. Es gibt
keinen Server, der mitrechnet: Jedes Gerät meldet sein Ergebnis selbst. Wer den Code des Spiels ändert,
kann melden, was er will. Damit man das einordnen kann, steht an jedem Eintrag, woher er kommt: **🌐**
heißt „in einer Runde gegeneinander erspielt" – da haben andere zugeschaut. Einträge ohne Zeichen sind
allein am eigenen Gerät entstanden. Derselbe Hinweis steht auch im Spiel über der Liste.

**Zurücksetzen – und wer das darf.** Zurücksetzen löscht alle Rekorde aller Welten, bei dir und bei allen
anderen. Nützlich, wenn jemand Ergebnisse eingetragen hat, die nicht stimmen. Genau deshalb darf es nicht
jeder: Sonst räumt der, der geschummelt hat, gleich hinterher die Spuren weg.

Darum **führt einer die Liste**. Unten in der Rangliste steht am Anfang **Liste führen**. Wer da zuerst
tippt, bekommt den Posten. Das Gerät legt dafür ein Schlüsselpaar an: Der öffentliche Teil geht als
aufbewahrte Nachricht an alle, der geheime Teil bleibt im Browser und wird nie verschickt. Ab dann steht
bei allen anderen nur noch „Zurücksetzen kann nur, wer die Liste führt" – der Knopf ist bei ihnen weg.

Ein Zurücksetzen wird mit dem geheimen Schlüssel **unterschrieben**. Jedes Gerät prüft die Unterschrift
gegen den öffentlichen Schlüssel und wirft alles weg, was nicht passt. Ein selbst gebasteltes
Zurücksetzen bewirkt darum nichts – auch nicht, wenn es direkt am Vermittler vorbeigeschickt wird. Wer
sich später selbst zum Listenführer erklären will, muss das mit dem Schlüssel des bisherigen unterschreiben;
ohne den bleibt der alte Listenführer stehen.

**Schlüssel sichern.** Der geheime Schlüssel liegt nur in diesem einen Browser. Löschst du die Daten der
Seite oder wechselst das Gerät, ist er weg – und niemand kann die Liste mehr zurücksetzen. Über
**Schlüssel sichern** kannst du ihn anzeigen und kopieren (etwa in eine Notiz); auf dem anderen Gerät
setzt du ihn über denselben Knopf wieder ein. Getrennt geführt werden Spiel und Vorschau: zwei Listen,
zwei Listenführer.

Das ist kein Schutz gegen jemanden, der den Code des Spiels ändert – er kann weiter eigene Ergebnisse
melden. Es verhindert nur, dass irgendwer die Liste für alle löschen kann.

Damit das hält, wird nicht nur gelöscht, sondern der **Zeitpunkt des Zurücksetzens geteilt**: Jedes Gerät
merkt ihn sich und wirft alles weg, was davor eingetragen wurde. Ohne diesen Kniff käme der alte Stand
vom nächsten Gerät sofort wieder zurück, denn jedes hält seine eigene Kopie und bietet sie an. Auch ein
Gerät, das erst Tage später wieder online geht, bringt die alten Rekorde nicht mehr mit. Zeitstempel, die
in der Zukunft liegen, werden auf „jetzt" gekappt – sonst würde ein gefälschter Eintrag jedes künftige
Zurücksetzen überleben.

**Grenzen der Glaubwürdigkeit:** Eine Bahn unter 2 Sekunden und eine ganze Runde unter 10 Sekunden werden
für Zeit und Kombi nicht gewertet – so schnell geht es nicht. Die Schläge zählen trotzdem. Das hält
niemanden auf, der den Code des Spiels ändert; es macht nur die einfachen Fälle unmöglich.

**Wo die Rekorde liegen:** als „aufbewahrte" MQTT-Nachrichten beim Vermittler. Eine Nachricht mit
Retain-Bit bleibt dort liegen und wird jedem zugestellt, der später zuhört – so gibt es eine gemeinsame
Rekordtafel ohne Server. Zusätzlich hält jedes Gerät eine eigene Kopie im Browser
(`fantasygolf.best`), damit die Liste auch ohne Verbindung sichtbar ist. Startet der Vermittler neu,
können die Rekorde dort verloren gehen; das nächste Gerät, das sich meldet, spielt seinen Stand wieder ein.
Der Code steht in `src/best.js`.

## Online gegeneinander

Über **🌐 Online spielen** im Startbildschirm treten bis zu vier Geräte in einem Raum gegeneinander an.
Einer macht den Raum auf und bekommt einen vierstelligen Zahlencode, die anderen tippen ihn ein
(auf dem Handy kommt dafür die Zifferntastatur). Der Gastgeber
wählt die Welt und startet; danach wird **reihum** gespielt: wer dran ist, zielt, die anderen sehen den
Schlag mitlaufen. Punktetafel und Bahnwechsel bleiben überall gleich, den Takt zwischen den Bahnen gibt
der Gastgeber vor. Jeder spielt mit seinem eigenen Hut, die Ballfarbe richtet sich nach der Sitzreihenfolge.

Wer den Raum verlässt oder die Verbindung verliert, wird nach gut zwanzig Sekunden bemerkt: sein Zug wird
mit dem Schlaglimit gewertet und die Runde läuft weiter. Geht der Gastgeber, endet der Raum für alle.
Eigene Bahnen lassen sich online nicht spielen, nur die sechs festen Welten.

**Wie es ohne eigenen Server geht:** Das Spiel liegt als reine Dateien auf GitHub Pages. Der Verkehr läuft
deshalb über einen offenen MQTT-Vermittler – jeder Raum ist ein Thema, in das alle schreiben und aus dem
alle mitlesen. Reihum gespielt sind das nur ein paar kurze Nachrichten je Bahn. Der Zugang steht in
`src/net.js` und ist von Hand geschrieben (MQTT 3.1.1, QoS 0), damit keine fremde Bibliothek dazukommt.
Wer dran ist, ist für seinen Zug die verbindliche Quelle: er sagt den Schlag an, die anderen spielen ihn
mit, und am Ende sagt er Ruheort, Schlagzahl und Ergebnis. Die Punkte können damit gar nicht
auseinanderlaufen, auch wenn unterwegs etwas verloren geht.

**Gleicher Takt für die beweglichen Sachen.** Windmühlen, Fähren, Drehkreuze und Tore richten sich nach
der Uhr der Physik. Die läuft auf jedem Gerät ab dem eigenen Seitenaufruf, stand also früher überall
anders – wer später dazukam, war Sekunden versetzt. Gerechnet wird zwar überall gleich (in der Physik
steckt kein Zufall), aber mit verschiedenem Takt fliegt derselbe Schlag woanders hin: Der Zuschauer sah
den Ball an einer Stelle abprallen, wo beim Schlagenden gerade nichts war, und beim nächsten Schlag
sprang der Ball plötzlich an eine ganz andere Stelle. Gezählt wurde trotzdem richtig – nur das Zuschauen
war unbrauchbar.

Darum schickt der Schlagende seine Uhr mit (`st` in der Nachricht), und die anderen stellen ihre danach,
bevor sie den Schlag nachspielen. Abgeglichen wird außerdem in den ruhigen Momenten – wenn ein Ball zur
Ruhe kommt und beim Bahnwechsel –, damit beim Schlag selbst gar kein Sprung mehr nötig ist. Zeitmarken,
die einen festen Zeitpunkt meinen („dieser Schalter hält das Tor bis Sekunde 42 offen"), werden um
denselben Betrag mitverschoben. Fehlt die Uhr in der Nachricht, weil das andere Gerät noch eine ältere
Fassung hat, bleibt alles wie vorher – es bricht nichts.

Die Rundenzeit für die Rangliste hängt nicht an dieser Uhr, sondern an einer eigenen; ein Abgleich kann
also keine Zeiten verfälschen.

Die Adresse des Vermittlers steht oben in `src/net.js` und lässt sich im Browser überschreiben, ohne am
Spiel etwas zu ändern:

```js
localStorage.setItem('fantasygolf.broker', 'wss://mein-vermittler:443/mqtt');
```

Online braucht Internet und funktioniert nur unter einer richtigen Adresse (etwa der GitHub-Pages-Seite),
nicht in einer abgeschotteten Vorschau.

Unter **Bauen & Eigene Welt** liegen der Editor und die selbst zusammengestellte eigene Welt. Neue Themenwelten werden in `WORLDS` (in `src/courses_pro.js`) eingehängt und bekommen in `src/worldmap.js` einen Ort auf der Karte.

## Steuerung

- Finger oder Maus aufsetzen, ziehen, loslassen. Je weiter gezogen wird, desto kräftiger der Schlag (Kraftanzeige unten).
- Steuerung im Startbildschirm wählbar: „Schleuder" (Standard, vom Ball wegziehen) oder „Schieben" (in Schussrichtung ziehen).
- `Esc` bricht das Zielen ab; ohne begonnenen Zug führt `Esc` aus der Runde heraus.
- Unten im Startbildschirm steht klein die **Fassung** (eine Zahl). Zeigt ein Gerät eine ältere Zahl als ein anderes,
  hält es noch einen alten Stand fest: die Seite einmal im Browser öffnen und neu laden. Ist eine neue Fassung da,
  lädt das Spiel sie im Startbildschirm von selbst nach – nie mitten in einer Runde.
- Die Tastenkürzel gelten nur außerhalb von Eingabefeldern. Wer seinen Namen, einen Raumcode oder einen Bahnnamen
  eintippt, schaltet mit dem „f" in „Fynn" also nicht das Vollbild um.
- **◀ Weltkarte** unten links verlässt die laufende Runde – der Weg zurück, wenn man in der falschen Welt gelandet ist.
  Ist schon etwas gespielt, wird vorher gefragt, denn der Punktestand der Runde geht dabei verloren; ganz am Anfang geht es ohne Rückfrage.
  Auch die Ergebnistafel nach jeder Bahn hat den Knopf. Bei einer eigenen Welt führt er zurück zu **Bauen & Eigene Welt**,
  beim Probespielen aus dem Editor bleibt es beim gewohnten „🛠 Editor“.
- Kamera: folgt dem Ball und blickt Richtung Loch. Tasten unten links oder Tastatur:
  `M` Übersicht der ganzen Bahn, `Q`/`E` drehen, `+`/`-` oder Mausrad zoomen.
  Die Neigung richtet sich nach dem Bildschirm: hochkant (Handy) bleibt die Sicht flach,
  quer auf Tablet oder Laptop wird sie steiler, damit das Feld nicht platt gedrückt wirkt.
- Hut des eigenen Balls: in der Startaufstellung unter „Hut". Die Wahl merkt sich der Browser.
- Die Bedienknöpfe (Zurück, Kamera, Zoom, Musik, Vollbild, Menüs, Editor-Werkzeuge) nutzen Material Symbols von Google,
  als SVG-Pfade in `src/icons.js` eingebettet – überall gleich, in der Textfarbe, ohne Schriftart aus dem Netz.
  Welten, Bahnen, Hüte und Rekordmeldungen behalten bewusst ihre bunten Zeichen: dafür hat kein Bedien-Icon-Satz Motive.
- Online gegeneinander: **🌐 Online spielen** im Startbildschirm, Raumcode aufmachen oder eintippen.
- Rekorde: **🏆 Rangliste** im Startbildschirm, einmal den eigenen Namen eintragen. Drei Wertungen: Schläge, Zeit und Kombi (Schläge + Minuten).
- Zurücksetzen darf nur, wer die Liste führt: einmal unten in der Rangliste auf **Liste führen** tippen, dann den Schlüssel über **Schlüssel sichern** wegkopieren.
- Musik an oder aus: Knopf `♪` unten links oder Taste `J`; im Startbildschirm auch unter „Musik". Die Wahl merkt sich der Browser.
- 1–4 Spieler im Hotseat-Modus: Jeder spielt die Bahn nacheinander zu Ende.
- Wasser, Lava und Abgrund: Ball zurück zur letzten Position, +1 Strafschlag.
- Schlaglimit: 15 Schläge pro Bahn, lange Bahnen erlauben mehr (Burgberg 25, Hexenturm und Zwergenschmiede 20, Wolkenburg und Drachenhöhle 18). Danach wird die Bahn mit dem Limit gewertet.

## Die Bahnen der Normal-Welt

| # | Bahn | Par | Hindernisse |
|---|------|-----|-------------|
| 1 | Elfenwiese | 3 | Steinpfeiler, Hecken |
| 2 | Pilzhain | 3 | federnde Riesenpilze, Sandkuhlen |
| 3 | Zwergenschmiede | 4 | zwei Lavaschluchten, zwei Loren als Fähren mit unterschiedlichem Takt: rechtzeitig hineinrollen, sie setzen den Ball drüben ab |
| 4 | Zauberwald | 3 | Portale zwischen Inseln, ein Fallen-Portal |
| 5 | Drachenhöhle | 4 | Sand, Lavabecken, Sprungschanze über die Mauer, patrouillierender Drache vor dem Loch |
| 6 | Eisgrotte | 3 | spiegelglattes Eis, Wassertümpel, rotierender Kristallstern |
| 7 | Wolkenburg | 4 | schwebende Inseln, breite Wege mit schrägen Banden in den Kurven, Rückenwind, Fallgatter |
| 8 | Hexenturm | 5 | Lava, Eis, Fallgatter, rotierender Besen, wandernde Kessel, Portal-Abkürzung, Aufwind |
| 9 | Burgberg | 5 | Serpentinen mit Steigungen, patrouillierende Ritter, Burggraben mit Zugbrücke, die Burg vom Startbildschirm |

## Die Bahnen der Meereswelt

Abwechselnd über und unter Wasser: Bahnen auf See spielen in der Piratenbucht-Welt (`harbor`) oder auf dem Piratendeck (`deck`), Bahnen am Meeresgrund im Korallenriff (`reef`) oder im Schiffswrack (`wreck`).

| # | Bahn | Par | Hindernisse |
|---|------|-----|-------------|
| 1 | Strandbucht | 3 | Sandstrand, Holzsteg, zwei Felsen als Bumper, Gezeitentümpel vor dem Loch |
| 2 | Muschelriff | 3 | zwei Tiefseeschluchten mit schmalem Grat dazwischen, Strömungen nach oben und unten, Korallen-Bumper |
| 3 | Fischerpier | 4 | Ruderboot-Fähre zwischen zwei Stegen, rollendes Fass auf dem zweiten Steg |
| 4 | Krakengrotte | 3 | Krake mit drei kreisenden Fangarmen (Rotor), Bremskoralle vor dem Loch |
| 5 | Piratendeck | 3 | zwei Schiffe mit Höhenstufen: Planken hinauf zum Bug, Kanone schießt aufs Nachbarschiff, rollendes Fass, schwingende Rah, Hai im Wasser |
| 6 | Leuchtturmfelsen | 5 | Serpentinen mit drei Höhenstufen und schrägen Banden in allen Kehren, Gegenwind auf der zweiten Kehre, oben ein zwei Kacheln breiter Sims mit Geländer auf der Bergseite, an dem der Wind den Ball zur Klippe drückt |
| 7 | Schiffswrack | 6 | zweiteilige Bahn: über den Meeresgrund an Strömung und Hai vorbei durch das breite Leck ins Wrack; drinnen hängt das Deck schief (Dauergefälle), Fässer rollen, eine breite Luke schließt sich alle paar Sekunden, ein kleiner Krake bewacht das Loch |
| 8 | Perlengrotte | 5 | langer Weg mit Korallen- und Felsen-Bumpern, dann treibt die Strömung in den Strudel, der Strudel wirft den Ball in die Zauberperle; wer sie berührt, trägt den Perlenfluch (Ball bleibt bis zum Loch träge), Bremskoralle |
| 9 | Sturmsee | 5 | drei Inseln: Ruderboot-Fähre, Mittelinsel mit Wind und einer Welle, die den Ball mitspült (schnelle Bälle rollen hindurch), Piratenschiff zum Leuchtturmfelsen |
| 10 | Haifischbucht | 8 | die große Überfahrt: Hafensteg mit Fass, Ruderboot zum Windsteg mit Böen, Rampe über die Haibucht, in der ein Hai im Takt springt (wer im falschen Moment fliegt, wird gefressen: Strafschlag und zurück), Welleninsel mit Welle und Wind, Steg mit Fallgatter, Piratenschiff zur Leuchtturminsel mit schwingender Rah |

## Die Bahnen des Tüftlerreichs

| # | Bahn | Par | Hindernisse |
|---|------|-----|-------------|
| 1 | Mühlenwiese | 4 | Windmühle mit schmaler Tür, Sand |
| 2 | Nebelmoor | 4 | breiter Fluss, Rampensprung ans andere Ufer, Windmühle als Tor zum Loch, Eis |
| 3 | Zwergenkanone | 4 | schwenkende Kanone, die den Ball über den Lavasee schießt (Timing!), zwei Pendel |
| 4 | Korallenriff | 3 | Sandiger Meeresgrund mit Tiefseeschlucht und drei Zauberkorallen: rot zieht an, grün stößt ab, blau bremst |
| 5 | Uhrwerk | 4 | eigene Uhrwerk-Welt aus Messing und Zahnrädern, zwei Zahnrad-Drehscheiben, die den Ball mitnehmen und an der Rinne auswerfen, Fallgatter |
| 6 | Piratenbucht | 6 | Meer ringsum: Steg, Ruderboot-Fähre, Felseninsel mit Rampe zur Festung, rollende Kanonenkugel, Piratenschiff über die Bucht, Rampe zum Leuchtturm mit dem Loch |
| 7 | Hexenküche | 6 | zweiteilige Bahn: durch den Hexengarten in die Hexenhütte (eigene Innen-Map), dort über eine Rampe in den Hexentopf – der Ball schrumpft 20 s und passt durch den Spalt zum Loch |
| 8 | Sultanspalast | 6 | Zikkurat in der Wüste: drei Terrassen mit Höhenstufen, nur über Rampen erreichbar, Palastwachen, Wüstenwind, Mühle, Fallgatter zur obersten Terrasse |
| 9 | Pyramide | 7 | zweiteilige Bahn: Serpentinenweg durch die Wüste an der Oase vorbei (Wüstenwind) zum Eingang der Stufenpyramide; drinnen die große Grabkammer mit Höhenstufen: Treppenrampen, Katapult über den Grabschacht (Timing wie die Kanone), Sprung über den Spalt, Pendelbalken, rollender Felsbrocken, Steintor und die Kammer mit dem Loch ganz oben |

Oben in der Mitte gibt es **⛶ Vollbild** (Taste F): das Spiel füllt den ganzen Bildschirm. Läuft das Spiel in einem Rahmen, der kein Vollbild erlaubt, wird es stattdessen in einem eigenen Fenster geöffnet.

## Die Bahnen des Dschungeltempels

Zweite Welt der Stufe Profi, in einem Guss: Urwald mit Moosstein, Lianen, Treibsand, trübem Fluss und Steingötzen (`jungle`), zum Schluss die Tempelhalle mit Fackeln, Glyphen und Feuergruben (`temple`).

| # | Bahn | Par | Hindernisse |
|---|------|-----|-------------|
| 1 | Urwaldpfad | 4 | pendelnde Liane, Treibsand, Steingötze als Bumper, schräge Bande |
| 2 | Affenbrücke | 5 | Hängebrücke ohne Geländer über den Fluss, zwei Affen werfen Kokosnüsse quer über den Platz |
| 3 | Krokodilfluss | 3 | Rampe über den Fluss, ein Krokodil schnappt im Takt nach allem, was darüber fliegt (Strafschlag), Treibsand, Götze |
| 4 | Stachelpfad | 4 | drei Stachelfallen, die im Takt aus dem Boden schießen und den Weg versperren; wer auf einer Platte liegen bleibt, wird aufgespießt; die zwei Platten der ersten Geraden sind so getaktet, dass ein gut getimter Schlag beide passiert; Banden in den Kehren |
| 5 | Felskugelschlucht | 4 | enge Schlucht mit rollender Felskugel, Nischen zum Ausweichen |
| 6 | Treibsandbecken | 4 | schmaler Steinpfad durch Treibsand, Liane, Kokosnuss, Banden in den Kehren |
| 7 | Totemplatz | 4 | zwei drehende Totempfähle, Druckplatte öffnet das Steintor zur Lochkammer für kurze Zeit |
| 8 | Wasserfallterrassen | 4 | drei Terrassen mit Höhenstufen und Wasserfällen, Rampen bergab, Banden, Kokosnuss |
| 9 | Der Tempel | 8 | zweiteilige Bahn: Hängebrücke, Stachelfallen, Schlucht mit Felskugel, Tempeltor; drinnen die Tempelhalle mit Feuergruben, Stachelfalle, Steinscheibe, Felskugel, Druckplatte und Steintor zum goldenen Götzen |

## Die Bahnen des Sturmhimmels

Erste Welt der Stufe Legende: schwebende Felsinseln in einer Gewitternacht (`storm`), zum Schluss die Sturmhalle der Festung mit Bannern, Blitzfenstern und blauen Feuerschalen (`fortress`). Alle Bahnen sind extra groß, der Abgrund ringsum kostet einen Strafschlag.

| Nr. | Bahn | Par | Besonderheit |
|---|---|---|---|
| 1 | Inselsprung | 4 | drei Inseln, zwei Aufwinde tragen den Ball in Rollrichtung über die Schlucht, Blitzfeld auf der Mittelinsel, Propeller, Blitzkugel |
| 2 | Ballonfahrt | 6 | zwei Heißluftballon-Fähren, dazwischen eine Insel mit Böen und einer patrouillierenden Gewitterwolke |
| 3 | Blitzfeld | 5 | vier versetzt schlagende Blitzfelder auf einer langen Insel, Knick mit Banden, Propeller vor dem Loch |
| 4 | Windbrücke | 5 | zwei Hängestege ohne Geländer mit Böen quer zur Laufrichtung, Insel mit Blitzfeld dazwischen |
| 5 | Luftschiffwerft | 6 | schwenkende Werftkanone über die Schlucht, Luftschiff-Fähre zur Zielinsel, Fallgitter und Propeller vor dem Loch |
| 6 | Wolkenschlucht | 5 | Aufwind auf die große Mittelinsel, Wirbelsturm fängt langsame Bälle und schleudert sie nach Süden, zweiter Aufwind zur Zielinsel |
| 7 | Gewitterkessel | 5 | Ringarena um den Kessel: zwei Gewitterwolken laufen um, vier Blitzfelder schlagen versetzt ein, Loch in der Nordnische |
| 8 | Sturmpfad | 6 | langer Grat hin und zurück, geländerlose Abschnitte mit Böen, Banden an den Kehren, Blitze, Propeller |
| 9 | Sturmfestung | 9 | zweiteilige Bahn: Aufwind, Ballon, Gewitterwolke, Felsrampe mit Gegenwind zum Tor; drinnen die Sturmhalle mit Propellern, Blitzfeldern, Druckplatte und Fallgitter und der Sturmkanone zurück zum Loch |

## Die Bahnen des Schattenreichs

Zweite Welt der Stufe Legende und die schwerste: zehn Bahnen mit schmalen Wegen (zwei bis drei Kacheln), Höhenstufen und Stegen ohne Geländer; Friedhöfe unter blutrotem Mond, Aschegrund, Schattenfeuer statt Lava (`shadow`), der Totensee (`darksea`) und der Thronsaal (`throne`). Gefahren: **Fallbeile** (Klinge wird langsam hochgezogen und knallt schlagartig herunter – wer dann darunter liegt, wird geköpft: Strafschlag, zurück), **Rabenschwärme** (fliegen wie Wellen ihre Bahn und nehmen den Ball mit – Timing!), **verfluchte Ritterstatuen** (erwachen im Takt, ein Schwerthieb belegt den Ball mit dem Ritterfluch: träge bis zum Loch), der **Turm des Auges** (das brennende Auge dreht seinen Lichtkegel – wer darin liegen bleibt, wird erblickt: Strafschlag, zurück), **Knochenrampen** (Sprung über Feuergruben – nur mit Schwung), die **Riesenfledermaus** (lauert am Rand ihres Jagdgrunds und schießt im Takt von der Seite quer über die Lücke – wer dann darüber fliegt, wird gepackt: Strafschlag, zurück; wie Hai und Krokodil), der **Basilisk** (die Riesenarmbrust des Schattenreichs: rollt der Ball in ihre Rinne, wird die Sehne gespannt und er wird weit übers Feld geschossen – der Schaft pendelt), **Sargfähren** über den Totensee, **dunkle Tentakel**, **Sensen**, **Geister** und **Schattenportale**. Zum Ausgleich sind die Löcher im Schattenreich größer und ziehen den Ball stärker an (`cupR`, `cupPull` je Bahn).

| Nr. | Bahn | Par | Besonderheit |
|---|---|---|---|
| 1 | Friedhofspforte | 3 | schmaler Friedhofsweg mit zwei Kehren, Rabenschwarm trägt über die erste Gerade, Geist, Fallbeil im Tor |
| 2 | Knochensteg | 4 | zwei Kacheln breite Knochenstege ohne Geländer über den Feuerstrom, Knochenstacheln, Sprung über die Lücke mit Riesenfledermaus |
| 3 | Fallbeilgasse | 4 | schmale Gasse, die über zwei Rampen drei Stufen hinaufsteigt, drei Fallbeile, Feuergrube mit Sprung und Fledermaus |
| 4 | Rabenschlucht | 4 | hoher Grat ohne Geländer, drei Rabenschwärme wehen quer dazu, Gruftblöcke als Deckung, eine Stufe hinab zur Felsplatte mit Ritter und Loch |
| 5 | Ritterhalle | 6 | drei schmale Gänge im Zickzack zwischen Säulenreihen, vier verfluchte Ritter in Nischen, Geist, Fallgatter, Augenbumper, Fallbeil vor dem Loch |
| 6 | Totenfähre | 6 | Inseln im Totensee, zwei Sargfähren im Takt, dunkle Tentakel, Steg ohne Geländer mit Rabenschwarm |
| 7 | Turm des Auges | 5 | schmaler Weg, der sich in drei Stufen um den Augenturm hinaufwindet; Gruftblöcke als Deckung, Fallbeil, Geist – nie im Licht liegen bleiben |
| 8 | Schattenschloss | 8 | zweiteilig: Zugbrücke (Rampe) über den Graben mit Fledermaus, Torhaus mit Fallgatter, Burghof um den Bergfried mit Feuergraben, Rampe, Fledermaus, Rittern, Geist; hinter dem schwarzen Tor der Thronsaal: Kerkergang mit Sense und Fallbeil, der Basilisk schießt den Ball hinauf auf die Empore |
| 9 | Gruft der Sensen | 5 | schmale Gruftgänge: Sensen quer, Schattenportal, Fallbeil, Knochenstacheln, Druckplatte hebt das Fallgatter vor der Grabkammer, Geist |
| 10 | Herz der Finsternis | 9 | zweiteilig: Abstieg von der schwarzen Zinne über drei Stufen (Raben auf dem Grat, Fallbeil am Steg, Sprung mit Fledermaus), unten schießt der Basilisk über den Totensee ins Wrack; drinnen drei Gänge im Zickzack hinauf, das brennende Auge in der Mitte, Sensen, Druckplatte und Fallgatter vor dem Loch |

## Kostenlos als App aufs iPad oder Handy (GitHub Pages)

Das Spiel ist eine Web-App: Manifest (`manifest.webmanifest`), App-Symbole (`icons/`) und ein Service Worker (`sw.js`) sorgen dafür, dass es sich wie eine App installieren lässt und offline läuft. Der Workflow `.github/workflows/pages.yml` veröffentlicht bei jedem Push automatisch auf GitHub Pages.

Einmalig einrichten (auf github.com im Repository):
1. **Settings → General → Danger Zone → Change visibility → Public** (GitHub Pages ist nur bei öffentlichen Repositories kostenlos).
2. **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.
3. Reiter **Actions** → Workflow „Fantasy Golf auf GitHub Pages“ → **Run workflow** (oder einfach den nächsten Push abwarten).

Danach ist das Spiel unter `https://66zyn8gz5v-dot.github.io/Golf-with-your-Friends/` erreichbar. Auf dem iPad in Safari öffnen, **Teilen → Zum Home-Bildschirm**: Es erscheint ein Symbol, das Spiel startet im Vollbild und funktioniert auch ohne Internet. Updates kommen automatisch beim nächsten Start mit Verbindung.

## Baumodus (eigene Bahnen im Spiel bauen)

Im Kreativmodus gibt es **Bahn bauen**: ein Editor direkt im Spiel. Kacheln (Rasen, Sand, Eis, Wasser,
Lava, Block, Klippe, Leer) werden durch Tippen oder Ziehen gemalt, Abschlag und Loch per Werkzeug
gesetzt. Gebaut wird in der Draufsicht (umschaltbar auf Schrägsicht), das Panel lässt sich einklappen und
ist in die Reiter **Bauen** (Boden, Abschlag/Loch, Hindernisse, Höhenstufen), **Bahn** (Name, Par, Welt,
Kartengröße) und **Speichern** (Speichern, Laden, Bahn-Code, Weitergeben) aufgeteilt. **Testen** spielt
die Bahn sofort probe, danach geht es zurück in den Editor. **Fertig** speichert sie und öffnet die
**Eigene Welt**: dort wird die Bahn per **Einsetzen** an einer wählbaren Stelle eingefügt, die Reihenfolge
lässt sich mit den Pfeilen ändern, das Kreuz nimmt eine Bahn wieder heraus. Die Eigene Welt erscheint im
Kreativmodus als eigene Welt und wird in dieser Reihenfolge gespielt. Gespeichert wird im Browser;
**Exportieren** liefert den Bahn-Code als Text, **Importieren** liest ihn wieder ein – zum Weitergeben
gibt es zusätzlich **Teilen** und **Link kopieren** (siehe „Bahnen weitergeben"). Der Editor steckt in
`src/editor.js`.

**Alle 24 Hindernisse** stehen zur Verfügung – auch die der Stufe „Legende", die vorher nur in den
gebauten Welten vorkamen: Pilz, Windrad, Fallgatter, Lore, Windfeld, Sprungrampe, Beschleuniger,
Windmühle, Kanone, Magnet, Drehscheibe, Schrumpftrank, **Fähre, Schiene, Welle, springender Hai,
Stacheln, Aufwind, Blitz, Fallbeil, Turm des Auges, Schalter**, Portal und Bande (die letzten beiden
werden mit zwei Tippern gesetzt). Sie kommen mit denselben Werten wie in den gebauten Welten, damit sie
sich gleich anfühlen; **Drehen** ändert je nach Objekt die Richtung, die Achse, das Vorzeichen oder das
Ziel, **Löschen** entfernt das Objekt in der Nähe. Unter der Auswahl steht immer ein Satz dazu, was das
gewählte Objekt tut.

**Höhenstufen** gibt es ebenfalls: **Höher**, **Tiefer** und **Stufe weg** heben und senken den Boden
kachelweise, die **Stufenhöhe** wechselt zwischen flach (0,3), mittel (0,5) und steil (0,8). Der Ball
rollt Hänge hinunter, wie in den Bahnen des Schattenreichs. Damit man von oben nicht blind malt, zeigt
der Editor jede Stufe als Ziffer und Tönung. Das Raster liegt als Ziffernzeilen (`heights`) über der
Karte, wird beim Ändern der Kartengröße mitgezogen und kommt nur dann in die Bahn, wenn wirklich Stufen
gemalt sind.

Was der Editor weiterhin nicht baut: Innenräume (Bahnen mit zweiter Karte, wie Pyramide oder
Schattenschloss) und die Tür dorthin. Solche Bahnen lassen sich deshalb auch nicht teilen.

## Eigene Bahnen im Code bauen

Bahnen stehen in `src/courses.js` (Märchenland), `src/courses_sea.js` (Meereswelt), `src/courses_colosseum.js` (Kolosseum) und `src/courses_pro.js` (Tüftlerreich) als ASCII-Karte plus Hindernisliste. Die Liste `WORLDS` in `src/courses_pro.js` registriert die Welten für die Weltkarte; `mode` (`normal`, `pro`, `legend`) steht dort nur noch als Schwierigkeitshinweis am Ort, gespielt werden kann jede Welt von Anfang an.

```
.  Leere / Abgrund     #  Fairway      s  Sand      i  Eis
w  Wasser              l  Lava         x  Steinblock
o  Fairway ohne Randmauer (Klippe)
T  Abschlag            H  Loch
A B C  Eingang eines Löwentors   a b c  der zugehörige Ausgang
```

Pro Bahn lässt sich die Bremsung eines Untergrunds überschreiben, z. B. `friction: { s: 32 }` für besonders tiefen Sand.

Blickzonen: Über `views` (Rechtecke mit `look`-Punkt) kann eine Bahn festlegen, wohin die Kamera schaut, solange der Ball in der Zone liegt, etwa auf eine Mühlentür oder eine Fähre statt aufs Loch.

Höhenstufen: Eine Bahn kann ein Ziffernraster `heights` (0–9) und `hStep` angeben. Stufen sind nur über `field`-Rampen mit `base`/`rise` zu erklimmen, Kanten nach oben wirken sonst wie Mauern; nach unten rollt der Ball frei.

Hindernis-Typen: `lightning` (Blitzfeld `w`×`h`: `warn` Sekunden Knistern, dann `strike` Sekunden Einschlag je `period`; wer dann in der Zone ist, auch fliegend, kassiert einen Strafschlag zurück zum Schlagstart), `updraft` (Aufwind-Zone: ein Ball mit mindestens `minSpeed` wird in Rollrichtung `land` Kacheln weit geflogen, Flugtempo `fly`), `trapdoor` (Falltür `w`×`h`, offen für den `open`-Anteil der `period`; wer darüberrollt oder darauf liegt, stürzt: Strafschlag zurück zum Schlagstart), `field` mit `style: 'dark'` (Schattenzone: der Ball ist darin fast unsichtbar), `bumper` (`style`: `mushroom`, `rock`, `crystal`, `coral`, `idol`, `orb`, `grave`, `eye`), `mover` (`style` u. a. `cart`, `chariot` (Streitwagen – dieselbe Lore, nur anders gezeichnet), `cannonball`, `boulder`, `barrel`, `shark`, `wave`, `dragon`, `knight`, `guard`, `coconut`, `ghost`, `bat`, `stormcloud`), `ferry` (`style`: `cart`, `boat`, `ship`, `balloon`, `airship`), `wave` (wandernde Welle, keine Mauer: schiebt einen ruhenden oder langsamen Ball mit `push` in ihrer Laufrichtung mit; ein schnellerer Ball bricht hindurch und behält dabei nur den Anteil `brake` seines Tempos), `spikes` (Stachelfalle: Platte `w`×`h`, Stacheln sind `up`-Anteil der `period` draußen und blockieren dann wie eine Mauer; ein Ball, der auf der Platte liegt, wenn sie hochkommen, wird aufgespießt: Strafschlag und zurück zum Start des letzten Schlags), `sharkjump` (Hai, der im Takt `period` quer über eine Bucht springt; `style: 'croc'` zeichnet ein Krokodil und einen Ball frisst, der währenddessen über die Zone fliegt; Fressen kostet einen Strafschlag – eine `inner`-Map mit `stomach: true` würde den Ball stattdessen dorthin schicken), `rotor` (auch als Pendel mit `swing`; `style: 'tentacle'` macht daraus eine Krake, `style: 'vine'` eine Liane), `windmill`, `gate` (periodisch oder mit `linked` an einen Schalter gekoppelt), `portal`, `boost`, `field`, `ramp`, `rail`, `wall`, `cannon` (schwenkende Kanone, `base`/`amp`/`speed`/`range`; `style: 'catapult'` zeichnet ein Katapult), `magnet` (`strength` > 0 zieht an, < 0 stößt ab, `slow` bremst; `style: 'coral'` zeichnet eine Koralle, `style: 'pearl'` eine Perle; `curse: 2.0` macht den Ball nach Berührung für den Rest der Bahn träge), `turntable` (Drehscheibe mit Auswurfrinne `exit` in Grad; `style: 'whirl'` zeichnet einen Strudel), `field` (`style`: `wind`, `current` für Unterwasser-Strömung, `slope` für Rampen zwischen Höhenstufen; `gust` macht aus Dauerwind Windstöße), `potion` (Schrumpftrank, `scale`/`duration`), `cauldron` (Hexentopf: nur aus der Luft zu treffen, schrumpft und spuckt Richtung `exit` aus), `switch` (Druckplatte, `target`/`duration`), `door` (Tür in die Innen-Map `inner` einer Bahn; `style: 'pyramid'` mit `px`/`py`/`base` zeichnet eine Stufenpyramide um die Tür, `style: 'wreck'` mit `px`/`py` ein Schiffswrack, dessen Leck die Tür ist, `style: 'temple'` ein Tempeltor).
**Löwentor** (`liongate`): das einzige Hindernis, dessen Plätze nicht in der Hindernisliste stehen,
sondern als Buchstaben in der Karte. Der Großbuchstabe ist der Eingang, der gleiche Kleinbuchstabe der
Ausgang – `A`/`a`, `B`/`b`, `C`/`c`, mehrere Paare je Bahn erlaubt. In der Hindernisliste steht je Paar
nur `{ type: 'liongate', pair: 'A', angle: 0 }`: `angle` (Grad, wie bei Rampe und Beschleuniger) sagt,
in welche Richtung der Ausgang ausspuckt.

Berührt ein Ball den Eingang mit mindestens `LOEWENTOR_TEMPO`, verschwindet er und kommt am Ausgang
wieder heraus – immer mit `LOEWENTOR_AUSWURF` in die eingestellte Richtung, ganz gleich wie schnell er
hineinrollte. Damit bleibt planbar, wo er landet. Ist er langsamer, sperrt eine Wand quer vor der
Toröffnung und er prallt ab. Beide Werte stehen als benannte Konstanten oben in
`src/obstacles_legend.js` und lassen sich dort nachjustieren.

Der Eingangsbuchstabe ist begehbarer Boden (er steht dafür in `FLOOR_CHARS`), der Ausgang bewusst
nicht: Als Nicht-Boden zieht die Bahnmauer von selbst eine Wand davor, und genau das soll ein Ausgang
von außen sein – massiv. Der Ball wird deshalb nicht *in* den Ausgang gesetzt, sondern eine knappe
Kachel davor. Bleibt ein Ball doch einmal im Torbogen liegen (hineingefallen, hineingeschoben), schiebt
das Tor ihn sanft entgegen seiner Anfahrt wieder heraus.

`node tools/validate.mjs` prüft die Tore mit: ein Buchstabe ohne Gegenstück, derselbe Buchstabe mehrmals
auf einer Karte oder ein Ausgang ohne Auswurfrichtung sind Fehler.

### Musik

Jede Welt hat einen eigenen, endlos weiterlaufenden Klangteppich – vollständig mit WebAudio erzeugt, ohne eine einzige Audiodatei (die App bleibt klein und offline spielbar). Pro Takt erklingen ein Flächenakkord aus drei Tönen, ein Bass auf dem Grundton, gezupfte Melodietöne aus der Tonleiter des gerade klingenden Akkords und je nach Welt eine Trommel, eine Rassel oder eine Glocke; ein Echo legt sich darüber. Die Akkorde wandern Takt für Takt durch eine kurze Wendung. Märchenland klingt in Dur und hell, die Meereswelt dorisch und wiegend, das Tüftlerreich in Moll mit ruhigem Puls, der Dschungeltempel pentatonisch mit Rahmentrommel, der Sturmhimmel weit mit tiefer Pauke, das Schattenreich phrygisch mit ferner Grabglocke. Beim Weltwechsel blendet der alte Klang aus und der neue auf; im Hintergrundtab schweigt die Musik. Die Paletten stehen in `src/music.js`.

Farbwelten stehen in `src/themes.js`, jede mit einer dezenten Atmosphäre (`atmo`: `fog`, `mist`, `fireflies`, `spores`, `embers`, `sparks`, `ash`, `bubbles`, `sand`, `spray`, `snow`, `pollen`, `none`), die eine Bahn per `atmo` überschreiben kann. Mit `node tools/validate.mjs` lässt sich prüfen, ob jede Bahn lösbar ist; `node tools/audit/audit.mjs <welt|all> [Bahn]` spielt jede Bahn headless durch (Profi-Suche, simulierte Normalspieler mit Streuung, Prüfung von Engstellen, Zeitfenstern und Kamerazonen) und schreibt Ergebnisse nach `out/`.

## Bahnen weitergeben

Selbstgebaute Bahnen lassen sich auf zwei Wegen weitergeben – beide im Editor unter **Speichern**:

**Teilen.** Ein Tipp auf **🌐 Teilen**, und die Bahn erscheint bei allen, die das Spiel haben, unter
**Bauen & Eigene Welt** in der Liste **„Bahnen von Freunden"**. Dort steht neben jedem Eintrag, von wem
er stammt; ein Knopf spielt die Bahn einmal, der andere lädt sie in den Editor. Kein Code, kein
Einrichten – da nur der Freundeskreis das Spiel hat, bleibt es unter euch. **Nicht mehr teilen** nimmt
die Bahn wieder heraus, und sie verschwindet bei allen.

Höchstens 12 Bahnen je Gerät und 60 in der Liste, damit sie übersichtlich bleibt. Geteilte Bahnen liegen
als aufbewahrte Nachrichten beim Vermittler, genau wie die Rekorde – startet er neu, bietet jedes Gerät
seine Bahnen von selbst wieder an.

**Link kopieren.** Macht aus der Bahn eine Adresse zum Verschicken. Wer sie antippt, bekommt die Bahn
angeboten: gleich spielen, zu den eigenen Bahnen legen oder im Editor öffnen. Das braucht keine
Verbindung zum Vermittler. Die Bahn steckt gepackt im Link (`CompressionStream`, wo der Browser ihn hat),
was ihn etwa um zwei Drittel kürzt – eine große Bahn wie die Haifischbucht kommt so auf rund 1400
Zeichen statt 4200.

**Geprüft, bevor sie ins Spiel kommt.** Egal ob Werkstatt, Link oder eingefügter Textcode: Jede fremde
Bahn geht durch dieselbe Prüfung in `src/share.js` – Kartenzeichen, Größe (6–48 × 4–36 Kacheln), genau
ein Abschlag und genau ein Loch, bekannte Hindernistypen, Zahlen in sinnvollen Grenzen, keine tief
verschachtelten Daten und kein Markup in Namen oder Textfeldern. Was nicht passt, wird mit Grund
abgelehnt statt geladen. Bahnen mit Innenraum lassen sich nicht teilen, weil dafür zwei Karten nötig
wären – der Editor baut ohnehin keine.

## Vorschau: erst prüfen, dann ins Spiel

Es gibt zwei Stände unter derselben Adresse:

| | Adresse | Was ist das |
| --- | --- | --- |
| **Das Spiel** | `…github.io/Golf-with-your-Friends/` | Der freigegebene Stand. Den spielen die Freunde. Zweig `main`. |
| **Die Vorschau** | `…github.io/Golf-with-your-Friends/vorschau/` | Der neue Stand zum Ausprobieren, auch wenn er noch nicht fertig ist. Arbeitszweig. |

Neues geht **zuerst in die Vorschau**. Ins Spiel kommt es erst, wenn der Arbeitszweig nach `main`
übernommen wird – also auf ausdrückliche Freigabe hin.

Die Vorschau trägt oben ein oranges Band und im Startbildschirm „Vorschau · Fassung N", damit man die
beiden nie verwechselt. Sie lässt sich genau wie das Spiel auf den Startbildschirm legen und offline
spielen.

**Beide Stände sind sauber getrennt**, obwohl sie auf derselben Adresse liegen und sich damit den
Browser-Speicher teilen würden:

- **Eigene Schlüssel im Browser**: `fantasygolf.vorschau.name` statt `fantasygolf.name` und so weiter.
  Name, Rekorde, Hüte, Steuerung, eigene Bahnen – alles doppelt vorhanden und unabhängig.
- **Eigene Themen beim Vermittler**: `fantasygolf/v1/vorschau/…` statt `fantasygolf/v1/spiel/…`.
  Ein Testlauf kann die Rekorde der Freunde nicht überschreiben, und man landet nicht versehentlich
  in ihrem Spielraum – selbst bei gleichem Raumcode.
- **Eigener Offline-Speicher**: `fg-vorschau-vN` statt `fg-spiel-vN`. Beim Aufräumen löscht jede
  Ausgabe nur ihre eigenen alten Stände.

Erkannt wird das am Pfad (`src/version.js`), es gibt also keinen Schalter, den man vergessen könnte.

## Sicherheit – was geprüft wird und was offen bleibt

Das Spiel läuft ohne eigenen Server: reine Dateien auf GitHub Pages, dazu ein offener MQTT-Vermittler
für Netzspiel und Rangliste. Das prägt, was möglich ist und was nicht.

**Was abgesichert ist**

- **Alle Eingaben gehen durch eine Stelle** (`src/text.js`). Namen: höchstens 16 Zeichen, erlaubt sind
  Buchstaben, Ziffern, Leerzeichen, `-` und `_`. Bahnnamen: höchstens 24 Zeichen, zusätzlich die üblichen
  Satzzeichen. Alles andere fällt weg – schon beim Hereinkommen, nicht erst beim Anzeigen. Beim Anzeigen
  wird zusätzlich entschärft, falls doch etwas aus einer alten Datei oder einem Gerät mit anderer Fassung
  kommt. Die Punktetafel und die Bahnauswahl im Editor werden aus Bausteinen gebaut statt aus Text geklebt.
- **Content-Security-Policy** in `index.html`: Alles ist verboten außer dem, was ausdrücklich dasteht.
  Programmcode nur aus dem eigenen Verzeichnis (keine fremden und keine eingebetteten Skripte),
  Verbindungen nur zum MQTT-Vermittler, keine eingebetteten Objekte, kein umgebogenes `<base>`, keine
  Formulare. Ausnahme: `style-src 'unsafe-inline'`, weil Spielerfarben als `style`-Attribut am Element
  hängen – Inline-Stile können keinen Code ausführen.
- **Jede Netz-Nachricht wird geprüft**, bevor sie etwas bewegt: Aufbau, Datentypen, Wertebereiche
  (Schlagzahl 1–999, Kraft 0–1, Richtungsvektor auf Länge 1, Ball innerhalb der Bahnmaße plus Rand,
  Zeit höchstens 24 Stunden). Unbekannte Nachrichtentypen fallen weg. Züge werden nur angenommen, wenn
  der Absender laut eigenem Spielstand am Zug ist; Rundenstart, Bahnwechsel und Spielerliste nur vom
  Gastgeber, der mit der ersten Spielerliste feststeht und danach nicht mehr wechseln kann.
- **Fortlaufende Nummern** in jeder Nachricht (`src/net.js`): Wer eine alte Nachricht wiederholt oder
  eine doppelt zugestellte schickt, bewirkt nichts – nur streng steigende Nummern je Absender kommen durch.
- **Keine Geheimnisse im Code**: keine Schlüssel, Zugangsdaten oder Tokens, auch nicht im Verlauf.
  Nach außen führen nur drei Adressen: der MQTT-Vermittler, Google Fonts und `ws://localhost:9001` für
  Tests auf dem eigenen Rechner.

**Was das nicht leistet – ehrlich**

- **Absender sind nicht überprüfbar.** Jede Nachricht sagt selbst, von wem sie kommt. Wer den Raumcode
  kennt oder ihn durchprobiert (vier Ziffern sind schnell durchprobiert), kann mitlesen, die Kennung des
  Gastgebers abschreiben und sich als er ausgeben. Alle inhaltlichen Prüfungen greifen weiter, aber die
  Rolle lässt sich übernehmen. Dagegen hilft nur ein Server, der Teilnehmer kennt und Nachrichten
  beglaubigt – oder ein Geheimnis, das nicht im Raumcode steckt und über einen anderen Weg geteilt wird.
- **Gegen Schummeln beim eigenen Ergebnis ist nichts zu machen.** Es gibt keinen Schiedsrichter, der
  nachrechnet. Wer den Code ändert, meldet 1 Schlag in 2 Sekunden, und alle anderen glauben es. Die
  Prüfungen halten nur unmögliche Werte ab, nicht unwahrscheinliche.
- **Der Vermittler ist öffentlich.** Alle Räume und alle Rekorde liegen bei einem fremden, offenen
  Dienst. Wer dort mitliest, sieht Namen, Codes und Ergebnisse. Nichts davon ist geheim, aber es ist
  auch nicht privat.
- **Die Rekorde können jederzeit verschwinden** – der Vermittler bewahrt sie nur, solange er läuft.
- **Wer die Seite einbetten darf, lässt sich nicht steuern.** `frame-ancestors` wirkt nur als
  HTTP-Kopfzeile, und GitHub Pages lässt keine eigenen Kopfzeilen zu.

**Was ein eigener Server ändern würde:** Er könnte Teilnehmer anmelden und jeder Nachricht ansehen, von
wem sie wirklich stammt; er könnte die Bahn selbst nachrechnen und ein gemeldetes Ergebnis ablehnen, das
physikalisch nicht geht; er könnte Rekorde dauerhaft und fälschungssicher speichern; und er könnte
Kopfzeilen setzen, die das Einbetten unterbinden. Für einen Freundeskreis ist das viel Aufwand für wenig
Gewinn – aber es ist der einzige Weg, diese Punkte wirklich zu schließen.

## Einzeldatei fürs Artefakt

Zum Weitergeben lässt sich das Spiel in eine einzige HTML-Datei packen (ein kleines Skript außerhalb
des Repos tut das). Die Reihenfolge der Skripte liest es aus `index.html` – bewusst nicht aus einer
zweiten, von Hand gepflegten Liste. Genau daran ist es einmal gescheitert: `src/text.js` kam dazu, war
in `index.html` und im Service Worker eingebunden, fehlte aber im Bündel; ohne `Text` brach `best.js`
beim Laden ab und die Einzeldatei zeigte nur einen schwarzen Bildschirm. Die auf GitHub Pages
ausgelieferten Einzeldateien waren davon nie betroffen.

Nach jedem Bauen wird die Datei einmal im Browser geladen und nachgesehen, ob Startbildschirm,
Sinnbilder, ein laufendes Spiel, die Rangliste und der Editor da sind.

## Projektstruktur

```
index.html        Seite und HUD
style.css         Oberfläche
src/themes.js     Farbpaletten und Deko je Welt
src/courses.js    die Bahnen des Märchenlands
src/courses_sea.js die Bahnen der Meereswelt
src/courses_jungle.js die Bahnen des Dschungeltempels
src/courses_storm.js die Bahnen des Sturmhimmels (Legende)
src/courses_shadow.js die Bahnen des Schattenreichs (Legende)
src/courses_colosseum.js die Bahnen des Kolosseums (Legende)
src/courses_pro.js die Bahnen des Tüftlerreichs und die Weltenliste
src/editor.js     Baumodus (Editor für eigene Bahnen)
manifest.webmanifest, sw.js, icons/   Web-App: Installieren und offline spielen
.github/workflows/pages.yml           Veröffentlichung auf GitHub Pages
src/level.js      Karte → Kacheln, Mauern, Kollisionssegmente
src/obstacles.js  bewegliche und statische Hindernisse
src/obstacles_legend.js Blitzfeld, Aufwind, Falltür, Fallbeil, Augenturm, Löwentor
src/physics.js    Ballphysik und Kollision
src/render.js     isometrische Darstellung
src/render_legend.js Optik der Legende-Welten (Hintergründe, neue Hindernisse und Stile)
src/text.js       Eine Stelle für alle Eingaben: Namen und Bahnnamen filtern, Anzeige entschärfen
src/share.js      Bahnen weitergeben: prüfen, über den Vermittler teilen, als Link verpacken
src/version.js    Fassung und Ausgabe (Spiel oder Vorschau): Zahl, Speicher-Vorsatz und Themen-Marke – von Seite und Service Worker gelesen
src/icons.js      Bedien-Sinnbilder: Material Symbols als eingebettete SVG-Pfade (Zurück, Kamera, Musik, Editor …)
src/hats.js       Hüte für die Bälle: Zeichnungen und Vorschau fürs Menü
src/net.js        Netzspiel: Raumcode und MQTT-Zugang für das Spiel zu mehreren
src/best.js       Rangliste: Rekorde je Bahn und je Welt in drei Wertungen (Schläge, Zeit, Kombi), über alle Geräte geteilt
src/sfx.js        Klangeffekte (WebAudio)
src/music.js      Musik: je Welt ein erzeugter Klangteppich (WebAudio)
src/worldmap.js   Weltkarte: die schwebenden Scheiben in 2,5D und die Orte der Welten
src/title.js      animierte Startbildschirm-Szene mit Tag-Nacht-Wechsel
src/main.js       Spielablauf, Eingabe, Punkte
```
