/**
 * Kartu publik Wrap: satu-satunya bentuk yang boleh keluar dari lingkaran.
 * Hanya menerima `PublicWrapData` — angka streak, taman hari tersegel, palet,
 * judul bab, lagu tema. Tidak ada nama, isi, atau foto.
 *
 * Digambar langsung di <canvas> (tanpa pustaka): pratinjau dan gambar PNG
 * 1080×1920 yang dibagikan berasal dari satu fungsi gambar yang sama. Kartu
 * selalu di atas kertas terang, dengan tinta pilihan pengguna.
 */
import type { PublicWrapData } from '@sehari/core';
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
    ]).catch(() => undefined);
  }
  return fontsReady ?? Promise.resolve();
}

function gardenGrid(n: number) {
  const cols = n <= 31 ? 7 : n <= 120 ? 12 : 19;
  const cell = Math.floor(INNER / cols);
  return { cols, cell, rows: Math.ceil(n / cols) };
}

/** Gambar kartu ke kanvas pada skala tertentu (1 = 300×533). */
export async function drawPublicCard(canvas: HTMLCanvasElement, data: PublicWrapData, scale: number): Promise<void> {
  await loadFonts();
  const c = colors();
  canvas.width = Math.round(PUBLIC_CARD_W * scale);
  canvas.height = Math.round(PUBLIC_CARD_H * scale);
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(scale, 0, 0, scale, 0, 0);
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
  const gardenH = g.rows * g.cell + 6 + 13;
  const paletteH = 18;
  const songH = 32;
  const gap = Math.max(4, (PUBLIC_CARD_H - PAD * 2 - topH - streakH - gardenH - paletteH - songH) / 4);

  // ── atas: merek, periode, judul ──
  let y = PAD;
  ctx.fillStyle = c.ink;
  ctx.font = `500 12px ${MONO}`;
  spaced(ctx, 'SEHARI', PAD, y + 12, 3);
  ctx.fillStyle = c.textSoft;
  ctx.font = `400 10px ${MONO}`;
  ctx.textAlign = 'right';
  ctx.fillText(ellipsize(ctx, data.label.toLowerCase(), INNER - 90), PUBLIC_CARD_W - PAD, y + 11);
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
    const cx = PAD + (i % g.cols) * g.cell;
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
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = c.fog;
    ctx.fillRect(PAD, y, INNER, paletteH);
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
}

/** PNG 1080 px lebar, pas untuk Story. */
export async function publicCardBlob(data: PublicWrapData): Promise<Blob> {
  const canvas = document.createElement('canvas');
  await drawPublicCard(canvas, data, 1080 / PUBLIC_CARD_W);
  return new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error('Kartunya belum bisa dibuat. Coba sekali lagi.'))), 'image/png'));
}

/** Bagikan sebagai gambar bila peramban mendukung, atau unduh sebagai PNG. */
export async function sharePublicCard(data: PublicWrapData, title: string): Promise<'shared' | 'downloaded' | 'cancelled'> {
  const blob = await publicCardBlob(data);
  const name = `sehari-${data.scope}-${data.period}.png`.replace(/[^a-z0-9.-]/gi, '-');
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

export function PublicCard({ data, width = PUBLIC_CARD_W }: { data: PublicWrapData; width?: number }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    if (ref.current) void drawPublicCard(ref.current, data, (width / PUBLIC_CARD_W) * Math.min(3, window.devicePixelRatio || 1));
  }, [data, width]);
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
