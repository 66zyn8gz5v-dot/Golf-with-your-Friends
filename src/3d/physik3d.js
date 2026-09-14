/* Wie der Ball rollt, springt, abprallt und einlocht.

   Diese Datei weiß nichts von Karten, Hügeln oder Dreiecken. Sie stellt dem Gelände genau drei
   Fragen – wie hoch, wie geneigt, was für ein Untergrund – und bekommt dazu eine Liste von
   Felsklötzen. Alles andere rechnet sie selbst aus. Das ist Absicht: So lässt sich die Rechnung
   ohne Browser prüfen (tools/3d.mjs macht genau das), und eine neue Welt mit Eis und Lava braucht
   hier keine Zeile.

   ---- Die drei Zustände eines Balls ----

   **Rollen.** Der Normalfall. Der Ball klebt am Boden; die Schwerkraft wirkt nur mit dem Anteil,
   der am Hang entlangzeigt, und die Reibung des Untergrunds bremst. Ein rollender Ball wird
   langsamer beschleunigt als ein rutschender, weil ein Teil der Energie in die Drehung geht –
   daher der Faktor 5/7. Das ist keine Spitzfindigkeit: Ohne ihn schießt der Ball an jedem Hang
   davon, und die dritte Bahn wäre unspielbar.

   **Fliegen.** Sobald der Boden schneller wegfällt, als der Ball fallen kann, hebt er ab. Genau
   so ist es geprüft: Fällt das Gelände unter dem Ball steiler ab als der freie Fall in diesem
   Rechenschritt, wird der Ball frei. Das gibt Sprünge über Kuppen, ohne dass irgendwo eine
   Sprungschanze eingetragen werden müsste.

   **Ruhen.** Langsam genug und lange genug am Boden. Das „lange genug" ist wichtig: Ein Ball, der
   am höchsten Punkt seines Bogens kurz stillsteht, ruht nicht.

   ---- Warum in kleinen Schritten gerechnet wird ----

   Ein Ball mit fünfzehn Einheiten Geschwindigkeit legt bei 60 Bildern je Sekunde ein Viertelfeld
   je Bild zurück. Eine Felswand ist ein Feld dick – das ginge gerade noch gut. Bei 30 Bildern auf
   einem müden Telefon wäre es ein halbes Feld, und der Ball führe durch die Wand hindurch. Darum
   wird immer in Schritten von höchstens 1/240 Sekunde gerechnet, unabhängig davon, wie oft
   gezeichnet wird. */
