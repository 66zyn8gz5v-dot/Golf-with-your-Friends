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

/* ---------------------------------------------------------------------------
   Die Strömung
   ---------------------------------------------------------------------------
   Das Wasser steht nicht still. Eine Strömung ist ein Band, durch das es zieht, und sie ist der
   Wind dieser Welt – nur stärker, und mit einem Unterschied, an dem alles hängt:

   SIE TRÄGT AUCH, WER LIEGT. Der Wind im Schneeberg versetzt einen rollenden Ball; wer liegt, liegt.
   Hier nicht. Wer in der Strömung zur Ruhe kommt, bleibt nicht liegen, sondern treibt ab – man kann
   darin nicht in Ruhe zielen. Das ist der ganze Punkt, und es ist auch der Grund für die Zahl
   unten: Die Reibung auf Stein ist 4,2 Kacheln/s², und eine Kraft *darunter* bewegt einen
   liegenden Ball GAR NICHT (sie wird von der Reibung glattweg aufgefressen). Eine Strömung, die
   nicht spürbar über der Reibung liegt, wäre also gar keine. Dieselbe Falle hat schon die
   Kippbühne der Zwergenmine zu Fall gebracht.

   SIE BESCHLEUNIGT NICHT INS UNENDLICHE. Sie zieht den Ball auf ihr eigenes Tempo und dann nicht
   weiter – wie echtes Wasser. Ohne diese Schranke würde ein Ball, der lange genug im Band liegt,
   quer über die Bahn geschossen, und das wäre kein Hindernis mehr, sondern eine Kanone. */
const STROM_KRAFT = 13.0;        // Kacheln/s² – das Dreifache der Reibung 4,2. Sie soll nicht
                                 // „auch ein bißchen" tragen, sondern mitnehmen.
const STROM_TEMPO = 8.5;         // auf dieses Tempo zieht sie den Ball, und nicht schneller

class Stroemung {
  constructor(d) {
    Object.assign(this, { w: 4, h: 4, angle: 0, kraft: STROM_KRAFT, tempo: STROM_TEMPO,
                          puls: 0, phase: 0, ebene: 0 }, d);
    this.type = 'stroemung';
    const a = (this.angle * Math.PI) / 180;
    this.dx = Math.cos(a); this.dy = Math.sin(a);
    this.alwaysForce = true;       // der Unterschied zum Wind: sie greift auch einen ruhenden Ball
    this.k = 1;
  }
  inside(px, py) {
    return Math.abs(px - this.x) <= this.w / 2 && Math.abs(py - this.y) <= this.h / 2;
  }
  /* puls > 0: eine Dünung statt eines gleichmäßigen Zuges – sie schwillt an und ab, und dazwischen
     ist für einen Augenblick Ruhe. Damit wird aus der Strömung eine Frage des Zeitpunkts.
     'puls' ist die Winkelgeschwindigkeit: ein voller Wellengang dauert 2π/puls Sekunden.

     DIE FORM DER WELLE IST NICHT EGAL. Zuerst stand hier max(0, sin)² – dieselbe Formel wie beim
     Windstoß im Märchenland. Damit steht die Strömung die *halbe* Zeit still (der Sinus ist die
     halbe Periode lang negativ), und bei einem gemächlichen Puls sind das sechs Sekunden am
     Stück. Im Browser sah es aus, als sei die Strömung kaputt; in Wahrheit war gerade Flaute.
     Jetzt wird die Welle gestaucht: Ruhe nur im untersten Drittel, volle Kraft im obersten.
     Die Flaute ist damit das Zeitfenster und nicht der Normalzustand. */
  update(t) {
    this.t = t;
    if (!this.puls) { this.k = 1; return; }
    const w = 0.5 + 0.5 * Math.sin(t * this.puls + this.phase);      // 0 … 1
    this.k = Math.max(0, Math.min(1, (w - 0.25) / 0.55));
  }
  force(ball, dt) {
    if (ball.air || ball.rider || ball.sunk) return;
    if (this.k <= 0.01 || !this.inside(ball.x, ball.y)) return;
    /* Nur bis auf das eigene Tempo beschleunigen: Was der Ball quer dazu tut, bleibt seine Sache.

       DIE DÜNUNG ÄNDERT DAS ZIELTEMPO, NICHT DIE KRAFT. Das ist keine Feinheit, sondern wieder die
       Reibungsfalle: Stünde hier 'kraft * k', dann läge die Strömung bei halber Welle
       (13 × 0,32 = 4,16) unter der Reibung auf Stein (4,2) – und eine Kraft unter der Reibung
       bewegt einen liegenden Ball GAR NICHT. Die halbe Welle über täte die Maschine dann nichts,
       und im Browser sähe es aus, als sei sie kaputt. Genau so ist es passiert.
       Jetzt schiebt sie immer mit voller Kraft, nur eben auf ein kleineres Ziel: Bei schwacher
       Dünung treibt man langsam, bei starker schnell – und bei Flaute gar nicht, weil das Ziel
       null ist. */
    const laengs = ball.vx * this.dx + ball.vy * this.dy;
    const ziel = this.tempo * this.k;
    if (laengs >= ziel) return;
    const zu = Math.min(this.kraft * dt, ziel - laengs);
    ball.vx += this.dx * zu; ball.vy += this.dy * zu;
  }
}

