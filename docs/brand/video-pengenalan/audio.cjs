// Efek suara video pengenalan Sehari, disintesis dari nol (tanpa sampel).
// Waktu cue ditulis dalam waktu animasi index.html, lalu dipetakan ke waktu
// lagu lewat timing.js. Musiknya sendiri dicampur oleh render.cjs.
//   node audio.cjs keluaran.wav
const fs = require('fs');

const SR = 44100;
const TIMING = require('./timing.js');
const DUR = TIMING.VIDEO_DURATION + 0.5;
const N = Math.ceil(SR * DUR);
const L = new Float32Array(N), R = new Float32Array(N);
const RL = new Float32Array(N), RR = new Float32Array(N); // kirim ke reverb

let seed = 7;
const rnd = () => ((seed = (seed * 1664525 + 1013904223) >>> 0) / 4294967296) * 2 - 1;
const clamp = (x, a, b) => Math.min(b, Math.max(a, x));

function add(i, v, pan = 0, rev = 0) {
  if (i < 0 || i >= N) return;
  const gl = Math.cos((pan + 1) * Math.PI / 4), gr = Math.sin((pan + 1) * Math.PI / 4);
  L[i] += v * gl; R[i] += v * gr;
  if (rev) { RL[i] += v * gl * rev; RR[i] += v * gr * rev; }
}
// biquad bandpass/lowpass/highpass (RBJ), koefisien dihitung ulang tiap sampel
function biquad() {
  let x1 = 0, x2 = 0, y1 = 0, y2 = 0;
  return (x, type, f, q) => {
    const w = 2 * Math.PI * clamp(f, 20, SR * 0.45) / SR, c = Math.cos(w), a = Math.sin(w) / (2 * q);
    let b0, b1, b2;
    if (type === 'bp') { b0 = a; b1 = 0; b2 = -a; }
    else if (type === 'lp') { b0 = (1 - c) / 2; b1 = 1 - c; b2 = (1 - c) / 2; }
    else { b0 = (1 + c) / 2; b1 = -(1 + c); b2 = (1 + c) / 2; }
    const a0 = 1 + a, a1 = -2 * c, a2 = 1 - a;
    const y = (b0 * x + b1 * x1 + b2 * x2 - a1 * y1 - a2 * y2) / a0;
    x2 = x1; x1 = x; y2 = y1; y1 = y;
    return y;
  };
}
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);

