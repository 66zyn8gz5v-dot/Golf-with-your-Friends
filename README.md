# Fantasy Golf – Golf with your Friends

Ein Minigolf-Spiel in 2,5D mit Fantasy-Welten, gebaut mit reinem HTML5-Canvas und JavaScript – ohne Build-Schritt und ohne Abhängigkeiten.

## Spielen

Einfach `index.html` im Browser öffnen (Chrome, Firefox, Safari, Edge – auch mobil).
Alternativ lokal über einen kleinen Server:

```bash
npx serve .          # oder: python3 -m http.server 8080
```

## Ladebild

Beim Öffnen steht zuerst ein Ladebild: der Schriftzug, darunter eine kleine Szene – eine Insel mit
Burg im Meer, davor ein Grün, über das ein Ball rollt, zweimal aufsetzt und im Loch verschwindet –
und darunter ein Balken. Dahinter liegt die **Weltkarte, weich gezeichnet und abgedunkelt** – wie
hinter jeder Tafel außerhalb des Spiels.

Das war zuerst das gemalte Titelbild. Es sah neben dem Rest aus wie aus einem anderen Buch: Das
Spiel ist gezeichnet, das Bild gemalt. Die Karte ist mit demselben Stift gemacht wie alles andere,
und sie zeigt obendrein, worum es geht.

Beim Ladebild geht das nicht über das Skript, das die Karte sonst rechnet: Das Ladebild steht im
festen HTML und muss da sein, *bevor* irgendein Skript gelaufen ist – genau dafür gibt es das
Ladebild. Die Karte liegt darum zusätzlich als fertige Datei bereit (`icons/weltkarte.svg`,
geschrieben von `node tools/karte.mjs`), und dieselbe Datei bedient auch alle Tafeln. Damit sie
nicht altert, prüft `node tools/auslieferung.mjs` bei jeder Auslieferung mit, ob sie noch zu
`src/worldmap.js` passt – wer eine Welt anhängt, merkt es sofort statt erst auf dem Handy.

Vorher war die Szene eine Nachtaufnahme in kalten Blautönen; neben dem gemalten Startbildschirm sah
das aus wie ein Fremdkörper aus flachen Flächen. Ein Zwischenstand ohne Szene – nur der gemalte
Vordergrund, scharf, mit einem Grün als Fortschrittsanzeige – wurde verworfen: Die kleine Szene ist
das, was das Ladebild ausmacht.

Alles daran bewegt sich **allein mit CSS** – kein JavaScript. Das ist der ganze Punkt: Ein Ladebild,
das erst läuft, wenn die Skripte da sind, kommt genau dann nicht, wenn man es braucht. Beim
allerersten Öffnen ist die Karte noch unterwegs; bis dahin steht der dunkle Verlauf darunter, damit da
kein Loch ist. Nebenbei ist die Karte dadurch schon geladen, wenn gleich darauf der Startbildschirm
kommt – er trägt dieselbe.

Damit das auch stimmt, musste die Zierschrift aus dem Seitenkopf verschwinden. Ein `<link
rel="stylesheet">` auf Google hält das erste Bild auf, bis die Antwort da ist – und solange nichts
gezeichnet wird, läuft auch `requestAnimationFrame` nicht, das Spiel käme also gar nicht erst zum
Zug. Gemessen mit einer Antwort, die fünf Sekunden auf sich warten lässt: **erstes Bild nach 5039 ms
mit dem `<link>` im Kopf, nach 97 ms ohne ihn.** Die Schrift wird jetzt aus `main.js` nachgeladen, mit
dem Umweg über `media="print"` – ein Blatt für den Drucker hält den Bildschirm nicht auf und wird
umgehängt, sobald es da ist.

Weg ist das Ladebild, wenn der Startbildschirm gebaut, zwei Bilder gezeichnet und die Schrift da ist
(höchstens 1,2 s darauf gewartet), dabei aber nie vor **1,7 Sekunden** ab Seitenaufruf: Auf einem
schnellen Gerät ist das Spiel in 200 ms bereit, und ein Bild, das man nur als Zucken wahrnimmt, ist
schlechter als gar keines. Bleibt es länger als 14 Sekunden stehen, erscheint darunter der Hinweis,
die Seite neu zu laden. Wer im Betriebssystem weniger Bewegung eingestellt hat, bekommt dasselbe Bild
ruhig: Ball am Loch, Balken voll.

## Startbild

Der Startbildschirm ist eine Tafel wie jede andere: Dahinter liegt die **Weltkarte**, weich
gezeichnet und abgedunkelt, davor die Tafel mit dem goldenen Schriftzug, den beiden großen Knöpfen
und den drei kleinen. Dasselbe Bild also wie im Ladebild davor und wie hinter der Rangliste – wer
das Spiel öffnet, sieht von der ersten Sekunde an dieselbe Welt.

**Bis Fassung 138 lag hier ein gemaltes Titelbild**, in zwei Fassungen (`icons/titelbild.jpg` quer,
`icons/titelbild-hoch.jpg` hoch), mit wehender Fahne, ziehenden Wolken, Möwen und Sonnenfunkeln –
alles als SVG-Auflagen über dem Bild, bewegt allein mit CSS. Es sah neben dem Rest aus wie aus einem
anderen Buch: Das Spiel ist gezeichnet, das Bild gemalt. Die Bilder liegen noch in `icons/`, die
Zeichnung steht in der Geschichte des Zweiges; im ausgelieferten Spiel kommt beides nicht mehr vor.

Zwei Dinge sind mit ihm weggefallen, und beide waren mehr als Schmuck:

- **Die Tafelform hing am Bild.** `startbildAn()` setzte die Kennung `startbild` erst, wenn
  `titelbild.jpg` wirklich geladen war – und an dieser Kennung hängt, wie breit die Tafel wird und ob
  die beiden großen Knöpfe nebeneinander stehen. Ohne Netz kam die Tafel also schmal und hochkant
  falsch. Jetzt sagt `startbild` nur noch, dass gerade die Starttafel liegt, und `hoch` nur noch,
  dass das Fenster höher als breit ist.
- **1,4 MB für nichts.** Die beiden Bilder standen weiter als `<image>` im HTML und wurden vom
  Browser brav geholt, obwohl sie niemand mehr sah (nachgemessen: zwei Anfragen pro Seitenaufruf).
  Darum ist die Zeichnung ganz aus `index.html` heraus, nicht bloß auf `display: none` gesetzt.

Mit dem Bild ist auch `src/title.js` gegangen – die gezeichnete Szene, die einsprang, wenn das Bild
nicht lud. Hinter der Starttafel liegt jetzt in jedem Fall die Karte; was die Leinwand dort malte,
sähe ohnehin niemand. Auf dem Startbildschirm wird darum gar nicht mehr gezeichnet, was pro Bild die
ganze Arbeit spart.

Hochkant bleibt die Tafel knapp: kleinere Knöpfe, engere Abstände, der Erklärsatz fällt weg (er sagt
nichts, was nicht schon auf dem Weltkarten-Knopf steht). Sonst deckte sie auf dem Telefon die Karte
ganz zu. Eine Breite braucht sie dort trotzdem – ohne sie schrumpft sie auf die Breite der Knöpfe und
stünde auf dem Tablett als schmaler Streifen mitten in der Karte. Der Vollbild-Knopf geht hochkant
nach oben links, sonst säße er auf dem Turnierband.

## Welten und Modi

Vom Titelbild führen zwei Wege: **🗺 Weltkarte** und **🛠 Bauen & Eigene Welt**, jeder mit seiner Szene
als Hintergrund und einer zweiten Zeile, die sagt, was dahinter liegt. Damit die Beschriftung darauf
lesbar bleibt, liegt ein Schleier dazwischen, der nach rechts hin dunkler wird – vorher stand das Wort
„Weltkarte" mitten in den Ortsnamen der Karte. Darunter stehen drei kleine Knöpfe: **Turnier** führt
ohne Umweg in die Arena (Kolosseum), **Online spielen** in den Warteraum, **Rangliste** zu den
Rekorden.

Auf breiten Schirmen stehen die beiden großen Knöpfe nebeneinander statt untereinander. Das halbiert
die Höhe der Tafel, und von der Karte dahinter bleibt mehr zu sehen.

Die Tafel selbst war lange ein heller Schleier vor der Szene: hübsch, aber die Schrift lag auf Wolken,
Tannen und Schafen. Jetzt ist sie dicht genug zum Lesen und hat den Doppelrahmen alter
Anschlagtafeln. Der Schriftzug ist kein einfarbiger Text mehr – Gold ist ein Verlauf von hell nach
dunkel und wieder hell, in die Buchstaben geschnitten (`background-clip: text`), der langsam wandert.

Auf der **Weltkarte** liegen die Welten als Landstriche auf einer gezeichneten Landkarte – ein Meer,
ein Festland, ein paar Nebeninseln. Das Märchenland hat die Wiesen im Westen, der Schneeberg das
Gebirge im Norden, der Dschungel den feuchten Süden, das Schattenreich das Moor am Ostrand; die
Meereswelt liegt als eigene Insel davor, und dorthin führt kein Weg, sondern eine gestrichelte
Schiffslinie. Ein Meeresarm schneidet quer durchs Festland: Der Osten – Uhrwerkstadt, Sturmhimmel,
Schattenreich – hängt nur noch an einer schmalen Landenge.

Vorher lag jede Welt als schwebende Scheibe in der Luft, aufgereiht von links nach rechts. Das war
übersichtlich, aber es war keine Welt – es waren acht Inseln ohne Zusammenhang, und mit jeder neuen
wurde die Reihe länger, bis die Karte breiter war als der Schirm und man wischen musste.

**Die Küste wird gerechnet, nicht gezeichnet.** Jede Welt ist in `src/worldmap.js` ein Eintrag in
`LAND`: Mittelpunkt, Reichweite, Biom. Daraus entsteht ein Feld, das in der Mitte eines Landstücks 1
ist und an seiner Reichweite auf 0 fällt; die Linie, an der die Summe aller Felder die Höhe `WASSER`
hat, ist die Küste (Marching Squares, danach einmal Chaikin geglättet). Landstücke, die nah
beieinander liegen, wachsen dabei von selbst zu einem Festland zusammen, ein weit abseits gesetztes
wird zur Nebeninsel, und was von Land umschlossen bleibt, ist ein Binnensee. Landstücke ohne `id`
tragen keine Welt – sie geben dem Festland nur seine Form: eine Landzunge, eine Bucht, eine
Landbrücke in den Süden.

Zwei Dinge sind daran wichtig, und beide waren beim ersten Versuch falsch:

- **Das Feld muss endlich weit reichen.** Mit `1/Abstand²` – dem klassischen Metaball – summieren
  sich elf Landstücke so weit auf, dass die ganze Karte zu Land wird. Mit `(1 − (d/r)²)³` wirkt
  jedes Landstück nur in seiner Umgebung, und ob zwei zusammenwachsen, entscheidet allein ihr
  Abstand.
- **Die Küstenstücke laufen nicht alle gleich herum.** Werden sie gerichtet aneinandergehängt,
  zerfällt die Küste in Fetzen. Gesucht wird darum ungerichtet: Ob ein Stück an diesem Punkt
  anfängt oder aufhört, ist egal.

**Runde Landstücke geben eine runde Küste** – acht Kugeln, aneinandergeklebt. Eine Karte lebt aber
von Buchten und Landzungen. Verbogen wird darum nicht das Feld, sondern der *Ort*, an dem man es
fragt: Ein Punkt erkundigt sich ein paar Einheiten weiter drüben (`versatz`, drei Lagen Rauschen).
Tief im Land, wo das Feld flach und hoch ist, ändert das nichts; am Ufer, wo es steil abfällt,
wandert die Küste dadurch weit. Die grobe Lage ist bewusst kräftig eingestellt – sie ist es, die den
Meeresarm quer durchs Festland schneidet. Wer an diesen Zahlen dreht, dreht an der Form der Welt.

Daraus folgt der eigentliche Gewinn: **Eine neue Welt braucht einen einzigen Eintrag in `LAND`.**
Küste, Flachwasser, Strand, Färbung, Gelände, Flüsse, Wege und Beschriftung folgen daraus. Wer eine
Welt anhängt, zeichnet keine Landkarte – er sagt, wo sie liegt und wie es dort aussieht.

Das Gelände kommt aus dem Biom: `wiese` streut Bäume und Büsche, `gebirge` Bergrücken mit
Schneekappe, `stadt` Häuser und Türme, `dschungel` Palmen und Tempel, `moor` tote Bäume, Grabsteine
und Ruinen, `kueste` Dünen und Palmen. Die Plätze zieht ein Zufall mit festem Startwert – dieselbe
Karte sieht auf jedem Gerät gleich aus –, und jeder Platz muss weit genug im Land liegen, sonst
stünde ein Baum mit den Füßen im Wasser.

**Die Zeichen stehen in der Landschaft, sie liegen nicht darin.** Jeder Baum, jeder Berg, jedes Haus
wird von der Seite gezeigt, mit dem Fuß auf dem Punkt und dem Wipfel darüber – so, wie man eine
Landkarte von Hand zeichnet. Vorher war es eine Draufsicht aus Kreisen: ein Baum sah aus wie eine
Kugel auf einem Stock, ein Hügel wie ein Fleck. Jedes Zeichen hat darum drei Teile – einen Umriss in
Tinte, eine helle Sonnenseite und eine schraffierte Schattenseite. Auf einer gestochenen Karte ist
die Schraffur die ganze Beleuchtung: Eine Bergflanke wird nicht dunkler gefärbt, sie wird
schraffiert. Laubkronen, Büsche und Wolken entstehen aus `lappen()` – n nach außen gewölbte Bogen um
einen Mittelpunkt, also gerade kein Kreis. Das Land ist dazu papierfarben statt wiesengrün; die
Biome färben es nur an, und ein Gradnetz alle zehn Einheiten liegt darüber. Die Flüsse suchen sich ihren Weg aus demselben Feld: Sie laufen dorthin, wo es
kleiner wird, also bergab, und hören auf, wo sie das Meer erreichen. Die Reisewege verbinden die
Welten in ihrer Reihenfolge; ob ein Stück zur Straße oder zur Schiffslinie wird, tastet die Karte
selbst ab.

Die Karte misst `WorldMap.BREITE` × 62 Karteneinheiten (zur Zeit 100 × 62) und passt damit ganz auf
den Schirm. Die Orte in `WorldMap.spots` stehen in **Karteneinheiten** (x) und in **Prozent der
Höhe** (y) – die x-Angabe wird beim Zeichnen durch `BREITE` geteilt.

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
| Zwergenmine | Profi | 12 Bahnen unter den Berg – man sieht nur, was im Licht der Grubenlampen steht |

**Der Schalter „nur in der Vorschau".** Die Zwergenmine war gebaut und geprüft, sollte aber eine
Weile noch nicht ins Spiel. Der nächstliegende Weg wäre gewesen, sie für `main` herauszuschneiden –
und genau daran geht so etwas kaputt: Zwei Stände von Hand auseinanderzuhalten ist eine
Dauerpflicht, und spätestens bei der dritten Auslieferung fehlt irgendwo eine Zeile. Darum war es
*ein* Stand mit einem Schalter, so wie beim Boule-Modus: Die Welt trägt `nurVorschau: true`, und die
Oberfläche filtert – Weltliste, Weltkarte, Rangliste, Online-Auswahl und die Belohnungshüte.

Zwei Dinge daran waren Absicht. Erstens sah `WORLDS` für die Prüfwerkzeuge weiter *alle* Welten:
Eine Welt, die keiner prüft, verfällt still. Zweitens blieb ihre Insel auf der Karte liegen, nur
ohne Namen und ohne Nadel – die Küste rechnet sich aus allen Landstücken, und ein Stück Land ohne
Beschriftung verspricht nichts, sondern läßt offen, daß da noch etwas kommt.

**Seit Fassung 163 ist die Mine im Spiel**, und keine Welt trägt die Kennzeichnung mehr.
`tools/vorschauwelt.mjs` bleibt trotzdem stehen, und zwar aus zwei Gründen: Der Schalter ist der
Weg, den auch die nächste Welt gehen wird – eine Mechanik, die einmal benutzt und dann nicht mehr
geprüft wird, ist beim nächsten Mal kaputt. Und die Prüfung hält jetzt das Gegenteil fest: Was
fertig ist, muß auch wirklich angeboten werden. Eine vergessene Kennzeichnung wäre eine Welt, die
niemand findet – und niemand vermißt, weil niemand weiß, daß es sie gibt. Geprüft wird darum auch,
daß `main.js` die Weltliste nicht von Hand durchgeht; diese Prüfung hat beim Schreiben sofort drei
solche Stellen gefunden, darunter eine, über die die Welt im Spiel doch erreichbar gewesen wäre.

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

**Der Gartenzwerg** ist der Spezialskin und fällt in dieser Reihe aus dem Rahmen: Er ist ein
**Ganzkörper-Skin** wie die Belohnungen – er ersetzt den Ball, statt auf ihm zu sitzen –, hängt
aber an keiner Welt und an keinem Rekord. Er ist von Anfang an da. Das ist Absicht: Die Weltskins
sind Auszeichnungen und sollen es bleiben, der Zwerg ist der Spaß daneben, und ein Spaß, den man
erst freispielen muss, ist keiner.

**Die erste Fassung war zu weihnachtlich**, und das lag nicht an einem Stück, sondern an der Summe:
runder schneeweißer Vollbart, rote Mütze mit hellem Rand, rosige Backen – das ist ein
Weihnachtsmann. Ein Zwerg ist knorriger. Was ihn dazu macht: **spitze Ohren**, die unter der
Mützenkrempe hervorschauen (ein Weihnachtsmann hat runde, und man sieht sie nie), ein
elfenbeinfarbener **Gabelbart**, der unten in zwei Zöpfe ausläuft und von **Lederzwingen** gefasst
wird, **Brauen, die zur Nase hin abfallen** statt freundlich zu wölben – dieselben zwei Pfade, nur
andersherum, und ein anderer Kerl –, dazu die Knollennase ganz vorn, wettergegerbte statt puderrosa
Backen und eine **moosgrüne Joppe** mit Gürtel. Zwischendurch war die Joppe aus Leder; das ging
unter, weil Braun auf brauner Haut keine Kante macht.

**Die Mütze trägt die Farbe des Balls.** Der Skin verdeckt die Spielerfarbe ja, und der dünne Reif
allein ist auf dem Spielfeld leicht zu übersehen – eine Mütze in Ballfarbe dagegen nicht: Bei vier
Zwergen sieht man auf einen Blick, welcher der eigene ist. Ein (fast) weißer Ball bekommt **Rot**,
denn eine weiße Mütze über hellem Bart wäre keine Mütze mehr, sondern ein Fleck – und Rot ist beim
Gartenzwerg ohnehin zu Hause. Das ist dieselbe Regel, nach der schon der Federbusch des Ritterhelms
geht (`plumeColors`). Der umgeschlagene Rand ist *dunkler* als die Mütze, nicht heller: Ein weißer
Pelzrand war genau das, was den Zwerg zum Weihnachtsmann gemacht hat.

Die Mütze ist fast so hoch wie der Ball breit, denn eine brave Kappe wäre auf dem Spielfeld nur ein
Farbfleck. Ihre Spitze schwingt beim Rollen nach, im selben Takt wie die Bommelmütze im Schneeberg –
zwei Zwerge nebeneinander sollen nicht gegeneinander wackeln. Gezeichnet wird sie über den Farbreif
(siehe unten), sonst liefe der Reif quer über die Mütze. Und alle paar Sekunden blinzelt er.

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
das geltende Par – also gegen die Rangliste, siehe oben. **Vierzehn Welten, vierzehn
Belohnungen.** Die meisten sind **Ganzkörper-Skins**: Sie ersetzen den Ball, statt auf ihm zu
sitzen, und bewegen sich. Der Championhelm und die drei Hüte des Zauberreichs sind reine Hüte; den
Championhelm gibt es auch nicht fürs Durchspielen, sondern fürs Gewinnen eines Turniers.

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
| Schneeberg | Runenstein | vereister Granit mit Poren und Abplatzern; sechs blaue Glyphen sind eingekerbt, und ein Glimmen wandert in drei Gruppen durch sie hindurch; unten liegt Raureif an | eine blaue Bommelmütze mit Strickrippen und umgeschlagenem weißem Rand; die Spitze neigt sich, der Bommel schwingt ihr nach |
| Sturmhimmel | Gewitterkugel | Wolken ziehen, es regnet, alle 2,2 s schlägt ein Blitz ein | ein Wetterhahn, der sich dreht – und beim Einschlag an der Spitze sprüht |
| Schattenreich | Kristallkugel | Schwaden waberen, ein Auge blickt umher und blinzelt | Spitzhut mit Mondschnalle; die Spitze schwankt, Sterne funkeln darauf |
| Uhrwerkstadt | Taschenuhr | durchbrochenes Zifferblatt, hinter dem das Werk läuft | Bügel und Krone wie an einer Taschenuhr |
| Zwergenmine | Grubenlampe | eiserner Lampenkörper mit Messingreifen; hinter dem Glas brennt eine Flamme, die langsam flackert und ihren Schein aufs Eisen wirft | ein Grubenhelm mit eisernem Bügel |
| Die Flut | Taucherhelm | messingene Haube mit Bullauge, zwei Seitenfenstern, Schrauben rings um das Glas und einem Kragen mit Nieten | (kein eigener Hut – aus dem Ventil oben steigen Blasen auf) |
| Kolosseum | Championhelm | (kein eigener Ball – der Helm sitzt auf dem Spielerball) | der Federkamm wiegt sich im Wind |

**Geprüft wird das mit `node tools/huete.mjs`.** Ein Hut geht nicht laut kaputt: Er wird nur in
einem Menü und auf einem Ball gezeichnet, und wenn dabei etwas wirft, sieht man einen leeren Kreis –
keine Meldung, nur ein Ball ohne Hut. Darum zeichnet das Werkzeug **jeden** Hut wirklich, auf eine
Leinwand, die nichts malt und nur mitzählt, einmal groß (mit Feinarbeit) und einmal klein (ohne) und
zu zwei Zeitpunkten, damit auch das drankommt, was blinzelt oder schwingt. Ein Tippfehler in einer
Hilfsfunktion fliegt so sofort auf, und zwar bei allen Hüten, nicht nur beim neuen. Dazu prüft es
die Regeln, die sich nicht von selbst halten: jeder Listeneintrag hat eine Zeichnung, jede Welt hat
genau eine Belohnung, keine Belohnung hängt an einer Welt, die es nicht gibt – und der Gartenzwerg
ist der einzige Ganzkörper-Skin ohne Welt. Bekäme er still eine Bedingung, wäre aus dem Spaß eine
weitere Hausaufgabe geworden, und niemandem fiele es auf.

Dass die Mütze die Ballfarbe trägt, wird dabei nicht am Quelltext abgelesen, sondern **gemessen**:
Die mitzählende Leinwand merkt sich jede Füllfarbe, der Zwerg wird mit zwei Ballfarben gezeichnet,
und die Listen müssen sich unterscheiden. Verglichen werden nur die *Füllungen* – der Reif in
Spielerfarbe ist ein Strich und zählt nicht mit, sonst wäre der Unterschied schon dadurch da und
die Prüfung wertlos. Dazu die Sonderregel: Beim weißen Ball muss eine deutlich rote Füllung dabei
sein, bei einem farbigen keine.

Vier der Skins teilen sich die Glaskugel-Form, damit sie als eine Familie zu erkennen sind – der Inhalt
macht die Welt. Drei tanzen bewusst aus der Reihe: Federkrone und Runenstein sind Stein, die Königskrone
Porzellan. Bewegt wird nach `state.t`, der Spieluhr: dieselbe Zahl auf jedem Gerät, beim Online-Spiel
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
sieben Glyphen im Stein läuft langsam eine Welle: mal steht die eine heller, mal die andere. Der
Runenstein macht es in Blau und mit größeren Kerben, damit man ihn nicht für den Tempelstein hält – und
weil die Mütze ihm die Kuppe nimmt, sitzen seine Glyphen tiefer als beim Tempelstein. In der Gewitterkugel ziehen zwei Wolkenreihen unterschiedlich
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

**Am selben Gerät zu mehreren ist alles offen – und nichts doppelt.** Sobald in der Aufstellung mehr
als ein Spieler eingestellt ist, steht jeder Skin zur Wahl: auch die Belohnungen, die noch niemand
verdient hat, und beide Helme der Arena. Am Küchentisch soll keiner mit dem Vorgabehut dasitzen, nur
weil der andere die Welt schon durchgespielt hat. Geliehene Skins werden voll gezeichnet, tragen aber
ein kleines Schloss in der Ecke.

