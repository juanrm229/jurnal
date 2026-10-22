/**
 * Ritual harian yang deterministik: semua perangkat di lingkaran mendapat
 * pertanyaan, kartu, dan pemegang pena yang sama tanpa harus bertanya ke server.
 */
import { isFullMoonNight, isTakbiranEve, toHijri } from './astro';
import { DECKS, NIGHT_QUESTIONS } from './content';
import type { CircleFit, DailyCard, NightQuestion, RareTrigger } from './content/types';
import type { CircleKind } from './domain';
import { specialTileFor, circleDayNumber } from './streak';
import { addDays, type DayKey, diffDays, isoWeek, parseDay, type WeekKey } from './time';

export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return h >>> 0;
}

/** PRNG kecil (mulberry32) yang bisa diulang dari seed. */
export function seeded(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick<T>(items: readonly T[], seed: number): T {
  if (items.length === 0) throw new Error('pick: daftar kosong');
  return items[seed % items.length]!;
}

export function kindToFit(kind: CircleKind): CircleFit {
  return kind === 'chosen_family' ? 'keluarga_pilihan' : kind === 'moment' ? 'momen' : kind === 'duo' ? 'duo' : 'lingkaran';
}

function fits(fit: CircleFit[], kind: CircleKind): boolean {
  return fit.includes('semua') || fit.includes(kindToFit(kind));
}

// ── Pertanyaan Malam ────────────────────────────────────────────────────────

/**
 * Satu pertanyaan sama untuk semua anggota. Urutannya diacak per lingkaran
 * dan tidak berulang sampai seluruh bank habis terpakai.
 */
export function nightQuestionFor(circleId: string, day: DayKey, kind: CircleKind): NightQuestion {
  const pool = NIGHT_QUESTIONS.filter((q) => fits(q.fit, kind));
  const list = pool.length ? pool : NIGHT_QUESTIONS;
  const order = shuffled(list.length, hashString(`q:${circleId}`));
  const idx = diffDays(day, '2024-01-01');
  return list[order[((idx % list.length) + list.length) % list.length]!]!;
}

function shuffled(n: number, seed: number): number[] {
  const rnd = seeded(seed);
  const a = Array.from({ length: n }, (_, i) => i);
  for (let i = n - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j]!, a[i]!];
  }
  return a;
}

// ── Kartu Harian ────────────────────────────────────────────────────────────

export interface RareContext {
  /** Tanggal lingkaran dibuat — untuk hari jadi, hari pertama, petak istimewa. */
  circleCreatedDay?: DayKey;
  /** Ulang tahun anggota dalam format 'MM-DD'. */
  birthdays?: string[];
  /** Hujan pertama setelah kemarau (dari jejak cuaca). */
  firstRain?: boolean;
  /** Offset zona waktu pengguna (menit) untuk fase bulan. */
  tzOffsetMin?: number;
}

export function rareTriggersFor(day: DayKey, ctx: RareContext = {}): RareTrigger[] {
  const out: RareTrigger[] = [];
  const { month, day: d } = parseDay(day);
  const mmdd = day.slice(5);
  if (ctx.firstRain) out.push('hujan_pertama');
  if (ctx.circleCreatedDay) {
    if (ctx.circleCreatedDay === day) out.push('hari_pertama');
    else if (ctx.circleCreatedDay.slice(5) === mmdd) out.push('hari_jadi');
    if (specialTileFor(circleDayNumber(ctx.circleCreatedDay, day))) out.push('petak_istimewa');
  }
  if (isTakbiranEve(day)) out.push('malam_takbiran');
  if (month === 12 && d === 31) out.push('malam_tahun_baru');
  if (month === 8 && d === 17) out.push('tujuh_belas');
  if (ctx.birthdays?.includes(mmdd)) out.push('ulang_tahun');
  if (isFullMoonNight(day, ctx.tzOffsetMin ?? 420)) out.push('purnama');
  if (toHijri(day).month === 9) out.push('ramadan');
  return out;
}

export interface CardDraw {
  card: DailyCard;
  deckId: string;
  rare: boolean;
}

/**
 * Tarik satu kartu untuk pengguna pada hari tertentu. Hari istimewa selalu
 * memberi kartu langka bila ada. Dek tematik yang dimiliki ikut ke kocokan.
 */
