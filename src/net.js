/* Netzspiel und Bestenliste: der Draht zwischen mehreren Browsern.

   Das Spiel liegt als reine Dateien auf GitHub Pages, es gibt also keinen eigenen Server. Statt
   dessen läuft alles über einen offenen MQTT-Vermittler:

   - Ein Spielraum ist ein Thema, in das alle Teilnehmer schreiben und aus dem alle mitlesen.
     Reihum gespielt sind das nur ein paar kurze Nachrichten je Bahn.
   - Die Bestenliste nutzt „aufbewahrte" Nachrichten: eine Nachricht mit gesetztem Retain-Bit
     bleibt beim Vermittler liegen und wird jedem zugestellt, der später zuhört. So gibt es eine
     gemeinsame Rekordtafel ohne Server. Startet der Vermittler neu, können die Rekorde
     allerdings verloren gehen – deshalb hält jedes Gerät zusätzlich eine eigene Kopie.

   Der Zugang ist hier von Hand geschrieben (MQTT 3.1.1, nur QoS 0), damit keine fremde Bibliothek
   dazukommt und das Spiel eine einzelne kleine Datei bleibt.

   Die Adresse des Vermittlers steht in BROKER und lässt sich im Browser überschreiben:
   localStorage.setItem('fantasygolf.broker', 'wss://…') – so kann man einen anderen Dienst
   einsetzen, ohne am Spiel etwas zu ändern (in der Vorschau: fantasygolf.vorschau.broker). */
