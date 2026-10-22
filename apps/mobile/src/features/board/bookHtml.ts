/**
 * Isi buku cetak "Tahun Kita" sebagai HTML. Dibangun di perangkat dari isi yang
 * sudah didekripsi; hasilnya hanya dikirim ke percetakan setelah persetujuan
 * eksplisit (bagian ini memang tidak lagi end-to-end).
 */
import {
  type ChapterWire,
  type DropWire,
  formatClock,
  formatDayLong,
  formatMonth,
  type Genre,
  type Keyring,
  monthKey,
  openEnvelope,
  type VolumeWire,
} from '@sehari/core';
import { api } from '@/lib/api';
import { type CircleView, openCircleText, openDrop } from '@/lib/data';
import { genreById, nameIn } from './shared';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const KIND_NOTE: Partial<Record<string, string>> = {
  photo: 'foto',
  screenshot: 'tangkapan layar',
  video: 'video',
  voice: 'voice note',
  song: 'lagu',
  mood: 'warna hari ini',
};

export interface BookEntry {
  author: string;
  time: string;
  kind: string;
  text: string;
  note?: string;
  footnotes: string[];
}

export interface BookInput {
  circleName: string;
  year: number;
  genre?: Genre;
  members: string[];
  chapters: Record<string, string>;
  days: { day: string; entries: BookEntry[]; lastLines: { author: string; text: string }[] }[];
}

/** Ambil & buka semua yang dibutuhkan buku satu jilid. */
export async function collectBook(circle: CircleView, year: number, ring: Keyring, meId: string): Promise<BookInput> {
  const [range, chapters, volumes] = await Promise.all([
    api.get<{ drops: DropWire[] }>(`/circles/${circle.id}/drops?from=${year}-01-01&to=${year}-12-31`),
    api.get<ChapterWire[]>(`/circles/${circle.id}/chapters`),
    api.get<VolumeWire[]>(`/circles/${circle.id}/volumes`),
  ]);
  const name = (u: string) => (u === meId ? (circle.me?.penName ?? 'aku') : nameIn(circle, u, meId));
  const byDay = new Map<string, BookInput['days'][number]>();
  const opened = range.drops
    .filter((w) => w.kind !== 'silent' && w.kind !== 'auto' && w.audience !== 'self')
    .map((w) => openDrop(w, ring))
    .filter((d) => d.payload)
    .sort((a, b) => (a.wire.day < b.wire.day ? -1 : a.wire.day > b.wire.day ? 1 : a.payload!.hour * 60 + a.payload!.minute - (b.payload!.hour * 60 + b.payload!.minute)));
  for (const d of opened) {
    const p = d.payload!;
    const day = byDay.get(d.wire.day) ?? byDay.set(d.wire.day, { day: d.wire.day, entries: [], lastLines: [] }).get(d.wire.day)!;
    if (d.wire.kind === 'last_line') {
      if (p.text) day.lastLines.push({ author: name(d.wire.authorId), text: p.text });
      continue;
    }
    const footnotes = d.wire.footnotes
      .filter((f) => f.includeInPrint)
      .map((f) => {
        try {
          return `${name(f.authorId)}: ${openEnvelope<{ text: string }>(f.envelope as never, ring).text}`;
        } catch {
          return '';
        }
      })
      .filter(Boolean);
    const note = p.song ? `${p.song.title} — ${p.song.artist}` : KIND_NOTE[d.wire.kind];
    if (!p.text && !note) continue;
    day.entries.push({ author: name(d.wire.authorId), time: formatClock(p.hour, p.minute), kind: d.wire.kind, text: p.text ?? '', note, footnotes });
  }
  const titles: Record<string, string> = {};
  for (const ch of chapters) if (ch.titleEnc && ch.month.startsWith(`${year}-`)) titles[ch.month] = openCircleText(circle, ch.titleEnc, '');
  return {
    circleName: circle.name,
    year,
    genre: genreById(volumes.find((v) => v.year === year)?.genreId),
    members: circle.members.filter((m) => m.state !== 'left').map((m) => m.penName),
    chapters: titles,
    days: [...byDay.values()],
  };
}

