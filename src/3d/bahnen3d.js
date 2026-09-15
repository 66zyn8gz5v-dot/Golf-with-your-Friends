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

   3. **deko und burg** – was herumsteht, und das ist die eigentliche Aussage einer Bahn. Jede der
      neun spielt an einem anderen Ort derselben Landschaft: am Mühlbach, auf dem Pferdehof, an der
      Schafweide, im Obstgarten, im Dorf, an der alten Brücke, auf dem Turnierplatz. Der Ort
      entsteht nicht aus der Karte, sondern aus dieser Liste – ein Hof ist ein Hof, weil dort eine
      Scheune, ein Heuhaufen und ein Karren stehen.

      'burg' ist darum auch nur bei dreien gesetzt. Eine Burg, die auf jeder Bahn am Horizont
      steht, hört nach der dritten auf, etwas zu bedeuten; und wo sie steht, steht sie zweimal
      ebenerdig ('berg: 0') und nur einmal auf ihrem Hügel – auf Augenhöhe ist sie ein Ort, von
      oben herab nur eine Kulisse.

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
      nebel: [26, 138],
      schatten: 0.58,
    },
    himmelOben: '#2f7fc8', himmelUnten: '#bfe3f5',
    /* Grasland heißt Grasland: weiche Kuppen am Horizont, keine Gipfel. Berge bekommt der
       Wolkengipfel, und wenn hier welche stünden, wäre der Unterschied zwischen den Welten dahin. */
    ferne: 'huegel',

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
        burg: { x: 5.5, z: -28, g: 3.2, berg: 3.5 },
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
        burg: { x: 7.5, z: -17, g: 3.0, berg: 0, dreh: 0 },
        deko: [
          { t: 'mast', x: 3.4, z: 2.5, h: 1.5, farbe: '#b63a30' },
          { t: 'mast', x: 11.6, z: 2.5, h: 1.5, farbe: '#b63a30' },
          { t: 'felsgruppe', x: 13.5, z: 8, g: 1.1 },
          { t: 'felsgruppe', x: -1.5, z: 20, g: 0.9 },
          { t: 'haus', x: 10.5, z: 22, g: 1.1, dreh: 0.6 },
        ],
        autoDeko: { saat: 37, dichte: 0.5 },
      },

      /* ---------------- 4 ----------------
         Der Pferdehof. Die erste Bahn mit einer Rampe: Das Loch liegt auf einer Terrasse, und
         hinauf kommt nur, wer genug Kraft mitbringt. Wer zu schwach schlägt, rollt die Bretter
         wieder herunter – und das ist keine Strafe, sondern eine Auskunft. */
      {
        name: 'Der Pferdehof',
        par: 3,
        intro: 'Über die Holzrampe auf die Terrasse, dort oben liegt das Loch. Zu wenig Kraft, und '
             + 'der Ball kommt die Bretter wieder herunter.',
        karte: [
          '............',
          '............',
          '...######...',
          '...##H###...',
          '...######...',
          '...######...',
          '...######...',
          '...######...',
          '...######...',
          '...rrrrrr...',
          '...rrrrrr...',
          '...rrrrrr...',
          '...######...',
          '...##,,##...',
          '...##,,##...',
          '...######...',
          '...######...',
          '...######...',
          '...######...',
          '...######...',
          '...##T###...',
          '...######...',
          '............',
          '............',
        ],
        gelaende: {
          grund: 0,
          welle: 0.03,
          rampen: [
            /* Gedreht um eine halbe Umdrehung, weil der Ball von hinten kommt: Die Auffahrt muss
               zum Abschlag zeigen, das Podest zum Loch. */
            { x: 6, z: 5.5, dreh: Math.PI, lang: 7, breit: 6, hoch: 0.55, auffahrt: 3 },
          ],
          huegel: [
            { x: 6, z: 3.5, r: 2, h: -0.3 },
          ],
        },
        deko: [
          { t: 'scheune', x: -2.6, z: 8, g: 1.1, dreh: 0.35, dach: '#8a4a38' },
          { t: 'haus', x: 13.5, z: 13, g: 1.0, dreh: -0.5 },
          { t: 'heuhaufen', x: -1.5, z: 13.5, g: 1.1 },
          { t: 'heuhaufen', x: -0.2, z: 15.2, g: 0.85 },
          { t: 'karren', x: 12.5, z: 7.5, g: 1.0, dreh: 0.9 },
          { t: 'brunnen', x: 12.8, z: 18, g: 1.0 },
          { t: 'zaun', von: [-3.5, 16.5], nach: [2.2, 17.5] },
          { t: 'zaun', von: [10.5, 16], nach: [10.5, 21.5] },
          { t: 'baum', x: 11.5, z: 3, art: 'eiche', g: 2.6 },
        ],
        autoDeko: { saat: 41, dichte: 0.42 },
      },

      /* ---------------- 5 ----------------
         Die Schafweide. Ein langer Bogen über die Koppeln, mit Trockenmauern statt Zäunen und
         einer Sandkuhle auf halbem Weg. Keine Burg in Sicht – hier ist man weit draußen. */
      {
        name: 'Die Schafweide',
        par: 4,
        intro: 'Ein weiter Bogen über die Koppeln. Erst die Sandkuhle, dann nach rechts und durch '
             + 'das Felsentor. An der rechten Bande liegt der kürzeste Weg.',
        karte: [
          '................',
          '................',
          '.....######.....',
          '.....##H###.....',
          '.....######.....',
          '.....######.....',
          '.....#,,,##.....',
          '.....#,,,##.....',
          '.....######.....',
          '.....######.....',
          '.....#x##x#.....',
          '.....######.....',
          '.....######.....',
          '.....######.....',
          '..#########.....',
          '..#########.....',
          '..#########.....',
          '..######........',
          '..######........',
          '..######........',
          '..##ss##........',
          '..##ss##........',
          '..######........',
          '..######........',
          '..######........',
          '..######........',
          '..######........',
          '..##T###........',
          '..######........',
          '................',
        ],
        gelaende: {
          grund: 0.1,
          welle: 0.05,
          huegel: [
            { x: 3, z: 22, r: 9, h: 0.45 },       // die Koppel hängt leicht zum Tal
            { x: 12, z: 8, r: 8, h: 0.3 },
            { x: 7.5, z: 3.5, r: 2, h: -0.32 },
          ],
        },
        deko: [
          { t: 'mauer', von: [-2.5, 12.5], nach: [4.5, 12.5] },
          { t: 'mauer', von: [12.5, 12.5], nach: [18, 12.5] },
          { t: 'mauer', von: [-2.5, 24.5], nach: [-2.5, 30] },
          { t: 'scheune', x: 14.5, z: 20, g: 0.9, dreh: -0.6, dach: '#6d7f8a' },
          { t: 'heuhaufen', x: 13.2, z: 24, g: 0.9 },
          { t: 'baum', x: 1.5, z: 5.5, art: 'eiche', g: 2.8 },
          { t: 'baum', x: 13.5, z: 4.5, art: 'laubbaum', g: 2.4 },
          { t: 'felsgruppe', x: -1.5, z: 6.5, g: 1.0 },
          { t: 'brunnen', x: 10.5, z: 26, g: 0.95 },
        ],
        autoDeko: { saat: 53, dichte: 0.45 },
      },

      /* ---------------- 6 ----------------
         Der Obstgarten. Ein Graben quer, und die einzige trockene Gasse liegt links; danach geht
         es über die Rampe hinauf zwischen die Apfelbäume. */
      {
        name: 'Der Obstgarten',
        /* Par 3, obwohl sie lang ist: Die Terrasse oben fängt den Ball, und die Mulde am Loch zieht
           ihn hinein – wer den Graben umspielt hat, ist mit dem zweiten Schlag da. Ein Par 4 wäre
           hier ein geschenktes Birdie und damit gar kein Maß. */
        par: 3,
        intro: 'Ein Graben quer durch die Bahn: Mittendurch führt ein Steg, links und rechts '
             + 'bleibt je eine Gasse trocken. Ganz oben hebt eine Rampe die Bahn in den '
             + 'Obstgarten, dort liegt das Loch.',
        karte: [
          '.............',
          '.............',
          '....######...',
          '....##H###...',
          '....######...',
          '....######...',
          '....######...',
          '....######...',
          '....rrrrrr...',
          '....rrrrrr...',
          '....rrrrrr...',
          '....######...',
          '....######...',
          '....#,,,##...',
          '....#,,,##...',
          '....######...',
          '....#www##...',
          '....######...',
          '....######...',
          '....######...',
          '....######...',
          '....######...',
          '....##,,##...',
          '....##,,##...',
          '....######...',
          '....#x####...',
          '....######...',
          '....######...',
          '....######...',
          '....######...',
          '....##T###...',
          '....######...',
          '....######...',
          '.............',
        ],
        gelaende: {
          grund: 0,
          welle: 0.035,
          rampen: [
            { x: 7, z: 5, dreh: Math.PI, lang: 6, breit: 6, hoch: 0.5, auffahrt: 3 },
          ],
          /* Der Steg über den Graben. Er ist schmal – schmaler als jede Gasse daneben –, und das
             ist der Sinn der Bahn: Wer ihn trifft, spart einen Schlag, wer ihn verfehlt, prallt am
             Geländer ab oder liegt im Wasser. */
          bruecken: [
            { x: 6.5, z: 16.5, lang: 4.6, breit: 1.6 },
          ],
          huegel: [
            { x: 3, z: 24, r: 9, h: 0.4 },
            { x: 6.5, z: 3.5, r: 2, h: -0.3 },
          ],
        },
        deko: [
          { t: 'obstbaum', x: 12.2, z: 4.5, g: 2.2 },
          { t: 'obstbaum', x: 12.2, z: 7.5, g: 2.4 },
          { t: 'obstbaum', x: 1.6, z: 4.5, g: 2.3 },
          { t: 'obstbaum', x: 1.6, z: 7.5, g: 2.1 },
          { t: 'obstbaum', x: 1.6, z: 10.5, g: 2.5 },
          { t: 'obstbaum', x: 12.2, z: 10.5, g: 2.2 },
          { t: 'karren', x: 11.5, z: 19.5, g: 1.0, dreh: 0.4 },
          { t: 'zaun', von: [1.5, 13], nach: [1.5, 19] },
          { t: 'haus', x: 11.8, z: 14, g: 0.95, dreh: -0.4 },
          { t: 'scheune', x: 11.6, z: 24.5, g: 0.95, dreh: -0.5, dach: '#8a7a4a' },
          { t: 'obstbaum', x: 1.6, z: 22.5, g: 2.3 },
          { t: 'obstbaum', x: 1.6, z: 26.5, g: 2.1 },
        ],
        autoDeko: { saat: 67, dichte: 0.4 },
      },

      /* ---------------- 7 ----------------
         Das Dorf. Ein Knick um die Häuser herum, Sand vor dem Loch und ein Felsentor kurz davor.
         Die engste Kurve der neun – hier lohnt sich die Bande am meisten. */
      {
        name: 'Das Dorf',
        par: 4,
        intro: 'Am Brunnen vorbei, dann im Knick nach rechts. Kurz vor dem Loch steht ein Tor aus '
             + 'zwei Felsnadeln, dahinter wächst hohes Gras.',
        karte: [
          '.................',
          '.................',
          '......######.....',
          '......##H###.....',
          '......######.....',
          '......######.....',
          '......######.....',
          '......#,,###.....',
          '......#,,###.....',
          '......######.....',
          '......#x##x#.....',
          '......######.....',
          '......######.....',
          '..##########.....',
          '..##########.....',
          '..##########.....',
          '..######.........',
          '..######.........',
          '..######.........',
          '..##,,##.........',
          '..##,,##.........',
          '..######.........',
          '..###x##.........',
          '..######.........',
          '..######.........',
          '..######.........',
          '..######.........',
          '..##T###.........',
          '..######.........',
          '..######.........',
          '.................',
        ],
        gelaende: {
          grund: 0.05,
          welle: 0.04,
          huegel: [
            { x: 14, z: 6, r: 9, h: 0.4 },
            { x: 0, z: 20, r: 8, h: 0.3 },
            { x: 8.5, z: 3.5, r: 2, h: -0.32 },
          ],
        },
        deko: [
          { t: 'haus', x: 0.2, z: 10.5, g: 1.15, dreh: 0.5 },
          { t: 'haus', x: 13.8, z: 13.5, g: 1.0, dreh: -0.6 },
          { t: 'haus', x: -0.8, z: 16.5, g: 1.05, dreh: 0.2, dach: '#6d7f8a' },
          { t: 'haus', x: 10.2, z: 20.5, g: 0.95, dreh: -0.3 },
          { t: 'brunnen', x: 9.6, z: 16.5, g: 1.05 },
          { t: 'karren', x: 10.5, z: 24, g: 1.0, dreh: -0.2 },
          { t: 'zaun', von: [9.2, 18.5], nach: [9.2, 23] },
          { t: 'zaun', von: [-1.5, 6.5], nach: [4.5, 6.5] },
          { t: 'baum', x: 3.5, z: 9.5, art: 'eiche', g: 2.8 },
          { t: 'muehle', x: 14.5, z: 26, g: 1.05, dreh: -0.5 },
        ],
        autoDeko: { saat: 79, dichte: 0.45 },
      },

      /* ---------------- 8 ----------------
         Die Alte Brücke. Kurz, aber der Bach läuft die ganze linke Seite entlang – wer die Bande
         links nimmt, badet. Die kürzeste Bahn der neun und trotzdem nicht die leichteste. */
      {
        name: 'Die Alte Brücke',
        par: 3,
        intro: 'Der Bach läuft links die ganze Bahn entlang. Die rechte Bande ist der sichere Weg – '
             + 'aber der lange.',
        karte: [
          '............',
          '............',
          '...######...',
          '...##H###...',
          '...######...',
          '...######...',
          '...w#####...',
          '...w#####...',
          '...w#####...',
          '...w#####...',
          '...w#####...',
          '...w#####...',
          '...w#####...',
          '...######...',
          '...######...',
          '...##x###...',
          '...######...',
          '...######...',
          '...######...',
          '...##T###...',
          '...######...',
          '...######...',
          '............',
          '............',
        ],
        gelaende: {
          grund: 0.15,
          welle: 0.03,
          huegel: [
            { x: 10, z: 12, r: 8, h: 0.35 },      // die Bahn hängt zum Bach hin
            { x: 5.5, z: 3.5, r: 2, h: -0.3 },
          ],
        },
        deko: [
          { t: 'bruecke', x: 3.5, z: 9, g: 1.0 },
          { t: 'muehle', x: 0.5, z: 15.5, g: 1.15, dreh: 0.8 },
          { t: 'haus', x: 11.5, z: 6.5, g: 1.0, dreh: -0.5 },
          { t: 'baum', x: 10.8, z: 12.5, art: 'eiche', g: 2.9 },
          { t: 'felsgruppe', x: 11.5, z: 17.5, g: 1.0 },
          { t: 'zaun', von: [10, 2.5], nach: [10, 8] },
          { t: 'karren', x: 1.2, z: 19.5, g: 0.95, dreh: 0.6 },
        ],
        autoDeko: { saat: 89, dichte: 0.5 },
      },

      /* ---------------- 9 ----------------
         Der Turnierplatz. Die letzte und längste: Sand, Rough, ein Felsentor, eine Rampe – und am
         Ende die Burg, diesmal auf ebener Erde und in Reichweite. Alles, was die acht Bahnen davor
         einzeln gezeigt haben, steht hier hintereinander. */
      {
        name: 'Der Turnierplatz',
        /* Par 4, obwohl sie die längste ist: Der Knick lässt sich mit zwei kräftigen Schlägen
           abkürzen, und ein Par, das schon der Prüfgolfer im Mittel um anderthalb Schläge
           unterbietet, lobt für nichts. */
        par: 4,
        intro: 'Die längste Bahn des Graslands: durch den Sand, um die Ecke, durch das Felsentor '
             + 'und über die Rampe auf den Turnierplatz vor der Burg.',
        karte: [
          '.................',
          '.................',
          '.........######..',
          '.........##H###..',
          '.........######..',
          '.........######..',
          '.........rrrrrr..',
          '.........rrrrrr..',
          '.........rrrrrr..',
          '.........######..',
          '.........#x##x#..',
          '.........######..',
          '.........######..',
          '.........######..',
          '..#############..',
          '..#############..',
          '..#############..',
          '..######.........',
          '..######.........',
          '..##ss##.........',
          '..##ss##.........',
          '..######.........',
          '..######.........',
          '..#,,,##.........',
          '..#,,,##.........',
          '..######.........',
          '..######.........',
          '..######.........',
          '..######.........',
          '..##T###.........',
          '..######.........',
          '..######.........',
          '.................',
        ],
        gelaende: {
          grund: 0,
          welle: 0.04,
          rampen: [
            { x: 12, z: 4, dreh: Math.PI, lang: 4, breit: 6, hoch: 0.5, auffahrt: 3 },
          ],
          huegel: [
            { x: 4, z: 24, r: 10, h: 0.5 },
            { x: 11.5, z: 3.5, r: 2, h: -0.3 },
          ],
        },
        /* Die Burg steht hier auf der Wiese, nicht auf dem Kegel: Am Ende einer Bahn, die zu ihr
           führt, will man sie sehen und nicht zu ihr hinaufschauen. */
        burg: { x: 11.5, z: -16, g: 2.8, berg: 0, dreh: 0 },
        deko: [
          { t: 'zelt', x: 5.5, z: 5.5, g: 1.15, farbe: '#c8503f' },
          { t: 'zelt', x: 18.2, z: 6.5, g: 1.05, farbe: '#3d5da8' },
          { t: 'zelt', x: 4.2, z: 10.5, g: 0.95, farbe: '#e0a94a' },
          { t: 'zelt', x: 18.8, z: 11.5, g: 1.1, farbe: '#4a8f55' },
          { t: 'mast', x: 7.4, z: 2.5, h: 1.8, farbe: '#b63a30' },
          { t: 'mast', x: 16.6, z: 2.5, h: 1.8, farbe: '#e0a94a' },
          { t: 'zaun', von: [-1, 14.5], nach: [-1, 22] },
          { t: 'karren', x: 10.5, z: 20.5, g: 1.0, dreh: -0.3 },
          { t: 'heuhaufen', x: 11.5, z: 24.5, g: 1.0 },
          { t: 'baum', x: 14.5, z: 22.5, art: 'eiche', g: 2.9 },
        ],
        autoDeko: { saat: 97, dichte: 0.4 },
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
