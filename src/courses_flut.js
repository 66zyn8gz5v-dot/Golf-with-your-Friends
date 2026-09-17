/* Die Flut (Weltkennung 'flut'): die versunkene Stadt.
   Erzeugt von tools/flut.py – dort steht auch, warum die Bahnen so aussehen, wie sie aussehen.

   NOCH NICHT FERTIG. Zurzeit stehen hier zwei Probebahnen, an denen die Maschinen angesehen und
   gespielt werden können, bevor neun Bahnen darauf gebaut werden. Die Welt trägt darum in
   src/courses_pro.js die Kennzeichnung 'nurVorschau'; im Spiel taucht sie nicht auf.

   DAS FLUTBECKEN ist ein Hindernis wie das Wandertor oder die Falltür: Es läuft im Takt von außen
   nach innen voll und wieder leer, und solange es leer ist, geht der Weg hindurch. Ringsum bleibt
   die Bahn trocken und immer spielbar – **es gibt auf jeder Bahn einen Weg, der auch bei vollem
   Becken zum Loch führt** (tools/flut.py prüft das). Das Becken ist die Abkürzung, nicht die
   einzige Möglichkeit; warten muß man nie.

   Zuerst war die Flut eine Weltregel und stieg über die ganze Bahn. Das war gut gedacht und
   schlecht zu spielen: Wer den Augenblick verpaßte, konnte nur zusehen. Siehe src/obstacles_flut.js.

   Kartenlegende wie in courses.js: '#' Boden, '.' offenes Wasser, 'x' Block, 's' Schlick (bremst),
   'T' Abschlag, 'H' Loch. */
const FLUT_COURSES = [
  {
    name: 'Das Hafenbecken', par: 3, theme: 'deich',
    intro: 'Das Becken läuft im Takt voll und wieder leer. Steht es leer, geht es geradeaus hindurch – das ist der kurze Weg. Steht es voll, spielt man oben oder unten herum und braucht einen Schlag mehr. Warten muß man nie.',
    map: [
      '................................',
      '................................',
      '..############################..',
      '..############################..',
      '..############################..',
      '..#########xxxxxxxxxx#########..',
      '..#########ssssssssss#########..',
      '..#########ssssssssss#########..',
      '..###T#####ssssssssss#####H###..',
      '..#########ssssssssss#########..',
      '..#########xxxxxxxxxx#########..',
      '..############################..',
      '..############################..',
      '..############################..',
      '..############################..',
      '................................',
      '................................',
    ],
    obstacles: [
      { type: 'flut', x: 16.0, y: 8.0, w: 10, h: 4, start: 2.5, takt: 1.2, halt: 1.0, leer: 5.0 },
    ],
  },
  {
    name: 'Zwei Becken', par: 4, theme: 'gassen',
    intro: 'Zwei Becken hintereinander, jedes zur anderen Seite hin gemauert: Wer sie umgeht, fährt Zickzack. Unten links liegt das Pumpwerk – wer darüberrollt, hält beide vier Sekunden lang leer.',
    map: [
      '....................................',
      '....................................',
      '..################################..',
      '..################################..',
      '..################################..',
      '..#########xxxxxx#################..',
      '..#########ssssss####ssssss#######..',
      '..#########ssssss####ssssss#######..',
      '..###T#####ssssss####ssssss###H###..',
      '..#########ssssss####ssssss#######..',
      '..###################xxxxxx#######..',
      '..################################..',
      '..################################..',
      '..################################..',
      '..################################..',
      '....................................',
      '....................................',
    ],
    obstacles: [
      { type: 'flut', x: 14.0, y: 8.0, w: 6, h: 4, start: 2.5, takt: 1.2, halt: 1.0, leer: 5.0 },
      { type: 'flut', x: 24.0, y: 8.0, w: 6, h: 4, start: 4.4, takt: 1.2, halt: 1.0, leer: 5.0 },
      { type: 'pumpwerk', x: 5.5, y: 12.5, r: 0.8, dauer: 4 },
    ],
  },
];
