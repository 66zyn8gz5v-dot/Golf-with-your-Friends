/* Die Maschinen der versunkenen Stadt – und ihre Weltregel.

   DIE FRAGE DIESER WELT IST: *wie lange noch?*

   Jede andere Welt fragt, wie fest man schlägt (Märchenland), wann (Uhrwerkstadt), wohin
   (Schneeberg) oder was da vorn überhaupt liegt (Zwergenmine). In allen vieren kostet Warten
   nichts: Man darf vor einer Maschine sitzen und den richtigen Augenblick abpassen, so lange man
   will. Nur die Lavafontäne und die Sprengladung stören einen ruhenden Ball, und beide sind
   örtlich – man kann ihnen ausweichen und dann in Ruhe zielen.

   Hier nicht. Hier steigt das Wasser, und zwar auf der ganzen Bahn. Zögern kostet Boden.

   WIE DIE FLUT LÄUFT
   Sie frißt sich von den Rändern nach innen und folgt dabei der Form der Bahn. Jedes Bodenfeld
   bekommt beim Aufbau eine Ringnummer: 1 für alles, was an Wasser, Abgrund oder Mauer grenzt,
   2 für alles, was an einen Einser grenzt, und so weiter. Steigt die Flut um eine Stufe, wird aus
   jedem Feld mit Ringnummer <= Stufe Wasser.

   Das ist mehr als Bequemlichkeit: Es heißt, daß eine Bahn nicht von Hand geflutet werden muß und
   daß die Flut auf jeder Form das Richtige tut. Eine lange schmale Gasse säuft von beiden Seiten
   zu, ein runder Platz von außen – ohne daß jemand das aufschreiben müßte.

   SIE STEIGT NICHT NUR – SIE GEHT AUCH WIEDER
   Das ist keine Verzierung, sondern das, was die Welt überhaupt spielbar macht. Eine Flut, die nur
   steigt, zerlegt jede Bahn irgendwann in Inseln: Abschlag hier, Loch dort, dazwischen Wasser, und
   über Wasser rollen heißt versinken. Dann bliebe nur noch zusehen, wie die Schläge weggehen.
   Also ist es eine Tide: Sie steigt Stufe um Stufe, steht oben eine Weile, fällt ebenso zurück,
   steht unten, und fängt von vorn an. Wer das Zeitfenster verpaßt, verliert Zeit – nicht die Bahn.

   WAS NIE ÜBERFLUTET WIRD
   Abschlag und Loch. Ein Loch unter Wasser wäre keine Aufgabe, sondern das Ende der Bahn, und ein
   überfluteter Abschlag nähme einem den Platz, an dem man zurückgelegt wird. Beide bleiben also
   trocken, auch wenn ringsum alles absäuft – das ist die Insel, auf die man sich retten muß.

   DER RÜCKWEG
   Das PUMPWERK ist eine Druckplatte im Boden: Rollt der Ball darüber, drückt es die Flut für eine
   Weile um ein paar Stufen zurück. Es ist das Gegenstück zum Schalter im Märchenland – nur öffnet
   es kein Tor, sondern gibt Boden zurück.

   Es liegt mit Absicht weit außen, dort, wo das Wasser zuerst hinkommt. Nicht, damit man ins Nasse
   muß – im Nassen geht man unter, dorthin kann man gar nicht –, sondern damit es ein *Fenster* ist:
   Solange die Flut niedrig steht, ist die Platte zu erreichen; steigt sie, verschwindet die Platte
   als erstes und ist bis zum Zurückgehen der Tide weg. Wer sie nutzen will, muß früh hin, und der
   Weg dorthin führt vom Loch weg.
*/
const FLUT_START = 9;            // Sekunden Ruhe, bevor das Wasser überhaupt steigt
const FLUT_TAKT = 4.5;           // Sekunden von einer Stufe zur nächsten – beim Steigen wie beim Fallen
const FLUT_MAX = 4;              // so viele Ringe frißt sie höchstens – mehr, und von einer Bahn bliebe nur eine Linie
const FLUT_HALT = 7;             // so lange steht das Wasser oben bzw. unten still
const PUMPE_DAUER = 7;           // so lange hält das Pumpwerk die Flut zurück
const PUMPE_STUFEN = 2;          // um so viele Ringe drückt es sie zurück

