/**
 * Tanggal Penting: hari jadi, ulang tahun, dan tanggal-tanggal kalian sendiri.
 * Judul tanggal buatan sendiri terenkripsi untuk lingkaran; server hanya tahu
 * bulan & tanggalnya (untuk pengingat).
 */
import { type DayKey, diffDays, parseDay } from './time';

/** Kejadian berikutnya dari tanggal tahunan (29 Feb → 28 Feb di tahun biasa). */
export function nextOccurrence(month: number, day: number, today: DayKey): { date: DayKey; inDays: number; year: number } {
  const t = parseDay(today);
  const on = (y: number) => {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const d = month === 2 && day === 29 && !leap ? 28 : day;
    return `${y}-${String(month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  let y = t.year;
  if (on(y) < today) y += 1;
  return { date: on(y), inDays: diffDays(on(y), today), year: y };
}

export type ImportantKind = 'custom' | 'birthday' | 'anniversary';

export interface ImportantDate {
  key: string;
  kind: ImportantKind;
  title: string;
  month: number;
  day: number;
  /** Tahun asal (untuk "ke-N"), bila diketahui. */
  since?: number;
  /** Untuk ulang tahun: orangnya. */
  userId?: string;
  doodle: string;
}

export interface UpcomingDate extends ImportantDate {
  date: DayKey;
  inDays: number;
  /** Peringatan ke-N (hari jadi/ tanggal dengan tahun asal). */
  nth?: number;
}

/** Kumpulkan hari jadi lingkaran, ulang tahun anggota, dan tanggal sendiri; urutkan yang terdekat. */
export function upcomingDates(opts: {
  today: DayKey;
  circleCreatedDay?: DayKey;
  members?: { userId: string; name: string; birthday: string | null }[];
  custom?: { id: string; title: string; month: number; day: number; year: number | null }[];
}): UpcomingDate[] {
  const list: ImportantDate[] = [];
  if (opts.circleCreatedDay) {
    const c = parseDay(opts.circleCreatedDay);
    list.push({ key: 'hari-jadi', kind: 'anniversary', title: 'hari jadi lingkaran', month: c.month, day: c.day, since: c.year, doodle: 'kado' });
  }
  for (const m of opts.members ?? []) {
    const b = m.birthday && /^(\d{2})-(\d{2})$/.exec(m.birthday);
    if (b) list.push({ key: `ultah-${m.userId}`, kind: 'birthday', title: `ulang tahun ${m.name}`, month: Number(b[1]), day: Number(b[2]), userId: m.userId, doodle: 'kue-ulang-tahun' });
  }
  for (const d of opts.custom ?? []) {
    list.push({ key: d.id, kind: 'custom', title: d.title, month: d.month, day: d.day, since: d.year ?? undefined, doodle: 'bintang' });
  }
  return list
    .map((d) => {
      const n = nextOccurrence(d.month, d.day, opts.today);
      const nth = d.since !== undefined ? n.year - d.since : undefined;
      return { ...d, date: n.date, inDays: n.inDays, nth: nth && nth > 0 ? nth : undefined };
    })
    .filter((d) => !(d.kind === 'anniversary' && !d.nth))
    .sort((a, b) => a.inDays - b.inDays || a.title.localeCompare(b.title));
}

/** "hari ini", "besok", "lusa", "12 hari lagi". */
export function countdownText(inDays: number): string {
  if (inDays === 0) return 'hari ini';
  if (inDays === 1) return 'besok';
  if (inDays === 2) return 'lusa';
  return `${inDays} hari lagi`;
}
