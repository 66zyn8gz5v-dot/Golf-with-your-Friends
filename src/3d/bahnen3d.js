/* Die Welt „Grasland" und ihre Bahnen.

   Eine Bahn besteht aus drei Angaben, und die sind mit Absicht so klein gehalten, dass man eine
   neue Bahn in zwanzig Minuten baut:

   1. **karte** – ein Feld Text, ein Zeichen ist ein Feld. Genau wie im 2,5D-Spiel, damit wer
      dort Bahnen gebaut hat, hier sofort weiterbauen kann.

        .  nichts – hier endet die Bahn, der Ball fällt in die Wiese (ein Schlag Strafe)
        #  Fairway, kurz geschnitten, rollt gut
        ,  Rough, hohes Gras, bremst spürbar
        s  Sand, bremst stark
        w  Wasser – Strafe, zurück an die letzte Stelle
        x  Fels – eine Wand, von der der Ball abprallt
        T  Abschlag (liegt auf Fairway)
        H  Loch (liegt auf Fairway)

   2. **gelaende** – die Höhe. NICHT als zweites Textfeld mit Ziffern, sondern als Grundhöhe plus
      eine Handvoll Hügel und Mulden: { x, z, r, h }. Der Unterschied ist größer, als er klingt.
      Ziffern geben Stufen, und Stufen muss man glätten; Hügel geben von sich aus eine weiche
      Landschaft, mit einem Gefälle, das sich an jeder Stelle genau ausrechnen lässt – und genau
      das braucht die Kugelrechnung, um sauber zu rollen. Sechs Zeilen ersetzen ein ganzes Feld
      voller Ziffern, und man sieht ihnen an, was sie tun.

   3. **deko und burg** – was herumsteht. Die Burg ist in allen drei Bahnen dieselbe, nur von
      einer anderen Seite: Die drei Bahnen liegen rings um den Burgberg, also steht die Burg
      einmal im Norden, einmal im Westen, einmal geradeaus voraus. Wer die Werte ändert, verschiebt
      die Bahn um den Berg herum.

   Der Maßstab: ein Feld ist eine Einheit, der Ball misst 0,22 – ungefähr so wie beim Minigolf,
   wo ein Ball gut ein Zehntel der Bahnbreite einnimmt. */
