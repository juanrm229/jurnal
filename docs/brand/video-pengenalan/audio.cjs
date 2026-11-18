// Audio video pengenalan Sehari: musik latar + efek suara, disintesis dari nol
// (tanpa sampel, jadi bebas hak cipta). Waktu cue mengikuti timeline index.html.
//   node audio.cjs keluaran.wav
const fs = require('fs');

const SR = 44100;
const DUR = 25.5;
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
function chime(t, base = 1046.5, { gain = 0.16, dur = 2.4 } = {}) {
  const s0 = Math.floor(t * SR), n = Math.floor(dur * SR);
  const parts = [[1, 1], [2.0, 0.45], [3.01, 0.22], [4.17, 0.12]];
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    let v = 0;
    for (const [r, a] of parts) v += Math.sin(2 * Math.PI * base * r * s) * a * Math.exp(-s * (1.6 + r));
    add(s0 + k, v * gain * Math.min(1, k / 80), 0, 0.5);
  }
}

// ---------------- musik ----------------
const BPM = 100, BEAT = 60 / BPM;
const CHORDS = [
  [53, 57, 60, 64, 67], // Fmaj9 (F A C E G)
  [57, 60, 64, 67, 71], // Am7 add9-ish
  [50, 57, 60, 64, 65], // Dm9
  [46, 53, 57, 60, 62], // Bbmaj9
];
const chordAt = (t) => CHORDS[Math.floor(Math.max(0, t) / (BEAT * 8)) % CHORDS.length];
const MUTE = [[11.5, 12.45]]; // hening sebelum lak dihantamkan
const muted = (t) => MUTE.some(([a, b]) => t >= a && t < b);

function pad() {
  const lp = [biquad(), biquad()];
  const phs = new Float64Array(20);
  for (let i = 0; i < N; i++) {
    const t = i / SR;
    let master = Math.min(1, t / 1.5) * (t > 24.3 ? Math.max(0, 1 - (t - 24.3) / 1.2) : 1);
    if (muted(t)) master *= 0.25;
    const ch = t < 21.7 ? chordAt(t) : CHORDS[0];
    let vl = 0, vr = 0;
    ch.forEach((m, j) => {
      for (let d = 0; d < 2; d++) {
        const idx = j * 2 + d;
        phs[idx] += 2 * Math.PI * mtof(m) * (d ? 1.004 : 0.996) / SR;
        const tri = (2 / Math.PI) * Math.asin(Math.sin(phs[idx]));
        if (d) vr += tri; else vl += tri;
      }
    });
    const cut = 900 + 500 * Math.sin(t * 0.4);
    L[i] += lp[0](vl, 'lp', cut, 0.7) * 0.042 * master;
    R[i] += lp[1](vr, 'lp', cut, 0.7) * 0.042 * master;
    RL[i] += vl * 0.004 * master; RR[i] += vr * 0.004 * master;
  }
}
function pluck(t, m, { gain = 0.06, pan = 0 } = {}) {
  const s0 = Math.floor(t * SR), n = Math.floor(0.5 * SR);
  const f = mtof(m);
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    const v = (Math.sin(2 * Math.PI * f * s) + 0.3 * Math.sin(4 * Math.PI * f * s) * Math.exp(-s * 12)) * Math.exp(-s * 7) * Math.min(1, k / 40);
    add(s0 + k, v * gain, pan, 0.35);
  }
}
function kick(t, gain = 0.55) {
  const s0 = Math.floor(t * SR), n = Math.floor(0.32 * SR);
  let ph = 0;
  for (let k = 0; k < n; k++) {
    const s = k / SR;
    ph += 2 * Math.PI * (48 + 90 * Math.exp(-s * 35)) / SR;
    add(s0 + k, Math.sin(ph) * Math.exp(-s * 11) * gain, 0, 0);
  }
}
function hat(t, gain = 0.05, open = false) {
  const b = biquad();
  const s0 = Math.floor(t * SR), n = Math.floor((open ? 0.16 : 0.04) * SR);
  for (let k = 0; k < n; k++) add(s0 + k, b(rnd(), 'hp', 8000, 0.7) * Math.exp(-k / (n / 4)) * gain, 0.2, 0.05);
}
function music() {
  pad();
  const start = 2.7, end = 21.7;
  for (let b = 0; ; b++) {
    const t = start + b * BEAT;
    if (t >= end) break;
    if (!muted(t)) {
      kick(t, b % 4 === 0 ? 0.36 : 0.27);
      if (t > 5.85) hat(t + BEAT / 2, 0.045, b % 4 === 3);
      if (t > 5.85 && b % 2 === 1) hat(t + BEAT * 0.75, 0.025);
    }
    // arpeggio seperdelapan
    const ch = chordAt(t);
    const pattern = [0, 2, 4, 3, 1, 3, 4, 2];
    for (let e = 0; e < 2; e++) {
      const te = t + e * BEAT / 2;
      if (muted(te)) continue;
      const note = ch[pattern[(b * 2 + e) % 8] % ch.length] + 12;
      pluck(te, note, { gain: 0.065, pan: e ? 0.35 : -0.35 });
    }
  }
  // akor penutup
  CHORDS[0].forEach((m, i) => pluck(21.7 + i * 0.06, m + 12, { gain: 0.07, pan: (i - 2) * 0.2 }));
  kick(21.7, 0.45);
}

