/* Baumodus: eigene Bahnen direkt im Spiel bauen.

   LEITGEDANKE: Übersicht vor Fülle. Das Spiel kennt über sechzig Maschinen und fünfundvierzig
   Ausstattungen – wer davon alles gleichzeitig sieht, baut gar nichts mehr. Darum ist immer nur
   eine Gruppe von Knöpfen offen, jede Maschine hat einen deutschen Namen und einen Satz dazu,
   und je Maschine stehen zuerst nur die drei bis fünf Regler da, die man wirklich anfaßt; der
   Rest liegt hinter „Mehr“.

   Dazu gehört, daß man sich nichts kaputtmachen kann: Jeder Schritt läßt sich zurücknehmen.

   Die Werkzeugleiste sitzt UNTEN, nicht rechts. Rechts hat sie auf dem iPad ein Viertel der
   Bahn weggenommen; unten bleibt die Bahn breit, und die Knöpfe liegen da, wo der Daumen ist.

   Wird von main.js mit den nötigen Spielfunktionen verdrahtet. */
const Editor = (deps) => {
  const { state, R, $, showMessage, startTest, showWorldSelect } = deps;
  const KEY = speicherSchluessel('custom');

  /* ---------- Böden ----------
     [Zeichen, Name, was er tut]. Der Satz steht in der Hinweiszeile, sobald der Knopf gewählt ist. */
  const TILES = [
    ['#', 'Rasen', 'Normaler Boden. Der Ball rollt wie erwartet.'],
    ['s', 'Sand', 'Bremst stark. Wer hier landet, bleibt fast stehen.'],
    ['i', 'Eis', 'Fast keine Reibung – der Ball läuft und läuft.'],
    ['w', 'Wasser', 'Der Ball versinkt: Strafschlag. Achtung: Wasser ist Boden, an seiner Kante entsteht KEINE Bande.'],
    ['l', 'Lava', 'Wie Wasser, nur heiß. Strafschlag.'],
    ['x', 'Klotz', 'Ein Block mitten auf der Bahn. An ihm prallt der Ball ab.'],
    ['o', 'Klippe', 'Fester Rand, über den man hinwegsieht – gut für Aussichtskanten.'],
    ['.', 'Leer', 'Abgrund. Am Übergang zum Boden entsteht die Bande, an der der Ball abprallt.'],
  ];

  /* ---------- Maschinen ----------
     Nach Welt gruppiert, in der Reihenfolge, in der man ihnen im Spiel begegnet. [Kennung, Name,
     ein Satz]. Fünf Maschinen fehlen mit Absicht: Aufzug, Luke, Turbine und Zahnstange brauchen
     mehrere Ebenen übereinander, die Tür braucht einen Innenraum – beides kann der Baumodus nicht
     bauen, und ein Knopf, der eine kaputte Bahn erzeugt, ist schlimmer als kein Knopf. */
  const MASCHINEN = [
    ['Grundausstattung', [
      ['bumper', 'Pilz', 'Federt den Ball kräftig zurück.'],
      ['wall', 'Bande', 'Eine freie Wand quer durch die Bahn. Zwei Tipper: Anfang und Ende.'],
      ['rotor', 'Windrad', 'Dreht sich und schlägt den Ball weg.'],
      ['windmill', 'Windmühle', 'Ein Haus mit Durchgang – die Flügel sperren ihn im Takt.'],
      ['gate', 'Fallgatter', 'Hebt und senkt sich. Nur im richtigen Moment kommt man durch.'],
      ['mover', 'Lore', 'Fährt hin und her und schiebt den Ball mit.'],
      ['ferry', 'Fähre', 'Trägt den Ball über Wasser oder Abgrund.'],
      ['rail', 'Schiene', 'Hält den Ball in der Spur, wie eine Rinne.'],
      ['field', 'Windfeld', 'Ein Bereich, in dem es ständig in eine Richtung drückt.'],
      ['ramp', 'Sprungrampe', 'Wer mit Schwung auffährt, fliegt über alles hinweg.'],
      ['boost', 'Beschleuniger', 'Ein Feld, das den Ball nach vorn schießt.'],
      ['cannon', 'Kanone', 'Verschluckt den Ball und schießt ihn im Schwenk wieder ab.'],
      ['magnet', 'Magnet', 'Zieht den Ball an – oder stößt ihn weg.'],
      ['turntable', 'Drehscheibe', 'Fängt den Ball und wirft ihn in eine feste Richtung.'],
      ['wave', 'Welle', 'Schiebt den Ball quer zur Laufrichtung weg.'],
      ['sharkjump', 'Hai', 'Springt aus dem Wasser und frißt den Ball.'],
      ['potion', 'Schrumpftrank', 'Macht den Ball eine Weile winzig.'],
      ['cauldron', 'Hexenkessel', 'Wer aus der Luft hineintrifft, wird geschrumpft und ausgespuckt.'],
      ['portal', 'Portal', 'Zwei Tipper: Eingang und Ausgang. Der Ball springt hindurch.'],
    ]],
    ['Legende', [
      ['spikes', 'Stacheln', 'Fahren im Takt aus. Wer daraufliegt, zahlt einen Strafschlag.'],
      ['updraft', 'Aufwind', 'Trägt einen schnellen Ball über die Lücke. Langsame fallen.'],
      ['lightning', 'Blitz', 'Schlägt im Takt ein – erst das Warnzeichen, dann der Schlag.'],
      ['guillotine', 'Fallbeil', 'Fällt im Takt. Nie darunter liegen bleiben.'],
      ['trapdoor', 'Falltür', 'Klappt im Takt auf. Wer darüber rollt, stürzt.'],
      ['eyetower', 'Turm des Auges', 'Der Blick wandert im Kreis. Wer darin liegen bleibt, fliegt zurück.'],
      ['switch', 'Schalter', 'Öffnet ein Fallgatter mit demselben Buchstaben.'],
    ]],
    ['Kolosseum', [
      ['liongate', 'Löwentor', 'Zwei Tipper: Maul und Ausgang. Wer schnell genug ist, wird verschluckt.'],
      ['wandergate', 'Wanderndes Tor', 'Eine Mauer, deren Lücke hin und her wandert. Zwei Tipper.'],
      ['firetower', 'Feuerturm', 'Ein Feuerstrahl streicht über die Bahn.'],
      ['imperialbox', 'Kaiserloge', 'Der Daumen des Kaisers öffnet und schließt eine Luke.'],
    ]],
    ['Uhrwerk', [
      ['gearfield', 'Zahnradfeld', 'Trägt den Ball ans andere Ende, wie ein Laufband.'],
      ['pendulum', 'Pendel', 'Schwingt quer über die Bahn und stößt den Ball weg.'],
      ['springwork', 'Federwerk', 'Fängt den Ball und schleudert ihn davon.'],
      ['gearlift', 'Zahnradaufzug', 'Nimmt den Ball auf und setzt ihn ein Stück weiter ab.'],
      ['piston', 'Dampfkolben', 'Stößt im Takt aus der Wand hervor.'],
      ['hand', 'Zeiger', 'Ein Arm dreht sich und schiebt den Ball mit.'],
      ['escapement', 'Hemmung', 'Zwei Klinken – immer ist genau eine Seite offen.'],
      ['sweephand', 'Zeigerarm', 'Streicht über eine runde Fläche und nimmt den Ball mit.'],
      ['handclock', 'Zeigerwerk', 'Drei Zeiger: blau bremst, grün stößt weg, rot zieht mit.'],
      ['dial', 'Zifferblatt', 'Das Loch springt im Takt zur nächsten Stundenmarke.'],
      ['wanderloch', 'Wanderndes Loch', 'Das Loch zieht im Kreis weiter. Das „H“ gehört auf die erste Marke.'],
      ['copperpipe', 'Kupferrohr', 'Zwei Tipper: Einlauf und Auslauf. Es verschluckt und spuckt wieder aus.'],
    ]],
    ['Schneeberg', [
      ['windfahne', 'Windfahne', 'Der Wind dreht sich im Takt – und mit ihm die ganze Bahn.'],
      ['lawine', 'Lawine', 'Fegt im Takt über einen Streifen und reißt alles mit.'],
      ['seilbahn', 'Seilbahn', 'Eine Gondel trägt den Ball hinüber. Zwei Tipper.'],
      ['schneebruecke', 'Schneebrücke', 'Trägt genau einmal. Beim zweiten Mal bricht sie ein.'],
    ]],
    ['Zwergenmine', [
      ['sprengladung', 'Sprengladung', 'Knallt im Takt und wirft alles in der Nähe weg.'],
      ['kippbuehne', 'Kippbühne', 'Eine Wippe: Sie neigt sich dorthin, wo der Ball liegt.'],
      ['bruchwand', 'Bruchwand', 'Fels, der erst durch eine Sprengung verschwindet.'],
      ['grubenlampe', 'Grubenlampe', 'Macht in der dunklen Mine ein Stück Bahn sichtbar.'],
      ['lavafontaene', 'Lavafontäne', 'Schießt im Takt glühend nach oben.'],
      ['giessloeffel', 'Gießlöffel', 'Kippt glühendes Erz in eine Rinne – die glüht dann kurz tödlich.'],
    ]],
    ['Die Flut', [
      ['flut', 'Flutbecken', 'Ein Becken, das im Takt vollläuft und wieder leerläuft.'],
      ['pumpwerk', 'Pumpwerk', 'Wer es berührt, hält die Becken eine Weile leer.'],
      ['stroemung', 'Strömung', 'Zieht auch einen liegenden Ball mit. Mit Puls wird sie zur Dünung.'],
      ['strudel', 'Strudel', 'Schleudert den Ball nach außen.'],
      ['tangwald', 'Tangwald', 'Frißt den Schwung. Eine Gasse wandert hin und her.'],
      ['angler', 'Anglerfisch', 'Patrouilliert auf einer Strecke. Wen er erwischt, den kostet es einen Schlag.'],
      ['muschel', 'Riesenmuschel', 'Steht auf und zu. Offen verschluckt sie den Ball und spuckt ihn weiter.'],
      ['raucher', 'Schwarzer Raucher', 'Wirft den Ball im Bogen davon – und zieht ihn vorher sacht an.'],
      ['ankerkette', 'Ankerkette', 'Schwingt wie ein Pendel quer durch den Weg.'],
      ['wracktor', 'Wracktor', 'Eine Luke, die im Takt aufgeht und zuschlägt.'],
      ['abflussrohr', 'Abflußrohr', 'Zwei Tipper: Einlauf und Auslauf. Es spült den Ball hindurch.'],
    ]],
  ];
  const MASCHINE_NAME = {}, MASCHINE_SATZ = {};
  for (const [, stuecke] of MASCHINEN) for (const [k, n, s] of stuecke) { MASCHINE_NAME[k] = n; MASCHINE_SATZ[k] = s; }
  /* Maschinen, die zwei Tipper brauchen: eine Strecke oder ein Paar von Plätzen. */
  const ZWEI_TIPPER = new Set(['wall', 'portal', 'angler', 'wandergate', 'seilbahn', 'liongate', 'copperpipe', 'abflussrohr']);
  /* Die drei, die ihre beiden Plätze als Buchstaben in der Karte ablegen – wie im Bahn-Quelltext. */
  const PAAR_MASCHINEN = new Set(['liongate', 'copperpipe', 'abflussrohr']);

  /* ---------- Regler ----------
     [Schlüssel, Name, kleinster, größter, Schritt]. Was VOR dem null steht, sieht man sofort –
     das sind die drei bis fünf Werte, die eine Maschine wirklich verändern. Was dahinter steht,
     liegt hinter „Mehr“: Feinheiten, Versatz im Takt, Dinge fürs Auge.

     Die Namen sind absichtlich keine Fachbegriffe. „Wie oft“ ist verständlicher als „Periode“,
     und wer wissen will, was passiert, probiert es aus – deshalb wirkt jeder Regler sofort. */
  const REGLER = {
    bumper:      [['r', 'Größe', 0.3, 1.2, 0.05], ['kick', 'Wumms', 3, 14, 0.5]],
    wall:        [['h', 'Höhe', 0.2, 1.5, 0.05], ['t', 'Dicke', 0.1, 0.6, 0.02]],
    rotor:       [['len', 'Länge der Flügel', 0.8, 4, 0.1], ['speed', 'Tempo', -4, 4, 0.1], ['blades', 'Wie viele Flügel', 2, 6, 1], null, ['thick', 'Dicke', 0.08, 0.4, 0.02], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    windmill:    [['w', 'Breite des Hauses', 2, 8, 0.5], ['gap', 'Breite des Durchgangs', 0.4, 3, 0.1], ['speed', 'Tempo', -4, 4, 0.1], null, ['blades', 'Wie viele Flügel', 2, 6, 1], ['depth', 'Tiefe des Hauses', 0.6, 3, 0.1], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    gate:        [['w', 'Breite', 0.5, 6, 0.5], ['period', 'Wie oft (Sekunden)', 2, 12, 0.5], ['open', 'Wie lange offen', 0.1, 0.9, 0.05], null, ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    mover:       [['period', 'Wie lange für hin und zurück', 2, 14, 0.5], ['w', 'Breite', 0.6, 2.5, 0.1], ['h', 'Tiefe', 0.6, 2.5, 0.1], null, ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    ferry:       [['wait', 'Wie lange sie wartet', 0.5, 6, 0.25], ['travel', 'Wie lange die Fahrt dauert', 1, 8, 0.25], null, ['w', 'Breite', 0.6, 2.5, 0.1], ['h', 'Tiefe', 0.6, 2.5, 0.1], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    rail:        [],
    field:       [['@kraft', 'Stärke', 0.5, 8, 0.25], ['w', 'Breite', 1, 10, 1], ['h', 'Tiefe', 1, 10, 1]],
    ramp:        [['speed', 'Absprungtempo', 2, 8, 0.2], ['land', 'Wie weit er fliegt', 0.8, 5, 0.1], ['minSpeed', 'Ab welchem Tempo', 1, 6, 0.1], null, ['w', 'Breite', 1, 6, 1], ['h', 'Tiefe', 1, 6, 1]],
    boost:       [['acc', 'Schub', 8, 50, 1], ['max', 'Höchsttempo', 6, 30, 0.5], null, ['w', 'Breite', 1, 8, 1], ['h', 'Tiefe', 1, 8, 1]],
    cannon:      [['range', 'Wie weit sie schießt', 3, 16, 0.5], ['amp', 'Wie weit sie schwenkt', 0, 1.2, 0.05], ['speed', 'Tempo des Schwenks', 0.2, 2.5, 0.1], null, ['loadTime', 'Wie lange sie lädt', 0.2, 2, 0.1], ['catchR', 'Wie groß das Maul ist', 0.4, 1.2, 0.05], ['flySpeed', 'Flugtempo', 4, 14, 0.5], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    magnet:      [['r', 'Reichweite', 1, 8, 0.25], ['strength', 'Stärke (minus stößt ab)', -20, 20, 0.5], null, ['slow', 'Bremst zusätzlich', 0, 6, 0.25]],
    turntable:   [['r', 'Größe', 0.8, 3, 0.1], ['speed', 'Tempo', -5, 5, 0.1], ['eject', 'Wie stark sie wirft', 2, 9, 0.25]],
    wave:        [['push', 'Wie stark sie schiebt', 6, 30, 0.5], ['period', 'Wie oft (Sekunden)', 2, 14, 0.5], ['w', 'Dicke', 0.3, 2, 0.1], ['h', 'Länge', 1, 8, 0.5], null, ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    sharkjump:   [['period', 'Wie oft (Sekunden)', 1.5, 8, 0.25], ['jump', 'Wie lange er oben ist', 0.1, 0.8, 0.05], null, ['w', 'Breite', 1, 8, 0.5], ['h', 'Tiefe', 1, 8, 0.5], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    potion:      [['duration', 'Wie lange klein', 4, 30, 1], ['scale', 'Wie klein', 0.3, 0.8, 0.05]],
    cauldron:    [['r', 'Größe', 0.5, 1.5, 0.05], ['duration', 'Wie lange klein', 5, 30, 1], ['spit', 'Wie stark er ausspuckt', 1, 6, 0.25], null, ['hold', 'Wie lange er hält', 0.2, 3, 0.1], ['scale', 'Wie klein', 0.3, 0.8, 0.05]],
    portal:      [],

    spikes:      [['period', 'Wie oft (Sekunden)', 2, 10, 0.5], ['up', 'Wie lange ausgefahren', 0.1, 0.9, 0.05], null, ['w', 'Breite', 1, 6, 1], ['h', 'Tiefe', 1, 6, 1], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    updraft:     [['fly', 'Flugtempo', 3, 12, 0.5], ['land', 'Wie weit er trägt', 2, 12, 0.5], ['minSpeed', 'Ab welchem Tempo', 1, 6, 0.1], null, ['w', 'Breite', 1, 8, 1], ['h', 'Tiefe', 1, 8, 1]],
    lightning:   [['period', 'Wie oft (Sekunden)', 2, 12, 0.5], ['warn', 'Vorwarnung', 0.3, 3, 0.1], null, ['strike', 'Wie lange der Schlag', 0.1, 1, 0.05], ['w', 'Breite', 1, 8, 0.5], ['h', 'Tiefe', 1, 8, 0.5], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    guillotine:  [['period', 'Wie oft (Sekunden)', 2, 12, 0.5], ['h', 'Länge', 1, 8, 0.5], null, ['hold', 'Wie lange unten', 0.1, 1, 0.05], ['w', 'Dicke', 0.2, 1.5, 0.05], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    trapdoor:    [['period', 'Wie oft (Sekunden)', 2, 12, 0.5], ['open', 'Wie lange offen', 0.1, 0.9, 0.05], null, ['w', 'Breite', 1, 5, 0.2], ['h', 'Tiefe', 1, 5, 0.2], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    eyetower:    [['range', 'Wie weit er sieht', 3, 14, 0.5], ['fov', 'Wie breit der Blick', 0.2, 1.4, 0.05], ['speed', 'Tempo der Drehung', 0.1, 1.2, 0.05], null, ['still', 'Wie lange man liegen darf', 0.4, 4, 0.1], ['phase', 'Versatz im Takt', 0, 6.2, 0.1]],
    switch:      [['duration', 'Wie lange offen', 4, 30, 1], ['r', 'Größe', 0.3, 1, 0.05]],

    liongate:    [],
    wandergate:  [['gap', 'Breite der Lücke', 0.8, 4, 0.1], null, ['t', 'Dicke der Mauer', 0.1, 0.6, 0.02], ['h', 'Höhe', 0.3, 1.5, 0.05]],
    firetower:   [['zw', 'Breite des Feldes', 2, 16, 1], ['zh', 'Tiefe des Feldes', 2, 16, 1], ['tempo', 'Tempo des Strahls', 0.4, 4, 0.1], null, ['breit', 'Breite des Strahls', 0.4, 3, 0.1], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    imperialbox: [['lw', 'Breite der Luke', 1, 6, 0.5], ['lh', 'Tiefe der Luke', 1, 6, 0.5], null, ['w', 'Breite der Loge', 2, 8, 0.2], ['h', 'Tiefe der Loge', 1, 5, 0.2]],

    gearfield:   [['wait', 'Wie lange es wartet', 0.5, 6, 0.25], ['travel', 'Wie lange die Fahrt dauert', 1, 8, 0.25], null, ['r', 'Größe der Räder', 0.5, 1.6, 0.05]],
    pendulum:    [['len', 'Länge', 1, 6, 0.1], ['amp', 'Wie weit es schwingt (Grad)', 10, 90, 5], null, ['w', 'Breite des Gewichts', 0.6, 2.5, 0.1], ['h', 'Tiefe des Gewichts', 0.6, 2.5, 0.1], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    springwork:  [['range', 'Wie weit es schießt', 3, 16, 0.5], ['amp', 'Wie weit es schwenkt', 0, 1.2, 0.05], ['speed', 'Tempo des Schwenks', 0.2, 2.5, 0.1], null, ['catchR', 'Wie groß das Maul ist', 0.4, 1.2, 0.05]],
    gearlift:    [['r', 'Größe', 0.8, 3, 0.1], ['wurf', 'Wie weit es setzt', 1, 6, 0.25], null, ['speed', 'Tempo', 0.2, 3, 0.05], ['fang', 'Ab welchem Tempo', 2, 12, 0.5], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    piston:      [['hub', 'Wie weit er ausfährt', 0.8, 5, 0.1], ['period', 'Wie oft (Sekunden)', 2, 10, 0.5], null, ['w', 'Breite', 0.6, 3, 0.1], ['h', 'Tiefe', 0.6, 3, 0.1], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    hand:        [['len', 'Länge', 1, 6, 0.1], ['speed', 'Tempo', -3, 3, 0.05], ['schub', 'Wie stark er schiebt', 0.5, 4, 0.1], null, ['fang', 'Reichweite', 2, 9, 0.25], ['phase', 'Versatz im Takt', 0, 6.2, 0.1]],
    escapement:  [['w', 'Breite', 1, 8, 0.5], null, ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    sweephand:   [['r', 'Größe', 2, 9, 0.25], null, ['thick', 'Dicke', 0.1, 0.6, 0.02], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    handclock:   [['r', 'Größe', 2, 9, 0.25], null, ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    dial:        [['r', 'Größe', 2, 9, 0.25], ['marken', 'Wie viele Marken', 3, 16, 1], null, ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    wanderloch:  [['r', 'Größe', 2, 9, 0.25], ['marken', 'Wie viele Marken', 3, 16, 1], null, ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    copperpipe:  [],

    windfahne:   [['kraft', 'Wie stark der Wind', 1, 12, 0.25], null, ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    lawine:      [['w', 'Breite', 2, 16, 1], ['h', 'Tiefe', 2, 16, 1], null, ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    seilbahn:    [['wait', 'Wie lange sie wartet', 0.5, 6, 0.25], ['travel', 'Wie lange die Fahrt dauert', 1, 8, 0.25], null, ['w', 'Breite', 0.6, 2.5, 0.1], ['h', 'Tiefe', 0.6, 2.5, 0.1]],
    schneebruecke: [['w', 'Breite', 1, 6, 1], ['h', 'Tiefe', 1, 6, 1]],

    sprengladung: [['weite', 'Reichweite', 1.5, 6, 0.1], ['kraft', 'Wie stark', 15, 70, 1], null, ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    kippbuehne:  [['w', 'Länge', 2, 8, 0.5], ['h', 'Breite', 0.8, 3, 0.1]],
    bruchwand:   [['w', 'Breite', 1, 6, 0.5], ['h', 'Tiefe', 1, 6, 0.5], null, ['weite', 'Ab welcher Nähe sie bricht', 1.5, 6, 0.1]],
    grubenlampe: [['r', 'Wie weit sie leuchtet', 1.5, 7, 0.25]],
    lavafontaene: [['takt', 'Wie oft (Sekunden)', 1, 8, 0.25], ['hoehe', 'Wie hoch', 1.5, 6, 0.1], null, ['r', 'Größe', 0.4, 2, 0.05], ['oben', 'Wie lange oben', 0.2, 2, 0.05], ['droht', 'Vorwarnung', 0.2, 2, 0.05], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    giessloeffel: [['takt', 'Wie oft (Sekunden)', 1.5, 8, 0.25], ['glut', 'Wie lange es glüht', 0.4, 3, 0.1], null, ['kipp', 'Vorwarnung', 0.3, 2, 0.05], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],

    flut:        [['w', 'Breite', 3, 16, 1], ['h', 'Tiefe', 3, 16, 1], ['max', 'Wie tief es wird', 1, 4, 1], null, ['takt', 'Sekunden je Stufe', 0.4, 3, 0.1], ['halt', 'Wie lange es voll steht', 0.3, 4, 0.1], ['leer', 'Wie lange es leer steht', 1, 10, 0.5], ['start', 'Wann es losgeht', 0, 8, 0.5]],
    pumpwerk:    [['dauer', 'Wie lange es pumpt', 2, 8, 0.25], ['r', 'Größe', 0.4, 1.5, 0.05], null, ['stufen', 'Wie viele Stufen', 1, 9, 1]],
    stroemung:   [['kraft', 'Wie stark', 4, 20, 0.5], ['tempo', 'Höchsttempo', 3, 14, 0.5], ['w', 'Breite', 2, 16, 1], ['h', 'Tiefe', 2, 16, 1], null, ['puls', 'Dünung (0 = gleichmäßig)', 0, 2, 0.05], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    strudel:     [['r', 'Größe', 1, 5, 0.1], ['kraft', 'Wie stark', 3, 16, 0.5]],
    tangwald:    [['w', 'Breite', 2, 14, 1], ['h', 'Tiefe', 2, 14, 1], ['gasse', 'Breite der Gasse', 0.15, 0.7, 0.02], null, ['bremse', 'Wie stark er bremst', 0.005, 0.08, 0.005], ['takt', 'Wie oft (Sekunden)', 1, 8, 0.2], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    angler:      [['tempo', 'Wie schnell er schwimmt', 0.8, 5, 0.1], ['r', 'Wie nah er kommen muß', 0.4, 1.2, 0.02], null, ['licht', 'Wie weit seine Laterne trägt', 1.5, 7, 0.2], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    muschel:     [['takt', 'Wie oft (Sekunden)', 2, 10, 0.25], ['offen', 'Wie lange offen', 0.15, 0.8, 0.05], ['tempo', 'Wie stark sie ausspuckt', 4, 14, 0.5], null, ['r', 'Größe', 0.6, 2, 0.05], ['halt', 'Wie lange sie hält', 0.3, 3, 0.1], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    raucher:     [['weite', 'Wie weit er wirft', 2, 10, 0.25], ['takt', 'Wie oft (Sekunden)', 2, 10, 0.25], ['sog', 'Wie weit er anzieht', 0, 5, 0.1], null, ['tempo', 'Flugtempo', 4, 12, 0.25], ['warn', 'Vorwarnung', 0.3, 3, 0.1], ['r', 'Größe', 0.6, 2, 0.05], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    ankerkette:  [['len', 'Länge', 1.5, 7, 0.1], ['amp', 'Wie weit sie schwingt (Grad)', 10, 90, 5], ['takt', 'Wie oft (Sekunden)', 2, 10, 0.2], null, ['w', 'Breite des Ankers', 0.6, 3, 0.1], ['h', 'Tiefe des Ankers', 0.6, 3, 0.1], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    wracktor:    [['len', 'Länge des Blattes', 1, 5, 0.1], ['takt', 'Wie oft (Sekunden)', 2, 12, 0.25], ['amp', 'Wie weit es aufgeht (Grad)', 20, 110, 5], null, ['dick', 'Dicke', 0.1, 0.6, 0.02], ['phase', 'Versatz im Takt', 0, 0.95, 0.05]],
    abflussrohr: [],
  };

  /* ---------- Aussehen ----------
     Fünfundvierzig Ausstattungen in einer Liste sind nicht zu überblicken; nach Welt gruppiert
     findet man die gesuchte in zwei Sekunden. Die Reihenfolge ist die der Weltkarte. */
  const THEMEN = [
    ['Märchenland', [['meadow', 'Elfenwiese'], ['mushroom', 'Pilzhain'], ['forge', 'Zwergenschmiede'], ['forest', 'Zauberwald'], ['dragon', 'Drachenhöhle'], ['ice', 'Eisgrotte'], ['sky', 'Wolkenburg'], ['clockwork', 'Uhrwerk'], ['witch', 'Hexenwald'], ['hut', 'Hexenhütte'], ['castle', 'Burgberg']]],
    ['Meereswelt', [['reef', 'Korallenriff'], ['harbor', 'Piratenbucht'], ['deck', 'Piratendeck'], ['wreck', 'Schiffswrack'], ['belly', 'Haimagen']]],
    ['Heiße Welten', [['volcano', 'Vulkan'], ['desert', 'Wüste'], ['palace', 'Wüstenpalast'], ['tomb', 'Grabkammer'], ['jungle', 'Dschungel'], ['temple', 'Tempelhalle']]],
    ['Sturm & Schatten', [['storm', 'Sturmhimmel'], ['fortress', 'Sturmfestung'], ['cloud', 'Wolkenmeer'], ['shadow', 'Schattenreich'], ['darksea', 'Totensee'], ['ghostship', 'Totenschiff'], ['throne', 'Thronsaal']]],
    ['Kolosseum', [['colosseum', 'Arena']]],
    ['Uhrwerkstadt', [['clocktown', 'Gassen der Stadt'], ['boiler', 'Kesselhaus'], ['escapement', 'Turmkammer']]],
    ['Schneeberg', [['snowfoot', 'Bergfuß'], ['snowrock', 'Felsstufe'], ['glacier', 'Gletscher'], ['summit', 'Gipfel']]],
    ['Zwergenmine', [['mundloch', 'Mundloch'], ['stollen', 'Stollen'], ['kristall', 'Kristallkammer'], ['schmelze', 'Schmelze']]],
    ['Die Flut', [['wasserlinie', 'Wasserlinie'], ['flachwasser', 'Flachwasser'], ['daemmerzone', 'Dämmerzone'], ['meeresgrund', 'Meeresgrund']]],
  ];
  const THEMA_NAME = {};
  for (const [, liste] of THEMEN) for (const [k, n] of liste) THEMA_NAME[k] = n;

  /* Ein Satz je Werkzeug. Er steht immer in der Zeile über den Knöpfen – wer nicht weiß, was ein
     Werkzeug tut, soll es nicht ausprobieren müssen. */
  const HINWEIS = {
    malen: 'Ziehen malt den gewählten Boden.',
    fuellen: 'Tippen füllt die ganze zusammenhängende Fläche.',
    rechteck: 'Von einer Ecke zur anderen ziehen.',
    linie: 'Von Anfang zu Ende ziehen – waagerecht, senkrecht oder diagonal.',
    pipette: 'Tippen übernimmt den Boden, der dort liegt.',
    T: 'Tippen setzt den Abschlag. Es gibt genau einen.',
    H: 'Tippen setzt das Loch. Es gibt genau eines.',
    'h+': 'Ziehen hebt den Boden um eine Stufe. Der Ball rollt Hänge hinunter.',
    'h-': 'Ziehen senkt den Boden um eine Stufe.',
    h0: 'Ziehen setzt den Boden wieder auf ebene Höhe.',
    pan: 'Ziehen verschiebt die Ansicht.',
  };

  const ed = {
    def: null, tiles: [], heights: [], tool: '#', form: 'malen', obj: 'bumper',
    gruppe: 'boden', pending: null, hover: null, panX: 0, panY: 0, drag: null,
    panel: null, blatt: null, collapsed: false, view: 'top',
    sel: -1, verlauf: [], zukunft: [], vorStrich: null,
  };

  /* ---------- Rückgängig ----------
     Gemerkt wird der ganze bearbeitbare Zustand als Text: Karte, Höhen, Hindernisse. Das ist
     großzügig, aber eine Bahn ist ein paar Kilobyte groß – dafür kann nichts halb zurückgehen.
     Ein Strich mit dem Finger ist EIN Schritt, nicht sechzig: darum wird beim Aufsetzen gemerkt
     und beim Loslassen abgelegt, und nur dann, wenn sich wirklich etwas geändert hat. */
  const SCHRITTE_MAX = 80;
  const stand = () => JSON.stringify([ed.tiles, ed.heights, ed.def.obstacles]);
  function ablegen(vorher) {
    if (vorher == null || vorher === stand()) return;
    ed.verlauf.push(vorher);
    if (ed.verlauf.length > SCHRITTE_MAX) ed.verlauf.shift();
    ed.zukunft.length = 0;
    syncLeiste();
  }
  /* Für alles, was nicht am Finger hängt: Regler, Knöpfe, Größe ändern. */
  function aenderung(fn) { const vorher = stand(); fn(); ablegen(vorher); }
  function setzeStand(s) {
    const [t, h, o] = JSON.parse(s);
    ed.tiles = t; ed.heights = h; ed.def.obstacles = o;
    ed.sel = -1; ed.pending = null;
    rebuild(); blattZu(); syncPanel();
  }
  function zurueck() {
    if (!ed.verlauf.length) { showMessage('Nichts mehr zurückzunehmen', 900); return; }
    ed.zukunft.push(stand()); setzeStand(ed.verlauf.pop());
  }
  function wieder() {
    if (!ed.zukunft.length) { showMessage('Nichts mehr zu wiederholen', 900); return; }
    ed.verlauf.push(stand()); setzeStand(ed.zukunft.pop());
  }

  /* ---------- Speicher ---------- */
  function loadCustoms() { try { const v = JSON.parse(localStorage.getItem(KEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveCustoms(list) { try { localStorage.setItem(KEY, JSON.stringify(list)); return true; } catch (e) { return false; } }
  function cleanDef(def) { const d = JSON.parse(JSON.stringify(def)); delete d.editing; return d; }
  function persist() {
    const list = loadCustoms(), d = cleanDef(ed.def), i = list.findIndex(c => c.id === d.id);
    if (i >= 0) list[i] = d; else list.push(d);
    if (!saveCustoms(list)) showMessage('Speichern nicht möglich (kein Browserspeicher)', 1800);
    return list;
  }
  function newDef() {
    const W = 20, H = 12, rows = [];
    for (let y = 0; y < H; y++) { let r = ''; for (let x = 0; x < W; x++) r += (x >= 2 && x <= 17 && y >= 4 && y <= 7) ? '#' : '.'; rows.push(r); }
    rows[5] = rows[5].slice(0, 3) + 'T' + rows[5].slice(4); rows[6] = rows[6].slice(0, 16) + 'H' + rows[6].slice(17);
    return { id: Date.now(), name: 'Meine Bahn', par: 3, theme: 'meadow', maxStrokes: 20, intro: 'Eine selbstgebaute Bahn.', map: rows, obstacles: [], decor: [], autoDecor: { density: 0.3, seed: (Date.now() % 977) + 1 } };
  }

  /* ---------- Öffnen / Aufbau ---------- */
  function open(def) {
    ed.def = def ? JSON.parse(JSON.stringify(def)) : newDef();
    if (!ed.def.id) ed.def.id = Date.now();
    ed.def.decor = ed.def.decor || []; ed.def.obstacles = ed.def.obstacles || []; ed.def.autoDecor = ed.def.autoDecor || { density: 0.3, seed: 7 };
    ed.tiles = ed.def.map.map(r => r.split(''));
    const W = Math.max(...ed.tiles.map(r => r.length)); for (const r of ed.tiles) while (r.length < W) r.push('.');
    // Höhenraster: eine Ziffer je Kachel, 0 = ebener Boden. Es liegt genau über der Karte.
    ed.heights = ed.tiles.map((row, y) => row.map((c, x) => {
      const ch = ed.def.heights && ed.def.heights[y] && ed.def.heights[y][x];
      return (ch >= '0' && ch <= '9') ? +ch : 0;
    }));
    ed.pending = null; ed.hover = null; ed.panX = 0; ed.panY = 0; ed.drag = null;
    ed.sel = -1; ed.verlauf.length = 0; ed.zukunft.length = 0; ed.vorStrich = null;
    state.phase = 'edit'; state.mode = 'creative'; state.ball = null; state.aim = null; state.particles = []; state.editorReturn = false;
    state.camTheta = ed.view === 'top' ? 0 : Math.PI / 4; state.zoomFactor = 1;
    document.body.classList.remove('title', 'testing'); document.body.classList.add('creative', 'editing');
    deps.hideOverlay();
    rebuild();
    buildPanel(); blattZu(); syncPanel();
    R.target = cameraTarget(); R.snapCamera();
  }
  const hatHoehen = () => ed.heights && ed.heights.some(r => r.some(v => v > 0));
  function rebuild() {
    ed.def.map = ed.tiles.map(r => r.join(''));
    // Nur wenn wirklich Stufen gemalt sind, kommt das Raster in die Bahn – sonst bleibt sie schlank
    if (hatHoehen()) { ed.def.heights = ed.heights.map(r => r.join('')); ed.def.hStep = ed.def.hStep || 0.5; }
    else { delete ed.def.heights; delete ed.def.hStep; }
    ed.def.editing = true;
    state.level = buildLevel(ed.def); state.theme = themaFuer(ed.def);
    R.setLevel(state.level, state.theme);
  }
  /* Kamera: Draufsicht (Norden oben, quadratische Kacheln, nur ein Hauch Höhe) oder Schrägsicht.
     Die Leiste sitzt unten, also wird die Karte über ihr zentriert – nicht mehr links neben einer
     Spalte. Auf dem iPad bleibt die Bahn dadurch in voller Breite stehen. */
  function cameraTarget() {
    const lv = state.level;
    const unten = ed.panel && !ed.collapsed ? ed.panel.offsetHeight : 0;
    const availW = R.w - 30, availH = Math.max(120, R.h - 76 - unten - 14);
    if (ed.view === 'top') {
      const zoom = Math.min(availW / (lv.W + 1.5), availH / (lv.H + 1.5)) * state.zoomFactor;
      return { fx: lv.W / 2 + ed.panX, fy: lv.H / 2 + ed.panY, th: state.camTheta, zoom, tilt: 1, zf: 0.12, cx: 15 + availW / 2, cy: 76 + availH / 2 };
    }
    const o = R.overviewTarget();
    const span = (lv.W + lv.H + 4) * Math.SQRT1_2, zoom = Math.min(availW / span, availH / (span * R.tilt + 3)) * state.zoomFactor;
    return Object.assign(o, { th: state.camTheta, zoom, fx: o.fx + ed.panX, fy: o.fy + ed.panY, cx: 15 + availW / 2, cy: 76 + availH / 2 + zoom * 0.8, zf: CAM_ZF });
  }
  function setView(v) { ed.view = v; state.camTheta = v === 'top' ? 0 : Math.PI / 4; ed.panX = 0; ed.panY = 0; state.zoomFactor = 1; syncPanel(); }

  /* ---------- Boden malen ---------- */
  const W = () => ed.tiles[0].length, H = () => ed.tiles.length;
  const drin = (x, y) => x >= 0 && y >= 0 && x < W() && y < H();
  const istHoehe = t => t === 'h+' || t === 'h-' || t === 'h0';

  function setzeKachel(tx, ty) {
    if (!drin(tx, ty)) return false;
    const t = ed.tool;
    if (istHoehe(t)) {
      const alt = ed.heights[ty][tx];
      const neu = t === 'h0' ? 0 : Math.max(0, Math.min(9, alt + (t === 'h+' ? 1 : -1)));
      if (neu === alt) return false;
      ed.heights[ty][tx] = neu; return true;
    }
    // Abschlag und Loch gibt es je genau einmal – das alte wird zu Rasen
    if (t === 'T' || t === 'H') { for (const r of ed.tiles) for (let x = 0; x < r.length; x++) if (r[x] === t) r[x] = '#'; }
    else if (ed.tiles[ty][tx] === t) return false;
    ed.tiles[ty][tx] = t; return true;
  }
  function malen(tx, ty) { if (setzeKachel(tx, ty)) rebuild(); }

  /* Farbeimer: alles, was vom angetippten Feld aus zusammenhängt und dasselbe Zeichen trägt.
     Abschlag und Loch sind davon ausgenommen – sie gibt es nur einmal, ein Eimer voll davon
     ergäbe keinen Sinn. */
  function fuellen(tx, ty) {
    if (!drin(tx, ty) || ed.tool === 'T' || ed.tool === 'H') return;
    if (istHoehe(ed.tool)) { hoeheFuellen(tx, ty); return; }
    const alt = ed.tiles[ty][tx], neu = ed.tool;
    if (alt === neu) return;
    const rand = [[tx, ty]];
    while (rand.length) {
      const [x, y] = rand.pop();
      if (!drin(x, y) || ed.tiles[y][x] !== alt) continue;
      ed.tiles[y][x] = neu;
      rand.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    rebuild();
  }
  /* Derselbe Eimer für Stufen: alles mit derselben Stufe, das zusammenhängt, geht eine hoch oder runter. */
  function hoeheFuellen(tx, ty) {
    const alt = ed.heights[ty][tx];
    const neu = ed.tool === 'h0' ? 0 : Math.max(0, Math.min(9, alt + (ed.tool === 'h+' ? 1 : -1)));
    if (neu === alt) return;
    const rand = [[tx, ty]], fertig = new Set();
    while (rand.length) {
      const [x, y] = rand.pop(), k = y * 1000 + x;
      if (!drin(x, y) || fertig.has(k) || ed.heights[y][x] !== alt) continue;
      fertig.add(k); ed.heights[y][x] = neu;
      rand.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]);
    }
    rebuild();
  }
  /* Rechteck und Linie arbeiten beide auf der Liste der Felder, die drunterliegen – so ist die
     Vorschau beim Ziehen dieselbe Rechnung wie das, was am Ende gemalt wird. */
  function felderVon(a, b, form) {
    const aus = [];
    if (form === 'rechteck') {
      const x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]);
      const y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1]);
      for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) aus.push([x, y]);
      return aus;
    }
    // Linie: der Bresenham-Weg von a nach b
    let [x, y] = a; const [zx, zy] = b;
    const dx = Math.abs(zx - x), dy = -Math.abs(zy - y);
    const sx = x < zx ? 1 : -1, sy = y < zy ? 1 : -1;
    let f = dx + dy;
    for (let i = 0; i < 4000; i++) {
      aus.push([x, y]);
      if (x === zx && y === zy) break;
      const f2 = 2 * f;
      if (f2 >= dy) { f += dy; x += sx; }
      if (f2 <= dx) { f += dx; y += sy; }
    }
    return aus;
  }
  function formMalen(a, b, form) {
    let was = false;
    for (const [x, y] of felderVon(a, b, form)) if (setzeKachel(x, y)) was = true;
    if (was) rebuild();
  }
  /* Pipette: den Boden übernehmen, der dort liegt, und gleich wieder zum Malen zurück. */
  function pipette(tx, ty) {
    if (!drin(tx, ty)) return;
    const c = ed.tiles[ty][tx];
    if (c === 'T' || c === 'H') { showMessage('Abschlag und Loch lassen sich nicht aufnehmen', 1400); return; }
    ed.tool = c; ed.form = 'malen'; ed.gruppe = 'boden'; syncPanel();
    showMessage(`Boden „${(TILES.find(t => t[0] === c) || [, c])[1]}“ übernommen`, 1200);
  }

  function resize(w, h) {
    w = Math.max(6, Math.min(48, w | 0)); h = Math.max(6, Math.min(36, h | 0));
    const rows = [], hoehen = [];
    for (let y = 0; y < h; y++) {
      const src = ed.tiles[y] || [], hsrc = (ed.heights && ed.heights[y]) || [];
      const r = [], hr = [];
      for (let x = 0; x < w; x++) { r.push(src[x] || '.'); hr.push(hsrc[x] || 0); }
      rows.push(r); hoehen.push(hr);
    }
    ed.tiles = rows; ed.heights = hoehen; rebuild(); syncPanel();
  }

  /* ---------- Maschinen setzen ----------
     mid legt eine Maschine auf die Kachelmitte, half erlaubt halbe Kacheln (Bandenecken).
     Die Werte sind dieselben wie in den gebauten Welten – wer eine Maschine hinsetzt, soll sie
     gleich so erleben, wie er sie aus dem Spiel kennt, und erst dann daran drehen. */
  const mid = v => Math.floor(v) + 0.5, half = v => Math.round(v * 2) / 2;
  function makeObject(kind, wx, wy) {
    const x = mid(wx), y = mid(wy), tx = Math.floor(wx), ty = Math.floor(wy);
    switch (kind) {
      /* --- Grundausstattung --- */
      case 'bumper': return { type: 'bumper', x, y, r: 0.5, kick: 7.5 };
      case 'rotor': return { type: 'rotor', x, y, blades: 3, len: 1.5, speed: 1.5, thick: 0.16, phase: 0 };
      case 'windmill': return { type: 'windmill', x, y, axis: 'y', w: 3, depth: 1.2, gap: 0.8, speed: 1.2, blades: 4, phase: 0 };
      case 'gate': return { type: 'gate', x, y, w: 2, h: 0.3, period: 6, open: 0.5, axis: 'x', phase: 0 };
      case 'mover': return { type: 'mover', x0: x - 3, y0: y, x1: x + 3, y1: y, w: 1, h: 1, period: 7, phase: 0, style: 'cart' };
      case 'ferry': return { type: 'ferry', x0: x - 3, y0: y, x1: x + 3, y1: y, w: 1.1, h: 1.1, wait: 1.5, travel: 2.4, phase: 0, style: 'cart' };
      case 'rail': return { type: 'rail', y, x0: Math.max(0, tx - 3), x1: tx + 4 };
      case 'field': return { type: 'field', x: tx, y: ty, w: 2, h: 2, fx: 2.5, fy: 0, style: 'wind' };
      case 'ramp': return { type: 'ramp', x: tx, y: ty, w: 2, h: 2, angle: 0, minSpeed: 2.5, speed: 4.2, land: 1.7 };
      case 'boost': return { type: 'boost', x: tx, y: ty, w: 2, h: 2, angle: 0, acc: 28, max: 19 };
      case 'cannon': return { type: 'cannon', x, y, base: 0, amp: 0.5, speed: 0.9, range: 8, catchR: 0.6, loadTime: 0.7, flySpeed: 8, phase: 0 };
      case 'magnet': return { type: 'magnet', x, y, r: 3, strength: 8, slow: 0 };
      case 'turntable': return { type: 'turntable', x, y, r: 1.5, speed: 1.6, exit: 0, eject: 4.5 };
      case 'wave': return { type: 'wave', x0: x - 3, y0: y, x1: x + 3, y1: y, w: 0.6, h: 3, period: 6.5, push: 16, phase: 0 };
      case 'sharkjump': return { type: 'sharkjump', x, y, w: 3, h: 4, period: 3.6, jump: 0.4, phase: 0, axis: 'y', height: 1.6 };
      case 'potion': return { type: 'potion', x, y, duration: 12, scale: 0.55 };
      case 'cauldron': return { type: 'cauldron', x, y, r: 0.75, duration: 20, scale: 0.45, exit: 0, hold: 0.8, spit: 2.5 };

      /* --- Legende --- */
      case 'spikes': return { type: 'spikes', x: tx, y: ty, w: 1, h: 2, period: 4, up: 0.45, phase: 0 };
      case 'updraft': return { type: 'updraft', x: tx, y: ty, w: 2, h: 3, minSpeed: 2.5, land: 6, fly: 7 };
      case 'lightning': return { type: 'lightning', x, y, w: 2, h: 4, period: 4.5, phase: 0, warn: 1, strike: 0.35 };
      case 'guillotine': return { type: 'guillotine', x, y, w: 0.35, h: 2, period: 5, phase: 0, hold: 0.32 };
      case 'trapdoor': return { type: 'trapdoor', x, y, w: 1.4, h: 1.4, period: 5, open: 0.4, phase: 0 };
      case 'eyetower': return { type: 'eyetower', x, y, r: 1.1, range: 9, fov: 0.6, speed: 0.42, phase: 0, still: 1.6 };
      case 'switch': return { type: 'switch', x, y, r: 0.55, duration: 14, target: 'A' };

      /* --- Kolosseum --- */
      case 'firetower': return { type: 'firetower', x, y, r: 0.75, zx: Math.max(0, tx - 4), zy: ty + 1, zw: 8, zh: 4, tempo: 1.8, breit: 1.8, phase: 0 };
      case 'imperialbox': return { type: 'imperialbox', x, y, w: 3.4, h: 1.6, lx: tx - 1, ly: ty + 2, lw: 2, lh: 2, start: 'hoch' };

      /* --- Uhrwerk --- */
      case 'gearfield': return { type: 'gearfield', x0: x - 3, y0: y, x1: x + 3, y1: y, wait: 2.2, travel: 3.2, r: 0.9, zaehne: 10 };
      case 'pendulum': return { type: 'pendulum', x, y: Math.max(0.5, y - 3), len: 3, amp: 55, ruhe: 90, phase: 0, w: 1.2, h: 1.2 };
      case 'springwork': return { type: 'springwork', x, y, base: 0, amp: 0.45, speed: 0.9, range: 8, catchR: 0.7 };
      case 'gearlift': return { type: 'gearlift', x, y, r: 1.8, angle: 0, speed: 1.0472, zaehne: 8, phase: 0, wurf: 3, fang: 7 };
      case 'piston': return { type: 'piston', x, y, w: 1.2, h: 1.2, angle: 0, hub: 2.4, period: 4, phase: 0 };
      case 'hand': return { type: 'hand', x, y, len: 2.6, speed: 1.0472, schub: 1.5, phase: 0, fang: 5 };
      case 'escapement': return { type: 'escapement', x, y, w: 3, h: 0.45, phase: 0 };
      case 'sweephand': return { type: 'sweephand', x, y, r: 4.5, thick: 0.24, phase: 0 };
      case 'handclock': return { type: 'handclock', x, y, r: 5, phase: 0 };
      case 'dial': return { type: 'dial', x, y, r: 5, marken: 12, phase: 0 };
      case 'wanderloch': return { type: 'wanderloch', x, y, r: 4, marken: 6, phase: 0 };

      /* --- Schneeberg --- */
      case 'windfahne': return { type: 'windfahne', x, y, kraft: 3.2, phase: 0 };
      case 'lawine': return { type: 'lawine', x: Math.max(0, tx - 2), y: ty, w: 6, h: 3, angle: 0, phase: 0 };
      case 'schneebruecke': return { type: 'schneebruecke', x: tx, y: ty, w: 2, h: 2 };

      /* --- Zwergenmine --- */
      case 'sprengladung': return { type: 'sprengladung', x, y, weite: 3.2, kraft: 46, phase: 0, angle: 0 };
      case 'kippbuehne': return { type: 'kippbuehne', x: Math.max(0, tx - 2), y: ty, w: 4, h: 1.4, angle: 0 };
      case 'bruchwand': return { type: 'bruchwand', x, y, w: 2, h: 2, weite: 3.6 };
      case 'grubenlampe': return { type: 'grubenlampe', x, y, r: 3.4 };
      case 'lavafontaene': return { type: 'lavafontaene', x, y, r: 0.8, takt: 2.1, hoehe: 3.4, oben: 0.55, droht: 0.5, phase: 0 };
      // Der Löffel gießt in eine Rinne; sie beginnt gleich neben der Pfanne und läuft nach rechts.
      case 'giessloeffel': return { type: 'giessloeffel', x, y, takt: 3, glut: 1, kipp: 0.8, phase: 0, rinne: { x: tx + 1, y: ty, len: 5, dx: 1, dy: 0 } };

      /* --- Die Flut --- */
      case 'flut': return { type: 'flut', x, y, w: 6, h: 6, max: 3, takt: 1.2, halt: 1, leer: 5, start: 2.5 };
      case 'pumpwerk': return { type: 'pumpwerk', x, y, r: 0.6, dauer: 4, stufen: 9 };
      case 'stroemung': return { type: 'stroemung', x, y, w: 4, h: 4, angle: 0, kraft: 13, tempo: 8.5, puls: 0, phase: 0 };
      case 'strudel': return { type: 'strudel', x, y, r: 2.4, kraft: 8, dreh: 1 };
      case 'tangwald': return { type: 'tangwald', x, y, w: 3, h: 6, takt: 3.4, gasse: 0.34, bremse: 0.03, phase: 0 };
      case 'muschel': return { type: 'muschel', x, y, r: 1.05, takt: 5.5, offen: 0.45, halt: 1, tempo: 9.5, angle: 0, phase: 0 };
      case 'raucher': return { type: 'raucher', x, y, r: 1, takt: 4.6, weite: 6, tempo: 7.5, sog: 2.4, warn: 1.3, angle: 0, phase: 0 };
      case 'ankerkette': return { type: 'ankerkette', x, y: Math.max(0.5, y - 4), len: 4, amp: 48, ruhe: 90, takt: 5.2, w: 1.5, h: 1.5, phase: 0 };
      case 'wracktor': return { type: 'wracktor', x, y, len: 2.2, takt: 6, amp: 88, zuWinkel: 0, dick: 0.22, phase: 0 };
      default: return null;
    }
  }
  /* Die Maschinen mit zwei Plätzen. 'a' ist der erste Tipper, 'b' der zweite. */
  function makeStrecke(kind, a, b) {
    switch (kind) {
      case 'wall': return { type: 'wall', x0: a[0], y0: a[1], x1: b[0], y1: b[1], t: 0.22, h: 0.5 };
      case 'portal': return { type: 'portal', x: a[0], y: a[1], tx: b[0], ty: b[1], color: '#4fd0ff', twoWay: true };
      case 'angler': return { type: 'angler', x0: a[0], y0: a[1], x1: b[0], y1: b[1], tempo: 2.2, r: 0.62, licht: 3.6, phase: 0 };
      case 'wandergate': return { type: 'wandergate', x0: a[0], y0: a[1], x1: b[0], y1: b[1], gap: 1.7, t: 0.26, h: 0.75 };
      case 'seilbahn': return { type: 'seilbahn', x0: a[0], y0: a[1], x1: b[0], y1: b[1], w: 1.2, h: 1.2, wait: 2.6, travel: 3.4 };
      default: return null;
    }
  }

  /* ---------- Maschinen mit zwei Buchstaben ----------
     Löwentor, Kupferrohr und Abflußrohr merken sich ihre beiden Plätze nicht am Hindernis,
     sondern als Buchstaben in der Karte: der große ist der Einlauf, der kleine der Auslauf.
     Bisher ging das nur im Quelltext. Hier sucht der Baumodus den nächsten freien Buchstaben
     und setzt beide Felder selbst – wer die Maschine löscht, ist die Buchstaben auch wieder los. */
  const PAAR_BUCHSTABEN = ['A', 'B', 'C', 'D', 'E', 'F'];
  function freierBuchstabe() {
    const belegt = new Set();
    for (const r of ed.tiles) for (const c of r) belegt.add(c.toUpperCase());
    for (const o of ed.def.obstacles) if (o.pair) belegt.add(String(o.pair).toUpperCase());
    return PAAR_BUCHSTABEN.find(b => !belegt.has(b)) || null;
  }
  function setzeBuchstabe(tx, ty, c) { if (drin(tx, ty)) ed.tiles[ty][tx] = c; }
  function loescheBuchstaben(o) {
    if (!o || !o.pair) return;
    const gross = String(o.pair).toUpperCase(), klein = gross.toLowerCase();
    for (const r of ed.tiles) for (let x = 0; x < r.length; x++) if (r[x] === gross || r[x] === klein) r[x] = '#';
  }

  /* ---------- Greifpunkte ----------
     Woran man eine Maschine anfaßt. Maschinen mit zwei Enden haben drei: die beiden Enden – die
     sich einzeln ziehen lassen – und die Mitte, an der das Ganze wandert. */
  const NACH_ECKE = new Set(['field', 'ramp', 'boost', 'spikes', 'updraft', 'lawine', 'kippbuehne', 'schneebruecke']);
  const MIT_STRECKE = new Set(['mover', 'ferry', 'wave', 'gearfield', 'angler', 'wandergate', 'seilbahn']);
  function anchors(o) {
    if (NACH_ECKE.has(o.type)) return [[o.x + (o.w || 1) / 2, o.y + (o.h || 1) / 2]];
    if (MIT_STRECKE.has(o.type)) return [[o.x0, o.y0], [o.x1, o.y1], [(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2]];
    if (o.type === 'wall') return [[o.x0, o.y0], [o.x1, o.y1], [(o.x0 + o.x1) / 2, (o.y0 + o.y1) / 2]];
    if (o.type === 'rail') return o.x0 != null ? [[o.x0, o.y], [o.x1, o.y], [(o.x0 + o.x1) / 2, o.y]] : [[o.x, o.y0], [o.x, o.y1], [o.x, (o.y0 + o.y1) / 2]];
    if (o.type === 'portal') return [[o.x, o.y], [o.tx, o.ty]];
    if (o.type === 'firetower') return [[o.x, o.y], [o.zx + o.zw / 2, o.zy + o.zh / 2]];
    if (o.type === 'imperialbox') return [[o.x, o.y], [o.lx + o.lw / 2, o.ly + o.lh / 2]];
    if (o.type === 'giessloeffel' && o.rinne) return [[o.x, o.y], [o.rinne.x + 0.5, o.rinne.y + 0.5]];
    if (o.x == null) return [];
    return [[o.x, o.y]];
  }
  /* Welche Maschine liegt unter dem Finger, und an welchem Greifpunkt? */
  function greif(wx, wy, weite = 0.85) {
    let best = -1, punkt = 0, bd = weite;
    ed.def.obstacles.forEach((o, i) => {
      anchors(o).forEach((p, k) => {
        const d = Math.hypot(p[0] - wx, p[1] - wy);
        if (d < bd) { bd = d; best = i; punkt = k; }
      });
    });
    return { i: best, punkt };
  }
  const nearest = (wx, wy) => greif(wx, wy, 1.1).i;

  /* ---------- Verschieben ----------
     Am mittleren Greifpunkt wandert die ganze Maschine, an einem Ende nur dieses Ende. Verschoben
     wird alles, was einen Ort beschreibt – auch die Zone des Feuerturms, die Luke der Kaiserloge
     und die Rinne des Gießlöffels, damit sie nicht zurückbleiben. */
  function verschiebe(o, dx, dy, punkt) {
    const zwei = MIT_STRECKE.has(o.type) || o.type === 'wall' || o.type === 'rail';
    if (zwei && punkt === 0) { if (o.x0 != null) { o.x0 += dx; } if (o.y0 != null) { o.y0 += dy; } if (o.type === 'rail' && o.x0 != null) o.y += dy; if (o.type === 'rail' && o.y0 != null) o.x += dx; return; }
    if (zwei && punkt === 1) { if (o.x1 != null) { o.x1 += dx; } if (o.y1 != null) { o.y1 += dy; } if (o.type === 'rail' && o.x0 != null) o.y += dy; if (o.type === 'rail' && o.y0 != null) o.x += dx; return; }
    if (o.type === 'portal' && punkt === 1) { o.tx += dx; o.ty += dy; return; }
    if (o.type === 'firetower' && punkt === 1) { o.zx += dx; o.zy += dy; return; }
    if (o.type === 'imperialbox' && punkt === 1) { o.lx += dx; o.ly += dy; return; }
    if (o.type === 'giessloeffel' && punkt === 1 && o.rinne) { o.rinne.x += dx; o.rinne.y += dy; return; }
    for (const k of ['x', 'y', 'x0', 'y0', 'x1', 'y1', 'tx', 'ty', 'zx', 'zy', 'lx', 'ly']) {
      if (o[k] == null) continue;
      if (k === 'x' || k === 'x0' || k === 'x1' || k === 'tx' || k === 'zx' || k === 'lx') o[k] += dx; else o[k] += dy;
    }
    if (o.rinne) { o.rinne.x += dx; o.rinne.y += dy; }
  }

  /* ---------- Drehen ----------
     Ein Knopf, der bei jeder Maschine das tut, was man erwartet: Richtung, Achse, Anziehen statt
     Abstoßen, oder – bei Kanone und Mühle – reihum auch das Aussehen. */
  function rotate(o) {
    const cyc = a => (a + 90) % 360;
    const kipp = () => { const cx = (o.x0 + o.x1) / 2, cy = (o.y0 + o.y1) / 2, L = Math.hypot(o.x1 - o.x0, o.y1 - o.y0) / 2;
      if (o.y0 === o.y1) { o.x0 = o.x1 = cx; o.y0 = cy - L; o.y1 = cy + L; } else { o.y0 = o.y1 = cy; o.x0 = cx - L; o.x1 = cx + L; } };
    const tausch = () => { const w = o.w; o.w = o.h; o.h = w; };
    switch (o.type) {
      case 'field': { const f = Math.hypot(o.fx, o.fy) || 2.5; const a = Math.atan2(o.fy, o.fx) + Math.PI / 2; o.fx = Math.round(Math.cos(a) * f * 100) / 100; o.fy = Math.round(Math.sin(a) * f * 100) / 100; break; }
      case 'ramp': case 'boost': case 'gearlift': case 'piston': case 'kippbuehne': case 'lawine':
      case 'sprengladung': case 'muschel': case 'raucher': case 'stroemung': o.angle = cyc(o.angle || 0); break;
      case 'gate': { tausch(); o.axis = o.axis === 'x' ? 'y' : 'x'; break; }
      /* Die Mühle dreht sich beim Tippen durch vier Zustände: quer, längs – und beides
         noch einmal als Wasserwand, der Gestalt, die sie in der Flut trägt. */
      case 'windmill':
        if (o.axis === 'x') { o.axis = 'y'; o.style = o.style === 'wasserwand' ? undefined : 'wasserwand'; }
        else o.axis = 'x';
        break;
      case 'mover': case 'ferry': case 'wave': case 'gearfield': case 'angler': case 'wandergate': case 'seilbahn': kipp(); break;
      case 'cannon': o.base = Math.round(((o.base || 0) + Math.PI / 2) * 1000) / 1000; if (o.base > Math.PI * 2 - 0.01) { o.base = 0; o.style = o.style === 'ballista' ? 'catapult' : o.style === 'catapult' ? 'wrackkanone' : o.style === 'wrackkanone' ? undefined : 'ballista'; } break;
      case 'magnet': o.strength = -o.strength; break;
      case 'turntable': case 'cauldron': o.exit = cyc(o.exit || 0); break;
      case 'rotor': case 'hand': o.speed = -o.speed; break;
      case 'strudel': o.dreh = -(o.dreh || 1); break;
      case 'portal': o.twoWay = !o.twoWay; break;
      case 'rail': { const L = (o.x0 != null ? (o.x1 - o.x0) : (o.y1 - o.y0)) / 2, cx = o.x0 != null ? (o.x0 + o.x1) / 2 : o.x, cy = o.y0 != null ? (o.y0 + o.y1) / 2 : o.y;
        if (o.x0 != null) { o.y0 = cy - L; o.y1 = cy + L; o.x = cx; delete o.x0; delete o.x1; }
        else { o.x0 = cx - L; o.x1 = cx + L; o.y = cy; delete o.y0; delete o.y1; } break; }
      case 'sharkjump': o.axis = o.axis === 'x' ? 'y' : 'x'; break;
      case 'spikes': case 'updraft': case 'lightning': case 'guillotine': case 'trapdoor':
      case 'escapement': case 'tangwald': case 'bruchwand': case 'schneebruecke': case 'flut': tausch(); break;
      case 'eyetower': o.phase = Math.round((((o.phase || 0) + Math.PI / 2) % (Math.PI * 2)) * 100) / 100; break;
      case 'switch': o.target = o.target === 'A' ? 'B' : 'A'; break;
      case 'imperialbox': { tausch(); const w = o.lw; o.lw = o.lh; o.lh = w; break; }
      case 'firetower': { const w = o.zw; o.zw = o.zh; o.zh = w; break; }
      case 'giessloeffel': if (o.rinne) { const dx = o.rinne.dx; o.rinne.dx = -o.rinne.dy; o.rinne.dy = dx; } break;
      case 'pendulum': case 'ankerkette': o.ruhe = cyc(o.ruhe == null ? 90 : o.ruhe); break;
      case 'wracktor': o.zuWinkel = cyc(o.zuWinkel || 0); break;
      case 'sweephand': case 'dial': case 'handclock': case 'wanderloch': o.phase = Math.round((((o.phase || 0) + 0.25) % 1) * 100) / 100; break;
      case 'springwork': o.base = Math.round((((o.base || 0) + Math.PI / 2) % (Math.PI * 2)) * 1000) / 1000; break;
      case 'liongate': case 'copperpipe': case 'abflussrohr': o.angle = cyc(o.angle || 0); break;
      default: return false;
    }
    return true;
  }

  /* ---------- Antippen ----------
     EIN Werkzeug für Maschinen, nicht vier. Tippen auf eine Maschine wählt sie aus und öffnet ihr
     Blatt, Ziehen verschiebt sie, Tippen daneben setzt eine neue. Drehen, Doppeln und Löschen
     stehen im Blatt – dort, wo man ohnehin gerade hinsieht. Vier Werkzeugknöpfe, zwischen denen
     man ständig hin und her springen mußte, sind damit weg. */
  function tap(wx, wy) {
    const kind = ed.obj;
    if (PAAR_MASCHINEN.has(kind)) { tapPaar(kind, wx, wy); return; }
    if (ZWEI_TIPPER.has(kind)) {
      const p = kind === 'wall' ? [half(wx), half(wy)] : [mid(wx), mid(wy)];
      if (!ed.pending) { ed.pending = { kind, p }; showMessage(zweiterTipp(kind), 1600); return; }
      const a = ed.pending.p; ed.pending = null;
      if (Math.hypot(a[0] - p[0], a[1] - p[1]) < 0.4) return;
      const o = makeStrecke(kind, a, p); if (!o) return;
      ed.def.obstacles.push(o); ed.sel = ed.def.obstacles.length - 1; rebuild(); syncPanel(); return;
    }
    const o = makeObject(kind, wx, wy); if (!o) return;
    ed.def.obstacles.push(o); ed.sel = ed.def.obstacles.length - 1; rebuild(); syncPanel();
  }
  const zweiterTipp = kind => kind === 'wall' ? 'Jetzt das Ende der Bande antippen'
    : kind === 'portal' ? 'Jetzt den Ausgang antippen'
    : kind === 'angler' ? 'Jetzt das andere Ende seiner Strecke antippen'
    : kind === 'liongate' ? 'Jetzt den Ausgang antippen – er darf nicht auf dem Weg liegen'
    : (kind === 'copperpipe' || kind === 'abflussrohr') ? 'Jetzt den Auslauf antippen'
    : 'Jetzt das andere Ende antippen';
  function tapPaar(kind, wx, wy) {
    const tx = Math.floor(wx), ty = Math.floor(wy);
    if (!drin(tx, ty)) return;
    if (!ed.pending) {
      const b = freierBuchstabe();
      if (!b) { showMessage('Mehr als sechs solcher Maschinen gehen nicht', 2000); return; }
      ed.pending = { kind, buchstabe: b, p: [tx + 0.5, ty + 0.5] };
      showMessage(zweiterTipp(kind), 1800); return;
    }
    const { buchstabe, p } = ed.pending; ed.pending = null;
    if (Math.floor(p[0]) === tx && Math.floor(p[1]) === ty) return;
    setzeBuchstabe(Math.floor(p[0]), Math.floor(p[1]), buchstabe);
    setzeBuchstabe(tx, ty, buchstabe.toLowerCase());
    ed.def.obstacles.push({ type: kind, pair: buchstabe, angle: 0 });
    ed.sel = ed.def.obstacles.length - 1; rebuild(); syncPanel();
  }
  function loesche(i) {
    const o = ed.def.obstacles[i]; if (!o) return;
    loescheBuchstaben(o);
    ed.def.obstacles.splice(i, 1);
    ed.sel = -1; rebuild(); blattZu(); syncPanel();
  }
  /* Doppeln: dieselbe Maschine eine Kachel weiter. Wer eine Reihe Stacheln bauen will, stellt
     eine ein und tippt dann dreimal auf Doppeln – das ist kürzer als dreimal alles neu. */
  function doppeln(i) {
    const o = ed.def.obstacles[i]; if (!o) return;
    if (o.pair) { showMessage('Diese Maschine läßt sich nicht doppeln – sie hängt an ihren beiden Feldern', 2400); return; }
    const k = JSON.parse(JSON.stringify(o));
    verschiebe(k, 1, 1, 2);
    ed.def.obstacles.push(k); ed.sel = ed.def.obstacles.length - 1;
    rebuild(); blattMaschine(); syncPanel();
  }

  /* ---------- Eingabe ---------- */
  function pointer(kind, e, px, py) {
    const [wx, wy] = R.screenToWorld(px, py), tx = Math.floor(wx), ty = Math.floor(wy);
    if (kind === 'down') {
      ed.vorStrich = stand();
      if (ed.tool === 'pan') { ed.drag = { mode: 'pan', start: [px, py], pan0: [ed.panX, ed.panY] }; return; }
      if (ed.tool === 'obj') {
        const g = greif(wx, wy);
        if (g.i >= 0) { ed.sel = g.i; ed.drag = { mode: 'zieh', i: g.i, punkt: g.punkt, von: [wx, wy], dx: 0, dy: 0, bewegt: false }; syncPanel(); return; }
        ed.drag = { mode: 'tap', start: [px, py] }; return;
      }
      if (ed.form === 'rechteck' || ed.form === 'linie') { ed.drag = { mode: 'form', a: [tx, ty], b: [tx, ty] }; return; }
      if (ed.form === 'fuellen' || ed.form === 'pipette') { ed.drag = { mode: 'tap', start: [px, py] }; return; }
      ed.drag = { mode: 'strich' }; malen(tx, ty);
      return;
    }
    if (kind === 'move') {
      ed.hover = [tx, ty];
      const d = ed.drag; if (!d) return;
      if (d.mode === 'pan') { const [dx, dy] = R.unprojDelta(px - d.start[0], py - d.start[1]); ed.panX = d.pan0[0] - dx; ed.panY = d.pan0[1] - dy; }
      else if (d.mode === 'strich') malen(tx, ty);
      else if (d.mode === 'form') { d.b = [tx, ty]; }
      else if (d.mode === 'zieh') {
        // auf halbe Kacheln einrasten: von Hand genau zu treffen ist auf dem iPad aussichtslos
        const sx = Math.round((wx - d.von[0]) * 2) / 2, sy = Math.round((wy - d.von[1]) * 2) / 2;
        if (sx !== d.dx || sy !== d.dy) {
          verschiebe(ed.def.obstacles[d.i], sx - d.dx, sy - d.dy, d.punkt);
          d.dx = sx; d.dy = sy; d.bewegt = true; rebuild();
        }
      }
      return;
    }
    // up / cancel
    const d = ed.drag; ed.drag = null;
    if (d && d.mode === 'form' && kind === 'up') formMalen(d.a, d.b, ed.form);
    else if (d && d.mode === 'tap' && kind === 'up' && Math.hypot(px - d.start[0], py - d.start[1]) < 12) {
      if (ed.tool === 'obj') tap(wx, wy);
      else if (ed.form === 'fuellen') fuellen(tx, ty);
      else if (ed.form === 'pipette') pipette(tx, ty);
    } else if (d && d.mode === 'zieh' && kind === 'up' && !d.bewegt) blattMaschine();
    ablegen(ed.vorStrich); ed.vorStrich = null;
  }

  /* ---------- Was über der Bahn liegt: Raster, Zeiger, Auswahl, Vorschau ---------- */
  function drawOverlay(ctx) {
    const lv = state.level; if (!lv) return;
    ctx.strokeStyle = 'rgba(255,255,255,0.18)'; ctx.lineWidth = 1;
    for (let x = 0; x <= lv.W; x++) { const a = R.proj(x, 0, 0.01), b = R.proj(x, lv.H, 0.01); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    for (let y = 0; y <= lv.H; y++) { const a = R.proj(0, y, 0.01), b = R.proj(lv.W, y, 0.01); ctx.beginPath(); ctx.moveTo(a[0], a[1]); ctx.lineTo(b[0], b[1]); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,220,120,0.9)'; ctx.lineWidth = 2; R.pathPoly(ctx, [[0, 0], [lv.W, 0], [lv.W, lv.H], [0, lv.H]], 0.01); ctx.stroke();

    // Vorschau von Rechteck und Linie: dieselbe Rechnung wie das Malen, nur eben noch nicht gemalt
    if (ed.drag && ed.drag.mode === 'form') {
      for (const [x, y] of felderVon(ed.drag.a, ed.drag.b, ed.form))
        if (drin(x, y)) R.fillPoly(ctx, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], 0.02, 'rgba(255,235,150,0.45)', false);
    } else if (ed.hover) {
      const [x, y] = ed.hover;
      if (drin(x, y)) R.fillPoly(ctx, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], 0.02, 'rgba(255,255,255,0.28)', false);
    }
    // Höhenstufen sichtbar machen: von oben sieht man sie sonst kaum. Je Kachel die Stufenzahl,
    // dazu eine Tönung – hell nach oben, dunkel nach unten.
    if (ed.heights && (hatHoehen() || istHoehe(ed.tool))) {
      ctx.save();
      ctx.font = 'bold 11px system-ui, sans-serif';
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (let y = 0; y < ed.heights.length; y++) for (let x = 0; x < ed.heights[y].length; x++) {
        const stufe = ed.heights[y][x];
        if (!stufe) continue;
        R.fillPoly(ctx, [[x, y], [x + 1, y], [x + 1, y + 1], [x, y + 1]], 0.03, `rgba(255,225,140,${Math.min(0.34, 0.09 * stufe)})`);
        const [sx, sy] = R.proj(x + 0.5, y + 0.5, 0.04);
        ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillText(String(stufe), sx + 1, sy + 1);
        ctx.fillStyle = '#ffe9a8'; ctx.fillText(String(stufe), sx, sy);
      }
      ctx.restore();
    }
    // Die gewählte Maschine: ein Ring um jeden Greifpunkt, damit man sieht, wo man anfassen kann
    const sel = ed.def && ed.def.obstacles[ed.sel];
    if (sel && ed.tool === 'obj') {
      ctx.save(); ctx.lineWidth = 2.5; ctx.strokeStyle = '#7ef0ff';
      anchors(sel).forEach((p, k) => {
        const [sx, sy] = R.proj(p[0], p[1], 0.06);
        ctx.beginPath(); ctx.arc(sx, sy, k === anchors(sel).length - 1 && anchors(sel).length > 1 ? 11 : 8, 0, Math.PI * 2); ctx.stroke();
      });
      ctx.restore();
    }
    if (ed.pending) { const [sx, sy] = R.proj(ed.pending.p[0], ed.pending.p[1], 0.05); ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(sx, sy, 7, 0, Math.PI * 2); ctx.fill(); }
  }

  /* ---------- Eigene Welt (Reihenfolge gespeicherter Bahnen) ---------- */
  const WKEY = speicherSchluessel('world');
  function loadWorld() { try { const v = JSON.parse(localStorage.getItem(WKEY) || '[]'); return Array.isArray(v) ? v : []; } catch (e) { return []; } }
  function saveWorld(ids) { try { localStorage.setItem(WKEY, JSON.stringify(ids)); } catch (e) { /* kein Speicher */ } }
  function worldCourses() { const list = loadCustoms(); return loadWorld().map(id => list.find(c => c.id === id)).filter(Boolean); }
  function showWorldDialog(insertId) {
    const list = loadCustoms(), ids = loadWorld().filter(id => list.some(c => c.id === id));
    // Bahnnamen können aus einem geteilten Code stammen – hier entschärft anzeigen
    const name = id => { const c = list.find(x => x.id === id); return c ? `${Text.esc(c.name)} (Par ${+c.par || 0})` : '?'; };
    const cur = insertId != null ? ids.indexOf(insertId) : -1;
    const rows = ids.map((id, i) => `<div class="wl-row ${id === insertId ? 'me' : ''}"><span class="wl-num">${i + 1}</span><span class="wl-name">${name(id)}</span>
      <button class="cbtn small wl-up" data-i="${i}" title="nach oben">${Icons.svg('arrow_upward')}</button><button class="cbtn small wl-down" data-i="${i}" title="nach unten">${Icons.svg('arrow_downward')}</button><button class="cbtn small wl-out" data-i="${i}" title="aus der Welt nehmen">${Icons.svg('close')}</button></div>`).join('');
    const slots = insertId != null && cur < 0 ? `<p>„${name(insertId)}“ einsetzen als Bahn:</p><div class="wl-slots">${Array.from({ length: ids.length + 1 }, (_, k) => `<span class="btn small wl-slot" data-k="${k}">${k + 1}</span>`).join('')}</div>` : '';
    const info = insertId != null && cur >= 0 ? `<p class="sub">„${name(insertId)}“ ist Bahn ${cur + 1} der Welt. Mit den Pfeilen verschieben.</p>` : '';
    deps.overlay(`<div class="panel wl">
      <h2>${Icons.svg('language')} Eigene Welt</h2>
      <div class="sub">${ids.length ? `${ids.length} Bahn${ids.length > 1 ? 'en' : ''} in der Reihenfolge, in der sie gespielt werden` : 'Noch keine Bahn in der Welt'}</div>
      <div class="wl-list">${rows || ''}</div>
      ${slots}${info}
      <p style="margin-top:12px"><span class="btn ghost small" id="wl-back">${Icons.svg('arrow_back')} Zurück zum Editor</span> ${ids.length ? `<span class="btn small" id="wl-play">${Icons.svg('play_arrow')} Welt spielen</span>` : ''}</p>
    </div>`);
    const rerender = () => showWorldDialog(insertId);
    ui().querySelectorAll('.wl-slot').forEach(b => b.addEventListener('click', () => { ids.splice(+b.dataset.k, 0, insertId); saveWorld(ids); showMessage('In die Eigene Welt eingesetzt', 1200); rerender(); }));
    ui().querySelectorAll('.wl-up').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i; if (i > 0) { [ids[i - 1], ids[i]] = [ids[i], ids[i - 1]]; saveWorld(ids); rerender(); } }));
    ui().querySelectorAll('.wl-down').forEach(b => b.addEventListener('click', () => { const i = +b.dataset.i; if (i < ids.length - 1) { [ids[i + 1], ids[i]] = [ids[i], ids[i + 1]]; saveWorld(ids); rerender(); } }));
    ui().querySelectorAll('.wl-out').forEach(b => b.addEventListener('click', () => { ids.splice(+b.dataset.i, 1); saveWorld(ids); rerender(); }));
    $('wl-back').addEventListener('click', () => { deps.hideOverlay(); syncPanel(); });
    if (ids.length) $('wl-play').addEventListener('click', () => { deps.hideOverlay(); leave(); deps.playWorld(worldCourses()); });
  }
  const ui = () => $('overlay');

  /* ---------- Das Blatt ----------
     Ein Blatt, das von unten aufgeht: Einstellungen einer Maschine, die Maschinenauswahl, die
     Angaben zur Bahn, das Speichern. Immer nur eines, immer über der Leiste, immer mit einem
     dicken Schließen-Knopf. Was nicht gerade gebraucht wird, ist weg. */
  function blattZu() { if (ed.blatt) { ed.blatt.hidden = true; ed.blatt.innerHTML = ''; } if (ed.panel) R.target = cameraTarget(); }
  function blattAuf(titel, inhalt, klasse) {
    if (!ed.blatt) { ed.blatt = document.createElement('div'); ed.blatt.id = 'editor-blatt'; document.body.appendChild(ed.blatt); }
    ed.blatt.className = klasse || '';
    ed.blatt.hidden = false;
    ed.blatt.innerHTML = `<div class="bl-kopf"><b>${titel}</b><button class="cbtn small" id="bl-zu">${Icons.svg('close')} Schließen</button></div><div class="bl-inhalt">${inhalt}</div>`;
    /* Das Blatt sitzt ÜBER der Leiste, nicht darauf. Sonst deckt es Rückgängig, Testen und Fertig
       zu – und genau die will man anfassen, während man an einer Maschine dreht. */
    const leiste = ed.panel && !ed.collapsed ? ed.panel.offsetHeight : 0;
    ed.blatt.style.bottom = leiste + 'px';
    ed.blatt.style.maxHeight = `calc(100vh - ${leiste + 70}px)`;
    $('bl-zu').addEventListener('click', blattZu);
  }

  /* Maschine aussuchen: nach Welt sortiert, mit einem Satz je Maschine und einem Suchfeld.
     Über sechzig Namen in einem Auswahlmenü findet niemand – mit Gruppen und Suche schon. */
  function blattWahl(filter) {
    const f = (filter || '').trim().toLowerCase();
    const gruppen = MASCHINEN.map(([welt, stuecke]) => {
      const treffer = stuecke.filter(([k, n, s]) => !f || n.toLowerCase().includes(f) || s.toLowerCase().includes(f) || welt.toLowerCase().includes(f));
      if (!treffer.length) return '';
      return `<div class="bl-welt">${welt}</div><div class="bl-karten">${treffer.map(([k, n, s]) =>
        `<button class="bl-karte ${k === ed.obj ? 'sel' : ''}" data-k="${k}"><b>${n}</b><span>${s}</span></button>`).join('')}</div>`;
    }).join('');
    blattAuf('Maschine aussuchen', `
      <input id="bl-suche" class="bl-suche" placeholder="Suchen … (z. B. Kanone, Wasser, Takt)" value="${Text.esc(filter || '')}">
      ${gruppen || '<div class="bl-leer">Nichts gefunden. Suchfeld leeren, dann stehen wieder alle da.</div>'}`, 'weit');
    const s = $('bl-suche');
    s.addEventListener('input', () => { const w = s.value; const pos = s.selectionStart; blattWahl(w); const n = $('bl-suche'); n.focus(); n.setSelectionRange(pos, pos); });
    s.addEventListener('keydown', e => e.stopPropagation());
    ed.blatt.querySelectorAll('.bl-karte').forEach(b => b.addEventListener('click', () => {
      ed.obj = b.dataset.k; ed.tool = 'obj'; ed.gruppe = 'maschinen'; ed.pending = null;
      blattZu(); syncPanel();
      showMessage(`${MASCHINE_NAME[ed.obj]}: ${MASCHINE_SATZ[ed.obj]}`, 2600);
    }));
  }

  /* Die Regler der gewählten Maschine. Zuerst nur die wenigen, die etwas ausmachen – der Rest
     liegt hinter „Mehr“. Jeder Regler wirkt sofort, damit man sieht statt zu rechnen. */
  function wertVon(o, k) {
    if (k === '@kraft') return Math.round(Math.hypot(o.fx || 0, o.fy || 0) * 100) / 100;
    return o[k];
  }
  function wertSetzen(o, k, v) {
    if (k === '@kraft') { const a = Math.atan2(o.fy || 0, o.fx || 0); o.fx = Math.round(Math.cos(a) * v * 100) / 100; o.fy = Math.round(Math.sin(a) * v * 100) / 100; return; }
    o[k] = v;
  }
  const zahl = v => String(Math.round(v * 100) / 100).replace('.', ',');
  function blattMaschine(mehr) {
    const o = ed.def.obstacles[ed.sel];
    if (!o) { blattZu(); return; }
    const liste = REGLER[o.type] || [];
    const schnitt = liste.indexOf(null);
    const oben = schnitt < 0 ? liste : liste.slice(0, schnitt);
    const unten = schnitt < 0 ? [] : liste.slice(schnitt + 1);
    const zeile = ([k, n, min, max, schritt]) => `<label class="bl-regler"><span class="bl-name">${n}</span>
      <input type="range" data-k="${k}" min="${min}" max="${max}" step="${schritt}" value="${wertVon(o, k)}">
      <output data-o="${k}">${zahl(wertVon(o, k))}</output></label>`;
    const nichts = !oben.length && !unten.length ? '<div class="bl-leer">An dieser Maschine gibt es nichts einzustellen – ihre Plätze bestimmen alles.</div>' : '';
    blattAuf(MASCHINE_NAME[o.type] || o.type, `
      <div class="bl-satz">${MASCHINE_SATZ[o.type] || ''}</div>
      ${nichts}${oben.map(zeile).join('')}
      ${unten.length ? (mehr ? unten.map(zeile).join('') + `<button class="cbtn small" id="bl-weniger">Weniger zeigen</button>`
                             : `<button class="cbtn small" id="bl-mehr">Mehr einstellen …</button>`) : ''}
      <div class="bl-knoepfe">
        <button class="cbtn small" id="bl-drehen">${Icons.svg('rotate_right')} Drehen</button>
        <button class="cbtn small" id="bl-doppeln">${Icons.svg('add')} Doppeln</button>
        <button class="cbtn small warn" id="bl-weg">${Icons.svg('close')} Löschen</button>
      </div>`);
    /* Der Stand vor dem Drehen. Er steht schon hier, nicht erst beim Aufsetzen des Fingers:
       Ein Schieber läßt sich auch mit den Pfeiltasten bewegen, und dann gäbe es kein Aufsetzen –
       der Schritt wäre verloren und Rückgängig spränge zu weit zurück. */
    let vorRegler = stand();
    ed.blatt.querySelectorAll('input[type=range]').forEach(r => {
      r.addEventListener('keydown', e => e.stopPropagation());
      r.addEventListener('input', () => {
        wertSetzen(o, r.dataset.k, +r.value);
        const aus = ed.blatt.querySelector(`output[data-o="${r.dataset.k}"]`); if (aus) aus.textContent = zahl(+r.value);
        rebuild();
      });
      // Erst wenn der Finger loslässt, wird ein Schritt daraus – sonst wären es hundert
      r.addEventListener('change', () => { ablegen(vorRegler); vorRegler = stand(); });
    });
    if ($('bl-mehr')) $('bl-mehr').addEventListener('click', () => blattMaschine(true));
    if ($('bl-weniger')) $('bl-weniger').addEventListener('click', () => blattMaschine(false));
    $('bl-drehen').addEventListener('click', () => aenderung(() => { if (rotate(o)) rebuild(); else showMessage('Diese Maschine läßt sich nicht drehen', 1200); }));
    $('bl-doppeln').addEventListener('click', () => aenderung(() => doppeln(ed.sel)));
    $('bl-weg').addEventListener('click', () => aenderung(() => loesche(ed.sel)));
  }

  /* Angaben zur Bahn: Name, Par, Aussehen, Größe. */
  function blattBahn() {
    const welten = THEMEN.map(([welt, liste]) =>
      `<optgroup label="${welt}">${liste.map(([k, n]) => `<option value="${k}"${k === ed.def.theme ? ' selected' : ''}>${n}</option>`).join('')}</optgroup>`).join('');
    blattAuf('Angaben zur Bahn', `
      <label class="bl-feld"><span class="bl-name">Name</span><input id="ed-name" maxlength="24" value="${Text.esc(ed.def.name)}"></label>
      <label class="bl-feld"><span class="bl-name">Par</span><input id="ed-par" type="number" min="1" max="12" value="${+ed.def.par || 3}"></label>
      <label class="bl-feld"><span class="bl-name">Aussehen</span><select id="ed-theme">${welten}</select></label>
      <label class="bl-feld"><span class="bl-name">Größe</span><span class="bl-groesse"><input id="ed-w" type="number" min="6" max="48" value="${W()}"> × <input id="ed-h" type="number" min="6" max="36" value="${H()}"><button class="cbtn small" id="ed-resize">Ändern</button></span></label>
      <div class="bl-satz">Breite × Höhe in Kacheln. Beim Verkleinern wird rechts und unten abgeschnitten – das läßt sich mit Rückgängig aber sofort wieder holen.</div>
      <label class="bl-feld"><span class="bl-name">Stufenhöhe</span><span class="bl-groesse"><button class="cbtn small" id="ed-hstep">flach</button><span class="bl-satz" style="margin:0">Wie hoch eine gemalte Höhenstufe ist.</span></span></label>`);
    for (const id of ['ed-name', 'ed-par', 'ed-w', 'ed-h']) $(id).addEventListener('keydown', e => e.stopPropagation());
    $('ed-name').addEventListener('input', e => { ed.def.name = Text.label(e.target.value) || 'Meine Bahn'; });
    $('ed-par').addEventListener('change', e => { ed.def.par = Math.max(1, Math.min(12, +e.target.value || 3)); });
    $('ed-theme').addEventListener('change', e => { ed.def.theme = e.target.value; rebuild(); });
    $('ed-resize').addEventListener('click', () => aenderung(() => resize(+$('ed-w').value, +$('ed-h').value)));
    const stufeName = v => v <= 0.3 ? 'flach' : v >= 0.8 ? 'steil' : 'mittel';
    $('ed-hstep').textContent = stufeName(ed.def.hStep || 0.5);
    $('ed-hstep').addEventListener('click', () => aenderung(() => {
      const stufen = [0.3, 0.5, 0.8], jetzt = ed.def.hStep || 0.5;
      ed.def.hStep = stufen[(stufen.indexOf(jetzt) + 1) % stufen.length] || 0.5;
      rebuild(); $('ed-hstep').textContent = stufeName(ed.def.hStep);
    }));
  }

  /* Speichern, laden, weitergeben. */
  function blattSpeichern() {
    const list = loadCustoms(), world = loadWorld();
    const opts = list.length
      ? list.map(c => `<option value="${c.id}"${c.id === ed.def.id ? ' selected' : ''}>${Text.esc(Text.label(c.name))} (Par ${+c.par || 0})${world.includes(c.id) ? ' · in Welt' : ''}</option>`).join('')
      : '<option value="">– noch keine –</option>';
    const geteilt = Share.istGeteilt(ed.def.id), gespeichert = list.some(c => c.id === ed.def.id);
    blattAuf('Speichern & weitergeben', `
      <div class="bl-knoepfe">
        <button class="cbtn small" id="ed-save">${Icons.svg('save')} Speichern</button>
        <button class="cbtn small" id="ed-new">${Icons.svg('add')} Neue Bahn</button>
        <button class="cbtn small" id="ed-world">${Icons.svg('language')} Eigene Welt</button>
      </div>
      <div class="bl-welt">Gespeicherte Bahnen</div>
      <select id="ed-list">${opts}</select>
      <div class="bl-knoepfe"><button class="cbtn small" id="ed-load">Laden</button><button class="cbtn small warn" id="ed-del">Löschen</button></div>
      <div class="bl-welt">Weitergeben</div>
      <div class="bl-knoepfe">
        <button class="cbtn small${geteilt ? ' sel' : ''}" id="ed-share">${Icons.svg('public')} ${geteilt ? 'Nicht mehr teilen' : 'Teilen'}</button>
        <button class="cbtn small" id="ed-link">${Icons.svg('language')} Link kopieren</button>
      </div>
      <div class="bl-satz" id="ed-share-hint">${!gespeichert ? 'Zum Teilen die Bahn erst speichern.' : geteilt ? 'Deine Freunde sehen diese Bahn in ihrer Liste.' : 'Teilen legt die Bahn für alle ab, die das Spiel haben.'}</div>
      <div class="bl-welt">Bahn-Code</div>
      <textarea id="ed-code" rows="3" spellcheck="false" placeholder="Code hier einfügen …"></textarea>
      <div class="bl-knoepfe"><button class="cbtn small" id="ed-export">Exportieren</button><button class="cbtn small" id="ed-import">Importieren</button></div>
      <div class="bl-knoepfe" style="margin-top:12px"><button class="cbtn small" id="ed-back">${Icons.svg('arrow_back')} Zurück zum Menü</button></div>`);
    $('ed-code').addEventListener('keydown', e => e.stopPropagation());
    $('ed-save').addEventListener('click', () => { persist(); blattSpeichern(); showMessage('Bahn gespeichert', 1200); });
    $('ed-new').addEventListener('click', () => open(null));
    $('ed-world').addEventListener('click', () => { blattZu(); showWorldDialog(null); });
    $('ed-back').addEventListener('click', () => { persist(); blattZu(); leave(); showWorldSelect(); });
    $('ed-load').addEventListener('click', () => { const id = +$('ed-list').value; const c = loadCustoms().find(x => x.id === id); if (c) open(c); });
    $('ed-del').addEventListener('click', () => { const id = +$('ed-list').value; saveCustoms(loadCustoms().filter(x => x.id !== id)); saveWorld(loadWorld().filter(x => x !== id)); blattSpeichern(); showMessage('Bahn gelöscht', 1000); });
    $('ed-export').addEventListener('click', () => { $('ed-code').value = JSON.stringify(cleanDef(ed.def)); $('ed-code').select(); showMessage('Code im Feld – markieren und kopieren', 1600); });
    $('ed-import').addEventListener('click', () => {
      let roh = null;
      try { roh = JSON.parse($('ed-code').value); } catch (e) { showMessage('Code nicht lesbar', 1400); return; }
      // Fremder Code geht durch dieselbe Prüfung wie Werkstatt und Link
      const bahn = Share.pruefe(roh);
      if (!bahn) { showMessage(Share.grund || 'Code nicht lesbar', 1800); return; }
      open(bahn); showMessage('Bahn übernommen', 1200);
    });
    /* Teilen: die gespeicherte Bahn den anderen anbieten oder wieder zurückziehen */
    $('ed-share').addEventListener('click', () => {
      if (!loadCustoms().some(c => c.id === ed.def.id)) { showMessage('Erst speichern, dann teilen', 1800); return; }
      const raus = Share.istGeteilt(ed.def.id)
        ? Share.ziehZurueck(ed.def.id, loadCustoms(), Best.name)
        : Share.teile(ed.def.id, loadCustoms(), Best.name);
      if (raus.voll) { showMessage(`Mehr als ${Share.EIGENE_MAX} Bahnen gehen nicht – erst eine zurückziehen`, 2400); return; }
      showMessage(Share.istGeteilt(ed.def.id) ? 'Geteilt – deine Freunde sehen die Bahn jetzt' : 'Nicht mehr geteilt', 2000);
      blattSpeichern();
    });
    /* Link: die aktuelle Bahn als Adresse in die Zwischenablage */
    $('ed-link').addEventListener('click', async () => {
      try {
        const link = await Share.link(ed.def);
        let kopiert = false;
        try { await navigator.clipboard.writeText(link); kopiert = true; } catch (e) { /* ohne Erlaubnis geht es nicht */ }
        if (!kopiert) { $('ed-code').value = link; showMessage('Link steht im Code-Feld – von dort kopieren', 2600); }
        else showMessage('Link kopiert – einfach verschicken', 2000);
      } catch (e) { showMessage('Der Link ließ sich nicht bauen', 1800); }
    });
  }

  /* ---------- Die Leiste ----------
     Oben die Hinweiszeile (immer ein Satz, was das gewählte Werkzeug tut), darunter die Knöpfe
     der offenen Gruppe, darunter die fünf Gruppen, ganz unten die Handgriffe, die man immer
     braucht. Mehr als diese drei Reihen soll nie dastehen. */
  const FARBE = { '#': '#7cc94f', s: '#e9d68f', i: '#c8ecff', w: '#3f8fd9', l: '#ff5a1f', x: '#8b889d', o: '#4d8a34', '.': '#2a2440' };
  const FORMEN = [['malen', 'Malen'], ['fuellen', 'Füllen'], ['rechteck', 'Rechteck'], ['linie', 'Linie'], ['pipette', 'Pipette']];
  function buildPanel() {
    if (ed.panel) return;
    const p = document.createElement('div'); p.id = 'editor-panel'; ed.panel = p; document.body.appendChild(p);
    p.innerHTML = `
      <div class="ed-hinweis" id="ed-hinweis"></div>
      <div class="ed-werkzeuge" id="ed-werkzeuge"></div>
      <div class="ed-gruppen">
        <button class="ed-gr" data-gr="boden">Boden</button>
        <button class="ed-gr" data-gr="ziel">Start &amp; Ziel</button>
        <button class="ed-gr" data-gr="maschinen">Maschinen</button>
        <button class="ed-gr" data-gr="hoehen">Höhen</button>
        <button class="ed-gr" data-gr="ansicht">Ansicht</button>
      </div>
      <div class="ed-bar">
        <button class="cbtn small" id="ed-undo" title="Rückgängig">${Icons.svg('rotate_left')}</button>
        <button class="cbtn small" id="ed-redo" title="Wiederholen">${Icons.svg('rotate_right')}</button>
        <button class="cbtn small" id="ed-bahn">Bahn</button>
        <button class="cbtn small" id="ed-speichern">${Icons.svg('save')} Speichern</button>
        <span class="ed-luecke"></span>
        <button class="cbtn small ed-go" id="ed-test">${Icons.svg('play_arrow')} Testen</button>
        <button class="cbtn small ed-done" id="ed-done">${Icons.svg('check')} Fertig</button>
        <button class="cbtn small" id="ed-collapse" title="Leiste ausblenden">${Icons.svg('chevron_right')}</button>
      </div>`;
    p.querySelectorAll('.ed-gr').forEach(b => b.addEventListener('click', () => { ed.gruppe = b.dataset.gr; waehleErstes(); syncPanel(); }));
    $('ed-undo').addEventListener('click', zurueck);
    $('ed-redo').addEventListener('click', wieder);
    $('ed-bahn').addEventListener('click', blattBahn);
    $('ed-speichern').addEventListener('click', blattSpeichern);
    $('ed-test').addEventListener('click', test);
    $('ed-done').addEventListener('click', () => { if (!hasTeeAndCup()) { showMessage('Erst Abschlag und Loch setzen', 1600); return; } persist(); blattZu(); showWorldDialog(ed.def.id); });
    $('ed-collapse').addEventListener('click', () => {
      ed.collapsed = !ed.collapsed;
      p.classList.toggle('collapsed', ed.collapsed);
      $('ed-collapse').innerHTML = ed.collapsed ? Icons.svg('construction') + ' Werkzeuge' : Icons.svg('chevron_right');
      if (ed.collapsed) blattZu();
      R.target = cameraTarget();
    });
  }
  /* Beim Gruppenwechsel gleich ein sinnvolles Werkzeug wählen – sonst malt man mit dem Werkzeug
     der letzten Gruppe weiter und wundert sich. */
  function waehleErstes() {
    ed.pending = null;
    if (ed.gruppe === 'boden' && !FARBE[ed.tool]) ed.tool = '#';
    if (ed.gruppe === 'ziel' && ed.tool !== 'T' && ed.tool !== 'H') ed.tool = 'T';
    if (ed.gruppe === 'maschinen') ed.tool = 'obj';
    if (ed.gruppe === 'hoehen' && !istHoehe(ed.tool)) ed.tool = 'h+';
    if (ed.gruppe === 'ansicht') ed.tool = 'pan';
  }
  function knopf(werkzeug, beschriftung, extra) {
    return `<button class="ed-wz${ed.tool === werkzeug ? ' sel' : ''}" data-wz="${werkzeug}">${extra || ''}${beschriftung}</button>`;
  }
  function syncPanel() {
    if (!ed.panel) return;
    ed.panel.querySelectorAll('.ed-gr').forEach(b => b.classList.toggle('sel', b.dataset.gr === ed.gruppe));
    const kasten = $('ed-werkzeuge');
    let html = '';
    if (ed.gruppe === 'boden') {
      html = TILES.map(([c, n]) => knopf(c, n, `<i style="background:${FARBE[c]}"></i>`)).join('')
        + '<span class="ed-trenner"></span>'
        + FORMEN.map(([f, n]) => `<button class="ed-wz form${ed.form === f ? ' sel' : ''}" data-form="${f}">${n}</button>`).join('');
    } else if (ed.gruppe === 'ziel') {
      html = knopf('T', 'Abschlag', Icons.svg('sports_golf')) + knopf('H', 'Loch', Icons.svg('golf_course'));
    } else if (ed.gruppe === 'maschinen') {
      const sel = ed.def.obstacles[ed.sel];
      html = `<button class="ed-wz gross sel" id="ed-wahl">${Icons.svg('construction')} ${MASCHINE_NAME[ed.obj] || ed.obj} · andere wählen …</button>`
        + (sel ? `<button class="ed-wz" id="ed-einstellen">${Icons.svg('settings')} ${MASCHINE_NAME[sel.type] || sel.type} einstellen</button>` : '')
        + `<span class="ed-trenner"></span><span class="ed-zahl">${ed.def.obstacles.length} auf der Bahn</span>`;
    } else if (ed.gruppe === 'hoehen') {
      html = knopf('h+', 'Höher', Icons.svg('arrow_upward')) + knopf('h-', 'Tiefer', Icons.svg('arrow_downward')) + knopf('h0', 'Stufe weg', Icons.svg('close'))
        + '<span class="ed-trenner"></span>'
        + FORMEN.filter(f => f[0] !== 'pipette').map(([f, n]) => `<button class="ed-wz form${ed.form === f ? ' sel' : ''}" data-form="${f}">${n}</button>`).join('');
    } else {
      html = `<button class="ed-wz" id="ed-view">${Icons.svg('map')} ${ed.view === 'top' ? 'Schrägsicht' : 'Draufsicht'}</button>`
        + knopf('pan', 'Verschieben', Icons.svg('open_with'))
        + `<button class="ed-wz" id="ed-naeher">${Icons.svg('zoom_in')} Näher</button><button class="ed-wz" id="ed-weiter">${Icons.svg('zoom_out')} Weiter weg</button>`
        + `<button class="ed-wz" id="ed-mitte">${Icons.svg('restart_alt')} Ganze Bahn</button>`;
    }
    kasten.innerHTML = html;
    kasten.querySelectorAll('[data-wz]').forEach(b => b.addEventListener('click', () => { ed.tool = b.dataset.wz; ed.pending = null; syncPanel(); }));
    kasten.querySelectorAll('[data-form]').forEach(b => b.addEventListener('click', () => { ed.form = b.dataset.form; syncPanel(); }));
    if ($('ed-wahl')) $('ed-wahl').addEventListener('click', () => blattWahl(''));
    if ($('ed-einstellen')) $('ed-einstellen').addEventListener('click', () => blattMaschine());
    if ($('ed-view')) $('ed-view').addEventListener('click', () => setView(ed.view === 'top' ? 'iso' : 'top'));
    if ($('ed-naeher')) $('ed-naeher').addEventListener('click', () => { state.zoomFactor = Math.min(4, state.zoomFactor * 1.25); });
    if ($('ed-weiter')) $('ed-weiter').addEventListener('click', () => { state.zoomFactor = Math.max(0.4, state.zoomFactor * 0.8); });
    if ($('ed-mitte')) $('ed-mitte').addEventListener('click', () => { state.zoomFactor = 1; ed.panX = 0; ed.panY = 0; });
    $('ed-hinweis').textContent = hinweisText();
    const k = loadWorld().indexOf(ed.def.id);
    $('ed-done').innerHTML = Icons.svg('check') + (k >= 0 ? ` Fertig · Bahn ${k + 1}` : ' Fertig');
    syncLeiste();
  }
  function hinweisText() {
    if (ed.pending) return zweiterTipp(ed.pending.kind);
    if (ed.tool === 'obj') {
      const sel = ed.def.obstacles[ed.sel];
      return sel ? `${MASCHINE_NAME[sel.type] || sel.type} ausgewählt. Ziehen verschiebt sie, Tippen öffnet ihre Einstellungen.`
        : `Tippen setzt ${MASCHINE_NAME[ed.obj] || ed.obj}. Tippen auf eine Maschine wählt sie aus, Ziehen verschiebt sie.`;
    }
    if (ed.tool === 'T' || ed.tool === 'H' || ed.tool === 'pan') return HINWEIS[ed.tool];
    if (istHoehe(ed.tool) && ed.form === 'malen') return HINWEIS[ed.tool];
    const boden = TILES.find(t => t[0] === ed.tool);
    const was = istHoehe(ed.tool) ? (ed.tool === 'h+' ? 'Höher' : ed.tool === 'h-' ? 'Tiefer' : 'Stufe weg') : boden ? boden[1] : '';
    return `${was}: ${HINWEIS[ed.form]}${boden && ed.form === 'malen' ? ' ' + boden[2] : ''}`;
  }
  function syncLeiste() {
    if (!ed.panel) return;
    const u = $('ed-undo'), r = $('ed-redo');
    if (u) u.classList.toggle('aus', !ed.verlauf.length);
    if (r) r.classList.toggle('aus', !ed.zukunft.length);
  }
  function leave() { state.phase = 'title'; document.body.classList.remove('editing'); document.body.classList.add('title'); blattZu(); }

  /* ---------- Testen ---------- */
  function hasTeeAndCup() { let t = false, h = false; for (const r of ed.tiles) for (const c of r) { if (c === 'T') t = true; if (c === 'H') h = true; } return t && h; }
  function test() {
    if (!hasTeeAndCup()) { showMessage('Erst Abschlag und Loch setzen', 1600); return; }
    persist(); blattZu();
    document.body.classList.remove('editing');
    startTest(cleanDef(ed.def));
  }
  function returnFromTest() { open(ed.def); }
  /* Eine fremde Bahn (aus einem Link oder von einem Freund) unter die eigenen legen */
  function uebernimm(def) {
    const list = loadCustoms();
    const kopie = Object.assign({}, def, { id: Date.now() + Math.floor(Math.random() * 1000) });
    delete kopie.von; delete kopie.quelle;
    list.push(kopie); saveCustoms(list);
    return kopie;
  }

  /* Tastatur: am Rechner ist Strg+Z das, wonach die Hand von selbst greift. Getippt wird nur,
     solange der Baumodus offen ist und gerade niemand in ein Textfeld schreibt. */
  window.addEventListener('keydown', e => {
    if (state.phase !== 'edit') return;
    const el = document.activeElement;
    if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT')) return;
    if ((e.ctrlKey || e.metaKey) && (e.key === 'z' || e.key === 'Z')) { e.preventDefault(); if (e.shiftKey) wieder(); else zurueck(); }
    else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || e.key === 'Y')) { e.preventDefault(); wieder(); }
    else if (e.key === 'Escape') { if (ed.pending) { ed.pending = null; syncPanel(); } else if (ed.blatt && !ed.blatt.hidden) blattZu(); }
  });

  /* Für die Prüfung (tools/baumodus.mjs): der Katalog und die Bauanleitungen. Damit läßt sich
     jede der über sechzig Maschinen einmal hinsetzen und nachsehen, ob sie eine gültige Bahn
     ergibt und ob jeder Regler auch wirklich einen Wert trifft, den es gibt. Ohne diesen Zugang
     müßte man dreiundsechzigmal von Hand tippen – und würde es darum nie tun. */
  const katalog = { MASCHINEN, REGLER, ZWEI_TIPPER, PAAR_MASCHINEN, makeObject, makeStrecke, anchors, rotate, wertVon };

  return { open, uebernimm, loadCustoms, worldCourses, cameraTarget, drawOverlay, pointer, returnFromTest, katalog, get active() { return state.phase === 'edit'; } };
};
