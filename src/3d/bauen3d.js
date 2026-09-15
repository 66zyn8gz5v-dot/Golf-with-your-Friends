/* Die Bauhütte: aus Zahlen werden Dreiecke.

   Alles in dieser Welt entsteht aus sechs Grundkörpern – Viereck, Quader, Keil, Walze, Kegel,
   Kugel. Eine Burg ist ein Stapel Quader mit Kegeln obendrauf, eine Tanne sind drei Kegel, ein
   Felsen ist eine verbeulte Kugel. Das ist keine Sparmaßnahme, sondern der Stil der Vorlagen:
   klare Formen, kräftige Flächen, keine Oberflächenbilder.

   **Der Sammler** ist der Kern. Man legt eine Lage fest (verschieben, drehen, skalieren), baut
   etwas hinein, und nimmt die Lage wieder weg – wie beim Zeichnen mit Schablonen. Am Ende wirft
   er wenige große Gitter aus, in denen die ganze Bahn steckt. Tausend einzelne Bäume wären
   tausend Aufrufe an die Grafikkarte und damit auf dem Telefon eine Ruckelpartie; zusammengebacken
   sind es drei.

   **Warum die Gitter geteilt werden:** Ein Gitter darf höchstens 65 536 Ecken haben, weil die
   Dreiecksliste in zwei Byte je Eintrag steht. Es gäbe eine Erweiterung für vier Byte, aber nicht
   jedes Gerät hat sie – also wird geteilt, sobald es eng wird. Das kostet nichts und läuft überall.

   **Die Windung:** Die Vorderseite eines Dreiecks ist die, von der aus seine Ecken gegen den
   Uhrzeigersinn stehen; nur die wird gezeichnet. Ein verkehrt herum gebauter Körper ist darum
   nicht falsch beleuchtet, sondern unsichtbar. Damit das niemandem passiert, nehmen die
   Grundkörper die gewünschte Richtung entgegen und drehen die Ecken notfalls selbst um. */
