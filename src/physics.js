/* Ballphysik: Reibung nach Untergrund, Kollision mit Segmenten (auch bewegten) und Kreisen –
   und, wenn mehrere Bälle gleichzeitig auf der Bahn liegen, der Stoß der Bälle untereinander. */
const BALL_R = 0.3;
const MAX_SPEED = 21;
const BALL_E = 0.86; // Stoßzahl Ball gegen Ball: etwas lebhafter als eine Mauer (0.72), aber nicht ganz verlustfrei
const FRICTION = { '#': 4.2, T: 4.2, H: 4.2, o: 4.2, s: 20, i: 0.75, w: 4, l: 4 }; // Bremsung je Untergrund, pro Bahn per friction überschreibbar

function makeBall(x, y, color, hat) {
  return { x, y, z: 0, vx: 0, vy: 0, vz: 0, r: BALL_R, shrinkUntil: 0, portalCd: 0, rideCd: 0, rider: null, air: false, restX: x, restY: y, ebene: 0, restEbene: 0, color, hat, boosted: false };
}

function collideSeg(ball, s, events) {
  const rad = ball.r + (s.rad || 0);
  const ex = s.bx - s.ax, ey = s.by - s.ay;
  const L2 = ex * ex + ey * ey || 1e-9;
  const u = clamp(((ball.x - s.ax) * ex + (ball.y - s.ay) * ey) / L2, 0, 1);
  const px = s.ax + ex * u, py = s.ay + ey * u;
  let dx = ball.x - px, dy = ball.y - py;
  const d = Math.hypot(dx, dy);
  if (d >= rad) return false;
  let nx, ny;
  if (d < 1e-6) { const L = Math.sqrt(L2); nx = -ey / L; ny = ex / L; }
  else { nx = dx / d; ny = dy / d; }
  ball.x += nx * (rad - d); ball.y += ny * (rad - d);
  events.push({ type: 'contact', kind: s.kind || 'wall', nx, ny, owner: s.owner }); // jede Berührung (für die Klemm-Erkennung)
  let svx = s.vx || 0, svy = s.vy || 0;
  if (s.omega) { svx += -s.omega * (py - s.cy); svy += s.omega * (px - s.cx); }
  const rvx = ball.vx - svx, rvy = ball.vy - svy;
  const vn = rvx * nx + rvy * ny;
  if (vn < 0) {
    const e = s.e ?? 0.72;
    ball.vx -= (1 + e) * vn * nx; ball.vy -= (1 + e) * vn * ny;
    if (s.kind === 'rotor' || s.kind === 'mover') { // Schwung mitgeben
      ball.vx += svx * 0.3; ball.vy += svy * 0.3;
    }
    if (s.curse && !ball.curse) { ball.curse = s.curse; events.push({ type: 'curse', x: ball.x, y: ball.y, label: s.curseLabel }); } // verfluchte Klinge: Ball bleibt bis zum Loch träge
    events.push({ type: 'bounce', speed: -vn, kind: s.kind || 'wall', x: px, y: py });
  }
  return true;
}

function collideCircle(ball, c, events) {
  const rad = ball.r + c.r;
  let dx = ball.x - c.x, dy = ball.y - c.y;
  const d = Math.hypot(dx, dy);
  if (d >= rad) return false;
  const nx = d > 1e-6 ? dx / d : 1, ny = d > 1e-6 ? dy / d : 0;
  ball.x += nx * (rad - d); ball.y += ny * (rad - d);
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    const e = c.e ?? 0.8;
    let out = -vn * e;
    if (c.kick) out = Math.max(out, c.kick);
    ball.vx += (out - vn) * nx; ball.vy += (out - vn) * ny;
    if (c.owner) c.owner.hitAt = performance.now() / 1000;
    if (c.curse && !ball.curse) { ball.curse = c.curse; events.push({ type: 'curse', x: ball.x, y: ball.y }); } // Perlenfluch: bleibt bis zum Ende der Bahn
    events.push({ type: 'bounce', speed: out, kind: c.kind || 'circle', x: ball.x, y: ball.y });
  }
  return true;
}

/* Eingeklemmt: ein bewegtes Hindernis (Lore, Fass, Wache …) drückt den Ball gegen eine Mauer oder ein zweites
   Hindernis – die Kollision allein kann das nicht lösen, der Ball würde endlos hin- und hergequetscht.
   Dann wird der Ball hinter das Hindernis gesetzt (in Fahrtrichtung gesehen), notfalls davor. */
