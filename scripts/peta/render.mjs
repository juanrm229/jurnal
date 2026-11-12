/** Render peta Sangkala berlapis lewat Chromium: tanah (SVG), relief dan benda (kanvas), lapisan atas (SVG). */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const read = (f) => readFileSync(join(OUT, f), 'utf8');
const html = `<!doctype html><html><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,500&display=swap" rel="stylesheet">
<style>body{margin:0;width:4000px;height:2250px;position:relative;overflow:hidden}
.l{position:absolute;left:0;top:0;width:4000px;height:2250px;display:block}
#relief{mix-blend-mode:overlay;opacity:.7}</style></head><body>
<div class="l">${read('tanah.svg')}</div>
<canvas id="relief" class="l"></canvas>
<canvas id="benda" class="l"></canvas>
<div class="l">${read('atas.svg')}</div>
<script>window.FITUR=${read('fitur.json')};</script>
<script>${readFileSync(join(HERE, 'lukis.js'), 'utf8')}</script>
</body></html>`;
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 4000, height: 2250 }, deviceScaleFactor: 1 });
p.on('pageerror', (e) => console.error('pageerror', e.message));
await p.setContent(html, { timeout: 120000 });
await p.waitForFunction(() => window.SELESAI === true, null, { timeout: 120000 });
await p.waitForTimeout(800);
await p.screenshot({ path: join(OUT, 'sangkala.png'), clip: { x: 0, y: 0, width: 4000, height: 2250 } });
await b.close();
console.log('ok');
