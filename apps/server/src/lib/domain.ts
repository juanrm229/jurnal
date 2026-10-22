/**
 * Kueri & aturan bersama yang dipakai banyak rute.
 */
import {
  type CircleKind,
  type CircleMember,
  type CircleSettings,
  type CircleSummary,
  DEFAULT_CIRCLE_SETTINGS,
  DEFAULT_USER_SETTINGS,
  type DropWire,
  type MeUser,
  type PlanCode,
  type StreakMember,
  limitsFor,
  monthKey,
  streakSummary,
  todayIn,
  type UserSettings,
} from '@sehari/core';
import { and, eq, inArray, isNotNull, or } from 'drizzle-orm';
import type { Services, UserRow } from '../context';
import { iso } from '../context';
import { schema } from '../db';
import { forbidden, notFound } from './errors';
import type { PushMessage } from './push';

const { users, circles, circleMembers, circleKeys, capsules, freezes, blocks, sessions, entitlements, reactions, footnotes, dropRecipients, dropCircles } = schema;

export type CircleRow = typeof circles.$inferSelect;
export type MemberRow = typeof circleMembers.$inferSelect;
export type DropRow = typeof schema.drops.$inferSelect;

export function effectivePlan(u: Pick<UserRow, 'plan' | 'planUntil'>, now: Date): PlanCode {
  if (u.plan === 'free') return 'free';
  if (u.planUntil && u.planUntil.getTime() < now.getTime()) return 'free';
  return u.plan as PlanCode;
}

export function userSettings(u: UserRow): UserSettings {
  return { ...DEFAULT_USER_SETTINGS, ...(u.settings ?? {}) };
}

export function toMeUser(u: UserRow, now: Date): MeUser {
  return {
    id: u.id,
    email: u.email,
    penName: u.penName,
    doodle: u.doodle,
    birthYear: u.birthYear,
    birthday: u.birthday,
    tz: u.tz,
    cityId: u.cityId,
    homeCityId: u.homeCityId,
    publicKey: u.publicKey,
    plan: effectivePlan(u, now),
    planUntil: iso(u.planUntil),
    settings: userSettings(u),
    createdAt: u.createdAt.toISOString(),
  };
}

/** Hari aktif pengguna (sebelum 04.00 masih dihitung kemarin). */
export function userToday(u: Pick<UserRow, 'tz'>, now: Date): string {
  return todayIn(u.tz, now, true);
}

export async function getUser(s: Services, id: string): Promise<UserRow> {
  const [u] = await s.db.select().from(users).where(eq(users.id, id));
  if (!u || u.deletedAt) throw notFound('Pengguna tidak ditemukan.');
  return u;
}

export async function getCircle(s: Services, id: string): Promise<CircleRow> {
  const [c] = await s.db.select().from(circles).where(eq(circles.id, id));
  if (!c) throw notFound('Lingkaran tidak ditemukan.');
  return c;
}

export async function membership(s: Services, circleId: string, userId: string): Promise<MemberRow | undefined> {
  const [m] = await s.db
    .select()
    .from(circleMembers)
    .where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.userId, userId)));
  return m;
}

/** Anggota aktif saja yang boleh membaca & menulis. */
export async function requireMember(s: Services, circleId: string, userId: string): Promise<{ circle: CircleRow; member: MemberRow }> {
  const circle = await getCircle(s, circleId);
  const member = await membership(s, circleId, userId);
  if (!member || member.state !== 'active') throw forbidden('Kamu bukan anggota lingkaran ini.');
  return { circle, member };
}

export function circleSettings(c: CircleRow): CircleSettings {
  return { ...DEFAULT_CIRCLE_SETTINGS, ...(c.settings ?? {}) };
}

export async function activeCircleIds(s: Services, userId: string): Promise<string[]> {
  const rows = await s.db
    .select({ id: circleMembers.circleId })
    .from(circleMembers)
    .where(and(eq(circleMembers.userId, userId), eq(circleMembers.state, 'active')));
  return rows.map((r) => r.id);
}

export async function sealedDays(s: Services, userIds: string[]): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>(userIds.map((u) => [u, new Set()]));
  if (!userIds.length) return out;
  const rows = await s.db
    .select({ userId: capsules.userId, day: capsules.day })
    .from(capsules)
    .where(and(inArray(capsules.userId, userIds), isNotNull(capsules.sealedAt)));
  for (const r of rows) out.get(r.userId)?.add(r.day);
  return out;
}

