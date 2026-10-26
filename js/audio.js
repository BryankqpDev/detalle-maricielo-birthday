/* ==========================================================================
   AUDIO: motor de sonido, efecto casete, efectos sintetizados y caja musical
   ========================================================================== */

let ctx = null;
let master, musicBus, musicOut, analyser, analyserL, analyserR, hissGain, sfxBus;
let mediaEl = null;
let noiseBuf = null;
let muted = false;

export function initAudio() {
  if (ctx) { ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  ctx = new AC();

  master = ctx.createGain();
  master.gain.value = 0.9;
  master.connect(ctx.destination);

  sfxBus = ctx.createGain();
  sfxBus.gain.value = 0.55;
  sfxBus.connect(master);

  // Cadena de la cinta: bus -> wow/flutter (delay modulado) -> filtros -> salida
  musicBus = ctx.createGain();
  const wow = ctx.createDelay(0.05);
  wow.delayTime.value = 0.006;
  const lfoWow = ctx.createOscillator(); lfoWow.frequency.value = 0.55;
  const lfoWowG = ctx.createGain(); lfoWowG.gain.value = 0.0011;
  const lfoFl = ctx.createOscillator(); lfoFl.frequency.value = 6.3;
  const lfoFlG = ctx.createGain(); lfoFlG.gain.value = 0.00012;
  lfoWow.connect(lfoWowG).connect(wow.delayTime);
  lfoFl.connect(lfoFlG).connect(wow.delayTime);
  lfoWow.start(); lfoFl.start();

  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 12500; lp.Q.value = 0.4;
  const warm = ctx.createBiquadFilter(); warm.type = 'lowshelf'; warm.frequency.value = 180; warm.gain.value = 2.5;

  musicOut = ctx.createGain();
  musicOut.gain.value = 1;

  musicBus.connect(wow).connect(lp).connect(warm).connect(musicOut);

  analyser = ctx.createAnalyser();
  analyser.fftSize = 512;
  analyser.smoothingTimeConstant = 0.78;
  musicOut.connect(analyser);
  musicOut.connect(master);

  const split = ctx.createChannelSplitter(2);
  analyserL = ctx.createAnalyser(); analyserL.fftSize = 1024;
  analyserR = ctx.createAnalyser(); analyserR.fftSize = 1024;
  musicOut.connect(split);
  split.connect(analyserL, 0);
  split.connect(analyserR, 1);

  // Ruido base (para hiss, estática y soplidos)
  noiseBuf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = noiseBuf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;

  // Hiss de cinta continuo
  const hiss = ctx.createBufferSource();
  hiss.buffer = noiseBuf; hiss.loop = true;
  const hissBp = ctx.createBiquadFilter(); hissBp.type = 'highpass'; hissBp.frequency.value = 4000;
  hissGain = ctx.createGain(); hissGain.gain.value = 0;
  hiss.connect(hissBp).connect(hissGain).connect(master);
  hiss.start();

  // Elemento de audio para canciones reales
  mediaEl = new Audio();
  mediaEl.preload = 'auto';
  mediaEl.preservesPitch = false;
  mediaEl.mozPreservesPitch = false;
  mediaEl.webkitPreservesPitch = false;
  const src = ctx.createMediaElementSource(mediaEl);
  src.connect(musicBus);
}

export const getCtx = () => ctx;
export const getAnalysers = () => ({ analyser, analyserL, analyserR });
export const getMediaEl = () => mediaEl;

export function setMuted(m) {
  muted = m;
  if (!ctx) return;
  master.gain.setTargetAtTime(m ? 0 : 0.9, ctx.currentTime, 0.05);
}
export const isMuted = () => muted;

export function setHiss(on) {
  if (!ctx) return;
  hissGain.gain.setTargetAtTime(on ? 0.012 : 0, ctx.currentTime, 0.15);
}

/* ------------------------------ helpers ------------------------------ */
function noise(dur, { type = 'bandpass', f = 1000, q = 1, gain = 0.5, attack = 0.002, when = 0, sweepTo = null, dest = sfxBus } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const s = ctx.createBufferSource(); s.buffer = noiseBuf; s.loop = true;
  const fl = ctx.createBiquadFilter(); fl.type = type; fl.frequency.setValueAtTime(f, t); fl.Q.value = q;
  if (sweepTo) fl.frequency.exponentialRampToValueAtTime(sweepTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(fl).connect(g).connect(dest);
  s.start(t, Math.random()); s.stop(t + dur + 0.05);
}

function tone(freq, dur, { type = 'sine', gain = 0.3, attack = 0.005, when = 0, slideTo = null, dest = sfxBus } = {}) {
  if (!ctx) return;
  const t = ctx.currentTime + when;
  const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(gain, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(dest);
  o.start(t); o.stop(t + dur + 0.05);
}

/* ------------------------------ efectos ------------------------------ */
export const sfx = {
  tick() { noise(0.02, { type: 'highpass', f: 3000, gain: 0.25 }); },
  click() {
    noise(0.03, { type: 'bandpass', f: 2500, q: 2, gain: 0.5 });
    tone(1600, 0.03, { type: 'square', gain: 0.05 });
  },
  key() { // tecla de casetera (mecánica)
    noise(0.05, { type: 'bandpass', f: 1400, q: 1.5, gain: 0.6 });
    tone(140, 0.08, { type: 'triangle', gain: 0.25 });
  },
  clunk() {
    tone(150, 0.18, { type: 'sine', gain: 0.6, slideTo: 55 });
    noise(0.08, { type: 'lowpass', f: 1800, gain: 0.5 });
    noise(0.04, { type: 'bandpass', f: 3200, q: 3, gain: 0.25, when: 0.03 });
  },
  door() {
    for (let i = 0; i < 4; i++) noise(0.015, { type: 'bandpass', f: 2800 + i * 300, q: 4, gain: 0.25, when: i * 0.035 });
    noise(0.25, { type: 'bandpass', f: 600, q: 0.8, gain: 0.12, sweepTo: 1600 });
  },
  whoosh() { noise(0.45, { type: 'bandpass', f: 300, q: 0.7, gain: 0.18, attack: 0.15, sweepTo: 1800 }); },
  motor(on = true) {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(on ? 30 : 90, t);
    o.frequency.exponentialRampToValueAtTime(on ? 90 : 25, t + 0.45);
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.08);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
    o.connect(f).connect(g).connect(sfxBus); o.start(t); o.stop(t + 0.55);
  },
  staticBurst(dur = 0.35) {
    noise(dur, { type: 'bandpass', f: 3500, q: 0.3, gain: 0.22, attack: 0.01 });
  },
  tvOn() {
    tone(7800, 0.5, { type: 'sine', gain: 0.025, attack: 0.05 });
    noise(0.3, { type: 'bandpass', f: 2600, q: 0.4, gain: 0.2 });
    tone(60, 0.25, { type: 'sine', gain: 0.25 });
  },
  pop() {
    noise(0.35, { type: 'lowpass', f: 900, gain: 0.35, sweepTo: 120 });
    for (let i = 0; i < 6; i++) noise(0.02, { type: 'highpass', f: 5000, gain: 0.08, when: 0.12 + Math.random() * 0.4 });
  },
  launch() { noise(0.6, { type: 'bandpass', f: 800, q: 3, gain: 0.05, attack: 0.1, sweepTo: 3000 }); },
  blow() { noise(0.7, { type: 'lowpass', f: 1200, gain: 0.4, attack: 0.08, sweepTo: 300 }); },
  horn() {
    if (!ctx) return;
    const t = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(380, t);
    o.frequency.linearRampToValueAtTime(520, t + 0.15);
    o.frequency.setValueAtTime(520, t + 0.6);
    o.frequency.linearRampToValueAtTime(470, t + 0.9);
    const vib = ctx.createOscillator(); vib.frequency.value = 9;
    const vg = ctx.createGain(); vg.gain.value = 12;
    vib.connect(vg).connect(o.frequency);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1400; f.Q.value = 1.2;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.25, t + 0.04);
    g.gain.setValueAtTime(0.25, t + 0.8);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 1);
    o.connect(f).connect(g).connect(sfxBus);
    o.start(t); vib.start(t); o.stop(t + 1.05); vib.stop(t + 1.05);
  },
  chime() {
    [1046.5, 1318.5, 1568, 2093].forEach((f, i) => {
      tone(f, 1.4, { type: 'sine', gain: 0.12, when: i * 0.09 });
      tone(f * 2.01, 0.6, { type: 'sine', gain: 0.03, when: i * 0.09 });
    });
  },
  sparkle() {
    for (let i = 0; i < 5; i++) tone(1800 + Math.random() * 2400, 0.25, { gain: 0.04, when: i * 0.05 });
  },
  paper() { noise(0.3, { type: 'highpass', f: 2500, gain: 0.12, attack: 0.05 }); },
};

