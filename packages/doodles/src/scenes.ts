/**
 * Ilustrasi besar ("scene") untuk layar kosong, onboarding, dan momen-momen kecil.
 *
 * Gaya sama dengan doodle: tinta biru, stroke-only, sedikit goyang. Setiap scene
 * disusun dari doodle yang sudah ada (path-nya ditransformasi ke kanvas besar)
 * ditambah garis tangan baru. `strokes` berurutan sesuai urutan menggambar, jadi
 * konsumen bisa menganimasikannya dengan stroke-dashoffset dari pertama ke terakhir;
 * `layers` mengelompokkan stroke yang sama untuk animasi bertahap.
 */
import { Pen, sampleCatmull, type Pt } from './pen';
import { DOODLE_BY_ID, INK } from './catalog';
import { fnv1a } from './hash';
import { pathBBox, placeMatrix, transformPath, type Affine } from './path';
import { arrowHead, drop, scribble, sparkle, star5 } from './data/alat';

export type Scene = {
  id: string;
  name: string;
  /** '0 0 480 320' (lanskap) atau '0 0 320 480' (potret). */
  viewBox: string;
  /** Semua garis, urut menggambar. */
  strokes: string[];
  /** Titik-titik terisi (mata, bintang kecil). */
  fills?: string[];
  /** Pengelompokan `strokes` (subset berurutan) + jeda mulai dalam milidetik. */
  layers?: { strokes: string[]; delay: number }[];
};

const LAND = '0 0 480 320';
const PORT = '0 0 320 480';

interface PlaceOpts {
  rot?: number;
  flip?: boolean;
}

class ScenePen extends Pen {
  private marks: Array<{ at: number; delay: number }> = [];

  constructor(seed: number) {
    super(seed);
    this.wob = 0.8;
  }

  private push(id: string, m: Affine): void {
    const dd = DOODLE_BY_ID[id];
    if (!dd) throw new Error(`scene: doodle '${id}' tidak ada`);
    for (const s of dd.strokes) this.strokes.push(transformPath(s, m));
    for (const f of dd.fills ?? []) this.fills.push(transformPath(f, m));
  }

  /** Tempel doodle: pusat kanvas 64 ke (x, y), lebar menjadi `size`. */
  place(id: string, x: number, y: number, size: number, o: PlaceOpts = {}): this {
    this.push(id, placeMatrix(32, 32, x, y, size / 64, o.rot ?? 0, o.flip ?? false));
    return this;
  }

  /** Tanam doodle: tengah-bawah kotak pembatasnya diletakkan di (x, baseY). */
  plant(id: string, x: number, baseY: number, size: number, o: PlaceOpts = {}): this {
    const dd = DOODLE_BY_ID[id];
    if (!dd) throw new Error(`scene: doodle '${id}' tidak ada`);
    const [x0, , x1, y1] = pathBBox(dd.strokes);
    const m = placeMatrix(32, 32, 0, 0, size / 64, o.rot ?? 0, o.flip ?? false);
    const bx = (x0 + x1) / 2;
    const px = m[0] * bx + m[2] * y1 + m[4];
    const py = m[1] * bx + m[3] * y1 + m[5];
    this.push(id, [m[0], m[1], m[2], m[3], m[4] + x - px, m[5] + baseY + 1.5 - py]);
    return this;
  }

  /** Mulai kelompok animasi baru. */
  layer(delay: number): this {
    this.marks.push({ at: this.strokes.length, delay });
    return this;
  }

  layers(): Scene['layers'] {
    if (this.marks.length === 0) return undefined;
    return this.marks.map((mk, i) => ({
      strokes: this.strokes.slice(mk.at, this.marks[i + 1]?.at ?? this.strokes.length),
      delay: mk.delay,
    }));
  }
}

function scene(id: string, name: string, viewBox: string, draw: (p: ScenePen) => void): Scene {
  const p = new ScenePen(fnv1a(`scene:${id}`));
  draw(p);
  const s: Scene = { id, name, viewBox, strokes: [...p.strokes] };
  if (p.fills.length > 0) s.fills = [...p.fills];
  const layers = p.layers();
  if (layers) s.layers = layers;
  return s;
}

// ---------- pembantu ----------

