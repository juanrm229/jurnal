// Foto profil Sehari (mis. untuk akun Gmail pengirim): tunas di tengah, aman dipotong lingkaran.
import { mkdirSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { getDoodle, INK, PAPER, pathBBox } from '@sehari/doodles';

const out = path.resolve(import.meta.dirname, '../../../docs/brand');
mkdirSync(out, { recursive: true });
const d = getDoodle('tunas');
const [x0, y0, x1, y1] = pathBBox(d.strokes);
function render(file: string, bg: string, ink: string, size = 1024) {
  const target = size * 0.5;
  const k = target / Math.max(x1 - x0, y1 - y0);
  const tx = size / 2 - ((x0 + x1) / 2) * k;
  const ty = size / 2 - ((y0 + y1) / 2) * k;
  const strokes = d.strokes.map((p) => `<path d="${p}" stroke="${ink}" stroke-width="${2.8}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" fill="${bg}"/><g transform="translate(${tx} ${ty}) scale(${k})">${strokes}</g></svg>`;
  writeFileSync(path.join(out, file), new Resvg(svg).render().asPng());
}
render('sehari-profil-biru.png', INK, '#FFFFFF');
render('sehari-profil-kertas.png', PAPER, INK);
console.log('foto profil dibuat di', out);
