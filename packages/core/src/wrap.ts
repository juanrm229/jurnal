/**
 * Mesin Wrap berbasis aturan (tingkat privasi 1): dihitung di perangkat dari
 * isi yang sudah didekripsi. Minggu jadi adegan, bulan jadi bab, tahun jadi jilid.
 *
 * Setiap Wrap punya dua versi: lengkap untuk lingkaran, dan versi publik tanpa
 * isi pribadi (angka streak, palet mood, judul bab, lagu tema).
 */
import { type ChapterFeatures, MOODS, suggestChapterTitles } from './content/chapterTitles';
import type { CircleKind, DropKind, DropPayload, MediaRef, MoodCode, ReactionKind, SongRef } from './domain';
import { hashString } from './rituals';
import type { StreakSummary } from './streak';
import { type AuthoredText, excerpt, topWords, type WordCount } from './text';
import {
  type DayKey,
  eachDay,
  formatDayLong,
  formatMonth,
  monthRange,
  parseDay,
  weekRange,
  yearRange,
} from './time';

export type WrapScope = 'week' | 'month' | 'year' | 'moment';

export interface WrapDrop {
  id: string;
  authorId: string;
  day: DayKey;
  kind: DropKind;
  payload: DropPayload;
  reactions: { kind: ReactionKind; userId: string }[];
}

export interface WrapMember {
  userId: string;
  name: string;
}

export interface WrapInput {
  scope: WrapScope;
  /** WeekKey, MonthKey, 'YYYY', atau id lingkaran momen. */
  period: string;
  /** Untuk scope 'moment': rentang acara. */
  range?: { start: DayKey; end: DayKey };
  circle: { id: string; kind: CircleKind; name?: string };
  members: WrapMember[];
  drops: WrapDrop[];
  /** Hari tersegel per anggota dalam periode. */
  seals: Record<string, DayKey[]>;
  streak?: StreakSummary;
  chapterTitle?: string;
  genreName?: string;
  motifs?: string[];
  /** Judul bab tiap bulan untuk Tahun Kita. */
  chapterTitles?: { month: string; title: string }[];
  /** Pembaca Wrap — supaya penutup menyebut orang lain, bukan dirinya. */
  viewerId?: string;
  /** Hari ini menurut pembaca; menentukan apakah streak "saat ini" relevan. */
  today?: DayKey;
}

export type WrapCard =
  | { type: 'cover'; title: string; subtitle: string; doodle: string }
  | { type: 'stat'; label: string; value: string; note?: string; doodle: string }
  | { type: 'moment'; title: string; drop: WrapDropRef; hugs: number }
  | { type: 'song'; title: string; song: SongRef; count: number; byUserIds: string[] }
  | { type: 'palette'; title: string; moods: { mood: MoodCode; count: number; color: string; label: string }[] }
  | { type: 'photos'; title: string; items: { userId: string; dropId: string; media: MediaRef; day: DayKey }[] }
  | { type: 'words'; title: string; words: WordCount[] }
  | { type: 'places'; title: string; cities: { cityId: string; days: number }[] }
  | { type: 'streak'; title: string; current: number; longest: number; togetherDays: number; perMember: { userId: string; days: number }[] }
  | { type: 'lines'; title: string; lines: { day: DayKey; userId: string; text: string }[] }
  | { type: 'bestDay'; title: string; day: DayKey; reason: string; dropIds: string[] }
  | { type: 'roles'; title: string; items: { userId: string; role: string; reason: string }[] }
  | { type: 'chapters'; title: string; items: { month: string; title: string }[] }
  | { type: 'motif'; title: string; word: string; days: number }
  | { type: 'genre'; title: string; genre: string }
  | { type: 'playlist'; title: string; songs: (SongRef & { count: number })[] }
  | { type: 'closing'; text: string; doodle: string };

export interface WrapDropRef {
  id: string;
  userId: string;
  day: DayKey;
  kind: DropKind;
  text?: string;
  media?: MediaRef;
  song?: SongRef;
}

export interface Wrap {
  scope: WrapScope;
  period: string;
  title: string;
  label: string;
  cards: WrapCard[];
  public: PublicWrapData;
}

