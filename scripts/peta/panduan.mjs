/**
 * Lembar panduan untuk melukis ulang peta Sangkala dengan tangan atau aplikasi gambar.
 *
 *   node scripts/peta/sangkala.mjs   (sekali, menyiapkan out/)
 *   node scripts/peta/panduan.mjs
 *
 * Menghasilkan (4000x2250, sama dengan ukuran akhir peta):
 *   out/panduan-sangkala.png  dasar peta pudar + tapak setiap rumah + titik dan nomor persil + batas wilayah
 *   out/panduan-lapisan.png   hanya tapak, titik, dan batas, berlatar transparan: taruh sebagai lapisan
 *                             teratas di aplikasi gambar, lukis di bawahnya, sembunyikan saat mengekspor
 * Setelah selesai: python3 scripts/peta/pasang.py ilustrasiku.png
 * Aturan: setiap rumah persil harus berdiri di atas tapaknya (titik merah di dekat dinding depan),
 * jalan, sungai, dan batas wilayah boleh digambar ulang tapi jangan digeser.
 */
import { createRequire } from 'node:module';
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const HERE = dirname(fileURLToPath(import.meta.url));
const OUT = join(HERE, 'out');
const read = (f) => readFileSync(join(OUT, f), 'utf8');
const ts = readFileSync(join(HERE, '../../packages/core/src/kotaData.ts'), 'utf8');
const ambil = (nama) => JSON.parse(ts.match(new RegExp(`${nama}[^=]*=\\s*(\\[.*?\\]);`, 's'))[1]);
const DATA = { wilayah: ambil('SANGKALA_WILAYAH'), persil: ambil('SANGKALA_PERSIL'), fitur: JSON.parse(read('fitur.json')) };

const lukis = `
const D = window.DATA, cv = document.getElementById('g'), c = cv.getContext('2d');
cv.width = 4000; cv.height = 2250; c.scale(2, 2);
const rot = ([x, y], a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];
// Batas wilayah dan namanya.
for (const r of D.wilayah) {
  c.beginPath(); r.poly.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y))); c.closePath();
  c.setLineDash(r.musim ? [] : [4, 3]); c.lineWidth = r.musim ? 1.4 : 0.8; c.strokeStyle = r.musim ? 'rgba(42,20,214,.8)' : 'rgba(60,60,70,.55)'; c.stroke();
  c.setLineDash([]); c.font = '600 11px sans-serif'; c.fillStyle = 'rgba(42,20,214,.85)'; c.textAlign = 'center';
  c.fillText(r.name + (r.musim ? '' : ' (belum dibuka)'), r.label[0], r.label[1] - 14);
}
// Tapak semua bangunan yang tergambar.
c.lineWidth = 0.35; c.strokeStyle = 'rgba(20,20,24,.75)'; c.fillStyle = 'rgba(255,255,255,.35)';
for (const [x, y, w, d, a] of D.fitur.houses) {
  const A = (a * Math.PI) / 180;
  c.beginPath(); [[-w / 2, -d / 2], [w / 2, -d / 2], [w / 2, d / 2], [-w / 2, d / 2]].map((p) => rot(p, A)).forEach(([px, py], i) => (i ? c.lineTo(x + px, y + py) : c.moveTo(x + px, y + py)));
  c.closePath(); c.fill(); c.stroke();
}
// Persil: titik merah dan nomornya.
c.font = '3px sans-serif'; c.textAlign = 'center';
for (const [id, _r, x, y] of D.persil) {
  c.beginPath(); c.arc(x, y, 1.1, 0, Math.PI * 2); c.fillStyle = 'rgba(214,30,40,.9)'; c.fill();
  c.fillStyle = 'rgba(120,10,20,.9)'; c.fillText(id.split('.')[1], x, y - 1.8);
}
window.SELESAI = true;`;
const halaman = (dasar) => `<!doctype html><html><head><meta charset="utf-8"><style>body{margin:0;width:4000px;height:2250px;position:relative;overflow:hidden;background:${dasar ? '#fff' : 'transparent'}}
.l{position:absolute;left:0;top:0;width:4000px;height:2250px;display:block}.dasar{opacity:.4;filter:saturate(.35)}</style></head><body>
${dasar ? `<div class="l dasar">${read('tanah.svg')}</div>` : ''}<canvas id="g" class="l"></canvas>
<script>window.DATA=${JSON.stringify(DATA)};</script><script>${lukis}</script></body></html>`;

const b = await chromium.launch();
for (const [nama, dasar] of [['panduan-sangkala.png', true], ['panduan-lapisan.png', false]]) {
  const p = await b.newPage({ viewport: { width: 4000, height: 2250 }, deviceScaleFactor: 1 });
  await p.setContent(halaman(dasar), { timeout: 120000 });
  await p.waitForFunction(() => window.SELESAI === true, null, { timeout: 120000 });
  await p.screenshot({ path: join(OUT, nama), omitBackground: !dasar, clip: { x: 0, y: 0, width: 4000, height: 2250 } });
  await p.close();
  console.log(`out/${nama}`);
}
await b.close();
