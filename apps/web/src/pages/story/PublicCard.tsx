/**
 * Kartu publik Wrap: satu-satunya bentuk yang boleh keluar dari lingkaran.
 * Hanya menerima `PublicWrapData` — angka streak, taman hari tersegel, palet,
 * judul bab, lagu tema. Tidak ada nama, isi, atau foto.
 *
 * Digambar langsung di <canvas> (tanpa pustaka): pratinjau dan gambar PNG
 * 1080×1920 yang dibagikan berasal dari satu fungsi gambar yang sama. Kartu
 * selalu di atas kertas terang, dengan tinta pilihan pengguna.
 */
import { MOODS, type PublicWrapData } from '@sehari/core';
import { type Doodle as DoodleDef, gardenDoodleFor, getDoodle } from '@sehari/doodles';
import { useEffect, useRef } from 'react';
import { currentTheme, PAPERS } from '@/lib/theme';

const TITLE: Record<PublicWrapData['scope'], string> = { week: 'Minggu Kita', month: 'Bulan Kita', year: 'Tahun Kita', moment: 'Kapsul Momen' };
const KIND: Record<PublicWrapData['circleKind'], string> = { duo: 'berdua', circle: 'satu lingkaran', chosen_family: 'keluarga pilihan', moment: 'satu acara' };

export const PUBLIC_CARD_W = 300;
export const PUBLIC_CARD_H = 533;
const PAD = 20;
const INNER = PUBLIC_CARD_W - PAD * 2;

const MONO = '"IBM Plex Mono", ui-monospace, Menlo, monospace';
const HAND = 'Caveat, "Comic Sans MS", cursive';

interface Colors {
  paper: string;
  ink: string;
  text: string;
  textSoft: string;
  fog: string;
}

function mix(a: string, b: string, t: number): string {
  const pa = parseInt(a.slice(1, 7), 16);
  const pb = parseInt(b.slice(1, 7), 16);
  const ch = (s: number) => Math.round(((pa >> s) & 255) * (1 - t) + ((pb >> s) & 255) * t);
  return `#${[16, 8, 0].map((s) => ch(s).toString(16).padStart(2, '0')).join('')}`;
}

function colors(): Colors {
  const t = currentTheme();
  const paperDef = PAPERS.find((p) => p.id === t.paper);
  const paper = paperDef && !paperDef.dark ? paperDef.color : '#E6E6E8';
  const ink = /^#[0-9a-f]{6}$/i.test(t.ink) ? t.ink : '#2A14D6';
  const text = '#16161A';
  return { paper, ink, text, textSoft: mix(text, paper, 0.45), fog: mix(text, paper, 0.75) };
}

const pathCache = new Map<string, Path2D>();
const path = (d: string) => {
  let p = pathCache.get(d);
  if (!p) pathCache.set(d, (p = new Path2D(d)));
  return p;
};

function drawDoodle(ctx: CanvasRenderingContext2D, d: DoodleDef, x: number, y: number, size: number, color: string, sw = 2.4) {
  const [, , vw = 64, vh = 64] = d.viewBox.split(' ').map(Number);
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / vw, size / vh);
  ctx.strokeStyle = color;
  ctx.fillStyle = color;
  ctx.lineWidth = sw;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  for (const s of d.strokes) ctx.stroke(path(s));
  for (const f of d.fills ?? []) ctx.fill(path(f));
  ctx.restore();
}

function spaced(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, spacing: number) {
  let cx = x;
  for (const ch of text) {
    ctx.fillText(ch, cx, y);
    cx += ctx.measureText(ch).width + spacing;
  }
}

function ellipsize(ctx: CanvasRenderingContext2D, text: string, max: number): string {
  if (ctx.measureText(text).width <= max) return text;
  let s = text;
  while (s.length > 1 && ctx.measureText(`${s}…`).width > max) s = s.slice(0, -1);
  return `${s.trimEnd()}…`;
}

function wrap(ctx: CanvasRenderingContext2D, text: string, max: number, maxLines: number): string[] {
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (let i = 0; i < words.length; i++) {
    const next = cur ? `${cur} ${words[i]}` : words[i]!;
    if (ctx.measureText(next).width <= max || !cur) cur = next;
    else {
      lines.push(cur);
      cur = words[i]!;
      if (lines.length === maxLines - 1) {
        cur = words.slice(i).join(' ');
        break;
      }
    }
  }
  if (cur) lines.push(lines.length === maxLines - 1 ? ellipsize(ctx, cur, max) : cur);
  return lines.slice(0, maxLines);
}

