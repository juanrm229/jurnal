/** Render peta Sangkala (SVG) ke PNG lewat Chromium; konversi ke WebP dilakukan oleh render.py. */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const svg = readFileSync(join(HERE, 'out/sangkala.svg'), 'utf8');
const b = await chromium.launch();
const p = await b.newPage({ viewport: { width: 4000, height: 2250 }, deviceScaleFactor: 1 });
await p.setContent(`<!doctype html><html><head><link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@1,9..144,500&display=swap" rel="stylesheet"><style>body{margin:0}svg{display:block}</style></head><body>${svg}</body></html>`);
await p.waitForTimeout(1500);
await p.screenshot({ path: join(HERE, 'out/sangkala.png'), clip: { x: 0, y: 0, width: 4000, height: 2250 } });
await b.close();
console.log('ok');
