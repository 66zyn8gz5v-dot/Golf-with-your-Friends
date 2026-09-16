/* Die Maschinen der Zwergenmine.

   Jede Welt stellt eine Frage. Das Märchenland fragt *wie fest*, der Uhrenturm fragt *wann*, der
   Schneeberg fragt *wohin* – die Mine fragt: **was liegt da vorn überhaupt?**

   Unter Tage sieht man nur, was im Licht steht. Darum ist das Erste hier keine Maschine, sondern
   eine Regel: Auf einer dunklen Bahn liegt ein Schleier, der sich nur um den Ball und um die
   Grubenlampen öffnet. Man spielt also nicht gegen ein Hindernis, sondern gegen das eigene
   Nichtwissen – und die Lampen sind die Punkte, an denen man wieder sieht.

   Dazu zwei Maschinen, die es so noch nirgends gibt:
   - Die SPRENGLADUNG ist der erste Stoß, der von einem Ort ausgeht statt aus einer Richtung: Sie
     wirft alles im Umkreis nach außen, und zwar umso weiter, je näher es liegt. Sie ist keine
     Strafe – wer sich richtig hinlegt, lässt sich von ihr tragen.
   - Die KIPPBÜHNE ist die erste Fläche, deren Neigung vom Ball selbst abhängt. Sie kippt zu der
     Seite, auf der er liegt. Wer über die Mitte kommt, den wirft sie hinüber; wer davor
     liegenbleibt, den schickt sie zurück.

   Der Aufzug, die Zahnstange, die Lore und der Aufwind kommen in der Mine natürlich auch vor –
   die sind aber schon gebaut, und ein rundes Rad, das dasselbe tut wie ein Aufzug, wäre eine
   neue Zeichnung und kein neues Spiel.

   Alle Stellschrauben stehen bewusst oben, damit sie sich nachjustieren lassen, ohne im Code zu
   suchen. */

/* ---------------------------------------------------------------------------
   Sprengladung
   --------------------------------------------------------------------------- */
/* Takt: Die Lunte brennt sichtbar ab, dann kommt der Knall. Der Druck wirkt nicht einen einzigen
   Bildschritt lang, sondern SPRENG_STOSS Sekunden – sonst hinge die Wucht daran, wie schnell das
   Gerät gerade zeichnet, und dasselbe Spiel liefe auf zwei Handys verschieden.

   Die Kraft nimmt nach außen ab: am Zünder voll, am Rand null. Damit ist die Ladung nicht nur
   Gefahr, sondern Werkzeug – wer knapp am Rand liegt, bekommt einen Schubs in die richtige
   Richtung, wer direkt daneben liegt, fliegt quer durch den Stollen.

   Sie wirkt auch auf einen ruhenden Ball (alwaysForce). Das ist der Kern: In der Mine kann man
   nicht in aller Ruhe zielen, wenn man neben dem Dynamit liegt. Die brennende Lunte sagt vorher
   an, wie lange man noch hat. */
const SPRENG_TAKT = 7.5;         // Sekunden von einem Knall zum nächsten
const SPRENG_LUNTE = 2.4;        // so lange brennt die Lunte sichtbar ab
const SPRENG_STOSS = 0.16;       // so lange wirkt der Druck
const SPRENG_KRAFT = 46;         // Beschleunigung in Kacheln/s² unmittelbar am Zünder
const SPRENG_WEITE = 3.2;        // so weit reicht der Druck

