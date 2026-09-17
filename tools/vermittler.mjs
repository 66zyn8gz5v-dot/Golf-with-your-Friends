/* Ein winziger MQTT-Vermittler für die Werkbank.
 *
 *   node tools/vermittler.mjs [Port]        (Voreinstellung 9001)
 *
 * WARUM ES DEN GIBT
 * Das Online-Spiel läuft über einen offenen MQTT-Vermittler im Netz. Prüfen kann man es damit
 * nicht: Dafür bräuchte es zwei Geräte und eine Internetverbindung, und beides hat eine Werkbank
 * nicht. Also steht hier einer auf dem eigenen Rechner. Zwei Browserfenster verbinden sich
 * dagegen, und schon lässt sich ein ganzer Raum durchspielen – Beitreten, Schlagen, Rausfliegen,
 * Wiederkommen.
 *
 * Im Browser umgestellt wird er so (das Spiel liest die Adresse beim Verbinden):
 *   localStorage.setItem('fantasygolf.broker', 'ws://localhost:9001');
 *
 * WAS ER KANN UND WAS NICHT
 * Er spricht genau so viel MQTT 3.1.1, wie src/net.js benutzt: CONNECT, SUBSCRIBE, UNSUBSCRIBE,
 * PUBLISH (auch aufbewahrt), PINGREQ, DISCONNECT – alles QoS 0. Kein Benutzername, kein
 * Kennwort, keine Sitzungen über die Verbindung hinaus, keine Quittungen für höhere Dienstgüten.
 * Das ist Absicht: Er soll das prüfen, was das Spiel tut, und sonst nichts. Mehr Kann wäre mehr
 * Code, der selbst kaputtgehen kann.
 *
 * Auch der WebSocket ist von Hand geschrieben, aus demselben Grund wie src/net.js: keine fremde
 * Bibliothek. Das sind rund fünfzig Zeilen – Handschlag, Rahmen auspacken, Rahmen einpacken.
 */
import http from 'node:http';
import crypto from 'node:crypto';

const PORT = Number(process.argv[2] || 9001);
const GUID = '258EAFA5-E914-47DA-95CA-C5AB0DC85B11';
const laut = process.env.LAUT === '1';

/* ---------- WebSocket ---------- */
/* Rahmen auspacken. Es kommen nur kleine Binärrahmen, aber der Puffer kann mehrere auf einmal
   enthalten oder einen halben – darum wird gesammelt und so lange gelesen, wie ein ganzer drin
   ist. */
function rahmenLesen(puffer) {
  const raus = [];
  let p = puffer;
  for (;;) {
    if (p.length < 2) break;
    const opcode = p[0] & 0x0f, maskiert = (p[1] & 0x80) !== 0;
    let len = p[1] & 0x7f, off = 2;
    if (len === 126) { if (p.length < 4) break; len = p.readUInt16BE(2); off = 4; }
    else if (len === 127) { if (p.length < 10) break; len = Number(p.readBigUInt64BE(2)); off = 10; }
    const maske = maskiert ? 4 : 0;
    if (p.length < off + maske + len) break;
    const schluessel = maskiert ? p.slice(off, off + 4) : null;
    const nutz = Buffer.from(p.slice(off + maske, off + maske + len));
    if (schluessel) for (let i = 0; i < nutz.length; i++) nutz[i] ^= schluessel[i % 4];
    raus.push({ opcode, nutz });
    p = p.slice(off + maske + len);
  }
  return { rahmen: raus, rest: p };
}
/* Rahmen einpacken – vom Vermittler zum Browser, also ohne Maske. */
function rahmenSchreiben(opcode, nutz) {
  const len = nutz.length;
  let kopf;
  if (len < 126) kopf = Buffer.from([0x80 | opcode, len]);
  else if (len < 65536) { kopf = Buffer.alloc(4); kopf[0] = 0x80 | opcode; kopf[1] = 126; kopf.writeUInt16BE(len, 2); }
  else { kopf = Buffer.alloc(10); kopf[0] = 0x80 | opcode; kopf[1] = 127; kopf.writeBigUInt64BE(BigInt(len), 2); }
  return Buffer.concat([kopf, nutz]);
}

/* ---------- MQTT ---------- */
function varintLesen(b, i) {
  let wert = 0, faktor = 1, gelesen = 0;
  for (;;) {
    if (i + gelesen >= b.length) return null;
    const c = b[i + gelesen++];
    wert += (c & 127) * faktor;
    faktor *= 128;
    if (!(c & 128)) break;
    if (gelesen > 4) return null;
  }
  return { wert, gelesen };
}
function varintSchreiben(n) {
  const out = [];
  do { let b = n % 128; n = Math.floor(n / 128); if (n > 0) b |= 128; out.push(b); } while (n > 0);
  return out;
}
const textLesen = (b, i) => { const n = b.readUInt16BE(i); return { text: b.slice(i + 2, i + 2 + n).toString('utf8'), naechst: i + 2 + n }; };
const textBytes = s => { const b = Buffer.from(s, 'utf8'); return [b.length >> 8, b.length & 255, ...b]; };
const paket = (typ, flags, koerper) => Buffer.from([(typ << 4) | flags, ...varintSchreiben(koerper.length), ...koerper]);

/* Passt ein Thema auf ein Abo? + steht für eine Stufe, # für den Rest – dieselbe Regel wie in
   src/net.js, damit die Werkbank sich nicht anders verhält als der echte Vermittler. */
