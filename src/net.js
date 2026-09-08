/* Netzspiel: der Draht zwischen mehreren Browsern.

   Das Spiel liegt als reine Dateien auf GitHub Pages, es gibt also keinen eigenen Server. Statt
   dessen läuft der Verkehr über einen offenen MQTT-Vermittler: jeder Raum ist ein Thema, in das
   alle Teilnehmer schreiben und aus dem alle mitlesen. Reihum gespielt sind das nur ein paar
   kurze Nachrichten je Bahn, dafür reicht das dicke.

   Der Zugang ist hier von Hand geschrieben (MQTT 3.1.1, nur QoS 0), damit keine fremde Bibliothek
   dazukommt und das Spiel eine einzelne kleine Datei bleibt.

   Die Adresse des Vermittlers steht in BROKER und lässt sich im Browser überschreiben:
   localStorage.setItem('fantasygolf.broker', 'wss://…') – so kann man einen anderen Dienst
   einsetzen, ohne am Spiel etwas zu ändern. */
const Net = (() => {
  const BROKER = 'wss://broker.emqx.io:8084/mqtt';
  const ROOM = code => `fantasygolf/v1/${code}`;
  const KEEPALIVE = 45;                 // Sekunden zwischen zwei Lebenszeichen
  // Zeichen ohne Verwechslungsgefahr: kein O/0, kein I/1, kein S/5
  const ALPHABET = 'ACDEFGHJKLMNPQRTUVWXY34679';

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
  const pPublish = (topic, text) => packet(3, 0, [...str(topic), ...enc.encode(text)]);
  const PING = new Uint8Array([0xc0, 0x00]), BYE = new Uint8Array([0xe0, 0x00]);

  let ws = null, buf = new Uint8Array(0), timer = null;
  let me = '', room = '', topic = '', status = 'off';
  let onMsg = null, onStatus = null, tries = 0, retryT = null, wasReady = false;

  const rnd = n => Array.from({ length: n }, () => ALPHABET[Math.floor(Math.random() * ALPHABET.length)]).join('');
  function setStatus(s, detail) { status = s; if (onStatus) onStatus(s, detail); }

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
      if (body[1] !== 0) { fail('Der Vermittler hat die Anmeldung abgelehnt'); return; }
      ws.send(pSubscribe(1, topic));
      return;
    }
    if (type === 9) {                                      // SUBACK: ab jetzt hören wir mit
      tries = 0; wasReady = true; setStatus('ready');
      return;
    }
    if (type === 3) {                                      // PUBLISH
      const tl = (body[0] << 8) | body[1];
      let data;
      try { data = JSON.parse(dec.decode(body.subarray(2 + tl))); } catch (e) { return; }
      if (!data || data.from === me) return;               // eigene Nachrichten nicht doppelt verarbeiten
      if (onMsg) onMsg(data);
    }
  }

  /* ---------- Verbinden ---------- */
  function open() {
    const url = (() => { try { return localStorage.getItem('fantasygolf.broker') || BROKER; } catch (e) { return BROKER; } })();
    setStatus(tries ? 'retry' : 'connecting');
    try { ws = new WebSocket(url, 'mqtt'); } catch (e) { fail('Der Vermittler ist nicht erreichbar'); return; }
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
  function fail(text) { status = 'error'; if (onStatus) onStatus('error', text); close(); }
  function close() {
    clearInterval(timer); timer = null; clearTimeout(retryT); retryT = null;
    if (ws) { try { if (ws.readyState === 1) ws.send(BYE); ws.close(); } catch (e) { /* schon zu */ } }
    ws = null; buf = new Uint8Array(0);
  }

  return {
    /* Neuen Raumcode würfeln – vier Zeichen, gut vorlesbar */
    makeCode: () => rnd(4),
    /* Raum betreten. handlers: { message(obj), status(zustand, text) } */
    join(code, handlers) {
      close();
      me = rnd(10); room = String(code || '').toUpperCase(); topic = ROOM(room); wasReady = false;
      onMsg = handlers.message; onStatus = handlers.status; tries = 0;
      open();
      return me;
    },
    /* Nachricht an alle im Raum. Der eigene Absender hängt automatisch dran. */
    send(obj) {
      if (!ws || ws.readyState !== 1 || status !== 'ready') return false;
      try { ws.send(pPublish(topic, JSON.stringify(Object.assign({ from: me }, obj)))); return true; } catch (e) { return false; }
    },
    leave() { status = 'off'; close(); onMsg = null; onStatus = null; room = ''; },
    get id() { return me; },
    get code() { return room; },
    get status() { return status; },
    get broker() { try { return localStorage.getItem('fantasygolf.broker') || BROKER; } catch (e) { return BROKER; } },
  };
})();
