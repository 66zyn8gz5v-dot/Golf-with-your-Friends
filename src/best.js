/* Bestenliste: geteilt über alle Geräte eines Freundeskreises, in drei Wertungen.

   - Schläge: wer braucht die wenigsten? Die klassische Golfwertung.
   - Zeit:    wie lange dauert eine Bahn? Gemessen wird ab dem Aufsetzen des Balls bis zum
              Einlochen; Pausen im Menü zählen nicht mit.
   - Kombi:   beides zusammen, gerechnet wie beim Speedgolf: Schläge + angefangene Minuten als
              Dezimalzahl. Vier Schläge in 1:12 ergeben 4 + 1,2 = 5,2. Wer trödelt, verliert –
              wer wild drauflos schlägt, aber auch.

   Es gibt keinen eigenen Server, deshalb liegen die Rekorde als „aufbewahrte" MQTT-Nachrichten
   beim Vermittler: eine Nachricht mit Retain-Bit bleibt dort liegen und wird jedem zugestellt,
   der später zuhört. Wer die Seite öffnet, bekommt also sofort den aktuellen Stand, und wer
   während des Spielens einen Rekord bricht, erscheint bei den anderen sofort.

   Alle, die das Spiel haben, teilen sich eine Liste – es ist ja nicht öffentlich, sondern läuft
   im Freundeskreis. Zusätzlich hält jedes Gerät eine eigene Kopie im Browser, damit die Rekorde
   auch ohne Verbindung sichtbar sind und nicht verloren gehen, wenn der Vermittler neu startet.

   Aufbau je Welt: { strokes: KAT, time: KAT, combo: KAT }
   mit KAT = { holes: { Bahnname: EINTRAG }, round: EINTRAG }
   und EINTRAG = { s, n, t, st?, ms? }
   s  = der gewertete Wert (Schläge, Millisekunden oder Kombi-Punkte)
   n  = Name, t = Zeitpunkt des Eintrags
   st, ms = Schläge und Millisekunden, aus denen ein Kombi-Wert entstanden ist (nur zur Anzeige)

   Kleiner ist überall besser; bei Gleichstand gewinnt der ältere Eintrag, damit ein Rekord nicht
   ständig den Besitzer wechselt. */