/** y pada kurva (tanpa goyang) untuk x tertentu. */
function yAt(pts: readonly Pt[], x: number): number {
  const s = sampleCatmull(pts, 16);
  for (let i = 1; i < s.length; i++) {
    const a = s[i - 1]!;
    const b = s[i]!;
    if ((x >= a[0] && x <= b[0]) || (x <= a[0] && x >= b[0])) {
      const t = b[0] === a[0] ? 0 : (x - a[0]) / (b[0] - a[0]);
      return a[1] + (b[1] - a[1]) * t;
    }
  }
  return s[s.length - 1]?.[1] ?? 0;
}

/** Burung kecil bentuk "v" melengkung. */
function birdV(p: Pen, x: number, y: number, s: number): void {
  p.curve(
    [
      [x - s, y - s * 0.2],
      [x - s * 0.5, y - s * 0.6],
      [x, y],
    ],
    { wob: 0.2 },
  );
  p.curve(
    [
      [x, y],
      [x + s * 0.5, y - s * 0.6],
      [x + s, y - s * 0.25],
    ],
    { wob: 0.2 },
  );
}

/** Tanah datar dengan rumput pendek. */
function ground(p: Pen, x0: number, x1: number, y: number, ticks: number[] = []): void {
  p.curve(
    [
      [x0, y],
      [(x0 * 2 + x1) / 3, y + 1.2],
      [(x0 + x1 * 2) / 3, y - 0.8],
      [x1, y + 0.4],
    ],
    { wob: 0.6 },
  );
  for (const x of ticks) {
    p.line(x, y, x - 1.5, y - 6, 0.2);
    p.line(x + 3.5, y, x + 4.5, y - 8, 0.2);
    p.line(x + 7, y, x + 9, y - 5, 0.2);
  }
}

/** Jendela dengan kusen silang & tirai kecil. */
function windowPane(p: Pen, x: number, y: number, w: number, h: number, curtain = true): void {
  p.rrect(x, y, w, h, 3, 0.6);
  p.line(x + w / 2, y + 2, x + w / 2, y + h - 2, 0.4);
  p.line(x + 2, y + h * 0.55, x + w - 2, y + h * 0.55, 0.4);
  if (curtain) {
    p.curve(
      [
        [x + 3, y + 3],
        [x + w * 0.16, y + h * 0.3],
        [x + 3, y + h * 0.5],
      ],
      { wob: 0.3 },
    );
    p.curve(
      [
        [x + w - 3, y + 3],
        [x + w * 0.84, y + h * 0.3],
        [x + w - 3, y + h * 0.5],
      ],
      { wob: 0.3 },
    );
  }
}

/** Cahaya: garis pendek memancar di sekitar kotak. */
function glow(p: Pen, x: number, y: number, w: number, h: number, gap = 8, len = 7): void {
  const cx = x + w / 2;
  const cy = y + h / 2;
  for (const a of [-150, -110, -70, -30, 30, 150]) {
    const r = (a * Math.PI) / 180;
    const ex = cx + Math.cos(r) * (w / 2 + gap);
    const ey = cy + Math.sin(r) * (h / 2 + gap);
    p.line(ex, ey, ex + Math.cos(r) * len, ey + Math.sin(r) * len, 0.2);
  }
}

// ---------- scene ----------

