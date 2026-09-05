# Fantasy Golf – Golf with your Friends

Ein Minigolf-Spiel in 2,5D mit Fantasy-Welten, gebaut mit reinem HTML5-Canvas und JavaScript – ohne Build-Schritt und ohne Abhängigkeiten.

## Spielen

Einfach `index.html` im Browser öffnen (Chrome, Firefox, Safari, Edge – auch mobil).
Alternativ lokal über einen kleinen Server:

```bash
npx serve .          # oder: python3 -m http.server 8080
```

## Welten und Modi

- **Märchenland** (9 Bahnen: Wiese, Pilzhain, Schmiede, Zauberwald, Drachenhöhle, Eisgrotte, Wolkenburg, Hexenturm, Burgberg), **Meereswelt** (10 Bahnen auf See und am Meeresgrund), **Profi-Welt** (9 schwerere Bahnen mit Windmühlen, Pendeln, schmalen Dämmen und Brücken) und **Dschungeltempel** (9 Profi-Bahnen durch den Urwald bis zur verlorenen Stadt).
- **Normal**: erst eine Welt wählen (Märchenland oder Meereswelt), dann deren Bahnen der Reihe nach, mit Schlaglimit und Wertung. Jede Welt ist ein eigenes Thema; weitere Welten werden hier eingehängt.
- **Profi**: erst eine Welt wählen (Profi-Welt oder Dschungeltempel), dann deren Bahnen der Reihe nach.
- **Kreativ**: erst die Welt wählen, dann geht es sofort los mit einem Spieler, Schleuder-Steuerung und Bahn 1; im Spiel mit „◀ Bahn" / „Bahn ▶" (Tasten P / N) springen, „Ball zurück" (R) setzt an den Abschlag, kein Schlaglimit. Gedacht zum schnellen Prüfen einzelner Bahnen.

Die Weltauswahl im Normal-Modus ist der Platz, an dem weitere Themenwelten eingehängt werden.

## Steuerung

- Finger oder Maus aufsetzen, ziehen, loslassen. Je weiter gezogen wird, desto kräftiger der Schlag (Kraftanzeige unten).
- Steuerung im Startbildschirm wählbar: „Schleuder" (Standard, vom Ball wegziehen) oder „Schieben" (in Schussrichtung ziehen).
- `Esc` bricht das Zielen ab.
- Kamera: folgt dem Ball und blickt Richtung Loch. Tasten unten links oder Tastatur:
  `M` Übersicht der ganzen Bahn, `Q`/`E` drehen, `+`/`-` oder Mausrad zoomen.
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

## Die Bahnen der Profi-Welt

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

Zweite Profi-Welt in einem Guss: Urwald mit Moosstein, Lianen, Treibsand, trübem Fluss und Steingötzen (`jungle`), zum Schluss die Tempelhalle mit Fackeln, Glyphen und Feuergruben (`temple`).

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

Bahnen stehen in `src/courses.js` (Märchenland), `src/courses_sea.js` (Meereswelt) und `src/courses_pro.js` (Profi-Welt) als ASCII-Karte plus Hindernisliste. Die Liste `WORLDS` in `src/courses_pro.js` registriert die Welten für das Menü (`mode: 'normal'` erscheint in der Weltauswahl des Normal-Modus, `mode: 'pro'` hinter dem Profi-Knopf).

```
.  Leere / Abgrund     #  Fairway      s  Sand      i  Eis
w  Wasser              l  Lava         x  Steinblock
o  Fairway ohne Randmauer (Klippe)
T  Abschlag            H  Loch
```

Pro Bahn lässt sich die Bremsung eines Untergrunds überschreiben, z. B. `friction: { s: 32 }` für besonders tiefen Sand.

Blickzonen: Über `views` (Rechtecke mit `look`-Punkt) kann eine Bahn festlegen, wohin die Kamera schaut, solange der Ball in der Zone liegt, etwa auf eine Mühlentür oder eine Fähre statt aufs Loch.

Höhenstufen: Eine Bahn kann ein Ziffernraster `heights` (0–9) und `hStep` angeben. Stufen sind nur über `field`-Rampen mit `base`/`rise` zu erklimmen, Kanten nach oben wirken sonst wie Mauern; nach unten rollt der Ball frei.

