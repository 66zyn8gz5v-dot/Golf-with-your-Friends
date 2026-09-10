/* Uhrwerkstadt – neu aufgebaut.

   Die alten neun Bahnen sind weg; die Welt entsteht Maschine für Maschine noch einmal. Zu jedem
   neuen Hindernis gehört hier zuerst eine schlichte Testbahn: nur so viel Bahn, dass man die
   Maschine allein wirken sieht und ihre Werte einstellen kann. Die richtigen Bahnen kommen erst,
   wenn alle Maschinen stehen und sich richtig anfühlen.

   Kartenlegende wie in courses.js. Winkel in Grad, wo nicht anders vermerkt (die Kanone und ihre
   Verwandten rechnen im Bogenmaß), Zeiten in Sekunden, Koordinaten in Kacheln. */
const CLOCK_COURSES = [
  {
    name: 'Zahnradfeld', par: 3, theme: 'clocktown', maxStrokes: 14,
    intro: 'Testbahn für das Zahnradfeld. Zwischen den beiden Ufern liegt nichts als Luft – nur die Räder tragen hinüber. Roll in die helle Lücke, während sie am Ufer wartet, und lass dich mitnehmen.',
    map: [
      '..........................',
      '..######################..',
      '..######################..',
      '..#####..........#######..',
      '..T####..........#####H#..',
      '..#####..........#######..',
      '..######################..',
      '..######################..',
      '..........................',
    ],
    obstacles: [
      { type: 'gearfield', x0: 6.5, y0: 4.5, x1: 17.5, y1: 4.5, wait: 2.2, travel: 3.2, r: 0.9, zaehne: 10 },
    ],
    decor: [
      { t: 'clock', x: 13, y: 0.5, s: 2.2 },
      { t: 'lantern', x: 4.5, y: 1.6 }, { t: 'lantern', x: 20.5, y: 1.6 },
      { t: 'gearFlat', x: 8.5, y: 0.6, s: 1.3, speed: 0.4, seed: 0.2 },
      { t: 'gearFlat', x: 16.5, y: 0.6, s: 1.2, speed: -0.5, seed: 0.7 },
    ],
    autoDecor: { density: 0.12, seed: 71 },
  },
  {
    name: 'Pendelgasse', par: 3, theme: 'clocktown', maxStrokes: 14,
    intro: 'Testbahn für das Pendel. Zwei schwere Linsen streichen im selben Takt über die Gasse, nur um eine halbe Schwingung versetzt. Sie stoßen den Ball weg – warte den Ausschlag ab und schieb ihn hinterher.',
    map: [
      '..........................',
      '..######################..',
      '..######################..',
      '..######################..',
      '..T####################H..',
      '..######################..',
      '..######################..',
      '..######################..',
      '..........................',
    ],
    obstacles: [
      { type: 'pendulum', x: 9, y: 1.5, len: 3.5, amp: 55, ruhe: 90, phase: 0 },
      { type: 'pendulum', x: 17, y: 1.5, len: 3.5, amp: 55, ruhe: 90, phase: 0.5 },
    ],
    decor: [
      { t: 'clock', x: 13, y: 0.5, s: 2.2 },
      { t: 'lantern', x: 4.5, y: 8.4 }, { t: 'lantern', x: 21.5, y: 8.4 },
      { t: 'barrel', x: 1.2, y: 5.5 }, { t: 'crate', x: 24.6, y: 3.4 },
    ],
    autoDecor: { density: 0.12, seed: 23 },
  },
  {
    name: 'Federkammer', par: 3, theme: 'boiler', maxStrokes: 14,
    intro: 'Testbahn für das Federwerk. Über die Lücke kommt nur, wer sich einspannen lässt. Die Feder schwenkt langsam hin und her – der leuchtende Punkt zeigt, wo der Ball landen wird.',
    map: [
      '..........................',
      '..#######.....##########..',
      '..#######.....##########..',
      '..#######.....##########..',
      '..#T#####.....######H###..',
      '..#######.....##########..',
      '..#######.....##########..',
      '..#######.....##########..',
      '..........................',
    ],
    obstacles: [
      { type: 'springwork', x: 6.5, y: 4.5, base: 0, amp: 0.35, speed: 0.9, range: 8, catchR: 0.7, loadTime: 0.9 },
    ],
    decor: [
      { t: 'lantern', x: 3.5, y: 1.6 }, { t: 'lantern', x: 21.5, y: 1.6 },
      { t: 'gearFlat', x: 4.5, y: 7.4, s: 1.2, speed: 0.5, seed: 0.4 },
      { t: 'gearFlat', x: 20.5, y: 7.4, s: 1.3, speed: -0.4, seed: 0.9 },
    ],
    autoDecor: { density: 0.12, seed: 44 },
  },
];