// ---------------- efek suara ----------------
function whoosh(t, dur, { f0 = 300, f1 = 3000, gain = 0.35, pan0 = -0.4, pan1 = 0.4, q = 1.2, rev = 0.25 } = {}) {
  const f = biquad(), g = biquad();
  const s0 = Math.floor(t * SR), n = Math.floor(dur * SR);
  for (let k = 0; k < n; k++) {
    const p = k / n;
    const env = Math.pow(Math.sin(Math.PI * Math.pow(p, 0.7)), 2);
    const fc = f0 * Math.pow(f1 / f0, p);
    const v = g(f(rnd(), 'bp', fc, q), 'lp', fc * 2.5, 0.7) * env * gain * 2.2;
    add(s0 + k, v, pan0 + (pan1 - pan0) * p, rev);
  }
}
function pop(t, freq = 700, { gain = 0.28, pan = 0, dur = 0.09, rev = 0.15 } = {}) {
  const s0 = Math.floor(t * SR), n = Math.floor(dur * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const p = k / n;
    const fr = freq * (1.6 - 0.6 * Math.min(1, p * 3));
    ph += 2 * Math.PI * fr / SR;
    const env = Math.min(1, k / 60) * Math.exp(-p * 6);
    add(s0 + k, Math.sin(ph) * env * gain, pan, rev);
  }
}
function tick(t, { gain = 0.12, f = 3200, pan = 0 } = {}) {
  const b = biquad();
  const s0 = Math.floor(t * SR), n = Math.floor(0.022 * SR);
  for (let k = 0; k < n; k++) add(s0 + k, b(rnd(), 'bp', f, 2.5) * Math.exp(-k / (n / 5)) * gain * 4, pan, 0.05);
}
function pen(t0, t1, { gain = 0.07, pan = 0 } = {}) {
  const b = biquad(), h = biquad();
  const s0 = Math.floor(t0 * SR), n = Math.floor((t1 - t0) * SR);
  for (let k = 0; k < n; k++) {
    const p = k / n;
    const env = Math.sin(Math.PI * p) * (0.6 + 0.4 * Math.sin(k / SR * 2 * Math.PI * 9));
    add(s0 + k, h(b(rnd(), 'bp', 2400 + 900 * Math.sin(p * 20), 0.9), 'hp', 900, 0.7) * env * gain * 3, pan, 0.05);
  }
}
function thump(t, { gain = 0.9 } = {}) {
  const s0 = Math.floor(t * SR), n = Math.floor(1.4 * SR);
  let ph = 0;
  const b = biquad();
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    const fr = 38 + 110 * Math.exp(-s * 18);
    ph += 2 * Math.PI * fr / SR;
    const body = Math.sin(ph) * Math.exp(-s * 4.2);
    const crack = b(rnd(), 'lp', 1800, 0.8) * Math.exp(-s * 30) * 1.6;
    add(s0 + k, (body + crack) * gain, 0, 0.35);
  }
}
function riser(t0, t1, { gain = 0.22 } = {}) {
  const b = biquad();
  const s0 = Math.floor(t0 * SR), n = Math.floor((t1 - t0) * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const p = k / n;
    const env = Math.pow(p, 1.8);
    ph += 2 * Math.PI * (180 + 520 * p * p) / SR;
    const v = b(rnd(), 'bp', 400 + 5000 * p * p, 1.4) * 1.8 + Math.sin(ph) * 0.35;
    add(s0 + k, v * env * gain, 0, 0.3);
  }
}
// ---------------- cue (ikut timeline index.html) ----------------
// semua waktu di bawah = waktu animasi; dibungkus agar jatuh di waktu lagu
{
  const V = TIMING.videoAt;
  const w = (fn) => (t, ...a) => fn(V(t), ...a);
  const w2 = (fn) => (t0, t1, ...a) => fn(V(t0), V(t1), ...a);
  whoosh = w(whoosh); pop = w(pop); tick = w(tick); thump = w(thump);
  pen = w2(pen); riser = w2(riser);
}
function sfx() {
  pop(0.05, 1100, { gain: 0.25 });
  whoosh(0.38, 0.3, { f0: 2500, f1: 500, gain: 0.18 });
  pop(0.6, 420, { gain: 0.3 });
  pen(0.6, 1.55, { gain: 0.06 });
  pop(1.52, 520, { gain: 0.22 });
  for (let i = 0; i < 6; i++) tick(1.62 + i * 0.05, { gain: 0.1, f: 2600 + i * 200, pan: -0.3 + i * 0.12 });
  whoosh(2.5, 0.55, { f0: 400, f1: 4000, gain: 0.32, pan0: 0, pan1: 0 });
  // kalimat
  [2.8, 2.9, 3.0].forEach((t, i) => whoosh(t, 0.25, { f0: 900, f1: 2600, gain: 0.12, pan0: -0.5, pan1: 0.2 + i * 0.1 }));
  pen(3.8, 4.1, { gain: 0.13, pan: 0.3 });
  pen(4.0, 4.3, { gain: 0.13, pan: -0.3 });
  whoosh(4.4, 0.4, { f0: 600, f1: 3500, gain: 0.2 });
  [4.7, 4.8, 4.9].forEach((t) => whoosh(t, 0.25, { f0: 900, f1: 2600, gain: 0.11 }));
  pen(5.25, 5.65, { gain: 0.1 });
  pop(5.65, 660, { gain: 0.3, pan: -0.3 });
  pop(5.72, 990, { gain: 0.18, pan: -0.3 });
  // hari ini
  whoosh(5.8, 0.75, { f0: 200, f1: 2600, gain: 0.38, pan0: 0, pan1: 0 });
  whoosh(6.1, 0.8, { f0: 1800, f1: 250, gain: 0.25, pan0: 0, pan1: 0 });
  [6.75, 6.83, 6.91].forEach((t, i) => pop(t, 800 + i * 150, { gain: 0.15, pan: 0.4 }));
  const NOTE = 'tadi lihat kucing tidur di atas motor orang. langsung ingat kamu.';
  for (let c = 0; c < NOTE.length; c++) {
    const t = 6.9 + (c / NOTE.length) * 1.3;
    if (NOTE[c] !== ' ') tick(t, { gain: 0.09 + 0.03 * Math.abs(rnd()), f: 2600 + 1200 * Math.abs(rnd()), pan: -0.15 + (c % 7) * 0.05 });
  }
  for (let i = 0; i < 5; i++) pop(7.1 + i * 0.22, [523, 659, 784, 880, 1046][i], { gain: 0.2, pan: i % 2 ? 0.5 : -0.5 });
  whoosh(8.15, 0.3, { f0: 3000, f1: 600, gain: 0.2 });
  thump(8.33, { gain: 0.18 });
  [8.6, 8.73, 8.86, 8.99].forEach((t, i) => pop(t, 1200 + i * 180, { gain: 0.14, pan: 0.2 - i * 0.12 }));
  tick(9.5, { gain: 0.2, f: 1800 });
  pop(9.67, 300, { gain: 0.25 });
  whoosh(9.75, 0.75, { f0: 300, f1: 6000, gain: 0.42, pan0: 0, pan1: 0 });
  // segel
  whoosh(10.15, 0.5, { f0: 1500, f1: 300, gain: 0.2 });
  pen(10.6, 10.95, { gain: 0.08 });
  const LAST = 'hari ini cukup. makasih ya.';
  for (let c = 0; c < LAST.length; c++) if (LAST[c] !== ' ') tick(10.75 + (c / LAST.length) * 0.7, { gain: 0.09, f: 2800 + 600 * Math.abs(rnd()) });
  tick(11.4, { gain: 0.22, f: 1500 });
  riser(11.5, 12.45, { gain: 0.26 });
  thump(12.45, { gain: 0.95 });
  whoosh(12.68, 0.45, { f0: 800, f1: 2400, gain: 0.12 });
  // dua sisi
  whoosh(13.42, 0.42, { f0: 500, f1: 5000, gain: 0.4, pan0: 0.7, pan1: -0.7 });
  pop(13.86, 500, { gain: 0.16, pan: -0.4 });
  pop(14.0, 600, { gain: 0.16, pan: 0.4 });
  pop(14.22, 880, { gain: 0.18, pan: 0.4 });
  tick(15.2, { gain: 0.3, f: 2200, pan: 0.4 });
  tick(15.26, { gain: 0.25, f: 3400, pan: 0.4 });
  pop(15.55, 784, { gain: 0.22 });
  pop(15.62, 1175, { gain: 0.14 });
  // angka
  whoosh(16.5, 0.5, { f0: 3500, f1: 400, gain: 0.32, pan0: 0, pan1: 0 });
  whoosh(16.85, 0.5, { f0: 150, f1: 900, gain: 0.2, q: 0.8 });
  let last = -1;
  for (let k = 0; k < 120; k++) {
    const t = 16.9 + k * 0.01;
    const x = Math.min(1, (t - 16.9) / 1.2);
    const v = Math.round(127 * (1 - Math.pow(2, -10 * x)) / 4);
    if (v !== last) { tick(t, { gain: 0.09, f: 3000 + v * 20 }); last = v; }
  }
  [17.25, 17.35, 17.45].forEach((t, i) => pop(t, 660 + i * 110, { gain: 0.12 }));
  pop(18.7, 1320, { gain: 0.18 });
  // hari jadi halaman
  whoosh(19.52, 0.42, { f0: 500, f1: 5000, gain: 0.4, pan0: 0.7, pan1: -0.7 });
  [19.85, 20.33, 20.81, 21.29].forEach((t, i) => { whoosh(t - 0.05, 0.3, { f0: 600, f1: 2800, gain: 0.13 }); pop(t + 0.05, [523, 587, 659, 784][i], { gain: 0.18 }); });
  pen(21.34, 21.8, { gain: 0.06 });
  // penutup
  whoosh(21.62, 0.6, { f0: 250, f1: 3200, gain: 0.36, pan0: 0, pan1: 0 });
  pen(21.95, 23.05, { gain: 0.06 });
  for (let i = 0; i < 6; i++) tick(22.85 + i * 0.05, { gain: 0.09, f: 2600 + i * 200, pan: -0.3 + i * 0.12 });
  pop(24.7, 880, { gain: 0.18 }); // drop lagu
}

