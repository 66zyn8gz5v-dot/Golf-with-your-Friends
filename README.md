# Fantasy Golf – Golf with your Friends

Ein Minigolf-Spiel in 2,5D mit Fantasy-Welten, gebaut mit reinem HTML5-Canvas und JavaScript – ohne Build-Schritt und ohne Abhängigkeiten.

## Spielen

Einfach `index.html` im Browser öffnen (Chrome, Firefox, Safari, Edge – auch mobil).
Alternativ lokal über einen kleinen Server:

```bash
npx serve .          # oder: python3 -m http.server 8080
```

## Welten und Modi

Vom Titelbild führen zwei Wege: **🗺 Weltkarte** und **🛠 Bauen & Eigene Welt**. Darunter stehen drei
kleine Knöpfe: **Turnier** führt ohne Umweg in die Arena (Kolosseum), **Online spielen** in den
Warteraum, **Rangliste** zu den Rekorden.

Auf der **Weltkarte** liegt jede Welt als schwebende Scheibe in derselben 2,5D-Sicht wie das Spiel selbst: Blick schräg von oben auf eine um 45° gedrehte Welt, dieselbe Projektion wie im Renderer. Jede Scheibe hat darum eine Deckfläche im Karomuster und darunter zwei sichtbare Seitenflächen – die linke hell, die rechte im Schatten – mit Streiflicht an der Oberkante und dunkler Vorderkante. Darauf stehen die Bauten als echte Körper: Quader mit Deckfläche und zwei Seiten, Kegeldächer und Baumkronen aus vier Dreiecken, hell zur Sonne und dunkel zur Schattenseite, dazu Fahnen und Kontaktschatten. Die Reise geht von links (heller Tag im Märchenland) nach rechts (tiefe Nacht in der Uhrwerkstadt): Himmelsverlauf vom Tag in die Nacht, Sterne, Sonnenstrahlen links, Blutmond rechts, ein scharfer Bergkamm mit Schneekappen und dahinter ein zweiter im Dunst, ziehende Wolken, ein gestrichelter goldener Weg über die Vorderkanten der Scheiben, schwebende Flocken, Nebelbänder und eine Randabdunklung. **Die Karte ist breiter als der Schirm.** Sie misst `WorldMap.BREITE` × 62 Karteneinheiten (zur Zeit
128 × 62); der Kasten darum ist so breit wie die Tafel und schiebt sich waagerecht – man wischt nach
links, und die Reise geht weiter bis zur Uhrwerkstadt am Ende. Wer eine achte Welt anhängt, erhöht
`BREITE` in `src/worldmap.js` und setzt ihre Scheibe rechts daneben; Seitenverhältnis, Hintergrund
und die Umrechnung der Ortsmarken in Prozent richten sich danach von selbst. Die Orte in
`WorldMap.spots` stehen darum in **Karteneinheiten** (x) und in **Prozent der Höhe** (y) – die
x-Angabe wird beim Zeichnen durch `BREITE` geteilt.

**Jeder Ort ist von Anfang an anwählbar – nichts muss freigespielt werden.** Die Stufe am Ort ist nur ein Hinweis darauf, was einen erwartet:

| Ort | Stufe | Bahnen |
| --- | --- | --- |
| Märchenland | Normal | 9 (Wiese, Pilzhain, Schmiede, Zauberwald, Drachenhöhle, Eisgrotte, Wolkenburg, Hexenturm, Burgberg) |
| Meereswelt | Normal | 10 auf See und am Meeresgrund |
| Tüftlerreich | Profi | 9 Bahnen quer durch neun Orte, jeder mit eigener Maschinerie: Windmühlen, Zwergenkanone, Uhrwerk, Magnete, Schrumpftrank |
| Dschungeltempel | Profi | 9 Bahnen durch den Urwald bis zur verlorenen Stadt |
| Sturmhimmel | Legende | 9 extra große Bahnen über den Wolken |
| Schattenreich | Legende | 10 extra große Bahnen im Reich der Schatten |
| Schneeberg | Profi | 12 Bahnen den Berg hinauf – der Wind dreht im Takt, oben liegen die Wolkenetagen |
| Uhrwerkstadt | Profi | 14 Bahnen im Uhrenturm – alles eine Frage des Takts, gestapelte Ebenen, zum Schluss wandert das Loch |

Das **Kolosseum** steht bewusst *nicht* auf der Weltkarte. Es ist die Turnierwelt und wird nur über
den **Turnier**-Knopf im Startbildschirm betreten – die Weltkarte bleibt die Reise durch die sieben
Landschaften, das Turnier ist ein eigener Wettkampf daneben. Technisch reicht dafür, dass die Welt
keinen Eintrag in `WorldMap.spots` hat; die Karte zeichnet dann weder Marke noch Insel.

| Turnier | Stufe | Bahnen |
| --- | --- | --- |
| Kolosseum | Legende | 12 Turnierbahnen in der Arena (nur über den Turnier-Knopf) |

Nach dem Antippen eines Ortes folgt die Startaufstellung mit **Modus**, **Spielern**, **Hut**, **Musik** und **Steuerung**:

- **🏆 Wettkampf**: alle Bahnen der Welt der Reihe nach, mit Schlaglimit, Zwischen- und Endtafel, 1–4 Spieler im Hotseat.
- **🛠 Kreativ**: allein und ohne Schlaglimit; im Spiel mit „◀ Bahn" / „Bahn ▶" (Tasten P / N) frei springen, „Ball zurück" (R) setzt an den Abschlag. Gedacht zum Erkunden und zum schnellen Prüfen einzelner Bahnen.

### Hüte

Die vier Bälle sind weiß, grün, hellblau und gelb. Jeder Spieler sucht sich vor dem Spiel einen Hut für seinen Ball aus: **Krone**, **Zauberhut**, **Piratenhut**,
**Zylinder**, **Kappe**, **Wikingerhelm**, **Ritterhelm**, **Legionärshelm** – oder **Ohne** für den
blanken Ball. Die Vorschau in der Startaufstellung zeigt den Ball
gleich in der Farbe des jeweiligen Spielers; bei mehreren Spielern wird oben umgeschaltet, für wen gerade
gewählt wird. Die Wahl merkt sich der Browser, und in der Anzeigetafel steht neben jedem Spieler sein Hut.

Der **Ritterhelm** ist ein Sonderfall: er legt sich um den ganzen Ball, als wäre der Ball der Kopf, und trägt
einen Federbusch wie bei den Feldherren. Die beiden äußeren Federn nehmen die Farbe des Balls an (beim weißen
Ball Rot), die mittlere bleibt immer weiß.

**Legionärshelm** und **Championhelm** gehören zum Kolosseum und sind ein Paar: dieselbe Grundform –
halbrunde Helmglocke, goldener Rand über der Stirn mit Nieten, breiter Nackenschirm nach hinten unten,
seitliche Wangenklappen – einmal in Silber für die Teilnahme, einmal in Gold für den Sieg. Der
Championhelm trägt zusätzlich einen Federkamm: fünf Straußenfedern fächern längs über die Glocke auf und
nehmen die Farbe des Balls an, genau wie der Busch am Ritterhelm (ein weißer Ball bekommt Rot, sonst ginge
der Kamm auf dem hellen Helm unter). Sonst bewusst wenige, große Formen: Bei Ballgröße bleibt von feinen
Verzierungen nichts übrig.

### Par kommt aus der Rangliste

Par steht nicht mehr fest in der Bahn. Es richtet sich danach, was auf ihr schon erreicht wurde:

> **Par = bestes je gespieltes Ergebnis + 1.** Hat die Bahn noch niemand gespielt, gilt das gebaute Par.

Damit sagt Par nicht mehr, was sich der Erbauer gedacht hat, sondern was hier tatsächlich möglich ist. Die
Meßlatte wandert mit: Wird ein Rekord verbessert, wird Par im selben Moment schärfer – für alle. Die Zahl in
der Bahn (`c.par`) bleibt als Anhalt für unbespielte Bahnen und für die Bahnprüfung stehen.

Entschieden wird das an **einer** Stelle, `Best.par(weltId, bahn)`; alles andere fragt dort nach – Kopfzeile,
Ergebnistafel, Endtafel, Rangliste, Turnierbildschirm und die Bedingung der Belohnungen. Für Bahnen aus der
Werkstatt gibt es keine Rangliste, dort bleibt das gebaute Par.

Zwei Folgen, die man kennen sollte:

- Ist der beste Wert **schlechter** als das gebaute Par, wird Par großzügiger – auf einer als Par 3 gebauten
  Bahn steht dann eine Weile „Par 6", bis jemand besser spielt. Das ist so gewollt (die Alternative wäre eine
  Deckelung auf das gebaute Par).
- Die Belohnung einer Welt rechnet gegen dieses Par. Verbessert jemand einen Rekord, kann eine bereits
  verdiente Belohnung wieder wegfallen. Der Championhelm hängt nicht am Par, sondern am Turnier.

Ein Hole-in-One bleibt ein Hole-in-One: `diffClass` und `scoreName` prüfen zuerst auf einen Schlag und erst
danach gegen Par.

### Turnier auf Zeit

Neben der Rangliste, die für immer läuft, gibt es ein **Turnier** in der Kolosseum-Welt: ein Ereignis mit
Anfang und Ende, und es dauert **eine Woche**. Alles daran hängt an zwei Zeilen ganz oben in `src/turnier.js`:

```js
const START = Date.parse('2026-09-08T18:00:00+02:00');
const TAGE = 7;                                  // Laufzeit: eine Woche
```

Das Ende wird aus der Laufzeit gerechnet statt noch einmal als Datum hingeschrieben. So steht die Regel
„eine Woche" da, wo sie gilt, und kann beim Verschieben des Starts nicht aus dem Tritt geraten. Soll das
Turnier zu einem festen Zeitpunkt enden statt nach einer Dauer, tauscht man `ENDE` gegen ein `Date.parse(…)` –
der Rest merkt davon nichts. Mehr braucht es nicht, um es zu verschieben. Daraus ergeben sich drei Zustände, und jeder Teil der Anzeige
richtet sich danach:

| Zustand | Weltkarte und Startbildschirm | Turnierbildschirm | Ergebnisse |
|---|---|---|---|
| vor dem Start | Band mit dem Startdatum | „hat noch nicht begonnen", beide Termine | werden nicht angenommen |
| während | Band mit der Restlaufzeit | Restlaufzeit als Uhr, dazu die Rangliste | zählen |
| nach dem Ende | Band „Turnier beendet" | als beendet gekennzeichnet | werden nicht mehr angenommen |

Gewertet wird die **Kombi-Wertung** über die ganze Runde, darunter stehen die besten Einzelbahnen – wie in
der Rangliste, nur eben nur für dieses Fenster. Der Kreativmodus ist ausgeschlossen; dort zählt ohnehin
nichts, weil man beliebig oft neu setzen darf.

**Der Championhelm ist der Siegerpreis.** Er geht erst nach dem Schlußpfiff über, und dann an den, der die
Rundenwertung anführt – solange das Turnier läuft, trägt ihn niemand, auch der nicht, der gerade vorn liegt.
Das ist der Sinn eines Preises: Er wird verliehen, nicht mitgenommen. `Hats.freigeschaltet('champion')`
fragt darum `Turnier.zustand() === 'vorbei'` und vergleicht den eigenen Namen mit dem ersten Eintrag der
Rundenwertung. Beim Schlußpfiff sagt das Spiel von sich aus Bescheid, wer gewonnen hat (`turnierEnde` in
`main.js`) – auch dem, der nicht gewonnen hat. Ein neues Turnier bekommt ein neues `KENNUNG` und damit ein
leeres Feld; der Helm ist dann wieder zu vergeben.

