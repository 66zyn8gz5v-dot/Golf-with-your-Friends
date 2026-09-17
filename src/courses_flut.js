/* Die Flut (Weltkennung 'flut'): die versunkene Stadt.
   Erzeugt von tools/flut.py – dort steht auch, warum die Bahnen so aussehen, wie sie aussehen.

   NOCH NICHT FERTIG. Zurzeit stehen hier zwei Probebahnen: eine für die Flut allein, eine für das
   Pumpwerk. Sie sind da, damit die Weltregel angesehen und gespielt werden kann, bevor neun Bahnen
   darauf gebaut werden – und darum trägt die Welt in src/courses_pro.js die Kennzeichnung
   'nurVorschau'. Im Spiel taucht sie nicht auf.

   DIE FRAGE DIESER WELT IST: *wie lange noch?* Das Wasser steigt, Ring für Ring, von den Rändern
   nach innen, und es nimmt der Bahn dabei die Breite. Abschlag und Loch bleiben trocken; alles
   dazwischen kann verschwinden. Die Weltregel selbst steht in src/obstacles_flut.js, gezeichnet
   wird sie in src/render_flut.js.

   Kartenlegende wie in courses.js: '#' Boden, '.' offenes Wasser, 'x' Block, 's' Schlick (bremst),
   'T' Abschlag, 'H' Loch. */
const FLUT_COURSES = [
  {
    name: 'Der Kai', par: 3, theme: 'deich',
    intro: 'Die Springflut kommt, und sie kommt von beiden Seiten und aus dem Hafenbecken dazu. Der Kai ist breit genug, daß ein Streifen stehenbleibt – aber nur ein Streifen. Wer sich Zeit läßt, spielt ihn auf einem Steg zu Ende.',
    map: [
      '....................................',
      '....................................',
      '..############wwwwwww#############..',
      '..############wwwwwww#############..',
      '..############wwwwwww#############..',
      '..############wwwwwww#############..',
      '..############wwwwwww#############..',
      '..###########sssssssss############..',
      '..################################..',
      '..#####T####################H#####..',
      '..################################..',
      '..################################..',
      '..########xx############xx########..',
      '..########xx############xx########..',
      '..################################..',
      '..################################..',
      '..################################..',
      '....................................',
      '....................................',
    ],
    obstacles: [
      { type: 'flut', start: 9.0, takt: 4.5, max: 4, halt: 7 },
    ],
  },
  {
    name: 'Die Gasse', par: 4, theme: 'gassen',
    intro: 'Die Gasse zwischen den Höfen ist die einzige Verbindung, und sie ist das Erste, was absäuft. Unten links liegt das Pumpwerk: Wer darüberrollt, drückt das Wasser für ein paar Sekunden zurück – muß dafür aber dorthin, wo es zuerst steht.',
    map: [
      '......................................',
      '......................................',
      '..##############......##############..',
      '..##############......##############..',
      '..##############......##############..',
      '..##############......##############..',
      '..##############......##############..',
      '..##################################..',
      '..##########x#######################..',
      '..######T###x################H######..',
      '..##########x#######################..',
      '..##################################..',
      '..##############......###xx#########..',
      '..##############......###xx#########..',
      '..##############......##############..',
      '..##############......##############..',
      '..##############......##############..',
      '......................................',
      '......................................',
    ],
    obstacles: [
      { type: 'flut', start: 9.0, takt: 4.5, max: 4, halt: 7 },
      { type: 'pumpwerk', x: 4.5, y: 14.5, r: 0.8, stufen: 2, dauer: 7 },
    ],
  },
];