Die Leihgabe gilt **nur für diese Partie**: Sie steht in `playerHats`, also im Arbeitsspeicher, und
geht nicht in den Browserspeicher – `hueteMerken()` legt für einen geliehenen Platz einen verdienten
Ersatz ab, und zwar einen, den noch keiner hat. Nach dem Neuladen ist sie weg, und allein wie im
Netzspiel tauscht `hutOderErsatz()` sie ohnehin gegen den Vorgabehut. **An der Freischaltung selbst
ändert sich dabei gar nichts**, und das ist keine Sorgfalt, sondern Bauart: Freischaltung wird nirgends
gespeichert, sondern bei jeder Abfrage aus der Rangliste und dem Turnierstand berechnet
(`Hats.freigeschaltet`). Es gibt also keinen Freischaltspeicher, den man versehentlich beschreiben
könnte.

Dazu darf **kein Skin zweimal** vergeben werden. Vier Bälle mit demselben Hut sind auf der Bahn nicht
auseinanderzuhalten – die Spielerfarbe allein reicht dafür nicht, erst recht nicht bei den
Ganzkörper-Skins, die den Ball ganz ersetzen. Ein schon vergebener Platz ist als solcher zu erkennen
und bleibt anklickbar: Dann wird **getauscht**, der andere bekommt den eigenen. Eine Absage wäre hier
die schlechtere Antwort – man sieht ja, dass der Platz belegt ist, und will genau tauschen. Beim
Öffnen und bei jedem Wechsel der Spielerzahl räumt `doppelAufloesen()` auf, falls aus einem früheren
Stand zwei Plätze denselben Hut tragen.

Allein bleibt alles wie bisher: gesperrt ist gesperrt.

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

## Boule

