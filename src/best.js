/* Bestenliste: je Bahn die wenigsten Schläge, je Welt das beste Gesamtergebnis – geteilt über
   alle Geräte eines Freundeskreises.

   Es gibt keinen eigenen Server, deshalb liegen die Rekorde als „aufbewahrte" MQTT-Nachrichten
   beim Vermittler: eine Nachricht mit Retain-Bit bleibt dort liegen und wird jedem zugestellt,
   der später zuhört. Wer die Seite öffnet, bekommt also sofort den aktuellen Stand, und wer
   während des Spielens einen Rekord bricht, erscheint bei den anderen sofort.

   Alle, die das Spiel haben, teilen sich eine Liste – es ist ja nicht öffentlich, sondern läuft
   im Freundeskreis. Zusätzlich hält jedes Gerät eine eigene Kopie im Browser, damit die Rekorde
   auch ohne Verbindung sichtbar sind und nicht verloren gehen, wenn der Vermittler neu startet.

   Aufbau je Welt: { holes: { Bahnname: {s, n, t} }, round: {s, n, t} }
   s = Schläge, n = Name, t = Zeitpunkt. Kleiner ist besser; bei Gleichstand gewinnt der ältere
   Eintrag, damit ein Rekord nicht ständig den Besitzer wechselt. */
const Best = (() => {
  const TOPIC = world => `fantasygolf/v1/best/all/${world}`;
  const FILTER = 'fantasygolf/v1/best/all/+';
  const load = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const save = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* kein Speicher */ } };

  let name = String(load('fantasygolf.name', '') || '');
  let data = load('fantasygolf.best', {}) || {};   // Welt-Kennung -> Rekorde
  let onChange = null, watching = '';

  const world = id => (data[id] = data[id] || { holes: {}, round: null });
  const better = (a, b) => !b || !b.s ? !!(a && a.s) : !!(a && a.s && (a.s < b.s || (a.s === b.s && (a.t || 0) < (b.t || 0))));

  /* Fremden Stand hereinnehmen. Gibt zurück, was neu ist – daraus wird die Meldung im Spiel. */
  function merge(id, incoming) {
    const w = world(id), news = [];
    let localBetter = false;
    for (const [hole, rec] of Object.entries((incoming && incoming.holes) || {})) {
      if (better(rec, w.holes[hole])) { w.holes[hole] = rec; news.push({ hole, rec }); }
      else if (better(w.holes[hole], rec)) localBetter = true;
    }
    if (incoming && incoming.round) {
      if (better(incoming.round, w.round)) { w.round = incoming.round; news.push({ hole: null, rec: incoming.round }); }
      else if (better(w.round, incoming.round)) localBetter = true;
    }
    if (news.length) save('fantasygolf.best', data);
    return { news, localBetter };
  }
  function publish(id) { Net.pub(TOPIC(id), { holes: world(id).holes, round: world(id).round }, true); }
  function onNet(msg, topic) {
    const id = topic.split('/').pop();
    if (!id) return;
    const { news, localBetter } = merge(id, msg);
    // Hatten wir etwas Besseres, schicken wir unseren Stand nach – so gleichen sich beide an
    if (localBetter) publish(id);
    if (news.length && onChange) onChange(id, news);
    else if (news.length === 0 && onChange) onChange(id, []);
  }

  return {
    get name() { return name; },
    get all() { return data; },
    /* Rekorde einer Welt: { holes, round } */
    of: id => data[id] || { holes: {}, round: null },

    setName(v) { name = String(v || '').slice(0, 14).trim(); save('fantasygolf.name', name); },
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

    /* Ergebnis einer Bahn eintragen. Gibt den alten Rekord zurück, wenn er gebrochen wurde. */
    hole(id, holeName, strokes) {
      if (!name || !strokes) return null;
      const w = world(id), old = w.holes[holeName] || null;
      const rec = { s: strokes, n: name, t: Date.now() };
      if (!better(rec, old)) return null;
      w.holes[holeName] = rec; save('fantasygolf.best', data); publish(id);
      return { old, rec };
    },
    /* Gesamtergebnis einer Runde eintragen */
    round(id, total) {
      if (!name || !total) return null;
      const w = world(id), old = w.round || null;
      const rec = { s: total, n: name, t: Date.now() };
      if (!better(rec, old)) return null;
      w.round = rec; save('fantasygolf.best', data); publish(id);
      return { old, rec };
    },
  };
})();