const BAHNEN3D = (() => {

  /* Die Hügel wirken über eine Glocke, die am Rand sauber auf null geht. Eine Glocke, die nie
     ganz endet, würde sich über alle Hügel aufsummieren und die ganze Bahn anheben – derselbe
     Grund, aus dem die Weltkarte im 2,5D-Spiel mit endlicher Reichweite rechnet. */
  const WIESE = {
    id: 'wiese',
    name: 'Grasland',
    unter: 'Die Wiesen um die Königsburg',
    marke: 'castle',
    farbe: '#ffd166',

    /* Licht und Luft dieser Welt. Ein hoher, warmer Vormittag – lange, weiche Schatten und ein
       Dunst, der die Ferne ins Blaue zieht, wie auf den gemalten Vorlagen. */
    licht: {
      sonne: [0.42, 0.66, 0.62],
      sonnenFarbe: [1.08, 1.00, 0.84],
      himmel: [0.40, 0.46, 0.56],
      boden: [0.19, 0.22, 0.15],
      nebelFarbe: [0.72, 0.85, 0.96],
      nebel: [26, 115],
      schatten: 0.58,
    },
    himmelOben: '#2f7fc8', himmelUnten: '#bfe3f5',

    bahnen: [
      /* ---------------- 1 ---------------- */
      {
        name: 'Burgwiese',
        par: 3,
        intro: 'Zum Warmwerden: eine offene Wiese unterhalb der Burg. Vier Felsnadeln lassen ein '
             + 'Tor in der Mitte frei – hindurch, oder in weitem Bogen außen herum.',
        karte: [
          '..........................',
          '....,,,,,,,,,,,,,,,,,,....',
          '..,,,,,,,,,,,,,,,,,,,,,,..',
          '..,,##################,,..',
          '..,,##################,,..',
          '..,,##T######x########,,..',
          '..,,#########x########,,..',
          '..,,##################,,..',
          '..,,##############H###,,..',
          '..,,#########x########,,..',
          '..,,#########x########,,..',
          '..,,##################,,..',
          '..,,,,,,,,,,,,,,,,,,,,,,..',
          '....,,,,,,,,,,,,,,,,,,....',
          '..........................',
        ],
        gelaende: {
          grund: 0,
          welle: 0.05,
          huegel: [
            { x: 12, z: 3, r: 7, h: 0.45 },        // Rücken im Norden, der zur Burg ansteigt
            { x: 18.5, z: 8.5, r: 3.8, h: -0.3 },  // Mulde vor dem Loch: der Ball läuft hinein
            { x: 7, z: 11, r: 4, h: 0.14 },
          ],
        },
        /* Die Burg steht so, dass sie vom Abschlag aus im Bild liegt: Gespielt wird nach Osten,
           also steht sie weit östlich und ein Stück nördlich – schräg voraus über dem Loch. */
        burg: { x: 31, z: -7, g: 1.35, berg: 5.4 },
        deko: [
          { t: 'muehle', x: -4.5, z: 5.5, g: 1.1 },
          { t: 'haus', x: -3.2, z: 10.4, g: 1.2, dreh: 0.5 },
          { t: 'haus', x: -5.6, z: 12.6, g: 0.95, dreh: -0.8 },
          { t: 'zaun', von: [-2.2, 9.2], nach: [-2.2, 14] },
        ],
        autoDeko: { saat: 11, dichte: 0.5 },
      },

      /* ---------------- 2 ---------------- */
      {
        name: 'Der Mühlbach',
        par: 4,
        intro: 'Der Mühlbach teilt die Wiese von oben bis unten. Genau zwischen Abschlag und Loch '
             + 'liegt die Furt, zwei Felder schmal – wer sie verfehlt, schwimmt.',
        karte: [
          '..........................',
          '....,,,,,,,wwww,,,,,,,,...',
          '...,,,,,,,,wwww,,,,,,,,,..',
          '..,,#######wwww#########,,',
          '..,,#######wwww#########,,',
          '..,,#######wwww#########,,',
          '..,,#######wwww#########,,',
          '..,,#T##################,,',
          '..,,###############H####,,',
          '..,,#######wwww#########,,',
          '..,,#######wwww#########,,',
          '..,,#######wwww#########,,',
          '...,,,,,,,,wwww,,,,,,,,,..',
          '....,,,,,,,wwww,,,,,,,,...',
        ],
        gelaende: {
          grund: 0.1,
          welle: 0.05,
          huegel: [
            { x: 24, z: 3, r: 8, h: 0.8 },       // die Wiese steigt nach Osten zur Burg an
            { x: 5, z: 11, r: 5, h: -0.12 },
            { x: 19.5, z: 8.5, r: 3, h: -0.3 },  // Kessel um das Loch
          ],
        },
        burg: { x: 34, z: 0, g: 1.3, berg: 5.6 },
        deko: [
          // Die Brücke steht über dem nördlichen Bach und ist Zier, kein Weg – gespielt wird
          // durch die Furt. Zwei Steinhaufen markieren deren Einfahrt.
          { t: 'bruecke', x: 12.5, z: 3.5 },
          { t: 'felsgruppe', x: 12.5, z: 6.3, g: 0.55 },
          { t: 'felsgruppe', x: 12.5, z: 9.7, g: 0.55 },
          { t: 'muehle', x: 8, z: -3.0, g: 1.05, dreh: 0.3 },
          { t: 'haus', x: 28, z: 11.5, g: 1.1, dreh: -0.4 },
          { t: 'zaun', von: [26, 9.5], nach: [30.5, 10.4] },
        ],
        autoDeko: { saat: 23, dichte: 0.5 },
      },

      /* ---------------- 3 ---------------- */
      {
        name: 'Zum Burgtor',
        par: 4,
        intro: 'Bergauf bis vor das Burgtor: drei Terrassen, vier Felsnadeln, drei Sandgruben. '
             + 'Oben liegt das Loch in einer Mulde.',
        karte: [
          '.......................',
          '.....,,,,,,,,,,,,,.....',
          '..,,,,,,,,,,,,,,,,,,,..',
          '..,,###############,,..',
          '..,,######H########,,..',
          '..,,###############,,..',
          '..,,##x#########x##,,..',
          '..,,##x###sss###x##,,..',
          '..,,######sss######,,..',
          '..,,###############,,..',
          '..,,##x#########x##,,..',
          '..,,##x#########x##,,..',
          '..,,###############,,..',
          '..,,####sss########,,..',
          '..,,####sss###T####,,..',
          '..,,###############,,..',
          '..,,,,,,,,,,,,,,,,,,,..',
          '.....,,,,,,,,,,,,,.....',
          '.......................',
        ],
        gelaende: {
          grund: 0,
          welle: 0.04,
          huegel: [
            /* Der Anstieg vom Abschlag (unten, großes z) zum Loch (oben, kleines z). Drei Glocken
               nacheinander geben die drei Terrassen: dazwischen wird es kurz flach, und dort
               bleibt ein zu schwacher Schlag liegen, statt wieder zurückzurollen. */
            { x: 10.5, z: 3, r: 10, h: 1.25 },
            { x: 10.5, z: 8, r: 5.5, h: 0.5 },
            { x: 10.5, z: 13, r: 5, h: 0.2 },
            { x: 10.5, z: 4.5, r: 2.6, h: -0.45 },   // die Mulde um das Loch
          ],
        },
        burg: { x: 10.5, z: -15, g: 1.4, berg: 4.6 },
        deko: [
          { t: 'mast', x: 5.0, z: 3.5, h: 1.5, farbe: '#b63a30' },
          { t: 'mast', x: 16.0, z: 3.5, h: 1.5, farbe: '#b63a30' },
          { t: 'felsgruppe', x: -1.5, z: 7, g: 1.1 },
          { t: 'felsgruppe', x: 24, z: 11, g: 0.9 },
          { t: 'haus', x: -3.0, z: 14.5, g: 1.1, dreh: 0.6 },
        ],
        autoDeko: { saat: 37, dichte: 0.45 },
      },
    ],
  };

  /* Alle Welten. Bis jetzt ist eine davon gebaut; die anderen stehen schon auf der Karte, damit
     man sieht, wohin die Reise geht – angeklickt sagen sie, dass sie noch nicht offen sind.
     Ein leerer Fleck auf der Karte erzählt nichts, ein verschlossenes Tor erzählt viel. */
  const WELTEN = [
    WIESE,
    { id: 'wald', name: 'Flüsterwald', unter: 'Neun Bahnen zwischen alten Bäumen', marke: 'tanne', farbe: '#7fd47f', bald: true },
    { id: 'berg', name: 'Wolkengipfel', unter: 'Neun Bahnen über den Wolken', marke: 'filter_hdr', farbe: '#bfe6ff', bald: true },
    { id: 'kueste', name: 'Sturmküste', unter: 'Neun Bahnen an der Brandung', marke: 'waves', farbe: '#7fd8ff', bald: true },
    { id: 'wueste', name: 'Sonnenwüste', unter: 'Neun Bahnen im heißen Sand', marke: 'sonne', farbe: '#ffd166', bald: true },
    { id: 'vulkan', name: 'Feuerberg', unter: 'Neun Bahnen am glühenden Hang', marke: 'local_fire_department', farbe: '#ff8a5c', bald: true },
  ];

  return { WELTEN, WIESE };
})();
