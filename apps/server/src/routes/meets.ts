/**
 * Janji temu: rencana kencan / kumpul di dalam lingkaran. Isi rencana dan
 * cerita sesudahnya terenkripsi; server hanya mengatur siapa ikut, siapa
 * sudah sampai, dan kapan harapan rahasia boleh dibuka.
 */
import { type MeetEntryWire, type MeetMemberWire, type MeetWire, meetBody, meetEntryBody, meetRsvpBody, meetUpdateBody } from '@sehari/core';
import { and, asc, desc, eq, gte, inArray, isNotNull, lte, sql } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { activeCircleIds, pushTo, requireMember } from '../lib/domain';
import { bad, forbidden, notFound } from '../lib/errors';

const { meets, meetMembers, meetEntries, circleMembers } = schema;
type MeetRow = typeof meets.$inferSelect;

const REVEAL_AFTER_MS = 12 * 3600_000;

export function isRevealed(m: MeetRow, members: { metAt: Date | null }[], now: Date): boolean {
  return members.filter((x) => x.metAt).length >= 2 || now.getTime() > m.startsAt.getTime() + REVEAL_AFTER_MS;
}

async function hydrate(s: Services, rows: MeetRow[], viewerId: string): Promise<MeetWire[]> {
  if (!rows.length) return [];
  const ids = rows.map((r) => r.id);
  const [mem, ents] = await Promise.all([
    s.db.select().from(meetMembers).where(inArray(meetMembers.meetId, ids)),
    s.db.select().from(meetEntries).where(inArray(meetEntries.meetId, ids)).orderBy(asc(meetEntries.createdAt)),
  ]);
  const now = s.now();
  return rows.map((r) => {
    const ms = mem.filter((m) => m.meetId === r.id);
    const revealed = isRevealed(r, ms, now);
    const all = ents.filter((e) => e.meetId === r.id);
    const visible = all.filter((e) => e.kind !== 'wish' || revealed || e.authorId === viewerId);
    return {
      id: r.id,
      circleId: r.circleId,
      creatorId: r.creatorId,
      startsAt: r.startsAt.toISOString(),
      status: r.status as MeetWire['status'],
      envelope: r.envelope as MeetWire['envelope'],
      members: ms.map<MeetMemberWire>((m) => ({ userId: m.userId, rsvp: (m.rsvp as MeetMemberWire['rsvp']) ?? null, arrivedAt: m.arrivedAt?.toISOString() ?? null, metAt: m.metAt?.toISOString() ?? null })),
      entries: visible.map<MeetEntryWire>((e) => ({ id: e.id, authorId: e.authorId, kind: e.kind as MeetEntryWire['kind'], envelope: e.envelope as MeetEntryWire['envelope'], mediaIds: e.mediaIds, createdAt: e.createdAt.toISOString() })),
      revealed,
      hiddenWishes: all.length - visible.length,
      createdAt: r.createdAt.toISOString(),
    };
  });
}

async function load(s: Services, id: string, userId: string): Promise<MeetRow> {
  const [m] = await s.db.select().from(meets).where(eq(meets.id, id));
  if (!m) throw notFound('Janji tidak ditemukan.');
  await requireMember(s, m.circleId, userId).catch(() => {
    throw notFound('Janji tidak ditemukan.');
  });
  return m;
}

async function circleUserIds(s: Services, circleId: string) {
  return (await s.db.select().from(circleMembers).where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.state, 'active')))).map((m) => m.userId);
}

/** Foto di cerita janji boleh dilihat anggota lingkaran janji itu. */
export async function canSeeMeetMedia(s: Services, userId: string, mediaId: string): Promise<boolean> {
  const rows = await s.db
    .select({ circleId: meets.circleId })
    .from(meetEntries)
    .innerJoin(meets, eq(meets.id, meetEntries.meetId))
    .where(sql`${meetEntries.mediaIds} @> ${JSON.stringify([mediaId])}::jsonb`);
  if (!rows.length) return false;
  const mine = await activeCircleIds(s, userId);
  return rows.some((r) => mine.includes(r.circleId));
}