class Blast {
  constructor(d) {
    Object.assign(this, { weite: SPRENG_WEITE, kraft: SPRENG_KRAFT, phase: 0, ebene: 0, angle: 0 }, d);
    this.type = 'sprengladung';
    this.alwaysForce = true;       // sie wirft auch einen liegenden Ball
    this.nr = -1; this.neu = false;
    this.update(0);
    /* Beim Bauen der Bahn steht die Ladung irgendwo in ihrem Takt. Der Knall, in dem sie gerade
       steckt, ist keiner, den jemand gehört hat – er wird darum nicht gemeldet. */
    this.neu = false;
  }
  update(t) {
    const gesamt = t / SPRENG_TAKT + this.phase;
    const nr = Math.floor(gesamt);
    const u = (gesamt - nr) * SPRENG_TAKT;            // 0 .. SPRENG_TAKT
    if (nr !== this.nr) { this.nr = nr; this.neu = true; }
    this.knall = u < SPRENG_STOSS;
    this.blitz = u < SPRENG_STOSS * 3 ? 1 - u / (SPRENG_STOSS * 3) : 0;   // der Feuerschein hält etwas länger als der Druck
    // Die Lunte brennt am Ende des Takts – sie zeigt also auf den *nächsten* Knall.
    this.lunte = u > SPRENG_TAKT - SPRENG_LUNTE ? (u - (SPRENG_TAKT - SPRENG_LUNTE)) / SPRENG_LUNTE : 0;
  }
  force(ball, dt) {
    if (!this.knall || ball.air || ball.rider) return;
    let dx = ball.x - this.x, dy = ball.y - this.y;
    let d = Math.hypot(dx, dy);
    if (d > this.weite) return;
    /* Liegt der Ball genau auf dem Zünder, gibt es keine Richtung nach außen. Dann gilt die
       Richtung, in die die Ladung gelegt wurde ('angle') – irgendwohin muss er ja. */
    if (d < 0.001) { const a = (this.angle * Math.PI) / 180; dx = Math.cos(a); dy = Math.sin(a); d = 1; }
    const f = 1 - d / this.weite;
    ball.vx += (dx / d) * this.kraft * f * dt;
    ball.vy += (dy / d) * this.kraft * f * dt;
  }
  /* Der Knall wird einmal je Zündung gemeldet, nicht einmal je Bildschritt – sonst knallte es
     sechzigmal in der Sekunde. */
  trigger(ball, t, events) {
    if (!this.neu) return;
    this.neu = false;
    events.push({ type: 'spreng', x: this.x, y: this.y });
  }
}

/* ---------------------------------------------------------------------------
   Kippbühne
   --------------------------------------------------------------------------- */
/* Eine Bohle über dem Schacht, die auf einer Achse ruht. Sie kippt zu der Seite, auf der der Ball
   liegt, und schiebt ihn damit weiter in die Richtung, in der er ohnehin schon ist.

   Daraus wird eine Regel, die man in einem Satz sagen kann: **Über die Mitte musst du kommen.**
   Wer es schafft, wird hinübergeworfen; wer davor liegenbleibt, rutscht dorthin zurück, wo er
   hergekommen ist. Um die Mitte herum liegt eine Totzone (KIPP_MITTE), in der die Bühne
   waagerecht bleibt – ohne sie gäbe es einen Punkt, an dem ein Fingerbreit über alles entscheidet,
   und das fühlte sich nicht nach Geschick an, sondern nach Willkür.

   Ohne Ball geht sie von selbst wieder in die Waage: Die nächste Spielerin findet dieselbe Bühne
   vor wie die vorige. */
const KIPP_KRAFT = 5.2;          // Beschleunigung in Kacheln/s² bei voller Neigung
const KIPP_TEMPO = 2.2;          // wie schnell die Bohle der Last folgt (je Sekunde)
const KIPP_MITTE = 0.28;         // Totzone um die Achse, gemessen in Anteilen der halben Länge
const KIPP_WINKEL = 0.2;         // sichtbarer Ausschlag in Kachelhöhen – nur fürs Bild

class TiltBridge {
  constructor(d) {
    Object.assign(this, { w: 4, h: 1.4, angle: 0, ebene: 0 }, d);
    this.type = 'kippbuehne';
    const a = (this.angle * Math.PI) / 180;
    this.dx = Math.cos(a); this.dy = Math.sin(a);
    this.cx = this.x + this.w / 2; this.cy = this.y + this.h / 2;
    // Länge längs der Achse: so weit reicht die Bohle vom Drehpunkt nach beiden Seiten
    this.halb = (Math.abs(this.dx) * this.w + Math.abs(this.dy) * this.h) / 2;
    this.neigung = 0; this.ziel = 0; this.tVor = 0;
    this.alwaysForce = true;       // eine schiefe Bohle hält auch einen ruhenden Ball nicht
  }
  update(t) {
    const dt = Math.max(0, Math.min(0.1, t - this.tVor));
    this.tVor = t;
    this.neigung += (this.ziel - this.neigung) * Math.min(1, dt * KIPP_TEMPO);
    this.ziel = 0;                 // ohne Last geht sie zurück in die Waage
  }
  drauf(ball) {
    return Math.abs(ball.x - this.cx) <= this.w / 2 && Math.abs(ball.y - this.cy) <= this.h / 2;
  }
  force(ball, dt) {
    if (ball.air || ball.rider || !this.drauf(ball)) return;
    const u = ((ball.x - this.cx) * this.dx + (ball.y - this.cy) * this.dy) / (this.halb || 1);
    const a = Math.abs(u);
    if (a > KIPP_MITTE) this.ziel = Math.sign(u) * Math.min(1, (a - KIPP_MITTE) / (1 - KIPP_MITTE));
    ball.vx += this.dx * KIPP_KRAFT * this.neigung * dt;
    ball.vy += this.dy * KIPP_KRAFT * this.neigung * dt;
  }
}

