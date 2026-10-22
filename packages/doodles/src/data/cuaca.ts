import type { Doodle } from '../types';
import { maker, type Pen } from '../pen';

const d = maker('cuaca');

/** Awan bergelombang dengan dasar datar. */
export function cloud(p: Pen, x0: number, x1: number, base: number, top: number): void {
  const w = x1 - x0;
  const h = base - top;
  const P = (fx: number, fy: number): [number, number] => [x0 + w * fx, base - h * fy];
  p.bumps([P(0.04, 0.05), P(0, 0.45), P(0.2, 0.68), P(0.3, 0.98), P(0.58, 1), P(0.75, 0.62), P(0.97, 0.5), P(1, 0.05)], 0.36);
  p.curve(
    [
      [x0 + w * 0.04, base - h * 0.05],
      [x0 + w * 0.5, base + 0.6],
      [x1, base - h * 0.05],
    ],
    { wob: 0.25 },
  );
}

export const cuaca: Doodle[] = [
  d('matahari', 'Matahari', (p) => {
    p.circle(32, 32, 11.5);
    p.rays(32, 32, 15.5, 23, 10, -90, 3);
    p.dot(28.4, 30, 1.1);
    p.dot(35.6, 30, 1.1);
    p.arc(32, 32.6, 3.4, 2.8, 25, 155, { wob: 0.08 });
  }),

  d('awan', 'Awan', (p) => {
    cloud(p, 9, 55, 45, 17);
  }),

  d('hujan', 'Hujan', (p) => {
    cloud(p, 11, 53, 32, 8);
    for (const [x, y] of [
      [18, 38],
      [30, 39],
      [42, 38],
      [24, 48],
      [36, 49],
      [48, 47],
      [13, 49],
    ] as const)
      p.line(x, y, x - 2.4, y + 5.5, 0.05);
  }),

  d('bulan', 'Bulan', (p) => {
    p.arc(29, 32, 20, 20, -60, -300, { lump: 0.015 });
    p.arc(43, 32, 17.8, 17.8, 103, 257, { lump: 0.015 });
    p.arc(22.5, 28, 2.8, 2, 20, 160, { wob: 0.05 });
    p.arc(24, 37, 3, 2.4, 30, 150, { wob: 0.05 });
    const spark = (x: number, y: number, s: number): void => {
      p.line(x, y - s, x, y + s, 0.05);
      p.line(x - s, y, x + s, y, 0.05);
    };
    spark(49, 25, 3);
    spark(46, 41, 2);
  }),

  d('bintang', 'Bintang', (p) => {
    const pts: Array<[number, number, number]> = [];
    for (let i = 0; i < 10; i++) {
      const a = ((-90 + i * 36) * Math.PI) / 180;
      const r = i % 2 === 0 ? 22 : 9.6;
      pts.push([32 + Math.cos(a) * r, 34 + Math.sin(a) * r, 1]);
    }
    p.poly(pts, true, 0.4);
    p.line(50, 10, 52, 7, 0.05);
    p.line(54, 13, 57.5, 12, 0.05);
    p.line(12, 51, 9.6, 54, 0.05);
  }),

  d('pelangi', 'Pelangi', (p) => {
    p.arc(32, 46, 23, 23, 180, 360, { lump: 0.015 });
    p.arc(32, 46, 17.5, 17.5, 180, 360, { lump: 0.015 });
    p.arc(32, 46, 12, 12, 180, 360, { lump: 0.015 });
    cloud(p, 5, 19.5, 54, 43);
    cloud(p, 44.5, 59, 54, 43);
  }),

  d('kabut', 'Kabut', (p) => {
    p.wave(10, 46, 18, 1.4, 9);
    p.wave(18, 56, 27, 1.4, 9, 1);
    p.wave(8, 38, 36, 1.4, 9);
    p.line(43, 36, 54, 36, 0.3);
    p.wave(14, 52, 45, 1.4, 9, 1);
    p.wave(22, 44, 54, 1.4, 9);
  }),

  d('petir', 'Petir', (p) => {
    p.poly(
      [
        [37, 6],
        [20, 34],
        [31, 34],
        [24, 58],
        [46, 26],
        [34.5, 26],
        [43, 6],
      ],
      true,
      0.35,
    );
    p.line(14, 14, 10, 12, 0.05);
    p.line(50, 40, 54, 42, 0.05);
  }),

  d('angin', 'Angin', (p) => {
    p.curve(
      [
        [7, 23],
        [22, 22.5],
        [36, 22],
        [43, 18],
        [42.5, 11.5],
        [37, 11],
        [35.5, 16],
      ],
      { wob: 0.25 },
    );
    p.curve(
      [
        [7, 32.5],
        [30, 32.6],
        [48, 31.6],
        [55, 27],
        [54, 20.5],
        [48.5, 20.5],
        [47.5, 25],
      ],
      { wob: 0.25 },
    );
    p.curve(
      [
        [13, 42],
        [30, 42],
        [40, 43],
        [45, 48.5],
        [42, 53.5],
        [36.5, 52],
        [37, 47.5],
      ],
      { wob: 0.25 },
    );
  }),

  d('senja', 'Senja', (p) => {
    p.arc(32, 40, 13, 13, 180, 360, { lump: 0.02 });
    p.line(5, 40.4, 59, 40.4, 0.35);
    for (let i = 0; i < 5; i++) {
      const a = ((198 + i * 36) * Math.PI) / 180;
      const r1 = i % 2 === 0 ? 23 : 21;
      p.line(32 + Math.cos(a) * 17, 40 + Math.sin(a) * 17, 32 + Math.cos(a) * r1, 40 + Math.sin(a) * r1, 0.1);
    }
    p.line(18, 46.5, 46, 46.5, 0.25);
    p.line(23, 51.5, 41, 51.5, 0.2);
    p.line(28, 56.5, 36, 56.5, 0.15);
  }),
];