/* ---------------------------------------------------------------------------
   Der Strudel
   ---------------------------------------------------------------------------
   Wo zwei Strömungen aufeinandertreffen, dreht sich das Wasser. Ein Strudel packt den Ball und
   führt ihn im Kreis – nicht als Strafe, sondern als Umleitung: Wer hineinfährt, kommt woanders
   wieder heraus, als er wollte.

   ER FÄNGT NICHT EIN, und das ist mit Absicht so gebaut. Der erste Entwurf zog außen nach innen und
   drückte innen wieder heraus – zwei Kräfte, die sich bei etwa zwei Dritteln des Halbmessers
   aufhoben. Der Ball kreiste dort und kam nicht mehr los; nach vier Sekunden nahm ihn die Notbremse
   des Spiels heraus. Eine Maschine, aus der einen die Notbremse befreien muß, ist kaputt.

   Jetzt drückt er überall ein wenig nach außen. Damit ist er kein Trichter, sondern ein
   Schleuderrad: Wer hineinfährt, wird herumgeführt und wieder hinausgeworfen – bloß woandershin,
   als er wollte. Das ist die Umleitung, um die es geht, und sie hat keinen Haken. */
const STRUDEL_KRAFT = 8.0;

class Strudel {
  constructor(d) {
    Object.assign(this, { r: 2.4, kraft: STRUDEL_KRAFT, dreh: 1, ebene: 0 }, d);
    this.type = 'strudel';
    this.alwaysForce = true;
  }
  update(t) { this.t = t; }
  force(ball, dt) {
    if (ball.air || ball.rider || ball.sunk) return;
    const dx = ball.x - this.x, dy = ball.y - this.y;
    const d = Math.hypot(dx, dy);
    if (d > this.r) return;
    const e = Math.max(0.08, d), ux = dx / e, uy = dy / e;
    const u = 1 - d / this.r;                       // 0 am Rand, 1 in der Mitte
    /* Im Kreis: der eigentliche Zug. Der Faktor wächst nach innen, sonst dreht der Rand genauso
       schnell wie die Mitte und es sieht aus wie ein Karussell aus Pappe. */
    const tx = -uy * this.dreh, ty = ux * this.dreh;
    /* Und quer dazu: immer ein Stück nach außen. Das ist es, was ihn zum Schleuderrad macht statt
       zum Trichter – jeder Ball, der hineingerät, kommt auch wieder heraus (tools/flut.mjs rechnet
       das nach, mit einem Ball, der ohne Schwung fast in der Mitte liegt). */
    const radial = -0.4;
    const f = this.kraft * (0.3 + 0.7 * u) * dt;
    ball.vx += (tx - ux * radial) * f;
    ball.vy += (ty - uy * radial) * f;
  }
}

/* ---------------------------------------------------------------------------
   Der Anglerfisch
   ---------------------------------------------------------------------------
   Er schwimmt seine Strecke ab, hin und zurück, und hält die Laterne vor sich her. Wer sich von
   ihr einfangen läßt, zahlt einen Schlag und wird an den Anfang des letzten Schlags zurückgelegt.

   ER IST DAS ERSTE HINDERNIS DIESER WELT, DAS EINEN SUCHT. Becken, Strömung und Strudel stehen da,
   wo sie stehen – man kann ihnen ausweichen und danach in Ruhe zielen. Der Angler kommt zu einem
   hin. Ein liegender Ball ist vor ihm nicht sicher, und darum wird aus „ich warte auf den richtigen
   Augenblick" ein „ich muß hier weg, bevor er da ist".

   ER SCHWIMMT GLEICHMÄSSIG, nicht in einer Sinusschwingung wie die Lore. Ein Fisch, der an den
   Enden langsamer wird und in der Mitte rast, sieht aus wie ein Pendel; und wichtiger: Man könnte
   sein Tempo nicht abschätzen, und genau das soll man können. Ein Dreieck statt eines Cosinus.

   DIE LATERNE IST NICHT NUR SCHMUCK. Auf dem Meeresgrund ist sie das hellste auf der Bahn – man
   sieht ihn kommen, bevor man ihn sieht. Das ist dieselbe Regel wie überall hier: Die Ansage geht
   der Gefahr voraus. */
const ANGLER_TEMPO = 2.2;        // Kacheln je Sekunde – schneller als ein Spaziergang, langsamer als ein Putt
const ANGLER_FANG = 0.62;        // so nah muß er kommen
const ANGLER_LICHT = 3.6;        // so weit trägt seine Laterne

