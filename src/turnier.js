/* Turnier: ein Wettbewerb auf Zeit in der Kolosseum-Welt.

   Anders als die Rangliste, die für immer läuft und je Bahn nur den einen Rekord kennt, ist das
   Turnier ein Ereignis mit Anfang und Ende. Gewertet wird die Kombi-Wertung – Schläge plus
   angefangene Minuten –, weil sie beides verlangt: ruhig spielen und zügig sein.

   Drei Zustände, an denen sich alles ausrichtet:
   - vor dem Start:  auf der Weltkarte und im Startbildschirm steht, wann es losgeht.
   - während:        Ergebnisse werden angenommen, die Restlaufzeit läuft sichtbar mit.
   - nach dem Ende:  die Rangliste bleibt stehen und wird als beendet gekennzeichnet.
                     Neue Ergebnisse nimmt niemand mehr an.

   Warum je Spieler eine eigene aufbewahrte Nachricht und nicht eine gemeinsame Tafel wie bei der
   Rangliste: Dort zählt nur der eine Rekord je Bahn, hier soll ein Feld entstehen – Erster,
   Zweiter, Dritter. Dafür braucht jeder Teilnehmer seinen eigenen Platz beim Vermittler, sonst
   würde ein Eintrag den anderen überschreiben.

   Jedes Ergebnis trägt seinen Zeitstempel. Beim Anzeigen fliegt alles raus, was außerhalb des
   Fensters liegt – ob durch eine falsch gestellte Uhr oder durch einen Nachzügler, der nach dem
   Schlusspfiff noch etwas schickt.

   Wie überall im Spiel gilt: Niemand rechnet nach. Jedes Gerät meldet sein Ergebnis selbst. Das
   Turnier ist ein Wettbewerb unter Freunden, kein Schiedsrichter. */
