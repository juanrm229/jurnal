/**
 * Hari sebagai unit utama. `DayKey` = 'YYYY-MM-DD' di zona waktu pengguna.
 * Pasangan beda kota (WIB/WITA/WIT) berbagi tanggal yang sama walau jamnya beda.
 */

export type DayKey = string; // 'YYYY-MM-DD'
export type WeekKey = string; // 'YYYY-Www' (ISO, Senin awal minggu)
export type MonthKey = string; // 'YYYY-MM'

export const INDONESIA_ZONES = [
  { tz: 'Asia/Jakarta', label: 'WIB', offsetMin: 7 * 60 },
  { tz: 'Asia/Pontianak', label: 'WIB', offsetMin: 7 * 60 },
  { tz: 'Asia/Makassar', label: 'WITA', offsetMin: 8 * 60 },
  { tz: 'Asia/Jayapura', label: 'WIT', offsetMin: 9 * 60 },
] as const;

const FIXED_OFFSETS: Record<string, number> = Object.fromEntries(
  INDONESIA_ZONES.map((z) => [z.tz, z.offsetMin]),
);

export function zoneLabel(tz: string): string {
  return INDONESIA_ZONES.find((z) => z.tz === tz)?.label ?? tz.split('/').pop()!.replace(/_/g, ' ');
}

const dtfCache = new Map<string, Intl.DateTimeFormat>();
function dtf(tz: string): Intl.DateTimeFormat {
  let f = dtfCache.get(tz);
  if (!f) {
    f = new Intl.DateTimeFormat('en-CA', {
      timeZone: tz,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hourCycle: 'h23',
    });
    dtfCache.set(tz, f);
  }
  return f;
}

export interface LocalParts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
}

/** Komponen waktu lokal di zona tertentu. Zona Indonesia memakai offset tetap (tanpa DST). */
export function localParts(tz: string, at: Date = new Date()): LocalParts {
  const fixed = FIXED_OFFSETS[tz];
  if (fixed !== undefined) {
    const d = new Date(at.getTime() + fixed * 60_000);
    return {
      year: d.getUTCFullYear(),
      month: d.getUTCMonth() + 1,
      day: d.getUTCDate(),
      hour: d.getUTCHours(),
      minute: d.getUTCMinutes(),
      second: d.getUTCSeconds(),
    };
  }
  const parts: Record<string, string> = {};
  for (const p of dtf(tz).formatToParts(at)) parts[p.type] = p.value;
  return {
    year: Number(parts.year),
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour) % 24,
    minute: Number(parts.minute),
    second: Number(parts.second),
  };
}

/** Selisih zona terhadap UTC (menit) pada saat tertentu. */
export function tzOffsetMinutes(tz: string, at: Date = new Date()): number {
  const fixed = FIXED_OFFSETS[tz];
  if (fixed !== undefined) return fixed;
  const p = localParts(tz, at);
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second);
  return Math.round((asUtc - Math.floor(at.getTime() / 1000) * 1000) / 60_000);
}

const pad = (n: number, w = 2) => String(n).padStart(w, '0');

export function dayKeyFromParts(y: number, m: number, d: number): DayKey {
  return `${pad(y, 4)}-${pad(m)}-${pad(d)}`;
}

/**
 * Hari "aktif" seorang pengguna. Sampai pukul 04.00 pagi, hari masih dihitung
 * sebagai kemarin supaya yang begadang tetap bisa menyegel harinya.
 */
export const DAY_ROLLOVER_HOUR = 4;

export function todayIn(tz: string, at: Date = new Date(), withRollover = false): DayKey {
  const p = localParts(tz, at);
  const key = dayKeyFromParts(p.year, p.month, p.day);
  if (withRollover && p.hour < DAY_ROLLOVER_HOUR) return addDays(key, -1);
  return key;
}

/** Hari yang masih boleh disegel saat ini: hari ini, dan kemarin sampai 04.00. */
export function sealableDays(tz: string, at: Date = new Date()): DayKey[] {
  const p = localParts(tz, at);
  const today = dayKeyFromParts(p.year, p.month, p.day);
  return p.hour < DAY_ROLLOVER_HOUR ? [addDays(today, -1), today] : [today];
}

export function parseDay(key: DayKey): { year: number; month: number; day: number } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key);
  if (!m) throw new Error(`DayKey tidak valid: ${key}`);
  return { year: Number(m[1]), month: Number(m[2]), day: Number(m[3]) };
}

export function isDayKey(s: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const { year, month, day } = parseDay(s);
  const d = new Date(Date.UTC(year, month - 1, day));
  return d.getUTCFullYear() === year && d.getUTCMonth() === month - 1 && d.getUTCDate() === day;
}

/** Tengah malam UTC untuk tanggal tersebut — untuk aritmetika tanggal saja. */
export function dayToUtcDate(key: DayKey): Date {
  const { year, month, day } = parseDay(key);
  return new Date(Date.UTC(year, month - 1, day));
}

export function utcDateToDay(d: Date): DayKey {
  return dayKeyFromParts(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate());
}

