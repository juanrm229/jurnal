/**
 * Skema Postgres. Server hanya menyimpan:
 * - metadata yang dibutuhkan untuk aturan (siapa, kapan, ke lingkaran mana, segel)
 * - ciphertext + daftar penerima kunci
 * Isi tulisan, foto, suara, nama lingkaran, judul bab, julukan — semuanya terenkripsi.
 */

import {
  boolean,
  customType,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type { CircleSettings, DropMeta, UserSettings } from '@sehari/core';

const ts = (name: string) => timestamp(name, { withTimezone: true, mode: 'date' });
const day = (name: string) => date(name, { mode: 'string' });

export const users = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    penName: text('pen_name'),
    doodle: text('doodle').notNull().default('tunas'),
    birthYear: integer('birth_year'),
    birthday: text('birthday'),
    tz: text('tz').notNull().default('Asia/Jakarta'),
    cityId: text('city_id'),
    homeCityId: text('home_city_id'),
    publicKey: text('public_key'),
    keyBackup: jsonb('key_backup'),
    plan: text('plan').notNull().default('free'),
    planUntil: ts('plan_until'),
    settings: jsonb('settings').$type<Partial<UserSettings>>().notNull().default({}),
    isAdmin: boolean('is_admin').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
    deletedAt: ts('deleted_at'),
  },
  (t) => [uniqueIndex('users_email_idx').on(t.email)],
);

export const authCodes = pgTable('auth_codes', {
  email: text('email').primaryKey(),
  codeHash: text('code_hash').notNull(),
  expiresAt: ts('expires_at').notNull(),
  attempts: integer('attempts').notNull().default(0),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const sessions = pgTable(
  'sessions',
  {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull(),
    deviceName: text('device_name').notNull(),
    platform: text('platform').notNull(),
    pushToken: text('push_token'),
    createdAt: ts('created_at').notNull().defaultNow(),
    lastUsedAt: ts('last_used_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('sessions_token_idx').on(t.tokenHash), index('sessions_user_idx').on(t.userId)],
);

export const deviceLinks = pgTable('device_links', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ephemeralPublicKey: text('ephemeral_public_key').notNull(),
  deviceName: text('device_name').notNull(),
  payload: text('payload'),
  approvedAt: ts('approved_at'),
  expiresAt: ts('expires_at').notNull(),
});

export const circles = pgTable('circles', {
  id: text('id').primaryKey(),
  kind: text('kind').notNull(),
  status: text('status').notNull().default('active'),
  nameEnc: text('name_enc').notNull(),
  doodle: text('doodle').notNull().default('tunas'),
  settings: jsonb('settings').$type<CircleSettings>().notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  createdDay: day('created_day').notNull(),
  currentEpoch: integer('current_epoch').notNull().default(1),
  rotationNeeded: boolean('rotation_needed').notNull().default(false),
  momentStartsOn: day('moment_starts_on'),
  momentEndsOn: day('moment_ends_on'),
  momentTier: text('moment_tier'),
  memorialLocked: boolean('memorial_locked').notNull().default(false),
});

export const circleMembers = pgTable(
  'circle_members',
  {
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    role: text('role').notNull().default('member'),
    state: text('state').notNull().default('active'),
    joinedAt: ts('joined_at').notNull().defaultNow(),
    joinedDay: day('joined_day').notNull(),
    leftDay: day('left_day'),
    aiConsent: boolean('ai_consent').notNull().default(false),
    /** Anggota yang mengonfirmasi Mode Kenangan untuk orang ini. */
    memorialVotes: jsonb('memorial_votes').$type<string[]>().notNull().default([]),
    /** Lingkaran ini mendapat halaman harian tersendiri dari anggota ini. */
    ownPage: boolean('own_page').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.userId] }), index('members_user_idx').on(t.userId)],
);

export const circleKeys = pgTable(
  'circle_keys',
  {
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    epoch: integer('epoch').notNull(),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    wk: text('wk').notNull(),
    createdBy: text('created_by').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.epoch, t.userId] })],
);

export const invites = pgTable('invites', {
  token: text('token').primaryKey(),
  circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  createdBy: text('created_by').notNull(),
  bundle: text('bundle').notNull(),
  proof: text('proof').notNull(),
  maxUses: integer('max_uses').notNull().default(1),
  uses: integer('uses').notNull().default(0),
  expiresAt: ts('expires_at').notNull(),
  revokedAt: ts('revoked_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const nicknames = pgTable(
  'nicknames',
  {
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    giverId: text('giver_id').notNull(),
    targetId: text('target_id').notNull(),
    nicknameEnc: text('nickname_enc').notNull(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.giverId, t.targetId] })],
);

