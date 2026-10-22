import type { Doodle } from '../types';
import { maker, type Pen } from '../pen';

const d = maker('bunga');

/** Kepala bunga: lingkar tengah + kelopak loop. */
function head(p: Pen, cx: number, cy: number, r: number, n: number, len: number, w: number, start = -90): void {
  p.circle(cx, cy, r);
  for (let i = 0; i < n; i++) p.petal(cx, cy, start + (360 * i) / n + p.j(4), len, w, { r0: r + 0.6 });
}

export const bunga: Doodle[] = [
  d('bunga-matahari', 'Bunga Matahari', (p) => {
    const cx = 32;
    const cy = 21;
    p.circle(cx, cy, 7.4, { over: 8 });
    for (let i = 0; i < 12; i++) p.petal(cx, cy, -90 + i * 30 + p.j(3), 5.6, 5.2, { r0: 7.6 });
    p.dot(29.4, 20, 0.95);
    p.dot(34.6, 20, 0.95);
    p.arc(32, 21.6, 2.6, 2, 25, 155, { wob: 0.1 });
    p.stem([
      [32, 34.5],
      [33, 44],
      [31.5, 50],
      [32, 55],
    ]);
    p.leaf(32.6, 45, 21, 39, 6, { bend: -1.5, vein: true });
    p.leaf(32.4, 42, 44, 36, 6, { bend: 1.5, vein: true });
    p.grass(32, 56, { w: 14, ticks: 2 });
  }),

  d('tulip', 'Tulip', (p) => {
    p.curve(
      [
        [23.5, 14, 1],
        [23, 23],
        [26, 29.5],
        [32, 31.5],
        [38, 29.5],
        [41, 23],
        [40.5, 14, 1],
        [36.5, 19.5, 1],
        [32, 12, 1],
        [27.5, 19.5, 1],
        [23.5, 14],
      ],
      { wob: 0.35 },
    );
    p.curve(
      [
        [28, 19.5],
        [29, 26],
        [32, 30.5],
      ],
      { wob: 0.2 },
    );
    p.stem([
      [32, 31.5],
      [32.8, 42],
      [32, 55],
    ]);
    p.leaf(31.5, 54, 20, 36, 5.5, { bend: -1.5 });
    p.leaf(32.5, 52, 44.5, 37, 5.5, { bend: 1.5 });
    p.grass(32, 56, { w: 14, gapL: 4, gapR: 4, ticks: 1 });
  }),

  d('mawar', 'Mawar', (p) => {
    p.spiral(32, 19, 0.6, 7.5, 2.1, 200);
    p.curve([
      [22.5, 16],
      [22, 24],
      [26, 29.5],
      [32, 31],
      [38, 29.5],
      [42, 24],
      [41.5, 16],
    ]);
    p.leaf(32, 31, 25.5, 26, 2.6);
    p.leaf(32, 31, 38.5, 26, 2.6);
    p.stem([
      [32, 31],
      [31.4, 42],
      [32.6, 55],
    ]);
    p.line(31.6, 37, 29.2, 35.4, 0.05);
    p.line(32.2, 46, 34.8, 44.4, 0.05);
    p.leaf(31.6, 41, 20.5, 37, 5.5, { bend: -1, vein: true });
    p.leaf(32.4, 48, 43, 44, 5, { bend: 1, vein: true });
    p.grass(32, 56, { w: 13, ticks: 1 });
  }),

  d('daisy', 'Daisy', (p) => {
    head(p, 32, 21, 3.6, 9, 9.5, 5.2);
    p.stem([
      [32, 25],
      [31, 40],
      [32.5, 55],
    ]);
    p.leaf(31.4, 44, 22, 38, 4.5, { bend: -1 });
    p.leaf(32, 50, 41, 45, 4.2, { bend: 1 });
    p.grass(32, 56, { w: 13, ticks: 2 });
  }),

  d('bunga-lonceng', 'Bunga Lonceng', (p) => {
    p.stem([
      [20, 55],
      [19.5, 40],
      [22, 26],
      [29, 16],
      [39, 13],
      [47, 16],
    ]);
    const bell = (cx: number, top: number, w: number, h: number): void => {
      p.curve(
        [
          [cx - w * 0.62, top + h, 1],
          [cx - w * 0.38, top + h * 0.7],
          [cx - w * 0.36, top + h * 0.25],
          [cx, top],
          [cx + w * 0.36, top + h * 0.25],
          [cx + w * 0.38, top + h * 0.7],
          [cx + w * 0.62, top + h, 1],
        ],
        { wob: 0.25 },
      );
      p.bumps(
        [
          [cx + w * 0.62, top + h],
          [cx + w * 0.2, top + h + 0.4],
          [cx - w * 0.2, top + h + 0.4],
          [cx - w * 0.62, top + h],
        ],
        -0.35,
      );
      p.line(cx, top + h, cx + 0.3, top + h + 3, 0.05);
      p.dot(cx + 0.3, top + h + 3.6, 1.1);
    };
    p.curve(
      [
        [47, 16],
        [48.5, 19],
        [48.5, 22],
      ],
      { wob: 0.1 },
    );
    bell(48.5, 22, 12, 10);
    p.curve(
      [
        [30, 15.5],
        [30.5, 19],
        [30.4, 23],
      ],
      { wob: 0.1 },
    );
    bell(30.4, 23, 11, 9);
    p.leaf(20, 46, 9, 38, 4.6, { bend: -1 });
    p.leaf(20, 50, 31, 44, 4.6, { bend: 1 });
    p.grass(20, 56, { w: 12, ticks: 1 });
  }),

  d('bunga-kecil', 'Bunga Kecil', (p) => {
    head(p, 32, 31, 2.6, 5, 6.4, 7, -90);
    p.stem([
      [32, 34],
      [31.4, 45],
      [32.4, 55],
    ]);
    p.leaf(31.6, 47, 25, 43, 3.4, { bend: -0.6 });
    p.leaf(32, 51, 39, 47.5, 3.2, { bend: 0.6 });
    p.grass(32, 56, { w: 12, ticks: 2 });
  }),

  d('kamboja', 'Kamboja', (p) => {
    const cx = 32;
    const cy = 26;
    for (let i = 0; i < 5; i++) {
      const a = -90 + i * 72;
      p.petal(cx, cy, a, 12.5, 12, { skew: 4 });
    }
    p.circle(cx, cy, 2.4);
    p.stem([
      [32, 38],
      [33, 47],
      [32, 55],
    ]);
    p.leaf(32.6, 46, 45, 41, 4.6, { bend: 1, vein: true });
    p.grass(32, 56, { w: 12, ticks: 1 });
  }),

  d('melati', 'Melati', (p) => {
    const star = (cx: number, cy: number, len: number): void => {
      for (let i = 0; i < 5; i++) p.petal(cx, cy, -90 + i * 72 + 18, len, 4.4);
      p.dot(cx, cy, 1.1);
    };
    p.stem([
      [32, 55],
      [31, 42],
      [27, 32],
      [22, 24],
    ]);
    p.stem([
      [31.2, 43],
      [36, 32],
      [41, 22],
    ]);
    p.stem([
      [31.5, 46],
      [40, 40],
      [46, 36],
    ]);
    star(21.5, 21, 7.5);
    star(41.5, 18, 7);
    // kuncup
    p.shape([
      [46.5, 35.5],
      [49, 32.5],
      [51, 29],
      [51.8, 32],
      [49.5, 36],
    ]);
    p.leaf(30.5, 38, 20, 36, 3.6, { bend: 1 });
    p.leaf(36, 33, 44, 30, 3, { bend: -1 });
    p.grass(32, 56, { w: 12, ticks: 1 });
  }),

  d('anggrek', 'Anggrek', (p) => {
    p.stem([
      [24, 52],
      [23, 38],
      [26, 28],
      [33, 22],
    ]);
    const cx = 37;
    const cy = 21;
    p.petal(cx, cy, -88, 9, 6);
    p.petal(cx, cy, 30, 9, 6);
    p.petal(cx, cy, 150, 9, 6);
    p.petal(cx, cy, -18, 9.5, 11);
    p.petal(cx, cy, -162, 9.5, 11);
    // bibir
    p.curve(
      [
        [cx - 3, cy + 2],
        [cx - 3.4, cy + 6],
        [cx, cy + 8],
        [cx + 3.4, cy + 6],
        [cx + 3, cy + 2],
      ],
      { wob: 0.15 },
    );
    p.dot(cx, cy + 0.8, 1.1);
    // kuncup
    p.shape([
      [24.5, 30],
      [21, 28],
      [19.5, 31.5],
      [22.5, 33.5],
    ]);
    p.leaf(24, 53, 9, 46, 6.5, { bend: -2 });
    p.leaf(25, 53, 44, 49, 6.5, { bend: 2 });
    p.curve(
      [
        [12, 56],
        [28, 56.8],
        [48, 56],
      ],
      { wob: 0.3 },
    );
  }),

  d('teratai', 'Teratai', (p) => {
    p.leaf(32, 44, 32, 15, 7.2);
    p.leaf(31, 44, 19, 22, 6.5, { bend: -1 });
    p.leaf(33, 44, 45, 22, 6.5, { bend: 1 });
    p.leaf(30, 45, 10, 34, 5.5, { bend: -1 });
    p.leaf(34, 45, 54, 34, 5.5, { bend: 1 });
    p.curve(
      [
        [14, 45],
        [24, 47],
        [32, 47.4],
        [40, 47],
        [50, 45],
      ],
      { wob: 0.25 },
    );
    p.wave(8, 28, 52, 1.1, 6);
    p.wave(36, 56, 52, 1.1, 6, 1);
    p.wave(18, 46, 57, 1.1, 6);
  }),

  d('dandelion', 'Dandelion', (p) => {
    const cx = 30;
    const cy = 22;
    p.dot(cx, cy, 2);
    const n = 14;
    for (let i = 0; i < n; i++) {
      const a = ((-90 + (360 * i) / n + p.j(6)) * Math.PI) / 180;
      const r = 11 + p.j(0.8);
      const ex = cx + Math.cos(a) * r;
      const ey = cy + Math.sin(a) * r;
      p.line(cx + Math.cos(a) * 2.6, cy + Math.sin(a) * 2.6, ex, ey, 0.1);
      p.line(ex, ey, ex + Math.cos(a - 0.6) * 2.2, ey + Math.sin(a - 0.6) * 2.2, 0.05);
      p.line(ex, ey, ex + Math.cos(a + 0.6) * 2.2, ey + Math.sin(a + 0.6) * 2.2, 0.05);
    }
    // biji terbang
    const seed = (x: number, y: number, a: number): void => {
      p.rotate(a, x, y, () => {
        p.line(x, y, x, y - 5, 0.05);
        p.line(x, y - 5, x - 1.8, y - 6.8, 0.05);
        p.line(x, y - 5, x + 1.8, y - 6.8, 0.05);
        p.dot(x, y + 0.4, 0.8);
      });
    };
    seed(50, 18, 30);
    seed(53, 30, 55);
    p.stem([
      [30, 33.5],
      [31.5, 44],
      [30, 55],
    ]);
    p.leaf(30.4, 52, 20, 45, 4.2, { bend: -1 });
    p.grass(30, 56, { w: 12, ticks: 2 });
  }),

  d('bunga-tiga', 'Tiga Bunga', (p) => {
    p.stem([
      [32, 55],
      [30, 40],
      [20, 27],
    ]);
    p.stem([
      [32, 55],
      [32.5, 36],
      [32, 17],
    ]);
    p.stem([
      [32, 55],
      [36, 42],
      [45, 29],
    ]);
    head(p, 19, 24, 2, 5, 4.6, 6, -60);
    head(p, 32, 14, 2, 5, 4.6, 6, -90);
    head(p, 45.5, 26, 2, 5, 4.6, 6, -110);
    p.leaf(30.6, 42, 23.5, 41, 2.8, { bend: 1 });
    p.leaf(33.2, 45, 41, 47, 2.8, { bend: -1 });
    p.grass(32, 56, { w: 13, ticks: 2 });
  }),

  d('bunga-spiral', 'Bunga Spiral', (p) => {
    p.spiral(32, 21, 0.8, 10.5, 2.6, 0);
    p.stem([
      [32, 31.5],
      [31, 42],
      [32.6, 55],
    ]);
    p.leaf(31.5, 41, 19, 35, 6, { bend: -2, vein: true });
    p.leaf(32.2, 47, 45, 41, 6, { bend: 2, vein: true });
    p.grass(32, 56, { w: 14, ticks: 2 });
  }),

  d('bunga-liar', 'Bunga Liar', (p) => {
    p.stem([
      [30, 55],
      [29, 44],
      [31, 32],
      [28, 21],
    ]);
    p.stem([
      [29.4, 42],
      [36, 36],
      [44, 31],
    ]);
    const cx = 28;
    const cy = 18;
    const angs = [-150, -100, -45, 5, 60, 120, 175];
    for (const a of angs) p.petal(cx, cy, a + p.j(6), 6.5 + p.j(1.2), 5.4, { r0: 2.4 });
    p.circle(cx, cy, 2.2);
    p.petal(45, 30, -110, 5.2, 5.2, { r0: 1 });
    p.petal(45, 30, -50, 5.2, 5.2, { r0: 1 });
    p.petal(45, 30, 10, 4.6, 5.2, { r0: 1 });
    p.leaf(29.2, 48, 19, 44, 3.6, { bend: -1 });
    p.leaf(30.6, 36, 22, 30, 3.2, { bend: -1 });
    p.leaf(29.6, 51, 38, 49.5, 3.2, { bend: 1 });
    p.grass(30, 56, { w: 12, ticks: 1 });
  }),

  d('kuncup', 'Kuncup', (p) => {
    p.curve(
      [
        [32, 11, 1],
        [28, 17],
        [27, 23],
        [28.4, 28],
        [32, 29.6],
        [35.6, 28],
        [37, 23],
        [36, 17],
        [32, 11],
      ],
      { wob: 0.25 },
    );
    p.curve(
      [
        [32, 12],
        [30.6, 20],
        [31.6, 29],
      ],
      { wob: 0.15 },
    );
    p.leaf(32, 33, 25, 22.5, 3.4, { bend: -1.2 });
    p.leaf(32, 33, 39, 22.5, 3.4, { bend: 1.2 });
    p.stem([
      [32, 32],
      [32.6, 44],
      [31.6, 55],
    ]);
    p.leaf(32.3, 45, 22, 40, 5, { bend: -1.2, vein: true });
    p.grass(32, 56, { w: 13, ticks: 2 });
  }),
];