/** Satu-satunya bentuk Wrap yang boleh keluar dari lingkaran. Tanpa isi pribadi. */
export interface PublicWrapData {
  scope: WrapScope;
  period: string;
  label: string;
  circleKind: CircleKind;
  memberCount: number;
  sealedDays: number;
  totalDays: number;
  streak: number;
  longest: number;
  palette: { mood: MoodCode; color: string; share: number }[];
  chapterTitle?: string;
  themeSong?: { title: string; artist: string };
  genre?: string;
  /** Hari-hari tersegel (indeks dalam periode) untuk menggambar taman/titik. */
  garden: boolean[];
}

const CONTENT_KINDS: DropKind[] = ['text', 'idea', 'word', 'answer', 'card', 'expedition', 'last_line', 'prologue', 'epilogue'];

function periodRange(input: WrapInput): { start: DayKey; end: DayKey } {
  switch (input.scope) {
    case 'week':
      return weekRange(input.period);
    case 'month':
      return monthRange(input.period);
    case 'year':
      return yearRange(Number(input.period));
    case 'moment':
      return input.range!;
  }
}

function label(input: WrapInput, r: { start: DayKey; end: DayKey }): string {
  switch (input.scope) {
    case 'week':
      return `${formatDayLong(r.start, false)} – ${formatDayLong(r.end)}`;
    case 'month':
      return formatMonth(input.period);
    case 'year':
      return input.period;
    case 'moment':
      return r.start === r.end ? formatDayLong(r.start) : `${formatDayLong(r.start, false)} – ${formatDayLong(r.end)}`;
  }
}

const hugs = (d: WrapDrop) => d.reactions.filter((r) => r.kind === 'hug' || r.kind === 'here' || r.kind === 'me_too').length;

function songKey(s: SongRef): string {
  return `${s.title.toLowerCase().trim()}|${s.artist.toLowerCase().trim()}`;
}

export function songTally(drops: WrapDrop[]): (SongRef & { count: number; byUserIds: string[] })[] {
  const map = new Map<string, SongRef & { count: number; by: Set<string> }>();
  for (const d of drops) {
    const s = d.payload.song;
    if (!s) continue;
    const k = songKey(s);
    const e = map.get(k);
    if (e) {
      e.count++;
      e.by.add(d.authorId);
    } else map.set(k, { ...s, count: 1, by: new Set([d.authorId]) });
  }
  return [...map.values()]
    .map(({ by, ...s }) => ({ ...s, byUserIds: [...by] }))
    .sort((a, b) => b.count - a.count || b.byUserIds.length - a.byUserIds.length);
}

export function moodTally(drops: WrapDrop[]): { mood: MoodCode; count: number }[] {
  const map = new Map<MoodCode, number>();
  for (const d of drops) if (d.payload.mood) map.set(d.payload.mood, (map.get(d.payload.mood) ?? 0) + 1);
  return [...map.entries()].map(([mood, count]) => ({ mood, count })).sort((a, b) => b.count - a.count);
}

function texts(drops: WrapDrop[]): AuthoredText[] {
  return drops
    .filter((d) => CONTENT_KINDS.includes(d.kind) && d.payload.text)
    .map((d) => ({ authorId: d.authorId, day: d.day, text: d.payload.text! }));
}

function ref(d: WrapDrop): WrapDropRef {
  return {
    id: d.id,
    userId: d.authorId,
    day: d.day,
    kind: d.kind,
    text: d.payload.text ? excerpt(d.payload.text, 220) : undefined,
    media: d.payload.media?.[0],
    song: d.payload.song,
  };
}

/** Peran lembut untuk Tahun Kita — julukan, bukan peringkat. */
function roles(input: WrapInput): { userId: string; role: string; reason: string }[] {
  const out: { userId: string; role: string; reason: string }[] = [];
  const by = (pred: (d: WrapDrop) => boolean) => {
    const m = new Map<string, number>();
    for (const d of input.drops) if (pred(d)) m.set(d.authorId, (m.get(d.authorId) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1])[0];
  };
  const used = new Set<string>();
  const add = (entry: [string, number] | undefined, role: string, reason: (n: number) => string) => {
    if (!entry || entry[1] < 2 || used.has(entry[0])) return;
    used.add(entry[0]);
    out.push({ userId: entry[0], role, reason: reason(entry[1]) });
  };
  add(by((d) => d.payload.hour < 9 && d.kind !== 'auto'), 'Si Penjaga Pagi', (n) => `${n} kali menitipkan sesuatu sebelum jam sembilan`);
  add(by((d) => !!d.payload.song), 'Si Pembawa Lagu', (n) => `${n} lagu masuk OST lingkaran`);
  add(by((d) => d.kind === 'photo'), 'Si Pemotret Hal Kecil', (n) => `${n} foto hari biasa`);
  add(by((d) => d.kind === 'voice'), 'Si Suara Rumah', (n) => `${n} voice note`);
  add(by((d) => d.payload.hour >= 22 || d.payload.hour < 3), 'Si Penjaga Malam', (n) => `${n} kali menulis lewat jam sepuluh malam`);
  add(by((d) => d.reactions.some((r) => r.kind === 'candle' && r.userId !== d.authorId)), 'Yang Dijaga Bersama', () => 'hari-hari berat yang dilewati, tidak sendirian');
  const huggers = new Map<string, number>();
  for (const d of input.drops) for (const r of d.reactions) if (r.userId !== d.authorId) huggers.set(r.userId, (huggers.get(r.userId) ?? 0) + 1);
  add([...huggers.entries()].sort((a, b) => b[1] - a[1])[0], 'Si Pemeluk', (n) => `${n} peluk dan "aku di sini"`);
  return out;
}