export const capsules = pgTable(
  'capsules',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    day: day('day').notNull(),
    tz: text('tz').notNull(),
    /** Segel halaman utama. */
    sealedAt: ts('sealed_at'),
    /** true = segel ini dicatat per lingkaran di circle_seals; false = data lama (berlaku untuk semua lingkaran). */
    scoped: boolean('scoped').notNull().default(false),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day] })],
);

/** Segel per lingkaran: halaman utama mencatat semua lingkaran yang ia jangkau; halaman terpisah mencatat lingkarannya. */
export const circleSeals = pgTable(
  'circle_seals',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    day: day('day').notNull(),
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    sealedAt: ts('sealed_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.day, t.circleId] }), index('circle_seals_circle_idx').on(t.circleId, t.day)],
);

export const drops = pgTable(
  'drops',
  {
    id: text('id').primaryKey(),
    authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    day: day('day').notNull(),
    kind: text('kind').notNull(),
    audience: text('audience').notNull(),
    /** Halaman terpisah untuk satu lingkaran; null = halaman utama. */
    pageCircleId: text('page_circle_id'),
    personId: text('person_id'),
    unlockOn: day('unlock_on'),
    ciphertext: text('ciphertext').notNull(),
    meta: jsonb('meta').$type<DropMeta>().notNull().default({}),
    mediaIds: jsonb('media_ids').$type<string[]>().notNull().default([]),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('drops_author_day_idx').on(t.authorId, t.day), index('drops_day_idx').on(t.day)],
);

/** Lingkaran tempat sebuah Drop tinggal (untuk audiens circle, person, time_capsule). */
export const dropCircles = pgTable(
  'drop_circles',
  {
    dropId: text('drop_id').notNull().references(() => drops.id, { onDelete: 'cascade' }),
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    day: day('day').notNull(),
    authorId: text('author_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.dropId, t.circleId] }), index('drop_circles_circle_day_idx').on(t.circleId, t.day)],
);

/** Penerima kunci DEK per Drop: satu baris per orang atau per lingkaran. */
export const dropRecipients = pgTable(
  'drop_recipients',
  {
    dropId: text('drop_id').notNull().references(() => drops.id, { onDelete: 'cascade' }),
    seq: integer('seq').notNull(),
    circleId: text('circle_id'),
    userId: text('user_id'),
    epoch: integer('epoch'),
    wk: text('wk').notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.dropId, t.seq] }),
    index('recipients_circle_idx').on(t.circleId),
    index('recipients_user_idx').on(t.userId),
  ],
);

export const reactions = pgTable(
  'reactions',
  {
    dropId: text('drop_id').notNull().references(() => drops.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.dropId, t.userId, t.kind] })],
);