class Anglerfisch {
  constructor(d) {
    Object.assign(this, { x0: 0, y0: 0, x1: 0, y1: 0, tempo: ANGLER_TEMPO, r: ANGLER_FANG,
                          licht: ANGLER_LICHT, phase: 0, ebene: 0 }, d);
    this.type = 'angler';
    this.laenge = Math.hypot(this.x1 - this.x0, this.y1 - this.y0) || 1;
    this.x = this.x0; this.y = this.y0; this.dx = 1; this.dy = 0;
    this.update(0);
  }
  setup(level) { this.level = level; }
  update(t) {
    this.t = t;
    const strecke = this.laenge / this.tempo;               // eine Richtung
    const u = (((t / (2 * strecke) + this.phase) % 1) + 1) % 1;
    /* Dreieck statt Cosinus: gleichmäßiges Tempo hin wie zurück. */
    const s = u < 0.5 ? u * 2 : 2 - u * 2;
    this.x = this.x0 + (this.x1 - this.x0) * s;
    this.y = this.y0 + (this.y1 - this.y0) * s;
    const vor = u < 0.5 ? 1 : -1;
    this.dx = ((this.x1 - this.x0) / this.laenge) * vor;
    this.dy = ((this.y1 - this.y0) / this.laenge) * vor;
    this.u = s;
  }
  /* Kein airTrigger: Er schwimmt am Grund. Wer über ihn hinwegfliegt, kommt davon – das ist die
     Belohnung für einen Sprung und der einzige Weg, ihn zu überspielen. */
  trigger(ball, t, events) {
    if (ball.sunk || ball.rider || ball.air) return;
    if (Math.hypot(ball.x - this.x, ball.y - this.y) > this.r + (ball.r || 0.22)) return;
    events.push({ type: 'angler', x: ball.x, y: ball.y });
  }
}

/* ---------------------------------------------------------------------------
   Die Riesenmuschel
   ---------------------------------------------------------------------------
   Sie öffnet und schließt sich im Takt, und je nachdem ist sie zwei völlig verschiedene Dinge:

     GESCHLOSSEN ist sie eine Mauer. Ein runder Klotz im Weg, von dem der Ball abprallt.
     OFFEN ist sie ein Maul. Wer hineinrollt, wird verschluckt, kurz festgehalten und dann mit
     Schwung in ihre Blickrichtung wieder ausgespuckt.

   Damit ist sie Hindernis und Abkürzung in einem, und was von beidem, entscheidet der Zeitpunkt –
   dieselbe Frage wie beim Flutbecken, nur andersherum: Dort ist der Weg offen, wenn es leer ist;
   hier hilft sie, wenn sie offen ist.

   SIE SCHIEBT, SIE SCHIESST NICHT. Die Kanone im Märchenland wirft den Ball durch die Luft; hier
   unten gäbe es dafür keine Erklärung, und vor allem flöge er damit über alles hinweg, was diese
   Welt ausmacht. Die Muschel gibt ihm Schwung am Boden – schnell, aber am Boden.

   WER GERADE DARIN LIEGT, WIRD NICHT ZERQUETSCHT. Sie nimmt den Ball schon, wenn sie erst zu einem
   Drittel offen ist, und sie ist keine Mauer, solange sie ihn hält. Sonst gäbe es den Fall „die
   Muschel schließt sich genau auf dem Ball", und der hätte keine gute Auflösung: Entweder würde er
   herausgedrückt (dann sieht es kaputt aus) oder er steckte fest (dann ist es kaputt). */
const MUSCHEL_TAKT = 5.5;        // Sekunden für ein ganzes Auf und Zu
const MUSCHEL_OFFEN = 0.45;      // so viel davon steht sie offen
const MUSCHEL_HALT = 1.0;        // so lange behält sie den Ball
const MUSCHEL_TEMPO = 9.5;       // und so schnell gibt sie ihn wieder her

