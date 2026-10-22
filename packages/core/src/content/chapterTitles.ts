// Generator judul bab bulanan berbasis aturan (tanpa AI). Berjalan di perangkat
// dari angka-angka ringkas yang sudah dihitung lokal; tidak membaca isi Drop.
// Judul hanya usulan: lingkaran tetap memilih sendiri di Upacara Tutup Bab.

import type { ContentDoodle } from './doodleIds';

export type MoodCode =
  | 'cerah'
  | 'tenang'
  | 'hangat'
  | 'rindu'
  | 'lelah'
  | 'sedih'
  | 'marah'
  | 'bingung'
  | 'bersemangat'
  | 'syukur';

export const MOOD_CODES: MoodCode[] = [
  'cerah',
  'tenang',
  'hangat',
  'rindu',
  'lelah',
  'sedih',
  'marah',
  'bingung',
  'bersemangat',
  'syukur',
];

/**
 * Warna mood: nada lembut tingkat menengah, cukup kontras di atas kertas
 * #E6E6E8 maupun di atas hitam. Dipakai sebagai isian petak/bintang, bukan teks.
 */
export const MOODS: Record<MoodCode, { label: string; color: string; doodle: ContentDoodle }> = {
  cerah: { label: 'cerah', color: '#E3A83B', doodle: 'matahari' },
  tenang: { label: 'tenang', color: '#6FA89A', doodle: 'awan' },
  hangat: { label: 'hangat', color: '#D9805A', doodle: 'cangkir' },
  rindu: { label: 'rindu', color: '#9384C2', doodle: 'bulan' },
  lelah: { label: 'lelah', color: '#8F8B7C', doodle: 'kabut' },
  sedih: { label: 'sedih', color: '#5F84B0', doodle: 'hujan' },
  marah: { label: 'marah', color: '#CF5F55', doodle: 'kaktus' },
  bingung: { label: 'bingung', color: '#B288AD', doodle: 'kompas' },
  bersemangat: { label: 'bersemangat', color: '#DE7396', doodle: 'bunga-matahari' },
  syukur: { label: 'syukur', color: '#7FAE6A', doodle: 'tunas' },
};

export interface ChapterFeatures {
  rainyDays: number;
  totalDays: number;
  sealedDays: number;
  dominantMood?: MoodCode;
  topWord?: string;
  topCity?: string;
  cities: number;
  songs: number;
  topSongTitle?: string;
  month: number /* 1-12 */;
  hugs: number;
  silentDays: number;
}

/**
 * Satu kelompok pola. `templates` boleh memakai placeholder:
 * {bulan} nama bulan, {kota} kota tersering, {Kata} kata tersering (huruf
 * depan kapital), {lagu} judul lagu tersering, {nKota} jumlah kota dalam kata.
 * Template yang placeholder-nya tidak tersedia dilewati.
 */
export interface ChapterTitlePattern {
  id: string;
  /** Makin tinggi makin khas, makin didahulukan. */
  weight: number;
  /** Pola dengan grup yang sama tidak muncul bersamaan di putaran pertama (mis. dua judul soal hujan). */
  group?: string;
  when: (f: ChapterFeatures) => boolean;
  templates: string[];
}

export const MONTH_NAMES = [
  'Januari',
  'Februari',
  'Maret',
  'April',
  'Mei',
  'Juni',
  'Juli',
  'Agustus',
  'September',
  'Oktober',
  'November',
  'Desember',
] as const;

