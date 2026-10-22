/**
 * Pena tinta: pembantu kecil untuk menggambar garis "tangan" yang sedikit goyang.
 *
 * Setiap doodle digambar sekali saat modul dimuat, dengan RNG yang di-seed dari id-nya,
 * jadi hasilnya selalu sama (deterministik) dan yang diekspor tetap string `d` SVG biasa.
 * Kanvas 64x64; sumbu-y ke bawah; sudut dalam derajat (0 = kanan, 90 = bawah).
 */
import type { Doodle, DoodleCategory } from './types';
import { fnv1a } from './hash';

/** Titik [x, y]; elemen ketiga 1 = sudut tajam (bukan lengkung). */
export type Pt = readonly [number, number] | readonly [number, number, number];
type Mat = readonly [number, number, number, number, number, number];
interface V {
  x: number;
  y: number;
  c: boolean;
}

const RAD = Math.PI / 180;

function fmt(n: number): string {
  const r = Math.round(n * 10) / 10;
  return r === 0 ? '0' : String(r);
}

function mul(a: Mat, b: Mat): Mat {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function mulberry32(seed: number): () => number {
  let a = seed | 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CircleOpts {
  ry?: number;
  rot?: number;
  /** Goyangan posisi titik. */
  wob?: number;
  /** Benjolan relatif jari-jari (0.04 = 4%). */
  lump?: number;
  /** Derajat lewat dari 360 (negatif = ada celah). */
  over?: number;
  start?: number;
}

export class Pen {
  readonly strokes: string[] = [];
  readonly fills: string[] = [];
  /** Goyangan default (satuan kanvas). */
  wob = 0.55;
  private rng: () => number;
  private m: Mat = [1, 0, 0, 1, 0, 0];

  constructor(seed: number) {
    this.rng = mulberry32(seed);
  }

  rand(): number {
    return this.rng();
  }
  /** Acak di [-a, a]. */
  j(a: number): number {
    return (this.rng() * 2 - 1) * a;
  }

  // ---------- transformasi ----------
  tf(m: Mat, fn: () => void): this {
    const prev = this.m;
    this.m = mul(prev, m);
    try {
      fn();
    } finally {
      this.m = prev;
    }
    return this;
  }
  rotate(deg: number, cx: number, cy: number, fn: () => void): this {
    const c = Math.cos(deg * RAD);
    const s = Math.sin(deg * RAD);
    return this.tf([c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy], fn);
  }
  scale(sx: number, sy: number, cx: number, cy: number, fn: () => void): this {
    return this.tf([sx, 0, 0, sy, cx - sx * cx, cy - sy * cy], fn);
  }
  translate(dx: number, dy: number, fn: () => void): this {
    return this.tf([1, 0, 0, 1, dx, dy], fn);
  }
  /** Cermin horizontal terhadap garis x = cx. */
  mirror(cx: number, fn: () => void): this {
    return this.scale(-1, 1, cx, 0, fn);
  }

  private P(x: number, y: number): string {
    const m = this.m;
    return fmt(m[0] * x + m[2] * y + m[4]) + ' ' + fmt(m[1] * x + m[3] * y + m[5]);
  }

  // ---------- primitif ----------
  /** Garis lengkung halus (Catmull-Rom) melalui titik-titik. */
  curve(pts: readonly Pt[], o: { closed?: boolean; wob?: number; corners?: boolean } = {}): this {
    const w = o.wob ?? this.wob;
    const v: V[] = pts.map((p) => ({
      x: p[0] + this.j(w),
      y: p[1] + this.j(w),
      c: o.corners === true || p[2] === 1,
    }));
    const n = v.length;
    if (n < 2) return this;
    const closed = o.closed === true;
    const get = (i: number): V =>
      closed ? v[((i % n) + n) % n]! : v[Math.max(0, Math.min(n - 1, i))]!;
    const segs = closed ? n : n - 1;
    const first = v[0]!;
    const cj = w * 0.45;
    let d = 'M' + this.P(first.x, first.y);
    for (let i = 0; i < segs; i++) {
      const p0 = get(i - 1);
      const p1 = get(i);
      const p2 = get(i + 1);
      const p3 = get(i + 2);
      let c1x: number, c1y: number, c2x: number, c2y: number;
      if (p1.c) {
        c1x = p1.x + (p2.x - p1.x) / 3;
        c1y = p1.y + (p2.y - p1.y) / 3;
      } else {
        c1x = p1.x + (p2.x - p0.x) / 6;
        c1y = p1.y + (p2.y - p0.y) / 6;
      }
      if (p2.c) {
        c2x = p2.x - (p2.x - p1.x) / 3;
        c2y = p2.y - (p2.y - p1.y) / 3;
      } else {
        c2x = p2.x - (p3.x - p1.x) / 6;
        c2y = p2.y - (p3.y - p1.y) / 6;
      }
      d +=
        'C' +
        this.P(c1x + this.j(cj), c1y + this.j(cj)) +
        ' ' +
        this.P(c2x + this.j(cj), c2y + this.j(cj)) +
        ' ' +
        this.P(p2.x, p2.y);
    }
    this.strokes.push(d);
    return this;
  }
  /** Bentuk tertutup lengkung. */
  shape(pts: readonly Pt[], wob?: number): this {
    return this.curve(pts, { closed: true, wob });
  }
  /** Poligon/garis patah dengan sudut tajam. */
  poly(pts: readonly Pt[], closed = false, wob?: number): this {
    return this.curve(pts, { closed, wob, corners: true });
  }

  /** Garis lurus yang sedikit melengkung. */
  line(x1: number, y1: number, x2: number, y2: number, w = this.wob): this {
    const ax = x1 + this.j(w * 0.5);
    const ay = y1 + this.j(w * 0.5);
    const bx = x2 + this.j(w * 0.5);
    const by = y2 + this.j(w * 0.5);
    const dx = bx - ax;
    const dy = by - ay;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const amp = w * Math.min(1.5, len / 14);
    const k1 = this.j(amp);
    const k2 = k1 * 0.4 + this.j(amp * 0.6);
    this.strokes.push(
      'M' +
        this.P(ax, ay) +
        'C' +
        this.P(ax + dx / 3 + nx * k1, ay + dy / 3 + ny * k1) +
        ' ' +
        this.P(ax + (2 * dx) / 3 + nx * k2, ay + (2 * dy) / 3 + ny * k2) +
        ' ' +
        this.P(bx, by),
    );
    return this;
  }

  /** Lingkaran/elips yang agak benjol dan ujungnya sedikit kebablasan. */
  circle(cx: number, cy: number, r: number, o: CircleOpts = {}): this {
    const ry = o.ry ?? r;
    const lump = o.lump ?? 0.045;
    const rot = (o.rot ?? 0) * RAD;
    const big = Math.max(r, ry);
    const n = Math.max(6, Math.min(12, Math.round(big * 0.55)));
    const start = o.start ?? this.rand() * 360;
    const over = o.over ?? (big < 5 ? 8 : 10) + this.rand() * 14;
    const total = 360 + over;
    const steps = Math.max(3, Math.ceil((n * total) / 360));
    const pts: Pt[] = [];
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    for (let i = 0; i <= steps; i++) {
      const deg = start + (total * i) / steps;
      const past = Math.max(0, deg - start - 360) / Math.max(1, over);
      const k = 1 + this.j(lump) - past * 0.06;
      const x = Math.cos(deg * RAD) * r * k;
      const y = Math.sin(deg * RAD) * ry * k;
      pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return this.curve(pts, { wob: o.wob ?? Math.min(0.3, big * 0.05) });
  }

  /** Busur dari sudut a0 ke a1 (derajat, boleh terbalik). */
  arc(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    a0: number,
    a1: number,
    o: { rot?: number; wob?: number; lump?: number } = {},
  ): this {
    const steps = Math.max(2, Math.ceil(Math.abs(a1 - a0) / 30));
    const rot = (o.rot ?? 0) * RAD;
    const cr = Math.cos(rot);
    const sr = Math.sin(rot);
    const lump = o.lump ?? 0.03;
    const pts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const deg = a0 + ((a1 - a0) * i) / steps;
      const k = 1 + this.j(lump);
      const x = Math.cos(deg * RAD) * rx * k;
      const y = Math.sin(deg * RAD) * ry * k;
      pts.push([cx + x * cr - y * sr, cy + x * sr + y * cr]);
    }
    return this.curve(pts, { wob: o.wob ?? 0.25 });
  }

  /** Titik kecil terisi (mata, biji). */
  dot(cx: number, cy: number, r = 1.5): this {
    const m = this.m;
    const x = m[0] * cx + m[2] * cy + m[4];
    const y = m[1] * cx + m[3] * cy + m[5];
    const s = Math.sqrt(Math.abs(m[0] * m[3] - m[1] * m[2]));
    const rx = r * s * (1 + this.j(0.08));
    const ry = r * s * (1 + this.j(0.08));
    const k = 0.5523;
    const f = fmt;
    this.fills.push(
      `M${f(x + rx)} ${f(y)}C${f(x + rx)} ${f(y + ry * k)} ${f(x + rx * k)} ${f(y + ry)} ${f(x)} ${f(y + ry)}` +
        `C${f(x - rx * k)} ${f(y + ry)} ${f(x - rx)} ${f(y + ry * k)} ${f(x - rx)} ${f(y)}` +
        `C${f(x - rx)} ${f(y - ry * k)} ${f(x - rx * k)} ${f(y - ry)} ${f(x)} ${f(y - ry)}` +
        `C${f(x + rx * k)} ${f(y - ry)} ${f(x + rx)} ${f(y - ry * k)} ${f(x + rx)} ${f(y)}Z`,
    );
    return this;
  }

  /** Kubik mentah: titik awal + segmen [c1, c2, akhir], semua digoyang. */
  bez(start: Pt, segs: ReadonlyArray<readonly [Pt, Pt, Pt]>, w = this.wob): this {
    const J = (p: Pt, a: number): string => this.P(p[0] + this.j(a), p[1] + this.j(a));
    let d = 'M' + J(start, w * 0.5);
    for (const [c1, c2, e] of segs) d += 'C' + J(c1, w) + ' ' + J(c2, w) + ' ' + J(e, w * 0.5);
    this.strokes.push(d);
    return this;
  }

  /** Daun runcing dua ujung dari pangkal ke ujung. w ≈ 1.4x setengah lebar. */
  leaf(
    bx: number,
    by: number,
    tx: number,
    ty: number,
    w: number,
    o: { vein?: boolean; bend?: number } = {},
  ): this {
    const dx = tx - bx;
    const dy = ty - by;
    const len = Math.hypot(dx, dy) || 1;
    const nx = -dy / len;
    const ny = dx / len;
    const b = o.bend ?? 0;
    const at = (t: number, k: number): Pt => [bx + dx * t + nx * k, by + dy * t + ny * k];
    this.bez(
      [bx, by],
      [
        [at(0.2, w + b), at(0.7, w * 0.8 + b), [tx, ty]],
        [at(0.7, -w * 0.8 + b), at(0.2, -w + b), [bx, by]],
      ],
      0.35,
    );
    if (o.vein) this.curve([at(0, 0), at(0.4, b * 0.45), at(0.72, b * 0.5)], { wob: 0.2 });
    return this;
  }

  /** Kelopak lingkar (loop) dari titik pusat ke arah `ang`. Lebar tampak ≈ 0.58·w. */
  petal(
    cx: number,
    cy: number,
    ang: number,
    len: number,
    w: number,
    o: { r0?: number; skew?: number } = {},
  ): this {
    const ux = Math.cos(ang * RAD);
    const uy = Math.sin(ang * RAD);
    const nx = -uy;
    const ny = ux;
    const r0 = o.r0 ?? 0;
    const sk = o.skew ?? 0;
    const bx = cx + ux * r0;
    const by = cy + uy * r0;
    const L = len * 1.3;
    this.bez(
      [bx, by],
      [
        [
          [bx + ux * L + nx * (w + sk), by + uy * L + ny * (w + sk)],
          [bx + ux * L - nx * (w - sk), by + uy * L - ny * (w - sk)],
          [bx, by],
        ],
      ],
      0.3,
    );
    return this;
  }

  /** Hati; s ≈ setengah lebar. Ujung bawah mengarah ke +y sebelum diputar. */
  heart(cx: number, cy: number, s: number, rot = 0): this {
    return this.rotate(rot, cx, cy, () => {
      this.bez(
        [cx, cy + s * 0.9],
        [
          [
            [cx - s * 1.25, cy + s * 0.05],
            [cx - s * 0.8, cy - s * 1.15],
            [cx, cy - s * 0.4],
          ],
          [
            [cx + s * 0.8, cy - s * 1.15],
            [cx + s * 1.25, cy + s * 0.05],
            [cx + s * 0.02, cy + s * 0.92],
          ],
        ],
        0.4,
      );
    });
  }

  /** Lengkung bergelombang (awan, semak): tonjolan kuadratik antar titik. h relatif panjang segmen. */
  bumps(pts: readonly Pt[], h = 0.4, closed = false): this {
    const list = closed && pts.length > 0 ? [...pts, pts[0]!] : pts;
    const first = list[0];
    if (!first) return this;
    const w = 0.35;
    let px = first[0] + this.j(w);
    let py = first[1] + this.j(w);
    const sx = px;
    const sy = py;
    let d = 'M' + this.P(px, py);
    for (let i = 1; i < list.length; i++) {
      const q = list[i]!;
      const last = closed && i === list.length - 1;
      const x = last ? sx : q[0] + this.j(w);
      const y = last ? sy : q[1] + this.j(w);
      const dx = x - px;
      const dy = y - py;
      const hh = h * (1 + this.j(0.18));
      const mx = (px + x) / 2 + dy * hh + this.j(0.3);
      const my = (py + y) / 2 - dx * hh + this.j(0.3);
      d += 'Q' + this.P(mx, my) + ' ' + this.P(x, y);
      px = x;
      py = y;
    }
    this.strokes.push(d);
    return this;
  }

  /** Persegi panjang bersudut bulat, sisi sedikit goyang. */
  rrect(x: number, y: number, w: number, h: number, r: number, wob = 0.4): this {
    return this.rr(x, y, w, h, Math.min(r, w / 2, h / 2), wob);
  }

  private rr(x: number, y: number, w: number, h: number, r: number, wob: number): this {
    // Jalur: mulai di sisi atas, searah jarum jam; sisi = kubik goyang, sudut = kuadratik.
    const J = (a: number): number => this.j(a);
    const pts: Array<[number, number]> = [
      [x + r, y],
      [x + w - r, y],
      [x + w, y + r],
      [x + w, y + h - r],
      [x + w - r, y + h],
      [x + r, y + h],
      [x, y + h - r],
      [x, y + r],
    ];
    const cornersQ: Array<[number, number]> = [
      [x + w, y],
      [x + w, y + h],
      [x, y + h],
      [x, y],
    ];
    const jp = pts.map(([px, py]) => [px + J(wob * 0.5), py + J(wob * 0.5)] as [number, number]);
    const p0 = jp[0]!;
    let d = 'M' + this.P(p0[0], p0[1]);
    for (let i = 0; i < 4; i++) {
      const a = jp[i * 2]!;
      const b = jp[i * 2 + 1]!;
      const dx = b[0] - a[0];
      const dy = b[1] - a[1];
      const len = Math.hypot(dx, dy) || 1;
      const nx = -dy / len;
      const ny = dx / len;
      const amp = wob * Math.min(1.4, len / 14);
      const k1 = J(amp);
      const k2 = k1 * 0.4 + J(amp * 0.6);
      d +=
        'C' +
        this.P(a[0] + dx / 3 + nx * k1, a[1] + dy / 3 + ny * k1) +
        ' ' +
        this.P(a[0] + (2 * dx) / 3 + nx * k2, a[1] + (2 * dy) / 3 + ny * k2) +
        ' ' +
        this.P(b[0], b[1]);
      const q = cornersQ[i]!;
      const next = i === 3 ? [p0[0] + J(0.25), p0[1] + J(0.25)] : jp[i * 2 + 2]!;
      if (r > 0.5) d += 'Q' + this.P(q[0] + J(wob * 0.4), q[1] + J(wob * 0.4)) + ' ' + this.P(next[0]!, next[1]!);
      else d += 'L' + this.P(next[0]!, next[1]!);
    }
    this.strokes.push(d);
    return this;
  }

  /** Spiral dari r0 ke r1. */
  spiral(cx: number, cy: number, r0: number, r1: number, turns: number, start = 0, o: { ry?: number; dir?: 1 | -1 } = {}): this {
    const steps = Math.max(4, Math.ceil(turns * 12));
    const k = (o.ry ?? 1);
    const dir = o.dir ?? 1;
    const pts: Pt[] = [];
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = (start + dir * turns * 360 * t) * RAD;
      const r = r0 + (r1 - r0) * t;
      pts.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * k]);
    }
    return this.curve(pts, { wob: 0.2 });
  }

  /** Garis bergelombang horizontal. */
  wave(x0: number, x1: number, y: number, amp: number, period: number, phase = 0): this {
    const pts: Pt[] = [];
    const n = Math.max(2, Math.round(((x1 - x0) / period) * 2));
    for (let i = 0; i <= n; i++) {
      const x = x0 + ((x1 - x0) * i) / n;
      const s = (i + phase) % 2 === 0 ? -1 : 1;
      pts.push([x, y + (i === 0 || i === n ? s * amp * 0.4 : s * amp)]);
    }
    return this.curve(pts, { wob: 0.25 });
  }

  /** Garis putus-putus mengikuti lengkung melalui titik-titik. */
  dashed(pts: readonly Pt[], dash: number, gap: number): this {
    const poly = sampleCatmull(pts, 10);
    let carry = 0;
    let on = true;
    let segStart: [number, number] | null = poly[0] ?? null;
    for (let i = 1; i < poly.length; i++) {
      let a = poly[i - 1]!;
      const b = poly[i]!;
      let segLen = Math.hypot(b[0] - a[0], b[1] - a[1]);
      while (segLen > 0) {
        const need = (on ? dash : gap) - carry;
        if (segLen >= need) {
          const t = need / segLen;
          const p: [number, number] = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];
          if (on && segStart) this.line(segStart[0], segStart[1], p[0], p[1], 0.2);
          on = !on;
          segStart = on ? p : null;
          carry = 0;
          segLen -= need;
          a = p;
        } else {
          carry += segLen;
          segLen = 0;
        }
      }
    }
    const end = poly[poly.length - 1];
    if (on && segStart && end && carry > dash * 0.4) this.line(segStart[0], segStart[1], end[0], end[1], 0.2);
    return this;
  }

  /** Sinar-sinar pendek mengelilingi pusat. */
  rays(cx: number, cy: number, r0: number, r1: number, n: number, start = -90, alt = 0): this {
    for (let i = 0; i < n; i++) {
      const a = (start + (360 * i) / n) * RAD;
      const e = i % 2 === 1 ? r1 - alt : r1;
      this.line(cx + Math.cos(a) * r0, cy + Math.sin(a) * r0, cx + Math.cos(a) * e, cy + Math.sin(a) * e, 0.3);
    }
    return this;
  }

  /** Rumput "‿ılı‿" di kaki tanaman. Sisakan ruang di tengah untuk batang. */
  grass(cx: number, y: number, o: { w?: number; gapL?: number; gapR?: number; ticks?: number } = {}): this {
    const w = o.w ?? 13;
    const ticks = o.ticks ?? (this.rand() < 0.5 ? 1 : 2);
    for (const side of [-1, 1] as const) {
      const gap = (side < 0 ? o.gapL : o.gapR) ?? 3;
      let off = gap;
      for (let i = 0; i < ticks; i++) {
        const x = cx + side * off;
        const h = 3.2 + this.rand() * 2.2 - i * 0.8;
        this.line(x, y + 0.3, x + side * (0.6 + this.rand() * 0.9), y - h, 0.15);
        off += 2.6 + this.rand() * 0.8;
      }
      const g0 = cx + side * (off - 0.6);
      const g1 = cx + side * Math.max(off + 3.5, w);
      const mid = (g0 + g1) / 2;
      this.curve(
        [
          [g0, y],
          [mid, y + 1.1],
          [g1, y - 0.4],
        ],
        { wob: 0.15 },
      );
    }
    return this;
  }

  /** Batang dari bawah ke atas lewat beberapa titik. */
  stem(pts: readonly Pt[]): this {
    return this.curve(pts, { wob: 0.35 });
  }
}