function resolveCrush(level, ball, events) {
  const cs = events.filter(e => e.type === 'contact'), movers = cs.filter(c => c.kind === 'mover' && c.owner);
  if (!movers.length) return;
  if (!movers.some(m => cs.some(c => c !== m && m.nx * c.nx + m.ny * c.ny < -0.5))) return;
  const free = (x, y) => level.isFloorChar(level.charAt(x, y)) && !level.obstacles.some(o => o.type === 'mover' && Math.abs(x - o.x) < o.w / 2 + ball.r && Math.abs(y - o.y) < o.h / 2 + ball.r);
  for (const m of movers) {
    const ob = m.owner, sp = Math.hypot(ob.vx, ob.vy);
    let ux, uy;
    if (sp > 0.05) { ux = ob.vx / sp; uy = ob.vy / sp; }
    else { const L = Math.hypot(ob.x1 - ob.x0, ob.y1 - ob.y0) || 1; ux = (ob.x1 - ob.x0) / L * (ob.dir || 1); uy = (ob.y1 - ob.y0) / L * (ob.dir || 1); }
    const half = Math.abs(ux) * ob.w / 2 + Math.abs(uy) * ob.h / 2 + ball.r + 0.2;
    for (const s of [1, -1]) {
      const px = ob.x - ux * half * s, py = ob.y - uy * half * s;
      if (!free(px, py)) continue;
      ball.x = px; ball.y = py; ball.vx = -ux * s * 1.5; ball.vy = -uy * s * 1.5; ball.z = Math.max(ball.z, 0.15); ball.vz = 1.2;
      events.push({ type: 'squeeze', x: px, y: py }); return;
    }
  }
  ball.vx = 0; ball.vy = 0; // kein freier Platz: wenigstens zur Ruhe kommen lassen
}

/* Die Kanten und Kreise, die auf einer Ebene gerade im Weg stehen. Steht für sich, weil sie
   zweimal gebraucht werden: einmal beim gewöhnlichen Schritt, und noch einmal, nachdem ein
   Ballstoß einen Ball verschoben hat. */
function flaechenSammeln(level, eb) {
  const dyn = [], circles = [];
  for (const ob of level.obstacles) {
    if ((ob.ebene || 0) !== eb) continue;
    if (ob.segments) ob.segments(dyn);
    if (ob.circles) ob.circles(circles);
  }
  return { dyn, circles };
}

/* Den Ball aus allem herausdrücken, worin er steckt. Zwei Durchgänge, weil ihn das Herausdrücken
   aus der einen Wand in die nächste schieben kann – in einer Ecke ist genau das der Normalfall. */
function anWaendenLoesen(level, ball, flaechen, events) {
  for (let iter = 0; iter < 2; iter++) {
    for (const s of level.segs) collideSeg(ball, s, events);
    for (const s of flaechen.dyn) collideSeg(ball, s, events);
    for (const cc of flaechen.circles) collideCircle(ball, cc, events);
  }
}

/* Ein Physik-Schritt. allowForces: Windfelder/Beschleuniger nur, wenn der Ball "im Spiel" ist. */
/* Eine Ebene tiefer – und weiter, bis wieder Boden unter dem Ball ist. Ort und Tempo bleiben, ein
   Strafschlag fällt nicht an. Das gilt für die offene Kante genauso wie für die Luke, darum steht
   es hier einmal und nicht zweimal. Das z setzt nur die Optik: Der Ball sinkt sichtbar herunter,
   rollt dabei aber schon auf der neuen Ebene und stößt sich an deren Wänden. */
function ebeneFallen(level, ball, events) {
  if (!ball.ebene) return false;
  const von = ball.ebene;
  do { ball.ebene -= 1; level.setzeEbene(ball.ebene); }
  while (ball.ebene > 0 && !level.isFloorChar(level.charAt(ball.x, ball.y)));
  ball.z = Math.max(ball.z, (von - ball.ebene) * level.ebeneZ); ball.vz = 0;
  events.push({ type: 'ebeneAb', x: ball.x, y: ball.y, von, nach: ball.ebene });
  return true;
}

