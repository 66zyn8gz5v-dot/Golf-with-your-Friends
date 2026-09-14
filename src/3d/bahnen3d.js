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
      /* ---------------- 1 ----------------
         Die Lehrbahn: schnurgerade, schmal, lang. Wer die Nadeln in der Mitte nicht trifft, spielt
         außen an der Bande vorbei – und wer außen bleibt, umgeht auch das hohe Gras. Das ist die
         ganze Lektion dieser Bahn: Die Bande ist kein Rand, sie ist ein Werkzeug. */
      {
        name: 'Burgwiese',
        par: 3,
        intro: 'Eine schmale Bahn, geradeaus unter die Burg. Drei Felsnadeln stehen im Weg, in der '
             + 'Mitte wächst hohes Gras – an der Bande entlang ist es frei.',
        karte: [
          '..........',
          '..........',
          '...#####..',
          '...##H##..',
          '...#####..',
          '...#####..',
          '...#####..',
          '...##x##..',
          '...#####..',
          '...#####..',
          '...#x#x#..',
          '...#####..',
          '...#####..',
          '...#####..',
          '...#,,,#..',
          '...#,,,#..',
          '...#####..',
          '...#####..',
          '...#####..',
          '...#####..',
          '...#####..',
          '...##T##..',
          '...#####..',
          '...#####..',
          '...#####..',
          '...#####..',
          '..........',
          '..........',
        ],
        gelaende: {
          grund: 0,
          welle: 0.03,
          huegel: [
            /* Eine sehr flache Querneigung: Die Bahn hängt kaum merklich nach rechts. Merken tut
               man es erst über die ganze Länge – und genau das soll man lernen. */
            { x: 2, z: 13, r: 10, h: 0.3 },
            /* Die Mulde ist eng und steil. Flacher zieht sie nicht: Seit der Ball Haftreibung hat,
               bleibt er auf allem unter achtzehn Prozent liegen – eine Mulde muss steiler sein als das,
               sonst ist sie nur eine Delle. */
            { x: 5.5, z: 3.5, r: 2, h: -0.3 },
          ],
        },
        burg: { x: 5.5, z: -19, g: 1.3, berg: 5.2 },
        deko: [
          { t: 'muehle', x: -4.5, z: 9, g: 1.15, dreh: 0.6 },
          { t: 'haus', x: -4, z: 17, g: 1.2, dreh: 0.5 },
          { t: 'haus', x: 14, z: 7, g: 1.0, dreh: -0.7 },
          { t: 'zaun', von: [-2.5, 12], nach: [-2.5, 20] },
          { t: 'felsgruppe', x: 13, z: 16, g: 1.0 },
        ],
        autoDeko: { saat: 11, dichte: 0.55 },
      },

      /* ---------------- 2 ----------------
         Ein Knick nach rechts und ein Bach quer durch die zweite Hälfte. Der Bach lässt links und
         rechts je ein Feld trocken – wer eng an der Bande bleibt, kommt hinüber, wer die Mitte
         nimmt, schwimmt. */
      {
        name: 'Der Mühlbach',
        par: 4,
        intro: 'Erst geradeaus, dann im rechten Winkel nach rechts. Hinter dem Knick liegt der '
             + 'Mühlbach quer – links an der Bande, rechts daneben bleibt eine Gasse trocken.',
        karte: [
          '................',
          '................',
          '........#####...',
          '........##H##...',
          '........#####...',
          '........#####...',
          '........#####...',
          '........#####...',
          '........#####...',
          '........#####...',
          '........ww###...',
          '........ww###...',
          '........#####...',
          '........#####...',
          '........#####...',
          '........#####...',
          '........#####...',
          '..###########...',
          '..###########...',
          '..###########...',
          '..#####.........',
          '..#####.........',
          '..#####.........',
          '..##x##.........',
          '..#####.........',
          '..#####.........',
          '..##T##.........',
          '..#####.........',
          '..#####.........',
          '..#####.........',
          '................',
          '................',
        ],
        gelaende: {
          grund: 0.1,
          welle: 0.04,
          huegel: [
            { x: 14, z: 6, r: 8, h: 0.5 },        // die Bahn steigt zur Burg hin leicht an
            { x: 10.5, z: 3.5, r: 2, h: -0.32 },  // Kessel um das Loch, eng und steil
          ],
        },
        burg: { x: 10.5, z: -17, g: 1.3, berg: 5.4 },
        deko: [
          { t: 'muehle', x: 15.5, z: 10.5, g: 1.25, dreh: -0.7 },
          { t: 'haus', x: 16.5, z: 15, g: 1.1, dreh: -0.4 },
          { t: 'felsgruppe', x: 6.5, z: 10, g: 1.1 },
          { t: 'zaun', von: [14.5, 13.5], nach: [18, 14.5] },
        ],
        autoDeko: { saat: 23, dichte: 0.5 },
      },

      /* ---------------- 3 ----------------
         Bergauf, mit Knick, Sand und einem Tor aus zwei Felsnadeln kurz vor dem Loch. Die längste
         und die schwerste der drei. */
      {
        name: 'Zum Burgtor',
        /* Par 5, nicht 4: Die Bahn ist lang, sie steigt, sie hat einen Knick und zwei Sandgruben.
           Der Prüfgolfer braucht im Mittel sechs Schläge – ein Par, das nur der Rechner schafft,
           ist kein Par, sondern eine Kränkung. */
        par: 5,
        intro: 'Bergauf, um die Ecke und durch ein Tor aus zwei Felsnadeln. Zwei Sandgruben liegen '
             + 'im Weg; oben wartet das Loch in einer Mulde.',
        karte: [
          '...............',
          '...............',
          '.....#####.....',
          '.....##H##.....',
          '.....#####.....',
          '.....#####.....',
          '.....#ss##.....',
          '.....#ss##.....',
          '.....#####.....',
          '.....#####.....',
          '.....#x#x#.....',
          '.....#####.....',
          '.....#####.....',
          '..########.....',
          '..########.....',
          '..########.....',
          '..#####........',
          '..#####........',
          '..##x##........',
          '..#####........',
          '..#####........',
          '..#ss##........',
          '..#ss##........',
          '..#####........',
          '..#####........',
          '..##T##........',
          '..#####........',
          '..#####........',
          '..#####........',
          '...............',
          '...............',
        ],
        gelaende: {
          grund: 0,
          welle: 0.03,
          huegel: [
            /* Der Anstieg zum Loch hin. Zwei Glocken hintereinander geben zwei Terrassen:
               dazwischen wird es kurz flach, und dort bleibt ein zu schwacher Schlag liegen,
               statt wieder zurückzurollen. */
            { x: 7, z: 2, r: 13, h: 1.05 },
            { x: 5, z: 14, r: 9, h: 0.5 },
            { x: 7.5, z: 3.5, r: 2, h: -0.34 },    // die Mulde um das Loch, eng und steil
          ],
        },
        burg: { x: 7.5, z: -15, g: 1.4, berg: 4.8 },
        deko: [
          { t: 'mast', x: 3.4, z: 2.5, h: 1.5, farbe: '#b63a30' },
          { t: 'mast', x: 11.6, z: 2.5, h: 1.5, farbe: '#b63a30' },
          { t: 'felsgruppe', x: 13.5, z: 8, g: 1.1 },
          { t: 'felsgruppe', x: -1.5, z: 20, g: 0.9 },
          { t: 'haus', x: 10.5, z: 22, g: 1.1, dreh: 0.6 },
        ],
        autoDeko: { saat: 37, dichte: 0.5 },
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