**Warum je Spieler eine eigene aufbewahrte Nachricht.** Die Rangliste kennt je Bahn nur den einen Rekord und
kommt deshalb mit einer gemeinsamen Tafel je Welt aus. Im Turnier soll ein Feld entstehen – Erster, Zweiter,
Dritter –, also braucht jeder Teilnehmer beim Vermittler seinen eigenen Platz, sonst überschriebe ein Eintrag
den anderen. Das Thema lautet `fantasygolf/v1/<marke>/turnier/t<START>/e/<kennung>` und ist damit dreifach
getrennt: von der Rangliste, von den Spielräumen und – durch den Startzeitpunkt im Namen – von jedem
früheren Turnier.

**Der Zeitstempel und eine Falle darin.** Jedes eingereichte Ergebnis trägt seinen Zeitpunkt; beim Anzeigen
fällt alles weg, was außerhalb des Fensters liegt. Die Rangliste kappt einen Zeitstempel aus der Zukunft auf
„jetzt", damit ein solcher Eintrag nicht jedes Zurücksetzen überlebt – diese Zeile aus `best.js` zu übernehmen
war ein Fehler und ist beim Prüfen aufgefallen: Sie schob einen Nachzügler von hinter dem Schlusspfiff genau
ins Fenster hinein und hebelte die Aussortierung aus. Im Turnier bleibt ein Zeitstempel darum stehen, wie er
ist, und wird nur beurteilt.

Geprüft wird alles Hereinkommende wie sonst auch – Namen und Bahnnamen durch `src/text.js`, Zahlen auf
Bereiche, dazu Obergrenzen für Teilnehmer und Bahnen je Eintrag. Dieselbe Prüfung läuft auch über das, was aus
dem Browser-Speicher kommt: Der überlebt Fassungswechsel und lässt sich von Hand ändern.

### Belohnungen: ein Skin je Welt

Jede Welt hat eine Belohnung, und man verdient sie sich am eigenen Können: **Die Summe der eigenen besten
Einzelbahnen muss unter dem Par der Welt liegen, und jede Bahn braucht ein Ergebnis.** Gerechnet wird gegen
das geltende Par – also gegen die Rangliste, siehe oben. Sieben Welten,
sieben Belohnungen – sechs davon sind **Ganzkörper-Skins**: Sie ersetzen den Ball, statt auf ihm zu
sitzen, und bewegen sich. Der Championhelm ist der einzige, der nur ein Hut ist.

**Wie der Hut über den Farbreif kommt.** Ein Ganzkörper-Skin bekommt nach dem Zeichnen einen dünnen Reif in
der Spielerfarbe (sonst wüsste bei vier Bällen niemand, welcher der eigene ist). Läge der Hut darunter, liefe
der Reif quer über die Hutkrempe. Darum darf eine Zeichenfunktion eine **Funktion zurückgeben**: `draw()` ruft
sie erst nach dem Reif auf. Eine Zeile in `draw()`, und der Kopfschmuck sitzt, wo er hingehört. Die Federkrone
braucht das nicht – bei ihr liegen die Federn bewusst *hinter* dem Reif, das Stirnband davor.

**Jede Belohnung ist ein Paar aus Ball und Hut**, und beide bewegen sich:

| Welt | Belohnung | der Ball | der Hut |
|---|---|---|---|
| Märchenland | Königskrone | weißes Porzellan mit blauem Rankenmuster: Blüte, Blätterranken, Randband; über die Glasur wandert ein Lichtstreifen | goldene Zackenkrone mit roten Steinen; die Steine blitzen auf, ein Lichtpunkt läuft über das Gold |
| Meereswelt | Aquarium | Becken mit Sand, Pflanzen, Fischen und Blasen | ein Schiffchen, das im Seegang rollt und sich hebt; die Segel bauschen sich, der Wimpel flattert |
| Tüftlerreich | Tüftlerzylinder | drei greifende Zahnräder und ein Kolben | Lederzylinder mit Messingband, Nieten und Schutzbrille; ein Rad an der Seite läuft mit, aus dem Schornstein dampft es |
| Dschungeltempel | Federkrone | dunkler Tempelstein, dessen Glyphen schwach grün glimmen | Federkrone in Türkis und Gold, die Spitzen wiegen sich |
| Sturmhimmel | Gewitterkugel | Wolken ziehen, es regnet, alle 2,2 s schlägt ein Blitz ein | ein Wetterhahn, der sich dreht – und beim Einschlag an der Spitze sprüht |
| Schattenreich | Kristallkugel | Schwaden waberen, ein Auge blickt umher und blinzelt | Spitzhut mit Mondschnalle; die Spitze schwankt, Sterne funkeln darauf |
| Kolosseum | Championhelm | (kein eigener Ball – der Helm sitzt auf dem Spielerball) | der Federkamm wiegt sich im Wind |

Vier der Skins teilen sich die Glaskugel-Form, damit sie als eine Familie zu erkennen sind – der Inhalt
macht die Welt. Zwei tanzen bewusst aus der Reihe: die Federkrone ist Stein, die Königskrone Porzellan. Bewegt wird nach `state.t`, der Spieluhr: dieselbe Zahl auf jedem Gerät, beim Online-Spiel
sehen also alle dasselbe. Weil ein Skin die Ballfarbe verdeckt, bekommt er einen dünnen Reif in der Farbe
des Spielers – sonst wüsste bei vier Bällen niemand, welcher der eigene ist.

**Was sich in jeder Kugel bewegt.** Nicht bloßes Hin und Her, sondern jeweils etwas, das man beobachten
kann: An der Königskrone ist es bewusst wenig: Ein Porzellanstück lebt vom Kontrast aus kühlem Weiß, tiefem
Kobaltblau und warmem Gold, nicht von vielen Einzelteilen – darum bewegt sich nur, was sich an echtem
Porzellan auch bewegen würde, nämlich der Glanz, wenn man es dreht. Im Aquarium schlägt jedem Fisch der Schwanz im Takt, die Brustflosse
kippt gegenläufig, Lichtstrahlen wandern, Pflanzen wiegen sich, Blasen steigen und werden dabei größer;
ein kleiner Schwarm zieht im Hintergrund vorbei. Im Zahnradwerk **greifen die Räder wirklich ineinander**
– der Radius folgt der Zähnezahl (gleicher Modul), und `eingriff()` rechnet aus, wie schnell und um wie
viel versetzt das nächste Rad laufen muss, damit Zahn in Lücke steht; die Kurbel auf dem großen Rad treibt
über ein Pleuel einen Kolben im Zylinder. An der Federkrone wiegen sich die Federn im Luftzug, und durch die
sieben Glyphen im Stein läuft langsam eine Welle: mal steht die eine heller, mal die andere. In der Gewitterkugel ziehen zwei Wolkenreihen unterschiedlich
schnell, es regnet durchgehend, und alle 2,2 Sekunden schlägt ein Blitz ein – seine Zackenform wird aus
der Nummer des Schlags gewürfelt, jeder Blitz sieht also anders aus, und der Schein klingt in mehreren
Stufen ab. In der Kristallkugel dreht sich die Iris, die Pupille weitet sich, und das Auge **blinzelt**
alle gut vier Sekunden. Der Championhelm hat als einziger Hut eine Bewegung: sein Federkamm wiegt sich.

**Zwei Feinheitsstufen.** `Hats.draw` liest aus der Leinwand, wie viele Bildpunkte der Ball wirklich breit
ist (`bildpunkte()`), und gibt das als `fein` an die Zeichenfunktion weiter. Unter `FEIN_AB` (34 Punkte
Radius) fallen Sterne, Kiesel, Muschel, Risse, Nieten, Ranken, Schraffuren und der Fischschwarm weg und
die Zahl der Flocken, Regenstriche und Blasen sinkt. Das kostet nichts an Wirkung – bei einem Ball von
vierzig Punkten ist eine Schneeflocke ein Bruchteil eines Punktes – und spart die Hälfte der Arbeit.

**Eine Regel, die beim Zeichnen viel ausmacht:** `globalAlpha` ist auf der Leinwand teuer. Gemessen an
zwanzig kleinen Kreisen: einzeln mit `globalAlpha` gefüllt 235 µs, einzeln mit `rgba()`-Farbe 120 µs, alle
zwanzig in **einem** Pfad mit **einer** Füllung 17 µs. Darum sammeln die Skins gleichfarbige Formen in
einem Pfad und füllen einmal; wo die Deckkraft je Stück schwanken müsste (Flocken, Funken, Sterne), steckt
das Schwanken in der Größe oder es gibt zwei, drei Gruppen statt zwanzig Einzelfüllungen. Nebenwirkung zum
Guten: Überlappende Teilformen decken sich in einem Pfad nicht mehr doppelt – die Wolkenbank der
Gewitterkugel wirkt seither wie eine Wolke statt wie gestapelte Flecken.

**Warum die besten Einzelbahnen und nicht eine Runde am Stück.** Eine fehlerfreie Runde über neun oder zehn
Bahnen wäre für die meisten unerreichbar – ein Patzer auf Bahn 8 wirft alles um. Bahn für Bahn dagegen ist es
eine Übung, die man sich Stück für Stück vornehmen kann: Man weiß immer, welche Bahn noch klemmt.

**Verglichen wird nur die Summe, nie eine einzelne Bahn.** `Best.fortschritt` addiert die eigenen besten
Schlagzahlen aller Bahnen und stellt sie der Par-Summe gegenüber; `geschafft` ist wahr, sobald jede Bahn ein
Ergebnis hat und `schlaege < par` gilt. Ob eine Bahn dabei drei über Par lag, spielt keine Rolle, solange
andere es hereinholen. Das steht auch in der Oberfläche ausdrücklich da (`lohn-regel` im Belohnungsblock,
`Hats.bedingung`), sonst versucht man es Bahn für Bahn und hält sich für gescheitert, obwohl man es nicht ist.

**Wie die Sperre funktioniert:** In `Hats.LIST` trägt eine Belohnung `welt: '<Weltkennung>'`, ein
Ganzkörper-Skin zusätzlich `voll: true`. Die eine Stelle, die entscheidet, ist `Hats.freigeschaltet(id)`; sie
fragt `Best.fortschritt(welt).geschafft`. Der Championhelm ist die Ausnahme: Er trägt `art: 'turnier'` und
ist der **Siegerpreis des Turniers** – siehe unten. Der Legionärshelm ist keine Belohnung und für alle da.

Ein Hut, der einem nicht (mehr) zusteht, wird beim Spielstart stillschweigend gegen den Vorgabehut
getauscht (`hutOderErsatz` in `main.js`); dasselbe gilt für den Hut, den man ins Online-Spiel mitbringt.
Ohne das trüge der Vorbesitzer den Preis weiter, nachdem er den Besitzer gewechselt hat.

**Der eigene Stand liegt getrennt.** Die Rangliste kennt je Bahn nur den einen Rekord, egal von wem. Für die
Belohnung zählt aber, was man *selbst* geschafft hat – darum führt jedes Gerät zusätzlich eine private Liste
(`Best.fortschritt`, `Best.eigenerWert`, `Best.eigenSumme`): je Welt und Bahn die eigenen Bestwerte **aller
drei Wertungen** als `{ s, ms, k }`. Sie können aus verschiedenen Versuchen stammen, genau wie in der
geteilten Liste. Ältere Stände hielten dort nur die blanke Schlagzahl; die wird beim Laden eingereiht statt
weggeworfen – sie ist ja mühsam erspielt. Geteilt wird nichts davon; über das Netz wäre es ohnehin nicht
nachprüfbar, und es geht niemanden etwas an.

