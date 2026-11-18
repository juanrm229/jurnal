// Render video "Dulu Kita Menulis" ke MP4 (1080×1920, 30 fps).
//   node docs/brand/video-sejarah/render.cjs [keluaran.mp4] [--musik lagu.m4a] [--gain 1] [--stills 3,9.5]
// Lagu default: musik.m4a di folder ini (tidak di-commit). Kalau tidak ada,
// dipakai musik latar sementara dari audio.cjs. Butuh playwright + ffmpeg.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DIR = __dirname;
const args = process.argv.slice(2);
const opt = (name) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : null; };
const valueIdx = ['--stills', '--musik', '--gain'].map((n) => args.indexOf(n)).filter((i) => i >= 0).map((i) => i + 1);
const stills = opt('--stills') ? opt('--stills').split(',').map(Number) : null;
const musik = path.resolve(opt('--musik') || path.join(DIR, 'musik.m4a'));
const MUSIK_GAIN = +(opt('--gain') || 0.85);
const { MUSIC_START } = require('./timing.js');
const SFX_GAIN = 0.18; // efek suara pelan di bawah lagu
const out = path.resolve(args.find((a, i) => !a.startsWith('--') && !valueIdx.includes(i)) || path.join(DIR, '..', 'sehari-dulu-kita-menulis.mp4'));
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

  const hasMusik = fs.existsSync(musik);
  const wav = path.join(path.dirname(out), 'sehari-sfx.wav');
  execFileSync('node', [path.join(DIR, 'audio.cjs'), wav, ...(hasMusik ? [] : ['--latar'])], { stdio: 'inherit' });
  if (!hasMusik) console.log('musik.m4a tidak ada: memakai musik latar sementara');

  const frames = Math.round(duration * FPS);
  const fadeAt = (duration - 1.6).toFixed(2);
  const audioArgs = hasMusik
    ? ['-i', musik, '-i', wav, '-filter_complex',
      `[1:a]atrim=${MUSIC_START}:${MUSIC_START + duration},asetpts=PTS-STARTPTS,volume=${MUSIK_GAIN},afade=t=in:d=0.15,afade=t=out:st=${fadeAt}:d=1.6[m];` +
      `[2:a]atrim=0:${duration},volume=${SFX_GAIN}[s];[m][s]amix=inputs=2:normalize=0:duration=first,alimiter=limit=0.95[a]`,
      '-map', '0:v', '-map', '[a]']
    : ['-i', wav, '-filter_complex', `[1:a]atrim=0:${duration},loudnorm=I=-17:TP=-1.5,afade=t=out:st=${fadeAt}:d=1.2[a]`, '-map', '0:v', '-map', '[a]'];
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    ...audioArgs,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '19', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '192k', '-t', String(duration), '-movflags', '+faststart',
    out,
  ], { stdio: ['pipe', 'inherit', 'inherit'] });

  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.render(t), f / FPS);
    const buf = await page.screenshot({ type: 'png' });
    if (!ff.stdin.write(buf)) await new Promise((r) => ff.stdin.once('drain', r));
    if (f % 150 === 0) process.stdout.write(`frame ${f}/${frames}\n`);
  }
  ff.stdin.end();
  await new Promise((r) => ff.on('close', r));
  await browser.close();
  fs.rmSync(wav, { force: true });
  console.log('selesai ->', out);
})();
