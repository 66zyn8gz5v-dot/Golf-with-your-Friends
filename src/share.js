/* Bahnen teilen: prüfen, über den Vermittler austauschen und als Link verpacken.

   Drei Wege führen eine fremde Bahn ins Spiel: die Werkstatt (über den Vermittler), ein Link und
   der Textcode zum Einfügen. Alle drei gehen durch dieselbe Prüfung – eine Bahn von außen ist
   erst einmal nichts als ein Haufen Daten, und eine kaputte oder böswillige Bahn soll das Spiel
   weder zum Absturz bringen noch etwas anzeigen, was sie nicht anzeigen darf.

   Die Werkstatt nutzt „aufbewahrte" Nachrichten wie die Rangliste: Wer teilt, legt seine Bahn
   beim Vermittler ab, wo sie liegen bleibt und jedem zugestellt wird, der später zuhört. Es gibt
   keinen Code – wer das Spiel hat, sieht die Bahnen. Das reicht in einem Freundeskreis und spart
   die Tipperei.

   Grenzen, damit niemand die Liste unbrauchbar macht: höchstens BAHN_MAX Zeichen je Bahn,
   höchstens EIGENE_MAX geteilte Bahnen pro Gerät und höchstens LISTE_MAX Bahnen insgesamt. */
const Share = (() => {
  const THEMA = id => `fantasygolf/v1/${APP_MARKE}/bahnen/${id}`;
  const FILTER = `fantasygolf/v1/${APP_MARKE}/bahnen/+`;
  const BAHN_MAX = 8000;      // Zeichen im JSON einer Bahn
  const EIGENE_MAX = 12;      // so viele Bahnen darf ein Gerät gleichzeitig geteilt haben
  const LISTE_MAX = 60;       // so viele fremde Bahnen halten wir insgesamt

  /* ---------- Prüfung ----------
     Erlaubt ist nur, was das Spiel kennt. Alles andere fällt weg. */
  const KARTE = new Set(['#', 's', 'i', 'w', 'l', 'x', 'o', '.', 'T', 'H']);
  const TYPEN = new Set(['bumper', 'rotor', 'gate', 'mover', 'wind', 'ramp', 'boost', 'windmill',
    'cannon', 'magnet', 'turntable', 'potion', 'portal', 'wall', 'field', 'rail', 'wave',
    'sharkjump', 'door', 'cauldron', 'spikes', 'switch', 'trapdoor', 'guillotine', 'lightning',
    'updraft', 'eyetower', 'ferry']);
  const W_MIN = 6, W_MAX = 48, H_MIN = 4, H_MAX = 36;
  const OBJ_MAX = 120, DEKOR_MAX = 120, FELDER_MAX = 24;

  const zahlOk = v => typeof v === 'number' && isFinite(v) && v >= -1000 && v <= 1000;
  /* Texte in Bahnen sind Farben („#4fd0ff"), Stilnamen („bat") und kurze Meldungen
     („Ritterfluch! Der Ball bleibt liegen"). Erlaubt ist, was dort vorkommt – aber keines der
     fünf Zeichen, die in HTML eine Bedeutung haben. */
  const textOk = v => typeof v === 'string' && v.length <= 120 && !/[<>&"']/.test(v);
  /* Ein einzelner Wert: Zahl, Wahrheitswert, Text, flache Liste – oder eine flache Gruppe von
     Zahlen, wie sie manche Hindernisse haben (swing: { amp, speed }). Tiefer geht es nicht. */
  function wertOk(v, tiefe = 0) {
    if (zahlOk(v) || typeof v === 'boolean' || v == null) return true;
    if (typeof v === 'string') return textOk(v);
    if (Array.isArray(v)) return v.length <= 40 && v.every(x => wertOk(x, tiefe + 1));
    if (typeof v === 'object' && tiefe === 0) {
      const k = Object.keys(v);
      return k.length <= 12 && k.every(n => n.length <= 20 && /^[a-zA-Z0-9_]+$/.test(n) && wertOk(v[n], 1));
    }
    return false;
  }
  function eintragOk(o, typKey, erlaubt) {
    if (!o || typeof o !== 'object' || Array.isArray(o)) return false;
    const schluessel = Object.keys(o);
    if (schluessel.length > FELDER_MAX) return false;
    // Der Typ selbst wird immer geprüft: gegen die Liste der bekannten, wo es eine gibt,
    // sonst wenigstens auf einen schlichten Namen – ungeprüft darf nichts durchgehen.
    const typ = o[typKey];
    if (erlaubt) { if (!erlaubt.has(typ)) return false; }
    else if (typeof typ !== 'string' || typ.length > 20 || !/^[a-zA-Z0-9_]+$/.test(typ)) return false;
    for (const k of schluessel) {
      if (k.length > 20 || !/^[a-zA-Z0-9_]+$/.test(k)) return false;
      if (k === typKey) continue;
      if (!wertOk(o[k])) return false;
    }
    return true;
  }

  /* Eine Bahn von außen in eine Form bringen, mit der das Spiel sicher umgehen kann.
     Gibt die geprüfte Bahn zurück oder null mit Grund in .grund. */
  let letzterGrund = '';
  function pruefe(roh) {
    letzterGrund = '';
    const nein = grund => { letzterGrund = grund; return null; };
    if (!roh || typeof roh !== 'object' || Array.isArray(roh)) return nein('Das ist keine Bahn.');

    const karte = roh.map;
    if (!Array.isArray(karte) || karte.length < H_MIN || karte.length > H_MAX) return nein('Die Karte hat eine unmögliche Höhe.');
    if (!karte.every(z => typeof z === 'string')) return nein('Die Karte ist beschädigt.');
    const breite = Math.max(...karte.map(z => z.length));
    if (breite < W_MIN || breite > W_MAX) return nein('Die Karte hat eine unmögliche Breite.');
    for (const zeile of karte) for (const c of zeile) if (!KARTE.has(c)) return nein(`Unbekanntes Zeichen „${c}" in der Karte.`);

    const platt = karte.join('');
    if ((platt.match(/T/g) || []).length !== 1) return nein('Die Bahn braucht genau einen Abschlag.');
    if ((platt.match(/H/g) || []).length !== 1)
      return nein('Die Bahn braucht genau ein Loch. Bahnen mit Innenraum lassen sich nicht teilen.');

    const hindernisse = roh.obstacles == null ? [] : roh.obstacles;
    if (!Array.isArray(hindernisse) || hindernisse.length > OBJ_MAX) return nein('Zu viele Hindernisse.');
    for (const o of hindernisse) if (!eintragOk(o, 'type', TYPEN)) return nein('Ein Hindernis ist unbekannt oder beschädigt.');

    const dekor = roh.decor == null ? [] : roh.decor;
    if (!Array.isArray(dekor) || dekor.length > DEKOR_MAX) return nein('Zu viel Beiwerk.');
    for (const d of dekor) if (!eintragOk(d, 't', null)) return nein('Das Beiwerk ist beschädigt.');

    const welt = (typeof THEMES !== 'undefined' && THEMES[roh.theme]) ? roh.theme : 'meadow';
    const bahn = {
      id: Date.now() + Math.floor(Math.random() * 1000),
      name: Text.label(roh.name) || 'Geteilte Bahn',
      par: Math.max(1, Math.min(12, Math.round(+roh.par || 3))),
      theme: welt,
      map: karte.map(z => z.slice(0, W_MAX)),
      obstacles: hindernisse,
      decor: dekor,
    };
    if (zahlOk(roh.maxStrokes)) bahn.maxStrokes = Math.max(1, Math.min(99, Math.round(roh.maxStrokes)));
    // Höhenstufen: ein Ziffernraster genau über der Karte, dazu die Höhe je Stufe
    if (roh.heights != null) {
      const hh = roh.heights;
      if (!Array.isArray(hh) || hh.length !== karte.length || !hh.every(z => typeof z === 'string')) return nein('Das Höhenraster passt nicht zur Karte.');
      for (const zeile of hh) {
        if (zeile.length > breite) return nein('Das Höhenraster ist breiter als die Karte.');
        if (!/^[0-9. ]*$/.test(zeile)) return nein('Im Höhenraster stehen nur Ziffern.');
      }
      bahn.heights = hh.map(z => z.slice(0, W_MAX));
      bahn.hStep = zahlOk(roh.hStep) ? Math.max(0.1, Math.min(2, roh.hStep)) : 0.5;
    }
    if (JSON.stringify(bahn).length > BAHN_MAX) return nein('Die Bahn ist zu groß zum Teilen.');
    return bahn;
  }

  /* ---------- Verpacken für den Link ----------
     Gepackt wird mit den Bordmitteln des Browsers (CompressionStream). Wo es die nicht gibt,
     wandert das JSON ungepackt in den Link – dann wird er länger, funktioniert aber genauso.
     Das erste Zeichen sagt, was folgt: z = gepackt, j = pur. */
  const enc = new TextEncoder(), dec = new TextDecoder();
  const zuBase64 = bytes => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
  const ausBase64 = t => { const s = atob(t.replace(/-/g, '+').replace(/_/g, '/')); return Uint8Array.from(s, c => c.charCodeAt(0)); };
  const stromDurch = async (bytes, strom) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(strom)).arrayBuffer());

  async function packe(text) {
    if (typeof CompressionStream === 'undefined') return 'j' + zuBase64(enc.encode(text));
    try { return 'z' + zuBase64(await stromDurch(enc.encode(text), new CompressionStream('deflate-raw'))); }
    catch (e) { return 'j' + zuBase64(enc.encode(text)); }
  }
  async function entpacke(code) {
    const art = code[0], rest = code.slice(1);
    const bytes = ausBase64(rest);
    if (art === 'j') return dec.decode(bytes);
    if (art === 'z') return dec.decode(await stromDurch(bytes, new DecompressionStream('deflate-raw')));
    throw new Error('unbekanntes Format');
  }

  /* ---------- Werkstatt ----------
     fremde: Kennung des Absenders -> Liste seiner Bahnen */
  const fremde = new Map();
  let onChange = null, watching = '';
  const eigene = () => {
    try { const v = JSON.parse(localStorage.getItem(speicherSchluessel('geteilt')) || '[]'); return Array.isArray(v) ? v : []; }
    catch (e) { return []; }
  };
  const eigeneMerken = ids => { try { localStorage.setItem(speicherSchluessel('geteilt'), JSON.stringify(ids)); } catch (e) { /* kein Speicher */ } };

  function onNet(msg, topic) {
    const von = topic.split('/').pop();
    if (!von || von === Net.id) return;                        // die eigenen kennen wir schon
    const roh = Array.isArray(msg && msg.bahnen) ? msg.bahnen : [];
    const geprueft = [];
    for (const b of roh.slice(0, EIGENE_MAX)) {
      const ok = pruefe(b);
      if (ok) { ok.von = Text.name(msg.nick) || 'Jemand'; ok.quelle = von; geprueft.push(ok); }
    }
    if (geprueft.length) fremde.set(von, geprueft); else fremde.delete(von);
    if (onChange) onChange();
  }

  return {
    BAHN_MAX, EIGENE_MAX,
    get grund() { return letzterGrund; },
    pruefe,

    /* Alle geteilten Bahnen der anderen, neueste Quelle zuerst */
    get liste() {
      const alle = [];
      for (const bahnen of fremde.values()) for (const b of bahnen) alle.push(b);
      return alle.slice(0, LISTE_MAX);
    },
    /* Kennungen der eigenen geteilten Bahnen */
    get eigeneIds() { return eigene(); },
    istGeteilt: id => eigene().includes(id),

    start(handlers) {
      Net.connect(handlers || {});
      if (watching !== FILTER) { Net.sub(FILTER, onNet, { skipSelf: false }); watching = FILTER; }
    },
    onChange(fn) { onChange = fn; },

    /* Die eigenen geteilten Bahnen erneut anbieten (nach Änderungen oder beim Verbinden) */
    sende(alleEigenen, nick) {
      const ids = eigene();
      const bahnen = alleEigenen.filter(b => ids.includes(b.id)).slice(0, EIGENE_MAX);
      return Net.pub(THEMA(Net.id), { bahnen, nick: Text.name(nick) }, true);
    },
    /* Eine eigene Bahn teilen oder zurückziehen. Gibt die neue Liste der geteilten Kennungen zurück. */
    teile(id, alleEigenen, nick) {
      const ids = eigene();
      if (!ids.includes(id)) { if (ids.length >= EIGENE_MAX) return { ids, voll: true }; ids.push(id); }
      eigeneMerken(ids);
      this.sende(alleEigenen, nick);
      return { ids, voll: false };
    },
    ziehZurueck(id, alleEigenen, nick) {
      const ids = eigene().filter(x => x !== id);
      eigeneMerken(ids);
      this.sende(alleEigenen, nick);
      return { ids, voll: false };
    },

    /* ---------- Link ---------- */
    async link(def) {
      const bahn = { name: def.name, par: def.par, theme: def.theme, map: def.map, obstacles: def.obstacles || [], decor: def.decor || [] };
      const code = await packe(JSON.stringify(bahn));
      const basis = location.origin + location.pathname.replace(/[^/]*$/, '');
      return `${basis}?bahn=${code}`;
    },
    /* Steckt eine Bahn im Anhang der Adresse? Gibt die geprüfte Bahn zurück oder null. */
    async ausAdresse() {
      const code = new URLSearchParams(location.search).get('bahn');
      if (!code || code.length > 20000) return null;
      try { return pruefe(JSON.parse(await entpacke(code))); } catch (e) { letzterGrund = 'Der Link ist beschädigt.'; return null; }
    },
    /* Den Anhang aus der Adresszeile nehmen, ohne die Seite neu zu laden */
    adresseAufraeumen() {
      try { history.replaceState(null, '', location.pathname); } catch (e) { /* egal */ }
    },
  };
})();