let fontsReady: Promise<unknown> | null = null;
function loadFonts() {
  if (!fontsReady && typeof document !== 'undefined' && document.fonts) {
    fontsReady = Promise.all([
      document.fonts.load(`400 28px ${MONO}`),
      document.fonts.load(`500 12px ${MONO}`),
      document.fonts.load(`700 26px ${HAND}`),
      document.fonts.load(`500 22px ${HAND}`),
      document.fonts.load(`300 112px "Fraunces Variable"`),
      document.fonts.load(`italic 400 34px "Fraunces Variable"`),
    ]).catch(() => undefined);
  }
  return fontsReady ?? Promise.resolve();
}

function gardenGrid(n: number) {
  const cols = n <= 31 ? 7 : n <= 120 ? 12 : 25;
  const cell = Math.floor(INNER / cols);
  return { cols, cell, rows: Math.ceil(n / cols) };
}

/** Gaya "taman": kertas buku tulis, taman hari tersegel sebagai pusatnya. */
function drawTaman(ctx: CanvasRenderingContext2D, data: PublicWrapData) {
  const c = colors();
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = c.paper;
  ctx.fillRect(0, 0, PUBLIC_CARD_W, PUBLIC_CARD_H);

  // Garis buku tulis yang sangat samar.
  ctx.strokeStyle = `${c.ink}10`;
  ctx.lineWidth = 1;
  for (let y = 120; y < PUBLIC_CARD_H; y += 32) {
    ctx.beginPath();
    ctx.moveTo(0, y + 0.5);
    ctx.lineTo(PUBLIC_CARD_W, y + 0.5);
    ctx.stroke();
  }

  // ── ukur dulu supaya jarak antar-blok rata (seperti space-between) ──
  ctx.font = `700 26px ${HAND}`;
  const chapterLines = data.chapterTitle ? wrap(ctx, `“${data.chapterTitle}”`, INNER, 2) : [];
  const topH = 16 + 14 + 34 + chapterLines.length * 28 + (data.genre ? 26 : 0);
  const streakH = 70;
  const g = gardenGrid(data.garden.length);
  const paletteH = 18;
  const songH = 32;
  // Taman menyusut bila tidak muat, supaya kaki kartu tidak tertimpa.
  const room = PUBLIC_CARD_H - PAD * 2 - FOOT - topH - streakH - paletteH - songH - 4 * 8 - 19;
  g.cell = Math.max(6, Math.min(g.cell, Math.floor(room / g.rows)));
  const gx = PAD + (INNER - g.cols * g.cell) / 2;
  const gardenH = g.rows * g.cell + 6 + 13;
  const gap = Math.max(4, (PUBLIC_CARD_H - PAD * 2 - FOOT - topH - streakH - gardenH - paletteH - songH) / 4);

  // ── atas: merek, periode, judul ──
  let y = PAD;
  ctx.fillStyle = c.ink;
  ctx.font = `500 12px ${MONO}`;
  spaced(ctx, 'TAMAN KITA', PAD, y + 12, 3);
  ctx.fillStyle = c.textSoft;
  ctx.font = `400 10px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(ellipsize(ctx, data.label.toLowerCase(), INNER - 112), PUBLIC_CARD_W - PAD, y + 11);
  ctx.textAlign = 'left';
  ctx.fillStyle = c.ink;
  ctx.font = `400 28px ${MONO}`;
  ctx.fillText(TITLE[data.scope], PAD, y + 30 + 26);
  let ty = y + 64;
  ctx.fillStyle = c.text;
  ctx.font = `700 26px ${HAND}`;
  for (const l of chapterLines) {
    ctx.fillText(l, PAD, ty + 21);
    ty += 28;
  }
  if (data.genre) {
    ctx.font = `500 22px ${HAND}`;
    ctx.fillText(ellipsize(ctx, `genre: ${data.genre}`, INNER), PAD, ty + 19);
  }
  y += topH + gap;

  // ── api & angka ──
  drawDoodle(ctx, getDoodle('ui-api'), PAD, y + streakH - 46 - 6, 46, c.ink);
  ctx.fillStyle = c.ink;
  ctx.font = `400 52px ${MONO}`;
  ctx.fillText(String(data.streak), PAD + 58, y + 48);
  ctx.fillStyle = c.textSoft;
  ctx.font = `400 10px ${MONO}`;
  ctx.fillText(`hari berturut-turut · terpanjang ${data.longest}`, PAD + 58, y + 66);
  y += streakH + gap;

  // ── taman hari tersegel ──
  const n = data.garden.length;
  data.garden.forEach((sealed, i) => {
    const cx = gx + (i % g.cols) * g.cell;
    const cy = y + Math.floor(i / g.cols) * g.cell;
    if (sealed) {
      const s = g.cell * 0.92;
      drawDoodle(ctx, gardenDoodleFor(`${data.period}:${i}`), cx + (g.cell - s) / 2, cy + (g.cell - s) / 2, s, c.ink, n > 120 ? 3.2 : 2.4);
    } else {
      const s = Math.max(3, g.cell * 0.18);
      ctx.fillStyle = c.fog;
      ctx.beginPath();
      ctx.roundRect(cx + (g.cell - s) / 2, cy + (g.cell - s) / 2, s, s, Math.min(4, s / 2));
      ctx.fill();
    }
  });
  ctx.fillStyle = c.textSoft;
  ctx.font = `400 10px ${MONO}`;
  ctx.fillText(
    ellipsize(ctx, `${data.sealedDays}/${data.totalDays} hari tersegel · ${KIND[data.circleKind]}${data.circleKind === 'duo' ? '' : `, ${data.memberCount} orang`}`, INNER),
    PAD,
    y + g.rows * g.cell + 6 + 10,
  );
  y += gardenH + gap;

  // ── palet suasana ──
  ctx.save();
  ctx.beginPath();
  ctx.roundRect(PAD, y, INNER, paletteH, 9);
  ctx.clip();
  if (data.palette.length) {
    const total = data.palette.reduce((a, p) => a + Math.max(0.05, p.share), 0) || 1;
    let x = PAD;
    for (const p of data.palette) {
      const w = (Math.max(0.05, p.share) / total) * INNER;
      ctx.fillStyle = p.color;
      ctx.fillRect(x, y, w + 0.5, paletteH);
      x += w;
    }
  } else {
    // Belum ada suasana: pita tipis bergaris tinta saja.
    ctx.fillStyle = `${c.ink}14`;
    ctx.fillRect(PAD, y, INNER, paletteH);
    ctx.strokeStyle = `${c.ink}30`;
    ctx.lineWidth = 1;
    for (let x = PAD - paletteH; x < PAD + INNER; x += 7) {
      ctx.beginPath();
      ctx.moveTo(x, y + paletteH);
      ctx.lineTo(x + paletteH, y);
      ctx.stroke();
    }
  }
  ctx.restore();
  y += paletteH + gap;

  // ── lagu tema ──
  if (data.themeSong) {
    drawDoodle(ctx, getDoodle('ui-lagu'), PAD, y + 3, 26, c.ink);
    ctx.fillStyle = c.textSoft;
    ctx.font = `400 9px ${MONO}`;
    spaced(ctx, 'LAGU TEMA', PAD + 36, y + 11, 1);
    ctx.fillStyle = c.text;
    ctx.font = `500 13px ${MONO}`;
    ctx.fillText(ellipsize(ctx, `${data.themeSong.title} — ${data.themeSong.artist}`, INNER - 36), PAD + 36, y + 28);
  } else {
    ctx.fillStyle = c.text;
    ctx.font = `500 20px ${HAND}`;
    ctx.fillText('hari-hari kecil, dijalani bersama.', PAD, y + 22);
  }
  footer(ctx, c.ink, c.textSoft, `${c.ink}22`);
}

// ── bahan bersama gaya baru ───────────────────────────────────────────────

const SERIF = '"Fraunces Variable", Fraunces, Georgia, serif';
const FOOT = 26;

export type CardStyle = 'poster' | 'struk' | 'taman';
export const CARD_STYLES: { id: CardStyle; name: string }[] = [
  { id: 'poster', name: 'poster' },
  { id: 'struk', name: 'struk' },
  { id: 'taman', name: 'taman' },
];

/** Acak yang sama untuk periode yang sama: pratinjau dan PNG selalu identik. */
function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h += 0x6d2b79f5;
    let t = h;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const moodName = (m: string) => (MOODS as Record<string, { label: string }>)[m]?.label ?? m;
const pct = (x: number) => `${Math.round(x * 100)}%`;
const host = () => (typeof location !== 'undefined' ? location.host.replace(/^www\./, '') : 'sehari');
const SCOPE_WORD: Record<PublicWrapData['scope'], string> = { week: 'minggu', month: 'bulan', year: 'tahun', moment: 'acara' };

/** Ajakan kecil di kaki kartu: satu-satunya "iklan" yang ikut terbagikan. */
function footer(ctx: CanvasRenderingContext2D, color: string, soft: string, line: string) {
  const y = PUBLIC_CARD_H - PAD - 8;
  ctx.strokeStyle = line;
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(PAD, y - 16.5);
  ctx.lineTo(PUBLIC_CARD_W - PAD, y - 16.5);
  ctx.stroke();
  ctx.fillStyle = color;
  ctx.font = `500 9px ${MONO}`;
  spaced(ctx, 'SEHARI', PAD, y, 2.4);
  ctx.fillStyle = soft;
  ctx.font = `400 8.5px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(ellipsize(ctx, `jurnal kecil berdua · ${host()}`, INNER - 70), PUBLIC_CARD_W - PAD, y);
  ctx.textAlign = 'left';
}

