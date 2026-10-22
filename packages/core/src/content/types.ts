// Tipe untuk bank konten berbahasa Indonesia. Semua konten berupa data statis
// supaya bisa dipakai di perangkat (aplikasi) maupun server tanpa jaringan.

/** Nada pertanyaan/kartu, dipakai untuk menyeimbangkan pilihan harian. */
export type Tone = 'ringan' | 'dalam' | 'lucu' | 'nostalgia' | 'syukur' | 'mimpi';

/** Lingkaran tempat konten pantas muncul. `semua` = cocok untuk jenis apa pun. */
export type CircleFit = 'semua' | 'duo' | 'lingkaran' | 'keluarga_pilihan' | 'momen';

export interface NightQuestion {
  /** id stabil, huruf kecil-dash, tidak boleh berubah setelah rilis. */
  id: string;
  text: string;
  tone: Tone;
  fit: CircleFit[];
}

export type CardKind = 'pertanyaan' | 'tantangan' | 'kenangan' | 'rahasia';

/**
 * Pemicu kartu langka. Kartu langka hanya bisa keluar pada hari yang cocok.
 * - hujan_pertama: hari pertama di musim ini cuaca otomatis = hujan
 * - hari_jadi: tanggal & bulan yang sama dengan hari lingkaran dibuat
 * - malam_takbiran: malam sebelum Idulfitri / Iduladha
 * - malam_tahun_baru: 31 Desember
 * - tujuh_belas: 17 Agustus
 * - ulang_tahun: ulang tahun salah satu anggota
 * - hari_pertama: hari pertama lingkaran
 * - petak_istimewa: hari ke-7/30/100/365 lingkaran
 * - purnama: malam bulan purnama
 * - ramadan: selama bulan Ramadan
 */
export type RareTrigger =
  | 'hujan_pertama'
  | 'hari_jadi'
  | 'malam_takbiran'
  | 'malam_tahun_baru'
  | 'tujuh_belas'
  | 'ulang_tahun'
  | 'hari_pertama'
  | 'petak_istimewa'
  | 'purnama'
  | 'ramadan';

export interface DailyCard {
  id: string;
  kind: CardKind;
  /** Judul pendek di muka kartu, maks ~24 karakter. */
  title: string;
  /** Isi kartu: pertanyaan, tantangan, atau ajakan. Maks ~140 karakter. */
  body: string;
  tone: Tone;
  fit: CircleFit[];
  /** Kalau diisi, ini kartu langka yang hanya keluar saat pemicunya terjadi. */
  rare?: RareTrigger;
  /** id doodle dari @sehari/doodles untuk ilustrasi kartu (opsional). */
  doodle?: string;
}

export interface Deck {
  /** id produk; dek dasar = 'dasar'. */
  id: string;
  name: string;
  description: string;
  /** Harga dalam Rupiah; 0 = gratis. */
  priceIdr: number;
  doodle: string;
  cards: DailyCard[];
}

export interface ExpeditionDay {
  /** Hari ke-1 sampai ke-7. */
  day: number;
  prompt: string;
}

export interface Expedition {
  id: string;
  name: string;
  /** Satu kalimat ajakan. */
  tagline: string;
  doodle: string;
  days: ExpeditionDay[];
  /** Judul halaman bergambar yang didapat saat selesai. */
  rewardPageTitle: string;
  fit: CircleFit[];
}

export interface Genre {
  id: string;
  name: string;
  /** Kalimat pendek untuk sampul jilid. */
  blurb: string;
  /** Petunjuk gaya sampul: pola dan doodle utama. */
  cover: { pattern: 'garis' | 'titik' | 'kotak' | 'gelombang' | 'bintang' | 'polos'; doodle: string };
}

export type TokenCode =
  | 'kunci'
  | 'payung'
  | 'tiket'
  | 'kerang'
  | 'lilin'
  | 'perangko'
  | 'kompas'
  | 'bulan'
  | 'ketupat'
  | 'lentera'
  | 'bendera'
  | 'kembang_api'
  | 'daun_kering'
  | 'cangkir'
  | 'pita';

export interface TokenDef {
  code: TokenCode;
  name: string;
  /** Kalimat yang muncul saat token didapat. */
  awardLine: string;
  /** Penjelasan cara mendapatkannya, untuk Lemari Benda. */
  howTo: string;
  doodle: string;
}

export interface SeasonPrompt {
  /** Hari ke-n dalam musim (1-based). */
  day: number;
  text: string;
}

export interface SeasonContent {
  code: 'ramadan' | 'mudik' | 'tujuh_belas' | 'akhir_tahun';
  name: string;
  tagline: string;
  doodle: string;
  prompts: SeasonPrompt[];
}

export interface HelpResource {
  name: string;
  /** Nomor telepon/WA atau URL. */
  contact: string;
  description: string;
}
