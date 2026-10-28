/**
 * Filter photobox: diterapkan per piksel di kanvas supaya pratinjau langsung
 * dan hasil jepretan sama persis. "Tinta" mengubah wajah jadi gambar garis
 * seperti doodle Sehari, khas aplikasi ini.
 */
export type FilterId = 'asli' | 'hangat' | 'jadul' | 'tinta' | 'duotone' | 'lembut';

export const FILTERS: { id: FilterId; name: string; hint: string }[] = [
  { id: 'asli', name: 'asli', hint: 'jernih, sedikit lebih hidup' },
  { id: 'tinta', name: 'tinta', hint: 'wajahmu jadi doodle' },
  { id: 'jadul', name: 'jadul', hint: 'hitam-putih berbutir' },
  { id: 'hangat', name: 'hangat', hint: 'sore keemasan' },
  { id: 'duotone', name: 'duotone', hint: 'tinta & kertas' },
  { id: 'lembut', name: 'lembut', hint: 'bercahaya, pastel' },
];

export type RGB = [number, number, number];

export function parseColor(css: string, fallback: RGB = [42, 20, 214]): RGB {
  const s = css.trim();
  const hex = /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(s);
  if (hex) {
    const h = hex[1]!.length === 3 ? hex[1]!.replace(/./g, (c) => c + c) : hex[1]!;
    return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
  }
  const m = /rgba?\(([^)]+)\)/.exec(s);
  if (m) {
    const [r, g, b] = m[1]!.split(',').map((x) => parseFloat(x));
    return [r ?? 0, g ?? 0, b ?? 0];
  }
  return fallback;
}

/** Warna tinta tema saat ini. */
export const themeInk = (): RGB => parseColor(getComputedStyle(document.documentElement).getPropertyValue('--ink'));

const clamp = (v: number) => (v < 0 ? 0 : v > 255 ? 255 : v);

/** Butiran acak yang stabil per posisi (tidak berkedip di pratinjau). */
function noise(i: number) {
  const x = Math.sin(i * 12.9898) * 43758.5453;
  return x - Math.floor(x) - 0.5;
}

export function applyFilter(ctx: CanvasRenderingContext2D, w: number, h: number, f: FilterId, ink: RGB = [42, 20, 214]) {
  if (f === 'lembut') {
    // Cahaya: versi buram (diperkecil lalu diperbesar) disaring di atasnya.
    const small = document.createElement('canvas');
    small.width = Math.max(8, Math.round(w / 14));
    small.height = Math.max(8, Math.round(h / 14));
    small.getContext('2d')!.drawImage(ctx.canvas, 0, 0, small.width, small.height);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.38;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(small, 0, 0, w, h);
    ctx.restore();
  }
  const img = ctx.getImageData(0, 0, w, h);
  const d = img.data;
  const n = w * h;
  switch (f) {
    case 'asli':
      for (let i = 0; i < d.length; i += 4) {
        d[i] = clamp((d[i]! - 128) * 1.06 + 131);
        d[i + 1] = clamp((d[i + 1]! - 128) * 1.06 + 129);
        d[i + 2] = clamp((d[i + 2]! - 128) * 1.06 + 128);
      }
      break;
    case 'hangat':
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const x = (p % w) / w - 0.5;
        const y = Math.floor(p / w) / h - 0.5;
        const vig = 1 - (x * x + y * y) * 0.9;
        d[i] = clamp((d[i]! * 1.08 + 18) * vig);
        d[i + 1] = clamp((d[i + 1]! * 1.0 + 8) * vig);
        d[i + 2] = clamp((d[i + 2]! * 0.86 + 14) * vig);
      }
      break;
    case 'jadul':
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const l = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
        const v = clamp((l - 128) * 1.35 + 124 + noise(p) * 34);
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = clamp(v - 4);
      }
      break;
    case 'duotone': {
      const paper: RGB = [250, 246, 236];
      for (let i = 0; i < d.length; i += 4) {
        const l = (0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!) / 255;
        const t = Math.min(1, Math.max(0, (l - 0.12) * 1.25));
        d[i] = ink[0] + (paper[0] - ink[0]) * t;
        d[i + 1] = ink[1] + (paper[1] - ink[1]) * t;
        d[i + 2] = ink[2] + (paper[2] - ink[2]) * t;
      }
      break;
    }
    case 'tinta': {
      // Garis dari tepi (Sobel) di atas kertas, dengan sedikit arsir di bagian gelap.
      const g = new Float32Array(n);
      for (let p = 0, i = 0; p < n; p++, i += 4) g[p] = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
      const paper: RGB = [251, 248, 240];
      const k = Math.max(1, Math.round(w / 420));
      for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          const x0 = x - k < 0 ? x : x - k;
          const x1 = x + k >= w ? x : x + k;
          const y0 = y - k < 0 ? y : y - k;
          const y1 = y + k >= h ? y : y + k;
          const gx = g[y0 * w + x1]! + 2 * g[y * w + x1]! + g[y1 * w + x1]! - g[y0 * w + x0]! - 2 * g[y * w + x0]! - g[y1 * w + x0]!;
          const gy = g[y1 * w + x0]! + 2 * g[y1 * w + x]! + g[y1 * w + x1]! - g[y0 * w + x0]! - 2 * g[y0 * w + x]! - g[y0 * w + x1]!;
          let a = Math.min(1, Math.max(0, (Math.sqrt(gx * gx + gy * gy) - 70) / 170));
          // Arsir diagonal tipis di area gelap.
          const dark = 1 - g[p]! / 255;
          if (dark > 0.62 && (x + y) % 7 === 0) a = Math.max(a, (dark - 0.62) * 1.6);
          const i = p * 4;
          d[i] = paper[0] + (ink[0] - paper[0]) * a;
          d[i + 1] = paper[1] + (ink[1] - paper[1]) * a;
          d[i + 2] = paper[2] + (ink[2] - paper[2]) * a;
        }
      }
      break;
    }
    case 'lembut':
      for (let i = 0; i < d.length; i += 4) {
        d[i] = clamp(d[i]! * 0.92 + 22);
        d[i + 1] = clamp(d[i + 1]! * 0.9 + 20);
        d[i + 2] = clamp(d[i + 2]! * 0.92 + 26);
      }
      break;
  }
  ctx.putImageData(img, 0, 0);
}