/* ------------------------------ pistas ------------------------------ */

// Pista basada en archivo de audio
export class MediaTrack {
  constructor(src) {
    this.src = src;
    this.onended = null;
    this._ended = () => this.onended && this.onended();
  }
  load() {
    if (mediaEl.getAttribute('src') !== this.src) {
      mediaEl.src = this.src;
      mediaEl.load();
    }
    mediaEl.onended = this._ended;
  }
  async play({ spinUp = false } = {}) {
    this.load();
    if (spinUp) mediaEl.playbackRate = 0.5;
    try { await mediaEl.play(); } catch (e) { console.warn(e); }
    if (spinUp) rampRate(0.5, 1, 550);
  }
  pause({ tapeStop = false } = {}) {
    if (tapeStop && !mediaEl.paused) {
      rampRate(1, 0.35, 380, () => { mediaEl.pause(); mediaEl.playbackRate = 1; });
    } else mediaEl.pause();
  }
  stop() { mediaEl.pause(); try { mediaEl.currentTime = 0; } catch (e) {} }
  seek(t) { try { mediaEl.currentTime = Math.max(0, t); } catch (e) {} }
  get currentTime() { return mediaEl.currentTime || 0; }
  get duration() { return isFinite(mediaEl.duration) ? mediaEl.duration : 0; }
  get playing() { return !mediaEl.paused; }
}