**Der Kreativmodus wird beim Speichern abgewiesen**, nicht erst beim Anzeigen: `Best.hole` bekommt den Modus
mitgegeben und trägt gar nicht erst ein. Dort darf man beliebig oft neu setzen – jede Bedingung wäre damit
wertlos.

**Fortschritt sieht man.** In der Rangliste steht unter jeder Welt ein Block mit Balken: wie viele Bahnen
schon ein Ergebnis haben, welche noch fehlen, wie die Summe der eigenen besten Bahnen zum Par steht und wie
viele Schläge noch nötig sind. In der Hutwahl steht dasselbe kurz am gesperrten Platz. Und in dem Moment, in
dem die Bedingung fällt, sagt das Spiel es zweimal: sofort als Meldung und noch einmal als Zeile auf der
Ergebnistafel der Bahn – die Meldung allein ginge unter, weil `showMessage` über der Tafel schweigt.

In der Auswahl bleiben gesperrte Belohnungen **sichtbar**: blass, entfärbt, mit einem Schloss und dem
Hinweis, welcher Rekord dafür nötig ist. Man soll sehen, was es zu holen gibt. Gezeichnet wird ein
gesperrter Skin trotzdem in voller Farbe – kommt er über das Netz vom Ball eines Mitspielers, soll man ihn
sehen, ganz gleich was auf dem eigenen Gerät in der Rangliste steht.

**Auf dem Prüfstand sind die Sperren offen.** Vorschau und Einzeldatei sind zum Ansehen da – dort soll man
eine Belohnung aufsetzen können, ohne erst den Rekord zu holen. Entschieden wird das an einer Stelle in
`src/main.js`: `TEST_FREI` ist wahr, wenn `VORSCHAU` wahr ist (Pfad `…/vorschau/`) oder wenn `PRUEFSTAND`
gesetzt ist – diese Kennung schreibt nur der Bündel-Bau in die Einzeldatei, auf der echten Seite gibt es
sie nicht. Ein Klick auf eine gesperrte Belohnung setzt sie dann trotzdem auf und sagt kurz, dass sie nur
zum Ausprobieren freigegeben ist. Schloss und Bedingung bleiben sichtbar, damit man die Sperre nicht
vergisst; der Skin bleibt dabei farbig (`.hat.zu.probe`), sonst könnte man ja gerade nicht sehen, was man
aufsetzt. Im Spiel bleibt es beim Hinweis auf die Bedingung – dort ist die Sperre der halbe Reiz.

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

**In jeder Zelle steht der eigene Wert mit dabei**, grün unter dem Rekord – auch dann, wenn der Rekord einem
selbst gehört; dann steht er in Gold. Ohne das müsste man raten, wie weit man weg ist. Der eigene Wert kommt
aus der privaten Liste des Geräts und wird nirgends geteilt.

**Zwei Summenzeilen am Fuß der Tafel, und sie messen Verschiedenes:**

| Zeile | Was zusammengezählt wird |
| --- | --- |
| **Gesamt** | Die besten Einzelbahnen zusammen – je Bahn der beste Versuch, aus beliebig vielen Runden. Links der Rekord der Liste, rechts daneben der eigene Stand. Fehlt noch eine Bahn, steht die Summe trotzdem da, mit dem Zusatz „7 von 9". |
| **Ganze Runde** | Eine einzige Runde am Stück, von Bahn 1 bis zum Schluß. Dafür führt das Gerät keinen eigenen Stand – die Zeile bleibt beim Rekord. |

Die Belohnung einer Welt hängt an der **Gesamt**-Zeile, nicht an der ganzen Runde; einzig der Championhelm
hängt am Turnier.

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

**Den Hut wechselt man im Warteraum.** Vorher stand er nur im Startbildschirm fest: Wer erst im Raum sah,
dass ein anderer denselben trägt, musste hinaus, umwählen und neu beitreten. Jetzt steht unter den Sitzen
**Hut wechseln**; der eigene Platz stellt sich sofort um, und verteilt wird der Wechsel wie alles andere –
der Gastgeber schickt die Liste neu, ein Gast meldet sich einfach noch einmal an (seine Anmeldung trägt
Name und Hut ohnehin bei sich). Der Gastgeber behandelt eine zweite Anmeldung darum nicht als Fehler,
sondern übernimmt daraus Name und Hut, ohne den Platz zu ändern. Solange die Hutwahl offen ist, schiebt
sich der Warteraum nicht davor – sonst fiele man bei jedem Wechsel aus der Wahl heraus.

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

## Die Bahnen des Kolosseums

Zwölf Turnierbahnen in der hellen Arena, Stufe Legende, aufsteigend gebaut: Bahn 1 bis 4 führen je
ein bis zwei Hindernisarten ein, 5 bis 8 mischen sie, 9 und 10 kombinieren alles, und 11 und 12 sind
die grossen Schlussbahnen mit langem Weg zum Ass. Zwei Hindernisse kommen bewusst spät und stehen
nicht auf jeder Bahn: die **Löwenpforte** (Löwentor) ab Bahn 4, das **gleitende Gitter** (wanderndes
Tor) ab Bahn 5. Der **Feuerturm** steht nur auf Bahn 11, die **Kaiserloge** nur auf Bahn 12.

Sonst spielt die Arena mit **Gladiatoren** (dieselbe Figur wie die Ritter auf dem Burgberg, nur in
Sandfarben und Rot), dem **Streitwagen** (dieselbe Fähre wie die Lore in der Zwergenschmiede – seine
Spur sind zwei Rillen im Sand), dem **Katapult**, **Sprungschanzen** und **Steinrädern**.

| Nr. | Bahn | Par | Besonderheit |
|---|---|---|---|
| 1 | Gladiatorengasse | 2 | eine gerade Gasse, zwei Gladiatoren schreiten quer darüber |
| 2 | Sprungpodest | 3 | drei Podeste, dazwischen nichts als Luft: zwei Sprungschanzen tragen hinüber |
| 3 | Mahlsteine | 3 | zwei steinerne Mahlräder mitten im Sand |
| 4 | Löwenpforte | 3 | zwei Gassen, dazwischen die Arenamauer; nur die Löwenpforte führt hinüber, und nur mit Schwung |
| 5 | Gleitendes Gitter | 3 | ein Gitter mit einem einzigen Durchlass, der langsam hin und her gleitet; dahinter zwei Steinräder |
| 6 | Wagenrennen | 3 | der Streitwagen pendelt über den Graben, danach hilft nur noch die Schanze |
| 7 | Katapultbahn | 3 | aus der unteren Kammer geht es nur mit dem Katapult hinauf; oben patrouillieren die Wachen |
| 8 | Tierpforten | 5 | drei Kammern, zwei Löwenpforten; in der mittleren zieht der Streitwagen seine Runden |
| 9 | Sandsturm | 5 | Gitter, Mahlsteine und Gladiatoren auf einmal – und am Ende die Schanze über den Graben |
| 10 | Die Spina | 6 | ein voller Rundkurs um die Spina: Katapult, Streitwagen, Steinräder, und die Pforte führt in die Kammer im Herzen der Arena |
| 11 | Der Feuerturm | 7 | grosse Schlussbahn: unten streicht der Feuerstrahl über den Sand, oben sperrt das Gitter, vor dem Loch klafft der Graben |
| 12 | Die Kaiserloge | 7 | grosse Schlussbahn: drei Geraden, Löwenpforte, Streitwagen und Schanze – und oben dreht der Kaiser nach jedem Schlag den Daumen |

Die Deko neben den Bahnen ist gebaut, nicht gemalt: Säulen, Krüge, Obelisken und Feuerschalen
bestehen aus Prismen und Kegelstümpfen in Weltkoordinaten (`frustum` in `src/render.js` ist das
Gegenstück zu `prism` für verjüngte Körper – Krugbauch, Obeliskenschaft, Feuerschale). Damit stehen
sie in derselben Sicht wie Mauern und Türme, bekommen ihre Schattenseite von selbst und drehen sich
mit der Kamera mit. Flach bleibt nur, was keine Seiten hat: die Flamme in der Schale und das Tuch
der Banner.

Ein Fallstrick dabei: `frustum` füllt immer seine Deckfläche. Ein farbiger Zierreif am Krugbauch
darf deshalb nur an den Seiten farbig sein – sonst legt sich von oben gesehen ein bunter Deckel über
den halben Krug.

Auf den drei mehrteiligen Bahnen (10, 11, 12) führen **Blickzonen** die Kamera: Liegt der Ball in
einer Zone, schaut sie auf deren Blickpunkt statt aufs Loch. Ohne das schaute man vom Start der
Kaiserloge quer über zwei Mauern hinweg zum Loch, während man in die andere Richtung spielt – auf
einem Rundkurs wie der Spina liegt das Loch sogar in der Mitte. Die Blickpunkte liegen bewusst weit
außerhalb der Karte, damit die Richtung über die ganze Zone stabil bleibt und nicht umspringt,
sobald der Ball an ihnen vorbeirollt. Das Feld heißt `views` und steht schon länger in `courses.js`
zur Verfügung.

Das Par steht nicht nach Gefühl da, sondern nach Messung: `node tools/audit/audit.mjs colosseum`
spielt jede Bahn mit einem Durchschnittsspieler-Bot durch, und das Par ist dessen gerundeter Schnitt.
Wo der Bot deutlich unter dem Par blieb oder gar nicht ins Loch kam, wurde die Bahn geändert, nicht
die Zahl.

Die Karten dieser Welt werden nicht von Hand getippt, sondern von `tools/arena.py` aus Rechtecken
zusammengesetzt und nach `src/courses_colosseum.js` geschrieben. So bleiben alle Zeilen gleich lang,
und eine Änderung an einer Kammer zieht nicht Dutzende Zeichen nach sich. Nach jedem Lauf gehören
`node tools/validate.mjs` und `node tools/audit/audit.mjs colosseum` dazu.

## Der Schneeberg

Zwölf Bahnen, Stufe Profi, und sie liegen zwischen Tüftlerreich und Dschungeltempel – die Reise
macht ihretwegen einen Bogen nach oben, so wie man einen Berg hinauf und wieder hinunter geht.

**Die Frage der Welt ist *wohin*.** Das Märchenland fragt, wie fest man schlägt, der Uhrenturm
fragt, wann – hier versetzt der Wind jeden rollenden Ball, und wer geradeaus zielt, kommt nicht an.
Entscheidend ist, dass er **ablesbar** ist: Der Wind dreht im festen Takt durch Ost, Süd, West und
Nord, die Fahne zeigt die nächste Richtung als blassen Pfeil, bevor sie kommt, und zwischen zwei
Richtungen ist **einen Augenblick Flaute**. Wer wartet, kann gerade schlagen; wer nicht warten
will, zielt daneben. Darum steht der Wind auf jeder Bahn quer zum Weg und nie längs – sonst wäre er
nur Rücken- oder Gegenwind und man könnte ihn aussitzen. Einen liegenden Ball rührt er nie an; das
wäre Schikane statt Aufgabe.

**Der zweite Faden ist die Höhe.** Vier Abschnitte zu je drei Bahnen, jeder mit eigener Palette,
und sie werden nach oben hin kälter, schmaler und ausgesetzter:

| Bahnen | Palette | Was dort neu ist |
|---|---|---|
| 1–3 | `snowfoot` – Nadelwald, festgetretener Schnee, Mittagslicht | Der Wind; Tiefschnee (`s`) bremst; die erste Lawine |
| 4–6 | `snowrock` – Fels tritt hervor, Schnee nur in den Rinnen | Schmale Bänder, die Seilbahn, die erste Schneebrücke |
| 7–9 | `glacier` – Blaueis, Spalten, Schneetreiben | Blankeis (`i`) rutscht; zwei Wächten hintereinander |
| 10–12 | `summit` – dünne Luft, fast schwarzblauer Himmel, Sterne am Tag | Der Grat, und darüber die Wolkenetagen |

