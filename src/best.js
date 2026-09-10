/* Rangliste: geteilt über alle Geräte eines Freundeskreises, in drei Wertungen.

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
   und EINTRAG = { s, n, t, q, st?, ms? }
   s  = der gewertete Wert (Schläge, Millisekunden oder Kombi-Punkte)
   n  = Name, t = Zeitpunkt des Eintrags
   q  = woher er stammt: 'net' aus einer Runde gegeneinander, sonst allein am eigenen Gerät
   st, ms = Schläge und Millisekunden, aus denen ein Kombi-Wert entstanden ist (nur zur Anzeige)

   Ehrlich gesagt: Kein Eintrag ist überprüfbar. Es gibt keinen Server, der mitrechnet – jedes
   Gerät meldet sein Ergebnis selbst, und wer den Code des Spiels ändert, kann melden, was er
   will. Die Liste ist eine Anschreibetafel unter Freunden, kein Schiedsrichter. Deshalb steht
   an jedem Eintrag, woher er kommt, und in der Liste steht dieser Satz auch für jeden lesbar.

   Kleiner ist überall besser; bei Gleichstand gewinnt der ältere Eintrag, damit ein Rekord nicht
   ständig den Besitzer wechselt. */
const Best = (() => {
  // Eigener Zweig für die Vorschau, damit Testläufe die Rekorde der Freunde nicht anfassen
  const TOPIC = world => `fantasygolf/v1/${APP_MARKE}/best/all/${world}`;
  const FILTER = `fantasygolf/v1/${APP_MARKE}/best/all/+`;
  const RESET = `fantasygolf/v1/${APP_MARKE}/best/reset`;
  const OWNER = `fantasygolf/v1/${APP_MARKE}/best/owner`;
  const ALGO = { name: 'ECDSA', namedCurve: 'P-256' }, SIGN = { name: 'ECDSA', hash: 'SHA-256' };
  /* Eine Bahn braucht Zeit: was darunter liegt, kann niemand wirklich gespielt haben */
  const MIN_MS_BAHN = 2000, MIN_MS_RUNDE = 10000;
  const KINDS = ['strokes', 'time', 'combo'];
  /* Namen und Bahnnamen kommen von fremden Geräten und gehen in die Anzeige.
     Gefiltert wird an einer Stelle für das ganze Spiel: src/text.js */
  const cleanName = v => Text.name(v);
  const cleanHole = v => Text.label(v);

  const load = (key, fallback) => { try { const v = JSON.parse(localStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } };
  const save = (key, v) => { try { localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* kein Speicher */ } };

  // Spiel und Vorschau liegen auf derselben Adresse: eigene Schlüssel halten die Stände getrennt
  const K_NAME = speicherSchluessel('name'), K_BEST = speicherSchluessel('best'), K_RESET = speicherSchluessel('bestreset');
  let name = cleanName(load(K_NAME, ''));
  /* Zurücksetz-Zeitpunkt. Alles, was davor eingetragen wurde, zählt nicht mehr. Der Zeitpunkt wird
     wie die Rekorde geteilt: Wer zurücksetzt, sagt es allen, und jedes Gerät wirft daraufhin seine
     alten Einträge weg. Ohne das käme der alte Stand vom nächsten Gerät sofort wieder zurück. */
  let epoche = +load(K_RESET, 0) || 0;

  /* ---------- Wer darf zurücksetzen ----------

     Zurücksetzen löscht die Rekorde bei allen. Das soll nicht jeder können, nur wer die Liste
     führt. Ohne eigenen Server gibt es niemanden, der Rechte vergibt – also übernimmt das ein
     Schlüsselpaar, das der Browser selbst erzeugt:

     - Der öffentliche Schlüssel wird geteilt und liegt beim Vermittler. Jedes Gerät kennt ihn.
     - Der private Schlüssel bleibt auf dem Gerät des Besitzers und wird nie verschickt.
     - Wer zurücksetzt, unterschreibt den Zeitpunkt mit dem privaten Schlüssel. Alle anderen
       prüfen die Unterschrift mit dem öffentlichen und lehnen alles ab, was nicht passt.

     Wer zuerst kommt, wird Besitzer: Ist noch kein öffentlicher Schlüssel abgelegt, darf einer
     abgelegt werden. Ein zweiter wird nur angenommen, wenn er mit dem bisherigen unterschrieben
     ist – so lässt sich die Liste weitergeben, aber nicht an sich reißen. */
  const K_PRIV = speicherSchluessel('bestkey'), K_PUB = speicherSchluessel('bestowner');
  let besitzerPub = load(K_PUB, null);        // öffentlicher Schlüssel des Besitzers (JWK)
  let meinPriv = load(K_PRIV, null);          // eigener privater Schlüssel (JWK), nur hier

  const b64 = buf => { let s = ''; for (const b of new Uint8Array(buf)) s += String.fromCharCode(b); return btoa(s); };
  const vonB64 = t => Uint8Array.from(atob(t), c => c.charCodeAt(0));
  const roh = t => new TextEncoder().encode(t);
  const kryptoDa = () => typeof crypto !== 'undefined' && crypto.subtle;

  async function unterschreibe(text) {
    if (!meinPriv || !kryptoDa()) return null;
    try {
      const k = await crypto.subtle.importKey('jwk', meinPriv, ALGO, false, ['sign']);
      return b64(await crypto.subtle.sign(SIGN, k, roh(text)));
    } catch (e) { return null; }
  }
  async function pruefeUnterschrift(pubJwk, text, sig) {
    if (!pubJwk || !sig || !kryptoDa()) return false;
    try {
      const k = await crypto.subtle.importKey('jwk', pubJwk, ALGO, false, ['verify']);
      return await crypto.subtle.verify(SIGN, k, vonB64(sig), roh(text));
    } catch (e) { return false; }
  }
  /* Passt mein privater Schlüssel zum abgelegten öffentlichen? */
  const binBesitzer = () => !!(meinPriv && besitzerPub && meinPriv.x === besitzerPub.x && meinPriv.y === besitzerPub.y);
  let data = migrate(load(K_BEST, {}) || {});   // Welt-Kennung -> Rekorde
  let onChange = null, watching = '';

  /* ---------- Der eigene Stand ----------
     Für die Belohnungen zählt nicht, wer den Rekord hält, sondern was man selbst geschafft hat.
     Darum führt jedes Gerät zusätzlich eine eigene, private Liste: je Welt und Bahn die wenigsten
     Schläge, die man dort selbst gebraucht hat. Sie wird nicht geteilt – sie geht niemanden etwas
     an, und über das Netz wäre sie ohnehin nicht nachprüfbar.

     Gezählt wird nur das normale Spiel. Im Kreativmodus darf man beliebig oft neu setzen; jede
     Bedingung wäre damit wertlos. Geprüft wird beim Speichern, nicht erst beim Anzeigen – so kann
     ein Kreativ-Ergebnis gar nicht erst in die Liste geraten. */
  const K_EIGEN = speicherSchluessel('eigen');

  function eigenSauber(all) {
    const out = {};
    for (const [welt, bahnen] of Object.entries(all || {})) {
      if (typeof WORLDS === 'undefined' || !WORLDS.some(x => x.id === welt)) continue;
      const w = {};
      for (const [bahn, s] of Object.entries(bahnen || {})) {
        const name = cleanHole(bahn), zahl = Math.round(+s);
        if (name && zahl > 0 && zahl < 1000) w[name] = zahl;
      }
      if (Object.keys(w).length) out[welt] = w;
    }
    return out;
  }
  let eigen = eigenSauber(load(K_EIGEN, {}));

  /* Ein eigenes Bahnergebnis eintragen, wenn es besser ist als das bisherige */
  function eigenEintragen(id, bahn, schlaege) {
    const name = cleanHole(bahn), s = Math.round(+schlaege);
    if (!id || !name || !(s > 0)) return false;
    const w = eigen[id] = eigen[id] || {};
    if (w[name] != null && w[name] <= s) return false;
    w[name] = s; save(K_EIGEN, eigen);
    return true;
  }

  /* Wie weit ist man in einer Welt? Für die Belohnung zählt die Summe der eigenen besten
     Einzelbahnen – nicht eine Runde am Stück –, und jede Bahn muss ein Ergebnis haben. */
  function fortschritt(id) {
    const welt = (typeof WORLDS !== 'undefined' && WORLDS.find(x => x.id === id)) || null;
    const leer = { gesamt: 0, fertig: 0, offen: [], schlaege: 0, par: 0, diff: 0, geschafft: false };
    if (!welt) return leer;
    const w = eigen[id] || {};
    let schlaege = 0, par = 0, fertig = 0;
    const offen = [];
    for (const c of welt.courses) {
      par += c.par;
      const s = w[c.name];
      if (s > 0) { schlaege += s; fertig++; } else offen.push(c.name);
    }
    // Erst wenn jede Bahn ein Ergebnis hat, ist die Summe überhaupt vergleichbar
    return { gesamt: welt.courses.length, fertig, offen, schlaege, par,
             diff: schlaege - par, geschafft: offen.length === 0 && schlaege < par };
  }

  /* Bis zur Zeitwertung gab es nur Schläge: { holes, round } ohne Kategorie. Solche Stände –
     aus dem Browser oder von einem Gerät mit älterem Spielstand – werden hier eingereiht. */
  function cleanRec(r) {
    if (!r || !r.s) return null;
    // Ein Zeitstempel in der Zukunft würde jedes Zurücksetzen überleben – darum gekappt
    const jetzt = Date.now();
    const out = { s: +r.s, n: cleanName(r.n), t: Math.min(+r.t || 0, jetzt + 300000) };
    if (out.t && out.t < epoche) return null;      // vor dem letzten Zurücksetzen: zählt nicht mehr
    if (r.q === 'net') out.q = 'net';
    if (r.st != null) out.st = +r.st;
    if (r.ms != null) out.ms = +r.ms;
    return out;
  }
  function cleanHoles(h) {
    const out = {};
    for (const [k, v] of Object.entries(h || {})) { const r = cleanRec(v); const name = cleanHole(k); if (r && name) out[name] = r; }
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
    if (news.length) save(K_BEST, data);
    return { news, localBetter };
  }
  function publish(id) {
    const w = world(id), msg = {};
    for (const kind of KINDS) msg[kind] = { holes: w[kind].holes, round: w[kind].round };
    Net.pub(TOPIC(id), msg, true);
  }
  /* Jemand hat zurückgesetzt: Zeitpunkt übernehmen, alles Ältere wegwerfen und den nun leeren
     Stand nachschicken, damit auch die aufbewahrten Nachrichten beim Vermittler aufräumen. */
  async function onReset(msg) {
    const t = +(msg && msg.t) || 0;
    if (!t || t <= epoche || t > Date.now() + 300000) return;
    // Ohne gültige Unterschrift des Besitzers passiert nichts
    if (!besitzerPub) return;
    if (!await pruefeUnterschrift(besitzerPub, 'reset:' + t, msg && msg.sig)) return;
    epoche = t; save(K_RESET, epoche);
    const welten = Object.keys(data);
    data = migrate(data);                       // wirft alles vor der Epoche weg
    save(K_BEST, data);
    setTimeout(() => { for (const id of welten) publish(id); }, 400);
    if (onChange) onChange(null, []);
  }
  /* Der abgelegte öffentliche Schlüssel des Besitzers */
  async function onOwner(msg) {
    const pub = msg && msg.pub;
    if (!pub || typeof pub !== 'object' || pub.kty !== 'EC' || typeof pub.x !== 'string' || typeof pub.y !== 'string') return;
    if (besitzerPub && besitzerPub.x === pub.x && besitzerPub.y === pub.y) return;     // schon bekannt
    if (besitzerPub) {
      // Übergabe: nur gültig, wenn der bisherige Besitzer den neuen Schlüssel unterschrieben hat
      const ok = await pruefeUnterschrift(besitzerPub, 'owner:' + pub.x + '.' + pub.y, msg.sig);
      if (!ok) return;
    }
    besitzerPub = { kty: pub.kty, crv: pub.crv || 'P-256', x: pub.x, y: pub.y, ext: true };
    save(K_PUB, besitzerPub);
    if (onChange) onChange(null, []);
  }
  function onNet(msg, topic) {
    if (topic === OWNER) { onOwner(msg); return; }
    if (topic === RESET) { onReset(msg); return; }
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
    /* Der eigene Stand in einer Welt – Grundlage der Belohnungen */
    fortschritt,
    /* Die eigenen besten Schläge je Bahn einer Welt (nur zur Anzeige) */
    eigeneBahnen: id => Object.assign({}, eigen[id] || {}),
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

    setName(v) { name = cleanName(v); save(K_NAME, name); },
    /* Alles zurücksetzen – bei allen. Der Zeitpunkt wird geteilt, damit die alten Einträge nicht
       vom nächsten Gerät wieder hereingetragen werden. */
    async reset() {
      if (!binBesitzer()) return { ok: false, grund: 'keinBesitzer' };
      const t = Date.now();
      const sig = await unterschreibe('reset:' + t);
      if (!sig) return { ok: false, grund: 'keinSchluessel' };
      epoche = t; save(K_RESET, epoche);
      const welten = Object.keys(data);
      data = {}; save(K_BEST, data);
      const gesendet = Net.pub(RESET, { t, sig }, true);
      for (const id of welten) publish(id);     // leere Stände nachschieben
      if (onChange) onChange(null, []);
      return { ok: true, gesendet };
    },
    get resetZeit() { return epoche; },

    /* ---------- Besitz ---------- */
    get binBesitzer() { return binBesitzer(); },
    get gibtBesitzer() { return !!besitzerPub; },
    /* Schlüsselpaar anlegen und den öffentlichen Teil ablegen. Geht nur, solange niemand die
       Liste führt – sonst müsste der bisherige Besitzer übergeben. */
    async werdeBesitzer() {
      if (besitzerPub && !binBesitzer()) return { ok: false, grund: 'schonVergeben' };
      if (!kryptoDa()) return { ok: false, grund: 'keinKrypto' };
      try {
        const paar = await crypto.subtle.generateKey(ALGO, true, ['sign', 'verify']);
        const pub = await crypto.subtle.exportKey('jwk', paar.publicKey);
        const priv = await crypto.subtle.exportKey('jwk', paar.privateKey);
        let sig = null;
        if (besitzerPub) sig = await unterschreibe('owner:' + pub.x + '.' + pub.y);   // Übergabe an sich selbst
        meinPriv = priv; save(K_PRIV, meinPriv);
        besitzerPub = { kty: pub.kty, crv: pub.crv, x: pub.x, y: pub.y, ext: true };
        save(K_PUB, besitzerPub);
        Net.pub(OWNER, sig ? { pub: besitzerPub, sig } : { pub: besitzerPub }, true);
        return { ok: true };
      } catch (e) { return { ok: false, grund: 'fehler' }; }
    },
    /* Den eigenen Schlüssel zum Sichern oder Mitnehmen */
    get schluesselText() { return meinPriv ? JSON.stringify(meinPriv) : ''; },
    /* Einen gesicherten Schlüssel auf diesem Gerät einsetzen */
    async schluesselEinsetzen(text) {
      let priv = null;
      try { priv = JSON.parse(String(text || '').trim()); } catch (e) { return { ok: false, grund: 'unlesbar' }; }
      if (!priv || priv.kty !== 'EC' || !priv.d || !priv.x || !priv.y) return { ok: false, grund: 'unlesbar' };
      if (besitzerPub && (besitzerPub.x !== priv.x || besitzerPub.y !== priv.y)) return { ok: false, grund: 'passtNicht' };
      const probe = await (async () => {
        try {
          const k = await crypto.subtle.importKey('jwk', priv, ALGO, false, ['sign']);
          return !!await crypto.subtle.sign(SIGN, k, roh('probe'));
        } catch (e) { return false; }
      })();
      if (!probe) return { ok: false, grund: 'unlesbar' };
      meinPriv = priv; save(K_PRIV, meinPriv);
      if (!besitzerPub) {
        besitzerPub = { kty: priv.kty, crv: priv.crv || 'P-256', x: priv.x, y: priv.y, ext: true };
        save(K_PUB, besitzerPub);
        Net.pub(OWNER, { pub: besitzerPub }, true);
      }
      return { ok: true };
    },
    /* Verbindung aufbauen und die Rekorde abonnieren */
    start(handlers) {
      Net.connect(handlers || {});
      if (watching !== FILTER) {
        // Die eigenen aufbewahrten Nachrichten sollen mitkommen, darum skipSelf aus
        Net.sub(FILTER, onNet, { skipSelf: false });
        Net.sub(RESET, onNet, { skipSelf: false });
        Net.sub(OWNER, onNet, { skipSelf: false });
        watching = FILTER;
      }
      // eigenen Stand einmal anbieten, damit neue Geräte ihn bekommen
      setTimeout(() => { for (const id of Object.keys(data)) publish(id); }, 1200);
    },
    stop() { if (watching) { Net.unsub(watching); Net.unsub(RESET); Net.unsub(OWNER); watching = ''; } },
    onChange(fn) { onChange = fn; },

    /* Ergebnis einer Bahn eintragen: Schläge und gebrauchte Zeit.
       Gibt zurück, welche Wertungen gefallen sind: [{ kind, old, rec }] */
    hole(id, holeName, strokes, ms, quelle, modus) {
      /* Zuerst der eigene Stand: Er ist privat, geht in keine geteilte Liste und zählt darum auch
         ohne eingetragenen Namen. Der Kreativmodus wird genau hier abgewiesen, beim Speichern. */
      if (modus !== 'creative' && strokes > 0) eigenEintragen(id, holeName, strokes);
      if (!name || !strokes) return [];
      const t = Date.now(), treffer = [], q = quelle === 'net' ? 'net' : undefined;
      const kandidaten = [['strokes', { s: strokes, n: name, t, q }]];
      if (ms >= MIN_MS_BAHN) {
        kandidaten.push(['time', { s: ms, n: name, t, q }]);
        kandidaten.push(['combo', { s: comboValue(strokes, ms), n: name, t, q, st: strokes, ms }]);
      }
      for (const [kind, rec] of kandidaten) {
        const hit = put(id, kind, holeName, rec);
        if (hit) treffer.push(Object.assign({ kind }, hit));
      }
      if (treffer.length) { save(K_BEST, data); publish(id); }
      return treffer;
    },
    /* Gesamtergebnis einer Runde eintragen.
       Der Modus wird mitgegeben, damit alle Aufrufe dieselbe Form haben – für den eigenen Stand
       zählt er hier aber nicht: Die Belohnung hängt an den besten Einzelbahnen, nicht an einer
       Runde am Stück. */
    round(id, total, ms, quelle, modus) {
      if (!name || !total) return [];
      const t = Date.now(), treffer = [], q = quelle === 'net' ? 'net' : undefined;
      const kandidaten = [['strokes', { s: total, n: name, t, q }]];
      if (ms >= MIN_MS_RUNDE) {
        kandidaten.push(['time', { s: ms, n: name, t, q }]);
        kandidaten.push(['combo', { s: comboValue(total, ms), n: name, t, q, st: total, ms }]);
      }
      for (const [kind, rec] of kandidaten) {
        const hit = put(id, kind, null, rec);
        if (hit) treffer.push(Object.assign({ kind }, hit));
      }
      if (treffer.length) { save(K_BEST, data); publish(id); }
      return treffer;
    },
  };
})();