export const SCENES: Scene[] = [
  scene('taman-tahun', 'Taman Setahun', LAND, (p) => {
    const hill: Pt[] = [
      [10, 262],
      [80, 250],
      [160, 256],
      [240, 244],
      [320, 251],
      [400, 242],
      [470, 249],
    ];
    p.layer(0);
    p.curve(hill, { wob: 1 });
    for (const [x, w] of [
      [60, 18],
      [210, 22],
      [350, 16],
      [440, 14],
    ] as const) {
      const y = yAt(hill, x) + 12;
      p.curve(
        [
          [x - w / 2, y],
          [x, y + 2],
          [x + w / 2, y - 0.5],
        ],
        { wob: 0.3 },
      );
    }
    p.layer(600);
    const plants: Array<[string, number, number]> = [
      ['rumput', 30, 42],
      ['tunas', 70, 58],
      ['bunga-matahari', 114, 96],
      ['kuncup', 150, 44],
      ['jamur', 178, 50],
      ['tulip', 212, 70],
      ['semanggi', 244, 44],
      ['daisy', 274, 74],
      ['jamur-dua', 310, 52],
      ['lavender', 344, 76],
      ['bunga-kecil', 374, 46],
      ['dandelion', 406, 82],
      ['pakis', 446, 60],
    ];
    for (const [id, x, s] of plants) p.plant(id, x, yAt(hill, x), s);
    p.layer(1700);
    // penyiram miring menuang ke tunas
    p.place('penyiram', 52, 140, 84, { flip: true, rot: 22 });
    for (const [x, y] of [
      [92, 178],
      [86, 192],
      [98, 196],
      [92, 210],
    ] as const)
      p.line(x, y, x - 1.5, y + 6, 0.2);
    // matahari kecil
    p.place('matahari-kecil', 404, 70, 74);
    // lebah & jalur terbangnya
    p.dashed(
      [
        [176, 196],
        [196, 168],
        [224, 160],
        [232, 180],
        [214, 184],
        [214, 164],
        [240, 140],
        [272, 126],
      ],
      5,
      6,
    );
    p.place('lebah', 296, 116, 54, { rot: -10 });
    p.place('awan-kecil', 232, 58, 64);
  }),

  scene('dua-jendela', 'Dua Jendela', LAND, (p) => {
    p.layer(0);
    // rumah kiri (senja)
    p.poly(
      [
        [42, 262],
        [42, 176],
        [128, 176],
        [128, 262],
      ],
      false,
    );
    p.poly(
      [
        [32, 180],
        [85, 126],
        [138, 180],
      ],
      false,
    );
    p.poly(
      [
        [108, 152],
        [108, 132],
        [120, 132],
        [120, 164],
      ],
      false,
      0.5,
    );
    // rumah kanan (malam): atap datar + tangki air
    p.poly(
      [
        [352, 262],
        [352, 172],
        [442, 172],
        [442, 262],
      ],
      false,
    );
    p.line(346, 172, 448, 172, 0.6);
    p.rrect(362, 150, 20, 22, 4, 0.5);
    p.line(372, 150, 372, 142, 0.3);
    ground(p, 12, 172, 262, [20, 150]);
    ground(p, 300, 470, 262, [312, 455]);
    p.layer(700);
    windowPane(p, 62, 196, 46, 40);
    windowPane(p, 374, 192, 46, 40);
    p.rrect(70, 212, 8, 6, 2, 0.3);
    glow(p, 374, 192, 46, 40, 7, 6);
    p.layer(1300);
    // langit kiri: matahari terbenam
    p.arc(162, 262, 28, 28, 180, 360);
    for (const a of [195, 225, 255, 285, 315, 345]) {
      const r = (a * Math.PI) / 180;
      p.line(162 + Math.cos(r) * 37, 262 + Math.sin(r) * 37, 162 + Math.cos(r) * 47, 262 + Math.sin(r) * 47, 0.3);
    }
    birdV(p, 58, 92, 8);
    birdV(p, 80, 80, 6);
    // langit kanan: bulan & bintang
    p.place('bulan', 424, 70, 66);
    sparkle(p, 336, 64, 9);
    sparkle(p, 456, 136, 6);
    star5(p, 372, 104, 6);
    p.dot(310, 100, 2);
    p.dot(400, 128, 1.6);
    p.layer(2000);
    // garis titik-titik melewati amplop kecil
    p.dashed(
      [
        [110, 214],
        [140, 188],
        [172, 154],
        [210, 146],
      ],
      1.2,
      8,
    );
    p.place('amplop', 240, 146, 68, { rot: -6 });
    p.dashed(
      [
        [270, 144],
        [306, 136],
        [338, 160],
        [372, 196],
      ],
      1.2,
      8,
    );
  }),

  scene('amplop-segel', 'Amplop Bersegel', LAND, (p) => {
    p.layer(0);
    p.rrect(100, 70, 280, 180, 6, 1);
    // tutup amplop berhenti di tepi segel
    const sx = 240;
    const sy = 172;
    for (const [cx, cy] of [
      [103, 74],
      [377, 74],
    ] as const) {
      const dx = sx - cx;
      const dy = sy - cy;
      const len = Math.hypot(dx, dy);
      const k = (len - 36) / len;
      p.line(cx, cy, cx + dx * k, cy + dy * k, 0.8);
    }
    p.line(103, 247, 196, 180, 0.8);
    p.line(377, 247, 284, 180, 0.8);
    p.layer(800);
    // pita di bawah segel
    p.curve(
      [
        [228, 196],
        [222, 222],
        [226, 246],
        [214, 272],
      ],
      { wob: 0.5 },
    );
    p.curve(
      [
        [240, 200],
        [236, 224],
        [240, 248],
        [230, 278],
      ],
      { wob: 0.5 },
    );
    p.poly(
      [
        [214, 272],
        [224, 268],
        [230, 278],
      ],
      false,
      0.3,
    );
    p.curve(
      [
        [252, 196],
        [258, 220],
        [254, 244],
        [264, 270],
      ],
      { wob: 0.5 },
    );
    p.curve(
      [
        [240, 200],
        [246, 222],
        [242, 246],
        [250, 276],
      ],
      { wob: 0.5 },
    );
    p.poly(
      [
        [264, 270],
        [255, 268],
        [250, 276],
      ],
      false,
      0.3,
    );
    p.place('segel-lilin', sx, sy, 104);
    p.layer(1600);
    sparkle(p, 404, 58, 14);
    sparkle(p, 428, 96, 7);
    sparkle(p, 72, 238, 11);
    sparkle(p, 60, 204, 5);
    star5(p, 82, 64, 6);
    p.dot(420, 250, 1.8);
    p.dot(66, 110, 1.6);
  }),

  scene('buku-terbuka', 'Buku Terbuka', LAND, (p) => {
    p.layer(0);
    const left: Pt[] = [
      [240, 98],
      [180, 80],
      [110, 78],
      [58, 88],
    ];
    const bottom: Pt[] = [
      [58, 250],
      [120, 240],
      [190, 244],
      [240, 262],
    ];
    for (const side of [1, -1] as const) {
      const X = (x: number): number => (side === 1 ? x : 480 - x);
      p.curve(left.map(([x, y]) => [X(x), y] as Pt));
      p.curve(
        [
          [X(58), 88],
          [X(55), 170],
          [X(58), 250],
        ],
        { wob: 0.6 },
      );
      p.curve(bottom.map(([x, y]) => [X(x), y] as Pt));
      // tumpukan halaman
      p.curve(
        [
          [X(54), 252],
          [X(52), 258],
          [X(120), 248],
          [X(190), 252],
          [X(240), 270],
        ],
        { wob: 0.5 },
      );
      p.curve(
        [
          [X(50), 258],
          [X(48), 265],
          [X(120), 256],
          [X(190), 260],
          [X(240), 278],
        ],
        { wob: 0.5 },
      );
    }
    p.line(240, 98, 240, 262, 0.6);
    p.layer(900);
    // tulisan tangan
    for (const [x0, x1, y] of [
      [84, 214, 112],
      [84, 220, 130],
      [84, 200, 148],
      [84, 212, 166],
      [84, 168, 184],
      [272, 330, 112],
      [272, 336, 130],
      [272, 318, 148],
      [272, 400, 212],
      [272, 384, 230],
    ] as const)
      scribble(p, x0, x1, y, 4.2);
    p.place('bunga-kecil', 112, 220, 50);
    p.place('hati-kecil', 176, 218, 38);
    p.place('bingkai-polaroid', 380, 140, 82, { rot: 4 });
    p.place('matahari-kecil', 380, 128, 40);
    sparkle(p, 408, 216, 6);
    p.layer(1700);
    // pembatas pita
    p.curve(
      [
        [248, 100],
        [252, 170],
        [254, 240],
        [258, 296],
      ],
      { wob: 0.4 },
    );
    p.curve(
      [
        [258, 102],
        [262, 170],
        [264, 240],
        [270, 296],
      ],
      { wob: 0.4 },
    );
    p.poly(
      [
        [258, 296],
        [265, 288],
        [270, 296],
      ],
      false,
      0.2,
    );
    // tanaman kecil tumbuh dari punggung buku
    p.plant('tunas', 240, 98, 74);
    p.plant('kuncup', 214, 92, 44, { rot: -16 });
    p.plant('semanggi', 268, 92, 40, { rot: 16 });
  }),

  scene('langit-malam', 'Langit Malam', LAND, (p) => {
    p.layer(0);
    const C = 1;
    p.curve(
      [
        [6, 262, C],
        [6, 238, C],
        [32, 212, C],
        [58, 238, C],
        [58, 230, C],
        [98, 230, C],
        [98, 176, C],
        [94, 172, C],
        [104, 160, C],
        [114, 172, C],
        [110, 176, C],
        [110, 222, C],
        [124, 222, C],
        [127, 207],
        [138, 196],
        [150, 192],
        [162, 196],
        [173, 207],
        [176, 222, C],
        [196, 222, C],
        [196, 236, C],
        [222, 210, C],
        [248, 236, C],
        [248, 226, C],
        [286, 226, C],
        [286, 240, C],
        [312, 204, C],
        [338, 240, C],
        [338, 232, C],
        [372, 232, C],
        [372, 214, C],
        [410, 214, C],
        [410, 238, C],
        [438, 210, C],
        [466, 238, C],
        [474, 238, C],
        [474, 262, C],
      ],
      { wob: 0.6 },
    );
    p.line(4, 262, 476, 262, 0.8);
    // bulan sabit kecil di kubah & antena
    p.line(150, 192, 150, 182, 0.2);
    p.arc(150, 176, 5, 5, 60, 300, { wob: 0.1 });
    p.line(222, 210, 222, 190, 0.2);
    p.line(214, 196, 230, 196, 0.2);
    p.line(217, 202, 227, 202, 0.2);
    p.layer(700);
    for (const [x, y, w, h] of [
      [24, 240, 12, 12],
      [70, 240, 10, 12],
      [140, 232, 20, 16],
      [214, 232, 14, 12],
      [302, 236, 12, 14],
      [384, 226, 12, 12],
      [430, 236, 14, 12],
    ] as const)
      p.rrect(x, y, w, h, 2, 0.4);
    p.layer(1300);
    p.place('bulan', 392, 78, 86);
    for (const [x, y, r] of [
      [300, 50, 7],
      [460, 150, 6],
      [40, 140, 8],
      [270, 140, 5],
      [340, 166, 5],
    ] as const)
      sparkle(p, x, y, r);
    for (const [x, y] of [
      [20, 60],
      [250, 96],
      [460, 30],
      [324, 108],
      [150, 140],
      [60, 196],
      [420, 186],
    ] as const)
      p.dot(x, y, 1.6);
    p.layer(2100);
    // rasi bintang kecil
    const con: Array<[number, number]> = [
      [80, 76],
      [118, 54],
      [160, 66],
      [190, 40],
      [226, 58],
      [208, 100],
    ];
    for (let i = 1; i < con.length; i++) {
      const a = con[i - 1]!;
      const b = con[i]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy);
      const k = 6 / len;
      p.line(a[0] + dx * k, a[1] + dy * k, b[0] - dx * k, b[1] - dy * k, 0.3);
    }
    p.line(160 + 4, 66 + 5, 208 - 3, 100 - 5, 0.3);
    for (const [x, y] of con) {
      p.dot(x, y, 2.4);
      p.line(x, y - 5, x, y - 8, 0.05);
      p.line(x, y + 5, x, y + 8, 0.05);
      p.line(x - 5, y, x - 8, y, 0.05);
      p.line(x + 5, y, x + 8, y, 0.05);
    }
  }),

  scene('rumah-kecil', 'Rumah Kecil', PORT, (p) => {
    p.layer(0);
    // dinding & atap
    p.poly(
      [
        [62, 404],
        [62, 248],
        [218, 248],
        [218, 404],
      ],
      false,
    );
    p.poly(
      [
        [46, 254],
        [140, 172],
        [234, 254],
      ],
      false,
    );
    // cerobong + asap
    p.poly(
      [
        [178, 207],
        [178, 182],
        [194, 182],
        [194, 221],
      ],
      false,
      0.5,
    );
    p.spiral(190, 160, 3, 9, 1.2, 90);
    p.spiral(202, 136, 2, 6, 1, 120);
    p.circle(140, 218, 11);
    p.line(140, 207, 140, 229, 0.2);
    ground(p, 10, 310, 404, [24, 290]);
    p.layer(800);
    // jendela menyala
    windowPane(p, 80, 272, 46, 40);
    glow(p, 80, 272, 46, 40, 8, 7);
    // pintu & anak tangga
    p.rrect(160, 316, 38, 80, 3, 0.6);
    p.circle(190, 358, 2.2);
    p.rrect(108, 396, 104, 8, 2, 0.5);
    p.layer(1500);
    p.plant('kucing', 134, 396, 52);
    p.plant('tanaman-pot', 34, 404, 56);
    p.plant('kaktus-bulat', 240, 404, 40);
    p.plant('sepeda', 280, 404, 80);
    // jalan setapak
    p.curve(
      [
        [140, 408],
        [126, 436],
        [104, 476],
      ],
      { wob: 0.5 },
    );
    p.curve(
      [
        [196, 408],
        [212, 436],
        [238, 476],
      ],
      { wob: 0.5 },
    );
    p.circle(166, 424, 7, { ry: 3 });
    p.circle(160, 446, 9, { ry: 3.6 });
    p.circle(176, 468, 10, { ry: 4 });
    p.layer(2200);
    p.place('bulan', 258, 82, 56);
    sparkle(p, 60, 90, 7);
    sparkle(p, 214, 60, 5);
    p.dot(120, 56, 1.6);
    p.dot(288, 160, 1.4);
  }),

  scene('senja-laut', 'Senja di Laut', LAND, (p) => {
    p.layer(0);
    p.curve(
      [
        [10, 180],
        [240, 181],
        [470, 179],
      ],
      { wob: 0.6 },
    );
    p.arc(300, 179, 44, 44, 180, 360);
    for (let a = 200; a <= 340; a += 20) {
      const r = (a * Math.PI) / 180;
      p.line(300 + Math.cos(r) * 56, 179 + Math.sin(r) * 56, 300 + Math.cos(r) * 70, 179 + Math.sin(r) * 70, 0.3);
    }
    // awan tipis melintas
    p.line(352, 128, 420, 126, 0.4);
    p.line(370, 138, 440, 137, 0.4);
    p.layer(700);
    // pantulan matahari
    for (const [x0, x1, y] of [
      [268, 332, 192],
      [278, 322, 202],
      [287, 313, 212],
      [294, 306, 222],
    ] as const)
      p.line(x0, y, x1, y, 0.3);
    for (const [x0, x1, y, ph] of [
      [30, 140, 206, 0],
      [150, 240, 224, 1],
      [350, 460, 208, 0],
      [60, 200, 244, 1],
      [260, 420, 246, 0],
    ] as const)
      p.wave(x0, x1, y, 3, 18, ph);
    // perahu layar di cakrawala
    p.poly(
      [
        [96, 168],
        [146, 168],
        [138, 178],
        [104, 178],
      ],
      true,
      0.4,
    );
    p.line(121, 168, 121, 124, 0.3);
    p.poly(
      [
        [124, 128],
        [124, 164],
        [148, 164],
      ],
      true,
      0.3,
    );
    p.poly(
      [
        [118, 136],
        [118, 164],
        [100, 164],
      ],
      true,
      0.3,
    );
    p.layer(1400);
    // pasir & kerang
    p.curve(
      [
        [0, 274],
        [140, 264],
        [300, 274],
        [480, 266],
      ],
      { wob: 0.8 },
    );
    p.plant('kerang', 388, 300, 50);
    star5(p, 106, 292, 11, 0.5, -80);
    p.dot(200, 290, 1.4);
    p.dot(214, 300, 1.2);
    p.dot(300, 296, 1.4);
    p.layer(2000);
    birdV(p, 176, 82, 10);
    birdV(p, 204, 98, 7);
    birdV(p, 156, 104, 6);
  }),

  scene('hujan-jendela', 'Hujan di Jendela', PORT, (p) => {
    p.layer(0);
    p.rrect(50, 40, 220, 300, 6, 1);
    p.rrect(64, 54, 192, 272, 3, 0.8);
    p.line(160, 56, 160, 324, 0.6);
    p.line(66, 190, 254, 190, 0.6);
    p.rrect(30, 340, 260, 16, 3, 0.6);
    p.line(46, 356, 46, 366, 0.3);
    p.line(274, 356, 274, 366, 0.3);
    p.layer(700);
    // tetes & alur hujan di setiap kaca
    const panes: Array<[number, number, number, number]> = [
      [72, 62, 152, 182],
      [168, 62, 248, 182],
      [72, 198, 152, 318],
      [168, 198, 248, 318],
    ];
    for (const [x0, y0, x1, y1] of panes) {
      for (let i = 0; i < 6; i++) {
        const x = x0 + 8 + p.rand() * (x1 - x0 - 16);
        const y = y0 + 6 + p.rand() * (y1 - y0 - 36);
        if (i % 2 === 0) {
          const len = 14 + p.rand() * 18;
          p.curve(
            [
              [x, y],
              [x + p.j(1.5), y + len * 0.5],
              [x + p.j(1.5), y + len],
            ],
            { wob: 0.3 },
          );
          drop(p, x, y + len + 2, 9);
        } else drop(p, x, y, 7 + p.rand() * 4);
      }
    }
    // hujan di luar (garis miring pendek)
    for (const [x, y] of [
      [20, 60],
      [30, 130],
      [16, 220],
      [292, 80],
      [300, 170],
      [290, 260],
    ] as const)
      p.line(x, y, x - 4, y + 12, 0.2);
    p.layer(1500);
    p.plant('teh-panas', 118, 340, 78);
    p.plant('tanaman-pot', 222, 340, 84);
  }),

  scene('dua-orang', 'Dua Orang di Bangku', LAND, (p) => {
    p.layer(0);
    ground(p, 10, 470, 280, [40, 380, 440]);
    // pohon
    p.curve(
      [
        [116, 280],
        [124, 220],
        [128, 150],
      ],
      { wob: 0.6 },
    );
    p.curve(
      [
        [146, 280],
        [140, 220],
        [146, 150],
      ],
      { wob: 0.6 },
    );
    p.curve(
      [
        [140, 186],
        [158, 166],
        [176, 154],
      ],
      { wob: 0.4 },
    );
    const can: Array<[number, number]> = [];
    for (let i = 0; i < 13; i++) {
      const a = (i / 13) * Math.PI * 2 + 0.3;
      const r = 1 + p.j(0.06);
      can.push([170 + Math.cos(a) * 124 * r, 90 + Math.sin(a) * 60 * r]);
    }
    p.bumps(can, 0.3, true);
    p.layer(800);
    // bangku
    p.rrect(186, 240, 164, 9, 3, 0.5);
    p.line(198, 249, 198, 280, 0.3);
    p.line(338, 249, 338, 280, 0.3);
    p.line(194, 240, 194, 198, 0.3);
    p.line(342, 240, 342, 198, 0.3);
    p.line(194, 204, 212, 204, 0.3);
    p.line(194, 218, 212, 218, 0.3);
    p.line(316, 204, 342, 204, 0.3);
    p.line(316, 218, 342, 218, 0.3);
    p.layer(1400);
    // dua sosok bulat, saling bersandar
    for (const [cx, tilt, look] of [
      [236, 5, 3],
      [292, -5, -3],
    ] as const) {
      p.rotate(tilt, cx, 240, () => {
        p.curve(
          [
            [cx - 20, 240],
            [cx - 21, 216],
            [cx - 14, 197],
            [cx, 192],
            [cx + 14, 197],
            [cx + 21, 216],
            [cx + 20, 240],
          ],
          { wob: 0.6 },
        );
        p.circle(cx, 172, 16);
        p.dot(cx - 5 + look, 172, 1.9);
        p.dot(cx + 5 + look, 172, 1.9);
      });
      p.line(cx - 8, 249, cx - 9, 272, 0.3);
      p.line(cx + 7, 249, cx + 8, 272, 0.3);
      p.line(cx - 9, 272, cx - 14, 273, 0.2);
      p.line(cx + 8, 272, cx + 13, 273, 0.2);
    }
    // tangan bergandengan di antara mereka
    p.curve(
      [
        [252, 214],
        [258, 226],
        [262, 232],
      ],
      { wob: 0.3 },
    );
    p.curve(
      [
        [276, 214],
        [270, 226],
        [266, 232],
      ],
      { wob: 0.3 },
    );
    p.circle(264, 234, 4);
    p.layer(2200);
    p.heart(312, 124, 12, 10);
    p.line(296, 104, 300, 109, 0.2);
    p.line(330, 106, 326, 111, 0.2);
    p.place('daun-kering', 372, 196, 34, { rot: 30 });
    p.leaf(408, 236, 420, 226, 5, { bend: 2 });
  }),

  scene('pos-surat', 'Kotak Pos', PORT, (p) => {
    p.layer(0);
    p.arc(160, 192, 60, 36, 180, 360);
    p.poly(
      [
        [100, 192],
        [100, 410],
        [220, 410],
        [220, 192],
      ],
      false,
    );
    p.line(102, 200, 218, 200, 0.5);
    p.circle(160, 151, 5);
    p.rrect(124, 250, 72, 9, 4, 0.4);
    p.rrect(128, 288, 64, 40, 3, 0.5);
    // ikon amplop kecil di papan
    p.rrect(146, 298, 28, 20, 1.5, 0.3);
    p.poly(
      [
        [147, 299],
        [160, 310],
        [173, 299],
      ],
      false,
      0.2,
    );
    p.rrect(122, 344, 76, 56, 3, 0.5);
    p.circle(186, 372, 2.4);
    p.rrect(88, 410, 144, 16, 3, 0.5);
    ground(p, 14, 306, 426, [30, 272]);
    p.layer(900);
    // surat masuk ke celah
    p.rotate(-7, 160, 248, () => {
      p.poly(
        [
          [126, 252],
          [126, 210],
          [194, 210],
          [194, 252],
        ],
        false,
        0.4,
      );
      p.poly(
        [
          [127, 211],
          [160, 234],
          [193, 211],
        ],
        false,
        0.3,
      );
      p.heart(160, 238, 4);
    });
    p.line(204, 220, 214, 218, 0.2);
    p.line(204, 232, 212, 231, 0.2);
    arrowHead(p, 160, 268, 160, 258, 0);
    p.layer(1600);
    p.plant('burung', 194, 164, 62, { rot: 14 });
    p.plant('bunga-kecil', 262, 426, 50);
    p.plant('rumput', 56, 426, 44);
    p.place('awan-kecil', 66, 86, 76);
    sparkle(p, 256, 92, 9);
    sparkle(p, 280, 124, 5);
    p.dot(40, 160, 1.6);
  }),
];

