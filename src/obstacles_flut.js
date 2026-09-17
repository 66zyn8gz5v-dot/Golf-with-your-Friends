/* Das Flutbecken und das Pumpwerk – die Maschinen der versunkenen Stadt.

   ERST WAR ES EINE WELTREGEL, UND DAS WAR EIN FEHLER.
   In der ersten Fassung stieg das Wasser auf der *ganzen* Bahn: eine Tide über alles, gut gedacht
   und schlecht zu spielen. Wer den Augenblick verpaßte, konnte nichts tun als warten, bis das
   Wasser wieder zurückging – eine halbe Minute, in der der Ball liegt und nichts passiert. Das ist
   kein Druck, das ist Leerlauf, und Leerlauf ist das Gegenteil von dem, was die Idee wollte.

   Jetzt ist es ein Hindernis wie jedes andere: ein BECKEN an einer Stelle der Bahn, mit einem Takt
   von ein paar Sekunden. Ringsum bleibt alles trocken und immer spielbar; nur der Weg *durch* das
   Becken öffnet und schließt sich – so wie das Wandertor, die Falltür oder das Mühlrad. Man wartet
   Sekunden, nicht eine halbe Minute, und man kann in der Zwischenzeit etwas anderes tun.

   WIE DAS BECKEN VOLLÄUFT
   Es läuft von seinem Rand nach innen voll und folgt dabei seiner Form. Jedes Bodenfeld im Becken
   bekommt beim Aufbau eine Ringnummer: 1 für alles, was an den Beckenrand (oder an Wasser, Abgrund,
   Mauer) grenzt, 2 für alles, was an einen Einser grenzt, und so weiter. Steht das Wasser auf Stufe
   n, ist jedes Feld mit Ringnummer <= n überflutet.

   Das ist mehr als Bequemlichkeit: Ein Becken muß nicht von Hand geflutet werden, und es tut auf
   jeder Form das Richtige. Eine schmale Rinne säuft von beiden Seiten zu, ein runder Kessel von
   außen – ohne daß jemand das aufschreiben müßte.

   WIE TIEF, UND DARUM WIE LANGE
   Ohne Angabe füllt sich ein Becken ganz: 'max' ist die tiefste Ringnummer, die darin vorkommt.
   Daraus ergibt sich von selbst der Takt der Maschine – ein schmales Becken ist schnell voll und
   schnell wieder leer, ein breites braucht länger. **Wer ein breites Becken baut, baut eine lange
   Wartezeit**, und genau das war der Fehler von vorhin. tools/flut.py rechnet darum für jede Bahn
   die Zykluslänge aus und schlägt Alarm, wenn sie über FLUT_GEDULD geht.

   DER TAKT
   Steigen – oben stehen – fallen – unten stehen, dann von vorn. Daß es auch wieder fällt, ist die
   Bedingung dafür, daß eine Bahn lösbar bleibt: Über Wasser rollen heißt versinken, und ein Becken,
   das zubleibt, wäre eine Mauer und keine Maschine.

   DER RÜCKWEG
   Das PUMPWERK ist eine Druckplatte: Rollt der Ball darüber, hält es die Becken der Bahn für eine
   Weile leer. Es ist das Gegenstück zum Schalter im Märchenland – nur öffnet es kein Tor, sondern
   gibt Boden zurück. */
const FLUT_START = 2.5;          // Sekunden, bis das Becken zum ersten Mal steigt
const FLUT_TAKT = 1.2;           // Sekunden je Ring, beim Steigen wie beim Fallen
const FLUT_MAX = 4;              // tiefer als vier Ringe läuft kein Becken – sonst wird das Warten lang
const FLUT_HALT = 1.0;           // so lange steht das Becken voll
/* Und so lange leer. Das ist das Fenster, in dem man durchspielt, und es muß großzügig sein: Ein
   Ball braucht vom Abschlag bis zum Becken schon ein, zwei Sekunden. Beim ersten Versuch stand
   hier 3,2 – die Browserprobe ertrank damit auch dann, wenn beim Schlag alles frei war. */