class Riesenmuschel {
  constructor(d) {
    Object.assign(this, { r: 1.05, takt: MUSCHEL_TAKT, offen: MUSCHEL_OFFEN, halt: MUSCHEL_HALT,
                          tempo: MUSCHEL_TEMPO, angle: 0, phase: 0, ebene: 0 }, d);
    this.type = 'muschel';
    const a = (this.angle * Math.PI) / 180;
    this.dx = Math.cos(a); this.dy = Math.sin(a);
    this.p = 0; this.haelt = false;
    this.update(0);
  }
  setup(level) { this.level = level; this.haelt = false; }
  /* p: 0 ganz zu, 1 ganz offen. Die Flanken sind weich – eine Muschel, die springt, sieht aus wie
     eine Falltür mit Muschelmuster. */
  update(t) {
    this.t = t;
    const u = (((t / this.takt + this.phase) % 1) + 1) % 1;
    if (u < this.offen) {
      const q = u / this.offen;
      this.p = Math.max(0, Math.min(1, Math.min(q, 1 - q) / 0.2));
    } else this.p = 0;
    this.auf = this.p > 0.35;
  }
  /* Geschlossen ist sie ein Klotz. Offen nicht – sonst könnte man nie hineinrollen –, und während
     sie hält, auch nicht, sonst stieße der eigene Ball von außen gegen sein eigenes Gefängnis. */
  circles(out) {
    if (this.haelt || this.p > 0.4) return;
    out.push({ x: this.x, y: this.y, r: this.r * 0.88, e: 0.75, kind: 'muschel', owner: this });
  }
  ride(ball, t, events) {
    if (ball.rider === this) {
      ball.x = this.x; ball.y = this.y; ball.vx = 0; ball.vy = 0; ball.z = 0.3; ball.vz = 0;
      if (t >= ball.muschelAb) {
        ball.rider = null; ball.rideCd = 1.4; this.haelt = false;
        ball.x = this.x + this.dx * (this.r + 0.4);
        ball.y = this.y + this.dy * (this.r + 0.4);
        ball.z = 0;
        ball.vx = this.dx * this.tempo; ball.vy = this.dy * this.tempo;
        events.push({ type: 'muschel', x: this.x, y: this.y, aus: true });
        return false;
      }
      return true;
    }
    if (ball.rideCd > 0 || ball.air || ball.sunk) return false;
    if (this.p < 0.35) return false;
    if (Math.hypot(ball.x - this.x, ball.y - this.y) > this.r * 0.8) return false;
    ball.rider = this; ball.muschelAb = t + this.halt; this.haelt = true;
    ball.x = this.x; ball.y = this.y; ball.vx = 0; ball.vy = 0; ball.z = 0.3;
    events.push({ type: 'muschel', x: this.x, y: this.y, aus: false });
    return true;
  }
}

/* ---------------------------------------------------------------------------
   Der Tangwald
   ---------------------------------------------------------------------------
   Ein Streifen Tang quer über den Steg. Er hält nicht auf – man kommt immer hindurch –, aber er
   bremst hart, und zwar genau dort, wo die Halme gerade stehen.

   ER IST DAS GEGENTEIL EINER MAUER, und darum gehört er in diese Welt. Mauern hat jede Welt;
   was hier fehlte, war ein Hindernis, das den *Schwung* nimmt statt den Weg. Wer zu zaghaft
   spielt, bleibt im Tang stecken und liegt mitten darin – und dort liegen ist unangenehm, weil man
   von dort keinen guten Schlag mehr hat.

   DIE LÜCKE WANDERT. Die Halme schwingen im Wellengang hin und her, und zwischen ihnen bleibt ein
   Gang frei, der mitwandert. Wer ihn trifft, rollt fast ungebremst hindurch; wer danebenhält, wird
   ausgebremst. Damit ist der Tangwald kein Zufall, sondern eine Frage des Zeitpunkts – dieselbe
   Frage wie überall in dieser Welt, nur sanfter gestellt: Er kostet keinen Schlag, nur Weg.

   GEBREMST WIRD ÜBER DIE GESCHWINDIGKEIT, NICHT ÜBER DIE REIBUNG. Die Reibung des Bodens wäre der
   naheliegende Weg – und der falsche: Sie hängt an der Kachel, und ein Streifen, der die Kacheln
   ändert, würde mit dem Flutbecken streiten, das dieselben Kacheln beschreibt. Zwei Maschinen, die
   sich dieselbe Karte teilen, gehen beim dritten Zusammentreffen kaputt. */
/* So viel vom Tempo bleibt nach einer Sekunde im dichtesten Tang. Die Zahl sieht klein aus und ist
   es auch: Ein Ball durchquert einen drei Kacheln breiten Streifen in etwa einem Drittel einer
   Sekunde, und 0,03 hoch ein Drittel sind rund 0,31 – er kommt also mit knapp einem Drittel seines
   Tempos heraus. Mit dem ersten Wert (0,82) war es ein Hundertstel davon, und die Prüfung „wer
   danebenhält, bleibt stecken" fand keinen Unterschied zum freien Weg. */
const TANG_BREMSE = 0.03;
const TANG_TAKT = 3.4;           // Sekunden für ein Hin und Her der Halme
const TANG_GASSE = 0.34;         // so breit ist die Lücke, gemessen am Streifen