export function dailyCardFor(opts: {
  userId: string;
  day: DayKey;
  kind: CircleKind;
  ownedDecks?: string[];
  rare?: RareContext;
}): CardDraw {
  const seed = hashString(`card:${opts.userId}:${opts.day}`);
  const owned = new Set(['dasar', ...(opts.ownedDecks ?? [])]);
  const decks = DECKS.filter((d) => owned.has(d.id));
  const triggers = rareTriggersFor(opts.day, opts.rare);

  // Kartu Ramadan dari dek Ramadan diprioritaskan selama bulan Ramadan.
  for (const t of triggers) {
    const rares = decks.flatMap((d) => d.cards.filter((c) => c.rare === t).map((c) => ({ c, d: d.id })));
    if (rares.length && t !== 'ramadan') {
      const r = pick(rares, seed);
      return { card: r.c, deckId: r.d, rare: true };
    }
  }

  const ramadanDeck = triggers.includes('ramadan') ? decks.find((d) => d.id === 'ramadan') : undefined;
  const sources = ramadanDeck ? [ramadanDeck] : decks;
  const pool = sources.flatMap((d) => d.cards.filter((c) => !c.rare && fits(c.fit, opts.kind)).map((c) => ({ c, d: d.id })));
  const fallback = DECKS[0]!.cards.filter((c) => !c.rare).map((c) => ({ c, d: DECKS[0]!.id }));
  const r = pick(pool.length ? pool : fallback, seed);
  return { card: r.c, deckId: r.d, rare: false };
}

export function findCard(cardId: string): { card: DailyCard; deckId: string } | undefined {
  for (const d of DECKS) {
    const card = d.cards.find((c) => c.id === cardId);
    if (card) return { card, deckId: d.id };
  }
  return undefined;
}

// ── Pemegang Pena ───────────────────────────────────────────────────────────

/**
 * Tiap minggu satu anggota bergiliran memegang pena. Urutan berdasarkan urutan
 * bergabung, sehingga semua orang pernah jadi narator.
 */
export function penHolderFor(memberIdsInJoinOrder: string[], week: WeekKey, circleId: string): string | undefined {
  if (memberIdsInJoinOrder.length === 0) return undefined;
  const [y, w] = week.split('-W').map(Number) as [number, number];
  const idx = y * 53 + w + (hashString(circleId) % memberIdsInJoinOrder.length);
  return memberIdsInJoinOrder[idx % memberIdsInJoinOrder.length];
}

export function penHolderToday(memberIdsInJoinOrder: string[], day: DayKey, circleId: string): string | undefined {
  return penHolderFor(memberIdsInJoinOrder, isoWeek(day), circleId);
}

// ── Halaman yang Menguning ──────────────────────────────────────────────────

/**
 * 0 = segar, 1 = kertas tua. Mulai menguning setelah 60 hari tanpa disentuh,
 * penuh setelah ~2 tahun. Dikunjungi atau diberi catatan = hidup lagi.
 */
export function yellowing(lastTouched: DayKey, today: DayKey): number {
  const age = diffDays(today, lastTouched);
  if (age <= 60) return 0;
  return Math.min(1, (age - 60) / 670);
}

// ── Setahun Lalu ────────────────────────────────────────────────────────────

/** Tanggal yang sama di tahun-tahun sebelumnya (29 Februari → 28 Februari). */
export function sameDayPreviousYears(day: DayKey, years: number): DayKey[] {
  const { year, month, day: d } = parseDay(day);
  const out: DayKey[] = [];
  for (let i = 1; i <= years; i++) {
    const y = year - i;
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const dd = month === 2 && d === 29 && !leap ? 28 : d;
    out.push(`${String(y).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(dd).padStart(2, '0')}`);
  }
  return out;
}

// ── Surat Tersesat ──────────────────────────────────────────────────────────

/** Waktu tiba acak 30–365 hari, dipilih server saat surat dikirim. */
export function lostLetterDelayDays(rnd: () => number): number {
  return 30 + Math.floor(rnd() * 336);
}

export function nextWeekday(day: DayKey, weekdayTarget: number): DayKey {
  let d = day;
  for (let i = 0; i < 7; i++) {
    if (new Date(`${d}T00:00:00Z`).getUTCDay() === weekdayTarget) return d;
    d = addDays(d, 1);
  }
  return d;
}
