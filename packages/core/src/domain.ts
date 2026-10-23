/**
 * Lima objek inti: Drop, Kapsul Hari, Lingkaran, Streak Bersama, dan Wrap.
 * Semua fitur lain adalah turunan dari kelimanya.
 */
import type { MoodCode } from './content/chapterTitles';
import type { DayKey } from './time';

export type { MoodCode };

// ── Lingkaran ───────────────────────────────────────────────────────────────

export type CircleKind = 'duo' | 'circle' | 'chosen_family' | 'moment';

/**
 * - active: berjalan normal
 * - split: Mode Pisah (Duo yang berpisah) — arsip dibekukan
 * - memorial: Mode Kenangan — streak berhenti dengan hormat
 * - ended: Kapsul Momen yang acaranya sudah selesai (tetap bisa dibaca)
 */
export type CircleStatus = 'active' | 'split' | 'memorial' | 'ended';

/** Segel timbal balik (bawaan) atau terbuka kapan saja (untuk uji A/B & Kapsul Momen). */
export type RevealMode = 'after_seal' | 'open';

export type MemberRole = 'owner' | 'member' | 'guest';
export type MemberState = 'active' | 'left' | 'remembered';

export const CIRCLE_LIMITS: Record<CircleKind, { min: number; max: number }> = {
  duo: { min: 2, max: 2 },
  circle: { min: 3, max: 8 },
  chosen_family: { min: 3, max: 8 },
  moment: { min: 2, max: 400 },
};

export const CIRCLE_KIND_LABEL: Record<CircleKind, string> = {
  duo: 'Duo',
  circle: 'Lingkaran',
  chosen_family: 'Keluarga Pilihan',
  moment: 'Kapsul Momen',
};

export interface CircleSettings {
  revealMode: RevealMode;
  /** Fitur melankolis bisa dimatikan per lingkaran. */
  oneYearAgo: boolean;
  yellowingPages: boolean;
  lostLetters: boolean;
  nightQuestion: boolean;
  /** Ikut Musim Bersama (Ramadan, mudik, 17-an, akhir tahun). */
  seasons: boolean;
  /** Jam pengingat bila tidak memakai senja: 0–23. */
  sealHour: number;
  /** Tema kapsul yang terbuka lewat milestone atau Plus. */
  theme: string;
}

export const DEFAULT_CIRCLE_SETTINGS: CircleSettings = {
  revealMode: 'after_seal',
  oneYearAgo: true,
  yellowingPages: true,
  lostLetters: true,
  nightQuestion: true,
  seasons: true,
  sealHour: 21,
  theme: 'kertas',
};

export interface MomentInfo {
  startsOn: DayKey;
  endsOn: DayKey;
  tier: MomentTier;
  /** Nama acara terenkripsi berada di `nameEnc` lingkaran. */
}

export type MomentTier = 'coba' | 'kecil' | 'sedang' | 'besar';

export const MOMENT_TIERS: Record<MomentTier, { label: string; maxGuests: number; priceIdr: number }> = {
  coba: { label: 'Coba', maxGuests: 8, priceIdr: 0 },
  kecil: { label: 'Kecil', maxGuests: 50, priceIdr: 299_000 },
  sedang: { label: 'Sedang', maxGuests: 150, priceIdr: 599_000 },
  besar: { label: 'Besar', maxGuests: 400, priceIdr: 999_000 },
};

// ── Drop ────────────────────────────────────────────────────────────────────

export type DropKind =
  | 'text'
  | 'photo'
  | 'video'
  | 'voice'
  | 'song'
  | 'idea'
  | 'screenshot'
  | 'word' // satu kata hari ini
  | 'mood' // warna mood
  | 'answer' // jawaban Pertanyaan Malam
  | 'card' // jawaban Kartu Harian
  | 'expedition'
  | 'last_line' // Kalimat Terakhir saat menyegel
  | 'silent' // Ruang Hening
  | 'auto' // jejak otomatis: cuaca, kota, langkah, lagu
  | 'blackout' // Puisi Temuan
  | 'prologue'
  | 'epilogue'
  | 'sticker'; // stiker doodle di halaman jurnal

/**
 * Audiens selalu terlihat di samping tombol Drop.
 * - self: hanya aku (tidak pernah bisa dibagikan)
 * - circle: seluruh lingkaran (satu atau beberapa)
 * - person: satu orang di lingkaran
 * - time_capsule: terkunci sampai tanggal tertentu
 */
export type Audience = 'self' | 'circle' | 'person' | 'time_capsule';

