// Merakit video tutorial dari rekaman + timeline:
//  - sehari-tutorial.mp4 (1080p) dan sehari-tutorial-720p.mp4: video lengkap
//    dengan narasi dan musik latar pelan yang mengecil saat narasi berbicara.
//  - klip vertikal per bab (hanya layar HP) untuk halaman Panduan di aplikasi.
// Pakai: TUT_OUT=folder node e2e/tutorial/assemble.mjs [folder-klip]
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const OUT = process.env.TUT_OUT || 'e2e/out/tutorial';
const CLIPS = process.argv[2] || 'apps/web/public/panduan';
const t = JSON.parse(fs.readFileSync(`${OUT}/timeline.json`, 'utf8'));
const ff = (args) => execFileSync('ffmpeg', ['-v', 'error', '-y', ...args], { stdio: 'inherit', maxBuffer: 1 << 26 });

// ── Sinkron: baca balikan warna penanda di pojok kanan bawah ────────────────
// Perekam video bisa tertinggal dari jam dinding, jadi waktu tiap peristiwa
// diambil dari videonya sendiri, bukan dari catatan waktu perekam.
const FPS = 25;
const lum = execFileSync('ffmpeg', ['-v', 'error', '-i', t.video, '-vf', `crop=8:8:1910:1070,scale=1:1,format=gray,fps=${FPS}`, '-f', 'rawvideo', '-'], { maxBuffer: 1 << 28 });
const flips = [];
let white = lum[0] > 128;
for (let i = 1; i < lum.length; i++) {
  if (!white && lum[i] > 190) (white = true), flips.push(i / FPS);
  else if (white && lum[i] < 60) (white = false), flips.push(i / FPS);
}
// Cocokkan urutan penanda dengan urutan balikan (pemrograman dinamis): biaya =
// beda jarak antar-peristiwa di catatan vs di video. Balikan palsu boleh dilewati.
const M = t.marks.map((m) => m.t);
const N = M.length;
const F = flips.length;
const SKIP_F = 1.5;
const SKIP_M = 4;
const INF = 1e18;
// dp[i][j]: penanda i cocok dengan balikan j. Penanda boleh tidak terlihat
// (dua balikan dalam satu frame), balikan boleh palsu; keduanya kena denda.
const dp = Array.from({ length: N }, () => new Float64Array(F).fill(INF));
const prev = Array.from({ length: N }, () => new Array(F).fill(null));
for (let i = 0; i < Math.min(N, 4); i++) for (let j = 0; j < F; j++) dp[i][j] = j * SKIP_F + i * SKIP_M;
for (let i = 1; i < N; i++) {
  for (let j = 1; j < F; j++) {
    for (let a = Math.max(0, i - 4); a < i; a++) {
      for (let k = Math.max(0, j - 8); k < j; k++) {
        if (dp[a][k] >= INF) continue;
        const c = dp[a][k] + Math.abs(flips[j] - flips[k] - (M[i] - M[a])) + (j - k - 1) * SKIP_F + (i - a - 1) * SKIP_M;
        if (c < dp[i][j]) (dp[i][j] = c), (prev[i][j] = [a, k]);
      }
    }
  }
}
let end = null;
let bestC = INF;
for (let i = Math.max(0, N - 4); i < N; i++)
  for (let k = 0; k < F; k++) {
    const c = dp[i][k] + (F - 1 - k) * SKIP_F + (N - 1 - i) * SKIP_M;
    if (c < bestC) (bestC = c), (end = [i, k]);
  }
const mapped = new Array(N).fill(null);
for (let p = end; p; p = prev[p[0]][p[1]]) mapped[p[0]] = flips[p[1]];
// Penanda yang tidak terlihat: pakai geser penanda terdekat yang cocok.
const matchedIdx = mapped.map((x, i) => (x === null ? -1 : i)).filter((i) => i >= 0);
for (let i = 0; i < N; i++) {
  if (mapped[i] !== null) continue;
  const near = matchedIdx.reduce((b, k) => (Math.abs(k - i) < Math.abs(b - i) ? k : b), matchedIdx[0]);
  mapped[i] = M[i] + (mapped[near] - M[near]);
}
const errs = mapped.slice(1).map((x, i) => Math.abs(x - mapped[i] - (M[i + 1] - M[i])));
const unmatched = N - matchedIdx.length;
const at = (k) => mapped[k];
const markOf = (what) => t.marks.findIndex((m) => m.what === what);
for (const v of t.voice) v.t = at(v.m);
const chs = t.chapters.map((c, i) => ({
  id: c.id,
  start: at(markOf(`bab:${c.id}`)),
  body: at(c.bodyMark),
  end: i + 1 < t.chapters.length ? at(markOf(`bab:${t.chapters[i + 1].id}`)) : at(t.endMark),
}));
const start = Math.max(0, chs[0].start - 0.2);
const total = at(t.endMark) + 0.6 - start;
console.log(`sinkron: ${flips.length} balikan di video untuk ${t.marks.length} penanda (${unmatched} tidak ketemu); geser terbesar ${Math.max(...t.marks.map((m, k) => Math.abs(mapped[k] - m.t))).toFixed(1)} dtk`);
// Tutup kotak penanda dengan warna latar panggung.
const hide = 'drawbox=x=1906:y=1066:w=14:h=14:color=0xdde3fd:t=fill';

