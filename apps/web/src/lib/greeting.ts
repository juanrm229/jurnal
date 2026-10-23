/**
 * Kartu ucapan yang digambar di canvas: beberapa desain (surat, polaroid,
 * kartu pos, malam berbintang, sticky note, bingkai bunga, tiket), dengan
 * foto opsional dan doodle. Hasilnya PNG 1080px untuk diunduh atau dikirim.
 */
import { getDoodle, getScene } from '@sehari/doodles';

export type CardDesign = 'surat' | 'polaroid' | 'pos' | 'malam' | 'sticky' | 'bunga' | 'tiket' | 'koran' | 'majalah' | 'kaset' | 'lagu' | 'chat' | 'film' | 'mesintik' | 'boarding' | 'senja' | 'struk' | 'notif' | 'kue';
export type CardFormat = 'kotak' | 'story' | 'lebar';

export interface GreetingCard {
  design: CardDesign;
  format: CardFormat;
  to: string;
  message: string;
  from: string;
  ink: string;
  doodles: string[];
  occasion?: string;
}

export const DESIGNS: { id: CardDesign; name: string; swatch: string }[] = [
  { id: 'surat', name: 'surat', swatch: 'linear-gradient(135deg,#f6efe1,#e8dcc4)' },
  { id: 'polaroid', name: 'polaroid', swatch: 'linear-gradient(135deg,#fff,#ececec)' },
  { id: 'pos', name: 'kartu pos', swatch: 'linear-gradient(135deg,#f3ead7,#d9c9a6)' },
  { id: 'malam', name: 'malam', swatch: 'linear-gradient(135deg,#1c1f3a,#0b0c18)' },
  { id: 'sticky', name: 'sticky note', swatch: 'linear-gradient(135deg,#fde68a,#f8d34c)' },
  { id: 'bunga', name: 'bingkai bunga', swatch: 'linear-gradient(135deg,#fffdf8,#fbe7ef)' },
  { id: 'tiket', name: 'tiket', swatch: 'linear-gradient(135deg,#ffd9c7,#f6b39a)' },
  { id: 'koran', name: 'koran', swatch: 'repeating-linear-gradient(0deg,#efeadf 0 6px,#d9d3c4 6px 7px)' },
  { id: 'majalah', name: 'majalah', swatch: 'linear-gradient(160deg,#e94f37,#2a14d6)' },
  { id: 'kaset', name: 'kaset', swatch: 'linear-gradient(135deg,#2b2b33,#4b4b58)' },
  { id: 'lagu', name: 'lagu', swatch: 'linear-gradient(160deg,#3a2d5c,#121019)' },
  { id: 'chat', name: 'chat', swatch: 'linear-gradient(160deg,#e7ddd2,#d3f5c4)' },
  { id: 'film', name: 'rol film', swatch: 'linear-gradient(135deg,#111,#3a3a3a)' },
  { id: 'mesintik', name: 'mesin tik', swatch: 'linear-gradient(135deg,#fbfaf6,#ebe7dc)' },
  { id: 'boarding', name: 'boarding pass', swatch: 'linear-gradient(135deg,#cfe3ff,#2a14d6)' },
  { id: 'senja', name: 'senja retro', swatch: 'linear-gradient(180deg,#ffd27f,#f28c6a,#9b4f96)' },
  { id: 'struk', name: 'struk', swatch: 'linear-gradient(135deg,#fdfcf8,#efeadf)' },
  { id: 'notif', name: 'notifikasi', swatch: 'linear-gradient(160deg,#6a7bd8,#d58ab6)' },
  { id: 'kue', name: 'pesta', swatch: 'linear-gradient(135deg,#ffe0ec,#fff5c2)' },
];

export const FORMATS: { id: CardFormat; name: string; w: number; h: number }[] = [
  { id: 'kotak', name: '4:5', w: 1080, h: 1350 },
  { id: 'story', name: 'story', w: 1080, h: 1920 },
  { id: 'lebar', name: 'lebar', w: 1500, h: 1000 },
];

export const OCCASIONS: { id: string; name: string; doodles: string[]; lines: string[] }[] = [
  { id: 'ulang-tahun', name: 'ulang tahun', doodles: ['kue-ulang-tahun', 'kado', 'kembang-api'], lines: ['Selamat ulang tahun. Terima kasih sudah lahir dan bertahan sampai hari ini, dan sudah mau berbagi hari-harinya denganku.', 'Satu tahun lagi kamu jadi orang yang makin kusayangi. Tiup lilinnya pelan-pelan, aku ikut berdoa dari sini.', 'Semoga tahun ini lebih ringan, lebih banyak tawa, dan lebih sedikit tanggal tua.'] },
  { id: 'jadian', name: 'hari jadi', doodles: ['hati-dua', 'tangan-bergandeng', 'bunga-matahari'], lines: ['Sudah sejauh ini, dan aku masih senang tiap kali namamu muncul di layar.', 'Terima kasih untuk semua hari biasa yang jadi luar biasa karena kamu ada di sana.', 'Ayo terus berjalan pelan-pelan. Aku tidak sedang buru-buru ke mana pun, asal sama kamu.'] },
  { id: 'terima-kasih', name: 'terima kasih', doodles: ['bunga-vas', 'cangkir', 'hati-kecil'], lines: ['Terima kasih sudah ada, bahkan di hari-hari yang aku sendiri tidak enak diajak bicara.', 'Hal kecil yang kamu lakukan kemarin ternyata besar sekali artinya buatku.', 'Aku jarang bilang ini, jadi kutulis saja: terima kasih, sungguh.'] },
  { id: 'maaf', name: 'maaf', doodles: ['payung-terbuka', 'pelukan', 'lilin'], lines: ['Maaf untuk yang kemarin. Aku salah, dan aku mau belajar memperbaikinya.', 'Aku tidak pandai bicara saat sedang kesal, jadi izinkan aku menulis: maaf, ya.', 'Boleh kita mulai lagi dari pelukan?'] },
  { id: 'semangat', name: 'semangat', doodles: ['matahari', 'tunas', 'bintang'], lines: ['Pelan-pelan saja. Kamu tidak harus menyelesaikan semuanya hari ini.', 'Aku percaya kamu, bahkan di hari kamu lupa percaya diri sendiri.', 'Habis ini istirahat, makan yang enak, dan kabari aku, ya.'] },
  { id: 'kangen', name: 'kangen', doodles: ['surat-botol', 'bulan', 'kereta'], lines: ['Jarak ini menyebalkan, tapi rinduku lebih keras kepala.', 'Hari ini ada lagu yang lewat dan langsung mengingatkanku padamu.', 'Hitung mundur sampai ketemu: masih lama, tapi tetap kuhitung.'] },
  { id: 'selamat', name: 'selamat', doodles: ['kembang-api', 'kilau', 'bintang-tiga'], lines: ['Selamat! Aku ikut bangga sampai ingin cerita ke semua orang.', 'Kerja kerasmu kelihatan, walau kamu sering bilang biasa saja.', 'Ini baru awal. Aku menunggu kabar baik berikutnya darimu.'] },
  { id: 'tanpa-alasan', name: 'tanpa alasan', doodles: ['kupu-kupu', 'bunga-kecil', 'awan-kecil'], lines: ['Tidak ada apa-apa. Cuma ingin bilang aku senang kamu ada.', 'Kartu ini dikirim tanpa alasan, dan itu justru alasannya.', 'Kalau hari ini terasa biasa, semoga kartu kecil ini bikin sedikit berbeda.'] },
];

// ── Alat gambar ────────────────────────────────────────────────────────────

const F = {
  serif: (px: number, w = 400, italic = false) => `${italic ? 'italic ' : ''}${w} ${px}px "Literata", Georgia, serif`,
  display: (px: number, w = 400, italic = false) => `${italic ? 'italic ' : ''}${w} ${px}px "Fraunces Variable", "Fraunces", Georgia, serif`,
  hand: (px: number) => `700 ${px}px "Caveat", cursive`,
  mono: (px: number, w = 400) => `${w} ${px}px "IBM Plex Mono", monospace`,
};

async function loadFonts() {
  await document.fonts?.ready;
  await Promise.all(
    ['700 60px "Caveat"', '400 40px "Literata"', 'italic 400 40px "Literata"', '400 60px "Fraunces Variable"', 'italic 400 60px "Fraunces Variable"', '400 30px "IBM Plex Mono"', '600 30px "IBM Plex Mono"'].map((f) => document.fonts?.load(f).catch(() => null)),
  );
}

function seeded(seed: string) {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  return () => ((h = Math.imul(h ^ (h >>> 15), 2246822507) >>> 0) % 100000) / 100000;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number): string[] {
  const out: string[] = [];
  for (const para of text.split('\n')) {
    let line = '';
    for (const w of para.split(/\s+/).filter(Boolean)) {
      const t = line ? `${line} ${w}` : w;
      if (ctx.measureText(t).width > max && line) {
        out.push(line);
        line = w;
      } else line = t;
    }
    out.push(line);
  }
  return out;
}