function chapterFeatures(input: WrapInput, r: { start: DayKey; end: DayKey }): ChapterFeatures {
  const days = eachDay(r.start, r.end);
  const rainy = new Set(input.drops.filter((d) => d.payload.weather && ['hujan', 'gerimis', 'badai'].includes(d.payload.weather.code)).map((d) => d.day));
  const moods = moodTally(input.drops);
  const words = topWords(texts(input.drops), 1);
  const cities = new Map<string, number>();
  for (const d of input.drops) if (d.payload.cityId) cities.set(d.payload.cityId, (cities.get(d.payload.cityId) ?? 0) + 1);
  const songs = songTally(input.drops);
  const sealedAny = new Set(Object.values(input.seals).flat());
  return {
    rainyDays: rainy.size,
    totalDays: days.length,
    sealedDays: sealedAny.size,
    dominantMood: moods[0]?.mood,
    topWord: words[0]?.word,
    topCity: [...cities.entries()].sort((a, b) => b[1] - a[1])[0]?.[0],
    cities: cities.size,
    songs: songs.length,
    topSongTitle: songs[0]?.title,
    month: parseDay(r.start).month,
    hugs: input.drops.reduce((a, d) => a + hugs(d), 0),
    silentDays: new Set(input.drops.filter((d) => d.kind === 'silent').map((d) => d.day)).size,
  };
}

export function suggestTitlesFor(input: WrapInput): string[] {
  const r = periodRange(input);
  return suggestChapterTitles(chapterFeatures(input, r), hashString(`${input.circle.id}:${input.period}`));
}