// ---------------- cue (ikut timeline index.html) ----------------
function sfx() {
  pop(0.05, 1100, { gain: 0.25 });
  whoosh(0.38, 0.3, { f0: 2500, f1: 500, gain: 0.18 });
  pop(0.6, 420, { gain: 0.3 });
  pen(0.6, 1.55, { gain: 0.06 });
  pop(1.52, 520, { gain: 0.22 });
  for (let i = 0; i < 6; i++) tick(1.62 + i * 0.05, { gain: 0.1, f: 2600 + i * 200, pan: -0.3 + i * 0.12 });
  chime(1.65, 1318.5, { gain: 0.08, dur: 1.6 });
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
  chime(12.5, 523.25, { gain: 0.1, dur: 2.2 });
  whoosh(12.68, 0.45, { f0: 800, f1: 2400, gain: 0.12 });
  // dua sisi
  whoosh(13.42, 0.42, { f0: 500, f1: 5000, gain: 0.4, pan0: 0.7, pan1: -0.7 });
  pop(13.86, 500, { gain: 0.16, pan: -0.4 });
  pop(14.0, 600, { gain: 0.16, pan: 0.4 });
  pop(14.22, 880, { gain: 0.18, pan: 0.4 });
  tick(15.2, { gain: 0.3, f: 2200, pan: 0.4 });
  tick(15.26, { gain: 0.25, f: 3400, pan: 0.4 });
  chime(15.25, 1567.98, { gain: 0.07, dur: 1.4 });
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
  for (let k = 0; k < 14; k++) pluck(17.55 + k * 0.08, [72, 74, 76, 79, 81, 84][k % 6] + (k > 7 ? 12 : 0), { gain: 0.03, pan: -0.6 + k * 0.09 });
  pop(18.7, 1320, { gain: 0.18 });
  // hari jadi halaman
  whoosh(19.52, 0.42, { f0: 500, f1: 5000, gain: 0.4, pan0: 0.7, pan1: -0.7 });
  [19.85, 20.33, 20.81, 21.29].forEach((t, i) => { whoosh(t - 0.05, 0.3, { f0: 600, f1: 2800, gain: 0.13 }); pop(t + 0.05, [523, 587, 659, 784][i], { gain: 0.18 }); });
  pen(21.34, 21.8, { gain: 0.06 });
  // penutup
  whoosh(21.62, 0.6, { f0: 250, f1: 3200, gain: 0.36, pan0: 0, pan1: 0 });
  pen(21.95, 22.8, { gain: 0.06 });
  for (let i = 0; i < 6; i++) tick(22.52 + i * 0.05, { gain: 0.09, f: 2600 + i * 200, pan: -0.3 + i * 0.12 });
  chime(22.85, 1046.5, { gain: 0.16, dur: 2.6 });
  chime(22.87, 1567.98, { gain: 0.07, dur: 2.4 });
  pop(23.42, 880, { gain: 0.18 });
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

music();
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