Hindernis-Typen: `bumper` (`style`: `mushroom`, `rock`, `crystal`, `coral`), `mover` (`style` u. a. `cart`, `cannonball`, `boulder`, `barrel`, `shark`, `wave`, `dragon`, `knight`, `guard`), `ferry` (`style`: `cart`, `boat`, `ship`), `wave` (wandernde Welle, keine Mauer: schiebt einen ruhenden oder langsamen Ball mit `push` in ihrer Laufrichtung mit; ein schnellerer Ball bricht hindurch und behält dabei nur den Anteil `brake` seines Tempos), `spikes` (Stachelfalle: Platte `w`×`h`, Stacheln sind `up`-Anteil der `period` draußen und blockieren dann wie eine Mauer; ein Ball, der auf der Platte liegt, wenn sie hochkommen, wird aufgespießt: Strafschlag und zurück zum Start des letzten Schlags), `sharkjump` (Hai, der im Takt `period` quer über eine Bucht springt; `style: 'croc'` zeichnet ein Krokodil und einen Ball frisst, der währenddessen über die Zone fliegt; Fressen kostet einen Strafschlag – eine `inner`-Map mit `stomach: true` würde den Ball stattdessen dorthin schicken), `rotor` (auch als Pendel mit `swing`; `style: 'tentacle'` macht daraus eine Krake, `style: 'vine'` eine Liane), `windmill`, `gate` (periodisch oder mit `linked` an einen Schalter gekoppelt), `portal`, `boost`, `field`, `ramp`, `rail`, `wall`, `cannon` (schwenkende Kanone, `base`/`amp`/`speed`/`range`; `style: 'catapult'` zeichnet ein Katapult), `magnet` (`strength` > 0 zieht an, < 0 stößt ab, `slow` bremst; `style: 'coral'` zeichnet eine Koralle, `style: 'pearl'` eine Perle; `curse: 2.0` macht den Ball nach Berührung für den Rest der Bahn träge), `turntable` (Drehscheibe mit Auswurfrinne `exit` in Grad; `style: 'whirl'` zeichnet einen Strudel), `field` (`style`: `wind`, `current` für Unterwasser-Strömung, `slope` für Rampen zwischen Höhenstufen; `gust` macht aus Dauerwind Windstöße), `potion` (Schrumpftrank, `scale`/`duration`), `cauldron` (Hexentopf: nur aus der Luft zu treffen, schrumpft und spuckt Richtung `exit` aus), `switch` (Druckplatte, `target`/`duration`), `door` (Tür in die Innen-Map `inner` einer Bahn; `style: 'pyramid'` mit `px`/`py`/`base` zeichnet eine Stufenpyramide um die Tür, `style: 'wreck'` mit `px`/`py` ein Schiffswrack, dessen Leck die Tür ist, `style: 'temple'` ein Tempeltor).
Farbwelten stehen in `src/themes.js`, jede mit einer dezenten Atmosphäre (`atmo`: `fog`, `mist`, `fireflies`, `spores`, `embers`, `sparks`, `ash`, `bubbles`, `sand`, `spray`, `snow`, `pollen`, `none`), die eine Bahn per `atmo` überschreiben kann. Mit `node tools/validate.mjs` lässt sich prüfen, ob jede Bahn lösbar ist; `node tools/audit/audit.mjs <welt|all> [Bahn]` spielt jede Bahn headless durch (Profi-Suche, simulierte Normalspieler mit Streuung, Prüfung von Engstellen, Zeitfenstern und Kamerazonen) und schreibt Ergebnisse nach `out/`.

## Projektstruktur

```
index.html        Seite und HUD
style.css         Oberfläche
src/themes.js     Farbpaletten und Deko je Welt
src/courses.js    die Bahnen des Märchenlands
src/courses_sea.js die Bahnen der Meereswelt
src/courses_jungle.js die Bahnen des Dschungeltempels
src/courses_pro.js die Bahnen der Profi-Welt und die Weltenliste
src/editor.js     Baumodus (Editor für eigene Bahnen)
manifest.webmanifest, sw.js, icons/   Web-App: Installieren und offline spielen
.github/workflows/pages.yml           Veröffentlichung auf GitHub Pages
src/level.js      Karte → Kacheln, Mauern, Kollisionssegmente
src/obstacles.js  bewegliche und statische Hindernisse
src/physics.js    Ballphysik und Kollision
src/render.js     isometrische Darstellung
src/sfx.js        Klangeffekte (WebAudio)
src/title.js      animierte Startbildschirm-Szene mit Tag-Nacht-Wechsel
src/main.js       Spielablauf, Eingabe, Punkte
```
