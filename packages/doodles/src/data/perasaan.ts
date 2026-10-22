import type { Doodle } from '../types';
import { maker } from '../pen';
import { drop, faceRing, scribble, sparkle, zee } from './alat';

const d = maker('perasaan');

export const perasaan: Doodle[] = [
  d('hati-kecil', 'Hati Kecil', (p) => {
    p.heart(32, 34, 13, -6);
    p.line(14, 18, 18, 22, 0.05);
    p.line(50, 18, 46, 22, 0.05);
    p.line(32, 12, 32, 16.5, 0.05);
  }),

  d('hati-patah', 'Hati Patah', (p) => {
    const s = 21;
    const cx = 32;
    const cy = 32;
    const zig: Array<[number, number]> = [
      [cx, cy - s * 0.4],
      [cx - 3, cy - 2],
      [cx + 2.5, cy + 4],
      [cx - 2, cy + 10],
      [cx, cy + s * 0.9],
    ];
    for (const side of [-1, 1] as const) {
      p.rotate(side * 8, cx, cy + s * 0.9, () =>
        p.translate(side * 2.4, 0, () => {
          p.bez(
            [cx, cy + s * 0.9],
            [
              [
                [cx + side * s * 1.25, cy + s * 0.05],
                [cx + side * s * 0.8, cy - s * 1.15],
                [cx, cy - s * 0.4],
              ],
            ],
            0.4,
          );
          p.poly(zig, false, 0.15);
        }),
      );
    }
  }),

  d('hati-dua', 'Dua Hati', (p) => {
    p.heart(23, 36, 13, -14);
    p.heart(43, 27, 11, 14);
    p.line(52, 46, 55, 49, 0.05);
    p.line(56, 42, 59, 42.5, 0.05);
  }),

  d('pelukan', 'Pelukan', (p) => {
    p.circle(24, 21, 7.5);
    p.circle(40.5, 22, 7.5);
    // badan kiri & kanan
    p.curve(
      [
        [8, 58],
        [9.5, 44],
        [15, 34],
        [23.5, 30.5],
      ],
      { wob: 0.3 },
    );
    p.curve(
      [
        [41, 31.5],
        [49, 35],
        [54.5, 45],
        [56, 58],
      ],
      { wob: 0.3 },
    );
    // lengan saling melingkar
    p.curve(
      [
        [15.5, 42],
        [26, 39],
        [37, 38],
        [46, 40],
        [47.5, 44],
      ],
      { wob: 0.25 },
    );
    p.curve(
      [
        [48, 47],
        [38, 46.5],
        [27, 48],
        [18.5, 47],
        [16.5, 51],
      ],
      { wob: 0.25 },
    );
    // mata terpejam bahagia
    p.arc(22, 21.5, 1.6, 1.3, 200, 340, { wob: 0.05 });
    p.arc(42.5, 22.5, 1.6, 1.3, 200, 340, { wob: 0.05 });
    p.heart(32, 7.5, 3.4);
  }),

  d('tangan-bergandeng', 'Tangan Bergandeng', (p) => {
    // lengan kiri & kanan dari bawah
    p.line(5, 46, 22, 36, 0.3);
    p.line(8, 55, 24, 45.5, 0.3);
    p.line(59, 46, 42, 36, 0.3);
    p.line(56, 55, 40, 45.5, 0.3);
    // manset
    p.line(9, 51.5, 4.5, 44.5, 0.1);
    p.line(55, 51.5, 59.5, 44.5, 0.1);
    // genggaman
    p.curve(
      [
        [22, 36],
        [26, 31],
        [32, 29.5],
        [38, 31],
        [42, 36],
        [43.5, 41],
        [40, 45.5],
        [32, 48],
        [24, 45.5],
        [20.5, 41],
        [22, 36],
      ],
      { wob: 0.3 },
    );
    // jari-jari terkait
    p.curve(
      [
        [27, 34],
        [29, 38],
        [28, 42],
      ],
      { wob: 0.1 },
    );
    p.curve(
      [
        [32, 33],
        [33.5, 37.5],
        [32.5, 42.5],
      ],
      { wob: 0.1 },
    );
    p.curve(
      [
        [37, 34],
        [38.5, 38],
        [37.5, 42],
      ],
      { wob: 0.1 },
    );
    // jempol di atas
    p.curve(
      [
        [25, 32.5],
        [29, 26.5],
        [33, 27.5],
        [33, 30],
      ],
      { wob: 0.15 },
    );
    p.heart(32, 14, 4.5);
  }),

  d('wajah-senyum', 'Wajah Senyum', (p) => {
    faceRing(p);
    p.dot(24.5, 28, 1.8);
    p.dot(39.5, 28, 1.8);
    p.arc(32, 35, 9, 6.5, 20, 160, { wob: 0.1 });
    p.line(17, 37, 19, 35, 0.05);
    p.line(20, 38, 22, 36, 0.05);
    p.line(45, 36, 47, 38, 0.05);
    p.line(42, 35, 44, 37, 0.05);
  }),

  d('wajah-sedih', 'Wajah Sedih', (p) => {
    faceRing(p);
    p.dot(24.5, 29, 1.7);
    p.dot(39.5, 29, 1.7);
    p.line(20.5, 24, 26, 22, 0.05);
    p.line(43.5, 24, 38, 22, 0.05);
    p.arc(32, 46, 8, 5, 205, 335, { wob: 0.1 });
    drop(p, 24, 33, 7);
  }),

  d('wajah-ngantuk', 'Wajah Mengantuk', (p) => {
    faceRing(p, 28, 37, 19);
    p.arc(21.5, 34, 3.4, 2.2, 10, 170, { wob: 0.05 });
    p.arc(34.5, 34, 3.4, 2.2, 10, 170, { wob: 0.05 });
    p.circle(28, 45, 2.4, { ry: 2 });
    zee(p, 44, 18, 5);
    zee(p, 51, 10, 6.5);
  }),

  d('wajah-tertawa', 'Wajah Tertawa', (p) => {
    faceRing(p);
    p.arc(24.5, 28, 3.4, 3.2, 200, 340, { wob: 0.05 });
    p.arc(39.5, 28, 3.4, 3.2, 200, 340, { wob: 0.05 });
    p.curve(
      [
        [21.5, 35, 1],
        [42.5, 35, 1],
        [40, 43],
        [32, 46.5],
        [24, 43],
        [21.5, 35, 1],
      ],
      { wob: 0.2 },
    );
    p.arc(32, 44.2, 4.5, 2, 200, 340, { wob: 0.05 });
    p.line(9, 22, 6, 20, 0.05);
    p.line(55, 22, 58, 20, 0.05);
  }),

  d('air-mata', 'Air Mata', (p) => {
    drop(p, 30, 8, 44, 28);
    p.arc(30, 40.5, 8, 8.5, 110, 170, { wob: 0.1 });
    drop(p, 50, 30, 10);
    drop(p, 12, 44, 7.5);
  }),

  d('bintang-mata', 'Mata Berbinar', (p) => {
    faceRing(p);
    sparkle(p, 24, 28, 5.6);
    sparkle(p, 40, 28, 5.6);
    p.arc(32, 37, 7, 5, 20, 160, { wob: 0.1 });
    sparkle(p, 53, 11, 3.6);
    sparkle(p, 9, 14, 2.6);
  }),

  d('gelembung-kata', 'Gelembung Kata', (p) => {
    p.curve(
      [
        [10, 12],
        [32, 10.5],
        [54, 12],
        [56, 26],
        [54, 39],
        [30, 40.5, 1],
        [20, 52, 1],
        [21, 40, 1],
        [10, 39],
        [8, 26],
        [10, 12],
      ],
      { wob: 0.35 },
    );
    scribble(p, 16, 46, 21);
    scribble(p, 16, 36, 30);
  }),
];
