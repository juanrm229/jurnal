/**
 * Kartu ucapan yang digambar di canvas: beberapa desain (surat, polaroid,
 * kartu pos, malam berbintang, sticky note, bingkai bunga, tiket), dengan
 * foto opsional dan doodle. Hasilnya PNG 1080px untuk diunduh atau dikirim.
 */
import { getDoodle, getScene } from '@sehari/doodles';

export type CardDesign = 'surat' | 'polaroid' | 'pos' | 'malam' | 'sticky' | 'bunga' | 'tiket';
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
  }
  // cap kecil merek
  ctx.font = F.mono(20);
  ctx.fillStyle = card.design === 'malam' ? 'rgba(233,217,168,0.55)' : 'rgba(40,40,60,0.4)';
  ctx.textAlign = 'right';
  ctx.fillText('dibuat dengan sehari', W - 60, H - 34);
}

export async function loadPhoto(file: File): Promise<ImageBitmap> {
  return createImageBitmap(file, { imageOrientation: 'from-image' } as ImageBitmapOptions);
}
