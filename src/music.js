/* Musik: für jede Welt ein eigener Klangteppich, der endlos weiterläuft – vollständig mit WebAudio
   erzeugt, ohne eine einzige Audiodatei (die App bleibt klein und offline spielbar).

   Aufbau je Takt: ein Flächenakkord (Pad) aus drei Tönen, ein Bass auf dem Grundton, gezupfte
   Melodietöne aus der Tonleiter des gerade klingenden Akkords und – je nach Welt – eine leise
   Trommel oder Glocke. Über Melodie und Trommel liegt ein Echo, das dem Ganzen Raum gibt.
   Die Akkorde wechseln Takt für Takt entlang einer kurzen Wendung, die sich wiederholt.

   Der Klang teilt sich den AudioContext mit den Effekten (Sfx.unlock() liefert ihn), damit der
   Browser nur einen einzigen Kontext öffnen muss und alles gemeinsam entsperrt wird. */
const Music = (() => {
  const midi = n => 440 * Math.pow(2, (n - 69) / 12);
  // Tonleitern als Halbtonschritte über dem Grundton
  const DUR = [0, 2, 4, 5, 7, 9, 11], MOLL = [0, 2, 3, 5, 7, 8, 10];
  const DORISCH = [0, 2, 3, 5, 7, 9, 10], PHRYGISCH = [0, 1, 3, 5, 7, 8, 10], PENTA = [0, 3, 5, 7, 10];

  /* Eine Palette beschreibt den Klang einer Welt:
     root = Grundton (MIDI), scale = Tonleiter, chords = Akkordfolge in Tonleiterstufen,
     bar = Taktlänge in Sekunden, pad/lead = Wellenformen, steps/density = Dichte der Melodie,
     lift = wie hoch die Melodie über dem Pad liegt (in Tonleiterstufen), drum = Art der Perkussion. */
  const PALETTES = {
    // Märchenland: hell und freundlich, gezupfte Harfe über weichen Flächen
    normal: { root: 53, scale: DUR, chords: [0, 4, 5, 3], bar: 4.0, pad: 'triangle', lead: 'triangle', steps: 8, density: 0.45, lift: 14, gain: 0.15, drum: null },
    // Meereswelt: weit und wiegend, langsame Wellen ohne Trommel
    sea: { root: 50, scale: DORISCH, chords: [0, 5, 3, 4], bar: 4.8, pad: 'sine', lead: 'sine', steps: 8, density: 0.34, lift: 14, gain: 0.15, drum: null },
    // Tüftlerreich: geheimnisvoll, mit ruhigem Puls
    pro: { root: 52, scale: MOLL, chords: [0, 5, 3, 4], bar: 3.8, pad: 'triangle', lead: 'triangle', steps: 8, density: 0.5, lift: 14, gain: 0.14, drum: 'puls' },
    // Dschungeltempel: Marimba über einer Rahmentrommel, Pentatonik
    jungle: { root: 50, scale: PENTA, chords: [0, 3, 4, 2], bar: 3.4, pad: 'triangle', lead: 'square', steps: 8, density: 0.6, lift: 10, gain: 0.13, drum: 'tribal' },
    // Sturmhimmel: weite Quinten, tiefe Pauke, ein einzelner heller Ton weit oben
    storm: { root: 45, scale: MOLL, chords: [0, 4, 2, 5], bar: 5.2, pad: 'sawtooth', lead: 'sine', steps: 8, density: 0.26, lift: 21, gain: 0.13, drum: 'pauke' },
    // Schattenreich: phrygisch und düster, dazu eine ferne Grabglocke
    shadow: { root: 41, scale: PHRYGISCH, chords: [0, 1, 0, 6], bar: 5.6, pad: 'sawtooth', lead: 'sine', steps: 8, density: 0.22, lift: 21, gain: 0.13, drum: 'glocke' },
    // Titelbild und eigene Bahnen: ruhige Fassung des Märchenlands
    title: { root: 53, scale: DUR, chords: [0, 3, 4, 3], bar: 4.6, pad: 'triangle', lead: 'triangle', steps: 8, density: 0.35, lift: 14, gain: 0.13, drum: null },
  };
  PALETTES.custom = PALETTES.title;

  let ctx = null, master = null, echo = null, on = true, cur = PALETTES.title;
  let running = false, timer = null, swapT = null, barIdx = 0, nextT = 0;
  try { on = localStorage.getItem(speicherSchluessel('music')) !== 'off'; } catch (e) { /* kein Speicher */ }

  function ensure() {
    if (ctx) return ctx;
    ctx = (typeof Sfx !== 'undefined' && Sfx.unlock && Sfx.unlock()) || null;
    if (!ctx) return null;
    master = ctx.createGain(); master.gain.value = 0; master.connect(ctx.destination);
    // Echo als einfacher Hall: eine Verzögerung, die sich gedämpft selbst füttert
    const d = ctx.createDelay(1.0); d.delayTime.value = 0.38;
    const fb = ctx.createGain(); fb.gain.value = 0.34;
    const damp = ctx.createBiquadFilter(); damp.type = 'lowpass'; damp.frequency.value = 2200;
    const wet = ctx.createGain(); wet.gain.value = 0.4;
    d.connect(damp).connect(fb).connect(d); d.connect(wet).connect(master);
    echo = d;
    return ctx;
  }
  function fade(to, sec) {
    if (!master) return;
    const now = ctx.currentTime;
    master.gain.cancelScheduledValues(now);
    master.gain.setValueAtTime(Math.max(0.0001, master.gain.value), now);
    master.gain.linearRampToValueAtTime(to, now + sec);
  }
  /* Tonhöhe aus einer Tonleiterstufe; Stufen über die Leiter hinaus liegen eine Oktave höher */
  function pitch(p, deg) {
    const n = p.scale.length, oct = Math.floor(deg / n), i = ((deg % n) + n) % n;
    return midi(p.root + oct * 12 + p.scale[i]);
  }
  function voice(freq, t, dur, type, vol, atk, dest, detune = 0) {
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t); o.detune.setValueAtTime(detune, t);
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(vol, t + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(dest || master); o.start(t); o.stop(t + dur + 0.05);
  }
  function thump(t, freq, dur, vol) { // Trommel: tiefer Ton, der schnell nach unten rutscht
    const o = ctx.createOscillator(), g = ctx.createGain();
    o.type = 'sine'; o.frequency.setValueAtTime(freq, t); o.frequency.exponentialRampToValueAtTime(freq * 0.4, t + dur);
    g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g).connect(master); o.start(t); o.stop(t + dur + 0.05);
  }
  function shaker(t, vol) { // Rassel: kurzes, hohes Rauschen
    const dur = 0.09, buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 3200;
    const g = ctx.createGain(); g.gain.value = vol;
    src.connect(f).connect(g).connect(echo || master); g.connect(master); src.start(t);
  }

  function scheduleBar(t0) {
    const p = cur, n = p.scale.length, deg = p.chords[barIdx % p.chords.length];
    const tones = [deg, deg + 2, deg + 4];
    // Fläche: jeder Akkordton zweistimmig leicht verstimmt, mit langem An- und Abschwellen
    for (const d of tones) for (const det of [-6, 7]) voice(pitch(p, d), t0, p.bar * 1.1, p.pad, 0.05, p.bar * 0.35, master, det);
    // Bass: Grundton auf der Eins, Quinte in der Taktmitte
    voice(pitch(p, deg - n), t0, p.bar * 0.62, 'sine', 0.13, 0.03, master);
    voice(pitch(p, deg + 4 - n), t0 + p.bar * 0.5, p.bar * 0.4, 'sine', 0.07, 0.03, master);
    // Melodie: gezupfte Töne aus dem Akkord, dazwischen Pausen
    for (let i = 0; i < p.steps; i++) {
      if (Math.random() > p.density) continue;
      const t = t0 + (i / p.steps) * p.bar;
      const pick = tones[Math.floor(Math.random() * 3)] + (Math.random() < 0.25 ? 1 : 0);
      const dur = 0.5 + Math.random() * (p.bar * 0.3);
      voice(pitch(p, pick + p.lift), t, dur, p.lead, 0.055, 0.008, echo || master);
    }
    // Perkussion je Welt
    const q = p.bar / 4;
    if (p.drum === 'puls') { thump(t0, 90, 0.5, 0.16); thump(t0 + q * 2, 90, 0.4, 0.1); }
    else if (p.drum === 'tribal') {
      thump(t0, 100, 0.45, 0.18); thump(t0 + q * 1.5, 130, 0.3, 0.1); thump(t0 + q * 2, 100, 0.4, 0.14);
      for (const k of [0.5, 1.5, 2.5, 3.5]) shaker(t0 + q * k, 0.05);
    } else if (p.drum === 'pauke') { thump(t0, 62, 1.0, 0.2); if (barIdx % 2 === 1) thump(t0 + q * 3, 62, 0.7, 0.12); }
    else if (p.drum === 'glocke' && barIdx % 2 === 0) { // ferne Grabglocke
      voice(pitch(p, deg + n), t0, 3.2, 'sine', 0.09, 0.01, echo || master);
      voice(pitch(p, deg + n) * 2.76, t0, 1.6, 'sine', 0.03, 0.01, echo || master);
    }
  }
  function tick() {
    if (!ctx || !running) return;
    while (nextT < ctx.currentTime + 0.9) { scheduleBar(nextT); nextT += cur.bar; barIdx++; }
  }

  function start() {
    if (!on || running || !ensure()) return;
    running = true; barIdx = 0; nextT = ctx.currentTime + 0.12;
    fade(cur.gain, 2.0);
    tick(); timer = setInterval(tick, 100);
  }
  function stop(sec = 0.6) {
    running = false; clearInterval(timer); timer = null; clearTimeout(swapT); swapT = null;
    fade(0, sec);
  }
  /* Weltwechsel: das Alte ausblenden, dann mit der neuen Palette wieder aufblenden */
  function set(id) {
    const p = PALETTES[id] || PALETTES.title;
    if (p === cur) return;
    if (!running) { cur = p; barIdx = 0; return; }
    fade(0, 0.7); clearTimeout(swapT);
    swapT = setTimeout(() => { cur = p; barIdx = 0; nextT = ctx.currentTime + 0.06; fade(cur.gain, 1.6); }, 750);
  }
  function setOn(v) {
    on = !!v;
    try { localStorage.setItem(speicherSchluessel('music'), on ? 'on' : 'off'); } catch (e) { /* kein Speicher */ }
    if (on) start(); else stop(0.4);
  }
  // Im Hintergrund (anderer Tab) schweigt die Musik
  if (typeof document !== 'undefined') document.addEventListener('visibilitychange', () => {
    if (document.hidden) { if (running) stop(0.3); } else if (on) start();
  });

  return { start, stop, set, setOn, toggle() { setOn(!on); return on; }, get on() { return on; } };
})();
