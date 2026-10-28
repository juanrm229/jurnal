/**
 * Desain strip photobox, digambar di kanvas. Ukuran kanvas mengikuti foto:
 * tinggi selalu 1800 px (strip 2×6 inci di 300 dpi), lebarnya menyesuaikan
 * jumlah kolom (sendiri / berdua) dan rasio fotonya.
 */
import { doodle, drawLogo, F, grain, loadFonts, photoCover, seeded, tape } from '@/lib/greeting';

export type TemplateId = 'klasik' | 'korea' | 'film' | 'purikura' | 'tiket' | 'struk' | 'halaman' | 'malam' | 'koran' | 'perangko' | 'boarding' | 'konsol' | 'dicari' | 'y2k' | 'bukutulis' | 'kalender';

export const TEMPLATES: { id: TemplateId; name: string; hint: string; swatch: string }[] = [
  { id: 'klasik', name: 'klasik', hint: 'photobox mal, putih bersih', swatch: 'linear-gradient(180deg,#fff,#f1efe9)' },
  { id: 'korea', name: 'empat potong', hint: 'ala photobox Korea', swatch: 'linear-gradient(135deg,#f6dde4,#dde8f7)' },
  { id: 'film', name: 'negatif film', hint: 'lubang film & angka', swatch: 'linear-gradient(180deg,#1b1b1b,#2b2622)' },
  { id: 'purikura', name: 'purikura', hint: 'kilau, hati, stiker', swatch: 'linear-gradient(160deg,#ffc6e6,#d9ccff)' },
  { id: 'tiket', name: 'tiket bioskop', hint: 'pertunjukan hari ini', swatch: 'linear-gradient(180deg,#f6ecd6,#ead9b5)' },
  { id: 'struk', name: 'struk', hint: 'bon kenangan', swatch: 'repeating-linear-gradient(180deg,#fff 0 6px,#f1f1f1 6px 8px)' },
  { id: 'halaman', name: 'halaman sehari', hint: 'polaroid & selotip', swatch: 'radial-gradient(#c9c4ff 1px,#f7f5ef 1.5px) 0 0/8px 8px' },
  { id: 'malam', name: 'malam', hint: 'bintang & cahaya', swatch: 'linear-gradient(180deg,#0f1238,#2a1f5c)' },
  { id: 'boarding', name: 'boarding pass', hint: 'kota asal ✈ kota tujuan', swatch: 'linear-gradient(180deg,#1f4bd8 0 22%,#f4f6fb 22%)' },
  { id: 'koran', name: 'koran', hint: 'berita utama hari ini', swatch: 'linear-gradient(180deg,#efe9da,#e2dac6)' },
  { id: 'perangko', name: 'perangko', hint: 'tiap foto jadi prangko', swatch: 'radial-gradient(circle,#f4ead6 3px,#e3473d 3.5px) 0 0/10px 10px' },
  { id: 'konsol', name: 'konsol jadul', hint: 'layar hijau 4 warna', swatch: 'linear-gradient(180deg,#c9c4b6 0 70%,#9bbc0f 70%)' },
  { id: 'dicari', name: 'dicari', hint: 'poster koboi: hidup atau bahagia', swatch: 'radial-gradient(circle,#ecd9ad,#b98a4b)' },
  { id: 'y2k', name: 'Y2K', hint: 'krom, kupu-kupu, bling', swatch: 'linear-gradient(135deg,#a0e9ff,#cdb4ff,#ffc8dd)' },
  { id: 'bukutulis', name: 'buku tulis', hint: 'kertas bergaris & coretan', swatch: 'repeating-linear-gradient(180deg,#fff 0 9px,#a9c6f5 9px 10px)' },
  { id: 'kalender', name: 'kalender sobek', hint: 'tanggal besar di atas', swatch: 'linear-gradient(180deg,#d8443a 0 30%,#fffdf8 30%)' },
];

type Img = CanvasImageSource & { width: number; height: number };
type Rect = { x: number; y: number; w: number; h: number };

export interface StripInput {
  /** frames[kolom][jepretan]. Sendiri: satu kolom. Berdua: kiri = tuan rumah. */
  frames: Img[][];
  names: string[];
  cities: string[];
  dateLabel: string;
  dayLabel?: string;
  time: string;
  caption?: string;
  /** 'waktu' = dulu & sekarang (dua waktu, bukan dua kota). */
  theme?: 'waktu';
  /** Teks pose tiap jepretan (dipakai desain struk). */
  poses: string[];
  ink: string;
  seed: string;
}

interface Spec {
  top: number;
  bottom: number;
  side: number;
  gapX: number;
  gapY: number;
  /** Rasio foto (lebar/tinggi). */
  aspect: number;
  /** Sendirian 4 jepretan disusun 2×2. */
  grid?: boolean;
  minW?: number;
}

const H = 1800;

function spec(t: TemplateId, cols: number, shots: number): Spec {
  const duo = cols > 1;
  switch (t) {
    case 'korea':
      return { top: 150, bottom: 200, side: 46, gapX: duo ? 10 : 22, gapY: 22, aspect: duo ? 4 / 3 : 3 / 4, grid: !duo && shots === 4 };
    case 'film':
      return { top: 110, bottom: 170, side: 86, gapX: duo ? 8 : 0, gapY: 34, aspect: 3 / 2 };
    case 'purikura':
      return { top: 210, bottom: 190, side: 60, gapX: duo ? 12 : 0, gapY: 40, aspect: 4 / 3 };
    case 'tiket':
      return { top: 230, bottom: 330, side: 56, gapX: duo ? 8 : 0, gapY: 20, aspect: 4 / 3 };
    case 'struk':
      return { top: 330, bottom: 470, side: 70, gapX: duo ? 8 : 0, gapY: 26, aspect: 4 / 3, minW: 640 };
    case 'halaman':
      return { top: 230, bottom: 250, side: 70, gapX: duo ? 6 : 0, gapY: 70, aspect: 4 / 3 };
    case 'malam':
      return { top: 220, bottom: 190, side: 56, gapX: duo ? 10 : 0, gapY: 30, aspect: 4 / 3 };
    case 'koran':
      return { top: 300, bottom: 200, side: 54, gapX: duo ? 10 : 0, gapY: 64, aspect: 4 / 3, minW: 620 };
    case 'perangko':
      return { top: 140, bottom: 220, side: 76, gapX: duo ? 64 : 0, gapY: 70, aspect: 4 / 5, minW: 560 };
    case 'boarding':
      return { top: 400, bottom: 280, side: 56, gapX: duo ? 8 : 0, gapY: 22, aspect: 4 / 3, minW: 640 };
    case 'konsol':
      return { top: 150, bottom: 470, side: 96, gapX: duo ? 6 : 0, gapY: 14, aspect: 4 / 3 };
    case 'dicari':
      return { top: 330, bottom: 300, side: 76, gapX: duo ? 22 : 0, gapY: 30, aspect: duo ? 4 / 5 : 4 / 3, minW: 640 };
    case 'y2k':
      return { top: 220, bottom: 200, side: 60, gapX: duo ? 12 : 0, gapY: 36, aspect: 4 / 3 };
    case 'bukutulis':
      return { top: 200, bottom: 210, side: 96, gapX: duo ? 8 : 0, gapY: 74, aspect: 4 / 3 };
    case 'kalender':
      return { top: 470, bottom: 110, side: 56, gapX: duo ? 8 : 0, gapY: 18, aspect: 4 / 3 };
    default:
      return { top: 46, bottom: 230, side: 40, gapX: duo ? 8 : 0, gapY: 22, aspect: 4 / 3 };
  }
}