/* maschinenLaufen: Wer mehrere Bälle in einem Schritt bewegt, lässt die Maschinen einmal vorher
   laufen und stellt das hier ab. Sonst liefen sie pro Ball einmal – und drei von ihnen tragen
   etwas von einem Aufruf zum nächsten mit: Stacheln und Fallbeil merken sich, ob sie im Bild
   davor schon zu waren (daran hängt der Strafschlag), und ein Tor am Schalter schiebt sein
   Blatt Schritt für Schritt weiter. Die liefen dann doppelt so schnell. */
function stepPhysics(level, ball, dt, t, allowForces, maschinenLaufen = true) {
  const events = [];
  /* Ebenen: Der Ball ist immer auf genau einer Fläche. Das Level trägt die Kacheln und Wände
     dieser Fläche – hier wird nur nachgezogen, falls der Ball die Ebene gewechselt hat (Turbine,
     offene Kante, neuer Schlag). Die Maschinen laufen auf beiden Ebenen weiter, damit die andere
     Ebene nicht stehenbleibt, während man nicht hinschaut; gewirkt wird aber nur auf der eigenen. */
  if (ball.ebene == null) ball.ebene = 0;
  if (ball.ebene !== level.ebene) level.setzeEbene(ball.ebene);
  const eb = ball.ebene;
  const hier = ob => (ob.ebene || 0) === eb;
  if (maschinenLaufen) for (const ob of level.obstacles) if (ob.update) ob.update(t);

  // Schrumpfzauber läuft ab
  if (ball.shrinkUntil && t > ball.shrinkUntil) { ball.shrinkUntil = 0; ball.r = BALL_R; events.push({ type: 'unshrink' }); }

  // Fähren und Kanonen: mitfahren bzw. geladen sein (dann keine weitere Physik) oder einsteigen
  ball.rideCd = Math.max(0, (ball.rideCd || 0) - dt);
  if (ball.rider) { if (ball.rider.ride(ball, t, events)) return events; }
  else for (const ob of level.obstacles) if (hier(ob) && ob.ride && ob.ride(ball, t, events)) return events;

  // Sprungschanzen und Flugphase: in der Luft gibt es keine Reibung, keine Mauern, keine Hindernisse
  for (const ob of level.obstacles) if (hier(ob) && ob.launch) ob.launch(ball, events, t); // Rampen und Aufwinde
  if (ball.air) {
    ball.x += ball.vx * dt; ball.y += ball.vy * dt;
    ball.vz -= 12 * dt; ball.z += ball.vz * dt;
    if (ball.z <= 0) {
      ball.z = 0; ball.vz = 0; ball.air = false;
      ball.vx *= 0.6; ball.vy *= 0.6;
      events.push({ type: 'land', x: ball.x, y: ball.y });
      for (const ob of level.obstacles) if (hier(ob) && typeof ob.catch === 'function' && ob.catch(ball, t, events)) return events;
    } else { // im Flug: nur der springende Hai kann den Ball erwischen
      for (const ob of level.obstacles) if (hier(ob) && ob.airTrigger && ob.airTrigger(ball, t, events)) break;
      return events;
    }
  }

  ball.boosted = false;
  for (const ob of level.obstacles) if (hier(ob) && ob.force && (allowForces || ob.alwaysForce)) ob.force(ball, dt); // Wellen schieben auch einen ruhenden Ball

  const c = level.charAt(ball.x, ball.y);
  let sp = Math.hypot(ball.vx, ball.vy);
  if (sp > 0) {
    const fr = level.def.friction && level.def.friction[c];
    const dec = (fr ?? FRICTION[c] ?? 4) * dt * (ball.curse || 1);
    let ns = Math.max(0, sp - dec) * (1 - 0.06 * dt);
    if (ns > MAX_SPEED) ns = MAX_SPEED;
    ball.vx *= ns / sp; ball.vy *= ns / sp;
  }
  const px = ball.x, py = ball.y;
  ball.x += ball.vx * dt; ball.y += ball.vy * dt;
  if (level.hasHeights && !ball.air) { // eine Stufe hinauf geht nur über eine Rampe – sonst wirkt die Kante wie eine Mauer; ein fliegender Ball setzt über
    const tx0 = Math.floor(px), ty0 = Math.floor(py), tx1 = Math.floor(ball.x), ty1 = Math.floor(ball.y);
    if ((tx0 !== tx1 || ty0 !== ty1) && level.cellH(tx1, ty1) > level.cellH(tx0, ty0) + 0.01 && !level.slopeAt(px, py) && !level.slopeAt(ball.x, ball.y)) {
      if (tx0 !== tx1) { ball.x = px; ball.vx = -ball.vx * 0.5; }
      if (ty0 !== ty1) { ball.y = py; ball.vy = -ball.vy * 0.5; }
      events.push({ type: 'bounce', speed: Math.hypot(ball.vx, ball.vy), kind: 'wall', x: ball.x, y: ball.y });
    }
  }

  // Sprung-Optik (z beeinflusst die Bahn nicht)
  if (ball.z > 0 || ball.vz !== 0) {
    ball.vz -= 12 * dt; ball.z += ball.vz * dt;
    if (ball.z <= 0) { ball.z = 0; ball.vz = 0; }
  }

  anWaendenLoesen(level, ball, flaechenSammeln(level, eb), events);

  resolveCrush(level, ball, events);

  ball.portalCd = Math.max(0, ball.portalCd - dt);
  for (const ob of level.obstacles) { if (!hier(ob)) continue; if (ob.teleport) ob.teleport(ball, t, events); if (ob.trigger) ob.trigger(ball, t, events); }

  // Loch – es liegt auf einer festgelegten Ebene und zieht nur, wenn der Ball auch dort ist
  if (level.cup && ball.ebene === (level.cupEbene || 0)) {
    const cdx = ball.x - level.cup.x, cdy = ball.y - level.cup.y;
    const cd = Math.hypot(cdx, cdy);
    sp = Math.hypot(ball.vx, ball.vy);
    const cr = level.cup.r || 0.42, pullR = level.cup.pull || 0.62, pullF = 9 * pullR / 0.62;
    if (cd < pullR && sp < 7.5 && sp > 0.01) { // leichte Anziehung am Lochrand
      ball.vx -= (cdx / cd) * pullF * dt; ball.vy -= (cdy / cd) * pullF * dt;
    }
    if (cd < cr && sp < 7.5) { events.push({ type: 'sunk' }); return events; }
  }

  /* Zurück nach unten: An einer offenen Kante der oberen Ebene gibt es nichts, worauf der Ball
     stehen könnte – er fällt an derselben Stelle auf die untere und rollt dort weiter. Ort und
     Tempo bleiben, ein Strafschlag fällt nicht an. Gefallen wird nur nach unten: Was auch unten
     kein Boden ist, ist wirklich aus. */
  let c2 = level.charAt(ball.x, ball.y);
  if (!level.isFloorChar(c2) && ball.ebene > 0) { ebeneFallen(level, ball, events); c2 = level.charAt(ball.x, ball.y); }
  if (!level.isFloorChar(c2)) events.push({ type: 'oob' });
  else if (c2 === 'w') events.push({ type: 'water' });
  else if (c2 === 'l') events.push({ type: 'lava' });
  return events;
}