**Noch nicht im Spiel.** Der Modus steht in der Vorschau (und in der Einzeldatei zum Ansehen), im
fertigen Spiel nicht – der Schalter dafür heißt `NUR_VORSCHAU` in `src/main.js` und zeigt auf
dieselbe Bedingung wie `TEST_FREI`. Es ist derselbe Stand: Ihn für das Spiel aufzutrennen hieße,
zwei Stände von Hand auseinanderzuhalten, und genau daran geht so etwas nach drei Auslieferungen
kaputt. Ein Schalter ist eine Zeile; zwei Stände sind eine Dauerpflicht. Soll Boule ins Spiel, fällt
die Bedingung an den drei Stellen weg, an denen sie steht (Modusknopf, Erklärtext, Rückfall auf
„Wettkampf").

Ein eigener Modus, wählbar in der Aufstellung neben **Wettkampf** und **Kreativ** – aber **nur am
selben Gerät**, nicht über den Raumcode. Der Grund steht im Spiel selbst: Boule lebt davon, dass
alle Kugeln liegen bleiben und sich gegenseitig wegstoßen. Beim Netzspiel müsste dafür jedes Gerät
dieselben acht bis zwölf Kugeln in derselben Reihenfolge rechnen; heute wird über das Netz genau
ein Ball übertragen. Der Modus steht darum im Warteraum gar nicht erst zur Wahl.

**Die Boule-Welt: neun Bahnen, die dafür gebaut sind.** Sie steht in **Bauen & Eigene Welt**, gleich
neben der eigenen Welt, und ist bei jedem da – sie wird mitgeliefert, nicht gebaut. Von dort geht es
in die Aufstellung (Spielerzahl, Hüte), und zwar nur nach Boule: Wettkampf auf einer Bahn ohne
sinnvolles Par wäre nicht verboten, aber sinnlos.

Die Bahnen liegen in `src/courses_boule.js`, gebaut von `tools/boule.py`. Was sie von einer
Golfbahn unterscheidet, steht dort ausführlich; in Kürze:

* **Platz.** Bei vier Spielern liegen am Ende zwölf Kugeln plus die Zielkugel auf der Bahn. Eine
  enge Golfbahn wäre nach der vierten Kugel verstopft. Die Boule-Bahnen haben darum 175 bis 226
  Rasenfelder, und der Erzeuger prüft das auch nach.
* **Freier Abschlag.** Jede neue Kugel wird neben dem Abschlag eingesetzt und sucht sich dort einen
  freien Platz; steht der Abschlag in einer Nische, wird es nach acht Kugeln eng. Geprüft wird auf
  mindestens 15 freie Felder im Umkreis von zwei.
* **Nur Gras.** Kein Eis (darauf rollt eine Kugel ewig, Bremsung 0.75) und kein Sand (darauf bleibt
  sie sofort liegen, Bremsung 20). Beides nähme dem Spiel das Abschätzen, worum es gerade geht.
  Themen sind nur `meadow` und `forest`.
* **Kein Loch.** Eine Boule-Bahn hat keines: Es wäre eine Falle, die mit dem Spiel nichts zu tun hat
  – wer Pech hat, verlöre eine Kugel an ein Ziel, das er gar nicht anspielt. Die Bahnen tragen
  `ohneLoch: true`; `buildLevel` und die Bahnprüfung wissen davon und verlangen für sie kein 'H'.
  Ausscheiden kann eine Kugel weiterhin – über den Rand.
* **Nichts Bewegtes.** Nur Blöcke (Bäume, Findlinge) und Prellsteine. Loren, Fähren, Kanonen oder
  Stacheln würden liegende Kugeln verschieben oder verschlucken, während gerade jemand anderes
  zielt.

Die Welt trägt die Kennung `custom` wie eine selbst gebaute. Das ist kein Behelf, sondern genau
richtig: Daran hängt, dass keine Rekorde geschrieben werden (Abstände in Feldern sind mit Schlägen
nicht vergleichbar) und dass „Zurück" in die Werkstatt führt statt auf die Weltkarte.

**Ablauf.** Zu Beginn wird ein Spieler **ausgelost**, der die kleine Zielkugel mit der Kanone auf die
Bahn schießt. Die Kanone steht am Abschlag und zeigt von Haus aus in die Mitte der Wiese. Gezogen
wird wie bei jedem Schlag, und zwar für beides: **Stärke** und **Richtung**. Die Richtung ist aber
nicht frei, sondern auf **±0,65 rad (rund 37°) nach links und rechts** um die Grundrichtung
beschnitten (`BOULE_SCHWENK`). Das macht sie zur Kanone und nicht zum Schläger: Sie steht, sie
schwenkt nur – und die Zielkugel kann nicht hinter den Abschlag fliegen, wo sie niemandem nützt.

Die Kanone ist auch zu **sehen**: Sie steht 1,15 Felder hinter dem Abschlag, sodass die Zielkugel in
ihrer Mündung liegt, und ihr Rohr dreht sich beim Schwenken mit (`state.kanone` mit Ort und
Richtung, gezeichnet in `Renderer.drawFrame` mit `drawCannon` – derselben Zeichnung wie beim
gleichnamigen Hindernis, denn wer sie einmal gesehen hat, weiß sofort, was sie tut).

Dafür bleibt im Boule-Modus die **Abschlagmatte** weg (`state.abschlagMatte === false`, ausgewertet
in `drawFloor`): Der helle Ring sah aus wie ein Loch, auf das man zielen soll – und ein Loch gibt es
hier gerade nicht.

Technisch wird die Zielkugel für diesen einen Schuss zum „Ball" des Spielers – dann gilt für sie die
gewohnte Bedienung, ohne dass es dafür eine zweite Eingabeart braucht; nur der Schwenkbereich wird
beim Ziehen dazwischengeschaltet (`bouleKanone()`).

Bleibt sie zu dicht am Abschlag liegen (unter drei Feldern) oder nicht auf Gras, schießt derselbe
Spieler noch einmal, höchstens sechsmal; danach wird sie hingelegt. Wer geschossen hat, **spielt
auch als erster** – so wie beim richtigen Boule, wo der Werfer des Sauballs die erste Kugel legt.
Damit ist das Los nicht bloß Beiwerk, sondern verteilt den Anfangsvorteil von Runde zu Runde neu.
Danach geht es reihum: jeder drei Kugeln, jede bleibt liegen und darf von jeder späteren angestoßen
werden – die Zielkugel eingeschlossen.

**Wertung.** Nach der letzten Kugel gewinnt, wessen Kugel am nächsten an der Zielkugel liegt.
Gemessen wird von Mitte zu Mitte, in Feldern der Bahn; die Tafel zeigt **alle** Kugeln nach Abstand
geordnet, danach die ausgeschiedenen. Während der Runde steht in der Seitentafel je Spieler sein
bisher bester Abstand – das ist die einzige Zahl, auf die es ankommt, und man will sie beim Zielen
sehen.

**Ausgeschieden.** Eine Kugel, die von der Bahn fällt oder im Loch landet, zählt nicht mehr mit.
Strafschläge gibt es hier nicht – es gibt ja keine Schläge, die man bestrafen könnte. Dieselbe Regel
gilt für alles andere, was einen Ball im Golf zurückwerfen würde (Wasser, Lava, Stacheln, Blitz,
Hai, Fallbeil, das brennende Auge) und für die Tür in eine Innenkarte: Die würde mitten in der Runde
die ganze Bahn austauschen. Trifft es die **Zielkugel**, kommt sie an ihren letzten Ruheplatz
zurück – im richtigen Boule wäre das Ende dann ungültig, aber mitten in einer angefangenen Runde ist
das hier die freundlichere Regel.

**Was es in Boule nicht gibt:** Schläge, Par, Schlaglimit, Uhr und Rekorde. Ein Boule-Ergebnis ist
mit einer Golfrunde nicht vergleichbar, und eine Zahl, die in dieselbe Rangliste liefe, wäre schlicht
falsch. Die Rangliste bleibt darum unberührt.

**Wann ein Wurf zu Ende ist.** Nicht, wenn die eigene Kugel liegt, sondern wenn **alle** liegen –
sonst schlüge der Nächste in ein noch rollendes Feld hinein. Nach vierzehn Sekunden wird abgebrochen
und alles angehalten: Auf einer Bahn mit Windfeld oder Förderband käme sonst nie Ruhe ein.

**Im Code:** der ganze Modus in einem Block in `src/main.js` (`bouleRundeStarten` bis `bouleEnde`),
die Physik über `stepBaelle` aus `src/physics.js`. Der Renderer bekommt die liegenden Kugeln über
`state.liegendeBaelle` und muss dafür nichts über Spielarten wissen – er zeichnet sie in dieselbe
Tiefensortierung wie alles andere, damit eine Kugel hinter einer Mauer auch hinter der Mauer liegt.

## Mehrere Bälle auf einer Bahn

In allen heutigen Spielarten rollt genau ein Ball: Es wird reihum geschlagen, der nächste kommt
erst dran, wenn der vorige liegt. `src/physics.js` kann seit Fassung 106 aber auch mehrere Bälle
gleichzeitig führen, samt Stoß untereinander.

**Der Stoß.** `ballStoss(a, b, events)` ist ein elastischer Stoß: Der Impuls geht **nur längs der
Verbindungslinie** über, quer dazu behält jeder Ball sein Tempo – das ist der Unterschied zwischen
einem Stoß und einem Zusammenkleben. Die Masse kommt aus dem Radius hoch drei, also aus dem
Rauminhalt; ein geschrumpfter Ball wiegt damit von selbst weniger und wird stärker weggestoßen, als
er selbst stößt, ohne dass man das eigens regeln müsste. Die Stoßzahl `BALL_E` ist 0.86 – etwas
lebhafter als eine Mauer (0.72), aber nicht verlustfrei. Vor dem Impuls werden die beiden
auseinandergeschoben; ohne das blieben sie ineinander stecken, der Stoß liefe im nächsten Schritt
erneut, und aus einem Stoß würde ein Zittern.

**Die Reihenfolge.** `stepBaelle(level, baelle, dt, t, allowForces)` bewegt erst **jeden Ball für
sich** – Reibung, Wände und Hindernisse sind für ihn dieselben wie beim Spiel allein – und löst
**erst danach** die Bälle untereinander auf. Das ist Absicht: Würde man mitten im Bewegen stoßen,
hinge das Ergebnis davon ab, welcher Ball zufällig zuerst an der Reihe ist, und beim Netzspiel sähen
zwei Geräte verschiedene Bahnen. Nach einem Stoß wird jeder verschobene Ball noch einmal aus den
Wänden herausgedrückt (sonst steckte er darin), und weil das ihn wieder gegen einen dritten Ball
schieben kann, läuft das Ganze mehrmals – bis nichts mehr überlappt, höchstens aber viermal. Drei
Bälle in einer Reihe brauchen zwei Durchgänge; die Schranke ist nur dafür da, dass ein Ball, der in
einer Ecke zwischen Mauer und Ball klemmt, nicht das Bild anhält.

**Wer nicht mitstößt:** wer fliegt (der sieht unter sich keine Bälle), wer in einer Fähre oder
Kanone steckt, wer schon im Loch ist, und wer in diesem Schritt eingelocht ist oder die Bahn
verlassen hat. Zwei Bälle auf verschiedenen Ebenen sehen einander gar nicht.

**Eine Falle beim Bauen.** Die Maschinen laufen einmal je **Schritt**, nicht einmal je Ball –
`stepBaelle` ruft `update(t)` selbst auf und schaltet es in `stepPhysics` ab. Drei Hindernisse
tragen nämlich etwas von einem Aufruf zum nächsten mit: Stacheln und Fallbeil merken sich, ob sie
im Bild davor schon zu waren (daran hängt der Strafschlag), und ein Tor am Schalter schiebt sein
Blatt Schritt für Schritt weiter. Je Ball aufgerufen liefe das Tor doppelt so schnell – und die
Stacheln spießten nur noch den **ersten** Ball auf, weil der zweite Aufruf die Erinnerung „vorher
war ich offen" schon gelöscht hätte. `node tools/stoss.mjs` prüft genau das, mit Gegenprobe: ohne
den Kunstgriff bekommt der zweite Ball null statt zwei Strafschlägen.

**Dass sich für einen Ball nichts ändert, wird gemessen, nicht behauptet.** Ein um 1e-15
verschobener Aufprall führt nach zwei Sekunden in eine andere Ecke der Bahn – Hinsehen genügt
nicht. `node tools/stoss.mjs` spielt darum jede Bahn aller neun Welten mit acht Richtungen und zwei
Stärken einmal durch und vergleicht `stepPhysics` (wie bisher) gegen `stepBaelle` mit einem einzigen
Ball, Schritt für Schritt und Nachkommastelle für Nachkommastelle. `src/main.js` ruft weiterhin
`stepPhysics` auf; am Spiel ändert sich also nichts, solange es keine Spielart mit mehreren Bällen
gibt.

## Rangliste

**Hinter der Tafel liegt die Weltkarte**, weich gezeichnet und abgedunkelt – wie hinter jeder Tafel
außerhalb des Spiels. Vorher stand dort, was gerade auf der Leinwand lag – das Spielfeld oder die
Weltkarte in voller Schärfe – und wanderte unter der Tafel herum, obwohl es mit Rekorden nichts zu
tun hat. Dann lag dort ein gemaltes Bild (`icons/rangliste.jpg`); es sah neben dem gezeichneten Rest
aus wie aus einem anderen Buch und ist seit Fassung 137 nicht mehr im Spiel. Die Kennung `rangliste`
am Überlagerungs-Schirm tragen auch die drei Tafeln, die von der Rangliste abzweigen (Liste führen,
Schlüssel, Zurücksetzen) – sie rücken die Tafel nur in die Mitte statt nach unten, weil sie hoch ist.
Darüber liegt ein Schleier, der nach außen hin dichter wird: In der Mitte soll die Karte hell
bleiben, am Rand ist sie sonst so bunt, dass der goldene Rahmen der Tafel darin unterginge.

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
mit dem Schlaglimit gewertet und die Runde läuft weiter. Eigene Bahnen lassen sich online nicht
spielen, nur die festen Welten.

### Geht der Gastgeber, führt der Nächste weiter

Bis Fassung 164 endete der Raum **für alle**, sobald der Gastgeber ging. Das ist hart und unnötig:
Die anderen sitzen ja noch da, mitten in der Runde, mit ihren Punkten. Nur *führen* muss jemand –
den Takt zwischen den Bahnen vorgeben, Weggegangene werten, Anmeldungen beantworten –, und dafür
kommt jeder in Frage.

Der Nachfolger wird darum nicht ausgehandelt, sondern **gerechnet**: der erste Sitz, der nicht der
alte Gastgeber und nicht weg ist. Alle Geräte haben dieselbe Liste, alle rechnen dasselbe – es gibt
nichts zu besprechen, und niemand kann sich vordrängeln.

**Damit es nicht zwei Gastgeber gibt**, trägt die Spielerliste eine **Generation**. Wer übernimmt,
zählt sie hoch. Ein Gerät nimmt eine Liste mit höherer Generation nur vom gerechneten Nachfolger an –
sonst könnte jeder, der den vierstelligen Code kennt, den Raum an sich reißen. Und wer selbst
Gastgeber war und eine höhere Generation sieht, tritt zurück: Das ist der Fall, in dem der alte
Gastgeber zurückkommt, ohne gemerkt zu haben, dass er abgelöst wurde.

Erst wenn **niemand** mehr übrig ist, endet der Raum wirklich.

### Wiederkommen: der Sitz gehört dem Gerät, nicht der Verbindung

**Wer rausflog, kam nicht zurück** – bis Fassung 164. Ein Sitz wurde am MQTT-Namen des Geräts
erkannt, und den würfelt `src/net.js` bei **jedem Seitenaufruf neu**. Für die Verbindung ist das
richtig: Zwei Fenster desselben Rechners müssen sich unterscheiden, sonst wirft der Vermittler eines
davon hinaus. Für den *Spieler* war es falsch. Fynns Handy sperrt sich, die Seite lädt neu, er tippt
den Code wieder ein – und ist ein Fremder. Der Gastgeber beantwortete jede Anmeldung während einer
laufenden Runde mit „Die Runde läuft schon", und jede weitere Bahn wurde ihm mit dem Schlaglimit
gewertet, während er danebensaß.

Seit Fassung 164 trägt der Sitz eine **eigene Kennung**, die im Browser liegenbleibt
(`fantasygolf.sitz`). Sie sagt nichts über die Person – eine gewürfelte Zeichenkette, deren einziger
Zweck ist: *„Ich bin der, der vorhin auf Platz zwei saß."* Der MQTT-Name darf sich dabei ändern; der
Gastgeber schreibt ihn am Sitz einfach um. Zwei Wege führen zurück:

* **Die Verbindung wackelt nur** – die Seite bleibt offen, der MQTT-Name bleibt derselbe. Dann reicht
  schon das nächste Lebenszeichen: Wer wieder zuhört, gilt sofort wieder als da. Auf die Anmeldung zu
  warten hieße, jemanden noch Sekunden länger als weg zu führen, obwohl er längst zurück ist.
* **Die Seite lädt neu** – neuer MQTT-Name, gleiche Sitzkennung. Der Gastgeber erkennt ihn daran,
  gibt ihm den Platz zurück und schickt ihm den **Stand der Runde**: Welt, Bahn, wer dran ist, alle
  Punkte und Zeiten, die Uhr der Hindernisse und wo der Ball zuletzt lag. Ohne den stünde er auf
  Bahn eins, während die anderen auf Bahn sieben spielen.

Ein Gerät **ohne** bekannte Sitzkennung bekommt weiterhin die Absage: Ein Fremder soll nicht mitten
in eine laufende Runde. Der eingesetzte Platz wird beim Einsteigen nicht neu vergeben, sondern
zurückgegeben – Punkte, Hut und Name bleiben, was sie waren.

### Geprüft mit zwei Browsern und einem eigenen Vermittler

Der Netzteil ist keine Rechnung, die man nachrechnen kann; er ist ein Ablauf zwischen zwei Geräten.
Einzelne Nachrichten zu prüfen hieße, die Prüfung genau so zu schreiben, wie der Code gerade ist –
sie würde jeden Umbau überleben und nie etwas finden. Darum gibt es seit Fassung 164 zwei Werkzeuge:

* **`tools/vermittler.mjs`** – ein winziger MQTT-Vermittler für die Werkbank, MQTT 3.1.1 über
  WebSocket, ohne fremde Bibliothek, rund zweihundert Zeilen. Er kann genau so viel, wie `src/net.js`
  benutzt: CONNECT, SUBSCRIBE, UNSUBSCRIBE, PUBLISH (auch aufbewahrt), PINGREQ, DISCONNECT, alles
  QoS 0. Mehr Kann wäre mehr Code, der selbst kaputtgehen kann. Umgestellt wird im Browser mit
  `localStorage.setItem('fantasygolf.broker', 'ws://localhost:9001')`.
* **`node tools/online.mjs`** – fährt zwei echte Browserfenster dagegen: Raum aufmachen, beitreten,
  Runde starten, die Seite des Gastes neu laden, zurückkommen. Geprüft wird, was auf dem Bildschirm
  steht – gleiche Bahn, beide Spieler, eigener Punktestand, niemand mehr als weg geführt –, dann,
  dass ein **fremdes** Gerät weiterhin draußen bleibt, und zuletzt, dass der Raum weiterläuft, wenn
  der Gastgeber einfach verschwindet. Auf dem Stand von Fassung 163 fällt die Prüfung mit drei
  Fehlern durch, auf dem von 164 mit einem – jeweils genau an der reparierten Stelle.

  Die letzte Probe hatte zuerst einen Fehler in sich selbst: Sie fragte **sofort** nach, ob der
  Übriggebliebene noch drin ist – und bekam natürlich „alles gut", weil die zwanzig Sekunden noch
  gar nicht um waren. Auf dem Stand *ohne* Übergabe war sie ebenso grün. Eine Prüfung, die zu früh
  hinsieht, prüft nichts; jetzt wartet sie die Frist ab und fragt danach.

Der Port ist dabei nicht frei wählbar: In der Sicherheitsregel der Seite (`Content-Security-Policy`
in `index.html`) steht, wohin der Browser überhaupt eine Verbindung aufbauen darf, und dort ist genau
`ws://localhost:9001` eingetragen. Ein anderer Port sähe aus wie ein Vermittler, der nicht antwortet.

Fehlt Playwright, sagt `tools/online.mjs` das und endet ohne Fehler: Auf einem Rechner ohne Browser
ist „nicht geprüft" die ehrliche Antwort, nicht „bestanden".

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
- Fast die ganze Oberfläche trägt **Material Symbols** von Google, als SVG-Pfade in `src/icons.js`
  eingebettet – überall gleich, in der Textfarbe, ohne Schriftart aus dem Netz: Bedienknöpfe, die
  Marken der Welten, die Stufen (Normal, Profi, Legende), die Zeichen der drei Wertungen, die Ränge
  in den Ergebnissen und die Sinnbilder in Laufmeldungen. Die Weltknöpfe in Rangliste, Warteraum
  und Weltüberschrift tragen die **Marke ihrer Welt**, nicht die ihrer Stufe: Fünf Profi-Welten
  trugen sonst dieselbe Flamme, und das sagte über die Welt nichts aus. Drei Welten behalten
  ausdrücklich das Zeichen ihrer Stufe – Märchenland den Pokal, Sturmhimmel und Arena den Blitz
  (`WELT_ICON_AUSNAHME` in `src/main.js`); auf der Karte steht dort die Marke. Vorher waren das
  Emoji, und die zeichnet jedes Betriebssystem selbst: Apple, Google und Microsoft bilden dasselbe
  Zeichen verschieden ab, mal bunt, mal flach, mal in anderer Größe.
- Zwei Dinge sind bewusst **nicht** ersetzt:
  - Die **Hüte** in Listen, Ergebnissen und Belohnungen. Material hat weder Krone noch Zauberhut
    noch Piratenhut – und es braucht sie nicht: Die Hüte werden ohnehin gezeichnet, also zeigen die
    Abzeichen jetzt den echten Hut in klein, gemalt vom selben Code wie der auf dem Ball.
  - Die **Sinnbilder der Bahnen** (Pilz, Drache, Krake, Krokodil, Sarg, Rabe …). So etwas kennt
    Material Symbols nicht, und ein Einheitszeichen für alle wäre kein Ersatz, sondern ein Verlust:
    In der Bahnliste erkennt man die Bahn am Zeichen.
- Online gegeneinander: **Online spielen** im Startbildschirm, Raumcode aufmachen oder eintippen.
- Rekorde: **Rangliste** im Startbildschirm, einmal den eigenen Namen eintragen. Drei Wertungen: Schläge, Zeit und Kombi (Schläge + Minuten).
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

## Die Zwergenmine

Die zehnte Welt liegt im Berg – und der Berg ist ein Vulkan. Auf der Weltkarte ist sie die
**Feuerinsel im Ostmeer**: eine eigene Insel mit Basaltküste, rauchendem Kegel und ein paar toten
Bäumen, vom Festland aus per Schiff zu erreichen. Zehn Bahnen, Stufe Profi, und ein Abstieg: vom
Tageslicht am Mundloch durch die Stollen und die Kristallkammern hinunter zur Schmelze, wo das Erz
flüssig steht – direkt unter dem Krater.

**Die Welt war zuerst zu brav.** Neun Bahnen, alle flach, kaum eine Gefahr: Der Bot-Durchlauf zählte
zwischen 0 und 0,58 Stürzen pro Spiel, im Schneeberg sind es auf zwei Bahnen über sechs. Ausgerechnet
im Bergwerk, wo der Abstieg von Sohle zu Sohle das Naheliegendste überhaupt wäre – eine Bahn hieß
„Sohle Neun" und war eben. Die Welt hat darum eine zehnte Bahn bekommen, zwei neue Ideen und
größere Karten.

**Der Abstieg ist jetzt wörtlich gemeint.** Vier der zehn Bahnen haben zwei Sohlen: Man schlägt auf
der oberen ab und kommt hinunter, indem man über eine Kante rollt und fällt. Das kostet keinen
Strafschlag, und genau darum ist es hier das richtige Mittel – in jeder anderen Welt braucht ein
Stockwerkwechsel eine Maschine, die trägt (Aufzug, Seilbahn, Turbine). Nach unten braucht man keine.
Man lässt los. Ein `o` in der Karte ist so eine offene Kante; an einem gewöhnlichen Bodenrand baut
`level.js` eine Bande, und die hielte den Ball auf.

Dafür musste das Spiel etwas lernen: **Der Abschlag darf auf jeder Etage liegen.** Bis Fassung 142
wurde das `T` immer auf der untersten gesucht (`level.js`), und jede mehrstöckige Bahn ging damit
zwangsläufig nach oben. Jetzt führt `level.js` ein `teeEbene` mit, so wie es `cupEbene` für das Loch
schon immer tat. Gegengeprüft: Für alle 103 Bahnen, die es vorher gab, kommt 0 heraus – dort ändert
sich nichts.

Zuerst stand sie als kleines Landstück am Fuß des Gebirges, eingeklemmt zwischen Uhrwerkstadt und
Talsenke. Das war gequetscht statt gelegen: keine eigene Küste, kein Platz für den Namen. Die Karte
ist darum nach Osten gewachsen (`BREITE` 100 → 118 in `src/worldmap.js`), und weil die Höhe bleibt,
bleibt auch alles Gezeichnete so groß wie vorher – der Kasten um die Karte schiebt waagerecht, so
wie es dort von Anfang an vorgesehen war. Die Küste der Feuerinsel schaut im ersten Blick schon
rechts herein, damit niemand sie übersieht, und in der Kopfzeile steht, dass es nach Osten
weitergeht.

**Die Frage dieser Welt ist die Dunkelheit.** Jede andere Welt fragt, wie fest (Märchenland), wann
(Uhrenturm) oder wohin (Schneeberg) man schlägt. Die Mine fragt: *was liegt da vorn überhaupt?* Ab
Bahn 2 trägt jede Bahn einen Schleier (`dunkel`, 0,45 bis 0,62), der sich nur an zwei Stellen
öffnet: um den Ball und um jede Grubenlampe. Dazwischen muss man sich merken, was man beim Hinweg
gesehen hat.

Drei Entscheidungen halten das spielbar statt ärgerlich:

* **Die Zielhilfe liegt über dem Schleier.** Wohin man schlägt, sieht man immer – was einen dort
  erwartet, nicht. Wer im Dunkeln zielt, zielt trotzdem genau.
* **Gefahr leuchtet durch.** Der Kreis einer Sprengladung und die Glut in den Spalten werden auf
  den Boden gezeichnet, bevor der Schleier kommt. Man sieht also, was einem schaden kann, auch wenn
  man den Weg dorthin nicht sieht.
* **Jede dunkle Bahn ist mit den Lampen allein lesbar.** `tools/mine.py` misst das beim Bauen: Kein
  Punkt des Weges darf weiter als 7,5 Felder von jedem Licht entfernt liegen. Die Bahn mit der
  dunkelsten Stelle (Erster Stollen, 6,3) hat also noch Luft.

Gezeichnet wird der Schleier in `Renderer.drawDunkelheit`, auf einer zweiten, unsichtbaren
Leinwand: erst überall dunkel, dann wird an jedem Licht ein Loch hineingewischt – mit einem
Farbverlauf, der nach außen hin dichter wird (`destination-out` löscht so viel, wie der Verlauf
deckt). Dann kommt das Ganze in einem Zug auf das Bild.

Zuerst lagen dafür gestapelte Lagen mit je einem harten Loch übereinander, erst drei, dann fünf.
Bei drei Lagen sah man die Ringe einzeln, bei fünf ebenso – nur enger: Um Ball und Laterne stand
eine Zielscheibe statt eines Lichtscheins. Mehr Lagen hätten das nur verschoben, nicht behoben, und
jede Lage kostet eine bildschirmgroße Füllung pro Bild. Der Verlauf hat keine Stufen, kommt mit
einer Füllung aus, und überlappende Lichter addieren sich von selbst richtig.

**Die Bruchwand** (`bruchwand`) ist die einzige Maschine im ganzen Spiel, die **die Bahn selbst
verändert**. Alles andere bewegt den Ball: Es stößt, trägt, hebt, fängt. Die Bruchwand rührt den
Ball nicht an – sie nimmt eine Wand heraus. Ein Pfeiler stehengebliebenen Felses versperrt den Gang,
mit einem Bohrloch und einem Kreidekreuz darauf; zündet eine Sprengladung in der Nähe, ist er weg,
und zwar für den Rest der Bahn. Wer beim ersten Schlag vor einem geschlossenen Berg steht, spielt
danach eine andere Bahn als vorher.

Sie ist zugleich die Antwort auf eine Frage, die die Sprengladung offen gelassen hatte: Bis dahin
war Dynamit im Berg nur ein Stoß für den Ball. In einem Bergwerk sprengt man aber keine Kugeln,
sondern Fels.

Sie geht **nicht** wieder zu, und das war überlegt: Eine Wand, die sich nach jedem Schlag wieder
schließt, wäre ein Tor – und Tore gibt es schon, in drei Welten. Der Reiz liegt darin, dass der Berg
offen *bleibt*, und dass man den Knall darum nicht abpassen, sondern abwarten muss. `tools/mine.py`
prüft, dass zu jeder Bruchwand auch eine Ladung in Reichweite liegt: Das ist die eine Panne, die man
beim Bauen nicht sieht – die Wand steht da und sieht richtig aus, nur zündet nichts in ihrer Nähe.

### Ein Hindernis auf einer oberen Etage wurde nie gezeichnet

Mehrstöckige Bahnen zeichnen ihre Etagen als Schollen, und zwar **nach** allem, was unten steht –
sonst verdeckte eine Mauer im Vordergrund die Etage darüber. Wer oben stand, wurde dabei brav auf
Höhe null gemalt und danach von der eigenen Scholle zugedeckt. Das Hindernis war da, es stieß den
Ball, man sah es nur nicht. Auf der Kristallkammer waren das zwei Kristalle und ein Magnet; über
alle Welten hinweg 26 Hindernisse auf sieben Bahnen.

Der Zeichner stellt diese Stücke jetzt zurück und holt sie in `zeichneEbene` nach – mit der
Leinwand um die Höhe der Etage nach oben verschoben. Verschieben genügt, weil die Höhe in dieser
Abbildung nur senkrecht und nur linear wirkt (`projRaw`); `tools/ebenen.mjs` rechnet das an
vierhundert Proben nach, damit es auffällt, falls sich die Abbildung einmal ändert.

Damit gibt es **eine** Stelle, an der die Etage in die Höhe eingeht. Windfahne, Schneebrücke und
Bruchwand haben das vorher zusätzlich selbst getan – zusammen mit dem Versatz wäre das doppelt
gewesen, und sie hätten eine Etage zu hoch gestanden. Ausgenommen bleiben nur die Maschinen, die
zwischen zwei Etagen stehen: Seilbahn, Aufzug und Zahnstange (`drawSpannendeMaschinen`) und das
Kupferrohr, das seine Teilstücke einzeln in die Tiefensortierung schickt, damit es sich richtig
mit den Mauern überdeckt.

### Die Bahnen tragen jetzt gezeichnete Sinnbilder

In der Rangliste trugen die Zeilen Emoji – ein 🐉 für die Drachenhöhle, ein 🐙 für die Krakengrotte –,
die Kopfzeile daneben gezeichnete Sinnbilder. Bunt neben einfarbig, in derselben Tabelle.

Das war ursprünglich eine **bewusste** Entscheidung, und der Kopf von `src/icons.js` hielt sie fest:
Material Symbols kennt weder Drache noch Krake, und am Zeichen erkannte man die Bahn. Sie hat sich
trotzdem nicht bewährt. Jedes Gerät zeichnet Emoji selbst, die Liste sah auf dem iPad anders aus als
auf dem Rechner – und in einer Welt wie dem Sturmhimmel trugen ohnehin alle neun Bahnen dasselbe
Wolkenzeichen.

Jetzt hat jeder **Abschnitt** einer Welt ein gezeichnetes Zeichen aus derselben Sammlung wie der
Rest der Oberfläche; alle 37 sind vergeben. Vierzehn Sinnbilder sind dafür dazugekommen (Anker,
Segel, Schneeflocke, Kristall, Grubenlampe, Wolke, Krone, Kirche …), und eines ist von Hand
gezeichnet: den **Pilz** gibt es in der Sammlung nicht – wie schon bei Tanne und Sonne.

Was dabei verloren geht, ist echt: Ein Krake ist jetzt eine Welle. Der Abschnitt ist aber das, was
man in der Liste tatsächlich unterscheiden will – in welchem Teil der Welt eine Bahn liegt –, und
das steht vollständig da. `tools/schrift.mjs` prüft, dass kein Abschnitt vergessen wird: Ein
vergessener fiele still auf das Ersatzzeichen zurück, und das sähe aus wie Absicht.

### Eine Zierschrift, eine Leseschrift

Es waren zwei Zierschriften nebeneinander: **Cinzel Decorative** für die Titel, **MedievalSharp**
für die beiden großen Knöpfe. Auf dem iPad stehen die untereinander, und dann sieht man es sofort –
„Fantasy Golf" und „Weltkarte" sahen aus, als gehörten sie nicht zusammen. Seit Fassung 148 gilt:

| | wofür |
|---|---|
| `MedievalSharp` | alles, was schmückt: Titel, Ladebild, die großen Knöpfe, die Schlusstafel |
| `Trebuchet MS` | alles, was man liest: Fließtext, Knöpfe, Zahlen |
| `monospace` | nur der Bahn-Text im Editor und die Entwicklerausgabe – dort muss jede Spalte untereinander stehen |

Das 3D-Spiel benutzte ohnehin nur MedievalSharp; jetzt sehen beide Spiele gleich aus. Nebenbei wird
eine Schriftdatei weniger geholt, bevor überhaupt etwas zu sehen ist.

**Und die Farbe dazu.** Der Titel war ein wandernder Goldverlauf, in die Buchstaben geschnitten;
„Weltkarte" darunter war cremeweiß mit hartem Absatz. Dieselben Wörter tragen jetzt dieselbe Farbe
– und sie steht an *einer* Stelle, als `--zier` in `:root`, von Titel, Ladebild und den großen
Knöpfen benutzt. Wer sie ändern will, ändert sie dort. Dass der Titel keinen eigenen Verlauf mehr
hat, hat noch einen Nebeneffekt: Das Sinnbild davor brauchte eine eigene Regel, um überhaupt
sichtbar zu bleiben, solange die Schrift nur ein Ausschnitt war. Die ist jetzt weg.

Die **Weltkarte** zählt ausdrücklich nicht mit. Ihre Beschriftung ist Georgia kursiv, und das ist
nicht Oberfläche, sondern Teil der gezeichneten Karte – so wie die Schrift auf einem alten Atlas
zum Blatt gehört. `tools/schrift.mjs` hält beides fest: dass es außer den dreien keine gibt, dass
genau eine Familie nachgeladen wird, und dass die Karte sich nicht unbemerkt ändert.

### Der Schneeball: aus vier Paletten werden vier Abschnitte

Der Schneeberg war zwölfmal dieselbe Bahn in anderer Farbe, und das ließ sich nachzählen: eine
Windfahne auf **12 von 12**, eine Lawine auf 10, drei bis sechs Hindernisse auf vierhundert
Feldern, Eis auf 4 von 12 Bahnen, Wasser auf **keiner**, drei bis vier Deko-Stücke je Bahn. Die
vier Abschnitte – Talstation, Fels, Gletscher, Gipfel – waren nichts als vier Farbpaletten: Es galt
überall dasselbe.

Seit Fassung 152 gilt auf dem Berg eine eigene Regel, so wie in der Zwergenmine die Dunkelheit:

> **Wer über Schnee rollt, setzt Schnee an und wird größer. Wer über Eis rollt, streift ihn wieder
> ab. Und ein zu dicker Ball passt nicht mehr ins Loch.**

Damit heißt *Gletscher* etwas: Dort ist alles Eis, der Ball bleibt klein und rutscht. Im Tiefschnee
am Gipfel wächst er am schnellsten. Die Aufgabe der Welt in einem Satz: **nicht zu dick ankommen.**

**Wie scharf, und wie ich es falsch hatte.** Zuerst war der Ball schon nach *zwei* Schlägen zu dick –
auf jeder Bahn, bei jedem Spiel. Damit war die Regel keine Aufgabe, sondern eine Dauerstrafe; der
Bot endete auf einer Bahn zehnmal von zehn im Schlaglimit. Gemeint war: *wer weit herumirrt, muss
zum Eis* – nicht *wer zweimal schlägt*. Jetzt wird er nach rund vierzig Kacheln zu dick, also nach
vier ordentlichen Schlägen, und drei Kacheln Eis genügen zum Abstreifen.

**Was die Prüfung dazugelernt hat.** Eine Schneebahn ohne erreichbares Eis ist unlösbar, und zwar
*unsichtbar* unlösbar – es sähe alles richtig aus, man käme nur nie hinein. `tools/validate.mjs`
prüft darum zweierlei: dass überhaupt Eis oder Wasser auf dem erreichbaren Weg liegt, und dass es
**höchstens zwölf Felder vor dem Loch** liegt. Die zweite Hälfte hat zuerst gefehlt, und sie hat
sofort vier Bahnen gefunden, auf denen das Eis gleich hinter dem Abschlag lag und der Ball auf den
letzten zwanzig Feldern wieder zuschneite.

**Und die Bahnen selbst.** Eis jetzt auf allen zwölf (der Gletscher besteht aus 170 bis 200 Kacheln
davon), Wasser auf dreien, Tiefschnee auf vieren, vier bis sieben Deko-Stücke je Bahn. Die
Maschinen sind ungleich verteilt: Windfahne auf 10 von 12 statt auf allen, Lawine auf 4, Seilbahn
auf 4, Schneebrücke auf 2. Zwei Bahnen haben gar keinen Wind – und genau deshalb merkt man ihn auf
den anderen.

**Was am Rand stand und nicht stimmte.** Die Streu-Deko der vier Schneepaletten enthält einen
Windsack. Auf den beiden windstillen Bahnen stand er trotzdem da und versprach Wind, den es dort
nicht gibt – auf den Gletscherspalten sogar gegen den eigenen Einleitungstext. Eine Bahn kann
einzelne Requisiten der Palette jetzt abwählen (`autoDecor.ohne`). Die Prüfung dazu steht in
`tools/schnee.mjs` und ist die Art Prüfung, die sich lohnt: Geschrieben für die eine Bahn, die mir
aufgefallen war, hat sie sofort die zweite gefunden.

**Die Schlinge auf der Wächte.** Die Gletscherspalten waren nach dem Umbau nicht schwer, sondern
unspielbar: Der Bot erreichte in **zehn von zehn** Runden das Schlaglimit und kam kein einziges Mal
ins Loch. Die Spur zeigte, woran: Der Ball kam auf der Schneewächte zur Ruhe, spielte den nächsten
Schlag von ihr aus, sie brach hinter ihm weg, er fiel – und wurde an seinen Ruheplatz zurückgelegt,
also genau wieder auf die Wächte. Achtzehn Schläge lang, jedes Mal dasselbe.

Das ist kein Bahnfehler, sondern einer im Spiel, und er betraf jede Bahn mit einer Wächte. Eine
Wächte trägt *über* die Rinne, sie ist kein Standplatz: Seit Fassung 152 rutscht der Ball am Ende
eines Schlags von ihr herunter, auf den nächsten festen Boden daneben – ohne Strafschlag, denn
gefallen ist er nicht. `tools/schnee.mjs` prüft das am Verhalten, nicht am Quelltext, und meldet
auf dem alten Stand vier benannte Fehler.

**Und warum in den Spalten jetzt Wasser steht.** Auch mit der Regel blieb die Bahn zäh, denn die
zweite Hälfte des Problems war der Abgrund selbst: Wer zwischen zwei Eisfeldern hineinfällt, wird
an seinen Ruheplatz zurückgelegt – und der lag auf dem schmalen Streifen am Spaltenrand, von dem
aus er gerade hineingefallen war. Jetzt steht in allen drei Spalten Schmelzwasser. Wasser kostet
einen Schlag und legt zurück, aber es sperrt nicht ein. Dazu liegt an beiden Enden jeder Querung
fester Firn statt blankem Eis – auf Eis kann der Ball vor einer Spalte nirgends liegen bleiben, und
dann stochert man nur davor herum. Aus *nie im Loch* wurden **Ø 3,7 Schläge, Median 3, kein
Limit-Treffer.**

**Und eine Zahl, die etwas Falsches behauptet hat.** Der Gipfel stand auf Par 6. Der Bot braucht
dort im Schnitt 9,4 Schläge und im Median 11, und die Verteilung ist zweigeteilt: halbe Runden mit
4 bis 8 Schlägen, halbe mit 11 bis 15, je nachdem ob man eine der drei Etagen wieder hinunterfällt
und den Aufstieg noch einmal fährt. Am Schlaglimit war die Bahn dabei nie – höchstens 15 von 22.
Zu ändern war also nicht die Bahn, sondern das Par: **8**. Ein Par, das kein Mensch erreicht, ist
keine Herausforderung, sondern eine falsche Auskunft.

### Der Gießlöffel: das einzige Hindernis, das die Bahn aufbaut

Eine Pfanne am Rand der Schmelze kippt im Takt flüssiges Erz in eine Rinne. Das Erz läuft ein Feld
weiter, erstarrt und ist von da an Boden. Mit jedem Guss wächst die Brücke um ein Feld, bis die
Glutspalte überbrückt ist.

**Warum er nicht der Blitz ist.** Ein Streifen, der im Takt tödlich wird, steht schon im
Sturmhimmel. Das Eigene hier ist nicht die Gefahr, sondern dass daraus Weg wird. Die Bruchwand
räumt einmal Fels weg, ein Tor öffnet und schließt – hier entsteht Boden, wo keiner war, und er
bleibt. Es ist das einzige Hindernis im Spiel, das die Bahn *aufbaut*.

**Warum das ohne Eingriff in die Physik geht.** Glut und Boden sind für den Bahnbau beide „Boden":
Um eine Glutkachel herum baut `level.js` keine Bande, um eine Bodenkachel auch nicht. Ein Feld von
`l` auf `#` umzuschreiben ändert darum nur, was beim Betreten geschieht. Über einen Abgrund ginge
es nicht – dort steht eine Bande, und die bliebe mitten auf der neuen Brücke stehen.

**Wie schnell.** Takt 2,2 s, Glut 0,9 s – die Brücke steht nach gut zehn Sekunden. Die erste
Fassung war halb so schnell (Takt 4,2 s, Glut 2,0 s) und fühlte sich nach Warten an statt nach
Zusehen. Die beiden Zahlen hängen zusammen: Das Fenster zum Hinüberkommen ist Takt minus Glut. Wer
nur den Takt verkürzt, macht die Bahn nicht schneller, sondern enger.

**Und warum es trotzdem eine Aufgabe ist.** Beim Guss glüht die *ganze* gefüllte Rinne, denn das
Erz läuft über das schon Erstarrte hinweg bis nach vorn. Sonst wäre die Rinne nach dem ersten Guss
ein sicherer Steg und die Aufgabe bloßes Warten. Abgekühlt wird von hinten nach vorn: Am Löffel
wird der Strom zuerst dünn, vorn steht das Erz am längsten. Dadurch läuft eine Abkühlungswelle über
die Rinne, und man kann ihr hinterherlaufen, statt immer auf die ganze Brücke zu warten.

Zwei Werkzeuge mussten mitlernen, und beide aus demselben Grund: Für sie steht in der Karte Glut,
wo im Spiel Boden entsteht. `tools/mine.py` und `tools/validate.mjs` zählen die Felder einer Rinne
darum als Weg – sonst meldeten sie „Loch vom Abschlag nicht erreichbar" für eine Bahn, deren Weg
entsteht, während man davorsteht. `tools/mine.mjs` prüft dafür die zehn Regeln des Löffels nach,
vom ersten Guss bis zu der Glut, die beim nächsten Loch wieder dasteht.

Im Editor und unter geteilten Bahnen gibt es ihn **nicht**: Sein `rinne`-Feld ist ein
verschachteltes Objekt, und der Filter für fremde Bahndaten (`src/share.js`) lässt nur flache Werte
durch. Lieber kein Gießlöffel in einer Freundesbahn als eine Lücke in dieser Prüfung.

Der Prellklotz der Mine ist ein **Fass** (`style: 'fass'`): eichen, mit drei Eisenreifen, und es
staucht sich sichtbar, wenn man es trifft. Ohne eigenen Stil fiel es auf den Fliegenpilz zurück, mit
dem das Märchenland angefangen hat – und ein Fliegenpilz vierhundert Meter unter Tage ist Unsinn.

Dazwischen stand kurz ein Grubenstempel, der Holzpfosten mit Kappholz, der im Berg die Firste
abfängt. Sachlich richtig, nur hat ihn niemand als solchen erkannt: dünner Schaft, zwei Ringe wie
aufgesteckte Teller, oben ein schwebender Balken. Ein Fass muss man nicht erklären. Und es ist rund
– ein Prellklotz wird aus jeder Richtung getroffen, darf also keine Vorderseite haben; ein Hunt
hätte eine, und auf der Lorensohle fahren schon welche.

Gebaut ist es aus zwei Kegelstümpfen, die sich in der Mitte zum Bauch weiten, und drei `reifen`.
Der Reifen ist neu im Zeichner (`src/render.js`) und ist eine `saeule` ohne Deckel: Mit Deckel legte
jedes Band eine volle Scheibe quer über das Fass, und drei Scheiben deckten das ganze Holz zu.

**Zwei weitere Maschinen** (`src/obstacles_mine.js`, gezeichnet in `src/render_mine.js`):

| Typ | Was sie tut |
|---|---|
| `sprengladung` | Die Lunte brennt sichtbar ab, dann wirft der Druck alles im Umkreis nach außen – umso weiter, je näher es liegt (voll am Zünder, null am Rand). Sie kostet **keinen** Schlag und wirkt auch auf einen ruhenden Ball: Wer sich richtig hinlegt, lässt sich von ihr tragen. Takt 7,5 s, Lunte 2,4 s, Reichweite 3,2 Felder. |
| `kippbuehne` | Eine Bohle über dem Schacht, die auf einer Achse ruht und zu der Seite kippt, auf der der Ball liegt. In einem Satz: **über die Mitte musst du kommen.** Wer es schafft, wird hinübergeworfen; wer davor liegenbleibt, rutscht zurück. Um die Achse liegt eine Totzone, damit nicht ein Fingerbreit über alles entscheidet. |
| `grubenlampe` | Leuchtet ein Stück Bahn aus. Keine Wirkung auf den Ball – und auf einer dunklen Bahn trotzdem das Wertvollste, was dort steht. |

Zwei Dinge, die ich **nicht** gebaut habe, obwohl sie auf der Hand lagen: Ein Förderkorb wäre der
bestehende *Aufzug*, eine Pressluftdüse der bestehende *Aufwind*, und ein Schöpfrad, das den Ball
eine Etage höher trägt, wäre *Aufzug* und *Zahnstange* unter einer runden Zeichnung. Neue Optik ist
kein neues Spiel. Aufzug, Zahnstange, Lore und Aufwind kommen in der Mine natürlich trotzdem vor –
nur eben als das, was sie sind.

Geprüft wird beides dauerhaft mit `node tools/mine.mjs`: dass der Druck nach außen geht und mit dem
Abstand abnimmt, dass jenseits der Reichweite nichts passiert, dass kein Strafschlag anfällt, dass
der Knall genau einmal je Zündung gemeldet wird – und für die Bühne, dass sie hinter der Mitte
vorwärts wirft, davor zurück, in der Totzone nichts tut und ohne Ball in die Waage zurückkehrt. Für
die Bruchwand acht weitere Proben: dass sie ohne Sprengung steht und den Ball aufhält, dass eine
Zündung daneben sie bricht, dass sie danach offen *bleibt*, dass eine Zündung außer Reichweite sie
stehen lässt, und dass sie beim nächsten Loch wieder dasteht.

**Die Bohle hat einmal nichts getan, und das still (Fassung 161).** Fynn hat gemeldet: „man kann
auf ihr liegen, ohne dass was passiert." Stimmte. Bis Fassung 160 stand in `obstacles_mine.js`
`KIPP_KRAFT = 5,2` – die Beschleunigung bei voller Neigung. Der Stollenboden bremst aber mit **4,2**
(`FRICTION['#']`), und `physics.js` zieht die Bremsung im selben Rechenschritt ab, in dem die Bohle
schiebt, und kappt das Tempo dabei bei null. Eine Bohle, die mit weniger als 4,2 schiebt, bewegt
einen liegenden Ball darum nicht langsam, sondern **gar nicht**. Bei 5,2 kam das erst jenseits von
86 % der halben Länge zustande. Gemessen: vier Sekunden Ruhe bei u = 0,1 / 0,3 / 0,5 / 0,7 / 0,85 →
Weg jeweils 0,000.

Behoben mit zwei Zahlen, die auf dasselbe zielen – *außerhalb der Totzone muss sie immer etwas tun*:
`KIPP_KRAFT` auf **12,0**, damit der Schub die Reibung deutlich schlägt, und neu `KIPP_MIN = 0,45`,
die Neigung, die sie sofort einnimmt, sobald die Last die Totzone verlässt. Ohne die zweite wüchse
die Neigung bei null los, und gleich hinter der Totzone gäbe es wieder ein Stück, auf dem nichts
passiert. Eine Wippe kippt auch nicht ein Promille, wenn man einen Zeh über die Mitte setzt – sie
geht über. Die Totzone selbst bleibt: Dort *darf* man liegenbleiben, sonst entschiede ein
Fingerbreit über alles.

**Warum die Prüfung das nicht gefunden hat**, ist die eigentliche Lehre. Die Prüffläche in
`tools/mine.mjs` ist **Eis** (Reibung 0,75) – mit Absicht, damit man den Stoß misst und nicht die
Bremsung. Auf Eis gewinnt auch eine schwache Bohle. *Eine Prüfung auf einem Sonderboden beweist die
Mechanik, nicht die Wirklichkeit.* Seit Fassung 161 steht dieselbe Messung deshalb ein zweites Mal
dort, auf Stollenboden und mit einem **ruhenden** Ball: In der Totzone darf er liegenbleiben, bei
u = ±0,35 / ±0,5 / ±0,7 muss er von selbst mindestens eine Kachel wegrutschen. Dazu ein Wächter über
die Zahlen selbst – `KIPP_KRAFT × KIPP_MIN > FRICTION['#']` –, damit niemand die Kraft später
herunterdreht, ohne an die Reibung zu denken. Auf dem alten Stand meldet die neue Prüfung genau das,
was Fynn gesehen hat: 0,00 Kacheln, überall.

**Die zwölf Bahnen** (`src/courses_mine.js`, erzeugt von `tools/mine.py`):

| # | Name | Par | Abschnitt | Was sie will |
|---|---|---|---|---|
| 1 | Mundloch | 3 | Tageslicht | Halde, Grubenholz, das Tor in den Berg. Noch ohne Schleier. |
| 2 | Erster Stollen | 3 | Stollen | Die Dunkelheit und die Lampen: den Lichtern nach, dann findet man das Loch. |
| 3 | **Der Schacht** | 3 | Stollen | **Zwei Sohlen.** Die Strecke bricht vorn ab – über die Kante rollen und fallen lassen. Kostet nichts. |
| 4 | Sprengfeld | 4 | Stollen | Zwei Ladungen im Gang, und rechts wie links steht nichts mehr. |
| 5 | **Die Bruchwand** | 4 | Stollen | **Der Berg ist zu.** Daneben liegt eine Ladung; wenn die zündet, steht der Gang offen – für den Rest der Bahn. |
| 6 | Kippbohle | 3 | Stollen | Der Schacht quer durch den Stollen, darüber die Bohle. Nicht zaghaft. |
| 7 | Lorensohle | 4 | Stollen | **Zwei Sohlen.** Oben queren zwei Hunte die Strecke, unten liegt das Loch. |
| 8 | Kristallkammer | 4 | Kristall | **Zwei Sohlen.** Oben der Magnetit auf der Galerie, unten ein Felspfeiler vor der großen Kammer. |
| 9 | Sohle Neun | 5 | Schmelze | **Zwei Sohlen.** Man fällt mitten in die Glut: ein Steg über den einen Spalt, eine Bohle über den anderen. |
| 10 | **Die Gießhalle** | 4 | Schmelze | **Der Gießlöffel.** Quer durch die Halle steht die Glut, hinüber führt nichts – bis das Erz die Brücke baut. |
| 11 | **Die zerbrochene Brücke** | 4 | Schmelze | **Die Lavafontäne.** In der Mitte fehlt ein Stück Brücke, und genau dort schießt im Takt die Lava hoch – die trifft auch in der Luft. |
| 12 | Die Schmelze | 5 | Schmelze | Die Insel im Lavasee. Der Damm ist zugemauert, in der Mitte steht der **Schmelzofen**, und im Takt fegt eine Ladung alles hinunter. |

### Die Lavafontäne: die einzige Falle, die in die Luft greift

Ein Spalt im Stollenboden, aus dem im Takt ein Strahl Lava hochschießt. Wer darin steht, verbrennt –
und wer darüber fliegt, auch. Das Zweite ist der Punkt.

**Sie ist nicht die Stachelfalle.** Eine Platte, aus der im Takt etwas hochkommt, steht schon im
Märchenland. Zwei Dinge sind hier anders, und beide hängen zusammen:

*Der Takt ist kurz* – 2,1 Sekunden, davon 0,5 Vorwarnung und 0,55 der stehende Strahl. Das ist kein
Detail, sondern die ganze Aufgabe: Bei einem langen Takt wartet man, bis Ruhe ist, und spielt dann in
aller Gemütlichkeit; die Maschine kostet nur Zeit. Bei einem kurzen Takt kann man nicht warten – die
Ruhe dauert eine Sekunde. Man muss den Schlag in die Lücke legen, während sie noch da ist.

*Sie greift in die Luft.* Die Physik überspringt im Flug fast alles: keine Reibung, keine Wände,
keine Hindernisse. Nur der springende Hai holt einen fliegenden Ball herunter – und jetzt die
Fontäne, über `airTrigger` (`obstacles_mine.js`). Genau deshalb kann die Bahn eine zerbrochene
Brücke sein: Über einen Spalt zu springen, während unten etwas hochschießt, ist erst dann eine
Entscheidung, wenn der Strahl den Sprung auch treffen kann. Eine Fontäne, über die man einfach
hinwegfliegt, wäre Kulisse.

**Wie man sie kommen sieht.** In der Mine ist es dunkel, und eine Gefahr, die man erst sieht, wenn
sie wirkt, ist keine Aufgabe, sondern Pech. Darum kündigt sich jeder Stoß an: Der Spalt glüht auf,
und ein Ring auf dem Boden füllt sich von innen nach außen – voll heißt Stoß. Der Ring steht
**immer** da, auch in Ruhe: Wo es gleich brennt, muss man auch dann sehen, wenn gerade nichts brennt.
Das ist dieselbe Regel wie bei der Sprengladung – die Ansage steht auf dem Boden, nicht am Gerät.
Der Strahl selbst zählt in der Dunkelheit als **Licht**; der Spalt glimmt schwach, beim Stoß reicht
der Schein weit. Es ist der einzige Ort einer Bahn, an dem man ausgerechnet dann am meisten sieht,
wenn man nicht hindarf.

**Bahn 11, „Die zerbrochene Brücke".** Über den See führte einmal eine Brücke; in der Mitte fehlen
drei Felder. Hinter dem Loch steht seit Fassung 162 eine kleine Wand: Hinter dem Absatz beginnt die
Glut, und Glut ist für das Spiel Boden – an ihrem Rand baut `level.js` darum keine Bande. Ein Schlag,
der einen Tick zu lang war, rollte am Loch vorbei und in die Schmelze. Das ist keine Aufgabe, sondern
eine Strafe dafür, dass man getroffen hat; die Wand gibt den Ball statt dessen zurück. Der Bot spielt
die Bahn danach in Ø 5,0 statt 5,5, Median 5, längster Lauf 9 statt 12. Die Rampe steht drei Felder davor: genug Anlauf, um sie zu treffen, zu wenig, um den
Stoß noch abzuwarten, nachdem man geschlagen hat. Im Bruch steht die große Fontäne, auf den beiden
Stegen je eine kleinere, im Takt gegeneinander versetzt. Der Bot spielt sie mit Ø 5,5 bei Par 4,
Median 4, Profi 3 Schläge, 0 von 10 Läufen am Schlaglimit.

Damit das überhaupt als Bahn durchgeht, musste `tools/mine.py` etwas lernen: Die Wegprüfung kannte
bis dahin nur Rollen und Fallen. Jetzt rechnet sie **den Sprung mit** – mit denselben Zahlen wie das
Spiel (halbe Rampenlänge bis zur Kante, dann `land`) – und prüft zusätzlich, dass die Rampe auf
festem Boden aufsetzt und keine Fontäne den Abschlag oder das Loch bestreicht. Eine Schanze, die in
die Glut wirft, fiele sonst erst beim Spielen auf.

**Geprüft wird das Verhalten, nicht der Quelltext** (`tools/mine.mjs`): Ein Ball liegt auf dem Spalt,
und über zwei volle Umläufe wird mitgeschrieben, wann ein Lava-Ereignis fällt – im Stoß ja, in der
Vorwarnung und in der Ruhe nie. Dann dasselbe mit einem Ball, der in der Luft festgehalten wird: Im
Stoß holt ihn der Strahl herunter, in der Ruhe kommt er durch. Und für die Bahn wird nachgerechnet,
dass der Flugweg der Rampe wirklich über eine Fontäne führt – sonst wäre der Haken in der Luft ohne
Wirkung und die Bahn eine gewöhnliche Rampe.

**Der Schmelzofen ist die Windmühle.** Nicht *wie* eine Windmühle – es ist dieselbe Maschine,
Zeile für Zeile: ein Bau quer über dem Weg, ein Durchgang in der Mitte, der sich im Takt schließt.
Nur wäre ein Windrad sechshundert Meter unter Tage Unsinn; dort weht nichts. Also dieselbe Frage –
*wann gehe ich durch?* – in der Sprache der Schmiede: ein Ofen aus Schamottsteinen, im Maul brennt
das Feuer, oben raucht die Esse, und was den Weg sperrt, ist die **eiserne Ofenklappe**, die aus
dem Sturz herunterfährt. Ihre Unterkante steht im Feuer und glüht.

**Erst stand ein Schaufelrad davor**, die Mühlenflügel in Eisen. Das war der Fehler, und Lüddecke
hat ihn sofort gesehen: Mit Rad war es doch wieder eine Mühle, nur anders bemalt. Ein Ofen hat kein
Rad, er hat eine Klappe – und die ist auch ehrlicher: Sie *ist* das, was sperrt. Man sieht nicht
ein Rad und muss sich denken, wann es zu ist, sondern sieht die Klappe fallen.

Ihr Stand ist dabei nicht neu erfunden, sondern aus demselben Winkel gelesen, aus dem das
Hindernis `blocked` rechnet (`obstacles.js`, `Windmill.update`). Bei 0,30 sperrt es – und genau
dort ist die Klappe ganz unten. Das Bild zeigt also nicht *ungefähr*, sondern *genau*, was gilt;
eine Zeichnung, die nach eigener Uhr liefe, wäre schlimmer als gar keine, weil man sich auf sie
verließe.

**Der Fahrweg war trotzdem falsch** – Fassung 156 hatte an der Klappe einen Weg von 0,45 vor der
Sperre. Das ist richtig gerechnet und trotzdem falsch gemessen: Der Winkel kommt über den ganzen
Umlauf nie weiter als 0,785 vom untersten Punkt weg (ein halber Blattabstand bei vier Blättern).
Mit 0,45 stand die Klappe also nur in einem Wimpernschlag ganz oben – das Maul sah fast immer
versperrt aus, obwohl der Weg 62 % der Zeit frei ist. Seit Fassung 157 sind es `SPERRT = 0,30` und
`FAHRWEG = 0,22`: 38 % ganz zu, 34 % ganz offen, der Rest Fahrt. `tools/mine.mjs` rechnet das jetzt
nach, statt nur die Zeichen zu lesen – es liest die Schwelle aus *beiden* Dateien und vergleicht
sie, und es prüft, dass der Fahrweg unterhalb des weitesten Standes bleibt.

**Die Feinarbeit (Fassung 157).** Der Ofen war ein glatter Kasten mit einem Loch, und ein glatter
Kasten ist kein Bauwerk. Dazugekommen ist, was ihn zu einem macht: gemauerte Lagen mit versetzten
Stoßfugen (zwei Fugen übereinander gibt es an keiner Mauer, die hält – daran erkennt das Auge
Mauerwerk), **Zugeisen** in der Wand, weil ein Ofen sich mit der Hitze selbst auseinandertreibt,
ein **Rauchfang** zwischen Dach und Esse samt Eisenringen, **Funken**, die schneller steigen als der
Rauch und unterwegs verlöschen, **Ruß** über dem Maul, ein **Kohlenbett** aus kantigen dunklen
Brocken auf einem hellen Streifen – die Glut sieht *zwischen* der Kohle durch – mit Flammenzungen
davor, dazu Nieten auf dem Eisen und ein **Schieberkasten** über dem Maul, in dem die Klappe steckt,
wenn sie oben ist. Alles Kleinteilige hängt am Maßstab (`fein = s > 24`): Aus der Übersicht
verschmieren Fugen und Nieten zu einem grauen Schleier, dort ist weniger mehr.

Gebaut war daran nichts: `style: 'ofen'` an der Windmühle, und `render.js` biegt beim Zeichnen nach
`render_mine.js` ab. **Ein Stil ist billiger als ein Hindernis**, und er hält die Regel gleich – wer
die Mühle im Märchenland kennt, kennt den Ofen. Dazu die eine Sache, die ein Ofen können muss: Er
zählt in der Dunkelheit der Mine als **Licht**. Ein Feuer, das Licht malt und keins gibt, wäre
Kulisse.

`tools/mine.mjs` prüft: dass unter Tage keine Windmühle *als* Windmühle steht (ein vergessener
Stil fiele sonst nicht auf – der Zeichner beschwert sich nicht, er malt ein Segeltuch-Kreuz in den
Berg), dass vor dem Maul **kein Rad** steht, dass die Klappe den Winkel des Hindernisses liest statt
einer eigenen Uhr, dass sie an derselben Schwelle ganz zu ist und einen guten Teil des Umlaufs ganz
offen steht – und jedes einzelne Stück der Feinarbeit. Letzteres steht dort, weil es sonst beim
nächsten Umbau still verschwindet: Ein Ofen ohne Fugen ist wieder der Kasten aus Fassung 156.

Die Pare stehen nicht nach Gefühl, sondern nach dem, was die Bahnen wirklich spielen: Der
Normalspieler-Bot (`node tools/audit/audit.mjs mine`) hat sie durchgespielt, und wo sein Median
zwei Schläge unter dem Par lag, ist das Par heruntergegangen. Umgekehrt genauso: „Sohle Neun" kostet
ihn im Schnitt 5,8 Schläge – zwei Lavaspalten –, und darum steht dort seit Fassung 144 eine
Fünf und keine Vier. Ein Vorbehalt bleibt und ist hier
größer als sonst: Der Bot kennt die Karte auswendig, ein Mensch im Dunkeln nicht. Die Pare sind
darum eher knapp bemessen als großzügig.

**Die Belohnung** der Welt ist der Skin **Grubenlampe**: ein eiserner Lampenkörper mit
Messingreifen, in dessen Glas wirklich eine Flamme steht – dazu als Hut der Grubenhelm mit der
kleinen Lampe vorn. Freigeschaltet wird er wie jede Weltbelohnung, indem man die Welt vollständig
spielt.

## Die Flut (Vorschau)

Die elfte Welt ist noch nicht im Spiel; sie steht in der Vorschau. **Zwölf Bahnen, drei je Tiefe**,
Stufe Legende:

| | Abschnitt | Bahnen | was hier dazukommt |
| --- | --- | --- | --- |
| 1–3 | `wasserlinie` | Die Hafenmole · Der Priel · Die Buhnen | Becken · Pumpwerk · Strömung und Wracktor |
| 4–6 | `flachwasser` | Der Kessel · Der Seegraswald · Die Austernbank | Strudel · Tangwald · Riesenmuschel |
| 7–9 | `daemmerzone` | Die Kanalisation · Die Kaimauer · Der Marktplatz | Abflußrohr · Ankerkette · alles der Stadt zusammen |
| 10–12 | `meeresgrund` | Die Schlotebene · Das Kaltwasserfeld · Der Schlund | Schwarzer Raucher · Gegenströmungen · der Anglerfisch |

**Jede Maschine bekommt ihre eigene Bahn, bevor sie sich mit anderen mischt.** Wer zum ersten Mal
einen Strudel sieht, sieht ihn allein und lernt, was er tut; erst danach steht er neben einer
Strömung. Eine Welt, die alles auf einmal auspackt, ist nicht schwer, sondern unübersichtlich.

**Der Anglerfisch kommt zuletzt, und nur einmal.** Er ist das einzige Hindernis dieser Welt, das
einen Schlag zurücksetzt – damit ist er die Pointe der letzten Bahn und nicht das Grundrauschen
der ganzen Welt.

**Keine Bahn liegt geradeaus.** Beim ersten Anlauf waren die zwölf lange gerade Stege, und der
Profi-Bot lochte die ersten beiden mit **einem Schlag** ein: Abschlag und Loch standen auf einer
Linie, und dazwischen lag nur ein Becken, das man abwarten konnte. Jetzt hat jede Bahn wenigstens
einen Knick – ein Bogen über Wasser ist nicht zu schlagen, also kostet er einen Schlag.

Der Bot hat auch die Pars gesetzt. Das Verfahren ist immer dasselbe: Der Profi-Bot sagt, was
optimal geht, der Normalspieler-Bot, was ein Mensch braucht. Par ist der Profi-Wert, und der
Normalspieler soll zwei bis drei darüber landen, ohne ins Schlaglimit zu laufen. Danach standen
vier Bahnen anders da als geplant – Priel, Buhnen, Seegraswald und Austernbank sind Par 5 geworden,
weil der Profi dort fünf Schläge braucht.

Eine Bahn hat dabei etwas über den Tangwald verraten. *Der Seegraswald* hatte zuerst **zwei**
Tangfelder, eines auf dem Hinweg und eines auf dem Rückweg. Damit fand der Profi-Bot in acht
Schlägen gar keine Lösung mehr, und jeder fünfte Durchgang des Normalspielers lief ins Schlaglimit.
Der Grund ist eine Kette: Der Tang nimmt den Schwung, der nächste Schlag trägt nicht mehr über die
Ecke, und der Ball geht ins Meer. Mit einem Tangfeld: Ø 6,4 Schläge, kein einziger Sturz. **Eine
Maschine, die man zweimal trifft, ist nicht doppelt so gut – sie ist doppelt so zäh.**

Elf Maschinen: **Flutbecken**, **Pumpwerk**, **Strömung**, **Strudel**, **Anglerfisch**,
**Riesenmuschel**, **Tangwald**, **Schwarzer Raucher**, **Ankerkette**, **Wracktor** und
**Abflußrohr**.

### Die Belohnung: der Taucherhelm

Wer in dieser Welt die Rundensumme unter Par bringt, darf den **Taucherhelm** tragen – eine
messingene Haube mit Bullauge, zwei angeschnittenen Seitenfenstern, acht Schrauben rings um das
Glas und einem Kragen mit Nieten. Hinter dem Glas steht dunkles Wasser mit einem schrägen
Lichtstreifen; daran erkennt man Glas auch ohne Spiegelung.

Er ist ein **Ganzkörper-Skin** und kein Hut, der obendrauf sitzt – ein Taucherhelm als Hütchen
sähe aus wie ein Eimer. Und er ist der einzige Weltskin ohne zusätzlichen Kopfschmuck: Was ihn
lebendig macht, sind die **Blasen**, die aus dem Ventil aufsteigen, größer werden und
verschwinden. Das ist dieselbe Bewegung, die in der ganzen Welt im Hintergrund läuft – ohne sie
wäre der Helm ein Stillleben, und man sähe ihm nicht an, daß darin jemand atmet.

Die Blasen verblassen nur zu drei Vierteln, nicht ganz. Eine Blase, die linear auf null geht, ist
auf halbem Weg schon grau und sieht aus wie Staub statt wie Luft.

### Der Abstieg ist stufenlos

Die Welt hat vier Paletten – Wasserlinie, Flachwasser, Dämmerzone, Meeresgrund –, und als sie zwölf
Bahnen bekam, lagen je drei auf einer davon. Damit sprang die Farbe **drei Mal hart um**: Man
spielt drei Bahnen im selben Blau und steht bei der vierten plötzlich woanders. Das ist kein
Abstieg, das sind vier Zimmer.

Jetzt trägt jede Bahn ihre eigene **Tiefe** (0,12 an der Oberfläche bis 1,0 auf dem Grund, in
gleichmäßigen Schritten von 0,08), und `themaFuer()` in `src/themes.js` **mischt** die Palette
dazwischen. Die vier bleiben als Stützstellen stehen – sie sind von Hand gesetzt und sollen es
bleiben –, aber zwischen ihnen wird gerechnet. Zwölf Bahnen sind dann zwölf Schritte hinunter statt
vier Sprünge: von `#2c6d84` über `#1b5067` und `#0f2e40` bis `#07202b`.

**Gemischt wird nur, was eine Farbe ist** – dazu die Tiefe selbst, an der die Wassersäule, der
Schleier und die Lichtschächte hängen. Stimmung, Mauerstil und Requisitenliste kommen ganz von der
näheren der beiden Paletten: Man kann eine Qualle nicht halb zeichnen, und eine Bahn, auf der Bojen
und Quallen zugleich stehen, sähe nach Versehen aus.

Die erste Tiefe ist **nicht null**, sondern die der obersten Palette. Alles darunter wird
abgeschnitten, weil es keine Stützstelle mehr gibt – und dann waren die ersten beiden Bahnen
farblich fast gleich, während anderswo ein ordentlicher Schritt lag. Gemeldet hat das die Prüfung
selbst: größter Farbschritt 17,5, kleinster 3,0. Jetzt sind es 16,8 gegen 7,5.

Die Prüfung dazu trägt ihre Gegenprobe im selben Lauf: Sie rechnet dieselben zwölf Bahnen noch
einmal **ohne** den Mischer durch und verlangt, daß es dann sehr wohl springt (60,1 gegen 0,0).
Ohne diese zweite Hälfte bewiese die erste nichts – eine Prüfung, die auch grün wäre, wenn der
Mischer gar nichts täte, prüft nichts.

**Die Bahnen sind Stege, keine Plätze.** Ringsum steht offenes Wasser, und wer heruntergespült
wird, zahlt. Das ist der Unterschied zwischen einer Strömung, die ärgert, und einer, die etwas
kostet – und der Grund, warum die Welt eine Legende ist. Dass ringsum *Wasser* steht und nicht
Abgrund, ist dabei kein Geschmack, sondern Mechanik: Am Rand eines Stegs über dem Abgrund baut das
Spiel eine Bande, und gegen die würde die Strömung einen nur drücken. Auf der Weltkarte liegt sie allein im Südostmeer, mit einem Kirchturm als Marke –
dem Einzigen, was von so einer Stadt am Ende noch herausschaut.

### Erst war es eine Weltregel, und das war ein Fehler

In der ersten Fassung (166) stieg das Wasser auf der **ganzen** Bahn: eine Tide über alles, die von
den Rändern nach innen fraß. Die Idee war gut und ließ sich schlecht spielen. Wer den Augenblick
verpasste, konnte nichts tun als warten, bis das Wasser zurückging – eine halbe Minute, in der der
Ball liegt und nichts passiert. Das ist kein Druck, das ist Leerlauf, und Leerlauf ist das Gegenteil
von dem, was die Idee wollte. Gemeldet hat das nicht eine Prüfung, sondern der, der es gespielt hat.

Seit Fassung 167 ist es ein **Hindernis** wie jedes andere: ein Becken an einer Stelle der Bahn, mit
einem Takt von ein paar Sekunden – wie das Wandertor, die Falltür oder das Mühlrad. Ringsum bleibt
alles trocken und immer spielbar.

### Das Flutbecken

Es läuft von seinem Rand nach innen voll und folgt dabei seiner Form. Jedes Bodenfeld im Becken
bekommt beim Aufbau eine Ringnummer (Vielquellen-Breitensuche, `src/obstacles_flut.js`): 1 für
alles, was an den Beckenrand grenzt, 2 für alles, was an einen Einser grenzt, und so weiter. Steht
das Wasser auf Stufe n, ist jedes Feld mit Ringnummer ≤ n überflutet. Eine schmale Rinne säuft damit
von beiden Seiten zu, ein runder Kessel von außen – ohne dass das jemand aufschreiben müsste.

**Wie tief, und darum wie lange.** Ohne Angabe füllt sich ein Becken ganz: Die Tiefe ist die
tiefste Ringnummer, die darin vorkommt, und daraus ergibt sich der Takt von selbst. Ein vier Kacheln
schmales Becken ist zwei Ringe tief und braucht knapp elf Sekunden für einen Lauf; sechs Kacheln
wären schon dreizehn. **Wer ein breites Becken baut, baut eine lange Wartezeit** – genau der Fehler
von vorhin, nur kleiner. Darum rechnet `tools/flut.py` für jede Bahn die Zykluslänge aus und schlägt
Alarm, wenn sie über 15 Sekunden geht.

**Der Takt** ist steigen – voll stehen – fallen – leer stehen, dann von vorn: 1,2 s je Ring, 1 s
voll, 5 s leer. Leer steht es mit Absicht viel länger als voll, denn das Leerstehen ist das Fenster,
in dem man durchspielt. Beim ersten Versuch standen dort 3,2 s, und die Probe im Browser ertrank
auch dann, wenn beim Schlag alles frei war – der Ball braucht vom Abschlag bis zum Becken selbst
schon ein bis zwei Sekunden. Diese Probe steht jetzt als Prüfung in `tools/flut.mjs`.

### Die beiden Regeln gegen das Warten

Sie stehen nicht als guter Vorsatz da, sondern als Prüfungen, die eine Bahn ablehnen:

1. **Es gibt immer einen trockenen Weg.** Auch wenn jedes Becken der Bahn randvoll steht, muss ein
   Weg vom Abschlag zum Loch führen. Das Becken ist die *kurze* Möglichkeit, nicht die einzige: Wer
   den Takt trifft, spart einen Schlag; wer ihn nicht trifft, spielt außen herum. Niemand muss je
   stehenbleiben und zusehen. Gegengeprüft mit einer Bahn, deren Becken quer durchgeht – sie wird
   abgelehnt.
2. **Der Takt bleibt kurz.** Höchstens 15 Sekunden für einen ganzen Lauf, und das ist die längste
   Zeit, die man überhaupt je wartet.

Dazu die dritte, gegen Zierrat: Der Weg durch das leere Becken muss wirklich kürzer sein als der
Umweg, sonst nimmt ihn niemand und die Maschine läuft für nichts.

### Zu sehen sein muss nicht das Wasser

`src/render_flut.js` zeichnet zwei Dinge, und keines davon ist das gestiegene Wasser – das kann das
Spiel schon. Erstens **wo das Becken liegt, solange es leer ist**: ein feuchter Schimmer auf jeder
Beckenkachel und eine helle Kante ringsum. Ein Becken, das trocken aussieht wie der übrige Boden,
wäre eine Falle ohne Ansage. Und zweitens **welche Felder als nächstes drankommen**: ein Schimmer,
der in den Sekunden davor anschwillt, mit Schaumkante zur trockenen Seite – dieselbe Regel wie beim
Ring der Lavafontäne und bei der Lunte der Sprengladung. Angesagt wird nur steigendes Wasser;
zurückgehendes gibt Boden her und ist keine Gefahr.

### Die Strömung – der Wind dieser Welt, nur stärker

Das Wasser steht nicht still. Eine Strömung ist ein Band, durch das es zieht, und sie hat einen
Unterschied zum Wind des Schneebergs, an dem alles hängt: **sie trägt auch, wer liegt.** Der Wind
versetzt einen rollenden Ball; wer liegt, liegt. Hier nicht – wer in der Strömung zur Ruhe kommt,
treibt ab. In einer Strömung kann man nicht in Ruhe zielen, und das ist ihr ganzer Sinn.

Daraus folgt eine Zahl: Die Reibung auf Stein ist 4,2 Kacheln/s², und eine Kraft *darunter* bewegt
einen liegenden Ball **gar nicht** – `Math.max(0, sp - dec)` frisst sie glatt auf. Eine Strömung
muss also spürbar darüber liegen; sie steht bei 9,0. Genau diese Falle hatte schon die Kippbühne der
Zwergenmine zu Fall gebracht, und `tools/flut.mjs` hält beides fest: die Zahl und die Probe in
Bewegung (ein Ball, der im Band liegt, muss abtreiben; einer daneben muss liegen bleiben).

Sie beschleunigt **nicht** ins Unendliche: Sie zieht den Ball auf ihr eigenes Tempo und dann nicht
weiter, wie echtes Wasser. Ohne diese Schranke wäre sie keine Strömung, sondern eine Kanone.

Mit `puls` wird aus dem gleichmäßigen Zug eine **Dünung**: Sie schwillt an und ab, und dazwischen
ist für einen Augenblick Ruhe – das ist dann das Zeitfenster.

**Dieselbe Reibungsfalle ist dabei noch zweimal zugeschnappt**, und beide Male sah es im Browser
aus, als sei die Maschine kaputt, während alle Zahlen grün waren:

1. Die Dünung skalierte zuerst die **Kraft**. Bei halber Welle waren das 13 × 0,32 = 4,16 – knapp
   unter der Reibung 4,2, und damit bewegte sich gar nichts. Jetzt schiebt sie immer mit voller
   Kraft, nur auf ein kleineres **Zieltempo**.
2. Fünf von sechs Strömungen lagen auf **Schlick**, und dessen Reibung ist 20. Eine Strömung mit 13
   trägt dort nichts. `tools/flut.py` lehnt das jetzt ab.

Dazu kam die Wellenform selbst: `max(0, sin)²` – die Formel des Windstoßes im Märchenland – steht
die *halbe* Zeit still, bei gemächlichem Puls sechs Sekunden am Stück. Jetzt ist die Welle
gestaucht: Ruhe nur im untersten Drittel.

Und eine Stelle in `src/main.js`: Wer aus der Strömung gespült wird, darf nicht **mitten in ihr**
zurückgelegt werden, sonst treibt er sofort wieder ab und bekommt den nächsten Strafschlag, bis das
Limit erreicht ist. Derselbe Fehler wie beim Wasser, nur eine Maschine weiter. Gezeichnet wird sie als Striche, die
mitlaufen; ihre Spitze läuft vorweg, so wie eine Welle spitz auf ihre Laufrichtung zeigt. Wie stark
sie zieht, sagt das Tempo der Striche, nicht ihre Farbe.

### Der Strudel – ein Schleuderrad, kein Trichter

Wo zwei Strömungen aufeinandertreffen, dreht sich das Wasser. Ein Strudel führt den Ball im Kreis
und wirft ihn woandershin, als er wollte.

**Er fängt nicht ein**, und das ist eine Korrektur. Der erste Entwurf zog außen nach innen und
drückte innen wieder heraus; die beiden Kräfte hoben sich bei etwa zwei Dritteln des Halbmessers
auf, der Ball kreiste dort und kam nicht mehr los, bis ihn nach vier Sekunden die Notbremse des
Spiels herausnahm. Eine Maschine, aus der einen die Notbremse befreien muss, ist kaputt. Jetzt
drückt er überall ein wenig nach außen: ein Schleuderrad. `tools/flut.mjs` legt einen Ball ohne
Schwung fast genau in die Mitte und verlangt, dass er innerhalb von dreieinhalb Sekunden draußen ist.

### Der Schwarze Raucher – der Aufwind dieser Welt

Eine heiße Quelle am Grund. Im Takt bricht sie aus und wirft alles, was darüber liegt, in hohem
Bogen davon – über Mauern, über Becken, auf einen anderen Steg. Sie ist der **einzige Weg in dieser
Welt, etwas zu überspringen**: Wer fliegt, sieht weder Mauern noch Becken noch die Ränder der Stege.

Der Unterschied zum Aufwind im Sturmhimmel ist der Punkt: Der braucht einen Ball, der mit Schwung
hineinrollt, und trägt ihn in dessen eigener Richtung weiter. Der Raucher nimmt auch einen, der
einfach nur daliegt, und wirft ihn immer dorthin, wohin er zeigt. Damit ist er kein Beschleuniger,
sondern **eine Fähre mit Fahrplan**: Man legt sich darauf und wartet.

Geworfen wird über `launch` – denselben Haken, den Rampe und Aufwind benutzen. Er greift vor der
Flugphase und vor allem vor der Reibung; ein Wurf über `force` wäre wieder die Reibungsfalle.

Und die Ansage geht dem Ausbruch voraus: Vor dem Stoß sammelt sich der Schwall sichtbar im Schlot,
und auf dem Boden liegt ein Ring, der anschwillt. Wer erst beim Ausbruch merkt, dass gleich einer
kommt, hat keine Wahl gehabt – und eine Maschine ohne Wahl ist eine Falle.

### Die Ankerkette – schwerer und langsamer als das Pendel

Ein Anker an einer Kette, der über den Steg schwingt. Er stößt wie das Pendel der Uhrwerkstadt, nur
mit 5,2 s statt 3,4 s Taktzeit. **Langsam ist hier kein Geschmack:** Auf einem drei Kacheln schmalen
Steg über offenem Wasser reicht ein Stoß, um jemanden hinunterzuschicken. Ein schnelles Pendel wäre
dort kein Hindernis, sondern ein Würfel.

Die Kette wird Glied für Glied mitgezeichnet, und die Aufhängung bleibt stehen. Das ist der Grund:
An ihr liest man ab, wo der Anker gleich sein wird. Ein Anker, der scheinbar frei herumfliegt, hätte
keine Bahn, die man vorhersehen könnte.

### Was im Wasser steht – die Requisiten des Außenbereichs

Die Bahnen dieser Welt sind schmale Stege, also ist fast die ganze Karte offenes Wasser. Bis
Fassung 174 war dieses Wasser **leer** – eine blaue Fläche mit einem Steg darin. Jetzt streut jede
Bahn Requisiten hinein, und zwar nach Tiefe verschieden: An der **Wasserlinie** ist das Meer noch
Hafen (Bojen, Poller, Tauwerk), auf der **Sandbank** liegt, was heruntergesunken ist, in der
**Dämmerzone** steht die Stadt (Säulen, Torbögen, Amphoren), und am **Meeresgrund** ist die Stadt
schon wieder Natur – Korallen und Quallen, dazwischen nur noch Bruchstücke.

Drei Körper sind dafür neu, und alle drei sind in Weltkoordinaten gebaut und nicht am
Bildschirmpunkt. Das ist hier keine Förmlichkeit: Auf schmalen Stegen dreht man die Kamera
dauernd, um an den Kanten entlangzusehen, und eine Deko, die sich mitdreht, verrät sich sofort als
aufgeklebtes Bild.

* **Wrackrippen** – ein Kiel im Sand, vier Spanten darüber, zwei Längsgurte als Rest der
  Beplankung. Beim ersten Versuch waren die Spanten kurz und steil, und der Haufen sah aus wie ein
  Rechen: ein Balken mit fünf Zinken. Es fehlten genau zwei Dinge – die Spanten müssen sich nach
  *außen* öffnen (ein Rumpf ist ein U, kein Kamm), und es muss noch Beplankung daran hängen.
* **Amphore** – der schlanke Krug der Stadt, mit Spitzfuß und zwei Henkeln, je nach Startwert
  unterschiedlich tief im Grund versunken. Sie ist absichtlich ein anderer Körper als die Urne der
  Wüstenwelten: höher, enger, ohne Zierreif.
* **Torbogen** – zwei Pfosten und der Sturz darüber, auf einer Seite abgebrochen, das Bruchstück
  liegt davor im Sand. Zuerst war es ein Keilsteinbogen aus sieben Trommeln; im Bild wurde daraus
  ein Haken, weil senkrechte Trommeln auf einem schmalen Halbkreis sich in der schrägen Sicht zu
  einer Raupe reihen. Ein Pfosten-Sturz-Tor ist auf den ersten Blick als Tor zu erkennen – und für
  eine versunkene Stadt ohnehin das richtige Bauwerk.

### Und was im Wasser schwebt

Die Streu-Deko oben braucht Boden unter sich: Sie wirft einen Schatten, also darf sie nicht in der
Luft stehen, und darum endet sie am Rand der Erdscholle. **Unter Wasser ist das die falsche Regel.**
Ein Fischschwarm steht auf nichts, eine Qualle auch nicht, und beide gehören genau dorthin, wo die
andere Deko aufhört: neben die Bahn und über sie hinaus, ins offene Wasser.

Darum gibt es einen zweiten Streu-Durchgang, `schwebDecor`. Er verteilt in einem Ring von sieben
Kacheln um die Karte, was im Wasser hängt – **Fischschwarm**, **Rochen**, **Meeresschildkröte**,
dazu Quallen und einzelne Fische –, auf einer Höhe zwischen 1,1 und 3,8 Kacheln. Nach Tiefe
verschieden: oben Schwärme und Schildkröten, die Luft holen gehen; über der Sandbank am dichtesten,
weil dort noch Licht ist; in der Dämmerzone mehr Rochen und die erste Qualle; ganz unten nur noch
Quallen und Rochen.

**Sie sind reine Zier** – sie kollidieren nicht, sie bremsen nicht, sie halten niemanden auf. Dafür
gelten drei Regeln, und alle drei halten sie vom Spielfeld weg: nie über Boden, mindestens drei
Kacheln Abstand zum nächsten Boden, und nichts im Streifen *vor* der Bahn. Ohne die erste schwämme
ein Rochen über dem Steg und man sähe nicht mehr, wohin man spielt; ohne die zweite verdeckte er
die Kante, an der es ins Meer geht – und die ist in dieser Welt die wichtigste Linie überhaupt.
Geprüft wird beides über alle zwölf Bahnen: 526 Wesen, keines über Boden, keines näher als zwei
Kacheln.

Die Fische im Schwarm sind mit Absicht **groß für ihre Zahl**. Beim ersten Versuch waren es acht
winzige, und in der Übersicht des Spiels ist ein winziger Fisch drei Bildpunkte: Aus dem Schwarm
wurde eine Handvoll gelber Häkchen. Jetzt sind es sechs, die man erkennt. Lieber fünf, die man
sieht, als acht, die man errät.

Alle drei bewegen sich aus der Spieluhr, nicht aus dem Zufall. Das ist hier wichtiger als
anderswo: Es sind viele, sie stehen dicht, und wenn jedes einzeln zuckt, flimmert der ganze Rand.

Dass ein Name in der Palette auch beim Zeichner ankommt, prüft `tools/flut.mjs`. Der Grund ist die
Art des Fehlers: Steht in der Palette ein Name, den der Renderer nicht kennt, passiert **nichts** –
keine Meldung, das Ding fehlt einfach. Das sieht niemand, solange er nicht weiß, wie viele Wracks
eigentlich dastehen sollten.

### Das Wracktor – langsam auf, schnell zu

Eine Luke aus einem Schiffsrumpf, die die Dünung auf- und zudrückt. Sie ist Tor und Schlag in einem,
und der Witz liegt in der **ungleichen Verteilung**: Die Dünung drückt sie über drei Sekunden
langsam auf und schlägt sie in einer halben wieder zu – dieselbe Bewegung, gut sechsmal so schnell.
Wer beim Zuschlagen noch im Durchgang liegt, wird nicht eingeklemmt, sondern weggeworfen; das Blatt
hat an der Spitze rund zehn Kacheln je Sekunde und gibt sie weiter.

Auf dem Boden liegt der Bogen, den es überstreicht, als Schleifspur im Sand, und kurz vor dem
Zuschlagen färbt er sich. Das ist die wichtigste Linie des Hindernisses: Sie sagt, wo man nicht
stehenbleiben darf, und sie sagt es, bevor etwas passiert.

**Warum ein drehendes Blatt und kein steigendes Gitter.** Ein Fallgatter verschwindet nach oben und
ist weg. Ein Türblatt ist auch offen noch da – es liegt dann am Rumpf an und macht den Durchgang
schmaler, als er aussieht. Eine Luke im Rumpf ist ein Loch in einer Wand, kein Tor in einem Zaun.

### Das Abflußrohr – der Verwandte des Kupferrohrs, andersherum gebaut

Dieselbe Idee wie die Rohrpost des Uhrenturms, und in jedem sichtbaren Zug ihr Gegenteil. Die
Rohrpost läuft **über** der Bahn und **außen um sie herum**: ein blankes Kupferrohr auf Stützen, in
dem man den Ball fahren sieht. Der Abfluß liegt **unter** dem Grund und läuft **schnurgerade** –
quer unter allem hindurch, was oben im Weg steht. Zu sehen ist von ihm nur die Naht im Boden: eine
Reihe verrosteter Platten mit Nieten, und darin läuft, während eine Kugel unterwegs ist, eine Blase
mit. Wer die Naht sieht, weiß, wo der Ball wieder herauskommt, bevor er hineinspielt.

**Die Rohrpost wirft, der Abfluß setzt ab.** Das war nicht die erste Absicht – „Spülung" klingt nach
Wucht, und die ersten beiden Versuche spülten den Ball mit 13,5 und 11,5 Kacheln je Sekunde aus dem
Gitter. Beide endeten gleich: Der Ball rollte sechzehn bis zweiundzwanzig Kacheln weit, und diese
Welt besteht aus drei Kacheln schmalen Stegen über offenem Wasser. Die Maschine ertränkte jeden, der
sie benutzte. Jetzt quillt das Wasser aus dem Gitter, statt zu schießen: Der Ball rollt dreieinhalb
Kacheln aus und liegt, und der nächste Schlag gehört wieder dem Spieler. Die Prüfung mißt gegen die
Zahl des Uhrenturms und nicht gegen sich selbst – wird der Abfluß eines Tages stärker als die
Rohrpost, ist das kein Feinschliff, sondern ein Rückschritt.

Auf dem Marktplatz liegt das Gitter in der Ecke des Platzes, wohin einen nur der Brunnen schleudert.
Man spielt nicht hinein, man landet darin – und das ist der Unterschied zwischen einer Abkürzung und
einem Ausweg. Der Bot bestätigt es: mit dem Abfluß drei Schläge statt zwei für den Profi, bei
gleichem Par.

### Die Riesenmuschel – Mauer oder Maul, je nach Takt

Sie öffnet und schließt sich, und je nachdem ist sie zwei völlig verschiedene Dinge:
**geschlossen** ein runder Klotz, von dem der Ball abprallt; **offen** ein Maul, das ihn verschluckt,
kurz festhält und dann mit Schwung in ihre Blickrichtung wieder ausspuckt. Hindernis und Abkürzung
in einem, und was von beidem, entscheidet der Zeitpunkt.

**Sie schiebt, sie schießt nicht.** Die Kanone im Märchenland wirft den Ball durch die Luft; hier
unten gäbe es dafür keine Erklärung – und vor allem flöge er damit über alles hinweg, was diese Welt
ausmacht: über Becken, Strömung und die Ränder der Stege.

**Wer darin liegt, wird nicht zerquetscht.** Sie nimmt den Ball schon, wenn sie erst zu einem
Drittel offen ist, und sie ist keine Mauer, solange sie ihn hält. Sonst gäbe es den Fall „sie
schließt sich genau auf dem Ball", und der hätte keine gute Auflösung: entweder herausgedrückt (sieht
kaputt aus) oder festgesteckt (ist kaputt). Die Prüfung dazu ist gegengeprobt – nimmt man die
Bedingung weg, fällt genau sie um.