class Flut {
  constructor(d) {
    Object.assign(this, { start: FLUT_START, takt: FLUT_TAKT, max: FLUT_MAX, halt: FLUT_HALT, ebene: 0 }, d);
    this.type = 'flut';
    this.stufe = 0; this.ringe = null; this.urspruenglich = null; this.bis = 0; this.t = 0;
    this.steigt = true; this.wechsel = Infinity;
  }
  flaeche() {
    const lv = this.level;
    return lv && lv.flaechen ? (lv.flaechen[this.ebene || 0] || lv.flaechen[0]) : null;
  }
  /* Ringnummern rechnen: Vielquellen-Breitensuche von allem, was schon jetzt kein trockener Boden
     ist – Wasser, Glut, Abgrund, Mauer, und alles außerhalb der Karte. */
  setup(level) {
    this.level = level;
    const fl = this.flaeche(); if (!fl) return;
    const H = fl.tiles.length, W = fl.tiles[0].length;
    this.urspruenglich = fl.tiles.map(r => r.slice());
    const trocken = (x, y) => x >= 0 && y >= 0 && x < W && y < H
      && level.isFloorChar(fl.tiles[y][x]) && fl.tiles[y][x] !== 'w' && fl.tiles[y][x] !== 'l';
    const ringe = Array.from({ length: H }, () => new Array(W).fill(0));
    const q = [];
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (trocken(x, y)) continue;
      ringe[y][x] = 0; q.push([x, y]);
    }
    // Der Rand der Karte zählt als Quelle: eine Bahn, die bis zum Rand geht, säuft von dort ab
    for (let x = 0; x < W; x++) { if (trocken(x, 0)) { ringe[0][x] = 1; q.push([x, 0]); } if (trocken(x, H - 1)) { ringe[H - 1][x] = 1; q.push([x, H - 1]); } }
    for (let y = 0; y < H; y++) { if (trocken(0, y)) { ringe[y][0] = 1; q.push([0, y]); } if (trocken(W - 1, y)) { ringe[y][W - 1] = 1; q.push([W - 1, y]); } }
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= W || ny >= H) continue;
        if (!trocken(nx, ny) || ringe[ny][nx]) continue;
        ringe[ny][nx] = ringe[y][x] + 1;
        q.push([nx, ny]);
      }
    }
    this.ringe = ringe;
    /* Abschlag und Loch bleiben trocken – sie bekommen eine Ringnummer, die die Flut nie erreicht. */
    const schuetzen = [level.tee, level.cup].filter(Boolean);
    for (const p of schuetzen) {
      const x = Math.floor(p.x), y = Math.floor(p.y);
      if (y >= 0 && y < H && x >= 0 && x < W) ringe[y][x] = 9999;
    }
    this.stufe = 0; this.bis = 0;
    this.schreiben(0);
  }
  /* Die Kacheln auf eine Stufe bringen. Über der Stufe steht wieder, was ursprünglich dastand –
     so kann das Pumpwerk die Flut auch zurücknehmen. */
  schreiben(stufe) {
    const fl = this.flaeche(); if (!fl || !this.ringe || !this.urspruenglich) return;
    for (let y = 0; y < fl.tiles.length; y++) for (let x = 0; x < fl.tiles[y].length; x++) {
      const r = this.ringe[y][x];
      if (!r || r > 9000) continue;                       // nie trocken gewesen, oder geschützt
      fl.tiles[y][x] = r <= stufe ? 'w' : this.urspruenglich[y][x];
    }
  }
  /* Ein voller Tidenlauf: steigen – oben stehen – fallen – unten stehen. Der Rest der Klasse
     kennt davon nur das Ergebnis, eine Stufe; alles Weitere hängt an diesen vier Abschnitten. */
  zyklus() { return 2 * this.max * this.takt + 2 * this.halt; }
  update(t) {
    this.t = t;
    let soll = 0;
    if (t < this.start) {
      // Vor dem ersten Steigen: Das Wasser steht unten, und es kommt – darum 'steigt'.
      this.steigt = true; this.wechsel = this.start - t;
    } else {
      const hoch = this.max * this.takt;
      const p = (t - this.start) % this.zyklus();
      if (p < hoch) {                                   // steigen
        const k = Math.floor(p / this.takt);
        soll = k + 1; this.steigt = true; this.wechsel = (k + 1) * this.takt - p;
      } else if (p < hoch + this.halt) {                // oben stehen
        soll = this.max; this.steigt = false; this.wechsel = hoch + this.halt - p;
      } else if (p < 2 * hoch + this.halt) {            // fallen
        const q = p - hoch - this.halt, k = Math.floor(q / this.takt);
        soll = this.max - (k + 1); this.steigt = false;
        this.wechsel = hoch + this.halt + (k + 1) * this.takt - p;
      } else {                                          // unten stehen
        soll = 0; this.steigt = true; this.wechsel = this.zyklus() - p;
      }
    }
    soll = Math.max(0, Math.min(this.max, soll));
    if (t < this.bis) soll = Math.max(0, soll - (this.rueck || 0));   // das Pumpwerk hält dagegen
    if (soll !== this.stufe) { this.stufe = soll; this.schreiben(soll); }
  }
  /* Wie lange noch, bis sich etwas ändert – dafür braucht die Zeichnung eine Zahl, damit sie das
     nächste Feld ankündigen kann, bevor es absäuft. Angekündigt wird nur, was steigt: Wasser, das
     zurückgeht, gibt Boden her und ist keine Gefahr. */
  naechsteIn() {
    if (this.steigt && this.stufe >= this.max) return Infinity;
    return this.wechsel;
  }
  /* Das Pumpwerk meldet sich hier – die Flut selbst entscheidet, wie weit sie zurückweicht. */
  zurueckdruecken(t, stufen, dauer) {
    this.rueck = Math.max(this.rueck || 0, stufen);
    this.bis = Math.max(this.bis, t + dauer);
    this.update(t);
  }
}

