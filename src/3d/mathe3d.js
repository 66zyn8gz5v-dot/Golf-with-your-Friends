/* Rechnen für drei Dimensionen: Punkte, Matrizen, Winkel.

   Warum eine eigene Datei und keine fertige Bibliothek: Die Seite darf nach ihren eigenen
   Sicherheitsregeln (siehe index.html, script-src 'self') nichts Fremdes laden, und was hier
   gebraucht wird, sind zwölf Funktionen. Eine halbe Million Zeichen fremder Code für zwölf
   Funktionen wäre ein schlechter Tausch – zumal jede Zeile dieses Spiels erklärt ist und
   eingekaufter Code das nicht wäre.

   Zwei Festlegungen, die überall gelten und die man kennen muss, sonst steht am Ende alles auf
   dem Kopf:

   1. Die Achsen. X zeigt nach rechts, Y nach oben, Z zum Betrachter. Das ist die übliche Ordnung
      von WebGL. Auf dem Boden – und der ist hier fast alles – zählen also X und Z; Y ist die Höhe.

   2. Die Matrizen stehen spaltenweise im Speicher, weil WebGL sie so erwartet. m[12], m[13], m[14]
      sind darum die Verschiebung, nicht m[3], m[7], m[11]. Wer das verwechselt, bekommt eine Welt,
      die sich beim Drehen auseinanderzieht. */
