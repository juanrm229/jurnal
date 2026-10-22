/** Pembantu gambar kecil yang dipakai beberapa file data & scene. */
import type { Pen, Pt } from '../pen';

const RAD = Math.PI / 180;

/** Kilau 4 sudut dengan sisi cekung. */
export function sparkle(p: Pen, cx: number, cy: number, r: number, rot = 0): void {
  p.rotate(rot, cx, cy, () => {
    const k = 0.1;
    const q = 0.32;
    p.bez(
      [cx, cy - r],
      [
        [[cx + r * k, cy - r * q], [cx + r * q, cy - r * k], [cx + r, cy]],
        [[cx + r * q, cy + r * k], [cx + r * k, cy + r * q], [cx, cy + r]],
        [[cx - r * k, cy + r * q], [cx - r * q, cy + r * k], [cx - r, cy]],
        [[cx - r * q, cy - r * k], [cx - r * k, cy - r * q], [cx + 0.2, cy - r + 0.3]],
      ],
      Math.min(0.35, r * 0.04),
    );
  });
}

/** Bintang lima sudut. */
export function star5(p: Pen, cx: number, cy: number, r: number, inner = 0.45, rot = -90): void {
  const pts: Pt[] = [];
  for (let i = 0; i < 10; i++) {
    const a = (rot + i * 36) * RAD;
    const rr = i % 2 === 0 ? r : r * inner;
    pts.push([cx + Math.cos(a) * rr, cy + Math.sin(a) * rr]);
  }
  p.poly(pts, true, Math.min(0.4, r * 0.03));
}

/** Kepala panah di (tx, ty) yang datang dari arah (fx, fy). */
export function arrowHead(p: Pen, tx: number, ty: number, fx: number, fy: number, size = 8, spread = 32): void {
  const a = Math.atan2(fy - ty, fx - tx);
  const s = spread * RAD;
  p.poly(
    [
      [tx + Math.cos(a + s) * size, ty + Math.sin(a + s) * size],
      [tx, ty],
      [tx + Math.cos(a - s) * size, ty + Math.sin(a - s) * size],
    ],
    false,
    0.2,
  );
}

/** Huruf "z" kecil untuk tidur. */
export function zee(p: Pen, x: number, y: number, s: number): void {
  p.poly(
    [
      [x, y],
      [x + s, y],
      [x, y + s],
      [x + s, y + s],
    ],
    false,
    0.15,
  );
}

/** Tetes air (ujung runcing di atas). */
export function drop(p: Pen, cx: number, top: number, h: number, w = h * 0.62): void {
  const r = w / 2;
  p.curve(
    [
      [cx, top, 1],
      [cx + r * 0.55, top + h * 0.35],
      [cx + r, top + h * 0.68],
      [cx + r * 0.6, top + h * 0.95],
      [cx, top + h],
      [cx - r * 0.6, top + h * 0.95],
      [cx - r, top + h * 0.68],
      [cx - r * 0.55, top + h * 0.35],
      [cx, top, 1],
    ],
    { wob: Math.min(0.3, h * 0.03) },
  );
}

/** Uap mengepul: garis-S pendek. */
export function steam(p: Pen, x: number, y0: number, y1: number, amp = 2.2): void {
  const h = y0 - y1;
  p.curve(
    [
      [x, y0],
      [x - amp, y0 - h * 0.33],
      [x + amp, y0 - h * 0.66],
      [x, y1],
    ],
    { wob: 0.15 },
  );
}

/** Tulisan tangan coret-coret (seperti "eeee") dari x0 ke x1. */
export function scribble(p: Pen, x0: number, x1: number, y: number, h = 2.6): void {
  const pts: Pt[] = [];
  const step = h * 1.25;
  let i = 0;
  for (let x = x0; x <= x1; x += step * (0.8 + p.rand() * 0.4), i++) {
    pts.push([x, y + (i % 2 === 0 ? h * 0.35 : -h * 0.55)]);
  }
  if (pts.length >= 2) p.curve(pts, { wob: h * 0.12 });
}

/** Wajah bulat sederhana. */
export function faceRing(p: Pen, cx = 32, cy = 33, r = 22): void {
  p.circle(cx, cy, r, { lump: 0.03 });
}