function passt(filter, thema) {
  if (filter === thema) return true;
  const f = filter.split('/'), t = thema.split('/');
  for (let i = 0; i < f.length; i++) {
    if (f[i] === '#') return true;
    if (i >= t.length) return false;
    if (f[i] !== '+' && f[i] !== t[i]) return false;
  }
  return f.length === t.length;
}

const kunden = new Set();               // { sock, abos:Set<string> }
const aufbewahrt = new Map();           // Thema -> Nutzlast (Retain)

function verteilen(thema, nutz, retain) {
  if (retain) { if (nutz.length) aufbewahrt.set(thema, nutz); else aufbewahrt.delete(thema); }
  const raus = paket(3, 0, [...textBytes(thema), ...nutz]);
  for (const k of kunden) if ([...k.abos].some(f => passt(f, thema))) sende(k, raus);
}
function sende(k, daten) {
  try { k.sock.write(rahmenSchreiben(2, daten)); } catch (e) { /* die Verbindung ist weg, das merkt 'close' */ }
}

function mqttVerarbeiten(k, b) {
  let i = 0;
  while (i < b.length) {
    const typ = b[i] >> 4, flags = b[i] & 0x0f;
    const rl = varintLesen(b, i + 1);
    if (!rl) return;
    const anfang = i + 1 + rl.gelesen, ende = anfang + rl.wert;
    if (ende > b.length) return;
    const koerper = b.slice(anfang, ende);
    switch (typ) {
      case 1:                                   // CONNECT
        sende(k, Buffer.from([0x20, 0x02, 0x00, 0x00]));   // CONNACK, angenommen
        break;
      case 3: {                                 // PUBLISH (nur QoS 0)
        const { text: thema, naechst } = textLesen(koerper, 0);
        verteilen(thema, koerper.slice(naechst), (flags & 1) === 1);
        break;
      }
      case 8: {                                 // SUBSCRIBE
        const pid = koerper.readUInt16BE(0);
        let j = 2; const angenommen = [];
        while (j < koerper.length) { const s = textLesen(koerper, j); k.abos.add(s.text); angenommen.push(s.text); j = s.naechst + 1; }
        sende(k, paket(9, 0, [pid >> 8, pid & 255, ...angenommen.map(() => 0)]));
        // aufbewahrte Nachrichten nachliefern – daran hängt die Rangliste
        for (const [thema, nutz] of aufbewahrt) if (angenommen.some(f => passt(f, thema))) sende(k, paket(3, 1, [...textBytes(thema), ...nutz]));
        break;
      }
      case 10: {                                // UNSUBSCRIBE
        const pid = koerper.readUInt16BE(0);
        let j = 2;
        while (j < koerper.length) { const s = textLesen(koerper, j); k.abos.delete(s.text); j = s.naechst; }
        sende(k, paket(11, 0, [pid >> 8, pid & 255]));
        break;
      }
      case 12: sende(k, Buffer.from([0xd0, 0x00])); break;   // PINGREQ -> PINGRESP
      case 14: k.sock.end(); break;                          // DISCONNECT
    }
    i = ende;
  }
}

/* ---------- Server ---------- */
const server = http.createServer((req, res) => { res.writeHead(200); res.end('Fantasy-Golf-Vermittler\n'); });
server.on('upgrade', (req, sock) => {
  const schluessel = req.headers['sec-websocket-key'];
  if (!schluessel) { sock.destroy(); return; }
  const accept = crypto.createHash('sha1').update(schluessel + GUID).digest('base64');
  const wunsch = String(req.headers['sec-websocket-protocol'] || '').split(',')[0].trim();
  sock.write('HTTP/1.1 101 Switching Protocols\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
    + `Sec-WebSocket-Accept: ${accept}\r\n`
    + (wunsch ? `Sec-WebSocket-Protocol: ${wunsch}\r\n` : '') + '\r\n');
  const k = { sock, abos: new Set() };
  kunden.add(k);
  let puffer = Buffer.alloc(0), mqtt = Buffer.alloc(0);
  sock.on('data', (d) => {
    puffer = Buffer.concat([puffer, d]);
    const { rahmen, rest } = rahmenLesen(puffer);
    puffer = rest;
    for (const r of rahmen) {
      if (r.opcode === 8) { sock.end(); return; }            // der Browser macht zu
      if (r.opcode === 9) { sock.write(rahmenSchreiben(10, r.nutz)); continue; }   // Ping
      if (r.opcode !== 2 && r.opcode !== 0) continue;
      mqtt = Buffer.concat([mqtt, r.nutz]);
      const vorher = mqtt.length;
      mqttVerarbeiten(k, mqtt);
      // verarbeitet wird nur, was ganz da ist; der Rest bleibt liegen
      let i = 0;
      while (i < mqtt.length) { const rl = varintLesen(mqtt, i + 1); if (!rl) break; const ende = i + 1 + rl.gelesen + rl.wert; if (ende > mqtt.length) break; i = ende; }
      mqtt = mqtt.slice(i);
      if (laut && vorher !== mqtt.length) console.log(`  ${vorher - mqtt.length} Bytes verarbeitet`);
    }
  });
  const weg = () => { kunden.delete(k); };
  sock.on('close', weg); sock.on('error', weg);
});
server.listen(PORT, () => console.log(`Vermittler läuft auf ws://localhost:${PORT}`));
