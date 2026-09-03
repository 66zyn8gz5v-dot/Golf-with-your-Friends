# Fantasy Golf – Golf with your Friends

Ein Minigolf-Spiel in 2,5D mit Fantasy-Welten, gebaut mit reinem HTML5-Canvas und JavaScript – ohne Build-Schritt und ohne Abhängigkeiten.

## Spielen

Einfach `index.html` im Browser öffnen (Chrome, Firefox, Safari, Edge – auch mobil).
Alternativ lokal über einen kleinen Server:

```bash
npx serve .          # oder: python3 -m http.server 8080
```

## Steuerung

- Finger oder Maus aufsetzen, ziehen, loslassen. Je weiter gezogen wird, desto kräftiger der Schlag (Kraftanzeige unten).
- Steuerung im Startbildschirm wählbar: „Schleuder" (Standard, vom Ball wegziehen) oder „Schieben" (in Schussrichtung ziehen).
- `Esc` bricht das Zielen ab.
- Kamera: folgt dem Ball und blickt Richtung Loch. Tasten unten links oder Tastatur:
  `M` Übersicht der ganzen Bahn, `Q`/`E` drehen, `+`/`-` oder Mausrad zoomen.
- 1–4 Spieler im Hotseat-Modus: Jeder spielt die Bahn nacheinander zu Ende.
- Wasser, Lava und Abgrund: Ball zurück zur letzten Position, +1 Strafschlag.

## Die 9 Bahnen

| # | Bahn | Par | Hindernisse |
|---|------|-----|-------------|
| 1 | Elfenwiese | 3 | Steinpfeiler, Hecken |
| 2 | Pilzhain | 3 | federnde Riesenpilze, Sandkuhlen |
| 3 | Zwergenschmiede | 4 | zwei Lavaschluchten, zwei Loren als Fähren mit unterschiedlichem Takt: rechtzeitig hineinrollen, sie setzen den Ball drüben ab |
| 4 | Zauberwald | 3 | Portale zwischen Inseln, ein Fallen-Portal |
| 5 | Drachenhöhle | 4 | Sand, Lavabecken, Windfeld, patrouillierender Drache |
| 6 | Eisgrotte | 3 | spiegelglattes Eis, Wassertümpel, rotierender Kristallstern |
| 7 | Wolkenburg | 4 | schwebende Inseln, Fallgatter, Beschleuniger, leichter Gegenwind |
| 8 | Hexenturm | 5 | Lava, Eis, Fallgatter, rotierender Besen, wandernde Kessel, Portal-Abkürzung, Aufwind |
| 9 | Burgberg | 5 | Serpentinen mit Steigungen, patrouillierende Ritter, Burggraben mit Zugbrücke, die Burg vom Startbildschirm |

## Eigene Bahnen bauen

Bahnen stehen in `src/courses.js` als ASCII-Karte plus Hindernisliste:

```
.  Leere / Abgrund     #  Fairway      s  Sand      i  Eis
w  Wasser              l  Lava         x  Steinblock
o  Fairway ohne Randmauer (Klippe)
T  Abschlag            H  Loch
```

Hindernis-Typen: `bumper`, `mover`, `ferry`, `rotor`, `gate`, `portal`, `boost`, `field`, `rail`.
Farbwelten stehen in `src/themes.js`. Mit `node tools/validate.mjs` lässt sich prüfen, ob jede Bahn lösbar ist.

## Projektstruktur

```
index.html        Seite und HUD
style.css         Oberfläche
src/themes.js     Farbpaletten und Deko je Welt
src/courses.js    die 8 Bahnen
src/level.js      Karte → Kacheln, Mauern, Kollisionssegmente
src/obstacles.js  bewegliche und statische Hindernisse
src/physics.js    Ballphysik und Kollision
src/render.js     isometrische Darstellung
src/sfx.js        Klangeffekte (WebAudio)
src/title.js      animierte Startbildschirm-Szene mit Tag-Nacht-Wechsel
src/main.js       Spielablauf, Eingabe, Punkte
```