/** Tulis teks di dalam kotak; ukuran huruf mengecil sampai muat. */
function fitText(ctx: CanvasRenderingContext2D, text: string, box: { x: number; y: number; w: number; h: number }, font: (px: number) => string, opts: { max: number; min: number; lh: number; align?: CanvasTextAlign; color: string; valign?: 'top' | 'middle' }) {
  let px = opts.max;
  let lines: string[] = [];
  for (; px >= opts.min; px -= 2) {
    ctx.font = font(px);
    lines = wrap(ctx, text, box.w);
    if (lines.length * px * opts.lh <= box.h) break;
  }
  ctx.font = font(px);
  ctx.fillStyle = opts.color;
  ctx.textAlign = opts.align ?? 'left';
  ctx.textBaseline = 'alphabetic';
  const total = lines.length * px * opts.lh;
  let y = box.y + (opts.valign === 'middle' ? (box.h - total) / 2 : 0) + px;
  const x = opts.align === 'center' ? box.x + box.w / 2 : opts.align === 'right' ? box.x + box.w : box.x;
  for (const l of lines) {
    ctx.fillText(l, x, y);
    y += px * opts.lh;
  }
  return { bottom: y - px * opts.lh + px * 0.3, px };
}

function doodle(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, size: number, color: string, lw = 2.4, rot = 0) {
  const d = getDoodle(id);
  ctx.save();
  ctx.translate(x + size / 2, y + size / 2);
  ctx.rotate(rot);
  ctx.translate(-size / 2, -size / 2);
  ctx.scale(size / 64, size / 64);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = lw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const p of d.strokes) ctx.stroke(new Path2D(p));
  for (const p of d.fills ?? []) ctx.fill(new Path2D(p));
  ctx.restore();
}

function scene(ctx: CanvasRenderingContext2D, id: string, x: number, y: number, w: number, h: number, color: string) {
  const s = getScene(id);
  if (!s) return;
  const [, , vw, vh] = s.viewBox.split(/\s+/).map(Number) as [number, number, number, number];
  const k = Math.min(w / vw, h / vh);
  ctx.save();
  ctx.translate(x + (w - vw * k) / 2, y + (h - vh * k) / 2);
  ctx.scale(k, k);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = 2.2;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const p of s.strokes) ctx.stroke(new Path2D(p));
  for (const p of s.fills ?? []) ctx.fill(new Path2D(p));
  ctx.restore();
}

function grain(ctx: CanvasRenderingContext2D, W: number, H: number, seed: string, alpha = 0.05, rgb = '60,50,30') {
  const r = seeded(seed);
  for (let i = 0; i < (W * H) / 900; i++) {
    ctx.fillStyle = `rgba(${rgb},${r() * alpha})`;
    ctx.fillRect(r() * W, r() * H, 1.6, 1.6);
  }
}

function photoCover(ctx: CanvasRenderingContext2D, img: CanvasImageSource & { width: number; height: number }, x: number, y: number, w: number, h: number) {
  const k = Math.max(w / img.width, h / img.height);
  const sw = w / k;
  const sh = h / k;
  ctx.drawImage(img, (img.width - sw) / 2, (img.height - sh) / 2, sw, sh, x, y, w, h);
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

function tape(ctx: CanvasRenderingContext2D, cx: number, cy: number, w: number, rot: number, color = 'rgba(214,205,180,0.75)') {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rot);
  ctx.fillStyle = color;
  ctx.fillRect(-w / 2, -w * 0.17, w, w * 0.34);
  ctx.restore();
}

// ── Desain ─────────────────────────────────────────────────────────────────