### Die vier Maschinen (`src/obstacles_snow.js`)

| Maschine | Was sie tut |
|---|---|
| **Windfahne** (`windfahne`) | Dreht den Wind alle `WIND_HALT` Sekunden weiter, mit `WIND_DREH` Sekunden Flaute dazwischen. Sie wirkt auf der ganzen Bahn, nicht in einem Feld – das ist der Unterschied zum Wind-`field` der anderen Welten: Dort ist Wind eine Stelle, hier ist er das Wetter. Fahne, Windsack und der über den Boden treibende Schnee zeigen alle dasselbe. |
| **Lawine** (`lawine`) | Fegt alle `LAWINE_TAKT` Sekunden durch ihren Streifen; `LAWINE_WARNUNG` Sekunden vorher staubt es an der Abrisskante. Wer offen liegt, wird ein Stück mitgenommen – kein Strafschlag, nur Weg. **Hinter einem Felsblock (`x`) passiert nichts:** Vom Ball aus wird bis `LAWINE_SCHUTZ` Kacheln gegen die Laufrichtung geschaut, und die hellen Keile im Schnee zeigen, wie weit die Deckung reicht. Damit ist es die erste Maschine, vor der man sich *versteckt* statt sie zu umgehen – und die Felsen sind nicht mehr Deko, sondern Deckung. |
| **Seilbahn** (`seilbahn`) | Gondel am Stahlseil zwischen zwei Stationen, Verhalten wie die Fähre. Dazu darf sie mit `ziel` die **Ebene wechseln**: Die Bergstation liegt dann eine oder mehrere Wolkenetagen höher, und das Seil steigt sichtbar dorthin. Sie ist damit zugleich Brücke und Aufstieg – was eine Bergbahn eben tut. |
| **Schneebrücke** (`schneebruecke`) | Trägt genau einen Schlag lang. Hat der Ball sie überquert, bricht sie hinter ihm ein; beim nächsten Schlag liegt sie wieder da. Sie ist das Gegenstück zur Luke des Uhrenturms: Die fragt *wann*, diese fragt, ob man den Weg zu Ende denkt. Gibt es eine Ebene darunter, fällt man ohne Strafschlag dorthin; gibt es keine, ist es ein Loch im Berg wie jedes andere – **genau dieser zweite Fall fehlte zuerst**, und die gebrochene Brücke tat auf einer Bahn ohne untere Ebene gar nichts. |

### Die Wolkenetagen

Oben sind die Ebenen dieselbe Mechanik wie im Uhrenturm – `map` ist die unterste Fläche, `ebenen`
sind die darüber, alle deckungsgleich, und hinunter geht es an jeder offenen Kante (`o`) ohne
Strafschlag. Nur **gezeichnet** werden sie anders: Eine Palette mit `ebeneStil: 'wolke'` lässt
`Renderer.zeichneWolke` statt der Steinscholle eine Wolkenbank malen – weiche Ballen, die nach
unten ins Blaue auslaufen, und an den geschlossenen Kanten ein Wall aus dichteren Ballen statt
einer Brüstung. Man soll sehen, wo die Wolke trägt und wo sie aufhört.

Hinauf führt hier die Seilbahn statt der Turbine: Bahn 11 hat eine Wolke, Bahn 12 zwei
übereinander, verbunden durch eine Gondel und getrennt durch eine Schneebrücke.

### Was die alten Sachen hier anders machen

Der Boden braucht nichts Neues, nur die richtigen Farben: **`s` ist Tiefschnee** (bremst),
**`i` blankes Eis** (rutscht), **`x` ein Felsblock** – und der ist jetzt keine Kiste mehr. Mit
`blockStil: 'fels'` zeichnet `Renderer.drawSchneefels` einen verschneiten Brocken aus zwei
gekippten Prismen mit Schneehaube, und keine zwei sehen gleich aus. Das ist nicht nur hübscher:
Hinter diesen Brocken versteckt man sich vor der Lawine, also müssen sie auch danach aussehen.
Dazu eine neue Atmosphäre `blizzard` – Schnee, der nicht fällt, sondern in Böen waagerecht weht.

Die Karten entstehen mit `tools/schneeberg.py` und werden dort schon beim Bauen geprüft: Jede
Windfahne muss auf der Bahn stehen, in jedem Lawinenstreifen muss Bahn **und mindestens ein Block**
liegen (ohne Deckung wäre sie keine Aufgabe, sondern Warten), beide Stationen einer Seilbahn müssen
auf ihrer jeweiligen Ebene Bahn sein, und eine Schneebrücke muss auf Bahn liegen – sonst wäre sie
von Anfang an ein Loch.

## Die Bahnen des Uhrenturms

Vierzehn Bahnen, Stufe Profi, und die letzte Welt des Spiels. Was sie von allen anderen trennt,
ist die Frage, die sie stellt. Jede andere Welt fragt, **wie fest und wohin** man schlägt; diese
fragt zuerst **wann**. Darum steht auf jeder Bahn mindestens eine Maschine vor einer Stelle, an der
kein Weg vorbeiführt – eine Tür, eine Lücke, ein Rohr, eine Etage –, und sie gibt diese Stelle nur
zeitweise frei. Wer zusieht und mitzählt, kommt durch; wer nur fest schlägt, nicht.

Das ist der Unterschied zum **Tüftlerreich**, das ihr am nächsten kommt: Dort ist jede Bahn eine
eigene Erfindung, die man erst verstehen muss. Hier ist es immer dieselbe Frage, und nur die
Antwort ändert sich.

**Größer als der Rest.** Weil es die Schlusswelt ist, sind ihre Karten durchweg weiter gebaut als
die der übrigen Welten: die schmalste ist 34 Kacheln breit, die weiten 40 bis 42, das Zifferblatt
36 auf 26. Zum Vergleich liegt das Märchenland bei 24 bis 26, das Kolosseum bei 24 bis 38.

**Aufbau.** Bahn 1 bis 4 sind flach und führen je ein bis zwei Maschinen ein. Bahn 5 bringt die
**erste zweite Ebene** – eine einzige Turbine, sonst nichts Neues. Bahn 6 ist eine flache
Atempause. Bahn 7 und 8 bringen die beiden anderen Wege hinauf, **Aufzug** und **Zahnstange**, dazu
die **Luke**. Bahn 9 bis 11 mischen, was da ist; Bahn 12 stapelt drei Etagen, die nur durch
Kupferrohre verbunden sind; Bahn 13 ist der Rohrturm, und Bahn 14 ist der Höhepunkt. Das **Kupferrohr** kommt ab Bahn 4 vor, die
**Hemmung** ab Bahn 6 – beide bewusst nicht auf jeder Bahn, damit sie nicht zur Gewohnheit werden.
Das **wandernde Loch** steht auf vier Bahnen: klein auf 6, 9 und 11, und als ganzes Zifferblatt
auf 13.

| Nr. | Bahn | Größe | Par | Maschinen | Der Moment, auf den man wartet |
|---|---|---|---|---|---|
| 1 | Marktplatz | 34×13 | 3 | Pendel | Die einzige Tür in der Mauer, vor der das Pendel schwingt |
| 2 | Glockengasse | 38×13 | 4 | Pendel ×2 | Zwei Türen, versetzte Pendel – die eine passt, wenn die andere nicht passt |
| 3 | Räderwerkstatt | 38×13 | 4 | Zahnradfeld, Pendel | Das Feld hält am Ufer an: einsteigen, tragen lassen |
| 4 | Rohrpost | 38×13 | 4 | Kupferrohr, Pendel | Das Rohr nimmt einen immer – man sieht schon vorher, wo es endet |
| 5 | Turbinenhalle | 38×15 | 4 | Pendel, **Turbine**, zweite Ebene | Der Windstoß hebt eine Etage – zu schnell, und man schießt oben über die offene Kante zurück |
| 6 | Hemmwerk | 38×13 | 4 | Hemmung, Pendel, wanderndes Loch | Die offene Hälfte des Ganges, dann die Tür – und dahinter bleibt das Loch nicht liegen |
| 7 | Federkammer | 40×17 | 5 | Federwerk, **Aufzug**, **Luke** | Hinauf ist einfach – oben muss die Luke gerade zu sein |
| 8 | Zeigerhof | 40×19 | 5 | Zeigerarm, **Zahnstange** | Hinter dem Zeiger her, dann rechtzeitig auf die Schaufel und warten |
| 9 | Kesselhaus | 40×15 | 5 | Pendel, Kupferrohr, Federwerk, wanderndes Loch | Erst durch die Tür, dann ins Rohr – und auf dem Podest wandert das Loch |
| 10 | Glockenturm | 42×17 | 5 | Pendel, Hemmung, Aufzug, Luke | Drei Takte, von denen keiner zum anderen passt – und die Glockenstube liegt eine Etage höher |
| 11 | Räderschacht | 42×17 | 6 | Zahnradfeld, Zeigerarm, Zahnstange, wanderndes Loch | In die Endkammer führt unten keine Tür; hinein kommt nur, wer vom Steg ohne Geländer fällt |
| 12 | Kupferlabyrinth | 42×17 | 6 | Kupferrohr ×3 (zwei davon zwischen Ebenen), Hemmung | Drei Kammern übereinander, verbunden allein durch Rohre |
| 13 | Der Rohrturm | 42×19 | 6 | Kupferrohr ×6, Luke, weit gestapelte Etagen | Sieben kleine Inseln, keine berührt die andere – und das Loch liegt auf der mittleren Etage |
| 14 | Das große Zifferblatt | 36×26 | 6 | Turbine, Zifferblatt, Zeigerwerk, Zeigerarm, Pendel ×3 | Vom Steg auf das Blatt fallen lassen – und wo man sich fallen lässt, entscheidet alles |

**Warum die Welt neu gebaut wurde.** Die erste Fassung hatte zwölf flache Bahnen plus eine
Testbahn „Maschinenprobe", die am Ende hing und im Par mitzählte. Nachgemessen stimmten außerdem
drei Pars nicht: Kesselhaus lag im Median bei 6 statt 4, Räderschacht bei 7 statt 5, und die
Schlussbahn bei 3 statt 6 – zwölf Marken auf einem Ring mit Radius 6,5 liegen so dicht, dass von
jedem Punkt am Blattrand eine kurze, freie Linie zu irgendeiner Marke führt. Beides ist mit dem
Umbau erledigt: Die Testbahn ist aufgelöst, ihre vier Maschinen stehen jetzt in richtigen Bahnen
(5, 7, 8 und 12), und die Schlussbahn hat den abgemauerten Anlauf bekommen, den sie brauchte –
der Abschlag liegt im **Werkgang** am Rand, und vom Blatt trennt ihn die Leere. Hinüber kommt nur,
wer die Turbine nimmt und über den Steg fährt.

**Die Pars stehen auf dem Bot-Durchlauf.** `node tools/audit/audit.mjs clock` spielt jede Bahn
sechsmal mit einem Normalspieler und sucht dazu die beste Lösung. Gewertet wird danach: Par ist
grob die beste Lösung plus zwei, bei den schweren Bahnen plus drei, und nie unter dem, was ein
mittlerer Spieler braucht.

**Der Weltpreis** ist die **Taschenuhr** (`pocketwatch`) – eine Kugel mit durchbrochenem Zifferblatt,
laufenden Rädern, schwingender Unruh und der Aufzugkrone obendrauf. Sie hängt an derselben Regel
wie die Preise der anderen Welten: jede Bahn braucht ein Ergebnis, und die Summe muss unter Par
liegen. In der Rangliste steht der Uhrenturm mit allen drei Wertungen zwischen den übrigen Welten.

