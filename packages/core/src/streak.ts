/**
 * Streak Bersama: api yang dijaga berdua.
 * - Duo: hari dihitung bila kedua orang menyegel (atau memakai pembeku).
 * - Lingkaran: Api Lingkaran menyala sesuai persentase anggota yang menyegel.
 *   Satu orang bolos tidak memadamkan api, hanya meredupkannya. Hari dihitung
 *   dalam streak bila minimal separuh anggota aktif menitipkan harinya.
 * - Tidak ada "mati": hari yang terlewat menjadi kabut.
 */
import type { CircleKind } from './domain';
import { addDays, type DayKey, diffDays } from './time';

export interface StreakMember {
  userId: string;
  /** Hari pertama ia menjadi anggota. */
  joinedDay: DayKey;
  /** Hari terakhir ia menjadi anggota (keluar/dikenang); undefined = masih aktif. */
  untilDay?: DayKey;
  sealed: ReadonlySet<DayKey>;
  frozen: ReadonlySet<DayKey>;
}

export interface DayCoverage {
  day: DayKey;
  active: number;
  sealed: number;
  frozen: number;
  /** 0..1 */
  fraction: number;
  counts: boolean;
}

export const MILESTONES = [
  { days: 7, code: 'gerbang', name: 'Gerbang' },
  { days: 30, code: 'jembatan', name: 'Jembatan' },
  { days: 100, code: 'mercusuar', name: 'Mercusuar' },
  { days: 365, code: 'pelabuhan', name: 'Pelabuhan' },
] as const;

export type MilestoneCode = (typeof MILESTONES)[number]['code'];

export function threshold(kind: CircleKind): number {
  return kind === 'duo' ? 1 : 0.5;
}

export function coverageOn(day: DayKey, members: StreakMember[], kind: CircleKind): DayCoverage {
  let active = 0;
  let sealed = 0;
  let frozen = 0;
  for (const m of members) {
    if (day < m.joinedDay) continue;
    if (m.untilDay && day > m.untilDay) continue;
    active++;
    if (m.sealed.has(day)) sealed++;
    else if (m.frozen.has(day)) frozen++;
  }
  const covered = sealed + frozen;
  const fraction = active === 0 ? 0 : covered / active;
  const needed = Math.max(1, Math.ceil(active * threshold(kind) - 1e-9));
  return {
    day,
    active,
    sealed,
    frozen,
    fraction,
    // "Bersama" butuh minimal dua orang aktif, dan minimal satu segel sungguhan.
    counts: active >= 2 && covered >= needed && sealed > 0,
  };
}

export type FlameLevel = 'fog' | 'ember' | 'dim' | 'warm' | 'bright';

export function flameLevel(fraction: number, counts: boolean): FlameLevel {
  if (fraction <= 0) return 'fog';
  if (!counts) return 'ember';
  if (fraction < 0.75) return 'dim';
  if (fraction < 1) return 'warm';
  return 'bright';
}

export interface StreakSummary {
  /** Streak yang sedang berjalan (hari ini dihitung bila sudah memenuhi). */
  current: number;
  longest: number;
  /** Total hari yang tersegel bersama sepanjang waktu. */
  togetherDays: number;
  today: DayCoverage;
  /** Hari ini belum memenuhi, tapi streak kemarin masih bisa dilanjutkan. */
  pendingToday: boolean;
  flame: FlameLevel;
  /** Rata-rata keterisian 7 hari terakhir, 0..1 — "kehangatan" api. */
  warmth: number;
  /** Milestone yang sudah dicapai streak saat ini. */
  reached: MilestoneCode[];
  next?: { code: MilestoneCode; name: string; days: number; remaining: number };
}

export function streakSummary(members: StreakMember[], kind: CircleKind, today: DayKey): StreakSummary {
  const earliest = members.reduce<DayKey>((min, m) => (m.joinedDay < min ? m.joinedDay : min), today);
  const span = Math.max(0, diffDays(today, earliest));

  const cov = new Map<DayKey, DayCoverage>();
  for (let i = 0; i <= span; i++) {
    const d = addDays(earliest, i);
    cov.set(d, coverageOn(d, members, kind));
  }

  let longest = 0;
  let run = 0;
  let together = 0;
  for (let i = 0; i <= span; i++) {
    const c = cov.get(addDays(earliest, i))!;
    if (c.counts) {
      run++;
      together++;
      longest = Math.max(longest, run);
    } else if (addDays(earliest, i) !== today) {
      run = 0;
    }
  }

  const todayCov = cov.get(today) ?? coverageOn(today, members, kind);
  let current = 0;
  let cursor = todayCov.counts ? today : addDays(today, -1);
  while (cursor >= earliest && cov.get(cursor)?.counts) {
    current++;
    cursor = addDays(cursor, -1);
  }

  let warmSum = 0;
  let warmN = 0;
  for (let i = 0; i < 7; i++) {
    const c = cov.get(addDays(today, -i));
    if (c && c.active > 0) {
      warmSum += c.fraction;
      warmN++;
    }
  }

  const reached = MILESTONES.filter((m) => current >= m.days).map((m) => m.code);
  const nextM = MILESTONES.find((m) => current < m.days);

  return {
    current,
    longest,
    togetherDays: together,
    today: todayCov,
    pendingToday: !todayCov.counts && current > 0,
    flame: flameLevel(todayCov.fraction, todayCov.counts || current > 0),
    warmth: warmN ? warmSum / warmN : 0,
    reached,
    next: nextM ? { code: nextM.code, name: nextM.name, days: nextM.days, remaining: nextM.days - current } : undefined,
  };
}

/** Milestone yang baru saja tercapai karena hari `day` dihitung. */
export function milestoneReachedOn(current: number): (typeof MILESTONES)[number] | undefined {
  return MILESTONES.find((m) => m.days === current);
}

/**
 * Petak Istimewa di Papan Tahun berdasarkan umur lingkaran (hari ke-n sejak
 * dibuat), bukan panjang streak — supaya tidak ada yang "kalah".
 */
export function specialTileFor(circleDayNumber: number): (typeof MILESTONES)[number] | undefined {
  return MILESTONES.find((m) => m.days === circleDayNumber);
}

export function circleDayNumber(createdDay: DayKey, day: DayKey): number {
  return diffDays(day, createdDay) + 1;
}

/** Jumlah pembeku yang tersisa bulan ini. */
export function freezesLeft(perMonth: number, usedThisMonth: number, receivedThisMonth: number, giftedThisMonth: number): number {
  return Math.max(0, perMonth + receivedThisMonth - usedThisMonth - giftedThisMonth);
}