const Net = (() => {
  const BROKER = 'wss://broker.emqx.io:8084/mqtt';
  const ROOM = code => `fantasygolf/v1/${APP_MARKE}/room/${code}`;   // Vorschau spielt in eigenen Räumen
  const KEEPALIVE = 45;                 // Sekunden zwischen zwei Lebenszeichen
  // Nur Ziffern: leicht durchzusagen und auf dem Handy mit der Zifferntastatur einzutippen
  const ALPHABET = '0123456789';

  const enc = new TextEncoder(), dec = new TextDecoder();

  /* ---------- MQTT-Pakete ---------- */
  function varint(n) { // Restlänge: sieben Bit je Byte, oberstes Bit heißt „geht weiter"
    const out = [];
    do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; out.push(b); } while (n > 0);
    return out;
  }
  function str(s) { const b = enc.encode(s); return [b.length >> 8, b.length & 255, ...b]; }
  const packet = (type, flags, body) => new Uint8Array([(type << 4) | flags, ...varint(body.length), ...body]);
  const pConnect = id => packet(1, 0, [...str('MQTT'), 4, 0x02, KEEPALIVE >> 8, KEEPALIVE & 255, ...str(id)]);
  const pSubscribe = (pid, topic) => packet(8, 2, [pid >> 8, pid & 255, ...str(topic), 0]);
  const pUnsubscribe = (pid, topic) => packet(10, 2, [pid >> 8, pid & 255, ...str(topic)]);
  const pPublish = (topic, text, retain) => packet(3, retain ? 1 : 0, [...str(topic), ...enc.encode(text)]);
  const PING = new Uint8Array([0xc0, 0x00]), BYE = new Uint8Array([0xe0, 0x00]);

  /* Jede eigene Nachricht bekommt eine fortlaufende Nummer. Beim Empfang merken wir uns je
     Absender die höchste gesehene und werfen alles weg, was nicht darüber liegt: so kann eine
     verspätete Nachricht keine neuere überschreiben, und eine doppelt zugestellte wird nur
     einmal verarbeitet. Die Kennung eines Geräts wird bei jedem Laden neu gewürfelt, darum
     beginnt jeder Zähler bei null, ohne dass es Verwechslungen gibt. */
  let outSeq = 0;
  const lastSeq = new Map();          // Absender -> zuletzt gesehene Nummer

  let ws = null, buf = new Uint8Array(0), timer = null;
  let me = '', status = 'off', pid = 1;
  let onStatus = null, tries = 0, retryT = null, wasReady = false;
  const subs = new Map();               // Thema -> { handler, skipSelf }
  let room = '';                        // aktuelles Spielraum-Thema (leer = kein Raum)

  const rnd = n => Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  function setStatus(s, detail) { status = s; if (onStatus) onStatus(s, detail); }
  /* Passt ein Thema auf ein Abo? + steht für eine Stufe, # für den Rest. */
  function wildcardHit(filter, topic) {
    if (filter === topic) return true;
    const f = filter.split('/'), t = topic.split('/');
    if (f.length !== t.length && f[f.length - 1] !== '#') return false;
    for (let i = 0; i < f.length; i++) {
      if (f[i] === '#') return true;
      if (f[i] !== '+' && f[i] !== t[i]) return false;
    }
    return true;
  }

  /* ---------- Empfangen ---------- */
  function feed(chunk) {
    const merged = new Uint8Array(buf.length + chunk.length);
    merged.set(buf); merged.set(chunk, buf.length); buf = merged;
    for (;;) {
      if (buf.length < 2) return;
      let i = 1, mult = 1, len = 0, b;
      do {
        if (i >= buf.length) return;                       // Restlänge noch unvollständig
        b = buf[i++]; len += (b & 127) * mult; mult *= 128;
      } while (b & 128);
      if (buf.length < i + len) return;                    // Paket noch unvollständig
      handle(buf[0] >> 4, buf.subarray(i, i + len));
      buf = buf.slice(i + len);
    }
  }
  function handle(type, body) {
    if (type === 2) {                                      // CONNACK
      if (body[1] !== 0) { fail('Der Vermittler hat die Anmeldung abgelehnt.'); return; }
      for (const t of subs.keys()) ws.send(pSubscribe(pid++, t));
      tries = 0; wasReady = true; setStatus('ready');
      return;
    }
    if (type === 3) {                                      // PUBLISH
      const tl = (body[0] << 8) | body[1];
      const topic = dec.decode(body.subarray(2, 2 + tl));
      let data;
      try { data = JSON.parse(dec.decode(body.subarray(2 + tl))); } catch (e) { return; }
      if (!data) return;
      for (const [filter, s] of subs) {
        if (!wildcardHit(filter, topic)) continue;
        if (s.skipSelf && data.from === me) continue;
        // Reihenfolge nur dort prüfen, wo sie zählt (Spielraum). Die Bestenliste kommt als
        // aufbewahrte Nachrichten in beliebiger Folge und verträgt das von sich aus.
        if (s.seq) {
          if (typeof data.from !== 'string' || typeof data.n !== 'number' || !isFinite(data.n)) continue;
          const last = lastSeq.get(data.from);
          if (last != null && data.n <= last) continue;      // alt oder doppelt
          lastSeq.set(data.from, data.n);
        }
        s.handler(data, topic);
      }
    }
  }

  /* ---------- Verbinden ---------- */
  function open() {
    setStatus(tries ? 'retry' : 'connecting');
    try { ws = new WebSocket(brokerUrl(), 'mqtt'); } catch (e) { fail('Der Vermittler ist nicht erreichbar.'); return; }
    ws.binaryType = 'arraybuffer';
    ws.onopen = () => { buf = new Uint8Array(0); ws.send(pConnect('fg-' + me)); clearInterval(timer); timer = setInterval(ping, KEEPALIVE * 500); };
    ws.onmessage = e => feed(new Uint8Array(e.data));
    ws.onerror = () => { /* der Abschluss kommt gleich danach über onclose */ };
    ws.onclose = () => { clearInterval(timer); timer = null; if (status !== 'off') retry(); };
  }
  function ping() { if (ws && ws.readyState === 1) ws.send(PING); }
  function retry() {
    if (tries >= 3) { fail(wasReady ? 'Die Verbindung ist abgerissen.' : 'Der Vermittler ist nicht erreichbar.'); return; }
    tries++;
    clearTimeout(retryT);
    retryT = setTimeout(open, tries * 1500);
  }
  function fail(text) { status = 'error'; if (onStatus) onStatus('error', text); shut(); }
  function shut() {
    clearInterval(timer); timer = null; clearTimeout(retryT); retryT = null;
    if (ws) { try { if (ws.readyState === 1) ws.send(BYE); ws.close(); } catch (e) { /* schon zu */ } }
    ws = null; buf = new Uint8Array(0);
  }
  function brokerUrl() { try { return localStorage.getItem(speicherSchluessel('broker')) || BROKER; } catch (e) { return BROKER; } }

  return {
    /* Neuen Code würfeln – vier Ziffern, gut durchzusagen */
    makeCode: () => rnd(4),

    /* Verbindung herstellen, falls noch keine steht. Mehrfach aufrufen ist harmlos. */
    connect(handlers) {
      if (handlers && handlers.status) onStatus = handlers.status;
      if (!me) me = rnd(10);
      if (ws && (ws.readyState === 0 || ws.readyState === 1)) {
        if (status === 'ready' && onStatus) onStatus('ready');
        return me;
      }
      tries = 0; wasReady = false; status = 'off';
      open();
      return me;
    },
    /* Thema abonnieren. skipSelf blendet die eigenen Nachrichten aus (für Spielräume). */
    sub(topic, handler, opts = {}) {
      subs.set(topic, { handler, skipSelf: opts.skipSelf !== false, seq: !!opts.seq });
      if (ws && ws.readyState === 1 && status === 'ready') ws.send(pSubscribe(pid++, topic));
    },
    unsub(topic) {
      if (!subs.delete(topic)) return;
      if (ws && ws.readyState === 1) ws.send(pUnsubscribe(pid++, topic));
    },
    /* Nachricht senden. retain = beim Vermittler liegen lassen (für die Bestenliste). */
    pub(topic, obj, retain = false) {
      if (!ws || ws.readyState !== 1 || status !== 'ready') return false;
      try { ws.send(pPublish(topic, JSON.stringify(Object.assign({ from: me, n: ++outSeq }, obj)), retain)); return true; } catch (e) { return false; }
    },

    /* ---------- Spielraum ---------- */
    join(code, handlers) {
      const id = this.connect(handlers);
      if (room) this.unsub(room);
      room = ROOM(String(code || ''));
      lastSeq.clear();                 // neuer Raum, neue Zählung
      this.sub(room, handlers.message, { skipSelf: true, seq: true });
      return id;
    },
    send(obj) { return room ? this.pub(room, obj) : false; },
    leaveRoom() { if (room) { this.unsub(room); room = ''; lastSeq.clear(); } },
    /* Alles beenden – auch die Bestenliste */
    leave() { status = 'off'; room = ''; subs.clear(); shut(); onStatus = null; },

    get id() { return me; },
    get status() { return status; },
    get broker() { return brokerUrl(); },
  };
})();
