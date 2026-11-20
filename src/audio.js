// 全部声音均为 WebAudio 实时合成，无外部音频文件。
let ctx = null, master = null, musicGain = null, ambOut = null, ambIn = null, echo = null;
let enabled = true;
let noiseBuf = null;
const plucks = [];
let musicTimer = 0, crackleTimer = 0;

function makeNoise() {
  const len = ctx.sampleRate * 2;
  const b = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function silentLoopForIOS() {
  // 让 iOS 在静音键打开时依然外放：播放一段循环的静音 <audio>，把音频会话切换为 playback
  try {
    if (navigator.audioSession) navigator.audioSession.type = 'playback';
  } catch (e) { /* ignore */ }
  try {
    const sr = 8000, n = sr / 2;
    const buf = new ArrayBuffer(44 + n * 2);
    const v = new DataView(buf);
    const w = (o, s) => [...s].forEach((c, i) => v.setUint8(o + i, c.charCodeAt(0)));
    w(0, 'RIFF'); v.setUint32(4, 36 + n * 2, true); w(8, 'WAVE'); w(12, 'fmt ');
    v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, sr, true); v.setUint32(28, sr * 2, true); v.setUint16(32, 2, true); v.setUint16(34, 16, true);
    w(36, 'data'); v.setUint32(40, n * 2, true);
    const a = new Audio(URL.createObjectURL(new Blob([buf], { type: 'audio/wav' })));
    a.loop = true; a.setAttribute('playsinline', ''); a.volume = 0.01;
    a.play().catch(() => {});
  } catch (e) { /* ignore */ }
}

function ks(freq, dur = 2.6) {
  const sr = ctx.sampleRate, len = Math.floor(sr * dur);
  const b = ctx.createBuffer(1, len, sr);
  const d = b.getChannelData(0);
  const N = Math.round(sr / freq);
  const ring = new Float32Array(N);
  let last = 0;
  for (let i = 0; i < N; i++) { const x = Math.random() * 2 - 1; last = last * 0.6 + x * 0.4; ring[i] = last; }
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const a = ring[idx], bb = ring[(idx + 1) % N];
    const y = (a + bb) * 0.5 * 0.9965;
    ring[idx] = y; d[i] = a;
    idx = (idx + 1) % N;
  }
  // soft attack
  for (let i = 0; i < 64; i++) d[i] *= i / 64;
  return b;
}

export function initAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return;
  silentLoopForIOS();
  ctx = new AC();
  master = ctx.createGain(); master.gain.value = enabled ? 0.9 : 0;
  master.connect(ctx.destination);
  noiseBuf = makeNoise();

  // 简单回声，给琴声一点空间
  echo = ctx.createDelay(1.0); echo.delayTime.value = 0.32;
  const fb = ctx.createGain(); fb.gain.value = 0.32;
  const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2200;
  echo.connect(lp); lp.connect(fb); fb.connect(echo);
  const wet = ctx.createGain(); wet.gain.value = 0.35; lp.connect(wet); wet.connect(master);

  musicGain = ctx.createGain(); musicGain.gain.value = 0.0;
  musicGain.connect(master); musicGain.connect(echo);

  // 室外风声
  {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 420; f.Q.value = 0.6;
    const g = ctx.createGain(); g.gain.value = 0;
    const lfo = ctx.createOscillator(); lfo.frequency.value = 0.13;
    const lg = ctx.createGain(); lg.gain.value = 180;
    lfo.connect(lg); lg.connect(f.frequency); lfo.start();
    src.connect(f); f.connect(g); g.connect(master); src.start();
    ambOut = g;
  }
  // 室内：暖炉的低鸣 + 屋子的底噪
  {
    const src = ctx.createBufferSource(); src.buffer = noiseBuf; src.loop = true; src.playbackRate.value = 0.5;
    const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 160;
    const g = ctx.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(master); src.start();
    ambIn = g;
  }
  const scale = [293.66, 311.13, 392.0, 440.0, 466.16, 587.33, 622.25, 783.99, 880.0];
  scale.forEach((f) => plucks.push(ks(f)));
  setAmbience(0);
}

