/**
 * Hitungan langit untuk lapisan puitis:
 * - Segel Saat Senja: jam matahari terbenam di kota pengguna (algoritma NOAA).
 * - Kartu langka "purnama" & token bulan: fase bulan.
 * - Musim Bersama: kalender Hijriah tabular (Ramadan, Syawal, Dzulhijjah).
 *
 * Catatan: tanggal resmi Ramadan/Idulfitri di Indonesia ditetapkan sidang isbat
 * dan bisa bergeser sehari dari kalender tabular. Server menyediakan override.
 */
import { addDays, type DayKey, dayKeyFromParts, dayToUtcDate, parseDay } from './time';

const RAD = Math.PI / 180;

/**
 * Waktu matahari terbenam (UTC) untuk tanggal & lokasi. Akurat ±1–2 menit,
 * cukup untuk pengingat menyegel. Mengembalikan null di lintang ekstrem.
 */
export function sunsetUtc(day: DayKey, lat: number, lon: number): Date | null {
  return sunEventUtc(day, lat, lon, false);
}

export function sunriseUtc(day: DayKey, lat: number, lon: number): Date | null {
  return sunEventUtc(day, lat, lon, true);
}

function sunEventUtc(day: DayKey, lat: number, lon: number, rising: boolean): Date | null {
  const { year, month, day: d } = parseDay(day);
  const start = Date.UTC(year, 0, 0);
  const n = Math.floor((Date.UTC(year, month - 1, d) - start) / 86_400_000);
  const zenith = 90.833;
  const lngHour = lon / 15;
  const t = n + ((rising ? 6 : 18) - lngHour) / 24;
  const M = 0.9856 * t - 3.289;
  let L = M + 1.916 * Math.sin(M * RAD) + 0.02 * Math.sin(2 * M * RAD) + 282.634;
  L = ((L % 360) + 360) % 360;
  let RA = Math.atan(0.91764 * Math.tan(L * RAD)) / RAD;
  RA = ((RA % 360) + 360) % 360;
  RA += Math.floor(L / 90) * 90 - Math.floor(RA / 90) * 90;
  RA /= 15;
  const sinDec = 0.39782 * Math.sin(L * RAD);
  const cosDec = Math.cos(Math.asin(sinDec));
  const cosH = (Math.cos(zenith * RAD) - sinDec * Math.sin(lat * RAD)) / (cosDec * Math.cos(lat * RAD));
  if (cosH > 1 || cosH < -1) return null;
  let H = rising ? 360 - Math.acos(cosH) / RAD : Math.acos(cosH) / RAD;
  H /= 15;
  const T = H + RA - 0.06571 * t - 6.622;
  let UT = T - lngHour;
  UT = ((UT % 24) + 24) % 24;
  // Untuk bujur timur (Indonesia), terbenam bisa jatuh di hari UTC yang sama
  // atau sebelumnya; pilih instan yang paling dekat dengan tengah hari lokal.
  const localNoonUtc = Date.UTC(year, month - 1, d, 12) - lngHour * 3_600_000;
  let ms = Date.UTC(year, month - 1, d) + UT * 3_600_000;
  while (ms - localNoonUtc > 12 * 3_600_000) ms -= 86_400_000;
  while (localNoonUtc - ms > 12 * 3_600_000) ms += 86_400_000;
  return new Date(ms);
}

// ── Bulan ───────────────────────────────────────────────────────────────────

const SYNODIC = 29.530588853;
const KNOWN_NEW_MOON = Date.UTC(2000, 0, 6, 18, 14); // bulan baru referensi

/** Umur bulan dalam hari (0 = bulan baru, ~14.77 = purnama). */
export function moonAge(at: Date): number {
  const days = (at.getTime() - KNOWN_NEW_MOON) / 86_400_000;
  return ((days % SYNODIC) + SYNODIC) % SYNODIC;
}

/** 0..1, 0.5 = purnama. */
export function moonPhase(at: Date): number {
  return moonAge(at) / SYNODIC;
}

/** Malam purnama: umur bulan dalam ±1 hari dari puncak, dicek pukul 21.00 lokal. */
export function isFullMoonNight(day: DayKey, tzOffsetMin = 7 * 60): boolean {
  const at = new Date(dayToUtcDate(day).getTime() + (21 * 60 - tzOffsetMin) * 60_000);
  return Math.abs(moonAge(at) - SYNODIC / 2) <= 1.0;
}

// ── Hijriah tabular ─────────────────────────────────────────────────────────

export interface HijriDate {
  year: number;
  month: number; // 1 = Muharram … 9 = Ramadan, 10 = Syawal, 12 = Dzulhijjah
  day: number;
}

export const HIJRI_MONTHS = [
  'Muharram',
  'Safar',
  'Rabiulawal',
  'Rabiulakhir',
  'Jumadilawal',
  'Jumadilakhir',
  'Rajab',
  'Syakban',
  'Ramadan',
  'Syawal',
  'Zulkaidah',
  'Zulhijah',
];