class Tangwald {
  constructor(d) {
    Object.assign(this, { w: 3, h: 6, bremse: TANG_BREMSE, takt: TANG_TAKT, gasse: TANG_GASSE,
                          phase: 0, ebene: 0 }, d);
    this.type = 'tangwald';
    this.alwaysForce = true;       // auch ein liegender Ball steckt im Tang – er soll es merken
    /* Die Lücke wandert quer zum Weg, also entlang der LANGEN Achse des Streifens. Ein Streifen,
       der breiter als hoch ist, liegt längs der x-Achse; einer, der höher als breit ist, längs y.
       Beim ersten Versuch war das Zeichen vertauscht, und die Lücke wanderte in Laufrichtung – der
       Tang war dann überall gleich dicht, und die Maschine tat nichts. */
    this.laengsY = this.h >= this.w;
    this.update(0);
  }
  inside(px, py) {
    return Math.abs(px - this.x) <= this.w / 2 && Math.abs(py - this.y) <= this.h / 2;
  }
  /* Wo steht die Lücke gerade? Als Anteil -0,5 … 0,5 quer zum Streifen. */
  update(t) {
    this.t = t;
    this.mitte = 0.34 * Math.sin((t / this.takt) * TAU + this.phase);
  }
  /* Wie dicht steht der Tang an dieser Stelle: 0 in der Lücke, 1 im dichtesten Halm. */
  dichte(px, py) {
    if (!this.inside(px, py)) return 0;
    const spanne = this.laengsY ? this.h : this.w;
    const u = ((this.laengsY ? py - this.y : px - this.x) / spanne) - this.mitte;
    const d = Math.abs(u) / (this.gasse / 2);
    return Math.max(0, Math.min(1, (d - 1) / 1.2));
  }
  force(ball, dt) {
    if (ball.air || ball.rider || ball.sunk) return;
    const d = this.dichte(ball.x, ball.y);
    if (d <= 0.01) return;
    /* Anteilig bremsen, nicht abziehen: Ein schneller Ball verliert viel, ein langsamer wenig.
       Zöge man einen festen Betrag ab, stünde er im Tang schlagartig still – das sähe aus wie eine
       Mauer, und eine Mauer soll er gerade nicht sein. */
    const halt = Math.pow(this.bremse, d * dt);
    ball.vx *= halt; ball.vy *= halt;
  }
}

/* ---------------------------------------------------------------------------
   Der Schwarze Raucher
   ---------------------------------------------------------------------------
   Eine heiße Quelle am Grund. Im Takt bricht sie aus und wirft alles, was darüber liegt, in hohem
   Bogen davon – über Mauern hinweg, über Becken, auf einen anderen Steg.

   ER IST DER AUFWIND DIESER WELT, mit einem Unterschied: Der Aufwind im Sturmhimmel braucht einen
   Ball, der mit Schwung hineinrollt, und trägt ihn in dessen eigener Richtung weiter. Der Raucher
   nimmt auch einen, der einfach nur daliegt, und wirft ihn immer dorthin, wohin er zeigt. Damit ist
   er kein Beschleuniger, sondern eine Fähre mit Fahrplan: Man legt sich darauf und wartet.

   DIE ANSAGE GEHT DEM AUSBRUCH VORAUS, wie überall hier. Vor dem Stoß sammelt sich der Schwall
   sichtbar im Schlot; wer erst beim Ausbruch merkt, daß gleich einer kommt, hat keine Wahl mehr
   gehabt, und eine Maschine ohne Wahl ist eine Falle. */
const RAUCHER_TAKT = 4.6;        // Sekunden von einem Ausbruch zum nächsten
const RAUCHER_STOSS = 0.5;       // so lange dauert der Ausbruch
const RAUCHER_WARN = 1.3;        // so lange vorher sieht man ihn kommen
const RAUCHER_WEITE = 6.0;       // so weit fliegt der Ball
const RAUCHER_TEMPO = 7.5;       // und so schnell

class SchwarzerRaucher {
  constructor(d) {
    Object.assign(this, { r: 1.0, takt: RAUCHER_TAKT, stoss: RAUCHER_STOSS, warn: RAUCHER_WARN,
                          weite: RAUCHER_WEITE, tempo: RAUCHER_TEMPO, angle: 0, phase: 0, ebene: 0 }, d);
    this.type = 'raucher';
    const a = (this.angle * Math.PI) / 180;
    this.dx = Math.cos(a); this.dy = Math.sin(a);
    this.bricht = false; this.p = 0; this.ansage = 0;
    this.update(0);
  }
  setup(level) { this.level = level; }
  update(t) {
    this.t = t;
    const u = (((t / this.takt + this.phase) % 1) + 1) % 1;
    const s = u * this.takt;                       // Sekunden seit dem letzten Ausbruchsbeginn
    this.bricht = s < this.stoss;
    this.p = this.bricht ? s / this.stoss : 0;
    /* Die Ansage: 0 bis 1 in den letzten 'warn' Sekunden vor dem nächsten Ausbruch. */
    const bisNaechster = this.takt - s;
    this.ansage = bisNaechster < this.warn ? 1 - bisNaechster / this.warn : 0;
  }
  /* launch ist derselbe Haken, den auch Rampe und Aufwind benutzen – er greift vor der Flugphase
     und vor allem vor der Reibung. Ein Wurf über 'force' wäre wieder die Reibungsfalle. */
  launch(ball, events, t) {
    if (ball.air || ball.rider || ball.sunk || !this.bricht) return;
    if (Math.hypot(ball.x - this.x, ball.y - this.y) > this.r) return;
    const flug = this.weite / this.tempo;
    ball.vx = this.dx * this.tempo; ball.vy = this.dy * this.tempo;
    ball.vz = (12 * flug) / 2; ball.z = Math.max(ball.z, 0.02); ball.air = true;
    events.push({ type: 'raucher', x: this.x, y: this.y });
  }
}