const Best = (() => {
  const TOPIC = world => `fantasygolf/v1/best/all/${world}`;
  const FILTER = 'fantasygolf/v1/best/all/+';
  const KINDS = ['strokes', 'time', 'combo'];
  /* Namen kommen von fremden Geräten. Sie landen in der Anzeige, darum hier kürzen und alles
     entfernen, was in HTML eine Bedeutung hätte – ein Name ist ein Name, kein Markup. */
  function cleanName(v) { return String(v == null ? '' : v).replace(/[<>&"']/g, '').slice(0, 14).trim(); }

  const load = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const save = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* kein Speicher */ } };

  let name = cleanName(load('fantasygolf.name', ''));
  let data = migrate(load('fantasygolf.best', {}) || {});   // Welt-Kennung -> Rekorde
  let onChange = null, watching = '';

  /* Bis zur Zeitwertung gab es nur Schläge: { holes, round } ohne Kategorie. Solche Stände –
     aus dem Browser oder von einem Gerät mit älterem Spielstand – werden hier eingereiht. */
  function cleanRec(r) {
    if (!r || !r.s) return null;
    const out = { s: +r.s, n: cleanName(r.n), t: +r.t || 0 };
    if (r.st != null) out.st = +r.st;
    if (r.ms != null) out.ms = +r.ms;
    return out;
  }
  function cleanHoles(h) {
    const out = {};
    for (const [k, v] of Object.entries(h || {})) { const r = cleanRec(v); if (r) out[String(k).slice(0, 40)] = r; }
    return out;
  }
  function shape(w) {
    const out = {};
    for (const k of KINDS) {
      const src = w && w[k];
      out[k] = { holes: cleanHoles(src && src.holes), round: cleanRec(src && src.round) };
    }
    if (w && (w.holes || w.round)) {          // alte Form: das waren Schläge
      out.strokes.holes = Object.assign(cleanHoles(w.holes), out.strokes.holes);
      out.strokes.round = out.strokes.round || cleanRec(w.round);
    }
    return out;
  }
  function migrate(all) {
    const out = {};
    for (const [id, w] of Object.entries(all || {})) out[id] = shape(w);
    return out;
  }

  const world = id => (data[id] = data[id] || shape(null));
  const better = (a, b) => !b || !b.s ? !!(a && a.s) : !!(a && a.s && (a.s < b.s || (a.s === b.s && (a.t || 0) < (b.t || 0))));
  /* Kombi wie beim Speedgolf: Schläge plus Minuten, auf eine Nachkommastelle */
  const comboValue = (strokes, ms) => Math.round((strokes + ms / 60000) * 10) / 10;

  /* Fremden Stand hereinnehmen. Gibt zurück, was neu ist – daraus wird die Meldung im Spiel. */
  function merge(id, incoming) {
    const w = world(id), inc = shape(incoming), news = [];
    let localBetter = false;
    for (const kind of KINDS) {
      for (const [hole, rec] of Object.entries(inc[kind].holes)) {
        if (better(rec, w[kind].holes[hole])) { w[kind].holes[hole] = rec; news.push({ kind, hole, rec }); }
        else if (better(w[kind].holes[hole], rec)) localBetter = true;
      }
      if (inc[kind].round) {
        if (better(inc[kind].round, w[kind].round)) { w[kind].round = inc[kind].round; news.push({ kind, hole: null, rec: inc[kind].round }); }
        else if (better(w[kind].round, inc[kind].round)) localBetter = true;
      }
    }
    if (news.length) save('fantasygolf.best', data);
    return { news, localBetter };
  }
  function publish(id) {
    const w = world(id), msg = {};
    for (const kind of KINDS) msg[kind] = { holes: w[kind].holes, round: w[kind].round };
    Net.pub(TOPIC(id), msg, true);
  }
  function onNet(msg, topic) {
    const id = topic.split('/').pop();
    if (!id) return;
    const { news, localBetter } = merge(id, msg);
    // Hatten wir etwas Besseres, schicken wir unseren Stand nach – so gleichen sich beide an
    if (localBetter) publish(id);
    if (onChange) onChange(id, news);
  }
  /* Einen Wert eintragen, wenn er den bisherigen Rekord schlägt. Gibt den alten Eintrag zurück. */
  function put(id, kind, holeName, rec) {
    const w = world(id)[kind];
    const old = holeName ? (w.holes[holeName] || null) : (w.round || null);
    if (!better(rec, old)) return null;
    if (holeName) w.holes[holeName] = rec; else w.round = rec;
    return { old, rec };
  }

  return {
    get name() { return name; },
    get all() { return data; },
    /* Rekorde einer Welt: { strokes, time, combo } mit je { holes, round } */
    of: id => data[id] || shape(null),
    /* Die drei Wertungen mit Beschriftung – für die Anzeige */
    KINDS,
    KIND_NAME: { strokes: 'Schläge', time: 'Zeit', combo: 'Kombi' },
    combo: comboValue,

    /* 1:23,4 – und bei langen Zeiten mit Stunden */
    formatTime(ms) {
      if (!ms && ms !== 0) return '–';
      const zehntel = Math.floor(ms / 100) % 10, s = Math.floor(ms / 1000) % 60;
      const m = Math.floor(ms / 60000) % 60, h = Math.floor(ms / 3600000);
      const mm = h ? String(m).padStart(2, '0') : String(m);
      return `${h ? h + ':' : ''}${mm}:${String(s).padStart(2, '0')},${zehntel}`;
    },
    /* Wert einer Kategorie lesbar machen */
    format(kind, rec) {
      if (!rec || rec.s == null) return '–';
      if (kind === 'time') return this.formatTime(rec.s);
      if (kind === 'combo') return String(rec.s).replace('.', ',');
      return String(rec.s);
    },

    setName(v) { name = cleanName(v); save('fantasygolf.name', name); },
    /* Verbindung aufbauen und die Rekorde abonnieren */
    start(handlers) {
      Net.connect(handlers || {});
      if (watching !== FILTER) {
        // Die eigenen aufbewahrten Nachrichten sollen mitkommen, darum skipSelf aus
        Net.sub(FILTER, onNet, { skipSelf: false });
        watching = FILTER;
      }
      // eigenen Stand einmal anbieten, damit neue Geräte ihn bekommen
      setTimeout(() => { for (const id of Object.keys(data)) publish(id); }, 1200);
    },
    stop() { if (watching) { Net.unsub(watching); watching = ''; } },
    onChange(fn) { onChange = fn; },

    /* Ergebnis einer Bahn eintragen: Schläge und gebrauchte Zeit.
       Gibt zurück, welche Wertungen gefallen sind: [{ kind, old, rec }] */
    hole(id, holeName, strokes, ms) {
      if (!name || !strokes) return [];
      const t = Date.now(), treffer = [];
      const kandidaten = [['strokes', { s: strokes, n: name, t }]];
      if (ms > 0) {
        kandidaten.push(['time', { s: ms, n: name, t }]);
        kandidaten.push(['combo', { s: comboValue(strokes, ms), n: name, t, st: strokes, ms }]);
      }
      for (const [kind, rec] of kandidaten) {
        const hit = put(id, kind, holeName, rec);
        if (hit) treffer.push(Object.assign({ kind }, hit));
      }
      if (treffer.length) { save('fantasygolf.best', data); publish(id); }
      return treffer;
    },
    /* Gesamtergebnis einer Runde eintragen */
    round(id, total, ms) {
      if (!name || !total) return [];
      const t = Date.now(), treffer = [];
      const kandidaten = [['strokes', { s: total, n: name, t }]];
      if (ms > 0) {
        kandidaten.push(['time', { s: ms, n: name, t }]);
        kandidaten.push(['combo', { s: comboValue(total, ms), n: name, t, st: total, ms }]);
      }
      for (const [kind, rec] of kandidaten) {
        const hit = put(id, kind, null, rec);
        if (hit) treffer.push(Object.assign({ kind }, hit));
      }
      if (treffer.length) { save('fantasygolf.best', data); publish(id); }
      return treffer;
    },
  };
})();
