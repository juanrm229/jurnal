import { writeFileSync } from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';
import { getDoodle, INK } from '@sehari/doodles';

const PAPER = '#F7F7F4';

const out = path.resolve(import.meta.dirname, '../public/icons');
const d = getDoodle('tunas');
const paths = (sw: number) => d.strokes.map((p) => `<path d="${p}" stroke="${INK}" stroke-width="${sw}" fill="none" stroke-linecap="round" stroke-linejoin="round"/>`).join('');
function render(file: string, size: number, scale: number, radius = 0) {
  const inner = size * scale;
  const off = (size - inner) / 2;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${radius}" fill="${PAPER}"/><g transform="translate(${off} ${off}) scale(${inner / 64})">${paths(2.8)}</g></svg>`;
  writeFileSync(path.join(out, file), new Resvg(svg).render().asPng());
}
render('icon-192.png', 192, 0.66);
render('icon-512.png', 512, 0.66);
render('maskable-512.png', 512, 0.5);
render('apple-touch-icon.png', 180, 0.66);
console.log('ikon dibuat');
