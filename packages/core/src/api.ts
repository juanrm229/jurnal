/**
 * Kontrak API antara aplikasi dan server. Skema zod dipakai server untuk
 * validasi dan aplikasi untuk tipe. Semua isi pribadi berupa ciphertext.
 */
import { z } from 'zod';
import type { KeyBackup } from './crypto';
import type {
  Audience,
  CircleKind,
  CircleSettings,
  CircleStatus,
  DropKind,
  DropMeta,
  MediaRef,
  FaceExpression,
  LetterKind,
  MemberRole,
  MemberState,
  MomentTier,
  ReactionKind,
  ReportReason,
} from './domain';
import type { PlanCode } from './plans';
import type { StreakSummary } from './streak';
import type { DayKey } from './time';
import type { PublicWrapData } from './wrap';

const dayKey = z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const b64 = z.string().min(1).max(20_000_000);
const id = z.string().min(8).max(64);

export const recipientWire = z.discriminatedUnion('t', [
  z.object({ t: z.literal('user'), userId: id, wk: z.string().max(400) }),
  z.object({ t: z.literal('circle'), circleId: id, epoch: z.number().int().min(1), wk: z.string().max(400) }),
]);

export const envelopeSchema = z.object({
  ciphertext: b64.max(2_000_000),
  recipients: z.array(recipientWire).min(1).max(420),
});

// ── Auth ────────────────────────────────────────────────────────────────────

export const requestCodeBody = z.object({ email: z.string().email().max(200) });
export const verifyCodeBody = z.object({
  email: z.string().email().max(200),
  code: z.string().regex(/^\d{6}$/),
  deviceName: z.string().max(80).default('perangkat'),
  platform: z.enum(['ios', 'android', 'web']).default('web'),
});

export interface AuthResult {
  token: string;
  user: MeUser;
  /** Belum punya kunci → arahkan ke pembuatan identitas, bukan pemulihan. */
  hasKeys: boolean;
  isNew: boolean;
}

// ── Profil ──────────────────────────────────────────────────────────────────

export interface UserSettings {
  sunsetSeal: boolean;
  sealHour: number;
  morningCard: boolean;
  notifyPartnerSealed: boolean;
  notifyWraps: boolean;
  notifyLetters: boolean;
  /** Kabar kecil dari teman di lingkaran aktif: mulai menulis, reaksi, catatan kaki, ajakan main. */
  notifyActivity: boolean;
  autoWeather: boolean;
  autoCity: boolean;
  autoSteps: boolean;
  autoTopSong: boolean;
  gallerySuggestions: boolean;
  /** Kapsul Indonesia: sumbang warna mood anonim per provinsi. */
  moodPulse: boolean;
  theme: 'system' | 'light' | 'dark';
  /** Warna tinta doodle & kertas (web). */
  ink?: string;
  paper?: string;
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  sunsetSeal: true,
  sealHour: 21,
  morningCard: true,
  notifyPartnerSealed: true,
  notifyWraps: true,
  notifyLetters: true,
  notifyActivity: true,
  autoWeather: false,
  autoCity: false,
  autoSteps: false,
  autoTopSong: false,
  gallerySuggestions: false,
  moodPulse: false,
  theme: 'system',
};

export interface MeUser {
  id: string;
  email: string;
  penName: string | null;
  doodle: string;
  birthYear: number | null;
  birthday: string | null; // 'MM-DD', opsional untuk kartu langka
  tz: string;
  cityId: string | null;
  homeCityId: string | null;
  publicKey: string | null;
  plan: PlanCode;
  planUntil: string | null;
  settings: UserSettings;
  createdAt: string;
}

export interface Me {
  user: MeUser;
  ownedDecks: string[];
  freezes: { perMonth: number; used: number; received: number; gifted: number; left: number };
  limits: { maxCircles: number; voiceSeconds: number; videoSeconds: number; timeCapsuleYears: number };
}

