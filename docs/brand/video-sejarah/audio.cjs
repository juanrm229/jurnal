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
  // 1 · jauh sebelum ada huruf: huruf berhamburan masuk, runtuh jadi tetes tinta
  for (let c = 0; c < 22; c++) tick(0.5 + c * 0.06, { gain: 0.06, f: 3000 + 900 * Math.abs(rnd()), pan: -0.5 + c * 0.045 });
  whoosh(0.3, 1.6, { f0: 200, f1: 1800, gain: 0.18, pan0: -0.6, pan1: 0.6 });
  whoosh(3.3, 0.6, { f0: 2500, f1: 400, gain: 0.2, pan0: 0, pan1: 0 });
  pop(4.28, 260, { gain: 0.35 });
  // 2 · gua
  whoosh(4.25, 0.7, { f0: 150, f1: 1600, gain: 0.3, pan0: 0, pan1: 0 });
  pen(5.0, 5.6, { gain: 0.07 }); pen(5.4, 5.8, { gain: 0.06 });
  for (let k = 0; k < 40; k++) tick(5.2 + k * 0.035, { gain: 0.045, f: 2600 + k * 30 });
  whoosh(6.85, 0.5, { f0: 700, f1: 2400, gain: 0.12 });
  riser(7.6, 8.55, { gain: 0.22 });
  thump(8.5, { gain: 0.5 });
  pen(8.6, 9.6, { gain: 0.05 });
  whoosh(9.05, 0.6, { f0: 600, f1: 2000, gain: 0.1 });
  // 4 · jurnal: kertas naik, foto-foto ditempel
  whoosh(10.55, 0.55, { f0: 3000, f1: 500, gain: 0.25, pan0: 0, pan1: 0 });
  [10.75, 11.42, 12.37, 13.32, 14.27].forEach((t, i) => { whoosh(t - 0.15, 0.35, { f0: 400, f1: 1800, gain: 0.12, pan0: i % 2 ? 0.4 : -0.4, pan1: 0 }); thump(t + 0.08, { gain: 0.12 }); tick(t + 0.3, { gain: 0.12, f: 1600 }); });
  // 5 · cetak biru
  whoosh(15.55, 0.6, { f0: 200, f1: 2200, gain: 0.25, pan0: 0, pan1: 0 });
  [15.85, 16.85, 17.85, 18.85].forEach((t) => { whoosh(t - 0.05, 0.3, { f0: 1800, f1: 500, gain: 0.14 }); pen(t + 0.1, t + 0.55, { gain: 0.06 }); tick(t, { gain: 0.14, f: 1800 }); });
  whoosh(19.85, 0.5, { f0: 600, f1: 2200, gain: 0.12 });
  whoosh(20.5, 0.6, { f0: 500, f1: 2600, gain: 0.14 });
  pen(21.0, 21.35, { gain: 0.08 });
  // 6 · babak II
  whoosh(21.85, 0.8, { f0: 2500, f1: 200, gain: 0.3, pan0: 0, pan1: 0 });
  for (let c = 0; c < 15; c++) thump(22.1 + c * 0.04, { gain: 0.05 });
  whoosh(22.5, 1.6, { f0: 800, f1: 1400, gain: 0.08, pan0: 0.6, pan1: -0.2 });
  for (let i = 0; i < 7; i++) pop(22.2 + i * 0.12, 900 + i * 60, { gain: 0.07, pan: -0.6 + i * 0.2 });
  // 7 · surat
  for (let k = 0; k < 6; k++) whoosh(24.65 + k * 1.37, 0.35, { f0: 500, f1: 3000, gain: 0.2, pan0: 0.5, pan1: -0.5 });
  pen(24.9, 25.9, { gain: 0.05 });
  thump(26.44, { gain: 0.75 });
  pen(27.94, 28.5, { gain: 0.07 });
  pop(29.2, 1568, { gain: 0.12 }); pop(29.3, 1568, { gain: 0.1 });
  for (let c = 0; c < 30; c++) tick(30.33 + c * 0.033, { gain: 0.16, f: 1400 + 500 * Math.abs(rnd()) });
  thump(32.15, { gain: 0.55 });
  // 8 · barisan alat
  whoosh(32.85, 0.5, { f0: 3000, f1: 500, gain: 0.22, pan0: 0, pan1: 0 });
  for (let i = 0; i < 6; i++) pop(33.1 + i * 0.55, 520 + i * 90, { gain: 0.15, pan: -0.5 + i * 0.2 });
  whoosh(33.1, 3.4, { f0: 300, f1: 700, gain: 0.05, pan0: 0.7, pan1: -0.7 });
  // 9 · menyimpan
  whoosh(38.65, 0.6, { f0: 3000, f1: 300, gain: 0.25, pan0: 0, pan1: 0 });
  for (let k = 0; k < 26; k++) pop(38.75 + k * 0.12, 1200 + (k % 4) * 180, { gain: 0.045, dur: 0.05, pan: (k % 5) / 2.5 - 0.8 });
  whoosh(41.4, 0.8, { f0: 2000, f1: 200, gain: 0.16 });
  // 10 · kutipan
  whoosh(42.25, 0.7, { f0: 300, f1: 1600, gain: 0.16, pan0: 0, pan1: 0 });
  pen(47.0, 47.6, { gain: 0.07 });
  // 11 · dinding kata
  whoosh(48.45, 0.8, { f0: 250, f1: 2000, gain: 0.22 });
  [48.8, 49.45, 50.1].forEach((t, i) => { thump(t + 0.1, { gain: 0.25 }); whoosh(t - 0.1, 0.3, { f0: 2400, f1: 500, gain: 0.12 }); pop(t + 0.12, [523, 659, 784][i], { gain: 0.12 }); });
  // 12 · kapsul waktu → kapsul
  whoosh(51.45, 0.55, { f0: 3000, f1: 500, gain: 0.22, pan0: 0, pan1: 0 });
  for (let k = 0; k < 30; k++) tick(51.8 + k * 0.04, { gain: 0.05, f: 2400 + k * 40 });
  for (let c = 0; c < 22; c++) tick(53.5 + c * 0.025, { gain: 0.06, f: 3000 });
  thump(54.17, { gain: 0.8 });
  whoosh(54.3, 0.6, { f0: 500, f1: 2600, gain: 0.14 });
  // 13 · Sehari
  whoosh(55.25, 0.7, { f0: 200, f1: 2600, gain: 0.28, pan0: 0, pan1: 0 });
  whoosh(55.6, 0.7, { f0: 1800, f1: 250, gain: 0.2 });
  for (let c = 0; c < 40; c++) tick(56.3 + c * 0.04, { gain: 0.08, f: 2600 + 1200 * Math.abs(rnd()) });
  for (let i = 0; i < 5; i++) pop(56.7 + i * 0.28, [523, 659, 784, 880, 1046][i], { gain: 0.16, pan: i % 2 ? 0.5 : -0.5 });
  whoosh(57.85, 0.3, { f0: 3000, f1: 600, gain: 0.16 }); thump(58.0, { gain: 0.15 });
  [58.3, 58.43, 58.56].forEach((t, i) => pop(t, 1200 + i * 180, { gain: 0.12 }));
  tick(60.0, { gain: 0.2, f: 1500 });
  // 14 · sapaan
  whoosh(60.65, 0.55, { f0: 3000, f1: 500, gain: 0.2, pan0: 0, pan1: 0 });
  for (let c = 0; c < 36; c++) tick(61.45 + c * 0.043, { gain: 0.08, f: 2600 + 1200 * Math.abs(rnd()) });
  tick(63.15, { gain: 0.25, f: 1500 }); pop(63.22, 300, { gain: 0.22 });
  // 15 · penutup
  whoosh(63.35, 0.8, { f0: 250, f1: 3200, gain: 0.3, pan0: 0, pan1: 0 });
  pen(63.7, 64.8, { gain: 0.06 });
  for (let i = 0; i < 6; i++) tick(64.55 + i * 0.06, { gain: 0.09, f: 2600 + i * 200 });
  pop(65.8, 880, { gain: 0.18 });
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