### Der Tangwald – das Gegenteil einer Mauer

Ein Streifen Tang quer über den Steg. Er hält nicht auf, er nimmt den **Schwung** – und zwar genau
dort, wo die Halme gerade stehen. Zwischen ihnen bleibt eine Gasse frei, die im Wellengang
mitwandert: Wer sie trifft, rollt fast ungebremst hindurch; wer danebenhält, bleibt mitten im Tang
liegen, und von dort hat man keinen guten Schlag mehr. Er kostet keinen Schlag, nur Weg.

Zwei Dinge, die man ihm nicht ansieht:

- **Gebremst wird über die Geschwindigkeit, nicht über die Reibung.** Die Reibung hängt an der
  Kachel, und ein Streifen, der Kacheln ändert, würde mit dem Flutbecken streiten, das dieselben
  Kacheln beschreibt. Zwei Maschinen auf derselben Karte gehen beim dritten Zusammentreffen kaputt.
- **Anteilig, nicht als fester Abzug.** Ein schneller Ball verliert viel, ein langsamer wenig. Zöge
  man einen festen Betrag ab, stünde er im Tang schlagartig still – das sähe aus wie eine Mauer, und
  eine Mauer soll er gerade nicht sein.

Beim ersten Versuch wanderte die Gasse *in* Laufrichtung statt quer dazu (ein vertauschtes Zeichen),
und der Tang war überall gleich dicht; dazu war er mit 0,82 Resttempo je Sekunde so schwach, dass die
Prüfung „wer danebenhält, bleibt stecken" keinen Unterschied zum freien Weg fand. Jetzt sind es 0,03.