export function buildWrap(input: WrapInput): Wrap {
  const r = periodRange(input);
  const days = eachDay(r.start, r.end);
  const lbl = label(input, r);
  const cards: WrapCard[] = [];
  const drops = input.drops.filter((d) => d.day >= r.start && d.day <= r.end);
  const name = (id: string) => input.members.find((m) => m.userId === id)?.name ?? 'seseorang';
  const sealedAny = new Set(Object.values(input.seals).flat().filter((d) => d >= r.start && d <= r.end));

  const titles: Record<WrapScope, string> = { week: 'Minggu Kita', month: 'Bulan Kita', year: 'Tahun Kita', moment: input.circle.name ?? 'Kapsul Momen' };
  const title = input.scope === 'month' && input.chapterTitle ? input.chapterTitle : titles[input.scope];

  const subtitle: Record<WrapScope, string> = {
    week: 'Minggu kecil yang ternyata banyak isinya.',
    month: input.chapterTitle ? `Bab ${lbl}` : `Satu bab: ${lbl}`,
    year: input.genreName ? `Jilid ${input.period} · ${input.genreName}` : `Jilid ${input.period}`,
    moment: lbl,
  };
  cards.push({ type: 'cover', title, subtitle: subtitle[input.scope], doodle: input.scope === 'year' ? 'buku' : input.scope === 'month' ? 'pena' : 'amplop' });

  // Angka-angka lembut.
  cards.push({
    type: 'stat',
    label: input.scope === 'moment' ? 'hal yang dititipkan tamu' : 'hari yang dititipkan',
    value: input.scope === 'moment' ? String(drops.length) : `${sealedAny.size}/${days.length}`,
    note: input.scope === 'moment' ? `dari ${new Set(drops.map((d) => d.authorId)).size} orang` : `${drops.length} hal kecil tersimpan`,
    doodle: 'tunas',
  });

  // Momen paling dipeluk.
  const best = [...drops].filter((d) => d.kind !== 'auto' && d.kind !== 'silent').sort((a, b) => hugs(b) - hugs(a) || (a.id < b.id ? -1 : 1))[0];
  if (best && hugs(best) > 0) {
    cards.push({ type: 'moment', title: 'Momen yang paling dipeluk', drop: ref(best), hugs: hugs(best) });
  }

  // Lagu.
  const songs = songTally(drops);
  if (songs[0]) {
    cards.push({
      type: 'song',
      title: input.scope === 'year' ? 'Lagu tema tahun ini' : input.scope === 'month' ? 'Lagu tema bulan ini' : 'Lagu yang paling sering muncul',
      song: songs[0],
      count: songs[0].count,
      byUserIds: songs[0].byUserIds,
    });
  }

  // Palet mood.
  const moods = moodTally(drops);
  if (moods.length) {
    cards.push({
      type: 'palette',
      title: input.scope === 'week' ? 'Warna minggu ini' : 'Warna hari-hari kita',
      moods: moods.map((m) => ({ ...m, color: MOODS[m.mood].color, label: MOODS[m.mood].label })),
    });
  }

  // Satu foto pilihan tiap anggota (paling dipeluk, lalu yang terbaru).
  const photoItems: { userId: string; dropId: string; media: MediaRef; day: DayKey }[] = [];
  for (const m of input.members) {
    const p = drops
      .filter((d) => d.authorId === m.userId && d.kind === 'photo' && d.payload.media?.[0])
      .sort((a, b) => hugs(b) - hugs(a) || (a.day < b.day ? 1 : -1))[0];
    if (p) photoItems.push({ userId: m.userId, dropId: p.id, media: p.payload.media![0]!, day: p.day });
  }
  if (photoItems.length) cards.push({ type: 'photos', title: 'Satu foto dari tiap orang', items: photoItems });

  if (input.scope !== 'week') {
    const words = topWords(texts(drops), 8);
    if (words.length >= 3) cards.push({ type: 'words', title: 'Kata yang paling sering ditulis', words });

    const cities = new Map<string, Set<DayKey>>();
    for (const d of drops) if (d.payload.cityId) (cities.get(d.payload.cityId) ?? cities.set(d.payload.cityId, new Set()).get(d.payload.cityId)!).add(d.day);
    if (cities.size) {
      cards.push({
        type: 'places',
        title: 'Peta tempat kita',
        cities: [...cities.entries()].map(([cityId, s]) => ({ cityId, days: s.size })).sort((a, b) => b.days - a.days),
      });
    }
  }

  if (input.streak && input.scope !== 'moment') {
    // Hari yang tersegel semua anggota dalam periode ini.
    const memberIds = input.members.map((m) => m.userId);
    const together = days.filter((d) => memberIds.length > 1 && memberIds.every((id) => (input.seals[id] ?? []).includes(d)));
    let run = 0;
    let longestInPeriod = 0;
    for (const d of days) {
      run = together.includes(d) ? run + 1 : 0;
      longestInPeriod = Math.max(longestInPeriod, run);
    }
    const isCurrent = !input.today || (input.today >= r.start && input.today <= r.end);
    cards.push({
      type: 'streak',
      title: 'Api yang kita jaga',
      current: isCurrent ? input.streak.current : run,
      longest: isCurrent ? input.streak.longest : longestInPeriod,
      togetherDays: together.length,
      perMember: input.members.map((m) => ({
        userId: m.userId,
        days: (input.seals[m.userId] ?? []).filter((d) => d >= r.start && d <= r.end).length,
      })),
    });
  }

  if (input.scope === 'year') {
    // Hari terbaik versi lingkaran: hari dengan pelukan terbanyak.
    const byDay = new Map<DayKey, WrapDrop[]>();
    for (const d of drops) (byDay.get(d.day) ?? byDay.set(d.day, []).get(d.day)!).push(d);
    const bestDay = [...byDay.entries()].sort((a, b) => b[1].reduce((s, d) => s + hugs(d), 0) - a[1].reduce((s, d) => s + hugs(d), 0))[0];
    if (bestDay) {
      cards.push({
        type: 'bestDay',
        title: 'Hari terbaik versi kita',
        day: bestDay[0],
        reason: `${bestDay[1].length} hal dititipkan dan ${bestDay[1].reduce((s, d) => s + hugs(d), 0)} pelukan`,
        dropIds: bestDay[1].map((d) => d.id),
      });
    }
    if (input.chapterTitles?.length) cards.push({ type: 'chapters', title: 'Daftar isi', items: input.chapterTitles });
    if (input.motifs?.[0]) {
      const w = input.motifs[0];
      const d = new Set(drops.filter((x) => x.payload.text?.toLowerCase().includes(w.toLowerCase())).map((x) => x.day)).size;
      cards.push({ type: 'motif', title: 'Motif utama tahun ini', word: w, days: d });
    }
    const rl = roles(input);
    if (rl.length) cards.push({ type: 'roles', title: 'Tokoh-tokoh dalam jilid ini', items: rl });
    if (songs.length > 1) cards.push({ type: 'playlist', title: 'OST Lingkaran', songs: songs.slice(0, 20) });
    if (input.genreName) cards.push({ type: 'genre', title: 'Genre tahun ini', genre: input.genreName });
  }

  if (input.scope === 'year' || input.scope === 'month') {
    const lines = drops
      .filter((d) => d.kind === 'last_line' && d.payload.text)
      .sort((a, b) => (a.day < b.day ? -1 : 1))
      .map((d) => ({ day: d.day, userId: d.authorId, text: d.payload.text! }));
    if (lines.length >= 3) {
      cards.push({
        type: 'lines',
        title: input.scope === 'year' ? 'Puisi panjang yang ditulis tanpa sadar' : 'Kalimat-kalimat terakhir',
        lines: input.scope === 'year' ? lines : lines.slice(-12),
      });
    }
  }

  const closings: Record<WrapScope, string> = {
    week: 'Sampai jumpa di adegan berikutnya.',
    month: 'Bab ini selesai. Halaman berikutnya masih kosong, dan itu kabar baik.',
    year: `Satu jilid lagi di rak kalian. Terima kasih sudah menjalani ${input.period} bersama ${input.members.length > 2 ? 'mereka' : name(input.members.find((m) => m.userId !== input.viewerId)?.userId ?? input.members[1]?.userId ?? '')}.`,
    moment: 'Acaranya selesai, kenangannya baru mulai.',
  };
  cards.push({ type: 'closing', text: closings[input.scope], doodle: 'tunas' });

  const totalMoods = moods.reduce((a, m) => a + m.count, 0) || 1;
  const pub: PublicWrapData = {
    scope: input.scope,
    period: input.period,
    label: lbl,
    circleKind: input.circle.kind,
    memberCount: input.members.length,
    sealedDays: sealedAny.size,
    totalDays: days.length,
    streak: input.streak?.current ?? 0,
    longest: input.streak?.longest ?? 0,
    palette: moods.slice(0, 6).map((m) => ({ mood: m.mood, color: MOODS[m.mood].color, share: m.count / totalMoods })),
    chapterTitle: input.scope === 'month' ? input.chapterTitle : undefined,
    themeSong: songs[0] ? { title: songs[0].title, artist: songs[0].artist } : undefined,
    genre: input.genreName,
    garden: days.map((d) => sealedAny.has(d)),
  };

  return { scope: input.scope, period: input.period, title, label: lbl, cards, public: pub };
}