export async function renderCard(canvas: HTMLCanvasElement, card: GreetingCard, photo: ImageBitmap | HTMLImageElement | null) {
  await loadFonts();
  const fmt = FORMATS.find((f) => f.id === card.format)!;
  const W = fmt.w;
  const H = fmt.h;
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext('2d')!;
  ctx.clearRect(0, 0, W, H);
  const ink = card.ink;
  const wide = W > H;
  const tall = H / W > 1.5;
  const seed = `${card.to}|${card.from}|${card.design}`;
  const to = card.to.trim() ? `untuk ${card.to.trim()},` : '';
  const from = card.from.trim() ? `— ${card.from.trim()}` : '';
  const msg = card.message.trim() || 'tulis pesanmu di sini…';
  const ds = card.doodles.length ? card.doodles : ['hati-kecil'];

  switch (card.design) {
    case 'surat': {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#f8f2e6');
      g.addColorStop(1, '#ecdfc7');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, seed);
      ctx.strokeStyle = ink;
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 2;
      ctx.strokeRect(46, 46, W - 92, H - 92);
      ctx.lineWidth = 1;
      ctx.strokeRect(60, 60, W - 120, H - 120);
      ctx.globalAlpha = 1;
      const pad = 120;
      let top = 150;
      if (photo) {
        const pw = wide ? 420 : W * 0.42;
        const ph = pw * 1.1;
        ctx.save();
        ctx.translate(W - pad - pw + 20, 110);
        ctx.rotate(0.05);
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, pw, ph + 70);
        ctx.shadowColor = 'transparent';
        photoCover(ctx, photo, 16, 16, pw - 32, ph - 16);
        ctx.restore();
        tape(ctx, W - pad - pw / 2 + 20, 112, 150, -0.12);
        if (!wide) top = 110 + ph + 110;
      }
      ctx.font = F.hand(78);
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      if (to) ctx.fillText(to, pad, top + 40);
      const textW = wide && photo ? W - pad * 2 - 460 : W - pad * 2;
      const r = fitText(ctx, msg, { x: pad, y: top + 80, w: textW, h: H - top - 400 }, (px) => F.serif(px, 400), { max: 58, min: 26, lh: 1.55, color: '#2b2418' });
      ctx.font = F.hand(76);
      ctx.fillStyle = ink;
      if (from) ctx.fillText(from, pad, Math.min(H - 190, r.bottom + 110));
      // Lilin segel
      const sx = W - 230;
      const sy = H - 230;
      const rg = ctx.createRadialGradient(sx - 25, sy - 25, 10, sx, sy, 95);
      rg.addColorStop(0, '#d9534f');
      rg.addColorStop(0.6, '#a92a26');
      rg.addColorStop(1, '#6e1512');
      ctx.fillStyle = rg;
      ctx.beginPath();
      for (let i = 0; i < 24; i++) {
        const a = (i / 24) * Math.PI * 2;
        const rr = 88 + (i % 2 ? 7 : -3);
        ctx.lineTo(sx + Math.cos(a) * rr, sy + Math.sin(a) * rr);
      }
      ctx.closePath();
      ctx.fill();
      doodle(ctx, ds[0]!, sx - 52, sy - 52, 104, 'rgba(255,230,220,0.85)', 3);
      break;
    }
    case 'polaroid': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#efece6');
      g.addColorStop(1, '#e2ddd3');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, seed, 0.04);
      const pw = wide ? H * 0.78 : W * (card.format === 'story' ? 0.78 : 0.64);
      const px = wide ? 90 : (W - pw) / 2;
      const py = wide ? (H - pw * 1.2) / 2 : H * 0.08;
      ctx.save();
      ctx.translate(px + pw / 2, py + pw * 0.6);
      ctx.rotate(-0.03);
      ctx.translate(-pw / 2, -pw * 0.6);
      ctx.shadowColor = 'rgba(0,0,0,0.25)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 16;
      ctx.fillStyle = '#fffefa';
      ctx.fillRect(0, 0, pw, pw * 1.2);
      ctx.shadowColor = 'transparent';
      const inset = pw * 0.06;
      if (photo) photoCover(ctx, photo, inset, inset, pw - inset * 2, pw - inset * 2);
      else {
        ctx.fillStyle = '#f2efe8';
        ctx.fillRect(inset, inset, pw - inset * 2, pw - inset * 2);
        scene(ctx, 'senja-laut', inset + 20, inset + 20, pw - inset * 2 - 40, pw - inset * 2 - 40, ink);
      }
      // Keterangan polaroid: untuk siapa (atau kalimat pertama bila kosong).
      fitText(ctx, to || msg.split(/[.\n]/)[0]!.slice(0, 60), { x: inset, y: pw - inset + 14, w: pw - inset * 2, h: pw * 0.2 - 20 }, (s) => F.hand(s), { max: 70, min: 30, lh: 1.05, align: 'center', color: ink, valign: 'middle' });
      ctx.restore();
      tape(ctx, px + pw / 2, py + 6, 220, 0.04);
      const tx = wide ? px + pw + 90 : 110;
      const ty = wide ? 140 : py + pw * 1.2 + 90;
      const tw = wide ? W - tx - 90 : W - 220;
      const fromY = H - 90;
      const r = fitText(ctx, msg, { x: tx, y: ty - 30, w: tw, h: fromY - 70 - (ty - 30) }, (s) => F.serif(s, 400, true), { max: 48, min: 22, lh: 1.5, color: '#2d2c34' });
      ctx.font = F.hand(64);
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      if (from) ctx.fillText(from, tx, Math.min(fromY, r.bottom + 76));
      ds.slice(0, 2).forEach((d, i) => doodle(ctx, d, wide ? W - 220 - i * 130 : W - 210 - i * 140, wide ? H - 210 : py + pw * 1.2 - 40, 110, ink, 2.6, (i ? 0.2 : -0.15)));
      break;
    }
    case 'pos': {
      ctx.fillStyle = '#f3ead7';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, seed, 0.06);
      // garis tepi kartu pos (merah-biru air mail)
      for (let x = 0; x < W + H; x += 60) {
        ctx.fillStyle = (x / 60) % 2 ? '#c0392b' : ink;
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x + 30, 0);
        ctx.lineTo(x + 30 - 22, 22);
        ctx.lineTo(x - 22, 22);
        ctx.fill();
        ctx.beginPath();
        ctx.moveTo(x - H * 0, H);
        ctx.lineTo(x + 30, H);
        ctx.lineTo(x + 52, H - 22);
        ctx.lineTo(x + 22, H - 22);
        ctx.fill();
      }
      const half = wide ? W * 0.5 : H * 0.45;
      if (photo) {
        if (wide) photoCover(ctx, photo, 60, 70, half - 100, H - 140);
        else photoCover(ctx, photo, 60, 70, W - 120, half - 80);
      } else if (wide) scene(ctx, 'pos-surat', 60, 70, half - 100, H - 140, ink);
      else scene(ctx, 'pos-surat', 60, 70, W - 120, half - 80, ink);
      // perangko
      const sw = 190;
      const sxp = W - 80 - sw;
      const syp = wide ? 80 : half + 30;
      ctx.fillStyle = '#fff';
      ctx.fillRect(sxp, syp, sw, sw * 1.18);
      ctx.fillStyle = '#f3ead7';
      for (let i = 0; i <= 10; i++) {
        for (const [cx, cy] of [
          [sxp + (i * sw) / 10, syp],
          [sxp + (i * sw) / 10, syp + sw * 1.18],
          [sxp, syp + (i * sw * 1.18) / 10],
          [sxp + sw, syp + (i * sw * 1.18) / 10],
        ] as const) {
          ctx.beginPath();
          ctx.arc(cx, cy, 7, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      ctx.fillStyle = ink;
      ctx.globalAlpha = 0.12;
      ctx.fillRect(sxp + 16, syp + 16, sw - 32, sw * 1.18 - 32);
      ctx.globalAlpha = 1;
      doodle(ctx, ds[0]!, sxp + 35, syp + 40, sw - 70, ink, 2.6);
      ctx.font = F.mono(18, 600);
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.fillText('SEHARI · 2026', sxp + sw / 2, syp + sw * 1.18 - 26);
      // cap pos
      ctx.save();
      ctx.translate(sxp + 10, syp + sw * 0.9);
      ctx.rotate(-0.25);
      ctx.strokeStyle = 'rgba(30,30,60,0.55)';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(0, 0, 80, 0, Math.PI * 2);
      ctx.stroke();
      ctx.font = F.mono(20, 600);
      ctx.fillStyle = 'rgba(30,30,60,0.6)';
      ctx.textAlign = 'center';
      ctx.fillText(new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date()).toUpperCase(), 0, 8);
      for (let i = 0; i < 4; i++) {
        ctx.beginPath();
        ctx.moveTo(90, -30 + i * 20);
        ctx.bezierCurveTo(130, -45 + i * 20, 160, -15 + i * 20, 210, -30 + i * 20);
        ctx.stroke();
      }
      ctx.restore();
      const tx = wide ? half + 30 : 90;
      const ty = wide ? 120 : half + 70;
      const tw = wide ? W - tx - sw - 140 : W - 180 - sw - 40;
      ctx.font = F.hand(70);
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      if (to) ctx.fillText(to, tx, ty + 40);
      const r = fitText(ctx, msg, { x: tx, y: ty + 80, w: wide ? tw : W - 180 - sw - 70, h: H - ty - 300 }, (s) => F.hand(s), { max: 64, min: 30, lh: 1.25, color: '#2a2a33' });
      ctx.font = F.hand(66);
      ctx.fillStyle = ink;
      if (from) ctx.fillText(from, tx, Math.min(H - 90, r.bottom + 80));
      break;
    }
    case 'malam': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#1f2347');
      g.addColorStop(1, '#090a16');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const r = seeded(seed);
      for (let i = 0; i < 220; i++) {
        const s = r() * 2.4;
        ctx.fillStyle = `rgba(255,248,220,${0.2 + r() * 0.7})`;
        ctx.beginPath();
        ctx.arc(r() * W, r() * H * 0.75, s, 0, Math.PI * 2);
        ctx.fill();
      }
      const gold = '#e9d9a8';
      doodle(ctx, 'bulan', W - 330, 90, 220, gold, 2.2);
      let top = H * 0.22;
      if (photo) {
        const pw = wide ? 380 : W * 0.5;
        ctx.save();
        ctx.beginPath();
        ctx.arc(wide ? 280 : W / 2, wide ? H / 2 : H * 0.26, pw / 2, 0, Math.PI * 2);
        ctx.clip();
        photoCover(ctx, photo, (wide ? 280 : W / 2) - pw / 2, (wide ? H / 2 : H * 0.26) - pw / 2, pw, pw);
        ctx.restore();
        ctx.strokeStyle = gold;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(wide ? 280 : W / 2, wide ? H / 2 : H * 0.26, pw / 2 + 14, 0, Math.PI * 2);
        ctx.stroke();
        if (!wide) top = H * 0.26 + pw / 2 + 80;
      }
      const tx = wide && photo ? 560 : 110;
      const tw = W - tx - 110;
      ctx.font = F.display(40, 400, true);
      ctx.fillStyle = gold;
      ctx.textAlign = wide && photo ? 'left' : 'center';
      const cx = wide && photo ? tx : W / 2;
      if (to) ctx.fillText(to, cx, top);
      const t = fitText(ctx, msg, { x: tx, y: top + 30, w: tw, h: H - top - 300 }, (s) => F.display(s, 380), { max: 74, min: 30, lh: 1.3, align: wide && photo ? 'left' : 'center', color: '#f6efdc' });
      ctx.font = F.hand(70);
      ctx.fillStyle = gold;
      if (from) ctx.fillText(from, cx, Math.min(H - 110, t.bottom + 100));
      ds.slice(0, 3).forEach((d, i) => doodle(ctx, d, 80 + i * 120, H - 180, 90, 'rgba(233,217,168,0.7)', 2.2));
      break;
    }
    case 'sticky': {
      ctx.fillStyle = '#f4f3ef';
      ctx.fillRect(0, 0, W, H);
      ctx.fillStyle = 'rgba(42,20,214,0.13)';
      for (let x = 30; x < W; x += 44) for (let y = 30; y < H; y += 44) ctx.fillRect(x, y, 3, 3);
      const nw = wide ? H * 0.82 : W * 0.8;
      const nh = wide ? nw : Math.min(H * 0.78, nw * 1.2);
      const nx = wide ? W * 0.42 - nw / 2 + 120 : (W - nw) / 2;
      const ny = (H - nh) / 2 + (photo && !wide ? 60 : 0);
      if (photo) {
        const pw = wide ? 360 : W * 0.4;
        ctx.save();
        ctx.translate(wide ? 120 : W - pw - 40, wide ? H / 2 - pw / 2 : 60);
        ctx.rotate(-0.08);
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 20;
        ctx.fillStyle = '#fff';
        ctx.fillRect(0, 0, pw, pw + 50);
        ctx.shadowColor = 'transparent';
        photoCover(ctx, photo, 12, 12, pw - 24, pw - 24);
        ctx.restore();
      }
      ctx.save();
      ctx.translate(nx + nw / 2, ny + nh / 2);
      ctx.rotate(0.025);
      ctx.translate(-nw / 2, -nh / 2);
      ctx.shadowColor = 'rgba(0,0,0,0.22)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 18;
      const sg = ctx.createLinearGradient(0, 0, 0, nh);
      sg.addColorStop(0, '#fff1a1');
      sg.addColorStop(1, '#fbd94d');
      ctx.fillStyle = sg;
      ctx.fillRect(0, 0, nw, nh);
      ctx.shadowColor = 'transparent';
      ctx.font = F.hand(64);
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      if (to) ctx.fillText(to, 60, 120);
      const t = fitText(ctx, msg, { x: 60, y: 150, w: nw - 120, h: nh - 330 }, (s) => F.hand(s), { max: 78, min: 36, lh: 1.15, color: '#26252c' });
      ctx.font = F.hand(64);
      ctx.fillStyle = ink;
      if (from) ctx.fillText(from, 60, Math.min(nh - 70, t.bottom + 80));
      ctx.restore();
      // paku
      ctx.fillStyle = '#d64545';
      ctx.beginPath();
      ctx.arc(nx + nw / 2, ny + 22, 18, 0, Math.PI * 2);
      ctx.fill();
      ds.slice(0, 3).forEach((d, i) => doodle(ctx, d, i === 0 ? nx - 60 : nx + nw - 90 - (i - 1) * 140, i === 0 ? ny + nh - 120 : ny + nh - 40, 130, ink, 2.6, (i - 1) * 0.25));
      break;
    }
    case 'bunga': {
      ctx.fillStyle = '#fffdf9';
      ctx.fillRect(0, 0, W, H);
      const pink = 'rgba(232,160,190,0.25)';
      ctx.fillStyle = pink;
      ctx.beginPath();
      ctx.arc(W * 0.15, H * 0.12, 260, 0, Math.PI * 2);
      ctx.arc(W * 0.9, H * 0.92, 320, 0, Math.PI * 2);
      ctx.fill();
      const flowers = ['mawar', 'daisy', 'tulip', 'bunga-liar', 'kuncup', 'bunga-lonceng', 'melati', 'bunga-kecil', 'daun-sudut', 'semanggi'];
      const r = seeded(seed);
      const place = (x: number, y: number, s: number) => doodle(ctx, flowers[Math.floor(r() * flowers.length)]!, x, y, s, ink, 2.4, (r() - 0.5) * 0.8);
      for (let i = 0; i < 7; i++) place(-20 + i * 70 + r() * 30, -10 + r() * 60 - i * 10 + (i > 3 ? (i - 3) * 60 : 0), 120 + r() * 50);
      for (let i = 0; i < 7; i++) place(W - 200 - i * 70 + r() * 20, H - 190 + r() * 40 - (i > 3 ? (i - 3) * 60 : 0), 120 + r() * 50);
      let top = H * 0.24;
      if (photo) {
        const pw = wide ? 380 : W * (card.format === 'story' ? 0.46 : 0.34);
        const cx = wide ? W * 0.28 : W / 2;
        const cy = wide ? H / 2 : H * 0.3;
        ctx.save();
        ctx.beginPath();
        ctx.ellipse(cx, cy, pw / 2, pw * 0.62, 0, 0, Math.PI * 2);
        ctx.clip();
        photoCover(ctx, photo, cx - pw / 2, cy - pw * 0.62, pw, pw * 1.24);
        ctx.restore();
        ctx.strokeStyle = ink;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.ellipse(cx, cy, pw / 2 + 16, pw * 0.62 + 16, 0, 0, Math.PI * 2);
        ctx.stroke();
        if (!wide) top = cy + pw * 0.62 + 90;
      }
      const tx = wide && photo ? W * 0.5 : 150;
      const tw = W - tx - 150;
      const al: CanvasTextAlign = wide && photo ? 'left' : 'center';
      const cx = al === 'left' ? tx : W / 2;
      ctx.font = F.display(46, 400, true);
      ctx.fillStyle = ink;
      ctx.textAlign = al;
      if (to) ctx.fillText(to, cx, top);
      const t = fitText(ctx, msg, { x: tx, y: top + 30, w: tw, h: H - top - 440 }, (s) => F.serif(s, 400), { max: 56, min: 24, lh: 1.55, align: al, color: '#2c2a33' });
      ctx.font = F.hand(72);
      ctx.fillStyle = ink;
      if (from) ctx.fillText(from, cx, Math.min(H - 300, t.bottom + 100));
      break;
    }
    case 'tiket': {
      ctx.fillStyle = '#f7efe6';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, seed, 0.05);
      const m = 70;
      const tw = W - m * 2;
      const th = H - m * 2;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.18)';
      ctx.shadowBlur = 30;
      ctx.shadowOffsetY = 14;
      const tg = ctx.createLinearGradient(0, 0, W, H);
      tg.addColorStop(0, '#ffd2bd');
      tg.addColorStop(1, '#f3a98e');
      ctx.fillStyle = tg;
      roundRect(ctx, m, m, tw, th, 40);
      ctx.fill();
      ctx.restore();
      const cut = wide ? m + tw * 0.72 : m + th * 0.74;
      ctx.fillStyle = '#f7efe6';
      ctx.beginPath();
      if (wide) {
        ctx.arc(cut, m, 34, 0, Math.PI * 2);
        ctx.arc(cut, m + th, 34, 0, Math.PI * 2);
      } else {
        ctx.arc(m, cut, 34, 0, Math.PI * 2);
        ctx.arc(m + tw, cut, 34, 0, Math.PI * 2);
      }
      ctx.fill();
      ctx.setLineDash([14, 12]);
      ctx.strokeStyle = 'rgba(60,30,20,0.45)';
      ctx.lineWidth = 3;
      ctx.beginPath();
      if (wide) {
        ctx.moveTo(cut, m + 40);
        ctx.lineTo(cut, m + th - 40);
      } else {
        ctx.moveTo(m + 40, cut);
        ctx.lineTo(m + tw - 40, cut);
      }
      ctx.stroke();
      ctx.setLineDash([]);
      const px = m + 70;
      let py = m + 110;
      ctx.font = F.mono(30, 600);
      ctx.fillStyle = '#5a2414';
      ctx.textAlign = 'left';
      ctx.fillText('ADMIT ONE · TIKET MASUK', px, py);
      py += 30;
      if (photo) {
        const ph = wide ? th - 260 : th * 0.3;
        const pw = wide ? ph * 0.8 : tw - 140;
        roundRect(ctx, px, py, pw, ph, 24);
        ctx.save();
        ctx.clip();
        photoCover(ctx, photo, px, py, pw, ph);
        ctx.restore();
        if (!wide) py += ph + 40;
      }
      const tx = wide && photo ? px + (th - 260) * 0.8 + 50 : px;
      const tww = (wide ? cut - 60 : m + tw - 70) - tx;
      ctx.font = F.display(70, 500);
      ctx.fillStyle = '#3b1409';
      if (to) ctx.fillText(card.to.trim(), tx, py + 70);
      const t = fitText(ctx, msg, { x: tx, y: py + 100, w: tww, h: (wide ? m + th - 90 : cut - 40) - py - 100 }, (s) => F.serif(s, 400, true), { max: 46, min: 22, lh: 1.45, color: '#3b1409' });
      void t;
      // sobekan
      const sx = wide ? cut + 50 : px;
      const sy = wide ? m + 120 : cut + 80;
      ctx.font = F.mono(24, 600);
      ctx.fillStyle = '#5a2414';
      ctx.fillText('DARI', sx, sy);
      ctx.font = F.hand(64);
      ctx.fillText(card.from.trim() || '…', sx, sy + 66);
      ctx.font = F.mono(24, 600);
      ctx.fillText('BERLAKU', sx, sy + 130);
      ctx.font = F.mono(28);
      ctx.fillText('selamanya', sx, sy + 168);
      doodle(ctx, ds[0]!, wide ? sx + 80 : W - m - 230, wide ? m + th - 260 : cut + 60, 160, '#5a2414', 2.6);
      break;
    }

    case 'koran': {
      ctx.fillStyle = '#efeadf';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, seed, 0.08, '40,35,25');
      const m = 70;
      const black = '#1d1b18';
      ctx.fillStyle = black;
      ctx.textAlign = 'center';
      ctx.font = F.display(wide ? 120 : 132, 700);
      ctx.fillText('Kabar Sehari', W / 2, m + 110);
      ctx.fillRect(m, m + 140, W - m * 2, 4);
      ctx.fillRect(m, m + 150, W - m * 2, 1.5);
      ctx.font = F.mono(22, 600);
      ctx.textAlign = 'left';
      ctx.fillText(`EDISI ${new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()}`, m, m + 184);
      ctx.textAlign = 'right';
      ctx.fillText('HARGA: SATU PELUKAN', W - m, m + 184);
      ctx.fillRect(m, m + 200, W - m * 2, 1.5);
      const head = card.to.trim() ? `${card.to.trim()} Disayang, Kata Sumber Terpercaya` : 'Kabar Baik Hari Ini';
      const h = fitText(ctx, head, { x: m, y: m + 220, w: W - m * 2, h: wide ? 150 : 230 }, (px) => F.display(px, 700), { max: 92, min: 48, lh: 1.02, color: black });
      let y = h.bottom + 30;
      const colGap = 40;
      if (photo) {
        const ph = wide ? H - y - m - 60 : (H - y) * 0.42;
        const pw = wide ? (W - m * 2) * 0.45 : W - m * 2;
        ctx.save();
        ctx.filter = 'grayscale(1) contrast(1.15)';
        photoCover(ctx, photo, m, y, pw, ph);
        ctx.restore();
        ctx.font = F.serif(20, 400, true);
        ctx.fillStyle = black;
        ctx.textAlign = 'left';
        ctx.fillText('Foto: dokumentasi pribadi, diambil dengan sayang.', m, y + ph + 30);
        if (!wide) y += ph + 60;
      }
      const tx = wide && photo ? m + (W - m * 2) * 0.45 + colGap : m;
      const tw = W - m - tx;
      ctx.font = F.mono(20, 600);
      ctx.fillStyle = black;
      ctx.textAlign = 'left';
      ctx.fillText(`OLEH ${(card.from.trim() || 'koresponden rahasia').toUpperCase()}`, tx, y + 10);
      fitText(ctx, msg, { x: tx, y: y + 30, w: tw, h: H - y - m - 120 }, (px) => F.serif(px, 400), { max: tall ? 58 : 44, min: 20, lh: 1.5, color: black });
      break;
    }
    case 'majalah': {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#f05a3c');
      g.addColorStop(1, ink);
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      if (photo) photoCover(ctx, photo, 0, 0, W, H);
      else scene(ctx, 'dua-orang', W * 0.1, H * 0.25, W * 0.8, H * 0.5, 'rgba(255,255,255,0.85)');
      const shade = ctx.createLinearGradient(0, H * 0.4, 0, H);
      shade.addColorStop(0, 'rgba(0,0,0,0)');
      shade.addColorStop(1, 'rgba(0,0,0,0.72)');
      ctx.fillStyle = shade;
      ctx.fillRect(0, 0, W, H);
      const top = ctx.createLinearGradient(0, 0, 0, 380);
      top.addColorStop(0, 'rgba(0,0,0,0.45)');
      top.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = top;
      ctx.fillRect(0, 0, W, 380);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = F.display(wide ? 200 : 230, 800, true);
      ctx.fillText('SEHARI', W / 2, wide ? 200 : 250);
      ctx.font = F.mono(24, 600);
      ctx.fillText(`EDISI KHUSUS · ${new Intl.DateTimeFormat('id-ID', { month: 'long', year: 'numeric' }).format(new Date()).toUpperCase()}`, W / 2, wide ? 270 : 310);
      ctx.textAlign = 'left';
      ctx.font = F.mono(26, 700);
      ctx.fillStyle = '#ffd34d';
      const hy = wide ? H - 400 : H - 470;
      ctx.fillText('EKSKLUSIF', 80, hy);
      const t = fitText(ctx, card.to.trim() ? `${card.to.trim()}: orang paling dicari tahun ini` : 'Wajah paling ditunggu tahun ini', { x: 80, y: hy + 20, w: W - 160, h: wide ? 120 : 200 }, (px) => F.display(px, 700), { max: 86, min: 44, lh: 1.02, color: '#fff' });
      fitText(ctx, msg, { x: 80, y: t.bottom + 10, w: W - 160, h: H - t.bottom - 130 }, (px) => F.serif(px, 400, true), { max: 36, min: 20, lh: 1.4, color: 'rgba(255,255,255,0.92)' });
      ctx.font = F.mono(22, 600);
      ctx.fillStyle = '#fff';
      if (from) ctx.fillText(`WAWANCARA OLEH ${card.from.trim().toUpperCase()}`, 80, H - 70);
      return finish(ctx, W, H, card, 'none');
    }
    case 'kaset': {
      ctx.fillStyle = '#e9e4da';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, seed, 0.05);
      const cw = wide ? W * 0.62 : W * 0.86;
      const ch = cw * 0.64;
      const cx = wide ? 70 : (W - cw) / 2;
      const cy = wide ? (H - ch) / 2 : 110;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.3)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 20;
      ctx.fillStyle = '#2c2c34';
      roundRect(ctx, cx, cy, cw, ch, 26);
      ctx.fill();
      ctx.restore();
      ctx.fillStyle = '#f7f2e4';
      roundRect(ctx, cx + cw * 0.06, cy + ch * 0.08, cw * 0.88, ch * 0.56, 14);
      ctx.fill();
      ctx.fillStyle = ink;
      ctx.fillRect(cx + cw * 0.06, cy + ch * 0.08, cw * 0.88, ch * 0.1);
      ctx.font = F.mono(Math.round(cw * 0.034), 700);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText('SISI A · MIXTAPE SEHARI', cx + cw * 0.09, cy + ch * 0.155);
      fitText(ctx, card.to.trim() ? `lagu-lagu untuk ${card.to.trim()}` : 'lagu-lagu untukmu', { x: cx + cw * 0.09, y: cy + ch * 0.2, w: cw * 0.82, h: ch * 0.14 }, (px) => F.hand(px), { max: 70, min: 30, lh: 1, color: ink });
      // jendela pita
      ctx.fillStyle = '#1a1a20';
      roundRect(ctx, cx + cw * 0.28, cy + ch * 0.38, cw * 0.44, ch * 0.2, 40);
      ctx.fill();
      for (const k of [0.36, 0.64]) {
        ctx.fillStyle = '#f7f2e4';
        ctx.beginPath();
        ctx.arc(cx + cw * k, cy + ch * 0.48, ch * 0.07, 0, Math.PI * 2);
        ctx.fill();
        ctx.fillStyle = '#1a1a20';
        for (let a = 0; a < 6; a++) {
          ctx.save();
          ctx.translate(cx + cw * k, cy + ch * 0.48);
          ctx.rotate((a * Math.PI) / 3);
          ctx.fillRect(-3, ch * 0.03, 6, ch * 0.03);
          ctx.restore();
        }
      }
      ctx.fillStyle = '#3a3a44';
      ctx.beginPath();
      ctx.moveTo(cx + cw * 0.2, cy + ch);
      ctx.lineTo(cx + cw * 0.26, cy + ch * 0.78);
      ctx.lineTo(cx + cw * 0.74, cy + ch * 0.78);
      ctx.lineTo(cx + cw * 0.8, cy + ch);
      ctx.fill();
      const tx = wide ? cx + cw + 60 : 100;
      const ty = wide ? 120 : cy + ch + 90;
      const tw = wide ? W - tx - 70 : W - 200;
      ctx.font = F.mono(26, 700);
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      ctx.fillText('CATATAN SAMPUL', tx, ty);
      const t = fitText(ctx, msg, { x: tx, y: ty + 20, w: tw, h: H - ty - 220 }, (px) => F.hand(px), { max: tall ? 84 : 62, min: 30, lh: 1.2, color: '#2a2a33' });
      ctx.font = F.hand(60);
      ctx.fillStyle = ink;
      if (from) ctx.fillText(from, tx, Math.min(H - 110, t.bottom + 70));
      break;
    }
    case 'lagu': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#4a3a73');
      g.addColorStop(1, '#100e17');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const art = wide ? H * 0.62 : Math.min(W * 0.72, H * 0.34);
      const ax = wide ? 90 : (W - art) / 2;
      const ay = wide ? (H - art) / 2 - 40 : H * 0.1;
      ctx.save();
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = 50;
      ctx.shadowOffsetY = 24;
      roundRect(ctx, ax, ay, art, art, 24);
      ctx.fillStyle = ink;
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, ax, ay, art, art, 24);
      ctx.clip();
      if (photo) photoCover(ctx, photo, ax, ay, art, art);
      else {
        const ag = ctx.createLinearGradient(ax, ay, ax + art, ay + art);
        ag.addColorStop(0, '#f6c08a');
        ag.addColorStop(1, '#8f4f8a');
        ctx.fillStyle = ag;
        ctx.fillRect(ax, ay, art, art);
        doodle(ctx, ds[0]!, ax + art * 0.25, ay + art * 0.25, art * 0.5, '#fff', 2.2);
      }
      ctx.restore();
      const tx = wide ? ax + art + 70 : ax;
      const tw = wide ? W - tx - 90 : art;
      let y = wide ? 180 : ay + art + 80;
      ctx.textAlign = 'left';
      ctx.fillStyle = '#fff';
      const t1 = fitText(ctx, card.to.trim() ? `Untuk ${card.to.trim()}` : 'Untukmu', { x: tx, y, w: tw, h: 90 }, (px) => F.display(px, 600), { max: 64, min: 36, lh: 1, color: '#fff' });
      ctx.font = F.mono(26);
      ctx.fillStyle = 'rgba(255,255,255,0.65)';
      ctx.fillText(card.from.trim() || 'sehari', tx, t1.bottom + 30);
      y = t1.bottom + 70;
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      roundRect(ctx, tx, y, tw, 8, 4);
      ctx.fill();
      ctx.fillStyle = '#fff';
      roundRect(ctx, tx, y, tw * 0.38, 8, 4);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(tx + tw * 0.38, y + 4, 12, 0, Math.PI * 2);
      ctx.fill();
      ctx.font = F.mono(20);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('1:14', tx, y + 40);
      ctx.textAlign = 'right';
      ctx.fillText('∞', tx + tw, y + 40);
      // tombol putar
      const by = y + 110;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(tx + tw / 2, by, 44, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#100e17';
      ctx.fillRect(tx + tw / 2 - 14, by - 18, 9, 36);
      ctx.fillRect(tx + tw / 2 + 5, by - 18, 9, 36);
      ctx.textAlign = 'left';
      ctx.font = F.mono(20, 600);
      ctx.fillStyle = 'rgba(255,255,255,0.6)';
      ctx.fillText('LIRIK', tx, by + 100);
      fitText(ctx, msg, { x: tx, y: by + 110, w: tw, h: H - by - 210 }, (px) => F.display(px, 600), { max: tall ? 56 : 44, min: 22, lh: 1.3, color: '#fff' });
      return finish(ctx, W, H, card, 'light');
    }
    case 'chat': {
      ctx.fillStyle = '#efe7dd';
      ctx.fillRect(0, 0, W, H);
      ctx.globalAlpha = 0.08;
      const r = seeded(seed);
      for (let i = 0; i < 40; i++) doodle(ctx, ['hati-kecil', 'bintang-kecil', 'kilau', 'awan-kecil', 'bunga-kecil'][i % 5]!, r() * W, r() * H, 60, '#444', 2);
      ctx.globalAlpha = 1;
      ctx.fillStyle = ink;
      ctx.fillRect(0, 0, W, 150);
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(110, 75, 42, 0, Math.PI * 2);
      ctx.fill();
      doodle(ctx, ds[0]!, 80, 45, 60, ink, 2.6);
      ctx.font = F.mono(34, 600);
      ctx.textAlign = 'left';
      ctx.fillText(card.from.trim() || 'seseorang', 175, 70);
      ctx.font = F.mono(22);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fillText('sedang mengetik…', 175, 108);
      const bubbles = [card.to.trim() ? `${card.to.trim()}…` : 'hei', ...msg.split(/(?<=[.!?])\s+|\n+/).filter(Boolean).slice(0, 6)];
      let y = 220;
      const maxW = W * 0.72;
      for (const [i, b] of bubbles.entries()) {
        ctx.font = F.serif(i === 0 ? 40 : 36, 400);
        const lines = wrap(ctx, b, maxW - 70);
        const bw = Math.min(maxW, Math.max(...lines.map((l) => ctx.measureText(l).width)) + 70);
        const bh = lines.length * 50 + 46;
        if (y + bh > H - 300) break;
        ctx.fillStyle = '#d9fdd3';
        ctx.shadowColor = 'rgba(0,0,0,0.12)';
        ctx.shadowBlur = 6;
        roundRect(ctx, W - 60 - bw, y, bw, bh, 26);
        ctx.fill();
        ctx.shadowColor = 'transparent';
        ctx.fillStyle = '#1d2a22';
        ctx.textAlign = 'left';
        lines.forEach((l, j) => ctx.fillText(l, W - 60 - bw + 34, y + 58 + j * 50));
        ctx.font = F.mono(18);
        ctx.fillStyle = '#5c7a69';
        ctx.textAlign = 'right';
        ctx.fillText(`23.${String(10 + i * 3).padStart(2, '0')} ✓✓`, W - 84, y + bh - 14);
        y += bh + 22;
      }
      if (photo) {
        const pw = Math.min(W * 0.5, H - y - 340);
        if (pw > 200) {
          ctx.fillStyle = '#d9fdd3';
          roundRect(ctx, W - 60 - pw - 20, y, pw + 20, pw + 20, 26);
          ctx.fill();
          ctx.save();
          roundRect(ctx, W - 60 - pw - 10, y + 10, pw, pw, 20);
          ctx.clip();
          photoCover(ctx, photo, W - 60 - pw - 10, y + 10, pw, pw);
          ctx.restore();
        }
      }
      ctx.fillStyle = '#fff';
      roundRect(ctx, 40, H - 220, W - 200, 84, 42);
      ctx.fill();
      ctx.font = F.serif(30, 400, true);
      ctx.fillStyle = '#999';
      ctx.textAlign = 'left';
      ctx.fillText('balas dengan pelukan…', 80, H - 166);
      ctx.fillStyle = ink;
      ctx.beginPath();
      ctx.arc(W - 100, H - 178, 46, 0, Math.PI * 2);
      ctx.fill();
      doodle(ctx, 'hati-kecil', W - 128, H - 206, 56, '#fff', 3);
      return finish(ctx, W, H, card, 'none');
    }
    case 'film': {
      ctx.fillStyle = '#f4f1ea';
      ctx.fillRect(0, 0, W, H);
      const sx = wide ? 80 : 90;
      const sw = wide ? W * 0.42 : W - 180;
      const sh = wide ? H - 160 : H * 0.6;
      const sy = 80;
      ctx.fillStyle = '#141414';
      ctx.fillRect(sx, sy, sw, sh);
      ctx.fillStyle = '#f4f1ea';
      for (let y = sy + 20; y < sy + sh - 20; y += 50) {
        roundRect(ctx, sx + 16, y, 22, 30, 5);
        ctx.fill();
        roundRect(ctx, sx + sw - 38, y, 22, 30, 5);
        ctx.fill();
      }
      const frames = 3;
      const fh = (sh - 80) / frames - 20;
      for (let i = 0; i < frames; i++) {
        const fy = sy + 40 + i * (fh + 20);
        const fx = sx + 60;
        const fw = sw - 120;
        ctx.save();
        ctx.beginPath();
        ctx.rect(fx, fy, fw, fh);
        ctx.clip();
        if (photo) {
          ctx.filter = i === 1 ? 'none' : i === 0 ? 'sepia(0.6)' : 'grayscale(1)';
          photoCover(ctx, photo, fx - i * 20, fy, fw + 40, fh);
        } else {
          ctx.fillStyle = '#2a2a2a';
          ctx.fillRect(fx, fy, fw, fh);
          doodle(ctx, ds[i % ds.length]!, fx + fw / 2 - fh * 0.35, fy + fh * 0.15, fh * 0.7, '#e9e2cf', 2.4);
        }
        ctx.restore();
        ctx.font = F.mono(18, 600);
        ctx.fillStyle = '#e8a33d';
        ctx.textAlign = 'left';
        ctx.fillText(`${i + 1}A  SEHARI 400`, fx, fy + fh + 16);
      }
      const tx = wide ? sx + sw + 70 : 110;
      const ty = wide ? 140 : sy + sh + 90;
      const tw = wide ? W - tx - 80 : W - 220;
      ctx.font = F.display(56, 500, true);
      ctx.fillStyle = ink;
      ctx.textAlign = 'left';
      if (to) ctx.fillText(to, tx, ty);
      const t = fitText(ctx, msg, { x: tx, y: ty + 20, w: tw, h: H - ty - 200 }, (px) => F.serif(px, 400), { max: tall ? 54 : 44, min: 22, lh: 1.5, color: '#26252c' });
      ctx.font = F.hand(62);
      ctx.fillStyle = ink;
      if (from) ctx.fillText(from, tx, Math.min(H - 110, t.bottom + 70));
      break;
    }
    case 'mesintik': {
      ctx.fillStyle = '#fbfaf6';
      ctx.fillRect(0, 0, W, H);
      grain(ctx, W, H, seed, 0.05);
      ctx.strokeStyle = 'rgba(200,60,60,0.5)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(130, 0);
      ctx.lineTo(130, H);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(42,20,214,0.08)';
      ctx.lineWidth = 1.5;
      for (let y = 160; y < H; y += 52) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(W, y);
        ctx.stroke();
      }
      const r = seeded(seed);
      ctx.textAlign = 'left';
      const type = (t: string, x: number, y: number, px: number) => {
        let cx = x;
        ctx.font = F.mono(px, 500);
        for (const ch of t) {
          ctx.fillStyle = `rgba(25,25,30,${0.72 + r() * 0.28})`;
          ctx.fillText(ch, cx, y + (r() - 0.5) * 1.6);
          cx += ctx.measureText(ch).width;
        }
      };
      let y = 150;
      if (photo) {
        const pw = wide ? 360 : 380;
        ctx.save();
        ctx.translate(W - pw - 90, 70);
        ctx.rotate(0.04);
        ctx.fillStyle = '#fff';
        ctx.shadowColor = 'rgba(0,0,0,0.2)';
        ctx.shadowBlur = 18;
        ctx.fillRect(0, 0, pw, pw + 40);
        ctx.shadowColor = 'transparent';
        photoCover(ctx, photo, 12, 12, pw - 24, pw - 24);
        ctx.restore();
        tape(ctx, W - 90 - pw / 2, 72, 140, -0.08);
      }
      type(new Intl.DateTimeFormat('id-ID', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date()), 170, y - 30 + 52, 28);
      y += 104;
      if (to) type(`Kepada ${card.to.trim()} yang baik,`, 170, y, 34);
      y += 70;
      const tpx = tall ? 38 : 32;
      const lineH = tpx * 1.6;
      ctx.font = F.mono(tpx, 500);
      // Baris di samping foto lebih sempit; setelah melewati foto, penuh lagi.
      const words = msg.split(/\s+/).filter(Boolean);
      let cur = '';
      const room = () => (photo && y < 560 ? W - 170 - 520 : W - 260);
      for (const w of words) {
        const t = cur ? `${cur} ${w}` : w;
        if (ctx.measureText(t).width > room() && cur) {
          if (y > H - 220) break;
          type(cur, 170, y, tpx);
          ctx.font = F.mono(tpx, 500);
          y += lineH;
          cur = w;
        } else cur = t;
      }
      if (cur && y <= H - 220) {
        type(cur, 170, y, tpx);
        y += lineH;
      }
      y += 40;
      if (from) type(`Salam,`, 170, Math.min(H - 170, y), 32);
      ctx.font = F.hand(70);
      ctx.fillStyle = ink;
      if (from) ctx.fillText(card.from.trim(), 170, Math.min(H - 90, y + 80));
      break;
    }
    case 'boarding': {
      ctx.fillStyle = '#e9eef7';
      ctx.fillRect(0, 0, W, H);
      const m = 60;
      const bw = W - m * 2;
      const bh = H - m * 2;
      ctx.save();
      ctx.shadowColor = 'rgba(20,30,60,0.25)';
      ctx.shadowBlur = 40;
      ctx.shadowOffsetY = 18;
      ctx.fillStyle = '#fff';
      roundRect(ctx, m, m, bw, bh, 36);
      ctx.fill();
      ctx.restore();
      ctx.save();
      roundRect(ctx, m, m, bw, bh, 36);
      ctx.clip();
      ctx.fillStyle = ink;
      ctx.fillRect(m, m, bw, 150);
      ctx.restore();
      doodle(ctx, 'pesawat', m + 40, m + 30, 90, '#fff', 3);
      ctx.font = F.display(56, 700, true);
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'left';
      ctx.fillText('Sehari Air', m + 150, m + 95);
      ctx.font = F.mono(22, 600);
      ctx.textAlign = 'right';
      ctx.fillText('BOARDING PASS', m + bw - 40, m + 92);
      const col = (label: string, value: string, x: number, y: number, size = 44) => {
        ctx.textAlign = 'left';
        ctx.font = F.mono(20, 600);
        ctx.fillStyle = '#7b8193';
        ctx.fillText(label, x, y);
        ctx.font = F.mono(size, 700);
        ctx.fillStyle = '#1b2033';
        ctx.fillText(value, x, y + size + 6);
      };
      const y0 = m + 230;
      col('DARI', 'RINDU', m + 50, y0, 80);
      col('KE', 'PELUK', m + bw - 330, y0, 80);
      doodle(ctx, 'pesawat', W / 2 - 60, y0 + 20, 120, ink, 2.6);
      const y1 = y0 + 160;
      col('PENUMPANG', (card.to.trim() || 'kamu').toUpperCase(), m + 50, y1);
      col('KURSI', '1A', m + bw - 330, y1);
      col('GERBANG', '♥', m + bw - 170, y1);
      const y2 = y1 + 110;
      col('TANGGAL', new Intl.DateTimeFormat('id-ID', { day: '2-digit', month: 'short' }).format(new Date()).toUpperCase(), m + 50, y2, 36);
      col('KELAS', 'SAYANG', m + 380, y2, 36);
      col('PILOT', (card.from.trim() || '—').toUpperCase().slice(0, 12), m + bw - 330, y2, 36);
      ctx.setLineDash([14, 12]);
      ctx.strokeStyle = '#c9cfdc';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(m + 30, y2 + 90);
      ctx.lineTo(m + bw - 30, y2 + 90);
      ctx.stroke();
      ctx.setLineDash([]);
      let ty = y2 + 140;
      if (photo && !wide) {
        const ph = Math.min(380, H - ty - 380);
        if (ph > 150) {
          ctx.save();
          roundRect(ctx, m + 50, ty, bw - 100, ph, 24);
          ctx.clip();
          photoCover(ctx, photo, m + 50, ty, bw - 100, ph);
          ctx.restore();
          ty += ph + 40;
        }
      }
      ctx.font = F.mono(20, 600);
      ctx.fillStyle = '#7b8193';
      ctx.textAlign = 'left';
      ctx.fillText('PESAN DARI KOKPIT', m + 50, ty);
      const bcH = wide ? 44 : 90;
      fitText(ctx, msg, { x: m + 50, y: ty + 10, w: bw - 100, h: m + bh - ty - bcH - 100 }, (px) => F.serif(px, 400, true), { max: tall ? 54 : 42, min: 20, lh: 1.45, color: '#1b2033' });
      for (let i = 0, x = m + 50; x < m + bw - 50; i++) {
        const w = 2 + ((i * 13) % 5);
        if ((i * 7) % 4) {
          ctx.fillStyle = '#1b2033';
          ctx.fillRect(x, m + bh - bcH - 50, w, bcH);
        }
        x += w + 3;
      }
      return finish(ctx, W, H, card, 'none');
    }
    case 'senja': {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#ffe3a3');
      g.addColorStop(0.45, '#f59a6c');
      g.addColorStop(1, '#7d4a8e');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      const sunY = wide ? H * 0.46 : H * 0.42;
      const R = wide ? H * 0.3 : Math.min(W, H) * 0.3;
      const sunX = wide ? W * 0.28 : W / 2;
      ctx.save();
      ctx.beginPath();
      ctx.arc(sunX, sunY, R, 0, Math.PI * 2);
      ctx.clip();
      const sg = ctx.createLinearGradient(0, sunY - R, 0, sunY + R);
      sg.addColorStop(0, '#fff2b8');
      sg.addColorStop(1, '#ff7a59');
      ctx.fillStyle = sg;
      ctx.fillRect(0, sunY - R, W, R * 2);
      if (photo) {
        ctx.globalAlpha = 0.9;
        photoCover(ctx, photo, sunX - R, sunY - R, R * 2, R * 2);
        ctx.globalAlpha = 1;
      }
      ctx.fillStyle = 'rgba(125,74,142,0.9)';
      for (let i = 0; i < 6; i++) ctx.fillRect(sunX - R, sunY + R * 0.1 + i * R * 0.16, R * 2, R * 0.03 + i * 4);
      ctx.restore();
      ctx.fillStyle = 'rgba(70,30,80,0.55)';
      ctx.beginPath();
      ctx.moveTo(0, sunY + R * 0.9);
      for (let x = 0; x <= W; x += 40) ctx.lineTo(x, sunY + R * 0.9 + Math.sin(x / 90) * 14);
      ctx.lineTo(W, H);
      ctx.lineTo(0, H);
      ctx.fill();
      if (wide) {
        // Matahari di kiri; tulisan di kanan, di atas bayangan teks agar terbaca.
        ctx.fillStyle = 'rgba(70,30,80,0.35)';
        roundRect(ctx, W * 0.54, 90, W * 0.42, H - 180, 30);
        ctx.fill();
      }
      const tx0 = wide ? W * 0.57 : 110;
      const tw0 = wide ? W * 0.36 : W - 220;
      const ty = wide ? 190 : Math.min(sunY + R + 70, H - 300);
      const cx0 = wide ? tx0 : W / 2;
      const al: CanvasTextAlign = wide ? 'left' : 'center';
      ctx.font = F.display(52, 500, true);
      ctx.fillStyle = '#fff4df';
      ctx.textAlign = al;
      if (to) ctx.fillText(to, cx0, ty);
      const t = fitText(ctx, msg, { x: tx0, y: ty + 20, w: tw0, h: H - ty - (wide ? 260 : 170) }, (px) => F.display(px, 400), { max: tall ? 60 : 52, min: 22, lh: 1.32, align: al, color: '#fffaf0' });
      ctx.font = F.hand(60);
      ctx.fillStyle = '#ffe3a3';
      ctx.textAlign = al;
      if (from) ctx.fillText(from, cx0, Math.min(H - (wide ? 130 : 90), t.bottom + 70));
      return finish(ctx, W, H, card, 'light');
    }
    case 'struk': {
      ctx.fillStyle = '#d9d3c7';
      ctx.fillRect(0, 0, W, H);
      const rw = Math.min(W * 0.78, 760);
      const rx = (W - rw) / 2;
      const rh = Math.min(H - 100, 1500);
      const ry = (H - rh) / 2;
      const tooth = 16;
      ctx.save();
      ctx.beginPath();
      ctx.moveTo(rx, ry + tooth);
      for (let x = rx; x < rx + rw; x += tooth * 2) {
        ctx.lineTo(x + tooth, ry);
        ctx.lineTo(x + tooth * 2, ry + tooth);
      }
      ctx.lineTo(rx + rw, ry + rh - tooth);
      for (let x = rx + rw; x > rx; x -= tooth * 2) {
        ctx.lineTo(x - tooth, ry + rh);
        ctx.lineTo(x - tooth * 2, ry + rh - tooth);
      }
      ctx.closePath();
      ctx.shadowColor = 'rgba(0,0,0,0.2)';
      ctx.shadowBlur = 24;
      ctx.fillStyle = '#fdfcf8';
      ctx.fill();
      ctx.restore();
      const px = rx + 50;
      const pw = rw - 100;
      let y = ry + 110;
      const line = (l: string, r: string, f = F.mono(26)) => {
        ctx.font = f;
        ctx.fillStyle = '#1d1c22';
        ctx.textAlign = 'left';
        ctx.fillText(l, px, y);
        ctx.textAlign = 'right';
        ctx.fillText(r, px + pw, y);
        y += 44;
      };
      const dash = () => {
        ctx.setLineDash([8, 8]);
        ctx.strokeStyle = 'rgba(30,30,40,0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(px, y - 20);
        ctx.lineTo(px + pw, y - 20);
        ctx.stroke();
        ctx.setLineDash([]);
        y += 20;
      };
      ctx.font = F.mono(34, 700);
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.fillText('✦ S E H A R I ✦', rx + rw / 2, y);
      y += 50;
      ctx.font = F.mono(24);
      ctx.fillStyle = '#6b6a73';
      ctx.fillText('toko perasaan · buka 24 jam', rx + rw / 2, y);
      y += 60;
      dash();
      line('PELANGGAN', (card.to.trim() || 'kamu').toUpperCase());
      line('KASIR', (card.from.trim() || 'aku').toUpperCase());
      dash();
      const items = ['perhatian', 'tawa', 'sabar', 'pelukan'];
      for (const it of items) line(`1x ${it}`, '♥');
      dash();
      line('TOTAL', 'tak ternilai', F.mono(34, 700));
      dash();
      ctx.font = F.mono(22, 600);
      ctx.fillStyle = '#6b6a73';
      ctx.textAlign = 'left';
      ctx.fillText('CATATAN', px, y);
      const t = fitText(ctx, msg, { x: px, y: y + 10, w: pw, h: ry + rh - y - 260 }, (s) => F.mono(s), { max: 28, min: 16, lh: 1.5, color: '#1d1c22' });
      let bx = px + 40;
      for (let i = 0; bx < px + pw - 40; i++) {
        const w = 2 + ((i * 11) % 5);
        if ((i * 5) % 3) {
          ctx.fillStyle = '#1d1c22';
          ctx.fillRect(bx, Math.min(ry + rh - 230, t.bottom + 40), w, 80);
        }
        bx += w + 3;
      }
      ctx.font = F.hand(48);
      ctx.fillStyle = ink;
      ctx.textAlign = 'center';
      ctx.fillText('terima kasih sudah ada', rx + rw / 2, Math.min(ry + rh - 90, t.bottom + 180));
      return finish(ctx, W, H, card, 'none');
    }
    case 'notif': {
      const g = ctx.createLinearGradient(0, 0, W, H);
      g.addColorStop(0, '#6c7fe0');
      g.addColorStop(1, '#e08fb9');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
      if (photo) {
        ctx.globalAlpha = 0.85;
        photoCover(ctx, photo, 0, 0, W, H);
        ctx.globalAlpha = 1;
        ctx.fillStyle = 'rgba(20,20,40,0.25)';
        ctx.fillRect(0, 0, W, H);
      }
      ctx.fillStyle = '#fff';
      ctx.textAlign = 'center';
      ctx.font = F.display(wide ? 150 : 200, 300);
      const now = new Date();
      ctx.fillText(`${String(now.getHours()).padStart(2, '0')}.${String(now.getMinutes()).padStart(2, '0')}`, W / 2, wide ? 220 : tall ? 420 : 340);
      ctx.font = F.mono(30, 500);
      ctx.fillText(new Intl.DateTimeFormat('id-ID', { weekday: 'long', day: 'numeric', month: 'long' }).format(now), W / 2, wide ? 280 : tall ? 500 : 410);
      const nx = 60;
      const nw = W - 120;
      let ny = wide ? 340 : tall ? 640 : 540;
      const npx = tall ? 44 : 36;
      const nlh = npx * 1.4;
      ctx.font = F.serif(npx, 400);
      const lines = wrap(ctx, msg, nw - 80);
      const nh = 150 + Math.min(lines.length, 9) * nlh;
      ctx.fillStyle = 'rgba(255,255,255,0.82)';
      roundRect(ctx, nx, ny, nw, nh, 36);
      ctx.fill();
      ctx.fillStyle = ink;
      roundRect(ctx, nx + 36, ny + 30, 64, 64, 16);
      ctx.fill();
      doodle(ctx, 'tunas', nx + 44, ny + 38, 48, '#fff', 3);
      ctx.textAlign = 'left';
      ctx.font = F.mono(24, 600);
      ctx.fillStyle = '#333';
      ctx.fillText('SEHARI', nx + 120, ny + 58);
      ctx.font = F.mono(22);
      ctx.fillStyle = '#777';
      ctx.textAlign = 'right';
      ctx.fillText('sekarang', nx + nw - 36, ny + 58);
      ctx.textAlign = 'left';
      ctx.font = F.mono(30, 700);
      ctx.fillStyle = '#111';
      ctx.fillText(`${card.from.trim() || 'Seseorang'} → ${card.to.trim() || 'kamu'}`, nx + 120, ny + 98);
      ctx.font = F.serif(npx, 400);
      ctx.fillStyle = '#222';
      lines.slice(0, 9).forEach((l, i) => ctx.fillText(i === 8 && lines.length > 9 ? `${l}…` : l, nx + 40, ny + 160 + i * nlh));
      ny += nh + 30;
      if (ny < H - 260) {
        ctx.fillStyle = 'rgba(255,255,255,0.6)';
        roundRect(ctx, nx + 30, ny, nw - 60, 110, 30);
        ctx.fill();
        ctx.font = F.mono(24, 600);
        ctx.fillStyle = '#333';
        ctx.fillText('PENGINGAT', nx + 70, ny + 46);
        ctx.font = F.serif(30, 400);
        ctx.fillText('minum air, lalu balas pesan ini, ya.', nx + 70, ny + 86);
      }
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      roundRect(ctx, W / 2 - 140, H - 50, 280, 10, 5);
      ctx.fill();
      return finish(ctx, W, H, card, 'none');
    }
    case 'kue': {
      ctx.fillStyle = '#fff6f9';
      ctx.fillRect(0, 0, W, H);
      const r = seeded(seed);
      const colors = ['#ff8fab', '#ffd166', '#90dbf4', '#b8e0a8', ink, '#cdb4db'];
      for (let i = 0; i < 160; i++) {
        ctx.save();
        ctx.translate(r() * W, r() * H);
        ctx.rotate(r() * Math.PI);
        ctx.fillStyle = colors[i % colors.length]!;
        ctx.globalAlpha = 0.85;
        if (i % 3) ctx.fillRect(-6, -14, 12, 28);
        else {
          ctx.beginPath();
          ctx.arc(0, 0, 9, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
      }
      ctx.globalAlpha = 1;
      // bendera segitiga
      for (let i = 0; i < 9; i++) {
        const x = (i / 8) * W;
        ctx.fillStyle = colors[i % colors.length]!;
        ctx.beginPath();
        ctx.moveTo(x - 50, 40 + Math.sin(i) * 10);
        ctx.lineTo(x + 50, 40 + Math.sin(i + 1) * 10);
        ctx.lineTo(x, 140);
        ctx.fill();
      }
      ctx.strokeStyle = '#999';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(0, 40);
      for (let x = 0; x <= W; x += 30) ctx.lineTo(x, 40 + Math.sin(x / 120) * 10);
      ctx.stroke();
      let top = 230;
      if (photo) {
        const pw = wide ? 360 : W * 0.44;
        const cx = wide ? 260 : W / 2;
        const cy = wide ? H / 2 + 40 : 230 + pw / 2;
        ctx.save();
        ctx.beginPath();
        ctx.arc(cx, cy, pw / 2, 0, Math.PI * 2);
        ctx.clip();
        photoCover(ctx, photo, cx - pw / 2, cy - pw / 2, pw, pw);
        ctx.restore();
        ctx.strokeStyle = '#fff';
        ctx.lineWidth = 14;
        ctx.beginPath();
        ctx.arc(cx, cy, pw / 2, 0, Math.PI * 2);
        ctx.stroke();
        if (!wide) top = cy + pw / 2 + 80;
      } else {
        doodle(ctx, 'kue-ulang-tahun', W / 2 - 130, 190, 260, ink, 2.6);
        top = 520;
      }
      const tx = wide && photo ? 500 : 100;
      const tw = W - tx - 100;
      const al: CanvasTextAlign = wide && photo ? 'left' : 'center';
      const cx = al === 'left' ? tx : W / 2;
      ctx.fillStyle = 'rgba(255,246,249,0.86)';
      roundRect(ctx, tx - 40, top - 100, tw + 80, H - top - 20, 36);
      ctx.fill();
      const t0 = fitText(ctx, card.to.trim() ? `Hore, ${card.to.trim()}!` : 'Hore!', { x: tx, y: top - 60, w: tw, h: 120 }, (px) => F.display(px, 800, true), { max: 96, min: 50, lh: 1, align: al, color: '#e0457b' });
      const t = fitText(ctx, msg, { x: tx, y: t0.bottom + 10, w: tw, h: H - t0.bottom - 230 }, (px) => F.serif(px, 400), { max: tall ? 60 : 46, min: 22, lh: 1.5, align: al, color: '#3a2a33' });
      ctx.font = F.hand(66);
      ctx.fillStyle = ink;
      ctx.textAlign = al;
      if (from) ctx.fillText(from, cx, Math.min(H - 110, t.bottom + 80));
      break;
    }
  }
  finish(ctx, W, H, card, card.design === 'malam' ? 'light' : card.design === 'bunga' ? 'none' : 'dark');
}

