/* Kleine Klangeffekte mit WebAudio (ohne Dateien). */
const Sfx = (() => {
  let ctx = null;
  function ensure() {
    if (!ctx) { try { ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { ctx = null; } }
    if (ctx && ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.2, slide = 0) {
    const c = ensure(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, c.currentTime);
    if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), c.currentTime + dur);
    g.gain.setValueAtTime(vol, c.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + dur);
    o.connect(g).connect(c.destination);
    o.start(); o.stop(c.currentTime + dur + 0.02);
  }
  function noise(dur, vol = 0.15) {
    const c = ensure(); if (!c) return;
    const buf = c.createBuffer(1, c.sampleRate * dur, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
    const src = c.createBufferSource(); src.buffer = buf;
    const g = c.createGain(); g.gain.value = vol;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 900;
    src.connect(f).connect(g).connect(c.destination); src.start();
  }
  return {
    unlock: ensure,
    hit(p) { tone(180 + p * 220, 0.12, 'triangle', 0.25 + p * 0.2, -80); noise(0.06, 0.05 + p * 0.1); },
    bounce(s) { tone(320 + Math.min(s, 15) * 25, 0.07, 'square', Math.min(0.18, 0.05 + s * 0.012)); },
    bumper() { tone(520, 0.12, 'sine', 0.25, 300); },
    sink() { tone(660, 0.12, 'sine', 0.25); setTimeout(() => tone(880, 0.14, 'sine', 0.25), 110); setTimeout(() => tone(1320, 0.25, 'sine', 0.25), 220); },
    water() { noise(0.35, 0.25); tone(220, 0.3, 'sine', 0.15, -150); },
    lava() { noise(0.4, 0.3); tone(90, 0.4, 'sawtooth', 0.12, -40); },
    portal() { tone(400, 0.35, 'sine', 0.2, 900); },
    oob() { tone(200, 0.3, 'sawtooth', 0.12, -120); },
    lever() { tone(300, 0.15, 'square', 0.18, -120); setTimeout(() => tone(520, 0.25, 'sine', 0.2, 200), 120); },
    potion() { tone(700, 0.3, 'sine', 0.15, -400); setTimeout(() => tone(1100, 0.2, 'triangle', 0.12, 300), 150); },
    cannon() { noise(0.3, 0.35); tone(80, 0.35, 'sawtooth', 0.2, -50); },
  };
})();