### Der Anglerfisch – das erste Hindernis, das einen sucht

Er schwimmt seine Strecke ab, hin und zurück, die Laterne voraus. Wer sich einfangen lässt, zahlt
einen Schlag und wird an den **Anfang des letzten Schlags** zurückgelegt – dieselbe Strafe wie bei
den Stacheln im Schattenreich.

**Er ist etwas Neues für diese Welt.** Becken, Strömung und Strudel stehen, wo sie stehen: Man kann
ihnen ausweichen und danach in Ruhe zielen. Der Angler kommt zu einem hin. Ein liegender Ball ist
vor ihm nicht sicher, und damit wird aus „ich warte auf den richtigen Augenblick" ein „ich muss hier
weg, bevor er da ist".

Drei Entscheidungen, die man ihm nicht ansieht:

- **Er schwimmt gleichmäßig**, nicht in einer Sinusschwingung wie die Lore der Uhrwerkstadt. Ein
  Fisch, der an den Enden bremst und in der Mitte rast, sieht aus wie ein Pendel – und vor allem
  könnte man sein Tempo nicht abschätzen. Ein Dreieck statt eines Cosinus.
- **Er hat kein `airTrigger`.** Wer über ihn hinwegfliegt, kommt davon. Das ist die Belohnung für
  einen Sprung und der einzige Weg, ihn zu überspielen.
- **Die Laterne ist nicht nur Schmuck.** Auf dem Meeresgrund ist sie das Hellste weit und breit –
  man sieht ihn kommen, bevor man ihn erkennt. Dieselbe Regel wie überall hier: Die Ansage geht der
  Gefahr voraus.

`tools/flut.py` lehnt zwei Dinge ab, die man einer Bahn beim Bauen nicht ansieht: einen Angler,
dessen Strecke neben dem Steg im Wasser liegt (dann schwimmt er da, wo nie ein Ball ist), und einen,
der bis an den Abschlag reicht (dann wird man gefressen, bevor man den ersten Schlag tun konnte).

### Das Pumpwerk

Eine Druckplatte abseits des Weges: Wer darüberrollt, hält **alle** Becken der Bahn vier Sekunden
lang leer. Es ist das Gegenstück zum Schalter im Märchenland – nur öffnet es kein Tor, sondern gibt
Boden zurück. Der Preis ist der Umweg dorthin, nicht das Wasser.

### Ein alter Fehler, den diese Welt ans Licht geholt hat

Wer ertrinkt, wird an seinen Ruhepunkt zurückgelegt. Bisher hat `src/main.js` dafür nach *Boden*
gesucht – und Wasser **ist** Boden für die Physik (`FLOOR_CHARS`). In einer Welt, in der der
Ruhepunkt nachträglich absaufen kann, hieße das: ertrinken, zurückgelegt werden, sofort wieder
ertrinken, bis das Schlaglimit erreicht ist. Gesucht wird jetzt nach *trockenem* Boden, und wenn
nichts Gemerktes trocken ist, ringsum weiter. Das bedrohte auch schon die Gießhalle, nur ist es dort
nie jemandem passiert.

### Die Welt ist ein Abstieg – von der Oberfläche bis auf den Grund