const Physik3D = (() => {
  const G = 9.81;                 // Fallbeschleunigung, Einheiten je Sekunde²
  const BALL_R = 0.11;
  const ROLL = 5 / 7;             // Anteil der Hangkraft, der beim Rollen ankommt
  const PRALL = 0.62;             // Rückgabe beim Abprall an einer Wand
  const AUFPRALL = 0.36;          // Rückgabe beim Auftreffen auf den Boden
  const HAFTEN = 0.62;            // Anteil der waagerechten Geschwindigkeit, der einen Aufprall übersteht
  const RUHE_V = 0.085;           // darunter gilt der Ball als stehend
  const RUHE_ZEIT = 0.12;
  const SCHRITT = 1 / 240;
  const MAX_V = 13;               // Geschwindigkeit bei voller Kraft: gut 27 Felder auf Fairway
  const LOCH_R = 0.155;           // Halbmesser des Bechers
  const LOCH_V = 2.8;             // schneller als das, und der Ball springt über das Loch hinweg
  const MAX_ZEIT = 30;            // Notbremse: nach so vielen Sekunden gilt ein Schlag als beendet

  /* Ein neuer Ball an einer Stelle des Geländes. */
  function ball(gl, x, z) {
    return { x, y: gl.hoehe(x, z) + BALL_R, z, vx: 0, vy: 0, vz: 0,
      fliegt: false, ruht: true, ruheZeit: 0, drehX: 0, drehZ: 0, weg: 0, seitSchlag: 0,
      /* Die letzte Stelle, an der der Ball auf gutem Grund lag. Von dort wird nach Wasser und
         nach Aus weitergespielt – wie beim Golf, wo man dort fallen lässt, wo der Ball die
         Grenze überquert hat, und nicht dort, wo man geschlagen hat. Der Unterschied ist groß:
         Zurück an die alte Stelle bedeutet, denselben schwierigen Schlag noch einmal machen zu
         müssen, und wer ihn zweimal verzieht, verzieht ihn auch ein drittes Mal. */
      sicher: [x, z] };
  }

  function schlag(b, dx, dz, kraft) {
    const v = MAX_V * Math.max(0, Math.min(1, kraft));
    b.vx = dx * v; b.vz = dz * v; b.vy = 0;
    b.fliegt = false; b.ruht = false; b.ruheZeit = 0; b.weg = 0; b.seitSchlag = 0;
  }

  /* Ein Rechenschritt. 'gl' ist das Gelände (siehe welt3d.js), 'loch' die Stelle des Bechers.
     Zurück kommt die Liste dessen, was in diesem Schritt passiert ist – daraus macht das Spiel
     Geräusche, Staub und Wasserringe. */
  function schritt(b, gl, loch, dt, ereignisse) {
    if (b.ruht) return;
    const n = [0, 1, 0];
    gl.neigung(b.x, b.z, n);
    const altX = b.x, altZ = b.z;
    const bodenAlt = gl.hoehe(b.x, b.z);

    if (b.fliegt) {
      b.vy -= G * dt;
    } else {
      /* Am Hang entlang: die Schwerkraft, vermindert um den Anteil senkrecht zur Fläche. */
      b.vx += G * n[1] * n[0] * ROLL * dt;
      b.vz += G * n[1] * n[2] * ROLL * dt;
      /* Reibung des Untergrunds, gegen die Fahrtrichtung – aber nie über den Stillstand hinaus,
         sonst liefe der Ball rückwärts an. Zwei Anteile: einer mit der Geschwindigkeit, einer
         gleichbleibend (siehe die Erklärung bei ART in welt3d.js). */
      const art = gl.art(b.x, b.z);
      const v = Math.hypot(b.vx, b.vz);
      if (v > 1e-6) {
        const weniger = Math.min(v, (art.reibung + art.zaeh * v) * dt);
        b.vx -= b.vx / v * weniger; b.vz -= b.vz / v * weniger;
      }
      /* Rauer Untergrund verzieht den Ball ein wenig. Ein Schlag durch hohes Gras, der genau
         geradeaus läuft, fühlt sich falsch an. */
      if (art.rau && v > 0.4) {
        /* Ein billiges, aber ortsfestes Zufallsmaß: Dieselbe Stelle verzieht immer gleich, und
           zwei Bahnen weiter ist es ein anderer Wert. Wichtig ist nur, dass es nicht von Bild zu
           Bild springt – sonst zappelte der Ball, statt abgelenkt zu werden. */
        const k = Math.sin(b.x * 12.9898 + b.z * 78.233) * 43758.5453;
        const w = (k - Math.floor(k)) - 0.5;
        const ax = b.vx, az = b.vz;
        b.vx += -az * w * art.rau; b.vz += ax * w * art.rau;
      }
    }

    b.x += b.vx * dt; b.z += b.vz * dt;
    if (b.fliegt) b.y += b.vy * dt;

    felsen(b, gl, ereignisse);

    const bodenNeu = gl.hoehe(b.x, b.z);
    b.weg += Math.hypot(b.x - altX, b.z - altZ);

    if (b.fliegt) {
      if (b.y - BALL_R <= bodenNeu + 1e-4) {
        b.y = bodenNeu + BALL_R;
        gl.neigung(b.x, b.z, n);
        const senk = b.vx * n[0] + b.vy * n[1] + b.vz * n[2];
        if (senk < 0) {
          /* Aufschlag: der senkrechte Anteil kehrt sich gedämpft um, der waagerechte bleibt
             größtenteils erhalten. Bei kleinem senkrechtem Anteil hört das Springen auf – sonst
             zittert der Ball ewig mit immer kleineren Sprüngen. */
          ereignisse.push({ was: 'aufschlag', kraft: -senk, x: b.x, y: b.y, z: b.z });
          const rueck = -senk * (1 + AUFPRALL);
          if (-senk < 0.6) {
            b.fliegt = false;
            b.vx -= n[0] * senk; b.vy = 0; b.vz -= n[2] * senk;
            b.vx *= HAFTEN + 0.3; b.vz *= HAFTEN + 0.3;
          } else {
            b.vx += n[0] * rueck; b.vy += n[1] * rueck; b.vz += n[2] * rueck;
            b.vx *= HAFTEN; b.vz *= HAFTEN;
          }
        } else { b.fliegt = false; b.vy = 0; }
      }
    } else {
      /* Dem Boden folgen – solange er nicht schneller wegfällt, als man fallen kann. */
      const noetig = (bodenNeu - bodenAlt) / dt;
      const freiFall = b.vy - G * dt;
      if (noetig < freiFall) { b.fliegt = true; b.vy = freiFall; b.y += b.vy * dt; }
      else { b.y = bodenNeu + BALL_R; b.vy = noetig; }
    }

    /* Das Loch. Es zieht ein wenig an, sobald der Ball nah genug und langsam genug ist – ohne das
       rollt ein perfekt gespielter Ball haarscharf am Becher vorbei, und niemand versteht, warum. */
    if (loch) {
      const dx = loch[0] - b.x, dz = loch[1] - b.z, d = Math.hypot(dx, dz);
      const v = Math.hypot(b.vx, b.vz);
      if (d < LOCH_R * 2.6 && v < LOCH_V && !b.fliegt) {
        const zug = (1 - d / (LOCH_R * 2.6)) * 5.5 * dt;
        b.vx += dx / (d || 1) * zug; b.vz += dz / (d || 1) * zug;
      }
      if (d < LOCH_R && v < LOCH_V && !b.fliegt) {
        b.ein = true; b.ruht = true;
        b.vx = b.vz = b.vy = 0;
        ereignisse.push({ was: 'ein', x: loch[0], z: loch[1] });
        return;
      }
    }

    /* Wasser. Ein Ball, der ins Wasser läuft, ist weg – kein Schwimmen, kein Grundberühren. */
    const art = gl.art(b.x, b.z);
    if (!art.wasser && !art.aus) { b.sicher[0] = b.x; b.sicher[1] = b.z; }
    if (art.wasser && b.y - BALL_R < gl.hoehe(b.x, b.z) + 0.34) {
      b.wasser = true; b.ruht = true; b.vx = b.vy = b.vz = 0;
      ereignisse.push({ was: 'platsch', x: b.x, y: b.y, z: b.z });
      return;
    }

    /* Ballrollen fürs Auge: Der Ball dreht sich um die Achse quer zur Fahrt, und zwar genau so
       weit, wie er Weg zurückgelegt hat. Ein Ball, der gleitet statt zu rollen, fällt sofort auf. */
    if (!b.fliegt) {
      b.drehX += b.vz * dt / BALL_R;
      b.drehZ -= b.vx * dt / BALL_R;
    }

    const v = Math.hypot(b.vx, b.vy, b.vz);
    b.seitSchlag += dt;
    if (v < RUHE_V && !b.fliegt) {
      b.ruheZeit += dt;
      if (b.ruheZeit > RUHE_ZEIT) { b.ruht = true; b.vx = b.vy = b.vz = 0; }
    } else b.ruheZeit = 0;
    /* Notbremse. Auf einem langen, ganz flachen Gefälle kann ein Ball theoretisch ewig kriechen –
       dann wartet niemand mehr gern. Nach einer halben Minute ist der Schlag vorbei. */
    if (b.seitSchlag > MAX_ZEIT) { b.ruht = true; b.vx = b.vy = b.vz = 0; }
  }

  /* Abprallen an den Felsklötzen. Gerechnet wird von oben: ein Kreis gegen ein Rechteck. Der Ball
     wird auf der Seite herausgeschoben, auf der er am wenigsten tief steckt, und prallt an dieser
     Seite ab. Über den Klotz hinweg fliegen darf er – dann liegt er höher als dessen Oberkante
     und wird gar nicht erst geprüft. */
  function felsen(b, gl, ereignisse) {
    for (const f of gl.felsen) {
      if (b.y - BALL_R > f.oben - 0.02) continue;
      const nx = Math.max(f.x0, Math.min(b.x, f.x1));
      const nz = Math.max(f.z0, Math.min(b.z, f.z1));
      const dx = b.x - nx, dz = b.z - nz;
      const d2 = dx * dx + dz * dz;
      if (d2 > BALL_R * BALL_R) continue;

      let ux, uz;
      if (d2 > 1e-8) {
        const d = Math.sqrt(d2); ux = dx / d; uz = dz / d;
        b.x = nx + ux * BALL_R; b.z = nz + uz * BALL_R;
      } else {
        /* Mitten im Klotz – das kann bei sehr schnellem Ball und einer Ecke passieren. Dann wird
           zur nächsten Seite hinausgeschoben. */
        const li = b.x - f.x0, re = f.x1 - b.x, vo = b.z - f.z0, hi = f.z1 - b.z;
        const m = Math.min(li, re, vo, hi);
        if (m === li) { ux = -1; uz = 0; b.x = f.x0 - BALL_R; }
        else if (m === re) { ux = 1; uz = 0; b.x = f.x1 + BALL_R; }
        else if (m === vo) { ux = 0; uz = -1; b.z = f.z0 - BALL_R; }
        else { ux = 0; uz = 1; b.z = f.z1 + BALL_R; }
      }
      const senk = b.vx * ux + b.vz * uz;
      if (senk < 0) {
        b.vx -= (1 + PRALL) * senk * ux;
        b.vz -= (1 + PRALL) * senk * uz;
        ereignisse.push({ was: 'prall', kraft: -senk, x: b.x, y: b.y, z: b.z });
      }
    }
  }

  /* Der ganze Schritt eines Bildes, zerlegt in kleine Rechenschritte. Zurück kommen die
     Ereignisse. Der Deckel bei 0,1 Sekunden fängt den Fall ab, dass der Reiter im Hintergrund
     lag: Sonst käme nach einer Minute ein dt von 60 Sekunden, und der Ball wäre in der nächsten
     Gemeinde. */
  function bewegen(b, gl, loch, dt) {
    const ereignisse = [];
    let rest = Math.min(dt, 0.1);
    while (rest > 1e-6 && !b.ruht) {
      const s = Math.min(SCHRITT, rest);
      schritt(b, gl, loch, s, ereignisse);
      rest -= s;
    }
    return ereignisse;
  }

  return { G, BALL_R, MAX_V, LOCH_R, ball, schlag, bewegen, schritt };
})();