/* ---------------------------------------------------------------------------
   Die Ankerkette
   ---------------------------------------------------------------------------
   Ein Anker an einer Kette, der über den Steg schwingt. Er stößt wie das Pendel der Uhrwerkstadt –
   nur schwerer und langsamer, und das ist hier keine Geschmacksfrage: Auf einem drei Kacheln
   schmalen Steg über offenem Wasser reicht ein Stoß, um jemanden hinunterzuschicken. Ein schnelles
   Pendel wäre dort kein Hindernis, sondern ein Würfel.

   ER HÄNGT AN EINER AUFHÄNGUNG, nicht in der Luft. Die Kette wird mitgezeichnet, und daran sieht
   man, wo er gleich sein wird: Ein Anker, der scheinbar frei herumfliegt, hat keine Bahn, die man
   ablesen könnte. */
const KETTE_TAKT = 5.2;          // Sekunden für ein Hin und Zurück – langsam, damit man es lesen kann

class Ankerkette {
  constructor(d) {
    Object.assign(this, { len: 4.0, amp: 48, ruhe: 90, takt: KETTE_TAKT, phase: 0,
                          w: 1.5, h: 1.5, e: 0.45, hoehe: 0.9, ebene: 0 }, d);
    this.type = 'ankerkette';
    this.ax = this.x; this.ay = this.y;             // die Aufhängung bleibt stehen
    this.ampR = (this.amp * Math.PI) / 180;
    this.ruheR = (this.ruhe * Math.PI) / 180;
    this.omega = TAU / this.takt;
    this.update(0);
  }
  update(t) {
    const w = this.omega * t + this.phase * TAU;
    this.angle = this.ruheR + this.ampR * Math.sin(w);
    const dw = this.ampR * this.omega * Math.cos(w);
    this.x = this.ax + Math.cos(this.angle) * this.len;
    this.y = this.ay + Math.sin(this.angle) * this.len;
    this.vx = -Math.sin(this.angle) * this.len * dw;
    this.vy = Math.cos(this.angle) * this.len * dw;
    this.dir = Math.sign(dw) || 1;
    this.schwung = Math.abs(dw) / (this.ampR * this.omega || 1);
  }
  poly() { return rectPoly(this.x, this.y, this.w, this.h); }
  segments(out) { polySegments(this.poly(), out, { vx: this.vx, vy: this.vy, e: this.e, kind: 'mover', owner: this }); }
}

/* Das Wracktor – die Luke im Schiffsrumpf, die die Dünung auf- und zudrückt.

   ES IST EIN TOR UND EIN SCHLAG ZUGLEICH, UND DARIN LIEGT SEIN GANZER WITZ.
   Das Wandertor der Uhrwerkstadt geht auf und zu, das Pendel schlägt. Das Wracktor tut beides mit
   demselben Blatt, und zwar ungleich verteilt: Die Dünung drückt es **langsam** auf – über drei
   Sekunden, man sieht es kommen und hat Zeit, sich zu entscheiden – und sie schlägt es in einer
   halben Sekunde wieder zu. Dieselbe Bewegung, siebenmal so schnell.

   Daraus ergibt sich von selbst, was die Luke gefährlich macht: Wer im Durchgang steht, wenn sie
   zufällt, wird nicht eingeklemmt, sondern **weggeworfen** – das Blatt hat am Ende gut zehn Kacheln
   je Sekunde an der Spitze, und die gibt es weiter. Man muß nicht ausrechnen, wann sie zuschlägt;
   man muß nur hindurch sein, bevor sie es tut.

   WARUM EIN DREHENDES BLATT UND KEIN STEIGENDES GITTER
   Ein Fallgatter (die Luke des Uhrenturms) verschwindet nach oben und ist weg. Ein Türblatt ist
   auch offen noch da: Es liegt dann am Rumpf an und macht den Durchgang schmaler, als er aussieht.
   Wer zu dicht an der Wand vorbeispielt, stößt an – und das ist richtig so, denn eine Luke im
   Rumpf ist ein Loch in einer Wand und kein Tor in einem Zaun. */
const TOR_TAKT = 6.0;            // Sekunden für eine volle Dünung
const TOR_AUF = 0.50;            // so viel vom Takt drückt sie auf
const TOR_OFFEN = 0.24;          // so lange steht sie offen – das Fenster zum Durchspielen
const TOR_ZU = 0.10;             // und so kurz schlägt sie zu. Der Rest des Takts liegt sie zu.
const TOR_AMP = 88;              // Grad, um die das Blatt aufgeht: fast flach an den Rumpf