export function addDays(key: DayKey, n: number): DayKey {
  const d = dayToUtcDate(key);
  d.setUTCDate(d.getUTCDate() + n);
  return utcDateToDay(d);
}

export function diffDays(a: DayKey, b: DayKey): number {
  return Math.round((dayToUtcDate(a).getTime() - dayToUtcDate(b).getTime()) / 86_400_000);
}

export function compareDays(a: DayKey, b: DayKey): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function eachDay(from: DayKey, to: DayKey): DayKey[] {
  const out: DayKey[] = [];
  for (let d = from; d <= to; d = addDays(d, 1)) out.push(d);
  return out;
}

/** 0 = Minggu … 6 = Sabtu */
export function weekday(key: DayKey): number {
  return dayToUtcDate(key).getUTCDay();
}

export function isoWeek(key: DayKey): WeekKey {
  const d = dayToUtcDate(key);
  const dow = (d.getUTCDay() + 6) % 7; // Senin=0
  d.setUTCDate(d.getUTCDate() - dow + 3); // Kamis di minggu yang sama
  const year = d.getUTCFullYear();
  const week = Math.ceil(((d.getTime() - Date.UTC(year, 0, 1)) / 86_400_000 + 1) / 7);
  return `${year}-W${pad(week)}`;
}

export function weekStart(key: DayKey): DayKey {
  const dow = (weekday(key) + 6) % 7;
  return addDays(key, -dow);
}

export function weekDays(key: DayKey): DayKey[] {
  const start = weekStart(key);
  return Array.from({ length: 7 }, (_, i) => addDays(start, i));
}

export function weekRange(week: WeekKey): { start: DayKey; end: DayKey } {
  const m = /^(\d{4})-W(\d{2})$/.exec(week);
  if (!m) throw new Error(`WeekKey tidak valid: ${week}`);
  const year = Number(m[1]);
  const w = Number(m[2]);
  const jan4 = dayKeyFromParts(year, 1, 4);
  const start = addDays(weekStart(jan4), (w - 1) * 7);
  return { start, end: addDays(start, 6) };
}

export function monthKey(key: DayKey): MonthKey {
  return key.slice(0, 7);
}

export function monthRange(month: MonthKey): { start: DayKey; end: DayKey } {
  const [y, m] = month.split('-').map(Number) as [number, number];
  const start = dayKeyFromParts(y, m, 1);
  const end = utcDateToDay(new Date(Date.UTC(y, m, 0)));
  return { start, end };
}

export function prevMonth(month: MonthKey): MonthKey {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return m === 1 ? `${y - 1}-12` : `${y}-${pad(m - 1)}`;
}

export function yearRange(year: number): { start: DayKey; end: DayKey } {
  return { start: `${year}-01-01`, end: `${year}-12-31` };
}

export function daysInYear(year: number): number {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0 ? 366 : 365;
}

/** Hari ke-n dalam tahun (1-based). */
export function dayOfYear(key: DayKey): number {
  return diffDays(key, `${key.slice(0, 4)}-01-01`) + 1;
}

/** Instan UTC untuk jam lokal tertentu pada hari tertentu di zona tertentu. */
export function zonedTimeToUtc(day: DayKey, hour: number, minute: number, tz: string): Date {
  const { year, month, day: d } = parseDay(day);
  const guess = Date.UTC(year, month - 1, d, hour, minute);
  let offset = tzOffsetMinutes(tz, new Date(guess));
  let at = new Date(guess - offset * 60_000);
  const offset2 = tzOffsetMinutes(tz, at);
  if (offset2 !== offset) {
    offset = offset2;
    at = new Date(guess - offset * 60_000);
  }
  return at;
}

const BULAN = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
const BULAN_PENDEK = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
const HARI = ['minggu', 'senin', 'selasa', 'rabu', 'kamis', 'jumat', 'sabtu'];

export function monthName(m: number, short = false): string {
  return (short ? BULAN_PENDEK : BULAN)[m - 1]!;
}

export function dayName(key: DayKey): string {
  return HARI[weekday(key)]!;
}

/** "22 Oktober 2026" */
export function formatDayLong(key: DayKey, withYear = true): string {
  const { year, month, day } = parseDay(key);
  return `${day} ${monthName(month)}${withYear ? ` ${year}` : ''}`;
}

/** "22.10" seperti tampilan widget. */
export function formatDayShort(key: DayKey): string {
  const { month, day } = parseDay(key);
  return `${pad(day)}.${pad(month)}`;
}

export function formatClock(hour: number, minute: number): string {
  return `${pad(hour)}.${pad(minute)}`;
}

export function formatMonth(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number) as [number, number];
  return `${monthName(m)} ${y}`;
}

/** "Hari ini", "Kemarin", "3 hari lalu", lalu tanggal. */
export function relativeDay(key: DayKey, today: DayKey): string {
  const d = diffDays(today, key);
  if (d === 0) return 'hari ini';
  if (d === 1) return 'kemarin';
  if (d === -1) return 'besok';
  if (d > 1 && d < 7) return `${d} hari lalu`;
  return formatDayLong(key, key.slice(0, 4) !== today.slice(0, 4));
}