export const updateMeBody = z.object({
  penName: z.string().trim().min(1).max(40).optional(),
  doodle: z.string().max(40).optional(),
  birthYear: z.number().int().min(1900).max(2100).optional(),
  birthday: z.string().regex(/^\d{2}-\d{2}$/).nullable().optional(),
  tz: z.string().max(64).optional(),
  cityId: z.string().max(64).nullable().optional(),
  homeCityId: z.string().max(64).nullable().optional(),
  settings: z
    .object({
      sunsetSeal: z.boolean(),
      sealHour: z.number().int().min(0).max(23),
      morningCard: z.boolean(),
      notifyPartnerSealed: z.boolean(),
      notifyWraps: z.boolean(),
      notifyLetters: z.boolean(),
      notifyActivity: z.boolean(),
      autoWeather: z.boolean(),
      autoCity: z.boolean(),
      autoSteps: z.boolean(),
      autoTopSong: z.boolean(),
      gallerySuggestions: z.boolean(),
      moodPulse: z.boolean(),
      theme: z.enum(['system', 'light', 'dark']),
      ink: z.string().regex(/^#[0-9a-fA-F]{6}$/),
      paper: z.string().max(20),
    })
    .partial()
    .optional(),
});

export const keyBackupSchema = z.object({
  v: z.literal(1),
  kdf: z.literal('scrypt'),
  salt: z.string().max(64),
  N: z.number().int(),
  r: z.number().int(),
  p: z.number().int(),
  blob: z.string().max(400),
});

export const putKeysBody = z.object({
  publicKey: z.string().min(40).max(64),
  keyBackup: keyBackupSchema,
});

export interface KeyBackupResponse {
  publicKey: string;
  keyBackup: KeyBackup;
}

export const pushTokenBody = z.object({ token: z.string().max(4000), platform: z.enum(['ios', 'android', 'web']).optional() });

export interface SessionInfo {
  id: string;
  deviceName: string;
  platform: string;
  createdAt: string;
  lastUsedAt: string;
  current: boolean;
}

export const deviceLinkCreateBody = z.object({ ephemeralPublicKey: z.string().min(40).max(64) });
export const deviceLinkApproveBody = z.object({ payload: z.string().max(2000) });
export interface DeviceLinkState {
  id: string;
  status: 'waiting' | 'approved' | 'expired';
  ephemeralPublicKey: string;
  payload?: string;
  deviceName?: string;
}

export interface PublicUser {
  id: string;
  penName: string;
  doodle: string;
  publicKey: string;
}

// ── Lingkaran ───────────────────────────────────────────────────────────────

const circleSettingsSchema = z.object({
  revealMode: z.enum(['after_seal', 'open']),
  oneYearAgo: z.boolean(),
  yellowingPages: z.boolean(),
  lostLetters: z.boolean(),
  nightQuestion: z.boolean(),
  seasons: z.boolean(),
  sealHour: z.number().int().min(0).max(23),
  theme: z.string().max(40),
});

export const createCircleBody = z.object({
  kind: z.enum(['duo', 'circle', 'chosen_family', 'moment']),
  nameEnc: z.string().max(2000),
  doodle: z.string().max(40).default('tunas'),
  settings: circleSettingsSchema.partial().optional(),
  /** Kunci epoch-1 dibungkus untuk kunci publik pembuat. */
  keyEnvelope: z.string().max(400),
  moment: z
    .object({ startsOn: dayKey, endsOn: dayKey, tier: z.enum(['coba', 'kecil', 'sedang', 'besar']) })
    .optional(),
});

export const updateCircleBody = z.object({
  nameEnc: z.string().max(2000).optional(),
  doodle: z.string().max(40).optional(),
  settings: circleSettingsSchema.partial().optional(),
});

export interface CircleMember {
  userId: string;
  penName: string;
  doodle: string;
  publicKey: string;
  role: MemberRole;
  state: MemberState;
  joinedAt: string;
  joinedDay: DayKey;
  leftDay: DayKey | null;
  plan: PlanCode;
  birthday: string | null;
  cityId: string | null;
  tz: string;
  /** Anggota yang sudah mengonfirmasi Mode Kenangan untuk orang ini. */
  memorialVotes: string[];
  /** Lingkaran ini punya halaman harian sendiri dari anggota ini (tidak menerima halaman utamanya). */
  ownPage: boolean;
}

export interface CircleKeyEnvelope {
  epoch: number;
  wk: string;
}

export interface CircleSummary {
  id: string;
  kind: CircleKind;
  status: CircleStatus;
  nameEnc: string;
  doodle: string;
  settings: CircleSettings;
  createdAt: string;
  createdDay: DayKey;
  currentEpoch: number;
  /** Anggota keluar → kunci perlu diputar oleh anggota yang tersisa. */
  rotationNeeded: boolean;
  members: CircleMember[];
  myKeys: CircleKeyEnvelope[];
  streak: StreakSummary;
  /** Status segel hari ini per anggota (hanya ya/tidak — bukan "terakhir dilihat"). */
  todaySealed: Record<string, boolean>;
  moment: { startsOn: DayKey; endsOn: DayKey; tier: MomentTier } | null;
  /** Fitur Plus terbuka bila minimal satu anggota Plus. */
  plusUnlocked: boolean;
  aiConsent: { userId: string; granted: boolean }[];
  memorialLocked: boolean;
}

export const createInviteBody = z.object({
  bundle: z.string().max(20_000),
  proof: z.string().length(64),
  maxUses: z.number().int().min(1).max(400).default(1),
  expiresInHours: z.number().int().min(1).max(24 * 30).default(48),
});

export interface InvitePreview {
  token: string;
  circleId: string;
  kind: CircleKind;
  inviter: { penName: string; doodle: string };
  memberCount: number;
  maxMembers: number;
  expiresAt: string;
  valid: boolean;
  reason?: 'expired' | 'used' | 'full' | 'revoked' | 'ended';
  moment: { startsOn: DayKey; endsOn: DayKey } | null;
}

export const acceptInviteBody = z.object({ proof: z.string().length(64) });
export interface AcceptInviteResult {
  circleId: string;
  bundle: string;
}

export const putKeysForCircleBody = z.object({
  envelopes: z.array(z.object({ epoch: z.number().int().min(1), userId: id, wk: z.string().max(400) })).min(1).max(2000),
});

export const rotateCircleBody = z.object({
  epoch: z.number().int().min(2),
  envelopes: z.array(z.object({ userId: id, wk: z.string().max(400) })).min(1).max(420),
});

export const memorialBody = z.object({ userId: id });
export const nicknameBody = z.object({ nicknameEnc: z.string().max(1000) });
export interface Nickname {
  giverId: string;
  targetId: string;
  nicknameEnc: string;
}

// ── Hari, Drop, Segel ───────────────────────────────────────────────────────

export const createDropBody = z.object({
  id,
  day: dayKey,
  kind: z.enum([
    'text', 'photo', 'video', 'voice', 'song', 'idea', 'screenshot', 'word', 'mood', 'answer', 'card',
    'expedition', 'last_line', 'silent', 'auto', 'blackout', 'prologue', 'epilogue', 'sticker', 'intent',
  ]),
  audience: z.enum(['self', 'circle', 'person', 'time_capsule']),
  circleIds: z.array(id).max(50).default([]),
  /** Kosong = halaman utama; diisi = halaman terpisah untuk satu lingkaran. */
  pageCircleId: id.optional(),
  personId: id.optional(),
  unlockOn: dayKey.optional(),
  envelope: envelopeSchema,
  mediaIds: z.array(id).max(10).default([]),
  meta: z
    .object({
      flash: z.enum(['snap', 'kangen']).optional(),
      backfill: z.boolean().optional(),
      questionId: z.string().max(80).optional(),
      cardId: z.string().max(80).optional(),
      expeditionId: z.string().max(80).optional(),
      expeditionDay: z.number().int().min(1).max(7).optional(),
    })
    .default({}),
  /** Durasi media (detik) untuk menegakkan batas paket. */
  mediaSeconds: z.number().min(0).max(3600).optional(),
});

export type CreateDropBody = z.input<typeof createDropBody>;

/** Ubah Drop sebelum hari disegel (isi, tata letak, audiens). */
export const updateDropBody = createDropBody.pick({ envelope: true, mediaIds: true, audience: true, circleIds: true, personId: true, unlockOn: true }).partial({ mediaIds: true, audience: true, circleIds: true, personId: true, unlockOn: true });

export interface PublicConfig {
  freeAll: boolean;
  devAuth: boolean;
  vapidPublicKey: string | null;
}

export interface DropWire {
  id: string;
  authorId: string;
  day: DayKey;
  kind: DropKind;
  audience: Audience;
  circleIds: string[];
  /** Halaman tempat Drop ini ditempel: null = halaman utama. */
  pageCircleId: string | null;
  personId: string | null;
  unlockOn: DayKey | null;
  createdAt: string;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  mediaIds: string[];
  meta: DropMeta;
  reactions: { kind: ReactionKind; userId: string }[];
  footnotes: FootnoteWire[];
  /** Reaksi Wajah: foto ekspresi, terenkripsi untuk lingkaran. */
  faces: FaceWire[];
}

export interface FaceWire {
  userId: string;
  expression: FaceExpression;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  mediaIds: string[];
  createdAt: string;
}

/** Isi terenkripsi Reaksi Wajah. */
export interface FacePayload {
  v: 1;
  media: MediaRef;
}

export interface FootnoteWire {
  id: string;
  dropId: string;
  authorId: string;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  includeInPrint: boolean;
  createdAt: string;
}

/** Drop yang masih tertutup: hanya terlihat bahwa ada, bukan isinya. */
export interface LockedDrop {
  id: string;
  authorId: string;
  kind: 'locked';
  reason: 'not_sealed' | 'writing' | 'time_capsule' | 'split' | 'secret_card' | 'answer_first';
  unlockOn: DayKey | null;
  /** Untuk 'answer_first': pertanyaan yang perlu kamu jawab dulu. */
  questionId?: string;
}

export interface MyDay {
  day: DayKey;
  /** Segel halaman utama. */
  sealedAt: string | null;
  sealable: boolean;
  /** Lingkaran yang halamannya hari ini sudah tersegel (lewat halaman utama atau halamannya sendiri). */
  sealedCircles: string[];
  drops: DropWire[];
  frozen: boolean;
}

export const sealBody = z.object({
  /** Kalimat Terakhir & warna mood — dikirim sebagai Drop biasa bersamaan. */
  lastLine: createDropBody.optional(),
  tz: z.string().max(64),
  /** Segel halaman terpisah untuk satu lingkaran; kosong = halaman utama. */
  circleId: id.optional(),
});
export const ownPageBody = z.object({ ownPage: z.boolean() });

export interface SealResult {
  day: DayKey;
  sealedAt: string;
  circles: { circleId: string; allSealed: boolean; streak: StreakSummary; milestone?: string }[];
}

export interface CircleDay {
  circleId: string;
  day: DayKey;
  iSealed: boolean;
  members: { userId: string; sealed: boolean; frozen: boolean; dropCount: number }[];
  drops: DropWire[];
  locked: LockedDrop[];
  lastVisitedOn: DayKey | null;
}

export interface CircleCalendarDay {
  day: DayKey;
  sealed: string[];
  frozen: string[];
  dropCount: number;
  /** Foto kenangan susulan di hari itu. */
  backfill?: number;
}

export const reactionParams = z.object({ kind: z.enum(['hug', 'me_too', 'candle', 'here']) });

export const faceBody = z.object({
  expression: z.enum(['senyum', 'ketawa', 'kaget', 'terharu', 'sayang', 'semangat']),
  envelope: envelopeSchema,
  mediaIds: z.array(id).min(1).max(1),
});

export const footnoteBody = z.object({ id, envelope: envelopeSchema });
export const footnotePrintBody = z.object({ includeInPrint: z.boolean() });

// ── Pembeku streak ──────────────────────────────────────────────────────────

export const useFreezeBody = z.object({ day: dayKey });
export const giftFreezeBody = z.object({ toUserId: id, note: z.string().max(140).optional() });

// ── Surat ───────────────────────────────────────────────────────────────────

export const createLetterBody = z.object({
  id,
  kind: z.enum(['lost', 'future', 'milestone', 'when']),
  circleId: id.optional(),
  /** Kosong = untuk seluruh lingkaran (atau diri sendiri bila tanpa lingkaran). */
  toUserId: id.optional(),
  deliverOn: dayKey.optional(),
  /** Untuk milestone: 7 / 30 / 100 / 365. */
  milestoneDays: z.number().int().optional(),
  envelope: envelopeSchema,
  mediaIds: z.array(id).max(4).default([]),
});

export interface LetterWire {
  id: string;
  kind: LetterKind;
  fromUserId: string;
  toUserId: string | null;
  circleId: string | null;
  createdAt: string;
  /** Hanya untuk pengirim surat `future`; Surat Tersesat tidak pernah memberi tahu kapan. */
  deliverOn: DayKey | null;
  deliveredAt: string | null;
  openedAt: string | null;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] } | null;
  mediaIds: string[];
  milestoneDays: number | null;
}