/* ---------- Mehrere Bälle auf einer Bahn ----------
 *
 * Bis hierher kennt die Physik genau einen Ball, und in allen heutigen Spielarten ist auch nur
 * einer unterwegs: Es wird reihum geschlagen, der nächste kommt erst dran, wenn der vorige liegt.
 * Was jetzt dazukommt, greift darum ausschließlich dann, wenn wirklich mehr als ein Ball
 * gleichzeitig auf der Bahn liegt – bei einem einzigen Ball führt stepBaelle denselben Schritt aus
 * wie bisher und rührt danach nichts mehr an.
 */

/* Stößt dieser Ball überhaupt mit? Wer fliegt, sieht unter sich keine Bälle; wer in einer Fähre
   oder einer Kanone steckt, ist gar nicht auf der Bahn; und wer im Loch ist, ist fertig. */
function stossFaehig(ball) {
  return !!ball && !ball.air && !ball.rider && !ball.sunk;
}

/* Elastischer Stoß zweier Bälle.
 *
 * Der Impuls geht nur längs der Verbindungslinie über – quer dazu behält jeder Ball sein Tempo;
 * das ist der Unterschied zwischen einem Stoß und einem Zusammenkleben. Die Masse kommt aus dem
 * Radius hoch drei, also aus dem Rauminhalt: Ein geschrumpfter Ball wiegt dann von selbst
 * weniger, wird stärker weggestoßen als er selbst stößt, und man muss das nirgends eigens regeln.
 *
 * Zuerst werden die beiden auseinandergeschoben. Ohne das blieben sie ineinander stecken: Im
 * nächsten Schritt lägen sie immer noch zu nah beieinander, der Stoß liefe erneut, und aus einem
 * Stoß würde ein Zittern. Der schwerere weicht dabei weniger weit aus. */
