import type { Doodle } from '../types';
import { maker, type Pen } from '../pen';
import { steam } from './alat';

const d = maker('makanan');

/** Mangkuk: bibir elips di y, badan membulat ke bawah. */
function bowl(p: Pen, y: number, rx: number, depth: number, rim = true): void {
  if (rim) p.circle(32, y, rx, { ry: rx * 0.24, lump: 0.02 });
  p.curve(
    [
      [32 - rx, y],
      [32 - rx * 0.9, y + depth * 0.5],
      [32 - rx * 0.5, y + depth * 0.92],
      [32, y + depth],
      [32 + rx * 0.5, y + depth * 0.92],
      [32 + rx * 0.9, y + depth * 0.5],
      [32 + rx, y],
    ],
    { wob: 0.3 },
  );
  p.curve(
    [
      [32 - rx * 0.32, y + depth + 0.2],
      [32 - rx * 0.3, y + depth + 3],
      [32 + rx * 0.3, y + depth + 3],
      [32 + rx * 0.32, y + depth + 0.2],
    ],
    { wob: 0.15 },
  );
}

export const makanan: Doodle[] = [
  d('nasi-padang', 'Nasi Padang', (p) => {
    // piring: depan penuh, belakang hanya di kiri-kanan gundukan
    p.arc(32, 44, 26, 9, -8, 188, { wob: 0.2 });
    p.arc(32, 44, 26, 9, 186, 226, { wob: 0.15 });
    p.arc(32, 44, 26, 9, 314, 352, { wob: 0.15 });
    p.arc(32, 44.5, 19, 5.2, 15, 165, { wob: 0.1 });
    // gundukan nasi
    p.curve(
      [
        [17, 44],
        [18.5, 36],
        [24, 28],
        [32, 25.5],
        [40, 28],
        [45.5, 36],
        [47, 44],
      ],
      { wob: 0.35 },
    );
    for (const [x, y, a] of [
      [27, 32, 30],
      [35, 30.5, -20],
      [31, 37, 10],
      [39, 37.5, 60],
      [24, 39, -40],
    ] as const) {
      p.rotate(a, x, y, () => p.line(x - 1.2, y, x + 1.2, y, 0.05));
    }
    // daun singkong & cabai di tepi piring
    p.leaf(48, 44, 57, 39, 3.2, { bend: 0.8 });
    p.curve(
      [
        [9, 44.5],
        [13, 41.5],
        [17.5, 42.5],
      ],
      { wob: 0.15 },
    );
    p.line(9, 44.5, 7.5, 42.5, 0.05);
  }),

  d('mie', 'Mie', (p) => {
    bowl(p, 34, 23, 18);
    // mie bergelombang di permukaan
    p.wave(14, 50, 33.5, 1.4, 4.5);
    p.wave(19, 45, 36, 1.1, 4, 1);
    // mie diangkat sumpit
    p.curve(
      [
        [33, 33],
        [32, 28],
        [34, 24],
        [33, 20],
        [35, 17],
      ],
      { wob: 0.2 },
    );
    p.curve(
      [
        [37, 33],
        [36.5, 28],
        [38.5, 24],
        [37.5, 20],
        [39, 16.5],
      ],
      { wob: 0.2 },
    );
    p.line(27, 18.5, 56, 9, 0.3);
    p.line(29, 21.5, 57.5, 14, 0.3);
    steam(p, 18, 27, 18, 1.6);
  }),

  d('bakso', 'Bakso', (p) => {
    // bibir: depan + ujung belakang; bakso menutupi bagian tengah
    p.arc(32, 32, 23, 6, -4, 184, { wob: 0.15 });
    p.arc(32, 32, 23, 6, 182, 212, { wob: 0.1 });
    p.arc(32, 32, 23, 6, 328, 360, { wob: 0.1 });
    bowl(p, 32, 23, 19, false);
    p.circle(21.5, 29, 5.6);
    p.circle(32.5, 27, 6.4);
    p.circle(43, 29.5, 5.2);
    p.arc(31, 25.5, 3, 3, 200, 260, { wob: 0.05 });
    p.dot(26.5, 33.5, 0.9);
    p.dot(38, 33.8, 0.9);
    p.dot(48.5, 33, 0.8);
    steam(p, 26, 18, 9, 1.6);
    steam(p, 38, 18.5, 10.5, 1.6);
  }),

  d('sate', 'Sate', (p) => {
    for (const off of [-10, 0, 10]) {
      p.rotate(-18, 32, 32, () => {
        const y = 32 + off;
        p.line(5, y + off * 0.15, 15.5, y, 0.15);
        p.line(48.5, y, 56, y - 0.5, 0.15);
        for (const x of [16, 24.5, 33, 41.5]) {
          p.rrect(x - 0.5, y - 3.6, 7.6, 7.2, 2.2, 0.3);
          p.line(x + 2.2, y - 1.4, x + 4.4, y + 1.2, 0.05);
        }
      });
    }
  }),

  d('gorengan', 'Gorengan', (p) => {
    // alas kertas
    p.curve(
      [
        [6, 50],
        [20, 53],
        [44, 53],
        [58, 49],
      ],
      { wob: 0.3 },
    );
    // bakwan: bulat berbenjol
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      const r = 12.5 + p.j(1.3);
      pts.push([22 + Math.cos(a) * r, 37 + Math.sin(a) * r * 0.78]);
    }
    p.bumps(pts, 0.28, true);
    p.curve(
      [
        [16, 35],
        [19, 33],
        [22, 35.5],
      ],
      { wob: 0.1 },
    );
    p.curve(
      [
        [23, 40.5],
        [26, 39],
        [28.5, 41.5],
      ],
      { wob: 0.1 },
    );
    p.line(18, 41, 20, 43, 0.05);
    p.line(26, 32, 28, 31, 0.05);
    // tahu isi segitiga
    p.curve(
      [
        [37, 49, 1],
        [44, 26, 1],
        [57, 47, 1],
        [37, 49, 1],
      ],
      { wob: 0.4 },
    );
    p.curve(
      [
        [42, 45],
        [45.5, 40],
        [48, 45],
      ],
      { wob: 0.15 },
    );
    // cabai rawit
    p.curve(
      [
        [40, 18],
        [47, 15.5],
        [53, 17.5],
        [56, 21],
      ],
      { wob: 0.2 },
    );
    p.curve(
      [
        [40, 18],
        [47, 18],
        [56, 21],
      ],
      { wob: 0.15 },
    );
    p.line(40, 18, 37, 15, 0.1);
  }),

  d('es-teh', 'Es Teh', (p) => {
    p.poly(
      [
        [16, 12],
        [20.5, 56],
        [43.5, 56],
        [48, 12],
      ],
      false,
      0.35,
    );
    p.line(16, 12, 48, 12, 0.2);
    p.wave(17.2, 46.8, 21, 0.8, 5);
    // es batu
    p.rotate(-12, 26, 30, () => p.rrect(21, 25, 10, 9, 2, 0.25));
    p.rotate(16, 28, 42, () => p.rrect(23.5, 37.5, 9, 8.5, 2, 0.25));
    // sedotan bengkok
    p.poly(
      [
        [37, 52],
        [41, 9],
        [50, 4.5],
      ],
      false,
      0.2,
    );
    // irisan jeruk nipis di bibir gelas
    p.arc(15, 13, 6.5, 6.5, 100, 260, { wob: 0.1 });
    p.line(15, 13, 10, 10, 0.05);
    p.line(15, 13, 9.5, 15, 0.05);
  }),

  d('kopi-susu', 'Kopi Susu', (p) => {
    // gelas plastik
    p.poly(
      [
        [18, 15],
        [22, 57],
        [42, 57],
        [46, 15],
      ],
      false,
      0.3,
    );
    p.rrect(15.5, 11, 33, 4.5, 2, 0.2);
    // dua lapis: kopi & susu, berpusar
    p.curve(
      [
        [19.4, 30],
        [25, 33],
        [30, 29],
        [36, 33.5],
        [44.5, 30],
      ],
      { wob: 0.25 },
    );
    p.curve(
      [
        [26, 37],
        [30, 34.5],
        [34, 38],
        [38, 36],
      ],
      { wob: 0.15 },
    );
    p.line(21.3, 50.5, 42.7, 50.5, 0.15);
    // stiker hati
    p.circle(32, 43, 4.2, { lump: 0.02 });
    p.heart(32, 43.2, 1.9);
    // sedotan
    p.line(36, 11.5, 40, 3.8, 0.1);
    p.line(39, 11.5, 42.6, 4.6, 0.1);
  }),

  d('martabak', 'Martabak Manis', (p) => {
    for (const [x, y] of [
      [9, 36],
      [24, 20],
    ] as const) {
      // potongan: atas, lapisan isi, bawah
      p.rrect(x, y, 31, 15, 4, 0.35);
      p.wave(x + 1.5, x + 29.5, y + 7.5, 1.2, 4);
      p.dot(x + 7, y + 4.4, 0.9);
      p.dot(x + 15, y + 3.6, 0.9);
      p.dot(x + 22.5, y + 4.6, 0.9);
      p.dot(x + 11, y + 11.2, 0.8);
      p.dot(x + 20, y + 11.5, 0.8);
    }
    // keju parut di atas
    p.line(30, 15.5, 33, 14, 0.05);
    p.line(37, 16, 40, 14.5, 0.05);
    p.line(44, 15, 47, 16, 0.05);
    p.curve(
      [
        [6, 54],
        [32, 56],
        [58, 53],
      ],
      { wob: 0.3 },
    );
  }),

  d('pisang-goreng', 'Pisang Goreng', (p) => {
    for (const [cx, cy, rot] of [
      [27, 33, -28],
      [37, 41, 12],
    ] as const) {
      const pts: Array<[number, number]> = [];
      const r = rot * (Math.PI / 180);
      for (let i = 0; i < 14; i++) {
        const a = (i / 14) * Math.PI * 2;
        const rr = 1 + p.j(0.06);
        const x = Math.cos(a) * 19 * rr;
        const y = Math.sin(a) * 6.8 * rr;
        pts.push([cx + x * Math.cos(r) - y * Math.sin(r), cy + x * Math.sin(r) + y * Math.cos(r)]);
      }
      p.bumps(pts, 0.32, true);
    }
    // remah kriuk
    p.dot(16, 24, 0.8);
    p.dot(52, 47, 0.8);
    p.dot(47, 33, 0.7);
    p.curve(
      [
        [6, 55],
        [32, 57],
        [58, 54],
      ],
      { wob: 0.3 },
    );
  }),

  d('roti', 'Roti', (p) => {
    p.curve(
      [
        [15, 55, 1],
        [14.5, 31],
        [9, 26],
        [9.5, 16],
        [19, 9.5],
        [32, 10.5],
        [45, 9.5],
        [54.5, 16],
        [55, 26],
        [49.5, 31],
        [49, 55, 1],
        [15, 55, 1],
      ],
      { wob: 0.4 },
    );
    p.curve(
      [
        [20, 50.5, 1],
        [19.5, 30],
        [14.5, 25],
        [15, 18],
        [22, 14.5],
        [32, 15.5],
        [42, 14.5],
        [49, 18],
        [49.5, 25],
        [44.5, 30],
        [44, 50.5, 1],
        [20, 50.5, 1],
      ],
      { wob: 0.25 },
    );
    p.dot(27, 26, 0.8);
    p.dot(36, 23, 0.8);
    p.dot(31, 36, 0.8);
    p.dot(38, 41, 0.8);
    p.dot(25, 43, 0.8);
  }),

  d('kue-ulang-tahun', 'Kue Ulang Tahun', (p) => {
    p.circle(32, 30, 20, { ry: 5, lump: 0.02 });
    p.line(12, 30, 12.5, 50, 0.3);
    p.line(52, 30, 51.5, 50, 0.3);
    p.arc(32, 50, 19.7, 5.2, 0, 180, { wob: 0.2 });
    // krim meleleh
    p.curve(
      [
        [12.2, 33],
        [15, 38],
        [18, 34.5],
        [22, 40],
        [26, 35.5],
        [31, 39],
        [36, 35.5],
        [41, 40.5],
        [45, 35],
        [49, 38],
        [51.8, 33.5],
      ],
      { wob: 0.25 },
    );
    // piring
    p.arc(32, 51, 26, 6.5, 8, 172, { wob: 0.2 });
    // lilin & api
    p.rrect(30, 15, 4, 13, 1.2, 0.15);
    p.line(30.4, 19, 33.6, 17.5, 0.05);
    p.line(30.4, 23.5, 33.6, 22, 0.05);
    p.curve(
      [
        [32, 5, 1],
        [34.6, 9],
        [33.6, 12.2],
        [32, 12.8],
        [30.4, 12.2],
        [29.6, 9],
        [32, 5, 1],
      ],
      { wob: 0.1 },
    );
    p.line(38, 9, 40.5, 7.5, 0.05);
    p.line(26, 9, 23.5, 7.5, 0.05);
  }),

  d('semangka-potong', 'Semangka Potong', (p) => {
    p.curve(
      [
        [7, 40, 1],
        [32, 8, 1],
        [57, 40, 1],
      ],
      { wob: 0.35 },
    );
    p.curve(
      [
        [7, 40],
        [18, 50],
        [32, 53.5],
        [46, 50],
        [57, 40],
      ],
      { wob: 0.3 },
    );
    p.curve(
      [
        [10.5, 42],
        [20, 46.5],
        [32, 48.5],
        [44, 46.5],
        [53.5, 42],
      ],
      { wob: 0.25 },
    );
    for (const [x, y, a] of [
      [32, 21, 0],
      [25, 31, -25],
      [38.5, 31, 25],
      [19, 39, -40],
      [32, 37, 0],
      [45, 39, 40],
    ] as const) {
      p.rotate(a, x, y, () => {
        p.dot(x, y + 0.6, 1.2);
        p.dot(x, y - 0.6, 0.7);
      });
    }
  }),

  d('kerupuk', 'Kerupuk', (p) => {
    const pts: Array<[number, number]> = [];
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const r = 22 + p.j(1.4);
      pts.push([32 + Math.cos(a) * r, 32 + Math.sin(a) * r * 0.92]);
    }
    p.bumps(pts, 0.24, true);
    // kerutan berpusar di dalam
    p.spiral(32, 32, 2, 15, 1.8, 30, { ry: 0.9 });
    p.arc(32, 32, 18, 16.5, 200, 250, { wob: 0.2 });
    p.arc(32, 32, 18, 16.5, 20, 70, { wob: 0.2 });
  }),

  d('teh-panas', 'Teh Panas', (p) => {
    // cangkir
    p.curve(
      [
        [14, 28],
        [15, 40],
        [20, 49],
        [32, 51.5],
        [44, 49],
        [49, 40],
        [50, 28],
      ],
      { wob: 0.3 },
    );
    p.circle(32, 28, 18, { ry: 4, lump: 0.02 });
    p.curve(
      [
        [49.5, 32],
        [56, 31.5],
        [57, 37.5],
        [52, 42],
        [47, 43],
      ],
      { wob: 0.25 },
    );
    // tatakan
    p.curve(
      [
        [8, 52],
        [18, 56.5],
        [46, 56.5],
        [56, 52],
      ],
      { wob: 0.3 },
    );
    // kantong teh: tali & label
    p.curve(
      [
        [37, 28],
        [38.5, 33],
        [38, 38],
      ],
      { wob: 0.1 },
    );
    p.rrect(35, 38, 6.5, 6.5, 0.8, 0.15);
    // uap
    steam(p, 25, 21, 9);
    steam(p, 32, 20, 5.5);
    steam(p, 39, 21, 11);
  }),
];
