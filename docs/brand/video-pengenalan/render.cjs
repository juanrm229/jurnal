// Render video pengenalan Sehari ke MP4 (1080×1920, 30 fps).
//   node docs/brand/video-pengenalan/render.cjs [keluaran.mp4] [--musik lagu.m4a] [--stills 0.5,3,7]
// Butuh: playwright (chromium) dan ffmpeg di PATH. Lagu default: musik.m4a di
// folder ini (tidak ikut di-commit). Efek suara dibuat oleh audio.cjs.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DIR = __dirname;
const args = process.argv.slice(2);
const stillsIdx = args.indexOf('--stills');
const stills = stillsIdx >= 0 ? args[stillsIdx + 1].split(',').map(Number) : null;
const musikIdx = args.indexOf('--musik');
const musik = path.resolve(musikIdx >= 0 ? args[musikIdx + 1] : path.join(DIR, 'musik.m4a'));
const valueIdx = [stillsIdx, musikIdx].filter((i) => i >= 0).map((i) => i + 1);
const out = path.resolve(args.find((a, i) => !a.startsWith('--') && !valueIdx.includes(i)) || path.join(DIR, '..', 'sehari-video-pengenalan.mp4'));
const MUSIK_GAIN = 2.8; // lagu aslinya pelan (puncak -11 dB), dinaikkan ±9 dB
const SFX_GAIN = 0.22; // efek suara pelan di bawah lagu
const FPS = 30;

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto('file://' + path.join(DIR, 'index.html') + '?render', { waitUntil: 'networkidle' });
  await page.evaluate(() => window.ready);
  const duration = await page.evaluate(() => window.DURATION);

  if (stills) {
    const sdir = path.dirname(out);
    fs.mkdirSync(sdir, { recursive: true });
    for (const t of stills) {
      await page.evaluate((t) => window.render(t), t);
      await page.screenshot({ path: path.join(sdir, `still-${t.toFixed(2)}.png`) });
    }
    await browser.close();
    console.log('stills ->', sdir);
    return;
  }

  const wav = path.join(path.dirname(out), 'sehari-audio.wav');
  execFileSync('node', [path.join(DIR, 'audio.cjs'), wav], { stdio: 'inherit' });

  if (!fs.existsSync(musik)) throw new Error('lagu tidak ditemukan: ' + musik);
  const frames = Math.round(duration * FPS);
  const fadeAt = (duration - 0.6).toFixed(2);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-i', musik,
    '-i', wav,
    '-filter_complex',
    `[1:a]atrim=0:${duration},asetpts=PTS-STARTPTS,volume=${MUSIK_GAIN},afade=t=out:st=${fadeAt}:d=0.6[m];` +
      `[2:a]atrim=0:${duration},volume=${SFX_GAIN}[s];` +
      `[m][s]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]`,
    '-map', '0:v', '-map', '[a]',
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '192k', '-t', String(duration), '-movflags', '+faststart',
    out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 60 === 0) process.stdout.write(`frame ${f}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  fs.rmSync(wav, { force: true });
  console.log('selesai ->', out);
})();