export function meetRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.get('/meets', async (c) => {
    const user = c.get('user');
    const circles = await activeCircleIds(s, user.id);
    if (!circles.length) return c.json([]);
    const rows = await s.db.select().from(meets).where(inArray(meets.circleId, circles)).orderBy(desc(meets.startsAt)).limit(300);
    return c.json(await hydrate(s, rows, user.id));
  });

  r.get('/circles/:id/meets', async (c) => {
    const user = c.get('user');
    await requireMember(s, c.req.param('id'), user.id);
    const rows = await s.db.select().from(meets).where(eq(meets.circleId, c.req.param('id'))).orderBy(desc(meets.startsAt));
    return c.json(await hydrate(s, rows, user.id));
  });

  r.get('/meets/:id', async (c) => {
    const m = await load(s, c.req.param('id'), c.get('user').id);
    return c.json((await hydrate(s, [m], c.get('user').id))[0]);
  });

  r.post('/meets', async (c) => {
    const user = c.get('user');
    const input = await body(c, meetBody);
    await requireMember(s, input.circleId, user.id);
    const [dup] = await s.db.select().from(meets).where(eq(meets.id, input.id));
    if (dup) throw bad('duplicate', 'Janji ini sudah ada.');
    await s.db.insert(meets).values({ id: input.id, circleId: input.circleId, creatorId: user.id, startsAt: new Date(input.startsAt), envelope: input.envelope });
    const people = await circleUserIds(s, input.circleId);
    await s.db.insert(meetMembers).values(people.map((userId) => ({ meetId: input.id, userId, rsvp: userId === user.id ? 'yes' : null })));
    await pushTo(
      s,
      people.filter((x) => x !== user.id),
      { body: `${user.penName ?? 'Seseorang'} mengajakmu janjian. Buka untuk lihat ke mana dan kapan.`, data: { type: 'meet', meetId: input.id } },
      'notifyPartnerSealed',
    );
    const [m] = await s.db.select().from(meets).where(eq(meets.id, input.id));
    return c.json((await hydrate(s, [m!], user.id))[0], 201);
  });

  r.patch('/meets/:id', async (c) => {
    const user = c.get('user');
    const m = await load(s, c.req.param('id'), user.id);
    const input = await body(c, meetUpdateBody);
    // Siapa pun di lingkaran boleh menyunting rencana bersama.
    const set: Partial<MeetRow> = { updatedAt: s.now() };
    if (input.startsAt) {
      set.startsAt = new Date(input.startsAt);
      set.remindedDay = false;
      set.remindedSoon = false;
    }
    if (input.envelope) set.envelope = input.envelope;
    if (input.status) set.status = input.status;
    await s.db.update(meets).set(set).where(eq(meets.id, m.id));
    const [n] = await s.db.select().from(meets).where(eq(meets.id, m.id));
    return c.json((await hydrate(s, [n!], user.id))[0]);
  });

  r.delete('/meets/:id', async (c) => {
    const user = c.get('user');
    const m = await load(s, c.req.param('id'), user.id);
    if (m.creatorId !== user.id) throw forbidden('Hanya pembuat janji yang bisa menghapusnya.');
    await s.db.delete(meets).where(eq(meets.id, m.id));
    return c.json({ ok: true });
  });

  const member = async (meetId: string, userId: string) => {
    const [row] = await s.db.select().from(meetMembers).where(and(eq(meetMembers.meetId, meetId), eq(meetMembers.userId, userId)));
    if (!row) await s.db.insert(meetMembers).values({ meetId, userId });
  };

  r.put('/meets/:id/rsvp', async (c) => {
    const user = c.get('user');
    const m = await load(s, c.req.param('id'), user.id);
    const { rsvp } = await body(c, meetRsvpBody);
    await member(m.id, user.id);
    await s.db.update(meetMembers).set({ rsvp }).where(and(eq(meetMembers.meetId, m.id), eq(meetMembers.userId, user.id)));
    return c.json((await hydrate(s, [m], user.id))[0]);
  });

  /** "Aku sudah sampai" — memberi kabar ke yang lain. */
  r.post('/meets/:id/arrive', async (c) => {
    const user = c.get('user');
    const m = await load(s, c.req.param('id'), user.id);
    await member(m.id, user.id);
    await s.db.update(meetMembers).set({ arrivedAt: s.now() }).where(and(eq(meetMembers.meetId, m.id), eq(meetMembers.userId, user.id)));
    const others = (await s.db.select().from(meetMembers).where(eq(meetMembers.meetId, m.id))).filter((x) => x.userId !== user.id && x.rsvp !== 'no').map((x) => x.userId);
    await pushTo(s, others, { body: `${user.penName ?? 'Seseorang'} sudah sampai.`, data: { type: 'meet', meetId: m.id } }, 'notifyPartnerSealed');
    return c.json((await hydrate(s, [m], user.id))[0]);
  });

  /** "Kita ketemu" — saling menandai (tidak wajib). Dua tanda = bertemu. */
  r.post('/meets/:id/met', async (c) => {
    const user = c.get('user');
    const m = await load(s, c.req.param('id'), user.id);
    await member(m.id, user.id);
    const now = s.now();
    await s.db.update(meetMembers).set({ metAt: now }).where(and(eq(meetMembers.meetId, m.id), eq(meetMembers.userId, user.id)));
    const ms = await s.db.select().from(meetMembers).where(eq(meetMembers.meetId, m.id));
    if (ms.filter((x) => x.metAt).length >= 2 && m.status === 'planned') await s.db.update(meets).set({ status: 'done', updatedAt: now }).where(eq(meets.id, m.id));
    const [n] = await s.db.select().from(meets).where(eq(meets.id, m.id));
    return c.json((await hydrate(s, [n!], user.id))[0]);
  });

  r.delete('/meets/:id/met', async (c) => {
    const user = c.get('user');
    const m = await load(s, c.req.param('id'), user.id);
    await s.db.update(meetMembers).set({ metAt: null }).where(and(eq(meetMembers.meetId, m.id), eq(meetMembers.userId, user.id)));
    return c.json((await hydrate(s, [m], user.id))[0]);
  });

  r.post('/meets/:id/entries', async (c) => {
    const user = c.get('user');
    const m = await load(s, c.req.param('id'), user.id);
    const input = await body(c, meetEntryBody);
    if (input.mediaIds.length) {
      const own = await s.db.select().from(schema.media).where(inArray(schema.media.id, input.mediaIds));
      if (own.some((x) => x.ownerId !== user.id) || own.length !== input.mediaIds.length) throw forbidden('Foto ini bukan milikmu.');
    }
    await s.db.insert(meetEntries).values({ id: input.id, meetId: m.id, authorId: user.id, kind: input.kind, envelope: input.envelope, mediaIds: input.mediaIds });
    return c.json((await hydrate(s, [m], user.id))[0], 201);
  });

  r.delete('/meets/:id/entries/:entryId', async (c) => {
    const user = c.get('user');
    const m = await load(s, c.req.param('id'), user.id);
    const [e] = await s.db.select().from(meetEntries).where(eq(meetEntries.id, c.req.param('entryId')));
    if (!e || e.meetId !== m.id) throw notFound('Catatan tidak ditemukan.');
    if (e.authorId !== user.id) throw forbidden('Bukan catatanmu.');
    await s.db.delete(meetEntries).where(eq(meetEntries.id, e.id));
    return c.json((await hydrate(s, [m], user.id))[0]);
  });

  return r;
}

