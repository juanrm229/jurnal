import type { Doodle } from '../types';
import { maker, type Pen, type Pt } from '../pen';

const d = maker('tanaman');

/** Pot bunga sederhana: bibir pot + badan meruncing. */
export function pot(p: Pen, top = 44, bottom = 58, w = 26): void {
  const x0 = 32 - w / 2;
  p.rrect(x0 - 1, top, w + 2, 5, 1.5);
  p.poly(
    [
      [x0 + 1.5, top + 5],
      [x0 + 4, bottom],
      [x0 + w - 4, bottom],
      [x0 + w - 1.5, top + 5],
    ],
    false,
  );
}

export const tanaman: Doodle[] = [
  d('tunas', 'Tunas', (p) => {
    p.stem([
      [32, 55],
      [32.5, 46],
      [31.5, 38],
      [32, 31],
    ]);
    p.leaf(31.6, 36, 15, 27, 8, { bend: -2.5, vein: true });
    p.leaf(32.2, 32, 49, 21, 9, { bend: 2.5, vein: true });
    p.grass(32, 56, { w: 15, ticks: 2 });
  }),

  d('rumput', 'Rumput', (p) => {
    const blades: Pt[][] = [
      [
        [22, 55],
        [19, 47],
        [13, 41],
      ],
      [
        [27, 55],
        [26, 44],
        [21, 32],
      ],
      [
        [31, 55],
        [32, 40],
        [30, 22],
      ],
      [
        [35, 55],
        [38, 43],
        [43, 31],
      ],
      [
        [39, 55],
        [44, 48],
        [51, 44],
      ],
    ];
    for (const b of blades) p.stem(b);
    p.curve(
      [
        [10, 56],
        [24, 57],
        [40, 56.5],
        [54, 56],
      ],
      { wob: 0.3 },
    );
  }),

  d('pakis', 'Pakis', (p) => {
    const stem: Pt[] = [
      [28, 56],
      [28.5, 46],
      [31, 36],
      [35, 27],
      [39.5, 20],
    ];
    p.stem(stem);
    // pucuk melingkar khas pakis
    p.spiral(40.5, 16.2, 4.2, 0.8, 0.9, 105, { dir: -1 });
    const nodes: Array<[number, number, number, number]> = [
      [28.6, 47, 1, -8],
      [29.8, 40, 0.95, -2],
      [32, 33.5, 0.8, 6],
      [34.6, 28, 0.62, 12],
      [37.4, 23.5, 0.45, 18],
    ];
    for (const [x, y, s, tilt] of nodes) {
      const a1 = ((-150 + tilt) * Math.PI) / 180;
      const a2 = ((-35 + tilt) * Math.PI) / 180;
      p.leaf(x, y, x + Math.cos(a1) * 15 * s, y + Math.sin(a1) * 15 * s, 3.2 * s + 0.6, { bend: -0.8 });
      p.leaf(x, y, x + Math.cos(a2) * 14 * s, y + Math.sin(a2) * 14 * s, 3.2 * s + 0.6, { bend: 0.8 });
    }
    p.grass(28, 56, { w: 12, ticks: 1 });
  }),

  d('kaktus', 'Kaktus', (p) => {
    p.curve([
      [26, 55],
      [25.6, 40],
      [26, 24],
      [28, 17],
      [32, 15],
      [36, 17],
      [38, 24],
      [38.4, 40],
      [38, 55],
    ]);
    // lengan kiri
    p.curve([
      [25.8, 42],
      [20, 42],
      [16.5, 38],
      [16.5, 29],
      [18.5, 27],
      [20.7, 29],
      [21, 35],
      [22.5, 37],
      [25.8, 36.5],
    ]);
    // lengan kanan
    p.curve([
      [38.2, 34],
      [43, 34],
      [46.5, 30],
      [46.5, 22],
      [44.5, 20],
      [42.4, 22],
      [42.2, 27.5],
      [40.5, 29.2],
      [38.3, 29],
    ]);
    p.curve(
      [
        [32, 21],
        [32.4, 36],
        [32, 52],
      ],
      { wob: 0.3 },
    );
    // duri
    for (const [x, y, s] of [
      [28.5, 26, -1],
      [35.5, 31, 1],
      [28.6, 44, -1],
      [35.6, 47, 1],
      [19, 33, -1],
      [44, 26, 1],
    ] as const)
      p.line(x, y, x + s * 2.2, y - 1.2, 0.1);
    // bunga kecil di puncak
    p.petal(32, 14.5, -130, 4, 5);
    p.petal(32, 14.5, -50, 4, 5);
    p.curve(
      [
        [14, 56],
        [24, 56.6],
        [40, 56.2],
        [50, 55.6],
      ],
      { wob: 0.3 },
    );
    p.line(12, 55, 11, 51.5, 0.1);
    p.line(52.5, 55, 53.5, 51, 0.1);
  }),

  d('kaktus-bulat', 'Kaktus Bulat', (p) => {
    p.circle(32, 32.5, 13, { ry: 12.5, over: 6, start: 100 });
    p.curve(
      [
        [32, 21],
        [31.6, 32],
        [32, 44],
      ],
      { wob: 0.3 },
    );
    p.curve(
      [
        [26, 22.5],
        [23.5, 32],
        [26, 43.5],
      ],
      { wob: 0.3 },
    );
    p.curve(
      [
        [38, 22.5],
        [40.5, 32],
        [38, 43.5],
      ],
      { wob: 0.3 },
    );
    for (const [x, y, s] of [
      [28.8, 28, -1],
      [35.2, 37, 1],
      [28.8, 39, -1],
      [35.2, 27, 1],
      [21, 34, -1],
      [43, 32, 1],
    ] as const)
      p.line(x, y, x + s * 2, y - 1.4, 0.05);
    p.petal(32, 20, -125, 4.5, 5.5);
    p.petal(32, 20, -90, 5, 5.5);
    p.petal(32, 20, -55, 4.5, 5.5);
    pot(p, 45, 58, 26);
  }),

  d('jamur', 'Jamur', (p) => {
    p.shape([
      [13, 35],
      [16, 25],
      [24, 17.5],
      [32, 15.5],
      [41, 17.5],
      [48, 25],
      [51, 35],
      [42, 37],
      [32, 36.5],
      [22, 37],
    ]);
    p.curve([
      [26, 37],
      [25.5, 47],
      [24.5, 55],
    ]);
    p.curve([
      [38, 37],
      [38.5, 47],
      [39.5, 55],
    ]);
    p.circle(23.5, 27, 2.6);
    p.circle(35, 22.5, 3.2);
    p.circle(42.5, 30, 2.2);
    p.circle(30.5, 31, 1.6);
    p.grass(32, 56, { w: 16, gapL: 8.5, gapR: 8.5, ticks: 1 });
  }),

  d('jamur-dua', 'Dua Jamur', (p) => {
    // besar
    p.shape([
      [9, 32],
      [12, 23],
      [19, 17],
      [25, 15.5],
      [32, 17],
      [38, 23],
      [41, 32],
      [33, 33.6],
      [25, 33],
      [17, 33.6],
    ]);
    p.curve([
      [20.5, 33.5],
      [20, 45],
      [19.5, 55],
    ]);
    p.curve([
      [29.5, 33.5],
      [30, 45],
      [31, 55],
    ]);
    p.circle(18.5, 24, 2.2);
    p.circle(28, 21.5, 2.6);
    // kecil
    p.shape([
      [36, 43],
      [38, 37],
      [44, 34],
      [50, 37],
      [53, 43],
      [44.5, 44.2],
    ]);
    p.curve([
      [41.5, 44],
      [41.2, 50],
      [40.8, 55],
    ]);
    p.curve([
      [47.5, 44],
      [47.8, 50],
      [48.5, 55],
    ]);
    p.dot(44, 38.5, 1.2);
    p.curve(
      [
        [8, 56],
        [24, 56.8],
        [40, 56.3],
        [56, 55.6],
      ],
      { wob: 0.3 },
    );
    p.line(35, 55.5, 34.3, 51.5, 0.1);
    p.line(53.5, 55.5, 54.4, 51.8, 0.1);
  }),

  d('semak', 'Semak', (p) => {
    p.bumps(
      [
        [11, 54],
        [9, 45],
        [12, 37],
        [19, 31],
        [26, 25],
        [35, 24],
        [43, 28],
        [49, 34],
        [54, 42],
        [53, 54],
      ],
      0.42,
    );
    p.curve(
      [
        [6, 55],
        [22, 56.5],
        [40, 56],
        [58, 55],
      ],
      { wob: 0.3 },
    );
    p.arc(24, 41, 6, 5, 200, 290);
    p.arc(39, 44, 6, 5, 220, 320);
    p.dot(30, 34, 1.5);
    p.dot(44, 38, 1.5);
    p.dot(19, 47, 1.5);
    p.dot(34, 49, 1.5);
  }),

  d('pohon-kecil', 'Pohon Kecil', (p) => {
    p.bumps(
      [
        [22, 40],
        [14, 35],
        [13, 25],
        [19, 17],
        [27, 12],
        [37, 12],
        [45, 17],
        [51, 25],
        [50, 35],
        [42, 40],
      ],
      0.4,
      true,
    );
    p.curve([
      [29, 56],
      [29.6, 47],
      [29, 39.5],
    ]);
    p.curve([
      [35, 56],
      [34.4, 47],
      [35.2, 39.5],
    ]);
    p.curve(
      [
        [34.5, 45],
        [38, 41.5],
        [41, 40.5],
      ],
      { wob: 0.2 },
    );
    p.arc(26, 26, 6, 5, 160, 260);
    p.arc(39, 30, 5, 4, 200, 300);
    p.grass(32, 56, { w: 15, gapL: 5, gapR: 5, ticks: 1 });
  }),

  d('pohon-cemara', 'Pohon Cemara', (p) => {
    p.poly(
      [
        [32, 7],
        [22, 22],
        [27, 21.5],
        [17, 35],
        [24, 34.5],
        [13, 48],
        [51, 48],
        [40, 34.5],
        [47, 35],
        [37, 21.5],
        [42, 22],
      ],
      true,
    );
    p.line(29, 48.5, 29, 56, 0.2);
    p.line(35, 48.5, 35.2, 56, 0.2);
    p.grass(32, 56, { w: 14, gapL: 5, gapR: 5, ticks: 1 });
  }),

  d('lavender', 'Lavender', (p) => {
    const stems: Array<[Pt[], number]> = [
      [
        [
          [32, 56],
          [32.4, 40],
          [32, 16],
        ],
        0,
      ],
      [
        [
          [30.5, 56],
          [27, 40],
          [21, 22],
        ],
        -18,
      ],
      [
        [
          [33.5, 56],
          [37.5, 41],
          [43.5, 24],
        ],
        18,
      ],
    ];
    for (const [pts, tilt] of stems) {
      p.stem(pts);
      const top = pts[2]!;
      const ang = -90 + tilt;
      const ux = Math.cos((ang * Math.PI) / 180);
      const uy = Math.sin((ang * Math.PI) / 180);
      for (let i = 0; i < 4; i++) {
        const t = 2 + i * 3.6;
        const x = top[0] - ux * t;
        const y = top[1] - uy * t;
        p.petal(x, y, ang - 42, 3.6 - i * 0.2, 4.2);
        p.petal(x, y, ang + 42, 3.6 - i * 0.2, 4.2);
      }
      p.petal(top[0], top[1], ang, 3, 3.6);
    }
    p.grass(32, 56, { w: 13, gapL: 4, gapR: 4, ticks: 1 });
  }),

  d('alang', 'Alang-alang', (p) => {
    p.stem([
      [24, 56],
      [22, 44],
      [15, 30],
    ]);
    p.stem([
      [38, 56],
      [41, 44],
      [48, 34],
    ]);
    p.stem([
      [28, 56],
      [27, 46],
      [25, 38],
    ]);
    p.stem([
      [32, 56],
      [32.6, 36],
      [31, 10],
    ]);
    // malai berbulu
    for (let i = 0; i < 6; i++) {
      const y = 12 + i * 3.4;
      const x = 31.1 + i * 0.25;
      const l = 5 - Math.abs(i - 2) * 0.6;
      p.curve(
        [
          [x, y + 1],
          [x - l * 0.6, y - 0.6],
          [x - l, y - 2.4],
        ],
        { wob: 0.15 },
      );
      p.curve(
        [
          [x, y + 1],
          [x + l * 0.6, y - 0.6],
          [x + l, y - 2.4],
        ],
        { wob: 0.15 },
      );
    }
    p.grass(32, 56, { w: 16, gapL: 9, gapR: 7, ticks: 1 });
  }),

  d('daun-monstera', 'Daun Monstera', (p) => {
    // setengah kiri dari atas ke bawah; sisi kanan = cerminnya
    const left: Pt[] = [
      [32, 15.5],
      [26, 11.5],
      [18.5, 13],
      [13.5, 18],
      [12.4, 20.5, 1],
      [23, 24, 1],
      [11.3, 25.5, 1],
      [10.2, 30.5],
      [11, 34.5, 1],
      [22.5, 32.8, 1],
      [12.8, 38.6, 1],
      [16.5, 43],
      [24, 46.2],
    ];
    const right: Pt[] = [...left].reverse().map((q) => (q[2] === 1 ? [64 - q[0], q[1], 1] : [64 - q[0], q[1]]) as Pt);
    p.shape([...left, [32, 47], ...right]);
    p.curve(
      [
        [32, 47],
        [32.3, 31],
        [32, 17],
      ],
      { wob: 0.25 },
    );
    p.circle(26.5, 39.5, 1.6, { ry: 2.6, rot: 30 });
    p.circle(37.5, 39.5, 1.6, { ry: 2.6, rot: -30 });
    p.circle(26, 18.5, 1.5, { ry: 2.3, rot: -30 });
    p.stem([
      [32, 47],
      [31.4, 52],
      [32, 56],
    ]);
    p.grass(32, 56, { w: 12, ticks: 1 });
  }),

  d('bambu', 'Bambu', (p) => {
    const stalk = (x: number, top: number, nodes: number[]): void => {
      p.line(x, 56, x - 0.5, top, 0.25);
      p.line(x + 5, 56, x + 5.4, top, 0.25);
      p.line(x - 0.6, top, x + 5.4, top, 0.15);
      for (const y of nodes) p.curve(
        [
          [x - 1, y],
          [x + 2.5, y + 1.2],
          [x + 6, y - 0.2],
        ],
        { wob: 0.1 },
      );
    };
    stalk(22, 10, [22, 34, 46]);
    stalk(36, 17, [28, 40]);
    p.leaf(22, 22, 10, 14, 4.2, { bend: -1 });
    p.leaf(21.6, 34, 10, 31, 3.8, { bend: 1 });
    p.leaf(27.4, 28, 33, 21.5, 3.2, { bend: -1 });
    p.leaf(41.4, 28, 53, 22, 4.2, { bend: -1 });
    p.leaf(41.6, 40, 53, 42, 3.8, { bend: 1 });
    p.curve(
      [
        [12, 56],
        [28, 56.8],
        [52, 56],
      ],
      { wob: 0.3 },
    );
  }),

  d('lidah-buaya', 'Lidah Buaya', (p) => {
    p.leaf(30, 44, 14, 20, 4.4, { bend: -1.5 });
    p.leaf(31, 44, 25, 11, 4.4, { bend: -1 });
    p.leaf(33, 44, 39, 11, 4.4, { bend: 1 });
    p.leaf(34, 44, 50, 20, 4.4, { bend: 1.5 });
    p.leaf(29, 44.5, 9, 34, 3.8, { bend: -2 });
    p.leaf(35, 44.5, 55, 34, 3.8, { bend: 2 });
    pot(p, 44, 58, 26);
  }),

  d('tanaman-pot', 'Tanaman Pot', (p) => {
    p.stem([
      [32, 44],
      [32.5, 32],
      [31.5, 20],
    ]);
    p.stem([
      [31, 44],
      [27, 34],
      [20, 28],
    ]);
    p.stem([
      [33, 44],
      [37, 36],
      [44, 31],
    ]);
    p.leaf(31.5, 20.5, 31, 8, 5, { vein: true });
    p.leaf(20.5, 28.5, 10, 23, 5, { bend: -1, vein: true });
    p.leaf(43.5, 31.5, 54, 26, 5, { bend: 1, vein: true });
    p.leaf(32.2, 32, 40, 25, 3.6);
    p.leaf(28, 36, 21, 38, 3.4);
    pot(p, 44, 58, 24);
  }),

  d('semanggi', 'Semanggi', (p) => {
    const c: [number, number] = [32, 27];
    const lobes: Array<[number, number]> = [
      [32, 16.5],
      [22.5, 31.5],
      [41.5, 31.5],
    ];
    for (const [x, y] of lobes) {
      const ang = (Math.atan2(c[1] - y, c[0] - x) * 180) / Math.PI;
      p.heart(x, y, 8, ang - 90);
    }
    p.stem([
      [32, 28.5],
      [34, 39],
      [31.5, 48],
      [32.5, 55],
    ]);
    p.grass(32, 56, { w: 13, ticks: 2 });
  }),

  d('ilalang', 'Ilalang', (p) => {
    // batang melengkung dengan bulir menggantung
    const arches: Pt[][] = [
      [
        [30, 56],
        [27, 36],
        [20, 18],
        [12, 16],
        [9, 22],
      ],
      [
        [33, 56],
        [36, 38],
        [43, 22],
        [51, 20],
        [54, 27],
      ],
      [
        [31.5, 56],
        [32, 40],
        [33, 26],
      ],
    ];
    for (const a of arches) p.stem(a);
    const hang = (x: number, y: number): void => {
      p.line(x, y, x - 0.4, y + 3, 0.05);
      p.petal(x - 0.4, y + 3, 92, 3.2, 3.6);
    };
    hang(17, 17);
    hang(12.5, 17.2);
    hang(46, 20.6);
    hang(50.6, 20.4);
    p.petal(33, 26, -90, 4.5, 4.4);
    p.petal(33, 26, -125, 3.6, 3.8);
    p.petal(33, 26, -55, 3.6, 3.8);
    p.stem([
      [28, 56],
      [24, 48],
      [18, 44],
    ]);
    p.stem([
      [35, 56],
      [40, 49],
      [46, 47],
    ]);
    p.grass(32, 56, { w: 14, gapL: 5, gapR: 4, ticks: 1 });
  }),

  d('rumput-laut', 'Rumput Laut', (p) => {
    p.curve([
      [22, 54],
      [19, 46],
      [24, 38],
      [19, 30],
      [23, 21],
      [20, 13],
    ]);
    p.curve([
      [31, 54],
      [34, 45],
      [29, 36],
      [33, 27],
      [30, 18],
    ]);
    p.curve([
      [40, 54],
      [37, 47],
      [42, 40],
      [38, 32],
      [41, 25],
    ]);
    p.leaf(21.5, 42, 15, 37, 2.6);
    p.leaf(31.5, 40, 38, 36, 2.6);
    p.leaf(21, 25, 27, 20, 2.4);
    p.leaf(39.5, 36, 46, 33, 2.4);
    p.circle(47, 16, 2.6);
    p.circle(44, 9, 1.6);
    p.circle(13, 20, 1.8);
    p.bumps(
      [
        [12, 56],
        [20, 53],
        [28, 54.5],
        [36, 53],
        [44, 54.5],
        [52, 56],
      ],
      0.25,
    );
  }),

  d('pohon-kelapa', 'Pohon Kelapa', (p) => {
    p.curve([
      [38, 55],
      [37, 44],
      [34, 32],
      [29, 20],
    ]);
    p.curve([
      [43, 55],
      [41.5, 44],
      [38.5, 32],
      [33, 20],
    ]);
    for (const [x, y] of [
      [37.4, 46],
      [36, 38],
      [33.8, 30],
    ] as const)
      p.line(x, y, x + 4.4, y - 0.8, 0.1);
    const top: [number, number] = [31, 18];
    const fronds: Pt[][] = [
      [top, [20, 11], [8, 18]],
      [top, [24, 7], [13, 6]],
      [top, [37, 7], [48, 9]],
      [top, [43, 13], [54, 22]],
      [top, [22, 18], [15, 28]],
    ];
    for (const f of fronds) {
      p.curve(f, { wob: 0.3 });
      const a = f[1]!;
      const b = f[2]!;
      for (const t of [0.35, 0.7]) {
        const x = a[0] + (b[0] - a[0]) * t;
        const y = a[1] + (b[1] - a[1]) * t;
        p.line(x, y + 0.4, x + (b[0] > top[0] ? -1.2 : 1.2), y + 4.2, 0.1);
      }
    }
    p.circle(29.5, 21.5, 2.3);
    p.circle(34, 22, 2.3);
    p.curve(
      [
        [14, 57],
        [28, 54.5],
        [44, 55],
        [56, 57],
      ],
      { wob: 0.3 },
    );
  }),
];
