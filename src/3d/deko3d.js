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

  /* Ein Ast, der schräg nach oben aus dem Stamm wächst. Zurück kommt sein Ende in Baumkoordinaten,
     damit die Krone genau dort sitzen kann und nicht daneben in der Luft schwebt. Ein Ballen, der
     an keinem Ast hängt, verrät sich sofort – man sieht nicht, woran er hält. */
  function ast(B, y, richtung, laenge, dick, steigung, farbe = F.stammFarbe) {
    B.mit(M3.mult(M3.mult(M3.verschieben(0, y, 0), M3.drehenY(-richtung)), M3.drehenZ(steigung - Math.PI / 2)),
      b => b.walze(dick, dick * 0.55, laenge, 5, farbe, null));
    const waag = Math.cos(steigung) * laenge * 0.92;
    return [Math.cos(richtung) * waag, y + Math.sin(steigung) * laenge * 0.92, Math.sin(richtung) * waag];
  }

  /* Jeder Baum bekommt seinen eigenen Ton. Zwei Bäume derselben Art nebeneinander in exakt
     derselben Farbe sehen aus wie zwei Abzüge desselben Bildes; ein paar Prozent wärmer oder
     kühler, heller oder dunkler, und daraus wird ein Wald.

     Verschoben wird zum Warmen über Rot hoch und Blau herunter – so wandert die Farbe die Achse
     entlang, die man bei Laub sowieso erwartet (frisches Gelbgrün bis dunkles Blaugrün), statt
     einfach bunt zu werden. */
  function tonen(paar, z) {
    const warm = 0.93 + z() * 0.15, hell = 0.90 + z() * 0.2;
    const dreh = c => { c = Bauen.farbe(c);
      return [Math.min(1, c[0] * hell * warm), Math.min(1, c[1] * hell), Math.min(1, c[2] * hell / warm)]; };
    return [dreh(paar[0]), dreh(paar[1])];
  }
  const kronenFarbe = z => tonen(KRONEN[Math.floor(z() * KRONEN.length)], z);
  const nadelFarbe = z => tonen(NADELN[Math.floor(z() * NADELN.length)], z);
  /* Auch die Rinde schwankt – heller Ocker bis fast schwarzbraun. */
  const rinde = z => Bauen.stufe(F.stammFarbe, 0.72 + z() * 0.55);

  /* Die gestufte Tanne: mehrere Kegel übereinander, jeder ein wenig kleiner, mit einer Lücke
     dazwischen. Die Lücke ist das Entscheidende – ohne sie entsteht ein glatter Kegel, mit ihr
     sieht man die Etagen, die eine Tanne ausmachen. Und weil der Stamm durch die Lücken
     durchgeht, sieht man auch, dass die Etagen an etwas hängen. */
  function tanne(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 977 + 13), fa = nadelFarbe(r), rf = rinde(r);
    const stammH = hoehe * 0.17;
    B.walze(hoehe * 0.055, hoehe * 0.028, stammH + hoehe * 0.62, 6, rf, null);
    const lagen = 4 + (r() < 0.45 ? 1 : 0);
    for (let i = 0; i < lagen; i++) {
      const u = i / lagen;
      const y = stammH + hoehe * (0.70 * u) * (1 - u * 0.12);
      const rr = hoehe * (0.30 - u * 0.22) * (0.92 + r() * 0.16);
      const hh = hoehe * (0.34 - u * 0.12);
      const f = Bauen.mischen(fa[0], fa[1], u);
      /* Jede Etage ein Stück weitergedreht: Acht Kanten übereinander in gleicher Stellung ergeben
         eine glatte Säule mit Rillen – versetzt ergeben sie eine zerzauste Silhouette. */
      B.mit(M3.mult(M3.verschieben(0, y, 0), M3.drehenY(r() * 6)), b => {
        b.walze(rr, rr * 0.16, hh, 8, f, null, 0, Bauen.mischen(fa[0], fa[1], Math.min(1, u + 0.35)));
      });
    }
    return B;
  }

  /* Die Kiefer: ein langer, kahler Stamm und ganz oben drei dünne Schirme. Aus der Ferne ist sie
     an ihrer Silhouette zu erkennen und nicht an der Farbe – deshalb steht sie im Wald zwischen
     den Tannen und macht ihn unruhig. Ein paar abgestorbene Aststummel weiter unten kosten fast
     nichts und nehmen dem nackten Stamm das Glatte. */
  function kiefer(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 613 + 41), fa = nadelFarbe(r), rf = rinde(r);
    const oben = stamm(B, hoehe * 0.72, hoehe * 0.035, (r() - 0.5) * 0.14, rf);
    for (let i = 0; i < 2; i++) {
      ast(B, hoehe * (0.3 + i * 0.16), r() * M3.TAU3, hoehe * (0.08 + r() * 0.06), hoehe * 0.014, 0.25 + r() * 0.3, rf);
    }
    for (let i = 0; i < 3; i++) {
      const u = i / 2;
      const y = oben * (0.82 + u * 0.26);
      const rr = hoehe * (0.26 - u * 0.15);
      B.mit(M3.verschieben((r() - 0.5) * hoehe * 0.06, y, (r() - 0.5) * hoehe * 0.06),
        b => b.drehkoerper([{ r: 0, y: 0 }, { r: rr, y: hoehe * 0.05 }, { r: rr * 0.9, y: hoehe * 0.08 },
          { r: 0, y: hoehe * 0.17 }], 9, fa[0], fa[1]));
    }
    return B;
  }

  /* Die Pappel: eine schlanke Säule. Sie ist der einzige Baum, der höher als breit aussieht, und
     ein paar davon in einer Reihe geben einer Wiese sofort eine Richtung. */
  function pappel(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 271 + 7), fa = kronenFarbe(r);
    const dick = hoehe * (0.09 + r() * 0.05);
    B.walze(hoehe * 0.04, hoehe * 0.03, hoehe * 0.2, 6, rinde(r), null);
    /* Die Säule steht ein wenig schief und ist oben nicht ganz mittig – eine senkrechte,
       achsensymmetrische Spindel sieht gedrechselt aus. */
    B.mit(M3.mult(M3.verschieben(0, hoehe * 0.12, 0), M3.drehenZ((r() - 0.5) * 0.12)), b => b.drehkoerper([
      { r: 0, y: 0 }, { r: dick * 0.7, y: hoehe * 0.10 }, { r: dick, y: hoehe * 0.34 },
      { r: dick * 0.92, y: hoehe * 0.62 }, { r: dick * 0.55, y: hoehe * 0.84 }, { r: 0, y: hoehe },
    ], 9, fa[0], fa[1]));
    return B;
  }

  /* Der Tropfenbaum: eine glatte, nach oben spitz zulaufende Krone auf kurzem Stamm. */
  function tropfenbaum(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 449 + 19), fa = kronenFarbe(r);
    const oben = stamm(B, hoehe * 0.3, hoehe * 0.045, (r() - 0.5) * 0.14, rinde(r));
    const rr = hoehe * (0.21 + r() * 0.08);
    B.mit(M3.mult(M3.verschieben(0, oben, 0), M3.drehenY(r() * 6)), b => b.drehkoerper([
      { r: 0, y: 0 }, { r: rr * 0.8, y: hoehe * 0.09 }, { r: rr, y: hoehe * 0.26 },
      { r: rr * 0.78, y: hoehe * 0.45 }, { r: rr * 0.42, y: hoehe * 0.58 }, { r: 0, y: hoehe * 0.68 },
    ], 10, fa[0], fa[1]));
    return B;
  }

  /* Die Birke: heller Stamm mit dunklen Narben, kleine lockere Krone an zwei aufstrebenden Ästen.
     Der helle Stamm ist der einzige im Wald und fällt darum von Weitem auf – sparsam setzen. */
  function birke(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 733 + 23), fa = kronenFarbe(r);
    const dick = hoehe * 0.028;
    const weiss = Bauen.stufe('#e8e3d6', 0.94 + r() * 0.1);
    const oben = stamm(B, hoehe * 0.62, dick, (r() - 0.5) * 0.12, weiss);
    /* Vier Narben genügen. Sie sind winzig und stehen doch jede für zwölf Dreiecke – und Birken
       stehen zu Dutzenden herum. */
    for (let i = 0; i < 4; i++) {
      const y = hoehe * (0.13 + i * 0.12 + r() * 0.03);
      B.mit(M3.mult(M3.verschieben(0, y, 0), M3.drehenY(r() * 6)),
        b => b.kasten(dick * 2.3, hoehe * 0.012, dick * 0.9, '#4a4238'));
    }
    const enden = [[0, oben * 0.98, 0]];
    for (let i = 0; i < 2; i++) {
      enden.push(ast(B, oben * 0.78, r() * M3.TAU3, hoehe * 0.14, dick * 0.7, 0.9 + r() * 0.35, weiss));
    }
    enden.forEach((e, i) => B.mit(M3.verschieben(e[0], e[1] + hoehe * 0.04, e[2]),
      b => b.kugel(hoehe * (0.12 + r() * 0.05), 4, 7, fa[0], 0.16, saat * 13 + i, fa[1])));
    return B;
  }

  /* Der Laubbaum: ein krummer Stamm, der sich in zwei bis drei Äste teilt, und auf jedem sitzt
     ein Ballen. Der Brotbaum des Waldes – die Form, die man malt, wenn jemand „Baum" sagt. */
  function laubbaum(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 7919 + 101), fa = kronenFarbe(r), rf = rinde(r);
    const oben = stamm(B, hoehe * 0.42, hoehe * 0.045, (r() - 0.5) * 0.18, rf);
    const ballen = 2 + Math.floor(r() * 2);
    const dreh = r() * M3.TAU3;
    for (let i = 0; i < ballen; i++) {
      const a = dreh + i / ballen * M3.TAU3;
      const e = ast(B, oben * 0.86, a, hoehe * (0.1 + r() * 0.08), hoehe * 0.028, 0.75 + r() * 0.4, rf);
      const rr = hoehe * (0.24 - i * 0.03 + r() * 0.05);
      B.mit(M3.verschieben(e[0], e[1] + hoehe * 0.06, e[2]),
        b => b.kugel(rr, 5, 9, fa[0], 0.16, saat * 31 + i, fa[1]));
    }
    return B;
  }

  /* Die Eiche: der alte Baum am Bahnrand. Ein dicker, gegabelter Stamm trägt drei ausladende Äste
     und darauf vier sich überschneidende Ballen. Sie ist die aufwendigste der sieben und wird
     darum selten gesetzt – aber wo sie steht, ist sie der Blickfang.

     Jeder äußere Ballen sitzt auf dem Ende eines Astes, nicht an einer eigenen Stelle. Das ist der
     ganze Unterschied zwischen „breiter Baum" und „Kugeln in der Luft". */
  function eiche(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 3571 + 61), fa = kronenFarbe(r), rf = rinde(r);
    const dick = hoehe * 0.09;
    B.walze(dick * 1.9, dick * 1.15, hoehe * 0.12, 8, rf, null);
    B.walze(dick * 1.15, dick * 0.9, hoehe * 0.24, 8, rf, null, hoehe * 0.1);
    const aeste = 3, dreh = r() * M3.TAU3;
    const enden = [];
    for (let i = 0; i < aeste; i++) {
      const a = dreh + (i + r() * 0.4) / aeste * M3.TAU3;
      enden.push(ast(B, hoehe * 0.32, a, hoehe * (0.3 + r() * 0.08), dick * 0.62, 0.5 + r() * 0.25, rf));
    }
    B.mit(M3.verschieben(0, hoehe * 0.66, 0), b => b.kugel(hoehe * 0.29, 5, 9, fa[0], 0.12, saat * 97, fa[1]));
    enden.forEach((e, i) => B.mit(M3.verschieben(e[0], e[1] + hoehe * 0.05, e[2]),
      b => b.kugel(hoehe * (0.19 + r() * 0.05), 4, 8, fa[0], 0.14, saat * 97 + i + 1, fa[1])));
    return B;
  }

  /* ---------- Kleinzeug am Boden ----------

     Bäume machen die Ferne, aber die Nähe machen Blumen, Grasbüschel und Totholz. Die Kamera
     steht beim Zielen dicht über dem Boden, und dort war bisher nichts als eine glatte grüne
     Fläche. Alles hier ist absichtlich winzig gehalten – es soll den Blick auf die Bahn nicht
     verstellen, nur den Boden lebendig machen. */

  /* Blumen wachsen in Gruppen, nie einzeln – deshalb baut eine Anfrage gleich drei bis fünf. Eine
     einzelne Blume auf einer Wiese ist ein Fleck; ein Tupfen aus fünfen ist eine Blume. */
  const BLUMEN = ['#f2f0e4', '#f2d24e', '#e2705f', '#c98fd8', '#e8a23c'];
  function blume(B, g = 1, saat = 1) {
    const z = M3.zufall(saat * 881 + 5);
    const f = BLUMEN[Math.floor(z() * BLUMEN.length)];
    const mitte = Bauen.stufe(f, 0.8);
    const n = 3 + Math.floor(z() * 3);
    for (let i = 0; i < n; i++) {
      const a = z() * M3.TAU3, d = z() * 0.13 * g, h = (0.1 + z() * 0.07) * g;
      B.mit(M3.mult(M3.verschieben(Math.cos(a) * d, 0, Math.sin(a) * d), M3.drehenZ((z() - 0.5) * 0.6)), b => {
        b.walze(0.007 * g, 0.005 * g, h, 3, '#5f9e46', null);
        /* Die Blüte ist eine flachgedrückte Kugel mit hellem Rand und dunklem Grund: Von oben
           sieht man den Kranz, von der Seite eine Scheibe. Blütenblätter einzeln zu bauen wäre
           zehnmal so teuer und auf zwei Metern Entfernung nicht zu sehen. */
        /* Flach wie eine Scheibe, nicht rund wie eine Kappe: Eine halbe Kugel auf einem Stiel ist
           ein Pilz, eine flache Scheibe mit hellem Rand eine Blüte. Bei einem Zehntel Feld
           Durchmesser entscheidet genau das darüber, was man zu sehen glaubt. */
        b.mit(M3.mult(M3.verschieben(0, h, 0), M3.skalieren(1.25, 0.16, 1.25)),
          c => c.kugel(0.036 * g, 2, 6, mitte, 0, 1, f));
      });
    }
    return B;
  }

  /* Ein Grasbüschel, wie auf Fynns Vorbild: hohe, gebogene Halme, unten dunkel, oben hell, und
     genug davon, dass daraus ein Polster wird und keine Borsten.

     Jeder Halm hat zwei Abschnitte, und das ist der ganze Unterschied. Ein gerader Halm sieht aus
     wie ein Nagel; ein geknickter neigt sich, und eine Handvoll geknickter Halme, die sich nach
     außen neigen, ist Gras. Der obere Abschnitt läuft spitz zu, der untere trägt.

     Die Höhe ist mit Absicht groß geworden: Neben einer Bande von einem Drittel Feld Höhe sah ein
     Büschel von einem Zehntel aus wie Moos. Jetzt reicht das Gras bis an die Bande heran, und die
     Bahn liegt in der Wiese statt auf ihr. */
  function grasbueschel(B, g = 1, farbe = '#5fa03a', saat = 1, halme = 0, einfach = false) {
    const z = M3.zufall(saat * 199 + 3);
    const hell = Bauen.stufe(farbe, 1.42), dunkel = Bauen.stufe(farbe, 0.72);
    /* Zwei Größen, und beide braucht es.

       'halme' gibt die Zahl vor, 'einfach' lässt den Knick weg. Der Grasteppich setzt Tausende von
       Büscheln und nimmt drei gerade Halme – zwölf Dreiecke; ein einzelnes Büschel am Wegrand darf
       sechs geknickte haben und sieht dafür voller aus – sechsundfünfzig. Aus einem halben Meter
       Entfernung ist der Knick das, was aus einem Nagel einen Halm macht; aus fünf Metern sieht man
       ihn nicht mehr, zahlt ihn aber weiterhin. */
    const n = halme || (5 + Math.floor(z() * 3));
    for (let i = 0; i < n; i++) {
      const a = (i + z() * 0.7) / n * M3.TAU3;
      const h = (0.3 + z() * 0.3) * g;
      const neigung = 0.12 + z() * 0.3;
      const dick = (0.022 + z() * 0.012) * g;
      if (einfach) {
        /* Breiter und stärker geneigt als der geknickte Halm. Aus drei senkrechten Nadeln wird
           sonst kein Polster, sondern ein Igel – erst wenn die Halme flach genug stehen, decken
           ihre Umrisse den Boden, und genau darum geht es beim Teppich. */
        B.mit(M3.mult(M3.drehenY(-a), M3.drehenZ(0.3 + z() * 0.35)),
          b => b.walze(dick * 1.7, 0, h * 0.95, 3, dunkel, null, 0, hell));
        continue;
      }
      B.mit(M3.mult(M3.drehenY(-a), M3.drehenZ(neigung)), b => {
        b.walze(dick, dick * 0.7, h * 0.55, 3, dunkel, null, 0, farbe);
        /* Der obere Abschnitt knickt weiter weg – gedreht wird um den Fußpunkt des Knicks. */
        b.mit(M3.mult(M3.verschieben(0, h * 0.55, 0), M3.drehenZ(neigung * 1.6)),
          c => c.walze(dick * 0.7, 0, h * 0.5, 3, farbe, null, 0, hell));
      });
    }
    return B;
  }

  /* Ein Baumstumpf mit Jahresringen obendrauf. Wo einer steht, war einmal ein Baum – das erzählt
     mehr Landschaft als ein weiterer Busch. */
  function stumpf(B, g = 1, saat = 1) {
    const z = M3.zufall(saat * 1013 + 17);
    const rf = rinde(z), h = (0.16 + z() * 0.12) * g;
    B.walze(0.2 * g, 0.17 * g, h, 7, rf, Bauen.stufe(rf, 1.5));
    for (let i = 0; i < 3; i++) {
      const a = z() * M3.TAU3;
      B.mit(M3.mult(M3.verschieben(Math.cos(a) * 0.15 * g, 0.01 * g, Math.sin(a) * 0.15 * g), M3.drehenY(-a)),
        b => b.walze(0.07 * g, 0.03 * g, 0.1 * g, 4, rf, null));
    }
    return B;
  }

  /* Ein umgestürzter Stamm, moosbewachsen. Liegt quer im Unterholz und bricht die lauter
     senkrechten Linien des Waldes. */
  function totholz(B, g = 1, saat = 1) {
    const z = M3.zufall(saat * 1493 + 29);
    const rf = rinde(z), l = (0.9 + z() * 0.9) * g;
    B.mit(M3.mult(M3.drehenY(z() * M3.TAU3), M3.drehenZ(Math.PI / 2 + (z() - 0.5) * 0.15)),
      b => b.walze(0.11 * g, 0.08 * g, l, 6, rf, Bauen.stufe(rf, 1.3), -l / 2, '#5f8a42'));
    return B;
  }

  /* Der Baum für die Ferne. Ab etwa fünfzehn Feldern Abstand sieht man von einem Baum nur noch
     seinen Umriss gegen den Himmel und seine Farbe; Äste, Narben und Etagen sind dort ein paar
     Bildpunkte groß und trotzdem voll bezahlt. Der Wald reicht fünfzehn Felder über die Bahn
     hinaus, und der weitaus größte Teil aller Bäume steht in dieser Zone – deshalb entscheidet
     sie allein darüber, ob die Bahn auf einem Telefon flüssig läuft.

     Ein Kegel für den Nadelbaum, ein Ball auf einem Stift für den Laubbaum: zwanzig bis vierzig
     Dreiecke statt hundert bis vierhundert. Im Bild ist der Unterschied nicht zu finden – ich
     habe es nebeneinandergestellt und verglichen. */
  function fernbaum(B, hoehe = 1, nadel = true, saat = 1) {
    const z = M3.zufall(saat * 2069 + 13);
    const fa = nadel ? nadelFarbe(z) : kronenFarbe(z);
    if (nadel) {
      B.walze(hoehe * 0.05, hoehe * 0.03, hoehe * 0.22, 4, rinde(z), null);
      /* Zwei Kegel übereinander statt einem. Der eine Kegel war der Punkt, an dem man den Trick
         sah: In der Übersicht von oben ist auch der ferne Wald groß im Bild, und eine Reihe
         glatter Spitzen davor liest sich als Zaun. Zwei Stufen reichen, damit es eine Tanne
         bleibt – die dritte sieht man auf die Entfernung nicht mehr. */
      B.mit(M3.mult(M3.verschieben(0, hoehe * 0.12, 0), M3.drehenY(z() * 6)),
        b => b.walze(hoehe * (0.21 + z() * 0.06), hoehe * 0.06, hoehe * 0.5, 6, fa[0], null, 0, Bauen.mischen(fa[0], fa[1], 0.5)));
      B.mit(M3.mult(M3.verschieben(0, hoehe * 0.52, 0), M3.drehenY(z() * 6)),
        b => b.walze(hoehe * (0.15 + z() * 0.04), 0, hoehe * 0.5, 6, Bauen.mischen(fa[0], fa[1], 0.4), null, 0, fa[1]));
    } else {
      B.walze(hoehe * 0.06, hoehe * 0.04, hoehe * 0.44, 4, rinde(z), null);
      B.mit(M3.mult(M3.verschieben(0, hoehe * 0.64, 0), M3.skalieren(1, 0.92, 1)),
        b => b.kugel(hoehe * (0.25 + z() * 0.07), 4, 7, fa[0], 0.2, saat, fa[1]));
      // Ein zweiter, kleiner Ballen daneben – dieselbe Regel wie beim Busch
      const a = z() * M3.TAU3;
      B.mit(M3.verschieben(Math.cos(a) * hoehe * 0.14, hoehe * 0.5, Math.sin(a) * hoehe * 0.14),
        b => b.kugel(hoehe * 0.16, 3, 6, fa[0], 0.2, saat + 3, fa[1]));
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
  /* Ein Busch. Die erste Fassung war eine gedrückte Kugel, die zweite zwei – beide sahen aus wie
     grüne Klöße im Gras, und genau das hat Fynn beanstandet.

     Ein Strauch hat kein Volumen, er hat einen Umriss: viele kleine Büschel, die aus einem
     gemeinsamen Fuß nach außen wachsen, oben licht und unten dicht. Gebaut wird er deshalb aus
     einer Handvoll kleiner Ballen auf einer flachen Kugelkappe – die Ballen sitzen weiter außen
     und weiter oben, je größer sie sind, und jeder trägt seinen eigenen Ton. Dazu ein paar
     aufragende Triebe am Rand: Die brechen die runde Silhouette, und daran erkennt man von Weitem
     einen Busch und nicht einen Stein.

     Die Ballen sind grob (drei Ringe, sechs Kanten) – das ist Absicht und nicht nur billig: Ein
     kantiger Ballen wirft harte Schattenkanten, und die geben dem Laub seine Struktur. Glatt
     geschliffen sieht es wieder nach Kloß aus. */
  function busch(B, r = 0.3, col = F.laubDunkel, saat = 1) {
    const z = M3.zufall(saat * 137 + 11);
    const grund = Bauen.stufe(col, 0.86 + z() * 0.2);
    const n = 4 + Math.floor(z() * 3);
    for (let i = 0; i < n; i++) {
      const a = (i + z() * 0.7) / n * M3.TAU3;
      const d = r * (0.1 + z() * 0.6);
      const rr = r * (0.42 + z() * 0.3);
      const y = r * (0.3 + z() * 0.55) * (1 - d / (r * 1.2) * 0.35);
      const f = Bauen.stufe(grund, 0.84 + z() * 0.38);
      B.mit(M3.mult(M3.verschieben(Math.cos(a) * d, y, Math.sin(a) * d), M3.skalieren(1, 0.82, 1)),
        b => b.kugel(rr, 3, 6, f, 0.3, saat * 7 + i, Bauen.stufe(f, 1.3)));
    }
    /* Zwei bis drei Triebe, die oben herausstehen. */
    const triebe = 2 + Math.floor(z() * 2);
    for (let i = 0; i < triebe; i++) {
      const a = z() * M3.TAU3, d = r * (0.2 + z() * 0.5);
      B.mit(M3.mult(M3.mult(M3.verschieben(Math.cos(a) * d, r * 0.5, Math.sin(a) * d),
        M3.drehenY(-a)), M3.drehenZ(-0.25 - z() * 0.35)),
        b => b.walze(r * 0.13, 0, r * (0.7 + z() * 0.6), 3, Bauen.stufe(grund, 1.15), null, 0, Bauen.stufe(grund, 1.5)));
    }
    return B;
  }

  /* ---------- Steine ---------- */

  function fels(B, r = 0.5, saat = 1) {
    const z = M3.zufall(saat * 613 + 7);
    const grund = z() < 0.5 ? F.fels : F.felsHell;
    /* Oben heller als unten – die Sonne bleicht die Wetterseite. Und jeder dritte Stein trägt
       Moos: Das ist der Unterschied zwischen einem Kiesel und einem Findling, der dort seit
       Jahren liegt. */
    const oben = z() < 0.32 ? '#6f9147' : Bauen.stufe(grund, 1.16);
    B.mit(M3.mult(M3.drehenY(z() * M3.TAU3), M3.skalieren(1, 0.62 + z() * 0.3, 0.85 + z() * 0.3)),
      b => b.kugel(r, 4, 7, grund, 0.28, saat * 17, oben));
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
    // Zwei Scharten übereinander, damit auch der Turm einen Maßstab bekommt
    for (let k = 0; k < 2; k++) {
      const a = k * 2.1;
      B.mit(M3.mult(M3.verschieben(Math.cos(a) * r * 0.99, h * (0.4 + k * 0.28), Math.sin(a) * r * 0.99), M3.drehenY(-a)),
        b => b.kasten(r * 0.12, h * 0.16, r * 0.3, '#332d25'));
    }
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
    /* Der Giebel ist eine dunklere Stufe DESSELBEN Dachs. Vorher stand hier F.dachDunkel – das ist
       das Dunkel des blauen Burgdachs, und so trug jedes rote Hausdach zwei blaue Giebeldreiecke.
       Solange die Häuser einen Meter groß waren, ist das niemandem aufgefallen; seit sie sechs
       Meter groß sind, sieht man es von der Bahn aus. */
    const giebel = Bauen.stufe(dachFarbe, 0.74);
    B.flaeche([[-hb, h, -ht], [hb, h, -ht], [0, first, -ht]], giebel, [0, 0, -1]);
    B.flaeche([[-hb, h, ht], [hb, h, ht], [0, first, ht]], giebel, [0, 0, 1]);
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
      /* Zwei Banner neben dem Tor, starr an der Wand. Sie wehen nicht – dafür hängen sie an der
         Mauer und nicht an einem Mast, und an einer Mauer hängt ein Banner nun einmal still. */
      for (const sx of [-1, 1]) b.mit(M3.verschieben(sx * 0.52 * g, 0.6 * g, 0.37 * g), c => {
        c.kasten(0.26 * g, 0.85 * g, 0.03 * g, F.fahnenRot, Bauen.stufe(F.fahnenRot, 1.2));
        c.mit(M3.verschieben(0, 0.3 * g, 0.02 * g), d => d.kasten(0.11 * g, 0.11 * g, 0.03 * g, F.gold));
      });
    });

    // Bergfried in der Mitte: ein kantiger Block, ein Rundturm daneben, beide mit Spitzdach
    B.mit(M3.verschieben(0, 0.5 * g, 0), b => {
      b.kasten(1.7 * g, 3.0 * g, 1.7 * g, F.stein, F.steinDunkel);
      /* Schießscharten: schmale dunkle Schlitze in zwei Reihen. Eine glatte Steinwand von zehn
         Metern Höhe hat keinen Maßstab – erst die Fenster sagen, wie groß die Burg ist. */
      for (const [ax, az] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) for (let k = 0; k < 4; k++) {
        const u = (k % 2 - 0.5) * 0.7 * g, yy = (1.0 + Math.floor(k / 2) * 1.05) * g;
        b.mit(M3.verschieben(ax * 0.86 * g - az * u, yy, az * 0.86 * g + ax * u),
          c => c.kasten(ax ? 0.05 * g : 0.13 * g, 0.4 * g, az ? 0.05 * g : 0.13 * g, '#332d25'));
      }
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

  /* ---------- Hof, Dorf und Turnierplatz ----------

     Die neun Bahnen des Graslands spielen an neun verschiedenen Orten, und ein Ort ist nicht die
     Bahn, sondern das, was drumherum steht: ein Hof ist ein Hof, weil dort eine Scheune, ein
     Heuhaufen und ein Karren stehen. Darum sind das hier keine Zierstücke, sondern die eigentliche
     Aussage jeder Bahn. */

  /* Die Scheune: ein langes Haus mit großem Tor und einer Luke im Giebel. Alles daran ist breiter
     und flacher als am Wohnhaus – daran erkennt man sie, noch bevor man das Tor sieht. */
  function scheune(B, g = 1, dachFarbe = F.dachRot) {
    const b0 = 2.6 * g, t0 = 1.7 * g, h = 1.1 * g;
    B.kasten(b0, h, t0, '#cbb89a', '#ded6c4');
    // Ständerwerk: senkrechte Balken und ein umlaufender Riegel
    for (let i = -2; i <= 2; i++) for (const sz of [-1, 1])
      B.mit(M3.verschieben(i * b0 * 0.22, 0, sz * t0 * 0.5), x => x.kasten(0.08 * g, h, 0.05 * g, F.fachwerk));
    for (const sx of [-1, 1])
      B.mit(M3.verschieben(sx * b0 * 0.5, 0, 0), x => x.kasten(0.05 * g, h, t0 * 0.98, F.fachwerk));
    // Satteldach, weit überstehend
    const hb = b0 * 0.56, ht = t0 * 0.62, first = h + t0 * 0.5;
    B.viereck([-hb, h, -ht], [-hb, h, ht], [-hb, first, ht], [-hb, first, -ht], dachFarbe, [-1, 0, 0]);
    for (const sz of [-1, 1]) B.viereck([-hb, h, sz * ht], [hb, h, sz * ht], [hb, first, 0], [-hb, first, 0], dachFarbe, [0, 0.7, sz]);
    const giebel = Bauen.stufe(dachFarbe, 0.74);
    B.flaeche([[hb, h, -ht], [hb, h, ht], [hb, first, 0]], giebel, [1, 0, 0]);
    B.flaeche([[-hb, h, ht], [-hb, h, -ht], [-hb, first, 0]], giebel, [-1, 0, 0]);
    // Tor und Heuluke
    B.mit(M3.verschieben(0, 0, t0 * 0.5), x => x.kasten(b0 * 0.34, h * 0.78, 0.04 * g, F.holzDunkel, F.holz));
    B.mit(M3.verschieben(0, h * 0.12, t0 * 0.51), x => x.kasten(b0 * 0.36, 0.05 * g, 0.03 * g, F.holz));
    B.mit(M3.verschieben(-hb * 0.98, h * 0.55, 0), x => x.kasten(0.04 * g, h * 0.3, t0 * 0.24, '#3a3128'));
    return B;
  }

  /* Der Ziehbrunnen: Ring aus Bruchstein, zwei Pfosten, ein Dächlein, ein Eimer an der Kurbel. */
  function brunnen(B, g = 1) {
    B.walze(0.42 * g, 0.4 * g, 0.36 * g, 9, '#b3a992', '#9a9488');
    B.mit(M3.verschieben(0, 0.3 * g, 0), b => b.walze(0.31 * g, 0.31 * g, 0.07 * g, 9, '#2b2620', '#4a4238'));
    for (const sx of [-1, 1]) B.mit(M3.verschieben(sx * 0.34 * g, 0.36 * g, 0), b => b.kasten(0.07 * g, 0.62 * g, 0.07 * g, F.holz, F.holzHell));
    B.mit(M3.verschieben(0, 0.9 * g, 0), b => b.walze(0.12 * g, 0.12 * g, 0.62 * g, 6, F.holzDunkel, null));   // Haspel
    // Satteldächlein
    const hb = 0.5 * g, ht = 0.4 * g, y0 = 0.98 * g, first = 1.26 * g;
    for (const sx of [-1, 1]) B.viereck([sx * hb, y0, -ht], [sx * hb, y0, ht], [0, first, ht], [0, first, -ht], F.dachRot, [sx, 1, 0]);
    const giebel = Bauen.stufe(F.dachRot, 0.74);
    for (const sz of [-1, 1]) B.flaeche(sz > 0 ? [[-hb, y0, ht], [hb, y0, ht], [0, first, ht]] : [[hb, y0, -ht], [-hb, y0, -ht], [0, first, -ht]], giebel, [0, 0, sz]);
    B.mit(M3.verschieben(0, 0.55 * g, 0), b => b.walze(0.11 * g, 0.13 * g, 0.16 * g, 7, F.holzDunkel, F.holz));  // Eimer
    return B;
  }

  /* Der Heuhaufen: eine Garbe um eine Stange, oben zusammengebunden. Aus dem Drehkörper, weil die
     Form ganz von ihrem Umriss lebt. */
  function heuhaufen(B, g = 1, saat = 1) {
    const z = M3.zufall(saat * 337 + 3);
    const r = (0.55 + z() * 0.25) * g, h = (1.0 + z() * 0.5) * g;
    B.drehkoerper([{ r: r * 0.7, y: 0 }, { r, y: h * 0.22 }, { r: r * 0.92, y: h * 0.55 },
      { r: r * 0.45, y: h * 0.85 }, { r: 0, y: h }], 9, '#c0994e', '#e8cf7a');
    B.walze(0.035 * g, 0.03 * g, h * 1.12, 4, F.holzDunkel, null);
    return B;
  }

  /* Eine Trockenmauer aus Bruchsteinen, entlang einer Linie. Wie der Zaun, nur schwerer – sie
     gehört zur Schafweide, wo ein Lattenzaun zu fein aussähe. */
  function steinmauer(B, x0, z0, x1, z1, hoeheAn, h = 0.38) {
    const dx = x1 - x0, dz = z1 - z0, laenge = Math.hypot(dx, dz);
    const n = Math.max(1, Math.round(laenge / 0.55));
    const w = Math.atan2(dx, dz);
    const r = M3.zufall(Math.round(Math.abs(x0 * 71 + z0 * 13)) + 5);
    for (let i = 0; i < n; i++) {
      const u = (i + 0.5) / n, x = x0 + dx * u, z = z0 + dz * u;
      B.stelle(x, hoeheAn(x, z) - 0.05, z, w + (r() - 0.5) * 0.2, 1, b => {
        b.kasten(0.34, h * (0.85 + r() * 0.3), laenge / n * 1.06, r() < 0.5 ? '#b3a992' : '#c2b9a5', '#ded6c4');
      });
    }
    return B;
  }

  /* Ein Turnierzelt: kegelförmig, gestreift, mit Wimpel. Vier davon nebeneinander, und aus einer
     Wiese wird ein Turnierplatz. */
  function zelt(B, g = 1, farbe = '#c8503f', saat = 1) {
    const z = M3.zufall(saat * 787 + 9);
    const r = (0.8 + z() * 0.25) * g, h = (1.5 + z() * 0.4) * g;
    B.walze(r, r * 0.96, h * 0.28, 10, '#f0e6d2', null);
    B.mit(M3.verschieben(0, h * 0.28, 0), b => b.walze(r * 1.06, 0, h * 0.72, 10, farbe, null, 0, Bauen.stufe(farbe, 1.25)));
    // Senkrechte Bahnen in der zweiten Farbe – ein einfarbiges Zelt sieht aus wie ein Hut
    for (let i = 0; i < 5; i++) {
      const a = i / 5 * M3.TAU3;
      B.mit(M3.mult(M3.verschieben(Math.cos(a) * r * 0.54, h * 0.28, Math.sin(a) * r * 0.54), M3.drehenY(-a)),
        b => b.walze(r * 0.5, 0, h * 0.7, 3, '#f0e6d2', null));
    }
    B.mit(M3.verschieben(0, 0, r * 0.97), b => b.kasten(r * 0.5, h * 0.26, 0.03 * g, '#3a3128'));   // Eingang
    // Die Stange für den Wimpel: Ohne sie hinge das Tuch in der Luft über der Zeltspitze.
    B.mit(M3.verschieben(0, h, 0), b => b.walze(0.025 * g, 0.02 * g, 0.3 * g, 4, F.holzDunkel, null));
    return { spitze: h + 0.3 * g };
  }

  /* Ein Leiterwagen: Kasten, zwei Räder, eine Deichsel. */
  function karren(B, g = 1) {
    B.mit(M3.verschieben(0, 0.34 * g, 0), b => {
      b.kasten(1.1 * g, 0.36 * g, 0.62 * g, F.holz, F.holzHell);
      for (let i = -2; i <= 2; i++) b.mit(M3.verschieben(i * 0.22 * g, 0.12 * g, 0), c => c.kasten(0.05 * g, 0.3 * g, 0.66 * g, F.holzDunkel));
    });
    for (const sz of [-1, 1]) B.mit(M3.mult(M3.verschieben(-0.22 * g, 0.28 * g, sz * 0.36 * g), M3.drehenX(Math.PI / 2)),
      b => b.walze(0.28 * g, 0.28 * g, 0.07 * g, 9, F.holzDunkel, F.holz));
    B.mit(M3.mult(M3.verschieben(0.62 * g, 0.3 * g, 0), M3.drehenZ(-0.35)), b => b.kasten(0.7 * g, 0.06 * g, 0.06 * g, F.holz));
    return B;
  }

  /* Ein Obstbaum: ein Laubbaum mit roten Früchten. Eine Reihe davon ist ein Obstgarten – und ein
     Obstgarten ist der einzige Wald, den man an seiner Ordnung erkennt. */
  function obstbaum(B, hoehe = 1, saat = 1) {
    const r = M3.zufall(saat * 4231 + 17);
    laubbaum(B, hoehe, saat);
    for (let i = 0; i < 7; i++) {
      const a = r() * M3.TAU3, d = hoehe * (0.1 + r() * 0.18), y = hoehe * (0.55 + r() * 0.3);
      B.mit(M3.verschieben(Math.cos(a) * d, y, Math.sin(a) * d),
        b => b.kugel(hoehe * 0.035, 2, 5, r() < 0.6 ? '#d0473a' : '#e8a23c'));
    }
    return B;
  }

  /* Fahnenmast ohne Tuch – das Tuch weht und liegt darum im beweglichen Gitter. */
  function mast(B, h, col = F.stein) {
    B.walze(0.032, 0.022, h, 6, col, null);
    B.mit(M3.verschieben(0, h, 0), b => b.kugel(0.05, 4, 6, F.gold));
    return B;
  }

  return { F, BAUMARTEN, baum, fernbaum, tanne, kiefer, pappel, tropfenbaum, birke, laubbaum, eiche, blume, grasbueschel, stumpf, totholz,
    busch, fels, felsgruppe, turm, haus, scheune, brunnen, heuhaufen, steinmauer, zelt, karren, obstbaum,
    burg, muehle, muehlenfluegel,
    zaun, wolke, mast, schilf };
})();