// ── Kitab: bab, adegan, jilid ───────────────────────────────────────────────

export const proposalBody = z.object({ titleEnc: z.string().max(2000) });
export const voteBody = z.object({ proposalId: id });
export interface ChapterWire {
  month: string;
  titleEnc: string | null;
  closedAt: string | null;
  proposals: { id: string; userId: string; titleEnc: string; votes: string[] }[];
}

/** Tanggal Penting buatan sendiri: judul terenkripsi, bulan & tanggal terlihat server (untuk pengingat). */
export const importantDateBody = z.object({
  titleEnc: z.string().min(1).max(2000),
  month: z.number().int().min(1).max(12),
  day: z.number().int().min(1).max(31),
  year: z.number().int().min(1900).max(2100).nullable().optional(),
});
export interface ImportantDateWire {
  id: string;
  authorId: string;
  titleEnc: string;
  month: number;
  day: number;
  year: number | null;
  createdAt: string;
}

/** Rol Minggu Ini: sampai lima foto favorit seminggu. Kosong = hapus pilihan. */
export const rollBody = z.object({ dropIds: z.array(id).max(5) });
export interface RollWire {
  userId: string;
  week: string;
  dropIds: string[];
  updatedAt: string;
}

export const sceneBody = z.object({ titleEnc: z.string().max(2000).optional(), cardId: z.string().max(80).optional() });
export interface SceneWire {
  week: string;
  penHolderId: string;
  titleEnc: string | null;
  cardId: string | null;
}

