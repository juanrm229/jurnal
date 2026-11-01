/**
 * Tanaman Berdua: wajah dari api lingkaran. Tumbuh dari hari yang disegel
 * bersama, disiram kilasan & pelukan, berbunga di setiap milestone. Hari yang
 * terlewat hanya membuatnya sedikit layu; ia tidak pernah mati.
 *
 * Dihitung dari data yang sudah ada (streak, hari dibuat, kilasan hari ini).
 */
import type { StreakSummary } from './streak';
import { addDays, type DayKey, diffDays, parseDay } from './time';

export type PlantHealth = 'segar' | 'haus' | 'layu';

export interface PlantPart {
  doodle: string;
  /** Ukuran relatif terhadap lebar pot (1 = selebar pot). */
  size: number;
  /** Posisi relatif: x dari tengah (-1..1), y dari bibir pot ke atas (0..). */
  x: number;
  y: number;
  rot?: number;
}

export interface PlantStage {
  key: 'benih' | 'tunas' | 'daun' | 'kuncup' | 'bunga' | 'matahari' | 'pohon' | 'pohon-lampu';
  name: string;
  from: number;
  parts: PlantPart[];
}

export const PLANT_STAGES: PlantStage[] = [
  { key: 'benih', name: 'benih', from: 0, parts: [] },
  { key: 'tunas', name: 'tunas kecil', from: 1, parts: [{ doodle: 'tunas', size: 0.55, x: 0, y: 0.05 }] },
  { key: 'daun', name: 'tunas berdaun', from: 3, parts: [{ doodle: 'tunas', size: 0.7, x: 0, y: 0.05 }, { doodle: 'daun-sudut', size: 0.32, x: 0.32, y: 0.12, rot: 20 }] },
  { key: 'kuncup', name: 'kuncup pertama', from: 7, parts: [{ doodle: 'bunga-kecil', size: 0.8, x: 0, y: 0.05 }, { doodle: 'daun-sudut', size: 0.32, x: -0.34, y: 0.1, rot: -25 }] },
  { key: 'bunga', name: 'bunga yang mekar', from: 14, parts: [{ doodle: 'bunga-tiga', size: 0.95, x: 0, y: 0.05 }, { doodle: 'daun-sudut', size: 0.34, x: 0.38, y: 0.08, rot: 25 }] },
  { key: 'matahari', name: 'bunga matahari', from: 30, parts: [{ doodle: 'bunga-matahari', size: 1.15, x: 0, y: 0.05 }, { doodle: 'bunga-kecil', size: 0.4, x: -0.45, y: 0.05 }] },
  { key: 'pohon', name: 'pohon kecil', from: 100, parts: [{ doodle: 'pohon-kecil', size: 1.35, x: 0, y: 0.03 }, { doodle: 'bunga-kecil', size: 0.36, x: 0.5, y: 0.02 }, { doodle: 'bunga-liar', size: 0.36, x: -0.5, y: 0.02 }] },
  {
    key: 'pohon-lampu',
    name: 'pohon berlampu',
    from: 365,
    parts: [
      { doodle: 'pohon-kecil', size: 1.5, x: 0, y: 0.03 },
      { doodle: 'lampu', size: 0.3, x: 0.42, y: 0.9, rot: 8 },
      { doodle: 'bunga-matahari', size: 0.42, x: -0.55, y: 0.02 },
    ],
  },
];

export interface PlantState {
  stage: PlantStage;
  next?: PlantStage;
  /** Hari bersama lagi sampai tahap berikutnya. */
  toNext?: number;
  health: PlantHealth;
  /** Disiram hari ini (kilasan, kangen, pelukan, atau segel bersama). */
  watered: boolean;
  /** Ada kupu-kupu: hari ini ramai. */
  visitors: boolean;
  /** Hari sejak lingkaran dibuat (hari pertama = 1). */
  sinceDays: number;
  togetherDays: number;
  anniversary: { years: number; inDays: number };
  line: string;
}

/** Hari jadi berikutnya dari tanggal lingkaran dibuat (29 Feb jatuh ke 28 Feb di tahun biasa). */
export function nextAnniversary(createdDay: DayKey, today: DayKey): { years: number; inDays: number } {
  const c = parseDay(createdDay);
  const t = parseDay(today);
  const on = (y: number) => {
    const leap = (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0;
    const d = c.month === 2 && c.day === 29 && !leap ? 28 : c.day;
    return `${y}-${String(c.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  };
  let y = t.year;
  if (y <= c.year) y = c.year + 1;
  else if (on(y) < today) y += 1;
  return { years: y - c.year, inDays: diffDays(on(y), today) };
}

export function plantFor(opts: {
  streak: Pick<StreakSummary, 'current' | 'togetherDays' | 'warmth' | 'today'>;
  createdDay: DayKey;
  today: DayKey;
  /** Nama-nama yang menyiram hari ini (mengirim kilasan, kangen, atau pelukan). */
  wateredBy?: string[];
  /** Jumlah kilasan & kangen hari ini di lingkaran ini. */
  flashesToday?: number;
}): PlantState {
  const together = Math.max(0, opts.streak.togetherDays);
  let i = 0;
  for (let k = 0; k < PLANT_STAGES.length; k++) if (together >= PLANT_STAGES[k]!.from) i = k;
  const stage = PLANT_STAGES[i]!;
  const next = PLANT_STAGES[i + 1];
  const sealedToday = opts.streak.today.counts && opts.streak.today.sealed > 0;
  const wateredBy = [...new Set(opts.wateredBy ?? [])];
  const watered = sealedToday || wateredBy.length > 0;
  const health: PlantHealth = opts.streak.current > 0 || watered || opts.streak.warmth >= 0.5 ? 'segar' : opts.streak.warmth >= 0.2 ? 'haus' : 'layu';
  const sinceDays = Math.max(1, diffDays(opts.today, opts.createdDay) + 1);
  const anniversary = nextAnniversary(opts.createdDay, opts.today);

  const who = wateredBy.length ? (wateredBy.length > 2 ? `${wateredBy.slice(0, 2).join(', ')}, dan lainnya` : wateredBy.join(' & ')) : '';
  let line: string;
  if (together === 0) line = watered ? `Benihnya baru disiram ${who || 'kalian'}. Segel satu hari bersama untuk melihatnya bertunas.` : 'Benih kecil menunggu hari pertama yang kalian segel bersama.';
  else if (health === 'layu') line = 'Agak layu, tapi tidak pernah mati. Ia menunggu kalian kembali; satu kilasan pun cukup.';
  else if (health === 'haus') line = 'Sedikit haus. Satu kilasan atau segel malam ini cukup untuk menyiramnya.';
  else if (sealedToday) line = `Hari ini disegel bersama. ${cap(stage.name)} kalian tumbuh lagi sedikit.`;
  else if (wateredBy.length) line = `Sudah disiram hari ini oleh ${who}.`;
  else line = `${cap(stage.name)} kalian segar. Belum ada yang menyiram hari ini.`;

  return {
    stage,
    next,
    toNext: next ? next.from - together : undefined,
    health,
    watered,
    visitors: (opts.flashesToday ?? 0) >= 2,
    sinceDays,
    togetherDays: together,
    anniversary,
    line,
  };
}

const cap = (s: string) => (s ? s[0]!.toUpperCase() + s.slice(1) : s);

/** Untuk kalender kecil: tanggal hari jadi berikutnya. */
export function anniversaryDay(createdDay: DayKey, today: DayKey): DayKey {
  return addDays(today, nextAnniversary(createdDay, today).inDays);
}