function ballStoss(a, b, events) {
  const rad = a.r + b.r;
  let dx = b.x - a.x, dy = b.y - a.y;
  let d = Math.hypot(dx, dy);
  if (d >= rad) return false;
  if (d < 1e-6) { dx = 1; dy = 0; d = 1e-6; } // genau übereinander: irgendeine Richtung ist so gut wie jede
  const nx = dx / d, ny = dy / d;
  const ma = a.r * a.r * a.r, mb = b.r * b.r * b.r, m = ma + mb;
  const ueber = rad - d;
  a.x -= nx * ueber * (mb / m); a.y -= ny * ueber * (mb / m);
  b.x += nx * ueber * (ma / m); b.y += ny * ueber * (ma / m);
  // Nähern sie sich noch? Sonst sind sie nur nachbarlich nah und es gibt nichts zu übertragen.
  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
  if (vn >= 0) return true;
  const j = -(1 + BALL_E) * vn / (1 / ma + 1 / mb);
  a.vx -= (j / ma) * nx; a.vy -= (j / ma) * ny;
  b.vx += (j / mb) * nx; b.vy += (j / mb) * ny;
  events.push({ type: 'ballStoss', speed: -vn, x: a.x + nx * a.r, y: a.y + ny * a.r });
  return true;
}

/* Ein Schritt für beliebig viele Bälle. Gibt je Ball eine Ereignisliste zurück, in derselben
   Reihenfolge wie die Bälle hereinkamen.
 *
 * Erst wird jeder Ball für sich bewegt – Reibung, Wände, Hindernisse sind für ihn dieselben wie
 * beim Spiel allein. Erst danach werden die Bälle untereinander aufgelöst. Das ist Absicht: Würde
 * man mitten im Bewegen stoßen, hinge das Ergebnis davon ab, welcher Ball zufällig zuerst an der
 * Reihe ist, und zwei Zuschauer sähen verschiedene Bahnen.
 *
 * Nach einem Stoß darf jeder Ball weiterrollen und erneut anecken: Ein weggestoßener Ball wird
 * darum noch einmal aus den Wänden herausgedrückt (sonst steckte er darin), und weil das ihn
 * wieder auf einen dritten Ball schieben kann, läuft das Ganze mehrmals – bis nichts mehr
 * überlappt, höchstens aber viermal. Drei Bälle in einer Reihe brauchen zwei Durchgänge; die
 * Schranke ist nur dafür da, dass ein Ball, der in einer Ecke zwischen Mauer und Ball klemmt,
 * nicht das Bild anhält. */
function stepBaelle(level, baelle, dt, t, allowForces) {
  for (const ob of level.obstacles) if (ob.update) ob.update(t);
  const ereignisse = baelle.map(b => stepPhysics(level, b, dt, t, allowForces, false));
  if (baelle.length < 2) return ereignisse;

  /* Wer in diesem Schritt eingelocht ist oder die Bahn verlassen hat, stößt nicht mehr mit –
     sein Ereignis ist schon gemeldet, und ein Stoß würde ihn wieder aus dem Loch schieben. */
  const raus = new Set(['sunk', 'oob', 'water', 'lava']);
  const dabei = baelle.filter((b, i) => stossFaehig(b) && !ereignisse[i].some(e => raus.has(e.type)));
  const evVon = b => ereignisse[baelle.indexOf(b)];

  for (let runde = 0; runde < 4; runde++) {
    const angefasst = new Set();
    for (let i = 0; i < dabei.length; i++) {
      for (let k = i + 1; k < dabei.length; k++) {
        const a = dabei[i], b = dabei[k];
        if ((a.ebene || 0) !== (b.ebene || 0)) continue; // zwei Ebenen übereinander sehen einander nicht
        if (ballStoss(a, b, evVon(a))) { angefasst.add(a); angefasst.add(b); }
      }
    }
    if (!angefasst.size) break;
    // Wen es verschoben hat, den drücken wir wieder aus den Wänden heraus – auf seiner eigenen Ebene
    for (const b of angefasst) {
      if ((b.ebene || 0) !== level.ebene) level.setzeEbene(b.ebene || 0);
      anWaendenLoesen(level, b, flaechenSammeln(level, b.ebene || 0), evVon(b));
    }
  }
  return ereignisse;
}