### Das wandernde Loch

Das Loch ist in dieser Welt nicht immer ein fester Punkt. Die Maschine `wanderloch`
(`src/obstacles_legend.js`) setzt `level.cup` alle `WANDERLOCH_TAKT` Sekunden – zehn – auf die
nächste Stelle ihrer Liste und beginnt danach wieder vorn. Sie kennt zwei Formen:

- **Freie Stellen.** `{ type: 'wanderloch', stellen: [[x, y], …] }` nimmt zwei oder mehr beliebige
  Punkte auf der Bahn. So steht sie auf **Bahn 6** (drei Stellen im Gang hinter der Tür), **Bahn 9**
  (drei auf dem Podest über der Glut) und **Bahn 11** (drei in der Endkammer). Auf dem Boden
  verbindet eine gestrichelte Linie die Stellen in der Reihenfolge, in der sie drankommen.
- **Der Ziffernkreis.** `{ type: 'wanderloch', x, y, r, marken: 12 }` legt die Stellen selbst auf
  die Stundenmarken eines Zifferblatts, beginnend oben und im Uhrzeigersinn. Das ist die
  Schlussbahn 13. Der alte Typname `dial` tut dasselbe und bleibt gültig, damit ältere Bahnen
  weiterlaufen.

**Man muss vorher sehen, wohin es geht**, sonst ist es Glück statt Timing. Darum leuchtet die
**nächste** Stelle heller als die übrigen, und um das aktuelle Loch schrumpft ein Ring, der abläuft,
bis gewechselt wird. Beides zeichnet `Renderer.drawWanderlochFloor` in den Boden, also unter alles
andere.

**Was es kostet.** Der Bot wartet nie – er puttet sofort auf das Loch, das gerade da ist. Das ist
der härteste denkbare Maßstab für ein wanderndes Loch, und gemessen wurde jede Bahn einmal mit und
einmal ohne:

| Bahn | ohne wanderndes Loch | mit | Aufschlag |
|---|---|---|---|
| 5 Hemmwerk (3 Stellen) | – | Median 4 bei Par 4 | keiner |
| 8 Kesselhaus (2 Stellen) | Median 6 | Median 6 | keiner |
| 10 Räderschacht (3 Stellen) | Median 7 | Median 8 | ein Schlag |

Es kostet also höchstens einen Schlag, und zwar auch den nur, wo ohnehin schon vier Maschinen
stehen. Der Grund ist die Vorschau: Wer die helle Stelle sieht, legt den Schlag hin und der Ball
kommt an, wenn das Loch da ist – warten kostet nichts, nur Geduld.

**Nicht auf die Messung hereinfallen.** Der erste Durchlauf des Kesselhauses mit wanderndem Loch sah aus
wie eine Verschlechterung, und das Loch wurde daraufhin auf eine andere Bahn geschoben. Der
Kontrolllauf **ohne** das Loch lieferte danach dasselbe Bild: Die Bahn war aus einem anderen Grund
zäh. Seither gilt hier die Regel, vor jeder Zuweisung erst die Vergleichsmessung zu machen – eine
einzelne Bot-Runde über sechs Spiele trägt keine Ursachenbehauptung.

Zwei Dinge prüft `tools/validate.mjs` dafür: Jede Stelle muss auf hartem Boden liegen, und keine
zwei dürfen auf derselben Kachel sitzen – sonst stünde das Loch zweimal hintereinander am selben
Fleck. Das `H` der Karte gehört auf die **erste** Stelle, denn von dort startet die Maschine; in
`tools/uhrenturm.py` verschiebt der Baustein `wanderloch` es von selbst dorthin.

### Gestapelte Ebenen (Versuch)

Der Uhrenturm bekommt weitere Spielflächen übereinander. Das ist **keine Höhenphysik**, sondern ein
Umschalter: Der Ball ist immer auf genau einer Fläche und kollidiert nur mit deren Wänden. Jede
Bahn kann pro Ebene eine eigene ASCII-Karte haben – `map` ist die unterste, `ebenen: [...]` sind
die darüber (`oben` ist die Kurzform für genau eine). Alle sind gleich groß und deckungsgleich.
Wie viele es sein dürfen, steht nirgends fest; zwei bis drei sind gut zu lesen, darüber wird das
Bild eng.

| | |
|---|---|
| **Hinauf** | nur über die **Turbine** (`turbine`), ein Gebläseschacht. Sie steht auf der Ebene `ebene` (ohne Angabe der untersten) und hebt auf die nächste darüber. Wer darüberrollt, wird an derselben Stelle gehoben – Tempo und Richtung bleiben. Kein Katapult, ein Aufzug. Für jede Etage steht eine eigene Turbine. |
| **Herunter** | an jeder **offenen Kante**. Offen heißt: die Karte hat dort ein `o` (Boden ohne Bande) oder nichts. Der Ball fällt an derselben Stelle **so weit, bis wieder Boden unter ihm ist** – über mehrere Etagen hinweg, wenn es sein muss – und rollt dort weiter, **ohne Strafschlag**. |
| **Der Aufzug** | (`aufzug`) ist eine Kabine zwischen zwei Führungsschienen, oben die Umlenkrolle. Er ist der **verlässliche** Weg nach oben: Die Kabine wartet unten, wer hineinrollt fährt mit (`AUFZUG_FAHRT`), oben setzt sie ab und kommt nach `AUFZUG_HALT` von selbst zurück. Kein Takt, den man abpassen muss – das macht in dieser Welt die Zahnstange. Der helle Kabinenboden und das Lämpchen am Schacht sagen, ob sie gerade aufnehmen kann. |
| **Die Zahnstange** | (`zahnstange`) ist eine Schaufel an einer gezahnten Schiene. Sie wartet unten (`ZAHNSTANGE_TAKT`), fährt hoch (`ZAHNSTANGE_FAHRT`), wartet oben, kommt zurück. Mitgenommen wird, wer beim Losfahren daraufsteht – man muss also rechtzeitig **daraufkommen und warten**. |
| **Das Kupferrohr** | darf sein Ende eine Etage höher haben: `ebene` ist die Ebene des Rohrmunds, `ziel` die des Rohrendes. Jedes Ende wird auf seiner eigenen Karte gesucht. |
| **Die Luke** | (`luke`) ist eine Klappe im Boden einer Ebene, die im Takt auf- und zugeht. Zu ist sie fester Boden, offen ein Loch – wer dann darüberrollt, fällt wie an einer offenen Kante, ohne Strafschlag. `LUKE_TAKT` und `LUKE_SCHWENK` als Konstanten, `phase` je Luke. |
| **Das Loch** | liegt auf genau einer Ebene (das `H` steht in genau einer der Karten) und zieht nur, wenn der Ball auch dort ist. |
| **Der Abstand** | ist standardmäßig 2 Kacheln (`EBENE_Z`). Eine Bahn darf ihn mit `ebeneZ` überschreiben (1 bis 6). Das ist reine Optik – die Physik kennt keine Höhe zwischen den Ebenen. Der **Rohrturm** stapelt mit 4,2, damit man sieht, dass zwischen seinen Etagen nichts ist außer dem Rohr, das hindurchsteigt. Die Schürze der Schollen wächst dabei mit, sonst sähe eine weit gehobene Ebene aus wie eine schwebende Platte. |

**Wie das im Code aussieht.** `buildLevel` baut aus jeder Karte eine Fläche mit eigenen Kacheln,
Kollisionskanten, Mauern und Blöcken. Das Level trägt immer die Felder der Ebene, auf der der Ball
gerade ist; `level.setzeEbene(n)` hängt sie um. Die Physik liest sie in jedem Schritt neu – deshalb
braucht sie keinen zweiten Satz Regeln und keine Sonderfälle, nur einen Filter: Es wirken nur die
Hindernisse der eigenen Ebene (`ob.ebene`, ohne Angabe 0). Laufen tun alle, damit die andere Ebene
nicht stehenbleibt, während man nicht hinschaut.

**Gezeichnet** werden immer alle Flächen: die unterste wie bisher, jede weitere als angehobene
Scholle mit Schürze und Brüstung, von unten nach oben, damit eine höhere die darunter verdeckt.
Voll gezeichnet wird die, auf der der Ball ist, die anderen halb durchsichtig – man soll von unten
sehen, wohin die Turbine führt, und von oben, wo man herunterkommt. Die offenen Kanten sind hell gestrichelt: Der Fall soll wie ein Weg aussehen, nicht
wie ein Fehler. Ein Fallstrick dabei: Die obere Fläche darf nicht Kachel für Kachel als Körper
gezeichnet werden – bei halber Durchsicht sähe man ein Gitter aus lauter inneren Seitenflächen. Nur
der Rand bekommt seine Schürze.

**Die Zielhilfe kommt ganz zum Schluss.** Sie wurde bis Fassung 74 beim Boden gezeichnet, also
unter allem, was danach kam. Stand der Ball auf einer oberen Ebene, malte deren Scholle den Pfeil
zu – man konnte ganz normal aufladen und schießen, sah nur nicht mehr, wohin. Das ist schlimmer als
gar keine Hilfe, weil man den Fehler dann bei sich sucht. Jetzt wird sie nach Ball und Schollen
gezeichnet. Geprüft wird das mit Pixeln: `scratchpad/aim.mjs` zählt die Punkte in der Farbe der
Zielhilfe vor und nach dem Aufladen, auf der untersten Ebene wie auf einer oberen.

`tools/validate.mjs` prüft die beiden Fehler, die man im Spiel erst merkt, wenn man ratlos
davorsteht: eine **Ebene, die von nirgends erreichbar ist**, und ein **Loch auf einer Ebene, zu der
kein Weg führt**. „Erreichbar" heißt dabei ausdrücklich nicht „hat einen Aufzug von direkt
darunter": Der Rohrturm führt mit einem Rohr von ganz unten auf die oberste Etage und von dort
durch eine Luke auf die mittlere – seine mittlere Ebene hat gar keinen Aufstieg und ist trotzdem
in Ordnung. Die Erreichbarkeit wird über alle Etagen zugleich gerechnet, und
zwar in beide Richtungen: hinauf über einen Aufzug, hinunter über eine offene Kante oder eine
Luke. Beides muss zusammen gerechnet werden, denn ein Sturz öffnet auch wieder eine untere Ebene –
die Endkammer auf Bahn 11 hat unten keine Tür und ist trotzdem erreichbar, weil ein Steg darüber
endet. Darum läuft die Prüfung nicht einmal von unten nach oben, sondern so lange, bis sich nichts
mehr ändert. Dazu die Kleinigkeiten, die dasselbe bewirken: alle
Karten müssen deckungsgleich sein, der Abschlag gehört ganz nach unten, das `H` darf nur einmal
vorkommen, über jeder Turbine muss Boden sein (sonst fiele der Ball im selben Augenblick zurück),
und auf der obersten Ebene hat eine Turbine nichts verloren. Für Luken dasselbe in Grün: Sie
müssen auf ihrer Ebene auf der Bahn liegen (zu wären sie sonst kein Boden), dürfen nicht auf der
untersten Ebene sitzen, und unter ihnen muss irgendwo Boden sein – sonst wäre die Luke ein Sturz
ins Aus, und das wäre eine Falltür und keine Luke.

