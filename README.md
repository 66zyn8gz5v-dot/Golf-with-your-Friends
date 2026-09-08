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

Auf der **Weltkarte** liegen alle Welten als Orte in einem gezeichneten Atlas, der von links (heller Tag im Märchenland) nach rechts (Nacht im Schattenreich) wandert; ein gestrichelter Reiseweg verbindet sie. **Jeder Ort ist von Anfang an anwählbar – nichts muss freigespielt werden.** Die Stufe am Ort ist nur ein Hinweis darauf, was einen erwartet:

| Ort | Stufe | Bahnen |
| --- | --- | --- |
| Märchenland | Normal | 9 (Wiese, Pilzhain, Schmiede, Zauberwald, Drachenhöhle, Eisgrotte, Wolkenburg, Hexenturm, Burgberg) |
| Meereswelt | Normal | 10 auf See und am Meeresgrund |
| Tüftlerreich | Profi | 9 Bahnen quer durch neun Orte, jeder mit eigener Maschinerie: Windmühlen, Zwergenkanone, Uhrwerk, Magnete, Schrumpftrank |
| Dschungeltempel | Profi | 9 Bahnen durch den Urwald bis zur verlorenen Stadt |
| Sturmhimmel | Legende | 9 extra große Bahnen über den Wolken |
| Schattenreich | Legende | 10 extra große Bahnen im Reich der Schatten |

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

## Bestenliste

