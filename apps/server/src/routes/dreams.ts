/**
 * Daftar Mimpi Bersama: bucket list sebuah lingkaran. Isi mimpi terenkripsi
 * dengan kunci lingkaran; server hanya tahu siapa menulis, siapa "ikut mau",
 * janji temu mana yang mewujudkannya, dan kapan ditandai terwujud.
 */
import { type DreamWire, dreamBody, dreamUpdateBody } from '@sehari/core';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { pushTo, requireMember } from '../lib/domain';
import { bad, forbidden, notFound } from '../lib/errors';

const { dreams, dreamLikes, meets, circleMembers } = schema;
type DreamRow = typeof dreams.$inferSelect;

async function hydrate(s: Services, rows: DreamRow[]): Promise<DreamWire[]> {
  if (!rows.length) return [];
  const likes = await s.db.select().from(dreamLikes).where(inArray(dreamLikes.dreamId, rows.map((r) => r.id)));
  return rows.map((r) => ({
    id: r.id,
    circleId: r.circleId,
    authorId: r.authorId,
    envelope: r.envelope as DreamWire['envelope'],
    meetId: r.meetId,
    doneAt: r.doneAt?.toISOString() ?? null,
    doneBy: r.doneBy,
    likes: likes.filter((l) => l.dreamId === r.id).map((l) => l.userId),
    createdAt: r.createdAt.toISOString(),
  }));
}

async function load(s: Services, id: string, userId: string): Promise<DreamRow> {
  const [d] = await s.db.select().from(dreams).where(eq(dreams.id, id));
  if (!d) throw notFound('Mimpi tidak ditemukan.');
  await requireMember(s, d.circleId, userId).catch(() => {
    throw notFound('Mimpi tidak ditemukan.');
  });
  return d;
}

export function dreamRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.get('/circles/:id/dreams', async (c) => {
    await requireMember(s, c.req.param('id'), c.get('user').id);
    const rows = await s.db.select().from(dreams).where(eq(dreams.circleId, c.req.param('id'))).orderBy(asc(dreams.createdAt));
    return c.json(await hydrate(s, rows));
  });

  r.post('/circles/:id/dreams', async (c) => {
    const user = c.get('user');
    const circleId = c.req.param('id');
    await requireMember(s, circleId, user.id);
    const input = await body(c, dreamBody);
    const [dup] = await s.db.select().from(dreams).where(eq(dreams.id, input.id));
    if (dup) throw bad('duplicate', 'Mimpi ini sudah ada.');
    const count = (await s.db.select({ id: dreams.id }).from(dreams).where(eq(dreams.circleId, circleId))).length;
    if (count >= 500) throw bad('too_many', 'Daftar mimpi lingkaran ini sudah 500. Wujudkan beberapa dulu, ya.');
    await s.db.insert(dreams).values({ id: input.id, circleId, authorId: user.id, envelope: input.envelope });
    await s.db.insert(dreamLikes).values({ dreamId: input.id, userId: user.id });
    const others = (await s.db.select().from(circleMembers).where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.state, 'active'))))
      .map((m) => m.userId)
      .filter((x) => x !== user.id);
    await pushTo(s, others, { body: `${user.penName ?? 'Seseorang'} menambahkan satu mimpi ke daftar kalian.`, data: { type: 'dream', circleId } }, 'notifyPartnerSealed');
    const [d] = await s.db.select().from(dreams).where(eq(dreams.id, input.id));
    return c.json((await hydrate(s, [d!]))[0], 201);
  });

  r.patch('/dreams/:id', async (c) => {
    const user = c.get('user');
    const d = await load(s, c.req.param('id'), user.id);
    const input = await body(c, dreamUpdateBody);
    const set: Partial<DreamRow> = {};
    if (input.envelope) set.envelope = input.envelope;
    if (input.done !== undefined) {
      set.doneAt = input.done ? s.now() : null;
      set.doneBy = input.done ? user.id : null;
    }
    if (input.meetId !== undefined) {
      if (input.meetId) {
        const [m] = await s.db.select().from(meets).where(eq(meets.id, input.meetId));
        if (!m || m.circleId !== d.circleId) throw bad('meet', 'Janji itu bukan dari lingkaran ini.');
      }
      set.meetId = input.meetId;
    }
    if (Object.keys(set).length) await s.db.update(dreams).set(set).where(eq(dreams.id, d.id));
    const [n] = await s.db.select().from(dreams).where(eq(dreams.id, d.id));
    return c.json((await hydrate(s, [n!]))[0]);
  });

  r.delete('/dreams/:id', async (c) => {
    const user = c.get('user');
    const d = await load(s, c.req.param('id'), user.id);
    if (d.authorId !== user.id) throw forbidden('Hanya penulis mimpi yang bisa menghapusnya.');
    await s.db.delete(dreams).where(eq(dreams.id, d.id));
    return c.json({ ok: true });
  });

  r.post('/dreams/:id/like', async (c) => {
    const user = c.get('user');
    const d = await load(s, c.req.param('id'), user.id);
    await s.db.insert(dreamLikes).values({ dreamId: d.id, userId: user.id }).onConflictDoNothing();
    return c.json((await hydrate(s, [d]))[0]);
  });

  r.delete('/dreams/:id/like', async (c) => {
    const user = c.get('user');
    const d = await load(s, c.req.param('id'), user.id);
    await s.db.delete(dreamLikes).where(and(eq(dreamLikes.dreamId, d.id), eq(dreamLikes.userId, user.id)));
    return c.json((await hydrate(s, [d]))[0]);
  });

  return r;
}
