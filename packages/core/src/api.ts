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
  autoWeather: boolean;
  autoCity: boolean;
  autoSteps: boolean;
  autoTopSong: boolean;
  gallerySuggestions: boolean;
  /** Kapsul Indonesia: sumbang warna mood anonim per provinsi. */
  moodPulse: boolean;
  theme: 'system' | 'light' | 'dark';
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
  sunsetSeal: true,
  sealHour: 21,
  morningCard: true,
  notifyPartnerSealed: true,
  notifyWraps: true,
  notifyLetters: true,
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
      autoWeather: z.boolean(),
      autoCity: z.boolean(),
      autoSteps: z.boolean(),
      autoTopSong: z.boolean(),
      gallerySuggestions: z.boolean(),
      moodPulse: z.boolean(),
      theme: z.enum(['system', 'light', 'dark']),
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

export const pushTokenBody = z.object({ token: z.string().max(300), platform: z.enum(['ios', 'android', 'web']) });

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
    'expedition', 'last_line', 'silent', 'auto', 'blackout', 'prologue', 'epilogue',
  ]),
  audience: z.enum(['self', 'circle', 'person', 'time_capsule']),
  circleIds: z.array(id).max(50).default([]),
  personId: id.optional(),
  unlockOn: dayKey.optional(),
  envelope: envelopeSchema,
  mediaIds: z.array(id).max(10).default([]),
  meta: z
    .object({
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

export interface DropWire {
  id: string;
  authorId: string;
  day: DayKey;
  kind: DropKind;
  audience: Audience;
  circleIds: string[];
  personId: string | null;
  unlockOn: DayKey | null;
  createdAt: string;
  envelope: { ciphertext: string; recipients: z.infer<typeof recipientWire>[] };
  mediaIds: string[];
  meta: DropMeta;
  reactions: { kind: ReactionKind; userId: string }[];
  footnotes: FootnoteWire[];
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
  reason: 'not_sealed' | 'time_capsule' | 'split' | 'secret_card';
  unlockOn: DayKey | null;
}

export interface MyDay {
  day: DayKey;
  sealedAt: string | null;
  sealable: boolean;
  drops: DropWire[];
  frozen: boolean;
}

export const sealBody = z.object({
  /** Kalimat Terakhir & warna mood — dikirim sebagai Drop biasa bersamaan. */
  lastLine: createDropBody.optional(),
  tz: z.string().max(64),
});

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
}

export const reactionParams = z.object({ kind: z.enum(['hug', 'me_too', 'candle', 'here']) });

export const footnoteBody = z.object({ id, envelope: envelopeSchema });
export const footnotePrintBody = z.object({ includeInPrint: z.boolean() });

// ── Pembeku streak ──────────────────────────────────────────────────────────

export const useFreezeBody = z.object({ day: dayKey });
export const giftFreezeBody = z.object({ toUserId: id, note: z.string().max(140).optional() });

// ── Surat ───────────────────────────────────────────────────────────────────

export const createLetterBody = z.object({
  id,
  kind: z.enum(['lost', 'future', 'milestone']),
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