export const genreVoteBody = z.object({ genreId: z.string().max(60) });
export interface VolumeWire {
  year: number;
  genreVotes: { userId: string; genreId: string }[];
  genreId: string | null;
  coverDoodle: string | null;
}

// ── Papan, langit, lemari ───────────────────────────────────────────────────

export const startExpeditionBody = z.object({ code: z.string().max(60), startDay: dayKey });
export interface ExpeditionWire {
  id: string;
  code: string;
  startDay: DayKey;
  endDay: DayKey;
  startedBy: string;
  completedAt: string | null;
  /** Anggota yang sudah Drop untuk hari ke-n. */
  progress: Record<number, string[]>;
}

export const claimTokenBody = z.object({
  code: z.enum([
    'kunci', 'payung', 'tiket', 'kerang', 'lilin', 'perangko', 'kompas', 'bulan', 'ketupat', 'lentera',
    'bendera', 'kembang_api', 'daun_kering', 'cangkir', 'pita',
  ]),
  day: dayKey,
  dropId: id.optional(),
});
export interface TokenWire {
  id: string;
  code: string;
  userId: string;
  day: DayKey;
  awardedAt: string;
}

export const constellationBody = z.object({ nameEnc: z.string().max(2000), days: z.array(dayKey).min(2).max(60) });
export interface ConstellationWire {
  id: string;
  nameEnc: string;
  days: DayKey[];
  createdBy: string;
  createdAt: string;
}

export const dictionaryBody = z.object({ termEnc: z.string().max(2000), meaningEnc: z.string().max(4000) });
export interface DictionaryWire {
  id: string;
  termEnc: string;
  meaningEnc: string;
  addedBy: string;
  createdAt: string;
}

export const motifBody = z.object({ year: z.number().int(), termEnc: z.string().max(2000) });
export interface MotifWire {
  id: string;
  year: number;
  termEnc: string;
  addedBy: string;
}

export interface DiceRoll {
  week: string;
  day: DayKey | null;
  rolledBy: string;
  rolledAt: string;
}

// ── Musim & Kapsul Indonesia ────────────────────────────────────────────────

export const pulseBody = z.object({
  day: dayKey,
  province: z.string().max(60),
  mood: z.enum(['cerah', 'tenang', 'hangat', 'rindu', 'lelah', 'sedih', 'marah', 'bingung', 'bersemangat', 'syukur']),
});
export interface PulseDay {
  day: DayKey;
  provinces: { province: string; total: number; moods: Record<string, number> }[];
  /** Provinsi dengan kontribusi di bawah ambang tidak ditampilkan (k-anonimitas). */
  threshold: number;
}

// ── Wrap publik ─────────────────────────────────────────────────────────────