/** Rasio foto yang harus dipotong kamera untuk desain ini. */
export const frameAspect = (t: TemplateId, cols: number, shots: number) => spec(t, cols, shots).aspect;

function layout(t: TemplateId, cols: number, shots: number) {
  const s = spec(t, cols, shots);
  const rows = s.grid ? Math.ceil(shots / 2) : shots;
  const c = s.grid ? 2 : cols;
  const fh = (H - s.top - s.bottom - s.gapY * (rows - 1)) / rows;
  const fw = fh * s.aspect;
  const inner = fw * c + s.gapX * (c - 1);
  const W = Math.round(Math.max(s.minW ?? 0, inner + s.side * 2));
  const x0 = (W - inner) / 2;
  /** rects[kolom][jepretan] */
  const rects: Rect[][] = Array.from({ length: cols }, () => []);
  for (let i = 0; i < shots; i++) {
    for (let k = 0; k < cols; k++) {
      const r = s.grid ? Math.floor(i / 2) : i;
      const cc = s.grid ? i % 2 : k;
      rects[k]![i] = { x: x0 + cc * (fw + s.gapX), y: s.top + r * (fh + s.gapY), w: fw, h: fh };
    }
  }
  return { W, rects, spec: s, inner, x0 };
}

function rr(ctx: CanvasRenderingContext2D, r: Rect, rad: number) {
  ctx.beginPath();
  ctx.roundRect(r.x, r.y, r.w, r.h, rad);
}

type Tone = boolean | 'mono' | 'sepia' | 'gb' | 'halftone';
const GB: [number, number, number][] = [[15, 56, 15], [48, 98, 48], [139, 172, 15], [155, 188, 15]];

function photo(ctx: CanvasRenderingContext2D, img: Img | undefined, r: Rect, rad = 0, mono: Tone = false) {
  ctx.save();
  rr(ctx, r, rad);
  ctx.clip();
  ctx.fillStyle = '#d9d6cf';
  ctx.fillRect(r.x, r.y, r.w, r.h);
  if (img) photoCover(ctx, img, r.x, r.y, r.w, r.h);
  if (mono) {
    const x = Math.round(r.x);
    const y = Math.round(r.y);
    const d = ctx.getImageData(x, y, Math.round(r.w), Math.round(r.h));
    const p = d.data;
    const tone = mono === true ? 'mono' : mono;
    const rw = Math.round(r.w);
    for (let i = 0, k = 0; i < p.length; i += 4, k++) {
      const g = 0.3 * p[i]! + 0.59 * p[i + 1]! + 0.11 * p[i + 2]!;
      if (tone === 'sepia') {
        const l = Math.min(255, Math.max(0, (g - 128) * 1.15 + 132));
        p[i] = Math.min(255, l * 1.07 + 12);
        p[i + 1] = l * 0.9 + 8;
        p[i + 2] = l * 0.68;
      } else if (tone === 'gb') {
        const c = GB[Math.min(3, Math.floor((g / 256) * 4 + (((k % rw) + Math.floor(k / rw)) % 2) * 0.35))]!;
        p[i] = c[0];
        p[i + 1] = c[1];
        p[i + 2] = c[2];
      } else if (tone === 'halftone') {
        // Raster titik ala cetakan koran.
        const x = k % rw;
        const y = Math.floor(k / rw);
        const cell = 7;
        const dx = (x % cell) - cell / 2;
        const dy = (y % cell) - cell / 2;
        const rad = (1 - g / 255) * cell * 0.62;
        const v = dx * dx + dy * dy < rad * rad ? 30 : 236;
        p[i] = v;
        p[i + 1] = v - 2;
        p[i + 2] = v - 8;
      } else {
        const l = Math.min(255, Math.max(0, (g - 128) * 1.25 + 140));
        p[i] = p[i + 1] = p[i + 2] = l;
      }
    }
    ctx.putImageData(d, x, y);
  }
  ctx.restore();
}

function text(ctx: CanvasRenderingContext2D, s: string, x: number, y: number, font: string, color: string, align: CanvasTextAlign = 'center', maxW?: number) {
  ctx.font = font;
  ctx.fillStyle = color;
  ctx.textAlign = align;
  ctx.textBaseline = 'alphabetic';
  if (maxW && ctx.measureText(s).width > maxW) {
    // Kecilkan huruf dulu (sampai 60%), baru dipotong kalau masih kepanjangan.
    const m = /(\d+(?:\.\d+)?)px/.exec(font);
    const base = m ? Number(m[1]) : 20;
    let px = base;
    while (px > base * 0.6 && ctx.measureText(s).width > maxW) {
      px -= 1;
      ctx.font = font.replace(/\d+(?:\.\d+)?px/, `${px}px`);
    }
    let t = s;
    while (t.length > 1 && ctx.measureText(t).width > maxW) t = t.slice(0, -2) + '…';
    ctx.fillText(t, x, y);
  } else ctx.fillText(s, x, y);
}

function barcode(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, seed: string, color: string) {
  const r = seeded(seed);
  ctx.fillStyle = color;
  let cx = x;
  while (cx < x + w) {
    const bw = 2 + Math.floor(r() * 4);
    if (r() > 0.35) ctx.fillRect(cx, y, bw, h);
    cx += bw + 1 + Math.floor(r() * 3);
  }
}