Zuerst waren die vier Paletten vier *Stationen einer absaufenden Stadt* (Deich, Gassen, Dächer,
Tiefe). Das erzählte etwas, sah aber nicht nach Unterwasser aus – es sah nach nassem Stein aus.
Seit Fassung 168 sind es vier **Tiefen**, und die Welt geht wörtlich nach unten: `wasserlinie`
(dicht unter der Oberfläche, die Sonne steht noch im Wasser), `flachwasser` (Sandbank und Seegras,
das Licht wird grün), `daemmerzone` (die versunkene Stadt, blau, kaum noch Licht) und `meeresgrund`
(ganz unten; was leuchtet, leuchtet selbst). Das ist derselbe Gedanke wie der Abstieg der
Zwergenmine, nur nach unten ins Wasser statt in den Berg.

**Eine einzige Zahl macht das**: `tiefe` an der Palette, 0 dicht unter der Oberfläche bis 1 auf dem
Grund. `src/render_flut.js` rechnet daraus alles:

| | nah an der Oberfläche | auf dem Grund |
| --- | --- | --- |
| Wassersäule statt Himmel (`meerBg`) | hell türkis | fast schwarz |
| Unterseite der Oberfläche mit Kräuseln | da | aus dem Bild gerutscht |
| Lichtbahnen von oben | breit und hell | keine |
| Netz aus Sonnenlicht über der Szene | deutlich | keins |
| Schwebstoff im Wasser | wenig | viel |
| Blaustich und dunkler Rand | schwach | stark |
| Schemen der versunkenen Stadt in der Ferne | zu hell dafür | Dächer und ein Kirchturm |
| Was selbst leuchtet | – | Biolumineszenz im Wasser |

Zwei Dinge liegen dabei **über** der Szene und nicht dahinter: das Lichtnetz und der Blauschleier.
Beide bleiben aber unter der Zielhilfe – wohin man schlägt, gehört zur Bedienung und nicht zur
Stimmung; dieselbe Regel wie beim Schleier der Zwergenmine.

Und der Schimmer, der ein leeres Becken sichtbar macht, nimmt seine Farbe aus der Palette
(`water`), nicht aus einem festen Blau. Ein fester Ton sähe auf dem hellen Sand der Wasserlinie gut
aus und wäre auf dem dunklen Grund unsichtbar – und ein unsichtbares Becken ist wieder eine Falle
ohne Ansage.

### Geprüft

`node tools/flut.mjs` (122 Prüfungen): Tiefe aus der Form, Ring für Ring von außen nach innen,
außerhalb des Beckens bleibt alles trocken, der Lauf geht einmal herum und bleibt unter der Geduld,
ein Ball rollt durchs leere Becken hindurch und geht im vollen unter, das Pumpwerk hält leer und
lässt wieder los, die zweite Runde fängt trocken an; die Strömung ist stärker als die Reibung und
trägt einen liegenden Ball, beschleunigt aber nur bis auf ihr Tempo; der Strudel hält niemanden
fest und lenkt trotzdem ab – und für jede der zwölf Bahnen: sie trägt eine Maschine dieser Welt,
ein Weg führt zum Loch, und bei vollem Becken führt er immer noch dorthin.

`python3 tools/flut.py` baut die Bahnen und lehnt ab, was nicht geht: ein Becken, das die Bahn
zerschneidet; ein Lauf über 15 Sekunden; ein Umweg, der genauso kurz ist wie der Weg durchs Becken
(dann nimmt niemand das Becken); eine Strömung über dem Abschlag (man käme nie zum Zielen) oder über
dem Loch (der Ball würde davor weggetragen); ein Strudel, der bis an Abschlag oder Loch greift; und
eine Bahn ganz ohne Maschine dieser Welt.

Dass die Welt in der Vorschau steht und im Spiel nicht, hängt an einer einzigen Kennzeichnung
(`nurVorschau` in `src/courses_pro.js`); `node tools/vorschauwelt.mjs` prüft sie – bis hinunter zu
`icons/weltkarte.svg`, das hinter jedem Ladebild liegt und darum die Sicht des *Spiels* zeigen muss.

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

**Der Berg steigt auch wirklich an.** Zuerst war die Höhe nur Farbe und Erzählung – die Bahnen
selbst lagen flach. Jetzt trägt jede ein Höhenraster (`heights`), das nach rechts, also zum Loch
hin, um zwei oder drei Stufen ansteigt; der Abschlag liegt immer unten, das Loch immer auf der
obersten Stufe. Verbunden sind die Stufen durch **Schrägen** (`field` mit `rise`), denn eine
Höhenkante wirkt sonst wie eine Mauer – so steht es in `src/physics.js`, und `tools/validate.mjs`
rechnet es seit dieser Fassung genauso, sonst hielte es ein Loch für erreichbar, vor dem in
Wahrheit eine Stufe steht.

Wichtiger als das Aussehen ist, was die Schräge *tut*: Wer zu schwach schlägt, rollt wieder
herunter. Damit das stimmt, mussten zwei Dinge zusammenkommen, und beide waren beim ersten Anlauf
falsch. Die Schräge braucht `alwaysForce` – ohne das wirkt sie nur auf einen rollenden Ball, und
wer auf halber Höhe zur Ruhe kommt, klebt dort fest. Und ihr Gefälle muss **über der Reibung des
Untergrunds** liegen (Schnee bremst mit 4,2): darunter hält der Boden den Ball fest, so steil es
auch aussieht. Deshalb liegt keine Schräge auf Blankeis oder in Tiefschnee, deren Reibung ganz
anders ist – `tools/schneeberg.py` weist das beim Bauen ab.

Nach oben wird beides größer, denn der Berg wird steiler: am Fuß eine Stufenhöhe von 0,6 und ein
Gefälle von 4,8, am Gipfel 1,1 und 7,2. Wo eine Schlucht zwischen zwei Stufen liegt, gibt es keine
Schräge – dort fährt die Gondel, und genau das ist ihr Sinn. Geprüft wird jede einzelne Schräge mit
`scratchpad/schraege.mjs`: ein schwacher Schlag hinauf muss unterhalb der Rampe wieder zur Ruhe
kommen, ein kräftiger über sie hinweg.

Gezeichnet wird die Schräge nicht als Erdrampe: Die Standardfarbe ist erdbraun, und auf einem
Schneeberg sah das aus wie ein Feldweg quer über den Hang. Die fünf Schnee-Paletten tragen darum
`hangStil: 'schnee'` – dann wird daraus eine Schneerinne, blaugraue Mulde mit hellem Kamm, dieselbe
Sprache wie die Windfahnen auf dem Boden.

Die Umgebung erzählt dieselbe Geschichte: Unten steht dichter Nadelwald, in der Felszone treten
Blöcke hervor, auf dem Gletscher stehen Eiskristalle, und oben wird es kahl. Der Windsack war dabei
zuerst jede fünfte Streudeko – auf dem Gipfel standen dadurch Dutzende herum, wo eigentlich nichts
mehr steht. Jetzt ist er selten genug, um wieder etwas zu bedeuten.

### Die vier Maschinen (`src/obstacles_snow.js`)

| Maschine | Was sie tut |
|---|---|
| **Windfahne** (`windfahne`) | Dreht den Wind alle `WIND_HALT` Sekunden weiter, mit `WIND_DREH` Sekunden Flaute dazwischen. Sie wirkt auf der ganzen Bahn, nicht in einem Feld – das ist der Unterschied zum Wind-`field` der anderen Welten: Dort ist Wind eine Stelle, hier ist er das Wetter. |
| **Lawine** (`lawine`) | Fegt alle `LAWINE_TAKT` Sekunden durch ihren Streifen; `LAWINE_WARNUNG` Sekunden vorher staubt es an der Abrisskante. Wer offen liegt, wird ein Stück mitgenommen – kein Strafschlag, nur Weg. **Hinter einem Felsblock (`x`) passiert nichts:** Vom Ball aus wird bis `LAWINE_SCHUTZ` Kacheln gegen die Laufrichtung geschaut, und die hellen Keile im Schnee zeigen, wie weit die Deckung reicht. Damit ist es die erste Maschine, vor der man sich *versteckt* statt sie zu umgehen – und die Felsen sind nicht mehr Deko, sondern Deckung. |
| **Seilbahn** (`seilbahn`) | Gondel am Stahlseil zwischen zwei Stationen, Verhalten wie die Fähre. Dazu darf sie mit `ziel` die **Ebene wechseln**: Die Bergstation liegt dann eine oder mehrere Wolkenetagen höher, und das Seil steigt sichtbar dorthin. Sie ist damit zugleich Brücke und Aufstieg – was eine Bergbahn eben tut. |
| **Schneebrücke** (`schneebruecke`) | Trägt genau einen Schlag lang. Hat der Ball sie überquert, bricht sie hinter ihm ein; beim nächsten Schlag liegt sie wieder da. Sie ist das Gegenstück zur Luke des Uhrenturms: Die fragt *wann*, diese fragt, ob man den Weg zu Ende denkt. Gibt es eine Ebene darunter, fällt man ohne Strafschlag dorthin; gibt es keine, ist es ein Loch im Berg wie jedes andere – **genau dieser zweite Fall fehlte zuerst**, und die gebrochene Brücke tat auf einer Bahn ohne untere Ebene gar nichts. |

**Man muss den Wind sehen, nicht nur den Pfeil.** Die erste Fassung zeigte ihn allein an der
Fahne – zu wenig: Wer auf den Ball schaut, schaut nicht auf den Mast. Darum hält der Renderer den
Wind der Bahn einmal je Bild in `R.wind` fest, und drei Dinge zeigen ihn:

- **Der treibende Schnee auf dem Boden** ist das eigentliche Messgerät. Über jede zweite Bahnkachel
  läuft eine Schneefahne in Windrichtung, und in der Flaute steht alles still. Wichtig war der
  Kontrast: Weiße Striche auf weißem Schnee sieht man nicht, also ist jede Fahne eine flache Rille –
  erst ein blaugrauer Schatten, darüber versetzt ein heller Kamm.
- **Der Schneefall am Himmel** weht in dieselbe Richtung und flaut mit ab (`atmo: 'snow'` und
  `'blizzard'` lesen `R.wind`).
- **Die Windsäcke am Rand** drehen sich mit und hängen bei Flaute schlaff herunter – die
  Windrichtung wird dafür mit derselben Drehung wie die Projektion in Bildrichtung umgerechnet.

Geprüft wird das nicht nach Augenmaß, sondern als Bildvergleich (`scratchpad/wind_sicht.mjs`):
dieselbe Bahn, dieselbe eingefrorene Zeit, einmal mit und einmal ohne Windfahne. Bei vollem Wind
unterscheiden sich über 53 000 Pixel, in der Flaute nur noch 4 400 – dann bleibt eben nur der Mast.

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

Die Maschinen selbst prüft `node tools/schnee.mjs` – dauerhaft und nachrechnend, nicht durch
Hinschauen. Anlass waren zwei Fehler an der Seilbahn, die beide nur zu sehen und nicht zu messen
schienen:

- **Der Ball schwebte eine Etage über der Kabine.** Die Gondel rechnet ihre Höhe vom Grund der Bahn
  aus, der Ball dagegen von *seiner* Etage – der Zeichner legt `ball.ebene` noch einmal obendrauf.
  Wer die eine Zahl unbesehen in die andere einsetzt, zählt die Etage zweimal. Auf allen Bahnen mit
  Talstation auf Ebene 0 fiel das nicht auf; auf dem Gipfel, wo die zweite Gondel schon auf Ebene 1
  steht, schwebte der Ball genau 2,00 Kacheln zu hoch. `tools/schnee.mjs` misst jetzt auf **jeder**
  Seilbahn jeder Bahn den Abstand zwischen Ball und Kabinendach.
- **Die Kabine wurde durchsichtig, während man darin saß.** Die Regel „was vor dem Ball steht und
  ihn verdecken würde, wird fast durchsichtig gezeichnet" traf ausgerechnet das Fahrzeug, in dem er
  fährt – gemessen: `globalAlpha` 0,22. Übrig blieb ein Ball, der über einem blassen Schemen
  schwebt. Alles, was den Ball trägt, ist jetzt von der Regel ausgenommen (`noFade: true`). Betroffen
  war nur die Seilbahn, und dort nur auf den Bahnen, wo sie innerhalb einer Etage fährt: Wechselt sie
  die Etage, steht sie wie Aufzug und Zahnstange ohnehin außerhalb der Tiefensortierung und wird
  zuletzt gezeichnet. Der Vermerk steht bei allen dreien, damit er nicht fehlt, wenn eine davon
  einmal auf einer einstöckigen Bahn landet.

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

**Der Schacht.** Aufzug und Zahnstange fahren zwischen zwei Etagen, und die obere hat an ihrer
Stelle eine Öffnung. Bis Fassung 140 war die nirgends zu sehen: Über der Maschine lag ganz
gewöhnlicher Boden, die Kabine wurde – wie alle Maschinen zwischen zwei Etagen – als letztes
darübergemalt, und sie fuhr sichtbar durch massives Gestein nach oben. Auf allen vier Bahnen mit
Aufzug oder Zahnstange steht über dem Schacht eine volle Bodenkachel; es fiel also nirgends nicht
auf. `Renderer.drawSchacht` zeichnet jetzt das Loch mit einer dunklen Kehle, einem Rahmen aus Eisen
und einem warmen Saum darauf – in der Zeichnung der Maschine und nicht in der Bahn, damit es auch
für einen Aufzug aus dem Editor gilt.

**Beschnitten wird die Kabine ausdrücklich nicht**, obwohl es naheliegt: Wer im Schacht steckt, ist
verdeckt. Ausprobiert war es auch – und dann verschwindet die Kabine unten vollständig unter der
oberen Etage, samt Ball, und man sieht nicht mehr, wo man einsteigen soll. Genau davor werden diese
Maschinen ja zuletzt gezeichnet: Auf einer Wolke, die voll deckend gemalt wird, wäre sonst die
Gondel, mit der man gekommen ist, spurlos weg. Der Schacht ist also die Erklärung des Bildes, nicht
sein Ausschnitt.

| Nr. | Bahn | Größe | Par | Maschinen | Der Moment, auf den man wartet |
|---|---|---|---|---|---|
| 1 | Marktplatz | 34×13 | 3 | Pendel | Die einzige Tür in der Mauer, vor der das Pendel schwingt |
| 2 | Glockengasse | 38×13 | 4 | Pendel ×2 | Zwei Türen, versetzte Pendel – die eine passt, wenn die andere nicht passt |
| 3 | Räderwerkstatt | 38×13 | 4 | Zahnradfeld, Pendel | Das Feld hält am Ufer an: einsteigen, tragen lassen |
| 4 | Rohrpost | 38×13 | 4 | Kupferrohr, Pendel | Das Rohr nimmt einen immer – man sieht schon vorher, wo es endet |
| 5 | Turbinenhalle | 38×15 | 4 | Pendel, **Turbine**, zweite Ebene | Der Windstoß hebt eine Etage – zu schnell, und man schießt oben über die offene Kante zurück |

**Die Turbine hob früher, ohne daß man es sah.** Sie setzte den Ball in einem einzigen Bild von
unten nach oben. Und weil über einer Turbine geschlossener Boden liegen *muß* – läge dort ein Loch,
fiele der Ball im selben Augenblick wieder herunter –, sah das aus, als käme man einfach durch die
Decke. Seit Fassung 154 hängt der Ball eine halbe Sekunde lang am Windstoß, so wie er im Aufzug an
der Kabine hängt, und steigt sichtbar. In der Decke darüber liegt eine **Luke**, die der Stoß
aufdrückt und die hinter ihm wieder zufällt; sie ist auch dann zu sehen, wenn niemand fährt, damit
man von oben erkennt, wo der Weg heraufkommt. Der Weg ist derselbe wie vorher – man sieht ihn nur.

Geprüft wird das in `tools/ebenen.mjs`, wo es hingehört: Dieselbe Datei hält schon fest, daß ein
Hindernis auf einer oberen Etage auch dort gezeichnet wird. Das war ein Ding, das man nicht sah;
das hier war ein Weg, den man nicht sah. Auf dem alten Quelltext melden die neuen Prüfungen sieben
Fehler.
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

**Ein Ruhepunkt ist ein Ort UND eine Ebene.** Der Ball merkt sich, wo er zuletzt lag, und wird
nach einem Strafschlag dorthin zurückgelegt. Die Ebene dazu wurde nie mitgeschrieben – er landete
also immer auf der untersten. Solange darunter Boden war, fiel das niemandem auf; über den Wolken
ist darunter nichts. Dann lag er im Leeren, war sofort wieder „aus", bekam den nächsten
Strafschlag, wurde wieder dorthin gelegt – bis zur Höchstschlagzahl, ohne dass man etwas tun
konnte. Fünf von sieben Bahnen mit einer Klippe waren betroffen, auch zwei im Uhrenturm. Jetzt
trägt jeder Ruhepunkt seine Ebene mit (`restEbene`, `shotEbene`, und über das Netz das Feld `e`),
und `sichererRuhepunkt` prüft vor dem Zurücklegen noch einmal nach: Liegt der gemerkte Punkt auf
seiner Ebene doch nicht auf Boden, geht es zum Start des letzten Schlags und notfalls an den
Abschlag. Geprüft wird es mit `scratchpad/absturz.mjs`, das auf jeder Bahn mit einer echten Klippe
den Ball darüber schiebt und danach zweimal nachsieht: Liegt er auf Boden, ist wieder „Zielen" dran
– und ist die Schlagzahl vier Sekunden später immer noch dieselbe?

**Die Zielhilfe kommt ganz zum Schluss.** Sie wurde bis Fassung 74 beim Boden gezeichnet, also
unter allem, was danach kam. Stand der Ball auf einer oberen Ebene, malte deren Scholle den Pfeil
zu – man konnte ganz normal aufladen und schießen, sah nur nicht mehr, wohin. Das ist schlimmer als
gar keine Hilfe, weil man den Fehler dann bei sich sucht. Jetzt wird sie nach Ball und Schollen
gezeichnet. Geprüft wird das mit Pixeln: `scratchpad/aim.mjs` zählt die Punkte in der Farbe der
Zielhilfe vor und nach dem Aufladen, auf der untersten Ebene wie auf einer oberen.

**Maschinen, die zwischen zwei Ebenen stehen, auch.** Derselbe Fehler kam ein zweites Mal, diesmal
bei der Seilbahn auf dem Gipfel: Man fährt auf die Wolke hinauf, und dort oben ist die Gondel weg.
Ursache war wieder die Reihenfolge – eine Scholle, auf der der Ball steht, wird voll deckend
gezeichnet und übermalte alles, was vorher dran war, auch die Gondel, die sichtbar über ihr hängen
müsste. Betroffen ist jede Maschine, die nicht auf einer Ebene liegt, sondern zwei verbindet:
**Seilbahn, Aufzug, Zahnstange**. Die drei werden auf mehrstöckigen Bahnen aus der normalen
Tiefensortierung herausgenommen (`spanntEbenen`) und in `drawSpannendeMaschinen` gleich nach den
Schollen gezeichnet, untereinander nach ihrer oberen Ebene sortiert. Auf einstöckigen Bahnen ändert
sich nichts – dort gibt es keine Scholle, die stören könnte, und die normale Sortierung ist
genauer. Geprüft wird es wie beim Wind mit einem Bildvergleich: `scratchpad/gondel_sicht.mjs`
zeichnet dieselbe Bahn mit und ohne die Maschine, während der Ball oben steht, und zählt die
Pixel, die sich unterscheiden.

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

### Räumliche Deko in allen Welten

Was im Uhrenturm mit Fass, Kiste und Laterne anfing, gilt jetzt für **alle** Gegenstände am Rand,
in jeder Welt. Der Anlass ist derselbe geblieben: Solange man nicht dreht, fällt eine flache
Zeichnung kaum auf – dreht man, bleibt ein Felsblock eine Scheibe, die sich mitdreht, und der
ganze Raum wird wieder zum Bild.

Dafür gibt es vier Bausteine neben `prism`, `frustum` und `walze`, gemacht für das, was Deko
braucht – rund, unregelmäßig, schnell hingeschrieben, alle Maße in Kacheln:

| Baustein | Wofür |
|---|---|
| `kegel` | Baumkrone, Tropfstein, Kristallspitze, Hexenhut. Die Spitze ist ein winziger Kreis statt eines Punktes, sonst flackert der Umriss beim Drehen. |
| `saeule` | Stamm, Mast, Poller, Flaschenbauch, Leuchtturmring – Zylinder oder Kegelstumpf. |
| `brocken` | Ein Fels. Der Umriss wird aus dem Startwert der Deko verzogen, also sieht jeder Stein anders aus und behält seine Form. |
| `kugel` | Beere, Perle, Schädel, Wolkenballen. Eine Kugel sieht von jeder Seite gleich aus, darf also eine schattierte Scheibe bleiben – Mittelpunkt und Halbmesser kommen aber aus der Welt, nicht vom Bildschirm. |

Dazu `ast` für gebogene Zweige, Wedel und Taue: eine Kette kurzer Walzen entlang einer Weltrichtung.
Ein Palmwedel, der nach Norden zeigt, zeigt auch nach dem Drehen nach Norden.

**Wo ein Gesicht hingehört, liegt es auf der Seite, die zur Kamera zeigt** – beim Steinkopf, beim
Totempfahl, beim Schädel, beim Kürbis, beim Turmfenster. Dreht man herum, sieht man den
Hinterkopf, und das ist richtig so. **Flach bleibt nur, was keine Seiten hat:** Flammen, Irrlichter,
Leuchtfeuer, Rauch, der Schirm der Qualle. Die sitzen jetzt aber an einem Punkt im Raum statt an
einem Punkt auf dem Bild.

Zwei Dinge fielen erst auf, als die Deko Körper waren – vorher verzieh die flache Zeichnung sie:

- **Deko stand neben der Erdscholle.** Gestreut wurde bis zwei Kacheln über die Karte hinaus, die
  Scholle reicht aber nur 1,4 (in den Uhrwerk-Welten 3,6). Flach gezeichnet sah man das kaum; als
  Körper mit Bodenschatten stehen 1123 Stück sichtbar in der Luft. `buildDecor` verwirft sie jetzt –
  und zwar **nach** dem Ziehen der Zufallszahlen, sonst verschöbe sich die ganze Streuung aller
  Welten. Geprüft wird es über alle 91 Bahnen mit Scholle (`scratchpad/randpruef.mjs`).
- **Deko auf der Spielfläche sieht aus wie ein Hindernis.** Der Blumenbusch stand als grüner Hügel
  mitten auf der Elfenwiese – man zielt darum herum, obwohl der Ball einfach hindurchrollt. Das ist
  schlimmer als hässlich: Es ist eine Lüge über die Bahn. Die Streudeko hält sich von selbst
  daran (`buildDecor` überspringt Bodenkacheln); von Hand gesetzte Deko nicht.
  `scratchpad/aufbahn.mjs` zählt sie und nennt Welt, Bahn und Stelle.
- **Die Blüten sahen aus wie Golfbälle.** Der Blumenbusch trug seine Blüten als kleine Kugeln mit
  weißem Glanzpunkt – auf einer Minigolfbahn ist das kein Schönheitsfehler, sondern eine falsche
  Ansage: Man sucht nach einem zweiten Ball. Blüten liegen jetzt flach in der Bodenebene, als
  Teller mit dunklerem Herz. Der einzige weiße Ball auf dem Grün ist der Spielball.
- **Die Tannen wurden schwarz.** `frustum` dunkelt die abgewandten Seiten selbst auf bis zu 0,68 ab.
  Gibt man ihm schon eine abgedunkelte Farbe, bleibt nichts Helles übrig. Die Seitenfarbe eines
  Kegels ist deshalb die **volle** Farbe – das Licht macht die Zeichnung, nicht die Palette.

Zwei weitere Fehler beim Umbau selbst, beide lehrreich:

- **`shade()` ließ sich nicht schachteln.** Es gab `rgb(...)` zurück; `prism`, `frustum` und `walze`
  dunkeln die Farbe, die sie bekommen, aber selbst noch einmal ab und lasen daraus NaN – der ganze
  Körper wurde schwarz. Die Korallen der Meereswelt standen als schwarze Büsche im Riff. `shade()`
  liefert jetzt wieder Hex, und damit ist die ganze Klasse erledigt.
