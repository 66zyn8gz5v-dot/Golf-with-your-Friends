/* Fantasy Golf 3D – der Ablauf: Weltkarte, Bahnwahl, Spielen, Ergebnis.

   Das hier ist ein eigenes Spiel mit einer eigenen Seite (src/3d/index.html) und einer eigenen
   Adresse. Vom 2,5D-Spiel nebenan benutzt es nur drei Dinge, die mit dessen Bahnen nichts zu tun
   haben: die Sinnbilder (src/icons.js), die Geräusche (src/sfx.js) und den Speicherschlüssel
   (src/version.js). Sonst nichts – kein Bahnformat, keine Physik, keine Oberfläche.

   Das ist Absicht und war es von Anfang an: So kann am 3D-Teil gearbeitet werden, ohne dass
   jemals eine Runde im fertigen Spiel daran zerbricht. Anfangs lag die 3D-Welt noch als Zimmer
   im Haus nebenan, erreichbar über einen Knopf im Startbildschirm. Das war der kürzeste Weg zu
   einer Vorschau, aber es war das falsche Bild: Wer ein neues Spiel öffnen will, soll ein neues
   Spiel öffnen und nicht zuerst durch das alte gehen.

   'starten' nimmt darum einen Rückruf entgegen, der sagt, wohin es beim Verlassen geht. Auf der
   eigenen Seite gibt es keinen – dort ist diese Welt die ganze Anwendung, und der Knopf „Zurück"
   bleibt auf der Weltkarte verborgen.

   ---- Die Bedienung ----

   Gezielt wird wie im 2,5D-Spiel: **vom Ball wegziehen und loslassen.** Weiter gezogen heißt
   fester geschlagen; die Richtung ist die Gegenrichtung des Ziehens. Umgerechnet wird dabei über
   die Kamera, nicht über die Welt – wer nach unten zieht, schlägt immer von sich weg, egal wie
   die Kamera steht. Alles andere wäre auf einer drehbaren Kamera nicht zu treffen.

   Die Kamera dreht man mit den Knöpfen, mit Q und E, mit zwei Fingern oder mit der rechten
   Maustaste. Sie folgt dem Ball von selbst und dreht sich beim Anspielen einer neuen Bahn so,
   dass das Loch vor einem liegt. */