/** Logo Sehari: doodle tunas + tulisan "sehari", di pojok kanan bawah. */
export function drawLogo(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, color: string, align: 'right' | 'left' | 'center' = 'right') {
  ctx.save();
  ctx.font = F.display(size, 500, true);
  const tw = ctx.measureText('sehari').width;
  const icon = size * 1.15;
  const total = icon + size * 0.25 + tw;
  const x0 = align === 'right' ? x - total : align === 'center' ? x - total / 2 : x;
  doodle(ctx, 'tunas', x0, y - icon * 0.82, icon, color, 3.2);
  ctx.fillStyle = color;
  ctx.textAlign = 'left';
  ctx.fillText('sehari', x0 + icon + size * 0.25, y);
  ctx.restore();
}

function finish(ctx: CanvasRenderingContext2D, W: number, H: number, card: GreetingCard, tone: 'dark' | 'light' | 'none') {
  if (tone === 'none') {
    // Desain yang ramai: logo di atas lencana kecil supaya tetap terbaca.
    ctx.save();
    ctx.font = F.display(36, 500, true);
    const w = ctx.measureText('sehari').width + 36 * 1.4 + 44;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    roundRect(ctx, W - 40 - w, H - 40 - 62, w, 62, 31);
    ctx.fill();
    ctx.restore();
    drawLogo(ctx, W - 40 - 22, H - 40 - 19, 36, card.ink, 'right');
    return;
  }
  drawLogo(ctx, W - 54, H - 42, 38, tone === 'light' ? 'rgba(255,248,230,0.85)' : card.ink, 'right');
}

export async function loadPhoto(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
}
