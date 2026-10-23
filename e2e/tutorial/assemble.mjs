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
// Cocokkan tiap penanda dengan balikan terdekat, mengikuti geser yang berubah pelan.
// Geser awal dicari dengan mencoba banyak kemungkinan dan memilih yang paling banyak cocok.
function align(off0) {
  let off = off0;
  let j = 0;
  const out = [];
  for (const m of t.marks) {
    let best = -1;
    for (let k = j; k < flips.length && flips[k] < m.t + off + 2; k++) {
      if (Math.abs(flips[k] - (m.t + off)) < 1.2 && (best < 0 || Math.abs(flips[k] - (m.t + off)) < Math.abs(flips[best] - (m.t + off)))) best = k;
    }
    if (best >= 0) {
      out.push(flips[best]);
      off = flips[best] - m.t;
      j = best + 1;
    } else out.push(null);
  }
  return out;
}
let mapped = [];
for (let o = -6; o <= 6; o += 0.04) {
  const r = align(o);
  if (r.filter((x) => x !== null).length > mapped.filter((x) => x !== null).length) mapped = r;
}
// Penanda yang tidak ketemu: isi dengan geser dari tetangganya.
const unmatched = mapped.filter((x) => x === null).length;
for (let k = 0; k < mapped.length; k++) {
  if (mapped[k] !== null) continue;
  const p = mapped.slice(0, k).findLastIndex((x) => x !== null);
  mapped[k] = t.marks[k].t + (p >= 0 ? mapped[p] - t.marks[p].t : 0);
}
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