const Golf3D = (() => {
  const MAX_ZIEHEN = 190;            // Bildpunkte für vollen Ausschlag
  const FERN = 420;

  let leinwand = null, zeichner = null, huelle = null;
  let laeuft = false, bildNr = 0, zeit = 0, letzte = 0;
  let szene = null;                  // die gerade gebaute 3D-Szene (Karte oder Bahn)
  let schirm = 'karte';              // 'karte' | 'bahn'
  let zurueck = null;                // was beim Verlassen aufgerufen wird
  let fehlerText = null;

  const stand = {
    welt: null, bahnNr: 0, schlaege: 0, gesamt: [], ball: null,
    ziel: null, phase: 'zielen', letzterOrt: null, meldungBis: 0,
    /* Zu mehreren an einem Gerät: Jeder spielt die Bahn ganz zu Ende, dann ist der nächste dran.
       Das ist derselbe Ablauf wie im 2,5D-Spiel nebenan, und für zwei Kinder auf einem Sofa ist
       er der einzige, der ohne Erklärung funktioniert – abwechselnd Schlag für Schlag müsste man
       nach jedem Schlag das Gerät weiterreichen und wüsste nie, wessen Ball gerade rollt. */
    spieler: null,        // null = allein; sonst eine Liste von { name, farbe, karte }
    amZug: 0,
  };

  /* Vier Ballfarben, klar unterscheidbar und alle hell genug, dass man den Ball im Gras findet.
     Die Namen stehen daneben, damit auf der Tafel nicht nur ein Farbklecks steht. */
  const SPIELERFARBEN = [
    { name: 'Weiß', ton: [1.0, 0.99, 0.96] },
    { name: 'Rot', ton: [1.0, 0.42, 0.34] },
    { name: 'Blau', ton: [0.46, 0.68, 1.0] },
    { name: 'Gelb', ton: [1.0, 0.85, 0.32] },
  ];
  const amZug = () => (stand.spieler ? stand.spieler[stand.amZug] : null);
  const zuMehreren = () => !!(stand.spieler && stand.spieler.length > 1);
  /* Im Spiel zu mehreren braucht es eine Obergrenze: Sonst hält ein Spieler, der eine Bahn nicht
     schafft, alle anderen auf. Allein gibt es keine – wer allein spielt, darf so lange üben, wie
     er will. */
  const hoechstZahl = par => par + 6;

  const kamera = { zx: 0, zy: 0, zz: 0, winkel: 0, neigung: 0.5, abstand: 9,
    zielWinkel: 0, zielAbstand: 9, zielNeigung: 0.5, proj: null, sicht: null, auge: [0, 0, 0] };

  /* ---------- Rekorde ----------
     Eigener Schlüssel, eigener Speicher: Das 3D-Spiel soll die Rangliste des 2,5D-Spiels nicht
     anfassen. Wer beides spielt, hat zwei Listen – und das ist richtig so, weil es zwei Spiele
     sind. */
  const SCHLUESSEL = (typeof speicherSchluessel === 'function' ? speicherSchluessel('3d.rekorde') : 'fantasygolf.3d.rekorde');
  function rekorde() {
    try { return JSON.parse(localStorage.getItem(SCHLUESSEL) || '{}'); } catch (e) { return {}; }
  }
  function rekordMerken(weltId, bahnNr, schlaege) {
    const r = rekorde(), k = weltId + ':' + bahnNr;
    if (r[k] === undefined || schlaege < r[k]) {
      r[k] = schlaege;
      try { localStorage.setItem(SCHLUESSEL, JSON.stringify(r)); } catch (e) { /* voller Speicher – dann eben ohne */ }
      return true;
    }
    return false;
  }

  const symbol = (name, cls) => (typeof Icons !== 'undefined' && Icons.has(name)) ? Icons.svg(name, cls) : '';
  const schall = name => { try { if (typeof Sfx !== 'undefined' && Sfx[name]) Sfx[name](); } catch (e) { /* ohne Ton weiterspielen */ } };

  /* ---------- Die Hülle aus gewöhnlichem HTML ----------
     Alles, was Schrift ist, bleibt HTML: Überschriften, Knöpfe, Zahlen, Ortsnamen auf der Karte.
     In die 3D-Welt gemalte Schrift wäre unscharf, schwer anzutippen und in jeder Sprache anders
     breit. Die Ortsnamen werden bei jedem Bild an die Stelle gerückt, an der ihr Wegweiser gerade
     steht – mehr Verbindung zwischen beiden Welten braucht es nicht. */
  function huelleBauen() {
    huelle = document.createElement('div');
    huelle.id = 'g3';
    huelle.innerHTML = `
      <canvas id="g3-leinwand"></canvas>
      <div id="g3-marken"></div>
      <div id="g3-kopf">
        <button class="g3-knopf g3-zurueck" id="g3-raus" title="Zurück (Esc)">${symbol('arrow_back')}<span>Zurück</span></button>
        <div id="g3-titel"><b></b><i></i></div>
      </div>
      <div id="g3-tafel" hidden>
        <div class="g3-feld"><span>Bahn</span><b id="g3-bahn">–</b></div>
        <div class="g3-feld"><span>Schläge</span><b id="g3-schlaege">0</b></div>
        <div class="g3-feld"><span>Par</span><b id="g3-par">3</b></div>
        <div class="g3-feld g3-rekord"><span>Rekord</span><b id="g3-rekord">–</b></div>
        <div id="g3-spieler" hidden></div>
      </div>
      <div id="g3-kraft"><i></i></div>
      <div id="g3-hinweis"></div>
      <div id="g3-steuer">
        <button class="g3-knopf" id="g3-links" title="Kamera nach links (Q)">${symbol('rotate_left')}</button>
        <button class="g3-knopf" id="g3-uebersicht" title="Ganze Bahn zeigen (M)">${symbol('map')}</button>
        <button class="g3-knopf" id="g3-rechts" title="Kamera nach rechts (E)">${symbol('rotate_right')}</button>
        <button class="g3-knopf" id="g3-raus2" title="Ball zurücklegen (R)">${symbol('restart_alt')}</button>
      </div>
      <div id="g3-schirm"></div>`;
    document.body.appendChild(huelle);
    leinwand = huelle.querySelector('#g3-leinwand');

    const k = id => huelle.querySelector('#' + id);
    k('g3-raus').addEventListener('click', () => rausTaste());
    k('g3-links').addEventListener('click', () => { kamera.zielWinkel -= 0.5; });
    k('g3-rechts').addEventListener('click', () => { kamera.zielWinkel += 0.5; });
    k('g3-uebersicht').addEventListener('click', uebersicht);
    k('g3-raus2').addEventListener('click', () => ballZurueck('wunsch'));

    bedienungAnhaengen();
  }

  /* ---------- Bildschirme aus HTML ---------- */
  /* Der Knopf oben links führt je nach Lage woanders hin – von einer Bahn zur Bahnwahl, von der
     Bahnwahl zur Weltkarte, von der Weltkarte hinaus. Das Hinaus gibt es nur, wenn jemand einen
     Rückweg mitgegeben hat; auf der eigenen Seite ist die Weltkarte der Anfang, und dort wäre ein
     Knopf ins Nichts. */
  function rausKnopfFrischen() {
    const k = huelle.querySelector('#g3-raus');
    if (k) k.hidden = schirm === 'karte' && !zurueck && !schirmFeld().className;
  }

  const schirmFeld = () => huelle.querySelector('#g3-schirm');
  function schirmZeigen(html, klasse) {
    const s = schirmFeld();
    s.className = 'sichtbar' + (klasse ? ' ' + klasse : '');
    s.innerHTML = html;
    rausKnopfFrischen();
  }
  function schirmWeg() { const s = schirmFeld(); s.className = ''; s.innerHTML = ''; rausKnopfFrischen(); }
  const beiKlick = (id, tu) => { const e = huelle.querySelector('#' + id); if (e) e.addEventListener('click', tu); };

  function meldung(text, dauer = 2.2) {
    const h = huelle.querySelector('#g3-hinweis');
    h.textContent = text; h.classList.add('sichtbar');
    stand.meldungBis = zeit + dauer;
  }

  /* ---------- Weltkarte ---------- */

  function karteZeigen() {
    schirm = 'karte';
    szeneWeg();
    schirmWeg();
    huelle.querySelector('#g3-tafel').hidden = true;
    huelle.querySelector('#g3-steuer').hidden = false;
    huelle.querySelector('#g3-raus2').hidden = true;
    rausKnopfFrischen();
    titelSetzen('Fantasy Golf 3D', 'Wähle eine Welt');

    szene = Karte3D.bauen(zeichner);
    zeichner.licht = szene.licht;
    zeichner.schattenMitte = szene.schattenMitte;
    zeichner.schattenWeite = szene.schattenWeite;
    kamera.zx = 0; kamera.zy = 2; kamera.zz = 1;
    kamera.winkel = kamera.zielWinkel = 0.2;
    kamera.neigung = kamera.zielNeigung = 0.70;
    kamera.abstand = kamera.zielAbstand = karteAbstand();

    /* Für jede Welt ein Schild. Sie liegen als gewöhnliche Knöpfe über der Leinwand und werden
       bei jedem Bild nachgeführt. */
    const feld = huelle.querySelector('#g3-marken');
    feld.innerHTML = szene.marken.map(m => `
      <button class="g3-marke${m.welt.bald ? ' bald' : ''}" data-welt="${m.id}">
        <span class="g3-marke-zeichen" style="background:${m.welt.farbe}">${symbol(m.welt.marke)}</span>
        <span class="g3-marke-text"><b>${m.welt.name}</b><i>${m.welt.bald ? 'bald zu erkunden' : m.welt.bahnen.length + ' Bahnen'}</i></span>
      </button>`).join('');
    feld.querySelectorAll('[data-welt]').forEach(el => el.addEventListener('click', () => {
      const m = szene.marken.find(x => x.id === el.dataset.welt);
      if (!m) return;
      if (m.welt.bald) { meldung(m.welt.name + ' wird noch gebaut.'); return; }
      weltZeigen(m.welt);
    }));
    feld.hidden = false;
  }

  /* ---------- Bahnwahl einer Welt ---------- */

  function weltZeigen(welt) {
    stand.welt = welt;
    const r = rekorde();
    kamera.zielAbstand = karteAbstand() * 0.6;
    schirmZeigen(`<div class="g3-tafel-gross">
      <h2>${symbol(welt.marke)} ${welt.name}</h2>
      <p class="g3-unter">${welt.unter}</p>
      <div class="g3-bahnliste">
        ${welt.bahnen.map((b, i) => `
          <button class="g3-bahnkarte" data-bahn="${i}">
            <span class="g3-nr">${i + 1}</span>
            <span class="g3-bahntext"><b>${b.name}</b><i>${b.intro}</i></span>
            <span class="g3-bahnzahl">Par ${b.par}<em>${r[welt.id + ':' + i] !== undefined ? 'Rekord ' + r[welt.id + ':' + i] : 'noch nicht gespielt'}</em></span>
          </button>`).join('')}
      </div>
      <p class="g3-reihe">
        <button class="g3-btn" id="g3-runde">${symbol('sports_golf')} Ganze Runde spielen</button>
        <button class="g3-btn hell" id="g3-mehrere">${symbol('sports_golf')} Zu mehreren spielen</button>
        <button class="g3-btn hell" id="g3-zurKarte">${symbol('arrow_back')} Zur Weltkarte</button>
      </p>
    </div>`);
    schirmFeld().querySelectorAll('[data-bahn]').forEach(el =>
      el.addEventListener('click', () => { alleinSpielen(); bahnStarten(welt, +el.dataset.bahn, false); }));
    beiKlick('g3-runde', () => { alleinSpielen(); bahnStarten(welt, 0, true); });
    beiKlick('g3-mehrere', () => rundeEinrichten(welt));
    beiKlick('g3-zurKarte', karteZeigen);
  }

  function alleinSpielen() { stand.spieler = null; stand.amZug = 0; stand.gesamt = []; }

  /* ---------- Zu mehreren an einem Gerät ----------

     Die Einrichtung ist absichtlich eine einzige Seite: Anzahl, Namen, Ballfarben, los. Wer zu
     zweit spielen will, soll nicht durch drei Bildschirme klicken müssen.

     Die Namen bleiben im Speicher stehen. Beim zweiten Mal steht dort wieder „Fynn" und nicht
     wieder „Spieler 1" – dieselbe Überlegung wie bei den Hüten im 2,5D-Spiel. */
  const NAMEN_SCHLUESSEL = (typeof speicherSchluessel === 'function' ? speicherSchluessel('3d.namen') : 'fantasygolf.3d.namen');
  function namenLaden() {
    try {
      const v = JSON.parse(localStorage.getItem(NAMEN_SCHLUESSEL) || 'null');
      if (Array.isArray(v)) return v.slice(0, 4).map(n => String(n).slice(0, 14));
    } catch (e) { /* nichts gespeichert – dann eben die Vorgaben */ }
    return null;
  }
  function namenMerken(namen) {
    try { localStorage.setItem(NAMEN_SCHLUESSEL, JSON.stringify(namen)); } catch (e) { /* voller Speicher */ }
  }

  function rundeEinrichten(welt) {
    const gemerkt = namenLaden() || [];
    const namen = [0, 1, 2, 3].map(i => gemerkt[i] || 'Spieler ' + (i + 1));
    let anzahl = Math.max(2, Math.min(4, gemerkt.length || 2));

    const zeichneReihen = () => {
      const feld = schirmFeld().querySelector('#g3-spielerliste');
      if (!feld) return;
      feld.innerHTML = namen.map((n, i) => `
        <label class="g3-spielerzeile${i < anzahl ? '' : ' aus'}">
          <span class="g3-ballpunkt" style="background:${tonFarbe(SPIELERFARBEN[i].ton)}"></span>
          <input type="text" maxlength="14" data-nr="${i}" value="${n.replace(/"/g, '&quot;')}"${i < anzahl ? '' : ' disabled'}>
          <em>${SPIELERFARBEN[i].name}</em>
        </label>`).join('');
      feld.querySelectorAll('input').forEach(el => el.addEventListener('input', () => { namen[+el.dataset.nr] = el.value; }));
      schirmFeld().querySelectorAll('[data-anzahl]').forEach(el =>
        el.classList.toggle('an', +el.dataset.anzahl === anzahl));
    };

    schirmZeigen(`<div class="g3-tafel-gross schmal">
      <h2>${symbol('sports_golf')} Zu mehreren spielen</h2>
      <p class="g3-unter">Alle an einem Gerät. Jeder spielt eine Bahn ganz zu Ende, dann ist der
        nächste dran – nach spätestens Par plus sechs Schlägen geht es weiter.</p>
      <p class="g3-reihe" id="g3-anzahl">
        ${[2, 3, 4].map(n => `<button class="g3-btn hell" data-anzahl="${n}">${n} Spieler</button>`).join('')}
      </p>
      <div id="g3-spielerliste"></div>
      <p class="g3-reihe">
        <button class="g3-btn" id="g3-losgehts">${symbol('sports_golf')} Runde starten</button>
        <button class="g3-btn hell" id="g3-abbruch">${symbol('arrow_back')} Zurück</button>
      </p>
    </div>`);
    zeichneReihen();
    schirmFeld().querySelectorAll('[data-anzahl]').forEach(el => el.addEventListener('click', () => {
      anzahl = +el.dataset.anzahl; zeichneReihen();
    }));
    beiKlick('g3-abbruch', () => weltZeigen(welt));
    beiKlick('g3-losgehts', () => {
      const liste = namen.slice(0, anzahl).map((n, i) => ({
        name: (n || '').trim() || 'Spieler ' + (i + 1), ton: SPIELERFARBEN[i].ton, karte: [],
      }));
      namenMerken(liste.map(p => p.name));
      stand.spieler = liste; stand.amZug = 0; stand.gesamt = [];
      bahnStarten(welt, 0, true);
    });
  }

  const tonFarbe = t => `rgb(${Math.round(t[0] * 230)},${Math.round(t[1] * 230)},${Math.round(t[2] * 230)})`;

  /* ---------- Eine Bahn ---------- */

  function bahnStarten(welt, nr, runde, wer = 0) {
    stand.welt = welt; stand.bahnNr = nr; stand.schlaege = 0; stand.runde = runde;
    stand.amZug = stand.spieler ? Math.min(wer, stand.spieler.length - 1) : 0;
    schirm = 'bahn';
    schirmWeg();
    huelle.querySelector('#g3-marken').hidden = true;
    huelle.querySelector('#g3-tafel').hidden = false;
    huelle.querySelector('#g3-raus2').hidden = false;
    rausKnopfFrischen();

    szeneWeg();
    const bahn = welt.bahnen[nr];
    szene = bahnBauen(welt, bahn);
    zeichner.licht = szene.licht;

    stand.ball = Physik3D.ball(szene.gl, szene.gl.abschlag[0], szene.gl.abschlag[1]);
    stand.ziel = szene.gl.lochFeld;
    stand.letzterOrt = [stand.ball.x, stand.ball.z];
    stand.phase = 'zielen';

    /* Die Kamera stellt sich hinter den Abschlag und schaut in Richtung Loch – so sieht man beim
       Anspielen sofort, worum es geht, statt erst die Kamera suchen zu müssen. */
    const dx = stand.ziel[0] - stand.ball.x, dz = stand.ziel[1] - stand.ball.z;
    kamera.winkel = kamera.zielWinkel = Math.atan2(-dx, -dz);
    /* Die Kamera steht höher, als man zunächst meint. Flach hinter dem Ball sähe es
       eindrucksvoller aus, aber dann steht die halbe Bahn vor dem Loch und man zielt blind; aus
       gut fünfundzwanzig Grad sieht man den Weg die Spur hinauf und behält den Ball groß im Bild.
       Auf einer schmalen Bahn zwischen Banden ist das zugleich der Blick, der die Banden zeigt –
       und über die soll ja gespielt werden. */
    kamera.neigung = kamera.zielNeigung = 0.46;
    /* Ein Stück weiter weg als früher. Seit Bäume und Häuser ihre wirkliche Größe haben, steht
       aus achteinhalb Feldern Entfernung nur noch ein Stamm im Bild; aus elf sieht man wieder die
       Bahn und das, was daneben steht. */
    kamera.abstand = kamera.zielAbstand = 11;
    kamera.zx = stand.ball.x; kamera.zy = stand.ball.y; kamera.zz = stand.ball.z;

    titelSetzen(bahn.name, welt.name + ' · Bahn ' + (nr + 1) + ' von ' + welt.bahnen.length);
    tafelFrischen();
    const ich = amZug();
    meldung(ich ? ich.name + ' ist dran. ' + bahn.intro : bahn.intro, 5);
  }

  function bahnBauen(welt, bahn) {
    const gl = Welt3D.gelaende(bahn);
    const AUSSEN = 15;
    const beweglich = { fahnen: [], muehlen: [] };
    const stuecke = [];

    /* Feste Welt: Gelände, Felsen, Burg, Deko, Bewuchs – alles in einen Sammler, damit möglichst
       wenige Gitter daraus werden. */
    const B = Bauen.sammler();
    Welt3D.gelaendeNetz(B, gl, AUSSEN, 'innen');
    Welt3D.lochNetz(B, gl);
    Welt3D.felsenNetz(B, gl);
    Welt3D.bandenNetz(B, gl);
    const burgFahnen = Welt3D.burgNetz(B, gl, bahn.burg);
    Welt3D.dekoNetz(B, gl, beweglich);
    Welt3D.streuenNetz(B, gl, AUSSEN);
    Welt3D.uferNetz(B, gl);
    Welt3D.fernNetz(B, gl, welt);
    // Das Loch mitsamt Fahnenmast
    const lochH = gl.hoehe(gl.lochFeld[0], gl.lochFeld[1]);
    /* Die Fahne ist absichtlich groß. Sie ist von jeder Stelle der Bahn das einzige, woran man
       sieht, wo man hin will – aus dreißig Feldern Entfernung wird aus einem zierlichen Mast ein
       Strich von zwei Bildpunkten, und dann sucht man. */
    const MAST = 1.9;
    B.stelle(gl.lochFeld[0], lochH, gl.lochFeld[1], 0, 1, b => Deko3D.mast(b, MAST));
    beweglich.fahnen.push({ x: gl.lochFeld[0], y: lochH + MAST, z: gl.lochFeld[1], h: 0.58, farbe: '#b63a30' });
    for (const f of burgFahnen) beweglich.fahnen.push(f);
    /* Zwei Abschlagsmarken, wie auf einem richtigen Platz. Vorher lag hier eine weiße Scheibe;
       die sah aus, als wäre etwas verschüttet worden. */
    for (const sx of [-1, 1]) {
      const ax = gl.abschlag[0] + sx * 0.42, az = gl.abschlag[1] - 0.2;
      B.stelle(ax, gl.hoehe(ax, az), az, 0, 1, b => {
        b.walze(0.075, 0.06, 0.16, 7, '#e8e2d2', null);
        b.mit(M3.verschieben(0, 0.16, 0), c => c.kugel(0.075, 4, 7, '#c8402f'));
      });
    }
    for (const netz of B.fertig(zeichner)) stuecke.push({ netz });

    /* Der Grasteppich kommt in ein eigenes Gitter, und zwar aus einem einzigen Grund: Er wirft
       keinen Schatten. Der Schattendurchgang zeichnet jedes Dreieck ein zweites Mal, und der
       Schatten eines Grashalms wäre auf dem Schattenbild schmaler als ein Bildpunkt – bezahlt
       würde er trotzdem. So kostet die Wiese nur die Hälfte. */
    /* Die Wiese draußen liegt in einem eigenen Gitter, weil sie das gemalte Grasbild trägt. Die
       Spielfläche bekommt es nicht: Ein Rasen, durch den Grashalme gemalt sind, ist kein Rasen. */
    const WI = Bauen.sammler();
    Welt3D.gelaendeNetz(WI, gl, AUSSEN, 'aussen');
    for (const netz of WI.fertig(zeichner)) stuecke.push({ netz, boden: true });

    /* Wasser als durchscheinende, bewegte Decke – zuletzt gezeichnet, ohne Schattenwurf. */
    const W = Bauen.sammler();
    const spiegel = Welt3D.wasserNetz(W, gl);
    if (spiegel !== false) for (const netz of W.fertig(zeichner)) stuecke.push({ netz, durchsichtig: true, alpha: 0.78, welle: true, wirftSchatten: false });

    // Wolken, ohne Licht und ohne Schatten
    const WO = Bauen.sammler();
    Welt3D.wolkenNetz(WO, gl);
    for (const netz of WO.fertig(zeichner)) stuecke.push({ netz, licht: false, wirftSchatten: false });

    // Himmel: eine Kuppel, die mit der Kamera wandert
    const HS = Bauen.sammler();
    Welt3D.himmelNetz(HS, welt);
    const himmel = HS.fertig(zeichner).map(netz => ({ netz, licht: false, wirftSchatten: false, himmel: true }));

    /* Ball, Fahnentücher, Mühlenflügel und der Zielpfeil bekommen eigene, kleine Gitter. */
    /* Der Ball: weiß, mit einem kleinen dunklen Zeichen an der Seite. Das Zeichen ist kein
       Schmuck – ohne es sieht man nicht, dass der Ball rollt, sondern nur, dass er sich bewegt.
       Oben aufgesetzt sah es aus wie eine Kirsche; an der Seite ist es ein Aufdruck. */
    const BA = Bauen.sammler();
    BA.kugel(Physik3D.BALL_R, 8, 12, '#fbf9f0');
    BA.mit(M3.verschieben(Physik3D.BALL_R * 0.93, 0, 0), b => b.kugel(Physik3D.BALL_R * 0.26, 4, 6, '#b8342a'));
    const ballNetz = BA.fertig(zeichner)[0];

    /* Der Zielpfeil folgt dem Boden und wird darum bei jedem Bild neu gerechnet – wie das
       Fahnentuch. Hier entsteht nur die leere Form. */
    const pfeilRoh = Welt3D.pfeilNeu();
    const pfeilNetz = zeichner.netz(pfeilRoh.e, pfeilRoh.ix, true);

    const fluegel = [];
    for (const m of beweglich.muehlen) {
      const MF = Bauen.sammler();
      Deko3D.muehlenfluegel(MF, m.g);
      fluegel.push({ ...m, netz: MF.fertig(zeichner)[0] });
    }

    /* Für jedes Tuch ein eigenes bewegliches Gitter – die Ecken werden bei jedem Bild neu
       gerechnet und in den Puffer geschoben. */
    const tuecher = beweglich.fahnen.map((f, i) => {
      const roh = Welt3D.tuchNeu(f.farbe);
      Welt3D.tuchFrisch(roh.e, f.h * 1.7, f.h, 0, i * 1.7);
      return { ...f, phase: i * 1.7, ecken: roh.e, netz: zeichner.netz(roh.e, roh.ix, true), laenge: f.h * 1.7 };
    });

    return {
      gl, welt, bahn, stuecke, himmel, ballNetz, pfeilNetz, pfeilEcken: pfeilRoh.e, tuecher, fluegel,
      licht: welt.licht,
      weg() {
        for (const s of [...stuecke, ...himmel]) s.netz.weg();
        ballNetz.weg(); pfeilNetz.weg();
        for (const t of tuecher) t.netz.weg();
        for (const f of fluegel) f.netz.weg();
      },
    };
  }

  function szeneWeg() { if (szene && szene.weg) szene.weg(); szene = null; }

  /* ---------- Anzeige ---------- */

  function titelSetzen(gross, klein) {
    const t = huelle.querySelector('#g3-titel');
    t.querySelector('b').textContent = gross;
    t.querySelector('i').textContent = klein || '';
  }

  function tafelFrischen() {
    if (schirm !== 'bahn' || !stand.welt) return;
    const b = stand.welt.bahnen[stand.bahnNr];
    const r = rekorde()[stand.welt.id + ':' + stand.bahnNr];
    huelle.querySelector('#g3-bahn').textContent = (stand.bahnNr + 1) + '/' + stand.welt.bahnen.length;
    huelle.querySelector('#g3-schlaege').textContent = stand.schlaege;
    huelle.querySelector('#g3-par').textContent = b.par;
    huelle.querySelector('#g3-rekord').textContent = r === undefined ? '–' : r;
    /* Zu mehreren steht statt des Rekords die Reihe der Mitspieler da: Wer dran ist, steht hell,
       die anderen mit ihrem Stand auf dieser Bahn. Der Rekord gehört ohnehin dem Gerät und nicht
       einem der vier – ihn dort stehen zu lassen, verwirrt nur. */
    const feld = huelle.querySelector('#g3-spieler');
    const rekordFeld = huelle.querySelector('.g3-rekord');
    if (rekordFeld) rekordFeld.hidden = zuMehreren();
    if (feld) {
      feld.hidden = !zuMehreren();
      if (zuMehreren()) feld.innerHTML = stand.spieler.map((p, i) => `
        <span class="g3-spielerchip${i === stand.amZug ? ' dran' : ''}">
          <i style="background:${tonFarbe(p.ton)}"></i>${p.name}
          <b>${i === stand.amZug ? stand.schlaege : (p.karte[stand.bahnNr] === undefined ? '–' : p.karte[stand.bahnNr])}</b>
        </span>`).join('');
    }
  }

  /* ---------- Spielzüge ---------- */

  function schlagen(dx, dz, kraft) {
    stand.letzterOrt = [stand.ball.x, stand.ball.z];
    stand.schlaege++;
    Physik3D.schlag(stand.ball, dx, dz, kraft);
    stand.phase = 'rollt';
    try { if (typeof Sfx !== 'undefined') Sfx.hit(kraft); } catch (e) { /* ohne Ton weiterspielen */ }
    tafelFrischen();
  }

  /* Den Ball wieder hinlegen. Wohin, hängt vom Grund ab:

     Nach Wasser oder Aus kommt er dorthin, wo er die Bahn zuletzt auf gutem Grund berührt hat –
     also ans Ufer beziehungsweise an die Kante. Das ist die Golfregel und zugleich die einzige,
     die nicht in eine Schleife führt: Zurück an die Stelle des Schlages hieße, denselben
     misslungenen Schlag noch einmal versuchen zu müssen.

     Auf Wunsch (der Knopf, die Taste R) geht es an die Stelle vor dem letzten Schlag zurück,
     ohne Strafe – das ist die Hilfe für den Fall, dass der Ball irgendwo unglücklich liegt. */
  function ballZurueck(grund) {
    const b = stand.ball;
    let x, z;
    if (grund === 'wasser' || grund === 'aus') [x, z] = Physik3D.sicherOrt(b, szene.gl);
    else [x, z] = stand.letzterOrt || szene.gl.abschlag;
    stand.ball = Physik3D.ball(szene.gl, x, z);
    stand.phase = 'zielen';
    zumLochDrehen();
    if (grund === 'wasser' || grund === 'aus') { stand.schlaege++; tafelFrischen(); }
  }

  /* Nach jedem Schlag schwenkt die Kamera wieder hinter den Ball und schaut zum Loch. Ohne das
     müsste man nach jedem Schlag erst einmal die Kamera suchen, und weil die Schlagrichtung an
     der Kamera hängt, schlüge man sonst reihenweise in die falsche Richtung. Gedreht wird weich –
     das Nachziehen in kameraFrischen() erledigt das – und nur, wenn der Blick wirklich weit
     danebensteht; wer eben von Hand gedreht hat, soll nicht zurückgerissen werden. */
  function zumLochDrehen() {
    if (!stand.ziel || !stand.ball) return;
    const dx = stand.ziel[0] - stand.ball.x, dz = stand.ziel[1] - stand.ball.z;
    if (Math.hypot(dx, dz) < 0.6) return;
    const soll = Math.atan2(-dx, -dz);
    if (Math.abs(M3.winkelDiff(kamera.zielWinkel, soll)) > 0.25) kamera.zielWinkel = soll;
  }

  function uebersicht() {
    if (schirm !== 'bahn') {
      const w = karteAbstand();
      kamera.zielAbstand = kamera.zielAbstand > w * 0.75 ? w * 0.5 : w;
      return;
    }
    const g = szene.gl;
    kamera.zielAbstand = kamera.zielAbstand > 14 ? 8 : Math.max(g.B, g.T) * 1.15;
    kamera.zielNeigung = kamera.zielAbstand > 14 ? 0.85 : 0.4;
  }

  function rausTaste() {
    if (schirmFeld().className) { schirmWeg(); if (schirm === 'karte') return; }
    if (schirm === 'bahn') { karteZeigen(); if (stand.welt) weltZeigen(stand.welt); return; }
    if (zurueck) beenden();      // von der Weltkarte aus nur, wenn es ein Davor gibt
  }

  /* ---------- Ergebnis einer Bahn ---------- */

  function bahnFertig(abgebrochen = false) {
    const b = stand.welt.bahnen[stand.bahnNr];
    const letzte = stand.bahnNr >= stand.welt.bahnen.length - 1;

    if (zuMehreren()) { zugFertig(b, letzte, abgebrochen); return; }

    const neu = rekordMerken(stand.welt.id, stand.bahnNr, stand.schlaege);
    stand.gesamt[stand.bahnNr] = stand.schlaege;
    schirmZeigen(`<div class="g3-tafel-gross schmal">
      <h2>${symbol('sports_score')} ${ergebnisWort(stand.schlaege, b.par)}</h2>
      <p class="g3-unter">${b.name} – ${stand.schlaege} ${stand.schlaege === 1 ? 'Schlag' : 'Schläge'} bei Par ${b.par}${neu ? ' · neuer Rekord!' : ''}</p>
      ${stand.runde ? rundenTafel(letzte) : ''}
      <p class="g3-reihe">
        ${!letzte && stand.runde ? `<button class="g3-btn" id="g3-weiter">${symbol('arrow_forward')} Nächste Bahn</button>` : ''}
        <button class="g3-btn hell" id="g3-nochmal">${symbol('replay')} Noch einmal</button>
        <button class="g3-btn hell" id="g3-liste">${symbol('golf_course')} Bahnwahl</button>
      </p>
    </div>`);
    beiKlick('g3-weiter', () => bahnStarten(stand.welt, stand.bahnNr + 1, true));
    beiKlick('g3-nochmal', () => bahnStarten(stand.welt, stand.bahnNr, stand.runde));
    beiKlick('g3-liste', () => weltZeigen(stand.welt));
  }

  const ergebnisWort = (schlaege, par) => {
    const d = schlaege - par;
    return schlaege === 1 ? 'Ass!' : d <= -2 ? 'Eagle!' : d === -1 ? 'Birdie!' : d === 0 ? 'Par'
      : d === 1 ? 'Bogey' : d + ' über Par';
  };

  /* Ein Spieler hat die Bahn beendet. Entweder kommt der nächste an den Abschlag, oder die Bahn
     ist für alle vorbei – dann die Zwischentafel, und nach der letzten Bahn der Endstand. */
  function zugFertig(b, letzte, abgebrochen) {
    const ich = stand.spieler[stand.amZug];
    ich.karte[stand.bahnNr] = stand.schlaege;
    const naechster = stand.amZug + 1;
    if (naechster < stand.spieler.length) {
      schirmZeigen(`<div class="g3-tafel-gross schmal">
        <h2>${symbol('sports_score')} ${abgebrochen ? 'Aufgegeben' : ergebnisWort(stand.schlaege, b.par)}</h2>
        <p class="g3-unter">${ich.name}: ${stand.schlaege} ${stand.schlaege === 1 ? 'Schlag' : 'Schläge'} bei Par ${b.par}${abgebrochen ? ' – die Höchstzahl war erreicht' : ''}</p>
        ${standTafel()}
        <p class="g3-reihe">
          <button class="g3-btn" id="g3-naechster">${symbol('arrow_forward')} ${stand.spieler[naechster].name} ist dran</button>
        </p>
      </div>`);
      beiKlick('g3-naechster', () => bahnStarten(stand.welt, stand.bahnNr, true, naechster));
      return;
    }
    // Alle durch: Bahn ausgewertet
    const beste = Math.min(...stand.spieler.map(p => p.karte[stand.bahnNr]));
    const sieger = stand.spieler.filter(p => p.karte[stand.bahnNr] === beste);
    schirmZeigen(`<div class="g3-tafel-gross${letzte ? '' : ' schmal'}">
      <h2>${symbol(letzte ? 'emoji_events' : 'sports_score')} ${letzte ? 'Runde beendet' : 'Bahn ' + (stand.bahnNr + 1) + ' ist durch'}</h2>
      <p class="g3-unter">${letzte ? gesamtSatz() : sieger.map(p => p.name).join(' und ') + (sieger.length > 1 ? ' teilen sich' : ' gewinnt') + ' die Bahn mit ' + beste + (beste === 1 ? ' Schlag' : ' Schlägen')}</p>
      ${standTafel(letzte)}
      <p class="g3-reihe">
        ${letzte ? '' : `<button class="g3-btn" id="g3-weiter">${symbol('arrow_forward')} Bahn ${stand.bahnNr + 2}</button>`}
        <button class="g3-btn hell" id="g3-liste">${symbol('golf_course')} Bahnwahl</button>
      </p>
    </div>`);
    beiKlick('g3-weiter', () => bahnStarten(stand.welt, stand.bahnNr + 1, true, 0));
    beiKlick('g3-liste', () => { alleinSpielen(); weltZeigen(stand.welt); });
  }

  /* Der Satz unter dem Endstand. Er nennt die Sieger beim Namen – eine Tabelle allein sagt nicht,
     wer gewonnen hat, und genau das will man nach neun Bahnen als Erstes wissen. */
  function gesamtSatz() {
    const summe = p => p.karte.reduce((a, v) => a + (v || 0), 0);
    const beste = Math.min(...stand.spieler.map(summe));
    const sieger = stand.spieler.filter(p => summe(p) === beste);
    return sieger.map(p => p.name).join(' und ')
      + (sieger.length > 1 ? ' gewinnen gemeinsam mit ' : ' gewinnt mit ') + beste + ' Schlägen.';
  }

  /* Die Tafel zu mehreren: eine Zeile je Spieler, eine Spalte je Bahn. Sie ist quer scrollbar,
     weil neun Bahnen mal vier Spieler auf einem Telefon nicht in die Breite passen. */
  function standTafel(letzte = false) {
    const w = stand.welt;
    const summe = p => p.karte.reduce((a, v) => a + (v || 0), 0);
    const parSumme = w.bahnen.reduce((a, b) => a + b.par, 0);
    const rang = [...stand.spieler].sort((x, y) => summe(x) - summe(y));
    return `<div class="g3-karte-huelle"><table class="g3-karte">
      <tr><th>Bahn</th>${w.bahnen.map((b, i) => `<th>${i + 1}</th>`).join('')}<th>Σ</th></tr>
      <tr><td>Par</td>${w.bahnen.map(b => `<td>${b.par}</td>`).join('')}<td>${parSumme}</td></tr>
      ${stand.spieler.map(p => `<tr class="ist${letzte && summe(p) === summe(rang[0]) ? ' sieger' : ''}">
        <td><i class="g3-ballpunkt klein" style="background:${tonFarbe(p.ton)}"></i>${p.name}</td>
        ${w.bahnen.map((b, i) => `<td>${p.karte[i] === undefined ? '–' : p.karte[i]}</td>`).join('')}
        <td>${summe(p)}</td></tr>`).join('')}
    </table></div>`;
  }

  function rundenTafel(letzte) {
    const w = stand.welt;
    const gespielt = stand.gesamt.filter(v => v !== undefined);
    const summe = gespielt.reduce((a, b) => a + b, 0);
    const par = w.bahnen.slice(0, gespielt.length).reduce((a, b) => a + b.par, 0);
    const d = summe - par;
    return `<div class="g3-karte-huelle"><table class="g3-karte">
      <tr><th>Bahn</th>${w.bahnen.map((b, i) => `<th>${i + 1}</th>`).join('')}<th>Σ</th></tr>
      <tr><td>Par</td>${w.bahnen.map(b => `<td>${b.par}</td>`).join('')}<td>${w.bahnen.reduce((a, b) => a + b.par, 0)}</td></tr>
      <tr class="ist"><td>Du</td>${w.bahnen.map((b, i) => `<td>${stand.gesamt[i] === undefined ? '–' : stand.gesamt[i]}</td>`).join('')}<td>${summe}</td></tr>
    </table></div>${letzte ? `<p class="g3-unter">Runde beendet: ${summe} Schläge, ${d === 0 ? 'genau Par' : d > 0 ? d + ' über Par' : -d + ' unter Par'}.</p>` : ''}`;
  }

  /* ---------- Kamera ---------- */

  function kameraFrischen(dt) {
    if (schirm === 'bahn' && stand.ball) {
      const b = stand.ball;
      /* Weich nachziehen. Ein Sprung der Kamera auf den Ball macht bei jedem Abprall einen Ruck;
         ein zu träges Nachziehen lässt den Ball aus dem Bild laufen. Der Faktor hier folgt schnell
         genug für einen scharf geschlagenen Ball und ruhig genug fürs Auge. */
      const u = 1 - Math.pow(0.002, dt);
      kamera.zx += (b.x - kamera.zx) * u;
      kamera.zy += (b.y + 0.25 - kamera.zy) * u;
      kamera.zz += (b.z - kamera.zz) * u;
    } else if (schirm === 'karte') {
      kamera.zielWinkel += dt * 0.035;         // die Karte dreht sich langsam von selbst
    }
    const u = 1 - Math.pow(0.004, dt);
    kamera.winkel += M3.winkelDiff(kamera.winkel, kamera.zielWinkel) * u;
    kamera.abstand += (kamera.zielAbstand - kamera.abstand) * u;
    kamera.neigung += (kamera.zielNeigung - kamera.neigung) * u;

    const c = Math.cos(kamera.neigung);
    const auge = [
      kamera.zx + Math.sin(kamera.winkel) * c * kamera.abstand,
      kamera.zy + Math.sin(kamera.neigung) * kamera.abstand,
      kamera.zz + Math.cos(kamera.winkel) * c * kamera.abstand,
    ];
    /* Die Kamera darf nicht unter den Boden geraten – beim Blick bergauf passiert das sonst
       ständig, und man schaut plötzlich von unten durch die Wiese. */
    if (schirm === 'bahn') {
      const boden = szene.gl.hoehe(auge[0], auge[2]) + 0.9;
      if (auge[1] < boden) auge[1] = boden;
    } else {
      const boden = Karte3D.hoehe(auge[0], auge[2]) + 2.5;
      if (auge[1] < boden) auge[1] = boden;
    }
    kamera.auge = auge;
    /* Geschaut wird nicht auf den Ball, sondern ein Stück über ihn hinweg. Das ist der
       Unterschied zwischen einer Überwachungskamera und einer Golfkamera: Zielt man genau auf den
       Ball, liegt er in der Bildmitte und darüber ist nur Wiese. Hebt man den Blickpunkt, rutscht
       der Ball ins untere Drittel, und darüber steht, wohin er soll – Loch, Bäume, Burg, Himmel. */
    const versatz = schirm === 'bahn' ? kamera.abstand * 0.22 : 0;
    kamera.sicht = M3.blick(auge, [kamera.zx, kamera.zy + versatz, kamera.zz], [0, 1, 0]);
    kamera.proj = M3.perspektive(sichtWinkel(), seitenVerhaeltnis(), 0.12, FERN);
  }

  /* Der Öffnungswinkel wird senkrecht angegeben – auf einem hochkant gehaltenen Telefon sieht man
     dadurch waagerecht viel zu wenig. Er wird deshalb für schmale Bilder aufgezogen, aber nur bis
     zu einer Grenze: Ein senkrechter Winkel über etwa 65 Grad verzerrt die Ränder so stark, dass
     die Landschaft nach außen auseinanderläuft. Was der Winkel allein nicht schafft, erledigt bei
     der Weltkarte der Abstand (siehe karteAbstand). */
  const seitenVerhaeltnis = () => zeichner.breite / Math.max(1, zeichner.hoehe);
  function sichtWinkel() {
    const seite = seitenVerhaeltnis();
    const grund = schirm === 'karte' ? 0.72 : 0.88;
    const mindestensQuer = schirm === 'karte' ? 1.05 : 1.00;
    let w = grund;
    if (2 * Math.atan(Math.tan(w / 2) * seite) < mindestensQuer) {
      w = Math.min(1.15, 2 * Math.atan(Math.tan(mindestensQuer / 2) / seite));
    }
    return w;
  }

  /* Wie weit muss die Kamera von der Weltkarte weg, damit die Insel ins Bild passt? Maßgeblich ist
     die engere der beiden Richtungen – auf einem hochkanten Schirm die Breite, auf einem breiten
     die Höhe. */
  function karteAbstand() {
    const seite = seitenVerhaeltnis(), w = sichtWinkel();
    const quer = 2 * Math.atan(Math.tan(w / 2) * seite);
    return M3.klemm(Karte3D.WEIT * 0.68 / Math.tan(Math.min(quer, w) / 2), 50, 230);
  }

  /* Richtung „vom Betrachter weg", flach auf den Boden gelegt. Daraus wird die Schlagrichtung. */
  function kameraVorn() {
    const s = Math.sin(kamera.winkel), c = Math.cos(kamera.winkel);
    return [-s, -c];                    // vom Auge zum Ziel, in X/Z
  }

  /* Wie nah und wie weit darf die Kamera? Auf der Karte hängt beides am Abstand, bei dem die
     Insel gerade ins Bild passt – auf einem schmalen Schirm ist das weiter weg als auf einem
     breiten, und dann müssen auch die Grenzen mitwandern. */
  const zoomBereich = () => schirm === 'karte' ? [karteAbstand() * 0.32, karteAbstand() * 1.9] : [3, 70];

  /* ---------- Eingabe ---------- */

  let zug = null, zeigerAnzahl = 0, zweiFinger = null;
  const zeiger = new Map();

  function bedienungAnhaengen() {
    leinwand.style.touchAction = 'none';

    /* Die Berührung auf der Leinwand gehört uns – und das muss ausdrücklich gesagt werden.
       'touch-action: none' allein reicht dem iPhone und dem iPad nicht: Wer die Seite in einem
       Vorschaufenster öffnet (aus einer App heraus, etwa aus dem Chat), kann dieses Fenster mit
       einer Wischbewegung nach unten wegschieben – und genau das ist unsere Zielbewegung. Fynn
       zog vom Ball nach unten, um Kraft aufzuladen, und das halbe Spiel verschwand.

       Der Griff ist derselbe wie im 2,5D-Spiel: Berührungen, die auf der Leinwand beginnen oder
       zu einem laufenden Zug gehören, werden abgefangen. Alles andere – Knöpfe, Bildschirme,
       eine Bahnliste, die gerollt werden will – bleibt unberührt. */
    const sperren = e => { if (zug || e.target === leinwand) e.preventDefault(); };
    document.addEventListener('touchstart', sperren, { passive: false });
    document.addEventListener('touchmove', sperren, { passive: false });
    // Auf- und Zuziehen mit zwei Fingern zoomt sonst die ganze Seite statt der Kamera
    document.addEventListener('gesturestart', e => e.preventDefault(), { passive: false });

    leinwand.addEventListener('pointerdown', e => {
      leinwand.setPointerCapture(e.pointerId);
      zeiger.set(e.pointerId, [e.clientX, e.clientY]);
      zeigerAnzahl = zeiger.size;
      if (zeigerAnzahl === 2) { zug = null; zweiFinger = fingerMass(); return; }
      if (e.button === 2 || schirm === 'karte' || stand.phase !== 'zielen' || schirmFeld().className) {
        zug = { art: 'kamera', x: e.clientX, y: e.clientY, id: e.pointerId };
      } else {
        zug = { art: 'zielen', x: e.clientX, y: e.clientY, id: e.pointerId, dx: 0, dz: 0, kraft: 0 };
        try { if (typeof Sfx !== 'undefined') Sfx.unlock(); } catch (err) { /* ohne Ton weiter */ }
      }
    });

    leinwand.addEventListener('pointermove', e => {
      if (!zeiger.has(e.pointerId)) return;
      zeiger.set(e.pointerId, [e.clientX, e.clientY]);
      if (zeiger.size === 2) { zweiFingerZug(); return; }
      if (!zug || zug.id !== e.pointerId) return;
      if (zug.art === 'kamera') {
        kamera.zielWinkel += (e.clientX - zug.x) * 0.007;
        kamera.zielNeigung = M3.klemm(kamera.zielNeigung + (e.clientY - zug.y) * 0.005, 0.12, 1.35);
        zug.x = e.clientX; zug.y = e.clientY;
        return;
      }
      /* Zielen: Der Zug auf dem Schirm wird über die Kamera in die Welt gedreht. Nach unten ziehen
         heißt von sich weg schlagen, nach rechts ziehen heißt nach links schlagen – genau wie beim
         Zurückziehen eines Schlägers. */
      const zx = e.clientX - zug.x, zy = e.clientY - zug.y;
      const laenge = Math.hypot(zx, zy);
      if (laenge < 6) { zug.kraft = 0; return; }
      const [vx, vz] = kameraVorn();
      const rx = -vz, rz = vx;                        // rechts = vorn nach rechts gedreht
      let sx = zy * vx - zx * rx, sz = zy * vz - zx * rz;
      const l = Math.hypot(sx, sz) || 1;
      zug.dx = sx / l; zug.dz = sz / l;
      zug.kraft = Math.min(1, laenge / MAX_ZIEHEN);
    });

    const ende = (e, abbruch) => {
      zeiger.delete(e.pointerId);
      zeigerAnzahl = zeiger.size;
      if (zeiger.size < 2) zweiFinger = null;
      if (!zug || zug.id !== e.pointerId) return;
      const z = zug; zug = null;
      if (abbruch || z.art !== 'zielen') return;
      if (z.kraft > 0.05 && stand.phase === 'zielen') schlagen(z.dx, z.dz, z.kraft);
    };
    leinwand.addEventListener('pointerup', e => ende(e, false));
    leinwand.addEventListener('pointercancel', e => ende(e, true));
    leinwand.addEventListener('contextmenu', e => e.preventDefault());
    leinwand.addEventListener('wheel', e => {
      e.preventDefault();
      kamera.zielAbstand = M3.klemm(kamera.zielAbstand * (1 + Math.sign(e.deltaY) * 0.12), ...zoomBereich());
    }, { passive: false });

    document.addEventListener('keydown', taste);
  }

  const fingerMass = () => {
    const [a, b] = [...zeiger.values()];
    return { d: Math.hypot(a[0] - b[0], a[1] - b[1]), mx: (a[0] + b[0]) / 2 };
  };
  function zweiFingerZug() {
    const jetzt = fingerMass();
    if (!zweiFinger) { zweiFinger = jetzt; return; }
    if (jetzt.d > 10 && zweiFinger.d > 10) {
      kamera.zielAbstand = M3.klemm(kamera.zielAbstand * (zweiFinger.d / jetzt.d), ...zoomBereich());
    }
    kamera.zielWinkel += (jetzt.mx - zweiFinger.mx) * 0.006;
    zweiFinger = jetzt;
  }

  function taste(e) {
    if (!laeuft) return;
    if (e.target && /input|textarea/i.test(e.target.tagName)) return;
    switch (e.key.toLowerCase()) {
      case 'escape': rausTaste(); break;
      case 'q': kamera.zielWinkel -= 0.35; break;
      case 'e': kamera.zielWinkel += 0.35; break;
      case 'm': uebersicht(); break;
      case 'r': if (schirm === 'bahn' && stand.phase === 'zielen') ballZurueck('wunsch'); break;
      case '+': kamera.zielAbstand = Math.max(zoomBereich()[0], kamera.zielAbstand * 0.85); break;
      case '-': kamera.zielAbstand = Math.min(zoomBereich()[1], kamera.zielAbstand * 1.18); break;
      default: return;
    }
    e.preventDefault();
  }

  /* ---------- Die Bildschleife ---------- */

  function bild(jetzt) {
    if (!laeuft) return;
    bildNr = requestAnimationFrame(bild);
    const dt = Math.min(0.05, (jetzt - letzte) / 1000 || 0);
    letzte = jetzt; zeit += dt;

    const r = huelle.getBoundingClientRect();
    zeichner.groesse(r.width, r.height, 2);

    if (schirm === 'bahn' && stand.ball) spielSchritt(dt);
    kameraFrischen(dt);

    const stuecke = zeichnenVorbereiten();
    zeichner.bild(stuecke, kamera, zeit);

    if (schirm === 'karte') markenNachfuehren();
    if (stand.meldungBis && zeit > stand.meldungBis) {
      huelle.querySelector('#g3-hinweis').classList.remove('sichtbar');
      stand.meldungBis = 0;
    }
  }

  function spielSchritt(dt) {
    const b = stand.ball;
    if (stand.phase === 'rollt') {
      const ereignisse = Physik3D.bewegen(b, szene.gl, stand.ziel, dt);
      for (const ev of ereignisse) {
        if (ev.was === 'prall' && ev.kraft > 1.2) schall('bounce');
        else if (ev.was === 'platsch') schall('water');
        else if (ev.was === 'ein') schall('sink');
      }
      if (b.ruht) {
        /* Der Ball liegt jetzt unten im Becher – der Fall selbst ist schon vorbei, als 'ruht'
           gesetzt wird. Eine halbe Sekunde bleibt er noch liegen, damit man ihn dort sieht, bevor
           die Ergebnistafel darüberfährt. */
        if (b.ein) { stand.phase = 'fertig'; setTimeout(() => { if (laeuft && schirm === 'bahn') bahnFertig(); }, 900); return; }
        if (b.wasser) { meldung('Ins Wasser – ein Schlag Strafe, weiter geht es vom Ufer.'); ballZurueck('wasser'); return; }
        const art = szene.gl.art(b.x, b.z);
        if (art.aus) { schall('oob'); meldung('Aus – ein Schlag Strafe, weiter geht es an der Kante.'); ballZurueck('aus'); return; }
        stand.phase = 'zielen';
        zumLochDrehen();
        tafelFrischen();
        if (zuMehreren() && stand.schlaege >= hoechstZahl(stand.welt.bahnen[stand.bahnNr].par)) {
          stand.phase = 'fertig';
          meldung('Höchstzahl erreicht – der Nächste ist dran.');
          setTimeout(() => { if (laeuft && schirm === 'bahn') bahnFertig(true); }, 900);
        }
      }
    }
    /* Der Schattenwurf folgt dem Ball. Ein Schattenbild, das die ganze Bahn umfasst, wäre auf
       einem Telefon so grob, dass der Ballschatten zu einem Klotz zerfiele. */
    zeichner.schattenMitte = [b.x, b.y, b.z];
    zeichner.schattenWeite = M3.klemm(kamera.abstand * 1.1, 9, 26);

    const balken = huelle.querySelector('#g3-kraft');
    const zielen = zug && zug.art === 'zielen' && zug.kraft > 0;
    balken.classList.toggle('sichtbar', !!zielen);
    if (zielen) balken.firstElementChild.style.width = Math.round(zug.kraft * 100) + '%';
  }

  function zeichnenVorbereiten() {
    const raus = [];
    /* Der Himmel wandert mit der Kamera mit: Er ist immer gleich weit weg, egal wohin man geht.
       Gezeichnet wird er zuerst, damit alles andere davor liegt. */
    for (const h of szene.himmel || []) {
      h.modell = M3.mult(M3.verschieben(kamera.auge[0], kamera.auge[1], kamera.auge[2]), M3.skalieren(FERN * 0.62));
      raus.push(h);
    }
    for (const s of szene.stuecke) raus.push(s);

    if (schirm === 'bahn') {
      const b = stand.ball;
      /* Der Ball dreht sich beim Rollen. Erst drehen, dann verschieben – umgekehrt liefe er um
         den Nullpunkt der Welt statt um sich selbst. */
      let m = M3.verschieben(b.x, b.y, b.z);
      m = M3.mult(m, M3.drehenX(b.drehX), m);
      m = M3.mult(m, M3.drehenZ(b.drehZ), m);
      const ich = amZug();
      raus.push({ netz: szene.ballNetz, modell: m, ton: ich ? ich.ton : undefined });

      if (zug && zug.art === 'zielen' && zug.kraft > 0.02 && stand.phase === 'zielen') {
        const laenge = 0.9 + zug.kraft * 4.2;
        szene.pfeilNetz.frisch(Welt3D.pfeilFrisch(szene.pfeilEcken, szene.gl, b.x, b.z, zug.dx, zug.dz, laenge));
        /* Ohne Licht gezeichnet: Der Pfeil ist eine Anzeige, kein Gegenstand – er soll im Schatten
           genauso deutlich sein wie in der Sonne. Die Einfärbung wandert mit der Kraft von blass
           nach glühend. */
        raus.push({ netz: szene.pfeilNetz, wirftSchatten: false, licht: false,
          ton: [0.7 + zug.kraft * 0.3, 0.72 - zug.kraft * 0.12, 0.62 - zug.kraft * 0.4] });
      }

      for (const t of szene.tuecher) {
        t.netz.frisch(Welt3D.tuchFrisch(t.ecken, t.laenge, t.h, zeit, t.phase));
        /* Die Fahne dreht sich langsam mit dem Wind – sonst steht sie wie angeklebt in eine
           Richtung, und das fällt bei drei Fahnen nebeneinander sofort auf. */
        const w = Math.sin(zeit * 0.23 + t.phase) * 0.5 + 1.1;
        raus.push({ netz: t.netz, modell: M3.mult(M3.verschieben(t.x, t.y, t.z), M3.drehenY(w)), wirftSchatten: false });
      }
      for (const f of szene.fluegel) {
        let m = M3.verschieben(f.x, f.y, f.z);
        m = M3.mult(m, M3.drehenY(f.dreh), m);
        m = M3.mult(m, M3.drehenZ(zeit * f.tempo), m);
        raus.push({ netz: f.netz, modell: m });
      }
    }
    return raus;
  }

  /* Die Ortsschilder über der Karte an ihre Stelle rücken. Gerechnet wird wie beim Zeichnen –
     Weltpunkt durch Sicht- und Projektionsmatrix – und das Ergebnis auf Bildpunkte umgelegt.
     Was hinter der Kamera liegt, wird versteckt. */
  function markenNachfuehren() {
    const r = huelle.getBoundingClientRect();
    const mvp = M3.mult(kamera.proj, kamera.sicht, new Float32Array(16));
    const knoepfe = huelle.querySelectorAll('#g3-marken [data-welt]');
    knoepfe.forEach(el => {
      const m = szene.marken.find(x => x.id === el.dataset.welt);
      if (!m) return;
      const x = m.x, y = m.y, z = m.z;
      const cx = mvp[0] * x + mvp[4] * y + mvp[8] * z + mvp[12];
      const cy = mvp[1] * x + mvp[5] * y + mvp[9] * z + mvp[13];
      const cw = mvp[3] * x + mvp[7] * y + mvp[11] * z + mvp[15];
      if (cw <= 0.01) { el.style.visibility = 'hidden'; return; }
      el.style.visibility = 'visible';
      /* Am Bildrand wird das Schild hereingezogen, statt halb hinauszuragen. Ein Schild, das man
         nur zur Hälfte sieht, kann man auch nur zur Hälfte antippen – und auf einem schmalen
         Schirm steht die Hälfte der Welten am Rand. */
      const halbB = el.offsetWidth / 2 + 6, hochH = el.offsetHeight + 6;
      el.style.left = M3.klemm(((cx / cw) * 0.5 + 0.5) * r.width, halbB, r.width - halbB) + 'px';
      el.style.top = M3.klemm((0.5 - (cy / cw) * 0.5) * r.height, hochH, r.height - 10) + 'px';
      /* Auf einem schmalen Schirm rücken die Schilder übereinander. Dann soll wenigstens das
         vordere oben liegen – sonst verdeckt ein Berg im Hintergrund die Wiese davor. */
      el.style.zIndex = String(M3.klemm(999 - Math.round(cw), 1, 999));
    });
  }

  /* ---------- An und aus ---------- */

  function starten(zurueckRuf) {
    zurueck = zurueckRuf;
    if (!huelle) huelleBauen();
    huelle.hidden = false;

    if (!zeichner) {
      const r = huelle.getBoundingClientRect();
      leinwand.width = Math.max(1, Math.round(r.width)); leinwand.height = Math.max(1, Math.round(r.height));
      zeichner = GL3D.start(leinwand);
      if (!zeichner) {
        fehlerText = true;
        schirmZeigen(`<div class="g3-tafel-gross schmal">
          <h2>${symbol('close')} Kein 3D möglich</h2>
          <p class="g3-unter">Dieser Browser kann kein WebGL – damit lässt sich die 3D-Welt nicht
          zeichnen. Das 2,5D-Spiel läuft davon unberührt weiter.</p>
          <p class="g3-reihe"><button class="g3-btn" id="g3-weg">${symbol('arrow_back')} Zurück</button></p>
        </div>`);
        beiKlick('g3-weg', beenden);
        laeuft = true;
        return;
      }
    }
    laeuft = true; letzte = performance.now(); zeit = 0;
    /* Erst die Größe bestimmen, dann die Karte bauen: Der Kameraabstand hängt am Bildformat, und
       vor dem ersten Bild weiß der Zeichner noch nicht, wie groß er ist. */
    const r0 = huelle.getBoundingClientRect();
    zeichner.groesse(r0.width, r0.height, 2);
    karteZeigen();
    bildNr = requestAnimationFrame(bild);
  }

  function beenden() {
    laeuft = false;
    if (bildNr) cancelAnimationFrame(bildNr);
    szeneWeg();
    if (huelle) { huelle.hidden = true; schirmWeg(); }
    if (zurueck) zurueck();
  }

  return {
    starten, beenden, aktiv: () => laeuft, fehler: () => fehlerText,
    /* Eine Tür nach innen, für die Fehlersuche und für die Bildaufnahmen der Prüfskripte. Von
       außen wird hier nichts gesetzt – wer hineinschaut, sieht nur zu. Das 2,5D-Spiel hat mit
       window.__golfDebug dieselbe Einrichtung. */
    innen: () => ({ zeichner, szene, stand, kamera, schirm }),
  };
})();