export async function frozenDays(s: Services, userIds: string[]): Promise<Map<string, Set<string>>> {
  const out = new Map<string, Set<string>>(userIds.map((u) => [u, new Set()]));
  if (!userIds.length) return out;
  const rows = await s.db
    .select({ userId: freezes.userId, day: freezes.day })
    .from(freezes)
    .where(and(inArray(freezes.userId, userIds), eq(freezes.kind, 'used')));
  for (const r of rows) if (r.day) out.get(r.userId)?.add(r.day);
  return out;
}

export async function circleMembersWithUsers(s: Services, circleIds: string[]) {
  if (!circleIds.length) return [];
  return s.db
    .select({ m: circleMembers, u: users })
    .from(circleMembers)
    .innerJoin(users, eq(users.id, circleMembers.userId))
    .where(inArray(circleMembers.circleId, circleIds));
}

export function toStreakMembers(
  members: { m: MemberRow }[],
  sealed: Map<string, Set<string>>,
  frozen: Map<string, Set<string>>,
): StreakMember[] {
  return members
    .filter(({ m }) => m.state !== 'left' || m.leftDay)
    .map(({ m }) => ({
      userId: m.userId,
      joinedDay: m.joinedDay,
      untilDay: m.state === 'active' ? undefined : (m.leftDay ?? undefined),
      sealed: sealed.get(m.userId) ?? new Set(),
      frozen: frozen.get(m.userId) ?? new Set(),
    }));
}

export async function circleSummaries(s: Services, viewer: UserRow, circleIds: string[]): Promise<CircleSummary[]> {
  if (!circleIds.length) return [];
  const now = s.now();
  const today = userToday(viewer, now);
  const circleRows = await s.db.select().from(circles).where(inArray(circles.id, circleIds));
  const memberRows = await circleMembersWithUsers(s, circleIds);
  const allUserIds = [...new Set(memberRows.map((r) => r.m.userId))];
  const [sealed, frozen] = await Promise.all([sealedDays(s, allUserIds), frozenDays(s, allUserIds)]);
  const keys = await s.db
    .select()
    .from(circleKeys)
    .where(and(inArray(circleKeys.circleId, circleIds), eq(circleKeys.userId, viewer.id)));

  return circleRows
    .map((c) => {
      const ms = memberRows.filter((r) => r.m.circleId === c.id);
      const members: CircleMember[] = ms.map(({ m, u }) => ({
        userId: u.id,
        penName: u.penName ?? 'tanpa nama',
        doodle: u.doodle,
        publicKey: u.publicKey ?? '',
        role: m.role as CircleMember['role'],
        state: m.state as CircleMember['state'],
        joinedAt: m.joinedAt.toISOString(),
        joinedDay: m.joinedDay,
        leftDay: m.leftDay,
        plan: effectivePlan(u, now),
        birthday: u.birthday,
        cityId: u.cityId,
        tz: u.tz,
      }));
      const streakMembers = toStreakMembers(ms, sealed, frozen);
      const streak = streakSummary(streakMembers, c.kind as CircleKind, today);
      const todaySealed: Record<string, boolean> = {};
      for (const m of members) if (m.state === 'active') todaySealed[m.userId] = sealed.get(m.userId)?.has(today) ?? false;
      return {
        id: c.id,
        kind: c.kind as CircleKind,
        status: c.status as CircleSummary['status'],
        nameEnc: c.nameEnc,
        doodle: c.doodle,
        settings: circleSettings(c),
        createdAt: c.createdAt.toISOString(),
        createdDay: c.createdDay,
        currentEpoch: c.currentEpoch,
        rotationNeeded: c.rotationNeeded,
        members,
        myKeys: keys.filter((k) => k.circleId === c.id).map((k) => ({ epoch: k.epoch, wk: k.wk })),
        streak,
        todaySealed,
        moment: c.momentStartsOn && c.momentEndsOn ? { startsOn: c.momentStartsOn, endsOn: c.momentEndsOn, tier: (c.momentTier ?? 'coba') as never } : null,
        plusUnlocked: members.some((m) => m.state === 'active' && limitsFor(m.plan).lore),
        aiConsent: ms.filter(({ m }) => m.state === 'active').map(({ m }) => ({ userId: m.userId, granted: m.aiConsent })),
        memorialLocked: c.memorialLocked,
      } satisfies CircleSummary;
    })
    .sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));
}

export async function blockedWith(s: Services, userId: string): Promise<Set<string>> {
  const rows = await s.db
    .select()
    .from(blocks)
    .where(or(eq(blocks.blockerId, userId), eq(blocks.blockedId, userId)));
  return new Set(rows.map((r) => (r.blockerId === userId ? r.blockedId : r.blockerId)));
}