Über **🏆 Bestenliste** im Startbildschirm: für jede Bahn die wenigsten Schläge und für jede Welt das
beste Gesamtergebnis, mit Namen dabei. Die Liste ist über alle Geräte gleich – bricht jemand einen Rekord,
sehen die anderen es sofort, auch mitten im Spiel („🏆 Lea: Elfenwiese in 2"). Während einer Bahn steht der
aktuelle Rekord oben links im HUD.

Einmal den eigenen Namen eintragen, mehr ist nicht nötig. Der Name gilt auch online: im Warteraum und auf
der Punktetafel steht dann er statt „Spieler 2". Gewertet wird **der eigene Ball im Wettkampf** – am Gerät
Spieler 1, online der eigene Platz. Der Kreativmodus zählt nicht, weil man dort beliebig oft neu setzen darf.

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
mit, und am Ende sagt er Ruheort, Schlagzahl und Ergebnis. So dürfen die Simulationen unterwegs ein wenig
auseinanderlaufen, ohne dass die Punkte auseinanderlaufen.

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
- `Esc` bricht das Zielen ab.
- Kamera: folgt dem Ball und blickt Richtung Loch. Tasten unten links oder Tastatur:
  `M` Übersicht der ganzen Bahn, `Q`/`E` drehen, `+`/`-` oder Mausrad zoomen.
  Die Neigung richtet sich nach dem Bildschirm: hochkant (Handy) bleibt die Sicht flach,
  quer auf Tablet oder Laptop wird sie steiler, damit das Feld nicht platt gedrückt wirkt.
- Hut des eigenen Balls: in der Startaufstellung unter „Hut". Die Wahl merkt sich der Browser.
- Online gegeneinander: **🌐 Online spielen** im Startbildschirm, Raumcode aufmachen oder eintippen.
- Rekorde: **🏆 Bestenliste** im Startbildschirm, einmal den eigenen Namen eintragen.
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

Im Kreativmodus gibt es **Bahn bauen**: ein Editor direkt im Spiel. Kacheln (Rasen, Sand, Eis, Wasser, Lava, Block, Klippe, Leer) werden durch Tippen oder Ziehen gemalt, Abschlag und Loch per Werkzeug gesetzt. Objekte (Pilz, Windrad, Fallgatter, Lore, Windfeld, Sprungrampe, Beschleuniger, Windmühle, Kanone, Magnet, Drehscheibe, Schrumpftrank, Portal, Bande) werden per Tipp platziert, mit **Drehen** in der Richtung geändert und mit **Löschen** entfernt. Gebaut wird in der Draufsicht (umschaltbar auf Schrägsicht), das Panel lässt sich einklappen und ist in die Reiter **Bauen** (Boden, Abschlag/Loch, Hindernisse), **Bahn** (Name, Par, Welt, Kartengröße) und **Speichern** (Speichern, Laden, Bahn-Code) aufgeteilt. **Testen** spielt die Bahn sofort, danach geht es zurück in den Editor. **Fertig** speichert die Bahn und öffnet die **Eigene Welt**: dort wird die Bahn per **Einsetzen** an einer wählbaren Position eingefügt, die Reihenfolge lässt sich mit ▲ ▼ ändern, ✕ nimmt eine Bahn wieder heraus. Die Eigene Welt erscheint im Kreativmodus als eigene Welt und wird in dieser Reihenfolge gespielt. Gespeichert wird im Browser; **Exportieren** liefert den Bahn-Code als Text, **Importieren** liest ihn wieder ein (so lassen sich Bahnen weitergeben). Der Editor steckt in `src/editor.js`.

## Eigene Bahnen im Code bauen

Bahnen stehen in `src/courses.js` (Märchenland), `src/courses_sea.js` (Meereswelt) und `src/courses_pro.js` (Tüftlerreich) als ASCII-Karte plus Hindernisliste. Die Liste `WORLDS` in `src/courses_pro.js` registriert die Welten für die Weltkarte; `mode` (`normal`, `pro`, `legend`) steht dort nur noch als Schwierigkeitshinweis am Ort, gespielt werden kann jede Welt von Anfang an.

```
.  Leere / Abgrund     #  Fairway      s  Sand      i  Eis
w  Wasser              l  Lava         x  Steinblock
o  Fairway ohne Randmauer (Klippe)
T  Abschlag            H  Loch
```

Pro Bahn lässt sich die Bremsung eines Untergrunds überschreiben, z. B. `friction: { s: 32 }` für besonders tiefen Sand.

Blickzonen: Über `views` (Rechtecke mit `look`-Punkt) kann eine Bahn festlegen, wohin die Kamera schaut, solange der Ball in der Zone liegt, etwa auf eine Mühlentür oder eine Fähre statt aufs Loch.

Höhenstufen: Eine Bahn kann ein Ziffernraster `heights` (0–9) und `hStep` angeben. Stufen sind nur über `field`-Rampen mit `base`/`rise` zu erklimmen, Kanten nach oben wirken sonst wie Mauern; nach unten rollt der Ball frei.

Hindernis-Typen: `lightning` (Blitzfeld `w`×`h`: `warn` Sekunden Knistern, dann `strike` Sekunden Einschlag je `period`; wer dann in der Zone ist, auch fliegend, kassiert einen Strafschlag zurück zum Schlagstart), `updraft` (Aufwind-Zone: ein Ball mit mindestens `minSpeed` wird in Rollrichtung `land` Kacheln weit geflogen, Flugtempo `fly`), `trapdoor` (Falltür `w`×`h`, offen für den `open`-Anteil der `period`; wer darüberrollt oder darauf liegt, stürzt: Strafschlag zurück zum Schlagstart), `field` mit `style: 'dark'` (Schattenzone: der Ball ist darin fast unsichtbar), `bumper` (`style`: `mushroom`, `rock`, `crystal`, `coral`, `idol`, `orb`, `grave`, `eye`), `mover` (`style` u. a. `cart`, `cannonball`, `boulder`, `barrel`, `shark`, `wave`, `dragon`, `knight`, `guard`, `coconut`, `ghost`, `bat`, `stormcloud`), `ferry` (`style`: `cart`, `boat`, `ship`, `balloon`, `airship`), `wave` (wandernde Welle, keine Mauer: schiebt einen ruhenden oder langsamen Ball mit `push` in ihrer Laufrichtung mit; ein schnellerer Ball bricht hindurch und behält dabei nur den Anteil `brake` seines Tempos), `spikes` (Stachelfalle: Platte `w`×`h`, Stacheln sind `up`-Anteil der `period` draußen und blockieren dann wie eine Mauer; ein Ball, der auf der Platte liegt, wenn sie hochkommen, wird aufgespießt: Strafschlag und zurück zum Start des letzten Schlags), `sharkjump` (Hai, der im Takt `period` quer über eine Bucht springt; `style: 'croc'` zeichnet ein Krokodil und einen Ball frisst, der währenddessen über die Zone fliegt; Fressen kostet einen Strafschlag – eine `inner`-Map mit `stomach: true` würde den Ball stattdessen dorthin schicken), `rotor` (auch als Pendel mit `swing`; `style: 'tentacle'` macht daraus eine Krake, `style: 'vine'` eine Liane), `windmill`, `gate` (periodisch oder mit `linked` an einen Schalter gekoppelt), `portal`, `boost`, `field`, `ramp`, `rail`, `wall`, `cannon` (schwenkende Kanone, `base`/`amp`/`speed`/`range`; `style: 'catapult'` zeichnet ein Katapult), `magnet` (`strength` > 0 zieht an, < 0 stößt ab, `slow` bremst; `style: 'coral'` zeichnet eine Koralle, `style: 'pearl'` eine Perle; `curse: 2.0` macht den Ball nach Berührung für den Rest der Bahn träge), `turntable` (Drehscheibe mit Auswurfrinne `exit` in Grad; `style: 'whirl'` zeichnet einen Strudel), `field` (`style`: `wind`, `current` für Unterwasser-Strömung, `slope` für Rampen zwischen Höhenstufen; `gust` macht aus Dauerwind Windstöße), `potion` (Schrumpftrank, `scale`/`duration`), `cauldron` (Hexentopf: nur aus der Luft zu treffen, schrumpft und spuckt Richtung `exit` aus), `switch` (Druckplatte, `target`/`duration`), `door` (Tür in die Innen-Map `inner` einer Bahn; `style: 'pyramid'` mit `px`/`py`/`base` zeichnet eine Stufenpyramide um die Tür, `style: 'wreck'` mit `px`/`py` ein Schiffswrack, dessen Leck die Tür ist, `style: 'temple'` ein Tempeltor).
### Musik

Jede Welt hat einen eigenen, endlos weiterlaufenden Klangteppich – vollständig mit WebAudio erzeugt, ohne eine einzige Audiodatei (die App bleibt klein und offline spielbar). Pro Takt erklingen ein Flächenakkord aus drei Tönen, ein Bass auf dem Grundton, gezupfte Melodietöne aus der Tonleiter des gerade klingenden Akkords und je nach Welt eine Trommel, eine Rassel oder eine Glocke; ein Echo legt sich darüber. Die Akkorde wandern Takt für Takt durch eine kurze Wendung. Märchenland klingt in Dur und hell, die Meereswelt dorisch und wiegend, das Tüftlerreich in Moll mit ruhigem Puls, der Dschungeltempel pentatonisch mit Rahmentrommel, der Sturmhimmel weit mit tiefer Pauke, das Schattenreich phrygisch mit ferner Grabglocke. Beim Weltwechsel blendet der alte Klang aus und der neue auf; im Hintergrundtab schweigt die Musik. Die Paletten stehen in `src/music.js`.

Farbwelten stehen in `src/themes.js`, jede mit einer dezenten Atmosphäre (`atmo`: `fog`, `mist`, `fireflies`, `spores`, `embers`, `sparks`, `ash`, `bubbles`, `sand`, `spray`, `snow`, `pollen`, `none`), die eine Bahn per `atmo` überschreiben kann. Mit `node tools/validate.mjs` lässt sich prüfen, ob jede Bahn lösbar ist; `node tools/audit/audit.mjs <welt|all> [Bahn]` spielt jede Bahn headless durch (Profi-Suche, simulierte Normalspieler mit Streuung, Prüfung von Engstellen, Zeitfenstern und Kamerazonen) und schreibt Ergebnisse nach `out/`.

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
src/courses_pro.js die Bahnen des Tüftlerreichs und die Weltenliste
src/editor.js     Baumodus (Editor für eigene Bahnen)
manifest.webmanifest, sw.js, icons/   Web-App: Installieren und offline spielen
.github/workflows/pages.yml           Veröffentlichung auf GitHub Pages
src/level.js      Karte → Kacheln, Mauern, Kollisionssegmente
src/obstacles.js  bewegliche und statische Hindernisse
src/obstacles_legend.js Blitzfeld, Aufwind, Falltür
src/physics.js    Ballphysik und Kollision
src/render.js     isometrische Darstellung
src/render_legend.js Optik der Legende-Welten (Hintergründe, neue Hindernisse und Stile)
src/hats.js       Hüte für die Bälle: Zeichnungen und Vorschau fürs Menü
src/net.js        Netzspiel: Raumcode und MQTT-Zugang für das Spiel zu mehreren
src/best.js       Bestenliste: Rekorde je Bahn und je Welt, über alle Geräte geteilt
src/sfx.js        Klangeffekte (WebAudio)
src/music.js      Musik: je Welt ein erzeugter Klangteppich (WebAudio)
src/worldmap.js   Weltkarte: gezeichneter Atlas und die Orte der Welten
src/title.js      animierte Startbildschirm-Szene mit Tag-Nacht-Wechsel
src/main.js       Spielablauf, Eingabe, Punkte
```
