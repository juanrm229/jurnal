import type { Doodle } from '../types';
import { maker, sampleCatmull, type Pen, type Pt } from '../pen';
import { arrowHead, scribble, sparkle, star5 } from './alat';

const d = maker('stiker');

/** Pita selotip dengan ujung bergerigi, berpusat di (cx, cy). */
function tape(p: Pen, cx: number, cy: number, len: number, w: number, rot: number): void {
  p.rotate(rot, cx, cy, () => {
    const x0 = cx - len / 2;
    const x1 = cx + len / 2;
    const y0 = cy - w / 2;
    const y1 = cy + w / 2;
    const n = 4;
    const pts: Pt[] = [[x0, y0, 1], [x1, y0, 1]];
    for (let i = 1; i <= n; i++) pts.push([x1 + (i % 2 === 1 ? -1.6 : 0), y0 + (w * i) / n, 1]);
    pts.push([x0, y1, 1]);
    for (let i = 1; i < n; i++) pts.push([x0 + (i % 2 === 1 ? 1.6 : 0), y1 - (w * i) / n, 1]);
    p.poly(pts, true, 0.3);
    for (let x = x0 + 5; x < x1 - 3; x += 6) p.line(x, y1 - 1.6, x + 3.5, y0 + 1.6, 0.05);
  });
}

function sun(p: Pen, cx: number, cy: number, r: number): void {
  p.circle(cx, cy, r);
  p.rays(cx, cy, r + 3.5, r + 8, 8, -90, 1.5);
}