// ── gaya "poster": aurora dari warna suasana kalian ───────────────────────

function drawPoster(ctx: CanvasRenderingContext2D, data: PublicWrapData) {
  const c = colors();
  const rand = rng(`${data.scope}:${data.period}:poster`);
  const base = mix(c.ink, '#07060d', 0.78);
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, PUBLIC_CARD_W, PUBLIC_CARD_H);
  const hues = data.palette.length ? data.palette.map((p) => p.color) : [c.ink, mix(c.ink, '#ffffff', 0.4)];
  // Gumpalan cahaya: makin besar porsi suasananya, makin besar cahayanya.
  const blobs = [...hues, ...hues].slice(0, Math.max(4, hues.length));
  blobs.forEach((col, i) => {
    const share = data.palette[i % Math.max(1, data.palette.length)]?.share ?? 0.3;
    const x = PUBLIC_CARD_W * (0.1 + rand() * 0.8);
    const y = PUBLIC_CARD_H * (0.12 + (i / blobs.length) * 0.7 + rand() * 0.1);
    const r = 120 + share * 160 + rand() * 40;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, `${col}d0`);
    g.addColorStop(0.55, `${col}55`);
    g.addColorStop(1, `${col}00`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, PUBLIC_CARD_W, PUBLIC_CARD_H);
  });
  // Gelapkan bagian bawah sedikit supaya teks tetap terbaca.
  const shade = ctx.createLinearGradient(0, PUBLIC_CARD_H * 0.45, 0, PUBLIC_CARD_H);
  shade.addColorStop(0, 'rgba(6,5,12,0)');
  shade.addColorStop(1, 'rgba(6,5,12,0.55)');
  ctx.fillStyle = shade;
  ctx.fillRect(0, 0, PUBLIC_CARD_W, PUBLIC_CARD_H);
  // Butiran film.
  for (let i = 0; i < 2600; i++) {
    ctx.fillStyle = rand() > 0.5 ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.07)';
    ctx.fillRect(rand() * PUBLIC_CARD_W, rand() * PUBLIC_CARD_H, 0.6, 0.6);
  }

  const W = '#FFFFFF';
  const soft = 'rgba(255,255,255,0.68)';
  let y = PAD;
  ctx.fillStyle = W;
  ctx.font = `500 10px ${MONO}`;
  spaced(ctx, `${TITLE[data.scope].toUpperCase()}`, PAD, y + 10, 2.2);
  ctx.fillStyle = soft;
  ctx.font = `400 9.5px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(ellipsize(ctx, data.label.toLowerCase(), INNER - 110), PUBLIC_CARD_W - PAD, y + 10);
  ctx.textAlign = 'left';

  // Judul bab sebagai poster film.
  y += 46;
  ctx.fillStyle = W;
  ctx.font = `italic 400 34px ${SERIF}`;
  const title = data.chapterTitle ?? `${SCOPE_WORD[data.scope]} kecil kita`;
  const tl = wrap(ctx, title, INNER, 3);
  for (const l of tl) {
    ctx.fillText(l, PAD, y + 28);
    y += 38;
  }
  if (data.genre) {
    ctx.fillStyle = soft;
    ctx.font = `500 20px ${HAND}`;
    ctx.fillText(ellipsize(ctx, `sebuah ${data.genre}`, INNER), PAD, y + 18);
    y += 26;
  }

  // Angka besar: hari yang benar-benar dijalani bersama.
  const numY = Math.max(y + 118, PUBLIC_CARD_H * 0.5);
  ctx.fillStyle = W;
  ctx.font = `300 112px ${SERIF}`;
  const num = String(data.sealedDays);
  ctx.fillText(num, PAD - 4, numY);
  const nw = ctx.measureText(num).width;
  ctx.font = `500 22px ${HAND}`;
  ctx.fillText('hari', PAD + nw + 6, numY - 50);
  ctx.fillText('kita tersegel', PAD + nw + 6, numY - 28);
  ctx.fillStyle = soft;
  ctx.font = `400 9.5px ${MONO}`;
  ctx.fillText(`dari ${data.totalDays} hari · api ${data.streak} · terpanjang ${data.longest}`, PAD, numY + 18);

  // Rasi bintang hari: tersegel menyala, sisanya titik redup.
  const n = data.garden.length;
  const cols = n <= 7 ? 7 : n <= 31 ? 16 : n <= 120 ? 20 : 31;
  const cell = INNER / cols;
  let gy = numY + 34;
  data.garden.forEach((sealed, i) => {
    const cx = PAD + (i % cols) * cell + cell / 2;
    const cy = gy + Math.floor(i / cols) * cell + cell / 2;
    if (sealed) {
      const s = n <= 7 ? cell * 0.62 : cell * 0.9;
      if (n <= 31) drawDoodle(ctx, gardenDoodleFor(`${data.period}:${i}`), cx - s / 2, cy - s / 2, s, W, n <= 7 ? 2.2 : 3);
      else {
        ctx.fillStyle = W;
        ctx.beginPath();
        ctx.arc(cx, cy, Math.max(1.2, cell * 0.28), 0, Math.PI * 2);
        ctx.fill();
      }
    } else {
      ctx.fillStyle = 'rgba(255,255,255,0.22)';
      ctx.beginPath();
      ctx.arc(cx, cy, Math.max(0.8, cell * 0.1), 0, Math.PI * 2);
      ctx.fill();
    }
  });
  gy += Math.ceil(n / cols) * cell + 14;

  // Suasana teratas sebagai pil kaca.
  let px = PAD;
  ctx.font = `400 9.5px ${MONO}`;
  for (const p of data.palette.slice(0, 3)) {
    const t = `${moodName(p.mood)} ${pct(p.share)}`;
    const w = ctx.measureText(t).width + 26;
    if (px + w > PUBLIC_CARD_W - PAD) break;
    ctx.fillStyle = 'rgba(255,255,255,0.14)';
    ctx.beginPath();
    ctx.roundRect(px, gy, w, 20, 10);
    ctx.fill();
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(px + 10, gy + 10, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = W;
    ctx.fillText(t, px + 18, gy + 13.5);
    px += w + 6;
  }
  gy += 30;

  // Lagu tema dengan piringan hitam kecil.
  if (data.themeSong && gy < PUBLIC_CARD_H - PAD - FOOT - 30) {
    const r = 12;
    ctx.fillStyle = '#0b0b10';
    ctx.beginPath();
    ctx.arc(PAD + r, gy + r, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.lineWidth = 0.6;
    for (const rr of [9, 6.5]) {
      ctx.beginPath();
      ctx.arc(PAD + r, gy + r, rr, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.fillStyle = hues[0]!;
    ctx.beginPath();
    ctx.arc(PAD + r, gy + r, 3.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = soft;
    ctx.font = `400 8px ${MONO}`;
    spaced(ctx, 'LAGU TEMA', PAD + 32, gy + 9, 1);
    ctx.fillStyle = W;
    ctx.font = `500 11.5px ${MONO}`;
    ctx.fillText(ellipsize(ctx, `${data.themeSong.title} — ${data.themeSong.artist}`, INNER - 34), PAD + 32, gy + 23);
    gy += 34;
  }
  const qy = PUBLIC_CARD_H - PAD - FOOT - 14;
  if (gy < qy - 16) {
    ctx.fillStyle = soft;
    ctx.font = `500 19px ${HAND}`;
    ctx.fillText('hari-hari kecil, dijalani bersama.', PAD, qy);
  }

  footer(ctx, W, soft, 'rgba(255,255,255,0.25)');
}

// ── gaya "struk": tanda terima hari-hari kalian ──────────────────────────

function drawStruk(ctx: CanvasRenderingContext2D, data: PublicWrapData) {
  // Ukur dulu di kanvas bayangan supaya kertas struk setinggi isinya.
  const probe = document.createElement('canvas').getContext('2d');
  const contentH = probe ? strukContent(probe, data, 0) : 380;
  const rh = Math.min(PUBLIC_CARD_H - 96, Math.max(300, contentH + 10));
  const ry = Math.max(30, (PUBLIC_CARD_H - FOOT - rh) / 2 - 6);
  strukPaper(ctx, data, ry, rh);
  ctx.save();
  ctx.translate(PUBLIC_CARD_W / 2, ry + rh / 2);
  ctx.rotate(-0.022);
  ctx.translate(-PUBLIC_CARD_W / 2, -(ry + rh / 2));
  strukContent(ctx, data, ry);
  ctx.restore();
  footer(ctx, '#1d1b22', '#4a4652', 'rgba(0,0,0,0.12)');
}

const STRUK_X = 34;

function strukPaper(ctx: CanvasRenderingContext2D, data: PublicWrapData, ry: number, rh: number) {
  const c = colors();
  const rand = rng(`${data.scope}:${data.period}:struk`);
  const top = data.palette[0]?.color ?? c.ink;
  const bg = ctx.createLinearGradient(0, 0, PUBLIC_CARD_W, PUBLIC_CARD_H);
  bg.addColorStop(0, mix(top, '#ffffff', 0.55));
  bg.addColorStop(1, mix(data.palette[1]?.color ?? c.ink, '#ffffff', 0.62));
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, PUBLIC_CARD_W, PUBLIC_CARD_H);

  // Kertas struk sedikit miring, tepi bergerigi.
  const rx = STRUK_X;
  const rw = PUBLIC_CARD_W - rx * 2;
  ctx.save();
  ctx.translate(PUBLIC_CARD_W / 2, ry + rh / 2);
  ctx.rotate(-0.022);
  ctx.translate(-PUBLIC_CARD_W / 2, -(ry + rh / 2));
  const tooth = 7;
  const edge = () => {
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    for (let x = rx; x < rx + rw; x += tooth) ctx.lineTo(x + tooth / 2, ry - 4), ctx.lineTo(x + tooth, ry);
    ctx.lineTo(rx + rw, ry + rh);
    for (let x = rx + rw; x > rx; x -= tooth) ctx.lineTo(x - tooth / 2, ry + rh + 4), ctx.lineTo(x - tooth, ry + rh);
    ctx.closePath();
  };
  ctx.save();
  ctx.shadowColor = 'rgba(30,20,40,0.28)';
  ctx.shadowBlur = 22;
  ctx.shadowOffsetY = 8;
  ctx.fillStyle = '#FFFEFA';
  edge();
  ctx.fill();
  ctx.restore();
  // Serat kertas.
  for (let i = 0; i < 900; i++) {
    ctx.fillStyle = 'rgba(0,0,0,0.035)';
    ctx.fillRect(rx + rand() * rw, ry + rand() * rh, 0.6, 0.6);
  }
  ctx.restore();
}

/** Isi struk; mengembalikan tinggi yang dipakai (untuk pengukuran). */
function strukContent(ctx: CanvasRenderingContext2D, data: PublicWrapData, ry: number): number {
  const rand = rng(`${data.scope}:${data.period}:barcode`);
  const rx = STRUK_X;
  const rw = PUBLIC_CARD_W - rx * 2;

  const ink = '#1d1b22';
  const soft = '#7a7682';
  const L = rx + 16;
  const R = rx + rw - 16;
  const IW = R - L;
  let y = ry + 26;
  ctx.textAlign = 'center';
  ctx.fillStyle = ink;
  ctx.font = `500 13px ${MONO}`;
  spacedCenter(ctx, 'SEHARI', PUBLIC_CARD_W / 2, y, 4);
  y += 14;
  ctx.fillStyle = soft;
  ctx.font = `400 8.5px ${MONO}`;
  ctx.fillText(`struk ${TITLE[data.scope].toLowerCase()} · ${KIND[data.circleKind]}`, PUBLIC_CARD_W / 2, y);
  y += 12;
  ctx.fillText(ellipsize(ctx, data.label.toLowerCase(), IW), PUBLIC_CARD_W / 2, y);
  ctx.textAlign = 'left';
  y += 12;

  const dash = () => {
    ctx.fillStyle = soft;
    ctx.font = `400 9px ${MONO}`;
    const unit = ctx.measureText('-').width;
    ctx.fillText('-'.repeat(Math.floor(IW / unit)), L, y);
    y += 14;
  };
  const row = (k: string, v: string, bold = false) => {
    ctx.font = `${bold ? 500 : 400} ${bold ? 10.5 : 9.5}px ${MONO}`;
    ctx.fillStyle = ink;
    const vw = ctx.measureText(v).width;
    const kk = ellipsize(ctx, k, IW - vw - 14);
    ctx.fillText(kk, L, y);
    ctx.textAlign = 'right';
    ctx.fillText(v, R, y);
    ctx.textAlign = 'left';
    const kw = ctx.measureText(kk).width;
    ctx.fillStyle = soft;
    ctx.font = `400 9px ${MONO}`;
    const dot = ctx.measureText('.').width;
    const room = R - vw - 4 - (L + kw + 4);
    if (room > dot * 2) ctx.fillText('.'.repeat(Math.floor(room / dot)), L + kw + 4, y);
    y += bold ? 16 : 14;
  };

  dash();
  if (data.chapterTitle) {
    ctx.fillStyle = ink;
    ctx.font = `700 19px ${HAND}`;
    ctx.textAlign = 'center';
    for (const l of wrap(ctx, `“${data.chapterTitle}”`, IW, 2)) {
      ctx.fillText(l, PUBLIC_CARD_W / 2, y + 4);
      y += 20;
    }
    ctx.textAlign = 'left';
    y += 4;
    dash();
  }
  row('HARI TERSEGEL', `${data.sealedDays}/${data.totalDays}`);
  row('API SEKARANG', String(data.streak));
  row('API TERPANJANG', String(data.longest));
  if (data.circleKind !== 'duo') row('ORANG', String(data.memberCount));
  for (const p of data.palette.slice(0, 4)) row(`RASA ${moodName(p.mood).toUpperCase()}`, pct(p.share));
  if (data.genre) row('GENRE', ellipsize(ctx, data.genre.toUpperCase(), IW * 0.55));
  if (data.themeSong) {
    ctx.fillStyle = ink;
    ctx.font = `400 9.5px ${MONO}`;
    ctx.fillText('LAGU TEMA', L, y);
    y += 13;
    ctx.fillStyle = soft;
    ctx.fillText(ellipsize(ctx, `♪ ${data.themeSong.title} — ${data.themeSong.artist}`, IW), L, y);
    y += 14;
  }
  dash();
  ctx.font = `500 13px ${MONO}`;
  ctx.fillStyle = ink;
  ctx.fillText('TOTAL', L, y + 4);
  ctx.textAlign = 'right';
  ctx.fillText(`${data.sealedDays} HARI BERSAMA`, R, y + 4);
  ctx.textAlign = 'left';
  y += 20;
  dash();

  // Kode batang dari hari-hari: tiap hari satu kelompok garis; hari tersegel
  // punya garis tebal di tengahnya.
  const bh = 34;
  const by = y + 2;
  // Setahun terlalu rapat untuk satu garis per hari: satukan per minggu.
  const days = data.garden;
  const weekly = days.length > 62;
  const units = weekly ? Array.from({ length: Math.ceil(days.length / 7) }, (_, w) => days.slice(w * 7, w * 7 + 7).filter(Boolean).length / 7) : days.map((d) => (d ? 1 : 0));
  const n = units.length;
  const slot = IW / Math.max(n, 1);
  ctx.fillStyle = ink;
  units.forEach((share, i) => {
    const sealed = share > 0;
    const x0 = L + i * slot;
    const thin = Math.max(0.5, Math.min(1.2, slot * 0.07));
    const lines = Math.max(1, Math.min(4, Math.floor(slot / 6)));
    for (let k = 0; k < lines; k++) {
      const fx = x0 + (slot * (k + 0.5)) / lines + (rand() - 0.5) * slot * 0.08;
      ctx.fillRect(fx, by, thin * (rand() > 0.6 ? 2 : 1), bh);
    }
    if (sealed) ctx.fillRect(x0 + slot * 0.3, by, Math.max(0.8, slot * (weekly ? 0.15 + share * 0.3 : 0.28)), bh);
  });
  ctx.fillStyle = soft;
  ctx.font = `400 7.5px ${MONO}`;
  ctx.textAlign = 'center';
  ctx.fillText(`${data.period} · ${days.map((g) => (g ? 1 : 0)).join('').slice(0, 28)}`, PUBLIC_CARD_W / 2, by + bh + 10);
  ctx.fillStyle = ink;
  ctx.font = `500 19px ${HAND}`;
  ctx.fillText('terima kasih sudah hadir,', PUBLIC_CARD_W / 2, by + bh + 34);
  ctx.fillText('setiap hari.', PUBLIC_CARD_W / 2, by + bh + 52);
  ctx.textAlign = 'left';
  return by + bh + 62 - ry;
}

function spacedCenter(ctx: CanvasRenderingContext2D, text: string, cx: number, y: number, spacing: number) {
  const align = ctx.textAlign;
  ctx.textAlign = 'left';
  let w = 0;
  for (const ch of text) w += ctx.measureText(ch).width + spacing;
  spaced(ctx, text, cx - (w - spacing) / 2, y, spacing);
  ctx.textAlign = align;
}

/** Gambar kartu ke kanvas pada skala tertentu (1 = 300×533). */
export async function drawPublicCard(canvas: HTMLCanvasElement, data: PublicWrapData, scale: number, style: CardStyle = 'poster'): Promise<void> {
  await loadFonts();
  canvas.width = Math.round(PUBLIC_CARD_W * scale);
  canvas.height = Math.round(PUBLIC_CARD_H * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
  ctx.textBaseline = 'alphabetic';
  ctx.textAlign = 'left';
  if (style === 'struk') drawStruk(ctx, data);
  else if (style === 'taman') drawTaman(ctx, data);
  else drawPoster(ctx, data);
}

/** PNG 1080 px lebar, pas untuk Story. */
export async function publicCardBlob(data: PublicWrapData, style: CardStyle = 'poster'): Promise<Blob> {
  const canvas = document.createElement('canvas');
  await drawPublicCard(canvas, data, 1080 / PUBLIC_CARD_W, style);
  return new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Kartunya belum bisa dibuat. Coba sekali lagi.'))), 'image/png'));
}

/** Bagikan sebagai gambar bila peramban mendukung, atau unduh sebagai PNG. */
export async function sharePublicCard(data: PublicWrapData, title: string, style: CardStyle = 'poster'): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await publicCardBlob(data, style);
  const name = `sehari-${data.scope}-${data.period}-${style}.png`.replace(/[^a-z0-9.-]/gi, '-');
  const file = new File([blob], name, { type: 'image/png' });
  if (navigator.canShare?.({ files: [file] })) {
    try {
      await navigator.share({ files: [file], title });
      return 'shared';
    } catch (e) {
      if ((e as Error).name === 'AbortError') return 'cancelled';
    }
  }
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  return 'downloaded';
}

export function PublicCard({ data, width = PUBLIC_CARD_W, style = 'poster' }: { data: PublicWrapData; width?: number; style?: CardStyle }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) void drawPublicCard(ref.current, data, (width / PUBLIC_CARD_W) * Math.min(3, window.devicePixelRatio || 1), style);
  }, [data, width, style]);
  return (
    <canvas
      ref={ref}
      data-testid="public-card"
      role="img"
      aria-label={`kartu publik ${TITLE[data.scope]} ${data.label}: ${data.streak} hari berturut-turut, ${data.sealedDays} dari ${data.totalDays} hari tersegel`}
      className="public-card"
      style={{ width, height: (width * PUBLIC_CARD_H) / PUBLIC_CARD_W }}
    />
  );
}