**Der Rohrturm** treibt beides auf die Spitze. Sieben kleine Inseln, keine berührt die andere, und
dazwischen gibt es nichts als sechs Kupferleitungen – auf dem Abschlagsfleck führt genau ein Weg
weg, und das ist der Rohrmund. Dafür kennt die Karte jetzt **sechs** Buchstabenpaare (`A`/`a` bis
`F`/`f`) statt drei; die Großbuchstaben sind begehbar, die Kleinbuchstaben Mauer. Zwei Leitungen
bleiben auf ihrer Ebene, eine springt von ganz unten auf den obersten Steg, eine verbindet die
beiden Stege oben, eine die beiden Galerien in der Mitte, und die letzte bringt von der Lochgalerie
wieder hinauf. Das Loch liegt auf der mittleren Etage, und hinauf führt dorthin nichts: Man kommt
nur von oben hinein, durch die Luke im Steg.

Dabei fiel ein Loch in der Bahnprüfung auf: Ein Rohr, das auf **seiner** Ebene bleibt, zählte gar
nicht als Verbindung – die Portalrechnung sieht nur die unterste Karte. Eine Insel, zu der nur so
ein Rohr führt, hätte als unerreichbar gegolten. Jetzt zählen alle Rohre auf allen Ebenen.

**Die Kamera schaut in Bahnrichtung, nicht aufs Loch.** Vorgabe ist der Blick aufs Loch; wo die
Bahn woanders hinläuft, setzt `views` eine Blickzone. Im **Werkgang** des Zifferblatts etwa geht es
nach Osten zur Turbine, das Blatt liegt aber im Süden – ohne Zone zielte man quer zur Gasse. Zwei
Dinge waren dafür neu: Eine Zone darf sich mit `ebene` auf eine Etage beschränken (auf gestapelten
Bahnen liegen Steg und Galerie im Bild übereinander, und man will dort in ganz verschiedene
Richtungen schauen), und der Blickpunkt ist jetzt **das Ziel selbst** statt einer Richtung in der
Ferne: Auf einer kleinen Insel steht man mal nördlich, mal westlich des Rohrmunds, und die Kamera
soll sich danach richten. Geprüft wird das mit `scratchpad/blickpruef.mjs`: Es vergleicht auf jeder
begehbaren Kachel jeder Ebene die Blickrichtung mit dem Gefälle der BFS-Distanzkarte und zählt, wo
beides um mehr als 70° auseinanderliegt. Der Rohrturm ging dabei von 16 % der Kacheln auf 1 %,
Federkammer, Glockenturm, Räderschacht und Turbinenhalle auf 0 %.

**Warum der Kettenzug wieder weg ist.** Bis Fassung 73 stand an der Stelle des Aufzugs ein
Kettenzug: Haken an einer umlaufenden Kette, die nur für einen Augenblick unten stehen. Wer die
Stelle in diesem Fenster berührte, wurde mitgenommen, sonst nicht. Im Spiel traf das fast nie, und
schlimmer: Wer danebenrollte, konnte nicht unterscheiden, ob er etwas falsch gemacht hatte oder nur
Pech hatte. Eine Maschine, deren Misserfolg man sich nicht erklären kann, lehrt nichts – und die
ganze Welt lebt davon, dass man aus dem Zusehen lernt. Der Aufzug macht dasselbe verlässlich; das
Abpassen übernimmt die Zahnstange, wo man es wenigstens kommen sieht.

**Turbine und Luke sind das Paar.** Die eine hebt eine Etage, die andere wirft eine hinunter, und
beide fragen dasselbe wie der Rest der Welt: nicht wie fest, sondern wann. Vom Falltür-Hindernis
des Schattenreichs unterscheidet sich die Luke genau in einem Punkt – die Falltür ist eine Strafe
(Strafschlag, zurück zum Schlagstart), die Luke ist ein Weg. Wo es eine Ebene darunter gibt, ist
Hinunterfallen kein Unglück mehr, sondern Zeitverlust.

**Eine Testbahn gibt es nicht mehr.** Bis Fassung 71 hing am Ende der Welt eine schlichte
„Maschinenprobe", die alle Wege nach oben nebeneinander zeigte und im Par der Welt mitzählte. Mit
dem Umbau der Welt ist sie aufgelöst: Die Turbine steht jetzt auf Bahn 5 und 13, Aufzug und
Luke auf 7 und 10, die Zahnstange auf 8 und 11, und die Rohre zwischen den Ebenen auf 12. Jede
Maschine wird da eingeführt, wo sie gebraucht wird, und keine Bahn ist mehr bloß eine Probe.

**Was noch fehlt:** Der Baumodus kann keine Ebenen – das kommt erst, wenn sich die Sache bewährt.
Geteilte Bahnen mit mehreren Ebenen werden deshalb abgelehnt statt stillschweigend um ihre oberen
Karten gebracht. Und gezeichnet werden ein paar Maschinen bisher nur auf der untersten Ebene
richtig: Turbine, Hemmung, Pendel, Zeiger und das wandernde Loch liegen im Boden und kennen keine
Etage. Darum stehen sie in den Karten auch immer unten; Aufzug, Zahnstange, Luke und Kupferrohr
dagegen können auf jeder Ebene sitzen.

### Das Zeigerwerk: drei Zeiger, drei Wirkungen

Der **Zeigerarm** von Bahn 8 und 11 ist eine Mauer, die sich dreht – er schiebt den Ball vor sich
her. Das **Zeigerwerk** der Schlussbahn ist das Gegenteil: drei Zeiger auf einer Achse, die gar
nichts anstoßen, sondern **Felder** mit sich führen, so wie die Korallen im Korallenriff. Man
rollt hindurch, und unterwegs passiert etwas.

| Zeiger | Umlauf | Feld | Wirkung |
|---|---|---|---|
| Stundenzeiger, kurz und dick | `ZEIGERWERK_STUNDE` = 24 s | breit, blau | **bremst** – wer darin liegt, bleibt liegen |
| Minutenzeiger, mittel | `ZEIGERWERK_MINUTE` = 12 s | mittel, grün | **stößt weg** – drückt den Ball von seiner Linie fort |
| Sekundenzeiger, lang und dünn | `ZEIGERWERK_SEKUNDE` = 4 s | schmal, rot | **zieht an** – sammelt den Ball auf seine Linie und reißt ihn mit herum |

Die drei Farben sind die der Korallen (blau bremst, grün stößt, rot zieht), damit niemand sie neu
lernen muss. Alle drei starten auf zwölf Uhr und gehen im Uhrzeigersinn; `phase` verschiebt das
ganze Werk, nicht die Zeiger gegeneinander – sonst ginge die Uhr falsch. Die Stärken stehen als
`ZEIGERWERK_BREMSE`, `ZEIGERWERK_STOSS` und `ZEIGERWERK_ZUG` daneben.

**Gemessen wird zur Zeigerlinie, nicht zur Mitte.** Ein Magnet ist ein Kreis um einen Punkt; hier
liegt das Feld als langes Band unter dem Zeiger und wandert mit ihm. Erst das macht aus drei
Feldern eine Uhr statt drei Pfützen.

**Zug und Mitnahme wirken auf derselben Achse**, denn ein Zeiger ist ein Radius: „zur Linie hin"
und „mit dem Zeiger herum" zeigen beide quer zum Zeiger. Deshalb ist der Mitnahmeanteil bewusst
der schwächere von beiden. Wäre er stärker, würde der Ball nur weggeschleudert und nie
eingesammelt – und der rote Zeiger unterschiede sich nicht mehr vom grünen.

Fest ist an dem Ding nur die Nabe. Die Zeiger selbst haben keine Kollisionskante, sonst wäre das
Zifferblatt mit drei rotierenden Mauern unspielbar. Damit man die Felder trotzdem kommen sieht,
zeichnet `drawHandClockFloor` sie in den Boden: die Fläche blass eingefärbt, darin wandernde
Striche, die die Richtung zeigen – nach außen beim Stoßen, zur Linie hin beim Ziehen, und beim
Bremsen stehende Querstriche, die nur pulsieren.

`tools/validate.mjs` prüft, dass die Nabe auf der Bahn liegt und dass der Kreis unter dem längsten
Zeiger an allen 24 Prüfstellen Bahn ist. Läge ein Stück davon in der Mauer, zöge oder bremste dort
etwas, das man nicht sieht.

### Das Räderwerk ringsum

Die Welt liegt in einer Maschine, und das soll man sehen. Alle Zahnräder der Uhrwerk-Paletten sind
darum **Körper statt Scheiben**:

- **Liegende Räder** (`gearFlat`, und das Räderwerk rings um die Bahn) sind ein `prism` über
  `Renderer.zahnPoly`. Dadurch bekommt jeder einzelne Zahn seine eigene Seitenfläche, und von
  schräg vorn sieht man echte Zähne mit Tiefe – eine flache Scheibe mit Zacken sieht von dort aus
  wie Papier. Nabe und Speichen sitzen obenauf.
- **Stehende Räder** auf Pfosten (`gear`) stehen senkrecht vor der Kamera, und eine senkrechte
  Scheibe legt diese Projektion immer schief (siehe *Was die Projektion mit stehenden Scheiben
  macht*). Ihre Tiefe wird darum nicht gerechnet, sondern gemalt: dieselbe Zahnform mehrfach
  gegeneinander versetzt, von hinten dunkel nach vorn hell (`Renderer.zahnradScheibe`). Das liest
  sich als Rad mit Dicke und bleibt aus jeder Kamerarichtung richtig.
- **Der Aufziehkäfer** ist das Gefährt des Zahnradfelds: ein Messingkäfer mit Grünspan-Panzer, der
  den Ball auf dem Rücken trägt, auf sechs Beinen über die Räder läuft und den Aufziehschlüssel
  hinten mitdreht. Vorher war der Mitnehmer nur ein heller Fleck, und man sah dem fahrenden Ball
  nicht an, dass er fährt. Der Käfer löst drei Dinge auf einmal: Man sieht, **dass** man mitfährt;
  man sieht von weitem, **wo** der Mitnehmer gerade steht; und die Welt bekommt eine Figur, so wie
  das Kolosseum seinen Gladiator hat. Er läuft nur, während das Feld fährt – steht es an einer
  Station, bleibt er stehen und zuckt nur mit den Fühlern. Genau dann darf man einsteigen, und das
  soll man ihm ansehen.
- **Das Zahnradfeld** ist aus denselben Körpern gebaut und wird nach Tiefe sortiert gezeichnet,
  damit sich die Räder richtig überdecken. An seiner Ein- und Ausstiegskachel steht ein `o`
  (Klippe) in der Karte: Dort baut `level.js` weder Bande noch Kollisionskante. Ohne das stünde
  quer vor dem Feld ein Geländer, und der getragene Ball führe mitten hindurch – er wird ja
  gesetzt und nicht geschoben, also hält ihn keine Wand auf. Mit der offenen Kante sieht man,
  wofür die Lücke da ist, und wer danebenrollt, fällt auch wirklich hinunter.
- **Rings um die Bahn** stecken acht große Räder halb in der Erdscholle und drehen sich langsam
  (`Renderer.drawGroundGears`). Sie liegen immer außerhalb der Bahn – der Ball berührt sie nie.
  Damit sie nicht in der Luft hängen, reicht die Erdscholle in diesen Welten weiter als sonst
  (Rand 3,6 statt 1,4 Kacheln).
- **Im Hintergrund** laufen drei Ebenen ineinandergreifender Räder mit Wellen und Trägern, hinten
  blass und langsam, vorn kräftiger und schneller. Tiefe kostet dort Fläche, und Fläche ist auf dem
  Hintergrund teuer: Darum bekommt jedes Rad genau einen versetzten Körper und darüber die helle
  Stirnfläche, nicht eine ganze Staffel.

Gemessen im Prüfstand (weiche Bildausgabe, also strenger als jedes echte Gerät) kostet die
Schlussbahn mit dem vollen Räderwerk rund fünf Prozent mehr Bildzeit als eine Bahn der Elfenwiese.

