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
#relief{mix-blend-mode:overlay;opacity:.7}
.kertas{mix-blend-mode:multiply;opacity:.16}
.cat{mix-blend-mode:soft-light;opacity:.32}</style></head><body>
<div class="l">${read('tanah.svg')}</div>
<canvas id="relief" class="l"></canvas>
<canvas id="benda" class="l"></canvas>
<svg class="l cat" viewBox="0 0 4000 2250"><filter id="cat" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.0035" numOctaves="3" seed="11"/><feColorMatrix values="0 0 0 0 0.55  0 0 0 0 0.45  0 0 0 0 0.3  0 0 0 1.6 -0.5"/></filter><rect width="4000" height="2250" filter="url(#cat)"/></svg>
<div class="l">${read('atas.svg')}</div>
<svg class="l kertas" viewBox="0 0 4000 2250"><filter id="kertas" x="0" y="0" width="100%" height="100%"><feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed="5"/><feColorMatrix type="saturate" values="0"/><feComponentTransfer><feFuncR type="linear" slope="0.6" intercept="0.42"/><feFuncG type="linear" slope="0.6" intercept="0.4"/><feFuncB type="linear" slope="0.6" intercept="0.36"/></feComponentTransfer></filter><rect width="4000" height="2250" filter="url(#kertas)"/><radialGradient id="tepi" cx="50%" cy="50%" r="75%"><stop offset="60%" stop-color="#fff" stop-opacity="0"/><stop offset="100%" stop-color="#6b5236" stop-opacity="0.55"/></radialGradient><rect width="4000" height="2250" fill="url(#tepi)"/></svg>
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