const ANGKA = ['Nol', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh'];

const ratio = (a: number, b: number): number => (b > 0 ? a / b : 0);
const rainRatio = (f: ChapterFeatures): number => ratio(f.rainyDays, f.totalDays);
const sealRatio = (f: ChapterFeatures): number => ratio(f.sealedDays, f.totalDays);
const moodIs =
  (...moods: MoodCode[]) =>
  (f: ChapterFeatures): boolean =>
    f.dominantMood !== undefined && moods.includes(f.dominantMood);

const MOOD_TEMPLATES: Record<MoodCode, string[]> = {
  cerah: ['Bulan Langit Cerah', 'Bab Tawa yang Gampang Pecah', 'Bulan yang Ringan Saja'],
  tenang: ['Bulan yang Tenang Saja', 'Bab Air yang Tenang', 'Bulan Teh Hangat dan Napas Panjang'],
  hangat: ['Bulan Obrolan Sampai Larut', 'Bab Selimut dan Cerita', 'Bulan yang Hangat di Tengah Minggu'],
  rindu: ['Bulan Banyak Rindu', 'Bab Kangen yang Tak Ada Habisnya', 'Bulan Menghitung Hari'],
  lelah: ['Bab Ketika Kita Sering Pulang Larut', 'Bulan Kasur Terasa Jauh', 'Bab Kopi Ketiga Hari Ini', 'Bulan Lembur dan Mi Instan'],
  sedih: ['Bulan yang Berat, tapi Kita Lewati', 'Bab Hujan di Dalam', 'Bulan Kita Saling Menemani'],
  marah: ['Bab Gemuruh yang Akhirnya Reda', 'Bulan Banyak Menggerutu (dan Baikan)', 'Bab Kompor yang Kebesaran Api'],
  bingung: ['Bab Banyak Tanda Tanya', 'Bulan Mencari Arah', 'Bulan Belum Tahu, tapi Jalan Terus'],
  bersemangat: ['Bulan Banyak Rencana', 'Bab Mesin yang Sedang Panas', 'Bulan Semua Serba Mulai'],
  syukur: ['Bulan yang Cukup', 'Bab Hal-hal yang Disyukuri', 'Bulan Banyak Terima Kasih'],
};

const MONTH_TEMPLATES: Record<number, string[]> = {
  1: ['Bab Kalender Baru', 'Januari dan Resolusi yang Masih Hangat'],
  2: ['Bulan Pendek, Cerita Panjang', 'Februari yang Diam-diam Panjang'],
  3: ['Maret dan Sisa-sisa Hujan', 'Bab Seperempat Jalan'],
  4: ['April yang Penuh Kejutan Kecil', 'Bab Langit yang Mulai Ragu'],
  5: ['Mei dan Langit yang Mulai Terang', 'Bab Pertengahan yang Belum Tengah'],
  6: ['Juni di Tengah Tahun', 'Bab Separuh Jalan'],
  7: ['Juli dan Musim Libur', 'Bab Angin Kemarau'],
  8: ['Bulan Merah Putih', 'Agustus dan Umbul-umbul'],
  9: ['September yang Pelan-pelan', 'Bab Menjelang Akhir Kemarau'],
  10: ['Oktober dan Pancaroba', 'Bab Langit yang Berganti Musim'],
  11: ['November yang Mulai Basah', 'Bab Hujan Pertama Datang Lagi'],
  12: ['Bab Menjelang Tutup Buku', 'Desember dan Halaman-halaman Terakhir'],
};

export const CHAPTER_TITLE_PATTERNS: ChapterTitlePattern[] = [
  {
    id: 'hujan-bulan-juni',
    group: 'hujan',
    weight: 10,
    when: (f) => f.month === 6 && f.rainyDays >= 3,
    templates: ['Hujan Bulan Juni Versi Kita', 'Bab Hujan yang Tabah di Bulan Juni'],
  },
  {
    id: 'hujan-dan-lagu',
    group: 'hujan',
    weight: 9,
    when: (f) => rainRatio(f) >= 0.35 && (moodIs('rindu', 'sedih')(f) || f.songs >= 8),
    templates: [
      'Bulan Banyak Hujan dan Lagu Galau',
      'Bab Hujan dan Playlist yang Terlalu Jujur',
      'Bulan Jendela Berembun dan Lagu-lagu Pelan',
    ],
  },
  {
    id: 'kata-dan-kota',
    group: 'kota',
    weight: 9,
    when: (f) => !!f.topWord && f.cities >= 3,
    templates: ['Bulan {Kata} dan Kota yang Berpindah-pindah', 'Bab {Kata} di {nKota} Kota'],
  },
  {
    id: 'hujan',
    group: 'hujan',
    weight: 7,
    when: (f) => rainRatio(f) >= 0.35 || f.rainyDays >= 10,
    templates: [
      'Bulan Banyak Hujan',
      'Bab Payung yang Tak Pernah Kering',
      'Musim Jemuran Tak Kunjung Kering',
      'Bab Bau Tanah Basah',
      '{bulan} yang Basah',
      'Bulan Hujan Sore',
    ],
  },
  {
    id: 'banyak-kota',
    group: 'kota',
    weight: 7,
    when: (f) => f.cities >= 3,
    templates: [
      'Bulan Kota yang Berpindah-pindah',
      'Bab Koper yang Belum Dibongkar',
      'Bab {nKota} Kota, Satu Kapsul',
      'Bulan Banyak Perjalanan',
    ],
  },
  {
    id: 'hening',
    group: 'pelan',
    weight: 7,
    when: (f) => f.silentDays >= 3,
    templates: ['Bab Lilin-lilin Kecil', 'Bulan Kita Saling Menjaga', 'Bab Hari-hari yang Pelan', 'Bulan yang Kita Lewati Bersama'],
  },
  {
    id: 'dua-kota',
    group: 'kota',
    weight: 6,
    when: (f) => f.cities === 2,
    templates: ['Bab Dua Kota, Satu Senja', 'Bulan Peluk dari Jauh', 'Bab Jarak yang Terasa Dekat'],
  },
  {
    id: 'kata-tersering',
    weight: 6,
    when: (f) => !!f.topWord,
    templates: ['Bulan {Kata}', 'Bab yang Penuh {Kata}', 'Bulan {Kata} dan Hal-hal Kecil', 'Bab Ketika Semua Tentang {Kata}'],
  },
  {
    id: 'lagu-tema',
    group: 'lagu',
    weight: 6,
    when: (f) => !!f.topSongTitle,
    templates: ['Bab yang Diiringi “{lagu}”', 'Bulan Kita Memutar “{lagu}”', '“{lagu}” dan Hal-hal Lainnya'],
  },
  {
    id: 'peluk',
    group: 'peluk',
    weight: 6,
    when: (f) => f.hugs >= Math.max(15, f.totalDays),
    templates: ['Bulan Banyak Peluk', 'Bab Peluk yang Dikirim Diam-diam', 'Bulan Kita Saling Menghangatkan'],
  },
  {
    id: 'selalu-datang',
    group: 'pelan',
    weight: 6,
    when: (f) => f.totalDays >= 20 && sealRatio(f) >= 0.9,
    templates: ['Bulan yang Tak Pernah Absen', 'Bab Api yang Selalu Hangat', 'Bulan Kita Selalu Datang'],
  },
  ...MOOD_CODES.map(
    (mood): ChapterTitlePattern => ({
      id: `suasana-${mood}`,
      weight: 6,
      when: moodIs(mood),
      templates: MOOD_TEMPLATES[mood],
    }),
  ),
  {
    id: 'kemarau',
    group: 'hujan',
    weight: 5,
    when: (f) => f.rainyDays === 0 && f.totalDays >= 20,
    templates: ['Bulan Tanpa Payung', 'Bab Matahari yang Rajin', '{bulan} yang Terang Benderang'],
  },
  {
    id: 'kota-utama',
    group: 'kota',
    weight: 5,
    when: (f) => !!f.topCity,
    templates: ['Catatan dari {kota}', 'Bab {kota} dan Kita', 'Bulan {kota} Rasa Rumah', 'Senja-senja di {kota}'],
  },
  {
    id: 'banyak-lagu',
    group: 'lagu',
    weight: 5,
    when: (f) => f.songs >= 12,
    templates: ['Bulan Banyak Lagu', 'Bab Playlist yang Terus Bertambah', 'Bulan Kita Bergantian Pegang Musik'],
  },
  {
    id: 'kabut',
    group: 'pelan',
    weight: 5,
    when: (f) => f.totalDays > 0 && sealRatio(f) < 0.4,
    templates: ['Bulan Banyak Kabut', 'Bab Hari-hari yang Disimpan Pelan-pelan', 'Bulan Sibuk, tapi Tetap Kembali'],
  },
  ...Object.entries(MONTH_TEMPLATES).map(
    ([m, templates]): ChapterTitlePattern => ({
      id: `bulan-${m}`,
      weight: 4,
      when: (f) => f.month === Number(m),
      templates,
    }),
  ),
  {
    id: 'umum',
    weight: 0,
    when: () => true,
    templates: [
      'Bab {bulan} Kita',
      'Halaman-halaman {bulan}',
      '{bulan} yang Biasa-biasa Saja (dan Itu Bagus)',
      'Catatan {bulan}',
      'Bab Hari-hari Kecil',
      'Bulan yang Kita Simpan Bersama',
    ],
  },
];

/** PRNG kecil yang deterministik (mulberry32). */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const MAX_TITLE_LENGTH = 48;
const MAX_SONG_LENGTH = 26;

function capitalize(word: string): string {
  const w = word.trim();
  return w.charAt(0).toUpperCase() + w.slice(1);
}

function fill(template: string, f: ChapterFeatures): string | null {
  const values: Record<string, string | undefined> = {
    bulan: MONTH_NAMES[f.month - 1],
    kota: f.topCity?.trim() || undefined,
    Kata: f.topWord?.trim() ? capitalize(f.topWord) : undefined,
    lagu: f.topSongTitle && f.topSongTitle.trim().length <= MAX_SONG_LENGTH ? f.topSongTitle.trim() : undefined,
    nKota: f.cities > 0 ? (ANGKA[f.cities] ?? String(f.cities)) : undefined,
  };
  let missing = false;
  const out = template.replace(/\{(\w+)\}/g, (_, key: string) => {
    const v = values[key];
    if (v === undefined || v === '') {
      missing = true;
      return '';
    }
    return v;
  });
  if (missing || out.length > MAX_TITLE_LENGTH) return null;
  return out;
}

/**
 * Mengusulkan 3–5 judul bab yang beragam untuk satu bulan.
 * Deterministik: fitur dan seed yang sama selalu menghasilkan daftar yang sama.
 */
export function suggestChapterTitles(features: ChapterFeatures, seed: number): string[] {
  const f: ChapterFeatures = { ...features, month: Math.min(12, Math.max(1, Math.round(features.month))) };
  const rand = mulberry32(seed);
  const target = 3 + Math.floor(rand() * 3); // 3, 4, atau 5

  const ranked = CHAPTER_TITLE_PATTERNS.filter((p) => p.when(f))
    .map((p) => ({ p, score: p.weight + rand() * 2.5 }))
    .sort((a, b) => b.score - a.score || a.p.id.localeCompare(b.p.id))
    .map((x) => x.p);

  const result: string[] = [];
  const seen = new Set<string>();
  const tryAdd = (title: string | null): boolean => {
    if (!title) return false;
    const key = title.toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    result.push(title);
    return true;
  };

  // Putaran pertama: satu judul per pola, supaya usulannya beragam.
  const usedGroups = new Set<string>();
  for (const pattern of ranked) {
    if (result.length >= target) break;
    if (pattern.group && usedGroups.has(pattern.group)) continue;
    const n = pattern.templates.length;
    const start = Math.floor(rand() * n);
    for (let i = 0; i < n; i++) {
      if (tryAdd(fill(pattern.templates[(start + i) % n] ?? '', f))) {
        if (pattern.group) usedGroups.add(pattern.group);
        break;
      }
    }
  }

  // Putaran cadangan: kalau masih kurang dari target, ambil template sisa.
  for (const pattern of ranked) {
    for (const template of pattern.templates) {
      if (result.length >= target) break;
      tryAdd(fill(template, f));
    }
  }

  return result;
}