// ---------------- reverb sederhana (Schroeder) ----------------
function reverb(inp, out, spread) {
  const combs = [1557, 1617, 1491, 1422].map((d) => ({ buf: new Float32Array(d + spread), i: 0, lp: 0 }));
  const aps = [225, 556].map((d) => ({ buf: new Float32Array(d + spread), i: 0 }));
  for (let n = 0; n < N; n++) {
    let s = 0;
    for (const c of combs) {
      const y = c.buf[c.i];
      c.lp = y * 0.7 + c.lp * 0.3;
      c.buf[c.i] = inp[n] + c.lp * 0.82;
      c.i = (c.i + 1) % c.buf.length;
      s += y;
    }
    for (const a of aps) {
      const b = a.buf[a.i];
      const y = -s * 0.5 + b;
      a.buf[a.i] = s + b * 0.5;
      a.i = (a.i + 1) % a.buf.length;
      s = y;
    }
    out[n] += s * 0.22;
  }
}

sfx();
reverb(RL, L, 0);
reverb(RR, R, 23);

// master: soft clip + normalisasi ke -1 dBFS
let peak = 0;
for (let i = 0; i < N; i++) {
  L[i] = Math.tanh(L[i] * 1.2); R[i] = Math.tanh(R[i] * 1.2);
  peak = Math.max(peak, Math.abs(L[i]), Math.abs(R[i]));
}
const g = 0.89 / peak;
const out = Buffer.alloc(44 + N * 4);
out.write('RIFF', 0); out.writeUInt32LE(36 + N * 4, 4); out.write('WAVE', 8);
out.write('fmt ', 12); out.writeUInt32LE(16, 16); out.writeUInt16LE(1, 20); out.writeUInt16LE(2, 22);
out.writeUInt32LE(SR, 24); out.writeUInt32LE(SR * 4, 28); out.writeUInt16LE(4, 32); out.writeUInt16LE(16, 34);
out.write('data', 36); out.writeUInt32LE(N * 4, 40);
for (let i = 0; i < N; i++) {
  out.writeInt16LE(Math.round(clamp(L[i] * g, -1, 1) * 32767), 44 + i * 4);
  out.writeInt16LE(Math.round(clamp(R[i] * g, -1, 1) * 32767), 46 + i * 4);
}
fs.writeFileSync(process.argv[2] || 'sehari-audio.wav', out);
console.log('audio ->', process.argv[2] || 'sehari-audio.wav');