export const footnotes = pgTable('footnotes', {
  id: text('id').primaryKey(),
  dropId: text('drop_id').notNull().references(() => drops.id, { onDelete: 'cascade' }),
  authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  ciphertext: text('ciphertext').notNull(),
  recipients: jsonb('recipients').notNull(),
  includeInPrint: boolean('include_in_print').notNull().default(false),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const media = pgTable('media', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  storageKey: text('storage_key').notNull(),
  size: integer('size').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const freezes = pgTable(
  'freezes',
  {
    id: text('id').primaryKey(),
    /** Pemilik pembeku saat ini. */
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    /** 'used' | 'gift_sent' | 'gift_received' */
    kind: text('kind').notNull(),
    day: day('day'),
    otherUserId: text('other_user_id'),
    note: text('note'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('freezes_user_month_idx').on(t.userId, t.month)],
);

export const letters = pgTable(
  'letters',
  {
    id: text('id').primaryKey(),
    kind: text('kind').notNull(),
    fromUserId: text('from_user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    toUserId: text('to_user_id'),
    circleId: text('circle_id'),
    ciphertext: text('ciphertext').notNull(),
    recipients: jsonb('recipients').notNull(),
    mediaIds: jsonb('media_ids').$type<string[]>().notNull().default([]),
    deliverOn: day('deliver_on'),
    milestoneDays: integer('milestone_days'),
    deliveredAt: ts('delivered_at'),
    notifiedAt: ts('notified_at'),
    openedAt: ts('opened_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('letters_to_idx').on(t.toUserId), index('letters_circle_idx').on(t.circleId)],
);

/** Penanda "sudah dibuka" per penerima untuk surat ke seluruh lingkaran. */
export const letterOpens = pgTable(
  'letter_opens',
  {
    letterId: text('letter_id').notNull().references(() => letters.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    openedAt: ts('opened_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.letterId, t.userId] })],
);

export const chapters = pgTable(
  'chapters',
  {
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    titleEnc: text('title_enc'),
    winningProposalId: text('winning_proposal_id'),
    closedAt: ts('closed_at'),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.month] })],
);

export const chapterProposals = pgTable('chapter_proposals', {
  id: text('id').primaryKey(),
  circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  month: text('month').notNull(),
  userId: text('user_id').notNull(),
  titleEnc: text('title_enc').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const chapterVotes = pgTable(
  'chapter_votes',
  {
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    month: text('month').notNull(),
    userId: text('user_id').notNull(),
    proposalId: text('proposal_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.month, t.userId] })],
);

export const scenes = pgTable(
  'scenes',
  {
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    week: text('week').notNull(),
    penHolderId: text('pen_holder_id').notNull(),
    titleEnc: text('title_enc'),
    cardId: text('card_id'),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.week] })],
);

export const volumes = pgTable(
  'volumes',
  {
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    genreId: text('genre_id'),
    coverDoodle: text('cover_doodle'),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.year] })],
);

export const genreVotes = pgTable(
  'genre_votes',
  {
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    year: integer('year').notNull(),
    userId: text('user_id').notNull(),
    genreId: text('genre_id').notNull(),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.year, t.userId] })],
);

export const expeditions = pgTable('expeditions', {
  id: text('id').primaryKey(),
  circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  code: text('code').notNull(),
  startDay: day('start_day').notNull(),
  endDay: day('end_day').notNull(),
  startedBy: text('started_by').notNull(),
  completedAt: ts('completed_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const tokens = pgTable(
  'tokens',
  {
    id: text('id').primaryKey(),
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull(),
    code: text('code').notNull(),
    day: day('day').notNull(),
    dropId: text('drop_id'),
    awardedAt: ts('awarded_at').notNull().defaultNow(),
  },
  (t) => [uniqueIndex('tokens_unique_idx').on(t.circleId, t.userId, t.code, t.day)],
);

export const constellations = pgTable('constellations', {
  id: text('id').primaryKey(),
  circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  nameEnc: text('name_enc').notNull(),
  days: jsonb('days').$type<string[]>().notNull(),
  createdBy: text('created_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const dictionary = pgTable('dictionary', {
  id: text('id').primaryKey(),
  circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  termEnc: text('term_enc').notNull(),
  meaningEnc: text('meaning_enc').notNull(),
  addedBy: text('added_by').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const motifs = pgTable('motifs', {
  id: text('id').primaryKey(),
  circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  year: integer('year').notNull(),
  termEnc: text('term_enc').notNull(),
  addedBy: text('added_by').notNull(),
});

export const visits = pgTable(
  'visits',
  {
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    day: day('day').notNull(),
    lastVisitedOn: day('last_visited_on').notNull(),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.day] })],
);

export const diceRolls = pgTable(
  'dice_rolls',
  {
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    week: text('week').notNull(),
    day: day('day'),
    rolledBy: text('rolled_by').notNull(),
    rolledAt: ts('rolled_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.circleId, t.week] })],
);

export const moodPulse = pgTable(
  'mood_pulse',
  {
    day: day('day').notNull(),
    province: text('province').notNull(),
    mood: text('mood').notNull(),
    count: integer('count').notNull().default(0),
  },
  (t) => [primaryKey({ columns: [t.day, t.province, t.mood] })],
);

/** Pencegah hitung ganda; berisi HMAC (bukan id pengguna), dihapus setelah 2 hari. */
export const moodPulseDedupe = pgTable('mood_pulse_dedupe', {
  tag: text('tag').primaryKey(),
  day: day('day').notNull(),
});

export const publicWraps = pgTable('public_wraps', {
  slug: text('slug').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  data: jsonb('data').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
  revokedAt: ts('revoked_at'),
});

export const reports = pgTable('reports', {
  id: text('id').primaryKey(),
  reporterId: text('reporter_id').notNull(),
  targetUserId: text('target_user_id').notNull(),
  circleId: text('circle_id'),
  dropId: text('drop_id'),
  reason: text('reason').notNull(),
  note: text('note'),
  disclosedContent: text('disclosed_content'),
  status: text('status').notNull().default('open'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const blocks = pgTable(
  'blocks',
  {
    blockerId: text('blocker_id').notNull(),
    blockedId: text('blocked_id').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.blockerId, t.blockedId] })],
);

export const orders = pgTable('orders', {
  id: text('id').primaryKey(),
  userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  product: text('product').notNull(),
  amountIdr: integer('amount_idr').notNull(),
  status: text('status').notNull().default('pending'),
  provider: text('provider').notNull(),
  providerRef: text('provider_ref'),
  paymentUrl: text('payment_url'),
  meta: jsonb('meta').$type<Record<string, unknown>>().notNull().default({}),
  createdAt: ts('created_at').notNull().defaultNow(),
  paidAt: ts('paid_at'),
});

export const entitlements = pgTable(
  'entitlements',
  {
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    code: text('code').notNull(),
    grantedAt: ts('granted_at').notNull().defaultNow(),
    orderId: text('order_id'),
  },
  (t) => [primaryKey({ columns: [t.userId, t.code] })],
);

export const giftCodes = pgTable('gift_codes', {
  code: text('code').primaryKey(),
  product: text('product').notNull(),
  purchaserId: text('purchaser_id').notNull(),
  orderId: text('order_id').notNull(),
  redeemedBy: text('redeemed_by'),
  redeemedAt: ts('redeemed_at'),
  createdAt: ts('created_at').notNull().defaultNow(),
});

export const bookOrders = pgTable('book_orders', {
  orderId: text('order_id').primaryKey(),
  circleId: text('circle_id').notNull(),
  year: integer('year').notNull(),
  status: text('status').notNull().default('awaiting_file'),
  fileKey: text('file_key'),
  shipping: jsonb('shipping').notNull(),
  consentAt: ts('consent_at'),
});

export const seasonOverrides = pgTable('season_overrides', {
  key: text('key').primaryKey(),
  start: day('start').notNull(),
  end: day('end').notNull(),
  peak: day('peak'),
});

export const notificationLog = pgTable(
  'notification_log',
  {
    key: text('key').primaryKey(),
    sentAt: ts('sent_at').notNull().defaultNow(),
  },
);

export const rateLimits = pgTable('rate_limits', {
  key: text('key').primaryKey(),
  count: integer('count').notNull(),
  resetAt: ts('reset_at').notNull(),
});


const bytea = customType<{ data: Uint8Array; driverData: Buffer | Uint8Array }>({
  dataType: () => 'bytea',
  toDriver: (v) => Buffer.from(v),
  fromDriver: (v) => new Uint8Array(v),
});

/** Penyimpanan media di database (BLOB_STORE=db) — cukup untuk pemakaian pribadi. Isinya tetap ciphertext. */
export const blobs = pgTable('blobs', {
  key: text('key').primaryKey(),
  data: bytea('data').notNull(),
  createdAt: ts('created_at').notNull().defaultNow(),
});

// ── Karya ───────────────────────────────────────────────────────────────────

export const works = pgTable(
  'works',
  {
    id: text('id').primaryKey(),
    authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    status: text('status').notNull().default('draft'),
    envelope: jsonb('envelope').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
    publishedAt: ts('published_at'),
  },
  (t) => [index('works_author_idx').on(t.authorId)],
);

export const workCircles = pgTable(
  'work_circles',
  {
    workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.workId, t.circleId] }), index('work_circles_circle_idx').on(t.circleId)],
);

export const workReactions = pgTable(
  'work_reactions',
  {
    workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.workId, t.userId, t.kind] })],
);