export type ReactionKind = 'hug' | 'me_too' | 'candle' | 'here';

/** Reaksi yang diizinkan per jenis Drop. Ruang Hening hanya menerima lilin. */
export function allowedReactions(kind: DropKind): ReactionKind[] {
  if (kind === 'silent') return ['candle'];
  return ['hug', 'me_too', 'here'];
}

export interface SongRef {
  title: string;
  artist: string;
  url: string;
  provider: 'spotify' | 'youtube_music' | 'youtube' | 'apple_music' | 'lainnya';
  artworkUrl?: string;
}

export interface MediaRef {
  id: string;
  /** Kunci simetris media (base64) — hanya ada di dalam payload terenkripsi. */
  key: string;
  mime: string;
  width?: number;
  height?: number;
  durationMs?: number;
  /** Placeholder kecil (warna dominan) supaya grid tidak kosong saat memuat. */
  tint?: string;
}

export interface WeatherSnap {
  code: 'cerah' | 'berawan' | 'hujan' | 'badai' | 'kabut' | 'gerimis' | 'salju';
  tempC: number;
  label: string;
}

/** Isi Drop setelah didekripsi di perangkat. */
export interface DropPayload {
  v: 1;
  kind: DropKind;
  text?: string;
  mood?: MoodCode;
  song?: SongRef;
  media?: MediaRef[];
  cityId?: string;
  weather?: WeatherSnap;
  steps?: number;
  /** Jam lokal pembuatan, untuk Dua Sisi Satu Hari. */
  hour: number;
  minute: number;
  tz: string;
  /** Tag ringan, mis. 'laut', 'hujan', 'perjalanan'. */
  tags?: string[];
  /** Untuk auto: sumbernya. */
  autoSource?: 'weather' | 'city' | 'steps' | 'top_song' | 'gallery';
  /** Teks pertanyaan/kartu yang dijawab, disimpan agar arsip mandiri. */
  prompt?: string;
  /**
   * Posisi di halaman jurnal (web). Satuan halaman: lebar 1000, tinggi bebas.
   * Ikut terenkripsi — server tidak tahu tata letak halamanmu.
   */
  layout?: PageLayout;
  /** Gaya teks di halaman. */
  style?: { font?: 'mono' | 'hand' | 'serif'; size?: number; color?: string; align?: 'left' | 'center'; /** Stiker: warna isi pastel. */ fill?: string; /** Stiker: tepi putih seperti stiker vinyl (bawaan nyala). */ cut?: boolean };
  /** Untuk kind 'sticker': id doodle & warnanya. */
  sticker?: string;
  color?: string;
}

export interface PageLayout {
  x: number;
  y: number;
  /** Lebar elemen (satuan halaman). */
  w: number;
  /** Rotasi derajat. */
  rot: number;
  z: number;
}

/** Metadata yang memang terlihat server (tidak sensitif) untuk aturan & hitungan. */
export interface DropMeta {
  questionId?: string;
  cardId?: string;
  expeditionId?: string;
  expeditionDay?: number;
}

// ── Surat ───────────────────────────────────────────────────────────────────

/**
 * - lost: Surat Tersesat, tiba di waktu acak 1–12 bulan
 * - future: Surat Wasiat Kecil / Kapsul Waktu, dibuka di tanggal tertentu
 * - milestone: dibuka saat lingkaran mencapai petak istimewa
 */
export type LetterKind = 'lost' | 'future' | 'milestone';

export interface LetterPayload {
  v: 1;
  text: string;
  media?: MediaRef[];
  song?: SongRef;
  /** Judul amplop yang terlihat penerima sebelum dibuka (tetap terenkripsi). */
  envelopeNote?: string;
  writtenAt: string;
  writtenInCityId?: string;
}

// ── Lain-lain ───────────────────────────────────────────────────────────────

export type ReportReason = 'pelecehan' | 'ancaman' | 'konten_seksual' | 'anak' | 'spam' | 'menyakiti_diri' | 'lainnya';

export const REPORT_REASONS: Record<ReportReason, string> = {
  pelecehan: 'Pelecehan atau perundungan',
  ancaman: 'Ancaman atau kekerasan',
  konten_seksual: 'Konten seksual tanpa persetujuan',
  anak: 'Membahayakan anak',
  spam: 'Spam atau penipuan',
  menyakiti_diri: 'Seseorang mungkin menyakiti dirinya',
  lainnya: 'Lainnya',
};

export const MIN_AGE = 18;