const FLUT_LEER = 5.0;
const PUMPE_DAUER = 4;           // so lange hält das Pumpwerk die Becken leer
const PUMPE_STUFEN = 9;          // und zwar ganz – weniger wäre bei einem kleinen Becken nicht zu sehen

class Flut {
  constructor(d) {
    Object.assign(this, { w: 6, h: 6, start: FLUT_START, takt: FLUT_TAKT, halt: FLUT_HALT,
                          leer: FLUT_LEER, ebene: 0 }, d);
    this.type = 'flut';
    this.stufe = 0; this.ringe = null; this.urspruenglich = null; this.bis = 0; this.t = 0;
    this.steigt = true; this.wechsel = Infinity;
    this.maxWunsch = d && d.max;       // vom Bahnbauer gewünschte Tiefe, sonst so tief wie das Becken
  }
  flaeche() {
    const lv = this.level;
    return lv && lv.flaechen ? (lv.flaechen[this.ebene || 0] || lv.flaechen[0]) : null;
  }
  /* Das Becken in Kachelkoordinaten: von x0 bis einschließlich x1. */
  grenzen() {
    return {
      x0: Math.round(this.x - this.w / 2), x1: Math.round(this.x + this.w / 2) - 1,
      y0: Math.round(this.y - this.h / 2), y1: Math.round(this.y + this.h / 2) - 1,
    };
  }
  imBecken(x, y) {
    const g = this.grenzen();
    return x >= g.x0 && x <= g.x1 && y >= g.y0 && y <= g.y1;
  }
  /* Ringnummern rechnen: Vielquellen-Breitensuche vom Beckenrand nach innen. Quelle ist alles, was
     schon jetzt kein trockener Boden ist – und alles außerhalb des Beckens. Damit hört die Flut am
     Beckenrand auf, und der Rest der Bahn bleibt in Ruhe. */
  setup(level) {
    this.level = level;
    const fl = this.flaeche(); if (!fl) return;
    const H = fl.tiles.length, W = fl.tiles[0].length;
    this.urspruenglich = fl.tiles.map(r => r.slice());
    const trocken = (x, y) => x >= 0 && y >= 0 && x < W && y < H && this.imBecken(x, y)
      && level.isFloorChar(fl.tiles[y][x]) && fl.tiles[y][x] !== 'w' && fl.tiles[y][x] !== 'l';
    const ringe = Array.from({ length: H }, () => new Array(W).fill(0));
    const q = [];
    /* Startfelder: alles im Becken, das an etwas Nicht-Trockenes oder an den Beckenrand grenzt. */
    for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
      if (!trocken(x, y)) continue;
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        if (trocken(x + dx, y + dy)) continue;
        ringe[y][x] = 1; q.push([x, y]); break;
      }
    }
    for (let i = 0; i < q.length; i++) {
      const [x, y] = q[i];
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (!trocken(nx, ny) || ringe[ny][nx]) continue;
        ringe[ny][nx] = ringe[y][x] + 1;
        q.push([nx, ny]);
      }
    }
    this.ringe = ringe;
    /* Die Tiefe des Beckens bestimmt den Takt: So tief, wie es wirklich ist – höchstens FLUT_MAX,
       damit ein versehentlich riesiges Becken nicht zur Wartehalle wird. */
    let tief = 0;
    for (const zeile of ringe) for (const r of zeile) if (r > tief) tief = r;
    this.tiefe = tief;
    this.max = Math.max(1, Math.min(this.maxWunsch || tief, FLUT_MAX));
    /* Abschlag und Loch bleiben trocken, falls sie doch einmal im Becken liegen – ein Loch unter
       Wasser wäre keine Aufgabe, sondern das Ende der Bahn. */
    for (const p of [level.tee, level.cup].filter(Boolean)) {
      const x = Math.floor(p.x), y = Math.floor(p.y);
      if (y >= 0 && y < H && x >= 0 && x < W) ringe[y][x] = 9999;
    }
    this.stufe = 0; this.bis = 0;
    this.schreiben(0);
  }
  /* Die Kacheln auf eine Stufe bringen. Über der Stufe steht wieder, was ursprünglich dastand –
     so kann das Becken auch wieder leerlaufen. */
  schreiben(stufe) {
    const fl = this.flaeche(); if (!fl || !this.ringe || !this.urspruenglich) return;
    for (let y = 0; y < fl.tiles.length; y++) for (let x = 0; x < fl.tiles[y].length; x++) {
      const r = this.ringe[y][x];
      if (!r || r > 9000) continue;                       // nie trocken gewesen, oder geschützt
      fl.tiles[y][x] = r <= stufe ? 'w' : this.urspruenglich[y][x];
    }
  }
  /* Ein voller Lauf: steigen – voll stehen – fallen – leer stehen. Das ist zugleich die Zahl, an
     der sich entscheidet, ob die Bahn Spaß macht: Sie ist die längste Zeit, die man je wartet.
     Leer steht es länger als voll: Das Leerstehen ist das Fenster, in dem man durchspielt, und ein
     Fenster, das zu schmal ist, verlangt Glück statt Können. */
  zyklus() { return 2 * (this.max || 1) * this.takt + this.halt + this.leer; }
  update(t) {
    this.t = t;
    let soll = 0;
    if (t < this.start) {
      this.steigt = true; this.wechsel = this.start - t;
    } else {
      const hoch = (this.max || 1) * this.takt;
      const p = (t - this.start) % this.zyklus();
      if (p < hoch) {                                   // steigen
        const k = Math.floor(p / this.takt);
        soll = k + 1; this.steigt = true; this.wechsel = (k + 1) * this.takt - p;
      } else if (p < hoch + this.halt) {                // voll stehen
        soll = this.max; this.steigt = false; this.wechsel = hoch + this.halt - p;
      } else if (p < 2 * hoch + this.halt) {            // fallen
        const q = p - hoch - this.halt, k = Math.floor(q / this.takt);
        soll = this.max - (k + 1); this.steigt = false;
        this.wechsel = hoch + this.halt + (k + 1) * this.takt - p;
      } else {                                          // leer stehen
        soll = 0; this.steigt = true; this.wechsel = this.zyklus() - p;
      }
    }
    soll = Math.max(0, Math.min(this.max || 1, soll));
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
  /* Das Pumpwerk meldet sich hier – das Becken selbst entscheidet, wie weit es zurückweicht. */
  zurueckdruecken(t, stufen, dauer) {
    /* Kein Aufaddieren über mehrere Drücke: Es gilt immer der letzte Druck. Sonst bliebe die
       stärkste je gedrückte Stufe für den Rest der Bahn stehen, auch wenn später schwächer
       gepumpt wird – ein Fehler, den man erst bemerkt, wenn es zu spät ist. */
    this.rueck = stufen;
    this.bis = Math.max(this.bis, t + dauer);
    this.update(t);
  }
}

/* Das Pumpwerk: eine Druckplatte, die die Becken der Bahn leerhält. Anders als der Schalter im
   Märchenland öffnet sie kein Tor, sondern gibt Boden zurück – und sie wirkt auf alle Becken der
   Bahn, nicht auf eines. Wer sie trifft, hat für ein paar Sekunden freie Bahn durchs Becken;
   dafür liegt sie abseits, und der Weg dorthin kostet einen Schlag. */
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
    for (const o of this.level.obstacles || []) if (o.type === 'flut') o.zurueckdruecken(t, this.stufen, this.dauer);
    events.push({ type: 'pumpe', x: this.x, y: this.y, dauer: this.dauer });
  }
}
