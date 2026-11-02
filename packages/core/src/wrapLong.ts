/**
 * Adegan khusus Bulan Kita & Tahun Kita: grafik mood per orang, minggu-minggu
 * dalam satu halaman, kata baru bulan ini, montase dua belas bulan, perjalanan
 * kata, surat untuk tahun depan, dan bahan Film Bulan/Tahun Ini.
 */
import { MOODS } from './content/chapterTitles';
import type { MediaRef, MoodCode } from './domain';
import { contentWords, excerpt } from './text';
import { addDays, type DayKey, eachDay, isoWeek, monthName, weekRange } from './time';
import type { WrapDrop, WrapInput } from './wrap';

/** Seberapa terang sebuah mood (untuk grafik naik-turun), -2..2. */
export const MOOD_VALENCE: Record<MoodCode, number> = {
  bersemangat: 2,
  cerah: 2,
  syukur: 1.5,
  hangat: 1.5,
  tenang: 1,
  rindu: 0,
  bingung: -0.5,
  lelah: -1,
  marah: -1.5,
  sedih: -2,
};

const WARM = new Set(['hug', 'here', 'me_too', 'candle']);
const warmth = (d: WrapDrop) => d.reactions.filter((r) => WARM.has(r.kind) && r.userId !== d.authorId).length;
const isText = (d: WrapDrop) => !!d.payload.text?.trim() && d.kind !== 'auto' && d.kind !== 'sticker';
const photoOf = (d: WrapDrop) => (d.kind === 'photo' ? d.payload.media?.[0] : undefined);

export interface MoodLineScene {
  type: 'moodline';
  days: DayKey[];
  series: { userId: string; points: (number | null)[]; color?: string }[];
  /** Hari paling terang & paling berat kalian (rata-rata semua orang). */
  brightest?: DayKey;
  heaviest?: DayKey;
}

export interface WeeksScene {
  type: 'weeks';
  items: { week: string; start: DayKey; end: DayKey; count: number; hugs: number; people: number; photo?: MediaRef }[];
  best?: string;
}

export interface NewWordsScene {
  type: 'newWords';
  words: string[];
}

export interface MontageScene {
  type: 'montage';
  months: { month: string; name: string; count: number; photo?: MediaRef; line?: { text: string; userId: string } }[];
}

export interface JourneyScene {
  type: 'journey';
  early: string[];
  late: string[];
  earlyLabel: string;
  lateLabel: string;
}

export interface FutureLetterScene {
  type: 'futureLetter';
  /** Tanggal surat terbuka: malam buka kapsul tahun depan. */
  openOn: DayKey;
  year: number;
}

export interface FilmScene {
  type: 'film';
  title: string;
  label: string;
  shots: { dropId: string; media: MediaRef; userId: string; day: DayKey; caption?: string }[];
  song?: { title: string; artist: string };
}

/** Grafik mood harian per orang selama sebulan. */
export function moodLineScene(input: WrapInput, drops: WrapDrop[], start: DayKey, end: DayKey): MoodLineScene | null {
  const days = eachDay(start, end);
  const series = input.members
    .map((m) => {
      const points = days.map((d) => {
        const ms = drops.filter((x) => x.authorId === m.userId && x.day === d && x.payload.mood).map((x) => MOOD_VALENCE[x.payload.mood!]);
        return ms.length ? ms.reduce((a, b) => a + b, 0) / ms.length : null;
      });
      return { userId: m.userId, points };
    })
    .filter((s) => s.points.filter((p) => p !== null).length >= 2);
  if (!series.length) return null;
  const avg = days.map((_, i) => {
    const v = series.map((s) => s.points[i]).filter((p): p is number => p !== null);
    return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null;
  });
  let hi = -1;
  let lo = -1;
  avg.forEach((v, i) => {
    if (v === null) return;
    if (hi < 0 || v > avg[hi]!) hi = i;
    if (lo < 0 || v < avg[lo]!) lo = i;
  });
  return { type: 'moodline', days, series, brightest: hi >= 0 ? days[hi] : undefined, heaviest: lo >= 0 && lo !== hi ? days[lo] : undefined };
}

/** Pilihan foto sebuah periode: rol dulu, lalu foto paling dipeluk. */
function photoFor(drops: WrapDrop[], rollIds: string[]): { drop: WrapDrop; media: MediaRef } | undefined {
  const byId = new Map(drops.map((d) => [d.id, d]));
  for (const id of rollIds) {
    const d = byId.get(id);
    const m = d && photoOf(d);
    if (d && m) return { drop: d, media: m };
  }
  const best = drops.filter((d) => photoOf(d)).sort((a, b) => warmth(b) - warmth(a) || (a.day < b.day ? 1 : -1))[0];
  return best ? { drop: best, media: photoOf(best)! } : undefined;
}

/** Minggu-minggu dalam satu bulan. */
export function weeksScene(input: WrapInput, drops: WrapDrop[], start: DayKey, end: DayKey): WeeksScene | null {
  const weeks: string[] = [];
  for (let d = start; d <= end; d = addDays(d, 7)) if (!weeks.includes(isoWeek(d))) weeks.push(isoWeek(d));
  if (!weeks.includes(isoWeek(end))) weeks.push(isoWeek(end));
  const items = weeks.map((w) => {
    const r = weekRange(w);
    const s = r.start < start ? start : r.start;
    const e = r.end > end ? end : r.end;
    const ds = drops.filter((d) => d.day >= s && d.day <= e && d.kind !== 'auto' && d.kind !== 'sticker');
    const rollIds = (input.rolls ?? []).filter((x) => x.week === w).flatMap((x) => x.dropIds);
    return { week: w, start: s, end: e, count: ds.length, hugs: ds.reduce((a, d) => a + warmth(d), 0), people: new Set(ds.map((d) => d.authorId)).size, photo: photoFor(ds, rollIds)?.media };
  });
  if (items.filter((i) => i.count).length < 2) return null;
  const best = [...items].sort((a, b) => b.count + b.hugs * 2 + b.people * 2 - (a.count + a.hugs * 2 + a.people * 2))[0];
  return { type: 'weeks', items, best: best?.count ? best.week : undefined };
}

