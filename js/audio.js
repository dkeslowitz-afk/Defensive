// ============================================================
// AUDIO & HAPTICS — little synthesized sounds (no audio files) and
// phone vibration. Both respect the player's settings in Save.data.settings.
// Browsers only allow sound after a tap, so unlock() runs on the first touch.
// Note: iPhone web browsers ignore vibration; Android supports it.
// ============================================================

const Sfx = {
  ctx: null,
  lastPlayed: {},
  MIN_GAP: { pop: 0.06, squish: 0.05, fling: 0.08, coin: 0.05 }, // seconds; stops sound pile-ups

  unlock() {
    if (this.ctx) { if (this.ctx.state === 'suspended') this.ctx.resume(); return; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (AC) this.ctx = new AC();
  },

  enabled() { return this.ctx && Save.data.settings.sound; },

  play(name) {
    if (!this.enabled()) return;
    const now = this.ctx.currentTime;
    const gap = this.MIN_GAP[name] || 0;
    if (now - (this.lastPlayed[name] || -1) < gap) return;
    this.lastPlayed[name] = now;
    switch (name) {
      case 'pop':    this.tone(520, 900, 0.07, 'triangle', 0.18); break;
      case 'fling':  this.tone(300, 160, 0.08, 'sawtooth', 0.06); break;
      case 'squish': this.noise(0.09, 900, 0.22); this.tone(180, 70, 0.08, 'sine', 0.2); break;
      case 'coin':   this.tone(1200, 1200, 0.06, 'square', 0.05); this.tone(1600, 1600, 0.08, 'square', 0.05, 0.06); break;
      case 'build':  this.tone(220, 330, 0.1, 'triangle', 0.2); break;
      case 'leak':   this.tone(400, 150, 0.25, 'sawtooth', 0.12); break;
      case 'wave':   [523, 659, 784].forEach((f, i) => this.tone(f, f, 0.1, 'triangle', 0.15, i * 0.09)); break;
      case 'boss':   this.tone(110, 70, 0.6, 'sawtooth', 0.15); break;
      case 'win':    [523, 659, 784, 1046].forEach((f, i) => this.tone(f, f, 0.16, 'triangle', 0.18, i * 0.12)); break;
      case 'lose':   [392, 330, 262].forEach((f, i) => this.tone(f, f, 0.2, 'triangle', 0.15, i * 0.16)); break;
    }
  },

  tone(f1, f2, dur, type, vol, delay = 0) {
    const c = this.ctx, t = c.currentTime + delay;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type;
    o.frequency.setValueAtTime(f1, t);
    o.frequency.exponentialRampToValueAtTime(Math.max(20, f2), t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g).connect(c.destination);
    o.start(t);
    o.stop(t + dur + 0.02);
  },

  noise(dur, cutoff, vol) {
    const c = this.ctx, t = c.currentTime;
    const buf = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / data.length);
    const src = c.createBufferSource(), f = c.createBiquadFilter(), g = c.createGain();
    src.buffer = buf;
    f.type = 'lowpass';
    f.frequency.value = cutoff;
    g.gain.value = vol;
    src.connect(f).connect(g).connect(c.destination);
    src.start(t);
  },

  buzz(ms) {
    if (Save.data.settings.vibrate && navigator.vibrate) navigator.vibrate(ms);
  },
};