const M3 = (() => {
  const TAU3 = Math.PI * 2;

  /* ---------- Matrizen (4x4, spaltenweise) ---------- */

  const einheit = () => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]);

  /* a mal b. 'ziel' darf a oder b sein – deshalb wird erst gerechnet und dann geschrieben. */
  function mult(a, b, ziel) {
    const o = ziel || new Float32Array(16);
    const t = mult.puffer;
    for (let c = 0; c < 4; c++) for (let r = 0; r < 4; r++) {
      t[c * 4 + r] = a[r] * b[c * 4] + a[4 + r] * b[c * 4 + 1] + a[8 + r] * b[c * 4 + 2] + a[12 + r] * b[c * 4 + 3];
    }
    o.set(t);
    return o;
  }
  mult.puffer = new Float32Array(16);

  /* Perspektive: Was weiter weg ist, wird kleiner. 'sicht' ist der senkrechte Öffnungswinkel im
     Bogenmaß, 'nah' und 'fern' begrenzen, was überhaupt gezeichnet wird. Die beiden nicht zu weit
     auseinanderlegen: Der Tiefenspeicher hat nur endlich viele Stufen, und ein 'nah' von 0,01 bei
     einem 'fern' von 1000 lässt entfernte Flächen miteinander flackern. */
  function perspektive(sicht, seite, nah, fern) {
    const f = 1 / Math.tan(sicht / 2), n = 1 / (nah - fern);
    return new Float32Array([f / seite, 0, 0, 0, 0, f, 0, 0, 0, 0, (fern + nah) * n, -1, 0, 0, 2 * fern * nah * n, 0]);
  }

  /* Parallelprojektion – ohne Verkleinerung in die Ferne. Gebraucht wird sie nur für die Sonne:
     Sonnenstrahlen laufen parallel, also muss auch der Schattenwurf parallel gerechnet werden. */
  function parallel(l, r, u, o, nah, fern) {
    const dx = 1 / (r - l), dy = 1 / (o - u), dz = 1 / (nah - fern);
    return new Float32Array([2 * dx, 0, 0, 0, 0, 2 * dy, 0, 0, 0, 0, 2 * dz, 0,
      -(r + l) * dx, -(o + u) * dy, (fern + nah) * dz, 1]);
  }

  /* Kameramatrix: von 'auge' auf 'ziel' geschaut, 'oben' sagt, wo oben ist. */
  function blick(auge, ziel, oben) {
    let zx = auge[0] - ziel[0], zy = auge[1] - ziel[1], zz = auge[2] - ziel[2];
    let l = Math.hypot(zx, zy, zz) || 1; zx /= l; zy /= l; zz /= l;
    let xx = oben[1] * zz - oben[2] * zy, xy = oben[2] * zx - oben[0] * zz, xz = oben[0] * zy - oben[1] * zx;
    l = Math.hypot(xx, xy, xz);
    /* Blickt die Kamera genau senkrecht nach unten, ist sie parallel zu 'oben' und das Kreuzprodukt
       wird null – die Matrix wäre nicht mehr umkehrbar und das Bild verschwände. Dann wird 'oben'
       einmal ausgewichen. Passiert in der Übersicht von oben regelmäßig. */
    if (l < 1e-6) { xx = 1; xy = 0; xz = 0; } else { xx /= l; xy /= l; xz /= l; }
    const yx = zy * xz - zz * xy, yy = zz * xx - zx * xz, yz = zx * xy - zy * xx;
    return new Float32Array([
      xx, yx, zx, 0, xy, yy, zy, 0, xz, yz, zz, 0,
      -(xx * auge[0] + xy * auge[1] + xz * auge[2]),
      -(yx * auge[0] + yy * auge[1] + yz * auge[2]),
      -(zx * auge[0] + zy * auge[1] + zz * auge[2]), 1]);
  }

  const verschieben = (x, y, z) => new Float32Array([1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1]);
  const skalieren = (x, y = x, z = x) => new Float32Array([x, 0, 0, 0, 0, y, 0, 0, 0, 0, z, 0, 0, 0, 0, 1]);
  const drehenX = w => { const c = Math.cos(w), s = Math.sin(w); return new Float32Array([1, 0, 0, 0, 0, c, s, 0, 0, -s, c, 0, 0, 0, 0, 1]); };
  const drehenY = w => { const c = Math.cos(w), s = Math.sin(w); return new Float32Array([c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1]); };
  const drehenZ = w => { const c = Math.cos(w), s = Math.sin(w); return new Float32Array([c, s, 0, 0, -s, c, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1]); };

  /* Punkt durch eine Matrix schicken (mit w=1, also mit Verschiebung). */
  function punkt(m, x, y, z, ziel) {
    const o = ziel || [0, 0, 0];
    o[0] = m[0] * x + m[4] * y + m[8] * z + m[12];
    o[1] = m[1] * x + m[5] * y + m[9] * z + m[13];
    o[2] = m[2] * x + m[6] * y + m[10] * z + m[14];
    return o;
  }
  /* Richtung durch eine Matrix schicken (mit w=0, also ohne Verschiebung) – für Normalen.
     Das gilt nur, solange die Matrix dreht, verschiebt und gleichmäßig skaliert; eine ungleiche
     Skalierung würde die Normalen verkippen. Im ganzen Spiel wird nur gleichmäßig skaliert. */
  function richtung(m, x, y, z, ziel) {
    const o = ziel || [0, 0, 0];
    o[0] = m[0] * x + m[4] * y + m[8] * z;
    o[1] = m[1] * x + m[5] * y + m[9] * z;
    o[2] = m[2] * x + m[6] * y + m[10] * z;
    const l = Math.hypot(o[0], o[1], o[2]) || 1;
    o[0] /= l; o[1] /= l; o[2] /= l;
    return o;
  }

  /* ---------- Kleinkram, der überall gebraucht wird ---------- */
  const klemm = (v, a, b) => v < a ? a : v > b ? b : v;
  const misch = (a, b, u) => a + (b - a) * u;
  const weich = u => u * u * (3 - 2 * u);                 // weiches Ein- und Ausblenden
  /* Ein Winkel, der bei jedem Schritt den kürzeren Weg nimmt: 3,1 nach -3,1 sind 0,08 und nicht
     6,2. Ohne das dreht sich die Kamera beim Überschreiten von 180 Grad einmal ganz herum. */
  const winkelDiff = (a, b) => { let d = (b - a) % TAU3; if (d > Math.PI) d -= TAU3; if (d < -Math.PI) d += TAU3; return d; };

  /* Gleichmäßig verteilter Zufall mit Startwert – dieselbe Zahl gibt dieselbe Welt. Genau wie im
     2,5D-Spiel: Ein Baum, der bei jedem Laden woanders steht, ist kein Baum, sondern ein Fehler. */
  function zufall(start) {
    let s = start >>> 0;
    return () => { s ^= s << 13; s >>>= 0; s ^= s >> 17; s ^= s << 5; s >>>= 0; return s / 4294967296; };
  }

  /* Wertrauschen, weich zwischen den Gitterpunkten. Damit bekommen Gelände, Küste und Grasfarbe
     ihre Unregelmäßigkeit, ohne dass jemand sie von Hand eintragen muss. */
  function rauschen(start) {
    const r = zufall(start), tafel = new Float32Array(4096);
    for (let i = 0; i < tafel.length; i++) tafel[i] = r() * 2 - 1;
    const knoten = (i, j) => tafel[(((i * 73856093) ^ (j * 19349663)) >>> 0) % 4096];
    return (x, z) => {
      const i = Math.floor(x), j = Math.floor(z), fx = weich(x - i), fz = weich(z - j);
      const a = misch(knoten(i, j), knoten(i + 1, j), fx);
      const b = misch(knoten(i, j + 1), knoten(i + 1, j + 1), fx);
      return misch(a, b, fz);
    };
  }

  return { TAU3, einheit, mult, perspektive, parallel, blick, verschieben, skalieren,
    drehenX, drehenY, drehenZ, punkt, richtung, klemm, misch, weich, winkelDiff, zufall, rauschen };
})();