const Bauen = (() => {

  const ECKEN_PRO_TEIL = 60000;            // mit Reserve unter der Grenze von 65 536

  /* ---------- Farben ----------
     Angegeben wird wie überall im Spiel als '#rrggbb'; gerechnet wird mit drei Zahlen von 0 bis 1,
     weil die Grafikkarte nichts anderes kennt. */
  const farbSpeicher = new Map();
  function farbe(s) {
    if (Array.isArray(s)) return s;
    let f = farbSpeicher.get(s);
    if (!f) {
      const h = s.replace('#', '');
      const v = h.length === 3 ? h.split('').map(c => c + c).join('') : h;
      f = [parseInt(v.slice(0, 2), 16) / 255, parseInt(v.slice(2, 4), 16) / 255, parseInt(v.slice(4, 6), 16) / 255];
      farbSpeicher.set(s, f);
    }
    return f;
  }
  const mischen = (a, b, u) => { a = farbe(a); b = farbe(b); return [a[0] + (b[0] - a[0]) * u, a[1] + (b[1] - a[1]) * u, a[2] + (b[2] - a[2]) * u]; };
  /* Heller oder dunkler, ohne den Farbton zu verlieren: Ein Baum, dessen Kronen alle genau
     dieselbe Farbe haben, sieht aus wie ausgestanzt. */
  const stufe = (c, f) => { c = farbe(c); return [Math.min(1, c[0] * f), Math.min(1, c[1] * f), Math.min(1, c[2] * f)]; };

  /* Zeigt das Dreieck a,b,c in die gewünschte Richtung? Gebraucht von allen Grundkörpern, die
     ihre Ecken notfalls selbst umdrehen. Die Länge spielt keine Rolle, nur das Vorzeichen. */
  function passt(a, b, c, soll) {
    const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
    const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
    return (uy * vz - uz * vy) * soll[0] + (uz * vx - ux * vz) * soll[1] + (ux * vy - uy * vx) * soll[2] >= 0;
  }

  /* ---------- Der Sammler ---------- */
  function sammler() {
    const teile = [];
    let e = [], ix = [], n = 0;             // Ecken (je 9 Zahlen), Dreiecke, Eckenzahl
    const stapel = [M3.einheit()];
    let m = stapel[0];

    function neuesTeil() { if (n) { teile.push({ e, ix, n }); } e = []; ix = []; n = 0; }
    function platzFuer(anzahl) { if (n + anzahl > ECKEN_PRO_TEIL) neuesTeil(); }

    const p = [0, 0, 0], q = [0, 0, 0];
    function ecke(x, y, z, nx, ny, nz, c) {
      M3.punkt(m, x, y, z, p);
      M3.richtung(m, nx, ny, nz, q);
      e.push(p[0], p[1], p[2], q[0], q[1], q[2], c[0], c[1], c[2]);
      return n++;
    }

    const B = {
      /* Lage festlegen und wieder wegnehmen. 'mit' ist die bequeme Form für beides zusammen. */
      schiebe(mat) { m = M3.mult(m, mat, new Float32Array(16)); stapel.push(m); return B; },
      hebe() { stapel.pop(); m = stapel[stapel.length - 1]; return B; },
      mit(mat, tu) { B.schiebe(mat); tu(B); B.hebe(); return B; },
      /* Die häufigste Lage am Stück: hinstellen, um die Hochachse drehen, größer machen. */
      stelle(x, y, z, drehung, groesse, tu) {
        let mat = M3.verschieben(x, y, z);
        if (drehung) mat = M3.mult(mat, M3.drehenY(drehung), mat);
        if (groesse && groesse !== 1) mat = M3.mult(mat, M3.skalieren(groesse), mat);
        return B.mit(mat, tu);
      },

      /* Ein Dreieck mit einer einzigen Normalen für alle drei Ecken – das gibt die klare,
         flächige Schattierung, von der der Stil lebt. */
      dreieck(a, b, c, col) {
        col = farbe(col);
        const ux = b[0] - a[0], uy = b[1] - a[1], uz = b[2] - a[2];
        const vx = c[0] - a[0], vy = c[1] - a[1], vz = c[2] - a[2];
        let nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
        const l = Math.hypot(nx, ny, nz) || 1; nx /= l; ny /= l; nz /= l;
        platzFuer(3);
        const i = ecke(a[0], a[1], a[2], nx, ny, nz, col);
        ecke(b[0], b[1], b[2], nx, ny, nz, col);
        ecke(c[0], c[1], c[2], nx, ny, nz, col);
        ix.push(i, i + 1, i + 2);
        return B;
      },

      /* Ein Dreieck mit eigenen Normalen je Ecke – für alles Runde, das weich wirken soll. */
      /* Ein Zweigkranz: die Etage eines Nadelbaums.

         Ein Kegel ist rund, und ein runder Nadelbaum sieht aus wie ein Hütchen. Eine Tannenetage
         besteht in Wirklichkeit aus einzelnen Zweigen, die in verschiedenen Längen nach außen
         gehen und an den Spitzen hängen. Genau das steht hier: Der Kranz wechselt von Kante zu
         Kante zwischen langen und kurzen Zweigen, und die langen hängen tiefer.

         Er kostet dabei WENIGER als der Kegel, den er ersetzt – ein Kegelstumpf braucht Mantel und
         zwei Deckel, dieser Kranz nur Ober- und Unterseite. Detail muss nicht teuer sein, sie
         muss an der richtigen Stelle sitzen.

         'zacke' ist die Länge der kurzen Zweige im Verhältnis zu den langen, 'haenge' wie tief die
         langen durchhängen. */
      zweigkranz(rLang, hoehe, kanten, col, colOben, zacke = 0.62, haenge = 0.3) {
        const c = farbe(col), co = colOben ? farbe(colOben) : c;
        const spitze = [0, hoehe, 0];
        const p = i => {
          const a = i / kanten * M3.TAU3;
          const lang = (i % 2) ? zacke : 1;
          const rr = rLang * lang;
          return [Math.cos(a) * rr, -haenge * hoehe * lang * lang, Math.sin(a) * rr];
        };
        for (let i = 0; i < kanten; i++) {
          const u = p(i), v = p(i + 1);
          /* Oberseite: von der Spitze nach außen. Unterseite: zurück zur Mitte, damit der Kranz
             geschlossen ist und im Schattenbild eine Fläche hat. */
          B.dreieck(spitze, v, u, co);
          B.dreieck([0, 0, 0], u, v, c);
        }
        return B;
      },

      dreieckWeich(a, b, c, na, nb, nc, col) {
        col = farbe(col);
        platzFuer(3);
        const i = ecke(a[0], a[1], a[2], na[0], na[1], na[2], col);
        ecke(b[0], b[1], b[2], nb[0], nb[1], nb[2], col);
        ecke(c[0], c[1], c[2], nc[0], nc[1], nc[2], col);
        ix.push(i, i + 1, i + 2);
        return B;
      },

      /* Vier Ecken, zwei Dreiecke. 'soll' ist die gewünschte Blickrichtung der Fläche; zeigt die
         gebaute in die andere Richtung, wird die Reihenfolge umgedreht. Damit kann man Quader
         bauen, ohne über den Uhrzeigersinn nachzudenken. */
      viereck(a, b, c, d, col, soll) {
        if (soll && !passt(a, b, c, soll)) { const t = b; b = d; d = t; }
        B.dreieck(a, b, c, col); B.dreieck(a, c, d, col);
        return B;
      },

      /* Ein Vieleck als Fächer – für Dachflächen, Wimpel, Seerosenblätter. */
      flaeche(punkte, col, soll) {
        for (let i = 1; i + 1 < punkte.length; i++) {
          let a = punkte[0], b = punkte[i], c = punkte[i + 1];
          if (soll && !passt(a, b, c, soll)) { const t = b; b = c; c = t; }
          B.dreieck(a, b, c, col);
        }
        return B;
      },

      /* Achsentreuer Quader von einer Ecke zur anderen. */
      quader(x0, y0, z0, x1, y1, z1, col, obenCol) {
        const o = obenCol ? farbe(obenCol) : col;
        const P = (x, y, z) => [x, y, z];
        B.viereck(P(x0, y1, z0), P(x1, y1, z0), P(x1, y1, z1), P(x0, y1, z1), o, [0, 1, 0]);
        B.viereck(P(x0, y0, z0), P(x1, y0, z0), P(x1, y0, z1), P(x0, y0, z1), col, [0, -1, 0]);
        B.viereck(P(x0, y0, z1), P(x1, y0, z1), P(x1, y1, z1), P(x0, y1, z1), col, [0, 0, 1]);
        B.viereck(P(x0, y0, z0), P(x1, y0, z0), P(x1, y1, z0), P(x0, y1, z0), col, [0, 0, -1]);
        B.viereck(P(x1, y0, z0), P(x1, y0, z1), P(x1, y1, z1), P(x1, y1, z0), col, [1, 0, 0]);
        B.viereck(P(x0, y0, z0), P(x0, y0, z1), P(x0, y1, z1), P(x0, y1, z0), col, [-1, 0, 0]);
        return B;
      },
      /* Ein Kasten, der auf dem Boden steht und um die Hochachse mittig ist – die Form, die man
         beim Hinstellen von Türmen, Häusern und Kisten eigentlich meint. */
      kasten(b, h, t, col, obenCol) { return B.quader(-b / 2, 0, -t / 2, b / 2, h, t / 2, col, obenCol); },

      /* Keil: eine Rampe, die von y0 auf y1 steigt, über die Länge in Z. */
      keil(b, y0, y1, t, col) {
        const hb = b / 2, ht = t / 2;
        B.viereck([-hb, y0, -ht], [hb, y0, -ht], [hb, y1, ht], [-hb, y1, ht], col, [0, 1, -0.2]);
        B.viereck([-hb, 0, -ht], [hb, 0, -ht], [hb, 0, ht], [-hb, 0, ht], col, [0, -1, 0]);
        B.viereck([-hb, 0, ht], [hb, 0, ht], [hb, y1, ht], [-hb, y1, ht], col, [0, 0, 1]);
        B.viereck([-hb, 0, -ht], [hb, 0, -ht], [hb, y0, -ht], [-hb, y0, -ht], col, [0, 0, -1]);
        B.flaeche([[hb, 0, -ht], [hb, y0, -ht], [hb, y1, ht], [hb, 0, ht]], col, [1, 0, 0]);
        B.flaeche([[-hb, 0, -ht], [-hb, y0, -ht], [-hb, y1, ht], [-hb, 0, ht]], col, [-1, 0, 0]);
        return B;
      },

      /* Ein Drehkörper: Ein Umriss aus Paaren { r, y } wird um die Hochachse gedreht. Damit
         entstehen Formen, für die Walze und Kugel nicht reichen – ein Tropfen, eine Urne, ein
         Pilzhut. Die Normalen werden aus der Steigung des Umrisses gerechnet und an den Knicken
         gemittelt; deshalb wirkt ein Tropfen rund und nicht wie ein Stapel Ringe.

         'colOben' färbt nach oben hin um. Fast alles Gewachsene ist oben heller als unten – das
         ist der halbe Unterschied zwischen „Kegel" und „Baum". */
      drehkoerper(umriss, kanten, col, colOben, zottel = 0, saat = 3) {
        const c = farbe(col), co = colOben ? farbe(colOben) : null;
        /* "zottel" beult den Umriss je Ecke und Ring aus und schaltet dabei auf flache Schattierung
           um. Für Laub ist das der ganze Unterschied: Eine glatte Drehung bleibt eine gedrechselte
           Säule, mit Beulen und einzeln beleuchteten Facetten wird daraus eine Krone. Es kostet
           kein einziges Dreieck mehr – nur andere Ecken. */
        const zz = zottel ? M3.zufall(saat * 1493 + 7) : null;
        const beule = [];
        if (zz) for (let i = 0; i < umriss.length * (kanten + 1); i++) beule.push(1 + (zz() * 2 - 1) * zottel);
        const dehnen = (i, k) => (zz && umriss[i].r > 1e-5 ? beule[i * (kanten + 1) + (k % kanten)] : 1);
        const y0 = umriss[0].y, y1 = umriss[umriss.length - 1].y, hoch = (y1 - y0) || 1;
        // Normale je Umrisspunkt: aus den Steigungen davor und danach gemittelt
        const norm = umriss.map((p, i) => {
          let sx = 0, sy = 0;
          for (const [a, b] of [[i - 1, i], [i, i + 1]]) {
            if (a < 0 || b >= umriss.length) continue;
            const dr = umriss[b].r - umriss[a].r, dy = umriss[b].y - umriss[a].y;
            const l = Math.hypot(dr, dy) || 1;
            sx += dy / l; sy += -dr / l;
          }
          const l = Math.hypot(sx, sy) || 1;
          return [sx / l, sy / l];
        });
        for (let i = 0; i + 1 < umriss.length; i++) {
          const a = umriss[i], b = umriss[i + 1], na = norm[i], nb = norm[i + 1];
          const f = co ? mischen(c, co, ((a.y + b.y) / 2 - y0) / hoch) : c;
          for (let k = 0; k < kanten; k++) {
            const w0 = k / kanten * M3.TAU3, w1 = (k + 1) / kanten * M3.TAU3;
            const c0 = Math.cos(w0), s0 = Math.sin(w0), c1 = Math.cos(w1), s1 = Math.sin(w1);
            const ra0 = a.r * dehnen(i, k), ra1 = a.r * dehnen(i, k + 1);
            const rb0 = b.r * dehnen(i + 1, k), rb1 = b.r * dehnen(i + 1, k + 1);
            const u0 = [c0 * ra0, a.y, s0 * ra0], u1 = [c1 * ra1, a.y, s1 * ra1];
            const o0 = [c0 * rb0, b.y, s0 * rb0], o1 = [c1 * rb1, b.y, s1 * rb1];
            const nu0 = [c0 * na[0], na[1], s0 * na[0]], nu1 = [c1 * na[0], na[1], s1 * na[0]];
            const no0 = [c0 * nb[0], nb[1], s0 * nb[0]], no1 = [c1 * nb[0], nb[1], s1 * nb[0]];
            if (a.r < 1e-5) zz ? B.dreieck(u0, o0, o1, f) : B.dreieckWeich(u0, o0, o1, [0, -1, 0], no0, no1, f);
            else if (b.r < 1e-5) zz ? B.dreieck(u0, [0, b.y, 0], u1, f) : B.dreieckWeich(u0, [0, b.y, 0], u1, nu0, [0, 1, 0], nu1, f);
            else if (zz) { B.dreieck(u0, o0, o1, f); B.dreieck(u0, o1, u1, f); }
            else { B.dreieckWeich(u0, o0, o1, nu0, no0, no1, f); B.dreieckWeich(u0, o1, u1, nu0, no1, nu1, f); }
          }
        }
        return B;
      },

      /* Walze und Kegel in einem: 'r1' ist der Halbmesser oben. r1 = 0 gibt einen Kegel, r1 = r0
         eine Walze, alles dazwischen einen Kegelstumpf – Turm, Baumstamm, Fass, Zeltdach.
         Die Mantelflächen bekommen weiche Normalen, damit eine Walze rund wirkt und nicht wie ein
         Bleistift; die Deckel bleiben flach. 'kanten' klein gewählt sieht bewusst kantig aus.
         'deckelCol' ausdrücklich auf null gesetzt lässt die Deckel ganz weg – für Röhren, die
         im Boden stecken, und für Kronen, die ohnehin von einer anderen Form verdeckt werden. */
      walze(r0, r1, h, kanten, col, deckelCol, y0 = 0, colOben) {
        const c = colOben ? mischen(col, colOben, 0.5) : farbe(col), d = deckelCol ? farbe(deckelCol) : c;
        const y1 = y0 + h;
        /* Die Neigung des Mantels geht in die Normale ein: Bei einem spitzen Kegel zeigt sie
           deutlich nach oben, bei einer Walze waagerecht. Ohne das wäre ein Kegel von oben
           gesehen genauso hell wie von der Seite. */
        const steig = (r0 - r1) / (h || 1);
        const nl = Math.hypot(1, steig);
        for (let i = 0; i < kanten; i++) {
          const a0 = i / kanten * M3.TAU3, a1 = (i + 1) / kanten * M3.TAU3;
          const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
          const n0 = [c0 / nl, steig / nl, s0 / nl], n1 = [c1 / nl, steig / nl, s1 / nl];
          const u0 = [c0 * r0, y0, s0 * r0], u1 = [c1 * r0, y0, s1 * r0];
          const o0 = [c0 * r1, y1, s0 * r1], o1 = [c1 * r1, y1, s1 * r1];
          if (r1 > 1e-5) { B.dreieckWeich(u0, o0, o1, n0, n0, n1, c); B.dreieckWeich(u0, o1, u1, n0, n1, n1, c); }
          else B.dreieckWeich(u0, [0, y1, 0], u1, n0, [0, 1, 0], n1, c);
          if (r1 > 1e-5 && deckelCol !== null) B.dreieck(o1, o0, [0, y1, 0], d);
          if (r0 > 1e-5 && deckelCol !== null) B.dreieck([0, y0, 0], u0, u1, d);
        }
        return B;
      },

      /* Eine Röhre: eine Walze mit einem Loch von oben nach unten. Gebaut wird sie aus vier
         Teilen – Außenmantel, Innenmantel und zwei Kreisringen an den Enden.

         Der Innenmantel ist das Besondere daran: Seine Dreiecke laufen andersherum und seine
         Normalen zeigen nach innen. Ohne beides sähe man beim Blick in die Röhre nichts als das,
         was dahinter liegt – Rückseiten werden nicht gezeichnet, und eine nach außen zeigende
         Normale macht aus der Innenwand eine Fläche, die von der falschen Seite beleuchtet wird.

         'beule' verzieht den Außenmantel, damit ein hohler Baumstamm nicht wie ein Abflussrohr
         aussieht. Innen bleibt es glatt: Dort rollt der Ball. */
      roehre(rAussen, rInnen, h, kanten, col, colInnen, beule = 0, saat = 3) {
        const ca = farbe(col), ci = farbe(colInnen || col);
        const z = beule ? M3.zufall(saat * 1201 + 5) : null;
        const knick = [];
        for (let i = 0; i <= kanten; i++) knick.push(z ? 1 + (z() * 2 - 1) * beule : 1);
        const p = (i, r, y) => {
          const a = (i % kanten) / kanten * M3.TAU3;
          return [Math.cos(a) * r, y, Math.sin(a) * r];
        };
        for (let i = 0; i < kanten; i++) {
          const a0 = i / kanten * M3.TAU3, a1 = (i + 1) / kanten * M3.TAU3;
          const c0 = Math.cos(a0), s0 = Math.sin(a0), c1 = Math.cos(a1), s1 = Math.sin(a1);
          const k0 = knick[i], k1 = knick[i + 1];
          const A0 = [c0 * rAussen * k0, 0, s0 * rAussen * k0], A1 = [c1 * rAussen * k1, 0, s1 * rAussen * k1];
          const B0 = [c0 * rAussen * k0, h, s0 * rAussen * k0], B1 = [c1 * rAussen * k1, h, s1 * rAussen * k1];
          const I0 = p(i, rInnen, 0), I1 = p(i + 1, rInnen, 0);
          const J0 = p(i, rInnen, h), J1 = p(i + 1, rInnen, h);
          // Außenmantel, Normale nach außen
          B.dreieckWeich(A0, B0, B1, [c0, 0, s0], [c0, 0, s0], [c1, 0, s1], ca);
          B.dreieckWeich(A0, B1, A1, [c0, 0, s0], [c1, 0, s1], [c1, 0, s1], ca);
          // Innenmantel, andersherum und mit Normale nach innen
          B.dreieckWeich(I0, J1, J0, [-c0, 0, -s0], [-c1, 0, -s1], [-c0, 0, -s0], ci);
          B.dreieckWeich(I0, I1, J1, [-c0, 0, -s0], [-c1, 0, -s1], [-c1, 0, -s1], ci);
          /* Die beiden Kreisringe an den Enden. Die Reihenfolge der Ecken ist dieselbe wie bei
             den Deckeln der Walze – nur steht dort, wo bei ihr der Mittelpunkt steht, hier der
             Innenkreis. */
          B.dreieck(B1, B0, J0, ci); B.dreieck(B1, J0, J1, ci);
          B.dreieck(I0, A0, A1, ci); B.dreieck(I0, A1, I1, ci);
        }
        return B;
      },

      /* Kugel mit weichen Normalen. 'beule' verzieht sie unregelmäßig – so wird aus einer Kugel
         ein Findling oder eine Baumkrone, ohne dass jemand einen Felsen von Hand modelliert. */
      /* 'colOben' färbt die Kugel nach oben hin um – ein Dreieck bekommt die Farbe, die zu
         seiner mittleren Höhe gehört. Bei wenigen Ringen gibt das sichtbare Bänder, und genau
         so sehen die gemalten Vorlagen aus. */
      kugel(r, ringe, kanten, col, beule, saat, colOben, hart) {
        const c = farbe(col);
        const z = beule ? M3.zufall(saat || 7) : null;
        const knick = [];
        if (z) for (let i = 0; i < (ringe + 1) * (kanten + 1); i++) knick.push(1 + (z() * 2 - 1) * beule);
        const punkt = (i, j) => {
          const t = i / ringe * Math.PI, a = j / kanten * M3.TAU3;
          const st = Math.sin(t), nx = st * Math.cos(a), ny = Math.cos(t), nz = st * Math.sin(a);
          /* Die Pole bleiben glatt. Eine Beule dort würde den einen Punkt, an dem alle Ecken
             zusammenlaufen, für jede Ecke anders verschieben – die Kugel bekäme oben ein Loch. */
          const k = z && i > 0 && i < ringe ? knick[i * (kanten + 1) + (j % kanten)] : 1;
          return { p: [nx * r * k, ny * r * k, nz * r * k], n: [nx, ny, nz] };
        };
        for (let i = 0; i < ringe; i++) for (let j = 0; j < kanten; j++) {
          const a = punkt(i, j), b = punkt(i, j + 1), d = punkt(i + 1, j + 1), f = punkt(i + 1, j);
          const farbeHier = colOben ? mischen(c, colOben, 1 - (i + 0.5) / ringe) : c;
          /* Am Pol fallen zwei Ecken des Vierecks zusammen; dort bleibt nur ein Dreieck übrig.
             Das ist der Grund für die beiden Abfragen – ohne sie stünden an Nord- und Südpol
             entartete Dreiecke ohne Fläche, und eines der beiden Kappenstücke fehlte. */
          /* "hart" heißt: keine gemittelten Normalen, sondern eine je Dreieck. Für Laubballen ist
             das der Unterschied zwischen einer Kugel und einem Büschel – die Facetten fangen das
             Licht einzeln, und aus sechs Kanten wird ein zerklüfteter Umriss statt einer Murmel. */
          if (i > 0) hart ? B.dreieck(a.p, b.p, d.p, farbeHier) : B.dreieckWeich(a.p, b.p, d.p, a.n, b.n, d.n, farbeHier);
          if (i + 1 < ringe) hart ? B.dreieck(a.p, d.p, f.p, farbeHier) : B.dreieckWeich(a.p, d.p, f.p, a.n, d.n, f.n, farbeHier);
        }
        return B;
      },

      /* Wie viele Ecken stecken schon drin? Nützlich beim Nachrechnen, ob eine Bahn zu groß wird. */
      ecken() { return teile.reduce((s, t) => s + t.n, 0) + n; },

      /* Zum Schluss: alles in echte Gitter gießen. Danach ist der Sammler leer. */
      fertig(zeichner, beweglich) {
        return B.rohfertig().map(t => zeichner.netz(t.e, t.ix, beweglich));
      },

      /* Dasselbe, aber ohne Grafikkarte: nur die nackten Zahlen. Das braucht zweierlei – das
         Fahnentuch, dessen Ecken bei jedem Bild neu gerechnet werden, und die Prüfskripte, die
         ohne Browser nachrechnen, ob alle Dreiecke richtig herum liegen. */
      rohfertig() {
        neuesTeil();
        const raus = teile.map(t => ({ e: new Float32Array(t.e), ix: new Uint16Array(t.ix) }));
        teile.length = 0;
        return raus;
      },
    };
    return B;
  }

  return { sammler, farbe, mischen, stufe, ECKEN_PRO_TEIL };
})();
