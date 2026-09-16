/* Der 3D-Zeichner: WebGL, von Hand, mit Sonne, Schatten und Nebel.

   Er kann absichtlich wenig. Ein Gitternetz aus Dreiecken, deren Ecken eine Farbe tragen; eine
   Sonne, die von schräg oben scheint; ein Schattenwurf; Nebel in die Ferne; Wasser, das sich
   bewegt. Mehr braucht eine gemalte Märchenwelt nicht – sie lebt von Form und Farbe, nicht von
   Oberflächenbildern.

   Drei Entscheidungen, die den Rest erklären:

   **Farbe steckt in den Ecken, nicht in Bildern.** Kein einziges Oberflächenbild wird geladen.
   Das spart die halbe Ladezeit, macht jede Fläche beliebig einfärbbar (dieselbe Tanne wächst in
   Grün und in Schnee) und passt zum flächigen Anstrich der Vorlagen.

   **Die feste Welt wird einmal zusammengebacken.** Wiese, Burg, Bäume, Mauern – alles wandert
   beim Aufbau in wenige große Gitter. Gezeichnet wird die ganze Bahn dann mit einer Handvoll
   Aufrufen statt mit tausend. Nur was sich bewegt (Ball, Fahnentuch, Mühlenflügel) bekommt ein
   eigenes Gitter mit eigener Lage.

   **Der Schatten kommt aus einer zweiten Kamera.** Erst wird die Welt aus Sicht der Sonne
   gezeichnet und nur die Entfernung gemerkt; beim eigentlichen Bild fragt jeder Punkt dort nach,
   ob zwischen ihm und der Sonne etwas stand. Die Tiefe wird dabei auf vier Farbkanäle verteilt,
   weil ein Tiefenbild als Textur nicht überall zu haben ist – so läuft es auch auf älteren
   Geräten ohne Zusatzrechte. */
