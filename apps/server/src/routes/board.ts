/**
 * Papan Inspirasi: moodboard sebuah lingkaran (foto, tautan, catatan, incaran).
 * Isinya terenkripsi dengan kunci lingkaran; server hanya tahu siapa
 * menempelkannya dan kapan ditandai "sudah".
 */
import { type BoardItemWire, boardItemBody, boardItemUpdateBody } from '@sehari/core';
import { and, desc, eq } from 'drizzle-orm';
import { Hono } from 'hono';
import { type AppEnv, body, type Services } from '../context';
import { schema } from '../db';
import { pushTo, requireMember } from '../lib/domain';
import { bad, forbidden, notFound } from '../lib/errors';

const { boardItems, circleMembers, media } = schema;
type Row = typeof boardItems.$inferSelect;

const wire = (r: Row): BoardItemWire => ({
  id: r.id,
  circleId: r.circleId,
  authorId: r.authorId,
  envelope: r.envelope as BoardItemWire['envelope'],
  mediaIds: r.mediaIds,
  doneAt: r.doneAt?.toISOString() ?? null,
  createdAt: r.createdAt.toISOString(),
});

async function load(s: Services, id: string, userId: string): Promise<Row> {
  const [r] = await s.db.select().from(boardItems).where(eq(boardItems.id, id));
  if (!r) throw notFound('Tempelan tidak ditemukan.');
  await requireMember(s, r.circleId, userId).catch(() => {
    throw notFound('Tempelan tidak ditemukan.');
  });
  return r;
}

export function boardRoutes(s: Services) {
  const r = new Hono<AppEnv>();

  r.get('/circles/:id/board', async (c) => {
    await requireMember(s, c.req.param('id'), c.get('user').id);
    const rows = await s.db.select().from(boardItems).where(eq(boardItems.circleId, c.req.param('id'))).orderBy(desc(boardItems.createdAt));
    return c.json(rows.map(wire));
  });

  r.post('/circles/:id/board', async (c) => {
    const user = c.get('user');
    const circleId = c.req.param('id');
    await requireMember(s, circleId, user.id);
    const input = await body(c, boardItemBody);
    const [dup] = await s.db.select({ id: boardItems.id }).from(boardItems).where(eq(boardItems.id, input.id));
    if (dup) throw bad('duplicate', 'Tempelan ini sudah ada.');
    for (const m of input.mediaIds) {
      const [row] = await s.db.select({ ownerId: media.ownerId }).from(media).where(eq(media.id, m));
      if (row?.ownerId !== user.id) throw bad('media', 'Foto itu bukan milikmu.');
    }
    const count = (await s.db.select({ id: boardItems.id }).from(boardItems).where(eq(boardItems.circleId, circleId))).length;
    if (count >= 300) throw bad('too_many', 'Papan ini sudah penuh (300 tempelan). Lepas beberapa dulu, ya.');
    await s.db.insert(boardItems).values({ id: input.id, circleId, authorId: user.id, envelope: input.envelope, mediaIds: input.mediaIds });
    const others = (await s.db.select().from(circleMembers).where(and(eq(circleMembers.circleId, circleId), eq(circleMembers.state, 'active'))))
      .map((m) => m.userId)
      .filter((x) => x !== user.id);
    await pushTo(s, others, { body: `${user.penName ?? 'Seseorang'} menempel sesuatu di papan inspirasi kalian.`, data: { type: 'board', circleId } }, 'notifyPartnerSealed');
    const [n] = await s.db.select().from(boardItems).where(eq(boardItems.id, input.id));
    return c.json(wire(n!), 201);
  });

  r.patch('/board/:id', async (c) => {
    const user = c.get('user');
    const it = await load(s, c.req.param('id'), user.id);
    const input = await body(c, boardItemUpdateBody);
    const set: Partial<Row> = {};
    if (input.envelope) {
      if (it.authorId !== user.id) throw forbidden('Hanya yang menempel yang bisa mengubahnya.');
      set.envelope = input.envelope;
    }
    if (input.done !== undefined) set.doneAt = input.done ? s.now() : null;
    if (Object.keys(set).length) await s.db.update(boardItems).set(set).where(eq(boardItems.id, it.id));
    const [n] = await s.db.select().from(boardItems).where(eq(boardItems.id, it.id));
    return c.json(wire(n!));
  });

  r.delete('/board/:id', async (c) => {
    const user = c.get('user');
    const it = await load(s, c.req.param('id'), user.id);
    if (it.authorId !== user.id) throw forbidden('Hanya yang menempel yang bisa melepasnya.');
    await s.db.delete(boardItems).where(eq(boardItems.id, it.id));
    return c.json({ ok: true });
  });

  return r;
}