export function setAmbience(inside) {
  if (!ctx) return;
  const t = ctx.currentTime;
  ambOut.gain.setTargetAtTime((1 - inside) * 0.22 + 0.025, t, 0.6);
  ambIn.gain.setTargetAtTime(inside * 0.14, t, 0.6);
  musicGain.gain.setTargetAtTime(inside * 0.5, t, 1.5);
}

export function setEnabled(v) {
  enabled = v;
  if (master) master.gain.setTargetAtTime(v ? 0.9 : 0, ctx.currentTime, 0.1);
}
export function isEnabled() { return enabled; }

function noiseShot({ t = 0, dur = 0.2, type = 'bandpass', freq = 1000, freq2 = null, q = 1, gain = 0.3, attack = 0.005, dest = null }) {
  if (!ctx) return;
  const now = ctx.currentTime + t;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  src.playbackRate.value = 0.8 + Math.random() * 0.4;
  const f = ctx.createBiquadFilter(); f.type = type; f.frequency.setValueAtTime(freq, now); f.Q.value = q;
  if (freq2) f.frequency.exponentialRampToValueAtTime(freq2, now + dur);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(f); f.connect(g); g.connect(dest || master);
  src.start(now, Math.random() * 1.5); src.stop(now + dur + 0.05);
}

function tone({ t = 0, freq = 440, dur = 1, gain = 0.1, type = 'sine', dest = null, attack = 0.003 }) {
  const now = ctx.currentTime + t;
  const o = ctx.createOscillator(); o.type = type; o.frequency.value = freq;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(gain, now + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  o.connect(g); g.connect(dest || master);
  o.start(now); o.stop(now + dur + 0.05);
}

/** 南部铁风铃 */
export function chime(strikes = 3) {
  if (!ctx) return;
  const base = [1760, 1975.5, 2093][Math.floor(Math.random() * 3)];
  for (let s = 0; s < strikes; s++) {
    const t = s * (0.18 + Math.random() * 0.22);
    const f = base * (1 + (Math.random() - 0.5) * 0.01);
    [[1, 0.09, 3.2], [2.76, 0.035, 1.8], [5.4, 0.018, 0.9], [8.93, 0.008, 0.5]].forEach(([m, g, d]) => {
      tone({ t, freq: f * m, dur: d * (s === 0 ? 1 : 0.75), gain: g * (s === 0 ? 1 : 0.6), dest: master });
      tone({ t, freq: f * m, dur: d, gain: g * 0.3, dest: echo });
    });
    noiseShot({ t, dur: 0.03, type: 'highpass', freq: 5000, gain: 0.05 });
  }
}

/** 格子拉门：木轨滚动 + 玻璃轻颤 */
export function doorSlide(dur = 1.0) {
  if (!ctx) return;
  noiseShot({ dur, type: 'bandpass', freq: 320, freq2: 200, q: 1.2, gain: 0.25, attack: 0.08 });
  noiseShot({ dur: dur * 0.9, type: 'lowpass', freq: 140, gain: 0.25, attack: 0.1 });
  for (let i = 0; i < 14; i++) {
    noiseShot({ t: Math.random() * dur, dur: 0.035, type: 'bandpass', freq: 2600 + Math.random() * 2000, q: 8, gain: 0.04 + Math.random() * 0.04 });
  }
  noiseShot({ t: dur, dur: 0.12, type: 'lowpass', freq: 500, gain: 0.35 });
}

export function pageFlip() {
  if (!ctx) return;
  noiseShot({ dur: 0.28, type: 'bandpass', freq: 3200, freq2: 900, q: 0.8, gain: 0.22, attack: 0.03 });
  noiseShot({ t: 0.18, dur: 0.12, type: 'highpass', freq: 2500, gain: 0.08 });
}

export function bookOpen() {
  if (!ctx) return;
  tone({ freq: 110, dur: 0.25, gain: 0.18 });
  noiseShot({ dur: 0.18, type: 'lowpass', freq: 700, gain: 0.25 });
  setTimeout(pageFlip, 380);
}

export function bookClose() {
  if (!ctx) return;
  tone({ freq: 95, dur: 0.22, gain: 0.2 });
  noiseShot({ dur: 0.12, type: 'lowpass', freq: 900, gain: 0.3 });
}

export function footstep() {
  if (!ctx) return;
  tone({ freq: 70 + Math.random() * 20, dur: 0.12, gain: 0.08 });
  noiseShot({ dur: 0.09, type: 'lowpass', freq: 380, gain: 0.12 });
  if (Math.random() < 0.08) { // 老地板偶尔吱呀一声
    const now = ctx.currentTime;
    const o = ctx.createOscillator(); o.type = 'sawtooth';
    o.frequency.setValueAtTime(420, now); o.frequency.exponentialRampToValueAtTime(260, now + 0.35);
    const f = ctx.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 900; f.Q.value = 6;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, now); g.gain.exponentialRampToValueAtTime(0.02, now + 0.05); g.gain.exponentialRampToValueAtTime(0.0001, now + 0.38);
    o.connect(f); f.connect(g); g.connect(master); o.start(now); o.stop(now + 0.4);
  }
}