/** Sampel titik dari kurva Catmull-Rom (tanpa goyangan). */
export function sampleCatmull(pts: readonly Pt[], per: number): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  const n = pts.length;
  if (n === 0) return out;
  const g = (i: number): Pt => pts[Math.max(0, Math.min(n - 1, i))]!;
  out.push([g(0)[0], g(0)[1]]);
  for (let i = 0; i < n - 1; i++) {
    const p0 = g(i - 1);
    const p1 = g(i);
    const p2 = g(i + 1);
    const p3 = g(i + 2);
    const c1: [number, number] = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: [number, number] = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    for (let s = 1; s <= per; s++) {
      const t = s / per;
      const u = 1 - t;
      out.push([
        u * u * u * p1[0] + 3 * u * u * t * c1[0] + 3 * u * t * t * c2[0] + t * t * t * p2[0],
        u * u * u * p1[1] + 3 * u * u * t * c1[1] + 3 * u * t * t * c2[1] + t * t * t * p2[1],
      ]);
    }
  }
  return out;
}

/** Buat satu doodle. RNG di-seed dari id, jadi hasilnya stabil. */
export function doodle(
  id: string,
  name: string,
  category: DoodleCategory,
  draw: (p: Pen) => void,
): Doodle {
  const p = new Pen(fnv1a(id));
  draw(p);
  const d: Doodle = { id, name, category, viewBox: '0 0 64 64', strokes: p.strokes };
  if (p.fills.length > 0) d.fills = p.fills;
  return d;
}

/** Pembuat doodle untuk satu kategori. */
export function maker(category: DoodleCategory) {
  return (id: string, name: string, draw: (p: Pen) => void): Doodle => doodle(id, name, category, draw);
}
