// Efek suara video "Dulu Kita Menulis", disintesis dari nol (tanpa sampel).
// Waktu cue ditulis dalam waktu animasi index.html, lalu dipetakan ke waktu
// lagu lewat timing.js. Lagunya dicampur oleh render.cjs.
//   node audio.cjs keluaran.wav [--latar]   (--latar: tambah musik latar sementara)
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

// ---------------- musik latar sementara (dipakai bila lagu belum ada) ----------------
function pluck(t, m, { gain = 0.06, pan = 0, dec = 3.2 } = {}) {
  const s0 = Math.floor(t * SR), n = Math.floor(2.2 * SR), f = mtof(m);
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    const v = (Math.sin(2 * Math.PI * f * s) + 0.35 * Math.sin(4 * Math.PI * f * s) * Math.exp(-s * 6) + 0.12 * Math.sin(6 * Math.PI * f * s) * Math.exp(-s * 9)) * Math.exp(-s * dec) * Math.min(1, k / 60);
    add(s0 + k, v * gain, pan, 0.45);
  }
}
function latar() {
  const BEAT = 60 / 72;
  const CH = [[45, 57, 60, 64, 67], [41, 57, 60, 65, 69], [48, 55, 60, 64, 67], [43, 55, 59, 62, 67]]; // Am7 F C G
  const end = DUR - 1.5;
  for (let b = 0; b * BEAT < end; b++) {
    const t = b * BEAT, ch = CH[Math.floor(b / 4) % 4];
    const fade = Math.min(1, t / 3) * Math.min(1, (end - t) / 3);
    if (b % 4 === 0) pluck(t, ch[0], { gain: 0.09 * fade, dec: 1.2 });
    [1, 2, 3, 4, 3, 2].forEach((j, e) => { if (e < 2 || t > 10) pluck(t + e * BEAT / 3, ch[j] + 12, { gain: 0.035 * fade, pan: (e % 2 ? 0.3 : -0.3) }); });
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
const typing = (t0, t1, n, o = {}) => { for (let c = 0; c < n; c++) tick(t0 + (c / n) * (t1 - t0), { gain: 0.09, f: 2600 + 1400 * Math.abs(rnd()), ...o }); };
function sfx() {
  // 1 · jauh sebelum ada huruf
  typing(0.5, 2.1, 22);
  whoosh(3.7, 0.9, { f0: 300, f1: 2600, gain: 0.28, pan0: 0, pan1: 0 });
  // 2 · kolase + 67.800
  for (let i = 0; i < 7; i++) pop(4.45 + i * 0.09, 420 + i * 70, { gain: 0.16, pan: -0.5 + i * 0.16 });
  for (let k = 0; k < 40; k++) tick(5.15 + k * 0.038, { gain: 0.05, f: 3000 + k * 25 });
  whoosh(7.05, 0.5, { f0: 700, f1: 2400, gain: 0.12 });
  // 3 · tanda
  thump(8.6, { gain: 0.35 });
  pen(8.6, 10.7, { gain: 0.035 });
  // 4 · montase plate
  for (let k = 0; k < 6; k++) { whoosh(10.75 + k * 0.76, 0.22, { f0: 1500, f1: 400, gain: 0.16 }); thump(10.8 + k * 0.76, { gain: 0.14 }); }
  // 5 · cetak biru
  for (let i = 0; i < 5; i++) { pen(15.55 + i * 0.92, 16.05 + i * 0.92, { gain: 0.08 }); tick(15.55 + i * 0.92, { gain: 0.15, f: 1800 }); }
  pop(20.15, 660, { gain: 0.2 });
  typing(20.4, 20.9, 15);
  whoosh(21.2, 0.45, { f0: 800, f1: 2600, gain: 0.12 });
  // 6 · babak II
  whoosh(21.55, 0.8, { f0: 2500, f1: 200, gain: 0.3, pan0: 0, pan1: 0 });
  typing(21.85, 22.8, 18, { f: 1800 });
  for (let i = 0; i < 8; i++) pop(22.0 + i * 0.12, 900 + i * 60, { gain: 0.08, pan: -0.6 + i * 0.17 });
  // 7 · surat
  for (let k = 0; k < 6; k++) whoosh(24.35 + k * 1.37, 0.3, { f0: 600, f1: 3000, gain: 0.2, pan0: 0.5, pan1: -0.5 });
  thump(24.87, { gain: 0.7 });
  pop(25.9, 1568, { gain: 0.14 }); pop(26.0, 1568, { gain: 0.12 }); // bel sepeda
  pen(26.9, 27.9, { gain: 0.07 });
  tick(28.65, { gain: 0.3, f: 2000 }); tick(28.7, { gain: 0.25, f: 3200 });
  for (let c = 0; c < 30; c++) { tick(29.6 + c * 0.034, { gain: 0.16, f: 1500 + 500 * Math.abs(rnd()) }); }
  thump(31.75, { gain: 0.55 });
  // 8 · barisan alat
  for (let i = 0; i < 7; i++) pop(32.8 + i * 0.36, 520 + i * 90, { gain: 0.15 });
  typing(35.4, 37.2, 38);
  // 9 · menyimpan
  whoosh(38.35, 0.6, { f0: 3000, f1: 300, gain: 0.25, pan0: 0, pan1: 0 });
  for (let k = 0; k < 24; k++) pop(38.5 + k * 0.13, 1300 + (k % 3) * 200, { gain: 0.05, dur: 0.05 });
  // 10 · kutipan
  whoosh(41.95, 0.7, { f0: 400, f1: 1600, gain: 0.12 });
  pen(46.6, 47.2, { gain: 0.07 });
  // 11 · dinding kata
  whoosh(48.15, 0.8, { f0: 250, f1: 2000, gain: 0.22 });
  [48.5, 49.1, 49.7].forEach((t, i) => { pop(t, [523, 659, 784][i], { gain: 0.18 }); whoosh(t - 0.05, 0.3, { f0: 2000, f1: 600, gain: 0.1 }); });
  // 12 · kapsul
  typing(51.25, 52.0, 24);
  pop(52.25, 330, { gain: 0.25 });
  whoosh(52.45, 0.45, { f0: 600, f1: 2600, gain: 0.14 });
  // 13 · Sehari adalah
  whoosh(53.75, 0.6, { f0: 300, f1: 2500, gain: 0.26, pan0: 0, pan1: 0 });
  pop(54.7, 440, { gain: 0.22 });
  for (let k = 0; k < 6; k++) { whoosh(55.0 + k * 0.8, 0.25, { f0: 900, f1: 2800, gain: 0.1 }); pop(55.05 + k * 0.8, 880, { gain: 0.08 }); }
  // 14 · sapaan
  typing(60.7, 62.4, 36);
  tick(62.6, { gain: 0.25, f: 1500 }); pop(62.68, 300, { gain: 0.22 });
  // 15 · penutup
  whoosh(63.15, 0.8, { f0: 250, f1: 3200, gain: 0.3, pan0: 0, pan1: 0 });
  pen(63.55, 64.65, { gain: 0.06 });
  for (let i = 0; i < 6; i++) tick(64.4 + i * 0.05, { gain: 0.09, f: 2600 + i * 200 });
  pop(65.7, 880, { gain: 0.18 });
}

if (process.argv.includes('--latar')) latar();
sfx();
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
fs.writeFileSync(process.argv[2] || 'sehari-sfx.wav', out);
console.log('audio ->', process.argv[2] || 'sehari-sfx.wav');