class Wracktor {
  constructor(d) {
    Object.assign(this, { len: 2.2, takt: TOR_TAKT, amp: TOR_AMP, zuWinkel: 0, phase: 0,
                          dick: 0.22, e: 0.45, hoehe: 1.1, ebene: 0, gegen: false }, d);
    this.type = 'wracktor';
    this.zuR = (this.zuWinkel * Math.PI) / 180;
    /* 'gegen' dreht die Öffnungsrichtung um – damit zwei Lukenflügel gegeneinander aufgehen können
       und der Bahnbauer nicht mit negativen Winkeln rechnen muß. */
    this.ampR = ((this.amp * Math.PI) / 180) * (this.gegen ? -1 : 1);
    this.ax = this.x; this.ay = this.y;            // die Angel bleibt stehen
    this.update(0);
  }
  setup(level) { this.level = level; }
  /* p: 0 ganz zu, 1 ganz offen. omega ist die echte Winkelgeschwindigkeit in rad/s – die Physik
     rechnet daraus den Stoß an jeder Stelle des Blattes aus (sie bekommt cx/cy und omega). */
  update(t) {
    this.t = t;
    const u = (((t / this.takt + this.phase) % 1) + 1) % 1;
    const bisOffen = TOR_AUF, bisZu = TOR_AUF + TOR_OFFEN, bisRuhe = bisZu + TOR_ZU;
    let p, dpdt;
    if (u < bisOffen) {                             // die Dünung drückt: weich an, weich aus
      const q = u / TOR_AUF;
      p = q * q * (3 - 2 * q);
      dpdt = (6 * q * (1 - q)) / (TOR_AUF * this.takt);
    } else if (u < bisZu) { p = 1; dpdt = 0; }      // offen
    else if (u < bisRuhe) {                          // und zurück: schnell und schneller werdend
      const q = (u - bisZu) / TOR_ZU;
      p = 1 - q * q;
      dpdt = (-2 * q) / (TOR_ZU * this.takt);
    } else { p = 0; dpdt = 0; }                      // zu
    this.p = p;
    this.oeffnet = u < bisOffen;
    this.schlaegt = u >= bisZu && u < bisRuhe;
    /* 'ruht' ist nicht dasselbe wie p === 0: Am letzten Bild des Zuschlagens ist p auch schon
       null, das Blatt aber noch in voller Fahrt. Wer wissen will, ob die Luke still liegt, muß
       den Takt fragen und nicht den Winkel. */
    this.ruht = u >= bisRuhe;
    this.angle = this.zuR + this.ampR * p;
    this.omega = this.ampR * dpdt;
    this.tipX = this.ax + Math.cos(this.angle) * this.len;
    this.tipY = this.ay + Math.sin(this.angle) * this.len;
  }
  segments(out) {
    out.push({ ax: this.ax, ay: this.ay, bx: this.tipX, by: this.tipY,
               rad: this.dick, omega: this.omega, cx: this.ax, cy: this.ay,
               e: this.e, kind: 'rotor', owner: this });
  }
}

/* Das Abflussrohr – die Kanalisation der versunkenen Stadt.

   ES IST DER VERWANDTE DES KUPFERROHRS, UND DER UNTERSCHIED IST ABSICHT.
   Die Rohrpost des Uhrenturms läuft **über** der Bahn und **außen um sie herum**: ein blankes
   Kupferrohr auf Stützen, in dem man den Ball fahren sieht. Sie ist ein Bauwerk, das jemand
   hingestellt hat, und sie zeigt stolz, was sie tut.

   Der Abfluß ist das Gegenteil. Er liegt **unter** dem Grund und läuft **geradeaus** – von der
   Einlaufkammer zum Auslauf, quer unter allem hindurch, was oben im Weg steht. Zu sehen ist von
   ihm nur die Naht im Boden: eine Reihe verrosteter Platten mit Nieten, und darin läuft, während
   eine Kugel darin unterwegs ist, eine Blase mit. Das ist die ganze Ansage, und sie genügt: Wer
   die Naht sieht, weiß, wo der Ball wieder herauskommt, bevor er hineinspielt.

   UND ER SPÜLT, ER TRÄGT NICHT.
   Am Ende des Kupferrohrs wird der Ball abgesetzt und läuft weiter (LOEWENTOR_AUSWURF, 9,5). Aus
   dem Abfluß wird er **herausgeschossen** – mit einem Schwall Wasser, spürbar stärker. Das ist der
   Grund, warum es beide gibt: Das eine ist eine Fahrt, das andere ein Katapult mit langem Anlauf.

   Ein Rohr braucht zwei Buchstaben in der Karte, genau wie das Löwentor und die Rohrpost: der
   Großbuchstabe ist der Einlauf, der gleiche Kleinbuchstabe der Auslauf (A/a, B/b). */
