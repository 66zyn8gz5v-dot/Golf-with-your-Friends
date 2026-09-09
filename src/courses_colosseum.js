/* Kolosseum: die Arena – Bahnen für den Turniermodus, vorerst drei zum Ausprobieren.

   Neu hier: das Löwentor. Die Tore stehen paarweise in der Arenamauer und werden nicht über
   Koordinaten gesetzt, sondern als Buchstaben in die Karte gemalt: Der Großbuchstabe ist der
   Eingang, der gleiche Kleinbuchstabe der Ausgang (A/a, B/b, C/c). In der Hindernisliste steht je
   Paar nur, in welche Richtung der Ausgang ausspuckt ('angle' in Grad, wie bei Rampe und
   Beschleuniger). Geschluckt wird nur, wer Schwung hat – sonst prallt der Ball am Tor ab wie an
   einer Wand.

   Sonst gilt dieselbe Kartenlegende wie in courses.js. */
const COLOSSEUM_COURSES = [
  {
    name: 'Löwentor', par: 3, theme: 'colosseum', maxStrokes: 12,
    intro: 'Zwei Gassen, dazwischen die Arenamauer. Nur das Löwentor führt hinüber – und es schluckt nur einen Ball mit Schwung. Zu zaghaft geschlagen, und der Löwe lässt ihn abprallen.',
    map: [
      '......................',
      '..a#################..',
      '...################H..',
      '......................',
      '..T################A..',
      '..#################...',
      '......................',
    ],
    obstacles: [
      { type: 'liongate', pair: 'A', angle: 0 },
    ],
    decor: [
      { t: 'pillarLight', x: 1.2, y: 1.5, s: 1.2 }, { t: 'pillarLight', x: 1.2, y: 4.5, s: 1.2 },
      { t: 'bannerRed', x: 20.6, y: 1.5, s: 1.2 }, { t: 'bannerRed', x: 20.6, y: 4.5, s: 1.2 },
      { t: 'brazier', x: 6.5, y: 0.4, s: 1.1 }, { t: 'brazier', x: 15.5, y: 0.4, s: 1.1 },
      { t: 'urn', x: 9.5, y: 6.4, s: 1.1 },
    ],
    autoDecor: { density: 0.12, seed: 701 },
  },
  {
    name: 'Wagenrennen', par: 4, theme: 'colosseum', maxStrokes: 15,
    intro: 'Die Rennbahn um die Spina. Zwei Streitwagen donnern über die Geraden – außen herum ist der sichere Weg, quer durch das Löwentor der schnelle.',
    map: [
      '..........................',
      '..######################..',
      '..###################H##..',
      '..###.......a........###..',
      '..###................###..',
      '..###................###..',
      '..###................###..',
      '..###.......A........###..',
      '..######################..',
      '..##T###################..',
      '..........................',
      '..........................'
    ],
    obstacles: [
      { type: 'liongate', pair: 'A', angle: -90 },
      { type: 'mover', x0: 5, y0: 1.5, x1: 20, y1: 1.5, w: 1.5, h: 0.9, period: 8, style: 'chariot' },
      { type: 'mover', x0: 20, y0: 9.5, x1: 5, y1: 9.5, w: 1.5, h: 0.9, period: 7, phase: 0.35, style: 'chariot' },
      { type: 'bumper', x: 3.5, y: 5.5, r: 0.36, style: 'rock' },
      { type: 'bumper', x: 22.5, y: 5.5, r: 0.36, style: 'rock' },
    ],
    decor: [
      { t: 'obelisk', x: 12.5, y: 5.5, s: 1.6 },
      { t: 'pillarLight', x: 8.5, y: 4.5, s: 1.1 }, { t: 'pillarLight', x: 16.5, y: 6.5, s: 1.1 },
      { t: 'bannerRed', x: 1.2, y: 2.5, s: 1.2 }, { t: 'bannerRed', x: 24.6, y: 8.5, s: 1.2 },
      { t: 'brazier', x: 5.5, y: 4.4, s: 1.0 }, { t: 'brazier', x: 19.5, y: 6.6, s: 1.0 },
    ],
    autoDecor: { density: 0.13, seed: 702 },
  },
  {
    name: 'Löwengrube', par: 5, theme: 'colosseum', maxStrokes: 18,
    intro: 'Drei Kammern, zwei Tore. Erst quer durch die Mauer, dann hinunter in die Grube – und jedes Mal braucht der Ball genug Schwung, sonst bleibt er, wo er ist.',
    map: [
      '............................',
      '..##########...##########...',
      '..T#########...##########...',
      '..##########A.a##########...',
      '..##########...##########...',
      '..##########...##########...',
      '....................B.......',
      '....................b.......',
      '........#################...',
      '........##H##############...',
      '........#################...',
      '........#################...',
      '............................',
      '............................',
    ],
    obstacles: [
      { type: 'liongate', pair: 'A', angle: 0 },
      { type: 'liongate', pair: 'B', angle: 90 },
      { type: 'mover', x0: 16, y0: 1.5, x1: 23, y1: 1.5, w: 1.5, h: 0.9, period: 6, style: 'chariot' },
      { type: 'mover', x0: 22, y0: 10.5, x1: 11, y1: 10.5, w: 1.5, h: 0.9, period: 7.5, phase: 0.4, style: 'chariot' },
      { type: 'bumper', x: 17.5, y: 9.5, r: 0.38, style: 'rock' },
      { type: 'rotor', x: 6.5, y: 4.5, blades: 3, len: 1.5, speed: 1.6, style: 'stone', height: 0.6 },
    ],
    decor: [
      { t: 'pillarLight', x: 13.5, y: 1.5, s: 1.3 }, { t: 'pillarLight', x: 13.5, y: 5.5, s: 1.3 },
      { t: 'bannerRed', x: 1.2, y: 3.5, s: 1.2 }, { t: 'bannerRed', x: 26.6, y: 3.5, s: 1.2 },
      { t: 'obelisk', x: 25.5, y: 7.5, s: 1.4 },
      { t: 'brazier', x: 9.5, y: 7.4, s: 1.1 }, { t: 'brazier', x: 24.5, y: 7.4, s: 1.1 },
      { t: 'urn', x: 12.5, y: 12.4, s: 1.1 }, { t: 'urn', x: 19.5, y: 12.4, s: 1.1 },
    ],
    autoDecor: { density: 0.12, seed: 703 },
  },
];