let rateTimer = null;
function rampRate(from, to, ms, done) {
  clearInterval(rateTimer);
  const t0 = performance.now();
  mediaEl.playbackRate = from;
  rateTimer = setInterval(() => {
    const k = Math.min(1, (performance.now() - t0) / ms);
    const e = 1 - Math.pow(1 - k, 2);
    mediaEl.playbackRate = from + (to - from) * e;
    if (k >= 1) { clearInterval(rateTimer); done && done(); }
  }, 30);
}

// Cinta en blanco: solo hiss
export class BlankTrack {
  constructor() { this.onended = null; this._t = 0; this._start = 0; this.playing = false; }
  play() { this._start = performance.now() - this._t * 1000; this.playing = true; }
  pause() { this._t = this.currentTime; this.playing = false; }
  stop() { this._t = 0; this.playing = false; }
  seek(t) { this._t = Math.max(0, t); if (this.playing) this._start = performance.now() - this._t * 1000; }
  get currentTime() { return this.playing ? (performance.now() - this._start) / 1000 : this._t; }
  get duration() { return 0; }
}

// "Cumpleaños feliz" en caja musical, sintetizado en vivo
const N = (n) => 440 * Math.pow(2, (n - 69) / 12);
const NOTE = { C4: 60, D4: 62, E4: 64, F4: 65, G4: 67, A4: 69, B4: 71, C5: 72, D5: 74, E5: 76, F5: 77, G5: 79, A5: 81, B5: 83, C6: 84, D6: 86, E6: 88, F6: 89, G6: 91 };