function gregorianToJd(y: number, m: number, d: number): number {
  const a = Math.floor((14 - m) / 12);
  const yy = y + 4800 - a;
  const mm = m + 12 * a - 3;
  return d + Math.floor((153 * mm + 2) / 5) + 365 * yy + Math.floor(yy / 4) - Math.floor(yy / 100) + Math.floor(yy / 400) - 32045;
}

function jdToGregorian(jd: number): { year: number; month: number; day: number } {
  const a = jd + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    day: e - Math.floor((153 * m + 2) / 5) + 1,
    month: m + 3 - 12 * Math.floor(m / 10),
    year: 100 * b + d - 4800 + Math.floor(m / 10),
  };
}

const HIJRI_EPOCH_JD = 1948440; // 1 Muharram 1 H (tabular, epoch Kamis)

export function toHijri(day: DayKey): HijriDate {
  const { year, month, day: d } = parseDay(day);
  const jd = gregorianToJd(year, month, d);
  let hy = Math.floor((30 * (jd - HIJRI_EPOCH_JD) + 10646) / 10631);
  if (jd < hijriToJd(hy, 1, 1)) hy--;
  if (jd >= hijriToJd(hy + 1, 1, 1)) hy++;
  let hm = 1;
  while (hm < 12 && jd >= hijriToJd(hy, hm + 1, 1)) hm++;
  const hd = jd - hijriToJd(hy, hm, 1) + 1;
  return { year: hy, month: hm, day: hd };
}

function hijriToJd(y: number, m: number, d: number): number {
  return d + Math.ceil(29.5 * (m - 1)) + (y - 1) * 354 + Math.floor((3 + 11 * y) / 30) + HIJRI_EPOCH_JD - 1;
}

export function fromHijri(h: HijriDate): DayKey {
  const g = jdToGregorian(hijriToJd(h.year, h.month, h.day));
  return dayKeyFromParts(g.year, g.month, g.day);
}

export function formatHijri(h: HijriDate): string {
  return `${h.day} ${HIJRI_MONTHS[h.month - 1]} ${h.year} H`;
}

export interface SeasonWindow {
  code: 'ramadan' | 'mudik' | 'tujuh_belas' | 'akhir_tahun';
  start: DayKey;
  end: DayKey;
  /** Hari puncak (mis. Idulfitri untuk mudik). */
  peak?: DayKey;
}

export type SeasonOverrides = Partial<Record<string, { start: DayKey; end: DayKey; peak?: DayKey }>>;

/**
 * Musim yang relevan untuk tahun Masehi tertentu. Override (dari server, hasil
 * sidang isbat) dipakai bila ada, dengan kunci `${code}-${year}`.
 */
export function seasonsForYear(year: number, overrides: SeasonOverrides = {}): SeasonWindow[] {
  const out: SeasonWindow[] = [];
  // Ramadan bisa jatuh dua kali dalam satu tahun Masehi pada siklus tertentu;
  // ambil Ramadan yang dimulai di tahun ini.
  const hStart = toHijri(`${year}-01-01`).year;
  for (const hy of [hStart, hStart + 1]) {
    const ramStart = fromHijri({ year: hy, month: 9, day: 1 });
    if (!ramStart.startsWith(String(year))) continue;
    const idul = fromHijri({ year: hy, month: 10, day: 1 });
    const ramadanOv = overrides[`ramadan-${year}`];
    out.push(ramadanOv ? { code: 'ramadan', ...ramadanOv } : { code: 'ramadan', start: ramStart, end: addDays(idul, -1) });
    const ramOv = overrides[`ramadan-${year}`];
    const mudOv = overrides[`mudik-${year}`];
    const lebaran = mudOv?.peak ?? (ramOv ? addDays(ramOv.end, 1) : idul);
    out.push(
      mudOv
        ? { code: 'mudik', ...mudOv }
        : { code: 'mudik', start: addDays(lebaran, -7), end: addDays(lebaran, 6), peak: lebaran },
    );
  }
  out.push({ code: 'tujuh_belas', start: `${year}-08-11`, end: `${year}-08-17`, peak: `${year}-08-17` });
  out.push({ code: 'akhir_tahun', start: `${year}-12-18`, end: `${year}-12-31`, peak: `${year}-12-31` });
  return out.sort((a, b) => (a.start < b.start ? -1 : 1));
}

export function activeSeason(day: DayKey, overrides: SeasonOverrides = {}): SeasonWindow | undefined {
  const year = Number(day.slice(0, 4));
  return seasonsForYear(year, overrides).find((s) => s.start <= day && day <= s.end);
}

/** Malam takbiran: malam sebelum 1 Syawal atau 10 Zulhijah. */
export function isTakbiranEve(day: DayKey): boolean {
  const next = toHijri(addDays(day, 1));
  return (next.month === 10 && next.day === 1) || (next.month === 12 && next.day === 10);
}

export function isIdulFitri(day: DayKey): boolean {
  const h = toHijri(day);
  return h.month === 10 && h.day === 1;
}
