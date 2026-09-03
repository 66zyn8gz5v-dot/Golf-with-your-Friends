# Fantasy Golf – Golf with your Friends

Ein Minigolf-Spiel in 2,5D mit Fantasy-Welten, gebaut mit reinem HTML5-Canvas und JavaScript – ohne Build-Schritt und ohne Abhängigkeiten.

## Spielen

Einfach `index.html` im Browser öffnen (Chrome, Firefox, Safari, Edge – auch mobil).
Alternativ lokal über einen kleinen Server:

```bash
npx serve .          # oder: python3 -m http.server 8080
```

## Welten und Modi

- **Normal-Welt** (9 Bahnen) und **Profi-Welt** (8 schwerere Bahnen mit Windmühlen, Pendeln, schmalen Dämmen und Brücken).
- **Normal**: die Normal-Welt der Reihe nach, mit Schlaglimit und Wertung.
- **Profi**: dasselbe für die Profi-Welt.
- **Kreativ**: erst die Welt wählen, dann geht es sofort los mit einem Spieler, Schleuder-Steuerung und Bahn 1; im Spiel mit „◀ Bahn" / „Bahn ▶" (Tasten P / N) springen, „Ball zurück" (R) setzt an den Abschlag, kein Schlaglimit. Gedacht zum schnellen Prüfen einzelner Bahnen.

Das Modus-Menü ist der Platz, an dem später weitere Welten eingehängt werden.

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

## Die Bahnen der Profi-Welt

| # | Bahn | Par | Hindernisse |
|---|------|-----|-------------|
| 1 | Mühlenwiese | 3 | Windmühle mit schmaler Tür, Sand |
| 2 | Nebelmoor | 4 | breiter Fluss, Rampensprung ans andere Ufer, Windmühle als Tor zum Loch, Eis |
| 3 | Zwergenkanone | 3 | schwenkende Kanone, die den Ball über den Lavasee schießt (Timing!), zwei Pendel |
| 4 | Magnetsee | 4 | Kristall-Magnete, die den Ball anziehen oder abstoßen, Eisflächen und Eislöcher |
| 5 | Uhrwerk | 4 | zwei Zahnrad-Drehscheiben, die den Ball mitnehmen und an der Rinne auswerfen, Fallgatter |
| 6 | Drachenschlund | 5 | Sprungschanze über Lava, zwei Drachen, tiefer Sand |
| 7 | Hexenküche | 5 | Schrumpftrank (Ball wird 20 s klein) und ein Spalt, durch den nur der kleine Ball passt, Kessel, Besen |
| 8 | Königsburg | 5 | zwei Windmühlen, Ritter, Steigungen, Schalterplatte, die das Zaubertor (Zugbrücke) 14 s öffnet |

## Eigene Bahnen bauen

Bahnen stehen in `src/courses.js` (Normal-Welt) und `src/courses_pro.js` (Profi-Welt) als ASCII-Karte plus Hindernisliste. Die Liste `WORLDS` in `src/courses_pro.js` registriert die Welten für das Menü.

```
.  Leere / Abgrund     #  Fairway      s  Sand      i  Eis
w  Wasser              l  Lava         x  Steinblock
o  Fairway ohne Randmauer (Klippe)
T  Abschlag            H  Loch
```

Pro Bahn lässt sich die Bremsung eines Untergrunds überschreiben, z. B. `friction: { s: 32 }` für besonders tiefen Sand.

Hindernis-Typen: `bumper`, `mover`, `ferry`, `rotor` (auch als Pendel mit `swing`), `windmill`, `gate` (periodisch oder mit `linked` an einen Schalter gekoppelt), `portal`, `boost`, `field`, `ramp`, `rail`, `wall`, `cannon` (schwenkende Kanone, `base`/`amp`/`speed`/`range`), `magnet` (`strength` > 0 zieht an, < 0 stößt ab), `turntable` (Drehscheibe mit Auswurfrinne `exit` in Grad), `potion` (Schrumpftrank, `scale`/`duration`), `switch` (Druckplatte, `target`/`duration`).
Farbwelten stehen in `src/themes.js`, jede mit einer dezenten Atmosphäre (`atmo`: `fog`, `mist`, `fireflies`, `spores`, `embers`, `snow`, `pollen`, `none`), die eine Bahn per `atmo` überschreiben kann. Mit `node tools/validate.mjs` lässt sich prüfen, ob jede Bahn lösbar ist.

## Projektstruktur

```
index.html        Seite und HUD
style.css         Oberfläche
src/themes.js     Farbpaletten und Deko je Welt
src/courses.js    die Bahnen der Normal-Welt
src/courses_pro.js die Bahnen der Profi-Welt und die Weltenliste
src/level.js      Karte → Kacheln, Mauern, Kollisionssegmente
src/obstacles.js  bewegliche und statische Hindernisse
src/physics.js    Ballphysik und Kollision
src/render.js     isometrische Darstellung
src/sfx.js        Klangeffekte (WebAudio)
src/title.js      animierte Startbildschirm-Szene mit Tag-Nacht-Wechsel
src/main.js       Spielablauf, Eingabe, Punkte
```
