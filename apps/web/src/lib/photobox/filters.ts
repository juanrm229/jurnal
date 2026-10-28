/**
 * Filter photobox: diterapkan per piksel di kanvas supaya pratinjau langsung
 * dan hasil jepretan sama persis. "Tinta" mengubah wajah jadi gambar garis
 * seperti doodle Sehari, khas aplikasi ini.
 */
export type FilterId = 'asli' | 'hangat' | 'jadul' | 'tinta' | 'duotone' | 'lembut' | 'komik' | 'riso' | 'pensil' | 'catair' | 'piksel' | 'neon' | 'tujuhpuluh' | 'sinema';

export const FILTERS: { id: FilterId; name: string; hint: string }[] = [
  { id: 'asli', name: 'asli', hint: 'jernih, sedikit lebih hidup' },
  { id: 'tinta', name: 'tinta', hint: 'wajahmu jadi doodle' },
  { id: 'jadul', name: 'jadul', hint: 'hitam-putih berbutir' },
  { id: 'hangat', name: 'hangat', hint: 'sore keemasan' },
  { id: 'duotone', name: 'duotone', hint: 'tinta & kertas' },
  { id: 'lembut', name: 'lembut', hint: 'bercahaya, pastel' },
  { id: 'komik', name: 'komik', hint: 'titik raster & garis tebal' },
  { id: 'riso', name: 'risograf', hint: 'dua tinta yang meleset sedikit' },
  { id: 'pensil', name: 'pensil', hint: 'sketsa arsir di buku gambar' },
  { id: 'catair', name: 'cat air', hint: 'warna lembut meresap kertas' },
  { id: 'piksel', name: 'piksel', hint: 'game 8-bit' },
  { id: 'neon', name: 'neon', hint: 'garis menyala di gelap' },
  { id: 'tujuhpuluh', name: '70-an', hint: 'foto pudar di album nenek' },
  { id: 'sinema', name: 'sinema', hint: 'biru-jingga ala film' },
];

/** Buram kotak (dua lintasan) untuk larik abu-abu. */
function boxBlur(src: Float32Array, w: number, h: number, r: number): Float32Array {
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  const k = 2 * r + 1;
  for (let y = 0; y < h; y++) {
    let acc = 0;
    for (let x = -r; x <= r; x++) acc += src[y * w + Math.min(w - 1, Math.max(0, x))]!;
    for (let x = 0; x < w; x++) {
      tmp[y * w + x] = acc / k;
      acc += src[y * w + Math.min(w - 1, x + r + 1)]! - src[y * w + Math.max(0, x - r)]!;
    }
  }
  for (let x = 0; x < w; x++) {
    let acc = 0;
    for (let y = -r; y <= r; y++) acc += tmp[Math.min(h - 1, Math.max(0, y)) * w + x]!;
    for (let y = 0; y < h; y++) {
      out[y * w + x] = acc / k;
      acc += tmp[Math.min(h - 1, y + r + 1) * w + x]! - tmp[Math.max(0, y - r) * w + x]!;
    }
  }
  return out;
}

function sobel(g: Float32Array, w: number, h: number, k: number): Float32Array {
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++) {
      const x0 = x - k < 0 ? x : x - k;
      const x1 = x + k >= w ? x : x + k;
      const y0 = y - k < 0 ? y : y - k;
      const y1 = y + k >= h ? y : y + k;
      const gx = g[y0 * w + x1]! + 2 * g[y * w + x1]! + g[y1 * w + x1]! - g[y0 * w + x0]! - 2 * g[y * w + x0]! - g[y1 * w + x0]!;
      const gy = g[y1 * w + x0]! + 2 * g[y1 * w + x]! + g[y1 * w + x1]! - g[y0 * w + x0]! - 2 * g[y0 * w + x]! - g[y0 * w + x1]!;
      out[y * w + x] = Math.sqrt(gx * gx + gy * gy);
    }
  return out;
}