const GL3D = (() => {

  /* ---------- Die Schattierer ----------
     Geschrieben in GLSL ES 1.00. Das ist die ältere Fassung; sie läuft sowohl auf WebGL 1 als auch
     auf WebGL 2. Die neuere Fassung brächte hier nichts und schlösse ältere Geräte aus. */

  const ECKEN_CODE = `
    attribute vec3 aOrt;
    attribute vec3 aNorm;
    attribute vec3 aFarbe;

    uniform mat4 uProj, uSicht, uModell;
    uniform mat4 uSchattenSicht;
    uniform float uZeit;
    uniform float uWelle;        // >0: Wasserfläche, die Ecken heben und senken sich

    varying vec3 vNorm;
    varying vec3 vFarbe;
    varying float vTiefe;        // Abstand zur Kamera, für den Nebel
    varying vec4 vSchattenOrt;
    varying vec3 vWeltOrt;

    void main() {
      vec3 ort = aOrt;
      /* Wellen. Zwei Sinus über Kreuz, mit unterschiedlicher Länge und Geschwindigkeit – ein
         einzelner sähe aus wie ein Wellblechdach. Die Normale wird gleich mitgedreht, sonst
         bewegt sich die Fläche, aber das Licht darauf bleibt stehen. */
      if (uWelle > 0.5) {
        float a = ort.x * 0.9 + uZeit * 1.7;
        float b = ort.z * 1.3 - uZeit * 1.1;
        ort.y += (sin(a) * 0.030 + sin(b) * 0.022);
        vNorm = normalize(vec3(-cos(a) * 0.027, 1.0, -cos(b) * 0.029));
      } else {
        vNorm = normalize((uModell * vec4(aNorm, 0.0)).xyz);
      }
      vec4 welt = uModell * vec4(ort, 1.0);
      vWeltOrt = welt.xyz;
      vec4 sicht = uSicht * welt;
      vTiefe = -sicht.z;
      vSchattenOrt = uSchattenSicht * welt;
      vFarbe = aFarbe;
      gl_Position = uProj * sicht;
    }`;

  /* Die Genauigkeit steht nicht fest im Code, sondern wird beim Start eingesetzt (siehe
     'genauigkeit'). Grund: Die Schattenkoordinate durchquert die ganze Bahn, und mit der
     mittleren Genauigkeit – gut drei Stellen – zerfällt der Schatten auf dem Telefon in Klötze.
     Wo hohe Genauigkeit fehlt, bleibt es bei der mittleren; dann ist der Schatten grob, aber da. */
  const FLAECHEN_CODE = `
    precision $GENAU float;

    varying vec3 vNorm;
    varying vec3 vFarbe;
    varying float vTiefe;
    varying vec4 vSchattenOrt;
    varying vec3 vWeltOrt;

    uniform vec3 uSonne;          // Richtung ZUR Sonne, bereits normiert
    uniform vec3 uSonnenFarbe;
    uniform vec3 uHimmelLicht;    // Licht von oben (Himmel)
    uniform vec3 uBodenLicht;     // Rückwurf von unten (Wiese, Sand, Wasser)
    uniform vec3 uNebelFarbe;
    uniform vec2 uNebel;          // x = Beginn, y = volle Deckung
    uniform float uLichtAnteil;   // 1 = voll beleuchtet, 0 = flache Farbe (Wolken, Himmel)
    uniform float uAlpha;
    uniform vec3 uTon;            // Einfärbung, meist (1,1,1)
    uniform sampler2D uSchatten;
    uniform float uSchattenStaerke;
    uniform float uSchattenFeld;  // Kantenlänge des Schattenbildes in Bildpunkten
    uniform float uSchattenSpanne; // Tiefe der Sonnenkamera in Welteinheiten
    uniform sampler2D uBodenBild;  // gemaltes Gras, kachelbar
    uniform float uBoden;          // >0: Bodenfläche, die das Grasbild trägt
    uniform float uBodenMass;      // wie viele Felder eine Kachel breit ist
    uniform sampler2D uHolzBild;   // gerechnete Holzmaserung, kachelbar
    uniform float uHolz;           // >0: Fläche aus Holz
    uniform float uHolzMass;       // wie viele Felder eine Kachel breit ist

    /* Die Tiefe steckt auf vier Kanälen zu je acht Stufen – zusammen 32 Stufen Genauigkeit.
       Ein einzelner Kanal (256 Stufen) gäbe sichtbare Streifen im Schatten. */
    float tiefeAus(vec4 p) {
      return dot(p, vec4(1.0, 1.0 / 255.0, 1.0 / 65025.0, 1.0 / 16581375.0));
    }

    float imSchatten(float neigung) {
      if (uSchattenStaerke <= 0.0) return 0.0;
      vec3 s = vSchattenOrt.xyz / vSchattenOrt.w;
      s = s * 0.5 + 0.5;
      /* Außerhalb des Schattenbildes wird nichts verdunkelt. Ohne diese Abfrage läge hinter dem
         Rand der Sonnenkamera ein hartkantiger schwarzer Block über der Landschaft. */
      if (s.x < 0.002 || s.x > 0.998 || s.y < 0.002 || s.y > 0.998 || s.z > 1.0) return 0.0;
      /* Der Sicherheitsabstand, ab dem etwas als Schatten gilt. Je flacher die Sonne auf eine
         Fläche trifft, desto größer muss er sein – sonst wirft jede Fläche Streifen auf sich
         selbst.

         Entscheidend ist, dass er in **Welteinheiten** gedacht und erst hier in Tiefeneinheiten
         umgerechnet wird. Vorher stand hier eine feste Zahl in Tiefeneinheiten, und weil die
         Sonnenkamera je nach Zoom zwischen 50 und 170 Einheiten tief ist, entsprach dieselbe Zahl
         einmal 18 Zentimetern und einmal zwei Dritteln eines Feldes. Im zweiten Fall verschluckte
         der Abstand jeden Schatten, den es gab – die ganze Welt sah flach aus, und der Fehler war
         nirgends zu sehen, weil nichts falsch aussah, sondern nur nichts da war. */
      float rand = (0.022 + 0.115 * neigung) / uSchattenSpanne;
      float e = 1.0 / uSchattenFeld;
      float summe = 0.0;
      for (int y = -1; y <= 1; y++) {
        for (int x = -1; x <= 1; x++) {
          vec2 ab = vec2(float(x), float(y)) * e;
          summe += (tiefeAus(texture2D(uSchatten, s.xy + ab)) + rand < s.z) ? 1.0 : 0.0;
        }
      }
      return summe / 9.0 * uSchattenStaerke;
    }

    void main() {
      vec3 n = normalize(vNorm);
      vec3 farbe = vFarbe * uTon;

      /* ---------- Das Grasbild auf dem Boden ----------

         Halme aus Dreiecken bekommen eine Wiese nicht fein genug hin. Auf Fynns Vorlage sind es
         mehrere hundert Halme auf den Quadratmeter; als Geometrie wären das eine halbe Million
         Dreiecke für eine Bahn. Als gemaltes Bild kostet es nichts – ein Zugriff auf eine Textur
         je Bildpunkt, und die Wiese bekommt genau die Feinheit, die dem Auge fehlte.

         Die Bildkoordinaten kommen aus dem Ort in der Welt, nicht aus den Ecken: Für einen Boden,
         der fast waagerecht liegt, ist das genau richtig und spart eine vierte Angabe an jeder
         Ecke – die müsste sonst durch jedes Gitter und jeden Puffer mitgeschleppt werden.

         Verrechnet wird das Bild als Helligkeit, nicht als Farbe. So behält jede Fläche ihre
         eigene Farbe – Fairway hell, Rough dunkel, Sand gelb – und bekommt nur die Zeichnung des
         Grases darübergelegt. Ein Bild, das die Farbe ersetzt, sähe auf Sand aus wie ein Rasen. */
      /* ---------- Das gemalte Grasbild auf dem Boden ----------

         Halme aus Dreiecken bekommen eine Wiese nicht fein genug hin. Auf Fynns Vorlage sind es
         mehrere hundert Halme auf den Quadratmeter; als Geometrie wären das eine halbe Million
         Dreiecke für eine Bahn. Als gemaltes Bild kostet es zwei Zugriffe je Bildpunkt.

         Die Bildkoordinaten kommen aus dem Ort in der Welt, nicht aus den Ecken: Für einen Boden,
         der fast waagerecht liegt, ist das genau richtig und spart eine vierte Angabe an jeder
         Ecke – die müsste sonst durch jedes Gitter und jeden Puffer mitgeschleppt werden.

         Zwei Kacheln übereinander, die zweite größer, gedreht und verschoben: Eine einzelne Kachel
         wiederholt sich sichtbar, sobald man weiter weg steht, und dann sieht die Wiese aus wie
         Tapete.

         **Gelesen wird immer, angewendet nur auf dem Boden.** Das sieht nach Verschwendung aus und
         ist doch der einzige Weg, der überall funktioniert: Ein texture2D innerhalb eines 'if'
         hat in GLSL ES 1.00 keine festgelegte Detailstufe, weil der Schattierer die Ableitung der
         Bildkoordinate nicht mehr sauber bilden kann. Genau das ist passiert – das Gras kam als
         gleichmäßiges Grau heraus, der Mittelwert der ganzen Kachel, und keine Einstellung half.
         Außerhalb der Abfrage gelesen, stimmt die Stufe. */
      vec2 bodenUv = vWeltOrt.xz / uBodenMass;
      float g1 = texture2D(uBodenBild, bodenUv).g;
      float g2 = texture2D(uBodenBild, bodenUv.yx * 0.43 + vec2(0.21, 0.63)).g;
      float grasBild = g1 * 0.68 + g2 * 0.32;
      /* Verrechnet als Helligkeit, nicht als Farbe: So behält jede Fläche ihre eigene – Fairway
         hell, Rough dunkel, Sand gelb – und bekommt nur die Zeichnung darübergelegt. Ein Bild, das
         die Farbe ersetzt, sähe auf Sand aus wie ein Rasen. */
      farbe *= mix(1.0, 0.52 + grasBild * 1.06, step(0.5, uBoden));

      /* Holz. Die Bildstelle kommt aus der Weltlage – genau wie beim Gras, aber mit einem
         Unterschied: Welche zwei Achsen genommen werden, entscheidet die Normale. Eine Fläche,
         die nach oben schaut, bekommt (x,z); eine, die nach vorn schaut, (x,y); eine seitliche
         (z,y). Ohne das liefe die Maserung an einer senkrechten Wand quer durch sie hindurch
         statt über sie hinweg.

         Das spart den großen Umbau: Sonst müsste jede Ecke zwei Zahlen mehr tragen (wo im Bild
         sie liegt), und jeder Körper müsste sagen, wie das Bild auf ihm liegt. Für Muster ohne
         festen Ort – Holz, Stein, Ziegel – ist die Weltlage genauso gut und kostet nichts.

         Gelesen wird auch hier unbedingt, aus demselben Grund wie oben: Ein texture2D in einem
         'if' hat in GLSL ES 1.00 keine festgelegte Detailstufe. */
      vec3 achse = abs(vNorm);
      vec2 holzUv = achse.y > achse.x && achse.y > achse.z ? vWeltOrt.xz
                  : (achse.x > achse.z ? vWeltOrt.zy : vWeltOrt.xy);
      vec3 holzBild = texture2D(uHolzBild, holzUv / uHolzMass).rgb;
      /* Wie beim Gras als Helligkeit verrechnet, nicht als Farbe: So behält jeder Balken seinen
         eigenen Ton – helle Kiefer, dunkle Eiche – und bekommt nur die Zeichnung darübergelegt. */
      farbe *= mix(vec3(1.0), 0.68 + holzBild * 0.62, step(0.5, uHolz));

      if (uLichtAnteil < 0.5) {
        /* Flach: Himmel und Wolken tragen ihre Farbe schon fertig in den Ecken. */
        gl_FragColor = vec4(farbe, uAlpha);
        return;
      }

      float direkt = max(dot(n, uSonne), 0.0);
      float schatten = imSchatten(1.0 - direkt);
      direkt *= (1.0 - schatten);

      /* Umgebungslicht als Halbkugel: von oben die Himmelsfarbe, von unten der Rückwurf des
         Bodens. Das ist der Unterschied zwischen „3D" und „gemalt aussehend" – ein einziger
         gleichmäßiger Grundwert macht jede Mulde tot. */
      float hoch = n.y * 0.5 + 0.5;
      vec3 umgebung = mix(uBodenLicht, uHimmelLicht, hoch);

      vec3 licht = umgebung + uSonnenFarbe * direkt;
      vec3 erg = farbe * licht;

      /* Ein Hauch mehr Licht auf senkrechten Flächen. In einer Welt aus ebenen Farbflächen
         verschwimmen Wand und Boden sonst zu einem Fleck, sobald beide dieselbe Farbe haben –
         dieser Zuschlag zieht die Kante nach, ohne dass etwas speckig glänzt. */
      float kante = pow(1.0 - abs(n.y), 3.0) * 0.06;
      erg += kante * uSonnenFarbe;

      float nebel = clamp((vTiefe - uNebel.x) / max(uNebel.y - uNebel.x, 0.001), 0.0, 1.0);
      nebel *= nebel;                       // vorne fast nichts, hinten schnell dicht
      erg = mix(erg, uNebelFarbe, nebel);

      gl_FragColor = vec4(erg, uAlpha);
    }`;

  /* Der Durchgang für die Sonne. Er zeichnet nur die Entfernung, keine Farbe. */
  const TIEFE_ECKEN = `
    attribute vec3 aOrt;
    uniform mat4 uProj, uSicht, uModell;
    void main() { gl_Position = uProj * uSicht * uModell * vec4(aOrt, 1.0); }`;

  const TIEFE_FLAECHEN = `
    precision $GENAU float;
    void main() {
      vec4 e = vec4(1.0, 255.0, 65025.0, 16581375.0) * gl_FragCoord.z;
      e = fract(e);
      e -= e.yzww * vec4(1.0 / 255.0, 1.0 / 255.0, 1.0 / 255.0, 0.0);
      gl_FragColor = e;
    }`;

  /* ---------- Werkzeug ---------- */

  function schattierer(gl, art, code) {
    const s = gl.createShader(art);
    gl.shaderSource(s, code); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
      const grund = gl.getShaderInfoLog(s);
      gl.deleteShader(s);
      throw new Error('Schattierer lässt sich nicht übersetzen: ' + grund);
    }
    return s;
  }

  function programm(gl, eckenCode, flaechenCode) {
    const p = gl.createProgram();
    gl.attachShader(p, schattierer(gl, gl.VERTEX_SHADER, eckenCode));
    gl.attachShader(p, schattierer(gl, gl.FRAGMENT_SHADER, flaechenCode));
    /* Die Plätze der Ecken-Angaben werden vor dem Binden festgelegt, damit beide Programme
       dieselben benutzen – so passt ein Gitter zu beiden, ohne umgestöpselt zu werden. */
    gl.bindAttribLocation(p, 0, 'aOrt');
    gl.bindAttribLocation(p, 1, 'aNorm');
    gl.bindAttribLocation(p, 2, 'aFarbe');
    gl.linkProgram(p);
    if (!gl.getProgramParameter(p, gl.LINK_STATUS)) throw new Error('Programm lässt sich nicht binden: ' + gl.getProgramInfoLog(p));
    const o = { p, u: {} };
    const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS);
    for (let i = 0; i < n; i++) { const name = gl.getActiveUniform(p, i).name; o.u[name] = gl.getUniformLocation(p, name); }
    return o;
  }

  /* ---------- Der Zeichner ---------- */

  /* Gibt null zurück, wenn das Gerät kein WebGL kann. Der Aufrufer zeigt dann eine Erklärung
     statt einer schwarzen Fläche – auf einem alten Tablet ist das der Unterschied zwischen
     „geht hier nicht" und „kaputt". */
  function start(leinwand) {
    const wunsch = { alpha: false, antialias: true, depth: true, stencil: false,
      powerPreference: 'high-performance', preserveDrawingBuffer: false };
    const gl = leinwand.getContext('webgl2', wunsch) || leinwand.getContext('webgl', wunsch)
      || leinwand.getContext('experimental-webgl', wunsch);
    if (!gl) return null;

    /* Kann dieses Gerät in den Flächen hoch genau rechnen? Auf dem Rechner immer, auf älteren
       Telefonen nicht. Gefragt wird vorher, weil ein Schattierer mit 'highp' auf einem Gerät ohne
       'highp' gar nicht erst übersetzt – dann gäbe es kein 3D statt eines groberen Schattens. */
    const hoch = gl.getShaderPrecisionFormat(gl.FRAGMENT_SHADER, gl.HIGH_FLOAT);
    const genau = hoch && hoch.precision > 0 ? 'highp' : 'mediump';
    const einsetzen = code => code.split('$GENAU').join(genau);

    let haupt, tiefe;
    try { haupt = programm(gl, ECKEN_CODE, einsetzen(FLAECHEN_CODE)); tiefe = programm(gl, TIEFE_ECKEN, einsetzen(TIEFE_FLAECHEN)); }
    catch (e) { console.warn('3D:', e.message); return null; }

    gl.enable(gl.DEPTH_TEST);
    gl.enable(gl.CULL_FACE);
    gl.cullFace(gl.BACK);
    gl.clearColor(0.55, 0.78, 0.95, 1);

    /* ---------- Schattenbild ----------
       Auf dem Telefon reichen 1024 Bildpunkte; auf dem Rechner sieht 2048 deutlich sauberer aus.
       Entschieden wird nach der größten Textur, die das Gerät zulässt – ein grober, aber
       zuverlässiger Hinweis darauf, wie viel Kraft dahintersteckt. */
    const maxTextur = gl.getParameter(gl.MAX_TEXTURE_SIZE);
    const klein = maxTextur < 8192 || /Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '');
    const SCHATTENFELD = klein ? 1024 : 2048;

    const schattenTextur = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, schattenTextur);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, SCHATTENFELD, SCHATTENFELD, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    /* ---------- Das Gras ----------

       Fynn hat eine gemalte Grasfläche mitgebracht und gesagt: „Nimm doch bitte das Design."
       Genau das passiert hier. Sie liegt als src/3d/gras.jpg im Spiel, kachelt sich nahtlos und
       wird über die ganze Wiese gelegt. Sie gibt ihr die Feinheit, die mit Dreiecken unbezahlbar
       wäre: Auf der Vorlage sind es mehrere hundert Halme auf den Quadratmeter, als Geometrie
       wären das eine halbe Million Dreiecke für eine einzige Bahn.

       Eine Zeit lang standen zusätzlich gemalte Grasbüschel als aufrechte Karten in der Wiese.
       Sie sind wieder weg – auf einem Boden, der das Gras schon zeigt, stehen sie als Fremdkörper
       darin. Zweimal Gras übereinander ist nicht doppelt so viel Gras, sondern ein Widerspruch. */

    /* Die Textur bekommt zuerst einen einzelnen grünen Punkt und wird ersetzt, sobald das Bild da
       ist. So läuft die erste Bahn auch dann, wenn das Laden hakt – die Wiese ist dann eben
       einfarbig grün, und niemand steht vor einem schwarzen Schirm. */
    function texturMachen(wiederholen) {
      const t = gl.createTexture();
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, 1, 1, 0, gl.RGBA, gl.UNSIGNED_BYTE, new Uint8Array([90, 150, 70, 255]));
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wiederholen ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wiederholen ? gl.REPEAT : gl.CLAMP_TO_EDGE);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      return t;
    }
    const bodenTextur = texturMachen(true);

    function bildEinsetzen(t, quelle) {
      gl.bindTexture(gl.TEXTURE_2D, t);
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, quelle);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
      gl.generateMipmap(gl.TEXTURE_2D);
    }

    /* ---------- Die Holzmaserung, gerechnet ----------

       Sie kommt nicht als Datei, sondern entsteht beim Start in einem unsichtbaren Zeichenblatt.
       Das hat drei Gründe, und alle drei sprechen gegen eine Bilddatei: Sie kostet keine Ladezeit,
       sie braucht keine Erlaubnis in den Sicherheitsregeln (ein gerechnetes Bild wird ja nicht
       geladen), und dieselbe Maserung lässt sich in jeder Farbe ausgeben – die Bande aus Eiche
       und die aus Fichte sind ein Aufruf mit anderer Farbe und nicht zwei Dateien.

       Beim Gras ging genau das schief, und der Unterschied ist lehrreich: Ein Grasteppich folgt
       keiner Regel, eine Holzmaserung schon. Sie ist ein Streifenmuster, das entlang der Faser
       läuft und quer dazu schwankt – das lässt sich aufschreiben, ein Grashalm nicht.

       Nahtlos wird sie dadurch, dass jede Welle eine ganzzahlige Zahl von Durchgängen über die
       Kachel macht. Dann trifft der rechte Rand auf den linken, ohne dass man die Naht sieht. */
    function holzBildMachen() {
      const N = 256;
      const c = document.createElement('canvas');
      c.width = c.height = N;
      const g = c.getContext('2d');
      const bild = g.createImageData(N, N);
      const d = bild.data;
      const TAU = Math.PI * 2;
      /* Die Faser läuft waagerecht (entlang u), die Maserung schwankt senkrecht (entlang v).
         'welle' verzieht die Jahresringe ein wenig, sonst wären es Linien wie auf kariertem
         Papier statt gewachsenem Holz. */
      for (let j = 0; j < N; j++) {
        for (let i = 0; i < N; i++) {
          const u = i / N, v = j / N;
          const welle = Math.sin(u * TAU) * 0.018 + Math.sin(u * TAU * 3 + 1.7) * 0.009
                      + Math.sin(u * TAU * 7 + 0.4) * 0.004;
          const t = v + welle;
          /* Die Jahresringe: dichte Streifen, die nicht gleichmäßig liegen. Drei Frequenzen
             übereinander – eine gleichmäßige gäbe ein Wellblech. */
          let ring = Math.sin(t * TAU * 19) * 0.5 + Math.sin(t * TAU * 37 + 2.1) * 0.3
                   + Math.sin(t * TAU * 67 + 0.8) * 0.2;
          /* Die harte Kante: Im Holz wechseln Früh- und Spätholz nicht weich, sondern mit einem
             Sprung. Erst dadurch sieht man Ringe und keine Schattierung. */
          ring = Math.sign(ring) * Math.pow(Math.abs(ring), 0.55);
          /* Eine grobe Schwankung über die ganze Fläche, damit nicht jeder Ring gleich dunkel
             ist – gewachsenes Holz ist an einer Stelle heller als an der anderen. */
          const grob = Math.sin((v * 2 + u * 0.7) * TAU) * 0.09 + Math.sin((v * 5 - u * 1.3) * TAU + 1.1) * 0.05;
          /* Und eine feine Körnung längs der Faser: die Poren. Sie ist mit Absicht nur in u
             fein und in v grob – Holz reißt längs, nicht quer. */
          const pore = Math.sin(u * TAU * 61 + j * 0.9) * 0.035 + Math.sin(u * TAU * 113 + j * 2.3) * 0.02;
          const h = Math.max(0, Math.min(1, 0.62 + ring * 0.2 + grob + pore));
          const k = (j * N + i) * 4;
          /* Warm getönt: Die Ringe sind nicht nur dunkler, sondern auch röter. Grau abgestuftes
             Holz sieht aus wie Beton mit Streifen. */
          d[k] = Math.round(255 * Math.min(1, h * 1.06));
          d[k + 1] = Math.round(255 * h);
          d[k + 2] = Math.round(255 * h * 0.9);
          d[k + 3] = 255;
        }
      }
      g.putImageData(bild, 0, 0);
      return c;
    }

    const holzTextur = texturMachen(true);
    try {
      bildEinsetzen(holzTextur, holzBildMachen());
    } catch (e) { console.warn('3D: Holzmaserung konnte nicht erzeugt werden –', e.message); }

    const grasBild = new Image();
    grasBild.onload = () => {
      try {
        bildEinsetzen(bodenTextur, grasBild);
      } catch (e) { console.warn('3D: Gras konnte nicht eingesetzt werden –', e.message); }
    };
    /* Die Adresse steht relativ zur Seite, nicht zu dieser Datei – beide liegen in src/3d. */
    grasBild.src = 'gras.jpg';

    const schattenTiefe = gl.createRenderbuffer();
    gl.bindRenderbuffer(gl.RENDERBUFFER, schattenTiefe);
    gl.renderbufferStorage(gl.RENDERBUFFER, gl.DEPTH_COMPONENT16, SCHATTENFELD, SCHATTENFELD);

    const schattenZiel = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, schattenZiel);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, schattenTextur, 0);
    gl.framebufferRenderbuffer(gl.FRAMEBUFFER, gl.DEPTH_ATTACHMENT, gl.RENDERBUFFER, schattenTiefe);
    const schattenGeht = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE;
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);

    const z = {
      gl, leinwand, breite: 1, hoehe: 1, schattenGeht, SCHATTENFELD,
      /* Wie breit eine Kachel des Grasbildes in Feldern ist. Knapp zwei: Dann sind die gemalten
         Halme etwa eine Handbreit lang – so groß wie die aus Dreiecken daneben. Größer gewählt
         sieht man die Kachel sich wiederholen, kleiner wird aus dem Gras eine Körnung. */
      bodenMass: 1.35,
      /* Wie breit eine Holzkachel in Feldern ist. Eine Bande ist ein Drittel Feld hoch; bei
         anderthalb Feldern je Kachel lagen nur zwei, drei Ringe darauf, und das sah nach Wellen
         aus und nicht nach Holz. Bei 0,8 sind es ein gutes Dutzend – so viele, wie man an einem
         Balken dieser Stärke wirklich sieht. */
      holzMass: 0.8,
      /* Wetter und Licht. Jede Welt setzt das um; die Werte hier sind der sonnige Mittag der Wiese. */
      licht: {
        sonne: [0.44, 0.70, 0.56],                 // Richtung ZUR Sonne
        sonnenFarbe: [1.04, 0.97, 0.82],
        himmel: [0.42, 0.48, 0.58],
        boden: [0.20, 0.22, 0.16],
        nebelFarbe: [0.70, 0.84, 0.95],
        nebel: [34, 120],
        schatten: 0.62,
      },
      /* Die Sonnenkamera umfasst eine Kugel um diesen Punkt. Beides setzt der Weltaufbau. */
      schattenMitte: [0, 0, 0], schattenWeite: 30,
    };

    /* ---------- Gitter ---------- */

    /* Ein Gitter: Ecken (Ort, Normale, Farbe) und die Liste der Dreiecke.
       Die drei Angaben liegen in einem einzigen Puffer hintereinander (Ort, Normale, Farbe, Ort,
       …). Das ist schneller als drei getrennte Puffer, weil die Grafikkarte eine Ecke am Stück
       aus dem Speicher holt statt aus drei Ecken des Speichers. */
    function netz(ecken, indizes, beweglich) {
      const puffer = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, puffer);
      gl.bufferData(gl.ARRAY_BUFFER, ecken, beweglich ? gl.DYNAMIC_DRAW : gl.STATIC_DRAW);
      const ip = gl.createBuffer();
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ip);
      gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, indizes, gl.STATIC_DRAW);
      return {
        puffer, ip, anzahl: indizes.length,
        /* Für das, was sich wirklich verformt und nicht nur bewegt: das Fahnentuch. Die Ecken
           werden neu gerechnet und überschrieben; die Dreiecksliste bleibt, wie sie ist. */
        frisch(neueEcken) { gl.bindBuffer(gl.ARRAY_BUFFER, puffer); gl.bufferSubData(gl.ARRAY_BUFFER, 0, neueEcken); },
        weg() { gl.deleteBuffer(puffer); gl.deleteBuffer(ip); },
      };
    }

    const SCHRITT = 9 * 4;        // 3 Ort + 3 Normale + 3 Farbe, je vier Byte

    function binden(n) {
      gl.bindBuffer(gl.ARRAY_BUFFER, n.puffer);
      gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, n.ip);
      gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 3, gl.FLOAT, false, SCHRITT, 0);
      gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 3, gl.FLOAT, false, SCHRITT, 12);
      gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 3, gl.FLOAT, false, SCHRITT, 24);
    }

    /* ---------- Ein Bild ----------
       'stuecke' ist die Liste dessen, was gezeichnet wird. Jedes Stück:
         { netz, modell, licht, alpha, ton, welle, wirftSchatten, durchsichtig }
       Die Reihenfolge zählt: Erst alles Undurchsichtige (dabei füllt sich der Tiefenspeicher und
       Verdecktes fällt früh weg), dann Wasser und Glas von hinten nach vorn. */
    let modellEins = M3.einheit();

    function sonnenSicht() {
      const l = z.licht.sonne, m = z.schattenMitte, w = z.schattenWeite;
      const auge = [m[0] + l[0] * w * 2, m[1] + l[1] * w * 2, m[2] + l[2] * w * 2];
      const sicht = M3.blick(auge, m, [0, 1, 0]);
      const proj = M3.parallel(-w, w, -w, w, 0.1, w * 4.2);
      return M3.mult(proj, sicht);
    }

    function zeichneStueck(prog, s, schattenMat) {
      const u = prog.u;
      if (u.uModell) gl.uniformMatrix4fv(u.uModell, false, s.modell || modellEins);
      if (u.uLichtAnteil) gl.uniform1f(u.uLichtAnteil, s.licht === false ? 0 : 1);
      if (u.uAlpha) gl.uniform1f(u.uAlpha, s.alpha === undefined ? 1 : s.alpha);
      if (u.uTon) gl.uniform3fv(u.uTon, s.ton || [1, 1, 1]);
      if (u.uWelle) gl.uniform1f(u.uWelle, s.welle ? 1 : 0);
      if (u.uBoden) gl.uniform1f(u.uBoden, s.boden ? 1 : 0);
      if (u.uHolz) gl.uniform1f(u.uHolz, s.holz ? 1 : 0);
      if (u.uSchattenSicht && schattenMat) gl.uniformMatrix4fv(u.uSchattenSicht, false, schattenMat);
      binden(s.netz);
      gl.drawElements(gl.TRIANGLES, s.netz.anzahl, gl.UNSIGNED_SHORT, 0);
    }

    z.bild = function (stuecke, kamera, zeit) {
      const l = z.licht;
      const schattenMat = z.schattenGeht && l.schatten > 0 ? sonnenSicht() : null;

      /* 1. Durchgang: aus Sicht der Sonne, nur die Entfernung.
         Gezeichnet werden die **Vorderseiten**, also die der Sonne zugewandten Flächen.

         Der erste Versuch nahm die Rückseiten – ein bekannter Kniff gegen Streifenschatten, weil
         der Rechenfehler dann im Inneren des Körpers liegt, wo ihn niemand sieht. Für Häuser und
         Mauern geht das gut. Für alles, was klein ist und auf dem Boden steht, geht es gar nicht:
         Die Rückseite eines Busches liegt unter der Wiese, also stünde im Schattenbild ein Wert,
         der tiefer ist als der Boden davor – und dann wirft nichts mehr einen Schatten. Genau das
         war der Fall; die ganze Welt sah flach aus. Offene Körper wie die Kegel einer Tanne, die
         unten keinen Deckel haben, trugen zum Schattenbild sogar überhaupt nichts bei.

         Mit den Vorderseiten steht im Schattenbild immer die beschienene Haut – und der
         Sicherheitsabstand weiter unten hält die Flächen davon ab, sich selbst zu beschatten. */
      if (schattenMat) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, schattenZiel);
        gl.viewport(0, 0, SCHATTENFELD, SCHATTENFELD);
        gl.clearColor(1, 1, 1, 1);
        gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
        gl.useProgram(tiefe.p);
        gl.uniformMatrix4fv(tiefe.u.uProj, false, M3.einheit());
        gl.uniformMatrix4fv(tiefe.u.uSicht, false, schattenMat);
        gl.disable(gl.BLEND);
        for (const s of stuecke) {
          if (s.wirftSchatten === false || s.durchsichtig) continue;
          zeichneStueck(tiefe, s, null);
        }
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      }

      /* 2. Durchgang: das eigentliche Bild. */
      gl.viewport(0, 0, z.breite, z.hoehe);
      gl.clearColor(l.nebelFarbe[0], l.nebelFarbe[1], l.nebelFarbe[2], 1);
      gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

      gl.useProgram(haupt.p);
      const u = haupt.u;
      gl.uniformMatrix4fv(u.uProj, false, kamera.proj);
      gl.uniformMatrix4fv(u.uSicht, false, kamera.sicht);
      gl.uniform3fv(u.uSonne, l.sonne);
      gl.uniform3fv(u.uSonnenFarbe, l.sonnenFarbe);
      gl.uniform3fv(u.uHimmelLicht, l.himmel);
      gl.uniform3fv(u.uBodenLicht, l.boden);
      gl.uniform3fv(u.uNebelFarbe, l.nebelFarbe);
      gl.uniform2fv(u.uNebel, l.nebel);
      gl.uniform1f(u.uZeit, zeit);
      gl.uniform1f(u.uSchattenStaerke, schattenMat ? l.schatten : 0);
      gl.uniform1f(u.uSchattenFeld, SCHATTENFELD);
      gl.uniform1f(u.uSchattenSpanne, Math.max(1, z.schattenWeite * 4.2 - 0.1));
      if (schattenMat) {
        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, schattenTextur);
        gl.uniform1i(u.uSchatten, 0);
      }
      gl.activeTexture(gl.TEXTURE1);
      gl.bindTexture(gl.TEXTURE_2D, bodenTextur);
      if (u.uBodenBild) gl.uniform1i(u.uBodenBild, 1);
      if (u.uBodenMass) gl.uniform1f(u.uBodenMass, z.bodenMass);
      gl.activeTexture(gl.TEXTURE2);
      gl.bindTexture(gl.TEXTURE_2D, holzTextur);
      if (u.uHolzBild) gl.uniform1i(u.uHolzBild, 2);
      if (u.uHolzMass) gl.uniform1f(u.uHolzMass, z.holzMass);

      gl.disable(gl.BLEND);
      gl.depthMask(true);
      for (const s of stuecke) if (!s.durchsichtig) zeichneStueck(haupt, s, schattenMat);

      /* Durchsichtiges zuletzt und ohne in den Tiefenspeicher zu schreiben: Sonst verdeckte die
         Wasserfläche alles, was hinter ihr liegt und danach gezeichnet wird. */
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
      gl.depthMask(false);
      for (const s of stuecke) if (s.durchsichtig) zeichneStueck(haupt, s, schattenMat);
      gl.depthMask(true);
      gl.disable(gl.BLEND);
    };

    /* Größe an Fenster und Bildschärfe anpassen. Der Faktor wird gedeckelt: Ein Telefon mit
       dreifacher Punktdichte müsste sonst neunmal so viele Bildpunkte rechnen wie nötig – das
       kostet mehr Bilder pro Sekunde, als es an Schärfe bringt. */
    z.groesse = function (breitePx, hoehePx, maxFaktor) {
      const f = Math.min(window.devicePixelRatio || 1, maxFaktor || 2);
      const b = Math.max(1, Math.round(breitePx * f)), h = Math.max(1, Math.round(hoehePx * f));
      if (b === z.breite && h === z.hoehe) return false;
      z.breite = leinwand.width = b; z.hoehe = leinwand.height = h;
      return true;
    };

    z.netz = netz;
    z.verloren = () => gl.isContextLost();
    /* Das Schattenbild zum Nachschauen. Ein Schatten, der fehlt, ist schwer zu suchen: Man sieht
       nur, dass es flach aussieht, und weiß nicht, ob die Sonnenkamera danebenzielt, ob nichts
       hineingezeichnet wurde oder ob der Vergleich nicht greift. Diese Tür beantwortet den
       mittleren Teil der Frage in einer Zeile. */
    z.schattenLesen = (n = 16) => {
      const raus = new Uint8Array(n * n * 4);
      gl.bindFramebuffer(gl.FRAMEBUFFER, schattenZiel);
      gl.readPixels(0, 0, n, n, gl.RGBA, gl.UNSIGNED_BYTE, raus);
      gl.bindFramebuffer(gl.FRAMEBUFFER, null);
      return raus;
    };
    return z;
  }

  return { start };
})();