export const stiker: Doodle[] = [
  d('panah-lengkung', 'Panah Lengkung', (p) => {
    p.curve(
      [
        [8, 50],
        [15, 32],
        [30, 20],
        [53, 18],
      ],
      { wob: 0.3 },
    );
    arrowHead(p, 54, 18, 44, 18.6, 9);
  }),

  d('panah-spiral', 'Panah Spiral', (p) => {
    p.curve(
      [
        [6, 52],
        [16, 46],
        [27, 36],
        [29, 25],
        [22, 20],
        [16, 25],
        [21, 34],
        [33, 37],
        [45, 30],
        [54, 15],
      ],
      { wob: 0.3 },
    );
    arrowHead(p, 54.5, 14, 51, 21, 8.5);
  }),

  d('garis-bawah', 'Garis Bawah', (p) => {
    p.curve(
      [
        [5, 30],
        [20, 28.5],
        [40, 29],
        [58.5, 30.5, 1],
        [44, 33],
        [24, 34.5],
        [10, 36.5],
      ],
      { wob: 0.3 },
    );
  }),

  d('lingkaran-coret', 'Lingkaran Coret', (p) => {
    p.circle(32, 32, 26, { ry: 18, rot: -8, over: 46, start: 200, lump: 0.04 });
  }),

  d('bintang-kecil', 'Bintang Kecil', (p) => {
    star5(p, 32, 34, 15, 0.46, -92);
    p.line(48, 14, 51, 11, 0.05);
    p.line(51.5, 19, 55.5, 18, 0.05);
  }),

  d('kilau', 'Kilau', (p) => {
    sparkle(p, 32, 32, 24);
  }),

  d('bintang-tiga', 'Tiga Kilau', (p) => {
    sparkle(p, 25, 36, 16);
    sparkle(p, 47, 17, 9.5);
    sparkle(p, 49, 46, 6);
  }),

  d('hati-garis', 'Hati Garis', (p) => {
    p.heart(32, 32, 22);
    p.translate(1.2, -0.8, () => p.heart(32, 32.5, 18.5));
  }),

  d('selotip', 'Selotip', (p) => {
    tape(p, 32, 32, 50, 15, -12);
  }),

  d('selotip-kotak', 'Selotip Sudut', (p) => {
    p.poly(
      [
        [15, 59],
        [15, 15],
        [59, 15],
      ],
      false,
      0.3,
    );
    p.line(19, 30, 40, 30, 0.1);
    p.line(19, 37, 34, 37, 0.1);
    tape(p, 21, 21, 30, 12, -45);
  }),

  d('bingkai-polaroid', 'Bingkai Polaroid', (p) => {
    p.rotate(5, 32, 32, () => {
      p.rrect(12, 6, 40, 51, 1.5, 0.35);
      p.rrect(16, 10, 32, 33, 0.5, 0.25);
      scribble(p, 20, 40, 50, 2.2);
    });
  }),

  d('bunga-sudut', 'Bunga Sudut', (p) => {
    // sulur sepanjang dua tepi dari sudut kiri atas
    p.curve(
      [
        [8, 58],
        [8.5, 40],
        [11, 24],
        [14.5, 15],
      ],
      { wob: 0.25 },
    );
    p.curve(
      [
        [14.5, 15],
        [24, 11],
        [40, 8.5],
        [58, 8],
      ],
      { wob: 0.25 },
    );
    p.spiral(9.5, 55, 3.2, 0.5, 0.9, 0);
    p.spiral(55, 10.5, 3.2, 0.5, 0.9, -90);
    p.leaf(9.5, 40, 17, 34, 3.4, { bend: 0.6 });
    p.leaf(10.5, 30, 4.5, 24, 3, { bend: -0.6 });
    p.leaf(32, 9.5, 37, 16.5, 3.2, { bend: -0.6 });
    p.leaf(42, 8.8, 47, 3.8, 2.8, { bend: 0.6 });
    // bunga di sudut
    for (let i = 0; i < 5; i++) p.petal(17, 17, -90 + i * 72, 4.6, 6.5, { r0: 1.6 });
    p.circle(17, 17, 1.8);
    p.dot(26, 17, 0.9);
    p.dot(17, 27, 0.9);
  }),

  d('daun-sudut', 'Daun Sudut', (p) => {
    p.curve(
      [
        [7, 56],
        [8, 34],
        [10, 18],
        [13, 12],
        [20, 9],
        [36, 8],
        [56, 7.5],
      ],
      { wob: 0.25 },
    );
    p.leaf(8.3, 46, 18, 40, 4, { bend: 0.8, vein: true });
    p.leaf(9, 33, 18.5, 26, 4.2, { bend: 0.8, vein: true });
    p.leaf(12, 16, 22, 20, 4.4, { bend: -0.6, vein: true });
    p.leaf(28, 8.4, 34, 17, 4, { bend: -0.8, vein: true });
    p.leaf(44, 7.8, 50, 16, 3.6, { bend: -0.8, vein: true });
  }),

  d('titik-titik', 'Jejak Titik', (p) => {
    const path = sampleCatmull(
      [
        [7, 50],
        [17, 40],
        [26, 44],
        [34, 34],
        [40, 22],
        [48, 20],
      ],
      20,
    );
    let acc = 0;
    for (let i = 1; i < path.length; i++) {
      const a = path[i - 1]!;
      const b = path[i]!;
      acc += Math.hypot(b[0] - a[0], b[1] - a[1]);
      if (acc >= 5.2) {
        acc = 0;
        p.dot(b[0], b[1], 1.3);
      }
    }
    p.dot(7, 50, 1.3);
    p.heart(53.5, 15, 4.5, 20);
  }),

  d('gelombang', 'Gelombang', (p) => {
    p.wave(5, 59, 28, 5.5, 10);
    p.wave(14, 50, 40, 2.6, 6, 1);
  }),

  d('tanda-seru', 'Tanda Seru', (p) => {
    p.shape([
      [28, 9],
      [36.5, 9.5],
      [34, 41],
      [30.5, 41],
    ]);
    p.circle(32.2, 50.5, 3.4);
    p.line(18, 14, 21.5, 19, 0.05);
    p.line(46.5, 14, 43, 19, 0.05);
  }),

  d('tanda-tanya', 'Tanda Tanya', (p) => {
    p.curve(
      [
        [19, 21],
        [22, 12],
        [32, 8.5],
        [42, 12],
        [44, 21],
        [39, 28],
        [32.5, 33],
        [32, 41],
      ],
      { wob: 0.35 },
    );
    p.circle(32, 51, 3.2);
  }),

  d('centang-besar', 'Centang Besar', (p) => {
    p.curve(
      [
        [8, 34],
        [16, 41],
        [24, 51, 1],
        [38, 30],
        [57, 11],
      ],
      { wob: 0.35 },
    );
    p.curve(
      [
        [10, 36.5],
        [24.5, 48, 1],
        [55, 14.5],
      ],
      { wob: 0.25 },
    );
  }),

  d('silang', 'Silang', (p) => {
    p.curve(
      [
        [12, 12],
        [30, 31],
        [52, 53],
      ],
      { wob: 0.4 },
    );
    p.curve(
      [
        [51, 11],
        [33, 30],
        [11, 52],
      ],
      { wob: 0.4 },
    );
  }),

  d('matahari-kecil', 'Matahari Kecil', (p) => {
    sun(p, 32, 32, 10);
  }),

  d('awan-kecil', 'Awan Kecil', (p) => {
    p.bumps(
      [
        [10, 40],
        [14, 30],
        [24, 26],
        [33, 19],
        [45, 24],
        [52, 32],
        [54, 40],
      ],
      0.42,
    );
    p.curve(
      [
        [10, 40],
        [32, 42],
        [54, 40],
      ],
      { wob: 0.3 },
    );
  }),

  d('pelangi-kecil', 'Pelangi Kecil', (p) => {
    p.arc(32, 44, 24, 24, 180, 360, { wob: 0.2 });
    p.arc(32, 44, 18, 18, 180, 360, { wob: 0.2 });
    p.arc(32, 44, 12, 12, 180, 360, { wob: 0.2 });
    for (const x of [11, 53]) {
      p.bumps(
        [
          [x - 8, 50],
          [x - 6, 44],
          [x, 41],
          [x + 6, 44],
          [x + 8, 50],
        ],
        0.42,
      );
      p.line(x - 8, 50, x + 8, 50, 0.2);
    }
  }),

  d('petir-kecil', 'Petir Kecil', (p) => {
    p.poly(
      [
        [36, 7],
        [19, 35],
        [30, 35],
        [25, 57],
        [45, 26],
        [34, 26],
        [40, 7],
      ],
      true,
      0.3,
    );
  }),

  d('not-balok', 'Not Balok', (p) => {
    p.circle(15, 47, 5, { ry: 3.8, rot: -22 });
    p.circle(37, 42, 5, { ry: 3.8, rot: -22 });
    p.line(19.5, 45, 20, 18, 0.15);
    p.line(41.5, 40, 42, 13, 0.15);
    p.poly(
      [
        [20, 18],
        [42, 13],
        [42, 18.5],
        [20, 23.5],
      ],
      true,
      0.2,
    );
    // not kecil
    p.circle(51, 54, 3.2, { ry: 2.5, rot: -22 });
    p.line(54, 53, 54.2, 38, 0.1);
    p.curve(
      [
        [54.2, 38],
        [58, 41],
        [58.5, 46],
      ],
      { wob: 0.1 },
    );
  }),

  d('kaset', 'Kaset', (p) => {
    p.rrect(6, 14, 52, 37, 3.5, 0.35);
    p.rrect(11, 18, 42, 20, 2, 0.25);
    p.circle(23, 28, 4);
    p.circle(41, 28, 4);
    p.rays(23, 28, 1, 2.4, 6, -90);
    p.rays(41, 28, 1, 2.4, 6, -90);
    p.line(27, 26, 37, 26, 0.05);
    p.line(27, 30, 37, 30, 0.05);
    p.poly(
      [
        [16, 51],
        [19, 43],
        [45, 43],
        [48, 51],
      ],
      false,
      0.25,
    );
    p.dot(10, 47, 0.9);
    p.dot(54, 47, 0.9);
    p.dot(10, 18, 0.9);
    p.dot(54, 18, 0.9);
  }),

  d('piringan-hitam', 'Piringan Hitam', (p) => {
    p.circle(32, 32, 26);
    p.arc(32, 32, 20.5, 20.5, 200, 330, { wob: 0.15 });
    p.arc(32, 32, 20.5, 20.5, 20, 150, { wob: 0.15 });
    p.arc(32, 32, 15, 15, 230, 400, { wob: 0.15 });
    p.circle(32, 32, 7.5);
    p.dot(32, 32, 1.4);
    p.arc(32, 32, 23.5, 23.5, 240, 280, { wob: 0.05 });
  }),

  d('kertas-sobek', 'Kertas Sobek', (p) => {
    const pts: Pt[] = [
      [10, 40, 1],
      [10, 9, 1],
      [54, 9, 1],
      [54, 44, 1],
    ];
    const n = 12;
    for (let i = 1; i < n; i++) {
      const x = 54 - (44 * i) / n;
      pts.push([x, 44 + (i % 2 === 0 ? -2.5 : 2.5) + p.j(1.5) - (i / n) * 4, 1]);
    }
    pts.push([10, 40, 1]);
    p.poly(pts, false, 0.25);
    p.line(16, 17, 46, 17, 0.1);
    p.line(16, 24, 48, 24, 0.1);
    p.line(16, 31, 38, 31, 0.1);
    // serpihan
    p.poly(
      [
        [40, 53],
        [44, 51],
        [47, 55],
        [42, 57],
      ],
      true,
      0.1,
    );
  }),

  d('pin-papan', 'Pin Papan', (p) => {
    p.rotate(28, 32, 32, () => {
      p.circle(32, 13, 11, { ry: 4 });
      p.curve(
        [
          [21.5, 14.5],
          [24, 24],
          [27, 27],
        ],
        { wob: 0.15 },
      );
      p.curve(
        [
          [42.5, 14.5],
          [40, 24],
          [37, 27],
        ],
        { wob: 0.15 },
      );
      p.circle(32, 29, 9.5, { ry: 3 });
      p.line(32, 32, 32, 54, 0.1);
    });
  }),

  d('klip-kertas', 'Klip Kertas', (p) => {
    const pts: Pt[] = [];
    const arcPts = (cx: number, cy: number, r: number, a0: number, a1: number): void => {
      for (let i = 0; i <= 6; i++) {
        const a = ((a0 + ((a1 - a0) * i) / 6) * Math.PI) / 180;
        pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r]);
      }
    };
    pts.push([29, 40]);
    arcPts(32, 20, 3, 180, 360);
    arcPts(29.5, 48, 5.5, 0, 180);
    arcPts(32, 14, 8, 180, 360);
    pts.push([40, 44]);
    p.rotate(24, 32, 32, () => p.curve(pts, { wob: 0.1 }));
  }),

  d('stempel', 'Stempel', (p) => {
    p.circle(32, 32, 25, { lump: 0.02 });
    p.circle(32, 32, 19, { lump: 0.02 });
    for (let i = 0; i < 16; i++) {
      if (i === 4 || i === 12) continue;
      const a = ((i / 16) * 360 * Math.PI) / 180;
      p.line(32 + Math.cos(a) * 21, 32 + Math.sin(a) * 21, 32 + Math.cos(a) * 23, 32 + Math.sin(a) * 23, 0.03);
    }
    star5(p, 32, 30, 8, 0.45);
    p.line(23, 41.5, 41, 41.5, 0.1);
  }),

  d('perangko-bergerigi', 'Perangko Bergerigi', (p) => {
    const pts: Pt[] = [];
    const x0 = 13;
    const y0 = 8;
    const x1 = 51;
    const y1 = 56;
    const nx = 7;
    const ny = 9;
    for (let i = 0; i < nx; i++) pts.push([x0 + ((x1 - x0) * i) / nx, y0]);
    for (let i = 0; i < ny; i++) pts.push([x1, y0 + ((y1 - y0) * i) / ny]);
    for (let i = 0; i < nx; i++) pts.push([x1 - ((x1 - x0) * i) / nx, y1]);
    for (let i = 0; i < ny; i++) pts.push([x0, y1 - ((y1 - y0) * i) / ny]);
    p.bumps(pts, -0.38, true);
    p.rrect(18, 13, 28, 38, 1, 0.25);
    // gambar: matahari di atas bukit
    p.circle(36, 23, 4.2);
    p.curve(
      [
        [18.5, 42],
        [26, 33],
        [33, 37],
        [39, 31],
        [45.5, 37],
      ],
      { wob: 0.2 },
    );
    p.line(22, 46.5, 34, 46.5, 0.05);
  }),
];