export const publishWrapBody = z.object({
  data: z.object({
    scope: z.enum(['week', 'month', 'year', 'moment']),
    period: z.string().max(32),
    label: z.string().max(64),
    circleKind: z.enum(['duo', 'circle', 'chosen_family', 'moment']),
    memberCount: z.number().int(),
    sealedDays: z.number().int(),
    totalDays: z.number().int(),
    streak: z.number().int(),
    longest: z.number().int(),
    palette: z.array(z.object({ mood: z.string().max(20), color: z.string().max(9), share: z.number() })).max(6),
    chapterTitle: z.string().max(80).optional(),
    themeSong: z.object({ title: z.string().max(80), artist: z.string().max(80) }).optional(),
    genre: z.string().max(60).optional(),
    garden: z.array(z.boolean()).max(366),
  }),
});
export interface PublicWrapWire {
  slug: string;
  url: string;
  imageUrl: string;
  data: PublicWrapData;
  createdAt: string;
}

// ── Keamanan ────────────────────────────────────────────────────────────────

export const reportBody = z.object({
  targetUserId: id,
  circleId: id.optional(),
  dropId: id.optional(),
  reason: z.enum(['pelecehan', 'ancaman', 'konten_seksual', 'anak', 'spam', 'menyakiti_diri', 'lainnya']),
  note: z.string().max(2000).optional(),
  /**
   * Laporan atas tindakan pengguna: perangkat pelapor mengirim isi yang ia
   * pilih sendiri (sudah didekripsi) ke tim keamanan. Pelapor tahu persis apa
   * yang dikirim.
   */
  disclosedContent: z.string().max(10_000).optional(),
});
export interface ReportWire {
  id: string;
  reason: ReportReason;
  status: 'open' | 'reviewing' | 'closed';
  createdAt: string;
}

// ── Pembayaran ──────────────────────────────────────────────────────────────

export const checkoutBody = z.object({
  product: z.string().max(60),
  /** Untuk buku: lingkaran & tahun; untuk momen: lingkaran; untuk Plus Duo: pasangan. */
  circleId: id.optional(),
  year: z.number().int().optional(),
  partnerUserId: id.optional(),
  shipping: z
    .object({
      name: z.string().max(100),
      phone: z.string().max(30),
      address: z.string().max(500),
      city: z.string().max(80),
      postalCode: z.string().max(10),
    })
    .optional(),
  method: z.enum(['qris', 'ewallet', 'va', 'card']).default('qris'),
});

export interface CheckoutResult {
  orderId: string;
  paymentUrl: string;
  status: OrderStatus;
}

export type OrderStatus = 'pending' | 'paid' | 'expired' | 'failed' | 'refunded';

export interface OrderWire {
  id: string;
  product: string;
  amountIdr: number;
  status: OrderStatus;
  createdAt: string;
  paidAt: string | null;
  giftCode: string | null;
  giftRedeemed: boolean;
  /** Untuk pesanan yang masih menunggu: lanjutkan pembayaran. */
  paymentUrl: string | null;
  bookStatus: 'awaiting_file' | 'printing' | 'shipped' | null;
  /** Untuk buku & Kapsul Momen: jilid/lingkaran yang dipesan. */
  circleId: string | null;
  year: number | null;
}

export const redeemBody = z.object({ code: z.string().min(6).max(32) });

// ── AI cloud (opt-in) ───────────────────────────────────────────────────────

export const aiConsentBody = z.object({ granted: z.boolean() });
export const aiChapterBody = z.object({
  month: z.string().regex(/^\d{4}-\d{2}$/),
  /** Potongan yang dipilih pengguna sendiri untuk diproses. */
  snippets: z.array(z.string().max(500)).min(1).max(40),
});
export interface AiChapterResult {
  titles: string[];
}

// ── Ekspor ──────────────────────────────────────────────────────────────────

export interface ExportBundle {
  exportedAt: string;
  user: MeUser;
  circles: CircleSummary[];
  drops: DropWire[];
  letters: LetterWire[];
  orders: OrderWire[];
}

export interface ApiErrorBody {
  error: { code: string; message: string };
}

// ── Karya (esai, cerpen, puisi, …) ─────────────────────────────────────────
// Isi karya (judul, jenis, teks) selalu terenkripsi; server hanya tahu
// penulis, status, lingkaran tujuan, dan waktu.

export const workStatus = z.enum(['draft', 'published']);
export type WorkStatus = z.infer<typeof workStatus>;

export const workBody = z.object({
  id,
  status: workStatus,
  circleIds: z.array(id).max(20).default([]),
  envelope: envelopeSchema,
});
export type WorkBody = z.infer<typeof workBody>;

export const workNoteBody = z.object({ id, envelope: envelopeSchema });

