// Render video pengenalan Sehari ke MP4 (1080×1920, 30 fps).
//   node docs/brand/video-pengenalan/render.cjs [keluaran.mp4] [--stills 0.5,3,7]
// Butuh: playwright (chromium) dan ffmpeg di PATH. Audio dibuat oleh audio.cjs.
const { chromium } = require('playwright');
const { spawn, execFileSync } = require('child_process');
const path = require('path');
const fs = require('fs');

const DIR = __dirname;
const args = process.argv.slice(2);
const stillsIdx = args.indexOf('--stills');
const stills = stillsIdx >= 0 ? args[stillsIdx + 1].split(',').map(Number) : null;
const out = path.resolve(args.find((a, i) => !a.startsWith('--') && i !== stillsIdx + 1) || path.join(DIR, '..', 'sehari-video-pengenalan.mp4'));
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

  const frames = Math.round(duration * FPS);
  const ff = spawn('ffmpeg', [
    '-y', '-loglevel', 'error',
    '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'png', '-i', '-',
    '-i', wav,
    '-c:v', 'libx264', '-preset', 'slow', '-crf', '18', '-pix_fmt', 'yuv420p', '-profile:v', 'high',
    '-c:a', 'aac', '-b:a', '192k', '-shortest', '-movflags', '+faststart',
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
