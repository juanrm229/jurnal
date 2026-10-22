/**
 * Surat Tersesat, Surat Wasiat Kecil / Kapsul Waktu, dan surat milestone.
 * Server menahan ciphertext sampai waktunya — penerima bahkan tidak tahu
 * Surat Tersesat sedang dalam perjalanan.
 */
import {
  addDays,
  circleDayNumber,
  COPY,
  createLetterBody,
  diffDays,
  type LetterWire,
  limitsFor,
  lostLetterDelayDays,
  MILESTONES,
} from '@sehari/core';
import { and, eq, inArray, isNull, or } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, say, type Services, type UserRow } from '../context';
import { schema } from '../db';
import { activeCircleIds, blockedWith, circleSettings, effectivePlan, membership, pushTo, requireMember, userToday } from '../lib/domain';
import { bad, conflict, forbidden, notFound, paymentRequired } from '../lib/errors';
import { randomUnit } from '../lib/ids';

const { letters, letterOpens, circles, media, users } = schema;
type LetterRow = typeof letters.$inferSelect;

function toWire(l: LetterRow, viewerId: string, opened: Set<string>): LetterWire {
  const delivered = !!l.deliveredAt;
  const isSender = l.fromUserId === viewerId;
  return {
    id: l.id,
    kind: l.kind as LetterWire['kind'],
    fromUserId: l.fromUserId,
    toUserId: l.toUserId,
    circleId: l.circleId,
    createdAt: l.createdAt.toISOString(),
    deliverOn: isSender && l.kind !== 'lost' ? l.deliverOn : null,
    deliveredAt: l.deliveredAt?.toISOString() ?? null,
    openedAt: l.toUserId ? (l.openedAt?.toISOString() ?? null) : opened.has(l.id) ? 'opened' : null,
    // Pengirim selalu bisa membaca suratnya sendiri; penerima setelah tiba.
    envelope: delivered || isSender ? { ciphertext: l.ciphertext, recipients: l.recipients as never } : null,
    mediaIds: delivered || isSender ? l.mediaIds : [],
    milestoneDays: l.milestoneDays,
  };
}

export async function lettersFor(s: Services, user: UserRow, box: 'inbox' | 'outbox' | 'all'): Promise<LetterWire[]> {
  const circleIds = await activeCircleIds(s, user.id);
  const blocked = await blockedWith(s, user.id);
  const conds = [];
  if (box !== 'inbox') conds.push(eq(letters.fromUserId, user.id));
  if (box !== 'outbox') {
    conds.push(eq(letters.toUserId, user.id));
    if (circleIds.length) conds.push(and(isNull(letters.toUserId), inArray(letters.circleId, circleIds))!);
  }
  const rows = await s.db.select().from(letters).where(or(...conds));
  const opens = await s.db.select().from(letterOpens).where(eq(letterOpens.userId, user.id));
  const opened = new Set(opens.map((o) => o.letterId));
  return rows
    .filter((l) => {
      if (l.fromUserId === user.id) return box !== 'inbox' || (l.toUserId === user.id && !!l.deliveredAt);
      return !!l.deliveredAt && !blocked.has(l.fromUserId);
    })
    .sort((a, b) => ((a.deliveredAt ?? a.createdAt) < (b.deliveredAt ?? b.createdAt) ? 1 : -1))
    .map((l) => toWire(l, user.id, opened));
}

