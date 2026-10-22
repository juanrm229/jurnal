/** Membuat ikon & splash dari doodle tunas (tinta biru di kertas abu). */
import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { getDoodle, INK, PAPER } from '@sehari/doodles';

const out = path.resolve(import.meta.dirname, '../assets/images');
const d = getDoodle('tunas');
const paths = (color: string, sw: number) =>
  d.strokes.map((p) => `<path d="${p}" stroke="${color}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('') +
  (d.fills ?? []).map((p) => `<path d="${p}" fill="${color}"/>`).join('');

function render(file: string, size: number, opts: { bg?: string; color: string; scale: number; sw?: number }) {
  const inner = size * opts.scale;
  const off = (size - inner) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
${opts.bg ? `<rect width="${size}" height="${size}" fill="${opts.bg}"/>` : ''}
<g transform="translate(${off} ${off}) scale(${inner / 64})">${paths(opts.color, opts.sw ?? 2.6)}</g></svg>`;
  writeFileSync(path.join(out, file), new Resvg(svg).render().asPng());
}

render('icon.png', 1024, { bg: PAPER, color: INK, scale: 0.62, sw: 2.8 });
render('adaptive-icon.png', 1024, { color: INK, scale: 0.46, sw: 2.8 });
render('splash.png', 512, { color: INK, scale: 0.9 });
render('splash-dark.png', 512, { color: '#B3ACFF', scale: 0.9 });
render('favicon.png', 96, { bg: PAPER, color: INK, scale: 0.8, sw: 3.4 });
console.log('ikon dibuat di', out);