// ── Musik latar: progresi Am–F–C–G yang lembut ──────────────────────────────
const chords = [
  [220.0, 261.63, 329.63],
  [174.61, 220.0, 261.63],
  [196.0, 261.63, 329.63],
  [196.0, 246.94, 293.66],
];
const seg = 8;
const pads = chords.map((c, i) => {
  const f = `${OUT}/pad${i}.wav`;
  const expr = `0.045*(sin(2*PI*${c[0]}*t)+0.8*sin(2*PI*${c[1]}*t)+0.7*sin(2*PI*${c[2]}*t)+0.9*sin(2*PI*${c[0] / 2}*t))*(0.8+0.2*sin(2*PI*0.25*t))`;
  ff(['-f', 'lavfi', '-i', `aevalsrc=${expr}:s=44100:d=${seg + 2}`, '-af', 'afade=t=in:d=2,afade=t=out:st=' + seg + ':d=2', f]);
  return f;
});
// Gabungkan dengan crossfade, lalu ulangi sepanjang video.
const loop = `${OUT}/pad-loop.wav`;
ff([...pads.flatMap((p) => ['-i', p]), '-filter_complex', '[0][1]acrossfade=d=2[a];[a][2]acrossfade=d=2[b];[b][3]acrossfade=d=2,lowpass=f=1100,aecho=0.8:0.55:90|170:0.25|0.15[o]', '-map', '[o]', loop]);
const music = `${OUT}/music.wav`;
ff(['-stream_loop', '-1', '-i', loop, '-t', String(total + 1), '-af', `afade=t=in:d=3,afade=t=out:st=${Math.max(0, total - 4)}:d=4`, music]);

// ── Narasi di waktunya masing-masing ───────────────────────────────────────
const voice = `${OUT}/voice.wav`;
const vs = t.voice.filter((v) => v.t >= start);
const inputs = vs.flatMap((v) => ['-i', v.file]);
const delays = vs.map((v, i) => `[${i}]aresample=44100,adelay=${Math.round((v.t - start) * 1000)}:all=1[v${i}]`).join(';');
ff([...inputs, '-filter_complex', `${delays};${vs.map((_, i) => `[v${i}]`).join('')}amix=inputs=${vs.length}:normalize=0:dropout_transition=0,apad=whole_dur=${total + 1}[o]`, '-map', '[o]', '-t', String(total + 1), voice]);

// Musik mengecil saat ada narasi (sidechain), lalu dicampur.
const mix = `${OUT}/mix.wav`;
ff(['-i', voice, '-i', music, '-filter_complex', '[1][0]sidechaincompress=threshold=0.015:ratio=10:attack=30:release=600[m];[0][m]amix=inputs=2:normalize=0:weights=1 0.55,alimiter=limit=0.95[o]', '-map', '[o]', mix]);

// ── Video lengkap ──────────────────────────────────────────────────────────
ff(['-ss', String(start), '-i', t.video, '-i', mix, '-map', '0:v', '-map', '1:a', '-t', String(total), '-vf', hide, '-c:v', 'libx264', '-preset', 'medium', '-crf', '23', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-b:a', '128k', '-movflags', '+faststart', `${OUT}/sehari-tutorial.mp4`]);
ff(['-i', `${OUT}/sehari-tutorial.mp4`, '-vf', 'scale=1280:720', '-c:v', 'libx264', '-preset', 'medium', '-crf', '26', '-c:a', 'copy', '-movflags', '+faststart', `${OUT}/sehari-tutorial-720p.mp4`]);

// ── Klip vertikal per bab (hanya layar HP) ──────────────────────────────────
fs.mkdirSync(CLIPS, { recursive: true });
const chapters = [];
for (const c of chs) {
  if (c.end - c.body < 4) continue;
  const a = c.body - start;
  const d = c.end - c.body;
  const file = `${CLIPS}/${c.id}.mp4`;
  // Layar HP di panggung 1920×1080: x=243, y=36, 540×1008.
  ff(['-ss', String(c.body), '-i', t.video, '-ss', String(a), '-i', voice, '-map', '0:v', '-map', '1:a', '-t', String(d), '-vf', 'crop=540:1008:243:36,scale=432:806', '-c:v', 'libx264', '-preset', 'slow', '-crf', '30', '-pix_fmt', 'yuv420p', '-r', '25', '-c:a', 'aac', '-ac', '1', '-b:a', '64k', '-movflags', '+faststart', file]);
  ff(['-ss', String(c.body + Math.min(3, d / 2)), '-i', t.video, '-frames:v', '1', '-vf', 'crop=540:1008:243:36,scale=432:806', '-q:v', '5', `${CLIPS}/${c.id}.jpg`]);
  chapters.push({ id: c.id, at: Math.round((c.start - start) * 10) / 10, dur: Math.round(d) });
  console.log(`  klip ${c.id}: ${Math.round(d)} dtk`);
}
fs.writeFileSync(`${OUT}/chapters.json`, JSON.stringify(chapters, null, 2));
console.log('selesai:', `${OUT}/sehari-tutorial.mp4`, chapters.length, 'klip');