const Turnier = (() => {

  /* ---------- Zeitfenster ----------
     Anfang und Ende des Turniers. Zum Verschieben genügt es, diese beiden Zeilen zu ändern –
     alles andere richtet sich danach: der Hinweis vor dem Start, die Restlaufzeit, die Annahme
     von Ergebnissen und die Kennzeichnung als beendet.

     Geschrieben mit Zeitzone, damit auf jedem Gerät derselbe Moment gemeint ist: +02:00 ist
     deutsche Sommerzeit, im Winter +01:00. */
  const START = Date.parse('2026-09-08T18:00:00+02:00');
  const ENDE  = Date.parse('2026-09-30T22:00:00+02:00');

  /* Die Welt, in der das Turnier ausgetragen wird */
  const WELT = 'colosseum';

  /* ---------- Themen beim Vermittler ----------
     Eigener Zweig, getrennt von der Rangliste und vom Spielraum. Die Kennung des Turniers steckt
     im Thema, damit ein späteres Turnier nicht die Einträge des vorigen einsammelt. */
  const KENNUNG = 't' + START;
  const THEMA = id => `fantasygolf/v1/${APP_MARKE}/turnier/${KENNUNG}/e/${id}`;
  const FILTER = `fantasygolf/v1/${APP_MARKE}/turnier/${KENNUNG}/e/+`;

  /* Grenzen für alles, was von fremden Geräten hereinkommt */
  const MAX_SPIELER = 200;      // mehr Teilnehmer nimmt die Anzeige nicht auf
  const MAX_BAHNEN = 40;        // eine Welt hat keine vierzig Bahnen
  const MIN_MS_BAHN = 2000, MIN_MS_RUNDE = 10000;   // schneller geht es nicht mit rechten Dingen
  const MAX_SCHLAEGE = 999;

  const K_ICH = speicherSchluessel('turnierich');     // eigene Kennung, bleibt am Gerät
  const K_DATEN = speicherSchluessel('turnier.' + KENNUNG);

  const load = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const save = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* kein Speicher */ } };

  /* Eigene Kennung: einmal gewürfelt und dann behalten. Ohne sie käme bei jedem Laden ein neuer
     Eintrag dazu, statt den eigenen zu verbessern. */
  let ich = String(load(K_ICH, '') || '').replace(/[^a-z0-9]/g, '').slice(0, 16);
  if (!ich) {
    ich = Array.from({ length: 12 }, () => 'abcdefghijklmnopqrstuvwxyz0123456789'[Math.floor(Math.random() * 36)]).join('');
    save(K_ICH, ich);
  }

  let feld = {};                         // Kennung -> Eintrag
  let onChange = null, watching = '';

  /* Was im Browser liegt, geht durch dieselbe Prüfung wie das, was über das Netz kommt. Der
     Speicher überlebt Fassungswechsel und lässt sich von Hand ändern – ihm blind zu glauben wäre
     dieselbe Nachlässigkeit. Aufgerufen wird das ganz unten, wenn die Prüfung dasteht. */
  function ladeFeld() {
    const roh = load(K_DATEN, {}) || {};
    const out = {};
    for (const [kennung, e] of Object.entries(roh)) {
      if (!/^[a-z0-9]{1,16}$/.test(kennung)) continue;
      const geprueft = pruefeEintrag(e);
      if (geprueft) out[kennung] = geprueft;
    }
    return out;
  }

  /* ---------- Zustand ---------- */
  const jetzt = () => Date.now();
  const zustand = () => jetzt() < START ? 'vor' : jetzt() <= ENDE ? 'laeuft' : 'vorbei';
  const laeuft = () => zustand() === 'laeuft';
  /* Liegt ein Zeitstempel im Turnierfenster? Danach wird die Anzeige aussortiert. */
  const imFenster = ts => !!ts && ts >= START && ts <= ENDE;

  /* ---------- Prüfen, was hereinkommt ----------
     Dieselbe Haltung wie bei der Rangliste: Alles Fremde wird auf die erlaubte Form gebracht,
     statt ihm zu glauben. Was nicht passt, fällt weg. */
  /* Der Zeitstempel wird ausdrücklich NICHT auf „jetzt" gekappt, wie es die Rangliste tut.
     Dort schützt die Kappung davor, dass ein Eintrag aus der Zukunft jedes Zurücksetzen
     überlebt. Hier wäre sie ein Eigentor: Sie schöbe einen Nachzügler von hinter dem
     Schlusspfiff genau ins Fenster hinein und hebelte damit die Aussortierung aus. Ein
     Zeitstempel außerhalb des Fensters bleibt außerhalb – und fällt in der Anzeige weg. */
  function pruefeWert(r) {
    if (!r || typeof r !== 'object') return null;
    const s = +r.s, st = +r.st, ms = +r.ms, ts = +r.ts;
    if (!(s > 0) || !(st > 0) || st > MAX_SCHLAEGE || !(ms >= 0)) return null;
    if (!(ts > 0) || !isFinite(ts)) return null;
    return { s: Math.round(s * 10) / 10, st: Math.round(st), ms: Math.round(ms), ts: Math.round(ts) };
  }
  function pruefeEintrag(e) {
    if (!e || typeof e !== 'object') return null;
    const n = Text.name(e.n);
    if (!n) return null;
    const out = { n, ts: Math.round(+e.ts) || 0, h: {} };
    const runde = pruefeWert(e.r);
    if (runde) out.r = runde;
    let zahl = 0;
    for (const [bahn, wert] of Object.entries(e.h || {})) {
      if (zahl >= MAX_BAHNEN) break;
      const name = Text.label(bahn), w = pruefeWert(wert);
      if (name && w) { out.h[name] = w; zahl++; }
    }
    if (!out.r && !Object.keys(out.h).length) return null;   // leerer Eintrag bringt nichts
    return out;
  }

  /* ---------- Anzeige ----------
     Gibt das Feld so zurück, wie es auf die Tafel soll: die Runden nach Kombi sortiert, dazu je
     Bahn der beste Wert. Einträge mit Zeitstempel außerhalb des Fensters kommen nicht vor. */
  function rangliste() {
    const runde = [], bahnen = {};
    for (const [kennung, e] of Object.entries(feld)) {
      if (!e || !e.n) continue;
      if (e.r && imFenster(e.r.ts)) runde.push({ n: e.n, s: e.r.s, st: e.r.st, ms: e.r.ms, ts: e.r.ts, ich: kennung === ich });
      for (const [bahn, w] of Object.entries(e.h || {})) {
        if (!imFenster(w.ts)) continue;
        const alt = bahnen[bahn];
        // Kleiner gewinnt; bei Gleichstand bleibt der ältere Eintrag vorn
        if (!alt || w.s < alt.s || (w.s === alt.s && w.ts < alt.ts)) bahnen[bahn] = { n: e.n, s: w.s, st: w.st, ms: w.ms, ts: w.ts, ich: kennung === ich };
      }
    }
    runde.sort((a, b) => a.s - b.s || a.ts - b.ts);
    return { runde: runde.slice(0, MAX_SPIELER), bahnen };
  }

  /* ---------- Eigenes Ergebnis ---------- */
  const meinEintrag = () => feld[ich] || null;
  function veroeffentliche() {
    const e = feld[ich];
    if (!e) return;
    save(K_DATEN, feld);
    Net.pub(THEMA(ich), e, true);
  }
  /* Einen Wert eintragen, wenn er den eigenen bisherigen schlägt. Gibt zurück, ob es besser war. */
  function besser(neu, alt) { return !alt || neu.s < alt.s; }
  function eintragen(bahn, schlaege, ms) {
    // Nur während des Turniers, nur mit Namen, nur im Wettkampf – das prüft der Aufrufer mit
    if (!laeuft()) return null;
    const name = typeof Best !== 'undefined' ? Best.name : '';
    if (!name || !(schlaege > 0) || schlaege > MAX_SCHLAEGE) return null;
    if (!(ms >= (bahn ? MIN_MS_BAHN : MIN_MS_RUNDE))) return null;
    const bn = bahn ? Text.label(bahn) : null;
    if (bahn && !bn) return null;
    const ts = jetzt();
    const wert = { s: Best.combo(schlaege, ms), st: schlaege, ms, ts };
    const alt = feld[ich] || null;
    if (!besser(wert, bn ? (alt && alt.h[bn]) : (alt && alt.r))) return null;
    const e = alt || (feld[ich] = { n: name, ts, h: {} });
    e.n = name; e.ts = ts;
    if (bn) e.h[bn] = wert; else e.r = wert;
    veroeffentliche();
    if (onChange) onChange();
    return wert;
  }

  /* ---------- Netz ---------- */
  function onNet(msg, topic) {
    const kennung = String(topic || '').split('/').pop();
    if (!kennung || !/^[a-z0-9]{1,16}$/.test(kennung)) return;
    if (kennung === ich) return;                       // der eigene Stand ist schon da
    if (!feld[kennung] && Object.keys(feld).length >= MAX_SPIELER) return;
    const e = pruefeEintrag(msg);
    if (!e) { if (feld[kennung]) { delete feld[kennung]; save(K_DATEN, feld); if (onChange) onChange(); } return; }
    feld[kennung] = e;
    save(K_DATEN, feld);
    if (onChange) onChange();
  }

  /* ---------- Restlaufzeit ----------
     „noch 3 Tage 4 Std." und zum Schluss sekundengenau, damit die letzte Minute spannend wird. */
  function restText() {
    if (zustand() !== 'laeuft') return '';
    let s = Math.max(0, Math.floor((ENDE - jetzt()) / 1000));
    const tage = Math.floor(s / 86400); s -= tage * 86400;
    const std = Math.floor(s / 3600); s -= std * 3600;
    const min = Math.floor(s / 60); s -= min * 60;
    if (tage) return `noch ${tage} ${tage === 1 ? 'Tag' : 'Tage'} ${std} Std.`;
    if (std) return `noch ${std} Std. ${min} Min.`;
    if (min) return `noch ${min} Min. ${String(s).padStart(2, '0')} Sek.`;
    return `noch ${s} Sek.`;
  }
  const datumText = ms => new Date(ms).toLocaleString('de-DE',
    { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) + ' Uhr';

  feld = ladeFeld();

  return {
    START, ENDE, WELT, KENNUNG,
    zustand, imFenster, rangliste,
    get laeuft() { return laeuft(); },
    get startText() { return datumText(START); },
    get endeText() { return datumText(ENDE); },
    restText,
    /* Wie viele machen mit – für die Anzeige */
    get teilnehmer() { return rangliste().runde.length; },
    meinEintrag,

    /* Ergebnis einer Bahn einreichen. Gibt den eingetragenen Wert zurück oder null. */
    bahn: (bahnName, schlaege, ms) => eintragen(bahnName, schlaege, ms),
    /* Ergebnis einer ganzen Runde einreichen */
    runde: (schlaege, ms) => eintragen(null, schlaege, ms),

    onChange(fn) { onChange = fn; },
    /* Verbindung aufbauen und das Turnierfeld abonnieren */
    start(handlers) {
      Net.connect(handlers || {});
      if (watching !== FILTER) {
        // Die aufbewahrten Einträge der anderen sollen mitkommen
        Net.sub(FILTER, onNet, { skipSelf: false });
        watching = FILTER;
      }
      // eigenen Stand einmal anbieten, damit neue Geräte ihn bekommen
      if (feld[ich]) setTimeout(veroeffentliche, 1400);
    },
    stop() { if (watching) { Net.unsub(watching); watching = ''; } },
  };
})();
