import type { Doodle } from '../types';
import { maker } from '../pen';

const d = maker('token');

export const token: Doodle[] = [
  d('kunci', 'Kunci', (p) => {
    p.rotate(-40, 32, 32, () => {
      p.circle(13, 32, 8.4);
      p.circle(13, 32, 3);
      p.line(21.4, 30, 55, 30, 0.2);
      p.line(21.4, 34, 47, 34, 0.2);
      p.poly(
        [
          [55, 30.4],
          [55, 40],
          [51, 40],
          [51, 36.5],
          [47.4, 36.5],
          [47.4, 33.8],
        ],
        false,
        0.15,
      );
    });
  }),

  d('payung', 'Payung', (p) => {
    p.arc(32, 31, 22, 21, 180, 360, { lump: 0.015 });
    const xs = [10, 21, 32, 43, 54];
    p.bumps(
      xs.map((x) => [x, 31] as [number, number]).reverse(),
      0.22,
    );
    p.curve(
      [
        [32, 10],
        [22, 18],
        [21, 31],
      ],
      { wob: 0.15 },
    );
    p.curve(
      [
        [32, 10],
        [42, 18],
        [43, 31],
      ],
      { wob: 0.15 },
    );
    p.line(32, 10.5, 32, 30, 0.1);
    p.line(32, 10, 32, 6, 0.05);
    p.curve(
      [
        [32, 31],
        [32.2, 44],
        [32, 52.5],
        [29.5, 56],
        [26, 55],
        [25, 51.5],
      ],
      { wob: 0.15 },
    );
  }),

  d('tiket', 'Tiket', (p) => {
    p.rotate(-12, 32, 32, () => {
      p.curve(
        [
          [8, 20, 1],
          [56, 20, 1],
          [56, 27, 1],
          [52.5, 29.5],
          [52.5, 34.5],
          [56, 37, 1],
          [56, 44, 1],
          [8, 44, 1],
          [8, 37, 1],
          [11.5, 34.5],
          [11.5, 29.5],
          [8, 27, 1],
          [8, 20],
        ],
        { wob: 0.3 },
      );
      p.dashed(
        [
          [42, 21.5],
          [42, 43],
        ],
        2.2,
        2.4,
      );
      p.line(17, 27.5, 35, 27.5, 0.15);
      p.line(17, 32.5, 31, 32.5, 0.15);
      p.line(17, 37.5, 34, 37.5, 0.15);
      p.heart(48.5, 32, 3.2);
    });
  }),

  d('kerang', 'Kerang', (p) => {
    const n = 6;
    const cx = 32;
    const cy = 49;
    const pts: Array<[number, number]> = [];
    for (let i = 0; i <= n; i++) {
      const a = ((205 + (130 * i) / n) * Math.PI) / 180;
      pts.push([cx + Math.cos(a) * 24, cy + Math.sin(a) * 33]);
    }
    p.bumps(pts, 0.3);
    const first = pts[0]!;
    const last = pts[pts.length - 1]!;
    p.curve(
      [
        [first[0], first[1]],
        [22, 44],
        [28, 49],
      ],
      { wob: 0.2 },
    );
    p.curve(
      [
        [last[0], last[1]],
        [42, 44],
        [36, 49],
      ],
      { wob: 0.2 },
    );
    for (let i = 1; i < n; i++) {
      const q = pts[i]!;
      p.line(cx + (q[0] - cx) * 0.12, 48, q[0] + (cx - q[0]) * 0.08, q[1] + 1.6, 0.2);
    }
    p.poly(
      [
        [27, 48.5],
        [25, 55],
        [39, 55],
        [37, 48.5],
      ],
      true,
      0.15,
    );
  }),

  d('lilin', 'Lilin', (p) => {
    p.curve(
      [
        [24, 30],
        [24.4, 42],
        [24, 53],
      ],
      { wob: 0.2 },
    );
    p.curve(
      [
        [40, 30],
        [39.6, 42],
        [40, 53],
      ],
      { wob: 0.2 },
    );
    p.circle(32, 30, 8, { ry: 2.4, over: 5 });
    p.curve(
      [
        [27, 32],
        [27.6, 37],
        [29, 38],
        [30, 34],
        [31, 32.6],
      ],
      { wob: 0.1 },
    );
    p.line(32, 28, 32, 23.5, 0.05);
    p.curve(
      [
        [32, 8, 1],
        [28, 15],
        [27.4, 19.5],
        [29.5, 23],
        [32, 23.6],
        [34.5, 23],
        [36.6, 19.5],
        [36, 15],
        [32, 8],
      ],
      { wob: 0.2 },
    );
    p.line(21, 12, 18, 9, 0.05);
    p.line(43, 12, 46, 9, 0.05);
    p.line(19.5, 20, 16, 20, 0.05);
    p.line(44.5, 20, 48, 20, 0.05);
    p.circle(32, 54, 19, { ry: 4, over: 6 });
  }),

  d('perangko', 'Perangko', (p) => {
    const x0 = 12;
    const y0 = 10;
    const x1 = 52;
    const y1 = 54;
    const edge = (ax: number, ay: number, bx: number, by: number, n: number): Array<[number, number]> => {
      const out: Array<[number, number]> = [];
      for (let i = 0; i < n; i++) out.push([ax + ((bx - ax) * i) / n, ay + ((by - ay) * i) / n]);
      return out;
    };
    const pts = [
      ...edge(x0, y0, x1, y0, 8),
      ...edge(x1, y0, x1, y1, 9),
      ...edge(x1, y1, x0, y1, 8),
      ...edge(x0, y1, x0, y0, 9),
    ];
    p.bumps(pts, -0.32, true);
    p.poly(
      [
        [17, 15],
        [47, 15],
        [47, 49],
        [17, 49],
      ],
      true,
      0.25,
    );
    // gambar kecil: bukit dan matahari
    p.curve(
      [
        [17.5, 42],
        [25, 34],
        [31, 38],
        [38, 31],
        [46.5, 39],
      ],
      { wob: 0.2 },
    );
    p.circle(26, 24, 3.6);
    p.line(36, 44.5, 43, 44.5, 0.05);
  }),

  d('kompas', 'Kompas', (p) => {
    p.circle(32, 33, 22);
    p.circle(32, 33, 17.5, { lump: 0.02 });
    p.poly(
      [
        [32, 18],
        [36.5, 33],
        [32, 48],
        [27.5, 33],
      ],
      true,
      0.2,
    );
    p.line(27.8, 33, 36.2, 33, 0.05);
    p.line(30.4, 26, 33.6, 26, 0.05);
    p.line(30, 29, 34, 29, 0.05);
    p.dot(32, 33, 1.4);
    p.line(32, 11, 32, 14, 0.05);
    p.line(54, 33, 51, 33, 0.05);
    p.line(32, 55, 32, 52, 0.05);
    p.line(10, 33, 13, 33, 0.05);
    p.circle(32, 8, 2.6);
  }),

  d('daun-kering', 'Daun Kering', (p) => {
    p.rotate(32, 32, 32, () => {
      const left: Array<[number, number]> = [
        [32, 8],
        [25, 13],
        [20, 22],
        [19.5, 32],
        [23, 42],
        [32, 49],
      ];
      p.bumps(left, -0.3);
      const right: Array<[number, number]> = left.map(([x, y]) => [64 - x, y]);
      p.bumps(right, 0.3);
      p.curve(
        [
          [32, 58],
          [32.3, 40],
          [32, 12],
        ],
        { wob: 0.2 },
      );
      for (const [y, l] of [
        [20, 7],
        [29, 9],
        [38, 8],
      ] as const) {
        p.line(32, y + 4, 32 - l, y, 0.1);
        p.line(32, y + 4, 32 + l, y, 0.1);
      }
    });
  }),

  d('pita', 'Pita', (p) => {
    p.shape([
      [29, 28],
      [22, 21],
      [13, 19],
      [10, 26],
      [13, 34],
      [21, 34.5],
      [29, 32.5],
    ]);
    p.shape([
      [35, 28],
      [42, 21],
      [51, 19],
      [54, 26],
      [51, 34],
      [43, 34.5],
      [35, 32.5],
    ]);
    p.rrect(28.5, 26, 7, 8.5, 2.5, 0.15);
    p.poly(
      [
        [29.5, 34.5],
        [23, 51],
        [26.5, 49],
        [28.5, 53],
        [33, 35],
      ],
      false,
      0.2,
    );
    p.poly(
      [
        [34.5, 34.5],
        [41, 50],
        [37.5, 48.5],
        [35.5, 52],
        [31.5, 35.5],
      ],
      false,
      0.2,
    );
    p.line(16, 25, 22, 27.5, 0.05);
    p.line(48, 25, 42, 27.5, 0.05);
  }),
];