export const workNotes = pgTable(
  'work_notes',
  {
    id: text('id').primaryKey(),
    workId: text('work_id').notNull().references(() => works.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    envelope: jsonb('envelope').notNull(),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('work_notes_work_idx').on(t.workId)],
);

// ── Janji temu ──────────────────────────────────────────────────────────────

export const meets = pgTable(
  'meets',
  {
    id: text('id').primaryKey(),
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    creatorId: text('creator_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    startsAt: ts('starts_at').notNull(),
    status: text('status').notNull().default('planned'),
    envelope: jsonb('envelope').notNull(),
    remindedDay: boolean('reminded_day').notNull().default(false),
    remindedSoon: boolean('reminded_soon').notNull().default(false),
    createdAt: ts('created_at').notNull().defaultNow(),
    updatedAt: ts('updated_at').notNull().defaultNow(),
  },
  (t) => [index('meets_circle_idx').on(t.circleId), index('meets_starts_idx').on(t.startsAt)],
);

export const meetMembers = pgTable(
  'meet_members',
  {
    meetId: text('meet_id').notNull().references(() => meets.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    rsvp: text('rsvp'),
    arrivedAt: ts('arrived_at'),
    metAt: ts('met_at'),
  },
  (t) => [primaryKey({ columns: [t.meetId, t.userId] })],
);

export const meetEntries = pgTable(
  'meet_entries',
  {
    id: text('id').primaryKey(),
    meetId: text('meet_id').notNull().references(() => meets.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    kind: text('kind').notNull(),
    envelope: jsonb('envelope').notNull(),
    mediaIds: jsonb('media_ids').$type<string[]>().notNull().default([]),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('meet_entries_meet_idx').on(t.meetId)],
);

// ── Daftar Mimpi Bersama ────────────────────────────────────────────────────

export const dreams = pgTable(
  'dreams',
  {
    id: text('id').primaryKey(),
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    envelope: jsonb('envelope').notNull(),
    /** Janji temu yang mewujudkan mimpi ini, bila ada. */
    meetId: text('meet_id').references(() => meets.id, { onDelete: 'set null' }),
    doneAt: ts('done_at'),
    doneBy: text('done_by'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('dreams_circle_idx').on(t.circleId)],
);

/** "Aku juga mau": siapa saja yang ikut memimpikannya. */
export const dreamLikes = pgTable(
  'dream_likes',
  {
    dreamId: text('dream_id').notNull().references(() => dreams.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
  },
  (t) => [primaryKey({ columns: [t.dreamId, t.userId] })],
);

// ── Papan Inspirasi ─────────────────────────────────────────────────────────

/** Moodboard lingkaran: foto, tautan, catatan, incaran. Isinya terenkripsi. */
export const boardItems = pgTable(
  'board_items',
  {
    id: text('id').primaryKey(),
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    authorId: text('author_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    envelope: jsonb('envelope').notNull(),
    mediaIds: jsonb('media_ids').$type<string[]>().notNull().default([]),
    doneAt: ts('done_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('board_items_circle_idx').on(t.circleId)],
);

// ── Photobox berdua jarak jauh ──────────────────────────────────────────────

/**
 * Satu sesi photobox untuk dua orang di lingkaran yang sama. Server hanya
 * menyimpan susunan (desain, jumlah jepretan) dan jam mulai bersama; kunci
 * pratinjau ada di dalam envelope terenkripsi untuk lingkaran.
 */
export const booths = pgTable(
  'booths',
  {
    id: text('id').primaryKey(),
    circleId: text('circle_id').notNull().references(() => circles.id, { onDelete: 'cascade' }),
    hostId: text('host_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    guestId: text('guest_id').references(() => users.id, { onDelete: 'cascade' }),
    envelope: jsonb('envelope').notNull(),
    config: jsonb('config').$type<{ template: string; filter: string; shots: number; seed: number }>().notNull(),
    ready: jsonb('ready').$type<string[]>().notNull().default([]),
    startAt: ts('start_at'),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [index('booths_circle_idx').on(t.circleId)],
);

/** Jepretan tiap orang: media terenkripsi + envelope berisi kuncinya. */
export const boothFrames = pgTable(
  'booth_frames',
  {
    boothId: text('booth_id').notNull().references(() => booths.id, { onDelete: 'cascade' }),
    userId: text('user_id').notNull().references(() => users.id, { onDelete: 'cascade' }),
    envelope: jsonb('envelope').notNull(),
    mediaIds: jsonb('media_ids').$type<string[]>().notNull().default([]),
    createdAt: ts('created_at').notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.boothId, t.userId] })],
);

// ── SIDIK (permainan detektif) ──────────────────────────────────────────────

/** Satu ruang permainan; seluruh keadaan disimpan sebagai JSON (bukan isi jurnal). */
export const sidikRooms = pgTable('sidik_rooms', {
  code: text('code').primaryKey(),
  state: jsonb('state').notNull(),
  updatedAt: ts('updated_at').notNull().defaultNow(),
});