export interface WorkWire {
  id: string;
  authorId: string;
  status: WorkStatus;
  circleIds: string[];
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  reactions: { kind: ReactionKind; userId: string }[];
  noteCount: number;
  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

export interface WorkNoteWire {
  id: string;
  workId: string;
  authorId: string;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  createdAt: string;
}

// ── Janji temu ──────────────────────────────────────────────────────────────
// Isi janji (tempat, kegiatan, makanan, catatan) terenkripsi. Server hanya tahu
// lingkaran, waktu mulai (untuk pengingat), dan siapa ikut / sudah sampai.

export const meetRsvp = z.enum(['yes', 'maybe', 'no']);
export type MeetRsvp = z.infer<typeof meetRsvp>;
export const meetStatus = z.enum(['planned', 'done', 'cancelled']);
export type MeetStatus = z.infer<typeof meetStatus>;

export const meetBody = z.object({
  id,
  circleId: id,
  startsAt: z.string().datetime({ offset: true }),
  envelope: envelopeSchema,
});
export const meetUpdateBody = z.object({
  startsAt: z.string().datetime({ offset: true }).optional(),
  envelope: envelopeSchema.optional(),
  status: meetStatus.optional(),
});
export const meetRsvpBody = z.object({ rsvp: meetRsvp });
export const meetEntryKind = z.enum(['story', 'note', 'wish', 'photo']);
export type MeetEntryKind = z.infer<typeof meetEntryKind>;
export const meetEntryBody = z.object({
  id,
  kind: meetEntryKind,
  envelope: envelopeSchema,
  mediaIds: z.array(id).max(30).default([]),
});

export interface MeetMemberWire {
  userId: string;
  rsvp: MeetRsvp | null;
  arrivedAt: string | null;
  metAt: string | null;
}
export interface MeetEntryWire {
  id: string;
  authorId: string;
  kind: MeetEntryKind;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  mediaIds: string[];
  createdAt: string;
}
export interface MeetWire {
  id: string;
  circleId: string;
  creatorId: string;
  startsAt: string;
  status: MeetStatus;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  members: MeetMemberWire[];
  entries: MeetEntryWire[];
  /** Harapan rahasia terbuka setelah ≥2 orang menandai "ketemu" atau 12 jam lewat. */
  revealed: boolean;
  /** Ada harapan dari orang lain yang masih tersegel. */
  hiddenWishes: number;
  createdAt: string;
}

// ── Daftar Mimpi Bersama ────────────────────────────────────────────────────

export const dreamBody = z.object({ id, envelope: envelopeSchema });
export const dreamUpdateBody = z.object({
  envelope: envelopeSchema.optional(),
  done: z.boolean().optional(),
  meetId: id.nullable().optional(),
});
export interface DreamWire {
  id: string;
  circleId: string;
  authorId: string;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  meetId: string | null;
  doneAt: string | null;
  doneBy: string | null;
  /** Anggota yang menandai "aku juga mau" (pembuat otomatis termasuk). */
  likes: string[];
  createdAt: string;
}

// ── Papan Inspirasi ─────────────────────────────────────────────────────────

export const boardItemBody = z.object({ id, envelope: envelopeSchema, mediaIds: z.array(id).max(1).default([]) });
export const boardItemUpdateBody = z.object({ envelope: envelopeSchema.optional(), done: z.boolean().optional() });
export interface BoardItemWire {
  id: string;
  circleId: string;
  authorId: string;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  mediaIds: string[];
  /** Incaran yang sudah dibeli / ide yang sudah dicoba. */
  doneAt: string | null;
  createdAt: string;
}

// ── Photobox berdua ─────────────────────────────────────────────────────────

export const boothConfig = z.object({
  template: z.string().min(1).max(30),
  filter: z.string().min(1).max(30),
  shots: z.number().int().min(2).max(6),
  seed: z.number().int().min(0).max(1_000_000),
});
export type BoothConfig = z.infer<typeof boothConfig>;
export const boothCreateBody = z.object({ id, envelope: envelopeSchema, config: boothConfig });
export const boothUpdateBody = z.object({ config: boothConfig.optional(), ready: z.boolean().optional() });
export const boothFramesBody = z.object({ envelope: envelopeSchema, mediaIds: z.array(id).max(6) });
export interface BoothWire {
  id: string;
  circleId: string;
  hostId: string;
  guestId: string | null;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  config: BoothConfig;
  ready: string[];
  /** Jam mulai bersama (ISO), diisi saat keduanya siap dan tuan rumah menekan mulai. */
  startAt: string | null;
  /** Jam server saat respons dibuat, untuk menyamakan hitung mundur. */
  serverNow: string;
  /** Siapa yang punya pratinjau langsung, dan kapan terakhir diperbarui. */
  previews: Record<string, string>;
  frames: { userId: string; envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] }; mediaIds: string[] }[];
  createdAt: string;
}

// ── Berdua: bendera putih, tukar pena, tinta hilang ─────────────────────────

/** Teks terenkripsi kunci lingkaran, bentuk "e<epoch>:<ciphertext>". */
const circleEnc = z.string().min(4).max(24_000);

/** Bendera putih berkibar diam-diam selama ini sebelum turun sendiri. */
export const TRUCE_HOURS = 72;

export interface TruceState {
  /** Benderaku yang masih berkibar dan belum bertemu. Bendera orang lain tidak pernah terlihat. */
  mine: { raisedAt: string; expiresAt: string } | null;
  /** Saat-saat bendera kalian bertemu (terbaru dulu). */
  peace: { at: string; userIds: string[] }[];
}

export const swapBody = z.object({ id, month: z.string().regex(/^\d{4}-\d{2}$/), aboutId: id, enc: circleEnc });

export interface SwapWire {
  id: string;
  authorId: string;
  aboutId: string;
  /** null = masih terkunci: tulis punyamu dulu. */
  enc: string | null;
  createdAt: string;
}

export interface SwapState {
  month: string;
  mine: SwapWire | null;
  others: SwapWire[];
}

export const inkBody = z.object({ id, day: dayKey, enc: circleEnc });

export interface InkWire {
  id: string;
  authorId: string;
  day: DayKey;
  /** null = belum bisa dibaca: penulisnya sedang tidak di sini. */
  enc: string | null;
  /** Pertama kali terbaca bersama. */
  readAt: string | null;
  createdAt: string;
}