/** Kata yang muncul bulan ini tetapi tidak bulan lalu. */
export function newWordsScene(input: WrapInput, drops: WrapDrop[]): NewWordsScene | null {
  if (!input.previous) return null;
  const before = new Set(input.previous.drops.filter(isText).flatMap((d) => contentWords(d.payload.text!)));
  const now = new Map<string, number>();
  for (const d of drops.filter(isText)) for (const w of contentWords(d.payload.text!)) now.set(w, (now.get(w) ?? 0) + 1);
  const words = [...now.entries()]
    .filter(([w, n]) => n >= 2 && !before.has(w))
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, 10)
    .map(([w]) => w);
  return words.length >= 3 && before.size >= 5 ? { type: 'newWords', words } : null;
}

/** Montase dua belas bulan: satu foto & satu kalimat dari tiap bulan. */
export function montageScene(input: WrapInput, drops: WrapDrop[], year: string): MontageScene | null {
  const months = Array.from({ length: 12 }, (_, i) => {
    const mk = `${year}-${String(i + 1).padStart(2, '0')}`;
    const ds = drops.filter((d) => d.day.startsWith(mk));
    const rollIds = (input.rolls ?? []).filter((x) => ds.some((d) => x.dropIds.includes(d.id))).flatMap((x) => x.dropIds);
    const text = ds.filter(isText).sort((a, b) => warmth(b) - warmth(a) || b.payload.text!.length - a.payload.text!.length)[0];
    return {
      month: mk,
      name: monthName(i + 1).toLowerCase(),
      count: ds.filter((d) => d.kind !== 'auto' && d.kind !== 'sticker').length,
      photo: photoFor(ds, rollIds)?.media,
      line: text ? { text: excerpt(text.payload.text!, 90), userId: text.authorId } : undefined,
    };
  });
  return months.filter((m) => m.count).length >= 2 ? { type: 'montage', months } : null;
}

/** Perjalanan kata: kata khas awal tahun dibanding akhir tahun. */
export function journeyScene(drops: WrapDrop[]): JourneyScene | null {
  const months = [...new Set(drops.filter(isText).map((d) => d.day.slice(0, 7)))].sort();
  if (months.length < 3) return null;
  const third = Math.max(1, Math.floor(months.length / 3));
  const earlyM = months.slice(0, third);
  const lateM = months.slice(-third);
  const count = (ms: string[]) => {
    const m = new Map<string, number>();
    for (const d of drops.filter((x) => isText(x) && ms.includes(x.day.slice(0, 7)))) for (const w of contentWords(d.payload.text!)) m.set(w, (m.get(w) ?? 0) + 1);
    return m;
  };
  const a = count(earlyM);
  const b = count(lateM);
  const top = (m: Map<string, number>, other: Map<string, number>) =>
    [...m.entries()]
      .filter(([w, n]) => n >= 2 && (other.get(w) ?? 0) < n / 2)
      .sort((x, y) => y[1] - x[1])
      .slice(0, 4)
      .map(([w]) => w);
  const early = top(a, b);
  const late = top(b, a);
  if (!early.length || !late.length) return null;
  const label = (ms: string[]) => (ms.length === 1 ? monthName(Number(ms[0]!.slice(5))).toLowerCase() : `${monthName(Number(ms[0]!.slice(5))).toLowerCase()}–${monthName(Number(ms[ms.length - 1]!.slice(5))).toLowerCase()}`);
  return { type: 'journey', early, late, earlyLabel: label(earlyM), lateLabel: label(lateM) };
}

/** Bahan Film Bulan/Tahun Ini: rol dulu, lalu foto paling dipeluk. */
export function filmScene(input: WrapInput, drops: WrapDrop[], title: string, label: string, song?: { title: string; artist: string }): FilmScene | null {
  const byId = new Map(drops.map((d) => [d.id, d]));
  const picked: WrapDrop[] = [];
  const add = (d: WrapDrop | undefined) => {
    if (d && photoOf(d) && !picked.includes(d)) picked.push(d);
  };
  const limit = input.scope === 'year' ? 24 : 16;
  for (const r of input.rolls ?? []) for (const id of r.dropIds) if (picked.length < limit) add(byId.get(id));
  if (input.scope === 'year') {
    // Setidaknya satu foto dari tiap bulan yang punya foto.
    for (let i = 1; i <= 12 && picked.length < limit; i++) {
      const mk = `${input.period}-${String(i).padStart(2, '0')}`;
      if (!picked.some((d) => d.day.startsWith(mk))) add(photoFor(drops.filter((d) => d.day.startsWith(mk)), [])?.drop);
    }
  }
  for (const d of drops.filter((x) => photoOf(x)).sort((a, b) => warmth(b) - warmth(a))) if (picked.length < limit) add(d);
  if (picked.length < 3) return null;
  const shots = picked
    .sort((a, b) => (a.day < b.day ? -1 : 1))
    .map((d) => ({ dropId: d.id, media: photoOf(d)!, userId: d.authorId, day: d.day, caption: d.payload.text?.trim() ? excerpt(d.payload.text, 50) : undefined }));
  return { type: 'film', title, label, shots, song };
}

/** Warna mood untuk grafik (dipakai web). */
export const moodColor = (m: MoodCode) => MOODS[m].color;