export function buildBookHtml(b: BookInput): string {
  const months = new Map<string, BookInput['days']>();
  for (const d of b.days) (months.get(monthKey(d.day)) ?? months.set(monthKey(d.day), []).get(monthKey(d.day))!).push(d);
  const allLines = b.days.flatMap((d) => d.lastLines.map((l) => ({ ...l, day: d.day })));
  let fn = 0;
  const notes: string[] = [];

  const chaptersHtml = [...months.entries()]
    .map(([m, days]) => {
      const title = b.chapters[m];
      const daysHtml = days
        .map((d) => {
          const entries = d.entries
            .map((e) => {
              const refs = e.footnotes.map((t) => {
                fn++;
                notes.push(`<li value="${fn}">${esc(t)}</li>`);
                return `<sup>${fn}</sup>`;
              });
              return `<div class="entry"><div class="meta">${esc(e.author)} · ${esc(e.time)}${e.note ? ` · <em>${esc(e.note)}</em>` : ''}</div>${e.text ? `<p>${esc(e.text)}${refs.join('')}</p>` : refs.join('')}</div>`;
            })
            .join('');
          const lines = d.lastLines.map((l) => `<p class="last">${esc(l.text)} <span>— ${esc(l.author)}</span></p>`).join('');
          return `<section class="day"><h3>${esc(formatDayLong(d.day))}</h3>${entries}${lines}</section>`;
        })
        .join('');
      return `<article class="chapter"><div class="ch-label">Bab · ${esc(formatMonth(m))}</div><h2>${esc(title || formatMonth(m))}</h2>${daysHtml}</article>`;
    })
    .join('');

  const toc = [...months.keys()].map((m) => `<li><span>${esc(formatMonth(m))}</span> ${esc(b.chapters[m] || '')}</li>`).join('');
  const poem = allLines.length ? `<article class="chapter poem"><h2>Kalimat Terakhir</h2><div class="ch-label">puisi panjang yang ditulis tanpa sadar</div>${allLines.map((l) => `<p class="last">${esc(l.text)}</p>`).join('')}</article>` : '';

  return `<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(b.circleName)} · ${b.year}</title>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500&family=IBM+Plex+Mono:wght@400;500&display=swap">
<style>
@page { size: A5; margin: 18mm 15mm; }
body { font-family: 'IBM Plex Mono', 'Courier New', monospace; color: #16161A; font-size: 10.5pt; line-height: 1.55; }
.cover { height: 170mm; display: flex; flex-direction: column; justify-content: center; text-align: center; page-break-after: always; border: 1px solid #2A14D6; padding: 12mm; }
.cover h1 { font-size: 24pt; color: #2A14D6; margin: 0 0 6mm; font-weight: 400; }
.cover .genre { font-style: italic; }
.toc { page-break-after: always; } .toc li { margin: 2mm 0; list-style: none; } .toc span { display: inline-block; width: 38mm; color: #6E6E78; }
.chapter { page-break-before: always; }
.ch-label { color: #6E6E78; font-size: 8.5pt; letter-spacing: 1px; text-transform: lowercase; }
h2 { font-weight: 400; font-size: 17pt; color: #2A14D6; margin: 2mm 0 8mm; }
h3 { font-size: 10pt; font-weight: 500; border-bottom: 0.5px solid #A9A4E8; padding-bottom: 1mm; margin: 7mm 0 3mm; }
.day { page-break-inside: avoid; }
.entry { margin: 0 0 3mm; } .entry p { margin: 1mm 0 0; white-space: pre-wrap; }
.meta { font-size: 8pt; color: #6E6E78; }
.last { font-family: 'Caveat', cursive, serif; font-size: 13pt; color: #2A14D6; margin: 1.5mm 0; } .last span { font-size: 8pt; color: #6E6E78; font-family: 'IBM Plex Mono', monospace; }
sup { color: #2A14D6; font-size: 7pt; }
.notes { page-break-before: always; font-size: 8.5pt; }
</style></head><body>
<div class="cover"><div class="ch-label">jilid ${b.year}</div><h1>${esc(b.circleName)}</h1>${b.genre ? `<div class="genre">${esc(b.genre.name)}</div><p>${esc(b.genre.blurb)}</p>` : ''}<p style="margin-top:12mm">${esc(b.members.join(' · '))}</p></div>
<div class="toc"><h2>Daftar Isi</h2><ul>${toc}${allLines.length ? '<li><span>penutup</span> Kalimat Terakhir</li>' : ''}</ul></div>
${chaptersHtml || '<p>Belum ada halaman di jilid ini.</p>'}
${poem}
${notes.length ? `<div class="notes"><h2>Catatan Kaki</h2><ol>${notes.join('')}</ol></div>` : ''}
</body></html>`;
}