/* ---------------------------------------------------------------------------
   Grubenlampe
   --------------------------------------------------------------------------- */
/* Die Lampe tut nichts am Ball – und ist trotzdem das Wichtigste auf einer dunklen Bahn: Sie ist
   das Stück Bahn, das man sieht, ohne hinzurollen. Wo Lampen hängen, ist der Weg lesbar; dazwischen
   muss man sich merken, was man beim Hinweg gesehen hat.

   Sie steht als Hindernis in der Bahn und nicht als Deko, weil ihre Leuchtweite zum Spiel gehört:
   Der Bahnbau entscheidet damit, wie viel eine Spielerin sehen darf. */
class MineLamp {
  constructor(d) {
    Object.assign(this, { r: 3.4, ebene: 0 }, d);
    this.type = 'grubenlampe';
  }
  update(t) { this.t = t; }
}

/* ---------------------------------------------------------------------------
   Bruchwand
   --------------------------------------------------------------------------- */
/* Ein Pfeiler stehengebliebenen Felses, der einen Gang versperrt – bis eine Sprengladung in der
   Nähe zündet. Dann ist er weg, und der Gang ist offen. Für den Rest der Bahn.

   Das ist die einzige Maschine im ganzen Spiel, die **die Bahn selbst verändert**. Alles andere
   bewegt den Ball: Es stößt, trägt, hebt, fängt. Die Bruchwand rührt den Ball nicht an – sie nimmt
   eine Wand heraus. Wer beim ersten Schlag vor einem geschlossenen Berg steht, spielt danach eine
   andere Bahn als vorher.

   Und sie ist die Antwort auf eine Frage, die die Sprengladung offen gelassen hat: Bis jetzt war
   Dynamit im Berg nur ein Stoß für den Ball. In einem Bergwerk sprengt man aber keine Kugeln,
   sondern Fels. Die Ladung hat damit zwei Wirkungen, und die zweite ist die, um die es eigentlich
   geht.

   Sie geht nicht von selbst wieder zu. Das war überlegt: Eine Wand, die sich nach jedem Schlag
   wieder schließt, wäre ein Tor – und Tore gibt es schon, in drei Welten. Der Reiz hier ist, dass
   der Berg nach der Sprengung offen *bleibt*, und dass man den Knall darum nicht abpassen, sondern
   **abwarten** muss. Beim nächsten Loch steht sie wieder (setup). */
const BRUCH_WEITE = 3.6;         // so weit reicht eine Zündung, um Fels zu brechen
const BRUCH_STAUB = 1.1;         // so lange staubt es sichtbar nach

class BlastWall {
  /* x, y ist die Mitte – wie bei rectPoly, mit dem die Kanten gebaut werden. */
  constructor(d) {
    Object.assign(this, { w: 2, h: 2, weite: BRUCH_WEITE, ebene: 0 }, d);
    this.type = 'bruchwand';
    this.weg = false; this.bruchAt = -99; this.neu = false; this.t = 0;
  }
  setup(level) { this.level = level; this.weg = false; this.neu = false; }
  update(t) {
    this.t = t;
    if (this.weg || !this.level) return;
    for (const ob of this.level.obstacles) {
      if (ob.type !== 'sprengladung' || !ob.knall) continue;
      if ((ob.ebene || 0) !== (this.ebene || 0)) continue;
      /* Gemessen wird vom Zünder zur *nächsten Stelle der Wand*, nicht zu ihrer Mitte: Sonst
         hinge es an der Länge der Wand, ob sie bricht, und eine lange Wand wäre schwerer zu
         sprengen als eine kurze, obwohl die Ladung direkt daneben liegt. */
      const nx = Math.max(this.x - this.w / 2, Math.min(ob.x, this.x + this.w / 2));
      const ny = Math.max(this.y - this.h / 2, Math.min(ob.y, this.y + this.h / 2));
      if (Math.hypot(ob.x - nx, ob.y - ny) > this.weite) continue;
      this.weg = true; this.bruchAt = t; this.neu = true;
      break;
    }
  }
  segments(out) {
    if (this.weg) return;
    polySegments(rectPoly(this.x, this.y, this.w, this.h), out, { e: 0.45, kind: 'fels' });
  }
  /* Einmal je Sprengung melden, nicht einmal je Bildschritt. */
  trigger(ball, t, events) {
    if (!this.neu) return;
    this.neu = false;
    events.push({ type: 'durchbruch', x: this.x, y: this.y });
  }
  /* Der Staub nach dem Bruch – nur fürs Bild. */
  staub() {
    const seit = this.t - this.bruchAt;
    return seit >= 0 && seit < BRUCH_STAUB ? 1 - seit / BRUCH_STAUB : 0;
  }
}
