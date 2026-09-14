/* Was in der Landschaft steht: Burg, Türme, Häuser, Bäume, Felsen, Zäune, Fahnen, Wolken.

   Jedes Stück wird am Nullpunkt gebaut, steht auf dem Boden (y = 0) und ist ungefähr eine Einheit
   groß, wo das Sinn ergibt. Hingestellt wird es mit B.stelle(x, y, z, drehung, groesse, …) – so
   kann dieselbe Tanne einmal als Setzling und einmal als Waldriese wachsen, und niemand muss
   Maße an zwei Stellen pflegen.

   Die Farben stehen hier oben zusammen und nicht verstreut im Code. Der Grund ist die zweite
   Welt, die irgendwann kommt: Ein Schneeberg braucht dieselben Formen in anderen Farben. Wer die
   Farbtafel austauscht, bekommt dieselbe Landschaft in einer anderen Jahreszeit.

   Vorbild sind die gemalten Bilder zum Spiel: helle Sandsteinmauern, blaue Spitzdächer, rote
   Banner mit goldenem Löwen, sattes Grün, dunkle Nadelwälder an den Hängen. */
const Deko3D = (() => {
  const F = {
    stein: '#ded6c4', steinDunkel: '#b3a992', steinTief: '#8d8471',
    dach: '#3d5da8', dachDunkel: '#2b447f', dachRot: '#a8443a',
    holz: '#8a5f38', holzDunkel: '#5f4026', holzHell: '#b1865a',
    putz: '#f0e6d2', fachwerk: '#6b4a2c',
    tanne: '#2f6b3a', tanneDunkel: '#23512c', laub: '#59a83f', laubDunkel: '#3f8a2d',
    stammFarbe: '#6d4a2a',
    fels: '#9a9488', felsHell: '#b8b2a4',
    fahnenRot: '#b63a30', gold: '#e0a94a',
    wolke: '#ffffff', wolkeSchatten: '#d8e6f2',
    wasserFall: '#bfe7f7',
  };

  /* ---------- Bäume ----------

     Sieben Arten, und alle können dasselbe: Sie stehen am Nullpunkt, wachsen nach oben und
     richten sich nach einer Höhe. Hingestellt werden sie über baum(); welche Art wo wächst,
     entscheidet der Bewuchs in welt3d.js.

     Was sie gemeinsam haben, ist der Stil der Vorlage: **oben heller als unten.** Fast alles
     Gewachsene ist das, und es ist der halbe Unterschied zwischen einem Kegel und einem Baum.
     Der zweite halbe Unterschied ist der Stamm – ein senkrechter Stab sieht nach Lampe aus, ein
     leicht gekippter, unten breiterer nach Holz.

     Die Farben kommen aus einer kleinen Tafel und werden je Baum ausgelost: ein bisschen
     gelblicher, ein bisschen bläulicher. Ein Wald, in dem alle Kronen dasselbe Grün haben, sieht
     aus wie Filz. */
  const KRONEN = [
    ['#3f8a2d', '#6fbf4a'], ['#4f9a3c', '#8ece5a'], ['#397f34', '#63b455'],
    ['#568f2c', '#93cf52'], ['#33753a', '#5cab5e'],
  ];
  const NADELN = [
    ['#23512c', '#4f8e46'], ['#265a30', '#57993f'], ['#1f4a33', '#468a52'],
  ];

  /* Ein Stamm: unten breiter, oben schmaler, mit einem leichten Knick. Der Wurzelanlauf ist ein
     eigener, kurzer Kegel – ohne ihn steht der Baum auf dem Boden wie ein hineingesteckter
     Bleistift. */
  function stamm(B, hoehe, dicke, kippen, farbe = F.stammFarbe) {
    B.walze(dicke * 1.7, dicke * 1.05, hoehe * 0.16, 7, farbe, null);
    B.mit(M3.drehenZ(kippen), b => b.walze(dicke * 1.05, dicke * 0.75, hoehe, 7, farbe, null, hoehe * 0.14));
    return hoehe * 0.95;
  }

  /* Die gestufte Tanne: mehrere Kegel übereinander, jeder ein wenig kleiner, mit einer Lücke
     dazwischen. Die Lücke ist das Entscheidende – ohne sie entsteht ein glatter Kegel, mit ihr
     sieht man die Etagen, die eine Tanne ausmachen. */
  function tanne(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 977 + 13), fa = NADELN[Math.floor(r() * NADELN.length)];
    const stammH = hoehe * 0.17;
    B.walze(hoehe * 0.055, hoehe * 0.04, stammH, 6, F.stammFarbe, null);
    const lagen = 4 + (r() < 0.45 ? 1 : 0);
    for (let i = 0; i < lagen; i++) {
      const u = i / lagen;
      const y = stammH + hoehe * (0.70 * u) * (1 - u * 0.12);
      const rr = hoehe * (0.30 - u * 0.22) * (0.92 + r() * 0.16);
      const hh = hoehe * (0.34 - u * 0.12);
      const f = Bauen.mischen(fa[0], fa[1], u);
      B.mit(M3.verschieben(0, y, 0), b => {
        b.walze(rr, rr * 0.16, hh, 8, f, null, 0, Bauen.mischen(fa[0], fa[1], Math.min(1, u + 0.35)));
      });
    }
    return B;
  }

  /* Die Kiefer: ein langer, kahler Stamm und ganz oben drei dünne Schirme. Aus der Ferne ist sie
     an ihrer Silhouette zu erkennen und nicht an der Farbe – deshalb steht sie im Wald zwischen
     den Tannen und macht ihn unruhig. */
  function kiefer(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 613 + 41), fa = NADELN[Math.floor(r() * NADELN.length)];
    const oben = stamm(B, hoehe * 0.72, hoehe * 0.035, (r() - 0.5) * 0.06);
    for (let i = 0; i < 3; i++) {
      const u = i / 2;
      const y = oben * (0.82 + u * 0.26);
      const rr = hoehe * (0.26 - u * 0.15);
      B.mit(M3.verschieben((r() - 0.5) * hoehe * 0.04, y, (r() - 0.5) * hoehe * 0.04),
        b => b.drehkoerper([{ r: 0, y: 0 }, { r: rr, y: hoehe * 0.05 }, { r: rr * 0.9, y: hoehe * 0.08 },
          { r: 0, y: hoehe * 0.17 }], 9, fa[0], fa[1]));
    }
    return B;
  }

  /* Die Pappel: eine schlanke Säule. Sie ist der einzige Baum, der höher als breit aussieht, und
     ein paar davon in einer Reihe geben einer Wiese sofort eine Richtung. */
  function pappel(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 271 + 7), fa = KRONEN[Math.floor(r() * KRONEN.length)];
    const dick = hoehe * (0.10 + r() * 0.03);
    B.walze(hoehe * 0.04, hoehe * 0.03, hoehe * 0.2, 6, F.stammFarbe, null);
    B.mit(M3.verschieben(0, hoehe * 0.12, 0), b => b.drehkoerper([
      { r: 0, y: 0 }, { r: dick * 0.7, y: hoehe * 0.10 }, { r: dick, y: hoehe * 0.34 },
      { r: dick * 0.92, y: hoehe * 0.62 }, { r: dick * 0.55, y: hoehe * 0.84 }, { r: 0, y: hoehe },
    ], 9, fa[0], fa[1]));
    return B;
  }

  /* Der Tropfenbaum: eine glatte, nach oben spitz zulaufende Krone auf kurzem Stamm. */
  function tropfenbaum(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 449 + 19), fa = KRONEN[Math.floor(r() * KRONEN.length)];
    const oben = stamm(B, hoehe * 0.3, hoehe * 0.045, (r() - 0.5) * 0.1);
    const rr = hoehe * (0.23 + r() * 0.05);
    B.mit(M3.verschieben(0, oben, 0), b => b.drehkoerper([
      { r: 0, y: 0 }, { r: rr * 0.8, y: hoehe * 0.09 }, { r: rr, y: hoehe * 0.26 },
      { r: rr * 0.78, y: hoehe * 0.45 }, { r: rr * 0.42, y: hoehe * 0.58 }, { r: 0, y: hoehe * 0.68 },
    ], 10, fa[0], fa[1]));
    return B;
  }

  /* Die Birke: heller Stamm mit dunklen Narben, kleine lockere Krone. Der helle Stamm ist der
     einzige im Wald und fällt darum von Weitem auf – sparsam setzen. */
  function birke(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 733 + 23), fa = KRONEN[Math.floor(r() * KRONEN.length)];
    const dick = hoehe * 0.028;
    const oben = stamm(B, hoehe * 0.62, dick, (r() - 0.5) * 0.08, '#e8e3d6');
    /* Vier Narben genügen. Sie sind winzig und stehen doch jede für zwölf Dreiecke – und Birken
       stehen zu Dutzenden herum. */
    for (let i = 0; i < 4; i++) {
      const y = hoehe * (0.13 + i * 0.12 + r() * 0.03);
      B.mit(M3.mult(M3.verschieben(0, y, 0), M3.drehenY(r() * 6)),
        b => b.kasten(dick * 2.3, hoehe * 0.012, dick * 0.9, '#4a4238'));
    }
    for (let i = 0; i < 3; i++) {
      const a = r() * M3.TAU3, d = hoehe * (0.04 + r() * 0.07);
      B.mit(M3.verschieben(Math.cos(a) * d, oben * (0.94 + r() * 0.2), Math.sin(a) * d),
        b => b.kugel(hoehe * (0.13 + r() * 0.05), 4, 7, fa[0], 0.13, saat * 13 + i, fa[1]));
    }
    return B;
  }

  /* Der Laubbaum: ein krummer Stamm, zwei bis drei runde Ballen. Der Brotbaum des Waldes. */
  function laubbaum(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 7919 + 101), fa = KRONEN[Math.floor(r() * KRONEN.length)];
    const oben = stamm(B, hoehe * 0.42, hoehe * 0.045, (r() - 0.5) * 0.14);
    const ballen = 2 + Math.floor(r() * 2);
    for (let i = 0; i < ballen; i++) {
      const rr = hoehe * (0.28 - i * 0.045);
      const x = (r() - 0.5) * hoehe * 0.24, z = (r() - 0.5) * hoehe * 0.24;
      const y = oben + hoehe * (0.1 + i * 0.13);
      B.mit(M3.verschieben(x, y, z), b => b.kugel(rr, 5, 9, fa[0], 0.12, saat * 31 + i, fa[1]));
    }
    return B;
  }

  /* Die Eiche: der alte Baum am Bahnrand. Ein dicker, gegabelter Stamm trägt fünf sich
     überschneidende Ballen zu einer breiten Krone. Sie ist die aufwendigste der sieben und wird
     darum selten gesetzt – aber wo sie steht, ist sie der Blickfang. */
  function eiche(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 3571 + 61), fa = KRONEN[Math.floor(r() * KRONEN.length)];
    const dick = hoehe * 0.09;
    B.walze(dick * 1.9, dick * 1.15, hoehe * 0.12, 8, F.stammFarbe, null);
    B.walze(dick * 1.15, dick * 0.95, hoehe * 0.22, 8, F.stammFarbe, null, hoehe * 0.1);
    const aeste = 3;
    for (let i = 0; i < aeste; i++) {
      const a = (i + r() * 0.5) / aeste * M3.TAU3;
      B.mit(M3.mult(M3.mult(M3.verschieben(0, hoehe * 0.3, 0), M3.drehenY(-a)), M3.drehenZ(0.42 + r() * 0.16)),
        b => b.walze(dick * 0.7, dick * 0.4, hoehe * 0.3, 6, F.stammFarbe, null));
    }
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * M3.TAU3 + r() * 0.6;
      const d = i === 0 ? 0 : hoehe * (0.2 + r() * 0.08);
      const rr = hoehe * (i === 0 ? 0.30 : 0.21 + r() * 0.05);
      const y = hoehe * (i === 0 ? 0.68 : 0.5 + r() * 0.12);
      B.mit(M3.verschieben(Math.cos(a) * d, y, Math.sin(a) * d),
        b => b.kugel(rr, 5, 9, fa[0], 0.1, saat * 97 + i, fa[1]));
    }
    return B;
  }

  /* Welcher Baum? 'art' ist einer der Namen unten; ohne Angabe wird ausgelost. So kann der
     Bewuchs sagen „hier ein Nadelbaum" und muss nicht wissen, welche Kegel das bedeutet. */
  const BAUMARTEN = { tanne, kiefer, pappel, tropfenbaum, birke, laubbaum, eiche };
  function baum(B, art, hoehe, saat) {
    (BAUMARTEN[art] || laubbaum)(B, hoehe, saat);
    return B;
  }

  /* Busch: eine gedrückte Kugel. Mehr ist es nicht und mehr braucht es nicht – Büsche stehen in
     Mengen am Rand, und was in Mengen dasteht, darf einfach sein. */
  function busch(B, r = 0.3, col = F.laubDunkel, saat = 1) {
    B.mit(M3.mult(M3.verschieben(0, r * 0.55, 0), M3.skalieren(1, 0.72, 1)),
      b => b.kugel(r, 4, 7, col, 0.2, saat, Bauen.stufe(col, 1.25)));
    return B;
  }

  /* ---------- Steine ---------- */

  function fels(B, r = 0.5, saat = 1) {
    const z = M3.zufall(saat * 613 + 7);
    B.mit(M3.mult(M3.drehenY(z() * M3.TAU3), M3.skalieren(1, 0.62 + z() * 0.3, 0.85 + z() * 0.3)),
      b => b.kugel(r, 4, 7, z() < 0.5 ? F.fels : F.felsHell, 0.28, saat * 17));
    return B;
  }

  /* Eine Gruppe: ein großer Stein und zwei kleine daneben. Einzelne Findlinge wirken gesetzt,
     Gruppen wirken gewachsen. */
  function felsgruppe(B, r = 0.6, saat = 1) {
    const z = M3.zufall(saat * 331 + 29);
    fels(B, r, saat);
    for (let i = 0; i < 2; i++) {
      const a = z() * M3.TAU3, d = r * (0.9 + z() * 0.6);
      B.stelle(Math.cos(a) * d, 0, Math.sin(a) * d, 0, 1, b => fels(b, r * (0.35 + z() * 0.3), saat * 5 + i));
    }
    return B;
  }

  /* ---------- Türme und Häuser ---------- */

  /* Ein Rundturm mit Zinnenkranz und Spitzdach – der Baustein, aus dem die halbe Burg besteht.
     'zinnen' schaltet den Kranz ab, wo ein Dach direkt aufsitzt. */
  function turm(B, r, h, dachFarbe = F.dach, kanten = 10, zinnen = true) {
    B.walze(r * 1.08, r, h, kanten, F.stein, F.steinDunkel);
    const y = h;
    if (zinnen) {
      /* Zinnen: kleine Klötze rings um die Krone. Acht reichen – bei mehr sieht man auf die
         Entfernung nur noch einen grauen Ring, zahlt aber die Dreiecke. */
      const n = Math.max(6, Math.round(kanten * 0.8));
      for (let i = 0; i < n; i++) {
        const a = i / n * M3.TAU3;
        B.mit(M3.mult(M3.verschieben(Math.cos(a) * r * 0.92, y, Math.sin(a) * r * 0.92), M3.drehenY(-a)),
          b => b.kasten(r * 0.34, r * 0.42, r * 0.3, F.steinDunkel, F.stein));
      }
    }
    const dachY = y + (zinnen ? r * 0.42 : 0);
    B.mit(M3.verschieben(0, dachY, 0), b => {
      b.walze(r * 1.18, 0, r * 2.4, kanten, dachFarbe, null);
      /* Der Dachrand als schmaler Ring in einem dunkleren Ton. Ohne ihn schwebt das Dach optisch
         über dem Turm, weil Kegel und Walze sich nur in einer Linie berühren. */
      b.walze(r * 1.22, r * 1.16, r * 0.09, kanten, F.dachDunkel, null);
    });
    /* Fenster: schmale, dunkle Schlitze. Sie stehen bewusst nicht ringsum, sondern auf zwei
       Seiten – so sieht man beim Drehen der Kamera, dass der Turm eine Vorderseite hat. */
    for (const a of [0, Math.PI * 0.6]) for (let k = 0; k < 2; k++) {
      B.mit(M3.mult(M3.verschieben(Math.cos(a) * r * 1.0, h * (0.34 + k * 0.3), Math.sin(a) * r * 1.0), M3.drehenY(-a)),
        b => b.kasten(r * 0.03, h * 0.16, r * 0.22, '#2d3448'));
    }
    return { spitze: dachY + r * 2.4 };
  }

  /* Ein Häuschen mit Sattel- oder Walmdach, Fachwerk angedeutet. */
  function haus(B, b0 = 1, t0 = 0.8, h = 0.8, dachFarbe = F.dachRot) {
    B.kasten(b0, h, t0, F.putz, F.putz);
    // Ständer und Riegel – zwei senkrechte Balken je Seite reichen für den Eindruck
    for (const sx of [-1, 1]) for (const u of [-0.3, 0.3]) {
      B.mit(M3.verschieben(sx * b0 * 0.5, 0, u * t0), x => x.kasten(b0 * 0.05, h, t0 * 0.09, F.fachwerk));
      B.mit(M3.verschieben(u * b0, 0, sx * t0 * 0.5), x => x.kasten(b0 * 0.09, h, t0 * 0.05, F.fachwerk));
    }
    // Satteldach: zwei geneigte Flächen und zwei Giebeldreiecke
    const hb = b0 * 0.58, ht = t0 * 0.58, first = h + Math.max(b0, t0) * 0.42;
    B.viereck([-hb, h, -ht], [-hb, h, ht], [0, first, ht], [0, first, -ht], dachFarbe, [-1, 1, 0]);
    B.viereck([hb, h, -ht], [hb, h, ht], [0, first, ht], [0, first, -ht], dachFarbe, [1, 1, 0]);
    B.flaeche([[-hb, h, -ht], [hb, h, -ht], [0, first, -ht]], F.dachDunkel, [0, 0, -1]);
    B.flaeche([[-hb, h, ht], [hb, h, ht], [0, first, ht]], F.dachDunkel, [0, 0, 1]);
    // Tür und zwei Fenster
    B.mit(M3.verschieben(0, 0, t0 * 0.5), x => x.kasten(b0 * 0.22, h * 0.5, t0 * 0.04, F.holzDunkel));
    for (const sx of [-1, 1]) B.mit(M3.verschieben(sx * b0 * 0.28, h * 0.55, t0 * 0.5), x => x.kasten(b0 * 0.16, h * 0.2, t0 * 0.04, '#ffe6a8'));
    return B;
  }

  /* ---------- Die Burg ----------
     Sie steht in der Mitte der Wiesenwelt und ist von jeder Bahn aus zu sehen – darum bekommt sie
     mehr Sorgfalt als alles andere: ein Bergfried in der Mitte, vier Ecktürme, ein Ring aus Mauer
     mit Zinnen, ein Torhaus mit Zugbrücke und Bannern. Der Maßstab ist so gewählt, dass
     burg(B, 1) etwa sechs Felder breit und zehn hoch ist.

     Die Fahnen auf den Türmen sind nicht Teil dieses Gitters. Sie wehen, also müssen sie sich
     bewegen können, also brauchen sie ein eigenes; zurückgegeben werden hier nur ihre Stellen. */
  function burg(B, g = 1) {
    const fahnen = [];
    const R = 2.6 * g;                         // Halbmesser des Mauerrings

    // Sockelfelsen, auf dem das Ganze sitzt
    B.walze(R * 1.32, R * 1.18, 0.55 * g, 9, F.felsHell, F.fels);

    // Ringmauer als Achteck aus einzelnen Wandstücken
    const seiten = 8, mauerH = 1.5 * g;
    for (let i = 0; i < seiten; i++) {
      const a = (i + 0.5) / seiten * M3.TAU3;
      const laenge = 2 * R * Math.tan(Math.PI / seiten);
      const x = Math.cos(a) * R * Math.cos(Math.PI / seiten), z = Math.sin(a) * R * Math.cos(Math.PI / seiten);
      B.mit(M3.mult(M3.verschieben(x, 0.5 * g, z), M3.drehenY(-a)), b => {
        b.kasten(laenge * 1.02, mauerH, 0.34 * g, F.stein, F.steinDunkel);
        const n = Math.max(3, Math.round(laenge / (0.42 * g)));
        for (let k = 0; k < n; k++) {
          const u = (k + 0.5) / n - 0.5;
          b.mit(M3.verschieben(u * laenge, mauerH, 0), c => c.kasten(laenge / n * 0.55, 0.28 * g, 0.36 * g, F.steinDunkel, F.stein));
        }
      });
    }

    // Ecktürme an vier der acht Ecken
    for (let i = 0; i < 4; i++) {
      const a = i / 4 * M3.TAU3 + Math.PI / 8;
      const x = Math.cos(a) * R, z = Math.sin(a) * R;
      B.stelle(x, 0.5 * g, z, 0, 1, b => {
        const t = turm(b, 0.46 * g, 2.5 * g, F.dach, 9);
        fahnen.push({ x, y: 0.5 * g + t.spitze - 0.05 * g, z, h: 0.55 * g, farbe: F.fahnenRot });
      });
    }

    // Torhaus nach Süden (+Z), mit Durchfahrt und Zugbrücke
    B.mit(M3.verschieben(0, 0.5 * g, R * 0.99), b => {
      b.kasten(1.5 * g, 1.9 * g, 0.7 * g, F.stein, F.steinDunkel);
      // Torbogen als dunkle Nische
      b.mit(M3.verschieben(0, 0, 0.36 * g), c => c.kasten(0.62 * g, 0.95 * g, 0.06 * g, '#2b2620'));
      for (let k = 0; k < 4; k++) b.mit(M3.verschieben((k - 1.5) * 0.36 * g, 1.9 * g, 0), c => c.kasten(0.24 * g, 0.3 * g, 0.72 * g, F.steinDunkel, F.stein));
      // Zugbrücke, heruntergelassen
      b.mit(M3.verschieben(0, 0.02 * g, 0.35 * g), c => c.quader(-0.32 * g, -0.06 * g, 0, 0.32 * g, 0, 1.1 * g, F.holz, F.holzHell));
    });

    // Bergfried in der Mitte: ein kantiger Block, ein Rundturm daneben, beide mit Spitzdach
    B.mit(M3.verschieben(0, 0.5 * g, 0), b => {
      b.kasten(1.7 * g, 3.0 * g, 1.7 * g, F.stein, F.steinDunkel);
      for (let i = 0; i < 8; i++) {
        const a = i / 8 * M3.TAU3;
        b.mit(M3.verschieben(Math.cos(a) * 0.82 * g, 3.0 * g, Math.sin(a) * 0.82 * g),
          c => c.kasten(0.3 * g, 0.3 * g, 0.3 * g, F.steinDunkel, F.stein));
      }
      // Dach über dem Bergfried: eine flache Pyramide
      const hb = 1.0 * g, y0 = 3.3 * g, spitze = 4.5 * g;
      for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const a = [ax * hb - az * hb, y0, az * hb + ax * hb], c = [ax * hb + az * hb, y0, az * hb - ax * hb];
        b.flaeche([a, c, [0, spitze, 0]], (ax + az) > 0 ? F.dach : F.dachDunkel, [ax, 0.8, az]);
      }
      fahnen.push({ x: 0, y: 0.5 * g + spitze, z: 0, h: 0.75 * g, farbe: F.fahnenRot });
      // Der schlanke Nebenturm – er gibt der Silhouette ihre Unruhe
      b.stelle(1.05 * g, 0, -0.9 * g, 0, 1, c => {
        const t = turm(c, 0.4 * g, 3.6 * g, F.dach, 9);
        fahnen.push({ x: 1.05 * g, y: 0.5 * g + t.spitze - 0.05 * g, z: -0.9 * g, h: 0.5 * g, farbe: F.gold });
      });
    });

    return { fahnen, hoehe: 5.3 * g, radius: R * 1.35 };
  }

  /* ---------- Mühle ----------
     Der Rumpf steht fest, die Flügel drehen sich – also zwei getrennte Gitter. 'muehle' baut den
     Rumpf und sagt, wo die Nabe sitzt; 'muehlenfluegel' baut das Kreuz am Nullpunkt, damit es
     sich um seine eigene Achse drehen kann. */
  function muehle(B, g = 1) {
    B.walze(0.62 * g, 0.46 * g, 1.5 * g, 10, F.putz, F.putz);
    for (let i = 0; i < 10; i++) {
      const a = i / 10 * M3.TAU3;
      B.mit(M3.mult(M3.verschieben(Math.cos(a) * 0.5 * g, 0, Math.sin(a) * 0.5 * g), M3.drehenY(-a)),
        b => b.kasten(0.05 * g, 1.5 * g, 0.09 * g, F.fachwerk));
    }
    B.mit(M3.verschieben(0, 1.5 * g, 0), b => b.walze(0.56 * g, 0, 0.62 * g, 10, F.dachRot, null));
    B.mit(M3.verschieben(0, 0, 0.44 * g), b => b.kasten(0.26 * g, 0.62 * g, 0.06 * g, F.holzDunkel));
    return { nabe: [0, 1.42 * g, 0.5 * g] };
  }

  function muehlenfluegel(B, g = 1) {
    B.walze(0.09 * g, 0.07 * g, 0.16 * g, 8, F.holzDunkel, F.holz);
    for (let i = 0; i < 4; i++) {
      /* Gebaut wird in der XY-Ebene; die Drehung im Spiel läuft um Z. Jeder Flügel ist ein
         schmales Brett mit einem Segeltuch daneben – wie an der Mühle im Titelbild. */
      B.mit(M3.drehenZ(i / 4 * M3.TAU3), b => {
        b.quader(-0.045 * g, 0.08 * g, -0.02 * g, 0.045 * g, 1.15 * g, 0.02 * g, F.holz);
        b.quader(0.05 * g, 0.22 * g, -0.012 * g, 0.30 * g, 1.05 * g, 0.012 * g, F.putz);
      });
    }
    return B;
  }

  /* ---------- Kleinzeug ---------- */

  /* Ein Zaunstück von (x0,z0) nach (x1,z1): Pfosten in gleichem Abstand, zwei Querlatten. */
  function zaun(B, x0, z0, x1, z1, hoeheAn, h = 0.42) {
    const dx = x1 - x0, dz = z1 - z0, laenge = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(laenge / 0.85));
    const w = Math.atan2(dx, dz);
    for (let i = 0; i <= n; i++) {
      const u = i / n, x = x0 + dx * u, z = z0 + dz * u;
      B.stelle(x, hoeheAn(x, z), z, w, 1, b => b.kasten(0.075, h, 0.075, F.holz, F.holzHell));
    }
    for (let i = 0; i < n; i++) {
      const xa = x0 + dx * (i / n), za = z0 + dz * (i / n);
      const xb = x0 + dx * ((i + 1) / n), zb = z0 + dz * ((i + 1) / n);
      const ya = hoeheAn(xa, za), yb = hoeheAn(xb, zb);
      for (const k of [0.62, 0.9]) {
        B.viereck([xa, ya + h * k, za - 0.02], [xb, yb + h * k, zb - 0.02],
          [xb, yb + h * k + 0.055, zb - 0.02], [xa, ya + h * k + 0.055, za - 0.02], F.holzHell, [0, 0, -1]);
        B.viereck([xa, ya + h * k, za + 0.02], [xb, yb + h * k, zb + 0.02],
          [xb, yb + h * k + 0.055, zb + 0.02], [xa, ya + h * k + 0.055, za + 0.02], F.holzHell, [0, 0, 1]);
        B.viereck([xa, ya + h * k + 0.055, za - 0.02], [xb, yb + h * k + 0.055, zb - 0.02],
          [xb, yb + h * k + 0.055, zb + 0.02], [xa, ya + h * k + 0.055, za + 0.02], F.holz, [0, 1, 0]);
      }
    }
    return B;
  }

  /* Wolke: eine Handvoll gedrückter Kugeln. Sie hängt weit oben und weit weg, bekommt kein Licht
     und wirft keinen Schatten – sie ist Kulisse, nicht Gegenstand. */
  function wolke(B, g = 1, saat = 1) {
    const z = M3.zufall(saat * 271 + 3);
    const n = 3 + Math.floor(z() * 3);
    for (let i = 0; i < n; i++) {
      const x = (i - (n - 1) / 2) * g * 0.8 + (z() - 0.5) * g * 0.3;
      const y = (z() - 0.4) * g * 0.22, zz = (z() - 0.5) * g * 0.5;
      const r = g * (0.55 - Math.abs(i - (n - 1) / 2) * 0.1 + z() * 0.15);
      B.mit(M3.mult(M3.verschieben(x, y, zz), M3.skalieren(1.25, 0.62, 1)),
        b => b.kugel(r, 4, 7, i % 2 ? F.wolke : F.wolkeSchatten, 0.1, saat * 13 + i));
    }
    return B;
  }

  /* Schilf am Ufer: ein paar schmale Halme mit Kolben. Sie stehen dort, wo Wasser an Land
     stößt – und sie sind wichtiger, als sie aussehen. Eine Wasserfläche aus Feldern hat lauter
     rechte Winkel; ein Bach mit rechten Winkeln sieht aus wie ein Schwimmbecken. Das Schilf legt
     sich über die Kante und nimmt ihr die Gerade. */
  function schilf(B, g = 1, saat = 1) {
    const z = M3.zufall(saat * 449 + 11);
    const n = 4 + Math.floor(z() * 4);
    for (let i = 0; i < n; i++) {
      const a = z() * M3.TAU3, d = z() * 0.14 * g, h = (0.3 + z() * 0.3) * g;
      B.mit(M3.mult(M3.mult(M3.verschieben(Math.cos(a) * d, 0, Math.sin(a) * d),
        M3.drehenZ((z() - 0.5) * 0.5)), M3.drehenX((z() - 0.5) * 0.5)), b => {
        b.walze(0.018 * g, 0.008 * g, h, 4, '#5f9e46', null);
        if (z() < 0.55) b.mit(M3.verschieben(0, h * 0.82, 0), c => c.walze(0.033 * g, 0.012 * g, h * 0.22, 5, '#8a6b3a', null));
      });
    }
    return B;
  }

  /* Fahnenmast ohne Tuch – das Tuch weht und liegt darum im beweglichen Gitter. */
  function mast(B, h, col = F.stein) {
    B.walze(0.032, 0.022, h, 6, col, null);
    B.mit(M3.verschieben(0, h, 0), b => b.kugel(0.05, 4, 6, F.gold));
    return B;
  }

  return { F, BAUMARTEN, baum, tanne, kiefer, pappel, tropfenbaum, birke, laubbaum, eiche, busch, fels, felsgruppe, turm, haus, burg, muehle, muehlenfluegel,
    zaun, wolke, mast, schilf };
})();