/** Baris penanda kota & jam di bawah strip berdua: "Ana · Jakarta ✕ Bima · Bandung". */
function duoLine(inp: StripInput) {
  return inp.names.map((n, i) => `${n}${inp.cities[i] ? ` · ${inp.cities[i]}` : ''}`).join('   ✕   ');
}

export async function renderStrip(canvas: HTMLCanvasElement, t: TemplateId, inp: StripInput) {
  await loadFonts();
  const cols = inp.frames.length;
  const shots = Math.max(...inp.frames.map((f) => f.length), inp.poses.length, 1);
  const { W, rects, x0 } = layout(t, cols, shots);
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  const all = rects.flatMap((col, k) => col.map((r, i) => ({ r, img: inp.frames[k]?.[i], i, k })));
  const r = seeded(inp.seed);
  const duo = cols > 1;
  const pair = (kota: string, waktu: string) => (inp.theme === 'waktu' ? waktu : kota);
  const mid = W / 2;

  switch (t) {
    case 'klasik': {
      ctx.fillStyle = '#fbfaf7';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, inp.seed, 0.04);
      for (const a of all) photo(ctx, a.img, a.r);
      const fy = H - 230;
      if (inp.caption) text(ctx, inp.caption, mid, fy + 70, F.hand(54), inp.ink, 'center', W - 60);
      drawLogo(ctx, mid, fy + (inp.caption ? 140 : 110), 40, '#1b1b22', 'center');
      text(ctx, duo ? duoLine(inp) : `${inp.dateLabel} · ${inp.time}`, mid, fy + (inp.caption ? 188 : 160), F.mono(duo ? 20 : 19), '#6b6b72', 'center', W - 50);
      if (duo) text(ctx, `${inp.dateLabel} · ${inp.time}`, mid, fy + (inp.caption ? 214 : 190), F.mono(17), '#9a9aa2', 'center');
      break;
    }
    case 'korea': {
      const tints = ['#f6dde4', '#dde8f7', '#e8f0dc', '#f4e4d4', '#ece1f7'];
      ctx.fillStyle = tints[Math.floor(r() * tints.length)]!;
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, inp.seed, 0.05);
      text(ctx, 'empat potong', 46, 96, F.display(56, 500, true), '#232030', 'left');
      text(ctx, inp.dateLabel, W - 46, 74, F.mono(20), '#5d5866', 'right');
      text(ctx, inp.time + (inp.cities[0] ? ` · ${inp.cities.filter(Boolean).join(' & ')}` : ''), W - 46, 102, F.mono(20), '#5d5866', 'right', W / 2);
      for (const a of all) {
        ctx.save();
        ctx.shadowColor = 'rgba(30,20,40,0.18)';
        ctx.shadowBlur = 18;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#fff';
        rr(ctx, a.r, 18);
        ctx.fill();
        ctx.restore();
        photo(ctx, a.img, a.r, 18);
      }
      const fy = H - 200;
      text(ctx, inp.caption || (duo ? pair('dua kota, satu bingkai', 'dulu & sekarang, satu bingkai') : 'hari ini lucu juga ya'), 46, fy + 92, F.hand(62), '#232030', 'left', W - 300);
      if (duo) text(ctx, duoLine(inp), 46, fy + 140, F.mono(19), '#5d5866', 'left', W - 300);
      drawLogo(ctx, W - 46, fy + 120, 38, '#232030', 'right');
      ['hati-kecil', 'kilau', 'bintang-kecil'].forEach((id, i) => doodle(ctx, id, W - 140 - i * 70, fy + 20 + (i % 2) * 20, 46, '#232030', 3, (r() - 0.5) * 0.6));
      break;
    }
    case 'film': {
      ctx.fillStyle = '#151413';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, inp.seed, 0.12, '255,240,220');
      ctx.fillStyle = 'rgba(246,240,228,0.92)';
      for (let y = 22; y < H - 20; y += 46)
        for (const x of [22, W - 22 - 30]) {
          ctx.beginPath();
          ctx.roundRect(x, y, 30, 22, 5);
          ctx.fill();
        }
      const orange = '#f0a24b';
      text(ctx, 'SEHARI 400', mid, 76, F.mono(30, 600), orange);
      text(ctx, '◂ ' + inp.dateLabel.toUpperCase(), x0, 76, F.mono(16), orange, 'left');
      for (const a of all) {
        photo(ctx, a.img, a.r, 6);
        if (a.k === 0) {
          ctx.save();
          ctx.translate(30 + 30 + 18, a.r.y + a.r.h / 2);
          ctx.rotate(-Math.PI / 2);
          text(ctx, `${a.i + 1}  ▸  ${a.i + 1}A`, 0, 0, F.mono(18, 600), orange);
          ctx.restore();
        }
      }
      const fy = H - 170;
      text(ctx, inp.caption || (duo ? duoLine(inp) : `${inp.time} · ${inp.cities[0] ?? ''}`), mid, fy + 70, inp.caption ? F.hand(52) : F.mono(22, 600), orange, 'center', W - 200);
      if (inp.caption && duo) text(ctx, duoLine(inp), mid, fy + 108, F.mono(18), orange, 'center', W - 200);
      drawLogo(ctx, mid, fy + 148, 30, orange, 'center');
      break;
    }
    case 'purikura': {
      const g = ctx.createLinearGradient(0, 0, W * 0.4, H);
      g.addColorStop(0, '#ffc6e6');
      g.addColorStop(0.55, '#f2d4ff');
      g.addColorStop(1, '#cfd6ff');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Polkadot putih samar.
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      for (let y = 20; y < H; y += 54) for (let x = (y / 54) % 2 ? 20 : 47; x < W; x += 54) ctx.fillRect(x, y, 7, 7);
      ctx.save();
      ctx.font = F.hand(96);
      ctx.textAlign = 'center';
      ctx.lineWidth = 14;
      ctx.strokeStyle = '#ff5fa8';
      ctx.lineJoin = 'round';
      ctx.strokeText(duo ? pair('kita berdua ♡', 'dulu vs kini') : 'hari yang lucu', mid, 140);
      ctx.fillStyle = '#fff';
      ctx.fillText(duo ? pair('kita berdua ♡', 'dulu vs kini') : 'hari yang lucu', mid, 140);
      ctx.restore();
      for (const a of all) {
        const o = { x: a.r.x - 12, y: a.r.y - 12, w: a.r.w + 24, h: a.r.h + 24 };
        ctx.save();
        ctx.shadowColor = 'rgba(255,95,168,0.35)';
        ctx.shadowBlur = 22;
        ctx.fillStyle = '#fff';
        rr(ctx, o, 34);
        ctx.fill();
        ctx.restore();
        photo(ctx, a.img, a.r, 26);
        ctx.save();
        ctx.setLineDash([10, 10]);
        ctx.strokeStyle = '#ff8cc4';
        ctx.lineWidth = 3;
        rr(ctx, { x: o.x + 5, y: o.y + 5, w: o.w - 10, h: o.h - 10 }, 30);
        ctx.stroke();
        ctx.restore();
      }
      // Kilau & stiker.
      const stickers = ['hati-kecil', 'kilau', 'bintang-kecil', 'hati-dua', 'pita'];
      for (let i = 0; i < 12; i++) {
        const a = all[i % all.length]!;
        const corner = i % 4;
        const x = corner % 2 ? a.r.x + a.r.w - 30 : a.r.x - 30;
        const y = corner > 1 ? a.r.y + a.r.h - 40 : a.r.y - 30;
        if (i < all.length * 2) doodle(ctx, stickers[i % stickers.length]!, x, y, 54 + r() * 20, i % 2 ? '#ff5fa8' : '#ffffff', 3.4, (r() - 0.5) * 0.8);
      }
      for (let i = 0; i < 26; i++) text(ctx, '✦', r() * W, 180 + r() * (H - 300), `${18 + r() * 26}px sans-serif`, 'rgba(255,255,255,0.9)');
      const fy = H - 190;
      text(ctx, inp.caption || inp.dateLabel, mid, fy + 92, F.hand(60), '#c2357a', 'center', W - 80);
      text(ctx, duo ? duoLine(inp) : `${inp.time} · ${inp.cities[0] ?? ''}`, mid, fy + 136, F.mono(19), '#9b4f86', 'center', W - 80);
      drawLogo(ctx, mid, fy + 176, 28, '#c2357a', 'center');
      break;
    }
    case 'tiket': {
      const red = '#a8322d';
      ctx.fillStyle = '#f6ecd6';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, inp.seed, 0.07);
      ctx.fillStyle = red;
      ctx.fillRect(0, 0, W, 186);
      text(ctx, 'TIKET MASUK', mid, 86, F.display(58, 600), '#f6ecd6');
      text(ctx, `PERTUNJUKAN: HARI INI · ${inp.time}`, mid, 140, F.mono(19, 600), '#f6ecd6', 'center', W - 40);
      ctx.strokeStyle = red;
      ctx.lineWidth = 3;
      for (const a of all) {
        photo(ctx, a.img, a.r, 4);
        ctx.strokeRect(a.r.x, a.r.y, a.r.w, a.r.h);
      }
      // Garis sobek + takik.
      const py = H - 300;
      ctx.fillStyle = '#e4d6b8';
      for (const x of [0, W]) {
        ctx.beginPath();
        ctx.arc(x, py, 22, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.save();
      ctx.setLineDash([12, 10]);
      ctx.strokeStyle = 'rgba(168,50,45,0.6)';
      ctx.beginPath();
      ctx.moveTo(30, py);
      ctx.lineTo(W - 30, py);
      ctx.stroke();
      ctx.restore();
      text(ctx, duo ? 'ADMIT TWO' : 'ADMIT ONE', 56, py + 70, F.display(40, 600, true), red, 'left', W - 112);
      text(ctx, `BARIS ${String.fromCharCode(65 + Math.floor(r() * 12))} · KURSI ${1 + Math.floor(r() * 30)}`, 56, py + 108, F.mono(18, 600), red, 'left');
      text(ctx, duo ? duoLine(inp) : inp.dateLabel, 56, py + 140, F.mono(16), red, 'left', W - 112);
      if (inp.caption) text(ctx, inp.caption, 56, py + 198, F.hand(46), red, 'left', W - 112);
      barcode(ctx, 56, H - 92, Math.min(220, W - 260), 46, inp.seed, red);
      drawLogo(ctx, W - 56, H - 44, 30, red, 'right');
      break;
    }
    case 'struk': {
      ctx.fillStyle = '#e6e3dc';
      ctx.fillRect(0, 0, W, H);
      const m = 22;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.12)';
      ctx.shadowBlur = 16;
      ctx.fillStyle = '#fffefb';
      ctx.beginPath();
      ctx.moveTo(m, m + 12);
      for (let x = m; x <= W - m; x += 24) ctx.lineTo(x + 12, m), ctx.lineTo(x + 24, m + 12);
      ctx.lineTo(W - m, H - m - 12);
      for (let x = W - m; x >= m; x -= 24) ctx.lineTo(x - 12, H - m), ctx.lineTo(x - 24, H - m - 12);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      const k = '#2b2b2b';
      text(ctx, 'TOKO SEHARI', mid, 110, F.mono(40, 600), k);
      text(ctx, 'jl. kenangan no. 1 · buka setiap hari', mid, 150, F.mono(17), k);
      text(ctx, '- - - - - - - - - - - - - - - - - - - - - - -', mid, 190, F.mono(17), '#999');
      text(ctx, inp.dateLabel.toUpperCase(), 70, 236, F.mono(18), k, 'left');
      text(ctx, inp.time, W - 70, 236, F.mono(18), k, 'right');
      text(ctx, duo ? `kasir: ${inp.names.join(' & ')}` : `kasir: ${inp.names[0] ?? 'kamu'}`, 70, 268, F.mono(18), k, 'left', W - 140);
      for (const a of all) photo(ctx, a.img, a.r, 0, true);
      let y = H - 470 + 46;
      text(ctx, '- - - - - - - - - - - - - - - - - - - - - - -', mid, y - 10, F.mono(17), '#999');
      ctx.font = F.mono(18);
      for (const [i, p] of inp.poses.slice(0, shots).entries()) {
        y += 34;
        text(ctx, `1x ${p}`.slice(0, 30), 70, y, F.mono(18), k, 'left');
        text(ctx, i === 0 ? 'Rp0' : 'gratis', W - 70, y, F.mono(18), k, 'right');
      }
      y += 54;
      text(ctx, 'TOTAL', 70, y, F.mono(24, 600), k, 'left');
      text(ctx, 'tak ternilai', W - 70, y, F.mono(24, 600), k, 'right');
      y += 52;
      text(ctx, inp.caption || 'terima kasih sudah mampir ♡', mid, y, inp.caption ? F.hand(42) : F.mono(17), k, 'center', W - 120);
      barcode(ctx, mid - 160, y + 24, 320, 52, inp.seed, k);
      break;
    }
    case 'halaman': {
      ctx.fillStyle = '#f7f5ef';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = inp.ink;
      ctx.globalAlpha = 0.16;
      for (let y = 18; y < H; y += 30) for (let x = 18; x < W; x += 30) ctx.fillRect(x, y, 3, 3);
      ctx.globalAlpha = 1;
      grain(ctx, W, H, inp.seed, 0.05);
      text(ctx, inp.dateLabel.replace(/ \d{4}$/, ''), 60, 120, F.hand(70), inp.ink, 'left', W - 210);
      text(ctx, [inp.dayLabel, inp.cities.filter(Boolean).join(' & '), inp.time].filter(Boolean).join(' · '), 62, 164, F.mono(19), inp.ink, 'left', W - 120);
      doodle(ctx, 'tunas', W - 130, 56, 70, inp.ink, 3);
      // Satu polaroid per baris; berdua: dua foto dalam satu polaroid.
      for (let i = 0; i < shots; i++) {
        const row = rects.map((c) => c[i]!);
        const box = { x: row[0]!.x, y: row[0]!.y, w: row[row.length - 1]!.x + row[row.length - 1]!.w - row[0]!.x, h: row[0]!.h };
        const rot = (i % 2 ? 1 : -1) * (0.02 + r() * 0.02);
        ctx.save();
        ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
        ctx.rotate(rot);
        ctx.translate(-(box.x + box.w / 2), -(box.y + box.h / 2));
        ctx.shadowColor = 'rgba(20,20,40,0.22)';
        ctx.shadowBlur = 22;
        ctx.shadowOffsetY = 8;
        ctx.fillStyle = '#fff';
        ctx.fillRect(box.x - 16, box.y - 16, box.w + 32, box.h + 58);
        ctx.restore();
        ctx.save();
        ctx.translate(box.x + box.w / 2, box.y + box.h / 2);
        ctx.rotate(rot);
        ctx.translate(-(box.x + box.w / 2), -(box.y + box.h / 2));
        row.forEach((rc, k) => photo(ctx, inp.frames[k]?.[i], rc));
        ctx.restore();
        tape(ctx, box.x + box.w / 2 + (r() - 0.5) * 60, box.y - 14, 150, (r() - 0.5) * 0.3, 'rgba(201,196,255,0.75)');
      }
      const fy = H - 250;
      text(ctx, inp.caption || (duo ? pair('dua kota, satu halaman.', 'waktu berlalu, gaya tetap.') : 'satu hari, empat wajah.'), 60, fy + 120, F.hand(56), inp.ink, 'left', W - 270);
      if (duo) text(ctx, duoLine(inp), 62, fy + 164, F.mono(18), inp.ink, 'left', W - 270);
      // Cap pos tanggal.
      ctx.save();
      ctx.strokeStyle = inp.ink;
      ctx.globalAlpha = 0.75;
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(W - 120, fy + 110, 66, 0, Math.PI * 2);
      ctx.stroke();
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(W - 120, fy + 110, 54, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, inp.dateLabel.split(' ').slice(1, 3).join(' '), W - 120, fy + 104, F.mono(18, 600), inp.ink);
      text(ctx, inp.time, W - 120, fy + 132, F.mono(18), inp.ink);
      ctx.restore();
      drawLogo(ctx, W - 50, H - 40, 28, inp.ink, 'right');
      break;
    }
    case 'malam': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#0e1236');
      g.addColorStop(1, '#2b1f5e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      for (let i = 0; i < 180; i++) {
        ctx.fillStyle = `rgba(255,255,255,${0.2 + r() * 0.7})`;
        const s = r() * 2.6 + 0.6;
        ctx.fillRect(r() * W, r() * H, s, s);
      }
      doodle(ctx, 'bulan', mid - 160, 46, 80, '#ffe9a8', 3);
      text(ctx, 'malam ini', mid + 40, 140, F.display(62, 400, true), '#eef0ff');
      for (const a of all) {
        ctx.save();
        ctx.shadowColor = 'rgba(150,168,255,0.85)';
        ctx.shadowBlur = 30;
        ctx.fillStyle = '#c9d2ff';
        rr(ctx, { x: a.r.x - 4, y: a.r.y - 4, w: a.r.w + 8, h: a.r.h + 8 }, 20);
        ctx.fill();
        ctx.restore();
        photo(ctx, a.img, a.r, 16);
      }
      const fy = H - 190;
      text(ctx, inp.caption || (duo ? pair('langit yang sama, kota yang beda', 'orang yang sama, waktu yang beda') : inp.dateLabel), mid, fy + 84, F.display(42, 400, true), '#eef0ff', 'center', W - 80);
      text(ctx, duo ? duoLine(inp) : `${inp.time} · ${inp.cities[0] ?? ''}`, mid, fy + 126, F.mono(19), '#aeb6ea', 'center', W - 80);
      drawLogo(ctx, mid, fy + 168, 28, '#c9d2ff', 'center');
      break;
    }
    case 'koran': {
      const k = '#1d1b18';
      ctx.fillStyle = '#efe9da';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, inp.seed, 0.09);
      text(ctx, 'KABAR SEHARI', mid, 120, F.display(76, 700), k, 'center', W - 60);
      ctx.fillStyle = k;
      ctx.fillRect(40, 150, W - 80, 4);
      ctx.fillRect(40, 196, W - 80, 1.5);
      text(ctx, `EDISI ${inp.dateLabel.toUpperCase()}`, 40, 182, F.mono(15, 600), k, 'left', W * 0.6);
      text(ctx, 'HARGA: SATU SENYUM', W - 40, 182, F.mono(15, 600), k, 'right');
      text(ctx, duo ? pair(`${inp.names.join(' & ').toUpperCase()} BERTEMU DI DUA KOTA`, 'DULU DAN SEKARANG: HAMPIR TAK BERUBAH') : 'WARGA INI TERNYATA LUCU SEKALI', mid, 262, F.display(38, 700), k, 'center', W - 70);
      for (const a of all) {
        photo(ctx, a.img, a.r, 0, 'halftone');
        ctx.strokeStyle = k;
        ctx.lineWidth = 2;
        ctx.strokeRect(a.r.x, a.r.y, a.r.w, a.r.h);
        if (a.k === 0) text(ctx, `Foto ${a.i + 1}: ${inp.poses[a.i] ?? 'momen yang terekam'}.`, rects[0]![a.i]!.x, a.r.y + a.r.h + 30, F.serif(19, 400, true), k, 'left', W - 108);
      }
      const fy = H - 200;
      ctx.fillStyle = k;
      ctx.fillRect(40, fy + 20, W - 80, 1.5);
      text(ctx, inp.caption || 'Saksi mata: "hari ini terlalu lucu untuk dilupakan."', mid, fy + 80, F.serif(26, 600, true), k, 'center', W - 80);
      text(ctx, duo ? duoLine(inp) : `${inp.cities[0] ?? ''} · ${inp.time}`, mid, fy + 120, F.mono(16), k, 'center', W - 80);
      drawLogo(ctx, mid, fy + 168, 28, k, 'center');
      break;
    }
    case 'perangko': {
      ctx.fillStyle = '#f4ead6';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, inp.seed, 0.06);
      const red = '#d23b33';
      text(ctx, 'POS SEHARI', mid, 92, F.display(44, 600, true), red);
      const hues = ['#e3473d', '#2f6fd6', '#2f9d63', '#d68a2f', '#8a4fd6'];
      for (const a of all) {
        const o = { x: a.r.x - 22, y: a.r.y - 22, w: a.r.w + 44, h: a.r.h + 64 };
        ctx.save();
        ctx.shadowColor = 'rgba(0,0,0,0.18)';
        ctx.shadowBlur = 14;
        ctx.shadowOffsetY = 6;
        ctx.fillStyle = '#fffdf7';
        ctx.fillRect(o.x, o.y, o.w, o.h);
        ctx.restore();
        // Gigi prangko: lingkaran warna latar di sepanjang tepi.
        ctx.fillStyle = '#f4ead6';
        for (let x = o.x; x <= o.x + o.w; x += 18)
          for (const y of [o.y, o.y + o.h]) {
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        for (let y = o.y; y <= o.y + o.h; y += 18)
          for (const x of [o.x, o.x + o.w]) {
            ctx.beginPath();
            ctx.arc(x, y, 6, 0, Math.PI * 2);
            ctx.fill();
          }
        const hue = hues[(a.i + a.k) % hues.length]!;
        ctx.fillStyle = hue;
        ctx.fillRect(a.r.x - 6, a.r.y - 6, a.r.w + 12, a.r.h + 12);
        photo(ctx, a.img, a.r);
        text(ctx, `Rp${(a.i + 1) * 1000}`, a.r.x + a.r.w - 6, a.r.y + a.r.h + 32, F.mono(18, 600), hue, 'right');
        text(ctx, a.k === 0 && duo ? (inp.cities[0] || 'SEHARI').toUpperCase() : duo ? (inp.cities[1] || 'SEHARI').toUpperCase() : 'INDONESIA · SEHARI', a.r.x + 4, a.r.y + a.r.h + 32, F.mono(14, 600), '#6b5c48', 'left', a.r.w * 0.6);
      }
      // Cap pos bergelombang di atas foto pertama.
      const f = all[0]!.r;
      ctx.save();
      ctx.strokeStyle = 'rgba(40,40,60,0.55)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(f.x + f.w - 10, f.y + 16, 52, 0, Math.PI * 2);
      ctx.stroke();
      text(ctx, inp.dateLabel.split(' ').slice(1, 3).join(' ').toUpperCase(), f.x + f.w - 10, f.y + 12, F.mono(14, 600), 'rgba(40,40,60,0.7)');
      text(ctx, inp.time, f.x + f.w - 10, f.y + 34, F.mono(14), 'rgba(40,40,60,0.7)');
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        for (let x = 0; x <= 150; x += 6) ctx.lineTo(f.x + f.w + 48 + x - 150, f.y - 10 + i * 12 + Math.sin(x / 12) * 4);
        ctx.stroke();
      }
      ctx.restore();
      const fy = H - 220;
      text(ctx, inp.caption || (duo ? pair('dikirim dari dua kota, sampai di satu strip', 'dikirim dari masa lalu') : 'salam dari hari ini'), mid, fy + 100, F.hand(50), red, 'center', W - 80);
      text(ctx, duo ? duoLine(inp) : inp.dateLabel, mid, fy + 144, F.mono(17), '#6b5c48', 'center', W - 80);
      drawLogo(ctx, mid, fy + 190, 28, red, 'center');
      break;
    }
    case 'boarding': {
      const blue = '#1f4bd8';
      ctx.fillStyle = '#f4f6fb';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = blue;
      ctx.fillRect(0, 0, W, 130);
      text(ctx, 'BOARDING PASS', 48, 82, F.mono(30, 600), '#fff', 'left');
      text(ctx, 'KELAS: BAHAGIA', W - 48, 82, F.mono(18, 600), 'rgba(255,255,255,0.85)', 'right');
      const code = (c: string | undefined) => (c ? c.replace(/[aiueo\s-]/gi, '').slice(0, 3).toUpperCase() || c.slice(0, 3).toUpperCase() : 'SHR');
      const waktu = inp.theme === 'waktu';
      const from = waktu ? (/\d{4}/.exec(inp.names[0] ?? '')?.[0] ?? 'DULU') : code(inp.cities[0]);
      const to = waktu ? String(new Date().getFullYear()) : duo ? code(inp.cities[1]) : 'SNG';
      text(ctx, from, 48, 250, F.display(92, 700), '#141a33', 'left');
      text(ctx, to, W - 48, 250, F.display(92, 700), '#141a33', 'right');
      text(ctx, '✈', mid, 236, '54px sans-serif', blue);
      text(ctx, inp.cities[0] || 'di sini', 50, 290, F.mono(16), '#6a7391', 'left');
      text(ctx, duo ? inp.cities[1] || 'di sana' : 'senang', W - 50, 290, F.mono(16), '#6a7391', 'right');
      ctx.fillStyle = '#dde3f3';
      ctx.fillRect(48, 316, W - 96, 2);
      text(ctx, `PENUMPANG  ${inp.names.join(' & ').toUpperCase()}`, 48, 356, F.mono(16, 600), '#141a33', 'left', W * 0.62);
      text(ctx, `GATE ${1 + Math.floor(r() * 9)} · KURSI ${1 + Math.floor(r() * 30)}${'ABCDEF'[Math.floor(r() * 6)]}`, W - 48, 356, F.mono(16, 600), '#141a33', 'right');
      for (const a of all) photo(ctx, a.img, a.r, 10);
      const py = H - 280;
      ctx.save();
      ctx.setLineDash([10, 10]);
      ctx.strokeStyle = '#9aa6c8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(30, py);
      ctx.lineTo(W - 30, py);
      ctx.stroke();
      ctx.restore();
      text(ctx, 'BERANGKAT', 48, py + 52, F.mono(15), '#6a7391', 'left');
      text(ctx, `${inp.time} · ${inp.dateLabel}`, 48, py + 84, F.mono(20, 600), '#141a33', 'left', W - 96);
      if (inp.caption) text(ctx, inp.caption, 48, py + 140, F.hand(46), blue, 'left', W - 96);
      barcode(ctx, 48, H - 96, Math.min(300, W - 220), 52, inp.seed, '#141a33');
      drawLogo(ctx, W - 48, H - 48, 28, blue, 'right');
      break;
    }
    case 'konsol': {
      ctx.fillStyle = '#c9c4b6';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, inp.seed, 0.05);
      const bezel = { x: 40, y: 60, w: W - 80, h: H - 60 - 430 };
      ctx.fillStyle = '#5b5e6b';
      ctx.beginPath();
      ctx.roundRect(bezel.x, bezel.y, bezel.w, bezel.h, [18, 18, 70, 18]);
      ctx.fill();
      text(ctx, '• LAYAR KENANGAN •', mid, 112, F.mono(15, 600), '#c9c4b6');
      ctx.fillStyle = '#9bbc0f';
      const scr = { x: x0 - 10, y: rects[0]![0]!.y - 10, w: W - 2 * (x0 - 10), h: rects[0]![shots - 1]!.y + rects[0]![shots - 1]!.h - rects[0]![0]!.y + 20 };
      ctx.fillRect(scr.x, scr.y, scr.w, scr.h);
      for (const a of all) photo(ctx, a.img, a.r, 0, 'gb');
      // Merek, D-pad, tombol A/B.
      const by = H - 400;
      text(ctx, 'SEHARI', 48, by + 52, F.display(42, 700, true), '#30318b', 'left');
      ctx.font = F.display(42, 700, true);
      text(ctx, 'BOY', 48 + ctx.measureText('SEHARI').width + 12, by + 52, F.mono(24, 600), '#30318b', 'left');
      ctx.fillStyle = '#2c2c34';
      const dx = 120;
      const dy = by + 190;
      ctx.fillRect(dx - 70, dy - 22, 140, 44);
      ctx.fillRect(dx - 22, dy - 70, 44, 140);
      ctx.fillStyle = '#9a2257';
      for (const [cx, cy] of [
        [W - 170, dy + 24],
        [W - 80, dy - 24],
      ]) {
        ctx.beginPath();
        ctx.arc(cx!, cy!, 34, 0, Math.PI * 2);
        ctx.fill();
      }
      text(ctx, 'B', W - 170, dy + 90, F.mono(20, 600), '#30318b');
      text(ctx, 'A', W - 80, dy + 42, F.mono(20, 600), '#30318b');
      text(ctx, inp.caption || (duo ? duoLine(inp) : `${inp.dateLabel}`), mid, H - 70, inp.caption ? F.hand(40) : F.mono(16, 600), '#30318b', 'center', W - 80);
      text(ctx, 'SELECT   START', mid, H - 120, F.mono(15, 600), '#6b6a74');
      break;
    }
    case 'dicari': {
      const g = ctx.createRadialGradient(mid, H / 2, W * 0.2, mid, H / 2, H * 0.62);
      g.addColorStop(0, '#f1dfb4');
      g.addColorStop(1, '#a8773c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, inp.seed, 0.16, '80,50,20');
      const k = '#3a2410';
      text(ctx, 'DICARI', mid, 150, F.display(118, 700), k, 'center', W - 50);
      text(ctx, 'HIDUP ATAU BAHAGIA', mid, 214, F.mono(26, 600), k, 'center', W - 60);
      ctx.fillStyle = k;
      ctx.fillRect(60, 244, W - 120, 3);
      for (const a of all) {
        ctx.fillStyle = k;
        ctx.fillRect(a.r.x - 8, a.r.y - 8, a.r.w + 16, a.r.h + 16);
        photo(ctx, a.img, a.r, 0, 'sepia');
      }
      const fy = H - 300;
      text(ctx, duo ? inp.names.join(' & ').toUpperCase() : (inp.names[0] ?? 'SI LUCU').toUpperCase(), mid, fy + 90, F.display(52, 700), k, 'center', W - 80);
      text(ctx, inp.caption || 'karena terlalu menggemaskan', mid, fy + 140, F.hand(46), k, 'center', W - 80);
      text(ctx, 'HADIAH: RP. 1 PELUKAN', mid, fy + 204, F.display(40, 600), '#7a1f12', 'center', W - 60);
      drawLogo(ctx, mid, fy + 264, 26, k, 'center');
      break;
    }
    case 'y2k': {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#a0e9ff');
      g.addColorStop(0.5, '#cdb4ff');
      g.addColorStop(1, '#ffc8dd');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      // Kilau krom di judul.
      const tg = ctx.createLinearGradient(0, 70, 0, 160);
      tg.addColorStop(0, '#ffffff');
      tg.addColorStop(0.45, '#c5c9e8');
      tg.addColorStop(0.55, '#7a7fb0');
      tg.addColorStop(1, '#f1f2ff');
      ctx.save();
      ctx.font = F.display(84, 700, true);
      ctx.textAlign = 'center';
      ctx.lineWidth = 10;
      ctx.strokeStyle = '#5b4bc4';
      ctx.lineJoin = 'round';
      ctx.strokeText(duo ? pair('besties', 'throwback') : 'bling', mid, 150);
      ctx.fillStyle = tg;
      ctx.fillText(duo ? pair('besties', 'throwback') : 'bling', mid, 150);
      ctx.restore();
      for (const a of all) {
        ctx.save();
        ctx.shadowColor = 'rgba(91,75,196,0.45)';
        ctx.shadowBlur = 20;
        const bg = ctx.createLinearGradient(a.r.x, a.r.y, a.r.x + a.r.w, a.r.y + a.r.h);
        bg.addColorStop(0, '#ffffff');
        bg.addColorStop(0.5, '#b9bde0');
        bg.addColorStop(1, '#ffffff');
        ctx.fillStyle = bg;
        rr(ctx, { x: a.r.x - 9, y: a.r.y - 9, w: a.r.w + 18, h: a.r.h + 18 }, 30);
        ctx.fill();
        ctx.restore();
        photo(ctx, a.img, a.r, 22);
      }
      for (let i = 0; i < 9; i++) doodle(ctx, i % 3 ? 'bintang-kecil' : 'kupu-kupu', r() * (W - 80), 170 + r() * (H - 420), 48 + r() * 30, i % 2 ? '#5b4bc4' : '#ffffff', 3, (r() - 0.5) * 0.8);
      for (let i = 0; i < 20; i++) text(ctx, '✧', r() * W, r() * H, `${16 + r() * 22}px sans-serif`, 'rgba(255,255,255,0.95)');
      const fy = H - 200;
      text(ctx, inp.caption || '✧ forever & always ✧', mid, fy + 90, F.hand(56), '#4a3bb0', 'center', W - 60);
      text(ctx, duo ? duoLine(inp) : `${inp.dateLabel} · ${inp.time}`, mid, fy + 134, F.mono(18), '#5b4bc4', 'center', W - 60);
      drawLogo(ctx, mid, fy + 178, 28, '#4a3bb0', 'center');
      break;
    }
    case 'bukutulis': {
      ctx.fillStyle = '#fffefa';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = '#a9c6f5';
      for (let y = 120; y < H; y += 44) ctx.fillRect(0, y, W, 2);
      ctx.fillStyle = '#ef8a8a';
      ctx.fillRect(74, 0, 2.5, H);
      ctx.fillStyle = '#e8e4da';
      for (let y = 140; y < H; y += 300) {
        ctx.beginPath();
        ctx.arc(34, y, 14, 0, Math.PI * 2);
        ctx.fill();
      }
      const blue = '#2850b8';
      text(ctx, inp.dateLabel.replace(/ \d{4}$/, ''), 96, 104, F.hand(56), blue, 'left', W - 130);
      text(ctx, duo ? 'tugas: foto berdua (nilai: 100)' : 'tugas: foto lucu (nilai: 100)', 96, 160, F.hand(34), '#d6453d', 'left', W - 130);
      for (const a of all) {
        ctx.save();
        ctx.translate(a.r.x + a.r.w / 2, a.r.y + a.r.h / 2);
        ctx.rotate((a.i % 2 ? 1 : -1) * 0.018);
        ctx.translate(-(a.r.x + a.r.w / 2), -(a.r.y + a.r.h / 2));
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.15)';
        ctx.shadowBlur = 10;
        ctx.fillRect(a.r.x - 8, a.r.y - 8, a.r.w + 16, a.r.h + 16);
        ctx.shadowColor = 'transparent';
        photo(ctx, a.img, a.r);
        ctx.restore();
        if (a.k === 0) {
          tape(ctx, a.r.x + 20, a.r.y - 4, 90, -0.5, 'rgba(255,224,120,0.75)');
          text(ctx, `${a.i + 1}. ${inp.poses[a.i] ?? 'senyum!'}`, rects[0]![a.i]!.x, a.r.y + a.r.h + 44, F.hand(32), blue, 'left', W - rects[0]![a.i]!.x - 30);
        }
      }
      ['hati-kecil', 'bintang-kecil', 'wajah-senyum', 'kilau', 'matahari-kecil'].forEach((id, i) => doodle(ctx, id, 16, 300 + i * 260, 46, i % 2 ? '#d6453d' : blue, 2.6, (r() - 0.5) * 0.6));
      const fy = H - 210;
      text(ctx, inp.caption || 'catatan: hari ini menyenangkan :)', 96, fy + 110, F.hand(46), blue, 'left', W - 130);
      if (duo) text(ctx, duoLine(inp), 96, fy + 150, F.mono(16), '#6a7391', 'left', W - 130);
      drawLogo(ctx, W - 40, H - 40, 26, blue, 'right');
      break;
    }
    case 'kalender': {
      const red = '#d8443a';
      ctx.fillStyle = '#fffdf8';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = red;
      ctx.fillRect(0, 0, W, 130);
      ctx.fillStyle = '#3a3a44';
      for (let x = 70; x < W - 40; x += 90) {
        ctx.beginPath();
        ctx.roundRect(x, 30, 14, 60, 7);
        ctx.fill();
      }
      const parts = inp.dateLabel.split(' ');
      const day = (parts[1] ?? '').replace(',', '');
      text(ctx, `${parts[2] ?? ''} ${parts[3] ?? ''}`.toUpperCase(), mid, 186, F.mono(24, 600), red);
      text(ctx, day, mid, 380, F.display(210, 600), '#22222a');
      text(ctx, (parts[0] ?? '').replace(',', ''), mid, 436, F.hand(48), red);
      for (const a of all) photo(ctx, a.img, a.r, 6);
      // Garis sobek di bawah.
      ctx.fillStyle = '#e6e1d6';
      for (let x = 0; x < W; x += 16) {
        ctx.beginPath();
        ctx.moveTo(x, H);
        ctx.lineTo(x + 8, H - 12);
        ctx.lineTo(x + 16, H);
        ctx.fill();
      }
      text(ctx, inp.caption || (duo ? duoLine(inp) : `${inp.time} · ${inp.cities[0] ?? ''}`), mid, H - 60, inp.caption ? F.hand(42) : F.mono(17), '#55525c', 'center', W - 200);
      drawLogo(ctx, W - 40, H - 30, 24, red, 'right');
      break;
    }
  }
  // Benang tipis di garis sambung strip berdua: tanda dua kota yang bertemu.
  if (duo && !['halaman', 'perangko', 'dicari', 'konsol'].includes(t)) {
    const seam = rects[0]![0]!.x + rects[0]![0]!.w + (rects[1]![0]!.x - rects[0]![0]!.x - rects[0]![0]!.w) / 2;
    ctx.save();
    ctx.fillStyle = t === 'film' || t === 'malam' ? 'rgba(255,255,255,0.9)' : t === 'koran' ? '#1d1b18' : inp.ink;
    for (let i = 0; i < shots - 1; i++) {
      const y = rects[0]![i]!.y + rects[0]![i]!.h + spec(t, cols, shots).gapY / 2;
      text(ctx, '♥', seam, y + 9, '22px sans-serif', ctx.fillStyle as string);
    }
    ctx.restore();
  }
}