const PICO: RGB[] = [
  [0, 0, 0], [29, 43, 83], [126, 37, 83], [0, 135, 81], [171, 82, 54], [95, 87, 79], [194, 195, 199], [255, 241, 232],
  [255, 0, 77], [255, 163, 0], [255, 236, 39], [0, 228, 54], [41, 173, 255], [131, 118, 156], [255, 119, 168], [255, 204, 170],
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
    case 'komik': {
      const g = new Float32Array(n);
      for (let p = 0, i = 0; p < n; p++, i += 4) g[p] = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
      const e = sobel(g, w, h, Math.max(1, Math.round(w / 500)));
      const cell = Math.max(4, Math.round(w / 110));
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          const i = p * 4;
          // Warna diposterisasi & dipercerah, titik raster di bagian gelap, garis tepi hitam.
          const q = (v: number) => Math.min(255, Math.round((v * 1.15) / 64) * 64 + 30);
          let rr = q(d[i]!);
          let gg = q(d[i + 1]!);
          let bb = q(d[i + 2]!);
          const dx = (x % cell) - cell / 2;
          const dy = (y % cell) - cell / 2;
          const rad = Math.max(0, 1 - g[p]! / 200) * cell * 0.55;
          if (dx * dx + dy * dy < rad * rad) (rr *= 0.35), (gg *= 0.35), (bb *= 0.4);
          if (e[p]! > 150) rr = gg = bb = 18;
          d[i] = rr;
          d[i + 1] = gg;
          d[i + 2] = bb;
        }
      break;
    }
    case 'riso': {
      // Dua tinta (merah muda & biru) dengan pola raster dan sedikit meleset.
      const pink: RGB = [255, 72, 176];
      const blue: RGB = [0, 120, 191];
      const paper: RGB = [247, 241, 228];
      const g = new Float32Array(n);
      for (let p = 0, i = 0; p < n; p++, i += 4) g[p] = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
      const off = Math.max(2, Math.round(w / 220));
      const bayer = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
      for (let y = 0; y < h; y++)
        for (let x = 0; x < w; x++) {
          const p = y * w + x;
          const t = (bayer[(y % 4) * 4 + (x % 4)]! + 0.5) / 16;
          const a = 1 - g[p]! / 255 > t * 0.9 ? 1 : 0;
          const q = Math.min(h - 1, y + off) * w + Math.min(w - 1, x + off);
          const b = 1 - g[q]! / 255 > 0.25 + t * 0.6 ? 1 : 0;
          let c0 = paper[0];
          let c1 = paper[1];
          let c2 = paper[2];
          if (a) (c0 = (c0 * pink[0]) / 255), (c1 = (c1 * pink[1]) / 255), (c2 = (c2 * pink[2]) / 255);
          if (b) (c0 = (c0 * blue[0]) / 255), (c1 = (c1 * blue[1]) / 255), (c2 = (c2 * blue[2]) / 255);
          const i = p * 4;
          d[i] = c0 + noise(p) * 10;
          d[i + 1] = c1 + noise(p) * 10;
          d[i + 2] = c2 + noise(p) * 10;
        }
      break;
    }
    case 'pensil': {
      // Sketsa: color dodge abu-abu dengan kebalikannya yang diburamkan.
      const g = new Float32Array(n);
      const inv = new Float32Array(n);
      for (let p = 0, i = 0; p < n; p++, i += 4) {
        g[p] = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
        inv[p] = 255 - g[p]!;
      }
      const b = boxBlur(inv, w, h, Math.max(3, Math.round(w / 90)));
      for (let p = 0, i = 0; p < n; p++, i += 4) {
        let v = Math.min(255, (g[p]! * 256) / Math.max(1, 256 - b[p]!));
        v = 255 - (255 - v) * 1.5;
        // Arsir diagonal halus.
        const x = p % w;
        const y = (p / w) | 0;
        if (g[p]! < 110 && (x + y) % 5 === 0) v -= 28;
        v = clamp(v + noise(p) * 10);
        d[i] = v;
        d[i + 1] = v;
        d[i + 2] = clamp(v - 6);
      }
      break;
    }
    case 'catair': {
      const small = document.createElement('canvas');
      small.width = Math.max(8, Math.round(w / 6));
      small.height = Math.max(8, Math.round(h / 6));
      small.getContext('2d')!.drawImage(ctx.canvas, 0, 0, small.width, small.height);
      const tmp = document.createElement('canvas');
      tmp.width = w;
      tmp.height = h;
      const tc = tmp.getContext('2d')!;
      tc.imageSmoothingQuality = 'high';
      tc.drawImage(small, 0, 0, w, h);
      const soft = tc.getImageData(0, 0, w, h).data;
      const g = new Float32Array(n);
      for (let p = 0, i = 0; p < n; p++, i += 4) g[p] = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
      const e = sobel(g, w, h, Math.max(1, Math.round(w / 400)));
      for (let p = 0, i = 0; p < n; p++, i += 4) {
        const edge = Math.min(1, e[p]! / 260) * 0.45;
        // Pigmen meresap: campuran versi buram & asli, saturasi dinaikkan, bintik kertas.
        const mix = [0, 1, 2].map((c) => soft[i + c]! * 0.55 + d[i + c]! * 0.45);
        const l = (mix[0]! + mix[1]! + mix[2]!) / 3;
        const grainP = 1 + noise(p * 3) * 0.06;
        for (let c = 0; c < 3; c++) {
          const sat = l + (mix[c]! - l) * 1.35;
          const v = Math.round(sat / 24) * 24;
          d[i + c] = clamp((v * 0.9 + 26) * grainP - edge * 90);
        }
      }
      break;
    }
    case 'piksel': {
      const cell = Math.max(3, Math.round(w / 64));
      for (let by = 0; by < h; by += cell)
        for (let bx = 0; bx < w; bx += cell) {
          let r0 = 0;
          let g0 = 0;
          let b0 = 0;
          let c = 0;
          for (let y = by; y < Math.min(h, by + cell); y++)
            for (let x = bx; x < Math.min(w, bx + cell); x++) {
              const i = (y * w + x) * 4;
              r0 += d[i]!;
              g0 += d[i + 1]!;
              b0 += d[i + 2]!;
              c++;
            }
          r0 /= c;
          g0 /= c;
          b0 /= c;
          let best = PICO[0]!;
          let bd = Infinity;
          for (const col of PICO) {
            const dd = (col[0] - r0) ** 2 * 0.3 + (col[1] - g0) ** 2 * 0.59 + (col[2] - b0) ** 2 * 0.11;
            if (dd < bd) (bd = dd), (best = col);
          }
          for (let y = by; y < Math.min(h, by + cell); y++)
            for (let x = bx; x < Math.min(w, bx + cell); x++) {
              const i = (y * w + x) * 4;
              d[i] = best[0];
              d[i + 1] = best[1];
              d[i + 2] = best[2];
            }
        }
      break;
    }
    case 'neon': {
      const g = new Float32Array(n);
      for (let p = 0, i = 0; p < n; p++, i += 4) g[p] = 0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!;
      const e = boxBlur(sobel(g, w, h, Math.max(1, Math.round(w / 420))), w, h, 1);
      const glow = boxBlur(e, w, h, Math.max(2, Math.round(w / 110)));
      for (let p = 0, i = 0; p < n; p++, i += 4) {
        const y = (p / w) | 0;
        const t = y / h;
        // Merah muda di atas → biru muda di bawah.
        const col: RGB = [255 * (1 - t) + 40 * t, 60 + 170 * t, 200 + 55 * t];
        const a = Math.min(1, Math.max(0, (e[p]! - 60) / 160));
        const gl = Math.min(1, glow[p]! / 160) * 0.7;
        const base = 0.08 * g[p]!;
        d[i] = clamp(10 + base + col[0] * Math.max(a, gl));
        d[i + 1] = clamp(6 + base + col[1] * Math.max(a, gl));
        d[i + 2] = clamp(28 + base + col[2] * Math.max(a, gl));
      }
      break;
    }
    case 'tujuhpuluh':
      for (let i = 0, p = 0; i < d.length; i += 4, p++) {
        const x = (p % w) / w - 0.5;
        const y = Math.floor(p / w) / h - 0.5;
        const vig = 1 - (x * x + y * y) * 0.7;
        const r0 = d[i]!;
        const g0 = d[i + 1]!;
        const b0 = d[i + 2]!;
        // Hitam terangkat, kuning-hijau pudar, kontras turun.
        d[i] = clamp((r0 * 0.78 + 52 + noise(p) * 14) * vig + 10);
        d[i + 1] = clamp((g0 * 0.74 + 50 + noise(p) * 14) * vig + 6);
        d[i + 2] = clamp((b0 * 0.6 + 40 + noise(p) * 14) * vig);
      }
      break;
    case 'sinema':
      for (let i = 0; i < d.length; i += 4) {
        const l = (0.3 * d[i]! + 0.59 * d[i + 1]! + 0.11 * d[i + 2]!) / 255;
        const s = (v: number) => (v - 128) * 1.18 + 128;
        // Bayangan ke biru kehijauan, sorotan ke jingga.
        const sh = 1 - l;
        d[i] = clamp(s(d[i]!) - sh * 22 + l * 26);
        d[i + 1] = clamp(s(d[i + 1]!) + sh * 6 + l * 6);
        d[i + 2] = clamp(s(d[i + 2]!) + sh * 26 - l * 30);
      }
      break;
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