### Die Gegenstände am Rand

Die Deko neben der Bahn war lange eine flache Zeichnung im Bildschirmraum: ein Rechteck fürs Fass,
ein Quadrat für die Kiste, ein Strich für den Laternenpfosten. Von schräg oben sah man ihr das
sofort an, und beim Drehen der Kamera drehte sie sich nicht mit. Seit Fassung 65 sind die
Gegenstände am Rand aus denselben Bausteinen gebaut wie Mauern und Türme – `prism` für gerade
Körper, `frustum` für verjüngte:

- **Fass** – drei Ringe übereinander geben den Bauch, zwei dunkle Eisenreifen halten ihn zusammen,
  obendrauf der Deckel mit seinen Dauben.
- **Kiste** – ein Kasten mit Latten auf dem Deckel und einer zweiten, kleineren Kiste schräg
  obendrauf. Zwei Körper stehen lebendiger als einer.
- **Standrohr** – Fuß, Schaft mit zwei genieteten Flanschen, ein Bogen nach der Seite, ein rotes
  Handrad und Dampf aus dem Bogen.
- **Laterne** – Pfosten mit Fuß, darauf der Käfig aus zwei Kegelstümpfen mit Streben, dazwischen
  das Licht.
- **Glocke** – der Turmstuhl ist gebaut: zwei Pfosten mit Füßen, das Joch darüber, zwei Streben.
- **Turmuhr** – Sockel und Pfosten stehen als Körper in der Welt.

Flach bleibt nur, was keine Seiten hat: Flammen, Dampf, Licht – und die Dinge, die hängen und
schwingen. Die **Glocke** selbst und das **Zifferblatt** der Turmuhr sind weiter Zeichnungen im
Bildschirmraum, denn beide sind stehende Scheiben, und die legt diese Projektion immer schief
(siehe *Was die Projektion mit stehenden Scheiben macht*). Beim Zifferblatt wird die Tiefe deshalb
gemalt statt gerechnet: derselbe Messingring mehrfach versetzt, von hinten dunkel nach vorn hell.

Ein Fallstrick dabei, an dem der Glockenstuhl zuerst gescheitert ist: Ein Körper, der eine
Bildschirmzeichnung einfassen soll, darf nicht einfach in Weltrichtung `x` versetzt werden – in
dieser Projektion wandert er dann schräg weg, und die Pfosten stehen neben der Glocke statt links
und rechts davon. Der Versatz muss entlang `(cos, −sin)` gehen: Genau der verschiebt auf dem
Bildschirm waagerecht und sonst gar nicht.

### Wie die Karten entstehen

`tools/uhrenturm.py` baut die dreizehn Bahnen mit allen ihren Ebenen aus Rechtecken und Scheiben und schreibt
`src/courses_clock.js`. Der Gewinn ist nicht die Tipparbeit, sondern die Prüfung: Das Skript hält
jede Bahn schon beim Bauen gegen dieselben Regeln, die später `tools/validate.mjs` anlegt, und
bricht mit einer klaren Meldung ab, wenn ein Punkt danebenliegt, den eine Maschine braucht – der
Umkehrpunkt eines Pendels, das Ende eines Zahnradfelds, der Landepunkt einer Feder, jede Marke des
Zifferblatts. Nach jedem Lauf gehören `node tools/validate.mjs` und
`node tools/audit/audit.mjs clock` dazu.

Wiederkehrende Bausteine des Skripts:

- **`pendeltor`** – das Muster der Welt: eine Mauer mit einer einzigen Tür, davor ein Pendel, dessen
  Linse in Ruhe genau in der Tür hängt und zu beiden Seiten darüber hinausschwingt. Zweimal je
  Schwingung ist die Tür frei. Alle drei Punkte, die `validate.mjs` prüft (Ruhelage und beide
  Umkehrpunkte), liegen dabei von selbst auf der Bahn.
- **`zahnradfeld`, `federwerk`, `zeigerarm`, `zeigerwerk`, `hemmung`, `zifferblatt`, `wanderloch`,
  `rohr`** – je ein Baustein, der seine eigenen Bedingungen prüft und die fertige JS-Zeile liefert.
- **`turbine`, `kettenzug`, `zahnstange`** – die Aufzüge. Sie bekommen zwei Karten, die der eigenen
  Ebene und die darüber, und prüfen beide: unten Bahn, oben Boden. Steht über einem Aufzug nichts,
  fiele der Ball im selben Augenblick zurück – das fällt hier auf und nicht erst im Spiel.
- **`luke`** – bekommt alle Karten und prüft, dass sie auf ihrer Ebene auf der Bahn liegt und dass
  irgendwo darunter Boden ist. Sonst wäre sie ein Sturz ins Aus statt ein Weg nach unten.
- **`rohr`** mit `ziel=(karte, ebene)` – ein Kupferrohr zwischen zwei Ebenen. Der Mund wird auf der
  einen Karte gesucht, das Ende auf der anderen, und die Auswurfstelle muss dort Bahn sein.

Am Ende prüft das Skript noch die ganze Bahn: genau ein `T` ganz unten, genau ein `H` über alle
Ebenen zusammen, alle Karten deckungsgleich, für jede Ebene ein Aufstieg von der darunter, und
keine Deko auf dem Fairway.


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

Hindernis-Typen: `lightning` (Blitzfeld `w`×`h`: `warn` Sekunden Knistern, dann `strike` Sekunden Einschlag je `period`; wer dann in der Zone ist, auch fliegend, kassiert einen Strafschlag zurück zum Schlagstart), `updraft` (Aufwind-Zone: ein Ball mit mindestens `minSpeed` wird in Rollrichtung `land` Kacheln weit geflogen, Flugtempo `fly`), `trapdoor` (Falltür `w`×`h`, offen für den `open`-Anteil der `period`; wer darüberrollt oder darauf liegt, stürzt: Strafschlag zurück zum Schlagstart), `wandergate` (wanderndes Tor: Mauer mit gleitendem Durchlass, s. o.), `firetower` (Feuerturm: ein Feuerstrahl streicht über einen Bereich der Bahn und wieder zurück, s. o.), `imperialbox` (Kaiserloge: der Daumen des Kaisers öffnet und schließt eine Falltür, s. o.), `field` mit `style: 'dark'` (Schattenzone: der Ball ist darin fast unsichtbar), `bumper` (`style`: `mushroom`, `rock`, `crystal`, `coral`, `idol`, `orb`, `grave`, `eye`), `mover` (`style` u. a. `cart`, `cannonball`, `boulder`, `barrel`, `shark`, `wave`, `dragon`, `knight`, `gladiator` (dieselbe Figur wie der Ritter, nur in Sandfarben und Rot – Helm mit rotem Kamm und Rundschild), `guard`, `coconut`, `ghost`, `bat`, `stormcloud`), `ferry` (`style`: `cart`, `chariot` (Streitwagen – dieselbe Lore, nur anders gezeichnet: die Räder drehen sich nach dem Fahrfortschritt, sie stehen also still, solange der Wagen wartet), `boat`, `ship`, `balloon`, `airship`), `wave` (wandernde Welle, keine Mauer: schiebt einen ruhenden oder langsamen Ball mit `push` in ihrer Laufrichtung mit; ein schnellerer Ball bricht hindurch und behält dabei nur den Anteil `brake` seines Tempos), `spikes` (Stachelfalle: Platte `w`×`h`, Stacheln sind `up`-Anteil der `period` draußen und blockieren dann wie eine Mauer; ein Ball, der auf der Platte liegt, wenn sie hochkommen, wird aufgespießt: Strafschlag und zurück zum Start des letzten Schlags), `sharkjump` (Hai, der im Takt `period` quer über eine Bucht springt; `style: 'croc'` zeichnet ein Krokodil und einen Ball frisst, der währenddessen über die Zone fliegt; Fressen kostet einen Strafschlag – eine `inner`-Map mit `stomach: true` würde den Ball stattdessen dorthin schicken), `rotor` (auch als Pendel mit `swing`; `style: 'tentacle'` macht daraus eine Krake, `style: 'vine'` eine Liane), `windmill`, `gate` (periodisch oder mit `linked` an einen Schalter gekoppelt), `portal`, `boost`, `field`, `ramp`, `rail`, `wall`, `cannon` (schwenkende Kanone, `base`/`amp`/`speed`/`range`; `style: 'catapult'` zeichnet ein Katapult), `magnet` (`strength` > 0 zieht an, < 0 stößt ab, `slow` bremst; `style: 'coral'` zeichnet eine Koralle, `style: 'pearl'` eine Perle; `curse: 2.0` macht den Ball nach Berührung für den Rest der Bahn träge), `turntable` (Drehscheibe mit Auswurfrinne `exit` in Grad; `style: 'whirl'` zeichnet einen Strudel), `field` (`style`: `wind`, `current` für Unterwasser-Strömung, `slope` für Rampen zwischen Höhenstufen; `gust` macht aus Dauerwind Windstöße), `potion` (Schrumpftrank, `scale`/`duration`), `cauldron` (Hexentopf: nur aus der Luft zu treffen, schrumpft und spuckt Richtung `exit` aus), `switch` (Druckplatte, `target`/`duration`), `door` (Tür in die Innen-Map `inner` einer Bahn; `style: 'pyramid'` mit `px`/`py`/`base` zeichnet eine Stufenpyramide um die Tür, `style: 'wreck'` mit `px`/`py` ein Schiffswrack, dessen Leck die Tür ist, `style: 'temple'` ein Tempeltor).
**Löwentor** (`liongate`): das einzige Hindernis, dessen Plätze nicht in der Hindernisliste stehen,
sondern als Buchstaben in der Karte. Der Großbuchstabe ist der Eingang, der gleiche Kleinbuchstabe der
Ausgang – `A`/`a` bis `F`/`f`, also sechs Paare je Bahn (der Rohrturm braucht sie alle). In der Hindernisliste steht je Paar
nur `{ type: 'liongate', pair: 'A', angle: 0 }`: `angle` (Grad, wie bei Rampe und Beschleuniger) sagt,
in welche Richtung der Ausgang ausspuckt.

Berührt ein Ball den Eingang mit mindestens `LOEWENTOR_TEMPO`, verschwindet er und kommt am Ausgang
wieder heraus – immer mit `LOEWENTOR_AUSWURF` in die eingestellte Richtung, ganz gleich wie schnell er
hineinrollte. Damit bleibt planbar, wo er landet. Ist er langsamer, sperrt eine Wand quer vor der
Toröffnung und er prallt ab. Beide Werte stehen als benannte Konstanten oben in
`src/obstacles_legend.js` und lassen sich dort nachjustieren.

**Kupferrohr** (`copperpipe`) benutzt dieselben Buchstaben und dasselbe `angle`, ist aber kein Tor,
sondern eine **Fahrt** – seit Fassung 65 eine eigene Klasse und keine Abwandlung des Löwentors mehr:

- **Man kommt immer hinein.** Kein Mindesttempo, keine Sperre davor. Wer den Rohrmund berührt, fährt
  mit, auch wer nur hineintröpfelt. Das Rohr ist ein Weg, kein Prüfstein.
- **Man sieht die Fahrt.** Der Ball verschwindet nicht, sondern fährt sichtbar durch die Leitung.
  Erst am Rohrende wird er mit `LOEWENTOR_AUSWURF` ausgeworfen – die Landestelle bleibt also so
  planbar wie vorher.
