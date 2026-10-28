/**
 * Desain strip photobox, digambar di kanvas. Ukuran kanvas mengikuti foto:
 * tinggi selalu 1800 px (strip 2×6 inci di 300 dpi), lebarnya menyesuaikan
 * jumlah kolom (sendiri / berdua) dan rasio fotonya.
 */
import { doodle, drawLogo, F, grain, loadFonts, photoCover, seeded, tape } from '@/lib/greeting';

export type TemplateId = 'klasik' | 'korea' | 'film' | 'purikura' | 'tiket' | 'struk' | 'halaman' | 'malam';

export const TEMPLATES: { id: TemplateId; name: string; hint: string; swatch: string }[] = [
  { id: 'klasik', name: 'klasik', hint: 'photobox mal, putih bersih', swatch: 'linear-gradient(180deg,#fff,#f1efe9)' },
  { id: 'korea', name: 'empat potong', hint: 'ala photobox Korea', swatch: 'linear-gradient(135deg,#f6dde4,#dde8f7)' },
  { id: 'film', name: 'negatif film', hint: 'lubang film & angka', swatch: 'linear-gradient(180deg,#1b1b1b,#2b2622)' },
  { id: 'purikura', name: 'purikura', hint: 'kilau, hati, stiker', swatch: 'linear-gradient(160deg,#ffc6e6,#d9ccff)' },
  { id: 'tiket', name: 'tiket bioskop', hint: 'pertunjukan hari ini', swatch: 'linear-gradient(180deg,#f6ecd6,#ead9b5)' },
  { id: 'struk', name: 'struk', hint: 'bon kenangan', swatch: 'repeating-linear-gradient(180deg,#fff 0 6px,#f1f1f1 6px 8px)' },
  { id: 'halaman', name: 'halaman sehari', hint: 'polaroid & selotip', swatch: 'radial-gradient(#c9c4ff 1px,#f7f5ef 1.5px) 0 0/8px 8px' },
  { id: 'malam', name: 'malam', hint: 'bintang & cahaya', swatch: 'linear-gradient(180deg,#0f1238,#2a1f5c)' },
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

function photo(ctx: CanvasRenderingContext2D, img: Img | undefined, r: Rect, rad = 0, mono = false) {
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
    for (let i = 0; i < p.length; i += 4) {
      const l = Math.min(255, Math.max(0, (0.3 * p[i]! + 0.59 * p[i + 1]! + 0.11 * p[i + 2]! - 128) * 1.25 + 140));
      p[i] = p[i + 1] = p[i + 2] = l;
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
      text(ctx, inp.caption || (duo ? 'dua kota, satu bingkai' : 'hari ini lucu juga ya'), 46, fy + 92, F.hand(62), '#232030', 'left', W - 300);
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
      ctx.strokeText(duo ? 'kita berdua ♡' : 'hari yang lucu', mid, 140);
      ctx.fillStyle = '#fff';
      ctx.fillText(duo ? 'kita berdua ♡' : 'hari yang lucu', mid, 140);
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
      text(ctx, inp.caption || (duo ? 'dua kota, satu halaman.' : 'satu hari, empat wajah.'), 60, fy + 120, F.hand(56), inp.ink, 'left', W - 270);
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
      text(ctx, inp.caption || (duo ? 'langit yang sama, kota yang beda' : inp.dateLabel), mid, fy + 84, F.display(42, 400, true), '#eef0ff', 'center', W - 80);
      text(ctx, duo ? duoLine(inp) : `${inp.time} · ${inp.cities[0] ?? ''}`, mid, fy + 126, F.mono(19), '#aeb6ea', 'center', W - 80);
      drawLogo(ctx, mid, fy + 168, 28, '#c9d2ff', 'center');
      break;
    }
  }
  // Benang tipis di garis sambung strip berdua: tanda dua kota yang bertemu.
  if (duo && t !== 'halaman') {
    const seam = rects[0]![0]!.x + rects[0]![0]!.w + (rects[1]![0]!.x - rects[0]![0]!.x - rects[0]![0]!.w) / 2;
    ctx.save();
    ctx.fillStyle = t === 'film' || t === 'malam' ? 'rgba(255,255,255,0.9)' : inp.ink;
    for (let i = 0; i < shots - 1; i++) {
      const y = rects[0]![i]!.y + rects[0]![i]!.h + spec(t, cols, shots).gapY / 2;
      text(ctx, '♥', seam, y + 9, '22px sans-serif', ctx.fillStyle as string);
    }
    ctx.restore();
  }
}
