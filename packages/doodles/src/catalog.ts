/** Katalog semua doodle (dipisah dari index agar scenes.ts bisa memakainya tanpa impor melingkar). */
import type { Doodle } from './types';
import { tanaman } from './data/tanaman';
import { bunga } from './data/bunga';
import { buah } from './data/buah';
import { makhluk } from './data/makhluk';
import { benda } from './data/benda';
import { cuaca } from './data/cuaca';
import { token } from './data/token';
import { musim } from './data/musim';
import { ui } from './data/ui';
import { makanan } from './data/makanan';
import { perjalanan } from './data/perjalanan';
import { perasaan } from './data/perasaan';
import { stiker } from './data/stiker';
import { bendaLain } from './data/benda-lain';

/** Warna tinta & kertas resmi. */
export const INK = '#2A14D6';
export const PAPER = '#E6E6E8';
export const STROKE_WIDTH = 2.4;

export const DOODLES: Doodle[] = [
  ...tanaman,
  ...bunga,
  ...buah,
  ...makhluk,
  ...benda,
  ...cuaca,
  ...token,
  ...musim,
  ...ui,
  ...makanan,
  ...perjalanan,
  ...perasaan,
  ...stiker,
  ...bendaLain,
];

export const DOODLE_BY_ID: Record<string, Doodle> = Object.fromEntries(
  DOODLES.map((d) => [d.id, d]),
);