- **Beim Ersetzen von Blöcken gingen Nachbarfunktionen verloren.** Zweimal: erst Rohr, Fass, Kiste
  und Laterne, dann Krokodil, Stacheln, Tempeltor, Lianenrotor, Strudel, Wrack, Katapult und
  Pyramide. So etwas fällt sonst erst auf, wenn jemand genau die eine Bahn öffnet. Dagegen steht
  jetzt `scratchpad/deko_pruef.mjs`: Es prüft, dass jede Deko-Art in `drawDecor` eine Funktion hat,
  die es auch gibt, dass jede in einer Bahn oder Palette benutzte Art dort vorkommt – und
  allgemein, dass **jedes `this.xxx()` im Renderer eine Funktion findet**. Beide Male hätte das
  sofort gemeldet.

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


## Fantasy Golf 3D

Neben dem 2,5D-Spiel steht ein zweites, jüngeres: **Fantasy Golf 3D**. Es hat eine **eigene
Seite unter `src/3d/`**, eine eigene Adresse, ein eigenes Stilblatt, ein eigenes Manifest (man
kann es als eigene App auf den Startbildschirm legen) und einen eigenen Speicher:

* Spiel: `…/Golf-with-your-Friends/src/3d/`
* Vorschau: `…/Golf-with-your-Friends/vorschau/src/3d/`

Aus dem 2,5D-Spiel benutzt es genau drei Dateien, die mit dessen Bahnen nichts zu tun haben:
`src/icons.js` (Sinnbilder), `src/sfx.js` (Geräusche) und `src/version.js` (Fassung und
Speicherschlüssel). Kein Bahnformat, keine Physik, keine Oberfläche. Die beiden Spiele teilen sich
nur das Haus – und den Service Worker, damit es eine Fassung und ein Aufräumen gibt.

Anfangs lag die 3D-Welt als Zimmer im alten Haus, erreichbar über einen Knopf im Startbildschirm.
Das war der kürzeste Weg zu einer ersten Vorschau, aber es war das falsche Bild: Wer ein neues
Spiel öffnen will, soll ein neues Spiel öffnen und nicht zuerst durch das alte gehen. Seit
Fassung 114 sind es zwei Adressen.

Warum die Adresse so sperrig ist (`…/src/3d/` statt `…/3d/`): Der Arbeitsablauf `pages.yml`
kopiert eine feste Liste – `index.html`, `style.css`, `manifest.webmanifest`, `sw.js`, `src`,
`icons`. Ein neuer Ordner oben wäre schlicht nicht dabei; `src` dagegen wird mitsamt allem
Darunterliegenden kopiert. Eine Zeile in `pages.yml` würde daraus `…/3d/` machen – die gehört
aber auf `main` und damit Lüddecke.

### Was es gibt

* Eine **Weltkarte in drei Dimensionen** – eine Insel im Meer, über der die Kamera langsam kreist.
  Sechs Landstriche tragen je eine Welt; ihre Namen stehen als Schilder darüber und wandern mit.
  Offen ist bisher das **Grasland** mit neun Bahnen, die übrigen fünf sagen „bald zu erkunden".
* **Neun Bahnen im Grasland** – lang, schmal und von Holzbanden eingefasst. Jede spielt an einem
  anderen Ort derselben Landschaft; die Burg sieht man nur auf dreien, und wo man sie sieht, steht
  sie einmal auf ihrem Hügel und zweimal ebenerdig am Wegesrand:
  * *Burgwiese* (Par 3) – schnurgerade unter die Burg, drei Felsnadeln im Weg.
  * *Der Mühlbach* (Par 4) – rechter Winkel nach rechts, dahinter der Bach quer.
  * *Zum Burgtor* (Par 5) – bergauf, um die Ecke, durch ein Felsentor bis vors Tor der Burg.
  * *Der Pferdehof* (Par 3) – über eine Holzrampe auf die Terrasse, Scheune und Heuhaufen ringsum.
  * *Die Schafweide* (Par 4) – ein weiter Bogen über die Koppeln, mit Trockenmauern und Sandkuhle.
  * *Der Obstgarten* (Par 3) – ein Graben quer, dann die Rampe hinauf zwischen die Apfelbäume.
  * *Das Dorf* (Par 4) – am Brunnen vorbei, Knick nach rechts, Felsentor vor dem Loch.
  * *Die Alte Brücke* (Par 3) – der Bach läuft die ganze linke Seite entlang.
  * *Der Turnierplatz* (Par 4) – die längste: Sand, Knick, Felsentor, Rampe, Zelte und die Burg.
* **Rampen** heben die Bahn auf eine Terrasse. Sie stehen nicht als Klotz in der Landschaft,
  sondern sind ein Summand in der Höhenformel – die Kugelrechnung weiß nichts von ihnen und der
  Ball rollt trotzdem hinauf, bleibt oben liegen oder kommt zurück.
* **Zu mehreren an einem Gerät**, bis zu vier. Jeder hat einen Namen und eine Ballfarbe und spielt
  eine Bahn ganz zu Ende, dann ist der nächste dran; nach Par plus sechs Schlägen geht es weiter,
  damit niemand die anderen aufhält. Am Ende eine Zählkarte über alle neun Bahnen.
* **Eine ganze Runde** über alle neun Bahnen mit Zählkarte, oder jede Bahn einzeln. Rekorde je
  Bahn werden gespeichert (getrennt von der Rangliste des 2,5D-Spiels – es sind zwei Spiele).

### Steuerung

| Was | Wie |
| --- | --- |
| Schlagen | vom Ball wegziehen und loslassen – weiter gezogen heißt fester |
| Kamera drehen | die Knöpfe unten, **Q** / **E**, zwei Finger, oder die rechte Maustaste |
| Näher / weiter | Mausrad, Finger auseinanderziehen, **+** / **−** |
| Ganze Bahn zeigen | Knopf mit der Karte oder **M** |
| Ball zurücklegen | Knopf rechts unten oder **R** (ohne Strafe) |
| Zurück | Knopf oben links oder **Esc** |

Auf der Weltkarte fehlt der Knopf oben links: Dort ist der Anfang, und ein Knopf ins Nichts hilft
niemandem. Er erscheint, sobald man in einer Welt oder auf einer Bahn steht.

**Auf dem iPhone und dem iPad besser zum Startbildschirm hinzufügen** (in Safari: Teilen → Zum
Home-Bildschirm). Dann läuft das Spiel als eigene App über den ganzen Schirm. Öffnet man es
dagegen aus einer anderen App heraus, liegt es in einem Vorschaufenster, und solche Fenster lassen
sich mit einer Wischbewegung nach unten wegschieben – ausgerechnet die Bewegung, mit der man Kraft
auflädt. Die Seite fängt Berührungen auf der Leinwand darum ab (siehe `bedienungAnhaengen` in
`src/3d/spiel3d.js`); als eigene App gibt es das Fenster aber gar nicht erst.

Nach jedem Schlag schwenkt die Kamera von selbst hinter den Ball und schaut zum Loch – sonst
müsste man sie nach jedem Schlag erst suchen, und weil die Schlagrichtung an der Kamera hängt,
schlüge man reihenweise in die falsche Richtung.

### Wie eine Bahn beschrieben wird

Eine Bahn in `src/3d/bahnen3d.js` besteht aus drei Angaben. Die erste ist dieselbe wie im
2,5D-Spiel – ein Feld Text, ein Zeichen ist ein Feld:

```
.  außerhalb – hier steht die Bande, von der der Ball abprallt
#  Fairway, kurz geschnitten, rollt gut      ,  Rough, hohes Gras, bremst spürbar
s  Sand, bremst stark                        w  Wasser – Strafe, weiter geht es vom Ufer
x  Felsnadel – eine mannshohe Wand mitten in der Bahn
o  wie #, aber ohne Bande: hier ist die Bahn offen und der Ball kann hinausfallen
T  Abschlag                                  H  Loch
```

### Der Zielpfeil

Er liegt nicht auf einer Höhe, sondern **auf dem Boden** – wie eine aufgemalte Linie, die jeder
Kuppe und jeder Mulde folgt. Vorher war er eine flache Scheibe auf Ballhöhe: Auf ebener Bahn sah
das gut aus, aber sobald es vor dem Ball anstieg, verschwand die vordere Hälfte im Hang –
ausgerechnet dort, wo der Hang etwas mit dem Schlag macht. Dazu zog das Langziehen die Spitze mit
in die Länge; bei vollem Schlag war aus dem Pfeil ein Speer geworden.

Jetzt ist er eine Kette fester Abschnitte, jeder mit seiner eigenen Bodenhöhe, und die Spitze hat
ihre eigene Länge. Gezeichnet wird er ohne Licht: Er ist eine Anzeige, kein Gegenstand, und soll
im Schatten so deutlich sein wie in der Sonne.

### Das Loch

Ein Loch ist ein Loch, kein Zeichen auf dem Rasen: Der Boden wird an dieser Stelle **wirklich
aufgeschnitten**. `gelaendeNetz` lässt neun Maschen rings um den Becher weg, und `lochNetz` setzt
an ihre Stelle einen Flicken mit runder Öffnung, darunter den Becher (nach innen gerichtet – man
schaut ja hinein) und obenauf einen Ring aus ausgetretenem Gras, damit man die Öffnung auch aus
zehn Feldern Entfernung findet.

Das war zuerst nicht so: Der Becher war gebaut, aber die Wiese lag als geschlossene Decke darüber,
und zu sehen war nur ein Fahnenmast, der im Gras steckt. `tools/3d.mjs` prüft seitdem, ob über der
Mitte des Bechers wirklich kein Bodendreieck liegt.

### Die Banden

Eine Bahn ist von Holzbanden eingefasst, und die entstehen von selbst: **Jedes Feld außerhalb, das
an die Spielfläche stößt, wird zu einem Block, an dem der Ball abprallt.** Weil er ohnehin nie
hineinkommt, ist die Innenkante dieses Blocks genau die Bandenlinie – man braucht keine eigene
Rechnung für dünne Balken, sondern setzt einen dicken Klotz dahinter, von dem nur die Vorderseite
zu sehen ist. Gezeichnet wird ein Balken mit Pfosten, gerechnet wird ein Rechteck.

Die Bande ist niedrig: Ein rollender Ball prallt ab, ein springender fliegt darüber. Wer sie
irgendwo nicht haben will, schreibt `o` statt `#`.

Die zweite ist die Höhe. Sie steht **nicht** als zweites Feld mit Ziffern da, sondern als
Grundhöhe plus eine Handvoll Hügel und Mulden:

```js
gelaende: {
  grund: 0, welle: 0.05,
  huegel: [ { x: 12, z: 3, r: 7, h: 0.45 },      // Rücken im Norden
            { x: 18.5, z: 8.5, r: 3.8, h: -0.3 } ] // Mulde vor dem Loch
}
```

Der Unterschied ist größer, als er klingt. Ziffern geben Stufen, und Stufen muss man glätten;
Hügel geben von sich aus eine weiche Landschaft mit einem Gefälle, das sich an jeder Stelle genau
ausrechnen lässt – und genau das braucht die Kugelrechnung, um sauber zu rollen. Sechs Zeilen
ersetzen ein ganzes Feld voller Ziffern, und man sieht ihnen an, was sie tun.

Die dritte ist, was herumsteht: `burg` (wo die Königsburg von dieser Bahn aus zu sehen ist),
`deko` (Mühle, Häuser, Brücke, Zäune, Fahnenmasten) und `autoDeko` (Bäume, Büsche und Steine,
gestreut nach Zufall mit festem Startwert – dieselbe Bahn sieht bei jedem Laden gleich aus).

### Wie geprüft wird

`node tools/3d.mjs` rechnet die ganze 3D-Welt ohne Browser durch:

1. **Bahnen** – Karte rechteckig, Abschlag und Loch vorhanden, Loch über trockenen Boden
   erreichbar. (Wasser zählt dabei nicht als Weg. Genau daran ist beim Bauen der Furt ein Fehler
   aufgefallen: Die Landzunge in der Mitte war rundherum von Wasser umgeben und damit eine Insel.)
2. **Dreiecke** – jeder Grundkörper wird gebaut und nachgerechnet, ob seine Flächen nach außen
   zeigen. Ein verkehrt herum gebauter Körper ist nicht falsch beleuchtet, sondern unsichtbar.
3. **Gelände** – Höhen endlich, Abschlag flach genug zum Liegenbleiben, Loch nicht am Hang.
4. **Spielbarkeit** – ein gründlicher Rechen-Golfer probiert je Schlag 350 Richtungen und Kräfte
   durch und nimmt den besten. Schafft er es nicht in fünfzehn Schlägen, stimmt etwas nicht.
5. **Par** – ein zweiter Spieler zielt aufs Loch und vertut sich dabei um ein paar Grad und ein
   paar Prozent, so wie ein Mensch. Zweihundert Runden davon geben den Mittelwert, an dem sich
   das Par messen lässt. Dieser Spieler kennt den Weg – er zielt auf den weitesten Punkt der
   Spur, den er in gerader Linie erreichen kann, so wie man es vor dem Schlag mit den Augen macht.
   Zielte er stur aufs Loch, schlüge er auf einer Bahn mit Knick zweihundert Runden lang gegen
   dieselbe Bande, und gemessen wäre nicht die Bahn, sondern seine Dummheit.
   Stand (Fassung 116): 3,7 – 3,7 – 6,0 Schläge bei Par 3 – 4 – 5.

Drei Fehler hat erst diese Rechnerei ans Licht gebracht, und zwei davon waren echte Spielfehler:

* **Der Ball hüpfte auf ebener Bahn.** Ob er abhebt, wurde daran gemessen, ob der Boden schneller
  wegfällt, als die Schwerkraft in einem Rechenschritt zieht – und das ist bei
  Zweihundertvierzigstelsekunden schon ab zwei Prozent Gefälle der Fall. Er hob also ab, landete,
  hob wieder ab, und jede Scheinlandung nahm ihm acht Prozent seiner Geschwindigkeit. Richtig ist:
  Auf einer geraden Schräge hebt nichts ab, egal wie steil. Es hängt an der Krümmung.
* **Es fehlte die Haftreibung.** Ohne sie rollt ein liegender Ball auf allem über sechs Prozent
  von selbst wieder los, und eine Bahn, die bergauf zur Burg führt, schickt jeden Ball zurück.
  Jetzt hält der Untergrund bis rund achtzehn Prozent – so wie ein Ball auf einem geneigten Grün
  liegen bleibt, obwohl er, einmal angestoßen, denselben Hang hinunterrollt.
* **Nach einem Wasserball lag der Ball auf der Uferkante** und fiel beim nächsten Schlag sofort
  wieder hinein. Jetzt wird eine Stelle gesucht, von der aus man in die meisten Richtungen
  wegspielen kann – geprüft mit zwölf Strahlen ringsum.

### Warum kein fertiger 3D-Baukasten

Die Seite darf nach ihren eigenen Sicherheitsregeln (`script-src 'self'` in `index.html`) nichts
Fremdes laden. Eine Bibliothek müsste also mit ins Haus – eine halbe Million Zeichen fremder,
unkommentierter Code für das, was hier zwölf Matrixfunktionen und zwei Schattierer sind. Der
Zeichner in `src/3d/gl3d.js` kann absichtlich wenig: Dreiecke mit Farbe in den Ecken, eine Sonne,
einen Schattenwurf, Nebel und bewegtes Wasser. Mehr braucht eine gemalte Märchenwelt nicht – sie
lebt von Form und Farbe, nicht von Oberflächenbildern. Geladen wird kein einziges.

## Kostenlos als App aufs iPad oder Handy (GitHub Pages)

Das Spiel ist eine Web-App: Manifest (`manifest.webmanifest`), App-Symbole (`icons/`) und ein Service Worker (`sw.js`) sorgen dafür, dass es sich wie eine App installieren lässt und offline läuft. Der Workflow `.github/workflows/pages.yml` veröffentlicht bei jedem Push automatisch auf GitHub Pages.

**Das App-Zeichen ist eine kleine Seekarte** (`node tools/appzeichen.mjs`): eine Insel im Meer der
Weltkarte, mit dem Loch und der Fahne darauf. Bis Fassung 141 waren es Ausschnitte aus dem gemalten
Titelbild – und die passten aus demselben Grund nicht wie das Titelbild selbst: Das Spiel ist
gezeichnet, das Bild war gemalt.

**Es ist kein Ausschnitt der Karte.** Ein Ausschnitt wäre bei 48 Bildpunkten ein Farbbrei: Die Karte
lebt von Beschriftung und hundert kleinen Zeichen, und nichts davon überlebt so klein. Das Zeichen
ist darum eine eigene, winzige Karte mit nur *einem* Motiv – aber aus denselben Teilen:

- **Die Küste wird gerechnet, nicht gezeichnet.** `WorldMap.kueste` ist dieselbe Rechnung, die auch
  das Festland macht: ein paar Landstücke, ein Feld daraus, die Linie auf Wasserhöhe ist die Küste,
  und drei Lagen Rauschen verbiegen dabei die Stelle, an der man das Feld fragt. Daher die Buchten
  und die zerfranste Kante. Von Hand gezeichnet war die Insel zuerst – ein Klecks mit einer Delle,
  der eher nach Farbpalette aussah als nach Land. Gerechnet wird in den Einheiten der Karte, sonst
  wäre das Rauschen im Verhältnis zur Insel zu fein; ins Bild kommt sie über eine Vergrößerung, die
  aus ihren eigenen Ausmaßen folgt.
- **Die Bäume und der Hügel sind die Zeichen der Karte** (`WorldMap.zeichen`), nicht nachgebaute.
  Nachgebaut waren sie einen Anlauf lang, und damit wären es zwei Wahrheiten gewesen: Wer in
  `src/worldmap.js` einen Baum ändert, hätte im App-Zeichen einen alten stehen.
- Dazu Gradnetz, Wellenstriche, die gestuften Tiefenlinien am Ufer, der helle Strand innen an der
  Küste, die Windrose und die Vignette – alles wie auf der großen Karte.

Es gibt **zwei Zuschnitte**, und das ist kein Zufall: Das gewöhnliche Zeichen (`icon-192`,
`icon-512`, `apple-touch-icon`) führt das Bild bis an den Rand, denn iOS und Android runden es nur
ab. Das **maskable**-Zeichen darf das nicht – davon schneidet Android einen Kreis aus, und was
außerhalb der inneren 80 % liegt, ist weg. Dort sitzt dasselbe Motiv darum kleiner im Bild: 11 %
Rand ringsum, also 78 % der Kante. Gegengeprüft, indem beide Masken – Kreis und abgerundetes
Quadrat – über die fertigen Zeichen gelegt wurden, und indem das Zeichen bei 48, 64 und 96
Bildpunkten angesehen wurde: So klein bleiben Insel und rote Fahne, alles andere ist Beiwerk.

Die beiden 512er wiegen als PNG je gut 200 kB – als Ausschnitt des gemalten Bildes waren es 700.
Sie stehen trotzdem **nicht** in der Vorratsliste des Service Workers: Gebraucht werden sie nur beim
Einrichten auf dem Startbildschirm, nicht beim Spielen, und der `fetch`-Griff legt jede geholte
Datei ohnehin ab. PNG bleibt es, denn für `apple-touch-icon` schreibt Apple PNG.

Einmalig einrichten (auf github.com im Repository):
1. **Settings → General → Danger Zone → Change visibility → Public** (GitHub Pages ist nur bei öffentlichen Repositories kostenlos).
2. **Settings → Pages → Build and deployment → Source: „GitHub Actions“**.
3. Reiter **Actions** → Workflow „Fantasy Golf auf GitHub Pages“ → **Run workflow** (oder einfach den nächsten Push abwarten).

Danach ist das Spiel unter `https://66zyn8gz5v-dot.github.io/Golf-with-your-Friends/` erreichbar. Auf dem iPad in Safari öffnen, **Teilen → Zum Home-Bildschirm**: Es erscheint ein Symbol, das Spiel startet im Vollbild und funktioniert auch ohne Internet. Updates kommen automatisch beim nächsten Start mit Verbindung.

## Baumodus (eigene Bahnen im Spiel bauen)

Im Kreativmodus gibt es **Bahn bauen**: ein Editor direkt im Spiel. Er steckt in `src/editor.js`.

**Der Leitgedanke ist Übersicht, nicht Fülle.** Das Spiel kennt über sechzig Maschinen und
fünfundvierzig Ausstattungen. Läge das alles gleichzeitig da, baute niemand mehr etwas. Darum:

* Die Werkzeugleiste sitzt **unten** und ist immer nur drei Reihen hoch – Hinweiszeile, die Knöpfe
  der offenen Gruppe, die fünf Gruppen samt Handgriffen. Vorher war sie eine 290 Pixel breite Spalte
  am rechten Rand; auf dem iPad hat die ein Viertel der Bahn weggenommen.
* Die fünf Gruppen sind **Boden**, **Start & Ziel**, **Maschinen**, **Höhen** und **Ansicht**. Offen
  ist immer genau eine.
* Ganz oben steht **immer ein Satz**, was das gewählte Werkzeug gerade tut.
* Alles andere – die Maschinenauswahl, die Einstellungen einer Maschine, die Angaben zur Bahn, das
  Speichern – geht als **Blatt** von unten auf, über der Leiste, nicht auf ihr: Rückgängig, Testen
  und Fertig bleiben erreichbar, während man an einer Maschine dreht.

**Rückgängig und Wiederholen** gibt es für jeden Schritt (80 tief, auch Strg+Z / Strg+Umschalt+Z).
Ein Strich mit dem Finger ist dabei *ein* Schritt und nicht sechzig: Gemerkt wird beim Aufsetzen,
abgelegt beim Loslassen – und nur, wenn sich wirklich etwas geändert hat.

**Boden malen** kennt fünf Formen: **Malen** (ziehen), **Füllen** (der Farbeimer nimmt die ganze
zusammenhängende Fläche), **Rechteck**, **Linie** und **Pipette** (übernimmt den Boden, der dort
liegt). Rechteck und Linie zeigen beim Ziehen eine Vorschau – dieselbe Rechnung, die danach malt.
Füllen gilt auch für Höhenstufen.

**63 der 68 Maschinen** lassen sich setzen, nach Welt gruppiert (Grundausstattung, Legende,
Kolosseum, Uhrwerk, Schneeberg, Zwergenmine, Die Flut), jede mit deutschem Namen und einem Satz
dazu, und mit einem Suchfeld darüber. Sie kommen mit denselben Werten wie in den gebauten Welten,
damit sie sich gleich anfühlen.

**Ein Werkzeug statt vier:** Tippen auf leeren Boden setzt die gewählte Maschine, Tippen auf eine
vorhandene wählt sie aus und öffnet ihr Blatt, Ziehen verschiebt sie (auf halbe Kacheln einrastend).
Maschinen mit zwei Enden – Lore, Fähre, Welle, Bande, Portal, Anglerfisch, Wandertor, Seilbahn –
haben drei Greifpunkte: die beiden Enden einzeln und die Mitte für das Ganze. **Drehen**, **Doppeln**
und **Löschen** stehen im Blatt.

**Aussehen als eigene Reihe:** Viele Maschinen können anders aussehen, ohne sich anders zu
verhalten – die Lore ist auch ein Drache, ein Sarg oder ein Piratenschiff, die Kanone auch eine
Balliste. Das steckte bis Fassung 190 im **Drehen**-Knopf: Bei der Kanone musste man *viermal*
drehen, bis das Aussehen wechselte, und bei der Mühle ging es nur zusammen mit der Achse. Das hat
niemand gefunden, der nicht den Quelltext gelesen hat. Seit Fassung 191 steht es als erste Reihe im
Blatt der Maschine – eine Plakette je Aussehen, ein Tipp –, und **Drehen** dreht wieder nur.
Zehn Maschinentypen haben eine Wahl, zusammen 120 Aussehen; Lore, Fähre und Welle teilen sich
dieselben fünfundzwanzig Fahrzeuge (`AUSSEHEN` und `FAHRZEUGE` in `src/editor.js`).

**Regler je Maschine:** Tempo, Größe, Reichweite, Takt – benannt in gewöhnlichen Worten („Wie oft“,
„Wie weit sie schießt“) statt in Fachbegriffen. Zuerst stehen nur die drei bis fünf da, die wirklich
etwas ausmachen; der Rest liegt hinter **Mehr einstellen**. Jeder Regler wirkt sofort.

**Löwentor, Kupferrohr und Abflußrohr** merken sich ihre beiden Plätze als Buchstaben in der Karte
(groß = Einlauf, klein = Auslauf). Das ging bisher nur im Quelltext; jetzt sucht der Baumodus den
nächsten freien Buchstaben und setzt beide Felder selbst, und beim Löschen verschwinden sie wieder.
Geteilte Bahnen dürfen A–F darum ebenfalls tragen (`KARTE` in `src/share.js`).