const ABFLUSS_TEMPO = 9;         // Kacheln je Sekunde, mit denen es die Strecke durchspült
/* Der Stoß am Auslauf – und hier steht ausdrücklich eine KLEINERE Zahl als beim Kupferrohr (9,5).

   Das war nicht die erste Absicht. Zuerst sollte der Abfluß kräftiger ausspülen als die Rohrpost
   absetzt, weil „Spülung" nach Wucht klingt. Zwei Versuche, 13,5 und 11,5, endeten beide gleich:
   Der Ball schoß aus dem Gitter, rollte sechzehn bis zweiundzwanzig Kacheln weit – und diese Welt
   besteht aus drei Kacheln schmalen Stegen über offenem Wasser. Die Maschine ertränkte jeden, der
   sie benutzte, und zwar zuverlässig.

   Also andersherum, und das ist auch die bessere Aufteilung: **Die Rohrpost wirft, der Abfluß
   setzt ab.** Aus einem Gitter im Boden quillt Wasser, es schießt nicht. Der Ball kommt heraus,
   rollt ein paar Kacheln aus und liegt – und der nächste Schlag gehört wieder dem Spieler. Auf
   einem Steg über dem Meer ist das genau das, was man sich wünscht. */
const ABFLUSS_STOSS = 5.5;
const ABFLUSS_SCHWALL = 0.7;     // so lange ist der Schwall am Auslauf noch zu sehen

class Abflussrohr {
  constructor(d) {
    Object.assign(this, { pair: 'A', angle: 0, ebene: 0 }, d);
    this.type = 'abflussrohr';
    const a = (this.angle * Math.PI) / 180;
    this.dx = Math.cos(a); this.dy = Math.sin(a);
    this.bereit = false; this.fahrt = -1;
    this.schluckAt = -10; this.speiAt = -10;
  }
  setup(level) {
    this.level = level;
    const gross = this.pair.toUpperCase(), klein = this.pair.toLowerCase();
    const fl = level.flaechen[this.ebene];
    this.x = this.y = this.ax = this.ay = null;
    this.bereit = false;
    if (!fl) return;
    for (let y = 0; y < level.H; y++) for (let x = 0; x < level.W; x++) {
      if (fl.tiles[y][x] === gross) { this.x = x + 0.5; this.y = y + 0.5; }
      if (fl.tiles[y][x] === klein) { this.ax = x + 0.5; this.ay = y + 0.5; }
    }
    this.bereit = this.x != null && this.ax != null;
    if (!this.bereit) return;
    this.strecke = Math.hypot(this.ax - this.x, this.ay - this.y) || 1;
    this.dauer = Math.max(0.2, this.strecke / ABFLUSS_TEMPO);
    this.fahrt = -1;
  }
  /* Nie gesperrt, nichts zu versetzen, kein Tempo abzulesen: Der Einlauf steht offen, und wer ihn
     berührt, fährt mit – auch wer nur hineintröpfelt. Ein Abfluß ist keine Prüfung. */
  punkt(u) {
    const k = Math.max(0, Math.min(1, u));
    return [this.x + (this.ax - this.x) * k, this.y + (this.ay - this.y) * k];
  }
  ride(ball, t, events) {
    if (!this.bereit) return false;
    if (ball.rider === this) {
      const u = Math.min(1, (t - ball.abflussStart) / this.dauer);
      this.fahrt = u;
      const [px, py] = this.punkt(u);
      ball.x = px; ball.y = py; ball.z = 0; ball.vx = 0; ball.vy = 0; ball.vz = 0;
      if (u < 1) return true;
      /* Abgesetzt wird NEBEN dem Auslauf, nicht darin: Das Auslauffeld ist ein Gitter in der
         Mauer, dort stünde der Ball ohne Boden. Die Richtung steht als 'angle' am Rohr – damit
         ist die Landestelle planbar, so wie beim Löwentor. */
      this.fahrt = -1; this.speiAt = t;
      ball.rider = null; ball.rideCd = 0.6; ball.portalCd = 0.4;
      ball.x = this.ax + this.dx * 0.95; ball.y = this.ay + this.dy * 0.95;
      ball.vx = this.dx * ABFLUSS_STOSS; ball.vy = this.dy * ABFLUSS_STOSS;
      ball.z = 0; ball.vz = 0; ball.air = false;
      events.push({ type: 'abfluss', x: ball.x, y: ball.y, aus: true });
      return false;
    }
    if (ball.rideCd > 0 || ball.air || ball.portalCd > 0 || ball.sunk) return false;
    if ((ball.ebene || 0) !== this.ebene) return false;
    if (Math.abs(ball.x - this.x) > 0.5 || Math.abs(ball.y - this.y) > 0.5) return false;
    ball.rider = this; ball.abflussStart = t; this.fahrt = 0; this.schluckAt = t;
    ball.x = this.x; ball.y = this.y; ball.z = 0; ball.vx = 0; ball.vy = 0; ball.vz = 0;
    events.push({ type: 'abfluss', x: this.x, y: this.y, aus: false });
    return true;
  }
}