export function letterRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.get('/', async (c) => c.json(await lettersFor(s, c.get('user'), (c.req.query('box') as 'inbox' | 'outbox') ?? 'inbox')));

  r.post('/', async (c) => {
    const input = await body(c, createLetterBody);
    const user = c.get('user');
    const today = userToday(user, s.now());
    const limits = limitsFor(effectivePlan(user, s.now()));
    let deliverOn: string | null = null;
    let milestone: number | null = null;

    if (input.circleId) {
      const { circle } = await requireMember(s, input.circleId, user.id);
      if (circle.status !== 'active' && circle.status !== 'memorial') throw conflict('circle_frozen', 'Lingkaran ini sudah dibekukan.');
      if (input.kind === 'lost' && !circleSettings(circle).lostLetters) throw forbidden('Surat Tersesat dimatikan di lingkaran ini.');
      if (input.kind === 'milestone') {
        if (!MILESTONES.some((m) => m.days === input.milestoneDays)) throw bad('milestone', 'Petak istimewa: 7, 30, 100, atau 365.');
        milestone = input.milestoneDays!;
        const target = addDays(circle.createdDay, milestone - 1);
        if (target <= today) throw bad('milestone_passed', 'Petak itu sudah dilewati.');
        deliverOn = target;
      }
    } else if (input.kind !== 'future') {
      throw bad('circle_required', 'Surat ini butuh lingkaran.');
    }
    if (input.toUserId && input.toUserId !== user.id) {
      if (!input.circleId) throw bad('circle_required', 'Surat untuk orang lain dikirim lewat lingkaran.');
      const m = await membership(s, input.circleId, input.toUserId);
      if (!m || m.state === 'left') throw notFound('Penerima tidak ditemukan.');
    }
    if (input.kind === 'future') {
      if (!input.deliverOn || input.deliverOn <= today) throw bad('deliver_on', 'Pilih tanggal di masa depan.');
      if (diffDays(input.deliverOn, today) > limits.timeCapsuleYears * 366) {
        throw paymentRequired('capsule_years', `Paket ini membuka surat masa depan hingga ${limits.timeCapsuleYears} tahun.`);
      }
      deliverOn = input.deliverOn;
    }
    if (input.kind === 'lost') {
      // Waktu tiba acak 1–12 bulan, dirahasiakan bahkan dari pengirim.
      deliverOn = addDays(today, lostLetterDelayDays(randomUnit));
    }
    if (input.mediaIds.length) {
      const owned = await s.db.select().from(media).where(and(inArray(media.id, input.mediaIds), eq(media.ownerId, user.id)));
      if (owned.length !== new Set(input.mediaIds).size) throw forbidden('Media tidak ditemukan.');
    }
    await s.db.insert(letters).values({
      id: input.id,
      kind: input.kind,
      fromUserId: user.id,
      toUserId: input.toUserId ?? (input.circleId ? null : user.id),
      circleId: input.circleId,
      ciphertext: input.envelope.ciphertext,
      recipients: input.envelope.recipients,
      mediaIds: input.mediaIds,
      deliverOn,
      milestoneDays: milestone,
    });
    return c.json({ id: input.id, status: 'dalam perjalanan' }, 201);
  });

  r.post('/:id/open', async (c) => {
    const user = c.get('user');
    const [l] = await s.db.select().from(letters).where(eq(letters.id, c.req.param('id')));
    if (!l || !l.deliveredAt) throw notFound();
    if (l.toUserId === user.id) {
      if (!l.openedAt) await s.db.update(letters).set({ openedAt: s.now() }).where(eq(letters.id, l.id));
    } else if (!l.toUserId && l.circleId && (await membership(s, l.circleId, user.id))?.state === 'active') {
      await s.db.insert(letterOpens).values({ letterId: l.id, userId: user.id }).onConflictDoNothing();
    } else throw notFound();
    return c.json({ ok: true });
  });

  return r;
}

/** Dipanggil penjadwal: antar surat yang sudah waktunya. */
export async function deliverDueLetters(s: Services): Promise<number> {
  const now = s.now();
  const pending = await s.db.select().from(letters).where(isNull(letters.deliveredAt));
  let n = 0;
  for (const l of pending) {
    if (!l.deliverOn) continue;
    // Hari dihitung menurut zona penerima (atau pengirim untuk surat lingkaran).
    const [who] = await s.db.select().from(users).where(eq(users.id, l.toUserId ?? l.fromUserId));
    const today = who ? userToday(who, now) : now.toISOString().slice(0, 10);
    if (l.deliverOn > today) continue;
    if (l.milestoneDays && l.circleId) {
      const [circle] = await s.db.select().from(circles).where(eq(circles.id, l.circleId));
      if (circle && circleDayNumber(circle.createdDay, today) < l.milestoneDays) continue;
    }
    await s.db.update(letters).set({ deliveredAt: now, notifiedAt: now }).where(eq(letters.id, l.id));
    n++;
    let targets: string[] = [];
    if (l.toUserId) targets = [l.toUserId];
    else if (l.circleId) {
      const ms = await s.db.select().from(schema.circleMembers).where(and(eq(schema.circleMembers.circleId, l.circleId), eq(schema.circleMembers.state, 'active')));
      targets = ms.map((m) => m.userId);
    }
    const text = l.kind === 'lost' ? say(COPY.notifications.lostLetterArrived) : say(COPY.notifications.timeCapsuleOpened);
    await pushTo(s, targets, { body: text, data: { type: 'letter', letterId: l.id } }, 'notifyLetters');
  }
  return n;
}