export async function ownedDecks(s: Services, userId: string): Promise<string[]> {
  const rows = await s.db.select().from(entitlements).where(eq(entitlements.userId, userId));
  return rows.filter((r) => r.code.startsWith('deck_')).map((r) => r.code.slice(5));
}

export async function freezeState(s: Services, user: UserRow) {
  const month = monthKey(userToday(user, s.now()));
  const rows = await s.db
    .select()
    .from(freezes)
    .where(and(eq(freezes.userId, user.id), eq(freezes.month, month)));
  const perMonth = limitsFor(effectivePlan(user, s.now())).freezesPerMonth;
  const used = rows.filter((r) => r.kind === 'used').length;
  const received = rows.filter((r) => r.kind === 'gift_received').length;
  const gifted = rows.filter((r) => r.kind === 'gift_sent').length;
  return { month, perMonth, used, received, gifted, left: Math.max(0, perMonth + received - used - gifted) };
}

export async function pushTo(s: Services, userIds: string[], msg: Omit<PushMessage, 'to'>, pref?: keyof UserSettings): Promise<void> {
  if (!userIds.length) return;
  const rows = await s.db
    .select({ token: sessions.pushToken, settings: users.settings })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(inArray(sessions.userId, userIds), isNotNull(sessions.pushToken)));
  const messages = rows
    .filter((r) => !pref || ({ ...DEFAULT_USER_SETTINGS, ...(r.settings ?? {}) } as UserSettings)[pref] !== false)
    .map((r) => ({ ...msg, to: r.token! }));
  await s.pusher.send(messages);
}

/** Susun DropWire lengkap (penerima, reaksi, catatan kaki) untuk sekumpulan Drop. */
export async function hydrateDrops(
  s: Services,
  rows: DropRow[],
  viewerId: string,
  opts: { hidden?: Set<string>; viewerCircles?: Set<string> } = {},
): Promise<DropWire[]> {
  if (!rows.length) return [];
  const hidden = opts.hidden ?? new Set<string>();
  const viewerCircles = opts.viewerCircles ?? new Set(await activeCircleIds(s, viewerId));
  // Penulis selalu boleh melihat semua lingkaran tempat Drop-nya tinggal.
  const visibleCircle = (d: DropRow, circleId: string) => d.authorId === viewerId || viewerCircles.has(circleId);
  const ids = rows.map((r) => r.id);
  const [recips, reacts, notes, circlesOf] = await Promise.all([
    s.db.select().from(dropRecipients).where(inArray(dropRecipients.dropId, ids)),
    s.db.select().from(reactions).where(inArray(reactions.dropId, ids)),
    s.db.select().from(footnotes).where(inArray(footnotes.dropId, ids)),
    s.db.select().from(dropCircles).where(inArray(dropCircles.dropId, ids)),
  ]);
  return rows.map((d) => ({
    id: d.id,
    authorId: d.authorId,
    day: d.day,
    kind: d.kind as DropWire['kind'],
    audience: d.audience as DropWire['audience'],
    circleIds: circlesOf.filter((x) => x.dropId === d.id && visibleCircle(d, x.circleId)).map((x) => x.circleId),
    personId: d.personId,
    unlockOn: d.unlockOn,
    createdAt: d.createdAt.toISOString(),
    envelope: {
      ciphertext: d.ciphertext,
      // Hanya bungkus kunci yang relevan untuk pembaca ini yang dikirim.
      recipients: recips
        .filter((r) => r.dropId === d.id && (r.circleId ? visibleCircle(d, r.circleId) : r.userId === viewerId))
        .sort((a, b) => a.seq - b.seq)
        .map((r) =>
          r.circleId
            ? { t: 'circle' as const, circleId: r.circleId, epoch: r.epoch ?? 1, wk: r.wk }
            : { t: 'user' as const, userId: r.userId!, wk: r.wk },
        ),
    },
    mediaIds: d.mediaIds,
    meta: d.meta,
    reactions: reacts.filter((r) => r.dropId === d.id && !hidden.has(r.userId)).map((r) => ({ kind: r.kind as never, userId: r.userId })),
    footnotes: notes
      .filter((n) => n.dropId === d.id && !hidden.has(n.authorId))
      .map((n) => ({
        id: n.id,
        dropId: n.dropId,
        authorId: n.authorId,
        envelope: { ciphertext: n.ciphertext, recipients: n.recipients as never },
        includeInPrint: n.includeInPrint,
        createdAt: n.createdAt.toISOString(),
      })),
  }));
}