export interface InkLive {
  /** Anggota yang sedang membuka beranda lingkaran ini (termasuk kamu). */
  present: string[];
  inks: InkWire[];
}

/** Detak kehadiran dianggap basi setelah sekian detik. */
export const PRESENCE_TTL_SECONDS = 20;
export const INK_MAX_OPEN = 5;

/**
 * Tukar pena: siapa menulis hari siapa bulan ini. Duo saling menulis; di
 * lingkaran, tiap orang mendapat satu orang lain, bergeser tiap bulan.
 */
export function swapTarget(memberIds: string[], meId: string, month: string): string | null {
  const ids = [...new Set(memberIds)].sort();
  const i = ids.indexOf(meId);
  if (i < 0 || ids.length < 2) return null;
  const [y, m] = month.split('-').map(Number);
  const shift = 1 + (((y ?? 0) * 12 + (m ?? 0)) % (ids.length - 1));
  return ids[(i + shift) % ids.length]!;
}

// ── Hidup Orang Lain (cerita bersama) ───────────────────────────────────────

type Env = { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };

export const storyBody = z.object({
  id,
  circleId: id.nullable(),
  premise: z.string().min(1).max(40),
  members: z.array(id).max(5),
  rounds: z.union([z.literal(3), z.literal(6), z.literal(12)]).default(3),
  deck: z.enum(['awal', 'lengkap']).default('awal'),
  mode: z.enum(['terbuka', 'kejutan']).default('terbuka'),
  /** Kartu role: diundi langsung, atau pilih satu dari dua tawaran. */
  pick: z.boolean().default(false),
  /** Wajib untuk premis buatan sendiri ('bebas'). */
  meta: envelopeSchema.optional(),
  /** Palet pembuka (boleh, garis, tirai) dari pembuka cerita. */
  palette: envelopeSchema.optional(),
});
export const storyNoteBody = z.object({ id, reason: z.enum(['fakta', 'pengetahuan', 'sebab']), envelope: envelopeSchema });
export const storyResolveBody = z.object({ resolution: z.enum(['dua-perspektif', 'adegan-antara', 'pilih-fakta', 'misteri']) });
export const storyBranchBody = z.object({ round: z.number().int().min(1).max(12), envelope: envelopeSchema });
export const storyFactBody = z.object({ id, round: z.number().int().min(1).max(12), envelope: envelopeSchema, supersedes: id.nullable().default(null) });
export const storyVoteBody = z.object({ vote: z.enum(['setuju', 'tunda', 'batal']) });
export const storyReadBody = z.object({ id, kind: z.enum(['tafsir', 'tebak']), envelope: envelopeSchema });
export const storyFocusBody = z.object({ round: z.number().int().min(1).max(12), envelope: envelopeSchema });
export const storyEditionBody = z.object({
  order: z.array(z.string().max(200)).max(200),
  ending: z.array(z.string().max(200)).max(3),
  template: z.enum(['satu-jendela', 'dua-sisi', 'arsip']),
});
export const storyResearchBody = z.object({ id, envelope: envelopeSchema, mediaIds: z.array(id).max(4).default([]), shared: z.boolean().default(false), status: z.enum(['terbuka', 'terjawab', 'diperdebatkan']).default('terbuka') });
export const storyResearchPatch = z.object({ envelope: envelopeSchema.optional(), shared: z.boolean().optional(), status: z.enum(['terbuka', 'terjawab', 'diperdebatkan']).optional() });
const aiScene = z.object({ tokoh: z.string().max(60), waktu: z.string().max(80), text: z.string().max(6000) });
export const storyAiSummaryBody = z.object({ scenes: z.array(aiScene).min(1).max(60), facts: z.array(z.string().max(300)).max(60).default([]) });
export const storyAiTraceBody = z.object({ text: z.string().min(1).max(6000), tokoh: z.string().max(60), tokohs: z.array(z.string().max(60)).max(20) });
export interface StoryAiSummary {
  kejadian: { peristiwa: string; jenis: 'terjadi' | 'diyakini'; tokoh: string; adegan: number }[];
  sampul: string;
  satuHalaman: string;
}
export interface StoryAiTrace {
  usulan: { potongan: string; tahu: string[]; pertanyaan: string }[];
}
export interface StoryAiContinuity {
  temuan: { masalah: string; adegan: number[] }[];
}
export type StoryBody = z.infer<typeof storyBody>;

export const storyPartBody = z.object({
  round: z.number().int().min(1).max(12),
  /** Adegan penuh. */
  envelope: envelopeSchema,
  /** Kalimat serah-terima, jejak, dan opsi prompt: boleh dibaca lebih dulu daripada adegan. */
  handoff: envelopeSchema.optional(),
  /** Yang ingin penulis simpulkan pembaca: dilepas ke pembaca setelah ia menulis tafsirnya. */
  intent: envelopeSchema.optional(),
  /** Memakai keuntungan kartu role di bagian ini. */
  perk: z.boolean().default(false),
  seal: z.boolean(),
});
export type StoryPartBody = z.infer<typeof storyPartBody>;

export type StoryPhase = 'write' | 'read' | 'done';