**Höhenstufen**: **Höher**, **Tiefer** und **Stufe weg** heben und senken den Boden kachelweise, die
**Stufenhöhe** wechselt zwischen flach (0,3), mittel (0,5) und steil (0,8). Der Ball rollt Hänge
hinunter, wie in den Bahnen des Schattenreichs. Damit man von oben nicht blind malt, zeigt der
Editor jede Stufe als Ziffer und Tönung. Das Raster liegt als Ziffernzeilen (`heights`) über der
Karte, wird beim Ändern der Kartengröße mitgezogen und kommt nur dann in die Bahn, wenn wirklich
Stufen gemalt sind.

**Testen** spielt die Bahn sofort probe, danach geht es zurück in den Editor. **Fertig** speichert
sie und öffnet die **Eigene Welt**: dort wird die Bahn per **Einsetzen** an einer wählbaren Stelle
eingefügt, die Reihenfolge lässt sich mit den Pfeilen ändern, das Kreuz nimmt eine Bahn wieder
heraus. Die Eigene Welt erscheint im Kreativmodus als eigene Welt und wird in dieser Reihenfolge
gespielt. Gespeichert wird im Browser; **Exportieren** liefert den Bahn-Code als Text,
**Importieren** liest ihn wieder ein – zum Weitergeben gibt es **Teilen** und **Link kopieren**
(siehe „Bahnen weitergeben“).

**Was der Baumodus nicht baut**, und warum ein Knopf dafür schlimmer wäre als keiner: Innenräume
(Bahnen mit zweiter Karte, wie Pyramide oder Schattenschloss) samt der Tür dorthin, und die fünf
Maschinen, die mehrere Ebenen übereinander brauchen – Aufzug, Luke, Turbine, Zahnstange. Solche
Bahnen lassen sich deshalb auch nicht teilen.

**Geprüft wird das mit `node tools/baumodus.mjs`** im echten Browser. Die Prüfung setzt jede der 63
Maschinen einmal hin, baut die Bahn daraus, ruft `update()` auf und sieht nach, ob die Maschine auch
ankommt – und sie faßt jeden einzelnen Regler an. Der Grund dafür steht im Werkzeug: Ein Regler,
dessen Schlüssel es am Hindernis gar nicht gibt, sieht im Blatt völlig richtig aus und tut nichts.
Beim ersten Lauf waren es neununddreißig solcher Regler.

Dieselbe Prüfung öffnet auch jedes der 120 Aussehen einmal und läßt ein Bild zeichnen – nicht bloß
rechnen. Denn ein Stilname, den der Zeichner nicht kennt, fällt nicht auf: Die Maschine wird dann
einfach in ihrer Grundgestalt gemalt, und die Plakette im Blatt tut scheinbar nichts. Ein Stilname,
der einen Zeichner mit anderen Erwartungen trifft, stürzt dagegen ab. Beides fängt nur ab, wer
wirklich malen läßt.

## Das Zauberreich (Ereignis, drei Welten auf einer Insel)

Ein **Ereignis** – aber keins mit Stoppuhr. Der Knopf **Zauberreich** im Startbildschirm führt auf
einen eigenen Bildschirm, auf dem die drei Orte untereinander stehen, samt Fortschritt und Hut. Es
läuft nichts ab und geht nichts wieder verloren; was das Ganze zum Ereignis macht, ist der
Aufstieg. Auf der Weltkarte liegen die drei als **eine** Insel im Nordwesten: `worldmap.js` läßt
Landstücke zusammenwachsen, wenn ihr Abstand kleiner ist als 0,78 mal die Summe ihrer Reichweiten,
und genau so sind sie gesetzt – ein Reich, kein Archipel.

| Ort | Stufe | Bahnen | Hut |
|---|---|---|---|
| Lehrlingsgarten | Normal | 9 | Lehrlingshut |
| Sternenwarte | Profi | 9 | Sternenhut |
| Erzmagierloge | Legende | 9 | Erzmagierhut |

**Die drei Hüte sind Hüte und sonst nichts.** Zuerst waren sie Ganzkörper-Skins mit einem Gesicht
darunter – und das war zweimal falsch: Es nahm dem Hut die Hauptrolle, und weil das Gesicht immer
dasselbe war, sahen sich die drei zu ähnlich. Jetzt sitzen sie auf dem Ball wie jeder andere Hut,
der Ball behält seine Spielerfarbe, und sie unterscheiden sich an dem, worauf es ankommt: an der
**Form**. Der Lehrlingshut ist ein schlichter, fast gerader Filzkegel mit kleiner Krempe; der
Sternenhut ist hoch und geschwungen, seine Spitze rollt sich nach rechts ein und trägt den Mond;
der Erzmagierhut ist schlaff und zerknautscht, seine Spitze kippt nach **links** über, und darunter
liegt eine sehr breite, wellige Krempe mit Goldrand. Die Spitzen zeigen mit Absicht in
verschiedene Richtungen – das ist der Unterschied, den man noch erkennt, wenn der Hut nur so groß
ist wie ein Daumennagel.

Jeder Ort ist im Spiel eine **eigene Welt** (`WORLDS` in `src/courses_pro.js`) mit eigenem
Belohnungsskin. Die Bedingung dafür brauchte nichts Neues: Sie steht seit der Zwergenmine in
`hats.js` – jede Bahn der Welt gespielt, und in der Summe unter Par. Ein Ort, dessen Welt es noch
nicht gibt, steht auf dem Eventbildschirm als *in Arbeit* und bekommt auf der Karte weder Namen
noch Nadel (`gebaut()` in `src/worldmap.js`): Eine Nadel, hinter der nichts steckt, wäre ein
gebrochenes Versprechen und ein Klick darauf ein Absturz.

**Die Frage dieser Welt ist: *wann fängt es an?*** Jede andere Welt läuft im Takt – Fallgatter,
Falltür, Stacheln, Fontäne, Wracktor gehen auf und zu, ohne daß jemand gefragt würde, und die
Aufgabe heißt immer: den Moment abpassen. Hier startet der Spieler die Uhr selbst.

**Die Maschinen** (`src/obstacles_zauber.js`, gezeichnet in `src/render_zauber.js`):

* **Die Rankenbrücke** (`ranke`). Über der Lücke liegt nichts. Stößt der Ball die Blüte an, wächst
  eine Ranke hinüber und trägt ein paar Sekunden lang – dann welkt sie, und wer noch darauf liegt,
  fällt. Ein Balken neben der Ranke läuft sichtbar leer und blinkt in der letzten Sekunde; vier
  Sekunden im Kopf zu zählen, während der Ball rollt, kann niemand.
  *Warum die Blüte und nicht ein Takt:* Eine Brücke, die im Takt kommt und geht, ist die Falltür,
  nur andersherum. Der Reiz entsteht erst dadurch, daß der Spieler die Uhr selbst startet – er muß
  die Blüte treffen und dabei **genug Schwung behalten**. Zu hart schießt über die Brücke hinaus,
  zu weich liegt darauf, wenn sie welkt.
  *Wie sie technisch trägt:* gar nicht. Ihre Felder sind in der Karte gewöhnlicher Boden, und die
  Ranke sorgt nur dafür, daß man dort **nicht** hindurchfällt – dieselbe Umkehrung wie bei der
  Schneebrücke. Boden, der zur Laufzeit entsteht, müßte Wegfindung, Banden und Kamera mitziehen;
  Boden, der wegfällt, kostet eine Abfrage.
* **Die Zauberhüte** (`zauberhut`). Zwei bis vier Hüte, genau einer leuchtet. Wer in einen rollt,
  kommt aus dem leuchtenden heraus – und wer in den leuchtenden rollt, aus dem **nächsten**, damit
  er keine Sackgasse ist. Das Leuchten wandert im Takt, und der nächste Hut glimmt schon auf,
  bevor er dran ist: Ein wanderndes Ziel, das man nicht kommen sieht, wäre Glück, und Glück ist
  hier nirgends die Aufgabe.
  *Das Maß der Zeichnung ist nicht das Maß der Maschine.* Beim ersten Versuch war der Hut so breit
  wie sein Maul (0,42 Kacheln) und wurde in der Schrägsicht zu einem Dorn – derselbe Fehler wie
  beim Wasserrad. Der Kegel wird darum im **Bildraum** gebaut, nicht in der Weltebene: Aus der
  Projektion kommt nur die Höhe, Breite und Knick sind Bildpunkte. So steht der Hut aufrecht, egal
  wie die Kamera gedreht ist.
* **Der Mondzieher** (`mondzieher`, Sternenwarte). Er zieht und stößt im Wechsel: volle Scheibe
  zieht, dunkle stößt, Halbmond läßt in Ruhe. *Warum kein Magnet:* Der Magnet zieht immer gleich
  stark und immer in dieselbe Richtung; man lernt ihn einmal und rechnet ihn danach mit. Hier ist
  auch das **Vorzeichen** eine Frage des Zeitpunkts – derselbe Schlag geht einmal daneben, weil er
  gezogen wurde, und einmal, weil er gestoßen wurde. *Ohne Pfeil:* Die Phase steht am Mond selbst,
  in der Sprache jedes Kalenders, und am Boden laufen Funken nach innen (zieht) oder nach außen
  (stößt) – Richtung und Stärke in einer einzigen Bewegung. *Und er greift nur einen rollenden
  Ball:* Seine Kraft liegt über der Bodenreibung; ohne diese Schranke schöbe er einen liegenden
  Ball von allein über die Bahn, und der Spieler sähe zu, statt zu entscheiden.
  *Die Scheibe ist groß, und zwar absichtlich.* Beim ersten Versuch hatte sie einen halben
  Kachelhalbmesser – und bei Neumond war sie eine dunkle Scheibe vor einem dunklen Himmel, also
  unsichtbar. Genau dann aber muß man sie am dringendsten sehen.
* **Das Sternbild** (`sternbild`, Sternenwarte). Mehrere Sterne stehen auf der Bahn; wer über einen
  rollt, zündet ihn an. Sind alle an, geht das **Sternentor** auf – vorher steht dort eine Wand aus
  Licht. Die Linien zwischen zwei Sternen leuchten erst, wenn beide Enden brennen; so sieht man
  ohne Zahl am Bildrand, was noch fehlt, und zwar dort, wo der Ball gleich langläuft.
  *Warum das eine Profi-Aufgabe ist:* Alles andere im Spiel fragt „wohin als nächstes". Das
  Sternbild fragt „in welcher **Reihenfolge**", und das muß man vor dem ersten Schlag entscheiden.
  *Und es bleibt an:* Gezündete Sterne gehen innerhalb einer Bahn nicht wieder aus – sonst hieße
  die Aufgabe „alles in einem Schlag", und das ist Glück, kein Planen.
  *Das Tor ist eine Wand, kein Loch im Boden:* Boden, der zur Laufzeit entsteht, müßte die ganze
  Wegfindung mitziehen; ein Mauerstück, das der Zeichner malt und die Physik abfragt, kostet nichts.
* **Der Zauberspiegel** (`zauberspiegel`, Erzmagierloge). Ein hoher Spiegel steht quer im Raum. Wer
  hineinrollt, kommt drüben wieder heraus – aber **seitenverkehrt**: Wer links auftrifft, kommt
  rechts heraus, und was sich nach links bewegte, bewegt sich danach nach rechts.
  *Warum kein Portal:* Ein Portal hat einen festen Ausgang. Hier gibt es keinen – **der Spieler
  wählt ihn mit seinem Schlag**, stufenlos über die ganze Breite. Das ist keine Frage des Treffens
  mehr und keine des Zeitpunkts, sondern eine des Rechnens, und dafür ist die Legenden-Stufe da.
  *Das Spiegelbild ist die Ansage:* Solange der Ball auf einer Seite liegt, steht sein Bild drüben –
  genau dort, wo er herauskäme, und es bewegt sich seitenverkehrt mit. Man muß nichts ausrechnen;
  man sieht es. Die Probe in `tools/zauber.mjs` prüft ausdrücklich, daß der Geisterball und die
  Maschine dieselbe Stelle meinen: Stünde er woanders, wäre die Ansage eine Lüge.
  *Und er greift nur, wer auf ihn zurollt* – sonst hinge man zwischen beiden Seiten fest.

**Die Optik der alten Maschinen kommt aus dem Bestand** – kein einziges neues Bild, und trotzdem
sieht keine aus wie im Märchenland: Das Windrad ist hier eine **Ranke** oder ein **Besen**, der
Prellklotz ein **Pilz**, eine **Leuchtkugel** oder ein **Kristall**, der Magnet ein
**Seelenlicht**, die Drehscheibe ein **Laubwirbel**. Seit Fassung 191 sind diese Gestalten auch im
Baumodus unter *Aussehen* zu finden. In der Sternenwarte geht es so weiter: Das **Auge des
Turms** aus dem Schattenreich wird zum Fernrohr, das **Pendel** der Uhrwerkstadt zum Lot des
Astronomen, das **Zahnradfeld** zur Armillarsphäre, der **Strudel** der Flut zum Nebelwirbel und
das **wandernde Tor** zum Wandelgang. In der Erzmagierloge kommen die härtesten dazu: der
**Blitz** und der **Aufwind** des Sturmhimmels, das **wandernde Loch** der Uhrwerkstadt und die
**Grubenlampe** der Zwergenmine – die Bannkreis-Gruft ist dunkel wie die Mine, und das ist die
einzige Stelle im Zauberreich, an der man sich merken muß, was man beim Hinweg gesehen hat.

**Der Bahnbauer** ist `tools/zauber.py`. Er trägt die Regeln, die aus früheren Welten gelernt
wurden – Schrägen in jede einspringende Ecke (die Eckkachel selbst wird Boden, sonst bleibt die
rechtwinklige Bande stehen), keine freie Sichtlinie vom Abschlag ins Loch, Deko-Dichte 0,09 statt
Dickicht – und dazu zwei eigene:

* **Die Blüte muß ohne ihre eigene Ranke erreichbar sein.** Sonst bräuchte man die Brücke, um an
  das zu kommen, was die Brücke baut. Andere Ranken dürfen dabei benutzt werden – zwei Lücken
  hintereinander sind ausdrücklich erlaubt.
* **Man muß es in der Zeit auch schaffen.** Gerechnet wird mit demselben Reibungswert wie in der
  Physik (4,2) und mit einem ehrlichen Tempo an der Blüte (12), nicht mit dem Höchstschlag.
* **Und nach einem Sturz wird niemand auf die Brücke zurückgelegt.** Ihre Felder sind in der Karte
  gewöhnlicher Boden; wer dort abgelegt wird, fällt sofort wieder, bekommt den nächsten
  Strafschlag und landet wieder dort – bis zum Schlaglimit. Fynn hat das am 19. September auf
  *Die erste Blüte* gefunden. Es ist dieselbe Falle wie beim Wasser (seit dem Gießlöffel kann
  Boden zu Wasser werden) und in der Strömung (sie trägt auch einen liegenden Ball), und darum
  steht die Regel jetzt an derselben Stelle wie jene beiden: in `ruhigerBoden` in `main.js`,
  festgehalten von `node tools/ruhepunkt.mjs`. **Auf** der Brücke liegenzubleiben bleibt richtig –
  wer zu sacht schlägt, fällt mit der Ranke. Verboten ist nur, ihn dort wieder hinzulegen.
* **Der Sockel des Mondziehers steht auf Boden.** Er ist fest; über dem Abgrund stünde er im Nichts.
* **Das Sternentor sperrt wirklich etwas ab** – mit geschlossenem Tor darf es keinen Weg ins Loch
  geben, sonst ist das ganze Sternbild Schmuck. Gerechnet wird dabei nicht mit gesperrten Kacheln,
  sondern mit gesperrten **Übergängen**: Ein Tor steht zwischen zwei Kachelreihen, nicht auf einer.
* **Und jeder Stern liegt vor dem Tor.** Ein Stern dahinter machte die Bahn unlösbar: Man käme nur
  durch das Tor an ihn heran, und das Tor ginge nur auf, wenn man ihn hätte.
* **Neben dem Zauberspiegel liegt auf beiden Seiten Boden** – über seine ganze Breite. Steht vor
  einem Ende die Wand, kommt man dort nie an; ist hinter einem Ende kein Boden, wirft der Spiegel
  den Ball ins Nichts. Geprüft wird die Fläche, durch die der Ball geht, nicht die äußersten
  Enden: Ein Spiegel steckt mit seinen Enden in der Wand, wie eine Tür im Rahmen.

**Der Bot mußte dafür zweimal nachgebessert werden**, und beides ist eine Lehre über Prüfwerkzeuge:

* **Der Prüfstand spielte einen Spielstand, den es nicht gibt.** Der Bot rechnet vor jedem Schlag
  Dutzende Kandidaten auf demselben Level durch. Ranke und Sternbild merken sich aber etwas über
  den einzelnen Schlag hinaus – und was ein Kandidat angestoßen hatte, stand danach für den
  wirklichen Schlag noch offen. Der Bot lochte die Erzmagierloge im Mittel mit **zwei** Schlägen
  bei Par 5 und hielt die Legenden-Welt damit für leichter als den Lehrlingsgarten. Seitdem wird
  dieser Zustand wie `switches` im Zustand mitgeführt (`zauberLesen`/`zauberSetzen` in
  `tools/audit/sim.mjs`).
* **Und er kannte die Blüte nicht.** Danach lief er immer wieder geradeaus gegen dieselbe Lücke,
  fiel hinein und erreichte das Schlaglimit – jede Rankenbahn wäre als unspielbar durchgefallen,
  obwohl jeder Spieler auf einen Blick sieht, was zu tun ist. Die Rankenbrücke ist für den Bot
  jetzt dasselbe Rätsel wie ein Schalter-Tor: Solange sie nicht trägt, ist nicht das Loch das
  nächste Ziel, sondern die Blüte (`activeMap`).

Dazu kennt der Prüfstand jetzt auch Fynns Regel vom 19. September: Auf eine Rankenbrücke wird nach
einem Strafschlag niemand zurückgelegt, und ein Ball, der auf einer tragenden Ranke liegenbleibt,
ist noch nicht in Sicherheit – sie welkt gleich.

**Geprüft** wird mit `node tools/zauber.mjs` (Verhalten beider Maschinen im echten Ablauf),
`node tools/validate.mjs` und `GAMES=2 node tools/audit/audit.mjs lehrling` bzw. `… warte`, `… loge`. Die Wegprüfung in
`validate.mjs` kennt die Zauberhüte als Verbindung – sonst hielte sie ausgerechnet die Bahn für
unpassierbar, die den Hut erklärt.

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
index.html        Seite, HUD und Ladebild (das Ladebild läuft ohne JavaScript)
tools/auslieferung.mjs  prüft für beide Seiten, ob alles Gebrauchte auch ausgeliefert wird
tools/vermittler.mjs    ein kleiner MQTT-Vermittler für die Werkbank – ohne ihn ist Online nicht prüfbar
tools/online.mjs        fährt zwei Browser gegeneinander: beitreten, spielen, rausfliegen, wiederkommen
tools/flut.mjs          prüft die Maschinen der Flut: Beckenlauf, Durchrollen, Pumpwerk, jede fertige Bahn
tools/flut.py           baut die Bahnen der Flut – und lehnt jede ab, auf der man warten müsste
tools/baumodus.mjs      setzt im Browser jede der 63 Maschinen des Baumodus einmal hin und faßt jeden Regler an
tools/zauber.mjs        prüft die Maschinen des Zauberreichs: Ranke, Hüte, Mondzieher, Sternbild, Spiegel
tools/ruhepunkt.mjs     prüft, wohin der Ball nach einem Strafschlag zurückkommt – nie dorthin, wo er gleich wieder fällt
tools/zauber.py         baut die Bahnen des Zauberreichs – und lehnt jede Blüte ab, die man nicht rechtzeitig erreicht
style.css         Oberfläche
src/themes.js     Farbpaletten und Deko je Welt
src/courses.js    die Bahnen des Märchenlands
src/courses_sea.js die Bahnen der Meereswelt
src/courses_jungle.js die Bahnen des Dschungeltempels
src/courses_storm.js die Bahnen des Sturmhimmels (Legende)
src/courses_shadow.js die Bahnen des Schattenreichs (Legende)
src/courses_colosseum.js die Bahnen des Kolosseums (Legende)
src/courses_mine.js die zwölf Bahnen der Zwergenmine (erzeugt von tools/mine.py)
src/courses_flut.js die Probebahnen der Flut (erzeugt von tools/flut.py)
src/courses_boule.js die neun Bahnen der Boule-Welt (erzeugt von tools/boule.py)
src/courses_pro.js die Bahnen des Tüftlerreichs und die Weltenliste
src/editor.js     Baumodus (Editor für eigene Bahnen)
manifest.webmanifest, sw.js, icons/   Web-App: Installieren und offline spielen
.github/workflows/pages.yml           Veröffentlichung auf GitHub Pages
src/level.js      Karte → Kacheln, Mauern, Kollisionssegmente
src/obstacles.js  bewegliche und statische Hindernisse
src/obstacles_legend.js Blitzfeld, Aufwind, Falltür, Fallbeil, Augenturm, Löwentor
src/obstacles_mine.js Sprengladung, Kippbühne, Grubenlampe, Gießlöffel und Lavafontäne der Zwergenmine
src/obstacles_flut.js das Flutbecken (Ringnummern, Takt) und das Pumpwerk
src/physics.js    Ballphysik und Kollision (auch Ball gegen Ball, wenn mehrere zugleich rollen)
src/render.js     isometrische Darstellung
src/render_legend.js Optik der Legende-Welten (Hintergründe, neue Hindernisse und Stile)
src/render_mine.js Optik der Zwergenmine: Fels statt Himmel, der Schleier und die drei Maschinen
src/render_flut.js Optik der Flut: das leere Becken, die Ansage des steigenden Wassers, das Pumpwerk
src/text.js       Eine Stelle für alle Eingaben: Namen und Bahnnamen filtern, Anzeige entschärfen
src/share.js      Bahnen weitergeben: prüfen, über den Vermittler teilen, als Link verpacken
src/version.js    Fassung und Ausgabe (Spiel oder Vorschau): Zahl, Speicher-Vorsatz und Themen-Marke – von Seite und Service Worker gelesen
src/icons.js      Sinnbilder der Oberfläche: Material Symbols als eingebettete SVG-Pfade (Bedienung, Welten, Ränge, Wertungen)
src/hats.js       Hüte für die Bälle: Zeichnungen und Vorschau fürs Menü
src/net.js        Netzspiel: Raumcode und MQTT-Zugang für das Spiel zu mehreren
src/best.js       Rangliste: Rekorde je Bahn und je Welt in drei Wertungen (Schläge, Zeit, Kombi), über alle Geräte geteilt
src/sfx.js        Klangeffekte (WebAudio)
src/music.js      Musik: je Welt ein erzeugter Klangteppich (WebAudio)
src/worldmap.js   Weltkarte: Landkarte aus gerechneter Küste, Gelände je Biom und die Orte der Welten
icons/weltkarte.svg dieselbe Karte als fertige Datei – Hintergrund für Ladebild und alle Tafeln (node tools/karte.mjs)
icons/icon-*.png   die App-Zeichen: eine Insel im Stil der Karte (node tools/appzeichen.mjs)
src/main.js       Spielablauf, Eingabe, Punkte

src/3d/index.html   die eigene Seite von Fantasy Golf 3D (eigene Adresse, eigenes Ladebild)
src/3d/stil3d.css   ihr Stilblatt – das 2,5D-Spiel hat sein eigenes und weiß von diesem nichts
src/3d/start3d.js   der Anlasser: Welt starten, Ladebild weg, Zierschrift, Service Worker
src/3d/manifest3d.webmanifest  damit sich die 3D-Welt als eigene App einrichten lässt
src/3d/mathe3d.js   Vektoren, Matrizen, Rauschen – die Rechnung für drei Dimensionen
src/3d/gl3d.js      der 3D-Zeichner: WebGL, Sonne, Schattenwurf, Nebel (ohne fremde Bibliothek)
src/3d/bauen3d.js   die Bauhütte: Grundkörper und der Sammler, der die feste Welt zusammenbackt
src/3d/deko3d.js    Burg, Türme, Häuser, Scheunen, Bäume, Felsen, Zäune, Zelte, Fahnen, Wolken
src/3d/bahnen3d.js  die Welt „Grasland" mit ihren neun Bahnen und die Liste aller Welten
src/3d/welt3d.js    aus Kartenzeichen wird Landschaft: Gelände, Wasser, Bewuchs, Höhe und Neigung
src/3d/physik3d.js  wie der Ball in 3D rollt, springt, abprallt und einlocht
src/3d/karte3d.js   die Weltkarte als Insel im Meer, aus gerechneter Küste
src/3d/spiel3d.js   Ablauf der 3D-Welt: Weltkarte, Bahnwahl, Spielen, Ergebnis
tools/3d.mjs        prüft die 3D-Welt ohne Browser: Bahnen, Dreiecke, Gelände, Spielbarkeit, Par
```