- **Wie lange die Fahrt dauert, hängt am direkten Abstand der beiden Enden** (`ROHR_TEMPO` Kacheln
  je Sekunde Luftlinie), nicht an der Länge des Umwegs. Sonst hinge die Spielzeit daran, wie die
  Leitung verlegt ist – und das ist eine Frage der Optik, keine des Spiels. Der Bot-Durchlauf hat
  das gleich bestätigt: Mit der Umwegzeit sprang Bahn 4 von Median 3 auf Median 7, weil das Pendel
  hinter dem Rohrende nicht mehr im Takt stand. Mit der Luftlinienzeit ist sie wieder bei 3.
- **Die Leitung läuft außen herum.** Sie verlässt die Bahn am Rohrmund, geht `ROHR_AUSSEN` Kacheln
  über den Kartenrand hinaus, läuft dort neben der Karte entlang und kommt beim Rohrende wieder
  herein. So liegt sie niemandem im Bild, man sieht sie über ihre ganze Länge, und es ist der Weg,
  den eine Rohrpost in einem Haus auch nähme. Zur nächsten Kante geht es hinaus – dort ist der
  Umweg am kürzesten und die Erdscholle trägt die Leitung noch.

Gebaut ist sie wie echte Rohre: **gerade Läufe und rechtwinklige Bögen**, keine Diagonale, dazu
Muffen an jedem Stoß (`ROHR_MUFFE`), Stützen darunter (`ROHR_STUETZE`) und ein Glanzstreifen auf
dem Scheitel – der macht aus dem Zylinder erst Kupfer. Die Ecken sind mit `ROHR_ECKE` gerundet.

Zwei Dinge, die beim Zeichnen wichtig sind:

- Ein **gerader Lauf muss ein einziger Zylinder** sein. Zerlegt man ihn in Stücke, sieht man an
  jedem Stoß den Deckel des nächsten Zylinders, und aus dem Rohr wird eine Perlenkette. Darum
  zerlegt `bauWeg` den Weg nicht gleichmäßig, sondern in seine geraden Läufe und seine Bögen.
- Ein **Bogen wird gar nicht aus Zylindern gebaut**, sondern als durchgehender Strang gezeichnet:
  dunkle Kontur, Kupfer, Glanz. In der Kurve fielen die Deckel sonst am meisten auf.

Jeder Lauf geht für sich in die Tiefensortierung – sonst läge die ganze Leitung entweder vor oder
hinter allem, was sie überquert.

**Den Ball sieht man während der Fahrt nicht.** Er steckt im Kupfer, und durch Kupfer schaut
niemand – zu sehen ist nur, was man auch an einer echten Rohrpost sieht: eine glühende Stelle, die
durch die Leitung wandert. Dazu gehört zweierlei: Der Ball wird gar nicht erst gezeichnet, und die
Regel „Objekte, die vor dem Ball stehen, werden durchsichtig" gilt für ihn dann nicht – sonst risse
ausgerechnet die Leitung ein Loch um ihn herum und verriete ihn doch.

Das Löwentor der Arena bleibt davon unberührt: Dort ist das Mindesttempo der Reiz, hier wäre es nur
im Weg.

Der Eingangsbuchstabe ist begehbarer Boden (er steht dafür in `FLOOR_CHARS`), der Ausgang bewusst
nicht: Als Nicht-Boden zieht die Bahnmauer von selbst eine Wand davor, und genau das soll ein Ausgang
von außen sein – massiv. Der Ball wird deshalb nicht *in* den Ausgang gesetzt, sondern eine knappe
Kachel davor. Bleibt ein Ball doch einmal im Torbogen liegen (hineingefallen, hineingeschoben), schiebt
das Tor ihn sanft entgegen seiner Anfahrt wieder heraus.

`node tools/validate.mjs` prüft die Tore mit: ein Buchstabe ohne Gegenstück, derselbe Buchstabe mehrmals
auf einer Karte oder ein Ausgang ohne Auswurfrichtung sind Fehler.

**Wanderndes Tor** (`wandergate`): eine Mauer von (`x0`,`y0`) nach (`x1`,`y1`) wie ein festes Mauerstück,
in der ein schmaler Durchlass (`gap`) steckt. Der Durchlass gleitet langsam an der Mauer entlang, kehrt am
Ende um und kommt wieder zurück; die Mauer selbst ist massiv. Nicht die Umlaufzeit steht am Hindernis,
sondern das Tempo als Konstante `WANDERTOR_TEMPO` (Kacheln je Sekunde) oben in
`src/obstacles_legend.js` – so gleitet der Spalt an einer langen Mauer genauso schnell wie an einer
kurzen, und eine längere Mauer wird von allein schwerer statt nur langsamer. Der Spalt läuft als
Dreieckschwingung, also gleichmäßig hin und gleichmäßig zurück: An den Umkehrpunkten zu bremsen würde ihn
dort unerreichbar machen.

**Feuerturm** (`firetower`): ein hohes Bauwerk am Bahnrand mit einer brennenden Schale obenauf. Aus ihr
fährt ein Feuerstrahl auf die Bahn, der langsam über einen festgelegten Bereich streicht und wieder
zurück – wie ein Scheinwerfer. Der Bereich ist ein Rechteck (`zx`,`zy`,`zw`,`zh`) von der linken oberen
Ecke aus, wie bei Aufwind und Kraftfeld. Wer im Strahl liegt, rollt oder fliegt, wird an seinen letzten
Ruhepunkt zurückgelegt – **ohne Strafschlag**. Der Turm kostet Weg und Zeit, nicht die Wertung.

Der Strahl geht nie aus: Gefährlich ist nicht ein Zeitpunkt, sondern ein Ort. Geprüft wird deshalb bei
jedem Physikschritt und nicht nur einmal – der Ball kann in den stehenden Strahl hineinrollen, und der
Strahl kann über einen ruhenden Ball hinwegstreichen. Beides zählt.

Am Hindernis stehen `achse` (`'x'` oder `'y'` – in welche Richtung der Strahl wandert; ohne Angabe über
die längere Seite des Bereichs), `breit` (Breite des Strahls in Kacheln), `tempo` (Kacheln je Sekunde)
und `phase` (0 bis unter 1, verschiebt einen einzelnen Turm gegen die anderen). Die Grundwerte stehen
oben in `src/obstacles_legend.js` als benannte Konstanten: `FEUERTURM_TEMPO` und `FEUERTURM_BREITE` – so
streichen alle Türme einer Arena von sich aus im selben Tritt. Der Strahl läuft als Dreieckschwingung,
also gleichmäßig hin und gleichmäßig zurück; an den Umkehrpunkten zu bremsen würde ihn dort kleben
lassen, und gerade am Rand soll er zügig wenden.

Auf dem Boden ist beides zu sehen: das grelle Band, wo er gerade brennt, und der rußige Bereich mit
gestricheltem Rand, wie weit er überhaupt kommt. Ein Pfeilpaar an der Vorderkante zeigt die
Laufrichtung. Erst zusammen lässt sich vorausplanen – man sieht den Ort der Gefahr und den freien Rest.

`validate.mjs` prüft: ein Bereich ohne Größe, eine `achse`, die weder `'x'` noch `'y'` ist, eine
Strahlbreite von null oder eine, die die ganze Laufstrecke füllt (dann steht der Strahl still und sperrt
den Bereich für immer), ein `tempo` von null, ein Bereich ohne Fairway darunter, ein Turm mitten auf der
Bahn statt am Rand, ein Abschlag im bestrichenen Bereich (der Ball käme dort nie wieder heraus, weil er
notfalls dorthin zurückgelegt wird), ein Loch im Bereich und eine `phase` außerhalb von 0 bis 1.

Auch das prüft `validate.mjs`: ein Durchlass so breit wie die Mauer (dann sperrt nichts mehr), ein
Durchlass unter einer Kachel (dann kommt kein Ball hindurch), eine Mauer ohne Länge und eine Mauer, deren
Mitte nicht auf dem Fairway liegt. Geprüft wird die Mitte, denn die Enden liegen absichtlich auf den
Kanten der Bahn.

**Kaiserloge** (`imperialbox`): eine überdachte Tribüne am Bahnrand mit einer großen Daumen-Anzeige.
Nach jedem Schlag – gleich, welcher Spieler geschlagen hat – dreht der Kaiser den Daumen um. Bei
„Daumen runter" klappt eine festgelegte Falltür in der Bahn auf, bei „hoch" ist sie zu. Wer in die
offene Luke rollt, kommt an seinen letzten Ruhepunkt zurück – **ohne Strafschlag**; ein fliegender
Ball setzt darüber hinweg.

Am Hindernis stehen der Platz der Loge (`x`,`y`) samt Grundfläche (`w`,`h`) und die Falltür als
Rechteck (`lx`,`ly`,`lw`,`lh`) von der linken oberen Ecke aus. `start` sagt, wie der Daumen zu Beginn
der Bahn steht: `'hoch'` (Luke zu, Standard) oder `'runter'` (Luke offen).

Gezählt wird das **Ende** eines Schlags, nicht sein Anfang (`level.schlagZahl`, hochgezählt in
`main.js`). Das ist der Kern des Hindernisses: So gilt der Daumenstand, den man beim Zielen sieht, für
den ganzen Schlag. Würde er im Moment des Abschlags umspringen, ließe sich nichts planen. Der Zähler
gehört der Bahn, nicht dem Spieler – er läuft über den Spielerwechsel hinweg weiter und fängt erst mit
der nächsten Bahn wieder bei null an.

Der Daumen hängt zweimal im Bild: groß vorn an der Loge und noch einmal klein über der Falltür. Beim
Zielen ist die Loge am Bahnrand oft aus dem Bild, der Stand muss aber immer ablesbar sein. Beide Marken
werden im Bildschirmraum gezeichnet und schauen damit aus jeder Kameradrehung zum Betrachter; die Farbe
sagt dasselbe noch einmal (heller Sandstein = Weg frei, Rot = Loch offen).

Beim Online-Spiel läuft der Daumen von selbst gleich, weil jedes Gerät dieselben Schläge ausführt.
Zur Sicherheit wird der Zählerstand trotzdem mit jedem Schlag und jeder Ruhemeldung mitgeschickt.

`validate.mjs` prüft: eine Falltür ohne Größe, eine Falltür ohne Fairway darunter, eine Loge mitten auf
der Bahn statt am Rand, Abschlag oder Loch in der Falltür (der Ball käme dort nie heraus) und ein
`start`, das weder `'hoch'` noch `'runter'` ist.

### Musik

Jede Welt hat einen eigenen, endlos weiterlaufenden Klangteppich – vollständig mit WebAudio erzeugt, ohne eine einzige Audiodatei (die App bleibt klein und offline spielbar). Pro Takt erklingen ein Flächenakkord aus drei Tönen, ein Bass auf dem Grundton, gezupfte Melodietöne aus der Tonleiter des gerade klingenden Akkords und je nach Welt eine Trommel, eine Rassel oder eine Glocke; ein Echo legt sich darüber. Die Akkorde wandern Takt für Takt durch eine kurze Wendung. Märchenland klingt in Dur und hell, die Meereswelt dorisch und wiegend, das Tüftlerreich in Moll mit ruhigem Puls, der Dschungeltempel pentatonisch mit Rahmentrommel, der Sturmhimmel weit mit tiefer Pauke, das Schattenreich phrygisch mit ferner Grabglocke. Beim Weltwechsel blendet der alte Klang aus und der neue auf; im Hintergrundtab schweigt die Musik. Die Paletten stehen in `src/music.js`.

Ein Thema kann außerdem `rails: 'groove'` setzen: Dann werden die Schienen einer Fähre nicht als
Eisenschienen mit Schwellen gezeichnet, sondern als zwei helle, leicht vertiefte Rillen im Boden – so
läuft der Streitwagen im Kolosseum durch den Sand statt über Gleise.

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