export const SCENE_BY_ID: Record<string, Scene> = Object.fromEntries(SCENES.map((s) => [s.id, s]));

/** Ambil scene berdasarkan id (undefined jika tidak ada). */
export function getScene(id: string): Scene | undefined {
  return SCENE_BY_ID[id];
}

export interface SceneSvgOptions {
  /** Warna tinta. Default #2A14D6. */
  color?: string;
  /** Tebal garis dalam satuan viewBox. Default 2.2. */
  strokeWidth?: number;
  /** Lebar dalam px; tinggi mengikuti rasio viewBox. Default lebar viewBox. */
  width?: number;
}

function esc(s: string): string {
  return s.replace(/[&<>"']/g, (c) =>
    c === '&' ? '&amp;' : c === '<' ? '&lt;' : c === '>' ? '&gt;' : c === '"' ? '&quot;' : '&apos;',
  );
}

/** SVG mandiri untuk satu scene. */
export function sceneToSvg(scene: Scene, opts: SceneSvgOptions = {}): string {
  const [, , vw = 480, vh = 320] = scene.viewBox.split(/[\s,]+/).map(Number);
  const width = opts.width ?? vw;
  const height = Math.round((width * vh) / vw);
  const color = esc(opts.color ?? INK);
  const sw = opts.strokeWidth ?? 2.2;
  const strokes = scene.strokes.map((d) => `<path d="${d}"/>`).join('');
  const fills = (scene.fills ?? []).map((d) => `<path d="${d}"/>`).join('');
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${esc(scene.viewBox)}" width="${width}" height="${height}" role="img" aria-label="${esc(scene.name)}">` +
    `<g fill="none" stroke="${color}" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${strokes}</g>` +
    (fills ? `<g fill="${color}" stroke="none">${fills}</g>` : '') +
    `</svg>`
  );
}