/* Das Pumpwerk: eine Druckplatte, die die Flut zurückdrängt. Anders als der Schalter im
   Märchenland öffnet sie kein Tor, sondern gibt Boden zurück – und sie wirkt auf die ganze Bahn,
   nicht auf eine Stelle. Sie steht weit außen und säuft darum früh ab: Sie ist ein Zeitfenster,
   kein Schalter, der immer dasteht (siehe oben). */
class Pumpwerk {
  constructor(d) {
    Object.assign(this, { r: 0.6, stufen: PUMPE_STUFEN, dauer: PUMPE_DAUER, ebene: 0 }, d);
    this.type = 'pumpwerk';
    this.laeuftBis = 0; this.letzte = -99;
  }
  setup(level) { this.level = level; this.laeuftBis = 0; this.letzte = -99; }
  update(t) { this.t = t; this.an = t < this.laeuftBis; }
  trigger(ball, t, events) {
    if (ball.rider || ball.sunk) return;
    if (t - this.letzte < 1.0) return;                    // nicht bei jedem Bildschritt neu
    if (Math.hypot(ball.x - this.x, ball.y - this.y) > this.r + (ball.r || 0.22)) return;
    this.letzte = t; this.laeuftBis = t + this.dauer;
    const flut = (this.level.obstacles || []).find(o => o.type === 'flut');
    if (flut) flut.zurueckdruecken(t, this.stufen, this.dauer);
    events.push({ type: 'pumpe', x: this.x, y: this.y, dauer: this.dauer });
  }
}
