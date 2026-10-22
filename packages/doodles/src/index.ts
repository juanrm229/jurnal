/**
 * @sehari/doodles — pustaka doodle tinta biru bergaya tangan untuk Sehari.
 * Murni data (string path SVG), tanpa dependensi runtime.
 */
import type { Doodle, DoodleCategory } from './types';
import { fnv1a } from './hash';
import { INK, STROKE_WIDTH, DOODLES, DOODLE_BY_ID } from './catalog';

export type { Doodle, DoodleCategory } from './types';
export { fnv1a } from './hash';
export { transformPath, placeMatrix, pathBBox, type Affine } from './path';
export { SCENES, SCENE_BY_ID, getScene, sceneToSvg, type Scene, type SceneSvgOptions } from './scenes';

export { INK, PAPER, STROKE_WIDTH, DOODLES, DOODLE_BY_ID } from './catalog';

const FALLBACK_ID = 'tunas';

/** Ambil doodle berdasarkan id; jika tidak ada, kembalikan tunas. */
export function getDoodle(id: string): Doodle {
  return DOODLE_BY_ID[id] ?? (DOODLE_BY_ID[FALLBACK_ID] as Doodle);
}

const GARDEN_CATEGORIES: readonly DoodleCategory[] = ['tanaman', 'bunga', 'buah', 'makhluk'];

/** Id doodle yang boleh tumbuh di taman tahunan (satu per hari yang disegel). */
export const GARDEN_IDS: string[] = DOODLES.filter((d) =>
  GARDEN_CATEGORIES.includes(d.category),
).map((d) => d.id);

/** Pilihan doodle taman yang deterministik untuk sebuah seed (mis. `${circleId}:${tanggal}`). */
export function gardenDoodleFor(seed: string): Doodle {
  const id = GARDEN_IDS[fnv1a(seed) % GARDEN_IDS.length];
  return getDoodle(id ?? FALLBACK_ID);
}

export interface DoodleSvgOptions {
  /** Warna tinta. Default #2A14D6. */
  color?: string;
  /** Lebar & tinggi dalam px. Default 64. */
  size?: number;
  /** Tebal garis dalam satuan viewBox (64). Default 2.4. */
  strokeWidth?: number;
}

function escapeXml(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&apos;',
  );
}

/** SVG mandiri untuk satu doodle. */
export function doodleToSvg(d: Doodle, opts: DoodleSvgOptions = {}): string {
  const color = escapeXml(opts.color ?? INK);
  const size = opts.size ?? 64;
  const sw = opts.strokeWidth ?? STROKE_WIDTH;
  const strokes = d.strokes.map((p) => `<path d="${p}"/>`).join('');
  const fills = (d.fills ?? []).map((p) => `<path d="${p}"/>`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${d.viewBox}" width="${size}" height="${size}" role="img" aria-label="${escapeXml(d.name)}">` +
    `<g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${strokes}</g>` +
    (fills ? `<g fill="${color}" stroke="none">${fills}</g>` : '') +
    `</svg>`
  );
}