/** Pengingat: sehari sebelum dan dua jam sebelum janji. */
export async function remindMeets(s: Services) {
  const now = s.now();
  const soon = new Date(now.getTime() + 2 * 3600_000);
  const day = new Date(now.getTime() + 24 * 3600_000);
  const due = await s.db
    .select()
    .from(meets)
    .where(and(eq(meets.status, 'planned'), gte(meets.startsAt, now), lte(meets.startsAt, day), isNotNull(meets.startsAt)));
  for (const m of due) {
    const people = (await s.db.select().from(meetMembers).where(eq(meetMembers.meetId, m.id))).filter((x) => x.rsvp !== 'no').map((x) => x.userId);
    if (m.startsAt <= soon && !m.remindedSoon) {
      await s.db.update(meets).set({ remindedSoon: true, remindedDay: true }).where(eq(meets.id, m.id));
      await pushTo(s, people, { body: 'Dua jam lagi janji temu kalian. Jangan lupa bawa diri yang paling santai.', data: { type: 'meet', meetId: m.id } }, 'notifyPartnerSealed');
    } else if (!m.remindedDay) {
      await s.db.update(meets).set({ remindedDay: true }).where(eq(meets.id, m.id));
      await pushTo(s, people, { body: 'Besok ada janji temu. Sudah tahu mau pakai baju apa?', data: { type: 'meet', meetId: m.id } }, 'notifyPartnerSealed');
    }
  }
}