export interface StoryPartWire {
  id: string;
  round: number;
  authorId: string;
  /** Adegan; kosong selama belum boleh dibaca (mode kejutan: sampai selesai). */
  envelope: Env | null;
  /** Serah-terima; kosong selama gelombangnya belum dibuka. */
  handoff: Env | null;
  /** Maksud penulis; kosong sampai pembaca menulis tafsirnya. */
  intent: Env | null;
  sealed: boolean;
  /** Siapa yang menyepakati jejak bagian ini (handshake cepat, versi lama). */
  agrees: string[];
  /** 'a' jalur utama; selain itu cabang "jalan lain". */
  world: string;
  perk: boolean;
  /** Berapa orang meminta adegan ini dibuat terjadi di luar layar (tanpa nama). */
  veils: number;
  veiledByMe: boolean;
}

export interface StoryNoteWire {
  id: string;
  partId: string;
  authorId: string;
  reason: 'fakta' | 'pengetahuan' | 'sebab';
  resolution: 'dua-perspektif' | 'adegan-antara' | 'pilih-fakta' | 'misteri' | null;
  envelope: Env;
}

export type StoryFactState = 'usul' | 'sah' | 'tunda' | 'diganti';
export interface StoryFactWire {
  id: string;
  round: number;
  authorId: string;
  envelope: Env;
  state: StoryFactState;
  agrees: string[];
  defers: string[];
  supersedes: string | null;
}

export interface StoryReadWire {
  id: string;
  partId: string;
  readerId: string;
  kind: 'tafsir' | 'tebak';
  envelope: Env;
}

export interface StoryResearchWire {
  id: string;
  authorId: string;
  envelope: Env;
  shared: boolean;
  status: 'terbuka' | 'terjawab' | 'diperdebatkan';
}

export interface StoryEdition {
  order: string[];
  ending: string[];
  template: 'satu-jendela' | 'dua-sisi' | 'arsip';
}

export interface StoryWire {
  id: string;
  circleId: string | null;
  ownerId: string;
  premise: string;
  round: number;
  phase: StoryPhase;
  members: string[];
  /** Selama permainan hanya role-mu sendiri; semua role terbuka saat selesai. */
  roles: Record<string, string>;
  /** Dua kartu yang ditawarkan kepadamu di babak ini (mode pilih). */
  offers: string[];
  /** Siapa yang siap lanjut dari ruang baca. */
  ready: string[];
  rounds: number;
  deck: 'awal' | 'lengkap';
  mode: 'terbuka' | 'kejutan';
  meta: Env | null;
  palette: Env[];
  /** Fokus tiap gelombang dari Lensa, terenkripsi. */
  focus: Record<string, Env>;
  skips: string[];
  /** Role babak-babak sebelumnya; hanya terisi saat selesai. */
  rolesLog: Record<string, string>[];
  notes: StoryNoteWire[];
  facts: StoryFactWire[];
  reads: StoryReadWire[];
  edition: StoryEdition | null;
  editionOk: string[];
  research: StoryResearchWire[];
  /** Penulis yang suaranya dibutuhkan untuk fakta dan edisi: yang menyegel di gelombang terakhir yang dibuka. */
  voters: string[];
  /** Penulis yang menyegel sendirian boleh lanjut tanpa yang lain mulai saat ini (ISO), atau null. */
  aloneAt: string | null;
  /** Keuntungan role-mu sudah dipakai di babak ini. */
  perkUsed: boolean;
  /** AI cloud boleh dipakai untuk cerita ini (semua anggota lingkaran setuju, atau cerita sendiri). */
  aiOk: boolean;
  parts: StoryPartWire[];
  createdAt: string;
  updatedAt: string;
}

// ── Studio Naskah ─────────────────────────────────────────────────────────────

export const naskahBody = z.object({ id, circleId: id.nullable(), members: z.array(id).max(8), meta: envelopeSchema });
export const naskahMetaBody = z.object({ meta: envelopeSchema });
export const naskahSceneBody = z.object({ id, chapter: z.number().int().min(1).max(200), order: z.number().min(-1e6).max(1e6), envelope: envelopeSchema, status: z.enum(['draf', 'terbit']).default('draf') });
export const naskahScenePatch = z.object({
  chapter: z.number().int().min(1).max(200).optional(),
  order: z.number().min(-1e6).max(1e6).optional(),
  envelope: envelopeSchema.optional(),
  status: z.enum(['draf', 'terbit']).optional(),
});
export const naskahCanonBody = z.object({ id, kind: z.enum(['tokoh', 'benda', 'tempat', 'fakta']), envelope: envelopeSchema });
export const naskahCanonPatch = z.object({ envelope: envelopeSchema });

export interface NaskahSceneWire {
  id: string;
  authorId: string;
  chapter: number;
  order: number;
  status: 'draf' | 'terbit';
  /** Null untuk draf orang lain: yang lain hanya tahu seseorang sedang menulis. */
  envelope: Env | null;
  version: number;
  updatedAt: string;
}
export interface NaskahCanonWire {
  id: string;
  kind: 'tokoh' | 'benda' | 'tempat' | 'fakta';
  authorId: string;
  updatedBy: string;
  envelope: Env;
  updatedAt: string;
}
export interface NaskahVersionWire {
  id: string;
  sceneId: string;
  version: number;
  envelope: Env;
  createdAt: string;
}
export interface NaskahWire {
  id: string;
  circleId: string | null;
  ownerId: string;
  members: string[];
  meta: Env;
  scenes: NaskahSceneWire[];
  canon: NaskahCanonWire[];
  createdAt: string;
  updatedAt: string;
}