/** Hapus semua yang bukan milik versi publik — dipakai juga di server sebagai validasi. */
export function sanitizePublicWrap(p: PublicWrapData): PublicWrapData {
  return {
    scope: p.scope,
    period: String(p.period).slice(0, 32),
    label: String(p.label).slice(0, 64),
    circleKind: p.circleKind,
    memberCount: Math.max(0, Math.min(400, Math.floor(p.memberCount))),
    sealedDays: Math.max(0, Math.min(366, Math.floor(p.sealedDays))),
    totalDays: Math.max(1, Math.min(366, Math.floor(p.totalDays))),
    streak: Math.max(0, Math.floor(p.streak)),
    longest: Math.max(0, Math.floor(p.longest)),
    palette: p.palette.slice(0, 6).map((x) => ({ mood: x.mood, color: /^#[0-9a-fA-F]{6}$/.test(x.color) ? x.color : '#888888', share: Math.max(0, Math.min(1, x.share)) })),
    chapterTitle: p.chapterTitle?.slice(0, 80),
    themeSong: p.themeSong ? { title: p.themeSong.title.slice(0, 80), artist: p.themeSong.artist.slice(0, 80) } : undefined,
    genre: p.genre?.slice(0, 60),
    garden: p.garden.slice(0, 366).map(Boolean),
  };
}