function birthdayScore() {
  const bpm = 96, beat = 60 / bpm;
  const mel = [
    ['G4', 0, .75], ['G4', .75, .25], ['A4', 1, 1], ['G4', 2, 1], ['C5', 3, 1], ['B4', 4, 2],
    ['G4', 6, .75], ['G4', 6.75, .25], ['A4', 7, 1], ['G4', 8, 1], ['D5', 9, 1], ['C5', 10, 2],
    ['G4', 12, .75], ['G4', 12.75, .25], ['G5', 13, 1], ['E5', 14, 1], ['C5', 15, 1], ['B4', 16, 1], ['A4', 17, 1],
    ['F5', 18, .75], ['F5', 18.75, .25], ['E5', 19, 1], ['C5', 20, 1], ['D5', 21, 1], ['C5', 22, 2],
  ];
  // acordes (raíz, beat)
  const ch = [[48, 1, [0, 4, 7]], [43, 4, [0, 4, 7, 10]], [43, 7, [0, 4, 7, 10]], [48, 10, [0, 4, 7]],
              [48, 13, [0, 4, 7, 10]], [41, 16, [0, 4, 9]], [48, 19, [0, 4, 7]], [43, 21, [0, 4, 7]], [48, 22, [0, 4, 7]]];
  const notes = [];
  const passes = [0, 12]; // segunda vuelta una octava arriba
  const passLen = 25;
  passes.forEach((oct, p) => {
    const off = p * passLen;
    mel.forEach(([n, b, d]) => notes.push({ f: N(NOTE[n] + oct), t: (off + b) * beat, d: Math.max(d * beat, 0.5), g: 0.22, kind: 'box' }));
    ch.forEach(([root, b, iv]) => {
      notes.push({ f: N(root), t: (off + b) * beat, d: 1.6, g: 0.16, kind: 'bass' });
      iv.forEach((x, i) => notes.push({ f: N(root + 12 + x), t: (off + b + 0.02 * i) * beat + 0.5 * beat, d: 0.9, g: 0.05, kind: 'box' }));
    });
  });
  // campanita final
  [84, 88, 91, 96].forEach((n, i) => notes.push({ f: N(n), t: (2 * passLen - 0.5) * beat + i * 0.12, d: 2.2, g: 0.12, kind: 'box' }));
  return { notes, duration: (2 * passLen + 2) * beat };
}

export class SynthTrack {
  constructor(kind = 'birthday') {
    this.score = birthdayScore();
    this.offset = 0; this.playing = false; this.nodes = []; this.onended = null;
  }
  get duration() { return this.score.duration; }
  get currentTime() {
    if (!this.playing) return this.offset;
    return Math.min(ctx.currentTime - this.startAt, this.duration);
  }
  play() {
    if (this.playing) return;
    this.playing = true;
    const now = ctx.currentTime + 0.05;
    this.startAt = now - this.offset;
    for (const n of this.score.notes) {
      if (n.t + 0.01 < this.offset) continue;
      this._note(n, this.startAt + n.t);
    }
    clearTimeout(this._end);
    this._end = setTimeout(() => {
      this.playing = false; this.offset = 0; this._kill();
      this.onended && this.onended();
    }, (this.duration - this.offset) * 1000 + 100);
  }
  _note(n, t) {
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(n.g, t + 0.006);
    g.gain.exponentialRampToValueAtTime(0.0001, t + n.d);
    g.connect(musicBus);
    const parts = n.kind === 'bass' ? [[1, 'triangle', 1]] : [[1, 'sine', 1], [2.0, 'sine', 0.25], [5.4, 'sine', 0.05]];
    for (const [mul, type, amp] of parts) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = n.f * mul;
      const og = ctx.createGain(); og.gain.value = amp;
      o.connect(og).connect(g);
      o.start(t); o.stop(t + n.d + 0.05);
      this.nodes.push(o);
    }
  }
  _kill() { this.nodes.forEach((o) => { try { o.stop(); } catch (e) {} }); this.nodes = []; }
  pause() {
    if (!this.playing) return;
    this.offset = this.currentTime; this.playing = false;
    clearTimeout(this._end); this._kill();
  }
  stop() { this.pause(); this.offset = 0; }
  seek(t) {
    const was = this.playing; this.pause();
    this.offset = Math.max(0, Math.min(t, this.duration - 0.1));
    if (was) this.play();
  }
}