export function snowStep() {
  if (!ctx) return;
  noiseShot({ dur: 0.16, type: 'bandpass', freq: 1400, q: 0.7, gain: 0.07, attack: 0.02 });
}

export function purr() {
  if (!ctx) return;
  const now = ctx.currentTime;
  const src = ctx.createBufferSource(); src.buffer = noiseBuf;
  const f = ctx.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 260;
  const g = ctx.createGain(); g.gain.value = 0;
  const am = ctx.createGain(); am.gain.value = 0;
  const lfo = ctx.createOscillator(); lfo.frequency.value = 24;
  const lg = ctx.createGain(); lg.gain.value = 0.5;
  lfo.connect(lg); lg.connect(am.gain);
  src.connect(f); f.connect(am); am.connect(g); g.connect(master);
  g.gain.setValueAtTime(0.0001, now);
  g.gain.exponentialRampToValueAtTime(0.5, now + 0.3);
  g.gain.setValueAtTime(0.5, now + 1.6);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 2.4);
  src.start(now); lfo.start(now); src.stop(now + 2.5); lfo.stop(now + 2.5);
}

let lastNote = 4;
export function tick(dt, inside) {
  if (!ctx || !enabled) return;
  musicTimer -= dt;
  if (inside > 0.5 && musicTimer <= 0) {
    // 都节音阶的随机短句，像远处有人在拨筝
    const n = 2 + Math.floor(Math.random() * 4);
    let t = 0;
    for (let i = 0; i < n; i++) {
      lastNote = Math.max(0, Math.min(plucks.length - 1, lastNote + Math.floor(Math.random() * 5) - 2));
      const src = ctx.createBufferSource(); src.buffer = plucks[lastNote];
      const g = ctx.createGain(); g.gain.value = 0.22 + Math.random() * 0.1;
      src.connect(g); g.connect(musicGain);
      src.start(ctx.currentTime + t);
      t += [0.35, 0.5, 0.7, 1.0][Math.floor(Math.random() * 4)];
    }
    musicTimer = t + 4 + Math.random() * 7;
  }
  crackleTimer -= dt;
  if (inside > 0.5 && crackleTimer <= 0) {
    noiseShot({ dur: 0.02 + Math.random() * 0.03, type: 'bandpass', freq: 1500 + Math.random() * 2500, q: 3, gain: 0.02 + Math.random() * 0.03 });
    crackleTimer = 0.15 + Math.random() * 1.6;
  }
}
